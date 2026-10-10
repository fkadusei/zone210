// Calm Corner: breathing with a growing and shrinking circle, a feelings check-in, the 5-4-3-2-1 senses exercise,
// and calming sounds made right in the browser (rain, waves, wind, chimes). Everything stays on this device.
import { FEELINGS, KIND, SENSES, CUES, sensesLine } from "./lines.js";
import { PIECES, playMusic, stopMusic, playingMusic } from "./music.js";

const $ = (id) => document.getElementById(id);
const store = {
  get(key, fallback) { try { const raw = localStorage.getItem(key); return raw === null ? fallback : JSON.parse(raw); } catch (err) { return fallback; } },
  set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (err) { /* private mode */ } },
};
const KEY = "zone210_calm";
const data = { tab: "breathe", pattern: "balloon", voice: true, diary: [], ...store.get(KEY, {}) };
const save = () => store.set(KEY, data);
const view = $("view");
const reduce = () => window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

// ---------- the voice: three soft recorded voices (Kokoro), the device's own voice, or none ----------
const VOICES = [["af_nicole", "Nicole (soft)"], ["af_heart", "Heart (warm)"], ["bf_emma", "Emma (gentle, British)"], ["device", "My device's voice"], ["off", "No voice"]];
if (data.voice === true) data.voice = "af_nicole"; // older settings were on/off
if (data.voice === false) data.voice = "off";
if (!VOICES.some(([k]) => k === data.voice)) data.voice = "af_nicole";
let clips = null;
const clipsReady = fetch("audio/index.json").then((r) => r.json()).then((j) => { clips = j; }).catch(() => { clips = {}; });
const player = new Audio();
function hush() { player.pause(); if (window.speechSynthesis) speechSynthesis.cancel(); }
/** Says a line: the recorded clip in the chosen voice if there is one, otherwise the device's voice reads the words. */
let talkN = 0;
async function talk(key, text) {
  if (data.voice === "off") return;
  hush();
  const my = ++talkN;
  if (!clips) await clipsReady; // the list of recordings may still be loading on the first line
  if (my !== talkN) return;
  if (data.voice !== "device" && clips && (clips[data.voice] || []).includes(key)) {
    player.src = `audio/${data.voice}/${key}.m4a`;
    player.volume = 0.9;
    player.play().catch(() => {});
    return;
  }
  if (!window.speechSynthesis) return;
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 0.8; u.pitch = 0.95; u.lang = "en-GB";
  speechSynthesis.speak(u);
}
const ac = () => window.z210Audio && window.z210Audio.get();
function bell(f = 528, vol = 0.08, len = 2.5) {
  const a = ac();
  if (!a) return;
  const o = a.createOscillator(), o2 = a.createOscillator(), g = a.createGain();
  o.type = "sine"; o.frequency.value = f; o2.type = "sine"; o2.frequency.value = f * 2.01;
  const t = a.currentTime;
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
  o.connect(g); o2.connect(g); g.connect(a.destination); o.start(t); o2.start(t); o.stop(t + len); o2.stop(t + len);
}

// ---------- tabs ----------
const TABS = { breathe: viewBreathe, feel: viewFeel, senses: viewSenses, sounds: viewSounds, music: viewMusic };
let cleanup = () => {};
function setTab(tab) {
  cleanup(); cleanup = () => {};
  data.tab = TABS[tab] ? tab : "breathe"; save();
  document.querySelectorAll("#tabs [data-tab]").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.tab === data.tab)));
  TABS[data.tab]();
}
$("tabs").addEventListener("click", (e) => { const b = e.target.closest("[data-tab]"); if (b) setTab(b.dataset.tab); });
const voiceBtn = () => { $("voice").innerHTML = VOICES.map(([k, n]) => `<option value="${k}" ${k === data.voice ? "selected" : ""}>${n}</option>`).join(""); };
$("voice").addEventListener("change", () => { data.voice = $("voice").value; save(); if (data.voice === "off") hush(); else talk("k/9", "Breathe. You're doing great."); });

