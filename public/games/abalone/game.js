import { createOnline } from "../../assets/online.js";
import { CELLS, NB, initial, legalMoves, apply, winner, chooseMove, count, other } from "./logic.js";

const $ = (id) => document.getElementById(id);
const store = {
  get(key, fallback) { try { const raw = localStorage.getItem(key); return raw === null ? fallback : JSON.parse(raw); } catch (err) { return fallback; } },
  set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (err) { /* private mode */ } },
};
const KEY = "zone210_abalone_settings";
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
  move: () => tone(280, 0, 0.08, "triangle", 0.1),
  push: () => { tone(220, 0, 0.1, "sawtooth", 0.07); tone(160, 0.05, 0.12, "triangle", 0.09); },
  off: () => [520, 390, 260].forEach((f, i) => tone(f, i * 0.07, 0.12, "triangle", 0.1)),
  pick: () => tone(520, 0, 0.04, "triangle", 0.05),
  win: () => [523, 659, 784, 1046, 784, 1046].forEach((f, i) => tone(f, i * 0.1, 0.24, "triangle", 0.1)),
  lose: () => [330, 262, 196].forEach((f, i) => tone(f, i * 0.16, 0.3, "sawtooth", 0.06)),
};

const online = () => settings.mode === "online";
const cpu = () => settings.mode === "cpu";
let myP = 1;
const inbox = [];
const net = createOnline({
  container: document.querySelector(".g-page"),
  before: $("pbars"),
  prefix: "zone210-abalone-",
  names: ["Black", "White"],
  onStart: ({ role }) => { myP = role === 0 ? 1 : 2; inbox.length = 0; newGame(); },
  onData: (m) => { inbox.push(m); drain(); },
  onLeft: () => { inbox.length = 0; draw(); setStatus("Your friend left the game."); },
  getState: () => ({ s: { ...s, b: [...s.b] }, over, endArgs, inbox: [...inbox] }),
  setState: (st) => {
    s = { ...st.s, b: Int8Array.from(st.s.b) }; endArgs = st.endArgs;
    sel = []; busy = false; hist = []; hint = null; over = false;
    inbox.length = 0; inbox.push(...st.inbox);
    draw(); announce(); drain();
    if (st.over && st.endArgs) finish(...st.endArgs);
  },
});
function drain() {
  while (online() && net.active && inbox.length && !over && !busy && s.turn !== myP) {
    const m = inbox.shift();
    if (m.t === "mv" && Array.isArray(m.cells)) {
      const mv = legalMoves(s).find((x) => x.d === m.d && x.cells.length === m.cells.length && x.cells.every((c) => m.cells.includes(c)));
      if (mv) doMove(mv, true);
    }
  }
}

let s = null;
let sel = [];
let over = false;
let busy = false;
let endArgs = null;
let hist = [];
let hint = null;
const humanP = () => (cpu() ? (settings.first === "me" ? 1 : 2) : null);
const isCpuTurn = () => cpu() && s.turn !== humanP();
const mine = () => (online() ? net.active && s.turn === myP : cpu() ? s.turn === humanP() : true);
const flipped = () => (online() ? myP === 2 : cpu() ? humanP() === 2 : false);
const cname = (p) => (p === 1 ? "Black" : "White");
const nameOf = (p) => (cpu() ? (p === humanP() ? "You" : "Computer") : online() ? (p === myP ? "You" : "Friend") : cname(p));
const statusEl = $("status");
const setStatus = (t, kind = "") => { statusEl.textContent = t; statusEl.className = "g-status" + (kind ? ` ${kind}` : ""); };

// ---------- geometry and helpers ----------
const SZ = 31;
function xy(i) {
  const { q, r } = CELLS[i];
  const Q = flipped() ? -q : q, R = flipped() ? -r : r;
  return { x: 280 + SZ * Math.sqrt(3) * (Q + R / 2), y: 260 + SZ * 1.5 * R };
}
function lineOrder(cells) {
  if (cells.length === 1) return cells.slice();
  for (let a = 0; a < 6; a += 1) {
    for (const start of cells) {
      const order = [start];
      for (let k = 1; k < cells.length; k += 1) { const nx = NB[order[order.length - 1]][a]; if (nx >= 0 && cells.includes(nx)) order.push(nx); else break; }
      if (order.length === cells.length) return order;
    }
  }
  return null;
}
const sameSet = (a, b) => a.length === b.length && a.every((x) => b.includes(x));
function targetMap() {
  // for the selected group: every cell a move would step into, mapped to that move
  const map = new Map();
  if (!sel.length) return map;
  for (const m of legalMoves(s)) {
    if (!sameSet(m.cells, sel)) continue;
    const inline = m.cells.length > 1 && m.cells.some((c) => m.cells.includes(NB[c][m.d]));
    if (inline) { const front = m.cells.find((c) => !m.cells.includes(NB[c][m.d])); map.set(NB[front][m.d], m); } else m.cells.forEach((c) => map.set(NB[c][m.d], m));
  }
  return map;
}

