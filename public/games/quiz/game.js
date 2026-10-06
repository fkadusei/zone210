import { QUESTIONS as CORE } from "./questions.js";
import { MORE_QUESTIONS, TOPICS } from "./more-questions.js";
import { countryQuestions, mathQuestions } from "./generated.js";

// hand-written questions plus generated ones (capitals, flags, continents, fresh arithmetic each round)
const dedupe = (list) => {
  const seen = new Set();
  return list.filter((q) => (seen.has(q.q) ? false : seen.add(q.q)));
};
let QUESTIONS = dedupe([...CORE, ...MORE_QUESTIONS, ...countryQuestions(), ...mathQuestions(90)]);
const TOPIC_ICON = { Africa: "🌍", World: "🌐", Science: "🔬", Nature: "🦁", Space: "🚀", History: "🏛️", Geography: "🗺️", Sports: "⚽", Music: "🎵", "Movies & TV": "🎬", Food: "🍲", Technology: "💻", Maths: "➗", "Art & Books": "📚", Words: "🔤" };
const SEEN_KEY = "zone210_quiz_seen";
const readSeen = () => {
  try {
    return JSON.parse(localStorage.getItem(SEEN_KEY) || "{}");
  } catch (err) {
    return {};
  }
};
const writeSeen = (v) => {
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify(v));
  } catch (err) {
    /* storage unavailable */
  }
};

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
  const level = QUESTIONS.filter((q) => levelMatches(q.l));
  let p = level.filter((q) => opts.topic === "All" || q.c === opts.topic);
  // a thin topic is topped up with other topics so a round is always full
  if (p.length < ROUND * 2) p = p.concat(shuffle(level.filter((q) => !p.includes(q))).slice(0, ROUND * 2 - p.length));
  return p;
}

// questions you have not seen yet come first, so a round never repeats what you just played
function pick() {
  const all = pool();
  const seenAll = readSeen();
  const key = `${opts.aud}|${opts.topic}`;
  const seen = new Set(seenAll[key] || []);
  let fresh = all.filter((q) => !seen.has(q.q));
  if (fresh.length < ROUND) {
    seen.clear(); // everything has been played: start a new cycle
    fresh = all;
  }
  const chosen = shuffle(fresh).slice(0, ROUND);
  chosen.forEach((q) => seen.add(q.q));
  seenAll[key] = [...seen];
  writeSeen(seenAll);
  return chosen;
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
$("topic").innerHTML = ["All", ...TOPICS].map((t) => `<button class="g-chip" data-value="${t}" aria-pressed="${t === "All"}">${t === "All" ? "🎲 All topics" : `${TOPIC_ICON[t] || ""} ${t}`}</button>`).join("");
wire("aud", "aud");
wire("topic", "topic");
wire("timer", "timer");

function showBest() {
  const best = Number(localStorage.getItem(bestKey(opts.aud)) || 0);
  const n = pool().length;
  $("best").textContent = `${ROUND} questions per round from ${n} in this mix${best ? ` · Your best (${opts.aud}): ${best} points` : ""}`;
}

function start() {
  QUESTIONS = dedupe([...QUESTIONS.filter((q) => !(q.gen && q.c === "Maths")), ...mathQuestions(90)]);
  round = pick();
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
  $("qtopic").textContent = `${TOPIC_ICON[q.c] || "❓"} ${q.c}`;
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
