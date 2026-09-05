/* =========================================================
 *  Game : 화면 전환 / 라운드 진행 / 충돌 / HUD
 * ========================================================= */
'use strict';

/* ---------------------------------------------------------
 *  화면 해상도는 컨테이너 크기에 맞춰 자동으로 정해진다.
 *  월드 확대율(WORLD_SCALE)은 고정해 스프라이트 픽셀이 항상
 *  정수배(2배)로 찍히게 하고, 대신 "보이는 월드 영역"을 조절한다.
 * --------------------------------------------------------- */
const WORLD_SCALE = 1.5;          // 월드 1단위 = 캔버스 1.5px (스프라이트 1px = 화면 2px)
const BASE_VIEW_H = 450;          // 기준이 되는 세로 시야(월드 단위)
const MIN_VIEW_W = 660;           // 세로 화면에서도 이만큼은 가로로 보여준다
const MAX_VIEW_W = 1040;          // 초광각 화면에서 너무 멀어지지 않도록
const GROUND_PAD = 38;            // 지면 아래로 보이는 여백(월드 단위)
const MIN_ASPECT = 0.5, MAX_ASPECT = 2.8;
const ROUND_TIME = 99;            // 초
const ROUNDS_TO_WIN = 2;
const MAX_ROUNDS = 5;             // 무승부가 이어져도 이 라운드에서 판정으로 끝낸다

