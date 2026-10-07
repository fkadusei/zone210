import { createOnline } from "../../assets/online.js";
import { boardKeys } from "../../assets/board-keys.js";
import { initial, actions, apply, outcome, chooseAction, other } from "./logic.js";

const $ = (id) => document.getElementById(id);
const store = {
  get(key, fallback) { try { const raw = localStorage.getItem(key); return raw === null ? fallback : JSON.parse(raw); } catch (err) { return fallback; } },
  set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (err) { /* private mode */ } },
};
const KEY = "zone210_achi_settings";
const settings = { mode: "cpu", level: "normal", first: "me", muted: false, ...store.get(KEY, {}) };
if (!["cpu", "two", "online"].includes(settings.mode)) settings.mode = "cpu";
if (!["easy", "normal", "hard"].includes(settings.level)) settings.level = "normal";
const PAL = { 1: ["#ffe08a", "#c98a00", "#8a5d00"], 2: ["#4fae7c", "#17503a", "#0c2b1f"] };

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
  place: () => tone(300, 0, 0.07, "triangle", 0.1),
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
  prefix: "zone210-achi-",
  names: ["First", "Second"],
  onStart: ({ role }) => { myP = role === 0 ? 1 : 2; inbox.length = 0; newGame(); },
  onData: (m) => { inbox.push(m); drain(); },
  onLeft: () => { inbox.length = 0; draw(); setStatus("Your friend left the game."); },
  getState: () => ({ s, over, last, win, reps: [...reps], endOut, inbox: [...inbox] }),
  setState: (st) => {
    s = st.s; last = st.last; win = st.win; reps = new Map(st.reps); endOut = st.endOut;
    sel = null; busy = false; hist = []; hintA = null; over = false;
    inbox.length = 0; inbox.push(...st.inbox);
    draw(); announce(); drain();
    if (st.over && endOut) finish(endOut);
  },
});
function drain() {
  while (online() && net.active && inbox.length && !over && !busy && s.turn !== myP) {
    const m = inbox.shift();
    if (m.t === "a" && m.a) {
      const ok = actions(s).find((x) => x.kind === m.a.kind && x.to === m.a.to && (x.kind === "place" || x.from === m.a.from));
      if (ok) doAction(ok, true);
    }
  }
}

let s = null;
let sel = null;
let over = false;
let busy = false;
let endOut = null;
let win = null;
let last = null;
let hist = [];
let reps = new Map();
let hintA = null;
const humanP = () => (cpu() ? (settings.first === "me" ? 1 : 2) : null);
const isCpuTurn = () => cpu() && s.turn !== humanP();
const mine = () => (online() ? net.active && s.turn === myP : cpu() ? s.turn === humanP() : true);
const nameOf = (p) => (cpu() ? (p === humanP() ? "You" : "Computer") : online() ? (p === myP ? "You" : "Friend") : `Player ${p}`);
const statusEl = $("status");
const setStatus = (t, kind = "") => { statusEl.textContent = t; statusEl.className = "g-status" + (kind ? ` ${kind}` : ""); };

// ---------- drawing ----------
const svg = $("mb");
const NS = "http://www.w3.org/2000/svg";
const el = (name, attrs = {}, parent = svg) => { const e = document.createElementNS(NS, name); Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v)); parent.appendChild(e); return e; };
const pos = (i) => ({ x: 60 + (i % 3) * 110, y: 60 + Math.floor(i / 3) * 110 });

