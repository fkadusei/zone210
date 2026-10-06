// ABC & 123: learn the alphabet and numbers 0 to 20 with a friendly voice.
// Learn (tap to hear), Find the letter, Big & small, Count, Find the number and Trace with a finger.
import { LETTERS, NUMBER_WORDS, THINGS, PRAISE, CLIPS } from "./data.js";

const $ = (id) => document.getElementById(id);
const store = {
  get(key, fallback) { try { const raw = localStorage.getItem(key); return raw === null ? fallback : JSON.parse(raw); } catch (err) { return fallback; } },
  set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (err) { /* private mode */ } },
};
const KEY = "zone210_abc123";
const data = { tab: "abc", stars: 0, muted: false, seenL: [], seenN: [], small: false, max: 10, traceSet: "ABC", traceI: 0, ...store.get(KEY, {}) };
const save = () => store.set(KEY, data);
const view = $("view");
const rand = (n) => Math.floor(Math.random() * n);
const shuffle = (a) => { for (let i = a.length - 1; i > 0; i -= 1) { const j = rand(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const calm = () => document.documentElement.getAttribute("data-saver") === "on" || matchMedia("(prefers-reduced-motion: reduce)").matches;
const lc = (L) => L.toLowerCase();
const COLORS = [350, 25, 45, 140, 175, 205, 230, 265, 300];
const hue = (i) => COLORS[i % COLORS.length];

// ---------- the voice: recorded clips, or the device's voice if a clip is missing ----------
const VOICE = "af_heart";
const CLIPS_V = 4; // raise when the clips are re-recorded, so phones do not keep playing cached old ones
let have = null;
let voice = VOICE; // the folder named in audio/index.json (the recorded voice in use)
fetch("audio/index.json").then((r) => r.json()).then((j) => { voice = Object.keys(j)[0] || VOICE; have = new Set(j[voice] || []); }).catch(() => { have = new Set(); });
const player = new Audio();
player.preload = "auto";
let token = 0;
function speak(k, done) {
  const text = CLIPS[k];
  if (!text || !window.speechSynthesis) { done(); return; }
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-US";
  u.rate = 0.78;
  u.pitch = 1.05;
  u.onend = done;
  u.onerror = done;
  speechSynthesis.speak(u);
}
function play(k, done) {
  let over = false;
  const fin = () => { if (!over) { over = true; done(); } };
  setTimeout(fin, 9000); // never get stuck on a clip that does not end
  if (have && have.has(k)) {
    player.onended = fin;
    player.onerror = () => speak(k, fin);
    player.src = `audio/${voice}/${k}.m4a?v=${CLIPS_V}`;
    player.play().catch(() => speak(k, fin));
  } else speak(k, fin);
}
// say(["p/find-letter", "l/a"]) or with steps that run as each clip starts: { k: "n/3", on: () => ... }
function say(items, then) {
  token += 1;
  const my = token;
  player.pause();
  try { speechSynthesis.cancel(); } catch (err) { /* no speech */ }
  const q = items.map((it) => (typeof it === "string" ? { k: it } : it));
  const step = () => {
    if (my !== token) return;
    const it = q.shift();
    if (!it) { if (then) then(); return; }
    if (it.on) it.on();
    if (!it.k) { step(); return; }
    if (data.muted) { setTimeout(step, 800); return; }
    play(it.k, () => setTimeout(step, it.gap ?? 320));
  };
  step();
}
const hush = () => { token += 1; player.pause(); try { speechSynthesis.cancel(); } catch (err) { /* no speech */ } };
const praise = () => PRAISE[rand(PRAISE.length)];

// ---------- little sounds and a burst of stars ----------
function tone(freqs, type = "sine") {
  const ac = window.z210Audio && window.z210Audio.get();
  if (!ac) return;
  freqs.forEach((f, i) => {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.value = f;
    const t = ac.currentTime + i * 0.09;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.18, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    o.connect(g).connect(ac.destination); o.start(t); o.stop(t + 0.32);
  });
}
const ding = () => tone([660, 880, 1320]);
const boop = () => tone([240, 190], "triangle");
function burst() {
  if (calm()) return;
  const box = $("cheer");
  for (let i = 0; i < 14; i += 1) {
    const s = document.createElement("span");
    s.textContent = ["⭐", "✨", "🌟", "🎉"][i % 4];
    s.style.setProperty("--x", `${(Math.random() - 0.5) * 70}vw`);
    s.style.setProperty("--y", `${-20 - Math.random() * 50}vh`);
    s.style.setProperty("--d", `${0.9 + Math.random() * 0.6}s`);
    box.appendChild(s);
    setTimeout(() => s.remove(), 1700);
  }
}
function addStar() { data.stars += 1; save(); paintStars(); }
function paintStars() { $("stars").textContent = `⭐ ${data.stars}`; $("stars").setAttribute("aria-label", `${data.stars} stars`); }

// ---------- tabs ----------
const TABS = { abc: viewABC, findL: () => startQuiz("findL"), match: () => startQuiz("match"), num: viewNum, count: () => startQuiz("count"), findN: () => startQuiz("findN"), trace: viewTrace };
function setTab(tab) {
  hush();
  data.tab = TABS[tab] ? tab : "abc";
  save();
  document.querySelectorAll("#tabs .g-chip").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.tab === data.tab)));
  TABS[data.tab]();
}
$("tabs").addEventListener("click", (e) => { const b = e.target.closest("[data-tab]"); if (b) setTab(b.dataset.tab); });
function paintMute() { $("mute").textContent = data.muted ? "🔇 Voice off" : "🔊 Voice on"; $("mute").setAttribute("aria-pressed", String(data.muted)); }
$("mute").addEventListener("click", () => { data.muted = !data.muted; save(); paintMute(); if (data.muted) hush(); });

