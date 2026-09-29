/**
 * Chess controller: owns the game state and wires together the rules (logic.js), the computer (ai-worker.js),
 * the board views (3D or 2D), clocks, sounds, saved games and online rooms (peer-to-peer).
 */
import { newGame, legalMoves, play, status, toSAN, toFEN, findMove, inCheck, isWhite } from "./logic.js";
import * as p2p from "../../assets/p2p.js";

const $ = (id) => document.getElementById(id);
const SAVE_KEY = "zone210_chess_save";
const ROOM_KEY = "zone210_chess_room"; // sessionStorage: lets a reload rejoin the same online game
const VIEW_KEY = "zone210_chess_view";
const PREFIX = "zone210-chess-";

const GLYPH = { K: "♚", Q: "♛", R: "♜", B: "♝", N: "♞", P: "♟︎" };
const VALUE = { P: 1, N: 3, B: 3, R: 5, Q: 9, K: 0 };
const START_COUNT = { P: 8, N: 2, B: 2, R: 2, Q: 1, K: 1 };
const REACTIONS = ["👍", "😂", "😮", "😡", "👏", "🔥"];
const PHRASES = ["Good game!", "Nice move!", "Oops!", "Your move!"];

const opts = { mode: "cpu", level: "normal", side: "w", time: 0, view: "3d" };
let me = "w"; // the human's colour (vs computer / online)
let st = newGame();
let states = [st];
let moves = []; // [{ from, to, promo, san }]
let selected = -1;
let targets = [];
let hintSquares = [];
let flipped = false;
let thinking = false;
let animating = false;
let over = null;
let started = true; // false while an online room is waiting for the game to begin
let muted = false;
let audio = null;
let requestId = 0;
let worker = null;
let workerBroken = false;
let view = null;
let inbox = [];

/* ================================================================== sound */

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
const sMove = () => {
  beep(190, 0.08, "sine", 0.16);
  setTimeout(() => beep(320, 0.05, "triangle", 0.05), 20);
};
const sCapture = () => {
  beep(140, 0.12, "sawtooth", 0.09);
  setTimeout(() => beep(95, 0.14, "sawtooth", 0.08), 55);
};
const sCheck = () => beep(700, 0.16, "square", 0.05);
const sEnd = () => [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => beep(f, 0.22, "triangle", 0.12), i * 120));
const sPing = () => beep(880, 0.1, "sine", 0.08);

/* ================================================================== views */

function detectWebGL() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch (err) {
    return false;
  }
}

async function mountView(kind) {
  const stage = $("stage");
  if (view) view.dispose();
  view = null;
  stage.querySelectorAll("canvas, .board2d").forEach((n) => n.remove());
  $("stageLoading").hidden = false;
  let want = kind;
  if (want === "3d" && !detectWebGL()) want = "2d";
  try {
    if (want === "3d") {
      const { createView3D } = await import("./view3d.js");
      view = createView3D(stage, { onSquare: clickSquare });
      stage.classList.remove("is2d");
    } else {
      const { createView2D } = await import("./view2d.js");
      view = createView2D(stage, { onSquare: clickSquare });
      stage.classList.add("is2d");
    }
  } catch (err) {
    // three.js could not be loaded (offline or blocked): fall back to the flat board
    const { createView2D } = await import("./view2d.js");
    view = createView2D(stage, { onSquare: clickSquare });
    stage.classList.add("is2d");
    want = "2d";
    banner("The 3D board couldn't load, so this is the flat board.", true);
  }
  $("stageLoading").hidden = true;
  view.setFlipped(flipped, false);
  render({ instant: true });
  if (want === "3d") view.intro();
  document.querySelectorAll("#view .g-chip").forEach((c) => c.setAttribute("aria-pressed", String(c.dataset.value === want)));
}

/* ============================================================== game flow */

const iAmPlaying = () => opts.mode === "two" || st.turn === me;
const isCpuTurn = () => opts.mode === "cpu" && st.turn !== me && !over;
const timeEnabled = () => opts.time > 0;

function canMoveNow() {
  if (over || thinking || animating || !started) return false;
  if ($("promo").classList.contains("show")) return false;
  if (opts.mode === "online" && (!net.connected || net.opponentAway)) return false;
  return iAmPlaying();
}

function viewState() {
  const pick = new Set();
  if (canMoveNow()) {
    for (const m of legalMoves(st)) pick.add(m.from);
    targets.forEach((t) => pick.add(t));
  }
  const capTargets = legalMoves(st).filter((m) => m.from === selected && (m.capture || m.flag === "ep")).map((m) => m.to);
  return {
    board: st.board,
    selected,
    targets,
    capTargets,
    last: moves.length ? { from: moves[moves.length - 1].from, to: moves[moves.length - 1].to } : null,
    checkSq: inCheck(st) ? st.king[st.turn] : -1,
    hint: hintSquares,
    pickable: [...pick],
  };
}

