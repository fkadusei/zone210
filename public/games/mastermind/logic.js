/** Mastermind rules and a code-breaking solver. Pure functions, no DOM. A code is an array of colour indexes. */
export const LEVELS = {
  easy: { len: 4, colors: 5, guesses: 12 },
  normal: { len: 4, colors: 6, guesses: 10 },
  hard: { len: 5, colors: 8, guesses: 12 },
};

/** Black = right colour in the right place, white = right colour in the wrong place. */
export function feedback(secret, guess) {
  let b = 0;
  const sc = Array(10).fill(0);
  const gc = Array(10).fill(0);
  for (let i = 0; i < secret.length; i += 1) {
    if (secret[i] === guess[i]) b += 1;
    else { sc[secret[i]] += 1; gc[guess[i]] += 1; }
  }
  let w = 0;
  for (let c = 0; c < 10; c += 1) w += Math.min(sc[c], gc[c]);
  return { b, w };
}
export const randomCode = (len, colors) => Array.from({ length: len }, () => Math.floor(Math.random() * colors));
export function allCodes(len, colors) {
  const out = [];
  const cur = Array(len).fill(0);
  const rec = (i) => {
    if (i === len) { out.push(cur.slice()); return; }
    for (let c = 0; c < colors; c += 1) { cur[i] = c; rec(i + 1); }
  };
  rec(0);
  return out;
}
export const consistent = (cands, guess, fb) => cands.filter((c) => { const f = feedback(c, guess); return f.b === fb.b && f.w === fb.w; });

/** The computer's next guess given the codes that are still possible. */
export function nextGuess(cands, turn, len, colors, level = "normal") {
  if (turn === 0) {
    // a split opening such as 1122 (or 11223 for five pegs) tells the most
    const g = Array.from({ length: len }, (_, i) => Math.floor((i * 2) / len) % colors);
    return level === "easy" ? randomCode(len, colors) : g;
  }
  if (level === "easy") return Math.random() < 0.4 ? randomCode(len, colors) : cands[Math.floor(Math.random() * cands.length)];
  if (level === "normal" || cands.length > 400) return cands[Math.floor(Math.random() * cands.length)];
  // hard: among the still-possible codes, pick the one whose worst feedback leaves the fewest candidates
  const pool = cands.length > 120 ? cands.filter((_, i) => i % Math.ceil(cands.length / 120) === 0) : cands;
  let best = pool[0];
  let bestWorst = Infinity;
  for (const g of pool) {
    const buckets = new Map();
    for (const c of cands) { const f = feedback(c, g); const k = f.b * 10 + f.w; buckets.set(k, (buckets.get(k) || 0) + 1); }
    const worst = Math.max(...buckets.values());
    if (worst < bestWorst) { bestWorst = worst; best = g; }
  }
  return best;
}
