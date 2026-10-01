import { createOnline } from "../../assets/online.js";
import * as L from "./logic.js";
import { CATS, HINTS } from "./logic.js";

const $ = (id) => document.getElementById(id);
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const store = {
  get(key, fallback) { try { const raw = localStorage.getItem(key); return raw === null ? fallback : JSON.parse(raw); } catch (err) { return fallback; } },
  set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (err) { /* private mode */ } },
};
const KEY = "zone210_yahtzee_settings";
const BEST_KEY = "zone210_yahtzee_best";
const settings = { mode: "cpu", level: "normal", muted: false, ...store.get(KEY, {}) };
if (!["solo", "cpu", "two", "online"].includes(settings.mode)) settings.mode = "cpu";
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
    amp.gain.exponentialRampToValueAtTime(gain, t + 0.006);
    amp.gain.exponentialRampToValueAtTime(0.0001, t + length);
    osc.connect(amp).connect(audio.destination);
    osc.start(t); osc.stop(t + length + 0.02);
  } catch (err) { /* audio unavailable */ }
}
const sfx = {
  roll: () => [0, 1, 2, 3, 4].forEach((i) => tone(180 + Math.random() * 120, i * 0.06, 0.04, "square", 0.05)),
  hold: () => tone(520, 0, 0.05, "triangle", 0.07),
  score: (p) => (p >= 25 ? [523, 659, 784].forEach((f, i) => tone(f, i * 0.07, 0.14, "triangle", 0.1)) : tone(300, 0, 0.1, "triangle", 0.09)),
  yahtzee: () => [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, i * 0.08, 0.2, "triangle", 0.12)),
  win: () => [523, 659, 784, 1046, 784, 1046].forEach((f, i) => tone(f, i * 0.1, 0.24, "triangle", 0.1)),
  lose: () => [330, 262, 196].forEach((f, i) => tone(f, i * 0.16, 0.3, "sawtooth", 0.06)),
};

const online = () => settings.mode === "online";
const cpu = () => settings.mode === "cpu";
const two = () => settings.mode === "two";
const solo = () => settings.mode === "solo";
const count = () => (solo() ? 1 : 2);
let myP = 0;
let roomSeed = 0;
let S = null;
let busy = false;
let covered = false;
let lastMover = null;
let rolledMask = [];
let lastNote = "";
let epoch = 0;
const inbox = [];

const net = createOnline({
  container: document.querySelector(".g-page"),
  before: document.querySelector(".yz"),
  prefix: "zone210-yahtzee-",
  names: ["Player 1", "Player 2"],
  onStart: ({ role, seed }) => { myP = role; roomSeed = seed; inbox.length = 0; newGame(); },
  onData: (m) => { inbox.push(m); drain(); },
  onLeft: () => { inbox.length = 0; setStatus("Your friend left the game."); render(); },
  getState: () => ({ S, lastMover, inbox: [...inbox] }),
  setState: (g) => {
    epoch += 1;
    S = g.S; lastMover = g.lastMover; busy = false; covered = false; rolledMask = [];
    $("end").classList.remove("show");
    inbox.length = 0; inbox.push(...g.inbox);
    if (!S) { render(); return; }
    if (S.over) { render(); finish(); drain(); return; }
    afterMove();
  },
});
function drain() {
  while (online() && net.active && inbox.length && S && !S.over) {
    if (busy || S.turn === myP) break;
    const m = inbox.shift();
    if (m.t === "roll" && S.rolls < 3 && Array.isArray(m.h)) doRoll(m.h);
    else if (m.t === "score" && S.rolls > 0 && Number.isInteger(m.c) && S.cards[S.turn][m.c] === null) doScore(m.c);
  }
}

