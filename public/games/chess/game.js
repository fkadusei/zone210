import { newGame, legalMoves, play, status, toSAN, toFEN, findMove, sqName, inCheck, isWhite } from "./logic.js";

const $ = (id) => document.getElementById(id);
const boardEl = $("board");
const SAVE_KEY = "zone210_chess_save";

const GLYPH = { K: "♚", Q: "♛", R: "♜", B: "♝", N: "♞", P: "♟︎" };
const VALUE = { P: 1, N: 3, B: 3, R: 5, Q: 9, K: 0 };
const NAME = { P: "pawn", N: "knight", B: "bishop", R: "rook", Q: "queen", K: "king" };
const START_COUNT = { P: 8, N: 2, B: 2, R: 2, Q: 1, K: 1 };

const opts = { mode: "cpu", level: "normal", side: "w" };
let me = "w"; // the human's colour in vs-computer mode
let st = newGame();
let states = [st]; // every position, so Undo can step back
let moves = []; // [{ from, to, promo, san }]
let selected = -1;
let targets = [];
let flipped = false;
let hintSquares = [];
let thinking = false;
let over = null;
let muted = false;
let audio = null;
let requestId = 0;
let worker = null;
let workerBroken = false;

/* ---------------------------------------------------------------- sound */

function beep(freq, dur = 0.09, type = "triangle", vol = 0.1) {
  if (muted) return;
  try {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state !== "running") audio.resume();
    const t = audio.currentTime;
    const o = audio.createOscillator();
    const g = audio.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(audio.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
  } catch (err) {
    // audio unavailable
  }
}
const sMove = () => beep(300, 0.07);
const sCapture = () => {
  beep(220, 0.1, "sawtooth", 0.08);
  setTimeout(() => beep(160, 0.1, "sawtooth", 0.07), 60);
};
const sCheck = () => beep(660, 0.14, "square", 0.06);
const sEnd = () => [523, 659, 784].forEach((f, i) => setTimeout(() => beep(f, 0.2, "triangle", 0.12), i * 120));

/* --------------------------------------------------------------- board */

const isCpuTurn = () => opts.mode === "cpu" && st.turn !== me && !over;

function buildBoard() {
  boardEl.innerHTML = "";
  for (let v = 0; v < 64; v += 1) {
    const b = document.createElement("button");
    b.className = "sq";
    b.dataset.v = v;
    b.setAttribute("role", "gridcell");
    b.addEventListener("click", () => clickSquare(Number(b.dataset.v)));
    boardEl.appendChild(b);
  }
}

// visual slot -> board index (flipped rotates the board 180 degrees)
const toIndex = (v) => (flipped ? 63 - v : v);

function lastMove() {
  return moves.length ? moves[moves.length - 1] : null;
}

function render() {
  const lm = lastMove();
  const checkSq = inCheck(st) ? st.king[st.turn] : -1;
  const cells = boardEl.children;
  for (let v = 0; v < 64; v += 1) {
    const i = toIndex(v);
    const el = cells[v];
    const r = Math.floor(i / 8);
    const c = i % 8;
    const piece = st.board[i];
    let cls = "sq" + ((r + c) % 2 === 1 ? " dark" : "");
    if (lm && (i === lm.from || i === lm.to)) cls += " last";
    if (i === selected) cls += " sel";
    if (hintSquares.includes(i)) cls += " hint";
    if (i === checkSq) cls += " check";
    if (targets.includes(i)) cls += piece ? " target cap" : " target";
    el.className = cls;
    el.innerHTML = "";
    if (v % 8 === 0) el.insertAdjacentHTML("beforeend", `<span class="coord rank">${8 - r}</span>`);
    if (v >= 56) el.insertAdjacentHTML("beforeend", `<span class="coord file">${"abcdefgh"[c]}</span>`);
    if (piece) {
      const span = document.createElement("span");
      span.className = `pc ${isWhite(piece) ? "w" : "b"}`;
      span.textContent = GLYPH[piece.toUpperCase()];
      if (lm && i === lm.to) span.style.animation = "settle 0.2s ease-out";
      else span.style.animation = "none";
      el.appendChild(span);
    }
    el.setAttribute("aria-label", `${sqName(i)}${piece ? `, ${isWhite(piece) ? "white" : "black"} ${NAME[piece.toUpperCase()]}` : ""}`);
  }
  renderBars();
  renderMoves();
  renderStatus();
  // Undo is off while thinking, and when the only move made is the computer's opening move
  $("undo").disabled = moves.length === 0 || thinking || (opts.mode === "cpu" && me === "b" && moves.length <= 1);
  $("hint").disabled = !!over || thinking || isCpuTurn();
  $("resign").disabled = !!over || thinking;
}

