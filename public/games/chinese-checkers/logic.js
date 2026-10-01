/**
 * Chinese Checkers rules and a computer opponent. Pure functions, no DOM.
 * 121 holes laid out in 17 rows (1,2,3,4,13,12,11,10,9,10,11,12,13,4,3,2,1). A hole is {r, x}: row r and a horizontal
 * position x where neighbouring holes in a row are 2 apart and holes in adjacent rows are 1 apart.
 * Six corner triangles ("zones") of 10 holes: 0 top, 1 upper right, 2 lower right, 3 bottom, 4 lower left, 5 upper left.
 * Each player starts in one zone and races to fill the opposite one.
 */
export const COUNTS = [1, 2, 3, 4, 13, 12, 11, 10, 9, 10, 11, 12, 13, 4, 3, 2, 1];
export const HOLES = [];
const index = new Map();
COUNTS.forEach((n, r) => { for (let k = 0; k < n; k += 1) { const x = 2 * k - (n - 1); index.set(r * 100 + x + 30, HOLES.length); HOLES.push({ r, x }); } });
export const holeAt = (r, x) => (index.has(r * 100 + x + 30) ? index.get(r * 100 + x + 30) : -1);
const DIRS = [[0, -2], [0, 2], [-1, -1], [-1, 1], [1, -1], [1, 1]];
export const NEIGH = HOLES.map((h) => DIRS.map(([dr, dx]) => holeAt(h.r + dr, h.x + dx)));
export const JUMPS = HOLES.map((h) => DIRS.map(([dr, dx]) => { const o = holeAt(h.r + dr, h.x + dx); const l = holeAt(h.r + 2 * dr, h.x + 2 * dx); return o >= 0 && l >= 0 ? [o, l] : null; }));

export const zoneOf = HOLES.map((h) => {
  const { r, x } = h;
  if (r <= 3) return 0;
  if (r >= 13) return 3;
  if (r >= 4 && r <= 7) { const lim = 6 + (r - 4); return x >= lim ? 1 : x <= -lim ? 5 : -1; }
  if (r >= 9 && r <= 12) { const lim = 18 - r; return x >= lim ? 2 : x <= -lim ? 4 : -1; }
  return -1;
});
export const zoneHoles = (z) => HOLES.map((_, i) => i).filter((i) => zoneOf[i] === z);
export const opposite = (z) => (z + 3) % 6;
export const ZONES_FOR = { 2: [0, 3], 3: [0, 2, 4], 4: [1, 2, 4, 5], 6: [0, 1, 2, 3, 4, 5] };
// the outer corner hole of each zone, used to measure progress
export const TIP = [holeAt(0, 0), holeAt(4, 12), holeAt(12, 12), holeAt(16, 0), holeAt(12, -12), holeAt(4, -12)];
export function dist(a, b) {
  const dr = Math.abs(HOLES[a].r - HOLES[b].r);
  const dx = Math.abs(HOLES[a].x - HOLES[b].x);
  return dr + Math.max(0, (dx - dr) / 2);
}

/** state: { b: Int8Array-like of 121 (seat index or -1), zones: [zone per seat], turn: seat } */
export function initial(players) {
  const zones = ZONES_FOR[players];
  const b = Array(HOLES.length).fill(-1);
  zones.forEach((z, seat) => zoneHoles(z).forEach((i) => { b[i] = seat; }));
  return { b, zones, turn: 0 };
}
export const clone = (s) => ({ b: s.b.slice(), zones: s.zones, turn: s.turn });