function draw() {
  svg.innerHTML = "";
  const defs = el("defs");
  [1, 2].forEach((p) => { const g = el("radialGradient", { id: `pg${p}`, cx: "35%", cy: "30%", r: "75%" }, defs); el("stop", { offset: "0", "stop-color": PAL[p][0] }, g); el("stop", { offset: "1", "stop-color": PAL[p][1] }, g); });
  const bg = el("linearGradient", { id: "wood", x1: "0", y1: "0", x2: "1", y2: "1" }, defs);
  el("stop", { offset: "0", "stop-color": "#e6c48d" }, bg); el("stop", { offset: "1", "stop-color": "#c99b5e" }, bg);
  el("rect", { x: 0, y: 0, width: 340, height: 340, rx: 18, fill: "url(#wood)" });
  el("rect", { x: 4, y: 4, width: 332, height: 332, rx: 15, fill: "none", stroke: "rgba(74,45,20,0.35)", "stroke-width": 2 });
  const line = (a, b) => { const p = pos(a), q = pos(b); el("line", { x1: p.x, y1: p.y, x2: q.x, y2: q.y, stroke: "#4a2d14", "stroke-width": 4, "stroke-linecap": "round" }); };
  [[0, 2], [3, 5], [6, 8], [0, 6], [1, 7], [2, 8], [0, 8], [2, 6]].forEach(([a, b]) => line(a, b));
  const canAct = !over && !busy && mine() && !isCpuTurn();
  const acts = canAct ? actions(s) : [];
  const placing = canAct && s.place[s.turn] > 0;
  const movable = new Set(!placing ? acts.map((a) => a.from) : []);
  const targets = new Set(sel !== null ? acts.filter((a) => a.from === sel).map((a) => a.to) : []);
  for (let i = 0; i < 9; i += 1) {
    const { x, y } = pos(i);
    el("circle", { cx: x, cy: y, r: 6, fill: "#4a2d14" });
    if (last && (last.to === i || last.from === i)) el("circle", { cx: x, cy: y, r: 31, fill: "none", stroke: "rgba(255,190,40,0.9)", "stroke-width": 3 });
    const v = s.b[i];
    if (v) {
      el("circle", { cx: x, cy: y + 3, r: 24, fill: "rgba(0,0,0,0.3)" });
      el("circle", { cx: x, cy: y, r: 24, fill: `url(#pg${v})`, stroke: PAL[v][2], "stroke-width": 2 });
      el("circle", { cx: x, cy: y, r: 14, fill: "none", stroke: "rgba(255,255,255,0.25)", "stroke-width": 2 });
    }
    if (win && win.includes(i)) el("circle", { cx: x, cy: y, r: 30, fill: "none", stroke: "#fff", "stroke-width": 4, class: "pulse" });
    if (sel === i) el("circle", { cx: x, cy: y, r: 30, fill: "none", stroke: "#fff", "stroke-width": 4 });
    else if (movable.has(i) && sel === null) el("circle", { cx: x, cy: y, r: 30, fill: "none", stroke: "rgba(255,255,255,0.75)", "stroke-width": 3, class: "pulse" });
    if (targets.has(i)) el("circle", { cx: x, cy: y, r: 13, fill: "rgba(255,255,255,0.85)", stroke: "#b07a00", "stroke-width": 3, class: "pulse" });
    if (placing && !v) el("circle", { cx: x, cy: y, r: 12, fill: "rgba(255,255,255,0.45)", class: "pulse" });
    if (hintA && ((hintA.kind === "place" && hintA.to === i) || (hintA.kind === "move" && (hintA.from === i || hintA.to === i)))) el("circle", { cx: x, cy: y, r: 34, fill: "none", stroke: "#2fbf71", "stroke-width": 4, class: "pulse" });
    const hit = el("circle", { cx: x, cy: y, r: 38, class: "hit" });
    hit.dataset.i = i; hit.addEventListener("click", () => onPoint(i));
  }
  $("pbars").innerHTML = [1, 2].map((p) => `<div class="pbar${!over && s.turn === p ? " turn" : ""}" style="--c1:${PAL[p][0]};--c2:${PAL[p][1]}"><span class="chip"></span><span class="nm">${nameOf(p)}<small>To place ${s.place[p]} · On board ${s.b.filter((v) => v === p).length}</small></span></div>`).join("");
}

