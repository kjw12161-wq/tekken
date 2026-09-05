/* =========================================================
 *  기술 프레임 데이터 (60FPS 기준)
 *  startup : 발동 프레임 (히트박스 나오기 전)
 *  active  : 히트박스 지속 프레임
 *  recovery: 후딜
 *  level   : 'high'(상단) 'mid'(중단) 'low'(하단) 'overhead'(중단 점프공격)
 *  box     : 앞을 바라보는 기준의 히트박스 (x는 앞쪽 +, y는 발끝 기준 위쪽이 -)
 * ========================================================= */
'use strict';

/** 필살기(빔)가 힘겨루기까지 포함해 화면에 머무는 최대 시간 = 5초 */
const SPECIAL_MAX_FRAMES = 300;

const MOVES = {
  /* ---------- 지상 기본기 ---------- */
  jab: {
    key: 'jab', label: '약 펀치', startup: 4, active: 3, recovery: 7,
    damage: 22, chip: 2, hitstun: 13, blockstun: 8, pushback: 3.4, lift: 0,
    level: 'high', kiGain: 5, box: { x: 26, y: -110, w: 50, h: 26 }, sfx: 'light'
  },
  straight: {
    key: 'straight', label: '강 펀치', startup: 9, active: 4, recovery: 16,
    damage: 52, chip: 6, hitstun: 22, blockstun: 12, pushback: 7.5, lift: -3,
    level: 'high', kiGain: 9, box: { x: 28, y: -108, w: 68, h: 30 }, sfx: 'heavy'
  },
  roundhouse: {
    key: 'roundhouse', label: '돌려차기', startup: 11, active: 5, recovery: 18,
    damage: 64, chip: 8, hitstun: 26, blockstun: 14, pushback: 9.5, lift: -6,
    level: 'mid', kiGain: 11, box: { x: 24, y: -96, w: 78, h: 34 }, sfx: 'heavy'
  },
  lowKick: {
    key: 'lowKick', label: '앉아 차기', startup: 6, active: 3, recovery: 11,
    damage: 26, chip: 3, hitstun: 14, blockstun: 9, pushback: 3.8, lift: 0,
    level: 'low', crouching: true, kiGain: 6, box: { x: 22, y: -34, w: 58, h: 26 }, sfx: 'light'
  },
  sweep: {
    key: 'sweep', label: '다리 후리기', startup: 10, active: 4, recovery: 22,
    damage: 48, chip: 5, hitstun: 30, blockstun: 13, pushback: 6, lift: -2,
    level: 'low', crouching: true, knockdown: true, kiGain: 10,
    box: { x: 20, y: -26, w: 84, h: 24 }, sfx: 'heavy'
  },
  uppercut: {
    key: 'uppercut', label: '승룡 어퍼', startup: 7, active: 6, recovery: 26,
    damage: 70, chip: 8, hitstun: 34, blockstun: 16, pushback: 4, lift: -15,
    level: 'mid', launcher: true, invuln: 8, kiGain: 14,
    box: { x: 14, y: -152, w: 56, h: 84 }, sfx: 'heavy'
  },
  /* ---------- 공중기 ---------- */
  airPunch: {
    key: 'airPunch', label: '공중 펀치', startup: 5, active: 6, recovery: 8,
    damage: 34, chip: 4, hitstun: 18, blockstun: 10, pushback: 4, lift: 0,
    level: 'overhead', air: true, kiGain: 8, box: { x: 20, y: -92, w: 60, h: 36 }, sfx: 'light'
  },
  airSlam: {
    key: 'airSlam', label: '공중 내려찍기', startup: 9, active: 10, recovery: 18,
    damage: 78, chip: 9, hitstun: 30, blockstun: 15, pushback: 4, lift: 0,
    level: 'overhead', air: true, spike: true, kiGain: 14,
    box: { x: 8, y: -46, w: 64, h: 66 }, sfx: 'heavy'
  },
  airKick: {
    key: 'airKick', label: '공중 킥', startup: 7, active: 8, recovery: 10,
    damage: 56, chip: 6, hitstun: 24, blockstun: 13, pushback: 6, lift: 0,
    level: 'overhead', air: true, knockdown: true, kiGain: 10,
    box: { x: 18, y: -66, w: 72, h: 42 }, sfx: 'heavy'
  },
  /* ---------- 필살기 ---------- */
  kiBlast: {
    key: 'kiBlast', label: '기탄', startup: 12, active: 1, recovery: 20,
    kiCost: 15, kiGain: 0, projectile: { speed: 11, radius: 15, damage: 44, chip: 8, hitstun: 22, pushback: 8, life: 150 },
    level: 'mid', sfx: 'blast'
  },
  beam: {
    key: 'beam', label: '필살기', startup: 20, active: 20, recovery: 30,
    kiCost: 40, kiGain: 0, beam: { height: 46, damage: 30, hitEvery: 4, chip: 5, pushback: 2.4, reach: 620 },
    level: 'mid', sfx: 'beam'
  },
  ultimate: {
    key: 'ultimate', label: '초필살기', startup: 34, active: 34, recovery: 40,
    kiCost: 100, kiGain: 0, beam: { height: 108, damage: 36, hitEvery: 4, chip: 6, pushback: 3.2, reach: 900 },
    level: 'mid', invuln: 34, sfx: 'ultimate'
  },
  /* ---------- 잡기 ---------- */
  grab: {
    key: 'grab', label: '잡기', startup: 6, active: 3, recovery: 20,
    damage: 88, chip: 0, hitstun: 40, blockstun: 0, pushback: 12, lift: -8,
    level: 'grab', unblockable: true, knockdown: true, kiGain: 12,
    box: { x: 18, y: -112, w: 48, h: 76 }, sfx: 'heavy'
  }
};

