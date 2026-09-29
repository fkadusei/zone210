// ---------- pieces and rotation (Super Rotation System) ----------
const COLS = 10;
const ROWS = 22; // the top two rows are hidden
const HIDDEN = 2;
const PIECES = {
  I: { m: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]], c: "#22d3ee" },
  O: { m: [[1, 1], [1, 1]], c: "#fbbf24" },
  T: { m: [[0, 1, 0], [1, 1, 1], [0, 0, 0]], c: "#a855f7" },
  S: { m: [[0, 1, 1], [1, 1, 0], [0, 0, 0]], c: "#34d399" },
  Z: { m: [[1, 1, 0], [0, 1, 1], [0, 0, 0]], c: "#f43f5e" },
  J: { m: [[1, 0, 0], [1, 1, 1], [0, 0, 0]], c: "#3b82f6" },
  L: { m: [[0, 0, 1], [1, 1, 1], [0, 0, 0]], c: "#fb923c" },
};
const TYPES = Object.keys(PIECES);

const rotateCW = (m) => m.map((_, r) => m.map((__, c) => m[m.length - 1 - c][r]));
const ROT = {};
TYPES.forEach((t) => {
  ROT[t] = [PIECES[t].m];
  for (let i = 1; i < 4; i += 1) ROT[t].push(rotateCW(ROT[t][i - 1]));
});