// ---------- breathing ----------
const PATTERNS = {
  balloon: { name: "🎈 Balloon breathing", tip: "Breathe in slowly through your nose, like blowing up a balloon in your tummy. Then let it out slowly.", steps: [["in", 4], ["out", 5]] },
  box: { name: "🟦 Box breathing", tip: "In, hold, out, hold: four counts each, like walking round the sides of a box.", steps: [["in", 4], ["hold", 4], ["out", 4], ["hold", 4]] },
  sleepy: { name: "🌙 Sleepy breathing", tip: "A longer breath out helps your body slow down. Good for bedtime.", steps: [["in", 4], ["hold", 2], ["out", 7]] },
};
const WORD = { in: "Breathe in", hold: "Hold", out: "Breathe out" };
function viewBreathe() {
  const p = PATTERNS[data.pattern] || PATTERNS.balloon;
  view.innerHTML = `<div class="g-chips pats" role="group" aria-label="Breathing pattern">${Object.entries(PATTERNS).map(([k, x]) => `<button class="g-chip" data-p="${k}" aria-pressed="${k === data.pattern}">${x.name}</button>`).join("")}</div>
    <div class="panel"><p class="tip">${p.tip}</p>
    <div class="breath"><div class="ring" id="ring"><div class="ball" id="ball"></div><div class="say"><b id="phase">Ready?</b><span id="count"></span></div></div><div class="bar" id="bar" aria-hidden="true"><i></i></div></div>
    <p class="rounds" id="rounds" aria-live="polite"></p>
    <div class="row"><button class="g-btn" id="go">▶ Start</button>
      <label class="len">Breaths <select id="n"><option>3</option><option selected>5</option><option>10</option></select></label></div></div>`;
  view.querySelector(".pats").addEventListener("click", (e) => { const b = e.target.closest("[data-p]"); if (b) { data.pattern = b.dataset.p; save(); cleanup(); viewBreathe(); } });
  let timer = 0, running = false;
  const ball = $("ball"), bar = $("bar").querySelector("i");
  const stop = (msg) => { clearTimeout(timer); running = false; $("go").textContent = "▶ Start"; $("phase").textContent = msg || "Ready?"; $("count").textContent = ""; ball.style.transitionDuration = "1.2s"; ball.style.transform = "scale(0.45)"; bar.style.transitionDuration = "0.4s"; bar.style.width = "0"; };
  cleanup = () => stop();
  $("go").addEventListener("click", () => {
    if (running) { stop(); return; }
    running = true; $("go").textContent = "⏸ Stop";
    const total = Number($("n").value);
    let breath = 0, step = 0;
    const run = () => {
      if (!running) return;
      if (step >= p.steps.length) { step = 0; breath += 1; }
      if (breath >= total) { stop("Well done 💛"); bell(396, 0.08, 4); talk("b/done", CUES.done); $("rounds").textContent = `${total} calm breaths. Notice how your body feels now.`; return; }
      const [kind, secs] = p.steps[step];
      $("phase").textContent = WORD[kind];
      $("rounds").textContent = `Breath ${breath + 1} of ${total}`;
      talk(`b/${kind}`, CUES[kind]);
      bell(kind === "in" ? 528 : kind === "out" ? 396 : 440, 0.05, 1.6);
      // the circle grows as you breathe in, waits on hold, shrinks as you breathe out (a bar fills instead with reduced motion)
      ball.style.transitionDuration = `${secs}s`;
      if (kind === "in") ball.style.transform = "scale(1)"; else if (kind === "out") ball.style.transform = "scale(0.45)";
      bar.style.transitionDuration = "0s"; bar.style.width = "0"; void bar.offsetWidth; bar.style.transitionDuration = `${secs}s`; bar.style.width = "100%";
      let left = secs;
      $("count").textContent = left;
      const tickDown = () => { left -= 1; if (!running) return; if (left > 0) { $("count").textContent = left; timer = setTimeout(tickDown, 1000); } else { step += 1; run(); } };
      timer = setTimeout(tickDown, 1000);
    };
    run();
  });
  $("ring").classList.toggle("still", reduce());
}

