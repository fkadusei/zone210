// ---------- rules: Dame (Ghanaian draughts, 8x8) ----------
// board: 64 cells, index = row * 8 + col. null | "l" | "L" | "d" | "D" (capital = king)
// Light ("l") starts at the bottom and moves up; dark ("d") starts at the top and moves down.
// Men step one square diagonally forward and capture in ALL four directions.
// Kings fly: they slide any distance and, after jumping a piece, land on any empty square beyond it.
const isDark = (r, c) => (r + c) % 2 === 1;
const rc = (i) => [Math.floor(i / 8), i % 8];
const inside = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8;
const sideOf = (p) => (p ? p.toLowerCase() : null);
const isKing = (p) => p === "L" || p === "D";
const crownRow = (s) => (s === "l" ? 0 : 7);
const DIRS = [[-1, -1], [-1, 1], [1, -1], [1, 1]];

function initialBoard() {
  const b = Array(64).fill(null);
  for (let r = 0; r < 8; r += 1) {
    for (let c = 0; c < 8; c += 1) {
      if (!isDark(r, c)) continue;
      if (r < 3) b[r * 8 + c] = "d";
      else if (r > 4) b[r * 8 + c] = "l";
    }
  }
  return b;
}

// every jump available from `pos`: [{ mid, landings: [squares] }]
function captureOptions(b, pos, king, s, caps, origin) {
  const out = [];
  const [pr, pc] = rc(pos);
  const empty = (i) => b[i] === null || i === origin;
  for (const [dr, dc] of DIRS) {
    let r = pr + dr;
    let c = pc + dc;
    if (!king) {
      if (!inside(r + dr, c + dc)) continue;
      const mid = r * 8 + c;
      const land = (r + dr) * 8 + (c + dc);
      const target = b[mid];
      if (!target || sideOf(target) === s || caps.includes(mid)) continue;
      if (!empty(land)) continue;
      out.push({ mid, landings: [land] });
    } else {
      while (inside(r, c) && empty(r * 8 + c)) {
        r += dr;
        c += dc;
      }
      if (!inside(r, c)) continue;
      const mid = r * 8 + c;
      const target = b[mid];
      if (!target || sideOf(target) === s || caps.includes(mid)) continue;
      const landings = [];
      let r2 = r + dr;
      let c2 = c + dc;
      while (inside(r2, c2) && empty(r2 * 8 + c2)) {
        landings.push(r2 * 8 + c2);
        r2 += dr;
        c2 += dc;
      }
      if (landings.length) out.push({ mid, landings });
    }
  }
  return out;
}

// depth-first over jump chains. A started capture must be finished, and a king must land where it can keep jumping.
function collectJumps(b, origin, s, pos, king, wasKing, caps, path, out) {
  const opts = captureOptions(b, pos, king, s, caps, origin);
  for (const opt of opts) {
    const newCaps = [...caps, opt.mid];
    const info = opt.landings.map((l) => {
      const k = king || (!wasKing && rc(l)[0] === crownRow(s)); // a man reaching the far row is crowned and keeps jumping as a king
      return { l, k, cont: captureOptions(b, l, k, s, newCaps, origin).length > 0 };
    });
    const cont = info.filter((x) => x.cont);
    for (const x of cont.length ? cont : info) {
      if (x.cont) collectJumps(b, origin, s, x.l, x.k, wasKing, newCaps, [...path, x.l], out);
      else out.push({ from: origin, to: x.l, path: [...path, x.l], caps: newCaps, promote: !wasKing && x.k });
    }
  }
}

function captureMoves(b, s) {
  const out = [];
  for (let i = 0; i < 64; i += 1) {
    const p = b[i];
    if (!p || sideOf(p) !== s) continue;
    collectJumps(b, i, s, i, isKing(p), isKing(p), [], [], out);
  }
  return out;
}

