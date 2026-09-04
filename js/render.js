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
 *  SD(치비) 비율 : 머리가 크고 팔다리가 짧고 굵다.
 *  발끝이 원점(0,0), +x 가 바라보는 방향.
 *  주요 높이 - 골반 -52 / 가슴 -84 / 머리 중심 -106 (반지름 21)
 * ------------------------------------------- */
function basePose() {
  return {
    hip: P(0, -52), chest: P(2, -84), head: P(3, -106),
    shoulderF: P(8, -82), shoulderB: P(-6, -82),
    armF: [P(16, -70), P(23, -79)], armB: [P(-14, -70), P(-8, -82)],
    legF: [P(12, -26), P(15, 0)], legB: [P(-12, -26), P(-15, 0)],
    tilt: 0, headTilt: 0, scaleY: 1
  };
}

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
      p.armF = [mix(P(15, -74), P(30, -86), e), mix(P(19, -58), P(48, -87), e)];
      p.armB = [P(-13, -70), P(-3, -81)];
      p.chest = mix(p.chest, P(7, -84), e * 0.7);
      p.head = mix(p.head, P(6, -106), e * 0.5);
      break;
    case 'straight':
      p.armF = [mix(P(6, -76), P(32, -84), e), mix(P(-4, -64), P(60, -84), e)];
      p.armB = [P(-14, -70), P(-5, -82)];
      p.chest = mix(p.chest, P(11, -84), e);
      p.head = mix(p.head, P(10, -106), e * 0.6);
      p.hip = mix(p.hip, P(5, -52), e);
      p.legB = [P(-13, -27), P(-21, 0)];
      break;
    case 'roundhouse':
      p.legF = [mix(P(12, -32), P(28, -60), e), mix(P(14, -5), P(64, -70), e)];
      p.legB = [P(-5, -27), P(-7, 0)];
      p.armF = [P(4, -74), P(-6, -62)];
      p.armB = [P(-15, -76), P(-28, -88)];
      p.chest = mix(p.chest, P(-7, -86), e * 0.8);
      p.head = mix(p.head, P(-8, -107), e * 0.6);
      p.hip = mix(p.hip, P(-4, -53), e * 0.7);
      break;
    case 'lowKick':
      crouchPose(p, 1);
      p.legF = [mix(P(14, -20), P(26, -26), e), mix(P(17, -4), P(52, -22), e)];
      break;
    case 'sweep':
      crouchPose(p, 1.2);
      p.legF = [mix(P(14, -15), P(32, -15), e), mix(P(18, -3), P(72, -9), e)];
      p.armB = [P(-15, -36), P(-22, -22)];
      break;
    case 'uppercut':
      p.armF = [mix(P(12, -70), P(18, -100), e), mix(P(16, -56), P(24, -134), e)];
      p.armB = [P(-13, -70), P(-3, -81)];
      p.chest = mix(p.chest, P(0, -90), e);
      p.head = mix(p.head, P(1, -112), e);
      p.legF = [P(10, -28), P(12, 0)];
      p.legB = [mix(P(-9, -26), P(-14, -34), e), mix(P(-11, 0), P(-20, -12), e)];
      break;
    case 'airPunch':
      p.armF = [mix(P(14, -72), P(28, -78), e), mix(P(17, -57), P(50, -74), e)];
      p.armB = [P(-13, -71), P(-4, -82)];
      p.legF = [P(13, -32), P(18, -12)];
      p.legB = [P(-10, -30), P(-14, -10)];
      break;
    case 'airKick':
      p.legF = [mix(P(13, -34), P(30, -46), e), mix(P(16, -14), P(62, -42), e)];
      p.legB = [P(-10, -30), P(-13, -8)];
      p.armB = [P(-15, -80), P(-27, -92)];
      p.armF = [P(9, -76), P(2, -62)];
      break;
    case 'grab':
      p.armF = [mix(P(14, -76), P(26, -86), e), mix(P(18, -60), P(44, -86), e)];
      p.armB = [mix(P(-9, -76), P(18, -88), e), mix(P(-14, -60), P(38, -90), e)];
      p.chest = mix(p.chest, P(7, -84), e);
      break;
    case 'kiBlast': {
      const gs = Math.round(clamp(a.frame / def.startup, 0, 1) * ATTACK_STEPS);
      const g = gs / ATTACK_STEPS;
      p.key = 'kiBlast' + gs;
      p.armF = [mix(P(14, -72), P(26, -80), g), mix(P(18, -57), P(44, -80), g)];
      p.armB = [mix(P(-13, -72), P(16, -82), g), mix(P(-17, -57), P(38, -82), g)];
      p.chest = mix(p.chest, P(6, -84), g * 0.6);
      break;
    }
    case 'beam':
    case 'ultimate': {
      const charging = a.frame < def.startup;
      const gs = Math.round(clamp(a.frame / Math.max(1, def.startup), 0, 1) * ATTACK_STEPS);
      const g = charging ? gs / ATTACK_STEPS : 1;
      p.key = charging ? 'beamC' + gs : 'beamF';
      if (charging) {
        // 손을 허리 뒤로 모아 기를 응축
        p.armF = [mix(P(14, -72), P(-12, -74), g), mix(P(18, -57), P(-26, -68), g)];
        p.armB = [mix(P(-13, -72), P(-18, -76), g), mix(P(-17, -57), P(-30, -70), g)];
        p.chest = mix(p.chest, P(-7, -83), g);
        p.head = mix(p.head, P(-4, -105), g);
        p.hip = mix(p.hip, P(-3, -50), g);
        p.legF = [P(14, -28), P(20, 0)];
        p.legB = [P(-14, -28), P(-22, 0)];
      } else {
        // 발사 자세
        p.armF = [P(22, -78), P(42, -74)];
        p.armB = [P(15, -80), P(39, -70)];
        p.chest = P(9, -84);
        p.head = P(8, -106);
        p.hip = P(2, -52);
        p.legF = [P(18, -28), P(28, 0)];
        p.legB = [P(-16, -28), P(-26, 0)];
      }
      break;
    }
  }
  return p;
}

