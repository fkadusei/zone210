/**
 * Crazy Eights rules. Card id = suit * 13 + (rank - 1); suits ♠ ♥ ♦ ♣, ranks A..K.
 * The state is plain JSON and carries its own random seed (rs), so online players reshuffle identically.
 */
import { shuffle } from "../../assets/cards-kit.js";

export const SUITS = ["♠", "♥", "♦", "♣"];
export const SUIT_NAMES = ["Spades", "Hearts", "Diamonds", "Clubs"];
export const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
export const suitOf = (id) => Math.floor(id / 13);
export const rankOf = (id) => (id % 13) + 1;
export const cardName = (id) => `${RANKS[rankOf(id) - 1]} of ${SUIT_NAMES[suitOf(id)]}`;
/** Score value of a card left in a hand: 8s are 50, face cards and 10 are 10, aces are 1. */
export const points = (id) => { const r = rankOf(id); return r === 8 ? 50 : r >= 10 ? 10 : r; };
export const handPoints = (hand) => hand.reduce((t, id) => t + points(id), 0);

/** A new round for n players (2 to 4). `first` is who plays first. */
export function deal(seed, n, first = 0) {
  const s = { n, rs: seed >>> 0, hands: [], draw: [], disc: [], turn: first, suit: 0, rank: 0, over: false, winner: -1, stuck: 0 };
  const deck = shuffle(Array.from({ length: 52 }, (_, i) => i), s);
  const per = n === 2 ? 7 : 5;
  for (let p = 0; p < n; p += 1) s.hands.push(deck.splice(0, per));
  while (rankOf(deck[deck.length - 1]) === 8) deck.unshift(deck.pop()); // the first card is never an 8
  const first0 = deck.pop();
  s.disc = [first0];
  s.draw = deck;
  s.suit = suitOf(first0);
  s.rank = rankOf(first0);
  return s;
}

export const canPlay = (s, id) => rankOf(id) === 8 || suitOf(id) === s.suit || rankOf(id) === s.rank;
export const legalPlays = (s, seat = s.turn) => s.hands[seat].filter((id) => canPlay(s, id));
export const canDraw = (s) => s.draw.length > 0 || s.disc.length > 1;
export const needsChoice = (id) => rankOf(id) === 8;
/** Choices offered when an 8 is played: the suit to call. */
export const choices = () => SUITS.map((g, i) => ({ value: i, label: `${g} ${SUIT_NAMES[i]}`, cls: i === 1 || i === 2 ? "red" : "" }));

/** If the player to move can neither play nor draw, they pass. If everyone is stuck the round ends. */
export function settle(s) {
  while (!s.over && !legalPlays(s).length && !canDraw(s)) {
    (s.skipped = s.skipped || []).push(s.turn);
    s.stuck += 1;
    if (s.stuck >= s.n) {
      s.over = true;
      let best = 0;
      s.hands.forEach((h, i) => { if (handPoints(h) < handPoints(s.hands[best])) best = i; });
      s.winner = best;
      s.reason = "blocked";
      return;
    }
    s.turn = (s.turn + 1) % s.n;
  }
}

/** The player to move plays card `id`; `suit` is the called suit when it is an 8. Returns notes or null if illegal. */
export function play(s, id, suit) {
  const seat = s.turn;
  const hand = s.hands[seat];
  const i = hand.indexOf(id);
  if (s.over || i < 0 || !canPlay(s, id)) return null;
  if (needsChoice(id) && !(suit >= 0 && suit < 4)) return null;
  s.skipped = [];
  hand.splice(i, 1);
  s.disc.push(id);
  s.rank = rankOf(id);
  s.suit = needsChoice(id) ? suit : suitOf(id);
  s.stuck = 0;
  const notes = [];
  if (needsChoice(id)) notes.push(`Called ${SUIT_NAMES[suit]}`);
  if (!hand.length) {
    s.over = true;
    s.winner = seat;
    s.reason = "out";
    return notes;
  }
  s.turn = (seat + 1) % s.n;
  settle(s);
  return notes;
}

/** The player to move draws one card (reshuffling the discards when the pile runs out). Returns the card or null. */
export function draw(s) {
  if (s.over) return null;
  s.skipped = [];
  if (!s.draw.length && s.disc.length > 1) {
    const top = s.disc.pop();
    s.draw = shuffle(s.disc, s);
    s.disc = [top];
  }
  if (!s.draw.length) return null;
  const id = s.draw.pop();
  s.hands[s.turn].push(id);
  s.stuck = 0;
  settle(s);
  return id;
}

/** Can the human press Draw right now? Only when nothing in the hand can be played. */
export const canDrawNow = (s) => !s.over && !legalPlays(s).length && canDraw(s);

/** What the round is worth: the winner scores the cards left in everyone else's hand. */
export function result(s) {
  const gain = s.hands.reduce((t, h, i) => (i === s.winner ? t : t + handPoints(h)), 0);
  return { winner: s.winner, gain, text: s.reason === "blocked" ? "Nobody could play, so the lowest hand wins." : "Played the last card." };
}

/** Computer move: { id, choice } to play, or null to draw. */
export function choose(s, level) {
  const seat = s.turn;
  const hand = s.hands[seat];
  const plays = legalPlays(s, seat);
  if (!plays.length) return null;
  const count = [0, 0, 0, 0];
  hand.forEach((id) => { if (rankOf(id) !== 8) count[suitOf(id)] += 1; });
  const callSuit = (without) => {
    const c = [0, 0, 0, 0];
    hand.forEach((id) => { if (id !== without && rankOf(id) !== 8) c[suitOf(id)] += 1; });
    let best = 0;
    c.forEach((v, i) => { if (v > c[best]) best = i; });
    return c[best] ? best : Math.floor(Math.random() * 4);
  };
  const pick = (id) => ({ id, choice: needsChoice(id) ? callSuit(id) : undefined });
  if (level === "easy") return pick(plays[Math.floor(Math.random() * plays.length)]);
  const others = s.hands.filter((_, i) => i !== seat).map((h) => h.length);
  const danger = Math.min(...others) <= 2; // someone is about to go out: use everything
  const normal = plays.filter((id) => rankOf(id) !== 8);
  const pool = normal.length && !(level === "hard" && danger && hand.length <= 3) ? normal : plays;
  let best = pool[0];
  let bestScore = -1e9;
  pool.forEach((id) => {
    let sc = points(id) * 0.4 + count[suitOf(id)] * 2 + Math.random() * 0.5;
    if (level === "hard" && suitOf(id) !== s.suit) sc += 1; // changing suit with a rank match keeps options open
    if (rankOf(id) === 8) sc -= 3;
    if (sc > bestScore) { bestScore = sc; best = id; }
  });
  return pick(best);
}
