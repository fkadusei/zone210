/**
 * Whot rules (the West African card game). 54 cards: five shapes with the usual numbers, and five Whot (20) wild cards.
 *   1 Hold on: play again.   2 Pick two.   5 Pick three.   8 Suspension: the next player misses a turn.
 *   14 General market: everyone else picks one card.   20 Whot: wild, you call the shape.
 * A pick two / pick three can be passed on by playing another 2 / 5 (the penalty stacks).
 * The state is plain JSON and carries its own random seed (rs), so online players deal identically.
 */
import { shuffle } from "../../assets/cards-kit.js";

export const SHAPES = ["Circle", "Triangle", "Cross", "Square", "Star"];
const NUMS = [
  [1, 2, 3, 4, 5, 7, 8, 10, 11, 12, 13, 14],
  [1, 2, 3, 4, 5, 7, 8, 10, 11, 12, 13, 14],
  [1, 2, 3, 5, 7, 10, 11, 13, 14],
  [1, 2, 3, 5, 7, 10, 11, 13, 14],
  [1, 2, 3, 4, 5, 7, 8],
];
export const CARDS = [];
NUMS.forEach((nums, shape) => nums.forEach((num) => CARDS.push({ shape, num })));
for (let i = 0; i < 5; i += 1) CARDS.push({ shape: 5, num: 20 }); // Whot cards
export const shapeOf = (id) => CARDS[id].shape;
export const numOf = (id) => CARDS[id].num;
export const isWhot = (id) => CARDS[id].shape === 5;
export const cardName = (id) => (isWhot(id) ? "Whot 20" : `${SHAPES[shapeOf(id)]} ${numOf(id)}`);
export const points = (id) => numOf(id);
export const handPoints = (hand) => hand.reduce((t, id) => t + points(id), 0);
const SPECIAL = new Set([1, 2, 5, 8, 14, 20]);

export function deal(seed, n, first = 0) {
  const s = { n, rs: seed >>> 0, hands: [], draw: [], disc: [], turn: first, shape: 0, num: 0, pend: 0, pendNum: 0, over: false, winner: -1 };
  const deck = shuffle(Array.from({ length: CARDS.length }, (_, i) => i), s);
  const per = n === 2 ? 6 : 5;
  for (let p = 0; p < n; p += 1) s.hands.push(deck.splice(0, per));
  while (SPECIAL.has(numOf(deck[deck.length - 1]))) deck.unshift(deck.pop()); // the starting card is a plain one
  const top = deck.pop();
  s.disc = [top];
  s.draw = deck;
  s.shape = shapeOf(top);
  s.num = numOf(top);
  return s;
}

export function canPlay(s, id) {
  if (s.pend > 0) return numOf(id) === s.pendNum; // only another pick card can answer a pick penalty
  return isWhot(id) || shapeOf(id) === s.shape || numOf(id) === s.num;
}
export const legalPlays = (s, seat = s.turn) => s.hands[seat].filter((id) => canPlay(s, id));
export const needsChoice = (id) => isWhot(id);
export const choices = () => SHAPES.map((name, i) => ({ value: i, label: name, cls: `shape s${i}` }));
/** Going to market: allowed when you cannot play, or to take a pick penalty rather than answer it. */
export const canDrawNow = (s) => !s.over && s.draw.length > 0 && (s.pend > 0 || !legalPlays(s).length);
export const settle = () => {};

function marketEmpty(s) {
  if (s.over || s.draw.length) return;
  s.over = true;
  s.reason = "market";
  let best = 0;
  s.hands.forEach((h, i) => {
    const a = handPoints(h);
    const b = handPoints(s.hands[best]);
    if (a < b || (a === b && h.length < s.hands[best].length)) best = i;
  });
  s.winner = best;
}

function give(s, seat, count) {
  let got = 0;
  for (let k = 0; k < count && s.draw.length; k += 1) { s.hands[seat].push(s.draw.pop()); got += 1; }
  return got;
}

