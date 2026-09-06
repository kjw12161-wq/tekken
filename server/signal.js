#!/usr/bin/env node
/* =========================================================
 *  DRAGON FIGHTER Z — 방 번호 시그널링 서버
 *
 *   node server/signal.js [--port 8080] [--host 0.0.0.0]
 *
 *  하는 일은 두 가지뿐이다.
 *   1) 게임 파일을 그대로 서빙한다 (그래서 이 서버 하나만 띄우면 된다)
 *   2) 방 번호로 두 사람을 짝지어 주고, WebRTC 협상 메시지만 중계한다
 *
 *  연결이 맺어진 뒤의 게임 데이터는 서버를 거치지 않는다.
 *  두 브라우저가 P2P 로 직접 주고받는다.
 *
 *  외부 의존성 0 : WebSocket(RFC 6455) 도 직접 구현했다.
 * ========================================================= */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const WS_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

/* 방 번호에 쓰는 글자 : 헷갈리는 0/O, 1/I/L 은 뺐다 */
const CODE_CHARS = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
const CODE_LEN = 4;
const ROOM_TTL = 10 * 60 * 1000;      // 아무도 안 들어오면 10분 뒤 방을 지운다
const MAX_MSG = 256 * 1024;           // 시그널링 메시지 상한
const MAX_ROOMS = 5000;

const argv = process.argv.slice(2);
const argOf = (name, def) => {
  const i = argv.indexOf('--' + name);
  return i !== -1 && argv[i + 1] ? argv[i + 1] : def;
};
const PORT = Number(argOf('port', process.env.PORT || 8080));
const HOST = argOf('host', process.env.HOST || '0.0.0.0');

/* =========================================================
 *  아주 작은 WebSocket 구현 (텍스트 프레임만 쓴다)
 * ========================================================= */
class WebSocketConn {
  constructor(socket) {
    this.socket = socket;
    this.buf = Buffer.alloc(0);
    this.frags = [];               // 이어지는 프레임 조각
    this.fragOp = 0;
    this.open = true;
    this.onmessage = null;
    this.onclose = null;
    socket.on('data', d => this._onData(d));
    socket.on('close', () => this._closed());
    socket.on('error', () => this._closed());
    socket.setTimeout(0);
    socket.setNoDelay(true);
  }

  _closed() {
    if (!this.open) return;
    this.open = false;
    if (this.onclose) this.onclose();
  }

  _onData(chunk) {
    this.buf = this.buf.length ? Buffer.concat([this.buf, chunk]) : chunk;
    // 한 번에 여러 프레임이 올 수도, 한 프레임이 쪼개져 올 수도 있다
    for (;;) {
      const frame = this._readFrame();
      if (!frame) break;
      this._handleFrame(frame);
      if (!this.open) break;
    }
  }

  /** 버퍼 앞쪽에서 프레임 하나를 떼어낸다. 아직 덜 왔으면 null */
  _readFrame() {
    const b = this.buf;
    if (b.length < 2) return null;
    const fin = (b[0] & 0x80) !== 0;
    const opcode = b[0] & 0x0f;
    const masked = (b[1] & 0x80) !== 0;
    let len = b[1] & 0x7f;
    let off = 2;
    if (len === 126) {
      if (b.length < off + 2) return null;
      len = b.readUInt16BE(off); off += 2;
    } else if (len === 127) {
      if (b.length < off + 8) return null;
      const big = b.readBigUInt64BE(off);
      if (big > BigInt(MAX_MSG)) { this.close(1009); return null; }
      len = Number(big); off += 8;
    }
    if (len > MAX_MSG) { this.close(1009); return null; }
    let mask = null;
    if (masked) {
      if (b.length < off + 4) return null;
      mask = b.slice(off, off + 4); off += 4;
    }
    if (b.length < off + len) return null;
    const payload = Buffer.from(b.slice(off, off + len));
    if (mask) for (let i = 0; i < payload.length; i++) payload[i] ^= mask[i & 3];
    this.buf = b.slice(off + len);
    return { fin, opcode, payload };
  }

