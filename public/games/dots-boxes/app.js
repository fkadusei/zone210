import { createOnline } from "../../assets/online.js";

// ---------- rules ----------
// h[r][c]: horizontal edge on dot-row r (0..n), between dot columns c and c+1
// v[r][c]: vertical edge on box-row r (0..n-1), on dot-column c (0..n)
// owner values: 0 = free, 1 or 2 = who drew it
function makeState(n) {
  return {
    n,
    h: Array.from({ length: n + 1 }, () => Array(n).fill(0)),
    v: Array.from({ length: n }, () => Array(n + 1).fill(0)),
    box: Array.from({ length: n }, () => Array(n).fill(0)),
  };
}
const cloneState = (s) => ({ n: s.n, h: s.h.map((r) => r.slice()), v: s.v.map((r) => r.slice()), box: s.box.map((r) => r.slice()) });

const sides = (s, r, c) => (s.h[r][c] ? 1 : 0) + (s.h[r + 1][c] ? 1 : 0) + (s.v[r][c] ? 1 : 0) + (s.v[r][c + 1] ? 1 : 0);
const adjacentBoxes = (s, e) => {
  const out = [];
  if (e.t === "h") {
    if (e.r > 0) out.push([e.r - 1, e.c]);
    if (e.r < s.n) out.push([e.r, e.c]);
  } else {
    if (e.c > 0) out.push([e.r, e.c - 1]);
    if (e.c < s.n) out.push([e.r, e.c]);
  }
  return out;
};
const isFree = (s, e) => (e.t === "h" ? s.h[e.r][e.c] : s.v[e.r][e.c]) === 0;
const setEdge = (s, e, who) => {
  if (e.t === "h") s.h[e.r][e.c] = who;
  else s.v[e.r][e.c] = who;
};

function freeEdges(s) {
  const out = [];
  for (let r = 0; r <= s.n; r += 1) for (let c = 0; c < s.n; c += 1) if (!s.h[r][c]) out.push({ t: "h", r, c });
  for (let r = 0; r < s.n; r += 1) for (let c = 0; c <= s.n; c += 1) if (!s.v[r][c]) out.push({ t: "v", r, c });
  return out;
}

// draws an edge for `who` and returns the boxes it completed
function drawEdge(s, e, who) {
  setEdge(s, e, who);
  const done = [];
  adjacentBoxes(s, e).forEach(([r, c]) => {
    if (!s.box[r][c] && sides(s, r, c) === 4) {
      s.box[r][c] = who;
      done.push([r, c]);
    }
  });
  return done;
}

// ---------- computer player ----------
const pick = (list) => list[Math.floor(Math.random() * list.length)];
const completes = (s, e) => adjacentBoxes(s, e).filter(([r, c]) => !s.box[r][c] && sides(s, r, c) === 3).length;
const givesThird = (s, e) => {
  const t = cloneState(s);
  setEdge(t, e, 9);
  return adjacentBoxes(t, e).some(([r, c]) => !t.box[r][c] && sides(t, r, c) === 3);
};
// how many boxes the opponent could grab in a row after this edge
function given(s, e) {
  const t = cloneState(s);
  setEdge(t, e, 9);
  let n = 0;
  for (;;) {
    let found = null;
    for (let r = 0; r < t.n && !found; r += 1) {
      for (let c = 0; c < t.n && !found; c += 1) {
        if (t.box[r][c] || sides(t, r, c) !== 3) continue;
        if (!t.h[r][c]) found = { t: "h", r, c };
        else if (!t.h[r + 1][c]) found = { t: "h", r: r + 1, c };
        else if (!t.v[r][c]) found = { t: "v", r, c };
        else found = { t: "v", r, c: c + 1 };
      }
    }
    if (!found) return n;
    n += drawEdge(t, found, 8).length;
  }
}

