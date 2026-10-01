/**
 * Pente rules and a computer opponent. Pure functions, no DOM.
 * n x n intersections (index = row * n + col). Players 1 (black, moves first) and 2 (white).
 * Win by five or more stones in a row, or by capturing five pairs. A pair is captured when a player places a stone so that exactly two
 * enemy stones in a line are flanked at both ends (X O O X). Moving into a flanked pair is safe.
 * Tournament rule: the first player's first move is in the centre, and their second move must be at least three intersections from it.
 */
export const DIRS = [[0, 1], [1, 0], [1, 1], [1, -1]];
const ALL8 = [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [-1, -1], [1, -1], [-1, 1]];
export const other = (p) => 3 - p;
export const initial = (n = 19) => ({ n, b: Array(n * n).fill(0), turn: 1, caps: [0, 0, 0], moves: 0, last: -1 });
export const clone = (s) => ({ n: s.n, b: s.b.slice(), turn: s.turn, caps: s.caps.slice(), moves: s.moves, last: s.last });
const inb = (n, r, c) => r >= 0 && r < n && c >= 0 && c < n;

export function centre(n) { return ((n - 1) / 2) * n + (n - 1) / 2; }
/** Legal moves; `tournament` applies the first-player restrictions. */
export function legalMoves(s, tournament = true) {
  const { n } = s;
  const out = [];
  if (tournament && s.moves === 0) return [centre(n)];
  const cr = (n - 1) / 2;
  for (let i = 0; i < n * n; i += 1) {
    if (s.b[i]) continue;
    if (tournament && s.moves === 2) { const r = Math.floor(i / n), c = i % n; if (Math.abs(r - cr) < 3 && Math.abs(c - cr) < 3) continue; }
    out.push(i);
  }
  return out;
}

/** Plays at i for the player to move. Returns the new state plus { captured: [indexes], win: null | "five" | "captures", line }. */
export function play(s, i) {
  const { n } = s;
  const t = clone(s);
  const p = s.turn;
  const q = other(p);
  t.b[i] = p;
  t.last = i;
  t.moves += 1;
  const r = Math.floor(i / n), c = i % n;
  const captured = [];
  for (const [dr, dc] of ALL8) {
    const r1 = r + dr, c1 = c + dc, r2 = r + 2 * dr, c2 = c + 2 * dc, r3 = r + 3 * dr, c3 = c + 3 * dr * 0 + 3 * dc;
    if (!inb(n, r3, c3)) continue;
    if (t.b[r1 * n + c1] === q && t.b[r2 * n + c2] === q && t.b[r3 * n + c3] === p) {
      t.b[r1 * n + c1] = 0; t.b[r2 * n + c2] = 0;
      captured.push(r1 * n + c1, r2 * n + c2);
      t.caps[p] += 1;
    }
  }
  let win = null;
  let line = null;
  if (t.caps[p] >= 5) win = "captures";
  for (const [dr, dc] of DIRS) {
    const cells = [i];
    for (const sign of [1, -1]) {
      let rr = r + dr * sign, cc = c + dc * sign;
      while (inb(n, rr, cc) && t.b[rr * n + cc] === p) { cells.push(rr * n + cc); rr += dr * sign; cc += dc * sign; }
    }
    if (cells.length >= 5) { win = "five"; line = cells; break; }
  }
  t.turn = q;
  return { s: t, captured, win, line };
}

