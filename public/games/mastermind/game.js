import { createOnline } from "../../assets/online.js";
import { LEVELS, feedback, randomCode, allCodes, consistent, nextGuess } from "./logic.js";

const $ = (id) => document.getElementById(id);
const store = {
  get(key, fallback) { try { const raw = localStorage.getItem(key); return raw === null ? fallback : JSON.parse(raw); } catch (err) { return fallback; } },
  set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (err) { /* private mode */ } },
};
const KEY = "zone210_mastermind_settings";
const settings = { mode: "cpu", level: "normal", symbols: "on", muted: false, ...store.get(KEY, {}) };
if (!["cpu", "make", "two", "online"].includes(settings.mode)) settings.mode = "cpu";
if (!LEVELS[settings.level]) settings.level = "normal";
const COLORS = ["#e5484d", "#3b82f6", "#22c55e", "#facc15", "#a855f7", "#f97316", "#14b8a6", "#ec4899"];
const GLYPHS = ["●", "▲", "■", "◆", "★", "♥", "♣", "☾"];
const NAMES = ["red", "blue", "green", "yellow", "purple", "orange", "teal", "pink"];

const SPEED = new URLSearchParams(location.search).has("fast") ? 20 : 1;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms / SPEED));
let audio = null;
function tone(freq, start, length, type = "sine", gain = 0.08) {
  if (settings.muted) return;
  try {
    audio = window.z210Audio ? window.z210Audio.get() : audio || new (window.AudioContext || window.webkitAudioContext)();
    if (!audio) return;
    const t = audio.currentTime + start;
    const osc = audio.createOscillator();
    const amp = audio.createGain();
    osc.type = type; osc.frequency.value = freq;
    amp.gain.setValueAtTime(0.0001, t);
    amp.gain.exponentialRampToValueAtTime(gain, t + 0.008);
    amp.gain.exponentialRampToValueAtTime(0.0001, t + length);
    osc.connect(amp).connect(audio.destination);
    osc.start(t); osc.stop(t + length + 0.02);
  } catch (err) { /* audio unavailable */ }
}
const sfx = {
  peg: (c) => tone(300 + c * 50, 0, 0.06, "triangle", 0.07),
  submit: () => tone(420, 0, 0.1, "triangle", 0.08),
  win: () => [523, 659, 784, 1046, 784, 1046].forEach((f, i) => tone(f, i * 0.1, 0.24, "triangle", 0.1)),
  lose: () => [330, 262, 196].forEach((f, i) => tone(f, i * 0.16, 0.3, "sawtooth", 0.06)),
};

const online = () => settings.mode === "online";
let cfg = LEVELS[settings.level];
let iMaker = false; // online: am I the code-maker?
const net = createOnline({
  container: document.querySelector(".g-page"),
  before: $("mm"),
  prefix: "zone210-mastermind-",
  names: ["Code-maker", "Code-breaker"],
  startInfo: () => ({ level: settings.level }),
  onStart: ({ role, info }) => {
    if (info && LEVELS[info.level]) { settings.level = info.level; syncChips(); }
    iMaker = role === 0;
    newGame();
  },
  onData: (m) => onNet(m),
  onLeft: () => { setStatus("Your friend left the game."); },
  // the code is secret, so this is only saved on this device (never sent) and each side resends what a reload lost
  privateState: true,
  onReconnect: () => {
    const last = rows[rows.length - 1];
    if (!iMaker && last && !last.fb) net.send({ t: "g", g: last.g, n: rows.length - 1 });
    if (iMaker && phase === "watch" && !rows.length) net.send({ t: "ready" });
    if (iMaker && phase === "over") net.send({ t: "reveal", secret });
  },
  getState: () => ({ secret, rows, cur, phase, iMaker, solved: lastSolved }),
  setState: (g) => {
    iMaker = g.iMaker; secret = g.secret; rows = g.rows; cur = g.cur; cands = []; runId += 1; lastSolved = g.solved;
    cfg = LEVELS[settings.level];
    $("end").classList.remove("show");
    phase = g.phase === "over" ? "guess" : g.phase;
    drawBoard(); drawPalette(); refresh();
    if (g.phase === "over") { finish(!!g.solved); return; }
    announce();
  },
});
let lastSolved = false;

let secret = null;
let rows = []; // { g: [..], fb: {b,w}|null }
let cur = [];
let phase = "idle"; // idle | setup | wait | guess | watch | over
let cands = [];
let runId = 0;
const statusEl = $("status");
const setStatus = (t, kind = "") => { statusEl.textContent = t; statusEl.className = "g-status" + (kind ? ` ${kind}` : ""); };

