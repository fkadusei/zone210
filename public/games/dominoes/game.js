import { createOnline } from "../../assets/online.js";
import { deal, opener, ends, sidesFor, place, playable, same, indexOfTile, total, chooseMove } from "./logic.js";

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
const SETTINGS_KEY = "zone210_dominoes_settings";
const settings = { mode: "cpu", level: "normal", target: "100", muted: false, ...store.get(SETTINGS_KEY, {}) };
if (!["cpu", "two", "online"].includes(settings.mode)) settings.mode = "cpu";
if (!["0", "100"].includes(String(settings.target))) settings.target = "100";
settings.target = String(settings.target);

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
    osc.type = type;
    osc.frequency.value = freq;
    amp.gain.setValueAtTime(0.0001, t);
    amp.gain.exponentialRampToValueAtTime(gain, t + 0.006);
    amp.gain.exponentialRampToValueAtTime(0.0001, t + length);
    osc.connect(amp).connect(audio.destination);
    osc.start(t);
    osc.stop(t + length + 0.02);
  } catch (err) {
    /* audio unavailable */
  }
}
const sfx = {
  clack: () => { tone(180, 0, 0.05, "square", 0.07); tone(120, 0.02, 0.08, "triangle", 0.09); },
  draw: () => tone(330, 0, 0.08, "triangle", 0.07),
  pass: () => tone(200, 0, 0.2, "sawtooth", 0.05),
  win: () => [523, 659, 784, 1046, 784, 1046].forEach((f, i) => tone(f, i * 0.1, 0.24, "triangle", 0.1)),
  lose: () => [330, 262, 196].forEach((f, i) => tone(f, i * 0.16, 0.3, "sawtooth", 0.06)),
};

const online = () => settings.mode === "online";
const cpu = () => settings.mode === "cpu";
const two = () => settings.mode === "two";
let myP = 0; // online: role 0 starts the match
let roomSeed = 0;
let roundNo = 0;
let nextMe = false;
let nextThem = false;
const inbox = [];
const net = createOnline({
  container: document.querySelector(".g-page"),
  before: $("scores"),
  prefix: "zone210-dominoes-",
  names: ["Player 1", "Player 2"],
  startInfo: () => ({ target: settings.target }),
  onStart: ({ role, seed, info }) => {
    myP = role;
    roomSeed = seed;
    if (info && ["0", "100"].includes(String(info.target))) settings.target = String(info.target);
    syncChips();
    scores = [0, 0];
    roundNo = 0;
    inbox.length = 0;
    nextMe = nextThem = false;
    newRound();
  },
  onData: (m) => { inbox.push(m); drain(); },
  onLeft: () => { inbox.length = 0; setStatus("Your friend left the game."); render(); },
});
function drain() {
  while (online() && net.active && inbox.length) {
    const m = inbox[0];
    if (m.t === "next") { inbox.shift(); nextThem = true; maybeNext(); continue; }
    if (!S || S.over) { inbox.shift(); continue; }
    // the other player's move can arrive while my side is still finishing a pass: keep it until it really is their turn
    if (busy || S.turn === myP) break;
    inbox.shift();
    if (m.t === "play" && Array.isArray(m.tile)) {
      const t = S.hands[S.turn].find((h) => same(h, m.tile) || (h[0] === m.tile[1] && h[1] === m.tile[0]));
      if (t && sidesFor(S.chain, t).includes(m.side)) playTile(S.turn, t, m.side, true);
    } else if (m.t === "draw") drawTile(S.turn, true);
  }
}

let S = null; // round state
let scores = [0, 0];
let pending = null; // tile awaiting an end choice
let covered = false; // hot-seat: hide hands between turns
let busy = false;

