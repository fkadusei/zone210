// Calculus Lab: six topics of question rounds (topics.js) on the shared learning kit, plus two hands-on panels.
import { createLearn, plot, num } from "../../assets/learn-kit.js";
import { TOPICS } from "./topics.js";

const x = '<i class="m">x</i>', y = '<i class="m">y</i>';
const CURVES = [
  { name: "A bowl: y = x² ÷ 2", f: (v) => (v * v) / 2, d: (v) => v, F: (v) => (v * v * v) / 6 },
  { name: "A wave: y = 2 sin x", f: (v) => 2 * Math.sin(v), d: (v) => 2 * Math.cos(v), F: (v) => -2 * Math.cos(v) },
  { name: "An S-bend: y = x³ ÷ 4 − x", f: (v) => (v * v * v) / 4 - v, d: (v) => (3 * v * v) / 4 - 1, F: (v) => v ** 4 / 16 - (v * v) / 2 },
  { name: "A straight line: y = x ÷ 2 + 1", f: (v) => v / 2 + 1, d: () => 0.5, F: (v) => (v * v) / 4 + v },
];
const chips = (id, label) => `<div class="lk-sel"><div class="g-chips" id="${id}" role="group" aria-label="${label}">${CURVES.map((c, i) => `<button class="g-chip" data-i="${i}" aria-pressed="${i === 0}">${c.name}</button>`).join("")}</div></div>`;
function pickCurve(el, id, onPick) {
  el.querySelector(`#${id}`).addEventListener("click", (e) => { const b = e.target.closest(".g-chip"); if (!b) return; el.querySelectorAll(`#${id} .g-chip`).forEach((c) => c.setAttribute("aria-pressed", String(c === b))); onPick(CURVES[Number(b.dataset.i)]); });
}

// ---------- slide a point along a curve and watch its slope ----------
function slopeLab(el) {
  let cur = CURVES[0];
  el.innerHTML = `<p class="lk-note">Slide the point along the curve. The orange line just touches the curve there: its steepness is the curve's slope at that point.</p>
    ${chips("sCurve", "Curve")}
    <div class="two"><figure><div id="sTop"></div><figcaption>The curve, with its touching line</figcaption></figure>
      <figure><div id="sBot"></div><figcaption>The slope at every ${x}: this graph is the derivative</figcaption></figure></div>
    <p class="lk-read-out" id="sRead" aria-live="polite"></p>
    <div class="lk-ctl"><label>Move the point <input type="range" id="sX" min="-3" max="3" step="0.1" value="1" aria-label="x position of the point"><output id="sXo"></output></label></div>`;
  const $ = (id) => el.querySelector(`#${id}`);
  const draw = () => {
    const a = Number($("sX").value), s = cur.d(a), fy = cur.f(a);
    $("sXo").textContent = num(+a.toFixed(1));
    $("sTop").innerHTML = plot({ w: 320, h: 280, x: [-4, 4], y: [-5, 5], fns: [{ f: cur.f }], segs: [{ x1: a - 1.6, y1: fy - 1.6 * s, x2: a + 1.6, y2: fy + 1.6 * s }], pts: [{ x: a, y: fy }], label: "The curve with a touching line at the chosen point" });
    $("sBot").innerHTML = plot({ w: 320, h: 280, x: [-4, 4], y: [-5, 5], fns: [{ f: cur.d, cls: "two" }], segs: [{ x1: a, y1: 0, x2: a, y2: s, cls: "thin" }], pts: [{ x: a, y: s }], label: "The slope of the curve at every x" });
    const flat = Math.abs(s) < 0.05;
    $("sRead").innerHTML = `At ${x} = ${num(+a.toFixed(1))} the slope is <b>${num(+s.toFixed(2))}</b>: ${flat ? "flat, a turning point" : s > 0 ? "going up" : "going down"}.`;
  };
  $("sX").addEventListener("input", draw);
  pickCurve(el, "sCurve", (c) => { cur = c; draw(); });
  draw();
}

// ---------- fill the area under a curve with rectangles ----------
function areaLab(el) {
  let cur = CURVES[0];
  const A = 0, B = 3;
  el.innerHTML = `<p class="lk-note">How big is the area under the curve from ${x} = 0 to ${x} = 3? Fill it with rectangles. The more you use, the thinner they get and the closer their total comes to the true area.</p>
    ${chips("aCurve", "Curve")}
    <div class="lk-vis" id="aVis"></div>
    <p class="lk-read-out" id="aRead" aria-live="polite"></p>
    <div class="lk-ctl"><label>Rectangles <input type="range" id="aN" min="1" max="60" step="1" value="4" aria-label="Number of rectangles"><output id="aNo"></output></label></div>
    <p class="lk-note">Integration is what you get when the rectangles become endlessly many and endlessly thin.</p>`;
  const $ = (id) => el.querySelector(`#${id}`);
  const draw = () => {
    const n = Number($("aN").value), w = (B - A) / n, bars = [];
    let sum = 0;
    for (let i = 0; i < n; i += 1) { const h = cur.f(A + i * w); bars.push({ x: A + i * w, w, h }); sum += h * w; } // each bar is as tall as the curve at its left edge
    const exact = cur.F(B) - cur.F(A);
    $("aNo").textContent = n;
    $("aVis").innerHTML = plot({ w: 380, h: 300, x: [-1, 4], y: [-3, 5], fns: [{ f: cur.f }], bars, label: `The area under the curve filled with ${n} rectangles` });
    $("aRead").innerHTML = `${n} rectangle${n === 1 ? "" : "s"}: <b>${num(+sum.toFixed(3))}</b> &nbsp;·&nbsp; true area: <b>${num(+exact.toFixed(3))}</b><small style="display:block;font:500 0.9rem var(--font);color:var(--muted)">Off by ${Math.abs(sum - exact).toFixed(3)}${cur.f(1) < 0 ? ". Area below the axis counts as negative." : ""}</small>`;
  };
  $("aN").addEventListener("input", draw);
  pickCurve(el, "aCurve", (c) => { cur = c; draw(); });
  draw();
}

TOPICS.find((t) => t.id === "slopes").explore = { label: "Slope explorer", mount: slopeLab };
TOPICS.find((t) => t.id === "derivatives").explore = { label: "Slope explorer", mount: slopeLab };
TOPICS.find((t) => t.id === "area").explore = { label: "Rectangles under a curve", mount: areaLab };

createLearn({ root: document.getElementById("app"), bar: document.getElementById("bar"), key: "zone210_calculus", prefix: "zone210-calc-", topics: TOPICS });