function crouchPose(p, amount) {
  const k = amount || 1;
  const d = 6 * (k - 1);
  p.hip = P(0, -30 + d);
  p.chest = P(3, -56 + d);
  p.head = P(5, -78 + d);
  p.shoulderF = P(9, -55 + d); p.shoulderB = P(-5, -55 + d);
  p.armF = [P(14, -44 + d), P(19, -32 + d)];
  p.armB = [P(-12, -44 + d), P(-17, -32 + d)];
  p.legF = [P(15, -14), P(19, 0)];
  p.legB = [P(-13, -14), P(-17, 0)];
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
    p.hip = P(-5, -18); p.chest = P(-22, -22); p.head = P(-44, -26);
    p.shoulderF = P(-20, -22); p.shoulderB = P(-24, -18);
    p.armF = [P(-34, -12), P(-48, -8)];
    p.armB = [P(-30, -30), P(-46, -34)];
    p.legF = [P(14, -20), P(30, -8)];
    p.legB = [P(12, -12), P(28, -3)];
    return p;
  }
  if (f.attack) return attackPose(f, p);

  switch (f.state) {
    case 'walk': {
      const ph = phaseOf(time, WALK_PERIOD, 6);
      const s = Math.sin(ph.t / 5);
      p.key = 'walk' + ph.i;
      p.legF = [P(12 + s * 9, -26), P(15 + s * 18, -Math.max(0, s) * 10)];
      p.legB = [P(-12 - s * 9, -26), P(-15 - s * 18, -Math.max(0, -s) * 10)];
      p.armF = [P(15 - s * 4, -70), P(22 - s * 7, -79)];
      p.armB = [P(-13 + s * 4, -70), P(-7 + s * 7, -82)];
      p.chest = P(3, -84 + Math.abs(s) * 1.6);
      p.head = P(4, -106 + Math.abs(s) * 1.6);
      break;
    }
    case 'walkBack': {
      const ph = phaseOf(time, WALK_BACK_PERIOD, 6);
      const s = Math.sin(ph.t / 6);
      p.key = 'back' + ph.i;
      p.legF = [P(12 - s * 7, -26), P(15 - s * 14, -Math.max(0, -s) * 7)];
      p.legB = [P(-12 + s * 7, -26), P(-15 + s * 14, -Math.max(0, s) * 7)];
      p.armF = [P(15, -71), P(21, -80)];
      p.armB = [P(-12, -71), P(-3, -82)];
      break;
    }
    case 'dash':
      p.key = 'dash';
      p.chest = P(11, -83); p.head = P(14, -105); p.hip = P(4, -51);
      p.armF = [P(2, -72), P(-12, -66)];
      p.armB = [P(-8, -74), P(-26, -72)];
      p.legF = [P(17, -26), P(26, -6)];
      p.legB = [P(-12, -28), P(-22, -2)];
      break;
    case 'crouch':
      p.key = 'crouch';
      crouchPose(p, 1);
      break;
    case 'crouchGuard':
      p.key = 'crouchGuard';
      crouchPose(p, 1);
      p.armF = [P(12, -50), P(18, -64)];
      p.armB = [P(3, -48), P(11, -60)];
      break;
    case 'guard':
      p.key = 'guard';
      p.armF = [P(13, -76), P(19, -92)];
      p.armB = [P(3, -74), P(11, -88)];
      p.chest = P(-3, -84); p.head = P(0, -106);
      p.legF = [P(11, -26), P(14, 0)]; p.legB = [P(-13, -26), P(-17, 0)];
      break;
    case 'jump':
    case 'launched': {
      const rising = f.vy < 0;
      p.key = rising ? 'jumpUp' : 'jumpDown';
      p.legF = [P(13, -34), P(17, -16)];
      p.legB = [P(-9, -32), P(-13, -14)];
      p.armF = rising ? [P(14, -92), P(18, -108)] : [P(16, -71), P(24, -80)];
      p.armB = rising ? [P(-12, -92), P(-16, -106)] : [P(-14, -71), P(-6, -82)];
      p.chest = P(2, -84); p.head = P(3, -106);
      break;
    }
    case 'hurt':
    case 'hurtAir':
      p.key = 'hurt';
      p.chest = P(-10, -84); p.head = P(-16, -104); p.hip = P(-3, -52);
      p.armF = [P(6, -76), P(0, -92)];
      p.armB = [P(-16, -76), P(-28, -88)];
      p.legF = [P(11, -26), P(16, 0)];
      p.legB = [P(-6, -26), P(-11, 0)];
      break;
    case 'charge': {
      const ph = phaseOf(time, BOB_PERIOD, 4);
      const bob = Math.sin(ph.t / 16) * 2;
      p.key = 'charge' + ph.i;
      p.armF = [P(17, -68), P(12, -52)];
      p.armB = [P(-15, -68), P(-10, -52)];
      p.chest = P(0, -84 + bob * 0.4); p.head = P(2, -106 + bob * 0.4);
      p.legF = [P(15, -26), P(20, 0)];
      p.legB = [P(-15, -26), P(-20, 0)];
      break;
    }
    case 'win': {
      const ph = phaseOf(time, BOB_PERIOD, 4);
      const bob = Math.sin(ph.t / 16) * 2;
      p.key = 'win' + ph.i;
      p.armF = [P(14, -90), P(17, -118)];
      p.armB = [P(-12, -70), P(-3, -81)];
      p.chest = P(2, -85 + bob); p.head = P(3, -107 + bob);
      break;
    }
    case 'wakeup':
      p.key = 'wakeup';
      crouchPose(p, 1.15);
      break;
    default: {
      const ph = phaseOf(time, BOB_PERIOD, 4);
      const bob = Math.sin(ph.t / 16) * 1.6;
      p.key = 'idle' + ph.i;
      p.chest = P(2, -84 + bob * 0.6);
      p.head = P(3, -106 + bob * 0.6);
      p.armF = [P(16, -70 + bob * 0.3), P(23, -79 + bob * 0.5)];
      p.armB = [P(-14, -70 + bob * 0.3), P(-8, -82 + bob * 0.5)];
    }
  }
  return p;
}

