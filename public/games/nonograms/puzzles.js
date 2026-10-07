/**
 * Nonograms: hidden pictures, and a line-by-line solver. A picture is only used if the solver can finish it
 * by logic alone (so it has one answer and never needs a guess); random "endless" puzzles are checked the same way.
 */
const P = (name, color, rows) => ({ name, color, rows: rows.trim().split(/\s+/) });
export const PICTURES = {
  small: [
    P("Heart", "#e5484d", ".#.#. ##### ##### .###. ..#.."),
    P("Tree", "#22a06b", "..#.. .###. ##### ..#.. ..#.."),
    P("Arrow", "#3b82f6", "..#.. .###. #.#.# ..#.. ..#.."),
    P("Plus", "#f59e0b", "..#.. ..#.. ##### ..#.. ..#.."),
    P("Boat", "#0ea5e9", "..#.. ..##. .###. ##### .###."),
    P("Cat", "#a855f7", "#...# ##.## ##### #.#.# .###."),
    P("Star", "#eab308", "..#.. ##### .###. .#.#. #...#"),
    P("Number two", "#14b8a6", ".##.. #..#. ..#.. .#... ####."),
    P("Cup", "#b45309", "####. ##### ####. ####. .##.."),
    P("Key", "#ca8a04", "##... ##### ##.#. ..... ....."),
    P("House", "#ef4444", "..#.. .###. ##### ##.## ##.##"),
  ],
  medium: [
    P("Mushroom", "#e5484d", "...####... .##.##.##. ########## #.#####.## ########## ...#..#... ...####... ...####... ...####... ..######.."),
    P("Fish", "#0ea5e9", ".......... ...#####.. .#########. ###.######. ########### .#########. ...#####.. .......... .......... ..........".replace(/(\S{10})\S*/g, "$1")),
    P("Rocket", "#6366f1", "....##.... ...####... ...####... ..##..##.. ..##..##.. ..######.. ..######.. .########. ###.##.### ##..##..##"),
    P("Apple", "#dc2626", ".....#.... ....#..... ..##.###.. .########. ########## ########## ########## .########. .########. ..##..##.."),
    P("Umbrella", "#8b5cf6", "....##.... ..######.. .########. ########## #.#.##.#.# ....##.... ....##.... ....##.... .#..##.... ..##......"),
    P("Music note", "#ec4899", "....####.. ....######. ....##..## ....##.... ....##.... ....##.... .####..... ######.... ######.... .####.....".replace(/(\S{10})\S*/g, "$1")),
    P("Sun", "#f59e0b", "#...##...# ....##.... ..######.. .########. ########## ########## .########. ..######.. ....##.... #...##...#"),
    P("Cat face", "#a855f7", "#........# ##......## ###....### ########## #.##..##.# ########## ####..#### .########. ..######.. ...####..."),
    P("House", "#ef4444", "....##.... ...####... ..######.. .########. ########## .#.####.#. .#.####.#. .###..###. .###..###. .###..###."),
    P("Turtle", "#16a34a", ".......... ...####... ..######.. .######### ########## ########## .##....##. .##....##. .......... .........."),
  ],
  large: [
    P("Castle", "#7c3aed", "#.#.#...#.#.#.. ###.#...#.###.. ###########.... .#########..... .#########..... .####.####..... .###...###..... .###...###..... ##############. ##############. ###.######.###. ###.######.###. ###...##...###. ###...##...###. ##############.".replace(/(\S{15})\S*/g, "$1")),
    P("Duck", "#eab308", "...####........ ..######....... ..##.###....... ..######....... ###.####....... ....####....... ....#####...... ...##########.. ..############. .#############. .#############. ..###########.. ...#########... ....#######.... ...............".replace(/(\S{15})\S*/g, "$1")),
    P("Rabbit", "#f472b6", "..##.....##.... ..##.....##.... ..##.....##.... ..###...###.... ...#########... ..###########.. ..##.#####.##.. ..###########.. ..#####.#####.. ...#########... ....#######.... ...#########... ..###########.. ..###########.. ...####.####...".replace(/(\S{15})\S*/g, "$1")),
    P("Tree", "#22a06b", ".......#....... ......###...... .....#####..... ....#######.... ...#########... ....#######.... ...#########... ..###########.. .#############. ...#########... ..###########.. .#############. ###############. ......###...... ......###......".replace(/(\S{15})\S*/g, "$1")),
  ],
};
export const SIZES = { small: 5, medium: 10, large: 15 };

