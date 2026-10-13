// Draw & Animate: the parts with no page code (checked by tools/check-draw-animate.mjs).
// A stroke is { c: colour, w: width, e: 1 if it rubs out, p: [x0, y0, x1, y1, …] }, optionally with:
//   k: 1  its corners stay sharp (lines and shapes; a finger-drawn stroke is smoothed instead)
//   ff    a colour its inside is filled with (the Fill tool)
//   ch    a sticker: one emoji drawn w pixels tall at its single point, m: 1 if it is mirrored to face right
//   fig   a hand-drawn person (people.js) w pixels tall at its single point, with sk (skin tone) and hc (hair colour)
//   r     how far a sticker or person has been turned (radians)
// A "thing" is a little drawing with its own movement: { s: strokes (measured from its middle), x, y (where its middle
// sits), move, act, speed, face, path }.
const TAU = Math.PI * 2;
export const W = 800, H = 600;
export const MOVES = [["stay", "Stay put"], ["side", "Side to side"], ["updown", "Up and down"], ["circle", "Round in a circle"], ["path", "Follow my path"]];
export const ACTS = [["none", "Nothing else"], ["bounce", "Bounce"], ["spin", "Spin"], ["wiggle", "Wiggle"], ["pulse", "Grow and shrink"]];
export const SPEEDS = [[0.5, "Slow"], [1, "Medium"], [2, "Fast"]];

/** The box around some strokes, allowing for how thick the lines are (a turned sticker or person needs more room). */
export function bbox(strokes) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const s of strokes) { if (s.e) continue; const h = s.ch ? s.w * (s.r ? 0.72 : 0.62) : s.fig ? s.w * (s.r ? 0.6 : 0.56) : s.w / 2; for (let i = 0; i < s.p.length; i += 2) { x0 = Math.min(x0, s.p[i] - h); x1 = Math.max(x1, s.p[i] + h); y0 = Math.min(y0, s.p[i + 1] - h); y1 = Math.max(y1, s.p[i + 1] + h); } }
  return x0 === Infinity ? null : { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
}
const r1 = (v) => Math.round(v * 10) / 10;
// a stroke's joint (the pin it swings from, see JOINTS below) and its elbow or knee go wherever the stroke goes
const pins = (s, f) => ({ ...(s.j ? { j: f(s.j[0], s.j[1]) } : {}), ...(s.jx ? { jx: s.jx.map((e) => [...f(e[0], e[1]), e[2] ? 1 : 0]) } : {}) });
export const shift = (strokes, dx, dy) => strokes.map((s) => ({ ...s, p: s.p.map((v, i) => r1(v + (i % 2 ? dy : dx))), ...pins(s, (x, y) => [r1(x + dx), r1(y + dy)]) }));
/** Strokes made k times bigger (or smaller) about the point (ox, oy): their lines get thicker or thinner to match. */
export const scaled = (strokes, k, ox = 0, oy = 0) => strokes.map((s) => ({ ...s, w: Math.max(s.ch || s.fig ? 14 : 1, Math.round(s.w * k * 10) / 10), p: s.p.map((v, i) => Math.round(((i % 2 ? oy : ox) + (v - (i % 2 ? oy : ox)) * k) * 10) / 10), ...pins(s, (x, y) => [r1(ox + (x - ox) * k), r1(oy + (y - oy) * k)]) }));
/** Strokes turned by `angle` (radians, clockwise on screen) about the point (ox, oy). A sticker or person keeps its own turn in `r`. */
export function turned(strokes, angle, ox = 0, oy = 0) {
  const c = Math.cos(angle), n = Math.sin(angle), r1 = (v) => Math.round(v * 10) / 10;
  return strokes.map((s) => {
    const p = []; for (let i = 0; i < s.p.length; i += 2) { const dx = s.p[i] - ox, dy = s.p[i + 1] - oy; p.push(r1(ox + dx * c - dy * n), r1(oy + dx * n + dy * c)); }
    const j = pins(s, (x, y) => [r1(ox + (x - ox) * c - (y - oy) * n), r1(oy + (x - ox) * n + (y - oy) * c)]);
    return s.ch || s.fig ? { ...s, p, ...j, r: Math.round(((s.r || 0) + (s.m ? -angle : angle)) * 1000) / 1000 } : { ...s, p, ...j };
  });
}
/** The top-most stroke, shape, sticker or person at a point (its place in the list), or -1. Erasing is passed over. */
export function itemAt(strokes, x, y, slack = 10) {
  for (let i = strokes.length - 1; i >= 0; i -= 1) { if (strokes[i].e) continue; const b = bbox([strokes[i]]); if (b && x >= b.x0 - slack && x <= b.x1 + slack && y >= b.y0 - slack && y <= b.y1 + slack) return i; }
  return -1;
}