function render({ instant = false } = {}) {
  if (view) view.update(viewState(), { instant });
  renderBars();
  renderMoves();
  renderStatus();
  const online = opts.mode === "online";
  $("undo").hidden = online;
  $("undo").disabled = online || timeEnabled() || moves.length === 0 || thinking || animating || (opts.mode === "cpu" && me === "b" && moves.length <= 1);
  $("hint").hidden = online;
  $("hint").disabled = !!over || thinking || animating || !started || !iAmPlaying();
  $("draw").hidden = !online;
  $("draw").disabled = !!over || !started || !net.connected;
  $("resign").disabled = !!over || thinking || !started;
  $("reactBox").hidden = !online;
}

function capturedFor(color) {
  const count = {};
  for (const p of st.board) if (p && (isWhite(p) ? "w" : "b") === color) count[p.toUpperCase()] = (count[p.toUpperCase()] || 0) + 1;
  const out = [];
  for (const t of ["Q", "R", "B", "N", "P"]) for (let k = 0; k < Math.max(0, START_COUNT[t] - (count[t] || 0)); k += 1) out.push(t);
  return out;
}
const materialOf = (color) => st.board.reduce((s, p) => (p && (isWhite(p) ? "w" : "b") === color ? s + VALUE[p.toUpperCase()] : s), 0);

function nameOf(color) {
  if (opts.mode === "two") return color === "w" ? "White" : "Black";
  if (opts.mode === "online") return color === me ? "You" : started ? "Opponent" : "Waiting…";
  return color === me ? "You" : "Computer";
}

function renderBars() {
  const top = flipped ? "w" : "b";
  const bottom = flipped ? "b" : "w";
  const fill = (el, color) => {
    const lost = capturedFor(color === "w" ? "b" : "w");
    const adv = materialOf(color) - materialOf(color === "w" ? "b" : "w");
    el.className = `player-bar${st.turn === color && !over && started ? " turn" : ""}`;
    el.innerHTML = `<span class="who"><span class="dot ${color}"></span>${nameOf(color)} <small>${color === "w" ? "White" : "Black"}</small></span>
      <span class="right"><span class="captured">${lost.map((t) => `<span class="cp ${color === "w" ? "b" : "w"}">${GLYPH[t]}</span>`).join("")}${adv > 0 ? `<span class="adv">+${adv}</span>` : ""}</span>${
        timeEnabled() ? `<span class="clock" data-clock="${color}">${fmtClock(remaining(color))}</span>` : ""
      }</span>`;
  };
  fill($("topBar"), top);
  fill($("bottomBar"), bottom);
  updateClocks();
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
  if (opts.mode === "online" && !started) {
    el.textContent = net.role ? "Waiting for your opponent…" : "Create a room or join one";
    return;
  }
  const who = st.turn === "w" ? "White" : "Black";
  let text;
  if (opts.mode === "two") text = `${who} to move`;
  else if (opts.mode === "online") text = st.turn === me ? "Your move" : "Opponent's move";
  else text = st.turn === me ? "Your move" : "Computer's move";
  if (inCheck(st)) {
    text += " · Check!";
    el.classList.add("alert");
  }
  el.textContent = text;
}

function banner(text, bad = false) {
  const b = $("banner");
  b.hidden = !text;
  b.textContent = text || "";
  b.classList.toggle("bad", !!bad);
}

function resultText(res) {
  const nameW = res.winner === "w" ? "White" : "Black";
  const loserName = res.winner === "w" ? "Black" : "White";
  const iWon = res.winner === me;
  const solo = opts.mode === "cpu" || opts.mode === "online";
  switch (res.result) {
    case "checkmate":
      return solo
        ? {
            headline: iWon ? "Checkmate: you win!" : opts.mode === "cpu" ? "Checkmate: computer wins" : "Checkmate: you lose",
            emoji: iWon ? "🏆" : opts.mode === "cpu" ? "🤖" : "😔",
            title: iWon ? "You win!" : "Checkmate",
            body: iWon ? "Well played!" : opts.mode === "cpu" ? "The computer won this one. Try again or lower the level." : "Good game!",
          }
        : { headline: `Checkmate: ${nameW} wins`, emoji: "🏆", title: `${nameW} wins!`, body: "Checkmate." };
    case "resign":
      return solo
        ? { headline: iWon ? "Opponent resigned" : "You resigned", emoji: iWon ? "🏆" : "🏳️", title: iWon ? "You win!" : "You resigned", body: iWon ? "Your opponent resigned." : "" }
        : { headline: `${loserName} resigned`, emoji: "🏳️", title: `${nameW} wins!`, body: `${loserName} resigned.` };
    case "timeout":
      return solo
        ? { headline: iWon ? "Won on time" : "Lost on time", emoji: iWon ? "🏆" : "⏱️", title: iWon ? "You win on time!" : "Out of time", body: iWon ? "Your opponent's clock ran out." : "Your clock ran out." }
        : { headline: `${nameW} wins on time`, emoji: "⏱️", title: `${nameW} wins!`, body: `${loserName} ran out of time.` };
    case "agreed":
      return { headline: "Draw agreed", emoji: "🤝", title: "It's a draw", body: "Both players agreed to a draw." };
    default: {
      const reasons = {
        stalemate: "Stalemate: the player to move has no legal move, so it's a draw.",
        insufficient: "Draw: neither side has enough pieces left to checkmate.",
        fifty: "Draw by the fifty-move rule.",
        repetition: "Draw by threefold repetition.",
      };
      return { headline: "Draw", emoji: "🤝", title: "It's a draw", body: reasons[res.result] || "" };
    }
  }
}

