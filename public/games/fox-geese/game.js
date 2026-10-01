import { createOnline } from "../../assets/online.js";
import { N, valid, initial, actions, act, endTurn, outcome, chooseTurn, foxMoves, foxPos, geeseCount, other } from "./logic.js";

const $ = (id) => document.getElementById(id);
const store = {
  get(key, fallback) { try { const raw = localStorage.getItem(key); return raw === null ? fallback : JSON.parse(raw); } catch (err) { return fallback; } },
  set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (err) { /* private mode */ } },
};
const KEY = "zone210_foxgeese_settings";
const settings = { mode: "cpu", level: "normal", first: "me", geese: "13", muted: false, ...store.get(KEY, {}) };
if (!["cpu", "two", "online"].includes(settings.mode)) settings.mode = "cpu";
if (!["easy", "normal", "hard"].includes(settings.level)) settings.level = "normal";
if (!["13", "15", "17"].includes(String(settings.geese))) settings.geese = "13";
settings.geese = String(settings.geese);

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
  goose: () => tone(330, 0, 0.07, "triangle", 0.1),
  fox: () => tone(250, 0, 0.07, "triangle", 0.1),
  jump: () => { tone(520, 0, 0.08, "triangle", 0.1); tone(220, 0.07, 0.14, "sawtooth", 0.07); },
  win: () => [523, 659, 784, 1046, 784, 1046].forEach((f, i) => tone(f, i * 0.1, 0.24, "triangle", 0.1)),
  lose: () => [330, 262, 196].forEach((f, i) => tone(f, i * 0.16, 0.3, "sawtooth", 0.06)),
};

const online = () => settings.mode === "online";
const cpu = () => settings.mode === "cpu";
let myP = 1; // online: role 0 plays the Fox (and moves first)
const inbox = [];
const net = createOnline({
  container: document.querySelector(".g-page"),
  before: $("pbars"),
  prefix: "zone210-foxgeese-",
  names: ["Fox", "Geese"],
  startInfo: () => ({ geese: settings.geese }),
  onStart: ({ role, info }) => {
    myP = role === 0 ? 1 : 2;
    if (info && ["13", "15", "17"].includes(String(info.geese))) settings.geese = String(info.geese);
    syncChips();
    inbox.length = 0;
    newGame();
  },
  onData: (m) => { inbox.push(m); drain(); },
  onLeft: () => { inbox.length = 0; draw(); setStatus("Your friend left the game."); },
  getState: () => ({ s, chainFrom, last, reps: [...reps], idle, result, over, endArgs, inbox: [...inbox] }),
  setState: (st) => {
    s = st.s; chainFrom = st.chainFrom; last = st.last; reps = new Map(st.reps); idle = st.idle; result = st.result; endArgs = st.endArgs;
    sel = null; busy = false; hist = []; hintTurn = null; over = false;
    inbox.length = 0; inbox.push(...st.inbox);
    draw(); announce(); drain();
    if (st.over && st.endArgs) finish(...st.endArgs);
  },
});
function drain() {
  while (online() && net.active && inbox.length && !over && !busy && s.turn !== myP) {
    const m = inbox.shift();
    if (m.t === "a" && m.a) {
      const ok = actions(s, chainFrom).find((x) => x.kind === m.a.kind && x.from === m.a.from && x.to === m.a.to);
      if (ok) doAction(ok, true);
    } else if (m.t === "stop" && chainFrom !== null) stopChain(true);
  }
}

let s = null;
let sel = null;
let chainFrom = null; // fox mid-way through a chain of jumps
let over = false;
let busy = false;
let endArgs = null;
let last = null;
let hist = [];
let reps = new Map();
let idle = 0;
let hintTurn = null;
let result = null;
const humanP = () => (cpu() ? (settings.first === "me" ? 1 : 2) : null);
const isCpuTurn = () => cpu() && s.turn !== humanP();
const mine = () => (online() ? net.active && s.turn === myP : cpu() ? s.turn === humanP() : true);
const roleName = (p) => (p === 1 ? "Fox" : "Geese");
const pname = (p) => (cpu() ? (p === humanP() ? "You" : "Computer") : online() ? (p === myP ? "You" : "Friend") : roleName(p));
const statusEl = $("status");
const setStatus = (t, kind = "") => { statusEl.textContent = t; statusEl.className = "g-status" + (kind ? ` ${kind}` : ""); };

