const $ = (id) => document.getElementById(id);
const store = {
  get(key, fallback) { try { const raw = localStorage.getItem(key); return raw === null ? fallback : JSON.parse(raw); } catch (err) { return fallback; } },
  set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (err) { /* private mode */ } },
};
const KEY = "zone210_times_tables";
const data = { facts: {}, best: {}, sel: [2, 3, 4, 5, 10], mix: false, learnN: 2, tab: "learn", muted: false, ...store.get(KEY, {}) };
const save = () => store.set(KEY, data);
const view = $("view");
const SPEED = new URLSearchParams(location.search).has("fast") ? 20 : 1;

// ---------- sound ----------
let audio = null;
function tone(freq, start, length, type = "sine", gain = 0.08) {
  if (data.muted) return;
  try {
    audio = window.z210Audio ? window.z210Audio.get() : audio || new (window.AudioContext || window.webkitAudioContext)();
    if (!audio) return;
    const t = audio.currentTime + start;
    const osc = audio.createOscillator();
    const amp = audio.createGain();
    osc.type = type; osc.frequency.value = freq;
    amp.gain.setValueAtTime(0.0001, t);
    amp.gain.exponentialRampToValueAtTime(gain, t + 0.01);
    amp.gain.exponentialRampToValueAtTime(0.0001, t + length);
    osc.connect(amp).connect(audio.destination);
    osc.start(t); osc.stop(t + length + 0.02);
  } catch (err) { /* audio unavailable */ }
}
const sfx = {
  right: () => [523, 659, 784].forEach((f, i) => tone(f, i * 0.07, 0.14, "triangle", 0.09)),
  wrong: () => [220, 170].forEach((f, i) => tone(f, i * 0.1, 0.18, "sawtooth", 0.06)),
  key: () => tone(480, 0, 0.04, "triangle", 0.05),
  done: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, i * 0.1, 0.22, "triangle", 0.1)),
};

// ---------- what the learner knows ----------
const keyOf = (a, b) => `${Math.min(a, b)}x${Math.max(a, b)}`;
const rec = (a, b) => data.facts[keyOf(a, b)];
const boxOf = (a, b) => { const r = rec(a, b); return r ? r.b : -1; }; // -1 = never tried
function record(a, b, ok, ms) {
  const k = keyOf(a, b);
  const r = data.facts[k] || { b: 0, n: 0, c: 0 };
  r.n += 1;
  if (ok) { r.c += 1; if (ms <= 4500) r.b = Math.min(4, r.b + 1); else r.b = Math.max(r.b, 1); } else r.b = 0;
  data.facts[k] = r;
  save();
}
const tableMastered = (t) => Array.from({ length: 12 }, (_, i) => boxOf(t, i + 1)).every((b) => b >= 3);
const mastery = () => { let n = 0; for (let a = 1; a <= 12; a += 1) for (let b = a; b <= 12; b += 1) if (boxOf(a, b) >= 3) n += 1; return Math.round((n / 78) * 100); };

// ---------- questions ----------
function pickFact(pool, last) {
  const cands = pool.filter(([a, b]) => keyOf(a, b) !== last);
  const list = cands.length ? cands : pool;
  const w = list.map(([a, b]) => { const bx = boxOf(a, b); return bx < 0 ? 16 : (5 - bx) * (5 - bx); });
  let r = Math.random() * w.reduce((t, x) => t + x, 0);
  for (let i = 0; i < list.length; i += 1) { r -= w[i]; if (r <= 0) return list[i]; }
  return list[list.length - 1];
}
function makeQuestion(pool, mix, last) {
  let [a, b] = pickFact(pool, last);
  if (Math.random() < 0.5) [a, b] = [b, a];
  const p = a * b;
  const r = mix ? Math.random() : 1;
  if (r < 0.25) return { a, b, key: keyOf(a, b), html: `${p} ÷ ${a} = <span class="ans">?</span>`, answer: b, full: `${p} ÷ ${a} = ${b}` };
  if (r < 0.4) return { a, b, key: keyOf(a, b), html: `${a} × <span class="ans">?</span> = ${p}`, answer: b, full: `${a} × ${b} = ${p}` };
  return { a, b, key: keyOf(a, b), html: `${a} × ${b} = <span class="ans">?</span>`, answer: p, full: `${a} × ${b} = ${p}` };
}
const poolFor = (tables) => tables.flatMap((a) => Array.from({ length: 12 }, (_, i) => [a, i + 1]));

