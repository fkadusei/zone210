/**
 * Go rules and a Monte Carlo tree search opponent. Pure functions, no DOM.
 * n x n intersections (index = row * n + col). Black (1) moves first, White (2) receives komi. Area (Chinese) scoring.
 * Captures remove groups without liberties; suicide is illegal; positional superko forbids repeating an earlier whole-board position.
 */
export const KOMI = { 9: 7, 13: 7.5, 19: 7.5 };
export const other = (c) => 3 - c;
const NBR = {};
function nbr(n) {
  if (NBR[n]) return NBR[n];
  const a = [];
  for (let r = 0; r < n; r += 1) for (let c = 0; c < n; c += 1) {
    const l = [];
    if (r > 0) l.push((r - 1) * n + c);
    if (c > 0) l.push(r * n + c - 1);
    if (c < n - 1) l.push(r * n + c + 1);
    if (r < n - 1) l.push((r + 1) * n + c);
    a.push(Int16Array.from(l));
  }
  NBR[n] = a;
  return a;
}
const DIAG = {};
function diag(n) {
  if (DIAG[n]) return DIAG[n];
  const a = [];
  for (let r = 0; r < n; r += 1) for (let c = 0; c < n; c += 1) {
    const l = [];
    for (const [dr, dc] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) { const rr = r + dr, cc = c + dc; if (rr >= 0 && rr < n && cc >= 0 && cc < n) l.push(rr * n + cc); }
    a.push(Int16Array.from(l));
  }
  DIAG[n] = a;
  return a;
}
// Zobrist hashing for the superko rule
const Z = [];
(function seed() { let x = 0x9e3779b9; const rnd = () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return x >>> 0; }; for (let i = 0; i < 361 * 3; i += 1) Z.push([rnd(), rnd()]); })();
const zkey = (h) => `${h[0]}:${h[1]}`;

export function newGame(n = 9) {
  return { n, b: new Int8Array(n * n), turn: 1, caps: [0, 0, 0], passes: 0, last: -1, hash: [0, 0], seen: new Set(["0:0"]), moves: 0 };
}
export function cloneGame(s) {
  return { n: s.n, b: s.b.slice(), turn: s.turn, caps: s.caps.slice(), passes: s.passes, last: s.last, hash: s.hash.slice(), seen: new Set(s.seen), moves: s.moves };
}

/** Scratch buffers for group searches. */
function makeScratch(n) { return { stamp: 1, mark: new Int32Array(n * n), stones: new Int16Array(n * n), len: 0, libs: 0, lmark: new Int32Array(n * n), lstamp: 1 }; }
function group(b, n, p, sc) {
  const nb = nbr(n);
  const color = b[p];
  sc.stamp += 1; sc.lstamp += 1;
  sc.len = 0; sc.libs = 0;
  sc.stones[sc.len++] = p; sc.mark[p] = sc.stamp;
  for (let k = 0; k < sc.len; k += 1) {
    const x = sc.stones[k];
    const l = nb[x];
    for (let j = 0; j < l.length; j += 1) {
      const y = l[j];
      if (b[y] === 0) { if (sc.lmark[y] !== sc.lstamp) { sc.lmark[y] = sc.lstamp; sc.libs += 1; } } else if (b[y] === color && sc.mark[y] !== sc.stamp) { sc.mark[y] = sc.stamp; sc.stones[sc.len++] = y; }
    }
  }
}

/**
 * Plays colour `c` at p on board b (mutates b). Returns { captured, koPoint } or null when illegal (occupied, suicide, or simple ko).
 * `ko` is the simple-ko point to avoid. Used by both the game and the fast playouts.
 */
