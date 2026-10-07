// Calm Corner: breathing with a growing and shrinking circle, a feelings check-in, the 5-4-3-2-1 senses exercise,
// and calming sounds made right in the browser (rain, waves, wind, chimes). Everything stays on this device.
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

function speak(text) {
  if (!data.voice || !window.speechSynthesis) return;
  speechSynthesis.cancel();
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
const TABS = { breathe: viewBreathe, feel: viewFeel, senses: viewSenses, sounds: viewSounds };
let cleanup = () => {};
function setTab(tab) {
  cleanup(); cleanup = () => {};
  data.tab = TABS[tab] ? tab : "breathe"; save();
  document.querySelectorAll("#tabs .g-chip").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.tab === data.tab)));
  TABS[data.tab]();
}
$("tabs").addEventListener("click", (e) => { const b = e.target.closest("[data-tab]"); if (b) setTab(b.dataset.tab); });
const voiceBtn = () => { $("voice").textContent = data.voice ? "🗣️ Voice on" : "🔇 Voice off"; $("voice").setAttribute("aria-pressed", String(data.voice)); };
$("voice").addEventListener("click", () => { data.voice = !data.voice; save(); voiceBtn(); if (!data.voice && window.speechSynthesis) speechSynthesis.cancel(); });

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
    <p class="tip">${p.tip}</p>
    <div class="breath"><div class="ring" id="ring"><div class="ball" id="ball"></div><div class="say"><b id="phase">Ready?</b><span id="count"></span></div></div><div class="bar" id="bar" aria-hidden="true"><i></i></div></div>
    <p class="rounds" id="rounds" aria-live="polite"></p>
    <div class="row"><button class="g-btn" id="go">▶ Start</button>
      <label class="len">Breaths <select id="n"><option>3</option><option selected>5</option><option>10</option></select></label></div>`;
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
      if (breath >= total) { stop("Well done 💛"); bell(396, 0.08, 4); speak("Well done. Notice how you feel now."); $("rounds").textContent = `${total} calm breaths. Notice how your body feels now.`; return; }
      const [kind, secs] = p.steps[step];
      $("phase").textContent = WORD[kind];
      $("rounds").textContent = `Breath ${breath + 1} of ${total}`;
      speak(WORD[kind]);
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
const FEELINGS = [
  ["😊", "Happy", "That's lovely! Who could you share your happy feeling with?", "sounds"],
  ["😌", "Calm", "Calm is a great feeling. Enjoy it for a moment: take one slow breath and smile.", "sounds"],
  ["🤩", "Excited", "Excitement is full of energy! If it feels too big, try a few balloon breaths to settle.", "breathe"],
  ["😢", "Sad", "It's okay to feel sad. You could talk to someone you trust, have a hug, or do something gentle.", "breathe"],
  ["😠", "Angry", "It's okay to feel angry. Try squeezing your hands tight, then letting go, and take five slow breaths.", "breathe"],
  ["😟", "Worried", "Worries can feel heavy. Try the 5-4-3-2-1 senses game to bring your mind back to right now.", "senses"],
  ["😨", "Scared", "Being scared is your body trying to keep you safe. Find a grown-up you trust, and breathe slowly together.", "breathe"],
  ["😤", "Frustrated", "When something is hard, take a break. Breathe, have a drink of water, then try again.", "breathe"],
  ["😴", "Tired", "Your body might need rest. Try sleepy breathing, or listen to some calm sounds.", "sounds"],
  ["🥺", "Lonely", "Feeling lonely is hard. Who could you call, play with, or sit next to today?", "senses"],
];
const KIND = ["You are braver than you think.", "It's okay to make mistakes. That's how we learn.", "Your feelings matter.", "You can do hard things, one small step at a time.", "Take your time. There's no rush.", "You are kind, and kindness is strong.", "Every day is a fresh start.", "It's okay to ask for help.", "You are loved.", "Breathe. You're doing great."];
function viewFeel() {
  const recent = data.diary.slice(-7).reverse();
  view.innerHTML = `<p class="tip">How are you feeling right now? Tap the face that fits. All feelings are okay.</p>
    <div class="feels">${FEELINGS.map(([e, n], i) => `<button class="feel" data-i="${i}"><span>${e}</span>${n}</button>`).join("")}</div>
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
    speak(`${name}. ${msg}`);
  });
  $("nextKind").addEventListener("click", () => { const k = KIND[Math.floor(Math.random() * KIND.length)]; $("kind").textContent = k; speak(k); });
  const cd = $("clearDiary");
  if (cd) cd.addEventListener("click", () => { data.diary = []; save(); viewFeel(); });
}

