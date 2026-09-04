/* =========================================================
 *  Renderer : 스테이지 / 캐릭터(절차적 작화) / 이펙트
 *  이미지 리소스 없이 캔버스 도형만으로 그린다.
 * ========================================================= */
'use strict';

/* ---------------- 기본 도형 헬퍼 ---------------- */
function capsule(ctx, x1, y1, x2, y2, w, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}
function limb(ctx, a, b, c, w, color) {
  capsule(ctx, a[0], a[1], b[0], b[1], w, color);
  capsule(ctx, b[0], b[1], c[0], c[1], w * 0.86, color);
}
function poly(ctx, pts, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
  ctx.fill();
}
const P = (x, y) => [x, y];
const mix = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];

/* ---------------- 포즈 정의 ----------------
 *  격투 게임 스프라이트 체형 : 어깨가 넓고 허리가 좁은 근육질,
 *  팔꿈치는 몸 바깥으로 / 다리는 크게 벌린 파워 스탠스.
 *  => 팔다리가 몸통 실루엣과 겹치지 않아 형태가 한눈에 읽힌다.
 *  발끝이 원점(0,0), +x 가 바라보는 방향.
 *  주요 높이 - 골반 -62 / 어깨 -100 / 머리 중심 -122 (반지름 17)
 * ------------------------------------------- */
function basePose() {
  return {
    hip: P(0, -62), chest: P(2, -100), head: P(4, -122),
    shoulderF: P(15, -98), shoulderB: P(-13, -98),
    armF: [P(25, -85), P(31, -103)], armB: [P(-23, -85), P(-27, -102)],
    legF: [P(18, -33), P(24, 0)], legB: [P(-17, -33), P(-23, 0)],
    tilt: 0, headTilt: 0, scaleY: 1
  };
}

/* ---------------- 필살기 자세 ----------------
 *  moves.js 의 SPECIAL_MOTION 과 짝을 이룬다.
 *  (p, charging, g, gs) : g = 기 모으기 진행도 0~1, gs = 양자화된 단계
 * ------------------------------------------- */
const MOTION_POSE = {
  // 에네르기파 - 허리 뒤에 두 손을 겹쳐 모았다가 정면으로
  cupped(p, charging, g) {
    if (charging) {
      p.armF = [mix(P(25, -86), P(-16, -86), g), mix(P(31, -103), P(-32, -82), g)];
      p.armB = [mix(P(-23, -86), P(-26, -90), g), mix(P(-27, -102), P(-38, -84), g)];
      p.chest = mix(p.chest, P(-8, -99), g);
      p.head = mix(p.head, P(-4, -121), g);
      p.hip = mix(p.hip, P(-4, -61), g);
      p.legF = [P(22, -34), P(30, 0)];
      p.legB = [P(-20, -34), P(-30, 0)];
    } else {
      p.armF = [P(28, -92), P(50, -90)];
      p.armB = [P(18, -95), P(46, -95)];
      p.chest = P(10, -100); p.head = P(10, -122); p.hip = P(3, -62);
      p.legF = [P(24, -34), P(34, 0)];
      p.legB = [P(-20, -34), P(-30, 0)];
    }
  },
  // 갤릭포 - 옆구리에 모은 한 손, 다른 손은 손목을 받친다
  onehand(p, charging, g) {
    if (charging) {
      p.armF = [mix(P(25, -86), P(12, -80), g), mix(P(31, -103), P(-9, -84), g)];
      p.armB = [mix(P(-23, -86), P(-19, -84), g), mix(P(-27, -102), P(-16, -88), g)];
      p.chest = mix(p.chest, P(-6, -100), g);
      p.head = mix(p.head, P(-2, -122), g * 0.8);
      p.hip = mix(p.hip, P(-3, -61), g);
      p.legF = [P(21, -34), P(29, 0)];
      p.legB = [P(-21, -34), P(-31, 0)];
    } else {
      p.armF = [P(30, -92), P(54, -95)];
      p.armB = [P(6, -92), P(32, -90)];
      p.chest = P(9, -100); p.head = P(9, -122); p.hip = P(4, -62);
      p.legF = [P(25, -34), P(35, 0)];
      p.legB = [P(-19, -34), P(-29, 0)];
    }
  },
  // 마관광살포 - 이마에 두 손가락, 반대 손으로 팔꿈치를 받친다
  fingers(p, charging, g) {
    if (charging) {
      p.armF = [mix(P(25, -86), P(24, -100), g), mix(P(31, -103), P(14, -126), g)];
      p.armB = [mix(P(-23, -86), P(-18, -92), g), mix(P(-27, -102), P(16, -101), g)];
      p.chest = mix(p.chest, P(2, -101), g);
      p.head = mix(p.head, P(5, -123), g);
      p.legF = [P(18, -34), P(25, 0)];
      p.legB = [P(-18, -34), P(-26, 0)];
    } else {
      // 손가락은 이마에 붙인 채, 반대 손으로 팔꿈치를 단단히 받친다
      p.armF = [P(27, -114), P(23, -125)];
      p.armB = [P(-13, -96), P(15, -107)];
      p.chest = P(5, -102); p.head = P(8, -124); p.hip = P(2, -62);
      p.legF = [P(24, -34), P(34, 0)];
      p.legB = [P(-21, -34), P(-32, 0)];
    }
  },
  // 마섬광 - 머리 위에서 손목을 교차했다가 앞으로 밀어낸다
  overhead(p, charging, g) {
    if (charging) {
      p.armF = [mix(P(25, -86), P(18, -122), g), mix(P(31, -103), P(9, -151), g)];
      p.armB = [mix(P(-23, -86), P(-13, -122), g), mix(P(-27, -102), P(1, -149), g)];
      p.chest = mix(p.chest, P(-2, -102), g);
      p.head = mix(p.head, P(1, -124), g);
      p.legF = [P(19, -34), P(27, 0)];
      p.legB = [P(-19, -34), P(-28, 0)];
    } else {
      p.armF = [P(24, -126), P(33, -141)];
      p.armB = [P(3, -124), P(26, -138)];
      p.chest = P(8, -101); p.head = P(8, -123); p.hip = P(3, -62);
      p.legF = [P(25, -34), P(35, 0)];
      p.legB = [P(-19, -34), P(-29, 0)];
    }
  },
  // 파이널 플래시 - 양팔을 크게 벌려 모았다가 정면으로 합친다
  flash(p, charging, g) {
    if (charging) {
      p.armF = [mix(P(25, -86), P(27, -84), g), mix(P(31, -103), P(41, -70), g)];
      p.armB = [mix(P(-23, -86), P(-27, -84), g), mix(P(-27, -102), P(-41, -70), g)];
      p.chest = mix(p.chest, P(0, -102), g);
      p.head = mix(p.head, P(2, -124), g);
      p.legF = [mix(P(18, -33), P(27, -32), g), mix(P(24, 0), P(39, 0), g)];
      p.legB = [mix(P(-17, -33), P(-27, -32), g), mix(P(-23, 0), P(-39, 0), g)];
    } else {
      p.armF = [P(29, -95), P(53, -95)];
      p.armB = [P(15, -99), P(49, -101)];
      p.chest = P(9, -100); p.head = P(9, -122); p.hip = P(4, -62);
      p.legF = [P(26, -34), P(37, 0)];
      p.legB = [P(-21, -34), P(-33, 0)];
    }
  },
  // 초 폭렬마파 - 팔을 높이 들어 모았다가 두 손으로 밀어낸다
  wave(p, charging, g) {
    if (charging) {
      p.armF = [mix(P(25, -86), P(-5, -111), g), mix(P(31, -103), P(-20, -121), g)];
      p.armB = [mix(P(-23, -86), P(-22, -91), g), mix(P(-27, -102), P(-8, -101), g)];
      p.chest = mix(p.chest, P(-9, -100), g);
      p.head = mix(p.head, P(-6, -122), g);
      p.hip = mix(p.hip, P(-4, -61), g);
      p.legF = [P(22, -34), P(31, 0)];
      p.legB = [P(-20, -34), P(-31, 0)];
    } else {
      p.armF = [P(26, -90), P(46, -87)];
      p.armB = [P(12, -100), P(43, -104)];
      p.chest = P(11, -99); p.head = P(10, -121); p.hip = P(5, -62);
      p.legF = [P(26, -34), P(37, 0)];
      p.legB = [P(-20, -34), P(-31, 0)];
    }
  },
  // 데스 빔 - 손가락 하나만 세운 여유로운 자세
  point(p, charging, g) {
    p.armB = [mix(P(-23, -86), P(-21, -80), g), mix(P(-27, -102), P(-13, -67), g)];
    if (charging) {
      p.armF = [mix(P(25, -86), P(24, -92), g), mix(P(31, -103), P(34, -105), g)];
      p.chest = mix(p.chest, P(1, -101), g);
      p.head = mix(p.head, P(4, -123), g);
    } else {
      p.armF = [P(34, -104), P(59, -104)];
      p.chest = P(4, -100); p.head = P(6, -122);
    }
    p.legF = [P(17, -34), P(23, 0)];
    p.legB = [P(-17, -34), P(-24, 0)];
  },
  // 데스 볼 / 히트 돔 - 머리 위 구슬을 앞으로 내려꽂는다
  orb(p, charging, g) {
    p.armB = [mix(P(-23, -86), P(-21, -85), g), mix(P(-27, -102), P(-15, -71), g)];
    if (charging) {
      p.armF = [mix(P(25, -86), P(19, -127), g), mix(P(31, -103), P(11, -164), g)];
      p.chest = mix(p.chest, P(-1, -102), g);
      p.head = mix(p.head, P(2, -125), g);
      p.headTilt = -0.12 * g;
      p.legF = [P(18, -34), P(25, 0)];
      p.legB = [P(-18, -34), P(-27, 0)];
    } else {
      p.armF = [P(27, -132), P(29, -163)];
      p.armB = [P(-16, -89), P(-6, -97)];
      p.chest = P(6, -101); p.head = P(7, -123); p.hip = P(2, -62);
      p.legF = [P(24, -34), P(34, 0)];
      p.legB = [P(-20, -34), P(-30, 0)];
    }
  },
  // 버닝 어택 - 손을 빠르게 교차해 감았다가 양손을 앞으로
  weave(p, charging, g, gs) {
    if (charging) {
      const sw = gs % 2 ? 1 : -1;
      p.armF = [P(21, -92 + 6 * sw), P(7, -99 - 9 * sw)];
      p.armB = [P(-19, -92 - 6 * sw), P(-3, -99 + 9 * sw)];
      p.chest = mix(p.chest, P(1, -101), g);
      p.head = mix(p.head, P(4, -123), g);
      p.legF = [P(18, -34), P(25, 0)];
      p.legB = [P(-18, -34), P(-26, 0)];
    } else {
      p.armF = [P(28, -92), P(51, -93)];
      p.armB = [P(16, -98), P(47, -99)];
      p.chest = P(10, -100); p.head = P(10, -122); p.hip = P(4, -62);
      p.legF = [P(25, -34), P(35, 0)];
      p.legB = [P(-20, -34), P(-30, 0)];
    }
  }
};

