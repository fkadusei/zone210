import { createOnline } from "../../assets/online.js";
import { newBoard, legalMoves, play, count, chooseMove, other } from "./logic.js";

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
const SETTINGS_KEY = "zone210_reversi_settings";
const settings = { mode: "cpu", level: "normal", first: "me", hints: "on", muted: false, ...store.get(SETTINGS_KEY, {}) };
if (!["cpu", "two", "online"].includes(settings.mode)) settings.mode = "cpu";
if (!["easy", "normal", "hard"].includes(settings.level)) settings.level = "normal";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
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
    amp.gain.exponentialRampToValueAtTime(gain, t + 0.008);
    amp.gain.exponentialRampToValueAtTime(0.0001, t + length);
    osc.connect(amp).connect(audio.destination);
    osc.start(t);
    osc.stop(t + length + 0.02);
  } catch (err) {
    /* audio unavailable */
  }
}
const sfx = {
  place: () => tone(260, 0, 0.08, "triangle", 0.1),
  flip: (k) => tone(420 + k * 40, 0.05 + k * 0.05, 0.06, "sine", 0.06),
  pass: () => tone(200, 0, 0.2, "sawtooth", 0.05),
  win: () => [523, 659, 784, 1046, 784, 1046].forEach((f, i) => tone(f, i * 0.1, 0.24, "triangle", 0.1)),
  lose: () => [330, 262, 196].forEach((f, i) => tone(f, i * 0.16, 0.3, "sawtooth", 0.06)),
};

const online = () => settings.mode === "online";
const cpu = () => settings.mode === "cpu";
let myColor = 1; // online: role 0 = black (moves first)
const net = createOnline({
  container: document.querySelector(".g-page"),
  before: $("scores"),
  prefix: "zone210-reversi-",
  names: ["Black", "White"],
  onStart: ({ role }) => { myColor = role === 0 ? 1 : 2; inbox.length = 0; newGame(); },
  onData: (m) => { if (online() && m && Number.isInteger(m.i)) { inbox.push(m.i); drain(); } },
  onLeft: () => { inbox.length = 0; render(); setStatus("Your friend left the game."); },
  getState: () => ({ board, turn, over, last, passNote, inbox: [...inbox] }),
  setState: (s) => {
    board = s.board.slice(); turn = s.turn; over = s.over; last = s.last; passNote = s.passNote || "";
    busy = false; hist = []; hintCell = -1;
    inbox.length = 0; inbox.push(...s.inbox);
    render(); announce(); drain();
    if (over) { const n = count(board); const w = n.black === n.white ? 0 : n.black > n.white ? 1 : 2; setStatus(w === 0 ? "It's a draw!" : w === myColor ? "You win!" : "Your friend wins.", "good"); }
  },
});
const inbox = [];
function drain() {
  if (!online() || busy || over || !net.active || turn === myColor || !inbox.length) return;
  const i = inbox.shift();
  if (legalMoves(board, turn).has(i)) doMove(i);
}

let board = newBoard();
let turn = 1;
let over = false;
let busy = false;
let hist = [];
let last = -1;
let hintCell = -1;
let passNote = "";
const cells = [];

function humanColor() {
  return cpu() ? (settings.first === "me" ? 1 : 2) : null;
}
const isHumanTurn = () => (online() ? net.active && turn === myColor : cpu() ? turn === humanColor() : true);
const nameOf = (p) => (cpu() ? (p === humanColor() ? "You" : "The computer") : online() ? (p === myColor ? "You" : "Your friend") : p === 1 ? "Black" : "White");

const statusEl = $("status");
const setStatus = (t, kind = "") => {
  statusEl.textContent = t;
  statusEl.className = "g-status" + (kind ? ` ${kind}` : "");
};

function build() {
  const el = $("board");
  el.innerHTML = "";
  cells.length = 0;
  for (let i = 0; i < 64; i += 1) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "cell";
    b.setAttribute("role", "gridcell");
    b.setAttribute("aria-label", `${"abcdefgh"[i % 8]}${Math.floor(i / 8) + 1}`);
    b.addEventListener("click", () => onCell(i));
    el.appendChild(b);
    cells.push(b);
  }
}

