// ---- puzzle engine: layout generation, solving and validation ----
let generationToken = 0;
let solveToken = 0;

function cellId(row, col) {
  return `r${row}c${col}`;
}

function buildCrosswordEquations(grid) {
  const size = grid.length;
  const equations = [];

  for (let r = 0; r < size; r += 2) {
    collectSequences(grid, r, true).forEach((seq) => equations.push(seq));
  }

  for (let c = 0; c < size; c += 2) {
    collectSequences(grid, c, false).forEach((seq) => equations.push(seq));
  }

  return equations;
}

function collectSequences(grid, index, isRow) {
  const size = grid.length;
  const sequences = [];
  let current = [];

  for (let i = 0; i < size; i += 1) {
    const r = isRow ? index : i;
    const c = isRow ? i : index;
    const cell = grid[r][c];

    if (cell === null) {
      pushSequence(sequences, current, grid);
      current = [];
      continue;
    }

    current.push(cellId(r, c));
  }

  pushSequence(sequences, current, grid);
  return sequences;
}

function pushSequence(sequences, seq, grid) {
  if (seq.length < 5 || seq.length % 2 === 0) return;
  let eqCount = 0;

  for (let i = 0; i < seq.length; i += 1) {
    const [r, c] = seq[i]
      .replace("r", "")
      .split("c")
      .map((n) => Number(n));
    const cell = grid[r][c];
    if (i % 2 === 0) {
      if (r % 2 !== 0 || c % 2 !== 0) return;
    } else {
      if (!["+", "-", "="].includes(cell)) return;
      if (cell === "=") eqCount += 1;
    }
  }

  if (eqCount === 1) {
    sequences.push(seq);
  }
}

function isGridConnected(grid) {
  const rows = grid.length;
  const cols = grid[0]?.length || 0;
  let start = null;
  let total = 0;

  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      if (grid[r][c] !== null) {
        total += 1;
        if (!start) start = [r, c];
      }
    }
  }

  if (!start) return false;

  const queue = [start];
  const visited = new Set([cellId(start[0], start[1])]);
  const deltas = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];

  while (queue.length) {
    const [r, c] = queue.shift();
    deltas.forEach(([dr, dc]) => {
      const nr = r + dr;
      const nc = c + dc;
      if (nr < 0 || nc < 0 || nr >= rows || nc >= cols) return;
      if (grid[nr][nc] === null) return;
      const key = cellId(nr, nc);
      if (visited.has(key)) return;
      visited.add(key);
      queue.push([nr, nc]);
    });
  }

  return visited.size === total;
}

function validatePuzzle(data) {
  if (!Array.isArray(data.grid)) return "Grid must be an array.";
  const rowLength = data.grid[0]?.length || 0;
  if (rowLength < 5) return "Grid must be at least 5x5.";
  if (rowLength % 2 === 0) return "Grid size must be an odd number.";
  if (!data.grid.every((row) => Array.isArray(row) && row.length === rowLength)) {
    return "Grid rows must be the same length.";
  }
  if (!isGridConnected(data.grid)) return "All tiles must be connected.";

  for (let r = 0; r < rowLength; r += 1) {
    for (let c = 0; c < rowLength; c += 1) {
      const cell = data.grid[r][c];
      const isOddOdd = r % 2 === 1 && c % 2 === 1;
      if (isOddOdd) {
        if (cell !== null) return "Odd-odd cells must be empty.";
        continue;
      }

      const isNumberSlot = r % 2 === 0 && c % 2 === 0;
      if (isNumberSlot) {
        if (cell === null) continue;
        if (cell !== "." && Number.isNaN(Number(cell))) {
          return "Number slots must be numbers or empty.";
        }
        continue;
      }

      if (cell !== null && cell !== "+" && cell !== "-" && cell !== "=") {
        return "Operator slots must be +, -, or =.";
      }
    }
  }

  const emptyCount = countEmptyCells(data.grid);
  if (data.bank.length !== emptyCount) {
    return `Bank size (${data.bank.length}) must equal empty cells (${emptyCount}).`;
  }

  return null;
}

function countEmptyCells(grid) {
  return grid.flat().filter((cell) => cell === ".").length;
}

function evaluateEquationWithGrid(grid, tokens) {
  const values = tokens.map((token) => getGridValue(grid, token));
  const eqIndex = values.indexOf("=");
  if (eqIndex === -1 || values.filter((val) => val === "=").length > 1) {
    return false;
  }

  const left = values.slice(0, eqIndex);
  const right = values.slice(eqIndex + 1);

  const leftEval = evaluateExpression(left);
  const rightEval = evaluateExpression(right);

  if (!leftEval.valid || !rightEval.valid) return false;
  if (!leftEval.complete || !rightEval.complete) return false;
  return leftEval.value === rightEval.value;
}

function getGridValue(grid, token) {
  const [row, col] = token
    .replace("r", "")
    .split("c")
    .map((n) => Number(n));
  const cell = grid[row][col];
  if (cell === null) return null;
  if (cell === "=" || cell === "-" || cell === "+") return cell;
  return Number(cell);
}

