// Jigsaw Puzzles: pictures from the Zone 210 games, cut into real jigsaw shapes (12 to 96 pieces).
// Drag a piece near its place and it snaps in. Ghost picture and "edges first" helpers; an online race where
// both friends get the same picture and the same cut.
import { GAMES } from "../../assets/games.js";
import { createOnline } from "../../assets/online.js";

const $ = (id) => document.getElementById(id);
const store = {
  get(key, fallback) { try { const raw = localStorage.getItem(key); return raw === null ? fallback : JSON.parse(raw); } catch (err) { return fallback; } },
  set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (err) { /* private mode */ } },
};
const KEY = "zone210_jigsaw";
const saved = { size: 24, ghost: true, edges: false, muted: false, done: {}, players: "1", ...store.get(KEY, {}) };
const save = () => store.set(KEY, saved);
const SIZES = { 12: [4, 3], 24: [6, 4], 48: [8, 6], 96: [12, 8] };
const PICS = GAMES.filter((g) => g.id !== "home").map((g) => ({ id: g.id, title: g.title }));
const online = () => saved.players === "online";

const seeded = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };

// ---------- sounds ----------
function tone(freqs, type = "sine", vol = 0.14) {
  if (saved.muted) return;
  const ac = window.z210Audio && window.z210Audio.get();
  if (!ac) return;
  freqs.forEach((f, i) => { const o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.value = f; const t = ac.currentTime + i * 0.08; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.24); o.connect(g).connect(ac.destination); o.start(t); o.stop(t + 0.26); });
}
const snap = () => tone([900, 1300], "triangle", 0.09);
const win = () => tone([523, 659, 784, 1047, 1319]);

// ---------- state ----------
let J = null; // { pic, img, cols, rows, seed, pieces: [{ r, c, x, y, placed, el }], edgesH, edgesV, started, moves }
let myRole = 0, friend = 0;
const table = $("table");

// ---------- online race ----------
const net = createOnline({
  container: document.querySelector(".g-page"),
  before: $("stats"),
  prefix: "zone210-jigsaw-",
  names: ["Player 1", "Player 2"],
  startInfo: () => ({ pic: saved.pic || PICS[0].id, size: saved.size }),
  onStart: ({ role, seed, info }) => {
    myRole = role; friend = 0;
    if (info && SIZES[info.size]) { saved.size = info.size; syncChips(); }
    start(info && info.pic ? info.pic : saved.pic, seed);
  },
  onData: (m) => { if (m && Number.isInteger(m.n)) { friend = m.n; stats(); if (m.done && J && !J.over) lose(); } },
  onLeft: () => setStatus("Your friend left the game."),
});

// ---------- cutting the picture ----------
function cut(cols, rows, rnd) {
  // each inside edge gets a tab that sticks out one way or the other
  const H = Array.from({ length: rows + 1 }, (_, r) => Array.from({ length: cols }, () => (r === 0 || r === rows ? 0 : rnd() < 0.5 ? 1 : -1)));
  const V = Array.from({ length: rows }, () => Array.from({ length: cols + 1 }, (_, c) => (c === 0 || c === cols ? 0 : rnd() < 0.5 ? 1 : -1)));
  return { H, V };
}
function edge(ctx, x1, y1, x2, y2, s) {
  if (!s) { ctx.lineTo(x2, y2); return; }
  const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy);
  const nx = (-dy / len) * s, ny = (dx / len) * s; // which side the tab sticks out
  const P = (t, n) => [x1 + dx * t + nx * len * n, y1 + dy * t + ny * len * n];
  ctx.lineTo(...P(0.36, 0));
  ctx.bezierCurveTo(...P(0.40, 0.02), ...P(0.31, 0.24), ...P(0.5, 0.24));
  ctx.bezierCurveTo(...P(0.69, 0.24), ...P(0.60, 0.02), ...P(0.64, 0));
  ctx.lineTo(x2, y2);
}
function piecePath(ctx, p, w, h, m) {
  const { H, V } = J.edges;
  ctx.beginPath();
  ctx.moveTo(m, m);
  // a shared edge bulges the same way for both pieces: a tab on one is the socket on the other.
  // (The edges are drawn clockwise, so the bottom and left edges run backwards and take the opposite sign.)
  edge(ctx, m, m, m + w, m, -H[p.r][p.c]);            // top
  edge(ctx, m + w, m, m + w, m + h, -V[p.r][p.c + 1]); // right
  edge(ctx, m + w, m + h, m, m + h, H[p.r + 1][p.c]);  // bottom
  edge(ctx, m, m + h, m, m, V[p.r][p.c]);             // left
  ctx.closePath();
}

