import { createOnline } from "../../assets/online.js";
import { W, H, GROUND, SLING, MATERIALS, BIRDS, WORLDS, LEVELS, duelFort, DUEL_SLING, makeBuilder, impactDamage } from "./levels.js";

const Matter = window.Matter;
const { Engine, Bodies, Body, Composite, Events } = Matter;
const $ = (id) => document.getElementById(id);
const cv = $("cv");
const ctx = cv.getContext("2d");
const STEP = 1000 / 60;
const PULL_MAX = 150;
const POWER = 0.13;
const GRAV = 0.2778; // px per step per step, Matter's default gravity at 60 steps a second
const BIRD_COLORS = { kweku: "#e5484d", ama: "#3b82f6", kofi: "#f5c518", nana: "#2a2533" };
const saverOn = () => !!(window.z210Saver && window.z210Saver.on);

/* ---------------------------------------------------------------- progress */
const SAVE_KEY = "zone210_mango";
let prog = { stars: [], best: [] };
try { prog = { ...prog, ...JSON.parse(localStorage.getItem(SAVE_KEY)) }; } catch (err) { /* storage unavailable */ }
const saveProg = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(prog)); } catch (err) { /* private mode */ } };
const unlocked = (i) => i === 0 || (prog.stars[i - 1] || 0) > 0;

/* ---------------------------------------------------------------- sound */
let soundOn = true;
try { soundOn = localStorage.getItem("zone210_mango_snd") !== "off"; } catch (err) { /* ignore */ }
let noiseBuf = null;
function audio() { return soundOn && window.z210Audio ? window.z210Audio.get() : null; }
function noise(c) {
  if (noiseBuf && noiseBuf.sampleRate === c.sampleRate) return noiseBuf;
  noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i += 1) d[i] = Math.random() * 2 - 1;
  return noiseBuf;
}
function env(c, t, peak, a, d) {
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  g.connect(c.destination);
  return g;
}
function tone(f0, f1, dur, type = "sine", vol = 0.1, at = 0) {
  const c = audio();
  if (!c) return;
  const t = c.currentTime + at;
  const o = c.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  o.connect(env(c, t, vol, 0.01, dur));
  o.start(t);
  o.stop(t + dur + 0.05);
}
function hiss(freq, q, dur, vol, type = "bandpass", at = 0) {
  const c = audio();
  if (!c) return;
  const t = c.currentTime + at;
  const s = c.createBufferSource();
  s.buffer = noise(c);
  const f = c.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  s.connect(f);
  f.connect(env(c, t, vol, 0.004, dur));
  s.start(t, Math.random() * 0.5);
  s.stop(t + dur + 0.05);
}
let lastStretch = 0;
const sfx = {
  stretch(k) { const now = performance.now(); if (now - lastStretch < 90) return; lastStretch = now; tone(180 + k * 220, 200 + k * 240, 0.07, "triangle", 0.03); },
  launch() { hiss(900, 0.8, 0.35, 0.25); tone(500, 160, 0.25, "triangle", 0.06); },
  thud(v) { hiss(260, 1, 0.12, Math.min(0.35, 0.05 + v * 0.02), "lowpass"); },
  crack(mat) {
    if (mat === "stone") { hiss(700, 1.2, 0.22, 0.3); tone(140, 70, 0.2, "square", 0.05); }
    else if (mat === "clay") { hiss(3200, 1.5, 0.18, 0.28); hiss(5200, 2, 0.12, 0.18, "bandpass", 0.04); }
    else { hiss(1400, 1.4, 0.16, 0.28); tone(260, 120, 0.12, "sawtooth", 0.04); }
  },
  monkey() { tone(520, 760, 0.12, "square", 0.05); tone(760, 380, 0.22, "square", 0.05, 0.12); },
  power() { tone(600, 1200, 0.18, "triangle", 0.08); },
  win() { [523, 659, 784, 1046].forEach((f, i) => tone(f, f, 0.22, "triangle", 0.1, i * 0.12)); },
  lose() { [392, 330, 262].forEach((f, i) => tone(f, f * 0.98, 0.3, "triangle", 0.08, i * 0.16)); },
};
function paintSound() { $("snd").textContent = soundOn ? "🔊" : "🔇"; $("snd").setAttribute("aria-pressed", String(soundOn)); $("snd").title = soundOn ? "Sound on" : "Sound off"; }
$("snd").addEventListener("click", () => { soundOn = !soundOn; try { localStorage.setItem("zone210_mango_snd", soundOn ? "on" : "off"); } catch (err) { /* ignore */ } paintSound(); });
paintSound();

/* ---------------------------------------------------------------- the game state */
const opts = { mode: "adventure", cpu: "normal" };
let G = null;
let myRole = 0;
const isDuel = () => opts.mode !== "adventure";
const online = () => opts.mode === "online";
const setStatus = (t) => { $("status").textContent = t; };

function makeEngine() {
  const engine = Engine.create({ enableSleeping: true, positionIterations: 10, velocityIterations: 8 });
  Composite.add(engine.world, Bodies.rectangle(W / 2, GROUND + 60, W * 3, 120, { isStatic: true, friction: 1, label: "ground" }));
  Events.on(engine, "collisionStart", onCollide);
  return engine;
}
function freshState(extra) {
  const engine = makeEngine();
  const st = { engine, bodies: [], birds: [], particles: [], popups: [], toRemove: [], phase: "aim", score: 0, steps: 0, drag: null, shot: null, settle: 0, settleSteps: 0, birdId: 0, pendingTap: -1, ...extra };
  st.builder = makeBuilder(Matter, engine.world, (b) => st.bodies.push(b));
  return st;
}

function startAdventure(i) {
  const lv = LEVELS[i];
  G = freshState({ duel: false, level: i, theme: WORLDS[lv.world], queue: lv.birds.slice(), slings: [SLING], turn: 0, total: lv.birds.length });
  lv.build(G.builder);
  G.current = G.queue.shift();
  hideOverlays();
  $("picker").hidden = true;
  setStatus(`Level ${i + 1}: ${G.theme.name}. ${BIRDS[G.current].tip}`);
  settleNow();
  moveCamera(true);
}
function startDuel() {
  G = freshState({ duel: true, theme: WORLDS[2], slings: DUEL_SLING, turn: 0, choice: ["kweku", "kweku"], over: false, winner: -1 });
  duelFort(G.builder, -1);
  duelFort(G.builder, 1);
  G.current = G.choice[0];
  hideOverlays();
  $("picker").hidden = false;
  if (online() && myRole !== 0) G.phase = "wait";
  drawPicker();
  settleNow();
  moveCamera(true);
  turnMessage();
}
// let new structures come to rest before anyone fires
function settleNow() {
  for (let i = 0; i < 90; i += 1) Engine.update(G.engine, STEP);
  G.bodies.forEach((b) => { if (b.plugin.hp !== undefined) b.plugin.hp = b.plugin.max; });
}