// wall kicks as [x, y] with y pointing up, keyed "from>to"
const KICKS_JLSTZ = {
  "0>1": [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  "1>0": [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  "1>2": [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  "2>1": [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  "2>3": [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
  "3>2": [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  "3>0": [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  "0>3": [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
};
const KICKS_I = {
  "0>1": [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
  "1>0": [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
  "1>2": [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
  "2>1": [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
  "2>3": [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
  "3>2": [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
  "3>0": [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
  "0>3": [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
};

// ---------- settings and storage ----------
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
const SETTINGS_KEY = "zone210_tetris_settings";
const BEST_KEY = "zone210_tetris_best";
const settings = { mode: "marathon", level: 1, muted: false, ...store.get(SETTINGS_KEY, {}) };
if (!["marathon", "sprint", "blitz"].includes(settings.mode)) settings.mode = "marathon";
if (![1, 4, 8, 12].includes(settings.level)) settings.level = 1;

const SPRINT_LINES = 40;
const BLITZ_MS = 120000;
const LOCK_DELAY = 500;
const MAX_LOCK_RESETS = 15;
const DAS = 150;
const ARR = 45;
const CLEAR_MS = 320;
const LINE_POINTS = [0, 100, 300, 500, 800];

// ---------- sound ----------
let audio = null;
function tone(freq, start, length, type = "sine", gain = 0.09) {
  if (settings.muted) return;
  try {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === "suspended") audio.resume();
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
  move: () => tone(330, 0, 0.03, "square", 0.025),
  rotate: () => tone(520, 0, 0.05, "triangle", 0.07),
  hold: () => tone(420, 0, 0.09, "triangle", 0.07),
  lock: () => tone(140, 0, 0.09, "sine", 0.12),
  drop: () => {
    tone(110, 0, 0.12, "sine", 0.16);
    tone(70, 0.02, 0.16, "sine", 0.12);
  },
  clear: (n) => [523, 659, 784, 1046].slice(0, Math.max(2, n)).forEach((f, i) => tone(f, i * 0.07, 0.18, "triangle", 0.09)),
  tetris: () => [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, i * 0.065, 0.28, "triangle", 0.1)),
  over: () => [330, 262, 196, 130].forEach((f, i) => tone(f, i * 0.16, 0.3, "sawtooth", 0.07)),
  win: () => [523, 659, 784, 1046, 784, 1046, 1318].forEach((f, i) => tone(f, i * 0.1, 0.28, "triangle", 0.09)),
  levelUp: () => [659, 784, 988, 1318].forEach((f, i) => tone(f, i * 0.08, 0.2, "square", 0.05)),
};

// ---------- game state ----------
let board = [];
let piece = null;
let holdType = null;
let canHold = true;
let queue = [];
let bag = [];
let state = "ready"; // ready | playing | clearing | paused | over
let score = 0;
let lines = 0;
let level = 1;
let combo = -1;
let backToBack = false;
let elapsed = 0; // ms of play
let gravityAcc = 0;
let lockTimer = 0;
let lockResets = 0;
let lowestY = 0;
let softDrop = false;
let clearing = null; // { rows, t }
let particles = [];
let flashes = [];
let shake = 0;
let pausedFrom = "playing";
let last = 0;

const boardEl = $("board");
const bctx = boardEl.getContext("2d");
const hctx = $("hold").getContext("2d");
const nctx = $("next").getContext("2d");

function nextFromBag() {
  if (!bag.length) {
    bag = [...TYPES];
    for (let i = bag.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [bag[i], bag[j]] = [bag[j], bag[i]];
    }
  }
  return bag.pop();
}
function fillQueue() {
  while (queue.length < 6) queue.push(nextFromBag());
}

const cellsOf = (p, rot = p.rot, x = p.x, y = p.y) => {
  const m = ROT[p.type][rot];
  const out = [];
  m.forEach((row, r) => row.forEach((v, c) => v && out.push([x + c, y + r])));
  return out;
};
const collides = (p, rot = p.rot, x = p.x, y = p.y) =>
  cellsOf(p, rot, x, y).some(([cx, cy]) => cx < 0 || cx >= COLS || cy >= ROWS || (cy >= 0 && board[cy][cx]));

function spawn(type) {
  piece = { type, rot: 0, x: ROT[type][0].length === 2 ? 4 : 3, y: 1 };
  lockTimer = 0;
  lockResets = 0;
  lowestY = piece.y;
  gravityAcc = 0;
  canHold = true;
  if (collides(piece)) return gameOver("Blocked out");
  // drop one row right away if there is room, like the guideline
  if (!collides(piece, piece.rot, piece.x, piece.y + 1)) piece.y += 1;
  lowestY = piece.y;
}
function spawnNext() {
  const type = queue.shift();
  fillQueue();
  spawn(type);
}

const gravityMs = () => Math.max(2, Math.pow(0.8 - (level - 1) * 0.007, level - 1) * 1000);
const grounded = () => collides(piece, piece.rot, piece.x, piece.y + 1);

function touchLockReset() {
  if (grounded() && lockResets < MAX_LOCK_RESETS) {
    lockTimer = 0;
    lockResets += 1;
  }
}

function move(dx) {
  if (state !== "playing" || !piece) return false;
  if (collides(piece, piece.rot, piece.x + dx, piece.y)) return false;
  piece.x += dx;
  touchLockReset();
  sfx.move();
  return true;
}

function rotate(dir) {
  if (state !== "playing" || !piece || piece.type === "O") return false;
  const from = piece.rot;
  const to = (from + dir + 4) % 4;
  const table = piece.type === "I" ? KICKS_I : KICKS_JLSTZ;
  for (const [kx, ky] of table[`${from}>${to}`]) {
    if (!collides(piece, to, piece.x + kx, piece.y - ky)) {
      piece.rot = to;
      piece.x += kx;
      piece.y -= ky;
      touchLockReset();
      if (piece.y > lowestY) {
        lowestY = piece.y;
        lockResets = 0;
      }
      sfx.rotate();
      return true;
    }
  }
  return false;
}

function hold() {
  if (state !== "playing" || !canHold) return;
  const current = piece.type;
  if (holdType) {
    const swap = holdType;
    holdType = current;
    spawn(swap);
  } else {
    holdType = current;
    spawnNext();
  }
  canHold = false;
  sfx.hold();
}

function hardDrop() {
  if (state !== "playing" || !piece) return;
  let dist = 0;
  while (!collides(piece, piece.rot, piece.x, piece.y + 1)) {
    piece.y += 1;
    dist += 1;
  }
  score += dist * 2;
  shake = 1;
  sfx.drop();
  lockPiece();
}

function lockPiece() {
  const cells = cellsOf(piece);
  const color = PIECES[piece.type].c;
  cells.forEach(([x, y]) => {
    if (y >= 0) board[y][x] = piece.type;
    flashes.push({ x, y, t: 1 });
  });
  const lockedOut = cells.every(([, y]) => y < HIDDEN);
  piece = null;
  if (lockedOut) return gameOver("Locked out");
  const full = [];
  for (let r = 0; r < ROWS; r += 1) if (board[r].every(Boolean)) full.push(r);
  if (!full.length) {
    combo = -1;
    sfx.lock();
    spawnNext();
    renderPanels();
    return;
  }
  // scoring
  const n = full.length;
  combo += 1;
  let pts = LINE_POINTS[n] * level;
  const tetris = n === 4;
  if (tetris && backToBack) pts = Math.floor(pts * 1.5);
  backToBack = tetris;
  if (combo > 0) pts += 50 * combo * level;
  const willBeEmpty = board.every((row, r) => full.includes(r) || row.every((v) => !v));
  if (willBeEmpty) pts += 1000 * level;
  score += pts;
  lines += n;
  const label = ["", "Single", "Double", "Triple", "TETRIS!"][n];
  toast([label, combo > 0 ? `${combo + 1} combo` : "", willBeEmpty ? "Perfect clear!" : ""].filter(Boolean).join("\n"));
  full.forEach((r) => board[r].forEach((type, c) => type && spawnParticles(c, r, PIECES[type].c)));
  clearing = { rows: full, t: 0 };
  state = "clearing";
  tetris ? sfx.tetris() : sfx.clear(n + 1);
  const newLevel = settings.level + Math.floor(lines / 10);
  if (newLevel > level) {
    level = newLevel;
    setTimeout(sfx.levelUp, 300);
  }
  renderPanels();
}

function finishClear() {
  const rows = clearing.rows;
  board = board.filter((_, r) => !rows.includes(r));
  while (board.length < ROWS) board.unshift(Array(COLS).fill(null));
  clearing = null;
  if (settings.mode === "sprint" && lines >= SPRINT_LINES) return gameOver("Finished", true);
  state = "playing";
  spawnNext();
}

function spawnParticles(cx, cy, color) {
  for (let i = 0; i < 3; i += 1) {
    particles.push({ x: cx + 0.5, y: cy + 0.5, vx: (Math.random() - 0.5) * 9, vy: -Math.random() * 7 - 1, life: 1, color, s: 0.14 + Math.random() * 0.14 });
  }
}

function toast(text) {
  const el = $("toast");
  el.innerHTML = text.split("\n").map((t) => `<div>${t}</div>`).join("");
  el.classList.remove("show");
  void el.offsetWidth;
  el.classList.add("show");
}

// ---------- game flow ----------
function bestKeyFor(mode = settings.mode) {
  return mode;
}
function newGame() {
  kick();
  board = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  piece = null;
  holdType = null;
  queue = [];
  bag = [];
  fillQueue();
  score = 0;
  lines = 0;
  level = settings.level;
  combo = -1;
  backToBack = false;
  elapsed = 0;
  clearing = null;
  particles = [];
  flashes = [];
  softDrop = false;
  hDir = 0;
  state = "ready";
  $("end").classList.remove("show");
  $("toast").classList.remove("show");
  showVeil("Ready?", modeBlurb(), "Play");
  renderPanels();
}
function modeBlurb() {
  return { marathon: "Play until you top out. Clear lines to level up.", sprint: "Clear 40 lines as fast as you can.", blitz: "Score as much as you can in two minutes." }[settings.mode];
}
function start() {
  kick();
  if (state === "paused") return resume();
  if (state !== "ready") return;
  hideVeil();
  state = "playing";
  spawnNext();
  renderPanels();
}
function pause() {
  if (state !== "playing" && state !== "clearing") return;
  pausedFrom = state;
  state = "paused";
  showVeil("Paused", "Take a breather.", "Resume");
  $("pause").textContent = "Resume";
}
function resume() {
  kick();
  if (state !== "paused") return;
  state = pausedFrom;
  hideVeil();
  last = performance.now();
  $("pause").textContent = "Pause";
}
function showVeil(title, text, btn) {
  $("veilTitle").textContent = title;
  $("veilText").textContent = text;
  $("veilBtn").textContent = btn;
  $("veil").hidden = false;
}
function hideVeil() {
  $("veil").hidden = true;
}

function gameOver(reason, won = false) {
  state = "over";
  piece = null;
  const bests = store.get(BEST_KEY, {});
  const mode = settings.mode;
  let record = false;
  if (mode === "sprint") {
    if (won && (!bests.sprint || elapsed < bests.sprint)) {
      bests.sprint = Math.round(elapsed);
      record = true;
    }
  } else if (score > (bests[mode] || 0)) {
    bests[mode] = score;
    record = true;
  }
  if (record) store.set(BEST_KEY, bests);
  won || mode === "blitz" ? sfx.win() : sfx.over();
  const t = fmtTime(elapsed);
  const lead = mode === "sprint" ? (won ? `${t} for 40 lines` : `${lines} lines cleared`) : `${score.toLocaleString()} points`;
  $("endEmoji").textContent = won ? "🏁" : mode === "blitz" ? "⏱️" : "🧱";
  $("endTitle").textContent = mode === "blitz" ? "Time's up!" : won ? "Finished!" : "Game over";
  $("endText").textContent = `${lead} · ${lines} lines · level ${level}${record ? " · New best!" : ""}`;
  renderPanels();
  setTimeout(() => $("end").classList.add("show"), 450);
}

const fmtTime = (ms) => {
  const s = ms / 1000;
  return `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, "0")}`;
};

// ---------- input ----------
let hDir = 0;
let hTimer = 0;
let hNext = DAS;
const down = { left: false, right: false };

function pressDir(dir) {
  down[dir < 0 ? "left" : "right"] = true;
  hDir = dir;
  hTimer = 0;
  hNext = DAS;
  move(dir);
}
function releaseDir(dir) {
  down[dir < 0 ? "left" : "right"] = false;
  if (hDir === dir) {
    hDir = down.left ? -1 : down.right ? 1 : 0;
    hTimer = 0;
    hNext = DAS;
  }
}

const KEYMAP = {
  ArrowLeft: "left", ArrowRight: "right", ArrowDown: "down", ArrowUp: "rotate", " ": "drop",
  x: "rotate", X: "rotate", z: "ccw", Z: "ccw", c: "hold", C: "hold", Shift: "hold", p: "pause", P: "pause", Escape: "pause",
};
function act(name, on = true) {
  kick();
  if (state === "ready" || state === "over") {
    if (on && (name === "drop" || name === "rotate") && state === "ready" && !$("end").classList.contains("show")) start();
    return;
  }
  if (name === "pause") return on && (state === "paused" ? resume() : pause());
  if (state === "paused") return;
  switch (name) {
    case "left": return on ? pressDir(-1) : releaseDir(-1);
    case "right": return on ? pressDir(1) : releaseDir(1);
    case "down": softDrop = on; break;
    case "rotate": if (on) rotate(1); break;
    case "ccw": if (on) rotate(-1); break;
    case "hold": if (on) hold(); break;
    case "drop": if (on) hardDrop(); break;
    default:
  }
}
document.addEventListener("keydown", (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const name = KEYMAP[e.key];
  if (!name) return;
  if (e.target instanceof HTMLButtonElement && (e.key === " " || e.key === "Enter")) return;
  e.preventDefault();
  if (e.repeat && name !== "down") return;
  act(name, true);
});
document.addEventListener("keyup", (e) => {
  const name = KEYMAP[e.key];
  if (name === "left" || name === "right" || name === "down") act(name, false);
});

document.querySelectorAll("#pad button").forEach((b) => {
  const name = b.dataset.act;
  b.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    b.classList.add("down");
    b.setPointerCapture?.(e.pointerId);
    act(name, true);
  });
  const up = () => {
    b.classList.remove("down");
    if (name === "left" || name === "right" || name === "down") act(name, false);
  };
  b.addEventListener("pointerup", up);
  b.addEventListener("pointercancel", up);
  b.addEventListener("lostpointercapture", up);
});

// swipe / tap on the board (touch): tap rotates, swipe sideways moves, swipe down drops
let touch = null;
boardEl.addEventListener("pointerdown", (e) => {
  if (e.pointerType === "mouse") return;
  touch = { x: e.clientX, y: e.clientY, cx: e.clientX, moved: false, t: performance.now() };
  boardEl.setPointerCapture?.(e.pointerId);
});
boardEl.addEventListener("pointermove", (e) => {
  if (!touch) return;
  const cell = boardEl.clientWidth / COLS;
  const dx = e.clientX - touch.cx;
  if (Math.abs(dx) >= cell) {
    const steps = Math.trunc(dx / cell);
    for (let i = 0; i < Math.abs(steps); i += 1) move(Math.sign(steps));
    touch.cx += steps * cell;
    touch.moved = true;
  }
});
boardEl.addEventListener("pointerup", (e) => {
  if (!touch) return;
  const dy = e.clientY - touch.y;
  const dt = performance.now() - touch.t;
  if (dy > boardEl.clientWidth / 3 && Math.abs(e.clientX - touch.x) < 60) hardDrop();
  else if (!touch.moved && Math.abs(dy) < 12 && dt < 300) (state === "ready" ? start : () => act("rotate"))();
  touch = null;
});

// ---------- update ----------
function update(dt) {
  if (state === "playing") {
    elapsed += dt;
    if (settings.mode === "blitz" && elapsed >= BLITZ_MS) {
      elapsed = BLITZ_MS;
      return gameOver("Time");
    }
    // horizontal auto-repeat
    if (hDir) {
      hTimer += dt;
      while (hTimer >= hNext) {
        hTimer -= hNext;
        hNext = ARR;
        if (!move(hDir)) {
          hTimer = 0;
          break;
        }
      }
    }
    // gravity
    if (piece) {
      const interval = softDrop ? Math.max(16, gravityMs() / 20) : gravityMs();
      gravityAcc += dt;
      while (gravityAcc >= interval && piece) {
        if (!grounded()) {
          piece.y += 1;
          if (softDrop) score += 1;
          if (piece.y > lowestY) {
            lowestY = piece.y;
            lockResets = 0;
          }
          lockTimer = 0;
          gravityAcc -= interval;
        } else {
          gravityAcc = 0;
          break;
        }
      }
      if (piece && grounded()) {
        lockTimer += dt;
        if (lockTimer >= (softDrop ? LOCK_DELAY / 2 : LOCK_DELAY)) lockPiece();
      }
    }
  } else if (state === "clearing") {
    elapsed += dt;
    clearing.t += dt;
    if (clearing.t >= CLEAR_MS) finishClear();
  }
  // effects always animate
  particles.forEach((p) => {
    p.vy += 24 * (dt / 1000);
    p.x += p.vx * (dt / 1000);
    p.y += p.vy * (dt / 1000);
    p.life -= dt / 700;
  });
  particles = particles.filter((p) => p.life > 0);
  flashes.forEach((f) => (f.t -= dt / 220));
  flashes = flashes.filter((f) => f.t > 0);
  shake = Math.max(0, shake - dt / 140);
}

// ---------- drawing ----------
const isDark = () => document.documentElement.getAttribute("data-theme") === "dark";

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => Math.max(0, Math.min(255, Math.round(v + amt * (amt < 0 ? v : 255 - v))));
  return `rgb(${f(n >> 16)}, ${f((n >> 8) & 255)}, ${f(n & 255)})`;
}

function drawBlock(ctx, x, y, s, color, alpha = 1) {
  const pad = Math.max(1, s * 0.05);
  const w = s - pad * 2;
  ctx.save();
  ctx.globalAlpha = alpha;
  const r = s * 0.16;
  ctx.beginPath();
  ctx.roundRect(x + pad, y + pad, w, w, r);
  const g = ctx.createLinearGradient(x, y, x + s, y + s);
  g.addColorStop(0, shade(color, 0.28));
  g.addColorStop(0.5, color);
  g.addColorStop(1, shade(color, -0.3));
  ctx.fillStyle = g;
  ctx.fill();
  // inner bevel
  ctx.lineWidth = Math.max(1, s * 0.07);
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.beginPath();
  ctx.moveTo(x + pad + r, y + pad + s * 0.06);
  ctx.lineTo(x + pad + w - r, y + pad + s * 0.06);
  ctx.stroke();
  ctx.strokeStyle = "rgba(0,0,0,0.28)";
  ctx.beginPath();
  ctx.moveTo(x + pad + r, y + pad + w - s * 0.06);
  ctx.lineTo(x + pad + w - r, y + pad + w - s * 0.06);
  ctx.stroke();
  ctx.restore();
}

function ghostY() {
  let y = piece.y;
  while (!collides(piece, piece.rot, piece.x, y + 1)) y += 1;
  return y;
}

function sizeCanvas() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = Math.round(boardEl.clientWidth * dpr);
  if (w && boardEl.width !== w) {
    boardEl.width = w;
    boardEl.height = w * 2;
  }
}

function draw() {
  sizeCanvas();
  const W = boardEl.width;
  const s = W / COLS;
  const ctx = bctx;
  const dark = isDark();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, W, W * 2);
  // background
  const bg = ctx.createLinearGradient(0, 0, 0, W * 2);
  bg.addColorStop(0, dark ? "#0d1330" : "#f6f8ff");
  bg.addColorStop(1, dark ? "#141c40" : "#e6ebfb");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, W * 2);
  ctx.strokeStyle = dark ? "rgba(255,255,255,0.05)" : "rgba(22,26,43,0.07)";
  ctx.lineWidth = 1;
  for (let i = 1; i < COLS; i += 1) {
    ctx.beginPath();
    ctx.moveTo(i * s, 0);
    ctx.lineTo(i * s, W * 2);
    ctx.stroke();
  }
  for (let j = 1; j < 20; j += 1) {
    ctx.beginPath();
    ctx.moveTo(0, j * s);
    ctx.lineTo(W, j * s);
    ctx.stroke();
  }
  if (shake > 0) ctx.translate(0, Math.sin(shake * 30) * s * 0.18 * shake);

  const rowY = (r) => (r - HIDDEN) * s;
  // settled blocks
  for (let r = HIDDEN; r < ROWS; r += 1) {
    for (let c = 0; c < COLS; c += 1) {
      const t = board[r][c];
      if (t) drawBlock(ctx, c * s, rowY(r), s, PIECES[t].c);
    }
  }
  // ghost and active piece
  if (piece && (state === "playing" || state === "paused")) {
    const gy = ghostY();
    if (gy !== piece.y) {
      cellsOf(piece, piece.rot, piece.x, gy).forEach(([x, y]) => {
        if (y < HIDDEN) return;
        ctx.save();
        ctx.fillStyle = PIECES[piece.type].c + "26";
        ctx.strokeStyle = PIECES[piece.type].c + "aa";
        ctx.lineWidth = Math.max(1.5, s * 0.06);
        ctx.beginPath();
        ctx.roundRect(x * s + s * 0.08, rowY(y) + s * 0.08, s * 0.84, s * 0.84, s * 0.14);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      });
    }
    cellsOf(piece).forEach(([x, y]) => y >= HIDDEN && drawBlock(ctx, x * s, rowY(y), s, PIECES[piece.type].c));
  }
  // lock flashes
  flashes.forEach((f) => {
    if (f.y < HIDDEN) return;
    ctx.fillStyle = `rgba(255,255,255,${0.55 * f.t})`;
    ctx.fillRect(f.x * s, rowY(f.y), s, s);
  });
  // clearing rows flash
  if (clearing) {
    const k = clearing.t / CLEAR_MS;
    clearing.rows.forEach((r) => {
      ctx.fillStyle = `rgba(255,255,255,${0.85 * Math.abs(Math.cos(k * Math.PI * 3)) * (1 - k * 0.4)})`;
      ctx.fillRect(0, rowY(r), W, s);
    });
  }
  // particles
  particles.forEach((p) => {
    ctx.fillStyle = p.color;
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.fillRect(p.x * s, rowY(p.y), p.s * s, p.s * s);
  });
  ctx.globalAlpha = 1;
}

function drawMini(ctx, canvas, types, slotRows) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const cssW = canvas.clientWidth || 110;
  const w = Math.round(cssW * dpr);
  const h = Math.round((w * (slotRows * 3 + 0.5)) / 4.2);
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const cell = canvas.width / 4.2;
  types.forEach((t, i) => {
    if (!t) return;
    const m = ROT[t][0];
    const rows = m.map((row, r) => (row.some(Boolean) ? r : -1)).filter((r) => r >= 0);
    const cols = m[0].map((_, c) => (m.some((row) => row[c]) ? c : -1)).filter((c) => c >= 0);
    const w = cols.length * cell;
    const h = rows.length * cell;
    const ox = (canvas.width - w) / 2 - cols[0] * cell;
    const oy = i * cell * 3 + (cell * 3 - h) / 2 - rows[0] * cell + cell * 0.25;
    m.forEach((row, r) => row.forEach((v, c) => v && drawBlock(ctx, ox + c * cell, oy + r * cell, cell, PIECES[t].c)));
  });
}

function renderPanels() {
  $("score").textContent = score.toLocaleString();
  $("lines").textContent = settings.mode === "sprint" ? `${lines}/${SPRINT_LINES}` : lines;
  $("levelNow").textContent = level;
  const bests = store.get(BEST_KEY, {});
  const b = bests[settings.mode];
  $("best").textContent = b ? (settings.mode === "sprint" ? fmtTime(b) : b.toLocaleString()) : "-";
  $("bestLabel").textContent = settings.mode === "sprint" ? "Best time" : "Best score";
  $("linesLabel").textContent = "Lines";
}
function renderTime() {
  if (settings.mode === "blitz") {
    $("time").textContent = fmtTime(Math.max(0, BLITZ_MS - elapsed));
    $("timeLabel").textContent = "Left";
  } else {
    $("time").textContent = fmtTime(elapsed);
    $("timeLabel").textContent = "Time";
  }
}

let panelTick = 0;
let raf = 0;
// The loop only runs while something is moving. Ready, paused and game-over screens draw once and stop,
// which keeps the phone and laptop cool.
function kick() {
  if (raf) return;
  last = performance.now();
  raf = requestAnimationFrame(frame);
}
function frame(now) {
  raf = 0;
  const dt = Math.min(64, now - (last || now));
  last = now;
  if (state !== "paused") update(dt);
  draw();
  drawMini(hctx, $("hold"), [holdType], 1);
  drawMini(nctx, $("next"), queue.slice(0, 5), 5);
  panelTick += dt;
  if (panelTick > 100 || state !== "playing") {
    panelTick = 0;
    renderTime();
    renderPanels();
  }
  const active = state === "playing" || state === "clearing" || particles.length > 0 || flashes.length > 0 || shake > 0;
  if (active) raf = requestAnimationFrame(frame);
}

// ---------- controls ----------
function syncChips() {
  document.querySelectorAll("#mode .g-chip").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.value === settings.mode)));
  document.querySelectorAll("#level .g-chip").forEach((b) => b.setAttribute("aria-pressed", String(Number(b.dataset.value) === settings.level)));
}
document.querySelectorAll("#mode .g-chip").forEach((b) =>
  b.addEventListener("click", () => {
    if (settings.mode === b.dataset.value) return;
    settings.mode = b.dataset.value;
    store.set(SETTINGS_KEY, settings);
    syncChips();
    newGame();
  })
);
document.querySelectorAll("#level .g-chip").forEach((b) =>
  b.addEventListener("click", () => {
    const v = Number(b.dataset.value);
    if (settings.level === v) return;
    settings.level = v;
    store.set(SETTINGS_KEY, settings);
    syncChips();
    newGame();
  })
);
$("newGame").addEventListener("click", newGame);
$("again").addEventListener("click", newGame);
$("endView").addEventListener("click", () => $("end").classList.remove("show"));
$("veilBtn").addEventListener("click", () => (state === "paused" ? resume() : start()));
$("pause").addEventListener("click", () => act("pause"));
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
document.addEventListener("visibilitychange", () => {
  last = performance.now();
  kick();
  if (document.hidden) pause();
});

syncChips();
syncMute();
newGame();
kick();
window.addEventListener("resize", kick);
new MutationObserver(kick).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
window.__tetris = {
  get s() { return { state, score, lines, level, piece, board, queue, holdType, combo }; },
  act, newGame, start, tick: update, rotate, move, hardDrop, hold, collides, cellsOf, spawn, setBoard: (b) => (board = b), PIECES, ROT, COLS, ROWS, HIDDEN,
  setPiece: (type, x, y, rot = 0) => { piece = { type, rot, x, y }; },
};
