// Tell the Time: an analogue clock with hands you can drag. Explore, read the clock, and set the clock,
// from o'clock up to any minute. Times are also said in words ("quarter past three") and digits (3:15).
const $ = (id) => document.getElementById(id);
const store = {
  get(key, fallback) { try { const raw = localStorage.getItem(key); return raw === null ? fallback : JSON.parse(raw); } catch (err) { return fallback; } },
  set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (err) { /* private mode */ } },
};
const KEY = "zone210_time";
const data = { tab: "explore", level: "oclock", stars: 0, muted: false, h24: false, ...store.get(KEY, {}) };
const save = () => store.set(KEY, data);
const rnd = (n) => Math.floor(Math.random() * n);

const LEVELS = {
  oclock: { label: "O'clock", step: 60 },
  half: { label: "Half past", step: 30 },
  quarter: { label: "Quarters", step: 15 },
  five: { label: "5 minutes", step: 5 },
  any: { label: "Any minute", step: 1 },
};
const NUM = ["twelve", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];
const MINW = { 1: "one minute", 5: "five", 10: "ten", 15: "quarter", 20: "twenty", 25: "twenty-five", 30: "half" };
const minWords = (m) => MINW[m] || (m < 10 ? `${["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"][m]} minutes` : `${["", "", "twenty", "thirty"][Math.floor(m / 10)] || "ten"}${m % 10 ? "-" + ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"][m % 10] : ""} minutes`);
const TEENS = { 11: "eleven", 12: "twelve", 13: "thirteen", 14: "fourteen", 16: "sixteen", 17: "seventeen", 18: "eighteen", 19: "nineteen" };
function minutesWord(m) {
  if (MINW[m]) return MINW[m] === "one minute" ? "one minute" : MINW[m];
  if (TEENS[m]) return `${TEENS[m]} minutes`;
  return minWords(m);
}
/** 3:15 -> "quarter past three", 3:40 -> "twenty to four" */
function words(h, m) {
  const hr = (x) => NUM[((x % 12) + 12) % 12 || 12];
  if (m === 0) return `${hr(h)} o'clock`;
  if (m <= 30) return `${minutesWord(m)} past ${hr(h)}`;
  return `${minutesWord(60 - m)} to ${hr(h + 1)}`;
}
const digital = (h, m) => `${((h % 12) || 12)}:${String(m).padStart(2, "0")}`;
const randTime = () => { const step = LEVELS[data.level].step; return { h: 1 + rnd(12), m: step === 60 ? 0 : rnd(60 / step) * step }; };
const same = (a, b) => a.h % 12 === b.h % 12 && a.m === b.m;

// ---------- sound and voice ----------
function tone(freqs, type = "sine", vol = 0.14) {
  if (data.muted) return;
  const ac = window.z210Audio && window.z210Audio.get();
  if (!ac) return;
  freqs.forEach((f, i) => { const o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.value = f; const t = ac.currentTime + i * 0.08; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.26); o.connect(g).connect(ac.destination); o.start(t); o.stop(t + 0.28); });
}
const tick = () => tone([1800], "square", 0.03);
const yes = () => tone([660, 880, 1320]);
const no = () => tone([240, 190], "triangle");
function say(text) {
  if (data.muted || !window.speechSynthesis) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-GB"; u.rate = 0.85;
  speechSynthesis.speak(u);
}

