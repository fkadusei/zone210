// Algebra Lab: the questions. Every question is made from the seeded random helper, so a seed always gives the same
// round (used by the online race and by tools/check-learn.mjs). No page code here.
import { mc, plot, poly, num } from "../../assets/learn-core.js";

const x = '<i class="m">x</i>', y = '<i class="m">y</i>', n = '<i class="m">n</i>';
const v = (name) => `<i class="m">${name}</i>`;
const lin = (a, b, l = x) => poly([[a, l], [b, ""]]);
const NAMES = ["Ama", "Leo", "Mei", "Sam", "Noor", "Ravi", "Lena", "Tomas", "Zuri", "Yuki", "Omar", "Ines"];
const THINGS = ["stickers", "marbles", "shells", "cards", "beads", "stamps"];

// ---------- a balance scale picture: boxes marked x and a numbered weight on the left, one weight on the right ----------
export function scale(boxes, left, right, tilt = 0) {
  const box = (cx, cy) => `<rect class="sc-box" x="${cx - 15}" y="${cy - 30}" width="30" height="30" rx="5"/><text class="sc-x" x="${cx}" y="${cy - 9}">x</text>`;
  const weight = (cx, cy, val) => `<circle class="sc-w" cx="${cx}" cy="${cy - 17}" r="17"/><text class="sc-n" x="${cx}" y="${cy - 12}">${val}</text>`;
  let L = "";
  const items = boxes + (left ? 1 : 0), gap = 36, start = 80 - ((items - 1) * gap) / 2;
  for (let i = 0; i < boxes; i += 1) L += box(start + i * gap, 96);
  if (left) L += weight(start + boxes * gap, 96, left);
  return `<svg class="sc" viewBox="0 0 320 170" role="img" aria-label="A balance scale: ${boxes > 1 ? `${boxes} boxes of x` : "a box of x"}${left ? ` and ${left}` : ""} on the left, ${right} on the right">
    <g transform="rotate(${tilt} 160 60)"><rect class="sc-beam" x="40" y="96" width="240" height="7" rx="3.5"/>
    <rect class="sc-pan" x="20" y="96" width="120" height="7" rx="3.5"/><rect class="sc-pan" x="180" y="96" width="120" height="7" rx="3.5"/>${L}${weight(240, 96, right)}</g>
    <path class="sc-stand" d="M160 100 L140 160 L180 160 Z"/><circle class="sc-pivot" cx="160" cy="100" r="6"/></svg>`;
}