/* ---------------------------------------------------------------- damage */
function onCollide(e) {
  if (!G) return;
  e.pairs.forEach((p) => {
    const [da, db] = impactDamage(p);
    hurt(p.bodyA, da);
    hurt(p.bodyB, db);
    const birdHit = (p.bodyA.plugin && p.bodyA.plugin.kind === "bird") || (p.bodyB.plugin && p.bodyB.plugin.kind === "bird");
    if (birdHit && (da > 20 || db > 20)) sfx.thud(Math.max(da, db) / 40);
  });
}
function hurt(b, d) {
  if (!b.plugin || b.plugin.hp === undefined || b.plugin.dead || d <= 0) return;
  b.plugin.hp -= d;
  if (b.plugin.hp <= 0) kill(b, true);
}
function kill(b, scored) {
  if (b.plugin.dead) return;
  b.plugin.dead = true;
  G.toRemove.push(b);
  const { x, y } = b.position;
  if (b.plugin.kind === "monkey") {
    if (scored) addScore(5000, x, y);
    sfx.monkey();
    burst(x, y, ["#8a5a33", "#c48a5a", "#ffb02e"], 14, 6);
    G.popups.push({ x, y: y - 10, text: "🥭", life: 70, big: true });
  } else if (b.plugin.kind === "block") {
    if (scored) addScore(MATERIALS[b.plugin.mat].score, x, y);
    sfx.crack(b.plugin.mat);
    const col = { wood: ["#c08a4a", "#8a5a2b"], stone: ["#9a98a8", "#6c6a7a"], clay: ["#d0703c", "#a4492a"] }[b.plugin.mat];
    burst(x, y, col, saverOn() ? 5 : 11, 5);
  }
}
function addScore(n, x, y) { G.score += n; G.popups.push({ x, y, text: String(n), life: 60 }); }
function burst(x, y, colors, n, speed) {
  for (let i = 0; i < n; i += 1) {
    const a = Math.random() * Math.PI * 2;
    const s = speed * (0.4 + Math.random());
    G.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 3, life: 40 + Math.random() * 25, c: colors[i % colors.length], r: 3 + Math.random() * 6, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4 });
  }
}

/* ---------------------------------------------------------------- firing */
function sling() { return G.slings[G.duel ? G.turn : 0]; }
function launch(kind, vx, vy, idx) {
  const s = G.slings[idx];
  const B = BIRDS[kind];
  const body = Bodies.circle(s.x, s.y, B.r, { density: B.density, frictionAir: 0.003, restitution: 0.35, friction: 0.6, sleepThreshold: 50 });
  body.plugin = { kind: "bird", bird: kind, r: B.r, id: `b${(G.birdId += 1)}` };
  Composite.add(G.engine.world, body);
  Body.setVelocity(body, { x: vx, y: vy });
  G.shot = { kind, used: false, steps: 0, birds: [body] };
  G.birds.push(body);
  G.phase = "flying";
  G.current = null;
  G.drag = null;
  sfx.launch();
}
function useAbility(fromNet) {
  const sh = G.shot;
  if (!sh || sh.used || G.phase !== "flying") return;
  const b = sh.birds[0];
  if (!b || b.plugin.dead) return;
  const power = BIRDS[sh.kind].power;
  if (power === "none") return;
  sh.used = true;
  const v = b.velocity;
  if (power === "split") {
    [-0.22, 0.22].forEach((da) => {
      const sp = Math.hypot(v.x, v.y);
      const a = Math.atan2(v.y, v.x) + da;
      const nb = Bodies.circle(b.position.x, b.position.y, 18, { density: 0.0038, frictionAir: 0.003, restitution: 0.35, friction: 0.6, sleepThreshold: 50 });
      nb.plugin = { kind: "bird", bird: "ama", r: 18, id: `b${(G.birdId += 1)}` };
      Composite.add(G.engine.world, nb);
      Body.setVelocity(nb, { x: Math.cos(a) * sp, y: Math.sin(a) * sp });
      sh.birds.push(nb);
      G.birds.push(nb);
    });
  } else if (power === "dash") {
    const sp = Math.hypot(v.x, v.y) || 1;
    const k = Math.max(sp * 1.7, 21) / sp;
    Body.setVelocity(b, { x: v.x * k, y: v.y * k });
  } else if (power === "dive") {
    Body.setVelocity(b, { x: v.x * 0.15, y: 22 });
  }
  burst(b.position.x, b.position.y, ["#fff", "#ffe08a"], 8, 4);
  sfx.power();
  if (online() && !fromNet) net.send({ t: "tap", s: sh.steps });
}
const canAim = () => G && G.phase === "aim" && !G.over && G.current && (!G.duel || opts.mode === "two" || (opts.mode === "cpu" && G.turn === 0) || (online() && net.active && G.turn === myRole));

function toWorld(e) {
  const r = cv.getBoundingClientRect();
  const ch = (cam.w * 9) / 16;
  return { x: cam.x + ((e.clientX - r.left) / r.width) * cam.w, y: cam.y + ((e.clientY - r.top) / r.height) * ch };
}
cv.addEventListener("pointerdown", (e) => {
  if (!G) return;
  const p = toWorld(e);
  if (G.phase === "flying" && G.shot && !G.shot.used && (!G.duel || opts.mode === "two" || (opts.mode === "cpu" && G.turn === 0) || (online() && G.turn === myRole))) { useAbility(false); return; }
  if (!canAim()) return;
  const s = sling();
  const near = Math.hypot(p.x - s.x, p.y - s.y) < 170 || (s.x < W / 2 ? p.x < cam.x + cam.w * 0.35 : p.x > cam.x + cam.w * 0.65);
  if (!near) return;
  e.preventDefault();
  try { cv.setPointerCapture(e.pointerId); } catch (err) { /* synthetic */ }
  G.drag = { id: e.pointerId, pull: { x: 0, y: 0 } };
  updatePull(p);
});
function updatePull(p) {
  const s = sling();
  let dx = p.x - s.x;
  let dy = p.y - s.y;
  const len = Math.hypot(dx, dy);
  if (len > PULL_MAX) { dx = (dx / len) * PULL_MAX; dy = (dy / len) * PULL_MAX; }
  G.drag.pull = { x: dx, y: dy };
  sfx.stretch(Math.min(1, len / PULL_MAX));
}
cv.addEventListener("pointermove", (e) => { if (G && G.drag && G.drag.id === e.pointerId) updatePull(toWorld(e)); });
const release = (e) => {
  if (!G || !G.drag || G.drag.id !== e.pointerId) return;
  const { pull } = G.drag;
  if (Math.hypot(pull.x, pull.y) < 24) { G.drag = null; return; }
  const vx = -pull.x * POWER;
  const vy = -pull.y * POWER;
  const kind = G.current;
  const idx = G.duel ? G.turn : 0;
  launch(kind, vx, vy, idx);
  if (online()) net.send({ t: "shot", k: kind, vx, vy });
};
cv.addEventListener("pointerup", release);
cv.addEventListener("pointercancel", (e) => { if (G && G.drag && G.drag.id === e.pointerId) G.drag = null; });