const viewP = () => (online() ? myP : cpu() || solo() ? 0 : S ? S.turn : 0);
const humanTurn = () => !!S && !S.over && !busy && !covered && (online() ? net.active && S.turn === myP : cpu() ? S.turn === 0 : true);
const nameOf = (p) => (solo() ? "You" : cpu() ? (p === 0 ? "You" : "Computer") : online() ? (p === myP ? "You" : "Friend") : `Player ${p + 1}`);
const statusEl = $("status");
const setStatus = (t, kind = "") => { statusEl.textContent = t; statusEl.className = "g-status" + (kind ? ` ${kind}` : ""); };

// ---------- drawing ----------
const PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
function render() {
  const dice = $("dice");
  const active = humanTurn();
  const canHold = active && S.rolls > 0 && S.rolls < 3;
  dice.innerHTML = (S ? S.dice : [0, 0, 0, 0, 0])
    .map((v, i) => {
      const pips = Array.from({ length: 9 }, (_, k) => `<i class="${v && PIPS[v].includes(k) ? "on" : ""}"></i>`).join("");
      const held = S && S.held[i] && S.rolls > 0;
      return `<button type="button" class="die${v ? "" : " blank"}${held ? " held" : ""}${canHold ? " ok" : ""}${rolledMask.includes(i) ? " rolling" : ""}" data-i="${i}" aria-label="${v ? `Die ${i + 1}: ${v}${held ? ", kept" : ""}` : `Die ${i + 1}: not rolled`}" ${canHold ? "" : "disabled"}>${pips}</button>`;
    })
    .join("");
  const r = S ? S.rolls : 0;
  $("roll").disabled = !(active && r < 3);
  $("roll").textContent = r === 0 ? "Roll dice" : "Roll again";
  $("left").textContent = S && !S.over ? `${3 - r} roll${3 - r === 1 ? "" : "s"} left` : "";
  renderSheet(active);
}
function renderSheet(active) {
  const sheet = $("sheet");
  if (!S) { sheet.innerHTML = ""; return; }
  const tot = S.cards.map((c, p) => L.totals(c, S.yb[p]));
  const me = viewP();
  const opts = active && S.rolls > 0 ? new Map(L.options(S).map((o) => [o.cat, o.pts])) : new Map();
  const head = `<thead><tr><th></th>${S.cards.map((_, p) => `<th class="${!S.over && S.turn === p ? "turn" : ""}">${esc(nameOf(p))}</th>`).join("")}</tr></thead>`;
  const cell = (p, cat) => {
    const v = S.cards[p][cat];
    if (v !== null) return `<td class="done">${v}</td>`;
    if (p === S.turn && p === me && opts.has(cat)) { const pts = opts.get(cat); return `<td class="pick"><button type="button" data-cat="${cat}" class="${pts ? "" : "zero"}" aria-label="Score ${pts} in ${CATS[cat]}">${pts}</button></td>`; }
    return "<td></td>";
  };
  const row = (cat) => `<tr><td>${CATS[cat]}<small>${HINTS[cat]}</small></td>${S.cards.map((_, p) => cell(p, cat)).join("")}</tr>`;
  const sub = (label, f) => `<tr><td class="sub">${label}</td>${tot.map((t) => `<td class="sub">${f(t)}</td>`).join("")}</tr>`;
  let body = "";
  for (let c = 0; c < 6; c += 1) body += row(c);
  body += sub("Top section (63 for +35)", (t) => `${t.upper}/63${t.bonus ? " +35" : ""}`);
  for (let c = 6; c < 13; c += 1) body += row(c);
  body += sub("Yahtzee bonus", (t) => (t.yb ? `+${t.yb}` : "0"));
  body += `<tr><td class="tot">Total</td>${tot.map((t) => `<td class="tot">${t.total}</td>`).join("")}</tr>`;
  sheet.innerHTML = `${head}<tbody>${body}</tbody>`;
}

