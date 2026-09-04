/* =========================================================
 *  유틸리티 : 수학 / 사운드(WebAudio 합성) / 파티클
 * ========================================================= */
'use strict';

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);
const randInt = (a, b) => Math.floor(rand(a, b + 1));
const approach = (v, target, step) => (v < target ? Math.min(v + step, target) : Math.max(v - step, target));

/* ---------------------------------------------------------
 *  색 보정 : 기본색에서 음영/하이라이트 색을 만들어 쓴다
 * --------------------------------------------------------- */
const _shadeCache = new Map();
function shade(hex, amt) {
  const key = hex + '|' + amt;
  const hit = _shadeCache.get(key);
  if (hit) return hit;
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  if (amt >= 0) { r += (255 - r) * amt; g += (255 - g) * amt; b += (255 - b) * amt; }
  else { r *= 1 + amt; g *= 1 + amt; b *= 1 + amt; }
  const out = '#' + [r, g, b]
    .map(v => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('');
  _shadeCache.set(key, out);
  return out;
}

function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

/* ---------------------------------------------------------
 *  Sfx : 오디오 파일 없이 WebAudio 로 타격음/기공파음을 합성
 * --------------------------------------------------------- */
const Sfx = {
  ctx: null,
  muted: false,
  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(this.ctx.destination);
  },
  resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); },
  setMuted(m) { this.muted = m; if (this.master) this.master.gain.value = m ? 0 : 0.5; },
  _env(node, t0, attack, decay, peak) {
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + attack + decay);
    node.connect(g); g.connect(this.master);
    return g;
  },
  _noise(dur) {
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    return src;
  },
  play(name) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    switch (name) {
      case 'light': {
        const o = this.ctx.createOscillator();
        o.type = 'square'; o.frequency.setValueAtTime(320, t);
        o.frequency.exponentialRampToValueAtTime(90, t + 0.09);
        this._env(o, t, 0.004, 0.09, 0.28); o.start(t); o.stop(t + 0.14);
        const n = this._noise(0.07); const f = this.ctx.createBiquadFilter();
        f.type = 'bandpass'; f.frequency.value = 1800; n.connect(f);
        this._env(f, t, 0.003, 0.07, 0.2); n.start(t);
        break;
      }
      case 'heavy': {
        const o = this.ctx.createOscillator();
        o.type = 'sawtooth'; o.frequency.setValueAtTime(180, t);
        o.frequency.exponentialRampToValueAtTime(48, t + 0.18);
        this._env(o, t, 0.005, 0.2, 0.4); o.start(t); o.stop(t + 0.26);
        const n = this._noise(0.14); const f = this.ctx.createBiquadFilter();
        f.type = 'lowpass'; f.frequency.value = 1200; n.connect(f);
        this._env(f, t, 0.004, 0.14, 0.32); n.start(t);
        break;
      }
      case 'block': {
        const n = this._noise(0.09); const f = this.ctx.createBiquadFilter();
        f.type = 'highpass'; f.frequency.value = 2400; n.connect(f);
        this._env(f, t, 0.003, 0.09, 0.22); n.start(t);
        break;
      }
      case 'blast': {
        const o = this.ctx.createOscillator();
        o.type = 'triangle'; o.frequency.setValueAtTime(880, t);
        o.frequency.exponentialRampToValueAtTime(180, t + 0.3);
        this._env(o, t, 0.01, 0.3, 0.26); o.start(t); o.stop(t + 0.36);
        break;
      }
      case 'beam': {
        const o = this.ctx.createOscillator();
        o.type = 'sawtooth'; o.frequency.setValueAtTime(120, t);
        o.frequency.linearRampToValueAtTime(420, t + 0.5);
        this._env(o, t, 0.06, 0.6, 0.3); o.start(t); o.stop(t + 0.72);
        const n = this._noise(0.6); const f = this.ctx.createBiquadFilter();
        f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 0.7; n.connect(f);
        this._env(f, t, 0.05, 0.6, 0.22); n.start(t);
        break;
      }
      case 'ultimate': {
        const o = this.ctx.createOscillator();
        o.type = 'square'; o.frequency.setValueAtTime(70, t);
        o.frequency.exponentialRampToValueAtTime(660, t + 0.9);
        this._env(o, t, 0.1, 1.0, 0.34); o.start(t); o.stop(t + 1.2);
        const n = this._noise(1.1); const f = this.ctx.createBiquadFilter();
        f.type = 'lowpass'; f.frequency.value = 2600; n.connect(f);
        this._env(f, t, 0.12, 1.0, 0.3); n.start(t);
        break;
      }
      case 'charge': {
        const o = this.ctx.createOscillator();
        o.type = 'sine'; o.frequency.setValueAtTime(200, t);
        o.frequency.linearRampToValueAtTime(520, t + 0.35);
        this._env(o, t, 0.05, 0.35, 0.14); o.start(t); o.stop(t + 0.45);
        break;
      }
      case 'ko': {
        const o = this.ctx.createOscillator();
        o.type = 'sawtooth'; o.frequency.setValueAtTime(300, t);
        o.frequency.exponentialRampToValueAtTime(40, t + 0.9);
        this._env(o, t, 0.02, 0.95, 0.42); o.start(t); o.stop(t + 1.1);
        break;
      }
      case 'ui': {
        const o = this.ctx.createOscillator();
        o.type = 'square'; o.frequency.setValueAtTime(660, t);
        o.frequency.setValueAtTime(880, t + 0.05);
        this._env(o, t, 0.005, 0.1, 0.16); o.start(t); o.stop(t + 0.14);
        break;
      }
      case 'bell': {
        [660, 990, 1320].forEach((fr, i) => {
          const o = this.ctx.createOscillator();
          o.type = 'sine'; o.frequency.value = fr;
          this._env(o, t + i * 0.06, 0.01, 0.5, 0.2); o.start(t + i * 0.06); o.stop(t + i * 0.06 + 0.6);
        });
        break;
      }
    }
  }
};

