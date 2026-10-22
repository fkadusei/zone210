#!/usr/bin/env node
/**
 * Checks that the site works offline (public/sw.js):   node tools/check-offline.mjs  [--save-all]
 * With --save-all it also presses the home page's "Save all games for offline" button (with the story narration),
 * then checks a game never opened works offline and story narration plays offline.
 * Serves public/ itself, opens the home page and a few games in headless Chrome (one of them a 3D game that loads
 * three.js from cdn.jsdelivr.net), then turns the server off and the browser offline and checks: those pages
 * still open and run, a game never opened shows the offline page listing the saved ones, and the home page works.
 */
import { spawn } from "child_process";
import fs from "fs";
import http from "http";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";

const PUBLIC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../public");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".webmanifest": "application/manifest+json", ".png": "image/png", ".webp": "image/webp", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".mp3": "audio/mpeg", ".txt": "text/plain" };
const sockets = new Set();
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (p.endsWith("/")) p += "index.html";
  let file = path.join(PUBLIC, p);
  if (!path.extname(file) && fs.existsSync(file + ".html")) file += ".html"; // /offline → offline.html, as Cloudflare does
  if (!file.startsWith(PUBLIC) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream", "Cache-Control": "no-cache" });
  fs.createReadStream(file).pipe(res);
});
server.on("connection", (s) => { sockets.add(s); s.on("close", () => sockets.delete(s)); });
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const SITE = `http://127.0.0.1:${server.address().port}`;
const CHROME = process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const profile = fs.mkdtempSync(path.join(os.tmpdir(), "zone210-offline-"));
const chrome = spawn(CHROME, ["--headless=new", "--remote-debugging-port=0", `--user-data-dir=${profile}`, "--no-first-run", "--mute-audio", "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let BASE = null;
for (let i = 0; i < 100 && !BASE; i += 1) { try { BASE = `http://127.0.0.1:${fs.readFileSync(path.join(profile, "DevToolsActivePort"), "utf8").split("\n")[0]}`; await fetch(`${BASE}/json/version`); } catch (e) { BASE = null; await sleep(150); } }
const tab = await (await fetch(`${BASE}/json/new?about:blank`, { method: "PUT" })).json();
const ws = new WebSocket(tab.webSocketDebuggerUrl);
await new Promise((r) => { ws.onopen = r; });
let id = 0, loaded = false; const pending = new Map(), errors = [];
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); } else if (d.method === "Page.loadEventFired") loaded = true; else if (d.method === "Runtime.exceptionThrown") errors.push(d.params.exceptionDetails.exception?.description?.split("\n")[0]); };
const send = (method, params = {}) => new Promise((r) => { id += 1; pending.set(id, r); ws.send(JSON.stringify({ id, method, params })); });
const run = async (js) => (await send("Runtime.evaluate", { expression: `(async()=>{${js}})()`, awaitPromise: true, returnByValue: true })).result?.result?.value;
const go = async (p, wait = 2500) => { loaded = false; await send("Page.navigate", { url: SITE + p }); for (let i = 0; i < 100 && !loaded; i += 1) await sleep(100); await sleep(wait); };
await send("Page.enable"); await send("Runtime.enable"); await send("Network.enable");