/* ================================================================== clocks */

const clock = { w: 0, b: 0, side: null, since: 0 };
let flagSince = 0;

function initClock() {
  clock.w = clock.b = opts.time * 60000;
  clock.side = null;
  flagSince = 0;
}
function clockStop() {
  if (clock.side) {
    clock[clock.side] -= Date.now() - clock.since;
    clock.side = null;
  }
}
function clockStart(side) {
  if (!timeEnabled() || over) return;
  clock.side = side;
  clock.since = Date.now();
  flagSince = 0;
}
const remaining = (side) => Math.max(0, clock[side] - (clock.side === side ? Date.now() - clock.since : 0));
function fmtClock(ms) {
  if (ms < 10000) return `0:${(ms / 1000).toFixed(1).padStart(4, "0")}`;
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
function updateClocks() {
  document.querySelectorAll("[data-clock]").forEach((el) => {
    const c = el.dataset.clock;
    const ms = remaining(c);
    el.textContent = fmtClock(ms);
    el.classList.toggle("run", clock.side === c);
    el.classList.toggle("low", ms < 20000);
  });
}
setInterval(() => {
  if (!timeEnabled() || over || !clock.side) return;
  updateClocks();
  if (remaining(clock.side) > 0) return;
  const loser = clock.side;
  if (opts.mode === "online" && loser !== me) {
    // give the opponent's own client a moment to report its flag before we call it
    if (!flagSince) flagSince = Date.now();
    if (Date.now() - flagSince < 2500) return;
  }
  endByTimeout(loser, true);
}, 200);

function endByTimeout(loser, announce) {
  if (over) return;
  clockStop();
  over = { over: true, result: "timeout", winner: loser === "w" ? "b" : "w" };
  if (announce && opts.mode === "online" && loser === me) netSend({ t: "timeout" });
  render();
  finishGame();
}

/* ============================================================ interaction */

function clickSquare(i) {
  if (!canMoveNow()) return;
  const piece = st.board[i];
  const mine = piece && (isWhite(piece) ? "w" : "b") === st.turn;
  if (selected >= 0 && targets.includes(i)) {
    attempt(selected, i);
    return;
  }
  hintSquares = [];
  if (mine) {
    selected = i;
    targets = legalMoves(st).filter((m) => m.from === i).map((m) => m.to);
    sPing();
  } else {
    selected = -1;
    targets = [];
  }
  render();
}

function attempt(from, to) {
  const options = legalMoves(st).filter((m) => m.from === from && m.to === to);
  if (!options.length) return;
  if (options.length > 1) askPromotion(options.map((m) => m.promo), (promo) => doMove(options.find((m) => m.promo === promo)));
  else doMove(options[0]);
}

const PNAME = { P: "pawn", N: "knight", B: "bishop", R: "rook", Q: "queen", K: "king" };
function askPromotion(choices, done) {
  const row = $("promoRow");
  row.innerHTML = "";
  ["q", "r", "b", "n"].filter((p) => choices.includes(p)).forEach((p) => {
    const b = document.createElement("button");
    b.className = st.turn;
    b.textContent = GLYPH[p.toUpperCase()];
    b.setAttribute("aria-label", `Promote to ${PNAME[p.toUpperCase()]}`);
    b.addEventListener("click", () => {
      $("promo").classList.remove("show");
      done(p);
    });
    row.appendChild(b);
  });
  $("promo").classList.add("show");
}

async function doMove(m, remote = false) {
  if (!m || animating) return;
  animating = true;
  selected = -1;
  targets = [];
  hintSquares = [];
  const san = toSAN(st, m);
  const next = play(st, m);
  clockStop();
  if (opts.mode === "online" && !remote) {
    netSend({ t: "move", n: moves.length, from: m.from, to: m.to, promo: m.promo, clock: { w: clock.w, b: clock.b } });
  }
  render();
  if (m.capture) sCapture();
  else sMove();
  if (view) await view.animateMove(m, st.board);
  moves.push({ from: m.from, to: m.to, promo: m.promo, san });
  st = next;
  states.push(st);
  animating = false;
  if (inCheck(st)) setTimeout(sCheck, 100);
  clockStart(st.turn);
  afterMove();
}

function afterMove() {
  const s = status(st);
  if (s.over) {
    over = s;
    clockStop();
    render();
    finishGame();
    return;
  }
  saveLocal();
  saveRoom();
  render();
  pumpInbox();
  if (isCpuTurn()) computerMove();
}

/* =============================================================== computer */

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

function askEngine(level) {
  const id = (requestId += 1);
  const payload = { id, fen: toFEN(st), hist: st.hist, level };
  return new Promise((resolve) => {
    const w = getWorker();
    const fallback = () => {
      import("./ai.js").then(({ chooseMove }) => {
        setTimeout(() => {
          const m = chooseMove(st, level);
          resolve(m ? { from: m.from, to: m.to, promo: m.promo } : null);
        }, 30);
      });
    };
    if (w) {
      const timer = setTimeout(() => {
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
    } else fallback();
  });
}

async function computerMove() {
  thinking = true;
  $("thinkText").textContent = "Computer is thinking…";
  render();
  const began = Date.now();
  const snapshot = st;
  const reply = await askEngine(opts.level);
  await new Promise((r) => setTimeout(r, Math.max(0, 500 - (Date.now() - began))));
  thinking = false;
  if (snapshot !== st || over) {
    render();
    return;
  }
  const m = reply && findMove(st, reply.from, reply.to, reply.promo);
  if (m) doMove(m);
  else render();
}

async function showHint() {
  if (over || thinking || animating || !iAmPlaying()) return;
  thinking = true;
  $("thinkText").textContent = "Looking for a good move…";
  render();
  const snapshot = st;
  const reply = await askEngine("normal");
  thinking = false;
  if (snapshot !== st || !reply) {
    render();
    return;
  }
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
  }, 5000);
}

/* ============================================================= game flow */

function finishGame() {
  try {
    localStorage.removeItem(SAVE_KEY);
    sessionStorage.removeItem(ROOM_KEY);
  } catch (err) {
    // ignore
  }
  sEnd();
  if (view) view.celebrate(over.winner || null);
  const t = resultText(over);
  $("endEmoji").textContent = t.emoji;
  $("endTitle").textContent = t.title;
  $("endText").textContent = t.body;
  $("again").textContent = opts.mode === "online" ? "Rematch" : "New game";
  $("again").disabled = false;
  rematch.me = false;
  setTimeout(() => $("end").classList.add("show"), 900);
}

function saveLocal() {
  if (opts.mode === "online") return;
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ opts, me, flipped, clock: { w: clock.w, b: clock.b }, moves: moves.map(({ from, to, promo }) => ({ from, to, promo })) }));
  } catch (err) {
    // storage unavailable
  }
}

