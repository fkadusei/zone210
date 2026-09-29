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

function wireChips(container, key, numeric = false) {
  container.addEventListener("click", (e) => {
    const chip = e.target.closest(".g-chip");
    if (!chip) return;
    container.querySelectorAll(".g-chip").forEach((c) => c.setAttribute("aria-pressed", String(c === chip)));
    opts[key] = numeric ? Number(chip.dataset.value) : chip.dataset.value;
    newGame();
  });
}
wireChips($("theme"), "theme");
wireChips($("size"), "size");
wireChips($("players"), "players", true);

/* ---------- game flow ---------- */
const shuffle = (a) => {
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

function newGame() {
  clearInterval(timer);
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
  statusEl.textContent = opts.players === 2 ? "Player 1, pick a card." : "Pick a card to start.";
}

function renderStats() {
  const secs = startedAt ? Math.floor((Date.now() - startedAt) / 1000) : 0;
  const time = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`;
  if (opts.players === 1) {
    statsEl.innerHTML = `<div class="g-stat"><b>${moves}</b><span>Moves</span></div>
      <div class="g-stat"><b>${time}</b><span>Time</span></div>
      <div class="g-stat"><b>${matched}/${SIZES[opts.size].pairs}</b><span>Pairs</span></div>`;
  } else {
    statsEl.innerHTML = [0, 1]
      .map((p) => `<div class="turn${turn === p ? " on" : ""}">Player ${p + 1}: ${scores[p]}</div>`)
      .join("") + `<div class="g-stat"><b>${matched}/${SIZES[opts.size].pairs}</b><span>Pairs</span></div>`;
  }
}

function flip(i) {
  const t = tiles[i];
  if (busy || t.el.classList.contains("open") || t.el.classList.contains("done")) return;
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
      else statusEl.textContent = opts.players === 2 ? `Nice! Player ${turn + 1} goes again.` : "A match!";
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
      if (opts.players === 2) {
        turn = 1 - turn;
        statusEl.textContent = `Player ${turn + 1}, your turn.`;
      } else {
        statusEl.textContent = "Not a match. Try again!";
      }
      renderStats();
    }, 1000);
  }
  renderStats();
}

function win() {
  clearInterval(timer);
  sWin();
  const secs = Math.floor((Date.now() - startedAt) / 1000);
  const pairs = SIZES[opts.size].pairs;
  if (opts.players === 1) {
    const stars = moves <= pairs + 2 ? 3 : moves <= pairs * 2 ? 2 : 1;
    $("winEmoji").textContent = "⭐".repeat(stars);
    $("winTitle").textContent = stars === 3 ? "Amazing memory!" : stars === 2 ? "Great job!" : "You did it!";
    $("winText").textContent = `${moves} moves in ${secs} seconds.`;
  } else {
    const [s1, s2] = scores;
    $("winEmoji").textContent = s1 === s2 ? "🤝" : "🏆";
    $("winTitle").textContent = s1 === s2 ? "It's a tie!" : `Player ${s1 > s2 ? 1 : 2} wins!`;
    $("winText").textContent = `Final score: ${s1} to ${s2}.`;
  }
  setTimeout(() => winEl.classList.add("show"), 600);
}

$("restart").addEventListener("click", newGame);
$("again").addEventListener("click", newGame);
$("mute").addEventListener("click", (e) => {
  muted = !muted;
  e.currentTarget.textContent = muted ? "Sound Off" : "Sound On";
  e.currentTarget.setAttribute("aria-pressed", String(muted));
});

newGame();
