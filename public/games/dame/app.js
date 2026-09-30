import * as p2p from "../../assets/p2p.js";

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
const settings = { mode: "cpu", level: "normal", side: "l", muted: false, ...store.get(SETTINGS_KEY, {}) };
if (!["cpu", "two", "online"].includes(settings.mode)) settings.mode = "cpu";
if (!["l", "d", "r"].includes(settings.side)) settings.side = "l";
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
let flipped = false; // the dark player sees the board from their side
let moveCount = 0;
const els = new Map();
const net = { link: null, role: null, code: null, started: false, opponentAway: false, conn: null, guestToken: null, myColor: "l", rematchMe: false, rematchOpp: false };
const posOf = (i) => {
  const [r, c] = rc(i);
  return { left: (flipped ? 7 - c : c) * 12.5, top: (flipped ? 7 - r : r) * 12.5 };
};

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
const online = () => settings.mode === "online";
const isCpuSide = (s) => cpu() && s === "d";
const humanTurn = () => (online() ? net.started && !net.opponentAway && turn === net.myColor : !isCpuSide(turn));
const youSide = () => (cpu() ? "l" : online() ? net.myColor : null);
const otherSide = (s) => (s === "l" ? "d" : "l");
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
const nameOf = (s) => (cpu() ? (s === "l" ? "You" : "The computer") : online() ? (s === net.myColor ? "You" : "Your opponent") : s === "l" ? "Light" : "Dark");

// moves the current player may make
// Captures are optional in Dame: any capture or ordinary move is allowed, and nothing is taken for skipping one.
function allowedMoves(b, s) {
  return captureMoves(b, s).concat(stepMoves(b, s));
}