function replay(list) {
  st = newGame();
  states = [st];
  moves = [];
  for (const r of list) {
    const m = findMove(st, r.from, r.to, r.promo);
    if (!m) break;
    const san = toSAN(st, m);
    st = play(st, m);
    states.push(st);
    moves.push({ from: m.from, to: m.to, promo: m.promo, san });
  }
}

function resetBoardState() {
  requestId += 1;
  thinking = false;
  animating = false;
  over = null;
  selected = -1;
  targets = [];
  hintSquares = [];
  inbox = [];
  $("end").classList.remove("show");
  $("promo").classList.remove("show");
  $("offer").classList.remove("show");
  st = newGame();
  states = [st];
  moves = [];
  banner("");
}

function start({ resume = null } = {}) {
  resetBoardState();
  if (opts.mode === "online") {
    // online games begin when the two players are connected (see the online section)
    started = false;
    initClock();
    flipped = false;
    if (view) view.setFlipped(false, false);
    render({ instant: true });
    return;
  }
  started = true;
  initClock();
  if (resume) {
    Object.assign(opts, resume.opts);
    me = resume.me;
    flipped = !!resume.flipped;
    replay(resume.moves);
    if (resume.clock) {
      clock.w = resume.clock.w;
      clock.b = resume.clock.b;
    }
    syncChips();
    if (moves.length && timeEnabled()) clockStart(st.turn);
  } else {
    me = opts.side === "r" ? (Math.random() < 0.5 ? "w" : "b") : opts.side;
    flipped = opts.mode === "cpu" && me === "b";
  }
  if (view) view.setFlipped(flipped, !resume);
  const s = status(st);
  if (s.over) {
    over = s;
    render({ instant: true });
    return;
  }
  render({ instant: true });
  if (isCpuTurn()) computerMove();
}

