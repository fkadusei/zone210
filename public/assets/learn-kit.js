/**
 * A small kit for Zone 210 learning games made of question rounds (Algebra Lab, Calculus Lab, Grammar & Words).
 * The game supplies topics; the kit draws the page, runs rounds of ten questions, explains every answer, keeps stars,
 * and runs the online race (both players get the same ten questions from a shared seed).
 *
 *   createLearn({
 *     root, bar,                 // where the game goes, and the header's button bar (stars and the sound button go there)
 *     key: "zone210_algebra",    // localStorage key
 *     prefix: "zone210-alg-",    // online room prefix
 *     topics: [{
 *       id, name, emoji, tip,    // tip: one line shown above the questions
 *       levels: ["One step", "Two steps", "Both sides"],
 *       make(level, r) {},       // level is 0, 1, 2…; r is the seeded random helper from rng(); returns a question
 *       explore: { label, mount(el) {} },   // optional hands-on panel; mount may return a clean-up function
 *     }],
 *   });
 *
 * A question is one of:
 *   { type: "choice", q, vis?, opts: [html…], a: index, why }          tap the right answer
 *   { type: "input",  q, vis?, a: number | string, alt?: [..], why, unit?, show? }   type the answer
 *   { type: "order",  q, words: [..], a: "The whole sentence.", alt?: [..], why }   put the words in order
 *   { type: "tap",    q, words: [..], a: index | [indexes], why }      tap the right word in the sentence
 * Extras: wide (one option per row, for sentences), visFirst (show vis above the prompt, for reading passages),
 * whyWrongOnly (only explain after a wrong answer).
 * q, vis, opts and why are HTML written by the game (never by players).
 */
import { createOnline } from "./online.js";

export * from "./learn-core.js";
import { rng, rightInput } from "./learn-core.js";

