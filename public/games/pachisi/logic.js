/**
 * Pachisi rules and a computer opponent. Pure functions, no DOM.
 *
 * The board is a cross with an outer track of 68 squares (4 arms x 17). Seat 0 sits at the top arm, 1 right, 2 bottom, 3 left.
 * Every seat starts on the "tip" of its own arm (ring index TIPS[seat]) and travels clockwise round the whole track (positions 0..67 relative
 * to its start), then up its own home column (68..74) to the centre (75), which must be reached by an exact throw
 * (the last home square counts as reaching the centre, because no throw is a 1).
 * Pieces wait in the yard (-1) until a "grace" throw lets them enter on the start square.
 *
 * Six cowrie shells are thrown. The number landing mouth-up gives the move: 0 -> 12, 1 -> 10, 2 -> 2, 3 -> 3, 4 -> 4, 5 -> 25, 6 -> 6.
 * Graces (0, 1, 5 and 6 up: 12, 10, 25 and 6) bring pieces out of the yard and give another throw.
 * Landing on a single opposing piece captures it (it returns to its yard) unless the square is a castle (safe). A capture, a grace
 * and reaching the centre each give another throw. Two pieces of one colour on a square form a block that opponents cannot pass or land on.
 */
export const RING = 68;
export const TIPS = [8, 25, 42, 59];
export const HOME_START = 68;
export const CENTRE = 75;
export const VALUE_OF = [12, 10, 2, 3, 4, 25, 6]; // by number of shells mouth-up
export const GRACE = [true, true, false, false, false, true, true];
const BIN = [1, 6, 15, 20, 15, 6, 1];
export const SAFE = new Set(TIPS.flatMap((t) => [t, (t + 5) % RING, (t + RING - 5) % RING]));
export const absOf = (seat, rel) => (TIPS[seat] + rel) % RING;
/** Probability of throwing a move of exactly `v` squares. */
export const probOf = (v) => { const k = VALUE_OF.indexOf(v); return k < 0 ? 0 : BIN[k] / 64; };
export function throwShells(rng = Math.random) {
  const shells = Array.from({ length: 6 }, () => rng() < 0.5);
  const k = shells.filter(Boolean).length;
  return { shells, k, v: VALUE_OF[k], grace: GRACE[k] };
}
export const throwFromK = (k) => ({ k, v: VALUE_OF[k], grace: GRACE[k] });

export const SEATS_FOR = { 2: [0, 2], 3: [0, 1, 2], 4: [0, 1, 2, 3] };
export function initial(players) {
  const seats = SEATS_FOR[players];
  const pos = [[-1, -1, -1, -1], [-1, -1, -1, -1], [-1, -1, -1, -1], [-1, -1, -1, -1]];
  return { pos, seats, turn: 0, last: null };
}
export const clone = (s) => ({ pos: s.pos.map((a) => a.slice()), seats: s.seats, turn: s.turn, last: s.last });
export const seatOf = (s) => s.seats[s.turn];
export const finished = (s, seat) => s.pos[seat].every((p) => p === CENTRE);
export const homeCount = (s, seat) => s.pos[seat].filter((p) => p === CENTRE).length;

/** pieces on each ring square: abs -> [{seat, piece}] */
export function occupancy(s) {
  const occ = new Map();
  for (const seat of s.seats) s.pos[seat].forEach((p, piece) => {
    if (p < 0 || p >= HOME_START) return;
    const a = absOf(seat, p);
    if (!occ.has(a)) occ.set(a, []);
    occ.get(a).push({ seat, piece });
  });
  return occ;
}
const blockAt = (occ, a, seat) => { const list = occ.get(a); if (!list) return false; const by = {}; for (const o of list) if (o.seat !== seat) by[o.seat] = (by[o.seat] || 0) + 1; return Object.values(by).some((n) => n >= 2); };