/** 공격 포즈를 몇 단계로 나눌지 (스프라이트로 굽기 위해 양자화한다) */
const ATTACK_STEPS = 4;

function attackPose(f, p) {
  const a = f.attack, def = a.def;
  const phase = a.frame < def.startup ? 'startup'
    : a.frame < def.startup + def.active ? 'active' : 'recovery';
  const ext = phase === 'startup' ? a.frame / Math.max(1, def.startup)
    : phase === 'active' ? 1
      : 1 - (a.frame - def.startup - def.active) / Math.max(1, def.recovery);
  const step = Math.round(clamp(ext, 0, 1) * ATTACK_STEPS);
  const e = step / ATTACK_STEPS;
  p.key = def.key + step;

  switch (def.key) {
    case 'jab':
      p.armF = [mix(P(25, -88), P(38, -100), e), mix(P(31, -103), P(58, -101), e)];
      p.chest = mix(p.chest, P(7, -100), e * 0.7);
      p.head = mix(p.head, P(7, -122), e * 0.5);
      break;
    case 'straight':
      p.armF = [mix(P(16, -92), P(41, -99), e), mix(P(22, -104), P(70, -99), e)];
      p.armB = [mix(P(-23, -85), P(-27, -84), e), mix(P(-27, -102), P(-33, -98), e)];
      p.chest = mix(p.chest, P(12, -100), e);
      p.head = mix(p.head, P(12, -122), e * 0.6);
      p.hip = mix(p.hip, P(6, -62), e);
      p.legB = [mix(P(-18, -33), P(-22, -34), e), mix(P(-26, 0), P(-34, 0), e)];
      break;
    case 'roundhouse':
      p.legF = [mix(P(20, -40), P(34, -72), e), mix(P(26, -6), P(74, -84), e)];
      p.legB = [P(-14, -34), P(-20, 0)];
      p.armF = [P(16, -90), P(6, -106)];
      p.armB = [P(-25, -88), P(-36, -100)];
      p.chest = mix(p.chest, P(-8, -102), e * 0.8);
      p.head = mix(p.head, P(-9, -123), e * 0.6);
      p.hip = mix(p.hip, P(-5, -63), e * 0.7);
      break;
    case 'lowKick':
      crouchPose(p, 1);
      p.legF = [mix(P(18, -24), P(30, -30), e), mix(P(24, -5), P(56, -24), e)];
      break;
    case 'sweep':
      crouchPose(p, 1.2);
      p.legF = [mix(P(18, -18), P(36, -18), e), mix(P(26, -4), P(80, -10), e)];
      p.armB = [P(-22, -46), P(-30, -30)];
      break;
    case 'uppercut':
      p.armF = [mix(P(20, -84), P(25, -112), e), mix(P(28, -100), P(33, -150), e)];
      p.chest = mix(p.chest, P(2, -104), e);
      p.head = mix(p.head, P(4, -126), e);
      p.legF = [P(17, -34), P(23, 0)];
      p.legB = [mix(P(-18, -33), P(-22, -42), e), mix(P(-26, 0), P(-32, -14), e)];
      break;
    case 'airPunch':
      p.armF = [mix(P(24, -86), P(38, -92), e), mix(P(30, -102), P(60, -90), e)];
      p.legF = [P(20, -42), P(26, -20)];
      p.legB = [P(-16, -40), P(-22, -16)];
      break;
    case 'airKick':
      p.legF = [mix(P(20, -40), P(36, -56), e), mix(P(26, -18), P(70, -52), e)];
      p.legB = [P(-15, -38), P(-20, -12)];
      p.armB = [P(-24, -92), P(-36, -104)];
      p.armF = [P(18, -90), P(10, -104)];
      break;
    case 'grab':
      p.armF = [mix(P(24, -88), P(34, -98), e), mix(P(30, -102), P(52, -100), e)];
      p.armB = [mix(P(-22, -86), P(20, -100), e), mix(P(-26, -102), P(46, -104), e)];
      p.chest = mix(p.chest, P(7, -100), e);
      break;
    case 'kiBlast': {
      const gs = Math.round(clamp(a.frame / def.startup, 0, 1) * ATTACK_STEPS);
      const g = gs / ATTACK_STEPS;
      p.key = 'kiBlast' + gs;
      p.armF = [mix(P(25, -86), P(32, -94), g), mix(P(31, -103), P(52, -94), g)];
      p.armB = [mix(P(-23, -86), P(20, -96), g), mix(P(-27, -102), P(46, -96), g)];
      p.chest = mix(p.chest, P(6, -100), g * 0.6);
      break;
    }
    case 'beam':
    case 'ultimate': {
      const charging = a.frame < def.startup;
      const gs = Math.round(clamp(a.frame / Math.max(1, def.startup), 0, 1) * ATTACK_STEPS);
      const g = charging ? gs / ATTACK_STEPS : 1;
      const src = def === MOVES.ultimate ? f.char.ultimate : f.char.special;
      const name = (src && src.motion) || 'cupped';
      // 필살기와 초필살기가 서로 다른 모션일 수 있으므로 키를 분리한다
      const pre = def === MOVES.ultimate ? 'ult' : 'beam';
      p.key = charging ? pre + 'C' + gs : pre + 'F';
      (MOTION_POSE[name] || MOTION_POSE.cupped)(p, charging, g, gs);
      break;
    }
  }
  return p;
}

function crouchPose(p, amount) {
  const k = amount || 1;
  const d = 7 * (k - 1);
  p.hip = P(0, -38 + d);
  p.chest = P(3, -70 + d);
  p.head = P(6, -92 + d);
  p.shoulderF = P(15, -68 + d); p.shoulderB = P(-12, -68 + d);
  p.armF = [P(22, -60 + d), P(26, -76 + d)];
  p.armB = [P(-20, -60 + d), P(-24, -76 + d)];
  p.legF = [P(18, -18), P(25, 0)];
  p.legB = [P(-17, -18), P(-24, 0)];
}

/**
 * 애니메이션 위상을 정수 프레임으로 양자화한다.
 * 같은 키 = 같은 그림이어야 스프라이트로 구울 수 있다.
 */
function phaseOf(time, period, steps) {
  const wrapped = ((time % period) + period) % period;
  const i = Math.floor(wrapped / (period / steps)) % steps;
  return { i, t: i * (period / steps) };
}

const WALK_PERIOD = Math.PI * 2 * 5;
const WALK_BACK_PERIOD = Math.PI * 2 * 6;
const BOB_PERIOD = Math.PI * 2 * 16;