function playOn(b, n, p, c, ko, sc) {
  if (b[p] !== 0 || p === ko) return null;
  const nb = nbr(n);
  const o = other(c);
  b[p] = c;
  let captured = 0;
  let lastCap = -1;
  const l = nb[p];
  for (let j = 0; j < l.length; j += 1) {
    const q = l[j];
    if (b[q] === o) {
      group(b, n, q, sc);
      if (sc.libs === 0) { for (let k = 0; k < sc.len; k += 1) { b[sc.stones[k]] = 0; lastCap = sc.stones[k]; } captured += sc.len; }
    }
  }
  if (captured === 0) { group(b, n, p, sc); if (sc.libs === 0) { b[p] = 0; return null; } }
  let koPoint = -1;
  if (captured === 1) { group(b, n, p, sc); if (sc.len === 1 && sc.libs === 1) koPoint = lastCap; }
  return { captured, koPoint };
}

const scratchFor = {};
const sc9 = (n) => (scratchFor[n] || (scratchFor[n] = makeScratch(n)));

/** Is `p` a legal move for the player to move (including positional superko)? */
export function isLegal(s, p) {
  if (p < 0 || s.b[p] !== 0) return false;
  const b = s.b.slice();
  const sc = sc9(s.n);
  const r = playOn(b, s.n, p, s.turn, -1, sc);
  if (!r) return false;
  const h = s.hash.slice();
  for (let i = 0; i < b.length; i += 1) if (b[i] !== s.b[i]) { if (s.b[i]) { h[0] ^= Z[i * 3 + s.b[i]][0]; h[1] ^= Z[i * 3 + s.b[i]][1]; } if (b[i]) { h[0] ^= Z[i * 3 + b[i]][0]; h[1] ^= Z[i * 3 + b[i]][1]; } }
  return !s.seen.has(zkey(h));
}
export function legalMoves(s) { const out = []; for (let i = 0; i < s.n * s.n; i += 1) if (isLegal(s, i)) out.push(i); return out; }

/** Plays a stone (p >= 0) or passes (p === -1). Returns a new state, or null if illegal. */
export function play(s, p) {
  const t = cloneGame(s);
  const c = s.turn;
  if (p === -1) { t.passes = s.passes + 1; t.turn = other(c); t.last = -1; t.moves += 1; return t; }
  if (!isLegal(s, p)) return null;
  const sc = sc9(s.n);
  const before = t.b.slice();
  const r = playOn(t.b, s.n, p, c, -1, sc);
  for (let i = 0; i < t.b.length; i += 1) if (t.b[i] !== before[i]) { if (before[i]) { t.hash[0] ^= Z[i * 3 + before[i]][0]; t.hash[1] ^= Z[i * 3 + before[i]][1]; } if (t.b[i]) { t.hash[0] ^= Z[i * 3 + t.b[i]][0]; t.hash[1] ^= Z[i * 3 + t.b[i]][1]; } }
  t.seen.add(zkey(t.hash));
  t.caps[c] += r.captured;
  t.passes = 0;
  t.last = p;
  t.turn = other(c);
  t.moves += 1;
  return t;
}
export function groupAt(s, p) { const sc = makeScratch(s.n); group(s.b, s.n, p, sc); return Array.from(sc.stones.slice(0, sc.len)); }
export function libertiesOf(s, p) { const sc = makeScratch(s.n); group(s.b, s.n, p, sc); return sc.libs; }

/** Area score. `dead` is an optional Set of stone indexes treated as removed. Returns { black, white, owner[] , komi, margin }. */
export function score(s, dead = new Set()) {
  const { n } = s;
  const nb = nbr(n);
  const b = s.b.slice();
  dead.forEach((i) => { b[i] = 0; });
  const owner = new Int8Array(n * n);
  let black = 0, white = 0;
  const seen = new Uint8Array(n * n);
  for (let i = 0; i < n * n; i += 1) {
    if (b[i] === 1) { black += 1; owner[i] = 1; } else if (b[i] === 2) { white += 1; owner[i] = 2; }
  }
  for (let i = 0; i < n * n; i += 1) {
    if (b[i] !== 0 || seen[i]) continue;
    const region = [i]; seen[i] = 1;
    let touchB = false, touchW = false;
    for (let k = 0; k < region.length; k += 1) { for (const y of nb[region[k]]) { if (b[y] === 1) touchB = true; else if (b[y] === 2) touchW = true; else if (!seen[y]) { seen[y] = 1; region.push(y); } } }
    if (touchB && !touchW) { black += region.length; region.forEach((x) => { owner[x] = 1; }); } else if (touchW && !touchB) { white += region.length; region.forEach((x) => { owner[x] = 2; }); }
  }
  const komi = KOMI[n] || 7.5;
  return { black, white, komi, margin: black - white - komi, owner };
}