// ---------- drawing ----------
const svg = $("mb");
const NS = "http://www.w3.org/2000/svg";
const el = (name, attrs = {}, parent = svg) => { const e = document.createElementNS(NS, name); Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v)); parent.appendChild(e); return e; };
const px = (i) => 40 + (i % N) * 43.3;
const py = (i) => 40 + Math.floor(i / N) * 43.3;

function draw() {
  svg.innerHTML = "";
  const defs = el("defs");
  const bg = el("linearGradient", { id: "wood", x1: "0", y1: "0", x2: "1", y2: "1" }, defs);
  el("stop", { offset: "0", "stop-color": "#e6c48d" }, bg); el("stop", { offset: "1", "stop-color": "#c99b5e" }, bg);
  el("rect", { x: 0, y: 0, width: 340, height: 340, rx: 18, fill: "url(#wood)" });
  el("rect", { x: 4, y: 4, width: 332, height: 332, rx: 15, fill: "none", stroke: "rgba(74,45,20,0.35)", "stroke-width": 2 });
  for (let i = 0; i < N * N; i += 1) {
    if (!valid(Math.floor(i / N), i % N)) continue;
    for (const j of [i + 1, i + N]) {
      const ok = j < N * N && valid(Math.floor(j / N), j % N) && (j === i + 1 ? i % N < N - 1 : true);
      if (ok) el("line", { x1: px(i), y1: py(i), x2: px(j), y2: py(j), stroke: "#4a2d14", "stroke-width": 3.5, "stroke-linecap": "round" });
    }
  }
  const canAct = !over && !busy && mine() && !isCpuTurn();
  const acts = canAct ? actions(s, chainFrom) : [];
  const targets = new Set();
  const movable = new Set();
  if (canAct) {
    if (s.turn === 1) { const fp = foxPos(s); if (sel === fp || chainFrom !== null) acts.forEach((a) => targets.add(a.to)); else if (acts.length) movable.add(fp); }
    else if (sel !== null) acts.filter((a) => a.from === sel).forEach((a) => targets.add(a.to));
    else acts.forEach((a) => movable.add(a.from));
  }
  for (let i = 0; i < N * N; i += 1) {
    if (s.b[i] === 9) continue;
    const x = px(i), y = py(i), v = s.b[i];
    el("circle", { cx: x, cy: y, r: 5.5, fill: "#4a2d14" });
    if (last && (last.to === i || last.from === i)) el("circle", { cx: x, cy: y, r: 20, fill: "none", stroke: "rgba(255,190,40,0.95)", "stroke-width": 3 });
    if (last && last.over === i) el("circle", { cx: x, cy: y, r: 12, fill: "none", stroke: "rgba(150,30,30,0.75)", "stroke-width": 3, "stroke-dasharray": "4 4" });
    if (v === 1 || v === 2) {
      el("circle", { cx: x, cy: y + 2.5, r: 17, fill: "rgba(0,0,0,0.3)" });
      el("circle", { cx: x, cy: y, r: 17, fill: v === 1 ? "#f08a24" : "#f4eede", stroke: v === 1 ? "#8a4300" : "#8c8470", "stroke-width": 2 });
      const t = el("text", { x, y: y + 6.5, "text-anchor": "middle", "font-size": 19, "pointer-events": "none" });
      t.textContent = v === 1 ? "🦊" : "🦆";
    }
    if (sel === i) el("circle", { cx: x, cy: y, r: 21, fill: "none", stroke: "#fff", "stroke-width": 3.5 });
    else if (movable.has(i)) el("circle", { cx: x, cy: y, r: 21, fill: "none", stroke: "rgba(255,255,255,0.8)", "stroke-width": 3, class: "pulse" });
    if (targets.has(i)) {
      const isJump = acts.some((a) => a.to === i && a.kind === "jump");
      el("circle", { cx: x, cy: y, r: 10, fill: isJump ? "rgba(47,191,113,0.9)" : "rgba(255,255,255,0.85)", stroke: "#b07a00", "stroke-width": 2.5, class: "pulse" });
    }
    if (hintTurn && hintTurn.moves.some((m) => m.from === i || m.to === i)) el("circle", { cx: x, cy: y, r: 23, fill: "none", stroke: "#2fbf71", "stroke-width": 4, class: "pulse" });
    if (result && result.trapped === i) el("circle", { cx: x, cy: y, r: 25, fill: "none", stroke: "#d43b3b", "stroke-width": 4, class: "pulse" });
    const hit = el("circle", { cx: x, cy: y, r: 22, class: "hit" });
    hit.addEventListener("click", () => onPoint(i));
  }
  const g = geeseCount(s);
  const bar = (p) => `<div class="pbar${!over && s.turn === p ? " turn" : ""}" style="--c1:${p === 1 ? "#ffb347" : "#fffaf0"};--c2:${p === 1 ? "#c8680a" : "#cfc6af"}"><span class="chip"></span><span class="nm">${pname(p)}<small>${p === 1 ? `Fox · captured ${s.captured}` : `Geese · ${g} left`}</small></span></div>`;
  $("pbars").innerHTML = bar(1) + bar(2);
  $("stopJump").hidden = !(canAct && chainFrom !== null);
}

