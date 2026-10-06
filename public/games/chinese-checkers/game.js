import { createOnline } from "../../assets/online.js";
import { boardKeys } from "../../assets/board-keys.js";
import { HOLES, ZONES_FOR, zoneOf, zoneHoles, opposite, initial, reachable, legalMoves, apply, won, inTarget, chooseMove } from "./logic.js";

const $ = (id) => document.getElementById(id);
const store = {
  get(key, fallback) { try { const raw = localStorage.getItem(key); return raw === null ? fallback : JSON.parse(raw); } catch (err) { return fallback; } },
  set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (err) { /* private mode */ } },
};
const KEY = "zone210_chinese_checkers_settings";
const settings = { mode: "cpu", level: "normal", players: "2", muted: false, ...store.get(KEY, {}) };
if (!["cpu", "two", "online"].includes(settings.mode)) settings.mode = "cpu";
if (!["easy", "normal", "hard"].includes(settings.level)) settings.level = "normal";
if (!["2", "3", "4", "6"].includes(String(settings.players))) settings.players = "2";
settings.players = String(settings.players);
const COLORS = ["#e5484d", "#f59e0b", "#22c55e", "#3b82f6", "#a855f7", "#14b8a6"]; // by zone
const CNAME = ["Red", "Gold", "Green", "Blue", "Purple", "Teal"];

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
  hop: (k) => tone(380 + (k % 6) * 45, 0, 0.06, "triangle", 0.09),
  win: () => [523, 659, 784, 1046, 784, 1046].forEach((f, i) => tone(f, i * 0.1, 0.24, "triangle", 0.1)),
  lose: () => [330, 262, 196].forEach((f, i) => tone(f, i * 0.16, 0.3, "sawtooth", 0.06)),
};

const online = () => settings.mode === "online";
const cpu = () => settings.mode === "cpu";
let mySeat = 0;
const inbox = [];
const net = createOnline({
  container: document.querySelector(".g-page"),
  before: $("pbars"),
  prefix: "zone210-cchk-",
  names: ["Red (top)", "Blue (bottom)"],
  onStart: ({ role }) => { mySeat = role; settings.players = "2"; inbox.length = 0; newGame(); },
  onData: (m) => { inbox.push(m); drain(); },
  onLeft: () => { inbox.length = 0; draw(); setStatus("Your friend left the game."); },
  // a move that is still animating is saved as "about to happen" so a reload replays it
  getState: () => ({ s, over, winner, last, pendM, inbox: [...inbox] }),
  setState: (st) => {
    s = st.s; last = st.last; winner = st.winner; over = false;
    sel = null; busy = false; hist = []; moving = null; hintMove = null; pendM = null;
    $("end").classList.remove("show");
    inbox.length = 0; inbox.push(...st.inbox);
    if (st.over) { draw(); finish(winner); return; }
    const r = st.pendM ? reachable(s, st.pendM.from) : null;
    if (r && r.has(st.pendM.to)) { draw(); doMove({ from: st.pendM.from, to: st.pendM.to, path: r.get(st.pendM.to) }, true); return; }
    draw(); announce(); drain();
  },
});
let pendM = null; // the move being animated
function drain() {
  while (online() && net.active && inbox.length && !over && !busy && s.turn !== mySeat) {
    const m = inbox.shift();
    if (m.t === "mv" && Number.isInteger(m.from) && Number.isInteger(m.to)) {
      const r = s.b[m.from] === s.turn ? reachable(s, m.from) : null;
      if (r && r.has(m.to)) doMove({ from: m.from, to: m.to, path: r.get(m.to) }, true);
    }
  }
}

let s = null;
let sel = null;
let over = false;
let busy = false;
let last = null;
let hist = [];
let moving = null; // { seat, at } while a marble is being animated
let hintMove = null;
let winner = -1;
const seats = () => s.zones.length;
const isCpuSeat = (seat) => cpu() && seat !== 0;
const humanTurn = () => !over && !busy && (online() ? net.active && s.turn === mySeat : cpu() ? s.turn === 0 : true);
const viewSeat = () => (online() ? mySeat : cpu() ? 0 : s ? s.turn : 0);
const nameOf = (seat) => (cpu() ? (seat === 0 ? "You" : `Computer (${CNAME[s.zones[seat]]})`) : online() ? (seat === mySeat ? "You" : "Friend") : CNAME[s.zones[seat]]);
const statusEl = $("status");
const setStatus = (t, kind = "") => { statusEl.textContent = t; statusEl.className = "g-status" + (kind ? ` ${kind}` : ""); };

