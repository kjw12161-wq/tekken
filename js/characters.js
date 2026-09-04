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
      skin: '#f5c79b', skinDark: '#d69f70', hair: '#161616', hairLit: '#3d3d3d',
      aura: '#ffd24a', eye: '#2b2b2b'
    },
    special: { name: '에네르기파', color: '#7fd8ff', core: '#ffffff' },
    ultimate: { name: '초 에네르기파', color: '#8ef0ff', core: '#ffffff' },
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
      skin: '#f5c79b', skinDark: '#d69f70', hair: '#1d1408', hairLit: '#4a331a',
      aura: '#ff5ec7', eye: '#2b2b2b'
    },
    special: { name: '갤릭포', color: '#c47bff', core: '#ffe9ff' },
    ultimate: { name: '파이널 플래시', color: '#ffe14d', core: '#ffffff' },
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
    special: { name: '마관광살포', color: '#ffe066', core: '#fff6c9' },
    ultimate: { name: '초 폭렬마파', color: '#ff9d3d', core: '#fff0c9' },
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
    special: { name: '데스 빔', color: '#ff4d7a', core: '#ffd6e2' },
    ultimate: { name: '데스 볼', color: '#ff7b3d', core: '#ffe0b0' },
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
    special: { name: '카메하메파', color: '#8affc0', core: '#eaffef' },
    ultimate: { name: '솔라 카메하메하', color: '#c9ff5c', core: '#ffffff' },
    quotes: { win: '완전한 힘 앞에 무릎 꿇어라.', pick: '실험은 끝났다.' }
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
    special: { name: '버닝 어택', color: '#ffb35c', core: '#fff0d0' },
    ultimate: { name: '히트 돔 어택', color: '#ffd93d', core: '#ffffff' },
    quotes: { win: '미래는 내가 바꾼다.', pick: '봐주지 않겠어.' }
  }
];

const CHAR_BY_ID = {};
CHARACTERS.forEach(c => { CHAR_BY_ID[c.id] = c; });
