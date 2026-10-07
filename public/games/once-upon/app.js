// Once Upon a Time: classic tales as living picture books. Choices, little activities, endings to find,
// and narration in recorded voices (or the device's own voice).
import { STORIES, SHELVES } from "./stories.js";
import { artHTML } from "./art.js";
import { runAct } from "./acts.js";

const $ = (id) => document.getElementById(id);
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const store = {
  get(key, fallback) { try { const raw = localStorage.getItem(key); return raw === null ? fallback : JSON.parse(raw); } catch (err) { return fallback; } },
  set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (err) { /* private mode */ } },
};
const KEY = "zone210_onceupon";
const data = { found: {}, resume: {}, size: 1, speak: false, voice: "", narrator: "bf_emma", shelf: "all", ...store.get(KEY, {}) };
const save = () => store.set(KEY, data);

let story = null;
let cur = null; // { id, trail: [ids] }
const byId = Object.fromEntries(STORIES.map((s) => [s.id, s]));
const foundOf = (id) => data.found[id] || [];
const endsOf = (s) => Object.values(s.scenes).filter((x) => x.end).map((x) => x.end);

// ---------- little sounds ----------
function tone(freqs, type = "sine", vol = 0.16) {
  const ac = window.z210Audio && window.z210Audio.get();
  if (!ac) return;
  freqs.forEach((f, i) => {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.value = f;
    const t = ac.currentTime + i * 0.08;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
    o.connect(g).connect(ac.destination); o.start(t); o.stop(t + 0.3);
  });
}
const sfx = { tap: () => tone([520]), yes: (n = 1) => tone([440 * Math.pow(1.06, Math.min(n, 12))]), no: () => tone([240, 190], "triangle"), win: () => tone([523, 659, 784, 1047]) };

// ---------- read aloud ----------
const NARRATORS = [["bf_emma", "Emma (British woman)"], ["bm_george", "George (British man)"], ["af_heart", "Heart (American woman)"], ["device", "My device's voice"]];
const synth = window.speechSynthesis;
const player = new Audio();
let clipIndex = null;
let playToken = 0;
let voices = [];
function loadVoices() {
  voices = (synth ? synth.getVoices() : []).filter((v) => /^en/i.test(v.lang));
  const sel = $("devvoice");
  sel.innerHTML = voices.map((v) => `<option value="${esc(v.name)}">${esc(v.name)} (${esc(v.lang)})</option>`).join("");
  const chosen = voices.find((v) => v.name === data.voice) || voices[0];
  if (chosen) sel.value = chosen.name;
  syncVoiceBar();
}
function deviceSay(text) {
  if (!synth) return;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const v = voices.find((x) => x.name === data.voice) || voices[0];
  if (v) { u.voice = v; u.lang = v.lang; } else u.lang = "en-GB";
  u.rate = 0.9;
  synth.speak(u);
}
const stopSay = () => { playToken += 1; player.pause(); if (synth) synth.cancel(); };
async function loadIndex() {
  if (clipIndex) return clipIndex;
  try { clipIndex = await (await fetch("audio/index.json")).json(); } catch (err) { clipIndex = {}; }
  return clipIndex;
}
/** Plays recorded clips one after another; falls back to the device's voice reading `text`. */
async function speak(keys, text) {
  stopSay();
  const my = playToken;
  const idx = await loadIndex();
  if (my !== playToken) return;
  const nar = data.narrator;
  const have = nar !== "device" && keys.every((k) => (idx[nar] || []).includes(k));
  if (!have) { deviceSay(text); return; }
  for (const k of keys) {
    if (my !== playToken) return;
    player.src = `audio/${nar}/${k}.m4a`;
    try { await player.play(); } catch (err) { deviceSay(text); return; }
    await new Promise((r) => { player.onended = r; player.onerror = r; player.onpause = () => { if (my !== playToken) r(); }; });
  }
}
const NUM = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];
const sceneKeys = () => { const sc = story.scenes[cur.id]; return [`${story.id}/${cur.id}`, ...(sc.end ? [`${story.id}/end-${cur.id}`] : [])]; };
const sceneSpoken = () => { const sc = story.scenes[cur.id]; return sc.text.join(" ") + (sc.end ? ` The end: ${sc.end.title}. ${sc.end.moral} Think about it: ${sc.end.think}` : ""); };
function syncVoiceBar() {
  const sel = $("narrator");
  sel.innerHTML = NARRATORS.filter(([k]) => k !== "device" || synth).map(([k, label]) => `<option value="${k}">${label}</option>`).join("");
  sel.value = data.narrator;
  $("devvoice").hidden = data.narrator !== "device" || !voices.length;
}
if (synth) { loadVoices(); if (synth.addEventListener) synth.addEventListener("voiceschanged", loadVoices); }
$("narrator").addEventListener("change", () => { data.narrator = $("narrator").value; save(); syncVoiceBar(); speak(["sample"], "Once upon a time, in a land far away..."); });
$("devvoice").addEventListener("change", () => { data.voice = $("devvoice").value; save(); deviceSay("Once upon a time, in a land far away..."); });
const syncSpeak = () => { $("speak").setAttribute("aria-pressed", String(data.speak)); $("speak").textContent = data.speak ? "🔊 Reading aloud" : "🔊 Read to me"; };
$("speak").addEventListener("click", () => { data.speak = !data.speak; save(); syncSpeak(); if (!data.speak) stopSay(); else if (cur) speak(sceneKeys(), sceneSpoken()); });
syncSpeak();
syncVoiceBar();
const SIZES = [1, 1.2, 1.45];
const applySize = () => { document.documentElement.style.setProperty("--fs", `${1.12 * SIZES[data.size]}rem`); $("size").textContent = ["A", "A+", "A++"][data.size]; };
$("size").addEventListener("click", () => { data.size = (data.size + 1) % 3; save(); applySize(); });
applySize();

