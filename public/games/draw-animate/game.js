// Draw & Animate. Two ways to animate what you draw:
//  - "Bring it to life": each drawing is a thing with its own movement (engine.js works out where it is at any moment)
//  - "Flipbook": pages drawn one by one and flipped through
// Drawings are kept as strokes (lists of points), so they stay small enough to save on the device.
import { canSharePhotos, onTouchDevice, toPhotos, download } from "../../assets/save-image.js";
import { TUNES, playTune, stopTune, playingTune } from "./music.js";
import { STICKERS, stickerLife, stickerMoves } from "./stickers.js";
import { PEOPLE, CHARACTERS, ANIMALS, SKINS, HAIRS, drawPerson } from "./people.js";
import { W, H, MOVES, ACTS, SPEEDS, SHAPES, bbox, makeThing, stageStrokes, shift, thin, pose, poseTogether, between, tweenMoves, pathLength, shapePoints, fillTarget, stickersUnder, scaled, turned, itemAt, JOINTS, jointAngle, jointReach, strokeNear, hingeOf, nearestOn, bend, oldJoints, cutByLoop, inside, clusters, exampleScene, exampleFlip } from "./engine.js";

const $ = (id) => document.getElementById(id);
const store = {
  get(key, fallback) { try { const raw = localStorage.getItem(key); return raw === null ? fallback : JSON.parse(raw); } catch (err) { return fallback; } },
  set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch (err) { return false; } },
};
const KEY = "zone210_drawanim";
const data = { mode: "scene", color: "#1f2430", size: 10, scene: { bg: "paper", things: [] }, flip: { frames: [[]], fps: 6, onion: true }, ...store.get(KEY, {}) };
(data.scene.things || []).forEach((th) => oldJoints(th.s || [])); // a part used to have one elbow at most
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
const SIZES = [[4, "Small"], [10, "Medium"], [22, "Big"], [44, "Huge"]];
const STICKER_SIZE = { 4: 46, 10: 72, 22: 112, 44: 170 }; // how tall a sticker is at each size button
const PERSON_SIZE = { 4: 80, 10: 130, 22: 200, 44: 300 }; // and a hand-drawn person
const TOOLS = [["pen", "✏️ Pen"], ["shape", "🔷 Shapes"], ["fill", "🪣 Fill"], ["stamp", "😀 Stickers"], ["text", "🔤 Text"], ["move", "✋ Move"], ["joint", "🦴 Joints"], ["erase", "🧽 Eraser"]];
const SHAPE_ICON = { line: "╱", rect: "▭", oval: "◯", tri: "△", diamond: "◇", star: "☆", heart: "♡" };
const BGS = [["paper", "Paper"], ["grid", "Squared paper"], ["lined", "Lined paper"], ["chalk", "Chalkboard"], ["sky", "Sky"], ["meadow", "Meadow"], ["rainbow", "Rainbow"], ["rainy", "Rainy day"],
  ["park", "Park"], ["farm", "Farm"], ["forest", "Forest"], ["jungle", "Jungle"], ["mountains", "Mountains"], ["volcano", "Volcano"], ["desert", "Desert"], ["snow", "Snow"], ["arctic", "Arctic"],
  ["beach", "Beach"], ["island", "Island"], ["sea", "Under the sea"], ["cave", "Cave"], ["road", "Road"], ["city", "City"], ["castle", "Castle"], ["pitch", "Sports pitch"], ["stage", "Stage"],
  ["bedroom", "Bedroom"], ["candy", "Candy land"], ["sunset", "Sunset"], ["night", "Night"], ["moon", "Moon"], ["space", "Space"]];
const DARK = new Set(["space", "night", "chalk", "sunset", "cave", "moon", "stage", "volcano", "jungle"]); // backgrounds where the outline round a chosen drawing needs to be light
const FPS = [[2, "Slow"], [6, "Medium"], [10, "Fast"]];
const MAX_THINGS = 24, MAX_FRAMES = 60;

const cv = $("cv"), ctx = cv.getContext("2d");
const saverOn = () => !!(window.z210Saver && window.z210Saver.on);
let SCALE = 2;
// state: "idle" | "draw" (drawing a thing) | "path" (tracing a path) | "play"
const ui = { state: "idle", sel: -1, edit: -1, draft: [], frame: 0, tool: "pen", shape: "rect", set: "drawn", sticker: "🧍", person: "stand1", flip: false, from: null, live: null, pick: [], all: false, grab: null, drag: null, pathPts: null, t0: 0, raf: 0, clean: false,
  page: 0, turn: null, auto: true, lastTurn: 0, scrub: null, want: null, landed: 0 }; // want: the page a finger or the slider is heading for // the flipbook being flipped: the page showing, the page turn in progress, whether it flips by itself
const scene = () => data.mode === "scene";
const drawing = () => (scene() ? ui.state === "draw" : ui.state === "idle");
const strokes = () => (scene() ? ui.draft : data.flip.frames[ui.frame]);
const note = (text) => { $("note").textContent = text; };

// ---------- drawing strokes ----------
const EMOJI = '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
function trace(g, p, sharp) {
  g.beginPath(); g.moveTo(p[0], p[1]);
  if (sharp) { for (let i = 2; i < p.length; i += 2) g.lineTo(p[i], p[i + 1]); return; }
  for (let i = 2; i < p.length - 2; i += 2) g.quadraticCurveTo(p[i], p[i + 1], (p[i] + p[i + 2]) / 2, (p[i + 1] + p[i + 3]) / 2);
  g.lineTo(p[p.length - 2], p[p.length - 1]);
}
// ---------- text ----------
// Words on the page: { tx: the words (lines split by \n), f: which font, c: colour, w: letter size, p: [x, y] (the middle), tw: measured width }.
// The fonts are the two that come with the site and ones every phone and computer already has, so nothing is downloaded.
const FONTS = [
  ["round", "Round", '700 SIZE "Fredoka", "Nunito", sans-serif'],
  ["plain", "Plain", '700 SIZE "Nunito", "Helvetica Neue", Arial, sans-serif'],
  ["book", "Storybook", 'SIZE Georgia, "Times New Roman", serif'],
  ["hand", "Handwriting", 'SIZE "Comic Sans MS", "Chalkboard SE", "Comic Neue", cursive'],
  ["script", "Curly", 'SIZE "Snell Roundhand", "Brush Script MT", "Segoe Script", "Lucida Handwriting", cursive'],
  ["poster", "Poster", 'SIZE Impact, "Arial Black", "Haettenschweiler", sans-serif'],
  ["marker", "Marker", 'SIZE "Marker Felt", "Segoe Print", "Chalkduster", fantasy'],
  ["type", "Typewriter", 'SIZE "Courier New", Courier, monospace'],
];
const TEXT_SIZE = { 4: 26, 10: 42, 22: 66, 44: 100 }; // how tall the letters are at each size button
const fontOf = (s) => (FONTS.find((f) => f[0] === s.f) || FONTS[0])[2].replace("SIZE", `${s.w}px`);
/** Measures a piece of text, so its box, the eraser and the Move tool know how wide it is. */
function fitText(s) { ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.font = fontOf(s); s.tw = Math.round(Math.max(...s.tx.split("\n").map((l) => ctx.measureText(l).width))); ctx.restore(); return s; }
function strokeOn(g, s, live = null) {
  const p = s.p;
  if (s.tx) { // words
    const lines = s.tx.split("\n");
    g.save(); g.translate(p[0], p[1]); if (s.r) g.rotate(s.r);
    g.font = fontOf(s); g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = s.c;
    lines.forEach((l, i) => g.fillText(l, 0, (i - (lines.length - 1) / 2) * s.w * 1.2 + s.w * 0.04));
    g.restore(); return;
  }
  if (s.fig) { g.save(); g.translate(p[0], p[1]); if (s.m) g.scale(-1, 1); if (s.r) g.rotate(s.r); drawPerson(g, s, s.w, live); g.restore(); return; } // a hand-drawn person
  if (s.ch) { // a sticker
    g.save(); g.translate(p[0], p[1]); if (s.m) g.scale(-1, 1); if (s.r) g.rotate(s.r);
    const life = live && stickerLife(s.ch, live); // while playing, the sticker waddles, flaps, sways… by itself
    if (life) { const foot = life.base ? s.w * 0.5 : 0; g.translate(life.x * s.w, life.y * s.w + foot); g.rotate(life.r); g.scale(life.sx, life.sy); g.translate(0, -foot); }
    g.font = `${s.w}px ${EMOJI}`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = "#000"; g.fillText(s.ch, 0, s.w * 0.07);
    g.restore(); return;
  }
  g.globalCompositeOperation = s.e ? "destination-out" : "source-over";
  g.lineWidth = s.w; g.lineCap = "round"; g.lineJoin = "round";
  if (s.ff && p.length >= 6) { g.fillStyle = s.ff; trace(g, p, s.k); g.closePath(); g.fill(); } // coloured in (the Fill tool)
  g.strokeStyle = g.fillStyle = s.c;
  if (p.length === 2) { g.beginPath(); g.arc(p[0], p[1], s.w / 2, 0, Math.PI * 2); g.fill(); } else { trace(g, p, s.k); g.stroke(); }
  g.globalCompositeOperation = "source-over";
}
// two stage-sized layers: A is what is being drawn (a thing, or the flipbook page); B is the page before, or the page being played
const mkLayer = () => { const c = document.createElement("canvas"); c.width = W * 2; c.height = H * 2; const g = c.getContext("2d"); g.scale(2, 2); return { cv: c, g }; };
const A = mkLayer(), B = mkLayer(), C = mkLayer(); // C is scratch
/** A stroke at one moment of an animation: one with a joint is first swung about its pin. */
function strokeLive(g, s, live) {
  if (!live || !s.j || live.still) { strokeOn(g, s, live); return; }
  g.save(); g.translate(s.j[0], s.j[1]); g.rotate(jointAngle(s, live.t)); g.translate(-s.j[0], -s.j[1]);
  if (!s.jx || !s.jx.length) strokeOn(g, s, live);
  else { // elbows and knees: what lies beyond each one bends again
    const b = bend(s, live.t);
    for (const [x, y, a] of b.turns) { g.translate(x, y); g.rotate(a); g.translate(-x, -y); }
    strokeOn(g, b.turns.length ? s : { ...s, p: b.p }, live);
  }
  g.restore();
}
// In the flipbook each page is the next step: a person, an animal, a sticker or a jointed part takes its next pose
// every time the page turns, eight pages to a stride. So the movement comes from flipping, as in a real flipbook.
const STEP = 1 / (1.4 * 8);
function pageLive(list, L) {
  if (scene() || data.flip.step === false) return null;
  const pages = data.flip.frames, f = pages.indexOf(list);
  if (f < 0) return null;
  const editing = L === A && ui.state !== "play";
  if (editing && ui.tool === "joint") return null; // pins are put in with the drawing at rest
  // legs step only for a figure that is somewhere else on the page before or after: one that stays put just waves or wags
  const per = list.map((s, k) => !!(s.fig || s.ch) && [pages[f - 1], pages[f + 1]].some((o) => o && o[k] && o[k].fig === s.fig && o[k].ch === s.ch && Math.hypot(o[k].p[0] - s.p[0], o[k].p[1] - s.p[1]) > 2));
  return { t: f * STEP, per, still: editing && ui.tool === "move" }; // while things are being moved about, jointed parts stay where their boxes are
}
function paintLayer(L, list, live) {
  if (live === undefined) live = pageLive(list, L);
  L.g.clearRect(0, 0, W, H);
  list.forEach((s, i) => strokeLive(L.g, s, live && live.per ? { t: live.t, go: live.per[i], still: live.still } : live));
}

