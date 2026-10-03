import { createOnline } from "../../assets/online.js";
import { SIZE, CENTER, PREMIUM, tileScore, buildDict, newGame, evaluate, play, pass, exchange, chooseMove } from "./logic.js";

const $ = (id) => document.getElementById(id);
const boardEl = $("board");
const rackEl = $("rack");
const statusEl = $("status");
const previewEl = $("preview");
const scoresEl = $("scores");

const opts = { mode: "cpu", level: "normal", count: 2 };
let dict = null;
let S = null; // game state (see logic.js)
let myP = 0; // my seat online
let busy = false; // the computer is thinking
let covered = false; // pass & play: waiting for the next player to look
let staged = []; // tiles placed on the board this turn: { i, ri, tile, as }
let rackView = []; // my rack as shown: { tile, used }
let sel = -1; // selected rack tile
let swapMode = false;
let marks = new Set();
let hinted = [];
let roomSeed = 0;
let epoch = 0;

const online = () => opts.mode === "online";
const cpu = () => opts.mode === "cpu";
const seats = () => (cpu() || online() ? 2 : opts.count);
const nameOf = (p) => (cpu() ? (p === 0 ? "You" : "Computer") : online() ? (p === myP ? "You" : "Friend") : `Player ${p + 1}`);
const viewP = () => (online() ? myP : cpu() ? 0 : S ? S.turn : 0);
const myTurn = () => !!S && !S.over && !busy && !covered && (online() ? net.active && S.turn === myP : cpu() ? S.turn === 0 : true);

const dictReady = fetch("enable.txt")
  .then((r) => r.text())
  .then((t) => { dict = buildDict(t); });

/* ---------- small sounds ---------- */
function tone(freq, at, dur, type = "sine", vol = 0.08) {
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
  tick: () => tone(520, 0, 0.06, "triangle", 0.07),
  place: () => { tone(380, 0, 0.07, "triangle", 0.09); },
  good: (n) => [523, 659, 784, 1046].slice(0, Math.min(4, 2 + Math.floor(n / 12))).forEach((f, i) => tone(f, i * 0.07, 0.2, "triangle", 0.09)),
  bad: () => { tone(200, 0, 0.18, "sawtooth", 0.06); },
};

/* ---------- online ---------- */
const net = createOnline({
  container: document.querySelector(".g-page"),
  before: scoresEl,
  prefix: "zone210-wordcraft-",
  names: ["Player 1", "Player 2"],
  onStart: async ({ role, seed }) => { myP = role; await dictReady; if (S && roomSeed === seed) return; /* a reload put this very game back */ roomSeed = seed; startGame(seed); },
  onData: async (m) => {
    await dictReady;
    if (!online() || !S || S.over || S.turn === myP) return;
    let res = null;
    if (m.t === "play") res = play(S, m.pl, dict);
    else if (m.t === "pass") res = pass(S);
    else if (m.t === "swap") res = exchange(S, m.idx);
    if (res && res.ok !== false) { lastNote(); afterMove(true); }
  },
  onLeft: () => { setStatus("Your friend left the game."); busy = true; render(); },
  getState: () => ({ S, roomSeed }),
  setState: (g) => {
    epoch += 1;
    S = g.S; roomSeed = g.roomSeed; busy = false; covered = false;
    resetTurn();
    $("end").hidden = true;
    render();
    if (S.over) showEnd(); else turnPrompt();
  },
});

/* ---------- setup ---------- */
function wire(id, key, num) {
  const el = $(id);
  el.addEventListener("click", (e) => {
    const chip = e.target.closest(".g-chip");
    if (!chip) return;
    el.querySelectorAll(".g-chip").forEach((c) => c.setAttribute("aria-pressed", String(c === chip)));
    opts[key] = num ? Number(chip.dataset.value) : chip.dataset.value;
    if (key === "mode") {
      $("levelRow").hidden = opts.mode !== "cpu";
      $("countRow").hidden = opts.mode !== "two";
      $("restart").hidden = online();
      $("hintBtn").hidden = online();
      if (online()) net.open(); else net.close();
    }
    if (online() && key === "mode") { S = null; epoch += 1; boardEl.innerHTML = ""; rackEl.innerHTML = ""; scoresEl.innerHTML = ""; setStatus("Create or join a room to play a friend."); return; }
    startGame();
  });
}
wire("mode", "mode");
wire("level", "level");
wire("count", "count", true);
$("restart").addEventListener("click", () => startGame());

