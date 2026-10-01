import { createOnline } from "../../assets/online.js";
import { ROWS, COLS, initial, actions, act, bonusTargets, takeBonus, endTurn, outcome, chooseOption, other, totalOf, onBoard, turnOptions } from "./logic.js";

const $ = (id) => document.getElementById(id);
const store = {
  get(key, fallback) { try { const raw = localStorage.getItem(key); return raw === null ? fallback : JSON.parse(raw); } catch (err) { return fallback; } },
  set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (err) { /* private mode */ } },
};
const KEY = "zone210_yote_settings";
const settings = { mode: "cpu", level: "normal", first: "me", muted: false, ...store.get(KEY, {}) };
if (!["cpu", "two", "online"].includes(settings.mode)) settings.mode = "cpu";
if (!["easy", "normal", "hard"].includes(settings.level)) settings.level = "normal";
const PAL = { 1: ["#ffd877", "#c9861a", "#7a4f08"], 2: ["#6f86e8", "#2a3b9b", "#141d57"] };

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
  jump: () => { tone(520, 0, 0.08, "triangle", 0.1); tone(260, 0.07, 0.12, "sawtooth", 0.07); },
  take: () => { tone(200, 0, 0.12, "sawtooth", 0.07); tone(130, 0.06, 0.15, "sine", 0.09); },
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
  prefix: "zone210-yote-",
  names: ["Gold", "Blue"],
  onStart: ({ role }) => { myP = role === 0 ? 1 : 2; inbox.length = 0; newGame(); },
  onData: (m) => { inbox.push(m); drain(); },
  onLeft: () => { inbox.length = 0; draw(); setStatus("Your friend left the game."); },
  getState: () => ({ s, over, last, reps: [...reps], noCap, rmMode, endOut, inbox: [...inbox] }),
  setState: (st) => {
    s = st.s; last = st.last; reps = new Map(st.reps); noCap = st.noCap; rmMode = st.rmMode; endOut = st.endOut;
    sel = null; busy = false; hist = []; hintOpt = null; over = false;
    inbox.length = 0; inbox.push(...st.inbox);
    draw(); announce(); drain();
    if (st.over && endOut) finish(endOut);
  },
});

let s = initial();
let sel = null;
let rmMode = false;
let over = false;
let busy = false;
let endOut = null;
let last = null;
let hist = [];
let reps = new Map();
let noCap = 0;
let hintOpt = null;
const humanP = () => (cpu() ? (settings.first === "me" ? 1 : 2) : null);
const isCpuTurn = () => cpu() && s.turn !== humanP();
const mine = () => (online() ? net.active && s.turn === myP : cpu() ? s.turn === humanP() : true);
const nameOf = (p) => (cpu() ? (p === humanP() ? "You" : "Computer") : online() ? (p === myP ? "You" : "Friend") : p === 1 ? "Gold" : "Blue");
const statusEl = $("status");
const setStatus = (t, kind = "") => { statusEl.textContent = t; statusEl.className = "g-status" + (kind ? ` ${kind}` : ""); };

function drain() {
  while (online() && net.active && inbox.length && !over && !busy) {
    const m = inbox[0];
    if (rmMode && s.turn !== myP) {
      inbox.shift();
      if (m.t === "r" && bonusTargets(s).includes(m.i)) doBonus(m.i, true);
      continue;
    }
    if (s.turn === myP) break;
    inbox.shift();
    if (m.t === "a" && m.a) {
      const ok = actions(s).find((x) => x.kind === m.a.kind && x.to === m.a.to && (x.kind === "place" || x.from === m.a.from));
      if (ok) doAction(ok, true);
    }
  }
}

// ---------- drawing ----------
const svg = $("mb");
const NS = "http://www.w3.org/2000/svg";
const el = (name, attrs = {}, parent = svg) => { const e = document.createElementNS(NS, name); Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v)); parent.appendChild(e); return e; };
const cx = (i) => 40 + (i % COLS) * 60;
const cy = (i) => 35 + Math.floor(i / COLS) * 60;