// ---------- drawing ----------
function peg(c, cls = "", label) {
  const b = document.createElement(cls.includes("slot") || cls.includes("btn") ? "button" : "div");
  b.className = `peg ${cls}`.trim();
  if (c === null || c === undefined) { if (cls.includes("q")) b.textContent = "?"; if (b.tagName === "BUTTON") b.setAttribute("aria-label", "Empty slot"); return b; }
  b.classList.add("on");
  b.style.backgroundColor = COLORS[c];
  if (settings.symbols === "on") b.textContent = GLYPHS[c];
  b.setAttribute("aria-label", label || NAMES[c]);
  return b;
}
function fbEl(fb) {
  const d = document.createElement("div");
  d.className = "fb";
  const n = cfg.len;
  const cells = n > 4 ? 6 : 4;
  d.style.gridTemplateColumns = `repeat(${n > 4 ? 3 : 2}, 1fr)`;
  d.style.width = `calc(var(--peg) * ${n > 4 ? 1.15 : 0.8})`;
  for (let i = 0; i < cells; i += 1) {
    const i2 = document.createElement("i");
    if (fb) i2.className = i < fb.b ? "b" : i < fb.b + fb.w ? "w" : "";
    d.appendChild(i2);
  }
  return d;
}
function drawBoard() {
  const box = $("mm");
  box.innerHTML = "";
  const reveal = phase === "over" || (secret && (phase === "setup" || phase === "watch" || (settings.mode === "make" && phase === "guess")));
  const sr = document.createElement("div");
  sr.className = "mrow secret";
  const sp = document.createElement("div");
  sp.className = "pegs";
  for (let i = 0; i < cfg.len; i += 1) {
    if (phase === "setup") {
      const c = cur[i];
      const p = peg(c === undefined ? null : c, "slot" + (c === undefined ? " q" : ""));
      if (c === undefined) p.textContent = "?";
      p.addEventListener("click", () => { if (i < cur.length) { cur.splice(i, 1); drawBoard(); refresh(); } });
      sp.appendChild(p);
    } else sp.appendChild(peg(reveal && secret ? secret[i] : null, reveal && secret ? "" : "q"));
  }
  const lab = document.createElement("span");
  lab.className = "n";
  lab.textContent = "🔒";
  sr.append(lab, sp);
  box.appendChild(sr);
  const editing = phase === "guess" && (settings.mode !== "make") && (!online() || !iMaker);
  for (let r = 0; r < cfg.guesses; r += 1) {
    const row = document.createElement("div");
    const isCur = editing && r === rows.length;
    row.className = "mrow" + (isCur ? " cur" : "");
    const n = document.createElement("span");
    n.className = "n";
    n.textContent = r + 1;
    const pegs = document.createElement("div");
    pegs.className = "pegs";
    for (let i = 0; i < cfg.len; i += 1) {
      if (r < rows.length) pegs.appendChild(peg(rows[r].g[i]));
      else if (isCur) {
        const c = cur[i];
        const p = peg(c === undefined ? null : c, "slot");
        p.addEventListener("click", () => { if (i < cur.length) { cur.splice(i, 1); drawBoard(); refresh(); } });
        pegs.appendChild(p);
      } else pegs.appendChild(peg(null));
    }
    row.append(n, pegs, fbEl(r < rows.length ? rows[r].fb : null));
    box.appendChild(row);
  }
}
function drawPalette() {
  const pal = $("palette");
  pal.innerHTML = "";
  for (let c = 0; c < cfg.colors; c += 1) {
    const p = peg(c, "btn");
    p.type = "button";
    p.addEventListener("click", () => addPeg(c));
    pal.appendChild(p);
  }
}
function canEnter() { return phase === "setup" || (phase === "guess" && settings.mode !== "make" && (!online() || !iMaker)); }
function refresh() {
  const can = canEnter();
  $("palette").querySelectorAll(".peg").forEach((b) => (b.disabled = !can || cur.length >= cfg.len));
  $("del").hidden = !can;
  $("submit").hidden = !can;
  $("submit").disabled = cur.length < cfg.len;
  $("submit").textContent = phase === "setup" ? "Lock in my code" : "Submit guess";
}