function aiMove(s, level) {
  const moves = freeEdges(s);
  const takes = moves.filter((e) => completes(s, e) > 0);
  if (level === "easy") {
    if (takes.length && Math.random() < 0.65) return pick(takes);
    return pick(moves);
  }
  if (takes.length) {
    const best = Math.max(...takes.map((e) => completes(s, e)));
    return pick(takes.filter((e) => completes(s, e) === best));
  }
  const safe = moves.filter((e) => !givesThird(s, e));
  if (safe.length) return pick(safe);
  const scored = moves.map((e) => ({ e, g: given(s, e) }));
  const min = Math.min(...scored.map((x) => x.g));
  const pool = scored.filter((x) => x.g <= min + (level === "hard" ? 0 : 1));
  return pick(pool).e;
}

// ---------- UI ----------
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
const SETTINGS_KEY = "zone210_dots_settings";
const settings = { mode: "cpu", level: "normal", size: 4, muted: false, ...store.get(SETTINGS_KEY, {}) };
if (!["cpu", "two", "online"].includes(settings.mode)) settings.mode = "cpu";
if (![3, 4, 5].includes(settings.size)) settings.size = 4;
if (!["easy", "normal", "hard"].includes(settings.level)) settings.level = "normal";

const COLORS = { 1: "#3b82f6", 2: "#f59e0b" };
const S = 60;
const M = 24;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let st = null;
let turn = 1;
let scores = { 1: 0, 2: 0 };
let over = false;
let busy = false;
let hint = null;
let lastEdge = null;

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
    amp.gain.exponentialRampToValueAtTime(gain, t + 0.01);
    amp.gain.exponentialRampToValueAtTime(0.0001, t + length);
    osc.connect(amp).connect(audio.destination);
    osc.start(t);
    osc.stop(t + length + 0.02);
  } catch (err) {
    /* audio unavailable */
  }
}
const sfx = {
  line: () => tone(360, 0, 0.06, "triangle", 0.08),
  box: () => [523, 784].forEach((f, i) => tone(f, i * 0.08, 0.16, "triangle", 0.1)),
  win: () => [523, 659, 784, 1046, 784, 1046].forEach((f, i) => tone(f, i * 0.1, 0.24, "triangle", 0.1)),
  lose: () => [330, 262, 196].forEach((f, i) => tone(f, i * 0.16, 0.3, "sawtooth", 0.06)),
};

const svg = $("svg");
const statusEl = $("status");
const setStatus = (t, kind = "") => {
  statusEl.textContent = t;
  statusEl.className = "g-status" + (kind ? ` ${kind}` : "");
};
const cpu = () => settings.mode === "cpu";
const online = () => settings.mode === "online";
let myP = 1; // online: 1 = Blue (moves first), 2 = Orange
const net = createOnline({
  container: document.querySelector(".g-page"),
  before: $("scores"),
  prefix: "zone210-dots-",
  names: ["Blue", "Orange"],
  startInfo: () => ({ size: settings.size }),
  onStart: ({ role, info }) => {
    myP = role + 1;
    if (info && [3, 4, 5].includes(info.size)) settings.size = info.size;
    syncChips();
    newGame();
  },
  onData: (m) => { if (online() && m && m.e && !over && turn === 3 - myP && isFree(st, m.e)) move(m.e); },
  onLeft: () => { busy = false; setStatus("Your friend left the game."); },
});
const isCpuTurn = () => cpu() && turn === 2;
const nameOf = (p) => (cpu() ? (p === 1 ? "You" : "Computer") : online() ? (p === myP ? "You" : "Friend") : p === 1 ? "Blue" : "Orange");
const el = (name, attrs = {}) => {
  const e = document.createElementNS("http://www.w3.org/2000/svg", name);
  Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v));
  return e;
};

