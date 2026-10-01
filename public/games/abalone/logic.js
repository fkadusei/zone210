/**
 * Abalone rules and a computer opponent. Pure functions, no DOM.
 * 61 cells on a hexagon of radius 4, axial coordinates (q, r). Players 1 (black) and 2 (white), 14 marbles each.
 * A move shifts one, two or three of your marbles that sit in a straight line by one cell:
 *  - "inline": along the line. If the next cell holds opposing marbles you push them ("sumito"): you need more marbles than they have in a row
 *    (3 vs 1 or 2, or 2 vs 1) and the cell behind them must be empty or off the board. A marble pushed off the board is out of the game.
 *  - "broadside": sideways, every marble stepping into an empty neighbouring cell.
 * The first player to push six opposing marbles off the board wins.
 */
export const DIRS = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
export const CELLS = [];
const IDX = new Map();
for (let r = -4; r <= 4; r += 1) for (let q = Math.max(-4, -4 - r); q <= Math.min(4, 4 - r); q += 1) { IDX.set(`${q},${r}`, CELLS.length); CELLS.push({ q, r }); }
export const idx = (q, r) => (IDX.has(`${q},${r}`) ? IDX.get(`${q},${r}`) : -1);
export const NB = CELLS.map((c) => DIRS.map(([dq, dr]) => idx(c.q + dq, c.r + dr)));
export const other = (p) => 3 - p;
export const dist0 = (i) => { const { q, r } = CELLS[i]; return Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r)); };

export function initial() {
  const b = new Int8Array(61);
  const put = (q, r, p) => { b[idx(q, r)] = p; };
  for (let q = -4; q <= 0; q += 1) put(q, 4, 1);
  for (let q = -4; q <= 1; q += 1) put(q, 3, 1);
  for (let q = -2; q <= 0; q += 1) put(q, 2, 1);
  for (let q = 0; q <= 4; q += 1) put(q, -4, 2);
  for (let q = -1; q <= 4; q += 1) put(q, -3, 2);
  for (let q = 0; q <= 2; q += 1) put(q, -2, 2);
  return { b, turn: 1, off: [0, 0, 0], moves: 0, last: null };
}
export const clone = (s) => ({ b: s.b.slice(), turn: s.turn, off: s.off.slice(), moves: s.moves, last: s.last });
export const count = (s, p) => { let n = 0; for (let i = 0; i < 61; i += 1) if (s.b[i] === p) n += 1; return n; };

/** All legal moves for the player to move: { cells: [indexes along the line], d, push: number of enemy marbles pushed, off: bool }. */
export function legalMoves(s, p = s.turn) {
  const out = [];
  const q = other(p);
  const b = s.b;
  const seen = new Set();
  const add = (m) => { const key = `${[...m.cells].sort((x, y) => x - y).join(",")}|${m.d}`; if (!seen.has(key)) { seen.add(key); out.push(m); } };
  for (let i = 0; i < 61; i += 1) {
    if (b[i] !== p) continue;
    for (let d = 0; d < 6; d += 1) { const j = NB[i][d]; if (j >= 0 && b[j] === 0) add({ cells: [i], d, push: 0, off: false }); }
    for (let a = 0; a < 3; a += 1) {
      const cells = [i];
      for (let n = 2; n <= 3; n += 1) {
        const last = cells[cells.length - 1];
        const nxt = NB[last][a];
        if (nxt < 0 || b[nxt] !== p) break;
        cells.push(nxt);
        for (let d = 0; d < 6; d += 1) {
          if (d === a || d === (a + 3) % 6) {
            const head = d === a ? cells[cells.length - 1] : cells[0];
            const target = NB[head][d];
            if (target < 0) continue;
            if (b[target] === 0) { add({ cells: cells.slice(), d, push: 0, off: false }); continue; }
            if (b[target] !== q) continue;
            // opposing marbles in a row
            let m = 0;
            let c = target;
            while (c >= 0 && b[c] === q) { m += 1; c = NB[c][d]; }
            if (m >= n || m > 2) continue;
            if (c >= 0 && b[c] !== 0) continue; // blocked by a marble behind them
            add({ cells: cells.slice(), d, push: m, off: c < 0 });
          } else if (cells.every((x) => NB[x][d] >= 0 && b[NB[x][d]] === 0)) add({ cells: cells.slice(), d, push: 0, off: false });
        }
      }
    }
  }
  return out;
}