function evaluateExpression(tokens) {
  if (tokens.length === 0) return { valid: false };
  const expectsNumberAt = (index) => index % 2 === 0;

  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (expectsNumberAt(i)) {
      if (token === null) continue;
      if (typeof token !== "number") return { valid: false };
    } else if (token !== "+" && token !== "-") {
      return { valid: false };
    }
  }

  const hasNull = tokens.some((token, index) => expectsNumberAt(index) && token === null);
  if (hasNull) return { valid: true, complete: false };

  let result = tokens[0];
  for (let i = 1; i < tokens.length; i += 2) {
    const op = tokens[i];
    const next = tokens[i + 1];
    result = op === "+" ? result + next : result - next;
  }
  return { valid: true, complete: true, value: result };
}

async function solveWithBank(grid, equations, bankValues, token, deadline) {
  const emptyCells = [];
  const equationMap = new Map();
  const counts = new Map();

  bankValues.forEach((value) => {
    counts.set(value, (counts.get(value) || 0) + 1);
  });

  grid.forEach((row, r) => {
    row.forEach((cell, c) => {
      if (cell === ".") emptyCells.push(cellId(r, c));
    });
  });

  equations.forEach((eq, index) => {
    eq.forEach((tokenId) => {
      if (!equationMap.has(tokenId)) equationMap.set(tokenId, []);
      equationMap.get(tokenId).push(index);
    });
  });

  emptyCells.sort((a, b) => {
    const countA = equationMap.get(a)?.length || 0;
    const countB = equationMap.get(b)?.length || 0;
    return countB - countA;
  });

  const solution = new Map();
  const values = Array.from(counts.keys());
  const range = {
    min: Math.min(...values),
    max: Math.max(...values),
  };

  function getValue(tokenId) {
    const [row, col] = tokenId
      .replace("r", "")
      .split("c")
      .map((n) => Number(n));
    const cell = grid[row][col];
    if (cell === ".") return solution.get(tokenId) ?? null;
    if (cell === "=" || cell === "+" || cell === "-") return cell;
    return Number(cell);
  }

  function equationConsistent(eq) {
    const valuesList = eq.map((tokenId) => getValue(tokenId));
    const eqIndex = valuesList.indexOf("=");
    if (eqIndex === -1 || valuesList.filter((val) => val === "=").length > 1) return false;

    const left = valuesList.slice(0, eqIndex);
    const right = valuesList.slice(eqIndex + 1);

    const leftRange = expressionRange(left, range);
    const rightRange = expressionRange(right, range);

    if (!leftRange.valid || !rightRange.valid) return false;
    if (leftRange.complete && rightRange.complete) {
      return leftRange.min === rightRange.min;
    }

    return !(leftRange.max < rightRange.min || rightRange.max < leftRange.min);
  }

  function allEquationsConsistent() {
    return equations.every((eq) => equationConsistent(eq));
  }

  async function backtrack(index) {
    if (token !== generationToken && token !== solveToken) return false;
    if (deadline && performance.now() > deadline) return false;
    if (index >= emptyCells.length) return allEquationsConsistent();

    const cell = emptyCells[index];
    const candidates = shuffle(values.filter((val) => (counts.get(val) || 0) > 0));

    for (const value of candidates) {
      if ((counts.get(value) || 0) === 0) continue;
      solution.set(cell, value);
      counts.set(value, counts.get(value) - 1);
      if (allEquationsConsistent()) {
        if (await backtrack(index + 1)) return true;
      }
      counts.set(value, counts.get(value) + 1);
      solution.delete(cell);
    }

    return false;
  }

  if (await backtrack(0)) return solution;
  return null;
}

function shuffle(values) {
  for (let i = values.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [values[i], values[j]] = [values[j], values[i]];
  }
  return values;
}