// ---------- feelings ----------
function viewFeel() {
  const recent = data.diary.slice(-7).reverse();
  view.innerHTML = `<div class="panel"><p class="tip">How are you feeling right now? Tap the face that fits. All feelings are okay.</p>
    <div class="feels">${FEELINGS.map(([e, n], i) => `<button class="feel" data-i="${i}"><span>${e}</span>${n}</button>`).join("")}</div></div>
    <div class="answer" id="answer" hidden aria-live="polite"></div>
    <div class="kind"><span>💛 A kind thought</span><p id="kind">${KIND[Math.floor(Math.random() * KIND.length)]}</p><button class="g-btn ghost" id="nextKind">Another one</button></div>
    ${recent.length ? `<div class="diary"><span>My feelings this week</span><div>${recent.map((d) => `<span title="${new Date(d.t).toLocaleDateString()}">${d.e}</span>`).join("")}</div><small>Saved only on this device. <button class="link" id="clearDiary">Clear</button></small></div>` : ""}`;
  view.querySelector(".feels").addEventListener("click", (e) => {
    const b = e.target.closest(".feel");
    if (!b) return;
    const [emoji, name, msg, go] = FEELINGS[Number(b.dataset.i)];
    view.querySelectorAll(".feel").forEach((x) => x.classList.toggle("on", x === b));
    data.diary.push({ e: emoji, n: name, t: Date.now() });
    data.diary = data.diary.slice(-60);
    save();
    const label = { breathe: "🌬️ Do some breathing", senses: "🖐️ Try 5-4-3-2-1", sounds: "🎧 Listen to calm sounds" }[go];
    $("answer").hidden = false;
    $("answer").innerHTML = `<p><b>${emoji} ${name}.</b> ${msg}</p><button class="g-btn" id="goTo">${label}</button>`;
    $("goTo").addEventListener("click", () => setTab(go));
    talk(`f/${b.dataset.i}`, `${name}. ${msg}`);
  });
  $("nextKind").addEventListener("click", () => { const i = Math.floor(Math.random() * KIND.length); $("kind").textContent = KIND[i]; talk(`k/${i}`, KIND[i]); });
  const cd = $("clearDiary");
  if (cd) cd.addEventListener("click", () => { data.diary = []; save(); viewFeel(); });
}

// ---------- 5-4-3-2-1 ----------
function viewSenses() {
  let s = 0, got = 0;
  const draw = () => {
    if (s >= SENSES.length) {
      view.innerHTML = `<div class="senses done"><h2>All done!</h2><p>You brought your mind back to right now. How do you feel?</p><button class="g-btn" id="again">Do it again</button></div>`;
      $("again").addEventListener("click", viewSenses);
      bell(396, 0.08, 4);
      talk("s/done", CUES.senses);
      return;
    }
    const [n, e, what, tip] = SENSES[s];
    view.innerHTML = `<div class="senses"><p class="step">Step ${s + 1} of 5</p><p class="big">${e}</p><h2>Find <b>${n}</b> ${what}</h2><p class="tip">${tip}</p>
      <div class="dots" role="group" aria-label="Tap one for each thing you find">${Array.from({ length: n }, (_, i) => `<button class="dot${i < got ? " on" : ""}" data-i="${i}" aria-label="Found ${i + 1}">${i < got ? "✓" : i + 1}</button>`).join("")}</div>
      <p class="tip small">Tap a circle each time you find one.</p></div>`;
    view.querySelectorAll(".dot").forEach((b) => b.addEventListener("click", () => {
      if (Number(b.dataset.i) !== got) return;
      got += 1; bell(528 + got * 66, 0.05, 1.2);
      // show the tick; when the step is finished, move on once (drawing twice made the voice say "Find" twice)
      b.classList.add("on"); b.textContent = "✓";
      if (got === n) { s += 1; got = 0; setTimeout(draw, 700); } else draw();
    }));
    if (got === 0) talk(`s/${s}`, sensesLine(SENSES[s]));
  };
  draw();
}