function buildBoard() {
  const n = st.n;
  const W = n * S + 2 * M;
  svg.setAttribute("viewBox", `0 0 ${W} ${W}`);
  svg.innerHTML = "";
  // boxes first so lines sit above
  for (let r = 0; r < n; r += 1) {
    for (let c = 0; c < n; c += 1) {
      svg.appendChild(el("rect", { class: "box", id: `b${r}-${c}`, x: M + c * S + 5, y: M + r * S + 5, width: S - 10, height: S - 10, rx: 8, fill: "transparent" }));
      const t = el("text", { class: "boxtxt", id: `t${r}-${c}`, x: M + c * S + S / 2, y: M + r * S + S / 2 + 1, fill: "#fff" });
      svg.appendChild(t);
    }
  }
  const addEdge = (e) => {
    const x1 = M + e.c * S;
    const y1 = M + e.r * S;
    const x2 = e.t === "h" ? x1 + S : x1;
    const y2 = e.t === "h" ? y1 : y1 + S;
    const key = `${e.t}${e.r}-${e.c}`;
    const hit = el("line", { class: "hit", id: `hit-${key}`, x1, y1, x2, y2, tabindex: 0, role: "button", "aria-label": `Line ${e.t === "h" ? "horizontal" : "vertical"} ${e.r + 1},${e.c + 1}` });
    const vis = el("line", { class: "edge", id: `e-${key}`, x1, y1, x2, y2 });
    hit.addEventListener("click", () => onEdge(e));
    hit.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter" || ev.key === " ") {
        ev.preventDefault();
        onEdge(e);
      }
    });
    svg.appendChild(hit);
    svg.appendChild(vis);
  };
  for (let r = 0; r <= n; r += 1) for (let c = 0; c < n; c += 1) addEdge({ t: "h", r, c });
  for (let r = 0; r < n; r += 1) for (let c = 0; c <= n; c += 1) addEdge({ t: "v", r, c });
  for (let r = 0; r <= n; r += 1) for (let c = 0; c <= n; c += 1) svg.appendChild(el("circle", { class: "dotc", cx: M + c * S, cy: M + r * S, r: 6.5 }));
}

function paintEdge(e, who, fresh = false) {
  const key = `${e.t}${e.r}-${e.c}`;
  const vis = svg.querySelector(`#e-${key}`);
  const hit = svg.querySelector(`#hit-${key}`);
  vis.classList.add("on");
  vis.classList.remove("hint");
  vis.style.setProperty("--c", COLORS[who]);
  if (fresh) {
    vis.classList.add("new");
    setTimeout(() => vis.classList.remove("new"), 350);
  }
  hit.classList.add("taken");
  hit.removeAttribute("tabindex");
}
function paintBox(r, c, who, fresh) {
  const b = svg.querySelector(`#b${r}-${c}`);
  b.setAttribute("fill", COLORS[who]);
  if (fresh) b.classList.add("pop");
  const t = svg.querySelector(`#t${r}-${c}`);
  t.textContent = cpu() ? (who === 1 ? "Y" : "C") : online() ? (who === myP ? "Y" : "F") : who === 1 ? "B" : "O";
}

function renderScores() {
  const box = $("scores");
  box.innerHTML = "";
  [1, 2].forEach((p) => {
    const d = document.createElement("div");
    d.className = "sc" + (turn === p && !over ? " turn" : "");
    d.style.setProperty("--c", COLORS[p]);
    d.innerHTML = `<span class="who"><span class="dot"></span>${nameOf(p)}</span><b>${scores[p]}</b>`;
    box.appendChild(d);
  });
}

