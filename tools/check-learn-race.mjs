#!/usr/bin/env node
/**
 * Two-browser test of the online race in the learning games (assets/learn-kit.js).
 *   node tools/check-learn-race.mjs [algebra|calculus|grammar]     (needs a server: python3 -m http.server 8123 in public/)
 * Tab A creates a room, tab B joins with the invite link. Both answer all ten questions (A carefully wrong, B as fast
 * as it can), then the test checks that both saw the same ten questions and agree on who won.
 */
import { spawn } from "child_process";
import fs from "fs";
const game = process.argv[2] || "algebra", URL0 = `http://127.0.0.1:8123/games/${game}/`;
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const dir = fs.mkdtempSync("/private/tmp/zone210-race-");
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
// answer the question on screen (anything will do), remember its text, and go on
const PLAY = (pause) => `
  const seen = [];
  for (let n = 0; n < 10; n += 1) {
    seen.push(document.getElementById('lkQ').textContent + '|' + [...document.querySelectorAll('.lk-o,.lk-w')].map(b => b.textContent).sort().join(','));
    const o = document.querySelector('.lk-o'), w = document.querySelector('.lk-sent .lk-w'), inp = document.getElementById('lkIn');
    if (o) o.click(); else if (w) w.click(); else if (inp) { inp.value = '1'; inp.dispatchEvent(new Event('input')); document.getElementById('lkCheck').click(); }
    else { document.querySelectorAll('#lkPool .lk-w').forEach(b => b.click()); document.getElementById('lkCheck').click(); }
    await new Promise(r => setTimeout(r, ${pause}));
    document.getElementById('lkNext').click();
    await new Promise(r => setTimeout(r, 30));
  }
  return seen;`;
let ok = true;
try {
  const A = await tab(URL0, `try{localStorage.setItem('${`zone210_${game}`}', JSON.stringify({players:'online'}))}catch(e){}`);
  await A.until("document.querySelector('[data-act=create]')", "the lobby");
  await A.run("document.querySelector('[data-act=create]').click()");
  await A.until("document.querySelector('.code')", "a room code");
  const code = await A.run("return document.querySelector('.code').textContent.trim()");
  const B = await tab(`${URL0}?room=${code}`);
  await A.until("document.getElementById('lkStats').textContent.includes('Friend')", "the race to start (host)", 45000);
  await B.until("document.getElementById('lkStats').textContent.includes('Friend')", "the race to start (guest)", 45000);
  const [a, b] = await Promise.all([A.run(PLAY(120)), B.run(PLAY(20))]);
  await A.until("/win|draw/i.test(document.getElementById('lkResTitle').textContent)", "the result (host)");
  await B.until("/win|draw/i.test(document.getElementById('lkResTitle').textContent)", "the result (guest)");
  const ra = await A.run("return document.getElementById('lkResTitle').textContent + ' — ' + document.getElementById('lkResText').textContent"), rb = await B.run("return document.getElementById('lkResTitle').textContent + ' — ' + document.getElementById('lkResText').textContent");
  const same = JSON.stringify(a) === JSON.stringify(b);
  const agree = (/You win/.test(ra) && /friend wins/i.test(rb)) || (/You win/.test(rb) && /friend wins/i.test(ra)) || (/draw/i.test(ra) && /draw/i.test(rb));
  console.log(`${game}: room ${code}`);
  console.log(`  same ten questions on both sides: ${same ? "yes" : "NO"}`);
  console.log(`  host:  ${ra}\n  guest: ${rb}`);
  console.log(`  results agree: ${agree ? "yes" : "NO"}`);
  [...A.errors, ...B.errors].forEach((e) => console.log("  PAGE ERROR", e));
  ok = same && agree && !A.errors.length && !B.errors.length;
} catch (err) { console.log(`${game}: FAILED: ${err.message}`); ok = false; }
chrome.kill();
setTimeout(() => { try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) { /* Chrome still closing */ } process.exit(ok ? 0 : 1); }, 800);
