// Draw & Animate. Two ways to animate what you draw:
//  - "Bring it to life": each drawing is a thing with its own movement (engine.js works out where it is at any moment)
//  - "Flipbook": pages drawn one by one and flipped through
// Drawings are kept as strokes (lists of points), so they stay small enough to save on the device.
import { canSharePhotos, toPhotos, download } from "../../assets/save-image.js";
import { TUNES, playTune, stopTune, playingTune } from "./music.js";
import { W, H, MOVES, ACTS, SPEEDS, bbox, makeThing, stageStrokes, thin, pose, pathLength, exampleScene, exampleFlip } from "./engine.js";

const $ = (id) => document.getElementById(id);
const store = {
  get(key, fallback) { try { const raw = localStorage.getItem(key); return raw === null ? fallback : JSON.parse(raw); } catch (err) { return fallback; } },
  set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch (err) { return false; } },
};
const KEY = "zone210_drawanim";
const data = { mode: "scene", color: "#1f2430", size: 10, scene: { bg: "paper", things: [] }, flip: { frames: [[]], fps: 6, onion: true }, ...store.get(KEY, {}) };
if (!Array.isArray(data.flip.frames) || !data.flip.frames.length) data.flip.frames = [[]];
// each flipbook page has its own background: data.flip.bgs runs alongside data.flip.frames (older saves had one for the whole book)
function evenBgs() { const f = data.flip, old = Array.isArray(f.bgs) ? f.bgs : []; f.bgs = f.frames.map((_, i) => old[i] || f.bg || "paper"); delete f.bg; }
evenBgs();
if (data.flip.fps === 3) data.flip.fps = 2; // "Slow" used to be 3 pages a second
const bgOf = (i) => data.flip.bgs[i] || "paper";
let saveT = 0;
const save = () => { clearTimeout(saveT); saveT = setTimeout(() => { if (!store.set(KEY, data)) note("This device is out of space to save more. Your animation still plays."); }, 400); };

const COLORS = ["#1f2430", "#e5484d", "#f5a623", "#f5d90a", "#2fb36d", "#3b82f6", "#8a5ce0", "#ec6aa0", "#8b5a2b", "#ffffff"];
const COLOR_NAMES = ["Black", "Red", "Orange", "Yellow", "Green", "Blue", "Purple", "Pink", "Brown", "White"];
const SIZES = [[4, "Thin"], [10, "Medium"], [22, "Thick"], [44, "Huge"]];
const BGS = [["paper", "📄 Paper"], ["grid", "📐 Squared paper"], ["chalk", "🟩 Chalkboard"], ["sky", "🌤️ Sky"], ["sea", "🌊 Under the sea"], ["beach", "🏖️ Beach"], ["desert", "🏜️ Desert"], ["snow", "❄️ Snow"],
  ["forest", "🌲 Forest"], ["mountains", "⛰️ Mountains"], ["road", "🛣️ Road"], ["city", "🏙️ City"], ["sunset", "🌇 Sunset"], ["night", "🌙 Night"], ["space", "🚀 Space"]];
const DARK = new Set(["space", "night", "chalk", "sunset"]); // backgrounds where the outline round a chosen drawing needs to be light
const FPS = [[2, "Slow"], [6, "Medium"], [10, "Fast"]];
const MAX_THINGS = 12, MAX_FRAMES = 24;

