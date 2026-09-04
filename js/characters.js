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
    colors: {
      gi: '#e9edf5', giDark: '#b9c1d2', trim: '#7b3fbf', trimDark: '#4d2378',
      skin: '#f2f4fa', skinDark: '#c3c9da', hair: '#7b3fbf', hairLit: '#a468e6',
      aura: '#b06bff', eye: '#e0345c'
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
    colors: {
      gi: '#2f8f5b', giDark: '#1c5c39', trim: '#1c1c1c', trimDark: '#0d0d0d',
      skin: '#7fd39a', skinDark: '#4e9d69', hair: '#1f6b45', hairLit: '#39a06a',
      aura: '#7dff9e', eye: '#e8b23a'
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
    colors: {
      gi: '#3a4a8f', giDark: '#232e5c', trim: '#f0c95a', trimDark: '#c19b2c',
      skin: '#f5c79b', skinDark: '#d69f70', hair: '#b48ce0', hairLit: '#d9bcff',
      aura: '#7fe6ff', eye: '#2b6bd8'
    },
    entrance: 'sword', victory: 'shoulder',
    form: { name: '초사이어인', saiyan: true, hair: '#ffe14d', hairLit: '#fff8bd', eye: '#3fd07a', aura: '#ffe98a' },
    special: { name: '버닝 어택', color: '#ffb35c', core: '#fff0d0', motion: 'weave' },
    ultimate: { name: '히트 돔 어택', color: '#ffd93d', core: '#ffffff', motion: 'orb' },
    quotes: { win: '미래는 내가 바꾼다.', pick: '봐주지 않겠어.' }
  }
];

const CHAR_BY_ID = {};
CHARACTERS.forEach(c => { CHAR_BY_ID[c.id] = c; });