/* ---------- game flow ---------- */
function setStatus(t, kind = "") { statusEl.textContent = t; statusEl.className = "g-status" + (kind ? ` ${kind}` : ""); }

async function startGame(seed) {
  await dictReady;
  epoch += 1;
  $("end").hidden = true;
  const sd = seed !== undefined ? seed : (Math.random() * 4294967296) >>> 0;
  const first = cpu() ? Math.floor(sd % 2) : 0;
  S = newGame(sd, seats(), first);
  busy = false;
  covered = false;
  resetTurn();
  render();
  if (!online() || net.active) turnPrompt();
}

function resetTurn() {
  staged = [];
  sel = -1;
  swapMode = false;
  marks = new Set();
  hinted = [];
  rackView = S ? S.racks[viewP()].map((tile) => ({ tile, used: false })) : [];
}

function turnPrompt() {
  if (!S || S.over) return;
  resetTurn();
  covered = false;
  $("cover").hidden = true;
  render();
  if (cpu() && S.turn === 1) { thinkSoon(); return; }
  setStatus(online() ? (S.turn === myP ? "Your turn." : "Your friend is thinking…") : `${nameOf(S.turn)}: your turn.`);
}
$("coverBtn").addEventListener("click", () => { covered = false; $("cover").hidden = true; resetTurn(); render(); setStatus(`${nameOf(S.turn)}: your turn.`); });

function lastNote() {
  const l = S.last;
  if (!l) return;
  const who = nameOf(l.by);
  if (l.passed) setStatus(`${who} passed.`);
  else if (l.swapped) setStatus(`${who} swapped ${l.swapped} tile${l.swapped === 1 ? "" : "s"}.`);
  else setStatus(`${who} played ${l.words.join(", ")} for ${l.score} point${l.score === 1 ? "" : "s"}${l.bingo ? " (all 7 tiles! +50)" : ""}.`, l.score >= 30 ? "good" : "");
}

function afterMove(remote = false) {
  const note = statusEl.textContent; // the caller already described the move
  resetTurn();
  if (S.last && S.last.score) sfx.good(S.last.score);
  if (S.over) { render(); showEnd(); if (online()) net.setOver(true); return; }
  if (remote) { render(); setStatus(`${note} Your turn.`, statusEl.className.includes("good") ? "good" : ""); return; }
  if (cpu() && S.turn === 1) { thinkSoon(); return; }
  if (online()) { render(); setStatus(`${note} Waiting for your friend…`); return; }
  covered = true; // pass & play: hide the tiles until the next player is ready
  $("coverText").textContent = `${note} Pass the device to ${nameOf(S.turn)}.`;
  $("cover").hidden = false;
  render();
}

function thinkSoon() {
  busy = true;
  render();
  setStatus("Computer is thinking…");
  const my = epoch;
  setTimeout(() => {
    if (my !== epoch || !S || S.over) return;
    const m = chooseMove(S, dict, opts.level);
    if (!m) { if (S.bag.length >= 7) exchange(S, [0, 1, 2].filter((i) => i < S.racks[1].length)); else pass(S); } else play(S, m.pl, dict);
    busy = false;
    lastNote();
    const note = statusEl.textContent;
    resetTurn();
    render();
    if (S.last && S.last.score) sfx.good(S.last.score);
    if (S.over) { showEnd(); return; }
    setStatus(`${note} Your turn.`);
  }, 650);
}

/* ---------- placing tiles ---------- */
function stageTile(ri, i) {
  const rv = rackView[ri];
  if (!rv || rv.used || S.board[i] || staged.some((s) => s.i === i)) return;
  if (rv.tile === "?") { askBlank((letter) => { rv.used = true; staged.push({ i, ri, tile: "?", as: letter }); sel = -1; sfx.place(); render(); }); return; }
  rv.used = true;
  staged.push({ i, ri, tile: rv.tile });
  sel = -1;
  sfx.place();
  render();
}
function unstage(i) {
  const k = staged.findIndex((s) => s.i === i);
  if (k < 0) return;
  rackView[staged[k].ri].used = false;
  staged.splice(k, 1);
  sfx.tick();
  render();
}
function recall() { staged.forEach((s) => { rackView[s.ri].used = false; }); staged = []; sel = -1; hinted = []; render(); }

