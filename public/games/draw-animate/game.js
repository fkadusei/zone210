// Draw & Animate. Two ways to animate what you draw:
//  - "Bring it to life": each drawing is a thing with its own movement (engine.js works out where it is at any moment)
//  - "Flipbook": pages drawn one by one and flipped through
// Drawings are kept as strokes (lists of points), so they stay small enough to save on the device.
import { canSharePhotos, toPhotos, download } from "../../assets/save-image.js";
import { W, H, MOVES, ACTS, SPEEDS, bbox, makeThing, stageStrokes, thin, pose, pathLength, exampleScene, exampleFlip } from "./engine.js";

const $ = (id) => document.getElementById(id);
const store = {
  get(key, fallback) { try { const raw = localStorage.getItem(key); return raw === null ? fallback : JSON.parse(raw); } catch (err) { return fallback; } },
  set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch (err) { return false; } },
};
const KEY = "zone210_drawanim";
const data = { mode: "scene", color: "#1f2430", size: 10, scene: { bg: "paper", things: [] }, flip: { frames: [[]], fps: 6, onion: true }, ...store.get(KEY, {}) };
if (!Array.isArray(data.flip.frames) || !data.flip.frames.length) data.flip.frames = [[]];
let saveT = 0;
const save = () => { clearTimeout(saveT); saveT = setTimeout(() => { if (!store.set(KEY, data)) note("This device is out of space to save more. Your animation still plays."); }, 400); };

const COLORS = ["#1f2430", "#e5484d", "#f5a623", "#f5d90a", "#2fb36d", "#3b82f6", "#8a5ce0", "#ec6aa0", "#8b5a2b", "#ffffff"];
const COLOR_NAMES = ["Black", "Red", "Orange", "Yellow", "Green", "Blue", "Purple", "Pink", "Brown", "White"];
const SIZES = [[4, "Thin"], [10, "Medium"], [22, "Thick"], [44, "Huge"]];
const BGS = [["paper", "📄 Paper"], ["sky", "🌤️ Sky"], ["sea", "🌊 Sea"], ["space", "🚀 Space"], ["night", "🌙 Night"]];
const FPS = [[3, "Slow"], [6, "Medium"], [10, "Fast"]];
const MAX_THINGS = 12, MAX_FRAMES = 24;

const cv = $("cv"), ctx = cv.getContext("2d");
const saverOn = () => !!(window.z210Saver && window.z210Saver.on);
let SCALE = 2;
// state: "idle" | "draw" (drawing a thing) | "path" (tracing a path) | "play"
const ui = { state: "idle", sel: -1, edit: -1, draft: [], frame: 0, erase: false, live: null, drag: null, pathPts: null, t0: 0, raf: 0, shown: -1, clean: false };
const scene = () => data.mode === "scene";
const drawing = () => (scene() ? ui.state === "draw" : ui.state === "idle");
const strokes = () => (scene() ? ui.draft : data.flip.frames[ui.frame]);
const note = (text) => { $("note").textContent = text; };

// ---------- drawing strokes ----------
function strokeOn(g, s) {
  const p = s.p;
  g.globalCompositeOperation = s.e ? "destination-out" : "source-over";
  g.strokeStyle = g.fillStyle = s.c; g.lineWidth = s.w; g.lineCap = "round"; g.lineJoin = "round";
  g.beginPath();
  if (p.length === 2) { g.arc(p[0], p[1], s.w / 2, 0, Math.PI * 2); g.fill(); } else {
    g.moveTo(p[0], p[1]);
    for (let i = 2; i < p.length - 2; i += 2) g.quadraticCurveTo(p[i], p[i + 1], (p[i] + p[i + 2]) / 2, (p[i + 1] + p[i + 3]) / 2);
    g.lineTo(p[p.length - 2], p[p.length - 1]); g.stroke();
  }
  g.globalCompositeOperation = "source-over";
}
// two stage-sized layers: A is what is being drawn (a thing, or the flipbook page); B is the page before, or the page being played
const mkLayer = () => { const c = document.createElement("canvas"); c.width = W * 2; c.height = H * 2; const g = c.getContext("2d"); g.scale(2, 2); return { cv: c, g }; };
const A = mkLayer(), B = mkLayer();
function paintLayer(L, list) { L.g.clearRect(0, 0, W, H); list.forEach((s) => strokeOn(L.g, s)); }

