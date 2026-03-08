/* ==========================================================================
   Ultimate Tic-Tac-Toe — Web Version
   Pure vanilla JS · Canvas-rendered · GitHub-Pages-ready
   ========================================================================== */

"use strict";

/* ── Constants ──────────────────────────────────────────────────────────── */
const EMPTY = 0, X = 1, O = 2;

const LINES = [
  [[0,0],[0,1],[0,2]], [[1,0],[1,1],[1,2]], [[2,0],[2,1],[2,2]], // rows
  [[0,0],[1,0],[2,0]], [[0,1],[1,1],[2,1]], [[0,2],[1,2],[2,2]], // cols
  [[0,0],[1,1],[2,2]], [[0,2],[1,1],[2,0]],                      // diags
];

/* ── Colours (matching Pygame palette) ─────────────────────────────────── */
const COL = {
  bg:          "#181820",
  cellBg:      "#26263a",   // slightly lighter for cells vs board bg
  boardBg:     "#20202a",
  grid:        "#3c3c4b",
  metaGrid:    "#8c8ca0",
  xColor:      "#50a0ff",
  oColor:      "#ff5a78",
  xDim:        "#285082",
  oDim:        "#822d3c",
  activeOvr:   "rgba(255,220,80,0.16)",
  wonXOvr:     "rgba(80,160,255,0.22)",
  wonOOvr:     "rgba(255,90,120,0.22)",
  drawOvr:     "rgba(100,100,100,0.20)",
  hoverOvr:    "rgba(255,255,255,0.10)",
};

/* ── Layout ────────────────────────────────────────────────────────────── */
const BOARD_SIZE = 630;
const PADDING    = 35;
const META_GAP   = 6;
const CELL_GAP   = 2;
const CANVAS_W   = BOARD_SIZE + PADDING * 2;
const CANVAS_H   = BOARD_SIZE + PADDING * 2;

const SMALL_BOARD_SIZE = (BOARD_SIZE - META_GAP * 2) / 3;
const CELL_SIZE        = (SMALL_BOARD_SIZE - CELL_GAP * 2) / 3;

const AI_DELAY_MS = 350;

/* ==========================================================================
   Section 1 — Game Logic  (port of game.py)
   ========================================================================== */

function checkWinner(grid) {
  for (const line of LINES) {
    const a = grid[line[0][0]][line[0][1]];
    const b = grid[line[1][0]][line[1][1]];
    const c = grid[line[2][0]][line[2][1]];
    if (a !== EMPTY && a === b && b === c) return a;
  }
  return EMPTY;
}

class SmallBoard {
  constructor() {
    this.cells = [[0,0,0],[0,0,0],[0,0,0]];
    this.winner = EMPTY;
    this.moveCount = 0;
  }
  isFull()     { return this.moveCount >= 9; }
  isPlayable() { return this.winner === EMPTY && !this.isFull(); }
  place(r, c, player) {
    this.cells[r][c] = player;
    this.moveCount++;
    const w = checkWinner(this.cells);
    if (w !== EMPTY) this.winner = w;
  }
  clone() {
    const b = new SmallBoard();
    b.cells = this.cells.map(row => row.slice());
    b.winner = this.winner;
    b.moveCount = this.moveCount;
    return b;
  }
}

class UltimateBoard {
  constructor() {
    this.boards = [];
    for (let r = 0; r < 3; r++) {
      this.boards[r] = [];
      for (let c = 0; c < 3; c++) this.boards[r][c] = new SmallBoard();
    }
    this.activeBoard = null;   // null = free choice, else [br, bc]
    this.currentPlayer = X;
    this.metaWinner = EMPTY;
    this.gameOver = false;
    this.totalMoves = 0;
  }

  _metaGrid() {
    return this.boards.map(row => row.map(b => b.winner));
  }

  _checkMetaWinner() { return checkWinner(this._metaGrid()); }

  _allResolved() {
    for (let r = 0; r < 3; r++)
      for (let c = 0; c < 3; c++)
        if (this.boards[r][c].isPlayable()) return false;
    return true;
  }

