// ---------- exact arithmetic (fractions) ----------
const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));
const frac = (n, d = 1) => {
  const g = gcd(n, d) || 1;
  const s = d < 0 ? -1 : 1;
  return [(s * n) / g, (s * d) / g];
};
const isTarget = (f) => f[0] === 24 && f[1] === 1;
const SYMBOL = { "+": "+", "-": "−", "*": "×", "/": "÷" };

function apply(a, op, b) {
  if (op === "+") return frac(a[0] * b[1] + b[0] * a[1], a[1] * b[1]);
  if (op === "-") return frac(a[0] * b[1] - b[0] * a[1], a[1] * b[1]);
  if (op === "*") return frac(a[0] * b[0], a[1] * b[1]);
  if (b[0] === 0) return null;
  return frac(a[0] * b[1], a[1] * b[0]);
}
const label = (f) => (f[1] === 1 ? String(f[0]) : `${f[0]}/${f[1]}`);

// ---------- solver: finds every way to reach 24 ----------
function solve(values, limit = Infinity) {
  const out = [];
  const start = values.map((v) => ({ v, e: label(v), steps: [] }));
  (function search(items) {
    if (out.length >= limit) return;
    if (items.length === 1) {
      if (isTarget(items[0].v)) out.push(items[0]);
      return;
    }
    for (let i = 0; i < items.length; i += 1) {
      for (let j = i + 1; j < items.length; j += 1) {
        const a = items[i];
        const b = items[j];
        const rest = items.filter((_, k) => k !== i && k !== j);
        const tries = [
          [a, "+", b],
          [a, "*", b],
          [a, "-", b],
          [b, "-", a],
          [a, "/", b],
          [b, "/", a],
        ];
        for (const [x, op, y] of tries) {
          const v = apply(x.v, op, y.v);
          if (!v) continue;
          const commutes = op === "+" || op === "*";
          const parts = commutes ? [x.e, y.e].sort() : [x.e, y.e];
          search([...rest, { v, e: `(${parts[0]} ${SYMBOL[op]} ${parts[1]})`, steps: [...x.steps, ...y.steps, { a: x.v, op, b: y.v }] }]);
          if (out.length >= limit) return;
        }
      }
    }
  })(start);
  return out;
}

const unique = (sols) => new Set(sols.map((s) => s.e));
const prettify = (e) => (e.startsWith("(") && e.endsWith(")") ? e.slice(1, -1) : e);

// ---------- puzzle generation ----------
const LEVELS = {
  easy: { max: 6, accept: (n) => n >= 5 },
  medium: { max: 10, accept: (n) => n >= 2 && n <= 12 },
  hard: { max: 13, accept: (n) => n >= 1 && n <= 2 },
};
const FALLBACK = { easy: [1, 2, 3, 4], medium: [3, 3, 8, 8], hard: [1, 5, 5, 5] };

function makePuzzle(level, avoid = "") {
  const cfg = LEVELS[level];
  for (let attempt = 0; attempt < 400; attempt += 1) {
    const nums = Array.from({ length: 4 }, () => 1 + Math.floor(Math.random() * cfg.max)).sort((a, b) => a - b);
    if (nums.join() === avoid) continue;
    const sols = solve(nums.map((n) => frac(n)));
    if (sols.length && cfg.accept(unique(sols).size)) return nums;
  }
  return FALLBACK[level];
}

// ---------- state ----------
const $ = (id) => document.getElementById(id);
const store = {
  get(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch (err) {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      /* private mode */
    }
  },
};
const SETTINGS_KEY = "zone210_24_settings";
const BEST_KEY = "zone210_24_best";
const settings = { mode: "practice", level: "medium", ...store.get(SETTINGS_KEY, {}) };
if (!LEVELS[settings.level]) settings.level = "medium";
if (!["practice", "sprint"].includes(settings.mode)) settings.mode = "practice";