// each thing is drawn once onto its own small canvas, then that picture is moved, turned and stretched
const layers = new WeakMap();
function layer(thing) {
  let L = layers.get(thing);
  if (L) return L;
  const b = bbox(thing.s) || { x0: -1, y0: -1, x1: 1, y1: 1, w: 2, h: 2 }, pad = 4, c = document.createElement("canvas");
  c.width = Math.max(2, Math.ceil((b.w + pad * 2) * 2)); c.height = Math.max(2, Math.ceil((b.h + pad * 2) * 2));
  const g = c.getContext("2d");
  g.scale(2, 2); g.translate(pad - b.x0, pad - b.y0);
  thing.s.forEach((s) => strokeOn(g, s));
  L = { cv: c, b, pad };
  layers.set(thing, L);
  return L;
}
function drawThing(thing, p) {
  const { cv: c, b, pad } = layer(thing);
  ctx.save();
  ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.scale(p.sx * p.flip, p.sy);
  ctx.drawImage(c, b.x0 - pad, b.y0 - pad, b.w + pad * 2, b.h + pad * 2);
  ctx.restore();
}

// ---------- backgrounds ----------
function stars(g, n, seed) { let a = seed; const r = () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; }; g.fillStyle = "#fff"; for (let i = 0; i < n; i += 1) { g.globalAlpha = 0.4 + r() * 0.6; g.beginPath(); g.arc(r() * W, r() * H * 0.85, 0.8 + r() * 1.8, 0, 7); g.fill(); } g.globalAlpha = 1; }
function drawBg(g, bg) {
  const grad = (stops) => { const q = g.createLinearGradient(0, 0, 0, H); stops.forEach(([o, c]) => q.addColorStop(o, c)); return q; };
  if (bg === "sky") {
    g.fillStyle = grad([[0, "#8fd3ff"], [0.75, "#dff4ff"]]); g.fillRect(0, 0, W, H);
    g.fillStyle = "#7ccf6b"; g.beginPath(); g.moveTo(0, 520); g.quadraticCurveTo(200, 480, 400, 515); g.quadraticCurveTo(620, 550, W, 500); g.lineTo(W, H); g.lineTo(0, H); g.fill();
  } else if (bg === "sea") {
    g.fillStyle = grad([[0, "#5fc3e8"], [0.6, "#2a7fc0"], [1, "#1b4f8f"]]); g.fillRect(0, 0, W, H);
    g.fillStyle = "#e9d49a"; g.beginPath(); g.moveTo(0, 560); g.quadraticCurveTo(250, 520, 480, 556); g.quadraticCurveTo(650, 580, W, 540); g.lineTo(W, H); g.lineTo(0, H); g.fill();
    g.fillStyle = "rgba(255,255,255,0.12)"; [[90, 60], [330, 40], [600, 70]].forEach(([x, w]) => { g.beginPath(); g.moveTo(x, 0); g.lineTo(x + w, 0); g.lineTo(x + w + 110, 520); g.lineTo(x + 70, 520); g.fill(); });
  } else if (bg === "space") {
    g.fillStyle = grad([[0, "#070b22"], [1, "#1a1446"]]); g.fillRect(0, 0, W, H); stars(g, 130, 7);
  } else if (bg === "night") {
    g.fillStyle = grad([[0, "#0c1740"], [1, "#2b3d7a"]]); g.fillRect(0, 0, W, H); stars(g, 70, 21);
    g.fillStyle = "#fdf3c4"; g.beginPath(); g.arc(660, 110, 46, 0, 7); g.fill(); g.fillStyle = "#16224f"; g.beginPath(); g.arc(680, 96, 40, 0, 7); g.fill();
    g.fillStyle = "#14331f"; g.beginPath(); g.moveTo(0, 530); g.quadraticCurveTo(300, 480, 520, 525); g.quadraticCurveTo(680, 555, W, 515); g.lineTo(W, H); g.lineTo(0, H); g.fill();
  } else { g.fillStyle = "#fffdf6"; g.fillRect(0, 0, W, H); }
}

