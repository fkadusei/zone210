#!/usr/bin/env node
/** Checks that every Nonograms picture is the right size and can be solved by logic alone (one answer, no guessing).
 *   node tools/check-nonograms.mjs */
import { solvable, makePuzzle } from "../public/games/nonograms/puzzles.js";
let bad = 0;
for (const size of ["small", "medium", "large"]) {
  const r = solvable(size);
  r.filter((x) => !x.ok).forEach((x) => { bad += 1; console.log(`PROBLEM: ${size} #${x.i + 1} ${x.name} can't be solved by logic (or is the wrong size)`); });
  for (let s = 1; s <= 30; s += 1) if (makePuzzle(size, -1, s).name !== "Mystery pattern") { bad += 1; console.log(`PROBLEM: no endless ${size} puzzle for seed ${s}`); }
  console.log(`${size}: ${r.length} pictures OK`);
}
if (bad) process.exit(1); else console.log("Nonograms OK.");
