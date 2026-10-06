import { createOnline } from "../../assets/online.js";

const $ = (id) => document.getElementById(id);
const ac = () => (window.z210Audio ? window.z210Audio.get() : null);

/* ---------------------------------------------------------------- sound engine */
let noiseBuf = null;
function noise(c) {
  if (noiseBuf && noiseBuf.sampleRate === c.sampleRate) return noiseBuf;
  noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i += 1) d[i] = Math.random() * 2 - 1;
  return noiseBuf;
}
function env(c, t, peak, attack, decay) {
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  g.connect(c.destination);
  return g;
}
function osc(c, t, type, f0, f1, dur, peak, attack = 0.005) {
  const o = c.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  const g = env(c, t, peak, attack, dur);
  o.connect(g);
  o.start(t);
  o.stop(t + attack + dur + 0.05);
}
function nz(c, t, type, freq, q, dur, peak, attack = 0.002) {
  const s = c.createBufferSource();
  s.buffer = noise(c);
  const f = c.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  const g = env(c, t, peak, attack, dur);
  s.connect(f);
  f.connect(g);
  s.start(t, Math.random() * 0.5);
  s.stop(t + attack + dur + 0.05);
}
const DRUMS = {
  kick: (c, t) => { osc(c, t, "sine", 150, 42, 0.28, 0.9); nz(c, t, "lowpass", 400, 1, 0.04, 0.2); },
  snare: (c, t) => { nz(c, t, "bandpass", 1900, 0.8, 0.17, 0.45); osc(c, t, "triangle", 210, 150, 0.1, 0.3); },
  hat: (c, t) => nz(c, t, "highpass", 7500, 0.7, 0.05, 0.22),
  clap: (c, t) => { [0, 0.012, 0.026].forEach((d) => nz(c, t + d, "bandpass", 1300, 1.1, 0.07, 0.3)); nz(c, t + 0.03, "bandpass", 1300, 1.1, 0.16, 0.25); },
  conga: (c, t) => { osc(c, t, "sine", 330, 250, 0.2, 0.55); nz(c, t, "bandpass", 900, 1, 0.03, 0.12); },
  bell: (c, t) => { osc(c, t, "square", 830, 800, 0.35, 0.16); osc(c, t, "square", 1240, 1200, 0.3, 0.12); nz(c, t, "highpass", 4000, 1, 0.02, 0.1); },
  shaker: (c, t) => nz(c, t, "highpass", 5200, 0.9, 0.11, 0.25, 0.03),
  djBass: (c, t) => { osc(c, t, "sine", 130, 62, 0.4, 0.95); nz(c, t, "lowpass", 300, 1, 0.06, 0.2); },
  djTone: (c, t) => { osc(c, t, "sine", 260, 190, 0.22, 0.6); nz(c, t, "bandpass", 700, 1.2, 0.05, 0.15); },
  djSlap: (c, t) => { nz(c, t, "bandpass", 2600, 1.4, 0.09, 0.5); osc(c, t, "triangle", 420, 300, 0.06, 0.25); },
  talkHi: (c, t) => { osc(c, t, "sine", 300, 520, 0.28, 0.6, 0.01); nz(c, t, "bandpass", 1200, 1, 0.03, 0.1); },
  talkLo: (c, t) => { osc(c, t, "sine", 190, 330, 0.34, 0.65, 0.01); nz(c, t, "bandpass", 800, 1, 0.03, 0.1); },
};
const hz = (m) => 440 * 2 ** ((m - 69) / 12);
const VOICES = {
  piano: (c, t, f, d = 1.1) => { osc(c, t, "triangle", f, f, d, 0.4); osc(c, t, "sine", f * 2, f * 2, d * 0.5, 0.12); },
  bell: (c, t, f, d = 1.6) => { osc(c, t, "sine", f, f, d, 0.35); osc(c, t, "sine", f * 2.76, f * 2.76, d * 0.5, 0.14); osc(c, t, "sine", f * 5.4, f * 5.4, d * 0.25, 0.06); },
  marimba: (c, t, f, d = 0.5) => { osc(c, t, "sine", f, f, d, 0.55, 0.002); osc(c, t, "sine", f * 4, f * 4, d * 0.18, 0.18, 0.002); },
  synth: (c, t, f, d = 0.7) => {
    const o = c.createOscillator();
    const lp = c.createBiquadFilter();
    o.type = "sawtooth";
    o.frequency.value = f;
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(3200, t);
    lp.frequency.exponentialRampToValueAtTime(500, t + d);
    const g = env(c, t, 0.22, 0.01, d);
    o.connect(lp);
    lp.connect(g);
    o.start(t);
    o.stop(t + d + 0.1);
  },
};
function playDrum(id) { const c = ac(); if (c && DRUMS[id]) DRUMS[id](c, c.currentTime + 0.005); }
function playNote(voice, midi) { const c = ac(); if (c) (VOICES[voice] || VOICES.piano)(c, c.currentTime + 0.005, hz(midi)); }