// ---------- flow ----------
function newGame() {
  epoch += 1;
  S = L.newGame(online() ? roomSeed : (Math.random() * 4294967296) >>> 0, count());
  busy = false; covered = false; rolledMask = []; lastNote = "";
  lastMover = two() ? -1 : null;
  $("end").classList.remove("show");
  $("cover").classList.remove("show");
  net.setOver(false);
  $("again").textContent = online() ? "Rematch" : "Play again";
  afterMove();
}
function announce() {
  if (!S || S.over) return;
  if (online() && !net.active) return setStatus("Create or join a room to start.");
  const note = lastNote ? `${lastNote} ` : "";
  if (!humanTurn()) return setStatus(`${note}${cpu() && S.turn === 1 ? "The computer is playing…" : online() ? "Your friend's turn…" : `${nameOf(S.turn)}'s turn…`}`);
  const who = two() ? `${nameOf(S.turn)}: ` : "";
  if (S.rolls === 0) return setStatus(`${note}${who}Roll the dice.`);
  if (S.rolls < 3) return setStatus(`${note}${who}Keep the dice you want and roll again, or pick a box on the scorecard.`);
  return setStatus(`${note}${who}No rolls left: pick a box on the scorecard.`);
}
function afterMove() {
  if (!S) return;
  if (S.over) { render(); finish(); return; }
  if (two() && lastMover !== null && lastMover !== S.turn && !covered) {
    covered = true;
    $("coverTitle").textContent = `Pass to ${nameOf(S.turn)}`;
    $("cover").classList.add("show");
  }
  render();
  if (cpu() && S.turn === 1) { cpuTurn(); return; }
  announce();
  drain();
}
async function step(ms = 480) {
  const e = epoch;
  busy = true;
  render();
  await sleep(ms);
  if (e !== epoch) return;
  busy = false;
  rolledMask = [];
  afterMove();
}
function doRoll(mask) {
  const seat = S.turn;
  const keep = S.rolls === 0 ? [false, false, false, false, false] : mask;
  if (!L.roll(S, keep)) return false;
  rolledMask = keep.map((k, i) => (k ? -1 : i)).filter((i) => i >= 0);
  lastMover = seat;
  sfx.roll();
  if (L.isYahtzee(S.dice)) { lastNote = `${nameOf(seat)} rolled a YAHTZEE!`; sfx.yahtzee(); } else lastNote = "";
  step();
  return true;
}
function doScore(cat) {
  const seat = S.turn;
  const yz = L.isYahtzee(S.dice);
  const pts = L.scoreCat(S, cat);
  if (pts === null) return false;
  lastMover = seat;
  sfx.score(pts);
  lastNote = `${nameOf(seat)} scored ${pts} in ${CATS[cat]}.`;
  if (yz && cat === L.YAHTZEE && pts === 50) sfx.yahtzee();
  rolledMask = [];
  if (S.over) { render(); finish(); return true; }
  step(250);
  return true;
}
async function cpuTurn() {
  const e = epoch;
  busy = true;
  render();
  setStatus(`${lastNote ? `${lastNote} ` : ""}The computer is playing…`);
  await sleep(800);
  if (e !== epoch || !S || S.over) return;
  busy = false;
  if (S.rolls === 0) { doRoll([]); return; }
  const hold = S.rolls < 3 ? L.chooseHold(S, settings.level) : null;
  if (hold) doRoll(hold); else doScore(L.chooseCat(S, settings.level));
}
function onRoll() {
  if (!humanTurn() || S.rolls >= 3) return;
  const mask = S.rolls === 0 ? [false, false, false, false, false] : S.held.slice();
  if (online()) net.send({ t: "roll", h: mask });
  doRoll(mask);
}
function onPick(cat) {
  if (!humanTurn() || S.rolls === 0 || S.cards[S.turn][cat] !== null) return;
  if (online()) net.send({ t: "score", c: cat });
  doScore(cat);
}
$("dice").addEventListener("click", (e) => {
  const b = e.target.closest("[data-i]");
  if (!b || b.disabled || !humanTurn() || S.rolls === 0 || S.rolls >= 3) return;
  const i = Number(b.dataset.i);
  S.held[i] = !S.held[i];
  sfx.hold();
  render();
});
$("roll").addEventListener("click", onRoll);
$("sheet").addEventListener("click", (e) => { const b = e.target.closest("[data-cat]"); if (b) onPick(Number(b.dataset.cat)); });
document.addEventListener("keydown", (e) => { if ((e.key === " " || e.key === "Enter") && e.target === document.body && humanTurn()) { e.preventDefault(); onRoll(); } });

function finish() {
  busy = false;
  covered = false;
  $("cover").classList.remove("show");
  const t = S.cards.map((c, p) => L.totals(c, S.yb[p]).total);
  let title, emoji = "🏆", text;
  if (solo()) {
    const best = store.get(BEST_KEY, 0);
    const isBest = t[0] > best;
    if (isBest) store.set(BEST_KEY, t[0]);
    title = isBest ? "New best score!" : "Game over";
    text = `You scored ${t[0]}. ${isBest ? "That beats your old best" + (best ? ` of ${best}` : "") + "." : `Your best is ${best}.`}`;
    emoji = isBest ? "🏆" : "🎲";
    sfx.win();
  } else {
    const w = S.winner;
    const you = (p) => (cpu() || online() ? p === viewP() : null);
    if (w < 0) { title = "It's a draw!"; emoji = "🤝"; sfx.win(); }
    else {
      title = cpu() || online() ? (you(w) ? "You win!" : online() ? "Your friend wins." : "The computer wins") : `${nameOf(w)} wins!`;
      const lost = (cpu() || online()) && !you(w);
      if (lost) emoji = cpu() ? "🤖" : "🎲";
      lost ? sfx.lose() : sfx.win();
    }
    text = t.map((v, p) => `${nameOf(p)} ${v}`).join(" · ");
  }
  $("endEmoji").textContent = emoji;
  $("endTitle").textContent = title;
  $("endText").textContent = text;
  setStatus(title, "good");
  net.setOver(true);
  setTimeout(() => $("end").classList.add("show"), 700 / SPEED);
}

// ---------- controls ----------
function syncChips() {
  ["mode", "level"].forEach((k) => document.querySelectorAll(`#${k} .g-chip`).forEach((c) => c.setAttribute("aria-pressed", String(c.dataset.value === String(settings[k])))));
  $("levelRow").hidden = !cpu();
  $("newGame").hidden = online();
  if (online()) net.open(); else net.close();
}
["mode", "level"].forEach((id) => $(id).addEventListener("click", (e) => {
  const chip = e.target.closest(".g-chip");
  if (!chip || String(settings[id]) === chip.dataset.value) return;
  settings[id] = chip.dataset.value;
  store.set(KEY, settings);
  syncChips();
  if (online() && !net.active) { epoch += 1; S = null; busy = false; render(); setStatus("Create or join a room to start."); return; }
  newGame();
}));
$("newGame").addEventListener("click", newGame);
$("coverGo").addEventListener("click", () => { covered = false; $("cover").classList.remove("show"); render(); announce(); });
$("again").addEventListener("click", () => { if (online()) { net.rematch(); $("end").classList.remove("show"); } else newGame(); });
$("endView").addEventListener("click", () => $("end").classList.remove("show"));
const mute = $("mute");
const syncMute = () => { mute.textContent = settings.muted ? "Sound Off" : "Sound On"; mute.setAttribute("aria-pressed", String(settings.muted)); };
mute.addEventListener("click", () => { settings.muted = !settings.muted; store.set(KEY, settings); syncMute(); });

syncChips();
syncMute();
if (online() && !net.active) { render(); setStatus("Create or join a room to start."); } else newGame();
const invited = net.roomParam();
if (invited) { settings.mode = "online"; syncChips(); render(); net.join(invited); }
window.__yz = {
  get S() { return S; }, get busy() { return busy; }, get myP() { return myP; }, get over() { return !!S && S.over; }, get covered() { return covered; },
  humanTurn, onRoll, onPick, L,
  toggle: (i) => { S.held[i] = !S.held[i]; },
};
