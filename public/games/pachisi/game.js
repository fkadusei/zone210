import { createOnline } from "../../assets/online.js";
import { RING, TIPS, HOME_START, CENTRE, SAFE, SEATS_FOR, absOf, throwShells, throwFromK, initial, legalMoves, apply, nextTurn, seatOf, finished, homeCount, chooseMove } from "./logic.js";

const $ = (id) => document.getElementById(id);
const store = {
  get(key, fallback) { try { const raw = localStorage.getItem(key); return raw === null ? fallback : JSON.parse(raw); } catch (err) { return fallback; } },
  set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (err) { /* private mode */ } },
};
const KEY = "zone210_pachisi_settings";
const settings = { mode: "cpu", level: "normal", players: "2", muted: false, ...store.get(KEY, {}) };
if (!["cpu", "two", "online"].includes(settings.mode)) settings.mode = "cpu";
if (!["easy", "normal", "hard"].includes(settings.level)) settings.level = "normal";
if (!["2", "3", "4"].includes(String(settings.players))) settings.players = "2";
settings.players = String(settings.players);
const COLORS = ["#e5484d", "#22c55e", "#3b82f6", "#f59e0b"];
const DARK = ["#8c1f23", "#116a31", "#1d4695", "#955f06"];
const CNAME = ["Red", "Green", "Blue", "Gold"];

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
  shells: () => [0, 1, 2, 3, 4, 5].forEach((i) => tone(900 + Math.random() * 500, i * 0.07, 0.04, "square", 0.04)),
  step: () => tone(360, 0, 0.04, "triangle", 0.06),
  capture: () => { tone(200, 0, 0.12, "sawtooth", 0.08); tone(130, 0.06, 0.15, "sine", 0.1); },
  grace: () => [523, 784].forEach((f, i) => tone(f, i * 0.08, 0.14, "triangle", 0.1)),
  home: () => [523, 659, 784].forEach((f, i) => tone(f, i * 0.08, 0.16, "triangle", 0.1)),
  win: () => [523, 659, 784, 1046, 784, 1046].forEach((f, i) => tone(f, i * 0.1, 0.24, "triangle", 0.1)),
  lose: () => [330, 262, 196].forEach((f, i) => tone(f, i * 0.16, 0.3, "sawtooth", 0.06)),
};

// ---------- board geometry (19 x 19 cells of 30 units) ----------
const CELL = 30;
const cxy = (r, c) => ({ x: c * CELL + CELL / 2, y: r * CELL + CELL / 2 });
const RINGRC = [];
for (let r = 7; r >= 0; r -= 1) RINGRC.push([r, 8]);
RINGRC.push([0, 9]);
for (let r = 0; r <= 7; r += 1) RINGRC.push([r, 10]);
for (let c = 11; c <= 18; c += 1) RINGRC.push([8, c]);
RINGRC.push([9, 18]);
for (let c = 18; c >= 11; c -= 1) RINGRC.push([10, c]);
for (let r = 11; r <= 18; r += 1) RINGRC.push([r, 10]);
RINGRC.push([18, 9]);
for (let r = 18; r >= 11; r -= 1) RINGRC.push([r, 8]);
for (let c = 7; c >= 0; c -= 1) RINGRC.push([10, c]);
RINGRC.push([9, 0]);
for (let c = 0; c <= 7; c += 1) RINGRC.push([8, c]);
const HOMERC = [
  Array.from({ length: 7 }, (_, i) => [1 + i, 9]),
  Array.from({ length: 7 }, (_, i) => [9, 17 - i]),
  Array.from({ length: 7 }, (_, i) => [17 - i, 9]),
  Array.from({ length: 7 }, (_, i) => [9, 1 + i]),
];
const YARDC = [[3, 3], [3, 15], [15, 15], [15, 3]];
const CENTRE_OFF = [[0, -11], [11, 0], [0, 11], [-11, 0]];

