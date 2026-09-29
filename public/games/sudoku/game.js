import { generate, conflicts, CLUES } from "./logic.js";

const $ = (id) => document.getElementById(id);
const gridEl = $("grid");
const statusEl = $("status");
const KEY = "gameroom_sudoku_save";

let level = "medium";
let puzzle = [];
let solution = [];
let grid = [];
let notes = []; // Array of Set<number>
let history = [];
let selected = -1;
let notesMode = false;
let hints = 0;
let elapsed = 0;
let timer = null;
let solved = false;

const cells = [];
for (let i = 0; i < 81; i += 1) {
  const b = document.createElement("button");
  b.className = "cell";
  b.dataset.i = i;
  b.setAttribute("role", "gridcell");
  b.addEventListener("click", () => select(i));
  gridEl.appendChild(b);
  cells.push(b);
}
const pad = $("pad");
for (let d = 1; d <= 9; d += 1) {
  const b = document.createElement("button");
  b.innerHTML = `${d}<small></small>`;
  b.dataset.d = d;
  b.setAttribute("aria-label", `Place ${d}`);
  b.addEventListener("click", () => enter(d));
  pad.appendChild(b);
}

const peers = (i) => {
  const r = Math.floor(i / 9);
  const c = i % 9;
  const out = new Set();
  for (let k = 0; k < 9; k += 1) {
    out.add(r * 9 + k);
    out.add(k * 9 + c);
  }
  const br = Math.floor(r / 3) * 3;
  const bc = Math.floor(c / 3) * 3;
  for (let dr = 0; dr < 3; dr += 1) for (let dc = 0; dc < 3; dc += 1) out.add((br + dr) * 9 + bc + dc);
  out.delete(i);
  return out;
};

function fmt(s) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify({ level, puzzle, solution, grid, notes: notes.map((n) => [...n]), hints, elapsed, solved }));
  } catch (err) {
    // storage unavailable
  }
}

function render(wrongSet = new Set()) {
  const bad = conflicts(grid);
  const pr = selected >= 0 ? peers(selected) : new Set();
  const sv = selected >= 0 ? grid[selected] : 0;
  cells.forEach((el, i) => {
    const v = grid[i];
    el.className = "cell";
    if (puzzle[i]) el.classList.add("given");
    if (i === selected) el.classList.add("selected");
    else if (sv && v === sv) el.classList.add("same");
    else if (pr.has(i)) el.classList.add("peer");
    if (bad.has(i)) el.classList.add("bad");
    if (wrongSet.has(i)) el.classList.add("wrong");
    if (!puzzle[i] && v && v === solution[i] && hintCells.has(i)) el.classList.add("hinted");
    if (v) {
      el.textContent = v;
    } else if (notes[i].size) {
      el.innerHTML = `<div class="notes">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => `<span>${notes[i].has(d) ? d : ""}</span>`).join("")}</div>`;
    } else {
      el.textContent = "";
    }
    el.setAttribute("aria-label", `Row ${Math.floor(i / 9) + 1}, column ${(i % 9) + 1}, ${v ? v : "empty"}${puzzle[i] ? ", given" : ""}`);
  });
  // number pad remaining counts
  const counts = Array(10).fill(0);
  grid.forEach((v) => {
    counts[v] += 1;
  });
  pad.querySelectorAll("button").forEach((b) => {
    const d = Number(b.dataset.d);
    const left = 9 - counts[d];
    b.querySelector("small").textContent = left > 0 ? left : "";
    b.disabled = left <= 0;
  });
  $("left").textContent = grid.filter((v) => !v).length;
  $("hints").textContent = hints;
  $("time").textContent = fmt(elapsed);
  $("undo").disabled = history.length === 0;
  $("notes").setAttribute("aria-pressed", String(notesMode));
  $("notes").textContent = `Notes: ${notesMode ? "on" : "off"}`;
}

const hintCells = new Set();

function startTimer() {
  if (timer || solved) return;
  timer = setInterval(() => {
    elapsed += 1;
    $("time").textContent = fmt(elapsed);
    if (elapsed % 5 === 0) save();
  }, 1000);
}

function newPuzzle(fresh = true) {
  clearInterval(timer);
  timer = null;
  $("win").classList.remove("show");
  solved = false;
  hintCells.clear();
  history = [];
  selected = -1;
  statusEl.textContent = "";
  let restored = null;
  if (!fresh) {
    try {
      restored = JSON.parse(localStorage.getItem(KEY) || "null");
    } catch (err) {
      restored = null;
    }
  }
  if (restored && restored.puzzle?.length === 81 && !restored.solved) {
    ({ level, puzzle, solution, grid, hints, elapsed } = restored);
    notes = restored.notes.map((a) => new Set(a));
    document.querySelectorAll("#level .g-chip").forEach((c) => c.setAttribute("aria-pressed", String(c.dataset.value === level)));
    statusEl.textContent = "Welcome back. Your puzzle was restored.";
  } else {
    const g = generate(level);
    puzzle = g.puzzle;
    solution = g.solution;
    grid = puzzle.slice();
    notes = Array.from({ length: 81 }, () => new Set());
    hints = 0;
    elapsed = 0;
  }
  render();
  save();
}