// ---------- 1. solving equations ----------
function balance(level, r) {
  if (level === 0) {
    const kind = r.pick(["add", "add", "sub", "mul", "mul", "div"]);
    if (kind === "add") { const s = r.int(2, 12), a = r.int(2, 12); return { type: "input", q: `${x} + ${a} = ${s + a}<small>What is ${x}?</small>`, vis: scale(1, a, s + a), pre: `${x} =`, a: s, why: `Take ${a} away from both sides: ${x} = ${s + a} − ${a} = ${s}.` }; }
    if (kind === "sub") { const s = r.int(5, 20), a = r.int(2, 9); return { type: "input", q: `${x} − ${a} = ${s - a}<small>What is ${x}?</small>`, pre: `${x} =`, a: s, why: `Add ${a} to both sides: ${x} = ${s - a} + ${a} = ${s}.` }; }
    if (kind === "mul") { const s = r.int(2, 9), a = r.int(2, 4); return { type: "input", q: `${a}${x} = ${a * s}<small>What is ${x}?</small>`, vis: scale(a, 0, a * s), pre: `${x} =`, a: s, why: `${a}${x} means ${a} × ${x}. Divide both sides by ${a}: ${x} = ${a * s} ÷ ${a} = ${s}.` }; }
    const s = r.int(2, 9), a = r.int(2, 6);
    return { type: "input", q: `${x} ÷ ${a} = ${s}<small>What is ${x}?</small>`, pre: `${x} =`, a: s * a, why: `Multiply both sides by ${a}: ${x} = ${s} × ${a} = ${s * a}.` };
  }
  if (level === 1) {
    const kind = r.pick(["plus", "plus", "minus", "div"]);
    const s = r.int(2, 9), a = r.int(2, 5), b = r.int(1, 9);
    if (kind === "plus") return { type: "input", q: `${lin(a, b)} = ${a * s + b}<small>What is ${x}?</small>`, vis: a <= 4 ? scale(a, b, a * s + b) : "", pre: `${x} =`, a: s, why: `First take ${b} from both sides: ${a}${x} = ${a * s}. Then divide by ${a}: ${x} = ${s}.` };
    if (kind === "minus") return { type: "input", q: `${lin(a, -b)} = ${num(a * s - b)}<small>What is ${x}?</small>`, pre: `${x} =`, a: s, why: `First add ${b} to both sides: ${a}${x} = ${a * s}. Then divide by ${a}: ${x} = ${s}.` };
    return { type: "input", q: `${x} ÷ ${a} + ${b} = ${s + b}<small>What is ${x}?</small>`, pre: `${x} =`, a: s * a, why: `First take ${b} from both sides: ${x} ÷ ${a} = ${s}. Then multiply by ${a}: ${x} = ${s * a}.` };
  }
  if (r() < 0.35) { // brackets
    const a = r.int(2, 5), b = r.int(1, 6), s = r.int(1, 8);
    return { type: "input", q: `${a}(${lin(1, b)}) = ${a * (s + b)}<small>What is ${x}?</small>`, pre: `${x} =`, a: s, why: `Divide both sides by ${a}: ${lin(1, b)} = ${s + b}. Then take away ${b}: ${x} = ${s}.` };
  }
  const c = r.int(1, 4), a = c + r.int(1, 4), s = r.int(-3, 8) || 2, b = r.int(1, 9), d = (a - c) * s + b;
  return { type: "input", q: `${lin(a, b)} = ${lin(c, d)}<small>What is ${x}?</small>`, pre: `${x} =`, a: s, show: num(s), why: `Take ${c === 1 ? "" : c}${x} from both sides: ${lin(a - c, b)} = ${num(d)}. Take ${b} from both sides: ${poly([[a - c, x]])} = ${num(d - b)}. So ${x} = ${num(s)}.` };
}

// ---------- 2. patterns and sequences ----------
function patterns(level, r) {
  const list = (t) => t.join(", ");
  if (level === 0) {
    const d = r.int(2, 9) * r.pick([1, 1, 1, -1]), start = d < 0 ? r.int(40, 70) : r.int(1, 15), t = Array.from({ length: 5 }, (_, i) => start + i * d);
    if (r() < 0.3) { const gap = r.int(1, 3), shown = t.map((k, i) => (i === gap ? "?" : k)); return { type: "input", q: `${list(shown)}<small>Which number is missing?</small>`, a: t[gap], why: `The numbers go ${d > 0 ? "up" : "down"} by ${Math.abs(d)} each time, so the missing one is ${t[gap]}.` }; }
    return { type: "input", q: `${list(t.slice(0, 4))}, …<small>What comes next?</small>`, a: t[4], why: `The numbers go ${d > 0 ? "up" : "down"} by ${Math.abs(d)} each time: ${t[3]} ${d > 0 ? "+" : "−"} ${Math.abs(d)} = ${t[4]}.` };
  }
  if (level === 1) {
    const kind = r.pick(["times", "times", "square", "grow", "tri"]);
    if (kind === "times") { const m = r.pick([2, 2, 3, 10]), s = r.int(1, 5), t = Array.from({ length: 5 }, (_, i) => s * m ** i); return { type: "input", q: `${list(t.slice(0, 4))}, …<small>What comes next?</small>`, a: t[4], why: `Each number is ${m} times the one before: ${t[3]} × ${m} = ${t[4]}.` }; }
    if (kind === "square") { const s = r.int(1, 5), t = Array.from({ length: 5 }, (_, i) => (s + i) ** 2); return { type: "input", q: `${list(t.slice(0, 4))}, …<small>What comes next?</small>`, a: t[4], why: `These are square numbers: ${t.slice(0, 4).map((_, i) => `${s + i}×${s + i}`).join(", ")}. Next is ${s + 4}×${s + 4} = ${t[4]}.` }; }
    if (kind === "tri") { const t = [1, 3, 6, 10, 15, 21, 28], o = r.int(0, 2); return { type: "input", q: `${list(t.slice(o, o + 4))}, …<small>What comes next?</small>`, a: t[o + 4], why: `The jump grows by 1 each time (+${t[o + 1] - t[o]}, +${t[o + 2] - t[o + 1]}, +${t[o + 3] - t[o + 2]}), so add ${t[o + 4] - t[o + 3]}: ${t[o + 4]}.` }; }
    const s = r.int(1, 9), g = r.int(1, 3), t = [s]; for (let i = 0; i < 4; i += 1) t.push(t[i] + g + i);
    return { type: "input", q: `${list(t.slice(0, 4))}, …<small>What comes next?</small>`, a: t[4], why: `The jump grows by 1 each time (+${g}, +${g + 1}, +${g + 2}), so add ${g + 3}: ${t[3]} + ${g + 3} = ${t[4]}.` };
  }
  const a = r.int(2, 6), b = r.int(-4, 6), t = Array.from({ length: 4 }, (_, i) => a * (i + 1) + b);
  if (r() < 0.5) {
    const right = lin(a, b, n), { opts, a: ans } = mc(r, right, [lin(a, -b || 1, n), lin(b || 1, a, n), lin(a + 1, b, n), lin(a, b + a, n), lin(a - 1, b + 1, n), `${n} + ${a}`]);
    return { type: "choice", q: `${list(t)}, …<small>Which rule gives the ${n}th number?</small>`, opts, a: ans, why: `The numbers go up by ${a}, so the rule starts ${a}${n}. The first number is ${t[0]}, and ${a} × 1 = ${a}, so ${b === 0 ? "nothing more is needed" : `${b > 0 ? "add" : "take away"} ${Math.abs(b)}`}: ${right}.` };
  }
  const k = r.pick([10, 12, 20, 50, 100]);
  return { type: "input", q: `The rule for a pattern is ${lin(a, b, n)}.<small>What is the ${k}th number?</small>`, a: a * k + b, why: `Put ${n} = ${k} into the rule: ${a} × ${k} ${b < 0 ? "−" : "+"} ${Math.abs(b)} = ${a * k + b}.` };
}

