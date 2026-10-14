// Draw & Animate: hand-drawn animals, in three kinds. Every animal is one unit tall with its middle at the origin.
//  - a "critter": a sitting cartoon animal seen from the front, built from the same body, head and face with
//    different ears, tails and markings;
//  - a "walker": a four-legged animal seen from the side, facing right, whose legs step when it travels;
//  - a few with their own drawing, facing right (fish, duck, turtle, butterfly, bee, bird).
// `a` is the main colour and `b` the second colour: the child can change both (the Colour and Second rows).

import { hop } from "./engine.js";

const DARK = "#1f2937", TAU = Math.PI * 2;
// `live` is null for a still picture. While an animation plays it is { t: seconds, go: is it travelling }, and the
// animal moves its legs, tail or wings to suit.
const beat = (live, rate, off = 0) => (live ? Math.sin(live.t * TAU * rate + off) : 0);
function kit(g) {
  const oval = (c, x, y, rx, ry, turn = 0) => { g.fillStyle = c; g.beginPath(); g.ellipse(x, y, rx, ry, turn, 0, Math.PI * 2); g.fill(); };
  const tri = (c, p, q, r) => { g.fillStyle = c; g.beginPath(); g.moveTo(p[0], p[1]); g.lineTo(q[0], q[1]); g.lineTo(r[0], r[1]); g.closePath(); g.fill(); };
  const line = (c, w, pts) => { g.strokeStyle = c; g.lineWidth = w; g.lineCap = "round"; g.lineJoin = "round"; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i += 1) g.lineTo(pts[i][0], pts[i][1]); g.stroke(); };
  const curve = (c, w, p, q, r) => { g.strokeStyle = c; g.lineWidth = w; g.lineCap = "round"; g.beginPath(); g.moveTo(p[0], p[1]); g.quadraticCurveTo(q[0], q[1], r[0], r[1]); g.stroke(); };
  const edge = (x, y, rx, ry) => { g.strokeStyle = "#b6c2d1"; g.lineWidth = 0.012; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.stroke(); }; // so white fur shows on white paper
  return { oval, tri, line, curve, edge };
}

/** A sitting animal seen from the front. `o` says what kind of ears, tail, nose and markings it has. */
function critter(g, o, a, b, live) {
  const { oval, tri, line, curve, edge } = kit(g), limb = o.limb || a, ear = o.ear || a;
  const wag = beat(live, 2) * 0.2, arms = beat(live, 1.5) * 0.3, hop = live && live.go ? beat(live, 1.5) * 0.02 : 0;
  for (const sx of [-1, 1]) { // ears and anything else behind the head
    if (o.ears === "long") { oval(ear, sx * 0.09, -0.4, 0.05, 0.15, sx * 0.12); oval(b, sx * 0.09, -0.39, 0.024, 0.1, sx * 0.12); }
    if (o.ears === "big") { oval(ear, sx * 0.25, -0.13, 0.14, 0.18); oval(b, sx * 0.26, -0.12, 0.08, 0.12); }
    if (o.ears === "side") { oval(ear, sx * 0.21, -0.15, 0.065, 0.065); oval(b, sx * 0.215, -0.15, 0.035, 0.035); }
    if (o.antlers) { line("#7a5230", 0.022, [[sx * 0.08, -0.31], [sx * 0.15, -0.46]]); line("#7a5230", 0.02, [[sx * 0.12, -0.39], [sx * 0.2, -0.41]]); line("#7a5230", 0.02, [[sx * 0.14, -0.43], [sx * 0.09, -0.48]]); }
    if (o.horns) tri("#fff4c2", [sx * 0.1, -0.31], [sx * 0.17, -0.44], [sx * 0.16, -0.29]);
  }
  g.save(); g.translate(0.15, 0.36); g.rotate(wag); g.translate(-0.15, -0.36); // the tail wags
  if (o.tail === "long") { curve(limb, 0.05, [0.15, 0.36], [0.36, 0.38], [0.34, 0.14]); if (o.tuft) oval(o.tuft, 0.34, 0.12, 0.045, 0.055); }
  if (o.tail === "bushy") { oval(a, 0.27, 0.24, 0.1, 0.17, 0.5); oval(b, 0.33, 0.13, 0.055, 0.07, 0.5); }
  if (o.tail === "puff") oval(b, 0.19, 0.37, 0.065, 0.065);
  if (o.tail === "curly") { g.strokeStyle = a; g.lineWidth = 0.028; g.lineCap = "round"; g.beginPath(); g.arc(0.24, 0.3, 0.04, Math.PI * 0.9, Math.PI * 2.9); g.stroke(); }
  g.restore();
  if (o.mane) { oval(o.mane, 0, -0.14, 0.275, 0.275); if (o.spiky) for (let i = 0; i < 14; i += 1) { const t = Math.PI * (0.9 + (i * 1.2) / 13); tri(o.mane, [Math.cos(t - 0.12) * 0.26, -0.14 + Math.sin(t - 0.12) * 0.26], [Math.cos(t) * 0.36, -0.14 + Math.sin(t) * 0.36], [Math.cos(t + 0.12) * 0.26, -0.14 + Math.sin(t + 0.12) * 0.26]); } }
  oval(o.foot || limb, -0.1, 0.43 - Math.max(0, hop), 0.085, 0.048); oval(o.foot || limb, 0.1, 0.43 - Math.max(0, -hop), 0.085, 0.048);
  oval(a, 0, 0.2, 0.19, 0.23); if (o.edge) edge(0, 0.2, 0.19, 0.23);
  oval(b, 0, 0.25, 0.12, 0.16);
  if (o.spots) [[-0.11, 0.1, 0.05], [0.12, 0.2, 0.045], [-0.08, 0.34, 0.04]].forEach(([x, y, r]) => oval(o.spots, x, y, r, r * 0.8));
  if (o.stripes) [[-0.15, 0.1], [-0.17, 0.22], [0.15, 0.1], [0.17, 0.22]].forEach(([x, y]) => line(o.stripes, 0.022, [[x, y], [x * 0.55, y + 0.02]]));
  oval(limb, -0.185 - Math.max(0, arms) * 0.06, 0.17 - Math.max(0, arms) * 0.05, 0.05, 0.1, 0.35 + Math.max(0, arms) * 1.6); oval(limb, 0.185 + Math.max(0, -arms) * 0.06, 0.17 - Math.max(0, -arms) * 0.05, 0.05, 0.1, -0.35 - Math.max(0, -arms) * 1.6);
  for (const sx of [-1, 1]) {
    if (o.ears === "round") { oval(ear, sx * 0.15, -0.3, 0.075, 0.075); oval(o.ear ? ear : b, sx * 0.15, -0.3, 0.04, 0.04); }
    if (o.ears === "pointy") { tri(ear, [sx * 0.2, -0.2], [sx * 0.17, -0.41], [sx * 0.03, -0.3]); tri(b, [sx * 0.165, -0.24], [sx * 0.155, -0.35], [sx * 0.08, -0.29]); }
    if (o.ears === "tufts") tri(ear, [sx * 0.19, -0.24], [sx * 0.18, -0.4], [sx * 0.07, -0.31]);
  }
  oval(a, 0, -0.14, 0.2, 0.2); if (o.edge) edge(0, -0.14, 0.2, 0.2);
  for (const sx of [-1, 1]) if (o.ears === "floppy") oval(ear, sx * 0.2, -0.13, 0.06, 0.14, sx * 0.15);
  if (o.stripes) { [[-0.06, -0.33], [0, -0.34], [0.06, -0.33]].forEach(([x, y]) => line(o.stripes, 0.02, [[x, y], [x * 0.7, y + 0.07]])); for (const sx of [-1, 1]) line(o.stripes, 0.02, [[sx * 0.19, -0.12], [sx * 0.13, -0.11]]); }
  if (o.patches) for (const sx of [-1, 1]) oval(o.patches, sx * 0.078, -0.175, 0.05, 0.062, sx * 0.3);
  if (o.muzzle !== false) oval(o.face || b, 0, -0.07, o.face ? 0.13 : 0.1, o.face ? 0.1 : 0.075);
  // eyes
  if (o.eyes === "big") for (const sx of [-1, 1]) { oval("#ffffff", sx * 0.085, -0.17, 0.07, 0.07); oval(DARK, sx * 0.085, -0.17, 0.035, 0.035); oval("#ffffff", sx * 0.075, -0.18, 0.012, 0.012); }
  else if (o.eyes === "top") for (const sx of [-1, 1]) { oval(a, sx * 0.1, -0.31, 0.075, 0.075); oval("#ffffff", sx * 0.1, -0.31, 0.052, 0.052); oval(DARK, sx * 0.1, -0.305, 0.026, 0.026); }
  else for (const sx of [-1, 1]) { oval(o.patches ? "#ffffff" : DARK, sx * 0.078, -0.18, 0.023, 0.023); if (o.patches) oval(DARK, sx * 0.078, -0.18, 0.012, 0.012); else oval("#ffffff", sx * 0.071, -0.187, 0.007, 0.007); }
  // nose and mouth
  if (o.nose === "pig") { oval("#f48fb1", 0, -0.085, 0.075, 0.052); oval("#b0556f", -0.028, -0.085, 0.012, 0.018); oval("#b0556f", 0.028, -0.085, 0.012, 0.018); }
  else if (o.nose === "beak") tri("#f59e0b", [-0.045, -0.12], [0.045, -0.12], [0, -0.04]);
  else if (o.nose === "trunk") { curve(a, 0.085, [0, -0.1], [-0.01, 0.08], [0.08, 0.13]); curve("rgba(0,0,0,0.12)", 0.01, [-0.035, -0.02], [0, -0.005], [0.035, -0.02]); curve("rgba(0,0,0,0.12)", 0.01, [-0.035, 0.03], [0, 0.045], [0.04, 0.035]); }
  else if (o.nose === "wide") curve("#14532d", 0.014, [-0.11, -0.09], [0, -0.01], [0.11, -0.09]);
  else { oval(o.nosec || DARK, 0, -0.1, o.nosec ? 0.04 : 0.03, o.nosec ? 0.036 : 0.022); curve(DARK, 0.012, [-0.045, -0.055], [0, -0.01], [0.045, -0.055]); }
  if (o.tongue) oval("#f48fb1", 0, -0.02, 0.025, 0.035);
  if (o.teeth) { g.fillStyle = "#ffffff"; g.fillRect(-0.022, -0.045, 0.02, 0.035); g.fillRect(0.002, -0.045, 0.02, 0.035); }
  if (o.whiskers) for (const sx of [-1, 1]) { line("rgba(0,0,0,0.45)", 0.008, [[sx * 0.09, -0.08], [sx * 0.24, -0.11]]); line("rgba(0,0,0,0.45)", 0.008, [[sx * 0.09, -0.06], [sx * 0.24, -0.04]]); }
  if (o.cheeks) for (const sx of [-1, 1]) oval("rgba(244,114,182,0.45)", sx * 0.13, -0.08, 0.035, 0.025);
}