function buildSquares() {
  squaresEl.innerHTML = "";
  for (let v = 0; v < 64; v += 1) {
    const i = flipped ? 63 - v : v;
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
  [...squaresEl.children].forEach((sq) => {
    const i = Number(sq.dataset.i);
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
    const pos = posOf(i);
    el.className = `pc ${sideOf(p)}${isKing(p) ? " king" : ""}${i === selected ? " pick" : ""}`;
    el.style.left = `${pos.left}%`;
    el.style.top = `${pos.top}%`;
  });
  els.forEach((el, id) => {
    if (!present.has(id)) {
      el.classList.add("gone");
      els.delete(id);
      setTimeout(() => el.remove(), 350);
    }
  });
  const count = (s) => board.filter((p) => p && sideOf(p) === s).length;
  const colorOf = (s) => (s === "l" ? "#f1e6cc" : "#1f120b");
  const label = (s) => (cpu() ? (s === "l" ? "You" : "Computer") : online() ? (s === net.myColor ? "You" : "Opponent") : s === "l" ? "Light" : "Dark");
  const bar = (el, who) => {
    el.className = "pbar" + (turn === who && !over && (!online() || net.started) ? " turn" : "");
    el.style.setProperty("--c", colorOf(who));
    el.innerHTML = `<span class="who"><span class="dot"></span>${label(who)}<small>${count(who)} left</small></span><span class="taken" style="--c:${colorOf(otherSide(who))}">${"<i></i>".repeat(12 - count(otherSide(who)))}</span>`;
  };
  const bottom = flipped ? "d" : "l";
  bar($("topBar"), otherSide(bottom));
  bar($("bottomBar"), bottom);
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
  moveCount = 0;
  setLast("");
  $("end").classList.remove("show");
  render();
  announce();
}

function announce() {
  if (over) return;
  if (online()) {
    if (!net.started) return setStatus(net.role ? "Waiting for your opponent to join…" : "Create a room, or join a friend's room with their code.");
    if (net.opponentAway) return setStatus("Your opponent disconnected. Waiting for them to come back…", "bad");
    return setStatus(turn === net.myColor ? "Your move." : "Your opponent is thinking…");
  }
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

async function play(mv, remote = false) {
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
      const pos = posOf(mv.path[s]);
      el.style.left = `${pos.left}%`;
      el.style.top = `${pos.top}%`;
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
  const sentIndex = moveCount;
  moveCount += 1;
  render();
  if (online() && !remote) netSend({ t: "move", n: sentIndex, from: mv.from, to: mv.to, path: mv.path, caps: mv.caps, promote: mv.promote });
  saveRoom();
  proceed();
}

function proceed(keepStatus = false) {
  if (checkEnd()) return;
  render();
  if (!keepStatus) announce();
  if (cpu() && isCpuSide(turn)) cpuMove();
  pumpInbox();
}

function endGame(title, text, emoji, sound) {
  over = true;
  render();
  setStatus(title, "good");
  $("endEmoji").textContent = emoji;
  $("endTitle").textContent = title;
  $("endText").textContent = text;
  if (sound === "win") sfx.win();
  else if (sound === "lose") sfx.lose();
  updateOnlineButtons();
  const e = epoch;
  setTimeout(() => e === epoch && $("end").classList.add("show"), 650);
}

function winTitle(winner) {
  const me = youSide();
  if (me) return winner === me ? "You win!" : cpu() ? "The computer wins" : "Your opponent wins";
  return `${winner === "l" ? "Light" : "Dark"} wins!`;
}

function checkEnd() {
  if (online() && !net.started) return false;
  const moves = allowedMoves(board, turn);
  if (!moves.length) {
    const winner = otherSide(turn);
    const remaining = board.filter((p) => p && sideOf(p) === turn).length;
    const loser = turn === "l" ? "Light" : "Dark";
    const me = youSide();
    endGame(winTitle(winner), remaining ? `${loser} has no legal moves.` : `${loser} has no pieces left.`, cpu() && winner === "d" ? "🤖" : "🏆", me ? (winner === me ? "win" : "lose") : "win");
    return true;
  }
  if (halfMoves >= 60) {
    endGame("It's a draw", "Thirty moves each without a capture or a man moving.", "🤝", "win");
    return true;
  }
  return false;
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
  if (busy || !history.length || online()) return;
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
  if (over || busy || !humanTurn() || online()) return;
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
  document.querySelectorAll("#side .g-chip").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.value === settings.side)));
  $("levelRow").hidden = settings.mode !== "cpu";
  $("sideRow").hidden = !(online() && !net.role);
  $("onlinePanel").hidden = !online();
  $("newGame").hidden = online();
  $("undo").hidden = $("hint").hidden = online();
  updateOnlineButtons();
}
function setMode(mode) {
  if (settings.mode === "online" && mode !== "online") leaveRoom(true);
  settings.mode = mode;
  store.set(SETTINGS_KEY, settings);
  flipped = false;
  buildSquares();
  syncChips();
  newGame();
}
document.querySelectorAll("#mode .g-chip").forEach((b) =>
  b.addEventListener("click", () => {
    if (settings.mode === b.dataset.value) return;
    setMode(b.dataset.value);
  })
);
document.querySelectorAll("#level .g-chip, #side .g-chip").forEach((b) =>
  b.addEventListener("click", () => {
    const group = b.parentElement.id;
    if (settings[group] === b.dataset.value) return;
    settings[group] = b.dataset.value;
    store.set(SETTINGS_KEY, settings);
    syncChips();
    if (group === "level") newGame();
  })
);
$("newGame").addEventListener("click", newGame);
$("again").addEventListener("click", () => (online() ? requestRematch() : newGame()));
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

// ---------- online play (peer to peer, no game server) ----------
const PREFIX = "zone210-dame-";
const ROOM_KEY = "zone210_dame_room"; // sessionStorage: lets a reload rejoin the same game
const REACTS = ["👏", "😮", "😂", "🔥", "🤝", "😅", "🤔", "❤️"];
let inbox = [];
let reconnecting = false;

const snap = () => ({ board: board.slice(), turn, halfMoves, n: moveCount, last, over });
function applySnap(s) {
  epoch += 1;
  board = s.board.slice();
  ids = board.map((p) => (p ? nextId++ : null));
  els.forEach((el) => el.remove());
  els.clear();
  piecesEl.innerHTML = "";
  turn = s.turn;
  halfMoves = s.halfMoves;
  moveCount = s.n;
  last = s.last || null;
  over = !!s.over;
  busy = false;
  selected = -1;
  inbox = [];
  render();
  announce();
}

