#!/usr/bin/env node
/**
 * Checks Ribbon Sort's rules (public/games/ribbon-sort/logic.js):   node tools/check-ribbon-sort.mjs
 *  - the first 60 puzzles of every kind can be sorted, and the solver's answer really sorts them, move by move
 *  - no puzzle starts with a pole already sorted or three of a color together
 *  - the same puzzle number always gives the same puzzle; a move never loses or adds a roll
 */
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
const L = await import(pathToFileURL(path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../public/games/ribbon-sort/logic.js")).href);
let bad = 0;
const check = (ok, msg) => { if (!ok) { bad += 1; console.log("✗", msg); } };
const count = (s) => s.flat().sort().join(",");
for (const mode of Object.keys(L.MODES)) {
  const m = L.MODES[mode];
  for (let n = 1; n <= 60; n += 1) {
    const d = L.deal(mode, L.seedOf(mode, n));
    check(d.poles.length === m.colors + m.spare && d.cap === m.cap, `${mode} ${n}: wrong number of poles`);
    check(d.poles.every((p) => !p.length || L.runOf(p) < p.length) && d.poles.every((p) => !p.some((v, i) => i >= 2 && p[i - 1] === v && p[i - 2] === v)), `${mode} ${n}: starts too easy`);
    check(JSON.stringify(L.deal(mode, L.seedOf(mode, n)).poles) === JSON.stringify(d.poles), `${mode} ${n}: not the same each time`);
    const way = L.solve(d.poles, d.cap);
    if (!way) { check(false, `${mode} ${n}: cannot be sorted`); continue; }
    let s = d.poles; const all = count(s);
    for (const [a, b] of way) { if (!L.canMove(s, a, b, d.cap)) { check(false, `${mode} ${n}: the solver made a move that is not allowed`); break; } s = L.move(s, a, b, d.cap).s; check(count(s) === all && s.every((p) => p.length <= d.cap), `${mode} ${n}: a move lost or added a roll`); }
    check(L.solved(s, d.cap) && L.progress(s, d.cap) === 100, `${mode} ${n}: the solver's answer does not sort it`);
    check(L.progress(d.poles, d.cap) < 100, `${mode} ${n}: shows as done at the start`);
  }
}
check(!L.canMove([[1], [2]], 0, 1, 3) && L.canMove([[1], []], 0, 1, 3) && L.canMove([[2, 1], [1]], 0, 1, 3) && !L.canMove([[1], [1, 1, 1]], 0, 1, 3), "the rule for where a roll may go");
check(JSON.stringify(L.move([[0, 1, 1, 1], [1, 1]], 0, 1, 4).s) === JSON.stringify([[0, 1], [1, 1, 1, 1]]), "only as many rolls as fit move");
console.log(bad ? `\n${bad} problem(s).` : "Ribbon Sort: every puzzle of every kind can be sorted, and the rules hold.");
process.exit(bad ? 1 : 0);