// ---------- computer player ----------
function isOwnEye(b, n, p, c) {
  const l = nbr(n)[p];
  for (let j = 0; j < l.length; j += 1) if (b[l[j]] !== c) return false;
  const d = diag(n)[p];
  let bad = 0;
  for (let j = 0; j < d.length; j += 1) if (b[d[j]] === other(c)) bad += 1;
  return d.length < 4 ? bad === 0 : bad < 2;
}
function playoutScore(b, n, toMove, ko, komi, sc, empties) {
  // random playout with light rules; returns black margin
  let color = toMove;
  let passes = 0;
  let koP = ko;
  let moves = 0;
  const maxMoves = n * n * 2;
  const m = empties.length;
  let cnt = 0;
  for (let i = 0; i < b.length; i += 1) if (b[i] === 0) empties[cnt++] = i;
  const count = () => cnt;
  void m; void count;
  while (passes < 2 && moves < maxMoves) {
    let played = false;
    for (let tries = 0; tries < 24 && cnt > 0; tries += 1) {
      const idx = (Math.random() * cnt) | 0;
      const p = empties[idx];
      if (b[p] !== 0 || isOwnEye(b, n, p, color)) continue;
      const r = playOn(b, n, p, color, koP, sc);
      if (!r) continue;
      koP = r.koPoint;
      // refresh empties after captures (rare) lazily: rebuild when something was captured
      if (r.captured) { cnt = 0; for (let i = 0; i < b.length; i += 1) if (b[i] === 0) empties[cnt++] = i; } else { empties[idx] = empties[cnt - 1]; cnt -= 1; }
      played = true;
      break;
    }
    if (played) passes = 0; else { passes += 1; koP = -1; }
    color = other(color);
    moves += 1;
  }
  // area score
  const nb = nbr(n);
  let black = 0, white = 0;
  const seen = new Uint8Array(n * n);
  for (let i = 0; i < b.length; i += 1) { if (b[i] === 1) black += 1; else if (b[i] === 2) white += 1; }
  for (let i = 0; i < b.length; i += 1) {
    if (b[i] !== 0 || seen[i]) continue;
    const region = [i]; seen[i] = 1;
    let tb = false, tw = false;
    for (let k = 0; k < region.length; k += 1) for (const y of nb[region[k]]) { if (b[y] === 1) tb = true; else if (b[y] === 2) tw = true; else if (!seen[y]) { seen[y] = 1; region.push(y); } }
    if (tb && !tw) black += region.length; else if (tw && !tb) white += region.length;
  }
  return black - white - komi;
}

/** Which of the stones on the board are probably dead? (a stone is dead when its colour owns that point in under 28% of random games) */
export function estimateDead(s, playouts = 0) {
  const { n } = s;
  if (!playouts) playouts = n === 9 ? 260 : n === 13 ? 150 : 90;
  const sc = makeScratch(n);
  const own = new Float32Array(n * n);
  const komi = KOMI[n] || 7.5;
  const empties = new Int16Array(n * n);
  for (let k = 0; k < playouts; k += 1) {
    const b = s.b.slice();
    playoutScore(b, n, s.turn, -1, komi, sc, empties);
    for (let i = 0; i < b.length; i += 1) if (b[i]) own[i] += b[i] === 1 ? 1 : -1; // stones that survive the playout (no territory counting needed)
  }
  const dead = new Set();
  const groupSeen = new Uint8Array(n * n);
  for (let i = 0; i < n * n; i += 1) {
    if (!s.b[i] || groupSeen[i]) continue;
    const g = groupAt(s, i);
    g.forEach((x) => { groupSeen[x] = 1; });
    // survival rate of this group's stones across playouts
    let alive = 0;
    g.forEach((x) => { alive += s.b[x] === 1 ? (own[x] > 0 ? 1 : 0) : (own[x] < 0 ? 1 : 0); });
    // a crude but useful signal: use the mean fraction of playouts where the point still held our colour
    let frac = 0;
    g.forEach((x) => { frac += Math.abs(own[x]) / playouts; });
    frac /= g.length;
    void alive;
    if (frac < 0.28) g.forEach((x) => dead.add(x));
  }
  return dead;
}