function undo() {
  if (thinking || animating || moves.length === 0 || opts.mode === "online" || timeEnabled()) return;
  requestId += 1;
  let steps = 1;
  if (opts.mode === "cpu" && st.turn === me && moves.length >= 2) steps = 2;
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
  saveLocal();
  render({ instant: true });
  if (isCpuTurn()) computerMove();
}

function resign() {
  if (over || thinking || !started) return;
  const loser = opts.mode === "two" ? st.turn : me;
  over = { over: true, result: "resign", winner: loser === "w" ? "b" : "w" };
  clockStop();
  if (opts.mode === "online") netSend({ t: "resign" });
  render();
  finishGame();
}

/* ============================================================== online */

const net = { link: null, role: null, code: null, connected: false, opponentAway: false, conn: null, guestToken: null, hostColor: "w", rematchOpp: false };
const rematch = { me: false };
let lastReact = 0;

const tokenId = (() => {
  try {
    let t = sessionStorage.getItem("zone210_chess_token");
    if (!t) {
      t = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
      sessionStorage.setItem("zone210_chess_token", t);
    }
    return t;
  } catch (err) {
    return Math.random().toString(36).slice(2);
  }
})();

function netSend(msg) {
  if (!net.link) return;
  if (net.role === "host") net.link.broadcast(msg);
  else net.link.send(msg);
}

function lobby(stage) {
  $("lobbyStart").hidden = stage !== "start";
  $("lobbyWait").hidden = stage !== "wait";
  $("lobbyLive").hidden = stage !== "live";
}
const setLobbyError = (msg) => {
  $("onlineError").textContent = msg || "";
};

function saveRoom() {
  if (opts.mode !== "online" || net.role !== "host" || !net.code) return;
  try {
    sessionStorage.setItem(ROOM_KEY, JSON.stringify({ role: "host", code: net.code, hostColor: net.hostColor, time: opts.time, me, moves: moves.map(({ from, to, promo }) => ({ from, to, promo })), clock: { w: clock.w, b: clock.b } }));
  } catch (err) {
    // ignore
  }
}

function leaveOnline({ silent = false } = {}) {
  try {
    net.link?.close();
  } catch (err) {
    // ignore
  }
  Object.assign(net, { link: null, role: null, code: null, connected: false, opponentAway: false, conn: null, guestToken: null, rematchOpp: false });
  try {
    sessionStorage.removeItem(ROOM_KEY);
  } catch (err) {
    // ignore
  }
  lobby("start");
  setLobbyError("");
  banner("");
  if (!silent) start();
}

/** Both players are connected: set up the board, colours and clock and begin. */
function beginOnlineGame({ colorForMe, time, moveList = [], clocks = null, hostColor }) {
  resetBoardState();
  opts.time = time;
  document.querySelectorAll("#time .g-chip").forEach((c) => c.setAttribute("aria-pressed", String(Number(c.dataset.value) === time)));
  me = colorForMe;
  net.hostColor = hostColor;
  started = true;
  initClock();
  if (moveList.length) replay(moveList);
  if (clocks) {
    clock.w = clocks.w;
    clock.b = clocks.b;
  }
  flipped = me === "b";
  net.connected = true;
  net.opponentAway = false;
  banner("");
  lobby("live");
  $("livePill").textContent = `Online · Room ${net.code}`;
  $("livePill").classList.remove("off");
  $("liveMsg").textContent = `You are ${me === "w" ? "White" : "Black"}`;
  if (view) view.setFlipped(flipped, moveList.length === 0);
  if (moveList.length && timeEnabled()) clockStart(st.turn);
  const s = status(st);
  if (s.over) over = s;
  render({ instant: true });
  saveRoom();
}