/** All holes reachable from `from` this turn with the path to each: a single step, or a chain of hops over any pieces. */
export function reachable(s, from) {
  const paths = new Map();
  for (const n of NEIGH[from]) if (n >= 0 && s.b[n] === -1) paths.set(n, [from, n]);
  const seen = new Set([from]);
  const stack = [from];
  const route = new Map([[from, [from]]]);
  while (stack.length) {
    const cur = stack.pop();
    for (const j of JUMPS[cur]) {
      if (!j) continue;
      const [over, land] = j;
      if (s.b[over] === -1 || s.b[land] !== -1 || seen.has(land)) continue;
      seen.add(land);
      const p = route.get(cur).concat([land]);
      route.set(land, p);
      if (!paths.has(land)) paths.set(land, p);
      stack.push(land);
    }
  }
  return paths;
}
export function legalMoves(s, seat = s.turn) {
  const out = [];
  for (let i = 0; i < s.b.length; i += 1) {
    if (s.b[i] !== seat) continue;
    for (const [to, path] of reachable(s, i)) out.push({ from: i, to, path });
  }
  return out;
}
export const apply = (s, m) => { const n = clone(s); n.b[m.to] = n.b[m.from]; n.b[m.from] = -1; n.turn = (s.turn + 1) % s.zones.length; return n; };
export function won(s, seat) {
  const target = opposite(s.zones[seat]);
  let outside = false;
  for (let i = 0; i < s.b.length; i += 1) if (s.b[i] === seat && zoneOf[i] !== target) { outside = true; break; }
  if (!outside) return true;
  // blocked finish: the target is full, and the opposing marbles still inside it cannot move, so nobody can ever fill it
  const holes = zoneHoles(target);
  let own = 0;
  const foreign = [];
  for (const i of holes) { if (s.b[i] === -1) return false; if (s.b[i] === seat) own += 1; else foreign.push(i); }
  if (!own) return false;
  return foreign.every((i) => reachable(s, i).size === 0);
}
export const inTarget = (s, seat) => { const t = opposite(s.zones[seat]); let n = 0; for (let i = 0; i < s.b.length; i += 1) if (s.b[i] === seat && zoneOf[i] === t) n += 1; return n; };

// ---------- computer player ----------
function potential(s, seat) {
  const tip = TIP[opposite(s.zones[seat])];
  let v = 0;
  let worst = 0;
  for (let i = 0; i < s.b.length; i += 1) {
    if (s.b[i] !== seat) continue;
    const d = dist(i, tip);
    v += d;
    if (d > worst) worst = d;
  }
  return { sum: v, worst };
}
export function chooseMove(s, level = "normal") {
  const moves = legalMoves(s);
  if (!moves.length) return null;
  const seat = s.turn;
  const tip = TIP[opposite(s.zones[seat])];
  const target = opposite(s.zones[seat]);
  const base = potential(s, seat);
  if (level === "easy") {
    const fwd = moves.filter((m) => dist(m.to, tip) < dist(m.from, tip));
    if (fwd.length && Math.random() < 0.6) return fwd[Math.floor(Math.random() * fwd.length)];
    return moves[Math.floor(Math.random() * moves.length)];
  }
  let best = moves[0];
  let bestV = -Infinity;
  const scored = [];
  for (const m of moves) {
    const dFrom = dist(m.from, tip);
    const dTo = dist(m.to, tip);
    let v = dFrom - dTo; // progress of this move
    if (level === "hard") {
      v *= 1 + dFrom * 0.05; // moving the rearmost marbles forward is worth more
      const n = apply(s, m);
      const after = potential(n, seat);
      v -= (after.worst - base.worst) * 0.5; // do not leave stragglers behind
      if (zoneOf[m.from] === target && zoneOf[m.to] !== target) v -= 8;
    } else {
      v += Math.random() * 0.8;
      if (zoneOf[m.from] === target && zoneOf[m.to] !== target) v -= 6;
    }
    scored.push({ m, v });
  }
  if (level === "hard") {
    // look one of our own moves further ahead on the most promising candidates: this finds ladders of hops
    scored.sort((a, b) => b.v - a.v);
    for (const c of scored.slice(0, 14)) {
      const n = apply(s, c.m);
      n.turn = seat;
      let next = 0;
      for (const m2 of legalMoves(n, seat)) next = Math.max(next, dist(m2.from, tip) - dist(m2.to, tip));
      c.v += next * 0.6;
    }
  }
  for (const { m, v } of scored) {
    if (v > bestV) { bestV = v; best = m; }
  }
  return best;
}