/* ---------------------------------------------------------------- online jam */
let jamming = false;
let myRole = 0;
const net = createOnline({
  container: document.querySelector(".g-page"),
  before: document.querySelector(".tabs"),
  prefix: "zone210-music-",
  names: ["Player 1", "Player 2"],
  onStart: ({ role }) => { myRole = role; jamming = true; $("status").textContent = "Jam started! Everything you play, your friend hears too (theirs glows pink on your screen)."; },
  onData: (m) => onJam(m),
  onLeft: () => { jamming = false; $("status").textContent = "Your friend left the jam."; },
  getState: () => ({ grid, bpm }),
  setState: (s) => { grid = s.grid; bpm = s.bpm; $("bpm").value = bpm; $("bpmNum").textContent = bpm; jamming = true; drawSeq(); },
});
const send = (m) => { if (jamming) net.send(m); };
let modeOnline = false;
$("mode").addEventListener("click", (e) => {
  const chip = e.target.closest(".g-chip");
  if (!chip) return;
  $("mode").querySelectorAll(".g-chip").forEach((c) => c.setAttribute("aria-pressed", String(c === chip)));
  modeOnline = chip.dataset.value === "online";
  if (modeOnline) net.open(); else { net.close(); jamming = false; $("status").textContent = ""; }
});

/* ---------------------------------------------------------------- beat maker */
const ROWS = [
  { id: "kick", name: "Kick", c: "#e5484d", d: "kick" },
  { id: "snare", name: "Snare", c: "#f5a623", d: "snare" },
  { id: "hat", name: "Hi-hat", c: "#f5d90a", d: "hat" },
  { id: "clap", name: "Clap", c: "#ec6aa0", d: "clap" },
  { id: "conga", name: "Conga", c: "#2fb36d", d: "conga" },
  { id: "bell", name: "Bell", c: "#3b82f6", d: "bell" },
  { id: "shaker", name: "Shaker", c: "#8a5ce0", d: "shaker" },
  { sep: true },
  { id: "m4", name: "Tune A", c: "#4ad6c8", m: 69 },
  { id: "m3", name: "Tune G", c: "#4ad6c8", m: 67 },
  { id: "m2", name: "Tune E", c: "#4ad6c8", m: 64 },
  { id: "m1", name: "Tune D", c: "#4ad6c8", m: 62 },
  { id: "m0", name: "Tune C", c: "#4ad6c8", m: 60 },
];
const PRESETS = {
  Pop: { bpm: 104, kick: "x...x..x..x.x...", snare: "....x.......x...", hat: "x.x.x.x.x.x.x.x.", clap: "", conga: ".x..x.x..x..x.x.", bell: "x..x..x...x.x...", shaker: "..x...x...x...x.", m4: "", m3: "", m2: "x.......x.......", m1: "", m0: "....x.......x..." },
  Afrobeat: { bpm: 110, kick: "x..x..x...x..x..", snare: "....x.......x..x", hat: "x.x.x.x.x.x.x.xx", clap: "....x.......x...", conga: ".x.x..x..x.x..x.", bell: "x.x.x..x.x.x..x.", shaker: "xxxxxxxxxxxxxxxx", m4: "", m3: "..x.....", m2: "", m1: "x.......x.......", m0: "" },
  "Hip-hop": { bpm: 90, kick: "x.......x.x.....", snare: "....x.......x...", hat: "x.x.x.x.x.x.x.x.", clap: "....x.......x...", conga: "", bell: "", shaker: "", m4: "", m3: "", m2: "", m1: "", m0: "x...............x.x....." },
  Funk: { bpm: 100, kick: "x..x..x...x.x...", snare: "....x..x....x...", hat: "xxxxxxxxxxxxxxxx", clap: "", conga: "..x...x...x...x.", bell: "", shaker: "x.x.x.x.x.x.x.x.", m4: "", m3: "x.......", m2: "..x.....x.x.....", m1: "", m0: "" },
  "R&B": { bpm: 78, swing: 0.2, kick: "x.....x...x.....", snare: "....x.......x...", hat: "x.x...x.x.x...x.", clap: "....x.......x...", conga: "", bell: "", shaker: "..x.....x....x..", m4: "..........x.....", m3: "", m2: "x.......x.......", m1: "....x.......x...", m0: "x.....x.........x" },
  House: { bpm: 124, kick: "x...x...x...x...", snare: "", hat: "..x...x...x...x.", clap: "....x.......x...", conga: ".x..x...x..x....", bell: "", shaker: "xxxxxxxxxxxxxxxx", m4: "", m3: "x..x..x...x..x..", m2: "", m1: "", m0: "x...............x......." },
};
const STEPS = 16;
const mkGrid = () => ROWS.filter((r) => !r.sep).map(() => new Array(STEPS).fill(false));
let grid = mkGrid();
let bpm = 104;
let swing = 0;
let playing = false;
let step = 0;
let nextTime = 0;
let timer = 0;
const REAL = ROWS.filter((r) => !r.sep);

