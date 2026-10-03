import { createOnline } from "../../assets/online.js";
import { pool } from "./words.js";

const $ = (id) => document.getElementById(id);
const cv = $("cv");
const ctx = cv.getContext("2d");
const stageEl = $("stage");
const statusEl = $("status");

const opts = { mode: "two", count: 3, level: "easy", secs: 60, rounds: 2 };
const COLORS = ["#111111", "#e5484d", "#f5a623", "#f5d90a", "#2fb36d", "#3b82f6", "#8a5ce0", "#ec6aa0", "#8b5a2b", "#8a8f9c"];
const brush = { color: COLORS[0], size: 12, erase: false };
let G = null; // the game: { n, round, total, scores, word, phase, strokes, guesses, deadline, secs, used, hint, result }
let me = 0; // my seat online
let tick = 0; // timer interval
let nextT = 0; // timer to the next turn
let drawing = null; // the stroke being drawn right now
let sendT = 0;
let unsent = [];

const online = () => opts.mode === "online";
const seats = () => (online() ? 2 : opts.count);
const nameOf = (p) => (online() ? (p === me ? "You" : "Friend") : `Player ${p + 1}`);
const drawer = () => (G ? G.round % G.n : 0);
const iDraw = () => !!G && (online() ? drawer() === me : true);
const norm = (t) => String(t).toLowerCase().replace(/[^a-z0-9]/g, "");

/* ---------- sounds ---------- */
function tone(freq, at, dur, type = "triangle", vol = 0.08) {
  const c = window.z210Audio && window.z210Audio.get();
  if (!c) return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.value = freq;
  const t = c.currentTime + at;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g);
  g.connect(c.destination);
  o.start(t);
  o.stop(t + dur + 0.05);
}
const sfx = {
  ok: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, i * 0.08, 0.22)),
  no: () => tone(220, 0, 0.15, "sawtooth", 0.05),
  low: () => tone(880, 0, 0.07, "square", 0.04),
  end: () => [392, 330, 262].forEach((f, i) => tone(f, i * 0.12, 0.25)),
};

/* ---------- online ---------- */
const net = createOnline({
  container: document.querySelector(".g-page"),
  before: $("setup"),
  prefix: "zone210-drawguess-",
  names: ["Player 1", "Player 2"],
  privateState: true,
  startInfo: () => ({ level: opts.level, secs: opts.secs, rounds: opts.rounds }),
  onStart: ({ role, info }) => {
    me = role;
    if (info) { opts.level = info.level; opts.secs = info.secs; opts.rounds = info.rounds; syncChips(); }
    newGame();
  },
  onData: (m) => onMessage(m),
  onLeft: () => { stopTimers(); setStatus("Your friend left the game."); if (G) G.phase = "left"; render(); },
  getState: () => G,
  setState: (g) => {
    G = g;
    $("setup").hidden = true;
    $("play").hidden = false;
    $("end").hidden = true;
    redraw();
    render();
    $("veil").hidden = true;
    $("picker").hidden = true;
    stopTimers();
    if (G.phase === "draw") runTimer();
    else if (G.phase === "pick") { if (iDraw()) showChoices(); else showVeil(`${nameOf(drawer())} is choosing a word…`); }
    else if (G.phase === "reveal" && G.result) revealed();
    else if (G.phase === "over") showEnd();
  },
  onReconnect: () => {
    if (!G || !iDraw() || G.phase !== "draw") return;
    net.send({ t: "start", r: G.round, pat: pattern(), left: Math.max(1, Math.round((G.deadline - Date.now()) / 1000)), secs: G.secs, scores: G.scores });
    G.strokes.forEach((s, k) => net.send({ t: "p", k, c: s.c, w: s.w, e: s.e, pts: s.pts }));
  },
});

/* ---------- setup ---------- */
function syncChips() {
  [["level", "level"], ["secs", "secs"], ["rounds", "rounds"], ["count", "count"], ["mode", "mode"]].forEach(([id, key]) => {
    $(id).querySelectorAll(".g-chip").forEach((c) => c.setAttribute("aria-pressed", String(String(c.dataset.value) === String(opts[key]))));
  });
}
function wire(id, key, num) {
  $(id).addEventListener("click", (e) => {
    const chip = e.target.closest(".g-chip");
    if (!chip) return;
    opts[key] = num ? Number(chip.dataset.value) : chip.dataset.value;
    syncChips();
    if (key === "mode") {
      $("countRow").hidden = online();
      $("startRow").hidden = online();
      if (online()) net.open(); else net.close();
    }
  });
}
wire("mode", "mode");
wire("count", "count", true);
wire("level", "level");
wire("secs", "secs", true);
wire("rounds", "rounds", true);
$("start").addEventListener("click", () => newGame());
$("restart").addEventListener("click", () => { stopTimers(); G = null; $("play").hidden = true; $("setup").hidden = false; $("restart").hidden = true; $("end").hidden = true; setStatus(""); if (online()) net.open(); });
$("endAgain").addEventListener("click", () => { $("end").hidden = true; if (online()) { setStatus("Press Rematch to play again."); } else newGame(); });

