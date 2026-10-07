// Nonograms: use the number clues to fill in squares and reveal a hidden picture.
// Pictures in three sizes plus endless puzzles; fill and ✗ tools with drag painting; check, hints, and an online race.
import { PICTURES, SIZES, makePuzzle, cluesOf } from "./puzzles.js";
import { createOnline } from "../../assets/online.js";

const $ = (id) => document.getElementById(id);
const store = {
  get(key, fallback) { try { const raw = localStorage.getItem(key); return raw === null ? fallback : JSON.parse(raw); } catch (err) { return fallback; } },
  set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (err) { /* private mode */ } },
};
const KEY = "zone210_nonograms";
const saved = { size: "small", index: 0, solved: {}, muted: false, players: "1", ...store.get(KEY, {}) };
const save = () => store.set(KEY, saved);
const online = () => saved.players === "online";

let G = null; // { puz, n, cells: 0 empty / 1 filled / 2 marked, hints, mistakes, started, over }
let tool = 1, myRole = 0, friendPct = 0;
let cursor = [0, 0];

function tone(freqs, type = "sine", vol = 0.12) {
  if (saved.muted) return;
  const ac = window.z210Audio && window.z210Audio.get();
  if (!ac) return;
  freqs.forEach((f, i) => { const o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.value = f; const t = ac.currentTime + i * 0.08; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2); o.connect(g).connect(ac.destination); o.start(t); o.stop(t + 0.22); });
}
const tap = () => tone([700], "triangle", 0.05);
const line = () => tone([880, 1175], "sine", 0.08);
const win = () => tone([523, 659, 784, 1047, 1319]);
const no = () => tone([240, 190], "triangle");

// ---------- online race ----------
const net = createOnline({
  container: document.querySelector(".g-page"),
  before: $("stats"),
  prefix: "zone210-nono-",
  names: ["Player 1", "Player 2"],
  startInfo: () => ({ size: saved.size }),
  onStart: ({ role, seed, info }) => {
    myRole = role; friendPct = 0;
    if (info && SIZES[info.size]) { saved.size = info.size; syncChips(); }
    newGame(-1, seed); // races use an endless puzzle from the shared seed
  },
  onData: (m) => { if (m && typeof m.p === "number") { friendPct = m.p; stats(); if (m.done && G && !G.over) lose(); } },
  onLeft: () => setStatus("Your friend left the game."),
});

