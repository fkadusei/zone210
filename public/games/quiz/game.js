import { QUESTIONS } from "./questions.js";

const $ = (id) => document.getElementById(id);
const ROUND = 10;
const SECONDS = 15;
const bestKey = (aud) => `gameroom_quiz_best_${aud}`;

const opts = { aud: "family", topic: "All", timer: "on" };
let round = [];
let idx = 0;
let score = 0;
let streak = 0;
let correctCount = 0;
let locked = false;
let tick = null;
let deadline = 0;

const shuffle = (a) => {
  const arr = a.slice();
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

function levelMatches(l) {
  if (opts.aud === "kids") return l === "kids";
  if (opts.aud === "family") return l === "kids" || l === "all";
  return l === "all" || l === "adults";
}

function pool() {
  let p = QUESTIONS.filter((q) => levelMatches(q.l) && (opts.topic === "All" || q.c === opts.topic));
  if (p.length < 5) p = QUESTIONS.filter((q) => levelMatches(q.l)); // thin topic: fall back to all topics
  return p;
}

function wire(id, key) {
  $(id).addEventListener("click", (e) => {
    const chip = e.target.closest(".g-chip");
    if (!chip) return;
    $(id).querySelectorAll(".g-chip").forEach((c) => c.setAttribute("aria-pressed", String(c === chip)));
    opts[key] = chip.dataset.value;
    showBest();
  });
}
wire("aud", "aud");
wire("topic", "topic");
wire("timer", "timer");

function showBest() {
  const best = Number(localStorage.getItem(bestKey(opts.aud)) || 0);
  const n = Math.min(ROUND, pool().length);
  $("best").textContent = `${n} questions${best ? ` · Your best (${opts.aud}): ${best} points` : ""}`;
}

function start() {
  round = shuffle(pool()).slice(0, ROUND);
  idx = 0;
  score = 0;
  streak = 0;
  correctCount = 0;
  $("start").hidden = true;
  $("quiz").hidden = false;
  $("end").classList.remove("show");
  $("bar").classList.toggle("off", opts.timer === "off");
  show();
}

function show() {
  locked = false;
  const q = round[idx];
  // shuffle the options but remember which one is right (the first in the data)
  const options = shuffle(q.a.map((text, i) => ({ text, ok: i === 0 })));
  $("qn").textContent = `${idx + 1}/${round.length}`;
  $("score").textContent = score;
  $("streak").textContent = streak;
  $("qtopic").textContent = q.c === "Ghana" ? "🇬🇭 Ghana" : q.c === "Africa" ? "🌍 Africa" : "🌐 World";
  $("qtext").textContent = q.q;
  $("why").textContent = "";
  $("next").hidden = true;
  const box = $("answers");
  box.innerHTML = "";
  options.forEach((o, i) => {
    const b = document.createElement("button");
    b.className = "ans";
    b.innerHTML = `<span class="k">${"ABCD"[i]}</span><span></span>`;
    b.lastElementChild.textContent = o.text;
    b.dataset.ok = o.ok ? "1" : "0";
    b.addEventListener("click", () => answer(b, q));
    box.appendChild(b);
  });
  startClock();
}

function startClock() {
  clearInterval(tick);
  const fill = $("barfill");
  fill.style.transform = "scaleX(1)";
  if (opts.timer === "off") return;
  deadline = Date.now() + SECONDS * 1000;
  tick = setInterval(() => {
    const left = Math.max(0, deadline - Date.now());
    fill.style.transform = `scaleX(${left / (SECONDS * 1000)})`;
    if (left <= 0) {
      clearInterval(tick);
      timeUp();
    }
  }, 100);
}

function reveal(chosen, q, note) {
  locked = true;
  clearInterval(tick);
  document.querySelectorAll(".ans").forEach((b) => {
    b.disabled = true;
    if (b.dataset.ok === "1") b.classList.add("right");
    else if (b === chosen) b.classList.add("wrong");
  });
  $("why").textContent = [note, q.why].filter(Boolean).join(" ");
  $("next").hidden = false;
  $("next").textContent = idx === round.length - 1 ? "See my score →" : "Next question →";
  $("next").focus({ preventScroll: true });
}

function answer(btn, q) {
  if (locked) return;
  const right = btn.dataset.ok === "1";
  if (right) {
    const secondsLeft = opts.timer === "on" ? Math.max(0, (deadline - Date.now()) / 1000) : 0;
    const timeBonus = Math.round(Math.min(60, secondsLeft * 4));
    streak += 1;
    const streakBonus = Math.min(50, (streak - 1) * 10);
    const gained = 100 + timeBonus + streakBonus;
    score += gained;
    correctCount += 1;
    reveal(btn, q, `✅ Correct! +${gained}${streakBonus ? ` (streak bonus +${streakBonus})` : ""}.`);
  } else {
    streak = 0;
    reveal(btn, q, "❌ Not quite.");
  }
  $("score").textContent = score;
  $("streak").textContent = streak;
}

function timeUp() {
  if (locked) return;
  streak = 0;
  $("streak").textContent = 0;
  reveal(null, round[idx], "⏰ Time's up!");
}

function next() {
  if (idx >= round.length - 1) return finish();
  idx += 1;
  show();
  return undefined;
}

function finish() {
  clearInterval(tick);
  const prev = Number(localStorage.getItem(bestKey(opts.aud)) || 0);
  const record = score > prev;
  if (record) {
    try {
      localStorage.setItem(bestKey(opts.aud), String(score));
    } catch (err) {
      // storage unavailable
    }
  }
  const pct = correctCount / round.length;
  $("endEmoji").textContent = pct === 1 ? "🏆" : pct >= 0.7 ? "🎉" : pct >= 0.4 ? "👍" : "📚";
  $("endTitle").textContent = pct === 1 ? "Perfect score!" : pct >= 0.7 ? "Great job!" : pct >= 0.4 ? "Nice try!" : "Keep learning!";
  $("endText").textContent = `${correctCount} of ${round.length} correct · ${score} points${record ? " · New best!" : ""}`;
  $("end").classList.add("show");
}

$("go").addEventListener("click", start);
$("next").addEventListener("click", next);
$("again").addEventListener("click", start);
$("review").addEventListener("click", () => {
  $("end").classList.remove("show");
  $("quiz").hidden = true;
  $("start").hidden = false;
  showBest();
});

// answer with the keyboard: A-D or 1-4, Enter for next
document.addEventListener("keydown", (e) => {
  if ($("quiz").hidden) return;
  const map = { a: 0, b: 1, c: 2, d: 3, 1: 0, 2: 1, 3: 2, 4: 3 };
  const i = map[e.key.toLowerCase()];
  const btns = [...document.querySelectorAll(".ans")];
  if (i !== undefined && btns[i] && !locked) btns[i].click();
  else if (e.key === "Enter" && !$("next").hidden && document.activeElement !== $("next")) next();
});

showBest();
window.__quiz = { get round() { return round; }, opts };
