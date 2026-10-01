/**
 * Quoridor rules and computer player. 9 x 9 board, two pawns, ten walls each.
 * Player 0 starts at the bottom (row 8) and walks to row 0; player 1 starts at the top and walks to row 8.
 * A wall is [r, c, o]: o = 0 horizontal (between row r and r+1, covering columns c and c+1),
 *                      o = 1 vertical   (between column c and c+1, covering rows r and r+1), with r, c in 0..7.
 * The state is plain JSON.
 */
export const N = 9;
const GOAL = [0, 8];
const DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]];

export function initial() {
  return { p: [[8, 4], [0, 4]], walls: [], left: [10, 10], turn: 0, moves: 0, over: false, winner: -1 };
}
export const other = (p) => 1 - p;

/** Wall lookup: hb[r*N+c] = a horizontal wall sits below cell (r,c); vb[r*N+c] = a vertical wall sits right of it. */
export function grid(s) {
  const hb = new Uint8Array(N * N);
  const vb = new Uint8Array(N * N);
  s.walls.forEach(([r, c, o]) => {
    if (o === 0) { hb[r * N + c] = 1; hb[r * N + c + 1] = 1; } else { vb[r * N + c] = 1; vb[(r + 1) * N + c] = 1; }
  });
  return { hb, vb };
}

/** Can a pawn step from (r,c) in direction (dr,dc) (no wall, inside the board)? Pawns are ignored. */
export function canStep(g, r, c, dr, dc) {
  const r2 = r + dr;
  const c2 = c + dc;
  if (r2 < 0 || r2 >= N || c2 < 0 || c2 >= N) return false;
  if (dr === -1) return !g.hb[(r - 1) * N + c];
  if (dr === 1) return !g.hb[r * N + c];
  if (dc === -1) return !g.vb[r * N + c - 1];
  return !g.vb[r * N + c];
}

/** Squares the player to move can step to, including jumps over the other pawn. */
export function pawnMoves(s, p = s.turn, g = grid(s)) {
  const [r, c] = s.p[p];
  const [or, oc] = s.p[1 - p];
  const out = [];
  DIRS.forEach(([dr, dc]) => {
    if (!canStep(g, r, c, dr, dc)) return;
    const tr = r + dr;
    const tc = c + dc;
    if (tr !== or || tc !== oc) { out.push([tr, tc]); return; }
    if (canStep(g, tr, tc, dr, dc)) { out.push([tr + dr, tc + dc]); return; } // straight jump
    DIRS.forEach(([er, ec]) => { // blocked behind the pawn: step to either side of it
      if ((er === dr && ec === dc) || (er === -dr && ec === -dc)) return;
      if (canStep(g, tr, tc, er, ec)) out.push([tr + er, tc + ec]);
    });
  });
  return out;
}

/** Shortest number of steps to the goal row (pawns ignored), or -1 when walled in. Also returns the path. */
export function pathFor(s, p, g = grid(s), wantPath = false) {
  const goal = GOAL[p];
  const [sr, sc] = s.p[p];
  if (sr === goal) return wantPath ? { d: 0, path: [[sr, sc]] } : 0;
  const dist = new Int8Array(N * N).fill(-1);
  const prev = wantPath ? new Int16Array(N * N).fill(-1) : null;
  const q = new Int16Array(N * N);
  let head = 0;
  let tail = 0;
  q[tail++] = sr * N + sc;
  dist[sr * N + sc] = 0;
  while (head < tail) {
    const cur = q[head++];
    const r = (cur / N) | 0;
    const c = cur % N;
    for (let k = 0; k < 4; k += 1) {
      const dr = DIRS[k][0];
      const dc = DIRS[k][1];
      if (!canStep(g, r, c, dr, dc)) continue;
      const nxt = (r + dr) * N + c + dc;
      if (dist[nxt] >= 0) continue;
      dist[nxt] = dist[cur] + 1;
      if (prev) prev[nxt] = cur;
      if (r + dr === goal) {
        if (!wantPath) return dist[nxt];
        const path = [];
        for (let x = nxt; x !== -1; x = prev[x]) path.push([(x / N) | 0, x % N]);
        return { d: dist[nxt], path: path.reverse() };
      }
      q[tail++] = nxt;
    }
  }
  return wantPath ? { d: -1, path: [] } : -1;
}

/** Is placing this wall allowed for the player to move (walls left, no overlap or cross, nobody walled in)? */
export function wallLegal(s, r, c, o) {
  if (s.left[s.turn] <= 0 || r < 0 || r > 7 || c < 0 || c > 7) return false;
  for (const [wr, wc, wo] of s.walls) {
    if (wo === o) {
      if (wr === r && wc === c) return false;
      if (o === 0 && wr === r && Math.abs(wc - c) === 1) return false;
      if (o === 1 && wc === c && Math.abs(wr - r) === 1) return false;
    } else if (wr === r && wc === c) return false; // a horizontal and a vertical wall would cross
  }
  const t = { ...s, walls: [...s.walls, [r, c, o]] };
  const g = grid(t);
  return pathFor(t, 0, g) >= 0 && pathFor(t, 1, g) >= 0;
}

