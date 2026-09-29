// ---------- board data ----------
const LADDERS = { 1: 38, 4: 14, 9: 31, 21: 42, 28: 84, 36: 44, 51: 67, 71: 91, 80: 100 };
const SNAKES = { 16: 6, 47: 26, 49: 11, 56: 53, 62: 19, 64: 60, 87: 24, 93: 73, 95: 75, 98: 78 };
const JUMPS = { ...LADDERS, ...SNAKES };
const SNAKE_COLORS = ["#2fb67c", "#ef6461", "#8a5ce0", "#f59e0b", "#0ea5b7", "#e0559f", "#6b8e23", "#3b82f6", "#d97706", "#14b8a6"];
const COLORS = ["#ef4444", "#3b82f6", "#22c55e", "#f59e0b"];
const NAMES = ["Red", "Blue", "Green", "Gold"];

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
const SETTINGS_KEY = "zone210_snakes_settings";
const settings = { mode: "cpu", bonus: "on", muted: false, ...store.get(SETTINGS_KEY, {}) };
if (!["cpu", "2", "3", "4"].includes(settings.mode)) settings.mode = "cpu";

const SPEED = new URLSearchParams(location.search).has("fast") ? 25 : 1; // ?fast is for testing
const sleep = (ms) => new Promise((r) => setTimeout(r, ms / SPEED));


function centre(n) {
  const idx = n - 1;
  const row = Math.floor(idx / 10);
  const col = row % 2 === 0 ? idx % 10 : 9 - (idx % 10);
  return { x: col * 10 + 5, y: (9 - row) * 10 + 5 };
}

// ---------- sound ----------
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
    amp.gain.exponentialRampToValueAtTime(gain, t + 0.015);
    amp.gain.exponentialRampToValueAtTime(0.0001, t + length);
    osc.connect(amp).connect(audio.destination);
    osc.start(t);
    osc.stop(t + length + 0.02);
  } catch (err) {
    /* audio unavailable */
  }
}
const sfx = {
  roll: () => [0, 1, 2, 3, 4].forEach((i) => tone(220 + Math.random() * 200, i * 0.11, 0.05, "square", 0.04)),
  step: () => tone(480, 0, 0.05, "triangle", 0.06),
  ladder: () => [392, 494, 587, 784].forEach((f, i) => tone(f, i * 0.08, 0.18, "triangle", 0.09)),
  snake: () => [500, 420, 340, 260, 190].forEach((f, i) => tone(f, i * 0.09, 0.16, "sawtooth", 0.06)),
  win: () => [523, 659, 784, 1046, 784, 1046, 1318].forEach((f, i) => tone(f, i * 0.1, 0.26, "triangle", 0.1)),
};


function svgEl(name, attrs) {
  const e = document.createElementNS("http://www.w3.org/2000/svg", name);
  Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v));
  return e;
}

function drawGrid() {
  const grid = $("grid");
  grid.innerHTML = "";
  for (let r = 9; r >= 0; r -= 1) {
    for (let c = 0; c < 10; c += 1) {
      const n = r * 10 + (r % 2 === 0 ? c : 9 - c) + 1;
      const d = document.createElement("div");
      d.className = "sq" + ((r + c) % 2 ? " alt" : "") + (n === 100 ? " end" : "") + (n === 1 ? " first" : "");
      d.textContent = n;
      grid.appendChild(d);
    }
  }
}

