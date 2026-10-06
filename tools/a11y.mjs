#!/usr/bin/env node
/**
 * Accessibility check for every page, in dark and light theme:
 *  - controls and pictures with no name a screen reader can read (from Chrome's accessibility tree)
 *  - page language, title, one h1, a main landmark
 *  - text whose colour contrast is below WCAG AA (4.5:1, or 3:1 for large text)
 *  - things you can click that the keyboard cannot reach
 *  - endless animations still running with Battery saver on
 *   node tools/a11y.mjs              (all pages)      node tools/a11y.mjs quiz ludo
 * Needs a local server on :8123 serving public/ (python3 -m http.server 8123 in public/).
 */
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "public");
const { GAMES } = await import(pathToFileURL(path.join(root, "assets/games.js")).href);
const args = process.argv.slice(2);
const ids = args.length ? args : ["home", ...GAMES.map((g) => g.id)];
const BASE = "http://127.0.0.1:8123";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const dir = fs.mkdtempSync("/private/tmp/zone210-a11y-");
const chrome = spawn(CHROME, ["--headless=new", "--remote-debugging-port=9335", `--user-data-dir=${dir}`, "--no-first-run", "--mute-audio", "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
for (let i = 0; i < 50; i += 1) { try { await fetch("http://127.0.0.1:9335/json/version"); break; } catch (e) { await sleep(200); } }

// runs inside the page
const probe = `(() => {
  const out = { contrast: [], mouseOnly: [], canvases: 0 };
  const name = (el) => el.tagName.toLowerCase() + (el.id ? "#" + el.id : "") + (typeof el.className === "string" && el.className.trim() ? "." + el.className.trim().split(/\\s+/).slice(0, 2).join(".") : "");
  const vis = (el) => { const s = getComputedStyle(el); if (s.visibility === "hidden" || s.display === "none") return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const rgba = (c) => { const m = c.match(/rgba?\\(([^)]+)\\)/); if (!m) return null; const p = m[1].split(/[ ,\\/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const mix = (top, bot) => ({ r: top.r * top.a + bot.r * (1 - top.a), g: top.g * top.a + bot.g * (1 - top.a), b: top.b * top.a + bot.b * (1 - top.a), a: 1 });
  // the solid colour behind an element, or null if a picture / gradient / canvas is behind it
  const bgOf = (el) => {
    const layers = [];
    for (let n = el; n; n = n.parentElement) {
      const s = getComputedStyle(n);
      if (s.backgroundImage && s.backgroundImage !== "none") return null;
      if (Number(s.opacity) < 1) return null;
      const c = rgba(s.backgroundColor);
      if (c && c.a > 0) { layers.push(c); if (c.a >= 1) break; }
      if (n === document.documentElement && (!c || c.a < 1)) layers.push({ r: 255, g: 255, b: 255, a: 1 });
    }
    if (!layers.length) return null;
    let col = layers[layers.length - 1];
    for (let i = layers.length - 2; i >= 0; i -= 1) col = mix(layers[i], col);
    return col;
  };
  const seen = new Set();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let t = walker.nextNode(); t; t = walker.nextNode()) {
    if (!t.textContent.trim() || !/[A-Za-z0-9]/.test(t.textContent)) continue;
    const el = t.parentElement;
    if (!el || seen.has(el) || !vis(el) || el.closest("[aria-hidden=true], svg, option")) continue;
    seen.add(el);
    const s = getComputedStyle(el);
    if (Number(s.opacity) === 0 || s.color === "transparent") continue;
    const fg = rgba(s.color); const bg = bgOf(el);
    if (!fg || !bg) continue;
    const f = fg.a < 1 ? mix(fg, bg) : fg;
    const L1 = lum(f), L2 = lum(bg); const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
    const px = parseFloat(s.fontSize); const bold = Number(s.fontWeight) >= 700;
    const need = px >= 24 || (bold && px >= 18.66) ? 3 : 4.5;
    if (ratio < need && !el.closest("button:disabled, [aria-disabled=true]") && !el.matches(":disabled")) out.contrast.push({ el: name(el), text: t.textContent.trim().slice(0, 30), ratio: Math.round(ratio * 100) / 100, need });
  }
  const focusable = "a[href], button, input, select, textarea, summary, [tabindex]:not([tabindex='-1']), [role=button][tabindex], [contenteditable=true], label"; // role=button with tabindex -1: board points reached with the arrow keys
  for (const el of document.body.querySelectorAll("*")) {
    if (!vis(el) || el.matches(focusable) || el.closest(focusable)) continue;
    if (getComputedStyle(el).cursor !== "pointer") continue;
    if (el.parentElement && getComputedStyle(el.parentElement).cursor === "pointer" && !el.parentElement.matches(focusable)) continue;
    if (el.tagName === "CANVAS") continue;
    out.mouseOnly.push(name(el));
  }
  out.canvases = [...document.querySelectorAll("canvas")].filter((c) => vis(c) && c.getBoundingClientRect().width > 150 && !c.hasAttribute("tabindex") && !c.closest("[tabindex]")).length;
  out.lang = document.documentElement.lang;
  out.title = document.title;
  out.h1 = document.querySelectorAll("h1").length;
  out.main = !!document.querySelector("main, [role=main]");
  out.mouseOnly = [...new Set(out.mouseOnly)].slice(0, 8);
  return out;
})()`;
const animProbe = `document.getAnimations().filter((a) => a.playState === "running" && a.effect && a.effect.getTiming().iterations === Infinity).map((a) => { const t = a.effect.target; return t ? (t.tagName.toLowerCase() + (t.id ? "#" + t.id : "") + (typeof t.className === "string" && t.className ? "." + t.className.split(" ")[0] : "")) + (a.effect.pseudoElement || "") : "?"; })`;

async function openTab() {
  const tab = await (await fetch("http://127.0.0.1:9335/json/new?about:blank", { method: "PUT" })).json();
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((r) => { ws.onopen = r; });
  let n = 0;
  const pending = new Map();
  const events = [];
  ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); } else if (d.method) events.push(d); };
  const send = (method, params = {}) => new Promise((r) => { n += 1; pending.set(n, r); ws.send(JSON.stringify({ id: n, method, params })); });
  const close = async () => { ws.close(); await fetch(`http://127.0.0.1:9335/json/close/${tab.id}`); };
  return { send, events, close };
}
async function load(t, url, setup) {
  await t.send("Page.enable");
  await t.send("Runtime.enable");
  await t.send("Emulation.setDeviceMetricsOverride", { width: 1024, height: 900, deviceScaleFactor: 1, mobile: false });
  await t.send("Page.addScriptToEvaluateOnNewDocument", { source: setup });
  await t.send("Page.navigate", { url });
  for (let i = 0; i < 200 && !t.events.some((e) => e.method === "Page.loadEventFired"); i += 1) await sleep(50);
  await sleep(1800);
}
const evalv = async (t, expr) => { const r = await t.send("Runtime.evaluate", { expression: expr, returnByValue: true }); return r.result && r.result.result ? r.result.result.value : undefined; };