// ---------- flow ----------
const keyOf = () => s.b.join("") + s.turn + (chainFrom ?? "");
function newGame() {
  s = initial(Number(settings.geese));
  sel = null; chainFrom = null; over = false; busy = false; last = null; hist = []; reps = new Map(); idle = 0; hintTurn = null; result = null;
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
  if (chainFrom !== null) return setStatus("Jump again, or tap \"Stop jumping\".", "good");
  const who = cpu() || online() ? "Your" : `${pname(s.turn)}'s`;
  if (s.turn === 1) {
    const jump = foxMoves(s).some((m) => m.kind === "jump");
    return setStatus(`${who} move: tap the fox, then where to go${jump ? ". You can capture!" : "."}`, jump ? "good" : "");
  }
  return setStatus(`${who} move: tap a goose, then an empty point forward or sideways.`);
}
function onPoint(i) {
  if (over || busy || !mine() || isCpuTurn()) return;
  const acts = actions(s, chainFrom);
  if (s.turn === 1) {
    const fp = foxPos(s);
    if (sel === null && chainFrom === null && i === fp && acts.length) { sel = fp; hintTurn = null; draw(); return undefined; }
    if (sel === fp || chainFrom !== null) {
      const a = acts.find((x) => x.to === i);
      if (a) return doAction(a, false);
      if (chainFrom === null) { sel = null; draw(); }
    }
    return undefined;
  }
  if (sel !== null) { const a = acts.find((x) => x.from === sel && x.to === i); if (a) return doAction(a, false); }
  if (acts.some((x) => x.from === i)) { sel = sel === i ? null : i; hintTurn = null; draw(); } else if (sel !== null) { sel = null; draw(); }
  return undefined;
}
function doAction(a, remote) {
  if (!remote && online()) net.send({ t: "a", a });
  if (chainFrom === null) hist.push({ s, last, idle, reps: new Map(reps), chainFrom });
  const p = s.turn;
  s = act(s, a);
  last = { from: a.from, to: a.to, over: a.kind === "jump" ? a.over : null };
  sel = null; hintTurn = null;
  if (a.kind === "jump") { sfx.jump(); idle = 0; } else if (p === 2) { sfx.goose(); if (Math.floor(a.to / N) < Math.floor(a.from / N)) idle = 0; else idle += 1; } else { sfx.fox(); idle += 1; }
  if (a.kind === "jump" && foxMoves(s, a.to, true).length) {
    chainFrom = a.to;
    if (geeseCount(s) < 6) { chainFrom = null; return finishTurn(); }
    draw(); announce();
    return undefined;
  }
  chainFrom = null;
  return finishTurn();
}
function stopChain(remote) {
  if (chainFrom === null) return undefined;
  if (!remote && online()) net.send({ t: "stop" });
  chainFrom = null;
  return finishTurn();
}
function finishTurn() {
  s = endTurn(s);
  const k = keyOf();
  reps.set(k, (reps.get(k) || 0) + 1);
  const out = outcome(s);
  if (out) { result = { trapped: out.winner === 2 ? foxPos(s) : null }; draw(); return finish(out); }
  if (reps.get(k) >= 3) { draw(); return finish({ winner: 0, why: "the same position came up three times" }); }
  if (idle >= 60) { draw(); return finish({ winner: 0, why: "no goose has advanced and nothing was captured for a long time" }); }
  draw(); announce();
  if (isCpuTurn()) cpuTurn();
  drain();
  return undefined;
}
async function cpuTurn() {
  busy = true;
  draw();
  await sleep(650);
  const t = chooseTurn(s, settings.level);
  busy = false;
  if (!t || over) return;
  for (let k = 0; k < t.moves.length; k += 1) {
    if (over) return;
    doAction(t.moves[k], true);
    if (k < t.moves.length - 1) { busy = true; await sleep(550); busy = false; }
  }
  if (chainFrom !== null && !over) stopChain(true);
}
function finish(out) {
  endArgs = Array.from(arguments);
  over = true; busy = false;
  const w = out.winner;
  let title, emoji = "🏆", you = null;
  if (w === 0) { title = "It's a draw!"; emoji = "🤝"; }
  else {
    you = cpu() ? w === humanP() : online() ? w === myP : true;
    title = cpu() ? (you ? "You win!" : "The computer wins") : online() ? (you ? "You win!" : "Your friend wins.") : `The ${roleName(w)} win${w === 1 ? "s" : ""}!`;
    if (you === false) emoji = cpu() ? "🤖" : "🎲";
    else emoji = w === 1 ? "🦊" : "🦆";
  }
  $("endEmoji").textContent = emoji;
  $("endTitle").textContent = title;
  $("endText").textContent = w === 0 ? `Drawn: ${out.why}.` : `${out.why.charAt(0).toUpperCase()}${out.why.slice(1)}. Geese left: ${geeseCount(s)}.`;
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
  s = prev.s; last = prev.last; idle = prev.idle; reps = prev.reps; chainFrom = null; over = false; result = null; sel = null; hintTurn = null;
  $("end").classList.remove("show");
  draw(); announce();
}
function showHint() {
  if (over || busy || !mine() || online() || isCpuTurn() || chainFrom !== null) return;
  hintTurn = chooseTurn(s, "hard");
  draw();
  setStatus("Hint: the green rings mark a strong move.");
}

// ---------- controls ----------
function syncChips() {
  ["mode", "level", "first", "geese"].forEach((k) => document.querySelectorAll(`#${k} .g-chip`).forEach((c) => c.setAttribute("aria-pressed", String(c.dataset.value === String(settings[k])))));
  $("levelRow").hidden = !cpu();
  $("firstRow").hidden = !cpu();
  $("undo").hidden = $("hint").hidden = $("newGame").hidden = online();
  if (online()) net.open(); else net.close();
}
["mode", "level", "first", "geese"].forEach((id) => $(id).addEventListener("click", (e) => {
  const chip = e.target.closest(".g-chip");
  if (!chip || String(settings[id]) === chip.dataset.value) return;
  if (online() && net.active && id === "geese") return; // the host's flock size applies once a game is under way
  settings[id] = chip.dataset.value;
  store.set(KEY, settings);
  syncChips();
  if (online() && id === "geese") return;
  newGame();
}));
$("stopJump").addEventListener("click", () => stopChain(false));
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
window.__fg = { onPoint, actions, foxMoves, stopChain, get s() { return s; }, get over() { return over; }, get busy() { return busy; }, get myP() { return myP; }, get chainFrom() { return chainFrom; } };
