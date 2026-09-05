/* =========================================================
 *  Fighter : 캐릭터 상태머신 / 물리 / 판정
 * ========================================================= */
'use strict';

const GRAVITY = 0.86;
const GROUND_Y = 470;          // 발이 닿는 y 좌표
const STAGE_LEFT = 0;
const STAGE_RIGHT = 1760;      // 월드 폭
const PUSH_RADIUS = 54;        // 캐릭터끼리 밀어내는 반경 (넓은 스탠스에 맞춤)
const MAX_AIR_ATTACKS = 3;     // 한 번 뜬 동안 낼 수 있는 공중기 수
const MAX_AIR_JUMPS = 1;       // 2단 점프 횟수
const JUGGLE_LIMIT = 4;        // 이 횟수까지만 다시 띄워진다 (무한 콤보 방지)
const JUMP_CANCEL_FRAMES = 16; // 상대를 띄운 뒤 후딜을 점프로 캔슬할 수 있는 시간
const INPUT_BUFFER = 14;        // 후딜 중 눌린 입력을 이만큼 기억해 다음 동작으로 이어준다
const TRANSFORM_COST = 50;      // 변신에 쓰는 기
const TRANSFORM_TIME = 780;     // 변신 지속 (13초)
const TRANSFORM_STARTUP = 30;   // 변신 연출 동안 무적
const FORM_POWER = 1.18;        // 변신 중 공격력 배율
const FORM_SPEED = 1.08;        // 변신 중 이동속도 배율

const HURT_STAND = { x: -30, y: -152, w: 60, h: 152 };
const HURT_CROUCH = { x: -34, y: -108, w: 68, h: 108 };
const HURT_AIR = { x: -30, y: -142, w: 60, h: 134 };
const HURT_DOWN = { x: -54, y: -44, w: 108, h: 44 };

class Fighter {
  constructor(charData, opts) {
    this.char = charData;
    this.world = opts.world;
    this.index = opts.index;            // 0 = 왼쪽, 1 = 오른쪽
    this.ctrl = opts.controller;
    this.maxHp = charData.hp;
    this.reset(opts.x, opts.facing);
    this.roundsWon = 0;
  }

  reset(x, facing) {
    this.x = x;
    this.y = GROUND_Y;
    this.vx = 0; this.vy = 0;
    this.facing = facing;
    this.hp = this.maxHp;
    this.ki = 0;
    this.state = 'idle';
    this.stateTimer = 0;
    this.attack = null;
    this.hitstun = 0;
    this.blockstun = 0;
    this.invuln = 0;
    this.airborne = false;
    this.crouching = false;
    this.guarding = false;
    this.locked = false;         // 라운드 연출 중 조작 잠금
    this.comboCount = 0;
    this.comboTimer = 0;
    this.dashTimer = 0;
    this.dashCooldown = 0;
    this.tapTimer = [0, 0];      // 좌/우 더블탭 감지
    this.charging = false;
    this.flash = 0;
    this.hitPause = 0;
    this.airAttacks = 0;      // 공중기 사용 횟수
    this.airJumps = 0;        // 2단 점프 사용 횟수
    this.juggle = 0;          // 공중에서 연속으로 맞은 횟수
    this.jumpCancel = 0;      // 점프 캔슬 가능 시간
    this.hardKnockdown = false;
    this.buffered = null;     // 후딜 중 눌린 입력
    this.bufferTimer = 0;
    this.superSaiyan = false; // 변신 상태
    this.ssTimer = 0;         // 변신 남은 시간
    this.transformTimer = 0;  // 변신 연출 시간
    this.mash = 0;            // 힘겨루기 연타 누적
    this.struggling = false;  // 빔 힘겨루기 중
    this.beamClampX = null;   // 힘겨루기 접점 (빔이 여기서 멈춘다)
  }

  /* 변신 보정이 들어간 실제 능력치 */
  get power() { return this.char.power * (this.superSaiyan ? FORM_POWER : 1); }
  get speed() { return this.char.speed * (this.superSaiyan ? FORM_SPEED : 1); }
  get form() { return this.char.form || null; }
  get canEverTransform() { return !!this.char.form; }

  /* ---------------- 조회 ---------------- */
  get alive() { return this.hp > 0; }
  get centerY() { return this.y - 60; }

