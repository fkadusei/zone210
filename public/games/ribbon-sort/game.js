// Ribbon Sort: move ribbon rolls between poles until every pole holds just one color. Four kinds of puzzle, numbered
// so each can be played again, undo, hints worked out by a solver, and an online race on the same puzzle.
import { MODES, seedOf, deal, canMove, move, solved, solve, runOf, progress } from "./logic.js";
import { createOnline } from "../../assets/online.js";

const $ = (id) => document.getElementById(id);
const store = {
  get(key, fallback) { try { const raw = localStorage.getItem(key); return raw === null ? fallback : JSON.parse(raw); } catch (err) { return fallback; } },
  set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (err) { /* private mode */ } },
};
const KEY = "zone210_ribbon_sort";
// what was saved, made safe: anything of the wrong kind gets its usual value, so a damaged save never stops the game
const saved = (() => {
  const d = { mode: "easy", players: "1", muted: false, level: {}, best: {}, cur: null }, got = store.get(KEY, {});
  if (!got || typeof got !== "object" || Array.isArray(got)) return d;
  if (MODES[got.mode]) d.mode = got.mode;
  if (got.players === "online") d.players = "online";
  d.muted = got.muted === true;
  for (const k of ["level", "best"]) if (got[k] && typeof got[k] === "object" && !Array.isArray(got[k])) for (const [m, v] of Object.entries(got[k])) if (Number.isInteger(v) && v > 0) d[k][m] = v;
  const c = got.cur, cap = c && MODES[c.mode] && MODES[c.mode].cap;
  const okPoles = (ps) => Array.isArray(ps) && ps.every((p) => Array.isArray(p) && p.length <= cap && p.every((v) => Number.isInteger(v) && v >= 0 && v < 8));
  if (cap && Number.isInteger(c.n) && okPoles(c.poles) && okPoles(c.start) && c.poles.length === c.start.length && Number.isInteger(c.moves)) d.cur = c;
  return d;
})();
const save = () => store.set(KEY, saved);
const online = () => saved.players === "online";

// eight colors, each with its own shape so they can be told apart without color too
const COLORS = [["#2563eb", "■"], ["#facc15", "★", 1], ["#8b5cf6", "◆"], ["#14b8a6", "✚"], ["#dc2626", "●"], ["#92400e", "✿"], ["#9ca3af", "▼", 1], ["#f1f5f9", "◯", 1]];
const NAMES = ["blue", "yellow", "purple", "teal", "red", "brown", "gray", "white"];

let G = null; // { mode, n, seed, cap, poles, start, moves, history, chosen, started, over, hints, landed }
let myRole = 0, friendPct = 0;

// ---------- sounds ----------
function tone(freqs, type = "sine", vol = 0.1, gap = 0.07, len = 0.16) {
  if (saved.muted) return;
  const ac = window.z210Audio && window.z210Audio.get();
  if (!ac) return;
  freqs.forEach((f, i) => { const o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.value = f; const t = ac.currentTime + i * gap; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + len); o.connect(g).connect(ac.destination); o.start(t); o.stop(t + len + 0.02); });
}
const sfx = {
  lift: () => tone([520], "triangle", 0.07),
  drop: (n) => tone(Array.from({ length: Math.min(n, 5) }, (_, k) => 330 + k * 40), "triangle", 0.08, 0.045, 0.09),
  pole: () => tone([660, 880], "sine", 0.09),
  no: () => tone([220, 180], "triangle", 0.07),
  win: () => tone([523, 659, 784, 1047, 1319], "sine", 0.12, 0.09, 0.26),
};

// ---------- online race ----------
const net = createOnline({
  container: document.querySelector(".g-page"),
  before: $("stats"),
  prefix: "zone210-ribbon-",
  names: ["Player 1", "Player 2"],
  startInfo: () => ({ mode: saved.mode }),
  onStart: ({ role, seed, info }) => {
    myRole = role; friendPct = 0;
    if (info && MODES[info.mode]) { saved.mode = info.mode; syncChips(); }
    newGame(-1, seed); // a race is a fresh puzzle from the shared seed
  },
  onData: (m) => { if (m && typeof m.p === "number") { friendPct = m.p; stats(); if (m.done && G && !G.over) lose(); } },
  onLeft: () => setStatus("Your friend left the game."),
});

