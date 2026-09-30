/** Achi rules and a computer opponent. Pure functions, no DOM. 3x3 points (index = row * 3 + col), 4 pieces each, players 1 and 2. */
export const LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
// lines of the board: rows, columns, and the two diagonals through the centre
export const ADJ = (() => {
  const a = Array.from({ length: 9 }, () => []);
  const link = (x, y) => { a[x].push(y); a[y].push(x); };
  for (let r = 0; r < 3; r += 1) for (let c = 0; c < 3; c += 1) { if (c < 2) link(r * 3 + c, r * 3 + c + 1); if (r < 2) link(r * 3 + c, (r + 1) * 3 + c); }
  [0, 2, 6, 8].forEach((k) => link(k, 4));
  return a;
})();
export const other = (p) => 3 - p;
export const initial = () => ({ b: Array(9).fill(0), place: { 1: 4, 2: 4 }, turn: 1 });
export const clone = (s) => ({ b: s.b.slice(), place: { 1: s.place[1], 2: s.place[2] }, turn: s.turn });

export function actions(s, p = s.turn) {
  const out = [];
  if (s.place[p] > 0) { for (let i = 0; i < 9; i += 1) if (!s.b[i]) out.push({ kind: "place", to: i }); return out; }
  for (let i = 0; i < 9; i += 1) if (s.b[i] === p) for (const j of ADJ[i]) if (!s.b[j]) out.push({ kind: "move", from: i, to: j });
  return out;
}
export const lineOf = (b, p) => LINES.find((l) => l.every((i) => b[i] === p)) || null;
/** Plays an action for the player to move and passes the turn. */
export function apply(s, a) {
  const n = clone(s);
  const p = s.turn;
  if (a.kind === "place") { n.b[a.to] = p; n.place[p] -= 1; } else { n.b[a.from] = 0; n.b[a.to] = p; }
  n.turn = other(p);
  return n;
}
/** After a move: { winner, line } if the player who just moved made three in a row; or the player to move is stuck. */
export function outcome(s) {
  for (const p of [1, 2]) { const l = lineOf(s.b, p); if (l) return { winner: p, line: l, why: "three in a row" }; }
  if (!actions(s).length) return { winner: other(s.turn), line: null, why: "no legal moves" };
  return null;
}

// ---------- computer player ----------
const keyOf = (s) => s.b.join("") + s.turn + s.place[1] + s.place[2];
function evaluate(s, me) {
  let v = 0;
  const op = other(me);
  for (const l of LINES) {
    const mine = l.filter((i) => s.b[i] === me).length;
    const theirs = l.filter((i) => s.b[i] === op).length;
    if (!theirs) v += [0, 1, 4][mine] || 0;
    if (!mine) v -= [0, 1, 4][theirs] || 0;
  }
  if (s.b[4] === me) v += 2; else if (s.b[4] === op) v -= 2;
  return v;
}
function search(s, depth, alpha, beta, me, memo, ply) {
  const out = outcome(s);
  if (out) return (out.winner === me ? 1 : -1) * (1000 - ply);
  if (depth <= 0) return evaluate(s, me);
  const k = keyOf(s) + depth;
  if (memo.has(k)) return memo.get(k);
  const maximizing = s.turn === me;
  let best = maximizing ? -Infinity : Infinity;
  for (const a of actions(s)) {
    const v = search(apply(s, a), depth - 1, alpha, beta, me, memo, ply + 1);
    if (maximizing) { if (v > best) best = v; if (best > alpha) alpha = best; } else { if (v < best) best = v; if (best < beta) beta = best; }
    if (alpha >= beta) break;
  }
  memo.set(k, best);
  return best;
}
export function chooseAction(s, level = "normal") {
  const acts = actions(s);
  if (!acts.length) return null;
  const me = s.turn;
  const win = acts.find((a) => outcome(apply(s, a))?.winner === me);
  if (level === "easy") {
    if (win && Math.random() < 0.7) return win;
    return acts[Math.floor(Math.random() * acts.length)];
  }
  const depth = level === "hard" ? 13 : 4;
  const memo = new Map();
  let bestV = -Infinity;
  let pool = [];
  for (const a of acts) {
    const v = search(apply(s, a), depth - 1, -Infinity, Infinity, me, memo, 1);
    if (v > bestV + 1e-9) { bestV = v; pool = [a]; } else if (Math.abs(v - bestV) < 1e-9) pool.push(a);
  }
  return pool[Math.floor(Math.random() * pool.length)];
}
