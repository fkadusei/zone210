/** Reversi (Othello) rules and a computer opponent. Pure functions, no DOM. Board: 64 cells, 0 empty, 1 black, 2 white. */
export const N = 8;
const DIRS = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
export const other = (p) => 3 - p;

export function newBoard() {
  const b = Array(64).fill(0);
  b[27] = 2;
  b[36] = 2;
  b[28] = 1;
  b[35] = 1;
  return b;
}

/** Cells that `p` would flip by playing at `i` (empty list if the move is not legal). */
export function flipsFor(b, i, p) {
  if (b[i] !== 0) return [];
  const r0 = Math.floor(i / N);
  const c0 = i % N;
  const out = [];
  for (const [dr, dc] of DIRS) {
    const line = [];
    let r = r0 + dr;
    let c = c0 + dc;
    while (r >= 0 && r < N && c >= 0 && c < N && b[r * N + c] === other(p)) {
      line.push(r * N + c);
      r += dr;
      c += dc;
    }
    if (line.length && r >= 0 && r < N && c >= 0 && c < N && b[r * N + c] === p) out.push(...line);
  }
  return out;
}

/** Map of legal move -> cells it flips. */
export function legalMoves(b, p) {
  const m = new Map();
  for (let i = 0; i < 64; i += 1) {
    const f = flipsFor(b, i, p);
    if (f.length) m.set(i, f);
  }
  return m;
}

export function play(b, i, p) {
  const flipped = flipsFor(b, i, p);
  const nb = b.slice();
  nb[i] = p;
  flipped.forEach((k) => (nb[k] = p));
  return { board: nb, flipped };
}

export function count(b) {
  let black = 0;
  let white = 0;
  for (const v of b) {
    if (v === 1) black += 1;
    else if (v === 2) white += 1;
  }
  return { black, white, empty: 64 - black - white };
}

export const isOver = (b) => legalMoves(b, 1).size === 0 && legalMoves(b, 2).size === 0;

// ---------- computer player ----------
const W = [
  120, -20, 20, 5, 5, 20, -20, 120,
  -20, -40, -5, -5, -5, -5, -40, -20,
  20, -5, 15, 3, 3, 15, -5, 20,
  5, -5, 3, 3, 3, 3, -5, 5,
  5, -5, 3, 3, 3, 3, -5, 5,
  20, -5, 15, 3, 3, 15, -5, 20,
  -20, -40, -5, -5, -5, -5, -40, -20,
  120, -20, 20, 5, 5, 20, -20, 120,
];

function evaluate(b, me) {
  const op = other(me);
  let pos = 0;
  let mine = 0;
  let theirs = 0;
  for (let i = 0; i < 64; i += 1) {
    if (b[i] === me) { pos += W[i]; mine += 1; }
    else if (b[i] === op) { pos -= W[i]; theirs += 1; }
  }
  const mm = legalMoves(b, me).size;
  const om = legalMoves(b, op).size;
  const mobility = mm + om ? (100 * (mm - om)) / (mm + om) : 0;
  const empties = 64 - mine - theirs;
  const discs = empties < 14 ? (mine - theirs) * 6 : 0;
  return pos + mobility * 1.5 + discs;
}

let deadline = 0;
function search(b, p, me, depth, alpha, beta) {
  if (Date.now() > deadline) throw new Error("time");
  const moves = legalMoves(b, p);
  if (!moves.size) {
    const opp = legalMoves(b, other(p));
    if (!opp.size) {
      const c = count(b);
      const diff = me === 1 ? c.black - c.white : c.white - c.black;
      return diff * 1000;
    }
    return search(b, other(p), me, depth, alpha, beta);
  }
  if (depth <= 0) return evaluate(b, me);
  const maximizing = p === me;
  let best = maximizing ? -Infinity : Infinity;
  for (const [i] of moves) {
    const v = search(play(b, i, p).board, other(p), me, depth - 1, alpha, beta);
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

export function chooseMove(b, p, level = "normal") {
  const moves = legalMoves(b, p);
  if (!moves.size) return -1;
  const list = [...moves.keys()];
  if (list.length === 1) return list[0];
  if (level === "easy") {
    if (Math.random() < 0.45) return list.reduce((best, i) => (moves.get(i).length > moves.get(best).length ? i : best), list[0]);
    return list[Math.floor(Math.random() * list.length)];
  }
  const empties = count(b).empty;
  const cfg = level === "hard" ? { depth: 7, ms: 1300 } : { depth: 3, ms: 500 };
  const exact = level === "hard" && empties <= 9;
  deadline = Date.now() + cfg.ms + (exact ? 900 : 0);
  let best = list[0];
  const maxDepth = exact ? empties : cfg.depth;
  for (let d = 1; d <= maxDepth; d += 1) {
    try {
      let bestV = -Infinity;
      let bestI = list[0];
      for (const i of list) {
        const v = search(play(b, i, p).board, other(p), p, d - 1, -Infinity, Infinity) + (level === "normal" ? Math.random() * 6 : 0);
        if (v > bestV) { bestV = v; bestI = i; }
      }
      best = bestI;
    } catch (err) {
      break;
    }
  }
  return best;
}