async function solvePuzzle(grid, equations, range, token, deadline) {
  const emptyCells = [];
  const equationMap = new Map();
  let steps = 0;
  let lastYield = performance.now();

  grid.forEach((row, r) => {
    row.forEach((cell, c) => {
      if (cell === ".") emptyCells.push(cellId(r, c));
    });
  });

  equations.forEach((eq, index) => {
    eq.forEach((token) => {
      if (!equationMap.has(token)) equationMap.set(token, []);
      equationMap.get(token).push(index);
    });
  });

  emptyCells.sort((a, b) => {
    const countA = equationMap.get(a)?.length || 0;
    const countB = equationMap.get(b)?.length || 0;
    return countB - countA;
  });

  const solution = new Map();

  function getValue(token) {
    const [row, col] = token
      .replace("r", "")
      .split("c")
      .map((n) => Number(n));
    const cell = grid[row][col];
    if (cell === ".") return solution.get(token) ?? null;
    if (cell === "=" || cell === "+" || cell === "-") return cell;
    return Number(cell);
  }

  function equationConsistent(eq) {
    const values = eq.map((token) => getValue(token));
    const eqIndex = values.indexOf("=");
    if (eqIndex === -1 || values.filter((val) => val === "=").length > 1) return false;

    const left = values.slice(0, eqIndex);
    const right = values.slice(eqIndex + 1);

    const leftRange = expressionRange(left, range);
    const rightRange = expressionRange(right, range);

    if (!leftRange.valid || !rightRange.valid) return false;
    if (leftRange.complete && rightRange.complete) {
      return leftRange.min === rightRange.min;
    }

    return !(leftRange.max < rightRange.min || rightRange.max < leftRange.min);
  }

  function allEquationsConsistent() {
    return equations.every((eq) => equationConsistent(eq));
  }

  async function maybeYield() {
    steps += 1;
    const now = performance.now();
    if (deadline && now > deadline) return false;
    if (steps % 500 === 0 || now - lastYield > 8) {
      lastYield = now;
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    return true;
  }

  async function backtrack(index) {
    if (token !== generationToken) return false;
    const ok = await maybeYield();
    if (!ok) return false;
    if (index >= emptyCells.length) {
      return allEquationsConsistent();
    }

    const cell = emptyCells[index];
    const candidates = shuffle(
      Array.from({ length: range.max - range.min + 1 }, (_, i) => i + range.min)
    );

    for (const value of candidates) {
      if (deadline && performance.now() > deadline) return false;
      if (token !== generationToken) return false;
      solution.set(cell, value);
      if (allEquationsConsistent()) {
        if (await backtrack(index + 1)) return true;
      }
      solution.delete(cell);
    }

    return false;
  }

  if (await backtrack(0)) return solution;
  return null;
}

function expressionRange(tokens, range) {
  if (tokens.length === 0) return { valid: false };
  const expectsNumberAt = (index) => index % 2 === 0;
  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (expectsNumberAt(i)) {
      if (token === null) continue;
      if (typeof token !== "number") return { valid: false };
    } else if (token !== "+" && token !== "-") {
      return { valid: false };
    }
  }

  let min = 0;
  let max = 0;
  let complete = true;

  for (let i = 0; i < tokens.length; i += 2) {
    const value = tokens[i];
    const op = i === 0 ? "+" : tokens[i - 1];
    const sign = op === "+" ? 1 : -1;

    if (value === null) {
      complete = false;
      min += sign > 0 ? range.min : -range.max;
      max += sign > 0 ? range.max : -range.min;
    } else {
      min += sign * value;
      max += sign * value;
    }
  }

  if (min > max) [min, max] = [max, min];
  return { valid: true, complete, min, max };
}

function randomOp() {
  return Math.random() < 0.5 ? "+" : "-";
}

function buildNumberMask(size, difficulty) {
  const numbersPerSide = Math.ceil(size / 2);
  const total = numbersPerSide * numbersPerSide;
  let target = Math.floor(total * (0.5 + (difficulty - 1) * 0.07));
  target = Math.max(8, Math.min(total, target));

  const start = [
    Math.floor(numbersPerSide / 2),
    Math.floor(numbersPerSide / 2),
  ];
  const frontier = [start];
  const visited = new Set([`${start[0]},${start[1]}`]);

  while (visited.size < target) {
    const [r, c] = frontier[Math.floor(Math.random() * frontier.length)];
    const neighbors = [
      [r + 1, c],
      [r - 1, c],
      [r, c + 1],
      [r, c - 1],
    ].filter(
      ([nr, nc]) =>
        nr >= 0 && nc >= 0 && nr < numbersPerSide && nc < numbersPerSide
    );

    const [nr, nc] = neighbors[Math.floor(Math.random() * neighbors.length)];
    const key = `${nr},${nc}`;
    if (!visited.has(key)) {
      visited.add(key);
      frontier.push([nr, nc]);
    }
  }

  const mask = new Set();
  visited.forEach((coord) => {
    const [r, c] = coord.split(",").map((n) => Number(n));
    mask.add(cellId(r * 2, c * 2));
  });

  return mask;
}

function placeEquals(grid) {
  const size = grid.length;

  for (let r = 0; r < size; r += 2) {
    const runs = collectNumberRuns(grid, r, true);
    runs.forEach((run) => {
      if (run.length < 3) return;
      const eqIndex = Math.max(1, Math.floor(run.length / 2));
      const leftCol = run[eqIndex - 1];
      const rightCol = run[eqIndex];
      const opCol = (leftCol + rightCol) / 2;
      grid[r][opCol] = "=";
    });
  }

  for (let c = 0; c < size; c += 2) {
    const runs = collectNumberRuns(grid, c, false);
    runs.forEach((run) => {
      if (run.length < 3) return;
      const eqIndex = Math.max(1, Math.floor(run.length / 2));
      const topRow = run[eqIndex - 1];
      const bottomRow = run[eqIndex];
      const opRow = (topRow + bottomRow) / 2;
      grid[opRow][c] = "=";
    });
  }
}

function collectNumberRuns(grid, index, isRow) {
  const size = grid.length;
  const runs = [];
  let current = [];

  for (let i = 0; i < size; i += 2) {
    const r = isRow ? index : i;
    const c = isRow ? i : index;
    if (grid[r][c] === null) {
      if (current.length) runs.push(current);
      current = [];
      continue;
    }

    if (current.length === 0) {
      current.push(isRow ? c : r);
    } else {
      const prev = current[current.length - 1];
      const opR = isRow ? r : (prev + i) / 2;
      const opC = isRow ? (prev + i) / 2 : c;
      if (grid[opR][opC] !== null) {
        current.push(isRow ? c : r);
      } else {
        runs.push(current);
        current = [isRow ? c : r];
      }
    }
  }

  if (current.length) runs.push(current);
  return runs;
}

