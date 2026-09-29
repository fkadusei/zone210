import { ANSWERS, ALLOWED } from "./words.js";
import { score, dailyWord, dayNumber, shareGrid, keyStates } from "./logic.js";

const $ = (id) => document.getElementById(id);
const boardEl = $("board");
const kbdEl = $("kbd");
const ROWS = 6;
const COLS = 5;
const DAILY_KEY = "gameroom_wordguess_daily";
const STATS_KEY = "gameroom_wordguess_stats";

let mode = "daily";
let answer = "";
let guesses = [];
let scores = [];
let current = "";
let over = false;
let won = false;
let revealing = false;

const read = (key, fallback) => {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch (err) {
    return fallback;
  }
};
const write = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    // storage unavailable
  }
};

/* ---------- board ---------- */
function buildBoard() {
  boardEl.innerHTML = "";
  for (let r = 0; r < ROWS; r += 1) {
    const row = document.createElement("div");
    row.className = "row";
    row.setAttribute("role", "group");
    row.setAttribute("aria-label", `Guess ${r + 1}`);
    for (let c = 0; c < COLS; c += 1) {
      const t = document.createElement("div");
      t.className = "tile";
      t.style.setProperty("--i", c);
      row.appendChild(t);
    }
    boardEl.appendChild(row);
  }
}

const rowEl = (r) => boardEl.children[r];

function paintRow(r, word, result = null, animate = false) {
  const tiles = rowEl(r).children;
  for (let c = 0; c < COLS; c += 1) {
    const t = tiles[c];
    t.textContent = word[c] || "";
    t.className = "tile";
    if (word[c]) t.classList.add("filled");
    if (result) {
      t.classList.remove("filled");
      t.classList.add(result[c]);
      if (animate) t.classList.add("reveal");
    }
    t.setAttribute("aria-label", word[c] ? `${word[c]}${result ? ", " + result[c] : ""}` : "empty");
  }
}

function paintKeyboard() {
  const states = keyStates(guesses, scores);
  kbdEl.querySelectorAll(".key").forEach((k) => {
    const ch = k.dataset.k;
    k.classList.remove("correct", "present", "absent");
    if (states[ch]) k.classList.add(states[ch]);
  });
}

function buildKeyboard() {
  kbdEl.innerHTML = "";
  ["qwertyuiop", "asdfghjkl", "*zxcvbnm<"].forEach((line) => {
    const row = document.createElement("div");
    row.className = "krow";
    [...line].forEach((ch) => {
      const b = document.createElement("button");
      b.className = "key";
      if (ch === "*") {
        b.classList.add("wide");
        b.textContent = "Enter";
        b.dataset.k = "Enter";
      } else if (ch === "<") {
        b.classList.add("wide");
        b.textContent = "⌫";
        b.setAttribute("aria-label", "Backspace");
        b.dataset.k = "Backspace";
      } else {
        b.textContent = ch;
        b.dataset.k = ch;
      }
      b.addEventListener("click", () => press(b.dataset.k));
      row.appendChild(b);
    });
    kbdEl.appendChild(row);
  });
}

function toast(msg) {
  const t = $("toast");
  t.innerHTML = "";
  const s = document.createElement("span");
  s.textContent = msg;
  t.appendChild(s);
}

/* ---------- game ---------- */
function start(nextMode = mode, forceNew = false) {
  mode = nextMode;
  buildBoard();
  guesses = [];
  scores = [];
  current = "";
  over = false;
  won = false;
  revealing = false;
  toast("");
  $("status").textContent = "";
  $("modal").classList.remove("show");

  if (mode === "daily") {
    answer = dailyWord(ANSWERS);
    const saved = read(DAILY_KEY, null);
    if (saved && saved.day === dayNumber()) {
      guesses = saved.guesses;
      scores = guesses.map((g) => score(g, answer));
      over = saved.over;
      won = saved.won;
      guesses.forEach((g, r) => paintRow(r, g, scores[r]));
      if (over) $("status").textContent = won ? "You solved today's word! Come back tomorrow, or try Practice." : `Today's word was ${answer.toUpperCase()}. Try Practice for more.`;
    }
  } else {
    answer = ANSWERS[Math.floor(Math.random() * ANSWERS.length)];
  }
  paintKeyboard();
  if (forceNew) toast("New word!");
}

function press(key) {
  if (over || revealing) return;
  if (key === "Enter") return submit();
  if (key === "Backspace") {
    current = current.slice(0, -1);
  } else if (/^[a-z]$/.test(key) && current.length < COLS) {
    current += key;
  } else {
    return undefined;
  }
  paintRow(guesses.length, current);
  return undefined;
}

function invalid(msg) {
  toast(msg);
  const row = rowEl(guesses.length);
  row.classList.remove("shake");
  void row.offsetWidth;
  row.classList.add("shake");
}