function newGame() {
  st = makeState(settings.size);
  turn = 1;
  scores = { 1: 0, 2: 0 };
  over = false;
  busy = false;
  hint = null;
  lastEdge = null;
  $("end").classList.remove("show");
  net.setOver(false);
  $("again").textContent = online() ? "Rematch" : "Play again";
  buildBoard();
  renderScores();
  announce();
}
function announce() {
  if (over) return;
  if (online()) {
    setStatus(!net.active ? "Create or join a room to start." : turn === myP ? "Your turn. Draw a line between two dots." : "Your friend's turn…");
    return;
  }
  setStatus(isCpuTurn() ? "The computer is thinking…" : `${nameOf(turn) === "You" ? "Your" : `${nameOf(turn)}'s`} turn. Draw a line between two dots.`);
}

async function onEdge(e) {
  if (over || busy || isCpuTurn() || !isFree(st, e)) return;
  if (online()) {
    if (!net.active || turn !== myP) return;
    net.send({ e });
  }
  await move(e);
}

async function move(e) {
  busy = true;
  clearHint();
  const who = turn;
  const done = drawEdge(st, e, who);
  paintEdge(e, who, true);
  done.length ? sfx.box() : sfx.line();
  done.forEach(([r, c]) => paintBox(r, c, who, true));
  scores[who] += done.length;
  if (done.length === 0) turn = who === 1 ? 2 : 1;
  renderScores();
  busy = false;
  if (st.box.every((row) => row.every(Boolean))) return finish();
  if (done.length) setStatus(`${nameOf(who) === "You" ? "You" : nameOf(who)} completed ${done.length > 1 ? `${done.length} boxes` : "a box"}. Go again!`, "good");
  else announce();
  if (isCpuTurn()) {
    busy = true;
    await sleep(done.length ? 700 : 550);
    busy = false;
    if (!over) await move(aiMove(st, settings.level));
  }
}

function finish() {
  over = true;
  renderScores();
  const a = scores[1];
  const b = scores[2];
  let title;
  let emoji = "🏆";
  if (a === b) {
    title = "It's a draw!";
    emoji = "🤝";
    sfx.win();
  } else {
    const w = a > b ? 1 : 2;
    title = cpu() ? (w === 1 ? "You win!" : "The computer wins") : online() ? (w === myP ? "You win!" : "Your friend wins.") : `${nameOf(w)} wins!`;
    if (cpu() && w === 2) emoji = "🤖";
    cpu() && w === 2 ? sfx.lose() : sfx.win();
  }
  $("endEmoji").textContent = emoji;
  $("endTitle").textContent = title;
  $("endText").textContent = `${nameOf(1)} ${a} · ${nameOf(2)} ${b}`;
  setStatus(title, "good");
  net.setOver(true);
  setTimeout(() => $("end").classList.add("show"), 600);
}

function clearHint() {
  if (hint) svg.querySelector(`#e-${hint.t}${hint.r}-${hint.c}`)?.classList.remove("hint");
  hint = null;
}
function showHint() {
  if (over || busy || isCpuTurn() || online()) return;
  clearHint();
  hint = aiMove(st, "hard");
  svg.querySelector(`#e-${hint.t}${hint.r}-${hint.c}`).classList.add("hint");
  setStatus(completes(st, hint) ? "Hint: you can close a box here." : "Hint: a safe line that doesn't give a box away.");
}

// ---------- controls ----------
function syncChips() {
  document.querySelectorAll("#mode .g-chip").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.value === settings.mode)));
  document.querySelectorAll("#level .g-chip").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.value === settings.level)));
  document.querySelectorAll("#size .g-chip").forEach((b) => b.setAttribute("aria-pressed", String(Number(b.dataset.value) === settings.size)));
  $("levelRow").hidden = !cpu();
  $("hint").hidden = online();
  $("newGame").hidden = online();
  if (online()) net.open(); else net.close();
}
document.querySelectorAll("#mode .g-chip, #level .g-chip, #size .g-chip").forEach((b) =>
  b.addEventListener("click", () => {
    const group = b.parentElement.id;
    const value = group === "size" ? Number(b.dataset.value) : b.dataset.value;
    if (settings[group] === value) return;
    settings[group] = value;
    store.set(SETTINGS_KEY, settings);
    syncChips();
    newGame();
  })
);
$("newGame").addEventListener("click", newGame);
$("again").addEventListener("click", () => { if (online()) { net.rematch(); $("end").classList.remove("show"); } else newGame(); });
$("endView").addEventListener("click", () => $("end").classList.remove("show"));
$("hint").addEventListener("click", showHint);
const mute = $("mute");
function syncMute() {
  mute.textContent = settings.muted ? "Sound Off" : "Sound On";
  mute.setAttribute("aria-pressed", String(settings.muted));
}
mute.addEventListener("click", () => {
  settings.muted = !settings.muted;
  store.set(SETTINGS_KEY, settings);
  syncMute();
});

syncChips();
syncMute();
newGame();
const invited = net.roomParam();
if (invited) {
  settings.mode = "online";
  syncChips();
  newGame();
  net.join(invited);
}
window.__db = { makeState, drawEdge, aiMove, freeEdges, completes, given, get st() { return st; }, get scores() { return scores; }, get over() { return over; }, get busy() { return busy; }, get myP() { return myP; }, get turn() { return turn; }, onEdge, move };
