/** Dominoes (double-six, draw game) rules and a computer opponent. Pure functions, no DOM. */
export const ALL = (() => {
  const out = [];
  for (let a = 0; a <= 6; a += 1) for (let b = a; b <= 6; b += 1) out.push([a, b]);
  return out;
})();
export const pipsOf = (t) => t[0] + t[1];
export const total = (hand) => hand.reduce((n, t) => n + pipsOf(t), 0);

export function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deal 7 tiles each and leave 14 in the boneyard. The same seed always gives the same deal. */
export function deal(seed) {
  const rng = seeded(seed);
  const tiles = ALL.map((t) => t.slice());
  for (let i = tiles.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
  }
  return { hands: [tiles.slice(0, 7), tiles.slice(7, 14)], yard: tiles.slice(14) };
}

/** Who opens, and with which tile: the highest double, or failing that the heaviest tile. */
export function opener(hands) {
  let best = null;
  hands.forEach((h, p) => {
    h.forEach((t) => {
      const dbl = t[0] === t[1];
      const score = (dbl ? 100 : 0) + pipsOf(t) * 1 + (dbl ? 0 : Math.max(t[0], t[1]) / 10);
      if (!best || score > best.score) best = { p, tile: t, score };
    });
  });
  return best;
}

export const ends = (chain) => (chain.length ? [chain[0].a, chain[chain.length - 1].b] : [null, null]);

/** Sides a tile can be played on: "L" and/or "R". */
export function sidesFor(chain, t) {
  if (!chain.length) return ["R"];
  const [L, R] = ends(chain);
  const out = [];
  if (t[0] === L || t[1] === L) out.push("L");
  if (t[0] === R || t[1] === R) out.push("R");
  return out;
}

export function place(chain, t, side) {
  if (!chain.length) return [{ a: t[0], b: t[1] }];
  const [L, R] = ends(chain);
  if (side === "L") {
    const node = t[1] === L ? { a: t[0], b: t[1] } : { a: t[1], b: t[0] };
    return [node, ...chain];
  }
  const node = t[0] === R ? { a: t[0], b: t[1] } : { a: t[1], b: t[0] };
  return [...chain, node];
}

export const playable = (chain, hand) => hand.filter((t) => sidesFor(chain, t).length);
export const same = (x, y) => x[0] === y[0] && x[1] === y[1];
export const indexOfTile = (hand, t) => hand.findIndex((h) => same(h, t) || (h[0] === t[1] && h[1] === t[0]));

// ---------- computer player ----------
/** moves: [{ tile, side }] for the computer's hand. voids: numbers the opponent is known not to have. */
export function chooseMove(chain, hand, yardLeft, voids, level = "normal") {
  const moves = [];
  hand.forEach((t) => sidesFor(chain, t).forEach((side) => moves.push({ tile: t, side })));
  if (!moves.length) return null;
  if (level === "easy") return moves[Math.floor(Math.random() * moves.length)];
  const scored = moves.map((m) => {
    const after = place(chain, m.tile, m.side);
    const [L, R] = ends(after);
    const rest = hand.filter((h) => !same(h, m.tile));
    let v = pipsOf(m.tile) * 1.2;
    if (m.tile[0] === m.tile[1]) v += 3;
    // keep options: ends I can follow up on
    const support = rest.filter((h) => h.includes(L) || h.includes(R)).length;
    v += support * 2.2;
    // hold a mixture of numbers
    v += new Set(rest.flatMap((h) => h)).size * 0.6;
    if (level === "hard") {
      if (voids.has(L)) v += 7;
      if (voids.has(R)) v += 7;
      if (L === R) v += 2;
      // how many of each end number are still unseen by me (more unseen = more chances for the opponent)
      const seen = (n) => chain.reduce((c, x) => c + (x.a === n) + (x.b === n), 0) + hand.reduce((c, h) => c + (h[0] === n) + (h[1] === n), 0);
      v -= (7 - Math.min(7, seen(L) + 0)) * 0.5 + (7 - Math.min(7, seen(R))) * 0.5;
      if (yardLeft === 0 && rest.length <= 2) v += pipsOf(m.tile) * 0.5;
    } else v += Math.random() * 2;
    return { m, v };
  });
  scored.sort((a, b) => b.v - a.v);
  return scored[0].m;
}