// ---------- computer player ----------
const WIN_TABLE = [0, 1, 9, 70, 700, 30000];
function lineScore(s, p) {
  const { n, b } = s;
  const q = other(p);
  let v = 0;
  for (const [dr, dc] of DIRS) {
    for (let r = 0; r < n; r += 1) for (let c = 0; c < n; c += 1) {
      const er = r + 4 * dr, ec = c + 4 * dc;
      if (!inb(n, er, ec)) continue;
      let mine = 0, theirs = 0;
      for (let k = 0; k < 5; k += 1) { const x = b[(r + k * dr) * n + c + k * dc]; if (x === p) mine += 1; else if (x === q) theirs += 1; }
      if (!theirs && mine) v += WIN_TABLE[mine];
    }
  }
  return v;
}
function weakPairs(s, p) {
  // our pairs that have an enemy stone at one end and an empty point at the other: they can be captured next turn
  const { n, b } = s;
  const q = other(p);
  let k = 0;
  for (let r = 0; r < n; r += 1) for (let c = 0; c < n; c += 1) {
    for (const [dr, dc] of DIRS) {
      const r3 = r + 3 * dr, c3 = c + 3 * dc;
      if (!inb(n, r3, c3)) continue;
      const a = b[r * n + c], m1 = b[(r + dr) * n + c + dc], m2 = b[(r + 2 * dr) * n + c + 2 * dc], z = b[r3 * n + c3];
      if (m1 === p && m2 === p && ((a === q && z === 0) || (a === 0 && z === q))) k += 1;
    }
  }
  return k;
}
export function evaluate(s, me) {
  const op = other(me);
  let v = lineScore(s, me) - lineScore(s, op) * 1.1;
  v += (s.caps[me] - s.caps[op]) * 260 + (s.caps[me] >= 4 ? 700 : 0) - (s.caps[op] >= 4 ? 700 : 0);
  v -= (weakPairs(s, me) - weakPairs(s, op)) * 55;
  return v;
}
function moveHeuristic(s, i, p) {
  // quick static value of placing at i (used to order and prune candidates)
  const t = play(s, i);
  if (t.win) return 1e7;
  const q = other(p);
  let v = t.captured.length * 120;
  const { n } = s;
  const r = Math.floor(i / n), c = i % n;
  for (const [dr, dc] of DIRS) {
    for (const who of [p, q]) {
      let run = 1, open = 0;
      for (const sign of [1, -1]) {
        let rr = r + dr * sign, cc = c + dc * sign;
        while (inb(n, rr, cc) && s.b[rr * n + cc] === who) { run += 1; rr += dr * sign; cc += dc * sign; }
        if (inb(n, rr, cc) && s.b[rr * n + cc] === 0) open += 1;
      }
      if (run >= 5) v += who === p ? 100000 : 40000;
      else v += (who === p ? 1 : 0.9) * [0, 0, 6, 40, 300 , 0][Math.min(run, 4)] * (open === 2 ? 2 : open === 1 ? 1 : 0.2);
    }
  }
  // stay near the action
  const mid = (n - 1) / 2;
  v -= (Math.abs(r - mid) + Math.abs(c - mid)) * 0.15;
  return v;
}
function candidates(s, tournament, limit) {
  const { n, b } = s;
  const legal = new Set(legalMoves(s, tournament));
  if (s.moves === 0) return [...legal];
  const near = new Set();
  for (let i = 0; i < b.length; i += 1) {
    if (!b[i]) continue;
    const r = Math.floor(i / n), c = i % n;
    for (let dr = -2; dr <= 2; dr += 1) for (let dc = -2; dc <= 2; dc += 1) { const rr = r + dr, cc = c + dc; if (inb(n, rr, cc) && !b[rr * n + cc] && legal.has(rr * n + cc)) near.add(rr * n + cc); }
  }
  let list = [...near];
  if (!list.length) list = [...legal];
  const p = s.turn;
  const scored = list.map((i) => ({ i, v: moveHeuristic(s, i, p) })).sort((x, y) => y.v - x.v);
  return scored.slice(0, limit).map((x) => x.i);
}

let deadline = 0;
function negamax(s, depth, alpha, beta, me, tournament) {
  if (Date.now() > deadline) throw new Error("time");
  if (depth <= 0) return (s.turn === me ? 1 : -1) * evaluate(s, me);
  const cands = candidates(s, tournament, depth >= 2 ? 10 : 14);
  let best = -Infinity;
  for (const i of cands) {
    const r = play(s, i);
    let v;
    if (r.win) v = 100000 + depth; // the mover wins
    else v = -negamax(r.s, depth - 1, -beta, -alpha, me, tournament);
    if (v > best) best = v;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
  }
  return best === -Infinity ? 0 : best;
}

export function chooseMove(s, level = "normal", tournament = true) {
  const legal = legalMoves(s, tournament);
  if (!legal.length) return -1;
  if (legal.length === 1) return legal[0];
  const me = s.turn;
  // take a win, otherwise stop the opponent's immediate win
  for (const i of legal) { if (play(s, i).win) return i; }
  const flipped = clone(s); flipped.turn = other(me);
  const must = [];
  for (const i of legalMoves(flipped, false)) { if (play(flipped, i).win) must.push(i); }
  if (must.length && level !== "easy") return must[0];
  const first = candidates(s, tournament, level === "hard" ? 18 : 14);
  if (level === "easy") {
    const pick = first.slice(0, 6);
    return Math.random() < 0.55 ? pick[0] : pick[Math.floor(Math.random() * pick.length)];
  }
  const cfg = level === "hard" ? { depth: 4, ms: 1600 } : { depth: 2, ms: 700 };
  let best = first[0];
  deadline = Date.now() + cfg.ms;
  for (let d = 1; d <= cfg.depth; d += 1) {
    try {
      let bv = -Infinity, bm = first[0];
      for (const i of first) {
        const r = play(s, i);
        const v = r.win ? 1e6 : -negamax(r.s, d - 1, -Infinity, Infinity, me, tournament) + (level === "normal" ? Math.random() * 6 : 0);
        if (v > bv) { bv = v; bm = i; }
      }
      best = bm;
    } catch (err) { break; }
  }
  return best;
}