function draw() {
  svg.innerHTML = "";
  const defs = el("defs");
  [1, 2].forEach((p) => { const g = el("radialGradient", { id: `pg${p}`, cx: "35%", cy: "30%", r: "75%" }, defs); el("stop", { offset: "0", "stop-color": PAL[p][0] }, g); el("stop", { offset: "1", "stop-color": PAL[p][1] }, g); });
  el("rect", { x: 0, y: 0, width: 380, height: 330, rx: 18, fill: "#8b3a22" });
  // woven border pattern
  for (let k = 0; k < 19; k += 1) { el("rect", { x: 8 + k * 19.4, y: 6, width: 10, height: 6, fill: k % 2 ? "#f0c04a" : "#1f3a8a" }); el("rect", { x: 8 + k * 19.4, y: 318, width: 10, height: 6, fill: k % 2 ? "#f0c04a" : "#1f3a8a" }); }
  el("rect", { x: 8, y: 16, width: 364, height: 298, rx: 10, fill: "#e8c999" });
  for (let i = 0; i < 30; i += 1) {
    const r = Math.floor(i / COLS);
    const c = i % COLS;
    el("rect", { x: cx(i) - 27, y: cy(i) - 27, width: 54, height: 54, rx: 8, fill: (r + c) % 2 ? "#d9b27c" : "#e3bf8a", stroke: "rgba(90,50,20,0.35)", "stroke-width": 1.5 });
  }
  const canAct = !over && !busy && mine() && !isCpuTurn();
  const acts = canAct && !rmMode ? actions(s) : [];
  const targets = new Set(sel !== null ? acts.filter((a) => a.from === sel).map((a) => a.to) : []);
  const movable = new Set(sel === null ? acts.filter((a) => a.from !== undefined).map((a) => a.from) : []);
  const jumpFrom = new Set(sel === null ? acts.filter((a) => a.kind === "jump").map((a) => a.from) : []);
  const bonus = canAct && rmMode ? new Set(bonusTargets(s)) : new Set();
  const placing = canAct && !rmMode && sel === null && s.hand[s.turn] > 0;
  for (let i = 0; i < 30; i += 1) {
    const x = cx(i), y = cy(i), v = s.b[i];
    if (last && (last.to === i || last.from === i)) el("rect", { x: x - 27, y: y - 27, width: 54, height: 54, rx: 8, fill: "none", stroke: "rgba(255,190,40,0.95)", "stroke-width": 3.5 });
    if (last && last.removed === i) el("circle", { cx: x, cy: y, r: 14, fill: "none", stroke: "rgba(150,30,30,0.75)", "stroke-width": 3, "stroke-dasharray": "4 4" });
    if (last && last.over === i) el("circle", { cx: x, cy: y, r: 14, fill: "none", stroke: "rgba(150,30,30,0.75)", "stroke-width": 3, "stroke-dasharray": "4 4" });
    if (v) {
      el("circle", { cx: x, cy: y + 2.5, r: 21, fill: "rgba(0,0,0,0.3)" });
      el("circle", { cx: x, cy: y, r: 21, fill: `url(#pg${v})`, stroke: PAL[v][2], "stroke-width": 2 });
      el("circle", { cx: x, cy: y, r: 12, fill: "none", stroke: "rgba(255,255,255,0.28)", "stroke-width": 2 });
    }
    if (sel === i) el("rect", { x: x - 27, y: y - 27, width: 54, height: 54, rx: 8, fill: "none", stroke: "#fff", "stroke-width": 4 });
    else if (movable.has(i)) el("circle", { cx: x, cy: y, r: 25, fill: "none", stroke: jumpFrom.has(i) ? "#2fbf71" : "rgba(255,255,255,0.8)", "stroke-width": 3, class: "pulse" });
    if (targets.has(i)) {
      const isJump = acts.some((a) => a.from === sel && a.to === i && a.kind === "jump");
      el("circle", { cx: x, cy: y, r: 11, fill: isJump ? "rgba(47,191,113,0.85)" : "rgba(255,255,255,0.85)", stroke: "#b07a00", "stroke-width": 2.5, class: "pulse" });
    }
    if (placing && !v) el("circle", { cx: x, cy: y, r: 7, fill: "rgba(255,255,255,0.55)", class: "pulse" });
    if (bonus.has(i)) el("circle", { cx: x, cy: y, r: 25, fill: "rgba(220,50,50,0.25)", stroke: "#d43b3b", "stroke-width": 3.5, class: "pulse" });
    if (hintOpt && ((hintOpt.a.kind === "place" && hintOpt.a.to === i) || (hintOpt.a.kind !== "place" && (hintOpt.a.from === i || hintOpt.a.to === i)))) el("rect", { x: x - 29, y: y - 29, width: 58, height: 58, rx: 9, fill: "none", stroke: "#2fbf71", "stroke-width": 4, class: "pulse" });
    const hit = el("rect", { x: x - 30, y: y - 30, width: 60, height: 60, class: "hit" });
    hit.addEventListener("click", () => onCell(i));
  }
  const bars = [1, 2].map((p) => `<div class="pbar${!over && s.turn === p ? " turn" : ""}" style="--c1:${PAL[p][0]};--c2:${PAL[p][1]}"><span class="chip"></span><span class="nm">${nameOf(p)}<small>In hand ${s.hand[p]} · On board ${onBoard(s, p)}</small></span></div>`);
  $("pbars").innerHTML = bars.join("");
  const hasBoard = bonusTargets(s).includes("hand");
  $("takeHand").hidden = !(canAct && rmMode && hasBoard);
}

