import { LEVELS, newGame, reveal, toggleFlag, chord, flagsLeft } from "./logic.js";

const $ = (id) => document.getElementById(id);
const fieldEl = $("field");
const statusEl = $("status");
const bestKey = (lvl) => `gameroom_minesweeper_best_${lvl}`;

let level = "easy";
let g;
let squares = [];
let seconds = 0;
let timer = null;
let flagMode = false;
let finished = false;

function build() {
  fieldEl.innerHTML = "";
  fieldEl.style.setProperty("--cols", g.cols);
  squares = [];
  for (let i = 0; i < g.rows * g.cols; i += 1) {
    const b = document.createElement("button");
    b.className = "sq";
    b.dataset.i = i;
    b.setAttribute("role", "gridcell");
    let pressTimer = null;
    let longPressed = false;

    b.addEventListener("pointerdown", (e) => {
      if (e.button === 2) return;
      longPressed = false;
      if (e.pointerType === "touch") {
        pressTimer = setTimeout(() => {
          longPressed = true;
          flag(i);
          navigator.vibrate?.(20);
        }, 450);
      }
    });
    const cancel = () => clearTimeout(pressTimer);
    b.addEventListener("pointerup", cancel);
    b.addEventListener("pointerleave", cancel);
    b.addEventListener("pointercancel", cancel);
    b.addEventListener("click", () => {
      if (longPressed) return; // the long press already flagged it
      if (flagMode && !g.open[i]) flag(i);
      else dig(i);
    });
    b.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      flag(i);
    });
    fieldEl.appendChild(b);
    squares.push(b);
  }
}

function newRound(nextLevel = level) {
  level = nextLevel;
  clearInterval(timer);
  timer = null;
  seconds = 0;
  finished = false;
  g = newGame(level);
  $("end").classList.remove("show");
  statusEl.textContent = "";
  build();
  paint();
  const best = localStorage.getItem(bestKey(level));
  $("best").textContent = best ? `${best}s` : "–";
}

function startTimer() {
  if (timer) return;
  timer = setInterval(() => {
    seconds += 1;
    $("time").textContent = seconds;
  }, 1000);
}

function dig(i) {
  if (finished) return;
  if (g.open[i]) chord(g, i);
  else reveal(g, i);
  if (g.status === "playing" || g.status === "won" || g.status === "lost") startTimer();
  afterMove();
}

function flag(i) {
  if (finished) return;
  toggleFlag(g, i);
  afterMove();
}

function afterMove() {
  paint();
  if (g.status === "won" || g.status === "lost") endGame();
}

function paint() {
  squares.forEach((el, i) => {
    let cls = "sq";
    let text = "";
    if (g.open[i]) {
      cls += " open";
      if (g.mine[i]) {
        cls += i === g.exploded ? " mine boom" : " mine";
        text = "💣";
      } else if (g.count[i]) {
        cls += ` n${g.count[i]}`;
        text = g.count[i];
      }
    } else if (g.flag[i]) {
      text = "🚩";
      if (g.status === "lost" && !g.mine[i]) cls += " wrongflag";
    } else if (g.status === "lost" && g.mine[i]) {
      cls += " open mine";
      text = "💣";
    }
    el.className = cls;
    el.textContent = text;
    el.setAttribute("aria-label", `Row ${Math.floor(i / g.cols) + 1}, column ${(i % g.cols) + 1}, ${g.open[i] ? (g.count[i] ? g.count[i] + " nearby" : "empty") : g.flag[i] ? "flagged" : "hidden"}`);
  });
  $("mines").textContent = flagsLeft(g);
  $("time").textContent = seconds;
}

function endGame() {
  finished = true;
  clearInterval(timer);
  timer = null;
  if (g.status === "won") {
    const prev = Number(localStorage.getItem(bestKey(level)) || 0);
    const record = !prev || seconds < prev;
    if (record) {
      try {
        localStorage.setItem(bestKey(level), String(seconds));
      } catch (err) {
        // ignore
      }
      $("best").textContent = `${seconds}s`;
    }
    $("endEmoji").textContent = "🎉";
    $("endTitle").textContent = "Cleared!";
    $("endText").textContent = `${seconds} seconds${record ? " — a new best time!" : "."}`;
    statusEl.textContent = "You cleared the field!";
  } else {
    $("endEmoji").textContent = "💥";
    $("endTitle").textContent = "Boom!";
    $("endText").textContent = "You hit a mine. Give it another go.";
    statusEl.textContent = "Game over.";
  }
  setTimeout(() => $("end").classList.add("show"), g.status === "won" ? 400 : 700);
}

$("level").addEventListener("click", (e) => {
  const chip = e.target.closest(".g-chip");
  if (!chip) return;
  document.querySelectorAll("#level .g-chip").forEach((c) => c.setAttribute("aria-pressed", String(c === chip)));
  newRound(chip.dataset.value);
});
$("restart").addEventListener("click", () => newRound());
$("again").addEventListener("click", () => newRound());
$("look").addEventListener("click", () => $("end").classList.remove("show"));
$("mode").addEventListener("click", (e) => {
  flagMode = !flagMode;
  e.currentTarget.setAttribute("aria-pressed", String(flagMode));
  e.currentTarget.textContent = flagMode ? "🚩 Flag mode" : "⛏ Dig mode";
});

newRound("easy");
window.__ms = { get g() { return g; }, dig, flag, LEVELS };