// ---------- shared bits ----------
const ARRAY_COLORS = ["#4f6df5", "#e8590c", "#1f9d61", "#8a5ce0", "#d6336c", "#0ca5b7"];
function arrayHTML(cols, rows) {
  const size = Math.max(14, Math.min(34, Math.floor(260 / Math.max(cols, rows))));
  const dots = Array.from({ length: cols * rows }, (_, i) => `<i style="--c:${ARRAY_COLORS[Math.floor(i / cols) % ARRAY_COLORS.length]}"></i>`).join("");
  return `<div class="array" style="grid-template-columns:repeat(${cols},${size}px)" aria-hidden="true">${dots}</div>`;
}
function tableChips(selected, multi, mark) {
  return `<div class="tbl-chips" id="tc">${Array.from({ length: 12 }, (_, i) => i + 1).map((t) => `<button class="g-chip" data-t="${t}" aria-pressed="${selected.includes(t)}">${t}${mark && tableMastered(t) ? '<span class="st" title="Mastered">⭐</span>' : ""}</button>`).join("")}</div>`;
}
let stopQuiz = () => {};

// ---------- tabs ----------
function setTab(tab) {
  stopQuiz();
  stopQuiz = () => {};
  data.tab = tab;
  save();
  document.querySelectorAll("#tabs .g-chip").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.tab === tab)));
  ({ learn: viewLearn, practice: () => viewSetup("practice"), speed: () => viewSetup("speed"), progress: viewProgress })[tab]();
}
$("tabs").addEventListener("click", (e) => { const b = e.target.closest("[data-tab]"); if (b) setTab(b.dataset.tab); });

// ---------- learn ----------
const TIPS = {
  1: "Any number times 1 stays the same.",
  2: "Just double the number. All the answers are even.",
  3: "Count in threes. Add up the digits of any answer in the 3 times table: you always get 3, 6 or 9.",
  4: "Double it, then double it again.",
  5: "The answers end in 0 or 5. Half of ten times the number: 5 × 6 is half of 60.",
  6: "Do 5 × the number, then add one more group of the number.",
  7: "Learn 7 × 7 = 49 and remember “5, 6, 7, 8”: 56 = 7 × 8.",
  8: "Double three times: 8 × 3 → 3, 6, 12, 24. Remember “5, 6, 7, 8”: 56 = 7 × 8.",
  9: "Ten times the number, minus one group: 9 × 6 = 60 − 6. The digits of every answer add up to 9.",
  10: "Put a zero on the end of the number.",
  11: "Up to 9 × 11 the digit repeats: 33, 44, 55… Then 10 × 11 = 110, 11 × 11 = 121, 12 × 11 = 132.",
  12: "Ten times the number plus two times the number: 12 × 7 = 70 + 14.",
};
let learnM = 3;
let hideAns = false;
const revealed = new Set();
function viewLearn() {
  const n = data.learnN;
  const rows = Array.from({ length: 12 }, (_, i) => i + 1).map((m) => `<button class="fact${m === learnM ? " on" : ""}${hideAns && !revealed.has(m) ? " hidden" : ""}" data-m="${m}"><span>${n} × ${m}</span><b>${n * m}</b></button>`).join("");
  const skip = Array.from({ length: 12 }, (_, i) => `<span style="opacity:${i + 1 <= learnM ? 1 : 0.3}">${n * (i + 1)}</span>`).join("");
  view.innerHTML = `<div class="panel"><span class="lbl">Pick a times table</span>${tableChips([n], false, true)}</div>
    <div class="learn">
      <div class="panel"><h2>The ${n} times table</h2>
        <div class="row" style="margin-bottom:10px"><button class="g-chip" id="hideAns" aria-pressed="${hideAns}">Hide answers</button><span class="muted" style="font-size:0.82rem">${hideAns ? "Tap a row to reveal it" : "Tap a row to see it as dots"}</span></div>
        <div class="facts">${rows}</div></div>
      <div class="panel"><h2>${n} × ${learnM} = ${n * learnM}</h2>
        <div class="array-wrap">${arrayHTML(n, learnM)}<div class="eq">${learnM} rows of ${n} = ${n * learnM}</div></div>
        <span class="lbl" style="margin-top:12px">Counting in ${n}s</span><div class="skip">${skip}</div>
        <p class="tip">💡 ${TIPS[n]}</p>
        <div class="row" style="margin-top:14px"><button class="g-btn" id="quizMe">Quiz me on the ${n} table</button></div></div>
    </div>`;
  $("tc").addEventListener("click", (e) => { const b = e.target.closest("[data-t]"); if (b) { data.learnN = Number(b.dataset.t); revealed.clear(); save(); viewLearn(); } });
  view.querySelector(".facts").addEventListener("click", (e) => { const b = e.target.closest("[data-m]"); if (!b) return; learnM = Number(b.dataset.m); revealed.add(learnM); sfx.key(); viewLearn(); });
  $("hideAns").addEventListener("click", () => { hideAns = !hideAns; revealed.clear(); viewLearn(); });
  $("quizMe").addEventListener("click", () => { data.sel = [n]; save(); setTab("practice"); startQuiz("practice", { tables: [n] }); });
}