// ---------- the game ----------
function newGame(n, seed = n >= 0 ? seedOf(saved.mode, n) : (Math.random() * 4294967296) >>> 0, resume = null) {
  const d = resume ? { poles: resume.poles, cap: MODES[saved.mode].cap } : deal(saved.mode, seed);
  G = { mode: saved.mode, n, seed, cap: d.cap, poles: d.poles.map((p) => p.slice()), start: (resume ? resume.start : d.poles).map((p) => p.slice()), moves: resume ? resume.moves : 0, history: [], chosen: null, started: Date.now(), over: false, hints: 0, landed: -1 };
  $("result").hidden = true;
  $("table").classList.remove("solved");
  $("title").textContent = n >= 0 ? `${MODES[saved.mode].label} · Puzzle ${n}` : `${MODES[saved.mode].label} · Race`;
  setStatus(online() && !net.active ? "Create or join a room to race a friend." : "Tap a pole to lift its top rolls, then tap where they should go.");
  keep();
  fit();
  render();
  stats();
}
/** The puzzle in progress is kept on this device, so it is still there next time. */
function keep() { if (!G || online()) return; saved.cur = G.over ? null : { mode: G.mode, n: G.n, poles: G.poles, start: G.start, moves: G.moves }; save(); }
const playable = () => G && !G.over && (!online() || net.active);

function fit() { // poles and rolls as big as the screen allows
  const t = $("table"), n = G.poles.length, W = Math.min(t.clientWidth || 360, 900);
  const gap = Math.max(5, Math.min(14, W * 0.025)), pw = Math.max(26, Math.min(78, (W - gap * (n - 1)) / n));
  const room = Math.max(240, Math.min(560, window.innerHeight * 0.58));
  const rh = Math.max(14, Math.min(38, pw * (pw < 50 ? 0.82 : 0.56), (room - 14) / (G.cap + 1.35))); // narrow poles get taller rolls, easier to see and tap
  t.style.setProperty("--gap", `${gap}px`); t.style.setProperty("--pw", `${pw}px`); t.style.setProperty("--rh", `${rh}px`); t.style.setProperty("--cap", G.cap);
}
window.addEventListener("resize", () => { if (G) fit(); });