function capturedFor(color) {
  // pieces of `color` that have been captured (missing from the board)
  const count = {};
  for (const p of st.board) if (p && (isWhite(p) ? "w" : "b") === color) count[p.toUpperCase()] = (count[p.toUpperCase()] || 0) + 1;
  const out = [];
  for (const t of ["Q", "R", "B", "N", "P"]) {
    const missing = START_COUNT[t] - (count[t] || 0);
    for (let k = 0; k < Math.max(0, missing); k += 1) out.push(t);
  }
  return out;
}

function materialOf(color) {
  let total = 0;
  for (const p of st.board) if (p && (isWhite(p) ? "w" : "b") === color) total += VALUE[p.toUpperCase()];
  return total;
}

function renderBars() {
  const top = flipped ? "w" : "b";
  const bottom = flipped ? "b" : "w";
  const label = (color) => {
    if (opts.mode === "two") return color === "w" ? "White" : "Black";
    return color === me ? "You" : "Computer";
  };
  const fill = (el, color) => {
    const lost = capturedFor(color === "w" ? "b" : "w"); // pieces this side has captured
    const adv = materialOf(color) - materialOf(color === "w" ? "b" : "w");
    el.className = `player-bar${st.turn === color && !over ? " turn" : ""}`;
    el.innerHTML = `<span class="who"><span class="dot ${color}"></span>${label(color)}${opts.mode === "cpu" ? ` <small>${color === "w" ? "White" : "Black"}</small>` : ""}</span>
      <span class="captured">${lost.map((t) => `<span class="cp ${color === "w" ? "b" : "w"}">${GLYPH[t]}</span>`).join("")}${adv > 0 ? `<span class="adv">+${adv}</span>` : ""}</span>`;
  };
  fill($("topBar"), top);
  fill($("bottomBar"), bottom);
}

function renderMoves() {
  const list = $("moves");
  list.innerHTML = "";
  for (let i = 0; i < moves.length; i += 2) {
    const li = document.createElement("li");
    const n = document.createElement("span");
    n.className = "n";
    n.textContent = `${i / 2 + 1}.`;
    li.appendChild(n);
    for (let k = 0; k < 2; k += 1) {
      const m = document.createElement("span");
      m.className = "m" + (i + k === moves.length - 1 ? " cur" : "");
      m.textContent = moves[i + k] ? moves[i + k].san : "";
      li.appendChild(m);
    }
    list.appendChild(li);
  }
  list.scrollTop = list.scrollHeight;
}

function renderStatus() {
  const el = $("statusLine");
  el.classList.remove("alert");
  $("think").hidden = !thinking;
  if (over) {
    el.textContent = resultText(over).headline;
    return;
  }
  const who = st.turn === "w" ? "White" : "Black";
  const yourTurn = opts.mode === "cpu" ? st.turn === me : true;
  let text = opts.mode === "cpu" ? (yourTurn ? "Your move" : "Computer's move") : `${who} to move`;
  if (inCheck(st)) {
    text += " · Check!";
    el.classList.add("alert");
  }
  el.textContent = text;
}

function resultText(res) {
  const winner = res.winner;
  const nameOf = (c) => (c === "w" ? "White" : "Black");
  if (res.result === "checkmate") {
    if (opts.mode === "cpu") return winner === me ? { headline: "Checkmate: you win!", emoji: "🏆", title: "You win!", body: "Checkmate. Well played!" } : { headline: "Checkmate: computer wins", emoji: "🤖", title: "Checkmate", body: "The computer won this one. Try again or lower the level." };
    return { headline: `Checkmate: ${nameOf(winner)} wins`, emoji: "🏆", title: `${nameOf(winner)} wins!`, body: "Checkmate." };
  }
  if (res.result === "resign") {
    if (opts.mode === "cpu") return { headline: winner === me ? "Computer resigned" : "You resigned", emoji: winner === me ? "🏆" : "🏳️", title: winner === me ? "You win!" : "You resigned", body: "" };
    return { headline: `${nameOf(res.loser)} resigned`, emoji: "🏳️", title: `${nameOf(winner)} wins!`, body: `${nameOf(res.loser)} resigned.` };
  }
  const reasons = {
    stalemate: "Stalemate: the player to move has no legal move, so it's a draw.",
    insufficient: "Draw: neither side has enough pieces left to checkmate.",
    fifty: "Draw by the fifty-move rule.",
    repetition: "Draw by threefold repetition.",
  };
  return { headline: "Draw", emoji: "🤝", title: "It's a draw", body: reasons[res.result] || "" };
}

/* ------------------------------------------------------------ interaction */