  _handleFrame(f) {
    switch (f.opcode) {
      case 0x0:                                    // 이어지는 조각
      case 0x1:                                    // 텍스트
      case 0x2: {                                  // 바이너리(쓰지 않지만 규격상 처리)
        if (f.opcode !== 0x0) { this.frags = []; this.fragOp = f.opcode; }
        this.frags.push(f.payload);
        const total = this.frags.reduce((n, p) => n + p.length, 0);
        if (total > MAX_MSG) { this.close(1009); return; }
        if (!f.fin) return;
        const full = Buffer.concat(this.frags);
        this.frags = [];
        if (this.fragOp === 0x1 && this.onmessage) this.onmessage(full.toString('utf8'));
        return;
      }
      case 0x8:                                    // 닫기
        this.close(1000);
        return;
      case 0x9:                                    // 핑 → 퐁
        this._send(0xa, f.payload);
        return;
      case 0xa:                                    // 퐁
        return;
      default:
        this.close(1002);
    }
  }

  _send(opcode, payload) {
    if (!this.open) return;
    const len = payload.length;
    let header;
    if (len < 126) {
      header = Buffer.alloc(2);
      header[1] = len;
    } else if (len < 65536) {
      header = Buffer.alloc(4);
      header[1] = 126;
      header.writeUInt16BE(len, 2);
    } else {
      header = Buffer.alloc(10);
      header[1] = 127;
      header.writeBigUInt64BE(BigInt(len), 2);
    }
    header[0] = 0x80 | opcode;                     // FIN + opcode (서버는 마스킹하지 않는다)
    try { this.socket.write(Buffer.concat([header, payload])); } catch (e) { this._closed(); }
  }

  sendText(str) { this._send(0x1, Buffer.from(str, 'utf8')); }
  sendJSON(obj) { this.sendText(JSON.stringify(obj)); }
  ping() { this._send(0x9, Buffer.alloc(0)); }

  close(code) {
    if (!this.open) return;
    const p = Buffer.alloc(2);
    p.writeUInt16BE(code || 1000, 0);
    this._send(0x8, p);
    this.open = false;
    try { this.socket.end(); } catch (e) { /* 이미 닫힘 */ }
    if (this.onclose) this.onclose();
  }
}

/* =========================================================
 *  방 관리
 * ========================================================= */
const rooms = new Map();             // code -> { host, guest, createdAt }

function newCode() {
  for (let tries = 0; tries < 40; tries++) {
    let c = '';
    const r = crypto.randomBytes(CODE_LEN);
    for (let i = 0; i < CODE_LEN; i++) c += CODE_CHARS[r[i] % CODE_CHARS.length];
    if (!rooms.has(c)) return c;
  }
  return null;
}

function leaveRoom(conn) {
  const code = conn.room;
  if (!code) return;
  const room = rooms.get(code);
  conn.room = null;
  if (!room) return;
  const other = room.host === conn ? room.guest : room.host;
  if (room.host === conn) room.host = null;
  if (room.guest === conn) room.guest = null;
  if (other && other.open) {
    other.sendJSON({ t: 'peerLeft' });
    // 방장이 나가면 방 자체를 접는다
    if (!room.host) { other.room = null; rooms.delete(code); }
  }
  if (!room.host && !room.guest) rooms.delete(code);
}

