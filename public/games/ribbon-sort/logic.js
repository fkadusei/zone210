// Ribbon Sort: the rules, with no page in them, so they can be checked in Node (tools/check-ribbon-sort.mjs).
// A position is a list of poles; each pole is a list of colors (numbers), bottom first. A move takes the top run of
// one color from a pole and puts as many of those rolls as fit onto another pole that is empty or has the same color
// on top. It is sorted when every pole is empty or full of one color.

// how big each kind of puzzle is: colors, rolls a pole holds, and empty poles to work with
export const MODES = {
  easy: { colors: 3, cap: 4, spare: 2, label: "Easy" },
  medium: { colors: 5, cap: 4, spare: 2, label: "Medium" },
  hard: { colors: 7, cap: 5, spare: 2, label: "Hard" },
  tall: { colors: 3, cap: 10, spare: 1, label: "Tall stacks" }, // like a table of ribbon rolls: three colors, four tall poles
};

/** A random number maker that gives the same numbers for the same seed. */
export function seeded(seed) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
/** The seed of puzzle number n (from 1) of a kind, so puzzle 3 of Easy is always the same puzzle. */
export const seedOf = (mode, n) => { let h = 2166136261; for (const ch of `${mode}:${n}`) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return h >>> 0; };

const top = (p) => p[p.length - 1];
/** How many rolls of the top color sit together at the top of a pole. */
export function runOf(p) { let k = p.length - 1; while (k > 0 && p[k - 1] === p[p.length - 1]) k -= 1; return p.length - k; }
export const canMove = (s, a, b, cap) => a !== b && s[a].length > 0 && s[b].length < cap && (s[b].length === 0 || top(s[b]) === top(s[a]));
/** The position after moving from pole a to pole b, and how many rolls went. */
export function move(s, a, b, cap) {
  const n = Math.min(runOf(s[a]), cap - s[b].length);
  const t = s.map((p) => p.slice());
  t[b].push(...t[a].splice(t[a].length - n, n));
  return { s: t, n };
}
const done = (p, cap) => p.length === 0 || (p.length === cap && runOf(p) === cap);
export const solved = (s, cap) => s.every((p) => done(p, cap));
/** How far along it is, 0 to 100: the rolls already gathered at the bottom of a pole with only their own color beneath. */
export function progress(s, cap) {
  const total = s.reduce((m, p) => m + p.length, 0);
  let good = 0;
  for (const p of s) { let k = 0; while (k < p.length && p[k] === p[0]) k += 1; if (k > 1 || (k === p.length && k)) good += k; }
  return solved(s, cap) ? 100 : Math.min(99, Math.round((100 * good) / Math.max(1, total)));
}

/** Moves worth trying from a position, the most useful first; pointless ones (moving a finished pole, or a pole of one color onto an empty one) left out. */
function choices(s, cap) {
  const out = [];
  for (let a = 0; a < s.length; a += 1) {
    const p = s[a];
    if (!p.length || done(p, cap)) continue;
    const r = runOf(p), whole = r === p.length;
    let emptyTried = false;
    for (let b = 0; b < s.length; b += 1) {
      if (!canMove(s, a, b, cap)) continue;
      if (!s[b].length) { if (whole || emptyTried) continue; emptyTried = true; } // one empty pole is as good as another
      const fits = Math.min(r, cap - s[b].length);
      out.push({ a, b, score: (s[b].length ? 10 : 0) + (fits === r ? 5 : 0) + (s[b].length && runOf(s[b]) === s[b].length ? 4 : 0) });
    }
  }
  return out.sort((x, y) => y.score - x.score);
}
const keyOf = (s) => s.map((p) => p.join(",")).sort().join("|"); // poles are interchangeable

/** A way to sort it from here, as a list of [from, to], or null if none is found within `limit` positions. */
export function solve(start, cap, limit = 200000) {
  const seen = new Set([keyOf(start)]), path = [];
  let tried = 0;
  const go = (s) => {
    if (solved(s, cap)) return true;
    if ((tried += 1) > limit) return false;
    for (const { a, b } of choices(s, cap)) {
      const t = move(s, a, b, cap).s, k = keyOf(t);
      if (seen.has(k)) continue;
      seen.add(k);
      path.push([a, b]);
      if (go(t)) return true;
      path.pop();
      if (tried > limit) return false;
    }
    return false;
  };
  return go(start) ? path : null;
}

/** A new puzzle of a kind from a seed: the rolls shuffled onto the poles, one that can certainly be sorted. */
export function deal(mode, seed) {
  const m = MODES[mode] || MODES.easy;
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const rnd = seeded(seed + attempt * 7919);
    const rolls = [];
    for (let c = 0; c < m.colors; c += 1) for (let k = 0; k < m.cap; k += 1) rolls.push(c);
    for (let i = rolls.length - 1; i > 0; i -= 1) { const j = Math.floor(rnd() * (i + 1)); [rolls[i], rolls[j]] = [rolls[j], rolls[i]]; }
    const s = [];
    for (let c = 0; c < m.colors; c += 1) s.push(rolls.slice(c * m.cap, (c + 1) * m.cap));
    for (let k = 0; k < m.spare; k += 1) s.push([]);
    // not too easy: no pole already holding three of a color together, and no pole finished at the start
    if (s.some((p) => p.length && (runOf(p) === p.length || p.some((v, i) => i >= 2 && p[i - 1] === v && p[i - 2] === v)))) continue;
    if (solve(s, m.cap, 60000)) return { poles: s, cap: m.cap, mode, seed };
  }
  // very unlikely: fall back to a puzzle made by playing backwards from sorted
  const s = Array.from({ length: m.colors }, (_, c) => new Array(m.cap).fill(c)).concat(Array.from({ length: m.spare }, () => []));
  return { poles: s.map((p, i) => (i < m.colors ? p.map((_, k) => (i + k) % m.colors) : p)), cap: m.cap, mode, seed };
}
