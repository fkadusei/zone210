#!/usr/bin/env node
/**
 * Checks the motion maths of Draw & Animate (public/games/draw-animate/engine.js):   node tools/check-draw-animate.mjs
 *  - every move and action gives sensible numbers at all times, and never jumps suddenly from one moment to the next
 *  - a thing following a path stays on the path; an open path goes there and back, a closed one goes round
 *  - turning strokes into a thing re-centres them, and thinning a line keeps its two ends
 *  - the two built-in examples are well formed and fit on the stage
 *  - the flipbook tunes (music.js): every bar has the right number of steps and every note can be read
 */
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
const E = await import(pathToFileURL(path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../public/games/draw-animate/engine.js")).href);
let bad = 0;
const check = (ok, msg) => { if (!ok) { bad += 1; console.log("✗", msg); } };
const open = [100, 300, 200, 250, 320, 330, 460, 280, 600, 320], closed = [300, 200, 420, 200, 480, 300, 420, 400, 300, 400, 240, 300, 302, 204];
check(!E.isLoop(open) && E.isLoop(closed), "open and closed paths are told apart");
check(Math.abs(E.pathLength([0, 0, 3, 4, 3, 10]) - 11) < 1e-9, "path length");
const mid = E.pointAt([0, 0, 10, 0, 10, 10], 15); check(Math.abs(mid.x - 10) < 1e-9 && Math.abs(mid.y - 5) < 1e-9, "point part-way along a path");

for (const [move] of E.MOVES) for (const [act] of E.ACTS) for (const [speed] of E.SPEEDS) for (const p of [open, closed]) {
  const thing = { s: [{ c: "#000", w: 8, p: [-20, -10, 20, 10] }], x: 400, y: 300, move, act, speed, face: true, path: p };
  let last = null, far = 0;
  for (let f = 0; f <= 60 * 40; f += 1) {
    const q = E.pose(thing, f / 60, 2);
    if (![q.x, q.y, q.rot, q.sx, q.sy].every(Number.isFinite) || Math.abs(q.flip) !== 1) { check(false, `${move}/${act}/${speed}: bad numbers at t=${f / 60}`); break; }
    if (last) far = Math.max(far, Math.hypot(q.x - last.x, q.y - last.y));
    last = q;
    if (move === "path") { // on the path: close to one of its segments
      let near = Infinity;
      for (let i = 2; i < p.length; i += 2) { const ax = p[i - 2], ay = p[i - 1], bx = p[i], by = p[i + 1], L = (bx - ax) ** 2 + (by - ay) ** 2, u = Math.max(0, Math.min(1, ((q.x - ax) * (bx - ax) + (q.y - ay) * (by - ay)) / L)); near = Math.min(near, Math.hypot(q.x - (ax + u * (bx - ax)), q.y - (ay + u * (by - ay)))); }
      const lift = act === "bounce" ? 56 : 0.01;
      if (near > lift) { check(false, `${move}/${act}/${speed}: ${near.toFixed(1)} away from its path at t=${f / 60}`); break; }
    }
  }
  // the fastest allowed step in one sixtieth of a second: path speed 140 × 2 plus a bounce, with room to spare; a closed path may hop its small gap
  const hop = move === "path" && p === closed ? 46 : 0;
  check(far <= 14 + hop, `${move}/${act}/${speed}: jumped ${far.toFixed(1)} in one frame`);
}
const rest = E.pose({ x: 5, y: 6, move: "circle", act: "spin", speed: 2 }, null); check(rest.x === 5 && rest.y === 6 && rest.rot === 0, "at rest a thing sits where it was put");

const made = E.makeThing([{ c: "#000", w: 10, p: [100, 100, 200, 180] }]), b = E.bbox(made.s);
check(made.x === 150 && made.y === 140 && Math.abs(b.cx) < 0.01 && Math.abs(b.cy) < 0.01, "a new thing is measured from its middle");
check(E.makeThing([]) === null && E.makeThing([{ c: "#000", w: 10, e: 1, p: [1, 1, 5, 5] }]) === null, "nothing drawn (or only rubbing out) makes no thing");
const back = E.stageStrokes(made)[0].p; check(back.join() === "100,100,200,180", "a thing's strokes go back to where they were drawn");
const t = E.thin([0, 0, 1, 0, 2, 0, 10, 0, 11, 0, 30, 0, 31, 0]); check(t[0] === 0 && t[t.length - 2] === 31 && t.length < 14, "thinning a line keeps both ends and drops crowded points");

// shapes, and telling whether a tap is inside an outline
for (const [kind] of E.SHAPES) {
  const pts = E.shapePoints(kind, 100, 200, 300, 320);
  check(pts.length >= 4 && pts.length % 2 === 0 && pts.every(Number.isFinite), `${kind}: points are numbers`);
  check(pts.every((v, i) => (i % 2 ? v >= 199.9 && v <= 320.1 : v >= 99.9 && v <= 300.1)), `${kind}: stays inside the box it was dragged in`);
  if (kind !== "line") { check(Math.hypot(pts[0] - pts[pts.length - 2], pts[1] - pts[pts.length - 1]) < 0.2, `${kind}: ends where it starts`); check(E.inside(pts, 200, kind === "tri" ? 290 : 262), `${kind}: its middle is inside`); check(!E.inside(pts, 90, 190) && !E.inside(pts, 310, 330), `${kind}: points outside its box are outside`); check(E.areaOf(pts) > 3000, `${kind}: encloses room`); }
}
check(Math.abs(E.areaOf(E.shapePoints("rect", 0, 0, 10, 20)) - 200) < 1e-6, "area of a rectangle");
const pile = [{ c: "#000", w: 6, p: E.shapePoints("rect", 0, 0, 400, 400), k: 1 }, { c: "#000", w: 6, p: E.shapePoints("oval", 100, 100, 300, 300), k: 1 }, { c: "#000", w: 6, p: [10, 10, 60, 12, 110, 10] }, { ch: "🐶", w: 80, p: [200, 200] }, { c: "#000", w: 30, e: 1, p: E.shapePoints("rect", 150, 150, 250, 250) }];
check(E.fillTarget(pile, 200, 200) === 1 && E.fillTarget(pile, 20, 300) === 0 && E.fillTarget(pile, 500, 500) === -1 && E.fillTarget(pile, 60, 11) === 0, "a tap fills the top-most outline it is inside, and passes over stickers, erasing and thin scribbles");
const stick = E.bbox([{ ch: "🐱", w: 100, p: [300, 300] }]); check(stick && stick.w > 100 && stick.cx === 300, "a sticker has a box around it");

// hand-drawn people: every figure has a pose and colours, there are six skin tones, and a person has a box around it
const PP = await import(pathToFileURL(path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../public/games/draw-animate/people.js")).href);
check(PP.SKINS.length === 6 && PP.HAIRS.length === 6 && PP.PEOPLE.length >= 12 && new Set(PP.PEOPLE.map((d) => d.id)).size === PP.PEOPLE.length, "people: six skin tones, six hair colours, and figures with different ids");
check(PP.PEOPLE.every((d) => d.name && /^#[0-9a-f]{6}$/.test(d.top) && /^#[0-9a-f]{6}$/.test(d.bot) && ["long", "short", "skirt"].includes(d.kind) && d.hc >= 0 && d.hc < 6), "people: every figure has clothes and a hair colour");
{ // drawing each one with a stand-in canvas must not throw (catches a pose that is missing)
  const stub = new Proxy({}, { get: (t, k) => (k in t ? t[k] : () => stub), set: (t, k, v) => { t[k] = v; return true; } });
  let threw = "";
  for (const d of PP.PEOPLE) for (let sk = 0; sk < 6; sk += 1) { try { PP.drawPerson(stub, { fig: d.id, sk, hc: -1 }, 100); } catch (err) { threw = `${d.id}: ${err.message}`; } }
  check(!threw, `people: every figure can be drawn in every skin tone (${threw})`);
}
const who = E.bbox([{ fig: "wave1", sk: 3, hc: -1, w: 200, p: [300, 300] }]); check(who && who.h >= 200 && who.cy === 300, "a drawn person has a box around it");
check(E.fillTarget([{ fig: "wave1", sk: 3, hc: -1, w: 400, p: [300, 300] }], 300, 300) === -1, "the Fill tool passes over a drawn person");

const okStroke = (s) => typeof s.c === "string" && s.w > 0 && s.p.length >= 2 && s.p.length % 2 === 0 && s.p.every(Number.isFinite);
const sc = E.exampleScene();
check(sc.things.length >= 3 && sc.things.every((th) => th.s.every(okStroke) && th.x > 0 && th.x < E.W && th.y > 0 && th.y < E.H && E.MOVES.some((m) => m[0] === th.move) && E.ACTS.some((a) => a[0] === th.act)), "the example scene is well formed");
check(sc.things.some((th) => th.move === "path" && th.path.length >= 4), "the example scene shows a path");
const fl = E.exampleFlip();
check(fl.frames.length >= 6 && fl.frames.every((f) => f.length && f.every(okStroke) && f.every((s) => s.p.every((v, i) => v >= 0 && v <= (i % 2 ? E.H : E.W)))), "the example flipbook is well formed and fits the page");

// the flipbook's background music: every bar of every track has the right number of steps, and every note can be read
const M = await import(pathToFileURL(path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../public/games/draw-animate/music.js")).href);
check(M.midi("A4") === 69 && M.midi("C4") === 60 && M.midi("Bb3") === 58 && M.midi("F#5") === 78, "note names are read correctly");
for (const tune of M.TUNES) {
  const per = tune.bpb * tune.div; let bars = null;
  tune.tracks.forEach((tr, k) => {
    const r = M.readTrack(tr);
    r.bars.forEach((b, i) => check(b.length === per, `${tune.name}: track ${k + 1} (${tr.inst}) bar ${i + 1} has ${b.length} steps, not ${per}`));
    check(r.steps.every((st) => !st || (st.hits ? /^[kshcw]+$/.test(st.hits) : st.notes.every((n) => Number.isFinite(n) && n >= 24 && n <= 96) && st.len >= 1)), `${tune.name}: track ${k + 1} (${tr.inst}) has a note that cannot be read`);
    if (bars === null) bars = r.bars.length; else check(r.bars.length === bars, `${tune.name}: track ${k + 1} (${tr.inst}) has ${r.bars.length} bars, the first track has ${bars}`);
  });
}
check(new Set(M.TUNES.map((x) => x.id)).size === M.TUNES.length && M.TUNES.length >= 10, "tunes have different ids");
console.log(bad ? `\n${bad} problem(s).` : `Draw & Animate: all motion checks pass, and all ${M.TUNES.length} tunes line up.`);
process.exit(bad ? 1 : 0);
