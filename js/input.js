/* =========================================================
 *  입력 관리 : 키보드 + 터치 가상패드
 * ========================================================= */
'use strict';

const DEFAULT_MAPS = [
  { // 1P
    left: ['KeyA'], right: ['KeyD'], up: ['KeyW'], down: ['KeyS'],
    light: ['KeyJ'], heavy: ['KeyK'], kick: ['KeyL'],
    blast: ['KeyU'], ultimate: ['KeyI'], guard: ['KeyH'], charge: ['Space'],
    transform: ['KeyO']
  },
  { // 2P
    left: ['ArrowLeft'], right: ['ArrowRight'], up: ['ArrowUp'], down: ['ArrowDown'],
    light: ['Numpad1', 'Digit1'], heavy: ['Numpad2', 'Digit2'], kick: ['Numpad3', 'Digit3'],
    blast: ['Numpad4', 'Digit4'], ultimate: ['Numpad5', 'Digit5'],
    guard: ['Numpad6', 'Digit6'], charge: ['Numpad0', 'Digit0'],
    transform: ['Numpad7', 'Digit7']
  }
];

const Input = {
  down: new Set(),
  justPressed: new Set(),
  virtual: [new Set(), new Set()],   // 터치 패드용 (액션 이름 보관)
  virtualJust: [new Set(), new Set()],
  maps: DEFAULT_MAPS,
  anyKeyPressed: false,

  init() {
    window.addEventListener('keydown', e => {
      if (e.repeat) return;
      // 게임 조작키는 스크롤 등 기본 동작을 막는다
      if (this._isGameKey(e.code)) e.preventDefault();
      this.down.add(e.code);
      this.justPressed.add(e.code);
      this.anyKeyPressed = true;
      Sfx.resume();
    });
    window.addEventListener('keyup', e => {
      if (this._isGameKey(e.code)) e.preventDefault();
      this.down.delete(e.code);
    });
    window.addEventListener('blur', () => { this.down.clear(); });
    this._bindTouch();
  },

  _isGameKey(code) {
    return /^(Key[WASDJKLUIHO]|Arrow(Up|Down|Left|Right)|Space|Numpad\d|Digit[0-7])$/.test(code);
  },

  _bindTouch() {
    document.querySelectorAll('[data-touch]').forEach(btn => {
      const action = btn.dataset.touch;
      const p = Number(btn.dataset.player || 0);
      const press = e => {
        e.preventDefault();
        this.virtual[p].add(action);
        this.virtualJust[p].add(action);
        btn.classList.add('is-pressed');
        Sfx.resume();
      };
      const release = e => {
        e.preventDefault();
        this.virtual[p].delete(action);
        btn.classList.remove('is-pressed');
      };
      btn.addEventListener('touchstart', press, { passive: false });
      btn.addEventListener('touchend', release, { passive: false });
      btn.addEventListener('touchcancel', release, { passive: false });
      btn.addEventListener('mousedown', press);
      btn.addEventListener('mouseup', release);
      btn.addEventListener('mouseleave', release);
    });
  },

  held(player, action) {
    if (this.virtual[player] && this.virtual[player].has(action)) return true;
    const codes = this.maps[player][action] || [];
    return codes.some(c => this.down.has(c));
  },

  pressed(player, action) {
    if (this.virtualJust[player] && this.virtualJust[player].has(action)) return true;
    const codes = this.maps[player][action] || [];
    return codes.some(c => this.justPressed.has(c));
  },

  /** 프레임 종료 시 호출 - 눌림 엣지 초기화 */
  endFrame() {
    this.justPressed.clear();
    this.virtualJust[0].clear();
    this.virtualJust[1].clear();
    this.anyKeyPressed = false;
  }
};