// ---------- joints: parts of a pen drawing that bend ----------
// A stroke with a joint has j: [x, y] (the pin it swings from), ja (how far: an index into JOINTS), jn (1 if it
// swings the opposite way to the others, as a second leg does) and jg, the number of its joint: strokes with the
// same jg share a pin and swing together. A joint may also have jx: [[x, y, flip], …], its elbows or knees: at each one,
// everything beyond it bends again, to one side only (flip: 1 for the other side). An arm has one; a tail or a
// tentacle can have several. (Drawings saved earlier had a single one, as j2 and jb: see oldJoints.)
export const JOINTS = [["A little", 0.2], ["Some", 0.42], ["A lot", 0.75]];
/** The angle (radians) a jointed stroke is turned by at time t seconds. */
export const jointAngle = (s, t) => (JOINTS[s.ja] || JOINTS[1])[1] * Math.sin(t * TAU * 1.4 + (s.jn ? Math.PI : 0));
/** The nearest place on a stroke's line to a point: { d: how far, i: where in p that piece of line starts, x, y }. */
export function nearestOn(s, x, y) {
  let best = { d: Math.hypot(x - s.p[0], y - s.p[1]), i: 0, x: s.p[0], y: s.p[1] };
  for (let k = 0; k < s.p.length - 2; k += 2) {
    const ax = s.p[k], ay = s.p[k + 1], bx = s.p[k + 2], by = s.p[k + 3], len = (bx - ax) ** 2 + (by - ay) ** 2;
    const u = len ? Math.max(0, Math.min(1, ((x - ax) * (bx - ax) + (y - ay) * (by - ay)) / len)) : 0, px = ax + u * (bx - ax), py = ay + u * (by - ay), d = Math.hypot(x - px, y - py);
    if (d < best.d) best = { d, i: k, x: px, y: py };
  }
  return best;
}
/** Drawings saved when a part could have only one elbow (j2, jb) are brought up to date. */
export function oldJoints(strokes) { strokes.forEach((s) => { if (s.j2) { if (s.j) s.jx = [[s.j2[0], s.j2[1], s.jb ? 1 : 0]]; delete s.j2; delete s.jb; } }); return strokes; }
/**
 * The elbows and knees of a jointed stroke at time t. Returns { a, p, turns }.
 * `a` is the angle of each one, in the order of s.jx. Each folds one way only, from straight to bent and back, and
 * each one further from the pin follows a little later, so a tail with several curls like a whip.
 * `p` is the stroke's points with everything beyond each elbow turned about it, working from the far end inwards
 * (so an outer bend is carried round by an inner one). An elbow that is on another line of the same part (this is
 * the hand; the elbow is on the arm) turns the whole stroke if the stroke lies beyond it.
 * A sticker or a person cannot be re-drawn point by point, so for those `turns` lists [x, y, angle] to apply to the
 * canvas in order.
 */