async function createRoom(rehost = null) {
  setLobbyError("");
  $("createRoom").disabled = true;
  try {
    net.link = await p2p.hostRoom({ onConnect: () => {}, onData: hostOnData, onClose: hostOnClose }, { prefix: PREFIX, code: rehost ? rehost.code : null });
    net.role = "host";
    net.code = net.link.code;
    lobby("wait");
    $("roomCode").textContent = net.code;
    if (rehost) {
      net.guestToken = null; // the guest identifies itself again when it reconnects
      opts.time = rehost.time;
      net.hostColor = rehost.hostColor;
      me = rehost.me;
      resetBoardState();
      replay(rehost.moves);
      if (rehost.clock) {
        clock.w = rehost.clock.w;
        clock.b = rehost.clock.b;
      }
      started = true;
      flipped = me === "b";
      net.connected = false;
      net.opponentAway = true;
      $("lobbyMsg").textContent = "Waiting for your opponent to reconnect…";
      if (view) view.setFlipped(flipped, false);
      render({ instant: true });
    } else {
      $("lobbyMsg").textContent = "Waiting for your friend to join…";
      saveRoom();
      render();
    }
  } catch (err) {
    setLobbyError(err.message || "Could not create a room.");
    lobby("start");
    if (rehost) {
      try {
        sessionStorage.removeItem(ROOM_KEY);
      } catch (e) {
        // ignore
      }
    }
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
    const inProgress = !!net.guestToken || started;
    net.guestToken = token;
    net.conn = conn;
    if (!inProgress) {
      // first time: decide the colours and start
      const mine = opts.side === "r" ? (Math.random() < 0.5 ? "w" : "b") : opts.side;
      net.connected = true;
      beginOnlineGame({ colorForMe: mine, time: opts.time, hostColor: mine });
      net.link.sendTo(conn, { t: "welcome", color: mine === "w" ? "b" : "w", time: opts.time, moves: [], clocks: null });
    } else {
      net.connected = true;
      net.opponentAway = false;
      banner("");
      lobby("live");
      $("livePill").textContent = `Online · Room ${net.code}`;
      $("livePill").classList.remove("off");
      $("liveMsg").textContent = `You are ${me === "w" ? "White" : "Black"}`;
      net.link.sendTo(conn, { t: "welcome", color: me === "w" ? "b" : "w", time: opts.time, moves: moves.map(({ from, to, promo }) => ({ from, to, promo })), clocks: { w: clock.w, b: clock.b } });
      if (clock.side === null && timeEnabled() && moves.length && !over) clockStart(st.turn);
      render();
    }
    return;
  }
  if (conn !== net.conn) return;
  handlePeerMessage(msg);
}

function hostOnClose(conn) {
  if (conn !== net.conn) return;
  net.connected = false;
  net.opponentAway = true;
  $("livePill").textContent = "Opponent disconnected";
  $("livePill").classList.add("off");
  banner("Your opponent disconnected. They can rejoin with the same room code.", true);
  render();
}

async function joinRoom(code, { silent = false } = {}) {
  setLobbyError("");
  const clean = p2p.normalizeCode(code);
  if (clean.length !== 5) {
    setLobbyError("Enter the 5-letter room code.");
    return false;
  }
  try {
    net.link = await p2p.joinRoom(clean, { onData: guestOnData, onClose: guestOnClose }, { prefix: PREFIX });
    net.role = "guest";
    net.code = clean;
    net.link.send({ t: "hello", token: tokenId });
    lobby("wait");
    $("roomCode").textContent = clean;
    $("lobbyMsg").textContent = "Connecting…";
    try {
      sessionStorage.setItem(ROOM_KEY, JSON.stringify({ role: "guest", code: clean }));
    } catch (e) {
      // ignore
    }
    return true;
  } catch (err) {
    if (!silent) setLobbyError(err.message || "Could not join the room.");
    return false;
  }
}

function guestOnData(msg) {
  if (!msg || typeof msg !== "object") return;
  if (msg.t === "welcome") {
    beginOnlineGame({ colorForMe: msg.color, time: msg.time, moveList: msg.moves || [], clocks: msg.clocks, hostColor: msg.color === "w" ? "b" : "w" });
    return;
  }
  if (msg.t === "reject") {
    setLobbyError(msg.reason || "Could not join.");
    leaveOnline({ silent: true });
    return;
  }
  if (msg.t === "new") {
    beginOnlineGame({ colorForMe: msg.color, time: msg.time, hostColor: msg.color === "w" ? "b" : "w" });
    return;
  }
  handlePeerMessage(msg);
}

let reconnecting = false;
async function guestOnClose() {
  net.connected = false;
  net.opponentAway = true;
  $("livePill").textContent = "Connection lost";
  $("livePill").classList.add("off");
  banner("Connection lost. Trying to reconnect…", true);
  render();
  if (reconnecting || over) return;
  reconnecting = true;
  for (let i = 0; i < 12 && net.role === "guest"; i += 1) {
    await new Promise((r) => setTimeout(r, 3000));
    if (net.role !== "guest") break;
    try {
      net.link?.close();
    } catch (e) {
      // ignore
    }
    if (await joinRoom(net.code, { silent: true })) {
      reconnecting = false;
      return;
    }
  }
  reconnecting = false;
  if (net.role === "guest") banner("Could not reconnect. The host may have left the room.", true);
}

