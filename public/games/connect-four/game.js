import { createOnline } from "../../assets/online.js";
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

const online = () => opts.mode === "online";
let myP = 1; // which colour I play online
const net = createOnline({
  container: document.querySelector(".g-page"),
  before: $("stats"),
  prefix: "zone210-c4-",
  names: ["Red", "Yellow"],
  onStart: ({ role }) => { myP = role + 1; newGame(); },
  onData: (m) => { if (online() && !over && turn === 3 - myP && Number.isInteger(m.c)) place(m.c); },
  onLeft: () => { over = true; setColumnsEnabled(false); statusEl.textContent = "Your friend left the game."; },
  getState: () => ({ board, turn, over }),
  setState: (s) => {
    board = s.board; turn = s.turn; over = s.over; thinking = false;
    discsEl.innerHTML = "";
    let line = null;
    board.forEach((row, r) => row.forEach((p, c) => { if (p) { addDisc(r, c, p); line = line || winLine(board, r, c); } }));
    if (over) {
      if (line) { line.forEach(([r, c]) => discsEl.querySelector(`[data-rc="${r},${c}"]`)?.classList.add("win")); statusEl.textContent = board[line[0][0]][line[0][1]] === myP ? "You win! 🎉" : "Your friend wins."; }
      else statusEl.textContent = "It's a draw.";
      setColumnsEnabled(false);
    } else update();
  },
});
const names = () => (opts.mode === "cpu" ? { 1: "You", 2: "Computer" } : online() ? { [myP]: "You", [3 - myP]: "Friend" } : { 1: "Player 1", 2: "Player 2" });

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
      $("restart").hidden = online();
      if (online()) net.open(); else net.close();
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
  net.setOver(false);
  renderStats();
  statusEl.textContent = "";
  update();
}

function update() {
  const cpuTurn = opts.mode === "cpu" && turn === 2 && !over;
  if (online()) {
    const mine = net.active && turn === myP;
    setColumnsEnabled(!over && mine);
    if (!over) statusEl.innerHTML = !net.active ? "Create or join a room to start." : `<span class="dot p${turn}"></span>${mine ? "Your turn" : "Your friend's turn"}`;
    return;
  }
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
  if (online()) {
    if (!net.active || turn !== myP || dropRow(board, c) < 0) return;
    net.send({ c });
  }
  place(c);
}

function addDisc(r, c, p) {
  const d = document.createElement("div");
  d.className = `disc p${p}`;
  d.style.setProperty("--r", r);
  d.style.setProperty("--c", c);
  d.dataset.rc = `${r},${c}`;
  discsEl.appendChild(d);
}

function place(c) {
  const r = dropRow(board, c);
  if (r < 0) return;
  board[r][c] = turn;
  addDisc(r, c, turn);

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
    statusEl.innerHTML = `<span class="dot p${turn}"></span>${opts.mode === "cpu" ? (turn === 1 ? "You win! 🎉" : "The computer wins.") : online() ? (turn === myP ? "You win! 🎉" : "Your friend wins.") : `${n[turn]} wins! 🎉`}${online() ? "" : ' <button class="g-btn" id="again" style="margin-left:8px">Play again</button>'}`;
  } else {
    wins.draws += 1;
    statusEl.innerHTML = `It's a draw.${online() ? "" : ' <button class="g-btn" id="again" style="margin-left:8px">Play again</button>'}`;
  }
  if (online()) net.setOver(true);
  else $("again").addEventListener("click", () => newGame());
  renderStats();
}

// Keyboard: 1-7 drop in that column
document.addEventListener("keydown", (e) => {
  if (e.key >= "1" && e.key <= "7") humanMove(Number(e.key) - 1);
});

$("restart").addEventListener("click", newGame);
buildColumns();
newGame();

// invite link (?room=CODE): jump straight into online mode and join
const invited = net.roomParam();
if (invited) {
  $("mode").querySelector('[data-value="online"]').click();
  net.join(invited);
}

window.__c4 = { get board() { return board; }, get turn() { return turn; }, get myP() { return myP; }, get over() { return over; } };