// ---------- 3. putting numbers in for letters ----------
function substitute(level, r) {
  if (level === 0) {
    const a = r.int(2, 9), b = r.int(1, 12), k = r.int(1, 9), kind = r.pick(["plus", "minus", "from", "div"]);
    if (kind === "plus") return { type: "input", q: `If ${x} = ${k}, what is ${lin(a, b)}?`, a: a * k + b, why: `${a}${x} means ${a} × ${x}. So ${a} × ${k} + ${b} = ${a * k} + ${b} = ${a * k + b}.` };
    if (kind === "minus") return { type: "input", q: `If ${x} = ${k + 2}, what is ${lin(a, -b)}?`, a: a * (k + 2) - b, show: num(a * (k + 2) - b), why: `${a} × ${k + 2} − ${b} = ${a * (k + 2)} − ${b} = ${num(a * (k + 2) - b)}.` };
    if (kind === "from") return { type: "input", q: `If ${x} = ${k}, what is ${30 + b} − ${a}${x}?`, a: 30 + b - a * k, show: num(30 + b - a * k), why: `${30 + b} − ${a} × ${k} = ${30 + b} − ${a * k} = ${num(30 + b - a * k)}. Multiply before you subtract.` };
    const d = r.int(2, 5), m = r.int(2, 8);
    return { type: "input", q: `If ${x} = ${d * m}, what is ${x} ÷ ${d} + ${b}?`, a: m + b, why: `${d * m} ÷ ${d} = ${m}, then ${m} + ${b} = ${m + b}.` };
  }
  if (level === 1) {
    const k = r.int(2, 7), a = r.int(2, 6), b = r.int(1, 9), kind = r.pick(["sq", "bracket", "twosq", "sqminus"]);
    if (kind === "sq") return { type: "input", q: `If ${x} = ${k}, what is ${x}<sup>2</sup> + ${b}?`, a: k * k + b, why: `${x}<sup>2</sup> means ${x} × ${x}. So ${k} × ${k} + ${b} = ${k * k} + ${b} = ${k * k + b}.` };
    if (kind === "bracket") return { type: "input", q: `If ${x} = ${k}, what is ${a}(${lin(1, b)})?`, a: a * (k + b), why: `Work out the bracket first: ${k} + ${b} = ${k + b}. Then ${a} × ${k + b} = ${a * (k + b)}.` };
    if (kind === "twosq") return { type: "input", q: `If ${x} = ${k}, what is ${a}${x}<sup>2</sup>?`, a: a * k * k, why: `Square first, then multiply: ${k}<sup>2</sup> = ${k * k}, and ${a} × ${k * k} = ${a * k * k}. (It is not ${a * k} squared.)` };
    return { type: "input", q: `If ${x} = ${k + 2}, what is ${x}<sup>2</sup> − ${a}${x}?`, a: (k + 2) ** 2 - a * (k + 2), show: num((k + 2) ** 2 - a * (k + 2)), why: `${k + 2}<sup>2</sup> = ${(k + 2) ** 2} and ${a} × ${k + 2} = ${a * (k + 2)}. ${(k + 2) ** 2} − ${a * (k + 2)} = ${num((k + 2) ** 2 - a * (k + 2))}.` };
  }
  const kx = r.int(2, 6), ky = r.int(1, 5), a = r.int(2, 5), b = r.int(2, 5), kind = r.pick(["two", "prod", "negsq", "negline"]);
  if (kind === "two") return { type: "input", q: `If ${x} = ${kx} and ${y} = ${ky}, what is ${poly([[a, x], [b, y]])}?`, a: a * kx + b * ky, why: `${a} × ${kx} + ${b} × ${ky} = ${a * kx} + ${b * ky} = ${a * kx + b * ky}.` };
  if (kind === "prod") return { type: "input", q: `If ${x} = ${kx} and ${y} = ${ky}, what is ${x}${y} − ${a}?`, a: kx * ky - a, show: num(kx * ky - a), why: `${x}${y} means ${x} × ${y}. So ${kx} × ${ky} − ${a} = ${kx * ky} − ${a} = ${num(kx * ky - a)}.` };
  if (kind === "negsq") return { type: "input", q: `If ${x} = −${kx}, what is ${x}<sup>2</sup> + ${a}?`, a: kx * kx + a, why: `A negative times a negative is positive: (−${kx}) × (−${kx}) = ${kx * kx}. Then ${kx * kx} + ${a} = ${kx * kx + a}.` };
  return { type: "input", q: `If ${x} = −${kx}, what is ${a + 10} − ${b}${x}?`, a: a + 10 + b * kx, why: `${b} × (−${kx}) = −${b * kx}. Taking away a negative is the same as adding: ${a + 10} + ${b * kx} = ${a + 10 + b * kx}.` };
}