const cv = $("cv"), ctx = cv.getContext("2d");
const saverOn = () => !!(window.z210Saver && window.z210Saver.on);
let SCALE = 2;
// state: "idle" | "draw" (drawing a thing) | "path" (tracing a path) | "play"
const ui = { state: "idle", sel: -1, edit: -1, draft: [], frame: 0, erase: false, live: null, drag: null, pathPts: null, t0: 0, raf: 0, clean: false,
  page: 0, turn: null, auto: true, lastTurn: 0, scrub: null, want: null, landed: 0 }; // want: the page a finger or the slider is heading for // the flipbook being flipped: the page showing, the page turn in progress, whether it flips by itself
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
const A = mkLayer(), B = mkLayer(), C = mkLayer(); // C is scratch
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
  } else if (bg === "grid") {
    g.fillStyle = "#fdfefe"; g.fillRect(0, 0, W, H);
    g.strokeStyle = "#cfe3f5"; g.lineWidth = 1; g.beginPath();
    for (let x = 0; x <= W; x += 40) { g.moveTo(x, 0); g.lineTo(x, H); }
    for (let y = 0; y <= H; y += 40) { g.moveTo(0, y); g.lineTo(W, y); }
    g.stroke();
  } else if (bg === "chalk") {
    g.fillStyle = "#6b4a2b"; g.fillRect(0, 0, W, H);
    g.fillStyle = grad([[0, "#2c5a47"], [1, "#22483a"]]); g.fillRect(14, 14, W - 28, H - 28);
    g.fillStyle = "rgba(255,255,255,0.05)"; [[60, 70, 300, 26], [420, 300, 260, 22], [120, 470, 380, 24]].forEach(([x, y, w, h]) => g.fillRect(x, y, w, h));
  } else if (bg === "beach") {
    g.fillStyle = grad([[0, "#8fd3ff"], [0.5, "#d9f1ff"]]); g.fillRect(0, 0, W, H);
    g.fillStyle = "#3fa7d6"; g.fillRect(0, 300, W, 130);
    g.fillStyle = "#63bfe6"; g.fillRect(0, 300, W, 26);
    g.fillStyle = "#f3dfa2"; g.beginPath(); g.moveTo(0, 420); g.quadraticCurveTo(200, 395, 400, 418); g.quadraticCurveTo(620, 445, W, 405); g.lineTo(W, H); g.lineTo(0, H); g.fill();
    g.strokeStyle = "rgba(255,255,255,0.8)"; g.lineWidth = 5; g.beginPath(); g.moveTo(0, 420); g.quadraticCurveTo(200, 395, 400, 418); g.quadraticCurveTo(620, 445, W, 405); g.stroke();
  } else if (bg === "desert") {
    g.fillStyle = grad([[0, "#ffcf8a"], [0.7, "#ffeccb"]]); g.fillRect(0, 0, W, H);
    g.fillStyle = "#eec27c"; g.beginPath(); g.moveTo(0, 430); g.quadraticCurveTo(180, 340, 380, 420); g.quadraticCurveTo(560, 480, W, 380); g.lineTo(W, H); g.lineTo(0, H); g.fill();
    g.fillStyle = "#dca85a"; g.beginPath(); g.moveTo(0, 520); g.quadraticCurveTo(260, 440, 470, 510); g.quadraticCurveTo(650, 560, W, 490); g.lineTo(W, H); g.lineTo(0, H); g.fill();
    g.strokeStyle = "#4f9a5b"; g.lineWidth = 16; g.lineCap = "round"; g.beginPath(); g.moveTo(690, 470); g.lineTo(690, 380); g.moveTo(690, 430); g.lineTo(665, 430); g.lineTo(665, 405); g.moveTo(690, 415); g.lineTo(715, 415); g.lineTo(715, 392); g.stroke(); g.lineCap = "butt";
  } else if (bg === "snow") {
    g.fillStyle = grad([[0, "#bfdcf7"], [0.7, "#eef7ff"]]); g.fillRect(0, 0, W, H);
    g.fillStyle = "#e3eefb"; g.beginPath(); g.moveTo(0, 450); g.quadraticCurveTo(220, 370, 430, 440); g.quadraticCurveTo(620, 500, W, 420); g.lineTo(W, H); g.lineTo(0, H); g.fill();
    g.fillStyle = "#ffffff"; g.beginPath(); g.moveTo(0, 520); g.quadraticCurveTo(250, 470, 480, 525); g.quadraticCurveTo(660, 560, W, 505); g.lineTo(W, H); g.lineTo(0, H); g.fill();
    stars(g, 60, 99);
  } else if (bg === "forest") {
    g.fillStyle = grad([[0, "#bfe6d3"], [0.8, "#eef9f1"]]); g.fillRect(0, 0, W, H);
    const tree = (x, base, h, c) => { g.fillStyle = "#6b4a2b"; g.fillRect(x - 6, base - 14, 12, 26); g.fillStyle = c; for (let k = 0; k < 3; k += 1) { const top = base - h + k * h * 0.26, half = h * (0.2 + k * 0.08); g.beginPath(); g.moveTo(x, top); g.lineTo(x + half, top + h * 0.42); g.lineTo(x - half, top + h * 0.42); g.fill(); } };
    [[70, 150], [190, 190], [330, 160], [470, 200], [610, 165], [735, 185]].forEach(([x, h]) => tree(x, 470, h, "#3f8f5e"));
    g.fillStyle = "#79c56a"; g.beginPath(); g.moveTo(0, 480); g.quadraticCurveTo(300, 450, 520, 482); g.quadraticCurveTo(680, 505, W, 470); g.lineTo(W, H); g.lineTo(0, H); g.fill();
    [[130, 130], [400, 120], [680, 135]].forEach(([x, h]) => tree(x, 560, h, "#2f7a4c"));
  } else if (bg === "mountains") {
    g.fillStyle = grad([[0, "#9fd0ff"], [0.7, "#e4f3ff"]]); g.fillRect(0, 0, W, H);
    const peak = (x, top, half, c) => { g.fillStyle = c; g.beginPath(); g.moveTo(x, top); g.lineTo(x + half, 480); g.lineTo(x - half, 480); g.fill(); g.fillStyle = "#ffffff"; g.beginPath(); g.moveTo(x, top); g.lineTo(x + half * 0.24, top + (480 - top) * 0.24); g.lineTo(x + half * 0.08, top + (480 - top) * 0.19); g.lineTo(x - half * 0.06, top + (480 - top) * 0.26); g.lineTo(x - half * 0.24, top + (480 - top) * 0.24); g.fill(); };
    peak(190, 170, 250, "#8094b8"); peak(600, 140, 280, "#8a9cc0"); peak(400, 220, 230, "#6f84ab");
    g.fillStyle = "#7ccf6b"; g.beginPath(); g.moveTo(0, 480); g.quadraticCurveTo(260, 455, 480, 485); g.quadraticCurveTo(660, 508, W, 470); g.lineTo(W, H); g.lineTo(0, H); g.fill();
  } else if (bg === "road") {
    g.fillStyle = grad([[0, "#8fd3ff"], [0.6, "#dff4ff"]]); g.fillRect(0, 0, W, H);
    g.fillStyle = "#7ccf6b"; g.fillRect(0, 360, W, H - 360);
    g.fillStyle = "#5a5f6b"; g.fillRect(0, 420, W, 120);
    g.fillStyle = "#f4f4f4"; for (let x = 20; x < W; x += 110) g.fillRect(x, 475, 60, 8);
  } else if (bg === "city") {
    g.fillStyle = grad([[0, "#9cc4ff"], [0.75, "#e9f2ff"]]); g.fillRect(0, 0, W, H);
    let a = 5; const r = () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; };
    for (let x = 0; x < W; ) { const w = 60 + Math.floor(r() * 60), h = 150 + Math.floor(r() * 220); g.fillStyle = ["#7c8aa8", "#6a7896", "#8b97b3"][Math.floor(r() * 3)]; g.fillRect(x, 500 - h, w - 6, h); g.fillStyle = "rgba(255,244,190,0.85)"; for (let wy = 500 - h + 16; wy < 480; wy += 30) for (let wx = x + 10; wx < x + w - 22; wx += 22) if (r() < 0.6) g.fillRect(wx, wy, 10, 14); x += w; }
    g.fillStyle = "#5a5f6b"; g.fillRect(0, 500, W, 100);
    g.fillStyle = "#f4f4f4"; for (let x = 20; x < W; x += 110) g.fillRect(x, 546, 60, 8);
  } else if (bg === "sunset") {
    g.fillStyle = grad([[0, "#3b2a6b"], [0.45, "#d9577a"], [0.75, "#ffb35c"]]); g.fillRect(0, 0, W, H);
    g.fillStyle = "#ffe08a"; g.beginPath(); g.arc(400, 470, 80, Math.PI, 0); g.fill();
    g.fillStyle = "#2a1f45"; g.beginPath(); g.moveTo(0, 470); g.quadraticCurveTo(220, 440, 420, 470); g.quadraticCurveTo(640, 498, W, 462); g.lineTo(W, H); g.lineTo(0, H); g.fill();
  } else { g.fillStyle = "#fffdf6"; g.fillRect(0, 0, W, H); }
}

