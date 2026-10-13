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
  for (const d of [...PP.PEOPLE, ...PP.CHARACTERS, ...PP.ANIMALS, ...PP.THINGS]) for (let sk = 0; sk < 6; sk += 1) { try { PP.drawPerson(stub, { fig: d.id, sk, hc: -1 }, 100); } catch (err) { threw = `${d.id}: ${err.message}`; } }
  // and at several moments of an animation, travelling and staying put (their limbs move)
  for (const d of [...PP.PEOPLE, ...PP.CHARACTERS, ...PP.ANIMALS, ...PP.THINGS]) for (const go of [true, false]) for (let k = 0; k < 8; k += 1) { try { PP.drawPerson(stub, { fig: d.id, sk: 2, hc: -1 }, 100, { t: k * 0.13, go }); } catch (err) { threw = `${d.id} (moving): ${err.message}`; } }
  check(!threw, `people: every figure can be drawn in every skin tone (${threw})`);
}
{ // the eraser takes away a sticker it passes over the middle of, and leaves one it only brushes
  const three = [{ ch: "🐶", w: 100, p: [100, 100] }, { c: "#000", w: 8, p: [0, 0, 50, 50] }, { fig: "wave1", sk: 1, hc: -1, w: 200, p: [400, 300] }, { ch: "🚗", w: 100, p: [700, 100] }];
  check(E.stickersUnder(three, [100, 100], 18).join() === "0", "a tap on a sticker removes it");
  check(E.stickersUnder(three, [380, 290, 420, 310], 30).join() === "2", "rubbing across a person removes that person");
  check(E.stickersUnder(three, [0, 300, 800, 300], 18).join() === "2", "a fast swipe with only two points still removes what it crosses");
  check(E.stickersUnder(three, [0, 500, 800, 500], 18).join() === "", "a swipe that crosses nothing removes nothing");
  check(E.stickersUnder(three, [100, 160], 18).join() === "", "brushing a sticker's edge leaves it");
  check(E.stickersUnder(three, [100, 100, 400, 300, 700, 100], 18).join() === "0,2,3", "one stroke can remove several");
}
{ // moving and resizing
  const sq = [{ c: "#000", w: 10, k: 1, p: E.shapePoints("rect", 100, 100, 200, 200) }, { ch: "🐶", w: 80, p: [400, 300] }];
  const twice = E.scaled(sq, 2, 100, 100), b2 = E.bbox([twice[0]]);
  check(Math.abs(b2.w - (200 + 20)) < 0.5 && twice[0].w === 20 && twice[0].p[0] === 100 && twice[0].p[1] === 100, "doubling a shape about its corner doubles its size and its line, and keeps that corner still");
  check(twice[1].w === 160 && twice[1].p[0] === 700 && twice[1].p[1] === 500, "a sticker grows and moves away from the fixed corner");
  check(E.scaled(sq, 0.001)[1].w === 14 && E.scaled(sq, 0.001)[0].w === 1, "nothing shrinks to nothing");
  const back = E.scaled(E.scaled(sq, 1.2, 150, 150), 1 / 1.2, 150, 150); check(Math.abs(back[0].p[0] - 100) < 0.2 && Math.abs(back[0].w - 10) < 0.2, "bigger then smaller comes back to the same size");
  check(E.itemAt(sq, 150, 150) === 0 && E.itemAt(sq, 400, 300) === 1 && E.itemAt(sq, 700, 550) === -1, "tapping picks the thing under the finger");
  check(E.itemAt([...sq, { c: "#000", w: 40, e: 1, p: [400, 300] }], 400, 300) === 1, "erasing is never picked up");
}
{ // turning
  const sq = [{ c: "#000", w: 10, k: 1, p: [100, 0, 200, 0] }, { ch: "🐶", w: 80, p: [100, 0] }, { ch: "🚗", w: 80, m: 1, p: [100, 0] }];
  const q = E.turned(sq, Math.PI / 2); // a quarter turn clockwise about (0, 0): right becomes down
  check(Math.abs(q[0].p[0]) < 0.2 && Math.abs(q[0].p[1] - 100) < 0.2 && Math.abs(q[0].p[3] - 200) < 0.2, "a quarter turn sends a point on the right to straight below");
  check(Math.abs(q[1].r - Math.PI / 2) < 0.01 && Math.abs(q[2].r + Math.PI / 2) < 0.01, "a sticker turns with it (a mirrored one the matching way)");
  const round = E.turned(E.turned(E.turned(E.turned(sq, Math.PI / 2, 50, 50), Math.PI / 2, 50, 50), Math.PI / 2, 50, 50), Math.PI / 2, 50, 50);
  check(Math.abs(round[0].p[0] - 100) < 0.5 && Math.abs(round[0].p[1]) < 0.5, "four quarter turns come back to the start");
  check(E.turned(sq, 1)[0].w === 10 && E.turned(sq, 1)[0].r === undefined, "turning leaves a line's thickness alone");
}
check(PP.ANIMALS.length >= 15 && PP.ANIMALS.filter((d) => d.walk).length >= 15 && new Set([...PP.PEOPLE, ...PP.CHARACTERS, ...PP.ANIMALS, ...PP.THINGS].map((d) => d.id)).size === PP.PEOPLE.length + PP.CHARACTERS.length + PP.ANIMALS.length + PP.THINGS.length && PP.ANIMALS.every((d) => d.name && /^#[0-9a-f]{6}$/.test(d.top) && /^#[0-9a-f]{6}$/.test(d.bot)), "animals: different ids from everything else, each with two colours");
check(PP.CHARACTERS.length >= 12 && new Set([...PP.PEOPLE, ...PP.CHARACTERS].map((d) => d.id)).size === PP.PEOPLE.length + PP.CHARACTERS.length && PP.personById("santa").name === "Santa Claus", "characters: different ids from the people, and Santa is among them");
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
{ // joints: a pinned stroke swings about its pin, and the pin goes with the stroke when it is moved, resized or turned
  const arm = { c: "#000", w: 6, p: [100, 100, 100, 160], j: [100, 100], ja: 2 }, leg2 = { ...arm, jn: 1 };
  const a0 = E.jointAngle(arm, 0.1), big = Math.max(...Array.from({ length: 40 }, (_, k) => Math.abs(E.jointAngle(arm, k / 40))));
  check(Math.abs(big - E.JOINTS[2][1]) < 0.02 && Math.abs(E.jointAngle(leg2, 0.1) + a0) < 1e-9 && E.JOINTS.length === 3, "joints: a part swings as far as it is set to, and an opposite one swings the other way");
  const [m] = E.shift([arm], 10, -20), [z] = E.scaled([arm], 2, 0, 0), [t] = E.turned([arm], Math.PI / 2, 100, 160);
  check(m.j[0] === 110 && m.j[1] === 80 && z.j[0] === 200 && z.j[1] === 200 && Math.abs(t.j[0] - 160) < 0.2 && Math.abs(t.j[1] - 160) < 0.2 && !E.shift([{ c: "#000", w: 6, p: [0, 0] }], 1, 1)[0].j, "joints: the pin moves, grows and turns with its stroke");
  const body = { c: "#000", w: 6, p: [100, 40, 100, 100] }, rub = { c: "#000", w: 30, e: 1, p: [100, 130, 101, 130] };
  check(E.strokeNear([body, arm, rub], 103, 140) === 1 && E.strokeNear([body, arm], 100, 60) === 0 && E.strokeNear([body, arm], 300, 300) === -1 && E.jointReach(arm) > 30 && E.jointReach(body) === 0, "joints: a tap finds the nearest line, not the eraser, and a swinging part is given room");
  const limb = { c: "#000", w: 6, p: [160, 130, 130, 115, 101, 99] }, tail = { c: "#000", w: 6, p: [100, 100, 60, 90, 20, 120] };
  const h1 = E.hingeOf([body, limb, tail], 1), h2 = E.hingeOf([body, limb, tail], 2), h3 = E.hingeOf([limb], 0);
  check(h1[0] === 101 && h1[1] === 99 && h2[0] === 100 && h2[1] === 100 && h3[0] === 160 && h3[1] === 130, "joints: the pin lands on the end of the part that touches the body, whichever way the part was drawn");
  { // elbows and knees
    const leg = { c: "#000", w: 6, p: [100, 100, 100, 130, 100, 160], j: [100, 100], jx: [[100, 130, 0]], ja: 2 }, back = { ...leg, p: [100, 160, 100, 130, 100, 100] };
    const hand = { c: "#000", w: 6, p: [98, 165, 104, 168], j: [100, 100], jx: [[100, 130, 0]], ja: 2 }, cuff = { ...hand, p: [96, 110, 104, 110] };
    let most = 0, least = 9, ok = true; const other = { ...leg, jx: [[100, 130, 1]] };
    for (let k = 0; k < 40; k += 1) {
      const b = E.bend(leg, k / 40), r = E.bend(back, k / 40), h = E.bend(hand, k / 40), c = E.bend(cuff, k / 40);
      most = Math.max(most, b.a[0]); least = Math.min(least, b.a[0]); ok = ok && Math.abs(E.bend(other, k / 40).a[0] + b.a[0]) < 1e-9;
      ok = ok && b.p[0] === 100 && b.p[1] === 100 && b.p[2] === 100 && b.p[3] === 130 && Math.abs(Math.hypot(b.p[4] - 100, b.p[5] - 130) - 30) < 1e-6 && Math.abs(b.p[4] - r.p[0]) < 1e-9 && r.p[4] === 100 && r.p[5] === 100 && leg.p[5] === 160;
      ok = ok && Math.abs(Math.hypot(h.p[0] - 100, h.p[1] - 130) - Math.hypot(2, 35)) < 1e-6 && (b.a[0] < 0.02 || h.p[0] !== 98) && c.p[0] === 96 && c.p[1] === 110; // the hand goes round the elbow; the cuff, above it, stays
    }
    check(ok && most > 1 && most < 1.2 && least >= 0 && least < 0.02, "elbows: only what lies beyond the elbow bends, whichever way the line was drawn, and only to one side; a hand goes with the forearm");
    const [m2] = E.shift([leg], 5, 5), [t2] = E.turned([leg], Math.PI, 100, 100), n = E.nearestOn({ p: [0, 0, 100, 0] }, 40, 7);
    check(m2.jx[0][0] === 105 && m2.jx[0][1] === 135 && m2.jx[0][2] === 0 && Math.abs(t2.jx[0][1] - 70) < 0.2 && Math.abs(n.x - 40) < 1e-9 && n.y === 0 && Math.abs(n.d - 7) < 1e-9 && n.i === 0 && E.jointReach(leg) >= E.jointReach({ ...leg, jx: undefined }), "elbows: the elbow moves and turns with its part, and a tap finds the nearest place on a line");
    // several on one part: a tail with three. Each piece keeps its length, the piece before the first does not move, and an outer bend is carried round by an inner one.
    const tail = { c: "#000", w: 6, p: [0, 0, 30, 0, 60, 0, 90, 0, 120, 0], j: [0, 0], jx: [[60, 0, 0], [30, 0, 0], [90, 0, 0]], ja: 1 };
    let fine = true, curled = 0, late = false;
    for (let k = 0; k < 40; k += 1) {
      const b = E.bend(tail, k / 40), q = b.p, len = (i) => Math.hypot(q[i + 2] - q[i], q[i + 3] - q[i + 1]);
      fine = fine && q[0] === 0 && q[1] === 0 && q[2] === 30 && q[3] === 0 && [0, 2, 4, 6].every((i) => Math.abs(len(i) - 30) < 1e-6) && b.a.every((v) => v >= 0) && b.turns.length === 0;
      const tip = Math.atan2(q[9] - q[7], q[8] - q[6]); fine = fine && Math.abs(tip - (b.a[0] + b.a[1] + b.a[2])) < 1e-6; // the last piece has turned by all three together
      curled = Math.max(curled, tip); if (b.a[1] > b.a[2] + 0.05) late = true;
    }
    const one = E.oldJoints([{ p: [0, 0, 9, 9], j: [0, 0], j2: [5, 5], jb: 1 }, { p: [0, 0] }])[0], st = E.bend({ ch: "🐶", w: 40, p: [100, 0], j: [0, 0], jx: [[60, 0, 0], [30, 0, 0]], ja: 1 }, 0.3);
    check(fine && curled > 0.8 && late && one.jx[0][0] === 5 && one.jx[0][2] === 1 && !one.j2 && !one.jb && st.turns.length === 2 && st.turns[0][0] === 30 && st.turns[1][0] === 60, "elbows: a part can have several; they curl one after another, and a drawing saved with the old single elbow still bends");
  }
  { // a ring round part of a single line cuts it there
    const ring = [50, -20, 150, -20, 150, 20, 50, 20], line = [0, 0, 40, 0, 80, 0, 120, 0, 200, 0];
    const c = E.cutByLoop(line, ring), flat = c.pieces.flatMap((q) => q.p);
    const meets = c.pieces.every((q, k) => k === 0 || (q.p[0] === c.pieces[k - 1].p[c.pieces[k - 1].p.length - 2] && q.p[1] === 0));
    check(c.pieces.length === 3 && !c.pieces[0].in && c.pieces[1].in && !c.pieces[2].in && c.cuts.length === 2 && Math.abs(c.cuts[0][0] - 50) < 0.2 && Math.abs(c.cuts[1][0] - 150) < 0.2 && meets && flat[0] === 0 && flat[flat.length - 2] === 200 && c.pieces[1].p.length === 8 && line.length === 10, "ring: a line is cut where it crosses the ring, into pieces that still meet");
    const limb = E.cutByLoop([0, 0, 0, 50, 60, 50, 120, 50, 60, 52, 0, 52, 0, 100], [30, 30, 140, 30, 140, 70, 30, 70]); // out along an arm and back, in one line
    check(E.cutByLoop(line, [-10, -10, 210, -10, 210, 10, -10, 10]).all === true && E.cutByLoop(line, [0, 50, 10, 50, 10, 60]).none === true && limb.pieces.length === 3 && limb.pieces[1].in && limb.cuts.length === 2 && Math.abs(limb.cuts[0][0] - 30) < 0.2 && Math.abs(limb.cuts[1][0] - 30) < 0.2, "ring: an arm drawn out and back comes away in one piece, cut twice at the shoulder");
  }
  const th = E.makeThing([body, arm]);
  check(th.s[1].j && Math.abs(th.s[1].j[0] - th.s[1].p[0]) < 0.01 && Math.abs(th.s[1].j[1] - th.s[1].p[1]) < 0.01, "joints: the pin stays on its part when the drawing becomes a thing");
}
{ // separate objects in one drawing
  const d = { fig: "dragon", w: 120, p: [100, 300] }, r1 = { fig: "run1", w: 150, p: [320, 300] }, hat = { ch: "🎩", w: 40, p: [320, 230] }, r2 = { fig: "run1", w: 150, p: [600, 320] };
  const g = E.clusters([d, r1, hat, r2]);
  const face = [{ c: "#000", w: 6, p: [0, 0, 100, 0, 100, 100, 0, 100, 0, 0] }, { c: "#000", w: 6, p: [30, 30] }, { c: "#000", w: 6, p: [70, 30] }];
  const armA = { c: "#000", w: 6, p: [0, 0, 10, 0], j: [0, 0], jg: 3 }, handA = { c: "#000", w: 6, p: [300, 0, 310, 0], j: [0, 0], jg: 3 };
  check(g.length === 3 && g[0][0] === d && g[1].length === 2 && g[1][0] === r1 && g[1][1] === hat && g[2][0] === r2 && E.clusters(face).length === 1 && E.clusters([armA, handA]).length === 1 && E.clusters([d, r2, { c: "#000", w: 20, e: 1, p: [0, 0, 5, 5] }]).length === 1 && E.clusters([]).length === 0, "objects standing apart are told apart; a hat stays with its wearer, eyes with their face, and a part with its joint");
}
{ // a group that travels together
  const lead = { x: 100, y: 100, move: "path", act: "bounce", speed: 1, face: true, path: [100, 100, 400, 100] }, mate = { x: 160, y: 140, move: "updown", act: "spin", speed: 1, face: true, path: null }, shy = { ...mate, face: false, act: "none" };
  let ok = true, went = 0, flipped = false, turned = false;
  for (let k = 1; k < 80; k += 1) {
    const t = k / 10, L = E.pose({ ...lead, act: "none" }, t, 0), m = E.poseTogether(mate, lead, t, 1, 0), q = E.poseTogether(shy, lead, t, 2, 0);
    ok = ok && Math.abs(m.x - L.x - 60) < 1e-6 && Math.abs(m.y - L.y - 40) < 1e-6 && m.flip === L.flip && q.flip === 1 && q.rot === 0; // beside the leader all the way, not bouncing with it, and not going up and down by itself
    went = Math.max(went, Math.abs(L.x - 100)); if (m.flip === -1) flipped = true; if (m.rot !== 0) turned = true;
  }
  const rest = E.poseTogether(mate, lead, null, 1, 0);
  check(ok && went > 200 && flipped && turned && rest.x === 160 && rest.y === 140, "a group travelling together keeps its shape behind its leader, each member still doing its own thing");
}
{ // in-between pages
  const A = [{ fig: "run1", sk: 2, w: 100, p: [100, 300] }, { c: "#000", w: 6, p: [0, 0, 10, 10] }, { ch: "🐶", w: 60, p: [50, 50], r: 3 }, { c: "#f00", w: 6, p: [5, 5, 6, 6] }, { ch: "🌳", w: 80, p: [700, 100] }];
  const B = [{ fig: "run1", sk: 2, w: 200, p: [400, 300] }, { c: "#000", w: 6, p: [30, 0, 40, 10] }, { ch: "🐶", w: 60, p: [50, 50], r: -3 }, { c: "#f00", w: 6, p: [5, 5, 6, 6, 7, 7] }];
  const m = E.between(A, B, 1 / 3), keep = JSON.stringify(A);
  check(m.length === 5 && m[0].p[0] === 200 && m[0].p[1] === 300 && Math.abs(m[0].w - 133.3) < 0.01 && m[0].fig === "run1" && m[1].p[0] === 10 && m[1].p[2] === 20 && Math.abs(m[2].r - 3.095) < 0.002 && m[3].p.length === 4 && m[3].p[0] === 5 && m[4].p[0] === 700 && JSON.stringify(A) === keep && m[0] !== A[0], "in between: things glide part of the way to where they are on the next page, turning the short way round; a line that was redrawn stays put");
  check(E.tweenMoves(A, B) === 3 && E.tweenMoves(A, A) === 0 && E.tweenMoves(A, []) === 0 && E.between(A, B, 0)[0].p[0] === 100 && E.between(A, B, 1)[0].p[0] === 400, "in between: the game can tell when nothing moves from one page to the next");
}
{ // text on the page
  const t = { tx: "Hello\nworld", f: "round", c: "#000", w: 40, p: [200, 100], tw: 120 }, b = E.bbox([t]), [big] = E.scaled([t], 2), [tr] = E.turned([t], 0.5, 200, 100);
  check(b.w === 120 && b.h === 96 && b.cx === 200 && big.w === 80 && big.tw === 240 && Math.abs(tr.r - 0.5) < 1e-9 && E.itemAt([t], 250, 130) === 0 && E.itemAt([t], 300, 100) === -1 && E.stickersUnder([t], [205, 102], 20).length === 1 && E.fillTarget([t], 200, 100) === -1 && E.textBox({ tx: "abc", w: 10 })[0] > 10, "text: words have a box that fits them, grow and turn like stickers, and the eraser takes them away whole");
  const moved = E.between([t], [{ ...t, p: [400, 100] }], 0.5)[0];
  check(moved.p[0] === 300 && moved.tx === t.tx && E.tweenMoves([t], [{ ...t, tx: "Bye" }]) === 0 && E.clusters([t, { ...t, p: [600, 400] }]).length === 2, "text: words glide between flipbook pages, and different words are not mistaken for the same ones");
}
check(PP.THINGS.length >= 70 && PP.THINGS.every((d) => typeof d.draw === "function" && d.name && /^#[0-9a-f]{6}$/.test(d.top) && /^#[0-9a-f]{6}$/.test(d.bot) && ["go", "nature", "build", "food", "home", "thing"].includes(d.set)), `drawn things: ${PP.THINGS.length}, each with a drawing and two colours`);
{ // the two files split off game.js stand on their own: every background paints, and every kind of stroke draws, still and moving
  const here = path.dirname(fileURLToPath(import.meta.url)), load = (f) => import(pathToFileURL(path.resolve(here, "../public/games/draw-animate", f)).href);
  const BG = await load("backgrounds.js"), R = await load("render.js");
  const stub = new Proxy({}, { get: (t, k) => (k in t ? t[k] : () => stub), set: (t, k, v) => { t[k] = v; return true; } });
  let threw = "";
  for (const [id] of BG.BGS) { try { BG.drawBg(stub, id); } catch (err) { threw = `background ${id}: ${err.message}`; } }
  const kinds = [{ c: "#000", w: 6, p: [0, 0, 10, 10, 20, 0] }, { c: "#000", w: 6, p: [5, 5] }, { c: "#000", w: 6, k: 1, ff: "#f00", p: [0, 0, 10, 0, 10, 10, 0, 0] }, { c: "#000", w: 20, e: 1, p: [0, 0, 5, 5] }, { ch: "🐶", w: 60, p: [0, 0], m: 1, r: 0.3 }, { fig: "run1", sk: 2, hc: -1, w: 120, p: [0, 0] }, { fig: "thing-car", w: 120, p: [0, 0] }, { tx: "Hi\nthere", f: "book", c: "#000", w: 40, p: [0, 0], tw: 80 },
    { c: "#000", w: 6, p: [0, 0, 0, 30, 0, 60], j: [0, 0], ja: 1, jx: [[0, 30, 0]] }, { ch: "🐶", w: 60, p: [0, 50], j: [0, 0], ja: 1, jx: [[0, 30, 0]] }];
  for (const s of kinds) for (const live of [null, { t: 0.4, go: true }, { t: 0.9, go: false, still: true }]) { try { R.strokeLive(stub, s, live); } catch (err) { threw = `stroke ${JSON.stringify(s).slice(0, 40)}: ${err.message}`; } }
  check(!threw && BG.BGS.length === 52 && new Set(BG.BGS.map(([id]) => id)).size === 52 && BG.BGS.every(([id]) => typeof id === "string") && [...BG.DARK].every((id) => BG.BGS.some(([b]) => b === id)) && R.FONTS.length === 8 && R.fontOf({ f: "poster", w: 30 }).includes("30px"), `backgrounds and stroke drawing work on their own ${threw}`);
}
{ // every picture is its own object, even standing in front of a much bigger one
  const castle = { fig: "thing-castle", w: 400, p: [400, 300] }, snake = { fig: "snake", w: 80, p: [560, 460] }, bat = { fig: "bat", w: 80, p: [400, 250] }, words = { tx: "Hi", f: "round", c: "#000", w: 40, p: [400, 300], tw: 40 };
  const eye1 = { c: "#000", w: 6, p: [30, 30] }, face = { c: "#000", w: 6, p: [0, 0, 100, 0, 100, 100, 0, 100, 0, 0] }, far = { c: "#000", w: 6, p: [700, 500, 720, 520] };
  const arm = { c: "#000", w: 6, p: [0, 0, 10, 0], j: [0, 0], jg: 2 }, held = { ch: "🎈", w: 40, p: [300, 0], j: [0, 0], jg: 2 };
  const o = E.objects([castle, face, snake, eye1, bat, far, words, arm, held]);
  check(o.length === 7 && o[0][0] === castle && o[0].length === 1 && o[1].length === 2 && o[1][0] === face && o[1][1] === eye1 && o.some((g) => g.length === 2 && g[0] === arm && g[1] === held) && o.filter((g) => g.length === 1).length === 5 && E.objects([castle, snake, { c: "#000", w: 20, e: 1, p: [0, 0, 5, 5] }]).length === 1 && E.objects([face, eye1]).length === 1, "objects: a snake in front of a castle is its own object; a face keeps its eyes; a jointed part keeps what it holds");
}
const ST = await import(pathToFileURL(path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../public/games/draw-animate/stickers.js")).href);
{ // stickers that move by themselves: small, finite movements, and nothing for a still picture
  const all = ST.STICKERS.flatMap((k) => k.list), moving = all.filter((ch) => ST.stickerMoves(ch));
  let bad = "";
  for (const ch of moving) for (const go of [true, false]) for (let k = 0; k < 12; k += 1) { const m = ST.stickerLife(ch, { t: k * 0.11, go }); if (!m || ![m.x, m.y, m.r, m.sx, m.sy].every(Number.isFinite) || Math.abs(m.x) > 0.1 || Math.abs(m.y) > 0.1 || m.sx < 0.8 || m.sx > 1.2 || m.sy < 0.8 || m.sy > 1.2) bad = ch; }
  check(!bad && moving.length >= 120 && ST.stickerLife("🐶", null) === null && ST.stickerLife("🏠", { t: 1, go: true }) === null && !ST.stickerMoves("📚"), `stickers: ${moving.length} of ${all.length} move by themselves, gently; houses and books stay still ${bad}`);
}
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
