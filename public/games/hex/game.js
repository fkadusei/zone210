import { createOnline } from "../../assets/online.js";
import { boardKeys } from "../../assets/board-keys.js";
import { neighbors, emptyBoard, winningPath, chooseMove, shouldSwap, pieOpening } from "./logic.js";

const $ = (id) => document.getElementById(id);
const store = {
  get(key, fallback) { try { const raw = localStorage.getItem(key); return raw === null ? fallback : JSON.parse(raw); } catch (err) { return fallback; } },
  set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (err) { /* private mode */ } },
};
const KEY = "zone210_hex_settings";
const settings = { mode: "cpu", level: "normal", first: "me", size: "9", swap: "on", muted: false, ...store.get(KEY, {}) };
if (!["cpu", "two", "online"].includes(settings.mode)) settings.mode = "cpu";
if (!["easy", "normal", "hard"].includes(settings.level)) settings.level = "normal";
if (!["7", "9", "11"].includes(String(settings.size))) settings.size = "9";
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
  r: () => tone(380, 0, 0.07, "triangle", 0.1),
  b: () => tone(300, 0, 0.07, "triangle", 0.1),
  swap: () => [440, 330].forEach((f, i) => tone(f, i * 0.08, 0.14, "triangle", 0.1)),
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
  prefix: "zone210-hex-",
  names: ["Red", "Blue"],
  startInfo: () => ({ size: settings.size, swap: settings.swap }),
  onStart: ({ role, info }) => {
    myP = role === 0 ? 1 : 2;
    if (info && ["7", "9", "11"].includes(String(info.size))) settings.size = String(info.size);
    if (info && ["on", "off"].includes(info.swap)) settings.swap = info.swap;
    syncChips();
    inbox.length = 0;
    newGame();
  },
  onData: (m) => { inbox.push(m); drain(); },
  onLeft: () => { inbox.length = 0; draw(); setStatus("Your friend left the game."); },
  getState: () => ({ n, b, toMove, who, moves, over, last, win, endArgs, inbox: [...inbox] }),
  setState: (st) => {
    n = st.n; b = st.b; toMove = st.toMove; who = st.who; moves = st.moves; last = st.last; win = st.win; endArgs = st.endArgs;
    busy = false; hist = []; over = false;
    inbox.length = 0; inbox.push(...st.inbox);
    draw(); announce(); drain();
    if (st.over && st.endArgs) finish(...st.endArgs);
  },
});
function drain() {
  while (online() && net.active && inbox.length && !over && !busy && who[toMove] !== myP) {
    const m = inbox.shift();
    if (m.t === "m" && Number.isInteger(m.i) && !b[m.i]) place(m.i, true);
    else if (m.t === "swap" && canSwap()) doSwap(true);
  }
}

let n = 9;
let b = [];
let toMove = 1; // colour to move: 1 Red (top-bottom), 2 Blue (left-right)
let who = { 1: 1, 2: 2 }; // which player controls each colour (changes after a swap)
let moves = 0;
let over = false;
let busy = false;
let endArgs = null;
let last = -1;
let win = null;
let hist = [];
const humanP = () => (cpu() ? (settings.first === "me" ? 1 : 2) : null);
const mover = () => who[toMove];
const isCpuTurn = () => cpu() && mover() !== humanP();
const mine = () => (online() ? net.active && mover() === myP : cpu() ? mover() === humanP() : true);
const cname = (c) => (c === 1 ? "Red" : "Blue");
const pname = (p) => (cpu() ? (p === humanP() ? "You" : "Computer") : online() ? (p === myP ? "You" : "Friend") : `Player ${p}`);
const colourOf = (p) => (who[1] === p ? 1 : 2);
const statusEl = $("status");
const setStatus = (t, kind = "") => { statusEl.textContent = t; statusEl.className = "g-status" + (kind ? ` ${kind}` : ""); };
const canSwap = () => settings.swap === "on" && moves === 1 && !over && toMove === 2 && who[1] === 1;