function clickSquare(v) {
  if (over || thinking || isCpuTurn() || $("promo").classList.contains("show")) return;
  const i = toIndex(v);
  const piece = st.board[i];
  const mine = piece && (isWhite(piece) ? "w" : "b") === st.turn;

  if (selected >= 0 && targets.includes(i)) {
    return attempt(selected, i);
  }
  hintSquares = [];
  if (mine) {
    selected = i;
    targets = legalMoves(st).filter((m) => m.from === i).map((m) => m.to);
  } else {
    selected = -1;
    targets = [];
  }
  render();
  return undefined;
}

function attempt(from, to) {
  const options = legalMoves(st).filter((m) => m.from === from && m.to === to);
  if (!options.length) return;
  if (options.length > 1) {
    askPromotion(options.map((m) => m.promo), (promo) => doMove(options.find((m) => m.promo === promo)));
  } else {
    doMove(options[0]);
  }
}

function askPromotion(choices, done) {
  const row = $("promoRow");
  row.innerHTML = "";
  const color = st.turn;
  ["q", "r", "b", "n"].filter((p) => choices.includes(p)).forEach((p) => {
    const b = document.createElement("button");
    b.className = color;
    b.textContent = GLYPH[p.toUpperCase()];
    b.setAttribute("aria-label", `Promote to ${NAME[p.toUpperCase()]}`);
    b.addEventListener("click", () => {
      $("promo").classList.remove("show");
      done(p);
    });
    row.appendChild(b);
  });
  $("promo").classList.add("show");
}

function doMove(m) {
  if (!m) return;
  const san = toSAN(st, m);
  const next = play(st, m);
  moves.push({ from: m.from, to: m.to, promo: m.promo, san });
  st = next;
  states.push(st);
  selected = -1;
  targets = [];
  hintSquares = [];
  sound(m, st);
  afterMove();
}

function sound(m, after) {
  if (m.capture) sCapture();
  else sMove();
  if (inCheck(after)) setTimeout(sCheck, 120);
}

function afterMove() {
  const s = status(st);
  if (s.over) {
    over = s;
    render();
    finishGame();
    return;
  }
  save();
  render();
  if (isCpuTurn()) computerMove();
  else if (opts.mode === "two" && $("flip").dataset.auto === "1") {
    flipped = st.turn === "b";
    render();
  }
}

/* --------------------------------------------------------------- computer */

function getWorker() {
  if (worker || workerBroken) return worker;
  try {
    worker = new Worker("ai-worker.js", { type: "module" });
    worker.onerror = () => {
      workerBroken = true;
      worker = null;
    };
  } catch (err) {
    workerBroken = true;
  }
  return worker;
}

/** Asks the engine for a move; resolves with { from, to, promo } or null. */
function askEngine(level) {
  const id = (requestId += 1);
  const payload = { id, fen: toFEN(st), hist: st.hist, level };
  return new Promise((resolve) => {
    const w = getWorker();
    if (w) {
      const timer = setTimeout(() => {
        // the worker never answered: fall back to searching on the main thread
        w.removeEventListener("message", onMsg);
        workerBroken = true;
        fallback();
      }, 12000);
      const onMsg = (e) => {
        if (e.data.id !== id) return;
        clearTimeout(timer);
        w.removeEventListener("message", onMsg);
        resolve(e.data.move);
      };
      w.addEventListener("message", onMsg);
      w.postMessage(payload);
    } else {
      fallback();
    }
    function fallback() {
      import("./ai.js").then(({ chooseMove }) => {
        setTimeout(() => {
          const m = chooseMove(st, level);
          resolve(m ? { from: m.from, to: m.to, promo: m.promo } : null);
        }, 30);
      });
    }
  });
}

async function computerMove() {
  thinking = true;
  render();
  const started = Date.now();
  const snapshot = st;
  const reply = await askEngine(opts.level);
  // give the move a human pace, and never apply it to a position that has since changed
  const wait = Math.max(0, 450 - (Date.now() - started));
  await new Promise((r) => setTimeout(r, wait));
  thinking = false;
  if (snapshot !== st || over) return render();
  const m = reply && findMove(st, reply.from, reply.to, reply.promo);
  if (m) doMove(m);
  else render();
  return undefined;
}

async function showHint() {
  if (over || thinking || isCpuTurn()) return;
  thinking = true;
  render();
  const snapshot = st;
  const reply = await askEngine("normal");
  thinking = false;
  if (snapshot !== st || !reply) return render();
  hintSquares = [reply.from, reply.to];
  selected = -1;
  targets = [];
  render();
  const m = findMove(st, reply.from, reply.to, reply.promo);
  if (m) $("statusLine").textContent = `Hint: try ${toSAN(st, m)}`;
  setTimeout(() => {
    if (snapshot === st) {
      hintSquares = [];
      render();
    }
  }, 4500);
  return undefined;
}