  getValidMoves() {
    const moves = [];
    if (this.gameOver) return moves;

    if (this.activeBoard !== null) {
      const [br, bc] = this.activeBoard;
      const board = this.boards[br][bc];
      if (board.isPlayable()) {
        for (let cr = 0; cr < 3; cr++)
          for (let cc = 0; cc < 3; cc++)
            if (board.cells[cr][cc] === EMPTY) moves.push([br,bc,cr,cc]);
        return moves;
      }
    }

    // Free choice
    for (let br = 0; br < 3; br++)
      for (let bc = 0; bc < 3; bc++) {
        const board = this.boards[br][bc];
        if (board.isPlayable())
          for (let cr = 0; cr < 3; cr++)
            for (let cc = 0; cc < 3; cc++)
              if (board.cells[cr][cc] === EMPTY) moves.push([br,bc,cr,cc]);
      }
    return moves;
  }

  makeMove(br, bc, cr, cc) {
    if (this.gameOver) return false;
    const board = this.boards[br][bc];

    if (this.activeBoard !== null) {
      if (br !== this.activeBoard[0] || bc !== this.activeBoard[1]) return false;
    }
    if (!board.isPlayable()) return false;
    if (board.cells[cr][cc] !== EMPTY) return false;

    board.place(cr, cc, this.currentPlayer);
    this.totalMoves++;

    const mw = this._checkMetaWinner();
    if (mw !== EMPTY) { this.metaWinner = mw; this.gameOver = true; }
    else if (this._allResolved()) { this.gameOver = true; }

    const target = this.boards[cr][cc];
    this.activeBoard = target.isPlayable() ? [cr, cc] : null;

    this.currentPlayer = this.currentPlayer === X ? O : X;
    return true;
  }

  copy() {
    const ub = new UltimateBoard();
    for (let r = 0; r < 3; r++)
      for (let c = 0; c < 3; c++)
        ub.boards[r][c] = this.boards[r][c].clone();
    ub.activeBoard = this.activeBoard ? this.activeBoard.slice() : null;
    ub.currentPlayer = this.currentPlayer;
    ub.metaWinner = this.metaWinner;
    ub.gameOver = this.gameOver;
    ub.totalMoves = this.totalMoves;
    return ub;
  }
}

/* ==========================================================================
   Section 2 — AI  (port of ai.py)
   ========================================================================== */

function countInLine(board, player) {
  const opponent = player === X ? O : X;
  const result = [];
  for (const line of LINES) {
    const vals = line.map(([r,c]) => board.cells[r][c]);
    if (vals.includes(opponent)) continue;
    const count = vals.filter(v => v === player).length;
    const empties = line.filter(([r,c]) => board.cells[r][c] === EMPTY);
    result.push({ count, empties });
  }
  return result;
}

function boardThreat(board, player) {
  if (board.winner !== EMPTY || board.isFull()) return 0;
  let best = 0;
  for (const { count, empties } of countInLine(board, player))
    if (empties.length > 0) best = Math.max(best, count);
  return best / 3;
}

function immediateWinCell(board, player) {
  for (const { count, empties } of countInLine(board, player))
    if (count === 2 && empties.length === 1) return empties[0];
  return null;
}

function scoreMove(ub, br, bc, cr, cc, aiPlayer) {
  let score = 0;
  const opponent = aiPlayer === X ? O : X;
  const board = ub.boards[br][bc];

  // 1. Win the small board
  const winCell = immediateWinCell(board, aiPlayer);
  if (winCell && winCell[0] === cr && winCell[1] === cc) {
    score += 1000;
    const meta = ub._metaGrid();
    meta[br][bc] = aiPlayer;
    if (checkWinner(meta) === aiPlayer) score += 10000;
  }

  // 2. Block opponent winning the small board
  const blockCell = immediateWinCell(board, opponent);
  if (blockCell && blockCell[0] === cr && blockCell[1] === cc) score += 500;

  // 3. Center cell preference
  if (cr === 1 && cc === 1) score += 30;
  else if ((cr === 0 || cr === 2) && (cc === 0 || cc === 2)) score += 10;
  else score += 5;

  // 4. Center board preference
  if (br === 1 && bc === 1) score += 15;

  // 5. Sending-rule evaluation
  const target = ub.boards[cr][cc];
  if (target.isPlayable()) {
    score -= boardThreat(target, opponent) * 200;
    score += boardThreat(target, aiPlayer) * 50;
  } else {
    score -= 20;
  }

  return score;
}

