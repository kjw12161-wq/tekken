/* =========================================================
 *  SpriteBank : 캐릭터 프레임을 스프라이트 아틀라스로 굽고 관리한다.
 *
 *  - 포즈(poseFor)가 만들어내는 키마다 한 장의 셀을 굽는다 (지연 생성).
 *  - 굽는 과정에서 저해상도 래스터화 + 외곽선 + 셀 음영을 입혀
 *    도트 찍은 스프라이트처럼 보이게 만든다.
 *  - assets/sprites.json 이 있으면 그쪽 시트를 우선 사용한다.
 *    (직접 준비한 스프라이트 시트를 그대로 끼워 넣을 수 있다)
 * ========================================================= */
'use strict';

/** 스프라이트 1픽셀 = 월드 1/SPRITE_SCALE 단위. 화면에서 딱 정수배(2배)가 되도록 맞춘다. */
const SPRITE_SCALE = 0.75;
const SPRITE_DRAW = 1 / SPRITE_SCALE;          // 그릴 때 확대 배율
const CELL_W = 136, CELL_H = 168;              // 셀 크기(스프라이트 픽셀)
const CELL_OX = 50, CELL_OY = 154;             // 셀 안에서 발끝(원점) 위치
const PAGE_SIZE = 1024;
const ATLAS_COLS = Math.floor(PAGE_SIZE / CELL_W);
const ATLAS_ROWS = Math.floor(PAGE_SIZE / CELL_H);
const CELLS_PER_PAGE = ATLAS_COLS * ATLAS_ROWS;
const MAX_PAGES = 10;           // 아틀라스 상한 (초과하면 벡터로 그린다 - 메모리 보호)

const OUTLINE = '#140f1c';
const ALPHA_CUT = 118;          // 이 값보다 옅은 가장자리는 잘라내 도트를 또렷하게