  canAct() {
    return !this.locked && this.hitstun <= 0 && this.blockstun <= 0 &&
      this.state !== 'ko' && this.state !== 'knockdown' && this.state !== 'wakeup' &&
      this.state !== 'win' && !this.attack;
  }

  hurtbox() {
    let b = HURT_STAND;
    if (this.state === 'knockdown' || this.state === 'ko') b = HURT_DOWN;
    else if (this.airborne) b = HURT_AIR;
    else if (this.crouching) b = HURT_CROUCH;
    // 체구가 작은 캐릭터(오천크스 등)는 판정 상자도 같은 비율로 줄인다
    const k = this.char.scale || 1;
    if (k === 1) return { x: this.x + b.x, y: this.y + b.y, w: b.w, h: b.h };
    return { x: this.x + b.x * k, y: this.y + b.y * k, w: b.w * k, h: b.h * k };
  }

  hitbox() {
    if (!this.attack) return null;
    const def = this.attack.def;
    if (!def.box) return null;
    const f = this.attack.frame;
    if (f < def.startup || f >= def.startup + def.active) return null;
    const b = def.box;
    const x = this.facing > 0 ? this.x + b.x : this.x - b.x - b.w;
    return { x, y: this.y + b.y, w: b.w, h: b.h };
  }

  beamRect(raw) {
    if (!this.attack || !this.attack.def.beam) return null;
    const def = this.attack.def, f = this.attack.frame;
    if (f < def.startup || f >= def.startup + def.active) return null;
    const bm = def.beam;
    const m = motionFor(this.char, def);
    const grow = clamp(0.42 + (f - def.startup) / 6, 0, 1);
    const h = bm.height * m.width * grow;
    const originX = this.x + this.facing * m.handX;
    const originY = this.y + m.oy;
    let reach = bm.reach;
    // 힘겨루기 중에는 접점에서 빔이 멈춘다 (raw = 판정 전 원본 길이)
    if (!raw && this.beamClampX != null) {
      reach = clamp((this.beamClampX - originX) * this.facing, 12, bm.reach);
    }
    const x = this.facing > 0 ? originX : originX - reach;
    return { x, y: originY - h / 2, w: reach, h, grow, originX, originY };
  }

  /* ---------------- 갱신 ---------------- */
  update(opp) {
    if (this.hitPause > 0) { this.hitPause--; return; }

    this.stateTimer++;
    if (this.invuln > 0) this.invuln--;
    if (this.flash > 0) this.flash--;
    if (this.dashCooldown > 0) this.dashCooldown--;
    if (this.jumpCancel > 0) this.jumpCancel--;
    if (this.bufferTimer > 0 && --this.bufferTimer === 0) this.buffered = null;
    if (this.comboTimer > 0) { this.comboTimer--; if (this.comboTimer === 0) this.comboCount = 0; }
    for (let i = 0; i < 2; i++) if (this.tapTimer[i] > 0) this.tapTimer[i]--;
    this.updateForm();
    // 인조인간은 동력원이 무한이라 가만히 있어도 기가 조금씩 회복된다
    if (this.char.kiRegen && this.state !== 'ko' && !this.locked) {
      this.ki = clamp(this.ki + this.char.kiRegen, 0, 100);
    }

    if (this.state === 'ko') { this.physics(); return; }

    // 변신 연출 : 잠깐 멈춰서 기를 폭발시킨다 (무적)
    if (this.transformTimer > 0) {
      this.transformTimer--;
      this.vx *= 0.6;
      this.charging = true;
      this.setState('charge');
      const t = this.transformTimer;
      this.world.particles.spawn({
        x: this.x + rand(-30, 30), y: this.y - rand(0, 130),
        vx: rand(-1.2, 1.2), vy: rand(-6, -2.4), life: randInt(16, 30),
        size: rand(4, 10), color: this.form.aura, shape: 'shard'
      });
      if (t === 0) this.charging = false;
      this.physics();
      return;
    }

    // 상대 방향 바라보기
    if (!this.attack && !this.airborne && this.hitstun <= 0 && this.state !== 'knockdown') {
      this.facing = opp.x >= this.x ? 1 : -1;
    }

    if (this.hitstun > 0) {
      this.hitstun--;
      this.rememberInput();
      this.physics();
      if (this.hitstun === 0 && !this.airborne) this.setState('idle');
      return;
    }
    if (this.blockstun > 0) {
      this.blockstun--;
      this.physics();
      return;
    }
    if (this.state === 'knockdown') {
      this.physics();
      if (this.stateTimer > (this.hardKnockdown ? 64 : 42) && !this.airborne) {
        this.hardKnockdown = false;
        this.setState('wakeup');
        this.invuln = 14;
      }
      return;
    }
    if (this.state === 'wakeup') {
      this.physics();
      if (this.stateTimer > 14) this.setState('idle');
      return;
    }

    if (this.attack) {
      // 공중 콤보 : 상대를 띄운 직후에는 후딜을 점프로 캔슬해 따라 올라갈 수 있다
      if (this.jumpCancel > 0 && !this.locked && !this.airborne && this.inputPressed('up')) {
        this.attack = null;
        this.jumpCancel = 0;
        this.doJump(1.04);
        this.world.particles.burst(this.x, this.y - 4, 8, {
          color: '#ffffff', minSpeed: 1.5, maxSpeed: 4.5, minSize: 2, maxSize: 6, gravity: 0.12
        });
        this.physics();
        return;
      }
      this.rememberInput();
      this.updateAttack(opp); this.physics(); return;
    }
    // 등장 연출 : 캐릭터별 입장 모션이 끝나면 대기 자세로
    if (this.state === 'entrance') {
      this.vx = 0;
      this.world.onEntranceFx(this, this.stateTimer);
      if (this.stateTimer >= ENTRANCE_FRAMES) this.setState('idle');
      return;
    }
    if (this.locked) { this.vx *= 0.7; this.physics(); return; }

    this.handleInput(opp);
    this.physics();
  }

