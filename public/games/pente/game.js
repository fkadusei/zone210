import { createOnline } from "../../assets/online.js";
import { boardKeys } from "../../assets/board-keys.js";
import { initial, legalMoves, play, chooseMove, other, centre } from "./logic.js";

const $ = (id) => document.getElementById(id);
const store = {
  get(key, fallback) { try { const raw = localStorage.getItem(key); return raw === null ? fallback : JSON.parse(raw); } catch (err) { return fallback; } },
  set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (err) { /* private mode */ } },
};
const KEY = "zone210_pente_settings";
const settings = { mode: "cpu", level: "normal", first: "me", size: "19", tourn: "on", muted: false, ...store.get(KEY, {}) };
if (!["cpu", "two", "online"].includes(settings.mode)) settings.mode = "cpu";
if (!["easy", "normal", "hard"].includes(settings.level)) settings.level = "normal";
if (!["13", "19"].includes(String(settings.size))) settings.size = "19";
settings.size = String(settings.size);

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
  b: () => tone(240, 0, 0.07, "triangle", 0.12),
  w: () => tone(300, 0, 0.07, "triangle", 0.12),
  cap: () => { tone(200, 0, 0.12, "sawtooth", 0.08); tone(130, 0.06, 0.16, "sine", 0.1); },
  win: () => [523, 659, 784, 1046, 784, 1046].forEach((f, i) => tone(f, i * 0.1, 0.24, "triangle", 0.1)),
  lose: () => [330, 262, 196].forEach((f, i) => tone(f, i * 0.16, 0.3, "sawtooth", 0.06)),
};

const online = () => settings.mode === "online";
const cpu = () => settings.mode === "cpu";
const tourn = () => settings.tourn === "on";
let myP = 1;
const inbox = [];
const net = createOnline({
  container: document.querySelector(".g-page"),
  before: $("pbars"),
  prefix: "zone210-pente-",
  names: ["Black", "White"],
  startInfo: () => ({ size: settings.size, tourn: settings.tourn }),
  onStart: ({ role, info }) => {
    myP = role === 0 ? 1 : 2;
    if (info && ["13", "19"].includes(String(info.size))) settings.size = String(info.size);
    if (info && ["on", "off"].includes(info.tourn)) settings.tourn = info.tourn;
    syncChips();
    inbox.length = 0;
    newGame();
  },
  onData: (m) => { inbox.push(m); drain(); },
  onLeft: () => { inbox.length = 0; draw(); setStatus("Your friend left the game."); },
  getState: () => ({ s, win, over, endArgs, inbox: [...inbox] }),
  setState: (st) => {
    s = st.s; win = st.win; endArgs = st.endArgs;
    busy = false; hist = []; hintMove = -1; hover = -1; over = false;
    inbox.length = 0; inbox.push(...st.inbox);
    draw(); announce(); drain();
    if (st.over && st.endArgs) finish(...st.endArgs);
  },
});
function drain() {
  while (online() && net.active && inbox.length && !over && !busy && s.turn !== myP) {
    const m = inbox.shift();
    if (Number.isInteger(m.i) && legalMoves(s, tourn()).includes(m.i)) put(m.i, true);
  }
}

let s = null;
let over = false;
let busy = false;
let endArgs = null;
let win = null;
let hist = [];
let hintMove = -1;
let hover = -1;
const humanP = () => (cpu() ? (settings.first === "me" ? 1 : 2) : null);
const isCpuTurn = () => cpu() && s.turn !== humanP();
const mine = () => (online() ? net.active && s.turn === myP : cpu() ? s.turn === humanP() : true);
const nameOf = (p) => (cpu() ? (p === humanP() ? "You" : "Computer") : online() ? (p === myP ? "You" : "Friend") : p === 1 ? "Black" : "White");
const statusEl = $("status");
const setStatus = (t, kind = "") => { statusEl.textContent = t; statusEl.className = "g-status" + (kind ? ` ${kind}` : ""); };