function setStatus(t) { statusEl.textContent = t; }

/* ---------- the game ---------- */
function newGame() {
  stopTimers();
  const n = seats();
  G = { n, round: 0, total: n * opts.rounds, scores: new Array(n).fill(0), word: "", phase: "pick", strokes: [], guesses: [], deadline: 0, secs: opts.secs, used: [], hint: "", result: null, skipped: false };
  $("setup").hidden = true;
  $("play").hidden = false;
  $("end").hidden = true;
  $("restart").hidden = online();
  beginTurn();
}

function stopTimers() { clearInterval(tick); clearTimeout(nextT); tick = 0; }

function pickWords() {
  const all = pool(opts.level).filter((w) => !G.used.includes(w));
  const src = all.length >= 3 ? all : pool(opts.level);
  const out = [];
  while (out.length < 3) { const w = src[Math.floor(Math.random() * src.length)]; if (!out.includes(w)) out.push(w); }
  return out;
}

function beginTurn() {
  stopTimers();
  if (G.round >= G.total) { G.phase = "over"; render(); showEnd(); if (online()) net.setOver(true); return; }
  G.phase = "pick";
  G.word = "";
  G.strokes = [];
  G.guesses = [];
  G.result = null;
  G.hint = "";
  G.skipped = false;
  G.pat = "";
  G.hintA = false;
  G.hintB = false;
  $("picker").hidden = true;
  redraw();
  render();
  if (iDraw()) showChoices(); else { showVeil(`${nameOf(drawer())} is choosing a word…`); }
}

/* the word choice screen (the drawer only) */
function showChoices() {
  const choices = pickWords();
  const veil = $("veil");
  const handoff = !online();
  const showPick = () => {
    $("veilText").innerHTML = `${handoff ? `<span class="big">Choose your word</span>` : "Choose a word to draw"}`;
    const box = document.createElement("div");
    box.className = "g-chips";
    box.style.justifyContent = "center";
    choices.forEach((w) => { const b = document.createElement("button"); b.className = "g-btn"; b.textContent = w; b.addEventListener("click", () => startDraw(w)); box.appendChild(b); });
    const old = veil.querySelector(".g-chips");
    if (old) old.remove();
    $("veilText").after(box);
    $("veilBtn").hidden = true;
    veil.hidden = false;
  };
  if (handoff) {
    $("veilText").textContent = `Pass the device to ${nameOf(drawer())}. Everyone else look away!`;
    const old = veil.querySelector(".g-chips");
    if (old) old.remove();
    $("veilBtn").hidden = false;
    $("veilBtn").textContent = "I'm ready: show my words";
    $("veilBtn").onclick = showPick;
    veil.hidden = false;
  } else showPick();
}
function showVeil(text) {
  const veil = $("veil");
  const old = veil.querySelector(".g-chips");
  if (old) old.remove();
  $("veilText").textContent = text;
  $("veilBtn").hidden = true;
  veil.hidden = false;
}

function pattern() { return G.word.split(" ").map((w) => w.length).join(","); }
function blanks() {
  if (G.hint) return G.hint;
  return G.word.split("").map((ch) => (ch === " " ? "   " : ch === "-" ? "-" : "_")).join(" ");
}

function startDraw(word) {
  G.word = word;
  G.used.push(word);
  G.phase = "draw";
  G.deadline = Date.now() + G.secs * 1000;
  $("veil").hidden = true;
  setStatus(online() ? "Draw it! Your friend is guessing." : "Draw it! No letters or numbers. When someone guesses, tap the button below.");
  if (online()) net.send({ t: "start", r: G.round, pat: pattern(), left: G.secs, secs: G.secs, scores: G.scores });
  render();
  runTimer();
}