function submit() {
  if (current.length < COLS) return invalid("Not enough letters");
  if (!ALLOWED.has(current)) return invalid("Not in word list");

  const r = guesses.length;
  const result = score(current, answer);
  guesses.push(current);
  scores.push(result);
  paintRow(r, current, result, true);
  revealing = true;
  const word = current;
  current = "";

  setTimeout(() => {
    revealing = false;
    paintKeyboard();
    if (word === answer) {
      won = true;
      over = true;
      [...rowEl(r).children].forEach((t) => t.classList.add("win"));
      toast(["Genius!", "Magnificent!", "Impressive!", "Splendid!", "Great!", "Phew!"][r]);
    } else if (guesses.length === ROWS) {
      over = true;
      toast(answer.toUpperCase());
    }
    if (mode === "daily") write(DAILY_KEY, { day: dayNumber(), guesses, over, won });
    if (over) finish();
  }, COLS * 250 + 250);
  return undefined;
}

function finish() {
  if (mode === "daily") {
    const stats = read(STATS_KEY, { played: 0, wins: 0, streak: 0, best: 0, dist: Array(ROWS).fill(0), lastDay: -1 });
    stats.played += 1;
    if (won) {
      stats.wins += 1;
      stats.streak = stats.lastDay === dayNumber() - 1 ? stats.streak + 1 : 1;
      stats.best = Math.max(stats.best, stats.streak);
      stats.dist[guesses.length - 1] += 1;
    } else {
      stats.streak = 0;
    }
    stats.lastDay = dayNumber();
    write(STATS_KEY, stats);
  }
  setTimeout(() => showStats(true), 1200);
}

function showStats(afterGame = false) {
  const stats = read(STATS_KEY, { played: 0, wins: 0, streak: 0, best: 0, dist: Array(ROWS).fill(0) });
  const pct = stats.played ? Math.round((stats.wins / stats.played) * 100) : 0;
  $("mEmoji").textContent = afterGame ? (won ? "🎉" : "🤔") : "📊";
  $("mTitle").textContent = afterGame ? (won ? "You got it!" : "Next time!") : "Statistics";
  $("mText").textContent = afterGame && !won ? `The word was ${answer.toUpperCase()}.` : afterGame ? `Solved in ${guesses.length} ${guesses.length === 1 ? "try" : "tries"}.` : "Daily-word results on this device.";
  $("statGrid").innerHTML = [[stats.played, "Played"], [`${pct}%`, "Win rate"], [stats.streak, "Streak"], [stats.best, "Best"]]
    .map(([v, l]) => `<div><b>${v}</b><span>${l}</span></div>`)
    .join("");
  const max = Math.max(1, ...stats.dist);
  $("dist").innerHTML = stats.dist
    .map((n, i) => `<div class="bar">${i + 1}<i class="${afterGame && won && guesses.length === i + 1 && mode === "daily" ? "hit" : ""}" style="width:${Math.max(8, (n / max) * 100)}%">${n}</i></div>`)
    .join("");
  $("share").hidden = !(afterGame && over);
  $("next").hidden = !(afterGame && over && mode === "random");
  $("modal").classList.add("show");
}

$("next").addEventListener("click", () => start("random", true));

$("share").addEventListener("click", async () => {
  const head = `Zone 210 Word Guess ${mode === "daily" ? `#${dayNumber()}` : "(practice)"} ${won ? guesses.length : "X"}/${ROWS}`;
  const text = `${head}\n\n${shareGrid(scores)}`;
  try {
    await navigator.clipboard.writeText(text);
    $("share").textContent = "Copied!";
  } catch (err) {
    window.prompt("Copy your result:", text);
  }
  setTimeout(() => {
    $("share").textContent = "Copy result";
  }, 1500);
});

$("stats").addEventListener("click", () => showStats(false));
$("mClose").addEventListener("click", () => $("modal").classList.remove("show"));
$("mode").addEventListener("click", (e) => {
  const chip = e.target.closest(".g-chip");
  if (!chip) return;
  document.querySelectorAll("#mode .g-chip").forEach((c) => c.setAttribute("aria-pressed", String(c === chip)));
  start(chip.dataset.value, chip.dataset.value === "random");
});

document.addEventListener("keydown", (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.key === "Enter") press("Enter");
  else if (e.key === "Backspace") press("Backspace");
  else if (/^[a-zA-Z]$/.test(e.key)) press(e.key.toLowerCase());
});

// Practice mode: a "play again" chip press after a finished round
$("modal").addEventListener("click", (e) => {
  if (e.target === $("modal")) $("modal").classList.remove("show");
});

buildKeyboard();
start("daily");
window.__wg = { get answer() { return answer; }, press, start };
