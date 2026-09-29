/** Minesweeper rules. Pure logic. Cells are indexed r * cols + c. */
export const LEVELS = {
  easy: { rows: 9, cols: 9, mines: 10 },
  medium: { rows: 12, cols: 12, mines: 25 },
  hard: { rows: 16, cols: 16, mines: 45 },
};

export function newGame(level = "easy") {
  const { rows, cols, mines } = LEVELS[level];
  return {
    rows,
    cols,
    mines,
    placed: false, // mines are placed on the first reveal so the first click is always safe
    mine: Array(rows * cols).fill(false),
    open: Array(rows * cols).fill(false),
    flag: Array(rows * cols).fill(false),
    count: Array(rows * cols).fill(0),
    status: "ready", // ready | playing | won | lost
    exploded: -1,
  };
}

export function neighbors(g, i) {
  const r = Math.floor(i / g.cols);
  const c = i % g.cols;
  const out = [];
  for (let dr = -1; dr <= 1; dr += 1) {
    for (let dc = -1; dc <= 1; dc += 1) {
      if (!dr && !dc) continue;
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < g.rows && nc >= 0 && nc < g.cols) out.push(nr * g.cols + nc);
    }
  }
  return out;
}

function placeMines(g, safe, rng) {
  // keep the first-clicked cell and its neighbours free of mines so the first click opens up space
  const forbidden = new Set([safe, ...neighbors(g, safe)]);
  const pool = [];
  for (let i = 0; i < g.mine.length; i += 1) if (!forbidden.has(i)) pool.push(i);
  // if the board is too crowded for the buffer, fall back to only protecting the clicked cell
  const candidates = pool.length >= g.mines ? pool : [...Array(g.mine.length).keys()].filter((i) => i !== safe);
  for (let k = candidates.length - 1; k > 0; k -= 1) {
    const j = Math.floor(rng() * (k + 1));
    [candidates[k], candidates[j]] = [candidates[j], candidates[k]];
  }
  candidates.slice(0, g.mines).forEach((i) => {
    g.mine[i] = true;
  });
  for (let i = 0; i < g.count.length; i += 1) g.count[i] = neighbors(g, i).filter((n) => g.mine[n]).length;
  g.placed = true;
}

function flood(g, start) {
  const stack = [start];
  while (stack.length) {
    const i = stack.pop();
    if (g.open[i] || g.flag[i]) continue;
    g.open[i] = true;
    if (g.count[i] === 0) neighbors(g, i).forEach((n) => !g.open[n] && stack.push(n));
  }
}

function checkWin(g) {
  const safeClosed = g.open.filter((o, i) => !o && !g.mine[i]).length;
  if (safeClosed === 0) {
    g.status = "won";
    g.mine.forEach((m, i) => {
      if (m) g.flag[i] = true;
    });
  }
}

/** Opens a cell. Mutates and returns g. */
export function reveal(g, i, rng = Math.random) {
  if (g.status === "won" || g.status === "lost" || g.flag[i] || g.open[i]) return g;
  if (!g.placed) {
    placeMines(g, i, rng);
    g.status = "playing";
  }
  if (g.mine[i]) {
    g.status = "lost";
    g.exploded = i;
    g.open[i] = true;
    return g;
  }
  flood(g, i);
  checkWin(g);
  return g;
}

export function toggleFlag(g, i) {
  if (g.status === "won" || g.status === "lost" || g.open[i]) return g;
  g.flag[i] = !g.flag[i];
  return g;
}

/** Chording: on an opened number whose flags match its count, open all other neighbours. */
export function chord(g, i, rng = Math.random) {
  if (!g.open[i] || g.count[i] === 0 || g.status !== "playing") return g;
  const near = neighbors(g, i);
  if (near.filter((n) => g.flag[n]).length !== g.count[i]) return g;
  near.forEach((n) => {
    if (!g.flag[n] && !g.open[n] && g.status === "playing") reveal(g, n, rng);
  });
  return g;
}

export const flagsLeft = (g) => g.mines - g.flag.filter(Boolean).length;
