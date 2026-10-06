import { createOnline } from "../../assets/online.js";
import { boardKeys } from "../../assets/board-keys.js";
import { KOMI, newGame as freshGame, isLegal, legalMoves, play, groupAt, score, estimateDead, chooseMove, other } from "./logic.js";

const $ = (id) => document.getElementById(id);
const store = {
  get(key, fallback) { try { const raw = localStorage.getItem(key); return raw === null ? fallback : JSON.parse(raw); } catch (err) { return fallback; } },
  set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (err) { /* private mode */ } },
};
const KEY = "zone210_go_settings";
const settings = { mode: "cpu", level: "normal", first: "me", size: "9", muted: false, ...store.get(KEY, {}) };
if (!["cpu", "two", "online"].includes(settings.mode)) settings.mode = "cpu";
if (!["easy", "normal", "hard"].includes(settings.level)) settings.level = "normal";
if (!["9", "13", "19"].includes(String(settings.size))) settings.size = "9";
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
  stone: () => tone(250, 0, 0.06, "triangle", 0.12),
  cap: () => { tone(200, 0, 0.1, "sawtooth", 0.07); tone(130, 0.05, 0.14, "sine", 0.1); },
  pass: () => tone(190, 0, 0.15, "sine", 0.06),
  win: () => [523, 659, 784, 1046, 784, 1046].forEach((f, i) => tone(f, i * 0.1, 0.24, "triangle", 0.1)),
  lose: () => [330, 262, 196].forEach((f, i) => tone(f, i * 0.16, 0.3, "sawtooth", 0.06)),
};

const online = () => settings.mode === "online";
const cpu = () => settings.mode === "cpu";
let myC = 1;
const inbox = [];
const net = createOnline({
  container: document.querySelector(".g-page"),
  before: $("pbars"),
  prefix: "zone210-go-",
  names: ["Black", "White"],
  startInfo: () => ({ size: settings.size }),
  onStart: ({ role, info }) => {
    myC = role === 0 ? 1 : 2;
    if (info && ["9", "13", "19"].includes(String(info.size))) settings.size = String(info.size);
    syncChips();
    inbox.length = 0;
    newGame();
  },
  onData: (m) => { inbox.push(m); drain(); },
  onLeft: () => { inbox.length = 0; draw(); setStatus("Your friend left the game."); },
  getState: () => ({ s: { ...s, b: [...s.b], seen: [...s.seen] }, phase, over, dead: [...dead], acc, lastCaps, endArgs, inbox: [...inbox] }),
  setState: (st) => {
    s = { ...st.s, b: Int8Array.from(st.s.b), seen: new Set(st.s.seen) };
    phase = st.phase; dead = new Set(st.dead); acc = st.acc; lastCaps = st.lastCaps; endArgs = st.endArgs;
    busy = false; hist = []; hintMove = -2; hover = -1; over = false;
    $("end").classList.remove("show");
    inbox.length = 0; inbox.push(...st.inbox);
    draw(); announce(); drain();
    if (st.over && endArgs) { over = true; endGame(...endArgs); }
  },
});
function drain() {
  while (online() && net.active && inbox.length && !over && !busy) {
    const m = inbox[0];
    if (phase === "play" && s.turn === myC && m.t !== "resign" && m.t !== "dead" && m.t !== "acc" && m.t !== "resume") break;
    inbox.shift();
    if (m.t === "m" && phase === "play" && s.turn !== myC && Number.isInteger(m.i) && isLegal(s, m.i)) put(m.i, true);
    else if (m.t === "pass" && phase === "play" && s.turn !== myC) doPass(true);
    else if (m.t === "resign") finishResign(other(myC));
    else if (m.t === "dead" && phase === "score" && Number.isInteger(m.i) && s.b[m.i]) toggleDead(m.i, true);
    else if (m.t === "acc" && phase === "score") { acc[other(myC)] = true; checkAccept(); }
    else if (m.t === "resume" && phase === "score") resumePlay(m.c, true);
  }
}

