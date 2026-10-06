#!/usr/bin/env node
/**
 * Phone and page-weight audit for every page: opens the home page and each game in headless Chrome
 * at phone size (360x780, touch) and reports page errors, failed files, sideways scrolling, tap targets
 * smaller than 24px, how much the page downloads and how long it takes to load.
 *   node tools/audit.mjs                 (all pages)
 *   node tools/audit.mjs quiz ludo       (some games; "home" is the home page)
 *   node tools/audit.mjs --w 768 --h 1024  (tablet size)
 * Needs a local server on :8123 serving public/ (python3 -m http.server 8123 in public/).
 * Sizes are before compression; Cloudflare sends text files (js, css, html, json, svg, txt) compressed.
 */
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "public");
const { GAMES } = await import(pathToFileURL(path.join(root, "assets/games.js")).href);
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); if (i < 0) return d; const v = Number(args[i + 1]); args.splice(i, 2); return v; };
const W = opt("--w", 360), H = opt("--h", 780);
const ids = args.length ? args : ["home", ...GAMES.map((g) => g.id)];
const BASE = "http://127.0.0.1:8123";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const dir = fs.mkdtempSync("/private/tmp/zone210-audit-");
const chrome = spawn(CHROME, ["--headless=new", "--remote-debugging-port=9334", `--user-data-dir=${dir}`, "--no-first-run", "--mute-audio", "--autoplay-policy=no-user-gesture-required", "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
for (let i = 0; i < 50; i += 1) { try { await fetch("http://127.0.0.1:9334/json/version"); break; } catch (e) { await sleep(200); } }
const kb = (n) => `${Math.round(n / 1024)} KB`;

// runs inside the page: sideways overflow and small tap targets
const probe = `(() => {
  const vw = document.documentElement.clientWidth;
  const vis = (el) => { const s = getComputedStyle(el); if (s.visibility === "hidden" || s.display === "none" || Number(s.opacity) === 0) return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const name = (el) => el.tagName.toLowerCase() + (el.id ? "#" + el.id : "") + (typeof el.className === "string" && el.className.trim() ? "." + el.className.trim().split(/\\s+/).slice(0, 2).join(".") : "");
  const over = [];
  if (document.documentElement.scrollWidth > vw + 1) {
    for (const el of document.body.querySelectorAll("*")) {
      if (!vis(el)) continue;
      const r = el.getBoundingClientRect();
      if (r.right > vw + 1 && !(el.parentElement && el.parentElement.getBoundingClientRect().right > vw + 1)) over.push(name(el) + " (" + Math.round(r.right - vw) + "px)");
    }
  }
  const small = [];
  for (const el of document.querySelectorAll("button, a[href], input:not([type=hidden]), select, [role=button], summary")) {
    if (!vis(el) || el.closest("[aria-hidden=true]")) continue;
    const r = el.getBoundingClientRect();
    // a link inside a sentence is fine at text size
    if (el.tagName === "A" && getComputedStyle(el).display === "inline" && el.parentElement && el.parentElement.textContent.trim().length > el.textContent.trim().length + 20) continue;
    if (r.width < 24 || r.height < 24) small.push(name(el) + " " + Math.round(r.width) + "x" + Math.round(r.height));
  }
  return { scrollW: document.documentElement.scrollWidth, vw, over: over.slice(0, 6), small: [...new Set(small)].slice(0, 8), smallCount: small.length };
})()`;

const report = [];
for (const id of ids) {
  const url = id === "home" ? `${BASE}/` : `${BASE}/games/${id}/`;
  const tab = await (await fetch("http://127.0.0.1:9334/json/new?about:blank", { method: "PUT" })).json();
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((r) => { ws.onopen = r; });
  let n = 0;
  const pending = new Map();
  const events = [];
  ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); } else if (d.method) events.push(d); };
  const send = (method, params = {}) => new Promise((r) => { n += 1; pending.set(n, r); ws.send(JSON.stringify({ id: n, method, params })); });
  await Promise.all([send("Page.enable"), send("Runtime.enable"), send("Network.enable"), send("Log.enable")]);
  await send("Network.setCacheDisabled", { cacheDisabled: true });
  await send("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 2, mobile: W < 768 });
  await send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
  await send("Page.addScriptToEvaluateOnNewDocument", { source: "try{localStorage.setItem('zone210_theme','dark')}catch(e){}" });
  const t0 = Date.now();
  await send("Page.navigate", { url });
  let loadMs = null;
  for (let i = 0; i < 200; i += 1) { if (events.some((e) => e.method === "Page.loadEventFired")) { loadMs = Date.now() - t0; break; } await sleep(50); }
  await sleep(2500);
  const r = await send("Runtime.evaluate", { expression: probe, returnByValue: true });
  const p = (r.result && r.result.result && r.result.result.value) || {};
  // network: sizes, failures
  const reqs = new Map();
  for (const e of events) {
    if (e.method === "Network.requestWillBeSent") reqs.set(e.params.requestId, { url: e.params.request.url, bytes: 0 });
    if (e.method === "Network.responseReceived" && reqs.has(e.params.requestId)) { reqs.get(e.params.requestId).status = e.params.response.status; reqs.get(e.params.requestId).type = e.params.type; }
    if (e.method === "Network.loadingFinished" && reqs.has(e.params.requestId)) reqs.get(e.params.requestId).bytes = e.params.encodedDataLength;
    if (e.method === "Network.loadingFailed" && reqs.has(e.params.requestId)) reqs.get(e.params.requestId).failed = e.params.errorText;
  }
  const list = [...reqs.values()].filter((q) => !q.url.startsWith("data:") && !q.url.startsWith("blob:"));
  const local = (u) => u.startsWith(BASE);
  const failed = list.filter((q) => local(q.url) && !q.url.includes("/api/") && (q.failed && q.failed !== "net::ERR_ABORTED" || q.status >= 400)).map((q) => `${q.status || q.failed} ${q.url.replace(BASE, "")}`);
  const total = list.reduce((s, q) => s + q.bytes, 0);
  const biggest = [...list].sort((a, b) => b.bytes - a.bytes).slice(0, 5).map((q) => `${kb(q.bytes)} ${q.url.replace(BASE, "").replace(/^https?:\/\//, "")}`);
  const errors = events.filter((e) => e.method === "Runtime.exceptionThrown").map((e) => (e.params.exceptionDetails.exception && e.params.exceptionDetails.exception.description || e.params.exceptionDetails.text || "").split("\n")[0].slice(0, 160));
  const consoleErr = events.filter((e) => (e.method === "Runtime.consoleAPICalled" && e.params.type === "error") || (e.method === "Log.entryAdded" && e.params.entry.level === "error" && !String(e.params.entry.url || "").includes("/api/")))
    .map((e) => (e.params.args ? e.params.args.map((a) => a.value || a.description || "").join(" ") : e.params.entry.text).slice(0, 160))
    .filter((t) => !/Failed to load resource/.test(t) || !failed.length);
  report.push({ id, loadMs, requests: list.length, total, biggest, errors, consoleErr, failed, ...p });
  ws.close();
  await fetch(`http://127.0.0.1:9334/json/close/${tab.id}`);
  const flags = [errors.length && "errors", failed.length && "missing files", (p.over || []).length && "sideways scroll", p.smallCount && `${p.smallCount} small taps`].filter(Boolean);
  console.log(`${id.padEnd(16)} ${kb(total).padStart(8)} ${String(list.length).padStart(3)} files  load ${String(loadMs).padStart(5)} ms  ${flags.join(", ") || "ok"}`);
}
chrome.kill();
setTimeout(() => { try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) { /* Chrome still closing */ } }, 800);

console.log("\nDetails:");
for (const x of report) {
  const lines = [];
  x.errors.forEach((e) => lines.push(`  error: ${e}`));
  x.consoleErr.forEach((e) => lines.push(`  console: ${e}`));
  x.failed.forEach((e) => lines.push(`  missing: ${e}`));
  if (x.over && x.over.length) lines.push(`  sideways scroll (page ${x.scrollW}px wide on a ${x.vw}px screen): ${x.over.join(", ")}`);
  if (x.small && x.small.length) lines.push(`  small taps: ${x.small.join(", ")}`);
  if (x.total > 300 * 1024) lines.push(`  heavy: ${x.biggest.join(" | ")}`);
  if (lines.length) console.log(`${x.id}\n${lines.join("\n")}`);
}
const heavy = [...report].sort((a, b) => b.total - a.total).slice(0, 10);
console.log("\nHeaviest pages:", heavy.map((x) => `${x.id} ${kb(x.total)}`).join(", "));
