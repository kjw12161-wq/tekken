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

/* ---------------- 포즈 정의 ---------------- */
function basePose() {
  return {
    hip: P(0, -62), chest: P(2, -102), head: P(4, -132),
    shoulderF: P(8, -100), shoulderB: P(-6, -100),
    armF: [P(18, -86), P(24, -66)], armB: [P(-14, -86), P(-20, -66)],
    legF: [P(11, -32), P(13, 0)], legB: [P(-11, -32), P(-13, 0)],
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
      p.armF = [mix(P(18, -92), P(34, -104), e), mix(P(20, -74), P(58, -104), e)];
      p.armB = [P(-16, -88), P(-24, -74)];
      p.chest = mix(p.chest, P(8, -102), e * 0.6);
      break;
    case 'straight':
      p.armF = [mix(P(4, -92), P(38, -100), e), mix(P(-10, -80), P(76, -100), e)];
      p.armB = [P(-18, -90), P(-30, -80)];
      p.chest = mix(p.chest, P(12, -100), e);
      p.hip = mix(p.hip, P(6, -62), e);
      p.legB = [P(-16, -34), P(-24, 0)];
      break;
    case 'roundhouse':
      p.legF = [mix(P(14, -40), P(34, -80), e), mix(P(16, -6), P(80, -92), e)];
      p.legB = [P(-6, -34), P(-8, 0)];
      p.armF = [P(6, -92), P(-6, -78)];
      p.armB = [P(-18, -92), P(-34, -104)];
      p.chest = mix(p.chest, P(-8, -104), e * 0.7);
      p.hip = mix(p.hip, P(-4, -64), e * 0.6);
      break;
    case 'lowKick':
      crouchPose(p, 1);
      p.legF = [mix(P(16, -24), P(32, -30), e), mix(P(20, -6), P(66, -26), e)];
      break;
    case 'sweep':
      crouchPose(p, 1.25);
      p.legF = [mix(P(16, -18), P(40, -18), e), mix(P(22, -4), P(90, -10), e)];
      p.armB = [P(-18, -40), P(-26, -22)];
      break;
    case 'uppercut':
      p.armF = [mix(P(14, -84), P(20, -118), e), mix(P(18, -64), P(28, -158), e)];
      p.armB = [P(-16, -88), P(-22, -70)];
      p.chest = mix(p.chest, P(0, -108), e);
      p.head = mix(p.head, P(2, -138), e);
      p.legF = [P(12, -34), P(14, 0)];
      p.legB = [mix(P(-11, -32), P(-16, -40), e), mix(P(-13, 0), P(-22, -14), e)];
      break;
    case 'airPunch':
      p.armF = [mix(P(16, -86), P(32, -92), e), mix(P(18, -66), P(60, -84), e)];
      p.legF = [P(16, -34), P(22, -6)];
      p.legB = [P(-12, -30), P(-16, -8)];
      break;
    case 'airKick':
      p.legF = [mix(P(16, -40), P(36, -58), e), mix(P(20, -8), P(78, -52), e)];
      p.legB = [P(-12, -30), P(-14, -4)];
      p.armB = [P(-18, -94), P(-32, -108)];
      p.armF = [P(10, -92), P(2, -74)];
      break;
    case 'grab':
      p.armF = [mix(P(16, -92), P(30, -102), e), mix(P(20, -74), P(54, -102), e)];
      p.armB = [mix(P(-8, -92), P(22, -104), e), mix(P(-14, -74), P(46, -108), e)];
      p.chest = mix(p.chest, P(8, -102), e);
      break;
    case 'kiBlast': {
      const gs = Math.round(clamp(a.frame / def.startup, 0, 1) * ATTACK_STEPS);
      const g = gs / ATTACK_STEPS;
      p.key = 'kiBlast' + gs;
      p.armF = [mix(P(14, -88), P(30, -96), g), mix(P(16, -70), P(52, -96), g)];
      p.armB = [mix(P(-14, -88), P(18, -96), g), mix(P(-18, -70), P(44, -98), g)];
      break;
    }
    case 'beam':
    case 'ultimate': {
      const charging = a.frame < def.startup;
      const gs = Math.round(clamp(a.frame / Math.max(1, def.startup), 0, 1) * ATTACK_STEPS);
      const g = charging ? gs / ATTACK_STEPS : 1;
      p.key = charging ? 'beamC' + gs : 'beamF';
      if (charging) {
        // 손을 뒤로 모아 기를 응축
        p.armF = [mix(P(14, -88), P(-16, -92), g), mix(P(18, -70), P(-30, -86), g)];
        p.armB = [mix(P(-14, -88), P(-22, -94), g), mix(P(-18, -70), P(-34, -88), g)];
        p.chest = mix(p.chest, P(-8, -100), g);
        p.hip = mix(p.hip, P(-4, -58), g);
        p.legF = [P(16, -34), P(22, 0)];
        p.legB = [P(-16, -34), P(-24, 0)];
      } else {
        // 발사 자세
        p.armF = [P(24, -92), P(46, -88)];
        p.armB = [P(16, -94), P(44, -84)];
        p.chest = P(10, -100);
        p.hip = P(2, -60);
        p.legF = [P(20, -34), P(30, 0)];
        p.legB = [P(-18, -34), P(-28, 0)];
      }
      break;
    }
  }
  return p;
}

