/**
 * Yahtzee rules and computer player. The state is plain JSON and carries its own random seed (rs), so both players
 * of an online game roll identical dice. cards[p][i] is the score player p wrote in category i (null while open).
 */
import { rnd } from "../../assets/cards-kit.js";

export const CATS = [
  { id: "ones", label: "Ones", sec: "up", face: 1 },
  { id: "twos", label: "Twos", sec: "up", face: 2 },
  { id: "threes", label: "Threes", sec: "up", face: 3 },
  { id: "fours", label: "Fours", sec: "up", face: 4 },
  { id: "fives", label: "Fives", sec: "up", face: 5 },
  { id: "sixes", label: "Sixes", sec: "up", face: 6 },
  { id: "three", label: "Three of a kind", sec: "low" },
  { id: "four", label: "Four of a kind", sec: "low" },
  { id: "full", label: "Full house", sec: "low" },
  { id: "small", label: "Small straight", sec: "low" },
  { id: "large", label: "Large straight", sec: "low" },
  { id: "yahtzee", label: "Yahtzee", sec: "low" },
  { id: "chance", label: "Chance", sec: "low" },
];
export const YAHTZEE = 11;
export const HINTS = ["Add up the ones", "Add up the twos", "Add up the threes", "Add up the fours", "Add up the fives", "Add up the sixes", "Three alike: add all the dice", "Four alike: add all the dice", "Three of one and two of another: 25", "Four in a row: 30", "Five in a row: 40", "Five alike: 50", "Any dice: add them up"];

export function initial(n, seed) {
  return { n, rs: seed >>> 0, turn: 0, round: 1, dice: [1, 1, 1, 1, 1], rolls: 0, cards: Array.from({ length: n }, () => Array(13).fill(null)), bonus: Array(n).fill(0), over: false };
}

const counts = (dice) => { const c = [0, 0, 0, 0, 0, 0, 0]; dice.forEach((d) => { c[d] += 1; }); return c; };
const sum = (dice) => dice.reduce((a, b) => a + b, 0);
export const isYahtzee = (dice) => dice.every((d) => d === dice[0]);

/** What `dice` is worth in category `i`. With `joker` (an extra Yahtzee), full house and straights count at full value. */
export function scoreFor(dice, i, joker = false) {
  const c = counts(dice);
  const cat = CATS[i];
  if (cat.sec === "up") return c[cat.face] * cat.face;
  switch (cat.id) {
    case "three": return c.some((v) => v >= 3) ? sum(dice) : 0;
    case "four": return c.some((v) => v >= 4) ? sum(dice) : 0;
    case "full": return joker || (c.includes(3) && c.includes(2)) ? 25 : 0;
    case "small": return joker || [1, 2, 3].some((a) => [a, a + 1, a + 2, a + 3].every((v) => c[v] > 0)) ? 30 : 0;
    case "large": return joker || [1, 2].some((a) => [a, a + 1, a + 2, a + 3, a + 4].every((v) => c[v] > 0)) ? 40 : 0;
    case "yahtzee": return isYahtzee(dice) ? 50 : 0;
    default: return sum(dice);
  }
}
const jokerNow = (s) => s.rolls > 0 && isYahtzee(s.dice) && s.cards[s.turn][YAHTZEE] !== null;

/** Open categories and what the current dice would score in each. */
export function options(s) {
  if (s.over || s.rolls === 0) return [];
  const joker = jokerNow(s);
  const out = [];
  s.cards[s.turn].forEach((v, i) => { if (v === null) out.push({ cat: i, score: scoreFor(s.dice, i, joker) }); });
  return out;
}

/** Roll the dice that are not held (held = five booleans). Returns false when a roll isn't allowed. */
export function roll(s, held) {
  if (s.over || s.rolls >= 3) return false;
  const keep = s.rolls === 0 ? [false, false, false, false, false] : held;
  if (!Array.isArray(keep) || keep.length !== 5) return false;
  s.dice = s.dice.map((d, i) => (keep[i] ? d : 1 + Math.floor(rnd(s) * 6)));
  s.rolls += 1;
  return true;
}

