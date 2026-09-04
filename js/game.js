/* =========================================================
 *  Game : 화면 전환 / 라운드 진행 / 충돌 / HUD
 * ========================================================= */
'use strict';

const VIEW_W = 960, VIEW_H = 540;
const WORLD_SCALE = 1.2;                       // 캐릭터를 크게 보여주기 위한 줌
const VIEW_WORLD_W = VIEW_W / WORLD_SCALE;     // 화면이 비추는 월드 폭
const VIEW_WORLD_H = VIEW_H / WORLD_SCALE;
const CAM_Y = GROUND_Y - (VIEW_H - 46) / WORLD_SCALE;   // 지면이 화면 하단 46px 위에 오도록
const ROUND_TIME = 99;            // 초
const ROUNDS_TO_WIN = 2;

const Game = {
  canvas: null, ctx: null,
  state: 'title',                 // title | select | fight | roundEnd | matchEnd
  phase: 'intro',                 // intro | battle | ko | timeout
  fighters: [],
  particles: new Particles(),
  projectiles: [],
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
  picker: 0,
  rouletteTimer: 0,
  hudLag: [1, 1],
  lastFrame: 0,
  acc: 0,

  /* ==================== 초기화 ==================== */
  init() {
    this.canvas = document.getElementById('game');
    this.canvas.width = VIEW_W;
    this.canvas.height = VIEW_H;
    this.ctx = this.canvas.getContext('2d');
    this.debug = /[?&]debug=1/.test(location.search);
    // ?vector=1 로 스프라이트를 끄고 벡터 렌더링을 그대로 볼 수 있다
    SpriteBank.init({ disabled: /[?&]vector=1/.test(location.search) });
    SpriteBank.loadExternal().then(ok => { if (ok) this.buildSelectGrid(); });
    Input.init();
    this.buildSelectGrid();
    this.bindUI();
    this.show('screen-title');
    requestAnimationFrame(t => this.loop(t));
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
    q('btn-select-back').addEventListener('click', () => { Sfx.play('ui'); this.show('screen-title'); });
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
    q('btn-mute').addEventListener('click', () => {
      Sfx.muted = !Sfx.muted;
      Sfx.setMuted(Sfx.muted);
      q('btn-mute').textContent = Sfx.muted ? '🔇' : '🔊';
    });
    window.addEventListener('keydown', e => {
      if (e.code === 'Escape') {
        if (this.state === 'fight') this.togglePause();
        else if (this.state === 'select') { Sfx.play('ui'); this.show('screen-title'); this.state = 'title'; }
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
      const k = 1.35;
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
    this.mode = mode;
    this.state = 'select';
    this.selection = [null, null];
    this.picker = 0;
    this.rouletteTimer = 0;
    this.cursor = 0;
    this.updateSelectUI();
    this.previewCharacter(0);
    this.highlightCursor();
    this.show('screen-select');
  },

  /** 캐릭터 선택 화면 키보드 조작 */
  handleSelectKey(code) {
    const COLS = 3;
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
      setTimeout(() => this.startMatch(), 420);
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
      setTimeout(() => this.startMatch(), 520);
    }
  },

  /* ==================== 매치 ==================== */
  startMatch() {
    const c1 = CHARACTERS[this.selection[0] != null ? this.selection[0] : 0];
    const c2 = CHARACTERS[this.selection[1] != null ? this.selection[1] : 1];
    this.stage = STAGES[randInt(0, STAGES.length - 1)];
    this.roundNo = 1;
    this.projectiles.length = 0;
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
    this.projectiles.length = 0;
    this.particles.clear();
    this.roundTimer = ROUND_TIME * 60;
    this.phase = 'intro';
    this.phaseTimer = 0;
    this.slowmo = 0;
    this.cam.x = SpriteBank.snap(clamp((a.x + b.x) / 2 - VIEW_WORLD_W / 2, 0, STAGE_RIGHT - VIEW_WORLD_W));
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
  shake(v) { this.cam.shake = Math.max(this.cam.shake, v); },

  spawnProjectile(owner, def) {
    const pj = def.projectile;
    this.projectiles.push({
      owner, def,
      x: owner.x + owner.facing * 44,
      y: owner.y - 86,
      vx: owner.facing * pj.speed,
      radius: pj.radius,
      color: owner.char.special.color,
      damage: pj.damage, chip: pj.chip, hitstun: pj.hitstun, pushback: pj.pushback,
      life: pj.life
    });
    this.shake(3);
  },

  onCombo(attacker) {
    if (attacker.comboCount >= 2) {
      const side = attacker.index === 0 ? 'p1' : 'p2';
      const el = document.getElementById('combo-' + side);
      el.querySelector('.combo-num').textContent = attacker.comboCount;
      el.classList.remove('is-show');
      void el.offsetWidth;
      el.classList.add('is-show');
    }
  },

  onUltimate(f) {
    this.announce(f.char.ultimate.name, 'ult');
    this.slowmo = Math.max(this.slowmo, 26);
    this.shake(10);
    this.particles.burst(f.x, f.y - 70, 30, {
      color: f.char.ultimate.color, minSpeed: 2, maxSpeed: 10,
      minSize: 4, maxSize: 12, minLife: 20, maxLife: 44, shape: 'shard'
    });
  },

  onKO(loser) {
    if (this.phase === 'ko') return;
    this.phase = 'ko';
    this.phaseTimer = 0;
    this.slowmo = 90;
    this.shake(16);
    Sfx.play('ko');
    const winner = this.fighters[1 - loser.index];
    winner.roundsWon++;
    winner.locked = true;
    this.announce('K.O.', 'ko');
    this.particles.burst(loser.x, loser.y - 70, 34, {
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
      this.tick();
      Input.endFrame();
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
      if (this.time % 3 !== 0) { this.particles.update(); this.updateCamera(); return; }
    }

    this.phaseTimer++;
    const [a, b] = this.fighters;

    switch (this.phase) {
      case 'intro':
        if (this.phaseTimer === 70) this.announce('FIGHT!', 'fight');
        if (this.phaseTimer > 110) {
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
        if (this.phaseTimer === 70) {
          const winner = a.alive ? a : b;
          if (winner.alive) winner.setState('win');
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
    this.resolveCombat(a, b);
    this.resolveCombat(b, a);
    this.updateProjectiles();
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
    this.roundNo++;
    this.startRound();
  },

  finishMatch(winner) {
    this.state = 'matchEnd';
    this.clearAnnounce();
    document.getElementById('result-name').textContent = winner.char.name;
    document.getElementById('result-quote').textContent = `"${winner.char.quotes.win}"`;
    document.getElementById('result-score').textContent =
      `${this.fighters[0].char.name} ${this.fighters[0].roundsWon} : ${this.fighters[1].roundsWon} ${this.fighters[1].char.name}`;
    const tag = winner.index === 0 ? '1P' : (this.mode === 'cpu' ? 'CPU' : '2P');
    document.getElementById('result-tag').textContent = `${tag} WIN`;
    const cv = document.getElementById('result-portrait');
    this.drawPortrait(cv, winner.char);
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
      if (rectsOverlap(rect, def.hurtbox())) {
        const hx = def.x - att.facing * 20, hy = def.y - 80;
        def.takeHit(att, move, { x: hx, y: hy }, {
          damage: move.beam.damage, chip: move.beam.chip,
          pushback: move.beam.pushback, lift: 0
        });
        this.particles.burst(hx, hy, 5, {
          color: move === MOVES.ultimate ? att.char.ultimate.color : att.char.special.color,
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

  updateProjectiles() {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
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
      // 기탄끼리 상쇄
      if (!dead) {
        for (let j = this.projectiles.length - 1; j >= 0; j--) {
          const q = this.projectiles[j];
          if (q === p || q.owner === p.owner) continue;
          if (Math.abs(q.x - p.x) < p.radius + q.radius && Math.abs(q.y - p.y) < p.radius + q.radius) {
            this.particles.burst(p.x, p.y, 18, {
              color: '#ffffff', minSpeed: 2, maxSpeed: 8, minSize: 3, maxSize: 9, shape: 'spark'
            });
            this.shake(5);
            this.projectiles.splice(Math.max(i, j), 1);
            this.projectiles.splice(Math.min(i, j), 1);
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

  updateCamera() {
    const [a, b] = this.fighters;
    if (!a || !b) return;
    const mid = (a.x + b.x) / 2;
    const target = clamp(mid - VIEW_WORLD_W / 2, 0, STAGE_RIGHT - VIEW_WORLD_W);
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
      document.getElementById('ki-' + side).classList.toggle('is-max', f.ki >= 100);
      const pips = document.getElementById('rounds-' + side);
      Array.from(pips.children).forEach((el, k) => el.classList.toggle('is-on', k < f.roundsWon));
    });
    document.getElementById('timer').textContent =
      String(Math.max(0, Math.ceil(this.roundTimer / 60))).padStart(2, '0');
  },

  /* ==================== 그리기 ==================== */
  view() {
    return { x: this.cam.x, y: CAM_Y, w: VIEW_WORLD_W, h: VIEW_WORLD_H };
  },

  applyWorldTransform(ctx) {
    ctx.setTransform(
      WORLD_SCALE, 0, 0, WORLD_SCALE,
      -this.cam.x * WORLD_SCALE + this.cam.shakeX,
      -CAM_Y * WORLD_SCALE + this.cam.shakeY
    );
  },

  draw() {
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, VIEW_W, VIEW_H);

    if (this.state !== 'fight' && this.state !== 'matchEnd') {
      // 타이틀 / 선택 화면 : 배경만 천천히 흐르게
      const drift = (this.time * 0.35) % (STAGE_RIGHT - VIEW_WORLD_W);
      this.cam.x = drift;
      this.applyWorldTransform(ctx);
      drawStage(ctx, this.stage, this.view(), this.time);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = 'rgba(6,8,20,0.55)';
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
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
    }
    for (const p of this.projectiles) drawProjectile(ctx, p, this.time);
    this.particles.draw(ctx);
    if (this.debug) drawDebugBoxes(ctx, this.fighters);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.drawOffscreenMarkers(ctx);
    if (this.phase === 'ko') {
      ctx.fillStyle = 'rgba(255,60,60,0.08)';
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
  },

  drawOffscreenMarkers(ctx) {
    for (const f of this.fighters) {
      const sx = (f.x - this.cam.x) * WORLD_SCALE;
      if (sx < 16 || sx > VIEW_W - 16) {
        const x = sx < 16 ? 16 : VIEW_W - 16;
        ctx.save();
        ctx.fillStyle = f.index === 0 ? '#5ad2ff' : '#ff6b6b';
        ctx.beginPath();
        ctx.moveTo(x, 292); ctx.lineTo(x + (sx < 16 ? -12 : 12), 302); ctx.lineTo(x, 312);
        ctx.closePath(); ctx.fill();
        ctx.restore();
      }
    }
  }
};

window.addEventListener('DOMContentLoaded', () => Game.init());