/** A four-legged animal seen from the side, mid-stride and facing right, so it can walk along a path. `o` gives its
 *  proportions (body, legs, neck, head, snout) and its ears, tail and markings. `b` is used for whichever of the
 *  belly, mane, stripes or spots the animal has. */
function walker(g, o, a, b, live) {
  const { oval, tri, line, curve, edge } = kit(g), G = 0.46;
  const len = o.len ?? 0.24, fat = o.fat ?? 0.13, leg = o.leg ?? 0.2, lw = o.lw ?? 0.05, bx = o.bx ?? -0.06, by = G - leg - fat * 0.7;
  const limb = o.limb === "b" ? b : o.limb || a, foot = o.foot || limb, hair = o.hair || b, hr = o.head ?? 0.09, sl = o.snout ?? 0.08;
  const up = o.up ?? 0.9, nl = o.neck ?? 0.1, nw = o.nw ?? fat * 1.1, nx = bx + len * 0.72, ny = by - fat * 0.15;
  const nod = live && live.go ? beat(live, 2.8) * 0.008 : 0, hx = nx + Math.cos(up) * nl, hy = ny - Math.sin(up) * nl + nod, tx = bx - len * 0.93, ty = by - fat * 0.25, topY = by + fat * 0.3;
  const face = o.face === "b" ? b : o.face || a, headc = o.headc === "b" ? b : a;
  // how it goes: a trot and a gallop step faster and further; a leap stretches the legs out front and back; a flyer tucks them up
  const gait = live && live.gait, quick = gait === "run" ? 1.8 : gait === "jog" ? 1.4 : 1, far2 = gait === "run" ? 1.3 : gait === "jog" ? 1.12 : 1;
  const air = gait === "jump" && live ? hop(live.t) : 0, flying = gait === "fly" && !!live;
  const st0 = o.stride ?? 0.06, walking = !!(live && live.go) && gait !== "jump" && !flying, st = walking ? Math.max(st0 * 1.5, Math.min(0.09, leg * 0.45)) * far2 : st0;
  const ph = walking ? live.t * TAU * 1.4 * quick : 0, sway = beat(live, 0.9 * quick) * 0.22;
  const stand = (x, way, far) => { // one leg, from the body down to the ground; `way` is +1 or -1: which half of the stride it is in
    let sw = st * way * Math.cos(ph), up = walking ? Math.max(0, -way * Math.sin(ph)) * Math.min(0.045, leg * 0.3) * far2 : 0;
    if (air > 0 || flying) { const front = x > bx ? 1 : -1, k = flying ? 1 : air; sw = front * st0 * (flying ? 1.6 : 2.2) * k + (flying ? beat(live, 1.6, way) * 0.012 : 0); up = Math.min(0.06, leg * 0.35) * k; } // legs out in a leap, tucked in flight
    const fy = G - up;
    const leg1 = [[x, topY], [x + sw * 0.35 + up * 0.5, (topY + fy) / 2 - up * 0.3], [x + sw, fy - lw * 0.5]];
    if (o.edge && limb === a) { g.save(); g.beginPath(); g.rect(-1, by + fat * 0.85, 2, 1); g.clip(); line("#b6c2d1", lw + 0.014, leg1); g.restore(); } // white legs need an edge to show on white paper
    line(limb, lw, leg1); if (far) line("rgba(0,0,0,0.22)", lw, leg1);
    oval(foot, x + sw + lw * 0.2, fy - lw * 0.32, lw * 0.72, lw * 0.42); if (far) oval("rgba(0,0,0,0.22)", x + sw + lw * 0.2, fy - lw * 0.32, lw * 0.72, lw * 0.42);
  };
  const hip = bx - len * 0.62, sh = bx + len * 0.62;
  stand(hip + 0.04, 1, true); stand(sh - 0.04, -1, true);
  g.save(); g.translate(tx + 0.04, ty); g.rotate(sway); g.translate(-tx - 0.04, -ty); // the tail swings
  // tail
  if (o.tail === "long") { curve(limb, 0.032, [tx + 0.03, ty], [tx - 0.13, ty - 0.03], [tx - 0.11, ty + 0.15]); if (o.tuft) oval(hair, tx - 0.11, ty + 0.16, 0.035, 0.05); }
  if (o.tail === "up") curve(limb, 0.034, [tx + 0.03, ty], [tx - 0.1, ty - 0.02], [tx - 0.08, ty - 0.2]);
  if (o.tail === "horse") { oval(hair, tx - 0.035, ty + 0.11, 0.045, 0.15, 0.22); }
  if (o.tail === "thin") { curve(limb, 0.02, [tx + 0.03, ty], [tx - 0.06, ty], [tx - 0.05, ty + 0.16]); oval(hair, tx - 0.05, ty + 0.18, 0.022, 0.04); }
  if (o.tail === "bushy") { oval(a, tx - 0.07, ty + 0.0, 0.14, 0.065, 0.35); oval(b, tx - 0.17, ty - 0.035, 0.05, 0.04, 0.35); }
  if (o.tail === "puff") oval(o.puff || b, tx, ty + 0.02, 0.045, 0.045);
  if (o.tail === "short") tri(a, [tx + 0.05, ty - 0.03], [tx + 0.05, ty + 0.05], [tx - 0.06, ty - 0.05]);
  if (o.tail === "curly") { g.strokeStyle = a; g.lineWidth = 0.024; g.lineCap = "round"; g.beginPath(); g.arc(tx - 0.03, ty, 0.035, 0, Math.PI * 1.7); g.stroke(); }
  if (o.tail === "dino") { g.fillStyle = a; g.beginPath(); g.moveTo(bx - len * 0.5, by - fat * 0.85); g.quadraticCurveTo(tx - 0.05, by - fat * 0.5, tx - (o.tlen ?? 0.2), by + fat * 0.75); g.quadraticCurveTo(tx, by + fat * 0.9, bx - len * 0.5, by + fat * 0.85); g.fill(); }
  g.restore();
  // neck, with a mane down the back of it
  if (o.mane === "neck") line(hair, nw * 0.75, [[nx - nw * 0.42, ny - 0.01], [hx - nw * 0.36, hy - 0.03]]);
  if (nl > 0.03) line(a, nw, [[nx, ny], [hx, hy]]);
  if (o.hump === "low") oval(a, bx + len * 0.25, by - fat * 0.55, len * 0.55, fat * 0.6); // a bison's shoulders
  else if (o.hump) oval(a, bx - len * 0.05, by - fat * 0.85, len * 0.4, fat * 0.7);
  // body
  if (o.wool) { [[-0.8, -0.3], [-0.45, -0.75], [0.05, -0.85], [0.5, -0.7], [0.82, -0.25], [-0.85, 0.3], [-0.4, 0.7], [0.1, 0.78], [0.55, 0.65], [0.85, 0.3]].forEach(([u, v]) => { oval(a, bx + u * len, by + v * fat, len * 0.36, fat * 0.5); edge(bx + u * len, by + v * fat, len * 0.36, fat * 0.5); }); oval(a, bx, by, len * 0.95, fat * 0.95); }
  else { oval(a, bx, by, len, fat); if (o.edge) edge(bx, by, len, fat); }
  if (o.belly) { g.save(); g.beginPath(); g.ellipse(bx, by, len, fat, 0, 0, Math.PI * 2); g.clip(); oval(b, bx + len * 0.05, by + fat * 0.85, len * 0.85, fat * 0.5); g.restore(); }
  if (o.stripes || o.spots || o.plates) { g.save(); g.beginPath(); g.ellipse(bx, by, len, fat, 0, 0, Math.PI * 2); g.clip();
    if (o.stripes) for (let i = -3; i <= 3; i += 1) line(b, 0.022, [[bx + i * len * 0.26, by - fat], [bx + i * len * 0.26 - 0.025, by + fat * (i % 2 ? 0.2 : 0.5)]]);
    if (o.spots === "small") [[-0.75, -0.1], [-0.55, 0.35], [-0.5, -0.45], [-0.3, 0.0], [-0.2, 0.5], [-0.1, -0.5], [0.05, 0.1], [0.2, -0.35], [0.3, 0.45], [0.45, -0.05], [0.6, -0.45], [0.7, 0.25], [0.85, -0.1]].forEach(([u, v]) => { g.strokeStyle = b; g.lineWidth = 0.014; g.beginPath(); g.arc(bx + u * len, by + v * fat, 0.016, 0.6, Math.PI * 2.2); g.stroke(); }); // a leopard's rosettes
    else if (o.spots) [[-0.6, -0.2, 0.2], [-0.2, 0.25, 0.24], [0.2, -0.35, 0.22], [0.55, 0.2, 0.2], [-0.1, -0.6, 0.16], [0.75, -0.3, 0.13]].forEach(([u, v, r]) => oval(b, bx + u * len, by + v * fat, r * len, r * len * 0.8, u));
    g.restore(); }
  if (o.udder) oval("#f9a8d4", bx - len * 0.35, by + fat * 0.92, 0.045, 0.035);
  stand(hip, -1, false); stand(sh, 1.1, false);
  if (o.neckSpots) for (let i = 1; i <= 3; i += 1) oval(b, nx + Math.cos(up) * nl * i / 4 + (i % 2 ? 0.012 : -0.012), ny - Math.sin(up) * nl * i / 4, nw * 0.22, nw * 0.2);
  if (o.neckStripes) for (let i = 1; i <= 3; i += 1) { const cx = nx + Math.cos(up) * nl * i / 4.2, cy = ny - Math.sin(up) * nl * i / 4.2; line(b, 0.018, [[cx - nw * 0.36, cy - 0.01], [cx + nw * 0.3, cy + 0.025]]); }
  // head
  const ex = hx - hr * 0.45, ey = hy - hr * 0.75;
  if (o.mane === "lion") oval(hair, hx - hr * 0.25, hy + hr * 0.1, hr * 1.55, hr * 1.6);
  if (o.ears === "big") { oval(a, hx - hr * 0.75, hy + hr * 0.05, hr * 0.95, hr * 1.25); oval(b, hx - hr * 0.78, hy + hr * 0.08, hr * 0.68, hr * 0.95); }
  if (o.antlers) { line("#7a5230", 0.02, [[ex + 0.02, ey], [ex - 0.01, ey - 0.16]]); line("#7a5230", 0.018, [[ex, ey - 0.07], [ex + 0.07, ey - 0.12]]); line("#7a5230", 0.018, [[ex - 0.005, ey - 0.12], [ex - 0.07, ey - 0.16]]); line("#7a5230", 0.018, [[ex + 0.07, ey], [ex + 0.1, ey - 0.13]]); }
  if (o.horns === "cow") tri("#fff4c2", [ex + 0.01, ey + 0.02], [ex + 0.06, ey + 0.01], [ex + 0.05, ey - 0.09]);
  if (o.horns === "goat") { curve("#d6c7a1", 0.024, [ex + 0.03, ey + 0.01], [ex + 0.0, ey - 0.1], [ex - 0.09, ey - 0.07]); }
  if (o.horns === "knobs") for (const dx of [0.0, 0.05]) { line("#b45309", 0.016, [[ex + dx + 0.02, ey + 0.01], [ex + dx + 0.015, ey - 0.06]]); oval("#7a4a12", ex + dx + 0.015, ey - 0.065, 0.014, 0.014); }
  if (o.ears === "pointy") { tri(a, [ex - 0.035, ey + 0.035], [ex - 0.005, ey - 0.085], [ex + 0.05, ey + 0.01]); }
  if (o.ears === "long") { oval(a, ex - 0.01, ey - 0.06, 0.03, 0.09, -0.25); oval("rgba(0,0,0,0.15)", ex - 0.008, ey - 0.055, 0.013, 0.06, -0.25); }
  if (o.ears === "round") { oval(o.earc === "b" ? b : o.mane === "lion" ? a : headc, ex, ey + 0.01, hr * 0.38, hr * 0.38); oval("rgba(0,0,0,0.15)", ex, ey + 0.01, hr * 0.2, hr * 0.2); }
  oval(headc, hx, hy, hr * 1.05, hr); if (o.edge) edge(hx, hy, hr * 1.05, hr);
  const sx = hx + hr * 0.65 + sl * 0.45, sy = hy + hr * 0.28, tipx = sx + sl * 0.82;
  if (o.nose === "trunk") { curve(a, hr * 0.62, [hx + hr * 0.7, hy + hr * 0.1], [hx + hr * 1.9, hy + hr * 0.4], [hx + hr * 1.35, G - 0.15]); curve(a, hr * 0.5, [hx + hr * 1.35, G - 0.15], [hx + hr * 1.3, G - 0.07], [hx + hr * 1.8, G - 0.08]); tri("#fffbeb", [hx + hr * 0.5, hy + hr * 0.6], [hx + hr * 0.85, hy + hr * 0.55], [hx + hr * 1.25, hy + hr * 1.3]); }
  else if (sl > 0) { oval(face, sx, sy, sl, hr * (o.jaw ?? 0.62), 0.12); if (o.edge) { g.save(); g.beginPath(); g.rect(hx + hr * 0.75, hy - hr, 1, 1); g.clip(); edge(sx, sy, sl, hr * (o.jaw ?? 0.62)); g.restore(); } }
  if (o.nose === "pig") { oval("#f48fb1", tipx - 0.012, sy, 0.022, hr * 0.5); oval("#b0556f", tipx - 0.008, sy - 0.012, 0.007, 0.009); }
  else if (o.nose === "horn") { tri(b, [tipx - 0.075, sy - hr * 0.45], [tipx - 0.005, sy - hr * 0.4], [tipx - 0.015, sy - hr * 1.5]); oval("rgba(0,0,0,0.35)", tipx - 0.012, sy + 0.0, 0.009, 0.009); }
  else if (o.nose === "nostril") oval("rgba(0,0,0,0.35)", tipx - 0.02, sy - hr * 0.2, 0.01, 0.012);
  else if (o.nose !== "trunk") oval(o.nosec || DARK, tipx - 0.012, sy - hr * 0.18, 0.02, 0.017);
  if (o.teeth) for (let i = 0; i < 5; i += 1) tri("#ffffff", [sx - sl * 0.7 + i * sl * 0.33, sy + hr * 0.25], [sx - sl * 0.7 + i * sl * 0.33 + sl * 0.17, sy + hr * 0.25], [sx - sl * 0.7 + i * sl * 0.33 + sl * 0.085, sy + hr * 0.62]);
  else if (o.nose !== "trunk") curve("rgba(0,0,0,0.5)", 0.01, [sx + sl * 0.1, sy + hr * 0.33], [sx + sl * 0.5, sy + hr * 0.4], [tipx - 0.02, sy + hr * 0.22]);
  if (o.horn) { tri("#fbbf24", [hx - hr * 0.05, hy - hr * 0.85], [hx + hr * 0.4, hy - hr * 0.8], [hx + hr * 0.75, hy - hr * 2.5]); }
  if (o.ears === "floppy") oval(o.earc || hair, hx - hr * 0.5, hy + hr * 0.25, hr * 0.42, hr * 0.85, 0.25);
  if (o.ears === "side") { oval(headc, ex - 0.03, ey + 0.045, 0.055, 0.028, 0.5); }
  if (o.forelock) oval(hair, hx - hr * 0.1, hy - hr * 0.85, hr * 0.55, hr * 0.3, 0.3);
  if (o.beard) tri("#f8fafc", [sx - sl * 0.4, sy + hr * 0.4], [sx + sl * 0.2, sy + hr * 0.45], [sx - sl * 0.2, sy + hr * 1.3]);
  if (o.woolTop) { oval(a, hx - hr * 0.2, hy - hr * 0.8, hr * 0.7, hr * 0.45); edge(hx - hr * 0.2, hy - hr * 0.8, hr * 0.7, hr * 0.45); }
  const eyeX = hx + hr * (o.eyeX ?? 0.3), eyeY = hy - hr * 0.25;
  if (o.headStripes) { line(b, 0.016, [[hx - hr * 0.2, hy - hr * 0.95], [hx - hr * 0.1, hy - hr * 0.45]]); line(b, 0.016, [[hx - hr * 0.75, hy - hr * 0.5], [hx - hr * 0.4, hy - hr * 0.25]]); line(b, 0.016, [[hx - hr * 0.8, hy + hr * 0.2], [hx - hr * 0.4, hy + hr * 0.25]]); }
  if (o.eyePatch) oval(o.eyePatch === true ? b : o.eyePatch, eyeX, eyeY + 0.005, 0.036, 0.042, 0.4);
  oval(o.eyePatch ? "#ffffff" : o.eye || DARK, eyeX, eyeY, 0.02, 0.02); if (o.eyePatch) oval(DARK, eyeX, eyeY, 0.011, 0.011); oval("#ffffff", eyeX - 0.006, eyeY - 0.007, 0.007, 0.007);
  if (o.whiskers) { line("rgba(0,0,0,0.45)", 0.007, [[sx + sl * 0.2, sy], [sx + sl * 0.2 + 0.1, sy - 0.03]]); line("rgba(0,0,0,0.45)", 0.007, [[sx + sl * 0.2, sy + 0.015], [sx + sl * 0.2 + 0.1, sy + 0.03]]); }
}