/* =========================================================
 *  필살기 모션 정의
 *  만화 원작의 대표 자세를 캐릭터별로 다르게 재현한다.
 *   handX/handY : 빔이 실제로 나가는 손(총구) 위치
 *   oy          : 판정 사각형의 세로 중심 (총구와 달라도 된다 → 빔이 기울어진다)
 *   width       : 빔 두께 배율
 *   style       : 'beam' 기본 / 'thin' 관통 / 'wide' 광역 / 'spiral' 나선 / 'orb' 구체
 *   chargeX/Y/R : 기를 모으는 위치와 크기, twin 이면 좌우 양손에 하나씩
 * ========================================================= */
const SPECIAL_MOTION = {
  // 에네르기파 : 허리 뒤에 모아 두 손을 앞으로 내민다
  cupped: {
    handX: 46, handY: -92, oy: -92, width: 1.00, style: 'beam', rings: true,
    chargeX: -32, chargeY: -84, chargeR: 15
  },
  // 갤릭포 : 옆구리에 모은 한 손을 정면으로 뻗는다
  onehand: {
    handX: 54, handY: -96, oy: -96, width: 0.84, style: 'spiral', rings: true,
    chargeX: -11, chargeY: -83, chargeR: 13
  },
  // 마관광살포 : 이마에 두 손가락, 가늘고 관통하는 빔
  fingers: {
    handX: 27, handY: -124, oy: -100, width: 0.40, style: 'thin', pierce: true,
    chargeX: 16, chargeY: -126, chargeR: 9
  },
  // 마섬광 : 머리 위에서 손목을 교차해 아래로 뿜는다
  overhead: {
    handX: 30, handY: -140, oy: -108, width: 0.92, style: 'beam', rings: true,
    chargeX: 8, chargeY: -152, chargeR: 16
  },
  // 파이널 플래시 : 양팔을 벌려 모았다가 정면으로 합친다
  flash: {
    handX: 50, handY: -98, oy: -98, width: 1.45, style: 'wide', rings: true, sparks: true,
    chargeX: 38, chargeY: -72, chargeR: 17, twin: true
  },
  // 초 폭렬마파 : 두 손으로 밀어내는 광역 충격파
  wave: {
    handX: 44, handY: -96, oy: -96, width: 1.60, style: 'wide', rings: true, sparks: true,
    chargeX: -20, chargeY: -120, chargeR: 18
  },
  // 데스 빔 : 손가락 하나로 쏘는 바늘 같은 빔
  point: {
    handX: 58, handY: -104, oy: -104, width: 0.28, style: 'thin', pierce: true,
    chargeX: 36, chargeY: -104, chargeR: 7
  },
  // 데스 볼 / 히트 돔 : 머리 위 구슬에서 내려꽂는다
  orb: {
    handX: 28, handY: -162, oy: -112, width: 1.22, style: 'orb', rings: true,
    chargeX: 10, chargeY: -170, chargeR: 22
  },
  // 버닝 어택 : 손을 교차해 감았다가 양손을 앞으로
  weave: {
    handX: 48, handY: -96, oy: -96, width: 0.98, style: 'spiral', rings: true, sparks: true,
    chargeX: 8, chargeY: -100, chargeR: 14
  }
};

/** 캐릭터 + 기술로 필살기 모션을 찾는다 */
function motionFor(char, def) {
  const src = def === MOVES.ultimate ? char.ultimate : char.special;
  return SPECIAL_MOTION[src && src.motion] || SPECIAL_MOTION.cupped;
}

/* 콤보 보정: 히트 수가 늘어날수록 데미지 감소 */
function comboScaling(hits) {
  if (hits <= 1) return 1;
  return Math.max(0.28, 1 - (hits - 1) * 0.12);
}
