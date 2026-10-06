import { createOnline } from "../../assets/online.js";
import { boardKeys } from "../../assets/board-keys.js";
import { N, initial, apply, pawnMoves, wallLegal, pathFor, chooseMove, other } from "./logic.js";

const $ = (id) => document.getElementById(id);
const store = {
  get(key, fallback) { try { const raw = localStorage.getItem(key); return raw === null ? fallback : JSON.parse(raw); } catch (err) { return fallback; } },
  set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (err) { /* private mode */ } },
};
const KEY = "zone210_quoridor_settings";
const settings = { mode: "cpu", level: "normal", first: "me", muted: false, ...store.get(KEY, {}) };
if (!["cpu", "two", "online"].includes(settings.mode)) settings.mode = "cpu";
if (!["easy", "normal", "hard"].includes(settings.level)) settings.level = "normal";

const SPEED = new URLSearchParams(location.search).has("fast") ? 20 : 1;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms / SPEED));
let audio = null;
function tone(freq, start, length, type = "sine", gain = 0.08) {
  if (settings.muted) return;
  try {
    audio = window.z210Audio ? window.z210Audio.get() : audio || new (window.AudioContext || window.webkitAudioContext)();
    if (!audio) return;
    const t = audio.currentTime + start;
    const osc = audio.createOscillator();
    const amp = audio.createGain();
    osc.type = type; osc.frequency.value = freq;
    amp.gain.setValueAtTime(0.0001, t);
    amp.gain.exponentialRampToValueAtTime(gain, t + 0.008);
    amp.gain.exponentialRampToValueAtTime(0.0001, t + length);
    osc.connect(amp).connect(audio.destination);
    osc.start(t); osc.stop(t + length + 0.02);
  } catch (err) { /* audio unavailable */ }
}
const sfx = {
  step: () => tone(320, 0, 0.06, "triangle", 0.1),
  jump: () => { tone(380, 0, 0.06, "triangle", 0.1); tone(520, 0.07, 0.08, "triangle", 0.1); },
  wall: () => { tone(160, 0, 0.09, "square", 0.07); tone(110, 0.03, 0.12, "triangle", 0.1); },
  bad: () => tone(160, 0, 0.12, "sawtooth", 0.05),
  win: () => [523, 659, 784, 1046, 784, 1046].forEach((f, i) => tone(f, i * 0.1, 0.24, "triangle", 0.1)),
  lose: () => [330, 262, 196].forEach((f, i) => tone(f, i * 0.16, 0.3, "sawtooth", 0.06)),
};

const online = () => settings.mode === "online";
const cpu = () => settings.mode === "cpu";
let myP = 0;
const inbox = [];
const net = createOnline({
  container: document.querySelector(".g-page"),
  before: $("pbars"),
  prefix: "zone210-quoridor-",
  names: ["Blue", "Red"],
  onStart: ({ role }) => { myP = role; inbox.length = 0; newGame(); },
  onData: (m) => { inbox.push(m); drain(); },
  onLeft: () => { inbox.length = 0; draw(); setStatus("Your friend left the game."); },
  getState: () => ({ s, over, endArgs, inbox: [...inbox] }),
  setState: (st) => {
    s = st.s; endArgs = st.endArgs;
    busy = false; hist = []; hint = null; ghost = null; over = false;
    inbox.length = 0; inbox.push(...st.inbox);
    draw(); announce(); drain();
    if (st.over && st.endArgs) finish(...st.endArgs);
  },
});
function drain() {
  while (online() && net.active && inbox.length && !over && !busy && s.turn !== myP) {
    const m = inbox.shift();
    if (m && (m.t === "m" || m.t === "w") && apply(s, m)) put(m, true);
  }
}