// ---------- setup (practice and speed) ----------
function viewSetup(mode) {
  const best = Object.keys(data.best).length && mode === "speed";
  view.innerHTML = `<div class="panel"><h2>${mode === "speed" ? "Speed round: 60 seconds" : "Practice"}</h2>
      <p class="muted" style="margin:0 0 12px">${mode === "speed" ? "Answer as many as you can before the clock runs out. Streaks earn bonus points." : "No clock. The questions you find tricky come up more often."}</p>
      <span class="lbl">Which tables?</span>${tableChips(data.sel, true, true)}
      <div class="row" style="margin-top:10px"><button class="g-chip" id="allT">All</button><button class="g-chip" id="easyT">1–5</button><button class="g-chip" id="hardT">6–12</button></div>
      <span class="lbl" style="margin-top:14px">Question types</span>
      <div class="g-chips" id="mixc"><button class="g-chip" data-mix="0" aria-pressed="${!data.mix}">× only</button><button class="g-chip" data-mix="1" aria-pressed="${data.mix}">Mixed: × ÷ and missing numbers</button></div>
      <div class="row" style="margin-top:16px"><button class="g-btn" id="go">${mode === "speed" ? "Start the clock" : "Start practice"}</button>${best ? `<span class="muted" id="bestNote"></span>` : ""}</div></div>`;
  const note = $("bestNote");
  const refresh = () => {
    document.querySelectorAll("#tc .g-chip").forEach((b) => b.setAttribute("aria-pressed", String(data.sel.includes(Number(b.dataset.t)))));
    $("go").disabled = !data.sel.length;
    if (note) { const b = data.best[bestKey(data.sel, data.mix)]; note.textContent = b ? `Your best with these tables: ${b}` : ""; }
  };
  $("tc").addEventListener("click", (e) => { const b = e.target.closest("[data-t]"); if (!b) return; const t = Number(b.dataset.t); data.sel = data.sel.includes(t) ? data.sel.filter((x) => x !== t) : [...data.sel, t].sort((x, y) => x - y); save(); refresh(); });
  $("allT").addEventListener("click", () => { data.sel = Array.from({ length: 12 }, (_, i) => i + 1); save(); refresh(); });
  $("easyT").addEventListener("click", () => { data.sel = [1, 2, 3, 4, 5]; save(); refresh(); });
  $("hardT").addEventListener("click", () => { data.sel = [6, 7, 8, 9, 10, 11, 12]; save(); refresh(); });
  $("mixc").addEventListener("click", (e) => { const b = e.target.closest("[data-mix]"); if (!b) return; data.mix = b.dataset.mix === "1"; save(); document.querySelectorAll("#mixc .g-chip").forEach((x) => x.setAttribute("aria-pressed", String(x === b))); refresh(); });
  $("go").addEventListener("click", () => startQuiz(mode, { tables: data.sel }));
  refresh();
}
const bestKey = (tables, mix) => `${[...tables].sort((a, b) => a - b).join(",")}${mix ? "m" : ""}`;

