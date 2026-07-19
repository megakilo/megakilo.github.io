'use strict';

(() => {
  const B = Banqi;
  const boardEl = document.getElementById('board');
  const statusEl = document.getElementById('status');
  const trayTop = document.getElementById('tray-top');
  const trayBottom = document.getElementById('tray-bottom');
  const newGameBtn = document.getElementById('new-game-btn');
  const modeBtn = document.getElementById('mode-btn');
  const modePicker = document.getElementById('mode-picker');

  const AI_PLAYER = 1; // the human always moves first
  const AI_DELAY_MS = 400;

  let state = null;
  let mode = 'pvp';      // 'pvp' | 'ai'
  let aiDepth = 2;
  let aiThinking = false;
  let aiTimer = null;
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

  function playerName(idx) {
    if (mode === 'ai') return idx === AI_PLAYER ? 'Computer' : 'You';
    return `Player ${idx + 1}`;
  }

  function colorLabel(idx) {
    const c = state.colors[idx];
    return c ? ` (${B.COLOR_NAMES[c]})` : '';
  }

  function statusText() {
    if (state.result) {
      if (state.result.winner === null) return `Draw — ${state.result.reason}.`;
      const w = state.result.winner;
      const verb = playerName(w) === 'You' ? 'win' : 'wins';
      return `${playerName(w)}${colorLabel(w)} ${verb} — opponent has ${state.result.reason}!`;
    }
    if (mode === 'ai' && state.turn === AI_PLAYER) return 'Computer is thinking…';
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
    const humansTurn = !(mode === 'ai' && state.turn === AI_PLAYER);
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
      if (!state.result && humansTurn
        && (tm || (p && (!p.faceUp || p.color === myColor)))) {
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
    if (!state || state.result || aiThinking) return;
    if (mode === 'ai' && state.turn === AI_PLAYER) return;
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
    maybeAITurn();
  }

  function maybeAITurn() {
    if (mode !== 'ai' || state.result || state.turn !== AI_PLAYER) return;
    aiThinking = true;
    const s = state;
    aiTimer = setTimeout(() => {
      if (state !== s) return; // a new game was started meanwhile
      const m = BanqiAI.chooseMove(state, { depth: aiDepth });
      aiThinking = false;
      if (m) doMove(m);
    }, AI_DELAY_MS);
  }

  function newGame() {
    clearTimeout(aiTimer);
    aiThinking = false;
    state = B.createGame();
    selected = null;
    lastMove = null;
    legalMoves = B.getLegalMoves(state);
    render();
  }

  newGameBtn.addEventListener('click', newGame);
  modeBtn.addEventListener('click', () => modePicker.classList.remove('hidden'));
  for (const btn of modePicker.querySelectorAll('button[data-mode]')) {
    btn.addEventListener('click', () => {
      const m = btn.dataset.mode;
      mode = m === 'pvp' ? 'pvp' : 'ai';
      aiDepth = m === 'ai-hard' ? 5 : 2;
      modePicker.classList.add('hidden');
      newGame();
    });
  }

  newGame();
})();