/* ---------------------------------------------------------------- the computer's shot (duel) */
function cpuShot() {
  if (!G || !G.duel || G.over || G.turn !== 1 || G.phase !== "aim") return;
  const targets = G.bodies.filter((b) => b.plugin.kind === "monkey" && !b.plugin.dead && b.position.x < W / 2);
  if (!targets.length) return;
  const tgt = targets[Math.floor(Math.random() * targets.length)];
  const kind = opts.cpu === "easy" ? "kweku" : ["kweku", "nana", "ama", "kofi"][Math.floor(Math.random() * 4)];
  const s = G.slings[1];
  let best = null;
  for (let ang = 12; ang <= 72; ang += 1) for (let pw = 0.55; pw <= 1.001; pw += 0.025) {
    const v = PULL_MAX * POWER * pw;
    let x = s.x, y = s.y, vx = -v * Math.cos((ang * Math.PI) / 180), vy = -v * Math.sin((ang * Math.PI) / 180);
    let err = Infinity;
    for (let k = 0; k < 400; k += 1) {
      vx *= 0.997; vy = vy * 0.997 + GRAV; x += vx; y += vy;
      if (x <= tgt.position.x) { err = Math.abs(y - tgt.position.y); break; }
      if (y > GROUND) break;
    }
    if (err < (best ? best.err : Infinity)) best = { err, ang, pw };
  }
  if (!best) return;
  const noise = { easy: 9, normal: 4, hard: 1.5 }[opts.cpu];
  const ang = best.ang + (Math.random() - 0.5) * 2 * noise;
  const pw = Math.min(1, Math.max(0.4, best.pw + (Math.random() - 0.5) * noise * 0.012));
  const v = PULL_MAX * POWER * pw;
  const vx = -v * Math.cos((ang * Math.PI) / 180);
  const vy = -v * Math.sin((ang * Math.PI) / 180);
  G.current = kind;
  G.choice[1] = kind;
  // show the pull for a moment, then let go
  G.drag = { id: "cpu", pull: { x: -vx / POWER, y: -vy / POWER } };
  setTimeout(() => {
    if (!G || G.turn !== 1 || G.phase !== "aim") return;
    launch(kind, vx, vy, 1);
    if (BIRDS[kind].power !== "none" && opts.cpu !== "easy") setTimeout(() => { if (G && G.shot && G.turn === 1) useAbility(false); }, 650 + Math.random() * 300);
  }, 750);
}

/* ---------------------------------------------------------------- turns and settling */
function step() {
  if (!G) return;
  Engine.update(G.engine, STEP);
  G.steps += 1;
  if (G.toRemove.length) { G.toRemove.forEach((b) => Composite.remove(G.engine.world, b)); G.toRemove = []; }
  // out of bounds
  G.bodies.forEach((b) => {
    if (b.plugin.dead || b.isStatic) return;
    if (b.position.x < -80 || b.position.x > W + 80 || b.position.y > H + 80) kill(b, b.plugin.kind === "monkey");
  });
  if (G.phase === "flying") {
    const sh = G.shot;
    sh.steps += 1;
    if (G.pendingTap >= 0 && sh.steps >= G.pendingTap) { G.pendingTap = -1; useAbility(true); }
    const flying = sh.birds.some((b) => !b.isSleeping && b.position.x > -60 && b.position.x < W + 60 && b.position.y < H + 60 && Math.hypot(b.velocity.x, b.velocity.y) > 0.6);
    if (!flying || sh.steps > 720) { G.phase = "settling"; G.settle = 0; G.settleSteps = 0; }
  } else if (G.phase === "settling") {
    G.settleSteps += 1;
    const moving = G.bodies.some((b) => !b.plugin.dead && !b.isStatic && !b.isSleeping && (Math.hypot(b.velocity.x, b.velocity.y) > 0.25 || Math.abs(b.angularVelocity) > 0.01));
    G.settle = moving ? 0 : G.settle + 1;
    if (G.settle > 36 || G.settleSteps > 360) endShot();
  }
  // particles and popups
  G.particles.forEach((p) => { p.x += p.vx; p.y += p.vy; p.vy += 0.3; p.rot += p.vr; p.life -= 1; });
  G.particles = G.particles.filter((p) => p.life > 0);
  G.popups.forEach((p) => { p.y -= 0.8; p.life -= 1; });
  G.popups = G.popups.filter((p) => p.life > 0);
}
const monkeysLeft = (side) => G.bodies.filter((b) => b.plugin.kind === "monkey" && !b.plugin.dead && (side === undefined || (side === 0 ? b.position.x < W / 2 : b.position.x >= W / 2))).length;

function endShot() {
  // clear away the birds that have landed
  G.birds.forEach((b) => Composite.remove(G.engine.world, b));
  G.birds = [];
  G.shot = null;
  if (!G.duel) {
    if (!monkeysLeft()) { win(); return; }
    if (!G.queue.length) { lose(); return; }
    G.current = G.queue.shift();
    G.phase = "aim";
    setStatus(`${BIRDS[G.current].name}: ${BIRDS[G.current].tip}`);
    return;
  }
  // duel
  const shooter = G.turn;
  if (online() && shooter !== myRole) { G.phase = "wait"; return; } // the shooter's side decides; wait for its result
  const mine = monkeysLeft(shooter);
  const theirs = monkeysLeft(1 - shooter);
  if (!theirs || !mine) { G.over = true; G.winner = !theirs ? shooter : 1 - shooter; }
  else G.turn = 1 - shooter;
  if (online()) net.send({ t: "state", s: snapshot() });
  afterTurn();
}
function afterTurn() {
  if (G.over) { duelOver(); return; }
  G.current = G.choice[G.turn];
  G.phase = online() && G.turn !== myRole ? "wait" : "aim";
  drawPicker();
  turnMessage();
  if (opts.mode === "cpu" && G.turn === 1) setTimeout(cpuShot, 700);
}
function turnMessage() {
  if (!G || !G.duel) return;
  const who = opts.mode === "cpu" ? (G.turn === 0 ? "Your turn (left fort)." : "The computer is aiming…") : online() ? (G.turn === myRole ? "Your turn! Pick a bird and fire." : "Your friend is aiming…") : `${G.turn === 0 ? "Left" : "Right"} fort's turn.`;
  setStatus(`${who} Monkeys left: left ${monkeysLeft(0)}, right ${monkeysLeft(1)}.`);
}

