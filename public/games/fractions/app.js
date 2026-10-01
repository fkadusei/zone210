const $ = (id) => document.getElementById(id);
const store = {
  get(key, fallback) { try { const raw = localStorage.getItem(key); return raw === null ? fallback : JSON.parse(raw); } catch (err) { return fallback; } },
  set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (err) { /* private mode */ } },
};
const KEY = "zone210_fractions";
const data = { tab: "explore", level: { compare: 0, equal: 0, add: 0, line: 0 }, best: {}, muted: false, ...store.get(KEY, {}) };
const save = () => store.set(KEY, data);
const view = $("view");
const SPEED = new URLSearchParams(location.search).has("fast") ? 20 : 1;

// ---------- sound ----------
let audio = null;
function tone(freq, start, length, type = "sine", gain = 0.08) {
  if (data.muted) return;
  try {
    audio = window.z210Audio ? window.z210Audio.get() : audio || new (window.AudioContext || window.webkitAudioContext)();
    if (!audio) return;
    const t = audio.currentTime + start;
    const osc = audio.createOscillator();
    const amp = audio.createGain();
    osc.type = type; osc.frequency.value = freq;
    amp.gain.setValueAtTime(0.0001, t);
    amp.gain.exponentialRampToValueAtTime(gain, t + 0.01);
    amp.gain.exponentialRampToValueAtTime(0.0001, t + length);
    osc.connect(amp).connect(audio.destination);
    osc.start(t); osc.stop(t + length + 0.02);
  } catch (err) { /* audio unavailable */ }
}
const sfx = {
  tap: () => tone(520, 0, 0.05, "triangle", 0.06),
  right: () => [523, 659, 784].forEach((f, i) => tone(f, i * 0.07, 0.14, "triangle", 0.09)),
  wrong: () => [220, 170].forEach((f, i) => tone(f, i * 0.1, 0.18, "sawtooth", 0.06)),
  done: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, i * 0.1, 0.22, "triangle", 0.1)),
};