const SPRINT_SECONDS = 90;
let original = []; // the four starting numbers
let cards = []; // [{ v: [n, d] }]
let steps = []; // text of each move made
let history = [];
let sel = null;
let op = null;
let solved = false;
let assisted = false;
let solvedCount = 0;
let streak = 0;
let elapsed = 0; // seconds on this puzzle (practice)
let sprintLeft = SPRINT_SECONDS;
let running = false;
let tickId = null;
let lastTick = 0;
let sprintOver = false;

const cardsEl = $("cards");
const workingEl = $("working");
const statusEl = $("status");
const fmtTime = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
const setStatus = (text, kind = "") => {
  statusEl.textContent = text;
  statusEl.className = "g-status" + (kind ? ` ${kind}` : "");
};

// ---------- timer ----------
function startClock() {
  if (running || solved || sprintOver) return;
  running = true;
  lastTick = performance.now();
  tickId = setInterval(tick, 250);
}
function stopClock() {
  if (!running) return;
  tick();
  clearInterval(tickId);
  running = false;
}
function tick() {
  const now = performance.now();
  const dt = document.hidden ? 0 : (now - lastTick) / 1000;
  lastTick = now;
  if (settings.mode === "sprint") {
    sprintLeft = Math.max(0, sprintLeft - dt);
    if (sprintLeft <= 0) endSprint();
  } else {
    elapsed += dt;
  }
  renderStats();
}

// ---------- rendering ----------
function cardHTML(f) {
  return f[1] === 1 ? String(f[0]) : `<span class="frac"><i>${f[0]}</i><i>${f[1]}</i></span>`;
}

function render(popIndex = -1, hint = null) {
  cardsEl.innerHTML = "";
  cards.forEach((c, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "card" + (i === sel ? " sel" : "") + (i === popIndex ? " made" : "");
    if (hint && (i === hint.a || i === hint.b)) b.classList.add(i === hint.a ? "hintA" : "hintB");
    if (solved && cards.length === 1) b.classList.add("win");
    b.style.setProperty("--i", i);
    b.innerHTML = cardHTML(c.v);
    b.setAttribute("aria-label", `Card ${i + 1}: ${label(c.v)}${i === sel ? ", selected" : ""}`);
    b.disabled = solved || sprintOver;
    b.addEventListener("click", () => onCard(i));
    cardsEl.appendChild(b);
  });
  document.querySelectorAll("#ops .op").forEach((b) => {
    b.classList.toggle("on", b.dataset.op === op);
    b.classList.toggle("hintOp", !!hint && hint.op === b.dataset.op);
    b.disabled = solved || sprintOver;
  });
  workingEl.innerHTML = steps.length ? steps.map((s) => `<div>${s}</div>`).join("") : "";
  renderStats();
}

function bestKey() {
  return settings.mode === "sprint" ? "sprint" : settings.level;
}
function renderStats() {
  const sprint = settings.mode === "sprint";
  $("time").textContent = sprint ? fmtTime(Math.ceil(sprintLeft)) : fmtTime(elapsed);
  $("timeLabel").textContent = sprint ? "Left" : "Time";
  $("solved").textContent = solvedCount;
  $("streak").textContent = streak;
  const best = store.get(BEST_KEY, {})[bestKey()];
  $("bestLabel").textContent = sprint ? "Best score" : "Best time";
  $("best").textContent = best ? (sprint ? best : fmtTime(best)) : "-";
}

// ---------- playing ----------
function newPuzzle(keepClock = false) {
  if (sprintOver) return;
  original = makePuzzle(settings.level, original.join());
  cards = original.map((n) => ({ v: frac(n) }));
  steps = [];
  history = [];
  sel = null;
  op = null;
  solved = false;
  assisted = false;
  if (settings.mode === "practice") elapsed = 0;
  if (!keepClock) stopClock();
  render();
  setStatus(settings.mode === "sprint" && !running ? "The clock starts when you make your first move." : "Pick a number, then an operation, then another number.");
}