  setState(s) { if (this.state !== s) { this.state = s; this.stateTimer = 0; } }

  /* ---------------- 변신 ---------------- */
  canTransform() {
    if (!this.char.form) return false;          // 변신 형태가 없는 캐릭터
    return !this.superSaiyan && this.ki >= TRANSFORM_COST && !this.airborne &&
      !this.attack && this.hitstun <= 0 && this.blockstun <= 0 &&
      this.transformTimer <= 0 && this.state !== 'ko' &&
      this.state !== 'knockdown' && this.state !== 'wakeup' && !this.locked;
  }

  doTransform() {
    this.ki -= TRANSFORM_COST;
    this.superSaiyan = true;
    this.ssTimer = TRANSFORM_TIME;
    this.transformTimer = TRANSFORM_STARTUP;
    this.invuln = TRANSFORM_STARTUP + 6;
    this.attack = null;
    this.guarding = false;
    this.vx = 0;
    this.world.onTransform(this);
  }

  updateForm() {
    if (!this.superSaiyan) return;
    if (--this.ssTimer <= 0) {
      this.superSaiyan = false;
      this.ssTimer = 0;
      this.world.particles.burst(this.x, this.y - 70, 14, {
        color: (this.form && this.form.aura) || this.char.colors.aura,
        minSpeed: 1, maxSpeed: 4, minSize: 3, maxSize: 8, gravity: 0.05
      });
    }
  }

  /** 후딜·경직 중 눌린 입력을 짧게 기억한다 (콤보 입력이 버려지지 않도록) */
  rememberInput() {
    for (const a of ['light', 'heavy', 'kick', 'up', 'blast', 'ultimate', 'transform']) {
      if (this.ctrl.pressed(a)) { this.buffered = a; this.bufferTimer = INPUT_BUFFER; return; }
    }
  }

  /** 지금 눌렸거나, 방금 버퍼에 들어온 입력 */
  inputPressed(a) {
    if (this.ctrl.pressed(a)) return true;
    if (this.bufferTimer > 0 && this.buffered === a) {
      this.buffered = null; this.bufferTimer = 0;
      return true;
    }
    return false;
  }

  /** 점프 (mult 로 도약력 조절) */
  doJump(mult) {
    const c = this.ctrl;
    this.vy = -this.char.jump * (mult || 1);
    this.airborne = true;
    const dir = (c.held('right') ? 1 : 0) + (c.held('left') ? -1 : 0);
    this.vx = dir * this.speed * 1.35;
    this.setState('jump');
  }