function crouchPose(p, amount) {
  const k = amount || 1;
  const d = 8 * (k - 1);
  p.hip = P(0, -32 + d);
  p.chest = P(3, -60 + d);
  p.head = P(7, -86 + d);
  p.shoulderF = P(9, -60 + d); p.shoulderB = P(-5, -60 + d);
  p.armF = [P(15, -50 + d), P(21, -34 + d)];
  p.armB = [P(-13, -50 + d), P(-19, -34 + d)];
  p.legF = [P(18, -18), P(23, 0)];
  p.legB = [P(-15, -18), P(-20, 0)];
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
    p.hip = P(-6, -22); p.chest = P(-26, -26); p.head = P(-48, -30);
    p.shoulderF = P(-24, -26); p.shoulderB = P(-28, -22);
    p.armF = [P(-40, -14), P(-56, -8)];
    p.armB = [P(-34, -34), P(-52, -40)];
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
      p.legF = [P(11 + s * 10, -32), P(13 + s * 22, -Math.max(0, s) * 12)];
      p.legB = [P(-11 - s * 10, -32), P(-13 - s * 22, -Math.max(0, -s) * 12)];
      p.armF = [P(16 - s * 8, -86), P(22 - s * 16, -68)];
      p.armB = [P(-14 + s * 8, -86), P(-20 + s * 16, -68)];
      p.chest = P(4, -102 + Math.abs(s) * 2);
      break;
    }
    case 'walkBack': {
      const ph = phaseOf(time, WALK_BACK_PERIOD, 6);
      const s = Math.sin(ph.t / 6);
      p.key = 'back' + ph.i;
      p.legF = [P(11 - s * 8, -32), P(13 - s * 18, -Math.max(0, -s) * 9)];
      p.legB = [P(-11 + s * 8, -32), P(-13 + s * 18, -Math.max(0, s) * 9)];
      p.armF = [P(14, -88), P(16, -70)];
      p.armB = [P(-14, -88), P(-18, -70)];
      break;
    }
    case 'dash':
      p.key = 'dash';
      p.chest = P(12, -100); p.head = P(16, -128); p.hip = P(4, -60);
      p.armF = [P(2, -90), P(-16, -84)];
      p.armB = [P(-10, -92), P(-32, -90)];
      p.legF = [P(20, -32), P(30, -6)];
      p.legB = [P(-14, -34), P(-26, -2)];
      break;
    case 'crouch':
      p.key = 'crouch';
      crouchPose(p, 1);
      break;
    case 'crouchGuard':
      p.key = 'crouchGuard';
      crouchPose(p, 1);
      p.armF = [P(12, -54), P(20, -72)];
      p.armB = [P(4, -52), P(16, -68)];
      break;
    case 'guard':
      p.key = 'guard';
      p.armF = [P(12, -94), P(20, -116)];
      p.armB = [P(2, -92), P(14, -112)];
      p.chest = P(-4, -102); p.head = P(0, -132);
      p.legF = [P(10, -32), P(12, 0)]; p.legB = [P(-13, -32), P(-17, 0)];
      break;
    case 'jump':
    case 'launched': {
      const rising = f.vy < 0;
      p.key = rising ? 'jumpUp' : 'jumpDown';
      p.legF = [P(14, -44), P(18, -18)];
      p.legB = [P(-10, -40), P(-14, -14)];
      p.armF = rising ? [P(16, -100), P(22, -124)] : [P(18, -84), P(26, -64)];
      p.armB = rising ? [P(-14, -100), P(-20, -122)] : [P(-16, -84), P(-24, -64)];
      p.chest = P(2, -100); p.head = P(4, -130);
      break;
    }
    case 'hurt':
    case 'hurtAir':
      p.key = 'hurt';
      p.chest = P(-14, -100); p.head = P(-22, -128); p.hip = P(-4, -62);
      p.armF = [P(4, -92), P(-6, -108)];
      p.armB = [P(-20, -92), P(-34, -104)];
      p.legF = [P(14, -32), P(20, 0)];
      p.legB = [P(-8, -32), P(-14, 0)];
      break;
    case 'charge': {
      const ph = phaseOf(time, BOB_PERIOD, 4);
      const bob = Math.sin(ph.t / 16) * 2;
      p.key = 'charge' + ph.i;
      p.armF = [P(20, -84), P(14, -62)];
      p.armB = [P(-20, -84), P(-14, -62)];
      p.chest = P(0, -100 + bob * 0.4); p.head = P(2, -130 + bob * 0.4);
      p.legF = [P(18, -32), P(24, 0)];
      p.legB = [P(-18, -32), P(-24, 0)];
      break;
    }
    case 'win': {
      const ph = phaseOf(time, BOB_PERIOD, 4);
      const bob = Math.sin(ph.t / 16) * 2;
      p.key = 'win' + ph.i;
      p.armF = [P(16, -110), P(20, -148)];
      p.armB = [P(-14, -88), P(-18, -66)];
      p.chest = P(2, -104 + bob); p.head = P(4, -134 + bob);
      break;
    }
    case 'wakeup':
      p.key = 'wakeup';
      crouchPose(p, 1.2);
      break;
    default: {
      const ph = phaseOf(time, BOB_PERIOD, 4);
      const bob = Math.sin(ph.t / 16) * 2;
      p.key = 'idle' + ph.i;
      p.chest = P(2, -102 + bob * 0.6);
      p.head = P(4, -132 + bob * 0.6);
      p.armF = [P(18, -86 + bob * 0.3), P(24, -66 + bob * 0.4)];
      p.armB = [P(-14, -86 + bob * 0.3), P(-20, -66 + bob * 0.4)];
    }
  }
  return p;
}