// ---------- fraction maths ----------
const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));
const lcm = (a, b) => (a / gcd(a, b)) * b;
const simp = (n, d) => { const g = gcd(n, d) || 1; return [n / g, d / g]; };
const ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const shuffle = (a) => { for (let i = a.length - 1; i > 0; i -= 1) { const j = ri(0, i); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const frac = (n, d, cls = "mid") => `<span class="frac ${cls}"><b>${n}</b><i></i><b>${d}</b></span>`;
const fmt = (x) => { const s = (Math.round(x * 1000) / 1000).toString(); return s; };

// ---------- pictures ----------
const COL = { a: "#e64980", b: "#228be6", c: "#2f9e44" };
function pieSVG(n, d, color, tap) {
  const R = 92, C = 100;
  const pt = (deg) => [C + R * Math.cos(((deg - 90) * Math.PI) / 180), C + R * Math.sin(((deg - 90) * Math.PI) / 180)];
  let segs = "";
  if (d === 1) segs = `<circle class="seg${n >= 1 ? " on" : ""}" cx="${C}" cy="${C}" r="${R}" data-i="0" ${tap ? 'tabindex="0" role="button" aria-label="Part 1"' : ""}/>`;
  else for (let i = 0; i < d; i += 1) {
    const [x0, y0] = pt((i * 360) / d), [x1, y1] = pt(((i + 1) * 360) / d);
    segs += `<path class="seg${i < n ? " on" : ""}" data-i="${i}" d="M${C} ${C}L${x0.toFixed(2)} ${y0.toFixed(2)}A${R} ${R} 0 ${360 / d > 180 ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}Z" ${tap ? `tabindex="0" role="button" aria-label="Part ${i + 1} of ${d}"` : ""}/>`;
  }
  return `<svg class="pie${tap ? " tap" : ""}" viewBox="0 0 200 200" style="--c:${color}" role="img" aria-label="${n} of ${d} parts shaded">${segs}</svg>`;
}
function barSVG(n, d, color, tap) {
  const W = 300, H = 46;
  const w = W / d;
  let segs = "";
  for (let i = 0; i < d; i += 1) segs += `<rect class="seg${i < n ? " on" : ""}" data-i="${i}" x="${(i * w).toFixed(2)}" y="2" width="${w.toFixed(2)}" height="${H - 4}" rx="${d > 14 ? 1 : 4}" ${tap ? `tabindex="0" role="button" aria-label="Part ${i + 1} of ${d}"` : ""}/>`;
  return `<svg class="bar${tap ? " tap" : ""}" viewBox="0 0 ${W} ${H}" style="--c:${color}" role="img" aria-label="${n} of ${d} parts shaded">${segs}</svg>`;
}
function numberLine(opts) {
  const { marks = [], ticks = 0, label = true, answer = null, mk = null, color = COL.a } = opts;
  const X0 = 24, X1 = 576, x = (v) => X0 + (X1 - X0) * v;
  let s = `<svg class="nl" viewBox="0 0 600 84" role="img" aria-label="Number line from 0 to 1"><line class="axis" x1="${X0}" y1="44" x2="${X1}" y2="44"/>`;
  s += `<line class="tick" x1="${X0}" y1="34" x2="${X0}" y2="54"/><line class="tick" x1="${X1}" y1="34" x2="${X1}" y2="54"/><text x="${X0}" y="74">0</text><text x="${X1}" y="74">1</text>`;
  for (let i = 1; i < ticks; i += 1) s += `<line class="tick" x1="${x(i / ticks)}" y1="37" x2="${x(i / ticks)}" y2="51"/>${label ? `<text x="${x(i / ticks)}" y="72">${i}/${ticks}</text>` : ""}`;
  marks.forEach((m) => { s += `<circle class="mk" style="--c:${m.color || color}" cx="${x(m.v)}" cy="44" r="10"/>`; });
  if (answer !== null) s += `<circle class="ans" cx="${x(answer)}" cy="44" r="10"/><text x="${x(answer)}" y="22" style="fill:var(--green)">answer</text>`;
  if (mk !== null) s += `<circle class="mk" style="--c:${color}" cx="${x(mk)}" cy="44" r="11"/>`;
  return `${s}</svg>`;
}

// ---------- tabs ----------
let cleanup = () => {};
function setTab(tab) {
  cleanup(); cleanup = () => {};
  data.tab = tab; save();
  document.querySelectorAll("#tabs .g-chip").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.tab === tab)));
  ({ explore: viewExplore, compare: () => session(ACT.compare), equal: () => session(ACT.equal), add: () => session(ACT.add), line: () => session(ACT.line) })[tab]();
}
$("tabs").addEventListener("click", (e) => { const b = e.target.closest("[data-tab]"); if (b) setTab(b.dataset.tab); });

// ---------- explore ----------
const exp = { d: 4, n: 1, shape: "pie" };
function viewExplore() {
  const { d, n, shape } = exp;
  const [sn, sd] = simp(n, d);
  const picture = shape === "pie" ? pieSVG(n, d, COL.a, true) : barSVG(n, d, COL.a, true);
  view.innerHTML = `<div class="panel"><span class="lbl">How many equal parts is the whole cut into?</span>
      <div class="den-chips" id="dc">${Array.from({ length: 12 }, (_, i) => i + 1).map((k) => `<button class="g-chip" data-d="${k}" aria-pressed="${k === d}">${k}</button>`).join("")}</div>
      <div class="row" style="margin-top:12px"><span class="lbl" style="margin:0">Shape</span><div class="g-chips" id="sc"><button class="g-chip" data-s="pie" aria-pressed="${shape === "pie"}">Pizza</button><button class="g-chip" data-s="bar" aria-pressed="${shape === "bar"}">Bar</button></div></div></div>
    <div class="panel explore">
      <div class="shape" id="pic">${picture}<span class="muted" style="font-size:0.85rem">Tap the pieces to shade them</span></div>
      <div>
        <div style="text-align:center;margin-bottom:10px" class="fa">${frac(n, d, "big")}</div>
        <div class="facts">
          <div class="line"><b>${n}</b> of <b>${d}</b> equal part${d === 1 ? "" : "s"} shaded</div>
          <div class="line">As a decimal: <b>${fmt(n / d)}</b> · As a percent: <b>${fmt((n / d) * 100)}%</b></div>
          <div class="line">${n === 0 ? "Nothing shaded: zero" : n === d ? "The whole thing: 1 whole" : sn === n ? `Already in its simplest form` : `The same as ${frac(sn, sd, "")} in its simplest form`}</div>
        </div></div></div>
    <div class="panel"><span class="lbl">On the number line</span>${numberLine({ ticks: d, marks: [{ v: n / d }], label: d <= 8 })}</div>`;
  $("dc").addEventListener("click", (e) => { const b = e.target.closest("[data-d]"); if (!b) return; exp.d = Number(b.dataset.d); exp.n = Math.min(exp.n, exp.d); sfx.tap(); viewExplore(); });
  $("sc").addEventListener("click", (e) => { const b = e.target.closest("[data-s]"); if (b) { exp.shape = b.dataset.s; viewExplore(); } });
  const tap = (e) => { const s = e.target.closest("[data-i]"); if (!s) return; const i = Number(s.dataset.i); exp.n = exp.n === i + 1 ? i : i + 1; sfx.tap(); viewExplore(); };
  $("pic").addEventListener("click", tap);
  $("pic").addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); tap(e); } });
}

