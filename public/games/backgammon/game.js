import { createOnline } from "../../assets/online.js";
import { BAR, OFF, initialState, stepsFor, applyStep, legalSteps, sequences, pips, hasWon, winValue, chooseSequence, dirOf } from "./logic.js";

const $ = (id) => document.getElementById(id);
const store = {
  get(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch (err) {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      /* private mode */
    }
  },
};
const SETTINGS_KEY = "zone210_backgammon_settings";
const settings = { mode: "cpu", level: "normal", first: "me", muted: false, ...store.get(SETTINGS_KEY, {}) };
if (!["cpu", "two", "online"].includes(settings.mode)) settings.mode = "cpu";
if (!["easy", "normal", "hard"].includes(settings.level)) settings.level = "normal";

const SPEED = new URLSearchParams(location.search).has("fast") ? 20 : 1; // ?fast is for testing
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
    osc.type = type;
    osc.frequency.value = freq;
    amp.gain.setValueAtTime(0.0001, t);
    amp.gain.exponentialRampToValueAtTime(gain, t + 0.008);
    amp.gain.exponentialRampToValueAtTime(0.0001, t + length);
    osc.connect(amp).connect(audio.destination);
    osc.start(t);
    osc.stop(t + length + 0.02);
  } catch (err) {
    /* audio unavailable */
  }
}
const sfx = {
  roll: () => [0, 1, 2, 3, 4, 5].forEach((i) => tone(180 + Math.random() * 160, i * 0.06, 0.05, "square", 0.04)),
  move: () => tone(300, 0, 0.07, "triangle", 0.1),
  hit: () => { tone(200, 0, 0.12, "sawtooth", 0.07); tone(120, 0.05, 0.16, "sine", 0.1); },
  off: () => tone(520, 0, 0.1, "triangle", 0.09),
  win: () => [523, 659, 784, 1046, 784, 1046].forEach((f, i) => tone(f, i * 0.1, 0.24, "triangle", 0.1)),
  lose: () => [330, 262, 196].forEach((f, i) => tone(f, i * 0.16, 0.3, "sawtooth", 0.06)),
};

const online = () => settings.mode === "online";
const cpu = () => settings.mode === "cpu";
let myP = 0; // online: role 0 = White, moves first
const inbox = [];
const net = createOnline({
  container: document.querySelector(".g-page"),
  before: document.querySelector(".pbars"),
  prefix: "zone210-backgammon-",
  names: ["White", "Black"],
  onStart: ({ role }) => { myP = role; inbox.length = 0; newGame(); },
  onData: (m) => { inbox.push(m); drain(); },
  onLeft: () => { inbox.length = 0; draw(); setStatus("Your friend left the game."); },
});
function drain() {
  while (online() && net.active && inbox.length && turn !== myP) {
    const m = inbox.shift();
    if (m.t === "roll" && phase === "roll" && Array.isArray(m.d) && m.d.every((d) => d >= 1 && d <= 6)) roll(m.d, true);
    else if (m.t === "step" && phase === "move") {
      const s = legalSteps(st, turn, left).find((x) => x.from === m.from && x.to === m.to && (m.die === undefined || x.die === m.die)) || legalSteps(st, turn, left).find((x) => x.from === m.from && x.to === m.to);
      if (s) doStep(s, true);
    }
  }
}

let st = initialState();
let turn = 0;
let dice = [];
let left = [];
let phase = "roll"; // roll | move | over
let sel = null; // selected source (point index or BAR)
let last = null; // last step played {from,to}
let busy = false;
let undoStack = [];
let hintStep = null;
const wins = [0, 0];

const humanP = () => (cpu() ? (settings.first === "me" ? 0 : 1) : null);
const isCpuTurn = () => cpu() && turn !== humanP();
const mine = () => (online() ? net.active && turn === myP : cpu() ? turn === humanP() : true);
const flipped = () => (online() ? myP === 1 : cpu() ? humanP() === 1 : false);
const pname = (p) => (cpu() ? (p === humanP() ? "You" : "Computer") : online() ? (p === myP ? "You" : "Friend") : p === 0 ? "White" : "Black");