/** Messages that mean the same thing whichever side receives them. */
function handlePeerMessage(msg) {
  switch (msg.t) {
    case "move":
      inbox.push(msg);
      pumpInbox();
      break;
    case "sync-req":
      netSend({ t: "sync", moves: moves.map(({ from, to, promo }) => ({ from, to, promo })), clocks: { w: clock.w, b: clock.b } });
      break;
    case "sync":
      if (!animating) {
        replay(msg.moves);
        clock.w = msg.clocks.w;
        clock.b = msg.clocks.b;
        clockStop();
        if (!over) clockStart(st.turn);
        render({ instant: true });
      }
      break;
    case "resign":
      if (over) break;
      over = { over: true, result: "resign", winner: me };
      clockStop();
      render();
      finishGame();
      break;
    case "timeout":
      if (over) break;
      endByTimeout(me === "w" ? "b" : "w", false);
      break;
    case "draw-offer":
      if (!over) $("offer").classList.add("show");
      break;
    case "draw-accept":
      if (over) break;
      over = { over: true, result: "agreed", winner: null };
      clockStop();
      render();
      finishGame();
      break;
    case "draw-decline":
      banner("Your opponent declined the draw.");
      setTimeout(() => banner(""), 3500);
      $("draw").disabled = false;
      break;
    case "rematch":
      net.rematchOpp = true;
      banner("Your opponent wants a rematch.");
      if (rematch.me) maybeStartRematch();
      break;
    case "react":
      showReaction(msg.k, msg.i);
      break;
    default:
      break;
  }
}

function pumpInbox() {
  if (animating || !inbox.length || over) return;
  const msg = inbox.shift();
  if (msg.n > moves.length) {
    inbox = [];
    netSend({ t: "sync-req" });
    return;
  }
  if (msg.n < moves.length) {
    pumpInbox();
    return;
  }
  const m = findMove(st, msg.from, msg.to, msg.promo);
  if (!m) {
    netSend({ t: "sync-req" });
    return;
  }
  const moverColor = st.turn;
  if (msg.clock && msg.clock[moverColor] !== undefined) clock[moverColor] = msg.clock[moverColor];
  doMove(m, true);
}

function maybeStartRematch() {
  if (net.role !== "host" || !rematch.me || !net.rematchOpp) return;
  const color = net.hostColor === "w" ? "b" : "w"; // swap colours for the rematch
  net.rematchOpp = false;
  rematch.me = false;
  beginOnlineGame({ colorForMe: color, time: opts.time, hostColor: color });
  netSend({ t: "new", color: color === "w" ? "b" : "w", time: opts.time });
}

function requestRematch() {
  rematch.me = true;
  $("again").disabled = true;
  $("again").textContent = "Waiting…";
  netSend({ t: "rematch" });
  if (net.role === "host") maybeStartRematch();
}

function offerDraw() {
  if (over || !net.connected) return;
  netSend({ t: "draw-offer" });
  $("draw").disabled = true;
  banner("Draw offer sent.");
  setTimeout(() => banner(""), 3500);
}

/* reactions are sent as indexes into fixed lists, so nobody can inject text */
function buildReactions() {
  const row = $("reactRow");
  REACTIONS.forEach((e, i) => {
    const b = document.createElement("button");
    b.textContent = e;
    b.setAttribute("aria-label", `React ${e}`);
    b.addEventListener("click", () => sendReaction("e", i));
    row.appendChild(b);
  });
  PHRASES.forEach((t, i) => {
    const b = document.createElement("button");
    b.className = "phrase";
    b.textContent = t;
    b.addEventListener("click", () => sendReaction("p", i));
    row.appendChild(b);
  });
}
function sendReaction(kind, index) {
  if (!net.connected || Date.now() - lastReact < 1200) return;
  lastReact = Date.now();
  netSend({ t: "react", k: kind, i: index });
  showReaction(kind, index, true);
}
function showReaction(kind, index, mine = false) {
  const text = kind === "e" ? REACTIONS[index] : kind === "p" ? PHRASES[index] : null;
  if (!text) return;
  const t = document.createElement("div");
  t.className = "bubble-toast";
  t.textContent = mine ? `You: ${text}` : text;
  $("stage").appendChild(t);
  if (!mine) sPing();
  setTimeout(() => t.remove(), 2700);
}

/* ============================================================== controls */

function syncChips() {
  const set = (id, key) => document.querySelectorAll(`#${id} .g-chip`).forEach((c) => c.setAttribute("aria-pressed", String(String(opts[key]) === c.dataset.value)));
  set("mode", "mode");
  set("level", "level");
  set("side", "side");
  set("time", "time");
  document.querySelectorAll("[data-for]").forEach((el) => {
    el.hidden = !el.dataset.for.split(" ").includes(opts.mode);
  });
  $("onlinePanel").hidden = opts.mode !== "online";
}