  handleInput(opp) {
    const c = this.ctrl;
    const back = this.facing > 0 ? 'left' : 'right';
    const fwd = this.facing > 0 ? 'right' : 'left';
    const holdDown = c.held('down');
    const holdBack = c.held(back);

    this.crouching = holdDown && !this.airborne;
    this.charging = false;

    /* 기 모으기 */
    if (!this.airborne && c.held('charge')) {
      this.charging = true;
      this.guarding = false;
      this.ki = clamp(this.ki + 0.7, 0, 100);
      this.vx *= 0.6;
      this.setState('charge');
      if (this.stateTimer % 22 === 1) Sfx.play('charge');
      this.world.particles.spawn({
        x: this.x + rand(-26, 26), y: this.y - rand(0, 110),
        vx: rand(-0.6, 0.6), vy: rand(-3.4, -1.6), life: randInt(14, 26),
        size: rand(3, 7), color: this.char.colors.aura, shape: 'shard'
      });
      return;
    }

    /* 변신 : 조건을 만족할 때만 수동으로 발동 */
    if (this.inputPressed('transform')) {
      if (this.canTransform()) { this.doTransform(); return; }
      this.world.onTransformFail(this);
    }

    /* 필살기 계열 */
    const ultMove = ultimateMoveOf(this.char), spMove = specialMoveOf(this.char);
    if (this.inputPressed('ultimate') && this.ki >= ultMove.kiCost && !this.airborne) {
      this.startAttack(ultMove); return;
    }
    if (this.inputPressed('blast') && !this.airborne) {
      if (holdDown && this.ki >= spMove.kiCost) { this.startAttack(spMove); return; }
      if (!holdDown && this.ki >= MOVES.kiBlast.kiCost) { this.startAttack(MOVES.kiBlast); return; }
    }

    /* 잡기 : 약 + 강 동시 입력 */
    const grabInput = (c.pressed('light') && c.held('heavy')) || (c.pressed('heavy') && c.held('light'));
    if (grabInput && !this.airborne) { this.startAttack(MOVES.grab); return; }

    /* 타격기 */
    if (this.airborne) {
      if (this.airAttacks < MAX_AIR_ATTACKS) {
        if (this.inputPressed('light')) { this.airAttacks++; this.startAttack(MOVES.airPunch); return; }
        if (this.inputPressed('heavy')) {
          this.airAttacks++;
          this.startAttack(holdDown ? MOVES.airSlam : MOVES.airKick);   // ↓+강 = 공중 내려찍기
          return;
        }
        if (this.inputPressed('kick')) { this.airAttacks++; this.startAttack(MOVES.airKick); return; }
      }
      // 2단 점프 : 띄운 상대를 공중에서 계속 쫓아갈 수 있다
      if (this.inputPressed('up') && this.airJumps < MAX_AIR_JUMPS) {
        this.airJumps++;
        this.doJump(0.9);
        this.world.particles.burst(this.x, this.y - 16, 10, {
          color: '#dff0ff', minSpeed: 1.5, maxSpeed: 5, minSize: 2, maxSize: 7, gravity: 0.1
        });
        return;
      }
    } else if (this.crouching) {
      if (this.inputPressed('light')) { this.startAttack(MOVES.lowKick); return; }
      if (this.inputPressed('heavy')) { this.startAttack(MOVES.uppercut); return; }
      if (this.inputPressed('kick')) { this.startAttack(MOVES.sweep); return; }
    } else {
      if (this.inputPressed('light')) { this.startAttack(MOVES.jab); return; }
      if (this.inputPressed('heavy')) { this.startAttack(MOVES.straight); return; }
      if (this.inputPressed('kick')) { this.startAttack(MOVES.roundhouse); return; }
    }

    /* 점프 */
    if (this.inputPressed('up') && !this.airborne) {
      this.doJump(1);
      return;
    }

    /* 대시 (전/후진 더블탭) */
    if (!this.airborne && this.dashCooldown === 0) {
      for (const [key, idx] of [['left', 0], ['right', 1]]) {
        if (c.pressed(key)) {
          if (this.tapTimer[idx] > 0) {
            const dir = key === 'right' ? 1 : -1;
            this.vx = dir * this.speed * 3.6;
            this.dashTimer = 12;
            this.dashCooldown = 26;
            if (dir !== this.facing) this.invuln = 8;   // 백대시 무적
            this.setState('dash');
            this.world.particles.burst(this.x, this.y - 6, 6, {
              color: '#ffffff', minSpeed: 1, maxSpeed: 3.4, minSize: 2, maxSize: 5, gravity: 0.1
            });
            this.tapTimer[idx] = 0;
            return;
          }
          this.tapTimer[idx] = 13;
        }
      }
    }

    /* 이동 / 가드 */
    this.guarding = false;
    if (this.dashTimer > 0) {
      this.dashTimer--;
      this.vx *= 0.86;
      if (this.dashTimer === 0) this.setState('idle');
      return;
    }
    if (this.airborne) { this.setState('jump'); return; }

    const wantGuard = holdBack || this.ctrl.held('guard');
    if (wantGuard) {
      this.guarding = true;
      this.vx = approach(this.vx, holdBack ? -this.facing * this.speed * 0.55 : 0, 0.9);
      this.setState(this.crouching ? 'crouchGuard' : 'guard');
      return;
    }

    let move = 0;
    if (c.held('right')) move += 1;
    if (c.held('left')) move -= 1;
    if (this.crouching) {
      this.vx = approach(this.vx, 0, 1.2);
      this.setState('crouch');
    } else if (move !== 0) {
      const sp = this.speed * (move === this.facing ? 1 : 0.72);
      this.vx = approach(this.vx, move * sp, 1.1);
      this.setState(move === this.facing ? 'walk' : 'walkBack');
    } else {
      this.vx = approach(this.vx, 0, 1.0);
      this.setState('idle');
    }
  }