function drawSeq() {
  const el = $("seq");
  let ri = -1;
  el.innerHTML = ROWS.map((r) => {
    if (r.sep) return '<div class="sep"></div>';
    ri += 1;
    const i = ri;
    return `<div class="srow" role="group" aria-label="${r.name}"><button type="button" class="sname" data-hear="${i}" title="Hear ${r.name}">${r.name}</button>${grid[i].map((on, s) => `<button type="button" class="step${on ? " on" : ""}${s % 4 === 0 ? " q" : ""}" style="--c:${r.c}" data-r="${i}" data-s="${s}" aria-pressed="${on}" aria-label="${r.name} step ${s + 1}"></button>`).join("")}</div>`;
  }).join("");
}
function hearRow(i) {
  const r = REAL[i];
  if (r.d) playDrum(r.d); else playNote("marimba", r.m);
}
function setStep(r, s, v, friend) {
  grid[r][s] = v;
  const b = $("seq").querySelector(`.step[data-r="${r}"][data-s="${s}"]`);
  if (b) {
    b.classList.toggle("on", v);
    b.setAttribute("aria-pressed", String(v));
    if (friend) { b.classList.add("friend"); setTimeout(() => b.classList.remove("friend"), 700); }
  }
}
$("seq").addEventListener("click", (e) => {
  const h = e.target.closest("[data-hear]");
  if (h) { hearRow(Number(h.dataset.hear)); send({ t: "hit", k: "row", i: Number(h.dataset.hear) }); return; }
  const b = e.target.closest(".step");
  if (!b) return;
  const r = Number(b.dataset.r);
  const s = Number(b.dataset.s);
  const v = !grid[r][s];
  setStep(r, s, v, false);
  if (v) hearRow(r);
  send({ t: "step", r, s, v });
});
$("presets").innerHTML = Object.keys(PRESETS).map((n) => `<button class="g-chip" data-p="${n.replace(/&/g, "&amp;")}" aria-pressed="false">${n.replace(/&/g, "&amp;")}</button>`).join("");
function loadPreset(name) {
  const p = PRESETS[name];
  grid = REAL.map((r) => { const str = (p[r.id] || "").padEnd(STEPS, ".").slice(0, STEPS); return str.split("").map((ch) => ch === "x"); });
  swing = p.swing || 0;
  if (p.bpm) { bpm = p.bpm; $("bpm").value = bpm; $("bpmNum").textContent = bpm; }
  $("presets").querySelectorAll(".g-chip").forEach((c) => c.setAttribute("aria-pressed", String(c.dataset.p === name)));
  drawSeq();
}
$("presets").addEventListener("click", (e) => { const c = e.target.closest("[data-p]"); if (!c) return; loadPreset(c.dataset.p); send({ t: "preset", n: c.dataset.p }); });
$("clearBeat").addEventListener("click", () => { grid = mkGrid(); $("presets").querySelectorAll(".g-chip").forEach((c) => c.setAttribute("aria-pressed", "false")); drawSeq(); send({ t: "clear" }); });
$("bpm").addEventListener("input", () => { bpm = Number($("bpm").value); $("bpmNum").textContent = bpm; send({ t: "bpm", v: bpm }); });

