/**
 * Yahtzee rules and computer player. The state is plain JSON and carries its own random seed (rs),
 * so both players of an online game roll the same dice.
 */
import { rnd } from "../../assets/cards-kit.js";

export const CATS = ["Aces", "Twos", "Threes", "Fours", "Fives", "Sixes", "Three of a kind", "Four of a kind", "Full house", "Small straight", "Large straight", "YAHTZEE", "Chance"];
export const HINTS = ["Sum of 1s", "Sum of 2s", "Sum of 3s", "Sum of 4s", "Sum of 5s", "Sum of 6s", "3+ the same: all dice", "4+ the same: all dice", "3 + 2: 25", "4 in a row: 30", "5 in a row: 40", "5 the same: 50", "All dice"];
export const YAHTZEE = 11;
const PAR = [2.1, 5.3, 8.6, 12.2, 15.7, 19.2, 21.7, 13.1, 22.6, 29.5, 32.7, 16.9, 22.0];

export function newGame(seed, n) {
  return { n, rs: seed >>> 0, turn: 0, dice: [0, 0, 0, 0, 0], held: [false, false, false, false, false], rolls: 0, round: 1, cards: Array.from({ length: n }, () => Array(13).fill(null)), yb: Array(n).fill(0), over: false, winner: -1 };
}

const counts = (dice) => { const c = [0, 0, 0, 0, 0, 0, 0]; dice.forEach((d) => { c[d] += 1; }); return c; };
export const isYahtzee = (dice) => dice[0] > 0 && dice.every((d) => d === dice[0]);

/** What the dice are worth in a category. `joker` (an extra Yahtzee) lets a Yahtzee count as a full house or a straight. */
export function scoreOf(cat, dice, joker = false) {
  const c = counts(dice);
  const sum = dice.reduce((t, d) => t + d, 0);
  if (cat < 6) return c[cat + 1] * (cat + 1);
  if (cat === 6) return c.some((v) => v >= 3) ? sum : 0;
  if (cat === 7) return c.some((v) => v >= 4) ? sum : 0;
  if (cat === 8) return joker || (c.some((v) => v === 3) && c.some((v) => v === 2)) ? 25 : 0;
  if (cat === 9) { const has = (a) => a.every((x) => c[x] > 0); return joker || has([1, 2, 3, 4]) || has([2, 3, 4, 5]) || has([3, 4, 5, 6]) ? 30 : 0; }
  if (cat === 10) { const has = (a) => a.every((x) => c[x] > 0); return joker || has([1, 2, 3, 4, 5]) || has([2, 3, 4, 5, 6]) ? 40 : 0; }
  if (cat === 11) return isYahtzee(dice) ? 50 : 0;
  return sum;
}

const jokerNow = (s) => isYahtzee(s.dice) && s.cards[s.turn][YAHTZEE] === 50;
export const open = (s) => s.cards[s.turn].map((v, i) => (v === null ? i : -1)).filter((i) => i >= 0);

export function roll(s, held) {
  if (s.over || s.rolls >= 3) return false;
  if (s.rolls > 0) s.held = held.map(Boolean);
  else s.held = [false, false, false, false, false];
  for (let i = 0; i < 5; i += 1) if (!s.held[i]) s.dice[i] = 1 + Math.floor(rnd(s) * 6);
  s.rolls += 1;
  return true;
}

export function totals(card, yb = 0) {
  const upper = card.slice(0, 6).reduce((t, v) => t + (v || 0), 0);
  const bonus = upper >= 63 ? 35 : 0;
  const lower = card.slice(6).reduce((t, v) => t + (v || 0), 0);
  return { upper, bonus, lower, yb: yb * 100, total: upper + bonus + lower + yb * 100 };
}

/** Score the current dice in a category and pass the turn. Returns the points, or null if not allowed. */
export function scoreCat(s, cat) {
  if (s.over || s.rolls === 0 || cat < 0 || cat > 12 || s.cards[s.turn][cat] !== null) return null;
  const joker = jokerNow(s);
  if (isYahtzee(s.dice) && s.cards[s.turn][YAHTZEE] === 50) s.yb[s.turn] += 1;
  const pts = scoreOf(cat, s.dice, joker);
  s.cards[s.turn][cat] = pts;
  s.dice = [0, 0, 0, 0, 0];
  s.held = [false, false, false, false, false];
  s.rolls = 0;
  s.turn = (s.turn + 1) % s.n;
  if (s.turn === 0) s.round += 1;
  if (s.round > 13) {
    s.over = true;
    const t = s.cards.map((c, i) => totals(c, s.yb[i]).total);
    const best = Math.max(...t);
    s.winner = t.filter((v) => v === best).length > 1 ? -1 : t.indexOf(best);
  }
  return pts;
}

/** Points on offer for each open category with the dice as they are now. */
export function options(s) {
  const joker = jokerNow(s);
  return open(s).map((cat) => ({ cat, pts: scoreOf(cat, s.dice, joker) }));
}

// ---------- computer ----------
const gain = (cat, pts) => {
  if (cat < 6) return pts - 3 * (cat + 1) + 1 - (cat < 2 ? 0 : 0) - 0 + (3 * (cat + 1) - PAR[cat]) * 0.3;
  return pts - PAR[cat];
};
const bestGain = (s, dice) => {
  const joker = isYahtzee(dice) && s.cards[s.turn][YAHTZEE] === 50;
  let best = -1e9;
  open(s).forEach((cat) => { const g = gain(cat, scoreOf(cat, dice, joker)); if (g > best) best = g; });
  return best;
};

export function chooseCat(s, level) {
  const joker = jokerNow(s);
  let best = -1;
  let bv = -1e9;
  open(s).forEach((cat) => {
    const pts = scoreOf(cat, s.dice, joker);
    const v = level === "easy" ? pts + Math.random() * 3 : gain(cat, pts) + Math.random() * 0.1;
    if (v > bv) { bv = v; best = cat; }
  });
  return best;
}

/** Which dice to keep: an array of 5 booleans, or null to stop rolling and score. */
export function chooseHold(s, level) {
  const d = s.dice;
  if (level === "easy") {
    const c = counts(d);
    let face = 6;
    for (let v = 6; v >= 1; v -= 1) if (c[v] > c[face]) face = v;
    if (c[face] >= 4 || s.rolls >= 3) return null;
    return d.map((x) => x === face);
  }
  const K = level === "hard" ? 300 : 60;
  let bestMask = null;
  let bv = -1e9;
  const seen = new Set();
  for (let m = 0; m < 32; m += 1) {
    const mask = d.map((_, i) => !!(m & (1 << i)));
    const key = d.map((x, i) => (mask[i] ? x : 0)).sort().join("");
    if (seen.has(key)) continue;
    seen.add(key);
    let tot = 0;
    for (let k = 0; k < K; k += 1) {
      const t = d.map((x, i) => (mask[i] ? x : 1 + Math.floor(Math.random() * 6)));
      tot += bestGain(s, t);
    }
    const v = tot / K;
    if (v > bv) { bv = v; bestMask = mask; }
  }
  // standing pat (keeping everything) is the same as scoring now
  if (bestMask.every(Boolean)) return null;
  if (bestGain(s, d) >= bv) return null;
  return bestMask;
}