const online = () => settings.mode === "online";
const cpu = () => settings.mode === "cpu";
let myIdx = 0;
const inbox = [];
const net = createOnline({
  container: document.querySelector(".g-page"),
  before: $("pbars"),
  prefix: "zone210-pachisi-",
  names: ["Red (top)", "Blue (bottom)"],
  onStart: ({ role }) => { myIdx = role; settings.players = "2"; inbox.length = 0; newGame(); },
  onData: (m) => { inbox.push(m); drain(); },
  onLeft: () => { inbox.length = 0; draw(); setStatus("Your friend left the game."); },
});

let s = null;
let phase = "idle"; // idle | throw | move | over
let cur = null; // the current throw
let moves = [];
let sel = null;
let busy = false;
let over = false;
let anim = null;
let shellsNow = [false, false, false, false, false, false];
let rolling = false;
const humanIdx = () => (cpu() ? 0 : online() ? myIdx : -1);
const isCpu = (idx) => cpu() && idx !== 0;
const myTurn = () => !over && !busy && (online() ? net.active && s.turn === myIdx : cpu() ? s.turn === 0 : true);
const nameOf = (idx) => { const seat = s.seats[idx]; return cpu() ? (idx === 0 ? "You" : `Computer (${CNAME[seat]})`) : online() ? (idx === myIdx ? "You" : "Friend") : CNAME[seat]; };
const statusEl = $("status");
const setStatus = (t, kind = "") => { statusEl.textContent = t; statusEl.className = "g-status" + (kind ? ` ${kind}` : ""); };

function drain() {
  while (online() && net.active && inbox.length && !over && !busy && s.turn !== myIdx) {
    const m = inbox.shift();
    if (m.t === "throw" && phase === "throw" && Number.isInteger(m.k) && m.k >= 0 && m.k <= 6) doThrow(m.k, true);
    else if (m.t === "mv" && phase === "move") { const mv = moves.find((x) => x.piece === m.piece); if (mv) doMove(mv, true); }
  }
}