// ---------- the picture on screen ----------
function render(t = null) {
  ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
  if (scene()) {
    const playing = ui.state === "play";
    drawBg(ctx, data.scene.bg);
    data.scene.things.forEach((th, i) => { if (ui.state === "draw" && i === ui.edit) return; drawThing(th, pose(th, playing ? t : null, i)); });
    if (ui.state === "draw") ctx.drawImage(A.cv, 0, 0, W, H);
    const th = data.scene.things[ui.sel];
    if (th && !playing && ui.state !== "draw" && !ui.clean) {
      const light = data.scene.bg === "space" || data.scene.bg === "night";
      ctx.save(); ctx.lineWidth = 2.5; ctx.setLineDash([8, 6]); ctx.strokeStyle = light ? "#ffd15a" : "#cf9410";
      if (th.move === "path" && th.path && ui.state !== "path") { ctx.beginPath(); ctx.moveTo(th.path[0], th.path[1]); for (let i = 2; i < th.path.length; i += 2) ctx.lineTo(th.path[i], th.path[i + 1]); ctx.stroke(); }
      const { b } = layer(th); ctx.setLineDash([]); ctx.strokeRect(th.x + b.x0 - 6, th.y + b.y0 - 6, b.w + 12, b.h + 12);
      ctx.restore();
    }
    if (ui.state === "path" && ui.pathPts) { ctx.save(); ctx.lineWidth = 5; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.setLineDash([2, 12]); ctx.strokeStyle = "#f5a623"; ctx.beginPath(); ctx.moveTo(ui.pathPts[0], ui.pathPts[1]); for (let i = 2; i < ui.pathPts.length; i += 2) ctx.lineTo(ui.pathPts[i], ui.pathPts[i + 1]); ctx.stroke(); ctx.restore(); }
  } else {
    drawBg(ctx, "paper");
    if (ui.state === "play") ctx.drawImage(B.cv, 0, 0, W, H);
    else {
      if (data.flip.onion && ui.frame > 0 && !ui.clean) { ctx.globalAlpha = 0.22; ctx.drawImage(B.cv, 0, 0, W, H); ctx.globalAlpha = 1; }
      ctx.drawImage(A.cv, 0, 0, W, H);
    }
  }
}
function fit() { SCALE = saverOn() ? 1 : 2; cv.width = W * SCALE; cv.height = H * SCALE; render(); }
window.addEventListener("z210:saver", fit);

// ---------- playing ----------
function play() {
  if (ui.state === "draw" || ui.state === "path") return;
  if (scene() && !data.scene.things.length) { note("Draw something first, then press Play."); return; }
  ui.state = "play"; ui.t0 = performance.now(); ui.shown = -1;
  let skip = false;
  const tick = (now) => {
    if (ui.state !== "play") return;
    ui.raf = requestAnimationFrame(tick);
    const t = (now - ui.t0) / 1000;
    if (scene()) { skip = !skip; if (saverOn() && skip) return; render(t); } // Battery saver: half the frames
    else { const n = Math.floor(t * data.flip.fps) % data.flip.frames.length; if (n !== ui.shown) { ui.shown = n; paintLayer(B, data.flip.frames[n]); render(); } }
  };
  ui.raf = requestAnimationFrame(tick);
  paint();
}
function stop() {
  if (ui.state !== "play") return;
  cancelAnimationFrame(ui.raf); ui.state = "idle";
  if (!scene()) syncFlip();
  paint(); render();
}
document.addEventListener("visibilitychange", () => { if (document.hidden && !recording) stop(); });