// ---------- game ----------
function newGame(index, seed = (Math.random() * 4294967296) >>> 0) {
  const puz = makePuzzle(saved.size, index, seed);
  const n = puz.grid.length;
  G = { puz, n, cells: Array.from({ length: n }, () => new Array(n).fill(0)), hints: 0, mistakes: 0, started: Date.now(), over: false, seed };
  cursor = [0, 0];
  $("result").hidden = true;
  build();
  stats();
  setStatus(online() && !net.active ? "Create or join a room to race a friend." : "Use the numbers to fill in the squares. Each number is a run of filled squares, in order.");
  $("title").textContent = index >= 0 ? `Puzzle ${index + 1} · ${n}×${n}${saved.solved[`${saved.size}:${index}`] ? ` · ${puz.name}` : ""}` : `Endless puzzle · ${n}×${n}`;
}
function build() {
  const { n, puz } = G;
  const board = $("board");
  board.style.setProperty("--n", n);
  board.style.setProperty("--maxrow", Math.max(...puz.rows.map((c) => c.length)));
  board.style.setProperty("--maxcol", Math.max(...puz.cols.map((c) => c.length)));
  let html = '<div class="corner"></div>';
  html += puz.cols.map((c, j) => `<div class="cclue" data-c="${j}">${c.map((x) => `<span>${x}</span>`).join("")}</div>`).join("");
  for (let i = 0; i < n; i += 1) {
    html += `<div class="rclue" data-r="${i}">${puz.rows[i].map((x) => `<span>${x}</span>`).join("")}</div>`;
    for (let j = 0; j < n; j += 1) html += `<div class="cell${j % 5 === 4 && j < n - 1 ? " vr" : ""}${i % 5 === 4 && i < n - 1 ? " hr" : ""}" data-r="${i}" data-c="${j}" role="gridcell" aria-label="Row ${i + 1}, column ${j + 1}: empty"></div>`;
  }
  board.innerHTML = html;
  board.setAttribute("aria-label", `Nonogram, ${n} by ${n}. Use the arrow keys to move, Space to fill, X to mark.`);
  paintAll();
}
const cellEl = (r, c) => $("board").querySelector(`.cell[data-r="${r}"][data-c="${c}"]`);
function paintCell(r, c) {
  const el = cellEl(r, c);
  const v = G.cells[r][c];
  el.className = `cell${c % 5 === 4 && c < G.n - 1 ? " vr" : ""}${r % 5 === 4 && r < G.n - 1 ? " hr" : ""}${v === 1 ? " fill" : v === 2 ? " mark" : ""}${cursor[0] === r && cursor[1] === c && $("board").contains(document.activeElement) ? " cur" : ""}`;
  el.setAttribute("aria-label", `Row ${r + 1}, column ${c + 1}: ${v === 1 ? "filled" : v === 2 ? "marked empty" : "empty"}`);
}
function lineDone(cells, clue) { const got = cluesOf(cells.map((v) => (v === 1 ? 1 : 0))); return got.length === clue.length && got.every((x, i) => x === clue[i]); }
function paintClues() {
  const { n, puz, cells } = G;
  for (let i = 0; i < n; i += 1) $("board").querySelector(`.rclue[data-r="${i}"]`).classList.toggle("ok", lineDone(cells[i], puz.rows[i]));
  for (let j = 0; j < n; j += 1) $("board").querySelector(`.cclue[data-c="${j}"]`).classList.toggle("ok", lineDone(cells.map((row) => row[j]), puz.cols[j]));
}
function paintAll() { for (let r = 0; r < G.n; r += 1) for (let c = 0; c < G.n; c += 1) paintCell(r, c); paintClues(); }
const pct = () => { let want = 0, got = 0; G.puz.grid.forEach((row, r) => row.forEach((v, c) => { if (v) { want += 1; if (G.cells[r][c] === 1) got += 1; } })); return Math.round((got / Math.max(1, want)) * 100); };
const solvedNow = () => G.puz.grid.every((row, r) => row.every((v, c) => (v === 1) === (G.cells[r][c] === 1)));
const clock = (t) => `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
function stats() {
  if (!G) return;
  const t = Math.floor((Date.now() - G.started) / 1000);
  $("stats").innerHTML = `<div class="g-stat"><span>Done</span><b>${pct()}%</b></div>${online() ? `<div class="g-stat"><span>Friend</span><b>${friendPct}%</b></div>` : `<div class="g-stat"><span>Hints</span><b>${G.hints}</b></div>`}<div class="g-stat"><span>Time</span><b>${clock(t)}</b></div>`;
}
setInterval(() => { if (G && !G.over) stats(); }, 1000);
const setStatus = (t) => { $("status").textContent = t; };
let sendT = 0;
function changed(r, c) {
  paintCell(r, c);
  const before = [...$("board").querySelectorAll(".ok")].length;
  paintClues();
  if ([...$("board").querySelectorAll(".ok")].length > before) line();
  if (online() && net.active) { clearTimeout(sendT); sendT = setTimeout(() => net.send({ p: pct() }), 250); }
  if (solvedNow()) finish();
}
function setCell(r, c, v) {
  if (G.over || (online() && !net.active) || G.cells[r][c] === v) return;
  G.cells[r][c] = v;
  changed(r, c);
}

// drag painting: the first square decides what the drag does (fill, mark, or clear)
let paint = null;
const board = $("board");
board.addEventListener("pointerdown", (e) => {
  const el = e.target.closest(".cell");
  if (!el || !G || G.over) return;
  e.preventDefault();
  const r = Number(el.dataset.r), c = Number(el.dataset.c);
  const t = e.button === 2 ? 2 : tool;
  paint = { v: G.cells[r][c] === t ? 0 : t, id: e.pointerId };
  try { board.setPointerCapture(e.pointerId); } catch (err) { /* synthetic */ }
  setCell(r, c, paint.v);
  tap();
});
board.addEventListener("pointermove", (e) => {
  if (!paint || paint.id !== e.pointerId) return;
  const el = document.elementFromPoint(e.clientX, e.clientY);
  const cell = el && el.closest && el.closest(".cell");
  if (cell && board.contains(cell)) setCell(Number(cell.dataset.r), Number(cell.dataset.c), paint.v);
});
const endPaint = () => { paint = null; stats(); };
board.addEventListener("pointerup", endPaint);
board.addEventListener("pointercancel", endPaint);
board.addEventListener("contextmenu", (e) => e.preventDefault());
// keyboard
board.addEventListener("keydown", (e) => {
  if (!G) return;
  const d = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }[e.key];
  const [r, c] = cursor;
  if (d) { e.preventDefault(); cursor = [(r + d[0] + G.n) % G.n, (c + d[1] + G.n) % G.n]; paintCell(r, c); paintCell(...cursor); return; }
  if (e.key === " " || e.key === "Enter") { e.preventDefault(); setCell(r, c, G.cells[r][c] === 1 ? 0 : 1); paintCell(r, c); }
  if (e.key.toLowerCase() === "x") { e.preventDefault(); setCell(r, c, G.cells[r][c] === 2 ? 0 : 2); paintCell(r, c); }
});
board.addEventListener("focus", () => paintCell(...cursor));
board.addEventListener("blur", () => G && paintCell(...cursor));

// ---------- tools ----------
function setTool(t) { tool = t; $("tFill").setAttribute("aria-pressed", String(t === 1)); $("tMark").setAttribute("aria-pressed", String(t === 2)); }
$("tFill").addEventListener("click", () => setTool(1));
$("tMark").addEventListener("click", () => setTool(2));
$("check").addEventListener("click", () => {
  if (!G || G.over) return;
  const wrong = [];
  G.cells.forEach((row, r) => row.forEach((v, c) => { if ((v === 1 && !G.puz.grid[r][c]) || (v === 2 && G.puz.grid[r][c])) wrong.push([r, c]); }));
  if (!wrong.length) { setStatus("No mistakes so far. Keep going!"); line(); return; }
  G.mistakes += wrong.length;
  no();
  wrong.forEach(([r, c]) => { const el = cellEl(r, c); el.classList.add("wrong"); setTimeout(() => el.classList.remove("wrong"), 1800); });
  setStatus(`${wrong.length} ${wrong.length === 1 ? "square is" : "squares are"} wrong (shown in red).`);
});
$("hint").addEventListener("click", () => {
  if (!G || G.over || online()) return;
  const todo = [];
  G.puz.grid.forEach((row, r) => row.forEach((v, c) => { if ((v === 1) !== (G.cells[r][c] === 1)) todo.push([r, c, v]); }));
  if (!todo.length) return;
  const [r, c, v] = todo[Math.floor(Math.random() * todo.length)];
  G.hints += 1;
  G.cells[r][c] = v ? 1 : 2;
  cellEl(r, c).classList.add("hinted");
  changed(r, c);
  stats();
});
$("restart").addEventListener("click", () => { if (!G || online()) return; G.cells = G.cells.map((row) => row.map(() => 0)); G.over = false; G.started = Date.now(); $("result").hidden = true; paintAll(); stats(); });

function finish() {
  G.over = true;
  win();
  const t = Math.floor((Date.now() - G.started) / 1000);
  if (G.puz.index >= 0) { saved.solved[`${saved.size}:${G.puz.index}`] = true; save(); pickers(); }
  const b = $("board");
  b.classList.add("solved");
  b.style.setProperty("--pic", G.puz.color);
  if (online()) { net.send({ p: 100, done: true }); net.setOver(true); }
  $("resTitle").textContent = online() ? "You finished first! 🏆" : `You found: ${G.puz.name}! 🎉`;
  $("resText").textContent = `${G.n}×${G.n} in ${clock(t)}${G.hints ? ` with ${G.hints} ${G.hints === 1 ? "hint" : "hints"}` : ", no hints"}.`;
  $("result").hidden = false;
  if (G.puz.index >= 0) $("title").textContent = `Puzzle ${G.puz.index + 1} · ${G.n}×${G.n} · ${G.puz.name}`;
  setStatus("Solved!");
  stats();
}
function lose() {
  G.over = true;
  net.setOver(true);
  $("resTitle").textContent = "Your friend finished first!";
  $("resText").textContent = `You were ${pct()}% done. Rematch?`;
  $("result").hidden = false;
}
$("next").addEventListener("click", () => {
  if (online()) { net.rematch(); return; }
  if (G.puz.index >= 0) { const nxt = (G.puz.index + 1) % PICTURES[saved.size].length; saved.index = nxt; save(); newGame(nxt); } else newGame(-1);
  pickers();
});

// ---------- choosing ----------
function pickers() {
  const list = PICTURES[saved.size];
  $("pics").innerHTML = list.map((p, i) => { const done = saved.solved[`${saved.size}:${i}`]; return `<button class="pk${done ? " done" : ""}" data-i="${i}" aria-pressed="${G && G.puz.index === i}" aria-label="Puzzle ${i + 1}${done ? `, ${p.name}, solved` : ""}">${done ? "✓" : i + 1}</button>`; }).join("") + `<button class="pk endless" data-i="-1" aria-pressed="${G && G.puz.index === -1}">🎲 Endless</button>`;
}
$("pics").addEventListener("click", (e) => {
  const b = e.target.closest(".pk");
  if (!b || online()) return;
  const i = Number(b.dataset.i);
  if (i >= 0) { saved.index = i; save(); }
  newGame(i);
  pickers();
});
function syncChips() {
  document.querySelectorAll("#size .g-chip").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.value === saved.size)));
  document.querySelectorAll("#players .g-chip").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.value === saved.players)));
  $("mute").textContent = saved.muted ? "🔇 Sound off" : "🔊 Sound on";
  $("picsRow").hidden = online();
}
$("size").addEventListener("click", (e) => {
  const b = e.target.closest(".g-chip");
  if (!b || (online() && net.active && myRole !== 0)) return;
  saved.size = b.dataset.value; saved.index = 0; save(); syncChips();
  if (online()) { if (net.active) net.rematch(); } else { newGame(0); pickers(); }
});
$("players").addEventListener("click", (e) => {
  const b = e.target.closest(".g-chip");
  if (!b) return;
  saved.players = b.dataset.value; save(); syncChips();
  if (online()) { net.open(); newGame(-1); } else { net.close(); newGame(saved.index); pickers(); }
});
$("mute").addEventListener("click", () => { saved.muted = !saved.muted; save(); syncChips(); });

const invited = net.roomParam();
if (invited) saved.players = "online";
if (!SIZES[saved.size]) saved.size = "small";
syncChips();
setTool(1);
newGame(online() ? -1 : Math.min(saved.index, PICTURES[saved.size].length - 1));
pickers();
if (online()) { net.open(); if (invited) net.join(invited); }
window.__nono = { get G() { return G; }, setCell, newGame };