/* ------------------------------------------------------------- game flow */

function finishGame() {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch (err) {
    // ignore
  }
  sEnd();
  const t = resultText(over);
  $("endEmoji").textContent = t.emoji;
  $("endTitle").textContent = t.title;
  $("endText").textContent = t.body;
  setTimeout(() => $("end").classList.add("show"), 700);
}

function save() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ opts, me, flipped, moves: moves.map(({ from, to, promo }) => ({ from, to, promo })) }));
  } catch (err) {
    // storage unavailable
  }
}

function start({ resume = null } = {}) {
  requestId += 1; // ignore any answer still on its way for the previous game
  thinking = false;
  over = null;
  selected = -1;
  targets = [];
  hintSquares = [];
  $("end").classList.remove("show");
  $("promo").classList.remove("show");
  st = newGame();
  states = [st];
  moves = [];

  if (resume) {
    Object.assign(opts, resume.opts);
    me = resume.me;
    flipped = !!resume.flipped;
    for (const r of resume.moves) {
      const m = findMove(st, r.from, r.to, r.promo);
      if (!m) break;
      const san = toSAN(st, m);
      st = play(st, m);
      states.push(st);
      moves.push({ from: m.from, to: m.to, promo: m.promo, san });
    }
    syncChips();
  } else {
    me = opts.side === "r" ? (Math.random() < 0.5 ? "w" : "b") : opts.side;
    flipped = opts.mode === "cpu" && me === "b";
  }
  const s = status(st);
  if (s.over) {
    over = s;
    render();
    return;
  }
  render();
  if (isCpuTurn()) computerMove();
}

function undo() {
  if (thinking || moves.length === 0) return;
  requestId += 1;
  // vs computer: take back the computer's reply as well, so it is the human's move again
  let steps = 1;
  if (opts.mode === "cpu" && moves.length >= 2 && st.turn === me) steps = 2;
  else if (opts.mode === "cpu" && moves.length >= 1 && st.turn !== me) steps = 1;
  for (let k = 0; k < steps && moves.length; k += 1) {
    moves.pop();
    states.pop();
  }
  st = states[states.length - 1];
  over = null;
  selected = -1;
  targets = [];
  hintSquares = [];
  $("end").classList.remove("show");
  save();
  render();
  if (isCpuTurn()) computerMove();
}

function resign() {
  if (over || thinking) return;
  const loser = opts.mode === "cpu" ? me : st.turn;
  over = { over: true, result: "resign", winner: loser === "w" ? "b" : "w", loser };
  render();
  finishGame();
}

/* ------------------------------------------------------------- controls */

function syncChips() {
  document.querySelectorAll("#mode .g-chip").forEach((c) => c.setAttribute("aria-pressed", String(c.dataset.value === opts.mode)));
  document.querySelectorAll("#level .g-chip").forEach((c) => c.setAttribute("aria-pressed", String(c.dataset.value === opts.level)));
  document.querySelectorAll("#side .g-chip").forEach((c) => c.setAttribute("aria-pressed", String(c.dataset.value === opts.side)));
  document.querySelectorAll("[data-cpu]").forEach((el) => {
    el.hidden = opts.mode !== "cpu";
  });
}

function wire(id, key) {
  $(id).addEventListener("click", (e) => {
    const chip = e.target.closest(".g-chip");
    if (!chip) return;
    opts[key] = chip.dataset.value;
    syncChips();
    start();
  });
}
wire("mode", "mode");
wire("level", "level");
wire("side", "side");

$("newgame").addEventListener("click", () => start());
$("again").addEventListener("click", () => start());
$("review").addEventListener("click", () => $("end").classList.remove("show"));
$("undo").addEventListener("click", undo);
$("hint").addEventListener("click", showHint);
$("resign").addEventListener("click", resign);
$("flip").addEventListener("click", () => {
  flipped = !flipped;
  render();
});
$("mute").addEventListener("click", (e) => {
  muted = !muted;
  e.currentTarget.textContent = muted ? "Sound Off" : "Sound On";
  e.currentTarget.setAttribute("aria-pressed", String(muted));
});

/* ------------------------------------------------------------------ boot */

buildBoard();
let resume = null;
try {
  const saved = JSON.parse(localStorage.getItem(SAVE_KEY) || "null");
  if (saved && Array.isArray(saved.moves) && saved.moves.length && saved.opts) resume = saved;
} catch (err) {
  resume = null;
}
syncChips();
start({ resume });
window.__chess = { get st() { return st; }, get moves() { return moves; }, get over() { return over; }, clickSquare, toIndex, opts, get thinking() { return thinking; } };