// ---------- the buttons and words around the picture ----------
const chips = (id, items, attr) => { $(id).innerHTML = items.map(([v, label]) => `<button class="g-chip" data-${attr}="${v}">${label}</button>`).join(""); };
const press = (id, attr, value) => $(id).querySelectorAll(".g-chip").forEach((b) => b.setAttribute("aria-pressed", String(String(b.dataset[attr]) === String(value))));
function paint() {
  const things = data.scene.things, th = things[ui.sel], playing = ui.state === "play";
  document.querySelectorAll("#modes .g-chip").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.mode === data.mode)));
  $("stage").classList.toggle("pick", scene() && ui.state === "idle");
  $("stage").classList.toggle("playing", playing);
  const btn = (act, label, cls = "", off = false) => `<button class="g-btn ${cls}" data-act="${act}" ${off ? "disabled" : ""}>${label}</button>`;
  let row, hint;
  if (playing) { row = btn("stop", "⏹ Stop"); hint = "Playing. Press Stop to change things."; }
  else if (!scene()) { row = btn("addFrame", "＋ New page", "ghost") + btn("play", "▶ Play", "", data.flip.frames.length < 2); hint = data.flip.frames.length < 2 ? "Draw the first page, then tap New page and draw it again, a little different." : `Page ${ui.frame + 1} of ${data.flip.frames.length}. Change each page a little, then press Play.`; }
  else if (ui.state === "draw") { row = btn("done", "✓ Done") + btn("cancel", "✕ Cancel", "ghost"); hint = ui.edit >= 0 ? "Add to your drawing, then tap Done." : "Draw one thing, like a fish, a ball or a cloud. Then tap Done."; }
  else if (ui.state === "path") { row = btn("cancel", "✕ Cancel", "ghost"); hint = "Trace a line with your finger to show where it should go."; }
  else { row = btn("new", "✏️ Draw a new thing") + btn("play", "▶ Play", things.length ? "" : "ghost", !things.length); hint = !things.length ? "Tap “Draw a new thing” to begin, or try the example below." : th ? "Choose how this drawing moves, then press Play." : "Tap a drawing to choose how it moves. Drag it to put it somewhere else."; }
  $("mainRow").innerHTML = row;
  $("hint").textContent = hint;
  $("drawTools").hidden = !drawing();
  $("thingPanel").hidden = !(scene() && ui.state === "idle" && th);
  $("scenePanel").hidden = !(scene() && ui.state === "idle");
  $("flipPanel").hidden = scene() || playing;
  $("strip").hidden = scene() || playing;
  document.querySelectorAll("#palette .sw").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.c === data.color && !ui.erase)));
  press("sizes", "size", data.size);
  document.querySelectorAll("#penKind .g-chip").forEach((b) => b.setAttribute("aria-pressed", String((b.dataset.erase === "1") === ui.erase)));
  press("bgs", "bg", data.scene.bg);
  press("fps", "fps", data.flip.fps);
  $("onion").checked = !!data.flip.onion;
  if (th) { press("moves", "move", th.move); press("acts", "act", th.act); press("speeds", "speed", th.speed); $("face").checked = !!th.face; }
}

