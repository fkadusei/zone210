// Hello World: say hello around the world, learn everyday phrases in ten languages, then test yourself.
// Words are read aloud by the device's own voice for each language (most phones and computers have them).
import { LANGS, MEANINGS, NOTES } from "./data.js";

const $ = (id) => document.getElementById(id);
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const store = {
  get(key, fallback) { try { const raw = localStorage.getItem(key); return raw === null ? fallback : JSON.parse(raw); } catch (err) { return fallback; } },
  set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (err) { /* private mode */ } },
};
const KEY = "zone210_hello";
const data = { tab: "world", lang: "es", seen: {}, stars: 0, muted: false, ...store.get(KEY, {}) };
const save = () => store.set(KEY, data);
const rnd = (n) => Math.floor(Math.random() * n);
const shuffle = (a) => { for (let i = a.length - 1; i > 0; i -= 1) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const L = () => LANGS.find((l) => l.id === data.lang) || LANGS[0];

// ---------- voices ----------
const synth = window.speechSynthesis;
let voices = [];
const loadVoices = () => { voices = synth ? synth.getVoices() : []; };
if (synth) { loadVoices(); if (synth.addEventListener) synth.addEventListener("voiceschanged", loadVoices); }
const voiceFor = (lang) => { const base = lang.split("-")[0].toLowerCase(); return voices.find((v) => v.lang.replace("_", "-").toLowerCase() === lang.toLowerCase()) || voices.find((v) => v.lang.toLowerCase().startsWith(base)); };
function say(lang, text, note) {
  if (data.muted || !synth) return;
  synth.cancel();
  const v = voiceFor(lang.lang);
  if (!v && voices.length) { if (note) note(`Your device doesn't have a ${lang.name} voice. Use the “say it” guide instead.`); return; }
  const u = new SpeechSynthesisUtterance(text.replace(/…/g, " "));
  if (v) u.voice = v;
  u.lang = lang.lang;
  u.rate = 0.8;
  synth.speak(u);
}
function tone(freqs, type = "sine", vol = 0.14) {
  if (data.muted) return;
  const ac = window.z210Audio && window.z210Audio.get();
  if (!ac) return;
  freqs.forEach((f, i) => { const o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.value = f; const t = ac.currentTime + i * 0.08; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.26); o.connect(g).connect(ac.destination); o.start(t); o.stop(t + 0.28); });
}
const yes = () => tone([660, 880, 1320]);
const no = () => tone([240, 190], "triangle");

// ---------- tabs ----------
const view = $("view");
const TABS = { world: viewWorld, learn: viewLearn, quiz: () => startQuiz() };
function setTab(tab) {
  data.tab = TABS[tab] ? tab : "world"; save();
  document.querySelectorAll("#tabs .g-chip").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.tab === data.tab)));
  TABS[data.tab]();
}
$("tabs").addEventListener("click", (e) => { const b = e.target.closest("[data-tab]"); if (b) setTab(b.dataset.tab); });
const paintStars = () => { $("stars").textContent = `⭐ ${data.stars}`; };
const muteBtn = () => { $("mute").textContent = data.muted ? "🔇 Sound off" : "🔊 Sound on"; $("mute").setAttribute("aria-pressed", String(!data.muted)); };
$("mute").addEventListener("click", () => { data.muted = !data.muted; save(); muteBtn(); if (data.muted && synth) synth.cancel(); });
const langPicker = () => `<div class="langs" role="group" aria-label="Language">${LANGS.map((l) => `<button class="g-chip" data-lang="${l.id}" aria-pressed="${l.id === data.lang}">${esc(l.name)}</button>`).join("")}</div>`;
view.addEventListener("click", (e) => { const b = e.target.closest("[data-lang]"); if (b && !b.closest(".world")) { data.lang = b.dataset.lang; save(); TABS[data.tab](); } });
const seenOf = (id) => data.seen[id] || [];
const scriptAttrs = (l) => `lang="${l.lang}"${l.rtl ? ' dir="rtl"' : ""}`;

// Hello around the world
function viewWorld() {
  view.innerHTML = `<p class="intro">Tap a card to hear “hello” in that language. Then choose one to learn more.</p>
    <div class="world">${LANGS.map((l) => `<button class="hello" data-w="${l.id}" style="--c:${l.color}"><span class="hw" ${scriptAttrs(l)}>${esc(l.words[0][0])}</span>${l.words[0][1] ? `<span class="rom">${esc(l.words[0][1])}</span>` : ""}<b>${esc(l.name)}</b><small>${esc(l.where)}</small><span class="prog">${seenOf(l.id).length} of ${MEANINGS.length} learned</span></button>`).join("")}</div><p class="note" id="note" aria-live="polite"></p>`;
  view.querySelector(".world").addEventListener("click", (e) => {
    const b = e.target.closest(".hello");
    if (!b) return;
    const l = LANGS.find((x) => x.id === b.dataset.w);
    say(l, l.words[0][0], (t) => { $("note").textContent = t; });
    if (b.classList.contains("on")) { data.lang = l.id; save(); setTab("learn"); return; }
    view.querySelectorAll(".hello").forEach((x) => x.classList.toggle("on", x === b));
    $("note").textContent = `Tap ${l.name} again to learn more ${l.name}.`;
  });
}