// ---------- drawing ----------
const svg = $("mb");
const NS = "http://www.w3.org/2000/svg";
const el = (name, attrs = {}, parent = svg) => { const e = document.createElementNS(NS, name); Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v)); parent.appendChild(e); return e; };
function draw() {
  svg.innerHTML = "";
  const n = s.n;
  const M = 28;
  const gap = (560 - 2 * M) / (n - 1);
  const xy = (i) => ({ x: M + (i % n) * gap, y: M + Math.floor(i / n) * gap });
  const defs = el("defs");
  [1, 2].forEach((p) => { const g = el("radialGradient", { id: `st${p}`, cx: "35%", cy: "30%", r: "75%" }, defs); el("stop", { offset: "0", "stop-color": p === 1 ? "#6a7186" : "#ffffff" }, g); el("stop", { offset: "1", "stop-color": p === 1 ? "#0a0c13" : "#c3c7d4" }, g); });
  // restricted zone on the first player's second move
  if (tourn() && s.moves === 2) { const c = (n - 1) / 2; el("rect", { x: M + (c - 2) * gap - gap / 2, y: M + (c - 2) * gap - gap / 2, width: 5 * gap, height: 5 * gap, fill: "rgba(120,30,30,0.18)", stroke: "rgba(120,30,30,0.45)", "stroke-dasharray": "6 5", "stroke-width": 2 }); }
  for (let k = 0; k < n; k += 1) {
    const p = M + k * gap;
    el("line", { x1: M, y1: p, x2: 560 - M, y2: p, stroke: "#5a3a18", "stroke-width": 1.4 });
    el("line", { x1: p, y1: M, x2: p, y2: 560 - M, stroke: "#5a3a18", "stroke-width": 1.4 });
  }
  const stars = n === 19 ? [3, 9, 15] : [3, 6, 9];
  stars.forEach((r) => stars.forEach((c) => { const { x, y } = xy(r * n + c); el("circle", { cx: x, cy: y, r: 3.4, fill: "#5a3a18" }); }));
  const winSet = new Set(win ? win.line || [] : []);
  const canAct = !over && !busy && mine() && !isCpuTurn();
  const legal = canAct ? new Set(legalMoves(s, tourn())) : new Set();
  for (let i = 0; i < n * n; i += 1) {
    const v = s.b[i];
    const { x, y } = xy(i);
    const r = gap * 0.46;
    if (v) {
      el("circle", { cx: x + 1, cy: y + 2, r, fill: "rgba(0,0,0,0.32)" });
      el("circle", { cx: x, cy: y, r, fill: `url(#st${v})`, stroke: v === 1 ? "#000" : "#8d93a6", "stroke-width": 0.8 });
      if (winSet.has(i)) el("circle", { cx: x, cy: y, r: r + 3, fill: "none", stroke: "#2fbf71", "stroke-width": 3, class: "pulse" });
    }
    if (i === s.last) el("circle", { cx: x, cy: y, r: r * 0.28, fill: v === 1 ? "#fff" : "#c92d2d" });
    if (i === hintMove) el("circle", { cx: x, cy: y, r: r + 4, fill: "none", stroke: "#2fbf71", "stroke-width": 3.5, class: "pulse" });
    if (i === hover && !v && legal.has(i)) el("circle", { cx: x, cy: y, r, fill: s.turn === 1 ? "rgba(10,12,19,0.45)" : "rgba(255,255,255,0.6)" });
    const hit = el("circle", { cx: x, cy: y, r: gap * 0.5, class: "pt" + (legal.has(i) ? "" : " dead") });
    hit.dataset.i = i; hit.addEventListener("click", () => onPoint(i));
    hit.addEventListener("pointerenter", () => { if (hover !== i && !s.b[i]) { hover = i; if (canAct) draw(); } });
  }
  const bar = (p) => {
    const caps = s.caps[p];
    const dots = Array.from({ length: 5 }, (_, k) => `<i class="${k < caps ? (p === 1 ? "w" : "b") : "o"}"></i>`).join("");
    return `<div class="pbar${!over && s.turn === p ? " turn" : ""}" style="--c1:${p === 1 ? "#5b6072" : "#fff"};--c2:${p === 1 ? "#0b0d14" : "#c9ccd8"}"><span class="chip"></span><span class="nm">${nameOf(p)}<small>${p === 1 ? "Black" : "White"} · pairs captured ${caps}/5</small><span class="caps">${dots}</span></span></div>`;
  };
  $("pbars").innerHTML = bar(1) + bar(2);
}