// ---------- drawing ----------
const svg = $("mb");
const NS = "http://www.w3.org/2000/svg";
const el = (name, attrs = {}, parent = svg) => { const e = document.createElementNS(NS, name); Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v)); parent.appendChild(e); return e; };
const U = 14;
const ZANG = [-90, -30, 30, 90, 150, 210];
function xy(i, rot) {
  const h = HOLES[i];
  const X = h.x * U;
  const Y = (h.r - 8) * Math.sqrt(3) * U;
  const a = (rot * Math.PI) / 180;
  return { x: 220 + X * Math.cos(a) - Y * Math.sin(a), y: 220 + X * Math.sin(a) + Y * Math.cos(a) };
}
function draw() {
  svg.innerHTML = "";
  const defs = el("defs");
  COLORS.forEach((c, z) => { const g = el("radialGradient", { id: `m${z}`, cx: "35%", cy: "30%", r: "75%" }, defs); el("stop", { offset: "0", "stop-color": "#fff" }, g); el("stop", { offset: "0.35", "stop-color": c }, g); el("stop", { offset: "1", "stop-color": c, "stop-opacity": 0.8 }, g); });
  const viewZone = s.zones[viewSeat()];
  const rot = 90 - ZANG[viewZone];
  const canAct = humanTurn();
  const dests = canAct && sel !== null ? reachable(s, sel) : new Map();
  const goal = new Set(zoneHoles(opposite(viewZone)));
  const trail = new Set(last ? last.path : []);
  for (let i = 0; i < HOLES.length; i += 1) {
    const { x, y } = xy(i, rot);
    el("circle", { cx: x, cy: y, r: 9.5, fill: goal.has(i) && s.zones.length ? "rgba(255,255,255,0.18)" : "rgba(40,20,5,0.45)", stroke: "rgba(40,20,5,0.55)", "stroke-width": 1 });
    if (trail.has(i)) el("circle", { cx: x, cy: y, r: 12, fill: "none", stroke: "rgba(255,230,120,0.9)", "stroke-width": 2.5 });
  }
  // marbles
  const owner = s.b.slice();
  if (moving) owner[moving.from] = -1;
  for (let i = 0; i < HOLES.length; i += 1) {
    if (owner[i] === -1) continue;
    const { x, y } = xy(i, rot);
    const z = s.zones[owner[i]];
    el("circle", { cx: x, cy: y + 1.8, r: 10, fill: "rgba(0,0,0,0.35)" });
    el("circle", { cx: x, cy: y, r: 10, fill: `url(#m${z})`, stroke: "rgba(0,0,0,0.35)", "stroke-width": 1 });
    if (sel === i) el("circle", { cx: x, cy: y, r: 13.5, fill: "none", stroke: "#fff", "stroke-width": 3 });
  }
  if (moving) {
    const { x, y } = xy(moving.at, rot);
    const z = s.zones[moving.seat];
    el("circle", { cx: x, cy: y + 3, r: 10, fill: "rgba(0,0,0,0.3)" });
    el("circle", { cx: x, cy: y - 3, r: 10.5, fill: `url(#m${z})`, stroke: "rgba(0,0,0,0.35)", "stroke-width": 1 });
  }
  if (canAct && sel === null) {
    const movable = new Set();
    for (let i = 0; i < HOLES.length; i += 1) if (s.b[i] === s.turn && reachable(s, i).size) movable.add(i);
    movable.forEach((i) => { const { x, y } = xy(i, rot); el("circle", { cx: x, cy: y, r: 13, fill: "none", stroke: "rgba(255,255,255,0.7)", "stroke-width": 2, class: "pulse" }); });
  }
  dests.forEach((_, i) => { const { x, y } = xy(i, rot); el("circle", { cx: x, cy: y, r: 6, fill: "rgba(255,255,255,0.9)", stroke: "#b07a00", "stroke-width": 2, class: "pulse" }); });
  if (hintMove) { [hintMove.from, hintMove.to].forEach((i) => { const { x, y } = xy(i, rot); el("circle", { cx: x, cy: y, r: 15, fill: "none", stroke: "#2fbf71", "stroke-width": 3.5, class: "pulse" }); }); }
  for (let i = 0; i < HOLES.length; i += 1) {
    const { x, y } = xy(i, rot);
    const hit = el("circle", { cx: x, cy: y, r: 11, class: "hit" });
    hit.style.cursor = canAct && (s.b[i] === s.turn || dests.has(i)) ? "pointer" : "default";
    hit.dataset.i = i; hit.addEventListener("click", () => onHole(i));
  }
  $("pbars").innerHTML = s.zones.map((z, seat) => `<div class="pbar${!over && s.turn === seat ? " turn" : ""}" style="--c1:#fff;--c2:${COLORS[z]}"><span class="chip"></span><span class="nm">${nameOf(seat)}<small>${inTarget(s, seat)}/10 home</small></span></div>`).join("");
}