function schedule() {
  const c = ac();
  if (!c) return;
  while (nextTime < c.currentTime + 0.12) {
    const s = step;
    const when = nextTime + (s % 2 ? swing * (60 / bpm / 4) : 0);
    REAL.forEach((r, i) => {
      if (!grid[i][s]) return;
      if (r.d) DRUMS[r.d](c, when); else VOICES.marimba(c, when, hz(r.m));
    });
    const delay = Math.max(0, (when - c.currentTime) * 1000);
    setTimeout(() => flashStep(s), delay);
    nextTime += 60 / bpm / 4;
    step = (step + 1) % STEPS;
  }
}
function flashStep(s) {
  $("seq").querySelectorAll(".step.now").forEach((b) => b.classList.remove("now"));
  if (!playing) return;
  $("seq").querySelectorAll(`.step[data-s="${s}"]`).forEach((b) => b.classList.add("now"));
}
function setPlaying(on, remote) {
  if (on === playing) return;
  playing = on;
  $("play").textContent = on ? "■ Stop" : "▶ Play";
  if (on) {
    const c = ac();
    if (!c) { playing = false; return; }
    step = 0;
    nextTime = c.currentTime + 0.06;
    schedule();
    timer = setInterval(schedule, 25);
  } else { clearInterval(timer); flashStep(0); }
  if (!remote) send({ t: "play", on });
}
$("play").addEventListener("click", () => setPlaying(!playing));
loadPreset("Pop");

/* ---------------------------------------------------------------- piano */
let voice = "piano";
const WHITE = [0, 2, 4, 5, 7, 9, 11];
const NAMES = ["C", "D", "E", "F", "G", "A", "B"];
const PENTA = new Set([0, 2, 4, 7, 9]);
const KEYMAP = "asdfghjkl;'".split("");
const keys = []; // { midi, el }
function buildPiano() {
  const el = $("piano");
  el.innerHTML = "";
  keys.length = 0;
  let w = 0;
  for (let o = 0; o < 2; o += 1) {
    WHITE.forEach((semi, k) => {
      const midi = 60 + o * 12 + semi;
      const b = document.createElement("button");
      b.type = "button";
      b.className = "key";
      b.dataset.m = midi;
      b.setAttribute("aria-label", `${NAMES[k]}${4 + o}`);
      b.innerHTML = `<span>${NAMES[k]}${k === 0 ? 4 + o : ""}</span>`;
      el.appendChild(b);
      keys.push({ midi, el: b });
      if ([0, 1, 3, 4, 5].includes(k)) {
        const bl = document.createElement("button");
        bl.type = "button";
        bl.className = "key black";
        bl.dataset.m = midi + 1;
        bl.style.left = `calc(8px + (100% - 16px) / 14 * ${w + 1} - (100% - 16px) / 14 * 0.3)`;
        bl.setAttribute("aria-label", `${NAMES[k]} sharp ${4 + o}`);
        bl.innerHTML = "<span></span>";
        el.appendChild(bl);
        keys.push({ midi: midi + 1, el: bl });
      }
      w += 1;
    });
  }
  paintPiano();
}
const penta = () => $("penta").checked;
function paintPiano() {
  keys.forEach((k) => k.el.classList.toggle("dim", penta() && !PENTA.has(k.midi % 12)));
  $("piano").classList.toggle("hide-names", !$("names").checked);
}
let recording = false;
let recStart = 0;
let tape = [];
function keyDown(midi, remote) {
  if (!remote && penta() && !PENTA.has(midi % 12)) return;
  playNote(voice, midi);
  const k = keys.find((x) => x.midi === midi);
  if (k) { k.el.classList.add(remote ? "friend" : "down"); setTimeout(() => k.el.classList.remove("down", "friend"), remote ? 260 : 160); }
  if (!remote) {
    send({ t: "hit", k: "note", v: voice, m: midi });
    if (recording) tape.push({ midi, t: performance.now() - recStart });
  }
}
let heldKey = null;
$("piano").addEventListener("pointerdown", (e) => {
  const k = e.target.closest(".key");
  if (!k) return;
  e.preventDefault();
  heldKey = k;
  keyDown(Number(k.dataset.m));
});
$("piano").addEventListener("pointermove", (e) => {
  if (!heldKey || !(e.buttons & 1 || e.pointerType === "touch")) return;
  const el = document.elementFromPoint(e.clientX, e.clientY);
  const k = el && el.closest && el.closest(".key");
  if (k && k !== heldKey) { heldKey = k; keyDown(Number(k.dataset.m)); }
});
addEventListener("pointerup", () => { heldKey = null; });
addEventListener("keydown", (e) => {
  if (e.repeat || e.ctrlKey || e.metaKey || e.altKey || $("p-piano").hidden) return;
  if (e.target.closest && e.target.closest("input, textarea")) return;
  const i = KEYMAP.indexOf(e.key.toLowerCase());
  if (i < 0) return;
  const white = keys.filter((k) => !k.el.classList.contains("black"))[i];
  if (white) keyDown(white.midi);
});
$("voices").innerHTML = Object.keys(VOICES).map((v, i) => `<button class="g-chip" data-v="${v}" aria-pressed="${i === 0}">${{ piano: "🎹 Piano", bell: "🔔 Bell", marimba: "🪵 Marimba", synth: "🎛 Synth" }[v]}</button>`).join("");
$("voices").addEventListener("click", (e) => { const c = e.target.closest("[data-v]"); if (!c) return; voice = c.dataset.v; $("voices").querySelectorAll(".g-chip").forEach((x) => x.setAttribute("aria-pressed", String(x === c))); });
$("penta").addEventListener("change", paintPiano);
$("names").addEventListener("change", paintPiano);
$("rec").addEventListener("click", () => {
  recording = !recording;
  $("rec").textContent = recording ? "■ Stop recording" : "⏺ Record";
  $("rec").setAttribute("aria-pressed", String(recording));
  if (recording) { tape = []; recStart = performance.now(); $("replay").disabled = true; $("recNote").textContent = "Recording… play some notes!"; }
  else { $("replay").disabled = !tape.length; $("recNote").textContent = tape.length ? `${tape.length} notes recorded.` : "Nothing recorded."; }
});
$("replay").addEventListener("click", () => { const v = voice; tape.forEach((n) => setTimeout(() => { const old = voice; voice = v; keyDown(n.midi, true); voice = old; }, n.t)); });
buildPiano();