// ---------- 4. simplify, expand, factorise ----------
const gcd = (p, q) => (q ? gcd(q, p % q) : Math.abs(p));
function simplify(level, r) {
  if (level === 0) {
    const a = r.int(2, 9), b = r.int(2, 9), c = r.int(1, 9), d = r.int(1, 9), kind = r.pick(["same", "mixed", "two", "minus"]);
    if (kind === "same") { const right = poly([[a + b, x]]), o = mc(r, right, [poly([[a * b, x]]), `${a + b}${x}<sup>2</sup>`, poly([[a + b + 1, x]]), `${a + b}`]); return { type: "choice", q: `Simplify ${poly([[a, x], [b, x]])}`, ...o, why: `${a} lots of ${x} and ${b} more lots of ${x} make ${a + b} lots of ${x}.` }; }
    if (kind === "mixed") { const right = lin(a + b, c + d), o = mc(r, right, [poly([[a + b + c + d, x]]), lin(a + b, c * d), lin(a * b, c + d), lin(a + c, b + d), `${a + b + c + d}`]); return { type: "choice", q: `Simplify ${poly([[a, x], [c, ""], [b, x], [d, ""]])}`, ...o, why: `Add the ${x} terms together (${a}${x} + ${b}${x} = ${a + b}${x}) and the plain numbers together (${c} + ${d} = ${c + d}). You can't add ${x} terms to plain numbers.` }; }
    if (kind === "two") { const right = poly([[a + b, x], [c, y]]), o = mc(r, right, [poly([[a + b + c, x]]), `${a + b + c}${x}${y}`, poly([[a, x], [b + c, y]]), poly([[a + b, x], [c + 1, y]])]); return { type: "choice", q: `Simplify ${poly([[a, x], [c, y], [b, x]])}`, ...o, why: `Only like terms can be added: the ${x} terms make ${a + b}${x}. The ${c === 1 ? "" : c}${y} stays as it is.` }; }
    const big = Math.max(a, b) + 1, small = Math.min(a, b), right = poly([[big - small, x]]), o = mc(r, right, [poly([[big + small, x]]), `${big - small}`, poly([[big - small + 1, x]]), `${big - small}${x}<sup>2</sup>`, poly([[big * small, x]])]);
    return { type: "choice", q: `Simplify ${poly([[big, x], [-small, x]])}`, ...o, why: `${big} lots of ${x} take away ${small} lots of ${x} leaves ${big - small === 1 ? `one ${x}, written just as ${x}` : poly([[big - small, x]])}.` };
  }
  if (level === 1) {
    const a = r.int(2, 7), b = r.int(1, 9), c = r.int(2, 5), kind = r.pick(["plain", "plain", "coef", "neg"]);
    if (kind === "plain") { const sg = r.sign(), right = lin(a, sg * a * b), o = mc(r, right, [lin(a, sg * b), lin(1, sg * a * b), lin(a, -sg * a * b), lin(a, sg * (a + b)), poly([[a * b, x]])]); return { type: "choice", q: `Expand ${a}(${lin(1, sg * b)})`, ...o, why: `Multiply everything inside the bracket by ${a}: ${a} × ${x} = ${a}${x} and ${a} × ${b} = ${a * b}.` }; }
    if (kind === "coef") { const right = lin(a * c, a * b), o = mc(r, right, [lin(a * c, b), lin(c, a * b), lin(a + c, a + b), lin(a * c, a + b), lin(a * c, -a * b)]); return { type: "choice", q: `Expand ${a}(${lin(c, b)})`, ...o, why: `Multiply both terms by ${a}: ${a} × ${c}${x} = ${a * c}${x} and ${a} × ${b} = ${a * b}.` }; }
    const right = lin(-a, a * b), o = mc(r, right, [lin(-a, -a * b), lin(a, -a * b), lin(-a, b), lin(-a, -b), lin(a, a * b)]);
    return { type: "choice", q: `Expand −${a}(${lin(1, -b)})`, ...o, why: `−${a} × ${x} = −${a}${x}, and −${a} × −${b} = +${a * b}, because a negative times a negative is positive.` };
  }
  const kind = r.pick(["common", "common", "quad", "double"]);
  if (kind === "common") {
    const f = r.int(2, 6); let p = r.int(1, 5), q = r.int(1, 7);
    while (gcd(p, q) !== 1) q += 1;
    const right = `${f}(${lin(p, q)})`, o = mc(r, right, [`${f}(${lin(p, f * q)})`, `${f}(${lin(f * p, q)})`, `${p}(${lin(f, q)})`, `${f}(${lin(p, q + 1)})`, `${f + 1}(${lin(p, q)})`, `${f}(${lin(p, -q)})`]);
    return { type: "choice", q: `Factorise ${lin(f * p, f * q)}`, ...o, why: `${f} is the biggest number that divides both ${f * p} and ${f * q}. Take it outside: ${f} × ${p === 1 ? "" : p}${x} = ${f * p}${x} and ${f} × ${q} = ${f * q}.` };
  }
  const p = r.int(1, 6), q2 = r.int(1, 6) * (kind === "quad" && r() < 0.3 ? -1 : 1), q = q2 === -p ? q2 - 1 : q2;
  const quad = poly([[1, `${x}<sup>2</sup>`], [p + q, x], [p * q, ""]]), br = (m, k) => `(${lin(1, m)})(${lin(1, k)})`;
  if (kind === "quad") {
    const right = br(Math.max(p, q), Math.min(p, q)), o = mc(r, right, [br(p + q, 1), br(p * q, 1), br(-Math.max(p, q), -Math.min(p, q)), br(Math.max(p, q) + 1, Math.min(p, q) - 1 || -2), br(Math.max(p, -q), Math.min(p, -q))]);
    return { type: "choice", q: `Factorise ${quad}`, ...o, why: `Find two numbers that multiply to ${num(p * q)} and add to ${num(p + q)}: ${num(p)} and ${num(q)}.` };
  }
  const o = mc(r, quad, [poly([[1, `${x}<sup>2</sup>`], [p * q, x], [p + q, ""]]), poly([[1, `${x}<sup>2</sup>`], [p * q, ""]]), poly([[1, `${x}<sup>2</sup>`], [p + q, x], [p + q, ""]]), poly([[2, x], [p + q, ""]]), poly([[1, `${x}<sup>2</sup>`], [p + q + 1, x], [p * q, ""]])]);
  return { type: "choice", q: `Expand ${br(p, q)}`, ...o, why: `Multiply each term in the first bracket by each in the second: ${x}<sup>2</sup>, ${num(q)}${x}, ${num(p)}${x} and ${num(p * q)}. Add the ${x} terms: ${num(p + q)}${x}.` };
}

