import { createOnline } from "../../assets/online.js";
import { initial, legalMoves, apply, outcome, chooseMove, other } from "./logic.js";

const $ = (id) => document.getElementById(id);
const store = {
  get(key, fallback) { try { const raw = localStorage.getItem(key); return raw === null ? fallback : JSON.parse(raw); } catch (err) { return fallback; } },
  set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (err) { /* private mode */ } },
};
const KEY = "zone210_ultimate_settings";
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
  x: () => tone(420, 0, 0.07, "triangle", 0.1),
  o: () => tone(330, 0, 0.07, "triangle", 0.1),
  board: () => [523, 784].forEach((f, i) => tone(f, i * 0.08, 0.14, "triangle", 0.1)),
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
  prefix: "zone210-ultimate-",
  names: ["X", "O"],
  onStart: ({ role }) => { myP = role === 0 ? 1 : 2; inbox.length = 0; newGame(); },
  onData: (m) => { inbox.push(m); drain(); },
  onLeft: () => { inbox.length = 0; render(); setStatus("Your friend left the game."); },
  getState: () => ({ s, over, endOut, inbox: [...inbox] }),
  setState: (st) => {
    s = st.s; endOut = st.endOut;
    busy = false; hist = []; hintMove = -1; result = null; over = false;
    inbox.length = 0; inbox.push(...st.inbox);
    render(); announce(); drain();
    if (st.over && endOut) finish(endOut);
  },
});
function drain() {
  while (online() && net.active && inbox.length && !over && !busy && s.turn !== myP) {
    const m = inbox.shift();
    if (Number.isInteger(m.i) && legalMoves(s).includes(m.i)) play(m.i, true);
  }
}

let s = initial();
let over = false;
let busy = false;
let endOut = null;
let hist = [];
let hintMove = -1;
let result = null;
const humanP = () => (cpu() ? (settings.first === "me" ? 1 : 2) : null);
const isCpuTurn = () => cpu() && s.turn !== humanP();
const mine = () => (online() ? net.active && s.turn === myP : cpu() ? s.turn === humanP() : true);
const nameOf = (p) => (cpu() ? (p === humanP() ? "You" : "Computer") : online() ? (p === myP ? "You" : "Friend") : p === 1 ? "Player X" : "Player O");
const statusEl = $("status");
const setStatus = (t, kind = "") => { statusEl.textContent = t; statusEl.className = "g-status" + (kind ? ` ${kind}` : ""); };

// ---------- drawing ----------
const cells = [];
const subs = [];
function build() {
  const box = $("ub");
  box.innerHTML = "";
  for (let b = 0; b < 9; b += 1) {
    const sub = document.createElement("div");
    sub.className = "sub";
    sub.setAttribute("role", "group");
    sub.setAttribute("aria-label", `Board ${b + 1}`);
    for (let k = 0; k < 9; k += 1) {
      const i = b * 9 + k;
      const c = document.createElement("button");
      c.type = "button";
      c.className = "cell";
      c.setAttribute("aria-label", `Board ${b + 1}, cell ${k + 1}`);
      c.addEventListener("click", () => onCell(i));
      sub.appendChild(c);
      cells[i] = c;
    }
    const big = document.createElement("div");
    big.className = "big";
    sub.appendChild(big);
    box.appendChild(sub);
    subs[b] = sub;
  }
}
function render() {
  const legal = !over && !busy && mine() && !isCpuTurn() ? new Set(legalMoves(s)) : new Set();
  const activeBoards = new Set(over ? [] : s.next >= 0 ? [s.next] : s.big.map((v, i) => (v === 0 ? i : -1)).filter((i) => i >= 0));
  for (let i = 0; i < 81; i += 1) {
    const v = s.c[i];
    const c = cells[i];
    c.textContent = v === 1 ? "X" : v === 2 ? "O" : "";
    c.className = "cell" + (v === 1 ? " x" : v === 2 ? " o" : "") + (legal.has(i) ? " playable" : "") + (i === s.last ? " last" : "") + (i === hintMove ? " best" : "");
    c.disabled = !legal.has(i);
  }
  const line = result && result.line ? new Set(result.line) : new Set();
  for (let b = 0; b < 9; b += 1) {
    const v = s.big[b];
    subs[b].className = "sub" + (activeBoards.has(b) ? " active" : "") + (v === 1 ? " won1 done" : v === 2 ? " won2 done" : v === 3 ? " drawn done" : "") + (line.has(b) ? " line" : "");
    const big = subs[b].querySelector(".big");
    big.textContent = v === 1 ? "X" : v === 2 ? "O" : "";
    big.className = "big" + (v === 1 ? " x" : v === 2 ? " o" : "");
  }
  const count = (p) => s.big.filter((v) => v === p).length;
  $("pbars").innerHTML = [1, 2].map((p) => `<div class="pbar${!over && s.turn === p ? " turn" : ""}"><span class="mark ${p === 1 ? "x" : "o"}">${p === 1 ? "X" : "O"}</span><span class="nm">${nameOf(p)}<small>boards won</small></span><b>${count(p)}</b></div>`).join("");
}