const SpriteBank = {
  enabled: true,
  pages: [],
  frames: new Map(),      // key -> {image, sx, sy, sw, sh, ox, oy, scale}
  external: null,         // { charId: { image, frames:{key:[x,y]}, meta } }
  count: 0,
  _tmp: null, _sil: null,

  init(opts) {
    this.enabled = !(opts && opts.disabled);
    this.pages.length = 0;
    this.frames.clear();
    this.count = 0;
    this.loaded = null;                 // 지금 아틀라스에 구워 둔 캐릭터
    this._tmp = this._makeCanvas(CELL_W, CELL_H);
    this._sil = this._makeCanvas(CELL_W, CELL_H);
    this._tmpCtx = this._tmp.getContext('2d', { willReadFrequently: true });
  },

  /**
   * 이번 매치에 쓰는 캐릭터만 아틀라스에 남긴다.
   * 로스터가 커지면(14인) 매치를 거듭할수록 페이지 상한을 넘겨
   * 벡터 렌더링으로 떨어지므로, 캐릭터가 바뀔 때 아틀라스를 비운다.
   * 같은 조합으로 재대결하면 그대로 재사용한다.
   */
  keepOnly(ids) {
    const cur = this.loaded;
    if (cur && cur.length === ids.length && ids.every(id => cur.includes(id))) return;
    const ext = this.external, on = this.enabled;
    this.init({ disabled: !on });
    this.external = ext;
    this.loaded = ids.slice();
  },

  _makeCanvas(w, h) {
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    return cv;
  },

  /** 스프라이트 픽셀 격자에 맞춰 좌표를 스냅한다 (픽셀이 흔들리지 않도록) */
  snap(v) { return Math.round(v * SPRITE_SCALE) / SPRITE_SCALE; },

  /** 표정 등 포즈 키만으로는 구분되지 않는 변형을 키에 함께 넣는다 */
  variantOf(f) {
    // 변신하면 머리 모양·색·각인이 달라지므로 변신 여부를 항상 키에 넣는다
    const ss = (f.superSaiyan && f.char.form) ? 's' : 'n';
    const hurt = (f.hitstun > 0 || f.state === 'hurt' || f.state === 'hurtAir') ? 'h' : '';
    const angry = (f.attack || f.charging) ? 'a' : '';
    return ss + hurt + angry;
  },

  /** 현재 포즈에 해당하는 스프라이트 프레임을 돌려준다 (없으면 굽는다) */
  get(f, pose, time) {
    if (!this.enabled || !pose.key) return null;
    const key = f.char.id + '|' + pose.key + '|' + this.variantOf(f);
    if (this.frames.has(key)) return this.frames.get(key);   // null = 벡터로 그린다

    const ss = this.variantOf(f)[0] === 's';
    let frame = this._fromExternal(f.char.id, pose.key, ss);
    if (!frame) {
      try {
        frame = this._bake(f, pose, time);
      } catch (err) {
        console.warn('스프라이트 굽기 실패, 벡터 렌더링으로 대체합니다', err);
        this.enabled = false;
        return null;
      }
    }
    this.frames.set(key, frame || null);
    return frame || null;
  },

  /**
   * 외부 스프라이트 시트에 해당 프레임이 있으면 사용.
   * 초사이어인 상태에서는 '<키>_ss' 프레임을 먼저 찾고, 없으면 기본 프레임을 쓴다.
   */
  _fromExternal(charId, poseKey, superSaiyan) {
    const ex = this.external && this.external[charId];
    if (!ex) return null;
    const rect = (superSaiyan && ex.frames[poseKey + '_ss']) || ex.frames[poseKey];
    if (!rect) return null;
    return {
      image: ex.image, sx: rect[0], sy: rect[1],
      sw: ex.meta.cellWidth, sh: ex.meta.cellHeight,
      ox: ex.meta.originX, oy: ex.meta.originY,
      scale: 1 / (ex.meta.scale || SPRITE_SCALE)
    };
  },

  _page() {
    const idx = Math.floor(this.count / CELLS_PER_PAGE);
    if (idx >= MAX_PAGES) return null;      // 상한 초과 - 이 포즈는 벡터로 그린다
    while (this.pages.length <= idx) this.pages.push(this._makeCanvas(PAGE_SIZE, PAGE_SIZE));
    const local = this.count % CELLS_PER_PAGE;
    return {
      canvas: this.pages[idx],
      x: (local % ATLAS_COLS) * CELL_W,
      y: Math.floor(local / ATLAS_COLS) * CELL_H
    };
  },

  /**
   * 리그를 스프라이트 해상도로 그린 뒤
   * 알파 스냅 → 외곽선 → 림라이트 → 셀 음영 순서로 다듬어 굽는다.
   */
  _bake(f, pose, time) {
    const tmp = this._tmpCtx;
    tmp.setTransform(1, 0, 0, 1, 0, 0);
    tmp.clearRect(0, 0, CELL_W, CELL_H);
    tmp.save();
    tmp.translate(CELL_OX, CELL_OY);
    tmp.scale(SPRITE_SCALE, SPRITE_SCALE);
    drawFighterRig(tmp, f, pose, time);
    tmp.restore();

    // 안티에일리어싱으로 생긴 반투명 가장자리를 정리한다 (도트 특유의 또렷한 윤곽)
    const img = tmp.getImageData(0, 0, CELL_W, CELL_H);
    const d = img.data;
    for (let i = 3; i < d.length; i += 4) {
      d[i] = d[i] < ALPHA_CUT ? 0 : 255;
    }
    tmp.putImageData(img, 0, 0);

    // 실루엣(외곽선 색으로 채운 판)
    const sil = this._sil.getContext('2d');
    sil.setTransform(1, 0, 0, 1, 0, 0);
    sil.clearRect(0, 0, CELL_W, CELL_H);
    sil.drawImage(this._tmp, 0, 0);
    sil.globalCompositeOperation = 'source-in';
    sil.fillStyle = OUTLINE;
    sil.fillRect(0, 0, CELL_W, CELL_H);
    sil.globalCompositeOperation = 'source-over';

    const slot = this._page();
    if (!slot) return null;
    const ctx = slot.canvas.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(slot.x, slot.y, CELL_W, CELL_H);
    ctx.imageSmoothingEnabled = false;

    // 8방향으로 실루엣을 깔아 1px 외곽선을 만든다
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        ctx.drawImage(this._sil, slot.x + dx, slot.y + dy);
      }
    }
    ctx.drawImage(this._tmp, slot.x, slot.y);

    // 셀 음영 : 아래쪽은 어둡게, 위쪽엔 하이라이트
    ctx.save();
    ctx.beginPath();
    ctx.rect(slot.x, slot.y, CELL_W, CELL_H);
    ctx.clip();
    ctx.globalCompositeOperation = 'source-atop';
    const grad = ctx.createLinearGradient(0, slot.y, 0, slot.y + CELL_H);
    grad.addColorStop(0, 'rgba(255,246,220,0.15)');
    grad.addColorStop(0.28, 'rgba(255,255,255,0)');
    grad.addColorStop(0.58, 'rgba(18,14,40,0.05)');
    grad.addColorStop(1, 'rgba(14,10,32,0.32)');
    ctx.fillStyle = grad;
    ctx.fillRect(slot.x, slot.y, CELL_W, CELL_H);
    ctx.restore();

    this.count++;
    return {
      image: slot.canvas, sx: slot.x, sy: slot.y, sw: CELL_W, sh: CELL_H,
      ox: CELL_OX, oy: CELL_OY, scale: SPRITE_DRAW
    };
  },

  /**
   * 게임이 사용하는 모든 포즈 프레임 목록.
   * 스프라이트 시트를 직접 그릴 때 필요한 프레임 키가 곧 이 목록이다.
   * (내보내기 도구와 문서가 이 목록을 그대로 사용한다)
   */
  poseSpecs() {
    const specs = [];
    const add = (over, time) => specs.push({ over, time: time || 0 });
    // 각 위상 구간의 한가운데 시각을 쓴다 (경계에서 반올림 오차로 프레임이 빠지지 않도록)
    const mid = (i, period, steps) => (i + 0.5) * (period / steps);
    for (let i = 0; i < 4; i++) add({ state: 'idle' }, mid(i, BOB_PERIOD, 4));
    for (let i = 0; i < 6; i++) add({ state: 'walk' }, mid(i, WALK_PERIOD, 6));
    for (let i = 0; i < 6; i++) add({ state: 'walkBack' }, mid(i, WALK_BACK_PERIOD, 6));
    for (let i = 0; i < 4; i++) add({ state: 'charge', charging: true }, mid(i, BOB_PERIOD, 4));
    for (let i = 0; i < 4; i++) add({ state: 'win' }, mid(i, BOB_PERIOD, 4));
    // 등장 모션 : 진행도 구간마다 한 장씩
    for (let i = 0; i < ENTRANCE_STEPS; i++) {
      add({ state: 'entrance', stateTimer: Math.round((i + 0.5) * ENTRANCE_FRAMES / ENTRANCE_STEPS) });
    }
    ['crouch', 'crouchGuard', 'guard', 'dash', 'wakeup', 'knockdown'].forEach(st => add({ state: st }));
    add({ state: 'jump', vy: -6 });
    add({ state: 'jump', vy: 6 });
    add({ state: 'hurt', hitstun: 6 });
    // 공격기 : 각 단계별로 한 장씩
    Object.values(MOVES).forEach(def => {
      // 구체형 필살기는 빔형과 같은 포즈 키를 쓰므로 목록에 중복해서 넣지 않는다
      if (/^orb/.test(def.key)) return;
      const steps = ATTACK_STEPS;
      for (let i = 0; i <= steps; i++) {
        const frame = i < steps
          ? Math.round(def.startup * i / steps)
          : def.startup + Math.max(0, Math.floor(def.active / 2));
        add({ state: 'attack', attack: { def, frame, hitApplied: false, spawned: true } });
      }
      // 빔기는 기 모으기 마지막 단계(C4)가 위 샘플에 잡히지 않으므로 따로 넣는다
      if (def.beam) {
        add({ state: 'attack', attack: { def, frame: def.startup - 1, hitApplied: false, spawned: false } });
      }
    });
    return specs;
  },

  /** 포즈 스펙으로 임시 파이터 객체를 만든다 */
  makeDummy(char, over) {
    return Object.assign({
      char, x: 0, y: 0, facing: 1, vy: 0, state: 'idle', stateTimer: 0,
      attack: null, ki: 0, charging: false, flash: 0, hitstun: 0, superSaiyan: false,
      guarding: false, blockstun: 0
    }, over);
  },

  /**
   * assets/sprites.json 을 읽어 외부 스프라이트 시트를 적용한다.
   * 파일이 없거나 file:// 로 열어 fetch 가 막히면 조용히 무시하고 내장 스프라이트를 쓴다.
   */
  async loadExternal(base) {
    const root = base || 'assets/';
    let manifest;
    try {
      const res = await fetch(root + 'sprites.json', { cache: 'no-cache' });
      if (!res.ok) return false;
      manifest = await res.json();
    } catch (e) {
      return false;   // 시트 없음 - 내장 스프라이트 사용
    }
    const meta = {
      cellWidth: manifest.cellWidth || CELL_W,
      cellHeight: manifest.cellHeight || CELL_H,
      originX: manifest.originX != null ? manifest.originX : CELL_OX,
      originY: manifest.originY != null ? manifest.originY : CELL_OY,
      scale: manifest.scale || SPRITE_SCALE
    };
    const loaded = {};
    await Promise.all(Object.entries(manifest.characters || {}).map(([id, def]) =>
      new Promise(resolve => {
        const img = new Image();
        img.onload = () => {
          loaded[id] = { image: img, frames: def.frames || {}, meta: Object.assign({}, meta, def.meta) };
          resolve();
        };
        img.onerror = () => { console.warn('스프라이트 시트를 불러오지 못했습니다:', def.image); resolve(); };
        img.src = root + def.image;
      })
    ));
    if (!Object.keys(loaded).length) return false;
    this.external = loaded;
    this.frames.clear();     // 새 시트를 반영하도록 캐시 초기화
    console.info('외부 스프라이트 시트 적용:', Object.keys(loaded).join(', '));
    return true;
  }
};