export function bend(s, t) {
  const amp = (JOINTS[s.ja] || JOINTS[1])[1], [hx, hy] = s.j, n = s.jx.length, from = (x, y) => Math.hypot(x - hx, y - hy);
  const order = s.jx.map((_, k) => k).sort((a, b) => from(s.jx[a][0], s.jx[a][1]) - from(s.jx[b][0], s.jx[b][1])); // nearest the pin first
  const a = new Array(n);
  order.forEach((k, rank) => { a[k] = (s.jx[k][2] ? -1 : 1) * ((amp * 1.5) / (1 + 0.35 * (n - 1))) * (0.5 + 0.5 * Math.sin(t * TAU * 1.4 + (s.jn ? Math.PI : 0) - 1.1 - 0.6 * rank)); });
  let ih = 0, dh = Infinity, cx = 0, cy = 0;
  for (let i = 0; i < s.p.length; i += 2) { const d = from(s.p[i], s.p[i + 1]); if (d < dh) { dh = d; ih = i; } cx += s.p[i]; cy += s.p[i + 1]; }
  const far = from(cx / (s.p.length / 2), cy / (s.p.length / 2)), beyond = (k) => far > from(s.jx[k][0], s.jx[k][1]);
  if (s.ch || s.fig) return { a, p: s.p, turns: order.filter(beyond).map((k) => [s.jx[k][0], s.jx[k][1], a[k]]) };
  const rest = s.p, p = s.p.slice();
  for (const k of order.slice().reverse()) {
    const [ex, ey] = s.jx[k], c = Math.cos(a[k]), sn = Math.sin(a[k]);
    let ie = 0, de = Infinity;
    for (let i = 0; i < rest.length; i += 2) { const d = Math.hypot(rest[i] - ex, rest[i + 1] - ey); if (d < de) { de = d; ie = i; } }
    const on = de <= 14, tail = ie >= ih; // is the elbow on this line, and which way along it leads away from the pin
    if (!on && !beyond(k)) continue;
    for (let i = on && tail ? ie + 2 : 0; i < (on && !tail ? ie : p.length); i += 2) { const dx = p[i] - ex, dy = p[i + 1] - ey; p[i] = ex + dx * c - dy * sn; p[i + 1] = ey + dx * sn + dy * c; }
  }
  return { a, p, turns: [] };
}
/** How far outside its resting box a jointed stroke can reach as it swings. */
export function jointReach(s) {
  if (!s.j) return 0;
  let far = 0; for (let i = 0; i < s.p.length; i += 2) far = Math.max(far, Math.hypot(s.p[i] - s.j[0], s.p[i + 1] - s.j[1]));
  return (far + (s.ch || s.fig ? s.w * 0.6 : s.w / 2)) * Math.min(1, (JOINTS[s.ja] || JOINTS[1])[1] * (s.jx && s.jx.length ? 2.4 : 1.1));
}
/**
 * Where a part joins the rest of the drawing: the point of stroke `i` that is nearest to any other stroke.
 * An arm's is its shoulder, a leg's its hip. `skip(stroke)` leaves strokes out (the part's own hand or foot).
 */
export function hingeOf(strokes, i, skip = () => false) {
  const s = strokes[i]; let best = [s.p[0], s.p[1]], bestD = Infinity;
  const some = (p) => { const step = Math.max(2, Math.ceil(p.length / 160) * 2), at = []; for (let a = 0; a < p.length; a += step) at.push(a); if (at[at.length - 1] !== p.length - 2) at.push(p.length - 2); return at; }; // a long stroke is sampled, always with both its ends
  const others = strokes.filter((o, k) => k !== i && !o.e && !skip(o)).map((o) => [o, some(o.p)]);
  for (const a of some(s.p)) for (const [o, at] of others) for (const b of at) { const d = Math.hypot(s.p[a] - o.p[b], s.p[a + 1] - o.p[b + 1]); if (d < bestD) { bestD = d; best = [s.p[a], s.p[a + 1]]; } }
  return [Math.round(best[0]), Math.round(best[1])];
}
/** The stroke nearest a point (its place in the list) if it is within reach, or -1. A tap inside a coloured-in shape, a sticker or a person counts as touching it. */
export function strokeNear(strokes, x, y, reach = 22) {
  let best = -1, bestD = Infinity;
  strokes.forEach((s, i) => {
    if (s.e) return;
    let d = Infinity;
    if (s.ch || s.fig) { const b = bbox([s]); d = x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1 ? 0 : Infinity; }
    else if (s.ff && s.p.length >= 6 && inside(s.p, x, y)) d = 0;
    else if (s.p.length === 2) d = Math.hypot(x - s.p[0], y - s.p[1]) - s.w / 2;
    else for (let k = 0; k < s.p.length - 2; k += 2) {
      const ax = s.p[k], ay = s.p[k + 1], bx = s.p[k + 2], by = s.p[k + 3], len = (bx - ax) ** 2 + (by - ay) ** 2;
      const u = len ? Math.max(0, Math.min(1, ((x - ax) * (bx - ax) + (y - ay) * (by - ay)) / len)) : 0;
      d = Math.min(d, Math.hypot(x - ax - u * (bx - ax), y - ay - u * (by - ay)) - s.w / 2);
    }
    if (d <= reach && d <= bestD) { best = i; bestD = d; } // <= so that, of two equally near, the one on top wins
  });
  return best;
}