// ---------- the clock ----------
function clockSVG(id, size = "") {
  const nums = Array.from({ length: 12 }, (_, i) => { const n = i + 1, a = (n * 30 - 90) * (Math.PI / 180); return `<text x="${100 + 72 * Math.cos(a)}" y="${100 + 72 * Math.sin(a) + 7}" text-anchor="middle">${n}</text>`; }).join("");
  const ticks = Array.from({ length: 60 }, (_, i) => { const a = (i * 6 - 90) * (Math.PI / 180), r1 = i % 5 ? 88 : 84; return `<line x1="${100 + r1 * Math.cos(a)}" y1="${100 + r1 * Math.sin(a)}" x2="${100 + 92 * Math.cos(a)}" y2="${100 + 92 * Math.sin(a)}" class="${i % 5 ? "tk" : "tk5"}"/>`; }).join("");
  return `<svg class="clock ${size}" id="${id}" viewBox="0 0 200 200" role="img"><circle cx="100" cy="100" r="96" class="rim"/><circle cx="100" cy="100" r="90" class="face"/>${ticks}<g class="nums">${nums}</g><g class="hh"><line x1="100" y1="112" x2="100" y2="52" class="hour"/></g><g class="mh"><line x1="100" y1="116" x2="100" y2="22" class="min"/><circle cx="100" cy="24" r="7" class="grip"/></g><circle cx="100" cy="100" r="6" class="pin"/></svg>`;
}
function setHands(svg, h, m, animate) {
  svg.classList.toggle("anim", !!animate);
  svg.querySelector(".hh").style.transform = `rotate(${((h % 12) + m / 60) * 30}deg)`;
  svg.querySelector(".mh").style.transform = `rotate(${m * 6}deg)`;
  svg.setAttribute("aria-label", `A clock showing ${words(h, m)}`);
}
/** Lets the hands be dragged. Dragging the minute hand past 12 moves the hour on (or back). */
function draggable(svg, t, onChange) {
  let drag = null;
  const angleOf = (e) => { const r = svg.getBoundingClientRect(); const x = e.clientX - (r.left + r.width / 2), y = e.clientY - (r.top + r.height / 2); return ((Math.atan2(y, x) * 180) / Math.PI + 90 + 360) % 360; };
  svg.addEventListener("pointerdown", (e) => {
    const r = svg.getBoundingClientRect();
    const dist = Math.hypot(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2)) / (r.width / 2);
    drag = dist < 0.5 ? "hour" : "min"; // near the middle moves the hour hand, further out the minute hand
    try { svg.setPointerCapture(e.pointerId); } catch (err) { /* synthetic */ }
    move(e);
  });
  const move = (e) => {
    if (!drag) return;
    const a = angleOf(e);
    const step = Math.max(1, LEVELS[data.level].step === 60 ? 60 : LEVELS[data.level].step);
    if (drag === "min") {
      let m = Math.round(a / 6 / step) * step % 60;
      if (step === 60) m = 0;
      if (m !== t.m) {
        if (t.m >= 45 && m <= 15) t.h = (t.h % 12) + 1; else if (t.m <= 15 && m >= 45) t.h = ((t.h + 10) % 12) + 1;
        t.m = m; tick(); onChange();
      }
    } else {
      const h = Math.round(a / 30) % 12 || 12;
      if (h !== t.h % 12 && !(h === 12 && t.h % 12 === 0)) { t.h = h; tick(); onChange(); }
    }
  };
  svg.addEventListener("pointermove", move);
  const up = () => { drag = null; };
  svg.addEventListener("pointerup", up);
  svg.addEventListener("pointercancel", up);
  // keyboard: arrows move the minute hand, Page Up/Down the hour
  svg.setAttribute("tabindex", "0");
  svg.addEventListener("keydown", (e) => {
    const step = LEVELS[data.level].step === 60 ? 60 : LEVELS[data.level].step;
    if (e.key === "ArrowRight" || e.key === "ArrowUp") { e.preventDefault(); add(step); }
    else if (e.key === "ArrowLeft" || e.key === "ArrowDown") { e.preventDefault(); add(-step); }
    else if (e.key === "PageUp") { e.preventDefault(); add(60); }
    else if (e.key === "PageDown") { e.preventDefault(); add(-60); }
  });
  const add = (mins) => { let total = ((t.h % 12) * 60 + t.m + mins + 720) % 720; t.h = Math.floor(total / 60) || 12; t.m = total % 60; tick(); onChange(); };
}

// ---------- tabs ----------
const view = $("view");
const TABS = { explore: viewExplore, read: () => startRound("read"), set: () => startRound("set") };
function setTab(tab) {
  data.tab = TABS[tab] ? tab : "explore"; save();
  document.querySelectorAll("#tabs .g-chip").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.tab === data.tab)));
  TABS[data.tab]();
}
$("tabs").addEventListener("click", (e) => { const b = e.target.closest("[data-tab]"); if (b) setTab(b.dataset.tab); });
function levelChips() {
  return `<div class="g-chips lv" role="group" aria-label="Level">${Object.entries(LEVELS).map(([k, l]) => `<button class="g-chip" data-level="${k}" aria-pressed="${k === data.level}">${l.label}</button>`).join("")}</div>`;
}
view.addEventListener("click", (e) => { const b = e.target.closest("[data-level]"); if (b) { data.level = b.dataset.level; save(); TABS[data.tab](); } });
function paintStars() { $("stars").textContent = `⭐ ${data.stars}`; }
const muteBtn = () => { $("mute").textContent = data.muted ? "🔇 Sound off" : "🔊 Sound on"; $("mute").setAttribute("aria-pressed", String(!data.muted)); };
$("mute").addEventListener("click", () => { data.muted = !data.muted; save(); muteBtn(); });