export const legalWalls = (s) => {
  const out = [];
  if (s.left[s.turn] <= 0) return out;
  for (let r = 0; r < 8; r += 1) for (let c = 0; c < 8; c += 1) for (let o = 0; o < 2; o += 1) if (wallLegal(s, r, c, o)) out.push([r, c, o]);
  return out;
};

/** Apply a move: { t: "m", r, c } moves the pawn, { t: "w", r, c, o } places a wall. Returns a new state (or null if illegal). */
export function apply(s, m) {
  if (s.over) return null;
  const p = s.turn;
  const n = { p: s.p.map((x) => x.slice()), walls: s.walls.slice(), left: s.left.slice(), turn: 1 - p, moves: s.moves + 1, over: false, winner: -1 };
  if (m.t === "m") {
    if (!pawnMoves(s).some(([r, c]) => r === m.r && c === m.c)) return null;
    n.p[p] = [m.r, m.c];
    if (m.r === GOAL[p]) { n.over = true; n.winner = p; }
  } else {
    if (!wallLegal(s, m.r, m.c, m.o)) return null;
    n.walls.push([m.r, m.c, m.o]);
    n.left[p] -= 1;
  }
  return n;
}

// ---------- computer ----------
function evaluate(s, me) {
  if (s.over) return s.winner === me ? 1e5 : -1e5;
  const g = grid(s);
  const dm = pathFor(s, me, g);
  const dop = pathFor(s, 1 - me, g);
  return (dop - dm) * 10 + (s.left[me] - s.left[1 - me]) * 1.2;
}

/** Walls that would lengthen the opponent's way: those that cut an edge of their shortest path. */
function candidateWalls(s) {
  const p = s.turn;
  const { path } = pathFor(s, 1 - p, grid(s), true);
  const seen = new Set();
  const out = [];
  const add = (r, c, o) => { const k = `${r},${c},${o}`; if (!seen.has(k) && wallLegal(s, r, c, o)) { seen.add(k); out.push([r, c, o]); } };
  for (let i = 0; i + 1 < path.length; i += 1) {
    const [r, c] = path[i];
    const [r2, c2] = path[i + 1];
    if (r2 !== r) { const rr = Math.min(r, r2); add(rr, c, 0); add(rr, c - 1, 0); } else { const cc = Math.min(c, c2); add(r, cc, 1); add(r - 1, cc, 1); }
  }
  return out;
}

function moveList(s, wallLimit, me) {
  const list = pawnMoves(s).map(([r, c]) => ({ t: "m", r, c }));
  if (s.left[s.turn] > 0) {
    const walls = candidateWalls(s).map(([r, c, o]) => {
      const n = apply(s, { t: "w", r, c, o });
      return { m: { t: "w", r, c, o }, v: evaluate(n, s.turn) };
    }).sort((a, b) => b.v - a.v).slice(0, wallLimit);
    walls.forEach((w) => list.push(w.m));
  }
  void me;
  return list;
}

function search(s, depth, alpha, beta, me, wallLimit) {
  if (s.over || depth === 0) return evaluate(s, s.turn);
  let best = -Infinity;
  for (const m of moveList(s, wallLimit, me)) {
    const n = apply(s, m);
    if (!n) continue;
    const v = -search(n, depth - 1, -beta, -alpha, me, wallLimit);
    if (v > best) best = v;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
  }
  return best;
}

/** The pawn move that leaves the shortest way to the goal (jumps count). */
function bestPawnMove(s) {
  let best = null;
  let bd = Infinity;
  pawnMoves(s).forEach(([r, c]) => {
    const n = apply(s, { t: "m", r, c });
    const d = n.over ? -1 : pathFor({ ...n, turn: s.turn }, s.turn);
    if (d < bd) { bd = d; best = { t: "m", r, c }; }
  });
  return best;
}

export function chooseMove(s, level) {
  const p = s.turn;
  const moves = pawnMoves(s);
  const step = (() => { const b = bestPawnMove(s); return b ? [b.r, b.c] : null; })();
  if (level === "easy") {
    if (s.left[p] > 0 && Math.random() < 0.22) { const w = candidateWalls(s); if (w.length) { const [r, c, o] = w[Math.floor(Math.random() * w.length)]; return { t: "w", r, c, o }; } }
    if (Math.random() < 0.25) { const [r, c] = moves[Math.floor(Math.random() * moves.length)]; return { t: "m", r, c }; }
    return step ? { t: "m", r: step[0], c: step[1] } : { t: "m", r: moves[0][0], c: moves[0][1] };
  }
  const depth = level === "hard" ? 4 : 3;
  const wallLimit = level === "hard" ? 10 : 6;
  let best = null;
  let bestV = -Infinity;
  const list = moveList(s, wallLimit, p);
  // prefer moving along the shortest path on ties
  list.forEach((m) => {
    const n = apply(s, m);
    if (!n) return;
    let v = -search(n, depth - 1, -Infinity, Infinity, p, wallLimit);
    if (m.t === "m" && step && m.r === step[0] && m.c === step[1]) v += 0.5;
    v += Math.random() * 0.2;
    if (v > bestV) { bestV = v; best = m; }
  });
  return best || { t: "m", r: moves[0][0], c: moves[0][1] };
}
