// Calculus Lab: the questions. A gentle first look: slopes, rates of change, limits, derivatives, area and turning
// points. Every question comes from the seeded random helper (see tools/check-learn.mjs). No page code here.
import { mc, near, plot, poly, num } from "../../assets/learn-core.js";

const x = '<i class="m">x</i>', y = '<i class="m">y</i>', t = '<i class="m">t</i>';
const pw = (n, l = x) => (n === 0 ? "" : n === 1 ? l : `${l}<sup>${n}</sup>`);
/** A polynomial from [coefficient, power] pairs: P([[3, 2], [-1, 1], [4, 0]]) is 3x² − x + 4. */
export const P = (terms, l = x) => poly(terms.map(([c, n]) => [c, pw(n, l)]));
const frac = (top, bottom) => `<span class="fr"><span>${top}</span><span>${bottom}</span></span>`;
const table = (rows) => `<table class="tbl"><tbody>${rows.map(([head, ...cells]) => `<tr><th scope="row">${head}</th>${cells.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
const dp = (v, places = 4) => num(+v.toFixed(places));
const asFrac = (rise, run) => { const g = (a, b) => (b ? g(b, a % b) : Math.abs(a)), k = g(rise, run), a = rise / k, b = run / k; return b === 1 ? num(a) : `${a < 0 ? "−" : ""}${Math.abs(a)}/${b}`; };

// ---------- 1. slopes ----------
const UPDOWN = ["Going up", "Flat", "Going down"];
function slopes(level, r) {
  if (level === 0) {
    if (r() < 0.3) { // an S-shaped curve
      const px = r.pick([-2, 0, 2]), f = (v) => (v * v * v) / 4 - v, slope = (3 * px * px) / 4 - 1;
      return { type: "choice", q: `Walk along the curve from left to right.<small>At the dot, is the curve going up, flat, or going down?</small>`, vis: plot({ x: [-4, 4], y: [-4, 4], fns: [{ f }], pts: [{ x: px, y: f(px) }], label: "An S-shaped curve with one dot" }), opts: UPDOWN, a: slope > 0 ? 0 : 2, why: slope > 0 ? "Just after the dot the curve is higher than just before it, so it is going up. Its slope there is positive." : "Just after the dot the curve is lower than just before it, so it is going down. Its slope there is negative." };
    }
    const a = r.pick([0.5, -0.5, 1, -1]), h = r.int(-1, 1), k = a > 0 ? r.int(-3, 0) : r.int(0, 3), d = r.pick([-2, -1.5, -1, 0, 0, 1, 1.5, 2]), f = (v) => a * (v - h) ** 2 + k, px = h + d;
    if (Math.abs(f(px)) > 3.8) return slopes(level, r);
    const s = 2 * a * d;
    return { type: "choice", q: `Walk along the curve from left to right.<small>At the dot, is the curve going up, flat, or going down?</small>`, vis: plot({ x: [-4, 4], y: [-4, 4], fns: [{ f }], pts: [{ x: px, y: f(px) }], label: "A curve with one dot" }), opts: UPDOWN, a: s > 0 ? 0 : s < 0 ? 2 : 1, why: s === 0 ? `The dot is at the very ${a > 0 ? "bottom" : "top"} of the curve. For an instant it goes neither up nor down: the slope is zero.` : s > 0 ? "Just after the dot the curve is higher than just before it, so it is going up. Its slope there is positive." : "Just after the dot the curve is lower than just before it, so it is going down. Its slope there is negative." };
  }
  if (level === 1) {
    const run = r.int(1, 4), rise = r.int(1, 6) * r.sign(), x1 = r.int(-3, 1), y1 = r.int(-3, 3), x2 = x1 + run, y2 = y1 + rise, m = rise / run;
    if (Math.abs(y2) > 7) return slopes(level, r);
    const why = `Slope = change in ${y} ÷ change in ${x} = (${num(y2)} − ${y1 < 0 ? `(${num(y1)})` : y1}) ÷ (${num(x2)} − ${x1 < 0 ? `(${num(x1)})` : x1}) = ${num(rise)} ÷ ${run} = ${asFrac(rise, run)}.`;
    if (r() < 0.5) return { type: "input", q: `What is the slope of this line?<small>Slope = how far it rises ÷ how far it runs across.</small>`, vis: plot({ x: [-5, 6], y: [-8, 8], fns: [{ f: (v) => y1 + m * (v - x1) }], pts: [{ x: x1, y: y1, label: `(${num(x1)}, ${num(y1)})` }, { x: x2, y: y2, label: `(${num(x2)}, ${num(y2)})` }], label: "A straight line through two labelled points" }), a: m, tol: 0.006, show: asFrac(rise, run), why };
    return { type: "input", q: `A straight line goes through (${num(x1)}, ${num(y1)}) and (${num(x2)}, ${num(y2)}).<small>What is its slope?</small>`, a: m, tol: 0.006, show: asFrac(rise, run), why };
  }
  const a = r.pick([1, 0.5]), c = r.int(0, 2), t0 = a === 1 ? r.pick([-2, -1, 1, 2]) : r.pick([-3, -2, -1, 1, 2, 3]), f = (v) => a * v * v + c, s = 2 * a * t0;
  const far = Math.abs(f(t0) + s) <= 9.5 && f(t0) + s >= -1.5 ? 1 : -1, y2 = f(t0) + far * s;
  if (y2 > 9.5 || y2 < -1.5) return slopes(level, r);
  return { type: "input", q: `The orange line just touches the curve at the dot on the curve.<small>What is the slope of the curve at that dot?</small>`, vis: plot({ x: [-5, 5], y: [-2, 10], fns: [{ f }], segs: [{ x1: t0 - 2, y1: f(t0) - 2 * s, x2: t0 + 2, y2: f(t0) + 2 * s }], pts: [{ x: t0, y: f(t0), label: `(${num(t0)}, ${num(f(t0))})` }, { x: t0 + far, y: y2, cls: "b", label: `(${num(t0 + far)}, ${num(y2)})` }], label: "A curve with a line touching it at one point" }), a: s, show: num(s), why: `A curve's slope at a point is the slope of the line that just touches it there (the tangent). Between the two dots that line changes by ${num(far * s)} in ${y} for ${num(far)} in ${x}, so the slope is ${num(s)}.` };
}

// ---------- 2. rates of change ----------
const RATES = [
  [(d, k) => `A cyclist rides ${d} km in ${k} hours.`, "What is the average speed, in km per hour?", "km per hour"],
  [(d, k) => `A tank fills with ${d} litres of water in ${k} minutes.`, "How fast is it filling, in litres per minute?", "litres per minute"],
  [(d, k) => `A sunflower grows ${d} cm in ${k} weeks.`, "How fast is it growing, in cm per week?", "cm per week"],
  [(d, k) => `A printer prints ${d} pages in ${k} minutes.`, "What is its rate, in pages per minute?", "pages per minute"],
  [(d, k) => `A runner covers ${d} metres in ${k} seconds.`, "What is the average speed, in metres per second?", "metres per second"],
  [(d, k) => `A candle burns down ${d} mm in ${k} hours.`, "How fast is it burning, in mm per hour?", "mm per hour"],
];
const MOVES = [["<i class=\"m\">t</i><sup>2</sup>", (v) => v * v, (a, h) => 2 * a + h, (a) => 2 * a], ["2<i class=\"m\">t</i><sup>2</sup>", (v) => 2 * v * v, (a, h) => 4 * a + 2 * h, (a) => 4 * a], ["<i class=\"m\">t</i><sup>2</sup> + <i class=\"m\">t</i>", (v) => v * v + v, (a, h) => 2 * a + 1 + h, (a) => 2 * a + 1]];
function rates(level, r) {
  if (level === 0) {
    const [say, ask, unit] = r.pick(RATES), rate = r.int(2, 15), k = r.int(2, 8);
    return { type: "input", q: `${say(rate * k, k)}<small>${ask}</small>`, a: rate, why: `A rate is how much something changes for each unit of time: ${rate * k} ÷ ${k} = ${rate} ${unit}.` };
  }
  if (level === 1) {
    const [, f] = r.pick(MOVES), extra = r.int(0, 3), g = (v) => f(v) + extra, a = r.int(0, 3), b = a + r.int(1, 5 - a), ans = (g(b) - g(a)) / (b - a);
    return { type: "input", q: `The table shows how far a toy car has rolled.<small>What is its average speed between ${t} = ${a} and ${t} = ${b} seconds, in metres per second?</small>`, vis: table([["Time (s)", 0, 1, 2, 3, 4, 5], ["Distance (m)", ...[0, 1, 2, 3, 4, 5].map(g)]]), a: ans, why: `Average speed = change in distance ÷ change in time = (${g(b)} − ${g(a)}) ÷ (${b} − ${a}) = ${g(b) - g(a)} ÷ ${b - a} = ${ans}. The car is speeding up, so this is only an average.` };
  }
  const [name, , avg, inst] = r.pick(MOVES), a = r.int(1, 9);
  return { type: "input", q: `A ball rolls so that its distance is ${name} metres after ${t} seconds. Its average speed is worked out over shorter and shorter times starting at ${t} = ${a}.<small>What speed are the averages heading towards? That is the ball's speed at the instant ${t} = ${a}.</small>`, vis: table([["From t = " + a + " to", a + 1, dp(a + 0.1), dp(a + 0.01), dp(a + 0.001)], ["Average speed (m/s)", ...[1, 0.1, 0.01, 0.001].map((h) => dp(avg(a, h)))]]), a: inst(a), why: `As the time gap shrinks, the averages close in on ${inst(a)}. The speed at one instant is the limit of the average speeds: this is exactly what a derivative is.` };
}

// ---------- 3. limits ----------
const lim = (a) => `<span class="lim">lim<sub>${x} → ${num(a)}</sub></span>`;
function limits(level, r) {
  if (level === 0) {
    const kind = r.pick(["line", "line", "square"]), a = r.int(1, 4), m = r.int(2, 5), c = r.int(-3, 6), f = kind === "line" ? (v) => m * v + c : (v) => v * v + c;
    const xs = [a - 0.1, a - 0.01, a, a + 0.01, a + 0.1];
    return { type: "input", q: `Look at the values of ${v2("f")}(${x}) as ${x} gets closer and closer to ${a} from both sides.<small>What value is ${v2("f")}(${x}) heading towards?</small>`, vis: table([[x, ...xs.map((k) => dp(k))], [`${v2("f")}(${x})`, ...xs.map((k, i) => (i === 2 ? "?" : dp(f(k))))]]), a: f(a), show: num(f(a)), why: `From the left the values rise towards ${num(f(a))}, and from the right they fall towards ${num(f(a))}. Both sides agree, so the limit is ${num(f(a))}.` };
  }
  if (level === 1) {
    const a = r.int(-3, 4), m = r.int(2, 6), c = r.int(1, 9), kind = r.pick(["line", "square", "mixed", "cube"]);
    const [terms, val] = kind === "line" ? [[[m, 1], [c, 0]], m * a + c] : kind === "square" ? [[[1, 2], [c, 0]], a * a + c] : kind === "mixed" ? [[[1, 2], [-m, 1], [c, 0]], a * a - m * a + c] : [[[1, 3], [-c, 0]], a * a * a - c];
    return { type: "input", q: `${lim(a)} (${P(terms)})<small>What is this limit?</small>`, a: val, show: num(val), why: `This expression has no gaps or jumps, so you can simply put ${x} = ${num(a)} in: the limit is ${num(val)}.` };
  }
  const a = r.int(1, 6), b = r.pick([a, a, r.int(1, 7)]);
  const top = P([[1, 2], [b - a, 1], [-a * b, 0]]);
  return { type: "input", q: `${lim(a)} ${frac(top, P([[1, 1], [-a, 0]]))}<small>Putting ${x} = ${a} in gives 0 ÷ 0, which has no value. What is the limit?</small>`, a: a + b, why: `Factorise the top: ${top} = (${P([[1, 1], [-a, 0]])})(${P([[1, 1], [b, 0]])}). The (${P([[1, 1], [-a, 0]])}) cancels, leaving ${P([[1, 1], [b, 0]])}, which heads to ${a} + ${b} = ${a + b} as ${x} gets close to ${a}.` };
}
function v2(name) { return `<i class="m">${name}</i>`; }

// ---------- 4. derivatives ----------
const d1 = (terms) => terms.map(([c, n]) => [c * n, n - 1]).filter(([c]) => c !== 0);
function derivatives(level, r) {
  if (level === 0) {
    if (r() < 0.12) { const c = r.int(2, 12); return { type: "choice", q: `What is the derivative of ${y} = ${c}?<small>The derivative is the rule for the slope.</small>`, ...mc(r, "0", [`${c}`, `${c}${x}`, "1", x]), why: `${y} = ${c} is a flat line. A flat line has slope 0 everywhere.` }; }
    const a = r.int(1, 6) * (r() < 0.2 ? -1 : 1), n = r.int(1, 6), right = P(d1([[a, n]]));
    return { type: "choice", q: `What is the derivative of ${y} = ${P([[a, n]])}?<small>The derivative is the rule for the slope.</small>`, ...mc(r, right, [P([[a, Math.max(n - 1, 0)]]), P([[a * n, n]]), P([[a, n + 1]]), P([[a * (n + 1), n + 1]]), P([[a * n, n + 1]]), P([[a * n + 1, Math.max(n - 1, 0)]])]), why: n === 1 ? `${P([[a, 1]])} is a straight line with slope ${num(a)}, so its derivative is ${num(a)}.` : `Power rule: bring the power down to multiply, then lower the power by one. ${num(a)} × ${n} = ${num(a * n)}, and the power ${n} becomes ${n - 1}.` };
  }
  if (level === 1) {
    const powers = r.shuffle([3, 2, 1, 0]).slice(0, r.int(2, 3)).sort((p, q) => q - p);
    if (powers[0] === 0 || (powers.length === 2 && powers[0] === 1 && powers[1] === 0 && r() < 0.7)) return derivatives(level, r);
    const terms = powers.map((n) => [r.int(1, 6) * (r() < 0.3 ? -1 : 1), n]), right = P(d1(terms)), cst = terms.find(([, n]) => n === 0);
    const wrongs = [P(terms.map(([c, n]) => [c, Math.max(n - 1, 0)]).filter(([, n], i, all) => all.findIndex((q) => q[1] === n) === i)), P(terms.map(([c, n]) => [c * (n || 1), n])), P(d1(terms).map(([c, n], i) => [i === 0 ? -c : c, n])), P(d1(terms).map(([c, n]) => [c, n + 1])), P([...d1(terms).filter(([, n]) => n > 0), [(cst ? cst[0] : 1) + (d1(terms).find(([, n]) => n === 0) || [0])[0], 0]]), P(d1(terms).map(([c, n], i) => [i === 0 ? c + 1 : c, n]))];
    return { type: "choice", q: `What is the derivative of ${y} = ${P(terms)}?`, ...mc(r, right, wrongs), why: `Use the power rule on each term separately${cst ? `. The plain number ${num(cst[0])} just slides the graph up or down without changing its slope, so it disappears` : ""}: ${right}.` };
  }
  const b = r.int(-6, 6) || 2, k = r.int(-2, 4), kind = r.pick(["quad", "quad", "cube", "zero"]);
  if (kind === "quad") { const c = r.int(0, 9), terms = [[1, 2], [b, 1], [c, 0]]; return { type: "input", q: `${v2("f")}(${x}) = ${P(terms)}<small>What is the slope of this curve at ${x} = ${num(k)}?</small>`, a: 2 * k + b, show: num(2 * k + b), why: `The derivative is ${P(d1(terms))}. Put ${x} = ${num(k)} in: 2 × ${k < 0 ? `(${num(k)})` : k} ${b < 0 ? "−" : "+"} ${Math.abs(b)} = ${num(2 * k + b)}.` }; }
  if (kind === "cube") { const terms = [[1, 3], [b, 1]]; return { type: "input", q: `${v2("f")}(${x}) = ${P(terms)}<small>What is the slope of this curve at ${x} = ${num(k)}?</small>`, a: 3 * k * k + b, show: num(3 * k * k + b), why: `The derivative is ${P(d1(terms))}. Put ${x} = ${num(k)} in: 3 × ${k * k} ${b < 0 ? "−" : "+"} ${Math.abs(b)} = ${num(3 * k * k + b)}.` }; }
  const h = r.int(-4, 5) || 3, c = r.int(0, 9), terms = [[1, 2], [-2 * h, 1], [c, 0]];
  return { type: "input", q: `${v2("f")}(${x}) = ${P(terms)}<small>At what value of ${x} is the slope zero?</small>`, pre: `${x} =`, a: h, show: num(h), why: `The derivative is ${P(d1(terms))}. Set it to zero: 2${x} = ${num(2 * h)}, so ${x} = ${num(h)}. That is where the curve turns round.` };
}

// ---------- 5. area under a curve ----------
const integ = (lo, hi) => `∫<sub class="il">${lo}</sub><sup class="iu">${hi}</sup>`;
function area(level, r) {
  if (level === 0) {
    const kind = r.pick(["rect", "tri", "tri", "trap"]);
    if (kind === "rect") { const c = r.int(1, 6), a = r.int(0, 2), b = a + r.int(2, 4); return { type: "input", q: `What is the shaded area under the line, from ${x} = ${a} to ${x} = ${b}?`, vis: plot({ x: [0, 7], y: [0, 8], fns: [{ f: () => c }], shade: { f: () => c, a, b }, label: "A flat line with the area under it shaded" }), a: c * (b - a), why: `The shaded shape is a rectangle: ${b - a} wide and ${c} tall. ${b - a} × ${c} = ${c * (b - a)}.` }; }
    if (kind === "tri") { const m = r.pick([1, 2, 0.5]), b = m === 2 ? r.int(1, 4) : m === 1 ? r.int(2, 7) : r.pick([2, 4, 6]), f = (v) => m * v; return { type: "input", q: `What is the shaded area under the line, from ${x} = 0 to ${x} = ${b}?`, vis: plot({ x: [0, 7], y: [0, 8], fns: [{ f }], shade: { f, a: 0, b }, label: "A sloping line with the area under it shaded" }), a: (m * b * b) / 2, why: `The shaded shape is a triangle: base ${b}, height ${m * b}. Half of base × height = ½ × ${b} × ${m * b} = ${(m * b * b) / 2}.` }; }
    const c = r.int(1, 3), a = r.int(0, 1), b = a + r.int(2, 4), f = (v) => v + c, ar = ((f(a) + f(b)) / 2) * (b - a);
    return { type: "input", q: `What is the shaded area under the line, from ${x} = ${a} to ${x} = ${b}?`, vis: plot({ x: [0, 7], y: [0, 8], fns: [{ f }], shade: { f, a, b }, label: "A sloping line with the area under it shaded" }), a: ar, why: `Split it into a rectangle (${b - a} wide, ${f(a)} tall = ${(b - a) * f(a)}) and a triangle on top (base ${b - a}, height ${f(b) - f(a)} = ${((b - a) * (f(b) - f(a))) / 2}). Together: ${ar}.` };
  }
  if (level === 1) {
    const n = r.int(0, 4), k = r.int(1, 5), a = k * (n + 1), right = `${P([[k, n + 1]])} + C`;
    const wrongs = [`${P([[a, n + 1]])} + C`, `${P([[a * (n + 1), n + 1]])} + C`, `${P([[k, n]]) || k} + C`, `${P([[a, n + 2]])} + C`, `${P([[2 * k, n + 1]])} + C`, ...(n > 0 ? [`${P([[a * n, n - 1]])} + C`] : [`${a} + C`])];
    return { type: "choice", q: `${integ("", "")} ${P([[a, n]])} ${v2("d")}${x}<small>Which expression has ${P([[a, n]])} as its derivative?</small>`, ...mc(r, right, wrongs), why: `Integrating undoes the derivative: raise the power by one, then divide by the new power. ${a} ÷ ${n + 1} = ${k}. Check: the derivative of ${P([[k, n + 1]])} is ${P([[a, n]])}. The “+ C” is any plain number, because plain numbers vanish when you take a derivative.` };
  }
  if (r() < 0.5) {
    const n = r.int(1, 2), k = r.int(1, 3), b = r.int(1, 3), a = k * (n + 1), f = (v) => a * v ** n, val = k * b ** (n + 1);
    return { type: "input", q: `${integ(0, b)} ${P([[a, n]])} ${v2("d")}${x}<small>What is the exact area under ${y} = ${P([[a, n]])} from ${x} = 0 to ${x} = ${b}?</small>`, vis: f(b) <= 12 ? plot({ x: [0, 4], y: [0, 12], step: 1, h: 260, fns: [{ f }], shade: { f, a: 0, b }, label: "A curve with the area under it shaded" }) : "", a: val, why: `Integrate: ${P([[k, n + 1]])}. Put in ${x} = ${b} and take away the value at ${x} = 0: ${k} × ${b ** (n + 1)} − 0 = ${val}.` };
  }
  const c = r.int(1, 5), a = r.int(0, 2), b = a + r.int(1, 3), val = b * b - a * a + c * (b - a);
  return { type: "input", q: `${integ(a, b)} (${P([[2, 1], [c, 0]])}) ${v2("d")}${x}<small>What is the exact area under ${y} = ${P([[2, 1], [c, 0]])} from ${x} = ${a} to ${x} = ${b}?</small>`, a: val, why: `Integrate: ${P([[1, 2], [c, 1]])}. At ${x} = ${b} it is ${b * b + c * b}; at ${x} = ${a} it is ${a * a + c * a}. Subtract: ${b * b + c * b} − ${a * a + c * a} = ${val}.` };
}

// ---------- 6. turning points ----------
const TURN = ["A maximum (top of a hill)", "A minimum (bottom of a valley)", "Neither"];
function turning(level, r) {
  if (level === 0) {
    if (r() < 0.35) { const px = r.pick([-1.732, 1.732, 0, -3, 3]), f = (v) => (v * v * v) / 6 - (3 * v) / 2, kind = Math.abs(px) > 2 || px === 0 ? 2 : px < 0 ? 0 : 1; return { type: "choice", q: `Is the dot at a maximum, a minimum, or neither?`, vis: plot({ x: [-4, 4], y: [-4, 4], fns: [{ f }], pts: [{ x: px, y: f(px) }], label: "An S-shaped curve with one dot" }), opts: TURN, a: kind, why: kind === 2 ? "The curve is still climbing or falling at the dot, so it is not a turning point." : `Near the dot, every other point on the curve is ${kind === 0 ? "lower" : "higher"}, and the slope there is zero.` }; }
    const a = r.pick([0.5, -0.5, 1, -1]), h = r.int(-2, 2), k = a > 0 ? r.int(-3, 0) : r.int(0, 3), d = r.pick([0, 0, 0, -1, 1, 1.5, -1.5]), f = (v) => a * (v - h) ** 2 + k;
    if (Math.abs(f(h + d)) > 3.8) return turning(level, r);
    const kind = d !== 0 ? 2 : a < 0 ? 0 : 1;
    return { type: "choice", q: `Is the dot at a maximum, a minimum, or neither?`, vis: plot({ x: [-4, 4], y: [-4, 4], fns: [{ f }], pts: [{ x: h + d, y: f(h + d) }], label: "A curve with one dot" }), opts: TURN, a: kind, why: kind === 2 ? "The curve is still climbing or falling at the dot, so it is not a turning point." : `The dot is the ${kind === 0 ? "highest" : "lowest"} point of the curve. The slope there is zero: the curve stops ${kind === 0 ? "rising and starts falling" : "falling and starts rising"}.` };
  }
  if (level === 1) {
    const a = r.pick([1, -1, 2, -2]), h = r.int(-4, 5) || 2, c = r.int(-5, 9), terms = [[a, 2], [-2 * a * h, 1], [c, 0]];
    if (r() < 0.3) return { type: "choice", q: `${y} = ${P(terms)}<small>Does this curve have a highest point or a lowest point?</small>`, opts: ["A highest point (maximum)", "A lowest point (minimum)", "Neither: it keeps going up"], a: a < 0 ? 0 : 1, why: `Look at the ${x}<sup>2</sup> term. It is ${a > 0 ? "positive, so the curve is a valley shape (∪) with a lowest point" : "negative, so the curve is a hill shape (∩) with a highest point"}.` };
    return { type: "input", q: `${y} = ${P(terms)}<small>At what value of ${x} is the turning point?</small>`, pre: `${x} =`, a: h, show: num(h), why: `At a turning point the slope is zero. The derivative is ${P(d1(terms))}. Setting it to zero gives ${P([[2 * a, 1]])} = ${num(2 * a * h)}, so ${x} = ${num(h)}.` };
  }
  const kind = r.pick(["time", "height", "pen", "side", "profit"]);
  if (kind === "time" || kind === "height") {
    const v = r.pick([10, 20, 30, 40, 50, 60]), top = (v * v) / 20;
    return kind === "time"
      ? { type: "input", q: `A ball is thrown upwards. Its height in metres after ${t} seconds is ${v}${t} − 5${t}<sup>2</sup>.<small>After how many seconds is the ball at its highest?</small>`, a: v / 10, why: `At the top the ball stops rising for an instant, so the slope is zero. The derivative is ${v} − 10${t}. Setting it to zero gives ${t} = ${v / 10}.` }
      : { type: "input", q: `A ball is thrown upwards. Its height in metres after ${t} seconds is ${v}${t} − 5${t}<sup>2</sup>.<small>What is the greatest height it reaches, in metres?</small>`, a: top, why: `The derivative ${v} − 10${t} is zero when ${t} = ${v / 10}. Put that back in: ${v} × ${v / 10} − 5 × ${(v / 10) ** 2} = ${(v * v) / 10} − ${(v * v) / 20} = ${top} metres.` };
  }
  if (kind === "pen" || kind === "side") {
    const fence = r.pick([16, 20, 24, 28, 32, 36, 40]), half = fence / 2, side = fence / 4;
    return kind === "pen"
      ? { type: "input", q: `A farmer has ${fence} metres of fence for a rectangular pen. If one side is ${x} metres, the area is ${x}(${half} − ${x}).<small>What is the largest area the pen can have, in square metres?</small>`, a: side * side, why: `Area = ${half}${x} − ${x}<sup>2</sup>. Its derivative, ${half} − 2${x}, is zero when ${x} = ${side}. That makes a square, ${side} by ${side}, with area ${side * side}.` }
      : { type: "input", q: `A farmer has ${fence} metres of fence for a rectangular pen. If one side is ${x} metres, the area is ${x}(${half} − ${x}).<small>What value of ${x} gives the largest area?</small>`, pre: `${x} =`, a: side, why: `Area = ${half}${x} − ${x}<sup>2</sup>. Its derivative, ${half} − 2${x}, is zero when ${x} = ${side}. The best rectangle is a square.` };
  }
  const b = 2 * r.int(2, 10);
  return { type: "input", q: `A stall's daily profit, in tokens, is ${b}${x} − ${x}<sup>2</sup>, where ${x} is the price of a drink.<small>What price gives the biggest profit?</small>`, pre: `${x} =`, a: b / 2, why: `The derivative is ${b} − 2${x}. It is zero when ${x} = ${b / 2}. Below that price, raising it earns more; above it, raising it loses customers faster than it gains.` };
}

export const TOPICS = [
  { id: "slopes", name: "Slopes", emoji: "📐", tip: "Slope is steepness: how far up (or down) for each step across.", levels: ["Up, flat or down", "Slope of a line", "Slope of a curve"], make: slopes },
  { id: "rates", name: "Rates", emoji: "🚗", tip: "A rate tells you how fast something is changing.", levels: ["How fast?", "From a table", "At one instant"], make: rates },
  { id: "limits", name: "Limits", emoji: "🎯", tip: "A limit is the value something gets closer and closer to.", levels: ["Read the table", "Put the number in", "Fill the gap"], make: limits },
  { id: "derivatives", name: "Derivatives", emoji: "✏️", tip: "The derivative is a rule that gives the slope at every point. Power rule: bring the power down, then lower it by one.", levels: ["Power rule", "Whole expressions", "Use it"], make: derivatives },
  { id: "area", name: "Area", emoji: "🟦", tip: "Integration adds up the area under a graph. It is the derivative in reverse.", levels: ["Under a line", "Undo the power rule", "Exact areas"], make: area },
  { id: "turning", name: "Max & min", emoji: "⛰️", tip: "At the top of a hill or the bottom of a valley, the slope is zero.", levels: ["Spot it", "Find it", "Best value"], make: turning },
];
