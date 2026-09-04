/* =========================================================
 *  컨트롤러 : 사람(키보드/터치) & CPU AI
 * ========================================================= */
'use strict';

class HumanController {
  constructor(playerIndex) { this.p = playerIndex; this.isAI = false; }
  held(a) { return Input.held(this.p, a); }
  pressed(a) { return Input.pressed(this.p, a); }
  think() {}
  endFrame() {}
}

const AI_LEVELS = {
  easy: { react: 16, aggression: 0.35, block: 0.35, special: 0.25, antiAir: 0.3, decide: 26, dash: 0.1 },
  normal: { react: 9, aggression: 0.58, block: 0.62, special: 0.5, antiAir: 0.6, decide: 16, dash: 0.3 },
  hard: { react: 4, aggression: 0.8, block: 0.85, special: 0.75, antiAir: 0.85, decide: 10, dash: 0.55 },
  zenkai: { react: 2, aggression: 0.92, block: 0.95, special: 0.9, antiAir: 0.95, decide: 7, dash: 0.75 }
};

class AIController {
  constructor(level) {
    this.isAI = true;
    this.setLevel(level || 'normal');
    this.hold = new Set();
    this.press = new Set();
    this.plan = null;
    this.planTimer = 0;
    this.reactTimer = 0;
    this.memory = { oppAttackSeen: false };
  }

  setLevel(level) { this.levelName = level; this.cfg = AI_LEVELS[level] || AI_LEVELS.normal; }

  held(a) { return this.hold.has(a); }
  pressed(a) { return this.press.has(a); }
  endFrame() { this.press.clear(); }

  _tap(a) { this.press.add(a); this.hold.add(a); }

  think(self, opp) {
    this.hold.clear();
    this.press.clear();
    if (self.locked || !self.alive || !opp.alive) return;

    const cfg = this.cfg;
    const dist = Math.abs(opp.x - self.x);
    const dirToOpp = opp.x > self.x ? 'right' : 'left';
    const away = dirToOpp === 'right' ? 'left' : 'right';
    const hpRatio = self.hp / self.maxHp;

    if (this.reactTimer > 0) this.reactTimer--;

    /* --- 반응 행동 (계획보다 우선) --- */
    // 1) 상대 필살기/빔 → 가드
    const oppAtk = opp.attack;
    if (oppAtk && this.reactTimer <= 0) {
      const threat = oppAtk.def.beam || oppAtk.def.projectile;
      const near = dist < 200;
      if ((threat || near) && Math.random() < cfg.block) {
        this.hold.add(away);
        if (oppAtk.def.level === 'low') this.hold.add('down');
        this.reactTimer = 0;
        return;
      }
    }
    // 2) 날아오는 기탄 방어 / 회피
    const inbound = this.world && this.world.projectiles
      ? this.world.projectiles.find(p => p.owner !== self &&
        Math.sign(p.vx) === (self.x > p.x ? 1 : -1) && Math.abs(p.x - self.x) < 340)
      : null;
    if (inbound && Math.random() < cfg.block) {
      if (Math.random() < 0.3 && dist > 260) { this._tap('up'); }
      else this.hold.add(away);
      return;
    }
    // 3) 공중 콤보 추격 : 내가 띄운 상대(상승 중)를 쫓아 올라간다
    if (opp.airborne && opp.y < GROUND_Y - 24 && dist < 170 && opp.vy < 2 && Math.random() < cfg.antiAir) {
      if (!self.airborne) {
        this.hold.add(dirToOpp);
        this._tap('up');                       // 점프(공격 후딜이면 점프 캔슬로 이어진다)
      } else if (self.y > opp.y - 30) {
        this._tap('up');                       // 2단 점프로 더 높이
      } else {
        const r = Math.random();
        if (r < 0.45) this._tap('light');
        else if (r < 0.8) this._tap('heavy');
        else { this.hold.add('down'); this._tap('heavy'); }   // 공중 내려찍기 마무리
      }
      return;
    }
    // 4) 대공 : 뛰어드는 상대는 승룡 어퍼로 받아친다
    if (opp.airborne && dist < 130 && opp.vy >= 0 && !self.airborne && Math.random() < cfg.antiAir) {
      this.hold.add('down'); this._tap('heavy');
      return;
    }
    // 5) 초필살기 마무리
    if (self.ki >= 100 && dist < 520 && !self.airborne && Math.random() < cfg.special * 0.5) {
      this._tap('ultimate');
      return;
    }

    /* --- 계획 수립 --- */
    if (this.planTimer <= 0 || !this.plan) {
      this.plan = this.choosePlan(self, opp, dist, hpRatio);
      this.planTimer = randInt(cfg.decide, cfg.decide * 2);
    }
    this.planTimer--;

    switch (this.plan) {
      case 'approach':
        this.hold.add(dirToOpp);
        if (Math.random() < cfg.dash * 0.08) this._tap(dirToOpp);
        break;
      case 'retreat':
        this.hold.add(away);
        break;
      case 'charge':
        this.hold.add('charge');
        break;
      case 'blastZone':
        if (self.ki >= MOVES.kiBlast.kiCost && Math.random() < 0.25) this._tap('blast');
        else this.hold.add(away);
        break;
      case 'beam':
        this.hold.add('down');
        if (self.ki >= MOVES.beam.kiCost) this._tap('blast');
        break;
      case 'jumpIn':
        if (!self.airborne) { this.hold.add(dirToOpp); this._tap('up'); }
        else if (dist < 120) this._tap('heavy');
        break;
      case 'pressure': {
        const r = Math.random();
        if (dist > 105) this.hold.add(dirToOpp);
        else if (r < 0.28) this._tap('light');
        else if (r < 0.5) this._tap('heavy');
        else if (r < 0.68) this._tap('kick');
        else if (r < 0.78) { this.hold.add('down'); this._tap('kick'); }
        else if (r < 0.86) { this.hold.add('down'); this._tap('light'); }
        else if (r < 0.92) { this._tap('light'); this.hold.add('heavy'); }  // 잡기
        else this.hold.add(away);
        break;
      }
      case 'guard':
        this.hold.add(away);
        if (Math.random() < 0.3) this.hold.add('down');
        break;
    }
  }

  choosePlan(self, opp, dist, hpRatio) {
    const cfg = this.cfg;
    const r = Math.random();
    if (dist > 420) {
      if (self.ki < 30 && r < 0.4) return 'charge';
      if (self.ki >= MOVES.beam.kiCost && r < 0.25 * cfg.special + 0.1) return 'beam';
      if (self.ki >= MOVES.kiBlast.kiCost && r < 0.55) return 'blastZone';
      return 'approach';
    }
    if (dist > 200) {
      if (r < cfg.aggression * 0.45) return 'jumpIn';
      if (self.ki >= MOVES.kiBlast.kiCost && r < 0.55) return 'blastZone';
      if (hpRatio < 0.3 && r < 0.35) return 'charge';
      return 'approach';
    }
    if (r < cfg.aggression) return 'pressure';
    if (r < cfg.aggression + 0.18) return 'guard';
    return dist < 90 ? 'retreat' : 'approach';
  }
}