function render(flippedFrom = -1, flipped = []) {
  const moves = over || busy || !isHumanTurn() ? new Map() : legalMoves(board, turn);
  const showHints = settings.hints === "on";
  cells.forEach((c, i) => {
    const v = board[i];
    let d = c.querySelector(".disc");
    if (v && !d) {
      d = document.createElement("div");
      d.className = "disc";
      d.innerHTML = '<div class="f b"></div><div class="f w"></div>';
      c.appendChild(d);
    }
    if (d) {
      d.style.transitionDelay = flipped.includes(i) && flippedFrom >= 0 ? `${Math.max(0, (Math.abs(Math.floor(i / 8) - Math.floor(flippedFrom / 8)) + Math.abs((i % 8) - (flippedFrom % 8)) - 1) * 70)}ms` : "0ms";
      d.dataset.c = v;
    }
    if (!v && d) d.remove();
    const playable = moves.has(i);
    c.className = "cell" + (i === last ? " last" : "") + (playable && showHints ? " hint" : "") + (playable ? " playable" : "") + (i === hintCell ? " best" : "");
    c.disabled = !playable;
  });
  const n = count(board);
  const box = $("scores");
  const who = (p) => (cpu() ? (p === humanColor() ? "You" : "Computer") : online() ? (p === myColor ? "You" : "Friend") : p === 1 ? "Black" : "White");
  box.innerHTML = [1, 2].map((p) => `<div class="score${turn === p && !over ? " turn" : ""}"><span class="chip ${p === 1 ? "b" : "w"}"></span><span class="nm">${who(p)}<small>${p === 1 ? "Black" : "White"}</small></span><b>${p === 1 ? n.black : n.white}</b></div>`).join("");
}

function announce() {
  if (over) return;
  if (online() && !net.active) return setStatus("Create or join a room to start.");
  const moves = legalMoves(board, turn);
  const mine = isHumanTurn();
  const who = nameOf(turn);
  const base = cpu() ? (mine ? "Your move." : "The computer is thinking…") : online() ? (mine ? "Your move." : "Your friend's move…") : `${who}'s move.`;
  setStatus(`${passNote}${base}${mine && moves.size === 1 ? "" : ""}`);
  passNote = "";
}

function newGame() {
  board = newBoard();
  turn = 1;
  over = false;
  busy = false;
  hist = [];
  last = -1;
  hintCell = -1;
  passNote = "";
  $("end").classList.remove("show");
  net.setOver(false);
  $("again").textContent = online() ? "Rematch" : "Play again";
  render();
  announce();
  if (cpu() && turn !== humanColor()) cpuMove();
}

function onCell(i) {
  if (over || busy || !isHumanTurn()) return;
  const moves = legalMoves(board, turn);
  if (!moves.has(i)) return;
  if (online()) net.send({ i });
  doMove(i);
}

async function doMove(i) {
  busy = true;
  hintCell = -1;
  hist.push({ board: board.slice(), turn, last });
  const res = play(board, i, turn);
  board = res.board;
  last = i;
  sfx.place();
  res.flipped.forEach((_, k) => sfx.flip(Math.min(k, 6)));
  render(i, res.flipped);
  await sleep(300 + Math.min(res.flipped.length, 6) * 70);
  busy = false;
  advance();
}

function advance() {
  const next = other(turn);
  if (legalMoves(board, next).size) {
    turn = next;
  } else if (legalMoves(board, turn).size) {
    passNote = `${nameOf(next)} ${nameOf(next) === "You" ? "have" : "has"} no move and passes. `;
    sfx.pass();
  } else {
    return finish();
  }
  render();
  announce();
  if (cpu() && turn !== humanColor()) cpuMove();
  drain();
}

