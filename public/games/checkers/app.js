// ---------- rules (English / American checkers) ----------
// board: 64 cells, index = row * 8 + col. null | "r" | "R" | "w" | "W" (capital = king)
// red starts at the bottom and moves up; white starts at the top and moves down
const isDark = (r, c) => (r + c) % 2 === 1;
const rc = (i) => [Math.floor(i / 8), i % 8];
const side = (p) => (p ? p.toLowerCase() : null);
const isKing = (p) => p === "R" || p === "W";

function initialBoard() {
  const b = Array(64).fill(null);
  for (let r = 0; r < 8; r += 1) {
    for (let c = 0; c < 8; c += 1) {
      if (!isDark(r, c)) continue;
      if (r < 3) b[r * 8 + c] = "w";
      else if (r > 4) b[r * 8 + c] = "r";
    }
  }
  return b;
}

const dirsFor = (p) => {
  if (isKing(p)) return [[-1, -1], [-1, 1], [1, -1], [1, 1]];
  return side(p) === "r" ? [[-1, -1], [-1, 1]] : [[1, -1], [1, 1]];
};
const kingRow = (s) => (s === "r" ? 0 : 7);
const inside = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8;

function jumpsFrom(b, origin, piece, cur, caps, path, out) {
  const s = side(piece);
  const [r, c] = rc(cur);
  let any = false;
  for (const [dr, dc] of dirsFor(piece)) {
    const mr = r + dr;
    const mc = c + dc;
    const lr = r + 2 * dr;
    const lc = c + 2 * dc;
    if (!inside(lr, lc)) continue;
    const mid = mr * 8 + mc;
    const land = lr * 8 + lc;
    const target = b[mid];
    if (!target || side(target) === s || caps.includes(mid)) continue;
    if (b[land] && land !== origin) continue;
    any = true;
    const promote = !isKing(piece) && lr === kingRow(s);
    const nextCaps = [...caps, mid];
    const nextPath = [...path, land];
    if (promote) out.push({ from: origin, to: land, path: nextPath, caps: nextCaps, promote: true });
    else jumpsFrom(b, origin, piece, land, nextCaps, nextPath, out);
  }
  if (!any && caps.length) out.push({ from: origin, to: cur, path, caps, promote: false });
}

function legalMoves(b, s) {
  const jumps = [];
  const steps = [];
  for (let i = 0; i < 64; i += 1) {
    const p = b[i];
    if (!p || side(p) !== s) continue;
    // jumps treat the origin square as empty so a king can loop back over it
    jumpsFrom(b, i, p, i, [], [], jumps);
    const [r, c] = rc(i);
    for (const [dr, dc] of dirsFor(p)) {
      const nr = r + dr;
      const nc = c + dc;
      if (inside(nr, nc) && !b[nr * 8 + nc]) steps.push({ from: i, to: nr * 8 + nc, path: [nr * 8 + nc], caps: [], promote: !isKing(p) && nr === kingRow(s) });
    }
  }
  return jumps.length ? jumps : steps;
}

function applyMove(b, mv) {
  const nb = b.slice();
  const p = nb[mv.from];
  nb[mv.from] = null;
  mv.caps.forEach((i) => (nb[i] = null));
  nb[mv.to] = mv.promote ? p.toUpperCase() : p;
  return nb;
}

// ---------- computer player ----------
function evaluate(b, s) {
  let v = 0;
  for (let i = 0; i < 64; i += 1) {
    const p = b[i];
    if (!p) continue;
    const [r, c] = rc(i);
    const own = side(p);
    let val = isKing(p) ? 165 : 100;
    if (!isKing(p)) val += (own === "w" ? r : 7 - r) * 3;
    else val += 4 - Math.abs(3.5 - r) - Math.abs(3.5 - c) * 0.5;
    if (c >= 2 && c <= 5 && r >= 2 && r <= 5) val += 3;
    if (!isKing(p) && r === (own === "w" ? 0 : 7)) val += 6;
    v += own === s ? val : -val;
  }
  return v;
}

let deadline = 0;
function search(b, s, depth, alpha, beta, ply) {
  if (Date.now() > deadline) throw new Error("time");
  const moves = legalMoves(b, s);
  if (!moves.length) return -100000 + ply;
  if (depth <= 0 && !moves[0].caps.length) return evaluate(b, s);
  if (ply > 24) return evaluate(b, s);
  let best = -Infinity;
  for (const mv of moves) {
    const score = -search(applyMove(b, mv), s === "r" ? "w" : "r", depth - 1, -beta, -alpha, ply + 1);
    if (score > best) best = score;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
  }
  return best;
}

