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
  // 이레이저 캐논 - 한 손바닥을 앞으로 내밀어 쏜다 (거구를 살린 큰 동작)
  palm(p, charging, g) {
    p.legF = [P(24, -34), P(35, 0)];
    p.legB = [P(-23, -34), P(-34, 0)];
    if (charging) {
      p.armF = [mix(P(25, -88), P(16, -96), g), mix(P(31, -104), P(2, -104), g)];
      p.armB = [mix(P(-24, -88), P(-22, -92), g), mix(P(-28, -104), P(-14, -100), g)];
      p.chest = mix(p.chest, P(-6, -101), g);
      p.head = mix(p.head, P(-3, -123), g);
      p.headTilt = -0.05 * g;
    } else {
      p.armF = [P(32, -100), P(60, -100)];
      p.armB = [P(-20, -92), P(-26, -78)];
      p.chest = P(12, -100); p.head = P(12, -122); p.hip = P(5, -62);
      p.legF = [P(28, -34), P(41, 0)];
      p.legB = [P(-21, -34), P(-33, 0)];
    }
  },
  // 기간틱 미티어 - 두 손을 머리 위로 모아 거대한 구체를 만든다
  twinOrb(p, charging, g) {
    if (charging) {
      p.armF = [mix(P(25, -88), P(20, -132), g), mix(P(31, -104), P(12, -168), g)];
      p.armB = [mix(P(-24, -88), P(-16, -132), g), mix(P(-28, -104), P(-6, -166), g)];
      p.chest = mix(p.chest, P(0, -103), g);
      p.head = mix(p.head, P(1, -126), g);
      p.headTilt = -0.14 * g;
      p.legF = [P(26, -34), P(38, 0)];
      p.legB = [P(-25, -34), P(-37, 0)];
    } else {
      p.armF = [P(26, -138), P(22, -172)];
      p.armB = [P(-8, -136), P(10, -170)];
      p.chest = P(6, -102); p.head = P(6, -125); p.hip = P(3, -62);
      p.headTilt = -0.1;
      p.legF = [P(28, -34), P(40, 0)];
      p.legB = [P(-23, -34), P(-35, 0)];
    }
  },
  // 초 고스트 카미카제 어택 - 볼을 부풀려 모았다가 입에서 유령을 뱉어낸다
  ghost(p, charging, g) {
    if (charging) {
      p.armF = [mix(P(25, -86), P(22, -105), g), mix(P(31, -103), P(15, -121), g)];
      p.armB = [mix(P(-23, -86), P(-14, -105), g), mix(P(-27, -102), P(-3, -121), g)];
      p.chest = mix(p.chest, P(0, -101), g);
      p.head = mix(p.head, P(3, -123), g);
      p.headTilt = 0.07 * g;
      p.legF = [P(19, -34), P(26, 0)];
      p.legB = [P(-19, -34), P(-27, 0)];
    } else {
      // 유령을 뱉으며 두 팔을 활짝 벌린다
      p.armF = [P(30, -104), P(50, -118)];
      p.armB = [P(-18, -102), P(-32, -116)];
      p.chest = P(6, -101); p.head = P(8, -124); p.hip = P(3, -62);
      p.headTilt = -0.12;
      p.legF = [P(24, -34), P(34, 0)];
      p.legB = [P(-21, -34), P(-31, 0)];
    }
  },
  // 스피릿 소드 - 한 손을 머리 위로 세워 기의 검을 뽑았다가 내리긋는다
  spirit(p, charging, g) {
    if (charging) {
      p.armF = [mix(P(25, -88), P(26, -110), g), mix(P(31, -104), P(34, -140), g)];
      p.armB = [mix(P(-24, -88), P(-16, -92), g), mix(P(-28, -104), P(4, -104), g)];
      p.chest = mix(p.chest, P(-4, -102), g);
      p.head = mix(p.head, P(0, -124), g);
      p.headTilt = -0.12 * g;
      p.legF = [P(20, -34), P(28, 0)];
      p.legB = [P(-20, -34), P(-30, 0)];
    } else {
      // 검을 앞으로 내리그은 순간
      p.armF = [P(30, -104), P(52, -120)];
      p.armB = [P(-14, -92), P(-20, -74)];
      p.chest = P(11, -100); p.head = P(11, -122); p.hip = P(4, -62);
      p.headTilt = 0.05;
      p.legF = [P(27, -34), P(39, 0)];
      p.legB = [P(-21, -34), P(-33, 0)];
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

/* ---------------- 캐릭터별 전투 스타일 ----------------
 *  같은 기술이라도 캐릭터마다 다른 동작으로 나간다.
 *  (p, e) : e = 기술 진행도 0~1 (양자화된 값)
 *  여기에 없는 기술은 공통 동작을 그대로 쓴다.
 * ------------------------------------------------- */

/** 손에 든 검의 방향을 정한다 (트랭크스) */
function setSword(p, ang, len) {
  const h = p.armF[1];
  p.sword = { from: [h[0], h[1]], to: [h[0] + Math.cos(ang) * len, h[1] + Math.sin(ang) * len] };
}

const STYLE_MOVES = {
  /* 손오공 : 정통 무술. 주먹을 허리에 감았다가 몸 전체로 내지른다 */
  karate: {
    jab(p, e) {
      p.armF = [mix(P(24, -88), P(36, -98), e), mix(P(30, -104), P(56, -99), e)];
      p.armB = [mix(P(-22, -86), P(-20, -80), e), mix(P(-26, -102), P(-16, -74), e)];
      p.chest = mix(p.chest, P(6, -100), e * 0.7);
    },
    straight(p, e) {
      // 뒷손을 허리에 감고 온몸으로 내지르는 정권
      p.armF = [mix(P(16, -92), P(42, -99), e), mix(P(22, -104), P(72, -99), e)];
      p.armB = [mix(P(-22, -86), P(-18, -78), e), mix(P(-26, -102), P(-12, -70), e)];
      p.chest = mix(p.chest, P(13, -100), e);
      p.head = mix(p.head, P(13, -122), e * 0.6);
      p.hip = mix(p.hip, P(7, -62), e);
      p.legF = [mix(P(18, -33), P(26, -33), e), mix(P(24, 0), P(40, 0), e)];
      p.legB = [mix(P(-18, -33), P(-24, -34), e), mix(P(-26, 0), P(-36, 0), e)];
    },
    roundhouse(p, e) {
      // 높은 돌려차기 : 몸을 크게 젖힌다
      p.legF = [mix(P(20, -40), P(32, -78), e), mix(P(26, -6), P(76, -92), e)];
      p.legB = [P(-14, -34), P(-20, 0)];
      p.armF = [P(12, -92), P(0, -108)];
      p.armB = [P(-26, -86), P(-40, -96)];
      p.chest = mix(p.chest, P(-10, -102), e * 0.9);
      p.head = mix(p.head, P(-11, -124), e * 0.7);
      p.headTilt = -0.1 * e;
    }
  },

  /* 베지터 : 팔꿈치와 무릎을 쓰는 짧고 흉포한 격투 */
  royal: {
    jab(p, e) {
      // 백너클
      p.armF = [mix(P(24, -92), P(40, -104), e), mix(P(30, -104), P(52, -112), e)];
      p.armB = [P(-20, -88), P(-14, -78)];
      p.chest = mix(p.chest, P(5, -101), e * 0.6);
    },
    straight(p, e) {
      // 팔꿈치 강타
      p.armF = [mix(P(20, -92), P(40, -98), e), mix(P(28, -104), P(24, -96), e)];
      p.armB = [mix(P(-22, -86), P(-6, -92), e), mix(P(-26, -102), P(14, -98), e)];
      p.chest = mix(p.chest, P(12, -101), e);
      p.head = mix(p.head, P(13, -123), e * 0.7);
      p.hip = mix(p.hip, P(6, -62), e);
      p.legF = [P(20, -33), P(28, 0)];
      p.legB = [mix(P(-18, -33), P(-24, -36), e), mix(P(-26, 0), P(-34, 0), e)];
    },
    roundhouse(p, e) {
      // 무릎 올려차기
      p.legF = [mix(P(20, -40), P(34, -92), e), mix(P(26, -6), P(52, -62), e)];
      p.legB = [P(-14, -34), P(-20, 0)];
      p.armF = [P(20, -88), P(30, -74)];
      p.armB = [P(-22, -90), P(-30, -76)];
      p.chest = mix(p.chest, P(6, -102), e);
      p.head = mix(p.head, P(8, -124), e * 0.7);
    },
    uppercut(p, e) {
      // 솟구치는 팔꿈치
      p.armF = [mix(P(20, -88), P(20, -116), e), mix(P(26, -100), P(8, -140), e)];
      p.armB = [P(-20, -86), P(-14, -72)];
      p.chest = mix(p.chest, P(2, -104), e);
      p.head = mix(p.head, P(4, -126), e);
      p.legB = [mix(P(-18, -33), P(-22, -42), e), mix(P(-26, 0), P(-32, -14), e)];
    }
  },

  /* 피콜로 : 팔이 길다. 손날과 손바닥으로 멀리서 친다 */
  demon: {
    jab(p, e) {
      // 손가락을 세운 긴 찌르기
      p.armF = [mix(P(24, -90), P(40, -100), e), mix(P(30, -104), P(68, -102), e)];
      p.armB = [P(-22, -88), P(-28, -100)];
      p.chest = mix(p.chest, P(8, -101), e * 0.8);
      p.head = mix(p.head, P(9, -123), e * 0.5);
    },
    straight(p, e) {
      // 손바닥 밀치기 (팔을 길게 뻗는다)
      p.armF = [mix(P(16, -94), P(46, -100), e), mix(P(22, -106), P(84, -100), e)];
      p.armB = [mix(P(-22, -88), P(-16, -92), e), mix(P(-26, -104), P(-6, -102), e)];
      p.chest = mix(p.chest, P(14, -101), e);
      p.head = mix(p.head, P(14, -123), e * 0.6);
      p.hip = mix(p.hip, P(6, -62), e);
      p.legF = [P(20, -33), P(28, 0)];
      p.legB = [mix(P(-18, -33), P(-26, -34), e), mix(P(-26, 0), P(-40, 0), e)];
    },
    roundhouse(p, e) {
      // 길게 뻗어 후리는 미들킥
      p.legF = [mix(P(20, -40), P(38, -62), e), mix(P(26, -6), P(92, -66), e)];
      p.legB = [P(-14, -34), P(-20, 0)];
      p.armF = [P(6, -94), P(-8, -104)];
      p.armB = [P(-24, -88), P(-42, -94)];
      p.chest = mix(p.chest, P(-12, -101), e * 0.8);
      p.head = mix(p.head, P(-13, -123), e * 0.6);
    },
    sweep(p, e) {
      crouchPose(p, 1.2);
      p.legF = [mix(P(18, -18), P(40, -18), e), mix(P(26, -4), P(96, -8), e)];
      p.armF = [P(14, -58), P(30, -44)];
      p.armB = [P(-24, -48), P(-36, -30)];
    }
  },

  /* 프리저 : 우아하고 잔인하다. 꼬리를 채찍처럼 쓴다 */
  emperor: {
    jab(p, e) {
      // 손등으로 가볍게 후려친다
      p.armF = [mix(P(24, -94), P(38, -102), e), mix(P(30, -106), P(58, -104), e)];
      p.armB = [P(-20, -84), P(-14, -68)];
      p.chest = mix(p.chest, P(4, -101), e * 0.5);
      p.headTilt = -0.06 * e;
    },
    straight(p, e) {
      // 꼬리 채찍 : 몸은 거의 움직이지 않는다
      p.armF = [P(20, -88), P(24, -70)];
      p.armB = [P(-20, -86), P(-26, -70)];
      p.chest = mix(p.chest, P(-4, -101), e * 0.6);
      p.head = mix(p.head, P(-2, -123), e * 0.4);
      p.headTilt = -0.08;
      p.tail = [
        mix(P(-26, -58), P(6, -84), e),
        mix(P(-64, -34), P(48, -96), e),
        mix(P(-84, -6), P(86, -88), e)
      ];
    },
    roundhouse(p, e) {
      // 꼬리를 크게 휘두르는 가로 후리기
      p.legF = [P(18, -34), P(24, 0)];
      p.legB = [P(-17, -34), P(-24, 0)];
      p.armF = [P(18, -92), P(10, -76)];
      p.armB = [P(-20, -90), P(-28, -76)];
      p.chest = mix(p.chest, P(-6, -102), e * 0.8);
      p.tail = [
        mix(P(-30, -50), P(10, -48), e),
        mix(P(-70, -20), P(58, -56), e),
        mix(P(-88, 6), P(102, -46), e)
      ];
    },
    sweep(p, e) {
      // 낮게 도는 꼬리 후리기
      crouchPose(p, 1.15);
      p.armF = [P(16, -60), P(26, -50)];
      p.armB = [P(-18, -58), P(-28, -48)];
      p.tail = [
        mix(P(-28, -40), P(14, -22), e),
        mix(P(-64, -16), P(58, -14), e),
        mix(P(-84, 4), P(104, -6), e)
      ];
    },
    uppercut(p, e) {
      // 무릎을 세워 솟구친다
      p.legF = [mix(P(20, -40), P(26, -96), e), mix(P(26, -6), P(38, -66), e)];
      p.legB = [mix(P(-18, -33), P(-22, -40), e), mix(P(-26, 0), P(-32, -10), e)];
      p.armF = [P(22, -96), P(30, -114)];
      p.armB = [P(-22, -94), P(-30, -112)];
      p.chest = mix(p.chest, P(2, -104), e);
      p.head = mix(p.head, P(4, -126), e);
      p.tail = [P(-30, -56), P(-56, -78), P(-62, -104)];
    }
  },

  /* 셀 : 육중하고 압도적. 두 팔을 함께 내리찍는다 */
  perfect: {
    jab(p, e) {
      // 짧은 훅
      p.armF = [mix(P(26, -92), P(38, -96), e), mix(P(32, -104), P(50, -92), e)];
      p.armB = [P(-24, -88), P(-30, -100)];
      p.chest = mix(p.chest, P(6, -101), e * 0.6);
    },
    straight(p, e) {
      // 두 손을 깍지 껴 내리찍는 해머
      p.armF = [mix(P(20, -114), P(34, -92), e), mix(P(24, -146), P(58, -74), e)];
      p.armB = [mix(P(-18, -114), P(24, -94), e), mix(P(-22, -146), P(52, -78), e)];
      p.chest = mix(p.chest, P(8, -100), e);
      p.head = mix(p.head, P(9, -122), e * 0.7);
      p.hip = mix(p.hip, P(4, -60), e);
      p.legF = [P(24, -32), P(34, 0)];
      p.legB = [P(-24, -32), P(-34, 0)];
      p.wingSpread = e;
    },
    roundhouse(p, e) {
      // 앞으로 밟아 차는 스톰프
      p.legF = [mix(P(22, -44), P(38, -60), e), mix(P(28, -10), P(74, -40), e)];
      p.legB = [P(-18, -34), P(-26, 0)];
      p.armF = [P(24, -92), P(34, -80)];
      p.armB = [P(-26, -92), P(-36, -80)];
      p.chest = mix(p.chest, P(-4, -101), e * 0.6);
      p.wingSpread = e * 0.7;
    },
    uppercut(p, e) {
      // 두 손바닥을 함께 쳐올린다
      p.armF = [mix(P(22, -88), P(26, -114), e), mix(P(28, -102), P(34, -148), e)];
      p.armB = [mix(P(-22, -88), P(10, -112), e), mix(P(-28, -102), P(22, -146), e)];
      p.chest = mix(p.chest, P(2, -104), e);
      p.head = mix(p.head, P(4, -126), e);
      p.wingSpread = e;
    },
    airSlam(p, e) {
      // 날개를 펼치고 내리꽂는다
      p.armF = [mix(P(24, -96), P(34, -60), e), mix(P(30, -110), P(44, -34), e)];
      p.armB = [mix(P(-24, -96), P(-4, -60), e), mix(P(-30, -110), P(20, -34), e)];
      p.legF = [P(20, -46), P(26, -20)];
      p.legB = [P(-18, -44), P(-24, -18)];
      p.chest = P(4, -100); p.head = P(6, -122);
      p.wingSpread = 1;
    }
  },

  /* 얼티밋 오반 : 군더더기 없는 교과서적인 타격 */
  mystic: {
    straight(p, e) {
      // 허리 회전을 실은 정권
      p.armF = [mix(P(18, -94), P(42, -100), e), mix(P(24, -106), P(74, -100), e)];
      p.armB = [mix(P(-22, -88), P(-20, -84), e), mix(P(-26, -104), P(-18, -76), e)];
      p.chest = mix(p.chest, P(12, -101), e);
      p.head = mix(p.head, P(12, -123), e * 0.5);
      p.hip = mix(p.hip, P(6, -62), e);
      p.legF = [P(20, -33), P(28, 0)];
      p.legB = [mix(P(-18, -33), P(-24, -34), e), mix(P(-26, 0), P(-36, 0), e)];
    },
    roundhouse(p, e) {
      // 몸을 돌려 차는 뒤후려차기
      p.legF = [mix(P(20, -40), P(36, -70), e), mix(P(26, -6), P(80, -78), e)];
      p.legB = [P(-16, -34), P(-24, 0)];
      p.armF = [mix(P(20, -90), P(-10, -96), e), mix(P(26, -104), P(-28, -92), e)];
      p.armB = [mix(P(-22, -88), P(6, -92), e), mix(P(-28, -102), P(22, -86), e)];
      p.chest = mix(p.chest, P(-8, -101), e);
      p.head = mix(p.head, P(-10, -123), e);
      p.headTilt = 0.12 * e;
    },
    uppercut(p, e) {
      // 손바닥으로 쳐올린다
      p.armF = [mix(P(20, -86), P(24, -112), e), mix(P(28, -100), P(30, -152), e)];
      p.armB = [P(-20, -88), P(-24, -74)];
      p.chest = mix(p.chest, P(2, -105), e);
      p.head = mix(p.head, P(4, -127), e);
      p.legB = [mix(P(-18, -33), P(-22, -44), e), mix(P(-26, 0), P(-32, -16), e)];
    },
    airKick(p, e) {
      // 내려찍는 발뒤꿈치
      p.legF = [mix(P(22, -64), P(30, -78), e), mix(P(28, -30), P(46, -14), e)];
      p.legB = [P(-16, -40), P(-22, -14)];
      p.armF = [P(18, -94), P(12, -110)];
      p.armB = [P(-22, -92), P(-32, -104)];
    }
  },

  /* 브로리 : 거구로 짓누르는 파워 파이터. 크게 휘두르고 내리찍는다 */
  legendary: {
    jab(p, e) {
      // 팔을 크게 후려치는 백핸드 (리치가 길다)
      p.armF = [mix(P(26, -96), P(40, -100), e), mix(P(32, -108), P(62, -96), e)];
      p.armB = [P(-26, -90), P(-34, -76)];
      p.chest = mix(p.chest, P(5, -101), e * 0.6);
      p.legF = [P(22, -34), P(32, 0)];
      p.legB = [P(-22, -34), P(-32, 0)];
    },
    straight(p, e) {
      // 라리아트 : 팔을 뒤로 크게 젖혔다가 옆으로 후려친다
      p.armF = [mix(P(-6, -104), P(34, -98), e), mix(P(-30, -96), P(70, -94), e)];
      p.armB = [mix(P(-24, -88), P(-10, -92), e), mix(P(-30, -102), P(16, -98), e)];
      p.chest = mix(p.chest, P(12, -100), e);
      p.head = mix(p.head, P(12, -122), e * 0.7);
      p.hip = mix(p.hip, P(6, -62), e);
      p.legF = [mix(P(20, -34), P(30, -34), e), mix(P(28, 0), P(45, 0), e)];
      p.legB = [P(-24, -34), P(-36, 0)];
    },
    roundhouse(p, e) {
      // 어깨로 밀어붙이는 태클
      p.chest = mix(p.chest, P(20, -98), e);
      p.head = mix(p.head, P(19, -120), e);
      p.hip = mix(p.hip, P(9, -60), e);
      p.headTilt = 0.12 * e;
      p.armF = [mix(P(24, -92), P(30, -84), e), mix(P(30, -106), P(40, -70), e)];
      p.armB = [mix(P(-24, -92), P(-14, -84), e), mix(P(-30, -106), P(-18, -70), e)];
      p.legF = [mix(P(20, -36), P(34, -34), e), mix(P(26, -4), P(52, 0), e)];
      p.legB = [mix(P(-20, -34), P(-26, -36), e), mix(P(-28, 0), P(-40, 0), e)];
    },
    uppercut(p, e) {
      // 아래에서 위로 퍼올리는 거대한 훅
      p.armF = [mix(P(22, -74), P(24, -110), e), mix(P(34, -58), P(30, -156), e)];
      p.armB = [P(-24, -88), P(-32, -74)];
      p.chest = mix(p.chest, P(2, -104), e);
      p.head = mix(p.head, P(4, -126), e);
      p.legF = [P(22, -34), P(32, 0)];
      p.legB = [mix(P(-22, -34), P(-26, -44), e), mix(P(-32, 0), P(-38, -16), e)];
    },
    sweep(p, e) {
      // 발로 짓밟듯 크게 후린다
      crouchPose(p, 1.15);
      p.legF = [mix(P(20, -22), P(40, -22), e), mix(P(28, -6), P(88, -10), e)];
      p.armF = [P(24, -62), P(38, -50)];
      p.armB = [P(-26, -56), P(-38, -40)];
    },
    airSlam(p, e) {
      // 두 손을 모아 내리찍는 해머 (원작의 대표 동작)
      p.armF = [mix(P(20, -122), P(30, -66), e), mix(P(26, -158), P(44, -34), e)];
      p.armB = [mix(P(-20, -122), P(2, -66), e), mix(P(-26, -158), P(22, -34), e)];
      p.legF = [P(22, -46), P(30, -18)];
      p.legB = [P(-22, -44), P(-30, -16)];
      p.chest = P(3, -100); p.head = P(5, -122);
    }
  },

  /* 쿠우라 : 프리저보다 빠르고 잔혹하다. 손날과 팔 가시, 꼬리를 쓴다 */
  cooler: {
    jab(p, e) {
      // 손날 치기
      p.armF = [mix(P(24, -96), P(38, -104), e), mix(P(30, -108), P(58, -100), e)];
      p.armB = [P(-20, -86), P(-14, -70)];
      p.chest = mix(p.chest, P(5, -101), e * 0.6);
      p.headTilt = -0.05 * e;
    },
    straight(p, e) {
      // 팔꿈치 가시로 찌른다 (팔을 접어 가시를 앞으로)
      p.armF = [mix(P(20, -94), P(44, -100), e), mix(P(26, -106), P(30, -96), e)];
      p.armB = [mix(P(-22, -88), P(-4, -94), e), mix(P(-28, -102), P(18, -100), e)];
      p.chest = mix(p.chest, P(13, -101), e);
      p.head = mix(p.head, P(13, -123), e * 0.7);
      p.hip = mix(p.hip, P(6, -62), e);
      p.legF = [mix(P(18, -34), P(26, -34), e), mix(P(24, 0), P(40, 0), e)];
      p.legB = [P(-19, -34), P(-28, 0)];
      p.tail = [P(-30, -54), P(-58, -66), P(-70, -88)];
    },
    roundhouse(p, e) {
      // 몸을 돌려 차는 회전 뒤차기
      p.legF = [mix(P(20, -40), P(36, -68), e), mix(P(26, -6), P(82, -76), e)];
      p.legB = [P(-16, -34), P(-24, 0)];
      p.armF = [mix(P(20, -92), P(-12, -98), e), mix(P(26, -106), P(-32, -94), e)];
      p.armB = [mix(P(-22, -90), P(6, -94), e), mix(P(-28, -104), P(24, -88), e)];
      p.chest = mix(p.chest, P(-9, -101), e);
      p.head = mix(p.head, P(-11, -123), e);
      p.headTilt = 0.14 * e;
      p.tail = [mix(P(-30, -50), P(24, -40), e), mix(P(-64, -30), P(62, -30), e), mix(P(-88, -8), P(94, -18), e)];
    },
    sweep(p, e) {
      // 꼬리로 낮게 쓸어 넘긴다
      crouchPose(p, 1.15);
      p.armF = [P(18, -58), P(30, -48)];
      p.armB = [P(-18, -56), P(-30, -46)];
      p.tail = [
        mix(P(-28, -40), P(16, -20), e),
        mix(P(-64, -16), P(60, -12), e),
        mix(P(-86, 4), P(106, -4), e)
      ];
    },
    uppercut(p, e) {
      // 무릎으로 쳐올리며 꼬리를 세운다
      p.legF = [mix(P(20, -40), P(26, -98), e), mix(P(26, -6), P(38, -68), e)];
      p.legB = [mix(P(-18, -33), P(-22, -40), e), mix(P(-26, 0), P(-32, -10), e)];
      p.armF = [P(24, -98), P(34, -116)];
      p.armB = [P(-22, -94), P(-30, -112)];
      p.chest = mix(p.chest, P(2, -104), e);
      p.head = mix(p.head, P(4, -126), e);
      p.tail = [P(-28, -58), P(-52, -84), P(-56, -112)];
    },
    airKick(p, e) {
      // 급강하 발차기
      p.legF = [mix(P(22, -60), P(34, -70), e), mix(P(28, -28), P(56, -20), e)];
      p.legB = [P(-16, -40), P(-22, -14)];
      p.armF = [P(20, -96), P(14, -112)];
      p.armB = [P(-22, -94), P(-32, -108)];
      p.tail = [P(-30, -70), P(-58, -84), P(-72, -104)];
    }
  },

  /* 트랭크스 : 검술. 모든 타격이 칼질이다 */
  blade: {
    jab(p, e) {
      // 짧은 가로 베기
      p.armF = [mix(P(22, -96), P(36, -100), e), mix(P(28, -110), P(52, -102), e)];
      p.armB = [P(-20, -86), P(-26, -100)];
      p.chest = mix(p.chest, P(6, -101), e * 0.6);
      setSword(p, lerp(-1.9, -0.15, e), 62);
    },
    straight(p, e) {
      // 크게 내리치는 대각 베기
      p.armF = [mix(P(10, -122), P(38, -96), e), mix(P(20, -150), P(60, -80), e)];
      p.armB = [mix(P(-20, -92), P(-12, -84), e), mix(P(-26, -104), P(-4, -78), e)];
      p.chest = mix(p.chest, P(10, -100), e);
      p.head = mix(p.head, P(11, -122), e * 0.7);
      p.hip = mix(p.hip, P(5, -61), e);
      p.legF = [mix(P(18, -33), P(28, -33), e), mix(P(24, 0), P(42, 0), e)];
      p.legB = [P(-20, -33), P(-30, 0)];
      setSword(p, lerp(-2.2, 0.55, e), 74);
    },
    roundhouse(p, e) {
      // 몸을 돌리며 휘두르는 회전 베기
      p.armF = [mix(P(-4, -104), P(40, -96), e), mix(P(-24, -96), P(64, -104), e)];
      p.armB = [mix(P(-18, -88), P(8, -90), e), mix(P(-24, -100), P(26, -96), e)];
      p.chest = mix(p.chest, P(9, -100), e);
      p.head = mix(p.head, P(10, -122), e * 0.6);
      p.legF = [mix(P(18, -33), P(30, -34), e), mix(P(24, 0), P(44, -4), e)];
      p.legB = [P(-20, -33), P(-30, 0)];
      setSword(p, lerp(2.6, -0.5, e), 78);
    },
    uppercut(p, e) {
      // 아래에서 위로 쳐올리는 베기
      p.armF = [mix(P(20, -76), P(26, -112), e), mix(P(30, -60), P(30, -150), e)];
      p.armB = [P(-20, -88), P(-24, -74)];
      p.chest = mix(p.chest, P(2, -104), e);
      p.head = mix(p.head, P(4, -126), e);
      p.legB = [mix(P(-18, -33), P(-22, -42), e), mix(P(-26, 0), P(-32, -14), e)];
      setSword(p, lerp(1.5, -1.45, e), 72);
    },
    sweep(p, e) {
      crouchPose(p, 1.2);
      p.armF = [mix(P(10, -70), P(30, -50), e), mix(P(24, -78), P(54, -34), e)];
      p.armB = [P(-22, -50), P(-30, -34)];
      setSword(p, lerp(-1.2, 0.35, e), 66);
    },
    airKick(p, e) {
      // 공중에서 내려긋는 낙하 베기
      p.armF = [mix(P(14, -120), P(34, -84), e), mix(P(22, -146), P(52, -60), e)];
      p.armB = [P(-20, -96), P(-28, -108)];
      p.legF = [P(20, -44), P(26, -20)];
      p.legB = [P(-16, -42), P(-22, -16)];
      setSword(p, lerp(-2.0, 1.1, e), 76);
    }
  },

  /* 초2 오반 : 분노에 실린 직선적이고 무자비한 연타 */
  fury: {
    jab(p, e) {
      // 팔꿈치를 접었다가 튕기듯 내지르는 짧은 스트레이트
      p.armF = [mix(P(20, -90), P(38, -100), e), mix(P(26, -104), P(60, -102), e)];
      p.armB = [mix(P(-22, -86), P(-18, -82), e), mix(P(-26, -102), P(-14, -76), e)];
      p.chest = mix(p.chest, P(8, -100), e * 0.8);
      p.head = mix(p.head, P(8, -122), e * 0.6);
    },
    straight(p, e) {
      // 온 체중을 실어 파고드는 관통 정권 (앞발을 크게 딛는다)
      p.armF = [mix(P(12, -94), P(44, -98), e), mix(P(18, -106), P(76, -97), e)];
      p.armB = [mix(P(-24, -84), P(-20, -76), e), mix(P(-28, -100), P(-14, -66), e)];
      p.chest = mix(p.chest, P(15, -99), e);
      p.head = mix(p.head, P(15, -121), e * 0.7);
      p.hip = mix(p.hip, P(8, -61), e);
      p.legF = [mix(P(18, -33), P(30, -32), e), mix(P(24, 0), P(46, 0), e)];
      p.legB = [mix(P(-18, -33), P(-26, -35), e), mix(P(-26, 0), P(-40, 0), e)];
      p.headTilt = 0.06 * e;
    },
    uppercut(p, e) {
      // 위로 도려내는 승천격
      p.armF = [mix(P(18, -80), P(26, -116), e), mix(P(24, -96), P(32, -158), e)];
      p.armB = [mix(P(-22, -86), P(-24, -96), e), mix(P(-26, -102), P(-30, -118), e)];
      p.chest = mix(p.chest, P(3, -106), e);
      p.head = mix(p.head, P(5, -128), e);
      p.headTilt = -0.12 * e;
      p.legF = [P(17, -34), P(23, 0)];
      p.legB = [mix(P(-18, -33), P(-23, -46), e), mix(P(-26, 0), P(-33, -18), e)];
    },
    roundhouse(p, e) {
      // 허리를 접어 내려찍는 각도 있는 하이킥
      p.legF = [mix(P(20, -42), P(30, -84), e), mix(P(26, -8), P(70, -102), e)];
      p.legB = [P(-15, -34), P(-22, 0)];
      p.armF = [P(14, -94), P(2, -112)];
      p.armB = [P(-26, -84), P(-40, -94)];
      p.chest = mix(p.chest, P(-9, -103), e);
      p.head = mix(p.head, P(-10, -125), e * 0.8);
      p.headTilt = -0.14 * e;
    }
  },

  /* 초2 오공 : 정통 무술을 초고속으로 — 짧게 감았다 폭발시킨다 */
  fierce: {
    jab(p, e) {
      p.armF = [mix(P(22, -88), P(37, -97), e), mix(P(28, -104), P(59, -98), e)];
      p.armB = [mix(P(-22, -86), P(-19, -80), e), mix(P(-26, -102), P(-15, -74), e)];
      p.chest = mix(p.chest, P(7, -100), e * 0.7);
    },
    straight(p, e) {
      // 뒷손을 허리에 완전히 감았다가 어깨째 밀어 넣는다
      p.armF = [mix(P(14, -92), P(43, -98), e), mix(P(20, -104), P(75, -98), e)];
      p.armB = [mix(P(-22, -86), P(-17, -76), e), mix(P(-26, -102), P(-10, -68), e)];
      p.chest = mix(p.chest, P(14, -100), e);
      p.head = mix(p.head, P(14, -122), e * 0.6);
      p.hip = mix(p.hip, P(8, -62), e);
      p.legF = [mix(P(18, -33), P(28, -33), e), mix(P(24, 0), P(43, 0), e)];
      p.legB = [mix(P(-18, -33), P(-25, -34), e), mix(P(-26, 0), P(-38, 0), e)];
    },
    roundhouse(p, e) {
      p.legF = [mix(P(20, -40), P(34, -80), e), mix(P(26, -6), P(78, -94), e)];
      p.legB = [P(-14, -34), P(-20, 0)];
      p.armF = [P(11, -92), P(-2, -108)];
      p.armB = [P(-27, -86), P(-42, -95)];
      p.chest = mix(p.chest, P(-11, -102), e * 0.9);
      p.head = mix(p.head, P(-12, -124), e * 0.7);
      p.headTilt = -0.12 * e;
    },
    airSlam(p, e) {
      // 두 손을 맞잡아 내리찍는다
      p.armF = [mix(P(20, -122), P(30, -60), e), mix(P(26, -148), P(38, -34), e)];
      p.armB = [mix(P(-14, -124), P(16, -62), e), mix(P(-4, -148), P(30, -36), e)];
      p.chest = mix(p.chest, P(6, -98), e);
      p.legF = [P(20, -44), P(26, -18)];
      p.legB = [P(-18, -50), P(-26, -30)];
      p.headTilt = 0.12 * e;
    }
  },

  /* 초2 베지터 : 왕자의 격투 — 팔꿈치, 무릎, 짧고 잔인하게 */
  pride: {
    jab(p, e) {
      // 백너클
      p.armF = [mix(P(24, -92), P(42, -106), e), mix(P(30, -104), P(54, -114), e)];
      p.armB = [P(-20, -88), P(-13, -78)];
      p.chest = mix(p.chest, P(6, -101), e * 0.6);
      p.headTilt = -0.05 * e;
    },
    straight(p, e) {
      // 팔꿈치를 박아 넣는다
      p.armF = [mix(P(10, -94), P(34, -98), e), mix(P(24, -100), P(20, -92), e)];
      p.armB = [mix(P(-22, -86), P(-16, -80), e), mix(P(-26, -102), P(-8, -72), e)];
      p.chest = mix(p.chest, P(14, -99), e);
      p.head = mix(p.head, P(14, -121), e * 0.7);
      p.hip = mix(p.hip, P(7, -61), e);
      p.legF = [mix(P(18, -33), P(28, -33), e), mix(P(24, 0), P(42, 0), e)];
      p.legB = [mix(P(-18, -33), P(-26, -34), e), mix(P(-26, 0), P(-38, 0), e)];
    },
    lowKick(p, e) {
      // 무릎으로 찍어 올린다
      crouchPose(p, 0.9);
      p.legF = [mix(P(18, -40), P(24, -68), e), mix(P(24, -12), P(44, -52), e)];
      p.armF = [P(20, -70), P(10, -82)];
      p.armB = [P(-18, -68), P(-26, -80)];
    },
    uppercut(p, e) {
      p.armF = [mix(P(22, -84), P(24, -114), e), mix(P(28, -100), P(30, -154), e)];
      p.armB = [P(-22, -88), P(-28, -104)];
      p.chest = mix(p.chest, P(1, -105), e);
      p.head = mix(p.head, P(3, -127), e);
      p.legB = [mix(P(-18, -33), P(-24, -44), e), mix(P(-26, 0), P(-34, -16), e)];
    }
  },

  /* 베지트 : 손오공과 베지터의 기술이 뒤섞인 여유로운 정타 */
  fusion: {
    jab(p, e) {
      // 손등으로 툭 치듯 뻗는다 (여유)
      p.armF = [mix(P(24, -90), P(40, -99), e), mix(P(30, -104), P(62, -100), e)];
      p.armB = [P(-21, -87), P(-24, -100)];
      p.chest = mix(p.chest, P(6, -100), e * 0.5);
      p.headTilt = -0.04 * e;
    },
    straight(p, e) {
      // 어깨를 크게 돌려 내리꽂는 정권
      p.armF = [mix(P(12, -96), P(44, -96), e), mix(P(20, -110), P(76, -94), e)];
      p.armB = [mix(P(-22, -86), P(-16, -78), e), mix(P(-26, -102), P(-8, -70), e)];
      p.chest = mix(p.chest, P(14, -100), e);
      p.head = mix(p.head, P(13, -122), e * 0.6);
      p.hip = mix(p.hip, P(7, -62), e);
      p.legF = [mix(P(18, -33), P(29, -33), e), mix(P(24, 0), P(44, 0), e)];
      p.legB = [mix(P(-18, -33), P(-25, -34), e), mix(P(-26, 0), P(-38, 0), e)];
    },
    roundhouse(p, e) {
      // 몸을 회전시켜 뒤꿈치로 후려친다
      p.legF = [mix(P(20, -40), P(30, -76), e), mix(P(26, -6), P(74, -88), e)];
      p.legB = [P(-16, -34), P(-24, 0)];
      p.armF = [mix(P(18, -90), P(-6, -96), e), mix(P(24, -104), P(-26, -88), e)];
      p.armB = [mix(P(-22, -88), P(10, -92), e), mix(P(-28, -102), P(30, -96), e)];
      p.chest = mix(p.chest, P(-8, -102), e * 0.9);
      p.headTilt = -0.1 * e;
    },
    grab(p, e) {
      // 한 손으로 목을 낚아챈다
      p.armF = [mix(P(24, -90), P(38, -104), e), mix(P(30, -104), P(62, -110), e)];
      p.armB = [P(-20, -86), P(-14, -74)];
      p.chest = mix(p.chest, P(9, -101), e);
      p.headTilt = -0.06 * e;
    }
  },

  /* 초오지터 : 거구의 융합 전사 — 크고 무거운 궤적 */
  gogeta: {
    jab(p, e) {
      p.armF = [mix(P(24, -90), P(40, -100), e), mix(P(31, -105), P(64, -100), e)];
      p.armB = [P(-24, -88), P(-30, -102)];
      p.chest = mix(p.chest, P(8, -100), e * 0.7);
    },
    straight(p, e) {
      // 어깨를 완전히 밀어 넣는 큰 정권
      p.armF = [mix(P(10, -96), P(46, -97), e), mix(P(18, -112), P(80, -95), e)];
      p.armB = [mix(P(-25, -86), P(-19, -76), e), mix(P(-30, -102), P(-12, -66), e)];
      p.chest = mix(p.chest, P(16, -99), e);
      p.head = mix(p.head, P(15, -121), e * 0.6);
      p.hip = mix(p.hip, P(9, -61), e);
      p.legF = [mix(P(19, -33), P(32, -32), e), mix(P(25, 0), P(48, 0), e)];
      p.legB = [mix(P(-19, -33), P(-28, -35), e), mix(P(-27, 0), P(-42, 0), e)];
    },
    roundhouse(p, e) {
      // 축을 크게 돌려 차 올리는 대회전
      p.legF = [mix(P(22, -40), P(36, -80), e), mix(P(28, -6), P(84, -90), e)];
      p.legB = [P(-16, -34), P(-24, 0)];
      p.armF = [P(10, -94), P(-6, -106)];
      p.armB = [P(-28, -86), P(-44, -92)];
      p.chest = mix(p.chest, P(-12, -102), e);
      p.head = mix(p.head, P(-13, -124), e * 0.7);
      p.headTilt = -0.16 * e;
    },
    airSlam(p, e) {
      p.armF = [mix(P(22, -126), P(32, -58), e), mix(P(28, -152), P(42, -30), e)];
      p.armB = [mix(P(-16, -128), P(18, -60), e), mix(P(-6, -152), P(34, -32), e)];
      p.chest = mix(p.chest, P(7, -98), e);
      p.legF = [P(22, -46), P(28, -18)];
      p.legB = [P(-20, -52), P(-28, -32)];
      p.headTilt = 0.14 * e;
    }
  },

  /* 키드 부우 : 고무처럼 늘어나는 팔다리와 예측 불가능한 난동 */
  majin: {
    jab(p, e) {
      // 팔을 쭉 늘려 후려치는 백핸드 (리치가 비정상적으로 길다)
      p.armF = [mix(P(22, -94), P(42, -100), e), mix(P(28, -106), P(76, -98), e)];
      p.armB = [P(-22, -86), P(-28, -72)];
      p.chest = mix(p.chest, P(4, -101), e * 0.5);
      p.headTilt = -0.1 * e;
    },
    straight(p, e) {
      // 팔이 고무처럼 길게 늘어나 꽂히는 스트레이트
      p.armF = [mix(P(8, -96), P(46, -98), e), mix(P(16, -110), P(92, -96), e)];
      p.armB = [mix(P(-22, -86), P(-14, -80), e), mix(P(-26, -102), P(-4, -70), e)];
      p.chest = mix(p.chest, P(14, -100), e);
      p.head = mix(p.head, P(13, -122), e * 0.5);
      p.hip = mix(p.hip, P(6, -62), e);
      p.legF = [P(20, -33), P(28, 0)];
      p.legB = [mix(P(-18, -33), P(-26, -34), e), mix(P(-26, 0), P(-40, 0), e)];
      p.headTilt = 0.08 * e;
    },
    roundhouse(p, e) {
      // 몸을 통째로 비틀어 도는 회전 뒤차기
      p.legF = [mix(P(20, -40), P(38, -66), e), mix(P(26, -6), P(90, -70), e)];
      p.legB = [P(-15, -34), P(-22, 0)];
      p.armF = [mix(P(20, -92), P(-14, -98), e), mix(P(26, -106), P(-38, -92), e)];
      p.armB = [mix(P(-22, -90), P(8, -94), e), mix(P(-28, -104), P(28, -88), e)];
      p.chest = mix(p.chest, P(-11, -101), e);
      p.head = mix(p.head, P(-13, -122), e);
      p.headTilt = 0.18 * e;
    },
    uppercut(p, e) {
      // 몸을 튕겨 올리는 박치기
      p.chest = mix(p.chest, P(4, -108), e);
      p.head = mix(p.head, P(8, -132), e);
      p.headTilt = -0.34 * e;
      p.armF = [mix(P(22, -86), P(24, -76), e), mix(P(28, -100), P(30, -58), e)];
      p.armB = [mix(P(-22, -86), P(-24, -76), e), mix(P(-28, -100), P(-30, -58), e)];
      p.legF = [P(17, -34), P(23, 0)];
      p.legB = [mix(P(-18, -33), P(-24, -46), e), mix(P(-26, 0), P(-34, -18), e)];
    },
    sweep(p, e) {
      // 몸을 눕히다시피 낮춰 크게 도는 다리 후리기
      crouchPose(p, 1.3);
      p.legF = [mix(P(18, -16), P(42, -16), e), mix(P(26, -4), P(98, -6), e)];
      p.armF = [P(10, -50), P(24, -38)];
      p.armB = [P(-22, -44), P(-34, -28)];
      p.headTilt = 0.2;
    },
    airSlam(p, e) {
      // 두 팔을 길게 늘려 내리찍는다
      p.armF = [mix(P(22, -124), P(34, -52), e), mix(P(28, -156), P(48, -20), e)];
      p.armB = [mix(P(-18, -126), P(16, -54), e), mix(P(-8, -156), P(38, -22), e)];
      p.legF = [P(20, -46), P(26, -20)];
      p.legB = [P(-18, -44), P(-24, -18)];
      p.chest = mix(p.chest, P(4, -98), e);
      p.headTilt = 0.16 * e;
    }
  },

  /* 오천크스 : 가볍고 요란한 곡예 격투. 크게 돌고 크게 튄다 */
  trickster: {
    jab(p, e) {
      // 몸을 돌려 치는 빠른 백너클
      p.armF = [mix(P(20, -92), P(40, -102), e), mix(P(26, -104), P(58, -108), e)];
      p.armB = [P(-20, -88), P(-14, -76)];
      p.chest = mix(p.chest, P(6, -101), e * 0.6);
      p.headTilt = -0.08 * e;
    },
    straight(p, e) {
      // 롤링 헤라클레스 펀치 : 팔을 감아 돌렸다가 내지른다
      const sw = Math.sin(e * Math.PI) * 12;
      p.armF = [mix(P(6, -96), P(44, -98), e), mix(P(10 - sw, -108), P(78, -97), e)];
      p.armB = [mix(P(-22, -88), P(-16, -80), e), mix(P(-26, -102), P(-6, -72), e)];
      p.chest = mix(p.chest, P(14, -100), e);
      p.head = mix(p.head, P(13, -122), e * 0.6);
      p.hip = mix(p.hip, P(7, -62), e);
      p.legF = [mix(P(18, -33), P(28, -33), e), mix(P(24, 0), P(43, 0), e)];
      p.legB = [mix(P(-18, -33), P(-25, -34), e), mix(P(-26, 0), P(-38, 0), e)];
    },
    roundhouse(p, e) {
      // 다이너마이트 킥 : 몸을 옆으로 눕혀 크게 돌려 찬다
      p.legF = [mix(P(20, -42), P(34, -84), e), mix(P(26, -8), P(72, -100), e)];
      p.legB = [mix(P(-14, -34), P(-24, -26), e), mix(P(-20, 0), P(-34, -4), e)];
      p.armF = [mix(P(18, -92), P(2, -110), e), mix(P(24, -106), P(-14, -122), e)];
      p.armB = [P(-26, -86), P(-42, -92)];
      p.chest = mix(p.chest, P(-12, -103), e);
      p.head = mix(p.head, P(-13, -125), e);
      p.headTilt = -0.22 * e;
    },
    uppercut(p, e) {
      // 팽이처럼 돌며 솟구치는 어퍼
      p.armF = [mix(P(18, -84), P(26, -114), e), mix(P(26, -98), P(34, -152), e)];
      p.armB = [mix(P(-20, -86), P(-10, -104), e), mix(P(-26, -100), P(4, -124), e)];
      p.chest = mix(p.chest, P(2, -106), e);
      p.head = mix(p.head, P(4, -128), e);
      p.headTilt = -0.16 * e;
      p.legF = [mix(P(17, -34), P(22, -48), e), mix(P(23, 0), P(30, -22), e)];
      p.legB = [mix(P(-18, -33), P(-24, -44), e), mix(P(-26, 0), P(-34, -16), e)];
    },
    airKick(p, e) {
      // 공중에서 두 발을 모아 내리꽂는다
      p.legF = [mix(P(20, -52), P(32, -64), e), mix(P(26, -24), P(52, -16), e)];
      p.legB = [mix(P(-16, -50), P(24, -60), e), mix(P(-22, -22), P(46, -12), e)];
      p.armF = [P(16, -96), P(6, -112)];
      p.armB = [P(-22, -94), P(-34, -108)];
      p.headTilt = 0.1 * e;
    }
  },

  /* 인조인간 17호 : 몸을 거의 쓰지 않고 팔다리만 정확하게 내는 무심한 격투 */
  cyborg: {
    jab(p, e) {
      // 다른 손은 내린 채 한 손만 툭 내민다
      p.armF = [mix(P(24, -90), P(38, -98), e), mix(P(30, -103), P(60, -98), e)];
      p.armB = [P(-21, -84), P(-25, -62)];
      p.chest = mix(p.chest, P(4, -100), e * 0.35);
      p.headTilt = -0.05 * e;
    },
    straight(p, e) {
      // 상체를 거의 움직이지 않는 정확한 정권
      p.armF = [mix(P(18, -94), P(43, -99), e), mix(P(24, -106), P(74, -99), e)];
      p.armB = [P(-21, -85), P(-25, -64)];
      p.chest = mix(p.chest, P(8, -100), e * 0.7);
      p.head = mix(p.head, P(9, -122), e * 0.4);
      p.hip = mix(p.hip, P(4, -62), e * 0.7);
      p.legF = [mix(P(18, -33), P(26, -33), e), mix(P(24, 0), P(40, 0), e)];
      p.legB = [P(-19, -33), P(-28, 0)];
    },
    roundhouse(p, e) {
      // 무릎을 접었다 채찍처럼 펴는 하이킥
      p.legF = [mix(P(20, -46), P(28, -80), e), mix(P(24, -22), P(76, -86), e)];
      p.legB = [P(-15, -34), P(-22, 0)];
      p.armF = [P(14, -90), P(6, -70)];
      p.armB = [P(-24, -88), P(-34, -96)];
      p.chest = mix(p.chest, P(-7, -102), e * 0.8);
      p.head = mix(p.head, P(-8, -124), e * 0.5);
      p.headTilt = -0.08 * e;
    },
    uppercut(p, e) {
      // 무릎을 세워 올려 찍는다
      p.legF = [mix(P(20, -42), P(24, -100), e), mix(P(26, -8), P(34, -70), e)];
      p.legB = [mix(P(-18, -33), P(-22, -40), e), mix(P(-26, 0), P(-32, -10), e)];
      p.armF = [P(22, -92), P(28, -74)];
      p.armB = [P(-22, -90), P(-30, -76)];
      p.chest = mix(p.chest, P(2, -104), e);
      p.head = mix(p.head, P(4, -126), e);
    },
    airKick(p, e) {
      // 급강하 니킥
      p.legF = [mix(P(20, -58), P(26, -74), e), mix(P(26, -30), P(38, -20), e)];
      p.legB = [P(-16, -42), P(-22, -16)];
      p.armF = [P(18, -94), P(12, -110)];
      p.armB = [P(-22, -92), P(-32, -104)];
    }
  },

  /* 인조인간 18호 : 발끝까지 날카로운 속공. 백스핀과 손날을 쓴다 */
  blitz: {
    jab(p, e) {
      // 손날로 찌른다
      p.armF = [mix(P(24, -92), P(40, -100), e), mix(P(30, -104), P(64, -100), e)];
      p.armB = [P(-20, -86), P(-15, -68)];
      p.chest = mix(p.chest, P(5, -101), e * 0.5);
    },
    straight(p, e) {
      // 팔꿈치를 낮게 붙여 찌르는 스트레이트
      p.armF = [mix(P(16, -94), P(42, -98), e), mix(P(22, -104), P(72, -98), e)];
      p.armB = [mix(P(-21, -86), P(-16, -80), e), mix(P(-25, -102), P(-8, -74), e)];
      p.chest = mix(p.chest, P(12, -100), e);
      p.head = mix(p.head, P(12, -122), e * 0.6);
      p.hip = mix(p.hip, P(6, -62), e);
      p.legF = [mix(P(18, -33), P(27, -33), e), mix(P(24, 0), P(41, 0), e)];
      p.legB = [mix(P(-18, -33), P(-24, -34), e), mix(P(-26, 0), P(-36, 0), e)];
    },
    roundhouse(p, e) {
      // 몸을 완전히 돌려 차는 백스핀 킥
      p.legF = [mix(P(20, -40), P(36, -74), e), mix(P(26, -6), P(84, -80), e)];
      p.legB = [P(-15, -34), P(-22, 0)];
      p.armF = [mix(P(20, -90), P(-12, -96), e), mix(P(26, -104), P(-34, -90), e)];
      p.armB = [mix(P(-22, -88), P(8, -92), e), mix(P(-28, -102), P(26, -86), e)];
      p.chest = mix(p.chest, P(-10, -101), e);
      p.head = mix(p.head, P(-12, -123), e);
      p.headTilt = 0.16 * e;
    },
    uppercut(p, e) {
      // 뛰어오르며 무릎을 쳐올린다
      p.legF = [mix(P(19, -44), P(24, -104), e), mix(P(25, -10), P(32, -74), e)];
      p.legB = [mix(P(-18, -33), P(-23, -46), e), mix(P(-26, 0), P(-33, -20), e)];
      p.armF = [mix(P(21, -88), P(24, -108), e), mix(P(27, -101), P(30, -128), e)];
      p.armB = [P(-21, -88), P(-27, -74)];
      p.chest = mix(p.chest, P(2, -106), e);
      p.head = mix(p.head, P(4, -128), e);
    },
    sweep(p, e) {
      // 낮게 도는 회전 후리기
      crouchPose(p, 1.2);
      p.legF = [mix(P(18, -18), P(38, -18), e), mix(P(26, -4), P(88, -8), e)];
      p.armF = [P(12, -56), P(26, -44)];
      p.armB = [P(-22, -50), P(-32, -34)];
      p.headTilt = 0.12;
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

  // 캐릭터 고유 동작이 있으면 그것으로 대체한다
  const style = STYLE_MOVES[f.char.style];
  if (style && style[def.key]) {
    style[def.key](p, e, f);
    return p;
  }

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
    case 'ultimate':
    case 'orbSpecial':
    case 'orbUltimate': {
      const charging = a.frame < def.startup;
      const gs = Math.round(clamp(a.frame / Math.max(1, def.startup), 0, 1) * ATTACK_STEPS);
      const g = charging ? gs / ATTACK_STEPS : 1;
      const src = skillOf(f.char, def);
      const name = (src && src.motion) || 'cupped';
      // 필살기와 초필살기가 서로 다른 모션일 수 있으므로 키를 분리한다
      const pre = isUltimate(def) ? 'ult' : 'beam';
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

/* ---------------- 등장 모션 ----------------
 *  캐릭터마다 완전히 다른 입장 연출. (p, t, raw)
 *   t   : 양자화된 진행도 (포즈용 - 스프라이트로 굽기 위해)
 *   raw : 실제 진행도 0~1 (offX/offY 같은 부드러운 이동용)
 *  offX / offY 는 스프라이트에 굽지 않고 그릴 때 더해진다.
 * ------------------------------------------- */
const ENTRANCE_FRAMES = 96;
const ENTRANCE_STEPS = 8;

const ENTRANCE_POSE = {
  // 손오공 : 하늘에서 내려와 착지 → 주먹을 맞부딪히고 자세
  descend(p, t, raw) {
    if (raw < 0.4) {
      // 낙하는 뒤로 갈수록 빨라진다 (중력처럼)
      const k = raw / 0.4;
      p.offY = -250 * (1 - k * k);
      p.armF = [P(28, -104), P(40, -124)];
      p.armB = [P(-26, -104), P(-38, -124)];
      p.legF = [P(20, -40), P(28, -14)];
      p.legB = [P(-18, -38), P(-26, -10)];
      p.chest = P(0, -101); p.head = P(2, -124);
      p.headTilt = 0.06;
    } else if (t < 0.53) {
      crouchPose(p, 1.25);              // 착지 스쿼시
      p.armF = [P(24, -44), P(34, -26)];
      p.armB = [P(-22, -44), P(-32, -26)];
    } else if (t < 0.66) {
      p.chest = P(0, -96); p.head = P(2, -118); p.hip = P(0, -58);
      p.armF = [P(22, -84), P(8, -96)];   // 두 주먹을 가슴 앞으로
      p.armB = [P(-20, -84), P(-6, -96)];
      p.legF = [P(19, -30), P(26, 0)];
      p.legB = [P(-18, -30), P(-25, 0)];
    } else if (t < 0.79) {
      p.chest = P(1, -100); p.head = P(3, -122);
      p.armF = [P(20, -88), P(4, -100)];  // 맞부딪히는 순간
      p.armB = [P(-18, -88), P(-2, -100)];
      p.legF = [P(20, -33), P(27, 0)];
      p.legB = [P(-19, -33), P(-27, 0)];
    } else {
      p.armF = [P(25, -86), P(31, -103)];
      p.armB = [P(-23, -86), P(-27, -102)];
    }
  },

  // 베지터 : 팔짱을 낀 채 내려다보다가 코웃음치며 자세
  crossArms(p, t) {
    p.legF = [P(22, -33), P(31, 0)];
    p.legB = [P(-21, -33), P(-30, 0)];
    if (t < 0.28) {
      p.armF = [P(18, -86), P(-14, -84)];   // 팔짱을 끼고 눈을 감은 채
      p.armB = [P(-18, -88), P(14, -86)];
      p.chest = P(-3, -100); p.head = P(-2, -123);
      p.headTilt = 0.08;
    } else if (t < 0.53) {
      p.armF = [P(19, -90), P(-14, -90)];   // 고개를 들어 상대를 내려다본다
      p.armB = [P(-19, -92), P(14, -92)];
      p.chest = P(-2, -102); p.head = P(0, -125);
      p.headTilt = -0.16;
    } else if (t < 0.66) {
      p.armF = [P(20, -92), P(-12, -94)];   // 기가 치솟으며 어깨가 들린다
      p.armB = [P(-20, -94), P(12, -96)];
      p.chest = P(-1, -103); p.head = P(1, -126);
      p.headTilt = -0.1;
    } else if (t < 0.79) {
      p.armF = [P(24, -90), P(34, -80)];    // 한 팔을 풀어 손등을 보인다
      p.armB = [P(-20, -88), P(-10, -94)];
      p.chest = P(2, -100); p.head = P(4, -122);
      p.headTilt = -0.04;
    } else {
      p.armF = [P(25, -85), P(31, -103)];
      p.armB = [P(-23, -85), P(-27, -102)];
    }
  },

  // 피콜로 : 공중에서 가부좌를 틀고 명상 → 눈을 뜨고 내려선다
  meditate(p, t, raw) {
    if (raw < 0.55) {
      p.offY = -74 * (1 - raw / 0.55);
      // 다리를 접어 가부좌
      p.legF = [P(24, -56), P(6, -48)];
      p.legB = [P(-24, -56), P(-6, -46)];
      p.armF = [P(20, -86), P(-10, -84)];
      p.armB = [P(-20, -88), P(10, -86)];
      p.hip = P(0, -66); p.chest = P(0, -102); p.head = P(1, -125);
      p.headTilt = 0.05;
    } else if (t < 0.72) {
      p.legF = [P(20, -34), P(27, 0)];       // 다리를 펴며 착지
      p.legB = [P(-20, -34), P(-27, 0)];
      p.armF = [P(18, -86), P(-8, -82)];
      p.armB = [P(-18, -88), P(8, -84)];
      p.chest = P(-1, -101); p.head = P(1, -123);
    } else if (t < 0.85) {
      p.armF = [P(26, -88), P(36, -96)];     // 팔짱을 풀며
      p.armB = [P(-24, -88), P(-32, -96)];
      p.legF = [P(21, -34), P(29, 0)];
      p.legB = [P(-21, -34), P(-29, 0)];
    } else {
      p.armF = [P(25, -85), P(31, -103)];
      p.armB = [P(-23, -85), P(-27, -102)];
    }
  },

  // 프리저 : 팔짱을 끼고 유유히 떠서 다가와 손짓으로 도발
  hover(p, t, raw) {
    const k = 1 - Math.min(1, raw / 0.62);
    p.offX = -92 * k;
    p.offY = -80 * k * (0.6 + 0.4 * k);
    if (t < 0.66) {
      p.armF = [P(17, -90), P(-14, -88)];
      p.armB = [P(-17, -92), P(13, -90)];
      p.chest = P(-2, -102); p.head = P(0, -125);
      p.headTilt = -0.13;
      p.legF = [P(15, -36), P(20, -6)];
      p.legB = [P(-15, -36), P(-20, -4)];
    } else if (t < 0.85) {
      p.armF = [P(28, -94), P(48, -98)];     // 한 손을 내밀어 '와 보라'
      p.armB = [P(-20, -84), P(-12, -68)];
      p.chest = P(3, -100); p.head = P(5, -122);
      p.headTilt = -0.06;
      p.legF = [P(17, -34), P(23, 0)];
      p.legB = [P(-17, -34), P(-24, 0)];
    } else {
      p.armF = [P(25, -85), P(31, -103)];
      p.armB = [P(-23, -85), P(-27, -102)];
    }
  },

  // 셀 : 어깨를 으쓱하고 두 팔을 벌려 여유를 부린다
  shrug(p, t) {
    if (t < 0.4) {
      p.armF = [P(26, -96), P(20, -80)];     // 으쓱 (팔꿈치 올리고 손바닥 위로)
      p.armB = [P(-26, -96), P(-20, -80)];
      p.chest = P(0, -103); p.head = P(2, -125);
      p.legF = [P(18, -33), P(24, 0)];
      p.legB = [P(-18, -33), P(-24, 0)];
    } else if (t < 0.66) {
      p.armF = [P(30, -100), P(50, -112)];   // 두 팔을 크게 벌린다
      p.armB = [P(-30, -100), P(-50, -112)];
      p.chest = P(0, -102); p.head = P(2, -125);
      p.headTilt = -0.12;
      p.legF = [P(24, -33), P(34, 0)];
      p.legB = [P(-24, -33), P(-34, 0)];
    } else if (t < 0.85) {
      p.armF = [P(27, -90), P(38, -84)];
      p.armB = [P(-27, -90), P(-38, -84)];
      p.legF = [P(21, -33), P(29, 0)];
      p.legB = [P(-21, -33), P(-29, 0)];
    } else {
      p.armF = [P(25, -85), P(31, -103)];
      p.armB = [P(-23, -85), P(-27, -102)];
    }
  },

  // 얼티밋 오반 : 조용히 서 있다가 기를 끌어올리며 자세를 잡는다
  calm(p, t) {
    if (t < 0.4) {
      p.armF = [P(19, -84), P(23, -62)];     // 손을 자연스럽게 내리고
      p.armB = [P(-19, -84), P(-23, -62)];
      p.chest = P(0, -101); p.head = P(2, -123);
      p.legF = [P(15, -33), P(19, 0)];
      p.legB = [P(-15, -33), P(-19, 0)];
    } else if (t < 0.66) {
      p.armF = [P(22, -88), P(14, -96)];     // 주먹을 쥐며 기를 모은다
      p.armB = [P(-22, -88), P(-14, -96)];
      p.chest = P(0, -99); p.head = P(2, -121);
      p.legF = [P(19, -32), P(26, 0)];
      p.legB = [P(-19, -32), P(-26, 0)];
    } else if (t < 0.85) {
      p.armF = [P(26, -90), P(30, -108)];
      p.armB = [P(-24, -88), P(-28, -104)];
      p.legF = [P(21, -33), P(29, 0)];
      p.legB = [P(-21, -33), P(-29, 0)];
    } else {
      p.armF = [P(25, -85), P(31, -103)];
      p.armB = [P(-23, -85), P(-27, -102)];
    }
  },

  // 트랭크스 : 등 뒤에서 검을 뽑아 크게 베어 내리고 자세
  sword(p, t) {
    if (t < 0.27) {
      p.armF = [P(4, -112), P(-18, -122)];   // 등 뒤 어깨로 손을 넘긴다 (아직 칼집)
      p.armB = [P(-20, -86), P(-24, -70)];
      p.chest = P(-6, -101); p.head = P(-3, -124);
      p.headTilt = -0.06;
      p.legF = [P(18, -33), P(24, 0)];
      p.legB = [P(-20, -33), P(-28, 0)];
    } else if (t < 0.4) {
      p.armF = [P(10, -126), P(24, -148)];   // 뽑아 올린다
      p.armB = [P(-20, -88), P(-26, -76)];
      p.chest = P(-2, -102); p.head = P(1, -125);
      p.legF = [P(19, -33), P(26, 0)];
      p.legB = [P(-20, -33), P(-28, 0)];
      setSword(p, -1.9, 74);
    } else if (t < 0.53) {
      p.armF = [P(34, -104), P(56, -84)];    // 크게 베어 내린다
      p.armB = [P(-18, -84), P(-22, -70)];
      p.chest = P(10, -99); p.head = P(11, -120);
      p.headTilt = 0.08;
      p.hip = P(4, -61);
      p.legF = [P(26, -33), P(38, 0)];
      p.legB = [P(-18, -34), P(-28, 0)];
      setSword(p, 0.5, 78);
    } else if (t < 0.79) {
      p.armF = [P(26, -92), P(34, -76)];     // 검을 되돌리며
      p.armB = [P(-20, -86), P(-24, -74)];
      p.legF = [P(22, -33), P(31, 0)];
      p.legB = [P(-19, -33), P(-27, 0)];
      setSword(p, -1.2, 74);
    } else {
      p.armF = [P(25, -85), P(31, -103)];
      p.armB = [P(-23, -85), P(-27, -102)];
    }
  },

  // 브로리 : 고개를 숙이고 서 있다가 포효하며 기를 폭발시킨다
  roar(p, t) {
    if (t < 0.4) {
      p.armF = [P(24, -84), P(30, -62)];       // 팔을 늘어뜨린 채 고개를 숙인다
      p.armB = [P(-24, -84), P(-30, -62)];
      p.chest = P(-1, -99); p.head = P(1, -120);
      p.headTilt = 0.16;
      p.legF = [P(21, -34), P(30, 0)];
      p.legB = [P(-21, -34), P(-30, 0)];
    } else if (t < 0.53) {
      p.armF = [P(26, -86), P(34, -66)];       // 천천히 고개를 든다
      p.armB = [P(-26, -86), P(-34, -66)];
      p.chest = P(-2, -101); p.head = P(0, -123);
      p.headTilt = -0.06;
      p.legF = [P(23, -34), P(33, 0)];
      p.legB = [P(-23, -34), P(-33, 0)];
    } else if (t < 0.79) {
      // 포효 : 두 팔을 위로 벌리고 몸을 크게 젖힌다
      p.armF = [P(32, -106), P(50, -132)];
      p.armB = [P(-32, -106), P(-50, -132)];
      p.chest = P(-4, -105); p.head = P(-2, -128);
      p.headTilt = -0.26;
      p.legF = [P(28, -34), P(42, 0)];
      p.legB = [P(-28, -34), P(-42, 0)];
    } else {
      p.armF = [P(27, -88), P(34, -104)];
      p.armB = [P(-26, -88), P(-32, -102)];
      p.legF = [P(23, -34), P(33, 0)];
      p.legB = [P(-23, -34), P(-33, 0)];
    }
  },

  // 쿠우라 : 팔짱을 낀 채 급강하해 착지하고 꼬리를 크게 휘두른다
  dive(p, t, raw) {
    if (raw < 0.42) {
      const k = raw / 0.42;
      p.offY = -240 * (1 - k * k);
      p.armF = [P(17, -90), P(-14, -88)];        // 팔짱
      p.armB = [P(-17, -92), P(13, -90)];
      p.chest = P(-1, -102); p.head = P(1, -125);
      p.headTilt = 0.1;
      p.legF = [P(14, -38), P(18, -8)];
      p.legB = [P(-14, -38), P(-18, -6)];
      p.tail = [P(-26, -74), P(-48, -104), P(-56, -134)];
    } else if (t < 0.55) {
      crouchPose(p, 1.2);                        // 착지 충격
      p.armF = [P(20, -52), P(30, -40)];
      p.armB = [P(-20, -52), P(-30, -40)];
      p.tail = [P(-34, -30), P(-70, -18), P(-96, -6)];
    } else if (t < 0.79) {
      // 꼬리를 크게 휘두르며 일어선다
      p.armF = [P(26, -92), P(40, -96)];
      p.armB = [P(-22, -88), P(-28, -74)];
      p.chest = P(3, -101); p.head = P(5, -123);
      p.legF = [P(20, -34), P(28, 0)];
      p.legB = [P(-20, -34), P(-29, 0)];
      p.tail = [P(-10, -46), P(34, -44), P(70, -30)];
    } else {
      p.armF = [P(25, -85), P(31, -103)];
      p.armB = [P(-23, -85), P(-27, -102)];
      p.legF = [P(18, -34), P(25, 0)];
      p.legB = [P(-18, -34), P(-26, 0)];
    }
  },

  // 초2 오반 : 고개를 숙이고 있다가 분노의 기를 터뜨리며 일어선다
  furyRise(p, t) {
    if (t < 0.25) {
      crouchPose(p, 0.6);
      p.armF = [P(20, -78), P(24, -58)];     // 주먹을 꽉 쥔 채 떨고 있다
      p.armB = [P(-20, -78), P(-24, -58)];
      p.head = P(4, -104); p.headTilt = 0.32;
    } else if (t < 0.5) {
      p.hip = P(0, -60); p.chest = P(-4, -102); p.head = P(-4, -126);
      p.armF = [P(24, -88), P(31, -66)];
      p.armB = [P(-24, -88), P(-31, -66)];
      p.headTilt = -0.26;
      p.legF = [P(22, -34), P(31, 0)];
      p.legB = [P(-22, -34), P(-31, 0)];
    } else if (t < 0.8) {
      // 폭발의 정점 : 팔을 뿌리치고 고개를 든다
      p.hip = P(0, -64); p.chest = P(-2, -105); p.head = P(0, -129);
      p.armF = [P(29, -92), P(42, -72)];
      p.armB = [P(-29, -92), P(-42, -72)];
      p.headTilt = -0.36;
      p.legF = [P(25, -34), P(36, 0)];
      p.legB = [P(-25, -34), P(-36, 0)];
    } else {
      p.armF = [P(25, -85), P(31, -103)];
      p.armB = [P(-23, -85), P(-27, -102)];
    }
  },

  // 초2 오공 : 곧게 선 채로 급강하 → 한 무릎 착지 → 주먹을 맞대고 자세
  kiLand(p, t, raw) {
    if (raw < 0.35) {
      const k = raw / 0.35;
      p.offY = -240 * (1 - k * k * k);
      p.armF = [P(18, -96), P(3, -74)];        // 두 팔을 뒤로 뻗어 낙하
      p.armB = [P(-20, -96), P(-35, -74)];
      p.legF = [P(18, -42), P(24, -16)];
      p.legB = [P(-16, -40), P(-22, -12)];
      p.chest = P(2, -102); p.head = P(4, -125);
      p.headTilt = -0.06;
    } else if (t < 0.55) {
      crouchPose(p, 1.35);
      p.armF = [P(23, -32), P(31, -8)];        // 한 손으로 지면을 짚는다
      p.armB = [P(-20, -50), P(-29, -34)];
      p.legB = [P(-23, -14), P(-35, 0)];
      p.headTilt = 0.2;
    } else if (t < 0.78) {
      p.hip = P(0, -58); p.chest = P(1, -97); p.head = P(3, -119);
      p.armF = [P(20, -86), P(3, -94)];        // 두 주먹을 가슴 앞에서 맞댄다
      p.armB = [P(-18, -86), P(-1, -92)];
      p.legF = [P(18, -30), P(25, 0)];
      p.legB = [P(-17, -30), P(-24, 0)];
    } else {
      p.armF = [P(25, -85), P(31, -103)];
      p.armB = [P(-23, -85), P(-27, -102)];
    }
  },

  // 초2 베지터 : 팔짱을 낀 채 내려와 기를 터뜨리며 팔을 뿌리친다
  flare(p, t, raw) {
    if (raw < 0.42) {
      p.offY = -130 * (1 - raw / 0.42);
      p.armF = [P(18, -92), P(-14, -92)];
      p.armB = [P(-18, -94), P(14, -94)];
      p.legF = [P(16, -36), P(21, -6)];
      p.legB = [P(-15, -36), P(-20, -4)];
      p.chest = P(0, -101); p.head = P(-1, -124);
      p.headTilt = -0.15;
    } else if (t < 0.62) {
      p.hip = P(0, -60); p.chest = P(0, -100); p.head = P(1, -122);
      p.armF = [P(26, -88), P(41, -70)];
      p.armB = [P(-26, -88), P(-41, -70)];
      p.legF = [P(24, -34), P(34, 0)];
      p.legB = [P(-24, -34), P(-34, 0)];
      p.headTilt = -0.1;
    } else if (t < 0.85) {
      p.hip = P(0, -56); p.chest = P(0, -96); p.head = P(1, -118);
      p.armF = [P(29, -84), P(38, -60)];
      p.armB = [P(-29, -84), P(-38, -60)];
      p.legF = [P(27, -32), P(38, 0)];
      p.legB = [P(-27, -32), P(-38, 0)];
      p.headTilt = -0.18;
    } else {
      p.armF = [P(25, -85), P(31, -103)];
      p.armB = [P(-23, -85), P(-27, -102)];
    }
  },

  // 베지트 : 팔짱 → 장갑을 당겨 끼우고 → 손끝으로 도발
  glove(p, t) {
    if (t < 0.3) {
      p.armF = [P(17, -92), P(-14, -90)];
      p.armB = [P(-17, -94), P(13, -92)];
      p.chest = P(0, -101); p.head = P(0, -124);
      p.headTilt = -0.12;
      p.legF = [P(15, -34), P(19, 0)];
      p.legB = [P(-14, -34), P(-18, 0)];
    } else if (t < 0.58) {
      p.armF = [P(10, -96), P(-7, -105)];      // 반대편 장갑을 당겨 끼운다
      p.armB = [P(-12, -94), P(2, -109)];
      p.chest = P(0, -100); p.head = P(2, -123);
      p.headTilt = 0.14;
      p.legF = [P(16, -34), P(20, 0)];
      p.legB = [P(-15, -34), P(-19, 0)];
    } else if (t < 0.8) {
      p.armF = [P(24, -94), P(45, -105)];      // 손끝을 까딱여 도발
      p.armB = [P(-19, -86), P(-14, -66)];
      p.chest = P(3, -101); p.head = P(5, -123);
      p.headTilt = -0.07;
      p.legF = [P(18, -34), P(24, 0)];
      p.legB = [P(-17, -34), P(-23, 0)];
    } else {
      p.armF = [P(25, -85), P(31, -103)];
      p.armB = [P(-23, -85), P(-27, -102)];
    }
  },

  // 초오지터 : 퓨전 포즈를 취했다가 융합의 빛과 함께 팔을 벌린다
  fusionPose(p, t) {
    if (t < 0.28) {
      p.armF = [P(26, -92), P(51, -86)];       // 한 팔을 옆으로 곧게 뻗는다
      p.armB = [P(-24, -94), P(-47, -105)];
      p.chest = P(6, -100); p.head = P(8, -122); p.hip = P(2, -62);
      p.headTilt = 0.12;
      p.legF = [P(24, -34), P(36, 0)];
      p.legB = [P(-22, -34), P(-32, 0)];
    } else if (t < 0.52) {
      p.armF = [P(20, -96), P(38, -111)];      // 손끝을 맞대는 순간
      p.armB = [P(-18, -96), P(0, -113)];
      p.chest = P(2, -98); p.head = P(4, -120); p.hip = P(0, -58);
      p.headTilt = -0.08;
      p.legF = [P(20, -32), P(28, 0)];
      p.legB = [P(-20, -32), P(-28, 0)];
    } else if (t < 0.8) {
      p.armF = [P(31, -96), P(52, -78)];       // 융합의 빛
      p.armB = [P(-31, -96), P(-52, -78)];
      p.chest = P(0, -104); p.head = P(1, -128); p.hip = P(0, -64);
      p.headTilt = -0.26;
      p.legF = [P(27, -34), P(39, 0)];
      p.legB = [P(-27, -34), P(-39, 0)];
    } else {
      p.armF = [P(25, -85), P(31, -103)];
      p.armB = [P(-23, -85), P(-27, -102)];
    }
  },

  // 키드 부우 : 목을 꺾으며 나타나 몸을 젖히고 광소한다
  cackle(p, t) {
    if (t < 0.28) {
      // 팔을 축 늘어뜨린 채 고개만 홱 꺾는다
      p.armF = [P(21, -84), P(26, -60)];
      p.armB = [P(-21, -84), P(-26, -60)];
      p.chest = P(0, -100); p.head = P(2, -122);
      p.headTilt = 0.42;
      p.legF = [P(15, -34), P(19, 0)];
      p.legB = [P(-15, -34), P(-19, 0)];
    } else if (t < 0.53) {
      // 반대쪽으로 홱
      p.armF = [P(23, -86), P(30, -62)];
      p.armB = [P(-23, -86), P(-30, -62)];
      p.chest = P(0, -101); p.head = P(2, -123);
      p.headTilt = -0.36;
      p.legF = [P(17, -34), P(22, 0)];
      p.legB = [P(-17, -34), P(-22, 0)];
    } else if (t < 0.8) {
      // 몸을 활처럼 젖히고 팔을 벌려 웃는다
      p.armF = [P(30, -100), P(48, -122)];
      p.armB = [P(-30, -100), P(-48, -122)];
      p.chest = P(-4, -104); p.head = P(-3, -128);
      p.headTilt = -0.42;
      p.hip = P(0, -63);
      p.legF = [P(24, -34), P(35, 0)];
      p.legB = [P(-24, -34), P(-35, 0)];
    } else {
      p.armF = [P(26, -84), P(33, -100)];
      p.armB = [P(-24, -84), P(-29, -100)];
      p.headTilt = 0.1;
      p.legF = [P(19, -34), P(26, 0)];
      p.legB = [P(-19, -34), P(-26, 0)];
    }
  },

  // 오천크스 : 하늘에서 내려와 으스대는 포즈를 잡고 V 자를 그린다
  boast(p, t, raw) {
    if (raw < 0.32) {
      const k = raw / 0.32;
      p.offY = -190 * (1 - k * k);
      p.armF = [P(19, -92), P(-14, -92)];      // 팔짱을 낀 채 내려온다
      p.armB = [P(-19, -94), P(14, -94)];
      p.legF = [P(15, -38), P(20, -8)];
      p.legB = [P(-15, -38), P(-20, -6)];
      p.chest = P(0, -101); p.head = P(-1, -124);
      p.headTilt = -0.18;
    } else if (t < 0.53) {
      // 착지하며 두 손을 허리에 얹고 가슴을 편다
      p.armF = [P(24, -88), P(20, -64)];
      p.armB = [P(-24, -88), P(-20, -64)];
      p.chest = P(-2, -102); p.head = P(0, -125);
      p.headTilt = -0.22;
      p.hip = P(0, -62);
      p.legF = [P(21, -34), P(30, 0)];
      p.legB = [P(-21, -34), P(-30, 0)];
    } else if (t < 0.79) {
      // 손가락으로 V 자를 그리며 씩 웃는다
      p.armF = [P(26, -102), P(38, -128)];
      p.armB = [P(-22, -86), P(-18, -64)];
      p.chest = P(2, -101); p.head = P(4, -124);
      p.headTilt = -0.1;
      p.legF = [P(19, -34), P(26, 0)];
      p.legB = [P(-18, -34), P(-25, 0)];
    } else {
      p.armF = [P(25, -85), P(31, -103)];
      p.armB = [P(-23, -85), P(-27, -102)];
    }
  },

  // 인조인간 17호 : 주머니에 손을 넣은 채 어슬렁 걸어와 고개를 든다
  stroll(p, t, raw) {
    if (raw < 0.5) {
      p.offX = -110 * (1 - raw / 0.5);
      // 손을 주머니에 꽂은 채 느긋하게 걸어온다
      const sw = Math.sin(raw * 26) * 8;
      p.armF = [P(20, -84), P(24, -60)];
      p.armB = [P(-20, -84), P(-24, -60)];
      p.legF = [P(16 + sw, -33), P(21 + sw * 1.4, -Math.max(0, sw) * 0.9)];
      p.legB = [P(-15 - sw, -33), P(-20 - sw * 1.4, -Math.max(0, -sw) * 0.9)];
      p.chest = P(-1, -100); p.head = P(1, -122);
      p.headTilt = 0.1;
    } else if (t < 0.72) {
      // 멈춰 서서 고개를 든다
      p.armF = [P(20, -84), P(24, -60)];
      p.armB = [P(-20, -84), P(-24, -60)];
      p.chest = P(-2, -101); p.head = P(-1, -124);
      p.headTilt = -0.14;
      p.legF = [P(15, -34), P(19, 0)];
      p.legB = [P(-15, -34), P(-19, 0)];
    } else if (t < 0.85) {
      // 한 손만 들어 까딱
      p.armF = [P(24, -94), P(40, -102)];
      p.armB = [P(-20, -84), P(-24, -62)];
      p.chest = P(1, -101); p.head = P(3, -123);
      p.headTilt = -0.06;
      p.legF = [P(17, -34), P(23, 0)];
      p.legB = [P(-17, -34), P(-23, 0)];
    } else {
      p.armF = [P(25, -85), P(31, -103)];
      p.armB = [P(-23, -85), P(-27, -102)];
    }
  },

  // 인조인간 18호 : 팔짱을 낀 채 서 있다가 머리카락을 쓸어 넘긴다
  flick(p, t) {
    if (t < 0.3) {
      p.armF = [P(17, -92), P(-14, -90)];
      p.armB = [P(-17, -94), P(13, -92)];
      p.chest = P(0, -101); p.head = P(-1, -124);
      p.headTilt = -0.12;
      p.legF = [P(14, -34), P(18, 0)];
      p.legB = [P(-14, -34), P(-18, 0)];
    } else if (t < 0.58) {
      // 한 손을 관자놀이로 올려 머리를 넘긴다
      p.armF = [P(20, -104), P(6, -128)];
      p.armB = [P(-18, -88), P(-14, -66)];
      p.chest = P(-1, -101); p.head = P(0, -124);
      p.headTilt = 0.14;
      p.legF = [P(15, -34), P(19, 0)];
      p.legB = [P(-15, -34), P(-19, 0)];
    } else if (t < 0.8) {
      // 손을 내리며 시선을 돌린다
      p.armF = [P(22, -90), P(26, -68)];
      p.armB = [P(-20, -88), P(-26, -70)];
      p.chest = P(1, -101); p.head = P(2, -123);
      p.headTilt = -0.16;
      p.legF = [P(17, -34), P(23, 0)];
      p.legB = [P(-17, -34), P(-23, 0)];
    } else {
      p.armF = [P(25, -85), P(31, -103)];
      p.armB = [P(-23, -85), P(-27, -102)];
    }
  },

  // 기본 : 그냥 자세를 잡는다
  stance(p) {}
};

/* ---------------- 승리 모션 ----------------
 *  4프레임 루프. (p, i, bob)
 * ------------------------------------------- */
const VICTORY_POSE = {
  // 손오공 : 뒷머리를 긁으며 웃는다
  scratch(p, i, bob) {
    // 팔꿈치를 크게 뒤로 들어 뒷머리를 긁는 실루엣
    p.armB = [P(-27, -124 + bob * 0.4), P(-7, -136 + bob * 0.5)];
    p.armF = [P(21, -84), P(17, -62)];            // 다른 손은 허리
    p.chest = P(1, -100 + bob * 0.5); p.head = P(3, -122 + bob * 0.6);
    p.headTilt = 0.07 + (i % 2) * 0.04;
    p.legF = [P(17, -33), P(22, 0)];
    p.legB = [P(-15, -33), P(-20, -3)];           // 한쪽 발끝을 살짝 든다
  },
  // 베지터 : 팔짱을 끼고 고개를 돌린 채 콧방귀
  foldProud(p, i, bob) {
    p.armF = [P(19, -93), P(-14, -93 + bob * 0.3)];
    p.armB = [P(-19, -95), P(14, -95 + bob * 0.3)];
    p.chest = P(-3, -101 + bob * 0.4); p.head = P(-2, -124 + bob * 0.5);
    p.headTilt = -0.16 - (i % 2) * 0.02;
    p.legF = [P(21, -33), P(30, 0)];
    p.legB = [P(-21, -33), P(-30, 0)];
  },
  // 피콜로 : 팔짱을 끼고 눈을 감은 채 미동도 없다
  foldQuiet(p, i, bob) {
    p.armF = [P(15, -80), P(-13, -75 + bob * 0.2)];
    p.armB = [P(-15, -82), P(12, -77 + bob * 0.2)];
    p.chest = P(0, -101 + bob * 0.25); p.head = P(1, -123 + bob * 0.3);
    p.headTilt = 0.17;
    p.legF = [P(13, -33), P(16, 0)];
    p.legB = [P(-13, -33), P(-16, 0)];
  },
  // 프리저 : 손가락을 들어 우아하게 바라본다
  finger(p, i, bob) {
    p.armF = [P(24, -100), P(16, -124 + bob * 0.6)];
    p.armB = [P(-20, -82), P(-13, -66)];
    p.chest = P(1, -101 + bob * 0.4); p.head = P(4, -123 + bob * 0.5);
    p.headTilt = 0.08 + (i % 2) * 0.02;
    p.legF = [P(15, -33), P(19, 0)];
    p.legB = [P(-15, -33), P(-19, 0)];
  },
  // 셀 : 두 팔을 벌려 젖히고 웃는다
  spread(p, i, bob) {
    const sw = (i % 2) ? 1 : 0;
    p.armF = [P(30, -104), P(50, -128 + bob + sw * 3)];
    p.armB = [P(-30, -104), P(-50, -128 + bob - sw * 3)];
    p.chest = P(0, -103 + bob * 0.5); p.head = P(1, -126 + bob * 0.6);
    p.headTilt = -0.18;
    p.legF = [P(24, -33), P(34, 0)];
    p.legB = [P(-24, -33), P(-34, 0)];
  },
  // 오반 : 주먹을 하늘로 뻗는다
  fistUp(p, i, bob) {
    p.armF = [P(21, -108), P(25, -142 + bob)];
    p.armB = [P(-22, -86), P(-26, -100)];
    p.chest = P(2, -101 + bob); p.head = P(4, -123 + bob);
    p.headTilt = -0.06;
    p.legF = [P(18, -33), P(24, 0)];
    p.legB = [P(-18, -33), P(-24, 0)];
  },
  // 브로리 : 두 주먹을 쥐고 하늘을 향해 포효한다
  roarWin(p, i, bob) {
    const sw = (i % 2) ? 2.4 : 0;
    // 두 주먹을 하늘로 치켜들고 포효한다
    p.armF = [P(31, -110 - sw), P(48, -138 - bob)];
    p.armB = [P(-31, -110 - sw), P(-48, -138 - bob)];
    p.chest = P(-3, -105 + bob * 0.5); p.head = P(-1, -128 + bob * 0.6);
    p.headTilt = -0.3;
    p.legF = [P(28, -34), P(42, 0)];
    p.legB = [P(-28, -34), P(-42, 0)];
  },
  // 쿠우라 : 어깨를 툭툭 털며 내려다본다
  brush(p, i, bob) {
    const sw = (i % 2) ? 4 : 0;
    p.armF = [P(20, -100), P(-12 - sw, -104 + bob * 0.4)];   // 반대쪽 어깨를 턴다
    p.armB = [P(-20, -86), P(-14, -66)];
    p.chest = P(1, -101 + bob * 0.4); p.head = P(4, -123 + bob * 0.5);
    p.headTilt = 0.12;
    p.legF = [P(15, -33), P(19, 0)];
    p.legB = [P(-15, -33), P(-19, 0)];
    p.tail = [P(-30, -52 + sw), P(-62, -66), P(-78, -86 - sw)];
  },
  // 트랭크스 : 검을 어깨에 걸치고 앞머리를 넘긴 자세
  shoulder(p, i, bob) {
    // 팔을 가슴 앞으로 가로질러 어깨에 검을 걸친 자세
    p.armF = [P(31, -95 + bob * 0.3), P(-7, -111 + bob * 0.5)];
    p.armB = [P(-19, -84), P(-14, -63)];
    setSword(p, -1.15, 76);        // 어깨에 걸친 검
    p.chest = P(3, -100 + bob * 0.5); p.head = P(5, -122 + bob * 0.6);
    p.headTilt = -0.08;
    p.legF = [P(22, -33), P(31, 0)];
    p.legB = [P(-16, -33), P(-21, 0)];
  },
  // 초2 오반 : 주먹을 가슴 앞에 쥐고 조용히 고개를 든다
  sideGlance(p, i, bob) {
    p.armF = [P(16, -94 + bob * 0.3), P(-2, -101 + bob * 0.4)];
    p.armB = [P(-22, -88), P(-27, -67 + bob * 0.2)];
    p.chest = P(0, -102 + bob * 0.4); p.head = P(2, -125 + bob * 0.5);
    p.headTilt = -0.18 + (i % 2) * 0.03;
    p.legF = [P(17, -33), P(23, 0)];
    p.legB = [P(-17, -33), P(-24, 0)];
  },
  // 초2 오공 : 씩 웃으며 엄지를 척 세운다
  thumbUp(p, i, bob) {
    p.armF = [P(24, -96 + bob * 0.4), P(35, -117 + bob * 0.6)];
    p.armB = [P(-20, -86), P(-16, -64)];
    p.chest = P(3, -100 + bob * 0.5); p.head = P(5, -122 + bob * 0.6);
    p.headTilt = 0.06 + (i % 2) * 0.03;
    p.legF = [P(18, -33), P(24, 0)];
    p.legB = [P(-16, -33), P(-22, 0)];
  },
  // 초2 베지터 : 상대를 손가락으로 가리키며 콧방귀를 뀐다
  pointDown(p, i, bob) {
    p.armF = [P(26, -96), P(53, -105 + bob * 0.4)];
    p.armB = [P(-20, -88), P(-15, -66)];
    p.chest = P(4, -101 + bob * 0.35); p.head = P(6, -124 + bob * 0.45);
    p.headTilt = -0.11 - (i % 2) * 0.03;
    p.legF = [P(22, -33), P(31, 0)];
    p.legB = [P(-20, -33), P(-28, 0)];
  },
  // 베지트 : 한 손은 허리, 다른 손으로 포타라 귀걸이를 매만진다
  potaraTouch(p, i, bob) {
    p.armF = [P(20, -86), P(16, -63)];
    p.armB = [P(-18, -96), P(-6, -125 + bob * 0.5)];
    p.chest = P(-1, -101 + bob * 0.4); p.head = P(0, -124 + bob * 0.5);
    p.headTilt = -0.09 + (i % 2) * 0.03;
    p.legF = [P(17, -33), P(22, 0)];
    p.legB = [P(-16, -33), P(-21, 0)];
  },
  // 키드 부우 : 고개를 갸웃거리며 킥킥댄다
  twitch(p, i, bob) {
    const sw = (i % 2) ? 1 : -1;
    p.armF = [P(22, -86 + bob * 0.3), P(28, -62)];
    p.armB = [P(-22, -86), P(-28, -62 + bob * 0.3)];
    p.chest = P(0, -100 + bob * 0.5); p.head = P(2, -122 + bob * 0.6);
    p.headTilt = 0.3 * sw;
    p.legF = [P(16, -33), P(21, 0)];
    p.legB = [P(-16, -33), P(-21, 0)];
  },
  // 오천크스 : 손가락 V 를 만들며 의기양양하게 웃는다
  vSign(p, i, bob) {
    p.armF = [P(24, -102 + bob * 0.4), P(36, -128 + bob * 0.6)];
    p.armB = [P(-21, -86), P(-17, -63)];
    p.chest = P(1, -101 + bob * 0.4); p.head = P(3, -124 + bob * 0.5);
    p.headTilt = -0.12 - (i % 2) * 0.03;
    p.legF = [P(18, -33), P(24, 0)];
    p.legB = [P(-17, -33), P(-23, 0)];
  },
  // 인조인간 17호 : 한 손을 허리에 얹고 고개를 돌린 채 시큰둥하다
  bored(p, i, bob) {
    p.armF = [P(19, -86), P(15, -62)];
    p.armB = [P(-20, -86 + bob * 0.3), P(-25, -62)];
    p.chest = P(-2, -101 + bob * 0.35); p.head = P(-2, -124 + bob * 0.45);
    p.headTilt = -0.2 - (i % 2) * 0.02;
    p.legF = [P(14, -33), P(18, 0)];
    p.legB = [P(-14, -33), P(-18, 0)];
  },
  // 인조인간 18호 : 머리카락을 쓸어 넘기며 무심하게 시선을 돌린다
  hairFlip(p, i, bob) {
    const up = i % 2 === 0;
    p.armF = up ? [P(20, -102), P(6, -126 + bob * 0.5)] : [P(20, -94), P(12, -112 + bob * 0.5)];
    p.armB = [P(-19, -86), P(-24, -63)];
    p.chest = P(-1, -101 + bob * 0.4); p.head = P(-1, -124 + bob * 0.5);
    p.headTilt = 0.1 - (up ? 0 : 0.22);
    p.legF = [P(14, -33), P(18, 0)];
    p.legB = [P(-14, -33), P(-18, 0)];
  },
  // 초오지터 : 팔을 X자로 모았다가 좌우로 크게 펼친다
  crossOut(p, i, bob) {
    const open = i >= 2;
    p.armF = open ? [P(29, -94), P(49, -79 + bob * 0.4)] : [P(16, -94), P(-9, -101)];
    p.armB = open ? [P(-29, -94), P(-49, -79 + bob * 0.4)] : [P(-16, -96), P(9, -103)];
    p.chest = P(0, -102 + bob * 0.4); p.head = P(1, -125 + bob * 0.5);
    p.headTilt = open ? -0.15 : 0.07;
    p.legF = [P(24, -33), P(34, 0)];
    p.legB = [P(-24, -33), P(-34, 0)];
  }
};

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

/** 소품(꼬리/날개)의 기본 흔들림. 포즈 키로 결정해 스프라이트와 항상 일치시킨다 */
function propSway(f, p) {
  const props = f.char.props;
  if (!props) return;
  const key = p.key || 'idle0';
  const k = key.charCodeAt(key.length - 1) % 4;
  const sw = [0, 1, 0, -1][k];
  if (props.tail && !p.tail) {
    p.tail = [P(-34, -48 + sw * 2), P(-76, -40 + sw * 5), P(-106, -20 + sw * 10)];
  }
  if (props.wings && p.wingSpread == null) p.wingSpread = 0.12 + sw * 0.08;
}

function poseFor(f, time) {
  const p = basePose();

  if (f.state === 'ko' || f.state === 'knockdown') {
    p.key = 'down';
    p.tail = [P(-40, -14), P(-70, -6), P(-92, -2)];   // 쓰러지면 꼬리도 늘어진다
    p.wingSpread = 0;
    p.hip = P(-6, -22); p.chest = P(-26, -28); p.head = P(-50, -32);
    p.shoulderF = P(-26, -28); p.shoulderB = P(-30, -24);
    p.armF = [P(-40, -16), P(-56, -12)];
    p.armB = [P(-36, -36), P(-54, -40)];
    p.legF = [P(16, -24), P(34, -10)];
    p.legB = [P(14, -14), P(32, -4)];
    propSway(f, p);
    return p;
  }
  if (f.attack) { const ap = attackPose(f, p); propSway(f, ap); return ap; }

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
    case 'entrance': {
      const raw = clamp(f.stateTimer / ENTRANCE_FRAMES, 0, 1);
      const step = Math.min(ENTRANCE_STEPS - 1, Math.floor(raw * ENTRANCE_STEPS));
      p.key = 'ent' + step;
      const fn = ENTRANCE_POSE[f.char.entrance] || ENTRANCE_POSE.stance;
      fn(p, (step + 0.5) / ENTRANCE_STEPS, raw);
      break;
    }
    case 'win': {
      const ph = phaseOf(time, BOB_PERIOD, 4);
      const bob = Math.sin(ph.t / 16) * 2;
      p.key = 'win' + ph.i;
      const fn = VICTORY_POSE[f.char.victory] || VICTORY_POSE.fistUp;
      fn(p, ph.i, bob);
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
  propSway(f, p);
  return p;
}

/* ---------------- 헤어 / 머리 ---------------- */
const HEAD_R = 17;
const HAIR_SCALE = 1.3;           // 헤어는 머리보다 크게 (레퍼런스의 볼륨감)

/** 변신 상태까지 반영한 머리 색·모양 (머리와 몸통 레이어에서 함께 쓴다) */
function hairSetOf(ch, f) {
  const c = ch.colors, form = ch.form || null;
  const trans = !!f.superSaiyan && !!form;
  const ss = trans && !!form.saiyan;
  return {
    trans, form, ss, colors: c,
    hair: ss ? (form.hair || '#ffdf3d') : c.hair,
    hairLit: ss ? (form.hairLit || '#fff3a0') : c.hairLit,
    style: (trans && form.hairStyle) || ch.hairStyle,
    noBrow: (trans && !!form.noBrow) || !!ch.noBrow,
    head: ch.headScale || 1
  };
}

/**
 * 등 뒤로 길게 늘어지는 머리(초사이어인 3).
 * 몸통보다 뒤 레이어에서 그려야 등 뒤로 흘러내리는 것처럼 보인다.
 */
//  [뿌리x, 뿌리y, 길이, 폭, 끝이 뒤로 밀리는 정도]
const LONG_HAIR = {
  goku3: [[-8, -2, 66, 9, -10], [-16, -8, 57, 8, -8], [-23, -12, 45, 7, -6], [-28, -14, 32, 6, -4]],
  // 오천크스는 몸이 작아 갈기가 발끝까지 내려온다
  gotenks3: [[-8, 0, 80, 8, -17], [-16, -6, 69, 7, -14], [-23, -11, 54, 6, -10], [-28, -15, 37, 5, -7]]
};

function drawLongHair(ctx, p, hs, time, wobble) {
  const strands = LONG_HAIR[hs.style];
  if (!strands) return;
  const hair = hs.hair, hairLit = hs.hairLit;
  const sway = Math.sin(time / 11) * (1.4 + (wobble || 0) * 0.4);
  ctx.save();
  ctx.translate(p.head[0], p.head[1]);
  if (p.headTilt) ctx.rotate(p.headTilt);
  ctx.scale(HAIR_SCALE * hs.head, HAIR_SCALE * hs.head);
  strands.forEach(([sx0, sy0, len, w, drift], i) => {
    const sw = sway * (0.5 + i * 0.3) + drift;
    // 끝이 뾰족한 한 가닥
    const pts = [
      [sx0 + w, sy0 - 2],
      [sx0 + w * 0.45 + drift * 0.4, sy0 + len * 0.55],
      [sx0 - 1 + sw, sy0 + len],
      [sx0 - w * 1.15 + drift * 0.4, sy0 + len * 0.45],
      [sx0 - w, sy0]
    ];
    // 가닥마다 외곽선을 둘러 한 덩어리 판자로 보이지 않게 한다
    ctx.strokeStyle = edgeOf(hair);
    ctx.lineWidth = 2.4; ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let k = 1; k < pts.length; k++) ctx.lineTo(pts[k][0], pts[k][1]);
    ctx.closePath(); ctx.stroke();
    poly(ctx, pts, i % 2 ? shade(hair, 0.2) : hair);
    // 가닥 안쪽의 결
    ctx.strokeStyle = shade(hair, -0.34);
    ctx.lineWidth = 1.5; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(sx0 + w * 0.5, sy0 + 2);
    ctx.quadraticCurveTo(sx0 + drift * 0.4, sy0 + len * 0.55, sx0 - 1 + sw, sy0 + len - 6);
    ctx.stroke();
  });
  // 두상에서 갈기로 이어지는 뭉치 (목덜미가 비어 보이지 않게)
  poly(ctx, [[2, -12], [-12, -15], [-25, -6], [-22, 8], [-7, 7], [3, 2]], hair);
  ctx.restore();
}

/** 머리 뒤쪽 실루엣(얼굴보다 아래 레이어) */
function drawHairBack(ctx, ch, f, time, hair, hairLit, style) {
  const c = ch.colors;
  const wobble = (f.charging || f.superSaiyan || f.ki >= 100) ? 2.2 : 0;
  switch (style || ch.hairStyle) {
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
    case 'gohan2': {
      // 초2 오반 : 위로 곧게 곤두선 날카로운 스파이크
      ctx.fillStyle = hair;
      ctx.beginPath(); ctx.ellipse(-1, -5, 16, 15, 0, 0, Math.PI * 2); ctx.fill();
      const tips = [[-21, -28], [-14, -40], [-5, -47], [4, -46], [12, -39], [19, -28], [24, -15]];
      tips.forEach((t, i) => {
        const wob = Math.sin(time / 6 + i) * (wobble + 0.9);
        const bx = t[0] * 0.4;
        poly(ctx, [[bx - 7, -6], [t[0] + wob, t[1] + wob * 0.5], [bx + 7, -8]], i % 2 ? hairLit : hair);
      });
      ctx.fillStyle = hair;
      ctx.beginPath(); ctx.arc(0, -3, 15, Math.PI, Math.PI * 2); ctx.fill();
      break;
    }
    case 'goku2': {
      // 초2 오공 : 손오공의 방사형 스파이크가 더 길고 날카롭게 곤두선다
      // 뿌리는 두상을 따라 벌어지지만 끝은 전부 위로 모인다 (초사이어인의 쓸어올린 머리)
      const tips2 = [[-21, -30], [-15, -40], [-8, -46], [-1, -49], [6, -47], [13, -41], [19, -32], [23, -21]];
      tips2.forEach((t, i) => {
        const wob = Math.sin(time / 6 + i) * (wobble + 0.7);
        const bx = t[0] * 0.5, by = -6 - Math.abs(t[0]) * 0.12;
        poly(ctx, [
          [bx - 7, by], [t[0] + wob, t[1] + wob * 0.6], [bx + 7, by - 2]
        ], i % 2 ? hairLit : hair);
      });
      ctx.fillStyle = hair;
      ctx.beginPath(); ctx.arc(0, -3, 14, Math.PI, Math.PI * 2); ctx.fill();
      ctx.fillStyle = hairLit;
      ctx.beginPath(); ctx.ellipse(3, -11, 7, 3.4, -0.4, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'goku3': {
      // 초사이어인 3 : 정수리에서 크게 곤두선 갈기
      // (등 뒤로 흘러내리는 긴 갈기는 몸통보다 뒤 레이어인 drawLongHair 에서 그린다)
      ctx.fillStyle = hair;
      ctx.beginPath(); ctx.ellipse(-2, -5, 18, 17, 0, 0, Math.PI * 2); ctx.fill();
      const tips3 = [[-23, -25], [-16, -37], [-8, -45], [0, -48], [8, -45], [16, -37], [22, -26], [26, -14]];
      tips3.forEach((t, i) => {
        const wob = Math.sin(time / 8 + i) * (wobble + 0.8);
        const bx = t[0] * 0.44, by = -7 - Math.abs(t[0]) * 0.1;
        poly(ctx, [[bx - 8, by], [t[0] + wob, t[1] + wob * 0.5], [bx + 8, by - 2]],
          i % 2 ? hairLit : hair);
      });
      break;
    }
    case 'vegeta2': {
      // 초2 베지터 : 불꽃 머리가 한층 높고 사납게 뻗는다
      poly(ctx, [[-16, -2], [-15, -15], [-5, -36 - wobble], [5, -42 - wobble], [16, -15], [17, -2]], hair);
      poly(ctx, [[-14, -10], [-20, -25 - wobble], [-7, -18]], hair);
      poly(ctx, [[14, -10], [21, -23 - wobble], [8, -18]], hair);
      poly(ctx, [[-8, -9], [0, -34], [8, -11]], hairLit);
      break;
    }
    case 'vegito': {
      // 베지트 : 베지터의 뿔 + 손오공의 스파이크
      const tipsV = [[-20, -20], [-15, -27], [-9, -32], [-2, -35], [5, -33], [11, -28], [17, -20], [22, -9]];
      tipsV.forEach((t, i) => {
        const wob = Math.sin(time / 7 + i) * (wobble + 0.5);
        const bx = t[0] * 0.44;
        poly(ctx, [[bx - 7, -6], [t[0] + wob, t[1] + wob * 0.5], [bx + 7, -8]], i % 2 ? hairLit : hair);
      });
      // 베지터에게 물려받은 정수리의 뿔 하나
      poly(ctx, [[-9, -12], [-1, -35 - wobble], [9, -12]], hair);
      poly(ctx, [[-3, -12], [0, -30], [4, -13]], hairLit);
      ctx.fillStyle = hair;
      ctx.beginPath(); ctx.arc(0, -3, 15, Math.PI, Math.PI * 2); ctx.fill();
      break;
    }
    case 'gogeta': {
      // 초오지터 : 좌우로 넓게 퍼진 거대한 금빛 갈기
      ctx.fillStyle = hair;
      ctx.beginPath(); ctx.ellipse(-1, -5, 18, 16, 0, 0, Math.PI * 2); ctx.fill();
      const tipsG = [[-25, -25], [-17, -37], [-7, -44], [3, -46], [12, -41], [20, -32], [26, -20], [28, -8]];
      tipsG.forEach((t, i) => {
        const wob = Math.sin(time / 7 + i) * (wobble + 0.9);
        const bx = t[0] * 0.36;
        poly(ctx, [[bx - 8, -6], [t[0] + wob, t[1] + wob * 0.5], [bx + 8, -8]], i % 2 ? hairLit : hair);
      });
      ctx.fillStyle = hair;
      ctx.beginPath(); ctx.arc(0, -3, 16, Math.PI, Math.PI * 2); ctx.fill();
      break;
    }
    case 'buu': {
      // 마인 부우 : 매끈한 민머리 + 정수리에서 뒤로 길게 뻗어 끝이 가늘어지는 촉수
      const tent = c.tentacle || c.skin;
      const sway = Math.sin(time / 13) * (2.4 + wobble);
      const A = [-5, -13], B = [-19, -25 + sway], C2 = [-37, -26 + sway * 1.5];
      const at = t => {
        const u = 1 - t;
        return [u * u * A[0] + 2 * u * t * B[0] + t * t * C2[0],
                u * u * A[1] + 2 * u * t * B[1] + t * t * C2[1]];
      };
      const N = 14, lf = [], rt = [];
      for (let i = 0; i <= N; i++) {
        const t = i / N;
        const a0 = at(Math.max(0, t - 0.03)), b0 = at(Math.min(1, t + 0.03));
        let nx = -(b0[1] - a0[1]), ny = b0[0] - a0[0];
        const L = Math.hypot(nx, ny) || 1; nx /= L; ny /= L;
        const w = 4.6 * Math.pow(1 - t, 0.6) + 0.8;
        const cp = at(t);
        lf.push([cp[0] + nx * w, cp[1] + ny * w]);
        rt.unshift([cp[0] - nx * w, cp[1] - ny * w]);
      }
      const out = lf.concat(rt);
      ctx.beginPath();
      ctx.moveTo(out[0][0], out[0][1]);
      for (let i = 1; i < out.length; i++) ctx.lineTo(out[i][0], out[i][1]);
      ctx.closePath();
      ctx.strokeStyle = edgeOf(tent); ctx.lineWidth = 3; ctx.lineJoin = 'round';
      ctx.stroke();
      ctx.fillStyle = tent; ctx.fill();
      ctx.save(); ctx.clip();
      ctx.strokeStyle = shade(tent, -0.3); ctx.lineWidth = 3.4; ctx.lineCap = 'round';
      ctx.beginPath();
      for (let i = 0; i <= N; i++) {
        const cp = at(i / N);
        i ? ctx.lineTo(cp[0] + 1.6, cp[1] + 2.6) : ctx.moveTo(cp[0] + 1.6, cp[1] + 2.6);
      }
      ctx.stroke();
      ctx.restore();
      // 두상
      ctx.fillStyle = c.skinDark;
      ctx.beginPath(); ctx.ellipse(-1, -5, 16, 15, 0, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'gotenks': {
      // 오천의 검은 스파이크 + 트랭크스의 연보라 갈래
      const lav = c.hairAlt || '#b79ae0', lavLit = c.hairAltLit || shade(c.hairAlt || '#b79ae0', 0.35);
      // 뒤쪽으로 크게 뻗은 연보라 날개
      [[-31, -3], [-34, -16], [-29, -29], [-21, -37]].forEach((t, i) => {
        const wob = Math.sin(time / 8 + i) * (wobble + 0.6);
        poly(ctx, [[-11, 0], [t[0] + wob, t[1] + wob * 0.5], [-6, -17]], i % 2 ? lavLit : lav);
      });
      // 위로 곤두선 검은 스파이크
      const tipsG = [[-16, -28], [-8, -37], [0, -41], [8, -37], [15, -28], [20, -16]];
      tipsG.forEach((t, i) => {
        const wob = Math.sin(time / 7 + i) * (wobble + 0.5);
        const bx = t[0] * 0.46;
        poly(ctx, [[bx - 6, -6], [t[0] + wob, t[1] + wob * 0.5], [bx + 6, -8]], i % 2 ? hairLit : hair);
      });
      ctx.fillStyle = hair;
      ctx.beginPath(); ctx.arc(0, -3, 15, Math.PI, Math.PI * 2); ctx.fill();
      break;
    }
    case 'gotenks3': {
      // 초사이어인 3 오천크스 : 정수리에서 크게 곤두선 갈기 (긴 갈기는 뒤 레이어)
      ctx.fillStyle = hair;
      ctx.beginPath(); ctx.ellipse(-2, -5, 18, 17, 0, 0, Math.PI * 2); ctx.fill();
      const tipsG3 = [[-24, -26], [-17, -39], [-8, -48], [1, -51], [10, -47], [19, -38], [25, -25], [28, -12]];
      tipsG3.forEach((t, i) => {
        const wob = Math.sin(time / 8 + i) * (wobble + 0.9);
        const bx = t[0] * 0.42, by = -7 - Math.abs(t[0]) * 0.1;
        poly(ctx, [[bx - 8, by], [t[0] + wob, t[1] + wob * 0.5], [bx + 8, by - 2]],
          i % 2 ? hairLit : hair);
      });
      break;
    }
    case 'a17': {
      // 인조인간 17호 : 턱선까지 곧게 떨어지는 검은 단발
      ctx.fillStyle = hair;
      ctx.beginPath(); ctx.ellipse(-1, -7, 17, 16, 0, 0, Math.PI * 2); ctx.fill();
      poly(ctx, [[-17, -10], [-16, 10], [-9, 14], [-5, -6]], hair);       // 뒷머리
      poly(ctx, [[16, -10], [17, 4], [11, 8], [8, -6]], shade(hair, 0.14));
      break;
    }
    case 'a18': {
      // 인조인간 18호 : 살짝 안쪽으로 말린 금발 단발
      ctx.fillStyle = hair;
      ctx.beginPath(); ctx.ellipse(-1, -7, 17, 16, 0, 0, Math.PI * 2); ctx.fill();
      poly(ctx, [[-17, -10], [-17, 8], [-10, 14], [-5, -6]], hair);
      poly(ctx, [[-15, -4], [-14, 6], [-9, 10], [-8, -2]], hairLit);
      poly(ctx, [[16, -10], [17, 3], [11, 7], [8, -6]], shade(hair, 0.14));
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
      // 두개골을 덮는 커다란 보라 돔
      ctx.fillStyle = c.skinDark;
      ctx.beginPath(); ctx.ellipse(-1, -4, 16, 15, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = shade(hair, -0.35);
      ctx.beginPath(); ctx.ellipse(-2, -12, 18, 16, 0, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'broly': {
      // 위로 거대하게 솟구친 전설의 초사이어인 머리
      ctx.fillStyle = hair;
      ctx.beginPath(); ctx.ellipse(-1, -6, 19, 17, 0, 0, Math.PI * 2); ctx.fill();
      const tips = [
        [-22, -22], [-17, -31], [-10, -38], [-2, -42], [6, -41],
        [14, -35], [20, -27], [24, -17], [24, -7]
      ];
      tips.forEach((t, i) => {
        const wob = Math.sin(time / 9 + i) * (1.1 + i * 0.08);
        const bx = t[0] * 0.34;
        poly(ctx, [
          [bx - 7, -6], [t[0] + wob, t[1] + wob * 0.5], [bx + 7, -8]
        ], i % 2 ? hairLit : hair);
      });
      ctx.fillStyle = hair;
      ctx.beginPath(); ctx.arc(0, -4, 17, Math.PI, Math.PI * 2); ctx.fill();
      break;
    }
    case 'cooler': {
      // 흰 두개 갑주 + 좌우로 크게 벌어진 뿔 한 쌍
      const horn = c.hair, hornDark = shade(c.hair, -0.26);
      ctx.fillStyle = c.skinDark;
      ctx.beginPath(); ctx.ellipse(-1, -4, 16, 15, 0, 0, Math.PI * 2); ctx.fill();
      // 좌우로 뻗어 끝이 뾰족해지는 뿔
      poly(ctx, [[-7, -17], [-36, -30 - wobble], [-9, -6]], hornDark);
      poly(ctx, [[8, -19], [38, -26 - wobble], [10, -7]], horn);
      poly(ctx, [[8, -19], [38, -26 - wobble], [20, -18]], shade(horn, 0.35));
      // 정수리 갑주
      ctx.fillStyle = horn;
      ctx.beginPath(); ctx.ellipse(-1, -12, 18, 13, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = hornDark;
      ctx.beginPath(); ctx.ellipse(-9, -8, 8, 6, 0.3, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'cell': {
      ctx.fillStyle = c.hair;
      ctx.beginPath(); ctx.ellipse(0, -6, 16, 15, 0, 0, Math.PI * 2); ctx.fill();
      // 뒤로 크게 휘어 올라가는 두 개의 검은 뿔
      [[-1, -1], [1, 1]].forEach(([sx, k]) => {
        const tipx = sx * 6 - 16 + k * 4, tipy = -40 - wobble * 0.6;
        poly(ctx, [
          [sx * 8 - 2, -12], [tipx - 4, tipy], [tipx + 5, tipy + 3], [sx * 8 + 6, -10]
        ], k > 0 ? '#231d2e' : '#151021');
      });
      break;
    }
  }
}

/** 얼굴 위에 덮이는 앞머리 / 장식 */
function drawHairFront(ctx, ch, f, time, hair, hairLit, style) {
  const c = ch.colors;
  const wobble = (f.charging || f.superSaiyan || f.ki >= 100) ? 2.2 : 0;
  switch (style || ch.hairStyle) {
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
    case 'gohan2':
      poly(ctx, [[-15, -9], [-8, -23], [-2, -10], [5, -25], [12, -11], [16, -19], [15, -4], [6, -9], [0, -3], [-7, -8], [-15, -3]], hair);
      poly(ctx, [[-6, -17], [1, -23], [6, -15]], hairLit);
      // 이마를 비스듬히 타고 내려오는 긴 앞머리 한 가닥 (초2 오반의 상징)
      poly(ctx, [[-6, -13], [3, -7], [8, 6], [3, 8], [0, -1], [-8, -8]], hair);
      break;
    case 'goku2':
      poly(ctx, [[-14, -8], [-6, -21], [0, -9], [7, -22], [14, -9], [13, -1], [6, -6], [0, 0], [-7, -5], [-13, -1]], hair);
      poly(ctx, [[-4, -15], [3, -21], [8, -13]], hairLit);
      break;
    case 'goku3':
      // 앞머리를 전부 뒤로 넘긴 이마 + 얼굴 옆으로 흘러내린 한 가닥
      poly(ctx, [[-16, -6], [-8, -17], [0, -8], [8, -18], [16, -7], [15, -2], [0, -4], [-15, -2]], hair);
      poly(ctx, [[-15, -4], [-22, 13], [-20, 30], [-14, 29], [-12, 11], [-11, -2]], hair);
      poly(ctx, [[-19, 4], [-20, 20], [-16, 22], [-14, 6]], hairLit);
      break;
    case 'vegeta2':
      poly(ctx, [[-14, -7], [14, -9], [12, -2], [4, -6], [-1, 1], [-6, -5], [-14, -1]], hair);
      poly(ctx, [[-2, -2], [1, 4], [4, -3]], hair);   // 이마 각(V)
      break;
    case 'vegito':
      poly(ctx, [[-15, -8], [-6, -19], [0, -8], [7, -20], [15, -8], [14, -2], [6, -6], [0, 1], [-7, -5], [-14, -2]], hair);
      poly(ctx, [[-3, -3], [1, 4], [5, -4]], hair);   // 베지터에게 물려받은 이마 각
      // 손오공에게 물려받아 이마 옆으로 늘어진 두 가닥 (눈은 가리지 않는다)
      poly(ctx, [[1, -10], [7, -4], [9, 5], [5, 5], [2, -2], [-2, -6]], hair);
      poly(ctx, [[-11, -9], [-7, -2], [-8, 7], [-12, 6], [-13, -2]], hair);
      break;
    case 'gogeta':
      poly(ctx, [[-16, -8], [-8, -21], [-1, -10], [6, -22], [14, -9], [16, -17], [15, -3], [6, -8], [0, -1], [-7, -7], [-15, -2]], hair);
      poly(ctx, [[-6, -17], [2, -23], [8, -14]], hairLit);
      // 이마 한가운데로 굵게 내려오는 앞머리
      poly(ctx, [[-4, -13], [4, -7], [7, 4], [1, 5], [-2, -2], [-9, -8]], hair);
      break;
    case 'buu':
      // 민머리 광택 + 이마 가운데 세로 주름
      ctx.fillStyle = shade(c.skin, 0.24);
      ctx.beginPath(); ctx.ellipse(4, -12, 7.5, 3.6, -0.35, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = shade(c.skinDark, -0.25); ctx.lineWidth = 1.6; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(1, -16); ctx.lineTo(0, -7); ctx.stroke();
      break;
    case 'gotenks':
      poly(ctx, [[-14, -8], [-6, -19], [0, -8], [7, -20], [14, -8], [13, -2], [6, -6], [0, 0], [-7, -5], [-13, -2]], hair);
      poly(ctx, [[-4, -14], [3, -19], [8, -11]], hairLit);
      break;
    case 'gotenks3':
      // 앞머리를 뒤로 넘긴 이마 + 얼굴 옆으로 흘러내린 한 가닥
      poly(ctx, [[-16, -6], [-8, -18], [0, -8], [8, -19], [16, -7], [15, -2], [0, -4], [-15, -2]], hair);
      poly(ctx, [[-15, -4], [-23, 14], [-21, 32], [-14, 31], [-12, 12], [-11, -2]], hair);
      poly(ctx, [[-20, 4], [-21, 21], [-16, 23], [-14, 6]], hairLit);
      break;
    case 'a17':
      // 가운데 가르마 앞머리
      poly(ctx, [[-16, -9], [-4, -18], [0, -8], [4, -18], [16, -10], [15, -1], [3, -9], [0, -4], [-3, -9], [-15, -1]], hair);
      // 귀 앞으로 내려오는 갈래
      poly(ctx, [[-11, -7], [-16, 4], [-14, 14], [-8, 8]], hair);
      break;
    case 'a18':
      // 한쪽으로 크게 쓸어 넘긴 앞머리
      poly(ctx, [[-16, -10], [-6, -19], [8, -18], [16, -9], [15, -1], [5, -6], [-5, -3], [-15, -1]], hair);
      poly(ctx, [[-6, -15], [5, -14], [13, -7], [3, -9], [-4, -10]], hairLit);
      // 귀 앞으로 내려오는 갈래
      poly(ctx, [[-10, -7], [-16, 5], [-14, 15], [-7, 9]], hair);
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
    case 'frieza': {
      // 이마를 덮는 보라 돔 (광택 하이라이트)
      ctx.fillStyle = hair;
      ctx.beginPath(); ctx.ellipse(0, -10, 15, 11, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = shade(hair, -0.3);
      ctx.beginPath(); ctx.ellipse(-7, -6, 8, 5, 0.3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = hairLit;
      ctx.beginPath(); ctx.ellipse(4, -14, 6, 3.4, -0.4, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(-4, -13, 2.4, 4.2, 0.5, 0, Math.PI * 2); ctx.fill();
      // 양옆으로 뻗은 뾰족한 흰 귀
      const ear = c.skin, earDark = c.skinDark;
      poly(ctx, [[-12, -4], [-24, -11], [-22, -3], [-11, 1]], ear);
      poly(ctx, [[-12, -4], [-24, -11], [-18, -5]], earDark);
      poly(ctx, [[12, -4], [24, -11], [22, -3], [11, 1]], ear);
      poly(ctx, [[12, -4], [24, -11], [18, -5]], shade(ear, 0.18));
      break;
    }
    case 'broly':
      // 이마 위쪽만 덮는 앞머리 (눈이 가리지 않게)
      poly(ctx, [[-16, -12], [-9, -20], [-3, -12], [4, -21], [11, -12], [16, -18], [15, -6], [6, -11], [0, -5], [-7, -10], [-15, -5]], hair);
      poly(ctx, [[-8, -18], [-2, -12], [3, -19]], hairLit);
      break;
    case 'cooler': {
      // 이마를 덮는 갑주와 파란 보석 (뿔은 뒤쪽 레이어에서 그린다)
      const hornF = hair;
      ctx.fillStyle = hornF;
      ctx.beginPath(); ctx.ellipse(0, -10, 16, 10, 0, 0, Math.PI * 2); ctx.fill();
      poly(ctx, [[-16, -8], [0, -4], [16, -8], [15, -2], [0, 2], [-15, -2]], shade(hornF, -0.18));
      ctx.fillStyle = c.gem || '#2f7fd8';
      ctx.beginPath(); ctx.ellipse(1, -12, 5.2, 4.4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = c.gemLit || '#93cbff';
      ctx.beginPath(); ctx.ellipse(-0.6, -13.6, 2.1, 1.5, -0.3, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'cell':
      // 어두운 자주색 두개 장갑 + 이마 무늬
      ctx.fillStyle = hair;
      ctx.beginPath(); ctx.ellipse(0, -10, 15, 10, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = hairLit;
      ctx.beginPath(); ctx.ellipse(4, -13, 6, 3, -0.35, 0, Math.PI * 2); ctx.fill();
      poly(ctx, [[-8, -3], [0, -9], [8, -3], [0, 1]], c.trim || '#efe6c6');
      capsule(ctx, -12, -12, -20, -24, 4.5, '#231d2e');
      capsule(ctx, 12, -12, 20, -24, 4.5, '#231d2e');
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
  const hs = hairSetOf(ch, f);
  const form = hs.form, trans = hs.trans, superSaiyan = hs.ss;
  const hair = hs.hair, hairLit = hs.hairLit;
  const hairStyle = hs.style, noBrow = hs.noBrow;
  const skinLight = shade(c.skin, 0.18);
  const skinEdge = edgeOf(c.skin);

  ctx.save();
  ctx.translate(p.head[0], p.head[1]);

  // 목 (몸통과 이어지도록 뼈로 연결) - 고개 기울기 전에 그려 목이 어긋나지 않게 한다
  bone(ctx, [p.chest[0] - p.head[0], p.chest[1] - p.head[1] + 2], [0, 9],
    len => drawPart(ctx, muscle(len, 13, 0.5, 0.46), c.skinDark, skinEdge, null));

  if (p.headTilt) ctx.rotate(p.headTilt);
  // 어린아이 체형은 머리를 몸보다 크게 (SD 비율)
  if (ch.headScale) ctx.scale(ch.headScale, ch.headScale);

  ctx.save(); ctx.scale(HAIR_SCALE, HAIR_SCALE);
  drawHairBack(ctx, ch, f, time, hair, hairLit, hairStyle);
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
  if (!/^(piccolo|frieza|cell|cooler)$/.test(hairStyle)) {
    drawPart(ctx, [[-14, -3], [-11, -6], [-9, 1], [-12, 6], [-15, 4]], c.skinDark, skinEdge, null);
  }
  // 포타라 귀걸이 (베지트)
  if (ch.props && ch.props.earring) drawPotara(ctx, c);

  ctx.save(); ctx.scale(HAIR_SCALE, HAIR_SCALE);
  drawHairFront(ctx, ch, f, time, hair, hairLit, hairStyle);
  ctx.restore();

  // 마인의 각인 : 이마의 M (머리카락 위에 얹어 확실히 보이게 한다)
  if (trans && form.majin) {
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    const mark = (col, w) => {
      ctx.strokeStyle = col; ctx.lineWidth = w;
      ctx.beginPath();
      ctx.moveTo(0.5, -6); ctx.lineTo(2.4, -14.5); ctx.lineTo(5, -9.5);
      ctx.lineTo(7.6, -14.5); ctx.lineTo(9.5, -6);
      ctx.stroke();
    };
    mark('#ffe9b0', 4.4);
    mark('#2a1420', 2.2);
  }

  // ---- 표정 ----
  const hurt = f.hitstun > 0 || f.state === 'hurt' || f.state === 'hurtAir';
  const angry = !!f.attack || f.charging || hurt;
  // 눈동자 색은 눈꺼풀/눈썹 선 색(c.eye)과 분리한다 (초사이어인의 녹안 등)
  const iris = superSaiyan ? ((ch.form && ch.form.eye) || '#2fbf6a') : (c.iris || c.eye);
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
      ctx.strokeStyle = c.eye; ctx.lineWidth = 2.1; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(ex - rx - 0.5, ey - ry * 0.42);
      ctx.quadraticCurveTo(ex, ey - ry - 1.1, ex + rx + 0.3, ey - ry * 0.32);
      ctx.stroke();
    };
    // 마인 부우처럼 눈이 가느다란 캐릭터는 세로를 줄인다
    const ek = ch.eyeShape === 'slit' ? 0.66 : 1;
    eye(9.5, -1, 4.6, (hurt ? 6.6 : 5.8) * ek, 2.7);
    eye(-0.6, -1, 3.8, (hurt ? 5.8 : 5.1) * ek, 2.3);
    // 눈썹 : 굵고 각지게 (초사이어인 3 은 눈썹이 없고 눈두덩이 튀어나온다)
    if (noBrow) {
      ctx.strokeStyle = shade(c.skinDark, -0.3); ctx.lineWidth = 2.2; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-4.6, -8.4); ctx.quadraticCurveTo(5, -12, 14.6, -7.8);
      ctx.stroke();
    } else {
      ctx.strokeStyle = c.eye; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(4.4, angry ? -10.4 : -9.8); ctx.lineTo(14.4, angry ? -7.6 : -8.8);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-5.2, angry ? -8.8 : -8.3); ctx.lineTo(2.6, angry ? -10.8 : -10.2);
      ctx.stroke();
    }
    // 코 : 마인 부우는 콧대 없이 구멍만 두 개
    if (ch.nose === 'holes') {
      ctx.fillStyle = shade(c.skinDark, -0.45);
      ctx.beginPath(); ctx.ellipse(13.6, 4.6, 1.5, 1.9, 0.2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(9.4, 5.2, 1.3, 1.7, 0.2, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.strokeStyle = shade(c.skinDark, -0.35); ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.moveTo(15.4, 3.4); ctx.lineTo(13.6, 5.6); ctx.stroke();
    }
    if (ch.mouth === 'wide') {
      // 옆으로 길게 찢어진 입 (마인 부우)
      const open = hurt || f.attack || f.charging;
      drawPart(ctx, [[1.4, 9.4], [7, 8.1], [13.6, 9.6], [11, open ? 14.6 : 12.8],
        [5, open ? 15 : 13.2], [1.4, 12]], '#5d1f28', '#2c0c12', c2 => {
        c2.fillStyle = '#f2e6dc';
        c2.fillRect(0, 8.6, 15, 1.9);
      });
    } else if (hurt || f.attack || f.charging) {
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
  // 가면을 쓴 캐릭터는 표정 위에 다시 덮는다
  if (ch.props && ch.props.mask) drawFaceMask(ctx, ch);

  ctx.restore();
}

/* ---------------- 오라 ---------------- */
function drawAura(ctx, f, time, ch) {
  if (f.state === 'ko' || f.state === 'knockdown') return;
  const level = f.charging ? 1 : (f.superSaiyan ? 0.95 : f.ki >= 100 ? 0.75 : f.ki >= 60 ? 0.45 : 0);
  if (level <= 0) return;
  const c = (f.superSaiyan && ch.form && ch.form.aura) || ch.colors.aura;
  const bodyK = ch.scale || 1;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const layers = 3;
  for (let l = 0; l < layers; l++) {
    ctx.globalAlpha = (0.16 + 0.1 * level) * (1 - l * 0.22);
    ctx.fillStyle = c;
    ctx.beginPath();
    const w = (44 + l * 16 + level * 12) * bodyK;
    const h = (150 + l * 26 + level * 30) * bodyK;
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
function drawBootPart(ctx, ankle, dir, w, base, dark, light, edge, tip) {
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
    if (tip) {                                              // 금빛 앞코 (베지터/베지트 계열)
      c2.fillStyle = tip;
      c2.beginPath();
      c2.moveTo(w * 0.72, -w * 0.62);
      c2.lineTo(w * 1.48, -w * 0.28);
      c2.lineTo(w * 1.62, w * 0.24);
      c2.lineTo(w * 0.86, w * 0.5);
      c2.closePath(); c2.fill();
      c2.fillStyle = shade(tip, -0.32);
      c2.fillRect(w * 0.72, w * 0.12, w * 1.1, w * 0.4);
    }
  });
  ctx.restore();
}

/** 팔 한 짝 (위팔 → 아래팔 → 주먹) */
function drawArm(ctx, sh, el, ha, w, base, dark, light, glove, gloveDark, gloveLight, fore, band, deco) {
  const edge = edgeOf(base), gEdge = edgeOf(glove);
  const fb = fore ? fore.base : base, fd = fore ? fore.dark : dark, fl = fore ? fore.light : light;
  const withDeco = (shadeFn, len, w2, part) => (c2) => {
    shadeFn && shadeFn(c2);
    if (deco) deco(c2, len, w2, part);
  };
  bone(ctx, sh, el, len => drawPart(ctx, muscle(len, w, 0.62, 0.36), base, edge,
    withDeco(limbShade(len, w, dark, light), len, w, 'upper')));
  bone(ctx, el, ha, len => {
    drawPart(ctx, muscle(len, w * 0.82, 0.52, 0.34), fb, edgeOf(fb),
      withDeco(limbShade(len, w * 0.82, fd, fl), len, w * 0.82, 'fore'));
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
function drawLeg(ctx, hip, kn, ft, w, base, dark, light, boot, bootDark, bootLight, deco, bootTip) {
  const edge = edgeOf(base), bEdge = edgeOf(boot);
  const withDeco = (shadeFn, len, w2, part) => (c2) => {
    shadeFn && shadeFn(c2);
    if (deco) deco(c2, len, w2, part);
  };
  bone(ctx, hip, kn, len => drawPart(ctx, muscle(len, w, 0.6, 0.4), base, edge,
    withDeco(limbShade(len, w, dark, light), len, w, 'thigh')));
  bone(ctx, kn, ft, len => drawPart(ctx, muscle(len, w * 0.78, 0.56, 0.34), base, edge,
    withDeco(limbShade(len, w * 0.78, dark, light), len, w * 0.78, 'shin')));
  drawBootPart(ctx, ft, tipDir(kn, ft), w * 0.42, boot, bootDark, bootLight, bEdge, bootTip);
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

/* ---------------- 캐릭터 소품 ----------------
 *  프리저의 꼬리 / 셀의 날개 / 트랭크스의 검 처럼
 *  캐릭터 고유의 부위를 포즈에 따라 그린다.
 * ------------------------------------------- */

/** 프리저 꼬리 : 엉덩이에서 뒤로 크게 감아 도는 굵은 꼬리 */
function drawTail(ctx, p, c) {
  const t = p.tail || [P(-34, -48), P(-76, -40), P(-106, -20)];
  const base = [p.hip[0] - 11, p.hip[1] + 1];
  const ctrl = [base, t[0], t[1], t[2]];
  const col = c.tail || c.skin, dark = c.tailDark || c.skinDark;

  // 제어점을 지나는 부드러운 중심선 (카트멀-롬)
  const at = u => {
    const seg = clamp(Math.floor(u * 3), 0, 2);
    const k = u * 3 - seg;
    const p0 = ctrl[Math.max(0, seg - 1)], p1 = ctrl[seg];
    const p2 = ctrl[Math.min(3, seg + 1)], p3 = ctrl[Math.min(3, seg + 2)];
    const h = (a, b, cc, d) => 0.5 * ((2 * b) + (-a + cc) * k +
      (2 * a - 5 * b + 4 * cc - d) * k * k + (-a + 3 * b - 3 * cc + d) * k * k * k);
    return [h(p0[0], p1[0], p2[0], p3[0]), h(p0[1], p1[1], p2[1], p3[1])];
  };
  const N = 22, W0 = 8.6;
  const left = [], right = [];
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    const a = at(Math.max(0, u - 0.02)), b = at(Math.min(1, u + 0.02));
    let nx = -(b[1] - a[1]), ny = b[0] - a[0];
    const len = Math.hypot(nx, ny) || 1;
    nx /= len; ny /= len;
    const w = W0 * Math.pow(1 - u, 0.5) + 1.1;
    const cpt = at(u);
    left.push([cpt[0] + nx * w, cpt[1] + ny * w]);
    right.unshift([cpt[0] - nx * w, cpt[1] - ny * w]);
  }
  const outline = left.concat(right);
  ctx.fillStyle = edgeOf(col);
  ctx.beginPath();
  ctx.moveTo(outline[0][0], outline[0][1]);
  for (let i = 1; i < outline.length; i++) ctx.lineTo(outline[i][0], outline[i][1]);
  ctx.closePath();
  ctx.lineWidth = 4; ctx.strokeStyle = edgeOf(col); ctx.lineJoin = 'round';
  ctx.stroke(); ctx.fill();

  ctx.save();
  ctx.clip();
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(outline[0][0], outline[0][1]);
  for (let i = 1; i < outline.length; i++) ctx.lineTo(outline[i][0], outline[i][1]);
  ctx.closePath(); ctx.fill();
  // 아래쪽 그늘
  ctx.globalAlpha = 0.55;
  ctx.strokeStyle = dark; ctx.lineWidth = 5.5; ctx.lineCap = 'round';
  ctx.beginPath();
  for (let i = 0; i <= N; i++) {
    const cpt = at(i / N);
    i === 0 ? ctx.moveTo(cpt[0] + 1, cpt[1] + 3.5) : ctx.lineTo(cpt[0] + 1, cpt[1] + 3.5);
  }
  ctx.stroke();
  ctx.restore();
}

/** 셀 날개 : 등에서 뒤아래로 뻗은 두 장의 검은 날개 */
function drawWings(ctx, p, c) {
  const sp = p.wingSpread != null ? p.wingSpread : 0.15;
  const sx = p.shoulderB[0] + 4, sy = p.shoulderB[1] + 8;
  const wing = c.wing || '#1b2230', wingDark = c.wingDark || '#0c1018';
  const one = (k, col, len, ang) => {
    const ux = -Math.cos(ang), uy = Math.sin(ang);
    const nx = -uy, ny = ux;
    const tip = [sx + ux * len, sy + uy * len];
    poly(ctx, [
      [sx + nx * 3, sy + ny * 3],
      [sx + ux * len * 0.45 + nx * 13, sy + uy * len * 0.45 + ny * 13],
      [tip[0], tip[1]],
      [sx + ux * len * 0.5 - nx * 7, sy + uy * len * 0.5 - ny * 7],
      [sx - nx * 5, sy - ny * 5]
    ], col);
  };
  // 뒤쪽 날개 (조금 더 벌어진다)
  one(1, wingDark, 74 + sp * 16, 0.62 + sp * 0.3);
  one(0, wing, 68 + sp * 16, 0.34 + sp * 0.26);
  // 날개 결
  ctx.save();
  ctx.globalAlpha = 0.45;
  ctx.strokeStyle = shade(wing, 0.55); ctx.lineWidth = 1.5;
  for (let i = 1; i <= 2; i++) {
    const ang = 0.34 + sp * 0.26, L = (68 + sp * 16) * (0.4 + i * 0.24);
    ctx.beginPath();
    ctx.moveTo(sx, sy + 1);
    ctx.lineTo(sx - Math.cos(ang) * L, sy + Math.sin(ang) * L + i * 4);
    ctx.stroke();
  }
  ctx.restore();
}

/** 트랭크스 검대 : 어깨에서 반대쪽 허리로 가로지르는 하늘색 띠 */
function drawStrap(ctx, p, c) {
  const col = c.strap || '#7fdce8';
  const a = [p.shoulderB[0] + 2, p.shoulderB[1] + 2];
  const b = [p.hip[0] + 12, p.hip[1] + 6];
  ctx.strokeStyle = edgeOf(col); ctx.lineWidth = 9; ctx.lineCap = 'butt';
  ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
  ctx.strokeStyle = col; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
  ctx.strokeStyle = c.strapDark || shade(col, -0.35); ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(a[0] + 1, a[1] + 2); ctx.lineTo(b[0] + 1, b[1] + 1); ctx.stroke();
}

/** 등에 멘 칼집 (검을 손에 들지 않았을 때) */
function drawScabbard(ctx, p, c) {
  const a = [p.chest[0] - 22, p.chest[1] + 30];
  const b = [p.chest[0] - 6, p.chest[1] - 42];
  ctx.strokeStyle = edgeOf(c.hilt || '#5b3a24'); ctx.lineWidth = 11; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
  ctx.strokeStyle = c.hilt || '#5b3a24'; ctx.lineWidth = 8;
  ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
  // 손잡이
  ctx.strokeStyle = c.hiltDark || '#33200f'; ctx.lineWidth = 6.5;
  ctx.beginPath(); ctx.moveTo(b[0], b[1]); ctx.lineTo(b[0] + 5, b[1] - 16); ctx.stroke();
  ctx.strokeStyle = c.strap || '#7fdce8'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(b[0] + 1, b[1] - 4); ctx.lineTo(b[0] + 4, b[1] - 13); ctx.stroke();
}

/**
 * 손에 든 검. p.sword = { from:[x,y], to:[x,y] } (칼끝 방향)
 * from 은 손 위치, to 는 칼끝.
 */
function drawSword(ctx, sw, c) {
  const a = sw.from, b = sw.to;
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len, uy = dy / len;
  const nx = -uy, ny = ux;
  const blade = c.blade || '#dfe8f2', bladeDark = c.bladeDark || '#94a3b8';
  // 손잡이 (손 반대쪽으로 조금 나온다)
  const g0 = [a[0] - ux * 13, a[1] - uy * 13];
  ctx.strokeStyle = edgeOf(c.hilt || '#5b3a24'); ctx.lineWidth = 8; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(g0[0], g0[1]); ctx.lineTo(a[0] + ux * 4, a[1] + uy * 4); ctx.stroke();
  ctx.strokeStyle = c.hilt || '#5b3a24'; ctx.lineWidth = 5.5;
  ctx.beginPath(); ctx.moveTo(g0[0], g0[1]); ctx.lineTo(a[0] + ux * 4, a[1] + uy * 4); ctx.stroke();
  // 코등이
  const gd = [a[0] + ux * 5, a[1] + uy * 5];
  ctx.strokeStyle = c.trimDark || '#8a6a1c'; ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(gd[0] + nx * 8, gd[1] + ny * 8);
  ctx.lineTo(gd[0] - nx * 8, gd[1] - ny * 8);
  ctx.stroke();
  // 칼날
  const s = [a[0] + ux * 8, a[1] + uy * 8];
  const w = 5.4;
  poly(ctx, [
    [s[0] + nx * w, s[1] + ny * w],
    [b[0] + nx * 1.2, b[1] + ny * 1.2],
    [b[0] - nx * 1.2, b[1] - ny * 1.2],
    [s[0] - nx * w, s[1] - ny * w]
  ], edgeOf(blade));
  poly(ctx, [
    [s[0] + nx * (w - 1.4), s[1] + ny * (w - 1.4)],
    [b[0], b[1]],
    [s[0] - nx * (w - 1.4), s[1] - ny * (w - 1.4)]
  ], blade);
  // 날등 하이라이트
  ctx.strokeStyle = bladeDark; ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(s[0] - nx * 2, s[1] - ny * 2);
  ctx.lineTo(b[0] - nx * 0.6, b[1] - ny * 0.6);
  ctx.stroke();
}

/** 브로리 : 목에 두른 금색 고리 (가운데 파란 보석) */
function drawCollar(ctx, p, c) {
  const cx = p.chest[0], cy = p.chest[1];
  const gold = c.band || c.trim, goldDark = c.bandDark || c.trimDark;
  drawPart(ctx, [
    [cx - 14, cy - 5], [cx, cy - 10], [cx + 14, cy - 5],
    [cx + 13, cy + 3], [cx, cy + 7], [cx - 13, cy + 3]
  ], gold, edgeOf(gold), c2 => {
    c2.fillStyle = goldDark;
    c2.fillRect(cx - 16, cy + 1, 32, 5);
  });
  ctx.fillStyle = c.gem || '#2f6bd8';
  ctx.beginPath(); ctx.ellipse(cx + 1, cy - 1, 4.4, 3.8, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = c.gemLit || shade(c.gem || '#2f6bd8', 0.5);
  ctx.beginPath(); ctx.ellipse(cx - 0.4, cy - 2.6, 1.8, 1.3, -0.3, 0, Math.PI * 2); ctx.fill();
}

/** 베지트 : 양 귀의 포타라 귀걸이 (머리 좌표계 안에서 그린다) */
function drawPotara(ctx, c) {
  const gold = c.earring || '#f2c53d';
  ctx.strokeStyle = shade(gold, -0.5); ctx.lineWidth = 1.6; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-13.4, 2.4); ctx.lineTo(-14.2, 6); ctx.stroke();
  drawPart(ctx, [
    [-17.4, 6.4], [-12.4, 6.4], [-11.2, 10.4], [-14.4, 13.6], [-17.8, 10.4]
  ], gold, edgeOf(gold), c2 => {
    c2.fillStyle = shade(gold, 0.45);
    c2.beginPath(); c2.ellipse(-15.6, 8.6, 1.7, 1.3, -0.3, 0, Math.PI * 2); c2.fill();
  });
}

/** 초오지터 : 맨몸 위에 걸친 메타모르성 조끼 (검은 조끼 + 주황 어깨판) */
function drawFusionVest(ctx, p, c) {
  const cx = p.chest[0], cy = p.chest[1], hx = p.hip[0], hy = p.hip[1];
  const vest = c.vest || '#242c3d', vestDark = shade(vest, -0.4), vestLit = shade(vest, 0.28);
  const pad = c.vestPad || '#e0602a', padDark = shade(pad, -0.22);
  const trim = c.vestTrim || '#e6e9f2';

  // 몸통을 덮는 조끼 본체
  drawPart(ctx, [
    [cx - 21, cy - 6], [cx - 6, cy - 12], [cx + 9, cy - 12], [cx + 22, cy - 6],
    [cx + 18, cy + 20], [hx + 14, hy + 3], [hx - 14, hy + 3], [cx - 18, cy + 20]
  ], vest, edgeOf(vest), c2 => {
    c2.fillStyle = vestDark;
    c2.beginPath(); c2.ellipse(cx - 18, cy + 16, 10, 20, 0, 0, Math.PI * 2); c2.fill();
    c2.fillStyle = vestLit;
    c2.beginPath(); c2.ellipse(cx + 14, cy + 4, 5, 9, -0.25, 0, Math.PI * 2); c2.fill();
  });

  // 가운데를 V 자로 열어 맨 가슴(또는 안에 받쳐 입은 셔츠)을 드러낸다
  const inner = c.vestInner || c.skin;
  poly(ctx, [[cx - 7, cy - 10], [cx + 9, cy - 10], [cx + 3, cy + 15], [cx - 1, cy + 22], [cx - 4, cy + 15]], inner);
  ctx.strokeStyle = shade(inner, -0.42); ctx.lineWidth = 1.8; ctx.lineCap = 'round';
  if (!c.vestInner) {
    // 맨 가슴이면 가슴 근육과 복근 선을 넣는다
    ctx.beginPath();
    ctx.moveTo(cx - 5, cy + 3); ctx.quadraticCurveTo(cx + 1, cy + 8, cx + 6, cy + 2);
    ctx.stroke();
    ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(cx - 4, cy + 13); ctx.lineTo(cx + 3, cy + 12); ctx.stroke();
  }

  // V 자 가장자리의 밝은 테두리
  ctx.strokeStyle = trim; ctx.lineWidth = 1.8; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - 8, cy - 11); ctx.lineTo(cx - 5, cy + 15); ctx.lineTo(cx - 1, cy + 23);
  ctx.lineTo(cx + 4, cy + 15); ctx.lineTo(cx + 10, cy - 11);
  ctx.stroke();

  // 주황 어깨판
  bone(ctx, p.shoulderF, [p.shoulderF[0] + 14, p.shoulderF[1] + 4],
    len => drawPart(ctx, muscle(len, 17, 0.74, 0.5), pad, edgeOf(pad),
      limbShade(len, 17, padDark, shade(pad, 0.34))));
  bone(ctx, p.shoulderB, [p.shoulderB[0] - 13, p.shoulderB[1] + 4],
    len => drawPart(ctx, muscle(len, 16, 0.74, 0.5), padDark, edgeOf(padDark),
      limbShade(len, 16, shade(padDark, -0.28), pad)));
}

/** 마인 부우 : 허리띠 가운데의 금색 M 버클 */
function drawMajinBelt(ctx, p, c) {
  const hx = p.hip[0], hy = p.hip[1];
  const gold = c.buckle || '#e8c33a';
  drawPart(ctx, [
    [hx - 9, hy + 1], [hx, hy - 3], [hx + 9, hy + 1],
    [hx + 8, hy + 8], [hx, hy + 11], [hx - 8, hy + 8]
  ], gold, edgeOf(gold), c2 => {
    c2.fillStyle = shade(gold, -0.3);
    c2.beginPath(); c2.ellipse(hx - 6, hy + 7, 5, 4, 0, 0, Math.PI * 2); c2.fill();
  });
  // 마인의 각인 M
  ctx.strokeStyle = '#2a1420'; ctx.lineWidth = 1.7;
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(hx - 4, hy + 8); ctx.lineTo(hx - 2.6, hy + 1.6); ctx.lineTo(hx, hy + 5.2);
  ctx.lineTo(hx + 2.6, hy + 1.6); ctx.lineTo(hx + 4, hy + 8);
  ctx.stroke();
}

/** 브로리 : 허리에 두른 붉은 천 + 금색 허리 장식 */
function drawSash(ctx, p, c, bulk) {
  const hx = p.hip[0], hy = p.hip[1];
  const w = 17 * (bulk || 1);
  const sway = (p.sashSway || 0);
  // 무릎 위까지 늘어진 천 (좁고 길게)
  drawPart(ctx, [
    [hx - w, hy - 3], [hx, hy - 8], [hx + w, hy - 3],
    [hx + w - 2, hy + 16], [hx + w - 4 + sway, hy + 38], [hx + 4 + sway, hy + 52],
    [hx - 5 + sway * 0.6, hy + 52], [hx - w + 5 + sway * 0.6, hy + 38], [hx - w + 2, hy + 16]
  ], c.trim, edgeOf(c.trim), c2 => {
    c2.fillStyle = c.trimDark;
    c2.beginPath();
    c2.moveTo(hx - w, hy + 2);
    c2.quadraticCurveTo(hx - 8, hy + 26, hx - w + 5, hy + 50);
    c2.lineTo(hx - w - 6, hy + 50);
    c2.lineTo(hx - w - 6, hy);
    c2.closePath(); c2.fill();
    // 천의 주름
    c2.strokeStyle = shade(c.trim, -0.35); c2.lineWidth = 2;
    for (let i = -1; i <= 1; i++) {
      c2.beginPath();
      c2.moveTo(hx + i * 8, hy + 2);
      c2.quadraticCurveTo(hx + i * 10 + sway * 0.4, hy + 28, hx + i * 7 + sway, hy + 48);
      c2.stroke();
    }
  });
  // 금색 허리 장식 + 파란 보석
  const gold = c.belt || c.trim, goldDark = c.beltDark || c.trimDark;
  drawPart(ctx, [
    [hx - 13, hy - 6], [hx, hy - 10], [hx + 13, hy - 6],
    [hx + 12, hy + 3], [hx, hy + 6], [hx - 12, hy + 3]
  ], gold, edgeOf(gold), c2 => {
    c2.fillStyle = goldDark;
    c2.fillRect(hx - 15, hy + 1, 30, 5);
  });
  ctx.fillStyle = c.gem || '#2f6bd8';
  ctx.beginPath(); ctx.ellipse(hx + 1, hy - 3, 4.6, 4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = c.gemLit || shade(c.gem || '#2f6bd8', 0.5);
  ctx.beginPath(); ctx.ellipse(hx - 0.4, hy - 4.6, 1.8, 1.3, -0.3, 0, Math.PI * 2); ctx.fill();
}

/** 쿠우라 : 팔꿈치에서 뒤로 뻗은 흰 가시 */
function drawElbowSpikes(ctx, p, c) {
  const col = c.trim || '#e2e6ee', dark = c.trimDark || '#a7afbd';
  const one = (joint, from, back) => {
    let dx = joint[0] - from[0], dy = joint[1] - from[1];
    const len = Math.hypot(dx, dy) || 1;
    dx /= len; dy /= len;                    // 위팔 방향 = 가시가 뻗는 방향
    const nx = -dy, ny = dx;
    const tip = [joint[0] + dx * 12 - 3, joint[1] + dy * 12 - 3];
    poly(ctx, [
      [joint[0] + nx * 3.6, joint[1] + ny * 3.6],
      [tip[0], tip[1]],
      [joint[0] - nx * 3.6, joint[1] - ny * 3.6]
    ], back ? dark : col);
    if (!back) {
      poly(ctx, [
        [joint[0] + nx * 2.4, joint[1] + ny * 2.4],
        [tip[0], tip[1]],
        [joint[0] - nx * 1.2, joint[1] - ny * 1.2]
      ], shade(col, 0.4));
    }
  };
  one(p.armB[0], p.shoulderB, true);
  one(p.armF[0], p.shoulderF, false);
}

/** 쿠우라 : 얼굴 아래쪽을 덮는 흰 가면 (표정 위에 다시 덮는다) */
function drawFaceMask(ctx, ch) {
  const c = ch.colors;
  const col = c.hair || '#e2e6ee';
  // 코 아래부터 턱까지 덮는 판
  drawPart(ctx, [
    [-13, 3], [-4, 1], [8, 2], [15, 5], [12, 13], [3, 18], [-6, 15], [-12, 9]
  ], col, edgeOf(col), c2 => {
    c2.fillStyle = shade(col, -0.22);
    c2.beginPath(); c2.ellipse(-8, 12, 7, 5, 0, 0, Math.PI * 2); c2.fill();
    c2.strokeStyle = shade(col, -0.45); c2.lineWidth = 1.6;
    c2.beginPath(); c2.moveTo(-10, 7); c2.lineTo(13, 8); c2.stroke();
  });
  // 부리처럼 앞으로 튀어나온 끝
  poly(ctx, [[12, 4], [22, 9], [11, 13]], col);
  poly(ctx, [[12, 4], [22, 9], [14, 9]], shade(col, 0.35));
}

/** 팔다리에 얹는 무늬 (셀의 점박이 · 프리저의 보석 · 18호의 줄무늬 소매 · 17호의 각반) */
function limbDecoFor(ch) {
  const c = ch.colors, pr = ch.props || {};
  const fns = [];

  if (pr.spots) {
    const spot = c.spot || '#141a20';
    fns.push((c2, len, w, part) => {
      c2.fillStyle = spot;
      const n = part === 'upper' || part === 'thigh' ? 3 : 4;
      for (let i = 0; i < n; i++) {
        const t = (i + 0.6) / (n + 0.2);
        const off = ((i * 37) % 11) / 11 - 0.5;
        const r = (part === 'fore' || part === 'shin') ? 3.4 : 4.2;
        c2.beginPath();
        c2.ellipse(len * t, off * w * 0.55, r, r * 0.85, 0, 0, Math.PI * 2);
        c2.fill();
      }
    });
  }

  if (pr.gems) {
    const gem = c.gem || '#8b3fc9', gemDark = c.gemDark || '#4e1d76', gemLit = c.gemLit || '#cf9bf5';
    fns.push((c2, len, w, part) => {
      if (part === 'upper') {
        // 어깨의 큰 보라 보석
        c2.fillStyle = gem;
        c2.beginPath(); c2.ellipse(2, -1, 13, w * 0.56, 0, 0, Math.PI * 2); c2.fill();
        c2.fillStyle = gemDark;
        c2.beginPath(); c2.ellipse(5, w * 0.2, 8, w * 0.3, 0, 0, Math.PI * 2); c2.fill();
        c2.fillStyle = gemLit;
        c2.beginPath(); c2.ellipse(-1, -w * 0.22, 4.6, 3.2, -0.3, 0, Math.PI * 2); c2.fill();
      } else if (part === 'shin') {
        // 정강이의 보라 줄무늬
        c2.fillStyle = gem;
        c2.beginPath();
        c2.ellipse(len * 0.62, 0, len * 0.34, w * 0.3, 0, 0, Math.PI * 2);
        c2.fill();
        c2.fillStyle = gemLit;
        c2.beginPath();
        c2.ellipse(len * 0.58, -w * 0.1, len * 0.2, w * 0.12, 0, 0, Math.PI * 2);
        c2.fill();
      }
    });
  }

  if (pr.stripes) {
    // 18호 : 소매를 가로지르는 줄무늬 (팔에만)
    const st = c.stripe || '#4d86d0';
    fns.push((c2, len, w, part) => {
      if (part !== 'upper' && part !== 'fore') return;
      c2.fillStyle = st;
      const n = part === 'upper' ? 3 : 4;
      for (let i = 0; i < n; i++) {
        const t = (i + 0.65) / (n + 0.4);
        c2.fillRect(len * t, -w * 0.62, Math.max(3, len * 0.15), w * 1.24);
      }
    });
  }

  if (pr.legWarmer) {
    // 17호 : 정강이 아래를 덮는 초록 각반
    const g = c.legWarmer || '#7fc44a';
    const torn = shade(c.pants || '#4d6fa8', 0.5);
    fns.push((c2, len, w, part) => {
      if (part === 'thigh') {
        // 무릎께가 찢어진 청바지
        c2.fillStyle = torn;
        c2.fillRect(len * 0.68, -w * 0.3, len * 0.18, w * 0.46);
        return;
      }
      if (part !== 'shin') return;
      c2.fillStyle = g;
      c2.fillRect(len * 0.46, -w * 0.72, len * 0.7, w * 1.44);
      c2.strokeStyle = shade(g, -0.34); c2.lineWidth = 1.4;
      for (let i = 0; i < 4; i++) {
        const x = len * (0.54 + i * 0.11);
        c2.beginPath(); c2.moveTo(x, -w * 0.62); c2.lineTo(x, w * 0.62); c2.stroke();
      }
    });
  }

  if (!fns.length) return null;
  if (fns.length === 1) return fns[0];
  return (c2, len, w, part) => { for (const fn of fns) fn(c2, len, w, part); };
}

/** 17호 : 목에 두른 주황 스카프 */
function drawScarf(ctx, p, c) {
  const cx = p.chest[0], cy = p.chest[1];
  const col = c.scarf || '#f08c2a';
  drawPart(ctx, [
    [cx - 14, cy - 10], [cx, cy - 15], [cx + 15, cy - 10],
    [cx + 13, cy + 2], [cx, cy + 6], [cx - 12, cy + 2]
  ], col, edgeOf(col), c2 => {
    c2.fillStyle = shade(col, -0.28);
    c2.beginPath(); c2.ellipse(cx - 11, cy - 1, 7, 6, 0, 0, Math.PI * 2); c2.fill();
    c2.fillStyle = shade(col, 0.28);
    c2.beginPath(); c2.ellipse(cx + 5, cy - 9, 6, 2.6, -0.2, 0, Math.PI * 2); c2.fill();
  });
  // 앞으로 늘어진 매듭 자락
  poly(ctx, [[cx + 3, cy - 1], [cx + 13, cy + 2], [cx + 10, cy + 15], [cx + 2, cy + 12]], col);
  poly(ctx, [[cx + 3, cy - 1], [cx + 9, cy + 1], [cx + 7, cy + 13], [cx + 3, cy + 11]], shade(col, -0.24));
}

/** 17호 : 가슴의 레드리본군 마크 */
function drawRRLogo(ctx, p, c) {
  const cx = p.chest[0], cy = p.chest[1];
  const red = c.logo || '#d8323c';
  drawPart(ctx, [
    [cx - 7, cy + 11], [cx + 8, cy + 11], [cx + 8, cy + 20], [cx - 7, cy + 20]
  ], red, edgeOf(red), c2 => {
    // 두 개의 R 을 대신하는 획
    c2.fillStyle = '#ffffff';
    for (const bx of [cx - 5, cx + 1]) {
      c2.fillRect(bx, cy + 13, 1.5, 5.4);
      c2.fillRect(bx, cy + 13, 4, 1.4);
      c2.fillRect(bx + 2.6, cy + 13, 1.4, 2.6);
      c2.fillRect(bx, cy + 15.4, 3.4, 1.3);
    }
  });
}

/** 18호 : 허리에서 퍼지는 데님 치마 */
function drawSkirt(ctx, p, c) {
  const hx = p.hip[0], hy = p.hip[1];
  const col = c.skirt || c.gi;
  drawPart(ctx, [
    [hx - 15, hy - 4], [hx, hy - 8], [hx + 15, hy - 4],
    [hx + 19, hy + 20], [hx, hy + 25], [hx - 19, hy + 20]
  ], col, edgeOf(col), c2 => {
    c2.fillStyle = shade(col, -0.3);
    c2.beginPath(); c2.ellipse(hx - 17, hy + 14, 9, 17, 0, 0, Math.PI * 2); c2.fill();
    c2.strokeStyle = shade(col, -0.44); c2.lineWidth = 1.5;
    for (let i = -1; i <= 1; i++) {
      c2.beginPath();
      c2.moveTo(hx + i * 8, hy - 2);
      c2.lineTo(hx + i * 11.5, hy + 22);
      c2.stroke();
    }
  });
}

/**
 * 캐릭터 리그를 원점(발끝) 기준으로 그린다.
 * 레이어 순서 : 뒤팔 → 뒤다리 → 몸통 → 앞다리 → 앞팔 → 머리
 */
function drawFighterRig(ctx, f, p, time) {
  // 어린아이 체형(오천크스)처럼 몸 전체가 작은 캐릭터는 발끝을 기준으로 축소한다
  const k = f.char.scale || 1;
  if (k === 1) { drawRigBody(ctx, f, p, time); return; }
  ctx.save();
  ctx.scale(k, k);
  drawRigBody(ctx, f, p, time);
  ctx.restore();
}

function drawRigBody(ctx, f, p, time) {
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
  // 상체와 다리 색이 다른 캐릭터 (트랭크스의 재킷 + 검은 바지, 셀의 흑색 상체)
  const pants = c.pants || gi, pantsDark = c.pantsDark || giDark;
  const pantsLight = shade(pants, 0.22);
  const bulk = ch.bulk || 1;                 // 브로리처럼 거구인 캐릭터는 사지가 더 두껍다
  const props = ch.props || {};
  const deco = limbDecoFor(ch);
  const decoBack = deco ? (c2, len, w, part) => {
    c2.save(); c2.globalAlpha = 0.72; deco(c2, len, w, part); c2.restore();
  } : null;

  // 0) 소품 (모든 부위 뒤) : 긴 머리 / 꼬리 / 날개 / 등에 멘 칼집
  drawLongHair(ctx, p, hairSetOf(ch, f), time, (f.charging || f.superSaiyan) ? 2.2 : 0);
  if (props.wings) drawWings(ctx, p, c);
  if (props.tail) drawTail(ctx, p, c);
  if (props.sword && !p.sword) drawScabbard(ctx, p, c);

  // 1) 뒤쪽 팔
  drawArm(ctx, p.shoulderB, p.armB[0], p.armB[1], 16 * bulk,
    back(sleeve), shade(sleeveDark, -0.26), shade(sleeveLight, -0.26),
    back(glove), shade(gloveDark, -0.26), shade(gloveLight, -0.26), foreBack, bandBack, decoBack);
  // 2) 뒤쪽 다리
  drawLeg(ctx, p.hip, p.legB[0], p.legB[1], 24 * bulk,
    back(pants), shade(pantsDark, -0.26), shade(pantsLight, -0.26),
    back(boot), shade(bootDark, -0.26), shade(bootLight, -0.26), decoBack,
    c.bootTip ? back(c.bootTip) : null);

  // 3) 몸통 : 어깨가 넓고 허리가 좁은 상체 실루엣
  const cx = p.chest[0], cy = p.chest[1], hx = p.hip[0], hy = p.hip[1];
  const bw = bulk;                           // 어깨/허리 폭
  const torso = [
    [cx - 19 * bw, cy + 4], [cx - 6 * bw, cy - 7], [cx + 8 * bw, cy - 7], [cx + 20 * bw, cy + 4],
    [cx + 17 * bw, cy + 22], [hx + 14 * bw, hy + 2], [hx + 15 * bw, hy + 10],
    [hx - 15 * bw, hy + 10], [hx - 14 * bw, hy + 2], [cx - 17 * bw, cy + 22]
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

  // 셀 : 크림색 가슴판 + 복부
  if (ch.id === 'cell') {
    drawPart(ctx, [
      [cx - 13, cy + 1], [cx, cy - 5], [cx + 14, cy + 1],
      [cx + 11, cy + 17], [cx, cy + 22], [cx - 10, cy + 17]
    ], c.trim, edgeOf(c.trim), c2 => {
      c2.fillStyle = c.trimDark;
      c2.beginPath(); c2.ellipse(cx - 11, cy + 14, 8, 12, 0, 0, Math.PI * 2); c2.fill();
    });
    // 배 쪽 크림색 판
    drawPart(ctx, [
      [hx - 10, hy - 6], [hx, hy - 9], [hx + 10, hy - 6],
      [hx + 8, hy + 8], [hx, hy + 11], [hx - 8, hy + 8]
    ], c.trim, edgeOf(c.trim), null);
    // 점박이 무늬 (상체 옆구리)
    ctx.save();
    ctx.fillStyle = c.spot || '#141a20';
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.ellipse(cx - 15 + (i % 2) * 30, cy + 6 + Math.floor(i / 2) * 11, 3.4, 3, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // 쿠우라 : 흰 가슴 갑주 + 파란 보석
  if (ch.id === 'cooler') {
    drawPart(ctx, [
      [cx - 17, cy + 2], [cx - 5, cy - 6], [cx + 7, cy - 6], [cx + 18, cy + 2],
      [cx + 14, cy + 20], [cx, cy + 25], [cx - 13, cy + 20]
    ], c.trim, edgeOf(c.trim), c2 => {
      c2.fillStyle = c.trimDark;
      c2.beginPath(); c2.ellipse(cx - 14, cy + 12, 8, 13, 0, 0, Math.PI * 2); c2.fill();
      c2.strokeStyle = shade(c.trim, -0.4); c2.lineWidth = 1.8;
      c2.beginPath(); c2.moveTo(cx + 1, cy - 4); c2.lineTo(cx + 1, cy + 22); c2.stroke();
    });
    ctx.fillStyle = c.gem || '#2f7fd8';
    ctx.beginPath(); ctx.ellipse(cx + 1, cy + 9, 5.4, 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = c.gemLit || '#93cbff';
    ctx.beginPath(); ctx.ellipse(cx - 0.6, cy + 7, 2.2, 2, -0.3, 0, Math.PI * 2); ctx.fill();
  }

  // 프리저 : 가슴/복부의 보라 절판
  if (ch.props && ch.props.gems) {
    const gem = c.gem || '#8b3fc9';
    drawPart(ctx, [
      [cx - 11, cy + 16], [cx, cy + 12], [cx + 12, cy + 16],
      [cx + 10, cy + 26], [cx, cy + 30], [cx - 9, cy + 26]
    ], gem, edgeOf(gem), c2 => {
      c2.fillStyle = c.gemDark || shade(gem, -0.4);
      c2.fillRect(cx - 14, cy + 24, 30, 8);
      c2.fillStyle = c.gemLit || shade(gem, 0.4);
      c2.beginPath(); c2.ellipse(cx - 3, cy + 17, 5, 2.4, -0.2, 0, Math.PI * 2); c2.fill();
    });
    // 가슴 갑주 경계
    ctx.strokeStyle = shade(gi, -0.4); ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 17, cy + 7); ctx.quadraticCurveTo(cx, cy + 2, cx + 18, cy + 7);
    ctx.stroke();
  }

  // 초오지터 : 메타모르성 조끼
  if (props.fusionVest) drawFusionVest(ctx, p, c);

  // 도복 깃 (속옷이 보이는 캐릭터)
  if (/^(goku|goku2|vegeta|vegeta2|piccolo|gohan|gohan2|vegito)$/.test(ch.id)) {
    poly(ctx, [
      [cx - 7, cy - 2], [cx + 9, cy - 2], [cx + 7, cy + 20], [cx + 1, cy + 26], [cx - 5, cy + 20]
    ], c.trim);
    poly(ctx, [[cx + 2, cy - 2], [cx + 9, cy - 2], [cx + 7, cy + 20], [cx + 2, cy + 24]],
      shade(c.trim, -0.24));
  }

  // 트랭크스의 보라 재킷 / 18호의 데님 조끼 : 열린 앞자락 안으로 검은 상의가 보인다
  if (/^(trunks|android18)$/.test(ch.id)) {
    poly(ctx, [
      [cx - 8, cy - 4], [cx + 10, cy - 4], [cx + 8, cy + 24], [cx + 1, cy + 30], [cx - 6, cy + 24]
    ], c.trim);
    // 재킷 앞자락 (양쪽으로 벌어진다)
    poly(ctx, [[cx - 19, cy + 3], [cx - 7, cy - 3], [cx - 5, cy + 26], [cx - 16, cy + 22]], giDark);
    poly(ctx, [[cx + 20, cy + 3], [cx + 9, cy - 3], [cx + 7, cy + 26], [cx + 17, cy + 22]], gi);
  }

  // 17호 : 가슴의 레드리본 마크 + 목에 두른 주황 스카프
  if (props.rrLogo) drawRRLogo(ctx, p, c);
  if (props.scarf) drawScarf(ctx, p, c);

  // 브로리 : 목에 두른 금색 고리
  if (props.collar) drawCollar(ctx, p, c);

  // 어깨를 가로지르는 검대
  if (props.strap) drawStrap(ctx, p, c);

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
  // 벨트 매듭 + 늘어진 끈 (마인 부우는 매듭 대신 M 버클을 다리 앞에 그린다)
  if (!props.majinBelt) {
    bone(ctx, [hx - 2, hy + 6], [hx - 7, hy + 22],
      len => drawPart(ctx, muscle(len, 8, 0.5, 0.4), belt, edgeOf(belt), null));
  }

  // 4) 앞쪽 다리
  drawLeg(ctx, p.hip, p.legF[0], p.legF[1], 26 * bulk,
    pants, pantsDark, pantsLight, boot, bootDark, bootLight, deco, c.bootTip || null);
  // 브로리 : 허리에 두른 붉은 천 (다리 앞으로 늘어진다)
  if (props.sash) drawSash(ctx, p, c, bulk);
  // 마인 부우 : 허리띠 가운데의 금색 M 버클
  if (props.majinBelt) drawMajinBelt(ctx, p, c);
  // 18호 : 데님 치마 (다리 위로 덮인다)
  if (props.skirt) drawSkirt(ctx, p, c);
  // 5) 앞쪽 팔
  drawArm(ctx, p.shoulderF, p.armF[0], p.armF[1], 17.5 * bulk,
    sleeve, sleeveDark, sleeveLight, glove, gloveDark, gloveLight, fore, band, deco);
  // 6) 쿠우라 : 팔꿈치의 흰 가시
  if (props.spikes) drawElbowSpikes(ctx, p, c);
  // 손에 든 검
  if (props.sword && p.sword) drawSword(ctx, p.sword, c);
  // 7) 머리
  drawHead(ctx, p, ch, f, time);
}

function drawFighter(ctx, f, time) {
  const ch = f.char;

  const p = poseFor(f, time);

  // 그림자 (등장 연출로 떠 있는 동안에는 작아진다)
  const shadowY = f.y + (p.offY || 0);
  const shadowX = f.x + (p.offX || 0) * f.facing;
  ctx.save();
  const h = clamp(1 - (GROUND_Y - shadowY) / 260, 0.25, 1);
  ctx.globalAlpha = 0.32 * h;
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.ellipse(shadowX, GROUND_Y + 4, 34 * h, 9 * h, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  const frame = SpriteBank.get(f, p, time);

  ctx.save();
  // 등장 연출용 이동값 (스프라이트에 굽지 않고 그릴 때만 더한다)
  ctx.translate(
    SpriteBank.snap(f.x + (p.offX || 0) * f.facing),
    SpriteBank.snap(f.y + (p.offY || 0)));
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
  const core = pr.core || '#ffffff';
  const puls = 1 + Math.sin(time / 4) * 0.05;
  const dir = Math.sign(pr.vx) || 1;

  // 바깥 광휘
  const g = ctx.createRadialGradient(pr.x, pr.y, 0, pr.x, pr.y, r * 2.4 * puls);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(pr.heavy ? 0.28 : 0.35, core);
  g.addColorStop(pr.heavy ? 0.52 : 0.6, pr.color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(pr.x, pr.y, r * 2.4 * puls, 0, Math.PI * 2);
  ctx.fill();

  if (pr.heavy) {
    // 거대 구체 : 표면을 도는 불꽃 고리와 흔들리는 가장자리
    ctx.globalAlpha = 0.75;
    ctx.strokeStyle = core;
    for (let k = 0; k < 3; k++) {
      const a = time / (11 + k * 4) + k * 1.1;
      ctx.lineWidth = 2.6 - k * 0.5;
      ctx.beginPath();
      ctx.ellipse(pr.x, pr.y, r * (0.94 - k * 0.12), r * (0.36 + k * 0.16), a, 0, Math.PI * 2);
      ctx.stroke();
    }
    // 뒤로 끌리는 화염 꼬리
    ctx.globalAlpha = 0.5;
    const tg = ctx.createRadialGradient(pr.x - dir * r * 1.5, pr.y, 0, pr.x - dir * r * 1.5, pr.y, r * 1.4);
    tg.addColorStop(0, pr.color);
    tg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = tg;
    ctx.beginPath();
    ctx.ellipse(pr.x - dir * r * 1.5, pr.y, r * 1.5, r * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // 핵
  ctx.globalAlpha = pr.heavy ? 0.95 : 0.8;
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(pr.x - dir * r * (pr.heavy ? 0.1 : 0.3), pr.y,
    r * ((pr.heavy ? 0.62 : 0.55) + Math.sin(time / 4) * 0.06), 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawBeam(ctx, f, time) {
  const rect = f.beamRect();
  if (!rect) return;
  const def = f.attack.def;
  const ult = isUltimate(def);
  const src = skillOf(f.char, def);
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
  if (!tierOf(def) || f.attack.frame >= def.startup) return;
  const t = clamp(f.attack.frame / Math.max(1, def.startup), 0, 1);
  const m = motionFor(f.char, def);
  const src = skillOf(f.char, def);
  const spots = m.twin
    ? [[m.chargeX, m.chargeY], [-m.chargeX, m.chargeY]]
    : [[m.chargeX, m.chargeY]];
  const r0 = m.chargeR * (isUltimate(def) ? 1.35 : 1);

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
  const ca = a.attack ? skillOf(a.char, a.attack.def) : null;
  const cb = b.attack ? skillOf(b.char, b.attack.def) : null;
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