// a background is painted once and kept (the last few used), so playing does not redraw it every frame
const bgKept = new Map();
function putBg(g, bg) {
  let c = bgKept.get(bg);
  if (!c) {
    c = document.createElement("canvas"); c.width = W * 2; c.height = H * 2;
    const q = c.getContext("2d"); q.scale(2, 2); drawBg(q, bg);
    bgKept.set(bg, c);
    if (bgKept.size > 4) bgKept.delete(bgKept.keys().next().value);
  }
  g.drawImage(c, 0, 0, W, H);
}

// ---------- the picture on screen ----------
function render(t = null) {
  ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
  if (scene()) {
    const playing = ui.state === "play";
    putBg(ctx, data.scene.bg);
    data.scene.things.forEach((th, i) => { if (ui.state === "draw" && i === ui.edit) return; drawThing(th, pose(th, playing ? t : null, i)); });
    if (ui.state === "draw") ctx.drawImage(A.cv, 0, 0, W, H);
    const th = data.scene.things[ui.sel];
    if (th && !playing && ui.state !== "draw" && !ui.clean) {
      const light = DARK.has(data.scene.bg);
      ctx.save(); ctx.lineWidth = 2.5; ctx.setLineDash([8, 6]); ctx.strokeStyle = light ? "#ffd15a" : "#cf9410";
      if (th.move === "path" && th.path && ui.state !== "path") { ctx.beginPath(); ctx.moveTo(th.path[0], th.path[1]); for (let i = 2; i < th.path.length; i += 2) ctx.lineTo(th.path[i], th.path[i + 1]); ctx.stroke(); }
      const { b } = layer(th); ctx.setLineDash([]); ctx.strokeRect(th.x + b.x0 - 6, th.y + b.y0 - 6, b.w + 12, b.h + 12);
      ctx.restore();
    }
    if (ui.state === "path" && ui.pathPts) { ctx.save(); ctx.lineWidth = 5; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.setLineDash([2, 12]); ctx.strokeStyle = "#f5a623"; ctx.beginPath(); ctx.moveTo(ui.pathPts[0], ui.pathPts[1]); for (let i = 2; i < ui.pathPts.length; i += 2) ctx.lineTo(ui.pathPts[i], ui.pathPts[i + 1]); ctx.stroke(); ctx.restore(); }
  } else {
    putBg(ctx, bgOf(ui.frame));
    if (ui.state === "play") drawBook();
    else {
      if (data.flip.onion && ui.frame > 0 && !ui.clean) { ctx.globalAlpha = 0.22; ctx.drawImage(B.cv, 0, 0, W, H); ctx.globalAlpha = 1; }
      ctx.drawImage(A.cv, 0, 0, W, H);
    }
  }
}
function fit() { SCALE = saverOn() ? 1 : 2; cv.width = W * SCALE; cv.height = H * SCALE; render(); }
window.addEventListener("z210:saver", fit);
window.addEventListener("pagehide", () => stopTune());
window.addEventListener("z210:audio-reset", () => { stopTune(); if (ui.state === "play") startMusic(); }); // the phone's audio was restarted (sound.js)