// ---------- practice sessions ----------
const LEVELS = { compare: ["Same bottom number", "Same top number", "Different fractions"], equal: ["Easy", "Medium", "Simplify"], add: ["Same bottom number", "Related bottoms", "Unlike bottoms"], line: ["Marked parts", "Unlabelled marks", "No marks"] };
const TITLES = { compare: "Which is bigger?", equal: "Make it equal", add: "Add and subtract", line: "Put it on the number line" };
const TOTAL = 10;
function session(act) {
  const name = act.id;
  let level = data.level[name] || 0;
  let n = 0, correct = 0, streak = 0, q = null, answered = false;
  function chips() { return `<div class="g-chips" id="lv" role="group" aria-label="Level">${LEVELS[name].map((l, i) => `<button class="g-chip" data-l="${i}" aria-pressed="${i === level}">${l}</button>`).join("")}</div>`; }
  function start() { n = 0; correct = 0; streak = 0; next(); }
  function next() {
    if (n >= TOTAL) return finish();
    q = act.gen(level);
    answered = false;
    n += 1;
    view.innerHTML = `<div class="panel"><div class="row between" style="margin-bottom:10px">${chips()}<span class="score">Question ${n} of ${TOTAL} · ⭐ ${correct}</span></div>
      <h2 style="text-align:center">${TITLES[name]}</h2>
      <div class="qa" id="qa"></div><div class="fbk" id="fbk"></div><div class="row center" id="nx"></div></div>`;
    $("lv").addEventListener("click", (e) => { const b = e.target.closest("[data-l]"); if (!b) return; level = Number(b.dataset.l); data.level[name] = level; save(); start(); });
    act.draw(q, $("qa"), (ok, why) => {
      if (answered) return;
      answered = true;
      ok ? (correct += 1, streak += 1, sfx.right()) : (streak = 0, sfx.wrong());
      $("fbk").className = `fbk ${ok ? "good" : "bad"}`;
      $("fbk").innerHTML = `${ok ? ["Yes!", "Great!", "Spot on!", "Brilliant!"][correct % 4] : "Not quite."}${why ? `<small>${why}</small>` : ""}`;
      $("nx").innerHTML = `<button class="g-btn" id="nxt">${n >= TOTAL ? "See my score" : "Next question"}</button>`;
      $("nxt").addEventListener("click", next);
      $("nxt").focus({ preventScroll: true });
    });
  }
  function finish() {
    sfx.done();
    const k = `${name}:${level}`;
    const old = data.best[k] || 0;
    if (correct > old) { data.best[k] = correct; save(); }
    const stars = correct >= 9 ? 3 : correct >= 7 ? 2 : correct >= 5 ? 1 : 0;
    view.innerHTML = `<div class="panel sum"><h2>${TITLES[name]}</h2><div class="big">${correct}/${TOTAL}</div><p style="font-size:2rem;margin:0">${"⭐".repeat(stars)}${"☆".repeat(3 - stars)}</p>
      <p class="muted">${LEVELS[name][level]} · ${correct > old ? `New best${old ? ` (was ${old})` : ""}!` : `Best so far: ${old}`}</p>
      <div class="row center" style="margin-top:12px"><button class="g-btn" id="again">Play again</button>${level < 2 ? '<button class="g-btn ghost" id="up">Try the next level</button>' : ""}</div></div>`;
    $("again").addEventListener("click", start);
    const up = $("up");
    if (up) up.addEventListener("click", () => { level += 1; data.level[name] = level; save(); start(); });
  }
  start();
}