function drawArt() {
  const svg = $("art");
  svg.innerHTML = "";
  // ladders
  Object.entries(LADDERS).forEach(([from, to]) => {
    const a = centre(Number(from));
    const b = centre(Number(to));
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy);
    const nx = (-dy / len) * 1.7;
    const ny = (dx / len) * 1.7;
    const g = svgEl("g", {});
    [1, -1].forEach((s) => {
      g.appendChild(svgEl("line", { x1: a.x + nx * s, y1: a.y + ny * s, x2: b.x + nx * s, y2: b.y + ny * s, stroke: "#5a3a12", "stroke-width": 1.7, "stroke-linecap": "round" }));
      g.appendChild(svgEl("line", { x1: a.x + nx * s, y1: a.y + ny * s, x2: b.x + nx * s, y2: b.y + ny * s, stroke: "#e2a24a", "stroke-width": 1, "stroke-linecap": "round" }));
    });
    const rungs = Math.max(3, Math.round(len / 4.2));
    for (let i = 1; i < rungs; i += 1) {
      const t = i / rungs;
      const cx = a.x + dx * t;
      const cy = a.y + dy * t;
      g.appendChild(svgEl("line", { x1: cx + nx, y1: cy + ny, x2: cx - nx, y2: cy - ny, stroke: "#5a3a12", "stroke-width": 1.4, "stroke-linecap": "round" }));
      g.appendChild(svgEl("line", { x1: cx + nx, y1: cy + ny, x2: cx - nx, y2: cy - ny, stroke: "#e2a24a", "stroke-width": 0.8, "stroke-linecap": "round" }));
    }
    svg.appendChild(g);
  });
  // snakes
  Object.entries(SNAKES).forEach(([from, to], i) => {
    const a = centre(Number(from)); // head
    const b = centre(Number(to)); // tail
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy);
    const px = -dy / len;
    const py = dx / len;
    const waves = Math.max(1.5, len / 16);
    const amp = 2.6 + Math.min(2, len / 30);
    const pts = [];
    const N = 40;
    for (let k = 0; k <= N; k += 1) {
      const t = k / N;
      const off = Math.sin(t * Math.PI * 2 * waves) * amp * (0.35 + 0.65 * Math.sin(Math.min(1, t * 1.15) * Math.PI * 0.5));
      pts.push([a.x + dx * t + px * off, a.y + dy * t + py * off]);
    }
    const d = pts.map((p, k) => `${k ? "L" : "M"}${p[0].toFixed(2)} ${p[1].toFixed(2)}`).join(" ");
    const color = SNAKE_COLORS[i % SNAKE_COLORS.length];
    const g = svgEl("g", {});
    g.appendChild(svgEl("path", { d, fill: "none", stroke: "rgba(0,0,0,0.35)", "stroke-width": 3.6, "stroke-linecap": "round", "stroke-linejoin": "round", transform: "translate(0.5 0.7)" }));
    g.appendChild(svgEl("path", { d, fill: "none", stroke: color, "stroke-width": 3, "stroke-linecap": "round", "stroke-linejoin": "round" }));
    g.appendChild(svgEl("path", { d, fill: "none", stroke: "rgba(255,255,255,0.55)", "stroke-width": 1.1, "stroke-linecap": "butt", "stroke-dasharray": "1.4 3", "stroke-linejoin": "round" }));
    // head
    const ang = Math.atan2(pts[1][1] - pts[0][1], pts[1][0] - pts[0][0]) + Math.PI;
    const hx = pts[0][0];
    const hy = pts[0][1];
    g.appendChild(svgEl("ellipse", { cx: hx, cy: hy, rx: 2.6, ry: 2.1, fill: color, stroke: "rgba(0,0,0,0.4)", "stroke-width": 0.3, transform: `rotate(${(ang * 180) / Math.PI} ${hx} ${hy})` }));
    [1, -1].forEach((s) => {
      const ex = hx + Math.cos(ang) * 0.9 + Math.cos(ang + Math.PI / 2) * 1.1 * s;
      const ey = hy + Math.sin(ang) * 0.9 + Math.sin(ang + Math.PI / 2) * 1.1 * s;
      g.appendChild(svgEl("circle", { cx: ex, cy: ey, r: 0.75, fill: "#fff" }));
      g.appendChild(svgEl("circle", { cx: ex + Math.cos(ang) * 0.2, cy: ey + Math.sin(ang) * 0.2, r: 0.38, fill: "#111" }));
    });
    g.appendChild(svgEl("line", { x1: hx + Math.cos(ang) * 2.4, y1: hy + Math.sin(ang) * 2.4, x2: hx + Math.cos(ang) * 4, y2: hy + Math.sin(ang) * 4, stroke: "#e11d48", "stroke-width": 0.5, "stroke-linecap": "round" }));
    svg.appendChild(g);
  });
}