// ---------- pointer: draw, trace a path, or pick up and drag a thing ----------
function at(e) { const r = cv.getBoundingClientRect(); return [((e.clientX - r.left) * W) / r.width, ((e.clientY - r.top) * H) / r.height]; }
function hit(x, y) {
  for (let i = data.scene.things.length - 1; i >= 0; i -= 1) { const th = data.scene.things[i], { b } = layer(th); if (x >= th.x + b.x0 - 10 && x <= th.x + b.x1 + 10 && y >= th.y + b.y0 - 10 && y <= th.y + b.y1 + 10) return i; }
  return -1;
}
cv.addEventListener("pointerdown", (e) => {
  if (ui.state === "play" || (e.pointerType === "mouse" && e.button !== 0)) return;
  e.preventDefault();
  try { cv.setPointerCapture(e.pointerId); } catch (err) { /* older browsers */ }
  const [x, y] = at(e);
  if (drawing()) { ui.live = { c: data.color, w: ui.erase ? Math.max(18, data.size * 1.8) : data.size, e: ui.erase ? 1 : 0, p: [x, y] }; strokeOn(A.g, ui.live); render(); }
  else if (ui.state === "path") { ui.pathPts = [x, y]; render(); }
  else if (scene()) { const i = hit(x, y); if (i !== ui.sel) { ui.sel = i; paint(); } if (i >= 0) ui.drag = { x, y }; render(); }
});
cv.addEventListener("pointermove", (e) => {
  if (!ui.live && !ui.pathPts && !ui.drag) return;
  const [x, y] = at(e);
  if (ui.live) {
    const p = ui.live.p, g = A.g;
    g.globalCompositeOperation = ui.live.e ? "destination-out" : "source-over"; g.strokeStyle = ui.live.c; g.lineWidth = ui.live.w; g.lineCap = "round";
    g.beginPath(); g.moveTo(p[p.length - 2], p[p.length - 1]); g.lineTo(x, y); g.stroke(); g.globalCompositeOperation = "source-over";
    p.push(x, y);
  } else if (ui.pathPts) ui.pathPts.push(x, y);
  else {
    const th = data.scene.things[ui.sel], dx = x - ui.drag.x, dy = y - ui.drag.y;
    if (!th) return;
    th.x = Math.max(0, Math.min(W, th.x + dx)); th.y = Math.max(0, Math.min(H, th.y + dy));
    if (th.path) th.path = th.path.map((v, i) => v + (i % 2 ? dy : dx)); // its path comes with it
    ui.drag = { x, y };
  }
  render();
});
function lift() {
  if (ui.live) {
    ui.live.p = thin(ui.live.p);
    strokes().push(ui.live); ui.live = null;
    paintLayer(A, strokes()); // redraw smoothly
    if (!scene()) { thumb(ui.frame); save(); }
  } else if (ui.pathPts) {
    const th = data.scene.things[ui.sel], pts = thin(ui.pathPts, 8);
    ui.pathPts = null;
    if (pathLength(pts) < 50) note("That path was very short. Trace a longer line.");
    else if (th) { th.path = pts; th.move = "path"; ui.state = "idle"; note("Path set. Press Play to watch."); save(); paint(); }
  } else if (ui.drag) { ui.drag = null; save(); }
  render();
}
cv.addEventListener("pointerup", lift);
cv.addEventListener("pointercancel", lift);