/* ---------------------------------------------------------------- online duel */
function snapshot() {
  return {
    turn: G.turn, over: G.over, winner: G.winner, choice: G.choice,
    bodies: G.bodies.filter((b) => !b.plugin.dead && !b.isStatic).map((b) => [b.plugin.id, +b.position.x.toFixed(1), +b.position.y.toFixed(1), +b.angle.toFixed(3), Math.round(b.plugin.hp)]),
  };
}
function applySnapshot(s) {
  const keep = new Map(s.bodies.map((r) => [r[0], r]));
  G.birds.forEach((b) => Composite.remove(G.engine.world, b));
  G.birds = [];
  G.shot = null;
  G.bodies.forEach((b) => {
    if (b.isStatic) return;
    const r = keep.get(b.plugin.id);
    if (!r) { if (!b.plugin.dead) { b.plugin.dead = true; Composite.remove(G.engine.world, b); } return; }
    if (b.plugin.dead) { b.plugin.dead = false; Composite.add(G.engine.world, b); }
    Body.setPosition(b, { x: r[1], y: r[2] });
    Body.setAngle(b, r[3]);
    Body.setVelocity(b, { x: 0, y: 0 });
    Body.setAngularVelocity(b, 0);
    b.plugin.hp = r[4];
  });
  G.turn = s.turn;
  G.over = s.over;
  G.winner = s.winner;
  if (s.choice) G.choice = s.choice;
}
const net = createOnline({
  container: document.querySelector(".g-page"),
  before: $("stage"),
  prefix: "zone210-mango-",
  names: ["Left fort", "Right fort"],
  onStart: ({ role }) => { myRole = role; startDuel(); },
  onData: (m) => {
    if (!online() || !G || !G.duel) return;
    if (m.t === "shot" && G.turn !== myRole && G.phase !== "flying") { G.pendingTap = -1; launch(m.k, m.vx, m.vy, G.turn); }
    else if (m.t === "tap" && G.shot) { if (G.shot.steps >= m.s) useAbility(true); else G.pendingTap = m.s; }
    else if (m.t === "pick" && G.turn !== myRole) { G.choice[G.turn] = m.k; G.current = m.k; }
    else if (m.t === "state") { applySnapshot(m.s); afterTurn(); if (G.over) net.setOver(true); }
  },
  onLeft: () => setStatus("Your friend left the game."),
  getState: () => (G && G.duel ? snapshot() : null),
  setState: (s) => { if (!s) return; startDuel(); applySnapshot(s); afterTurn(); },
});

/* ---------------------------------------------------------------- bird picker (duel) */
function drawPicker() {
  if (!G || !G.duel) return;
  const mine = opts.mode === "two" || (opts.mode === "cpu" && G.turn === 0) || (online() && G.turn === myRole);
  $("picker").innerHTML = Object.entries(BIRDS).map(([k, B]) => `<button class="g-chip" data-k="${k}" aria-pressed="${G.choice[G.turn] === k}" ${mine && G.phase === "aim" ? "" : "disabled"} title="${B.tip}"><span class="dot" style="background:${BIRD_COLORS[k]}"></span>${B.name}</button>`).join("");
}
$("picker").addEventListener("click", (e) => {
  const b = e.target.closest("[data-k]");
  if (!b || !G || !G.duel || G.phase !== "aim") return;
  G.choice[G.turn] = b.dataset.k;
  G.current = b.dataset.k;
  drawPicker();
  setStatus(`${BIRDS[b.dataset.k].name}: ${BIRDS[b.dataset.k].tip}`);
  if (online()) net.send({ t: "pick", k: b.dataset.k });
});

