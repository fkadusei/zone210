/**
 * Sudoku generator and solver. Puzzles are guaranteed to have exactly one solution.
 * Grids are flat arrays of 81 numbers (0 = empty), index = row * 9 + col.
 */
const ALL = 0x1ff; // bits 0..8 = digits 1..9

const popcount = (x) => {
  let n = 0;
  while (x) {
    x &= x - 1;
    n += 1;
  }
  return n;
};
const box = (r, c) => Math.floor(r / 3) * 3 + Math.floor(c / 3);

function shuffle(a, rng) {
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Backtracking search with the "fewest candidates first" heuristic.
 * Counts solutions up to `limit`; if `fill` is set, leaves the first solution found in `grid`.
 * `rng` randomises digit order (used to build random full grids).
 */
function search(grid, limit, rng, fill) {
  const rows = Array(9).fill(0);
  const cols = Array(9).fill(0);
  const boxes = Array(9).fill(0);
  for (let i = 0; i < 81; i += 1) {
    const v = grid[i];
    if (!v) continue;
    const bit = 1 << (v - 1);
    const r = Math.floor(i / 9);
    const c = i % 9;
    if ((rows[r] | cols[c] | boxes[box(r, c)]) & bit) return 0; // contradiction in the givens
    rows[r] |= bit;
    cols[c] |= bit;
    boxes[box(r, c)] |= bit;
  }

  let count = 0;
  const work = grid.slice();

  function recurse() {
    // most constrained empty cell
    let bestI = -1;
    let bestMask = 0;
    let bestN = 10;
    for (let i = 0; i < 81; i += 1) {
      if (work[i]) continue;
      const r = Math.floor(i / 9);
      const c = i % 9;
      const mask = ALL & ~(rows[r] | cols[c] | boxes[box(r, c)]);
      const n = popcount(mask);
      if (n < bestN) {
        bestN = n;
        bestI = i;
        bestMask = mask;
        if (n <= 1) break;
      }
    }
    if (bestI === -1) {
      count += 1;
      if (fill && count === 1) for (let i = 0; i < 81; i += 1) grid[i] = work[i];
      return count >= limit;
    }
    if (bestN === 0) return false;

    const r = Math.floor(bestI / 9);
    const c = bestI % 9;
    const b = box(r, c);
    const digits = [];
    for (let d = 0; d < 9; d += 1) if (bestMask & (1 << d)) digits.push(d);
    if (rng) shuffle(digits, rng);
    for (const d of digits) {
      const bit = 1 << d;
      work[bestI] = d + 1;
      rows[r] |= bit;
      cols[c] |= bit;
      boxes[b] |= bit;
      if (recurse()) return true;
      rows[r] &= ~bit;
      cols[c] &= ~bit;
      boxes[b] &= ~bit;
      work[bestI] = 0;
    }
    return false;
  }

  recurse();
  return count;
}

/** Number of solutions of a grid, capped at `limit` (default 2). */
export const countSolutions = (grid, limit = 2) => search(grid.slice(), limit, null, false);

/** Solves a grid; returns the solved copy, or null if unsolvable. */
export function solve(grid) {
  const g = grid.slice();
  return search(g, 1, null, true) === 1 ? g : null;
}

export const CLUES = { easy: 40, medium: 32, hard: 27 };

/** Generates { puzzle, solution } for a difficulty: "easy" | "medium" | "hard". */
export function generate(level = "medium", rng = Math.random) {
  const solution = Array(81).fill(0);
  search(solution, 1, rng, true);

  const puzzle = solution.slice();
  const target = CLUES[level] ?? CLUES.medium;
  const order = shuffle([...Array(81).keys()], rng);
  let clues = 81;
  for (const i of order) {
    if (clues <= target) break;
    const keep = puzzle[i];
    puzzle[i] = 0;
    if (countSolutions(puzzle, 2) !== 1) puzzle[i] = keep; // removing it would make the puzzle ambiguous
    else clues -= 1;
  }
  return { puzzle, solution, clues };
}

/** Indexes of cells that break a Sudoku rule (a duplicate in a row, column or box). */
export function conflicts(grid) {
  const bad = new Set();
  const groups = [];
  for (let k = 0; k < 9; k += 1) {
    groups.push([...Array(9).keys()].map((c) => k * 9 + c)); // row k
    groups.push([...Array(9).keys()].map((r) => r * 9 + k)); // column k
    const br = Math.floor(k / 3) * 3;
    const bc = (k % 3) * 3;
    groups.push([...Array(9).keys()].map((n) => (br + Math.floor(n / 3)) * 9 + bc + (n % 3)));
  }
  groups.forEach((g) => {
    const seen = new Map();
    g.forEach((i) => {
      const v = grid[i];
      if (!v) return;
      if (seen.has(v)) {
        bad.add(i);
        bad.add(seen.get(v));
      } else seen.set(v, i);
    });
  });
  return bad;
}

/** Candidate digits for cell i given the current grid. */
export function candidates(grid, i) {
  if (grid[i]) return [];
  const r = Math.floor(i / 9);
  const c = i % 9;
  const used = new Set();
  for (let k = 0; k < 9; k += 1) {
    used.add(grid[r * 9 + k]);
    used.add(grid[k * 9 + c]);
  }
  const br = Math.floor(r / 3) * 3;
  const bc = Math.floor(c / 3) * 3;
  for (let dr = 0; dr < 3; dr += 1) for (let dc = 0; dc < 3; dc += 1) used.add(grid[(br + dr) * 9 + bc + dc]);
  return [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((d) => !used.has(d));
}
