import { createOnline } from "../../assets/online.js";

const THEMES = {
  Animals: ["🐶", "🐱", "🐭", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯", "🦁", "🐮", "🐷"],
  Fruits: ["🍎", "🍌", "🍇", "🍓", "🍉", "🍑", "🍍", "🥝", "🍒", "🍋", "🥭", "🍐"],
  Vehicles: ["🚗", "🚕", "🚌", "🚑", "🚒", "🚜", "🚲", "✈️", "🚀", "🚂", "🛵", "⛵"],
  Nature: ["🌸", "🌻", "🌈", "⭐", "🌙", "☀️", "🍄", "🌵", "🦋", "🐝", "🐞", "🌊"],
};
const SIZES = { easy: { pairs: 6, cols: 4 }, medium: { pairs: 8, cols: 4 }, hard: { pairs: 12, cols: 6 } };

const $ = (id) => document.getElementById(id);
const boardEl = $("board");
const statsEl = $("stats");
const statusEl = $("status");
const winEl = $("win");

const opts = { theme: "Animals", size: "medium", players: 1 };
const online = () => opts.players === "online";
const two = () => opts.players === 2 || online();
let myIdx = 0; // online: which player I am (0 goes first)
const inbox = [];
let rng = Math.random;
const seeded = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const net = createOnline({
  container: document.querySelector(".g-page"),
  before: document.getElementById("stats"),
  prefix: "zone210-memory-",
  names: ["Goes first", "Goes second"],
  startInfo: () => ({ theme: opts.theme, size: opts.size }),
  onStart: ({ role, seed, info }) => {
    myIdx = role;
    if (info && THEMES[info.theme] && SIZES[info.size]) { opts.theme = info.theme; opts.size = info.size; syncChips(); }
    inbox.length = 0;
    newGame(seed);
  },
  onData: (m) => { if (online() && m && Number.isInteger(m.f)) { inbox.push(m.f); drain(); } },
  onLeft: () => { inbox.length = 0; statusEl.textContent = "Your friend left the game."; },
  // the board itself comes back from the shared seed; this is which cards are face up or matched
  getState: () => ({ done: tiles.map((t, i) => (t.el.classList.contains("done") ? i : -1)).filter((i) => i >= 0), open: [...open], moves, matched, turn, scores, inbox: [...inbox] }),
  setState: (g) => {
    tiles.forEach((t, i) => {
      t.el.classList.remove("open", "done", "miss");
      if (g.done.includes(i)) t.el.classList.add("done");
      if (g.open.includes(i)) { t.el.classList.add("open"); t.el.setAttribute("aria-label", `Card ${i + 1}, ${t.symbol}`); }
    });
    open = [...g.open]; moves = g.moves; matched = g.matched; turn = g.turn; scores = g.scores; busy = false;
    winEl.classList.remove("show");
    inbox.length = 0; inbox.push(...g.inbox);
    if (moves > 0 && !startedAt) startedAt = Date.now();
    renderStats();
    if (matched === SIZES[opts.size].pairs) { win(); return; }
    if (open.length === 2) resolvePair();
    else statusEl.textContent = turn === myIdx ? "Your turn." : "Your friend's turn…";
    drain();
  },
});
function drain() {
  while (online() && !busy && net.active && turn !== myIdx && inbox.length) flip(inbox.shift(), true);
}
const who = (p) => (online() ? (p === myIdx ? "You" : "Friend") : `Player ${p + 1}`);
let tiles = [];
let open = [];
let busy = false;
let moves = 0;
let matched = 0;
let turn = 0;
let scores = [0, 0];
let startedAt = null;
let timer = null;
let muted = false;
let audio = null;

/* ---------- sound (tiny synthesized blips) ---------- */
function beep(freq, dur = 0.12, type = "sine", vol = 0.12) {
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
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(audio.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
  } catch (err) {
    // audio unavailable: ignore
  }
}
const sFlip = () => beep(520, 0.08, "triangle");
const sMatch = () => [660, 880].forEach((f, i) => setTimeout(() => beep(f, 0.14, "sine", 0.14), i * 110));
const sMiss = () => beep(180, 0.18, "sawtooth", 0.06);
const sWin = () => [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => beep(f, 0.22, "triangle", 0.15), i * 130));