/* ---------------------------------------------------------------- win, lose and menus */
function hideOverlays() { $("menu").hidden = true; $("result").hidden = true; }
function win() {
  G.phase = "won";
  const left = G.queue.length + (G.current ? 1 : 0);
  if (left) addScore(left * 10000, SLING.x, SLING.y - 80);
  const stars = left >= 2 ? 3 : left === 1 ? 2 : 1;
  const i = G.level;
  prog.stars[i] = Math.max(prog.stars[i] || 0, stars);
  prog.best[i] = Math.max(prog.best[i] || 0, G.score);
  saveProg();
  sfx.win();
  const next = i + 1 < LEVELS.length;
  $("result").innerHTML = `<div class="card"><h2>🥭 Mangoes saved!</h2>
    <div class="stars" aria-label="${stars} stars">${[1, 2, 3].map((k) => `<span class="${k <= stars ? "" : "off"}">⭐</span>`).join("")}</div>
    <p>Score ${G.score.toLocaleString()}${left ? ` · ${left} bird${left === 1 ? "" : "s"} to spare` : ""} · Best ${prog.best[i].toLocaleString()}</p>
    <div class="row"><button class="g-btn ghost" data-act="retry">↻ Play again</button><button class="g-btn ghost" data-act="levels">☰ Levels</button>${next ? '<button class="g-btn" data-act="next">Next level ▶</button>' : ""}</div></div>`;
  $("result").hidden = false;
  setStatus(next ? "Level complete!" : "You finished every level! 🎉");
}
function lose() {
  G.phase = "lost";
  sfx.lose();
  $("result").innerHTML = `<div class="card"><h2>🐒 The monkeys kept the mangoes!</h2><p>Score ${G.score.toLocaleString()}. Try a different angle, or knock the towers over from below.</p>
    <div class="row"><button class="g-btn" data-act="retry">↻ Try again</button><button class="g-btn ghost" data-act="levels">☰ Levels</button></div></div>`;
  $("result").hidden = false;
  setStatus("Out of birds.");
}
function duelOver() {
  G.phase = "over";
  const w = G.winner;
  const title = opts.mode === "cpu" ? (w === 0 ? "🎉 You win the duel!" : "🤖 The computer wins!") : online() ? (w === myRole ? "🎉 You win the duel!" : "Your friend wins this time.") : `🎉 The ${w === 0 ? "left" : "right"} fort wins!`;
  if (opts.mode === "cpu" ? w === 0 : online() ? w === myRole : true) sfx.win(); else sfx.lose();
  $("result").innerHTML = `<div class="card"><h2>${title}</h2><p>All the other side's monkeys are knocked out.</p><div class="row">${online() ? "<p>Press Rematch above to play again.</p>" : '<button class="g-btn" data-act="duel">↻ New duel</button>'}</div></div>`;
  $("result").hidden = false;
  setStatus(title);
}
$("result").addEventListener("click", (e) => {
  const b = e.target.closest("[data-act]");
  if (!b) return;
  const a = b.dataset.act;
  if (a === "retry") startAdventure(G.level);
  else if (a === "next") startAdventure(G.level + 1);
  else if (a === "levels") showLevels();
  else if (a === "duel") startDuel();
});
function showLevels() {
  if (isDuel()) return;
  const parts = WORLDS.map((w, wi) => `<div class="world">${["🏘️", "🧺", "⛰️"][wi]} ${w.name}</div><div class="lvls">${LEVELS.map((l, i) => (l.world === wi ? `<button class="lv" data-i="${i}" ${unlocked(i) ? "" : "disabled"} aria-label="Level ${i + 1}${prog.stars[i] ? `, ${prog.stars[i]} stars` : ""}${unlocked(i) ? "" : ", locked"}">${unlocked(i) ? i + 1 : "🔒"}<small>${"⭐".repeat(prog.stars[i] || 0) || "&nbsp;"}</small></button>` : "")).join("")}</div>`).join("");
  const total = prog.stars.reduce((t, s) => t + (s || 0), 0);
  $("menu").innerHTML = `<div class="card"><h2>Choose a level</h2><p>⭐ ${total} of ${LEVELS.length * 3} stars</p>${parts}</div>`;
  $("menu").hidden = false;
}
$("menu").addEventListener("click", (e) => { const b = e.target.closest("[data-i]"); if (b && !b.disabled) startAdventure(Number(b.dataset.i)); });
$("levels").addEventListener("click", showLevels);
$("restart").addEventListener("click", () => { if (!G) return; if (!isDuel()) startAdventure(G.level); else if (!online()) startDuel(); });

/* ---------------------------------------------------------------- modes */
function wire(id, key) {
  $(id).addEventListener("click", (e) => {
    const c = e.target.closest(".g-chip");
    if (!c) return;
    $(id).querySelectorAll(".g-chip").forEach((x) => x.setAttribute("aria-pressed", String(x === c)));
    opts[key] = c.dataset.value;
    if (key === "mode") {
      $("levelRow").hidden = opts.mode !== "cpu";
      $("levels").hidden = isDuel();
      $("restart").hidden = online();
      if (online()) { net.open(); G = null; hideOverlays(); setStatus("Create a room or join one to duel a friend."); return; }
      net.close();
      if (isDuel()) startDuel(); else { const first = LEVELS.findIndex((l, i) => unlocked(i) && !prog.stars[i]); startAdventure(first < 0 ? 0 : first); showLevels(); }
    }
  });
}
wire("mode", "mode");
wire("cpuLevel", "cpu");