const ROLES = new Set(["button", "link", "textbox", "checkbox", "radio", "combobox", "slider", "spinbutton", "switch", "tab", "menuitem", "searchbox", "listbox", "option"]);
const report = [];
for (const id of ids) {
  const url = id === "home" ? `${BASE}/` : `${BASE}/games/${id}/`;
  const r = { id, unnamed: [], images: [], contrast: { dark: [], light: [] }, mouseOnly: [], basics: [], saverAnims: [] };
  for (const theme of ["dark", "light"]) {
    const t = await openTab();
    await load(t, url, `try{localStorage.setItem('zone210_theme','${theme}');localStorage.setItem('zone210_saver','off')}catch(e){}`);
    const p = await evalv(t, probe) || {};
    r.contrast[theme] = p.contrast || [];
    if (theme === "dark") {
      r.mouseOnly = p.mouseOnly || [];
      r.canvases = p.canvases;
      if (!p.lang) r.basics.push("no lang on <html>");
      if (!p.title) r.basics.push("no <title>");
      if (p.h1 !== 1) r.basics.push(`${p.h1} h1 headings`);
      if (!p.main) r.basics.push("no <main> landmark");
      await t.send("Accessibility.enable");
      const tree = await t.send("Accessibility.getFullAXTree");
      for (const nd of (tree.result && tree.result.nodes) || []) {
        if (nd.ignored) continue;
        const role = nd.role && nd.role.value;
        const nm = nd.name && nd.name.value;
        if (ROLES.has(role) && !String(nm || "").trim()) r.unnamed.push(role);
        if (role === "image" && !String(nm || "").trim()) r.images.push("image");
      }
    }
    await t.close();
  }
  // Battery saver on: endless animations that keep running
  const t = await openTab();
  await load(t, url, "try{localStorage.setItem('zone210_theme','dark');localStorage.setItem('zone210_saver','on')}catch(e){}");
  r.saverAnims = [...new Set((await evalv(t, animProbe)) || [])];
  await t.close();
  report.push(r);
  const worst = (a) => a.length ? Math.min(...a.map((c) => c.ratio)) : null;
  const flags = [r.unnamed.length && `${r.unnamed.length} unnamed controls`, r.images.length && `${r.images.length} unnamed images`, r.contrast.dark.length && `contrast dark ${r.contrast.dark.length} (worst ${worst(r.contrast.dark)})`, r.contrast.light.length && `contrast light ${r.contrast.light.length} (worst ${worst(r.contrast.light)})`, r.mouseOnly.length && "mouse-only", r.basics.length && r.basics.join("/"), r.saverAnims.length && `${r.saverAnims.length} anims with saver`].filter(Boolean);
  console.log(`${id.padEnd(16)} ${flags.join(", ") || "ok"}`);
}
chrome.kill();
setTimeout(() => { try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) { /* Chrome still closing */ } }, 800);

console.log("\nDetails:");
const uniq = (a) => { const m = new Map(); a.forEach((c) => { const k = c.el + "|" + c.ratio; if (!m.has(k)) m.set(k, c); }); return [...m.values()].sort((x, y) => x.ratio - y.ratio).slice(0, 6); };
for (const r of report) {
  const lines = [];
  if (r.unnamed.length) lines.push(`  unnamed: ${[...new Set(r.unnamed)].map((k) => `${r.unnamed.filter((x) => x === k).length} ${k}`).join(", ")}`);
  if (r.images.length) lines.push(`  unnamed images: ${r.images.length}`);
  for (const th of ["dark", "light"]) if (r.contrast[th].length) lines.push(`  contrast (${th}): ${uniq(r.contrast[th]).map((c) => `${c.el} "${c.text}" ${c.ratio}/${c.need}`).join(" | ")}`);
  if (r.mouseOnly.length) lines.push(`  mouse-only: ${r.mouseOnly.join(", ")}`);
  if (r.basics.length) lines.push(`  basics: ${r.basics.join(", ")}`);
  if (r.saverAnims.length) lines.push(`  still animating with saver on: ${r.saverAnims.slice(0, 8).join(", ")}`);
  if (r.canvases) lines.push(`  ${r.canvases} large canvas (not focusable)`);
  if (lines.length) console.log(`${r.id}\n${lines.join("\n")}`);
}
