// Algebra Lab: six topics of question rounds (topics.js) on the shared learning kit, plus two hands-on panels.
import { createLearn, plot, poly, num } from "../../assets/learn-kit.js";
import { TOPICS, scale } from "./topics.js";

const x = '<i class="m">x</i>', y = '<i class="m">y</i>';

// ---------- solve an equation on a balance scale, one move at a time ----------
function balanceLab(el) {
  let a, b, c, log;
  const eq = () => `${poly([[a, x], [b, ""]])} = ${c}`;
  function fresh() { a = 1 + Math.floor(Math.random() * 4); b = Math.floor(Math.random() * 7); const s = 1 + Math.floor(Math.random() * 8); c = a * s + b; if (a === 1 && b === 0) b = 3, c += 3; log = [eq()]; draw(); }
  function draw(msg = "") {
    const done = a === 1 && b === 0;
    el.innerHTML = `<p class="lk-note">Keep the scale level: whatever you do to one side, do to the other. Get one ${x} box alone on the left.</p>
      <div class="lk-vis">${scale(a, b, c)}</div>
      <p class="eq-now">${done ? `${x} = ${c} 🎉` : eq()}</p>
      <div class="lk-row">
        <button class="g-btn" id="bTake" ${b === 0 ? "disabled" : ""}>Take ${b || "…"} from both sides</button>
        <button class="g-btn" id="bDiv" ${a === 1 ? "disabled" : ""}>Divide both sides by ${a === 1 ? "…" : a}</button>
        <button class="g-btn ghost" id="bNew">New equation</button>
      </div>
      <p class="lk-note" role="status" aria-live="polite">${msg || (done ? `Each box holds ${c}. Check it in the equation you started with.` : b ? "Tip: clear away the loose number first." : `Now share ${c} equally between the ${a} boxes.`)}</p>
      <ol class="eq-log" aria-label="Your steps">${log.map((l) => `<li>${l}</li>`).join("")}</ol>`;
    el.querySelector("#bTake").addEventListener("click", () => { c -= b; b = 0; log.push(eq()); draw(); });
    el.querySelector("#bDiv").addEventListener("click", () => {
      if (b !== 0) { draw(`Dividing now would leave awkward fractions (${b} ÷ ${a}). Take the ${b} away first.`); return; }
      c /= a; a = 1; log.push(`${x} = ${c}`); draw();
    });
    el.querySelector("#bNew").addEventListener("click", fresh);
  }
  fresh();
}

// ---------- build a straight line with two sliders ----------
function lineLab(el) {
  el.innerHTML = `<p class="lk-note">Move the sliders. The gradient tilts the line; the intercept slides it up and down.</p>
    <div class="lk-vis" id="lVis"></div>
    <p class="lk-read-out" id="lEq" aria-live="polite"></p>
    <div class="lk-ctl">
      <label>Gradient <input type="range" id="lM" min="-4" max="4" step="0.5" value="1"><output id="lMo"></output></label>
      <label>Intercept <input type="range" id="lC" min="-6" max="6" step="1" value="2"><output id="lCo"></output></label>
    </div>
    <table class="tbl" aria-label="Values of x and y"><tbody><tr id="lX"></tr><tr id="lY"></tr></tbody></table>`;
  const $ = (id) => el.querySelector(`#${id}`);
  const draw = () => {
    const m = Number($("lM").value), c = Number($("lC").value), f = (t) => m * t + c;
    $("lMo").textContent = num(m); $("lCo").textContent = num(c);
    $("lVis").innerHTML = plot({ w: 360, h: 300, x: [-6, 6], y: [-10, 10], fns: [{ f }], pts: [{ x: 0, y: c, label: `(0, ${num(c)})` }], segs: Math.abs(f(1)) <= 10 ? [{ x1: 0, y1: c, x2: 1, y2: c, cls: "thin" }, { x1: 1, y1: c, x2: 1, y2: f(1), cls: "thin" }] : [], label: `The line y = ${m}x + ${c}` });
    $("lEq").innerHTML = `${y} = ${m === 0 ? num(c) : `${m === 1 ? "" : m === -1 ? "−" : num(m)}${x}${c ? ` ${c < 0 ? "−" : "+"} ${Math.abs(c)}` : ""}`}`;
    const xs = [-2, -1, 0, 1, 2];
    $("lX").innerHTML = `<th scope="row">${x}</th>${xs.map((k) => `<td>${num(k)}</td>`).join("")}`;
    $("lY").innerHTML = `<th scope="row">${y}</th>${xs.map((k) => `<td>${num(f(k))}</td>`).join("")}`;
  };
  $("lM").addEventListener("input", draw); $("lC").addEventListener("input", draw);
  draw();
}

TOPICS.find((t) => t.id === "balance").explore = { label: "Balance it", mount: balanceLab };
TOPICS.find((t) => t.id === "graphs").explore = { label: "Line maker", mount: lineLab };

createLearn({ root: document.getElementById("app"), bar: document.getElementById("bar"), key: "zone210_algebra", prefix: "zone210-alg-", topics: TOPICS });
