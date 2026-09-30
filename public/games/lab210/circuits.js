import { playMCQ } from "./mcq.js";
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const NS = "http://www.w3.org/2000/svg";

export function mountCircuit(root, ctx) {
  const st = { v: 6, r: 10, n: 2, mode: "series", on: true, blown: new Set() };
  root.innerHTML = `<div class="two"><div class="g-panel"><svg class="circuit" id="cs" viewBox="0 0 560 300" role="img" aria-label="Electric circuit"></svg>
    <p class="hint" id="cHint"></p></div>
    <div class="g-panel"><div class="ctl">
      <label><span>Battery<b id="vV"></b></span><input type="range" id="v" min="1.5" max="12" step="0.5" value="6"></label>
      <label><span>Each bulb's resistance<b id="rV"></b></span><input type="range" id="r" min="5" max="40" step="5" value="10"></label>
      <div><div class="lbl">Bulbs</div><div class="chips-row" id="cn"></div></div>
      <div><div class="lbl">Wiring</div><div class="chips-row" id="cm"></div></div>
      <div class="row"><button class="g-btn" id="cSw">Switch: ON</button><button class="g-btn ghost" id="cFix">Replace bulbs</button></div></div>
    <div class="readout"><div><small>Total current</small><b id="oI">–</b></div><div><small>Total resistance</small><b id="oR">–</b></div>
    <div><small>Volts per bulb</small><b id="oB">–</b></div><div><small>Power</small><b id="oP">–</b></div></div>
    <p class="hint">Ohm's law: V = I × R. Bulbs are rated for 6 V: above that they glow harder, and past 9 V they blow.</p></div></div>`;
  const $ = (id) => root.querySelector("#" + id);
  const svg = $("cs");
  const el = (tag, attrs, parent = svg) => { const e = document.createElementNS(NS, tag); Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v)); parent.appendChild(e); return e; };
  function solve() {
    const { v, r, n, mode } = st, alive = [...Array(n).keys()].filter((i) => !st.blown.has(i));
    if (!st.on) return { I: 0, R: mode === "series" ? n * r : r / n, vb: Array(n).fill(0) };
    if (mode === "series") {
      if (st.blown.size) return { I: 0, R: Infinity, vb: Array(n).fill(0) };
      const Rt = n * r; return { I: v / Rt, R: Rt, vb: Array(n).fill(v / n) };
    }
    if (!alive.length) return { I: 0, R: Infinity, vb: Array(n).fill(0) };
    const Rt = r / alive.length; return { I: v / Rt, R: Rt, vb: Array.from({ length: n }, (_, i) => (st.blown.has(i) ? 0 : v)) };
  }
  function bulb(x, y, b, i) {
    const bright = Math.min(1.6, (b / 6) ** 2), blown = st.blown.has(i);
    if (bright > 0.05 && !blown) el("circle", { cx: x, cy: y, r: 20 + bright * 14, fill: "#ffd66b", opacity: Math.min(0.55, bright * 0.35) });
    el("circle", { cx: x, cy: y, r: 17, fill: blown ? "#3f3f46" : `rgba(255,214,107,${0.15 + Math.min(1, bright) * 0.85})`, stroke: "#c98a00", "stroke-width": 3 });
    el("path", { d: blown ? `M${x - 8} ${y - 6}l6 6-4 5 6 6` : `M${x - 8} ${y + 6}q4-14 8 0t8 0`, fill: "none", stroke: blown ? "#a1a1aa" : "#7c4a00", "stroke-width": 2 });
  }
  function draw() {
    svg.innerHTML = "";
    const { n, mode } = st, s = solve(), dur = s.I > 0 ? Math.max(0.15, 1.2 / Math.min(4, s.I * 1.5 + 0.2)) : 0;
    const flow = (d) => { if (s.I > 0) el("path", { d, class: "flow", style: `--dur:${dur}s` }); };
    const wire = (d) => el("path", { d, class: "wire" });
    const xs = Array.from({ length: n }, (_, i) => (mode === "series" ? 150 + ((500 - 150 - 40) * (i + 0.5)) / n : 200 + ((440 - 200) * (i + (n === 1 ? 0.5 : 0))) / Math.max(1, n - 1)));
    if (mode === "series") {
      const top = `M60 110V60H${xs[0] - 17}`; wire(top); flow(top);
      const segs = []; xs.forEach((x, i) => { const end = i < n - 1 ? xs[i + 1] - 17 : 500; segs.push(`M${x + 17} 60H${end}`); }); segs.forEach((d) => { wire(d); flow(d); });
      const right = "M500 60V240H310"; wire(right); flow(right);
      const swL = "M250 240H60V190"; wire(swL); flow(swL);
      xs.forEach((x, i) => bulb(x, 60, s.vb[i], i));
      // switch on the bottom wire between x=250 and 310
      el("circle", { cx: 310, cy: 240, r: 5, fill: "#94a3b8" }); el("circle", { cx: 250, cy: 240, r: 5, fill: "#94a3b8" });
      el("line", { x1: 310, y1: 240, x2: st.on ? 250 : 262, y2: st.on ? 240 : 208, stroke: "#e2e8f0", "stroke-width": 5, "stroke-linecap": "round" });
    } else {
      const topL = "M60 110V60H120"; wire(topL); flow(topL);
      const topR = `M120 60H${xs[n - 1] + 40}`; wire(topR); flow(topR);
      const bot = `M${xs[n - 1] + 40} 250H60V190`; wire(bot); flow(bot);
      xs.forEach((x, i) => { const up = `M${x} 60V${130 - 17}`, dn = `M${x} ${130 + 17}V250`; wire(up); wire(dn); if (s.vb[i] > 0) { flow(up); flow(dn); } bulb(x, 130, s.vb[i], i); });
      el("circle", { cx: 120, cy: 60, r: 5, fill: "#94a3b8" });
    }
    // battery
    el("line", { x1: 40, y1: 110, x2: 80, y2: 110, stroke: "#e5484d", "stroke-width": 6 }); el("line", { x1: 48, y1: 126, x2: 72, y2: 126, stroke: "#94a3b8", "stroke-width": 6 });
    el("line", { x1: 40, y1: 142, x2: 80, y2: 142, stroke: "#e5484d", "stroke-width": 6 }); el("line", { x1: 48, y1: 158, x2: 72, y2: 158, stroke: "#94a3b8", "stroke-width": 6 });
    el("line", { x1: 60, y1: 158, x2: 60, y2: 190, stroke: "var(--muted)", "stroke-width": 4 });
    const t = el("text", { x: 86, y: 118 }); t.textContent = "+"; const t2 = el("text", { x: 86, y: 166 }); t2.textContent = "−";
    const t3 = el("text", { x: 90, y: 142 }); t3.textContent = `${st.v} V`;
    // readouts
    $("vV").textContent = ` ${st.v} V`; $("rV").textContent = ` ${st.r} Ω`;
    $("oI").textContent = `${s.I.toFixed(2)} A`; $("oR").textContent = s.R === Infinity ? "∞ (open)" : `${s.R.toFixed(1)} Ω`;
    $("oB").textContent = `${(mode === "series" ? (s.I ? st.v / n : 0) : s.I ? st.v : 0).toFixed(1)} V`; $("oP").textContent = `${(st.v * s.I).toFixed(1)} W`;
    $("cSw").textContent = `Switch: ${st.on ? "ON" : "OFF"}`;
    $("cHint").textContent = !st.on ? "The switch is open, so the loop is broken and no current flows."
      : st.blown.size ? (mode === "series" ? "A bulb blew, and in a series circuit that breaks the whole loop, so every bulb goes out. Try parallel wiring." : "One bulb blew but the others keep glowing: in a parallel circuit each bulb has its own path.")
      : mode === "series" ? `In series the ${n === 1 ? "bulb" : "bulbs"} share the battery's voltage (${(st.v / n).toFixed(1)} V each) and the same current flows through all.` : `In parallel each bulb gets the full ${st.v} V, so each glows just as brightly, but the battery supplies more current in total.`;
  }
  function checkBlow() {
    const s = solve(); let boom = false;
    s.vb.forEach((b, i) => { if (b > 9 && !st.blown.has(i)) { st.blown.add(i); boom = true; } });
    if (boom) { ctx.sfx.boom(); }
    return boom;
  }
  const refresh = () => { if (checkBlow() && st.mode === "series") { /* whole loop opens */ } draw(); };
  $("v").addEventListener("input", (e) => { st.v = +e.target.value; refresh(); });
  $("r").addEventListener("input", (e) => { st.r = +e.target.value; refresh(); });
  $("cSw").addEventListener("click", () => { st.on = !st.on; ctx.sfx.pop(); refresh(); });
  $("cFix").addEventListener("click", () => { st.blown.clear(); ctx.sfx.pick(); refresh(); });
  const chips = (id, list, cur, set) => { $(id).innerHTML = list.map(([k, l]) => `<button class="g-chip" data-k="${k}" aria-pressed="${String(k) === String(cur())}">${l}</button>`).join(""); $(id).querySelectorAll("button").forEach((b) => b.addEventListener("click", () => { set(b.dataset.k); st.blown.clear(); ctx.sfx.pick(); build(); })); };
  function build() { chips("cn", [1, 2, 3, 4].map((k) => [k, k]), () => st.n, (k) => (st.n = +k)); chips("cm", [["series", "Series"], ["parallel", "Parallel"]], () => st.mode, (k) => (st.mode = k)); draw(); }
  build();
}