// ---------- drawing ----------
const svg = $("mb");
const NS = "http://www.w3.org/2000/svg";
const el = (name, attrs = {}, parent = svg) => { const e = document.createElementNS(NS, name); Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v)); parent.appendChild(e); return e; };
function draw() {
  svg.innerHTML = "";
  const S = n >= 11 ? 17 : n >= 9 ? 21 : 26;
  const W = S * Math.sqrt(3);
  const M = 24;
  const width = W * (n + (n - 1) / 2) + 2 * M;
  const height = S * (1.5 * (n - 1) + 2) + 2 * M;
  svg.setAttribute("viewBox", `0 0 ${width.toFixed(1)} ${height.toFixed(1)}`);
  const cxy = (i) => { const r = Math.floor(i / n), c = i % n; return { x: M + W / 2 + W * (c + r / 2), y: M + S + 1.5 * S * r }; };
  // coloured edges
  const poly = (pts, col) => el("polyline", { points: pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" "), fill: "none", stroke: col, "stroke-width": 7, "stroke-linecap": "round", "stroke-linejoin": "round" });
  const top = [], bottom = [], left = [], right = [];
  for (let c = 0; c < n; c += 1) { const t = cxy(c); top.push({ x: t.x - W / 2, y: t.y - S / 2 }, { x: t.x, y: t.y - S }, { x: t.x + W / 2, y: t.y - S / 2 }); const u = cxy((n - 1) * n + c); bottom.push({ x: u.x - W / 2, y: u.y + S / 2 }, { x: u.x, y: u.y + S }, { x: u.x + W / 2, y: u.y + S / 2 }); }
  for (let r = 0; r < n; r += 1) { const l = cxy(r * n); left.push({ x: l.x - W / 2, y: l.y - S / 2 }, { x: l.x - W / 2, y: l.y + S / 2 }); const q = cxy(r * n + n - 1); right.push({ x: q.x + W / 2, y: q.y - S / 2 }, { x: q.x + W / 2, y: q.y + S / 2 }); }
  poly(top, "#e5484d"); poly(bottom, "#e5484d"); poly(left, "#3b82f6"); poly(right, "#3b82f6");
  const canAct = !over && !busy && mine() && !isCpuTurn();
  const winSet = new Set(win || []);
  for (let i = 0; i < n * n; i += 1) {
    const { x, y } = cxy(i);
    const pts = Array.from({ length: 6 }, (_, k) => { const a = ((60 * k - 30) * Math.PI) / 180; return `${(x + S * 0.97 * Math.cos(a)).toFixed(1)},${(y + S * 0.97 * Math.sin(a)).toFixed(1)}`; }).join(" ");
    const v = b[i];
    const cls = "cellhex " + (v === 1 ? "r" : v === 2 ? "b" : "empty") + (winSet.has(i) ? " win" : "") + (!v && canAct ? "" : " dead");
    const h = el("polygon", { points: pts, class: cls });
    h.dataset.i = i; h.addEventListener("click", () => onCell(i));
    if (i === last) el("circle", { cx: x, cy: y, r: S * 0.28, fill: "#fff", opacity: 0.9, "pointer-events": "none" });
  }
  const bar = (c) => { const p = who[c]; return `<div class="pbar${!over && toMove === c ? " turn" : ""}" style="--c1:${c === 1 ? "#ff8a8f" : "#8ab8ff"};--c2:${c === 1 ? "#c82a30" : "#2a5fc4"}"><span class="chip"></span><span class="nm">${pname(p)}<small>${cname(c)} · ${c === 1 ? "top ↔ bottom" : "left ↔ right"}</small></span></div>`; };
  $("pbars").innerHTML = bar(1) + bar(2);
  $("swap").hidden = !(canSwap() && mine() && !isCpuTurn() && !busy);
}