const statusEl = $("status");
const setStatus = (t, kind = "") => {
  statusEl.textContent = t;
  statusEl.className = "g-status" + (kind ? ` ${kind}` : "");
};

// ---------- drawing ----------
const svg = $("bg");
const NS = "http://www.w3.org/2000/svg";
const el = (name, attrs = {}, parent = svg) => {
  const e = document.createElementNS(NS, name);
  Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v));
  parent.appendChild(e);
  return e;
};
const COLW = 54, BARW = 44, LEFT = 16, TOP = 16, BOT = 524, PH = 210, R = 24;
const slotCx = (slot) => LEFT + slot * COLW + (slot >= 6 ? BARW : 0) + COLW / 2;
const BARX = LEFT + 6 * COLW + BARW / 2;
const TRAYX = LEFT + 12 * COLW + BARW + 8; // tray starts here, width 68
function pointGeom(i) {
  const v = flipped() ? 23 - i : i;
  const bottom = v < 12;
  const slot = bottom ? 11 - v : v - 12;
  return { cx: slotCx(slot), bottom };
}
const stackY = (bottom, k, count) => {
  const step = count <= 4 ? R * 2 : Math.max(14, (PH - 6 - R * 2) / (count - 1));
  return bottom ? BOT - R - 3 - k * step : TOP + R + 3 + k * step;
};

function checker(cx, cy, p, extra = {}) {
  const g = el("g", {});
  el("circle", { cx, cy: cy + 2, r: R, fill: "rgba(0,0,0,0.35)" }, g);
  el("circle", { cx, cy, r: R, fill: p === 0 ? "url(#gw)" : "url(#gb)", stroke: p === 0 ? "#9d9483" : "#05060a", "stroke-width": 1.5, ...extra }, g);
  el("circle", { cx, cy, r: R * 0.62, fill: "none", stroke: p === 0 ? "rgba(120,110,90,0.45)" : "rgba(255,255,255,0.12)", "stroke-width": 1.5 }, g);
  return g;
}

function destinations() {
  if (sel === null) return [];
  return legalSteps(st, turn, left).filter((m) => m.from === sel);
}
function sources() {
  return new Set(legalSteps(st, turn, left).map((m) => m.from));
}