function generateLayout(options) {
  const { size, difficulty } = options;
  const layout = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => null)
  );

  const numberMask = buildNumberMask(size, difficulty);
  const numberSlots = [];

  for (let r = 0; r < size; r += 1) {
    for (let c = 0; c < size; c += 1) {
      if (r % 2 === 1 && c % 2 === 1) {
        layout[r][c] = null;
        continue;
      }

      if (r % 2 === 0 && c % 2 === 0) {
        if (numberMask.has(cellId(r, c))) {
          layout[r][c] = ".";
          numberSlots.push([r, c]);
        } else {
          layout[r][c] = null;
        }
      }
    }
  }

  for (let r = 0; r < size; r += 1) {
    for (let c = 0; c < size; c += 1) {
      if (r % 2 === 0 && c % 2 === 1) {
        const left = layout[r][c - 1];
        const right = layout[r][c + 1];
        layout[r][c] = left !== null && right !== null ? randomOp() : null;
      }

      if (r % 2 === 1 && c % 2 === 0) {
        const up = layout[r - 1]?.[c];
        const down = layout[r + 1]?.[c];
        layout[r][c] = up !== null && down !== null ? randomOp() : null;
      }
    }
  }

  placeEquals(layout);
  const equations = buildCrosswordEquations(layout);
  if (equations.length < 4) return null;

  return { grid: layout, equations, numberSlots };
}

// ---- game state and interface ----
const STORAGE_KEY = "zone210_mathcross_v8";
const BEST_KEY = "zone210_mathcross_best";
const SETTINGS_KEY = "zone210_mathcross_settings";
const LEVELS = { easy: 1, medium: 3, hard: 4, expert: 5 };
const RANGES = { 10: [1, 10], 20: [1, 20], 50: [1, 50] };

const $ = (id) => document.getElementById(id);
const boardEl = $("board");
const bankEl = $("bank");
const statusEl = $("status");
const boardWrap = document.querySelector(".board-wrap");
const buttons = ["generate-btn", "undo-btn", "hint-btn", "check-btn", "reset-btn", "solve-btn"].map($);

const store = {
  get(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (err) {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      /* private mode: play on without saving */
    }
  },
};

const settings = { level: "medium", range: "20", ...store.get(SETTINGS_KEY, {}) };
if (!LEVELS[settings.level]) settings.level = "medium";
if (!RANGES[settings.range]) settings.range = "20";

let puzzle = null; // { grid, equations, bank: [{id, value}] }
let currentSolution = null; // Map cellId -> value
const placements = new Map(); // cellId -> bank item id
const hinted = new Set();
let history = [];
let selectedBankId = null;
let activeCell = null;
let showErrors = false;
let solved = false;
let assisted = false; // solved with the Solve button
let hintCount = 0;
let elapsed = 0; // seconds
let lastTick = 0;
let timerId = null;
let isBusy = false;
let regenerateTimer = null;
let digitBuffer = "";
let digitTimer = null;

const parseId = (id) => id.replace("r", "").split("c").map(Number);
const fmtTime = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
const bestKey = () => `${settings.level}-${settings.range}`;

function setStatus(text) {
  statusEl.textContent = text;
}

function setBusy(value) {
  isBusy = value;
  boardWrap.classList.toggle("busy", value);
  buttons.forEach((b) => (b.disabled = value));
}

// ---------- timer ----------
function startTimer() {
  if (timerId || solved) return;
  lastTick = performance.now();
  timerId = setInterval(tick, 500);
}
function stopTimer() {
  if (!timerId) return;
  tick();
  clearInterval(timerId);
  timerId = null;
}
function tick() {
  const now = performance.now();
  if (!document.hidden) elapsed += (now - lastTick) / 1000;
  lastTick = now;
  $("time").textContent = fmtTime(elapsed);
}

// ---------- persistence ----------
function persist() {
  if (!puzzle) return;
  store.set(STORAGE_KEY, {
    grid: puzzle.grid,
    bank: puzzle.bank.map((item) => item.value),
    solution: currentSolution ? Object.fromEntries(currentSolution) : null,
    placements: [...placements],
    hinted: [...hinted],
    elapsed,
    hints: hintCount,
    solved,
    assisted,
    level: settings.level,
    range: settings.range,
  });
}

// ---------- puzzle setup ----------
function setPuzzle(next, solution = null, restore = null) {
  const equations = buildCrosswordEquations(next.grid);
  const candidate = { grid: next.grid, equations, bank: next.bank.map((value, i) => ({ id: `n${i + 1}`, value })) };
  const error = validatePuzzle(candidate);
  if (error) {
    setStatus(error);
    return false;
  }
  puzzle = candidate;
  currentSolution = solution;
  placements.clear();
  hinted.clear();
  history = [];
  selectedBankId = null;
  activeCell = null;
  showErrors = false;
  solved = false;
  assisted = false;
  hintCount = 0;
  elapsed = 0;
  stopTimer();
  if (restore) {
    (restore.placements || []).forEach(([cell, id]) => placements.set(cell, id));
    (restore.hinted || []).forEach((cell) => hinted.add(cell));
    hintCount = restore.hints || 0;
    elapsed = restore.elapsed || 0;
    solved = !!restore.solved;
    assisted = !!restore.assisted;
  }
  render();
  if (!solved && placements.size > 0) startTimer();
  return true;
}