function chooseMove(ub, aiPlayer = O) {
  const moves = ub.getValidMoves();
  if (moves.length === 0) throw new Error("No valid moves");

  // Shuffle for tie-breaking
  for (let i = moves.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [moves[i], moves[j]] = [moves[j], moves[i]];
  }

  let bestMove = moves[0];
  let bestScore = -Infinity;
  for (const m of moves) {
    const s = scoreMove(ub, m[0], m[1], m[2], m[3], aiPlayer);
    if (s > bestScore) { bestScore = s; bestMove = m; }
  }
  return bestMove;
}

/* ==========================================================================
   Section 3 — Canvas Renderer + UI Glue
   ========================================================================== */

const canvas  = document.getElementById("board-canvas");
const ctx     = canvas.getContext("2d");
const statusEl = document.getElementById("status");
const btnEl    = document.getElementById("new-game-btn");

// Handle high-DPI displays
function setupCanvas() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width  = CANVAS_W * dpr;
  canvas.height = CANVAS_H * dpr;
  canvas.style.width  = CANVAS_W + "px";
  canvas.style.height = CANVAS_H + "px";
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
setupCanvas();

/* ── Precompute rects ──────────────────────────────────────────────────── */
const boardRects = {};  // key "br,bc" → {x, y, w, h}
const cellRects  = {};  // key "br,bc,cr,cc" → {x, y, w, h}

for (let br = 0; br < 3; br++) {
  for (let bc = 0; bc < 3; bc++) {
    const bx = PADDING + bc * (SMALL_BOARD_SIZE + META_GAP);
    const by = PADDING + br * (SMALL_BOARD_SIZE + META_GAP);
    boardRects[`${br},${bc}`] = { x: bx, y: by, w: SMALL_BOARD_SIZE, h: SMALL_BOARD_SIZE };
    for (let cr = 0; cr < 3; cr++) {
      for (let cc = 0; cc < 3; cc++) {
        const cx = bx + cc * (CELL_SIZE + CELL_GAP);
        const cy = by + cr * (CELL_SIZE + CELL_GAP);
        cellRects[`${br},${bc},${cr},${cc}`] = { x: cx, y: cy, w: CELL_SIZE, h: CELL_SIZE };
      }
    }
  }
}

/* ── Hit testing ───────────────────────────────────────────────────────── */
function cellAt(px, py) {
  for (const key in cellRects) {
    const r = cellRects[key];
    if (px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h) {
      return key.split(",").map(Number);
    }
  }
  return null;
}

/* ── Drawing helpers ───────────────────────────────────────────────────── */

function roundRect(x, y, w, h, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y,     x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x,     y + h, radius);
  ctx.arcTo(x,     y + h, x,     y,     radius);
  ctx.arcTo(x,     y,     x + w, y,     radius);
  ctx.closePath();
}

function fillRoundRect(x, y, w, h, radius, color) {
  ctx.fillStyle = color;
  roundRect(x, y, w, h, radius);
  ctx.fill();
}

function drawX(rect, color) {
  const m = rect.w * 0.22;
  const lw = Math.max(2, rect.w * 0.1);
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(rect.x + m, rect.y + m);
  ctx.lineTo(rect.x + rect.w - m, rect.y + rect.h - m);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(rect.x + rect.w - m, rect.y + m);
  ctx.lineTo(rect.x + m, rect.y + rect.h - m);
  ctx.stroke();
}

function drawO(rect, color) {
  const cx = rect.x + rect.w / 2;
  const cy = rect.y + rect.h / 2;
  const radius = rect.w * 0.30;
  const lw = Math.max(2, rect.w * 0.1);
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();
}