function stepMoves(b, s) {
  const out = [];
  for (let i = 0; i < 64; i += 1) {
    const p = b[i];
    if (!p || sideOf(p) !== s) continue;
    const [r, c] = rc(i);
    if (isKing(p)) {
      for (const [dr, dc] of DIRS) {
        let nr = r + dr;
        let nc = c + dc;
        while (inside(nr, nc) && b[nr * 8 + nc] === null) {
          out.push({ from: i, to: nr * 8 + nc, path: [nr * 8 + nc], caps: [], promote: false });
          nr += dr;
          nc += dc;
        }
      }
    } else {
      const dr = s === "l" ? -1 : 1;
      for (const dc of [-1, 1]) {
        const nr = r + dr;
        const nc = c + dc;
        if (inside(nr, nc) && b[nr * 8 + nc] === null) out.push({ from: i, to: nr * 8 + nc, path: [nr * 8 + nc], caps: [], promote: nr === crownRow(s) });
      }
    }
  }
  return out;
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
    const own = sideOf(p);
    let val;
    if (isKing(p)) {
      val = 330 + (4 - Math.abs(3.5 - r)) * 2 + (4 - Math.abs(3.5 - c));
      if (r === c || r + c === 7) val += 6; // long diagonals
    } else {
      val = 100 + (own === "l" ? 7 - r : r) * 4;
      if (c >= 2 && c <= 5) val += 2;
      if (r === (own === "l" ? 7 : 0)) val += 6;
    }
    v += own === s ? val : -val;
  }
  return v;
}

let deadline = 0;
function search(b, s, depth, alpha, beta, ply) {
  if (Date.now() > deadline) throw new Error("time");
  const moves = captureMoves(b, s).concat(stepMoves(b, s)); // captures first for better pruning
  if (!moves.length) return -100000 + ply;
  if ((depth <= 0 && !moves[0].caps.length) || ply > 20) return evaluate(b, s);
  let best = -Infinity;
  for (const mv of moves) {
    const score = -search(applyMove(b, mv), s === "l" ? "d" : "l", depth - 1, -beta, -alpha, ply + 1);
    if (score > best) best = score;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
  }
  return best;
}