function loadSaved() {
  const saved = store.get(STORAGE_KEY, null);
  if (!saved || !Array.isArray(saved.grid) || !Array.isArray(saved.bank)) return false;
  if (LEVELS[saved.level]) settings.level = saved.level;
  if (RANGES[saved.range]) settings.range = saved.range;
  syncChips();
  const solution = saved.solution ? new Map(Object.entries(saved.solution).map(([k, v]) => [k, Number(v)])) : null;
  const ok = setPuzzle({ grid: saved.grid, bank: saved.bank }, solution, saved);
  if (ok) setStatus(solved ? "Solved. Start a new puzzle when you are ready." : "Welcome back. Your puzzle is where you left it.");
  return ok;
}

// ---------- rendering ----------
function equationMarks() {
  const marks = new Map(); // cellId -> "ok" | "bad"
  let okCount = 0;
  puzzle.equations.forEach((eq) => {
    const result = evaluateEquation(eq);
    if (result.status === "ok") okCount += 1;
    if (result.status === "ok" || (result.status === "invalid" && showErrors)) {
      eq.forEach((id) => {
        if (result.status === "invalid" || !marks.has(id)) marks.set(id, result.status === "ok" ? "ok" : "bad");
      });
    }
  });
  return { marks, okCount };
}

function getPlacedValue(cellKey) {
  const bankId = placements.get(cellKey);
  if (!bankId) return null;
  const item = puzzle.bank.find((entry) => entry.id === bankId);
  return item ? item.value : null;
}

function getCellValue(token) {
  const [row, col] = parseId(token);
  const cell = puzzle.grid[row][col];
  if (cell === null) return null;
  if (cell === ".") return getPlacedValue(token);
  if (cell === "=" || cell === "-" || cell === "+") return cell;
  return Number(cell);
}

function evaluateEquation(tokens) {
  const values = tokens.map(getCellValue);
  const eqIndex = values.indexOf("=");
  if (eqIndex === -1) return { status: "invalid" };
  const left = evaluateExpression(values.slice(0, eqIndex));
  const right = evaluateExpression(values.slice(eqIndex + 1));
  if (!left.valid || !right.valid) return { status: "invalid" };
  if (!left.complete || !right.complete) return { status: "incomplete" };
  return left.value === right.value ? { status: "ok" } : { status: "invalid" };
}

function emptyCellIds() {
  const ids = [];
  puzzle.grid.forEach((row, r) => row.forEach((cell, c) => cell === "." && ids.push(cellId(r, c))));
  return ids;
}

function render(popCell = null) {
  const size = puzzle.grid.length;
  const { marks } = equationMarks();
  boardEl.style.setProperty("--n", size);
  boardEl.innerHTML = "";
  puzzle.grid.forEach((row, r) => {
    row.forEach((cell, c) => {
      const id = cellId(r, c);
      const mark = marks.get(id);
      let el;
      if (cell === null) {
        el = document.createElement("div");
        el.className = "cell blank";
      } else if (cell === ".") {
        el = document.createElement("button");
        el.type = "button";
        el.className = "cell empty";
        const value = getPlacedValue(id);
        if (value !== null) {
          el.classList.add("filled");
          el.textContent = value;
          if (hinted.has(id)) el.classList.add("hinted");
          el.setAttribute("aria-label", `Row ${r / 2 + 1}, column ${c / 2 + 1}: ${value}. Press to remove.`);
        } else {
          el.setAttribute("aria-label", `Row ${r / 2 + 1}, column ${c / 2 + 1}: empty`);
        }
        if (id === activeCell) el.classList.add("active");
        if (id === popCell) el.classList.add("pop");
        el.addEventListener("click", () => onCell(id));
        el.addEventListener("focus", () => {
          activeCell = id;
        });
      } else {
        el = document.createElement("div");
        const isSym = cell === "+" || cell === "-" || cell === "=";
        el.className = `cell ${isSym ? "sym" : "num"}${cell === "=" ? " eq" : ""}`;
        el.textContent = cell === "-" ? "−" : cell;
      }
      el.dataset.cell = id;
      if (mark) el.classList.add(mark);
      boardEl.appendChild(el);
    });
  });
  renderBank();
  renderStats();
}