// ---------- 5-4-3-2-1 ----------
const SENSES = [[5, "👀", "things you can see", "Look around slowly. Name them out loud or in your head."], [4, "✋", "things you can touch", "Your clothes, the floor, a cushion... how do they feel?"], [3, "👂", "things you can hear", "Listen carefully: near sounds and far-away sounds."], [2, "👃", "things you can smell", "If you can't smell anything, think of two smells you like."], [1, "👅", "thing you can taste", "Or think of your favourite taste."]];
function viewSenses() {
  let s = 0, got = 0;
  const draw = () => {
    if (s >= SENSES.length) {
      view.innerHTML = `<div class="senses done"><p class="big">🌈</p><h2>All done!</h2><p>You brought your mind back to right now. How do you feel?</p><button class="g-btn" id="again">Do it again</button></div>`;
      $("again").addEventListener("click", viewSenses);
      bell(396, 0.08, 4);
      speak("All done. You brought your mind back to right now.");
      return;
    }
    const [n, e, what, tip] = SENSES[s];
    view.innerHTML = `<div class="senses"><p class="step">Step ${s + 1} of 5</p><p class="big">${e}</p><h2>Find <b>${n}</b> ${what}</h2><p class="tip">${tip}</p>
      <div class="dots" role="group" aria-label="Tap one for each thing you find">${Array.from({ length: n }, (_, i) => `<button class="dot${i < got ? " on" : ""}" data-i="${i}" aria-label="Found ${i + 1}">${i < got ? "✓" : i + 1}</button>`).join("")}</div>
      <p class="tip small">Tap a circle each time you find one.</p></div>`;
    view.querySelectorAll(".dot").forEach((b) => b.addEventListener("click", () => {
      if (Number(b.dataset.i) !== got) return;
      got += 1; bell(528 + got * 66, 0.05, 1.2);
      if (got === n) { s += 1; got = 0; setTimeout(draw, 700); }
      draw();
    }));
    if (got === 0) speak(`Find ${n} ${what}.`);
  };
  draw();
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
function viewSounds() {
  const S = [["rain", "🌧️", "Gentle rain"], ["waves", "🌊", "Ocean waves"], ["wind", "🍃", "Soft wind"], ["chimes", "🎐", "Wind chimes"]];
  view.innerHTML = `<p class="tip">Choose a sound, get comfy, and close your eyes if you like. The sounds are made right here on your device.</p>
    <div class="sounds">${S.map(([k, e, n]) => `<button class="snd${snd && snd.kind === k ? " on" : ""}" data-k="${k}" aria-pressed="${!!(snd && snd.kind === k)}"><span>${e}</span>${n}</button>`).join("")}</div>
    <div class="row"><label class="len">Volume <input type="range" id="vol" min="0.05" max="1" step="0.05" value="0.5"></label>
      <label class="len">Stop after <select id="mins"><option value="5">5 minutes</option><option value="10" selected>10 minutes</option><option value="20">20 minutes</option><option value="0">Don't stop</option></select></label>
      <button class="g-btn ghost" id="stopS">⏹ Stop</button></div><p class="tip small" id="sstat" aria-live="polite"></p>`;
  let endT = 0;
  const play = (k) => {
    startSound(k, Number($("vol").value) * 0.6);
    view.querySelectorAll(".snd").forEach((b) => { b.classList.toggle("on", b.dataset.k === k); b.setAttribute("aria-pressed", String(b.dataset.k === k)); });
    clearTimeout(endT);
    const m = Number($("mins").value);
    if (m) endT = setTimeout(() => { stopSound(); view.querySelectorAll(".snd").forEach((b) => b.classList.remove("on")); $("sstat").textContent = "The sound faded out. 💤"; }, m * 60000);
    $("sstat").textContent = m ? `Playing. It will fade out after ${m} minutes.` : "Playing.";
  };
  view.querySelector(".sounds").addEventListener("click", (e) => { const b = e.target.closest(".snd"); if (!b) return; if (snd && snd.kind === b.dataset.k) { stopSound(); b.classList.remove("on"); $("sstat").textContent = ""; } else play(b.dataset.k); });
  $("vol").addEventListener("input", () => { if (snd) { const a = ac(); snd.master.gain.cancelScheduledValues(a.currentTime); snd.master.gain.setValueAtTime(Number($("vol").value) * 0.6, a.currentTime); } });
  $("stopS").addEventListener("click", () => { stopSound(); clearTimeout(endT); view.querySelectorAll(".snd").forEach((b) => b.classList.remove("on")); $("sstat").textContent = ""; });
  // the sound keeps playing if you switch to another part of Calm Corner, and stops when you leave the page
}
window.addEventListener("pagehide", stopSound);

voiceBtn();
setTab(data.tab);
window.__calm = { startSound, stopSound };