function render() {
  const { poles, cap, chosen } = G, lifted = chosen === null ? 0 : runOf(poles[chosen]);
  $("table").innerHTML = poles.map((p, i) => {
    const done = p.length === cap && runOf(p) === cap;
    const rolls = p.map((c, k) => {
      const up = i === chosen && k >= p.length - lifted, [col, sym, light] = COLORS[c];
      return `<span class="roll${light ? " light" : ""}${up ? " up" : ""}${i === G.landed && k >= p.length - G.landedN ? " landed" : ""}" style="--i:${k};--c:${col};--lift:${cap - p.length + 1}">${sym}</span>`;
    }).join("");
    const can = chosen !== null && chosen !== i && canMove(poles, chosen, i, cap);
    const what = p.length ? `${p.length} ${p.length === 1 ? "roll" : "rolls"}, ${NAMES[p[p.length - 1]]} on top` : "empty";
    return `<button class="pole${i === chosen ? " chosen" : ""}${can ? " target" : ""}${done ? " full" : ""}" data-i="${i}" aria-pressed="${i === chosen}" aria-label="Pole ${i + 1}: ${what}${done ? ", sorted" : ""}">${rolls}</button>`;
  }).join("");
  G.landed = -1;
  $("undo").disabled = !G.history.length || G.over;
  $("hint").hidden = online();
  $("skip").hidden = online();
  $("restart").disabled = !G.moves || G.over;
}
const clock = (t) => `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
function stats() {
  if (!G) return;
  const t = Math.floor((Date.now() - G.started) / 1000), best = G.n >= 0 && saved.best[`${G.mode}:${G.n}`];
  $("stats").innerHTML = `<div class="g-stat"><span>Moves</span><b>${G.moves}</b></div>${online() ? `<div class="g-stat"><span>You</span><b>${progress(G.poles, G.cap)}%</b></div><div class="g-stat"><span>Friend</span><b>${friendPct}%</b></div>` : `<div class="g-stat"><span>Best</span><b>${best || "–"}</b></div>`}<div class="g-stat"><span>Time</span><b>${clock(t)}</b></div>`;
}
setInterval(() => { if (G && !G.over) stats(); }, 1000);
const setStatus = (t) => { $("status").textContent = t; };
function nope(i) { sfx.no(); const el = $("table").querySelector(`.pole[data-i="${i}"]`); if (el) { el.classList.remove("nope"); void el.offsetWidth; el.classList.add("nope"); } }

/** A pole was chosen (a tap, the end of a drag, or a number key). */
function pick(i) {
  if (!playable() || i < 0 || i >= G.poles.length) return;
  const { poles, cap } = G;
  if (G.chosen === null) {
    if (!poles[i].length) { nope(i); setStatus("That pole is empty. Choose one with rolls on it first."); return; }
    G.chosen = i; sfx.lift(); render(); return;
  }
  if (G.chosen === i) { G.chosen = null; render(); return; }
  if (!canMove(poles, G.chosen, i, cap)) {
    if (poles[i].length && !(poles[i].length === cap && runOf(poles[i]) === cap)) { G.chosen = i; sfx.lift(); render(); return; } // choose this one instead
    nope(i);
    setStatus(poles[i].length >= cap ? "That pole is full." : "Rolls can only go on an empty pole or on the same color.");
    return;
  }
  const a = G.chosen, r = move(poles, a, i, cap);
  G.history.push(G.poles); G.poles = r.s; G.moves += 1; G.chosen = null; G.landed = i; G.landedN = r.n;
  const p = G.poles[i];
  if (p.length === cap && runOf(p) === cap) sfx.pole(); else sfx.drop(r.n);
  setStatus(r.n < runOf(poles[a]) ? `Only ${r.n} fitted.` : "");
  render(); stats(); keep();
  if (online() && net.active) net.send({ p: progress(G.poles, cap) });
  if (solved(G.poles, cap)) finish();
}

// tap a pole then another, or drag from one to the other; one finger at a time
let down = null;
const poleAt = (x, y) => { const el = document.elementFromPoint(x, y); const p = el && el.closest && el.closest(".pole"); return p ? Number(p.dataset.i) : -1; };
$("table").addEventListener("pointerdown", (e) => {
  if (e.pointerType === "mouse" && e.button !== 0) return;
  if (down && (down.id === e.pointerId || performance.now() - down.t > 1500)) down = null; // its lift went astray: start afresh
  if (down) return; // a second finger while the first is down
  const el = e.target.closest(".pole");
  if (!el || !playable()) return;
  e.preventDefault();
  const i = Number(el.dataset.i), was = G.chosen;
  down = { id: e.pointerId, i, was, t: performance.now() };
  if (was !== i) pick(i); // lifts it, or moves the lifted rolls here
});
const lift = (e) => {
  if (!down || e.pointerId !== down.id) return;
  const d = down; down = null;
  if (!G || G.over) return;
  const j = poleAt(e.clientX, e.clientY);
  if (j === d.i && d.was === d.i) pick(d.i); // a second tap on the chosen pole puts the rolls back down
  else if (j >= 0 && j !== d.i && G.chosen === d.i) pick(j); // dragged from one pole to another
};
window.addEventListener("pointerup", lift); // anywhere: a finger lifted off the table still counts
window.addEventListener("pointercancel", (e) => { if (down && e.pointerId === down.id) down = null; });
$("table").addEventListener("click", (e) => { if (e.detail !== 0) return; const el = e.target.closest(".pole"); if (el) pick(Number(el.dataset.i)); }); // Enter or Space on a pole
document.addEventListener("keydown", (e) => {
  if (!G || e.metaKey || e.ctrlKey || e.altKey || /input|textarea/i.test(document.activeElement && document.activeElement.tagName)) return;
  if (/^[1-9]$/.test(e.key)) { pick(Number(e.key) - 1); const el = $("table").querySelector(`.pole[data-i="${Number(e.key) - 1}"]`); if (el) el.focus(); }
  else if (e.key === "Escape" && G.chosen !== null) { G.chosen = null; render(); }
  else if (e.key === "z" || e.key === "Z") undo();
});

// ---------- buttons ----------
function undo() {
  if (!G || G.over || !G.history.length) return;
  G.poles = G.history.pop(); G.moves += 1; G.chosen = null; // an undo counts as a move, as in most of these puzzles
  setStatus("Undone."); render(); stats(); keep();
}
$("undo").addEventListener("click", undo);
$("restart").addEventListener("click", () => { if (!G || G.over) return; G.poles = G.start.map((p) => p.slice()); G.history = []; G.moves = 0; G.chosen = null; G.started = Date.now(); setStatus("Back to the start."); render(); stats(); keep(); });
$("hint").addEventListener("click", () => {
  if (!playable() || online()) return;
  const way = solve(G.poles, G.cap, 120000);
  if (!way) { sfx.no(); setStatus("This can't be sorted from here. Undo a few moves and try another way."); return; }
  const [a, b] = way[0];
  G.hints += 1; G.chosen = a; render();
  const t = $("table").querySelector(`.pole[data-i="${b}"]`); if (t) t.classList.add("target");
  setStatus(`Hint: move the top of pole ${a + 1} onto pole ${b + 1}. It is lifted for you: tap pole ${b + 1}.`);
});
$("skip").addEventListener("click", () => { if (online()) return; const n = (G && G.n >= 0 ? G.n : saved.level[saved.mode] || 1) + 1; saved.level[saved.mode] = n; save(); newGame(n); });

function finish() {
  G.over = true;
  sfx.win();
  $("table").classList.add("solved");
  const t = Math.floor((Date.now() - G.started) / 1000);
  let best = "";
  if (G.n >= 0) {
    const k = `${G.mode}:${G.n}`, was = saved.best[k];
    if (!was || G.moves < was) saved.best[k] = G.moves;
    best = was ? (G.moves < was ? ` A new best (it was ${was}).` : ` Your best is ${was}.`) : "";
    saved.level[G.mode] = Math.max(saved.level[G.mode] || 1, G.n + 1);
  }
  saved.cur = null; save();
  if (online()) { net.send({ p: 100, done: true }); net.setOver(true); }
  $("resTitle").textContent = online() ? "You sorted it first! 🏆" : "All sorted! 🎉";
  $("resText").textContent = `${G.moves} moves in ${clock(t)}${G.hints ? `, with ${G.hints} ${G.hints === 1 ? "hint" : "hints"}` : ""}.${best}`;
  $("next").textContent = online() ? "Rematch" : "Next puzzle ▶";
  $("result").hidden = false;
  setStatus("Every pole holds just one color!");
  render(); stats();
}
function lose() {
  G.over = true;
  net.setOver(true);
  $("resTitle").textContent = "Your friend sorted it first!";
  $("resText").textContent = `You were ${progress(G.poles, G.cap)}% done. Rematch?`;
  $("next").textContent = "Rematch";
  $("result").hidden = false;
  render();
}
$("next").addEventListener("click", () => {
  if (online()) { net.rematch(); return; }
  const n = Math.max(saved.level[saved.mode] || 1, G.n >= 0 ? G.n + 1 : 1);
  saved.level[saved.mode] = n; save(); newGame(n);
});

// ---------- choosing ----------
function syncChips() {
  document.querySelectorAll("#mode .g-chip").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.value === saved.mode)));
  document.querySelectorAll("#players .g-chip").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.value === saved.players)));
  $("mute").textContent = saved.muted ? "🔇 Sound off" : "🔊 Sound on";
  $("mute").setAttribute("aria-pressed", String(!saved.muted));
}
$("mode").addEventListener("click", (e) => {
  const b = e.target.closest(".g-chip");
  if (!b || !MODES[b.dataset.value] || (online() && net.active && myRole !== 0)) return;
  if (G && G.mode === b.dataset.value && !online()) return;
  saved.mode = b.dataset.value; save(); syncChips();
  if (online()) { if (net.active) net.rematch(); else newGame(-1); } else newGame(saved.level[saved.mode] || 1);
});
$("players").addEventListener("click", (e) => {
  const b = e.target.closest(".g-chip");
  if (!b || b.dataset.value === saved.players) return;
  saved.players = b.dataset.value; save(); syncChips();
  if (online()) { net.open(); newGame(-1); } else { net.close(); newGame(saved.level[saved.mode] || 1); }
});
$("mute").addEventListener("click", () => { saved.muted = !saved.muted; save(); syncChips(); });

const invited = net.roomParam();
if (invited) saved.players = "online";
syncChips();
if (online()) { newGame(-1); net.open(); if (invited) net.join(invited); }
else if (saved.cur && saved.cur.mode === saved.mode) newGame(saved.cur.n, seedOf(saved.mode, saved.cur.n), saved.cur);
else newGame(saved.level[saved.mode] || 1);
window.__ribbon = { get G() { return G; }, pick, newGame };
