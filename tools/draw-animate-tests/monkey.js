// Draw & Animate monkey test, run by tools/test-draw-animate.mjs: a child let loose. Random taps, drags and scribbles
// on the picture, presses of whatever buttons are showing (mostly the main ones), typing, keys, stray second fingers
// and pauses. It stops at the first page error; every 25 steps it checks the saved drawing has not gone bad.
// The same seed always makes the same moves. __SEED__ and __STEPS__ are filled in by the runner.
const SEED = __SEED__, STEPS = __STEPS__;
let st = SEED >>> 0; const rnd = () => { st = (st + 0x6D2B79F5) >>> 0; let t = st; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const pick = (a) => a[Math.floor(rnd() * a.length)];
const errs = []; addEventListener("error", (e) => errs.push("error: " + e.message + " @" + (e.filename || "").split("/").pop() + ":" + e.lineno));
addEventListener("unhandledrejection", (e) => errs.push("rejection: " + (e.reason && e.reason.message || e.reason)));
const ce = console.error; console.error = (...a) => { errs.push("console: " + a.join(" ")); ce(...a); };
window.confirm = () => rnd() < 0.8; window.alert = () => {}; window.prompt = () => null;
const w = (ms) => new Promise((r) => setTimeout(r, ms));
const cv = document.getElementById("cv");
const ev = (type, x, y) => { const r = cv.getBoundingClientRect(); cv.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: 1, pointerType: "touch", isPrimary: true, button: 0, clientX: r.left + (x * r.width) / 800, clientY: r.top + (y * r.height) / 600 })); };
const visible = (el) => { if (!el.isConnected) return false; const r = el.getBoundingClientRect(); if (!r.width || !r.height) return false; for (let p = el; p; p = p.parentElement) { if (p.hidden) return false; const cs = getComputedStyle(p); if (cs.display === "none" || cs.visibility === "hidden") return false; } return true; };
const SKIP = new Set(["saveVid"]);
const log = [];
function check(step) {
  const raw = localStorage.getItem("zone210_drawanim"); if (!raw) return null;
  let d; try { d = JSON.parse(raw); } catch (e) { return "storage is not JSON"; }
  const bad = [];
  const fin = (v) => typeof v === "number" && Number.isFinite(v);
  const strokeOk = (s, where) => { if (!s || !Array.isArray(s.p) || s.p.length < 2 || s.p.length % 2 || !s.p.every(fin)) bad.push(where + " bad points " + JSON.stringify(s).slice(0, 120)); if (!fin(s.w) || s.w <= 0) bad.push(where + " bad width"); if (s.j && !(s.j.every(fin))) bad.push(where + " bad joint"); };
  const things = d.scene && d.scene.things || [];
  if (things.length > 24) bad.push("more than 24 things: " + things.length);
  things.forEach((t, i) => { if (!fin(t.x) || !fin(t.y)) bad.push("thing " + i + " bad place"); if (!Array.isArray(t.s) || !t.s.length) bad.push("thing " + i + " has no strokes"); else t.s.forEach((s, k) => strokeOk(s, "thing " + i + "." + k)); if (t.path && (!t.path.every(fin) || t.path.length % 2)) bad.push("thing " + i + " bad path"); if (Math.abs(t.x) > 3000 || Math.abs(t.y) > 3000) bad.push("thing " + i + " far away " + t.x + "," + t.y); });
  const fl = d.flip || {}; const frames = fl.frames || [];
  if (!frames.length) bad.push("flipbook has no pages"); if (frames.length > 60) bad.push("flipbook over 60 pages");
  frames.forEach((f, i) => { if (!Array.isArray(f)) bad.push("page " + i + " not a list"); else f.forEach((s, k) => strokeOk(s, "page " + i + "." + k)); });
  if (fl.bgs && fl.bgs.length !== frames.length) bad.push("page backgrounds " + fl.bgs.length + " vs pages " + frames.length);
  const btns = [...document.querySelectorAll("#mainRow button")].filter((b) => !b.disabled);
  if (!btns.length) bad.push("no usable button under the picture");
  return bad.length ? bad.slice(0, 5).join(" | ") : null;
}
const out = { seed: SEED, steps: 0, errs, problems: [], log };
try {
  for (let i = 0; i < STEPS; i += 1) {
    out.steps = i + 1;
    const r = rnd(); let what = "";
    if (r < 0.22) { const x = rnd() * 840 - 20, y = rnd() * 640 - 20; what = `tap ${x | 0},${y | 0}`; ev("pointerdown", x, y); ev("pointerup", x, y); }
    else if (r < 0.42) { let x = rnd() * 800, y = rnd() * 600; const n = 2 + Math.floor(rnd() * 14); what = `drag ${x | 0},${y | 0} x${n}`; ev("pointerdown", x, y); for (let k = 0; k < n; k += 1) { x += (rnd() - 0.5) * 120; y += (rnd() - 0.5) * 120; ev("pointermove", x, y); } if (rnd() < 0.95) ev("pointerup", x, y); else what += " (no lift)"; }
    else if (r < 0.9) {
      const els = [...document.querySelectorAll(rnd() < 0.6 ? "#mainRow button, #tools .g-chip, #modes .g-chip, #thingPanel button, #thingPanel .g-chip, #thingPanel input, #moveRow button, #moveRow input, #fullBar button, #undo, #clear, #stickGrid [data-fig], #stickGrid button, #stickSets .g-chip, #jointRow button, #jointRow .g-chip, #jointRow input, #strip button, #strip [data-frame], #tween, #textNew, #thumb, #shapes .g-chip, #sizes .g-chip, #palette button" : "button, .g-chip, input[type=checkbox], input[type=range], select")].filter((el) => !el.disabled && !SKIP.has(el.id) && !el.closest("a") && visible(el));
      if (!els.length) { what = "nothing to press"; }
      else { const el = pick(els); const name = (el.id || el.dataset.act || el.dataset.tool || el.dataset.fig || el.dataset.bg || el.dataset.move || el.textContent || el.tagName).toString().trim().slice(0, 30);
        if (el.tagName === "SELECT") { el.selectedIndex = Math.floor(rnd() * el.options.length); el.dispatchEvent(new Event("change", { bubbles: true })); what = "choose " + name + "=" + el.value; }
        else if (el.type === "range") { el.value = String(Math.floor(rnd() * (Number(el.max) + 1))); el.dispatchEvent(new Event("input", { bubbles: true })); el.dispatchEvent(new Event("change", { bubbles: true })); what = "slide " + name + "=" + el.value; }
        else { el.click(); what = "press " + name; } }
    }
    else if (r < 0.925) { const id = 2 + Math.floor(rnd() * 3), x = rnd() * 800, y = rnd() * 600, rr = cv.getBoundingClientRect(); const pe = (type, px, py) => cv.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: id, pointerType: "touch", isPrimary: false, clientX: rr.left + (px * rr.width) / 800, clientY: rr.top + (py * rr.height) / 600 }));
      pe("pointerdown", x, y); pe("pointermove", x + 20, y + 10); if (rnd() < 0.7) pe("pointerup", x + 20, y + 10); what = "second finger " + id; }
    else if (r < 0.95) { const t = document.getElementById("textIn"); if (visible(t)) { t.value = pick(["", "Hi", "Hello there\nfriend", "ÄÖ 🙂 ✨", "x".repeat(80), "  ", "a\n\n\n\nb"]); t.dispatchEvent(new Event("input", { bubbles: true })); what = "type " + JSON.stringify(t.value).slice(0, 20); } else what = "no text box"; }
    else if (r < 0.97) { document.dispatchEvent(new KeyboardEvent("keydown", { key: pick(["Escape", "z", "Enter"]), ctrlKey: rnd() < 0.3, metaKey: rnd() < 0.2, bubbles: true })); what = "key"; }
    else { const ms = 200 + rnd() * 1300; what = "wait " + (ms | 0); await w(ms); }
    log.push(what); if (log.length > 40) log.shift();
    if (rnd() < 0.3) await w(16);
    if (errs.length) break;
    if (i % 25 === 24) { await w(450); const p = check(i); if (p) { out.problems.push(`step ${i + 1}: ${p}`); break; } }
  }
  await w(500); const p = check(STEPS); if (p) out.problems.push("end: " + p);
} catch (e) { errs.push("fuzzer: " + e.message); }
const d = JSON.parse(localStorage.getItem("zone210_drawanim") || "{}");
out.final = { mode: d.mode, things: d.scene && d.scene.things.length, pages: d.flip && d.flip.frames.length };
if (!errs.length && !out.problems.length) out.log = log.slice(-5);
return out;