// ---------- flow ----------
function newGame() {
  const players = online() ? 2 : Number(settings.players);
  s = initial(players);
  sel = null; over = false; busy = false; last = null; hist = []; moving = null; hintMove = null; winner = -1;
  $("end").classList.remove("show");
  net.setOver(false);
  $("again").textContent = online() ? "Rematch" : "Play again";
  draw(); announce();
  if (isCpuSeat(s.turn)) cpuTurn();
}
function announce() {
  if (over) return;
  if (online() && !net.active) return setStatus("Create or join a room to start.");
  if (isCpuSeat(s.turn)) return setStatus(`${nameOf(s.turn)} is thinking…`);
  if (online() && s.turn !== mySeat) return setStatus("Your friend's move…");
  const you = cpu() || online();
  setStatus(`${you ? "Your" : `${CNAME[s.zones[s.turn]]}'s`} move${you ? ` (${CNAME[s.zones[s.turn]]})` : ""}: tap a marble, then where it should go.`);
}
function onHole(i) {
  if (!humanTurn()) return;
  if (sel !== null) {
    const r = reachable(s, sel);
    if (r.has(i)) { const m = { from: sel, to: i, path: r.get(i) }; if (online()) net.send({ t: "mv", from: m.from, to: m.to }); return doMove(m, false); }
  }
  if (s.b[i] === s.turn && reachable(s, i).size) { sel = sel === i ? null : i; hintMove = null; draw(); } else if (sel !== null) { sel = null; draw(); }
  return undefined;
}
async function doMove(m, remote) {
  void remote;
  hist.push({ s, last });
  busy = true; sel = null; hintMove = null; pendM = { from: m.from, to: m.to };
  const seat = s.turn;
  for (let k = 1; k < m.path.length; k += 1) {
    moving = { seat, from: m.from, at: m.path[k] };
    sfx.hop(k);
    draw();
    await sleep(170);
  }
  moving = null;
  last = { path: m.path };
  s = apply(s, m); pendM = null;
  busy = false;
  if (won(s, seat)) { winner = seat; draw(); return finish(seat); }
  // skip any player who has no legal move
  for (let k = 0; k < seats() && !legalMoves(s).length; k += 1) s.turn = (s.turn + 1) % seats();
  draw(); announce();
  if (isCpuSeat(s.turn)) cpuTurn();
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
function finish(seat) {
  over = true; busy = false;
  const you = cpu() ? seat === 0 : online() ? seat === mySeat : true;
  const title = cpu() ? (you ? "You win!" : `${nameOf(seat)} wins`) : online() ? (you ? "You win!" : "Your friend wins.") : `${CNAME[s.zones[seat]]} wins!`;
  $("endEmoji").textContent = you ? "🏆" : cpu() ? "🤖" : "🎲";
  $("endTitle").textContent = title;
  $("endText").textContent = "All ten marbles reached the opposite corner.";
  setStatus(title, "good");
  you ? sfx.win() : sfx.lose();
  net.setOver(true);
  setTimeout(() => $("end").classList.add("show"), 800);
}
function undo() {
  if (busy || !hist.length || online() || over) return;
  let steps = 1;
  if (cpu()) { steps = 0; for (let k = hist.length - 1; k >= 0; k -= 1) { steps += 1; if (hist[k].s.turn === 0) break; } }
  let prev = null;
  for (let k = 0; k < steps && hist.length; k += 1) prev = hist.pop();
  if (!prev) return;
  s = prev.s; last = prev.last; sel = null; hintMove = null;
  draw(); announce();
}
function showHint() {
  if (over || busy || !humanTurn() || online()) return;
  hintMove = chooseMove(s, "hard");
  draw();
  setStatus("Hint: the green rings show a strong move.");
}

// ---------- controls ----------
function syncChips() {
  ["mode", "level", "players"].forEach((k) => document.querySelectorAll(`#${k} .g-chip`).forEach((c) => c.setAttribute("aria-pressed", String(c.dataset.value === String(settings[k])))));
  $("levelRow").hidden = !cpu();
  $("playersRow").hidden = online();
  $("undo").hidden = $("hint").hidden = $("newGame").hidden = online();
  if (online()) net.open(); else net.close();
}
["mode", "level", "players"].forEach((id) => $(id).addEventListener("click", (e) => {
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
window.__cc = { onHole, reachable, legalMoves, choose: (lvl) => chooseMove(s, lvl), get s() { return s; }, get over() { return over; }, get busy() { return busy; }, get mySeat() { return mySeat; } };

// keyboard and screen-reader play on the board
boardKeys($("mb"), { selector: "[data-i]", describe: (i) => (s && s.b[i] >= 0 ? `${CNAME[s.zones[s.b[i]]]} marble` : "") });
