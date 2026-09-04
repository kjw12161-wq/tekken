/* =========================================================
 *  기술 프레임 데이터 (60FPS 기준)
 *  startup : 발동 프레임 (히트박스 나오기 전)
 *  active  : 히트박스 지속 프레임
 *  recovery: 후딜
 *  level   : 'high'(상단) 'mid'(중단) 'low'(하단) 'overhead'(중단 점프공격)
 *  box     : 앞을 바라보는 기준의 히트박스 (x는 앞쪽 +, y는 발끝 기준 위쪽이 -)
 * ========================================================= */
'use strict';

const MOVES = {
  /* ---------- 지상 기본기 ---------- */
  jab: {
    key: 'jab', label: '약 펀치', startup: 4, active: 3, recovery: 7,
    damage: 22, chip: 2, hitstun: 13, blockstun: 8, pushback: 3.4, lift: 0,
    level: 'high', kiGain: 5, box: { x: 24, y: -92, w: 48, h: 24 }, sfx: 'light'
  },
  straight: {
    key: 'straight', label: '강 펀치', startup: 9, active: 4, recovery: 16,
    damage: 52, chip: 6, hitstun: 22, blockstun: 12, pushback: 7.5, lift: -3,
    level: 'high', kiGain: 9, box: { x: 26, y: -90, w: 66, h: 28 }, sfx: 'heavy'
  },
  roundhouse: {
    key: 'roundhouse', label: '돌려차기', startup: 11, active: 5, recovery: 18,
    damage: 64, chip: 8, hitstun: 26, blockstun: 14, pushback: 9.5, lift: -6,
    level: 'mid', kiGain: 11, box: { x: 22, y: -80, w: 76, h: 32 }, sfx: 'heavy'
  },
  lowKick: {
    key: 'lowKick', label: '앉아 차기', startup: 6, active: 3, recovery: 11,
    damage: 26, chip: 3, hitstun: 14, blockstun: 9, pushback: 3.8, lift: 0,
    level: 'low', crouching: true, kiGain: 6, box: { x: 20, y: -30, w: 56, h: 24 }, sfx: 'light'
  },
  sweep: {
    key: 'sweep', label: '다리 후리기', startup: 10, active: 4, recovery: 22,
    damage: 48, chip: 5, hitstun: 30, blockstun: 13, pushback: 6, lift: -2,
    level: 'low', crouching: true, knockdown: true, kiGain: 10,
    box: { x: 18, y: -24, w: 82, h: 22 }, sfx: 'heavy'
  },
  uppercut: {
    key: 'uppercut', label: '승룡 어퍼', startup: 7, active: 6, recovery: 26,
    damage: 70, chip: 8, hitstun: 30, blockstun: 16, pushback: 5, lift: -13,
    level: 'mid', launcher: true, invuln: 8, kiGain: 14,
    box: { x: 14, y: -128, w: 54, h: 76 }, sfx: 'heavy'
  },
  /* ---------- 공중기 ---------- */
  airPunch: {
    key: 'airPunch', label: '공중 펀치', startup: 5, active: 6, recovery: 10,
    damage: 34, chip: 4, hitstun: 18, blockstun: 10, pushback: 4, lift: 0,
    level: 'overhead', air: true, kiGain: 8, box: { x: 18, y: -72, w: 58, h: 34 }, sfx: 'light'
  },
  airKick: {
    key: 'airKick', label: '공중 킥', startup: 7, active: 8, recovery: 12,
    damage: 56, chip: 6, hitstun: 24, blockstun: 13, pushback: 6, lift: 0,
    level: 'overhead', air: true, knockdown: true, kiGain: 10,
    box: { x: 16, y: -56, w: 70, h: 40 }, sfx: 'heavy'
  },
  /* ---------- 필살기 ---------- */
  kiBlast: {
    key: 'kiBlast', label: '기탄', startup: 12, active: 1, recovery: 20,
    kiCost: 15, kiGain: 0, projectile: { speed: 11, radius: 15, damage: 44, chip: 8, hitstun: 22, pushback: 8, life: 150 },
    level: 'mid', sfx: 'blast'
  },
  beam: {
    key: 'beam', label: '필살기', startup: 20, active: 26, recovery: 30,
    kiCost: 40, kiGain: 0, beam: { height: 46, damage: 12, hitEvery: 6, chip: 3, pushback: 2.4, reach: 620 },
    level: 'mid', sfx: 'beam'
  },
  ultimate: {
    key: 'ultimate', label: '초필살기', startup: 34, active: 44, recovery: 40,
    kiCost: 100, kiGain: 0, beam: { height: 108, damage: 20, hitEvery: 5, chip: 6, pushback: 3.2, reach: 900 },
    level: 'mid', invuln: 34, sfx: 'ultimate'
  },
  /* ---------- 잡기 ---------- */
  grab: {
    key: 'grab', label: '잡기', startup: 6, active: 3, recovery: 20,
    damage: 88, chip: 0, hitstun: 40, blockstun: 0, pushback: 12, lift: -8,
    level: 'grab', unblockable: true, knockdown: true, kiGain: 12,
    box: { x: 16, y: -96, w: 46, h: 72 }, sfx: 'heavy'
  }
};

/* 콤보 보정: 히트 수가 늘어날수록 데미지 감소 */
function comboScaling(hits) {
  if (hits <= 1) return 1;
  return Math.max(0.28, 1 - (hits - 1) * 0.12);
}