// ---------- the quiz ----------
function startQuiz(mode, { tables, pool }) {
  stopQuiz();
  const facts = pool || poolFor(tables);
  const speed = mode === "speed";
  const LIMIT = 60000;
  let q = null, typed = "", locked = false, startedAt = 0, qStart = 0, last = "";
  let score = 0, correct = 0, tries = 0, streak = 0, bestStreak = 0, timeLeft = LIMIT, timer = 0, waiting = false, ended = false;
  const missed = new Map();
  view.innerHTML = `<div class="panel quiz">
      <div class="stats" id="st"></div>
      ${speed ? '<div class="timer" aria-hidden="true"><i id="bar"></i></div>' : ""}
      <div class="q" id="q" aria-live="polite"></div>
      <div class="fb" id="fb"></div>
      <div id="vis"></div>
      <div class="pad" id="pad">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => `<button data-k="${d}">${d}</button>`).join("")}<button data-k="back" aria-label="Delete">⌫</button><button data-k="0">0</button><button data-k="go" class="go" aria-label="Check answer">✓</button></div>
      <div class="row center" style="margin-top:10px"><button class="g-btn ghost" id="finish">${speed ? "Stop" : "Finish"}</button></div></div>`;
  const qEl = $("q"), fb = $("fb"), vis = $("vis");
  const stats = () => {
    $("st").innerHTML = speed
      ? `<span>${score}<small>Score</small></span><span>${Math.ceil(timeLeft / 1000)}s<small>Time</small></span><span>${streak}<small>Streak</small></span>`
      : `<span>${correct}/${tries}<small>Correct</small></span><span>${streak}<small>Streak</small></span><span>${mastery()}%<small>Mastered</small></span>`;
  };
  const show = (cls = "") => { qEl.className = `q ${cls}`; qEl.innerHTML = q.html.replace('<span class="ans">?</span>', `<span class="ans">${typed || "?"}</span>`); };
  function next() {
    q = makeQuestion(facts, data.mix, last);
    last = q.key;
    typed = ""; locked = false; waiting = false; qStart = performance.now();
    fb.textContent = ""; fb.className = "fb"; vis.innerHTML = "";
    show();
    stats();
  }
  function submit() {
    if (locked || ended || !typed) return;
    locked = true;
    tries += 1;
    const ok = Number(typed) === q.answer;
    record(q.a, q.b, ok, performance.now() - qStart);
    if (ok) {
      correct += 1; streak += 1; bestStreak = Math.max(bestStreak, streak);
      score += 10 + 2 * Math.min(streak, 5);
      sfx.right();
      show("good"); fb.textContent = speed ? "" : ["Yes!", "Great!", "Spot on!", "Nice one!"][correct % 4]; fb.className = "fb good";
      stats();
      setTimeout(() => { if (!ended) next(); }, (speed ? 220 : 650) / SPEED);
    } else {
      streak = 0; missed.set(q.key, q.full.split(" =")[0].replace("?", "").trim());
      missed.set(q.key, `${Math.min(q.a, q.b)} × ${Math.max(q.a, q.b)}`);
      sfx.wrong();
      show("bad"); qEl.classList.add("shake");
      fb.className = "fb bad"; fb.textContent = `It's ${q.full}`;
      stats();
      if (speed) setTimeout(() => { if (!ended) next(); }, 900 / SPEED);
      else {
        vis.innerHTML = `<div class="array-wrap">${arrayHTML(q.a, q.b)}<div class="eq">${q.b} rows of ${q.a} = ${q.a * q.b}</div><button class="g-btn" id="gotIt" style="margin-top:10px">Got it</button></div>`;
        waiting = true;
        $("gotIt").focus({ preventScroll: true });
        $("gotIt").addEventListener("click", next);
      }
    }
  }
  function press(k) {
    if (ended) return;
    if (waiting) { if (k === "go") next(); return; }
    if (locked) return;
    if (k === "back") typed = typed.slice(0, -1);
    else if (k === "go") return submit();
    else if (typed.length < 3) typed += k;
    sfx.key();
    show();
    if (typed.length === String(q.answer).length) setTimeout(() => { if (!locked && !ended && typed.length === String(q.answer).length) submit(); }, 150 / SPEED);
  }
  const onKey = (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (/^[0-9]$/.test(e.key)) press(e.key);
    else if (e.key === "Backspace") press("back");
    else if (e.key === "Enter") { if (e.target.tagName === "BUTTON" && e.target.id !== "gotIt") return; e.preventDefault(); press("go"); }
  };
  document.addEventListener("keydown", onKey);
  $("pad").addEventListener("click", (e) => { const b = e.target.closest("[data-k]"); if (b) press(b.dataset.k); });
  function end() {
    if (ended) return;
    ended = true;
    clearInterval(timer);
    document.removeEventListener("keydown", onKey);
    sfx.done();
    const acc = tries ? Math.round((correct / tries) * 100) : 0;
    let extra = "";
    if (speed) {
      const k = bestKey(tables, data.mix);
      const old = data.best[k] || 0;
      if (score > old) { data.best[k] = score; save(); extra = `<p style="font-weight:800;color:var(--green)">🏆 New best score${old ? ` (was ${old})` : ""}!</p>`; }
      else extra = `<p class="muted">Your best with these tables: ${old}</p>`;
    }
    const list = [...missed.values()];
    view.innerHTML = `<div class="panel summary"><h2>${speed ? "Time's up!" : "Nice practice!"}</h2>
      <div class="big">${speed ? score : `${correct}/${tries}`}</div>
      <p class="muted">${speed ? `${correct} correct · ${acc}% accuracy · best streak ${bestStreak}` : `${acc}% correct · best streak ${bestStreak} · ${mastery()}% of all facts mastered`}</p>${extra}
      ${list.length ? `<span class="lbl">Worth another look</span><div class="review">${list.map((x) => `<span>${x}</span>`).join("")}</div>` : tries ? '<p style="font-weight:800">Not a single mistake! 🌟</p>' : ""}
      <div class="row center"><button class="g-btn" id="again">${speed ? "Play again" : "Keep practising"}</button><button class="g-btn ghost" id="setup">Change tables</button><button class="g-btn ghost" id="map">See my progress</button></div></div>`;
    $("again").addEventListener("click", () => startQuiz(mode, { tables, pool }));
    $("setup").addEventListener("click", () => setTab(mode));
    $("map").addEventListener("click", () => setTab("progress"));
  }
  $("finish").addEventListener("click", end);
  stopQuiz = () => { ended = true; clearInterval(timer); document.removeEventListener("keydown", onKey); };
  if (speed) {
    startedAt = performance.now();
    timer = setInterval(() => {
      timeLeft = Math.max(0, LIMIT - (performance.now() - startedAt) * SPEED);
      const bar = $("bar");
      if (bar) bar.style.transform = `scaleX(${timeLeft / LIMIT})`;
      stats();
      if (timeLeft <= 0) end();
    }, 100);
  }
  next();
}

