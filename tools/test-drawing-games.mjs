#!/usr/bin/env node
/**
 * Browser tests for the drawing games other than Draw & Animate (that one has tools/test-draw-animate.mjs):
 * Doodle & Color, Draw & Guess, Sprouts and the tracing in ABC & 123.
 *   node tools/test-drawing-games.mjs                 the usual run, a few minutes
 *   node tools/test-drawing-games.mjs --long          far more monkey steps
 *   node tools/test-drawing-games.mjs --only doodle,twoFingers   just those (game names, case names, or cases / saves / layout / monkey)
 * It starts its own server for public/ and its own headless Chrome (set CHROME if Chrome is not in the usual place).
 *  - cases:  things a child does, each checked against what should happen  (tools/drawing-games-tests/cases.mjs)
 *  - saves:  damaged saved settings; the game must still open
 *  - layout: the game fits phones 320 and 390 wide
 *  - monkey: random taps, drags, buttons and stray fingers; fails on any page error
 * Online play is left out: it needs a second device.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { startBrowser, wrap, reporter, options } from "./browser-tests.mjs";

const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "drawing-games-tests");
const { GAMES, BAD_SAVES } = await import(path.join(DIR, "cases.mjs"));
const LIB = fs.readFileSync(path.join(DIR, "page-lib.js"), "utf8");
const { SEEDS, STEPS, wanted } = options();
const browser = await startBrowser(), { report, finish } = reporter();
const json = (v) => (typeof v === "string" ? v : JSON.stringify(v));

// a child let loose: taps, drags and scribbles on the drawing surface, presses whatever is showing, stray fingers
const monkey = (surface, seed, steps) => String.raw`
let st = ${seed} >>> 0; const rnd = () => { st = (st + 0x6D2B79F5) >>> 0; let t = st; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const log = [];
for (let i = 0; i < ${steps}; i++) {
  const S = q(${JSON.stringify(surface)}), r = rnd(); let what = '';
  if (S && shown(S) && r < 0.45) { const [uw, uh] = units(S); let x = rnd() * uw, y = rnd() * uh;
    if (r < 0.2) { what = 'tap'; await tapOn(S, x, y); }
    else if (r < 0.4) { what = 'drag'; const pts = [[x, y]]; for (let k = 0; k < 2 + rnd() * 12; k++) { x += (rnd() - 0.5) * uw * 0.2; y += (rnd() - 0.5) * uh * 0.2; pts.push([x, y]); } await dragOn(S, pts); }
    else { what = 'second finger'; const id = 2 + Math.floor(rnd() * 3); pe(S, 'pointerdown', x, y, id); pe(S, 'pointermove', x + 9, y + 9, id); if (rnd() < 0.7) pe(S, 'pointerup', x + 9, y + 9, id); } }
  else if (r < 0.93) { const els = qa('button, .g-chip, input[type=checkbox], input[type=range], select').filter(el => !el.disabled && shown(el) && !el.closest('a') && el.dataset.value !== 'online' && !/online/i.test(el.textContent) && !/My own picture/.test(el.textContent));
    if (els.length) { const el = els[Math.floor(rnd() * els.length)]; what = 'press ' + (el.id || el.textContent.trim().slice(0, 24));
      if (el.tagName === 'SELECT') { el.selectedIndex = Math.floor(rnd() * el.options.length); el.dispatchEvent(new Event('change', { bubbles: true })); }
      else if (el.type === 'range') { el.value = el.min; el.dispatchEvent(new Event('input', { bubbles: true })); } else el.click(); } }
  else { what = 'wait'; await w(150 + rnd() * 900); }
  log.push(what); if (log.length > 25) log.shift();
  if (rnd() < 0.3) await w(20);
  if (errs.length) { R.lastSteps = log; break; }
}
ok('monkey', !errs.length, errs);`;
const fits = String.raw`
await w(300); const W = document.documentElement.clientWidth;
const over = qa('body *').filter(el => { const r = el.getBoundingClientRect(); return r.width && r.right > W + 1 && getComputedStyle(el).position !== 'fixed' && !el.closest('.g-chips'); }).slice(0, 4).map(el => (el.id || el.className || el.tagName) + ':' + Math.round(el.getBoundingClientRect().right));
ok('fits', document.documentElement.scrollWidth <= W && !over.length, over);`;
const opens = (surface) => String.raw`ok('opens', !(window.__loadErr || []).length && qa('button').some(shown) && (!q(${JSON.stringify(surface)}) || true), window.__loadErr);`;

for (const [game, g] of Object.entries(GAMES)) {
  const open = (o) => browser.open(g.page, { pre: g.pre || "", ...o, storage: Object.fromEntries(Object.entries(o.storage || {}).map(([k, v]) => [k, json(v)])) });
  for (const c of g.cases) if (wanted(game, "cases", c.name)) report(game, c.name, await open({ ...c, js: wrap(LIB, c.js), label: `${game}-${c.name}` }));
  if (g.storageKey && wanted(game, "saves")) for (const [k, raw] of BAD_SAVES.entries()) report(game, `damaged save ${k + 1}`, await open({ storage: { [g.storageKey]: raw }, js: wrap(LIB, opens(g.surface) + "await w(300); for (const b of qa('button').filter(shown).slice(0, 6)) { b.click(); await w(80); } ok('pressable', !errs.length, errs);"), label: `${game}-save${k}` }));
  if (wanted(game, "layout")) for (const wd of [320, 390]) report(game, `fits ${wd} wide`, await open({ js: wrap(LIB, fits), w: wd, h: 844, label: `${game}-fit${wd}` }));
  if (wanted(game, "monkey")) for (const [k, seed] of SEEDS.entries()) {
    const [wd, ht] = k % 2 ? [1100, 900] : [390, 844];
    report(game, `monkey seed ${seed}, ${STEPS} steps, ${wd} wide`, await open({ js: wrap(LIB, monkey(g.surface, seed, STEPS)), w: wd, h: ht, label: `${game}-monkey${seed}`, limit: 60000 + STEPS * 500 }));
  }
}
finish(browser);
