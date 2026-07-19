'use strict';

// Banqi (Dark Chess) game engine — pure logic, no DOM.
// Rules: Taiwanese variant (https://en.wikipedia.org/wiki/Banqi)
//  - 4x8 board, 32 shuffled face-down pieces.
//  - A turn is one of: flip a face-down piece, move a face-up piece one
//    square orthogonally to an empty square, or capture per the hierarchy.
//  - Hierarchy: General > Advisor > Elephant > Chariot > Horse > Cannon > Soldier,
//    a piece captures equal or lower rank, EXCEPT the General cannot capture
//    Soldiers and Soldiers can capture the General.
//  - Cannons capture only by jumping exactly one screen along a row/column,
//    and may capture any rank that way.
//  - The first flipped piece's color is assigned to the player who flipped it.
//  - A player with no legal move loses. 40 consecutive plies with no flip or
//    capture is a draw.
(function (global) {
  const ROWS = 4, COLS = 8, CELLS = ROWS * COLS;
  const RANK = { SOLDIER: 0, CANNON: 1, HORSE: 2, CHARIOT: 3, ELEPHANT: 4, ADVISOR: 5, GENERAL: 6 };
  const RANK_COUNTS = [5, 2, 2, 2, 2, 2, 1];
  const RANK_NAMES = ['Soldier', 'Cannon', 'Horse', 'Chariot', 'Elephant', 'Advisor', 'General'];
  const PIECE_CHARS = {
    r: ['兵', '炮', '傌', '俥', '相', '仕', '帥'],
    b: ['卒', '砲', '馬', '車', '象', '士', '將'],
  };
  const COLOR_NAMES = { r: 'Red', b: 'Black' };
  const DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  const QUIET_PLY_LIMIT = 40;

  function otherColor(c) { return c === 'r' ? 'b' : 'r'; }

  function createGame(rng = Math.random) {
    const pieces = [];
    for (const color of ['r', 'b']) {
      for (let rank = 0; rank < 7; rank++) {
        for (let n = 0; n < RANK_COUNTS[rank]; n++) pieces.push({ rank, color, faceUp: false });
      }
    }
    for (let i = pieces.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [pieces[i], pieces[j]] = [pieces[j], pieces[i]];
    }
    return {
      board: pieces,          // 32 cells, row-major; null = empty
      turn: 0,                // player index 0 or 1; player 0 flips first
      colors: [null, null],   // color per player, set by the first flip
      captured: { r: [], b: [] }, // ranks of captured pieces, by piece color
      quietPlies: 0,
      result: null,           // { winner: 0|1|null, reason } once the game ends
    };
  }

  // Whether attacker `a` may capture defender `d` when adjacent.
  // Cannons never capture adjacently; their jump capture ignores rank.
  function canCapture(a, d) {
    if (a.rank === RANK.CANNON) return false;
    if (a.rank === RANK.GENERAL && d.rank === RANK.SOLDIER) return false;
    if (a.rank === RANK.SOLDIER && d.rank === RANK.GENERAL) return true;
    return a.rank >= d.rank;
  }

  function getLegalMoves(state) {
    if (state.result) return [];
    const moves = [];
    const b = state.board;
    const color = state.colors[state.turn];
    for (let i = 0; i < CELLS; i++) {
      const p = b[i];
      if (!p) continue;
      if (!p.faceUp) { moves.push({ type: 'flip', index: i }); continue; }
      if (!color || p.color !== color) continue;
      const r = (i / COLS) | 0, c = i % COLS;
      for (const [dr, dc] of DIRS) {
        const rr = r + dr, cc = c + dc;
        if (rr < 0 || rr >= ROWS || cc < 0 || cc >= COLS) continue;
        const j = rr * COLS + cc;
        const q = b[j];
        if (!q) moves.push({ type: 'move', from: i, to: j });
        else if (q.faceUp && q.color !== p.color && canCapture(p, q)) {
          moves.push({ type: 'capture', from: i, to: j });
        }
      }
      if (p.rank === RANK.CANNON) {
        for (const [dr, dc] of DIRS) {
          let rr = r + dr, cc = c + dc, screened = false;
          while (rr >= 0 && rr < ROWS && cc >= 0 && cc < COLS) {
            const j = rr * COLS + cc;
            const q = b[j];
            if (q) {
              if (!screened) { screened = true; }
              else {
                if (q.faceUp && q.color !== p.color) moves.push({ type: 'capture', from: i, to: j });
                break;
              }
            }
            rr += dr; cc += dc;
          }
        }
      }
    }
    return moves;
  }

  function applyMove(state, move) {
    const b = state.board;
    if (move.type === 'flip') {
      const p = b[move.index];
      p.faceUp = true;
      if (state.colors[0] === null) {
        state.colors[state.turn] = p.color;
        state.colors[1 - state.turn] = otherColor(p.color);
      }
      state.quietPlies = 0;
    } else {
      const p = b[move.from];
      if (move.type === 'capture') {
        const d = b[move.to];
        state.captured[d.color].push(d.rank);
        state.quietPlies = 0;
      } else {
        state.quietPlies++;
      }
      b[move.to] = p;
      b[move.from] = null;
    }
    state.turn = 1 - state.turn;
    if (getLegalMoves(state).length === 0) {
      state.result = { winner: 1 - state.turn, reason: 'no legal moves' };
    } else if (state.quietPlies >= QUIET_PLY_LIMIT) {
      state.result = { winner: null, reason: `${QUIET_PLY_LIMIT} moves without a flip or capture` };
    }
    return state;
  }

  function cloneState(state) {
    return {
      board: state.board.map(p => p && { rank: p.rank, color: p.color, faceUp: p.faceUp }),
      turn: state.turn,
      colors: state.colors.slice(),
      captured: { r: state.captured.r.slice(), b: state.captured.b.slice() },
      quietPlies: state.quietPlies,
      result: state.result,
    };
  }

  const Banqi = {
    ROWS, COLS, CELLS, RANK, RANK_COUNTS, RANK_NAMES, PIECE_CHARS, COLOR_NAMES,
    DIRS, QUIET_PLY_LIMIT,
    createGame, getLegalMoves, applyMove, canCapture, cloneState, otherColor,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = Banqi;
  global.Banqi = Banqi;
})(typeof window !== 'undefined' ? window : globalThis);