// ---------- drawing ----------
const svg = $("mb");
const NS = "http://www.w3.org/2000/svg";
const el = (name, attrs = {}, parent = svg) => { const e = document.createElementNS(NS, name); Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v)); parent.appendChild(e); return e; };
function draw() {
  svg.innerHTML = "";
  const defs = el("defs");
  [1, 2].forEach((p) => { const g = el("radialGradient", { id: `mb${p}`, cx: "35%", cy: "30%", r: "75%" }, defs); el("stop", { offset: "0", "stop-color": p === 1 ? "#7b8298" : "#ffffff" }, g); el("stop", { offset: "1", "stop-color": p === 1 ? "#090b12" : "#bcc1d0" }, g); });
  const hexPts = Array.from({ length: 6 }, (_, k) => { const a = ((60 * k - 30) * Math.PI) / 180; return `${(280 + 5.1 * SZ * Math.sqrt(3) * 0.62 * Math.cos(a) * 1.0).toFixed(1)},${(260 + 5.1 * SZ * 1.1 * Math.sin(a)).toFixed(1)}`; }).join(" ");
  void hexPts;
  const board = [];
  for (let k = 0; k < 6; k += 1) { const a = (60 * k * Math.PI) / 180; board.push(`${(280 + 4.95 * SZ * Math.sqrt(3) * 0.99 * Math.cos(a + Math.PI / 6 - Math.PI / 6)).toFixed(1)},${(260 + 4.95 * SZ * Math.sqrt(3) * 0.99 * Math.sin(a)).toFixed(1)}`); }
  el("polygon", { points: board.join(" "), fill: "#2b1c0d", stroke: "#8b6a3d", "stroke-width": 6, "stroke-linejoin": "round" });
  const canAct = !over && !busy && mine() && !isCpuTurn();
  const targets = canAct ? targetMap() : new Map();
  const movesNow = canAct ? legalMoves(s) : [];
  const movable = new Set();
  if (canAct && !sel.length) movesNow.forEach((m) => m.cells.forEach((c) => movable.add(c)));
  const lastSet = new Set(s.last ? s.last.cells : []);
  for (let i = 0; i < 61; i += 1) {
    const { x, y } = xy(i);
    el("circle", { cx: x, cy: y, r: 25, fill: "#1a1008", stroke: "#4a3216", "stroke-width": 2 });
    if (lastSet.has(i)) el("circle", { cx: x, cy: y, r: 27, fill: "none", stroke: "rgba(255,200,60,0.85)", "stroke-width": 3 });
    const v = s.b[i];
    if (v) {
      el("circle", { cx: x + 1, cy: y + 3, r: 23, fill: "rgba(0,0,0,0.4)" });
      el("circle", { cx: x, cy: y, r: 23, fill: `url(#mb${v})`, stroke: v === 1 ? "#000" : "#8d93a6", "stroke-width": 1 });
      if (sel.includes(i)) el("circle", { cx: x, cy: y, r: 27, fill: "none", stroke: "#ffd65a", "stroke-width": 4 });
      else if (movable.has(i) && v === s.turn) el("circle", { cx: x, cy: y, r: 27, fill: "none", stroke: "rgba(255,255,255,0.55)", "stroke-width": 2.5, class: "pulse" });
    }
    if (targets.has(i)) el("circle", { cx: x, cy: y, r: v ? 28 : 12, fill: v ? "none" : "rgba(255,214,90,0.9)", stroke: v ? "#ff5d5d" : "#b07a00", "stroke-width": v ? 4 : 2.5, class: "pulse" });
    if (hint && (hint.cells.includes(i) || (NB[hint.cells[0]][hint.d] === i))) el("circle", { cx: x, cy: y, r: 29, fill: "none", stroke: "#2fbf71", "stroke-width": 3.5, class: "pulse" });
    const hit = el("circle", { cx: x, cy: y, r: 27, class: "hc" + (canAct ? "" : " dead") });
    hit.addEventListener("click", () => onCell(i));
  }
  const bar = (p) => {
    const pushed = s.off[p]; // marbles of the other colour that p has pushed off
    const dots = Array.from({ length: 6 }, (_, k) => `<i class="${k < pushed ? (p === 1 ? "w" : "b") : "o"}"></i>`).join("");
    return `<div class="pbar${!over && s.turn === p ? " turn" : ""}" style="--c1:${p === 1 ? "#5b6072" : "#fff"};--c2:${p === 1 ? "#0b0d14" : "#c9ccd8"}"><span class="chip"></span><span class="nm">${nameOf(p)}<small>${cname(p)} · pushed off ${pushed}/6 · ${count(s, p)} left</small><span class="offs">${dots}</span></span></div>`;
  };
  $("pbars").innerHTML = bar(1) + bar(2);
}