const OWN = {
  fish(g, a, b, live) {
    const { oval, tri, curve } = kit(g);
    g.save(); g.translate(-0.2, 0); g.scale(1 - Math.abs(beat(live, 2)) * 0.45, 1); tri(b, [0, 0.0], [-0.24, -0.2], [-0.24, 0.2]); g.restore(); // the tail flicks tri(b, [-0.02, -0.2], [0.14, -0.2], [-0.1, -0.36]); tri(b, [-0.02, 0.2], [0.1, 0.2], [-0.08, 0.32]);
    oval(a, 0.04, 0, 0.3, 0.22);
    for (const x of [-0.12, 0.0, 0.11]) curve("rgba(255,255,255,0.4)", 0.02, [x, -0.14], [x + 0.07, 0], [x, 0.14]);
    oval("#ffffff", 0.2, -0.06, 0.055, 0.055); oval(DARK, 0.21, -0.06, 0.028, 0.028); curve(DARK, 0.012, [0.27, 0.06], [0.3, 0.08], [0.33, 0.05]);
    oval("rgba(255,255,255,0.7)", 0.42, -0.2, 0.025, 0.025); oval("rgba(255,255,255,0.7)", 0.46, -0.3, 0.035, 0.035);
  },
  duck(g, a, b, live) {
    const { oval, tri, curve } = kit(g), k = beat(live, 1.6);
    tri(a, [-0.3, 0.1], [-0.44, -0.02], [-0.2, 0.0]);
    oval(a, -0.05, 0.14, 0.27, 0.19); oval("#f59e0b", -0.02 + k * 0.05, 0.4 - Math.max(0, k) * 0.02, 0.08, 0.035); oval("#f59e0b", 0.12 - k * 0.05, 0.4 - Math.max(0, -k) * 0.02, 0.08, 0.035);
    oval(a, -0.05, 0.14, 0.27, 0.19); oval(b, -0.09, 0.15 - Math.abs(k) * 0.03, 0.14, 0.1, -0.2 - Math.abs(k) * 0.35);
    oval(a, 0.16, -0.17, 0.15, 0.15);
    g.fillStyle = "#f59e0b"; g.beginPath(); g.ellipse(0.33, -0.14, 0.09, 0.04, 0.05, 0, Math.PI * 2); g.fill();
    oval(DARK, 0.2, -0.22, 0.022, 0.022); oval("#ffffff", 0.194, -0.227, 0.007, 0.007); curve("rgba(0,0,0,0.25)", 0.01, [0.26, -0.14], [0.33, -0.13], [0.41, -0.14]);
  },
  turtle(g, a, b, live) {
    const { oval, curve } = kit(g), k = beat(live, 0.8);
    oval(a, 0.37, 0.03, 0.12, 0.1); oval(a, -0.2 + k * 0.05, 0.26, 0.07, 0.085, k * 0.4); oval(a, 0.14 - k * 0.05, 0.27, 0.07, 0.085, -k * 0.4); oval(a, -0.36, 0.14, 0.06, 0.03, 0.4);
    g.fillStyle = b; g.beginPath(); g.ellipse(-0.03, 0.1, 0.3, 0.26, 0, Math.PI, 0); g.lineTo(-0.33, 0.1); g.fill();
    g.strokeStyle = "rgba(0,0,0,0.2)"; g.lineWidth = 0.014; g.beginPath(); g.arc(-0.03, 0.1, 0.14, Math.PI, 0); g.moveTo(-0.03, -0.04); g.lineTo(-0.03, -0.16); g.moveTo(-0.14, 0.0); g.lineTo(-0.24, -0.08); g.moveTo(0.08, 0.0); g.lineTo(0.18, -0.08); g.stroke();
    oval(a, -0.03, 0.12, 0.32, 0.045);
    oval(DARK, 0.41, 0.0, 0.02, 0.02); oval("#ffffff", 0.405, -0.006, 0.007, 0.007); curve(DARK, 0.012, [0.38, 0.07], [0.42, 0.09], [0.46, 0.06]);
  },
  butterfly(g, a, b, live) {
    const { oval, line, curve } = kit(g);
    g.save(); g.scale(live ? 0.35 + 0.65 * Math.abs(Math.cos(live.t * TAU * 1.5)) : 1, 1); // the wings open and close
    for (const sx of [-1, 1]) { oval(a, sx * 0.21, -0.12, 0.2, 0.24, sx * 0.35); oval(b, sx * 0.17, 0.2, 0.15, 0.17, sx * -0.3); oval("rgba(255,255,255,0.75)", sx * 0.23, -0.14, 0.07, 0.09, sx * 0.35); oval(a, sx * 0.17, 0.21, 0.055, 0.065); }
    g.restore();
    oval(DARK, 0, 0.03, 0.045, 0.24); oval(DARK, 0, -0.24, 0.055, 0.055);
    curve(DARK, 0.014, [-0.02, -0.28], [-0.1, -0.4], [-0.14, -0.42]); curve(DARK, 0.014, [0.02, -0.28], [0.1, -0.4], [0.14, -0.42]);
    line("#ffffff", 0.012, [[-0.02, -0.25], [-0.02, -0.25]]); line("#ffffff", 0.012, [[0.02, -0.25], [0.02, -0.25]]);
  },
  bee(g, a, b, live) {
    const { oval, line, curve } = kit(g), k = beat(live, 6);
    g.save(); g.translate(0, -0.08); g.scale(1, 1 - Math.abs(k) * 0.5); g.translate(0, 0.08); oval("rgba(190,225,255,0.85)", -0.08, -0.22, 0.13, 0.17, -0.5); oval("rgba(190,225,255,0.85)", 0.08, -0.24, 0.12, 0.16, 0.3); g.restore(); // buzzing wings
    g.fillStyle = b; g.beginPath(); g.moveTo(-0.3, 0.08); g.lineTo(-0.42, 0.05); g.lineTo(-0.3, 0.02); g.fill(); // sting
    oval(a, -0.04, 0.06, 0.28, 0.2);
    g.save(); g.beginPath(); g.ellipse(-0.04, 0.06, 0.28, 0.2, 0, 0, Math.PI * 2); g.clip(); g.fillStyle = b; for (const x of [-0.22, -0.08, 0.06]) g.fillRect(x, -0.2, 0.07, 0.5); g.restore();
    oval(a, 0.24, 0.02, 0.14, 0.14);
    oval(DARK, 0.28, -0.01, 0.024, 0.024); oval("#ffffff", 0.274, -0.017, 0.008, 0.008); curve(DARK, 0.012, [0.25, 0.07], [0.3, 0.1], [0.34, 0.06]);
    curve(DARK, 0.012, [0.22, -0.1], [0.24, -0.22], [0.3, -0.24]); curve(DARK, 0.012, [0.28, -0.1], [0.34, -0.2], [0.4, -0.2]);
    line(DARK, 0.03, [[0.3, -0.24], [0.3, -0.24]]); line(DARK, 0.03, [[0.4, -0.2], [0.4, -0.2]]);
  },
  bird(g, a, b, live) {
    const { oval, tri, line } = kit(g), k = beat(live, 2.5);
    tri(a, [-0.2, 0.06], [-0.45, -0.02], [-0.42, 0.16]);
    line("#f59e0b", 0.02, [[-0.03, 0.24], [-0.03, 0.4], [0.04, 0.4]]); line("#f59e0b", 0.02, [[0.08, 0.24], [0.08, 0.4], [0.15, 0.4]]);
    oval(a, 0, 0.06, 0.26, 0.2); oval(b, 0.04, 0.12, 0.15, 0.11);
    oval(a, -0.08 - Math.max(0, k) * 0.03, 0.04 - Math.max(0, k) * 0.12, 0.15, 0.09, 0.4 + Math.max(0, k) * 0.9); oval("rgba(0,0,0,0.1)", -0.08 - Math.max(0, k) * 0.03, 0.04 - Math.max(0, k) * 0.12, 0.15, 0.09, 0.4 + Math.max(0, k) * 0.9); // the wing flaps
    oval(a, 0.2, -0.16, 0.14, 0.14);
    tri("#f59e0b", [0.32, -0.2], [0.46, -0.15], [0.32, -0.1]);
    oval(DARK, 0.23, -0.2, 0.022, 0.022); oval("#ffffff", 0.224, -0.207, 0.007, 0.007);
  },
  whale(g, a, b, live) {
    const { oval, tri, curve } = kit(g), k = beat(live, 1), up = live ? 0.5 + 0.5 * beat(live, 0.7) : 0.6;
    g.save(); g.translate(-0.3, 0.08); g.rotate(k * 0.25); tri(a, [0, 0], [-0.18, -0.16], [-0.1, 0.0]); tri(a, [0, 0], [-0.18, 0.14], [-0.1, 0.0]); g.restore(); // the tail beats
    oval(a, 0.03, 0.08, 0.36, 0.22);
    g.save(); g.beginPath(); g.ellipse(0.03, 0.08, 0.36, 0.22, 0, 0, TAU); g.clip(); oval(b, 0.1, 0.3, 0.36, 0.16); g.restore();
    oval(a, -0.02, 0.2, 0.09, 0.04, 0.5);
    oval("#ffffff", 0.24, 0.02, 0.03, 0.03); oval(DARK, 0.245, 0.022, 0.017, 0.017); curve(DARK, 0.012, [0.24, 0.13], [0.31, 0.16], [0.37, 0.11]);
    for (const sx of [-1, 1]) curve("#7dd3fc", 0.022, [0.06, -0.14], [0.06 + sx * 0.02, -0.26 - up * 0.08], [0.06 + sx * (0.08 + up * 0.04), -0.24 - up * 0.04]); // its spout
  },
  shark(g, a, b, live) {
    const { oval, tri, line, curve } = kit(g), k = beat(live, 1.6);
    g.save(); g.translate(-0.3, 0.0); g.rotate(k * 0.3); tri(a, [0.02, 0], [-0.16, -0.2], [-0.08, 0]); tri(a, [0.02, 0], [-0.14, 0.14], [-0.08, 0]); g.restore();
    tri(a, [-0.06, -0.1], [0.0, -0.3], [0.1, -0.1]); tri(a, [0.02, 0.08], [-0.04, 0.24], [0.12, 0.1]);
    oval(a, 0.03, 0, 0.37, 0.14);
    g.save(); g.beginPath(); g.ellipse(0.03, 0, 0.37, 0.14, 0, 0, TAU); g.clip(); oval(b, 0.08, 0.14, 0.38, 0.1); g.restore();
    oval(DARK, 0.26, -0.04, 0.018, 0.018); for (const x of [0.1, 0.13, 0.16]) line("rgba(0,0,0,0.3)", 0.01, [[x, -0.04], [x - 0.01, 0.04]]);
    curve(DARK, 0.012, [0.2, 0.07], [0.29, 0.1], [0.37, 0.04]); for (const x of [0.24, 0.28, 0.32]) tri("#ffffff", [x - 0.015, 0.075], [x + 0.015, 0.07], [x, 0.1]);
  },
  dolphin(g, a, b, live) {
    const { oval, tri, curve } = kit(g), k = beat(live, 1.4);
    g.rotate(-0.18 + k * 0.06);
    g.save(); g.translate(-0.3, 0.0); g.rotate(k * 0.35); tri(a, [0.03, 0], [-0.15, -0.13], [-0.07, 0]); tri(a, [0.03, 0], [-0.15, 0.13], [-0.07, 0]); g.restore();
    tri(a, [-0.08, -0.1], [-0.04, -0.27], [0.08, -0.1]); tri(a, [0.04, 0.06], [0.0, 0.2], [0.14, 0.08]);
    oval(a, 0.0, 0, 0.33, 0.13); oval(a, 0.34, 0.03, 0.1, 0.04);
    g.save(); g.beginPath(); g.ellipse(0.0, 0, 0.33, 0.13, 0, 0, TAU); g.clip(); oval(b, 0.06, 0.13, 0.34, 0.09); g.restore();
    oval(DARK, 0.22, -0.03, 0.018, 0.018); oval("#ffffff", 0.215, -0.036, 0.006, 0.006); curve(DARK, 0.01, [0.26, 0.045], [0.34, 0.06], [0.42, 0.04]);
  },
  octopus(g, a, b, live) {
    const { oval, curve } = kit(g);
    for (let i = 0; i < 6; i += 1) { const x = -0.2 + i * 0.08, w = live ? beat(live, 1.1, i * 0.9) * 0.07 : (i % 2 ? 0.05 : -0.05); g.strokeStyle = a; g.lineWidth = 0.065; g.lineCap = "round"; g.beginPath(); g.moveTo(x * 0.7, 0.08); g.bezierCurveTo(x + w, 0.2, x * 1.5 - w, 0.3, x * 1.6 + w, 0.42); g.stroke(); }
    oval(a, 0, -0.12, 0.25, 0.27);
    [[-0.14, -0.3, 0.03], [0.1, -0.33, 0.025], [0.17, -0.2, 0.02], [-0.19, -0.14, 0.02]].forEach(([x, y, r]) => oval(b, x, y, r, r));
    for (const sx of [-1, 1]) { oval("#ffffff", sx * 0.09, -0.1, 0.06, 0.07); oval(DARK, sx * 0.09, -0.09, 0.03, 0.036); oval("#ffffff", sx * 0.08, -0.105, 0.01, 0.01); }
    curve(DARK, 0.014, [-0.05, 0.02], [0, 0.07], [0.05, 0.02]);
  },
  crab(g, a, b, live) {
    const { oval, line } = kit(g), k = beat(live, 2), nip = beat(live, 1.3);
    for (const sx of [-1, 1]) for (let i = 0; i < 3; i += 1) { const lift = (i % 2 ? k : -k) * 0.025 * sx; line(a, 0.03, [[sx * (0.14 + i * 0.05), 0.2], [sx * (0.26 + i * 0.05), 0.24 + lift], [sx * (0.3 + i * 0.05), 0.38 + lift]]); }
    for (const sx of [-1, 1]) { g.save(); g.translate(sx * 0.2, 0.06); g.rotate(sx * nip * 0.2); line(a, 0.045, [[0, 0], [sx * 0.12, -0.14]]); oval(a, sx * 0.16, -0.22, 0.085, 0.07, sx * 0.5); g.fillStyle = "#fffdf6"; g.beginPath(); g.moveTo(sx * 0.16, -0.22); g.lineTo(sx * 0.22, -0.32); g.lineTo(sx * 0.13, -0.3); g.fill(); g.restore(); }
    oval(a, 0, 0.14, 0.25, 0.17); oval(b, 0, 0.2, 0.17, 0.08);
    for (const sx of [-1, 1]) { line(a, 0.022, [[sx * 0.07, 0.0], [sx * 0.08, -0.1]]); oval("#ffffff", sx * 0.08, -0.12, 0.038, 0.038); oval(DARK, sx * 0.085, -0.12, 0.018, 0.018); }
    g.strokeStyle = DARK; g.lineWidth = 0.012; g.beginPath(); g.arc(0, 0.1, 0.06, Math.PI * 0.2, Math.PI * 0.8); g.stroke();
  },
  snail(g, a, b, live) {
    const { oval, line } = kit(g), k = beat(live, 0.8);
    g.strokeStyle = a; g.lineWidth = 0.1; g.lineCap = "round"; g.beginPath(); g.moveTo(-0.34, 0.36); g.lineTo(0.26 + k * 0.02, 0.36); g.quadraticCurveTo(0.36 + k * 0.02, 0.34, 0.34 + k * 0.02, 0.16); g.stroke();
    for (const dx of [-0.03, 0.05]) { line(a, 0.02, [[0.34 + k * 0.02 + dx * 0.4, 0.14], [0.34 + dx + k * 0.04, 0.0]]); oval(DARK, 0.34 + dx + k * 0.04, -0.01, 0.022, 0.022); }
    oval(b, -0.06, 0.1, 0.25, 0.25);
    g.strokeStyle = "rgba(0,0,0,0.25)"; g.lineWidth = 0.022; g.beginPath(); for (let i = 0; i <= 60; i += 1) { const t = (i / 60) * Math.PI * 4.5, r = 0.02 + i * 0.0033; const x = -0.06 + Math.cos(t) * r, y = 0.1 + Math.sin(t) * r; if (i) g.lineTo(x, y); else g.moveTo(x, y); } g.stroke();
    g.strokeStyle = DARK; g.lineWidth = 0.01; g.beginPath(); g.arc(0.36 + k * 0.02, 0.22, 0.03, Math.PI * 0.1, Math.PI * 0.7); g.stroke();
  },
  snake(g, a, b, live) {
    const { oval, line } = kit(g), ph = live ? live.t * TAU * 1.2 : 0, y = (x) => 0.12 + Math.sin(x * 14 - ph) * 0.09 * Math.min(1, (0.36 - x) / 0.2 + 0.25);
    g.strokeStyle = a; g.lineWidth = 0.09; g.lineCap = "round"; g.lineJoin = "round"; g.beginPath(); for (let i = 0; i <= 40; i += 1) { const x = -0.42 + i * 0.017; if (i) g.lineTo(x, y(x)); else g.moveTo(x, y(x)); } g.stroke();
    for (let i = 3; i < 36; i += 5) { const x = -0.42 + i * 0.017; oval(b, x, y(x), 0.022, 0.022); }
    const hx = 0.3, hy = y(0.26); oval(a, hx + 0.04, hy - 0.02, 0.1, 0.075);
    line("#e5484d", 0.012, [[hx + 0.13, hy - 0.01], [hx + 0.19, hy - 0.01], [hx + 0.22, hy - 0.035]]); line("#e5484d", 0.012, [[hx + 0.19, hy - 0.01], [hx + 0.22, hy + 0.015]]);
    oval("#ffffff", hx + 0.06, hy - 0.05, 0.026, 0.026); oval(DARK, hx + 0.066, hy - 0.05, 0.013, 0.013);
  },
  ladybird(g, a, b, live) {
    const { oval, line } = kit(g), k = beat(live, 2.2);
    for (let i = 0; i < 3; i += 1) { const x = -0.14 + i * 0.13, s2 = (i % 2 ? k : -k) * 0.03; line(DARK, 0.022, [[x, 0.2], [x + s2, 0.34]]); }
    oval(DARK, 0.26, 0.1, 0.11, 0.13);
    line(DARK, 0.014, [[0.3, 0.0], [0.36, -0.1 + k * 0.01]]); line(DARK, 0.014, [[0.33, 0.02], [0.42, -0.05 - k * 0.01]]);
    g.fillStyle = a; g.beginPath(); g.ellipse(-0.02, 0.2, 0.3, 0.3, 0, Math.PI, 0); g.fill();
    g.save(); g.beginPath(); g.ellipse(-0.02, 0.2, 0.3, 0.3, 0, Math.PI, 0); g.clip(); [[-0.18, 0.08, 0.05], [-0.02, -0.02, 0.055], [0.14, 0.09, 0.05], [-0.1, 0.17, 0.035], [0.06, 0.16, 0.035]].forEach(([x, y, r]) => oval(b, x, y, r, r)); g.restore();
    oval("#ffffff", 0.3, 0.07, 0.03, 0.03); oval(DARK, 0.305, 0.07, 0.014, 0.014);
  },
  parrot(g, a, b, live) {
    const { oval, tri, line } = kit(g), k = Math.max(0, beat(live, 1.6));
    tri(b, [-0.1, 0.2], [-0.2, 0.46], [-0.04, 0.3]); tri(a, [-0.04, 0.22], [-0.1, 0.46], [0.02, 0.3]);
    line("#6b7280", 0.02, [[0.0, 0.3], [0.0, 0.38], [0.05, 0.38]]); line("#6b7280", 0.02, [[0.08, 0.3], [0.08, 0.38], [0.13, 0.38]]);
    line("#8b5a2b", 0.035, [[-0.3, 0.4], [0.34, 0.4]]);
    oval(a, 0.02, 0.08, 0.17, 0.24, 0.15);
    g.save(); g.translate(-0.06, -0.02); g.rotate(-k * 0.7); oval(b, -0.02, 0.12, 0.085, 0.17, 0.25); oval("#fde047", -0.03, 0.2, 0.05, 0.08, 0.25); g.restore(); // the wing lifts
    oval(a, 0.1, -0.22, 0.13, 0.13);
    g.fillStyle = "#fbbf24"; g.beginPath(); g.moveTo(0.2, -0.27); g.quadraticCurveTo(0.36, -0.26, 0.3, -0.1); g.quadraticCurveTo(0.26, -0.16, 0.19, -0.16); g.fill();
    oval("#ffffff", 0.13, -0.25, 0.045, 0.045); oval(DARK, 0.14, -0.25, 0.02, 0.02);
  },
  bat(g, a, b, live) {
    const { oval, tri } = kit(g), flap = live ? 0.35 + 0.65 * Math.abs(Math.cos(live.t * TAU * 1.6)) : 1;
    for (const sx of [-1, 1]) { g.save(); g.scale(sx, 1); g.translate(0.06, -0.04); g.scale(1, flap); g.fillStyle = b; g.beginPath(); g.moveTo(0, 0); g.lineTo(0.2, -0.2); g.lineTo(0.42, -0.06); g.quadraticCurveTo(0.34, 0.0, 0.33, 0.12); g.quadraticCurveTo(0.24, 0.04, 0.2, 0.16); g.quadraticCurveTo(0.12, 0.06, 0.02, 0.16); g.fill(); g.restore(); }
    for (const sx of [-1, 1]) tri(a, [sx * 0.03, -0.2], [sx * 0.1, -0.36], [sx * 0.13, -0.17]);
    oval(a, 0, 0.06, 0.1, 0.16); oval(a, 0, -0.14, 0.12, 0.11);
    for (const sx of [-1, 1]) { oval("#ffffff", sx * 0.045, -0.15, 0.03, 0.03); oval(DARK, sx * 0.045, -0.15, 0.015, 0.015); tri("#ffffff", [sx * 0.015, -0.09], [sx * 0.04, -0.09], [sx * 0.027, -0.05]); }
  },
  jellyfish(g, a, b, live) {
    const { oval, curve } = kit(g), k = beat(live, 0.9), sq = 1 + k * 0.08;
    for (let i = 0; i < 5; i += 1) { const x = -0.18 + i * 0.09, w = live ? beat(live, 1.1, i * 1.3) * 0.06 : (i % 2 ? 0.04 : -0.04); g.strokeStyle = b; g.lineWidth = 0.035; g.lineCap = "round"; g.beginPath(); g.moveTo(x, -0.02); g.bezierCurveTo(x + w, 0.12, x - w, 0.26, x + w, 0.42); g.stroke(); }
    g.fillStyle = a; g.beginPath(); g.ellipse(0, -0.04, 0.27 * sq, 0.3 / sq, 0, Math.PI, 0); g.quadraticCurveTo(0.2, 0.04, 0.13, -0.02); g.quadraticCurveTo(0.07, 0.04, 0, -0.02); g.quadraticCurveTo(-0.07, 0.04, -0.13, -0.02); g.quadraticCurveTo(-0.2, 0.04, -0.27 * sq, -0.04); g.fill();
    oval("rgba(255,255,255,0.45)", -0.1, -0.22, 0.05, 0.03, -0.5);
    for (const sx of [-1, 1]) oval(DARK, sx * 0.07, -0.14, 0.02, 0.024); curve(DARK, 0.012, [-0.04, -0.08], [0, -0.05], [0.04, -0.08]);
  },
  spider(g, a, b, live) {
    const { oval, line } = kit(g), k = beat(live, 2.4);
    for (const sx of [-1, 1]) for (let i = 0; i < 4; i += 1) { const lift = (i % 2 ? k : -k) * 0.03, ax = sx * 0.1, ay = 0.02 + i * 0.03; line(a, 0.022, [[ax, ay], [sx * (0.26 + i * 0.03), -0.16 + i * 0.1 + lift], [sx * (0.36 + i * 0.02), 0.1 + i * 0.1 + lift]]); }
    oval(a, 0, 0.14, 0.17, 0.2); oval(a, 0, -0.1, 0.12, 0.11); oval(b, 0, 0.14, 0.06, 0.09);
    for (const sx of [-1, 1]) { oval("#ffffff", sx * 0.045, -0.12, 0.034, 0.034); oval(DARK, sx * 0.045, -0.115, 0.016, 0.016); }
    g.strokeStyle = "#ffffff"; g.lineWidth = 0.01; g.beginPath(); g.arc(0, -0.07, 0.035, Math.PI * 0.2, Math.PI * 0.8); g.stroke();
  },
};