function renderBank() {
  bankEl.innerHTML = "";
  const free = puzzle.bank.filter((item) => ![...placements.values()].includes(item.id));
  free.sort((a, b) => a.value - b.value || a.id.localeCompare(b.id, undefined, { numeric: true }));
  free.forEach((item) => {
    const tile = document.createElement("button");
    tile.type = "button";
    tile.className = "bank-tile" + (selectedBankId === item.id ? " selected" : "");
    tile.textContent = item.value;
    tile.dataset.bankId = item.id;
    tile.addEventListener("click", () => onBankTile(item.id));
    bankEl.appendChild(tile);
  });
  if (!free.length) {
    const done = document.createElement("span");
    done.className = "bank-done";
    done.textContent = "All numbers placed";
    bankEl.appendChild(done);
  }
}

function renderStats() {
  $("left").textContent = emptyCellIds().length - placements.size;
  $("hints").textContent = hintCount;
  $("time").textContent = fmtTime(elapsed);
  const best = store.get(BEST_KEY, {})[bestKey()];
  $("best").textContent = best ? fmtTime(best) : "-";
}

// ---------- moves ----------
function snapshot() {
  history.push({ placements: [...placements], hinted: [...hinted], hints: hintCount });
  if (history.length > 200) history.shift();
}

function nextEmptyAfter(id) {
  const empties = emptyCellIds().filter((cell) => !placements.has(cell));
  if (!empties.length) return null;
  const all = emptyCellIds();
  const start = all.indexOf(id);
  return empties.find((cell) => all.indexOf(cell) > start) || empties[0];
}

function changed(popCell = null, message = "") {
  showErrors = false;
  if (placements.size > 0) startTimer();
  render(popCell);
  if (activeCell) {
    const el = boardEl.querySelector(`[data-cell="${activeCell}"]`);
    if (el && document.activeElement === document.body) el.focus({ preventScroll: true });
  }
  persist();
  const { okCount } = equationMarks();
  if (emptyCellIds().length === placements.size && okCount === puzzle.equations.length) {
    win();
  } else if (message) {
    setStatus(message);
  }
}

function placeValue(cell, bankId, message = "") {
  snapshot();
  placements.delete(cell);
  placements.set(cell, bankId);
  hinted.delete(cell);
  selectedBankId = null;
  activeCell = nextEmptyAfter(cell) || cell;
  changed(cell, message);
}

function removeValue(cell) {
  if (!placements.has(cell)) return;
  snapshot();
  placements.delete(cell);
  hinted.delete(cell);
  activeCell = cell;
  changed(null, "");
}

function onCell(id) {
  if (isBusy || solved) return;
  if (placements.has(id)) {
    removeValue(id);
    return;
  }
  if (selectedBankId) {
    placeValue(id, selectedBankId);
    return;
  }
  activeCell = id;
  render();
  boardEl.querySelector(`[data-cell="${id}"]`)?.focus({ preventScroll: true });
  setStatus("Now pick a number from the bank.");
}

function onBankTile(bankId) {
  if (isBusy || solved) return;
  if (activeCell && !placements.has(activeCell)) {
    placeValue(activeCell, bankId);
    return;
  }
  selectedBankId = selectedBankId === bankId ? null : bankId;
  renderBank();
  if (selectedBankId) setStatus("Now tap an empty square.");
}

function undo() {
  if (isBusy || solved || !history.length) return;
  const prev = history.pop();
  placements.clear();
  prev.placements.forEach(([cell, id]) => placements.set(cell, id));
  hinted.clear();
  prev.hinted.forEach((cell) => hinted.add(cell));
  hintCount = prev.hints;
  changed(null, "Undone.");
}

function resetBoard() {
  if (isBusy) return;
  snapshot();
  placements.clear();
  hinted.clear();
  selectedBankId = null;
  activeCell = null;
  solved = false;
  assisted = false;
  elapsed = 0;
  stopTimer();
  $("time").textContent = "0:00";
  changed(null, "Board cleared.");
}

function checkBoard() {
  if (isBusy || solved) return;
  showErrors = true;
  render();
  const { okCount } = equationMarks();
  let wrong = 0;
  puzzle.equations.forEach((eq) => evaluateEquation(eq).status === "invalid" && (wrong += 1));
  if (wrong) setStatus(`${wrong} equation${wrong === 1 ? " doesn't" : "s don't"} add up yet (shown in red).`);
  else if (okCount === puzzle.equations.length) setStatus("All correct!");
  else setStatus(`${okCount} of ${puzzle.equations.length} equations done, no mistakes so far.`);
}

async function ensureSolution() {
  if (currentSolution) return currentSolution;
  const token = (solveToken += 1);
  currentSolution = await solveWithBank(puzzle.grid, puzzle.equations, puzzle.bank.map((b) => b.value), token, performance.now() + 1500);
  return currentSolution;
}

function bankIdFor(value, exceptCell) {
  // a free tile with this value, or one used in a cell we are allowed to take it from
  const used = new Map();
  placements.forEach((id, cell) => used.set(id, cell));
  const matches = puzzle.bank.filter((item) => item.value === value);
  // only take a tile from a square where it doesn't belong in the solution, so hints never undo each other
  const misplaced = (item) => used.get(item.id) !== exceptCell && currentSolution.get(used.get(item.id)) !== item.value;
  const pick = matches.find((item) => !used.has(item.id)) || matches.find(misplaced);
  return pick ? pick.id : null;
}