// ---------- Learn ABC ----------
function viewABC() {
  view.innerHTML = `<div class="tiles" id="grid">${LETTERS.map((x, i) => `<button class="tile${data.seenL.includes(x.L) ? " seen" : ""}" data-i="${i}" style="--h:${hue(i)}" aria-label="${x.L}, ${x.word}">${x.L}<small>${lc(x.L)}</small></button>`).join("")}</div>
    <div class="row center"><button class="g-btn" id="parade">▶ Say the A B C</button></div>`;
  $("grid").addEventListener("click", (e) => { const b = e.target.closest(".tile"); if (b) letterCard(Number(b.dataset.i)); });
  $("parade").addEventListener("click", () => {
    const tiles = [...view.querySelectorAll(".tile")];
    const lit = (i) => { tiles.forEach((t) => t.classList.remove("lit")); if (tiles[i]) { tiles[i].classList.add("lit"); if (!calm()) tiles[i].scrollIntoView({ block: "nearest" }); } };
    say(["p/abc", ...LETTERS.map((x, i) => ({ k: `l/${lc(x.L)}`, on: () => lit(i), gap: 220 })), { on: () => lit(-1) }], () => { ding(); burst(); });
  });
}
function letterCard(i) {
  const x = LETTERS[i];
  if (!data.seenL.includes(x.L)) { data.seenL.push(x.L); save(); }
  const word = x.word.replace(new RegExp(`^${x.L}`, "i"), (m) => `<b>${m}</b>`);
  view.innerHTML = `<div class="card" style="--h:${hue(i)}">
      <div class="big">${x.L}<span>${lc(x.L)}</span></div>
      <div class="pic" aria-hidden="true">${x.emoji}</div>
      <p class="word">${word}</p>
      <div class="row center">
        <button class="g-btn ghost" id="prev" aria-label="Previous letter">◀</button>
        <button class="g-btn" id="hear">🔊 Hear it</button>
        <button class="g-btn ghost" id="next" aria-label="Next letter">▶</button>
      </div>
      <button class="g-btn ghost back" id="all">All letters</button>
    </div>`;
  const hear = () => say([`l/${lc(x.L)}`, `w/${lc(x.L)}`]);
  $("hear").addEventListener("click", hear);
  $("prev").addEventListener("click", () => letterCard((i + 25) % 26));
  $("next").addEventListener("click", () => letterCard((i + 1) % 26));
  $("all").addEventListener("click", viewABC);
  hear();
}