function runTimer() {
  clearInterval(tick);
  const t0 = G.secs * 1000;
  const loop = () => {
    if (!G || G.phase !== "draw") { clearInterval(tick); return; }
    const left = G.deadline - Date.now();
    const frac = Math.max(0, left / t0);
    $("timeFill").style.transform = `scaleX(${frac})`;
    $("timeNum").textContent = Math.max(0, Math.ceil(left / 1000));
    if (left <= 5500 && left > 0 && Math.ceil(left / 1000) !== loop.last) { loop.last = Math.ceil(left / 1000); sfx.low(); }
    // the drawer's side reveals letters to the guesser as time runs down
    if (online() && iDraw() && G.word) {
      if (frac < 0.5 && !G.hintA) { G.hintA = true; revealHint(1); }
      if (frac < 0.25 && !G.hintB) { G.hintB = true; revealHint(2); }
    }
    if (left <= 0) { clearInterval(tick); timeUp(); }
  };
  loop();
  tick = setInterval(loop, 250);
}
function revealHint(k) {
  const w = G.word.split("");
  let shown = 0;
  G.hint = w.map((ch, i) => (ch === " " ? "  " : ch === "-" ? "-" : (i < k && shown++ >= 0 ? ch : "_"))).join(" ");
  net.send({ t: "hint", hint: G.hint });
  render();
}

function timeUp() {
  if (!iDraw()) return; // online: the drawer decides when time is up
  if (online()) { finish(false, -1); return; }
  askWho(true);
}

/* pass & play: who guessed it? */
function askWho(timeIsUp) {
  const box = $("pickBtns");
  box.innerHTML = "";
  $("pickText").textContent = timeIsUp ? "Time's up! Did anyone guess it?" : "Who guessed it?";
  for (let p = 0; p < G.n; p += 1) {
    if (p === drawer()) continue;
    const b = document.createElement("button");
    b.className = "g-chip";
    b.textContent = nameOf(p);
    b.addEventListener("click", () => finish(true, p));
    box.appendChild(b);
  }
  const none = document.createElement("button");
  none.className = "g-chip";
  none.textContent = "Nobody";
  none.addEventListener("click", () => finish(false, -1));
  box.appendChild(none);
  $("picker").hidden = false;
}

function finish(ok, who) {
  if (!G || G.phase !== "draw") return;
  stopTimers();
  const left = Math.max(0, G.deadline - Date.now());
  const pts = ok ? 1 + Math.round((4 * left) / (G.secs * 1000)) : 0;
  if (ok) { G.scores[drawer()] += pts; if (who !== drawer()) G.scores[who] += pts; }
  G.result = { ok, who, pts, word: G.word };
  G.phase = "reveal";
  $("picker").hidden = true;
  if (online()) net.send({ t: "res", ok, who, pts, word: G.word, scores: G.scores });
  revealed();
}
function revealed() {
  const r = G.result;
  chime(r.ok);
  setStatus(r.ok ? `🎉 It was “${r.word}”! ${online() ? (r.who === me ? "You guessed it" : "Your friend guessed it") : `${nameOf(r.who)} guessed it`}: +${r.pts} each.` : `⏰ Nobody got it. The word was “${r.word}”.`);
  render();
  const next = document.createElement("button");
  next.className = "g-btn";
  next.textContent = G.round + 1 >= G.total ? "See results" : "Next turn ▶";
  next.addEventListener("click", advance);
  $("pickBtns").innerHTML = "";
  $("pickBtns").appendChild(next);
  if (!online()) { const save = document.createElement("button"); save.className = "g-btn ghost"; save.textContent = "💾 Save picture"; save.addEventListener("click", savePicture); $("pickBtns").appendChild(save); }
  $("pickText").textContent = r.ok ? "Nice one!" : "Better luck next time.";
  $("picker").hidden = false;
  if (online()) nextT = setTimeout(advance, 5000);
}
function chime(good) { if (good) sfx.ok(); else sfx.no(); }
function advance() {
  clearTimeout(nextT);
  if (!G || G.phase !== "reveal") return;
  $("picker").hidden = true;
  G.round += 1;
  beginTurn();
}
function savePicture() {
  const out = document.createElement("canvas");
  out.width = 800; out.height = 600;
  const o = out.getContext("2d");
  o.drawImage(cv, 0, 0);
  const a = document.createElement("a");
  a.download = `draw-guess-${G.word.replace(/\W+/g, "-")}.png`;
  a.href = out.toDataURL("image/png");
  a.click();
}