/** The player to move plays `id`; `shape` is the called shape for a Whot card. Returns notes, or null if illegal. */
export function play(s, id, shape) {
  const seat = s.turn;
  const hand = s.hands[seat];
  const i = hand.indexOf(id);
  if (s.over || i < 0 || !canPlay(s, id)) return null;
  if (needsChoice(id) && !(shape >= 0 && shape < 5)) return null;
  hand.splice(i, 1);
  s.disc.push(id);
  const num = numOf(id);
  s.num = num;
  s.shape = isWhot(id) ? shape : shapeOf(id);
  const notes = [];
  if (isWhot(id)) notes.push(`Called ${SHAPES[shape]}`);
  if (!hand.length) {
    s.over = true;
    s.winner = seat;
    s.reason = "out";
    return notes;
  }
  const next = (seat + 1) % s.n;
  if (num === 1) { notes.push("Hold on: plays again"); s.turn = seat; }
  else if (num === 2) { s.pend += 2; s.pendNum = 2; s.turn = next; notes.push(`Pick two${s.pend > 2 ? ` (now ${s.pend})` : ""}`); }
  else if (num === 5) { s.pend += 3; s.pendNum = 5; s.turn = next; notes.push(`Pick three${s.pend > 3 ? ` (now ${s.pend})` : ""}`); }
  else if (num === 8) { s.turn = (seat + 2) % s.n; notes.push("Suspension: next player misses a turn"); }
  else if (num === 14) {
    for (let k = 1; k < s.n; k += 1) give(s, (seat + k) % s.n, 1);
    s.turn = next;
    notes.push("General market: everyone else picks one");
  } else s.turn = next;
  marketEmpty(s);
  return notes;
}

/** The player to move goes to market: picks the penalty (or one card), then the turn passes. Returns the cards taken. */
export function draw(s) {
  if (s.over || !s.draw.length) return [];
  const seat = s.turn;
  const want = s.pend > 0 ? s.pend : 1;
  const before = s.hands[seat].length;
  give(s, seat, want);
  const got = s.hands[seat].slice(before);
  s.pend = 0;
  s.pendNum = 0;
  s.turn = (seat + 1) % s.n;
  marketEmpty(s);
  return got;
}

export function result(s) {
  const gain = s.hands.reduce((t, h, i) => (i === s.winner ? t : t + handPoints(h)), 0);
  return { winner: s.winner, gain, text: s.reason === "market" ? "The market ran out: the lowest hand wins." : "Played the last card." };
}

/** Computer move: { id, choice } to play, or null to go to market. */
export function choose(s, level) {
  const seat = s.turn;
  const hand = s.hands[seat];
  const plays = legalPlays(s, seat);
  if (!plays.length) return null;
  const callShape = (without) => {
    const c = [0, 0, 0, 0, 0];
    hand.forEach((id) => { if (id !== without && !isWhot(id)) c[shapeOf(id)] += 1; });
    let best = 0;
    c.forEach((v, i) => { if (v > c[best]) best = i; });
    return c[best] ? best : Math.floor(Math.random() * 5);
  };
  const pick = (id) => ({ id, choice: needsChoice(id) ? callShape(id) : undefined });
  if (s.pend > 0) return level === "easy" && Math.random() < 0.4 ? null : pick(plays[0]);
  if (level === "easy") return pick(plays[Math.floor(Math.random() * plays.length)]);
  const nextHand = s.hands[(seat + 1) % s.n].length;
  const attack = level === "hard" && nextHand <= 2 ? 10 : 0;
  const per = [0, 0, 0, 0, 0];
  hand.forEach((id) => { if (!isWhot(id)) per[shapeOf(id)] += 1; });
  let best = plays[0];
  let bestScore = -1e9;
  plays.forEach((id) => {
    const n = numOf(id);
    let sc = points(id) * 0.3 + Math.random() * 0.6;
    if (!isWhot(id)) sc += per[shapeOf(id)] * 0.8;
    if (n === 2) sc += (nextHand <= 3 ? 6 : 3) + attack;
    else if (n === 5) sc += (nextHand <= 3 ? 7 : 4) + attack;
    else if (n === 8) sc += 5 + attack;
    else if (n === 14) sc += 3 * (s.n - 1) + attack * 0.5;
    else if (n === 1) sc += 4;
    else if (n === 20) sc -= hand.length <= 2 ? 0 : 30; // keep the wild card for a tight spot
    if (sc > bestScore) { bestScore = sc; best = id; }
  });
  return pick(best);
}