// ---------- flow ----------
function newGame() {
  s = initial(Number(settings.size));
  over = false; busy = false; win = null; hist = []; hintMove = -1; hover = -1;
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
  const you = cpu() || online();
  let extra = "";
  if (tourn() && s.moves === 0) extra = " The first stone goes in the centre.";
  else if (tourn() && s.moves === 2 && s.turn === 1) extra = " Black's second stone must be 3 or more points from the centre.";
  setStatus(`${you ? "Your" : `${nameOf(s.turn)}'s`} move as ${s.turn === 1 ? "Black" : "White"}.${extra}`);
}
function onPoint(i) {
  if (over || busy || !mine() || isCpuTurn() || s.b[i]) return;
  if (!legalMoves(s, tourn()).includes(i)) { if (tourn()) setStatus(s.moves === 0 ? "The first stone must go in the centre." : "Black's second stone must be at least 3 points from the centre.", "bad"); return; }
  if (online()) net.send({ i });
  put(i, false);
}
function put(i, remote) {
  void remote;
  hist.push({ s });
  const p = s.turn;
  const r = play(s, i);
  s = r.s;
  hintMove = -1; hover = -1;
  p === 1 ? sfx.b() : sfx.w();
  if (r.captured.length) sfx.cap();
  if (r.win) { win = r; draw(); return finish(p, r); }
  if (s.moves >= s.n * s.n) { draw(); return finish(0, { win: "draw" }); }
  draw(); announce();
  if (isCpuTurn()) cpuTurn();
  drain();
  return undefined;
}
async function cpuTurn() {
  busy = true;
  draw();
  await sleep(450);
  const i = chooseMove(s, settings.level, tourn());
  busy = false;
  if (i >= 0 && !over) put(i, true);
}
function finish(p, r) {
  endArgs = Array.from(arguments);
  over = true; busy = false;
  let title, emoji = "🏆", you = null;
  if (p === 0) { title = "It's a draw!"; emoji = "🤝"; }
  else {
    you = cpu() ? p === humanP() : online() ? p === myP : true;
    title = cpu() ? (you ? "You win!" : "The computer wins") : online() ? (you ? "You win!" : "Your friend wins.") : `${nameOf(p)} wins!`;
    if (you === false) emoji = cpu() ? "🤖" : "🎲";
  }
  $("endEmoji").textContent = emoji;
  $("endTitle").textContent = title;
  $("endText").textContent = r.win === "draw" ? "The board is full." : r.win === "five" ? "Five in a row!" : "Five pairs captured!";
  setStatus(title, "good");
  you === false ? sfx.lose() : sfx.win();
  net.setOver(true);
  setTimeout(() => $("end").classList.add("show"), 900);
}
function undo() {
  if (busy || !hist.length || online()) return;
  let steps = 1;
  if (cpu()) { steps = 0; for (let k = hist.length - 1; k >= 0; k -= 1) { steps += 1; if (hist[k].s.turn === humanP()) break; } }
  let prev = null;
  for (let k = 0; k < steps && hist.length; k += 1) prev = hist.pop();
  if (!prev) return;
  s = prev.s; over = false; win = null; hintMove = -1;
  $("end").classList.remove("show");
  draw(); announce();
}
function showHint() {
  if (over || busy || !mine() || online() || isCpuTurn()) return;
  hintMove = chooseMove(s, "hard", tourn());
  draw();
  setStatus("Hint: the green ring marks a strong move.");
}

// ---------- controls ----------
function syncChips() {
  ["mode", "level", "first", "size", "tourn"].forEach((k) => document.querySelectorAll(`#${k} .g-chip`).forEach((c) => c.setAttribute("aria-pressed", String(c.dataset.value === String(settings[k])))));
  $("levelRow").hidden = !cpu();
  $("firstRow").hidden = !cpu();
  $("undo").hidden = $("hint").hidden = $("newGame").hidden = online();
  if (online()) net.open(); else net.close();
}
["mode", "level", "first", "size", "tourn"].forEach((id) => $(id).addEventListener("click", (e) => {
  const chip = e.target.closest(".g-chip");
  if (!chip || String(settings[id]) === chip.dataset.value) return;
  if (online() && net.active && (id === "size" || id === "tourn")) return; // the host's setup applies once a game is under way
  settings[id] = chip.dataset.value;
  store.set(KEY, settings);
  syncChips();
  if (online() && (id === "size" || id === "tourn")) return;
  newGame();
}));
$("newGame").addEventListener("click", newGame);
$("again").addEventListener("click", () => { if (online()) { net.rematch(); $("end").classList.remove("show"); } else newGame(); });
$("endView").addEventListener("click", () => $("end").classList.remove("show"));
$("undo").addEventListener("click", undo);
$("hint").addEventListener("click", showHint);
svg.addEventListener("pointerleave", () => { if (hover !== -1) { hover = -1; if (s) draw(); } });
const mute = $("mute");
const syncMute = () => { mute.textContent = settings.muted ? "Sound Off" : "Sound On"; mute.setAttribute("aria-pressed", String(settings.muted)); };
mute.addEventListener("click", () => { settings.muted = !settings.muted; store.set(KEY, settings); syncMute(); });

syncChips();
syncMute();
newGame();
const invited = net.roomParam();
if (invited) { settings.mode = "online"; syncChips(); newGame(); net.join(invited); }
window.__pente = { onPoint, legalMoves, play, centre, get s() { return s; }, get over() { return over; }, get busy() { return busy; }, get myP() { return myP; }, tourn };

// keyboard and screen-reader play on the board
boardKeys($("mb"), { selector: "[data-i]", describe: (i) => (s && s.b[i] ? `${s.b[i] === 1 ? "Black" : "White"} stone` : "") });