/** Write the current dice into category i for the current player, then pass the turn. Returns the points, or null. */
export function score(s, i) {
  if (s.over || s.rolls === 0 || !(i >= 0 && i < 13) || s.cards[s.turn][i] !== null) return null;
  const joker = jokerNow(s);
  const pts = scoreFor(s.dice, i, joker);
  if (isYahtzee(s.dice) && s.cards[s.turn][YAHTZEE] === 50) s.bonus[s.turn] += 1;
  s.cards[s.turn][i] = pts;
  s.rolls = 0;
  s.dice = [1, 1, 1, 1, 1];
  s.turn = (s.turn + 1) % s.n;
  if (s.turn === 0) { s.round += 1; if (s.round > 13) s.over = true; }
  return pts;
}

export function totals(s, p) {
  const c = s.cards[p];
  const upper = c.slice(0, 6).reduce((a, v) => a + (v || 0), 0);
  const upperBonus = upper >= 63 ? 35 : 0;
  const lower = c.slice(6).reduce((a, v) => a + (v || 0), 0);
  const yb = s.bonus[p] * 100;
  return { upper, upperBonus, lower, yb, total: upper + upperBonus + lower + yb };
}

// ---------- computer ----------
// rough worth of keeping a category open (the average score a player ends up with there)
const PAR = [2.1, 5.3, 8.6, 12.2, 15.7, 19, 21, 13, 16, 22, 24, 12, 22];
function bestGain(s, dice, joker) {
  let best = -1e9;
  let bi = -1;
  s.cards[s.turn].forEach((v, i) => {
    if (v !== null) return;
    let g = scoreFor(dice, i, joker) - PAR[i];
    if (i < 6 && scoreFor(dice, i) >= 3 * CATS[i].face) g += 3; // keeps the 63-point bonus in reach
    if (g > best) { best = g; bi = i; }
  });
  return { gain: best, cat: bi };
}
const rollOnce = (dice, mask) => dice.map((d, i) => (mask[i] ? d : 1 + Math.floor(Math.random() * 6)));

/** Decide the computer's next step: { stop: true, cat } to score, or { mask } listing the dice to keep. */
export function decide(s, level) {
  const joker = isYahtzee(s.dice) && s.cards[s.turn][YAHTZEE] !== null;
  const now = bestGain(s, s.dice, joker);
  if (s.rolls >= 3) return { stop: true, cat: now.cat };
  if (level === "easy") {
    const c = counts(s.dice);
    const face = c.indexOf(Math.max(...c.slice(1)), 1);
    if (now.gain > 8 || (s.rolls === 2 && now.gain > 2)) return { stop: true, cat: now.cat };
    const mask = s.dice.map((d) => d === face);
    return mask.every(Boolean) ? { stop: true, cat: now.cat } : { mask };
  }
  const samples = level === "hard" ? 90 : 35;
  let bestMask = null;
  let bestAvg = -1e9;
  const seen = new Set();
  for (let m = 0; m < 32; m += 1) {
    const mask = [0, 1, 2, 3, 4].map((i) => !!(m & (1 << i)));
    const key = s.dice.map((d, i) => (mask[i] ? d : 0)).sort().join("");
    if (seen.has(key)) continue;
    seen.add(key);
    let tot = 0;
    for (let k = 0; k < samples; k += 1) {
      const d2 = rollOnce(s.dice, mask);
      const j2 = isYahtzee(d2) && s.cards[s.turn][YAHTZEE] !== null;
      tot += bestGain(s, d2, j2).gain;
    }
    const avg = tot / samples + (s.rolls === 1 ? 1.2 : 0); // a roll in hand is worth a little more than the next sample says
    if (avg > bestAvg) { bestAvg = avg; bestMask = mask; }
  }
  if (now.gain >= bestAvg || bestMask.every(Boolean)) return { stop: true, cat: now.cat };
  return { mask: bestMask };
}