// ---------- the sound of a page flicking over: a short hiss of paper, brighter when the pages go by fast ----------
let paper = null;
function flick(quick) {
  if (data.muted) return;
  const ac = window.z210Audio && window.z210Audio.get();
  if (!ac) return;
  if (!paper || paper.sampleRate !== ac.sampleRate) { paper = ac.createBuffer(1, Math.floor(ac.sampleRate * 0.25), ac.sampleRate); const d = paper.getChannelData(0); for (let i = 0; i < d.length; i += 1) d[i] = Math.random() * 2 - 1; }
  const t = ac.currentTime, len = quick ? 0.07 : 0.16, src = ac.createBufferSource(), bp = ac.createBiquadFilter(), g = ac.createGain();
  src.buffer = paper; src.playbackRate.value = 0.9 + Math.random() * 0.25; // never quite the same twice
  bp.type = "bandpass"; bp.Q.value = 0.8; bp.frequency.setValueAtTime(quick ? 3400 : 2600, t); bp.frequency.exponentialRampToValueAtTime(900, t + len); // the pitch falls as the page lands
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(quick ? 0.1 : 0.16, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
  src.connect(bp).connect(g).connect(ac.destination); src.start(t); src.stop(t + len + 0.02);
  if (!quick) { const o = ac.createOscillator(), og = ac.createGain(); o.frequency.setValueAtTime(190, t + len * 0.75); o.frequency.exponentialRampToValueAtTime(90, t + len + 0.05); og.gain.setValueAtTime(0.0001, t + len * 0.75); og.gain.exponentialRampToValueAtTime(0.05, t + len * 0.8); og.gain.exponentialRampToValueAtTime(0.0001, t + len + 0.06); o.connect(og).connect(ac.destination); o.start(t + len * 0.75); o.stop(t + len + 0.08); } // a soft pat as it lands
}

// ---------- background music (music.js): the scene and the flipbook each remember their own tune, which plays while they play ----------
const work = () => (scene() ? data.scene : data.flip);
function startMusic() {
  const id = work().music;
  if (data.muted || !id || id === "none") { stopTune(); return; }
  playTune(id, window.z210Audio && window.z210Audio.get(), 0.5);
}

// ---------- the flipbook as a real book: whole pages (background and drawing) that turn over ----------
let cur = A, oth = B; // the page showing, and the page being turned to
function wholePage(L, n) { paintLayer(C, data.flip.frames[n]); L.g.clearRect(0, 0, W, H); putBg(L.g, bgOf(n)); L.g.drawImage(C.cv, 0, 0, W, H); }
const calm = () => saverOn() || matchMedia("(prefers-reduced-motion: reduce)").matches;
/** Turn to page n. Forward: the page lifts at its right edge and folds over to the binding. Back: it comes back down. */
function endTurn() { // the turn in progress lands (or, if it was let go too early, falls back)
  const tn = ui.turn;
  if (!tn) return;
  if (!tn.cancel) { [cur, oth] = [oth, cur]; if (tn.to !== undefined) ui.page = tn.to; }
  ui.turn = null; ui.landed = performance.now();
  if ($("thumb")) $("thumb").value = ui.page;
}
function turnTo(n, forward, ms) {
  endTurn(); // a turn already under way simply finishes
  if (n === ui.page) return;
  wholePage(oth, n);
  flick(ms < 150);
  ui.page = n; ui.lastTurn = performance.now();
  if ($("thumb") && ui.auto) $("thumb").value = n; // (left alone while a thumb is on the slider itself)
  if (calm() || ms <= 0) { [cur, oth] = [oth, cur]; ui.landed = performance.now(); render(); return; } // Battery saver and reduced motion: just swap pages
  ui.turn = { forward, t0: performance.now(), ms };
}
// turning a page by hand: the page follows the finger, and is let go to land or to fall back
function handTurn(forward) {
  const to = ui.page + (forward ? 1 : -1);
  if (to < 0 || to >= data.flip.frames.length) return false;
  endTurn();
  wholePage(oth, to);
  ui.turn = { forward, to, hand: true, p: 0 };
  return true;
}
function letGo(fast) {
  const tn = ui.turn;
  if (!tn || !tn.hand) return;
  tn.hand = false; tn.settle = true; tn.p0 = tn.p; tn.cancel = tn.p < 0.3 && !fast; tn.t0 = performance.now();
  tn.ms = 90 + 260 * (tn.cancel ? tn.p0 : 1 - tn.p0);
  if (!tn.cancel) flick(false);
}
function drawBook() {
  const tn = ui.turn;
  if (!tn) { ctx.drawImage(cur.cv, 0, 0, W, H); return; }
  let e, done = false; // e: how far the page has turned, 0 to 1
  if (tn.hand) e = tn.p;
  else { const u = Math.min(1, (performance.now() - tn.t0) / tn.ms); done = u >= 1; e = tn.settle ? (tn.cancel ? tn.p0 * (1 - u) : tn.p0 + (1 - tn.p0) * u) : u * u * (3 - 2 * u); }
  const under = tn.forward ? oth : cur, over = tn.forward ? cur : oth, k = tn.forward ? 1 - e : e; // k: how wide the turning page looks
  ctx.drawImage(under.cv, 0, 0, W, H);
  const lift = Math.sin(Math.PI * k), edge = W * k;
  const sh = ctx.createLinearGradient(edge, 0, edge + 60, 0); sh.addColorStop(0, `rgba(0,0,0,${0.3 * lift})`); sh.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = sh; ctx.fillRect(edge, 0, 60, H); // the turning page's shadow on the page beneath
  ctx.save();
  ctx.transform(k, 0, 0, 1 + 0.035 * lift, 0, -H * 0.0175 * lift); // hinged at the binding on the left
  ctx.drawImage(over.cv, 0, 0, W, H);
  const dim = ctx.createLinearGradient(0, 0, W, 0); dim.addColorStop(0, `rgba(0,0,0,${0.05 * lift})`); dim.addColorStop(1, `rgba(0,0,0,${0.38 * (1 - k)})`);
  ctx.fillStyle = dim; ctx.fillRect(0, 0, W, H);
  ctx.restore();
  if (done) endTurn();
}

// ---------- playing ----------
function play() {
  if (ui.state === "draw" || ui.state === "path") return;
  if (scene() && !data.scene.things.length) { note("Draw something first, then press Play."); return; }
  ui.state = "play"; ui.t0 = performance.now();
  startMusic();
  if (!scene()) { cur = A; oth = B; ui.turn = null; ui.auto = true; ui.want = null; ui.page = 0; ui.lastTurn = performance.now(); wholePage(cur, 0); $("thumb").max = data.flip.frames.length - 1; $("thumb").value = 0; }
  let skip = false;
  const tick = (now) => {
    if (ui.state !== "play") return;
    ui.raf = requestAnimationFrame(tick);
    if (scene()) { skip = !skip; if (saverOn() && skip) return; render((now - ui.t0) / 1000); return; } // Battery saver: half the frames
    const gap = 1000 / data.flip.fps;
    if (ui.auto && !ui.scrub && now - ui.lastTurn >= gap) turnTo((ui.page + 1) % data.flip.frames.length, true, Math.min(320, gap * 0.75));
    // the thumb slider: one page at a time towards where the thumb is, and every page rests in view for a moment
    if (!ui.auto && !ui.turn && ui.want !== null && ui.want !== ui.page && now - ui.landed >= (calm() ? 600 : 380)) turnTo(ui.page + Math.sign(ui.want - ui.page), ui.want > ui.page, 280);
    if (ui.turn) render();
  };
  ui.raf = requestAnimationFrame(tick);
  paint(); render();
}
function stop() {
  if (ui.state !== "play") return;
  cancelAnimationFrame(ui.raf); ui.state = "idle"; ui.turn = null; ui.scrub = null;
  stopTune();
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
  if (playing && !scene()) { row = btn("stop", "⏹ Stop") + btn("auto", ui.auto ? "⏸ Pause" : "▶ Flip by itself", "ghost"); hint = "Drag a page across to turn it yourself: left to go on, right to go back. Or use the thumb slider."; }
  else if (playing) { row = btn("stop", "⏹ Stop"); hint = "Playing. Press Stop to change things."; }
  else if (!scene()) { row = btn("addFrame", "＋ New page", "ghost") + btn("copyFrame", "⧉ Copy page", "ghost") + btn("delFrame", "🗑 Delete page", "ghost") + btn("play", "▶ Play", "", data.flip.frames.length < 2); hint = data.flip.frames.length < 2 ? "Draw the first page, then tap New page and draw it again, a little different." : `Page ${ui.frame + 1} of ${data.flip.frames.length}. Change each page a little, then press Play.`; }
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
  $("thumbRow").hidden = scene() || !playing;
  $("stage").classList.toggle("book", !scene());
  // the stack of page edges under the book gets thicker as pages are added
  const thick = scene() ? 0 : Math.min(7, 1 + Math.floor(data.flip.frames.length / 3));
  cv.style.boxShadow = scene() ? "" : Array.from({ length: thick }, (_, i) => `${(i + 1) * 3}px ${(i + 1) * 3}px 0 ${i % 2 ? "#cfc8b6" : "#ebe5d5"}`).join(", ") + `, ${thick * 3 + 6}px ${thick * 3 + 10}px 22px rgba(0,0,0,0.35)`;
  document.querySelectorAll("#palette .sw").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.c === data.color && !ui.erase)));
  press("sizes", "size", data.size);
  document.querySelectorAll("#penKind .g-chip").forEach((b) => b.setAttribute("aria-pressed", String((b.dataset.erase === "1") === ui.erase)));
  press("bgs", "bg", data.scene.bg);
  press("fbgs", "bg", bgOf(ui.frame));
  press("fps", "fps", data.flip.fps);
  const tuneId = TUNES.some((t) => t.id === work().music) ? work().music : "none";
  document.querySelectorAll(".tunepick").forEach((el) => { el.value = tuneId; });
  document.querySelectorAll(".listenbtn").forEach((el) => { el.disabled = tuneId === "none"; el.textContent = playingTune() && ui.state !== "play" ? "⏹ Stop" : "🎧 Listen"; });
  $("mute").textContent = data.muted ? "🔇 Sound off" : "🔊 Sound on"; $("mute").setAttribute("aria-pressed", String(!data.muted));
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
  if ((ui.state === "play" && scene()) || (e.pointerType === "mouse" && e.button !== 0)) return;
  e.preventDefault();
  try { cv.setPointerCapture(e.pointerId); } catch (err) { /* older browsers */ }
  const [x, y] = at(e);
  if (ui.state === "play") { endTurn(); ui.scrub = { x, lastX: x, lastT: performance.now(), v: 0 }; ui.want = null; if (ui.auto) { ui.auto = false; paint(); } return; } // take hold of the book
  if (drawing()) { ui.live = { c: data.color, w: ui.erase ? Math.max(18, data.size * 1.8) : data.size, e: ui.erase ? 1 : 0, p: [x, y] }; strokeOn(A.g, ui.live); render(); }
  else if (ui.state === "path") { ui.pathPts = [x, y]; render(); }
  else if (scene()) { const i = hit(x, y); if (i !== ui.sel) { ui.sel = i; paint(); } if (i >= 0) ui.drag = { x, y }; render(); }
});
cv.addEventListener("pointermove", (e) => {
  if (!ui.live && !ui.pathPts && !ui.drag && !ui.scrub) return;
  const [x, y] = at(e);
  if (ui.scrub) { // the page follows the finger: drag left to turn on, right to turn back; half the book's width is a whole turn
    const sc = ui.scrub, dx = sc.x - x, now = performance.now();
    if (now > sc.lastT) sc.v = (sc.lastX - x) / (now - sc.lastT);
    sc.lastX = x; sc.lastT = now;
    if (ui.turn && ui.turn.hand && (ui.turn.forward ? dx : -dx) < -10) { ui.turn.cancel = true; endTurn(); } // changed direction: put that page down
    if (!ui.turn && Math.abs(dx) > 10) handTurn(dx > 0);
    const tn = ui.turn;
    if (tn && tn.hand) tn.p = Math.max(0, Math.min(1, ((tn.forward ? dx : -dx) - 10) / (W * 0.5)));
    return;
  }
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
  if (ui.scrub) { const tn = ui.turn; letGo(!!tn && tn.hand && (tn.forward ? ui.scrub.v : -ui.scrub.v) > 0.5 && performance.now() - ui.scrub.lastT < 120); ui.scrub = null; return; } // a quick flick finishes the turn too
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
  stopTune(); // a tune being tried stops when drawing starts (its Stop button is about to be hidden)
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
  else if (act === "auto") { ui.auto = !ui.auto; ui.want = null; ui.lastTurn = performance.now(); paint(); }
  else if (act === "stop") stop();
  else if (act === "addFrame") addFrame(false);
  else if (act === "copyFrame") addFrame(true);
  else if (act === "delFrame") delFrame();
});
const sel = () => data.scene.things[ui.sel];
$("moves").addEventListener("click", (e) => {
  const b = e.target.closest(".g-chip"), th = sel();
  if (!b || !th) return;
  if (b.dataset.move === "path") { stopTune(); ui.state = "path"; ui.pathPts = null; note(""); paint(); render(); return; }
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
$("exScene").addEventListener("click", () => { if (data.scene.things.length && !confirm("Swap your scene for the example? Your drawings here will be removed.")) return; data.scene = { ...exampleScene(), music: data.scene.music }; ui.sel = -1; save(); paint(); render(); note("Press Play! Then tap a drawing to see how it was set up."); });
$("newScene").addEventListener("click", () => { if (data.scene.things.length && !confirm("Clear this scene and start again?")) return; data.scene = { bg: data.scene.bg, things: [], music: data.scene.music }; ui.sel = -1; save(); paint(); render(); });

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
  g.setTransform(c.width / W, 0, 0, c.width / W, 0, 0);
  paintLayer(C, data.flip.frames[i]); // on its own layer first, so the eraser shows the background and not a hole
  putBg(g, bgOf(i)); g.drawImage(C.cv, 0, 0, W, H);
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
  data.flip.bgs.splice(ui.frame + 1, 0, bgOf(ui.frame)); // a new page starts with the background of the page before it
  ui.frame += 1; note(""); save(); syncFlip(); paint(); render();
}
$("strip").addEventListener("click", (e) => { const b = e.target.closest(".fr"); if (b) { ui.frame = Number(b.dataset.f); syncFlip(); paint(); render(); } });
// deleting a page that has a drawing on it can be undone straight away
function delFrame() {
  const i = ui.frame, gone = data.flip.frames[i], goneBg = bgOf(i), only = data.flip.frames.length === 1;
  if (only) data.flip.frames[0] = []; else { data.flip.frames.splice(i, 1); data.flip.bgs.splice(i, 1); }
  save(); syncFlip(); paint(); render();
  if (!gone.length) { note(only ? "" : `Page ${i + 1} deleted.`); return; }
  $("note").innerHTML = `${only ? "Page cleared." : `Page ${i + 1} deleted.`} <button class="g-btn ghost" id="undoDel">↶ Put it back</button>`;
  $("undoDel").addEventListener("click", () => {
    if (only) data.flip.frames[0] = gone;
    else { if (data.flip.frames.length >= MAX_FRAMES) { note(`There is no room: the book already has ${MAX_FRAMES} pages.`); return; } const at2 = Math.min(i, data.flip.frames.length); data.flip.frames.splice(at2, 0, gone); data.flip.bgs.splice(at2, 0, goneBg); }
    ui.frame = only ? 0 : Math.min(i, data.flip.frames.length - 1);
    note("Page put back."); save(); syncFlip(); paint(); render();
  });
}
$("fbgs").addEventListener("click", (e) => { const b = e.target.closest(".g-chip"); if (b) { data.flip.bgs[ui.frame] = b.dataset.bg; note(""); save(); thumb(ui.frame); paint(); render(); } });
$("bgAll").addEventListener("click", () => { data.flip.bgs = data.flip.frames.map(() => bgOf(ui.frame)); save(); strip(); paint(); render(); note(data.flip.frames.length > 1 ? `All ${data.flip.frames.length} pages now have this background.` : ""); });
$("thumb").addEventListener("input", () => { if (ui.state !== "play") return; if (ui.auto) { ui.auto = false; paint(); } ui.want = Number($("thumb").value); });
$("fps").addEventListener("click", (e) => { const b = e.target.closest(".g-chip"); if (b) { data.flip.fps = Number(b.dataset.fps); save(); paint(); } });
$("onion").addEventListener("change", () => { data.flip.onion = $("onion").checked; save(); render(); });
$("exFlip").addEventListener("click", () => { if (data.flip.frames.some((f) => f.length) && !confirm("Swap your flipbook for the example? Your pages here will be removed.")) return; data.flip = { ...exampleFlip(), music: data.flip.music }; evenBgs(); ui.frame = 0; save(); syncFlip(); paint(); render(); note("Press Play! Then look through the pages to see how each one changes."); });
$("newFlip").addEventListener("click", () => { if (data.flip.frames.some((f) => f.length) && !confirm("Clear this flipbook and start again?")) return; data.flip = { frames: [[]], fps: data.flip.fps, onion: data.flip.onion, bgs: [bgOf(ui.frame)], music: data.flip.music }; ui.frame = 0; save(); syncFlip(); paint(); render(); });

$("mute").addEventListener("click", () => { data.muted = !data.muted; save(); if (data.muted) stopTune(); else if (ui.state === "play") startMusic(); else flick(false); paint(); });
const tuneMenu = `<option value="none">No music</option>` + [...new Set(TUNES.map((t) => t.group))].map((g) => `<optgroup label="${g}">${TUNES.filter((t) => t.group === g).map((t) => `<option value="${t.id}">${t.emoji} ${t.name}</option>`).join("")}</optgroup>`).join("");
// "Listen" tries the tune without playing the animation
function listen(on) {
  const id = work().music;
  if (!on || !id || id === "none") { stopTune(); paint(); return; }
  if (data.muted) { note("Sound is off. Tap “Sound off” at the top to turn it on."); return; }
  playTune(id, window.z210Audio && window.z210Audio.get(), 0.5); paint();
}
document.querySelectorAll(".tunepick").forEach((el) => {
  el.innerHTML = tuneMenu;
  el.addEventListener("change", () => {
    work().music = el.value; save();
    if (playingTune()) { if (ui.state === "play") startMusic(); else listen(true); } // already sounding: switch to the new tune
    paint();
  });
});
document.querySelectorAll(".listenbtn").forEach((el) => el.addEventListener("click", () => listen(!playingTune())));
$("modes").addEventListener("click", (e) => {
  const b = e.target.closest(".g-chip");
  if (!b || b.dataset.mode === data.mode) return;
  stop(); stopTune();
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
chips("moves", MOVES, "move"); chips("acts", ACTS, "act"); chips("speeds", SPEEDS, "speed"); chips("bgs", BGS, "bg"); chips("fbgs", BGS, "bg"); chips("fps", FPS, "fps");
if (!scene()) syncFlip();
fit();
paint();
window.__da = { data, ui, play, stop, render };