/* ---------------------------------------------------------------- drum pads */
const PADS = [
  { id: "djBass", name: "Bass drum", icon: "🪘", c: "#e5484d", key: "q" },
  { id: "djTone", name: "Hand drum", icon: "🪘", c: "#f5a623", key: "w" },
  { id: "djSlap", name: "Drum slap", icon: "✋", c: "#f5d90a", key: "e" },
  { id: "clap", name: "Clap", icon: "👏", c: "#ec6aa0", key: "r" },
  { id: "talkLo", name: "Pitch drum low", icon: "🥁", c: "#2fb36d", key: "z" },
  { id: "talkHi", name: "Pitch drum high", icon: "🥁", c: "#3b82f6", key: "x" },
  { id: "bell", name: "Cowbell", icon: "🔔", c: "#8a5ce0", key: "c" },
  { id: "shaker", name: "Shaker", icon: "🥚", c: "#4ad6c8", key: "v" },
];
$("pads").innerHTML = PADS.map((p) => `<button type="button" class="pad" data-id="${p.id}" style="--c:${p.c}" aria-label="${p.name}"><span>${p.icon}</span>${p.name}</button>`).join("");
function padHit(id, remote) {
  playDrum(id);
  const b = $("pads").querySelector(`[data-id="${id}"]`);
  if (b) { b.classList.add(remote ? "friend" : "down"); setTimeout(() => b.classList.remove("down", "friend"), 130); }
  if (!remote) send({ t: "hit", k: "pad", id });
}
$("pads").addEventListener("pointerdown", (e) => { const b = e.target.closest(".pad"); if (!b) return; e.preventDefault(); padHit(b.dataset.id); });
addEventListener("keydown", (e) => {
  if (e.repeat || $("p-pads").hidden || e.ctrlKey || e.metaKey || e.altKey) return;
  const p = PADS.find((x) => x.key === e.key.toLowerCase());
  if (p) padHit(p.id);
});