// ---------- drawing ----------
const svg = $("mb");
const NS = "http://www.w3.org/2000/svg";
const el = (name, attrs = {}, parent = svg) => { const e = document.createElementNS(NS, name); Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v)); parent.appendChild(e); return e; };
function posXY(seat, piece, rel) {
  if (rel === -1) { const [r, c] = YARDC[seat]; return cxy(r + (piece < 2 ? -1 : 1), c + (piece % 2 ? 1 : -1)); }
  if (rel < HOME_START) { const [r, c] = RINGRC[absOf(seat, rel)]; return cxy(r, c); }
  if (rel < CENTRE) { const [r, c] = HOMERC[seat][rel - HOME_START]; return cxy(r, c); }
  const m = cxy(9, 9);
  return { x: m.x + CENTRE_OFF[seat][0] + (piece - 1.5) * (seat % 2 ? 0 : 7), y: m.y + CENTRE_OFF[seat][1] + (piece - 1.5) * (seat % 2 ? 7 : 0) };
}
function draw() {
  svg.innerHTML = "";
  const defs = el("defs");
  COLORS.forEach((c, i) => { const g = el("radialGradient", { id: `pc${i}`, cx: "35%", cy: "30%", r: "75%" }, defs); el("stop", { offset: "0", "stop-color": "#fff" }, g); el("stop", { offset: "0.3", "stop-color": c }, g); el("stop", { offset: "1", "stop-color": DARK[i] }, g); });
  el("rect", { x: 0, y: 0, width: 570, height: 570, rx: 18, fill: "none" });
  const active = new Set(s.seats);
  // yards
  YARDC.forEach(([r, c], seat) => { const { x, y } = cxy(r, c); el("rect", { x: x - 78, y: y - 78, width: 156, height: 156, rx: 18, fill: active.has(seat) ? COLORS[seat] : "#6b5a48", opacity: active.has(seat) ? 0.32 : 0.35, stroke: active.has(seat) ? COLORS[seat] : "#463826", "stroke-width": 3 }); el("circle", { cx: x, cy: y, r: 48, fill: "rgba(0,0,0,0.18)" }); });
  // ring squares
  const canAct = phase === "move" && myTurn() && !isCpu(s.turn);
  const seat = seatOf(s);
  RINGRC.forEach(([r, c], a) => {
    const { x, y } = cxy(r, c);
    const tipSeat = TIPS.indexOf(a);
    const fill = tipSeat >= 0 ? (active.has(tipSeat) ? COLORS[tipSeat] : "#c9b896") : "#f1e4c3";
    el("rect", { x: x - 14, y: y - 14, width: 28, height: 28, rx: 5, fill, stroke: "#5b3b1c", "stroke-width": 1.6 });
    if (SAFE.has(a)) { const t = el("text", { x, y: y + 5.5, "text-anchor": "middle", "font-size": 15, fill: tipSeat >= 0 ? "#fff" : "#8a5a14", "font-weight": 800 }); t.textContent = "★"; }
  });
  // home columns
  HOMERC.forEach((cells, seatIdx) => cells.forEach(([r, c], i) => { const { x, y } = cxy(r, c); el("rect", { x: x - 14, y: y - 14, width: 28, height: 28, rx: 5, fill: COLORS[seatIdx], opacity: active.has(seatIdx) ? (i === 6 ? 0.55 : 0.75) : 0.18, stroke: "#5b3b1c", "stroke-width": 1.4 }); }));
  // centre
  const m = cxy(9, 9);
  [[0, -1], [1, 0], [0, 1], [-1, 0]].forEach(([dx, dy], i) => { const a = `${m.x},${m.y} ${m.x + dx * 44 - dy * 44},${m.y + dy * 44 + dx * 44 * 0 - dx * 44 * 0 + (dx ? dx * 44 : 0) * 0} ${m.x + dx * 44 + dy * 44},${m.y + dy * 44}`; void a; });
  const tri = [
    `${m.x - 45},${m.y - 45} ${m.x + 45},${m.y - 45} ${m.x},${m.y}`,
    `${m.x + 45},${m.y - 45} ${m.x + 45},${m.y + 45} ${m.x},${m.y}`,
    `${m.x + 45},${m.y + 45} ${m.x - 45},${m.y + 45} ${m.x},${m.y}`,
    `${m.x - 45},${m.y + 45} ${m.x - 45},${m.y - 45} ${m.x},${m.y}`,
  ];
  tri.forEach((p, i) => el("polygon", { points: p, fill: COLORS[i], opacity: active.has(i) ? 0.85 : 0.2, stroke: "#5b3b1c", "stroke-width": 2 }));
  // last move trail
  if (s.last && s.last.to >= 0 && s.last.to < HOME_START) { const p = posXY(s.last.seat, s.last.piece, s.last.to); el("circle", { cx: p.x, cy: p.y, r: 17, fill: "none", stroke: "rgba(255,230,120,0.95)", "stroke-width": 3 }); }
  // pieces, grouped per square so stacks and blocks are visible
  const groups = new Map();
  s.seats.forEach((sd) => s.pos[sd].forEach((rel, piece) => {
    if (anim && anim.seat === sd && anim.piece === piece) return;
    const key = rel === -1 ? `y${sd}${piece}` : rel === CENTRE ? `c${sd}${piece}` : rel >= HOME_START ? `h${sd}${rel}` : `r${absOf(sd, rel)}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({ seat: sd, piece, rel });
  }));
  const movable = new Map();
  if (canAct) moves.forEach((mv) => movable.set(mv.piece, mv));
  const spots = [[0, 0], [-6, -6], [6, 6], [-6, 6], [6, -6]];
  groups.forEach((list) => {
    const block = list.length >= 2 && list[0].rel >= 0 && list[0].rel < HOME_START && list.every((o) => o.seat === list[0].seat);
    list.forEach((o, i) => {
      const base = posXY(o.seat, o.piece, o.rel);
      const off = list.length === 1 || o.rel === -1 || o.rel === CENTRE ? [0, 0] : spots[Math.min(i, spots.length - 1) + (list.length > 1 ? 0 : 0)] || [0, 0];
      const x = base.x + (list.length > 1 && o.rel >= 0 && o.rel !== CENTRE ? off[0] * 0.75 : 0), y = base.y + (list.length > 1 && o.rel >= 0 && o.rel !== CENTRE ? off[1] * 0.75 : 0);
      el("circle", { cx: x, cy: y + 2, r: 11, fill: "rgba(0,0,0,0.35)" });
      el("circle", { cx: x, cy: y, r: 11, fill: `url(#pc${o.seat})`, stroke: block ? "#fff" : "rgba(0,0,0,0.4)", "stroke-width": block ? 2.5 : 1.2 });
      if (o.seat === seat && movable.has(o.piece) && s.pos[seat][o.piece] === o.rel) {
        el("circle", { cx: x, cy: y, r: 15, fill: "none", stroke: sel === o.piece ? "#fff" : "rgba(255,255,255,0.8)", "stroke-width": sel === o.piece ? 3.5 : 2.5, class: sel === o.piece ? "" : "pulse" });
        const hit = el("circle", { cx: x, cy: y, r: 17, class: "hit" });
        hit.style.cursor = "pointer";
        hit.addEventListener("click", () => onPiece(o.piece));
      }
    });
  });
  if (anim) { const p = posXY(anim.seat, anim.piece, anim.rel); el("circle", { cx: p.x, cy: p.y + 4, r: 11, fill: "rgba(0,0,0,0.3)" }); el("circle", { cx: p.x, cy: p.y - 2, r: 12, fill: `url(#pc${anim.seat})`, stroke: "rgba(0,0,0,0.4)", "stroke-width": 1.2 }); }
  // destination of the selected piece
  if (canAct && sel !== null && movable.has(sel)) {
    const mv = movable.get(sel);
    const p = posXY(seat, sel, mv.to);
    el("circle", { cx: p.x, cy: p.y, r: 13, fill: "rgba(255,255,255,0.35)", stroke: "#fff", "stroke-width": 3, "stroke-dasharray": "5 4", class: "pulse" });
    const hit = el("circle", { cx: p.x, cy: p.y, r: 17, class: "hit" });
    hit.style.cursor = "pointer";
    hit.addEventListener("click", () => doMove(mv, false, true));
  }
  renderBars();
  renderShells();
  $("throw").hidden = !(phase === "throw" && myTurn() && !isCpu(s.turn));
  $("throw").disabled = rolling;
}
function renderBars() {
  $("pbars").innerHTML = s.seats.map((sd, idx) => `<div class="pbar${!over && s.turn === idx ? " turn" : ""}" style="--c1:#fff;--c2:${COLORS[sd]}"><span class="chip"></span><span class="nm">${nameOf(idx)}<small>Home ${homeCount(s, sd)}/4 · yard ${s.pos[sd].filter((p) => p === -1).length}</small></span></div>`).join("");
}
function renderShells() {
  const box = $("shells");
  if (box.children.length !== 6) { box.innerHTML = ""; for (let i = 0; i < 6; i += 1) { const e = document.createElement("div"); e.className = "shell down"; box.appendChild(e); } }
  [...box.children].forEach((e, i) => { e.className = "shell " + (rolling ? "rolling " : "") + (shellsNow[i] ? "up" : "down"); });
}
function info(text, grace = false) { $("tinfo").innerHTML = grace ? `${text} <span class="grace">★ grace</span>` : text; }

