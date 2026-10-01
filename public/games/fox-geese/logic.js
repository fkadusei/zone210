/**
 * Fox & Geese rules and a computer opponent. Pure functions, no DOM.
 * 33-point cross board on a 7 x 7 grid (index = row * 7 + col). Player 1 is the Fox, player 2 the Geese.
 * Geese move one step forward (up) or sideways onto an empty point, never backwards, and cannot capture.
 * The Fox moves one step in any of the four directions, or jumps over a goose next to it onto the empty point beyond,
 * capturing it. Several jumps in one turn are allowed (the Fox may stop at any time). Captures are optional.
 * The Geese win by trapping the Fox. The Fox wins by capturing so many geese that they can't trap it (fewer than 6 left),
 * or when the geese have no legal move.
 */
export const N = 7;
export const MIN_GEESE = 6;
export const valid = (r, c) => r >= 0 && r < N && c >= 0 && c < N && ((r >= 2 && r <= 4) || (c >= 2 && c <= 4));
export const other = (p) => 3 - p;
const DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]];

export function initial(geese = 13) {
  const b = Array(N * N).fill(9);
  for (let r = 0; r < N; r += 1) for (let c = 0; c < N; c += 1) if (valid(r, c)) b[r * N + c] = 0;
  const put = (r, c) => { b[r * N + c] = 2; };
  for (let c = 0; c < N; c += 1) put(4, c);
  for (const r of [5, 6]) for (let c = 2; c <= 4; c += 1) put(r, c);
  if (geese >= 15) { put(3, 0); put(3, 6); }
  if (geese >= 17) { put(3, 1); put(3, 5); }
  b[3 * N + 3] = 1;
  return { b, turn: 2 === 1 ? 2 : 1, captured: 0 }; // the Fox moves first
}
export const clone = (s) => ({ b: s.b.slice(), turn: s.turn, captured: s.captured });
export const foxPos = (s) => s.b.indexOf(1);
export const geeseCount = (s) => s.b.reduce((n, v) => n + (v === 2 ? 1 : 0), 0);

/** One-step or one-jump moves for the fox from `from` (jumps may only be taken when `jumpsOnly` is set). */
export function foxMoves(s, from = foxPos(s), jumpsOnly = false) {
  const out = [];
  const r = Math.floor(from / N), c = from % N;
  for (const [dr, dc] of DIRS) {
    const rr = r + dr, cc = c + dc;
    if (!valid(rr, cc)) continue;
    const i = rr * N + cc;
    if (s.b[i] === 0 && !jumpsOnly) out.push({ kind: "step", from, to: i });
    else if (s.b[i] === 2) {
      const r2 = r + 2 * dr, c2 = c + 2 * dc;
      if (valid(r2, c2) && s.b[r2 * N + c2] === 0) out.push({ kind: "jump", from, over: i, to: r2 * N + c2 });
    }
  }
  return out;
}
export function gooseMoves(s) {
  const out = [];
  for (let i = 0; i < N * N; i += 1) {
    if (s.b[i] !== 2) continue;
    const r = Math.floor(i / N), c = i % N;
    for (const [dr, dc] of [[-1, 0], [0, -1], [0, 1]]) {
      const rr = r + dr, cc = c + dc;
      if (valid(rr, cc) && s.b[rr * N + cc] === 0) out.push({ kind: "goose", from: i, to: rr * N + cc });
    }
  }
  return out;
}
/** Legal single actions for the player to move. `chainFrom` restricts the fox to continuing jumps from that point. */
export function actions(s, chainFrom = null) {
  if (s.turn === 2) return gooseMoves(s);
  return chainFrom === null ? foxMoves(s) : foxMoves(s, chainFrom, true);
}
/** Applies one action (does not change the turn). */
export function act(s, a) {
  const n = clone(s);
  n.b[a.from] = 0;
  n.b[a.to] = a.kind === "goose" ? 2 : 1;
  if (a.kind === "jump") { n.b[a.over] = 0; n.captured += 1; }
  return n;
}
export const endTurn = (s) => { const n = clone(s); n.turn = other(s.turn); return n; };

/** Called once a turn is finished and `s.turn` is the player about to move. */
export function outcome(s) {
  if (s.turn === 1) {
    if (!foxMoves(s).length) return { winner: 2, why: "the fox is trapped" };
  } else {
    if (geeseCount(s) < MIN_GEESE) return { winner: 1, why: "too few geese are left to trap the fox" };
    if (!gooseMoves(s).length) return { winner: 1, why: "the geese have no move left" };
  }
  return null;
}

/** Whole fox turns: a step, or a chain of one or more jumps (any prefix of a chain is allowed). */
export function foxTurns(s) {
  const out = [];
  const from = foxPos(s);
  for (const m of foxMoves(s, from)) if (m.kind === "step") out.push({ moves: [m] });
  const dfs = (st, pos, moves) => {
    for (const m of foxMoves(st, pos, true)) {
      const ns = act(st, m);
      const seq = moves.concat([m]);
      out.push({ moves: seq });
      dfs(ns, m.to, seq);
    }
  };
  dfs(s, from, []);
  return out;
}
export function applyFoxTurn(s, t) {
  let n = s;
  for (const m of t.moves) n = act(n, m);
  return endTurn(n);
}