function chooseMove(b, s, level) {
  const moves = legalMoves(b, s);
  if (moves.length <= 1) return moves[0] || null;
  const cfg = { easy: { depth: 2, ms: 300, noise: 60 }, normal: { depth: 5, ms: 500, noise: 6 }, hard: { depth: 10, ms: 1400, noise: 0 } }[level];
  let result = null;
  let scored = moves.map((mv) => ({ mv, score: 0 }));
  deadline = Date.now() + cfg.ms;
  for (let d = 1; d <= cfg.depth; d += 1) {
    try {
      const cur = moves.map((mv) => ({ mv, score: -search(applyMove(b, mv), s === "r" ? "w" : "r", d - 1, -Infinity, Infinity, 1) + Math.random() * cfg.noise }));
      cur.sort((a, c) => c.score - a.score);
      scored = cur;
      result = cur[0].mv;
    } catch (err) {
      break;
    }
  }
  return result || scored[0].mv;
}

// ---------- UI state ----------
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
const SETTINGS_KEY = "zone210_checkers_settings";
const settings = { mode: "cpu", level: "normal", muted: false, ...store.get(SETTINGS_KEY, {}) };
if (!["cpu", "two"].includes(settings.mode)) settings.mode = "cpu";
if (!["easy", "normal", "hard"].includes(settings.level)) settings.level = "normal";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let board = [];
let ids = []; // parallel to board: piece ids for animation
let turn = "r";
let history = [];
let selected = -1;
let last = null;
let hintMove = null;
let over = false;
let busy = false;
let halfMoves = 0;
let nextId = 1;
const els = new Map();

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
  move: () => tone(300, 0, 0.07, "triangle", 0.09),
  capture: () => {
    tone(220, 0, 0.09, "square", 0.06);
    tone(330, 0.07, 0.1, "triangle", 0.09);
  },
  king: () => [523, 659, 784].forEach((f, i) => tone(f, i * 0.08, 0.16, "triangle", 0.09)),
  win: () => [523, 659, 784, 1046, 784, 1046].forEach((f, i) => tone(f, i * 0.1, 0.24, "triangle", 0.1)),
  lose: () => [330, 262, 196].forEach((f, i) => tone(f, i * 0.16, 0.3, "sawtooth", 0.06)),
};

const boardEl = $("board");
const squaresEl = $("squares");
const piecesEl = $("pieces");
const statusEl = $("status");
const setStatus = (t, kind = "") => {
  statusEl.textContent = t;
  statusEl.className = "g-status" + (kind ? ` ${kind}` : "");
};

const humanTurn = () => settings.mode === "two" || turn === "r";
const sqName = (i) => "abcdefgh"[i % 8] + (8 - Math.floor(i / 8));

function buildSquares() {
  squaresEl.innerHTML = "";
  for (let i = 0; i < 64; i += 1) {
    const [r, c] = rc(i);
    const b = document.createElement("button");
    b.type = "button";
    b.className = "sq" + (isDark(r, c) ? " d" : "");
    b.dataset.i = i;
    b.tabIndex = isDark(r, c) ? 0 : -1;
    b.setAttribute("role", "gridcell");
    if (!isDark(r, c)) b.disabled = true;
    b.addEventListener("click", () => onSquare(i));
    squaresEl.appendChild(b);
  }
}

function movesByFrom() {
  const map = new Map();
  legalMoves(board, turn).forEach((mv) => {
    if (!map.has(mv.from)) map.set(mv.from, []);
    map.get(mv.from).push(mv);
  });
  return map;
}