// Learn: the phrase cards
function viewLearn() {
  const l = L();
  view.innerHTML = `${langPicker()}<div class="langhead" style="--c:${l.color}"><span class="native" ${scriptAttrs(l)}>${esc(l.native)}</span><div><b>${esc(l.name)}</b><small>Spoken in ${esc(l.where)}.</small></div></div>
    <div class="cards">${l.words.map((w, i) => `<button class="card${seenOf(l.id).includes(i) ? " seen" : ""}" data-i="${i}" style="--c:${l.color}"><span class="mean">${esc(MEANINGS[i])}</span><span class="word" ${scriptAttrs(l)}>${esc(w[0])}</span>${w[1] ? `<span class="rom">${esc(w[1])}</span>` : ""}<span class="guide">🗣️ ${esc(w[2])}</span>${NOTES[`${l.id}:${i}`] ? `<span class="tipnote">${esc(NOTES[`${l.id}:${i}`])}</span>` : ""}</button>`).join("")}</div><p class="note" id="note" aria-live="polite"></p>
    <p class="intro small">Tap a card to hear it. The 🗣️ line shows how to say it: the part in CAPITALS is said a little louder.</p>`;
  view.querySelector(".cards").addEventListener("click", (e) => {
    const b = e.target.closest(".card");
    if (!b) return;
    const i = Number(b.dataset.i);
    say(l, l.words[i][0], (t) => { $("note").textContent = t; });
    b.classList.add("seen");
    const s = seenOf(l.id);
    if (!s.includes(i)) { data.seen[l.id] = [...s, i]; save(); }
  });
}

// Quiz: ten questions, both ways round
const ROUNDS = 10;
let Q = null;
function startQuiz() { Q = { n: 0, got: 0, last: [] }; nextQ(); }
function nextQ() {
  const l = L();
  if (Q.n >= ROUNDS) {
    view.innerHTML = `${langPicker()}<div class="done"><p class="big">🌍</p><h2>Fantastic!</h2><p>You got ${Q.got} of ${ROUNDS} right first time in ${esc(l.name)}.</p><p class="starsrow">${"⭐".repeat(Q.got)}</p><button class="g-btn" id="again">Play again</button></div>`;
    $("again").addEventListener("click", startQuiz);
    yes();
    return;
  }
  let i;
  do { i = rnd(MEANINGS.length); } while (Q.last.includes(i));
  Q.last = [...Q.last.slice(-4), i];
  Q.tries = 0;
  const others = shuffle(Array.from({ length: MEANINGS.length }, (_, k) => k).filter((k) => k !== i)).slice(0, 3);
  const opts = shuffle([i, ...others]);
  const fromWord = Q.n % 2 === 0; // even questions: what does this mean? odd: how do you say this?
  const meter = Array.from({ length: ROUNDS }, (_, k) => `<i class="${k < Q.n ? "done" : k === Q.n ? "now" : ""}"></i>`).join("");
  view.innerHTML = `${langPicker()}<div class="meter">${meter}</div>
    ${fromWord ? `<p class="q">What does this mean?</p><button class="big-word" id="hear" style="--c:${l.color}"><span ${scriptAttrs(l)}>${esc(l.words[i][0])}</span>${l.words[i][1] ? `<small>${esc(l.words[i][1])}</small>` : ""}<em>🔊 Tap to hear</em></button>`
      : `<p class="q">How do you say <b>“${esc(MEANINGS[i])}”</b> in ${esc(l.name)}?</p>`}
    <div class="choices">${opts.map((k) => `<button class="choice" data-k="${k}">${fromWord ? esc(MEANINGS[k]) : `<span ${scriptAttrs(l)}>${esc(l.words[k][0])}</span>${l.words[k][1] ? `<small>${esc(l.words[k][1])}</small>` : ""}`}</button>`).join("")}</div><p class="note" id="note" aria-live="polite"></p>`;
  if (fromWord) { $("hear").addEventListener("click", () => say(l, l.words[i][0], (t) => { $("note").textContent = t; })); say(l, l.words[i][0]); }
  view.querySelectorAll(".choice").forEach((b) => b.addEventListener("click", () => {
    const k = Number(b.dataset.k);
    if (!fromWord) say(l, l.words[k][0]);
    if (k === i) {
      b.classList.add("right"); yes();
      if (Q.tries === 0) { Q.got += 1; data.stars += 1; save(); paintStars(); }
      view.querySelectorAll(".choice").forEach((x) => { x.disabled = true; });
      Q.n += 1;
      setTimeout(nextQ, 1300);
    } else { b.classList.add("wrong"); b.disabled = true; Q.tries += 1; no(); }
  }));
}

paintStars();
muteBtn();
setTab(data.tab);
