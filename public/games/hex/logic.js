/**
 * Hex rules and a Monte Carlo tree search opponent. Pure functions, no DOM.
 * n x n rhombus board, index = row * n + col. Colour 1 (Red) connects the top row to the bottom row,
 * colour 2 (Blue) connects the left column to the right column. Red moves first.
 * Neighbours of (r, c): (r, c-1), (r, c+1), (r-1, c), (r+1, c), (r-1, c+1), (r+1, c-1).
 */
const NB = [[0, -1], [0, 1], [-1, 0], [1, 0], [-1, 1], [1, -1]];
const nbCache = {};
export function neighbors(n) {
  if (nbCache[n]) return nbCache[n];
  const out = [];
  for (let r = 0; r < n; r += 1) for (let c = 0; c < n; c += 1) {
    const list = [];
    for (const [dr, dc] of NB) { const rr = r + dr, cc = c + dc; if (rr >= 0 && rr < n && cc >= 0 && cc < n) list.push(rr * n + cc); }
    out.push(list);
  }
  nbCache[n] = out;
  return out;
}
export const other = (p) => 3 - p;
export const emptyBoard = (n) => new Array(n * n).fill(0);

/** The winning chain of cells for `colour`, or null. */
export function winningPath(b, n, colour) {
  const nb = neighbors(n);
  const prev = new Int16Array(n * n).fill(-2);
  const queue = [];
  for (let k = 0; k < n; k += 1) {
    const i = colour === 1 ? k : k * n; // top row for Red, left column for Blue
    if (b[i] === colour) { prev[i] = -1; queue.push(i); }
  }
  for (let q = 0; q < queue.length; q += 1) {
    const i = queue[q];
    const done = colour === 1 ? Math.floor(i / n) === n - 1 : i % n === n - 1;
    if (done) { const path = []; for (let x = i; x >= 0; x = prev[x]) path.push(x); return path.reverse(); }
    for (const j of nb[i]) if (b[j] === colour && prev[j] === -2) { prev[j] = i; queue.push(j); }
  }
  return null;
}
export const winnerOf = (b, n) => (winningPath(b, n, 1) ? 1 : winningPath(b, n, 2) ? 2 : 0);

// ---------- computer player: Monte Carlo tree search ----------
function playoutWinner(b, n, toMove, empties, buf) {
  // fill every empty cell randomly, alternating colours; exactly one colour ends up connected
  const m = empties.length;
  for (let i = 0; i < m; i += 1) buf[i] = empties[i];
  for (let i = m - 1; i > 0; i -= 1) { const j = (Math.random() * (i + 1)) | 0; const t = buf[i]; buf[i] = buf[j]; buf[j] = t; }
  const nb = neighbors(n);
  const filled = b.slice();
  let colour = toMove;
  for (let i = 0; i < m; i += 1) { filled[buf[i]] = colour; colour = 3 - colour; }
  // Red wins if it connects top to bottom
  const seen = new Uint8Array(n * n);
  const stack = [];
  for (let c = 0; c < n; c += 1) if (filled[c] === 1) { seen[c] = 1; stack.push(c); }
  while (stack.length) {
    const i = stack.pop();
    if (i >= (n - 1) * n) return 1;
    for (const j of nb[i]) if (!seen[j] && filled[j] === 1) { seen[j] = 1; stack.push(j); }
  }
  return 2;
}

function candidates(b, n) {
  const nb = neighbors(n);
  const near = new Set();
  let any = false;
  for (let i = 0; i < b.length; i += 1) {
    if (!b[i]) continue;
    any = true;
    near.add(i);
    for (const j of nb[i]) { near.add(j); for (const k of nb[j]) near.add(k); }
  }
  const out = [];
  if (!any) { out.push(((n - 1) / 2 | 0) * n + ((n - 1) / 2 | 0)); return out; }
  near.forEach((i) => { if (!b[i]) out.push(i); });
  return out.length ? out : b.map((v, i) => (v ? -1 : i)).filter((i) => i >= 0);
}

export function chooseMove(board, n, colour, level = "normal") {
  const empties = [];
  board.forEach((v, i) => { if (!v) empties.push(i); });
  if (!empties.length) return -1;
  const cands = candidates(board, n);
  // an immediate win is always taken, an immediate loss always blocked
  for (const i of cands) { const t = board.slice(); t[i] = colour; if (winningPath(t, n, colour)) return i; }
  if (level === "easy" && Math.random() < 0.45) return cands[Math.floor(Math.random() * cands.length)];
  const ms = level === "hard" ? 1800 : level === "easy" ? 120 : 800;
  const buf = new Int16Array(empties.length);
  const root = { visits: 0, wins: 0, children: [], untried: cands.slice(), colour: other(colour), move: -1, parent: null, b: board };
  const deadline = Date.now() + ms;
  let iter = 0;
  while ((iter & 15) !== 0 || Date.now() < deadline) {
    iter += 1;
    let node = root;
    let b = board;
    // selection
    while (!node.untried.length && node.children.length) {
      let best = null, bestV = -Infinity;
      const lg = Math.log(node.visits + 1);
      for (const ch of node.children) { const v = ch.wins / (ch.visits + 1e-9) + 0.7 * Math.sqrt(lg / (ch.visits + 1e-9)); if (v > bestV) { bestV = v; best = ch; } }
      node = best;
      b = node.b;
    }
    // expansion
    if (node.untried.length) {
      const idx = (Math.random() * node.untried.length) | 0;
      const mv = node.untried[idx];
      node.untried[idx] = node.untried[node.untried.length - 1];
      node.untried.pop();
      const nb2 = b.slice();
      const mover = other(node.colour);
      nb2[mv] = mover;
      const child = { visits: 0, wins: 0, children: [], untried: null, colour: mover, move: mv, parent: node, b: nb2 };
      child.untried = candidates(nb2, n).filter((x) => !nb2[x]);
      node.children.push(child);
      node = child;
      b = nb2;
    }
    // simulation
    const em = [];
    for (let i = 0; i < b.length; i += 1) if (!b[i]) em.push(i);
    const w = em.length ? playoutWinner(b, n, other(node.colour), em, buf) : (winningPath(b, n, 1) ? 1 : 2);
    // backpropagation: wins are counted for the colour that made the move leading to each node
    for (let x = node; x; x = x.parent) { x.visits += 1; if (x.colour === w) x.wins += 1; }
    if (iter > 400000) break;
  }
  let best = root.children[0];
  for (const ch of root.children) if (ch.visits > best.visits) best = ch;
  return best ? best.move : cands[0];
}

/** Whether the second player should swap sides after the first move (the "pie rule"). */
export function shouldSwap(n, i) {
  const r = Math.floor(i / n), c = i % n;
  const mid = (n - 1) / 2;
  const d = Math.max(Math.abs(r - mid), Math.abs(c - mid));
  // central cells are strong; very central openings are worth taking over
  return d <= n * 0.3 && !(r === 0 || r === n - 1 || c === 0 || c === n - 1);
}
/** A reasonable first move for a computer that must assume the opponent may swap: neither too strong nor too weak. */
export function pieOpening(n) {
  const mid = (n - 1) / 2;
  const r = Math.max(1, Math.round(mid * 0.45));
  return r * n + Math.max(1, Math.round(mid * 0.55 + (Math.random() < 0.5 ? 0 : 1)));
}