// each thing is drawn once onto its own small canvas, then that picture is moved, turned and stretched.
// A thing with hand-drawn figures or stickers that move in it is drawn again for every moment of an animation,
// so their limbs move.
const layers = new WeakMap();
function layer(thing, live = null) {
  let L = layers.get(thing);
  if (!L) {
    const figs = thing.s.filter((s) => s.fig || s.j || (s.ch && stickerMoves(s.ch))); // room for a swinging arm or leg, or for a jointed part of a pen drawing
    const pad = 4 + Math.round(Math.max(figs.reduce((m, s) => Math.max(m, s.fig || s.ch ? s.w : 0), 0) * 0.16, thing.s.reduce((m, s) => Math.max(m, jointReach(s)), 0)));
    const b = bbox(thing.s) || { x0: -1, y0: -1, x1: 1, y1: 1, w: 2, h: 2 }, c = document.createElement("canvas");
    c.width = Math.max(2, Math.ceil((b.w + pad * 2) * 2)); c.height = Math.max(2, Math.ceil((b.h + pad * 2) * 2));
    L = { cv: c, g: c.getContext("2d"), b, pad, alive: figs.length > 0, at: undefined };
    layers.set(thing, L);
  }
  const at = L.alive && live ? live.t : null;
  if (L.at !== at) {
    const g = L.g, b = L.b;
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, L.cv.width, L.cv.height);
    g.scale(2, 2); g.translate(L.pad - b.x0, L.pad - b.y0);
    thing.s.forEach((s) => strokeLive(g, s, at === null ? null : live));
    L.at = at;
  }
  return L;
}
function drawThing(thing, p, live = null) {
  const { cv: c, b, pad } = layer(thing, live);
  ctx.save();
  ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.scale(p.sx * p.flip, p.sy);
  ctx.drawImage(c, b.x0 - pad, b.y0 - pad, b.w + pad * 2, b.h + pad * 2);
  ctx.restore();
}
/** What the limbs of the hand-drawn figures in a thing are doing at time t: stepping if the thing travels sideways. */
const limbs = (th, t, i) => ({ t: t * (th.speed || 1) + i * 0.37, go: th.move === "side" || th.move === "circle" || (th.move === "path" && !!th.path && th.path.length >= 4) });

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
  } else if (bg === "lined") {
    g.fillStyle = "#fdfefe"; g.fillRect(0, 0, W, H);
    g.strokeStyle = "#bcd6f0"; g.lineWidth = 1.5; g.beginPath(); for (let y = 60; y < H; y += 40) { g.moveTo(0, y); g.lineTo(W, y); } g.stroke();
    g.strokeStyle = "#f0a3a3"; g.beginPath(); g.moveTo(70, 0); g.lineTo(70, H); g.stroke();
  } else if (bg === "meadow") {
    g.fillStyle = grad([[0, "#8fd3ff"], [0.7, "#e6f6ff"]]); g.fillRect(0, 0, W, H);
    g.fillStyle = "#93d67a"; g.beginPath(); g.moveTo(0, 400); g.quadraticCurveTo(230, 330, 460, 390); g.quadraticCurveTo(640, 430, W, 370); g.lineTo(W, H); g.lineTo(0, H); g.fill();
    g.fillStyle = "#74c463"; g.beginPath(); g.moveTo(0, 470); g.quadraticCurveTo(280, 420, 520, 475); g.quadraticCurveTo(680, 505, W, 455); g.lineTo(W, H); g.lineTo(0, H); g.fill();
    let a = 11; const r = () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; };
    for (let i = 0; i < 46; i += 1) { const x = r() * W, y = 470 + r() * 120; g.fillStyle = ["#ffffff", "#ffd84d", "#ff8fb1", "#c79bff"][Math.floor(r() * 4)]; g.beginPath(); g.arc(x, y, 4 + r() * 3, 0, 7); g.fill(); g.fillStyle = "#f5a623"; g.beginPath(); g.arc(x, y, 1.6, 0, 7); g.fill(); }
  } else if (bg === "rainbow") {
    g.fillStyle = grad([[0, "#9bd8ff"], [0.75, "#e8f7ff"]]); g.fillRect(0, 0, W, H);
    ["#e5484d", "#f5a623", "#f5d90a", "#2fb36d", "#3b82f6", "#5b5bd6", "#8a5ce0"].forEach((c, i) => { g.strokeStyle = c; g.lineWidth = 18; g.beginPath(); g.arc(400, 520, 360 - i * 18, Math.PI, 0); g.stroke(); });
    g.fillStyle = "#7ccf6b"; g.beginPath(); g.moveTo(0, 500); g.quadraticCurveTo(220, 455, 420, 495); g.quadraticCurveTo(640, 535, W, 480); g.lineTo(W, H); g.lineTo(0, H); g.fill();
    g.fillStyle = "#ffffff"; [[70, 470], [730, 455]].forEach(([x, y]) => { [[-34, 8, 30], [0, -8, 38], [36, 8, 30]].forEach(([dx, dy, rr]) => { g.beginPath(); g.arc(x + dx, y + dy, rr, 0, 7); g.fill(); }); });
  } else if (bg === "rainy") {
    g.fillStyle = grad([[0, "#7f8ea3"], [0.7, "#b8c4d3"]]); g.fillRect(0, 0, W, H);
    g.fillStyle = "#66758b"; [[120, 80], [380, 60], [640, 90]].forEach(([x, y]) => { [[-60, 10, 44], [-10, -12, 58], [50, 8, 46]].forEach(([dx, dy, rr]) => { g.beginPath(); g.arc(x + dx, y + dy, rr, 0, 7); g.fill(); }); });
    let a = 3; const r = () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; };
    g.strokeStyle = "rgba(255,255,255,0.45)"; g.lineWidth = 2; g.beginPath(); for (let i = 0; i < 120; i += 1) { const x = r() * W, y = 110 + r() * 380; g.moveTo(x, y); g.lineTo(x - 6, y + 18); } g.stroke();
    g.fillStyle = "#6f8f6a"; g.fillRect(0, 500, W, 100);
    g.fillStyle = "rgba(170,200,225,0.75)"; [[180, 548, 90, 14], [560, 565, 120, 16]].forEach(([x, y, w, h]) => { g.beginPath(); g.ellipse(x, y, w, h, 0, 0, 7); g.fill(); });
  } else if (bg === "park") {
    g.fillStyle = grad([[0, "#8fd3ff"], [0.65, "#e2f5ff"]]); g.fillRect(0, 0, W, H);
    g.fillStyle = "#86cf70"; g.fillRect(0, 380, W, 220);
    g.fillStyle = "#e8d3a2"; g.beginPath(); g.moveTo(300, H); g.quadraticCurveTo(360, 470, 520, 380); g.lineTo(560, 380); g.quadraticCurveTo(440, 480, 440, H); g.fill();
    g.fillStyle = "#6fc3ea"; g.beginPath(); g.ellipse(650, 500, 110, 38, 0, 0, 7); g.fill();
    [[120, 380, 1], [250, 372, 0.8], [700, 376, 0.9]].forEach(([x, y, k]) => { g.fillStyle = "#7a5230"; g.fillRect(x - 9 * k, y - 70 * k, 18 * k, 80 * k); g.fillStyle = "#3f9b57"; [[0, -120, 58], [-36, -90, 42], [36, -90, 42]].forEach(([dx, dy, rr]) => { g.beginPath(); g.arc(x + dx * k, y + dy * k, rr * k, 0, 7); g.fill(); }); });
  } else if (bg === "farm") {
    g.fillStyle = grad([[0, "#8fd3ff"], [0.6, "#e2f5ff"]]); g.fillRect(0, 0, W, H);
    g.fillStyle = "#8fd06f"; g.fillRect(0, 360, W, 240);
    g.fillStyle = "#e9cf63"; for (let i = 0; i < 5; i += 1) { g.beginPath(); g.moveTo(380 + i * 90, 600); g.lineTo(440 + i * 90, 600); g.lineTo(470 + i * 46, 430); g.lineTo(445 + i * 46, 430); g.fill(); }
    g.fillStyle = "#c0392b"; g.fillRect(90, 250, 200, 150); g.beginPath(); g.moveTo(70, 252); g.lineTo(190, 170); g.lineTo(310, 252); g.fill();
    g.fillStyle = "#ffffff"; g.fillRect(160, 320, 60, 80); g.strokeStyle = "#c0392b"; g.lineWidth = 5; g.beginPath(); g.moveTo(160, 320); g.lineTo(220, 400); g.moveTo(220, 320); g.lineTo(160, 400); g.stroke();
    g.strokeStyle = "#8b6a3d"; g.lineWidth = 6; g.beginPath(); g.moveTo(0, 420); g.lineTo(W, 420); g.moveTo(0, 445); g.lineTo(W, 445); for (let x = 20; x < W; x += 70) { g.moveTo(x, 405); g.lineTo(x, 462); } g.stroke();
  } else if (bg === "jungle") {
    g.fillStyle = grad([[0, "#1f6b4a"], [1, "#0f3f2c"]]); g.fillRect(0, 0, W, H);
    g.fillStyle = "rgba(190,255,170,0.12)"; [[150, 70], [420, 50], [650, 80]].forEach(([x, w]) => { g.beginPath(); g.moveTo(x, 0); g.lineTo(x + w, 0); g.lineTo(x + w + 90, 600); g.lineTo(x + 50, 600); g.fill(); });
    const leaf = (x, y, len, ang, c) => { g.save(); g.translate(x, y); g.rotate(ang); g.fillStyle = c; g.beginPath(); g.ellipse(len / 2, 0, len / 2, len / 6, 0, 0, 7); g.fill(); g.restore(); };
    [[0, 90, 230, 0.5], [0, 220, 200, 0.2], [0, 20, 190, 0.9], [W, 100, 230, 2.6], [W, 240, 200, 2.95], [W, 20, 190, 2.25]].forEach(([x, y, l, ang], i) => leaf(x, y, l, ang, i % 2 ? "#2f9a5c" : "#37ad69"));
    g.strokeStyle = "#2b7a4b"; g.lineWidth = 6; g.beginPath(); g.moveTo(300, 0); g.quadraticCurveTo(250, 120, 320, 210); g.moveTo(540, 0); g.quadraticCurveTo(600, 100, 520, 180); g.stroke();
    g.fillStyle = "#1a5a3a"; g.beginPath(); g.moveTo(0, 520); g.quadraticCurveTo(260, 480, 480, 520); g.quadraticCurveTo(660, 548, W, 505); g.lineTo(W, H); g.lineTo(0, H); g.fill();
  } else if (bg === "volcano") {
    g.fillStyle = grad([[0, "#3a1d3f"], [0.5, "#b8433b"], [0.8, "#f4a04a"]]); g.fillRect(0, 0, W, H);
    g.fillStyle = "#3b2b33"; g.beginPath(); g.moveTo(120, 500); g.lineTo(340, 170); g.lineTo(460, 170); g.lineTo(700, 500); g.fill();
    g.fillStyle = "#ff7a1a"; g.beginPath(); g.moveTo(340, 170); g.lineTo(460, 170); g.lineTo(445, 200); g.lineTo(420, 185); g.lineTo(400, 215); g.lineTo(378, 188); g.lineTo(355, 205); g.fill();
    g.strokeStyle = "#ff9a2e"; g.lineWidth = 9; g.lineCap = "round"; g.beginPath(); g.moveTo(385, 200); g.quadraticCurveTo(350, 300, 300, 400); g.moveTo(425, 200); g.quadraticCurveTo(470, 310, 500, 380); g.stroke(); g.lineCap = "butt";
    g.fillStyle = "rgba(90,80,90,0.55)"; [[400, 110, 46], [450, 70, 38], [370, 60, 30]].forEach(([x, y, rr]) => { g.beginPath(); g.arc(x, y, rr, 0, 7); g.fill(); });
    g.fillStyle = "#2a1f26"; g.beginPath(); g.moveTo(0, 500); g.quadraticCurveTo(260, 470, 470, 500); g.quadraticCurveTo(650, 525, W, 485); g.lineTo(W, H); g.lineTo(0, H); g.fill();
  } else if (bg === "arctic") {
    g.fillStyle = grad([[0, "#b9dcf5"], [0.6, "#eaf6ff"]]); g.fillRect(0, 0, W, H);
    g.fillStyle = "#2f6f9f"; g.fillRect(0, 330, W, 270);
    const berg = (x, y, w, h) => { g.fillStyle = "#f4fbff"; g.beginPath(); g.moveTo(x, y); g.lineTo(x + w * 0.25, y - h); g.lineTo(x + w * 0.5, y - h * 0.6); g.lineTo(x + w * 0.7, y - h * 0.9); g.lineTo(x + w, y); g.fill(); g.fillStyle = "#cfe6f5"; g.beginPath(); g.moveTo(x + w * 0.5, y - h * 0.6); g.lineTo(x + w * 0.7, y - h * 0.9); g.lineTo(x + w, y); g.lineTo(x + w * 0.6, y); g.fill(); };
    berg(60, 340, 240, 150); berg(420, 345, 300, 190); berg(300, 338, 130, 70);
    g.fillStyle = "#f4fbff"; g.beginPath(); g.moveTo(0, 470); g.quadraticCurveTo(200, 440, 420, 475); g.quadraticCurveTo(620, 505, W, 460); g.lineTo(W, H); g.lineTo(0, H); g.fill();
  } else if (bg === "island") {
    g.fillStyle = grad([[0, "#8fd3ff"], [0.55, "#dff4ff"]]); g.fillRect(0, 0, W, H);
    g.fillStyle = "#ffe27a"; g.beginPath(); g.arc(660, 110, 48, 0, 7); g.fill();
    g.fillStyle = "#2f95c9"; g.fillRect(0, 340, W, 260);
    g.fillStyle = "#49acd8"; g.fillRect(0, 340, W, 20);
    g.fillStyle = "#f1dc9c"; g.beginPath(); g.ellipse(360, 392, 190, 44, 0, Math.PI, 0); g.fill(); g.fillRect(170, 390, 380, 6);
    g.strokeStyle = "#8b5a2b"; g.lineWidth = 14; g.lineCap = "round"; g.beginPath(); g.moveTo(330, 370); g.quadraticCurveTo(350, 280, 320, 200); g.stroke(); g.lineCap = "butt";
    g.fillStyle = "#3fa55b"; [[-1.2, 100], [-0.5, 110], [0.2, 105], [2.6, 100], [3.4, 110], [4.1, 95]].forEach(([ang, len]) => { g.save(); g.translate(320, 200); g.rotate(ang); g.beginPath(); g.ellipse(len / 2, 0, len / 2, 13, 0, 0, 7); g.fill(); g.restore(); });
    g.strokeStyle = "rgba(255,255,255,0.6)"; g.lineWidth = 3; g.beginPath(); [[90, 470], [520, 500], [300, 545], [650, 440]].forEach(([x, y]) => { g.moveTo(x, y); g.quadraticCurveTo(x + 22, y - 10, x + 44, y); }); g.stroke();
  } else if (bg === "cave") {
    g.fillStyle = grad([[0, "#2a2530"], [1, "#3b3440"]]); g.fillRect(0, 0, W, H);
    const glow = g.createRadialGradient(400, 300, 20, 400, 300, 330); glow.addColorStop(0, "rgba(255,225,170,0.38)"); glow.addColorStop(1, "rgba(255,225,170,0)"); g.fillStyle = glow; g.fillRect(0, 0, W, H);
    g.fillStyle = "#1c1820"; [[40, 150], [150, 90], [250, 190], [380, 110], [500, 170], [620, 80], [730, 140]].forEach(([x, h]) => { g.beginPath(); g.moveTo(x - 46, 0); g.lineTo(x, h); g.lineTo(x + 46, 0); g.fill(); });
    [[90, 110], [230, 70], [360, 130], [520, 90], [690, 120]].forEach(([x, h]) => { g.beginPath(); g.moveTo(x - 50, H); g.lineTo(x, H - h); g.lineTo(x + 50, H); g.fill(); });
    g.fillStyle = "#241f29"; g.fillRect(0, 540, W, 60);
  } else if (bg === "castle") {
    g.fillStyle = grad([[0, "#8fd3ff"], [0.7, "#e6f6ff"]]); g.fillRect(0, 0, W, H);
    g.fillStyle = "#86cf70"; g.beginPath(); g.moveTo(0, 470); g.quadraticCurveTo(400, 380, W, 470); g.lineTo(W, H); g.lineTo(0, H); g.fill();
    const tower = (x, top, w) => { g.fillStyle = "#aab2c2"; g.fillRect(x, top, w, 440 - top); for (let k = 0; k < 3; k += 1) g.fillRect(x - 4 + k * ((w + 8) / 3 + 1), top - 16, (w + 8) / 3 - 6, 18); g.fillStyle = "#c44b5a"; g.beginPath(); g.moveTo(x - 10, top - 16); g.lineTo(x + w / 2, top - 90); g.lineTo(x + w + 10, top - 16); g.fill(); g.fillStyle = "#3d4660"; g.fillRect(x + w / 2 - 7, top + 30, 14, 26); };
    g.fillStyle = "#bfc6d4"; g.fillRect(280, 280, 240, 160); for (let x = 280; x < 520; x += 40) g.fillRect(x, 262, 26, 20);
    tower(230, 220, 70); tower(500, 220, 70); tower(365, 170, 70);
    g.fillStyle = "#5b3a22"; g.beginPath(); g.moveTo(370, 440); g.lineTo(370, 380); g.arc(400, 380, 30, Math.PI, 0); g.lineTo(430, 440); g.fill();
  } else if (bg === "pitch") {
    for (let i = 0; i < 8; i += 1) { g.fillStyle = i % 2 ? "#57b45a" : "#63c266"; g.fillRect(i * 100, 0, 100, H); }
    g.strokeStyle = "#ffffff"; g.lineWidth = 5; g.strokeRect(30, 30, W - 60, H - 60);
    g.beginPath(); g.moveTo(400, 30); g.lineTo(400, H - 30); g.stroke(); g.beginPath(); g.arc(400, 300, 80, 0, 7); g.stroke();
    g.strokeRect(30, 180, 110, 240); g.strokeRect(W - 140, 180, 110, 240);
    g.fillStyle = "#ffffff"; g.beginPath(); g.arc(400, 300, 6, 0, 7); g.fill();
  } else if (bg === "stage") {
    g.fillStyle = "#231a2c"; g.fillRect(0, 0, W, H);
    const spot = g.createRadialGradient(400, 330, 30, 400, 330, 300); spot.addColorStop(0, "rgba(255,240,200,0.4)"); spot.addColorStop(1, "rgba(255,240,200,0)"); g.fillStyle = spot; g.fillRect(0, 0, W, H);
    g.fillStyle = "#8a5a33"; g.fillRect(0, 470, W, 130); g.strokeStyle = "#6f4627"; g.lineWidth = 2; g.beginPath(); for (let y = 496; y < H; y += 26) { g.moveTo(0, y); g.lineTo(W, y); } g.stroke();
    const curtain = (x0, x1) => { const q = g.createLinearGradient(x0, 0, x1, 0); for (let k = 0; k <= 6; k += 1) q.addColorStop(k / 6, k % 2 ? "#8f1f2c" : "#c22e3f"); g.fillStyle = q; g.fillRect(Math.min(x0, x1), 0, Math.abs(x1 - x0), 500); };
    curtain(0, 130); curtain(W, W - 130);
    g.fillStyle = "#a82636"; g.fillRect(0, 0, W, 60); g.fillStyle = "#e0b33c"; for (let x = 0; x < W; x += 40) { g.beginPath(); g.arc(x + 20, 60, 20, 0, Math.PI); g.fill(); }
  } else if (bg === "bedroom") {
    g.fillStyle = "#cfe3f7"; g.fillRect(0, 0, W, 430);
    g.fillStyle = "#b98a5a"; g.fillRect(0, 430, W, 170); g.strokeStyle = "#a47646"; g.lineWidth = 2; g.beginPath(); for (let y = 460; y < H; y += 30) { g.moveTo(0, y); g.lineTo(W, y); } g.stroke();
    g.fillStyle = "#ffffff"; g.fillRect(0, 418, W, 14);
    g.fillStyle = "#ffffff"; g.fillRect(510, 90, 210, 200); g.fillStyle = grad([[0, "#8fd3ff"], [0.5, "#dff4ff"]]); g.fillRect(522, 102, 186, 176);
    g.strokeStyle = "#ffffff"; g.lineWidth = 8; g.beginPath(); g.moveTo(615, 102); g.lineTo(615, 278); g.moveTo(522, 190); g.lineTo(708, 190); g.stroke();
    g.fillStyle = "#f2a7b8"; g.beginPath(); g.ellipse(360, 520, 230, 52, 0, 0, 7); g.fill(); g.fillStyle = "#f8c9d4"; g.beginPath(); g.ellipse(360, 520, 170, 34, 0, 0, 7); g.fill();
    g.fillStyle = "#f5d90a"; [[90, 120], [170, 200], [290, 100], [380, 220]].forEach(([x, y]) => { g.beginPath(); for (let k = 0; k < 5; k += 1) { const a1 = -Math.PI / 2 + (k * 2 * Math.PI) / 5, a2 = a1 + Math.PI / 5; g.lineTo(x + Math.cos(a1) * 14, y + Math.sin(a1) * 14); g.lineTo(x + Math.cos(a2) * 6, y + Math.sin(a2) * 6); } g.fill(); });
  } else if (bg === "candy") {
    g.fillStyle = grad([[0, "#ffd1e8"], [0.7, "#fff0f7"]]); g.fillRect(0, 0, W, H);
    g.fillStyle = "#b9e6ff"; g.beginPath(); g.moveTo(0, 430); g.quadraticCurveTo(200, 340, 400, 430); g.lineTo(400, H); g.lineTo(0, H); g.fill();
    g.fillStyle = "#c9f2c7"; g.beginPath(); g.moveTo(330, 440); g.quadraticCurveTo(580, 330, W, 440); g.lineTo(W, H); g.lineTo(330, H); g.fill();
    g.fillStyle = "#fff6c9"; g.beginPath(); g.moveTo(0, 510); g.quadraticCurveTo(300, 470, 520, 512); g.quadraticCurveTo(680, 540, W, 500); g.lineTo(W, H); g.lineTo(0, H); g.fill();
    const lolly = (x, y, rr, c1, c2) => { g.strokeStyle = "#ffffff"; g.lineWidth = 8; g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + rr * 2.6); g.stroke(); g.fillStyle = c1; g.beginPath(); g.arc(x, y, rr, 0, 7); g.fill(); g.strokeStyle = c2; g.lineWidth = 6; g.beginPath(); for (let k = 0; k < 40; k += 1) { const a1 = k * 0.42, d = (k / 40) * (rr - 5); g.lineTo(x + Math.cos(a1) * d, y + Math.sin(a1) * d); } g.stroke(); };
    lolly(120, 300, 44, "#ff8fb1", "#ffffff"); lolly(660, 280, 52, "#8fd3ff", "#ffffff"); lolly(420, 340, 34, "#c79bff", "#ffffff");
    let a = 17; const r = () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; };
    for (let i = 0; i < 40; i += 1) { g.fillStyle = ["#ff6b8a", "#4db6ff", "#ffcf3f", "#6fd08c"][Math.floor(r() * 4)]; g.save(); g.translate(r() * W, 520 + r() * 70); g.rotate(r() * 3); g.fillRect(-7, -2.5, 14, 5); g.restore(); }
  } else if (bg === "moon") {
    g.fillStyle = "#05060f"; g.fillRect(0, 0, W, H); stars(g, 150, 31);
    g.fillStyle = "#3f8fd6"; g.beginPath(); g.arc(640, 130, 56, 0, 7); g.fill(); g.fillStyle = "#58b06a"; [[620, 115, 20, 12], [655, 150, 18, 10], [660, 105, 10, 7]].forEach(([x, y, w, h]) => { g.beginPath(); g.ellipse(x, y, w, h, 0.4, 0, 7); g.fill(); });
    g.fillStyle = "#b9bcc6"; g.beginPath(); g.moveTo(0, 430); g.quadraticCurveTo(260, 380, 500, 425); g.quadraticCurveTo(680, 455, W, 410); g.lineTo(W, H); g.lineTo(0, H); g.fill();
    [[150, 500, 60, 16], [420, 540, 90, 20], [640, 490, 50, 13], [300, 460, 36, 9], [720, 560, 44, 11]].forEach(([x, y, w, h]) => { g.fillStyle = "#8f93a0"; g.beginPath(); g.ellipse(x, y, w, h, 0, 0, 7); g.fill(); g.fillStyle = "#a4a8b4"; g.beginPath(); g.ellipse(x, y + 3, w * 0.86, h * 0.7, 0, 0, 7); g.fill(); });
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

// a dashed box round what is chosen, with a round handle at its corner for resizing
const HANDLE = 15;
function chosenBox(b, light) {
  ctx.save(); ctx.lineWidth = 2.5; ctx.strokeStyle = light ? "#ffd15a" : "#cf9410"; ctx.setLineDash([8, 6]);
  ctx.strokeRect(b.x0 - 6, b.y0 - 6, b.w + 12, b.h + 12); ctx.setLineDash([]);
  ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.arc(b.x1 + 6, b.y1 + 6, HANDLE, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = "#8a6208"; ctx.lineWidth = 2.5; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(b.x1 + 1, b.y1 + 1); ctx.lineTo(b.x1 + 11, b.y1 + 11); ctx.moveTo(b.x1 + 11, b.y1 + 5); ctx.lineTo(b.x1 + 11, b.y1 + 11); ctx.lineTo(b.x1 + 5, b.y1 + 11); ctx.stroke();
  // the turning handle, on a short stalk above the box
  const tx = b.x0 + b.w / 2, ty = b.y0 - 6 - 30;
  ctx.strokeStyle = light ? "#ffd15a" : "#cf9410"; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(tx, b.y0 - 6); ctx.lineTo(tx, ty + HANDLE); ctx.stroke();
  ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.arc(tx, ty, HANDLE, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = "#8a6208"; ctx.lineCap = "round"; ctx.beginPath(); ctx.arc(tx, ty, 7, Math.PI * 0.2, Math.PI * 1.7); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(tx + 1, ty - 11); ctx.lineTo(tx + 6, ty - 6.5); ctx.lineTo(tx + 0.5, ty - 3); ctx.stroke();
  ctx.restore();
}
const onHandle = (b, x, y) => !!b && Math.hypot(x - (b.x1 + 6), y - (b.y1 + 6)) <= HANDLE + 12;
const onTurn = (b, x, y) => !!b && Math.hypot(x - (b.x0 + (b.x1 - b.x0) / 2), y - (b.y0 - 36)) <= HANDLE + 12;
// the Move tool's choice: places in the list being drawn (all of them when "Everything on the page" is ticked)
const picked = () => { const list = strokes(); return (ui.all ? list.map((_, i) => i) : ui.pick).filter((i) => i < list.length); };
const pickBox = () => { const list = strokes(), idx = picked(); return idx.length ? bbox(idx.map((i) => list[i])) : null; };

// ---------- the picture on screen ----------
function render(t = null) {
  ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
  if (scene()) {
    const playing = ui.state === "play";
    putBg(ctx, data.scene.bg);
    data.scene.things.forEach((th, i) => {
      if (ui.state === "draw" && i === ui.edit) return;
      const il = th.gt && !th.lead ? data.scene.things.findIndex((q) => q.g === th.g && q.lead) : -1, lead = data.scene.things[il]; // a group that travels together follows its leader
      const now = playing ? t : null, at = lead ? poseTogether(th, lead, now, i, il) : pose(th, now, i);
      drawThing(th, at, playing && t !== null ? (lead ? { ...limbs(th, t, i), go: limbs(lead, t, il).go } : limbs(th, t, i)) : null);
    });
    if (ui.state === "draw") { ctx.drawImage(A.cv, 0, 0, W, H); if (ui.from && ui.live) strokeOn(ctx, ui.live); if (ui.tool === "move" && !ui.clean) { const pb = pickBox(); if (pb) chosenBox(pb, DARK.has(data.scene.bg)); } if (ui.tool === "joint" && !ui.clean) jointOverlay(); if (ui.tool === "text" && !ui.clean) textOverlay(); }
    const th = data.scene.things[ui.sel];
    if (th && !playing && ui.state !== "draw" && !ui.clean) {
      const light = DARK.has(data.scene.bg);
      ctx.save(); ctx.lineWidth = 2.5; ctx.setLineDash([8, 6]); ctx.strokeStyle = light ? "#ffd15a" : "#cf9410";
      if (th.move === "path" && th.path && ui.state !== "path") { ctx.beginPath(); ctx.moveTo(th.path[0], th.path[1]); for (let i = 2; i < th.path.length; i += 2) ctx.lineTo(th.path[i], th.path[i + 1]); ctx.stroke(); }
      ctx.restore();
      const { b } = layer(th);
      if (ui.state === "idle") {
        const set = mates(th);
        chosenBox(set.length > 1 ? boxOf(set) : { x0: th.x + b.x0, y0: th.y + b.y0, x1: th.x + b.x1, y1: th.y + b.y1, w: b.w, h: b.h }, light);
        if (set.length > 1) { ctx.save(); ctx.lineWidth = 2; ctx.setLineDash([2, 6]); ctx.strokeStyle = light ? "#ffd15a" : "#cf9410"; ctx.strokeRect(th.x + b.x0 - 2, th.y + b.y0 - 2, b.w + 4, b.h + 4); ctx.restore(); } // the one of the group whose movement the panel shows
      }
    }
    if (ui.state === "path" && ui.pathPts) { ctx.save(); ctx.lineWidth = 5; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.setLineDash([2, 12]); ctx.strokeStyle = "#f5a623"; ctx.beginPath(); ctx.moveTo(ui.pathPts[0], ui.pathPts[1]); for (let i = 2; i < ui.pathPts.length; i += 2) ctx.lineTo(ui.pathPts[i], ui.pathPts[i + 1]); ctx.stroke(); ctx.restore(); }
  } else {
    putBg(ctx, bgOf(ui.frame));
    if (ui.state === "play") drawBook();
    else {
      if (data.flip.onion && ui.frame > 0 && !ui.clean) { ctx.globalAlpha = 0.22; ctx.drawImage(B.cv, 0, 0, W, H); ctx.globalAlpha = 1; }
      ctx.drawImage(A.cv, 0, 0, W, H);
      if (ui.from && ui.live) strokeOn(ctx, ui.live);
      if (ui.tool === "move" && !ui.clean) { const pb = pickBox(); if (pb) chosenBox(pb, DARK.has(bgOf(ui.frame))); }
      if (ui.tool === "joint" && !ui.clean) jointOverlay();
      if (ui.tool === "text" && !ui.clean) textOverlay();
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
  src.connect(bp).connect(g).connect(ac.destination); if (recTap) g.connect(recTap); src.start(t); src.stop(t + len + 0.02);
  if (!quick) { const o = ac.createOscillator(), og = ac.createGain(); o.frequency.setValueAtTime(190, t + len * 0.75); o.frequency.exponentialRampToValueAtTime(90, t + len + 0.05); og.gain.setValueAtTime(0.0001, t + len * 0.75); og.gain.exponentialRampToValueAtTime(0.05, t + len * 0.8); og.gain.exponentialRampToValueAtTime(0.0001, t + len + 0.06); o.connect(og).connect(ac.destination); if (recTap) og.connect(recTap); o.start(t + len * 0.75); o.stop(t + len + 0.08); } // a soft pat as it lands
}

// ---------- background music (music.js): the scene and the flipbook each remember their own tune, which plays while they play ----------
const work = () => (scene() ? data.scene : data.flip);
function startMusic() {
  const id = work().music;
  if (data.muted || !id || id === "none") { stopTune(); return; }
  playTune(id, window.z210Audio && window.z210Audio.get(), 0.5, recTap);
}
let recTap = null; // while a video is being recorded: where the sound goes as well as the speakers

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
  $("splitThing").hidden = !(th && scene() && ui.state === "idle" && (th.g || clusters(th.s).length > 1));
  if (!(th && scene() && ui.state === "idle" && things.length > 1)) ui.joining = false;
  $("joinThing").hidden = !(th && things.some((q) => q !== th && !(th.g && q.g === th.g))); $("joinThing").setAttribute("aria-pressed", String(!!ui.joining));
  $("scenePanel").hidden = !(scene() && ui.state === "idle");
  $("flipPanel").hidden = scene() || playing;
  $("strip").hidden = scene() || playing;
  $("thumbRow").hidden = scene() || !playing;
  $("stage").classList.toggle("book", !scene());
  // the stack of page edges under the book gets thicker as pages are added
  const thick = scene() ? 0 : Math.min(7, 1 + Math.floor(data.flip.frames.length / 3));
  cv.style.boxShadow = scene() ? "" : Array.from({ length: thick }, (_, i) => `${(i + 1) * 3}px ${(i + 1) * 3}px 0 ${i % 2 ? "#cfc8b6" : "#ebe5d5"}`).join(", ") + `, ${thick * 3 + 6}px ${thick * 3 + 10}px 22px rgba(0,0,0,0.35)`;
  document.querySelectorAll("#palette .sw").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.c === data.color)));
  press("tools", "tool", ui.tool); press("shapes", "shape", ui.shape); press("stickSets", "set", ui.set);
  $("shapeRow").hidden = ui.tool !== "shape"; $("stickRow").hidden = ui.tool !== "stamp"; $("moveRow").hidden = ui.tool !== "move"; $("jointRow").hidden = ui.tool !== "joint"; $("textRow").hidden = ui.tool !== "text";
  if (ui.tool !== "text" || !strokes().includes(ui.textPick)) ui.textPick = null;
  press("fonts", "font", ui.textPick ? ui.textPick.f : ui.font || "round"); $("textNew").disabled = !ui.textPick;
  $("palette").hidden = ui.tool === "stamp" || ui.tool === "erase" || ui.tool === "move" || ui.tool === "joint";
  $("sizes").hidden = ui.tool === "move" || ui.tool === "fill" || ui.tool === "joint";
  if (ui.tool === "joint") paintJoints();
  $("moveAll").checked = ui.all;
  const none = ui.tool !== "move" || !picked().length;
  ["mSmaller", "mBigger", "mLeft", "mRight", "mCopy", "mRemove"].forEach((id) => { $(id).disabled = none; });
  const drawnSet = !!(STICKERS.find((k) => k.id === ui.set) || {}).drawn;
  document.querySelectorAll("#stickGrid .stk").forEach((b) => b.setAttribute("aria-pressed", String(drawnSet ? b.dataset.fig === ui.person : b.dataset.ch === ui.sticker)));
  $("toneRows").hidden = !drawnSet;
  const beasts = (STICKERS.find((k) => k.id === ui.set) || {}).drawn === "animals";
  $("skinRow").hidden = beasts; $("hairRow").hidden = beasts;
  $("topLbl").textContent = beasts ? "Colour" : "Top"; $("botLbl").textContent = beasts ? "Second" : "Bottom";
  const lk = look(ui.person); // the colour rows show the chosen figure's own colours
  document.querySelectorAll("#skins .sw").forEach((b) => b.setAttribute("aria-pressed", String(Number(b.dataset.sk) === lk.sk)));
  document.querySelectorAll("#hairs .sw").forEach((b) => b.setAttribute("aria-pressed", String(Number(b.dataset.hc) === lk.hc)));
  document.querySelectorAll("#tops .sw").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.c === (lk.tc || ""))));
  document.querySelectorAll("#bots .sw").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.c === (lk.bc || ""))));
  $("stickFlip").checked = ui.flip;
  press("sizes", "size", data.size);
  press("bgs", "bg", data.scene.bg);
  press("fbgs", "bg", bgOf(ui.frame));
  press("fps", "fps", data.flip.fps);
  const tuneId = TUNES.some((t) => t.id === work().music) ? work().music : "none";
  document.querySelectorAll(".tunepick").forEach((el) => { el.value = tuneId; });
  document.querySelectorAll(".listenbtn").forEach((el) => { el.disabled = tuneId === "none"; el.textContent = playingTune() && ui.state !== "play" ? "⏹ Stop" : "🎧 Listen"; });
  $("mute").textContent = data.muted ? "🔇 Sound off" : "🔊 Sound on"; $("mute").setAttribute("aria-pressed", String(!data.muted));
  press("tweenN", "n", String(ui.tweenN || 2)); $("tween").disabled = ui.frame >= data.flip.frames.length - 1;
  $("onion").checked = !!data.flip.onion; $("flipStep").checked = data.flip.step !== false;
  if (th) { press("moves", "move", th.move); press("acts", "act", th.act); press("speeds", "speed", th.speed); $("face").checked = !!th.face; }
  // a joined group can travel together, following one of its members
  const follows = !!(th && th.g && th.gt && !th.lead);
  $("togetherRow").hidden = !(th && th.g); $("together").checked = !!(th && th.g && th.gt && th.lead);
  $("togetherLbl").textContent = follows ? "The group travels together, following another one. Tick to follow this one instead." : "The group travels together, following this one";
  $("moves").parentElement.hidden = follows; // where a follower goes is up to its leader
}

