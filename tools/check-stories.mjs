#!/usr/bin/env node
/**
 * Checks the Once Upon a Time stories: every link goes to a page that exists, every page can be reached, no page
 * is a dead end, every activity is well formed, and characters only use known moves and backdrops.
 *   node tools/check-stories.mjs
 */
import { STORIES } from "../public/games/once-upon/stories.js";
import { BACKDROPS, MOVES } from "../public/games/once-upon/art.js";
const TYPES = new Set(["collect", "count", "order", "pairs", "taps", "paint"]);
let bad = 0, scenes = 0, ends = 0, acts = 0;
const err = (m) => { bad += 1; console.log("PROBLEM:", m); };
for (const s of STORIES) {
  if (!s.scenes[s.start]) err(`${s.id}: start page ${s.start} is missing`);
  const nexts = (sc) => [...(sc.choices || []).filter((c) => c.to).map((c) => c.to), ...(sc.act ? [sc.done, ...(sc.act.options || []).map((o) => o[2])] : [])].filter(Boolean);
  for (const [id, sc] of Object.entries(s.scenes)) {
    scenes += 1;
    if (sc.end) ends += 1;
    if (!sc.text || !sc.text.length) err(`${s.id}/${id}: no text`);
    if (!BACKDROPS.includes(sc.bg)) err(`${s.id}/${id}: unknown backdrop "${sc.bg}"`);
    (sc.art || []).forEach((a) => { if (a[3] && !MOVES.has(a[3])) err(`${s.id}/${id}: unknown move "${a[3]}"`); });
    nexts(sc).forEach((t) => { if (!s.scenes[t]) err(`${s.id}/${id}: goes to missing page ${t}`); });
    if (!sc.end && !nexts(sc).length) err(`${s.id}/${id}: dead end`);
    if (sc.act) {
      acts += 1;
      const a = sc.act;
      if (!TYPES.has(a.type)) err(`${s.id}/${id}: unknown activity "${a.type}"`);
      if (a.type === "count" && !a.options.includes(a.n)) err(`${s.id}/${id}: the right count is not one of the answers`);
      if (a.type !== "paint" && !sc.done) err(`${s.id}/${id}: activity has no page to go to when done`);
    }
    if (sc.choices && sc.choices.length && sc.choices.every((c) => c.wrong)) err(`${s.id}/${id}: every choice is wrong`);
  }
  const seen = new Set([s.start]), q = [s.start];
  while (q.length) nexts(s.scenes[q.shift()] || {}).forEach((t) => { if (!seen.has(t)) { seen.add(t); q.push(t); } });
  Object.keys(s.scenes).filter((k) => !seen.has(k)).forEach((k) => err(`${s.id}/${k}: can't be reached`));
  if (!Object.values(s.scenes).some((x) => x.end && x.end.kind === "good")) err(`${s.id}: no happy ending`);
}
console.log(`${STORIES.length} stories, ${scenes} pages, ${ends} endings, ${acts} activities.`);
if (bad) { console.log(`${bad} problems.`); process.exit(1); } else console.log("Stories OK.");