  startAttack(def) {
    if (def.kiCost) {
      if (this.ki < def.kiCost) return;
      this.ki -= def.kiCost;
    }
    this.attack = { def, frame: 0, hitApplied: false, spawned: false };
    this.guarding = false;
    this.setState('attack');
    if (def.invuln) this.invuln = def.invuln;
    if (!def.air) this.vx *= 0.35;
    if (def.launcher) this.vx = this.facing * 1.2;
    if (isUltimate(def)) {
      this.world.onUltimate(this);
    }
  }

  updateAttack(opp) {
    const a = this.attack, def = a.def;
    // 힘겨루기 중에는 빔이 사라지지 않도록 마지막 지속 프레임에서 멈춘다
    if (this.struggling && a.frame >= def.startup + def.active - 1) {
      this.beamStruggleFx();
      return;
    }
    a.frame++;

    // 발사체 생성
    if (def.projectile && !a.spawned && a.frame >= def.startup) {
      a.spawned = true;
      Sfx.play(def.sfx);
      this.world.spawnProjectile(this, def);
    }
    // 빔 시작
    if (def.beam && !a.spawned && a.frame >= def.startup) {
      a.spawned = true;
      const m = motionFor(this.char, def);
      Sfx.play(def.sfx);
      // 굵은 기술일수록 화면이 크게 흔들린다
      this.world.shake((isUltimate(def) ? 14 : 7) * clamp(0.55 + m.width * 0.5, 0.6, 1.6));
      // 총구에서 앞으로 터지는 발사 섬광
      const src = skillOf(this.char, def);
      for (let i = 0; i < 16; i++) {
        this.world.particles.spawn({
          x: this.x + this.facing * m.handX, y: this.y + m.handY,
          vx: this.facing * rand(2, 11), vy: rand(-4, 4) * m.width,
          life: randInt(8, 20), size: rand(3, 10),
          color: i % 3 ? src.color : src.core, shape: 'spark'
        });
      }
    }
    // 빔 반동
    if (def.beam && a.frame >= def.startup && a.frame < def.startup + def.active) {
      this.vx = approach(this.vx, -this.facing * 0.6, 0.2);
      const bm = this.beamRect();
      const mo = motionFor(this.char, def);
      if (bm && this.stateTimer % 2 === 0) {
        this.world.particles.spawn({
          x: this.x + this.facing * mo.handX, y: this.y + mo.handY,
          vx: rand(-1, 1) + this.facing * rand(1, 4), vy: rand(-2.2, 2.2),
          life: randInt(10, 22), size: rand(4, 11),
          color: skillOf(this.char, def).color
        });
      }
    }
    // 기 모으는 연출 (필살기 발동 전)
    if ((def.beam || def.projectile) && a.frame < def.startup && a.frame % 3 === 0) {
      const cm = tierOf(def) ? motionFor(this.char, def) : null;
      const cx = this.x + this.facing * (cm ? cm.chargeX : 42);
      const cy = this.y + (cm ? cm.chargeY : -88);
      const ang = rand(0, Math.PI * 2), r = rand(40, 90);
      this.world.particles.spawn({
        x: cx + Math.cos(ang) * r,
        y: cy + Math.sin(ang) * r,
        vx: -Math.cos(ang) * 3.2, vy: -Math.sin(ang) * 3.2,
        life: 14, size: rand(3, 7),
        color: (skillOf(this.char, def) || this.char.special).color
      });
    }

    if (a.frame >= def.startup + def.active + def.recovery) {
      this.attack = null;
      this.setState(this.airborne ? 'jump' : 'idle');
    }
  }