// ---------- pointer: draw, trace a path, or pick up and drag a thing ----------
function at(e) { const r = cv.getBoundingClientRect(); return [((e.clientX - r.left) * W) / r.width, ((e.clientY - r.top) * H) / r.height]; }
// ---------- joined drawings ----------
// Drawings that have been joined share a number, g. They are chosen, moved, resized, turned, copied and deleted
// together, but each one keeps its own way of moving when the animation plays.
const mates = (th) => (th ? (th.g ? data.scene.things.filter((q) => q.g === th.g) : [th]) : []);
function boxOf(set) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  set.forEach((t) => { const { b } = layer(t); x0 = Math.min(x0, t.x + b.x0); y0 = Math.min(y0, t.y + b.y0); x1 = Math.max(x1, t.x + b.x1); y1 = Math.max(y1, t.y + b.y1); });
  return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
}
const snap = (set) => set.map((t) => ({ t, s: t.s, x: t.x, y: t.y, path: t.path }));
/** A set of drawings made k times the size they were (`was`, from snap) about the point (cx, cy). */
function sizeSet(was, k, cx, cy) {
  const all = bbox(was.flatMap((o) => shift(o.s, o.x, o.y))), most = Math.min(8, 1500 / Math.max(all.w, all.h)), least = 24 / Math.max(all.w, all.h, 24), kk = Math.max(least, Math.min(most, k));
  was.forEach((o) => {
    o.t.s = scaled(o.s, kk); layers.delete(o.t);
    if (was.length > 1) { o.t.x = cx + (o.x - cx) * kk; o.t.y = cy + (o.y - cy) * kk; if (o.path) o.t.path = o.path.map((v, i) => (i % 2 ? cy + (v - cy) * kk : cx + (v - cx) * kk)); } // joined drawings keep their places in the group
  });
}
/** A set of drawings turned by `a` from how they were, about the point (cx, cy). */
function turnSet(was, a, cx, cy) {
  const c = Math.cos(a), n = Math.sin(a), round = (x, y) => [cx + (x - cx) * c - (y - cy) * n, cy + (x - cx) * n + (y - cy) * c];
  was.forEach((o) => {
    o.t.s = turned(o.s, a); layers.delete(o.t);
    if (was.length > 1) { [o.t.x, o.t.y] = round(o.x, o.y); if (o.path) { const p = []; for (let i = 0; i < o.path.length; i += 2) p.push(...round(o.path[i], o.path[i + 1])); o.t.path = p; } }
  });
}
/** The drawing at a point (top-most first), or -1. `skip(thing, place)` leaves some out. A tap right on a line, sticker or person
 *  wins over a tap that is only inside the box of a wide drawing lying over it. */