const toGrid = (pic) => pic.rows.map((r) => [...r].map((ch) => (ch === "#" ? 1 : 0)));
export const cluesOf = (line) => { const out = []; let n = 0; line.forEach((v) => { if (v) n += 1; else if (n) { out.push(n); n = 0; } }); if (n) out.push(n); return out.length ? out : [0]; };
export function clues(grid) {
  const N = grid.length, M = grid[0].length;
  return { rows: grid.map(cluesOf), cols: Array.from({ length: M }, (_, c) => cluesOf(Array.from({ length: N }, (_, r) => grid[r][c]))) };
}

/** All ways to place the clue's blocks in a line that agree with what is known (-1 unknown, 0 empty, 1 filled). */
function solveLine(clue, known) {
  const n = known.length;
  const blocks = clue[0] === 0 ? [] : clue;
  const can = Array.from({ length: n }, () => [false, false]); // can be empty / can be filled
  let found = false;
  const cur = new Array(n).fill(0);
  const ok = (i, v) => known[i] === -1 || known[i] === v;
  (function place(b, start) {
    if (b === blocks.length) {
      for (let i = start; i < n; i += 1) if (!ok(i, 0)) return;
      found = true;
      for (let i = 0; i < n; i += 1) can[i][i >= start ? 0 : cur[i]] = true;
      return;
    }
    const len = blocks[b];
    const rest = blocks.slice(b + 1).reduce((a, x) => a + x + 1, 0);
    for (let s = start; s + len + rest <= n; s += 1) {
      let good = true;
      for (let i = start; i < s; i += 1) if (!ok(i, 0)) { good = false; break; }
      if (!good) break;
      for (let i = s; i < s + len; i += 1) if (!ok(i, 1)) { good = false; break; }
      if (good && s + len < n && !ok(s + len, 0)) good = false;
      if (!good) continue;
      for (let i = start; i < s; i += 1) cur[i] = 0;
      for (let i = s; i < s + len; i += 1) cur[i] = 1;
      if (s + len < n) cur[s + len] = 0;
      place(b + 1, Math.min(n, s + len + 1));
    }
  })(0, 0);
  if (!found) return null;
  return can.map(([e, f]) => (e && f ? -1 : f ? 1 : 0));
}
/** Line-by-line logic. Returns the solved grid, or null if it gets stuck (would need guessing) or is impossible. */
export function solve(rowClues, colClues) {
  const N = rowClues.length, M = colClues.length;
  const g = Array.from({ length: N }, () => new Array(M).fill(-1));
  for (let changed = true, guard = 0; changed && guard < 200; guard += 1) {
    changed = false;
    for (let r = 0; r < N; r += 1) {
      const res = solveLine(rowClues[r], g[r]);
      if (!res) return null;
      res.forEach((v, c) => { if (v !== -1 && g[r][c] === -1) { g[r][c] = v; changed = true; } });
    }
    for (let c = 0; c < M; c += 1) {
      const col = g.map((row) => row[c]);
      const res = solveLine(colClues[c], col);
      if (!res) return null;
      res.forEach((v, r) => { if (v !== -1 && g[r][c] === -1) { g[r][c] = v; changed = true; } });
    }
  }
  return g.every((row) => row.every((v) => v !== -1)) ? g : null;
}

const seeded = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const COLORS = ["#e5484d", "#3b82f6", "#22a06b", "#a855f7", "#f59e0b", "#0ea5e9", "#ec4899"];
/** A puzzle: a picture by index, or (index -1) an endless puzzle made from the seed and checked by the solver. */
export function makePuzzle(size, index, seed) {
  if (index >= 0) {
    const pic = PICTURES[size][index % PICTURES[size].length];
    const grid = toGrid(pic);
    return { name: pic.name, color: pic.color, grid, ...clues(grid), index };
  }
  const n = SIZES[size], rnd = seeded(seed);
  for (let tries = 0; tries < 400; tries += 1) {
    const grid = Array.from({ length: n }, () => Array.from({ length: n }, () => (rnd() < 0.58 ? 1 : 0)));
    const c = clues(grid);
    if (solve(c.rows, c.cols)) return { name: "Mystery pattern", color: COLORS[Math.floor(rnd() * COLORS.length)], grid, ...c, index: -1 };
  }
  return makePuzzle(size, 0, 0);
}
/** Which pictures the solver can finish (used by tools/check-nonograms.mjs and to skip any that can't). */
export const solvable = (size) => PICTURES[size].map((p, i) => { const g = toGrid(p); const c = clues(g); return { i, name: p.name, ok: !!solve(c.rows, c.cols) && g.every((r) => r.length === SIZES[size]) && g.length === SIZES[size] }; });
