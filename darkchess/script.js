'use strict';

(() => {
  const B = Banqi;
  const boardEl = document.getElementById('board');
  const statusEl = document.getElementById('status');
  const trayTop = document.getElementById('tray-top');
  const trayBottom = document.getElementById('tray-bottom');
  const newGameBtn = document.getElementById('new-game-btn');

  let state = null;
  let selected = null;   // index of the selected face-up piece
  let legalMoves = [];
  let lastMove = null;

  const cells = [];
  for (let i = 0; i < B.CELLS; i++) {
    const div = document.createElement('div');
    div.className = 'cell';
    div.addEventListener('click', () => onCellClick(i));
    boardEl.appendChild(div);
    cells.push(div);
  }

  function playerName(idx) { return `Player ${idx + 1}`; }

  function colorLabel(idx) {
    const c = state.colors[idx];
    return c ? ` (${B.COLOR_NAMES[c]})` : '';
  }

  function statusText() {
    if (state.result) {
      if (state.result.winner === null) return `Draw — ${state.result.reason}.`;
      const w = state.result.winner;
      return `${playerName(w)}${colorLabel(w)} wins — opponent has ${state.result.reason}!`;
    }
    if (state.colors[0] === null) {
      return `${playerName(state.turn)}: flip any piece — its color becomes yours`;
    }
    return `${playerName(state.turn)}${colorLabel(state.turn)} to move`;
  }

  function render() {
    const movesByTarget = new Map();
    if (selected !== null) {
      for (const m of legalMoves) {
        if (m.type !== 'flip' && m.from === selected) movesByTarget.set(m.to, m);
      }
    }
    const myColor = state.colors[state.turn];
    for (let i = 0; i < B.CELLS; i++) {
      const el = cells[i];
      const p = state.board[i];
      el.className = 'cell';
      el.innerHTML = '';
      if (p) {
        const d = document.createElement('div');
        if (p.faceUp) {
          d.className = `piece faceup ${p.color}`;
          d.textContent = B.PIECE_CHARS[p.color][p.rank];
        } else {
          d.className = 'piece facedown';
        }
        el.appendChild(d);
      }
      if (lastMove && (lastMove.type === 'flip'
        ? lastMove.index === i
        : lastMove.from === i || lastMove.to === i)) {
        el.classList.add('last');
      }
      if (i === selected) el.classList.add('sel');
      const tm = movesByTarget.get(i);
      if (tm) el.classList.add(tm.type === 'capture' ? 'capture-target' : 'target');
      if (!state.result && p && (!p.faceUp || tm || (p.faceUp && p.color === myColor))) {
        el.classList.add('clickable');
      } else if (tm) {
        el.classList.add('clickable');
      }
    }
    statusEl.textContent = statusText();
    fillTray(trayTop, 'b');
    fillTray(trayBottom, 'r');
  }

  function fillTray(el, color) {
    el.innerHTML = '';
    const list = state.captured[color];
    if (!list.length) return;
    const label = document.createElement('span');
    label.className = 'tray-label';
    label.textContent = `Captured ${B.COLOR_NAMES[color]}:`;
    el.appendChild(label);
    for (const rank of list) {
      const m = document.createElement('span');
      m.className = `mini ${color}`;
      m.textContent = B.PIECE_CHARS[color][rank];
      el.appendChild(m);
    }
  }

  function onCellClick(i) {
    if (!state || state.result) return;
    const p = state.board[i];
    if (p && !p.faceUp) { doMove({ type: 'flip', index: i }); return; }
    if (selected !== null) {
      const m = legalMoves.find(m => m.type !== 'flip' && m.from === selected && m.to === i);
      if (m) { doMove(m); return; }
    }
    const myColor = state.colors[state.turn];
    selected = (p && p.faceUp && p.color === myColor && i !== selected) ? i : null;
    render();
  }

  function doMove(m) {
    B.applyMove(state, m);
    lastMove = m;
    selected = null;
    legalMoves = B.getLegalMoves(state);
    render();
  }

  function newGame() {
    state = B.createGame();
    selected = null;
    lastMove = null;
    legalMoves = B.getLegalMoves(state);
    render();
  }

  newGameBtn.addEventListener('click', newGame);
  newGame();
})();