// ---------- layout ----------
let L = null; // board and piece sizes in pixels for the current table size
function layout() {
  const W = table.clientWidth;
  const phone = W < 640;
  const bw = Math.min(W - (phone ? 8 : 40), 880);
  const bh = bw * (J.img.naturalHeight / J.img.naturalWidth);
  const pw = bw / J.cols, ph = bh / J.rows, m = Math.min(pw, ph) * 0.28;
  const trayH = Math.max(bh * (phone ? 1.25 : 0.9), 220);
  L = { W, bw, bh, pw, ph, m, bx: (W - bw) / 2, by: 10, trayY: bh + 30, trayH };
  table.style.height = `${L.trayY + trayH}px`;
  const board = $("board");
  Object.assign(board.style, { left: `${L.bx}px`, top: `${L.by}px`, width: `${bw}px`, height: `${bh}px` });
  board.style.backgroundImage = `url(${J.img.src})`;
  board.classList.toggle("ghost", saved.ghost);
}
function drawPiece(p) {
  const { pw, ph, m } = L;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const cw = pw + 2 * m, chh = ph + 2 * m;
  const cv = p.el;
  cv.width = Math.round(cw * dpr); cv.height = Math.round(chh * dpr);
  cv.style.width = `${cw}px`; cv.style.height = `${chh}px`;
  const ctx = cv.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.save();
  piecePath(ctx, p, pw, ph, m);
  ctx.clip();
  const sx = J.img.naturalWidth / L.bw, sy = J.img.naturalHeight / L.bh;
  ctx.drawImage(J.img, (p.c * pw - m) * sx, (p.r * ph - m) * sy, cw * sx, chh * sy, 0, 0, cw, chh);
  ctx.restore();
  piecePath(ctx, p, pw, ph, m);
  ctx.lineWidth = 1.2; ctx.strokeStyle = "rgba(255,255,255,0.55)"; ctx.stroke();
}
function place(p) {
  // where the piece's top-left (including its tab margin) sits on the table
  const x = p.placed ? L.bx + p.c * L.pw - L.m : p.x * (L.W - L.pw - 2 * L.m);
  const y = p.placed ? L.by + p.r * L.ph - L.m : L.trayY + p.y * Math.max(10, L.trayH - L.ph - 2 * L.m);
  p.el.style.transform = `translate(${x}px, ${y}px)`;
  p.px = x; p.py = y;
}
function relayout() {
  if (!J) return;
  layout();
  J.pieces.forEach((p) => { drawPiece(p); place(p); });
  filterEdges();
}
let resizeT = 0;
window.addEventListener("resize", () => { clearTimeout(resizeT); resizeT = setTimeout(relayout, 150); });