// Explore: move the hands and see the time in words and digits
function viewExplore() {
  const t = { h: 3, m: 0 };
  view.innerHTML = `${levelChips()}<div class="explore"><div class="clockbox">${clockSVG("clk", "big")}</div>
    <div class="readout"><p class="dig" id="dig"></p><p class="wrd" id="wrd"></p>
    <div class="row"><button class="g-btn ghost" id="hear">🔊 Say it</button><button class="g-btn ghost" id="rand">🎲 Surprise me</button></div>
    <p class="tip">Drag the long <b>minute hand</b> round the clock. Drag near the middle to move the short <b>hour hand</b>. Watch the hour hand creep along as the minutes go by!</p>
    <p class="tip" id="dayhint"></p></div></div>`;
  const svg = $("clk");
  const paint = (anim) => { setHands(svg, t.h, t.m, anim); $("dig").textContent = digital(t.h, t.m); $("wrd").textContent = words(t.h, t.m); };
  draggable(svg, t, () => paint(false));
  $("hear").addEventListener("click", () => say(`It's ${words(t.h, t.m)}.`));
  $("rand").addEventListener("click", () => { Object.assign(t, randTime()); paint(true); say(`It's ${words(t.h, t.m)}.`); });
  $("dayhint").innerHTML = "The minute hand goes all the way round in <b>one hour</b>. The hour hand goes round in <b>twelve hours</b>, so it goes round twice every day.";
  paint(false);
}

// Read and Set: ten questions each
const ROUNDS = 10;
let R = null;
function startRound(kind) { R = { kind, n: 0, got: 0 }; next(); }
function next() {
  if (R.n >= ROUNDS) return finish();
  const target = randTime();
  R.target = target; R.tries = 0;
  const meter = Array.from({ length: ROUNDS }, (_, i) => `<i class="${i < R.n ? "done" : i === R.n ? "now" : ""}"></i>`).join("");
  if (R.kind === "read") {
    // pick the time the clock shows: in words, or in digits on the higher levels
    const useDigits = R.n % 2 === 1;
    const opts = [target];
    while (opts.length < 4) { const o = randTime(); if (!opts.some((x) => same(x, o))) opts.push(o); }
    opts.sort(() => Math.random() - 0.5);
    view.innerHTML = `${levelChips()}<div class="meter">${meter}</div><p class="q">What time is it?</p><div class="clockbox">${clockSVG("clk", "big")}</div>
      <div class="choices">${opts.map((o, i) => `<button class="choice" data-i="${i}">${useDigits ? digital(o.h, o.m) : words(o.h, o.m)}</button>`).join("")}</div>`;
    setHands($("clk"), target.h, target.m, false);
    $("clk").removeAttribute("tabindex");
    view.querySelectorAll(".choice").forEach((b) => b.addEventListener("click", () => {
      const o = opts[Number(b.dataset.i)];
      if (same(o, target)) { b.classList.add("right"); mark(true); }
      else { b.classList.add("wrong"); b.disabled = true; R.tries += 1; no(); }
    }));
  } else {
    const t = { h: 12, m: 0 };
    view.innerHTML = `${levelChips()}<div class="meter">${meter}</div><p class="q">Set the clock to <b>${words(target.h, target.m)}</b> <span class="muted">(${digital(target.h, target.m)})</span></p><div class="clockbox">${clockSVG("clk", "big")}</div>
      <p class="live" id="live" aria-live="polite"></p><div class="row"><button class="g-btn" id="check">Check ✓</button></div>`;
    const svg = $("clk");
    const paint = () => { setHands(svg, t.h, t.m, false); $("live").textContent = `The clock shows ${digital(t.h, t.m)}`; };
    draggable(svg, t, paint);
    paint();
    $("check").addEventListener("click", () => {
      if (same(t, target)) { mark(true); $("check").disabled = true; }
      else { R.tries += 1; no(); $("live").textContent = t.m !== target.m ? "Not yet. Look at the minute hand (the long one)." : "Nearly! Check the hour hand (the short one)."; }
    });
  }
}
function mark(ok) {
  if (ok) { yes(); if (R.tries === 0) { R.got += 1; data.stars += 1; save(); paintStars(); } }
  say(`${words(R.target.h, R.target.m)}.`);
  R.n += 1;
  setTimeout(next, 1100);
}
function finish() {
  view.innerHTML = `<div class="done"><p class="big">🏆</p><h2>All done!</h2><p>You got ${R.got} of ${ROUNDS} right first time.</p><p class="starsrow">${"⭐".repeat(R.got)}</p><button class="g-btn" id="again">Play again</button></div>`;
  yes();
  $("again").addEventListener("click", () => startRound(R.kind));
}

paintStars();
muteBtn();
setTab(data.tab);
window.__time = { words, digital };
