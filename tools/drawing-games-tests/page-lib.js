// Helpers every drawing-game test script starts with (see tools/test-drawing-games.mjs).
// ok(name, condition, info) records a result; R holds them all; errs collects page errors.
const errs = []; addEventListener("error", (e) => errs.push(e.message + (e.filename ? " @" + e.filename.split("/").slice(-2).join("/") + ":" + e.lineno : ""))); addEventListener("unhandledrejection", (e) => errs.push("rejection " + (e.reason && e.reason.message || e.reason)));
window.confirm = () => true; window.__alerts = []; window.alert = (m) => window.__alerts.push(String(m));
const q = (s) => document.querySelector(s), qa = (s) => [...document.querySelectorAll(s)];
const w = (ms) => new Promise((r) => setTimeout(r, ms));
const R = {}; const ok = (name, cond, info) => { R[name] = cond ? "ok" : "FAIL " + (info === undefined ? "" : JSON.stringify(info)).slice(0, 300); };
const shown = (el) => { if (!el || !el.isConnected) return false; const r = el.getBoundingClientRect(); if (!r.width || !r.height) return false; for (let p = el; p; p = p.parentElement) { if (p.hidden) return false; const cs = getComputedStyle(p); if (cs.display === "none" || cs.visibility === "hidden") return false; } return true; };
/** The size of an element in its own units: a canvas's pixels, or an svg's viewBox. */
const units = (el) => (el.viewBox && el.viewBox.baseVal && el.viewBox.baseVal.width ? [el.viewBox.baseVal.width, el.viewBox.baseVal.height] : [el.width, el.height]);
/** A pointer event on `el` at (x, y) in its own units, from finger `id`. */
const pe = (el, type, x, y, id = 1) => { const r = el.getBoundingClientRect(), [uw, uh] = units(el); el.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: id, pointerType: "touch", isPrimary: id === 1, button: 0, clientX: r.left + (x * r.width) / uw, clientY: r.top + (y * r.height) / uh })); };
const tapOn = async (el, x, y) => { pe(el, "pointerdown", x, y); pe(el, "pointerup", x, y); await w(40); };
const dragOn = async (el, pts) => { pe(el, "pointerdown", ...pts[0]); for (const p of pts.slice(1)) pe(el, "pointermove", ...p); pe(el, "pointerup", ...pts[pts.length - 1]); await w(40); };
/** Is the pixel at (x, y) of a canvas close to white (or see-through)? */
const blank = (ctx, x, y) => { const d = ctx.getImageData(Math.round(x), Math.round(y), 1, 1).data; return d[3] < 20 || (d[0] > 235 && d[1] > 235 && d[2] > 235); };
const inked = (ctx, x, y) => ctx.getImageData(Math.round(x), Math.round(y), 1, 1).data[3] > 60;
const clickText = async (sel, text) => { const el = qa(sel).find((b) => shown(b) && b.textContent.includes(text)); if (!el) throw new Error(`no "${text}" in ${sel} (have: ${qa(sel).filter(shown).map((b) => b.textContent.trim()).join(" | ")})`); el.click(); await w(80); return el; };