/* ---------- setup UI ---------- */
function buildChips(container, entries, key, format = (v) => v) {
  container.innerHTML = "";
  entries.forEach((value) => {
    const b = document.createElement("button");
    b.className = "g-chip";
    b.dataset.value = value;
    b.textContent = format(value);
    b.setAttribute("aria-pressed", String(String(opts[key]) === String(value)));
    container.appendChild(b);
  });
}
buildChips($("theme"), Object.keys(THEMES), "theme", (t) => `${THEMES[t][0]} ${t}`);

function syncChips() {
  [["theme", "theme"], ["size", "size"], ["players", "players"]].forEach(([id, key]) => {
    $(id).querySelectorAll(".g-chip").forEach((c) => c.setAttribute("aria-pressed", String(String(opts[key]) === c.dataset.value)));
  });
  $("restart").hidden = online();
  if (online()) net.open(); else net.close();
}
function wireChips(container, key, numeric = false) {
  container.addEventListener("click", (e) => {
    const chip = e.target.closest(".g-chip");
    if (!chip) return;
    if (online() && net.active && key !== "players") return; // the host's choices apply once a game is under way
    opts[key] = numeric && chip.dataset.value !== "online" ? Number(chip.dataset.value) : chip.dataset.value;
    syncChips();
    newGame();
  });
}
wireChips($("theme"), "theme");
wireChips($("size"), "size");
wireChips($("players"), "players", true);