function askBlank(done) {
  const box = $("letters");
  box.innerHTML = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((L) => `<button type="button" data-l="${L}">${L}</button>`).join("");
  $("blank").hidden = false;
  const close = () => { $("blank").hidden = true; box.onclick = null; $("blankCancel").onclick = null; };
  box.onclick = (e) => { const b = e.target.closest("[data-l]"); if (!b) return; close(); done(b.dataset.l); };
  $("blankCancel").onclick = close;
  box.querySelector("button").focus();
}

/* ---------- rendering ---------- */
function stagedCells() { return staged.map((s) => ({ i: s.i, ch: s.tile === "?" ? s.as.toLowerCase() : s.tile })); }
const firstMove = () => !S.board[CENTER];

function render() {
  if (!S) return;
  // scores
  scoresEl.innerHTML = S.scores.map((v, p) => `<div class="score${S.turn === p && !S.over ? " turn" : ""}"><span class="nm">${nameOf(p)}</span><b>${v}</b></div>`).join("");
  // board
  const lastSet = new Set(S.last ? S.last.cells : []);
  const can = myTurn() && !swapMode;
  let html = "";
  for (let i = 0; i < SIZE * SIZE; i += 1) {
    const st = staged.find((s) => s.i === i);
    const ch = S.board[i] || (st ? (st.tile === "?" ? st.as.toLowerCase() : st.tile) : 0);
    const prem = PREMIUM[i];
    const cls = ["sq", prem, i === CENTER ? "star" : "", ch ? "has" : "", st ? "staged" : "", lastSet.has(i) ? "last" : "", hinted.includes(i) ? "hinted" : "", can && !S.board[i] ? "live" : ""].filter(Boolean).join(" ");
    const label = ch ? `${ch.toUpperCase()}${tileScore(ch)} points` : `empty${prem ? `, ${{ TW: "triple word", DW: "double word", TL: "triple letter", DL: "double letter" }[prem]}` : ""}`;
    const inner = ch ? `<span class="tile${ch === ch.toLowerCase() ? " blank" : ""}">${ch.toUpperCase()}<sub>${tileScore(ch)}</sub></span>` : i === CENTER ? "★" : prem;
    html += `<button type="button" class="${cls}" data-i="${i}" role="gridcell" aria-label="Row ${Math.floor(i / SIZE) + 1} column ${(i % SIZE) + 1}: ${label}"${!can && !st ? " disabled" : S.board[i] ? " disabled" : ""}>${inner}</button>`;
  }
  boardEl.innerHTML = html;
  // rack
  const shown = !covered && (cpu() || online() || true);
  rackEl.classList.toggle("dim", !myTurn());
  rackEl.innerHTML = shown ? rackView.map((r, k) => `<button type="button" class="rt${r.used ? " used" : ""}${sel === k ? " sel" : ""}${marks.has(k) ? " marked" : ""}" data-k="${k}" aria-label="${r.tile === "?" ? "Blank tile" : `${r.tile}, ${tileScore(r.tile)} points`}"${r.used || (!myTurn() && !swapMode) ? " disabled" : ""}>${r.tile === "?" ? "" : `${r.tile}<sub>${tileScore(r.tile)}</sub>`}</button>`).join("") : "";
  // preview
  let pv = "&nbsp;";
  let kind = "";
  if (swapMode) pv = "Tap the tiles you want to swap, then press Swap again.";
  else if (staged.length && myTurn()) {
    const r = evaluate(S.board, stagedCells(), dict, firstMove());
    if (r.ok) { pv = `${r.words.map((x) => x.w).join(", ")}: ${r.score} points${r.bingo ? " (all 7 tiles, +50!)" : ""}`; kind = "ok"; } else { pv = r.err; kind = "bad"; }
  }
  previewEl.innerHTML = pv;
  previewEl.className = "preview" + (kind ? ` ${kind}` : "");
  const ok = myTurn() && staged.length && !swapMode && evaluate(S.board, stagedCells(), dict, firstMove()).ok;
  $("playBtn").disabled = !ok;
  $("playBtn").hidden = swapMode;
  $("recall").hidden = swapMode;
  $("passBtn").disabled = !myTurn() || swapMode;
  $("swapBtn").disabled = !myTurn() || (!swapMode && S.bag.length < 7);
  $("swapBtn").textContent = swapMode ? (marks.size ? `♻ Swap ${marks.size}` : "✕ Cancel swap") : "♻ Swap";
  $("shuffleBtn").disabled = !myTurn();
  $("recall").disabled = !staged.length;
  $("hintBtn").disabled = !myTurn() || swapMode;
  $("bagnote").textContent = `${S.bag.length} tile${S.bag.length === 1 ? "" : "s"} left in the bag${S.bag.length < 7 && S.bag.length >= 0 ? " · swapping is closed" : ""}`;
}