// ---------- computer player ----------
function exposed(s) {
  // geese the fox could capture right now
  return foxMoves(s, foxPos(s), true).length;
}
function evalGeese(s) {
  const fp = foxPos(s);
  const geese = geeseCount(s);
  let v = 45 * geese;
  v -= 4 * foxMoves(s, fp).length;
  v -= 28 * exposed(s);
  let adv = 0;
  for (let i = 0; i < N * N; i += 1) if (s.b[i] === 2) adv += 6 - Math.floor(i / N);
  v += 1.6 * adv;
  // geese next to each other are safe: count geese with a goose behind or an edge behind
  let solid = 0;
  for (let i = 0; i < N * N; i += 1) {
    if (s.b[i] !== 2) continue;
    const r = Math.floor(i / N), c = i % N;
    const behind = valid(r + 1, c) ? s.b[(r + 1) * N + c] : 9;
    if (behind !== 0) solid += 1;
  }
  v += 2 * solid;
  // fox pushed toward the top edge is closer to being trapped
  v += 1.2 * (3 - Math.floor(fp / N));
  return v;
}
let deadline = 0;
function search(s, depth, alpha, beta, ply) {
  // returns a score from the Geese's point of view
  if (Date.now() > deadline) throw new Error("time");
  const out = outcome(s);
  if (out) return out.winner === 2 ? 10000 - ply : -10000 + ply;
  if (depth <= 0) return evalGeese(s);
  if (s.turn === 2) {
    let best = -Infinity;
    const moves = gooseMoves(s).map((m) => ({ m, v: evalGeese(endTurn(act(s, m))) })).sort((a, b) => b.v - a.v).slice(0, 14);
    for (const { m } of moves) {
      const v = search(endTurn(act(s, m)), depth - 1, alpha, beta, ply + 1);
      if (v > best) best = v;
      if (best > alpha) alpha = best;
      if (alpha >= beta) break;
    }
    return best;
  }
  let best = Infinity;
  const turns = foxTurns(s).map((t) => ({ t, v: evalGeese(applyFoxTurn(s, t)) })).sort((a, b) => a.v - b.v).slice(0, 10);
  for (const { t } of turns) {
    const v = search(applyFoxTurn(s, t), depth - 1, alpha, beta, ply + 1);
    if (v < best) best = v;
    if (best < beta) beta = best;
    if (alpha >= beta) break;
  }
  return best;
}

/** Best whole turn for the player to move: { moves: [...] } (a single goose move, or the fox's step/jump chain). */
export function chooseTurn(s, level = "normal") {
  if (s.turn === 2) {
    const moves = gooseMoves(s);
    if (!moves.length) return null;
    if (level === "easy") {
      const safe = moves.filter((m) => !exposed(endTurn(act(s, m))));
      const pool = safe.length && Math.random() < 0.75 ? safe : moves;
      return { moves: [pool[Math.floor(Math.random() * pool.length)]] };
    }
    const cfg = level === "hard" ? { depth: 6, ms: 1500 } : { depth: 3, ms: 600 };
    const ordered = moves.map((m) => ({ m, v: evalGeese(endTurn(act(s, m))) })).sort((a, b) => b.v - a.v);
    let best = ordered[0].m;
    deadline = Date.now() + cfg.ms;
    for (let d = 1; d <= cfg.depth; d += 1) {
      try {
        let bv = -Infinity, bm = ordered[0].m;
        for (const { m } of ordered.slice(0, 18)) {
          const v = search(endTurn(act(s, m)), d - 1, -Infinity, Infinity, 1) + (level === "normal" ? Math.random() * 2 : 0);
          if (v > bv) { bv = v; bm = m; }
        }
        best = bm;
      } catch (err) { break; }
    }
    return { moves: [best] };
  }
  const turns = foxTurns(s);
  if (!turns.length) return null;
  if (level === "easy") {
    const caps = turns.filter((t) => t.moves[0].kind === "jump");
    if (caps.length && Math.random() < 0.8) return caps.reduce((a, b) => (b.moves.length > a.moves.length ? b : a));
    return turns[Math.floor(Math.random() * turns.length)];
  }
  const cfg = level === "hard" ? { depth: 6, ms: 1500 } : { depth: 3, ms: 600 };
  const ordered = turns.map((t) => ({ t, v: evalGeese(applyFoxTurn(s, t)) })).sort((a, b) => a.v - b.v);
  let best = ordered[0].t;
  deadline = Date.now() + cfg.ms;
  for (let d = 1; d <= cfg.depth; d += 1) {
    try {
      let bv = Infinity, bt = ordered[0].t;
      for (const { t } of ordered.slice(0, 16)) {
        const v = search(applyFoxTurn(s, t), d - 1, -Infinity, Infinity, 1) - (level === "normal" ? Math.random() * 2 : 0);
        if (v < bv) { bv = v; bt = t; }
      }
      best = bt;
    } catch (err) { break; }
  }
  return best;
}