// ---------- the list of things to play, and the "now playing" panel (calm sounds and calm music share them) ----------
const EQ = '<span class="eq" aria-hidden="true"><i></i><i></i><i></i></span>';
const itemsHTML = (items, now) => items.map((x) => `<button class="item${now === x.id ? " on" : ""}" data-id="${x.id}" aria-pressed="${now === x.id}"><span class="ie" aria-hidden="true">${x.emoji}</span><span class="it"><b>${x.name}</b><small>${x.about}</small></span><span class="ip" aria-hidden="true">${EQ}<span class="ic"></span></span></button>`).join("");
const groupHTML = (cls, emoji, title, sub, items, now) => `<section class="group ${cls}"><header><span class="ge" aria-hidden="true">${emoji}</span><div><h2>${title}</h2><p>${sub}</p></div></header><div class="items">${itemsHTML(items, now)}</div></section>`;
function playerHTML({ kind, minsId, mins, stopId, statId, now }) {
  const S = SESS[kind];
  return `<section class="player${now ? " on" : ""}" id="player" aria-label="Now playing">
    <div class="np"><span class="npe" id="npE" aria-hidden="true">${now ? now.emoji : "🎶"}</span><div><small>Now playing</small><b id="npN">${now ? now.name : "Nothing yet"}</b><span class="stat" id="${statId}" aria-live="polite">${now ? "" : "Choose something above."}</span></div>
      <button class="stop" id="${stopId}" aria-label="Stop">◼</button></div>
    <div class="prog" id="pProg"><div class="track" aria-hidden="true"><i id="pBar"></i></div><div class="times"><span id="pEl" aria-label="Time played">0:00</span><span id="pLeft"></span></div></div>
    <div class="ctl"><label class="len">⏲️ Stop after <select id="${minsId}">${mins.map(([v, t]) => `<option value="${v}"${v === S.mins ? " selected" : ""}>${t}</option>`).join("")}</select></label></div>
  </section>`;
}

// ---------- how long it has played and how long is left (calm sounds and calm music each keep their own clock) ----------
const SESS = {
  sounds: { start: 0, mins: data.smins ?? 10, key: "smins", stat: "sstat", over: "The sound faded out. 💤", stop: () => stopSound(), items: () => SOUNDS, now: () => snd && snd.kind },
  music: { start: 0, mins: data.mmins ?? 20, key: "mmins", stat: "mstat", over: "The music faded away. 💤", stop: () => stopMusic(8), items: () => PIECES, now: () => playingMusic() },
};
const clock = (secs) => { const t = Math.max(0, Math.floor(secs)), h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), x = String(t % 60).padStart(2, "0"); return h ? `${h}:${String(m).padStart(2, "0")}:${x}` : `${m}:${x}`; };
const lasts = (m) => (m ? `Stops after ${m >= 60 ? "1 hour" : `${m} minutes`}.` : "Plays until you stop it.");
let clockT = 0;
// runs twice a second while anything plays: stops what has reached its time, and shows the time played and the time left
function tick() {
  let any = false;
  for (const [kind, S] of Object.entries(SESS)) {
    if (!S.now()) { S.start = 0; continue; }
    const played = (Date.now() - S.start) / 1000, total = S.mins * 60;
    if (total && played >= total) { S.stop(); S.start = 0; if (data.tab === kind) paintPlaying(S.items(), null, S.stat, S.over); continue; }
    any = true;
    if (data.tab !== kind || !$("pEl")) continue;
    $("pEl").textContent = clock(played);
    $("pLeft").textContent = total ? `${clock(total - played)} left` : "No time limit";
    $("pBar").style.width = total ? `${Math.min(100, (played / total) * 100)}%` : "100%";
    $("pProg").classList.toggle("open", !total);
  }
  if (!any) { clearInterval(clockT); clockT = 0; }
}
// something has just started playing
function begin(kind) { SESS[kind].start = Date.now(); if (!clockT) clockT = setInterval(tick, 500); tick(); }
// the "Stop after" choice: remembered, and it takes effect straight away, even while something is playing
function watchMins(kind, selId) {
  const S = SESS[kind];
  $(selId).addEventListener("change", () => {
    S.mins = Number($(selId).value); data[S.key] = S.mins; save();
    if (S.now()) { $(S.stat).textContent = lasts(S.mins); tick(); }
  });
}
// mark which item is playing, and show it in the player
function paintPlaying(items, id, statId, stat) {
  view.querySelectorAll(".item").forEach((b) => { const on = b.dataset.id === id; b.classList.toggle("on", on); b.setAttribute("aria-pressed", String(on));  });
  const it = items.find((x) => x.id === id), pl = $("player");
  if (!pl) return;
  pl.classList.toggle("on", !!it);
  $("npE").textContent = it ? it.emoji : "🎶";
  $("npN").textContent = it ? it.name : "Nothing yet";
  if (stat !== undefined && $(statId)) $(statId).textContent = stat;
}