/* ---------------------------------------------------------
 *  파티클 시스템
 * --------------------------------------------------------- */
class Particles {
  constructor() { this.list = []; }
  clear() { this.list.length = 0; }
  spawn(o) {
    this.list.push(Object.assign({
      x: 0, y: 0, vx: 0, vy: 0, life: 30, age: 0, size: 6,
      color: '#fff', gravity: 0, shape: 'circle', spin: 0, angle: 0, fade: true
    }, o));
  }
  burst(x, y, n, opts) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2), sp = rand(opts.minSpeed || 1, opts.maxSpeed || 6);
      this.spawn(Object.assign({}, opts, {
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: randInt(opts.minLife || 16, opts.maxLife || 34),
        size: rand(opts.minSize || 3, opts.maxSize || 9)
      }));
    }
  }
  update() {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      p.x += p.vx; p.y += p.vy; p.vy += p.gravity;
      p.vx *= 0.97; p.vy *= 0.97; p.angle += p.spin; p.age++;
      if (p.age >= p.life) this.list.splice(i, 1);
    }
  }
  draw(ctx) {
    for (const p of this.list) {
      const t = p.age / p.life;
      ctx.save();
      ctx.globalAlpha = p.fade ? clamp(1 - t, 0, 1) : 1;
      ctx.fillStyle = p.color;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      const s = p.size * (p.shape === 'spark' ? 1 - t * 0.6 : 1);
      if (p.shape === 'spark') {
        ctx.fillRect(-s * 2, -s * 0.28, s * 4, s * 0.56);
      } else if (p.shape === 'ring') {
        ctx.globalAlpha *= 0.8;
        ctx.strokeStyle = p.color; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(0, 0, s * (1 + t * 3), 0, Math.PI * 2); ctx.stroke();
      } else if (p.shape === 'shard') {
        ctx.beginPath(); ctx.moveTo(0, -s); ctx.lineTo(s * 0.6, 0); ctx.lineTo(0, s); ctx.lineTo(-s * 0.6, 0);
        ctx.closePath(); ctx.fill();
      } else {
        ctx.beginPath(); ctx.arc(0, 0, s, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }
  }
}