const Game = {
  canvas: null, ctx: null,
  state: 'title',                 // title | select | fight | roundEnd | matchEnd
  phase: 'intro',                 // intro | battle | ko | timeout
  fighters: [],
  particles: new Particles(),
  projectiles: [],
  blastClashes: [],      // 기탄끼리 맞부딪힌 지점
  beamClash: null,       // 빔 힘겨루기 상태
  cam: { x: 0, shakeX: 0, shakeY: 0, shake: 0 },
  time: 0,
  phaseTimer: 0,
  roundTimer: ROUND_TIME * 60,
  roundNo: 1,
  stage: STAGES[0],
  mode: 'cpu',                    // cpu | versus
  difficulty: 'normal',
  paused: false,
  slowmo: 0,
  selection: [null, null],
  rouletteTimer: 0,
  hudLag: [1, 1],
  lastFrame: 0,
  acc: 0,

  /* ==================== 초기화 ==================== */
  init() {
    this.canvas = document.getElementById('game');
    this.ctx = this.canvas.getContext('2d');
    this.resize();
    this.bindResize();
    this.debug = /[?&]debug=1/.test(location.search);
    // 접근성 : 동작 줄이기 설정을 따라간다
    const rm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
    this.reduceMotion = !!(rm && rm.matches);
    if (rm && rm.addEventListener) rm.addEventListener('change', e => { this.reduceMotion = e.matches; });
    // ?vector=1 로 스프라이트를 끄고 벡터 렌더링을 그대로 볼 수 있다
    SpriteBank.init({ disabled: /[?&]vector=1/.test(location.search) });
    // 단일 파일 빌드에서는 외부 시트 폴더가 없으므로 건너뛴다
    if (!window.DFZ_SINGLE_FILE) {
      SpriteBank.loadExternal().then(ok => { if (ok) this.buildSelectGrid(); });
    }
    Input.init();
    this.buildSelectGrid();
    this.bindUI();
    this.show('screen-title');
    requestAnimationFrame(t => this.loop(t));
  },

  /* ==================== 화면 크기 자동 맞춤 ==================== */
  /**
   * 캔버스 해상도와 "보이는 월드 영역"을 컨테이너 비율에 맞춰 다시 계산한다.
   * - 가로가 넓은 화면 : 스테이지를 더 넓게 보여준다
   * - 세로로 긴 화면   : 최소 가로 시야를 확보하기 위해 조금 물러난다(하늘이 더 보임)
   */
  resize() {
    const wrap = this.canvas.parentElement;
    const box = wrap.getBoundingClientRect();
    const cssW = Math.max(200, box.width);
    const cssH = Math.max(140, box.height);
    const aspect = clamp(cssW / cssH, MIN_ASPECT, MAX_ASPECT);

    let vw = BASE_VIEW_H * aspect;
    let vh = BASE_VIEW_H;
    if (vw < MIN_VIEW_W) { vw = MIN_VIEW_W; vh = vw / aspect; }
    else if (vw > MAX_VIEW_W) { vw = MAX_VIEW_W; vh = vw / aspect; }

    this.viewW = vw;
    this.viewH = vh;
    this.camY = GROUND_Y + GROUND_PAD - vh;      // 지면이 화면 아래쪽에 오도록
    this.canvas.width = Math.round(vw * WORLD_SCALE);
    this.canvas.height = Math.round(vh * WORLD_SCALE);
    this.ctx.imageSmoothingEnabled = false;

    if (this.fighters.length) {
      this.cam.x = SpriteBank.snap(this.clampCam(
        (this.fighters[0].x + this.fighters[1].x) / 2 - vw / 2));
    }
  },

  clampCam(x) {
    const max = Math.max(0, STAGE_RIGHT - this.viewW);
    return clamp(x, 0, max);
  },

  bindResize() {
    let pending = false;
    const onResize = () => {
      if (pending) return;
      pending = true;
      requestAnimationFrame(() => { pending = false; this.resize(); });
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    if (window.visualViewport) window.visualViewport.addEventListener('resize', onResize);
    if (window.ResizeObserver) {
      new ResizeObserver(onResize).observe(this.canvas.parentElement);
    }
  },

  /** 전체 화면 전환 (가능하면 가로 방향으로 고정) */
  async toggleFullscreen() {
    const el = document.documentElement;
    try {
      if (!document.fullscreenElement) {
        await (el.requestFullscreen ? el.requestFullscreen() : el.webkitRequestFullscreen());
        if (screen.orientation && screen.orientation.lock) {
          try { await screen.orientation.lock('landscape'); } catch (e) { /* 지원 안 하면 무시 */ }
        }
      } else {
        if (screen.orientation && screen.orientation.unlock) {
          try { screen.orientation.unlock(); } catch (e) { /* 무시 */ }
        }
        await document.exitFullscreen();
      }
    } catch (e) {
      console.warn('전체 화면을 사용할 수 없습니다', e);
    }
    setTimeout(() => this.resize(), 120);
  },

  /* ==================== UI ==================== */
  show(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.toggle('is-active', s.id === id));
    document.getElementById('hud').classList.toggle('is-hidden', id !== 'screen-fight');
    document.getElementById('touchpad').classList.toggle('is-hidden', id !== 'screen-fight');
  },

  bindUI() {
    const q = id => document.getElementById(id);
    q('btn-cpu').addEventListener('click', () => this.startSelect('cpu'));
    q('btn-versus').addEventListener('click', () => this.startSelect('versus'));
    q('btn-howto').addEventListener('click', () => q('screen-help').classList.add('is-active'));
    q('btn-help-close').addEventListener('click', () => q('screen-help').classList.remove('is-active'));
    document.querySelectorAll('[data-diff]').forEach(b => {
      b.addEventListener('click', () => {
        this.difficulty = b.dataset.diff;
        document.querySelectorAll('[data-diff]').forEach(x => x.classList.toggle('is-on', x === b));
        Sfx.play('ui');
      });
    });
    q('btn-select-back').addEventListener('click', () => {
      Sfx.play('ui');
      this.selectToken = (this.selectToken || 0) + 1;   // 예약된 매치 취소
      this.state = 'title';
      this.show('screen-title');
    });
    q('btn-rematch').addEventListener('click', () => { Sfx.play('ui'); this.startMatch(); });
    q('btn-tochars').addEventListener('click', () => { Sfx.play('ui'); this.startSelect(this.mode); });
    q('btn-totitle').addEventListener('click', () => { Sfx.play('ui'); this.show('screen-title'); this.state = 'title'; });
    q('btn-pause').addEventListener('click', () => this.togglePause());
    q('btn-resume').addEventListener('click', () => this.togglePause());
    q('btn-quit').addEventListener('click', () => {
      this.paused = false;
      document.getElementById('pause-overlay').classList.remove('is-active');
      this.state = 'title'; this.show('screen-title');
    });
    const fsBtn = q('btn-fullscreen');
    if (document.fullscreenEnabled || document.documentElement.webkitRequestFullscreen) {
      fsBtn.addEventListener('click', () => { Sfx.play('ui'); this.toggleFullscreen(); });
      document.addEventListener('fullscreenchange', () => {
        fsBtn.textContent = document.fullscreenElement ? '⤡' : '⤢';
        this.resize();
      });
    } else {
      fsBtn.hidden = true;
    }
    q('btn-mute').addEventListener('click', () => {
      Sfx.muted = !Sfx.muted;
      Sfx.setMuted(Sfx.muted);
      q('btn-mute').textContent = Sfx.muted ? '🔇' : '🔊';
    });
    window.addEventListener('keydown', e => {
      if (e.code === 'Escape') {
        if (this.state === 'fight') this.togglePause();
        else if (this.state === 'select') {
          Sfx.play('ui');
          this.selectToken = (this.selectToken || 0) + 1;
          this.state = 'title';
          this.show('screen-title');
        } else if (this.state === 'matchEnd') {
          Sfx.play('ui'); this.state = 'title'; this.show('screen-title');
        }
        return;
      }
      if (this.state === 'select') { this.handleSelectKey(e.code); return; }
      if (e.code === 'Enter' || e.code === 'KeyJ' || e.code === 'Space') {
        if (this.state === 'title') this.startSelect('cpu');
        else if (this.state === 'matchEnd') this.startMatch();
      }
    });
    document.addEventListener('pointerdown', () => { Sfx.init(); Sfx.resume(); }, { once: true });
    window.addEventListener('keydown', () => { Sfx.init(); Sfx.resume(); }, { once: true });
  },

  buildSelectGrid() {
    const grid = document.getElementById('char-grid');
    grid.innerHTML = '';
    CHARACTERS.forEach((c, i) => {
      const card = document.createElement('button');
      card.className = 'char-card';
      card.dataset.index = i;
      card.style.setProperty('--gi', c.colors.gi);
      card.style.setProperty('--aura', c.colors.aura);
      card.innerHTML =
        `<canvas class="char-portrait" width="140" height="150"></canvas>
         <span class="char-name">${c.name}</span>
         <span class="char-title">${c.title}</span>`;
      card.addEventListener('click', () => this.pickCharacter(i));
      card.addEventListener('mouseenter', () => {
        this.cursor = i;
        this.previewCharacter(i);
        this.highlightCursor();
      });
      grid.appendChild(card);
      this.drawPortrait(card.querySelector('canvas'), c);
    });
  },

  /** 선택 / 결과 화면용 미니 캐릭터 초상 (게임과 같은 스프라이트를 사용) */
  drawPortrait(cv, ch) {
    const ctx = cv.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cv.width, cv.height);
    const dummy = {
      char: ch, x: 0, y: 0, facing: 1, state: 'idle', stateTimer: 0, vy: 0,
      attack: null, ki: 0, charging: false, flash: 0, hitstun: 0, guarding: false, blockstun: 0
    };
    const pose = poseFor(dummy, 0);
    const frame = SpriteBank.get(dummy, pose, 0);
    ctx.save();
    ctx.translate(cv.width / 2, cv.height - 8);
    if (frame) {
      // 외부 시트를 써도 크기가 어긋나지 않도록 프레임 자체 배율을 기준으로 잡는다
      const k = (frame.scale || SPRITE_DRAW) * 0.79;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(
        frame.image, frame.sx, frame.sy, frame.sw, frame.sh,
        -frame.ox * k, -frame.oy * k, frame.sw * k, frame.sh * k
      );
    } else {
      ctx.scale(0.78, 0.78);
      drawFighterRig(ctx, dummy, pose, 0);
    }
    ctx.restore();
  },

  previewCharacter(i) {
    const c = CHARACTERS[i];
    document.getElementById('sel-name').textContent = c.name;
    document.getElementById('sel-title').textContent = c.title;
    document.getElementById('sel-quote').textContent = `"${c.quotes.pick}"`;
    document.getElementById('sel-special').textContent = `${c.special.name} / ${c.ultimate.name}`;
    const formEl = document.getElementById('sel-form');
    if (formEl) {
      formEl.textContent = c.form ? c.form.name : '변신 없음';
      formEl.classList.toggle('is-none', !c.form);
    }
    // 캐릭터 간 편차가 잘 보이도록 최소/최대 기준으로 정규화한다
    const stat = (id, v, lo, hi) => {
      document.getElementById(id).style.width = clamp((v - lo) / (hi - lo) * 100, 12, 100) + '%';
    };
    stat('stat-hp', c.hp, 860, 1160);
    stat('stat-power', c.power, 0.88, 1.24);
    stat('stat-speed', c.speed, 2.85, 4.15);
    stat('stat-defense', c.defense, 0.88, 1.16);
  },

  /* ==================== 캐릭터 선택 ==================== */
  startSelect(mode) {
    Sfx.init(); Sfx.resume(); Sfx.play('ui');
    this.selectToken = (this.selectToken || 0) + 1;   // 예약된 매치 시작을 무효화
    this.mode = mode;
    this.state = 'select';
    this.selection = [null, null];
    this.rouletteTimer = 0;
    this.cursor = 0;
    this.updateSelectUI();
    this.previewCharacter(0);
    this.highlightCursor();
    this.show('screen-select');
  },

  /** 캐릭터 선택 화면 키보드 조작 */
  handleSelectKey(code) {
    // 그리드가 화면 폭에 따라 열 수가 바뀌므로 실제 배치에서 읽어온다
    const cards = document.querySelectorAll('.char-card');
    let COLS = 1;
    if (cards.length > 1) {
      const top0 = cards[0].offsetTop;
      COLS = 0;
      for (const card of cards) { if (card.offsetTop === top0) COLS++; else break; }
      COLS = Math.max(1, COLS);
    }
    const n = CHARACTERS.length;
    let c = this.cursor || 0;
    if (/^(ArrowLeft|KeyA|Numpad4)$/.test(code)) c = (c - 1 + n) % n;
    else if (/^(ArrowRight|KeyD|Numpad6)$/.test(code)) c = (c + 1) % n;
    else if (/^(ArrowUp|KeyW|Numpad8)$/.test(code)) c = (c - COLS + n) % n;
    else if (/^(ArrowDown|KeyS|Numpad2)$/.test(code)) c = (c + COLS) % n;
    else if (/^(Enter|Space|KeyJ|Numpad1|Digit1)$/.test(code)) { this.pickCharacter(c); return; }
    else return;
    this.cursor = c;
    this.previewCharacter(c);
    this.highlightCursor();
    Sfx.play('ui');
  },

  highlightCursor() {
    document.querySelectorAll('.char-card').forEach((card, i) => {
      card.classList.toggle('is-cursor', i === this.cursor);
    });
  },

  updateSelectUI() {
    const label = document.getElementById('sel-turn');
    if (this.selection[0] === null) label.textContent = '1P 캐릭터를 선택하세요';
    else if (this.selection[1] === null) {
      label.textContent = this.mode === 'cpu' ? 'CPU 상대 결정 중...' : '2P 캐릭터를 선택하세요';
    }
    document.querySelectorAll('.char-card').forEach((card, i) => {
      card.classList.toggle('is-p1', this.selection[0] === i);
      card.classList.toggle('is-p2', this.selection[1] === i);
    });
    const slot = (n, idx) => {
      const el = document.getElementById(n);
      el.textContent = idx === null ? '???' : CHARACTERS[idx].name;
      el.classList.toggle('is-set', idx !== null);
    };
    slot('slot-p1', this.selection[0]);
    slot('slot-p2', this.selection[1]);
  },

  pickCharacter(i) {
    if (this.state !== 'select' || this.rouletteTimer > 0) return;
    Sfx.play('ui');
    if (this.selection[0] === null) {
      this.selection[0] = i;
      this.updateSelectUI();
      if (this.mode === 'cpu') {
        this.rouletteTimer = 54;   // CPU 룰렛
      }
    } else if (this.selection[1] === null && this.mode === 'versus') {
      this.selection[1] = i;
      this.updateSelectUI();
      this.queueMatch(420);
    }
  },

  updateRoulette() {
    if (this.rouletteTimer <= 0) return;
    this.rouletteTimer--;
    if (this.rouletteTimer % 5 === 0) {
      // 마지막 결정에서는 1P와 겹치지 않도록 한 번 더 굴린다
      let pick = randInt(0, CHARACTERS.length - 1);
      if (this.rouletteTimer === 0 && pick === this.selection[0]) {
        pick = (pick + randInt(1, CHARACTERS.length - 1)) % CHARACTERS.length;
      }
      this.selection[1] = pick;
      this.updateSelectUI();
      Sfx.play('ui');
    }
    if (this.rouletteTimer === 0) {
      Sfx.play('bell');
      this.queueMatch(520);
    }
  },

  /** 잠시 뒤 매치를 시작한다. 그 사이 선택 화면을 떠나면 취소된다 */
  queueMatch(delay) {
    const token = this.selectToken || 0;
    setTimeout(() => {
      if (this.state !== 'select' || (this.selectToken || 0) !== token) return;
      this.startMatch();
    }, delay);
  },

  /* ==================== 매치 ==================== */
  startMatch() {
    const c1 = CHARACTERS[this.selection[0] != null ? this.selection[0] : 0];
    const c2 = CHARACTERS[this.selection[1] != null ? this.selection[1] : 1];
    this.stage = STAGES[randInt(0, STAGES.length - 1)];
    this.roundNo = 1;
    this.projectiles.length = 0;
    this.blastClashes.length = 0;
    this.endBeamClash();
    this.particles.clear();

    const ai = new AIController(this.difficulty);
    ai.world = this;
    const ctrl2 = this.mode === 'cpu' ? ai : new HumanController(1);

    this.fighters = [
      new Fighter(c1, { world: this, index: 0, controller: new HumanController(0), x: 640, facing: 1 }),
      new Fighter(c2, { world: this, index: 1, controller: ctrl2, x: 1120, facing: -1 })
    ];
    this.fighters[0].roundsWon = 0;
    this.fighters[1].roundsWon = 0;
    document.getElementById('name-p1').textContent = c1.name;
    document.getElementById('name-p2').textContent = c2.name;
    document.getElementById('tag-p2').textContent = this.mode === 'cpu' ? `CPU (${this.diffLabel()})` : '2P';
    document.getElementById('stage-name').textContent = this.stage.name;
    this.hudLag = [1, 1];
    this.state = 'fight';
    this.show('screen-fight');
    this.startRound();
  },

  diffLabel() {
    return { easy: '쉬움', normal: '보통', hard: '어려움', zenkai: '초사이어인' }[this.difficulty] || '보통';
  },

  startRound() {
    const [a, b] = this.fighters;
    a.reset(640, 1); b.reset(1120, -1);
    a.locked = b.locked = true;
    // 캐릭터별 등장 모션으로 라운드를 시작한다
    a.setState('entrance'); b.setState('entrance');
    this.projectiles.length = 0;
    this.blastClashes.length = 0;
    this.endBeamClash();
    this.particles.clear();
    this.roundTimer = ROUND_TIME * 60;
    this.phase = 'intro';
    this.phaseTimer = 0;
    this.slowmo = 0;
    this.koWinner = null;
    this.doubleKO = false;
    this.cam.x = SpriteBank.snap(this.clampCam((a.x + b.x) / 2 - this.viewW / 2));
    this.announce(`ROUND ${this.roundNo}`, 'big');
    this.updateHud(true);
  },

  announce(text, cls) {
    const el = document.getElementById('announce');
    el.textContent = text;
    el.className = 'announce ' + (cls || '');
    // 애니메이션 재시작
    void el.offsetWidth;
    el.classList.add('is-show');
  },
  clearAnnounce() {
    document.getElementById('announce').classList.remove('is-show');
  },

  /* ==================== 월드 콜백 ==================== */
  shake(v) {
    // 시스템이 '동작 줄이기'를 켠 사용자는 화면 흔들림을 크게 낮춘다
    this.cam.shake = Math.max(this.cam.shake, v * (this.reduceMotion ? 0.25 : 1));
  },

  spawnProjectile(owner, def) {
    const pj = def.projectile;
    // 필살기 구체는 캐릭터의 필살기 모션(손 위치)에서 나간다
    const m = tierOf(def) ? motionFor(owner.char, def) : null;
    const src = tierOf(def) ? skillOf(owner.char, def) : owner.char.special;
    this.projectiles.push({
      owner, def,
      x: owner.x + owner.facing * (m ? m.handX : 50),
      y: owner.y + (m ? m.handY : -88),
      vx: owner.facing * pj.speed,
      radius: pj.radius,
      color: src.color, core: src.core || '#ffffff',
      heavy: !!pj.heavy,
      damage: pj.damage, chip: pj.chip, hitstun: pj.hitstun, pushback: pj.pushback,
      life: pj.life
    });
    this.shake(pj.heavy ? (isUltimate(def) ? 14 : 8) : 3);
    if (pj.heavy) {
      // 던지는 순간의 섬광
      this.particles.burst(owner.x + owner.facing * (m ? m.handX : 50), owner.y + (m ? m.handY : -88), 18, {
        color: src.core || '#ffffff', minSpeed: 2, maxSpeed: 9, minSize: 3, maxSize: 10, shape: 'spark'
      });
    }
  },

  onCombo(attacker, inAir) {
    if (attacker.comboCount >= 2) {
      const side = attacker.index === 0 ? 'p1' : 'p2';
      const el = document.getElementById('combo-' + side);
      el.querySelector('.combo-num').textContent = attacker.comboCount;
      el.querySelector('.combo-lbl').textContent = inAir ? 'AIR COMBO!' : 'HIT COMBO!';
      el.classList.toggle('is-air', !!inAir);
      el.classList.remove('is-show');
      void el.offsetWidth;
      el.classList.add('is-show');
    }
  },

  onUltimate(f) {
    this.announce(f.char.ultimate.name, 'ult');
    this.slowmo = Math.max(this.slowmo, 26);
    this.shake(10);
    this.particles.burst(f.x, f.y - 78, 30, {
      color: f.char.ultimate.color, minSpeed: 2, maxSpeed: 10,
      minSize: 4, maxSize: 12, minLife: 20, maxLife: 44, shape: 'shard'
    });
  },

  /** 등장 모션의 스타일별 이펙트 (착지 흙먼지, 검광, 오라 등) */
  onEntranceFx(f, t) {
    const style = f.char.entrance;
    const aura = (f.char.form && f.char.form.aura) || f.char.colors.aura;
    switch (style) {
      case 'descend':
        if (t === Math.round(ENTRANCE_FRAMES * 0.4)) {
          // 착지 : 흙먼지와 충격
          this.shake(11);
          Sfx.play('heavy');
          this.particles.burst(f.x, GROUND_Y, 22, {
            color: '#e6d3ae', minSpeed: 2, maxSpeed: 9, minSize: 3, maxSize: 11, gravity: 0.16
          });
          this.particles.spawn({ x: f.x, y: GROUND_Y - 4, life: 22, size: 40, color: '#fff2c8', shape: 'ring' });
        } else if (t === Math.round(ENTRANCE_FRAMES * 0.72)) {
          // 주먹을 맞부딪히는 순간
          Sfx.play('light');
          this.particles.burst(f.x + f.facing * 10, f.y - 96, 10, {
            color: '#ffffff', minSpeed: 1.5, maxSpeed: 5, minSize: 2, maxSize: 7, shape: 'spark'
          });
        }
        break;
      case 'crossArms':
        if (t === Math.round(ENTRANCE_FRAMES * 0.7)) {
          Sfx.play('charge');
          this.particles.burst(f.x, f.y - 80, 16, {
            color: aura, minSpeed: 1.5, maxSpeed: 6, minSize: 3, maxSize: 9, shape: 'shard'
          });
        }
        break;
      case 'meditate':
        if (t % 6 === 0 && t < ENTRANCE_FRAMES * 0.55) {
          this.particles.spawn({
            x: f.x + rand(-24, 24), y: f.y - 74 - rand(0, 20),
            vx: rand(-0.5, 0.5), vy: rand(-1.6, -0.5), life: randInt(18, 34),
            size: rand(3, 7), color: aura, shape: 'shard'
          });
        }
        break;
      case 'hover':
        if (t % 4 === 0 && t < ENTRANCE_FRAMES * 0.62) {
          this.particles.spawn({
            x: f.x - f.facing * rand(10, 40), y: f.y - 60 + rand(-20, 20),
            vx: -f.facing * rand(0.6, 2), vy: rand(-0.6, 0.6), life: randInt(12, 24),
            size: rand(2, 6), color: aura
          });
        }
        break;
      case 'shrug':
        if (t === Math.round(ENTRANCE_FRAMES * 0.45)) {
          Sfx.play('charge');
          this.particles.spawn({ x: f.x, y: f.y - 90, life: 24, size: 54, color: aura, shape: 'ring' });
        }
        break;
      case 'calm':
        if (t > ENTRANCE_FRAMES * 0.4 && t % 5 === 0) {
          this.particles.spawn({
            x: f.x + rand(-26, 26), y: f.y - rand(0, 20),
            vx: rand(-0.4, 0.4), vy: rand(-4, -1.8), life: randInt(16, 30),
            size: rand(3, 8), color: aura, shape: 'shard'
          });
        }
        break;
      case 'roar':
        if (t === Math.round(ENTRANCE_FRAMES * 0.55)) {
          // 포효와 함께 기가 폭발한다
          Sfx.play('ultimate');
          this.shake(16);
          this.particles.burst(f.x, f.y - 80, 34, {
            color: aura, minSpeed: 3, maxSpeed: 13, minSize: 4, maxSize: 14,
            minLife: 20, maxLife: 46, shape: 'shard'
          });
          this.particles.spawn({ x: f.x, y: f.y - 80, life: 26, size: 54, color: '#ffffff', shape: 'ring' });
        } else if (t > ENTRANCE_FRAMES * 0.55 && t % 4 === 0) {
          this.particles.spawn({
            x: f.x + rand(-32, 32), y: f.y - rand(0, 20),
            vx: rand(-0.6, 0.6), vy: rand(-5, -2.4), life: randInt(16, 30),
            size: rand(4, 10), color: aura, shape: 'shard'
          });
        }
        break;
      case 'dive':
        if (t === Math.round(ENTRANCE_FRAMES * 0.44)) {
          Sfx.play('heavy');
          this.shake(10);
          this.particles.burst(f.x, GROUND_Y, 20, {
            color: '#e6d3ae', minSpeed: 2, maxSpeed: 8, minSize: 3, maxSize: 10, gravity: 0.16
          });
          this.particles.spawn({ x: f.x, y: GROUND_Y - 4, life: 20, size: 36, color: '#e0d0ff', shape: 'ring' });
        } else if (t < ENTRANCE_FRAMES * 0.42 && t % 3 === 0) {
          this.particles.spawn({
            x: f.x + rand(-14, 14), y: f.y - 40 + rand(-30, 30),
            vx: rand(-0.6, 0.6), vy: rand(-3, -1), life: randInt(10, 20),
            size: rand(2, 6), color: aura
          });
        }
        break;
      case 'sword':
        if (t === Math.round(ENTRANCE_FRAMES * 0.47)) {
          // 검광 : 앞으로 크게 베는 궤적
          Sfx.play('heavy');
          this.shake(6);
          for (let i = 0; i < 16; i++) {
            const k = i / 15;
            this.particles.spawn({
              x: f.x + f.facing * (16 + k * 62), y: f.y - 132 + k * 76,
              vx: f.facing * rand(1, 4), vy: rand(0.5, 3),
              life: randInt(10, 20), size: rand(3, 9), color: '#eaf6ff', shape: 'spark'
            });
          }
        }
        break;
    }
  },

  onTransform(f) {
    const form = f.form;
    this.announce(form.name + '!', 'form');
    this.slowmo = Math.max(this.slowmo, 18);
    this.shake(13);
    Sfx.play('ultimate');
    this.particles.burst(f.x, f.y - 74, 40, {
      color: form.aura, minSpeed: 3, maxSpeed: 13, minSize: 4, maxSize: 13,
      minLife: 22, maxLife: 50, shape: 'shard'
    });
    this.particles.spawn({ x: f.x, y: f.y - 74, life: 26, size: 60, color: '#ffffff', shape: 'ring' });
    // 기 폭발로 근처에 있는 상대를 밀어낸다
    const opp = this.fighters[1 - f.index];
    if (opp && Math.abs(opp.x - f.x) < 150 && opp.state !== 'ko') {
      opp.vx = (opp.x >= f.x ? 1 : -1) * 9;
      opp.blockstun = Math.max(opp.blockstun, 14);
    }
  },

  onTransformFail(f) {
    // 조건을 못 갖췄을 때의 짧은 피드백 (기 게이지가 깜빡인다)
    const el = document.getElementById('ki-' + (f.index === 0 ? 'p1' : 'p2'));
    if (!el) return;
    el.classList.remove('is-deny');
    void el.offsetWidth;
    el.classList.add('is-deny');
  },

  onKO(loser) {
    if (this.phase === 'ko') {
      // 같은 프레임에 양쪽이 쓰러졌다면 더블 K.O. (아무도 라운드를 못 가져간다)
      if (this.koWinner && this.koWinner === loser) {
        this.koWinner.roundsWon = Math.max(0, this.koWinner.roundsWon - 1);
        this.koWinner = null;
        this.doubleKO = true;
        this.announce('더블 K.O.', 'ko');
      }
      return;
    }
    this.phase = 'ko';
    this.phaseTimer = 0;
    this.slowmo = 90;
    this.shake(16);
    Sfx.play('ko');
    const winner = this.fighters[1 - loser.index];
    winner.roundsWon++;
    winner.locked = true;
    this.koWinner = winner;
    this.doubleKO = false;
    this.announce('K.O.', 'ko');
    this.particles.burst(loser.x, loser.y - 78, 34, {
      color: '#ffd24a', minSpeed: 3, maxSpeed: 12, minSize: 4, maxSize: 14,
      minLife: 24, maxLife: 50, shape: 'spark'
    });
  },

  /* ==================== 루프 ==================== */
  loop(t) {
    if (!this.lastFrame) this.lastFrame = t;
    let dt = t - this.lastFrame;
    this.lastFrame = t;
    if (dt > 100) dt = 100;
    this.acc += dt;
    const step = 1000 / 60;
    let guard = 0;
    while (this.acc >= step && guard < 5) {
      this.acc -= step;
      guard++;
      // 슬로모로 건너뛴 틱은 입력을 읽지 않았으므로 엣지를 남겨 둔다
      if (this.tick() !== false) Input.endFrame();
    }
    this.draw();
    requestAnimationFrame(nt => this.loop(nt));
  },

  tick() {
    this.time++;
    if (this.state === 'select') { this.updateRoulette(); return; }
    if (this.state !== 'fight' || this.paused) return;

    if (this.slowmo > 0) {
      this.slowmo--;
      if (this.time % 3 !== 0) {
        this.particles.update();
        this.updateCamera();
        return false;          // 이 틱은 입력을 소비하지 않았다
      }
    }

    this.phaseTimer++;
    const [a, b] = this.fighters;

    switch (this.phase) {
      case 'intro':
        if (this.phaseTimer === ENTRANCE_FRAMES + 6) this.announce('FIGHT!', 'fight');
        if (this.phaseTimer > ENTRANCE_FRAMES + 44) {
          this.phase = 'battle';
          this.phaseTimer = 0;
          a.locked = b.locked = false;
          this.clearAnnounce();
          Sfx.play('bell');
        }
        break;
      case 'battle':
        this.roundTimer--;
        if (this.roundTimer <= 0) this.onTimeout();
        break;
      case 'ko':
        if (this.phaseTimer === 70 && !this.doubleKO) {
          const winner = a.alive ? a : (b.alive ? b : null);
          if (winner) winner.setState('win');
        }
        if (this.phaseTimer > 150) this.endRound();
        break;
    }

    // 컨트롤러 판단
    a.ctrl.think(a, b);
    b.ctrl.think(b, a);
    a.update(b);
    b.update(a);
    a.ctrl.endFrame();
    b.ctrl.endFrame();

    this.resolvePush(a, b);
    this.updateBeamClash(a, b);
    this.resolveCombat(a, b);
    this.resolveCombat(b, a);
    this.updateProjectiles();
    this.updateBlastClashes();
    this.particles.update();
    this.updateCamera();
    this.updateHud(false);
  },

  onTimeout() {
    if (this.phase !== 'battle') return;
    const [a, b] = this.fighters;
    const ra = a.hp / a.maxHp, rb = b.hp / b.maxHp;
    this.phase = 'ko';
    this.phaseTimer = 0;
    this.slowmo = 40;
    a.locked = b.locked = true;
    if (Math.abs(ra - rb) < 0.001) {
      this.announce('무승부!', 'ko');
      a.roundsWon += 0; b.roundsWon += 0;
    } else {
      const w = ra > rb ? a : b;
      w.roundsWon++;
      this.announce('TIME UP', 'ko');
    }
    Sfx.play('bell');
  },

  endRound() {
    const [a, b] = this.fighters;
    if (a.roundsWon >= ROUNDS_TO_WIN || b.roundsWon >= ROUNDS_TO_WIN) {
      this.finishMatch(a.roundsWon > b.roundsWon ? a : b);
      return;
    }
    // 무승부가 반복돼도 끝나도록 라운드 수를 제한하고 판정으로 승자를 정한다
    if (this.roundNo >= MAX_ROUNDS) {
      let w = null;
      if (a.roundsWon !== b.roundsWon) w = a.roundsWon > b.roundsWon ? a : b;
      else {
        const ra = a.hp / a.maxHp, rb = b.hp / b.maxHp;
        if (Math.abs(ra - rb) > 0.001) w = ra > rb ? a : b;
      }
      this.finishMatch(w);
      return;
    }
    this.roundNo++;
    this.startRound();
  },

  /** winner 가 null 이면 무승부 결과 */
  finishMatch(winner) {
    this.state = 'matchEnd';
    this.clearAnnounce();
    const draw = !winner;
    const [fa, fb] = this.fighters;
    const shown = winner || (fa.hp >= fb.hp ? fa : fb);
    document.getElementById('result-name').textContent = draw ? '무승부' : winner.char.name;
    document.getElementById('result-quote').textContent =
      draw ? '"승부를 가리지 못했다..."' : `"${winner.char.quotes.win}"`;
    document.getElementById('result-score').textContent =
      `${this.fighters[0].char.name} ${this.fighters[0].roundsWon} : ${this.fighters[1].roundsWon} ${this.fighters[1].char.name}`;
    const tag = draw ? 'DRAW'
      : `${winner.index === 0 ? '1P' : (this.mode === 'cpu' ? 'CPU' : '2P')} WIN`;
    document.getElementById('result-tag').textContent = tag;
    const cv = document.getElementById('result-portrait');
    this.drawPortrait(cv, shown.char);
    this.show('screen-result');
    Sfx.play('bell');
  },

  togglePause() {
    if (this.state !== 'fight') return;
    this.paused = !this.paused;
    document.getElementById('pause-overlay').classList.toggle('is-active', this.paused);
  },

  /* ==================== 충돌 ==================== */
  resolvePush(a, b) {
    const dx = b.x - a.x;
    const dist = Math.abs(dx);
    if (dist < PUSH_RADIUS && a.state !== 'ko' && b.state !== 'ko') {
      const overlap = (PUSH_RADIUS - dist) / 2;
      const s = dx >= 0 ? 1 : -1;
      a.x -= s * overlap * 0.5;
      b.x += s * overlap * 0.5;
      a.x = clamp(a.x, STAGE_LEFT + 40, STAGE_RIGHT - 40);
      b.x = clamp(b.x, STAGE_LEFT + 40, STAGE_RIGHT - 40);
    }
  },

  resolveCombat(att, def) {
    if (!att.attack || att.hitPause > 0) return;
    const move = att.attack.def;

    // 빔 (다단히트)
    if (move.beam) {
      const rect = att.beamRect();
      if (!rect) return;
      const f = att.attack.frame - move.startup;
      if (f % move.beam.hitEvery !== 0) return;
      // 같은 프레임에서 두 번 때리지 않는다 (히트스톱으로 프레임이 멈춰도 안전)
      if (att.attack.lastBeamHit === att.attack.frame) return;
      if (rectsOverlap(rect, def.hurtbox())) {
        att.attack.lastBeamHit = att.attack.frame;
        const hx = def.x - att.facing * 20, hy = def.y - 84;
        def.takeHit(att, move, { x: hx, y: hy }, {
          damage: move.beam.damage, chip: move.beam.chip,
          pushback: move.beam.pushback, lift: 0,
          hitPause: 0                     // 빔은 멈추지 않고 계속 흐른다
        });
        this.particles.burst(hx, hy, 5, {
          color: skillOf(att.char, move).color,
          minSpeed: 2, maxSpeed: 7, minSize: 3, maxSize: 8, shape: 'spark'
        });
      }
      return;
    }

    // 일반 타격기
    if (att.attack.hitApplied) return;
    const hb = att.hitbox();
    if (!hb) return;
    if (move.level === 'grab' && (def.airborne || def.hitstun > 0)) return;
    const hurt = def.hurtbox();
    if (!rectsOverlap(hb, hurt)) return;

    att.attack.hitApplied = true;
    const hx = clamp(hb.x + hb.w / 2, hurt.x, hurt.x + hurt.w);
    const hy = clamp(hb.y + hb.h / 2, hurt.y, hurt.y + hurt.h);
    const res = def.takeHit(att, move, { x: hx, y: hy });
    if (res === 'miss') att.attack.hitApplied = false;
    if (res === 'hit' && move.knockdown) this.shake(7);
  },

  /* ==================== 빔 힘겨루기 ==================== */

  /** 힘겨루기에서 미는 힘 : 기술 등급 × 공격력 × 연타 */
  clashPower(f) {
    const ult = isUltimate(f.attack.def);
    return (ult ? 2.3 : 1) * f.power * (1 + Math.min(f.mash, 12) * 0.05);
  },

  endBeamClash() {
    if (this.beamClash) {
      for (const f of this.beamClash.pair) {
        f.struggling = false;
        f.beamClampX = null;
        f.mash = 0;
      }
    }
    this.beamClash = null;
  },

  updateBeamClash(a, b) {
    const ra = a.beamRect(true), rb = b.beamRect(true);
    const facingEach = a.facing !== b.facing && (b.x - a.x) * a.facing > 0;
    const meet = ra && rb && facingEach && rectsOverlap(ra, rb);

    if (!meet) { this.endBeamClash(); return; }

    if (!this.beamClash || this.beamClash.pair[0] !== a) {
      // 두 빔이 처음 부딪힌 순간
      this.beamClash = { pair: [a, b], t: 0.5, timer: 0, x: 0, y: 0, boom: 0 };
      this.announce('힘겨루기!', 'clash');
      Sfx.play('beam');
      this.shake(10);
      a.mash = b.mash = 0;
    }
    const c = this.beamClash;
    c.timer++;
    a.struggling = b.struggling = true;

    // t : 0 = A쪽(=A 열세), 1 = B쪽(=A 우세)
    const pa = this.clashPower(a), pb = this.clashPower(b);
    c.t = clamp(c.t + (pa - pb) * 0.0125 + rand(-0.0016, 0.0016), 0, 1);

    // 접점 위치 = 두 총구 사이를 t 로 보간
    const ma = motionFor(a.char, a.attack.def), mb = motionFor(b.char, b.attack.def);
    const ax = a.x + a.facing * ma.handX, ay = a.y + ma.handY;
    const bx = b.x + b.facing * mb.handX, by = b.y + mb.handY;
    c.x = lerp(ax, bx, c.t);
    c.y = lerp(ay, by, c.t);
    a.beamClampX = b.beamClampX = c.x;

    // 연출
    this.shake(Math.min(9, 3 + c.timer * 0.02));
    if (c.timer % 2 === 0) {
      const col = c.t > 0.5 ? a.char.special.color : b.char.special.color;
      this.particles.spawn({
        x: c.x + rand(-14, 14), y: c.y + rand(-26, 26),
        vx: rand(-7, 7), vy: rand(-8, 8), life: randInt(10, 24),
        size: rand(3, 9), color: Math.random() < 0.5 ? '#ffffff' : col, shape: 'spark'
      });
    }
    if (c.timer % 14 === 0) {
      this.particles.spawn({ x: c.x, y: c.y, life: 18, size: 44, color: '#ffffff', shape: 'ring' });
    }

    // 승부 (필살기가 화면에 머무는 총 시간을 5초로 제한한다)
    const spent = Math.max(
      a.attack.def.startup + a.attack.def.active,
      b.attack.def.startup + b.attack.def.active);
    const LIMIT = Math.max(60, SPECIAL_MAX_FRAMES - spent);
    if (c.t >= 0.93) this.resolveBeamClash(a, b);
    else if (c.t <= 0.07) this.resolveBeamClash(b, a);
    else if (c.timer > LIMIT) this.resolveBeamClash(null, null);
  },

  /** 힘겨루기 결착. winner 가 null 이면 상쇄(동시 폭발) */
  resolveBeamClash(winner, loser) {
    const c = this.beamClash;
    if (!c) return;
    const [a, b] = c.pair;
    const x = c.x, y = c.y;
    this.endBeamClash();

    this.particles.burst(x, y, 46, {
      color: '#ffffff', minSpeed: 3, maxSpeed: 15, minSize: 4, maxSize: 14,
      minLife: 18, maxLife: 46, shape: 'spark'
    });
    this.particles.spawn({ x, y, life: 30, size: 130, color: '#ffffff', shape: 'ring' });
    this.slowmo = Math.max(this.slowmo, 22);

    if (!winner) {
      // 서로 밀어내며 동시에 터진다 (양쪽 모두 적은 피해)
      this.shake(18);
      this.announce('상쇄!', 'clash');
      for (const f of [a, b]) {
        const opp = f === a ? b : a;
        f.attack = null;
        f.setState('idle');
        f.takeHit(opp, MOVES.beam, { x: f.x, y: f.y - 84 },
          { damage: 40, chip: 40, pushback: 13, lift: 0 });
      }
      return;
    }

    // 승자의 빔이 뚫고 나간다
    this.shake(22);
    this.announce(winner.char.name + ' 우세!', 'clash');
    loser.attack = null;
    loser.beamClampX = null;
    winner.beamClampX = null;
    // 이긴 쪽은 빔을 조금 더 유지한다
    if (winner.attack) {
      const def = winner.attack.def;
      winner.attack.frame = Math.min(winner.attack.frame, def.startup + Math.floor(def.active * 0.4));
    }
    const dmg = (winner.attack && isUltimate(winner.attack.def)) ? 150 : 95;
    loser.comboCount = 0;
    loser.takeHit(winner, MOVES.beam, { x: loser.x, y: loser.y - 84 },
      { damage: dmg, chip: dmg, pushback: 17, lift: -9 });
  },

  updateProjectiles() {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      if (p.clash) continue;              // 맞부딪히는 중 (updateBlastClashes 가 처리)
      p.x += p.vx;
      p.life--;
      if (this.time % 2 === 0) {
        this.particles.spawn({
          x: p.x - Math.sign(p.vx) * p.radius, y: p.y + rand(-4, 4),
          vx: -Math.sign(p.vx) * rand(0.5, 2), vy: rand(-1, 1),
          life: randInt(8, 18), size: rand(3, 7), color: p.color
        });
      }
      const target = this.fighters[1 - p.owner.index];
      let dead = false;
      if (p.life <= 0 || p.x < STAGE_LEFT - 60 || p.x > STAGE_RIGHT + 60) dead = true;

      if (!dead && target.state !== 'ko') {
        const box = { x: p.x - p.radius, y: p.y - p.radius, w: p.radius * 2, h: p.radius * 2 };
        if (rectsOverlap(box, target.hurtbox())) {
          target.takeHit(p.owner, p.def, { x: p.x, y: p.y }, {
            damage: p.damage, chip: p.chip, pushback: p.pushback, lift: 0
          });
          dead = true;
        }
      }
      // 상대 빔에 닿은 기탄은 그대로 증발한다
      if (!dead) {
        const foe = this.fighters[1 - p.owner.index];
        const br = (!p.heavy && foe && foe.beamRect) ? foe.beamRect() : null;
        if (br) {
          const box = { x: p.x - p.radius, y: p.y - p.radius, w: p.radius * 2, h: p.radius * 2 };
          if (rectsOverlap(box, br)) {
            this.particles.burst(p.x, p.y, 14, {
              color: '#ffffff', minSpeed: 2, maxSpeed: 7, minSize: 2, maxSize: 8, shape: 'spark'
            });
            this.shake(4);
            this.projectiles.splice(i, 1);
            continue;
          }
        }
      }

      // 기탄끼리 맞부딪히면 서로 밀며 버틴다
      if (!dead) {
        for (let j = this.projectiles.length - 1; j >= 0; j--) {
          const q = this.projectiles[j];
          if (q === p || q.owner === p.owner || q.clash) continue;
          if (Math.abs(q.x - p.x) < p.radius + q.radius && Math.abs(q.y - p.y) < p.radius + q.radius) {
            this.startBlastClash(p, q);
            dead = true;
            break;
          }
        }
        if (dead) continue;
      }
      if (dead) {
        this.particles.burst(p.x, p.y, 12, {
          color: p.color, minSpeed: 1.5, maxSpeed: 6, minSize: 3, maxSize: 9
        });
        this.projectiles.splice(i, 1);
      }
    }
  },

  /* ==================== 기탄 맞부딪힘 ==================== */
  startBlastClash(p, q) {
    const cl = {
      a: p, b: q, t: 0, dur: 30,
      x: (p.x + q.x) / 2, y: (p.y + q.y) / 2
    };
    p.clash = q.clash = cl;
    p.vx = q.vx = 0;
    // 두 기탄을 접점 좌우로 살짝 붙여 놓는다
    const dir = Math.sign(cl.x - p.x) || 1;
    p.x = cl.x - dir * p.radius * 0.9;
    q.x = cl.x + dir * q.radius * 0.9;
    this.blastClashes.push(cl);
    this.shake(6);
    Sfx.play('blast');
  },

  updateBlastClashes() {
    for (let i = this.blastClashes.length - 1; i >= 0; i--) {
      const cl = this.blastClashes[i];
      cl.t++;
      // 밀고 밀리며 떨리는 연출
      const wob = Math.sin(cl.t / 2.2) * 2.4;
      cl.a.x += wob * 0.5; cl.b.x -= wob * 0.5;
      this.particles.spawn({
        x: cl.x + rand(-10, 10), y: cl.y + rand(-12, 12),
        vx: rand(-5, 5), vy: rand(-5, 5), life: randInt(8, 18),
        size: rand(2, 7), color: Math.random() < 0.5 ? '#ffffff' : cl.a.color, shape: 'spark'
      });
      if (cl.t < cl.dur) continue;

      // 결착 : 위력이 확실히 센 쪽이 뚫고 나간다
      const pw = pr => pr.damage * pr.owner.power * (pr.owner.superSaiyan ? 1.1 : 1);
      const pa = pw(cl.a), pb = pw(cl.b);
      const win = Math.abs(pa - pb) < Math.max(pa, pb) * 0.12 ? null : (pa > pb ? cl.a : cl.b);
      this.particles.burst(cl.x, cl.y, 24, {
        color: '#ffffff', minSpeed: 2.5, maxSpeed: 10, minSize: 3, maxSize: 11, shape: 'spark'
      });
      this.particles.spawn({ x: cl.x, y: cl.y, life: 20, size: 62, color: '#ffffff', shape: 'ring' });
      this.shake(8);
      for (const pr of [cl.a, cl.b]) {
        if (pr === win) {
          // 이긴 기탄은 위력이 줄어든 채 계속 날아간다
          pr.clash = null;
          pr.vx = Math.sign(pr.owner.facing) * pr.def.projectile.speed * 0.8;
          pr.damage *= 0.55;
          pr.radius *= 0.8;
          pr.life = Math.max(pr.life, 40);
        } else {
          const k = this.projectiles.indexOf(pr);
          if (k >= 0) this.projectiles.splice(k, 1);
        }
      }
      this.blastClashes.splice(i, 1);
    }
  },

  updateCamera() {
    const [a, b] = this.fighters;
    if (!a || !b) return;
    const mid = (a.x + b.x) / 2;
    const target = this.clampCam(mid - this.viewW / 2);
    this.cam.x = SpriteBank.snap(lerp(this.cam.x, target, 0.12));
    if (this.cam.shake > 0) {
      this.cam.shakeX = Math.round(rand(-this.cam.shake, this.cam.shake));
      this.cam.shakeY = Math.round(rand(-this.cam.shake, this.cam.shake) * 0.6);
      this.cam.shake *= 0.82;
      if (this.cam.shake < 0.4) { this.cam.shake = 0; this.cam.shakeX = this.cam.shakeY = 0; }
    }
  },

  /* ==================== HUD ==================== */
  updateHud(force) {
    const [a, b] = this.fighters;
    if (!a || !b) return;
    ['p1', 'p2'].forEach((side, i) => {
      const f = this.fighters[i];
      const ratio = f.hp / f.maxHp;
      this.hudLag[i] = force ? ratio : approach(this.hudLag[i], ratio, 0.006);
      document.getElementById('hp-' + side).style.width = (ratio * 100) + '%';
      document.getElementById('hplag-' + side).style.width = (Math.max(this.hudLag[i], ratio) * 100) + '%';
      document.getElementById('ki-' + side).style.width = f.ki + '%';
      const kiEl = document.getElementById('ki-' + side);
      kiEl.classList.toggle('is-max', f.ki >= 100);
      kiEl.classList.toggle('is-form', f.superSaiyan);
      const nameEl = document.getElementById('name-' + side);
      if (nameEl) {
        nameEl.classList.toggle('is-form', f.superSaiyan);
        nameEl.textContent = f.superSaiyan ? f.form.name : f.char.name;
      }
      const pips = document.getElementById('rounds-' + side);
      Array.from(pips.children).forEach((el, k) => el.classList.toggle('is-on', k < f.roundsWon));
    });
    document.getElementById('timer').textContent =
      String(Math.max(0, Math.ceil(this.roundTimer / 60))).padStart(2, '0');
  },

  /* ==================== 그리기 ==================== */
  view() {
    return { x: this.cam.x, y: this.camY, w: this.viewW, h: this.viewH };
  },

  applyWorldTransform(ctx) {
    ctx.setTransform(
      WORLD_SCALE, 0, 0, WORLD_SCALE,
      -this.cam.x * WORLD_SCALE + this.cam.shakeX,
      -this.camY * WORLD_SCALE + this.cam.shakeY
    );
  },

  draw() {
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const CW = this.canvas.width, CH = this.canvas.height;
    ctx.clearRect(0, 0, CW, CH);

    if (this.state !== 'fight' && this.state !== 'matchEnd') {
      // 타이틀 / 선택 화면 : 배경만 천천히 흐르게
      const drift = (this.time * 0.35) % Math.max(1, STAGE_RIGHT - this.viewW);
      this.cam.x = drift;
      this.applyWorldTransform(ctx);
      drawStage(ctx, this.stage, this.view(), this.time);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = 'rgba(6,8,20,0.55)';
      ctx.fillRect(0, 0, CW, CH);
      return;
    }

    this.applyWorldTransform(ctx);
    drawStage(ctx, this.stage, this.view(), this.time);

    const [a, b] = this.fighters;
    // 공격 중인 캐릭터를 앞쪽에 그린다
    const order = a.attack && !b.attack ? [b, a] : [a, b];
    for (const f of order) {
      drawBeam(ctx, f, this.time);
      drawFighter(ctx, f, this.time);
      drawSpecialCharge(ctx, f, this.time);
    }
    for (const p of this.projectiles) drawProjectile(ctx, p, this.time);
    for (const cl of this.blastClashes) drawBlastClash(ctx, cl, this.time);
    drawBeamClash(ctx, this.beamClash, this.time);
    this.particles.draw(ctx);
    if (this.debug) drawDebugBoxes(ctx, this.fighters);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.drawOffscreenMarkers(ctx);
    if (this.phase === 'ko') {
      ctx.fillStyle = 'rgba(255,60,60,0.08)';
      ctx.fillRect(0, 0, CW, CH);
    }
  },

  drawOffscreenMarkers(ctx) {
    for (const f of this.fighters) {
      const sx = (f.x - this.cam.x) * WORLD_SCALE;
      const w = this.canvas.width, cy = this.canvas.height * 0.55;
      if (sx < 16 || sx > w - 16) {
        const x = sx < 16 ? 16 : w - 16;
        ctx.save();
        ctx.fillStyle = f.index === 0 ? '#5ad2ff' : '#ff6b6b';
        ctx.beginPath();
        ctx.moveTo(x, cy - 10); ctx.lineTo(x + (sx < 16 ? -12 : 12), cy); ctx.lineTo(x, cy + 10);
        ctx.closePath(); ctx.fill();
        ctx.restore();
      }
    }
  }
};

window.addEventListener('DOMContentLoaded', () => Game.init());