// ---------- progress ----------
function viewProgress() {
  let cells = '<div class="h"></div>' + Array.from({ length: 12 }, (_, i) => `<div class="h">${i + 1}</div>`).join("");
  for (let a = 1; a <= 12; a += 1) {
    cells += `<div class="h">${a}</div>`;
    for (let b = 1; b <= 12; b += 1) cells += `<button class="b${boxOf(a, b)}" data-a="${a}" data-b="${b}" aria-label="${a} times ${b}: ${["not tried yet", "needs work", "getting there", "good", "very good", "mastered"][boxOf(a, b) + 1]}">${a * b}</button>`;
  }
  const weak = [];
  for (let a = 1; a <= 12; a += 1) for (let b = a; b <= 12; b += 1) { const r = rec(a, b); if (r && r.b <= 1) weak.push([a, b]); }
  view.innerHTML = `<div class="panel"><h2>My times tables map <span class="muted" style="font-size:0.9rem;font-weight:600">· ${mastery()}% mastered</span></h2>
      <div class="map" id="map">${cells}</div>
      <div class="legend"><span><i style="background:#8a93aa"></i>Not tried</span><span><i style="background:#e5484d"></i>Needs work</span><span><i style="background:#f08a3c"></i>Getting there</span><span><i style="background:#e8b730"></i>Good</span><span><i style="background:#8cc152"></i>Very good</span><span><i style="background:#1f9d61"></i>Mastered</span></div>
      <p class="muted" id="detail" style="margin:12px 0 0;min-height:1.4em">Tap a square to see how you're doing with that fact.</p></div>
    <div class="panel"><div class="row"><button class="g-btn" id="weak" ${weak.length ? "" : "disabled"}>Practise my ${weak.length ? weak.length : ""} tricky facts</button><button class="g-btn ghost" id="reset">Reset my progress</button></div>
      <p class="muted" style="margin:10px 0 0;font-size:0.85rem">${weak.length ? "These are facts you have missed or answered slowly." : "No tricky facts yet. Do some practice and they will show up here."} Your progress is saved on this device.</p></div>`;
  $("map").addEventListener("click", (e) => {
    const b = e.target.closest("[data-a]");
    if (!b) return;
    const a = Number(b.dataset.a), c = Number(b.dataset.b), r = rec(a, c);
    $("detail").textContent = r ? `${a} × ${c} = ${a * c}: tried ${r.n} time${r.n === 1 ? "" : "s"}, ${r.c} right.` : `${a} × ${c} = ${a * c}: you haven't tried this one yet.`;
  });
  $("weak").addEventListener("click", () => { setTab("practice"); startQuiz("practice", { tables: [], pool: weak }); });
  $("reset").addEventListener("click", () => { if (confirm("Clear all your times tables progress on this device?")) { data.facts = {}; data.best = {}; save(); viewProgress(); } });
}

const mute = $("mute");
const syncMute = () => { mute.textContent = data.muted ? "Sound Off" : "Sound On"; mute.setAttribute("aria-pressed", String(data.muted)); };
mute.addEventListener("click", () => { data.muted = !data.muted; save(); syncMute(); });
syncMute();
setTab(["learn", "practice", "speed", "progress"].includes(data.tab) ? data.tab : "learn");
window.__tt = { data, startQuiz, setTab, makeQuestion, poolFor, record, press: null };