function draw() {
  svg.innerHTML = "";
  const defs = el("defs");
  const gw = el("radialGradient", { id: "gw", cx: "35%", cy: "30%", r: "75%" }, defs);
  el("stop", { offset: "0", "stop-color": "#ffffff" }, gw); el("stop", { offset: "1", "stop-color": "#d4cdbb" }, gw);
  const gb = el("radialGradient", { id: "gb", cx: "35%", cy: "30%", r: "75%" }, defs);
  el("stop", { offset: "0", "stop-color": "#646a7e" }, gb); el("stop", { offset: "1", "stop-color": "#10121a" }, gb);
  // frame and felt
  el("rect", { x: 0, y: 0, width: 800, height: 540, rx: 16, fill: "#4a2e17" });
  el("rect", { x: 8, y: 8, width: 784, height: 524, rx: 10, fill: "#1f5a43" });
  el("rect", { x: LEFT + 6 * COLW, y: 8, width: BARW, height: 524, fill: "#4a2e17" });
  el("rect", { x: TRAYX - 4, y: 8, width: 76, height: 524, fill: "#3a2411" });
  el("rect", { x: TRAYX, y: TOP, width: 68, height: 250 - TOP, rx: 6, fill: "#26170b" });
  el("rect", { x: TRAYX, y: 290, width: 68, height: BOT - 290, rx: 6, fill: "#26170b" });
  const dst = phase === "move" && mine() && !busy ? destinations() : [];
  const src = phase === "move" && mine() && !busy ? sources() : new Set();
  // points
  for (let i = 0; i < 24; i += 1) {
    const { cx, bottom } = pointGeom(i);
    const baseY = bottom ? BOT : TOP;
    const tipY = bottom ? BOT - PH : TOP + PH;
    const dark = (bottom ? 11 - (flipped() ? 23 - i : i) : (flipped() ? 23 - i : i) - 12) % 2 === 0;
    el("polygon", { points: `${cx - COLW / 2 + 2},${baseY} ${cx + COLW / 2 - 2},${baseY} ${cx},${tipY}`, fill: dark ? "#b0492f" : "#e2c897" });
    const isDst = dst.some((m) => m.to === i);
    if (last && (last.from === i || last.to === i)) el("polygon", { points: `${cx - COLW / 2 + 2},${baseY} ${cx + COLW / 2 - 2},${baseY} ${cx},${tipY}`, fill: "none", stroke: "#ffd65a", "stroke-width": 3, opacity: 0.8 });
    if (isDst) el("polygon", { points: `${cx - COLW / 2 + 2},${baseY} ${cx + COLW / 2 - 2},${baseY} ${cx},${tipY}`, fill: "rgba(255,214,90,0.35)", stroke: "#ffd65a", "stroke-width": 3, class: "pulse" });
    if (sel === i) el("polygon", { points: `${cx - COLW / 2 + 2},${baseY} ${cx + COLW / 2 - 2},${baseY} ${cx},${tipY}`, fill: "rgba(255,255,255,0.22)", stroke: "#fff", "stroke-width": 3 });
    const n = Math.abs(st.pts[i]);
    const p = st.pts[i] > 0 ? 0 : 1;
    for (let k = 0; k < n; k += 1) {
      const cy = stackY(bottom, k, n);
      const g = checker(cx, cy, p);
      if (sel === i && k === n - 1) el("circle", { cx, cy, r: R + 3, fill: "none", stroke: "#ffd65a", "stroke-width": 3 }, g);
      else if (src.has(i) && sel === null && k === n - 1) el("circle", { cx, cy, r: R + 2, fill: "none", stroke: "rgba(255,214,90,0.8)", "stroke-width": 2.5, class: "pulse" }, g);
    }
    if (n > 5) { const cy = stackY(bottom, n - 1, n); const t = el("text", { x: cx, y: cy + 6, "text-anchor": "middle", "font-size": 17, "font-weight": 800, fill: p === 0 ? "#333" : "#fff" }); t.textContent = n; }
    const num = el("text", { x: cx, y: bottom ? BOT + 0 : TOP + 0, "text-anchor": "middle", "font-size": 0, fill: "none" });
    num.textContent = "";
    const hit = el("rect", { x: cx - COLW / 2, y: bottom ? BOT - PH : TOP, width: COLW, height: PH, class: "hit" + (src.has(i) || isDst ? "" : " dead") });
    hit.addEventListener("click", () => onPoint(i));
  }
  // point numbers along the edges (from the viewing player's perspective)
  for (let slot = 0; slot < 12; slot += 1) {
    const cx = slotCx(slot);
    const bottomIdx = flipped() ? 23 - (11 - slot) : 11 - slot;
    const topIdx = flipped() ? 23 - (12 + slot) : 12 + slot;
    const num = (idx, y) => { const t = el("text", { x: cx, y, "text-anchor": "middle", "font-size": 12, "font-weight": 700, fill: "rgba(255,255,255,0.55)" }); t.textContent = (flipped() ? 24 - idx : idx + 1); };
    num(bottomIdx, 537 - 1); num(topIdx, 13);
  }
  // bar
  [0, 1].forEach((p) => {
    const n = st.bar[p];
    const below = (p === 0) !== flipped();
    for (let k = 0; k < n; k += 1) {
      const cy = below ? 314 + R + k * 52 : 226 - R - k * 52;
      const g = checker(BARX, cy, p);
      if (sel === BAR && k === n - 1 && p === turn) el("circle", { cx: BARX, cy, r: R + 3, fill: "none", stroke: "#ffd65a", "stroke-width": 3 }, g);
    }
  });
  const barHit = el("rect", { x: BARX - BARW / 2, y: 8, width: BARW, height: 524, class: "hit" + (src.has(BAR) ? "" : " dead") });
  barHit.addEventListener("click", () => onPoint(BAR));
  // trays (borne-off checkers)
  [0, 1].forEach((p) => {
    const below = (p === 0) !== flipped();
    for (let k = 0; k < st.off[p]; k += 1) {
      const y = below ? BOT - 10 - k * 14 : TOP + 4 + k * 14;
      el("rect", { x: TRAYX + 6, y: y - (below ? 10 : 0), width: 56, height: 10, rx: 3, fill: p === 0 ? "#f1ebdc" : "#23262f", stroke: p === 0 ? "#a39a87" : "#000", "stroke-width": 1 });
    }
  });
  const canOff = dst.some((m) => m.to === OFF);
  [0, 1].forEach((half) => {
    const isMineSide = (turn === 0) !== flipped() ? half === 1 : half === 0; // the tray on the current player's side
    const y = half === 1 ? 290 : TOP;
    const h = half === 1 ? BOT - 290 : 250 - TOP;
    if (canOff && isMineSide) el("rect", { x: TRAYX, y, width: 68, height: h, rx: 6, fill: "rgba(255,214,90,0.25)", stroke: "#ffd65a", "stroke-width": 3, class: "pulse" });
    const hit = el("rect", { x: TRAYX, y, width: 68, height: h, class: "hit" + (canOff && isMineSide ? "" : " dead") });
    hit.addEventListener("click", () => canOff && isMineSide && onPoint(OFF));
  });
  // dice in the middle of the right half
  const all = dice;
  if (all.length) {
    const size = all.length === 4 ? 38 : 48;
    const gap = 10;
    const total = all.length * size + (all.length - 1) * gap;
    let x0 = slotCx(6) - COLW / 2 + (6 * COLW - total) / 2;
    const remaining = left.slice();
    all.forEach((d) => {
      const usedIdx = remaining.indexOf(d);
      const used = usedIdx < 0;
      if (!used) remaining.splice(usedIdx, 1);
      const g = el("g", { opacity: used ? 0.32 : 1 });
      el("rect", { x: x0, y: 270 - size / 2, width: size, height: size, rx: 8, fill: "#fffdf7", stroke: "#8b8372", "stroke-width": 1.5 }, g);
      const PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
      PIPS[d].forEach((k) => el("circle", { cx: x0 + size * (0.25 + 0.25 * (k % 3)), cy: 270 - size / 2 + size * (0.25 + 0.25 * Math.floor(k / 3)), r: size * 0.075, fill: "#222" }, g));
      x0 += size + gap;
    });
  }
  renderBars();
}