/* ---------------------------------------------------------------- drawing */
let scale = 1;
const cam = { x: 0, y: 0, w: W };
function resize() {
  const r = cv.getBoundingClientRect();
  const dpr = saverOn() ? 1 : Math.min(window.devicePixelRatio || 1, 2);
  cv.width = Math.max(320, Math.round(r.width * dpr));
  cv.height = Math.round((cv.width * 9) / 16);
  scale = cv.width / W;
  $("rotate").hidden = !(window.innerHeight > window.innerWidth && window.innerWidth < 700);
}
addEventListener("resize", resize);
// the camera frames the slingshot and the towers, and follows the birds in flight
function camTarget() {
  const pts = [];
  G.slings.forEach((sl) => { pts.push([sl.x - 140, sl.y - 240]); pts.push([sl.x + 140, sl.y]); });
  if (!G.duel && G.queue.length) pts.push([SLING.x - 80 - G.queue.length * 34, GROUND]);
  G.bodies.forEach((b) => { if (!b.plugin.dead && !b.isStatic) { pts.push([b.bounds.min.x - 70, b.bounds.min.y - 140]); pts.push([b.bounds.max.x + 70, b.bounds.max.y]); } else if (b.isStatic && b.plugin.kind === "ledge") { pts.push([b.bounds.min.x - 40, b.bounds.min.y - 160]); pts.push([b.bounds.max.x + 40, b.bounds.max.y]); } });
  G.birds.forEach((b) => { if (b.position.x > -50 && b.position.x < W + 50) pts.push([b.position.x - 80, b.position.y - 80], [b.position.x + 80, b.position.y + 80]); });
  let minX = Math.min(...pts.map((p) => p[0]));
  let maxX = Math.max(...pts.map((p) => p[0]));
  const minY = Math.min(...pts.map((p) => p[1]));
  let w = Math.max(maxX - minX, ((H - minY) * 16) / 9, 1000);
  w = Math.min(w, W);
  const x = Math.max(0, Math.min(W - w, (minX + maxX) / 2 - w / 2));
  return { x, y: H - (w * 9) / 16, w };
}
function moveCamera(snap) {
  const t = camTarget();
  const k = snap ? 1 : 0.06;
  cam.w += (t.w - cam.w) * k;
  cam.x += (t.x - cam.x) * k;
  cam.y = H - (cam.w * 9) / 16;
}
function paintWorld(theme) {
  const vh = (cam.w * 9) / 16;
  const sky = ctx.createLinearGradient(0, cam.y, 0, GROUND);
  sky.addColorStop(0, theme.sky[0]);
  sky.addColorStop(1, theme.sky[1]);
  ctx.fillStyle = sky;
  ctx.fillRect(cam.x - 2, cam.y - 2, cam.w + 4, vh + 4);
  ctx.fillStyle = "rgba(255,240,180,0.9)";
  ctx.beginPath(); ctx.arc(1380, Math.max(cam.y + 90, 140), 56, 0, Math.PI * 2); ctx.fill();
  [[0.5, 0.5, 610], [0.85, 0.75, 700]].forEach(([alpha, amp, base], k) => {
    ctx.fillStyle = theme.hill;
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.moveTo(0, GROUND);
    for (let x = 0; x <= W; x += 40) ctx.lineTo(x, base + Math.sin(x / (180 + k * 60) + k) * 60 * amp + Math.sin(x / 70) * 8);
    ctx.lineTo(W, GROUND);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
  const baobab = (x, s) => {
    ctx.fillStyle = "rgba(70,45,30,0.5)";
    ctx.beginPath();
    ctx.moveTo(x - 26 * s, GROUND);
    ctx.bezierCurveTo(x - 34 * s, GROUND - 60 * s, x - 14 * s, GROUND - 110 * s, x - 16 * s, GROUND - 150 * s);
    ctx.lineTo(x + 16 * s, GROUND - 150 * s);
    ctx.bezierCurveTo(x + 14 * s, GROUND - 110 * s, x + 34 * s, GROUND - 60 * s, x + 26 * s, GROUND);
    ctx.fill();
    ctx.lineWidth = 7 * s; ctx.strokeStyle = "rgba(70,45,30,0.5)"; ctx.lineCap = "round";
    [[-1, -50], [1, -46], [-0.4, -62], [0.5, -64]].forEach(([d, h]) => { ctx.beginPath(); ctx.moveTo(x + d * 8 * s, GROUND - 148 * s); ctx.lineTo(x + d * 48 * s, GROUND - 148 * s + h * s * 0.6); ctx.stroke(); });
    ctx.fillStyle = "rgba(60,90,40,0.45)";
    [[-46, -188, 30], [0, -200, 36], [44, -186, 30], [-20, -170, 26], [24, -168, 26]].forEach(([dx, dy, r]) => { ctx.beginPath(); ctx.arc(x + dx * s, GROUND + dy * s, r * s, 0, Math.PI * 2); ctx.fill(); });
  };
  const hut = (x, s) => {
    ctx.fillStyle = "rgba(150,100,60,0.45)";
    ctx.beginPath(); ctx.ellipse(x, GROUND - 26 * s, 34 * s, 28 * s, 0, Math.PI, 0); ctx.lineTo(x + 34 * s, GROUND); ctx.lineTo(x - 34 * s, GROUND); ctx.fill();
    ctx.fillStyle = "rgba(120,80,40,0.55)";
    ctx.beginPath(); ctx.moveTo(x - 46 * s, GROUND - 40 * s); ctx.lineTo(x, GROUND - 96 * s); ctx.lineTo(x + 46 * s, GROUND - 40 * s); ctx.fill();
  };
  baobab(600, 1.05); baobab(1540, 0.85); hut(440, 0.9); hut(800, 0.7);
  ctx.fillStyle = theme.ground;
  ctx.fillRect(cam.x - 2, GROUND, cam.w + 4, H - GROUND + 4);
  ctx.fillStyle = "#5fae4a";
  ctx.fillRect(cam.x - 2, GROUND - 6, cam.w + 4, 10);
  ctx.fillStyle = "rgba(0,0,0,0.12)";
  for (let x = Math.floor(cam.x / 36) * 36; x < cam.x + cam.w; x += 36) ctx.fillRect(x, GROUND + 18 + ((x * 7) % 30), 14, 4);
}
function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function drawBlock(b) {
  const { w, h, mat, hp, max } = b.plugin;
  ctx.save();
  ctx.translate(b.position.x, b.position.y);
  ctx.rotate(b.angle);
  const x = -w / 2;
  const y = -h / 2;
  if (mat === "wood") {
    const gr = ctx.createLinearGradient(x, y, x, y + h);
    gr.addColorStop(0, "#d9a25e"); gr.addColorStop(1, "#a8733d");
    ctx.fillStyle = gr; rr(ctx, x, y, w, h, 3); ctx.fill();
    ctx.strokeStyle = "rgba(90,55,25,0.55)"; ctx.lineWidth = 1.5;
    const along = w > h;
    for (let i = 1; i < 3; i += 1) { ctx.beginPath(); if (along) { ctx.moveTo(x + 4, y + (h * i) / 3); ctx.lineTo(x + w - 4, y + (h * i) / 3 + 1); } else { ctx.moveTo(x + (w * i) / 3, y + 4); ctx.lineTo(x + (w * i) / 3 + 1, y + h - 4); } ctx.stroke(); }
  } else if (mat === "stone") {
    const gr = ctx.createLinearGradient(x, y, x + w, y + h);
    gr.addColorStop(0, "#b8b6c4"); gr.addColorStop(1, "#7d7b8c");
    ctx.fillStyle = gr; rr(ctx, x, y, w, h, 4); ctx.fill();
    ctx.fillStyle = "rgba(60,58,72,0.35)";
    for (let i = 0; i < 5; i += 1) { const px = x + ((i * 37 + b.plugin.id * 13) % Math.max(1, w - 6)) + 3; const py = y + ((i * 23 + b.plugin.id * 7) % Math.max(1, h - 6)) + 3; ctx.fillRect(px, py, 3, 3); }
  } else {
    const gr = ctx.createLinearGradient(x, y, x, y + h);
    gr.addColorStop(0, "#e88a52"); gr.addColorStop(1, "#b5552c");
    ctx.fillStyle = gr; rr(ctx, x, y, w, h, Math.min(w, h) * 0.3); ctx.fill();
    ctx.strokeStyle = "rgba(255,230,190,0.6)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x + 4, y + h * 0.35); ctx.lineTo(x + w - 4, y + h * 0.35); ctx.moveTo(x + 4, y + h * 0.62); ctx.lineTo(x + w - 4, y + h * 0.62); ctx.stroke();
  }
  ctx.strokeStyle = "rgba(30,20,10,0.6)"; ctx.lineWidth = 2; rr(ctx, x, y, w, h, mat === "clay" ? Math.min(w, h) * 0.3 : 3); ctx.stroke();
  if (hp < max * 0.65) { // cracks
    ctx.strokeStyle = "rgba(25,15,10,0.7)"; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(x + w * 0.3, y + 2); ctx.lineTo(x + w * 0.45, y + h * 0.5); ctx.lineTo(x + w * 0.38, y + h - 2);
    if (hp < max * 0.35) { ctx.moveTo(x + w * 0.7, y + 2); ctx.lineTo(x + w * 0.6, y + h * 0.6); }
    ctx.stroke();
  }
  ctx.restore();
}
function drawLedge(b) {
  const { w, h } = b.plugin;
  ctx.save();
  ctx.translate(b.position.x, b.position.y);
  const gr = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
  gr.addColorStop(0, "#8a8698"); gr.addColorStop(1, "#5a5668");
  ctx.fillStyle = gr; rr(ctx, -w / 2, -h / 2, w, h, 8); ctx.fill();
  ctx.fillStyle = "#6cbc56"; ctx.fillRect(-w / 2 + 4, -h / 2 - 3, w - 8, 6);
  ctx.restore();
}
function drawMonkey(b) {
  const r = b.plugin.r;
  const hurtLevel = 1 - b.plugin.hp / b.plugin.max;
  ctx.save();
  ctx.translate(b.position.x, b.position.y);
  ctx.rotate(b.angle * 0.6);
  // ears
  ctx.fillStyle = "#7a4a2a";
  [-1, 1].forEach((d) => { ctx.beginPath(); ctx.arc(d * r * 0.92, -r * 0.15, r * 0.34, 0, Math.PI * 2); ctx.fill(); });
  ctx.fillStyle = "#e8b48a";
  [-1, 1].forEach((d) => { ctx.beginPath(); ctx.arc(d * r * 0.92, -r * 0.15, r * 0.18, 0, Math.PI * 2); ctx.fill(); });
  // head
  ctx.fillStyle = "#8a5a33";
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#e8b48a";
  ctx.beginPath(); ctx.ellipse(0, r * 0.18, r * 0.62, r * 0.55, 0, 0, Math.PI * 2); ctx.fill();
  // eyes
  [-1, 1].forEach((d) => {
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.ellipse(d * r * 0.3, -r * 0.12, r * 0.18, r * 0.22, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#1a1018"; ctx.beginPath(); ctx.arc(d * r * 0.28 - r * 0.04, -r * 0.1, r * 0.09, 0, Math.PI * 2); ctx.fill();
  });
  // a cheeky grin, or an "ouch" when hurt
  ctx.strokeStyle = "#4a2a18"; ctx.lineWidth = 2.2;
  ctx.beginPath();
  if (hurtLevel > 0.4) { ctx.arc(0, r * 0.48, r * 0.14, Math.PI * 1.1, Math.PI * 1.9); } else { ctx.arc(0, r * 0.22, r * 0.3, 0.2 * Math.PI, 0.8 * Math.PI); }
  ctx.stroke();
  ctx.fillStyle = "#4a2a18"; [-1, 1].forEach((d) => { ctx.beginPath(); ctx.arc(d * r * 0.08, r * 0.12, r * 0.04, 0, Math.PI * 2); ctx.fill(); });
  // the stolen mango
  ctx.save();
  ctx.translate(r * 0.95, r * 0.55);
  ctx.rotate(-0.4);
  const mg = ctx.createLinearGradient(-r * 0.3, 0, r * 0.3, 0);
  mg.addColorStop(0, "#ffb02e"); mg.addColorStop(1, "#ff6b2e");
  ctx.fillStyle = mg; ctx.beginPath(); ctx.ellipse(0, 0, r * 0.32, r * 0.24, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#3e9e3e"; ctx.beginPath(); ctx.ellipse(-r * 0.12, -r * 0.24, r * 0.14, r * 0.06, -0.6, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  ctx.restore();
}
function drawBird(x, y, angle, kind, r) {
  const col = BIRD_COLORS[kind];
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  // tail feathers
  ctx.fillStyle = kind === "nana" ? "#141018" : col;
  ctx.beginPath(); ctx.moveTo(-r * 0.8, -r * 0.1); ctx.lineTo(-r * 1.45, -r * 0.45); ctx.lineTo(-r * 1.35, r * 0.05); ctx.lineTo(-r * 1.5, r * 0.4); ctx.lineTo(-r * 0.8, r * 0.2); ctx.fill();
  // body
  const gr = ctx.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.1, 0, 0, r);
  gr.addColorStop(0, kind === "nana" ? "#4a4458" : "#fff6");
  gr.addColorStop(0.25, col);
  gr.addColorStop(1, kind === "nana" ? "#141018" : col);
  ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.35)"; ctx.lineWidth = 2; ctx.stroke();
  // belly
  ctx.fillStyle = kind === "nana" ? "#e8e2d4" : "#f4e2c2";
  ctx.beginPath(); ctx.ellipse(r * 0.05, r * 0.45, r * 0.55, r * 0.38, 0, 0, Math.PI * 2); ctx.fill();
  if (kind === "ama") { ctx.fillStyle = "rgba(255,255,255,0.85)"; [[-0.4, -0.5], [0.1, -0.7], [-0.6, 0.1], [0.4, -0.2]].forEach(([a, b]) => { ctx.beginPath(); ctx.arc(a * r, b * r, r * 0.08, 0, Math.PI * 2); ctx.fill(); }); } // guinea fowl spots
  // eyes with determined brows
  [[0.18, -0.2], [0.5, -0.22]].forEach(([ex, ey]) => {
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(ex * r, ey * r, r * 0.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#111"; ctx.beginPath(); ctx.arc(ex * r + r * 0.05, ey * r, r * 0.09, 0, Math.PI * 2); ctx.fill();
  });
  ctx.strokeStyle = "#111"; ctx.lineWidth = Math.max(2, r * 0.12);
  ctx.beginPath(); ctx.moveTo(r * 0.02, -r * 0.48); ctx.lineTo(r * 0.36, -r * 0.36); ctx.moveTo(r * 0.36, -r * 0.42); ctx.lineTo(r * 0.68, -r * 0.5); ctx.stroke();
  // beak (Nana is a hornbill with a big yellow beak)
  ctx.fillStyle = kind === "nana" ? "#ffcc33" : "#ffb02e";
  ctx.beginPath();
  if (kind === "nana") { ctx.moveTo(r * 0.7, -r * 0.2); ctx.quadraticCurveTo(r * 1.7, -r * 0.1, r * 1.55, r * 0.25); ctx.lineTo(r * 0.75, r * 0.15); }
  else { ctx.moveTo(r * 0.78, -r * 0.08); ctx.lineTo(r * 1.25, r * 0.06); ctx.lineTo(r * 0.78, r * 0.22); }
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.35)"; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.restore();
}
function drawSling(s, back) {
  const dir = s.x < W / 2 ? 1 : -1;
  ctx.save();
  ctx.strokeStyle = "#5a3a1e";
  ctx.lineCap = "round";
  if (back) {
    ctx.lineWidth = 16;
    ctx.beginPath(); ctx.moveTo(s.x, GROUND); ctx.lineTo(s.x, s.y + 60); ctx.lineTo(s.x - 22 * dir, s.y + 4); ctx.stroke();
  } else {
    ctx.lineWidth = 16;
    ctx.beginPath(); ctx.moveTo(s.x, s.y + 60); ctx.lineTo(s.x + 22 * dir, s.y + 2); ctx.stroke();
    ctx.lineWidth = 6; ctx.strokeStyle = "#7a5230";
    ctx.beginPath(); ctx.moveTo(s.x - 8, s.y + 74); ctx.lineTo(s.x + 8, s.y + 74); ctx.stroke();
  }
  ctx.restore();
}
function trajectory(s, pull) {
  let x = s.x, y = s.y, vx = -pull.x * POWER, vy = -pull.y * POWER;
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  for (let k = 1; k <= 75; k += 1) {
    vx *= 0.997; vy = vy * 0.997 + GRAV; x += vx; y += vy;
    if (y > GROUND) break;
    if (k % 3 === 0) { ctx.globalAlpha = 1 - k / 85; ctx.beginPath(); ctx.arc(x, y, 5 - k / 25, 0, Math.PI * 2); ctx.fill(); }
  }
  ctx.globalAlpha = 1;
}
function draw() {
  if (!G) { ctx.fillStyle = "#1a2040"; ctx.fillRect(0, 0, cv.width, cv.height); return; }
  moveCamera(false);
  const k = cv.width / cam.w;
  ctx.setTransform(k, 0, 0, k, -cam.x * k, -cam.y * k);
  paintWorld(G.theme);
  G.slings.forEach((s) => drawSling(s, true));
  G.bodies.forEach((b) => { if (b.plugin.dead) return; if (b.plugin.kind === "block") drawBlock(b); else if (b.plugin.kind === "ledge") drawLedge(b); });
  G.bodies.forEach((b) => { if (!b.plugin.dead && b.plugin.kind === "monkey") drawMonkey(b); });
  G.birds.forEach((b) => drawBird(b.position.x, b.position.y, b.angle, b.plugin.bird, b.plugin.r));
  // the bird waiting in the slingshot
  const s = sling();
  if ((G.phase === "aim" || G.phase === "wait") && G.current && !G.over) {
    const pull = G.drag ? G.drag.pull : { x: 0, y: 0 };
    const bx = s.x + pull.x;
    const by = s.y + pull.y;
    const dir = s.x < W / 2 ? 1 : -1;
    ctx.strokeStyle = "#3a2010"; ctx.lineWidth = 7; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(s.x - 22 * dir, s.y + 4); ctx.lineTo(bx, by); ctx.stroke();
    if (G.drag) trajectory(s, pull);
    drawBird(bx, by, s.x < W / 2 ? 0 : Math.PI, G.current, BIRDS[G.current].r);
    ctx.strokeStyle = "#3a2010"; ctx.lineWidth = 7;
    ctx.beginPath(); ctx.moveTo(s.x + 22 * dir, s.y + 2); ctx.lineTo(bx, by); ctx.stroke();
  }
  G.slings.forEach((sl) => drawSling(sl, false));
  // birds still to come (adventure)
  if (!G.duel) G.queue.forEach((k, i) => drawBird(SLING.x - 52 - i * 34, GROUND - BIRDS[k].r * 0.65, 0, k, BIRDS[k].r * 0.65));
  // particles and score
  G.particles.forEach((p) => { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.globalAlpha = Math.min(1, p.life / 25); ctx.fillStyle = p.c; ctx.fillRect(-p.r / 2, -p.r / 2, p.r, p.r * 0.7); ctx.restore(); });
  ctx.globalAlpha = 1;
  ctx.textAlign = "center";
  G.popups.forEach((p) => { ctx.globalAlpha = Math.min(1, p.life / 30); ctx.font = `900 ${p.big ? 46 : 30}px system-ui, sans-serif`; ctx.fillStyle = "#fff"; ctx.strokeStyle = "rgba(0,0,0,0.6)"; ctx.lineWidth = 5; ctx.strokeText(p.text, p.x, p.y); ctx.fillText(p.text, p.x, p.y); });
  ctx.globalAlpha = 1;
  // HUD, in screen space
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.font = "800 34px system-ui, sans-serif";
  ctx.lineWidth = 6; ctx.strokeStyle = "rgba(0,0,0,0.45)"; ctx.fillStyle = "#fff";
  if (!G.duel) {
    ctx.textAlign = "right"; ctx.strokeText(G.score.toLocaleString(), W - 30, 56); ctx.fillText(G.score.toLocaleString(), W - 30, 56);
    ctx.textAlign = "left"; const lbl = `Level ${G.level + 1}`; ctx.strokeText(lbl, 30, 56); ctx.fillText(lbl, 30, 56);
  } else {
    ctx.textAlign = "left"; const a = `🐒 × ${monkeysLeft(0)}`; ctx.strokeText(a, 30, 56); ctx.fillText(a, 30, 56);
    ctx.textAlign = "right"; const b = `🐒 × ${monkeysLeft(1)}`; ctx.strokeText(b, W - 30, 56); ctx.fillText(b, W - 30, 56);
    if (!G.over) { ctx.textAlign = "center"; const t = G.turn === 0 ? "◀ Left fort's turn" : "Right fort's turn ▶"; ctx.font = "800 28px system-ui, sans-serif"; ctx.strokeText(t, W / 2, 56); ctx.fillText(t, W / 2, 56); }
  }
}

/* ---------------------------------------------------------------- main loop */
let acc = 0;
let last = performance.now();
let frameNo = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(100, now - last);
  last = now;
  if (G && !document.hidden) {
    acc += dt;
    let n = 0;
    while (acc >= STEP && n < 5) { step(); acc -= STEP; n += 1; }
    if (n === 5) acc = 0;
  }
  frameNo += 1;
  if (saverOn() && frameNo % 2) return;
  draw();
}
resize();
requestAnimationFrame(frame);

/* full screen where the browser allows it */
const stage = $("stage");
if (stage.requestFullscreen) {
  $("full").hidden = false;
  $("full").addEventListener("click", () => { if (document.fullscreenElement) document.exitFullscreen(); else stage.requestFullscreen().then(() => { try { screen.orientation.lock("landscape"); } catch (err) { /* not allowed */ } }).catch(() => {}); });
  document.addEventListener("fullscreenchange", () => setTimeout(resize, 50));
}

// start: the first level you have not finished yet, or a duel invitation
const invited = net.roomParam();
if (invited) {
  $("mode").querySelector('[data-value="online"]').click();
  net.join(invited);
} else {
  const first = LEVELS.findIndex((l, i) => unlocked(i) && !prog.stars[i]);
  startAdventure(first < 0 ? 0 : first);
  if (prog.stars.some((s) => s)) showLevels();
}
window.__mango = { get G() { return G; }, cam, launch, startAdventure, startDuel, useAbility };