function poseFor(f, time) {
  const p = basePose();

  if (f.state === 'ko' || f.state === 'knockdown') {
    p.key = 'down';
    p.hip = P(-6, -22); p.chest = P(-26, -28); p.head = P(-50, -32);
    p.shoulderF = P(-26, -28); p.shoulderB = P(-30, -24);
    p.armF = [P(-40, -16), P(-56, -12)];
    p.armB = [P(-36, -36), P(-54, -40)];
    p.legF = [P(16, -24), P(34, -10)];
    p.legB = [P(14, -14), P(32, -4)];
    return p;
  }
  if (f.attack) return attackPose(f, p);

  switch (f.state) {
    case 'walk': {
      const ph = phaseOf(time, WALK_PERIOD, 6);
      const s = Math.sin(ph.t / 5);
      p.key = 'walk' + ph.i;
      p.legF = [P(18 + s * 10, -33), P(24 + s * 16, -Math.max(0, s) * 11)];
      p.legB = [P(-17 - s * 10, -33), P(-23 - s * 16, -Math.max(0, -s) * 11)];
      p.armF = [P(25 - s * 4, -85), P(31 - s * 6, -103)];
      p.armB = [P(-23 + s * 4, -85), P(-27 + s * 6, -102)];
      p.chest = P(3, -100 + Math.abs(s) * 1.8);
      p.head = P(5, -122 + Math.abs(s) * 1.8);
      break;
    }
    case 'walkBack': {
      const ph = phaseOf(time, WALK_BACK_PERIOD, 6);
      const s = Math.sin(ph.t / 6);
      p.key = 'back' + ph.i;
      p.legF = [P(18 - s * 8, -33), P(24 - s * 13, -Math.max(0, -s) * 8)];
      p.legB = [P(-17 + s * 8, -33), P(-23 + s * 13, -Math.max(0, s) * 8)];
      p.armF = [P(24, -86), P(30, -104)];
      p.armB = [P(-22, -86), P(-26, -103)];
      break;
    }
    case 'dash':
      p.key = 'dash';
      p.chest = P(13, -99); p.head = P(17, -121); p.hip = P(5, -61);
      p.armF = [P(6, -88), P(-10, -80)];
      p.armB = [P(-14, -90), P(-34, -86)];
      p.legF = [P(26, -33), P(38, -8)];
      p.legB = [P(-18, -35), P(-30, -2)];
      break;
    case 'crouch':
      p.key = 'crouch';
      crouchPose(p, 1);
      break;
    case 'crouchGuard':
      p.key = 'crouchGuard';
      crouchPose(p, 1);
      p.armF = [P(18, -62), P(24, -80)];
      p.armB = [P(6, -60), P(14, -76)];
      break;
    case 'guard':
      p.key = 'guard';
      p.armF = [P(19, -90), P(25, -110)];
      p.armB = [P(7, -88), P(15, -106)];
      p.chest = P(-4, -100); p.head = P(0, -122);
      p.legF = [P(16, -33), P(22, 0)]; p.legB = [P(-19, -33), P(-28, 0)];
      break;
    case 'jump':
    case 'launched': {
      const rising = f.vy < 0;
      p.key = rising ? 'jumpUp' : 'jumpDown';
      p.legF = [P(21, -44), P(27, -22)];
      p.legB = [P(-16, -42), P(-22, -18)];
      p.armF = rising ? [P(22, -108), P(26, -128)] : [P(25, -86), P(32, -100)];
      p.armB = rising ? [P(-20, -108), P(-24, -126)] : [P(-23, -86), P(-28, -100)];
      p.chest = P(2, -100); p.head = P(4, -122);
      break;
    }
    case 'hurt':
    case 'hurtAir':
      p.key = 'hurt';
      p.chest = P(-12, -100); p.head = P(-21, -120); p.hip = P(-4, -62);
      p.armF = [P(12, -92), P(4, -112)];
      p.armB = [P(-26, -90), P(-40, -104)];
      p.legF = [P(18, -33), P(25, 0)];
      p.legB = [P(-12, -33), P(-19, 0)];
      break;
    case 'charge': {
      const ph = phaseOf(time, BOB_PERIOD, 4);
      const bob = Math.sin(ph.t / 16) * 2;
      p.key = 'charge' + ph.i;
      p.armF = [P(27, -84), P(23, -64)];
      p.armB = [P(-25, -84), P(-21, -64)];
      p.chest = P(0, -100 + bob * 0.4); p.head = P(3, -122 + bob * 0.4);
      p.legF = [P(23, -34), P(32, 0)];
      p.legB = [P(-22, -34), P(-31, 0)];
      break;
    }
    case 'win': {
      const ph = phaseOf(time, BOB_PERIOD, 4);
      const bob = Math.sin(ph.t / 16) * 2;
      p.key = 'win' + ph.i;
      p.armF = [P(21, -108), P(25, -140)];
      p.armB = [P(-22, -86), P(-26, -100)];
      p.chest = P(2, -101 + bob); p.head = P(4, -123 + bob);
      break;
    }
    case 'wakeup':
      p.key = 'wakeup';
      crouchPose(p, 1.15);
      break;
    default: {
      const ph = phaseOf(time, BOB_PERIOD, 4);
      const bob = Math.sin(ph.t / 16) * 1.8;
      p.key = 'idle' + ph.i;
      p.chest = P(2, -100 + bob * 0.6);
      p.head = P(4, -122 + bob * 0.6);
      p.armF = [P(25, -85 + bob * 0.4), P(31, -103 + bob * 0.5)];
      p.armB = [P(-23, -85 + bob * 0.4), P(-27, -102 + bob * 0.5)];
    }
  }
  return p;
}

/* ---------------- 헤어 / 머리 ---------------- */
const HEAD_R = 17;
const HAIR_SCALE = 1.3;           // 헤어는 머리보다 크게 (레퍼런스의 볼륨감)