let s = null;
let over = false;
let busy = false;
let endArgs = null;
let hist = [];
let hint = null;
let tool = "move";
let ghost = null; // { r, c, o } wall being previewed
let wallO = 0;
let autoO = true;
const humanP = () => (cpu() ? (settings.first === "me" ? 0 : 1) : null);
const isCpuTurn = () => cpu() && s.turn !== humanP();
const mine = () => (online() ? net.active && s.turn === myP : cpu() ? s.turn === humanP() : true);
const canAct = () => !!s && !over && !busy && mine() && !isCpuTurn();
const colorName = (p) => (p === 0 ? "Blue" : "Red");
const nameOf = (p) => (cpu() ? (p === humanP() ? "You" : "Computer") : online() ? (p === myP ? "You" : "Friend") : colorName(p));
const flip = () => (cpu() ? humanP() === 1 : online() ? myP === 1 : false); // I always play from the bottom
const statusEl = $("status");
const setStatus = (t, kind = "") => { statusEl.textContent = t; statusEl.className = "g-status" + (kind ? ` ${kind}` : ""); };

// ---------- drawing ----------
const svg = $("mb");
const NS = "http://www.w3.org/2000/svg";
const el = (name, attrs = {}, parent = svg) => { const e = document.createElementNS(NS, name); Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v)); parent.appendChild(e); return e; };
const M = 16, CELL = 52, GAP = 10, PITCH = CELL + GAP;
const vr = (r) => (flip() ? N - 1 - r : r);
const vc = (c) => (flip() ? N - 1 - c : c);
const px = (c) => M + vc(c) * PITCH;
const py = (r) => M + vr(r) * PITCH;
const PCOL = [["#9dc0ff", "#2f66e0"], ["#ffb0b0", "#d83a3a"]];
// a wall in board coordinates -> its rectangle on screen (the flip maps a wall at (r,c) to (7-r,7-c))
function wallRect(r, c, o) {
  const rr = flip() ? 7 - r : r;
  const cc = flip() ? 7 - c : c;
  return o === 0
    ? { x: M + cc * PITCH, y: M + rr * PITCH + CELL, width: CELL * 2 + GAP, height: GAP }
    : { x: M + cc * PITCH + CELL, y: M + rr * PITCH, width: GAP, height: CELL * 2 + GAP };
}
let ghostLayer = null;
function draw() {
  svg.innerHTML = "";
  const defs = el("defs");
  PCOL.forEach(([a, b], p) => { const g = el("radialGradient", { id: `pw${p}`, cx: "35%", cy: "30%", r: "75%" }, defs); el("stop", { offset: "0", "stop-color": a }, g); el("stop", { offset: "1", "stop-color": b }, g); });
  const wg = el("linearGradient", { id: "wood", x1: "0", y1: "0", x2: "0", y2: "1" }, defs);
  el("stop", { offset: "0", "stop-color": "#f3d29b" }, wg); el("stop", { offset: "1", "stop-color": "#c2924f" }, wg);
  const legal = canAct() && tool === "move" ? pawnMoves(s) : [];
  const legalSet = new Set(legal.map(([r, c]) => r * N + c));
  for (let r = 0; r < N; r += 1) {
    for (let c = 0; c < N; c += 1) {
      const goal0 = r === 0; // Blue's goal row
      const goal8 = r === N - 1;
      const cell = el("rect", { x: px(c), y: py(r), width: CELL, height: CELL, rx: 8, fill: goal0 ? "#4c78c9" : goal8 ? "#c95a5a" : "#f0dcb8", opacity: goal0 || goal8 ? 0.85 : 1, class: "cell" + (legalSet.has(r * N + c) ? " go" : "") });
      cell.dataset.i = r * N + c; cell.addEventListener("click", () => onCell(r, c));
    }
  }
  s.walls.forEach(([r, c, o]) => { const rc = wallRect(r, c, o); el("rect", { ...rc, rx: 4, fill: "url(#wood)", stroke: "#7a5226", "stroke-width": 1 }); });
  legal.forEach(([r, c]) => el("circle", { cx: px(c) + CELL / 2, cy: py(r) + CELL / 2, r: 9, fill: "rgba(47,191,113,0.85)", "pointer-events": "none" }));
  [0, 1].forEach((p) => {
    const [r, c] = s.p[p];
    const x = px(c) + CELL / 2;
    const y = py(r) + CELL / 2;
    el("circle", { cx: x + 1, cy: y + 3, r: 19, fill: "rgba(0,0,0,0.3)", "pointer-events": "none" });
    el("circle", { cx: x, cy: y, r: 19, fill: `url(#pw${p})`, stroke: p === 0 ? "#183c8f" : "#8f1f1f", "stroke-width": 1.5, "pointer-events": "none" });
    if (!over && s.turn === p) el("circle", { cx: x, cy: y, r: 24, fill: "none", stroke: "#ffd65a", "stroke-width": 3, class: "pulse", "pointer-events": "none" });
  });
  if (hint && hint.t === "m") el("circle", { cx: px(hint.c) + CELL / 2, cy: py(hint.r) + CELL / 2, r: 22, fill: "none", stroke: "#2fbf71", "stroke-width": 4, class: "pulse", "pointer-events": "none" });
  if (hint && hint.t === "w") el("rect", { ...wallRect(hint.r, hint.c, hint.o), rx: 4, fill: "rgba(47,191,113,0.85)", class: "pulse", "pointer-events": "none" });
  ghostLayer = el("g", { "pointer-events": "none" });
  drawGhost();
  if (tool === "wall" && canAct()) {
    const cap = el("rect", { x: 0, y: 0, width: 580, height: 580, fill: "transparent", style: "cursor:crosshair" });
    cap.addEventListener("pointermove", (e) => { const g = pick(e); if (g && (!ghost || g.r !== ghost.r || g.c !== ghost.c || g.o !== ghost.o)) { ghost = g; drawGhost(); syncTools(); } });
    cap.addEventListener("click", (e) => {
      const g = pick(e);
      if (!g) return;
      if (ghost && g.r === ghost.r && g.c === ghost.c && g.o === ghost.o) placeGhost();
      else { ghost = g; drawGhost(); syncTools(); }
    });
  }
  renderBars();
}
function drawGhost() {
  if (!ghostLayer) return;
  ghostLayer.innerHTML = "";
  if (tool !== "wall" || !ghost) return;
  const ok = wallLegal(s, ghost.r, ghost.c, ghost.o);
  el("rect", { ...wallRect(ghost.r, ghost.c, ghost.o), rx: 4, fill: ok ? "rgba(47,191,113,0.8)" : "rgba(220,60,60,0.75)", stroke: "#fff", "stroke-width": 1 }, ghostLayer);
}
/** The wall that sits nearest to where the pointer is, in board coordinates. */
function pick(e) {
  const rect = svg.getBoundingClientRect();
  const x = ((e.clientX - rect.left) / rect.width) * 580;
  const y = ((e.clientY - rect.top) / rect.height) * 580;
  // grooves cross at (M + (k+1)*PITCH - GAP/2); find the nearest crossing in screen space, then undo the flip
  const k = (v) => Math.max(0, Math.min(7, Math.round((v - M + GAP / 2) / PITCH - 1)));
  const sc = k(x);
  const sr = k(y);
  const ix = M + (sc + 1) * PITCH - GAP / 2;
  const iy = M + (sr + 1) * PITCH - GAP / 2;
  if (autoO) wallO = Math.abs(x - ix) >= Math.abs(y - iy) ? 0 : 1;
  return { r: flip() ? 7 - sr : sr, c: flip() ? 7 - sc : sc, o: wallO };
}
function renderBars() {
  const bar = (p) => {
    const d = pathFor(s, p);
    const dots = Array.from({ length: 10 }, (_, k) => `<i class="${k < s.left[p] ? "" : "o"}"></i>`).join("");
    return `<div class="pbar${!over && s.turn === p ? " turn" : ""}" style="--c1:${PCOL[p][0]};--c2:${PCOL[p][1]}"><span class="chip"></span><span class="nm">${nameOf(p)}<small>${colorName(p)} · ${d} step${d === 1 ? "" : "s"} to go · ${s.left[p]} walls</small><span class="walls">${dots}</span></span></div>`;
  };
  $("pbars").innerHTML = bar(0) + bar(1);
}
function syncTools() {
  const can = canAct();
  document.querySelectorAll("#tool .g-chip").forEach((b) => { b.setAttribute("aria-pressed", String(b.dataset.value === tool)); b.disabled = !can || (b.dataset.value === "wall" && s && s.left[s.turn] <= 0); });
  $("rotate").hidden = !(tool === "wall" && can);
  const ok = ghost && tool === "wall" && can && wallLegal(s, ghost.r, ghost.c, ghost.o);
  $("confirm").hidden = !(tool === "wall" && can);
  $("confirm").disabled = !ok;
}

