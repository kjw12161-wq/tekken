/* =========================================================
 *  Fighter : 캐릭터 상태머신 / 물리 / 판정
 * ========================================================= */
'use strict';

const GRAVITY = 0.86;
const GROUND_Y = 470;          // 발이 닿는 y 좌표
const STAGE_LEFT = 0;
const STAGE_RIGHT = 1760;      // 월드 폭
const PUSH_RADIUS = 54;        // 캐릭터끼리 밀어내는 반경 (넓은 스탠스에 맞춤)

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
    this.airActionUsed = false;
  }

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
    return { x: this.x + b.x, y: this.y + b.y, w: b.w, h: b.h };
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

  beamRect() {
    if (!this.attack || !this.attack.def.beam) return null;
    const def = this.attack.def, f = this.attack.frame;
    if (f < def.startup || f >= def.startup + def.active) return null;
    const bm = def.beam;
    const grow = clamp(0.42 + (f - def.startup) / 6, 0, 1);
    const h = bm.height * grow;
    const originX = this.x + this.facing * 42;
    const originY = this.y - 88;
    const x = this.facing > 0 ? originX : originX - bm.reach;
    return { x, y: originY - h / 2, w: bm.reach, h, grow };
  }

  /* ---------------- 갱신 ---------------- */
  update(opp) {
    if (this.hitPause > 0) { this.hitPause--; return; }

    this.stateTimer++;
    if (this.invuln > 0) this.invuln--;
    if (this.flash > 0) this.flash--;
    if (this.dashCooldown > 0) this.dashCooldown--;
    if (this.comboTimer > 0) { this.comboTimer--; if (this.comboTimer === 0) this.comboCount = 0; }
    for (let i = 0; i < 2; i++) if (this.tapTimer[i] > 0) this.tapTimer[i]--;

    if (this.state === 'ko') { this.physics(); return; }

    // 상대 방향 바라보기
    if (!this.attack && !this.airborne && this.hitstun <= 0 && this.state !== 'knockdown') {
      this.facing = opp.x >= this.x ? 1 : -1;
    }

    if (this.hitstun > 0) {
      this.hitstun--;
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
      if (this.stateTimer > 42 && !this.airborne) { this.setState('wakeup'); this.invuln = 14; }
      return;
    }
    if (this.state === 'wakeup') {
      this.physics();
      if (this.stateTimer > 14) this.setState('idle');
      return;
    }

    if (this.attack) { this.updateAttack(opp); this.physics(); return; }
    if (this.locked) { this.vx *= 0.7; this.physics(); return; }

    this.handleInput(opp);
    this.physics();
  }

  setState(s) { if (this.state !== s) { this.state = s; this.stateTimer = 0; } }

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

    /* 필살기 계열 */
    if (c.pressed('ultimate') && this.ki >= MOVES.ultimate.kiCost && !this.airborne) {
      this.startAttack(MOVES.ultimate); return;
    }
    if (c.pressed('blast') && !this.airborne) {
      if (holdDown && this.ki >= MOVES.beam.kiCost) { this.startAttack(MOVES.beam); return; }
      if (!holdDown && this.ki >= MOVES.kiBlast.kiCost) { this.startAttack(MOVES.kiBlast); return; }
    }

    /* 잡기 : 약 + 강 동시 입력 */
    const grabInput = (c.pressed('light') && c.held('heavy')) || (c.pressed('heavy') && c.held('light'));
    if (grabInput && !this.airborne) { this.startAttack(MOVES.grab); return; }

    /* 타격기 */
    if (this.airborne) {
      if (c.pressed('light')) { this.startAttack(MOVES.airPunch); return; }
      if (c.pressed('heavy') || c.pressed('kick')) { this.startAttack(MOVES.airKick); return; }
    } else if (this.crouching) {
      if (c.pressed('light')) { this.startAttack(MOVES.lowKick); return; }
      if (c.pressed('heavy')) { this.startAttack(MOVES.uppercut); return; }
      if (c.pressed('kick')) { this.startAttack(MOVES.sweep); return; }
    } else {
      if (c.pressed('light')) { this.startAttack(MOVES.jab); return; }
      if (c.pressed('heavy')) { this.startAttack(MOVES.straight); return; }
      if (c.pressed('kick')) { this.startAttack(MOVES.roundhouse); return; }
    }

    /* 점프 */
    if (c.pressed('up') && !this.airborne) {
      this.vy = -this.char.jump;
      this.airborne = true;
      this.airActionUsed = false;
      const dir = (c.held('right') ? 1 : 0) + (c.held('left') ? -1 : 0);
      this.vx = dir * this.char.speed * 1.35;
      this.setState('jump');
      return;
    }

    /* 대시 (전/후진 더블탭) */
    if (!this.airborne && this.dashCooldown === 0) {
      for (const [key, idx] of [['left', 0], ['right', 1]]) {
        if (c.pressed(key)) {
          if (this.tapTimer[idx] > 0) {
            const dir = key === 'right' ? 1 : -1;
            this.vx = dir * this.char.speed * 3.6;
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
      this.vx = approach(this.vx, holdBack ? -this.facing * this.char.speed * 0.55 : 0, 0.9);
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
      const sp = this.char.speed * (move === this.facing ? 1 : 0.72);
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
    this.attack = { def, frame: 0, hitApplied: false, hitTimer: 0, spawned: false };
    this.guarding = false;
    this.setState('attack');
    if (def.invuln) this.invuln = def.invuln;
    if (!def.air) this.vx *= 0.35;
    if (def.launcher) this.vx = this.facing * 1.2;
    if (def === MOVES.ultimate) {
      this.world.onUltimate(this);
    }
  }

  updateAttack(opp) {
    const a = this.attack, def = a.def;
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
      Sfx.play(def.sfx);
      this.world.shake(def === MOVES.ultimate ? 14 : 7);
    }
    // 빔 반동
    if (def.beam && a.frame >= def.startup && a.frame < def.startup + def.active) {
      this.vx = approach(this.vx, -this.facing * 0.6, 0.2);
      const bm = this.beamRect();
      if (bm && this.stateTimer % 2 === 0) {
        this.world.particles.spawn({
          x: this.x + this.facing * 46, y: this.y - 88,
          vx: rand(-1, 1) + this.facing * rand(1, 4), vy: rand(-2.2, 2.2),
          life: randInt(10, 22), size: rand(4, 11),
          color: def === MOVES.ultimate ? this.char.ultimate.color : this.char.special.color
        });
      }
    }
    // 기 모으는 연출 (필살기 발동 전)
    if ((def.beam || def.projectile) && a.frame < def.startup && a.frame % 3 === 0) {
      const ang = rand(0, Math.PI * 2), r = rand(40, 90);
      this.world.particles.spawn({
        x: this.x + this.facing * 42 + Math.cos(ang) * r,
        y: this.y - 88 + Math.sin(ang) * r,
        vx: -Math.cos(ang) * 3.2, vy: -Math.sin(ang) * 3.2,
        life: 14, size: rand(3, 7),
        color: def === MOVES.ultimate ? this.char.ultimate.color : this.char.special.color
      });
    }

    if (a.frame >= def.startup + def.active + def.recovery) {
      this.attack = null;
      this.setState(this.airborne ? 'jump' : 'idle');
    }
  }

  physics() {
    this.x += this.vx;
    if (this.airborne || this.y < GROUND_Y) {
      this.vy += GRAVITY;
      this.y += this.vy;
      if (this.y >= GROUND_Y) {
        this.y = GROUND_Y;
        this.vy = 0;
        this.airborne = false;
        const wasHurt = this.hitstun > 0 || this.state === 'hurtAir';
        if (this.state === 'ko') {
          // 그대로 눕는다
        } else if (wasHurt || this.state === 'launched') {
          this.setState('knockdown');
          this.hitstun = 0;
          this.vx *= 0.3;
          this.world.shake(5);
          this.world.particles.burst(this.x, GROUND_Y, 10, {
            color: '#d9c9a8', minSpeed: 1.5, maxSpeed: 5, gravity: 0.35, minSize: 3, maxSize: 8
          });
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
      (attacker ? attacker.char.power : 1) / this.char.defense;
    const dmg = blocked
      ? (opts.chip != null ? opts.chip : def.chip || 0)
      : base * scale;

    this.hp = Math.max(0, this.hp - dmg);
    this.ki = clamp(this.ki + (blocked ? 1.5 : 4), 0, 100);

    const dir = attacker ? (this.x >= attacker.x ? 1 : -1) : this.facing * -1;
    const push = (opts.pushback != null ? opts.pushback : def.pushback || 4) * (blocked ? 0.55 : 1);

    if (blocked) {
      this.blockstun = def.blockstun || 10;
      this.vx = dir * push;
      Sfx.play('block');
      this.world.particles.burst(hitPos.x, hitPos.y, 8, {
        color: '#9fe8ff', minSpeed: 1.5, maxSpeed: 5, minSize: 2, maxSize: 6, shape: 'spark'
      });
      this.world.particles.spawn({ x: hitPos.x, y: hitPos.y, life: 14, size: 16, color: '#bff0ff', shape: 'ring' });
      this.hitPause = 3;
      if (attacker) attacker.hitPause = 3;
    } else {
      this.hitstun = def.hitstun || 14;
      this.blockstun = 0;
      this.attack = null;
      this.guarding = false;
      this.flash = 8;
      this.vx = dir * push;
      const lift = opts.lift != null ? opts.lift : (def.lift || 0);
      if (lift < 0 || def.launcher) {
        this.vy = lift || -12;
        this.airborne = true;
        this.setState('launched');
      } else if (def.knockdown) {
        this.vy = -7;
        this.airborne = true;
        this.setState('launched');
      } else {
        this.setState(this.airborne ? 'hurtAir' : 'hurt');
      }
      Sfx.play(def.sfx === 'light' ? 'light' : 'heavy');
      const big = dmg > 40;
      this.world.shake(big ? 9 : 4);
      this.hitPause = big ? 7 : 4;
      if (attacker) attacker.hitPause = big ? 7 : 4;
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
        this.world.onCombo(attacker);
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
