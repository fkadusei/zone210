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
import { spawn } from "child_process";
import fs from "fs";
import http from "http";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";

const HERE = path.dirname(fileURLToPath(import.meta.url)), PUBLIC = path.resolve(HERE, "../public"), DIR = path.join(HERE, "draw-animate-tests");
const { CASES, SAVES, SAVE_JS, LAYOUT, LAYOUT_WIDTHS } = await import(path.join(DIR, "cases.mjs"));
const LIB = fs.readFileSync(path.join(DIR, "page-lib.js"), "utf8"), MONKEY = fs.readFileSync(path.join(DIR, "monkey.js"), "utf8");
const arg = (name) => { const i = process.argv.indexOf(name); return i < 0 ? null : process.argv[i + 1] || ""; };
const LONG = process.argv.includes("--long"), ONLY = arg("--only") ? new Set(arg("--only").split(",")) : null;
const SEEDS = arg("--seeds") ? arg("--seeds").split(",").map(Number) : LONG ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] : [1, 2, 3];
const STEPS = Number(arg("--steps")) || (LONG ? 1500 : 500);
const wanted = (group, name) => !ONLY || ONLY.has(group) || ONLY.has(name);

// ---------- a little server for public/ ----------
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".json": "application/json", ".webmanifest": "application/manifest+json", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".mp3": "audio/mpeg", ".ico": "image/x-icon" };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (p.endsWith("/")) p += "index.html";
  const file = path.join(PUBLIC, p);
  if (!file.startsWith(PUBLIC) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream", "Cache-Control": "no-store" });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const PAGE = `http://127.0.0.1:${server.address().port}/games/draw-animate/`;

// ---------- headless Chrome ----------
const CHROME = process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const profile = fs.mkdtempSync(path.join(os.tmpdir(), "zone210-test-"));
const chrome = spawn(CHROME, ["--headless=new", "--remote-debugging-port=0", `--user-data-dir=${profile}`, "--no-first-run", "--hide-scrollbars", "--mute-audio", "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let BASE = null;
for (let i = 0; i < 100 && !BASE; i += 1) { try { BASE = `http://127.0.0.1:${fs.readFileSync(path.join(profile, "DevToolsActivePort"), "utf8").split("\n")[0]}`; await fetch(`${BASE}/json/version`); } catch (e) { BASE = null; await sleep(150); } }
if (!BASE) { console.log("Could not start Chrome at " + CHROME + ". Set CHROME to its path."); process.exit(2); }

/** Opens the page at w x h with `save` as the saved drawing, runs `js` in it, and gives back what it returns. */
async function run({ save, js, w = 800, h = 1000, label, limit = 120000 }) {
  const tab = await (await fetch(`${BASE}/json/new?about:blank`, { method: "PUT" })).json();
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((r) => { ws.onopen = r; });
  let id = 0; const pending = new Map(), thrown = []; let loaded = false;
  ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); } else if (d.method === "Page.loadEventFired") loaded = true; else if (d.method === "Runtime.exceptionThrown") thrown.push(d.params.exceptionDetails.exception?.description?.split("\n")[0] || d.params.exceptionDetails.text); };
  const send = (method, params = {}) => new Promise((r) => { id += 1; pending.set(id, r); ws.send(JSON.stringify({ id, method, params })); });
  await send("Page.enable"); await send("Runtime.enable");
  await send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile: false });
  const raw = typeof save === "string" ? save : JSON.stringify(save);
  await send("Page.addScriptToEvaluateOnNewDocument", { source: `window.__loadErr=[]; addEventListener('error',e=>__loadErr.push(e.message)); try{localStorage.setItem('zone210_theme','dark'); localStorage.setItem('zone210_drawanim', ${JSON.stringify(raw)})}catch(e){}` });
  await send("Page.navigate", { url: PAGE + "?t=" + encodeURIComponent(label) });
  for (let i = 0; i < 100 && !loaded; i += 1) await sleep(100);
  await sleep(1200);
  const r = await Promise.race([send("Runtime.evaluate", { expression: `(async()=>{${js}})()`, awaitPromise: true, returnByValue: true }), sleep(limit).then(() => ({ timedOut: true }))]);
  let value = r.timedOut ? { CRASH: `no answer after ${limit / 1000} seconds` } : r.result?.exceptionDetails ? { CRASH: r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text } : r.result?.result?.value;
  if (thrown.length) value = { ...value, pageErrors: thrown.slice(0, 3) };
  let shot = null;
  if (failed(value)) { const s = await send("Page.captureScreenshot", { format: "png" }); shot = path.join(os.tmpdir(), `draw-animate-${label}.png`); fs.writeFileSync(shot, Buffer.from(s.result.data, "base64")); }
  ws.close(); await fetch(`${BASE}/json/close/${tab.id}`);
  return { value, shot };
}
const failed = (v) => !v || typeof v !== "object" || v.CRASH || v.pageErrors || v.errors?.length || Object.values(v).some((x) => typeof x === "string" && x.startsWith("FAIL")) || v.problems?.length || v.errs?.length;
const caseJs = (js) => `${LIB}\ntry{${js}}catch(e){R.CRASH=e.message+' '+(e.stack||'').split('\\n')[1];}\nif(errs.length) R.errors=errs; return R;`;

// ---------- the tests ----------
const results = [];
const report = (group, name, { value, shot }) => {
  const bad = failed(value);
  results.push({ group, name, bad });
  const shown = bad ? Object.fromEntries(Object.entries(value || {}).filter(([k, v]) => !(typeof v === "string" && v === "ok"))) : null;
  console.log(`${bad ? "✗" : "✓"} ${group} ${name}${bad ? "\n    " + JSON.stringify(shown).slice(0, 900) + (shot ? `\n    screenshot: ${shot}` : "") : ""}`);
};
const t0 = Date.now();
for (const c of CASES) if (wanted("cases", c.name)) report("cases", c.name, await run({ ...c, js: caseJs(c.js), label: c.name }));
for (const [name, save] of Object.entries(SAVES)) if (wanted("saves", name)) report("saves", name, await run({ save, js: caseJs(SAVE_JS), w: 600, h: 900, label: "save-" + name }));
if (wanted("layout", "layout")) for (const w of LAYOUT_WIDTHS) report("layout", `${w} wide`, await run({ ...LAYOUT, js: caseJs(LAYOUT.js), w, h: 900, label: `layout-${w}` }));
if (wanted("monkey", "monkey")) for (const [k, seed] of SEEDS.entries()) {
  const [w, h] = k % 2 ? [1200, 900] : [390, 844];
  const r = await run({ save: {}, js: MONKEY.replace("const SEED = __SEED__, STEPS = __STEPS__", `const SEED = ${seed}, STEPS = ${STEPS}`), w, h, label: `monkey-${seed}`, limit: 60000 + STEPS * 400 });
  report("monkey", `seed ${seed}, ${STEPS} steps, ${w} wide`, r);
}
const bad = results.filter((r) => r.bad);
console.log(`\n${results.length - bad.length} of ${results.length} passed in ${Math.round((Date.now() - t0) / 1000)} seconds.${bad.length ? " Failed: " + bad.map((r) => r.name).join(", ") : ""}`);
chrome.kill(); server.close();
setTimeout(() => { try { fs.rmSync(profile, { recursive: true, force: true }); } catch (e) { /* Chrome still closing */ } process.exit(bad.length ? 1 : 0); }, 800);
