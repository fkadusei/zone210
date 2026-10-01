import { createOnline } from "../../assets/online.js";
import { newState, legalMoves, applyMove, status, chooseMove, owner, seedsOn } from "./logic.js";

const $ = (id) => document.getElementById(id);
const rowN = $("rowN");
const rowS = $("rowS");
const statusEl = $("status");
const winEl = $("win");

const opts = { mode: "cpu", level: "normal", first: "me" };
const online = () => opts.mode === "online";
let myP = 0; // online: 0 = bottom row (moves first), 1 = top row
const inbox = [];
const net = createOnline({
  container: document.querySelector(".g-page"),
  before: document.querySelector(".scores"),
  prefix: "zone210-oware-",
  names: ["Bottom row", "Top row"],
  onStart: ({ role }) => { myP = role; inbox.length = 0; newGame(); },
  onData: (m) => { if (online() && Number.isInteger(m.i)) { inbox.push(m.i); drain(); } },
  onLeft: () => { inbox.length = 0; markPlayable(); say("Your friend left the game."); },
  // a move that is still being sown is saved as "about to happen", so a reload replays it
  getState: () => ({ state, pendI, inbox: [...inbox] }),
  setState: (g) => {
    state = g.state; shown = state.pits.slice(); shownStore = state.store.slice(); busy = false; pendI = null;
    winEl.classList.remove("show");
    inbox.length = 0; inbox.push(...g.inbox);
    paint();
    if (g.pendI !== null && g.pendI !== undefined && legalMoves(state).includes(g.pendI)) { play(g.pendI); return; }
    const st = status(state);
    if (st.over) { finish(st); return; }
    markPlayable(); promptTurn(); drain();
  },
});
let pendI = null; // the pit being sown
function drain() {
  if (!online() || busy || !net.active || status(state).over || state.turn !== 1 - myP || !inbox.length) return;
  const i = inbox.shift();
  if (legalMoves(state).includes(i)) play(i);
}
let state = newState();
let shown = state.pits.slice(); // what the board is currently displaying (updates step by step while sowing)
let shownStore = [0, 0];
let busy = false;
let muted = false;
let audio = null;
const pitEls = [];

const SEED_COLORS = [
  ["#ffd9a0", "#c9852f"], ["#ff9e8a", "#b84532"], ["#a9e6a0", "#3f8f3a"], ["#a9c8ff", "#3c5fb0"], ["#f6efe2", "#a89878"],
];

/* ---------- sound ---------- */
function beep(freq, dur = 0.1, type = "triangle", vol = 0.1) {
  if (muted) return;
  try {
    audio = window.z210Audio ? window.z210Audio.get() : audio || new (window.AudioContext || window.webkitAudioContext)();
    if (!audio) return;
    const t = audio.currentTime;
    const o = audio.createOscillator();
    const g = audio.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(audio.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
  } catch (err) {
    // audio unavailable
  }
}
const sTick = (i) => beep(340 + (i % 6) * 40, 0.07, "triangle", 0.09);
const sCapture = () => [440, 330, 220].forEach((f, i) => setTimeout(() => beep(f, 0.18, "sawtooth", 0.07), i * 90));
const sWin = () => [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => beep(f, 0.24, "triangle", 0.14), i * 140));

/* ---------- board ---------- */
function build() {
  rowN.innerHTML = "";
  rowS.innerHTML = "";
  pitEls.length = 0;
  // North row is drawn right-to-left so sowing runs counter-clockwise: pits 11 ... 6 left to right.
  for (let k = 0; k < 6; k += 1) makePit(11 - k, rowN);
  for (let i = 0; i < 6; i += 1) makePit(i, rowS);
}

function makePit(i, row) {
  const b = document.createElement("button");
  b.className = "pit";
  b.dataset.i = i;
  b.innerHTML = '<div class="seeds"></div><span class="count">0</span>';
  b.addEventListener("click", () => humanMove(i));
  row.appendChild(b);
  pitEls[i] = b;
}