let deadline = 0;
export function chooseMove(s, level = "normal") {
  const { n } = s;
  const color = s.turn;
  const sc = makeScratch(n);
  const komi = KOMI[n] || 7.5;
  // candidate moves: legal, not filling our own eye, and (on big boards) near existing stones
  let cands = [];
  const nb = nbr(n);
  const near = new Uint8Array(n * n);
  let anyStone = false;
  for (let i = 0; i < n * n; i += 1) if (s.b[i]) { anyStone = true; near[i] = 1; for (const y of nb[i]) near[y] = 1; for (const y of diag(n)[i]) near[y] = 1; for (const y of nb[i]) for (const z of nb[y]) near[z] = 1; }
  for (let i = 0; i < n * n; i += 1) {
    if (s.b[i] !== 0) continue;
    if (n > 9 && anyStone && !near[i]) continue;
    if (isOwnEye(s.b, n, i, color)) continue;
    if (isLegal(s, i)) cands.push(i);
  }
  if (!anyStone && n >= 9) { const m = (n - 1) / 2; const star = n === 9 ? 2 : 3; const opts = [m * n + m, star * n + star, star * n + (n - 1 - star), (n - 1 - star) * n + star, (n - 1 - star) * n + (n - 1 - star)]; return opts[Math.floor(Math.random() * (level === "easy" ? opts.length : 1 + (n === 9 ? 0 : 4)))]; }
  if (!cands.length) return -1;
  const oppPassed = s.passes >= 1;
  // quick tactics: capture, escape atari
  const tactical = (p) => {
    const t = cloneGame(s);
    const before = t.b.reduce((a, v) => a + (v === other(color) ? 1 : 0), 0);
    const r = playOn(t.b, n, p, color, -1, sc);
    if (!r) return -99;
    let v = r.captured * 8;
    // self-atari is bad
    group(t.b, n, p, sc);
    if (sc.libs === 1 && r.captured === 0) v -= 14;
    // saving a neighbouring friendly group in atari
    for (const q of nb[p]) if (s.b[q] === color) { const sc2 = makeScratch(n); group(s.b, n, q, sc2); if (sc2.libs === 1) v += 9 + sc2.len; }
    // putting an enemy neighbour into atari
    for (const q of nb[p]) if (t.b[q] === other(color)) { group(t.b, n, q, sc); if (sc.libs === 1) v += 4; }
    void before;
    return v;
  };
  if (level === "easy") {
    const scored = cands.map((p) => ({ p, v: tactical(p) + Math.random() * 6 - (s.last >= 0 ? Math.hypot(Math.floor(p / n) - Math.floor(s.last / n), (p % n) - (s.last % n)) * 0.15 : 0) }));
    scored.sort((a, b) => b.v - a.v);
    if (oppPassed && s.moves > n * 2 && scored[0].v < 1) return -1;
    return scored[0].p;
  }
  // Monte Carlo tree search
  const ms = (level === "hard" ? 2600 : 1000) * (n === 19 ? 1.2 : 1);
  const root = { p: -2, parent: null, children: [], untried: cands.slice().sort((a, b) => tactical(b) - tactical(a)), visits: 0, wins: 0, color: other(color), b: s.b, ko: -1, passes: s.passes };
  const empties = new Int16Array(n * n);
  deadline = Date.now() + ms;
  let iter = 0;
  const canPass = oppPassed || cands.length < 3;
  if (canPass) root.untried.push(-1);
  while ((iter & 7) !== 0 || Date.now() < deadline) {
    iter += 1;
    let node = root;
    // selection
    while (!node.untried.length && node.children.length) {
      let best = null, bv = -Infinity;
      const lg = Math.log(node.visits + 1);
      for (const ch of node.children) { const v = ch.wins / (ch.visits + 1e-9) + 0.55 * Math.sqrt(lg / (ch.visits + 1e-9)); if (v > bv) { bv = v; best = ch; } }
      node = best;
    }
    // expansion
    if (node.untried.length) {
      const take = node.p === -2 ? 0 : (Math.random() * node.untried.length) | 0;
      const p = node.untried.splice(take, 1)[0];
      const mover = other(node.color);
      let nbBoard = node.b, nko = -1, npass = node.passes;
      if (p === -1) npass += 1;
      else { nbBoard = node.b.slice(); const r = playOn(nbBoard, n, p, mover, node.ko, sc); if (!r) continue; nko = r.koPoint; npass = 0; }
      const child = { p, parent: node, children: [], untried: null, visits: 0, wins: 0, color: mover, b: nbBoard, ko: nko, passes: npass };
      // candidate list for the child (the next mover)
      const nextColor = other(mover);
      child.untried = [];
      for (let i = 0; i < n * n; i += 1) { if (nbBoard[i] !== 0 || i === nko) continue; if (n > 9 && !near[i]) { let close = false; for (const y of nb[i]) if (nbBoard[y]) { close = true; break; } if (!close) continue; } if (isOwnEye(nbBoard, n, i, nextColor)) continue; child.untried.push(i); }
      if (npass >= 1 || child.untried.length < 3) child.untried.push(-1);
      node.children.push(child);
      node = child;
    }
    // simulation
    let margin;
    if (node.passes >= 2) { margin = scoreBoard(node.b, n, komi); } else margin = playoutScore(node.b.slice(), n, other(node.color), node.ko, komi, sc, empties);
    const blackWon = margin > 0;
    for (let x = node; x; x = x.parent) { x.visits += 1; const moverWon = x.color === 1 ? blackWon : !blackWon; if (moverWon) x.wins += 1; }
    if (iter > 400000) break;
  }
  let best = root.children[0];
  for (const ch of root.children) if (ch.visits > best.visits) best = ch;
  if (!best) return cands[0];
  const rate = (c) => c.wins / Math.max(1, c.visits);
  const passChild = root.children.find((c) => c.p === -1);
  // once the opponent has passed, end the game when passing is almost as good as our best move and we look to be winning
  if (oppPassed && passChild && passChild.visits >= 8 && rate(passChild) >= 0.6 && rate(passChild) >= rate(best) - 0.06) return -1;
  // do not pass unless we are clearly ahead after the opponent passed
  if (best.p === -1 && !(oppPassed && rate(best) > 0.55)) { const alt = root.children.filter((c) => c.p !== -1).sort((a, b) => b.visits - a.visits)[0]; if (alt) return alt.p; }
  return best.p;
}
function scoreBoard(b, n, komi) {
  const nb = nbr(n);
  let black = 0, white = 0;
  const seen = new Uint8Array(n * n);
  for (let i = 0; i < b.length; i += 1) { if (b[i] === 1) black += 1; else if (b[i] === 2) white += 1; }
  for (let i = 0; i < b.length; i += 1) {
    if (b[i] !== 0 || seen[i]) continue;
    const region = [i]; seen[i] = 1; let tb = false, tw = false;
    for (let k = 0; k < region.length; k += 1) for (const y of nb[region[k]]) { if (b[y] === 1) tb = true; else if (b[y] === 2) tw = true; else if (!seen[y]) { seen[y] = 1; region.push(y); } }
    if (tb && !tw) black += region.length; else if (tw && !tb) white += region.length;
  }
  return black - white - komi;
}