// ---------- flat fallback view (used when WebGL is unavailable) ----------
function createView2D(container) {
  container.classList.add("is2d");
  container.innerHTML = `<div class="board-wrap" id="wrap"><div class="grid" id="grid" aria-label="Game board"></div><svg class="art" id="art" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"></svg><div class="tokens" id="tokens"></div></div>`;
  $("dieBox").hidden = false;
  const tokensEl = $("tokens");
  const dieEl = $("die");
  let pos = [];
  let turnIdx = -1;
  const PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
  const showDie = (n) => {
    dieEl.innerHTML = "";
    for (let i = 0; i < 9; i += 1) {
      const p = document.createElement("i");
      if (n && PIPS[n].includes(i)) p.className = "on";
      dieEl.appendChild(p);
    }
  };
  showDie(0);
  function tokenPos(i) {
    if (!pos[i]) return { x: 8 + i * 7, y: 95.45 };
    const c = centre(pos[i]);
    const same = pos.map((q, k) => (q === pos[i] ? k : -1)).filter((k) => k >= 0);
    const slot = same.indexOf(i);
    const spread = same.length > 1 ? 2.6 : 0;
    const dx = same.length > 1 ? ((slot % 2) - 0.5) * spread * 1.6 : 0;
    const dy = same.length > 1 ? (Math.floor(slot / 2) - 0.5) * spread * 1.6 : 0;
    return { x: c.x + dx, y: (c.y + dy) * 0.90909 };
  }
  function paint(slide = false) {
    pos.forEach((_, i) => {
      const el = tokensEl.children[i];
      const p = tokenPos(i);
      el.classList.toggle("slide", slide);
      el.classList.toggle("now", i === turnIdx);
      el.style.left = `${p.x}%`;
      el.style.top = `${p.y}%`;
    });
  }
  drawGrid();
  drawArt();
  return {
    setPlayers(list) {
      tokensEl.innerHTML = "";
      pos = list.map(() => 0);
      list.forEach((p) => {
        const el = document.createElement("div");
        el.className = "tok";
        el.style.setProperty("--c", p.color);
        tokensEl.appendChild(el);
      });
      paint();
    },
    setTurn(i) {
      turnIdx = i;
      paint();
    },
    setPos(i, p) {
      pos[i] = p;
      paint();
    },
    async hop(i, p) {
      pos[i] = p;
      paint();
      await sleep(150);
    },
    async jump(i, from, to) {
      pos[i] = to;
      paint(true);
      await sleep(750);
      paint(false);
    },
    async rollDice(value) {
      dieEl.classList.add("rolling");
      for (let k = 0; k < 7; k += 1) {
        showDie(1 + Math.floor(Math.random() * 6));
        await sleep(85);
      }
      dieEl.classList.remove("rolling");
      showDie(value);
    },
    setDiceEnabled() {},
    celebrate() {},
    resetView() {},
  };
}

// ---------- state ----------
let players = []; // { name, color, cpu, pos }
let turn = 0;
let busy = false;
let over = false;
let view = null;
let epoch = 0; // bumps on every new game so a roll from the old game can never touch the new one

const statusEl = $("status");
const rollBtn = $("roll");
const setStatus = (t, kind = "") => {
  statusEl.textContent = t;
  statusEl.className = "g-status" + (kind ? ` ${kind}` : "");
};

function renderPlayers() {
  const box = $("players");
  box.innerHTML = "";
  players.forEach((p, i) => {
    const d = document.createElement("div");
    d.className = "pl" + (i === turn && !over ? " turn" : "");
    d.style.setProperty("--c", p.color);
    d.innerHTML = `<span class="dot"></span><span class="nm">${p.name}<small>${p.cpu ? "Computer · " : ""}${p.pos ? `Square ${p.pos}` : "Not started"}</small></span>`;
    box.appendChild(d);
  });
}

function newGame() {
  epoch += 1;
  const count = settings.mode === "cpu" ? 2 : Number(settings.mode);
  players = Array.from({ length: count }, (_, i) => ({
    name: settings.mode === "cpu" ? (i === 0 ? "You" : "Computer") : NAMES[i],
    color: COLORS[i],
    cpu: settings.mode === "cpu" && i === 1,
    pos: 0,
  }));
  turn = 0;
  busy = false;
  over = false;
  $("end").classList.remove("show");
  view.setPlayers(players);
  renderPlayers();
  beginTurn();
}

