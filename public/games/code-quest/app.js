import { parseMap, run, countBlocks, DX, DY } from "./engine.js";
import { WORLDS, LEVELS, cloneProgram } from "./levels.js";

const $ = (id) => document.getElementById(id);
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const store = {
  get(key, fallback) { try { const raw = localStorage.getItem(key); return raw === null ? fallback : JSON.parse(raw); } catch (err) { return fallback; } },
  set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (err) { /* private mode */ } },
};
const KEY = "zone210_code_quest";
const data = { stars: {}, speed: "320", muted: false, ...store.get(KEY, {}) };
const save = () => store.set(KEY, data);
const SPEED_FAST = new URLSearchParams(location.search).has("fast") ? 12 : 1;

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
  step: () => tone(330, 0, 0.06, "triangle", 0.06),
  turn: () => tone(480, 0, 0.06, "triangle", 0.06),
  coin: () => [880, 1175].forEach((f, i) => tone(f, i * 0.06, 0.12, "square", 0.05)),
  bump: () => [160, 110].forEach((f, i) => tone(f, i * 0.08, 0.14, "sawtooth", 0.07)),
  add: () => tone(600, 0, 0.04, "triangle", 0.05),
  win: () => [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, i * 0.09, 0.2, "triangle", 0.1)),
};

// ---------- program tree ----------
let nextId = 1;
const mk = (t) => {
  const b = { id: nextId++, t };
  if (t === "repeat") { b.n = 3; b.body = []; }
  if (t === "until") b.body = [];
  if (t === "if") { b.c = "clear"; b.then = []; b.else = []; }
  return b;
};
function reid(list) { return list.map((b) => ({ ...b, id: nextId++, body: b.body && reid(b.body), then: b.then && reid(b.then), else: b.else && reid(b.else) })); }
function findBlock(list, id, parent = null, slot = null) {
  for (let i = 0; i < list.length; i += 1) {
    const b = list[i];
    if (b.id === id) return { b, list, index: i };
    for (const s of ["body", "then", "else"]) if (b[s]) { const r = findBlock(b[s], id, b, s); if (r) return r; }
  }
  return null;
}
const slotList = (owner, slot) => (owner === "main" ? program : (() => { const r = findBlock(program, owner); return r ? r.b[slot] : null; })());
const inside = (ancestorId, ownerId) => { const r = findBlock(program, ancestorId); return !!r && (r.b.id === ownerId || !!findBlock([r.b], ownerId)); };

// ---------- state ----------
let lvIdx = 0;
let level = null, map = null;
let program = [];
let active = { owner: "main", slot: "main" };
let token = 0; // cancels a running animation
let trace = null, tpos = 0, robotDeg = 0, usedSolution = false, failures = 0, hintStage = 0;
let coinEls = {};

const starsOf = (i) => data.stars[i] || 0;
const unlocked = (i) => i === 0 || starsOf(i - 1) > 0;

// ---------- menu ----------
function showMenu() {
  token += 1;
  $("play").hidden = true;
  $("menu").hidden = false;
  const total = LEVELS.reduce((t, _, i) => t + starsOf(i), 0);
  const done = LEVELS.filter((_, i) => starsOf(i) > 0).length;
  $("menu").innerHTML = `<p class="progress">${done} of ${LEVELS.length} levels done · ⭐ ${total} of ${LEVELS.length * 3}</p>` + WORLDS.map((w) => `<div class="world"><h2>${w.emoji} ${w.name}</h2><p>${w.blurb}</p><div class="lvls">${LEVELS.map((l, i) => (l.world === w.id ? `<button class="lvl${starsOf(i) ? " done" : ""}" data-i="${i}" ${unlocked(i) ? "" : "disabled"} aria-label="Level ${i + 1}: ${esc(l.name)}${unlocked(i) ? "" : ", locked"}"><b>${unlocked(i) ? i + 1 : "🔒"}</b><span>${esc(l.name)}</span><i>${"⭐".repeat(starsOf(i))}${"☆".repeat(3 - starsOf(i))}</i></button>` : "")).join("")}</div></div>`).join("");
}
$("menu").addEventListener("click", (e) => { const b = e.target.closest("[data-i]"); if (b && !b.disabled) loadLevel(Number(b.dataset.i)); });