function renderBars() {
  const order = flipped() ? [0, 1] : [1, 0]; // top bar shows the opponent of the viewer
  [["barTop", order[0]], ["barBottom", order[1]]].forEach(([id, p]) => {
    const box = $(id);
    box.className = "pbar" + (turn === p && phase !== "over" ? " turn" : "");
    box.innerHTML = `<span class="chip ${p === 0 ? "w" : "b"}"></span>${pname(p)} <span style="color:var(--muted);font-weight:600">${p === 0 ? "White" : "Black"}</span><small>Pips ${pips(st, p)} · Borne off ${st.off[p]}${st.bar[p] ? ` · On bar ${st.bar[p]}` : ""}${cpu() || online() ? "" : ""}</small>`;
  });
}

// ---------- flow ----------
function newGame() {
  st = initialState();
  turn = 0;
  dice = [];
  left = [];
  phase = "roll";
  sel = null;
  last = null;
  busy = false;
  undoStack = [];
  hintStep = null;
  $("end").classList.remove("show");
  net.setOver(false);
  $("again").textContent = online() ? "Rematch" : "Play again";
  startTurn();
}

function startTurn() {
  phase = "roll";
  dice = [];
  left = [];
  sel = null;
  undoStack = [];
  hintStep = null;
  $("roll").disabled = !(mine() && !isCpuTurn());
  $("undo").disabled = true;
  draw();
  if (online() && !net.active) return setStatus("Create or join a room to start.");
  if (isCpuTurn()) {
    setStatus("The computer is rolling…");
    busy = true;
    setTimeout(() => { busy = false; roll(); }, 800 / SPEED);
  } else if (mine()) setStatus(cpu() ? "Your turn. Roll the dice." : online() ? "Your turn. Roll the dice." : `${pname(turn)}'s turn. Roll the dice.`);
  else setStatus("Your friend's turn…");
  drain();
}