export const ANIMALS = [
  { id: "dog", name: "Dog", custom: "animal", top: "#c68642", bot: "#f3e0c2", o: { ears: "floppy", ear: "#8d5524", tail: "long", tongue: true } },
  { id: "cat", name: "Cat", custom: "animal", top: "#f59e0b", bot: "#fff1d6", o: { ears: "pointy", tail: "long", whiskers: true, nosec: "#f48fb1" } },
  { id: "rabbit", name: "Rabbit", custom: "animal", top: "#d9c7b4", bot: "#ffffff", o: { ears: "long", tail: "puff", teeth: true, nosec: "#f48fb1", cheeks: true } },
  { id: "mouse", name: "Mouse", custom: "animal", top: "#9ca3af", bot: "#f9d5dc", o: { ears: "big", tail: "long", whiskers: true, nosec: "#f48fb1" } },
  { id: "bear", name: "Bear", custom: "animal", top: "#8b5a2b", bot: "#e7c9a0", o: { ears: "round" } },
  { id: "panda", name: "Panda", custom: "animal", top: "#f8fafc", bot: "#ffffff", o: { ears: "round", ear: "#1f2937", limb: "#1f2937", patches: "#1f2937", edge: true } },
  { id: "fox", name: "Fox", custom: "animal", top: "#ea580c", bot: "#fff7ed", o: { ears: "pointy", tail: "bushy" } },
  { id: "pig", name: "Pig", custom: "animal", top: "#f7a8c9", bot: "#fbd0e0", o: { ears: "pointy", tail: "curly", nose: "pig", muzzle: false } },
  { id: "cow", name: "Cow", custom: "animal", top: "#f8fafc", bot: "#f9d5dc", o: { ears: "side", ear: "#1f2937", limb: "#d8dee6", foot: "#374151", horns: true, spots: "#1f2937", nose: "pig", face: "#f9d5dc", edge: true } },
  { id: "lion", name: "Lion", custom: "animal", top: "#f2b84b", bot: "#fde9b8", o: { ears: "round", mane: "#b45309", tail: "long", tuft: "#b45309" } },
  { id: "tiger", name: "Tiger", custom: "animal", top: "#f59e0b", bot: "#fffbeb", o: { ears: "round", stripes: "#1f2937", tail: "long", whiskers: true } },
  { id: "elephant", name: "Elephant", custom: "animal", top: "#9aa5b1", bot: "#d1d8e0", o: { ears: "big", nose: "trunk", muzzle: false } },
  { id: "monkey", name: "Monkey", custom: "animal", top: "#8b5a2b", bot: "#f1c9a0", o: { ears: "side", tail: "long", face: "#f1c9a0" } },
  { id: "frog", name: "Frog", custom: "animal", top: "#4ade80", bot: "#d9f99d", o: { eyes: "top", nose: "wide", muzzle: false, cheeks: true } },
  { id: "penguin", name: "Penguin", custom: "animal", top: "#1f2937", bot: "#ffffff", o: { nose: "beak", foot: "#f59e0b", face: "#ffffff" } },
  { id: "owl", name: "Owl", custom: "animal", top: "#8b5a2b", bot: "#f1dcb8", o: { ears: "tufts", eyes: "big", nose: "beak", muzzle: false } },
  { id: "reindeer", name: "Reindeer", custom: "animal", top: "#a16207", bot: "#f1dcb8", o: { ears: "side", antlers: true, nosec: "#e5484d" } },
  { id: "koala", name: "Koala", custom: "animal", top: "#9ca3af", bot: "#e5e7eb", o: { ears: "big", nosec: "#1f2937" } },
  { id: "hamster", name: "Hamster", custom: "animal", top: "#f2b36b", bot: "#fff3e0", o: { ears: "round", tail: "puff", teeth: true, cheeks: true, nosec: "#f48fb1" } },
  { id: "raccoon", name: "Raccoon", custom: "animal", top: "#8b8f98", bot: "#e5e7eb", o: { ears: "pointy", patches: "#1f2937", tail: "bushy" } },
  { id: "squirrel", name: "Squirrel", custom: "animal", top: "#c2622d", bot: "#fde9d0", o: { ears: "tufts", tail: "bushy", teeth: true } },
  { id: "hedgehog", name: "Hedgehog", custom: "animal", top: "#d9b38c", bot: "#f5e6d3", o: { ears: "side", mane: "#7a5230", spiky: true } },
  { id: "wolf", name: "Wolf", custom: "animal", top: "#6b7280", bot: "#e5e7eb", o: { ears: "pointy", tail: "bushy" } },
  { id: "sheep", name: "Sheep", custom: "animal", top: "#f1f5f9", bot: "#ffffff", o: { ears: "side", ear: "#374151", limb: "#374151", face: "#4b5563", mane: "#e2e8f0", edge: true, nosec: "#111827" } },
  { id: "chick", name: "Chick", custom: "animal", top: "#fde047", bot: "#fef08a", o: { nose: "beak", muzzle: false, foot: "#f59e0b", cheeks: true } },
  { id: "polarbear", name: "Polar bear", custom: "animal", top: "#ffffff", bot: "#f1f5f9", o: { ears: "round", ear: "#dbe3ec", limb: "#dbe3ec", edge: true } },
  { id: "leopard", name: "Leopard", custom: "animal", top: "#f2b84b", bot: "#fde9b8", o: { ears: "round", spots: "#7a4a12", tail: "long", whiskers: true } },
  { id: "gorilla", name: "Gorilla", custom: "animal", top: "#374151", bot: "#6b7280", o: { ears: "side", face: "#9ca3af" } },
  { id: "dalmatian", name: "Dalmatian", custom: "animal", top: "#ffffff", bot: "#f8fafc", o: { ears: "floppy", ear: "#1f2937", limb: "#dbe3ec", spots: "#1f2937", tail: "long", tongue: true, edge: true } },
  { id: "fish", name: "Fish", custom: "animal", top: "#f97316", bot: "#fbbf24" },
  { id: "duck", name: "Duck", custom: "animal", top: "#fde047", bot: "#facc15" },
  { id: "bird", name: "Bird", custom: "animal", top: "#3b82f6", bot: "#bfdbfe" },
  { id: "turtle", name: "Turtle", custom: "animal", top: "#65a30d", bot: "#a16207" },
  { id: "butterfly", name: "Butterfly", custom: "animal", top: "#a855f7", bot: "#ec4899" },
  { id: "bee", name: "Bee", custom: "animal", top: "#fde047", bot: "#1f2937" },
  { id: "whale", name: "Whale", custom: "animal", top: "#3b82f6", bot: "#bfdbfe" },
  { id: "shark", name: "Shark", custom: "animal", top: "#6b7280", bot: "#f1f5f9" },
  { id: "dolphin", name: "Dolphin", custom: "animal", top: "#60a5fa", bot: "#e0f2fe" },
  { id: "octopus", name: "Octopus", custom: "animal", top: "#ec4899", bot: "#f9a8d4" },
  { id: "crab", name: "Crab", custom: "animal", top: "#ef4444", bot: "#fecaca" },
  { id: "jellyfish", name: "Jellyfish", custom: "animal", top: "#c084fc", bot: "#f0abfc" },
  { id: "snail", name: "Snail", custom: "animal", top: "#a3e635", bot: "#b45309" },
  { id: "snake", name: "Snake", custom: "animal", top: "#22c55e", bot: "#fde047" },
  { id: "ladybird", name: "Ladybird", custom: "animal", top: "#ef4444", bot: "#1f2937" },
  { id: "spider", name: "Spider", custom: "animal", top: "#1f2937", bot: "#ef4444" },
  { id: "parrot", name: "Parrot", custom: "animal", top: "#ef4444", bot: "#3b82f6" },
  { id: "bat", name: "Bat", custom: "animal", top: "#4b5563", bot: "#9ca3af" },
  // walking animals: seen from the side, facing right
  { id: "walk-horse", name: "Horse", custom: "animal", walk: true, top: "#a0522d", bot: "#3b2314", o: { leg: 0.25, lw: 0.042, neck: 0.2, up: 1.0, nw: 0.11, head: 0.075, snout: 0.1, ears: "pointy", tail: "horse", mane: "neck", forelock: true, foot: "#3b2314", nose: "nostril" } },
  { id: "walk-unicorn", name: "Unicorn", custom: "animal", walk: true, top: "#ffffff", bot: "#f472b6", o: { leg: 0.25, lw: 0.042, neck: 0.2, up: 1.0, nw: 0.11, head: 0.075, snout: 0.1, ears: "pointy", tail: "horse", mane: "neck", forelock: true, foot: "#fbbf24", nose: "nostril", horn: true, edge: true } },
  { id: "walk-zebra", name: "Zebra", custom: "animal", walk: true, top: "#ffffff", bot: "#1f2937", o: { leg: 0.24, lw: 0.042, neck: 0.18, up: 1.0, nw: 0.11, head: 0.075, snout: 0.095, ears: "pointy", tail: "thin", mane: "neck", foot: "#1f2937", face: "#374151", stripes: true, neckStripes: true, headStripes: true, edge: true } },
  { id: "walk-donkey", name: "Donkey", custom: "animal", walk: true, top: "#9ca3af", bot: "#f3f4f6", o: { leg: 0.2, lw: 0.042, neck: 0.15, up: 0.95, nw: 0.11, head: 0.08, snout: 0.1, ears: "long", tail: "thin", hair: "#4b5563", mane: "neck", belly: true, face: "b", foot: "#374151", nose: "nostril" } },
  { id: "walk-cow", name: "Cow", custom: "animal", walk: true, top: "#ffffff", bot: "#1f2937", o: { len: 0.26, fat: 0.15, leg: 0.17, lw: 0.05, neck: 0.08, up: 0.5, nw: 0.14, head: 0.085, snout: 0.085, jaw: 0.72, ears: "side", horns: "cow", tail: "thin", hair: "#1f2937", spots: true, face: "#f9a8d4", foot: "#374151", udder: true, nose: "nostril", edge: true } },
  { id: "walk-sheep", name: "Sheep", custom: "animal", walk: true, top: "#f8fafc", bot: "#374151", o: { len: 0.23, fat: 0.15, leg: 0.15, lw: 0.04, neck: 0.07, up: 0.6, nw: 0.1, head: 0.075, snout: 0.07, ears: "side", wool: true, woolTop: true, limb: "b", headc: "b", face: "b", tail: "puff", puff: "#f8fafc", nosec: "#111827", eye: "#ffffff" } },
  { id: "walk-goat", name: "Goat", custom: "animal", walk: true, top: "#e7e5e4", bot: "#ffffff", o: { len: 0.22, fat: 0.12, leg: 0.18, lw: 0.038, neck: 0.11, up: 1.0, nw: 0.09, head: 0.07, snout: 0.085, ears: "side", horns: "goat", beard: true, tail: "short", belly: true, foot: "#44403c", edge: true } },
  { id: "walk-pig", name: "Pig", custom: "animal", walk: true, top: "#f7a8c9", bot: "#fbd0e0", o: { len: 0.25, fat: 0.16, leg: 0.11, lw: 0.05, neck: 0.03, up: 0.3, head: 0.1, snout: 0.06, bx: -0.08, ears: "pointy", tail: "curly", belly: true, nose: "pig", foot: "#b0556f" } },
  { id: "walk-dog", name: "Dog", custom: "animal", walk: true, top: "#c68642", bot: "#8d5524", o: { len: 0.22, fat: 0.11, leg: 0.17, lw: 0.042, neck: 0.1, up: 0.9, nw: 0.1, head: 0.085, snout: 0.085, ears: "floppy", tail: "up" } },
  { id: "walk-cat", name: "Cat", custom: "animal", walk: true, top: "#f59e0b", bot: "#fff1d6", o: { len: 0.2, fat: 0.095, leg: 0.14, lw: 0.036, neck: 0.07, up: 0.8, nw: 0.09, head: 0.085, snout: 0.035, ears: "pointy", tail: "up", belly: true, whiskers: true, nosec: "#f48fb1", face: "b" } },
  { id: "walk-fox", name: "Fox", custom: "animal", walk: true, top: "#ea580c", bot: "#fff7ed", o: { len: 0.21, fat: 0.095, leg: 0.15, lw: 0.036, neck: 0.08, up: 0.75, nw: 0.09, head: 0.08, snout: 0.09, jaw: 0.5, bx: 0.0, ears: "pointy", tail: "bushy", belly: true, face: "b", foot: "#1f2937" } },
  { id: "walk-wolf", name: "Wolf", custom: "animal", walk: true, top: "#6b7280", bot: "#e5e7eb", o: { len: 0.23, fat: 0.11, leg: 0.19, lw: 0.042, neck: 0.1, up: 0.8, nw: 0.11, head: 0.085, snout: 0.1, jaw: 0.5, bx: 0.0, ears: "pointy", tail: "bushy", belly: true, face: "b" } },
  { id: "walk-lion", name: "Lion", custom: "animal", walk: true, top: "#f2b84b", bot: "#b45309", o: { len: 0.24, fat: 0.12, leg: 0.17, lw: 0.05, neck: 0.09, up: 0.8, nw: 0.12, head: 0.095, snout: 0.06, ears: "round", mane: "lion", tail: "long", tuft: true, face: "#fde9b8" } },
  { id: "walk-tiger", name: "Tiger", custom: "animal", walk: true, top: "#f59e0b", bot: "#1f2937", o: { len: 0.25, fat: 0.12, leg: 0.16, lw: 0.05, neck: 0.08, up: 0.7, nw: 0.12, head: 0.095, snout: 0.06, ears: "round", tail: "long", stripes: true, headStripes: true, face: "#fffbeb", whiskers: true, nosec: "#f48fb1" } },
  { id: "walk-bear", name: "Bear", custom: "animal", walk: true, top: "#8b5a2b", bot: "#e7c9a0", o: { len: 0.25, fat: 0.17, leg: 0.13, lw: 0.07, neck: 0.06, up: 0.35, nw: 0.16, head: 0.105, snout: 0.07, ears: "round", tail: "puff", puff: "#8b5a2b", face: "b" } },
  { id: "walk-elephant", name: "Elephant", custom: "animal", walk: true, top: "#9aa5b1", bot: "#d1d8e0", o: { len: 0.25, fat: 0.19, leg: 0.15, lw: 0.085, neck: 0.07, up: 0.35, nw: 0.2, head: 0.13, snout: 0, bx: -0.12, stride: 0.03, ears: "big", nose: "trunk", tail: "thin", hair: "#6b7280", foot: "#7b8794", eyeX: 0.45 } },
  { id: "walk-giraffe", name: "Giraffe", custom: "animal", walk: true, top: "#fbbf24", bot: "#b45309", o: { len: 0.16, fat: 0.09, leg: 0.27, lw: 0.03, neck: 0.36, up: 1.2, nw: 0.07, head: 0.055, snout: 0.065, stride: 0.035, ears: "side", horns: "knobs", tail: "thin", spots: true, neckSpots: true, foot: "#7a4a12", nose: "nostril" } },
  { id: "walk-camel", name: "Camel", custom: "animal", walk: true, top: "#d4a373", bot: "#a47148", o: { len: 0.22, fat: 0.11, leg: 0.24, lw: 0.036, neck: 0.22, up: 1.05, nw: 0.08, head: 0.065, snout: 0.085, ears: "side", hump: true, tail: "thin", foot: "#a47148", nose: "nostril" } },
  { id: "walk-deer", name: "Deer", custom: "animal", walk: true, top: "#b5651d", bot: "#fff7ed", o: { len: 0.2, fat: 0.1, leg: 0.23, lw: 0.03, neck: 0.15, up: 1.05, nw: 0.075, head: 0.065, snout: 0.075, ears: "side", antlers: true, tail: "puff", belly: true, foot: "#3b2314" } },
  { id: "walk-rhino", name: "Rhino", custom: "animal", walk: true, top: "#9ca3af", bot: "#f3f4f6", o: { len: 0.27, fat: 0.17, leg: 0.12, lw: 0.075, neck: 0.03, up: 0.1, nw: 0.2, head: 0.11, snout: 0.1, jaw: 0.7, bx: -0.1, stride: 0.03, ears: "pointy", nose: "horn", tail: "thin", hair: "#6b7280", foot: "#6b7280" } },
  { id: "walk-hippo", name: "Hippo", custom: "animal", walk: true, top: "#a78bba", bot: "#e9d5ff", o: { len: 0.27, fat: 0.18, leg: 0.09, lw: 0.075, neck: 0.03, up: 0.15, nw: 0.2, head: 0.11, snout: 0.11, jaw: 0.95, bx: -0.1, stride: 0.03, ears: "round", belly: true, tail: "short", nose: "nostril", foot: "#8b6ea3" } },
  { id: "walk-dinosaur", name: "Dinosaur", custom: "animal", walk: true, top: "#4ade80", bot: "#fde047", o: { len: 0.2, fat: 0.13, leg: 0.15, lw: 0.06, neck: 0.33, up: 0.95, nw: 0.075, head: 0.055, snout: 0.055, bx: -0.02, stride: 0.03, tail: "dino", tlen: 0.26, belly: true, spots: false, nose: "nostril", foot: "#16a34a" } },
  { id: "walk-pony", name: "Pony", custom: "animal", walk: true, top: "#e2b653", bot: "#fff4c2", o: { len: 0.22, fat: 0.13, leg: 0.17, lw: 0.045, neck: 0.14, up: 0.95, nw: 0.11, head: 0.08, snout: 0.085, ears: "pointy", tail: "horse", mane: "neck", forelock: true, foot: "#7a5230", nose: "nostril" } },
  { id: "walk-llama", name: "Llama", custom: "animal", walk: true, top: "#f1e3c6", bot: "#fffaf0", o: { len: 0.2, fat: 0.13, leg: 0.21, lw: 0.04, neck: 0.26, up: 1.25, nw: 0.095, head: 0.065, snout: 0.07, ears: "long", tail: "puff", puff: "#f1e3c6", wool: true, foot: "#7a5230", nose: "nostril", bx: -0.02 } },
  { id: "walk-bison", name: "Bison", custom: "animal", walk: true, top: "#5b3a1c", bot: "#3b2314", o: { len: 0.27, fat: 0.17, leg: 0.13, lw: 0.06, neck: 0.04, up: 0.1, nw: 0.2, head: 0.105, snout: 0.07, jaw: 0.75, bx: -0.1, stride: 0.035, ears: "side", hump: "low", horns: "cow", tail: "thin", foot: "#1f2937", nose: "nostril" } },
  { id: "walk-moose", name: "Moose", custom: "animal", walk: true, top: "#6b4423", bot: "#d6c7a1", o: { len: 0.23, fat: 0.12, leg: 0.24, lw: 0.036, neck: 0.13, up: 0.9, nw: 0.1, head: 0.075, snout: 0.1, jaw: 0.72, ears: "side", antlers: true, tail: "short", belly: true, foot: "#1f2937", nose: "nostril" } },
  { id: "walk-polarbear", name: "Polar bear", custom: "animal", walk: true, top: "#ffffff", bot: "#e2e8f0", o: { len: 0.25, fat: 0.17, leg: 0.13, lw: 0.07, neck: 0.06, up: 0.35, nw: 0.16, head: 0.105, snout: 0.07, ears: "round", tail: "puff", puff: "#ffffff", edge: true } },
  { id: "walk-panda", name: "Panda", custom: "animal", walk: true, top: "#ffffff", bot: "#1f2937", o: { len: 0.24, fat: 0.17, leg: 0.12, lw: 0.07, neck: 0.06, up: 0.35, nw: 0.16, head: 0.11, snout: 0.06, ears: "round", earc: "b", eyePatch: true, limb: "b", tail: "puff", puff: "#ffffff", edge: true } },
  { id: "walk-leopard", name: "Leopard", custom: "animal", walk: true, top: "#f2b84b", bot: "#7a4a12", o: { len: 0.25, fat: 0.11, leg: 0.16, lw: 0.045, neck: 0.08, up: 0.7, nw: 0.12, head: 0.09, snout: 0.06, ears: "round", tail: "long", spots: "small", face: "#fde9b8", whiskers: true } },
  { id: "walk-dalmatian", name: "Dalmatian", custom: "animal", walk: true, top: "#ffffff", bot: "#1f2937", o: { len: 0.22, fat: 0.11, leg: 0.18, lw: 0.042, neck: 0.1, up: 0.9, nw: 0.1, head: 0.085, snout: 0.085, ears: "floppy", tail: "up", spots: true, edge: true } },
  { id: "walk-crocodile", name: "Crocodile", custom: "animal", walk: true, top: "#4d7c0f", bot: "#d9f99d", o: { len: 0.24, fat: 0.075, leg: 0.06, lw: 0.045, neck: 0.02, up: 0, head: 0.065, snout: 0.15, jaw: 0.6, bx: -0.05, stride: 0.04, tail: "dino", tlen: 0.2, belly: true, teeth: true, nose: "nostril" } },
];