// ---------- bring it to life ----------
function startDraw(edit = -1) {
  if (edit < 0 && data.scene.things.length >= MAX_THINGS) { note(`That's ${MAX_THINGS} drawings, the most a scene can hold. Delete one to add another.`); return; }
  ui.state = "draw"; ui.edit = edit; ui.draft = edit >= 0 ? stageStrokes(data.scene.things[edit]) : [];
  paintLayer(A, ui.draft); note(""); paint(); render();
  if (matchMedia("(max-width: 700px)").matches) $("hint").scrollIntoView({ block: "start", behavior: "smooth" });
}
function endDraw(keep) {
  if (keep) {
    const old = ui.edit >= 0 ? data.scene.things[ui.edit] : {}, made = makeThing(ui.draft, { move: old.move, act: old.act, speed: old.speed, face: old.face, path: old.path });
    if (!made) { note("Draw something first, then tap Done."); return; }
    ["move", "act", "speed", "face", "path"].forEach((k) => { if (made[k] === undefined) delete made[k]; });
    const thing = { move: "stay", act: "none", speed: 1, face: true, path: null, ...made };
    if (ui.edit >= 0) data.scene.things[ui.edit] = thing; else { data.scene.things.push(thing); ui.sel = data.scene.things.length - 1; }
    note(ui.edit >= 0 ? "" : "Now choose how it moves.");
    save();
  }
  ui.state = "idle"; ui.edit = -1; ui.draft = [];
  paint(); render();
}
$("mainRow").addEventListener("click", (e) => {
  const b = e.target.closest("[data-act]");
  if (!b) return;
  const act = b.dataset.act;
  if (act === "new") startDraw();
  else if (act === "done") endDraw(true);
  else if (act === "cancel") { if (ui.state === "path") { ui.state = "idle"; ui.pathPts = null; paint(); render(); } else endDraw(false); }
  else if (act === "play") play();
  else if (act === "stop") stop();
  else if (act === "addFrame") addFrame(false);
});
const sel = () => data.scene.things[ui.sel];
$("moves").addEventListener("click", (e) => {
  const b = e.target.closest(".g-chip"), th = sel();
  if (!b || !th) return;
  if (b.dataset.move === "path") { ui.state = "path"; ui.pathPts = null; note(""); paint(); render(); return; }
  th.move = b.dataset.move; save(); paint(); render();
});
$("acts").addEventListener("click", (e) => { const b = e.target.closest(".g-chip"), th = sel(); if (b && th) { th.act = b.dataset.act; save(); paint(); } });
$("speeds").addEventListener("click", (e) => { const b = e.target.closest(".g-chip"), th = sel(); if (b && th) { th.speed = Number(b.dataset.speed); save(); paint(); } });
$("face").addEventListener("change", () => { const th = sel(); if (th) { th.face = $("face").checked; save(); } });
$("addTo").addEventListener("click", () => { if (sel()) startDraw(ui.sel); });
$("toFront").addEventListener("click", () => { const th = sel(); if (!th) return; data.scene.things.splice(ui.sel, 1); data.scene.things.push(th); ui.sel = data.scene.things.length - 1; save(); render(); });
$("copyThing").addEventListener("click", () => {
  const th = sel();
  if (!th) return;
  if (data.scene.things.length >= MAX_THINGS) { note(`That's ${MAX_THINGS} drawings, the most a scene can hold.`); return; }
  const copy = JSON.parse(JSON.stringify(th)); copy.x = Math.min(W - 20, th.x + 40); copy.y = Math.min(H - 20, th.y + 30);
  if (copy.path) copy.path = copy.path.map((v, i) => v + (i % 2 ? 30 : 40));
  data.scene.things.push(copy); ui.sel = data.scene.things.length - 1; save(); paint(); render();
});
$("delThing").addEventListener("click", () => { if (!sel()) return; data.scene.things.splice(ui.sel, 1); ui.sel = -1; save(); paint(); render(); });
$("bgs").addEventListener("click", (e) => { const b = e.target.closest(".g-chip"); if (b) { data.scene.bg = b.dataset.bg; save(); paint(); render(); } });
$("exScene").addEventListener("click", () => { if (data.scene.things.length && !confirm("Swap your scene for the example? Your drawings here will be removed.")) return; data.scene = exampleScene(); ui.sel = -1; save(); paint(); render(); note("Press Play! Then tap a drawing to see how it was set up."); });
$("newScene").addEventListener("click", () => { if (data.scene.things.length && !confirm("Clear this scene and start again?")) return; data.scene = { bg: data.scene.bg, things: [] }; ui.sel = -1; save(); paint(); render(); });

