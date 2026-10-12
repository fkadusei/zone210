// Draw & Animate: the parts with no page code (checked by tools/check-draw-animate.mjs).
// A stroke is { c: colour, w: width, e: 1 if it rubs out, p: [x0, y0, x1, y1, …] }, optionally with:
//   k: 1  its corners stay sharp (lines and shapes; a finger-drawn stroke is smoothed instead)
//   ff    a colour its inside is filled with (the Fill tool)
//   ch    a sticker: one emoji drawn w pixels tall at its single point, m: 1 if it is mirrored to face right
// A "thing" is a little drawing with its own movement: { s: strokes (measured from its middle), x, y (where its middle
// sits), move, act, speed, face, path }.
export const W = 800, H = 600;
export const MOVES = [["stay", "Stay put"], ["side", "Side to side"], ["updown", "Up and down"], ["circle", "Round in a circle"], ["path", "Follow my path"]];
export const ACTS = [["none", "Nothing else"], ["bounce", "Bounce"], ["spin", "Spin"], ["wiggle", "Wiggle"], ["pulse", "Grow and shrink"]];
export const SPEEDS = [[0.5, "Slow"], [1, "Medium"], [2, "Fast"]];

/** The box around some strokes, allowing for how thick the lines are. */
export function bbox(strokes) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const s of strokes) { if (s.e) continue; const h = s.ch ? s.w * 0.62 : s.w / 2; for (let i = 0; i < s.p.length; i += 2) { x0 = Math.min(x0, s.p[i] - h); x1 = Math.max(x1, s.p[i] + h); y0 = Math.min(y0, s.p[i + 1] - h); y1 = Math.max(y1, s.p[i + 1] + h); } }
  return x0 === Infinity ? null : { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
}
export const shift = (strokes, dx, dy) => strokes.map((s) => ({ ...s, p: s.p.map((v, i) => Math.round((v + (i % 2 ? dy : dx)) * 10) / 10) }));
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
  for (let i = strokes.length - 1; i >= 0; i -= 1) { const s = strokes[i]; if (!s.e && !s.ch && s.p.length >= 6 && areaOf(s.p) > 250 && inside(s.p, x, y)) return i; }
  return -1;
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

const TAU = Math.PI * 2;
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