boardEl.addEventListener("click", (e) => {
  const b = e.target.closest(".sq");
  if (!b || !S) return;
  const i = Number(b.dataset.i);
  if (staged.some((s) => s.i === i)) { unstage(i); return; }
  if (!myTurn() || swapMode || S.board[i]) return;
  if (sel < 0) {
    // tap a square first: use the first unused tile
    const k = rackView.findIndex((r) => !r.used);
    if (k < 0) return;
    sel = k;
  }
  stageTile(sel, i);
});
rackEl.addEventListener("click", (e) => {
  const b = e.target.closest(".rt");
  if (!b) return;
  const k = Number(b.dataset.k);
  if (swapMode) { if (marks.has(k)) marks.delete(k); else marks.add(k); sfx.tick(); render(); return; }
  sel = sel === k ? -1 : k;
  sfx.tick();
  render();
});

$("recall").addEventListener("click", recall);
$("shuffleBtn").addEventListener("click", () => {
  recall();
  for (let i = rackView.length - 1; i > 0; i -= 1) { const j = Math.floor(Math.random() * (i + 1)); [rackView[i], rackView[j]] = [rackView[j], rackView[i]]; }
  render();
});
$("playBtn").addEventListener("click", () => {
  if (!myTurn() || !staged.length) return;
  const pl = staged.map((s) => ({ i: s.i, tile: s.tile, as: s.as }));
  const res = play(S, pl, dict);
  if (!res || res.ok === false) { sfx.bad(); previewEl.textContent = res ? res.err : "Not allowed."; return; }
  if (online()) net.send({ t: "play", pl });
  lastNote();
  afterMove();
});
$("passBtn").addEventListener("click", () => {
  if (!myTurn()) return;
  recall();
  pass(S);
  if (online()) net.send({ t: "pass" });
  lastNote();
  afterMove();
});
$("swapBtn").addEventListener("click", () => {
  if (!myTurn()) return;
  if (!swapMode) { recall(); swapMode = true; marks = new Set(); render(); return; }
  if (!marks.size) { swapMode = false; render(); return; }
  const idx = [...marks];
  const res = exchange(S, idx);
  if (!res) { swapMode = false; render(); return; }
  if (online()) net.send({ t: "swap", idx });
  lastNote();
  afterMove();
});
$("hintBtn").addEventListener("click", () => {
  if (!myTurn()) return;
  recall();
  const m = chooseMove(S, dict, "hard");
  if (!m) { previewEl.textContent = "No word found. Try swapping tiles."; return; }
  m.pl.forEach((p) => {
    const ri = rackView.findIndex((r) => !r.used && r.tile === p.tile);
    if (ri < 0) return;
    rackView[ri].used = true;
    staged.push({ i: p.i, ri, tile: p.tile, as: p.as });
  });
  hinted = staged.map((s) => s.i);
  render();
  setStatus("A hint: press Play word to use it, or take the tiles back.");
});

/* ---------- the end ---------- */
function showEnd() {
  const title = S.winner === -2 ? "It's a tie!" : cpu() ? (S.winner === 0 ? "You win! 🎉" : "The computer wins.") : online() ? (S.winner === myP ? "You win! 🎉" : "Your friend wins.") : `${nameOf(S.winner)} wins! 🎉`;
  $("endTitle").textContent = title;
  $("endBody").innerHTML = S.scores.map((v, p) => `<div class="row${S.winner === p ? " win" : ""}"><span>${nameOf(p)}</span><span>${v}${S.leftover && S.leftover[p] ? ` <small>(−${S.leftover[p]} left over)</small>` : ""}</span></div>`).join("");
  $("endAgain").hidden = online();
  $("end").hidden = false;
  $("endAgain").focus();
}
$("endAgain").addEventListener("click", () => startGame());

dictReady.then(() => { setStatus("Ready."); if (!online()) startGame(); });

// invite link (?room=CODE): jump straight into online mode and join
const invited = net.roomParam();
if (invited) {
  $("mode").querySelector('[data-value="online"]').click();
  net.join(invited);
}