function onCard(i) {
  if (solved || sprintOver) return;
  startClock();
  if (sel === null) {
    sel = i;
    render();
  } else if (sel === i) {
    sel = null;
    op = null;
    render();
  } else if (op === null) {
    sel = i;
    render();
  } else {
    combine(sel, op, i);
  }
}

function onOp(o) {
  if (solved || sprintOver) return;
  if (sel === null) {
    setStatus("Pick a number first.");
    return;
  }
  startClock();
  op = op === o ? null : o;
  render();
}

function combine(a, o, b) {
  const result = apply(cards[a].v, o, cards[b].v);
  if (!result) {
    setStatus("You can't divide by zero.", "bad");
    const el = cardsEl.children[b];
    el.classList.add("shake");
    setTimeout(() => el.classList.remove("shake"), 450);
    return;
  }
  history.push({ cards: cards.map((c) => ({ v: c.v })), steps: [...steps] });
  steps.push(`<b>${label(cards[a].v)} ${SYMBOL[o]} ${label(cards[b].v)} = ${label(result)}</b>`);
  // the answer takes the place of the second card
  const popped = b - (a < b ? 1 : 0);
  cards = cards.map((c, k) => (k === b ? { v: result } : c)).filter((_, k) => k !== a);
  sel = null;
  op = null;
  if (cards.length === 1) {
    if (isTarget(cards[0].v)) return win();
    render(popped);
    setStatus(`That makes ${label(cards[0].v)}, not 24. Undo and try another route.`, "bad");
    return;
  }
  render(popped);
  setStatus("");
}

function undo() {
  if (solved || sprintOver || !history.length) return;
  const prev = history.pop();
  cards = prev.cards;
  steps = prev.steps;
  sel = null;
  op = null;
  render();
  setStatus("Undone.");
}

function restart() {
  if (solved || sprintOver) return;
  cards = original.map((n) => ({ v: frac(n) }));
  steps = [];
  history = [];
  sel = null;
  op = null;
  render();
  setStatus("Back to the start.");
}

function hint() {
  if (solved || sprintOver) return;
  startClock();
  const sols = solve(cards.map((c) => c.v), 1);
  if (!sols.length) {
    setStatus("No way to reach 24 from here. Try Undo or Restart.", "bad");
    return;
  }
  const s = sols[0].steps[0];
  const same = (f, g) => f[0] === g[0] && f[1] === g[1];
  const a = cards.findIndex((c) => same(c.v, s.a));
  const b = cards.findIndex((c, i) => i !== a && same(c.v, s.b));
  assisted = true;
  render(-1, { a, b, op: s.op });
  setStatus(`Hint: try ${label(s.a)} ${SYMBOL[s.op]} ${label(s.b)}.`);
}

function showAnswer() {
  if (solved || sprintOver) return;
  const sols = solve(original.map((n) => frac(n)), 1);
  assisted = true;
  streak = 0;
  workingHTML(`<b>${prettify(sols[0].e)} = 24</b>`);
  setStatus("Here is one way. Press New Puzzle for another.");
  renderStats();
}
function workingHTML(html) {
  workingEl.innerHTML = html;
}

// ---------- winning ----------
function win() {
  solved = true;
  if (settings.mode !== "sprint") stopClock(); // the sprint clock keeps running between puzzles
  solvedCount += 1;
  if (!assisted) streak += 1;
  else streak = 0;
  const bests = store.get(BEST_KEY, {});
  let record = false;
  if (settings.mode === "practice" && !assisted) {
    const t = Math.max(1, Math.round(elapsed));
    if (!bests[settings.level] || t < bests[settings.level]) {
      bests[settings.level] = t;
      store.set(BEST_KEY, bests);
      record = true;
    }
  }
  render();
  workingEl.classList.add("good");
  const praise = ["Nice!", "You got it!", "24!", "Brilliant!", "Nailed it!"][Math.floor(Math.random() * 5)];
  if (settings.mode === "sprint") {
    setStatus(`${praise} +1`, "good");
    confetti(40);
    setTimeout(() => {
      workingEl.classList.remove("good");
      newPuzzle(true);
    }, 750);
  } else {
    setStatus(`${praise} ${fmtTime(elapsed)}${record ? " · New best!" : ""}${assisted ? " (with help)" : ""}`, "good");
    confetti(90);
  }
}