// ---------- 5. straight-line graphs ----------
const lineEq = (m, c) => `${y} = ${poly([[m, x], [c, ""]])}`;
const half = (m) => (Number.isInteger(m) ? m : null);
function eqText(m, c) { // gradients of a half are written as a fraction
  if (half(m) !== null) return lineEq(m, c);
  const fr = `${m < 0 ? "−" : ""}<span class="fr"><span>1</span><span>2</span></span>${x}`;
  return `${y} = ${fr}${c ? ` ${c < 0 ? "−" : "+"} ${Math.abs(c)}` : ""}`;
}
function graphs(level, r) {
  if (level === 0) {
    const m = r.pick([1, 2, 3, -1, -2]), c = r.int(-3, 3), k = r.int(-2, 3), val = m * k + c;
    if (Math.abs(val) > 9) return graphs(level, r);
    return { type: "input", q: `The line is ${lineEq(m, c)}.<small>What is ${y} when ${x} = ${num(k)}?</small>`, vis: plot({ x: [-5, 5], y: [-10, 10], step: 1, fns: [{ f: (t) => m * t + c }], label: `The line y = ${m}x + ${c}` }), pre: `${y} =`, a: val, show: num(val), why: `Put ${x} = ${num(k)} into the rule: ${num(m)} × ${k < 0 ? `(${num(k)})` : k} ${c < 0 ? "−" : "+"} ${Math.abs(c)} = ${num(val)}. You can also read it from the graph.` };
  }
  const m = r.pick([1, 2, 3, -1, -2, 0.5, -0.5]), c = r.int(-3, 3), x1 = Number.isInteger(m) ? r.int(-1, 0) : r.pick([-2, 0]), x2 = x1 + (Number.isInteger(m) ? r.int(1, 2) : 2);
  if (Math.abs(m * x2 + c) > 8 || Math.abs(m * x1 + c) > 8) return graphs(level, r);
  const pic = plot({ x: [-6, 6], y: [-8, 8], fns: [{ f: (t) => m * t + c }], pts: [{ x: x1, y: m * x1 + c }, { x: x2, y: m * x2 + c }], label: "A straight line with two marked points" });
  const rise = m * x2 + c - (m * x1 + c), run = x2 - x1;
  if (level === 1) {
    if (r() < 0.5) return { type: "input", q: `What is the gradient (steepness) of this line?<small>Go from one dot to the other: how far up or down, for each step across?</small>`, vis: pic, a: m, show: Number.isInteger(m) ? num(m) : `${m < 0 ? "−" : ""}1/2`, why: `From (${num(x1)}, ${num(m * x1 + c)}) to (${num(x2)}, ${num(m * x2 + c)}) the line goes ${rise < 0 ? "down" : "up"} ${Math.abs(rise)} while going across ${run}. Gradient = ${num(rise)} ÷ ${run} = ${Number.isInteger(m) ? num(m) : `${m < 0 ? "−" : ""}1/2`}.` };
    return { type: "input", q: `Where does this line cross the ${y}-axis?<small>That number is called the ${y}-intercept.</small>`, vis: pic, pre: `${y} =`, a: c, show: num(c), why: `The line crosses the up-and-down axis at ${y} = ${num(c)}. That is the value of ${y} when ${x} = 0.` };
  }
  const right = eqText(m, c), wrongs = [eqText(-m, c), eqText(m, -c || 2), eqText(m, c + 2), eqText(Number.isInteger(m) ? m + 1 : m * 2, c), eqText(c || 2, Number.isInteger(m) ? m : 1), eqText(m, c - 2)];
  return { type: "choice", q: `Which rule matches this line?`, vis: pic, ...mc(r, right, wrongs), why: `It crosses the ${y}-axis at ${num(c)}, and it goes ${rise < 0 ? "down" : "up"} ${Math.abs(rise)} for every ${run} across, so the gradient is ${Number.isInteger(m) ? num(m) : `${m < 0 ? "−" : ""}1/2`}. A line is ${y} = gradient × ${x} + intercept.` };
}

