import { createOnline } from "../../assets/online.js";
import * as rules from "./logic.js";
import { CATS, HINTS, totals } from "./logic.js";

const $ = (id) => document.getElementById(id);
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
  roll: () => [0, 0.07, 0.14, 0.22, 0.3].forEach((t, i) => tone(180 + (i % 3) * 40, t, 0.05, "square", 0.05)),
  keep: () => tone(520, 0, 0.05, "triangle", 0.07),
  score: (pts) => tone(pts > 0 ? 660 : 200, 0, 0.14, pts > 0 ? "triangle" : "sawtooth", 0.08),
  big: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, i * 0.08, 0.18, "triangle", 0.1)),
  win: () => [523, 659, 784, 1046, 784, 1046].forEach((f, i) => tone(f, i * 0.1, 0.24, "triangle", 0.1)),
  lose: () => [330, 262, 196].forEach((f, i) => tone(f, i * 0.16, 0.3, "sawtooth", 0.06)),
};

const online = () => settings.mode === "online";
const cpu = () => settings.mode === "cpu";
const solo = () => settings.mode === "solo";
const two = () => settings.mode === "two";
const count = () => (solo() ? 1 : 2);
let myP = 0;
let S = null;
let held = [false, false, false, false, false];
let busy = false;
let anim = new Set();
let epoch = 0;
let lastNote = "";
const inbox = [];
const net = createOnline({
  container: document.querySelector(".g-page"),
  before: $("pbars"),
  prefix: "zone210-yahtzee-",
  names: ["Player 1", "Player 2"],
  onStart: ({ role, seed }) => { myP = role; inbox.length = 0; newGame(seed); },
  onData: (m) => { inbox.push(m); drain(); },
  onLeft: () => { inbox.length = 0; setStatus("Your friend left the game."); render(); },
  getState: () => ({ S, held, lastNote, inbox: [...inbox] }),
  setState: (g) => {
    epoch += 1;
    S = g.S; held = g.held; lastNote = g.lastNote; busy = false; anim = new Set();
    $("end").classList.remove("show");
    inbox.length = 0; inbox.push(...g.inbox);
    if (S.over) { render(); finish(); drain(); return; }
    afterMove();
  },
});
function drain() {
  while (online() && net.active && inbox.length && S && !S.over && !busy && S.turn !== myP) {
    const m = inbox.shift();
    if (m && (m.t === "roll" || m.t === "score")) act(m);
  }
}

const viewP = () => (online() ? myP : two() ? S.turn : 0);
const humanTurn = () => !!S && !S.over && !busy && (online() ? net.active && S.turn === myP : cpu() ? S.turn === 0 : true);
const nameOf = (p) => (solo() ? "You" : cpu() ? (p === 0 ? "You" : "Computer") : online() ? (p === myP ? "You" : "Friend") : `Player ${p + 1}`);
const statusEl = $("status");
const setStatus = (t, kind = "") => { statusEl.textContent = t; statusEl.className = "g-status" + (kind ? ` ${kind}` : ""); };
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