function endSprint() {
  if (sprintOver) return;
  sprintOver = true;
  stopClock();
  const bests = store.get(BEST_KEY, {});
  const score = solvedCount;
  const record = score > 0 && score > (bests.sprint || 0);
  if (record) {
    bests.sprint = score;
    store.set(BEST_KEY, bests);
  }
  render();
  $("endText").textContent = `You solved ${score} puzzle${score === 1 ? "" : "s"}.${record ? " New best!" : bests.sprint ? ` Best: ${bests.sprint}.` : ""}`;
  $("end").classList.add("show");
  if (score) confetti(60);
}

function confetti(count) {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  document.getElementById("confetti")?.remove();
  const canvas = document.createElement("canvas");
  canvas.id = "confetti";
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  canvas.width = innerWidth;
  canvas.height = innerHeight;
  const colors = ["#34d399", "#60a5fa", "#fbbf24", "#f472b6", "#a78bfa"];
  const bits = Array.from({ length: count }, (_, i) => ({
    x: innerWidth / 2 + (Math.random() - 0.5) * 200,
    y: innerHeight * 0.45,
    vx: (Math.random() - 0.5) * 9,
    vy: -4 - Math.random() * 8,
    s: 6 + Math.random() * 6,
    c: colors[i % colors.length],
    r: Math.random() * Math.PI,
    vr: (Math.random() - 0.5) * 0.3,
  }));
  const end = performance.now() + 1800;
  (function frame(now) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    bits.forEach((p) => {
      p.vy += 0.28;
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

// ---------- controls ----------
function syncChips() {
  document.querySelectorAll("#mode .g-chip").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.value === settings.mode)));
  document.querySelectorAll("#level .g-chip").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.value === settings.level)));
}

function resetSession() {
  solvedCount = 0;
  streak = 0;
  sprintOver = false;
  sprintLeft = SPRINT_SECONDS;
  elapsed = 0;
  workingEl.classList.remove("good");
  $("end").classList.remove("show");
  stopClock();
  newPuzzle();
}

document.querySelectorAll("#mode .g-chip, #level .g-chip").forEach((b) =>
  b.addEventListener("click", () => {
    const group = b.parentElement.id;
    if (settings[group] === b.dataset.value) return;
    settings[group] = b.dataset.value;
    store.set(SETTINGS_KEY, settings);
    syncChips();
    resetSession();
  })
);
document.querySelectorAll("#ops .op").forEach((b) => b.addEventListener("click", () => onOp(b.dataset.op)));
$("next").addEventListener("click", () => {
  workingEl.classList.remove("good");
  if (!solved && !assisted && settings.mode === "practice" && cards.length) streak = 0;
  newPuzzle(settings.mode === "sprint");
});
$("undo").addEventListener("click", undo);
$("reset").addEventListener("click", restart);
$("hint").addEventListener("click", hint);
$("show").addEventListener("click", showAnswer);
$("again").addEventListener("click", resetSession);

document.addEventListener("keydown", (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey || !cards.length) return;
  if (e.key >= "1" && e.key <= "4") {
    const i = Number(e.key) - 1;
    if (i < cards.length) onCard(i);
  } else if ("+-*/x".includes(e.key) && e.key.length === 1) {
    onOp(e.key === "x" ? "*" : e.key);
    if (e.key === "/") e.preventDefault();
  } else if (e.key === "Backspace") {
    undo();
    e.preventDefault();
  } else if (e.key === "Enter" && solved && settings.mode === "practice") {
    $("next").click();
  }
});
document.addEventListener("visibilitychange", () => {
  lastTick = performance.now();
});

syncChips();
newPuzzle();
window.__24 = { solve, makePuzzle, frac, get cards() { return cards; }, get original() { return original; } };