/* ---------- messages from the friend ---------- */
function onMessage(m) {
  if (!online()) return;
  if (m.t === "start") {
    stopTimers();
    if (!G) return;
    G.round = m.r; G.phase = "draw"; G.strokes = []; G.guesses = []; G.result = null; G.hint = ""; G.word = "";
    G.secs = m.secs; G.deadline = Date.now() + m.left * 1000; G.pat = m.pat; G.scores = m.scores || G.scores;
    $("veil").hidden = true; $("picker").hidden = true;
    setStatus("Your friend is drawing. Type your guess below!");
    redraw();
    render();
    runTimer();
  } else if (m.t === "p" && G) {
    if (m.k === G.strokes.length) G.strokes.push({ c: m.c, w: m.w, e: m.e, pts: [] });
    const s = G.strokes[m.k];
    if (!s) return;
    const from = s.pts.length;
    s.pts.push(...m.pts);
    drawStroke(s, Math.max(0, from - 1));
  } else if (m.t === "u" && G) { G.strokes.pop(); redraw(); }
  else if (m.t === "c" && G) { G.strokes = []; redraw(); }
  else if (m.t === "hint" && G) { G.hint = m.hint; render(); }
  else if (m.t === "g" && G && G.phase === "draw" && iDraw()) {
    const good = norm(m.w) === norm(G.word);
    G.guesses.push({ w: m.w, ok: good });
    net.send({ t: "gr", w: m.w, ok: good });
    render();
    if (good) finish(true, 1 - me);
  } else if (m.t === "gr" && G) { G.guesses.push({ w: m.w, ok: m.ok }); render(); if (!m.ok) sfx.no(); }
  else if (m.t === "res" && G && G.phase !== "reveal") {
    stopTimers();
    G.scores = m.scores; G.result = { ok: m.ok, who: m.who, pts: m.pts, word: m.word }; G.phase = "reveal"; G.word = m.word;
    revealed();
  }
}

/* ---------- drawing ---------- */
function pos(e) {
  const r = cv.getBoundingClientRect();
  return [Math.round(((e.clientX - r.left) / r.width) * 800), Math.round(((e.clientY - r.top) / r.height) * 600)];
}
function drawStroke(s, from = 0) {
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = s.e ? "#ffffff" : s.c;
  ctx.fillStyle = ctx.strokeStyle;
  ctx.lineWidth = s.w;
  if (s.pts.length === 1) { ctx.beginPath(); ctx.arc(s.pts[0][0], s.pts[0][1], s.w / 2, 0, Math.PI * 2); ctx.fill(); return; }
  ctx.beginPath();
  ctx.moveTo(s.pts[from][0], s.pts[from][1]);
  for (let i = from + 1; i < s.pts.length; i += 1) ctx.lineTo(s.pts[i][0], s.pts[i][1]);
  ctx.stroke();
}
function redraw() {
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, 800, 600);
  if (G) G.strokes.forEach((s) => drawStroke(s));
}
const canDraw = () => !!G && G.phase === "draw" && iDraw() && $("veil").hidden;
function flush() {
  if (!online() || !drawing || !unsent.length) return;
  net.send({ t: "p", k: G.strokes.length - 1, c: drawing.c, w: drawing.w, e: drawing.e, pts: unsent });
  unsent = [];
}
cv.addEventListener("pointerdown", (e) => {
  if (!canDraw()) return;
  e.preventDefault();
  try { cv.setPointerCapture(e.pointerId); } catch (err) { /* synthetic or already released */ }
  const p = pos(e);
  drawing = { c: brush.color, w: brush.size, e: brush.erase, pts: [p] };
  G.strokes.push(drawing);
  unsent = [p];
  drawStroke(drawing);
});
cv.addEventListener("pointermove", (e) => {
  if (!drawing) return;
  const p = pos(e);
  const last = drawing.pts[drawing.pts.length - 1];
  if (Math.abs(p[0] - last[0]) + Math.abs(p[1] - last[1]) < 2) return;
  drawing.pts.push(p);
  unsent.push(p);
  drawStroke(drawing, drawing.pts.length - 2);
  if (!sendT) sendT = setTimeout(() => { sendT = 0; flush(); }, 60);
});
const up = () => { if (!drawing) return; clearTimeout(sendT); sendT = 0; flush(); drawing = null; };
cv.addEventListener("pointerup", up);
cv.addEventListener("pointercancel", up);