/** Draws an animal one unit tall at the origin (the caller has already scaled). a and b are its two colours;
 *  `live` (see the top of this file) makes it move its limbs. */
// sitting animals that get up and walk side-on when they travel: the walking animal of the same name, or one of these
const SIDE = {
  rabbit: { o: { len: 0.17, fat: 0.11, leg: 0.09, lw: 0.04, neck: 0.04, up: 0.9, nw: 0.08, head: 0.085, snout: 0.04, ears: "long", tail: "puff", puff: "#ffffff", nosec: "#f48fb1", whiskers: true, belly: true } },
  mouse: { o: { len: 0.15, fat: 0.085, leg: 0.06, lw: 0.03, neck: 0.03, up: 0.5, nw: 0.07, head: 0.075, snout: 0.06, ears: "round", tail: "long", whiskers: true, nosec: "#f48fb1", belly: true } },
  hamster: { o: { len: 0.16, fat: 0.12, leg: 0.05, lw: 0.035, neck: 0.02, up: 0.5, nw: 0.1, head: 0.09, snout: 0.04, ears: "round", tail: "puff", belly: true, nosec: "#f48fb1", whiskers: true } },
  raccoon: { o: { len: 0.2, fat: 0.1, leg: 0.12, lw: 0.04, neck: 0.06, up: 0.7, nw: 0.09, head: 0.08, snout: 0.07, jaw: 0.5, bx: 0, ears: "pointy", tail: "bushy", eyePatch: "#1f2937", belly: true, face: "b" } },
  squirrel: { o: { len: 0.15, fat: 0.09, leg: 0.08, lw: 0.035, neck: 0.04, up: 0.8, nw: 0.07, head: 0.075, snout: 0.05, ears: "pointy", tail: "bushy", belly: true } },
  koala: { o: { len: 0.19, fat: 0.13, leg: 0.1, lw: 0.05, neck: 0.04, up: 0.6, nw: 0.12, head: 0.1, snout: 0.03, ears: "round", tail: "puff", puff: "#9ca3af", nosec: "#1f2937" } },
  monkey: { o: { len: 0.17, fat: 0.1, leg: 0.17, lw: 0.04, neck: 0.06, up: 0.9, nw: 0.08, head: 0.085, snout: 0.04, ears: "round", tail: "up", face: "b", belly: true } },
  gorilla: { o: { len: 0.2, fat: 0.15, leg: 0.17, lw: 0.07, neck: 0.04, up: 0.6, nw: 0.13, head: 0.095, snout: 0.045, bx: -0.04, ears: "round", face: "b" } },
  reindeer: { like: "deer", o: { nosec: "#e5484d" } },
  penguin: { own: true }, frog: { own: true }, owl: { own: true }, chick: { own: true }, // drawn side-on below
};

