/**
 * Ultimate Tic-Tac-Toe rules and a computer opponent. Pure functions, no DOM.
 * 81 cells: index = board * 9 + cell (boards and cells are both numbered 0..8, left to right, top to bottom).
 * Playing in cell k sends the opponent to board k. A board that is already decided means they may play anywhere.
 * Players are 1 (X) and 2 (O). big[b] is 0 open, 1 or 2 won, 3 drawn.
 */
export const LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
export const other = (p) => 3 - p;
export const initial = () => ({ c: Array(81).fill(0), big: Array(9).fill(0), next: -1, turn: 1, last: -1 });
export const clone = (s) => ({ c: s.c.slice(), big: s.big.slice(), next: s.next, turn: s.turn, last: s.last });

export function legalMoves(s) {
  const out = [];
  const boards = s.next >= 0 ? [s.next] : [0, 1, 2, 3, 4, 5, 6, 7, 8].filter((b) => s.big[b] === 0);
  for (const b of boards) for (let k = 0; k < 9; k += 1) if (!s.c[b * 9 + k]) out.push(b * 9 + k);
  return out;
}
const lineWon = (cells, p) => LINES.find((l) => l.every((i) => cells[i] === p)) || null;

export function apply(s, i) {
  const n = clone(s);
  const b = Math.floor(i / 9);
  const k = i % 9;
  const p = s.turn;
  n.c[i] = p;
  n.last = i;
  if (n.big[b] === 0) {
    const sub = n.c.slice(b * 9, b * 9 + 9);
    if (lineWon(sub, p)) n.big[b] = p;
    else if (sub.every(Boolean)) n.big[b] = 3;
  }
  n.next = n.big[k] === 0 ? k : -1;
  n.turn = other(p);
  return n;
}

/** null while play continues; else { winner: 1 | 2 | 0 (draw), line } */
export function outcome(s) {
  for (const p of [1, 2]) {
    const line = lineWon(s.big, p);
    if (line) return { winner: p, line };
  }
  if (s.big.every((v) => v !== 0)) {
    // all boards decided with no line: most boards wins, equal is a draw
    const a = s.big.filter((v) => v === 1).length;
    const b = s.big.filter((v) => v === 2).length;
    return { winner: a === b ? 0 : a > b ? 1 : 2, line: null, byCount: a !== b };
  }
  if (!legalMoves(s).length) return { winner: 0, line: null };
  return null;
}

// ---------- computer player ----------
const LINE_VAL = [0, 1, 4, 0];
function lineScore(cells, me) {
  const op = other(me);
  let v = 0;
  for (const l of LINES) {
    const m = l.filter((i) => cells[i] === me).length;
    const t = l.filter((i) => cells[i] === op).length;
    if (!t) v += LINE_VAL[m];
    if (!m) v -= LINE_VAL[t];
  }
  return v;
}
function evaluate(s, me) {
  const op = other(me);
  let v = 0;
  for (let b = 0; b < 9; b += 1) {
    if (s.big[b] === me) v += 14;
    else if (s.big[b] === op) v -= 14;
    else if (s.big[b] === 0) {
      v += lineScore(s.c.slice(b * 9, b * 9 + 9), me) * 0.8;
      if (s.c[b * 9 + 4] === me) v += 1; else if (s.c[b * 9 + 4] === op) v -= 1;
    }
    if (b === 4) v += s.big[b] === me ? 6 : s.big[b] === op ? -6 : 0;
  }
  // the big board matters most
  const bigCells = s.big.map((x) => (x === 3 ? 0 : x));
  v += lineScore(bigCells, me) * 9;
  // being sent to a decided board gives the mover free choice, which is an edge
  if (s.next === -1) v += s.turn === me ? 4 : -4;
  return v;
}

let deadline = 0;
function negamax(s, depth, alpha, beta, me, ply) {
  if (Date.now() > deadline) throw new Error("time");
  const out = outcome(s);
  if (out) return out.winner === 0 ? 0 : (out.winner === s.turn ? 1 : -1) * (5000 - ply);
  if (depth <= 0) return (s.turn === me ? 1 : -1) * evaluate(s, me);
  let moves = legalMoves(s);
  if (moves.length > 12) {
    const scored = moves.map((m) => ({ m, v: evaluate(apply(s, m), s.turn) }));
    scored.sort((a, b) => b.v - a.v);
    moves = scored.slice(0, 12).map((x) => x.m);
  }
  let best = -Infinity;
  for (const m of moves) {
    const v = -negamax(apply(s, m), depth - 1, -beta, -alpha, me, ply + 1);
    if (v > best) best = v;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
  }
  return best;
}

export function chooseMove(s, level = "normal") {
  const moves = legalMoves(s);
  if (!moves.length) return -1;
  const me = s.turn;
  const wins = moves.filter((m) => outcome(apply(s, m))?.winner === me);
  if (level === "easy") {
    if (wins.length && Math.random() < 0.7) return wins[0];
    // prefer winning a small board
    const sub = moves.filter((m) => apply(s, m).big[Math.floor(m / 9)] === me && s.big[Math.floor(m / 9)] === 0);
    if (sub.length && Math.random() < 0.5) return sub[Math.floor(Math.random() * sub.length)];
    return moves[Math.floor(Math.random() * moves.length)];
  }
  if (wins.length) return wins[0];
  const cfg = level === "hard" ? { depth: 7, ms: 1400 } : { depth: 3, ms: 600 };
  const ordered = moves.map((m) => ({ m, v: evaluate(apply(s, m), me) })).sort((a, b) => b.v - a.v);
  let best = ordered[0].m;
  deadline = Date.now() + cfg.ms;
  const pool = ordered.slice(0, level === "hard" ? 24 : 16).map((x) => x.m);
  for (let d = 1; d <= cfg.depth; d += 1) {
    try {
      let bv = -Infinity;
      let bm = pool[0];
      for (const m of pool) {
        const v = -negamax(apply(s, m), d - 1, -Infinity, Infinity, me, 1) + (level === "normal" ? Math.random() * 1.2 : 0);
        if (v > bv) { bv = v; bm = m; }
      }
      best = bm;
    } catch (err) {
      break;
    }
  }
  return best;
}