// ---------- flow ----------
function newGame() {
  s = initial(online() ? 2 : Number(settings.players));
  phase = "idle"; cur = null; moves = []; sel = null; busy = false; over = false; anim = null; rolling = false; shellsNow = [false, false, false, false, false, false];
  $("end").classList.remove("show");
  net.setOver(false);
  $("again").textContent = online() ? "Rematch" : "Play again";
  info("Throw the cowrie shells to begin.");
  if (online() && !net.active) { draw(); return setStatus("Create or join a room to start."); }
  startTurn();
  return undefined;
}
function startTurn(extra = false) {
  phase = "throw"; cur = null; moves = []; sel = null;
  info(extra ? "Another throw!" : "Throw the cowrie shells.");
  draw();
  if (isCpu(s.turn)) { setStatus(`${nameOf(s.turn)} ${extra ? "throws again" : "is throwing"}…`); busy = true; setTimeout(() => { busy = false; doThrow(); }, 800 / SPEED); }
  else if (online() && s.turn !== myIdx) setStatus("Your friend is throwing…");
  else setStatus(`${cpu() || online() ? "Your" : `${CNAME[seatOf(s)]}'s`} turn: ${extra ? "you earned another throw! " : ""}throw the shells.`);
  drain();
}
async function doThrow(forcedK, remote = false) {
  if (phase !== "throw" || rolling || (busy && !isCpu(s.turn))) return;
  if (online() && !remote && (!net.active || s.turn !== myIdx)) return;
  const k = Number.isInteger(forcedK) ? forcedK : throwShells().k;
  if (online() && !remote) net.send({ t: "throw", k });
  rolling = true; busy = true;
  sfx.shells();
  const t0 = Date.now();
  while (Date.now() - t0 < 700 / SPEED) { shellsNow = shellsNow.map(() => Math.random() < 0.5); draw(); await sleep(110); }
  const up = Array.from({ length: 6 }, (_, i) => i < k);
  for (let i = up.length - 1; i > 0; i -= 1) { const j = Math.floor(Math.random() * (i + 1)); [up[i], up[j]] = [up[j], up[i]]; }
  shellsNow = up; rolling = false; busy = false;
  cur = throwFromK(k);
  const seat = seatOf(s);
  moves = legalMoves(s, seat, cur);
  info(`${k} mouth${k === 1 ? "" : "s"} up: move ${cur.v}`, cur.grace);
  if (cur.grace) sfx.grace();
  phase = "move";
  draw();
  if (!moves.length) {
    setStatus(`${nameOf(s.turn)} threw ${cur.v} but ${nameOf(s.turn) === "You" ? "have" : "has"} no legal move.`, "bad");
    busy = true;
    await sleep(1500);
    busy = false;
    return cur.grace ? startTurn(true) : endTurn();
  }
  if (isCpu(s.turn)) { busy = true; setStatus(`${nameOf(s.turn)} threw ${cur.v}…`); await sleep(900); busy = false; const m = chooseMove(s, seat, cur, settings.level); return doMove(m, true); }
  if (myTurn() || !online()) {
    if (moves.length === 1) { setStatus(`You threw ${cur.v}. Only one move is possible…`); busy = true; await sleep(900); busy = false; return doMove(moves[0], false); }
    setStatus(`${cpu() || online() ? "You" : CNAME[seat]} threw ${cur.v}${cur.grace ? " (a grace!)" : ""}. Tap a piece to choose it, then tap again to move it.`, cur.grace ? "good" : "");
  } else setStatus(`Your friend threw ${cur.v}…`);
  drain();
  return undefined;
}
function onPiece(piece) {
  if (phase !== "move" || !myTurn() || isCpu(s.turn)) return;
  const mv = moves.find((x) => x.piece === piece);
  if (!mv) return;
  if (sel === piece) return doMove(mv, false, true);
  sel = piece;
  const what = mv.enter ? "enter the board" : mv.capture ? "capture a piece!" : mv.to === CENTRE ? "reach the centre!" : `move to square ${mv.to}`;
  setStatus(`Tap the piece again (or the dashed spot) to ${what}`, mv.capture ? "good" : "");
  draw();
  return undefined;
}
async function doMove(mv, remote, local) {
  if (phase !== "move") return;
  void local;
  if (!remote && online()) net.send({ t: "mv", piece: mv.piece });
  busy = true; sel = null;
  const seat = seatOf(s);
  const t = cur;
  phase = "idle";
  // walk the piece square by square
  if (mv.enter) { anim = null; }
  else {
    const step = mv.to >= HOME_START && mv.from < HOME_START ? 1 : 1;
    for (let rel = mv.from + step; rel <= Math.min(mv.to, CENTRE - 1) || rel === mv.to; rel += step) {
      anim = { seat, piece: mv.piece, rel: Math.min(rel, CENTRE) };
      sfx.step();
      draw();
      await sleep(mv.to - mv.from > 12 ? 45 : 90);
      if (rel >= mv.to) break;
    }
    anim = null;
  }
  const r = apply(s, seat, mv, t);
  s = r.s;
  if (mv.capture) { sfx.capture(); } else if (mv.to === CENTRE) sfx.home();
  busy = false;
  draw();
  if (finished(s, seat)) return finish(s.turn);
  const note = mv.capture ? `${nameOf(s.turn)} captured a piece! ` : mv.to === CENTRE ? `${nameOf(s.turn)} got a piece home! ` : "";
  if (r.extra) { startTurn(true); if (note) setStatus(`${note}${statusEl.textContent}`, "good"); return undefined; }
  return endTurn();
}
function endTurn() {
  s = nextTurn(s);
  startTurn();
}
function finish(idx) {
  over = true; busy = false; phase = "over";
  const you = cpu() ? idx === 0 : online() ? idx === myIdx : true;
  const title = cpu() ? (you ? "You win!" : `${nameOf(idx)} wins`) : online() ? (you ? "You win!" : "Your friend wins.") : `${CNAME[s.seats[idx]]} wins!`;
  $("endEmoji").textContent = you ? "🏆" : cpu() ? "🤖" : "🎲";
  $("endTitle").textContent = title;
  $("endText").textContent = "All four pieces reached the centre.";
  setStatus(title, "good");
  draw();
  you ? sfx.win() : sfx.lose();
  net.setOver(true);
  setTimeout(() => $("end").classList.add("show"), 800);
}

// ---------- controls ----------
function syncChips() {
  ["mode", "level", "players"].forEach((k) => document.querySelectorAll(`#${k} .g-chip`).forEach((c) => c.setAttribute("aria-pressed", String(c.dataset.value === String(settings[k])))));
  $("levelRow").hidden = !cpu();
  $("playersRow").hidden = online();
  $("newGame").hidden = online();
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
$("throw").addEventListener("click", () => doThrow());
$("newGame").addEventListener("click", newGame);
$("again").addEventListener("click", () => { if (online()) { net.rematch(); $("end").classList.remove("show"); } else newGame(); });
$("endView").addEventListener("click", () => $("end").classList.remove("show"));
document.addEventListener("keydown", (e) => { if ((e.key === " " || e.key === "Enter") && !$("throw").hidden && !$("throw").disabled && !(e.target instanceof HTMLButtonElement)) { e.preventDefault(); doThrow(); } });
const mute = $("mute");
const syncMute = () => { mute.textContent = settings.muted ? "Sound Off" : "Sound On"; mute.setAttribute("aria-pressed", String(settings.muted)); };
mute.addEventListener("click", () => { settings.muted = !settings.muted; store.set(KEY, settings); syncMute(); });

syncChips();
syncMute();
newGame();
const invited = net.roomParam();
if (invited) { settings.mode = "online"; syncChips(); newGame(); net.join(invited); }
window.__pa = { doThrow, onPiece, SEATS_FOR, RING, get s() { return s; }, get phase() { return phase; }, get moves() { return moves; }, get busy() { return busy; }, get over() { return over; }, get myIdx() { return myIdx; }, get cur() { return cur; }, get sel() { return sel; } };
