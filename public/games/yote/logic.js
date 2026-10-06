/**
 * Yote (traditional capture game) rules and a computer opponent. Pure functions, no DOM.
 * 5 rows x 6 columns (index = row * 6 + col). Each player starts with 12 pieces in hand. Players are 1 and 2.
 * On your turn do ONE of: place a piece from your hand on any empty square; slide a piece one square up, down, left or right
 * onto an empty square; or jump an adjacent enemy piece (up, down, left or right) onto the empty square beyond it, capturing it.
 * A capture also lets you remove any other enemy piece from the board (or, if they have none on the board, one from their hand).
 */
export const ROWS = 5;
export const COLS = 6;
export const START = 12;
export const other = (p) => 3 - p;
export const initial = () => ({ b: Array(30).fill(0), hand: { 1: START, 2: START }, turn: 1 });
export const clone = (s) => ({ b: s.b.slice(), hand: { 1: s.hand[1], 2: s.hand[2] }, turn: s.turn });
export const onBoard = (s, p) => s.b.reduce((n, v) => n + (v === p ? 1 : 0), 0);
export const totalOf = (s, p) => onBoard(s, p) + s.hand[p];

const DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]];
const at = (r, c) => (r >= 0 && r < ROWS && c >= 0 && c < COLS ? r * COLS + c : -1);

export function actions(s, p = s.turn) {
  const out = [];
  if (s.hand[p] > 0) for (let i = 0; i < 30; i += 1) if (!s.b[i]) out.push({ kind: "place", to: i });
  for (let i = 0; i < 30; i += 1) {
    if (s.b[i] !== p) continue;
    const r = Math.floor(i / COLS);
    const c = i % COLS;
    for (const [dr, dc] of DIRS) {
      const n = at(r + dr, c + dc);
      if (n < 0) continue;
      if (!s.b[n]) out.push({ kind: "move", from: i, to: n });
      else if (s.b[n] === other(p)) {
        const j = at(r + 2 * dr, c + 2 * dc);
        if (j >= 0 && !s.b[j]) out.push({ kind: "jump", from: i, over: n, to: j });
      }
    }
  }
  return out;
}

/** Performs an action for the player to move (turn does not change). Returns { s, captured }. */
export function act(s, a) {
  const n = clone(s);
  const p = s.turn;
  if (a.kind === "place") { n.b[a.to] = p; n.hand[p] -= 1; return { s: n, captured: false }; }
  n.b[a.from] = 0;
  n.b[a.to] = p;
  if (a.kind === "jump") { n.b[a.over] = 0; return { s: n, captured: true }; }
  return { s: n, captured: false };
}
/** Bonus removals after a capture: indexes of enemy pieces on the board, or ["hand"] when they have none there, or [] if they have nothing left. */
export function bonusTargets(s, p = s.turn) {
  const q = other(p);
  const list = [];
  for (let i = 0; i < 30; i += 1) if (s.b[i] === q) list.push(i);
  if (list.length) return list;
  return s.hand[q] > 0 ? ["hand"] : [];
}
export function takeBonus(s, t) {
  const n = clone(s);
  const q = other(s.turn);
  if (t === "hand") n.hand[q] -= 1; else n.b[t] = 0;
  return n;
}
export const endTurn = (s) => { const n = clone(s); n.turn = other(s.turn); return n; };

/** null while play continues. The player to move loses if they have nothing left or cannot move. */
export function outcome(s) {
  for (const p of [1, 2]) if (totalOf(s, p) === 0) return { winner: other(p), why: "no pieces left" };
  if (!actions(s).length) return { winner: other(s.turn), why: "no legal move" };
  return null;
}

export function turnOptions(s) {
  const out = [];
  for (const a of actions(s)) {
    const r = act(s, a);
    if (r.captured) {
      const t = bonusTargets(r.s);
      if (t.length) { for (const x of t) out.push({ a, rm: x }); continue; }
    }
    out.push({ a, rm: null });
  }
  return out;
}
export function applyOption(s, o) {
  let r = act(s, o.a).s;
  if (o.rm !== null && o.rm !== undefined) r = takeBonus(r, o.rm);
  return endTurn(r);
}

// ---------- computer player ----------
function jumps(s, p) {
  let n = 0;
  for (const a of actions(s, p)) if (a.kind === "jump") n += 1;
  return n;
}
function evaluate(s, me) {
  const op = other(me);
  let v = 10 * (totalOf(s, me) - totalOf(s, op));
  v += 3.5 * (jumps(s, me) - jumps(s, op));
  // pieces in hand are safe and flexible; on-board pieces near the centre are slightly better
  v += 0.6 * (s.hand[me] - s.hand[op]);
  for (let i = 0; i < 30; i += 1) {
    if (!s.b[i]) continue;
    const r = Math.floor(i / COLS);
    const c = i % COLS;
    const centre = 2 - Math.abs(r - 2) + (2.5 - Math.abs(c - 2.5)) * 0.4;
    v += (s.b[i] === me ? 1 : -1) * centre * 0.3;
  }
  return v;
}
let deadline = 0;
function negamax(s, depth, alpha, beta, me, ply) {
  if (Date.now() > deadline) throw new Error("time");
  const out = outcome(s);
  if (out) return (out.winner === s.turn ? 1 : -1) * (5000 - ply);
  if (depth <= 0) return (s.turn === me ? 1 : -1) * evaluate(s, me);
  let opts = turnOptions(s);
  if (opts.length > 12) {
    const scored = opts.map((o) => ({ o, v: evaluate(applyOption(s, o), s.turn) }));
    scored.sort((x, y) => y.v - x.v);
    opts = scored.slice(0, 12).map((x) => x.o);
  }
  let best = -Infinity;
  for (const o of opts) {
    const v = -negamax(applyOption(s, o), depth - 1, -beta, -alpha, me, ply + 1);
    if (v > best) best = v;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
  }
  return best;
}
export function chooseOption(s, level = "normal") {
  const opts = turnOptions(s);
  if (!opts.length) return null;
  if (level === "easy") {
    const caps = opts.filter((o) => o.rm !== null || o.a.kind === "jump");
    if (caps.length && Math.random() < 0.65) return caps[Math.floor(Math.random() * caps.length)];
    return opts[Math.floor(Math.random() * opts.length)];
  }
  const me = s.turn;
  const cfg = level === "hard" ? { depth: 5, ms: 1500 } : { depth: 2, ms: 600 };
  const ordered = opts.map((o) => ({ o, v: evaluate(applyOption(s, o), me) })).sort((a, b) => b.v - a.v);
  let best = ordered[0].o;
  deadline = Date.now() + cfg.ms;
  const pool = ordered.slice(0, level === "hard" ? 20 : 14).map((x) => x.o);
  for (let d = 1; d <= cfg.depth; d += 1) {
    try {
      let bv = -Infinity;
      let bo = pool[0];
      for (const o of pool) {
        const v = -negamax(applyOption(s, o), d - 1, -Infinity, Infinity, me, 1) + (level === "normal" ? Math.random() * 1.5 : 0);
        if (v > bv) { bv = v; bo = o; }
      }
      best = bo;
    } catch (err) {
      break;
    }
  }
  return best;
}
