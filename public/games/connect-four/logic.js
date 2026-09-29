/** Connect Four rules and a minimax opponent. Pure functions, no DOM. */
export const ROWS = 6;
export const COLS = 7;

export const emptyBoard = () => Array.from({ length: ROWS }, () => Array(COLS).fill(0));
export const cloneBoard = (b) => b.map((r) => r.slice());

/** Lowest empty row in a column, or -1 if the column is full. */
export function dropRow(board, col) {
  for (let r = ROWS - 1; r >= 0; r -= 1) if (board[r][col] === 0) return r;
  return -1;
}

export const legalCols = (board) => [...Array(COLS).keys()].filter((c) => board[0][c] === 0);

/** Returns the four winning cells [[r,c],...] if `player` has four in a row through (r, c), else null. */
export function winLine(board, r, c) {
  const p = board[r][c];
  if (!p) return null;
  for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
    const cells = [[r, c]];
    for (const sign of [1, -1]) {
      let rr = r + dr * sign;
      let cc = c + dc * sign;
      while (rr >= 0 && rr < ROWS && cc >= 0 && cc < COLS && board[rr][cc] === p) {
        cells.push([rr, cc]);
        rr += dr * sign;
        cc += dc * sign;
      }
    }
    if (cells.length >= 4) return cells.slice(0, Math.max(4, cells.length));
  }
  return null;
}

export const isFull = (board) => board[0].every((v) => v !== 0);

/** Heuristic score from `me`'s point of view: window counting plus a centre bonus. */
export function evaluate(board, me) {
  const opp = 3 - me;
  let score = 0;
  for (let r = 0; r < ROWS; r += 1) if (board[r][3] === me) score += 3;
  const windows = [];
  for (let r = 0; r < ROWS; r += 1) for (let c = 0; c < COLS; c += 1) {
    for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
      const er = r + dr * 3;
      const ec = c + dc * 3;
      if (er < 0 || er >= ROWS || ec < 0 || ec >= COLS) continue;
      windows.push([0, 1, 2, 3].map((k) => board[r + dr * k][c + dc * k]));
    }
  }
  for (const w of windows) {
    const mine = w.filter((v) => v === me).length;
    const theirs = w.filter((v) => v === opp).length;
    const empty = 4 - mine - theirs;
    if (mine && theirs) continue;
    if (mine === 3 && empty === 1) score += 5;
    else if (mine === 2 && empty === 2) score += 2;
    if (theirs === 3 && empty === 1) score -= 6;
    else if (theirs === 2 && empty === 2) score -= 2;
  }
  return score;
}

// Try centre columns first: better pruning and better play.
const ORDER = [3, 2, 4, 1, 5, 0, 6];

function negamax(board, depth, alpha, beta, me, toMove) {
  const cols = ORDER.filter((c) => board[0][c] === 0);
  if (cols.length === 0) return 0;
  if (depth === 0) return toMove === me ? evaluate(board, me) : -evaluate(board, me);

  let best = -Infinity;
  for (const c of cols) {
    const r = dropRow(board, c);
    board[r][c] = toMove;
    let value;
    if (winLine(board, r, c)) value = 100000 + depth; // faster wins score higher
    else value = -negamax(board, depth - 1, -beta, -alpha, me, 3 - toMove);
    board[r][c] = 0;
    if (value > best) best = value;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
  }
  return best;
}

/**
 * Pick a column for `me`. level: "easy" (mostly random, still takes wins / blocks sometimes),
 * "normal" (depth 4), "hard" (depth 7).
 */
export function chooseMove(board, me, level = "normal", rng = Math.random) {
  const cols = legalCols(board);
  const b = cloneBoard(board);

  // Always take an immediate win; on easy, only most of the time.
  const tryImmediate = (player) => {
    for (const c of cols) {
      const r = dropRow(b, c);
      b[r][c] = player;
      const win = !!winLine(b, r, c);
      b[r][c] = 0;
      if (win) return c;
    }
    return null;
  };
  const win = tryImmediate(me);
  if (win !== null && (level !== "easy" || rng() < 0.8)) return win;
  const block = tryImmediate(3 - me);
  if (block !== null && (level !== "easy" || rng() < 0.5)) return block;

  if (level === "easy") return cols[Math.floor(rng() * cols.length)];

  const depth = level === "hard" ? 7 : 4;
  let bestCol = cols[0];
  let bestVal = -Infinity;
  for (const c of ORDER.filter((x) => cols.includes(x))) {
    const r = dropRow(b, c);
    b[r][c] = me;
    const value = winLine(b, r, c) ? 100000 : -negamax(b, depth - 1, -Infinity, Infinity, me, 3 - me);
    b[r][c] = 0;
    // tiny jitter so games differ, but never enough to change a clear winner
    const v = value + rng() * 0.01;
    if (v > bestVal) {
      bestVal = v;
      bestCol = c;
    }
  }
  return bestCol;
}