async function roll(forced, remote = false) {
  if (phase !== "roll" || (busy && !isCpuTurn())) return;
  if (online() && !remote && (!net.active || turn !== myP)) return;
  const a = 1 + Math.floor(Math.random() * 6);
  const b = 1 + Math.floor(Math.random() * 6);
  dice = forced || (a === b ? [a, a, a, a] : [a, b]);
  if (online() && !remote) net.send({ t: "roll", d: dice });
  $("roll").disabled = true;
  sfx.roll();
  left = dice.slice();
  phase = "move";
  sel = null;
  undoStack = [];
  draw();
  const steps = legalSteps(st, turn, left);
  if (!steps.length) {
    setStatus(`${pname(turn)} rolled ${dice.filter((d, i) => dice.indexOf(d) === i).join(" and ")} but ${pname(turn) === "You" ? "have" : "has"} no legal move.`, "bad");
    busy = true;
    await sleep(1400);
    busy = false;
    return endTurn();
  }
  if (isCpuTurn()) return cpuPlay();
  if (mine()) {
    if (st.bar[turn]) sel = BAR;
    setStatus(`${turn === undefined ? "" : ""}You rolled ${dice.length === 4 ? `double ${dice[0]}s` : dice.join(" and ")}. ${st.bar[turn] ? "Enter your checker from the bar." : "Tap a checker to move it."}`);
    draw();
  } else setStatus(`Your friend rolled ${dice.length === 4 ? `double ${dice[0]}s` : dice.join(" and ")}…`);
  $("undo").disabled = true;
  return undefined;
}

function onPoint(i) {
  if (phase !== "move" || !mine() || busy) return;
  const steps = legalSteps(st, turn, left);
  const from = new Set(steps.map((m) => m.from));
  if (sel !== null) {
    const cands = steps.filter((m) => m.from === sel && m.to === i);
    if (cands.length) {
      const m = cands.reduce((a, c) => (c.die < a.die ? c : a)); // when several dice reach (only when bearing off) use the smallest
      return doStep(m);
    }
  }
  if (i !== OFF && from.has(i)) { sel = sel === i && st.bar[turn] === 0 ? null : i; hintStep = null; ctxSound(); draw(); } else if (sel !== null && st.bar[turn] === 0) { sel = null; draw(); }
  return undefined;
}
const ctxSound = () => tone(520, 0, 0.04, "triangle", 0.05);

async function doStep(m, remote = false) {
  const p = turn;
  if (online() && !remote) net.send({ t: "step", from: m.from, to: m.to, die: m.die });
  undoStack.push({ st, left: left.slice(), last });
  const hitting = m.to !== OFF && st.pts[m.to] * (p === 0 ? 1 : -1) < 0;
  st = applyStep(st, p, m);
  left.splice(left.indexOf(m.die), 1);
  last = { from: m.from === BAR ? -1 : m.from, to: m.to === OFF ? -1 : m.to };
  sel = null;
  hintStep = null;
  m.to === OFF ? sfx.off() : hitting ? sfx.hit() : sfx.move();
  draw();
  $("undo").disabled = !(cpu() || settings.mode === "two") || !undoStack.length || isCpuTurn();
  if (hasWon(st, p)) return finish(p);
  const more = legalSteps(st, p, left);
  if (!left.length || !more.length) {
    if (left.length && !more.length) setStatus(`${pname(p)} ${pname(p) === "You" ? "have" : "has"} no more legal moves this turn.`);
    busy = true;
    await sleep(left.length ? 1100 : 600);
    busy = false;
    return endTurn();
  }
  if (mine() && !isCpuTurn()) { if (st.bar[p]) sel = BAR; draw(); }
  return undefined;
}

function endTurn() {
  if (phase === "over") return;
  turn = 1 - turn;
  startTurn();
}