const ACT = {};

// compare
ACT.compare = {
  id: "compare",
  gen(level) {
    let a, b;
    if (level === 0) { const d = ri(3, 12); let x = ri(1, d - 1), y = ri(1, d - 1); if (x === y && Math.random() < 0.8) y = x === 1 ? 2 : x - 1; a = [x, d]; b = [y, d]; }
    else if (level === 1) { const x = ri(1, 4); let d1 = ri(x + 1, 12), d2 = ri(x + 1, 12); if (d1 === d2 && Math.random() < 0.85) d2 = d1 === 12 ? 11 : d1 + 1; a = [x, d1]; b = [x, d2]; }
    else if (Math.random() < 0.3) { const [n0, d0] = [ri(1, 4), ri(5, 6)]; const k = ri(2, 3); a = [n0, d0]; b = [n0 * k, d0 * k]; }
    else { do { const d1 = ri(2, 12), d2 = ri(2, 12); a = [ri(1, d1 - 1), d1]; b = [ri(1, d2 - 1), d2]; } while (a[0] * b[1] === b[0] * a[1] || a[1] === b[1] || a[0] === b[0]); }
    return { a, b };
  },
  draw(q, box, done) {
    const { a, b } = q;
    const ans = a[0] * b[1] === b[0] * a[1] ? "=" : a[0] * b[1] > b[0] * a[1] ? ">" : "<";
    box.innerHTML = `<div class="two"><div class="shape fa">${frac(a[0], a[1], "big")}${barSVG(a[0], a[1], COL.a)}</div><div class="op" aria-hidden="true">?</div><div class="shape fb2">${frac(b[0], b[1], "big")}${barSVG(b[0], b[1], COL.b)}</div></div>
      <div class="choices" role="group" aria-label="Pick one"><button data-s="&lt;" aria-label="less than">&lt;</button><button data-s="=" aria-label="equal to">=</button><button data-s="&gt;" aria-label="greater than">&gt;</button></div>`;
    box.querySelector(".choices").addEventListener("click", (e) => {
      const btn = e.target.closest("[data-s]");
      if (!btn) return;
      const pickS = btn.dataset.s.replace("&lt;", "<").replace("&gt;", ">");
      box.querySelectorAll(".choices button").forEach((x) => { x.disabled = true; const s = x.dataset.s; if (s === ans) x.classList.add("right"); else if (x === btn) x.classList.add("wrong"); });
      box.querySelector(".op").textContent = ans;
      const x = a[0] / a[1], y = b[0] / b[1];
      const why = a[1] === b[1] ? "The pieces are the same size, so the one with more pieces is bigger."
        : a[0] === b[0] ? "You have the same number of pieces, but the pieces are different sizes. More parts in the whole means smaller pieces."
        : `${a[0]}/${a[1]} = ${fmt(x)} and ${b[0]}/${b[1]} = ${fmt(y)}. Check by cross-multiplying: ${a[0]} × ${b[1]} = ${a[0] * b[1]} and ${b[0]} × ${a[1]} = ${b[0] * a[1]}.`;
      done(pickS === ans, ans === "=" ? `They are equal. ${why}` : why);
    });
  },
};

