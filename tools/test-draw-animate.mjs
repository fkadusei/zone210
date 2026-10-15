#!/usr/bin/env node
/**
 * Regression tests for Draw & Animate, in a real (headless) Chrome:
 *   node tools/test-draw-animate.mjs              the usual run, a few minutes
 *   node tools/test-draw-animate.mjs --long       many more monkey steps (10 minutes or so)
 *   node tools/test-draw-animate.mjs --only twoFingers,layout   just those (case names, or cases / saves / layout / monkey)
 *   node tools/test-draw-animate.mjs --seeds 7,8 --steps 3000   the monkey with these seeds and this many steps
 * It starts its own server for public/ and its own Chrome, so nothing else needs to be running (Chrome must be
 * installed; set CHROME to its path if it is not in the usual place on a Mac).
 *  - cases:  things a child does, each checked against what should happen    (tools/draw-animate-tests/cases.mjs)
 *  - saves:  damaged or older saved drawings; the page must still open        (cases.mjs, SAVES)
 *  - layout: every main screen fits phones 320, 390 and 768 wide              (cases.mjs, LAYOUT)
 *  - monkey: random taps, drags, scribbles, buttons, typing and stray fingers; a page error, or a saved drawing that has
 *            gone bad, fails it                                               (tools/draw-animate-tests/monkey.js)
 * A failing test leaves a screenshot of the page in the temporary folder, and says where.
 * The motion maths has its own quicker checks: node tools/check-draw-animate.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { startBrowser, wrap, reporter, options } from "./browser-tests.mjs";

const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "draw-animate-tests");
const { CASES, SAVES, SAVE_JS, LAYOUT, LAYOUT_WIDTHS } = await import(path.join(DIR, "cases.mjs"));
const LIB = fs.readFileSync(path.join(DIR, "page-lib.js"), "utf8"), MONKEY = fs.readFileSync(path.join(DIR, "monkey.js"), "utf8");
const { SEEDS, STEPS, wanted } = options();
const browser = await startBrowser(), { report, finish } = reporter();
const PAGE = "games/draw-animate/", KEY = "zone210_drawanim";
const run = ({ save, js, ...rest }) => browser.open(PAGE, { ...rest, js, storage: { [KEY]: typeof save === "string" ? save : JSON.stringify(save) } });
const caseJs = (js) => wrap(LIB, js);

// ---------- the tests ----------
for (const c of CASES) if (wanted("cases", c.name)) report("cases", c.name, await run({ ...c, js: caseJs(c.js), label: c.name }));
for (const [name, save] of Object.entries(SAVES)) if (wanted("saves", name)) report("saves", name, await run({ save, js: caseJs(SAVE_JS), w: 600, h: 900, label: "save-" + name }));
if (wanted("layout")) for (const w of LAYOUT_WIDTHS) report("layout", `${w} wide`, await run({ ...LAYOUT, js: caseJs(LAYOUT.js), w, h: 900, label: `layout-${w}` }));
if (wanted("monkey")) for (const [k, seed] of SEEDS.entries()) {
  const [w, h] = k % 2 ? [1200, 900] : [390, 844];
  const r = await run({ save: {}, js: MONKEY.replace("const SEED = __SEED__, STEPS = __STEPS__", `const SEED = ${seed}, STEPS = ${STEPS}`), w, h, label: `monkey-${seed}`, limit: 60000 + STEPS * 400 });
  report("monkey", `seed ${seed}, ${STEPS} steps, ${w} wide`, r);
}
finish(browser);