const ROUND = 10;
const esc = (t) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const plain = (html) => String(html).replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
export function createLearn({ root, bar, key, prefix, topics }) {
  const store = {
    get() { try { return JSON.parse(localStorage.getItem(key)) || {}; } catch (err) { return {}; } },
    set(v) { try { localStorage.setItem(key, JSON.stringify(v)); } catch (err) { /* private mode */ } },
  };
  const saved = { topic: topics[0].id, level: 0, muted: false, players: "1", best: {}, ...store.get() };
  const save = () => store.set(saved);
  const topic = () => topics.find((t) => t.id === saved.topic) || topics[0];
  const online = () => saved.players === "online";
  const totalStars = () => Object.values(saved.best).reduce((a, b) => a + b, 0);

  function tone(freqs, type = "sine", vol = 0.1) {
    if (saved.muted) return;
    const ac = window.z210Audio && window.z210Audio.get();
    if (!ac) return;
    freqs.forEach((f, i) => { const o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.value = f; const t = ac.currentTime + i * 0.09; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3); o.connect(g).connect(ac.destination); o.start(t); o.stop(t + 0.32); });
  }

  bar.innerHTML = `<span class="lk-stars" id="lkStars" aria-label="Stars earned"></span><button class="g-btn ghost" id="lkMute" aria-pressed="${!saved.muted}"></button>`;
  root.innerHTML = `
    <div class="lk-tabs" id="lkTabs" role="tablist" aria-label="Topics">${topics.map((t) => `<button class="lk-tab" role="tab" data-id="${t.id}"><span aria-hidden="true">${t.emoji}</span>${t.name}<i class="lk-ts" aria-hidden="true"></i></button>`).join("")}</div>
    <section class="g-panel lk-setup" aria-label="Options">
      <div class="lk-opt"><span class="lk-lbl">Level</span><div class="g-chips" id="lkLevels" role="group" aria-label="Level"></div></div>
      <div class="lk-opt"><span class="lk-lbl">Players</span><div class="g-chips" id="lkPlayers" role="group" aria-label="Players">
        <button class="g-chip" data-value="1">1 player</button><button class="g-chip" data-value="online">🌐 Online race</button></div>
        <button class="g-btn ghost lk-exp" id="lkExplore" hidden></button></div>
    </section>
    <div class="g-stats" id="lkStats"></div>
    <section class="lk-card" id="lkCard" aria-label="Question">
      <p class="lk-tip" id="lkTip"></p>
      <div class="lk-q" id="lkQ"></div>
      <div class="lk-vis" id="lkVis"></div>
      <div class="lk-ans" id="lkAns"></div>
      <div class="lk-fb" id="lkFb" role="status" aria-live="polite"></div>
      <div class="lk-row"><button class="g-btn" id="lkCheck" hidden>Check</button><button class="g-btn" id="lkNext" hidden>Next ▶</button></div>
    </section>
    <section class="lk-result" id="lkResult" hidden aria-live="polite">
      <p class="lk-bigstars" id="lkResStars" aria-hidden="true"></p><h2 id="lkResTitle"></h2><p id="lkResText"></p>
      <div class="lk-row"><button class="g-btn" id="lkAgain">Play again</button><button class="g-btn ghost" id="lkUp">Next level ▶</button></div>
    </section>
    <section class="lk-card lk-lab" id="lkLab" hidden aria-label="Explore"><div class="lk-labhead"><h2 id="lkLabTitle"></h2><button class="g-btn ghost" id="lkLabBack">← Back to questions</button></div><div id="lkLabBody"></div></section>`;
  const $ = (id) => document.getElementById(id);

  let R = null; // the round: { qs, i, right, streak, answered, started, done, ms }
  let friend = { i: 0, right: 0, done: false, ms: 0 }, labOff = null, started = false;

  const net = createOnline({
    container: root, before: $("lkStats"), prefix, names: ["Player 1", "Player 2"],
    startInfo: () => ({ topic: saved.topic, level: saved.level }),
    onStart: ({ seed, info }) => {
      if (info && topics.some((t) => t.id === info.topic)) { saved.topic = info.topic; saved.level = Math.min(info.level || 0, topic().levels.length - 1); }
      friend = { i: 0, right: 0, done: false, ms: 0 };
      paintSetup(); start(seed);
    },
    onData: (m) => { if (!m || typeof m.i !== "number") return; friend = { i: m.i, right: m.right || 0, done: !!m.done, ms: m.ms || 0 }; stats(); if (R && R.done) finishRace(); },
    onLeft: () => { $("lkFb").textContent = "Your friend left the game."; },
  });

  function paintSetup() {
    const t = topic();
    saved.level = Math.min(saved.level, t.levels.length - 1);
    root.querySelectorAll(".lk-tab").forEach((b) => {
      const on = b.dataset.id === t.id, tp = topics.find((x) => x.id === b.dataset.id);
      b.setAttribute("aria-selected", String(on));
      const got = tp.levels.reduce((n, _, l) => n + (saved.best[`${tp.id}:${l}`] || 0), 0);
      b.querySelector(".lk-ts").textContent = got ? `⭐ ${got}` : "";
    });
    $("lkLevels").innerHTML = t.levels.map((name, l) => `<button class="g-chip" data-value="${l}" aria-pressed="${l === saved.level}" aria-label="Level ${l + 1}: ${name}">${l + 1}<span class="lk-ln"> · ${name}</span>${saved.best[`${t.id}:${l}`] ? ` <span class="lk-got" aria-label="${saved.best[`${t.id}:${l}`]} stars">${"⭐".repeat(saved.best[`${t.id}:${l}`])}</span>` : ""}</button>`).join("");
    $("lkPlayers").querySelectorAll(".g-chip").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.value === saved.players)));
    $("lkTip").textContent = t.tip || "";
    $("lkExplore").hidden = !t.explore;
    if (t.explore) $("lkExplore").textContent = `🔬 Explore: ${t.explore.label}`;
    $("lkStars").textContent = `⭐ ${totalStars()}`;
    $("lkMute").textContent = saved.muted ? "🔇 Sound off" : "🔊 Sound on";
    $("lkMute").setAttribute("aria-pressed", String(!saved.muted));
    save();
  }

  /** The ten questions of a round: the same seed always gives the same ten. */
  function makeRound(seed) {
    const r = rng(seed), t = topic(), qs = [], seen = new Set();
    while (qs.length < ROUND) {
      let q = null;
      for (let tries = 0; tries < 12; tries += 1) { q = t.make(saved.level, r); const id = plain(q.q) + (q.words ? q.words.join(" ") : "") + (q.vis || "") + (q.opts ? q.opts.slice().sort().join("|") : ""); if (!seen.has(id)) { seen.add(id); break; } }
      if (q.type === "order") q.pool = shufflePool(q, r);
      qs.push(q);
    }
    return qs;
  }
  function shufflePool(q, r) { let p = r.shuffle(q.words.map((w, i) => i)); if (q.words.length > 1 && p.every((v, i) => v === i)) p = p.reverse(); return p; }

  function start(seed = (Math.random() * 4294967296) >>> 0) {
    closeLab();
    R = { qs: makeRound(seed), i: 0, right: 0, streak: 0, answered: false, started: Date.now(), done: false, ms: 0 };
    $("lkResult").hidden = true; $("lkCard").hidden = false;
    show();
    // on a small screen the options fill the view, so bring the question up (not on first load: let people see the topics)
    if (started && $("lkCard").getBoundingClientRect().top > innerHeight * 0.55) $("lkStats").scrollIntoView({ block: "start", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    started = true;
  }
  function stats() {
    if (!R) return;
    const cells = [["Question", `${Math.min(R.i + 1, ROUND)} of ${ROUND}`], ["Correct", R.right], ["In a row", R.streak]];
    if (online() && net.active) cells.push(["Friend", friend.done ? `${friend.right} of ${ROUND} ✓` : `on ${Math.min(friend.i + 1, ROUND)}`]);
    $("lkStats").innerHTML = cells.map(([k, v]) => `<div class="g-stat"><span>${k}</span><b>${v}</b></div>`).join("");
  }
  const waiting = () => online() && !net.active;

  function show() {
    const q = R.qs[R.i];
    R.answered = false;
    stats();
    $("lkQ").innerHTML = q.q;
    $("lkVis").innerHTML = q.vis || "";
    $("lkVis").hidden = !q.vis;
    $("lkCard").classList.toggle("lk-vistop", !!q.visFirst);
    $("lkFb").innerHTML = waiting() ? "Create or join a room to race a friend. You'll both get the same ten questions." : "";
    $("lkFb").className = "lk-fb";
    $("lkNext").hidden = true;
    $("lkCheck").hidden = q.type === "choice" || q.type === "tap";
    $("lkCheck").disabled = true;
    const ans = $("lkAns");
    ans.className = `lk-ans lk-${q.type}${q.wide ? " wide" : ""}`;
    if (q.type === "choice") {
      ans.innerHTML = q.opts.map((o, i) => `<button class="lk-o" data-i="${i}">${o}</button>`).join("");
    } else if (q.type === "input") {
      ans.innerHTML = `<label class="lk-in">${q.pre ? `<span>${q.pre}</span>` : ""}<input id="lkIn" type="text" inputmode="${typeof q.a === "number" ? "text" : "text"}" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Your answer" enterkeyhint="done">${q.unit ? `<span>${q.unit}</span>` : ""}</label>${typeof q.a === "number" ? `<p class="lk-hint">Type a number. Fractions like 3/4 are fine.</p>` : ""}`;
      const inp = $("lkIn");
      inp.addEventListener("input", () => { $("lkCheck").disabled = !inp.value.trim(); });
      inp.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); if (R.answered) next(); else if (inp.value.trim()) check(); } });
      if (!waiting() && matchMedia("(pointer: fine)").matches) inp.focus({ preventScroll: true });
    } else if (q.type === "order") {
      q.built = [];
      ans.innerHTML = `<div class="lk-built" id="lkBuilt" aria-label="Your sentence" role="group"></div><div class="lk-pool" id="lkPool" aria-label="Words to use" role="group"></div>`;
      drawOrder();
    } else if (q.type === "tap") {
      ans.innerHTML = `<p class="lk-sent">${q.words.map((w, i) => `<button class="lk-w" data-i="${i}">${esc(w)}</button>`).join(" ")}</p>`;
    }
  }
  function drawOrder() {
    const q = R.qs[R.i];
    $("lkBuilt").innerHTML = q.built.length ? q.built.map((wi, k) => `<button class="lk-w on" data-k="${k}" aria-label="Remove ${esc(q.words[wi])}">${esc(q.words[wi])}</button>`).join(" ") : `<span class="lk-ghost">Tap the words in order</span>`;
    $("lkPool").innerHTML = q.pool.map((wi) => `<button class="lk-w" data-w="${wi}" ${q.built.includes(wi) ? "disabled" : ""}>${esc(q.words[wi])}</button>`).join(" ");
    $("lkCheck").disabled = q.built.length !== q.words.length;
  }

  function answer(ok, rightText) {
    const q = R.qs[R.i];
    R.answered = true;
    if (ok) { R.right += 1; R.streak += 1; tone(R.streak >= 3 ? [660, 880, 1100] : [660, 880]); } else { R.streak = 0; tone([220, 180], "triangle"); }
    const fb = $("lkFb");
    fb.className = `lk-fb ${ok ? "good" : "bad"}`;
    fb.innerHTML = `<b>${ok ? pickPraise() : "Not quite."}</b>${ok ? "" : ` The answer is <b class="lk-right">${rightText}</b>.`}${q.why && !(ok && q.whyWrongOnly) ? `<span class="lk-why">${q.why}</span>` : ""}`;
    $("lkCheck").hidden = true;
    $("lkNext").hidden = false;
    $("lkNext").textContent = R.i + 1 >= ROUND ? "See my score ▶" : "Next ▶";
    root.querySelectorAll("#lkAns button, #lkAns input").forEach((b) => { b.disabled = true; });
    $("lkNext").focus({ preventScroll: true });
    stats();
    if (online() && net.active) net.send({ i: R.i + 1, right: R.right });
  }
  const PRAISE = ["Correct!", "Yes!", "That's right!", "Well done!", "Spot on!"];
  const pickPraise = () => PRAISE[Math.floor(Math.random() * PRAISE.length)];

  function check() {
    const q = R.qs[R.i];
    if (R.answered || waiting()) return;
    if (q.type === "input") {
      const typed = $("lkIn").value;
      if (!typed.trim()) return;
      $("lkIn").classList.add(rightInput(q, typed) ? "good" : "bad");
      answer(rightInput(q, typed), q.show ?? esc(q.a));
    } else if (q.type === "order") {
      const made = q.built.map((wi) => q.words[wi]).join(" "), ok = [q.a, ...(q.alt || [])].some((a) => a === made);
      $("lkBuilt").classList.add(ok ? "good" : "bad");
      answer(ok, esc(q.a));
    }
  }
  function next() {
    if (!R || !R.answered) return;
    R.i += 1;
    if (R.i >= ROUND) finish(); else show();
  }

  root.addEventListener("click", (e) => {
    const tab = e.target.closest(".lk-tab");
    if (tab) { if (online() && net.active) return; saved.topic = tab.dataset.id; saved.level = 0; paintSetup(); start(); return; }
    if (!R || waiting()) return;
    const q = R.qs[R.i];
    const o = e.target.closest(".lk-o");
    if (o && !R.answered) { const i = Number(o.dataset.i), ok = i === q.a; o.classList.add(ok ? "good" : "bad"); if (!ok) $("lkAns").children[q.a].classList.add("good"); answer(ok, q.opts[q.a]); return; }
    const w = e.target.closest(".lk-w");
    if (!w || R.answered) return;
    if (q.type === "tap") {
      const i = Number(w.dataset.i), rightSet = [].concat(q.a), ok = rightSet.includes(i);
      w.classList.add(ok ? "good" : "bad");
      if (!ok) root.querySelectorAll(".lk-sent .lk-w").forEach((b) => { if (rightSet.includes(Number(b.dataset.i))) b.classList.add("good"); });
      answer(ok, rightSet.map((k) => esc(q.words[k])).join(" / "));
    } else if (q.type === "order") {
      if (w.dataset.k !== undefined) q.built.splice(Number(w.dataset.k), 1); else q.built.push(Number(w.dataset.w));
      tone([520], "triangle", 0.04);
      drawOrder();
    }
  });
  $("lkCheck").addEventListener("click", check);
  $("lkNext").addEventListener("click", next);
  $("lkLevels").addEventListener("click", (e) => { const b = e.target.closest(".g-chip"); if (!b || (online() && net.active)) return; saved.level = Number(b.dataset.value); paintSetup(); start(); });
  $("lkPlayers").addEventListener("click", (e) => {
    const b = e.target.closest(".g-chip");
    if (!b || b.dataset.value === saved.players) return;
    saved.players = b.dataset.value; paintSetup();
    if (online()) net.open(); else net.close();
    start();
  });
  $("lkMute").addEventListener("click", () => { saved.muted = !saved.muted; paintSetup(); });

  function stars(right) { return right >= 9 ? 3 : right >= 7 ? 2 : right >= 5 ? 1 : 0; }
  function finish() {
    R.done = true; R.ms = Date.now() - R.started;
    const t = topic(), st = stars(R.right), k = `${t.id}:${saved.level}`;
    if (st > (saved.best[k] || 0)) saved.best[k] = st;
    paintSetup();
    $("lkCard").hidden = true; $("lkResult").hidden = false;
    $("lkResStars").textContent = st ? "⭐".repeat(st) : "💪";
    $("lkUp").hidden = online() || saved.level + 1 >= t.levels.length;
    $("lkAgain").hidden = online();
    stats();
    if (online() && net.active) { net.send({ i: ROUND, right: R.right, done: true, ms: R.ms }); finishRace(); return; }
    $("lkResTitle").textContent = `${R.right} out of ${ROUND}`;
    $("lkResText").textContent = st === 3 ? "Brilliant! Three stars." : st === 2 ? "Great work. Nine or ten right earns three stars." : st === 1 ? "Good effort. Seven right earns two stars." : "Keep going: five right earns your first star. Try the level again.";
    tone(st ? [523, 659, 784, 1047] : [392, 330], st ? "sine" : "triangle");
    $(st === 3 && !$("lkUp").hidden ? "lkUp" : "lkAgain").focus({ preventScroll: true });
  }
  function finishRace() {
    if (!friend.done) { $("lkResTitle").textContent = `${R.right} out of ${ROUND}`; $("lkResText").textContent = "Waiting for your friend to finish…"; return; }
    const win = R.right > friend.right || (R.right === friend.right && R.ms < friend.ms), draw = R.right === friend.right && R.ms === friend.ms;
    $("lkResTitle").textContent = draw ? "It's a draw!" : win ? "You win! 🎉" : "Your friend wins";
    $("lkResText").textContent = `You: ${R.right} right in ${Math.round(R.ms / 1000)} seconds. Friend: ${friend.right} right in ${Math.round(friend.ms / 1000)} seconds.${R.right === friend.right && !draw ? " Same score, so the faster player wins." : ""}`;
    if (win || draw) tone([523, 659, 784, 1047]);
    net.setOver(true);
  }
  $("lkAgain").addEventListener("click", () => start());
  $("lkUp").addEventListener("click", () => { saved.level += 1; paintSetup(); start(); });

  // ----- explore panels -----
  function closeLab() { if (labOff) { try { labOff(); } catch (err) { /* nothing to clean */ } labOff = null; } $("lkLab").hidden = true; $("lkLabBody").innerHTML = ""; }
  $("lkExplore").addEventListener("click", () => {
    const ex = topic().explore;
    if (!ex) return;
    $("lkCard").hidden = true; $("lkResult").hidden = true; $("lkLab").hidden = false;
    $("lkLabTitle").textContent = ex.label;
    labOff = ex.mount($("lkLabBody")) || null;
  });
  $("lkLabBack").addEventListener("click", () => { closeLab(); if (R && R.done) $("lkResult").hidden = false; else $("lkCard").hidden = false; });

  paintSetup();
  const invited = net.roomParam();
  if (invited) { saved.players = "online"; paintSetup(); }
  if (online()) { net.open(); if (invited) net.join(invited); }
  start();
  return { start, net };
}
