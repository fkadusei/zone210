/**
 * Shared rules and computer player for the "mills" games: Nine Men's Morris and Morabaraba. Pure functions, no DOM.
 * 24 points: ring r (0 outer, 1 middle, 2 inner), position k (0..7 clockwise from the top-left corner; even = corner, odd = midpoint).
 * Point index = r * 8 + k. Players are 1 and 2.
 * Morabaraba adds diagonal lines between the corners of the rings and gives each player 12 pieces.
 */
export const VARIANTS = {
  nmm: { name: "Nine Men's Morris", pieces: 9, diagonals: false },
  mora: { name: "Morabaraba", pieces: 12, diagonals: true },
};
const cache = {};
export function rulesFor(variant) {
  if (cache[variant]) return cache[variant];
  const v = VARIANTS[variant];
  const adj = Array.from({ length: 24 }, () => []);
  const link = (a, b) => { adj[a].push(b); adj[b].push(a); };
  for (let r = 0; r < 3; r += 1) for (let k = 0; k < 8; k += 1) link(r * 8 + k, r * 8 + ((k + 1) % 8));
  for (let k = 0; k < 8; k += 1) {
    if (k % 2 === 1 || v.diagonals) { link(k, 8 + k); link(8 + k, 16 + k); }
  }
  const mills = [];
  for (let r = 0; r < 3; r += 1) for (let c = 0; c < 8; c += 2) mills.push([r * 8 + c, r * 8 + ((c + 1) % 8), r * 8 + ((c + 2) % 8)]);
  for (let k = 0; k < 8; k += 1) if (k % 2 === 1 || v.diagonals) mills.push([k, 8 + k, 16 + k]);
  const millsAt = Array.from({ length: 24 }, (_, i) => mills.filter((m) => m.includes(i)));
  cache[variant] = { variant, pieces: v.pieces, adj, mills, millsAt };
  return cache[variant];
}

export const other = (p) => 3 - p;
export function initial(variant) {
  const n = VARIANTS[variant].pieces;
  return { b: Array(24).fill(0), place: { 1: n, 2: n }, turn: 1 };
}
export const clone = (s) => ({ b: s.b.slice(), place: { 1: s.place[1], 2: s.place[2] }, turn: s.turn });
export const countOn = (b, p) => b.reduce((n, v) => n + (v === p ? 1 : 0), 0);
export const isPlacing = (s, p = s.turn) => s.place[p] > 0;
export const canFly = (s, p = s.turn) => s.place[p] === 0 && countOn(s.b, p) === 3;
export const inMill = (R, b, i) => R.millsAt[i].some((m) => m.every((k) => b[k] === b[i]));

/** All basic actions for the player to move: { kind: "place", to } or { kind: "move", from, to }. */
export function actions(R, s, p = s.turn) {
  const out = [];
  if (isPlacing(s, p)) {
    for (let i = 0; i < 24; i += 1) if (!s.b[i]) out.push({ kind: "place", to: i });
    return out;
  }
  const fly = canFly(s, p);
  for (let i = 0; i < 24; i += 1) {
    if (s.b[i] !== p) continue;
    if (fly) { for (let j = 0; j < 24; j += 1) if (!s.b[j]) out.push({ kind: "move", from: i, to: j }); }
    else for (const j of R.adj[i]) if (!s.b[j]) out.push({ kind: "move", from: i, to: j });
  }
  return out;
}

/** Performs an action for the player to move (does not change whose turn it is). Returns { s, formed }. */
export function act(R, s, a) {
  const n = clone(s);
  const p = s.turn;
  if (a.kind === "place") { n.b[a.to] = p; n.place[p] -= 1; }
  else { n.b[a.from] = 0; n.b[a.to] = p; }
  const formed = R.millsAt[a.to].some((m) => m.every((k) => n.b[k] === p));
  return { s: n, formed };
}

/** Opponent pieces that may be removed after a mill: those outside mills, or all of them if every piece is in a mill. */
export function removable(R, s, p = s.turn) {
  const q = other(p);
  const all = [];
  for (let i = 0; i < 24; i += 1) if (s.b[i] === q) all.push(i);
  const free = all.filter((i) => !inMill(R, s.b, i));
  return free.length ? free : all;
}
export function removePiece(s, i) { const n = clone(s); n.b[i] = 0; return n; }
export const endTurn = (s) => { const n = clone(s); n.turn = other(s.turn); return n; };

/** null while the game continues, else { winner } (0 means a draw) for the position with `s.turn` to move. */
export function outcome(R, s) {
  for (const p of [1, 2]) {
    if (s.place[p] === 0 && countOn(s.b, p) < 3) return { winner: other(p), why: "reduced to two pieces" };
  }
  const p = s.turn;
  if (actions(R, s, p).length === 0) {
    if (s.b.every(Boolean)) return { winner: 0, why: "the board is full" };
    return { winner: other(p), why: "no legal moves" };
  }
  return null;
}