let s = null;
let phase = "play"; // play | score | over
let over = false;
let busy = false;
let endArgs = null;
let hist = [];
let dead = new Set();
let acc = [false, false, false];
let hintMove = -2;
let hover = -1;
let lastCaps = 0;
const humanC = () => (cpu() ? (settings.first === "me" ? 1 : 2) : null);
const isCpuTurn = () => cpu() && phase === "play" && s.turn !== humanC();
const mine = () => (online() ? net.active && s.turn === myC : cpu() ? s.turn === humanC() : true);
const cname = (c) => (c === 1 ? "Black" : "White");
const nameOf = (c) => (cpu() ? (c === humanC() ? "You" : "Computer") : online() ? (c === myC ? "You" : "Friend") : cname(c));
const statusEl = $("status");
const setStatus = (t, kind = "") => { statusEl.textContent = t; statusEl.className = "g-status" + (kind ? ` ${kind}` : ""); };

// ---------- drawing ----------
const svg = $("mb");
const NS = "http://www.w3.org/2000/svg";
const el = (name, attrs = {}, parent = svg) => { const e = document.createElementNS(NS, name); Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v)); parent.appendChild(e); return e; };
function draw() {
  svg.innerHTML = "";
  const n = s.n;
  const M = 30;
  const gap = (560 - 2 * M) / (n - 1);
  const xy = (i) => ({ x: M + (i % n) * gap, y: M + Math.floor(i / n) * gap });
  const defs = el("defs");
  [1, 2].forEach((p) => { const g = el("radialGradient", { id: `gs${p}`, cx: "35%", cy: "30%", r: "75%" }, defs); el("stop", { offset: "0", "stop-color": p === 1 ? "#6a7186" : "#ffffff" }, g); el("stop", { offset: "1", "stop-color": p === 1 ? "#0a0c13" : "#c3c7d4" }, g); });
  for (let k = 0; k < n; k += 1) { const p = M + k * gap; el("line", { x1: M, y1: p, x2: 560 - M, y2: p, stroke: "#5a3a18", "stroke-width": 1.4 }); el("line", { x1: p, y1: M, x2: p, y2: 560 - M, stroke: "#5a3a18", "stroke-width": 1.4 }); }
  const stars = n === 19 ? [3, 9, 15] : n === 13 ? [3, 6, 9] : [2, 4, 6];
  stars.forEach((r) => stars.forEach((c) => { if (n === 9 && (r !== 4 && c !== 4) && false) return; const { x, y } = xy(r * n + c); el("circle", { cx: x, cy: y, r: 3.4, fill: "#5a3a18" }); }));
  const canAct = phase === "play" && !busy && mine() && !isCpuTurn();
  const sco = phase === "score" ? score(s, dead) : null;
  const radius = gap * 0.47;
  for (let i = 0; i < n * n; i += 1) {
    const v = s.b[i];
    const { x, y } = xy(i);
    const isDead = dead.has(i);
    if (v) {
      el("circle", { cx: x + 1, cy: y + 2, r: radius, fill: "rgba(0,0,0,0.3)", opacity: isDead ? 0.3 : 1 });
      el("circle", { cx: x, cy: y, r: radius, fill: `url(#gs${v})`, stroke: v === 1 ? "#000" : "#8d93a6", "stroke-width": 0.8, opacity: isDead ? 0.38 : 1 });
      if (isDead) { const q = radius * 0.5; el("path", { d: `M${x - q} ${y - q}L${x + q} ${y + q}M${x + q} ${y - q}L${x - q} ${y + q}`, stroke: "#c62828", "stroke-width": 2.6, "stroke-linecap": "round" }); }
    }
    if (sco && (!v || isDead) && sco.owner[i]) el("rect", { x: x - gap * 0.17, y: y - gap * 0.17, width: gap * 0.34, height: gap * 0.34, fill: sco.owner[i] === 1 ? "#10131c" : "#ffffff", stroke: "rgba(0,0,0,0.5)", "stroke-width": 0.8, opacity: 0.9 });
    if (i === s.last && phase === "play") el("circle", { cx: x, cy: y, r: radius * 0.3, fill: "none", stroke: v === 1 ? "#fff" : "#c92d2d", "stroke-width": 2 });
    if (i === hintMove) el("circle", { cx: x, cy: y, r: radius + 3, fill: "none", stroke: "#2fbf71", "stroke-width": 3.5, class: "pulse" });
    if (i === hover && !v && canAct) el("circle", { cx: x, cy: y, r: radius, fill: s.turn === 1 ? "rgba(10,12,19,0.45)" : "rgba(255,255,255,0.6)" });
    if (phase === "score" && v) { const hit = el("circle", { cx: x, cy: y, r: gap * 0.5, class: "pt gp" }); hit.dataset.i = i; hit.addEventListener("click", () => onScoreClick(i)); } else {
      const hit = el("circle", { cx: x, cy: y, r: gap * 0.5, class: "pt" + (canAct && !v ? "" : " dead") });
      hit.dataset.i = i; hit.addEventListener("click", () => onPoint(i));
      hit.addEventListener("pointerenter", () => { if (hover !== i && !v) { hover = i; if (canAct) draw(); } });
    }
  }
  const komi = KOMI[n];
  $("pbars").innerHTML = [1, 2].map((c) => `<div class="pbar${phase === "play" && s.turn === c ? " turn" : ""}" style="--c1:${c === 1 ? "#5b6072" : "#fff"};--c2:${c === 1 ? "#0b0d14" : "#c9ccd8"}"><span class="chip"></span><span class="nm">${nameOf(c)}<small>${cname(c)} · <span class="cp">captured ${s.caps[c]}${c === 2 ? ` · komi ${komi}` : ""}</span></small></span></div>`).join("");
  const sb = $("scorebox");
  sb.hidden = phase !== "score";
  if (sco) $("scoreText").innerHTML = `<b>Score</b> · Black ${sco.black} · White ${sco.white} + ${sco.komi} komi = ${sco.white + sco.komi}.<br>${sco.margin > 0 ? `Black leads by ${sco.margin}` : `White leads by ${(-sco.margin).toFixed(1).replace(".0", "")}`}. Tap a group of stones to mark it dead or alive again.`;
  $("pass").hidden = phase !== "play";
  $("undo").disabled = phase !== "play";
  $("hint").disabled = phase !== "play";
  $("pass").disabled = !canAct;
  $("resign").hidden = phase === "over";
  $("accept").textContent = acc[online() ? myC : 1] && online() ? "Waiting for your friend…" : "Accept score";
  $("accept").disabled = online() && acc[myC];
}