// ---------- calm sounds (made in the browser) ----------
let snd = null; // { nodes, stop() }
function noiseBuffer(a, kind) {
  const len = a.sampleRate * 4, buf = a.createBuffer(1, len, a.sampleRate), d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i += 1) { const w = Math.random() * 2 - 1; if (kind === "brown") { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } else d[i] = w; }
  return buf;
}
function startSound(kind, vol) {
  stopSound();
  const a = ac();
  if (!a) return;
  const master = a.createGain();
  master.gain.value = 0;
  master.gain.linearRampToValueAtTime(vol, a.currentTime + 2);
  master.connect(a.destination);
  const nodes = [master], timers = [];
  const loopNoise = (type, filterType, freq, q, gain) => {
    const src = a.createBufferSource(); src.buffer = noiseBuffer(a, type); src.loop = true;
    const f = a.createBiquadFilter(); f.type = filterType; f.frequency.value = freq; f.Q.value = q;
    const g = a.createGain(); g.gain.value = gain;
    src.connect(f).connect(g).connect(master); src.start();
    nodes.push(src, f, g);
    return { f, g };
  };
  if (kind === "rain") {
    loopNoise("white", "highpass", 900, 0.4, 0.22);
    loopNoise("brown", "lowpass", 600, 0.5, 0.5);
    const drip = () => { const o = a.createOscillator(), g = a.createGain(); o.frequency.value = 1800 + Math.random() * 2400; const t = a.currentTime; g.gain.setValueAtTime(0.03, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05); o.connect(g).connect(master); o.start(t); o.stop(t + 0.06); timers.push(setTimeout(drip, 40 + Math.random() * 160)); };
    drip();
  } else if (kind === "waves") {
    const { g } = loopNoise("brown", "lowpass", 700, 0.6, 0.6);
    const lfo = a.createOscillator(), lg = a.createGain();
    lfo.frequency.value = 0.09; lg.gain.value = 0.45;
    lfo.connect(lg).connect(g.gain); lfo.start(); nodes.push(lfo, lg);
  } else if (kind === "wind") {
    const { f } = loopNoise("white", "bandpass", 500, 1.2, 0.35);
    const lfo = a.createOscillator(), lg = a.createGain();
    lfo.frequency.value = 0.07; lg.gain.value = 300;
    lfo.connect(lg).connect(f.frequency); lfo.start(); nodes.push(lfo, lg);
  } else if (kind === "chimes") {
    const scale = [523, 587, 659, 784, 880, 1047];
    const ring = () => { const fr = scale[Math.floor(Math.random() * scale.length)]; const o = a.createOscillator(), g = a.createGain(); o.frequency.value = fr; const t = a.currentTime; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.12, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 3.5); o.connect(g).connect(master); o.start(t); o.stop(t + 3.6); timers.push(setTimeout(ring, 600 + Math.random() * 2200)); };
    ring();
    loopNoise("brown", "lowpass", 300, 0.5, 0.15);
  }
  snd = { kind, master, stop: () => { timers.forEach(clearTimeout); const t = a.currentTime; master.gain.cancelScheduledValues(t); master.gain.setValueAtTime(master.gain.value, t); master.gain.linearRampToValueAtTime(0, t + 1); setTimeout(() => nodes.forEach((n) => { try { n.stop && n.stop(); } catch (err) { /* done */ } try { n.disconnect(); } catch (err) { /* done */ } }), 1100); } };
}
function stopSound() { if (snd) { snd.stop(); snd = null; } }
const SOUNDS = [
  { id: "rain", emoji: "🌧️", name: "Gentle rain", about: "Soft rain with little drips" },
  { id: "waves", emoji: "🌊", name: "Ocean waves", about: "Slow waves rolling in and out" },
  { id: "wind", emoji: "🍃", name: "Soft wind", about: "A breeze moving through the trees" },
  { id: "chimes", emoji: "🎐", name: "Wind chimes", about: "Bright little chimes, now and then" },
];
function viewSounds() {
  const now = snd ? SOUNDS.find((x) => x.id === snd.kind) : null;
  view.innerHTML = `<p class="tip">Choose a sound, get comfy, and close your eyes if you like. The sounds are made right here on your device.</p>
    <div class="groups">${groupHTML("g-sounds", "🎧", "Nature sounds", "Calm sounds from the world outside", SOUNDS, now && now.id)}</div>
    ${playerHTML({ kind: "sounds", minsId: "mins", mins: [[5, "5 minutes"], [10, "10 minutes"], [20, "20 minutes"], [60, "1 hour"], [0, "Don't stop"]], stopId: "stopS", statId: "sstat", now })}`;
  const paint = (stat) => paintPlaying(SOUNDS, snd && snd.kind, "sstat", stat);
  const halt = () => { stopSound(); SESS.sounds.start = 0; paint("Choose something above."); };
  view.querySelector(".items").addEventListener("click", (e) => {
    const b = e.target.closest(".item");
    if (!b) return;
    if (snd && snd.kind === b.dataset.id) { halt(); return; }
    startSound(b.dataset.id, 0.3); // the device's own volume buttons set how loud it is
    paint(lasts(SESS.sounds.mins));
    begin("sounds");
  });
  $("stopS").addEventListener("click", halt);
  watchMins("sounds", "mins");
  if (now) { paint(lasts(SESS.sounds.mins)); tick(); }
  // the sound keeps playing if you switch to another part of Calm Corner, and stops when you leave the page
}
// ---------- calm music (composed as it plays, music.js) ----------
const MOODS = [["Meditation", "🧘", "g-med", "Slow, deep and still"], ["Relax", "🌿", "g-relax", "Soft and gentle, for a quiet moment"], ["Sleep", "🌙", "g-sleep", "Quiet music for drifting off"]];
function viewMusic() {
  const id = playingMusic(), now = PIECES.find((p) => p.id === id);
  view.innerHTML = `<p class="tip">Gentle instrumental music, made right here on your device, so it never sounds quite the same twice. It can play along with the calm sounds too.</p>
    <div class="groups">${MOODS.map(([m, e, cls, sub]) => groupHTML(cls, e, m, sub, PIECES.filter((p) => p.mood === m), id)).join("")}</div>
    ${playerHTML({ kind: "music", minsId: "mmins", mins: [[10, "10 minutes"], [20, "20 minutes"], [30, "30 minutes"], [60, "1 hour"], [0, "Don't stop"]], stopId: "mstop", statId: "mstat", now })}`;
  const paint = (stat) => paintPlaying(PIECES, playingMusic(), "mstat", stat);
  const halt = () => { stopMusic(); SESS.music.start = 0; paint("Choose something above."); };
  view.querySelectorAll(".item").forEach((b) => b.addEventListener("click", () => {
    if (playingMusic() === b.dataset.id) { halt(); return; }
    playMusic(b.dataset.id, 0.42, ac()); // the device's own volume buttons set how loud it is
    paint(lasts(SESS.music.mins));
    begin("music");
  }));
  $("mstop").addEventListener("click", halt);
  watchMins("music", "mmins");
  if (now) { paint(lasts(SESS.music.mins)); tick(); }
}
window.addEventListener("pagehide", () => { stopSound(); stopMusic(0.2); hush(); });
// the phone's audio was stuck and has been replaced (sound.js): what was "playing" can't be heard, so stop it and show it stopped
window.addEventListener("z210:audio-reset", () => {
  stopMusic(0); stopSound(); SESS.music.start = 0; SESS.sounds.start = 0;
  // repaint in place (redrawing now would swallow the tap that is happening), so that tap starts it again with sound
  if ($("mstat")) paintPlaying(PIECES, null, "mstat", "Choose something above.");
  if ($("sstat")) paintPlaying(SOUNDS, null, "sstat", "Choose something above.");
});

voiceBtn();
setTab(data.tab);
window.__calm = { startSound, stopSound };