function wire(id, key, after) {
  $(id).addEventListener("click", (e) => {
    const chip = e.target.closest(".g-chip");
    if (!chip) return;
    const value = key === "time" ? Number(chip.dataset.value) : chip.dataset.value;
    if (key === "mode" && opts.mode === "online" && value !== "online") leaveOnline({ silent: true });
    if (key === "time" && opts.mode === "online" && net.connected) return; // the clock is fixed once a game is under way
    opts[key] = value;
    syncChips();
    if (after) after();
    else start();
  });
}
wire("mode", "mode", () => {
  if (opts.mode === "online") {
    lobby(net.role ? (net.connected ? "live" : "wait") : "start");
    if (!net.role) start();
  } else start();
});
wire("level", "level");
wire("side", "side");
wire("time", "time");
wire("view", "view", async () => {
  try {
    localStorage.setItem(VIEW_KEY, opts.view);
  } catch (err) {
    // ignore
  }
  await mountView(opts.view);
});

$("newgame").addEventListener("click", () => {
  if (opts.mode === "online" && net.role) {
    if (over) requestRematch();
    return;
  }
  start();
});
$("again").addEventListener("click", () => {
  if (opts.mode === "online" && net.role) requestRematch();
  else {
    $("end").classList.remove("show");
    start();
  }
});
$("review").addEventListener("click", () => $("end").classList.remove("show"));
$("undo").addEventListener("click", undo);
$("hint").addEventListener("click", showHint);
$("resign").addEventListener("click", resign);
$("draw").addEventListener("click", offerDraw);
$("flip").addEventListener("click", () => {
  flipped = !flipped;
  if (view) view.setFlipped(flipped, true);
  render();
});
$("mute").addEventListener("click", (e) => {
  muted = !muted;
  e.currentTarget.textContent = muted ? "Sound Off" : "Sound On";
  e.currentTarget.setAttribute("aria-pressed", String(muted));
});
$("offerYes").addEventListener("click", () => {
  $("offer").classList.remove("show");
  netSend({ t: "draw-accept" });
  over = { over: true, result: "agreed", winner: null };
  clockStop();
  render();
  finishGame();
});
$("offerNo").addEventListener("click", () => {
  $("offer").classList.remove("show");
  netSend({ t: "draw-decline" });
});
$("createRoom").addEventListener("click", () => createRoom());
$("joinForm").addEventListener("submit", (e) => {
  e.preventDefault();
  joinRoom($("joinCode").value);
});
$("joinCode").addEventListener("input", (e) => {
  e.target.value = p2p.normalizeCode(e.target.value);
});
$("leaveRoom").addEventListener("click", () => leaveOnline());
$("leaveLive").addEventListener("click", () => leaveOnline());
$("copyLink").addEventListener("click", async () => {
  const link = `${location.origin}${location.pathname}?room=${net.code}`;
  try {
    await navigator.clipboard.writeText(link);
    $("copyLink").textContent = "Copied!";
  } catch (err) {
    window.prompt("Copy this invite link:", link);
  }
  setTimeout(() => {
    $("copyLink").textContent = "Copy invite link";
  }, 1600);
});
window.addEventListener("beforeunload", () => saveLocal());

/* ================================================================== boot */

async function boot() {
  buildReactions();
  try {
    const v = localStorage.getItem(VIEW_KEY);
    if (v === "2d" || v === "3d") opts.view = v;
  } catch (err) {
    // ignore
  }
  const invite = p2p.normalizeCode(new URLSearchParams(location.search).get("room"));
  let room = null;
  try {
    room = JSON.parse(sessionStorage.getItem(ROOM_KEY) || "null");
  } catch (err) {
    room = null;
  }
  let resume = null;
  try {
    const saved = JSON.parse(localStorage.getItem(SAVE_KEY) || "null");
    if (saved && Array.isArray(saved.moves) && saved.moves.length && saved.opts) resume = saved;
  } catch (err) {
    resume = null;
  }

  syncChips();
  await mountView(opts.view);

  if (invite || room) {
    opts.mode = "online";
    syncChips();
    lobby("start");
    start();
    if (room && room.role === "host" && !invite) {
      await createRoom(room);
    } else {
      const code = invite || room.code;
      $("joinCode").value = code;
      await joinRoom(code);
    }
    return;
  }
  start({ resume });
}

boot();
window.__chess = {
  get st() { return st; },
  get moves() { return moves; },
  get over() { return over; },
  get thinking() { return thinking; },
  get animating() { return animating; },
  get view() { return view; },
  get net() { return net; },
  opts,
  clickSquare,
  clock,
};