// ---------- drawing ----------
const PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
function render() {
  if (!S) return;
  renderBars();
  const canHold = humanTurn() && S.rolls > 0 && S.rolls < 3;
  $("dice").innerHTML = S.dice.map((v, i) => {
    const shown = S.rolls > 0 ? v : 0;
    const pips = Array.from({ length: 9 }, (_, k) => `<i class="${shown && PIPS[shown].includes(k) ? "on" : ""}"></i>`).join("");
    const cls = `die${shown ? "" : " blank"}${held[i] && S.rolls > 0 && S.rolls < 3 ? " held" : ""}${canHold ? " can" : ""}${anim.has(i) ? " rolling" : ""}`;
    return `<button type="button" class="${cls}" data-i="${i}" ${canHold ? "" : "disabled"} aria-label="${shown ? `Die ${i + 1}: ${v}${held[i] ? ", kept" : ""}` : `Die ${i + 1}: not rolled yet`}" aria-pressed="${held[i] ? "true" : "false"}">${pips}</button>`;
  }).join("");
  const left = 3 - S.rolls;
  const roll = $("roll");
  roll.textContent = S.rolls === 0 ? "Roll dice" : left > 0 ? `Roll again (${left} left)` : "No rolls left";
  roll.disabled = !humanTurn() || S.rolls >= 3;
  $("tip").textContent = S.over ? "" : humanTurn() ? (S.rolls === 0 ? "3 rolls per turn" : left > 0 ? "Tap dice to keep them, or pick a category" : "Pick a category to score") : "";
  renderSheet();
}
function renderBars() {
  $("pbars").innerHTML = S.cards.map((_, p) => {
    const t = totals(S, p);
    const sub = S.over ? "Final" : `Round ${Math.min(S.round, 13)} of 13 · upper ${t.upper}/63`;
    return `<div class="pbar${!S.over && S.turn === p ? " turn" : ""}"><span class="nm">${esc(nameOf(p))}<small>${sub}</small></span><b>${t.total}</b></div>`;
  }).join("");
}
function renderSheet() {
  const viewer = viewP();
  const opts = humanTurn() && S.rolls > 0 ? new Map(rules.options(S).map((o) => [o.cat, o.score])) : new Map();
  const head = `<thead><tr><th>Category</th>${S.cards.map((_, p) => `<th class="${!S.over && S.turn === p ? "turn" : ""}">${esc(nameOf(p))}</th>`).join("")}</tr></thead>`;
  const cell = (p, i) => {
    const v = S.cards[p][i];
    const turn = !S.over && S.turn === p ? " col-turn" : "";
    if (v !== null) return `<td class="val${turn}">${v}</td>`;
    if (p === viewer && S.turn === p && opts.has(i)) { const sc = opts.get(i); return `<td class="${turn.trim()}"><button type="button" class="pick${sc === 0 ? " zero" : ""}" data-c="${i}" aria-label="Score ${sc} in ${CATS[i].label}">${sc}</button></td>`; }
    return `<td class="${turn.trim()}"></td>`;
  };
  const row = (i) => `<tr><td class="cat">${CATS[i].label}<small>${HINTS[i]}</small></td>${S.cards.map((_, p) => cell(p, i)).join("")}</tr>`;
  const sub = (label, fn, cls = "sub") => `<tr class="${cls}"><td>${label}</td>${S.cards.map((_, p) => `<td class="${!S.over && S.turn === p ? "col-turn" : ""}">${fn(totals(S, p), p)}</td>`).join("")}</tr>`;
  let body = "";
  for (let i = 0; i < 6; i += 1) body += row(i);
  body += sub("Upper bonus (63+ gives 35)", (t) => (t.upperBonus ? "+35" : `${t.upper}/63`));
  for (let i = 6; i < 13; i += 1) body += row(i);
  body += sub("Yahtzee bonus (+100 each)", (t) => (t.yb ? `+${t.yb}` : "–"));
  body += sub("Total", (t) => t.total, "sub total");
  $("sheet").innerHTML = `${head}<tbody>${body}</tbody>`;
}

// ---------- flow ----------
function newGame(seed) {
  epoch += 1;
  S = rules.initial(count(), typeof seed === "number" ? seed : (Math.random() * 4294967296) >>> 0);
  held = [false, false, false, false, false];
  busy = false; anim = new Set(); lastNote = "";
  $("end").classList.remove("show");
  net.setOver(false);
  $("again").textContent = online() ? "Rematch" : "Play again";
  if (online() && !net.active) { render(); setStatus("Create or join a room to start."); return; }
  afterMove();
}
function announce() {
  if (!S || S.over) return;
  if (online() && !net.active) return setStatus("Create or join a room to start.");
  const prefix = lastNote ? `${lastNote} ` : "";
  if (!humanTurn()) return setStatus(`${prefix}${cpu() || online() ? (S.turn === viewP() ? "Your turn…" : cpu() ? "The computer is rolling…" : "Your friend is rolling…") : `${nameOf(S.turn)}…`}`);
  const who = two() ? `${nameOf(S.turn)}: ` : "";
  if (S.rolls === 0) return setStatus(`${prefix}${who}Your turn. Roll the dice.`);
  if (S.rolls < 3) return setStatus(`${prefix}${who}Tap dice to keep them and roll again, or pick a category.`);
  setStatus(`${prefix}${who}That was your last roll. Pick a category.`);
}
function afterMove() {
  if (!S) return;
  if (S.over) { render(); finish(); return; }
  render();
  announce();
  if (cpu() && S.turn === 1 && !busy) { cpuStep(); return; }
  drain();
}
/** Apply a roll or a score for the player to move. */
function act(m) {
  const seat = S.turn;
  if (m.t === "roll") {
    const mask = S.rolls === 0 ? [false, false, false, false, false] : m.h;
    if (!rules.roll(S, m.h)) return false;
    anim = new Set([0, 1, 2, 3, 4].filter((i) => !mask[i]));
    if (seat !== viewP() || !humanTurn()) held = [...mask];
    sfx.roll();
    lastNote = "";
    busy = true;
    render();
    const e = epoch;
    setTimeout(() => { if (e !== epoch) return; anim = new Set(); busy = false; afterMove(); }, 520 / SPEED);
    return true;
  }
  const dice = [...S.dice];
  const pts = rules.score(S, m.c);
  if (pts === null) return false;
  sfx.score(pts);
  if (pts >= 40 && (m.c === 10 || m.c === 11)) sfx.big();
  lastNote = `${nameOf(seat)} scored ${pts} in ${CATS[m.c].label}${rules.isYahtzee(dice) ? (m.c === 11 ? ". YAHTZEE!" : ".") : "."}`;
  held = [false, false, false, false, false];
  anim = new Set();
  if (S.over) { render(); finish(); return true; }
  busy = true;
  render();
  const e = epoch;
  setTimeout(() => { if (e !== epoch) return; busy = false; afterMove(); }, 650 / SPEED);
  return true;
}
async function cpuStep() {
  const e = epoch;
  busy = true;
  render();
  await sleep(650);
  if (e !== epoch || !S || S.over) return;
  busy = false;
  if (S.rolls === 0) { act({ t: "roll", h: [false, false, false, false, false] }); return; }
  const d = rules.decide(S, settings.level);
  if (d.stop) act({ t: "score", c: d.cat }); else act({ t: "roll", h: d.mask });
}
function onRoll() {
  if (!humanTurn() || S.rolls >= 3) return;
  if (S.rolls > 0 && held.every(Boolean)) { setStatus("All your dice are kept. Release one to roll it, or pick a category.", "bad"); return; }
  const m = { t: "roll", h: S.rolls === 0 ? [false, false, false, false, false] : [...held] };
  if (online()) net.send(m);
  act(m);
}
function onScore(c) {
  if (!humanTurn() || S.rolls === 0 || S.cards[S.turn][c] !== null) return;
  const m = { t: "score", c };
  if (online()) net.send(m);
  act(m);
}
$("dice").addEventListener("click", (e) => {
  const b = e.target.closest("[data-i]");
  if (!b || b.disabled || !humanTurn() || S.rolls === 0 || S.rolls >= 3) return;
  const i = Number(b.dataset.i);
  held[i] = !held[i];
  sfx.keep();
  render();
});
$("sheet").addEventListener("click", (e) => { const b = e.target.closest("[data-c]"); if (b) onScore(Number(b.dataset.c)); });
$("roll").addEventListener("click", onRoll);
document.addEventListener("keydown", (e) => {
  if (e.target.closest("input, textarea")) return;
  if (e.key === " " && document.activeElement === document.body) { e.preventDefault(); onRoll(); }
});