function beginTurn() {
  renderPlayers();
  view.setTurn(over ? -1 : turn);
  const p = players[turn];
  if (over) return;
  rollBtn.disabled = p.cpu;
  view.setDiceEnabled(!p.cpu);
  rollBtn.textContent = p.cpu ? "Computer's turn…" : players.length > 1 && settings.mode !== "cpu" ? `${p.name}: roll the dice` : "Roll the dice";
  setStatus(p.cpu ? "The computer is rolling…" : `${p.name === "You" ? "Your" : `${p.name}'s`} turn. Roll the dice!`);
  const e = epoch;
  if (p.cpu) setTimeout(() => e === epoch && roll(), 900 / SPEED);
}

async function roll() {
  if (busy || over) return;
  busy = true;
  const my = epoch;
  const stale = () => my !== epoch;
  rollBtn.disabled = true;
  view.setDiceEnabled(false);
  const p = players[turn];
  const idx = turn;
  const who = p.name === "You" ? "You" : p.name;
  const value = 1 + Math.floor(Math.random() * 6);
  sfx.roll();
  await view.rollDice(value);
  if (stale()) return;
  await sleep(250);
  if (stale()) return;

  const start = p.pos;
  const target = start + value;
  if (target > 100) {
    setStatus(`${who} rolled ${value}, but ${start} + ${value} is past 100. You need the exact number to finish.`);
    await sleep(1100);
    if (stale()) return;
    return endTurn(false);
  }
  setStatus(`${who} rolled a ${value}: ${start} → ${target}`);
  for (let s = start + 1; s <= target; s += 1) {
    p.pos = s;
    sfx.step();
    await view.hop(idx, s);
    if (stale()) return;
    renderPlayers();
  }
  const jump = JUMPS[p.pos];
  if (jump) {
    const up = jump > p.pos;
    await sleep(200);
    if (stale()) return;
    setStatus(up ? `${who} rolled a ${value}: ${start} → ${target}. A ladder! Up to ${jump}.` : `${who} rolled a ${value}: ${start} → ${target}. A snake! Down to ${jump}.`, up ? "good" : "bad");
    up ? sfx.ladder() : sfx.snake();
    const from = p.pos;
    p.pos = jump;
    await view.jump(idx, from, jump, up ? "ladder" : "snake");
    if (stale()) return;
  }
  renderPlayers();
  if (p.pos === 100) return win(p, idx);
  await sleep(200);
  if (stale()) return;
  endTurn(value === 6 && settings.bonus === "on");
}

function endTurn(again) {
  busy = false;
  if (!again) turn = (turn + 1) % players.length;
  beginTurn();
  if (again) setStatus(`${players[turn].name === "You" ? "You" : players[turn].name} rolled a 6, so roll again!`, "good");
}

function win(p, idx) {
  over = true;
  busy = false;
  rollBtn.disabled = true;
  view.setDiceEnabled(false);
  view.setTurn(-1);
  view.celebrate(idx);
  renderPlayers();
  sfx.win();
  const you = settings.mode === "cpu";
  $("endTitle").textContent = you ? (p.cpu ? "The computer wins" : "You win!") : `${p.name} wins!`;
  $("endText").textContent = you && p.cpu ? "Better luck next time. Every game is a fresh roll." : "First to square 100. Well played!";
  setStatus(`${p.name} reached 100!`, "good");
  const e = epoch;
  setTimeout(() => e === epoch && $("end").classList.add("show"), 1300 / SPEED);
}

// ---------- start-up: 3D board when WebGL works, flat board otherwise ----------
function hasWebGL() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch (err) {
    return false;
  }
}
async function mountView() {
  const stage = $("stage");
  if (hasWebGL()) {
    try {
      const { createView3D } = await import("./scene3d.js");
      $("dieBox").hidden = true;
      stage.innerHTML = "";
      view = createView3D(stage, { LADDERS, SNAKES, onDiceClick: () => roll() });
      $("resetView").hidden = false;
      document.body.classList.add("mode3d");
      return;
    } catch (err) {
      console.warn("3D board unavailable, using the flat board", err);
      stage.innerHTML = "";
    }
  }
  view = createView2D(stage);
}

// ---------- controls ----------
function syncChips() {
  document.querySelectorAll("#mode .g-chip").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.value === settings.mode)));
  document.querySelectorAll("#bonus .g-chip").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.value === settings.bonus)));
}
document.querySelectorAll("#mode .g-chip, #bonus .g-chip").forEach((b) =>
  b.addEventListener("click", () => {
    const group = b.parentElement.id;
    if (settings[group] === b.dataset.value) return;
    settings[group] = b.dataset.value;
    store.set(SETTINGS_KEY, settings);
    syncChips();
    newGame();
  })
);
rollBtn.addEventListener("click", roll);
$("newGame").addEventListener("click", newGame);
$("again").addEventListener("click", newGame);
$("endView").addEventListener("click", () => $("end").classList.remove("show"));
$("resetView").addEventListener("click", () => view && view.resetView());
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
document.addEventListener("keydown", (e) => {
  if ((e.key === " " || e.key === "Enter") && !(e.target instanceof HTMLButtonElement) && !rollBtn.disabled && !$("end").classList.contains("show")) {
    e.preventDefault();
    roll();
  }
});

syncChips();
syncMute();
mountView().then(() => {
  newGame();
  window.__sl = { get players() { return players; }, roll, newGame, JUMPS, get busy() { return busy; }, get over() { return over; }, get turn() { return turn; }, get view() { return view; } };
});