// ---------- flow ----------
const keyOf = () => s.b.join("") + s.turn + s.place[1] + s.place[2];
function newGame() {
  s = initial(); // 3 pieces each (set in logic.js)
  sel = null; over = false; busy = false; win = null; last = null; hist = []; reps = new Map(); hintA = null;
  $("end").classList.remove("show");
  net.setOver(false);
  $("again").textContent = online() ? "Rematch" : "Play again";
  draw();
  announce();
  if (isCpuTurn()) cpuTurn();
}
function announce() {
  if (over) return;
  if (online() && !net.active) return setStatus("Create or join a room to start.");
  if (isCpuTurn()) return setStatus("The computer is thinking…");
  if (online() && s.turn !== myP) return setStatus("Your friend's move…");
  const who = cpu() || online() ? "Your" : `${nameOf(s.turn)}'s`;
  setStatus(s.place[s.turn] > 0 ? `${who} turn: place a piece (${s.place[s.turn]} left).` : `${who} turn: tap a piece, then an empty point next to it.`);
}
function onPoint(i) {
  if (over || busy || !mine() || isCpuTurn()) return;
  if (s.place[s.turn] > 0) { if (!s.b[i]) doAction({ kind: "place", to: i }, false); return; }
  const acts = actions(s);
  if (sel !== null) { const a = acts.find((x) => x.from === sel && x.to === i); if (a) return doAction(a, false); }
  if (acts.some((x) => x.from === i)) { sel = sel === i ? null : i; hintA = null; draw(); } else if (sel !== null) { sel = null; draw(); }
  return undefined;
}
function doAction(a, remote) {
  if (!remote && online()) net.send({ t: "a", a });
  hist.push({ s, last, reps: new Map(reps) });
  s = apply(s, a);
  last = { from: a.kind === "move" ? a.from : null, to: a.to };
  sel = null; hintA = null;
  sfx.place();
  const k = keyOf();
  reps.set(k, (reps.get(k) || 0) + 1);
  const out = outcome(s);
  draw();
  if (out) return finish(out);
  if (reps.get(k) >= 3) return finish({ winner: 0, why: "the same position came up three times" });
  announce();
  if (isCpuTurn()) cpuTurn();
  drain();
  return undefined;
}
async function cpuTurn() {
  busy = true;
  draw();
  await sleep(650);
  const a = chooseAction(s, settings.level);
  busy = false;
  if (a && !over) doAction(a, true);
}
function finish(out) {
  endOut = out;
  over = true; busy = false;
  win = out.line;
  draw();
  const w = out.winner;
  let title, emoji = "🏆", you = null;
  if (w === 0) { title = "It's a draw!"; emoji = "🤝"; }
  else {
    you = cpu() ? w === humanP() : online() ? w === myP : true;
    title = cpu() ? (you ? "You win!" : "The computer wins") : online() ? (you ? "You win!" : "Your friend wins.") : `${nameOf(w)} wins!`;
    if (you === false) emoji = cpu() ? "🤖" : "🎲";
  }
  $("endEmoji").textContent = emoji;
  $("endTitle").textContent = title;
  $("endText").textContent = w === 0 ? `Drawn: ${out.why}.` : out.why === "three in a row" ? "Three in a row!" : `${nameOf(other(w))} ${nameOf(other(w)) === "You" ? "have" : "has"} no legal move.`;
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
  s = prev.s; last = prev.last; reps = prev.reps; over = false; win = null; sel = null; hintA = null;
  $("end").classList.remove("show");
  draw(); announce();
}
function showHint() {
  if (over || busy || !mine() || online() || isCpuTurn()) return;
  hintA = chooseAction(s, "hard");
  draw();
  setStatus("Hint: the green ring marks a strong move.");
}

// ---------- controls ----------
function syncChips() {
  ["mode", "level", "first"].forEach((k) => document.querySelectorAll(`#${k} .g-chip`).forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.value === settings[k]))));
  $("levelRow").hidden = !cpu();
  $("firstRow").hidden = !cpu();
  $("undo").hidden = $("hint").hidden = $("newGame").hidden = online();
  if (online()) net.open(); else net.close();
}
["mode", "level", "first"].forEach((id) => $(id).addEventListener("click", (e) => {
  const chip = e.target.closest(".g-chip");
  if (!chip || settings[id] === chip.dataset.value) return;
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
window.__achi = { onPoint, actions, get s() { return s; }, get over() { return over; }, get busy() { return busy; }, get myP() { return myP; } };

// keyboard and screen-reader play on the board
const ownr = (n, what) => (n === "You" ? `your ${what}` : `${n}'s ${what}`);
boardKeys($("mb"), { selector: "[data-i]", describe: (i) => (s && s.b[i] ? ownr(nameOf(s.b[i]), "piece") : "") });