// Deterministic scatter of seeds inside a pit so they look natural and don't jump around.
function seedPos(pit, k) {
  const a = (pit * 7 + k * 2.399963) % (Math.PI * 2); // golden angle
  const r = Math.min(0.9, 0.18 + 0.19 * Math.sqrt(k + 1));
  return [50 + Math.cos(a) * r * 50, 50 + Math.sin(a) * r * 50];
}

function paint() {
  pitEls.forEach((el, i) => {
    const n = shown[i];
    const seeds = el.querySelector(".seeds");
    const drawn = Math.min(n, 18);
    while (seeds.children.length > drawn) seeds.lastChild.remove();
    while (seeds.children.length < drawn) {
      const k = seeds.children.length;
      const s = document.createElement("span");
      s.className = "seed";
      const [x, y] = seedPos(i, k);
      s.style.left = `${x}%`;
      s.style.top = `${y}%`;
      const [c1, c2] = SEED_COLORS[(i + k) % SEED_COLORS.length];
      s.style.setProperty("--s1", c1);
      s.style.setProperty("--s2", c2);
      seeds.appendChild(s);
    }
    el.querySelector(".count").textContent = n;
    el.setAttribute("aria-label", `Pit ${(i % 6) + 1} on ${owner(i) === 0 ? "the bottom" : "the top"} row, ${n} seeds`);
  });
  $("storeS").textContent = shownStore[0];
  $("storeN").textContent = shownStore[1];
}

const names = () => (opts.mode === "cpu" ? ["You", "Computer"] : online() ? (myP === 0 ? ["You (bottom)", "Friend (top)"] : ["Friend (bottom)", "You (top)"]) : ["Player 1 (bottom)", "Player 2 (top)"]);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function markPlayable() {
  const moves = busy || status(state).over ? [] : legalMoves(state);
  const human = (p) => (online() ? net.active && p === myP : opts.mode === "two" || p === 0);
  pitEls.forEach((el, i) => {
    const on = moves.includes(i) && human(state.turn);
    el.classList.toggle("playable", on);
    el.disabled = !on;
  });
  $("scoreS").classList.toggle("turn", state.turn === 0 && !status(state).over);
  $("scoreN").classList.toggle("turn", state.turn === 1 && !status(state).over);
  const n = names();
  $("nameS").textContent = n[0];
  $("nameN").textContent = n[1];
}

function say(text) {
  statusEl.textContent = text;
}

/* ---------- flow ---------- */
function newGame() {
  winEl.classList.remove("show");
  state = newState();
  state.turn = opts.mode === "cpu" && opts.first === "cpu" ? 1 : 0;
  net.setOver(false);
  $("again").textContent = "Play again";
  shown = state.pits.slice();
  shownStore = [0, 0];
  busy = false;
  paint();
  markPlayable();
  promptTurn();
}

function promptTurn() {
  const n = names();
  if (online()) {
    if (!net.active) say("Create or join a room to start.");
    else say(state.turn === myP ? "Your turn. Pick a pit on your side." : "Your friend's turn…");
    return;
  }
  if (opts.mode === "cpu" && state.turn === 1) {
    say("Computer is thinking…");
    busy = true;
    markPlayable();
    setTimeout(async () => {
      const m = chooseMove(state, opts.level);
      busy = false;
      await play(m);
    }, 700);
  } else {
    const must = legalMoves(state).length < state.pits.slice(state.turn * 6, state.turn * 6 + 6).filter((v) => v > 0).length;
    say(opts.mode === "cpu" ? `Your turn. Pick a pit on your side.${must ? " You must feed your opponent." : ""}` : `${n[state.turn]}: pick a pit.${must ? " You must feed your opponent." : ""}`);
  }
}

