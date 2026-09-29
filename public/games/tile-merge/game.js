import { newGame, move, isOver, highest, GOAL } from "./logic.js";

const $ = (id) => document.getElementById(id);
const boardEl = $("board");
const tilesEl = $("tiles");
const KEY_BEST = "gameroom_tilemerge_best";
const KEY_SAVE = "gameroom_tilemerge_save";

let state;
let history = [];
let els = new Map(); // tile id -> element
let best = Number(localStorage.getItem(KEY_BEST) || 0);
let animating = false;
let keepPlaying = false;

// background cells
const cells = boardEl.querySelector(".cells");
for (let i = 0; i < 16; i += 1) cells.appendChild(document.createElement("i"));

const valueClass = (v) => (v > 2048 ? "vbig" : `v${v}`);

function makeTile(t, cls = "") {
  const el = document.createElement("div");
  el.className = `tile ${valueClass(t.value)} ${cls}`.trim();
  el.style.setProperty("--r", t.r);
  el.style.setProperty("--c", t.c);
  el.innerHTML = `<div>${t.value}</div>`;
  tilesEl.appendChild(el);
  els.set(t.id, el);
  return el;
}

function setValue(el, value) {
  el.className = el.className.replace(/\b(v\d+|vbig)\b/, valueClass(value));
  el.firstElementChild.textContent = value;
}

function renderAll() {
  tilesEl.innerHTML = "";
  els = new Map();
  state.tiles.forEach((t) => makeTile(t));
  updateStats();
}

function updateStats() {
  $("score").textContent = state.score;
  if (state.score > best) {
    best = state.score;
    try {
      localStorage.setItem(KEY_BEST, String(best));
    } catch (err) {
      // storage unavailable
    }
  }
  $("best").textContent = best;
  $("top").textContent = highest(state);
  $("undo").disabled = history.length === 0;
}

function save() {
  try {
    localStorage.setItem(KEY_SAVE, JSON.stringify({ state, keepPlaying }));
  } catch (err) {
    // ignore
  }
}

function start(fresh = true) {
  $("end").classList.remove("show");
  keepPlaying = false;
  history = [];
  let restored = null;
  if (!fresh) {
    try {
      restored = JSON.parse(localStorage.getItem(KEY_SAVE) || "null");
    } catch (err) {
      restored = null;
    }
  }
  if (restored && restored.state && Array.isArray(restored.state.tiles) && !isOver(restored.state)) {
    state = restored.state;
    keepPlaying = !!restored.keepPlaying;
  } else {
    state = newGame();
  }
  animating = false;
  renderAll();
  save();
}

function doMove(dir) {
  if (animating || $("end").classList.contains("show")) return;
  const res = move(state, dir);
  if (!res.moved) return;
  animating = true;
  history.push(state);
  if (history.length > 30) history.shift();

  // slide survivors and absorbed tiles toward their destinations
  res.slides.forEach((s) => {
    const el = els.get(s.id);
    el.style.setProperty("--r", s.r);
    el.style.setProperty("--c", s.c);
  });
  res.absorbed.forEach((a) => {
    const el = els.get(a.id);
    el.style.setProperty("--r", a.r);
    el.style.setProperty("--c", a.c);
  });

  setTimeout(() => {
    res.absorbed.forEach((a) => {
      els.get(a.id)?.remove();
      els.delete(a.id);
    });
    res.slides.filter((s) => s.merged).forEach((s) => {
      const el = els.get(s.id);
      setValue(el, s.value);
      el.classList.remove("merge");
      void el.offsetWidth;
      el.classList.add("merge");
    });
    if (res.spawned) makeTile(res.spawned, "new");
    state = res.state;
    updateStats();
    save();
    animating = false;
    checkEnd();
  }, 130);
}

function checkEnd() {
  if (state.won && !keepPlaying) {
    $("endEmoji").textContent = "🎉";
    $("endTitle").textContent = `You reached ${GOAL}!`;
    $("endText").textContent = `Score ${state.score}. You can keep going for a higher tile.`;
    $("keepGoing").hidden = false;
    $("end").classList.add("show");
  } else if (isOver(state)) {
    $("endEmoji").textContent = "🧩";
    $("endTitle").textContent = "No more moves";
    $("endText").textContent = `Final score ${state.score}. Top tile ${highest(state)}.`;
    $("keepGoing").hidden = true;
    $("end").classList.add("show");
  }
}

function undo() {
  if (animating || history.length === 0) return;
  state = history.pop();
  $("end").classList.remove("show");
  renderAll();
  save();
}

// keyboard
const KEYS = { ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down", a: "left", d: "right", w: "up", s: "down" };
document.addEventListener("keydown", (e) => {
  const dir = KEYS[e.key];
  if (!dir || e.metaKey || e.ctrlKey || e.altKey) return;
  e.preventDefault();
  doMove(dir);
});

// swipe
let touch = null;
boardEl.addEventListener("pointerdown", (e) => {
  touch = { x: e.clientX, y: e.clientY };
  boardEl.setPointerCapture?.(e.pointerId);
});
boardEl.addEventListener("pointerup", (e) => {
  if (!touch) return;
  const dx = e.clientX - touch.x;
  const dy = e.clientY - touch.y;
  touch = null;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
  doMove(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up");
});

$("restart").addEventListener("click", () => start(true));
$("again").addEventListener("click", () => start(true));
$("undo").addEventListener("click", undo);
$("keepGoing").addEventListener("click", () => {
  keepPlaying = true;
  $("end").classList.remove("show");
  save();
});

start(false);
window.__tm = { get state() { return state; }, doMove };