function drawBigMark(rect, player) {
  const cx = rect.x + rect.w / 2;
  const cy = rect.y + rect.h / 2;
  const color = player === X ? COL.xColor : COL.oColor;

  if (player === X) {
    const size = rect.w * 0.30;
    const lw = Math.max(4, rect.w * 0.06);
    ctx.strokeStyle = color;
    ctx.lineWidth = lw;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(cx - size, cy - size);
    ctx.lineTo(cx + size, cy + size);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + size, cy - size);
    ctx.lineTo(cx - size, cy + size);
    ctx.stroke();
  } else {
    const radius = rect.w * 0.28;
    const lw = Math.max(4, rect.w * 0.06);
    ctx.strokeStyle = color;
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();
  }
}

/* ── Main draw ─────────────────────────────────────────────────────────── */

function draw(ub, hoverCell) {
  // Background
  ctx.fillStyle = COL.bg;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  const validMoves = new Set(ub.getValidMoves().map(m => m.join(",")));

  for (let br = 0; br < 3; br++) {
    for (let bc = 0; bc < 3; bc++) {
      const board = ub.boards[br][bc];
      const bRect = boardRects[`${br},${bc}`];

      // Board background
      fillRoundRect(bRect.x, bRect.y, bRect.w, bRect.h, 6, COL.boardBg);

      // Active-board highlight
      const isActive = !ub.gameOver && board.isPlayable() &&
        (ub.activeBoard === null || (ub.activeBoard[0] === br && ub.activeBoard[1] === bc));
      if (isActive) {
        fillRoundRect(bRect.x, bRect.y, bRect.w, bRect.h, 6, COL.activeOvr);
      }

      // Cells
      for (let cr = 0; cr < 3; cr++) {
        for (let cc = 0; cc < 3; cc++) {
          const key = `${br},${bc},${cr},${cc}`;
          const cRect = cellRects[key];
          const cellVal = board.cells[cr][cc];

          // Cell background
          fillRoundRect(cRect.x, cRect.y, cRect.w, cRect.h, 3, COL.cellBg);

          // Hover highlight (only valid cells, only on player turn)
          if (hoverCell && hoverCell.join(",") === key && validMoves.has(key)) {
            fillRoundRect(cRect.x, cRect.y, cRect.w, cRect.h, 3, COL.hoverOvr);
          }

          // Draw mark
          if (cellVal === X) {
            drawX(cRect, board.winner === O ? COL.xDim : COL.xColor);
          } else if (cellVal === O) {
            drawO(cRect, board.winner === X ? COL.oDim : COL.oColor);
          }
        }
      }

      // Won/drawn board overlay + big mark
      if (board.winner !== EMPTY) {
        const ovr = board.winner === X ? COL.wonXOvr : COL.wonOOvr;
        fillRoundRect(bRect.x, bRect.y, bRect.w, bRect.h, 6, ovr);
        drawBigMark(bRect, board.winner);
      } else if (board.isFull()) {
        fillRoundRect(bRect.x, bRect.y, bRect.w, bRect.h, 6, COL.drawOvr);
      }

      // Inner grid lines
      drawInnerGrid(bRect);
    }
  }

  // Meta grid lines (thick separators)
  drawMetaGrid();
}

function drawInnerGrid(rect) {
  const cw = rect.w / 3;
  const ch = rect.h / 3;
  ctx.strokeStyle = COL.grid;
  ctx.lineWidth = 1;
  for (let i = 1; i < 3; i++) {
    const x = rect.x + i * cw;
    ctx.beginPath(); ctx.moveTo(x, rect.y + 4); ctx.lineTo(x, rect.y + rect.h - 4); ctx.stroke();
    const y = rect.y + i * ch;
    ctx.beginPath(); ctx.moveTo(rect.x + 4, y); ctx.lineTo(rect.x + rect.w - 4, y); ctx.stroke();
  }
}

function drawMetaGrid() {
  ctx.strokeStyle = COL.metaGrid;
  ctx.lineWidth = 3;
  for (let i = 1; i < 3; i++) {
    const x = PADDING + i * (SMALL_BOARD_SIZE + META_GAP) - META_GAP / 2;
    ctx.beginPath(); ctx.moveTo(x, PADDING - 4); ctx.lineTo(x, PADDING + BOARD_SIZE + 4); ctx.stroke();
    const y = PADDING + i * (SMALL_BOARD_SIZE + META_GAP) - META_GAP / 2;
    ctx.beginPath(); ctx.moveTo(PADDING - 4, y); ctx.lineTo(PADDING + BOARD_SIZE + 4, y); ctx.stroke();
  }
}