// ---------- flow ----------
function newGame() {
  n = Number(settings.size);
  b = emptyBoard(n); toMove = 1; who = { 1: 1, 2: 2 }; moves = 0; over = false; busy = false; last = -1; win = null; hist = [];
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
  if (online() && mover() !== myP) return setStatus("Your friend's move…");
  const you = cpu() || online();
  const canS = canSwap() && mine();
  setStatus(`${you ? "Your" : `${pname(mover())}'s`} move as ${cname(toMove)}${canS ? ". You may also swap sides." : "."}`);
}
function onCell(i) {
  if (over || busy || !mine() || isCpuTurn() || b[i]) return;
  if (online()) net.send({ t: "m", i });
  place(i, false);
}
function place(i, remote) {
  void remote;
  hist.push({ b: b.slice(), toMove, who: { ...who }, moves, last });
  b[i] = toMove;
  moves += 1;
  last = i;
  toMove === 1 ? sfx.r() : sfx.b();
  const path = winningPath(b, n, toMove);
  if (path) { win = path; draw(); return finish(toMove); }
  toMove = 3 - toMove;
  draw();
  announce();
  if (isCpuTurn()) cpuTurn();
  drain();
  return undefined;
}
function canSwapNow() { return canSwap(); }
function doSwap(remote) {
  if (!canSwapNow()) return;
  if (!remote && online()) net.send({ t: "swap" });
  hist.push({ b: b.slice(), toMove, who: { ...who }, moves, last });
  who = { 1: 2, 2: 1 };
  sfx.swap();
  draw();
  announce();
  setStatus(`${pname(who[1])} swapped: ${pname(who[1])} now play${pname(who[1]) === "You" ? "" : "s"} Red, ${pname(who[2])} ${pname(who[2]) === "You" ? "play" : "plays"} Blue and moves next.`);
  if (isCpuTurn()) cpuTurn();
  drain();
}
async function cpuTurn() {
  busy = true;
  draw();
  await sleep(500);
  // pie rule: the computer as second player decides whether to take over the opening stone
  if (canSwap() && shouldSwap(n, last)) { busy = false; return doSwap(true); }
  let i;
  if (moves === 0 && settings.swap === "on") i = pieOpening(n);
  else i = chooseMove(b, n, toMove, settings.level);
  busy = false;
  if (i >= 0 && !over) place(i, true);
  return undefined;
}
function finish(c) {
  endArgs = Array.from(arguments);
  over = true; busy = false;
  const p = who[c];
  const you = cpu() ? p === humanP() : online() ? p === myP : true;
  const title = cpu() ? (you ? "You win!" : "The computer wins") : online() ? (you ? "You win!" : "Your friend wins.") : `${pname(p)} (${cname(c)}) wins!`;
  $("endEmoji").textContent = you ? "🏆" : cpu() ? "🤖" : "🎲";
  $("endTitle").textContent = title;
  $("endText").textContent = `${cname(c)} linked ${c === 1 ? "top to bottom" : "left to right"} in ${moves} stones.`;
  setStatus(title, "good");
  you ? sfx.win() : sfx.lose();
  net.setOver(true);
  setTimeout(() => $("end").classList.add("show"), 800);
}
function undo() {
  if (busy || !hist.length || online()) return;
  let steps = 1;
  if (cpu()) { steps = 0; for (let k = hist.length - 1; k >= 0; k -= 1) { steps += 1; if (who[hist[k].toMove] === humanP() && hist[k].who[hist[k].toMove] === humanP()) break; } }
  let prev = null;
  for (let k = 0; k < steps && hist.length; k += 1) prev = hist.pop();
  if (!prev) return;
  b = prev.b; toMove = prev.toMove; who = prev.who; moves = prev.moves; last = prev.last; over = false; win = null;
  $("end").classList.remove("show");
  draw(); announce();
  if (isCpuTurn()) cpuTurn();
}

// ---------- controls ----------
function syncChips() {
  ["mode", "level", "first", "size", "swapRule"].forEach((k) => {
    const key = k === "swapRule" ? "swap" : k;
    document.querySelectorAll(`#${k} .g-chip`).forEach((c) => c.setAttribute("aria-pressed", String(c.dataset.value === String(settings[key]))));
  });
  $("levelRow").hidden = !cpu();
  $("firstRow").hidden = !cpu();
  $("undo").hidden = $("newGame").hidden = online();
  if (online()) net.open(); else net.close();
}
["mode", "level", "first", "size", "swapRule"].forEach((id) => $(id).addEventListener("click", (e) => {
  const chip = e.target.closest(".g-chip");
  const key = id === "swapRule" ? "swap" : id;
  if (!chip || String(settings[key]) === chip.dataset.value) return;
  if (online() && net.active && (key === "size" || key === "swap")) return; // the host's board applies once a game is under way
  settings[key] = chip.dataset.value;
  store.set(KEY, settings);
  syncChips();
  if (online() && (key === "size" || key === "swap")) return;
  newGame();
}));
$("swap").addEventListener("click", () => doSwap(false));
$("newGame").addEventListener("click", newGame);
$("again").addEventListener("click", () => { if (online()) { net.rematch(); $("end").classList.remove("show"); } else newGame(); });
$("endView").addEventListener("click", () => $("end").classList.remove("show"));
$("undo").addEventListener("click", undo);
const mute = $("mute");
const syncMute = () => { mute.textContent = settings.muted ? "Sound Off" : "Sound On"; mute.setAttribute("aria-pressed", String(settings.muted)); };
mute.addEventListener("click", () => { settings.muted = !settings.muted; store.set(KEY, settings); syncMute(); });

$("hint")?.remove();
syncChips();
syncMute();
newGame();
const invited = net.roomParam();
if (invited) { settings.mode = "online"; syncChips(); newGame(); net.join(invited); }
window.__hex = { onCell, neighbors, doSwap, get b() { return b; }, get n() { return n; }, get toMove() { return toMove; }, get who() { return who; }, get over() { return over; }, get busy() { return busy; }, get myP() { return myP; }, get moves() { return moves; } };

// keyboard and screen-reader play on the board
boardKeys($("mb"), { selector: "[data-i]", describe: (i) => (b[i] ? `${cname(b[i])} stone` : "") });