/** Strokes drawn on the stage become a thing: its strokes are re-measured from the middle of its box. */
export function makeThing(strokes, old = {}) {
  const b = bbox(strokes);
  if (!b) return null;
  return { move: "stay", act: "none", speed: 1, face: true, path: null, ...old, s: shift(strokes, -b.cx, -b.cy), x: Math.round(b.cx), y: Math.round(b.cy) };
}
/** A thing's strokes back in stage positions (for adding to it). */
export const stageStrokes = (thing) => shift(thing.s, thing.x, thing.y);

export const SHAPES = [["line", "Line"], ["rect", "Rectangle"], ["oval", "Oval"], ["tri", "Triangle"], ["diamond", "Diamond"], ["star", "Star"], ["heart", "Heart"]];
/** The outline of a shape dragged from one corner (x0, y0) to the other (x1, y1), as stroke points that end where they start. */
export function shapePoints(kind, x0, y0, x1, y1) {
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, rx = (x1 - x0) / 2, ry = (y1 - y0) / 2, r1 = (v) => Math.round(v * 10) / 10;
  let p;
  if (kind === "line") p = [x0, y0, x1, y1];
  else if (kind === "rect") p = [x0, y0, x1, y0, x1, y1, x0, y1, x0, y0];
  else if (kind === "tri") p = [cx, y0, x1, y1, x0, y1, cx, y0];
  else if (kind === "diamond") p = [cx, y0, x1, cy, cx, y1, x0, cy, cx, y0];
  else if (kind === "star") { p = []; for (let i = 0; i <= 10; i += 1) { const a = -Math.PI / 2 + (i * Math.PI) / 5, k = i % 2 ? 0.42 : 1; p.push(cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k); } }
  else if (kind === "heart") { p = []; for (let i = 0; i <= 40; i += 1) { const a = (i * Math.PI * 2) / 40, hx = 16 * Math.sin(a) ** 3, hy = 13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a); p.push(cx + (hx / 16) * rx, cy - ((hy + 2.5) / 14.5) * ry); } }
  else { p = []; for (let i = 0; i <= 48; i += 1) { const a = (i * Math.PI * 2) / 48; p.push(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry); } } // oval
  return p.map(r1);
}
/** Is the point inside the outline these points make (the two ends are joined)? */
export function inside(p, x, y) {
  let hit = false;
  for (let i = 0, j = p.length - 2; i < p.length; j = i, i += 2) { const xi = p[i], yi = p[i + 1], xj = p[j], yj = p[j + 1]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit; }
  return hit;
}
/** How much room an outline encloses (so a tap is not mistaken for filling a nearly straight scribble). */
export function areaOf(p) { let a = 0; for (let i = 0, j = p.length - 2; i < p.length; j = i, i += 2) a += (p[j] + p[i]) * (p[j + 1] - p[i + 1]); return Math.abs(a / 2); }
/** The top-most stroke whose outline the point is inside (its place in the list), or -1. Stickers, erasing and thin scribbles are passed over. */
export function fillTarget(strokes, x, y) {
  for (let i = strokes.length - 1; i >= 0; i -= 1) { const s = strokes[i]; if (!s.e && !s.ch && !s.fig && s.p.length >= 6 && areaOf(s.p) > 250 && inside(s.p, x, y)) return i; }
  return -1;
}