// ---------- library ----------
function showLibrary() {
  stopSay();
  story = null; cur = null;
  $("reader").hidden = true;
  $("library").hidden = false;
  $("voicebar").hidden = false;
  const total = STORIES.reduce((t, s) => t + foundOf(s.id).length, 0);
  const all = STORIES.reduce((t, s) => t + endsOf(s).length, 0);
  const shelf = SHELVES.includes(data.shelf) ? data.shelf : "all";
  const card = (s) => {
    const f = foundOf(s.id).length, n = endsOf(s).length, r = data.resume[s.id];
    return `<article class="scard" style="--a:${s.colors[0]};--b:${s.colors[1]}"><div class="cover" aria-hidden="true"><span class="big">${s.emoji}</span><small>${s.art}</small></div><div class="body"><span class="topic">${esc(s.topic)}</span><h2>${esc(s.title)}</h2><p>${esc(s.blurb)}</p><p class="from">${esc(s.origin)}</p><div class="meta"><span>${s.ages} · about ${s.mins} min</span><span class="dots" aria-label="${f} of ${n} endings found">${Array.from({ length: n }, (_, i) => `<i class="${i < f ? "on" : ""}"></i>`).join("")}</span></div>${f === n ? '<span class="badge">⭐ All endings found!</span>' : ""}<div class="btns">${r ? `<button class="g-btn" data-act="resume" data-s="${s.id}">Continue</button><button class="g-btn ghost" data-act="start" data-s="${s.id}">Start over</button>` : `<button class="g-btn" data-act="start" data-s="${s.id}">${f ? "Read again" : "Read this story"}</button>`}</div></div></article>`;
  };
  const shelves = (shelf === "all" ? SHELVES : [shelf]).map((sh) => `<h2 class="shelf-title">${esc(sh)}</h2><div class="shelf">${STORIES.filter((s) => s.shelf === sh).map(card).join("")}</div>`).join("");
  $("library").innerHTML = `<p class="intro">Classic stories from around the world, told as living picture books. You make some of the choices, help out with little activities, and different choices lead to different endings. <b>${total} of ${all} endings found.</b></p>
    <div class="g-chips shelves" role="group" aria-label="Shelves">${["all", ...SHELVES].map((sh) => `<button class="g-chip" data-shelf="${esc(sh)}" aria-pressed="${sh === shelf}">${sh === "all" ? "All stories" : esc(sh)}</button>`).join("")}</div>${shelves}`;
}
$("library").addEventListener("click", (e) => {
  const sh = e.target.closest("[data-shelf]");
  if (sh) { data.shelf = sh.dataset.shelf; save(); showLibrary(); return; }
  const b = e.target.closest("[data-act]");
  if (b) openStory(b.dataset.s, b.dataset.act === "resume");
});