// ---------- drawing tools ----------
$("palette").innerHTML = COLORS.map((c, i) => `<button class="sw" data-c="${c}" style="background:${c}" aria-label="${COLOR_NAMES[i]}"></button>`).join("");
$("palette").addEventListener("click", (e) => { const b = e.target.closest(".sw"); if (b) { data.color = b.dataset.c; ui.erase = false; save(); paint(); } });
$("sizes").innerHTML = SIZES.map(([v, label]) => `<button class="g-chip sz" data-size="${v}" aria-label="${label} line"><i style="width:${Math.min(26, v + 2)}px;height:${Math.min(26, v + 2)}px"></i></button>`).join("");
$("sizes").addEventListener("click", (e) => { const b = e.target.closest(".g-chip"); if (b) { data.size = Number(b.dataset.size); save(); paint(); } });
$("penKind").addEventListener("click", (e) => { const b = e.target.closest(".g-chip"); if (b) { ui.erase = b.dataset.erase === "1"; paint(); } });
$("undo").addEventListener("click", () => { if (!strokes().length) return; strokes().pop(); paintLayer(A, strokes()); if (!scene()) { thumb(ui.frame); save(); } render(); });
$("clear").addEventListener("click", () => { strokes().length = 0; paintLayer(A, strokes()); if (!scene()) { thumb(ui.frame); save(); } render(); });

// ---------- flipbook ----------
function thumb(i) {
  const c = $("strip").querySelector(`[data-f="${i}"] canvas`);
  if (!c) return;
  const g = c.getContext("2d");
  g.setTransform(c.width / W, 0, 0, c.width / W, 0, 0); g.clearRect(0, 0, W, H);
  data.flip.frames[i].forEach((s) => strokeOn(g, s));
}
function strip() {
  $("strip").innerHTML = data.flip.frames.map((_, i) => `<button class="fr" data-f="${i}" aria-pressed="${i === ui.frame}" aria-label="Page ${i + 1}"><canvas width="184" height="138"></canvas><span>${i + 1}</span></button>`).join("");
  data.flip.frames.forEach((_, i) => thumb(i));
  const on = $("strip").querySelector('[aria-pressed="true"]'), box = $("strip");
  if (on) box.scrollLeft = Math.max(0, on.offsetLeft - box.clientWidth / 2 + on.offsetWidth / 2); // keep the open page in view without moving the whole screen
}
function syncFlip() {
  ui.frame = Math.max(0, Math.min(ui.frame, data.flip.frames.length - 1));
  paintLayer(A, data.flip.frames[ui.frame]);
  if (ui.frame > 0) paintLayer(B, data.flip.frames[ui.frame - 1]);
  strip();
}
function addFrame(copy) {
  if (data.flip.frames.length >= MAX_FRAMES) { note(`That's ${MAX_FRAMES} pages, the most a flipbook can hold.`); return; }
  data.flip.frames.splice(ui.frame + 1, 0, copy ? JSON.parse(JSON.stringify(data.flip.frames[ui.frame])) : []);
  ui.frame += 1; note(""); save(); syncFlip(); paint(); render();
}
$("strip").addEventListener("click", (e) => { const b = e.target.closest(".fr"); if (b) { ui.frame = Number(b.dataset.f); syncFlip(); paint(); render(); } });
$("copyFrame").addEventListener("click", () => addFrame(true));
$("delFrame").addEventListener("click", () => { if (data.flip.frames.length > 1) data.flip.frames.splice(ui.frame, 1); else data.flip.frames[0] = []; save(); syncFlip(); paint(); render(); });
$("fps").addEventListener("click", (e) => { const b = e.target.closest(".g-chip"); if (b) { data.flip.fps = Number(b.dataset.fps); save(); paint(); } });
$("onion").addEventListener("change", () => { data.flip.onion = $("onion").checked; save(); render(); });
$("exFlip").addEventListener("click", () => { if (data.flip.frames.some((f) => f.length) && !confirm("Swap your flipbook for the example? Your pages here will be removed.")) return; data.flip = exampleFlip(); ui.frame = 0; save(); syncFlip(); paint(); render(); note("Press Play! Then look through the pages to see how each one changes."); });
$("newFlip").addEventListener("click", () => { if (data.flip.frames.some((f) => f.length) && !confirm("Clear this flipbook and start again?")) return; data.flip = { frames: [[]], fps: data.flip.fps, onion: data.flip.onion }; ui.frame = 0; save(); syncFlip(); paint(); render(); });