/**
 * Which stickers and drawn people an eraser stroke removes whole: those whose middle the eraser (points `pts`, `width`
 * wide) passes over. Returns their places in the list, lowest first. Rubbing only an edge leaves the sticker alone.
 */
export function stickersUnder(strokes, pts, width) {
  const out = [];
  strokes.forEach((s, i) => {
    if (!s.ch && !s.fig) return;
    const reach = s.w * 0.3 + width / 2;
    const [cx, cy] = s.p;
    if (pts.length === 2 && Math.hypot(pts[0] - cx, pts[1] - cy) <= reach) { out.push(i); return; }
    for (let k = 2; k < pts.length; k += 2) { // how near each stretch of the stroke comes (a fast swipe has few points)
      const ax = pts[k - 2], ay = pts[k - 1], bx = pts[k], by = pts[k + 1], len = (bx - ax) ** 2 + (by - ay) ** 2, u = len ? Math.max(0, Math.min(1, ((cx - ax) * (bx - ax) + (cy - ay) * (by - ay)) / len)) : 0;
      if (Math.hypot(ax + u * (bx - ax) - cx, ay + u * (by - ay) - cy) <= reach) { out.push(i); return; }
    }
  });
  return out;
}

/** Drop points that are closer than `gap` to the one before (keeps saved drawings small). */
export function thin(points, gap = 3) {
  const out = [points[0], points[1]];
  for (let i = 2; i < points.length; i += 2) { const dx = points[i] - out[out.length - 2], dy = points[i + 1] - out[out.length - 1]; if (dx * dx + dy * dy >= gap * gap || i === points.length - 2) out.push(points[i], points[i + 1]); }
  return out.map((v) => Math.round(v * 10) / 10);
}
export function pathLength(p) { let d = 0; for (let i = 2; i < p.length; i += 2) d += Math.hypot(p[i] - p[i - 2], p[i + 1] - p[i - 1]); return d; }
/** The point a distance d along a path, and which way it is heading there. */
export function pointAt(p, d) {
  let left = Math.max(0, d);
  for (let i = 2; i < p.length; i += 2) {
    const dx = p[i] - p[i - 2], dy = p[i + 1] - p[i - 1], seg = Math.hypot(dx, dy);
    if (left <= seg && seg > 0) return { x: p[i - 2] + (dx * left) / seg, y: p[i - 1] + (dy * left) / seg, dx, dy };
    left -= seg;
  }
  const n = p.length;
  return { x: p[n - 2], y: p[n - 1], dx: n >= 4 ? p[n - 2] - p[n - 4] : 1, dy: n >= 4 ? p[n - 1] - p[n - 3] : 0 };
}
/** A path whose end is near its start goes round and round; any other path goes there and back. */
export const isLoop = (p) => p.length >= 8 && Math.hypot(p[0] - p[p.length - 2], p[1] - p[p.length - 1]) < 45;

/**
 * Where a thing is at time t (seconds): { x, y, rot, sx, sy, flip }. `i` is its place in the list, used to start each
 * thing at a slightly different moment so they don't all move in step. At t = null it is at rest.
 */
export function pose(thing, t, i = 0) {
  const out = { x: thing.x, y: thing.y, rot: 0, sx: 1, sy: 1, flip: 1 };
  if (t === null) return out;
  const k = thing.speed || 1, u = t * k + i * 0.37;
  let heading = 0;
  if (thing.move === "side") { out.x += Math.sin((u * TAU) / 3) * 110; heading = Math.cos((u * TAU) / 3); }
  else if (thing.move === "updown") out.y += Math.sin((u * TAU) / 3) * 80;
  else if (thing.move === "circle") { out.x += Math.cos((u * TAU) / 4) * 70; out.y += Math.sin((u * TAU) / 4) * 70; heading = -Math.sin((u * TAU) / 4); }
  else if (thing.move === "path" && thing.path && thing.path.length >= 4) {
    const len = pathLength(thing.path), gone = t * k * 140;
    if (len > 0) {
      let d, back = false;
      if (isLoop(thing.path)) d = gone % len; else { const m = gone % (2 * len); back = m > len; d = back ? 2 * len - m : m; }
      const pt = pointAt(thing.path, d);
      out.x = pt.x; out.y = pt.y; heading = back ? -pt.dx : pt.dx;
    }
  }
  if (thing.face && heading < -0.001) out.flip = -1;
  if (thing.act === "bounce") { const b = Math.abs(Math.sin((u * TAU) / 1.6)); out.y -= b * 55; const squash = Math.max(0, 0.18 - b) * 0.9; out.sy = 1 - squash; out.sx = 1 + squash; }
  else if (thing.act === "spin") out.rot = (u * TAU) / 3;
  else if (thing.act === "wiggle") out.rot = Math.sin((u * TAU) / 0.9) * 0.24;
  else if (thing.act === "pulse") out.sx = out.sy = 1 + Math.sin((u * TAU) / 1.5) * 0.18;
  return out;
}