export function mountOhm(root, ctx) {
  root.innerHTML = `<div class="g-panel"><p class="sumtext">Practise Ohm's law and simple circuits: current, resistance, voltage, series and parallel, and power. Every answer shows the working.</p>
    <div class="row"><button class="g-btn" id="oGo">Start (10 questions)</button></div></div>`;
  const $ = (id) => root.querySelector("#" + id);
  const panel = root.firstChild; let handle = null;
  const opts = (right, unit, fmt = (x) => x) => {
    const set = new Set([right]); const mults = [0.5, 2, 1.5, 0.25, 3, 4, 0.75];
    for (const m of mults.sort(() => Math.random() - 0.5)) { const v = +(right * m).toFixed(2); if (v > 0) set.add(v); if (set.size >= 4) break; }
    return [...set].map((x) => `${fmt(x)} ${unit}`);
  };
  function question() {
    const t = Math.floor(Math.random() * 6), V = pick([3, 6, 9, 12, 24]), R = pick([2, 3, 4, 6, 8, 10, 12, 20]);
    const I = +(V / R).toFixed(2);
    if (t === 0) return { tag: "Ohm's law", q: `A ${V} V battery is connected to a ${R} Ω resistor. What current flows?`, opts: opts(I, "A"), a: 0, why: `I = V ÷ R = ${V} ÷ ${R} = ${I} A.` };
    if (t === 1) return { tag: "Ohm's law", q: `A resistor carries ${I} A when connected to ${V} V. What is its resistance?`, opts: opts(R, "Ω"), a: 0, why: `R = V ÷ I = ${V} ÷ ${I} = ${R} Ω.` };
    if (t === 2) return { tag: "Ohm's law", q: `A current of ${I} A flows through a ${R} Ω resistor. What is the voltage across it?`, opts: opts(V, "V"), a: 0, why: `V = I × R = ${I} × ${R} = ${V} V.` };
    if (t === 3) { const R2 = pick([2, 4, 5, 10]), tot = R + R2; return { tag: "Series", q: `Two resistors of ${R} Ω and ${R2} Ω are wired in series. What is the total resistance?`, opts: opts(tot, "Ω"), a: 0, why: `In series, resistances add: ${R} + ${R2} = ${tot} Ω.` }; }
    if (t === 4) { const Rp = pick([4, 6, 10, 12, 20]), tot = Rp / 2; return { tag: "Parallel", q: `Two identical ${Rp} Ω resistors are wired in parallel. What is the total resistance?`, opts: opts(tot, "Ω"), a: 0, why: `Two equal resistors in parallel give half: ${Rp} ÷ 2 = ${tot} Ω.` }; }
    const P = +(V * I).toFixed(1); return { tag: "Power", q: `A ${V} V supply drives ${I} A through a lamp. How much power does it use? (P = V × I)`, opts: opts(P, "W", (x) => +x.toFixed(1)), a: 0, why: `P = V × I = ${V} × ${I} = ${P} W.` };
  }
  $("oGo").addEventListener("click", () => {
    panel.hidden = true;
    handle = playMCQ(root, ctx, { make: () => { const seen = new Set(), out = []; while (out.length < 10) { const q = question(); if (!seen.has(q.q)) { seen.add(q.q); out.push(q); } } return out; }, title: "🔌 Circuit challenge", bestKey: "ohm" }, () => { panel.hidden = false; });
  });
  return () => handle && handle.cancel();
}