function tokenId() {
  let t = null;
  try {
    t = sessionStorage.getItem("zone210_dame_token");
    if (!t) {
      t = Math.random().toString(36).slice(2) + Date.now().toString(36);
      sessionStorage.setItem("zone210_dame_token", t);
    }
  } catch (err) {
    t = t || "anon";
  }
  return t;
}
function netSend(msg) {
  if (!net.link) return;
  if (net.role === "host") net.link.broadcast(msg);
  else net.link.send(msg);
}
function saveRoom() {
  if (!online() || net.role !== "host" || !net.code) return;
  try {
    sessionStorage.setItem(ROOM_KEY, JSON.stringify({ role: "host", code: net.code, myColor: net.myColor, started: net.started, snap: snap() }));
  } catch (err) {
    /* private mode */
  }
}
function forgetRoom() {
  try {
    sessionStorage.removeItem(ROOM_KEY);
  } catch (err) {
    /* private mode */
  }
}
const showError = (t) => {
  $("onlineError").textContent = t || "";
};
function showLobby(which) {
  $("lobbyStart").hidden = which !== "start";
  $("lobbyWait").hidden = which !== "wait";
  $("lobbyLive").hidden = which !== "live";
  $("sideRow").hidden = !(online() && !net.role);
}
function updateOnlineButtons() {
  const live = online() && net.started;
  $("drawBtn").hidden = !live;
  $("resignBtn").hidden = !live;
  $("drawBtn").disabled = !live || over || net.opponentAway;
  $("resignBtn").disabled = !live || over;
  $("reactRow").hidden = !live;
  $("again").textContent = online() ? (net.rematchMe ? "Waiting for your opponent…" : "Rematch") : "Play again";
  $("again").disabled = online() && net.rematchMe;
  if (live) {
    const pill = $("livePill");
    pill.textContent = `Online · Room ${net.code}`;
    pill.classList.toggle("off", net.opponentAway);
    $("liveMsg").textContent = net.opponentAway ? "Opponent disconnected" : `You are ${net.myColor === "l" ? "Light (first)" : "Dark"}`;
  }
}

function freshBoard(myColor) {
  epoch += 1;
  net.myColor = myColor;
  flipped = myColor === "d";
  net.rematchMe = false;
  net.rematchOpp = false;
  $("offerBar").hidden = true;
  buildSquares();
  newGame();
}

function leaveRoom(quiet = false) {
  try {
    net.link?.close();
  } catch (err) {
    /* already closed */
  }
  Object.assign(net, { link: null, role: null, code: null, started: false, opponentAway: false, conn: null, guestToken: null, rematchMe: false, rematchOpp: false });
  reconnecting = false;
  inbox = [];
  forgetRoom();
  showError("");
  $("offerBar").hidden = true;
  if (online() && !quiet) {
    flipped = false;
    buildSquares();
    newGame();
    showLobby("start");
    syncChips();
  }
}

async function createRoom(rehost = null) {
  showError("");
  $("createRoom").disabled = true;
  try {
    net.link = await p2p.hostRoom({ onConnect: () => {}, onData: hostOnData, onClose: hostOnClose }, { prefix: PREFIX, code: rehost ? rehost.code : null });
    net.role = "host";
    net.code = net.link.code;
    $("roomCode").textContent = net.code;
    if (rehost) {
      freshBoard(rehost.myColor);
      applySnap(rehost.snap);
      net.started = false; // wait for the guest to reconnect
      $("lobbyMsg").textContent = "Waiting for your opponent to reconnect…";
    } else {
      const pick = settings.side === "r" ? (Math.random() < 0.5 ? "l" : "d") : settings.side;
      freshBoard(pick);
      $("lobbyMsg").textContent = `Waiting for your friend… You play ${pick === "l" ? "Light (first)" : "Dark"}.`;
    }
    showLobby("wait");
    syncChips();
    announce();
    saveRoom();
  } catch (err) {
    showError(err && err.message ? err.message : "Could not create a room. Try again.");
    net.link = null;
  } finally {
    $("createRoom").disabled = false;
  }
}

function hostOnData(conn, msg) {
  if (!msg || typeof msg !== "object") return;
  if (msg.t === "hello") {
    const token = String(msg.token || "");
    if (net.guestToken && token !== net.guestToken) {
      net.link.sendTo(conn, { t: "reject", reason: "This room already has two players." });
      return;
    }
    net.guestToken = token;
    net.conn = conn;
    net.started = true;
    net.opponentAway = false;
    net.link.sendTo(conn, { t: "welcome", color: otherSide(net.myColor), snap: snap() });
    showLobby("live");
    syncChips();
    announce();
    render();
    saveRoom();
    return;
  }
  if (conn !== net.conn) return;
  handlePeer(msg);
}
function hostOnClose(conn) {
  if (conn !== net.conn) return;
  net.opponentAway = true;
  updateOnlineButtons();
  announce();
  render();
}