  /** 힘겨루기 중 계속 흐르는 빔 반동/파티클 */
  beamStruggleFx() {
    const def = this.attack.def;
    // 연타 집계 : 입력 엣지가 살아 있는 이 시점에서 읽어야 한다
    const c = this.ctrl;
    if (['blast', 'ultimate', 'light', 'heavy', 'kick'].some(k => c.pressed(k))) {
      this.mash = Math.min(12, this.mash + 1);
    }
    this.mash = Math.max(0, this.mash - 0.055);
    const m = motionFor(this.char, def);
    const src = skillOf(this.char, def);
    this.vx = approach(this.vx, -this.facing * 0.5, 0.2);
    if (this.stateTimer % 2 === 0) {
      this.world.particles.spawn({
        x: this.x + this.facing * m.handX, y: this.y + m.handY,
        vx: rand(-1, 1) + this.facing * rand(1, 4), vy: rand(-2.2, 2.2),
        life: randInt(10, 22), size: rand(4, 11), color: src.color
      });
    }
  }

  physics() {
    this.x += this.vx;
    if (this.airborne || this.y < GROUND_Y) {
      this.vy += GRAVITY;
      this.y += this.vy;
      if (this.y >= GROUND_Y) {
        this.y = GROUND_Y;
        const fallSpeed = this.vy;
        this.vy = 0;
        this.airborne = false;
        this.airAttacks = 0;
        this.airJumps = 0;
        this.juggle = 0;
        const wasHurt = this.hitstun > 0 || this.state === 'hurtAir';
        if (this.state === 'ko') {
          // 그대로 눕는다
        } else if (wasHurt || this.state === 'launched') {
          this.setState('knockdown');
          this.hitstun = 0;
          this.vx *= this.hardKnockdown ? 0.15 : 0.3;
          const hard = this.hardKnockdown || fallSpeed > 13;
          this.world.shake(hard ? 12 : 5);
          this.world.particles.burst(this.x, GROUND_Y, hard ? 22 : 10, {
            color: '#d9c9a8', minSpeed: hard ? 2.5 : 1.5, maxSpeed: hard ? 9 : 5,
            gravity: 0.35, minSize: 3, maxSize: hard ? 12 : 8
          });
          if (hard) {
            // 강제 다운 : 바닥에 충격파
            this.world.particles.spawn({
              x: this.x, y: GROUND_Y - 4, life: 22, size: 26, color: '#fff2c8', shape: 'ring'
            });
          }
        } else if (this.attack) {
          // 공중기 착지 시 후딜 유지
        } else {
          this.setState('idle');
        }
      }
    }
    if (!this.airborne && this.state !== 'knockdown' && this.state !== 'ko') {
      this.vx *= 0.86;
      if (Math.abs(this.vx) < 0.05) this.vx = 0;
    } else {
      this.vx *= 0.985;
    }
    this.x = clamp(this.x, STAGE_LEFT + 40, STAGE_RIGHT - 40);
  }

  /* ---------------- 피격 ---------------- */
  canBlock(def) {
    if (!this.guarding || this.airborne || def.unblockable) return false;
    if (def.level === 'low') return this.crouching;
    if (def.level === 'high' || def.level === 'overhead') return !this.crouching;
    return true;
  }