function render() {
  const byFrom = over || busy || !humanTurn() ? new Map() : movesByFrom();
  const targets = selected >= 0 && byFrom.has(selected) ? byFrom.get(selected).map((m) => m.to) : [];
  [...squaresEl.children].forEach((sq, i) => {
    const [r, c] = rc(i);
    if (!isDark(r, c)) return;
    let cls = "sq d";
    if (last && (i === last.from || i === last.to)) cls += " last";
    if (i === selected) cls += " sel";
    if (hintMove && (i === hintMove.from || i === hintMove.to)) cls += " hint";
    if (targets.includes(i)) cls += " tgt";
    if (byFrom.has(i)) cls += " movable";
    sq.className = cls;
    const p = board[i];
    sq.setAttribute("aria-label", `${sqName(i)}${p ? `, ${side(p) === "r" ? "red" : "white"} ${isKing(p) ? "king" : "piece"}` : ""}`);
  });
  // pieces
  const present = new Set();
  board.forEach((p, i) => {
    if (!p) return;
    const id = ids[i];
    present.add(id);
    let el = els.get(id);
    if (!el) {
      el = document.createElement("div");
      el.innerHTML = '<div class="disc"></div>';
      piecesEl.appendChild(el);
      els.set(id, el);
    }
    const [r, c] = rc(i);
    el.className = `pc ${side(p)}${isKing(p) ? " king" : ""}${i === selected ? " pick" : ""}`;
    el.style.left = `${c * 12.5}%`;
    el.style.top = `${r * 12.5}%`;
  });
  els.forEach((el, id) => {
    if (!present.has(id)) {
      el.classList.add("gone");
      els.delete(id);
      setTimeout(() => el.remove(), 350);
    }
  });
  // player bars
  const count = (s) => board.filter((p) => p && side(p) === s).length;
  const lostW = 12 - count("w");
  const lostR = 12 - count("r");
  const bar = (el, who, taken, takenColor, name) => {
    el.className = "pbar" + (turn === who && !over ? " turn" : "");
    el.style.setProperty("--c", who === "r" ? "#e5484d" : "#f4efe4");
    el.innerHTML = `<span class="who"><span class="dot"></span>${name}<small>${count(who)} left</small></span><span class="taken" style="--c:${takenColor}">${"<i></i>".repeat(taken)}</span>`;
  };
  const cpu = settings.mode === "cpu";
  bar($("topBar"), "w", lostR, "#e5484d", cpu ? "Computer" : "White");
  bar($("bottomBar"), "r", lostW, "#f4efe4", cpu ? "You" : "Red");
}

function newGame() {
  board = initialBoard();
  ids = board.map((p) => (p ? nextId++ : null));
  els.forEach((el) => el.remove());
  els.clear();
  piecesEl.innerHTML = "";
  turn = "r";
  history = [];
  selected = -1;
  last = null;
  hintMove = null;
  over = false;
  busy = false;
  halfMoves = 0;
  $("end").classList.remove("show");
  render();
  announce();
}

function announce() {
  if (over) return;
  const mustJump = legalMoves(board, turn).some((m) => m.caps.length);
  const who = settings.mode === "cpu" ? (turn === "r" ? "Your" : "Computer's") : turn === "r" ? "Red's" : "White's";
  if (!humanTurn()) setStatus("The computer is thinking…");
  else setStatus(`${who} move${mustJump ? ". You must capture!" : "."}`, mustJump ? "bad" : "");
}

function onSquare(i) {
  if (over || busy || !humanTurn()) return;
  hintMove = null;
  const byFrom = movesByFrom();
  if (selected >= 0 && byFrom.has(selected)) {
    const mv = byFrom.get(selected).find((m) => m.to === i);
    if (mv) return play(mv);
  }
  if (byFrom.has(i)) {
    selected = i;
    render();
  } else {
    selected = -1;
    render();
    const own = board[i] && side(board[i]) === turn;
    if (own) setStatus(legalMoves(board, turn).some((m) => m.caps.length) ? "You must capture with another piece." : "That piece can't move.", "bad");
  }
}