async function joinRoom(code, { silent = false } = {}) {
  const clean = p2p.normalizeCode(code);
  if (clean.length !== 5) {
    if (!silent) showError("Room codes have 5 letters and numbers.");
    return false;
  }
  showError("");
  $("joinForm").querySelector("button").disabled = true;
  try {
    net.link?.close();
    net.link = await p2p.joinRoom(clean, { onData: guestOnData, onClose: guestOnClose }, { prefix: PREFIX });
    net.role = "guest";
    net.code = clean;
    net.link.send({ t: "hello", token: tokenId() });
    try {
      sessionStorage.setItem(ROOM_KEY, JSON.stringify({ role: "guest", code: clean }));
    } catch (err) {
      /* private mode */
    }
    return true;
  } catch (err) {
    net.link = null;
    net.role = null;
    if (!silent) showError(err && err.message ? err.message : "Could not join that room.");
    return false;
  } finally {
    $("joinForm").querySelector("button").disabled = false;
  }
}

function guestOnData(msg) {
  if (!msg || typeof msg !== "object") return;
  if (msg.t === "reject") {
    showError(msg.reason || "Could not join that room.");
    leaveRoom(true);
    showLobby("start");
    syncChips();
    return;
  }
  if (msg.t === "welcome") {
    freshBoard(msg.color);
    applySnap(msg.snap);
    net.started = true;
    net.opponentAway = false;
    reconnecting = false;
    showLobby("live");
    syncChips();
    announce();
    render();
    return;
  }
  handlePeer(msg);
}
async function guestOnClose() {
  if (net.role !== "guest" || reconnecting || over) return;
  net.opponentAway = true;
  updateOnlineButtons();
  setStatus("Connection lost. Trying to reconnect…", "bad");
  reconnecting = true;
  for (let i = 0; i < 12 && net.role === "guest"; i += 1) {
    await sleep(3000);
    if (net.role !== "guest") break;
    const code = net.code;
    try {
      net.link?.close();
    } catch (err) {
      /* already closed */
    }
    net.link = null;
    if (await joinRoom(code, { silent: true })) return;
  }
  reconnecting = false;
  if (net.role === "guest") setStatus("Could not reconnect. The host may have left the room.", "bad");
}

const sameCaps = (a, b) => a.length === b.length && a.every((x) => b.includes(x));
function pumpInbox() {
  if (!online() || busy || over || !inbox.length) return;
  const m = inbox.shift();
  const mv = turn !== net.myColor && m.n === moveCount ? allowedMoves(board, turn).find((x) => x.from === m.from && x.to === m.to && sameCaps(x.caps, m.caps || [])) : null;
  if (!mv) {
    // out of step: the host is the referee
    if (net.role === "host") netSend({ t: "sync", snap: snap() });
    else netSend({ t: "sync-req" });
    return;
  }
  play(mv, true);
}

function handlePeer(msg) {
  switch (msg.t) {
    case "move":
      inbox.push(msg);
      pumpInbox();
      break;
    case "sync-req":
      if (net.role === "host") netSend({ t: "sync", snap: snap() });
      break;
    case "sync":
      if (net.role === "guest" && msg.snap) applySnap(msg.snap);
      break;
    case "resign":
      if (!over) endGame("You win!", "Your opponent resigned.", "🏆", "win");
      break;
    case "draw-offer":
      if (over) break;
      $("offerText").textContent = "Your opponent offers a draw.";
      $("offerBar").hidden = false;
      break;
    case "draw-accept":
      $("offerBar").hidden = true;
      if (!over) endGame("It's a draw", "Both players agreed to a draw.", "🤝", "win");
      break;
    case "draw-decline":
      setStatus("Your opponent declined the draw.", "bad");
      break;
    case "rematch":
      net.rematchOpp = true;
      setStatus("Your opponent wants a rematch.", "good");
      maybeStartRematch();
      break;
    case "newgame":
      startNewGame(msg.color);
      break;
    case "react":
      if (REACTS.includes(msg.k)) toastReact(`${msg.k}  Your opponent`);
      break;
    default:
  }
}