/** 머리 뒤쪽 실루엣(얼굴보다 아래 레이어) */
function drawHairBack(ctx, ch, f, time, hair, hairLit) {
  const c = ch.colors;
  const wobble = (f.charging || f.superSaiyan || f.ki >= 100) ? 2.2 : 0;
  switch (ch.hairStyle) {
    case 'goku': {
      const n = 8;
      for (let i = 0; i < n; i++) {
        const ang = Math.PI + (i / (n - 1)) * Math.PI * 0.98;
        const len = 15 + (i % 2 ? 16 : 9) + Math.sin(time / 7 + i) * wobble;
        const bx = Math.cos(ang) * 13, by = Math.sin(ang) * 13 - 3;
        const tx = Math.cos(ang - 0.16) * (13 + len) - 3;
        const ty = Math.sin(ang - 0.16) * (13 + len) - 4;
        poly(ctx, [
          [bx + Math.cos(ang + 1.5) * 6, by + Math.sin(ang + 1.5) * 6],
          [tx, ty],
          [bx - Math.cos(ang + 1.5) * 6, by - Math.sin(ang + 1.5) * 6]
        ], i % 2 ? hairLit : hair);
      }
      ctx.fillStyle = hair;
      ctx.beginPath(); ctx.arc(0, -3, 14, Math.PI, Math.PI * 2); ctx.fill();
      ctx.fillStyle = hairLit;
      ctx.beginPath(); ctx.ellipse(3, -10, 7, 3.4, -0.4, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'vegeta': {
      poly(ctx, [[-15, -2], [-14, -14], [-4, -30 - wobble], [4, -34 - wobble], [14, -14], [15, -2]], hair);
      poly(ctx, [[-7, -8], [0, -28], [7, -10]], hairLit);
      break;
    }
    case 'gohan': {
      // 손오공보다 정돈된, 뒤로 쓸린 스파이크
      const tips = [[-21, -25], [-12, -36], [-2, -40], [8, -35], [17, -24], [22, -12]];
      tips.forEach((t, i) => {
        const wob = Math.sin(time / 7 + i) * wobble;
        const bx = t[0] * 0.55;
        poly(ctx, [
          [bx - 6, -6], [t[0] - 2 + wob, t[1] + wob * 0.6], [bx + 6, -8]
        ], i % 2 ? hairLit : hair);
      });
      ctx.fillStyle = hair;
      ctx.beginPath(); ctx.arc(0, -3, 15, Math.PI, Math.PI * 2); ctx.fill();
      ctx.fillStyle = hairLit;
      ctx.beginPath(); ctx.ellipse(4, -11, 7, 3.2, -0.35, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'trunks': {
      ctx.fillStyle = hair;
      ctx.beginPath(); ctx.ellipse(-1, -6, 17, 16, 0, 0, Math.PI * 2); ctx.fill();
      poly(ctx, [[-17, -6], [-15, 12], [-6, 8], [-8, -6]], hair);   // 뒷머리
      break;
    }
    case 'piccolo': {
      ctx.fillStyle = c.skinDark;
      ctx.beginPath(); ctx.ellipse(0, -4, 15, 15, 0, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'frieza': {
      ctx.fillStyle = c.skinDark;
      ctx.beginPath(); ctx.ellipse(-1, -6, 16, 15, 0, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'cell': {
      ctx.fillStyle = c.hair;
      ctx.beginPath(); ctx.ellipse(0, -6, 16, 15, 0, 0, Math.PI * 2); ctx.fill();
      poly(ctx, [[-9, -14], [0, -34 - wobble], [9, -14]], '#14100c');  // 볏
      break;
    }
  }
}

/** 얼굴 위에 덮이는 앞머리 / 장식 */
function drawHairFront(ctx, ch, f, time, hair, hairLit) {
  const c = ch.colors;
  switch (ch.hairStyle) {
    case 'goku':
      poly(ctx, [[-13, -8], [-5, -14], [2, -7], [8, -15], [14, -8], [13, -1], [6, -6], [0, 0], [-7, -5], [-13, -1]], hair);
      break;
    case 'vegeta':
      poly(ctx, [[-14, -6], [14, -8], [12, -2], [4, -6], [-1, 1], [-6, -5], [-14, -1]], hair);
      poly(ctx, [[-2, -2], [1, 3.5], [4, -3]], hair);   // 이마 각(V)
      break;
    case 'gohan':
      poly(ctx, [[-14, -10], [-5, -17], [2, -9], [9, -16], [15, -9], [14, -3], [6, -7], [0, -2], [-6, -6], [-14, -3]], hair);
      poly(ctx, [[-5, -12], [3, -17], [8, -10]], hairLit);
      break;
    case 'trunks':
      poly(ctx, [[-15, -10], [15, -12], [13, -3], [6, -8], [0, -2], [-6, -7], [-15, -3]], hair);
      poly(ctx, [[-8, -11], [2, -16], [9, -8]], hairLit);
      break;
    case 'piccolo': {
      // 터번 + 안테나 + 귀
      capsule(ctx, -5, -12, -9, -30, 3.4, c.skinDark);
      capsule(ctx, 5, -12, 9, -30, 3.4, c.skinDark);
      ctx.fillStyle = '#f2ead2';
      ctx.beginPath(); ctx.ellipse(0, -8, 17, 13, 0, Math.PI, Math.PI * 2); ctx.fill();
      ctx.fillRect(-17, -9, 34, 6);
      ctx.fillStyle = '#d5c9a6';
      ctx.fillRect(-17, -5, 34, 3);
      poly(ctx, [[13, -2], [24, -7], [14, 5]], c.skin);
      break;
    }
    case 'frieza':
      ctx.fillStyle = c.hair;
      ctx.beginPath(); ctx.ellipse(0, -8, 13, 9, 0, 0, Math.PI * 2); ctx.fill();
      poly(ctx, [[-14, -6], [-27, -14], [-12, -13]], '#f4f2ec');
      poly(ctx, [[14, -6], [27, -14], [12, -13]], '#f4f2ec');
      break;
    case 'cell':
      ctx.fillStyle = c.hair;
      ctx.beginPath(); ctx.ellipse(0, -9, 14, 8, 0, 0, Math.PI * 2); ctx.fill();
      capsule(ctx, -12, -12, -21, -26, 4.5, '#14100c');
      capsule(ctx, 12, -12, 21, -26, 4.5, '#14100c');
      poly(ctx, [[-13, -2], [-4, -6], [-4, 4]], '#1c1c1c');
      poly(ctx, [[13, -2], [4, -6], [4, 4]], '#1c1c1c');
      break;
  }
}

/**
 * 머리 : 토리야마 화풍의 특징을 따른다.
 *  - 둥근 두상에 턱이 뾰족한 역달걀 윤곽
 *  - 크고 세로로 긴 눈, 위쪽에 두꺼운 눈꺼풀 선
 *  - 각진 굵은 눈썹, 작고 뾰족한 코, 작은 입
 */
function drawHead(ctx, p, ch, f, time) {
  const c = ch.colors;
  const form = ch.form || null;
  const superSaiyan = !!f.superSaiyan && !!(form && form.saiyan);
  const hair = superSaiyan ? (form.hair || '#ffdf3d') : c.hair;
  const hairLit = superSaiyan ? (form.hairLit || '#fff3a0') : c.hairLit;
  const skinLight = shade(c.skin, 0.18);
  const skinEdge = edgeOf(c.skin);

  ctx.save();
  ctx.translate(p.head[0], p.head[1]);

  // 목 (몸통과 이어지도록 뼈로 연결)
  bone(ctx, [p.chest[0] - p.head[0], p.chest[1] - p.head[1] + 2], [0, 9],
    len => drawPart(ctx, muscle(len, 13, 0.5, 0.46), c.skinDark, skinEdge, null));

  ctx.save(); ctx.scale(HAIR_SCALE, HAIR_SCALE);
  drawHairBack(ctx, ch, f, time, hair, hairLit);
  ctx.restore();

  // 얼굴 윤곽 : 이마는 넓고 턱은 뾰족하게
  const face = [
    [-1, -19], [10, -16], [16, -7], [16, 2], [11, 11], [4, 17],
    [-4, 14], [-12, 6], [-16, -4], [-11, -15]
  ];
  drawPart(ctx, face, c.skin, skinEdge, c2 => {
    c2.fillStyle = c.skinDark;                       // 뒤통수/턱 그늘
    c2.beginPath(); c2.ellipse(-13, 4, 9, 14, 0, 0, Math.PI * 2); c2.fill();
    c2.beginPath(); c2.ellipse(2, 17, 12, 5, 0, 0, Math.PI * 2); c2.fill();
    c2.fillStyle = skinLight;                        // 이마/광대 하이라이트
    c2.beginPath(); c2.ellipse(6, -10, 9, 5, -0.2, 0, Math.PI * 2); c2.fill();
  });
  // 귀
  if (!/^(piccolo|frieza|cell)$/.test(ch.hairStyle)) {
    drawPart(ctx, [[-14, -3], [-11, -6], [-9, 1], [-12, 6], [-15, 4]], c.skinDark, skinEdge, null);
  }

  ctx.save(); ctx.scale(HAIR_SCALE, HAIR_SCALE);
  drawHairFront(ctx, ch, f, time, hair, hairLit);
  ctx.restore();

  // ---- 표정 ----
  const hurt = f.hitstun > 0 || f.state === 'hurt' || f.state === 'hurtAir';
  const angry = !!f.attack || f.charging || hurt;
  const iris = superSaiyan ? ((ch.form && ch.form.eye) || '#2fbf6a') : c.eye;
  if (f.state === 'ko') {
    ctx.strokeStyle = c.eye; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
    [[3, 11], [-6, 1]].forEach(([x0, x1]) => {
      ctx.beginPath(); ctx.moveTo(x0, -1); ctx.lineTo(x1, 6); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x1, -1); ctx.lineTo(x0, 6); ctx.stroke();
    });
    ctx.fillStyle = '#7a2f2f';
    ctx.beginPath(); ctx.ellipse(5, 11, 4, 2.8, 0, 0, Math.PI * 2); ctx.fill();
  } else {
    // 눈 : 세로로 긴 타원 + 위쪽 두꺼운 눈꺼풀
    const eye = (ex, ey, rx, ry, ir) => {
      ctx.fillStyle = '#f7f4ed';
      ctx.beginPath(); ctx.ellipse(ex, ey, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = iris;
      ctx.beginPath(); ctx.ellipse(ex + rx * 0.28, ey + 0.4, ir, ry * 0.82, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(ex + rx * 0.35, ey - ry * 0.55, 1.5, 1.6);
      // 위 눈꺼풀
      ctx.strokeStyle = c.eye; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(ex - rx - 0.6, ey - ry * 0.45);
      ctx.quadraticCurveTo(ex, ey - ry - 1.4, ex + rx + 0.4, ey - ry * 0.35);
      ctx.stroke();
    };
    eye(9.5, -1, 4.6, hurt ? 6.6 : 5.8, 2.7);
    eye(-0.6, -1, 3.8, hurt ? 5.8 : 5.1, 2.3);
    // 눈썹 : 굵고 각지게
    ctx.strokeStyle = c.eye; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(4.2, angry ? -8.4 : -7.6); ctx.lineTo(14.4, angry ? -5.4 : -6.6);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-5.4, angry ? -6.6 : -6); ctx.lineTo(2.6, angry ? -8.8 : -8);
    ctx.stroke();
    // 코 (작고 뾰족하게) + 입
    ctx.strokeStyle = shade(c.skinDark, -0.35); ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(15.4, 3.4); ctx.lineTo(13.6, 5.6); ctx.stroke();
    if (hurt || f.attack || f.charging) {
      drawPart(ctx, [[4, 8.5], [9, 7.5], [12, 10], [9, 14], [4.5, 12.5]], '#7a2f2f', '#3d1414', c2 => {
        c2.fillStyle = '#efe3dc'; c2.fillRect(3, 7.6, 9, 2);
      });
    } else {
      ctx.strokeStyle = '#7c3b3b'; ctx.lineWidth = 2; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(4.5, 10.5); ctx.quadraticCurveTo(8, 12.2, 11, 10.2);
      ctx.stroke();
    }
  }
  ctx.restore();
}

/* ---------------- 오라 ---------------- */
function drawAura(ctx, f, time, ch) {
  if (f.state === 'ko' || f.state === 'knockdown') return;
  const level = f.charging ? 1 : (f.superSaiyan ? 0.95 : f.ki >= 100 ? 0.75 : f.ki >= 60 ? 0.45 : 0);
  if (level <= 0) return;
  const c = (f.superSaiyan && ch.form && ch.form.aura) || ch.colors.aura;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const layers = 3;
  for (let l = 0; l < layers; l++) {
    ctx.globalAlpha = (0.16 + 0.1 * level) * (1 - l * 0.22);
    ctx.fillStyle = c;
    ctx.beginPath();
    const w = 44 + l * 16 + level * 12;
    const h = 150 + l * 26 + level * 30;
    ctx.moveTo(-w * 0.5, 4);
    const steps = 10;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const wob = Math.sin(time / 5 + t * 7 + l) * (8 + t * 14) * (0.5 + level * 0.6);
      ctx.lineTo(-w * 0.5 + w * t + wob * 0.5, 4 - h * Math.sin(t * Math.PI) * (0.6 + t * 0.5) - wob * 0.6);
    }
    ctx.lineTo(w * 0.5, 4);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

/* ---------------- 캐릭터 본체 ----------------
 *  캡슐을 이어 붙이는 대신, 부위마다 근육 실루엣을 그리고
 *  뼈(관절 A→B) 공간에서 회전시켜 붙인다.
 *  - 관절이 항상 맞물리고
 *  - 레이어 순서가 고정되며(뒤팔 → 뒤다리 → 몸통 → 앞다리 → 앞팔 → 머리)
 *  - 실루엣이 사람 몸으로 읽힌다.
 * ------------------------------------------- */

/** 조절점들을 부드러운 곡선으로 이어 닫힌 경로를 만든다 */
function smoothPath(ctx, pts) {
  const n = pts.length;
  ctx.beginPath();
  let mx = (pts[n - 1][0] + pts[0][0]) / 2, my = (pts[n - 1][1] + pts[0][1]) / 2;
  ctx.moveTo(mx, my);
  for (let i = 0; i < n; i++) {
    const cur = pts[i], nxt = pts[(i + 1) % n];
    ctx.quadraticCurveTo(cur[0], cur[1], (cur[0] + nxt[0]) / 2, (cur[1] + nxt[1]) / 2);
  }
  ctx.closePath();
}

/** 실루엣 + 외곽선 + (클립 안에서) 명암 */
function drawPart(ctx, pts, base, edge, shadeFn) {
  smoothPath(ctx, pts);
  ctx.strokeStyle = edge;
  ctx.lineWidth = 3.2;
  ctx.lineJoin = 'round';
  ctx.stroke();
  ctx.fillStyle = base;
  ctx.fill();
  if (shadeFn) {
    ctx.save();
    smoothPath(ctx, pts);
    ctx.clip();
    shadeFn(ctx);
    ctx.restore();
  }
}

/** 뼈 공간(관절A 원점, +x 가 관절B 방향)에서 그린다 */
function bone(ctx, a, b, draw) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const len = Math.hypot(dx, dy) || 1;
  ctx.save();
  ctx.translate(a[0], a[1]);
  ctx.rotate(Math.atan2(dy, dx));
  draw(len);
  ctx.restore();
}

/** 근육 : 관절 쪽이 두껍고 끝으로 갈수록 가늘어지는 방추형 */
function muscle(len, w, bulge, taper) {
  const b = bulge == null ? 0.6 : bulge;
  const t = taper == null ? 0.34 : taper;
  return [
    [-w * 0.42, -w * 0.46], [len * 0.32, -w * b], [len * 0.78, -w * (t + 0.05)],
    [len + w * 0.16, -w * t], [len + w * 0.26, 0], [len + w * 0.16, w * t],
    [len * 0.78, w * (t + 0.08)], [len * 0.32, w * (b - 0.04)], [-w * 0.42, w * 0.48]
  ];
}

/** 뼈 공간 명암 : 아래쪽 그림자 + 윗면 하이라이트 */
function limbShade(len, w, dark, light) {
  return ctx => {
    ctx.fillStyle = dark;
    ctx.beginPath();
    ctx.ellipse(len * 0.5, w * 0.6, len * 0.75, w * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = light;
    ctx.beginPath();
    ctx.ellipse(len * 0.42, -w * 0.42, len * 0.4, w * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
  };
}

/** 주먹 : 손등 + 손가락 마디 + 엄지 (진행 방향을 향한다) */
function drawFistPart(ctx, hand, dir, r, base, dark, light, edge) {
  ctx.save();
  ctx.translate(hand[0], hand[1]);
  ctx.rotate(Math.atan2(dir[1], dir[0]));
  const pts = [
    [-r * 0.95, -r * 0.8], [r * 0.15, -r * 1.0], [r * 0.95, -r * 0.62],
    [r * 1.06, 0], [r * 0.92, r * 0.66], [r * 0.05, r * 0.95], [-r * 0.95, r * 0.78]
  ];
  drawPart(ctx, pts, base, edge, c2 => {
    c2.fillStyle = dark;
    c2.beginPath(); c2.ellipse(0, r * 0.62, r * 1.2, r * 0.6, 0, 0, Math.PI * 2); c2.fill();
    c2.fillStyle = light;
    c2.beginPath(); c2.ellipse(-r * 0.1, -r * 0.5, r * 0.55, r * 0.3, 0, 0, Math.PI * 2); c2.fill();
    // 손가락 마디
    c2.strokeStyle = dark; c2.lineWidth = 1.6; c2.lineCap = 'round';
    for (let i = -1; i <= 1; i++) {
      c2.beginPath();
      c2.moveTo(r * 0.45, i * r * 0.42);
      c2.lineTo(r * 0.95, i * r * 0.34);
      c2.stroke();
    }
  });
  ctx.restore();
}

/** 부츠 : 발목 + 발등 + 밑창 (발끝은 항상 앞을 향한다) */
function drawBootPart(ctx, ankle, dir, w, base, dark, light, edge) {
  ctx.save();
  ctx.translate(ankle[0], ankle[1]);
  ctx.rotate(Math.atan2(dir[1], dir[0]));
  const pts = [
    [-w * 0.62, -w * 0.95], [w * 0.35, -w * 0.85], [w * 1.45, -w * 0.3],
    [w * 1.6, w * 0.22], [w * 0.9, w * 0.5], [-w * 0.6, w * 0.5]
  ];
  drawPart(ctx, pts, base, edge, c2 => {
    c2.fillStyle = dark;
    c2.fillRect(-w, w * 0.12, w * 3, w);                    // 밑창
    c2.fillStyle = light;
    c2.beginPath();
    c2.ellipse(w * 0.35, -w * 0.55, w * 0.7, w * 0.24, -0.15, 0, Math.PI * 2);
    c2.fill();
  });
  ctx.restore();
}

/** 팔 한 짝 (위팔 → 아래팔 → 주먹) */
function drawArm(ctx, sh, el, ha, w, base, dark, light, glove, gloveDark, gloveLight, fore, band) {
  const edge = edgeOf(base), gEdge = edgeOf(glove);
  const fb = fore ? fore.base : base, fd = fore ? fore.dark : dark, fl = fore ? fore.light : light;
  bone(ctx, sh, el, len => drawPart(ctx, muscle(len, w, 0.62, 0.36), base, edge, limbShade(len, w, dark, light)));
  bone(ctx, el, ha, len => {
    drawPart(ctx, muscle(len, w * 0.82, 0.52, 0.34), fb, edgeOf(fb), limbShade(len, w * 0.82, fd, fl));
    if (band) {                                    // 손목 밴드
      drawPart(ctx, [
        [len - 9, -w * 0.34], [len - 1, -w * 0.32], [len - 1, w * 0.32], [len - 9, w * 0.34]
      ], band.base, edgeOf(band.base), c2 => {
        c2.fillStyle = band.dark;
        c2.fillRect(len - 10, w * 0.05, 12, w * 0.4);
      });
    }
  });
  drawFistPart(ctx, ha, tipDir(el, ha), w * 0.52, glove, gloveDark, gloveLight, gEdge);
}

/** 다리 한 짝 (허벅지 → 정강이 → 부츠) */
function drawLeg(ctx, hip, kn, ft, w, base, dark, light, boot, bootDark, bootLight) {
  const edge = edgeOf(base), bEdge = edgeOf(boot);
  bone(ctx, hip, kn, len => drawPart(ctx, muscle(len, w, 0.6, 0.4), base, edge, limbShade(len, w, dark, light)));
  bone(ctx, kn, ft, len => drawPart(ctx, muscle(len, w * 0.78, 0.56, 0.34), base, edge,
    limbShade(len, w * 0.78, dark, light)));
  drawBootPart(ctx, ft, tipDir(kn, ft), w * 0.42, boot, bootDark, bootLight, bEdge);
}

/** 방향 벡터 : 관절 -> 끝. 세운 상태면 앞(+x), 뻗었으면 팔다리 방향 */
function tipDir(joint, tip) {
  let dx = tip[0] - joint[0], dy = tip[1] - joint[1];
  const len = Math.hypot(dx, dy) || 1;
  dx /= len; dy /= len;
  return Math.abs(dx) > Math.abs(dy) ? [dx, dy] : [1, 0];
}

/** 부위별 외곽선 색 (기본색을 아주 어둡게) */
const edgeOf = col => shade(col, -0.6);

/**
 * 캐릭터 리그를 원점(발끝) 기준으로 그린다.
 * 레이어 순서 : 뒤팔 → 뒤다리 → 몸통 → 앞다리 → 앞팔 → 머리
 */
function drawFighterRig(ctx, f, p, time) {
  const ch = f.char, c = ch.colors;
  const gi = c.gi, giDark = c.giDark, giLight = shade(c.gi, 0.22);
  const sleeve = c.sleeve || c.gi, sleeveDark = c.sleeveDark || c.giDark;
  const sleeveLight = shade(sleeve, 0.22);
  const belt = c.belt || c.trim, beltDark = c.beltDark || c.trimDark;
  const boot = c.boot || c.trim, bootDark = c.bootDark || c.trimDark;
  const bootLight = shade(boot, 0.28);
  const glove = c.glove || c.skin, gloveDark = c.gloveDark || c.skinDark;
  const gloveLight = shade(glove, 0.24);
  const back = col => shade(col, -0.26);      // 뒤쪽 사지는 한 단계 어둡게
  // 반팔 도복이면 아래팔이 맨살로 드러난다
  const foreBase = c.forearm || sleeve;
  const fore = { base: foreBase, dark: c.forearmDark || sleeveDark, light: shade(foreBase, 0.22) };
  const foreBack = { base: back(fore.base), dark: shade(fore.dark, -0.26), light: shade(fore.light, -0.26) };
  const band = c.band ? { base: c.band, dark: c.bandDark || shade(c.band, -0.35) } : null;
  const bandBack = band ? { base: back(band.base), dark: shade(band.dark, -0.26) } : null;

  // 1) 뒤쪽 팔
  drawArm(ctx, p.shoulderB, p.armB[0], p.armB[1], 16,
    back(sleeve), shade(sleeveDark, -0.26), shade(sleeveLight, -0.26),
    back(glove), shade(gloveDark, -0.26), shade(gloveLight, -0.26), foreBack, bandBack);
  // 2) 뒤쪽 다리
  drawLeg(ctx, p.hip, p.legB[0], p.legB[1], 24,
    back(gi), shade(giDark, -0.26), shade(giLight, -0.26),
    back(boot), shade(bootDark, -0.26), shade(bootLight, -0.26));

  // 3) 몸통 : 어깨가 넓고 허리가 좁은 상체 실루엣
  const cx = p.chest[0], cy = p.chest[1], hx = p.hip[0], hy = p.hip[1];
  const torso = [
    [cx - 19, cy + 4], [cx - 6, cy - 7], [cx + 8, cy - 7], [cx + 20, cy + 4],
    [cx + 17, cy + 22], [hx + 14, hy + 2], [hx + 15, hy + 10],
    [hx - 15, hy + 10], [hx - 14, hy + 2], [cx - 17, cy + 22]
  ];
  drawPart(ctx, torso, gi, edgeOf(gi), c2 => {
    // 등쪽 그늘
    c2.fillStyle = giDark;
    c2.beginPath();
    c2.ellipse(cx - 20, cy + 20, 20, 34, 0, 0, Math.PI * 2);
    c2.fill();
    // 가슴 하이라이트
    c2.fillStyle = giLight;
    c2.beginPath();
    c2.ellipse(cx + 12, cy + 9, 9, 8, -0.3, 0, Math.PI * 2);
    c2.fill();
    // 가슴 근육 경계 / 복부 중심선
    c2.strokeStyle = shade(gi, -0.45);
    c2.lineWidth = 2.4; c2.lineCap = 'round';
    c2.beginPath();
    c2.moveTo(cx - 12, cy + 17); c2.quadraticCurveTo(cx + 2, cy + 22, cx + 16, cy + 14);
    c2.stroke();
    c2.lineWidth = 1.8;
    c2.beginPath();
    c2.moveTo(cx + 2, cy + 20); c2.lineTo(hx + 1, hy + 2);
    c2.stroke();
  });

  // 도복 깃 (속옷이 보이는 캐릭터)
  if (/^(goku|vegeta|trunks|piccolo|gohan)$/.test(ch.id)) {
    poly(ctx, [
      [cx - 7, cy - 2], [cx + 9, cy - 2], [cx + 7, cy + 20], [cx + 1, cy + 26], [cx - 5, cy + 20]
    ], c.trim);
    poly(ctx, [[cx + 2, cy - 2], [cx + 9, cy - 2], [cx + 7, cy + 20], [cx + 2, cy + 24]],
      shade(c.trim, -0.24));
  }

  // 전투복 갑옷
  if (c.armor) {
    const ar = c.armor;
    drawPart(ctx, [
      [cx - 18, cy + 3], [cx - 4, cy - 4], [cx + 8, cy - 4], [cx + 19, cy + 3],
      [cx + 15, cy + 24], [cx, cy + 28], [cx - 15, cy + 24]
    ], ar.plate, edgeOf(ar.plate), c2 => {
      c2.fillStyle = ar.plateDark;
      c2.beginPath(); c2.ellipse(cx + 16, cy + 14, 10, 18, 0, 0, Math.PI * 2); c2.fill();
    });
    bone(ctx, p.shoulderF, [p.shoulderF[0] + 12, p.shoulderF[1] + 3],
      len => drawPart(ctx, muscle(len, 15, 0.7, 0.5), ar.pad, edgeOf(ar.pad), limbShade(len, 15, ar.padDark, shade(ar.pad, 0.3))));
    bone(ctx, p.shoulderB, [p.shoulderB[0] - 11, p.shoulderB[1] + 3],
      len => drawPart(ctx, muscle(len, 14, 0.7, 0.5), ar.padDark, edgeOf(ar.padDark), limbShade(len, 14, shade(ar.padDark, -0.3), ar.pad)));
  }

  // 벨트
  drawPart(ctx, [
    [hx - 16, hy + 1], [hx, hy - 2], [hx + 16, hy + 1],
    [hx + 15, hy + 9], [hx, hy + 12], [hx - 15, hy + 9]
  ], belt, edgeOf(belt), c2 => {
    c2.fillStyle = beltDark;
    c2.fillRect(hx - 18, hy + 6, 36, 8);
    c2.fillStyle = shade(belt, 0.28);
    c2.fillRect(hx - 16, hy, 32, 2.4);
  });
  // 벨트 매듭 + 늘어진 끈
  bone(ctx, [hx - 2, hy + 6], [hx - 7, hy + 22],
    len => drawPart(ctx, muscle(len, 8, 0.5, 0.4), belt, edgeOf(belt), null));

  // 4) 앞쪽 다리
  drawLeg(ctx, p.hip, p.legF[0], p.legF[1], 26, gi, giDark, giLight, boot, bootDark, bootLight);
  // 5) 앞쪽 팔
  drawArm(ctx, p.shoulderF, p.armF[0], p.armF[1], 17.5,
    sleeve, sleeveDark, sleeveLight, glove, gloveDark, gloveLight, fore, band);
  // 6) 머리
  drawHead(ctx, p, ch, f, time);
}

function drawFighter(ctx, f, time) {
  const ch = f.char;

  // 그림자
  ctx.save();
  const h = clamp(1 - (GROUND_Y - f.y) / 260, 0.25, 1);
  ctx.globalAlpha = 0.32 * h;
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.ellipse(f.x, GROUND_Y + 4, 34 * h, 9 * h, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  const p = poseFor(f, time);
  const frame = SpriteBank.get(f, p, time);

  ctx.save();
  ctx.translate(SpriteBank.snap(f.x), SpriteBank.snap(f.y));
  ctx.scale(f.facing, 1);

  drawAura(ctx, f, time, ch);

  if (f.flash > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = clamp(f.flash / 14, 0, 0.75);
    const fg = ctx.createRadialGradient(0, -80, 6, 0, -80, 84);
    fg.addColorStop(0, '#fff6d0');
    fg.addColorStop(0.45, 'rgba(255,210,120,0.5)');
    fg.addColorStop(1, 'rgba(255,150,60,0)');
    ctx.fillStyle = fg;
    ctx.beginPath(); ctx.arc(0, -80, 84, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  if (frame) {
    // 구워둔 스프라이트를 그대로 찍는다 (픽셀 보간 없음)
    const sm = ctx.imageSmoothingEnabled;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(
      frame.image, frame.sx, frame.sy, frame.sw, frame.sh,
      -frame.ox * frame.scale, -frame.oy * frame.scale,
      frame.sw * frame.scale, frame.sh * frame.scale
    );
    ctx.imageSmoothingEnabled = sm;
  } else {
    drawFighterRig(ctx, f, p, time);
  }
  ctx.restore();

  // 가드 실드
  if (f.guarding && f.blockstun > 0) {
    ctx.save();
    ctx.globalAlpha = 0.4 + Math.sin(time / 3) * 0.15;
    ctx.strokeStyle = '#9fe8ff';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(f.x + f.facing * 16, f.y - 70, 34, 70, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

/* ---------------- 발사체 / 빔 ---------------- */
function drawProjectile(ctx, pr, time) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const r = pr.radius;
  const g = ctx.createRadialGradient(pr.x, pr.y, 0, pr.x, pr.y, r * 2.4);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.35, pr.color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(pr.x, pr.y, r * 2.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.8;
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(pr.x - Math.sign(pr.vx) * r * 0.3, pr.y, r * (0.55 + Math.sin(time / 4) * 0.06), 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawBeam(ctx, f, time) {
  const rect = f.beamRect();
  if (!rect) return;
  const def = f.attack.def;
  const ult = def === MOVES.ultimate;
  const src = ult ? f.char.ultimate : f.char.special;
  const m = motionFor(f.char, def);
  const color = src.color, core = src.core;
  const dir = f.facing;
  const mx = f.x + dir * m.handX;         // 총구 (실제 손 위치)
  const my = f.y + m.handY;
  const cy = rect.y + rect.h / 2;          // 판정 사각형의 중심
  const farX = dir > 0 ? rect.x + rect.w : rect.x;
  const hh = rect.h / 2;
  const mh = Math.max(3, hh * (m.style === 'thin' ? 0.55 : 0.34)); // 총구 쪽 두께
  const puls = 1 + Math.sin(time / 3) * 0.05;

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  // 본체 : 총구에서 끝으로 퍼지는 사다리꼴 (여러 겹)
  const band = (k, alpha, col) => {
    ctx.globalAlpha = alpha;
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(mx, my - mh * k * puls);
    ctx.lineTo(farX, cy - hh * k * puls);
    ctx.lineTo(farX, cy + hh * k * puls);
    ctx.lineTo(mx, my + mh * k * puls);
    ctx.closePath();
    ctx.fill();
  };
  band(1.28, 0.22, color);
  band(1.0, 0.55, color);
  band(m.style === 'wide' ? 0.52 : 0.44, 0.95, core);

  // 스타일별 추가 이펙트
  if (m.style === 'spiral') {
    // 빔을 감고 도는 두 가닥의 나선
    ctx.globalAlpha = 0.75;
    ctx.strokeStyle = core;
    ctx.lineWidth = Math.max(2, hh * 0.16);
    for (let s = 0; s < 2; s++) {
      ctx.beginPath();
      for (let t = 0; t <= 1.0001; t += 0.05) {
        const x = lerp(mx, farX, t);
        const half = lerp(mh, hh, t);
        const y = lerp(my, cy, t) + Math.sin(t * 12 - time / 2.4 + s * Math.PI) * half * 0.82;
        t === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }
  if (m.style === 'wide') {
    // 굵은 기둥을 가르는 세로 결
    ctx.globalAlpha = 0.35;
    ctx.strokeStyle = core;
    ctx.lineWidth = Math.max(1.5, hh * 0.07);
    for (let s = -2; s <= 2; s++) {
      if (!s) continue;
      ctx.beginPath();
      for (let t = 0; t <= 1.0001; t += 0.1) {
        const x = lerp(mx, farX, t);
        const half = lerp(mh, hh, t);
        const y = lerp(my, cy, t) + half * (s / 2.6) * (1 + Math.sin(t * 7 + time / 4) * 0.08);
        t === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }
  if (m.style === 'thin') {
    // 관통형 : 바늘처럼 곧은 흰 심지
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(1.6, hh * 0.5);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(mx, my);
    ctx.lineTo(farX, cy);
    ctx.stroke();
  }
  if (m.style === 'orb') {
    // 총구에 거대한 에너지 구체
    const r = hh * 1.15;
    const og = ctx.createRadialGradient(mx, my, r * 0.15, mx, my, r);
    og.addColorStop(0, '#ffffff');
    og.addColorStop(0.45, core);
    og.addColorStop(1, color);
    ctx.globalAlpha = 0.95;
    ctx.fillStyle = og;
    ctx.beginPath();
    ctx.arc(mx, my, r * (1 + Math.sin(time / 4) * 0.05), 0, Math.PI * 2);
    ctx.fill();
  }
  if (m.rings) {
    // 빔을 타고 흘러가는 충격 링
    ctx.strokeStyle = core;
    for (let k = 0; k < 3; k++) {
      const t = ((time / 9 + k / 3) % 1);
      const x = lerp(mx, farX, t);
      const half = lerp(mh, hh, t) * 1.3;
      ctx.globalAlpha = 0.34 * (1 - t);
      ctx.lineWidth = Math.max(1.2, hh * 0.07);
      ctx.beginPath();
      ctx.ellipse(x, lerp(my, cy, t), half * 0.17, half, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  if (m.sparks) {
    // 빔에서 튀어나오는 번개
    ctx.globalAlpha = 0.6;
    ctx.strokeStyle = core;
    ctx.lineWidth = 1.6;
    for (let k = 0; k < 5; k++) {
      const t = ((time / 5 + k * 0.21) % 1);
      const x = lerp(mx, farX, t);
      const half = lerp(mh, hh, t);
      const sy = lerp(my, cy, t) + (k % 2 ? half : -half) * 0.95;
      const s = k % 2 ? 1 : -1;
      ctx.beginPath();
      ctx.moveTo(x, sy);
      ctx.lineTo(x + dir * 6, sy + s * 6);
      ctx.lineTo(x - dir * 1, sy + s * 11);
      ctx.stroke();
    }
  }

  // 총구 플레어 (너무 커져 캐릭터를 덮지 않도록 상한을 둔다)
  const fr = clamp(rect.h * 0.9, 26, 72) * (m.style === 'orb' ? 0.72 : 1);
  const g = ctx.createRadialGradient(mx, my, 0, mx, my, fr);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.38, core);
  g.addColorStop(0.62, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = 1;
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(mx, my, fr * puls, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/**
 * 필살기 발동 전, 기를 모으는 연출.
 * 모션마다 기가 모이는 위치가 다르다 (허리 뒤 / 이마 / 머리 위 / 양손).
 */
function drawSpecialCharge(ctx, f, time) {
  if (!f.attack) return;
  const def = f.attack.def;
  if (!def.beam || f.attack.frame >= def.startup) return;
  const t = clamp(f.attack.frame / Math.max(1, def.startup), 0, 1);
  const m = motionFor(f.char, def);
  const src = def === MOVES.ultimate ? f.char.ultimate : f.char.special;
  const spots = m.twin
    ? [[m.chargeX, m.chargeY], [-m.chargeX, m.chargeY]]
    : [[m.chargeX, m.chargeY]];
  const r0 = m.chargeR * (def === MOVES.ultimate ? 1.35 : 1);

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const [sx, sy] of spots) {
    const x = f.x + f.facing * sx, y = f.y + sy;
    const r = r0 * (0.42 + t * 0.72) * (1 + Math.sin(time / 2.6) * 0.07);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r * 2);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.3, src.core);
    g.addColorStop(0.6, src.color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = 0.55 + t * 0.45;
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r * 2, 0, Math.PI * 2); ctx.fill();

    // 구체를 감싸는 회전 링
    ctx.globalAlpha = 0.5 * t;
    ctx.strokeStyle = src.core;
    ctx.lineWidth = 2;
    for (let k = 0; k < 2; k++) {
      const a = time / 12 + k * 1.05;
      ctx.beginPath();
      ctx.ellipse(x, y, r * 1.75, r * 0.55, a, 0, Math.PI * 2);
      ctx.stroke();
    }
    // 모일수록 강해지는 스파크
    if (t > 0.45) {
      ctx.globalAlpha = 0.7 * t;
      ctx.lineWidth = 1.6;
      for (let k = 0; k < 3; k++) {
        const a = time / 4 + k * 2.1;
        const rr = r * 1.9;
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
        ctx.lineTo(x + Math.cos(a + 0.5) * rr * 1.5, y + Math.sin(a + 0.5) * rr * 1.5);
        ctx.stroke();
      }
    }
  }
  ctx.restore();
}

/**
 * 빔 힘겨루기 : 두 빔이 맞부딪힌 접점의 구체와 균형 게이지.
 */
function drawBeamClash(ctx, clash, time) {
  if (!clash) return;
  const [a, b] = clash.pair;
  const ca = a.attack ? (a.attack.def === MOVES.ultimate ? a.char.ultimate : a.char.special) : null;
  const cb = b.attack ? (b.attack.def === MOVES.ultimate ? b.char.ultimate : b.char.special) : null;
  if (!ca || !cb) return;
  const x = clash.x, y = clash.y;
  const push = 1 + Math.sin(time / 2.4) * 0.06;
  const r = (58 + Math.min(clash.timer, 240) * 0.11) * push;

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  // 접점을 또렷하게 하는 흰 코어
  ctx.globalAlpha = 0.95;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.arc(x, y, r * 0.3, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;
  // 밀리는 쪽 색이 접점에 더 많이 남는다
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.35, clash.t > 0.5 ? ca.core : cb.core);
  g.addColorStop(0.7, clash.t > 0.5 ? ca.color : cb.color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();

  // 퍼져 나가는 충격 링
  ctx.strokeStyle = '#ffffff';
  for (let k = 0; k < 3; k++) {
    const t = ((time / 14 + k / 3) % 1);
    ctx.globalAlpha = 0.5 * (1 - t);
    ctx.lineWidth = 3 * (1 - t) + 1;
    ctx.beginPath();
    ctx.ellipse(x, y, r * (0.5 + t * 1.4) * 0.5, r * (0.5 + t * 1.4), 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();

  // 균형 게이지 : 누가 밀고 있는지 한눈에
  const W = 180, H = 9, gy = y - r - 34;
  ctx.save();
  ctx.globalAlpha = 0.92;
  ctx.fillStyle = 'rgba(6,8,20,0.75)';
  ctx.fillRect(x - W / 2 - 2, gy - 2, W + 4, H + 4);
  ctx.fillStyle = cb.color;
  ctx.fillRect(x - W / 2, gy, W, H);
  ctx.fillStyle = ca.color;
  ctx.fillRect(x - W / 2, gy, W * clash.t, H);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x - W / 2 + W * clash.t - 1.5, gy - 3, 3, H + 6);
  ctx.restore();
}

/** 기탄끼리 맞부딪힌 지점 */
function drawBlastClash(ctx, cl, time) {
  const r = 22 + Math.sin(time / 2) * 3 + cl.t * 0.4;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(cl.x, cl.y, 0, cl.x, cl.y, r);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.45, cl.a.color);
  g.addColorStop(0.75, cl.b.color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(cl.x, cl.y, r, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 0.6;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(cl.x, cl.y, r * 0.3, r * 0.9, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}

/* ---------------- 스테이지 ---------------- */
const STAGES = [
  { id: 'wasteland', name: '황무지', sky: ['#2a3c72', '#6f5aa8', '#f0a05a'], ground: '#8a6a4a', groundDark: '#5f4630', accent: '#c69b6d' },
  { id: 'lookout', name: '신의 신전', sky: ['#0d1b3a', '#2a4a8f', '#7fc7ff'], ground: '#dcd6c4', groundDark: '#a89f8a', accent: '#f2ecd8' },
  { id: 'cellgame', name: '셀 게임 링', sky: ['#3a1030', '#8f2a4a', '#f2a25c'], ground: '#6d5a44', groundDark: '#42362a', accent: '#d9c07c' }
];

/**
 * 스테이지를 월드 좌표계에 그린다.
 * view : { x, y, w, h } - 현재 화면이 비추는 월드 영역
 */
function drawStage(ctx, stage, view, time) {
  const g = ctx.createLinearGradient(0, view.y, 0, view.y + view.h);
  g.addColorStop(0, stage.sky[0]);
  g.addColorStop(0.55, stage.sky[1]);
  g.addColorStop(1, stage.sky[2]);
  ctx.fillStyle = g;
  ctx.fillRect(view.x - 10, view.y - 10, view.w + 20, view.h + 20);

  // 태양
  const sunX = view.x * 0.94 + 620, sunY = view.y + 90;
  const sg = ctx.createRadialGradient(sunX, sunY, 10, sunX, sunY, 140);
  sg.addColorStop(0, 'rgba(255,244,205,0.95)');
  sg.addColorStop(1, 'rgba(255,200,120,0)');
  ctx.fillStyle = sg;
  ctx.beginPath(); ctx.arc(sunX, sunY, 140, 0, Math.PI * 2); ctx.fill();

  // 구름
  ctx.save();
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 8; i++) {
    const x = view.x * 0.88 + ((i * 300 + time * 0.3) % 2400) - 320;
    const y = view.y + 34 + (i % 3) * 48;
    ctx.beginPath();
    ctx.ellipse(x, y, 92, 21, 0, 0, Math.PI * 2);
    ctx.ellipse(x + 54, y + 8, 62, 16, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // 원경 산
  ctx.save();
  ctx.globalAlpha = 0.45;
  const base1 = view.x * 0.72;
  for (let i = -2; i < 14; i++) {
    const bx = base1 + i * 250 - 260;
    const bh = 130 + ((i + 4) * 53) % 100;
    poly(ctx, [[bx, GROUND_Y - 40], [bx + 95, GROUND_Y - 40 - bh],
    [bx + 155, GROUND_Y - 40 - bh * 0.55], [bx + 250, GROUND_Y - 40]], stage.groundDark);
  }
  ctx.restore();

  // 중경 바위
  ctx.save();
  ctx.globalAlpha = 0.7;
  const base2 = view.x * 0.45;
  for (let i = -2; i < 18; i++) {
    const bx = base2 + i * 190 - 200;
    const bh = 55 + ((i + 3) * 37) % 78;
    poly(ctx, [[bx, GROUND_Y], [bx + 42, GROUND_Y - bh], [bx + 96, GROUND_Y]], stage.accent);
  }
  ctx.restore();

  // 지면
  const bottom = view.y + view.h;
  const fg = ctx.createLinearGradient(0, GROUND_Y, 0, bottom);
  fg.addColorStop(0, stage.ground);
  fg.addColorStop(1, stage.groundDark);
  ctx.fillStyle = fg;
  ctx.fillRect(view.x - 10, GROUND_Y, view.w + 20, bottom - GROUND_Y + 10);
  ctx.strokeStyle = 'rgba(0,0,0,0.3)';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(view.x - 10, GROUND_Y); ctx.lineTo(view.x + view.w + 10, GROUND_Y); ctx.stroke();

  // 바닥 원근 라인
  ctx.save();
  ctx.globalAlpha = 0.16;
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 2;
  const x0 = Math.floor(view.x / 120) * 120;
  for (let x = x0 - 120; x < view.x + view.w + 240; x += 120) {
    ctx.beginPath();
    ctx.moveTo(x, GROUND_Y);
    ctx.lineTo(x - 110, bottom + 10);
    ctx.stroke();
  }
  for (let j = 1; j < 6; j++) {
    const y = GROUND_Y + j * j * 4.2;
    ctx.beginPath(); ctx.moveTo(view.x - 10, y); ctx.lineTo(view.x + view.w + 10, y); ctx.stroke();
  }
  ctx.restore();
}

/** 디버그용 판정 박스 (?debug=1) */
function drawDebugBoxes(ctx, fighters) {
  ctx.save();
  ctx.lineWidth = 2;
  for (const f of fighters) {
    const h = f.hurtbox();
    ctx.strokeStyle = '#3ad1ff';
    ctx.strokeRect(h.x, h.y, h.w, h.h);
    const b = f.hitbox();
    if (b) { ctx.strokeStyle = '#ff3b5c'; ctx.strokeRect(b.x, b.y, b.w, b.h); }
    const bm = f.beamRect();
    if (bm) { ctx.strokeStyle = '#ffd24a'; ctx.strokeRect(bm.x, bm.y, bm.w, bm.h); }
    ctx.strokeStyle = '#ffffff';
    ctx.beginPath(); ctx.moveTo(f.x, f.y - 6); ctx.lineTo(f.x, f.y + 6); ctx.stroke();
  }
  ctx.restore();
}