// make equal
ACT.equal = {
  id: "equal",
  gen(level) {
    if (level === 2) { const d = ri(2, 5), k = ri(2, 4); let n = ri(1, d - 1); [n] = simp(n, d).length ? [n] : [n]; return { n: n * k, d: d * k, to: d, k, reverse: true }; }
    const d = ri(2, level === 0 ? 4 : 6), k = ri(2, level === 0 ? 3 : 5);
    let n = ri(1, d - 1);
    return { n, d, to: d * k, k, reverse: false };
  },
  draw(q, box, done) {
    const given = q.reverse ? `${frac(q.n, q.d, "big")}` : frac(q.n, q.d, "big");
    let shaded = 0;
    const eqN = (m) => m * q.d === q.n * q.to;
    box.innerHTML = `<div class="prompt">${q.reverse ? `Shade the same amount using only <b>${q.to}</b> equal parts.` : `Shade the same amount using <b>${q.to}</b> equal parts.`}</div>
      <div class="eqrow"><div class="shape fa">${given}${barSVG(q.n, q.d, COL.a)}</div></div>
      <div class="shape fb2" id="mine">${barSVG(0, q.to, COL.b, true)}<span id="cnt" class="muted">0 of ${q.to} shaded</span></div>
      <button class="g-btn" id="chk">Check</button>`;
    const mine = $("mine");
    const paint = () => { mine.querySelector("svg").outerHTML = barSVG(shaded, q.to, COL.b, true); $("cnt").textContent = `${shaded} of ${q.to} shaded`; };
    const tap = (e) => { const s = e.target.closest("[data-i]"); if (!s || $("chk").disabled) return; const i = Number(s.dataset.i); shaded = shaded === i + 1 ? i : i + 1; sfx.tap(); paint(); };
    mine.addEventListener("click", tap);
    mine.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); tap(e); } });
    $("chk").addEventListener("click", () => {
      $("chk").disabled = true;
      const need = (q.n * q.to) / q.d;
      mine.querySelector("svg").outerHTML = barSVG(need, q.to, eqN(shaded) ? COL.c : COL.b, false);
      $("cnt").innerHTML = eqN(shaded) ? `${need} of ${q.to}: ${frac(need, q.to, "")}` : `You shaded ${shaded}. It should be ${need} of ${q.to}.`;
      const why = q.reverse ? `Divide the top and the bottom by ${q.k}: ${q.n} ÷ ${q.k} = ${q.n / q.k} and ${q.d} ÷ ${q.k} = ${q.to}. So ${q.n}/${q.d} = ${q.n / q.k}/${q.to}.`
        : `Multiply the top and the bottom by ${q.k}: ${q.n} × ${q.k} = ${q.n * q.k} and ${q.d} × ${q.k} = ${q.to}. So ${q.n}/${q.d} = ${q.n * q.k}/${q.to}.`;
      done(eqN(shaded), why);
    });
  },
};

// add and subtract
function addGen(level) {
  for (let tries = 0; tries < 200; tries += 1) {
    let d1, d2;
    if (level === 0) { d1 = d2 = ri(3, 12); }
    else if (level === 1) { const base = pick([2, 3, 4, 5, 6]); d1 = base; d2 = base * pick([2, 3]); if (d2 > 12) d2 = base * 2; if (Math.random() < 0.5) [d1, d2] = [d2, d1]; }
    else { [d1, d2] = pick([[2, 3], [3, 4], [2, 5], [3, 5], [4, 5], [3, 8], [2, 7], [5, 6], [4, 3], [3, 2], [5, 2], [5, 3], [5, 4]]); }
    const a = [ri(1, d1 - 1), d1], b = [ri(1, d2 - 1), d2];
    const op = Math.random() < 0.5 ? "+" : "−";
    const L = lcm(d1, d2);
    const an = a[0] * (L / d1), bn = b[0] * (L / d2);
    const rn = op === "+" ? an + bn : an - bn;
    if (rn <= 0 || rn > L) continue; // keep answers between 0 and 1
    return { a, b, op, L, an, bn, rn, ans: simp(rn, L) };
  }
  return { a: [1, 4], b: [1, 4], op: "+", L: 4, an: 1, bn: 1, rn: 2, ans: [1, 2] };
}
ACT.add = {
  id: "add",
  gen: addGen,
  draw(q, box, done) {
    box.innerHTML = `<div class="two"><div class="shape fa">${frac(q.a[0], q.a[1], "big")}${barSVG(q.a[0], q.a[1], COL.a)}</div><div class="op" aria-hidden="true">${q.op}</div><div class="shape fb2">${frac(q.b[0], q.b[1], "big")}${barSVG(q.b[0], q.b[1], COL.b)}</div></div>
      <div class="eqrow"><span class="op">=</span><div class="stepper"><input id="an" inputmode="numeric" aria-label="Top number" maxlength="3" /><hr /><input id="ad" inputmode="numeric" aria-label="Bottom number" maxlength="3" /></div><button class="g-btn" id="chk">Check</button></div>
      <p class="muted" style="margin:0;font-size:0.85rem">Give your answer as a fraction. Simplest form is best.</p><div id="res"></div>`;
    $("an").focus({ preventScroll: true });
    const go = () => {
      const n = Number($("an").value), d = Number($("ad").value);
      if (!n || !d) { $("an").focus(); return; }
      $("chk").disabled = true; $("an").disabled = true; $("ad").disabled = true;
      const ok = n * q.L === d * q.rn;
      const simplest = n === q.ans[0] && d === q.ans[1];
      const steps = q.a[1] === q.b[1] ? `${q.a[0]}/${q.a[1]} ${q.op} ${q.b[0]}/${q.b[1]} = ${q.rn}/${q.L}` : `Make the bottoms the same (${q.L}): ${q.an}/${q.L} ${q.op} ${q.bn}/${q.L} = ${q.rn}/${q.L}`;
      const tail = q.rn === q.ans[0] ? "" : ` = ${q.ans[0]}/${q.ans[1]} in simplest form`;
      $("res").innerHTML = barSVG(q.rn, q.L, COL.c);
      done(ok, `${steps}${tail}.${ok && !simplest ? " Your answer is right, and you can simplify it." : ""}`);
    };
    $("chk").addEventListener("click", go);
    box.addEventListener("keydown", (e) => { if (e.key === "Enter") go(); });
  },
};