function requestRematch() {
  if (!online() || !net.started) return;
  net.rematchMe = true;
  netSend({ t: "rematch" });
  updateOnlineButtons();
  maybeStartRematch();
}
function maybeStartRematch() {
  if (net.role !== "host" || !net.rematchMe || !net.rematchOpp) return;
  const mine = otherSide(net.myColor); // colours swap
  netSend({ t: "newgame", color: otherSide(mine) });
  startNewGame(mine);
}
function startNewGame(color) {
  freshBoard(color);
  net.started = true;
  $("end").classList.remove("show");
  updateOnlineButtons();
  render();
  announce();
  saveRoom();
}

function toastReact(text) {
  const t = document.createElement("div");
  t.className = "toast-react";
  t.textContent = text;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2500);
}
REACTS.forEach((k) => {
  const b = document.createElement("button");
  b.type = "button";
  b.textContent = k;
  b.setAttribute("aria-label", `Send ${k}`);
  b.addEventListener("click", () => {
    netSend({ t: "react", k });
    toastReact(`${k}  You`);
  });
  $("reactRow").appendChild(b);
});

// lobby and match buttons
$("createRoom").addEventListener("click", () => createRoom());
$("joinForm").addEventListener("submit", (e) => {
  e.preventDefault();
  joinRoom($("joinCode").value);
});
$("joinCode").addEventListener("input", (e) => {
  e.target.value = p2p.normalizeCode(e.target.value);
});
$("copyLink").addEventListener("click", async () => {
  const url = `${location.origin}${location.pathname}?room=${net.code}`;
  try {
    await navigator.clipboard.writeText(url);
    $("lobbyMsg").textContent = "Invite link copied. Send it to your friend!";
  } catch (err) {
    window.prompt("Copy this invite link:", url);
  }
});
$("leaveRoom").addEventListener("click", () => leaveRoom());
$("leaveLive").addEventListener("click", () => {
  if (over || window.confirm("Leave this game? Your opponent will see you disconnect.")) leaveRoom();
});
$("resignBtn").addEventListener("click", () => {
  if (over || !net.started || !window.confirm("Resign this game?")) return;
  netSend({ t: "resign" });
  endGame("You resigned", "Your opponent wins.", "🏳️", "lose");
});
$("drawBtn").addEventListener("click", () => {
  if (over || !net.started) return;
  netSend({ t: "draw-offer" });
  setStatus("Draw offered. Waiting for your opponent…");
});
$("offerYes").addEventListener("click", () => {
  $("offerBar").hidden = true;
  netSend({ t: "draw-accept" });
  if (!over) endGame("It's a draw", "Both players agreed to a draw.", "🤝", "win");
});
$("offerNo").addEventListener("click", () => {
  $("offerBar").hidden = true;
  netSend({ t: "draw-decline" });
});
$("endView").addEventListener("click", () => $("end").classList.remove("show"));
window.addEventListener("pagehide", saveRoom);

buildSquares();
syncChips();
syncMute();
newGame();
showLobby("start");

// invite links (?room=CODE) and reloads during an online game
(function boot() {
  const roomParam = p2p.normalizeCode(new URLSearchParams(location.search).get("room") || "");
  let saved = null;
  try {
    saved = JSON.parse(sessionStorage.getItem(ROOM_KEY) || "null");
  } catch (err) {
    saved = null;
  }
  if (roomParam.length === 5) {
    setMode("online");
    $("joinCode").value = roomParam;
    joinRoom(roomParam);
  } else if (saved && settings.mode === "online") {
    if (saved.role === "host") createRoom(saved);
    else joinRoom(saved.code, { silent: true });
  }
})();
window.__dame = {
  captureMoves, stepMoves, applyMove, chooseMove, initialBoard, allowedMoves,
  get board() { return board; }, get turn() { return turn; }, get over() { return over; }, get busy() { return busy; }, get net() { return net; }, get flipped() { return flipped; }, get moveCount() { return moveCount; }, setMode, createRoom, joinRoom,
  setBoard: (b, t = "l") => { epoch += 1; board = b; ids = b.map((p) => (p ? nextId++ : null)); els.forEach((e) => e.remove()); els.clear(); piecesEl.innerHTML = ""; turn = t; over = false; busy = false; history = []; render(); announce(); },
  onSquare, play, settings, proceed,
};
