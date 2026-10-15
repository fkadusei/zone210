#!/usr/bin/env node
/**
 * Browser tests for every game on the site (and the home page), the same for each:
 *   node tools/test-games.mjs                 all of them, about an hour
 *   node tools/test-games.mjs chess sudoku    just these (game ids, or "home")
 *   node tools/test-games.mjs --long          far more monkey steps
 *   node tools/test-games.mjs --only opens,saves   just these parts (opens / saves / monkey)
 *  - opens:   the page loads at phone size with no errors, has buttons, and nothing runs off the side
 *  - saves:   whatever the game saves (zone210_… in its code), damaged three ways: it must still open and play
 *  - monkey:  a child let loose: random presses of whatever is showing (buttons, cards, board squares), taps and
 *             drags on any board or canvas, keys (arrows, space, letters) and stray fingers; fails on any page error
 * It starts its own server and headless Chrome (tools/browser-tests.mjs). Online play is left out (it needs a second
 * device), as are links that leave the page. Games with their own deeper tests: tools/test-draw-animate.mjs and
 * tools/test-drawing-games.mjs.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { startBrowser, wrap, reporter, options } from "./browser-tests.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url)), PUBLIC = path.resolve(HERE, "../public");
const { GAMES } = await import(pathToFileURL(path.join(PUBLIC, "assets/games.js")).href);
const LIB = fs.readFileSync(path.join(HERE, "drawing-games-tests/page-lib.js"), "utf8");
const { LONG, wanted } = options();
const named = process.argv.slice(2).filter((a, i, all) => !a.startsWith("--") && !["--only", "--seeds", "--steps"].includes(all[i - 1]));
const ids = named.length ? named : ["home", ...GAMES.map((g) => g.id)];
const SEEDS = LONG ? [1, 2, 3, 4] : [1, 2], STEPS = LONG ? 1000 : 300;
const browser = await startBrowser(), { report, finish } = reporter();
const pageOf = (id) => (id === "home" ? "" : `games/${id}/`);

/** The names a game saves under: every "zone210_…" written whole in its own files (not the theme, shared by all). */
function keysOf(id) {
  if (id === "home") return [];
  const dir = path.join(PUBLIC, "games", id), keys = new Set();
  for (const f of fs.readdirSync(dir)) if (/\.m?js$|\.html$/.test(f)) for (const m of fs.readFileSync(path.join(dir, f), "utf8").matchAll(/["'`](zone210_[A-Za-z0-9_]+)["'`]/g)) keys.add(m[1]);
  keys.delete("zone210_theme");
  return [...keys];
}

const AVOID = /online|room|invite|join|host|share|friend's code|copy link/i;
const monkey = (seed, steps) => String.raw`
let st = ${seed} >>> 0; const rnd = () => { st = (st + 0x6D2B79F5) >>> 0; let t = st; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
window.open = () => null; const AVOID = ${AVOID};
const page = location.pathname; let list = [], surfaces = [], fresh = 0; const log = [];
const refresh = () => {
  const all = qa('main *, .g-page *, body > *').filter(el => !el.closest('a[href]') && !el.closest('header a') && shown(el));
  list = all.filter(el => { if (el.disabled || el.type === 'file') return false; if (AVOID.test(el.textContent || '') && el.textContent.length < 60) return false; if (el.closest('[data-online], .online, #online, #net')) return false;
    if (el.matches('button, [role=button], .g-chip, input[type=checkbox], input[type=radio], input[type=range], select, summary')) return true;
    return !el.children.length || el.matches('[data-i],[data-k],[data-x],[data-cell],[data-id],.cell,.card,.tile,.sq,.pit,.point,.slot') ? getComputedStyle(el).cursor === 'pointer' : false; });
  surfaces = all.filter(el => el.matches('canvas, svg') && el.getBoundingClientRect().width > 80);
};
const at = (el, fx, fy) => { const r = el.getBoundingClientRect(); return [r.left + fx * r.width, r.top + fy * r.height]; };
const fire = (x, y, type, id = 1) => { const t = document.elementFromPoint(x, y); if (!t) return; const o = { bubbles: true, cancelable: true, clientX: x, clientY: y, pointerId: id, pointerType: 'touch', isPrimary: id === 1, button: 0 };
  t.dispatchEvent(new PointerEvent('pointer' + type, o)); if (id === 1) t.dispatchEvent(new MouseEvent('mouse' + type, o)); return t; };
const KEYS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' ', 'Enter', 'Escape', 'Backspace', 'Tab'];
for (let i = 0; i < ${steps}; i++) {
  if (location.pathname !== page) { R.leftPage = 'went to ' + location.pathname; break; }
  if (fresh-- <= 0) { refresh(); fresh = 8; }
  const r = rnd(); let what = '';
  if (r < 0.55 && list.length) { const el = list[Math.floor(rnd() * list.length)]; if (!el.isConnected) { fresh = 0; continue; }
    what = 'press ' + (el.id || el.getAttribute('aria-label') || el.textContent || el.tagName).trim().slice(0, 24);
    if (el.tagName === 'SELECT') { el.selectedIndex = Math.floor(rnd() * el.options.length); el.dispatchEvent(new Event('change', { bubbles: true })); }
    else if (el.type === 'range') { el.value = String(Number(el.min || 0) + Math.floor(rnd() * (Number(el.max || 10) - Number(el.min || 0) + 1))); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); }
    else { const [x, y] = at(el, 0.5, 0.5); fire(x, y, 'down'); fire(x, y, 'up'); if (el.click) el.click(); else el.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: x, clientY: y })); } fresh = Math.min(fresh, 2); }
  else if (r < 0.75 && surfaces.length) { const S = surfaces[Math.floor(rnd() * surfaces.length)]; if (!S.isConnected) { fresh = 0; continue; }
    let [x, y] = at(S, rnd(), rnd()); what = 'board ' + S.tagName;
    const t = fire(x, y, 'down'); if (rnd() < 0.5) { for (let k = 0; k < 2 + rnd() * 8; k++) { x += (rnd() - 0.5) * 60; y += (rnd() - 0.5) * 60; fire(x, y, 'move'); } }
    if (rnd() < 0.15) { const [x2, y2] = at(S, rnd(), rnd()); fire(x2, y2, 'down', 2); fire(x2, y2, 'up', 2); what += ' +finger'; }
    fire(x, y, 'up'); if (t) t.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: x, clientY: y })); }
  else if (r < 0.9) { const key = rnd() < 0.6 ? KEYS[Math.floor(rnd() * KEYS.length)] : String.fromCharCode(97 + Math.floor(rnd() * 26)); what = 'key ' + key;
    const tgt = document.activeElement && document.activeElement !== document.body ? document.activeElement : document;
    if (tgt.tagName === 'INPUT' && /text|search|number/.test(tgt.type) && key.length === 1) { tgt.value += key; tgt.dispatchEvent(new Event('input', { bubbles: true })); }
    for (const type of ['keydown', 'keyup']) tgt.dispatchEvent(new KeyboardEvent(type, { key, code: key.length === 1 ? 'Key' + key.toUpperCase() : key, bubbles: true, cancelable: true }));
    if (key === 'Enter' && tgt.form) tgt.form.requestSubmit && tgt.form.requestSubmit(); }
  else { what = 'wait'; await w(100 + rnd() * 900); }
  log.push(what); if (log.length > 20) log.shift();
  if (rnd() < 0.4) await w(25);
  if (errs.length) { R.lastSteps = log; break; }
}
ok('monkey', !errs.length && !R.leftPage, errs);`;
const opens = String.raw`
await w(500); const W = document.documentElement.clientWidth;
ok('noErrors', !(window.__loadErr || []).length, window.__loadErr);
ok('hasButtons', qa('button, [role=button], a[href], canvas, input').some(shown), null);
const scrolls = (el) => { for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) { const o = getComputedStyle(p).overflowX; if (o === 'auto' || o === 'scroll' || o === 'hidden') return true; } return false; }; // inside a row that scrolls sideways, or is cut off on purpose
const over = qa('body *').filter(el => { const r = el.getBoundingClientRect(); return r.width && r.right > W + 1 && getComputedStyle(el).position !== 'fixed' && !el.closest('.g-chips') && shown(el) && !scrolls(el); }).slice(0, 4).map(el => (el.id || (typeof el.className === 'string' && el.className) || el.tagName) + ':' + Math.round(el.getBoundingClientRect().right));
ok('fitsPhone', document.documentElement.scrollWidth <= W && !over.length, { scrollWidth: document.documentElement.scrollWidth, W, over });`;
const BAD = ["RAW{{{", "[1,2]", JSON.stringify("text")];

for (const id of ids) {
  if (wanted("opens")) report(id, "opens at phone size", await browser.open(pageOf(id), { js: wrap(LIB, opens), w: 360, h: 780, label: `${id}-opens` }));
  const keys = keysOf(id);
  if (keys.length && wanted("saves")) for (const [k, bad] of BAD.entries()) report(id, `damaged saves ${k + 1} (${keys.join(", ")})`, await browser.open(pageOf(id), { storage: Object.fromEntries(keys.map((key) => [key, bad])), js: wrap(LIB, opens.replace("ok('fitsPhone'", "R.fit=('fitsPhone'") + monkey(100 + k, 60)), w: 390, h: 844, label: `${id}-save${k}`, stay: true }));
  if (wanted("monkey")) for (const [k, seed] of SEEDS.entries()) {
    const [wd, ht] = k % 2 ? [1100, 900] : [390, 844];
    report(id, `monkey seed ${seed}, ${STEPS} steps, ${wd} wide`, await browser.open(pageOf(id), { js: wrap(LIB, monkey(seed, STEPS)), w: wd, h: ht, label: `${id}-monkey${seed}`, limit: 60000 + STEPS * 600, stay: true }));
  }
}
finish(browser);