function onMessage(conn, text) {
  let msg;
  try { msg = JSON.parse(text); } catch (e) { return; }
  if (!msg || typeof msg.t !== 'string') return;

  switch (msg.t) {
    case 'create': {
      leaveRoom(conn);
      if (rooms.size >= MAX_ROOMS) { conn.sendJSON({ t: 'error', code: 'busy' }); return; }
      const code = newCode();
      if (!code) { conn.sendJSON({ t: 'error', code: 'busy' }); return; }
      rooms.set(code, { host: conn, guest: null, createdAt: Date.now() });
      conn.room = code; conn.role = 'host';
      conn.sendJSON({ t: 'created', room: code });
      log(`방 생성 ${code} (전체 ${rooms.size})`);
      return;
    }
    case 'join': {
      leaveRoom(conn);
      const code = String(msg.room || '').trim().toUpperCase();
      const room = rooms.get(code);
      if (!room || !room.host) { conn.sendJSON({ t: 'error', code: 'notFound' }); return; }
      if (room.guest) { conn.sendJSON({ t: 'error', code: 'full' }); return; }
      room.guest = conn;
      conn.room = code; conn.role = 'guest';
      conn.sendJSON({ t: 'joined', room: code });
      room.host.sendJSON({ t: 'peer' });            // 방장에게 '상대가 들어왔다'
      log(`방 입장 ${code}`);
      return;
    }
    case 'sig': {                                   // WebRTC 협상 메시지 중계
      const room = rooms.get(conn.room);
      if (!room) return;
      const other = room.host === conn ? room.guest : room.host;
      if (other && other.open) other.sendJSON({ t: 'sig', d: msg.d });
      return;
    }
    case 'bye':
      leaveRoom(conn);
      return;
  }
}

/* =========================================================
 *  정적 파일 서빙 (게임을 같은 포트에서 연다)
 * ========================================================= */
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json',
  '.md': 'text/markdown; charset=utf-8', '.txt': 'text/plain; charset=utf-8'
};

function serveStatic(req, res) {
  let rel;
  try { rel = decodeURIComponent(new URL(req.url, 'http://x').pathname); }
  catch (e) { res.writeHead(400).end('bad request'); return; }
  if (rel === '/') rel = '/index.html';
  const file = path.join(ROOT, rel);
  // 저장소 밖으로 나가는 경로는 막는다
  if (!file.startsWith(ROOT + path.sep) && file !== ROOT) { res.writeHead(403).end('forbidden'); return; }
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404).end('not found'); return; }
    res.writeHead(200, {
      'content-type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'content-length': st.size,
      'cache-control': 'no-cache'
    });
    fs.createReadStream(file).pipe(res);
  });
}

/* =========================================================
 *  서버 기동
 * ========================================================= */
const started = Date.now();
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ ok: true, rooms: rooms.size, uptime: Math.round((Date.now() - started) / 1000) }));
    return;
  }
  serveStatic(req, res);
});

server.on('upgrade', (req, socket, head) => {
  const key = req.headers['sec-websocket-key'];
  if (req.url.split('?')[0] !== '/ws' || !key) { socket.destroy(); return; }
  const accept = crypto.createHash('sha1').update(key + WS_GUID).digest('base64');
  socket.write(
    'HTTP/1.1 101 Switching Protocols\r\n' +
    'Upgrade: websocket\r\n' +
    'Connection: Upgrade\r\n' +
    `Sec-WebSocket-Accept: ${accept}\r\n\r\n`);
  const conn = new WebSocketConn(socket);
  if (head && head.length) conn._onData(head);
  conn.room = null; conn.role = null;
  conn.onmessage = text => onMessage(conn, text);
  conn.onclose = () => leaveRoom(conn);
});

/* 오래된 빈 방 청소 + 연결 유지 핑 */
setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms) {
    if (!room.guest && now - room.createdAt > ROOM_TTL) {
      if (room.host && room.host.open) { room.host.sendJSON({ t: 'expired' }); room.host.room = null; }
      rooms.delete(code);
    }
  }
}, 30000);

server.listen(PORT, HOST, () => {
  log(`DRAGON FIGHTER Z 시그널링 서버`);
  log(`  게임      http://localhost:${PORT}/`);
  log(`  시그널링  ws://localhost:${PORT}/ws`);
  log(`  상태      http://localhost:${PORT}/health`);
});
