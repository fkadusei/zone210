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

// ---------- sound ----------
const SETTINGS_KEY = "zone210_lab_settings";
const settings = { lab: "chem", tab: {}, muted: false, ...store.get(SETTINGS_KEY, {}) };
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
    amp.gain.exponentialRampToValueAtTime(gain, t + 0.015);
    amp.gain.exponentialRampToValueAtTime(0.0001, t + length);
    osc.connect(amp).connect(audio.destination);
    osc.start(t);
    osc.stop(t + length + 0.02);
  } catch (err) {
    /* audio unavailable */
  }
}
const sfx = {
  pick: () => tone(520, 0, 0.06, "triangle", 0.06),
  right: () => [523, 659, 784].forEach((f, i) => tone(f, i * 0.08, 0.16, "triangle", 0.09)),
  wrong: () => [220, 170].forEach((f, i) => tone(f, i * 0.1, 0.18, "sawtooth", 0.06)),
  done: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, i * 0.1, 0.22, "triangle", 0.1)),
  pop: () => tone(760, 0, 0.05, "sine", 0.07),
  boom: () => {
    tone(120, 0, 0.25, "sawtooth", 0.09);
    tone(70, 0.03, 0.3, "sine", 0.1);
  },
};

let toastTimer = 0;
function toast(text, kind = "", ms = 2200) {
  const t = $("toast");
  t.textContent = text;
  t.className = "toast show" + (kind ? ` ${kind}` : "");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), ms);
}

// end-of-round overlay shared by every activity
function showEnd({ emoji, title, text, missed = [], again, close }) {
  $("endEmoji").textContent = emoji;
  $("endTitle").textContent = title;
  $("endText").textContent = text;
  const m = $("missed");
  m.hidden = !missed.length;
  m.innerHTML = missed.length ? `<b>Worth another look</b>${missed.map((x) => `<span>${String(x).replace(/[&<]/g, "")}</span>`).join("")}` : "";
  $("end").classList.add("show");
  sfx.done();
  $("endAgain").onclick = () => {
    $("end").classList.remove("show");
    again && again();
  };
  $("endClose").onclick = () => {
    $("end").classList.remove("show");
    close && close();
  };
}

const ctx = { $, store, sfx, toast, showEnd, elements: null, saverOn: () => !!(window.z210Saver && window.z210Saver.on) };

// ---------- labs and their activities ----------
const LABS = {
  chem: { tabs: [["table", "🔎 Periodic table", "chem", "mountTable"], ["challenge", "🎯 Element challenges", "chem", "mountChallenge"]] },
  phys: { tabs: [["launch", "🚀 Launch lab", "physics", "mountLaunch"], ["pendulum", "🕰️ Pendulum lab", "physics", "mountPendulum"]] },
  bio: { tabs: [["cell", "🔬 Cell explorer", "bio", "mountCell"], ["dna", "🧬 DNA pairing", "bio", "mountDNA"]] },
  quiz: { tabs: [["quiz", "❓ Lab quiz", "quiz", "mountQuiz"], ["daily", "📅 Daily experiment", "daily", "mountDaily"]] },
};
let dispose = () => {};
async function open(lab, tab) {
  dispose();
  dispose = () => {};
  const def = LABS[lab];
  const t = def.tabs.find((x) => x[0] === (tab || settings.tab[lab])) || def.tabs[0];
  settings.lab = lab;
  settings.tab[lab] = t[0];
  store.set(SETTINGS_KEY, settings);
  document.querySelectorAll("#labs .lab-btn").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.lab === lab)));
  const tabs = $("tabs");
  tabs.hidden = def.tabs.length < 2;
  tabs.innerHTML = def.tabs.map((x) => `<button class="g-chip" data-tab="${x[0]}" aria-pressed="${x[0] === t[0]}">${x[1]}</button>`).join("");
  tabs.querySelectorAll("button").forEach((b) => b.addEventListener("click", () => open(lab, b.dataset.tab)));
  const body = $("body");
  body.innerHTML = `<div class="g-panel"><p style="margin:0;color:var(--muted)">Loading…</p></div>`;
  try {
    if (!ctx.elements) ctx.elements = await (await fetch("data/elements.json")).json();
    const mod = await import(`./${t[2]}.js`);
    body.innerHTML = "";
    const stop = await mod[t[3]](body, ctx);
    dispose = typeof stop === "function" ? stop : () => {};
  } catch (err) {
    console.error(err);
    body.innerHTML = `<div class="g-panel"><p style="margin:0">This part of the lab isn't ready yet. Try another activity.</p></div>`;
  }
}

document.querySelectorAll("#labs .lab-btn").forEach((b) => b.addEventListener("click", () => open(b.dataset.lab)));
const mute = $("mute");
const syncMute = () => {
  mute.textContent = settings.muted ? "Sound Off" : "Sound On";
  mute.setAttribute("aria-pressed", String(settings.muted));
};
mute.addEventListener("click", () => {
  settings.muted = !settings.muted;
  store.set(SETTINGS_KEY, settings);
  syncMute();
});
syncMute();
open(LABS[settings.lab] ? settings.lab : "chem");
window.__lab = { open, ctx, LABS, get settings() { return settings; } };