async function hint() {
  if (isBusy || solved) return;
  setBusy(true);
  setStatus("Finding a hint…");
  const solution = await ensureSolution();
  setBusy(false);
  if (!solution) {
    setStatus("Couldn't work out a hint for this one. Try a new puzzle.");
    return;
  }
  const empties = emptyCellIds();
  let target = null;
  if (activeCell && !placements.has(activeCell)) target = activeCell;
  if (!target) target = empties.find((cell) => !placements.has(cell)) || null;
  if (!target) {
    // everything is filled but something is off: fix a cell whose value differs from the solution
    const { marks } = (showErrors = true, equationMarks());
    target = empties.find((cell) => marks.get(cell) === "bad" && getPlacedValue(cell) !== solution.get(cell)) || empties.find((cell) => getPlacedValue(cell) !== solution.get(cell));
  }
  if (!target) return;
  const value = solution.get(target);
  const bankId = bankIdFor(value, target);
  if (!bankId) return;
  snapshot();
  placements.forEach((id, cell) => id === bankId && cell !== target && placements.delete(cell));
  placements.set(target, bankId);
  hinted.add(target);
  hintCount += 1;
  assisted = true;
  activeCell = nextEmptyAfter(target) || target;
  changed(target, `Hint: that square is ${value}.`);
}

async function solveCurrent() {
  if (isBusy || solved) return;
  setBusy(true);
  setStatus("Solving…");
  const solution = await ensureSolution();
  setBusy(false);
  if (!solution) {
    setStatus("Couldn't solve this one. Try a new puzzle.");
    return;
  }
  snapshot();
  placements.clear();
  hinted.clear();
  const idsByValue = new Map();
  puzzle.bank.forEach((item) => {
    if (!idsByValue.has(item.value)) idsByValue.set(item.value, []);
    idsByValue.get(item.value).push(item.id);
  });
  emptyCellIds().forEach((cell) => {
    const id = (idsByValue.get(solution.get(cell)) || []).pop();
    if (id) placements.set(cell, id);
  });
  assisted = true;
  solved = true;
  stopTimer();
  render();
  persist();
  setStatus("Here is the solution. Start a new puzzle when you are ready.");
}

// ---------- winning ----------
function win() {
  solved = true;
  stopTimer();
  const times = store.get(BEST_KEY, {});
  const key = bestKey();
  let record = false;
  if (!assisted && (!times[key] || elapsed < times[key])) {
    times[key] = Math.max(1, Math.round(elapsed));
    store.set(BEST_KEY, times);
    record = true;
  }
  persist();
  renderStats();
  const lines = [`Time ${fmtTime(elapsed)}`];
  if (hintCount) lines.push(`${hintCount} hint${hintCount === 1 ? "" : "s"}`);
  $("winText").textContent = lines.join(" · ") + (record ? " · New best!" : assisted ? " · Best times count only unassisted solves." : "");
  setStatus("Solved!");
  $("win").classList.add("show");
  launchConfetti();
}

function launchConfetti() {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  document.getElementById("confetti-canvas")?.remove();
  const canvas = document.createElement("canvas");
  canvas.id = "confetti-canvas";
  Object.assign(canvas.style, { position: "fixed", inset: "0", pointerEvents: "none", zIndex: "80" });
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  canvas.width = innerWidth;
  canvas.height = innerHeight;
  const colors = ["#34d399", "#60a5fa", "#fbbf24", "#f472b6", "#a78bfa"];
  const bits = Array.from({ length: 140 }, (_, i) => ({
    x: Math.random() * canvas.width,
    y: -20 - Math.random() * canvas.height * 0.3,
    vx: (Math.random() - 0.5) * 2,
    vy: 2 + Math.random() * 3,
    s: 6 + Math.random() * 6,
    c: colors[i % colors.length],
    r: Math.random() * Math.PI,
    vr: (Math.random() - 0.5) * 0.2,
  }));
  const end = performance.now() + 2600;
  (function frame(now) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    bits.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.r += p.vr;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.r);
      ctx.fillStyle = p.c;
      ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.6);
      ctx.restore();
    });
    if (now < end) requestAnimationFrame(frame);
    else canvas.remove();
  })(performance.now());
}