// ---------- start a puzzle ----------
function start(picId, seed) {
  const pic = PICS.find((p) => p.id === picId) || PICS[Math.floor(Math.random() * PICS.length)];
  saved.pic = pic.id; save();
  const [cols, rows] = SIZES[saved.size] || SIZES[24];
  const rnd = seeded(seed);
  const img = new Image();
  img.onload = () => {
    table.querySelectorAll("canvas.pc").forEach((c) => c.remove());
    table.classList.remove("complete");
    J = { pic, img, cols, rows, seed, edges: cut(cols, rows, rnd), pieces: [], started: Date.now(), moves: 0, over: false };
    for (let r = 0; r < rows; r += 1) for (let c = 0; c < cols; c += 1) {
      const el = document.createElement("canvas");
      el.className = "pc";
      el.tabIndex = 0;
      el.setAttribute("role", "button");
      el.setAttribute("aria-label", `Piece from row ${r + 1}, column ${c + 1}. Press Enter to put it in its place.`);
      J.pieces.push({ r, c, x: rnd(), y: rnd(), placed: false, el });
      table.appendChild(el);
    }
    J.pieces.forEach((p, i) => { p.el.dataset.i = i; });
    relayout();
    $("title").textContent = `${pic.title} · ${cols * rows} pieces`;
    $("result").hidden = true;
    stats();
    setStatus(online() && !net.active ? "Create or join a room to race a friend." : "Drag each piece to its place. Edge pieces are a good place to start!");
  };
  img.src = `../../assets/thumbs/${pic.id}.jpg`;
}
const placedCount = () => (J ? J.pieces.filter((p) => p.placed).length : 0);
const clock = (t) => `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
function stats() {
  if (!J) return;
  const t = Math.floor((Date.now() - J.started) / 1000);
  $("stats").innerHTML = `<div class="g-stat"><span>Placed</span><b>${placedCount()} of ${J.pieces.length}</b></div>${online() ? `<div class="g-stat"><span>Friend</span><b>${friend} of ${J.pieces.length}</b></div>` : `<div class="g-stat"><span>Moves</span><b>${J.moves}</b></div>`}<div class="g-stat"><span>Time</span><b>${clock(t)}</b></div>`;
}
setInterval(() => { if (J && !J.over) stats(); }, 1000);
const setStatus = (t) => { $("status").textContent = t; };
function filterEdges() {
  if (!J) return;
  J.pieces.forEach((p) => { const edgeP = p.r === 0 || p.c === 0 || p.r === J.rows - 1 || p.c === J.cols - 1; p.el.hidden = saved.edges && !edgeP && !p.placed; });
}

// ---------- dragging ----------
let drag = null, zTop = 10;
const opaqueAt = (cv, x, y) => {
  const r = cv.getBoundingClientRect();
  const px = Math.floor(((x - r.left) / r.width) * cv.width), py = Math.floor(((y - r.top) / r.height) * cv.height);
  try { return cv.getContext("2d").getImageData(px, py, 1, 1).data[3] > 20; } catch (err) { return true; }
};
table.addEventListener("pointerdown", (e) => {
  if (!J || J.over || (online() && !net.active)) return;
  // the top piece whose picture (not its see-through corners) is under the finger
  const cv = document.elementsFromPoint(e.clientX, e.clientY).find((el) => el.classList && el.classList.contains("pc") && !el.hidden && opaqueAt(el, e.clientX, e.clientY));
  if (!cv) return;
  const p = J.pieces[Number(cv.dataset.i)];
  if (p.placed) return;
  e.preventDefault();
  try { table.setPointerCapture(e.pointerId); } catch (err) { /* synthetic */ }
  cv.style.zIndex = ++zTop;
  cv.classList.add("lift");
  const tr = table.getBoundingClientRect();
  drag = { p, id: e.pointerId, ox: e.clientX - tr.left - p.px, oy: e.clientY - tr.top - p.py };
});
table.addEventListener("pointermove", (e) => {
  if (!drag || drag.id !== e.pointerId) return;
  const tr = table.getBoundingClientRect();
  const x = Math.min(L.W - 20, Math.max(-L.pw / 2, e.clientX - tr.left - drag.ox));
  const y = Math.min(table.clientHeight - 20, Math.max(-L.ph / 2, e.clientY - tr.top - drag.oy));
  drag.p.el.style.transform = `translate(${x}px, ${y}px)`;
  drag.p.px = x; drag.p.py = y;
});
const drop = (e) => {
  if (!drag || drag.id !== e.pointerId) return;
  const p = drag.p;
  drag = null;
  p.el.classList.remove("lift");
  J.moves += 1;
  const tx = L.bx + p.c * L.pw - L.m, ty = L.by + p.r * L.ph - L.m;
  if (Math.hypot(p.px - tx, p.py - ty) < Math.min(L.pw, L.ph) * 0.32) settle(p);
  else {
    // remember where it was left on the table
    p.x = Math.max(0, Math.min(1, p.px / Math.max(1, L.W - L.pw - 2 * L.m)));
    p.y = Math.max(-2, Math.min(1, (p.py - L.trayY) / Math.max(10, L.trayH - L.ph - 2 * L.m)));
  }
  stats();
};
table.addEventListener("pointerup", drop);
table.addEventListener("pointercancel", drop);
// keyboard (and a helping hand): Enter puts the focused piece in its place
table.addEventListener("keydown", (e) => {
  if ((e.key === "Enter" || e.key === " ") && e.target.classList.contains("pc")) {
    e.preventDefault();
    const p = J.pieces[Number(e.target.dataset.i)];
    if (!p.placed) { J.moves += 1; settle(p); stats(); }
  }
});
function settle(p) {
  p.placed = true;
  p.el.classList.add("placed");
  p.el.style.zIndex = 1;
  p.el.tabIndex = -1;
  place(p);
  snap();
  if (online()) net.send({ n: placedCount() });
  filterEdges();
  if (placedCount() === J.pieces.length) done();
  else if (saved.edges && J.pieces.filter((q) => !q.placed && (q.r === 0 || q.c === 0 || q.r === J.rows - 1 || q.c === J.cols - 1)).length === 0) { saved.edges = false; save(); syncChips(); filterEdges(); setStatus("All the edges are done! Now the middle."); }
}
function done() {
  J.over = true;
  win();
  const t = Math.floor((Date.now() - J.started) / 1000);
  stats();
  const k = `${J.pic.id}-${J.pieces.length}`;
  if (!saved.done[k] || t < saved.done[k]) saved.done[k] = t;
  save();
  if (online()) { net.send({ n: J.pieces.length, done: true }); net.setOver(true); }
  $("resTitle").textContent = online() ? "You finished first! 🏆" : "Puzzle complete! 🎉";
  $("resText").textContent = `${J.pieces.length} pieces in ${clock(t)} with ${J.moves} moves. Best for this one: ${clock(saved.done[k])}.`;
  $("result").hidden = false;
  table.classList.add("finished", "complete"); // the pieces fade into the whole, seamless picture
  setTimeout(() => table.classList.remove("finished"), 1600);
  setStatus("Puzzle complete!");
}
function lose() {
  J.over = true;
  net.setOver(true);
  $("resTitle").textContent = "Your friend finished first!";
  $("resText").textContent = `You placed ${placedCount()} of ${J.pieces.length}. Rematch?`;
  $("result").hidden = false;
}

// ---------- picture chooser and options ----------
function gallery() {
  const g = $("gallery");
  g.innerHTML = PICS.map((p) => { const k = Object.keys(saved.done).some((x) => x.startsWith(`${p.id}-`)); return `<button class="pick" data-id="${p.id}" aria-label="${p.title}${k ? ", done" : ""}"><img src="../../assets/thumbs/${p.id}.jpg" alt="" loading="lazy"><span>${p.title}${k ? " ✓" : ""}</span></button>`; }).join("");
}
$("gallery").addEventListener("click", (e) => {
  const b = e.target.closest(".pick");
  if (!b) return;
  saved.pic = b.dataset.id; save();
  $("chooser").open = false;
  if (online()) { if (net.active && myRole === 0) net.rematch(); } else start(saved.pic, (Math.random() * 4294967296) >>> 0);
  table.scrollIntoView({ behavior: "smooth", block: "start" });
});
function syncChips() {
  document.querySelectorAll("#size .g-chip").forEach((b) => b.setAttribute("aria-pressed", String(Number(b.dataset.value) === saved.size)));
  document.querySelectorAll("#players .g-chip").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.value === saved.players)));
  $("ghost").setAttribute("aria-pressed", String(saved.ghost));
  $("edges").setAttribute("aria-pressed", String(saved.edges));
  $("mute").textContent = saved.muted ? "🔇 Sound off" : "🔊 Sound on";
}
$("size").addEventListener("click", (e) => {
  const b = e.target.closest(".g-chip");
  if (!b || (online() && net.active && myRole !== 0)) return;
  saved.size = Number(b.dataset.value); save(); syncChips();
  if (online()) { if (net.active) net.rematch(); } else start(saved.pic, (Math.random() * 4294967296) >>> 0);
});
$("players").addEventListener("click", (e) => {
  const b = e.target.closest(".g-chip");
  if (!b) return;
  saved.players = b.dataset.value; save(); syncChips();
  if (online()) net.open(); else net.close();
  start(saved.pic, (Math.random() * 4294967296) >>> 0);
});
$("ghost").addEventListener("click", () => { saved.ghost = !saved.ghost; save(); syncChips(); $("board").classList.toggle("ghost", saved.ghost); });
$("edges").addEventListener("click", () => { saved.edges = !saved.edges; save(); syncChips(); filterEdges(); });
$("mute").addEventListener("click", () => { saved.muted = !saved.muted; save(); syncChips(); });
$("again").addEventListener("click", () => { if (online()) net.rematch(); else start(PICS[Math.floor(Math.random() * PICS.length)].id, (Math.random() * 4294967296) >>> 0); });
$("shuffle").addEventListener("click", () => { if (!online()) start(saved.pic, (Math.random() * 4294967296) >>> 0); });

const invited = net.roomParam();
if (invited) saved.players = "online";
if (!SIZES[saved.size]) saved.size = 24;
syncChips();
gallery();
start(saved.pic, (Math.random() * 4294967296) >>> 0);
if (online()) { net.open(); if (invited) net.join(invited); }
window.__jig = { get J() { return J; }, settle, start };
