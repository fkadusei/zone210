import { createOnline } from "../../assets/online.js";
import { G, initial, regions, connections, route, validate, apply, hasMove, chooseMove, lives, spotAtCell, cellRC, other } from "./logic.js";

const $ = (id) => document.getElementById(id);
const store = {
  get(key, fallback) { try { const raw = localStorage.getItem(key); return raw === null ? fallback : JSON.parse(raw); } catch (err) { return fallback; } },
  set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (err) { /* private mode */ } },
};
const KEY = "zone210_sprouts_settings";
const settings = { mode: "cpu", level: "normal", first: "me", spots: "3", muted: false, ...store.get(KEY, {}) };
if (!["cpu", "two", "online"].includes(settings.mode)) settings.mode = "cpu";
if (!["easy", "normal", "hard"].includes(settings.level)) settings.level = "normal";
if (!["2", "3", "4", "5"].includes(String(settings.spots))) settings.spots = "3";
settings.spots = String(settings.spots);
const PCOL = { 1: "#2563eb", 2: "#e11d48" };

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
  draw: () => [0, 1, 2].forEach((i) => tone(380 + i * 70, i * 0.05, 0.07, "triangle", 0.07)),
  spot: () => tone(660, 0.1, 0.1, "sine", 0.1),
  bad: () => tone(160, 0, 0.15, "sawtooth", 0.06),
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
  prefix: "zone210-sprouts-",
  names: ["First", "Second"],
  startInfo: () => ({ spots: settings.spots }),
  onStart: ({ role, info }) => {
    myP = role === 0 ? 1 : 2;
    if (info && ["2", "3", "4", "5"].includes(String(info.spots))) settings.spots = String(info.spots);
    syncChips();
    inbox.length = 0;
    newGame();
  },
  onData: (m) => { inbox.push(m); drain(); },
  onLeft: () => { inbox.length = 0; draw(); setStatus("Your friend left the game."); },
});
function drain() {
  while (online() && net.active && inbox.length && !over && !busy && s.turn !== myP) {
    const m = inbox.shift();
    if (m.t === "mv" && Number.isInteger(m.a) && Number.isInteger(m.b) && Array.isArray(m.path) && !validate(s, m.a, m.b, m.path)) commit(m.a, m.b, m.path, true);
  }
}

let s = null;
let over = false;
let busy = false;
let hist = [];
let sel = null; // tapped spot waiting for a second tap
let drag = null; // { a, path: [], lastCell, endSpot, invalid, moved }
let hint = null;
let winner = 0;
const humanP = () => (cpu() ? (settings.first === "me" ? 1 : 2) : null);
const isCpuTurn = () => cpu() && s.turn !== humanP();
const mine = () => (online() ? net.active && s.turn === myP : cpu() ? s.turn === humanP() : true);
const nameOf = (p) => (cpu() ? (p === humanP() ? "You" : "Computer") : online() ? (p === myP ? "You" : "Friend") : `Player ${p}`);
const statusEl = $("status");
const setStatus = (t, kind = "") => { statusEl.textContent = t; statusEl.className = "g-status" + (kind ? ` ${kind}` : ""); };

