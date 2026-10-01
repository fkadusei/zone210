/**
 * Sprouts rules and a computer opponent. Pure functions, no DOM.
 *
 * The playing area is a G x G grid of cells. A spot occupies one cell; a curve is a chain of 4-connected free cells, so two curves can never cross
 * (crossing would need to share a cell). Each move: draw a curve from one spot to another (or from a spot back to itself, a "loop"),
 * then a new spot appears in the middle of the curve. A spot may have at most three curves (its "lives"); the new spot starts with two
 * curves, so one life left. The player who cannot move loses, so the player who makes the last move wins.
 *
 * cell[i]: 0 free, k > 0 spot number k (index k - 1 in `spots`), -1 curve.
 */
export const G = 32;
const MIN_LOOP = 7;
const NB = (() => {
  const nb = [];
  for (let r = 0; r < G; r += 1) for (let c = 0; c < G; c += 1) {
    const i = r * G + c;
    nb[i] = [r > 0 ? i - G : -1, r < G - 1 ? i + G : -1, c > 0 ? i - 1 : -1, c < G - 1 ? i + 1 : -1];
  }
  return nb;
})();
export const neighbors = (i) => NB[i].filter((x) => x >= 0);
export const other = (p) => 3 - p;
export const cellRC = (i) => [Math.floor(i / G), i % G];

export function initial(count = 3) {
  const cell = new Int16Array(G * G);
  const spots = [];
  const R = count === 2 ? 8 : 9;
  for (let k = 0; k < count; k += 1) {
    const a = -Math.PI / 2 + (k * 2 * Math.PI) / count + (count === 2 ? Math.PI / 2 : 0);
    const r = Math.round(15.5 + R * Math.sin(a));
    const c = Math.round(15.5 + R * Math.cos(a));
    spots.push({ cell: r * G + c, deg: 0 });
    cell[r * G + c] = k + 1;
  }
  return { cell, spots, turn: 1, moves: 0, curves: [] };
}
export const clone = (s) => ({ cell: s.cell.slice(), spots: s.spots.map((x) => ({ ...x })), turn: s.turn, moves: s.moves, curves: s.curves.slice() });
export const lives = (s, k) => 3 - s.spots[k].deg;
export const spotAtCell = (s, i) => (s.cell[i] > 0 ? s.cell[i] - 1 : -1);

/** Label the connected free regions. */
export function regions(s) {
  const label = new Int32Array(G * G).fill(-1);
  let count = 0;
  const stack = [];
  for (let i = 0; i < G * G; i += 1) {
    if (s.cell[i] !== 0 || label[i] >= 0) continue;
    label[i] = count; stack.push(i);
    while (stack.length) {
      const x = stack.pop();
      for (const y of NB[x]) if (y >= 0 && s.cell[y] === 0 && label[y] < 0) { label[y] = count; stack.push(y); }
    }
    count += 1;
  }
  return { label, count };
}
function spotAccess(s, reg) {
  // for each spot with lives: the free neighbour cells it touches, grouped by region
  const acc = [];
  s.spots.forEach((sp, k) => {
    if (3 - sp.deg <= 0) return;
    const byRegion = new Map();
    for (const y of NB[sp.cell]) if (y >= 0 && s.cell[y] === 0) { const r = reg.label[y]; if (!byRegion.has(r)) byRegion.set(r, []); byRegion.get(r).push(y); }
    if (byRegion.size) acc.push({ k, byRegion });
  });
  return acc;
}
/** Legal (spot, spot, region) connections; loops are listed with a === b. */
export function connections(s, reg = regions(s)) {
  const acc = spotAccess(s, reg);
  const out = [];
  const perRegion = new Map();
  for (const sp of acc) for (const [r, cells] of sp.byRegion) { if (!perRegion.has(r)) perRegion.set(r, []); perRegion.get(r).push({ k: sp.k, cells }); }
  for (const [r, list] of perRegion) {
    for (let i = 0; i < list.length; i += 1) {
      for (let j = i + 1; j < list.length; j += 1) out.push({ a: list[i].k, b: list[j].k, region: r, ca: list[i].cells, cb: list[j].cells });
      if (3 - s.spots[list[i].k].deg >= 2 && list[i].cells.length >= 2) out.push({ a: list[i].k, b: list[i].k, region: r, ca: list[i].cells, cb: list[i].cells, loop: true });
    }
  }
  return out;
}

function shuffled(arr, rng) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i -= 1) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

