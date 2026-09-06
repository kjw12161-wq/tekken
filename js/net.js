/* =========================================================
 *  온라인 1v1 (WebRTC P2P + 지연 롤백 없는 락스텝)
 *
 *  붙는 방법은 두 가지다.
 *   A) 방 번호  — 시그널링 서버(server/signal.js)가 두 사람을 짝지어 준다.
 *                 방장이 받은 네 글자 방 번호만 알려주면 끝.
 *   B) 코드 교환 — 서버가 없을 때. 초대 코드/응답 코드를 직접 주고받는다.
 *
 *  어느 쪽이든 실제 게임 데이터는 서버를 거치지 않는다.
 *  협상이 끝나면 두 브라우저가 P2P 로 직접 주고받는다.
 *
 *  연결 뒤에는 프레임마다 12비트 입력 마스크만 주고받고,
 *  두 대가 똑같은 시뮬레이션을 돌린다(락스텝).
 *  내 입력은 NET_DELAY 프레임 뒤에 적용되도록 미리 보내고,
 *  상대 입력이 아직 안 왔으면 그 프레임을 진행하지 않고 기다린다.
 * ========================================================= */
'use strict';

/** 입력 마스크 비트 순서 (12개) */
const NET_ACTIONS = ['left', 'right', 'up', 'down', 'light', 'heavy',
  'kick', 'blast', 'ultimate', 'guard', 'charge', 'transform'];
const NET_BIT = {};
NET_ACTIONS.forEach((a, i) => { NET_BIT[a] = 1 << i; });

/** 입력을 몇 프레임 뒤에 적용할지 (클수록 안정적, 작을수록 반응이 빠르다) */
const NET_DELAY = 3;
/** 한 패킷에 겹쳐 싣는 과거 프레임 수 (패킷을 잃어도 뒤 패킷이 메운다) */
const NET_REDUNDANCY = 12;
const NET_RING = 4096;
const NET_MASK = NET_RING - 1;

const STUN_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:global.stun.twilio.com:3478' }
];

/** 프레임 단위 입력 보관함 (같은 자리를 돌려 쓰되 프레임 번호로 유효성을 판단) */
class InputTrack {
  constructor() {
    this.frames = new Int32Array(NET_RING).fill(-1);
    this.masks = new Uint16Array(NET_RING);
    this.newest = -1;
  }
  set(frame, mask) {
    if (frame < 0) return;
    const i = frame & NET_MASK;
    if (this.frames[i] === frame) return;      // 이미 확정된 프레임은 덮어쓰지 않는다
    this.frames[i] = frame;
    this.masks[i] = mask;
    if (frame > this.newest) this.newest = frame;
  }
  has(frame) { return frame >= 0 && this.frames[frame & NET_MASK] === frame; }
  get(frame) { return this.masks[frame & NET_MASK]; }
  clear() { this.frames.fill(-1); this.masks.fill(0); this.newest = -1; }
}