/* ── Status ────────────────────────────────────────────────────────────── */

function updateStatus(ub) {
  statusEl.className = "";
  if (ub.gameOver) {
    if (ub.metaWinner === X) {
      statusEl.textContent = "🏆 You win!";
      statusEl.className = "x-win";
    } else if (ub.metaWinner === O) {
      statusEl.textContent = "Computer wins!";
      statusEl.className = "o-win";
    } else {
      statusEl.textContent = "It's a draw!";
      statusEl.className = "draw";
    }
  } else {
    if (ub.currentPlayer === X) {
      statusEl.textContent = "Your turn (X)";
      statusEl.className = "x-turn";
    } else {
      statusEl.textContent = "Computer thinking…";
      statusEl.className = "o-turn";
    }
  }
}

/* ── Game State & Event Wiring ─────────────────────────────────────────── */

let game = new UltimateBoard();
let hoverCell = null;
let aiPending = false;

function render() {
  draw(game, hoverCell);
  updateStatus(game);
}

// Get mouse position relative to canvas (accounting for CSS scaling)
function getCanvasPos(e) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = CANVAS_W / rect.width;
  const scaleY = CANVAS_H / rect.height;
  return [
    (e.clientX - rect.left) * scaleX,
    (e.clientY - rect.top)  * scaleY,
  ];
}

canvas.addEventListener("mousemove", (e) => {
  const [px, py] = getCanvasPos(e);
  hoverCell = cellAt(px, py);
  render();
});

canvas.addEventListener("mouseleave", () => {
  hoverCell = null;
  render();
});

canvas.addEventListener("click", (e) => {
  if (game.currentPlayer !== X || game.gameOver || aiPending) return;

  const [px, py] = getCanvasPos(e);
  const cell = cellAt(px, py);
  if (!cell) return;

  const validMoves = game.getValidMoves();
  const isValid = validMoves.some(m => m[0]===cell[0] && m[1]===cell[1] && m[2]===cell[2] && m[3]===cell[3]);
  if (!isValid) return;

  game.makeMove(cell[0], cell[1], cell[2], cell[3]);
  render();

  // Trigger AI
  if (!game.gameOver && game.currentPlayer === O) {
    aiPending = true;
    setTimeout(() => {
      const move = chooseMove(game, O);
      game.makeMove(move[0], move[1], move[2], move[3]);
      aiPending = false;
      render();
    }, AI_DELAY_MS);
  }
});

// Touch support for mobile
canvas.addEventListener("touchend", (e) => {
  e.preventDefault();
  if (game.currentPlayer !== X || game.gameOver || aiPending) return;

  const touch = e.changedTouches[0];
  const rect = canvas.getBoundingClientRect();
  const scaleX = CANVAS_W / rect.width;
  const scaleY = CANVAS_H / rect.height;
  const px = (touch.clientX - rect.left) * scaleX;
  const py = (touch.clientY - rect.top)  * scaleY;

  const cell = cellAt(px, py);
  if (!cell) return;

  const validMoves = game.getValidMoves();
  const isValid = validMoves.some(m => m[0]===cell[0] && m[1]===cell[1] && m[2]===cell[2] && m[3]===cell[3]);
  if (!isValid) return;

  game.makeMove(cell[0], cell[1], cell[2], cell[3]);
  render();

  if (!game.gameOver && game.currentPlayer === O) {
    aiPending = true;
    setTimeout(() => {
      const move = chooseMove(game, O);
      game.makeMove(move[0], move[1], move[2], move[3]);
      aiPending = false;
      render();
    }, AI_DELAY_MS);
  }
});

// New Game button
btnEl.addEventListener("click", () => {
  game = new UltimateBoard();
  aiPending = false;
  render();
});

// Initial render
render();
