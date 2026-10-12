/**
 * The parts of the learning-game kit that need no page: seeded random numbers, multiple-choice helpers, graphs as SVG
 * text, and checking typed answers. Games' question files import from here, so tools/check-learn.mjs can test them in Node.
 */
/** Seeded random numbers, so two players (and the tests) can get exactly the same questions. */
export function rng(seed) {
  let a = (Math.imul(seed ^ 0x9e3779b9, 0x85ebca6b) ^ (seed >>> 13)) >>> 0; // scrambled, so seeds 1, 2, 3 give unrelated rounds
  const r = () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  r.int = (lo, hi) => lo + Math.floor(r() * (hi - lo + 1));
  r.pick = (arr) => arr[Math.floor(r() * arr.length)];
  r.shuffle = (arr) => { const b = arr.slice(); for (let i = b.length - 1; i > 0; i -= 1) { const j = Math.floor(r() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
  r.sign = () => (r() < 0.5 ? -1 : 1);
  return r;
}
/** A multiple-choice question's options from one right answer and some wrong ones (repeats are dropped). */
export function mc(r, right, wrongs, n = 4) {
  const seen = new Set([String(right)]), w = [];
  for (const x of r.shuffle(wrongs)) { if (!seen.has(String(x))) { seen.add(String(x)); w.push(x); } if (w.length === n - 1) break; }
  const opts = r.shuffle([right, ...w]);
  return { opts, a: opts.indexOf(right) };
}
/** Plausible wrong numbers near a right one. */
export const near = (n) => [n + 1, n - 1, n + 2, n - 2, n + 3, n - 3, n * 2, -n, n + 10, n - 10, n + 5].filter((x) => x !== n);

/** A small graph as an SVG string. fns: [{ f, cls }], pts: [{ x, y, label }], segs: [{ x1, y1, x2, y2, cls }], shade: { f, a, b }, bars: [{ x, w, h }]. */
export function plot({ w = 320, h = 240, x = [-5, 5], y = [-5, 5], fns = [], pts = [], segs = [], shade = null, bars = [], step = 1, label = "Graph" }) {
  const pad = 14, X = (v) => pad + ((v - x[0]) / (x[1] - x[0])) * (w - 2 * pad), Y = (v) => h - pad - ((v - y[0]) / (y[1] - y[0])) * (h - 2 * pad);
  const f2 = (n) => n.toFixed(1);
  let s = `<svg class="pl" viewBox="0 0 ${w} ${h}" role="img" aria-label="${label}">`;
  for (let v = Math.ceil(x[0] / step) * step; v <= x[1] + 1e-9; v += step) s += `<line class="pl-grid" x1="${f2(X(v))}" y1="${f2(Y(y[0]))}" x2="${f2(X(v))}" y2="${f2(Y(y[1]))}"/>`;
  for (let v = Math.ceil(y[0] / step) * step; v <= y[1] + 1e-9; v += step) s += `<line class="pl-grid" x1="${f2(X(x[0]))}" y1="${f2(Y(v))}" x2="${f2(X(x[1]))}" y2="${f2(Y(v))}"/>`;
  const clampY = (v) => Math.max(y[0] - (y[1] - y[0]), Math.min(y[1] + (y[1] - y[0]), v));
  if (shade) {
    let d = `M${f2(X(shade.a))} ${f2(Y(0))}`;
    for (let i = 0; i <= 60; i += 1) { const xv = shade.a + ((shade.b - shade.a) * i) / 60; d += ` L${f2(X(xv))} ${f2(Y(clampY(shade.f(xv))))}`; }
    s += `<path class="pl-shade" d="${d} L${f2(X(shade.b))} ${f2(Y(0))} Z"/>`;
  }
  bars.forEach((b) => { const top = Math.max(b.h, 0), bot = Math.min(b.h, 0); s += `<rect class="pl-bar" x="${f2(X(b.x))}" y="${f2(Y(top))}" width="${f2(X(b.x + b.w) - X(b.x))}" height="${f2(Y(bot) - Y(top))}"/>`; });
  if (y[0] <= 0 && y[1] >= 0) s += `<line class="pl-axis" x1="${f2(X(x[0]))}" y1="${f2(Y(0))}" x2="${f2(X(x[1]))}" y2="${f2(Y(0))}"/>`;
  if (x[0] <= 0 && x[1] >= 0) s += `<line class="pl-axis" x1="${f2(X(0))}" y1="${f2(Y(y[0]))}" x2="${f2(X(0))}" y2="${f2(Y(y[1]))}"/>`;
  // numbers along the axes (every step, or every second step when crowded)
  const every = (x[1] - x[0]) / step > 12 ? 2 : 1, ax = Math.max(y[0], Math.min(y[1], 0)), ay = Math.max(x[0], Math.min(x[1], 0));
  for (let v = Math.ceil(x[0] / step) * step, i = 0; v <= x[1] + 1e-9; v += step, i += 1) if (Math.abs(v) > 1e-9 && Math.round(v / step) % every === 0) s += `<text class="pl-num" x="${f2(X(v))}" y="${f2(Y(ax) + 11)}" text-anchor="middle">${+v.toFixed(2)}</text>`;
  const everyY = (y[1] - y[0]) / step > 12 ? 2 : 1;
  for (let v = Math.ceil(y[0] / step) * step; v <= y[1] + 1e-9; v += step) if (Math.abs(v) > 1e-9 && Math.round(v / step) % everyY === 0) s += `<text class="pl-num" x="${f2(X(ay) - 4)}" y="${f2(Y(v) + 3)}" text-anchor="end">${+v.toFixed(2)}</text>`;
  s += `<clipPath id="plc${w}${h}"><rect x="${pad}" y="${pad}" width="${w - 2 * pad}" height="${h - 2 * pad}"/></clipPath><g clip-path="url(#plc${w}${h})">`;
  fns.forEach(({ f, cls = "" }) => {
    let d = "", pen = false;
    for (let i = 0; i <= 160; i += 1) { const xv = x[0] + ((x[1] - x[0]) * i) / 160, yv = f(xv); if (!Number.isFinite(yv)) { pen = false; continue; } d += `${pen ? "L" : "M"}${f2(X(xv))} ${f2(Y(clampY(yv)))} `; pen = true; }
    s += `<path class="pl-fn ${cls}" d="${d}"/>`;
  });
  segs.forEach((g) => { s += `<line class="pl-seg ${g.cls || ""}" x1="${f2(X(g.x1))}" y1="${f2(Y(g.y1))}" x2="${f2(X(g.x2))}" y2="${f2(Y(g.y2))}"/>`; });
  s += "</g>";
  pts.forEach((p) => { s += `<circle class="pl-pt ${p.cls || ""}" cx="${f2(X(p.x))}" cy="${f2(Y(p.y))}" r="5"/>${p.label ? `<text class="pl-lab" x="${f2(X(p.x) + 8)}" y="${f2(Y(p.y) - 8)}">${p.label}</text>` : ""}`; });
  return `${s}</svg>`;
}

/** "3/4", "-2.5", "1,200" or "−3" as a number (NaN if it isn't one). */
export function toNumber(text) {
  const t = String(text).trim().replace(/−/g, "-").replace(/,/g, "").replace(/\s+/g, "");
  if (/^-?\d+(\.\d+)?\/-?\d+(\.\d+)?$/.test(t)) { const [n, d] = t.split("/").map(Number); return d === 0 ? NaN : n / d; }
  return /^-?(\d+\.?\d*|\.\d+)$/.test(t) ? Number(t) : NaN;
}
const norm = (t) => String(t).toLowerCase().replace(/[−–]/g, "-").replace(/\s+/g, "").replace(/\*/g, "");
/** Is this typed answer right? Numbers may be typed as decimals or fractions; text ignores spaces and capitals. */
export function rightInput(q, typed) {
  const accepted = [q.a, ...(q.alt || [])];
  return accepted.some((a) => (typeof a === "number" ? Math.abs(toNumber(typed) - a) <= (q.tol ?? 1e-6) : norm(typed) === norm(a)));
}


// ---------- writing maths ----------
export const num = (k) => (k < 0 ? `−${-k}` : `${k}`); // a proper minus sign
/** "3x − 2", "−x + 5", "x² + 5x + 6" from [coefficient, letters] pairs (letters "" for a plain number). */
export function poly(terms) {
  const live = terms.filter(([c]) => c !== 0);
  if (!live.length) return "0";
  return live.map(([c, l], i) => {
    const mag = Math.abs(c), body = l ? `${mag === 1 ? "" : mag}${l}` : `${mag}`;
    return i === 0 ? `${c < 0 ? "−" : ""}${body}` : ` ${c < 0 ? "−" : "+"} ${body}`;
  }).join("");
}