  takeHit(attacker, def, hitPos, opts) {
    opts = opts || {};
    if (this.invuln > 0 || this.state === 'ko') return 'miss';
    const blocked = this.canBlock(def);
    const scale = comboScaling(attacker ? attacker.comboCount : 0);
    const base = (opts.damage != null ? opts.damage : def.damage) *
      (attacker ? attacker.power : 1) / this.char.defense;
    const dmg = blocked
      ? (opts.chip != null ? opts.chip : def.chip || 0)
      : base * scale;

    this.hp = Math.max(0, this.hp - dmg);
    this.ki = clamp(this.ki + (blocked ? 1.5 : 4), 0, 100);

    const dir = attacker ? (this.x >= attacker.x ? 1 : -1) : this.facing * -1;
    const push = (opts.pushback != null ? opts.pushback : def.pushback || 4) * (blocked ? 0.55 : 1);

    // 히트스톱 : 빔처럼 여러 번 때리는 기술은 0을 넘겨 멈추지 않게 한다
    const pauseOf = big => (opts.hitPause != null ? opts.hitPause : (big ? 7 : 4));

    if (blocked) {
      this.blockstun = def.blockstun || 10;
      this.vx = dir * push;
      Sfx.play('block');
      this.world.particles.burst(hitPos.x, hitPos.y, 8, {
        color: '#9fe8ff', minSpeed: 1.5, maxSpeed: 5, minSize: 2, maxSize: 6, shape: 'spark'
      });
      this.world.particles.spawn({ x: hitPos.x, y: hitPos.y, life: 14, size: 16, color: '#bff0ff', shape: 'ring' });
      const bp = opts.hitPause != null ? opts.hitPause : 3;
      this.hitPause = bp;
      if (attacker) attacker.hitPause = bp;
    } else {
      this.hitstun = def.hitstun || 14;
      this.blockstun = 0;
      this.attack = null;
      this.guarding = false;
      this.flash = 8;
      this.vx = dir * push;
      const lift = opts.lift != null ? opts.lift : (def.lift || 0);
      if (def.spike) {
        // 공중 마무리 : 그대로 바닥으로 내려찍는다
        this.vy = 16;
        this.airborne = true;
        this.hardKnockdown = true;
        this.juggle = JUGGLE_LIMIT + 1;
        this.setState('launched');
      } else if (this.airborne) {
        // 이미 떠 있는 상대는 다시 띄워 공중 콤보로 이어진다 (반복될수록 낮게)
        this.juggle++;
        if (this.juggle <= JUGGLE_LIMIT) {
          this.vy = -Math.max(3.5, 8 - this.juggle * 1.1);
        } else {
          this.vy = Math.max(this.vy, 3);      // 한계를 넘으면 더 이상 떠오르지 않는다
        }
        this.setState('launched');
        // 때린 쪽도 같이 떠 있게 해서 후속타가 닿는다
        if (attacker && attacker.airborne) attacker.vy = Math.min(attacker.vy, -3.4);
      } else if (lift < 0 || def.launcher) {
        this.vy = lift || -12;
        this.airborne = true;
        this.setState('launched');
      } else if (def.knockdown) {
        this.vy = -7;
        this.airborne = true;
        this.setState('launched');
      } else {
        this.setState('hurt');
      }
      Sfx.play(def.sfx === 'light' ? 'light' : 'heavy');
      const big = dmg > 40;
      this.world.shake(big ? 9 : 4);
      const hp2 = pauseOf(big);
      this.hitPause = hp2;
      if (attacker) attacker.hitPause = hp2;
      this.world.particles.burst(hitPos.x, hitPos.y, big ? 16 : 9, {
        color: '#fff3a8', minSpeed: 2, maxSpeed: big ? 9 : 5.5,
        minSize: 3, maxSize: big ? 11 : 7, shape: 'spark'
      });
      this.world.particles.spawn({
        x: hitPos.x, y: hitPos.y, life: 16, size: big ? 26 : 16,
        color: '#ffffff', shape: 'ring'
      });
      if (attacker) {
        attacker.comboCount++;
        attacker.comboTimer = 70;
        attacker.ki = clamp(attacker.ki + (def.kiGain || 6), 0, 100);
        // 상대를 띄웠으면 후딜을 점프로 캔슬해 공중으로 따라갈 수 있다
        if (!def.spike && (this.airborne || def.launcher)) attacker.jumpCancel = JUMP_CANCEL_FRAMES;
        this.world.onCombo(attacker, this.airborne);
      }
    }

    if (this.hp <= 0) {
      this.state = 'ko';
      this.stateTimer = 0;
      this.attack = null;
      this.vy = -11;
      this.vx = dir * 7;
      this.airborne = true;
      this.world.onKO(this);
    }
    return blocked ? 'blocked' : 'hit';
  }
}
