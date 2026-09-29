const defaultPuzzle = {
  grid: [
    ["8", "+", "4", "=", "12"],
    ["-", null, "-", null, "+"],
    ["9", "+", "2", "=", "11"],
    ["=", null, "=", null, "="],
    ["6", "-", "1", "=", "5"],
  ],
  equations: [],
  bank: [],
};

const STORAGE_KEY = "math-cross-puzzle-v7";
const boardEl = document.getElementById("board");
const bankEl = document.getElementById("bank");
const statusEl = document.getElementById("status-text");
const checkBtn = document.getElementById("check-btn");
const solveBtn = document.getElementById("solve-btn");
const resetBtn = document.getElementById("reset-btn");
const generateBtn = document.getElementById("generate-btn");
const boardWrap = document.querySelector(".board-wrap");
const clockDateEl = document.getElementById("clock-date");
const clockTimeEl = document.getElementById("clock-time");
const rangeMinInput = document.getElementById("range-min");
const rangeMaxInput = document.getElementById("range-max");
const difficultyInput = document.getElementById("difficulty");
const difficultyLabel = document.getElementById("difficulty-label");

let selectedBankId = null;
const placements = new Map();
let puzzle = normalizePuzzle(defaultPuzzle);
let celebrationArmed = true;
let generationToken = 0;
let isGenerating = false;
let regenerateTimer = null;
let solveToken = 0;
let currentSolution = null;

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

function normalizePuzzle(data) {
  const normalized = {
    grid: data.grid,
    equations: data.equations,
    bank: normalizeBank(data.bank || []),
  };
  return normalized;
}

function normalizeBank(values) {
  return values.map((value, index) => ({ id: `n${index + 1}`, value }));
}

function countEmptyCells(grid) {
  return grid.flat().filter((cell) => cell === ".").length;
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

function setPuzzle(nextPuzzle, message, solutionMap = null) {
  const normalized = normalizePuzzle(nextPuzzle);
  normalized.equations = buildCrosswordEquations(normalized.grid);
  const error = validatePuzzle(normalized);
  if (error) {
    statusEl.textContent = error;
    return false;
  }

  puzzle = normalized;
  placements.clear();
  selectedBankId = null;
  clearHighlights();
  renderBoard();
  renderBank();
  statusEl.textContent = message;
  celebrationArmed = true;
  currentSolution = solutionMap;
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      grid: puzzle.grid,
      equations: puzzle.equations,
      bank: puzzle.bank.map((item) => item.value),
      solution: solutionMap ? Object.fromEntries(solutionMap.entries()) : null,
    })
  );
  return true;
}

function renderBoard() {
  boardEl.innerHTML = "";
  const size = puzzle.grid[0]?.length || 5;
  let cellSize = 64;
  if (size >= 15) cellSize = 28;
  else if (size >= 13) cellSize = 32;
  else if (size >= 11) cellSize = 36;
  else if (size >= 9) cellSize = 42;
  else if (size >= 7) cellSize = 50;
  boardEl.style.setProperty("--cell-size", `${cellSize}px`);
  boardEl.style.gridTemplateColumns = `repeat(${size}, var(--cell-size, ${cellSize}px))`;
  puzzle.grid.forEach((row, rowIndex) => {
    row.forEach((cell, colIndex) => {
      const el = document.createElement("div");
      const id = cellId(rowIndex, colIndex);
      el.dataset.cellId = id;
      el.classList.add("cell");

      if (cell === null) {
        el.classList.add("blank");
      } else if (cell === ".") {
        el.classList.add("empty");
        const value = getPlacedValue(id);
        if (value !== null) {
          el.classList.add("filled");
          el.textContent = value;
        }
        el.addEventListener("click", () => handleEmptyCellClick(id));
      } else {
        el.classList.add("fixed");
        if (["-", "+"].includes(cell)) {
          el.classList.add("op");
        }
        el.textContent = cell;
      }

      boardEl.appendChild(el);
    });
  });
}

function renderBank() {
  bankEl.innerHTML = "";
  puzzle.bank.forEach((item) => {
    if (isBankItemUsed(item.id)) return;
    const tile = document.createElement("button");
    tile.className = "bank-tile";
    tile.textContent = item.value;
    tile.dataset.bankId = item.id;
    if (selectedBankId === item.id) {
      tile.classList.add("selected");
    }
    tile.addEventListener("click", () => selectBankTile(item.id));
    bankEl.appendChild(tile);
  });
}