/** Legal moves for `seat` with throw `t` ({v, grace}). */
export function legalMoves(s, seat, t) {
  const occ = occupancy(s);
  const out = [];
  s.pos[seat].forEach((p, piece) => {
    if (p === CENTRE) return;
    if (p === -1) {
      if (!t.grace) return;
      const a = absOf(seat, 0);
      if (blockAt(occ, a, seat)) return;
      out.push({ piece, from: -1, to: 0, enter: true, capture: null });
      return;
    }
    let to = p + t.v;
    if (to === CENTRE - 1) to = CENTRE; // no throw is a 1, so the square next to the centre counts as reaching it
    if (to > CENTRE) return;
    for (let q = p + 1; q <= Math.min(to, HOME_START - 1); q += 1) if (blockAt(occ, absOf(seat, q), seat)) return;
    let capture = null;
    if (to < HOME_START) {
      const a = absOf(seat, to);
      const others = (occ.get(a) || []).filter((o) => o.seat !== seat);
      if (others.length === 1 && !SAFE.has(a)) capture = others[0];
    }
    out.push({ piece, from: p, to, enter: false, capture });
  });
  return out;
}

/** Applies a move for the current seat. Returns { s, extra } where extra means the same seat throws again. */
export function apply(s, seat, m, t) {
  const n = clone(s);
  n.pos[seat][m.piece] = m.to;
  if (m.capture) n.pos[m.capture.seat][m.capture.piece] = -1;
  const extra = !!(t.grace || m.capture || m.to === CENTRE);
  n.last = { seat, piece: m.piece, from: m.from, to: m.to, capture: m.capture };
  return { s: n, extra };
}
export function nextTurn(s) { const n = clone(s); n.turn = (s.turn + 1) % s.seats.length; return n; }

// ---------- computer player ----------
function threat(s, seat, rel) {
  // chance that an opponent hits a piece of `seat` standing on ring position `rel` with their next throw
  if (rel < 0 || rel >= HOME_START) return 0;
  const a = absOf(seat, rel);
  if (SAFE.has(a)) return 0;
  let p = 0;
  for (const o of s.seats) {
    if (o === seat) continue;
    s.pos[o].forEach((q) => {
      if (q < 0 || q >= HOME_START) return;
      const from = absOf(o, q);
      const d = (a - from + RING) % RING;
      if (d >= 1 && d <= 25 && q + d <= HOME_START - 1) p += probOf(d);
    });
  }
  return Math.min(1, p);
}
export const TUNE = { prog: 0.25, risk: 2.2, block: 4, capture: 90, enter: 48, safe: 30, home: 20 }; // 'hard' weights, tuned by self-play
export function chooseMove(s, seat, t, level = "normal") {
  const moves = legalMoves(s, seat, t);
  if (!moves.length) return null;
  if (level === "easy") return moves[Math.floor(Math.random() * moves.length)];
  const hard = level === "hard";
  let best = moves[0];
  let bestV = -Infinity;
  for (const m of moves) {
    const { s: n } = apply(s, seat, m, t);
    let v = 0;
    if (m.capture) v += (hard ? TUNE.capture : 90) + (s.pos[m.capture.seat][m.capture.piece] * 0.8);
    if (m.to === CENTRE) v += 85;
    else if (m.to >= HOME_START) v += (hard ? TUNE.home : 35) + (m.from < HOME_START ? 20 : 0);
    if (m.enter) v += hard ? TUNE.enter : 48;
    const dest = m.to < HOME_START ? absOf(seat, m.to) : -1;
    if (dest >= 0 && SAFE.has(dest)) v += hard ? TUNE.safe : 16;
    v += m.to * (hard ? TUNE.prog : 0.4);
    // danger on arrival versus danger left behind
    const risk = threat(n, seat, m.to);
    const was = m.from >= 0 ? threat(s, seat, m.from) : 0;
    v += (was - risk) * ((m.to < HOME_START ? m.to : 40) + 12) * (hard ? TUNE.risk : 0.9);
    // making a block (two of ours together) protects both
    if (m.to > 0 && m.to < HOME_START && s.pos[seat].some((q, i) => i !== m.piece && q === m.to)) v += hard ? TUNE.block : 8;
    // keep pieces from being stranded at the very end waiting for an exact throw
    if (hard && m.to > 70 && m.to < CENTRE) v -= 4;
    v += Math.random() * (hard ? 0.5 : 3);
    if (v > bestV) { bestV = v; best = m; }
  }
  return best;
}
