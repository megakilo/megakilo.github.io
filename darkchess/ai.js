'use strict';

// Banqi AI — expectiminimax over imperfect information.
// Face-down pieces are never inspected: flips are chance nodes averaged over
// the pool of unrevealed pieces (everything not face-up and not captured),
// so the AI plays with exactly the information a human would have.
(function (global) {
  const B = (typeof module !== 'undefined' && module.exports)
    ? require('./engine.js')
    : global.Banqi;

  // Indexed by rank: Soldier, Cannon, Horse, Chariot, Elephant, Advisor, General.
  const VALUES = [2, 7, 3, 4, 5.5, 8, 11];
  const WIN = 10000;
  const HIDDEN_DISCOUNT = 0.9;
  const MOBILITY_WEIGHT = 0.04;

  function computePool(state) {
    const pool = { r: B.RANK_COUNTS.slice(), b: B.RANK_COUNTS.slice() };
    for (const p of state.board) if (p && p.faceUp) pool[p.color][p.rank]--;
    for (const c of ['r', 'b']) for (const rank of state.captured[c]) pool[c][rank]--;
    return pool;
  }

  // Count moves + captures (weighted) available to `color`; flips excluded
  // since both sides always share them.
  function countMoves(state, color) {
    const b = state.board;
    let n = 0;
    for (let i = 0; i < B.CELLS; i++) {
      const p = b[i];
      if (!p || !p.faceUp || p.color !== color) continue;
      const r = (i / B.COLS) | 0, c = i % B.COLS;
      for (const [dr, dc] of B.DIRS) {
        const rr = r + dr, cc = c + dc;
        if (rr < 0 || rr >= B.ROWS || cc < 0 || cc >= B.COLS) continue;
        const q = b[rr * B.COLS + cc];
        if (!q) n += 1;
        else if (q.faceUp && q.color !== color && B.canCapture(p, q)) n += 2;
      }
      if (p.rank === B.RANK.CANNON) {
        for (const [dr, dc] of B.DIRS) {
          let rr = r + dr, cc = c + dc, screened = false;
          while (rr >= 0 && rr < B.ROWS && cc >= 0 && cc < B.COLS) {
            const q = b[rr * B.COLS + cc];
            if (q) {
              if (!screened) screened = true;
              else {
                if (q.faceUp && q.color !== color) n += 2;
                break;
              }
            }
            rr += dr; cc += dc;
          }
        }
      }
    }
    return n;
  }

  function evaluate(state, pool, me) {
    const myColor = state.colors[me];
    if (!myColor) return 0;
    const oppColor = B.otherColor(myColor);
    let score = 0;
    for (const p of state.board) {
      if (p && p.faceUp) score += p.color === myColor ? VALUES[p.rank] : -VALUES[p.rank];
    }
    for (let rank = 0; rank < 7; rank++) {
      score += (pool[myColor][rank] - pool[oppColor][rank]) * VALUES[rank] * HIDDEN_DISCOUNT;
    }
    score += MOBILITY_WEIGHT * (countMoves(state, myColor) - countMoves(state, oppColor));
    return score;
  }

  function appliedMove(state, move) {
    const s = B.cloneState(state);
    if (move.type === 'capture') s.quietPlies = 0; else s.quietPlies++;
    s.board[move.to] = s.board[move.from];
    s.board[move.from] = null;
    B.updateChase(s, move);
    s.turn = 1 - s.turn;
    return s;
  }

  function appliedFlip(state, index, rank, color) {
    const s = B.cloneState(state);
    s.board[index] = { rank, color, faceUp: true };
    s.quietPlies = 0;
    B.updateChase(s, { type: 'flip', index });
    s.turn = 1 - s.turn;
    return s;
  }

  function orderMoves(state, moves) {
    const b = state.board;
    const key = m => {
      if (m.type === 'capture') return 100 + VALUES[b[m.to].rank];
      if (m.type === 'move') return 10;
      return 0;
    };
    return moves.slice().sort((x, y) => key(y) - key(x));
  }

  // Value of `move` played from `state`, searching `depth` further plies.
  function moveValue(state, move, pool, depth, alpha, beta, me) {
    if (move.type !== 'flip') {
      return search(appliedMove(state, move), pool, depth, alpha, beta, me);
    }
    // Chance node: average over every piece the flipped one could be.
    let total = 0;
    for (const c of ['r', 'b']) for (let r = 0; r < 7; r++) total += pool[c][r];
    if (total === 0) return evaluate(state, pool, me); // shouldn't happen
    let ev = 0;
    for (const color of ['r', 'b']) {
      for (let rank = 0; rank < 7; rank++) {
        const count = pool[color][rank];
        if (!count) continue;
        const outcome = appliedFlip(state, move.index, rank, color);
        pool[color][rank]--;
        const v = depth <= 1
          ? evaluate(outcome, pool, me)
          : search(outcome, pool, depth - 2, -Infinity, Infinity, me);
        pool[color][rank]++;
        ev += (count / total) * v;
      }
    }
    return ev;
  }

  function search(state, pool, depth, alpha, beta, me) {
    if (state.quietPlies >= B.QUIET_PLY_LIMIT) return 0;
    const moves = B.getLegalMoves(state);
    if (moves.length === 0) {
      return state.turn === me ? -(WIN + depth) : WIN + depth;
    }
    if (depth <= 0) return evaluate(state, pool, me);
    const maximizing = state.turn === me;
    let best = maximizing ? -Infinity : Infinity;
    for (const m of orderMoves(state, moves)) {
      const v = moveValue(state, m, pool, depth - 1, alpha, beta, me);
      if (maximizing) {
        if (v > best) best = v;
        if (best > alpha) alpha = best;
      } else {
        if (v < best) best = v;
        if (best < beta) beta = best;
      }
      if (alpha >= beta) break;
    }
    return best;
  }

  function chooseMove(state, opts = {}) {
    const depth = opts.depth ?? 4;
    const rng = opts.rng ?? Math.random;
    const moves = B.getLegalMoves(state);
    if (moves.length === 0) return null;
    if (state.colors[0] === null) {
      // Opening flip: nothing is known yet, pick any face-down piece.
      return moves[Math.floor(rng() * moves.length)];
    }
    if (moves.length === 1) return moves[0];
    const me = state.turn;
    const pool = computePool(state);
    let bestMoves = [], bestVal = -Infinity;
    let alpha = -Infinity;
    for (const m of orderMoves(state, moves)) {
      const v = moveValue(state, m, pool, depth - 1, alpha, Infinity, me);
      if (v > bestVal + 1e-9) {
        bestVal = v;
        bestMoves = [m];
        if (v > alpha) alpha = v;
      } else if (v > bestVal - 1e-9) {
        bestMoves.push(m);
      }
    }
    return bestMoves[Math.floor(rng() * bestMoves.length)];
  }

  const BanqiAI = { chooseMove, evaluate, computePool, VALUES };
  if (typeof module !== 'undefined' && module.exports) module.exports = BanqiAI;
  global.BanqiAI = BanqiAI;
})(typeof window !== 'undefined' ? window : globalThis);