// ---------- drawing ----------
const svg = $("mb");
const NS = "http://www.w3.org/2000/svg";
const CS = 540 / G;
const el = (name, attrs = {}, parent = svg) => { const e = document.createElementNS(NS, name); Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v)); parent.appendChild(e); return e; };
const ctr = (i) => { const [r, c] = cellRC(i); return { x: (c + 0.5) * CS, y: (r + 0.5) * CS }; };
function smooth(pts) {
  let p = pts;
  for (let it = 0; it < 3; it += 1) {
    if (p.length < 3) break;
    const q = [p[0]];
    for (let i = 0; i < p.length - 1; i += 1) {
      const a = p[i], b = p[i + 1];
      q.push({ x: a.x * 0.75 + b.x * 0.25, y: a.y * 0.75 + b.y * 0.25 }, { x: a.x * 0.25 + b.x * 0.75, y: a.y * 0.25 + b.y * 0.75 });
    }
    q.push(p[p.length - 1]);
    p = q;
  }
  return p;
}
const pathD = (pts) => pts.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
function draw() {
  svg.innerHTML = "";
  for (let k = 0; k <= G; k += 4) { el("line", { x1: k * CS, y1: 0, x2: k * CS, y2: 540, stroke: "rgba(120,100,60,0.08)" }); el("line", { x1: 0, y1: k * CS, x2: 540, y2: k * CS, stroke: "rgba(120,100,60,0.08)" }); }
  s.curves.forEach((cv) => {
    const pts = [ctr(s.spots[cv.a].cell), ...cv.path.map(ctr), ctr(s.spots[cv.b].cell)];
    el("path", { d: pathD(smooth(pts)), fill: "none", stroke: PCOL[cv.player], "stroke-width": 3.2, "stroke-linecap": "round", "stroke-linejoin": "round" });
  });
  const canAct = !over && !busy && mine() && !isCpuTurn();
  if (hint) {
    const pts = [ctr(s.spots[hint.a].cell), ...hint.path.map(ctr), ctr(s.spots[hint.b].cell)];
    el("path", { d: pathD(smooth(pts)), fill: "none", stroke: "#2fbf71", "stroke-width": 4, "stroke-dasharray": "7 6", "stroke-linecap": "round", class: "pulse" });
  }
  if (drag && drag.path.length) {
    const pts = [ctr(s.spots[drag.a].cell), ...drag.path.map(ctr)];
    if (drag.endSpot !== null && drag.endSpot !== undefined) pts.push(ctr(s.spots[drag.endSpot].cell));
    el("path", { d: pathD(smooth(pts)), fill: "none", stroke: drag.invalid ? "#d43b3b" : PCOL[s.turn], "stroke-width": 3.2, "stroke-dasharray": drag.invalid ? "3 5" : "none", opacity: 0.85, "stroke-linecap": "round", "stroke-linejoin": "round" });
  }
  const FILL = ["#9aa0a6", "#ffc24d", "#fff1b3", "#ffffff"];
  s.spots.forEach((sp, k) => {
    const { x, y } = ctr(sp.cell);
    const l = lives(s, k);
    if (canAct && l > 0) el("circle", { cx: x, cy: y, r: 12.5, fill: "none", stroke: sel === k ? "#222" : "rgba(34,34,34,0.35)", "stroke-width": sel === k ? 2.5 : 1.5, class: sel === k ? "" : "pulse" });
    if (hint && (hint.a === k || hint.b === k)) el("circle", { cx: x, cy: y, r: 13, fill: "none", stroke: "#2fbf71", "stroke-width": 3 });
    el("circle", { cx: x, cy: y, r: 7.2, fill: FILL[l], stroke: "#222", "stroke-width": 2, class: "sp" });
  });
  const lines = (p) => s.curves.filter((c) => c.player === p).length;
  $("pbars").innerHTML = [1, 2].map((p) => `<div class="pbar${!over && s.turn === p ? " turn" : ""}" style="--c1:#fff;--c2:${PCOL[p]}"><span class="chip"></span><span class="nm">${nameOf(p)}<small>${p === 1 ? "Blue" : "Red"} · <span class="ln">${lines(p)} lines drawn</span></small></span></div>`).join("");
}

