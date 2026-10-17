#!/usr/bin/env node
/**
 * Two-browser test of Ribbon Sort's online race.
 *   node tools/check-ribbon-race.mjs [easy|medium|hard|tall]     (needs a server: python3 -m http.server 8123 in public/)
 * Tab A creates a room, tab B joins with the invite link. The test checks both got the same puzzle, then B sorts it
 * and both must agree that B won.
 */
import { spawn } from "child_process";
import fs from "fs";
const mode = process.argv[2] || "easy", URL0 = "http://127.0.0.1:8123/games/ribbon-sort/";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const dir = fs.mkdtempSync("/private/tmp/zone210-ribbon-race-");
const chrome = spawn(CHROME, ["--headless=new", "--remote-debugging-port=9335", `--user-data-dir=${dir}`, "--no-first-run", "--mute-audio", "--disable-features=WebRtcHideLocalIpsWithMdns", "--allow-loopback-in-peer-connection",
  "--disable-background-timer-throttling", "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding", "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
for (let i = 0; i < 50; i += 1) { try { await fetch("http://127.0.0.1:9335/json/version"); break; } catch (e) { await sleep(200); } }

async function tab(url, pre = "") {
  const t = await (await fetch("http://127.0.0.1:9335/json/new?about:blank", { method: "PUT" })).json();
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  await new Promise((r) => { ws.onopen = r; });
  let id = 0;
  const pending = new Map(), errors = [];
  ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); } else if (d.method === "Runtime.exceptionThrown") errors.push(d.params.exceptionDetails.text + " " + JSON.stringify(d.params.exceptionDetails.exception || {}).slice(0, 200)); };
  const send = (method, params = {}) => new Promise((r) => { id += 1; pending.set(id, r); ws.send(JSON.stringify({ id, method, params })); });
  await send("Page.enable"); await send("Runtime.enable");
  if (pre) await send("Page.addScriptToEvaluateOnNewDocument", { source: pre });
  await send("Page.navigate", { url });
  const run = async (expression) => { const r = await send("Runtime.evaluate", { expression: `(async()=>{${expression}})()`, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 300)); return r.result.result.value; };
  const until = async (expression, what, ms = 30000) => { for (let i = 0; i < ms / 250; i += 1) { if (await run(`return !!(${expression})`)) return; await sleep(250); } throw new Error(`timed out waiting for ${what}`); };
  return { run, until, errors };
}
// the guest sorts it with the puzzle's own solver, tapping poles as a player would
const SOLVE = `
  const L = await import('/games/ribbon-sort/logic.js'), RS = window.__ribbon;
  for (const [a, b] of L.solve(RS.G.poles, RS.G.cap)) { RS.pick(a); RS.pick(b); await new Promise(r => setTimeout(r, 15)); }
  return RS.G.over;`;
let ok = true;
try {
  const A = await tab(URL0, `try{localStorage.setItem('zone210_ribbon_sort', JSON.stringify({players:'online', mode:'${mode}'}))}catch(e){}`);
  await A.until("document.querySelector('[data-act=create]')", "the lobby");
  await A.run("document.querySelector('[data-act=create]').click()");
  await A.until("document.querySelector('.code')", "a room code");
  const code = await A.run("return document.querySelector('.code').textContent.trim()");
  const B = await tab(`${URL0}?room=${code}`);
  await A.until("document.getElementById('stats').textContent.includes('Friend') && window.__ribbon.G.n === -1", "the race to start (host)", 45000);
  await B.until("document.getElementById('stats').textContent.includes('Friend')", "the race to start (guest)", 45000);
  await new Promise((r) => setTimeout(r, 500));
  const pa = await A.run("return JSON.stringify(window.__ribbon.G.poles) + ' ' + window.__ribbon.G.mode"), pb = await B.run("return JSON.stringify(window.__ribbon.G.poles) + ' ' + window.__ribbon.G.mode");
  const sorted = await B.run(SOLVE);
  await A.until("/friend sorted it first/i.test(document.getElementById('resTitle').textContent)", "the result (host)");
  const ra = await A.run("return document.getElementById('resTitle').textContent"), rb = await B.run("return document.getElementById('resTitle').textContent");
  const friendPct = await A.run("return document.getElementById('stats').textContent");
  console.log(`Ribbon Sort race (${mode}): room ${code}`);
  console.log(`  same puzzle on both sides: ${pa === pb ? "yes" : "NO"} (${pa.split(" ")[1]})`);
  console.log(`  host:  ${ra}\n  guest: ${rb}`);
  [...A.errors, ...B.errors].forEach((e) => console.log("  PAGE ERROR", e));
  ok = pa === pb && sorted && /You sorted it first/.test(rb) && /friend sorted it first/i.test(ra) && /Friend100%/.test(friendPct.replace(/\s/g, "")) && !A.errors.length && !B.errors.length;
  console.log(ok ? "  ✓ the race works" : `  ✗ something is wrong (host stats: ${friendPct})`);
} catch (err) { console.log(`Ribbon Sort race: FAILED: ${err.message}`); ok = false; }
chrome.kill();
setTimeout(() => { try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) { /* Chrome still closing */ } process.exit(ok ? 0 : 1); }, 800);
