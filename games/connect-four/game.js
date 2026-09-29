import { ROWS, COLS, emptyBoard, dropRow, winLine, legalCols, isFull, chooseMove } from "./logic.js";

const $ = (id) => document.getElementById(id);
const discsEl = $("discs");
const colsEl = $("cols");
const statusEl = $("status");
const statsEl = $("stats");

const opts = { mode: "cpu", level: "normal", first: "me" };
const wins = { 1: 0, 2: 0, draws: 0 };
let board = emptyBoard();
let turn = 1; // 1 = red (you), 2 = yellow
let over = false;
let thinking = false;

const names = () => (opts.mode === "cpu" ? { 1: "You", 2: "Computer" } : { 1: "Player 1", 2: "Player 2" });

/* ---------- setup ---------- */
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
    }
    newGame();
  });
}
wire("mode", "mode");
wire("level", "level");
wire("first", "first");

/* ---------- board ---------- */
function buildColumns() {
  colsEl.innerHTML = "";
  for (let c = 0; c < COLS; c += 1) {
    const b = document.createElement("button");
    b.className = "col";
    b.setAttribute("aria-label", `Drop a disc in column ${c + 1}`);
    b.addEventListener("click", () => humanMove(c));
    colsEl.appendChild(b);
  }
}

function renderStats() {
  const n = names();
  statsEl.innerHTML = `
    <div class="g-stat"><b><span class="dot p1"></span>${wins[1]}</b><span>${n[1]}</span></div>
    <div class="g-stat"><b><span class="dot p2"></span>${wins[2]}</b><span>${n[2]}</span></div>
    <div class="g-stat"><b>${wins.draws}</b><span>Draws</span></div>`;
}

function setColumnsEnabled(on) {
  colsEl.querySelectorAll(".col").forEach((b, c) => {
    b.disabled = !on || board[0][c] !== 0;
    b.style.setProperty("--ghost", turn === 1 ? "#e5484d" : "#f2c230");
  });
}

function say() {
  const n = names();
  statusEl.innerHTML = over ? statusEl.innerHTML : `<span class="dot p${turn}"></span>${turn === 1 && opts.mode === "cpu" ? "Your turn" : `${n[turn]}${opts.mode === "cpu" ? " is thinking…" : "'s turn"}`}`;
}

function newGame() {
  board = emptyBoard();
  over = false;
  thinking = false;
  discsEl.innerHTML = "";
  turn = opts.mode === "cpu" && opts.first === "cpu" ? 2 : 1;
  renderStats();
  statusEl.textContent = "";
  update();
}

function update() {
  const cpuTurn = opts.mode === "cpu" && turn === 2 && !over;
  setColumnsEnabled(!over && !cpuTurn);
  if (!over) {
    const n = names();
    statusEl.innerHTML = `<span class="dot p${turn}"></span>${cpuTurn ? "Computer is thinking…" : opts.mode === "cpu" ? "Your turn" : `${n[turn]}'s turn`}`;
  }
  if (cpuTurn && !thinking) {
    thinking = true;
    // let the disc animation finish and feel a little human
    setTimeout(() => {
      const c = chooseMove(board, 2, opts.level);
      thinking = false;
      if (!over) place(c);
    }, 650);
  }
}

function humanMove(c) {
  if (over || thinking || (opts.mode === "cpu" && turn === 2)) return;
  place(c);
}

function place(c) {
  const r = dropRow(board, c);
  if (r < 0) return;
  board[r][c] = turn;
  const d = document.createElement("div");
  d.className = `disc p${turn}`;
  d.style.setProperty("--r", r);
  d.style.setProperty("--c", c);
  d.dataset.rc = `${r},${c}`;
  discsEl.appendChild(d);

  const line = winLine(board, r, c);
  if (line) return finish(line);
  if (isFull(board)) return finish(null);
  turn = 3 - turn;
  update();
  return undefined;
}

function finish(line) {
  over = true;
  setColumnsEnabled(false);
  const n = names();
  if (line) {
    line.forEach(([r, c]) => discsEl.querySelector(`[data-rc="${r},${c}"]`)?.classList.add("win"));
    wins[turn] += 1;
    statusEl.innerHTML = `<span class="dot p${turn}"></span>${opts.mode === "cpu" ? (turn === 1 ? "You win! 🎉" : "The computer wins.") : `${n[turn]} wins! 🎉`} <button class="g-btn" id="again" style="margin-left:8px">Play again</button>`;
  } else {
    wins.draws += 1;
    statusEl.innerHTML = `It's a draw. <button class="g-btn" id="again" style="margin-left:8px">Play again</button>`;
  }
  $("again").addEventListener("click", () => {
    // loser (or player 1 on a draw) opens the next game
    newGame();
  });
  renderStats();
}

// Keyboard: 1-7 drop in that column
document.addEventListener("keydown", (e) => {
  if (e.key >= "1" && e.key <= "7") humanMove(Number(e.key) - 1);
});

$("restart").addEventListener("click", newGame);
buildColumns();
newGame();
