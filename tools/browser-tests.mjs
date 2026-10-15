/**
 * What the browser tests share (tools/test-draw-animate.mjs, tools/test-drawing-games.mjs): a little server for
 * public/, a headless Chrome, and a way to open a page, run a test script in it and read back the results.
 *
 *   const b = await startBrowser();
 *   const { value, shot } = await b.open("games/doodle/", { js, w, h, label, storage: { zone210_x: "…" }, pre: "…" });
 *   b.close();
 *
 * A test script returns an object of results: "ok", or a string starting "FAIL"; also CRASH, errors (page errors it
 * caught itself) and problems. failed(value) says whether any of those went wrong; the page's own uncaught errors are
 * added as pageErrors. A failing page leaves a screenshot in the temporary folder.
 */
import { spawn } from "child_process";
import fs from "fs";
import http from "http";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";

const PUBLIC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../public");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".json": "application/json", ".webmanifest": "application/manifest+json", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".mp3": "audio/mpeg", ".m4a": "audio/mp4", ".ogg": "audio/ogg", ".ico": "image/x-icon" };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export const failed = (v) => !v || typeof v !== "object" || !!v.CRASH || !!v.pageErrors || !!v.errors?.length || Object.values(v).some((x) => typeof x === "string" && x.startsWith("FAIL")) || !!v.problems?.length || !!v.errs?.length;
/** A test script wrapped so a crash or a caught page error is reported, after the page helpers in `lib`. */
export const wrap = (lib, js) => `${lib}\ntry{${js}}catch(e){R.CRASH=e.message+' '+(e.stack||'').split('\\n')[1];}\nif(errs.length) R.errors=errs; return R;`;

export async function startBrowser() {
  const server = http.createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
    if (p.endsWith("/")) p += "index.html";
    const file = path.join(PUBLIC, p);
    if (!file.startsWith(PUBLIC) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream", "Cache-Control": "no-store" });
    fs.createReadStream(file).pipe(res);
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const SITE = `http://127.0.0.1:${server.address().port}/`;
  const CHROME = process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "zone210-test-"));
  const chrome = spawn(CHROME, ["--headless=new", "--remote-debugging-port=0", `--user-data-dir=${profile}`, "--no-first-run", "--hide-scrollbars", "--mute-audio", "--autoplay-policy=no-user-gesture-required", "about:blank"], { stdio: "ignore" });
  let BASE = null;
  for (let i = 0; i < 100 && !BASE; i += 1) { try { BASE = `http://127.0.0.1:${fs.readFileSync(path.join(profile, "DevToolsActivePort"), "utf8").split("\n")[0]}`; await fetch(`${BASE}/json/version`); } catch (e) { BASE = null; await sleep(150); } }
  if (!BASE) { console.log("Could not start Chrome at " + CHROME + ". Set CHROME to its path."); server.close(); process.exit(2); }

  /** Opens SITE + page at w x h with `storage` (key → raw string) saved first, runs `js`, and gives back its result. */
  async function open(page, { js, w = 800, h = 1000, label = "test", limit = 120000, storage = {}, pre = "", stay = false, ignore = null }) {
    const tab = await (await fetch(`${BASE}/json/new?about:blank`, { method: "PUT" })).json();
    const ws = new WebSocket(tab.webSocketDebuggerUrl);
    await new Promise((r) => { ws.onopen = r; });
    let id = 0; const pending = new Map(), thrown = []; let loaded = false;
    ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); } else if (d.method === "Page.loadEventFired") loaded = true; else if (d.method === "Fetch.requestPaused") send("Fetch.failRequest", { requestId: d.params.requestId, errorReason: "Aborted" }); else if (d.method === "Runtime.exceptionThrown") thrown.push(d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text || ""); }; // the whole report, with where it came from
    const send = (method, params = {}) => new Promise((r) => { id += 1; pending.set(id, r); ws.send(JSON.stringify({ id, method, params })); });
    await send("Page.enable"); await send("Runtime.enable");
    await send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile: false });
    const sets = Object.entries(storage).map(([k, v]) => `localStorage.setItem(${JSON.stringify(k)}, ${JSON.stringify(typeof v === "string" ? v : JSON.stringify(v))});`).join("");
    await send("Page.addScriptToEvaluateOnNewDocument", { source: `window.__loadErr=[]; addEventListener('error',e=>__loadErr.push(e.message)); try{ if (!sessionStorage.getItem('__fresh')) { sessionStorage.setItem('__fresh','1'); localStorage.clear(); localStorage.setItem('zone210_theme','dark'); ${sets} } }catch(e){} ${pre}` }); // each test starts with nothing saved but its own storage
    await send("Page.navigate", { url: SITE + page + (page.includes("?") ? "&" : "?") + "t=" + encodeURIComponent(label) });
    for (let i = 0; i < 100 && !loaded; i += 1) await sleep(100);
    await sleep(1200);
    if (stay) await send("Fetch.enable", { patterns: [{ urlPattern: "*", resourceType: "Document", requestStage: "Request" }] }); // the test stays on this page: links and other ways off it go nowhere
    const r = await Promise.race([send("Runtime.evaluate", { expression: `(async()=>{${js}})()`, awaitPromise: true, returnByValue: true }), sleep(limit).then(() => ({ timedOut: true }))]);
    let value = r.timedOut ? { CRASH: `no answer after ${limit / 1000} seconds` } : r.result?.exceptionDetails ? { CRASH: r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text } : r.result?.result?.value;
    const real = ignore ? thrown.filter((t) => !ignore.test(t)) : thrown; // `ignore`: errors a test knows it causes itself
    if (real.length) value = { ...value, pageErrors: real.slice(0, 3).map((t) => t.split("\n").slice(0, 2).join(" ")) };
    let shot = null;
    if (failed(value)) { const s = await send("Page.captureScreenshot", { format: "png" }); if (s.result && s.result.data) { shot = path.join(os.tmpdir(), `zone210-test-${label.replace(/[^\w-]+/g, "-")}.png`); fs.writeFileSync(shot, Buffer.from(s.result.data, "base64")); } }
    ws.close(); await fetch(`${BASE}/json/close/${tab.id}`);
    return { value, shot };
  }
  function close() { chrome.kill(); server.close(); setTimeout(() => { try { fs.rmSync(profile, { recursive: true, force: true }); } catch (e) { /* Chrome still closing */ } }, 600); }
  return { open, close };
}