/* ---------------- 헤어 / 머리 ---------------- */
const HEAD_R = 21;
const HAIR_SCALE = HEAD_R / 15;   // 기존 헤어 도형을 커진 머리에 맞춰 확대

/** 머리 뒤쪽 실루엣(얼굴보다 아래 레이어) */
function drawHairBack(ctx, ch, f, time, hair, hairLit) {
  const c = ch.colors;
  const wobble = (f.charging || f.ki >= 100) ? 2.2 : 0;
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

function drawHead(ctx, p, ch, f, time) {
  const c = ch.colors;
  const superSaiyan = (ch.id === 'goku' || ch.id === 'vegeta' || ch.id === 'trunks') && f.ki >= 100;
  const hair = superSaiyan ? '#ffdf3d' : c.hair;
  const hairLit = superSaiyan ? '#fff3a0' : c.hairLit;
  const skinLight = shade(c.skin, 0.2);

  ctx.save();
  ctx.translate(p.head[0], p.head[1]);

  // 목 (짧고 굵게) + 턱밑 그림자
  capsule(ctx, p.chest[0] - p.head[0], p.chest[1] - p.head[1], 0, 13, 13, c.skinDark);
  capsule(ctx, -5, 12, 6, 12, 7, shade(c.skinDark, -0.3));

  ctx.save(); ctx.scale(HAIR_SCALE, HAIR_SCALE);
  drawHairBack(ctx, ch, f, time, hair, hairLit);
  ctx.restore();

  // 얼굴 (SD 비율 : 크고 둥글게)
  ctx.fillStyle = edgeOf(c.skin);
  ctx.beginPath(); ctx.ellipse(1, 1, HEAD_R + 0.6, HEAD_R + 1.6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = c.skin;
  ctx.beginPath(); ctx.ellipse(1, 1, HEAD_R - 1, HEAD_R, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = skinLight;
  ctx.beginPath(); ctx.ellipse(7, -5, 9, 7.5, 0, 0, Math.PI * 2); ctx.fill();     // 이마 하이라이트
  ctx.fillStyle = c.skinDark;
  ctx.beginPath(); ctx.ellipse(-11, 5, 8, 12, 0, 0, Math.PI * 2); ctx.fill();     // 뒤통수 그늘
  if (ch.hairStyle !== 'piccolo' && ch.hairStyle !== 'frieza' && ch.hairStyle !== 'cell') {
    ctx.beginPath(); ctx.ellipse(-17, 2, 4.4, 6, 0, 0, Math.PI * 2); ctx.fill();  // 귀
    ctx.fillStyle = shade(c.skinDark, -0.25);
    ctx.beginPath(); ctx.ellipse(-17, 2, 1.8, 3, 0, 0, Math.PI * 2); ctx.fill();
  }

  ctx.save(); ctx.scale(HAIR_SCALE, HAIR_SCALE);
  drawHairFront(ctx, ch, f, time, hair, hairLit);
  ctx.restore();

  // ---- 표정 (SD 애니 얼굴 : 눈이 크고 또렷하다) ----
  const hurt = f.hitstun > 0 || f.state === 'hurt' || f.state === 'hurtAir';
  const angry = !!f.attack || f.charging || hurt;
  if (f.state === 'ko') {
    capsule(ctx, 2, 1, 13, 10, 3, c.eye);
    capsule(ctx, 13, 1, 2, 10, 3, c.eye);
    capsule(ctx, -6, 2, 2, 9, 3, c.eye);
    capsule(ctx, 2, 2, -6, 9, 3, c.eye);
    ctx.fillStyle = '#7a2f2f';
    ctx.beginPath(); ctx.ellipse(5, 15, 5, 3.4, 0, 0, Math.PI * 2); ctx.fill();
  } else {
    // 흰자
    ctx.fillStyle = '#f6f3ec';
    ctx.beginPath(); ctx.ellipse(11, 4, 5.2, hurt ? 6.4 : 5.6, -0.12, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(-0.5, 4, 4.4, hurt ? 5.6 : 4.9, 0.12, 0, Math.PI * 2); ctx.fill();
    // 눈동자 (바깥쪽으로 붙여 흰자가 안쪽에 남게)
    ctx.fillStyle = c.eye;
    ctx.beginPath(); ctx.ellipse(12.4, 4.4, 3.4, hurt ? 5.2 : 4.4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(0.7, 4.4, 3.0, hurt ? 4.6 : 3.9, 0, 0, Math.PI * 2); ctx.fill();
    // 눈 하이라이트
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(13.2, 1.8, 1.8, 2);
    ctx.fillRect(1.4, 2, 1.4, 1.6);
    // 윗눈꺼풀 라인 + 눈썹
    capsule(ctx, 7, -1.6, 16, -2.4, 2.4, c.eye);
    capsule(ctx, -4.6, -1.6, 3.6, -2.2, 2.2, c.eye);
    capsule(ctx, -5, angry ? -7 : -6, 4, angry ? -10 : -9, 2.6, c.eye);
    capsule(ctx, 8, angry ? -11.5 : -10.5, 17, angry ? -6.5 : -7.5, 2.6, c.eye);
    // 코 / 입
    capsule(ctx, 16, 8, 17.5, 9.5, 2, shade(c.skinDark, -0.3));
    if (hurt || f.attack || f.charging) {
      ctx.fillStyle = '#7a2f2f';
      ctx.beginPath(); ctx.ellipse(8, 14, 5.4, 4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#efe3dc';
      ctx.fillRect(4.4, 11.6, 7, 1.8);
    } else {
      capsule(ctx, 4, 14, 11, 14, 2.4, '#8a3b3b');
    }
  }
  ctx.restore();
}

/* ---------------- 오라 ---------------- */
function drawAura(ctx, f, time, ch) {
  if (f.state === 'ko' || f.state === 'knockdown') return;
  const level = f.charging ? 1 : (f.ki >= 100 ? 0.9 : f.ki >= 60 ? 0.55 : 0);
  if (level <= 0) return;
  const c = ch.colors.aura;
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

/* ---------------- 캐릭터 본체 ---------------- */

/** 부위별 외곽선 색 (기본색을 아주 어둡게) */
const edgeOf = col => shade(col, -0.62);

/**
 * 팔다리 : 외곽선 + 아래쪽 그림자 + 기본색 + 윗면 하이라이트.
 * 부위마다 외곽선을 둘러야 겹쳐도 형태가 또렷하게 읽힌다.
 */
function limbShaded(ctx, a, b, c, w, base, dark, light) {
  const edge = edgeOf(base);
  capsule(ctx, a[0], a[1], b[0], b[1], w + 3, edge);
  capsule(ctx, b[0], b[1], c[0], c[1], w * 0.88 + 3, edge);
  capsule(ctx, a[0], a[1] + 2.4, b[0], b[1] + 2.4, w, dark);
  capsule(ctx, b[0], b[1] + 2.4, c[0], c[1] + 2.4, w * 0.88, dark);
  capsule(ctx, a[0], a[1], b[0], b[1], w, base);
  capsule(ctx, b[0], b[1], c[0], c[1], w * 0.88, base);
  capsule(ctx, a[0], a[1] - 2.6, b[0], b[1] - 2.6, w * 0.36, light);
  capsule(ctx, b[0], b[1] - 2.4, c[0], c[1] - 2.4, w * 0.3, light);
}

/** 방향 벡터 : 관절 -> 끝. 세운 상태면 앞(+x), 뻗었으면 팔다리 방향 */
function tipDir(joint, tip) {
  let dx = tip[0] - joint[0], dy = tip[1] - joint[1];
  const len = Math.hypot(dx, dy) || 1;
  dx /= len; dy /= len;
  return Math.abs(dx) > Math.abs(dy) ? [dx, dy] : [1, 0];
}

/** 부츠 : 목 + 발등 + 밑창 (SD 비율에 맞춰 큼직하게) */
function drawBoot(ctx, knee, foot, base, dark, light) {
  const [tx, ty] = tipDir(knee, foot);
  const bx = foot[0] - tx * 4, by = foot[1] - ty * 4;
  const ex = foot[0] + tx * 9, ey = foot[1] + ty * 9;
  const edge = edgeOf(base);
  capsule(ctx, bx, by - 9, bx, by - 14, 18, edge);
  capsule(ctx, bx, by - 5, ex, ey - 5, 18, edge);
  capsule(ctx, bx, by - 9, bx, by - 14, 15, dark);            // 부츠 목
  capsule(ctx, bx, by - 10, bx, by - 14, 12.5, base);
  capsule(ctx, bx, by - 6, ex, ey - 6, 14.5, base);           // 발등
  capsule(ctx, bx, by - 1, ex, ey - 1, 6, dark);              // 밑창
  capsule(ctx, bx + tx, by - 11, ex - tx * 3.5, ey - ty * 3.5 - 11, 5, light);
}

/** 장갑/주먹 : 손등 + 손목 밴드 + 하이라이트 */
function drawGlove(ctx, wrist, hand, r, base, dark, light) {
  const [tx, ty] = tipDir(wrist, hand);
  ctx.fillStyle = edgeOf(base);
  ctx.beginPath(); ctx.arc(hand[0], hand[1], r + 1.6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = dark;
  ctx.beginPath(); ctx.arc(hand[0], hand[1] + 1.6, r, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = base;
  ctx.beginPath(); ctx.arc(hand[0], hand[1], r, 0, Math.PI * 2); ctx.fill();
  capsule(ctx, hand[0] - tx * r * 0.9, hand[1] - ty * r * 0.9,
    hand[0] - tx * r * 1.5, hand[1] - ty * r * 1.5, r * 1.5, base);   // 손목 밴드
  ctx.fillStyle = light;
  ctx.beginPath(); ctx.arc(hand[0] - r * 0.15, hand[1] - r * 0.42, r * 0.34, 0, Math.PI * 2); ctx.fill();
  capsule(ctx, hand[0] - r * 0.45, hand[1] + r * 0.4, hand[0] + r * 0.5, hand[1] + r * 0.25, 1.6, dark);
}

/**
 * 캐릭터 리그(몸통/팔다리/머리)를 원점(발끝) 기준으로 그린다.
 * 스프라이트를 구울 때도, 스프라이트 없이 직접 그릴 때도 같은 함수를 쓴다.
 */
function drawFighterRig(ctx, f, p, time) {
  const ch = f.char, c = ch.colors;
  const gi = c.gi, giDark = c.giDark, giLight = shade(c.gi, 0.24);
  const sleeve = c.sleeve || c.gi, sleeveDark = c.sleeveDark || c.giDark;
  const sleeveLight = shade(sleeve, 0.24);
  const belt = c.belt || c.trim, beltDark = c.beltDark || c.trimDark;
  const boot = c.boot || c.trim, bootDark = c.bootDark || c.trimDark;
  const bootLight = shade(boot, 0.3);
  const glove = c.glove || c.skin, gloveDark = c.gloveDark || c.skinDark;
  const gloveLight = shade(glove, 0.26);

  // ---- 뒤쪽 팔다리 (한 단계 어둡게 해서 깊이감) ----
  limbShaded(ctx, p.hip, p.legB[0], p.legB[1], 18.5,
    giDark, shade(giDark, -0.3), shade(giDark, 0.14));
  drawBoot(ctx, p.legB[0], p.legB[1], bootDark, shade(bootDark, -0.35), shade(bootDark, 0.16));
  limbShaded(ctx, p.shoulderB, p.armB[0], p.armB[1], 13,
    sleeveDark, shade(sleeveDark, -0.3), shade(sleeveDark, 0.14));
  drawGlove(ctx, p.armB[0], p.armB[1], 6.8, gloveDark, shade(gloveDark, -0.28), glove);

  // ---- 몸통 (SD 비율이라 짧고 두툼하게) ----
  const hipL = [p.hip[0] - 16, p.hip[1] + 6], hipR = [p.hip[0] + 16, p.hip[1] + 6];
  const chL = [p.chest[0] - 19, p.chest[1] - 2], chR = [p.chest[0] + 19, p.chest[1] - 2];
  ctx.save();
  ctx.strokeStyle = edgeOf(gi); ctx.lineWidth = 3.2; ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(hipL[0], hipL[1]); ctx.lineTo(chL[0], chL[1]);
  ctx.lineTo(chR[0], chR[1]); ctx.lineTo(hipR[0], hipR[1]);
  ctx.closePath(); ctx.stroke();
  ctx.restore();
  poly(ctx, [hipL, chL, chR, hipR], gi);
  poly(ctx, [hipL, chL, [chL[0] + 8, chL[1] + 3], [hipL[0] + 7, hipL[1]]], giDark);
  poly(ctx, [[chR[0] - 9, chR[1] + 4], chR, [hipR[0] - 3, hipR[1] - 5]], giLight);

  // 도복 깃 / 상의 디테일
  if (/^(goku|vegeta|trunks|piccolo|gohan)$/.test(ch.id)) {
    poly(ctx, [
      [p.chest[0] - 6, p.chest[1] - 4], [p.chest[0] + 16, p.chest[1] - 4],
      [p.hip[0] + 7, p.hip[1] + 4], [p.hip[0] - 3, p.hip[1] + 4]
    ], c.trim);
    poly(ctx, [
      [p.chest[0] + 9, p.chest[1] - 3], [p.chest[0] + 16, p.chest[1] - 4],
      [p.hip[0] + 7, p.hip[1] + 4], [p.hip[0] + 3, p.hip[1] + 4]
    ], shade(c.trim, -0.22));
  } else {
    ctx.fillStyle = giDark;
    ctx.fillRect(p.chest[0] - 13, p.chest[1] + 6, 26, 12);
    ctx.fillStyle = shade(gi, 0.18);
    ctx.fillRect(p.chest[0] - 13, p.chest[1] + 6, 26, 3);
  }

  // 전투복 갑옷 (있는 캐릭터만)
  if (c.armor) {
    const ar = c.armor;
    poly(ctx, [
      [p.chest[0] - 18, p.chest[1] - 1], [p.chest[0] + 18, p.chest[1] - 1],
      [p.chest[0] + 15, p.chest[1] + 20], [p.chest[0] - 15, p.chest[1] + 20]
    ], ar.plate);
    poly(ctx, [
      [p.chest[0] + 6, p.chest[1] - 1], [p.chest[0] + 18, p.chest[1] - 1],
      [p.chest[0] + 15, p.chest[1] + 20], [p.chest[0] + 5, p.chest[1] + 20]
    ], ar.plateDark);
    // 어깨 패드
    capsule(ctx, p.shoulderF[0] - 2, p.shoulderF[1] - 1, p.shoulderF[0] + 8, p.shoulderF[1] + 1, 13, ar.pad);
    capsule(ctx, p.shoulderB[0] + 1, p.shoulderB[1] - 1, p.shoulderB[0] - 7, p.shoulderB[1] + 1, 12, ar.padDark);
    capsule(ctx, p.shoulderF[0] - 1, p.shoulderF[1] - 4, p.shoulderF[0] + 6, p.shoulderF[1] - 3, 4, shade(ar.pad, 0.3));
  }

  // 가슴 음영
  ctx.save();
  ctx.globalAlpha = 0.2;
  capsule(ctx, p.chest[0] - 10, p.chest[1] + 12, p.chest[0] + 10, p.chest[1] + 12, 4, shade(gi, -0.5));
  ctx.restore();

  // ---- 벨트 ----
  capsule(ctx, p.hip[0] - 15, p.hip[1] + 3, p.hip[0] + 15, p.hip[1] + 3, 11, belt);
  capsule(ctx, p.hip[0] - 14, p.hip[1] + 6.5, p.hip[0] + 14, p.hip[1] + 6.5, 3.6, beltDark);
  capsule(ctx, p.hip[0] - 13, p.hip[1] - 0.5, p.hip[0] + 12, p.hip[1] - 0.5, 2.8, shade(belt, 0.3));
  ctx.fillStyle = beltDark;
  ctx.fillRect(p.hip[0] - 3, p.hip[1] - 2, 7, 11);
  capsule(ctx, p.hip[0] - 2, p.hip[1] + 8, p.hip[0] - 6, p.hip[1] + 20, 4, belt);
  capsule(ctx, p.hip[0] + 3, p.hip[1] + 8, p.hip[0] + 6, p.hip[1] + 17, 3.4, beltDark);

  // ---- 앞쪽 팔다리 ----
  limbShaded(ctx, p.hip, p.legF[0], p.legF[1], 19.5, gi, giDark, giLight);
  drawBoot(ctx, p.legF[0], p.legF[1], boot, bootDark, bootLight);
  limbShaded(ctx, p.shoulderF, p.armF[0], p.armF[1], 14.5, sleeve, sleeveDark, sleeveLight);
  drawGlove(ctx, p.armF[0], p.armF[1], 7.6, glove, gloveDark, gloveLight);

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
    const fg = ctx.createRadialGradient(0, -66, 6, 0, -66, 78);
    fg.addColorStop(0, '#fff6d0');
    fg.addColorStop(0.45, 'rgba(255,210,120,0.5)');
    fg.addColorStop(1, 'rgba(255,150,60,0)');
    ctx.fillStyle = fg;
    ctx.beginPath(); ctx.arc(0, -66, 78, 0, Math.PI * 2); ctx.fill();
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
    ctx.ellipse(f.x + f.facing * 16, f.y - 58, 32, 58, 0, 0, Math.PI * 2);
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
  const color = def === MOVES.ultimate ? f.char.ultimate.color : f.char.special.color;
  const core = def === MOVES.ultimate ? f.char.ultimate.core : f.char.special.core;
  const cy = rect.y + rect.h / 2;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 3; i++) {
    const hh = rect.h * (1 - i * 0.28) * (1 + Math.sin(time / 3 + i) * 0.05);
    ctx.globalAlpha = i === 2 ? 0.95 : 0.4;
    ctx.fillStyle = i === 2 ? core : color;
    ctx.fillRect(rect.x, cy - hh / 2, rect.w, hh);
  }
  // 발사구 플레어
  const ox = f.x + f.facing * 38;
  const g = ctx.createRadialGradient(ox, cy, 0, ox, cy, rect.h * 1.6);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.4, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(ox, cy, rect.h * 1.6, 0, Math.PI * 2);
  ctx.fill();
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