function hit(x, y, skip = () => false) {
  const things = data.scene.things;
  for (let i = things.length - 1; i >= 0; i -= 1) { const th = things[i]; if (!skip(th, i) && th.s.some((q) => { if (q.e) return false; const b = bbox([q]); return x >= th.x + b.x0 - 10 && x <= th.x + b.x1 + 10 && y >= th.y + b.y0 - 10 && y <= th.y + b.y1 + 10; })) return i; }
  for (let i = things.length - 1; i >= 0; i -= 1) { const th = things[i], { b } = layer(th); if (!skip(th, i) && x >= th.x + b.x0 - 10 && x <= th.x + b.x1 + 10 && y >= th.y + b.y0 - 10 && y <= th.y + b.y1 + 10) return i; }
  return -1;
}
cv.addEventListener("pointerdown", (e) => {
  if ((ui.state === "play" && scene()) || (e.pointerType === "mouse" && e.button !== 0)) return;
  e.preventDefault();
  try { cv.setPointerCapture(e.pointerId); } catch (err) { /* older browsers */ }
  const [x, y] = at(e);
  if (ui.state === "play") { endTurn(); ui.scrub = { x, lastX: x, lastT: performance.now(), v: 0 }; ui.want = null; if (ui.auto) { ui.auto = false; paint(); } return; } // take hold of the book
  if (drawing()) {
    if (ui.tool === "fill") { fillAt(x, y); return; }
    if (ui.tool === "move") { grabAt(x, y); return; }
    if (ui.tool === "joint") { jointAt(x, y); return; }
    if (ui.tool === "text") { textAt(x, y); return; }
    if (ui.tool === "shape") { ui.from = [x, y]; ui.live = null; ui.reach = 0; return; }
    if (ui.tool === "stamp") { ui.from = [x, y]; ui.live = sticker(x, y); render(); return; }
    const erase = ui.tool === "erase";
    ui.live = { c: data.color, w: erase ? Math.max(18, data.size * 1.8) : data.size, e: erase ? 1 : 0, p: [x, y] }; strokeOn(A.g, ui.live); render();
  }
  else if (ui.state === "path") { ui.pathPts = [x, y]; render(); }
  else if (scene()) {
    if (ui.joining && data.scene.things[ui.sel]) { // Join is on: a tap on another drawing joins it to the chosen one
      const me = data.scene.things[ui.sel], i = hit(x, y, (q, n) => n === ui.sel || (me.g && q.g === me.g)); // look past the chosen drawing and anything already joined to it
      if (i >= 0) joinThings(i); else { ui.joining = false; note(""); paint(); render(); }
      return;
    }
    const cur2 = data.scene.things[ui.sel];
    if (cur2) { // the handles of the chosen drawing, or of the whole group it is joined to
      const set = mates(cur2), gb = boxOf(set), cx = set.length > 1 ? gb.cx : cur2.x, cy = set.length > 1 ? gb.cy : cur2.y;
      if (onHandle(gb, x, y)) { ui.drag = { size: true, cx, cy, from: Math.max(20, Math.hypot(x - cx, y - cy)), was: snap(set) }; return; } // the corner handle: resize
      if (onTurn(gb, x, y)) { ui.drag = { turn: true, cx, cy, a0: Math.atan2(y - cy, x - cx), was: snap(set) }; return; } // the top handle: turn
    }
    const i = hit(x, y); if (i !== ui.sel) { ui.sel = i; paint(); } if (i >= 0) ui.drag = { x, y }; render();
  }
});
cv.addEventListener("pointermove", (e) => {
  if (!ui.live && !ui.pathPts && !ui.drag && !ui.scrub && !ui.from && !ui.grab && !ui.jdrag && !ui.lasso) return;
  const [x, y] = at(e);
  if (ui.grab) { grabMove(x, y); return; }
  if (ui.jdrag) { jointDrag(x, y); return; }
  if (ui.lasso) { const la = ui.lasso; if (Math.hypot(x - la.x, y - la.y) > 12) la.moved = true; la.pts.push(x, y); render(); return; }
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
  if (ui.from) { // a shape stretches from where the finger went down; a sticker follows the finger
    ui.reach = Math.hypot(x - ui.from[0], y - ui.from[1]);
    ui.live = ui.tool === "stamp" ? sticker(x, y) : ui.tool === "text" ? words(x, y) : { c: data.color, w: data.size, k: 1, p: shapePoints(ui.shape, ui.from[0], ui.from[1], x, y) };
  } else if (ui.live) {
    const p = ui.live.p, g = A.g;
    g.globalCompositeOperation = ui.live.e ? "destination-out" : "source-over"; g.strokeStyle = ui.live.c; g.lineWidth = ui.live.w; g.lineCap = "round";
    g.beginPath(); g.moveTo(p[p.length - 2], p[p.length - 1]); g.lineTo(x, y); g.stroke(); g.globalCompositeOperation = "source-over";
    p.push(x, y);
  } else if (ui.pathPts) ui.pathPts.push(x, y);
  else {
    const th = data.scene.things[ui.sel], dx = x - ui.drag.x, dy = y - ui.drag.y;
    if (!th) return;
    const dr = ui.drag;
    if (dr.size) { sizeSet(dr.was, Math.hypot(x - dr.cx, y - dr.cy) / dr.from, dr.cx, dr.cy); render(); return; }
    if (dr.turn) { turnSet(dr.was, Math.atan2(y - dr.cy, x - dr.cx) - dr.a0, dr.cx, dr.cy); render(); return; }
    const mx = Math.max(0, Math.min(W, th.x + dx)) - th.x, my = Math.max(0, Math.min(H, th.y + dy)) - th.y; // the one being held stays on the page
    mates(th).forEach((t) => { t.x += mx; t.y += my; if (t.path) t.path = t.path.map((v, i) => v + (i % 2 ? my : mx)); }); // anything joined to it comes too, and paths come with them
    ui.drag = { x, y };
  }
  render();
});
function lift() {
  if (ui.grab) { grabEnd(); return; }
  if (ui.jdrag) { jointDrop(); return; }
  if (ui.lasso) { const la = ui.lasso; ui.lasso = null; if (la.moved && la.pts.length >= 12) jointRing(la.pts); else jointTap(la.x, la.y); render(); return; }
  if (ui.scrub) { const tn = ui.turn; letGo(!!tn && tn.hand && (tn.forward ? ui.scrub.v : -ui.scrub.v) > 0.5 && performance.now() - ui.scrub.lastT < 120); ui.scrub = null; return; } // a quick flick finishes the turn too
  if (ui.from) { // a shape or a sticker is put down
    const s2 = ui.live, big = s2 && (s2.ch || s2.fig || s2.tx || ui.reach > 8);
    ui.from = null; ui.live = null; ui.reach = 0;
    if (s2 && s2.tx) { ui.textPick = s2; note("Written! Keep typing to change it, pick another font, colour or size, or tap New text to write something else."); }
    if (big) { strokes().push(s2); did({ k: "add" }); paintLayer(A, strokes()); if (!scene()) { thumb(ui.frame); save(); } if (s2.tx) paint(); }
    else if (s2 || ui.tool === "shape") note("Press and drag to draw the shape.");
  } else if (ui.live && ui.live.e) {
    // the eraser: a sticker or person it passes over the middle of is taken away whole (rubbing leaves no scraps)
    const list = strokes(), rub = ui.live, gone = stickersUnder(list, rub.p, rub.w).map((i) => ({ i, s: list[i] }));
    for (let k = gone.length - 1; k >= 0; k -= 1) list.splice(gone[k].i, 1);
    const tap = rub.p.length <= 4 && gone.length; // just a tap on a sticker: nothing else to rub out
    rub.p = thin(rub.p); ui.live = null;
    if (!tap) list.push(rub);
    did({ k: "rub", gone, added: !tap });
    paintLayer(A, list);
    if (!scene()) { thumb(ui.frame); save(); }
  } else if (ui.live) {
    ui.live.p = thin(ui.live.p);
    strokes().push(ui.live); ui.live = null; did({ k: "add" });
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
  ui.pick = []; past = [];
  ui.state = "draw"; ui.edit = edit; ui.draft = edit >= 0 ? stageStrokes(data.scene.things[edit]) : [];
  paintLayer(A, ui.draft); note(""); paint(); render();
  if (matchMedia("(max-width: 700px)").matches) $("hint").scrollIntoView({ block: "start", behavior: "smooth" });
}
function endDraw(keep) {
  if (keep) {
    const things = data.scene.things, old = ui.edit >= 0 ? things[ui.edit] : {}, how = { move: old.move, act: old.act, speed: old.speed, face: old.face, path: old.path };
    const build = (strokes, more) => { const made = makeThing(strokes, more); if (!made) return null; ["move", "act", "speed", "face", "path"].forEach((k) => { if (made[k] === undefined) delete made[k]; }); return { move: "stay", act: "none", speed: 1, face: true, path: null, ...made }; };
    const thing = build(ui.draft, how);
    if (!thing) { // nothing there: Done never leaves the child stuck. A drawing that was rubbed out or cleared is taken away.
      if (ui.edit >= 0) { things.splice(ui.edit, 1); ui.sel = -1; save(); note("That drawing is empty now, so it has been taken away."); } else note("Nothing was drawn, so nothing was added.");
    } else if (ui.edit >= 0) { for (const key of ["g", "gt", "lead"]) if (old[key]) thing[key] = old[key]; things[ui.edit] = thing; note(""); save(); }
    else {
      // stickers stamped apart from each other are separate objects, so each can be moved and resized on its own
      const parts = clusters(ui.draft), apart = parts.length > 1 && parts.every((g) => g.some((q) => q.ch || q.fig)) && things.length + parts.length <= MAX_THINGS;
      if (apart) { parts.forEach((g) => things.push(build(g, {}))); note(`${parts.length} separate drawings, so you can move each one by itself. Tap one to choose how it moves.`); }
      else { things.push(thing); note("Now choose how it moves."); }
      ui.sel = things.length - 1;
      save();
    }
  }
  ui.state = "idle"; ui.edit = -1; ui.draft = []; ui.pick = []; ui.grab = null; ui.jdrag = null; ui.lasso = null; ui.live = null; ui.from = null;
  paint(); render();
}
/** Another drawing (and anything already joined to it) is joined to the chosen one. Split apart undoes it. */
function joinThings(other) {
  const things = data.scene.things, th = sel(), add = things[other];
  if (!th || !add || add === th) return;
  if (th.g && add.g === th.g) { note("Those two are already joined. Tap a different drawing."); return; }
  const g = th.g || 1 + things.reduce((m, q) => Math.max(m, q.g || 0), 0);
  const tog = mates(th).some((t) => t.gt);
  mates(add).forEach((t) => { t.g = g; delete t.lead; if (tog) t.gt = 1; else delete t.gt; }); th.g = g; // newcomers fall in with a group that travels together
  const more = things.some((q) => q.g !== g); if (!more) ui.joining = false;
  note(`Joined! They stay together when you move, resize or turn them, and each keeps its own way of moving.${more ? " Tap another drawing to join it too, or tap Join again to finish." : ""}`);
  save(); paint(); render();
}
/** One drawing made of several objects standing apart becomes several drawings. */
function splitThing() {
  const th = sel(), things = data.scene.things;
  if (!th) return;
  if (th.g) { const n = mates(th).length; mates(th).forEach((t) => { delete t.g; delete t.gt; delete t.lead; }); note(`${n} separate drawings again. Each has kept its own way of moving.`); save(); paint(); render(); return; } // drawings that were joined come apart first
  const parts = clusters(stageStrokes(th));
  if (parts.length < 2) return;
  if (things.length - 1 + parts.length > MAX_THINGS) { note(`A scene can hold ${MAX_THINGS} drawings, and that would be too many. Delete one first.`); return; }
  // each one keeps how the drawing moved; a traced path stays with the first only, or they would all walk on top of each other
  const made = parts.map((g, n) => ({ move: "stay", act: "none", speed: 1, face: true, path: null, ...makeThing(g, { move: th.move === "path" && n ? "stay" : th.move, act: th.act, speed: th.speed, face: th.face, path: n ? null : th.path }) }));
  things.splice(ui.sel, 1, ...made);
  note(`Now ${parts.length} separate drawings. Tap one to move it, resize it or choose how it moves.`);
  save(); paint(); render();
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
$("together").addEventListener("change", () => {
  const th = sel(); if (!th || !th.g) return;
  const on = $("together").checked;
  mates(th).forEach((t) => { delete t.lead; if (on) t.gt = 1; else delete t.gt; }); if (on) th.lead = 1;
  note(on ? "They all go where this one goes now. Choose how it moves; each one still does its own bounce, spin or wiggle." : "Each one goes its own way again.");
  save(); paint(); render();
});
$("face").addEventListener("change", () => { const th = sel(); if (th) { th.face = $("face").checked; save(); } });
const about = (th) => { const set = mates(th), gb = boxOf(set); return [snap(set), set.length > 1 ? gb.cx : th.x, set.length > 1 ? gb.cy : th.y]; };
for (const [id, a] of [["tLeft", -Math.PI / 12], ["tRight", Math.PI / 12]]) $(id).addEventListener("click", () => { const th = sel(); if (!th) return; const [was, cx, cy] = about(th); turnSet(was, a, cx, cy); save(); render(); });
for (const [id, k] of [["tSmaller", 1 / 1.2], ["tBigger", 1.2]]) $(id).addEventListener("click", () => { const th = sel(); if (!th) return; const [was, cx, cy] = about(th); sizeSet(was, k, cx, cy); save(); render(); });
$("addTo").addEventListener("click", () => { if (sel()) startDraw(ui.sel); });
$("toFront").addEventListener("click", () => { const th = sel(); if (!th) return; const set = mates(th); data.scene.things = [...data.scene.things.filter((q) => !set.includes(q)), ...set]; ui.sel = data.scene.things.indexOf(th); save(); render(); });
$("copyThing").addEventListener("click", () => {
  const th = sel();
  if (!th) return;
  const set = mates(th), things = data.scene.things;
  if (things.length + set.length > MAX_THINGS) { note(`A scene can hold ${MAX_THINGS} drawings, and that would be too many.`); return; }
  const g = set.length > 1 ? 1 + things.reduce((m, q) => Math.max(m, q.g || 0), 0) : 0; // a copied group is a group of its own
  set.forEach((t) => {
    const copy = JSON.parse(JSON.stringify(t)); copy.x = t.x + 40; copy.y = t.y + 30; if (g) copy.g = g; else delete copy.g;
    if (set.length === 1) { copy.x = Math.min(W - 20, copy.x); copy.y = Math.min(H - 20, copy.y); }
    if (copy.path) copy.path = copy.path.map((v, k) => v + (k % 2 ? 30 : 40));
    things.push(copy); if (t === th) ui.sel = things.length - 1;
  });
  save(); paint(); render();
});
$("splitThing").addEventListener("click", splitThing);
$("joinThing").addEventListener("click", () => { if (!sel()) return; ui.joining = !ui.joining; note(ui.joining ? "Tap another drawing to join it to this one." : ""); paint(); });
$("delThing").addEventListener("click", () => { const th = sel(); if (!th) return; const set = mates(th); data.scene.things = data.scene.things.filter((q) => !set.includes(q)); ui.sel = -1; save(); paint(); render(); });
$("bgs").addEventListener("click", (e) => { const b = e.target.closest(".g-chip"); if (b) { data.scene.bg = b.dataset.bg; save(); paint(); render(); } });
$("exScene").addEventListener("click", () => { if (data.scene.things.length && !confirm("Swap your scene for the example? Your drawings here will be removed.")) return; data.scene = { ...exampleScene(), music: data.scene.music }; ui.sel = -1; save(); paint(); render(); note("Press Play! Then tap a drawing to see how it was set up."); });
$("newScene").addEventListener("click", () => { if (data.scene.things.length && !confirm("Clear this scene and start again?")) return; data.scene = { bg: data.scene.bg, things: [], music: data.scene.music }; ui.sel = -1; save(); paint(); render(); });

// ---------- drawing tools ----------
$("palette").innerHTML = COLORS.map((c, i) => `<button class="sw" data-c="${c}" style="background:${c}" aria-label="${COLOR_NAMES[i]}"></button>`).join("");
$("palette").addEventListener("click", (e) => { const b = e.target.closest(".sw"); if (b) { data.color = b.dataset.c; save(); paint(); if (ui.tool === "text") textApply((s) => { s.c = data.color; }); } });
$("sizes").innerHTML = SIZES.map(([v, label]) => `<button class="g-chip sz" data-size="${v}" aria-label="${label}"><i style="width:${Math.min(26, v + 2)}px;height:${Math.min(26, v + 2)}px"></i></button>`).join("");
$("sizes").addEventListener("click", (e) => { const b = e.target.closest(".g-chip"); if (b) { data.size = Number(b.dataset.size); save(); paint(); if (ui.tool === "text") textApply((s) => { s.w = TEXT_SIZE[data.size] || 42; }); } });
chips("tools", TOOLS, "tool");
$("tools").addEventListener("click", (e) => { const b = e.target.closest(".g-chip"); if (!b) return; ui.tool = b.dataset.tool; note(ui.tool === "fill" ? "Pick a colour, then tap inside something you have drawn." : ui.tool === "shape" ? "Press and drag to draw the shape." : ui.tool === "stamp" ? "Pick a sticker, then tap where it should go." : ui.tool === "erase" ? "Rub to erase. Tap a sticker or a person to take it away." : ui.tool === "move" ? "Tap something to pick it up, then drag it. The corner handle makes it bigger or smaller; the top handle turns it." : ui.tool === "text" ? "Type your words, pick a font, then tap where they should go. Tap words already on the page to change them." : ui.tool === "joint" ? "Tap an arm, leg, tail or wing: a pin appears where it joins the body. Or draw a ring round a part to cut it free and pin it." : "");
  ui.pick = []; ui.joint = null; ui.jadd = false; ui.jbend = false; ui.jshow = performance.now() + 2600; paint(); if (drawing()) { paintLayer(A, strokes()); render(); } });
$("shapes").innerHTML = SHAPES.map(([v, label]) => `<button class="g-chip shp" data-shape="${v}" aria-label="${label}"><span aria-hidden="true">${SHAPE_ICON[v]}</span></button>`).join("");
$("shapes").addEventListener("click", (e) => { const b = e.target.closest(".g-chip"); if (b) { ui.shape = b.dataset.shape; paint(); } });
// stickers: pick a set, then a sticker; sets that usually face left are mirrored so they face right
const sticker = (x, y) => {
  const set = STICKERS.find((k) => k.id === ui.set) || STICKERS[0], mirror = !!set.turn !== ui.flip, at2 = [Math.round(x), Math.round(y)];
  if (set.drawn) { const lk = look(ui.person); return { fig: ui.person, sk: lk.sk, hc: lk.hc, ...(lk.tc ? { tc: lk.tc } : {}), ...(lk.bc ? { bc: lk.bc } : {}), w: PERSON_SIZE[data.size] || 130, p: at2, ...(mirror ? { m: 1 } : {}) }; }
  return { ch: ui.sticker, w: STICKER_SIZE[data.size] || 72, p: at2, ...(mirror ? { m: 1 } : {}) };
};
// Each hand-drawn figure keeps its own colours: choosing a skin tone or a colour changes the chosen figure only.
// Until a figure has been given a skin tone, the figures show the whole range of tones between them.
const FIGURES = [...PEOPLE, ...CHARACTERS, ...ANIMALS];
function look(id) {
  const own = (data.looks || {})[id] || {}, n = Math.max(0, FIGURES.findIndex((d) => d.id === id));
  return { sk: own.sk ?? n % SKINS.length, hc: own.hc ?? -1, tc: own.tc || null, bc: own.bc || null };
}
function setLook(key, value) {
  if (!data.looks) data.looks = {};
  const own = data.looks[ui.person] || (data.looks[ui.person] = {});
  if (value === null || value === undefined || value === "") delete own[key]; else own[key] = value;
  save(); stickerGrid(); paint();
}
function stickerGrid() {
  const set = STICKERS.find((k) => k.id === ui.set) || STICKERS[0];
  if (set.drawn) { // hand-drawn people and characters: a little picture of each, in the chosen skin tone and colours
    const figures = set.drawn === "characters" ? CHARACTERS : set.drawn === "animals" ? ANIMALS.filter((d) => !!d.walk === !!set.walk) : PEOPLE;
    if (!figures.some((d) => d.id === ui.person)) ui.person = figures[0].id;
    $("stickGrid").innerHTML = figures.map((d) => `<button class="stk person" data-fig="${d.id}" aria-label="${d.name}" aria-pressed="false"><canvas width="112" height="140" aria-hidden="true"></canvas></button>`).join("");
    $("stickGrid").querySelectorAll(".stk").forEach((b) => { const g = b.querySelector("canvas").getContext("2d"); g.translate(56, 70); const lk = look(b.dataset.fig); drawPerson(g, { fig: b.dataset.fig, sk: lk.sk, hc: lk.hc, tc: lk.tc, bc: lk.bc }, set.drawn === "people" ? 128 : 108); });
  } else {
    $("stickGrid").innerHTML = set.list.map((ch) => `<button class="stk" data-ch="${ch}" aria-pressed="false">${ch}</button>`).join("");
    if (!set.list.includes(ui.sticker)) ui.sticker = set.list[0];
  }
  $("stickGrid").classList.toggle("people", !!set.drawn);
}
$("skins").innerHTML = SKINS.map(([c, name], i) => `<button class="sw" data-sk="${i}" style="background:${c}" aria-label="${name} skin"></button>`).join("");
$("hairs").innerHTML = `<button class="sw mixed" data-hc="-1" aria-label="Mixed hair colours"></button>` + HAIRS.map(([c, name], i) => `<button class="sw" data-hc="${i}" style="background:${c}" aria-label="${name} hair"></button>`).join("");
// clothes: the figure's own colours, or one the child picks for the top and one for the bottom
for (const [id, key, word] of [["tops", "top", "top"], ["bots", "bot", "bottom"]]) {
  $(id).innerHTML = `<button class="sw mixed own" data-c="" aria-label="This figure's own ${word}"></button>` + COLORS.map((c, i) => `<button class="sw" data-c="${c}" style="background:${c}" aria-label="${COLOR_NAMES[i]} ${word}"></button>`).join("");
  $(id).addEventListener("click", (e) => { const b = e.target.closest(".sw"); if (b) setLook(key === "top" ? "tc" : "bc", b.dataset.c || null); });
}
$("skins").addEventListener("click", (e) => { const b = e.target.closest(".sw"); if (b) setLook("sk", Number(b.dataset.sk)); });
$("hairs").addEventListener("click", (e) => { const b = e.target.closest(".sw"); if (b) { const v = Number(b.dataset.hc); setLook("hc", v < 0 ? null : v); } });
$("stickSets").innerHTML = STICKERS.map((k) => `<button class="g-chip" data-set="${k.id}"><span aria-hidden="true">${k.icon}</span> ${k.name}</button>`).join("");
$("stickSets").addEventListener("click", (e) => { const b = e.target.closest(".g-chip"); if (b) { ui.set = b.dataset.set; ui.flip = false; stickerGrid(); paint(); const row = $("stickSets"); row.scrollLeft = Math.max(0, b.offsetLeft - row.clientWidth / 2 + b.offsetWidth / 2); } }); // keep the chosen kind in view on a narrow screen
$("stickGrid").addEventListener("click", (e) => { const b = e.target.closest(".stk"); if (!b) return; if (b.dataset.fig) ui.person = b.dataset.fig; else ui.sticker = b.dataset.ch; paint(); });
$("stickFlip").addEventListener("change", () => { ui.flip = $("stickFlip").checked; });
stickerGrid();
// ---------- the Text tool ----------
const words = (x, y) => fitText({ tx: $("textIn").value.replace(/\s+$/, "").split("\n").slice(0, 4).join("\n"), f: ui.font || "round", c: data.color, w: TEXT_SIZE[data.size] || 42, p: [Math.round(x), Math.round(y)] });
function textAt(x, y) {
  const list = strokes(), i = itemAt(list, x, y, 4);
  if (i >= 0 && list[i].tx) { // a tap on words that are already there: choose them, to change them
    ui.textPick = list[i]; $("textIn").value = list[i].tx; ui.font = list[i].f;
    note("Chosen. Type to change the words, or pick another font, colour or size. Use Move to slide, resize or turn them.");
    paint(); render(); return;
  }
  if (!$("textIn").value.trim()) { note("Type your words in the box first, then tap where they should go."); $("textIn").focus(); return; }
  ui.textPick = null; ui.from = [x, y]; ui.live = words(x, y); render();
}
/** The chosen words take up whatever has just been typed or picked. */
function textApply(change) {
  const s = ui.textPick;
  if (!s || !strokes().includes(s)) return;
  change(s); fitText(s); redraw();
}
chips("fonts", FONTS.map(([id, label]) => [id, label]), "font");
document.querySelectorAll("#fonts .g-chip").forEach((b) => { b.style.font = (FONTS.find((f) => f[0] === b.dataset.font) || FONTS[0])[2].replace("SIZE", "17px"); });
$("fonts").addEventListener("click", (e) => { const b = e.target.closest(".g-chip"); if (!b) return; ui.font = b.dataset.font; textApply((s) => { s.f = ui.font; }); paint(); });
$("textIn").addEventListener("input", () => { const v = $("textIn").value.replace(/\s+$/, "").split("\n").slice(0, 4).join("\n"); if (v) textApply((s) => { s.tx = v; }); });
$("textNew").addEventListener("click", () => { ui.textPick = null; $("textIn").value = ""; $("textIn").focus(); note("Type the new words, then tap where they should go."); paint(); render(); });

// ---------- the Joints tool: pin a part of a pen drawing, and it swings from the pin when the animation plays ----------
const jkey = (s) => (s.j ? s.jg || 0 : null); // which joint a stroke belongs to
const jointParts = () => (ui.joint === null || ui.joint === undefined ? [] : strokes().filter((s) => jkey(s) === ui.joint));
const pins = () => { const seen = new Map(); strokes().forEach((s) => { if (s.j && !seen.has(jkey(s))) seen.set(jkey(s), s.j); }); return seen; };
const jointWas = (s) => ({ s, j: s.j && s.j.slice(), ja: s.ja, jn: s.jn, jg: s.jg, jx: s.jx && s.jx.map((e) => e.slice()) });
const elbowWas = (s) => ({ ...jointWas(s), p: s.p.slice() }); // putting an elbow on a line may add a point to it
const unpin = (s) => { delete s.j; delete s.ja; delete s.jn; delete s.jg; delete s.jx; };
const elbows = () => { const seen = new Map(), out = []; strokes().forEach((s) => { if (s.j && s.jx && !seen.has(jkey(s))) { seen.set(jkey(s), 1); s.jx.forEach((e, n) => out.push([jkey(s), n, e])); } }); return out; }; // every elbow and knee: [its joint, which one, [x, y, flip]]
const elbowCount = () => { const lead = jointParts()[0]; return lead && lead.jx ? lead.jx.length : 0; };
const elbowNow = () => { const n = elbowCount(); return n ? Math.min(n - 1, ui.jel ?? n - 1) : -1; }; // the elbow the buttons act on: the one last touched
/**
 * Puts an elbow or knee on the chosen joint's part, at the place nearest (x, y): a new one, or (given `which`) one
 * that is being moved. False if that place is not on the part.
 */
function setElbow(x, y, which = -1) {
  const parts = jointParts(), lines = parts.filter((s) => !s.ch && !s.fig && !s.tx && s.p.length >= 4);
  let best = null, on = null;
  lines.forEach((s) => { const n = nearestOn(s, x, y); if (!best || n.d < best.d) { best = n; on = s; } });
  if (!best || best.d > 34) return false;
  const pt = [Math.round(best.x), Math.round(best.y)], i = best.i;
  if (Math.hypot(on.p[i] - pt[0], on.p[i + 1] - pt[1]) > 5 && Math.hypot(on.p[i + 2] - pt[0], on.p[i + 3] - pt[1]) > 5) on.p.splice(i + 2, 0, pt[0], pt[1]); // a straight line needs a point there, to bend at
  // a first guess at which way a new one folds, for a figure facing right: a leg's knee lets the foot go back, an
  // arm's elbow brings the hand forward. A second one on the same part folds the same way as the first.
  const box = bbox(strokes()), had = parts[0].jx || [], flip = had.length ? had[0][2] : box && parts[0].j[1] < box.cy ? 1 : 0;
  parts.forEach((s) => { if (!s.jx) s.jx = []; if (which >= 0) s.jx[which] = [pt[0], pt[1], s.jx[which][2]]; else s.jx.push([pt[0], pt[1], flip]); });
  ui.jel = which >= 0 ? which : parts[0].jx.length - 1;
  return true;
}
/** A dotted box round the words that are being changed. */
function textOverlay() { const s = ui.textPick; if (!s || !strokes().includes(s)) return; const b = bbox([s]); ctx.save(); ctx.lineWidth = 2; ctx.setLineDash([3, 6]); ctx.strokeStyle = "#cf9410"; ctx.strokeRect(b.x0 - 5, b.y0 - 5, b.w + 10, b.h + 10); ctx.restore(); }
/** The pins, and the ring being drawn, on top of the drawing while the Joints tool is open. */
function jointOverlay() { drawPins(); const la = ui.lasso; if (la && la.moved) { ctx.save(); ctx.lineWidth = 3; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.setLineDash([3, 9]); ctx.strokeStyle = "#f5a623"; ctx.beginPath(); ctx.moveTo(la.pts[0], la.pts[1]); for (let k = 2; k < la.pts.length; k += 2) ctx.lineTo(la.pts[k], la.pts[k + 1]); ctx.closePath(); ctx.stroke(); ctx.restore(); } }
function drawPins() {
  for (const [k, pt] of pins()) {
    const on = k === ui.joint;
    ctx.save(); ctx.beginPath(); ctx.arc(pt[0], pt[1], on ? 12 : 8, 0, 7); ctx.fillStyle = on ? "#ffd15a" : "#ffffff"; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = "#8a6208"; ctx.stroke();
    ctx.beginPath(); ctx.arc(pt[0], pt[1], 2.5, 0, 7); ctx.fillStyle = "#8a6208"; ctx.fill(); ctx.restore();
  }
  if (!ui.jraf) for (const [k, n, pt] of elbows()) { // elbows and knees: smaller, blue (hidden while the part is swinging away from them)
    const on = k === ui.joint && n === elbowNow();
    ctx.save(); ctx.beginPath(); ctx.arc(pt[0], pt[1], on ? 9 : 6, 0, 7); ctx.fillStyle = on ? "#7cc4ff" : "#e0f2fe"; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = "#1d4ed8"; ctx.stroke(); ctx.restore();
  }
}
// after every change the drawing swings for a few seconds, so the child sees at once what each pin does; then it
// settles, so that the pins sit on the lines again and are easy to take hold of
function jointTick() {
  if (!(drawing() && ui.tool === "joint") || calm() || performance.now() > (ui.jshow || 0)) { ui.jraf = 0; if (drawing()) { paintLayer(A, strokes()); render(); } return; }
  paintLayer(A, strokes(), { t: performance.now() / 1000, go: true }); render();
  ui.jraf = requestAnimationFrame(jointTick);
}
function paintJoints() {
  const parts = jointParts(), lead = parts[0];
  if (!lead) { ui.joint = null; ui.jadd = false; }
  press("jamps", "amp", String(lead ? lead.ja ?? 1 : ui.jamp ?? 1));
  $("jOpp").checked = !!(lead && lead.jn); $("jOpp").disabled = !lead; $("jRemove").disabled = !lead; $("jAdd").disabled = !lead;
  $("jAdd").setAttribute("aria-pressed", String(!!ui.jadd));
  if (!lead) ui.jbend = false;
  $("jBend").disabled = !lead; $("jBend").setAttribute("aria-pressed", String(!!ui.jbend)); $("jBend").textContent = elbowCount() ? "➕ Add another elbow or knee" : "➕ Add elbow or knee";
  const en = elbowNow();
  $("jUnbend").disabled = en < 0; $("jFlip").disabled = en < 0; $("jFlip").checked = en >= 0 && !!lead.jx[en][2];
  if (!ui.jraf && !calm() && drawing() && performance.now() < (ui.jshow || 0)) ui.jraf = requestAnimationFrame(jointTick);
}
function jointShow(swing = true) { ui.jshow = swing ? performance.now() + 2600 : 0; paint(); if (!ui.jraf) { paintLayer(A, strokes()); render(); } if (!scene()) { thumb(ui.frame); save(); } }
function jointAt(x, y) {
  const list = strokes();
  if (ui.jbend && jointParts().length) { // putting an elbow or knee on the chosen part
    const was = jointParts().map(elbowWas);
    if (!setElbow(x, y)) { note("Tap on the arm or leg itself, part-way along it."); return; }
    did({ k: "joint", was }); ui.jbend = false;
    if (elbowCount() > 1) { note(`${elbowCount()} bends on this part. Drag a blue pin to move it; the buttons work on the one you touched last.`); jointShow(); return; }
    note("It bends there too, one way only. If it folds the wrong way, tick Bends the other way."); jointShow(); return;
  }
  const bent = elbows().filter(([, , pt]) => Math.hypot(x - pt[0], y - pt[1]) <= 16).sort((a, b) => (b[0] === ui.joint) - (a[0] === ui.joint) || Math.hypot(x - a[2][0], y - a[2][1]) - Math.hypot(x - b[2][0], y - b[2][1]));
  if (bent.length && !ui.jadd) { ui.joint = bent[0][0]; ui.jel = bent[0][1]; ui.jdrag = { elbow: bent[0][1], was: jointParts().map(elbowWas), moved: false, x, y }; note("Elbow or knee chosen. Drag it along the part to move it."); jointShow(false); return; }
  if (ui.jadd && jointParts().length) { // adding lines to (or taking them off) the chosen joint
    const i = strokeNear(list, x, y), parts = jointParts(), lead = parts[0];
    if (i < 0) { note("Tap a line that belongs to the same part."); return; }
    const s = list[i];
    if (jkey(s) === ui.joint) {
      if (parts.length < 2) { note("That is the only line on this joint. Use Remove joint to take the joint away."); return; }
      did({ k: "joint", was: [jointWas(s)] }); unpin(s);
    } else { did({ k: "joint", was: [jointWas(s)] }); s.j = lead.j.slice(); s.ja = lead.ja; s.jg = lead.jg; if (lead.jn) s.jn = 1; else delete s.jn; if (lead.jx) s.jx = lead.jx.map((e) => e.slice()); else delete s.jx; }
    const n = jointParts().length; note(`${n} ${n === 1 ? "line swings" : "lines swing"} from this joint. Tap Add lines to it again when you have finished.`);
    jointShow(); return;
  }
  // a pin: choose it and take hold of it, so it can be dragged to a better place. Where two pins sit together, each tap takes the other one.
  const near = [...pins()].filter(([, pt]) => Math.hypot(x - pt[0], y - pt[1]) <= 18).sort((a, b) => (a[0] === ui.joint) - (b[0] === ui.joint));
  if (near.length) { ui.joint = near[0][0]; ui.jdrag = { was: jointParts().map(jointWas), moved: false, x, y }; note("Joint chosen. Drag the pin to move it, change how far it swings, add more lines to it, or remove it."); jointShow(false); return; }
  ui.lasso = { pts: [x, y], x, y, moved: false }; // a tap pins a line; a ring drawn round part of the drawing pins what is inside it
}
/** A tap on the drawing: pin the line that was tapped, or choose its joint. */
function jointTap(x, y) {
  const list = strokes();
  const i = strokeNear(list, x, y);
  if (i < 0) { ui.joint = null; note(list.length ? "Tap an arm, a leg, a tail or a wing of your drawing." : "Draw something with the pen first, then come back to pin its arms and legs."); jointShow(); return; }
  const s = list[i];
  if (s.j) { ui.joint = jkey(s); note("Joint chosen. Drag the pin to move it, change how far it swings, add more lines to it, or remove it."); jointShow(false); return; }
  const long = (q) => (q.e || q.ch || q.fig || q.tx ? 0 : pathLength(q.p)); // a line that is most of the drawing is the body, not an arm
  if (list.filter((q) => !q.e).length < 2 || long(s) > 0.6 * list.reduce((m, q) => m + long(q), 0)) { note("That line is most of your drawing. Draw a ring round the part of it that should move, an arm or a leg, and it will be cut free and pinned."); return; }
  did({ k: "joint", was: [jointWas(s)] });
  const others = pins().size; // every other pin swings the opposite way, so two legs take turns
  s.j = hingeOf(list, i); s.ja = ui.jamp ?? 1; s.jg = 1 + list.reduce((m, q) => Math.max(m, q.jg || 0), 0); if (others % 2) s.jn = 1; else delete s.jn;
  ui.joint = jkey(s);
  note("Pinned where it joins the body! Drag the pin if it is in the wrong place. Tap another part to pin it too.");
  jointShow();
}
/**
 * A ring drawn round part of the drawing: everything inside becomes one part with its own pin. A line that is only
 * partly inside is cut where it crosses the ring, so a figure drawn in a single line can bend too.
 */
function jointRing(loop) {
  const list = strokes(), live = list.filter((s) => !s.e);
  const plan = list.map((s) => {
    if (s.e) return null;
    if (s.ch || s.fig || s.p.length < 4) return inside(loop, s.p[0], s.p[1]) ? { all: true } : null;
    const c = cutByLoop(s.p, loop);
    if (c.none) return null;
    if (c.pieces && s.ff) return { filled: true }; // cutting an outline would spill its colour
    return c;
  });
  const whole = plan.filter((c) => c && c.all).length, cut = plan.filter((c) => c && c.pieces).length;
  if (!whole && !cut) { note(plan.some((c) => c && c.filled) ? "A coloured-in shape cannot be cut. Draw the ring round a line, or round the whole shape." : "Draw a ring round the part that should move: an arm, a leg or a tail."); return; }
  if (whole === live.length) { note("Leave the body outside the ring: only the part that should move goes inside."); return; }
  const jg = 1 + list.reduce((m, q) => Math.max(m, q.jg || 0), 0), others = pins().size, cuts = [], ops = [], was = [], part = [];
  const join = (s) => { unpin(s); s.ja = ui.jamp ?? 1; s.jg = jg; if (others % 2) s.jn = 1; part.push(s); };
  for (let i = list.length - 1; i >= 0; i -= 1) { // from the top down, so that the places of the lines below do not change
    const c = plan[i], old = list[i];
    if (!c || c.filled) continue;
    if (c.all) { was.push(jointWas(old)); join(old); continue; }
    const made = c.pieces.map((pc) => { const s = { ...old, p: pc.p }; if (old.jx) s.jx = old.jx.map((e) => e.slice()); if (old.j) s.j = old.j.slice(); if (pc.in) join(s); return s; }); // the pieces left outside keep any joint the line already had
    list.splice(i, 1, ...made); ops.push({ i, n: made.length, old }); cuts.push(...c.cuts);
  }
  // the pin goes where the part was cut from the rest; a part made only of whole lines is pinned where it touches the rest
  let pin;
  if (cuts.length) pin = [Math.round(cuts.reduce((m, c) => m + c[0], 0) / cuts.length), Math.round(cuts.reduce((m, c) => m + c[1], 0) / cuts.length)];
  else { part.forEach((s) => { s.j = [0, 0]; }); pin = hingeOf(list, list.indexOf(part.find((s) => !s.ch && !s.fig) || part[0]), (o) => o.jg === jg); }
  part.forEach((s) => { s.j = pin.slice(); });
  did({ k: "ring", ops, was });
  ui.joint = jg; ui.jel = undefined;
  note(cut ? "Cut free and pinned! This part swings from the pin. Drag the pin if it is in the wrong place." : "Pinned together! Everything in the ring swings from the pin.");
  jointShow();
}
function jointDrag(x, y) {
  const dr = ui.jdrag; if (!dr.moved && Math.hypot(x - dr.x, y - dr.y) < 5) return;
  dr.moved = true; jointParts().forEach((s) => { if (dr.elbow === undefined) s.j = [Math.round(x), Math.round(y)]; else s.jx[dr.elbow] = [Math.round(x), Math.round(y), s.jx[dr.elbow][2]]; });
  if (!ui.jraf) { paintLayer(A, strokes()); render(); }
}
function jointDrop() {
  const dr = ui.jdrag; ui.jdrag = null;
  if (!dr.moved) return;
  if (dr.elbow !== undefined && !setElbow(jointParts()[0].jx[dr.elbow][0], jointParts()[0].jx[dr.elbow][1], dr.elbow)) { dr.was.forEach((o) => { o.s.jx = o.jx.map((e) => e.slice()); }); note("Keep the elbow or knee on the arm or leg."); jointShow(); return; } // dropped off the part: back where it was
  did({ k: "joint", was: dr.was }); jointShow();
}
function jointSet(change) { const parts = jointParts(); if (!parts.length) return; did({ k: "joint", was: parts.map(jointWas) }); parts.forEach(change); jointShow(); }
chips("jamps", JOINTS.map(([label], i) => [String(i), label]), "amp");
$("jamps").addEventListener("click", (e) => { const b = e.target.closest(".g-chip"); if (!b) return; ui.jamp = Number(b.dataset.amp); if (jointParts().length) jointSet((s) => { s.ja = ui.jamp; }); else paint(); });
$("jOpp").addEventListener("change", () => { const on = $("jOpp").checked; jointSet((s) => { if (on) s.jn = 1; else delete s.jn; }); });
$("jAdd").addEventListener("click", () => { ui.jadd = !ui.jadd; ui.jbend = false; note(ui.jadd ? "Tap the other lines that belong to this part (a hand, a foot). Tap one again to take it off." : ""); paint(); });
$("jBend").addEventListener("click", () => { ui.jbend = !ui.jbend; ui.jadd = false; note(ui.jbend ? "Tap the part where it should bend: an elbow, a knee, or one more curl of a tail." : ""); paint(); });
$("jFlip").addEventListener("change", () => { const on = $("jFlip").checked ? 1 : 0, n = elbowNow(); if (n >= 0) jointSet((s) => { s.jx[n][2] = on; }); });
$("jUnbend").addEventListener("click", () => { const n = elbowNow(); if (n < 0) return; jointSet((s) => { s.jx.splice(n, 1); if (!s.jx.length) delete s.jx; }); ui.jel = undefined; ui.jbend = false; note("Elbow or knee removed."); jointShow(); });
$("jRemove").addEventListener("click", () => { jointSet(unpin); ui.joint = null; ui.jadd = false; note("Joint removed."); jointShow(); });

// ---------- the Move tool: pick up a line, shape, sticker or person; drag it, or drag its corner handle to resize ----------
const keep = (idx) => idx.map((i) => { const s2 = strokes()[i]; return { s: s2, p: s2.p.slice(), w: s2.w, r: s2.r, j: s2.j && s2.j.slice(), jx: s2.jx && s2.jx.map((e) => e.slice()) }; });
const putBack = (o, n) => { o.s.p = n.p; o.s.w = n.w; if (n.r) o.s.r = n.r; else delete o.s.r; if (n.j) o.s.j = n.j; if (n.jx) o.s.jx = n.jx; }; // a part's pins go with it
function redraw() { paintLayer(A, strokes()); if (!scene()) { thumb(ui.frame); save(); } render(); }
function grabAt(x, y) {
  const list = strokes(), box = pickBox();
  if (box && onTurn(box, x, y)) { ui.grab = { turn: true, cx: box.cx, cy: box.cy, a0: Math.atan2(y - box.cy, x - box.cx), was: keep(picked()), moved: false }; return; }
  if (box && onHandle(box, x, y)) { ui.grab = { size: true, ax: box.x0, ay: box.y0, from: Math.max(20, Math.hypot(x - box.x0, y - box.y0)), was: keep(picked()), moved: false }; return; }
  const i = itemAt(list, x, y);
  if (!ui.all) { ui.pick = i >= 0 ? [i] : []; paint(); }
  if (i >= 0 || (ui.all && list.length)) ui.grab = { x, y, was: keep(picked()), moved: false };
  render();
}
function grabMove(x, y) {
  const gr = ui.grab;
  if (gr.turn) {
    const a = Math.atan2(y - gr.cy, x - gr.cx) - gr.a0;
    gr.was.forEach((o) => { const [n] = turned([{ ...o.s, p: o.p, w: o.w, r: o.r, j: o.j, jx: o.jx }], a, gr.cx, gr.cy); putBack(o, n); });
  } else if (gr.size) {
    const k = Math.max(0.15, Math.min(8, Math.hypot(x - gr.ax, y - gr.ay) / gr.from));
    gr.was.forEach((o) => { const [n] = scaled([{ ...o.s, p: o.p, w: o.w, j: o.j, jx: o.jx }], k, gr.ax, gr.ay); o.s.p = n.p; o.s.w = n.w; if (n.j) o.s.j = n.j; if (n.jx) o.s.jx = n.jx; });
  } else { const dx = x - gr.x, dy = y - gr.y; gr.was.forEach((o) => { o.s.p = o.p.map((v, i) => Math.round((v + (i % 2 ? dy : dx)) * 10) / 10); const go = (e) => [Math.round((e[0] + dx) * 10) / 10, Math.round((e[1] + dy) * 10) / 10]; if (o.j) o.s.j = go(o.j); if (o.jx) o.s.jx = o.jx.map((e) => [...go(e), e[2]]); }); }
  gr.moved = true;
  paintLayer(A, strokes()); render();
}
function grabEnd() {
  const gr = ui.grab; ui.grab = null;
  if (gr.moved) { did({ k: "edit", was: gr.was }); if (!scene()) { thumb(ui.frame); save(); } }
  render();
}
function resizePicked(k) {
  const idx = picked(), box = pickBox();
  if (!box) return;
  const was = keep(idx);
  was.forEach((o) => { const [n] = scaled([o.s], k, box.cx, box.cy); o.s.p = n.p; o.s.w = n.w; if (n.j) o.s.j = n.j; if (n.jx) o.s.jx = n.jx; });
  did({ k: "edit", was }); redraw();
}
function turnPicked(a) {
  const idx = picked(), box = pickBox();
  if (!box) return;
  const was = keep(idx);
  was.forEach((o) => { const [n] = turned([o.s], a, box.cx, box.cy); putBack(o, n); });
  did({ k: "edit", was }); redraw();
}
$("mLeft").addEventListener("click", () => turnPicked(-Math.PI / 12));
$("mRight").addEventListener("click", () => turnPicked(Math.PI / 12));
$("mSmaller").addEventListener("click", () => resizePicked(1 / 1.2));
$("mBigger").addEventListener("click", () => resizePicked(1.2));
$("mCopy").addEventListener("click", () => {
  const list = strokes(), idx = picked();
  if (!idx.length) return;
  const copies = idx.map((i) => { const c = JSON.parse(JSON.stringify(list[i])); c.p = c.p.map((v) => v + 30); if (c.j) c.j = c.j.map((v) => v + 30); if (c.jx) c.jx = c.jx.map((e) => [e[0] + 30, e[1] + 30, e[2]]); return c; });
  list.push(...copies); copies.forEach(() => did({ k: "add" }));
  ui.all = false; ui.pick = copies.map((_, k) => list.length - copies.length + k);
  paint(); redraw();
});
$("mRemove").addEventListener("click", () => {
  const list = strokes(), gone = picked().map((i) => ({ i, s: list[i] }));
  if (!gone.length) return;
  for (let k = gone.length - 1; k >= 0; k -= 1) list.splice(gone[k].i, 1);
  did({ k: "rub", gone, added: false }); ui.pick = [];
  paint(); redraw();
});
$("moveAll").addEventListener("change", () => { ui.all = $("moveAll").checked; ui.pick = []; paint(); render(); });

// Fill: colour in the top-most outline the tap is inside
function fillAt(x, y) {
  const list = strokes(), i = fillTarget(list, x, y);
  if (i < 0) { note("Tap inside a shape or an outline you have drawn. Draw all the way round to close it."); return; }
  did({ k: "fill", s: list[i], was: list[i].ff });
  list[i].ff = data.color; note("");
  paintLayer(A, list); if (!scene()) { thumb(ui.frame); save(); } render();
}
// what Undo takes back: the last thing added, or the last fill
let past = [];
function did(step) { past.push(step); if (past.length > 60) past.shift(); }
function undo() {
  const list = strokes(), step = past.pop();
  ui.pick = [];
  if (step && step.k === "fill" && list.includes(step.s)) { if (step.was) step.s.ff = step.was; else delete step.s.ff; }
  else if (step && step.k === "ring") { [...step.ops].reverse().forEach((o) => list.splice(o.i, o.n, o.old)); step.was.forEach((o) => { for (const key of ["j", "ja", "jn", "jg", "jx"]) { if (o[key] === undefined) delete o.s[key]; else o.s[key] = o[key]; } }); ui.joint = null; paint(); } // lines that were cut are whole again
  else if (step && step.k === "joint") { step.was.forEach((o) => { for (const key of ["j", "ja", "jn", "jg", "jx"]) { if (o[key] === undefined) delete o.s[key]; else o.s[key] = o[key]; } if (o.p) o.s.p = o.p; }); ui.joint = null; paint(); } // a pin put in, moved or taken out
  else if (step && step.k === "edit") step.was.forEach((o) => putBack(o, o)); // put back where, the size and the way round it was
  else if (step && step.k === "rub") { if (step.added && list.length) list.pop(); step.gone.forEach(({ i, s: back }) => list.splice(Math.min(i, list.length), 0, back)); } // stickers the eraser took come back
  else if (list.length) list.pop();
  else return;
  paintLayer(A, list); if (!scene()) { thumb(ui.frame); save(); } render();
}
$("undo").addEventListener("click", undo);
$("clear").addEventListener("click", () => { past = []; ui.pick = []; strokes().length = 0; paintLayer(A, strokes()); if (!scene()) { thumb(ui.frame); save(); } render(); });

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
  ui.pick = []; past = [];
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
/** Pages are made between this page and the next, with everything part of the way from where it is here to where it is there. */
function fillBetween() {
  const pages = data.flip.frames, i = ui.frame, n = ui.tweenN || 2;
  if (i >= pages.length - 1) { note("Go to a page that has another page after it. The new pages go between the two."); return; }
  if (!tweenMoves(pages[i], pages[i + 1])) { note("Nothing moves from this page to the next, so there is nothing to fill in. Use Copy page, then slide, resize or turn something with Move."); return; }
  if (pages.length + n > MAX_FRAMES) { note(`There is no room: a flipbook can hold ${MAX_FRAMES} pages.`); return; }
  const made = Array.from({ length: n }, (_, k) => between(pages[i], pages[i + 1], (k + 1) / (n + 1)));
  pages.splice(i + 1, 0, ...made); data.flip.bgs.splice(i + 1, 0, ...made.map(() => bgOf(i)));
  note(`${n} ${n === 1 ? "page" : "pages"} added between page ${i + 1} and what is now page ${i + n + 2}. Things glide more smoothly there now.`);
  save(); syncFlip(); paint(); render();
}
chips("tweenN", [["1", "1"], ["2", "2"], ["3", "3"]], "n");
$("tweenN").addEventListener("click", (e) => { const b = e.target.closest(".g-chip"); if (b) { ui.tweenN = Number(b.dataset.n); paint(); } });
$("tween").addEventListener("click", fillBetween);
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
$("flipStep").addEventListener("change", () => { data.flip.step = $("flipStep").checked; save(); syncFlip(); render(); });
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
  else { await download(cv, "draw-and-animate.png"); note("Your picture has been saved to your Downloads as draw-and-animate.png."); }
  $("note").scrollIntoView({ block: "nearest", behavior: "smooth" });
  ui.clean = false; if (ui.state !== "play") render();
});
let recording = false;
// the picture comes from the canvas; the sound (the tune and the page flicks) is tapped from the audio and recorded with it
const KINDS = ["video/mp4;codecs=avc1,mp4a.40.2", "video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/mp4", "video/webm"];
const VIDEO = window.MediaRecorder && cv.captureStream ? KINDS.find((m) => { try { return MediaRecorder.isTypeSupported(m); } catch (err) { return false; } }) : "";
$("saveVid").hidden = !VIDEO;
$("saveVid").addEventListener("click", () => {
  if (recording) return;
  if (ui.state === "draw" || ui.state === "path") { note("Finish your drawing first."); return; }
  if (scene() ? !data.scene.things.length : data.flip.frames.length < 2) { note(scene() ? "Draw something first." : "A flipbook needs at least two pages."); return; }
  stop(); stopTune(); ui.sel = -1;
  const tuned = !data.muted && TUNES.some((t) => t.id === work().music);
  // long enough to hear some of the tune; a flipbook plays through at least twice
  const secs = scene() ? (tuned ? 10 : 6) : Math.min(12, Math.max(tuned ? 8 : 3, (data.flip.frames.length / data.flip.fps) * 2));
  let rec, tap = null;
  try {
    const stream = cv.captureStream(30), ac = !data.muted && window.z210Audio && window.z210Audio.get();
    if (ac && ac.createMediaStreamDestination) { tap = ac.createMediaStreamDestination(); tap.stream.getAudioTracks().forEach((tr) => stream.addTrack(tr)); }
    rec = new MediaRecorder(stream, { mimeType: VIDEO, videoBitsPerSecond: 2500000, audioBitsPerSecond: 128000 });
  } catch (err) { note("This browser could not record a video."); return; }
  const parts = [];
  recording = true; recTap = tap; $("saveVid").disabled = true;
  const done = () => { recording = false; recTap = null; $("saveVid").disabled = false; $("saveVid").textContent = "🎬 Save video"; stop(); };
  rec.ondataavailable = (ev) => { if (ev.data && ev.data.size) parts.push(ev.data); };
  rec.onerror = () => { done(); note("The recording stopped unexpectedly. Please try again."); };
  rec.onstop = () => {
    done();
    const type = VIDEO.split(";")[0], file = new File([new Blob(parts, { type })], `my-animation.${type === "video/mp4" ? "mp4" : "webm"}`, { type });
    if (!file.size) { note("The video came out empty. Please try again."); return; }
    window.__da.video = file;
    const keepFile = () => { const url = URL.createObjectURL(file), a = document.createElement("a"); a.download = file.name; a.href = url; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000); };
    if (!onTouchDevice()) {
      // a desktop or laptop: the video simply downloads, with a button in case the browser held it back
      keepFile();
      $("note").innerHTML = `Your video${tap ? ", with its sound," : ""} has been saved to your Downloads as <b>${file.name}</b>. <button class="g-btn ghost" id="keepVid">📥 Download again</button>`;
      $("keepVid").addEventListener("click", keepFile);
    } else {
      // a phone or tablet: a second tap is needed, because a page may only share or save a file straight after a tap
      $("note").innerHTML = `Your video is ready${tap ? ", with its sound" : ""}. <button class="g-btn" id="keepVid">📥 Save or share it</button>`;
      $("keepVid").addEventListener("click", async () => {
        try { if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: "My animation from Zone 210" }); note("Done!"); return; } } catch (err) { if (err && err.name === "AbortError") return; }
        keepFile(); note("Saved to your Downloads.");
      });
    }
    $("note").scrollIntoView({ block: "nearest", behavior: "smooth" }); // the message is below the tools, so bring it into view
  };
  play(); rec.start();
  let left = Math.ceil(secs);
  // the countdown shows on the button itself (at the top, where it was pressed) as well as in the message below
  const tell = () => { note(`Recording your video… ${left}`); $("saveVid").textContent = `⏺ Recording… ${left}`; };
  tell();
  const count = setInterval(() => { left -= 1; if (left > 0 && recording) tell(); else clearInterval(count); }, 1000);
  // the tune fades out just before the recording ends, so the video does not cut off mid-note
  setTimeout(() => { stopTune(); setTimeout(() => { try { rec.stop(); } catch (err) { done(); } }, 350); }, secs * 1000);
});

// ---------- start ----------
chips("moves", MOVES, "move"); chips("acts", ACTS, "act"); chips("speeds", SPEEDS, "speed"); // backgrounds are chosen from little pictures of themselves
for (const id of ["bgs", "fbgs"]) {
  $(id).classList.add("bggrid");
  $(id).innerHTML = BGS.map(([v, label]) => `<button class="g-chip bgsw" data-bg="${v}" aria-label="${label}"><canvas width="96" height="72" aria-hidden="true"></canvas><span>${label}</span></button>`).join("");
  $(id).querySelectorAll(".bgsw").forEach((b) => { const g = b.querySelector("canvas").getContext("2d"); g.setTransform(96 / W, 0, 0, 96 / W, 0, 0); drawBg(g, b.dataset.bg); });
} chips("fps", FPS, "fps");
if (!scene()) syncFlip();
fit();
paint();
window.__da = { data, ui, play, stop, render };