// ---------- flow ----------
function newGame() {
  s = initial();
  sel = []; over = false; busy = false; hist = []; hint = null;
  $("end").classList.remove("show");
  net.setOver(false);
  $("again").textContent = online() ? "Rematch" : "Play again";
  draw(); announce();
  if (isCpuTurn()) cpuTurn();
}
function announce() {
  if (over) return;
  if (online() && !net.active) return setStatus("Create or join a room to start.");
  if (isCpuTurn()) return setStatus("The computer is thinking…");
  if (online() && s.turn !== myP) return setStatus("Your friend's move…");
  setStatus(`${cpu() || online() ? "Your" : `${nameOf(s.turn)}'s`} move as ${cname(s.turn)}: tap a marble (add neighbours in a line), then a glowing circle.`);
}
function onCell(i) {
  if (over || busy || !mine() || isCpuTurn()) return;
  hint = null;
  const v = s.b[i];
  const targets = targetMap();
  if (sel.length && targets.has(i)) { const m = targets.get(i); if (online()) net.send({ t: "mv", cells: m.cells, d: m.d }); return doMove(m, false); }
  if (v === s.turn) {
    if (sel.includes(i)) { sel = sel.length > 1 && lineOrder(sel.filter((x) => x !== i)) ? sel.filter((x) => x !== i) : []; sfx.pick(); draw(); return undefined; }
    if (sel.length) { const ext = lineOrder([...sel, i]); if (ext && sel.length < 3) { sel = ext; sfx.pick(); draw(); return undefined; } }
    sel = [i]; sfx.pick(); draw(); return undefined;
  }
  sel = []; draw();
  return undefined;
}
function doMove(m, remote) {
  void remote;
  hist.push({ s });
  const p = s.turn;
  const before = s.off[p];
  s = apply(s, m);
  sel = []; hint = null;
  if (s.off[p] > before) sfx.off(); else if (m.push) sfx.push(); else sfx.move();
  const w = winner(s);
  if (w) { draw(); return finish(w); }
  if (s.moves >= 400) { draw(); return finish(s.off[1] === s.off[2] ? 0 : s.off[1] > s.off[2] ? 1 : 2, true); }
  if (!legalMoves(s).length) { draw(); return finish(other(s.turn)); }
  draw(); announce();
  if (isCpuTurn()) cpuTurn();
  drain();
  return undefined;
}
async function cpuTurn() {
  busy = true;
  draw();
  await sleep(500);
  const m = chooseMove(s, settings.level);
  busy = false;
  if (m && !over) doMove(m, true);
}
function finish(w, limit = false) {
  endArgs = Array.from(arguments);
  over = true; busy = false;
  let title, emoji = "🏆", you = null;
  if (w === 0) { title = "It's a draw!"; emoji = "🤝"; }
  else {
    you = cpu() ? w === humanP() : online() ? w === myP : true;
    title = cpu() ? (you ? "You win!" : "The computer wins") : online() ? (you ? "You win!" : "Your friend wins.") : `${cname(w)} wins!`;
    if (you === false) emoji = cpu() ? "🤖" : "🎲";
  }
  $("endEmoji").textContent = emoji;
  $("endTitle").textContent = title;
  $("endText").textContent = limit ? `The game reached its move limit. Pushed off: Black ${s.off[1]}, White ${s.off[2]}.` : w === 0 ? "A draw." : `${cname(w)} pushed six marbles off the board.`;
  setStatus(title, "good");
  you === false ? sfx.lose() : sfx.win();
  net.setOver(true);
  setTimeout(() => $("end").classList.add("show"), 800);
}
function undo() {
  if (busy || !hist.length || online()) return;
  let steps = 1;
  if (cpu()) { steps = 0; for (let k = hist.length - 1; k >= 0; k -= 1) { steps += 1; if (hist[k].s.turn === humanP()) break; } }
  let prev = null;
  for (let k = 0; k < steps && hist.length; k += 1) prev = hist.pop();
  if (!prev) return;
  s = prev.s; over = false; sel = []; hint = null;
  $("end").classList.remove("show");
  draw(); announce();
}
async function showHint() {
  if (over || busy || !mine() || online() || isCpuTurn()) return;
  setStatus("Thinking…");
  await new Promise((r) => setTimeout(r, 30));
  hint = chooseMove(s, "normal");
  sel = [];
  draw();
  setStatus("Hint: the green rings show a good move.");
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
window.__ab = { onCell, legalMoves, apply, NB, CELLS, get s() { return s; }, get over() { return over; }, get busy() { return busy; }, get myP() { return myP; } };
