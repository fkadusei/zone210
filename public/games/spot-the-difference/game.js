// Spot the Difference: two pictures, a few differences, tap them in either picture.
// Endless puzzles from a seed; hints; stars; and an online race where both friends get the same puzzle.
import { makePuzzle, LEVELS } from "./scenes.js";
import { backdropSVG } from "../once-upon/art.js";
import { createOnline } from "../../assets/online.js";

const $ = (id) => document.getElementById(id);
const store = {
  get(key, fallback) { try { const raw = localStorage.getItem(key); return raw === null ? fallback : JSON.parse(raw); } catch (err) { return fallback; } },
  set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (err) { /* private mode */ } },
};
const KEY = "zone210_spotdiff";
const saved = { level: "easy", players: "1", muted: false, solved: 0, best: {}, ...store.get(KEY, {}) };
const save = () => store.set(KEY, saved);
const online = () => saved.players === "online";

let P = null;            // the puzzle
let seed = 0;
let found = [];          // per difference: null, "me" or "friend"
let misses = 0, hints = 0, started = 0, timer = 0, over = false;
let myRole = 0;
const inbox = [];

// ---------- sounds ----------
function tone(freqs, type = "sine", vol = 0.15) {
  if (saved.muted) return;
  const ac = window.z210Audio && window.z210Audio.get();
  if (!ac) return;
  freqs.forEach((f, i) => {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.value = f;
    const t = ac.currentTime + i * 0.08;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
    o.connect(g).connect(ac.destination); o.start(t); o.stop(t + 0.3);
  });
}
const sfx = { hit: () => tone([660, 990]), miss: () => tone([220, 170], "triangle"), win: () => tone([523, 659, 784, 1047]), friend: () => tone([392, 330], "sine", 0.1) };

// ---------- online race ----------
const net = createOnline({
  container: document.querySelector(".g-page"),
  before: $("stats"),
  prefix: "zone210-spot-",
  names: ["Player 1", "Player 2"],
  startInfo: () => ({ level: saved.level }),
  onStart: ({ role, seed: s, info }) => {
    myRole = role;
    if (info && LEVELS[info.level]) { saved.level = info.level; syncChips(); }
    inbox.length = 0;
    newPuzzle(s);
  },
  onData: (m) => { if (m && Number.isInteger(m.f)) claim(m.f, "friend"); },
  onLeft: () => setStatus("Your friend left the game."),
  getState: () => ({ seed, level: saved.level, found: [...found], misses, hints }),
  setState: (g) => { saved.level = g.level; newPuzzle(g.seed); found = g.found; misses = g.misses; hints = g.hints; found.forEach((w, i) => { if (w) ring(i, w); }); stats(); if (found.every(Boolean)) finish(); },
});

