#!/usr/bin/env node
/**
 * Headless Chrome screenshots for checking pages and making thumbnails / share cards.
 *   node tools/shot.mjs jobs.json
 * jobs.json: [{ url, out, w = 960, h = 539, theme = "dark", pre?: "js run before the page loads",
 *              js?: "async js run after load", wait = 1200 ms, after = 500 ms }]
 * Needs a local server (e.g. python3 -m http.server 8123 in public/).
 */
import { spawn } from "child_process";
import fs from "fs";
const [, , jobsFile] = process.argv;
const jobs = JSON.parse(fs.readFileSync(jobsFile, "utf8"));
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const dir = fs.mkdtempSync("/private/tmp/zone210-shot-");
const chrome = spawn(CHROME, ["--headless=new", "--remote-debugging-port=9333", `--user-data-dir=${dir}`, "--no-first-run", "--hide-scrollbars", "--mute-audio", "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
for (let i = 0; i < 50; i += 1) { try { await fetch("http://127.0.0.1:9333/json/version"); break; } catch (e) { await sleep(200); } }
for (const job of jobs) {
  const tab = await (await fetch("http://127.0.0.1:9333/json/new?about:blank", { method: "PUT" })).json();
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((r) => { ws.onopen = r; });
  let id = 0;
  const pending = new Map();
  const events = [];
  ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); } else if (d.method) events.push(d); };
  const send = (method, params = {}) => new Promise((r) => { id += 1; pending.set(id, r); ws.send(JSON.stringify({ id, method, params })); });
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Emulation.setDeviceMetricsOverride", { width: job.w || 960, height: job.h || 539, deviceScaleFactor: 1, mobile: false });
  await send("Page.addScriptToEvaluateOnNewDocument", { source: `try{localStorage.setItem('zone210_theme','${job.theme || "dark"}')}catch(e){}${job.pre || ""}` });
  await send("Page.navigate", { url: job.url });
  for (let i = 0; i < 100 && !events.some((e) => e.method === "Page.loadEventFired"); i += 1) await sleep(100);
  await sleep(job.wait || 1200);
  if (job.js) {
    const r = await send("Runtime.evaluate", { expression: `(async()=>{${job.js}})()`, awaitPromise: true, returnByValue: true });
    if (r.result && r.result.exceptionDetails) console.log(job.out, "JS ERROR", JSON.stringify(r.result.exceptionDetails).slice(0, 400));
    else if (r.result && r.result.result && r.result.result.value !== undefined) console.log(job.out, "=>", JSON.stringify(r.result.result.value));
  }
  await sleep(job.after || 500);
  events.filter((e) => e.method === "Runtime.exceptionThrown").forEach((e) => console.log(job.out, "PAGE ERROR", JSON.stringify(e.params.exceptionDetails).slice(0, 300)));
  const shot = await send("Page.captureScreenshot", { format: "jpeg", quality: 88 });
  fs.writeFileSync(job.out, Buffer.from(shot.result.data, "base64"));
  console.log("saved", job.out);
  ws.close();
  await fetch(`http://127.0.0.1:9333/json/close/${tab.id}`);
}
chrome.kill();
setTimeout(() => { try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) { /* Chrome still closing */ } }, 800);
