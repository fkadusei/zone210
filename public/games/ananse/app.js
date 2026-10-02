import { STORIES } from "./stories.js";
import { artHTML } from "./art.js";
import { PRON, forSpeech, guideFor } from "./pron.js";

const $ = (id) => document.getElementById(id);
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const store = {
  get(key, fallback) { try { const raw = localStorage.getItem(key); return raw === null ? fallback : JSON.parse(raw); } catch (err) { return fallback; } },
  set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (err) { /* private mode */ } },
};
const KEY = "zone210_ananse";
const data = { found: {}, resume: {}, size: 1, speak: false, voice: "", ...store.get(KEY, {}) };
const save = () => store.set(KEY, data);

// ---------- conditions and flags ----------
const cond = (f, c) => !c || Object.entries(c).every(([k, v]) => { const cur = f[k] === undefined ? (typeof v === "boolean" ? false : 0) : f[k]; return cur === v; });
const applyFlags = (f, ch) => { const n = { ...f, ...(ch.set || {}) }; Object.entries(ch.inc || {}).forEach(([k, v]) => { n[k] = (n[k] || 0) + v; }); return n; };

// ---------- state ----------
let story = null;
let cur = null; // { id, flags, trail: [{id, flags}] }
const byId = Object.fromEntries(STORIES.map((s) => [s.id, s]));
const foundOf = (id) => data.found[id] || [];
const endsOf = (s) => Object.values(s.scenes).filter((x) => x.end).map((x) => x.end);

// ---------- read aloud ----------
const synth = window.speechSynthesis;
const PREFER = ["en-GH", "en-NG", "en-KE", "en-ZA", "en-GB", "en-AU", "en-IE", "en-US"];
let voices = [];
function loadVoices() {
  voices = (synth ? synth.getVoices() : []).filter((v) => /^en/i.test(v.lang));
  voices.sort((x, y) => { const px = PREFER.findIndex((p) => x.lang.replace("_", "-").startsWith(p)); const py = PREFER.findIndex((p) => y.lang.replace("_", "-").startsWith(p)); return (px < 0 ? 99 : px) - (py < 0 ? 99 : py) || x.name.localeCompare(y.name); });
  const sel = $("voice");
  if (!sel) return;
  sel.innerHTML = voices.map((v) => `<option value="${esc(v.name)}">${esc(v.name)} (${esc(v.lang)})</option>`).join("");
  const chosen = voices.find((v) => v.name === data.voice) || voices[0];
  if (chosen) sel.value = chosen.name;
  $("voicebar").hidden = !voices.length || !!story;
}
function say(text, raw = false) {
  if (!synth) return;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(raw ? text : forSpeech(text));
  const v = voices.find((x) => x.name === data.voice) || voices[0];
  if (v) { u.voice = v; u.lang = v.lang; } else u.lang = "en-GB";
  u.rate = 0.9;
  synth.speak(u);
}
const stopSay = () => { if (synth) synth.cancel(); };
if (synth) { $("speak").hidden = false; loadVoices(); synth.addEventListener && synth.addEventListener("voiceschanged", loadVoices); }
$("voice").addEventListener("change", () => { data.voice = $("voice").value; save(); say("Ananse the spider met Nyame the Sky God."); });
$("names").addEventListener("click", () => say("Ananse. Kwaku. Nyame. Onini. Osebo. Mmoboro. Mmoatia. Ntikuma. Anansesem."));
const syncSpeak = () => { $("speak").setAttribute("aria-pressed", String(data.speak)); $("speak").textContent = data.speak ? "🔊 Reading aloud" : "🔊 Read to me"; };
$("speak").addEventListener("click", () => { data.speak = !data.speak; save(); syncSpeak(); if (!data.speak) stopSay(); else if (cur) say(sceneText()); });
syncSpeak();
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
  $("voicebar").hidden = !voices.length;
  const total = STORIES.reduce((t, s) => t + foundOf(s.id).length, 0);
  const all = STORIES.reduce((t, s) => t + endsOf(s).length, 0);
  $("library").innerHTML = `<p class="intro">Kwaku Ananse the spider is the clever, cheeky hero of many tales told by the Akan people of Ghana. These stories are called <b>Anansesem</b>. In each one you decide what Ananse does next, and different choices lead to different endings. Can you find them all? <b>${total} of ${all} endings found.</b></p>
    <div class="shelf">${STORIES.map((s) => {
      const f = foundOf(s.id).length, n = endsOf(s).length, r = data.resume[s.id];
      return `<article class="scard" style="--a:${s.colors[0]};--b:${s.colors[1]}"><div class="cover" aria-hidden="true">${s.emoji}<small>${s.art}</small></div><div class="body"><span class="topic">${esc(s.topic || "")}</span><h2>${esc(s.title)}</h2><p>${esc(s.blurb)}</p><div class="meta"><span>${s.ages} · about ${s.mins} min</span><span class="dots" aria-label="${f} of ${n} endings found">${Array.from({ length: n }, (_, i) => `<i class="${i < f ? "on" : ""}"></i>`).join("")}</span></div>${f === n ? '<span class="badge">⭐ All endings found!</span>' : ""}<div class="btns">${r ? `<button class="g-btn" data-act="resume" data-s="${s.id}">Continue</button><button class="g-btn ghost" data-act="start" data-s="${s.id}">Start over</button>` : `<button class="g-btn" data-act="start" data-s="${s.id}">${f ? "Read again" : "Read this story"}</button>`}</div></div></article>`;
    }).join("")}</div>`;
}
$("library").addEventListener("click", (e) => {
  const b = e.target.closest("[data-act]");
  if (!b) return;
  openStory(b.dataset.s, b.dataset.act === "resume");
});