// ---------- level ----------
const S = 56;
function loadLevel(i) {
  lvIdx = i; data.last = i; save();
  level = LEVELS[i];
  map = parseMap(level.rows, level.face);
  program = [];
  active = { owner: "main", slot: "main" };
  usedSolution = false; failures = 0; hintStage = 0;
  $("menu").hidden = true;
  $("play").hidden = false;
  $("win").classList.remove("show");
  $("title").textContent = `Level ${i + 1}: ${level.name}`;
  $("concept").textContent = level.concept;
  $("solution").hidden = true;
  $("palette").innerHTML = [["fwd", "⬆ Move forward"], ["left", "↺ Turn left"], ["right", "↻ Turn right"], ["repeat", "🔁 Repeat"], ["until", "🔁 Repeat until ⭐"], ["if", "🔀 If…"]]
    .filter(([t]) => level.allow.includes(t)).map(([t, label]) => `<button class="block ${t}" data-type="${t}">${label}</button>`).join("");
  drawBoard();
  renderProg();
  resetRobot();
  setStatus("Build your program, then press Run.");
  renderStars();
  window.scrollTo(0, 0);
}
function renderStars() { const s = starsOf(lvIdx); $("stars").textContent = `${"⭐".repeat(s)}${"☆".repeat(3 - s)}`; }
const setStatus = (t, kind = "") => { const el = $("status"); el.textContent = t; el.className = "g-status" + (kind ? ` ${kind}` : ""); };