// ---------- flow ----------
function newGame() {
  s = freshGame(Number(settings.size));
  phase = "play"; over = false; busy = false; hist = []; dead = new Set(); acc = [false, false, false]; hintMove = -2; hover = -1;
  $("end").classList.remove("show");
  net.setOver(false);
  $("again").textContent = online() ? "Rematch" : "Play again";
  draw(); announce();
  if (isCpuTurn()) cpuTurn();
}
function announce() {
  if (over) return;
  if (online() && !net.active) return setStatus("Create or join a room to start.");
  if (phase === "score") return setStatus(cpu() ? "Both passed. Check the dead stones, then accept the score." : "Both passed. Mark dead stones, then both players accept the score.");
  if (isCpuTurn()) return setStatus("The computer is thinking…");
  if (online() && s.turn !== myC) return setStatus("Your friend's move…");
  const you = cpu() || online();
  setStatus(`${you ? "Your" : `${nameOf(s.turn)}'s`} move as ${cname(s.turn)}.${s.passes ? ` ${cname(other(s.turn))} passed.` : ""}`);
}
function onPoint(i) {
  if (phase !== "play" || busy || !mine() || isCpuTurn() || s.b[i]) return;
  if (!isLegal(s, i)) { sfx.pass(); setStatus("Not allowed: that stone would have no liberties, or repeat an earlier position (ko).", "bad"); return; }
  if (online()) net.send({ t: "m", i });
  put(i, false);
}
function put(i, remote) {
  void remote;
  hist.push({ s });
  const caps = s.caps[1] + s.caps[2];
  s = play(s, i);
  hintMove = -2; hover = -1;
  sfx.stone();
  if (s.caps[1] + s.caps[2] > caps) sfx.cap();
  draw(); announce();
  if (isCpuTurn()) cpuTurn();
  drain();
}
function doPass(remote) {
  if (!remote && online()) net.send({ t: "pass" });
  hist.push({ s });
  s = play(s, -1);
  hintMove = -2;
  sfx.pass();
  if (s.passes >= 2) return enterScore();
  draw(); announce();
  if (isCpuTurn()) cpuTurn();
  drain();
  return undefined;
}
async function cpuTurn() {
  busy = true;
  draw();
  await sleep(80);
  await new Promise((r) => setTimeout(r, 30));
  const m = chooseMove(s, settings.level);
  busy = false;
  if (over || phase !== "play") return;
  if (m === -1) return doPass(true);
  put(m, true);
  return undefined;
}
function enterScore() {
  phase = "score"; busy = false;
  setStatus("Working out which stones are dead…");
  draw();
  setTimeout(() => { dead = estimateDead(s); acc = [false, false, false]; draw(); announce(); }, 30);
}
function onScoreClick(i) {
  if (phase !== "score" || !s.b[i]) return;
  if (online()) net.send({ t: "dead", i });
  toggleDead(i, false);
}
function toggleDead(i, remote) {
  void remote;
  const g = groupAt(s, i);
  const allDead = g.every((x) => dead.has(x));
  g.forEach((x) => (allDead ? dead.delete(x) : dead.add(x)));
  acc = [false, false, false];
  draw();
}
function checkAccept() {
  if (online() ? acc[1] && acc[2] : acc[1]) return finishScore();
  draw();
  return undefined;
}
function finishScore() {
  over = true; phase = "over";
  const r = score(s, dead);
  const w = r.margin > 0 ? 1 : 2;
  endGame(w, `Black ${r.black} · White ${r.white} + ${r.komi} komi = ${r.white + r.komi}. ${w === 1 ? "Black" : "White"} wins by ${Math.abs(r.margin)}.`);
}
function finishResign(w) {
  over = true; phase = "over"; busy = false;
  endGame(w, `${cname(other(w))} resigned.`);
}
function endGame(w, text) {
  endArgs = [w, text];
  draw();
  const you = cpu() ? w === humanC() : online() ? w === myC : true;
  const title = cpu() ? (you ? "You win!" : "The computer wins") : online() ? (you ? "You win!" : "Your friend wins.") : `${cname(w)} wins!`;
  $("endEmoji").textContent = you ? "🏆" : cpu() ? "🤖" : "🎲";
  $("endTitle").textContent = title;
  $("endText").textContent = text;
  setStatus(title, "good");
  you ? sfx.win() : sfx.lose();
  net.setOver(true);
  setTimeout(() => $("end").classList.add("show"), 700);
}
function resumePlay(c, remote) {
  if (!remote && online()) net.send({ t: "resume", c });
  phase = "play"; dead = new Set(); acc = [false, false, false];
  s = { ...s, passes: 0, turn: c };
  draw(); announce();
  if (isCpuTurn()) cpuTurn();
}
function undo() {
  if (busy || !hist.length || online() || phase !== "play") return;
  let steps = 1;
  if (cpu()) { steps = 0; for (let k = hist.length - 1; k >= 0; k -= 1) { steps += 1; if (hist[k].s.turn === humanC()) break; } }
  let prev = null;
  for (let k = 0; k < steps && hist.length; k += 1) prev = hist.pop();
  if (!prev) return;
  s = prev.s; hintMove = -2;
  draw(); announce();
}
async function showHint() {
  if (phase !== "play" || busy || !mine() || online() || isCpuTurn()) return;
  setStatus("Thinking…");
  await new Promise((r) => setTimeout(r, 30));
  hintMove = chooseMove(s, "normal");
  draw();
  setStatus(hintMove === -1 ? "Hint: passing looks fine here." : "Hint: the green ring marks a good point.");
}

// ---------- controls ----------
function syncChips() {
  ["mode", "level", "first", "size"].forEach((k) => document.querySelectorAll(`#${k} .g-chip`).forEach((c) => c.setAttribute("aria-pressed", String(c.dataset.value === String(settings[k])))));
  $("levelRow").hidden = !cpu();
  $("firstRow").hidden = !cpu();
  $("undo").hidden = $("hint").hidden = $("newGame").hidden = online();
  if (online()) net.open(); else net.close();
}
["mode", "level", "first", "size"].forEach((id) => $(id).addEventListener("click", (e) => {
  const chip = e.target.closest(".g-chip");
  if (!chip || String(settings[id]) === chip.dataset.value) return;
  if (online() && net.active && id === "size") return; // the host's board size applies once a game is under way
  settings[id] = chip.dataset.value;
  store.set(KEY, settings);
  syncChips();
  if (online() && id === "size") return;
  newGame();
}));
$("pass").addEventListener("click", () => { if (phase === "play" && mine() && !busy && !isCpuTurn()) doPass(false); });
$("resign").addEventListener("click", () => {
  if (over) return;
  const loser = cpu() ? humanC() : online() ? myC : s.turn;
  if (online()) net.send({ t: "resign" });
  finishResign(other(loser));
});
$("accept").addEventListener("click", () => {
  if (phase !== "score") return;
  if (online()) { acc[myC] = true; net.send({ t: "acc" }); } else acc[1] = true;
  checkAccept();
});
$("resume").addEventListener("click", () => { if (phase === "score") resumePlay(online() ? myC : cpu() ? humanC() : s.turn, false); });
$("newGame").addEventListener("click", newGame);
$("again").addEventListener("click", () => { if (online()) { net.rematch(); $("end").classList.remove("show"); } else newGame(); });
$("endView").addEventListener("click", () => $("end").classList.remove("show"));
$("undo").addEventListener("click", undo);
$("hint").addEventListener("click", showHint);
svg.addEventListener("pointerleave", () => { if (hover !== -1) { hover = -1; if (s) draw(); } });
const mute = $("mute");
const syncMute = () => { mute.textContent = settings.muted ? "Sound Off" : "Sound On"; mute.setAttribute("aria-pressed", String(settings.muted)); };
mute.addEventListener("click", () => { settings.muted = !settings.muted; store.set(KEY, settings); syncMute(); });

syncChips();
syncMute();
newGame();
const invited = net.roomParam();
if (invited) { settings.mode = "online"; syncChips(); newGame(); net.join(invited); }
window.__go = {
  onPoint, isLegal, legalMoves, pass: () => document.getElementById("pass").click(), toggle: onScoreClick,
  accept: () => document.getElementById("accept").click(), resign: () => document.getElementById("resign").click(),
  get s() { return s; }, get phase() { return phase; }, get over() { return over; }, get busy() { return busy; }, get myC() { return myC; }, get dead() { return dead; },
};

// keyboard and screen-reader play on the board
boardKeys($("mb"), { selector: "[data-i]", describe: (i) => (s && s.b[i] ? `${cname(s.b[i])} stone` : "") });