function isBankItemUsed(id) {
  return [...placements.values()].includes(id);
}

function selectBankTile(id) {
  selectedBankId = selectedBankId === id ? null : id;
  renderBank();
}

function handleEmptyCellClick(id) {
  if (isGenerating) return;
  const cellHasValue = placements.has(id);
  if (cellHasValue) {
    placements.delete(id);
    renderBoard();
    renderBank();
    statusEl.textContent = "Removed number from the board.";
    celebrationArmed = true;
    return;
  }

  if (!selectedBankId) {
    statusEl.textContent = "Pick a number from the bank first.";
    return;
  }

  const item = puzzle.bank.find((entry) => entry.id === selectedBankId);
  if (!item) return;

  placements.set(id, item.id);
  selectedBankId = null;
  renderBoard();
  renderBank();
  statusEl.textContent = "Placed number.";
  celebrationArmed = true;
}

function evaluateEquation(tokens) {
  const values = tokens.map((token) => getCellValue(token, placements));
  const eqIndex = values.indexOf("=");
  if (eqIndex === -1 || values.filter((val) => val === "=").length > 1) {
    return { status: "invalid" };
  }

  const left = values.slice(0, eqIndex);
  const right = values.slice(eqIndex + 1);

  const leftEval = evaluateExpression(left);
  const rightEval = evaluateExpression(right);

  if (!leftEval.valid || !rightEval.valid) return { status: "invalid" };
  if (!leftEval.complete || !rightEval.complete) return { status: "incomplete" };
  return leftEval.value === rightEval.value ? { status: "ok" } : { status: "invalid" };
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

function getCellValue(token, valueMap) {
  const [row, col] = token
    .replace("r", "")
    .split("c")
    .map((n) => Number(n));
  const cell = puzzle.grid[row][col];
  if (cell === null) return null;
  if (cell === ".") {
    return getPlacedValue(token, valueMap);
  }
  if (cell === "=" || cell === "-" || cell === "+") return cell;
  return Number(cell);
}

function getPlacedValue(cellKey, valueMap = placements) {
  if (!valueMap.has(cellKey)) return null;
  const bankId = valueMap.get(cellKey);
  const item = puzzle.bank.find((entry) => entry.id === bankId);
  return item ? item.value : null;
}

function clearHighlights() {
  document.querySelectorAll(".cell.ok, .cell.bad").forEach((cell) => {
    cell.classList.remove("ok", "bad");
  });
}

function highlightEquation(tokens, status) {
  tokens.forEach((token) => {
    const cell = document.querySelector(`[data-cell-id="${token}"]`);
    if (!cell) return;
    if (status === "ok") cell.classList.add("ok");
    if (status === "invalid") cell.classList.add("bad");
  });
}

function checkBoard() {
  if (isGenerating) return;
  clearHighlights();
  let completed = 0;
  let invalid = 0;

  puzzle.equations.forEach((eq) => {
    const result = evaluateEquation(eq);
    if (result.status === "ok") completed += 1;
    if (result.status === "invalid") invalid += 1;
    if (result.status !== "incomplete") {
      highlightEquation(eq, result.status);
    }
  });

  if (invalid > 0) {
    statusEl.textContent = "Some equations are incorrect.";
  } else if (completed === puzzle.equations.length) {
    statusEl.textContent = "All equations are correct. Great job!";
    if (celebrationArmed) {
      launchConfetti();
      celebrationArmed = false;
    }
  } else {
    statusEl.textContent = "Keep going. Some equations are incomplete.";
  }
}

function resetBoard() {
  if (isGenerating) return;
  placements.clear();
  selectedBankId = null;
  clearHighlights();
  renderBoard();
  renderBank();
  statusEl.textContent = "Board reset.";
  celebrationArmed = true;
}

async function solveCurrentPuzzle() {
  if (isGenerating) return;
  const token = (solveToken += 1);
  isGenerating = true;
  checkBtn.disabled = true;
  resetBtn.disabled = true;
  solveBtn.disabled = true;
  generateBtn.disabled = true;
  boardWrap?.classList.add("busy");
  statusEl.textContent = "Solving puzzle...";

  let solution = currentSolution;
  if (!solution) {
    solution = await solveWithBank(
      puzzle.grid,
      puzzle.equations,
      puzzle.bank.map((item) => item.value),
      token,
      performance.now() + 800
    );
  }

  if (token !== solveToken) {
    isGenerating = false;
    checkBtn.disabled = false;
    resetBtn.disabled = false;
    solveBtn.disabled = false;
    generateBtn.disabled = false;
    boardWrap?.classList.remove("busy");
    return;
  }

  if (!solution) {
    statusEl.textContent = "Unable to solve this puzzle. Try generating a new one.";
  } else {
    placements.clear();
    const idsByValue = new Map();
    puzzle.bank.forEach((item) => {
      if (!idsByValue.has(item.value)) idsByValue.set(item.value, []);
      idsByValue.get(item.value).push(item.id);
    });
    puzzle.grid.forEach((row, r) => {
      row.forEach((cell, c) => {
        if (cell === ".") {
          const key = cellId(r, c);
          const value = solution.get(key);
          const ids = idsByValue.get(value) || [];
          const id = ids.pop();
          if (id) placements.set(key, id);
        }
      });
    });
    renderBoard();
    renderBank();
    statusEl.textContent = "Solved! You can review the answers.";
    celebrationArmed = false;
  }

  isGenerating = false;
  checkBtn.disabled = false;
  resetBtn.disabled = false;
  solveBtn.disabled = false;
  generateBtn.disabled = false;
  boardWrap?.classList.remove("busy");
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

function loadSavedPuzzle() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return false;
  try {
    const parsed = JSON.parse(saved);
    const bankValues = Array.isArray(parsed.bank) ? parsed.bank : [];
    const solutionMap = parsed.solution
      ? new Map(Object.entries(parsed.solution).map(([key, value]) => [key, Number(value)]))
      : null;
    const ok = setPuzzle(
      {
        grid: parsed.grid,
        equations: parsed.equations,
        bank: bankValues,
      },
      "Loaded saved puzzle.",
      solutionMap
    );
    return ok;
  } catch (error) {
    return false;
  }
}

function shuffle(values) {
  for (let i = values.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [values[i], values[j]] = [values[j], values[i]];
  }
  return values;
}

function difficultyText(value) {
  if (value <= 1) return "Easy";
  if (value === 2) return "Normal";
  if (value === 3) return "Medium";
  if (value === 4) return "Hard";
  return "Expert";
}

function getGeneratorOptions() {
  let min = Number(rangeMinInput.value) || 1;
  let max = Number(rangeMaxInput.value) || 20;
  if (max <= min) max = min + 1;
  rangeMinInput.value = String(min);
  rangeMaxInput.value = String(max);
  const difficulty = Number(difficultyInput.value) || 3;
  let size = 9;
  if (difficulty <= 2) size = 7;
  return { size, min, max, difficulty };
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
  let target = Math.floor(total * (0.75 - (difficulty - 1) * 0.08));
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

async function generatePuzzle() {
  let attempts = 0;
  const options = getGeneratorOptions();
  const token = (generationToken += 1);
  const attemptLimit = 14;
  const baseBudget = 220;
  isGenerating = true;
  generateBtn.disabled = true;
  checkBtn.disabled = true;
  resetBtn.disabled = true;
  boardWrap?.classList.add("busy");
  while (attempts < attemptLimit) {
    attempts += 1;
    const layout = generateLayout(options);

    if (!layout) {
      await new Promise((resolve) => setTimeout(resolve, 0));
      continue;
    }
    if (!isGridConnected(layout.grid)) continue;

    const timeBudget = options.difficulty >= 4 ? baseBudget * 0.75 : baseBudget;
    const solution = await solvePuzzle(
      layout.grid,
      layout.equations,
      {
        min: options.min,
        max: options.max,
      },
      token,
      performance.now() + timeBudget
    );

    if (token !== generationToken) {
      generateBtn.disabled = false;
      checkBtn.disabled = false;
      resetBtn.disabled = false;
      boardWrap?.classList.remove("busy");
      isGenerating = false;
      return;
    }

    if (!solution) {
      await new Promise((resolve) => setTimeout(resolve, 0));
      continue;
    }

    const numberSlots = layout.numberSlots || [];
    const minEmpty = Math.max(3, Math.floor(numberSlots.length * 0.25));
    const maxEmpty = Math.min(numberSlots.length - 2, Math.ceil(numberSlots.length * 0.7));
    const targetEmpty =
      minEmpty +
      Math.round(((options.difficulty - 1) / 4) * (maxEmpty - minEmpty));

    shuffle(numberSlots);
    const emptySet = new Set(
      numberSlots.slice(0, targetEmpty).map(([r, c]) => cellId(r, c))
    );

    numberSlots.forEach(([r, c]) => {
      const key = cellId(r, c);
      if (emptySet.has(key)) {
        layout.grid[r][c] = ".";
      } else {
        layout.grid[r][c] = String(solution.get(key));
      }
    });

    const bankValues = [];
    const filledGrid = layout.grid.map((row, r) =>
      row.map((cell, c) => {
        if (cell === ".") {
          const value = solution.get(cellId(r, c));
          bankValues.push(value);
          return value;
        }
        if (cell === null) return null;
        if (cell === "+" || cell === "-" || cell === "=") return cell;
        return Number(cell);
      })
    );

    const allValid = layout.equations.every((eq) => evaluateEquationWithGrid(filledGrid, eq));
    if (!allValid) continue;

    setPuzzle(
      {
        grid: layout.grid,
        equations: layout.equations,
        bank: bankValues,
      },
      "Generated a new layout and puzzle.",
      solution
    );
    generateBtn.disabled = false;
    checkBtn.disabled = false;
    resetBtn.disabled = false;
    boardWrap?.classList.remove("busy");
    isGenerating = false;
    return;
  }

  statusEl.textContent = "Failed to generate a puzzle. Try again.";
  generateBtn.disabled = false;
  checkBtn.disabled = false;
  resetBtn.disabled = false;
  boardWrap?.classList.remove("busy");
  isGenerating = false;
}

checkBtn.addEventListener("click", checkBoard);
resetBtn.addEventListener("click", resetBoard);
generateBtn.addEventListener("click", () => {
  generatePuzzle();
});
solveBtn.addEventListener("click", () => {
  solveCurrentPuzzle();
});
difficultyInput.addEventListener("input", () => {
  difficultyLabel.textContent = difficultyText(Number(difficultyInput.value));
  scheduleRegenerate();
});

rangeMinInput.addEventListener("input", () => {
  scheduleRegenerate();
});

rangeMaxInput.addEventListener("input", () => {
  scheduleRegenerate();
});

function scheduleRegenerate() {
  if (isGenerating) {
    generationToken += 1;
  }
  statusEl.textContent = "Updating puzzle...";
  if (regenerateTimer) clearTimeout(regenerateTimer);
  regenerateTimer = setTimeout(() => {
    generatePuzzle();
  }, 200);
}

difficultyLabel.textContent = difficultyText(Number(difficultyInput.value));

if (!loadSavedPuzzle()) {
  generatePuzzle();
}

function launchConfetti() {
  const existing = document.getElementById("confetti-canvas");
  if (existing) existing.remove();

  const canvas = document.createElement("canvas");
  canvas.id = "confetti-canvas";
  canvas.style.position = "fixed";
  canvas.style.inset = "0";
  canvas.style.pointerEvents = "none";
  canvas.style.zIndex = "50";
  document.body.appendChild(canvas);

  const ctx = canvas.getContext("2d");
  const colors = ["#34d399", "#60a5fa", "#fbbf24", "#f472b6", "#22c55e"];
  const particles = [];
  const count = 140;
  const endTime = performance.now() + 2400;

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();

  for (let i = 0; i < count; i += 1) {
    particles.push({
      x: Math.random() * canvas.width,
      y: -20 - Math.random() * canvas.height * 0.2,
      vx: (Math.random() - 0.5) * 2,
      vy: 2 + Math.random() * 3,
      size: 6 + Math.random() * 6,
      color: colors[i % colors.length],
      rotation: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.2,
    });
  }

  function tick(time) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.rotation += p.vr;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      ctx.restore();
    });

    if (time < endTime) {
      requestAnimationFrame(tick);
    } else {
      canvas.remove();
    }
  }

  requestAnimationFrame(tick);
}

function updateClock() {
  if (!clockDateEl || !clockTimeEl) return;
  const now = new Date();
  clockDateEl.textContent = now.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  clockTimeEl.textContent = now.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

updateClock();
setInterval(updateClock, 1000);