// ---------- reader ----------
function openStory(id, resume) {
  story = byId[id];
  if (resume && data.resume[id]) cur = JSON.parse(JSON.stringify(data.resume[id]));
  else { cur = { id: story.start, flags: {}, trail: [] }; delete data.resume[id]; save(); }
  $("library").hidden = true;
  $("voicebar").hidden = true;
  $("reader").hidden = false;
  $("rTitle").textContent = story.title;
  window.scrollTo(0, 0);
  render();
}
function resolve(id, flags) {
  // follow routes (scenes that pick where to go from the flags) until a scene that is shown
  for (let guard = 0; guard < 20; guard += 1) {
    const sc = story.scenes[id];
    const r = sc.route && sc.route.find((x) => cond(flags, x.if));
    if (!r) return id;
    id = r.to;
  }
  return id;
}
function go(to, ch) {
  stopSay();
  cur.trail.push({ id: cur.id, flags: cur.flags });
  cur.flags = applyFlags(cur.flags, ch || {});
  cur.id = resolve(to, cur.flags);
  data.resume[story.id] = cur;
  save();
  render();
}
const sceneText = () => story.scenes[cur.id].text.join(" ");
const defOf = (w) => {
  const p = PRON[w];
  const base = (story.vocab && story.vocab[w]) || (p && p.note) || "";
  return p ? `${base} <i>Say it: ${esc(p.guide)}</i>` : esc(base);
};
function withVocab(text) {
  const words = [...new Set([...Object.keys(story.vocab || {}), ...Object.keys(PRON)])].sort((a, b) => b.length - a.length);
  let html = esc(text);
  if (!words.length) return html;
  const re = new RegExp(`\\b(${words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\b`, "gi");
  return html.replace(re, (m) => `<button type="button" class="vocab" data-w="${esc(words.find((w) => w.toLowerCase() === m.toLowerCase()))}">${m}</button>`);
}
function render() {
  const sc = story.scenes[cur.id];
  $("art").innerHTML = artHTML(sc);
  $("text").innerHTML = sc.text.map((p, i) => `<p style="animation-delay:${i * 0.12}s">${withVocab(p)}</p>`).join("");
  $("vdef").hidden = true;
  $("hint").hidden = true;
  $("rPage").textContent = `Page ${cur.trail.length + 1}`;
  const tally = $("tally");
  if (sc.tally) { tally.hidden = false; tally.innerHTML = sc.tally.map(([k, label]) => `<span class="${cur.flags[k] ? "" : "no"}">${cur.flags[k] ? "✅" : "⬜"} ${label}</span>`).join(""); } else tally.hidden = true;
  const box = $("choices");
  const end = $("endcard");
  end.hidden = true;
  $("back").disabled = !cur.trail.length;
  if (sc.end) {
    box.innerHTML = "";
    const f = foundOf(story.id);
    if (!f.includes(sc.end.id)) { data.found[story.id] = [...f, sc.end.id]; }
    delete data.resume[story.id];
    save();
    const all = endsOf(story);
    const found = foundOf(story.id);
    const icon = { good: "🌟", ok: "💭", silly: "😄" }[sc.end.kind] || "📖";
    end.hidden = false;
    end.innerHTML = `<div class="kind" aria-hidden="true">${icon}</div><h2>The End: ${esc(sc.end.title)}</h2><p class="moral">${esc(sc.end.moral)}</p><p class="think">💬 Think about it: ${esc(sc.end.think)}</p><div class="ends" aria-label="Endings"><span class="muted" style="border:0;background:none">Endings found: ${found.length} of ${all.length}</span>${all.map((e) => (found.includes(e.id) ? `<span class="found">${icon === "" ? "" : "✓"} ${esc(e.title)}</span>` : "<span>? ? ?</span>")).join("")}</div><div class="row" style="margin-top:0"><button class="g-btn" id="retry">${found.length < all.length ? "Try different choices" : "Read it again"}</button><button class="g-btn ghost" id="more">More stories</button></div>`;
    $("retry").addEventListener("click", () => openStory(story.id, false));
    $("more").addEventListener("click", showLibrary);
  } else {
    const shown = (sc.choices || []).filter((c) => cond(cur.flags, c.if));
    const hint = $("hint");
    hint.hidden = true;
    box.innerHTML = shown.map((c, i) => `<button type="button" data-i="${i}" class="${c.t === "Continue" ? "go" : ""}">${c.t === "Continue" ? "Continue ▶" : esc(c.t)}</button>`).join("");
    box.querySelectorAll("button").forEach((b, i) => b.addEventListener("click", () => {
      const c = shown[i];
      if (c.wrong) {
        // a wrong answer: show the hint, count the mistake, and let the reader try again
        cur.flags = { ...cur.flags, mistakes: (cur.flags.mistakes || 0) + 1 };
        data.resume[story.id] = cur; save();
        b.classList.add("wrong"); b.disabled = true;
        hint.hidden = false;
        hint.textContent = `Not quite. ${c.wrong}`;
        if (data.speak) say(c.wrong);
        return;
      }
      go(c.to, c);
    }));
    const first = box.querySelector("button");
    if (first) first.focus({ preventScroll: true });
  }
  if (data.speak) say(sceneText());
  document.getElementById("art").scrollIntoView({ block: "start", behavior: "smooth" });
}
$("text").addEventListener("click", (e) => {
  const v = e.target.closest(".vocab");
  if (!v) return;
  const d = $("vdef");
  const w = v.dataset.w;
  if (!d.hidden && d.dataset.w === w) { d.hidden = true; return; }
  d.dataset.w = w;
  d.innerHTML = `<b>${esc(w)}</b>: ${defOf(w)}`;
  d.hidden = false;
});
$("back").addEventListener("click", () => {
  if (!cur || !cur.trail.length) return;
  stopSay();
  const prev = cur.trail.pop();
  cur.id = prev.id; cur.flags = prev.flags;
  data.resume[story.id] = cur;
  save();
  render();
});
$("again").addEventListener("click", () => openStory(story.id, false));
$("toLib").addEventListener("click", showLibrary);
$("say").addEventListener("click", () => { if (cur) say(sceneText()); else stopSay(); });
if (!synth) $("say").hidden = true;

showLibrary();
window.__ananse = { STORIES, data, openStory, go: (to, ch) => go(to, ch), get cur() { return cur; }, render };