// ---------- 6. word problems ----------
function words(level, r) {
  const who = r.pick(NAMES), other = r.pick(NAMES.filter((k) => k !== who)), thing = r.pick(THINGS);
  if (level === 0) {
    const s = r.int(3, 15), a = r.int(2, 12), m = r.int(2, 5), kind = r.pick(["add", "sub", "mul", "double", "half"]);
    if (kind === "add") return { type: "input", q: `I think of a number. I add ${a} and get ${s + a}.<small>What is my number?</small>`, a: s, why: `Work backwards: ${s + a} − ${a} = ${s}. As algebra: ${x} + ${a} = ${s + a}.` };
    if (kind === "sub") return { type: "input", q: `I think of a number. I take away ${a} and get ${s}.<small>What is my number?</small>`, a: s + a, why: `Work backwards: ${s} + ${a} = ${s + a}. As algebra: ${x} − ${a} = ${s}.` };
    if (kind === "mul") return { type: "input", q: `I think of a number. I multiply it by ${m} and get ${m * s}.<small>What is my number?</small>`, a: s, why: `Work backwards: ${m * s} ÷ ${m} = ${s}. As algebra: ${m}${x} = ${m * s}.` };
    if (kind === "double") return { type: "input", q: `I think of a number. I double it and add ${a}. I get ${2 * s + a}.<small>What is my number?</small>`, a: s, why: `Undo the steps in reverse: ${2 * s + a} − ${a} = ${2 * s}, then ${2 * s} ÷ 2 = ${s}. As algebra: 2${x} + ${a} = ${2 * s + a}.` };
    return { type: "input", q: `I think of a number. I halve it and get ${s}.<small>What is my number?</small>`, a: 2 * s, why: `Halving is undone by doubling: ${s} × 2 = ${2 * s}. As algebra: ${x} ÷ 2 = ${s}.` };
  }
  if (level === 1) {
    const kind = r.pick(["more", "share", "packs", "rect", "ages"]);
    if (kind === "more") { const s = r.int(4, 15), d = r.int(2, 9); return { type: "input", q: `${who} has ${d} more ${thing} than ${other}. Together they have ${2 * s + d}.<small>How many does ${other} have?</small>`, a: s, why: `If ${other} has ${x}, ${who} has ${x} + ${d}. So ${x} + ${x} + ${d} = ${2 * s + d}, which gives 2${x} = ${2 * s} and ${x} = ${s}.` }; }
    if (kind === "share") { const k = r.int(3, 6), s = r.int(3, 9), left = r.int(1, k - 1); return { type: "input", q: `${who} shares ${k * s + left} ${thing} equally among ${k} friends and has ${left} left over.<small>How many does each friend get?</small>`, a: s, why: `${k}${x} + ${left} = ${k * s + left}. Take away ${left}: ${k}${x} = ${k * s}. Divide by ${k}: ${x} = ${s}.` }; }
    if (kind === "packs") { const k = r.int(3, 6), s = r.int(4, 12), extra = r.int(2, 9); return { type: "input", q: `${who} buys ${k} packs of ${thing} and gets ${extra} loose ones free. That makes ${k * s + extra} altogether.<small>How many are in one pack?</small>`, a: s, why: `${k}${x} + ${extra} = ${k * s + extra}. Take away ${extra}: ${k}${x} = ${k * s}. Divide by ${k}: ${x} = ${s}.` }; }
    if (kind === "rect") { const wd = r.int(2, 9), extra = r.int(1, 6); return { type: "input", q: `A rectangle is ${extra} cm longer than it is wide. Its perimeter (all the way round) is ${4 * wd + 2 * extra} cm.<small>How wide is it, in cm?</small>`, a: wd, unit: "cm", why: `Width ${x}, length ${x} + ${extra}. Perimeter = 2 widths + 2 lengths = 4${x} + ${2 * extra} = ${4 * wd + 2 * extra}. So 4${x} = ${4 * wd} and ${x} = ${wd}.` }; }
    const age = r.int(6, 12), m = r.int(2, 4), plus = r.int(1, 6);
    return { type: "input", q: `${who}'s aunt is ${m === 2 ? "twice" : `${m} times`} as old as ${who}, plus ${plus} years. The aunt is ${m * age + plus}.<small>How old is ${who}?</small>`, a: age, why: `${m}${x} + ${plus} = ${m * age + plus}. Take away ${plus}: ${m}${x} = ${m * age}. Divide by ${m}: ${x} = ${age}.` };
  }
  const a = r.int(2, 4), b = r.int(2, 9), total = r.int(20, 60), kind = r.pick(["twice", "each", "spend", "equal"]);
  if (kind === "twice") { const right = `${x} + ${lin(a, b)} = ${total}`; return { type: "choice", q: `${who} has ${x} ${thing}. ${other} has ${b} more than ${a} times as many. Together they have ${total}.<small>Which equation fits the story?</small>`, ...mc(r, right, [`${lin(a, b)} = ${total}`, `${x} + ${a}(${lin(1, b)}) = ${total}`, `${a}${x} = ${total} + ${b}`, `${x} + ${lin(a, -b)} = ${total}`]), why: `${other} has ${lin(a, b)}. Add ${who}'s ${x} to get the total: ${right}.` }; }
  if (kind === "each") { const right = `${lin(a, b)} = ${total}`; return { type: "choice", q: `A ride costs ${b} tokens to enter and ${a} tokens for each lap. ${who} spent ${total} tokens on ${x} laps.<small>Which equation fits the story?</small>`, ...mc(r, right, [`${lin(b, a)} = ${total}`, `${a + b}${x} = ${total}`, `${a}(${lin(1, b)}) = ${total}`, `${lin(a, -b)} = ${total}`]), why: `Each lap costs ${a}, so ${x} laps cost ${a}${x}. Add the ${b} to enter: ${right}.` }; }
  if (kind === "spend") { const right = `${total} − ${a}${x} = ${b}`; return { type: "choice", q: `${who} had ${total} ${thing}, then gave ${x} to each of ${a} friends. Now ${who} has ${b} left.<small>Which equation fits the story?</small>`, ...mc(r, right, [`${total} − ${x} = ${a * b}`, `${a}${x} − ${total} = ${b}`, `${total} + ${a}${x} = ${b}`, `${lin(a, b)} = ${total + 1}`]), why: `${a} friends each got ${x}, so ${a}${x} were given away. Start with ${total}, take those away, and ${b} are left: ${right}.` }; }
  const right = `${lin(a + 1, b)} = ${lin(a, total)}`;
  return { type: "choice", q: `${who} has ${a + 1} bags with ${x} ${thing} in each, plus ${b} loose ones. ${other} has ${a} of the same bags, plus ${total} loose ones. They have the same number.<small>Which equation fits the story?</small>`, ...mc(r, right, [`${lin(a + 1, b)} + ${lin(a, total)} = 0`, `${lin(a + 1, total)} = ${lin(a, b)}`, `${a + 1}(${lin(1, b)}) = ${a}(${lin(1, total)})`, `${lin(2 * a + 1, b)} = ${total}`]), why: `${who}: ${lin(a + 1, b)}. ${other}: ${lin(a, total)}. "The same number" means the two are equal.` };
}