/** A path of free cells from `from` to `to` (inclusive), avoiding `blocked`; neighbour order is randomised so routes vary. */
function bfsPath(s, from, to, rng, blocked = null) {
  if (from === to) return [from];
  const prev = new Int32Array(G * G).fill(-2);
  prev[from] = -1;
  let frontier = [from];
  while (frontier.length) {
    const next = [];
    for (const x of frontier) {
      const order = rng ? shuffled(NB[x], rng) : NB[x];
      for (const y of order) {
        if (y < 0 || prev[y] !== -2 || s.cell[y] !== 0 || (blocked && blocked.has(y))) continue;
        prev[y] = x;
        if (y === to) { const p = []; for (let z = y; z !== -1; z = prev[z]) p.push(z); return p.reverse(); }
        next.push(y);
      }
    }
    frontier = next;
  }
  return null;
}
/** Interior cells of a curve for the connection `c`, or null when it cannot be drawn. */
export function route(s, c, rng = Math.random) {
  if (!c.loop) {
    const sa = c.ca[Math.floor(rng() * c.ca.length)];
    const sb = c.cb[Math.floor(rng() * c.cb.length)];
    return bfsPath(s, sa, sb, rng);
  }
  const A = s.spots[c.a].cell;
  const [ar, ac] = cellRC(A);
  const block = new Set();
  for (let dr = -1; dr <= 1; dr += 1) for (let dc = -1; dc <= 1; dc += 1) { const r = ar + dr, cc = ac + dc; if (r >= 0 && r < G && cc >= 0 && cc < G) block.add(r * G + cc); }
  const cells = shuffled(c.ca, rng);
  for (let i = 0; i < cells.length; i += 1) for (let j = i + 1; j < cells.length; j += 1) {
    const b2 = new Set(block); b2.delete(cells[i]); b2.delete(cells[j]);
    const p = bfsPath(s, cells[i], cells[j], rng, b2);
    if (p && p.length >= MIN_LOOP) return p;
  }
  return null;
}

/** Checks a drawn curve (list of interior cells) against the rules; returns an error string or null. */
export function validate(s, a, b, path) {
  if (!s.spots[a] || !s.spots[b]) return "Pick spots to join.";
  if (a === b) { if (3 - s.spots[a].deg < 2) return "That spot can't take a loop (a loop uses two lines)."; } else if (3 - s.spots[a].deg < 1 || 3 - s.spots[b].deg < 1) return "A spot can have at most three lines.";
  if (!path.length) return "The line needs room for a new spot.";
  const seen = new Set();
  for (let i = 0; i < path.length; i += 1) {
    const x = path[i];
    if (!(x >= 0 && x < G * G) || s.cell[x] !== 0) return "A line can't cross another line or a spot.";
    if (seen.has(x)) return "A line can't cross itself.";
    seen.add(x);
    if (i && !NB[path[i - 1]].includes(x)) return "The line must be unbroken.";
  }
  if (!NB[s.spots[a].cell].includes(path[0])) return "The line must start at the spot.";
  if (!NB[s.spots[b].cell].includes(path[path.length - 1])) return "The line must end at a spot.";
  if (a === b) { if (path.length < MIN_LOOP || path[0] === path[path.length - 1]) return "A loop has to go around some space."; }
  return null;
}
export function apply(s, a, b, path) {
  const n = clone(s);
  for (const x of path) n.cell[x] = -1;
  const mid = path[Math.floor(path.length / 2)];
  n.spots.push({ cell: mid, deg: 2 });
  n.cell[mid] = n.spots.length;
  n.spots[a].deg += a === b ? 2 : 1;
  if (a !== b) n.spots[b].deg += 1;
  n.curves.push({ a, b, path: path.slice(), player: s.turn, spot: n.spots.length - 1 });
  n.turn = other(s.turn);
  n.moves += 1;
  return n;
}
export function hasMove(s) {
  const reg = regions(s);
  const conns = connections(s, reg);
  if (conns.some((c) => !c.loop)) return true;
  return conns.some((c) => route(s, c, Math.random));
}

// ---------- computer player ----------
function playout(s0) {
  let s = s0;
  let last = other(s0.turn);
  for (let guard = 0; guard < 80; guard += 1) {
    const reg = regions(s);
    const conns = connections(s, reg);
    let moved = false;
    for (const c of shuffled(conns, Math.random)) {
      const p = route(s, c, Math.random);
      if (!p) continue;
      last = s.turn;
      s = apply(s, c.a, c.b, p);
      moved = true;
      break;
    }
    if (!moved) return last; // the player to move is stuck and loses, so the last mover wins
  }
  return last;
}
export function candidates(s, perConnection = 2, cap = 28) {
  const reg = regions(s);
  const conns = shuffled(connections(s, reg), Math.random);
  const out = [];
  for (const c of conns) {
    for (let v = 0; v < perConnection; v += 1) {
      const p = route(s, c, Math.random);
      if (p) out.push({ a: c.a, b: c.b, path: p });
      if (!c.loop && c.ca.length * c.cb.length === 1) break;
    }
    if (out.length >= cap) break;
  }
  return out.slice(0, cap);
}
export function chooseMove(s, level = "normal") {
  const cands = candidates(s, level === "easy" ? 1 : 2, level === "hard" ? 34 : 26);
  if (!cands.length) return null;
  if (level === "easy") return cands[Math.floor(Math.random() * cands.length)];
  const me = s.turn;
  const scored = cands.map((m) => ({ m, n: apply(s, m.a, m.b, m.path), wins: 0, runs: 0 }));
  // a move after which the opponent cannot move wins at once
  for (const x of scored) if (!hasMove(x.n)) return x.m;
  const deadline = Date.now() + (level === "hard" ? 1800 : 600);
  let round = 0;
  while (Date.now() < deadline && round < 400) {
    for (const x of scored) { if (playout(x.n) === me) x.wins += 1; x.runs += 1; }
    round += 1;
  }
  scored.sort((p, q) => q.wins / q.runs - p.wins / p.runs);
  return scored[0].m;
}