// ---------- board ----------
const NS = "http://www.w3.org/2000/svg";
function drawBoard() {
  const svg = $("board");
  svg.setAttribute("viewBox", `0 0 ${map.w * S} ${map.h * S}`);
  let h = "";
  for (let y = 0; y < map.h; y += 1) for (let x = 0; x < map.w; x += 1) {
    const k = `${x},${y}`;
    h += `<rect class="tile${(x + y) % 2 ? " alt" : ""}" x="${x * S}" y="${y * S}" width="${S}" height="${S}"/>`;
    if (map.walls.has(k)) h += `<g><rect class="rock" x="${x * S + 4}" y="${y * S + 4}" width="${S - 8}" height="${S - 8}" rx="12"/><ellipse cx="${x * S + 20}" cy="${y * S + 20}" rx="7" ry="4" fill="rgba(255,255,255,0.25)"/></g>`;
  }
  const g = map.goal;
  const cx = g.x * S + S / 2, cy = g.y * S + S / 2;
  const pts = Array.from({ length: 10 }, (_, k) => { const r = k % 2 ? 9 : 22; const a = (Math.PI / 5) * k - Math.PI / 2; return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`; }).join(" ");
  h += `<polygon points="${pts}" fill="#ffd34d" stroke="#b8860b" stroke-width="2.5" stroke-linejoin="round"/>`;
  map.coins.forEach((k) => { const [x, y] = k.split(",").map(Number); h += `<g class="coin" data-k="${k}"><circle cx="${x * S + S / 2}" cy="${y * S + S / 2}" r="12" fill="#ffc83d" stroke="#b8860b" stroke-width="2.5"/><circle cx="${x * S + S / 2}" cy="${y * S + S / 2}" r="6" fill="none" stroke="#e0a000" stroke-width="2"/></g>`; });
  h += `<g id="robot"><g id="robotbody"><line x1="28" y1="11" x2="28" y2="4" stroke="#8a6d00" stroke-width="3" stroke-linecap="round"/><circle cx="28" cy="4" r="3.5" fill="#ff5d5d"/><rect x="9" y="11" width="38" height="36" rx="11" fill="#ffd166" stroke="#a07800" stroke-width="2.5"/><circle cx="20" cy="25" r="6" fill="#fff" stroke="#a07800" stroke-width="1.5"/><circle cx="36" cy="25" r="6" fill="#fff" stroke="#a07800" stroke-width="1.5"/><circle cx="20" cy="23" r="2.8" fill="#222"/><circle cx="36" cy="23" r="2.8" fill="#222"/><rect x="19" y="36" width="18" height="5" rx="2.5" fill="#a07800"/></g></g>`;
  svg.innerHTML = h;
  coinEls = {};
  svg.querySelectorAll(".coin").forEach((c) => { coinEls[c.dataset.k] = c; });
}
function placeRobot(x, y, d, instant = false) {
  const robot = $("robot"), body = $("robotbody");
  if (!robot) return;
  const dur = `${instant ? 0 : Number(data.speed) / SPEED_FAST / 1000 * 0.85}s`;
  robot.style.setProperty("--dur", dur); body.style.setProperty("--dur", dur);
  robot.style.transform = `translate(${x * S}px, ${y * S}px)`;
  let target = d * 90;
  let diff = ((target - robotDeg) % 360 + 540) % 360 - 180; // shortest way round
  robotDeg += diff;
  body.style.transform = `rotate(${robotDeg}deg)`;
}
function resetRobot() {
  token += 1;
  tpos = 0; trace = null;
  robotDeg = map.start.d * 90;
  Object.values(coinEls).forEach((c) => { c.style.display = ""; });
  placeRobot(map.start.x, map.start.y, map.start.d, true);
  highlight(null);
  $("robot") && $("robot").classList.remove("bump");
}

// ---------- program rendering ----------
const LABEL = { fwd: "⬆ Move forward", left: "↺ Turn left", right: "↻ Turn right" };
function renderList(list, owner, slot) {
  const isActive = active.owner === owner && active.slot === slot;
  const inner = list.length ? list.map(renderBlock).join("") : `<div class="ph">${owner === "main" ? "Tap or drag blocks here" : "Drop blocks here"}</div>`;
  return `<div class="list${owner === "main" ? " main" : ""}${isActive ? " active" : ""}" data-owner="${owner}" data-slot="${slot}">${inner}</div>`;
}
function renderBlock(b) {
  const x = `<button class="x" data-act="del" aria-label="Remove this block">✕</button>`;
  if (b.t === "repeat") return `<div class="pblock repeat" data-id="${b.id}"><div class="head">🔁 Repeat <span class="num"><button data-act="dec" aria-label="Fewer times">−</button><b>${b.n}</b><button data-act="inc" aria-label="More times">+</button></span> times${x}</div>${renderList(b.body, b.id, "body")}</div>`;
  if (b.t === "until") return `<div class="pblock until" data-id="${b.id}"><div class="head">🔁 Repeat until ⭐${x}</div>${renderList(b.body, b.id, "body")}</div>`;
  if (b.t === "if") return `<div class="pblock if" data-id="${b.id}"><div class="head">🔀 If the path ahead is <button class="cond" data-act="cond" aria-label="Change the condition">${b.c}</button>${x}</div><span class="slot-label">then</span>${renderList(b.then, b.id, "then")}<span class="slot-label">otherwise</span>${renderList(b.else, b.id, "else")}</div>`;
  return `<div class="pblock ${b.t}" data-id="${b.id}"><div class="head">${LABEL[b.t]}${x}</div></div>`;
}
function renderProg() {
  $("prog").innerHTML = renderList(program, "main", "main");
  const n = countBlocks(program);
  $("count").textContent = `${n} block${n === 1 ? "" : "s"} · par ${level.par}`;
  const where = active.owner === "main" ? "the main program" : `inside the ${findBlock(program, active.owner) ? ({ repeat: "Repeat", until: "Repeat until", if: "If" })[findBlock(program, active.owner).b.t] : ""} block${active.slot === "then" ? " (then)" : active.slot === "else" ? " (otherwise)" : ""}`;
  $("adding").textContent = `New blocks you tap are added to ${where}. Tap a box to choose where.`;
}
function highlight(id) {
  document.querySelectorAll(".pblock.run").forEach((e) => e.classList.remove("run"));
  if (id) { const e = document.querySelector(`.pblock[data-id="${id}"]`); if (e) e.classList.add("run"); }
}

// ---------- editing ----------
function addBlock(type, owner = active.owner, slot = active.slot, index = null) {
  const list = slotList(owner, slot) || program;
  const b = mk(type);
  if (index === null || index > list.length) list.push(b); else list.splice(index, 0, b);
  if (b.body) active = { owner: b.id, slot: "body" };
  else if (b.t === "if") active = { owner: b.id, slot: "then" };
  sfx.add();
  stopPlayback();
  renderProg();
  return b;
}
function removeBlock(id) {
  const r = findBlock(program, id);
  if (!r) return null;
  r.list.splice(r.index, 1);
  if (active.owner !== "main" && !findBlock(program, active.owner)) active = { owner: "main", slot: "main" };
  return r.b;
}
$("palette").addEventListener("click", (e) => { const b = e.target.closest("[data-type]"); if (!b || dragged) return; addBlock(b.dataset.type); });
$("prog").addEventListener("click", (e) => {
  if (dragged) return;
  const act = e.target.closest("[data-act]");
  const blockEl = e.target.closest(".pblock");
  if (act && blockEl) {
    const r = findBlock(program, Number(blockEl.dataset.id));
    if (!r) return;
    if (act.dataset.act === "del") { removeBlock(r.b.id); }
    else if (act.dataset.act === "inc") r.b.n = Math.min(12, r.b.n + 1);
    else if (act.dataset.act === "dec") r.b.n = Math.max(2, r.b.n - 1);
    else if (act.dataset.act === "cond") r.b.c = r.b.c === "clear" ? "blocked" : "clear";
    stopPlayback(); renderProg();
    return;
  }
  const list = e.target.closest(".list");
  if (list) { active = { owner: list.dataset.owner === "main" ? "main" : Number(list.dataset.owner), slot: list.dataset.slot }; renderProg(); }
});
$("clear").addEventListener("click", () => { program = []; active = { owner: "main", slot: "main" }; stopPlayback(); renderProg(); });

// drag and drop (pointer based, so it works with a finger as well as a mouse)
let dragged = false;
function startDrag(e, payload, labelHtml, cls) {
  const sx = e.clientX, sy = e.clientY;
  let ghost = null;
  const move = (ev) => {
    if (!ghost && Math.hypot(ev.clientX - sx, ev.clientY - sy) > 7) { ghost = document.createElement("div"); ghost.className = `block ${cls} ghost-drag`; ghost.innerHTML = labelHtml; document.body.appendChild(ghost); dragged = true; }
    if (ghost) { ghost.style.left = `${ev.clientX}px`; ghost.style.top = `${ev.clientY}px`; }
  };
  const up = (ev) => {
    document.removeEventListener("pointermove", move);
    document.removeEventListener("pointerup", up);
    document.removeEventListener("pointercancel", up);
    if (ghost) {
      ghost.remove();
      const el = document.elementFromPoint(ev.clientX, ev.clientY);
      const list = el && el.closest("#prog .list");
      if (list) {
        const owner = list.dataset.owner === "main" ? "main" : Number(list.dataset.owner);
        const slot = list.dataset.slot;
        const kids = [...list.children].filter((c) => c.classList.contains("pblock"));
        let idx = kids.filter((c) => { const r = c.getBoundingClientRect(); return ev.clientY > r.top + r.height / 2; }).length;
        if (payload.id) {
          if (owner !== "main" && inside(payload.id, owner)) { setTimeout(() => { dragged = false; }, 60); return; }
          const before = findBlock(program, payload.id);
          const moving = removeBlock(payload.id);
          if (moving) { const dest = slotList(owner, slot) || program; if (before && before.list === dest && before.index < idx) idx -= 1; dest.splice(Math.min(idx, dest.length), 0, moving); stopPlayback(); renderProg(); }
        } else addBlock(payload.type, owner, slot, idx);
      } else if (payload.id) { removeBlock(payload.id); stopPlayback(); renderProg(); } // dropped outside: throw it away
      setTimeout(() => { dragged = false; }, 60);
    }
  };
  document.addEventListener("pointermove", move);
  document.addEventListener("pointerup", up);
  document.addEventListener("pointercancel", up);
}
$("palette").addEventListener("pointerdown", (e) => { const b = e.target.closest("[data-type]"); if (b && e.button === 0) startDrag(e, { type: b.dataset.type }, b.innerHTML, b.dataset.type); });
$("prog").addEventListener("pointerdown", (e) => {
  const head = e.target.closest(".head");
  if (!head || e.target.closest("button") || e.button !== 0) return;
  const blockEl = head.closest(".pblock");
  startDrag(e, { id: Number(blockEl.dataset.id) }, head.firstChild.textContent.trim() || "block", [...blockEl.classList].find((c) => ["fwd", "left", "right", "repeat", "until", "if"].includes(c)));
});

// ---------- running ----------
const wait = (ms) => new Promise((r) => setTimeout(r, ms / SPEED_FAST));
function stopPlayback() { if (trace) { token += 1; trace = null; tpos = 0; highlight(null); Object.values(coinEls).forEach((c) => { c.style.display = ""; }); placeRobot(map.start.x, map.start.y, map.start.d, true); robotDeg = map.start.d * 90; $("robotbody").style.transform = `rotate(${robotDeg}deg)`; } }
function ensureTrace() {
  if (trace) return true;
  if (!program.length) { setStatus("Your program is empty. Tap some blocks to add them first.", "bad"); return false; }
  const r = run(map, program);
  trace = { ...r, program: JSON.parse(JSON.stringify(program)) };
  tpos = 0;
  Object.values(coinEls).forEach((c) => { c.style.display = ""; });
  robotDeg = map.start.d * 90;
  placeRobot(map.start.x, map.start.y, map.start.d, true);
  return true;
}
async function apply(ev) {
  if (ev.k === "start") return;
  if (ev.id) highlight(ev.id);
  if (ev.k === "enter" || ev.k === "check") return;
  placeRobot(ev.x, ev.y, ev.d);
  if (ev.k === "move") { sfx.step(); if (ev.coin) { sfx.coin(); const c = coinEls[`${ev.x},${ev.y}`]; if (c) setTimeout(() => { c.style.display = "none"; }, 120); } }
  else if (ev.k === "turn") sfx.turn();
  else if (ev.k === "bump") { sfx.bump(); const r = $("robot"); r.classList.remove("bump"); void r.getBoundingClientRect(); r.classList.add("bump"); }
}
async function playAll() {
  if (!ensureTrace()) return;
  const my = (token += 1);
  $("run").disabled = true;
  setStatus("Running…");
  while (tpos < trace.events.length) {
    if (my !== token) return;
    const ev = trace.events[tpos++];
    await apply(ev);
    if (ev.k === "move" || ev.k === "turn" || ev.k === "bump") await wait(Number(data.speed));
    else await wait(60);
  }
  if (my === token) { $("run").disabled = false; finish(); }
}
async function stepOnce() {
  if (!ensureTrace()) return;
  token += 1;
  while (tpos < trace.events.length) {
    const ev = trace.events[tpos++];
    await apply(ev);
    if (ev.k === "move" || ev.k === "turn" || ev.k === "bump") break;
  }
  if (tpos >= trace.events.length) finish();
  else setStatus(`Step ${tpos}… press Step again, or Run to finish.`);
}
function finish() {
  highlight(null);
  const r = trace;
  if (r.outcome === "win") return win(r);
  failures += 1;
  if (failures >= 3) $("solution").hidden = false;
  if (r.outcome === "crash") setStatus("Zippy bumped into a rock or the edge. Look at where each turn happens and try again.", "bad");
  else if (r.outcome === "loop") setStatus("Zippy took too many steps. Is a loop going round and round without reaching the star?", "bad");
  else setStatus(r.coins < map.coins.size ? "Zippy stopped before reaching the star. Add more blocks." : "Zippy stopped, but not at the star yet. Add more blocks.", "bad");
}
function win(r) {
  const blocks = countBlocks(trace.program);
  const hasCoins = map.coins.size > 0;
  const allCoins = !hasCoins || r.coins === map.coins.size;
  let stars = 1;
  if (!usedSolution) {
    if (hasCoins ? allCoins : blocks <= level.par + 2) stars = 2;
    if (allCoins && blocks <= level.par) stars = 3;
  }
  const old = starsOf(lvIdx);
  if (stars > old) { data.stars[lvIdx] = stars; save(); }
  renderStars();
  sfx.win();
  $("winEmoji").textContent = stars === 3 ? "🏆" : "🎉";
  $("winTitle").textContent = stars === 3 ? "Perfect!" : "Level complete!";
  $("winStars").textContent = "⭐".repeat(stars) + "☆".repeat(3 - stars);
  const tips = [];
  if (usedSolution) tips.push("You used the solution, so try this level again by yourself for more stars.");
  else {
    if (hasCoins && !allCoins) tips.push(`Collect all ${map.coins.size} coins for a second star.`);
    if (blocks > level.par) tips.push(`You used ${blocks} blocks. Can you do it in ${level.par} or fewer for three stars?`);
    if (!tips.length) tips.push(`You used ${blocks} block${blocks === 1 ? "" : "s"} and got every coin. Great programming!`);
  }
  $("winText").textContent = tips.join(" ");
  $("winNext").textContent = lvIdx + 1 < LEVELS.length ? "Next level" : "All levels";
  setStatus("You did it!", "good");
  setTimeout(() => $("win").classList.add("show"), 450);
}
$("run").addEventListener("click", () => { if (trace && tpos >= trace.events.length) { resetRobot(); } playAll(); });
$("step").addEventListener("click", stepOnce);
$("reset").addEventListener("click", () => { resetRobot(); $("run").disabled = false; setStatus("Build your program, then press Run."); });
$("speed").addEventListener("click", (e) => { const c = e.target.closest("[data-v]"); if (!c) return; data.speed = c.dataset.v; save(); syncSpeed(); });
function syncSpeed() { document.querySelectorAll("#speed .g-chip").forEach((c) => c.setAttribute("aria-pressed", String(c.dataset.v === String(data.speed)))); }
$("hint").addEventListener("click", () => { hintStage += 1; setStatus(`💡 ${level.hint}`); if (hintStage >= 2) $("solution").hidden = false; });
$("solution").addEventListener("click", () => { program = reid(cloneProgram(level.solution)); usedSolution = true; active = { owner: "main", slot: "main" }; stopPlayback(); renderProg(); setStatus("Here is one way to do it. Press Run to watch Zippy, then try the level again on your own."); });
$("back").addEventListener("click", showMenu);
$("winAgain").addEventListener("click", () => { $("win").classList.remove("show"); resetRobot(); $("run").disabled = false; });
$("winNext").addEventListener("click", () => { $("win").classList.remove("show"); if (lvIdx + 1 < LEVELS.length) loadLevel(lvIdx + 1); else showMenu(); });

const mute = $("mute");
const syncMute = () => { mute.textContent = data.muted ? "Sound Off" : "Sound On"; mute.setAttribute("aria-pressed", String(data.muted)); };
mute.addEventListener("click", () => { data.muted = !data.muted; save(); syncMute(); });
syncMute();
syncSpeed();
showMenu();
window.__cq = { LEVELS, data, loadLevel, get program() { return program; }, setProgram: (p) => { program = reid(cloneProgram(p)); renderProg(); }, addBlock, playAll, get trace() { return trace; }, showMenu, DX, DY, step: () => stepOnce() };