// ---------- Learn 123 ----------
function viewNum() {
  view.innerHTML = `<div class="tiles nums" id="grid">${NUMBER_WORDS.map((w, n) => `<button class="tile${data.seenN.includes(n) ? " seen" : ""}" data-n="${n}" style="--h:${hue(n + 3)}" aria-label="${w}">${n}</button>`).join("")}</div>`;
  $("grid").addEventListener("click", (e) => { const b = e.target.closest(".tile"); if (b) numberCard(Number(b.dataset.n)); });
}
// up to 20 things in ten-frames: rows of five, so children can see "five and three more"
function frames(n, thing) {
  const frame = (start) => `<div class="frame">${Array.from({ length: 10 }, (_, k) => `<span class="dot${start + k < n ? " on" : ""}" data-k="${start + k}">${start + k < n ? thing : ""}</span>`).join("")}</div>`;
  return `<div class="frames">${frame(0)}${n > 10 ? frame(10) : ""}</div>`;
}
function numberCard(n) {
  if (!data.seenN.includes(n)) { data.seenN.push(n); save(); }
  const thing = THINGS[n % THINGS.length];
  view.innerHTML = `<div class="card" style="--h:${hue(n + 3)}">
      <div class="big">${n}</div>
      <p class="word">${NUMBER_WORDS[n]}</p>
      ${n ? frames(n, thing) : '<p class="empty">Zero means nothing at all! <span aria-hidden="true">🫙</span></p>'}
      <div class="row center">
        <button class="g-btn ghost" id="prev" aria-label="Previous number">◀</button>
        <button class="g-btn" id="hear">🔊 Count with me</button>
        <button class="g-btn ghost" id="next" aria-label="Next number">▶</button>
      </div>
      <button class="g-btn ghost back" id="all">All numbers</button>
    </div>`;
  const dots = [...view.querySelectorAll(".dot.on")];
  const count = () => {
    dots.forEach((d) => d.classList.remove("lit"));
    if (!n) { say(["n/0"]); return; }
    say(["p/count", ...dots.map((d, k) => ({ k: `n/${k + 1}`, on: () => d.classList.add("lit"), gap: 420 }))], () => { ding(); });
  };
  $("hear").addEventListener("click", count);
  $("prev").addEventListener("click", () => numberCard((n + 20) % 21));
  $("next").addEventListener("click", () => numberCard((n + 1) % 21));
  $("all").addEventListener("click", viewNum);
  count();
}