// number line
ACT.line = {
  id: "line",
  gen(level) {
    const d = pick(level === 0 ? [2, 4, 5, 3] : level === 1 ? [3, 5, 6, 8] : [6, 7, 8, 9, 10, 12]);
    return { n: ri(1, d - 1), d, level };
  },
  draw(q, box, done) {
    const ticks = q.level === 2 ? 0 : q.d;
    let mk = null, locked = false;
    box.innerHTML = `<div class="prompt">Tap the number line where <span class="fa">${frac(q.n, q.d, "mid")}</span> goes.</div><div id="nlbox" style="width:100%;cursor:pointer">${numberLine({ ticks, label: q.level === 0 })}</div><button class="g-btn" id="chk" disabled>Check</button>`;
    const nlbox = $("nlbox");
    const place = (e) => {
      if (locked) return;
      const svg = nlbox.querySelector("svg");
      const r = svg.getBoundingClientRect();
      let v = (((e.clientX - r.left) / r.width) * 600 - 24) / 552;
      v = Math.max(0, Math.min(1, v));
      if (ticks) v = Math.round(v * ticks) / ticks;
      mk = v;
      nlbox.innerHTML = numberLine({ ticks, label: q.level === 0, mk, color: COL.b });
      $("chk").disabled = false;
      sfx.tap();
    };
    nlbox.addEventListener("click", place);
    $("chk").addEventListener("click", () => {
      locked = true; $("chk").disabled = true;
      const target = q.n / q.d;
      const tol = ticks ? 0.001 : 0.04;
      const ok = Math.abs(mk - target) <= tol;
      nlbox.innerHTML = numberLine({ ticks: q.d, label: q.level === 0, mk, answer: target, color: COL.b });
      done(ok, ok ? `${q.n}/${q.d} is ${fmt(target)} of the way from 0 to 1.` : `Cut 0 to 1 into ${q.d} equal parts and count ${q.n} of them: ${q.n}/${q.d} = ${fmt(target)}.`);
    });
  },
};

const mute = $("mute");
const syncMute = () => { mute.textContent = data.muted ? "Sound Off" : "Sound On"; mute.setAttribute("aria-pressed", String(data.muted)); };
mute.addEventListener("click", () => { data.muted = !data.muted; save(); syncMute(); });
syncMute();
setTab(["explore", "compare", "equal", "add", "line"].includes(data.tab) ? data.tab : "explore");
window.__fr = { data, ACT, setTab, addGen, simp };