// ---------- birds and a frog, side-on ----------
// How their legs go: `step` is where each foot is ([x offset, lift]) through a stride; walking, jogging and running
// step faster and further; jumping tucks the feet up; flying trails them behind.
function going(live) {
  const gait = live && live.go ? live.gait || "walk" : live && (live.gait === "jump" || live.gait === "fly") ? live.gait : null;
  const pace = { walk: [1.4, 0.04], jog: [1.9, 0.06], run: [2.4, 0.08] }[gait] || [0, 0], ph = live ? live.t * TAU * pace[0] : 0;
  const air = gait === "jump" ? hop(live.t) : 0, fly = gait === "fly";
  const step = (off) => (fly ? [-0.05, 0.05] : air ? [0, 0.06 * air] : pace[0] ? [pace[1] * Math.sin(ph + off), Math.max(0, Math.cos(ph + off)) * 0.04] : [0, 0]);
  return { gait, ph, air, fly, step, run: gait === "run" ? 1 : gait === "jog" ? 0.5 : 0 };
}
const ORANGE = "#f59e0b";
/** A bird's leg from the body (x, top) down to the ground, with three toes pointing forward. */
function birdLeg(g, x, top, [dx, up], far, c = ORANGE) {
  const { line } = kit(g), fx = x + dx, fy = 0.44 - up, col = far ? "#c27c0e" : c;
  line(col, 0.022, [[x, top], [fx, fy]]); line(col, 0.016, [[fx - 0.02, fy], [fx + 0.06, fy]]); line(col, 0.014, [[fx, fy], [fx + 0.045, fy + 0.012]]);
}
Object.assign(OWN, {
  "side-penguin"(g, a, b, live) { // a waddle: short shuffling steps, the body rocking from foot to foot, flippers out
    const { oval, tri } = kit(g), m = going(live), rock = m.gait && !m.fly && !m.air ? Math.sin(m.ph) * 0.08 : 0;
    const flap = m.fly ? beat(live, 3) * 0.9 : m.air ? 0.9 * m.air : m.gait ? Math.sin(m.ph) * 0.25 + 0.15 : 0;
    const foot = ([dx, up], far) => oval(far ? "#c27c0e" : ORANGE, 0.06 + dx, 0.43 - up, 0.085, 0.032);
    g.save(); g.translate(0, 0.44); g.rotate(rock + m.run * 0.12); g.translate(0, -0.44);
    foot(m.step(Math.PI), true);
    oval(a, 0, 0.0, 0.21, 0.42); oval(b, 0.075, 0.07, 0.13, 0.33);
    oval("#ffffff", 0.1, -0.27, 0.035, 0.035); oval(DARK, 0.11, -0.27, 0.018, 0.018);
    tri(ORANGE, [0.18, -0.27], [0.3, -0.22], [0.18, -0.19]);
    oval("rgba(250,204,21,0.55)", 0.07, -0.18, 0.05, 0.025, -0.3); // a splash of yellow at the neck
    foot(m.step(0), false);
    g.save(); g.translate(-0.02, -0.12); g.rotate(-0.1 + flap); oval(a, 0, 0.14, 0.055, 0.17); g.restore(); // the flipper swings from the shoulder
    g.restore();
  },
  "side-frog"(g, a, b, live) { // hops: crouch, push off with the long back legs, stretch out in the air, land
    const { oval, line, curve } = kit(g), m = going(live);
    let up = 0, out = 0; // up: how high this hop is; out: how stretched the legs are
    if (m.air) out = m.air; else if (m.fly) out = 0.7 + beat(live, 1.5) * 0.15;
    else if (m.gait) { const rate = { walk: 1.1, jog: 1.5, run: 1.9 }[m.gait], q = live.t * rate - Math.floor(live.t * rate); const h = q < 0.3 ? 0 : Math.sin((Math.PI * (q - 0.3)) / 0.7); up = h * (0.1 + m.run * 0.06); out = h; }
    g.save(); g.translate(0, -up); g.rotate(-out * 0.25); // in the air the frog points up and forward
    const backLeg = (far) => { const c = far ? "rgba(0,0,0,0.18)" : null, knee = [-0.08 - out * 0.12, 0.22 + out * 0.08], foot = [-0.04 - out * 0.32, 0.42 - out * 0.08];
      oval(a, -0.13 - out * 0.04, 0.28 - out * 0.03, 0.13, 0.08, -0.3 + out * 0.5); if (c) oval(c, -0.13 - out * 0.04, 0.28 - out * 0.03, 0.13, 0.08, -0.3 + out * 0.5);
      line(a, 0.045, [[-0.17, 0.3], knee, foot]); if (c) line(c, 0.045, [[-0.17, 0.3], knee, foot]);
      oval(far ? "#2fa85e" : a, foot[0] + 0.03, foot[1], 0.065, 0.025, -out * 0.4); };
    backLeg(true);
    line("#2fa85e", 0.035, [[0.1, 0.22], [0.15 + out * 0.08, 0.42 - out * 0.06]]); // far front leg
    oval(a, -0.02, 0.18, 0.24, 0.15, -0.35); oval(b, 0.03, 0.26, 0.17, 0.07, -0.3);
    oval(a, 0.16, 0.06, 0.14, 0.1);
    oval(a, 0.14, -0.035, 0.068, 0.068); oval("#ffffff", 0.148, -0.04, 0.048, 0.048); oval(DARK, 0.165, -0.04, 0.024, 0.024);
    curve("#14532d", 0.012, [0.13, 0.11], [0.22, 0.12], [0.29, 0.06]);
    oval("rgba(244,114,182,0.4)", 0.2, 0.085, 0.025, 0.016);
    backLeg(false);
    line(a, 0.04, [[0.12, 0.23], [0.17 + out * 0.1, 0.42 - out * 0.06]]); oval(a, 0.2 + out * 0.1, 0.425 - out * 0.06, 0.045, 0.02);
    g.restore();
  },
  "side-owl"(g, a, b, live) { // steps along on short legs; flies with big slow flaps
    const { oval, tri } = kit(g), m = going(live), bob = m.gait && !m.fly && !m.air ? Math.abs(Math.sin(m.ph)) * 0.012 : 0;
    const wing = m.fly ? beat(live, 1.6) * 1.2 + 0.4 : m.air ? 1.2 * m.air : 0;
    birdLeg(g, -0.02, 0.34, m.step(Math.PI), true);
    g.save(); g.translate(0, -bob); g.rotate(m.fly ? 0.35 : m.run * 0.1);
    tri(a, [-0.14, 0.26], [-0.3, 0.4], [-0.06, 0.36]); // tail
    oval(a, -0.02, 0.08, 0.2, 0.3); oval(b, 0.07, 0.13, 0.11, 0.22);
    for (const [y, x] of [[0.04, 0.07], [0.12, 0.09], [0.2, 0.07]]) { g.strokeStyle = "rgba(0,0,0,0.18)"; g.lineWidth = 0.01; g.beginPath(); g.arc(x, y, 0.025, 0.3, Math.PI - 0.3); g.stroke(); } // breast feathers
    tri(a, [-0.07, -0.33], [-0.11, -0.47], [0.02, -0.37]); // ear tuft
    oval(a, 0.03, -0.24, 0.17, 0.15); oval(b, 0.12, -0.24, 0.085, 0.105);
    oval("#ffffff", 0.14, -0.26, 0.05, 0.05); oval(DARK, 0.16, -0.26, 0.027, 0.027); oval("#ffffff", 0.153, -0.268, 0.009, 0.009);
    tri(ORANGE, [0.19, -0.24], [0.24, -0.2], [0.19, -0.17]);
    g.save(); g.translate(-0.04, -0.08); g.rotate(0.12 + wing); oval(a, -0.02, 0.15, 0.1, 0.22); oval("rgba(0,0,0,0.12)", -0.02, 0.15, 0.1, 0.22); g.restore(); // the wing
    g.restore();
    birdLeg(g, 0.06, 0.34, m.step(0), false);
  },
  "side-chick"(g, a, b, live) { // little quick steps, head bobbing; flutters its stubby wings to fly
    const { oval, tri } = kit(g), m = going(live), nod = m.gait && !m.fly && !m.air ? Math.sin(m.ph * 2) * 0.015 : 0;
    const wing = m.fly ? beat(live, 4) * 1.0 + 0.5 : m.air ? 1.0 * m.air : m.gait ? 0.15 : 0;
    birdLeg(g, -0.03, 0.28, m.step(Math.PI), true);
    g.save(); g.rotate(m.fly ? 0.25 : m.run * 0.1);
    tri(a, [-0.18, 0.06], [-0.3, 0.0], [-0.2, 0.14]); // tail
    oval(a, -0.02, 0.12, 0.22, 0.2);
    g.save(); g.translate(nod * 2, nod);
    oval(a, 0.12, -0.14, 0.14, 0.13);
    tri(ORANGE, [0.24, -0.17], [0.33, -0.13], [0.24, -0.1]);
    oval(DARK, 0.17, -0.17, 0.02, 0.02); oval("#ffffff", 0.165, -0.176, 0.006, 0.006); oval("rgba(244,114,182,0.45)", 0.18, -0.105, 0.025, 0.016);
    tri(a, [0.06, -0.26], [0.1, -0.33], [0.12, -0.26]); // a tuft on top
    g.restore();
    g.save(); g.translate(-0.06, 0.06); g.rotate(0.3 + wing); oval(a, -0.02, 0.06, 0.11, 0.075); oval("rgba(180,120,0,0.28)", -0.02, 0.06, 0.11, 0.075); g.restore();
    g.restore();
    birdLeg(g, 0.06, 0.28, m.step(0), false);
  },
});
/** The side-on walking animal for a sitting one (`id`), or null if it has none (it then hops along facing us). */
export function sideOf(id) {
  const same = ANIMALS.find((x) => x.id === `walk-${id}`), own = ANIMALS.find((x) => x.id === id), more = SIDE[id];
  if (same) return same;
  if (!more || !own) return null;
  if (more.own) return { id: `side-${id}`, name: own.name, custom: "animal", top: own.top, bot: own.bot };
  const like = more.like && ANIMALS.find((x) => x.id === `walk-${more.like}`);
  return { id: `side-${id}`, custom: "animal", walk: true, top: own.top, bot: own.bot, o: { ...(like ? like.o : {}), ...more.o } };
}

export function drawAnimal(g, d, a, b, live = null) { if (OWN[d.id]) OWN[d.id](g, a, b, live); else if (d.walk) walker(g, d.o || {}, a, b, live); else critter(g, d.o || {}, a, b, live); }