/* ---------------- 헤어 / 머리 ---------------- */
const HEAD_R = 15;

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
  const skinLight = shade(c.skin, 0.22);

  ctx.save();
  ctx.translate(p.head[0], p.head[1]);

  // 목 (턱 밑 그림자 포함)
  capsule(ctx, p.chest[0] - p.head[0], p.chest[1] - p.head[1], 0, 9, 11, c.skinDark);
  capsule(ctx, -4, 8, 5, 8, 6, shade(c.skinDark, -0.3));

  drawHairBack(ctx, ch, f, time, hair, hairLit);

  // 얼굴
  ctx.fillStyle = c.skin;
  ctx.beginPath(); ctx.ellipse(1, 1, HEAD_R - 1, HEAD_R, 0, 0, Math.PI * 2); ctx.fill();
  // 광대 / 턱 하이라이트
  ctx.fillStyle = skinLight;
  ctx.beginPath(); ctx.ellipse(6, -3, 6.5, 5.5, 0, 0, Math.PI * 2); ctx.fill();
  // 뒤통수 쪽 그늘
  ctx.fillStyle = c.skinDark;
  ctx.beginPath(); ctx.ellipse(-8, 4, 6, 8.5, 0, 0, Math.PI * 2); ctx.fill();
  if (ch.hairStyle !== 'piccolo' && ch.hairStyle !== 'frieza' && ch.hairStyle !== 'cell') {
    ctx.beginPath(); ctx.ellipse(-12, 2, 3.4, 4.6, 0, 0, Math.PI * 2); ctx.fill();  // 귀
    ctx.fillStyle = shade(c.skinDark, -0.25);
    ctx.beginPath(); ctx.ellipse(-12, 2, 1.4, 2.2, 0, 0, Math.PI * 2); ctx.fill();
  }

  drawHairFront(ctx, ch, f, time, hair, hairLit);

  // ---- 표정 ----
  const hurt = f.hitstun > 0 || f.state === 'hurt' || f.state === 'hurtAir';
  const angry = !!f.attack || f.charging || hurt;
  if (f.state === 'ko') {
    capsule(ctx, 3, 0, 12, 7, 2.4, c.eye);
    capsule(ctx, 12, 0, 3, 7, 2.4, c.eye);
    capsule(ctx, 3, 12, 12, 12, 3, '#8a3b3b');
  } else {
    // 흰자 + 눈동자 + 하이라이트
    ctx.fillStyle = '#f2efe8';
    ctx.beginPath(); ctx.ellipse(8.2, 4, 3.0, hurt ? 3.4 : 2.9, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(-0.4, 4, 2.5, hurt ? 3 : 2.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = c.eye;   // 눈동자를 바깥쪽으로 크게 - 흰자가 안쪽에 초승달로 남는다
    ctx.beginPath(); ctx.ellipse(9.5, 4, 2.1, hurt ? 3.1 : 2.7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(0.5, 4, 1.8, hurt ? 2.7 : 2.3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(10.1, 2.4, 1, 1.2);
    // 눈썹 (눈과 붙지 않도록 한 칸 위로)
    capsule(ctx, -4, angry ? -5 : -4, 3, angry ? -7 : -6, 2, c.eye);
    capsule(ctx, 6.5, angry ? -8 : -7, 13, angry ? -4 : -5, 2, c.eye);
    // 코 / 입
    capsule(ctx, 12, 6.5, 13.5, 7.5, 1.6, shade(c.skinDark, -0.3));
    if (hurt || f.attack || f.charging) {
      ctx.fillStyle = '#7a2f2f';
      ctx.beginPath(); ctx.ellipse(7, 11, 4.2, 3.2, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#efe3dc';
      ctx.fillRect(4.4, 9.4, 5.2, 1.4);
    } else {
      capsule(ctx, 3.5, 11, 9.5, 11, 2, '#8a3b3b');
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

/** 팔다리 : 아래쪽 그림자 + 기본색 + 윗면 하이라이트 3단 (빛은 항상 위에서) */
function limbShaded(ctx, a, b, c, w, base, dark, light) {
  capsule(ctx, a[0], a[1] + 2.2, b[0], b[1] + 2.2, w, dark);
  capsule(ctx, b[0], b[1] + 2.2, c[0], c[1] + 2.2, w * 0.86, dark);
  capsule(ctx, a[0], a[1], b[0], b[1], w, base);
  capsule(ctx, b[0], b[1], c[0], c[1], w * 0.86, base);
  capsule(ctx, a[0], a[1] - 2.4, b[0], b[1] - 2.4, w * 0.38, light);
  capsule(ctx, b[0], b[1] - 2.2, c[0], c[1] - 2.2, w * 0.32, light);
}

/**
 * 부츠 : 발등 + 밑창 + 광택.
 * 다리를 세웠으면 발끝이 앞(+x), 발차기처럼 뻗었으면 다리 방향을 따라간다.
 */
function drawBoot(ctx, knee, foot, base, dark, light) {
  let dx = foot[0] - knee[0], dy = foot[1] - knee[1];
  const len = Math.hypot(dx, dy) || 1;
  dx /= len; dy /= len;
  let tx = 1, ty = 0;
  if (Math.abs(dx) > Math.abs(dy)) { tx = dx; ty = dy; }
  const bx = foot[0] - tx * 3.5, by = foot[1] - ty * 3.5;
  const ex = foot[0] + tx * 8.5, ey = foot[1] + ty * 8.5;
  capsule(ctx, bx, by - 5, ex, ey - 5, 14, base);
  capsule(ctx, bx, by - 0.5, ex, ey - 0.5, 5.5, dark);                 // 밑창
  capsule(ctx, bx + tx, by - 9, ex - tx * 3, ey - ty * 3 - 9, 4.5, light);
}

/** 주먹 : 손등 + 손가락 마디 + 하이라이트 */
function drawFist(ctx, hand, r, skin, skinDark, skinLight) {
  const [x, y] = hand;
  ctx.fillStyle = skinDark;
  ctx.beginPath(); ctx.arc(x, y + 1.4, r, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = skin;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = skinLight;
  ctx.beginPath(); ctx.arc(x - r * 0.2, y - r * 0.4, r * 0.3, 0, Math.PI * 2); ctx.fill();
  capsule(ctx, x - r * 0.5, y + r * 0.3, x + r * 0.55, y + r * 0.15, 1.5, skinDark);  // 마디
}

/**
 * 캐릭터 리그(몸통/팔다리/머리)를 원점(발끝) 기준으로 그린다.
 * 스프라이트를 구울 때도, 스프라이트 없이 직접 그릴 때도 같은 함수를 쓴다.
 */
function drawFighterRig(ctx, f, p, time) {
  const ch = f.char, c = ch.colors;
  // 캐릭터별로 소매·띠·부츠 색을 따로 줄 수 있다 (지정하지 않으면 기존 색을 쓴다)
  const gi = c.gi, giDark = c.giDark, giLight = shade(c.gi, 0.26);
  const sleeve = c.sleeve || c.gi, sleeveDark = c.sleeveDark || c.giDark;
  const sleeveLight = shade(sleeve, 0.26);
  const belt = c.belt || c.trim, beltDark = c.beltDark || c.trimDark;
  const boot = c.boot || c.trim, bootDark = c.bootDark || c.trimDark;
  const bootLight = shade(boot, 0.3);
  const skinLight = shade(c.skin, 0.24);

  // ---- 뒤쪽 팔다리 (한 단계 어둡게 해서 깊이감) ----
  limbShaded(ctx, p.hip, p.legB[0], p.legB[1], 17,
    giDark, shade(giDark, -0.3), shade(giDark, 0.16));
  drawBoot(ctx, p.legB[0], p.legB[1], bootDark, shade(bootDark, -0.35), shade(bootDark, 0.18));
  limbShaded(ctx, p.shoulderB, p.armB[0], p.armB[1], 13,
    sleeveDark, shade(sleeveDark, -0.3), shade(sleeveDark, 0.16));
  drawFist(ctx, p.armB[1], 6.0, c.skinDark, shade(c.skinDark, -0.25), c.skin);

  // ---- 몸통 ----
  const hipL = [p.hip[0] - 15, p.hip[1] + 6], hipR = [p.hip[0] + 15, p.hip[1] + 6];
  const chL = [p.chest[0] - 17, p.chest[1]], chR = [p.chest[0] + 17, p.chest[1]];
  poly(ctx, [hipL, chL, chR, hipR], gi);
  // 옆구리 음영 / 어깨 하이라이트
  poly(ctx, [hipL, chL, [chL[0] + 7, chL[1] + 2], [hipL[0] + 6, hipL[1]]], giDark);
  poly(ctx, [[chR[0] - 8, chR[1] + 3], chR, [hipR[0] - 3, hipR[1] - 4]], giLight);
  poly(ctx, [[hipL[0] + 2, hipL[1] - 3], [hipR[0] - 2, hipR[1] - 3], hipR, hipL],
    shade(gi, -0.16));   // 허리 접힘
  // 도복 깃 / 상의 디테일
  if (/^(goku|vegeta|trunks|piccolo|gohan)$/.test(ch.id)) {
    poly(ctx, [
      [p.chest[0] - 5, p.chest[1] - 2], [p.chest[0] + 14, p.chest[1] - 2],
      [p.hip[0] + 6, p.hip[1] + 4], [p.hip[0] - 2, p.hip[1] + 4]
    ], c.trim);
    poly(ctx, [
      [p.chest[0] + 8, p.chest[1] - 1], [p.chest[0] + 14, p.chest[1] - 2],
      [p.hip[0] + 6, p.hip[1] + 4], [p.hip[0] + 2, p.hip[1] + 4]
    ], shade(c.trim, -0.22));
  } else {
    ctx.fillStyle = giDark;
    ctx.fillRect(p.chest[0] - 12, p.chest[1] + 6, 24, 10);
    ctx.fillStyle = shade(gi, 0.18);
    ctx.fillRect(p.chest[0] - 12, p.chest[1] + 6, 24, 3);
  }
  // 가슴 근육 음영
  ctx.save();
  ctx.globalAlpha = 0.22;
  capsule(ctx, p.chest[0] - 9, p.chest[1] + 9, p.chest[0] + 9, p.chest[1] + 9, 4, shade(gi, -0.5));
  ctx.restore();

  // ---- 벨트 ----
  capsule(ctx, p.hip[0] - 14, p.hip[1] + 2, p.hip[0] + 14, p.hip[1] + 2, 10, belt);
  capsule(ctx, p.hip[0] - 13, p.hip[1] + 5, p.hip[0] + 13, p.hip[1] + 5, 3.4, beltDark);
  capsule(ctx, p.hip[0] - 12, p.hip[1] - 1, p.hip[0] + 11, p.hip[1] - 1, 2.6, shade(belt, 0.3));
  ctx.fillStyle = beltDark;
  ctx.fillRect(p.hip[0] - 3, p.hip[1] - 3, 7, 10);
  capsule(ctx, p.hip[0] - 2, p.hip[1] + 6, p.hip[0] - 6, p.hip[1] + 20, 4, belt);   // 늘어진 끈
  capsule(ctx, p.hip[0] + 3, p.hip[1] + 6, p.hip[0] + 6, p.hip[1] + 17, 3.4, beltDark);

  // ---- 앞쪽 팔다리 ----
  limbShaded(ctx, p.hip, p.legF[0], p.legF[1], 18, gi, giDark, giLight);
  drawBoot(ctx, p.legF[0], p.legF[1], boot, bootDark, bootLight);
  limbShaded(ctx, p.shoulderF, p.armF[0], p.armF[1], 14, sleeve, sleeveDark, sleeveLight);
  // 손목 밴드 + 맨살 팔뚝
  capsule(ctx, p.armF[0][0], p.armF[0][1], p.armF[1][0], p.armF[1][1], 12, c.skin);
  capsule(ctx, p.armF[0][0], p.armF[0][1] + 2, p.armF[1][0], p.armF[1][1] + 2, 5, c.skinDark);
  capsule(ctx, p.armF[0][0], p.armF[0][1] - 2.4, p.armF[1][0], p.armF[1][1] - 2.4, 4, skinLight);
  drawFist(ctx, p.armF[1], 6.8, c.skin, c.skinDark, skinLight);

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
    const fg = ctx.createRadialGradient(0, -74, 6, 0, -74, 82);
    fg.addColorStop(0, '#fff6d0');
    fg.addColorStop(0.45, 'rgba(255,210,120,0.5)');
    fg.addColorStop(1, 'rgba(255,150,60,0)');
    ctx.fillStyle = fg;
    ctx.beginPath(); ctx.arc(0, -74, 82, 0, Math.PI * 2); ctx.fill();
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
    ctx.ellipse(f.x + f.facing * 16, f.y - 62, 30, 62, 0, 0, Math.PI * 2);
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
  const ox = f.x + f.facing * 34;
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