// ---------- flow ----------
function newGame() {
  s = initial(); over = false; busy = false; hist = []; hintMove = -1; result = null;
  $("end").classList.remove("show");
  net.setOver(false);
  $("again").textContent = online() ? "Rematch" : "Play again";
  render();
  announce();
  if (isCpuTurn()) cpuTurn();
}
function announce() {
  if (over) return;
  if (online() && !net.active) return setStatus("Create or join a room to start.");
  if (isCpuTurn()) return setStatus("The computer is thinking…");
  if (online() && s.turn !== myP) return setStatus("Your friend's move…");
  const where = s.next >= 0 ? `Play in the highlighted board (board ${s.next + 1}).` : "Free choice: play in any open board.";
  setStatus(`${cpu() || online() ? "Your" : `${nameOf(s.turn)}'s`} move. ${where}`);
}
function onCell(i) {
  if (over || busy || !mine() || isCpuTurn() || !legalMoves(s).includes(i)) return;
  if (online()) net.send({ i });
  play(i, false);
}
function play(i, remote) {
  void remote;
  hist.push({ s });
  const before = s.big.slice();
  const p = s.turn;
  s = apply(s, i);
  hintMove = -1;
  p === 1 ? sfx.x() : sfx.o();
  if (s.big.some((v, b) => v !== before[b] && v !== 3)) sfx.board();
  const out = outcome(s);
  if (out) { result = out; render(); return finish(out); }
  render();
  announce();
  if (isCpuTurn()) cpuTurn();
  drain();
  return undefined;
}
async function cpuTurn() {
  busy = true;
  render();
  await sleep(600);
  const m = chooseMove(s, settings.level);
  busy = false;
  if (m >= 0 && !over) play(m, true);
}
function finish(out) {
  endOut = out;
  over = true; busy = false;
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
  const a = s.big.filter((v) => v === 1).length, b = s.big.filter((v) => v === 2).length;
  $("endText").textContent = w === 0 ? "Every board is decided and neither side came out ahead." : out.byCount ? `No three in a row, but ${w === 1 ? "X" : "O"} won more boards (${Math.max(a, b)} to ${Math.min(a, b)}).` : "Three small boards in a row!";
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
  s = prev.s; over = false; result = null; hintMove = -1;
  $("end").classList.remove("show");
  render(); announce();
}
function showHint() {
  if (over || busy || !mine() || online() || isCpuTurn()) return;
  hintMove = chooseMove(s, "hard");
  render();
  setStatus("Hint: the green square is a strong move.");
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

build();
syncChips();
syncMute();
newGame();
const invited = net.roomParam();
if (invited) { settings.mode = "online"; syncChips(); newGame(); net.join(invited); }
window.__utt = { onCell, legalMoves, get s() { return s; }, get over() { return over; }, get busy() { return busy; }, get myP() { return myP; } };
