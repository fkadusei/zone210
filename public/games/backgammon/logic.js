/**
 * Backgammon rules and a computer opponent. Pure functions, no DOM.
 * Points are indexes 0..23 (point 1 = index 0). Player 0 is White and moves from high to low, bearing off past index 0
 * (home board = indexes 0..5). Player 1 is Black and moves from low to high (home board = 18..23).
 * pts[i] > 0: White checkers, < 0: Black checkers. bar and off are [white, black].
 */
export const BAR = 24; // "from" value for a checker on the bar
export const OFF = 99; // "to" value for bearing off
export const dirOf = (p) => (p === 0 ? -1 : 1);
const sign = (p) => (p === 0 ? 1 : -1);

export function initialState() {
  const pts = Array(24).fill(0);
  pts[23] = 2; pts[12] = 5; pts[7] = 3; pts[5] = 5; // White
  pts[0] = -2; pts[11] = -5; pts[16] = -3; pts[18] = -5; // Black
  return { pts, bar: [0, 0], off: [0, 0] };
}
export const clone = (s) => ({ pts: s.pts.slice(), bar: s.bar.slice(), off: s.off.slice() });
const own = (s, p, i) => (s.pts[i] * sign(p) > 0 ? Math.abs(s.pts[i]) : 0);
const opp = (s, p, i) => (s.pts[i] * sign(p) < 0 ? Math.abs(s.pts[i]) : 0);

export function allHome(s, p) {
  if (s.bar[p]) return false;
  for (let i = 0; i < 24; i += 1) {
    if (own(s, p, i) && (p === 0 ? i > 5 : i < 18)) return false;
  }
  return true;
}

/** Single-checker moves available with die value d. */
export function stepsFor(s, p, d) {
  const out = [];
  if (s.bar[p]) {
    const to = p === 0 ? 24 - d : d - 1;
    if (opp(s, p, to) <= 1) out.push({ from: BAR, to, die: d });
    return out;
  }
  const bearing = allHome(s, p);
  for (let i = 0; i < 24; i += 1) {
    if (!own(s, p, i)) continue;
    const t = i + dirOf(p) * d;
    if (t >= 0 && t <= 23) {
      if (opp(s, p, t) <= 1) out.push({ from: i, to: t, die: d });
    } else if (bearing) {
      const exact = p === 0 ? t === -1 : t === 24;
      if (exact) out.push({ from: i, to: OFF, die: d });
      else {
        // a larger die may bear off the rearmost checker when nothing sits further back
        let further = false;
        for (let k = 0; k < 24; k += 1) if (own(s, p, k) && (p === 0 ? k > i : k < i)) { further = true; break; }
        if (!further) out.push({ from: i, to: OFF, die: d });
      }
    }
  }
  return out;
}

export function applyStep(s, p, m) {
  const n = clone(s);
  if (m.from === BAR) n.bar[p] -= 1;
  else n.pts[m.from] -= sign(p);
  if (m.to === OFF) n.off[p] += 1;
  else {
    if (opp(n, p, m.to) === 1) {
      n.pts[m.to] = 0;
      n.bar[1 - p] += 1;
    }
    n.pts[m.to] += sign(p);
  }
  return n;
}

const keyOf = (s) => s.pts.join(",") + "|" + s.bar + "|" + s.off;

/** All maximal move sequences for the remaining dice, following the rules (must use as many dice as possible, the larger die if only one can be used). */
export function sequences(s, p, dice) {
  const results = new Map();
  const seen = new Set();
  const dfs = (st, left, steps) => {
    const k = keyOf(st) + "#" + left.join("");
    if (seen.has(k)) return;
    seen.add(k);
    let any = false;
    const tried = new Set();
    left.forEach((d, idx) => {
      if (tried.has(d)) return;
      tried.add(d);
      const rest = left.slice(0, idx).concat(left.slice(idx + 1));
      for (const m of stepsFor(st, p, d)) {
        any = true;
        dfs(applyStep(st, p, m), rest, steps.concat([m]));
      }
    });
    if (!any) {
      const rk = keyOf(st) + "#" + steps.map((m) => `${m.from}>${m.to}/${m.die}`).join(",");
      results.set(rk, { steps, state: st });
    }
  };
  dfs(s, dice, []);
  let list = [...results.values()];
  const max = Math.max(0, ...list.map((r) => r.steps.length));
  list = list.filter((r) => r.steps.length === max);
  if (max === 1 && dice.length === 2 && dice[0] !== dice[1]) {
    const big = Math.max(...dice);
    const withBig = list.filter((r) => r.steps[0].die === big);
    if (withBig.length) list = withBig;
  }
  return max === 0 ? [] : list;
}

/** Most dice that can still be played from this position (memoised). */
function maxDepth(s, p, left, memo) {
  if (!left.length) return 0;
  const k = keyOf(s) + "#" + left.slice().sort().join("");
  if (memo.has(k)) return memo.get(k);
  let best = 0;
  const tried = new Set();
  left.forEach((d, idx) => {
    if (tried.has(d) || best === left.length) return;
    tried.add(d);
    const rest = left.slice(0, idx).concat(left.slice(idx + 1));
    for (const m of stepsFor(s, p, d)) {
      best = Math.max(best, 1 + maxDepth(applyStep(s, p, m), p, rest, memo));
      if (best === left.length) break;
    }
  });
  memo.set(k, best);
  return best;
}