/** Prints each result as it comes and keeps count; finish() prints the total and exits (1 if anything failed). */
export function reporter() {
  const results = [], t0 = Date.now();
  const report = (group, name, { value, shot }) => {
    const bad = failed(value);
    results.push({ group, name, bad });
    const shown = bad ? Object.fromEntries(Object.entries(value || {}).filter(([, v]) => v !== "ok")) : null;
    console.log(`${bad ? "✗" : "✓"} ${group} ${name}${bad ? "\n    " + JSON.stringify(shown).slice(0, 900) + (shot ? `\n    screenshot: ${shot}` : "") : ""}`);
  };
  const finish = (browser) => {
    const bad = results.filter((r) => r.bad);
    console.log(`\n${results.length - bad.length} of ${results.length} passed in ${Math.round((Date.now() - t0) / 1000)} seconds.${bad.length ? " Failed: " + bad.map((r) => `${r.group} ${r.name}`).join(", ") : ""}`);
    browser.close();
    setTimeout(() => process.exit(bad.length ? 1 : 0), 800);
  };
  return { report, finish };
}
/** Command-line options shared by the test runners: --long, --only a,b, --seeds 1,2, --steps n. */
export function options() {
  const arg = (name) => { const i = process.argv.indexOf(name); return i < 0 ? null : process.argv[i + 1] || ""; };
  const LONG = process.argv.includes("--long"), ONLY = arg("--only") ? new Set(arg("--only").split(",")) : null;
  return {
    LONG,
    SEEDS: arg("--seeds") ? arg("--seeds").split(",").map(Number) : LONG ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] : [1, 2, 3],
    STEPS: Number(arg("--steps")) || (LONG ? 1500 : 500),
    wanted: (...names) => !ONLY || names.some((n) => ONLY.has(n)),
  };
}