function humanMove(i) {
  if (busy) return;
  if (!legalMoves(state).includes(i)) return;
  if (opts.mode === "cpu" && state.turn !== 0) return;
  if (online()) {
    if (!net.active || state.turn !== myP) return;
    net.send({ i });
  }
  play(i);
}

async function play(from) {
  busy = true; pendI = from;
  markPlayable();
  const before = state;
  const result = applyMove(state, from);

  // pick up, then sow one seed at a time
  shown[from] = 0;
  paint();
  await sleep(200);
  for (const j of result.path) {
    shown[j] += 1;
    paint();
    pitEls[j].classList.remove("last");
    void pitEls[j].offsetWidth;
    pitEls[j].classList.add("last");
    sTick(j);
    await sleep(210);
  }
  pitEls.forEach((el) => el.classList.remove("last"));

  if (result.captured > 0) {
    result.capturedPits.forEach((j) => pitEls[j].classList.add("capture"));
    sCapture();
    await sleep(500);
    result.capturedPits.forEach((j) => {
      shown[j] = 0;
      pitEls[j].classList.remove("capture");
    });
    shownStore = result.state.store.slice();
    paint();
    say(`${names()[before.turn]} captured ${result.captured}!`);
    await sleep(500);
  }

  state = result.state; pendI = null;
  shown = state.pits.slice();
  shownStore = state.store.slice();
  paint();
  busy = false;

  const st = status(state);
  if (st.over) return finish(st);
  markPlayable();
  promptTurn();
  drain();
  return undefined;
}

function finish(st) {
  // leftover seeds are awarded at the end
  shown = st.final.pits.slice();
  shownStore = st.final.store.slice();
  paint();
  markPlayable();
  const [a, b] = st.final.store;
  const n = names();
  sWin();
  if (st.winner === null) {
    $("winEmoji").textContent = "🤝";
    $("winTitle").textContent = "It's a draw!";
  } else {
    $("winEmoji").textContent = opts.mode === "cpu" && st.winner === 1 ? "🤖" : "🏆";
    $("winTitle").textContent = opts.mode === "cpu" ? (st.winner === 0 ? "You win!" : "The computer wins.") : online() ? (st.winner === myP ? "You win!" : "Your friend wins.") : `${n[st.winner]} wins!`;
  }
  $("winText").textContent = `Final score: ${a} to ${b}.`;
  say(`Game over: ${a} to ${b}.`);
  net.setOver(true);
  $("again").textContent = online() ? "Rematch" : "Play again";
  setTimeout(() => winEl.classList.add("show"), 700);
}

/* ---------- controls ---------- */
function wire(id, key) {
  const container = $(id);
  container.addEventListener("click", (e) => {
    const chip = e.target.closest(".g-chip");
    if (!chip) return;
    container.querySelectorAll(".g-chip").forEach((c) => c.setAttribute("aria-pressed", String(c === chip)));
    opts[key] = chip.dataset.value;
    if (key === "mode") {
      $("levelRow").hidden = opts.mode !== "cpu";
      $("startRow").hidden = opts.mode !== "cpu";
      $("restart").hidden = online();
      if (online()) net.open(); else net.close();
    }
    newGame();
  });
}
wire("mode", "mode");
wire("level", "level");
wire("first", "first");
$("restart").addEventListener("click", newGame);
$("again").addEventListener("click", () => (online() ? net.rematch() : newGame()));
$("mute").addEventListener("click", (e) => {
  muted = !muted;
  e.currentTarget.textContent = muted ? "Sound Off" : "Sound On";
  e.currentTarget.setAttribute("aria-pressed", String(muted));
});

build();
newGame();
// exposed for automated checks
window.__oware = { get state() { return state; }, seedsOn, get myP() { return myP; }, get busy() { return busy; } };

// invite link (?room=CODE)
const invited = net.roomParam();
if (invited) {
  $("mode").querySelector('[data-value="online"]').click();
  net.join(invited);
}