async function cpuPlay() {
  busy = true;
  await sleep(650);
  const r = chooseSequence(st, turn, left, settings.level);
  if (!r) { busy = false; return endTurn(); }
  for (const m of r.steps) {
    if (phase === "over") break;
    busy = false;
    await doStep(m);
    busy = true;
    await sleep(520);
  }
  busy = false;
}

function finish(p) {
  phase = "over";
  busy = false;
  const v = winValue(st, p);
  wins[p] += v;
  draw();
  const kind = v === 3 ? "a backgammon (3 points)" : v === 2 ? "a gammon (2 points)" : "a single game (1 point)";
  const you = cpu() ? p === humanP() : online() ? p === myP : null;
  const title = cpu() ? (you ? "You win!" : "The computer wins") : online() ? (you ? "You win!" : "Your friend wins.") : `${p === 0 ? "White" : "Black"} wins!`;
  $("endEmoji").textContent = you === false ? (cpu() ? "🤖" : "🎲") : "🏆";
  $("endTitle").textContent = title;
  $("endText").textContent = `Won ${kind}. Pips left: White ${pips(st, 0)}, Black ${pips(st, 1)}.`;
  setStatus(title, "good");
  you === false ? sfx.lose() : sfx.win();
  net.setOver(true);
  $("roll").disabled = true;
  setTimeout(() => $("end").classList.add("show"), 700);
}

function undo() {
  if (phase !== "move" || !undoStack.length || online() || isCpuTurn() || busy) return;
  const u = undoStack.pop();
  st = u.st; left = u.left; last = u.last; sel = st.bar[turn] ? BAR : null;
  draw();
  $("undo").disabled = !undoStack.length;
  setStatus("Move undone.");
}

function showHint() {
  if (phase !== "move" || !mine() || online() || busy) return;
  const r = chooseSequence(st, turn, left, "normal");
  if (!r) return;
  const m = r.steps[0];
  sel = m.from;
  draw();
  setStatus("Hint: the highlighted checker can go to the glowing point.");
}

// ---------- controls ----------
function syncChips() {
  ["mode", "level", "first"].forEach((k) => document.querySelectorAll(`#${k} .g-chip`).forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.value === settings[k]))));
  $("levelRow").hidden = !cpu();
  $("colorRow").hidden = !cpu();
  $("undo").hidden = $("hint").hidden = $("newGame").hidden = online();
  if (online()) net.open(); else net.close();
}
["mode", "level", "first"].forEach((id) =>
  $(id).addEventListener("click", (e) => {
    const chip = e.target.closest(".g-chip");
    if (!chip || settings[id] === chip.dataset.value) return;
    settings[id] = chip.dataset.value;
    store.set(SETTINGS_KEY, settings);
    syncChips();
    newGame();
  })
);
$("roll").addEventListener("click", () => roll());
$("newGame").addEventListener("click", newGame);
$("again").addEventListener("click", () => { if (online()) { net.rematch(); $("end").classList.remove("show"); } else newGame(); });
$("endView").addEventListener("click", () => $("end").classList.remove("show"));
$("undo").addEventListener("click", undo);
$("hint").addEventListener("click", showHint);
document.addEventListener("keydown", (e) => { if ((e.key === " " || e.key === "Enter") && !$("roll").disabled && !(e.target instanceof HTMLButtonElement) && phase === "roll") { e.preventDefault(); roll(); } });
const mute = $("mute");
function syncMute() {
  mute.textContent = settings.muted ? "Sound Off" : "Sound On";
  mute.setAttribute("aria-pressed", String(settings.muted));
}
mute.addEventListener("click", () => { settings.muted = !settings.muted; store.set(SETTINGS_KEY, settings); syncMute(); });

syncChips();
syncMute();
newGame();
const invited = net.roomParam();
if (invited) { settings.mode = "online"; syncChips(); newGame(); net.join(invited); }
window.__bg = {
  roll, onPoint, doStep, legalSteps, sequences, BAR, OFF, draw,
  get st() { return st; }, get turn() { return turn; }, get phase() { return phase; }, get left() { return left; }, get dice() { return dice; }, get busy() { return busy; }, get myP() { return myP; }, get sel() { return sel; },
  setState: (s, t) => { st = s; turn = t; startTurn(); },
};