// ---------- flow ----------
function newGame() {
  s = initial(Number(settings.spots));
  over = false; busy = false; hist = []; sel = null; drag = null; hint = null; winner = 0;
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
  setStatus(`${cpu() || online() ? "Your" : `${nameOf(s.turn)}'s`} move: drag from a spot to another spot, or tap two spots.`);
}
function cellAt(ev) {
  const r = svg.getBoundingClientRect();
  const x = ((ev.clientX - r.left) / r.width) * 540;
  const y = ((ev.clientY - r.top) / r.height) * 540;
  const c = Math.min(G - 1, Math.max(0, Math.floor(x / CS)));
  const rr = Math.min(G - 1, Math.max(0, Math.floor(y / CS)));
  return rr * G + c;
}
function nearestSpot(ev) {
  // be forgiving: a press close to a spot counts as pressing it
  const r = svg.getBoundingClientRect();
  const x = ((ev.clientX - r.left) / r.width) * 540;
  const y = ((ev.clientY - r.top) / r.height) * 540;
  let best = -1, bd = 1e9;
  s.spots.forEach((sp, k) => { const p = ctr(sp.cell); const d = Math.hypot(p.x - x, p.y - y); if (d < bd) { bd = d; best = k; } });
  return bd <= 17 ? best : -1;
}
svg.addEventListener("pointerdown", (ev) => {
  if (over || busy || !mine() || isCpuTurn()) return;
  const k = nearestSpot(ev);
  hint = null;
  if (k < 0) { sel = null; draw(); return; }
  if (lives(s, k) <= 0) { setStatus("That spot already has three lines.", "bad"); return; }
  svg.setPointerCapture(ev.pointerId);
  drag = { a: k, path: [], lastCell: s.spots[k].cell, endSpot: null, invalid: false, moved: false, startCell: s.spots[k].cell };
});
function stepTo(target) {
  // walk from the last cell towards `target`, one 4-connected step at a time
  let guard = 0;
  while (drag.lastCell !== target && guard < 200) {
    guard += 1;
    const [r0, c0] = cellRC(drag.lastCell), [r1, c1] = cellRC(target);
    const dr = r1 - r0, dc = c1 - c0;
    const horizontal = Math.abs(dc) >= Math.abs(dr);
    const nr = horizontal ? r0 : r0 + Math.sign(dr);
    const nc = horizontal ? c0 + Math.sign(dc) : c0;
    const cell = nr * G + nc;
    const idx = drag.path.indexOf(cell);
    if (idx >= 0) { drag.path = drag.path.slice(0, idx + 1); drag.lastCell = cell; drag.endSpot = null; drag.invalid = false; continue; }
    if (cell === drag.startCell && !drag.path.length) { drag.lastCell = cell; continue; }
    const sp = spotAtCell(s, cell);
    if (sp >= 0) {
      drag.endSpot = sp; drag.lastCell = cell;
      drag.invalid = !(drag.path.length && (sp !== drag.a ? lives(s, sp) >= 1 : lives(s, sp) >= 2 && drag.path.length >= 7));
      if (sp === drag.a && drag.path.length < 7) drag.invalid = false; // keep drawing the loop
      return;
    }
    if (s.cell[cell] !== 0) { drag.invalid = true; return; }
    if (drag.endSpot !== null) { drag.endSpot = null; }
    drag.path.push(cell); drag.lastCell = cell; drag.invalid = false;
  }
}
svg.addEventListener("pointermove", (ev) => {
  if (!drag) return;
  const cell = cellAt(ev);
  if (cell !== drag.lastCell) { drag.moved = true; stepTo(cell); draw(); }
});
svg.addEventListener("pointerup", (ev) => {
  if (!drag) return;
  const d = drag;
  drag = null;
  try { svg.releasePointerCapture(ev.pointerId); } catch (err) { /* ignore */ }
  if (!d.moved || (!d.path.length && d.endSpot === null)) { tapSpot(d.a); return; }
  if (d.endSpot === null || d.endSpot === undefined) { sfx.bad(); setStatus("Finish the line on a spot.", "bad"); draw(); return; }
  const err = validate(s, d.a, d.endSpot, d.path);
  if (err) { sfx.bad(); setStatus(err, "bad"); draw(); return; }
  if (online()) net.send({ t: "mv", a: d.a, b: d.endSpot, path: d.path });
  commit(d.a, d.endSpot, d.path, false);
});
svg.addEventListener("pointercancel", () => { drag = null; draw(); });
function tapSpot(k) {
  if (sel === null) { sel = k; setStatus("Now tap the spot to join it to (tap the same spot again for a loop)."); draw(); return; }
  const a = sel;
  sel = null;
  const reg = regions(s);
  const conns = connections(s, reg).filter((c) => (c.a === a && c.b === k) || (c.a === k && c.b === a));
  for (const c of conns) {
    const p = route(s, c, Math.random);
    if (!p) continue;
    const from = c.a === a ? c.a : c.b;
    const to = from === c.a ? c.b : c.a;
    // route() runs from a's side to b's side, so keep the same orientation
    const err = validate(s, c.a, c.b, p);
    if (err) continue;
    void from; void to;
    if (online()) net.send({ t: "mv", a: c.a, b: c.b, path: p });
    return commit(c.a, c.b, p, false);
  }
  sfx.bad();
  setStatus(a === k ? "That spot can't make a loop right now (it needs two free lines and open space)." : "Those spots can't be joined: a line in the way, or they are in different areas. Try drawing the line yourself.", "bad");
  draw();
  return undefined;
}
async function commit(a, b, path, remote) {
  void remote;
  hist.push({ s });
  const p = s.turn;
  s = apply(s, a, b, path);
  sel = null; hint = null;
  sfx.draw();
  setTimeout(sfx.spot, 160 / SPEED);
  if (!hasMove(s)) { winner = p; draw(); return finish(p); }
  draw(); announce();
  if (isCpuTurn()) cpuTurn();
  drain();
  return undefined;
}
async function cpuTurn() {
  busy = true;
  draw();
  await sleep(120);
  await new Promise((r) => setTimeout(r, 30));
  const m = chooseMove(s, settings.level);
  busy = false;
  if (m && !over) commit(m.a, m.b, m.path, true);
}
function finish(p) {
  over = true; busy = false;
  const you = cpu() ? p === humanP() : online() ? p === myP : true;
  const title = cpu() ? (you ? "You win!" : "The computer wins") : online() ? (you ? "You win!" : "Your friend wins.") : `${nameOf(p)} wins!`;
  $("endEmoji").textContent = you ? "🏆" : cpu() ? "🤖" : "🎲";
  $("endTitle").textContent = title;
  $("endText").textContent = `${nameOf(p)} made the last move: no more lines can be drawn after ${s.moves} moves.`;
  setStatus(title, "good");
  you ? sfx.win() : sfx.lose();
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
  s = prev.s; over = false; sel = null; drag = null; hint = null;
  $("end").classList.remove("show");
  draw(); announce();
}
async function showHint() {
  if (over || busy || !mine() || online() || isCpuTurn()) return;
  setStatus("Thinking…");
  await new Promise((r) => setTimeout(r, 30));
  hint = chooseMove(s, "normal");
  draw();
  setStatus("Hint: the dashed green line is a good move. Draw it, or draw your own.");
}

// ---------- controls ----------
function syncChips() {
  ["mode", "level", "first", "spots"].forEach((k) => document.querySelectorAll(`#${k} .g-chip`).forEach((c) => c.setAttribute("aria-pressed", String(c.dataset.value === String(settings[k])))));
  $("levelRow").hidden = !cpu();
  $("firstRow").hidden = !cpu();
  $("undo").hidden = $("hint").hidden = $("newGame").hidden = online();
  if (online()) net.open(); else net.close();
}
["mode", "level", "first", "spots"].forEach((id) => $(id).addEventListener("click", (e) => {
  const chip = e.target.closest(".g-chip");
  if (!chip || String(settings[id]) === chip.dataset.value) return;
  if (online() && net.active && id === "spots") return; // the host's starting spots apply once a game is under way
  settings[id] = chip.dataset.value;
  store.set(KEY, settings);
  syncChips();
  if (online() && id === "spots") return;
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
window.__sp = {
  validate, route, regions, connections,
  tap: tapSpot,
  move: (a, b, path) => { if (over || busy || !mine() || isCpuTurn() || validate(s, a, b, path)) return; if (online()) net.send({ t: "mv", a, b, path }); commit(a, b, path, false); },
  get s() { return s; }, get over() { return over; }, get busy() { return busy; }, get myP() { return myP; },
};
