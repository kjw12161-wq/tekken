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
    form: { name: '최종 형태', aura: '#ff7bd0' },
    special: { name: '데스 빔', color: '#ff4d7a', core: '#ffd6e2', motion: 'point' },
    ultimate: { name: '데스 볼', color: '#ff7b3d', core: '#ffe0b0', motion: 'orb' },
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
    form: { name: '완전체 각성', aura: '#c9ff5c' },
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
    form: { name: '초사이어인 2', saiyan: true, hair: '#ffe14d', hairLit: '#fff8bd', eye: '#3fd07a', aura: '#ffe98a' },
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
    form: { name: '전설의 초사이어인', saiyan: true, hair: '#e4f24f', hairLit: '#faffc4', eye: '#f2ffe0', aura: '#a6ff5c' },
    special: { name: '이레이저 캐논', color: '#7dff5c', core: '#e8ffd0', motion: 'palm' },
    ultimate: { name: '기간틱 미티어', color: '#9dff4a', core: '#ffffff', motion: 'twinOrb' },
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
    form: { name: '메탈 쿠우라', aura: '#7fe6ff' },
    special: { name: '데스 비머', color: '#7f5cff', core: '#e0d6ff', motion: 'point' },
    ultimate: { name: '슈퍼노바', color: '#ff7b3d', core: '#ffe6a8', motion: 'orb' },
    quotes: { win: '프리저보다 못한 놈이었군.', pick: '내 앞에 선 걸 후회하게 될 거다.' }
  }
];

const CHAR_BY_ID = {};
CHARACTERS.forEach(c => { CHAR_BY_ID[c.id] = c; });