// ---------- reader ----------
function openStory(id, resume) {
  story = byId[id];
  if (!story) return;
  if (resume && data.resume[id] && story.scenes[data.resume[id].id]) cur = { ...data.resume[id], trail: [...data.resume[id].trail] };
  else { cur = { id: story.start, trail: [] }; delete data.resume[id]; save(); }
  $("library").hidden = true;
  $("voicebar").hidden = true;
  $("reader").hidden = false;
  $("rTitle").textContent = story.title;
  window.scrollTo(0, 0);
  render();
}
function go(to) {
  stopSay();
  cur.trail.push(cur.id);
  cur.id = to;
  data.resume[story.id] = cur;
  save();
  render();
}
function withVocab(text) {
  const words = Object.keys(story.vocab || {}).sort((a, b) => b.length - a.length);
  const html = esc(text);
  if (!words.length) return html;
  const re = new RegExp(`\\b(${words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\b`, "gi");
  return html.replace(re, (m) => `<button type="button" class="vocab" data-w="${esc(words.find((w) => w.toLowerCase() === m.toLowerCase()))}">${m}</button>`);
}
let pageNo = 0;
function render() {
  const sc = story.scenes[cur.id];
  pageNo += 1;
  $("art").innerHTML = artHTML(sc.act ? { ...sc, art: [] } : sc, pageNo);
  $("text").innerHTML = sc.text.map((p, i) => `<p style="animation-delay:${i * 0.12}s">${withVocab(p)}</p>`).join("");
  $("vdef").hidden = true;
  $("hint").hidden = true;
  $("rPage").textContent = `Page ${cur.trail.length + 1}`;
  const box = $("choices");
  const end = $("endcard");
  end.hidden = true;
  box.innerHTML = "";
  $("back").disabled = !cur.trail.length;
  if (sc.act) {
    // the activity sits over the picture; solving it turns the page
    const host = document.createElement("div");
    $("art").querySelector(".art").appendChild(host);
    runAct(host, sc.act, { sfx, done: (to) => go(to || sc.done), say: (k) => { if (data.speak) speak([k], NUM[Number(k.split("/")[1])] || ""); } });
  } else if (sc.end) {
    const f = foundOf(story.id);
    if (!f.includes(sc.end.id)) data.found[story.id] = [...f, sc.end.id];
    delete data.resume[story.id];
    save();
    const all = endsOf(story);
    const found = foundOf(story.id);
    const icon = { good: "🌟", ok: "💭", silly: "😄" }[sc.end.kind] || "📖";
    end.hidden = false;
    end.innerHTML = `<div class="kind" aria-hidden="true">${icon}</div><h2>The End: ${esc(sc.end.title)}</h2><p class="moral">${esc(sc.end.moral)}</p><p class="think">💬 Think about it: ${esc(sc.end.think)}</p><div class="ends" aria-label="Endings"><span class="muted" style="border:0;background:none">Endings found: ${found.length} of ${all.length}</span>${all.map((e) => (found.includes(e.id) ? `<span class="found">✓ ${esc(e.title)}</span>` : "<span>? ? ?</span>")).join("")}</div><div class="row" style="margin-top:0"><button class="g-btn" id="retry">${found.length < all.length ? "Try different choices" : "Read it again"}</button><button class="g-btn ghost" id="more">More stories</button></div>`;
    $("retry").addEventListener("click", () => openStory(story.id, false));
    $("more").addEventListener("click", showLibrary);
    if (!f.includes(sc.end.id)) sfx.win();
  } else {
    const hint = $("hint");
    box.innerHTML = sc.choices.map((c, i) => `<button type="button" data-i="${i}" class="${c.t === "Continue" ? "go" : ""}">${c.t === "Continue" ? "Continue ▶" : esc(c.t)}</button>`).join("");
    box.querySelectorAll("button").forEach((b, i) => b.addEventListener("click", () => {
      const c = sc.choices[i];
      if (c.wrong) {
        b.classList.add("wrong"); b.disabled = true; sfx.no();
        hint.hidden = false;
        hint.textContent = `Not quite. ${c.wrong}`;
        if (data.speak) speak([`${story.id}/${cur.id}-h${i}`], `Not quite. ${c.wrong}`);
        return;
      }
      go(c.to);
    }));
    const first = box.querySelector("button");
    if (first) first.focus({ preventScroll: true });
  }
  if (data.speak) speak(sceneKeys(), sceneSpoken());
  $("art").scrollIntoView({ block: "start", behavior: document.documentElement.getAttribute("data-saver") === "on" ? "auto" : "smooth" });
}
$("text").addEventListener("click", (e) => {
  const v = e.target.closest(".vocab");
  if (!v) return;
  const d = $("vdef");
  const w = v.dataset.w;
  if (!d.hidden && d.dataset.w === w) { d.hidden = true; return; }
  d.dataset.w = w;
  d.innerHTML = `<b>${esc(w)}</b>: ${esc(story.vocab[w])}`;
  d.hidden = false;
});
$("back").addEventListener("click", () => {
  if (!cur || !cur.trail.length) return;
  stopSay();
  cur.id = cur.trail.pop();
  data.resume[story.id] = cur;
  save();
  render();
});
$("again").addEventListener("click", () => openStory(story.id, false));
$("toLib").addEventListener("click", showLibrary);
$("say").addEventListener("click", () => { if (cur) speak(sceneKeys(), sceneSpoken()); });

// deep link: #cinderella opens that story
const fromHash = decodeURIComponent(location.hash.slice(1));
if (byId[fromHash]) openStory(fromHash, true); else showLibrary();
window.__onceupon = { STORIES, data, openStory, go: (to) => go(to), get cur() { return cur; } };