// ---------- quizzes: Find the letter, Big & small, Count, Find the number ----------
const ROUNDS = 10;
let Q = null;
function startQuiz(kind) {
  Q = { kind, round: 0, got: 0, last: [] };
  nextQuestion();
}
function options(kind) {
  if (kind === "findL") return `<div class="g-chips opts"><button class="g-chip" data-small="0" aria-pressed="${!data.small}">Big letters A B C</button><button class="g-chip" data-small="1" aria-pressed="${data.small}">Small letters a b c</button></div>`;
  if (kind === "count" || kind === "findN") return `<div class="g-chips opts"><button class="g-chip" data-max="10" aria-pressed="${data.max === 10}">Up to 10</button><button class="g-chip" data-max="20" aria-pressed="${data.max === 20}">Up to 20</button></div>`;
  return "";
}
function pickNew(range) {
  let v;
  for (let t = 0; t < 20; t += 1) { v = range(); if (!Q.last.includes(v)) break; }
  Q.last = [...Q.last.slice(-3), v];
  return v;
}
function nextQuestion() {
  if (Q.round >= ROUNDS) return finish();
  const k = Q.kind;
  let target, pool, prompt, show = "", label;
  if (k === "findL" || k === "match") {
    target = pickNew(() => rand(26));
    pool = shuffle([target, ...shuffle([...Array(26).keys()].filter((i) => i !== target)).slice(0, 3)]);
    const L = LETTERS[target].L;
    if (k === "findL") { prompt = [data.small ? "p/find-small" : "p/find-letter", `l/${lc(L)}`]; label = (i) => (data.small ? lc(LETTERS[i].L) : LETTERS[i].L); }
    else { prompt = ["p/match", `l/${lc(L)}`]; label = (i) => lc(LETTERS[i].L); show = `<div class="show" style="--h:${hue(target)}">${L}</div>`; }
  } else {
    const lo = k === "count" ? 1 : 0;
    target = pickNew(() => lo + rand(data.max - lo + 1));
    const near = shuffle([...Array(data.max - lo + 1).keys()].map((i) => i + lo).filter((v) => v !== target).sort((a, b) => Math.abs(a - target) - Math.abs(b - target)).slice(0, 5)).slice(0, 3);
    pool = shuffle([target, ...near]);
    label = (v) => String(v);
    if (k === "findN") prompt = ["p/find-number", `n/${target}`];
    else { prompt = ["p/how-many"]; show = frames(target, THINGS[rand(THINGS.length)]); }
  }
  Q.target = target;
  Q.tries = 0;
  Q.prompt = prompt;
  const dotsMeter = Array.from({ length: ROUNDS }, (_, i) => `<i class="${i < Q.round ? "done" : i === Q.round ? "now" : ""}"></i>`).join("");
  view.innerHTML = `${options(k)}
    <div class="quiz">
      <div class="meter" aria-label="Question ${Q.round + 1} of ${ROUNDS}">${dotsMeter}</div>
      ${show}
      <button class="g-btn ghost hear" id="again">🔊 Hear it again</button>
      <div class="choices${k === "findL" || k === "match" ? " letters" : ""}" id="choices">${pool.map((v, j) => `<button class="choice" data-v="${v}" style="--h:${hue(j * 2 + 1)}" aria-label="${label(v)}">${label(v)}</button>`).join("")}</div>
    </div>`;
  view.querySelectorAll("[data-small]").forEach((b) => b.addEventListener("click", () => { data.small = b.dataset.small === "1"; save(); startQuiz(k); }));
  view.querySelectorAll("[data-max]").forEach((b) => b.addEventListener("click", () => { data.max = Number(b.dataset.max); save(); startQuiz(k); }));
  $("again").addEventListener("click", () => say(Q.prompt));
  $("choices").addEventListener("click", (e) => { const b = e.target.closest(".choice"); if (b && !b.disabled) answer(b); });
  say(prompt);
}
function answer(b) {
  const v = Number(b.dataset.v);
  if (v !== Q.target) {
    Q.tries += 1;
    boop();
    b.classList.add("wrong");
    b.disabled = true;
    say(["p/try", ...Q.prompt]);
    return;
  }
  view.querySelectorAll(".choice").forEach((c) => { c.disabled = true; });
  b.classList.add("right");
  ding();
  if (Q.tries === 0) { Q.got += 1; addStar(); burst(); }
  Q.round += 1;
  const go = () => setTimeout(nextQuestion, 700);
  if (Q.kind === "count") {
    // count them together, then praise
    const dots = [...view.querySelectorAll(".dot.on")];
    say([...dots.map((d, k) => ({ k: `n/${k + 1}`, on: () => d.classList.add("lit"), gap: 380 })), praise()], go);
  } else if (Q.kind === "match") say([`l/${lc(LETTERS[Q.target].L)}`, praise()], go);
  else say([praise()], go);
}
function finish() {
  const k = Q.kind;
  view.innerHTML = `<div class="card done">
      <div class="pic" aria-hidden="true">🏆</div>
      <h2>Hooray, you finished!</h2>
      <p class="word small">You got ${Q.got} ${Q.got === 1 ? "star" : "stars"} first time out of ${ROUNDS}.</p>
      <p class="stars-row" aria-hidden="true">${"⭐".repeat(Q.got)}</p>
      <div class="row center"><button class="g-btn" id="again">Play again</button></div>
    </div>`;
  $("again").addEventListener("click", () => startQuiz(k));
  burst();
  say(["p/finished"]);
}