function cpuMove() {
  busy = true;
  render();
  setTimeout(() => {
    const i = chooseMove(board, turn, settings.level);
    busy = false;
    if (i >= 0) doMove(i);
  }, 550);
}

function finish() {
  over = true;
  render();
  const n = count(board);
  const diff = n.black - n.white;
  let title;
  let emoji = "🏆";
  if (diff === 0) { title = "It's a draw!"; emoji = "🤝"; sfx.win(); }
  else {
    const w = diff > 0 ? 1 : 2;
    if (cpu()) { title = w === humanColor() ? "You win!" : "The computer wins"; emoji = w === humanColor() ? "🏆" : "🤖"; w === humanColor() ? sfx.win() : sfx.lose(); }
    else if (online()) { title = w === myColor ? "You win!" : "Your friend wins."; w === myColor ? sfx.win() : sfx.lose(); }
    else { title = `${w === 1 ? "Black" : "White"} wins!`; sfx.win(); }
  }
  $("endEmoji").textContent = emoji;
  $("endTitle").textContent = title;
  $("endText").textContent = `Black ${n.black} · White ${n.white}${n.empty ? ` (${n.empty} squares left empty)` : ""}`;
  setStatus(title, "good");
  net.setOver(true);
  setTimeout(() => $("end").classList.add("show"), 600);
}

function undo() {
  if (busy || !hist.length || online()) return;
  let steps = 1;
  if (cpu()) {
    // go back to the last position where it was the human's turn
    steps = 0;
    for (let k = hist.length - 1; k >= 0; k -= 1) { steps += 1; if (hist[k].turn === humanColor()) break; }
  }
  let prev = null;
  for (let k = 0; k < steps && hist.length; k += 1) prev = hist.pop();
  if (!prev) return;
  board = prev.board; turn = prev.turn; last = prev.last; over = false; hintCell = -1; passNote = "";
  $("end").classList.remove("show");
  render(); announce();
}

function showHint() {
  if (over || busy || !isHumanTurn() || online()) return;
  hintCell = chooseMove(board, turn, "normal");
  render();
  setStatus("Hint: the glowing square is a strong move.");
}

// ---------- controls ----------
function syncChips() {
  ["mode", "level", "first", "hints"].forEach((k) => document.querySelectorAll(`#${k} .g-chip`).forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.value === settings[k]))));
  $("levelRow").hidden = !cpu();
  $("colorRow").hidden = !cpu();
  $("undo").hidden = $("hint").hidden = $("newGame").hidden = online();
  if (online()) net.open(); else net.close();
}
["mode", "level", "first", "hints"].forEach((id) =>
  $(id).addEventListener("click", (e) => {
    const chip = e.target.closest(".g-chip");
    if (!chip || settings[id] === chip.dataset.value) return;
    settings[id] = chip.dataset.value;
    store.set(SETTINGS_KEY, settings);
    syncChips();
    if (id === "hints") return render();
    newGame();
  })
);
$("newGame").addEventListener("click", newGame);
$("again").addEventListener("click", () => { if (online()) { net.rematch(); $("end").classList.remove("show"); } else newGame(); });
$("endView").addEventListener("click", () => $("end").classList.remove("show"));
$("undo").addEventListener("click", undo);
$("hint").addEventListener("click", showHint);
const mute = $("mute");
function syncMute() {
  mute.textContent = settings.muted ? "Sound Off" : "Sound On";
  mute.setAttribute("aria-pressed", String(settings.muted));
}
mute.addEventListener("click", () => { settings.muted = !settings.muted; store.set(SETTINGS_KEY, settings); syncMute(); });

build();
syncChips();
syncMute();
newGame();
const invited = net.roomParam();
if (invited) { settings.mode = "online"; syncChips(); newGame(); net.join(invited); }
window.__rv = { legalMoves, play, count, chooseMove, get board() { return board; }, get turn() { return turn; }, get over() { return over; }, get busy() { return busy; }, get myColor() { return myColor; }, onCell, setBoard: (b, t) => { board = b; turn = t; over = false; busy = false; render(); announce(); } };