function chooseMove(b, s, level) {
  const moves = captureMoves(b, s).concat(stepMoves(b, s));
  if (moves.length <= 1) return moves[0] || null;
  const cfg = { easy: { depth: 2, ms: 250, noise: 70 }, normal: { depth: 4, ms: 600, noise: 8 }, hard: { depth: 8, ms: 1500, noise: 0 } }[level];
  let result = null;
  let ranked = moves.map((mv) => ({ mv, score: 0 }));
  deadline = Date.now() + cfg.ms;
  for (let d = 1; d <= cfg.depth; d += 1) {
    try {
      const cur = moves.map((mv) => ({ mv, score: -search(applyMove(b, mv), s === "l" ? "d" : "l", d - 1, -Infinity, Infinity, 1) + Math.random() * cfg.noise }));
      cur.sort((a, c) => c.score - a.score);
      ranked = cur;
      result = cur[0].mv;
    } catch (err) {
      break;
    }
  }
  return result || ranked[0].mv;
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
const SETTINGS_KEY = "zone210_dame_settings_v2";
const settings = { mode: "cpu", level: "normal", muted: false, ...store.get(SETTINGS_KEY, {}) };
if (!["cpu", "two"].includes(settings.mode)) settings.mode = "cpu";
if (!["easy", "normal", "hard"].includes(settings.level)) settings.level = "normal";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let board = [];
let ids = [];
let turn = "l";
let history = [];
let selected = -1;
let last = null;
let hintMove = null;
let over = false;
let busy = false;
let halfMoves = 0;
let nextId = 1;
let epoch = 0;
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

const squaresEl = $("squares");
const piecesEl = $("pieces");
const statusEl = $("status");
const setStatus = (t, kind = "") => {
  statusEl.textContent = t;
  statusEl.className = "g-status" + (kind ? ` ${kind}` : "");
};
const cpu = () => settings.mode === "cpu";
const isCpuSide = (s) => cpu() && s === "d";
const humanTurn = () => !isCpuSide(turn);
const sqName = (i) => "abcdefgh"[i % 8] + (8 - Math.floor(i / 8));
const setLast = (t) => {
  $("lastMove").textContent = t;
};
function describe(mv, mover) {
  const who = nameOf(mover);
  if (mv.caps.length) {
    const route = [sqName(mv.from), ...mv.path.map(sqName)].join(" → ");
    return `${who} ${mover === "l" && cpu() ? "captured" : "captured"} ${mv.caps.length} piece${mv.caps.length > 1 ? "s" : ""} (${route}). Captured: ${mv.caps.map(sqName).join(", ")}.`;
  }
  return `${who} moved ${sqName(mv.from)} → ${sqName(mv.to)}.`;
}
const nameOf = (s) => (cpu() ? (s === "l" ? "You" : "The computer") : s === "l" ? "Light" : "Dark");

// moves the current player may make
// Captures are optional in Dame: any capture or ordinary move is allowed, and nothing is taken for skipping one.
function allowedMoves(b, s) {
  return captureMoves(b, s).concat(stepMoves(b, s));
}

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

function render() {
  const canMove = !(over || busy || !humanTurn());
  const moves = canMove ? allowedMoves(board, turn) : [];
  const byFrom = new Map();
  moves.forEach((m) => {
    if (!byFrom.has(m.from)) byFrom.set(m.from, []);
    byFrom.get(m.from).push(m);
  });
  const targets = selected >= 0 && byFrom.has(selected) ? byFrom.get(selected) : [];
  [...squaresEl.children].forEach((sq, i) => {
    const [r, c] = rc(i);
    if (!isDark(r, c)) return;
    let cls = "sq d";
    if (last && (i === last.from || i === last.to)) cls += " last";
    if (i === selected) cls += " sel";
    if (hintMove && (i === hintMove.from || i === hintMove.to)) cls += " hint";
    const t = targets.find((m) => m.to === i);
    if (t) cls += t.caps.length ? " tgt cap" : " tgt";
    if (byFrom.has(i)) cls += " movable";
    sq.className = cls;
    const p = board[i];
    sq.setAttribute("aria-label", `${sqName(i)}${p ? `, ${sideOf(p) === "l" ? "light" : "dark"} ${isKing(p) ? "king" : "piece"}` : ""}`);
  });
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
    el.className = `pc ${sideOf(p)}${isKing(p) ? " king" : ""}${i === selected ? " pick" : ""}`;
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
  const count = (s) => board.filter((p) => p && sideOf(p) === s).length;
  const bar = (el, who, taken, color, name) => {
    el.className = "pbar" + (turn === who && !over ? " turn" : "");
    el.style.setProperty("--c", who === "l" ? "#f1e6cc" : "#1f120b");
    el.innerHTML = `<span class="who"><span class="dot"></span>${name}<small>${count(who)} left</small></span><span class="taken" style="--c:${color}">${"<i></i>".repeat(taken)}</span>`;
  };
  bar($("topBar"), "d", 12 - count("l"), "#f1e6cc", cpu() ? "Computer" : "Dark");
  bar($("bottomBar"), "l", 12 - count("d"), "#1f120b", cpu() ? "You" : "Light");
}

function newGame() {
  epoch += 1;
  board = initialBoard();
  ids = board.map((p) => (p ? nextId++ : null));
  els.forEach((el) => el.remove());
  els.clear();
  piecesEl.innerHTML = "";
  turn = "l";
  history = [];
  selected = -1;
  last = null;
  hintMove = null;
  over = false;
  busy = false;
  halfMoves = 0;
  setLast("");
  $("end").classList.remove("show");
  render();
  announce();
}

function announce() {
  if (over) return;
  if (!humanTurn()) return setStatus("The computer is thinking…");
  const who = cpu() ? "Your" : turn === "l" ? "Light's" : "Dark's";
  setStatus(`${who} move.`);
}

function onSquare(i) {
  if (over || busy) return;
  hintMove = null;
  if (!humanTurn()) return;
  const moves = allowedMoves(board, turn);
  if (selected >= 0) {
    const mv = moves.find((m) => m.from === selected && m.to === i);
    if (mv) return play(mv);
  }
  if (moves.some((m) => m.from === i)) {
    selected = i;
    render();
  } else {
    selected = -1;
    render();
  }
}

function snapshot() {
  history.push({ board: board.slice(), ids: ids.slice(), turn, last, halfMoves });
}

async function play(mv) {
  const my = epoch;
  busy = true;
  hintMove = null;
  snapshot();
  const mover = turn;
  const el = els.get(ids[mv.from]);
  selected = -1;
  const piece = board[mv.from];
  if (mv.caps.length) {
    for (let s = 0; s < mv.path.length; s += 1) {
      const [r, c] = rc(mv.path[s]);
      el.style.left = `${c * 12.5}%`;
      el.style.top = `${r * 12.5}%`;
      sfx.capture();
      await sleep(160);
      if (my !== epoch) return;
      const capEl = els.get(ids[mv.caps[s]]);
      if (capEl) capEl.classList.add("gone");
      await sleep(170);
      if (my !== epoch) return;
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
  halfMoves = mv.caps.length || !isKing(piece) ? 0 : halfMoves + 1;
  last = { from: mv.from, to: mv.to };
  if (mv.promote) sfx.king();
  setLast(describe(mv, mover) + (mv.promote ? " Crowned a king!" : ""));
  turn = mover === "l" ? "d" : "l";
  busy = false;
  render();

  proceed();
}

function proceed(keepStatus = false) {
  if (checkEnd()) return;
  render();
  if (!keepStatus) announce();
  if (!humanTurn()) cpuMove();
}

function checkEnd() {
  const moves = allowedMoves(board, turn);
  let title = "";
  let text = "";
  let emoji = "🏆";
  const c = cpu();
  if (!moves.length) {
    const winner = turn === "l" ? "d" : "l";
    title = c ? (winner === "l" ? "You win!" : "The computer wins") : `${winner === "l" ? "Light" : "Dark"} wins!`;
    const remaining = board.filter((p) => p && sideOf(p) === turn).length;
    text = remaining ? `${turn === "l" ? "Light" : "Dark"} has no legal moves.` : `${turn === "l" ? "Light" : "Dark"} has no pieces left.`;
    if (c && winner === "d") emoji = "🤖";
    c && winner === "d" ? sfx.lose() : sfx.win();
  } else if (halfMoves >= 60) {
    title = "It's a draw";
    text = "Thirty moves each without a capture or a man moving.";
    emoji = "🤝";
  } else return false;
  over = true;
  render();
  setStatus(title, "good");
  $("endEmoji").textContent = emoji;
  $("endTitle").textContent = title;
  $("endText").textContent = text;
  const e = epoch;
  setTimeout(() => e === epoch && $("end").classList.add("show"), 650);
  return true;
}

function cpuMove() {
  const my = epoch;
  busy = true;
  render();
  setTimeout(() => {
    if (my !== epoch) return;
    const mv = chooseMove(board, turn, settings.level);
    busy = false;
    if (mv) play(mv);
    else proceed();
  }, 450);
}

function undo() {
  if (busy || !history.length) return;
  const steps = cpu() && turn === "l" && history.length > 1 ? 2 : 1;
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
  epoch += 1; // cancel anything still animating
  $("end").classList.remove("show");
  els.forEach((el) => el.remove());
  els.clear();
  piecesEl.innerHTML = "";
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
window.__dame = {
  captureMoves, stepMoves, applyMove, chooseMove, initialBoard, allowedMoves,
  get board() { return board; }, get turn() { return turn; }, get over() { return over; }, get busy() { return busy; },
  setBoard: (b, t = "l") => { epoch += 1; board = b; ids = b.map((p) => (p ? nextId++ : null)); els.forEach((e) => e.remove()); els.clear(); piecesEl.innerHTML = ""; turn = t; over = false; busy = false; history = []; render(); announce(); },
  onSquare, play, settings, proceed,
};