async function play(mv) {
  busy = true;
  hintMove = null;
  history.push({ board: board.slice(), ids: ids.slice(), turn, last, halfMoves });
  const id = ids[mv.from];
  const el = els.get(id);
  // animate along the jump path, removing captured pieces as they are hopped
  selected = -1;
  const mover = board[mv.from];
  let capIdx = 0;
  if (mv.caps.length) {
    for (let s = 0; s < mv.path.length; s += 1) {
      const [r, c] = rc(mv.path[s]);
      el.style.left = `${c * 12.5}%`;
      el.style.top = `${r * 12.5}%`;
      const capSq = mv.caps[capIdx];
      capIdx += 1;
      sfx.capture();
      await sleep(150);
      const capEl = els.get(ids[capSq]);
      if (capEl) capEl.classList.add("gone");
      await sleep(170);
    }
  } else {
    sfx.move();
  }
  const nb = applyMove(board, mv);
  const nids = ids.slice();
  nids[mv.to] = ids[mv.from];
  if (mv.to !== mv.from) nids[mv.from] = null;
  mv.caps.forEach((i) => (nids[i] = null));
  board = nb;
  ids = nids;
  halfMoves = mv.caps.length || !isKing(mover) ? 0 : halfMoves + 1;
  last = { from: mv.from, to: mv.to };
  if (mv.promote) sfx.king();
  turn = turn === "r" ? "w" : "r";
  busy = false;
  render();
  if (checkEnd()) return;
  announce();
  if (!humanTurn()) cpuMove();
}

function checkEnd() {
  const moves = legalMoves(board, turn);
  let title = "";
  let text = "";
  let emoji = "🏆";
  if (!moves.length) {
    const winner = turn === "r" ? "w" : "r";
    const cpu = settings.mode === "cpu";
    title = cpu ? (winner === "r" ? "You win!" : "The computer wins") : `${winner === "r" ? "Red" : "White"} wins!`;
    text = `${turn === "r" ? "Red" : "White"} has no moves left.`;
    if (cpu && winner === "w") emoji = "🤖";
    cpu && winner === "w" ? sfx.lose() : sfx.win();
  } else if (halfMoves >= 80) {
    title = "It's a draw";
    text = "Forty moves each without a capture or a new king.";
    emoji = "🤝";
  } else return false;
  over = true;
  render();
  setStatus(title, "good");
  $("endEmoji").textContent = emoji;
  $("endTitle").textContent = title;
  $("endText").textContent = text;
  setTimeout(() => $("end").classList.add("show"), 650);
  return true;
}

function cpuMove() {
  busy = true;
  render();
  setTimeout(() => {
    const mv = chooseMove(board, turn, settings.level);
    busy = false;
    if (mv) play(mv);
  }, 450);
}

function undo() {
  if (busy || !history.length) return;
  const steps = settings.mode === "cpu" && history.length > 1 && turn === "r" ? 2 : settings.mode === "cpu" && turn === "w" ? 1 : 1;
  let prev = null;
  for (let k = 0; k < steps && history.length; k += 1) prev = history.pop();
  if (!prev) return;
  board = prev.board;
  ids = prev.ids;
  turn = prev.turn;
  last = prev.last;
  halfMoves = prev.halfMoves;
  selected = -1;
  hintMove = null;
  over = false;
  $("end").classList.remove("show");
  // pieces that came back need fresh elements
  render();
  announce();
}

function showHint() {
  if (over || busy || !humanTurn()) return;
  const mv = chooseMove(board, turn, "normal");
  if (!mv) return;
  hintMove = mv;
  selected = -1;
  render();
  setStatus(`Hint: try ${sqName(mv.from)} to ${sqName(mv.to)}.`);
}

// ---------- controls ----------
function syncChips() {
  document.querySelectorAll("#mode .g-chip").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.value === settings.mode)));
  document.querySelectorAll("#level .g-chip").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.value === settings.level)));
  $("levelRow").hidden = settings.mode !== "cpu";
}
document.querySelectorAll("#mode .g-chip, #level .g-chip").forEach((b) =>
  b.addEventListener("click", () => {
    const group = b.parentElement.id;
    if (settings[group] === b.dataset.value) return;
    settings[group] = b.dataset.value;
    store.set(SETTINGS_KEY, settings);
    syncChips();
    newGame();
  })
);
$("newGame").addEventListener("click", newGame);
$("again").addEventListener("click", newGame);
$("endView").addEventListener("click", () => $("end").classList.remove("show"));
$("undo").addEventListener("click", undo);
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

buildSquares();
syncChips();
syncMute();
newGame();
window.__ck = {
  legalMoves, applyMove, chooseMove, initialBoard,
  get board() { return board; }, get turn() { return turn; }, get over() { return over; }, get busy() { return busy; },
  setBoard: (b, t = "r") => { board = b; ids = b.map((p) => (p ? nextId++ : null)); els.forEach((e) => e.remove()); els.clear(); piecesEl.innerHTML = ""; turn = t; over = false; busy = false; history = []; render(); announce(); },
  onSquare, play,
};