// ---------- flow ----------
const keyOf = () => s.b.join("") + s.turn + s.hand[1] + "," + s.hand[2];
function newGame() {
  s = initial(); sel = null; rmMode = false; over = false; busy = false; last = null; hist = []; reps = new Map(); noCap = 0; hintOpt = null;
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
  if (rmMode) return setStatus(bonusTargets(s).includes("hand") ? "Capture! They have no pieces on the board, so take one from their hand." : "Capture! Tap another enemy piece to remove as your bonus.", "good");
  const who = cpu() || online() ? "Your" : `${nameOf(s.turn)}'s`;
  const jump = actions(s).some((a) => a.kind === "jump");
  setStatus(`${who} turn: place a piece (${s.hand[s.turn]} in hand), or tap a piece to move it${jump ? ". A capture is available!" : "."}`);
}
function onCell(i) {
  if (over || busy || !mine() || isCpuTurn()) return;
  if (rmMode) { if (bonusTargets(s).includes(i)) doBonus(i, false); return; }
  const acts = actions(s);
  if (sel !== null) {
    const a = acts.find((x) => x.from === sel && x.to === i);
    if (a) return doAction(a, false);
    sel = null; hintOpt = null; draw();
    return undefined;
  }
  if (s.b[i] === s.turn) { if (acts.some((x) => x.from === i)) { sel = i; hintOpt = null; draw(); } else setStatus("That piece has no move right now.", "bad"); return undefined; }
  if (!s.b[i] && s.hand[s.turn] > 0) return doAction({ kind: "place", to: i }, false);
  return undefined;
}
function doAction(a, remote) {
  if (!remote && online()) net.send({ t: "a", a });
  hist.push({ s, last, noCap, reps: new Map(reps) });
  const p = s.turn;
  const r = act(s, a);
  s = r.s;
  last = { from: a.kind === "place" ? null : a.from, to: a.to, over: a.kind === "jump" ? a.over : null, removed: null };
  sel = null; hintOpt = null;
  a.kind === "jump" ? sfx.jump() : sfx.place();
  if (r.captured) {
    noCap = 0;
    const t = bonusTargets(s, p);
    if (t.length) { rmMode = true; draw(); announce(); return undefined; }
  } else noCap += 1;
  rmMode = false;
  return finishTurn();
}
function doBonus(t, remote) {
  if (!remote && online()) net.send({ t: "r", i: t });
  s = takeBonus(s, t);
  last = { ...last, removed: t === "hand" ? null : t };
  sfx.take();
  rmMode = false;
  return finishTurn();
}
function finishTurn() {
  s = endTurn(s);
  const k = keyOf();
  reps.set(k, (reps.get(k) || 0) + 1);
  draw();
  const out = outcome(s);
  if (out) return finish(out);
  if (reps.get(k) >= 3) return finish({ winner: 0, why: "the same position came up three times" });
  if (noCap >= 100) return finish({ winner: 0, why: "no captures in fifty turns each" });
  announce();
  if (isCpuTurn()) cpuTurn();
  drain();
  return undefined;
}
async function cpuTurn() {
  busy = true;
  draw();
  await sleep(650);
  const o = chooseOption(s, settings.level);
  busy = false;
  if (!o || over) return;
  doAction(o.a, true);
  if (o.rm !== null && rmMode) {
    busy = true;
    await sleep(700);
    busy = false;
    doBonus(o.rm, true);
  }
}
function finish(out) {
  endOut = out;
  over = true; busy = false;
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
  $("endText").textContent = w === 0 ? `Drawn: ${out.why}.` : `${nameOf(other(w))} ${nameOf(other(w)) === "You" ? "have" : "has"} ${out.why}. Pieces left: Gold ${totalOf(s, 1)}, Blue ${totalOf(s, 2)}.`;
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
  s = prev.s; last = prev.last; noCap = prev.noCap; reps = prev.reps; over = false; rmMode = false; sel = null; hintOpt = null;
  $("end").classList.remove("show");
  draw(); announce();
}
function showHint() {
  if (over || busy || !mine() || online() || isCpuTurn() || rmMode) return;
  hintOpt = chooseOption(s, "hard");
  draw();
  setStatus("Hint: the green square marks a strong move.");
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
$("takeHand").addEventListener("click", () => { if (rmMode && mine() && !busy) doBonus("hand", false); });
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
window.__yote = { onCell, actions, bonusTargets, turnOptions, ROWS, get s() { return s; }, get rmMode() { return rmMode; }, get over() { return over; }, get busy() { return busy; }, get myP() { return myP; }, doBonus };