// ---------- flow ----------
function newGame() {
  runId += 1;
  cfg = LEVELS[settings.level];
  rows = []; cur = []; secret = null; cands = [];
  $("end").classList.remove("show"); $("cover").classList.remove("show");
  net.setOver(false);
  $("again").textContent = online() ? "Rematch" : "Play again";
  if (settings.mode === "cpu") { secret = randomCode(cfg.len, cfg.colors); phase = "guess"; }
  else if (settings.mode === "make" || settings.mode === "two") phase = "setup";
  else if (!net.active) phase = "idle";
  else phase = iMaker ? "setup" : "wait";
  drawPalette(); drawBoard(); refresh(); announce();
}
function announce() {
  if (phase === "idle") return setStatus("Create or join a room to start.");
  if (phase === "setup") return setStatus(settings.mode === "make" ? "Choose your secret code, then lock it in. The computer will try to crack it." : settings.mode === "two" ? "Code-maker: choose a secret code (the code-breaker shouldn't look), then lock it in." : "You're the code-maker. Choose a secret code and lock it in.");
  if (phase === "wait") return setStatus("Waiting for your friend to choose the code…");
  if (phase === "watch") return setStatus(rows.length ? `Your friend has used ${rows.length} of ${cfg.guesses} guesses.` : "Code locked in. Waiting for the first guess…");
  if (phase === "guess") return setStatus(settings.mode === "make" ? "The computer is working on it…" : `Guess ${rows.length + 1} of ${cfg.guesses}: pick ${cfg.len} colours.`);
  return undefined;
}
function addPeg(c) {
  if (!canEnter() || cur.length >= cfg.len) return;
  cur.push(c);
  sfx.peg(c);
  drawBoard(); refresh();
}
function del() { if (canEnter() && cur.length) { cur.pop(); drawBoard(); refresh(); } }

async function submit() {
  if (!canEnter() || cur.length < cfg.len) return;
  sfx.submit();
  if (phase === "setup") {
    secret = cur.slice(); cur = [];
    if (settings.mode === "make") { phase = "guess"; drawBoard(); refresh(); announce(); return runSolver(); }
    if (settings.mode === "two") { phase = "guess"; drawBoard(); refresh(); $("coverTitle").textContent = "Pass to the code-breaker"; $("coverText").textContent = "The code is locked in and hidden. Hand over the device."; $("cover").classList.add("show"); return announce(); }
    phase = "watch"; net.send({ t: "ready" }); drawBoard(); refresh(); return announce();
  }
  const g = cur.slice(); cur = [];
  if (online()) { rows.push({ g, fb: null }); net.send({ t: "g", g, n: rows.length - 1 }); drawBoard(); refresh(); setStatus("Waiting for the clues…"); return; }
  const fb = feedback(secret, g);
  rows.push({ g, fb });
  drawBoard(); refresh();
  if (fb.b === cfg.len) return finish(true);
  if (rows.length >= cfg.guesses) return finish(false);
  announce();
}

async function runSolver() {
  const id = runId;
  cands = allCodes(cfg.len, cfg.colors);
  const strength = settings.level === "easy" ? "normal" : "hard";
  for (let turn = 0; turn < cfg.guesses; turn += 1) {
    await sleep(1000);
    if (id !== runId) return;
    const g = nextGuess(cands, turn, cfg.len, cfg.colors, strength);
    const fb = feedback(secret, g);
    rows.push({ g, fb });
    sfx.submit();
    drawBoard();
    setStatus(`The computer guessed ${turn + 1} time${turn ? "s" : ""}…`);
    if (fb.b === cfg.len) return finish(true);
    cands = consistent(cands, g, fb);
    if (!cands.length) cands = allCodes(cfg.len, cfg.colors);
  }
  finish(false);
}

function onNet(m) {
  if (!online() || !m) return;
  if (m.t === "ready" && !iMaker && phase === "wait") { phase = "guess"; drawBoard(); refresh(); announce(); }
  else if (m.t === "g" && iMaker && Number.isInteger(m.n) && m.n < rows.length) {
    // a guess I already answered (the friend reloaded and asked again): repeat the answer
    if (m.n === rows.length - 1) net.send({ t: "fb", b: rows[m.n].fb.b, w: rows[m.n].fb.w });
    if (phase === "over") net.send({ t: "reveal", secret });
  } else if (m.t === "g" && iMaker && phase === "watch" && Array.isArray(m.g) && m.g.length === cfg.len) {
    const fb = feedback(secret, m.g);
    rows.push({ g: m.g, fb });
    net.send({ t: "fb", b: fb.b, w: fb.w });
    drawBoard();
    const solved = fb.b === cfg.len;
    if (solved || rows.length >= cfg.guesses) { net.send({ t: "reveal", secret }); finish(solved); } else announce();
  } else if (m.t === "fb" && !iMaker && rows.length && !rows[rows.length - 1].fb) {
    rows[rows.length - 1].fb = { b: m.b, w: m.w };
    sfx.submit();
    drawBoard();
    if (m.b !== cfg.len && rows.length < cfg.guesses) announce();
  } else if (m.t === "reveal" && !iMaker && Array.isArray(m.secret)) {
    secret = m.secret;
    const last = rows[rows.length - 1];
    finish(!!(last && last.fb && last.fb.b === cfg.len));
  }
}