export function apply(s, m) {
  const t = clone(s);
  const p = s.turn;
  const q = other(p);
  const b = t.b;
  const d = m.d;
  const cells = m.cells;
  // a push: the cell in front of the line along d holds opposing marbles, which move first
  const front = cells.find((c) => !cells.includes(NB[c][d]));
  const first = cells.length > 1 && cells.some((c) => cells.includes(NB[c][d])) ? NB[front][d] : -1;
  if (first >= 0 && b[first] === q) {
    const chain = [];
    for (let c = first; c >= 0 && b[c] === q; c = NB[c][d]) chain.push(c);
    for (let k = chain.length - 1; k >= 0; k -= 1) {
      const to = NB[chain[k]][d];
      b[chain[k]] = 0;
      if (to < 0) t.off[p] += 1; else b[to] = q;
    }
  } else if (cells.length === 1 && b[NB[cells[0]][d]] === q) {
    /* single marbles never push */
  }
  const targets = cells.map((c) => NB[c][d]);
  for (const c of cells) b[c] = 0;
  for (const to of targets) b[to] = p;
  t.turn = q;
  t.moves += 1;
  t.last = { cells: targets.filter((c) => c >= 0), from: cells.slice(), push: m.push };
  return t;
}
export const winner = (s) => (s.off[1] >= 6 ? 1 : s.off[2] >= 6 ? 2 : 0);

// ---------- computer player ----------
function evaluate(s, me) {
  const op = other(me);
  let v = (s.off[me] - s.off[op]) * 900;
  let cen = 0, adj = 0;
  for (let i = 0; i < 61; i += 1) {
    const x = s.b[i];
    if (!x) continue;
    const sign = x === me ? 1 : -1;
    cen += sign * (4 - dist0(i));
    for (let d = 0; d < 3; d += 1) { const j = NB[i][d]; if (j >= 0 && s.b[j] === x) adj += sign; }
    // marbles on the rim are in danger
    if (dist0(i) === 4) cen -= sign * 1.5;
  }
  return v + cen * 4 + adj * 2.5;
}
function order(s, moves) {
  const me = s.turn;
  return moves.map((m) => { let v = (m.off ? 1000 : 0) + m.push * 40 + m.cells.length * 2; const to = NB[m.cells[0]][m.d]; if (to >= 0) v += (dist0(m.cells[0]) - dist0(to)) * 3; void me; return { m, v }; }).sort((a, b) => b.v - a.v).map((x) => x.m);
}
let deadline = 0;
function negamax(s, depth, alpha, beta, me, limit) {
  if (Date.now() > deadline) throw new Error("time");
  const w = winner(s);
  if (w) return (w === s.turn ? 1 : -1) * 100000;
  if (depth <= 0) return (s.turn === me ? 1 : -1) * evaluate(s, me);
  let moves = order(s, legalMoves(s));
  if (!moves.length) return -50000;
  if (moves.length > limit) moves = moves.slice(0, limit);
  let best = -Infinity;
  for (const m of moves) {
    const v = -negamax(apply(s, m), depth - 1, -beta, -alpha, me, limit);
    if (v > best) best = v;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
  }
  return best;
}
export function chooseMove(s, level = "normal") {
  const moves = legalMoves(s);
  if (!moves.length) return null;
  const me = s.turn;
  const pushOff = moves.filter((m) => m.off);
  if (pushOff.length && level !== "easy") return pushOff[0];
  if (level === "easy") {
    if (pushOff.length && Math.random() < 0.8) return pushOff[0];
    const pushes = moves.filter((m) => m.push);
    if (pushes.length && Math.random() < 0.5) return pushes[Math.floor(Math.random() * pushes.length)];
    // otherwise drift towards the middle
    const good = order(s, moves).slice(0, 10);
    return good[Math.floor(Math.random() * good.length)];
  }
  const cfg = level === "hard" ? { depth: 4, ms: 1800, limit: 22 } : { depth: 2, ms: 700, limit: 26 };
  const ordered = order(s, moves);
  let best = ordered[0];
  deadline = Date.now() + cfg.ms;
  for (let d = 1; d <= cfg.depth; d += 1) {
    try {
      let bv = -Infinity, bm = ordered[0];
      for (const m of ordered.slice(0, level === "hard" ? 30 : 40)) {
        const v = -negamax(apply(s, m), d - 1, -Infinity, Infinity, me, cfg.limit) + (level === "normal" ? Math.random() * 5 : 0);
        if (v > bv) { bv = v; bm = m; }
      }
      best = bm;
    } catch (err) { break; }
  }
  return best;
}
