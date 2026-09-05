/* =========================================================
 *  DRAGON FIGHTER Z  -  캐릭터 데이터
 *  각 캐릭터의 스탯 / 색상 / 필살기 정보를 정의한다.
 * ========================================================= */
'use strict';

const CHARACTERS = [
  {
    id: 'goku',
    name: '손오공',
    title: '지구에서 자란 사이어인',
    hp: 1000, speed: 3.5, jump: 17.0, power: 1.00, defense: 1.00, weight: 1.00,
    hairStyle: 'goku',
    style: 'karate',
    colors: {
      gi: '#ff7a18', giDark: '#c85406', trim: '#1e4fd8', trimDark: '#12328f',
      forearm: '#f5c79b', forearmDark: '#d69f70',   // 반팔 도복 - 아래팔은 맨살
      band: '#2a5be0', bandDark: '#16337f',         // 파란 손목 밴드
      skin: '#f5c79b', skinDark: '#d69f70', hair: '#161616', hairLit: '#3d3d3d',
      aura: '#ffd24a', eye: '#2b2b2b'
    },
    entrance: 'descend', victory: 'scratch',
    form: { name: '초사이어인', saiyan: true, hair: '#ffdf3d', hairLit: '#fff8b8', eye: '#2fbf6a', aura: '#ffe066' },
    special: { name: '에네르기파', color: '#7fd8ff', core: '#ffffff', motion: 'cupped' },
    ultimate: { name: '초 에네르기파', color: '#8ef0ff', core: '#ffffff', motion: 'cupped' },
    quotes: { win: '좋아! 역시 강한 녀석과 싸우는 건 즐겁다구!', pick: '자, 붙어보자!' }
  },
  {
    id: 'vegeta',
    name: '베지터',
    title: '사이어인의 왕자',
    hp: 960, speed: 3.6, jump: 17.5, power: 1.12, defense: 0.96, weight: 0.98,
    hairStyle: 'vegeta',
    style: 'royal',
    colors: {
      gi: '#1b2a5e', giDark: '#101a3d', trim: '#f2f2f2', trimDark: '#c2c6d6',
      sleeve: '#22346f', sleeveDark: '#141f4a',
      glove: '#f4f6fb', gloveDark: '#c3c9da',      // 흰 장갑
      boot: '#f4f6fb', bootDark: '#c3c9da',        // 흰 부츠
      belt: '#e8c45a', beltDark: '#a8862a',
      armor: { plate: '#eef1f7', plateDark: '#c2c8d8', pad: '#e8c45a', padDark: '#b08f2e' },
      skin: '#f5c79b', skinDark: '#d69f70', hair: '#1d1408', hairLit: '#4a331a',
      aura: '#ff5ec7', eye: '#2b2b2b'
    },
    entrance: 'crossArms', victory: 'foldProud',
    form: { name: '초사이어인', saiyan: true, hair: '#ffd93d', hairLit: '#fff3a0', eye: '#2fbf6a', aura: '#ffdf4d' },
    special: { name: '갤릭포', color: '#c47bff', core: '#ffe9ff', motion: 'onehand' },
    ultimate: { name: '파이널 플래시', color: '#ffe14d', core: '#ffffff', motion: 'flash' },
    quotes: { win: '이 몸이 바로 사이어인의 왕자다!', pick: '건방진 녀석...' }
  },
  {
    id: 'piccolo',
    name: '피콜로',
    title: '마족의 후계자',
    hp: 1060, speed: 3.1, jump: 16.0, power: 1.05, defense: 1.10, weight: 1.08,
    hairStyle: 'piccolo',
    style: 'demon',
    colors: {
      gi: '#5f2a86', giDark: '#3d1a58', trim: '#f0e6c8', trimDark: '#c9bb96',
      skin: '#7bc46b', skinDark: '#4f8f45', hair: '#3f7a36', hairLit: '#63a557',
      aura: '#a97bff', eye: '#e8534a'
    },
    entrance: 'meditate', victory: 'foldQuiet',
    form: { name: '잠재능력 해방', aura: '#8ef0ff' },
    special: { name: '마관광살포', color: '#ffe066', core: '#fff6c9', motion: 'fingers' },
    ultimate: { name: '초 폭렬마파', color: '#ff9d3d', core: '#fff0c9', motion: 'wave' },
    quotes: { win: '아직 멀었군. 수행이 부족하다.', pick: '덤벼라.' }
  },
  {
    id: 'frieza',
    name: '프리저',
    title: '우주의 제왕',
    hp: 900, speed: 4.0, jump: 18.0, power: 0.94, defense: 0.92, weight: 0.90,
    hairStyle: 'frieza',
    style: 'emperor',
    props: { tail: true, gems: true },
    colors: {
      gi: '#f2f5fb', giDark: '#c3cadc',              // 흰 생체 장갑
      trim: '#8b3fc9', trimDark: '#57217f',
      pants: '#f2f5fb', pantsDark: '#c3cadc',
      glove: '#eef1f8', gloveDark: '#bfc6d8',
      boot: '#eef1f8', bootDark: '#bfc6d8',
      skin: '#f4f6fb', skinDark: '#c6cddd',
      tail: '#e3e8f4', tailDark: '#adb6ca',          // 꼬리 (몸통보다 한 톤 어둡게)
      hair: '#7b32bc', hairLit: '#c48ef0',           // 머리 위 보라 돔
      gem: '#8b3fc9', gemDark: '#4e1d76', gemLit: '#cf9bf5',
      aura: '#c46bff', eye: '#ef2f4e'
    },
    entrance: 'hover', victory: 'finger',
    special: { name: '데스 빔', color: '#ff4d7a', core: '#ffd6e2', motion: 'point' },
    ultimate: { name: '데스 볼', color: '#ff7b3d', core: '#ffe0b0', motion: 'orb', type: 'orb' },
    quotes: { win: '하찮은 원숭이 따위가.', pick: '후훗... 놀아드리죠.' }
  },
  {
    id: 'cell',
    name: '셀',
    title: '완전체 인조인간',
    hp: 1120, speed: 3.0, jump: 16.2, power: 1.18, defense: 1.06, weight: 1.15,
    hairStyle: 'cell',
    style: 'perfect',
    props: { wings: true, spots: true },
    colors: {
      gi: '#2b3340', giDark: '#151a24',              // 검은 상체 장갑
      trim: '#efe6c6', trimDark: '#c0b58e',          // 가슴 크림색 판
      pants: '#3f9d63', pantsDark: '#256b41',        // 초록 다리
      sleeve: '#2b3340', sleeveDark: '#151a24',      // 검은 어깨
      forearm: '#3f9d63', forearmDark: '#256b41',    // 초록 아래팔
      glove: '#efe6c6', gloveDark: '#bdb289',        // 크림색 손
      boot: '#e8b53a', bootDark: '#9d7615',          // 금색 부츠
      belt: '#efe6c6', beltDark: '#bdb289',
      skin: '#4fb877', skinDark: '#2e8250',          // 초록 피부
      hair: '#2a2436', hairLit: '#4d4463',           // 검은 머리 볏
      spot: '#141a20',                               // 점박이 무늬
      wing: '#1b2230', wingDark: '#0c1018',
      aura: '#c9ff5c', eye: '#e0518f'
    },
    entrance: 'shrug', victory: 'spread',
    special: { name: '카메하메파', color: '#8affc0', core: '#eaffef', motion: 'cupped' },
    ultimate: { name: '솔라 카메하메하', color: '#c9ff5c', core: '#ffffff', motion: 'cupped' },
    quotes: { win: '완전한 힘 앞에 무릎 꿇어라.', pick: '실험은 끝났다.' }
  },
  {
    id: 'gohan',
    name: '얼티밋 오반',
    title: '잠재능력을 해방한 전사',
    hp: 1020, speed: 3.65, jump: 17.2, power: 1.22, defense: 1.00, weight: 1.02,
    hairStyle: 'gohan',
    style: 'mystic',
    colors: {
      gi: '#27356f', giDark: '#161d43', trim: '#46cfe8', trimDark: '#22829b',
      sleeve: '#46cfe8', sleeveDark: '#22829b',      // 하늘색 속옷 소매
      belt: '#d8433f', beltDark: '#8f2320',          // 붉은 띠
      boot: '#dfe6f5', bootDark: '#a7b2cc',
      skin: '#f5c79b', skinDark: '#d69f70',
      hair: '#141414', hairLit: '#3a3a3a',
      aura: '#ffeeb0', eye: '#2b2b2b'
    },
    entrance: 'calm', victory: 'fistUp',
    special: { name: '마섬광', color: '#ffd45c', core: '#fff6d2', motion: 'overhead' },
    ultimate: { name: '초 마섬광', color: '#ffe98a', core: '#ffffff', motion: 'overhead' },
    quotes: { win: '봐주는 건 여기까지야.', pick: '이 힘, 시험해 볼까.' }
  },
  {
    id: 'trunks',
    name: '트랭크스',
    title: '미래에서 온 전사',
    hp: 980, speed: 3.7, jump: 17.2, power: 1.06, defense: 0.98, weight: 1.00,
    hairStyle: 'trunks',
    style: 'blade',
    props: { sword: true, strap: true },
    colors: {
      gi: '#7b52c9', giDark: '#4a2e8f',              // 보라 재킷
      trim: '#1d1f28', trimDark: '#0e0f16',          // 검은 속옷 깃
      pants: '#23252f', pantsDark: '#13141c',        // 검은 통바지
      sleeve: '#7b52c9', sleeveDark: '#4a2e8f',
      forearm: '#7b52c9', forearmDark: '#4a2e8f',
      glove: '#f5c79b', gloveDark: '#d69f70',
      belt: '#e8bb3a', beltDark: '#a37f16',          // 금색 벨트
      boot: '#e8bb3a', bootDark: '#a37f16',          // 금색 부츠
      skin: '#f5c79b', skinDark: '#d69f70',
      hair: '#c9a8f0', hairLit: '#eadcff',           // 연보라 머리
      strap: '#7fdce8', strapDark: '#3f9fb0',        // 하늘색 검대
      blade: '#dfe8f2', bladeDark: '#94a3b8',        // 검신
      hilt: '#5b3a24', hiltDark: '#33200f',
      aura: '#7fe6ff', eye: '#2b6bd8'
    },
    entrance: 'sword', victory: 'shoulder',
    form: { name: '초사이어인', saiyan: true, hair: '#ffe14d', hairLit: '#fff8bd', eye: '#3fd07a', aura: '#ffe98a' },
    special: { name: '버닝 어택', color: '#ffb35c', core: '#fff0d0', motion: 'weave' },
    ultimate: { name: '히트 돔 어택', color: '#ffd93d', core: '#ffffff', motion: 'orb' },
    quotes: { win: '미래는 내가 바꾼다.', pick: '봐주지 않겠어.' }
  },
  {
    id: 'broly',
    name: '브로리',
    title: '전설의 초사이어인',
    hp: 1200, speed: 3.0, jump: 15.4, power: 1.35, defense: 1.16, weight: 1.30,
    hairStyle: 'broly',
    style: 'legendary',
    bulk: 1.24,                                     // 압도적인 체구
    props: { sash: true, collar: true },
    colors: {
      gi: '#e8b483', giDark: '#b57f4c',             // 맨몸 상체
      trim: '#b8232c', trimDark: '#7c1219',         // 붉은 허리천
      pants: '#dcd7c6', pantsDark: '#a49c88',       // 흰 통바지
      sleeve: '#e8b483', sleeveDark: '#b57f4c',
      forearm: '#e8b483', forearmDark: '#b57f4c',
      band: '#f0c73a', bandDark: '#a8831a',         // 금색 손목 보호대
      glove: '#e8b483', gloveDark: '#b57f4c',
      boot: '#f0c73a', bootDark: '#a8831a',         // 금색 부츠
      belt: '#f0c73a', beltDark: '#a8831a',
      skin: '#e8b483', skinDark: '#b57f4c',
      hair: '#d9e94b', hairLit: '#f4ffb0',          // 연둣빛 금발
      gem: '#2f6bd8', gemDark: '#17408f', gemLit: '#8fc4ff',
      aura: '#8dff62', eye: '#2f2a1c'
    },
    entrance: 'roar', victory: 'roarWin',
    special: { name: '이레이저 캐논', color: '#7dff5c', core: '#e8ffd0', motion: 'palm', type: 'orb' },
    ultimate: { name: '기간틱 미티어', color: '#9dff4a', core: '#ffffff', motion: 'twinOrb', type: 'orb' },
    quotes: { win: '카카로트... 아직 부족해!', pick: '전부 부숴주마.' }
  },
  {
    id: 'cooler',
    name: '쿠우라',
    title: '프리저의 형',
    hp: 940, speed: 4.05, jump: 18.2, power: 1.02, defense: 0.95, weight: 0.92,
    hairStyle: 'cooler',
    style: 'cooler',
    props: { tail: true, gems: true, spikes: true, mask: true },
    colors: {
      gi: '#9c4a9e', giDark: '#67276c',              // 보라 몸통
      trim: '#e2e6ee', trimDark: '#a7afbd',          // 흰 갑주
      pants: '#9c4a9e', pantsDark: '#67276c',
      sleeve: '#9c4a9e', sleeveDark: '#67276c',
      forearm: '#9c4a9e', forearmDark: '#67276c',
      glove: '#a852aa', gloveDark: '#6f2c74',
      boot: '#e2e6ee', bootDark: '#a7afbd',          // 흰 발 갑주
      skin: '#a852aa', skinDark: '#6f2c74',
      tail: '#9c4a9e', tailDark: '#67276c',
      hair: '#e2e6ee', hairLit: '#ffffff',           // 흰 가면과 뿔
      gem: '#2f7fd8', gemDark: '#194a8c', gemLit: '#93cbff',
      aura: '#b06bff', eye: '#e8324f'
    },
    entrance: 'dive', victory: 'brush',
    special: { name: '데스 비머', color: '#7f5cff', core: '#e0d6ff', motion: 'point' },
    ultimate: { name: '슈퍼노바', color: '#ff7b3d', core: '#ffe6a8', motion: 'orb', type: 'orb' },
    quotes: { win: '프리저보다 못한 놈이었군.', pick: '내 앞에 선 걸 후회하게 될 거다.' }
  },
  {
    id: 'gohan2',
    name: '초2 오반',
    title: '분노가 깨운 잠재능력',
    hp: 1040, speed: 3.80, jump: 17.4, power: 1.24, defense: 1.00, weight: 1.00,
    hairStyle: 'gohan2',
    style: 'fury',
    colors: {
      gi: '#5f4a9c', giDark: '#3a2c66', trim: '#e8e2d0', trimDark: '#b5ad96',  // 보라 도복 + 흰 띠
      sleeve: '#5f4a9c', sleeveDark: '#3a2c66',
      forearm: '#5f4a9c', forearmDark: '#3a2c66',
      band: '#eceadd', bandDark: '#b7b3a3',        // 흰 손목 보호대
      pants: '#5f4a9c', pantsDark: '#3a2c66',
      belt: '#e8e2d0', beltDark: '#b5ad96',
      boot: '#c9862f', bootDark: '#8a5312',        // 황갈색 부츠
      skin: '#f5c79b', skinDark: '#d69f70',
      hair: '#ffd93d', hairLit: '#fff3a0',          // 이미 금발
      aura: '#ffe066', iris: '#3fd07a', eye: '#2b2b2b'
    },
    entrance: 'furyRise', victory: 'sideGlance',
    special: { name: '마섬광', color: '#ffd45c', core: '#fff6d2', motion: 'overhead' },
    ultimate: { name: '부자 카메하메하', color: '#8ef0ff', core: '#ffffff', motion: 'onehand' },
    quotes: { win: '더는... 아무도 다치게 두지 않아.', pick: '봐주지 않을 거야.' }
  },
  {
    id: 'goku2',
    name: '초2 오공',
    title: '초사이어인 2',
    hp: 1040, speed: 3.80, jump: 17.6, power: 1.18, defense: 1.02, weight: 1.00,
    hairStyle: 'goku2',
    style: 'fierce',
    colors: {
      gi: '#e8681a', giDark: '#a53f07', trim: '#1e4fd8', trimDark: '#12328f',
      forearm: '#f5c79b', forearmDark: '#d69f70',   // 반팔 도복
      band: '#2a5be0', bandDark: '#16337f',
      belt: '#1e4fd8', beltDark: '#12328f',
      boot: '#1b3ea8', bootDark: '#0f2468',
      skin: '#f5c79b', skinDark: '#d69f70',
      hair: '#ffdf3d', hairLit: '#fff8b8',
      aura: '#ffe066', iris: '#3fd07a', eye: '#2b2b2b'
    },
    entrance: 'kiLand', victory: 'thumbUp',
    form: {
      name: '초사이어인 3', saiyan: true, hairStyle: 'goku3', noBrow: true,
      hair: '#ffe24a', hairLit: '#fffbcf', eye: '#3fd07a', aura: '#ffe98a'
    },
    special: { name: '에네르기파', color: '#7fd8ff', core: '#ffffff', motion: 'cupped' },
    ultimate: { name: '순간이동 에네르기파', color: '#8ef0ff', core: '#ffffff', motion: 'cupped' },
    quotes: { win: '아직 더 위가 있어. 나도, 너도.', pick: '전력으로 간다!' }
  },
  {
    id: 'vegeta2',
    name: '초2 베지터',
    title: '꺾이지 않는 자존심',
    hp: 1000, speed: 3.85, jump: 17.6, power: 1.22, defense: 0.98, weight: 0.98,
    hairStyle: 'vegeta2',
    style: 'pride',
    colors: {
      gi: '#26356e', giDark: '#141d43', trim: '#eef1f7', trimDark: '#c2c8d8',  // 푸른 전투복
      sleeve: '#2b3b78', sleeveDark: '#161f4a',
      forearm: '#2b3b78', forearmDark: '#161f4a',
      glove: '#f4f6fb', gloveDark: '#c3c9da',       // 흰 장갑
      pants: '#26356e', pantsDark: '#141d43',
      belt: '#2b3b78', beltDark: '#161f4a',
      boot: '#f4f6fb', bootDark: '#c3c9da',
      bootTip: '#f0c73a',                            // 금빛 앞코
      skin: '#f5c79b', skinDark: '#d69f70',
      hair: '#ffd93d', hairLit: '#fff3a0',
      aura: '#ffdf4d', iris: '#3fd07a', eye: '#2b2b2b'
    },
    entrance: 'flare', victory: 'pointDown',
    form: {
      name: '마인 베지터', saiyan: true, majin: true,
      hair: '#ffd93d', hairLit: '#fff3a0', eye: '#e8434f', aura: '#ff4d5e'
    },
    special: { name: '갤릭포', color: '#c47bff', core: '#ffe9ff', motion: 'onehand' },
    ultimate: { name: '파이널 플래시', color: '#ffe14d', core: '#ffffff', motion: 'flash' },
    quotes: { win: '이 몸을 넘어설 자는 없다.', pick: '내 자존심을 시험하겠다고?' }
  },
  {
    id: 'vegito',
    name: '베지트',
    title: '포타라가 낳은 완성형',
    hp: 1080, speed: 3.95, jump: 17.8, power: 1.28, defense: 1.06, weight: 1.02,
    hairStyle: 'vegito',
    style: 'fusion',
    props: { earring: true },
    colors: {
      gi: '#2b4bb8', giDark: '#182f7a', trim: '#f08c2a', trimDark: '#ab5a12',  // 푸른 도복 + 주황 속옷
      sleeve: '#2b4bb8', sleeveDark: '#182f7a',
      forearm: '#2b4bb8', forearmDark: '#182f7a',
      glove: '#f4f6fb', gloveDark: '#c3c9da',       // 흰 장갑
      pants: '#2b4bb8', pantsDark: '#182f7a',
      belt: '#1f3894', beltDark: '#0f2166',
      boot: '#f4f6fb', bootDark: '#c3c9da',
      bootTip: '#f0c73a',
      skin: '#f5c79b', skinDark: '#d69f70',
      hair: '#181818', hairLit: '#42384f',          // 검은 융합 머리
      earring: '#f2c53d',                            // 포타라
      kiBlade: '#ffe14d', kiBladeCore: '#fffbe0',   // 스피릿 소드의 칼날
      aura: '#7fd8ff', eye: '#2b2b2b'
    },
    entrance: 'glove', victory: 'potaraTouch',
    form: {
      name: '초 베지트', saiyan: true,
      hair: '#ffdf3d', hairLit: '#fff8b8', eye: '#3fd07a', aura: '#ffe066'
    },
    special: { name: '파이널 카메하메하', color: '#8ecdff', core: '#ffffff', motion: 'cupped' },
    ultimate: { name: '스피릿 소드', color: '#ffe14d', core: '#fffbe0', motion: 'swordUp', type: 'sword' },
    quotes: { win: '둘이 하나가 된 힘, 실감했나?', pick: '금방 끝내주지.' }
  },
  {
    id: 'gogeta',
    name: '초오지터',
    title: '융합이 도달한 정점',
    hp: 1140, speed: 3.90, jump: 17.6, power: 1.34, defense: 1.10, weight: 1.08,
    hairStyle: 'gogeta',
    style: 'gogeta',
    bulk: 1.10,
    props: { fusionVest: true },
    colors: {
      gi: '#f5c79b', giDark: '#d09a6a',             // 드러난 상체
      trim: '#2f4fc8', trimDark: '#1a2f88',
      vest: '#242c3d', vestPad: '#e0602a', vestTrim: '#e6e9f2',   // 검은 조끼 + 주황 어깨판
      sleeve: '#f5c79b', sleeveDark: '#d09a6a',
      forearm: '#f5c79b', forearmDark: '#d09a6a',
      band: '#20222e', bandDark: '#0e0f16',         // 검은 손목 보호대
      pants: '#dcd8c8', pantsDark: '#a5a08e',       // 회백색 통바지
      belt: '#2f4fc8', beltDark: '#1a2f88',         // 파란 허리띠
      boot: '#252a3a', bootDark: '#12151f',
      skin: '#f5c79b', skinDark: '#d09a6a',
      hair: '#ffdf3d', hairLit: '#fff8b8',
      aura: '#ffe98a', iris: '#3fd07a', eye: '#2b2b2b'
    },
    entrance: 'fusionPose', victory: 'crossOut',
    special: { name: '스타더스트 브레이커', color: '#ffd45c', core: '#ffffff', motion: 'palm', type: 'orb' },
    ultimate: { name: '빅뱅 카메하메하', color: '#8ef0ff', core: '#ffffff', motion: 'flash' },
    quotes: { win: '둘의 힘이 겹치면 이 정도다.', pick: '오래 걸리지 않을 거다.' }
  },
  {
    id: 'buu',
    name: '키드 부우',
    title: '가장 순수한 마인',
    hp: 900, speed: 4.15, jump: 18.4, power: 1.30, defense: 0.86, weight: 0.86,
    hairStyle: 'buu',
    style: 'majin',
    scale: 0.94,                                   // 오공보다 한 뼘 작다
    headScale: 1.06,
    noBrow: true, nose: 'holes', mouth: 'wide', eyeShape: 'slit',   // 눈썹도 콧대도 없는 사나운 얼굴
    props: { majinBelt: true },
    colors: {
      gi: '#e87fb0', giDark: '#b7548a',             // 드러난 분홍 상체
      trim: '#1e1c26', trimDark: '#0e0d14',
      sleeve: '#e87fb0', sleeveDark: '#b7548a',     // 어깨는 맨살
      forearm: '#20202b', forearmDark: '#0e0e16',   // 검은 아래팔 보호대
      band: '#e8c33a', bandDark: '#a8831a',         // 금색 손목 고리
      glove: '#e87fb0', gloveDark: '#b7548a',       // 맨손
      pants: '#eceadd', pantsDark: '#b0ad9e',       // 흰 통바지
      belt: '#20202b', beltDark: '#0e0e16',
      buckle: '#e8c33a',                             // 금색 M 버클
      boot: '#4fa05a', bootDark: '#2c6634',         // 초록 부츠
      skin: '#e87fb0', skinDark: '#b7548a',
      tentacle: '#e87fb0',                           // 정수리 촉수
      hair: '#e87fb0', hairLit: '#f6b0d0',
      aura: '#ff7bd0', iris: '#e8324f', eye: '#2b2b2b'
    },
    entrance: 'cackle', victory: 'twitch',
    special: { name: '증발탄', color: '#ff7bd0', core: '#ffd9f0', motion: 'orb', type: 'orb' },
    ultimate: { name: '인간 절멸 공격', color: '#ff5cc0', core: '#ffe6f6', motion: 'wave' },
    quotes: { win: '키히히히히! 부우, 전부 부쉈다!', pick: '부우우... 부순다!' }
  },
  {
    id: 'gotenks',
    name: '오천크스',
    title: '융합한 두 개구쟁이',
    hp: 940, speed: 4.00, jump: 18.6, power: 1.08, defense: 0.90, weight: 0.80,
    hairStyle: 'gotenks',
    style: 'trickster',
    scale: 0.82,                                   // 어린아이 체형
    headScale: 1.18,                               // 몸에 비해 머리가 크다
    props: { fusionVest: true },
    colors: {
      gi: '#f5c79b', giDark: '#d09a6a',
      trim: '#f0c93a', trimDark: '#a8871a',
      vest: '#20544c', vestPad: '#e8c33a',          // 짙은 청록 조끼 + 금색 어깨판
      vestTrim: '#e8e2c8', vestInner: '#f0c93a',    // 안에 받쳐 입은 노란 셔츠
      sleeve: '#f5c79b', sleeveDark: '#d09a6a',
      forearm: '#f5c79b', forearmDark: '#d09a6a',
      band: '#1d1f28', bandDark: '#0b0c12',         // 검은 손목 보호대
      glove: '#f5c79b', gloveDark: '#d09a6a',
      pants: '#eceadd', pantsDark: '#b0ad9e',       // 흰 통바지
      belt: '#2f6bd8', beltDark: '#1a4090',         // 파란 허리띠
      boot: '#1d1f28', bootDark: '#0b0c12',         // 검은 신발
      skin: '#f5c79b', skinDark: '#d09a6a',
      hair: '#171717', hairLit: '#3d3d3d',          // 오천의 검은 머리
      hairAlt: '#b79ae0', hairAltLit: '#ddcaf6',    // 트랭크스의 연보라 갈래
      aura: '#8ef0ff', eye: '#2b2b2b'
    },
    entrance: 'boast', victory: 'vSign',
    form: {
      name: '초사이어인 3', saiyan: true, hairStyle: 'gotenks3', noBrow: true,
      hair: '#ffd93d', hairLit: '#fff3a0', eye: '#3fd07a', aura: '#ffe98a'
    },
    special: { name: '갤릭 도넛', color: '#c47bff', core: '#ffe9ff', motion: 'weave' },
    ultimate: { name: '초 고스트 카미카제 어택', color: '#8ef0ff', core: '#ffffff', motion: 'ghost', type: 'orb' },
    quotes: { win: '어때! 오천크스님의 실력, 봤지?', pick: '자, 놀아줄게!' }
  },
  {
    id: 'android17',
    name: '인조인간 17호',
    title: '무한 동력의 인조인간',
    hp: 1000, speed: 3.95, jump: 17.6, power: 1.10, defense: 1.02, weight: 0.98,
    kiRegen: 0.055,                                // 동력이 무한이라 기가 저절로 찬다
    hairStyle: 'a17',
    style: 'cyborg',
    props: { scarf: true, rrLogo: true, legWarmer: true },
    colors: {
      gi: '#26262e', giDark: '#121218',             // 검은 티셔츠
      trim: '#f0f0ea', trimDark: '#c6c4bc',
      sleeve: '#f2f0ea', sleeveDark: '#c4c1b8',     // 안에 받쳐 입은 흰 긴팔
      forearm: '#f2f0ea', forearmDark: '#c4c1b8',
      glove: '#f5c79b', gloveDark: '#d69f70',       // 맨손
      pants: '#4d6fa8', pantsDark: '#2e4874',       // 청바지
      belt: '#8a6a3c', beltDark: '#57411f',         // 갈색 벨트
      boot: '#2b2b33', bootDark: '#121218',
      legWarmer: '#7fc44a',                          // 초록 각반
      scarf: '#f08c2a',                              // 주황 스카프
      logo: '#d8323c',                               // 레드리본 마크
      skin: '#f5c79b', skinDark: '#d69f70',
      hair: '#141418', hairLit: '#3a3a44',
      aura: '#7fe0ff', iris: '#4d8fd8', eye: '#2b2b2b'
    },
    entrance: 'stroll', victory: 'bored',
    special: { name: '파워 블리츠', color: '#7fe0ff', core: '#eaffff', motion: 'palm', type: 'orb' },
    ultimate: { name: '포톤 플래시', color: '#8affc0', core: '#ffffff', motion: 'wave' },
    quotes: { win: '이 정도로 끝이야? 시시하군.', pick: '재밌게 놀아보자고.' }
  },
  {
    id: 'android18',
    name: '인조인간 18호',
    title: '무한 동력의 인조인간',
    hp: 980, speed: 4.05, jump: 17.8, power: 1.06, defense: 1.00, weight: 0.92,
    kiRegen: 0.055,
    hairStyle: 'a18',
    style: 'blitz',
    props: { stripes: true, skirt: true },
    colors: {
      gi: '#2f5fb8', giDark: '#1b3b78',             // 데님 조끼
      trim: '#1d1d24', trimDark: '#0c0c11',         // 검은 상의
      sleeve: '#eef2f8', sleeveDark: '#c0c8d6',     // 흰 줄무늬 소매
      forearm: '#eef2f8', forearmDark: '#c0c8d6',
      stripe: '#7fb3e8',                             // 소매의 파란 줄
      glove: '#f5c79b', gloveDark: '#d69f70',
      pants: '#1d1d24', pantsDark: '#0c0c11',       // 검은 레깅스
      skirt: '#2f5fb8',                              // 데님 치마
      belt: '#8a6a3c', beltDark: '#57411f',
      boot: '#2b2b33', bootDark: '#121218',
      skin: '#f5c79b', skinDark: '#d69f70',
      hair: '#f0d05c', hairLit: '#fff0a8',          // 금발 단발
      aura: '#7fd8ff', iris: '#4d8fd8', eye: '#2b2b2b'
    },
    entrance: 'flick', victory: 'hairFlip',
    special: { name: '인피니티 불릿', color: '#8ecdff', core: '#ffffff', motion: 'onehand' },
    ultimate: { name: '파워 블리츠', color: '#7fe0ff', core: '#eaffff', motion: 'orb', type: 'orb' },
    quotes: { win: '이런 걸로 시간 낭비하게 하지 마.', pick: '빨리 끝내자.' }
  },
  {
    id: 'janemba',
    name: '쟈넨바',
    title: '악의가 뭉쳐 태어난 마인',
    hp: 1140, speed: 3.50, jump: 16.8, power: 1.30, defense: 1.08, weight: 1.18,
    hairStyle: 'janemba',
    style: 'demonBlade',
    bulk: 1.08,
    props: { tail: true, kiSword: true, wraps: true },
    colors: {
      gi: '#a05fd0', giDark: '#6a3496',             // 보라 상체
      trim: '#5b45c8', trimDark: '#33218a',         // 청보라 가슴 갑주
      sleeve: '#d8562c', sleeveDark: '#9c3315',     // 붉은 어깨 갑주
      forearm: '#d8562c', forearmDark: '#9c3315',
      glove: '#e0603a', gloveDark: '#a03818',       // 붉은 손
      pants: '#c88ce8', pantsDark: '#9558c0',       // 연보라 다리
      belt: '#5b45c8', beltDark: '#33218a',
      boot: '#a05fd0', bootDark: '#6a3496',         // 보라 뾰족 부츠
      wrap: '#f2ecdc',                               // 팔다리를 감은 흰 붕대
      skin: '#c88ce8', skinDark: '#9558c0',
      tail: '#e2482a', tailDark: '#a02d16',          // 붉은 꼬리
      hair: '#c88ce8', hairLit: '#eec6ff',           // 머리의 뿔 지느러미
      kiBlade: '#ff3b3b', kiBladeCore: '#ffd8d0',   // 붉은 기의 검
      aura: '#ff4d5e', iris: '#ffd83d', eye: '#2b1a2e'
    },
    entrance: 'rift', victory: 'bladeRest',
    special: { name: '블러디 소스', color: '#ff3b3b', core: '#ffe0d8', motion: 'blade' },
    ultimate: { name: '환영 분쇄', color: '#ff4d3b', core: '#ffe8c0', motion: 'swordUp', type: 'sword' },
    quotes: { win: '쟈넨...바.', pick: '쟈넨... 쟈넨바!' }
  }
];

const CHAR_BY_ID = {};
CHARACTERS.forEach(c => { CHAR_BY_ID[c.id] = c; });