$("modes").addEventListener("click", (e) => {
  const b = e.target.closest(".g-chip");
  if (!b || b.dataset.mode === data.mode) return;
  stop();
  if (ui.state !== "idle") { ui.state = "idle"; ui.edit = -1; ui.draft = []; ui.pathPts = null; }
  data.mode = b.dataset.mode; ui.sel = -1; note(""); save();
  if (!scene()) syncFlip();
  paint(); render();
});

// ---------- saving a picture or a short video ----------
$("savePic").addEventListener("click", async () => {
  ui.clean = true; render(ui.state === "play" ? (performance.now() - ui.t0) / 1000 : null);
  if (canSharePhotos()) { const r = await toPhotos(cv, "draw-and-animate.png"); if (r === "unsupported") await download(cv, "draw-and-animate.png"); note(r === "shared" ? "Done! If you chose Save Image, it is in your Photos." : r === "cancelled" ? "" : "Saved to your Downloads."); }
  else { await download(cv, "draw-and-animate.png"); note("Saved to your Downloads."); }
  ui.clean = false; if (ui.state !== "play") render();
});
let recording = false;
const VIDEO = window.MediaRecorder && cv.captureStream ? ["video/mp4;codecs=avc1", "video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm", "video/mp4"].find((m) => { try { return MediaRecorder.isTypeSupported(m); } catch (err) { return false; } }) : "";
$("saveVid").hidden = !VIDEO;
$("saveVid").addEventListener("click", () => {
  if (recording) return;
  if (ui.state === "draw" || ui.state === "path") { note("Finish your drawing first."); return; }
  if (scene() ? !data.scene.things.length : data.flip.frames.length < 2) { note(scene() ? "Draw something first." : "A flipbook needs at least two pages."); return; }
  stop(); ui.sel = -1;
  const secs = scene() ? 6 : Math.min(8, Math.max(3, (data.flip.frames.length / data.flip.fps) * 2));
  let rec;
  try { rec = new MediaRecorder(cv.captureStream(30), { mimeType: VIDEO, videoBitsPerSecond: 2500000 }); } catch (err) { note("This browser could not record a video."); return; }
  const parts = [];
  recording = true; $("saveVid").disabled = true;
  rec.ondataavailable = (ev) => { if (ev.data && ev.data.size) parts.push(ev.data); };
  rec.onstop = () => {
    recording = false; $("saveVid").disabled = false; stop();
    const type = VIDEO.split(";")[0], file = new File([new Blob(parts, { type })], `my-animation.${type === "video/mp4" ? "mp4" : "webm"}`, { type });
    if (!file.size) { note("The video came out empty. Please try again."); return; }
    // a second tap is needed: phones only let a page share or save a file straight after a tap
    $("note").innerHTML = `Your video is ready. <button class="g-btn" id="keepVid">📥 Save or share it</button>`;
    $("keepVid").addEventListener("click", async () => {
      try { if (navigator.canShare && navigator.canShare({ files: [file] }) && matchMedia("(pointer: coarse)").matches) { await navigator.share({ files: [file], title: "My animation from Zone 210" }); note("Done!"); return; } } catch (err) { if (err && err.name === "AbortError") return; }
      const url = URL.createObjectURL(file), a = document.createElement("a");
      a.download = file.name; a.href = url; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000);
      note("Saved to your Downloads.");
    });
  };
  play(); rec.start();
  let left = Math.ceil(secs);
  note(`Recording… ${left}`);
  const count = setInterval(() => { left -= 1; if (left > 0 && recording) note(`Recording… ${left}`); else clearInterval(count); }, 1000);
  setTimeout(() => { try { rec.stop(); } catch (err) { recording = false; $("saveVid").disabled = false; } }, secs * 1000);
});

// ---------- start ----------
chips("moves", MOVES, "move"); chips("acts", ACTS, "act"); chips("speeds", SPEEDS, "speed"); chips("bgs", BGS, "bg"); chips("fps", FPS, "fps");
if (!scene()) syncFlip();
fit();
paint();
window.__da = { data, ui, play, stop, render };