/** Steps that may legally be played next: they must start a play that uses as many dice as possible. */
export function legalSteps(s, p, dice) {
  const memo = new Map();
  const max = maxDepth(s, p, dice, memo);
  if (!max) return [];
  const out = [];
  const tried = new Set();
  dice.forEach((d, idx) => {
    if (tried.has(d)) return;
    tried.add(d);
    const rest = dice.slice(0, idx).concat(dice.slice(idx + 1));
    for (const m of stepsFor(s, p, d)) {
      if (1 + maxDepth(applyStep(s, p, m), p, rest, memo) === max) out.push(m);
    }
  });
  if (max === 1 && dice.length === 2 && dice[0] !== dice[1]) {
    const big = Math.max(...dice);
    const withBig = out.filter((m) => m.die === big);
    if (withBig.length) return withBig;
  }
  return out;
}

export function pips(s, p) {
  let n = s.bar[p] * 25;
  for (let i = 0; i < 24; i += 1) if (own(s, p, i)) n += own(s, p, i) * (p === 0 ? i + 1 : 24 - i);
  return n;
}
export const hasWon = (s, p) => s.off[p] === 15;

/** 1 = single game, 2 = gammon, 3 = backgammon (loser has borne off nothing, and still has a checker on the bar or in the winner's home). */
export function winValue(s, winner) {
  const loser = 1 - winner;
  if (s.off[loser] > 0) return 1;
  let behind = s.bar[loser] > 0;
  for (let i = 0; i < 24 && !behind; i += 1) if (own(s, loser, i) && (winner === 0 ? i <= 5 : i >= 18)) behind = true;
  return behind ? 3 : 2;
}

// ---------- computer player ----------
const SHOT = [0, 11, 12, 13, 14, 15, 15, 6, 5, 3, 2, 2, 3]; // chances (out of 36) to hit at each distance, roughly

function blotRisk(s, p) {
  // estimated danger to p's blots from the other player's checkers
  const q = 1 - p;
  let risk = 0;
  for (let i = 0; i < 24; i += 1) {
    if (own(s, p, i) !== 1) continue;
    let best = 0;
    let extra = 0;
    // opponent checkers that can land on i: they move in dirOf(q); the distance from a source j to i
    for (let j = 0; j < 24; j += 1) {
      if (!own(s, q, j)) continue;
      const dist = (i - j) * dirOf(q);
      if (dist >= 1 && dist <= 12) {
        if (SHOT[dist] > best) { extra += best / 2; best = SHOT[dist]; } else extra += SHOT[dist] / 2;
      }
    }
    if (s.bar[q]) {
      const dist = q === 0 ? 25 - (i + 1) : i + 1;
      if (dist >= 1 && dist <= 6) best = Math.max(best, SHOT[dist] + 4);
    }
    const prob = Math.min(1, (best + extra * 0.4) / 36);
    const loss = p === 0 ? 24 - i : i + 1; // pips lost if hit
    risk += prob * (loss + 10);
  }
  return risk;
}

function evaluate(s, p, w = 1) {
  const q = 1 - p;
  let v = (pips(s, q) - pips(s, p)) * 1.0;
  v += (s.off[p] - s.off[q]) * 9;
  v += s.bar[q] * 16 - s.bar[p] * 18;
  v -= blotRisk(s, p) * 1.1 * w;
  v += blotRisk(s, q) * 0.25;
  let chain = 0;
  for (let k = 0; k < 24; k += 1) {
    const i = p === 0 ? k : 23 - k;
    const c = own(s, p, i);
    if (c >= 2) {
      v += 4 + (c > 4 ? -(c - 4) * 1.5 : 0);
      const inHome = p === 0 ? i <= 5 : i >= 18;
      if (inHome) v += 3;
      const inOppHome = p === 0 ? i >= 18 : i <= 5;
      if (inOppHome) v += 2.5;
      chain += 1;
      if (chain >= 3) v += 2.5;
    } else chain = 0;
  }
  return v;
}

export function chooseSequence(s, p, dice, level = "normal") {
  const seqs = sequences(s, p, dice);
  if (!seqs.length) return null;
  if (level === "easy") {
    // mostly random, but it does like hitting and bearing off
    const pref = seqs.filter((r) => r.steps.some((m) => m.to === OFF || (m.to !== OFF && opp(s, p, m.to) === 1)));
    const pool = pref.length && Math.random() < 0.5 ? pref : seqs;
    return pool[Math.floor(Math.random() * pool.length)];
  }
  const scored = seqs.map((r) => ({ r, v: evaluate(r.state, p) + (level === "normal" ? Math.random() * 4 : 0) }));
  scored.sort((a, b) => b.v - a.v);
  if (level === "normal") return scored[0].r;
  // hard: look one roll ahead on the best few candidates, assuming the opponent plays well
  const top = scored.slice(0, 8);
  const rolls = [];
  for (let a = 1; a <= 6; a += 1) for (let b = a; b <= 6; b += 1) rolls.push({ d: a === b ? [a, a, a, a] : [a, b], w: a === b ? 1 : 2 });
  let bestR = top[0].r;
  let bestV = -Infinity;
  const t0 = Date.now();
  for (const c of top) {
    let total = 0;
    for (const roll of rolls) {
      const replies = sequences(c.r.state, 1 - p, roll.d);
      let worst = evaluate(c.r.state, p);
      if (replies.length) {
        worst = Infinity;
        for (const rep of replies.slice(0, 40)) worst = Math.min(worst, evaluate(rep.state, p));
      }
      total += worst * roll.w;
    }
    const v = total / 36 + c.v * 0.15;
    if (v > bestV) { bestV = v; bestR = c.r; }
    if (Date.now() - t0 > 1400) break;
  }
  return bestR;
}