/** Whole-turn options used by the computer: an action plus the removal it earns. */
export function turnOptions(R, s) {
  const out = [];
  for (const a of actions(R, s)) {
    const r = act(R, s, a);
    if (r.formed) {
      const rm = removable(R, r.s);
      if (rm.length) { for (const i of rm) out.push({ a, rm: i }); continue; }
    }
    out.push({ a, rm: null });
  }
  return out;
}
export function applyOption(R, s, o) {
  let r = act(R, s, o.a).s;
  if (o.rm !== null && o.rm !== undefined) r = removePiece(r, o.rm);
  return endTurn(r);
}

// ---------- evaluation and search ----------
function twos(R, b, p) {
  let n = 0;
  for (const m of R.mills) {
    let mine = 0, empty = 0;
    for (const i of m) { if (b[i] === p) mine += 1; else if (!b[i]) empty += 1; }
    if (mine === 2 && empty === 1) n += 1;
  }
  return n;
}
function mobility(R, s, p) {
  let n = 0;
  for (let i = 0; i < 24; i += 1) if (s.b[i] === p) for (const j of R.adj[i]) if (!s.b[j]) n += 1;
  return n;
}
function evaluate(R, s, me) {
  const op = other(me);
  const mine = countOn(s.b, me) + s.place[me];
  const theirs = countOn(s.b, op) + s.place[op];
  let v = 14 * (mine - theirs);
  v += 4 * (twos(R, s.b, me) - twos(R, s.b, op));
  let closed = 0;
  for (const m of R.mills) { if (m.every((i) => s.b[i] === me)) closed += 1; else if (m.every((i) => s.b[i] === op)) closed -= 1; }
  v += 5 * closed;
  if (s.place[me] === 0 && s.place[op] === 0) v += 1.5 * (mobility(R, s, me) - mobility(R, s, op));
  else {
    // in the placing phase, junction points are worth more
    for (let i = 0; i < 24; i += 1) if (s.b[i]) v += (s.b[i] === me ? 1 : -1) * R.adj[i].length * 0.6;
  }
  return v;
}

let deadline = 0;
function negamax(R, s, depth, alpha, beta, me, ply) {
  if (Date.now() > deadline) throw new Error("time");
  const out = outcome(R, s);
  if (out) return out.winner === 0 ? 0 : (out.winner === s.turn ? 1 : -1) * (10000 - ply);
  if (depth <= 0) return (s.turn === me ? 1 : -1) * evaluate(R, s, me);
  let opts = turnOptions(R, s);
  if (opts.length > 14) {
    // keep the most promising options only (best static score for the player to move)
    const scored = opts.map((o) => ({ o, v: evaluate(R, applyOption(R, s, o), s.turn) }));
    scored.sort((x, y) => y.v - x.v);
    opts = scored.slice(0, 14).map((x) => x.o);
  }
  let best = -Infinity;
  for (const o of opts) {
    const v = -negamax(R, applyOption(R, s, o), depth - 1, -beta, -alpha, me, ply + 1);
    if (v > best) best = v;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
  }
  return best;
}

export function chooseOption(R, s, level = "normal") {
  const opts = turnOptions(R, s);
  if (!opts.length) return null;
  if (level === "easy") {
    const mills = opts.filter((o) => o.rm !== null);
    if (mills.length && Math.random() < 0.6) return mills[Math.floor(Math.random() * mills.length)];
    return opts[Math.floor(Math.random() * opts.length)];
  }
  const me = s.turn;
  const cfg = level === "hard" ? { depth: 5, ms: 1500 } : { depth: 2, ms: 600 };
  // order by a quick static look so deeper searches prune well
  const ordered = opts.map((o) => ({ o, v: evaluate(R, applyOption(R, s, o), me) })).sort((a, b) => b.v - a.v);
  let best = ordered[0].o;
  deadline = Date.now() + cfg.ms;
  const pool = ordered.slice(0, level === "hard" ? 22 : 16).map((x) => x.o);
  for (let d = 1; d <= cfg.depth; d += 1) {
    try {
      let bv = -Infinity;
      let bo = pool[0];
      for (const o of pool) {
        const v = -negamax(R, applyOption(R, s, o), d - 1, -Infinity, Infinity, me, 1) + (level === "normal" ? Math.random() * 1.5 : 0);
        if (v > bv) { bv = v; bo = o; }
      }
      best = bo;
    } catch (err) {
      break;
    }
  }
  return best;
}