const Net = {
  active: false,          // 온라인 대전 중인가
  role: null,             // 'host' | 'guest'
  phase: 'idle',          // idle | offering | answering | waiting | connected | closed
  localIndex: 0,          // 내가 조작하는 파이터 (host=0, guest=1)
  remoteIndex: 1,
  pc: null, ctl: null, ch: null,
  ws: null,               // 시그널링 소켓 (연결이 맺어지면 닫는다)
  room: '',               // 방 번호 (방 번호로 붙었을 때)
  tracks: [new InputTrack(), new InputTrack()],
  ctrls: [null, null],
  frame: 0,               // 다음에 진행할 시뮬레이션 프레임
  stalled: 0,             // 상대 입력을 기다린 연속 프레임 수
  ping: 0,
  epoch: 0,               // 매치 세대 번호 (지난 매치의 입력 패킷이 섞여 드는 걸 막는다)
  desync: false,
  lastError: '',
  onEvent: null,          // (type, payload) => void  : 게임 쪽 콜백
  _sums: new Map(),       // 내가 계산한 프레임별 체크섬
  _pingId: 0, _pingAt: 0,
  _remotePick: null,
  _rematchLocal: false, _rematchRemote: false,

  /* ---------------- 연결 ---------------- */

  supported() {
    return typeof RTCPeerConnection === 'function' &&
      typeof window.CompressionStream === 'function';
  },

  reset() {
    try { if (this.ch) this.ch.close(); } catch (e) { /* 이미 닫힘 */ }
    try { if (this.ctl) this.ctl.close(); } catch (e) { /* 이미 닫힘 */ }
    try { if (this.pc) this.pc.close(); } catch (e) { /* 이미 닫힘 */ }
    this._closeSignal();
    this.pc = this.ctl = this.ch = null;
    this.room = '';
    this._pendingIce = [];
    this.active = false; this.role = null; this.phase = 'idle';
    this.localIndex = 0; this.remoteIndex = 1;
    this.tracks[0].clear(); this.tracks[1].clear();
    this.frame = 0; this.stalled = 0; this.ping = 0; this.desync = false;
    this.epoch = 0;
    this.lastError = '';
    this._sums.clear();
    this._remotePick = null;
    this._rematchLocal = this._rematchRemote = false;
  },

  _newPeer(trickle) {
    const pc = new RTCPeerConnection({ iceServers: STUN_SERVERS });
    pc.onconnectionstatechange = () => {
      const st = pc.connectionState;
      if (st === 'failed' || st === 'disconnected' || st === 'closed') this._drop(st);
    };
    if (trickle) {
      // 방 번호 방식 : 후보를 찾는 대로 서버를 통해 흘려보낸다 (연결이 훨씬 빠르다)
      pc.onicecandidate = e => {
        if (e.candidate) this._sig({ ice: e.candidate.toJSON ? e.candidate.toJSON() : e.candidate });
      };
    }
    this._pendingIce = [];
    this.pc = pc;
    return pc;
  },

  /* ---------------- 방 번호 방식 ---------------- */

  /** 시그널링 서버 주소를 정한다 (저장값 → ?signal= → 같은 출처 순) */
  signalUrl() {
    try {
      const saved = localStorage.getItem('dfz.signal');
      if (saved) return saved;
    } catch (e) { /* 저장소가 막혀 있으면 무시 */ }
    const q = (location.search.match(/[?&]signal=([^&]+)/) || [])[1];
    if (q) return decodeURIComponent(q);
    if (location.protocol === 'http:' || location.protocol === 'https:') {
      const scheme = location.protocol === 'https:' ? 'wss:' : 'ws:';
      return `${scheme}//${location.host}/ws`;
    }
    return '';                       // file:// 이나 샌드박스에서는 자동 추정이 불가능하다
  },

  /** 시그널링 서버가 살아 있는지 짧게 확인한다 (로비를 열 때) */
  probeSignal(url, ms) {
    return new Promise(resolve => {
      const target = url || this.signalUrl();
      if (!target || typeof WebSocket !== 'function') { resolve(false); return; }
      let ws, done = false;
      const finish = ok => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        try { if (ws) { ws.onopen = ws.onerror = ws.onclose = null; ws.close(); } } catch (e) { /* 무시 */ }
        resolve(ok);
      };
      const timer = setTimeout(() => finish(false), ms || 2500);
      try { ws = new WebSocket(target); } catch (e) { finish(false); return; }
      ws.onopen = () => finish(true);
      ws.onerror = () => finish(false);
      ws.onclose = () => finish(false);
    });
  },

  setSignalUrl(url) {
    try {
      if (url) localStorage.setItem('dfz.signal', url);
      else localStorage.removeItem('dfz.signal');
    } catch (e) { /* 무시 */ }
  },

  _closeSignal() {
    if (this.ws) {
      try { this.ws.onclose = null; this.ws.close(); } catch (e) { /* 무시 */ }
      this.ws = null;
    }
  },

  /** 시그널링 서버에 붙는다 */
  _openSignal(url) {
    return new Promise((resolve, reject) => {
      const target = url || this.signalUrl();
      if (!target) { reject(new Error('시그널링 서버 주소를 알 수 없습니다')); return; }
      let ws;
      try { ws = new WebSocket(target); } catch (e) { reject(new Error('서버 주소가 올바르지 않습니다')); return; }
      const timer = setTimeout(() => {
        try { ws.close(); } catch (e) { /* 무시 */ }
        reject(new Error('시그널링 서버에 연결하지 못했습니다'));
      }, 8000);
      ws.onopen = () => {
        clearTimeout(timer);
        this.ws = ws;
        ws.onmessage = e => this._onSignal(e.data);
        ws.onclose = () => {
          this.ws = null;
          // 아직 P2P 가 안 붙었는데 서버와 끊기면 알린다
          if (this.phase !== 'connected') {
            this.lastError = '시그널링 서버와의 연결이 끊겼습니다';
            this._emit('failed');
          }
        };
        resolve(ws);
      };
      ws.onerror = () => {
        clearTimeout(timer);
        if (!this.ws) reject(new Error('시그널링 서버에 연결하지 못했습니다'));
      };
    });
  },

  _wsSend(obj) {
    if (this.ws && this.ws.readyState === 1) this.ws.send(JSON.stringify(obj));
  },
  _sig(d) { this._wsSend({ t: 'sig', d }); },

  /** 방장 : 방을 만들고 상대가 들어오기를 기다린다 */
  async hostRoom(url) {
    this.reset();
    this.role = 'host'; this.phase = 'offering';
    this.localIndex = 0; this.remoteIndex = 1;
    await this._openSignal(url);
    this._wsSend({ t: 'create' });
  },

  /** 참가자 : 방 번호로 들어간다 */
  async joinRoom(code, url) {
    this.reset();
    this.role = 'guest'; this.phase = 'answering';
    this.localIndex = 1; this.remoteIndex = 0;
    await this._openSignal(url);
    this._wsSend({ t: 'join', room: String(code || '').trim().toUpperCase() });
  },

  async _onSignal(text) {
    let msg;
    try { msg = JSON.parse(text); } catch (e) { return; }
    switch (msg.t) {
      case 'created':
        this.room = msg.room;
        this._emit('room', msg.room);
        return;
      case 'joined':
        this.room = msg.room;
        // 방장의 offer 를 받을 준비를 미리 해 둔다
        this._prepareGuestPeer();
        this._emit('joined', msg.room);
        return;
      case 'peer':                                  // 상대가 들어왔다 → 방장이 offer 를 만든다
        this._emit('peerJoined');
        await this._hostOffer();
        return;
      case 'sig':
        await this._onNegotiation(msg.d);
        return;
      case 'peerLeft':
        if (this.phase !== 'connected') {
          this.lastError = '상대가 방을 나갔습니다';
          this._emit('failed');
        }
        return;
      case 'expired':
        this.lastError = '방이 만료됐습니다. 다시 만들어 주세요';
        this._emit('failed');
        return;
      case 'error':
        this.lastError = {
          notFound: '그런 방이 없습니다. 번호를 확인해 주세요',
          full: '이미 두 명이 들어가 있는 방입니다',
          busy: '서버가 붐빕니다. 잠시 뒤 다시 시도해 주세요'
        }[msg.code] || '방에 들어가지 못했습니다';
        this._emit('roomError', this.lastError);
        return;
    }
  },

  _prepareGuestPeer() {
    const pc = this._newPeer(true);
    const chans = {};
    pc.ondatachannel = e => {
      chans[e.channel.label] = e.channel;
      if (chans.ctl && chans.in) this._bindChannels(chans.ctl, chans.in);
    };
  },

  async _hostOffer() {
    const pc = this._newPeer(true);
    const ctl = pc.createDataChannel('ctl', { ordered: true });
    const ch = pc.createDataChannel('in', { ordered: false, maxRetransmits: 0 });
    this._bindChannels(ctl, ch);
    await pc.setLocalDescription(await pc.createOffer());
    this._sig({ sdp: pc.localDescription.sdp, type: 'offer' });
  },

  async _onNegotiation(d) {
    if (!d || !this.pc) return;
    const pc = this.pc;
    if (d.sdp) {
      await pc.setRemoteDescription({ type: d.type, sdp: d.sdp });
      // 미리 도착해 쌓아둔 후보를 이제 넣는다
      for (const c of this._pendingIce) {
        try { await pc.addIceCandidate(c); } catch (e) { /* 쓸모없는 후보는 무시 */ }
      }
      this._pendingIce = [];
      if (d.type === 'offer') {
        await pc.setLocalDescription(await pc.createAnswer());
        this._sig({ sdp: pc.localDescription.sdp, type: 'answer' });
      }
    } else if (d.ice) {
      if (!pc.remoteDescription) { this._pendingIce.push(d.ice); return; }
      try { await pc.addIceCandidate(d.ice); } catch (e) { /* 무시 */ }
    }
  },

  _bindChannels(ctl, ch) {
    this.ctl = ctl; this.ch = ch;
    ctl.onmessage = e => this._onControl(e.data);
    ch.onmessage = e => this._onData(e.data);
    ch.binaryType = 'arraybuffer';
    const opened = () => {
      if (ctl.readyState === 'open' && ch.readyState === 'open' && this.phase !== 'connected') {
        this.phase = 'connected';
        this._wsSend({ t: 'bye' });
        this._closeSignal();          // 붙고 나면 서버는 더 필요 없다
        this._emit('connected');
      }
    };
    ctl.onopen = opened; ch.onopen = opened;
    ctl.onclose = () => this._drop('closed');
  },

  /** 호스트: 초대 코드를 만든다 */
  async createOffer() {
    this.reset();
    this.role = 'host'; this.phase = 'offering';
    this.localIndex = 0; this.remoteIndex = 1;
    const pc = this._newPeer(false);
    const ctl = pc.createDataChannel('ctl', { ordered: true });
    const ch = pc.createDataChannel('in', { ordered: false, maxRetransmits: 0 });
    this._bindChannels(ctl, ch);
    await pc.setLocalDescription(await pc.createOffer());
    await this._iceDone(pc);
    return this._encode({ v: 1, t: 'offer', sdp: pc.localDescription.sdp });
  },

  /** 게스트: 초대 코드를 받아 응답 코드를 만든다 */
  async acceptOffer(code) {
    this.reset();
    this.role = 'guest'; this.phase = 'answering';
    this.localIndex = 1; this.remoteIndex = 0;
    const msg = await this._decode(code);
    if (!msg || msg.t !== 'offer') throw new Error('초대 코드가 아닙니다');
    const pc = this._newPeer(false);
    const chans = {};
    pc.ondatachannel = e => {
      chans[e.channel.label] = e.channel;
      if (chans.ctl && chans.in) this._bindChannels(chans.ctl, chans.in);
    };
    await pc.setRemoteDescription({ type: 'offer', sdp: msg.sdp });
    await pc.setLocalDescription(await pc.createAnswer());
    await this._iceDone(pc);
    this.phase = 'waiting';
    return this._encode({ v: 1, t: 'answer', sdp: pc.localDescription.sdp });
  },

  /** 호스트: 응답 코드를 넣어 연결을 마무리한다 */
  async acceptAnswer(code) {
    const msg = await this._decode(code);
    if (!msg || msg.t !== 'answer') throw new Error('응답 코드가 아닙니다');
    if (!this.pc) throw new Error('먼저 초대 코드를 만드세요');
    await this.pc.setRemoteDescription({ type: 'answer', sdp: msg.sdp });
    this.phase = 'waiting';
  },

  /** ICE 후보 수집이 끝날 때까지 기다린다 (한 번에 다 담아 코드로 넘기기 위해) */
  _iceDone(pc) {
    if (pc.iceGatheringState === 'complete') return Promise.resolve();
    return new Promise(resolve => {
      const done = () => { clearTimeout(timer); pc.removeEventListener('icegatheringstatechange', check); resolve(); };
      const check = () => { if (pc.iceGatheringState === 'complete') done(); };
      pc.addEventListener('icegatheringstatechange', check);
      // 후보가 계속 안 나와도 4초 뒤에는 있는 것만으로 진행한다
      const timer = setTimeout(done, 4000);
    });
  },

  _drop(why) {
    if (!this.pc) return;
    const wasLive = this.phase === 'connected';
    this.phase = 'closed';
    this.lastError = why === 'failed' ? '연결에 실패했습니다' : '상대와의 연결이 끊겼습니다';
    this._emit(wasLive ? 'disconnected' : 'failed');
  },

  _emit(type, payload) { if (this.onEvent) this.onEvent(type, payload); },

  /* ---------------- 코드 인코딩 ----------------
   * SDP 를 deflate 로 압축하고 base64url 로 바꿔 붙여넣기 쉬운 문자열로 만든다.
   */
  async _encode(obj) {
    const raw = new TextEncoder().encode(JSON.stringify(obj));
    const cs = new CompressionStream('deflate-raw');
    const buf = await new Response(new Blob([raw]).stream().pipeThrough(cs)).arrayBuffer();
    let bin = '';
    for (const b of new Uint8Array(buf)) bin += String.fromCharCode(b);
    return 'DFZ1' + btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  },

  async _decode(code) {
    const trimmed = String(code || '').trim().replace(/\s+/g, '');
    if (!trimmed.startsWith('DFZ1')) throw new Error('코드 형식이 올바르지 않습니다');
    const b64 = trimmed.slice(4).replace(/-/g, '+').replace(/_/g, '/');
    const bin = atob(b64 + '==='.slice((b64.length + 3) % 4));
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    try {
      const ds = new DecompressionStream('deflate-raw');
      const buf = await new Response(new Blob([bytes]).stream().pipeThrough(ds)).arrayBuffer();
      return JSON.parse(new TextDecoder().decode(buf));
    } catch (e) {
      throw new Error('코드가 깨졌습니다 (일부만 복사되지 않았는지 확인해 주세요)');
    }
  },

  /* ---------------- 대전 시작/종료 ---------------- */

  /**
   * 캐릭터 선택이 끝나 실제 대전에 들어간다.
   * epoch 를 올려, 앞선 매치에서 뒤늦게 도착한 입력 패킷을 걸러낸다.
   */
  begin(ctrls, epoch) {
    this.ctrls = ctrls;
    this.epoch = (epoch | 0) & 255;
    this.active = true;
    this.frame = 0; this.stalled = 0; this.desync = false;
    this.tracks[0].clear(); this.tracks[1].clear();
    this._sums.clear();
    // 첫 NET_DELAY 프레임은 양쪽 다 '입력 없음'으로 채워 두고 시작한다
    for (let f = 0; f < NET_DELAY; f++) {
      this.tracks[0].set(f, 0);
      this.tracks[1].set(f, 0);
    }
  },

  stop() { this.active = false; },

  connected() { return this.phase === 'connected'; },

  /* ---------------- 프레임 진행 ---------------- */

  /**
   * 이번 프레임의 내 입력을 확정하고 상대에게 보낸다.
   * 이미 확정된 프레임이어도 패킷은 매번 다시 보낸다 —
   * 서로 상대를 기다리느라 둘 다 멈추면 새 프레임이 안 생기는데,
   * 그때 재전송이 멈추면 잃어버린 패킷을 영영 못 메워 교착에 빠진다.
   */
  captureLocal(frame, mask) {
    const t = this.tracks[this.localIndex];
    if (!t.has(frame)) t.set(frame, mask);
    this._sendInputs(Math.max(frame, t.newest));
  },

  hasBoth(frame) {
    return this.tracks[0].has(frame) && this.tracks[1].has(frame);
  },

  /** 두 컨트롤러에 이번 프레임의 입력 마스크를 넣는다 */
  applyFrame(frame) {
    for (let p = 0; p < 2; p++) {
      const c = this.ctrls[p];
      if (c && c.setMask) c.setMask(this.tracks[p].get(frame));
    }
  },

  _sendInputs(upTo) {
    if (!this.ch || this.ch.readyState !== 'open') return;
    const t = this.tracks[this.localIndex];
    const from = Math.max(0, upTo - NET_REDUNDANCY + 1);
    const n = upTo - from + 1;
    const buf = new ArrayBuffer(7 + n * 2);
    const dv = new DataView(buf);
    dv.setUint8(0, 1);
    dv.setUint8(1, n);
    dv.setUint8(2, this.epoch);
    dv.setInt32(3, from);
    for (let i = 0; i < n; i++) dv.setUint16(7 + i * 2, t.has(from + i) ? t.get(from + i) : 0);
    try { this.ch.send(buf); } catch (e) { /* 버퍼가 찼으면 다음 프레임에 다시 보낸다 */ }
  },

  _onData(data) {
    if (typeof data === 'string') { this._onControl(data); return; }
    const dv = new DataView(data);
    const type = dv.getUint8(0);
    if (type === 1) {
      if (dv.getUint8(2) !== this.epoch) return;      // 지난 매치의 패킷은 버린다
      const n = dv.getUint8(1);
      const from = dv.getInt32(3);
      const t = this.tracks[this.remoteIndex];
      for (let i = 0; i < n; i++) t.set(from + i, dv.getUint16(7 + i * 2));
    } else if (type === 2) {                     // 핑 → 그대로 되돌려 준다
      const out = new ArrayBuffer(9);
      const o = new DataView(out);
      o.setUint8(0, 3); o.setFloat64(1, dv.getFloat64(1));
      try { this.ch.send(out); } catch (e) { /* 무시 */ }
    } else if (type === 3) {
      this.ping = Math.round(performance.now() - dv.getFloat64(1));
    } else if (type === 4) {                     // 상태 체크섬
      const f = dv.getInt32(1), sum = dv.getUint32(5);
      const mine = this._sums.get(f);
      if (mine !== undefined && mine !== sum) this.desync = true;
      this._sums.delete(f);
    }
  },

  sendPing() {
    if (!this.ch || this.ch.readyState !== 'open') return;
    const buf = new ArrayBuffer(9);
    const dv = new DataView(buf);
    dv.setUint8(0, 2); dv.setFloat64(1, performance.now());
    try { this.ch.send(buf); } catch (e) { /* 무시 */ }
  },

  /** 게임 상태 체크섬을 남기고 상대에게도 보낸다 */
  sendChecksum(frame, sum) {
    this._sums.set(frame, sum >>> 0);
    if (this._sums.size > 240) {                  // 오래된 것부터 버린다
      const k = this._sums.keys().next().value;
      this._sums.delete(k);
    }
    if (!this.ch || this.ch.readyState !== 'open') return;
    const buf = new ArrayBuffer(9);
    const dv = new DataView(buf);
    dv.setUint8(0, 4); dv.setInt32(1, frame); dv.setUint32(5, sum >>> 0);
    try { this.ch.send(buf); } catch (e) { /* 무시 */ }
  },

  /* ---------------- 제어 메시지 (선택 · 재대결 · 종료) ---------------- */

  send(msg) {
    if (!this.ctl || this.ctl.readyState !== 'open') return;
    try { this.ctl.send(JSON.stringify(msg)); } catch (e) { /* 무시 */ }
  },

  _onControl(text) {
    let msg;
    try { msg = JSON.parse(text); } catch (e) { return; }
    if (msg.t === 'pick') { this._remotePick = msg.i; this._emit('pick', msg.i); }
    else if (msg.t === 'start') this._emit('start', msg);
    else if (msg.t === 'rematch') { this._rematchRemote = true; this._emit('rematch'); }
    else if (msg.t === 'toSelect') this._emit('toSelect');
    else if (msg.t === 'bye') { this.phase = 'closed'; this.lastError = '상대가 대전을 나갔습니다'; this._emit('disconnected'); }
  },

  remotePick() { return this._remotePick; },
  clearPicks() { this._remotePick = null; },
  markRematch(local) {
    if (local) this._rematchLocal = true;
    return this._rematchLocal && this._rematchRemote;
  },
  clearRematch() { this._rematchLocal = this._rematchRemote = false; },

  quit() {
    this.send({ t: 'bye' });
    // 메시지가 나갈 틈을 준 뒤 정리한다
    setTimeout(() => this.reset(), 60);
    this.active = false;
  }
};