$("undo").addEventListener("click", () => { if (!canDraw()) return; G.strokes.pop(); redraw(); net.send({ t: "u" }); });
$("clear").addEventListener("click", () => { if (!canDraw()) return; G.strokes = []; redraw(); net.send({ t: "c" }); });
$("eraser").addEventListener("click", () => { brush.erase = !brush.erase; paintTools(); });
$("skip").addEventListener("click", () => { if (!canDraw() || G.skipped || G.strokes.length) return; G.skipped = true; G.phase = "pick"; stopTimers(); showChoices(); render(); });
$("sizes").addEventListener("click", (e) => {
  const c = e.target.closest(".g-chip");
  if (!c) return;
  brush.size = Number(c.dataset.value);
  paintTools();
});
function paintTools() {
  $("sizes").querySelectorAll(".g-chip").forEach((c) => c.setAttribute("aria-pressed", String(Number(c.dataset.value) === brush.size)));
  $("eraser").setAttribute("aria-pressed", String(brush.erase));
  $("palette").querySelectorAll(".swatch").forEach((s) => s.setAttribute("aria-pressed", String(!brush.erase && s.dataset.c === brush.color)));
}
$("palette").innerHTML = COLORS.map((c) => `<button type="button" class="swatch" data-c="${c}" style="background:${c}" aria-label="Colour ${c}" aria-pressed="false"></button>`).join("");
$("palette").addEventListener("click", (e) => {
  const s = e.target.closest(".swatch");
  if (!s) return;
  brush.color = s.dataset.c;
  brush.erase = false;
  paintTools();
});
paintTools();

/* ---------- guessing (online) ---------- */
$("guessForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const v = $("guessIn").value.trim();
  if (!v || !G || G.phase !== "draw" || iDraw()) return;
  $("guessIn").value = "";
  net.send({ t: "g", w: v });
});

/* ---------- screen ---------- */
function render() {
  if (!G) return;
  $("scores").innerHTML = G.scores.map((v, p) => `<div class="score${drawer() === p && G.phase !== "over" ? " turn" : ""}"><span class="nm">${nameOf(p)}${drawer() === p && G.phase !== "over" ? " ✏️" : ""}</span><b>${v}</b></div>`).join("");
  const draw = G.phase === "draw";
  const mine = iDraw();
  const guessing = online() && !mine;
  $("tools").hidden = !(mine && (draw || G.phase === "pick") && G.phase !== "reveal");
  $("skip").hidden = !(mine && draw && !G.skipped && !G.strokes.length);
  $("guessForm").hidden = !(guessing && draw);
  stageEl.classList.toggle("locked", !canDraw());
  let wt = "";
  if (G.phase === "reveal" || G.phase === "over") wt = `<small>The word was</small>${G.result ? G.result.word : G.word}`;
  else if (draw && mine) wt = `<small>Draw this${online() ? "" : " (hide it from the others)"}</small>${G.word}`;
  else if (draw) wt = `<small>${online() ? "Guess the word" : "Guess the word"}</small>${G.hint || (G.pat ? G.pat.split(",").map((n) => Array(Number(n)).fill("_").join(" ")).join("   ") : blanks())}`;
  else wt = `<small>Turn ${Math.min(G.round + 1, G.total)} of ${G.total}</small>${G.phase === "pick" ? "Getting ready…" : ""}`;
  $("wordText").innerHTML = wt;
  if (!draw) { $("timeFill").style.transform = "scaleX(1)"; $("timeNum").textContent = G.phase === "pick" || G.phase === "reveal" ? "" : ""; }
  $("guesses").innerHTML = G.guesses.map((g) => `<li class="${g.ok ? "ok" : ""}">${g.ok ? "✓ " : ""}${g.w.replace(/</g, "&lt;")}</li>`).join("");
  // pass & play: a button for "someone guessed it"
  if (!online() && draw && mine) {
    if ($("picker").hidden) {
      $("pickBtns").innerHTML = "";
      const b = document.createElement("button");
      b.className = "g-btn";
      b.textContent = "✅ Someone guessed it!";
      b.addEventListener("click", () => askWho(false));
      $("pickBtns").appendChild(b);
      $("pickText").textContent = "Got a correct guess?";
      $("picker").hidden = false;
    }
  }
}

function showEnd() {
  const max = Math.max(...G.scores);
  const winners = G.scores.map((v, p) => (v === max ? p : -1)).filter((p) => p >= 0);
  $("endTitle").textContent = winners.length > 1 ? "It's a tie!" : online() ? (winners[0] === me ? "You win! 🎉" : "Your friend wins.") : `${nameOf(winners[0])} wins! 🎉`;
  $("endBody").innerHTML = G.scores.map((v, p) => `<div class="row${v === max ? " win" : ""}"><span>${nameOf(p)}</span><span>${v}</span></div>`).join("");
  $("endAgain").hidden = online();
  $("end").hidden = false;
  sfx.end();
}

redraw();

// invite link (?room=CODE): jump straight into online mode and join
const invited = net.roomParam();
if (invited) {
  $("mode").querySelector('[data-value="online"]').click();
  net.join(invited);
}