function finish() {
  busy = false;
  const t = S.cards.map((_, p) => totals(S, p).total);
  const best = Math.max(...t);
  const winners = t.map((v, p) => (v === best ? p : -1)).filter((p) => p >= 0);
  let title;
  let emoji = "🏆";
  let text = t.map((v, p) => `${nameOf(p)} ${v}`).join(" · ");
  if (solo()) {
    const prev = store.get(BEST_KEY, 0);
    title = best > prev ? "New personal best!" : "Game over";
    text = `You scored ${best}.${best > prev ? "" : ` Your best is ${prev}.`}`;
    if (best > prev) store.set(BEST_KEY, best);
    sfx.win();
  } else if (winners.length > 1) { title = "It's a tie!"; emoji = "🤝"; sfx.win(); }
  else {
    const w = winners[0];
    const you = cpu() ? w === 0 : online() ? w === myP : null;
    title = cpu() ? (you ? "You win!" : "The computer wins") : online() ? (you ? "You win!" : "Your friend wins.") : `${nameOf(w)} wins!`;
    if (you === false) emoji = cpu() ? "🤖" : "🎲";
    you === false ? sfx.lose() : sfx.win();
  }
  $("endEmoji").textContent = emoji;
  $("endTitle").textContent = title;
  $("endText").textContent = text;
  setStatus(title, "good");
  net.setOver(true);
  setTimeout(() => $("end").classList.add("show"), 800 / SPEED);
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
  newGame();
}));
$("newGame").addEventListener("click", () => newGame());
$("again").addEventListener("click", () => { if (online()) { net.rematch(); $("end").classList.remove("show"); } else newGame(); });
$("endView").addEventListener("click", () => $("end").classList.remove("show"));
const mute = $("mute");
const syncMute = () => { mute.textContent = settings.muted ? "Sound Off" : "Sound On"; mute.setAttribute("aria-pressed", String(settings.muted)); };
mute.addEventListener("click", () => { settings.muted = !settings.muted; store.set(KEY, settings); syncMute(); });

syncChips();
syncMute();
newGame();
const invited = net.roomParam();
if (invited) { settings.mode = "online"; syncChips(); newGame(); net.join(invited); }
window.__yz = {
  get S() { return S; }, get over() { return !!S && S.over; }, get myP() { return myP; }, get busy() { return busy; }, get held() { return held; },
  rules, onRoll, onScore, humanTurn,
  setHeld: (h) => { held = [...h]; },
  decide: () => rules.decide(S, "normal"),
};