// ---------- Trace with a finger ----------
const TRACE_SETS = { ABC: LETTERS.map((x) => x.L), abc: LETTERS.map((x) => lc(x.L)), 123: Array.from({ length: 11 }, (_, n) => String(n)) };
function viewTrace() {
  const set = TRACE_SETS[data.traceSet] ? data.traceSet : "ABC";
  const list = TRACE_SETS[set];
  const i = Math.min(data.traceI, list.length - 1);
  const ch = list[i];
  view.innerHTML = `<div class="g-chips opts">${Object.keys(TRACE_SETS).map((s) => `<button class="g-chip" data-set="${s}" aria-pressed="${s === set}">${s === "123" ? "Numbers 0–10" : s === "ABC" ? "Big letters" : "Small letters"}</button>`).join("")}</div>
    <div class="trace" id="twrap"><canvas id="guide" aria-hidden="true"></canvas><canvas id="ink" role="img" aria-label="Trace ${ch} with your finger"></canvas></div>
    <p class="g-status" id="tstatus">Trace over the ${set === "123" ? "number" : "letter"} with your finger.</p>
    <div class="row center">
      <button class="g-btn ghost" id="prev" aria-label="Previous">◀</button>
      <button class="g-btn ghost" id="clear">↺ Start again</button>
      <button class="g-btn ghost" id="hear">🔊 Hear it</button>
      <button class="g-btn ghost" id="next" aria-label="Next">▶</button>
    </div>`;
  view.querySelectorAll("[data-set]").forEach((b) => b.addEventListener("click", () => { data.traceSet = b.dataset.set; data.traceI = 0; save(); viewTrace(); }));
  const go = (d) => { data.traceI = (i + d + list.length) % list.length; save(); viewTrace(); };
  $("prev").addEventListener("click", () => go(-1));
  $("next").addEventListener("click", () => go(1));
  const clip = set === "123" ? `n/${ch}` : `l/${lc(ch)}`;
  const hear = () => say([set === "123" ? "p/trace-number" : "p/trace-letter", clip]);
  $("hear").addEventListener("click", hear);

  const wrap = $("twrap");
  const size = Math.round(Math.min(wrap.clientWidth || 320, 440));
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const px = Math.round(size * dpr);
  const guide = $("guide"), ink = $("ink");
  [guide, ink].forEach((c) => { c.width = px; c.height = px; c.style.width = `${size}px`; c.style.height = `${size}px`; });
  wrap.style.height = `${size}px`;
  const FACE = '"Arial Rounded MT Bold", "Nunito", "Trebuchet MS", system-ui, sans-serif';
  // size the character so it fills about three quarters of the box, whatever font the device has
  const fit = (() => { const t = document.createElement("canvas").getContext("2d"); t.font = `800 100px ${FACE}`; const m = t.measureText(ch); const h = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent, w = m.actualBoundingBoxLeft + m.actualBoundingBoxRight; return Math.min((px * 0.74) / h, (px * 0.8) / w) * 100; })();
  const font = `800 ${Math.round(fit)}px ${FACE}`;
  const place = (c) => { c.font = font; c.textAlign = "center"; c.textBaseline = "alphabetic"; const m = c.measureText(ch); return px / 2 + (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2; };
  // the letter itself, and a fatter copy: drawing inside the fat copy counts as "on the letter"
  const mask = document.createElement("canvas"); mask.width = px; mask.height = px;
  const near = document.createElement("canvas"); near.width = px; near.height = px;
  const brush = px * 0.075;
  { const c = mask.getContext("2d"); const y = place(c); c.fillText(ch, px / 2, y); }
  { const c = near.getContext("2d"); const y = place(c); c.lineWidth = brush * 1.4; c.lineJoin = "round"; c.strokeText(ch, px / 2, y); c.fillText(ch, px / 2, y); }
  const g = guide.getContext("2d");
  const dark = document.documentElement.getAttribute("data-theme") === "dark";
  { const y = place(g); g.fillStyle = dark ? "rgba(255,255,255,0.14)" : "rgba(40,40,80,0.10)"; g.fillText(ch, px / 2, y); g.setLineDash([px * 0.02, px * 0.022]); g.lineWidth = px * 0.008; g.strokeStyle = dark ? "rgba(255,255,255,0.55)" : "rgba(40,40,80,0.45)"; g.strokeText(ch, px / 2, y); }
  const mData = mask.getContext("2d").getImageData(0, 0, px, px).data;
  const nData = near.getContext("2d").getImageData(0, 0, px, px).data;
  const c = ink.getContext("2d");
  c.lineCap = "round"; c.lineJoin = "round"; c.lineWidth = brush; c.strokeStyle = `hsl(${hue(i)} 80% 55%)`;
  // the same path drawn wider off screen: a part of the letter close to the finger's path counts as traced,
  // so a child who follows the middle of a thick stroke covers all of it
  const reach = document.createElement("canvas"); reach.width = px; reach.height = px;
  const rc = reach.getContext("2d"); rc.lineCap = "round"; rc.lineJoin = "round"; rc.lineWidth = brush * 2.4;
  let drawing = false, lastPt = null, done = false;
  const pt = (e) => { const r = ink.getBoundingClientRect(); return { x: (e.clientX - r.left) * (px / r.width), y: (e.clientY - r.top) * (px / r.height) }; };
  ink.addEventListener("pointerdown", (e) => { if (done) return; drawing = true; ink.setPointerCapture(e.pointerId); lastPt = pt(e); c.beginPath(); c.arc(lastPt.x, lastPt.y, brush / 2, 0, Math.PI * 2); c.fillStyle = c.strokeStyle; c.fill(); rc.beginPath(); rc.arc(lastPt.x, lastPt.y, brush * 1.2, 0, Math.PI * 2); rc.fill(); });
  ink.addEventListener("pointermove", (e) => { if (!drawing) return; const p = pt(e); for (const k of [c, rc]) { k.beginPath(); k.moveTo(lastPt.x, lastPt.y); k.lineTo(p.x, p.y); k.stroke(); } lastPt = p; });
  const end = () => { if (!drawing) return; drawing = false; check(); };
  ink.addEventListener("pointerup", end);
  ink.addEventListener("pointercancel", end);
  function check() {
    const iData = c.getImageData(0, 0, px, px).data;
    const rData = rc.getImageData(0, 0, px, px).data;
    let letter = 0, covered = 0, inked = 0, outside = 0;
    const step = Math.max(2, Math.round(px / 160));
    for (let y = 0; y < px; y += step) for (let x = 0; x < px; x += step) {
      const o = (y * px + x) * 4 + 3;
      const onL = mData[o] > 128, onI = iData[o] > 128;
      if (onL) { letter += 1; if (rData[o] > 128) covered += 1; }
      if (onI) { inked += 1; if (nData[o] < 128) outside += 1; }
    }
    const cover = letter ? covered / letter : 0, off = inked ? outside / inked : 0;
    ink.dataset.score = `${cover.toFixed(2)} ${off.toFixed(2)}`;
    if (off > 0.3) { $("tstatus").textContent = "Try to stay on the dotted lines. Tap Start again to have another go."; return; }
    if (cover >= 0.8) {
      done = true;
      $("tstatus").textContent = "Brilliant tracing!";
      addStar(); ding(); burst();
      say([clip, praise()], () => setTimeout(() => go(1), 600));
    } else $("tstatus").textContent = cover > 0.2 ? "Keep going, you're doing great!" : "Trace over the dotted lines with your finger.";
  }
  $("clear").addEventListener("click", () => { c.clearRect(0, 0, px, px); rc.clearRect(0, 0, px, px); done = false; $("tstatus").textContent = "Trace over the dotted lines with your finger."; });
  hear();
}

paintStars();
paintMute();
setTab(data.tab);