const viewP = () => (online() ? myP : cpu() ? 0 : S ? S.turn : 0);
const humanTurn = () => S && !S.over && !busy && (online() ? net.active && S.turn === myP : cpu() ? S.turn === 0 : true);
const nameOf = (p) => (cpu() ? (p === 0 ? "You" : "Computer") : online() ? (p === myP ? "You" : "Friend") : `Player ${p + 1}`);
const statusEl = $("status");
const setStatus = (t, kind = "") => {
  statusEl.textContent = t;
  statusEl.className = "g-status" + (kind ? ` ${kind}` : "");
};

// ---------- drawing ----------
const PIP = { 0: [], 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
function half(n) {
  const h = document.createElement("div");
  h.className = "half";
  for (let k = 0; k < 9; k += 1) {
    const i = document.createElement("i");
    if (PIP[n].includes(k)) i.className = "on";
    h.appendChild(i);
  }
  return h;
}
function tileEl(a, b, orient, cls = "") {
  const t = document.createElement("div");
  t.className = `tile ${orient} ${cls}`.trim();
  t.append(half(a), half(b));
  t.setAttribute("role", "img");
  t.setAttribute("aria-label", `${a}-${b}`);
  return t;
}

function drawChain() {
  const box = $("chain");
  const board = $("board");
  box.innerHTML = "";
  if (!S || !S.chain.length) { box.innerHTML = '<div class="empty">The chain starts here</div>'; return; }
  const W = Math.max(240, board.clientWidth - 24);
  const u = Math.max(20, Math.min(40, Math.floor(W / 15)));
  board.style.setProperty("--u", `${u}px`);
  const gap = 3;
  const rows = [[]];
  let used = 0;
  S.chain.forEach((n, idx) => {
    const w = (n.a === n.b ? u : 2 * u) + gap;
    if (used + w > W && rows[rows.length - 1].length) { rows.push([]); used = 0; }
    rows[rows.length - 1].push({ n, idx });
    used += w;
  });
  rows.forEach((r) => {
    const row = document.createElement("div");
    row.className = "row";
    r.forEach(({ n, idx }) => {
      const dbl = n.a === n.b;
      const t = tileEl(n.a, n.b, dbl ? "v" : "h", idx === S.lastIdx ? "last" : "");
      t.style.setProperty("--u", `${u}px`);
      row.appendChild(t);
    });
    box.appendChild(row);
  });
}

function render() {
  drawChain();
  const p = viewP();
  // scores
  const target = Number(settings.target);
  $("scores").innerHTML = [0, 1].map((q) => {
    const top = q !== p; // the viewer's score sits on the right (bottom) side
    return `<div class="score${S && !S.over && S.turn === q ? " turn" : ""}"><span class="nm">${nameOf(q)}<small>${target ? `first to ${target}` : "single round"} · ${S ? S.hands[q].length : 7} tiles</small></span><b>${scores[q]}</b></div>`;
  }).sort((a, b) => 0).join("");
  // opponent hand (backs)
  const oppIdx = 1 - p;
  const opp = $("oppHand");
  opp.innerHTML = "";
  if (S) {
    for (let i = 0; i < S.hands[oppIdx].length; i += 1) opp.appendChild(tileEl(0, 0, "v", "back"));
    const y = document.createElement("span");
    y.className = "yard";
    y.textContent = `Boneyard: ${S.yard.length}`;
    opp.appendChild(y);
  }
  // my hand
  const hand = $("hand");
  hand.innerHTML = "";
  hand.classList.toggle("covered", covered);
  if (S) {
    const mine = S.hands[p];
    const can = humanTurn() && !covered;
    const pl = can ? playable(S.chain, mine) : [];
    mine.slice().sort((x, y) => x[0] + x[1] - (y[0] + y[1]) || x[0] - y[0]).forEach((t) => {
      const ok = pl.some((q) => same(q, t));
      const el = tileEl(t[0], t[1], "v", (covered ? "back " : "") + (ok ? "ok " : "") + (pending && same(pending, t) ? "sel" : ""));
      if (!covered) {
        el.tabIndex = ok ? 0 : -1;
        el.addEventListener("click", () => onTile(t));
        el.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onTile(t); } });
      }
      hand.appendChild(el);
    });
  }
  // actions
  const needDraw = humanTurn() && !covered && !playable(S.chain, S.hands[p]).length && S.yard.length > 0;
  $("draw").hidden = !(S && humanTurn() && !covered && !playable(S.chain, S.hands[p]).length && S.yard.length > 0);
  $("draw").textContent = `Draw from boneyard (${S ? S.yard.length : 0})`;
  const ch = $("choice");
  ch.hidden = !pending;
  ch.innerHTML = "";
  if (pending) {
    const [L, R] = ends(S.chain);
    const sides = sidesFor(S.chain, pending);
    [["L", `◀ Left end (${L})`], ["R", `Right end (${R}) ▶`]].forEach(([s, label]) => {
      if (!sides.includes(s)) return;
      const b = document.createElement("button");
      b.className = "g-btn";
      b.textContent = label;
      b.addEventListener("click", () => { const t = pending; pending = null; submit(t, s); });
      ch.appendChild(b);
    });
    const c = document.createElement("button");
    c.className = "g-btn ghost";
    c.textContent = "Cancel";
    c.addEventListener("click", () => { pending = null; render(); });
    ch.appendChild(c);
  }
  void needDraw;
}