// ---------- drawing ----------
const objHTML = (o) => {
  if (o.gone) return "";
  const t = [o.flip ? "scaleX(-1)" : "", o.scale ? `scale(${o.scale})` : ""].join(" ");
  return `<span class="ob" style="left:${o.x}%;top:${o.y}%;--s:${o.s};${o.hue ? `filter:hue-rotate(${o.hue}deg) saturate(1.3);` : ""}${t.trim() ? `--t:${t};` : ""}">${o.e}</span>`;
};
function draw() {
  ["L", "R"].forEach((side) => {
    const pic = $(`pic${side}`);
    pic.innerHTML = `${backdropSVG(P.theme)}<div class="obs">${(side === "L" ? P.left : P.right).map(objHTML).join("")}</div><div class="marks"></div><i class="cross" hidden></i>`;
    pic.setAttribute("aria-label", `${side === "L" ? "Left" : "Right"} picture: ${P.name}. Tap a difference, or use the arrow keys to move the crosshair and Enter to choose.`);
  });
  $("title").textContent = `${P.name} · ${LEVELS[saved.level].label}`;
}
function ring(i, who) {
  const d = P.diffs[i];
  ["L", "R"].forEach((side) => {
    $(`pic${side}`).querySelector(".marks").insertAdjacentHTML("beforeend", `<i class="ring ${who}" style="left:${d.x}%;top:${d.y}%;--r:${d.r}"></i>`);
  });
}
function blip(side, x, y) {
  const m = $(`pic${side}`).querySelector(".marks");
  const el = document.createElement("i");
  el.className = "miss";
  el.style.left = `${x}%`; el.style.top = `${y}%`;
  m.appendChild(el);
  setTimeout(() => el.remove(), 700);
}
const setStatus = (t) => { $("status").textContent = t; };
const secs = () => Math.floor((Date.now() - started) / 1000);
const clock = (t) => `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
function stats() {
  const mine = found.filter((w) => w === "me").length, theirs = found.filter((w) => w === "friend").length;
  const left = found.filter((w) => !w).length;
  $("stats").innerHTML = online()
    ? `<div class="g-stat"><span>You</span><b>${mine}</b></div><div class="g-stat"><span>Friend</span><b>${theirs}</b></div><div class="g-stat"><span>Left to find</span><b>${left}</b></div><div class="g-stat"><span>Time</span><b>${clock(secs())}</b></div>`
    : `<div class="g-stat"><span>Found</span><b>${mine} of ${P.diffs.length}</b></div><div class="g-stat"><span>Wrong taps</span><b>${misses}</b></div><div class="g-stat"><span>Hints</span><b>${hints}</b></div><div class="g-stat"><span>Time</span><b>${clock(secs())}</b></div>`;
}

// ---------- playing ----------
function newPuzzle(s) {
  seed = s >>> 0;
  P = makePuzzle(seed, saved.level);
  found = P.diffs.map(() => null);
  misses = 0; hints = 0; over = false; started = Date.now();
  $("result").hidden = true;
  draw();
  stats();
  clearInterval(timer);
  timer = setInterval(() => { if (!over) stats(); }, 1000);
  setStatus(online() && !net.active ? "Create or join a room to race a friend." : `Find ${P.diffs.length} differences.`);
  $("hint").disabled = online();
}
function claim(i, who) {
  if (found[i]) return false;
  found[i] = who;
  ring(i, who);
  if (who === "friend") { sfx.friend(); setStatus("Your friend found one!"); }
  stats();
  if (found.every(Boolean)) finish();
  return true;
}
function tapAt(side, x, y, pxPerPct) {
  if (over || (online() && !net.active)) return;
  // x, y in % of the picture; a difference counts if the tap is near it (sizes are in % of the width)
  let best = -1, bestD = Infinity;
  P.diffs.forEach((d, i) => {
    if (found[i]) return;
    const dist = Math.hypot(d.x - x, (d.y - y) * 0.5625);
    const reach = d.r * 0.75 + 14 / pxPerPct; // the size of the difference plus a finger's width of leeway
    if (dist < reach && dist < bestD) { best = i; bestD = dist; }
  });
  if (best >= 0) {
    claim(best, "me");
    sfx.hit();
    if (online()) net.send({ f: best });
    if (!over) setStatus(["Spotted it!", "Well spotted!", "Great eyes!", "Yes!"][Math.floor(Math.random() * 4)]);
  } else {
    misses += 1;
    sfx.miss();
    blip(side, x, y);
    stats();
  }
}
["L", "R"].forEach((side) => {
  const pic = $(`pic${side}`);
  pic.addEventListener("pointerdown", (e) => {
    const r = pic.getBoundingClientRect();
    tapAt(side, ((e.clientX - r.left) / r.width) * 100, ((e.clientY - r.top) / r.height) * 100, r.width / 100);
  });
  // keyboard: a crosshair moves with the arrow keys, Enter taps
  let cx = 50, cy = 50;
  const show = () => { const c = pic.querySelector(".cross"); if (!c) return; c.hidden = false; c.style.left = `${cx}%`; c.style.top = `${cy}%`; };
  pic.addEventListener("focus", show);
  pic.addEventListener("blur", () => { const c = pic.querySelector(".cross"); if (c) c.hidden = true; });
  pic.addEventListener("keydown", (e) => {
    const step = e.shiftKey ? 1.5 : 5;
    const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
    if (d) { e.preventDefault(); cx = Math.min(98, Math.max(2, cx + d[0])); cy = Math.min(98, Math.max(2, cy + d[1])); show(); return; }
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); tapAt(side, cx, cy, pic.getBoundingClientRect().width / 100); }
  });
});
$("hint").addEventListener("click", () => {
  if (over || online()) return;
  const left = P.diffs.map((d, i) => (found[i] ? -1 : i)).filter((i) => i >= 0);
  if (!left.length) return;
  hints += 1;
  const d = P.diffs[left[Math.floor(Math.random() * left.length)]];
  ["L", "R"].forEach((side) => {
    const m = $(`pic${side}`).querySelector(".marks");
    const el = document.createElement("i");
    el.className = "hintglow";
    el.style.left = `${d.x + (Math.random() - 0.5) * 8}%`; el.style.top = `${d.y + (Math.random() - 0.5) * 8}%`;
    m.appendChild(el);
    setTimeout(() => el.remove(), 2600);
  });
  setStatus("Look in the glowing area.");
  stats();
});
function finish() {
  over = true;
  clearInterval(timer);
  const t = secs();
  stats();
  sfx.win();
  const mine = found.filter((w) => w === "me").length, theirs = found.filter((w) => w === "friend").length;
  let title, text, stars = "";
  if (online()) {
    title = mine > theirs ? "You win the race! 🏆" : mine < theirs ? "Your friend wins this one" : "It's a draw!";
    text = `You found ${mine}, your friend found ${theirs}.`;
    net.setOver(true);
  } else {
    const n = 3 - (hints > 0 ? 1 : 0) - (misses > 3 ? 1 : 0) - (hints > 1 ? 1 : 0);
    stars = "⭐".repeat(Math.max(1, n));
    const best = saved.best[saved.level];
    if (!best || t < best) saved.best[saved.level] = t;
    saved.solved += 1; save();
    title = "All found! 🎉";
    text = `${P.diffs.length} differences in ${clock(t)} with ${misses} wrong ${misses === 1 ? "tap" : "taps"}${hints ? ` and ${hints} ${hints === 1 ? "hint" : "hints"}` : ""}. Best ${LEVELS[saved.level].label} time: ${clock(saved.best[saved.level])}.`;
  }
  $("resTitle").textContent = title;
  $("resText").textContent = text;
  $("resStars").textContent = stars;
  $("result").hidden = false;
  setStatus(title);
}
$("next").addEventListener("click", () => { if (online()) net.rematch(); else newPuzzle((Math.random() * 4294967296) >>> 0); });
$("newp").addEventListener("click", () => { if (online()) { if (net.active) net.rematch(); } else newPuzzle((Math.random() * 4294967296) >>> 0); });

// ---------- options ----------
function syncChips() {
  document.querySelectorAll("#level .g-chip").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.value === saved.level)));
  document.querySelectorAll("#players .g-chip").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.value === saved.players)));
  $("mute").textContent = saved.muted ? "🔇 Sound off" : "🔊 Sound on";
  $("mute").setAttribute("aria-pressed", String(!saved.muted));
}
$("level").addEventListener("click", (e) => {
  const b = e.target.closest(".g-chip");
  if (!b || (online() && net.active && myRole !== 0)) return;
  saved.level = b.dataset.value; save(); syncChips();
  if (online()) { if (net.active) net.rematch(); } else newPuzzle((Math.random() * 4294967296) >>> 0);
});
$("players").addEventListener("click", (e) => {
  const b = e.target.closest(".g-chip");
  if (!b) return;
  saved.players = b.dataset.value; save(); syncChips();
  if (online()) net.open(); else net.close();
  newPuzzle((Math.random() * 4294967296) >>> 0);
});
$("mute").addEventListener("click", () => { saved.muted = !saved.muted; save(); syncChips(); });

// an invite link (?room=CODE) goes straight into the online race
const invited = net.roomParam();
if (invited) saved.players = "online";
syncChips();
newPuzzle((Math.random() * 4294967296) >>> 0);
if (online()) { net.open(); if (invited) net.join(invited); }
window.__spot = { get P() { return P; }, get found() { return found; }, tapAt, newPuzzle };