function finish(solved) {
  if (phase === "over") return;
  lastSolved = solved;
  phase = "over";
  drawBoard(); refresh();
  const n = rows.length;
  let title, text, good;
  const codeText = secret ? secret.map((c) => NAMES[c]).join(", ") : "";
  if (settings.mode === "cpu") { good = solved; title = solved ? "You cracked it!" : "Out of guesses"; text = solved ? `Solved in ${n} guess${n === 1 ? "" : "es"}.` : `The code was ${codeText}.`; }
  else if (settings.mode === "make") { good = !solved; title = solved ? "The computer cracked your code" : "Your code stumped the computer!"; text = solved ? `It took ${n} guess${n === 1 ? "" : "es"}.` : `It used all ${cfg.guesses} guesses.`; }
  else if (settings.mode === "two") { good = true; title = solved ? "Code cracked!" : "The code held!"; text = solved ? `The code-breaker solved it in ${n} guess${n === 1 ? "" : "es"}.` : `The code was ${codeText}.`; }
  else if (iMaker) { good = !solved; title = solved ? "Your friend cracked your code" : "Your code held!"; text = solved ? `It took ${n} guess${n === 1 ? "" : "es"}.` : `They used all ${cfg.guesses} guesses.`; }
  else { good = solved; title = solved ? "You cracked it!" : "Out of guesses"; text = solved ? `Solved in ${n} guess${n === 1 ? "" : "es"}.` : `The code was ${codeText}.`; }
  $("endEmoji").textContent = good ? "🏆" : "🔒";
  $("endTitle").textContent = title;
  $("endText").textContent = text;
  setStatus(title, good ? "good" : "bad");
  good ? sfx.win() : sfx.lose();
  net.setOver(true);
  setTimeout(() => $("end").classList.add("show"), 900 / SPEED);
}

// ---------- controls ----------
function syncChips() {
  ["mode", "level", "symbols"].forEach((k) => document.querySelectorAll(`#${k} .g-chip`).forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.value === settings[k]))));
  $("newGame").hidden = online();
  if (online()) net.open(); else net.close();
}
["mode", "level", "symbols"].forEach((id) => $(id).addEventListener("click", (e) => {
  const chip = e.target.closest(".g-chip");
  if (!chip || settings[id] === chip.dataset.value) return;
  if (online() && net.active && id === "level") return; // the host's level applies once a game is under way
  settings[id] = chip.dataset.value;
  store.set(KEY, settings);
  syncChips();
  if (id === "symbols") { drawPalette(); drawBoard(); refresh(); return; }
  if (online() && id === "level") return;
  newGame();
}));
$("del").addEventListener("click", del);
$("submit").addEventListener("click", submit);
$("newGame").addEventListener("click", newGame);
$("again").addEventListener("click", () => { if (online()) { net.rematch(); $("end").classList.remove("show"); } else newGame(); });
$("endView").addEventListener("click", () => $("end").classList.remove("show"));
$("coverGo").addEventListener("click", () => { $("cover").classList.remove("show"); });
document.addEventListener("keydown", (e) => {
  if (e.target instanceof HTMLInputElement) return;
  if (e.key >= "1" && e.key <= String(cfg.colors)) addPeg(Number(e.key) - 1);
  else if (e.key === "Backspace") del();
  else if (e.key === "Enter" && !(e.target instanceof HTMLButtonElement)) submit();
});
const mute = $("mute");
const syncMute = () => { mute.textContent = settings.muted ? "Sound Off" : "Sound On"; mute.setAttribute("aria-pressed", String(settings.muted)); };
mute.addEventListener("click", () => { settings.muted = !settings.muted; store.set(KEY, settings); syncMute(); });

syncChips();
syncMute();
newGame();
const invited = net.roomParam();
if (invited) { settings.mode = "online"; syncChips(); newGame(); net.join(invited); }
window.__mm = { addPeg, submit, del, get phase() { return phase; }, get rows() { return rows; }, get secret() { return secret; }, get cfg() { return cfg; }, get iMaker() { return iMaker; }, get cur() { return cur; } };