// ---------- flow ----------
function newGame() {
  s = initial();
  over = false; busy = false; endArgs = null; hist = []; hint = null; ghost = null; tool = "move"; autoO = true;
  $("end").classList.remove("show");
  net.setOver(false);
  $("again").textContent = online() ? "Rematch" : "Play again";
  draw(); announce(); syncTools();
  if (isCpuTurn()) cpuTurn();
}
function announce() {
  syncTools();
  if (over) return;
  if (online() && !net.active) return setStatus("Create or join a room to start.");
  if (isCpuTurn()) return setStatus("The computer is thinking…");
  if (online() && s.turn !== myP) return setStatus("Your friend's move…");
  const you = cpu() || online();
  setStatus(tool === "wall" ? "Point at a groove between squares to place a wall. R rotates it." : `${you ? "Your" : `${nameOf(s.turn)}'s`} move as ${colorName(s.turn)}: tap a green square, or choose Place wall.`);
}
function onCell(r, c) {
  if (!canAct() || tool !== "move") return;
  if (!pawnMoves(s).some(([a, b]) => a === r && b === c)) return;
  const m = { t: "m", r, c };
  if (online()) net.send(m);
  put(m, false);
}
function placeGhost() {
  if (!canAct() || tool !== "wall" || !ghost) return;
  if (!wallLegal(s, ghost.r, ghost.c, ghost.o)) { sfx.bad(); setStatus("A wall can't go there: it overlaps another, or it would block a pawn's only way through.", "bad"); return; }
  const m = { t: "w", r: ghost.r, c: ghost.c, o: ghost.o };
  if (online()) net.send(m);
  put(m, false);
}
function put(m, remote) {
  void remote;
  hist.push({ s });
  const p = s.turn;
  const before = s.p[p];
  s = apply(s, m);
  hint = null; ghost = null; tool = "move"; autoO = true;
  if (m.t === "w") sfx.wall();
  else (Math.abs(before[0] - m.r) + Math.abs(before[1] - m.c) > 1) ? sfx.jump() : sfx.step();
  if (s.over) { draw(); finish(s.winner); return; }
  draw(); announce();
  if (isCpuTurn()) cpuTurn();
  drain();
}
async function cpuTurn() {
  busy = true;
  draw();
  await sleep(550);
  const m = chooseMove(s, settings.level);
  busy = false;
  if (m && !over) put(m, true);
}
function finish(p) {
  endArgs = Array.from(arguments);
  over = true; busy = false;
  const you = cpu() ? p === humanP() : online() ? p === myP : true;
  const title = cpu() ? (you ? "You win!" : "The computer wins") : online() ? (you ? "You win!" : "Your friend wins.") : `${colorName(p)} wins!`;
  $("endEmoji").textContent = you ? "🏆" : cpu() ? "🤖" : "🎲";
  $("endTitle").textContent = title;
  $("endText").textContent = `${colorName(p)} reached the far side.`;
  setStatus(title, "good");
  you ? sfx.win() : sfx.lose();
  net.setOver(true);
  syncTools();
  setTimeout(() => $("end").classList.add("show"), 800);
}
function undo() {
  if (busy || !hist.length || online()) return;
  let steps = 1;
  if (cpu()) { steps = 0; for (let k = hist.length - 1; k >= 0; k -= 1) { steps += 1; if (hist[k].s.turn === humanP()) break; } }
  let prev = null;
  for (let k = 0; k < steps && hist.length; k += 1) prev = hist.pop();
  if (!prev) return;
  s = prev.s; over = false; hint = null; ghost = null; tool = "move";
  $("end").classList.remove("show");
  draw(); announce();
}
function showHint() {
  if (!canAct() || online()) return;
  hint = chooseMove(s, "hard");
  draw();
  setStatus(hint.t === "m" ? "Hint: the green ring marks a strong move." : "Hint: the green wall is a strong place to block.");
}

// ---------- controls ----------
function syncChips() {
  ["mode", "level", "first"].forEach((k) => document.querySelectorAll(`#${k} .g-chip`).forEach((c) => c.setAttribute("aria-pressed", String(c.dataset.value === String(settings[k])))));
  $("levelRow").hidden = !cpu();
  $("firstRow").hidden = !cpu();
  $("undo").hidden = $("hint").hidden = $("newGame").hidden = online();
  if (online()) net.open(); else net.close();
}
["mode", "level", "first"].forEach((id) => $(id).addEventListener("click", (e) => {
  const chip = e.target.closest(".g-chip");
  if (!chip || String(settings[id]) === chip.dataset.value) return;
  settings[id] = chip.dataset.value;
  store.set(KEY, settings);
  syncChips();
  newGame();
}));
$("tool").addEventListener("click", (e) => {
  const b = e.target.closest(".g-chip");
  if (!b || b.disabled) return;
  tool = b.dataset.value;
  ghost = null; autoO = true; hint = null;
  draw(); announce();
});
function rotate() {
  if (tool !== "wall") return;
  autoO = false;
  wallO = 1 - wallO;
  if (ghost) ghost = { ...ghost, o: wallO };
  draw(); syncTools();
}
$("rotate").addEventListener("click", rotate);
$("confirm").addEventListener("click", placeGhost);
document.addEventListener("keydown", (e) => { if ((e.key === "r" || e.key === "R") && !e.metaKey && !e.ctrlKey) rotate(); });
svg.addEventListener("contextmenu", (e) => { if (tool === "wall") { e.preventDefault(); rotate(); } });
$("newGame").addEventListener("click", newGame);
$("again").addEventListener("click", () => { if (online()) { net.rematch(); $("end").classList.remove("show"); } else newGame(); });
$("endView").addEventListener("click", () => $("end").classList.remove("show"));
$("undo").addEventListener("click", undo);
$("hint").addEventListener("click", showHint);
const mute = $("mute");
const syncMute = () => { mute.textContent = settings.muted ? "Sound Off" : "Sound On"; mute.setAttribute("aria-pressed", String(settings.muted)); };
mute.addEventListener("click", () => { settings.muted = !settings.muted; store.set(KEY, settings); syncMute(); });

syncChips();
syncMute();
newGame();
const invited = net.roomParam();
if (invited) { settings.mode = "online"; syncChips(); newGame(); net.join(invited); }
window.__q = {
  get s() { return s; }, get over() { return over; }, get busy() { return busy; }, get myP() { return myP; },
  apply, pawnMoves, wallLegal, onCell, chooseMove, other,
  playWall: (r, c, o) => { tool = "wall"; ghost = { r, c, o }; placeGhost(); },
};

// keyboard and screen-reader play on the board
boardKeys($("mb"), { selector: "[data-i]", describe: (i) => { if (!s) return ""; const k = Object.keys(s.p).find((p) => s.p[p] && s.p[p][0] === Math.floor(i / N) && s.p[p][1] === i % N); return k !== undefined ? `${colorName(Number(k))} pawn` : ""; } });