// ---------- round flow ----------
function newRound() {
  roundNo += 1;
  const seed = online() ? (roomSeed + roundNo * 7919) >>> 0 : (Math.random() * 4294967296) >>> 0;
  const d = deal(seed);
  S = { hands: d.hands, yard: d.yard, chain: [], turn: 0, over: false, lastIdx: -1, voids: [new Set(), new Set()], passes: 0 };
  pending = null;
  busy = false;
  nextMe = false;
  $("end").classList.remove("show");
  net.setOver(false);
  const o = opener(S.hands);
  S.hands[o.p].splice(indexOfTile(S.hands[o.p], o.tile), 1);
  S.chain = place([], o.tile, "R");
  S.lastIdx = 0;
  sfx.clack();
  S.turn = 1 - o.p;
  covered = false;
  render();
  setStatus(`${nameOf(o.p)} opened with the ${o.tile[0]}-${o.tile[1]}.`);
  afterMove();
}

function afterMove() {
  if (S.over) return;
  const p = S.turn;
  const hand = S.hands[p];
  const pl = playable(S.chain, hand);
  if (!pl.length && !S.yard.length) {
    // pass (or a blocked game when neither player can move)
    const other = playable(S.chain, S.hands[1 - p]);
    if (!other.length) return endRound(null);
    busy = true;
    render();
    sfx.pass();
    setStatus(`${nameOf(p)} ${nameOf(p) === "You" ? "have" : "has"} nothing to play and the boneyard is empty: pass.`);
    const [l, r] = ends(S.chain);
    S.voids[p].add(l); S.voids[p].add(r);
    setTimeout(() => { busy = false; S.turn = 1 - p; afterMove(); }, 1300 / SPEED);
    return;
  }
  // hot seat: hide hands while the device changes owner
  if (two() && !covered && S.hands[0].length + S.hands[1].length < 14 && lastMover !== null && lastMover !== p) {
    covered = true;
    $("coverTitle").textContent = `Pass to ${nameOf(p)}`;
    $("cover").classList.add("show");
  }
  render();
  if (cpu() && p === 1) return cpuTurn();
  if (!pl.length) setStatus(online() && !mine() ? "Your friend is drawing…" : "No tile fits. Draw from the boneyard.", "bad");
  else {
    const [l, r] = ends(S.chain);
    setStatus(online() && p !== myP ? "Your friend's turn…" : `${nameOf(p) === "You" ? "Your" : `${nameOf(p)}'s`} turn. Ends: ${l} and ${r}.`);
  }
  drain();
}
const mine = () => S && S.turn === myP;
let lastMover = null;

async function cpuTurn() {
  busy = true;
  render();
  setStatus("The computer is thinking…");
  await sleep(850);
  if (!S || S.over) return;
  for (;;) {
    const pl = playable(S.chain, S.hands[1]);
    if (pl.length) break;
    if (!S.yard.length) { busy = false; return afterMove(); }
    drawTile(1, true);
    await sleep(520);
  }
  const m = chooseMove(S.chain, S.hands[1], S.yard.length, S.voids[0], settings.level);
  busy = false;
  if (m) playTile(1, m.tile, m.side, true);
}

function onTile(t) {
  if (!humanTurn() || covered) return;
  const sides = sidesFor(S.chain, t);
  if (!sides.length) { setStatus("That tile doesn't match either end.", "bad"); return; }
  if (sides.length === 1 || ends(S.chain)[0] === ends(S.chain)[1]) return submit(t, sides[0]);
  pending = t;
  render();
  setStatus("Which end do you want to play it on?");
  return undefined;
}

function submit(t, side) {
  if (online()) net.send({ t: "play", tile: t, side });
  playTile(viewP(), t, side, false);
}

function playTile(p, t, side, remote) {
  void remote;
  const i = indexOfTile(S.hands[p], t);
  if (i < 0) return;
  S.hands[p].splice(i, 1);
  S.chain = place(S.chain, t, side);
  S.lastIdx = side === "L" ? 0 : S.chain.length - 1;
  sfx.clack();
  lastMover = p;
  pending = null;
  if (!S.hands[p].length) return endRound(p);
  S.turn = 1 - p;
  covered = false;
  afterMove();
}

function drawTile(p, remote) {
  if (!S.yard.length) return;
  if (online() && !remote) net.send({ t: "draw" });
  const [l, r] = ends(S.chain);
  S.voids[p].add(l); S.voids[p].add(r);
  S.hands[p].push(S.yard.shift());
  sfx.draw();
  render();
  if (!cpu() || p === 0) {
    if (!playable(S.chain, S.hands[p]).length && !S.yard.length) afterMove();
    else if (playable(S.chain, S.hands[p]).length) setStatus(`${nameOf(p)} drew a tile that fits.`);
    else setStatus(p === viewP() ? "Still no match. Draw again." : `${nameOf(p)} is drawing…`, p === viewP() ? "bad" : "");
  }
  drain();
}

function endRound(winner) {
  S.over = true;
  busy = false;
  covered = false;
  $("cover").classList.remove("show");
  let pts = 0;
  let text;
  const t0 = total(S.hands[0]);
  const t1 = total(S.hands[1]);
  if (winner === null) {
    const w = t0 < t1 ? 0 : t1 < t0 ? 1 : -1;
    if (w < 0) text = `Blocked game, and both hands add up to ${t0}. Nobody scores.`;
    else { pts = Math.abs(t0 - t1); winner = w; text = `Blocked game. ${nameOf(w)} ${nameOf(w) === "You" ? "have" : "has"} the lowest hand (${Math.min(t0, t1)} vs ${Math.max(t0, t1)}) and score${nameOf(w) === "You" ? "" : "s"} ${pts}.`; }
  } else {
    pts = winner === 0 ? t1 : t0;
    text = `${nameOf(winner)} played the last tile and ${nameOf(winner) === "You" ? "score" : "scores"} ${pts} from the other hand.`;
  }
  if (winner !== null && winner >= 0) scores[winner] += pts;
  render();
  const target = Number(settings.target);
  const matchWinner = target ? scores.findIndex((s) => s >= target) : -1;
  const done = !target || matchWinner >= 0;
  const youWon = winner === null || winner < 0 ? null : cpu() ? winner === 0 : online() ? winner === myP : null;
  let title;
  if (done) {
    const w = target ? (scores[0] >= target && scores[1] >= target ? (scores[0] >= scores[1] ? 0 : 1) : matchWinner) : winner;
    if (w === null || w < 0) title = "It's a draw!";
    else title = cpu() ? (w === 0 ? "You win the match!" : "The computer wins the match") : online() ? (w === myP ? "You win!" : "Your friend wins.") : `${nameOf(w)} wins${target ? " the match" : ""}!`;
    const you = w === null || w < 0 ? null : cpu() ? w === 0 : online() ? w === myP : true;
    you === false ? sfx.lose() : sfx.win();
    $("endEmoji").textContent = you === false ? (cpu() ? "🤖" : "🎲") : "🏆";
    $("again").textContent = online() ? "Rematch" : "Play again";
    net.setOver(true);
  } else {
    title = winner === null || winner < 0 ? "Round drawn" : cpu() ? (winner === 0 ? "You win the round!" : "Computer wins the round") : online() ? (winner === myP ? "You win the round!" : "Your friend wins the round") : `${nameOf(winner)} wins the round`;
    youWon === false ? sfx.lose() : sfx.win();
    $("endEmoji").textContent = youWon === false ? "🎲" : "🎉";
    $("again").textContent = online() ? (nextMe ? "Waiting for friend…" : "Next round") : "Next round";
  }
  $("endTitle").textContent = title;
  $("endText").textContent = `${text} Score: ${nameOf(0)} ${scores[0]} · ${nameOf(1)} ${scores[1]}.`;
  $("again").dataset.done = done ? "1" : "";
  setStatus(title, "good");
  setTimeout(() => $("end").classList.add("show"), 700 / SPEED);
}

function maybeNext() {
  if (nextMe && nextThem && online()) {
    nextMe = nextThem = false;
    newRound();
  }
}

// ---------- controls ----------
function syncChips() {
  ["mode", "level", "target"].forEach((k) => document.querySelectorAll(`#${k} .g-chip`).forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.value === String(settings[k])))));
  $("levelRow").hidden = !cpu();
  $("newGame").hidden = online();
  if (online()) net.open(); else net.close();
}
["mode", "level", "target"].forEach((id) =>
  $(id).addEventListener("click", (e) => {
    const chip = e.target.closest(".g-chip");
    if (!chip || String(settings[id]) === chip.dataset.value) return;
    if (online() && net.active && id === "target") return; // the host's match length applies once a game is under way
    settings[id] = chip.dataset.value;
    store.set(SETTINGS_KEY, settings);
    syncChips();
    if (id === "target" && online()) return;
    startMatch();
  })
);
function startMatch() {
  scores = [0, 0];
  roundNo = 0;
  lastMover = null;
  $("cover").classList.remove("show");
  if (online() && !net.active) { S = null; render(); setStatus("Create or join a room to start."); return; }
  newRound();
}
$("newGame").addEventListener("click", startMatch);
$("draw").addEventListener("click", () => { if (humanTurn() && !covered) drawTile(viewP(), false); });
$("coverGo").addEventListener("click", () => { covered = false; $("cover").classList.remove("show"); render(); });
$("again").addEventListener("click", () => {
  $("end").classList.remove("show");
  const done = $("again").dataset.done === "1";
  if (online()) {
    if (done) net.rematch();
    else { nextMe = true; net.send({ t: "next" }); maybeNext(); if (!nextThem) setStatus("Waiting for your friend to start the next round…"); }
  } else if (done) startMatch();
  else newRound();
});
$("endView").addEventListener("click", () => $("end").classList.remove("show"));
const mute = $("mute");
function syncMute() {
  mute.textContent = settings.muted ? "Sound Off" : "Sound On";
  mute.setAttribute("aria-pressed", String(settings.muted));
}
mute.addEventListener("click", () => { settings.muted = !settings.muted; store.set(SETTINGS_KEY, settings); syncMute(); });
window.addEventListener("resize", () => S && drawChain());

syncChips();
syncMute();
startMatch();
const invited = net.roomParam();
if (invited) { settings.mode = "online"; syncChips(); startMatch(); net.join(invited); }
window.__dm = {
  get S() { return S; }, get scores() { return scores; }, get myP() { return myP; }, get busy() { return busy; }, get covered() { return covered; },
  playTile, drawTile, submit, humanTurn, playable, sidesFor, onTile, afterMove, render,
};