/* ---------- game flow ---------- */
const shuffle = (a) => {
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

function newGame(seed) {
  rng = typeof seed === "number" ? seeded(seed) : Math.random;
  clearInterval(timer);
  net.setOver(false);
  $("again").textContent = online() ? "Rematch" : "Play again";
  winEl.classList.remove("show");
  const { pairs, cols } = SIZES[opts.size];
  const symbols = shuffle([...THEMES[opts.theme]]).slice(0, pairs);
  tiles = shuffle([...symbols, ...symbols].map((symbol, i) => ({ symbol, id: i })));
  open = [];
  busy = false;
  moves = 0;
  matched = 0;
  turn = 0;
  scores = [0, 0];
  startedAt = null;
  boardEl.style.setProperty("--cols", cols);
  boardEl.innerHTML = "";
  tiles.forEach((t, i) => {
    const b = document.createElement("button");
    b.className = "tile";
    b.setAttribute("role", "gridcell");
    b.setAttribute("aria-label", `Card ${i + 1}, face down`);
    b.innerHTML = `<span class="face back" aria-hidden="true">?</span><span class="face front" aria-hidden="true">${t.symbol}</span>`;
    b.addEventListener("click", () => flip(i));
    boardEl.appendChild(b);
    t.el = b;
  });
  renderStats();
  statusEl.textContent = online() ? (net.active ? (myIdx === 0 ? "Your turn. Pick a card." : "Your friend goes first…") : "Create or join a room to start.") : opts.players === 2 ? "Player 1, pick a card." : "Pick a card to start.";
}

function renderStats() {
  const secs = startedAt ? Math.floor((Date.now() - startedAt) / 1000) : 0;
  const time = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`;
  if (!two()) {
    statsEl.innerHTML = `<div class="g-stat"><b>${moves}</b><span>Moves</span></div>
      <div class="g-stat"><b>${time}</b><span>Time</span></div>
      <div class="g-stat"><b>${matched}/${SIZES[opts.size].pairs}</b><span>Pairs</span></div>`;
  } else {
    statsEl.innerHTML = [0, 1]
      .map((p) => `<div class="turn${turn === p ? " on" : ""}">${who(p)}: ${scores[p]}</div>`)
      .join("") + `<div class="g-stat"><b>${matched}/${SIZES[opts.size].pairs}</b><span>Pairs</span></div>`;
  }
}

function flip(i, remote = false) {
  const t = tiles[i];
  if (busy || t.el.classList.contains("open") || t.el.classList.contains("done")) return;
  if (online()) {
    if (!net.active || (!remote && turn !== myIdx) || (remote && turn === myIdx)) return;
    if (!remote) net.send({ f: i });
  }
  if (!startedAt) {
    startedAt = Date.now();
    timer = setInterval(renderStats, 1000);
  }
  t.el.classList.add("open");
  t.el.setAttribute("aria-label", `Card ${i + 1}, ${t.symbol}`);
  sFlip();
  open.push(i);
  if (open.length < 2) return;

  moves += 1;
  resolvePair();
  renderStats();
}

// two cards are face up: score a match, or turn them back and pass the turn
function resolvePair() {
  busy = true;
  const [a, b] = open;
  if (tiles[a].symbol === tiles[b].symbol) {
    setTimeout(() => {
      [a, b].forEach((k) => {
        tiles[k].el.classList.remove("open");
        tiles[k].el.classList.add("done");
      });
      matched += 1;
      scores[turn] += 1;
      sMatch();
      open = [];
      busy = false;
      renderStats();
      if (matched === SIZES[opts.size].pairs) win();
      else statusEl.textContent = two() ? `Nice! ${online() ? (turn === myIdx ? "You go" : "Your friend goes") : `Player ${turn + 1} goes`} again.` : "A match!";
      drain();
    }, 450);
  } else {
    setTimeout(() => {
      [a, b].forEach((k) => tiles[k].el.classList.add("miss"));
      sMiss();
    }, 350);
    setTimeout(() => {
      [a, b].forEach((k) => {
        tiles[k].el.classList.remove("open", "miss");
        tiles[k].el.setAttribute("aria-label", `Card ${k + 1}, face down`);
      });
      open = [];
      busy = false;
      if (two()) {
        turn = 1 - turn;
        statusEl.textContent = online() ? (turn === myIdx ? "Your turn." : "Your friend's turn…") : `Player ${turn + 1}, your turn.`;
      } else {
        statusEl.textContent = "Not a match. Try again!";
      }
      renderStats();
      drain();
    }, 1000);
  }
}

function win() {
  clearInterval(timer);
  sWin();
  const secs = Math.floor((Date.now() - startedAt) / 1000);
  const pairs = SIZES[opts.size].pairs;
  net.setOver(true);
  if (!two()) {
    const stars = moves <= pairs + 2 ? 3 : moves <= pairs * 2 ? 2 : 1;
    $("winEmoji").textContent = "⭐".repeat(stars);
    $("winTitle").textContent = stars === 3 ? "Amazing memory!" : stars === 2 ? "Great job!" : "You did it!";
    $("winText").textContent = `${moves} moves in ${secs} seconds.`;
  } else {
    const [s1, s2] = scores;
    $("winEmoji").textContent = s1 === s2 ? "🤝" : "🏆";
    $("winTitle").textContent = s1 === s2 ? "It's a tie!" : online() ? ((s1 > s2 ? 0 : 1) === myIdx ? "You win!" : "Your friend wins.") : `Player ${s1 > s2 ? 1 : 2} wins!`;
    $("winText").textContent = `Final score: ${s1} to ${s2}.`;
  }
  setTimeout(() => winEl.classList.add("show"), 600);
}

$("restart").addEventListener("click", () => newGame());
$("again").addEventListener("click", () => { if (online()) { net.rematch(); winEl.classList.remove("show"); } else newGame(); });
$("mute").addEventListener("click", (e) => {
  muted = !muted;
  e.currentTarget.textContent = muted ? "Sound Off" : "Sound On";
  e.currentTarget.setAttribute("aria-pressed", String(muted));
});

newGame();
const invited = net.roomParam();
if (invited) {
  opts.players = "online";
  syncChips();
  newGame();
  net.join(invited);
}
window.__mm = { get tiles() { return tiles; }, get turn() { return turn; }, get scores() { return scores; }, get myIdx() { return myIdx; }, get busy() { return busy; }, get matched() { return matched; }, flip };