export const TOPICS = [
  { id: "balance", name: "Equations", emoji: "⚖️", tip: "An equation is like a balance scale. Whatever you do to one side, do to the other.", levels: ["One step", "Two steps", "x on both sides"], make: balance },
  { id: "patterns", name: "Patterns", emoji: "🔢", tip: "Look at how the numbers change from one to the next.", levels: ["Add or subtract", "Multiply and squares", "Find the rule"], make: patterns },
  { id: "substitute", name: "Substitute", emoji: "🧮", tip: "Swap each letter for its number, then work it out. Multiply and divide before you add and subtract.", levels: ["One letter", "Brackets and powers", "Two letters, negatives"], make: substitute },
  { id: "simplify", name: "Simplify", emoji: "🧩", tip: "Like terms have the same letters. Only like terms can be added together.", levels: ["Like terms", "Expand brackets", "Factorise"], make: simplify },
  { id: "graphs", name: "Lines", emoji: "📈", tip: "A straight line follows the rule y = gradient × x + intercept.", levels: ["Read the line", "Gradient, intercept", "Name the line"], make: graphs },
  { id: "words", name: "Word problems", emoji: "💬", tip: "Call the unknown number x, then write what the story tells you.", levels: ["Think of a number", "Everyday problems", "Write the equation"], make: words },
];