let bad = 0;
const check = (ok, msg, info = "") => { console.log(`${ok ? "✓" : "✗"} ${msg}${ok ? "" : "  " + JSON.stringify(info).slice(0, 300)}`); if (!ok) bad += 1; };
// online: a game first (on a brand-new device, before the service worker has started), then the home page and two more
await go("/games/nonograms/", 4000);
await go("/");
check(await run("await navigator.serviceWorker.ready; return !!navigator.serviceWorker.controller || (await new Promise(r => setTimeout(r, 1500)), !!navigator.serviceWorker.controller)"), "the service worker starts on the home page");
await go("/", 2000); // now controlled
for (const g of ["ribbon-sort", "draw-animate", "chess"]) await go(`/games/${g}/`, g === "chess" ? 6000 : 2500);
const SAVE_ALL = process.argv.includes("--save-all");
if (SAVE_ALL) {
  await go("/", 2500);
  check(await run("return !document.getElementById('offline').hidden"), "the home page offers to save all games");
  await run("document.getElementById('saveStories').click(); await new Promise(r => setTimeout(r, 400)); document.getElementById('saveAll').click(); return 1");
  let note = "";
  for (let i = 0; i < 240 && !/Done|could not/.test(note); i += 1) { await sleep(500); note = await run("return document.getElementById('saveNote').textContent"); }
  check(/^Done!/.test(note), "Save all games finishes", note);
  check(await run("return document.getElementById('saveAll').disabled && /All games saved/.test(document.getElementById('saveAll').textContent)"), "the button then says everything is saved", await run("return document.getElementById('saveAll').textContent"));
}
// offline
server.close(); sockets.forEach((s) => s.destroy());
await send("Network.emulateNetworkConditions", { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
errors.length = 0;
await go("/games/ribbon-sort/?room=ABCDE");
check(await run("return document.querySelectorAll('.pole').length > 3 && document.title.startsWith('Ribbon Sort')"), "Ribbon Sort opens and plays offline (with an invite code in the address)", await run("return document.title"));
await go("/games/draw-animate/");
check(await run("return !!document.getElementById('cv') && document.querySelectorAll('#mainRow button').length > 0"), "Draw & Animate opens offline", await run("return document.title"));
await go("/games/chess/", 5000);
check(await run("return document.title.startsWith('Chess') && !!document.querySelector('canvas')"), "Chess opens offline, with its 3D board (three.js saved from the CDN)", await run("return [document.title, !!document.querySelector('canvas')]"));
if (SAVE_ALL) {
  await go("/games/sudoku/");
  check(await run("return document.title.startsWith('Sudoku') && document.querySelectorAll('button').length > 20"), "a game never opened works offline after Save all", await run("return document.title"));
  const clip = await run("const d = await (await caches.open('zone210-v1')).keys(); const a = d.map(r => r.url).find(u => /ananse\\/audio\\/.*\\.m4a$/.test(u)); return a");
  check(!!clip, "story narration was saved", clip);
  check(await run(`const a = new Audio(${JSON.stringify(clip)}); return await new Promise(r => { a.oncanplaythrough = () => r(a.duration > 0.2); a.onerror = () => r(false); a.load(); setTimeout(() => r(false), 8000); })`), "story narration plays offline (a piece at a time, from the saved copy)", clip);
}
await go(SAVE_ALL ? "/games/no-such-game/" : "/games/sudoku/");
check(await run("return /offline/i.test(document.title) && [...document.querySelectorAll('#ready a')].map(a => a.textContent).join('|')"), "a game never opened shows the offline page", await run("return document.title"));
const ready = await run("return [...document.querySelectorAll('#ready a')].map(a => a.getAttribute('href')).join(' ')");
check(/ribbon-sort/.test(ready) && /draw-animate/.test(ready) && /chess/.test(ready) && /nonograms/.test(ready), "the offline page lists the games saved on this device", ready);
await go("/games/nonograms/");
check(await run("return document.title.startsWith('Nonograms') && document.querySelectorAll('.cell').length > 10"), "the very first game opened on the device also works offline", await run("return document.title"));
await go("/");
check(await run("return document.querySelectorAll('a[href*=\"games/\"]').length > 20"), "the home page opens offline", await run("return document.title"));
check(!errors.length, "no page errors offline", errors);
console.log(bad ? `\n${bad} problem(s).` : "\nThe site works offline.");
chrome.kill();
setTimeout(() => { try { fs.rmSync(profile, { recursive: true, force: true }); } catch (e) { /* Chrome still closing */ } process.exit(bad ? 1 : 0); }, 700);