// ---------- generating ----------
async function generatePuzzle() {
  const [min, max] = RANGES[settings.range];
  const difficulty = LEVELS[settings.level];
  const size = difficulty <= 2 ? 7 : difficulty >= 5 ? 11 : 9;
  const options = { size, difficulty };
  const token = (generationToken += 1);
  setBusy(true);
  setStatus("Building a puzzle…");
  await new Promise((r) => setTimeout(r, 30));

  for (let attempt = 0; attempt < 30; attempt += 1) {
    if (token !== generationToken) return;
    const layout = generateLayout(options);
    if (!layout || !isGridConnected(layout.grid)) continue;

    const budget = Math.min(700, 220 + attempt * 40);
    const solution = await solvePuzzle(layout.grid, layout.equations, { min, max }, token, performance.now() + budget);
    if (token !== generationToken) return;
    if (!solution) {
      await new Promise((r) => setTimeout(r, 0));
      continue;
    }

    const slots = layout.numberSlots || [];
    const fraction = 0.3 + ((difficulty - 1) / 4) * 0.35;
    const targetEmpty = Math.max(4, Math.min(slots.length - 2, Math.round(slots.length * fraction)));
    shuffle(slots);
    const empty = new Set(slots.slice(0, targetEmpty).map(([r, c]) => cellId(r, c)));
    const bank = [];
    slots.forEach(([r, c]) => {
      const key = cellId(r, c);
      if (empty.has(key)) {
        layout.grid[r][c] = ".";
        bank.push(solution.get(key));
      } else {
        layout.grid[r][c] = String(solution.get(key));
      }
    });

    const filled = layout.grid.map((row, r) =>
      row.map((cell, c) => (cell === "." ? solution.get(cellId(r, c)) : cell === null || "+-=".includes(cell) ? cell : Number(cell)))
    );
    if (!layout.equations.every((eq) => evaluateEquationWithGrid(filled, eq))) continue;

    shuffle(bank);
    setBusy(false);
    if (setPuzzle({ grid: layout.grid, bank }, solution)) {
      persist();
      setStatus("Fresh puzzle. Pick a square, then a number.");
    }
    return;
  }
  setBusy(false);
  setStatus("Couldn't build a puzzle just now. Press New Puzzle to try again.");
}

function scheduleRegenerate() {
  clearTimeout(regenerateTimer);
  generationToken += 1;
  setStatus("Updating puzzle…");
  regenerateTimer = setTimeout(generatePuzzle, 250);
}

// ---------- controls ----------
function syncChips() {
  document.querySelectorAll("#level .g-chip").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.value === settings.level)));
  document.querySelectorAll("#range .g-chip").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.value === settings.range)));
}
document.querySelectorAll("#level .g-chip, #range .g-chip").forEach((b) =>
  b.addEventListener("click", () => {
    const group = b.parentElement.id;
    if (settings[group] === b.dataset.value) return;
    settings[group] = b.dataset.value;
    store.set(SETTINGS_KEY, settings);
    syncChips();
    scheduleRegenerate();
  })
);
$("generate-btn").addEventListener("click", generatePuzzle);
$("undo-btn").addEventListener("click", undo);
$("hint-btn").addEventListener("click", hint);
$("check-btn").addEventListener("click", checkBoard);
$("reset-btn").addEventListener("click", resetBoard);
$("solve-btn").addEventListener("click", solveCurrent);
$("win-review").addEventListener("click", () => $("win").classList.remove("show"));
$("win-next").addEventListener("click", () => {
  $("win").classList.remove("show");
  generatePuzzle();
});

function moveFocus(dr, dc) {
  const empties = emptyCellIds();
  if (!empties.length) return;
  const from = activeCell ? parseId(activeCell) : [0, 0];
  let best = null;
  let bestScore = Infinity;
  empties.forEach((id) => {
    if (id === activeCell) return;
    const [r, c] = parseId(id);
    const along = dr ? (r - from[0]) * dr : (c - from[1]) * dc;
    const across = Math.abs(dr ? c - from[1] : r - from[0]);
    if (along <= 0) return;
    const score = along * 3 + across;
    if (score < bestScore) {
      bestScore = score;
      best = id;
    }
  });
  if (!best && !activeCell) best = empties[0];
  if (best) {
    activeCell = best;
    boardEl.querySelector(`[data-cell="${best}"]`)?.focus();
    render();
    boardEl.querySelector(`[data-cell="${best}"]`)?.focus({ preventScroll: true });
  }
}

function typeDigit(d) {
  if (!activeCell || placements.has(activeCell)) return;
  clearTimeout(digitTimer);
  digitBuffer += d;
  const free = () => puzzle.bank.filter((item) => ![...placements.values()].includes(item.id));
  const exact = free().find((item) => String(item.value) === digitBuffer);
  const longer = free().some((item) => String(item.value).length > digitBuffer.length && String(item.value).startsWith(digitBuffer));
  const commit = () => {
    const item = free().find((it) => String(it.value) === digitBuffer);
    digitBuffer = "";
    if (item && activeCell && !placements.has(activeCell)) placeValue(activeCell, item.id);
    else if (!item) setStatus("That number isn't in the bank.");
  };
  if (exact && !longer) commit();
  else if (exact || longer) digitTimer = setTimeout(commit, 650);
  else {
    digitBuffer = "";
    setStatus("That number isn't in the bank.");
  }
}

document.addEventListener("keydown", (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey || isBusy || solved || !puzzle) return;
  if (e.key >= "0" && e.key <= "9") {
    typeDigit(e.key);
    e.preventDefault();
  } else if (e.key === "Backspace" || e.key === "Delete") {
    if (activeCell) removeValue(activeCell);
    e.preventDefault();
  } else if (e.key.startsWith("Arrow")) {
    moveFocus(e.key === "ArrowDown" ? 1 : e.key === "ArrowUp" ? -1 : 0, e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0);
    e.preventDefault();
  }
});

document.addEventListener("visibilitychange", () => {
  lastTick = performance.now();
  if (document.hidden) persist();
});
addEventListener("pagehide", persist);

syncChips();
if (!loadSaved()) generatePuzzle();