// ---------- ready-made examples, built from the same kind of strokes a finger makes ----------
const dot = (x, y, w, c) => ({ c, w, p: [x, y] });
const line = (c, w, ...p) => ({ c, w, p });
function ring(cx, cy, rx, ry, c, w, from = 0, to = TAU) { const p = []; for (let i = 0; i <= 28; i += 1) { const a = from + ((to - from) * i) / 28; p.push(Math.round(cx + Math.cos(a) * rx), Math.round(cy + Math.sin(a) * ry)); } return { c, w, p }; }
export function exampleScene() {
  const sun = [dot(0, 0, 80, "#f5d90a"), ...Array.from({ length: 8 }, (_, i) => { const a = (i * TAU) / 8; return line("#f5a623", 8, Math.round(Math.cos(a) * 54), Math.round(Math.sin(a) * 54), Math.round(Math.cos(a) * 78), Math.round(Math.sin(a) * 78)); })];
  const cloud = [dot(-40, 8, 56, "#ffffff"), dot(0, -10, 72, "#ffffff"), dot(42, 8, 56, "#ffffff"), line("#ffffff", 44, -40, 18, 42, 18)];
  const ball = [dot(0, 0, 64, "#e5484d"), ring(0, 0, 14, 30, "#ffffff", 5, -1.2, 1.2), dot(-12, -12, 10, "#ffffff")];
  const bird = [line("#1f2430", 7, -34, -8, -18, -22, 0, 0), line("#1f2430", 7, 0, 0, 18, -22, 34, -8), dot(0, 4, 14, "#1f2430"), line("#f5a623", 6, 6, 5, 16, 7)];
  const flower = [line("#2fb36d", 8, 0, 20, 0, 80), ...[0, 1, 2, 3, 4].map((i) => dot(Math.round(Math.cos((i * TAU) / 5) * 20), Math.round(Math.sin((i * TAU) / 5) * 20), 26, "#ec6aa0")), dot(0, 0, 20, "#f5d90a")];
  const mk = (s, x, y, more) => ({ move: "stay", act: "none", speed: 1, face: true, path: null, s, x, y, ...more });
  return { bg: "sky", things: [
    mk(sun, 690, 100, { act: "spin", speed: 0.5 }),
    mk(cloud, 220, 110, { move: "side", speed: 0.5, face: false }),
    mk(flower, 130, 470, { act: "wiggle", speed: 0.5 }),
    mk(ball, 470, 470, { act: "bounce" }),
    mk(bird, 120, 250, { move: "path", act: "wiggle", path: [120, 250, 200, 200, 300, 230, 400, 290, 500, 250, 600, 190, 700, 240] }),
  ] };
}
export function exampleFlip() {
  // a ball dropping, squashing on the ground and bouncing back up
  const ys = [120, 190, 300, 420, 462, 420, 300, 190], frames = ys.map((y, i) => {
    const squash = i === 4;
    return [line("#8b5a2b", 8, 60, 500, 740, 500), squash ? line("#e5484d", 46, 370, 474, 430, 474) : dot(400, y, 70, "#e5484d"), dot(squash ? 384 : 386, squash ? 466 : y - 14, 10, "#ffffff")];
  });
  return { frames, fps: 8, onion: true, bg: "paper" };
}