/* ---------------------------------------------------------------- jam messages */
function onJam(m) {
  if (m.t === "step") setStep(m.r, m.s, m.v, true);
  else if (m.t === "preset") loadPreset(m.n);
  else if (m.t === "clear") { grid = mkGrid(); drawSeq(); }
  else if (m.t === "bpm") { bpm = m.v; $("bpm").value = bpm; $("bpmNum").textContent = bpm; }
  else if (m.t === "play") setPlaying(m.on, true);
  else if (m.t === "hit") {
    if (m.k === "pad") padHit(m.id, true);
    else if (m.k === "note") { const old = voice; voice = m.v; keyDown(m.m, true); voice = old; }
    else if (m.k === "row") hearRow(m.i);
  }
}

/* ---------------------------------------------------------------- copy the tune */
const TP = [
  { c: "#e5484d", m: 60, e: "🔴" },
  { c: "#3b82f6", m: 64, e: "🔵" },
  { c: "#2fb36d", m: 67, e: "🟢" },
  { c: "#f5d90a", m: 72, e: "🟡" },
];
$("tpads").innerHTML = TP.map((p, i) => `<button type="button" class="tp" data-i="${i}" style="--c:${p.c}" aria-label="Pad ${i + 1}" disabled></button>`).join("");
let seq = [];
let pos = 0;
let accepting = false;
let best = 0;
try { best = Number(localStorage.getItem("zone210_music_best")) || 0; } catch (err) { /* storage unavailable */ }
$("tBest").textContent = best;
function lightPad(i, ms = 380) {
  const b = $("tpads").children[i];
  playNote("marimba", TP[i].m);
  b.classList.add("lit");
  setTimeout(() => b.classList.remove("lit"), ms);
}
async function showSeq() {
  accepting = false;
  [...$("tpads").children].forEach((b) => { b.disabled = true; });
  $("tStatus").textContent = "Listen…";
  await new Promise((r) => setTimeout(r, 600));
  const gap = Math.max(260, 560 - seq.length * 18);
  for (const i of seq) { lightPad(i, gap * 0.7); await new Promise((r) => setTimeout(r, gap)); }
  accepting = true;
  pos = 0;
  [...$("tpads").children].forEach((b) => { b.disabled = false; });
  $("tStatus").textContent = "Your turn!";
}
function nextRound() {
  seq.push(Math.floor(Math.random() * 4));
  $("tRound").textContent = seq.length;
  showSeq();
}
$("tStart").addEventListener("click", () => { seq = []; $("tStart").textContent = "Restart"; nextRound(); });
$("tpads").addEventListener("pointerdown", (e) => {
  const b = e.target.closest(".tp");
  if (!b || !accepting) return;
  e.preventDefault();
  const i = Number(b.dataset.i);
  lightPad(i, 220);
  if (i !== seq[pos]) {
    accepting = false;
    playDrum("snare");
    const got = seq.length - 1;
    if (got > best) { best = got; try { localStorage.setItem("zone210_music_best", String(best)); } catch (err) { /* private mode */ } $("tBest").textContent = best; }
    $("tStatus").textContent = `Oops! You remembered ${got} ${got === 1 ? "note" : "notes"}${got >= best && got > 0 ? ". A new best!" : ". Press Restart to try again."}`;
    [...$("tpads").children].forEach((x) => { x.disabled = true; });
    return;
  }
  pos += 1;
  if (pos === seq.length) { accepting = false; $("tStatus").textContent = "Great! Next…"; setTimeout(nextRound, 900); }
});

/* ---------------------------------------------------------------- tabs */
$("tabs").addEventListener("click", (e) => {
  const t = e.target.closest(".tab");
  if (!t) return;
  $("tabs").querySelectorAll(".tab").forEach((x) => x.setAttribute("aria-selected", String(x === t)));
  ["beat", "piano", "pads", "tune"].forEach((n) => { $(`p-${n}`).hidden = n !== t.dataset.tab; });
  if (t.dataset.tab !== "beat" && playing) setPlaying(false);
});
drawSeq();

// invite link (?room=CODE): jump straight into online mode and join
const invited = net.roomParam();
if (invited) {
  $("mode").querySelector('[data-value="online"]').click();
  net.join(invited);
}
