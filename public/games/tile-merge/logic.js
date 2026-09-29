/**
 * Tile Merge: slide numbered tiles; equal tiles that collide merge into their sum.
 * Pure logic. Tiles have stable ids so the UI can animate slides and merges.
 */
export const SIZE = 4;
export const GOAL = 2048;

export function emptyCells(state) {
  const taken = new Set(state.tiles.map((t) => `${t.r},${t.c}`));
  const out = [];
  for (let r = 0; r < state.size; r += 1) for (let c = 0; c < state.size; c += 1) if (!taken.has(`${r},${c}`)) out.push([r, c]);
  return out;
}

function spawn(state, rng) {
  const cells = emptyCells(state);
  if (cells.length === 0) return null;
  const [r, c] = cells[Math.floor(rng() * cells.length)];
  const tile = { id: state.nextId, value: rng() < 0.9 ? 2 : 4, r, c };
  state.nextId += 1;
  state.tiles.push(tile);
  return tile;
}

export function newGame(rng = Math.random, size = SIZE) {
  const state = { size, tiles: [], score: 0, nextId: 1, won: false };
  spawn(state, rng);
  spawn(state, rng);
  return state;
}

const VECTORS = { left: [0, -1], right: [0, 1], up: [-1, 0], down: [1, 0] };

/**
 * Applies a move. Returns a NEW state plus animation info:
 *  { moved, state, slides: [{id, r, c}], absorbed: [{id, into, r, c}], spawned, gained }
 * If nothing moved, `moved` is false and `state` is the original.
 */
export function move(state, dir, rng = Math.random) {
  const [dr, dc] = VECTORS[dir];
  const n = state.size;
  const tiles = state.tiles.map((t) => ({ ...t, merged: false }));
  const grid = Array.from({ length: n }, () => Array(n).fill(null));
  tiles.forEach((t) => {
    grid[t.r][t.c] = t;
  });

  const rows = [...Array(n).keys()];
  const cols = [...Array(n).keys()];
  if (dr === 1) rows.reverse();
  if (dc === 1) cols.reverse();

  let moved = false;
  let gained = 0;
  const absorbed = [];
  const slides = [];

  rows.forEach((r) => {
    cols.forEach((c) => {
      const t = grid[r][c];
      if (!t) return;
      let cr = r;
      let cc = c;
      // slide through empty cells
      while (true) {
        const nr = cr + dr;
        const nc = cc + dc;
        if (nr < 0 || nr >= n || nc < 0 || nc >= n || grid[nr][nc]) break;
        cr = nr;
        cc = nc;
      }
      const nr = cr + dr;
      const nc = cc + dc;
      const blocker = nr >= 0 && nr < n && nc >= 0 && nc < n ? grid[nr][nc] : null;
      grid[r][c] = null;
      if (blocker && blocker.value === t.value && !blocker.merged) {
        blocker.value *= 2;
        blocker.merged = true;
        gained += blocker.value;
        absorbed.push({ id: t.id, into: blocker.id, r: blocker.r, c: blocker.c });
        moved = true;
        return;
      }
      grid[cr][cc] = t;
      if (cr !== r || cc !== c) moved = true;
      t.r = cr;
      t.c = cc;
    });
  });

  if (!moved) return { moved: false, state, slides: [], absorbed: [], spawned: null, gained: 0 };

  const survivors = tiles.filter((t) => !absorbed.some((a) => a.id === t.id)).map(({ merged, ...rest }) => ({ ...rest, mergedNow: merged }));
  const next = {
    size: n,
    tiles: survivors.map(({ mergedNow, ...rest }) => rest),
    score: state.score + gained,
    nextId: state.nextId,
    won: state.won || survivors.some((t) => t.value >= GOAL),
  };
  survivors.forEach((t) => slides.push({ id: t.id, r: t.r, c: t.c, merged: t.mergedNow, value: t.value }));
  const spawned = spawn(next, rng);
  return { moved: true, state: next, slides, absorbed, spawned, gained };
}

/** True when no move can change the board. */
export function isOver(state) {
  if (emptyCells(state).length > 0) return false;
  const at = (r, c) => state.tiles.find((t) => t.r === r && t.c === c);
  for (let r = 0; r < state.size; r += 1) {
    for (let c = 0; c < state.size; c += 1) {
      const t = at(r, c);
      const right = c + 1 < state.size ? at(r, c + 1) : null;
      const down = r + 1 < state.size ? at(r + 1, c) : null;
      if ((right && right.value === t.value) || (down && down.value === t.value)) return false;
    }
  }
  return true;
}

export const highest = (state) => state.tiles.reduce((m, t) => Math.max(m, t.value), 0);