function select(i) {
  selected = i;
  startTimer();
  render();
}

function pushHistory(i) {
  history.push({ i, v: grid[i], n: new Set(notes[i]), peerNotes: null });
  if (history.length > 200) history.shift();
}

function enter(d) {
  if (selected < 0 || puzzle[selected] || solved) return;
  startTimer();
  const i = selected;
  if (notesMode) {
    if (grid[i]) return;
    pushHistory(i);
    if (notes[i].has(d)) notes[i].delete(d);
    else notes[i].add(d);
  } else {
    pushHistory(i);
    if (grid[i] === d) {
      grid[i] = 0; // tapping the same digit again erases it
    } else {
      grid[i] = d;
      notes[i].clear();
      peers(i).forEach((p) => notes[p].delete(d)); // tidy notes in the row, column and box
    }
  }
  render();
  save();
  checkWin();
}

function erase() {
  if (selected < 0 || puzzle[selected] || solved) return;
  pushHistory(selected);
  grid[selected] = 0;
  notes[selected].clear();
  render();
  save();
}

function undo() {
  const h = history.pop();
  if (!h) return;
  grid[h.i] = h.v;
  notes[h.i] = h.n;
  selected = h.i;
  render();
  save();
}

function hint() {
  if (solved) return;
  let i = selected >= 0 && !puzzle[selected] && grid[selected] !== solution[selected] ? selected : -1;
  if (i < 0) {
    const open = grid.map((v, k) => (v !== solution[k] ? k : -1)).filter((k) => k >= 0);
    if (!open.length) return;
    i = open[Math.floor(Math.random() * open.length)];
  }
  pushHistory(i);
  grid[i] = solution[i];
  notes[i].clear();
  hintCells.add(i);
  hints += 1;
  selected = i;
  startTimer();
  render();
  save();
  checkWin();
}

function check() {
  const wrong = new Set();
  grid.forEach((v, i) => {
    if (v && v !== solution[i]) wrong.add(i);
  });
  render(wrong);
  statusEl.textContent = wrong.size ? `${wrong.size} cell${wrong.size === 1 ? " is" : "s are"} wrong.` : "So far, so good. No mistakes!";
  if (wrong.size) setTimeout(() => render(), 1600);
}

function checkWin() {
  if (grid.some((v, i) => v !== solution[i])) return;
  solved = true;
  clearInterval(timer);
  timer = null;
  selected = -1;
  render();
  $("winText").textContent = `${level[0].toUpperCase() + level.slice(1)} puzzle in ${fmt(elapsed)} with ${hints} hint${hints === 1 ? "" : "s"}.`;
  try {
    localStorage.removeItem(KEY);
  } catch (err) {
    // ignore
  }
  setTimeout(() => $("win").classList.add("show"), 500);
}

// keyboard
document.addEventListener("keydown", (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.key >= "1" && e.key <= "9") return void enter(Number(e.key));
  if (e.key === "Backspace" || e.key === "Delete" || e.key === "0") return void erase();
  if (e.key === "n" || e.key === "N") {
    notesMode = !notesMode;
    return void render();
  }
  const moves = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -9, ArrowDown: 9 };
  if (moves[e.key] !== undefined) {
    e.preventDefault();
    const base = selected < 0 ? 40 : selected;
    const next = base + moves[e.key];
    const wrapsRow = Math.abs(moves[e.key]) === 1 && Math.floor(next / 9) !== Math.floor(base / 9);
    if (next >= 0 && next < 81 && !wrapsRow) select(next);
  }
  return undefined;
});

$("level").addEventListener("click", (e) => {
  const chip = e.target.closest(".g-chip");
  if (!chip) return;
  level = chip.dataset.value;
  document.querySelectorAll("#level .g-chip").forEach((c) => c.setAttribute("aria-pressed", String(c === chip)));
  newPuzzle(true);
});
$("new").addEventListener("click", () => newPuzzle(true));
$("again").addEventListener("click", () => newPuzzle(true));
$("undo").addEventListener("click", undo);
$("erase").addEventListener("click", erase);
$("hint").addEventListener("click", hint);
$("check").addEventListener("click", check);
$("notes").addEventListener("click", () => {
  notesMode = !notesMode;
  render();
});

newPuzzle(false);
window.__sudoku = { get grid() { return grid; }, get solution() { return solution; }, select, enter, CLUES };
