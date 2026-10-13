// Draw & Animate: hand-drawn things, in three kinds: things that go, nature, and everyday things.
// Each is one unit across at most, with its middle at the origin; the ones that travel face right.
// `a` is the main colour and `b` the second colour: the child can change both.
// `live` is null for a still picture. While an animation plays it is { t: seconds, go: is it travelling }:
// wheels turn when the thing travels, and flames, flags, smoke and sails move all the time.

const D = "#1f2937", GLASS = "#bfe3ff", WOOD = "#8b5a2b", TAU = Math.PI * 2;
const beat = (live, rate, off = 0) => (live ? Math.sin(live.t * TAU * rate + off) : 0);
const roll = (live) => (live && live.go ? live.t * 9 : 0); // how far round a wheel has turned

function kit(g) {
  const fill = (c, path, rim) => { g.fillStyle = c; g.beginPath(); path(); g.fill(); if (rim) { g.strokeStyle = rim === true ? "#b6c2d1" : rim; g.lineWidth = 0.012; g.stroke(); } };
  const oval = (c, x, y, rx, ry = rx, turn = 0, rim) => fill(c, () => g.ellipse(x, y, rx, ry, turn, 0, TAU), rim);
  const rect = (c, x, y, w, h, r = 0, rim) => fill(c, () => { if (!r) { g.rect(x, y, w, h); return; } g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }, rim);
  const poly = (c, pts, rim) => fill(c, () => { g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.closePath(); }, rim);
  const line = (c, w, pts) => { g.strokeStyle = c; g.lineWidth = w; g.lineCap = "round"; g.lineJoin = "round"; g.beginPath(); g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.stroke(); };
  const arc = (c, w, x, y, r, from, to) => { g.strokeStyle = c; g.lineWidth = w; g.lineCap = "round"; g.beginPath(); g.arc(x, y, r, from, to); g.stroke(); };
  const curve = (c, w, p, q, r) => { g.strokeStyle = c; g.lineWidth = w; g.lineCap = "round"; g.beginPath(); g.moveTo(p[0], p[1]); g.quadraticCurveTo(q[0], q[1], r[0], r[1]); g.stroke(); };
  const wheel = (x, y, r, spin, hub = "#9ca3af") => { oval(D, x, y, r); oval(hub, x, y, r * 0.52); for (let i = 0; i < 2; i += 1) { const t = spin + (i * Math.PI) / 2; line(D, r * 0.14, [x - Math.cos(t) * r * 0.5, y - Math.sin(t) * r * 0.5, x + Math.cos(t) * r * 0.5, y + Math.sin(t) * r * 0.5]); } };
  const ring = (x, y, r, spin) => { arc(D, r * 0.16, x, y, r, 0, TAU); for (let i = 0; i < 4; i += 1) { const t = spin + (i * Math.PI) / 4; line("#9ca3af", r * 0.05, [x - Math.cos(t) * r, y - Math.sin(t) * r, x + Math.cos(t) * r, y + Math.sin(t) * r]); } oval(D, x, y, r * 0.12); };
  const about = (x, y, turn, draw) => { g.save(); g.translate(x, y); g.rotate(turn); g.translate(-x, -y); draw(); g.restore(); };
  const puffs = (live, x, y, c = "rgba(156,163,175,0.75)") => { for (let i = 0; i < 3; i += 1) { const u = live ? (live.t * 0.6 + i / 3) % 1 : i / 3; oval(c, x - u * 0.08, y - u * 0.2, 0.03 + u * 0.035); } };
  const star = (c, x, y, r, n = 5, inner = 0.45, turn = -Math.PI / 2) => fill(c, () => { for (let i = 0; i < n * 2; i += 1) { const t = turn + (i * Math.PI) / n, q = i % 2 ? r * inner : r; g.lineTo(x + Math.cos(t) * q, y + Math.sin(t) * q); } g.closePath(); });
  return { fill, oval, rect, poly, line, arc, curve, wheel, ring, about, puffs, star };
}

const GO = {
  car(g, a, b, live) { const k = kit(g), s = roll(live);
    k.poly(a, [-0.26, 0.1, -0.15, -0.13, 0.15, -0.13, 0.28, 0.1]); k.rect(a, -0.43, 0.06, 0.86, 0.22, 0.07);
    k.poly(GLASS, [-0.2, 0.06, -0.13, -0.09, -0.02, -0.09, -0.02, 0.06]); k.poly(GLASS, [0.03, 0.06, 0.03, -0.09, 0.13, -0.09, 0.21, 0.06]);
    k.rect(b, -0.43, 0.17, 0.86, 0.035); k.oval("#fde047", 0.4, 0.13, 0.026); k.oval("#ef4444", -0.41, 0.13, 0.02);
    k.wheel(-0.25, 0.3, 0.1, s); k.wheel(0.25, 0.3, 0.1, s); },
  bus(g, a, b, live) { const k = kit(g), s = roll(live);
    k.rect(a, -0.46, -0.22, 0.92, 0.5, 0.07); k.rect(b, -0.46, 0.1, 0.92, 0.045);
    for (let i = 0; i < 4; i += 1) k.rect(GLASS, -0.4 + i * 0.19, -0.15, 0.15, 0.17, 0.02); k.rect(GLASS, 0.36, -0.15, 0.08, 0.3, 0.02);
    k.oval("#fde047", 0.43, 0.2, 0.022); k.wheel(-0.27, 0.3, 0.1, s); k.wheel(0.25, 0.3, 0.1, s); },
  truck(g, a, b, live) { const k = kit(g), s = roll(live);
    k.rect(b, -0.46, -0.2, 0.58, 0.46, 0.03); k.line("rgba(0,0,0,0.15)", 0.012, [-0.27, -0.2, -0.27, 0.26, -0.07, 0.26, -0.07, -0.2]);
    k.poly(a, [0.14, 0.26, 0.14, -0.08, 0.32, -0.08, 0.45, 0.08, 0.45, 0.26]); k.poly(GLASS, [0.2, 0.06, 0.2, -0.03, 0.3, -0.03, 0.38, 0.06]);
    k.oval("#fde047", 0.43, 0.17, 0.022); k.wheel(-0.3, 0.3, 0.1, s); k.wheel(-0.07, 0.3, 0.1, s); k.wheel(0.3, 0.3, 0.1, s); },
  fireengine(g, a, b, live) { const k = kit(g), s = roll(live);
    k.rect(a, -0.46, -0.04, 0.92, 0.32, 0.04); k.rect(a, 0.16, -0.2, 0.3, 0.2, 0.04); k.rect(GLASS, 0.22, -0.15, 0.19, 0.13, 0.02);
    k.line(b, 0.022, [-0.42, -0.12, 0.1, -0.12]); k.line(b, 0.022, [-0.42, -0.2, 0.1, -0.2]); for (let i = 0; i < 6; i += 1) k.line(b, 0.018, [-0.4 + i * 0.095, -0.2, -0.4 + i * 0.095, -0.12]);
    g.globalAlpha = live ? 0.4 + 0.6 * Math.abs(beat(live, 2)) : 1; k.oval("#3b82f6", 0.3, -0.24, 0.035); g.globalAlpha = 1;
    k.rect("#e5e7eb", -0.3, 0.06, 0.2, 0.12, 0.02); k.oval("#fde047", 0.44, 0.16, 0.02); k.wheel(-0.27, 0.3, 0.1, s); k.wheel(0.27, 0.3, 0.1, s); },
  tractor(g, a, b, live) { const k = kit(g), s = roll(live);
    k.line(D, 0.03, [0.2, -0.04, 0.2, -0.24]); k.puffs(live, 0.2, -0.28);
    k.rect(a, -0.08, -0.04, 0.44, 0.26, 0.03); k.rect(a, -0.32, -0.28, 0.28, 0.42, 0.03); k.rect(GLASS, -0.27, -0.23, 0.18, 0.18, 0.02);
    k.wheel(-0.2, 0.22, 0.2, s * 0.5, b); k.wheel(0.27, 0.31, 0.11, s, b); },
  train(g, a, b, live) { const k = kit(g), s = roll(live);
    k.rect(D, 0.2, -0.24, 0.09, 0.2); k.rect(D, 0.17, -0.27, 0.15, 0.05, 0.01); k.puffs(live, 0.24, -0.32, "rgba(255,255,255,0.9)");
    k.rect(a, -0.12, -0.08, 0.54, 0.3, 0.1); k.rect(b, -0.44, -0.28, 0.34, 0.5, 0.03); k.rect(GLASS, -0.38, -0.2, 0.2, 0.16, 0.02);
    k.oval("#fde047", 0.4, 0.0, 0.03); k.poly("#6b7280", [0.36, 0.22, 0.48, 0.34, 0.36, 0.34]); k.rect(D, -0.44, 0.2, 0.84, 0.04);
    k.wheel(-0.3, 0.3, 0.1, s, "#ef4444"); k.wheel(-0.05, 0.3, 0.1, s, "#ef4444"); k.wheel(0.2, 0.3, 0.1, s, "#ef4444"); },
  bicycle(g, a, b, live) { const k = kit(g), s = roll(live);
    k.ring(-0.27, 0.22, 0.18, s); k.ring(0.27, 0.22, 0.18, s);
    k.line(a, 0.035, [-0.27, 0.22, -0.02, 0.22, 0.14, -0.1, -0.12, -0.1, -0.27, 0.22]); k.line(a, 0.035, [-0.02, 0.22, -0.12, -0.1]); k.line(a, 0.035, [0.27, 0.22, 0.12, -0.2]);
    k.line(D, 0.035, [0.05, -0.22, 0.2, -0.2]); k.line(b, 0.05, [-0.19, -0.13, -0.05, -0.13]); k.line(D, 0.025, [-0.12, -0.1, -0.12, -0.13]); k.oval(D, -0.02, 0.22, 0.035); },
  scooter(g, a, b, live) { const k = kit(g), s = roll(live);
    k.line(a, 0.045, [-0.3, 0.28, 0.2, 0.28, 0.3, 0.2]); k.line(a, 0.04, [0.3, 0.26, 0.2, -0.3]); k.line(b, 0.05, [0.1, -0.3, 0.3, -0.3]);
    k.wheel(-0.32, 0.34, 0.08, s); k.wheel(0.32, 0.34, 0.08, s); },
  motorbike(g, a, b, live) { const k = kit(g), s = roll(live);
    k.line("#6b7280", 0.035, [0.28, 0.24, 0.16, -0.08]); k.line(D, 0.035, [0.08, -0.14, 0.24, -0.1]);
    k.wheel(-0.28, 0.24, 0.16, s); k.wheel(0.28, 0.24, 0.16, s);
    k.poly(a, [-0.3, 0.02, -0.02, -0.04, 0.16, -0.06, 0.12, 0.14, -0.12, 0.2]); k.rect(D, -0.3, -0.04, 0.26, 0.07, 0.03); k.oval(b, 0.05, 0.05, 0.07, 0.05); k.oval("#fde047", 0.2, -0.04, 0.03); },
  skateboard(g, a, b, live) { const k = kit(g), s = roll(live);
    k.wheel(-0.26, 0.14, 0.07, s, b); k.wheel(0.26, 0.14, 0.07, s, b); k.line(a, 0.06, [-0.44, -0.02, -0.36, 0.05, 0.36, 0.05, 0.44, -0.02]); },
  plane(g, a, b, live) { const k = kit(g), spin = live ? live.t * 30 : 0.6;
    k.poly(b, [-0.3, -0.02, -0.44, -0.24, -0.32, -0.24, -0.18, -0.04]); k.oval(a, 0, 0.02, 0.42, 0.11, 0, true);
    k.poly(b, [-0.02, 0.04, 0.14, 0.04, -0.06, 0.3, -0.18, 0.3]); for (let i = 0; i < 4; i += 1) k.oval(GLASS, -0.1 + i * 0.11, -0.02, 0.03);
    k.oval(D, 0.42, 0.02, 0.025); g.fillStyle = "rgba(31,41,55,0.55)"; g.beginPath(); g.ellipse(0.44, 0.02, 0.015, 0.03 + 0.14 * Math.abs(Math.cos(spin)), 0, 0, TAU); g.fill(); },
  helicopter(g, a, b, live) { const k = kit(g), spin = live ? live.t * 26 : 0.4;
    k.line(a, 0.05, [-0.1, 0.04, -0.44, -0.02]); k.poly(b, [-0.46, -0.14, -0.4, -0.14, -0.36, 0.0, -0.44, 0.0]);
    k.line("#6b7280", 0.022, [-0.12, 0.34, 0.22, 0.34]); k.line("#6b7280", 0.02, [-0.04, 0.24, -0.06, 0.34]); k.line("#6b7280", 0.02, [0.12, 0.24, 0.14, 0.34]);
    k.oval(a, 0.04, 0.08, 0.26, 0.18); k.fill(GLASS, () => { g.moveTo(0.1, -0.06); g.quadraticCurveTo(0.3, -0.04, 0.29, 0.1); g.lineTo(0.1, 0.1); g.closePath(); });
    k.line(D, 0.025, [0.04, -0.1, 0.04, -0.17]); const w = 0.12 + 0.34 * Math.abs(Math.cos(spin)); k.line("rgba(31,41,55,0.7)", 0.025, [0.04 - w, -0.18, 0.04 + w, -0.18]); },
  rocket(g, a, b, live) { const k = kit(g), f = 1 + beat(live, 5) * 0.2;
    k.poly("#f97316", [-0.07, 0.24, 0.07, 0.24, 0, 0.24 + 0.22 * f]); k.poly("#fde047", [-0.04, 0.24, 0.04, 0.24, 0, 0.24 + 0.12 * f]);
    k.poly(b, [-0.11, 0.06, -0.24, 0.28, -0.1, 0.24]); k.poly(b, [0.11, 0.06, 0.24, 0.28, 0.1, 0.24]);
    k.fill(a, () => { g.moveTo(0, -0.46); g.quadraticCurveTo(0.17, -0.2, 0.12, 0.26); g.lineTo(-0.12, 0.26); g.quadraticCurveTo(-0.17, -0.2, 0, -0.46); }, true);
    k.fill(b, () => { g.moveTo(0, -0.46); g.quadraticCurveTo(0.09, -0.34, 0.11, -0.24); g.lineTo(-0.11, -0.24); g.quadraticCurveTo(-0.09, -0.34, 0, -0.46); });
    k.oval("#374151", 0, -0.08, 0.065); k.oval(GLASS, 0, -0.08, 0.048); },
  hotair(g, a, b, live) { const k = kit(g);
    g.rotate(beat(live, 0.4) * 0.05);
    k.line(WOOD, 0.012, [-0.16, 0.14, -0.07, 0.34]); k.line(WOOD, 0.012, [0.16, 0.14, 0.07, 0.34]);
    k.oval(a, 0, -0.12, 0.3, 0.33); g.save(); g.beginPath(); g.ellipse(0, -0.12, 0.3, 0.33, 0, 0, TAU); g.clip(); k.oval(b, 0, -0.12, 0.17, 0.34); k.oval(a, 0, -0.12, 0.06, 0.34); g.restore();
    k.rect(WOOD, -0.08, 0.33, 0.16, 0.12, 0.02); k.line("#5b3a1c", 0.012, [-0.08, 0.37, 0.08, 0.37]); },
  sailboat(g, a, b, live) { const k = kit(g);
    g.rotate(beat(live, 0.5) * 0.06); const puff = beat(live, 0.8) * 0.02;
    k.line(WOOD, 0.025, [0, 0.2, 0, -0.42]); k.fill(b, () => { g.moveTo(0.03, -0.4); g.quadraticCurveTo(0.34 + puff, -0.06, 0.34, 0.14); g.lineTo(0.03, 0.14); g.closePath(); }, true);
    k.fill("#ffffff", () => { g.moveTo(-0.03, -0.3); g.quadraticCurveTo(-0.26 - puff, -0.04, -0.28, 0.14); g.lineTo(-0.03, 0.14); g.closePath(); }, true);
    k.poly(a, [-0.42, 0.2, 0.44, 0.2, 0.3, 0.38, -0.32, 0.38]); k.line("rgba(255,255,255,0.6)", 0.02, [-0.36, 0.26, 0.37, 0.26]); },
  ship(g, a, b, live) { const k = kit(g);
    g.rotate(beat(live, 0.4) * 0.03);
    k.rect(b, 0.02, -0.34, 0.11, 0.2); k.rect(D, 0.02, -0.34, 0.11, 0.04); k.puffs(live, 0.07, -0.38);
    k.rect("#ffffff", -0.24, -0.16, 0.46, 0.16, 0.02, true); k.rect("#ffffff", -0.34, -0.02, 0.64, 0.14, 0.02, true); for (let i = 0; i < 4; i += 1) k.oval(GLASS, -0.14 + i * 0.1, -0.08, 0.025);
    k.poly(a, [-0.46, 0.1, 0.48, 0.1, 0.36, 0.36, -0.36, 0.36]); for (let i = 0; i < 5; i += 1) k.oval("#fde047", -0.26 + i * 0.13, 0.2, 0.022); },
  submarine(g, a, b, live) { const k = kit(g), spin = live ? live.t * 20 : 0.5;
    k.line(a, 0.03, [0.02, -0.14, 0.02, -0.34, 0.12, -0.34]); k.rect(a, -0.08, -0.2, 0.2, 0.16, 0.04);
    g.fillStyle = "#6b7280"; g.beginPath(); g.ellipse(-0.42, 0.06, 0.02, 0.03 + 0.1 * Math.abs(Math.cos(spin)), 0, 0, TAU); g.fill();
    k.oval(a, 0, 0.06, 0.4, 0.19); k.rect(b, -0.36, 0.1, 0.72, 0.035); for (let i = 0; i < 3; i += 1) { k.oval("#374151", -0.14 + i * 0.16, 0.02, 0.055); k.oval(GLASS, -0.14 + i * 0.16, 0.02, 0.04); }
    for (let i = 0; i < 3; i += 1) { const u = live ? (live.t * 0.5 + i / 3) % 1 : i / 3; k.arc("rgba(125,211,252,0.9)", 0.012, 0.36 + i * 0.03, -0.14 - u * 0.24, 0.02 + u * 0.015, 0, TAU); } },
  ufo(g, a, b, live) { const k = kit(g);
    g.translate(0, beat(live, 0.6) * 0.03);
    k.oval(GLASS, 0, -0.06, 0.2, 0.19, 0, "#7dd3fc"); k.oval("#22c55e", 0, -0.06, 0.07, 0.085); k.oval(D, -0.025, -0.08, 0.014, 0.02); k.oval(D, 0.025, -0.08, 0.014, 0.02);
    k.oval(a, 0, 0.08, 0.44, 0.12); k.oval("rgba(255,255,255,0.25)", 0, 0.04, 0.36, 0.05);
    for (let i = 0; i < 5; i += 1) { g.globalAlpha = live ? 0.35 + 0.65 * Math.abs(beat(live, 1.2, i)) : 1; k.oval(b, -0.3 + i * 0.15, 0.11, 0.03); } g.globalAlpha = 1; },
};

const NATURE = {
  tree(g, a, b, live) { const k = kit(g);
    k.rect(b, -0.055, 0.1, 0.11, 0.36, 0.02); k.about(0, 0.14, beat(live, 0.4) * 0.03, () => { k.oval(a, -0.16, -0.06, 0.19); k.oval(a, 0.16, -0.06, 0.19); k.oval(a, 0, -0.22, 0.23); k.oval(a, 0, 0.0, 0.2); k.oval("rgba(255,255,255,0.14)", -0.06, -0.26, 0.09); }); },
  pine(g, a, b, live) { const k = kit(g);
    k.rect(b, -0.05, 0.3, 0.1, 0.16, 0.01); k.about(0, 0.32, beat(live, 0.4) * 0.025, () => { k.poly(a, [-0.3, 0.32, 0.3, 0.32, 0, -0.06]); k.poly(a, [-0.24, 0.1, 0.24, 0.1, 0, -0.26]); k.poly(a, [-0.17, -0.12, 0.17, -0.12, 0, -0.46]); }); },
  palm(g, a, b, live) { const k = kit(g), s = beat(live, 0.5) * 0.04;
    k.curve(b, 0.075, [-0.06, 0.46], [-0.1, 0.1], [0.04, -0.18]);
    k.about(0.04, -0.18, s, () => { for (const [x, y, q] of [[-0.38, -0.08, -0.3], [-0.26, -0.36, -0.36], [0.06, -0.46, -0.44], [0.36, -0.3, -0.38], [0.42, 0.0, -0.26]]) k.curve(a, 0.07, [0.04, -0.18], [(x + 0.04) / 2, q], [x, y]); k.oval("#7a4a12", 0.0, -0.13, 0.04); k.oval("#7a4a12", 0.08, -0.12, 0.04); }); },
  fruittree(g, a, b, live) { const k = kit(g);
    k.rect(WOOD, -0.055, 0.1, 0.11, 0.36, 0.02); k.about(0, 0.14, beat(live, 0.4) * 0.03, () => { k.oval(a, -0.16, -0.06, 0.19); k.oval(a, 0.16, -0.06, 0.19); k.oval(a, 0, -0.22, 0.23); k.oval(a, 0, 0.0, 0.2); for (const [x, y] of [[-0.18, -0.1], [0.02, -0.28], [0.17, -0.02], [-0.04, 0.02], [0.12, -0.2], [-0.12, -0.26]]) k.oval(b, x, y, 0.04); }); },
  bush(g, a, b) { const k = kit(g);
    k.oval(a, -0.2, 0.24, 0.2, 0.18); k.oval(a, 0.2, 0.24, 0.2, 0.18); k.oval(a, 0, 0.14, 0.24, 0.22); k.rect(a, -0.38, 0.26, 0.76, 0.16, 0.06);
    for (const [x, y] of [[-0.2, 0.2], [0.05, 0.08], [0.22, 0.26], [-0.04, 0.3]]) k.oval(b, x, y, 0.035); },
  flower(g, a, b, live) { const k = kit(g);
    k.about(0, 0.46, beat(live, 0.6) * 0.06, () => { k.line("#16a34a", 0.035, [0, 0.46, 0, -0.05]); k.oval("#22c55e", -0.1, 0.24, 0.1, 0.045, 0.5); k.oval("#22c55e", 0.1, 0.16, 0.1, 0.045, -0.5);
      for (let i = 0; i < 6; i += 1) { const t = (i * TAU) / 6; k.oval(a, Math.cos(t) * 0.14, -0.18 + Math.sin(t) * 0.14, 0.1); } k.oval(b, 0, -0.18, 0.09); }); },
  tulip(g, a, b, live) { const k = kit(g);
    k.about(0, 0.46, beat(live, 0.6) * 0.06, () => { k.line("#16a34a", 0.035, [0, 0.46, 0, -0.05]); k.fill("#22c55e", () => { g.moveTo(0, 0.4); g.quadraticCurveTo(-0.24, 0.26, -0.16, 0.0); g.quadraticCurveTo(-0.06, 0.2, 0, 0.4); }); k.fill("#22c55e", () => { g.moveTo(0, 0.4); g.quadraticCurveTo(0.24, 0.3, 0.18, 0.06); g.quadraticCurveTo(0.06, 0.22, 0, 0.4); });
      k.fill(a, () => { g.moveTo(-0.15, -0.3); g.lineTo(-0.07, -0.2); g.lineTo(0, -0.34); g.lineTo(0.07, -0.2); g.lineTo(0.15, -0.3); g.quadraticCurveTo(0.2, 0.0, 0, 0.0); g.quadraticCurveTo(-0.2, 0.0, -0.15, -0.3); }); k.curve(b, 0.014, [0, -0.3], [0.03, -0.14], [0, -0.02]); }); },
  sunflower(g, a, b, live) { const k = kit(g);
    k.about(0, 0.46, beat(live, 0.5) * 0.05, () => { k.line("#16a34a", 0.04, [0, 0.46, 0, -0.05]); k.oval("#22c55e", -0.12, 0.22, 0.12, 0.05, 0.5); k.oval("#22c55e", 0.12, 0.12, 0.12, 0.05, -0.5);
      for (let i = 0; i < 14; i += 1) { const t = (i * TAU) / 14; k.oval(a, Math.cos(t) * 0.2, -0.2 + Math.sin(t) * 0.2, 0.08, 0.035, t); } k.oval(b, 0, -0.2, 0.14); k.oval("rgba(0,0,0,0.15)", 0, -0.2, 0.08); }); },
  mushroom(g, a, b) { const k = kit(g);
    k.rect("#fff4dc", -0.1, 0.02, 0.2, 0.4, 0.07, true); k.fill(a, () => { g.ellipse(0, 0.06, 0.36, 0.34, 0, Math.PI, 0); g.quadraticCurveTo(0, 0.14, -0.36, 0.06); });
    g.save(); g.beginPath(); g.ellipse(0, 0.06, 0.36, 0.34, 0, Math.PI, 0); g.clip(); for (const [x, y, r] of [[-0.18, -0.08, 0.06], [0.04, -0.18, 0.07], [0.22, -0.04, 0.05], [-0.02, 0.02, 0.04], [-0.3, 0.04, 0.04]]) k.oval(b, x, y, r); g.restore(); },
  cactus(g, a, b) { const k = kit(g);
    k.line(a, 0.1, [-0.14, 0.14, -0.26, 0.14, -0.26, -0.06]); k.line(a, 0.1, [0.14, 0.02, 0.26, 0.02, 0.26, -0.18]); k.rect(a, -0.11, -0.36, 0.22, 0.8, 0.11);
    for (const y of [-0.22, -0.06, 0.1, 0.26]) { k.line("rgba(255,255,255,0.5)", 0.01, [-0.04, y, -0.07, y - 0.03]); k.line("rgba(255,255,255,0.5)", 0.01, [0.05, y + 0.06, 0.08, y + 0.03]); }
    k.oval(b, 0, -0.38, 0.05); k.oval(b, -0.26, -0.11, 0.035); },
  sun(g, a, b, live) { const k = kit(g), t0 = live ? live.t * 0.4 : 0;
    for (let i = 0; i < 10; i += 1) { const t = t0 + (i * TAU) / 10; k.line(a, 0.05, [Math.cos(t) * 0.32, Math.sin(t) * 0.32, Math.cos(t) * 0.44, Math.sin(t) * 0.44]); }
    k.oval(a, 0, 0, 0.26); k.oval(D, -0.09, -0.04, 0.022); k.oval(D, 0.09, -0.04, 0.022); k.arc(D, 0.016, 0, 0.02, 0.1, Math.PI * 0.15, Math.PI * 0.85); k.oval(b, -0.15, 0.05, 0.04, 0.028); k.oval(b, 0.15, 0.05, 0.04, 0.028); },
  moon(g, a, b, live) { const k = kit(g);
    g.save(); g.beginPath(); g.rect(-0.6, -0.6, 1.2, 1.2); g.arc(0.14, -0.08, 0.3, 0, TAU); g.clip("evenodd"); k.oval(a, -0.06, 0, 0.36); g.restore(); // a crescent: a disc with a bite out of it
    for (const [x, y, r, o] of [[0.28, -0.24, 0.05, 0], [0.38, 0.06, 0.035, 2], [0.22, 0.26, 0.04, 4]]) { const q = r * (1 + beat(live, 0.9, o) * 0.25); k.star(b, x, y, q, 4, 0.4); } },
  star(g, a, b, live) { const k = kit(g), q = 1 + beat(live, 0.9) * 0.07;
    g.scale(q, q); k.star(a, 0, 0.02, 0.44); k.oval(D, -0.09, -0.02, 0.022); k.oval(D, 0.09, -0.02, 0.022); k.arc(D, 0.016, 0, 0.04, 0.08, Math.PI * 0.15, Math.PI * 0.85); k.oval(b, -0.15, 0.07, 0.035, 0.025); k.oval(b, 0.15, 0.07, 0.035, 0.025); },
  cloud(g, a, b) { const k = kit(g);
    k.fill(a, () => { g.moveTo(-0.3, 0.16); g.arc(-0.28, 0.04, 0.13, Math.PI * 0.5, Math.PI * 1.4); g.arc(-0.1, -0.08, 0.17, Math.PI * 1.1, Math.PI * 1.75); g.arc(0.14, -0.04, 0.16, Math.PI * 1.35, Math.PI * 1.95); g.arc(0.3, 0.06, 0.11, Math.PI * 1.5, Math.PI * 0.5); g.closePath(); }, b); },
  raincloud(g, a, b, live) { const k = kit(g);
    for (let i = 0; i < 5; i += 1) { const u = live ? (live.t * 1.2 + i * 0.37) % 1 : (i * 0.37) % 1, x = -0.26 + i * 0.13, y = 0.14 + u * 0.3; k.fill(b, () => { g.moveTo(x, y - 0.04); g.quadraticCurveTo(x + 0.04, y + 0.03, x, y + 0.04); g.quadraticCurveTo(x - 0.04, y + 0.03, x, y - 0.04); }); }
    k.fill(a, () => { g.moveTo(-0.3, 0.1); g.arc(-0.28, -0.02, 0.13, Math.PI * 0.5, Math.PI * 1.4); g.arc(-0.1, -0.14, 0.17, Math.PI * 1.1, Math.PI * 1.75); g.arc(0.14, -0.1, 0.16, Math.PI * 1.35, Math.PI * 1.95); g.arc(0.3, 0.0, 0.11, Math.PI * 1.5, Math.PI * 0.5); g.closePath(); }); },
  rainbow(g, a, b) { const k = kit(g);
    ["#ef4444", "#f97316", "#fde047", "#22c55e", "#3b82f6", "#8b5cf6"].forEach((c, i) => { g.lineCap = "butt"; g.strokeStyle = c; g.lineWidth = 0.052; g.beginPath(); g.arc(0, 0.28, 0.42 - i * 0.05, Math.PI, 0); g.stroke(); });
    for (const sx of [-1, 1]) { k.oval(a, sx * 0.3, 0.3, 0.11, 0.09, 0, b); k.oval(a, sx * 0.4, 0.32, 0.08, 0.07, 0, b); k.oval(a, sx * 0.2, 0.33, 0.08, 0.06, 0, b); k.oval(a, sx * 0.3, 0.32, 0.13, 0.06); } },
  snowflake(g, a, b, live) { const k = kit(g);
    g.rotate(live ? live.t * 0.5 : 0);
    for (let i = 0; i < 6; i += 1) { g.save(); g.rotate((i * TAU) / 6); k.line(a, 0.04, [0, 0, 0, -0.42]); k.line(a, 0.032, [0, -0.2, -0.1, -0.3]); k.line(a, 0.032, [0, -0.2, 0.1, -0.3]); k.line(a, 0.028, [0, -0.33, -0.06, -0.4]); k.line(a, 0.028, [0, -0.33, 0.06, -0.4]); g.restore(); }
    k.oval(b, 0, 0, 0.05); },
  mountain(g, a, b) { const k = kit(g);
    k.poly("rgba(0,0,0,0.12)", [0.02, 0.4, 0.48, 0.4, 0.26, -0.06]); k.poly(a, [-0.48, 0.4, 0.36, 0.4, -0.06, -0.4]); k.poly(a, [0.0, 0.4, 0.48, 0.4, 0.26, -0.06]);
    k.poly(b, [-0.06, -0.4, -0.2, -0.14, -0.11, -0.2, -0.05, -0.12, 0.02, -0.2, 0.08, -0.15], true); k.poly(b, [0.26, -0.06, 0.19, 0.08, 0.25, 0.04, 0.3, 0.1, 0.33, 0.07], true); },
  volcano(g, a, b, live) { const k = kit(g), f = 1 + beat(live, 2.4) * 0.15;
    k.puffs(live, 0.02, -0.26); k.poly("#f97316", [-0.1, -0.12, 0.1, -0.12, 0, -0.12 - 0.2 * f]); k.poly("#fde047", [-0.05, -0.12, 0.05, -0.12, 0, -0.12 - 0.11 * f]);
    k.poly(a, [-0.46, 0.4, -0.12, -0.14, 0.12, -0.14, 0.46, 0.4]);
    k.fill(b, () => { g.moveTo(-0.12, -0.14); g.lineTo(0.12, -0.14); g.lineTo(0.16, 0.0); g.quadraticCurveTo(0.12, 0.08, 0.08, -0.02); g.quadraticCurveTo(0.03, 0.2, -0.03, 0.02); g.quadraticCurveTo(-0.08, 0.14, -0.15, -0.02); g.closePath(); }); },
  rock(g, a, b) { const k = kit(g);
    k.fill(a, () => { g.moveTo(-0.42, 0.34); g.quadraticCurveTo(-0.44, 0.04, -0.2, -0.12); g.quadraticCurveTo(0.06, -0.28, 0.26, -0.08); g.quadraticCurveTo(0.46, 0.08, 0.42, 0.34); g.closePath(); });
    k.fill(b, () => { g.moveTo(-0.22, -0.04); g.quadraticCurveTo(-0.02, -0.18, 0.14, -0.08); g.quadraticCurveTo(0.0, -0.08, -0.14, 0.04); g.closePath(); }); k.line("rgba(0,0,0,0.2)", 0.012, [0.1, 0.1, 0.22, 0.2, 0.2, 0.3]); },
  leaf(g, a, b, live) { const k = kit(g);
    g.rotate(beat(live, 0.7) * 0.2); k.line(b, 0.03, [-0.4, 0.34, -0.26, 0.2]);
    k.fill(a, () => { g.moveTo(-0.3, 0.24); g.quadraticCurveTo(-0.34, -0.3, 0.38, -0.36); g.quadraticCurveTo(0.34, 0.34, -0.3, 0.24); });
    k.line(b, 0.016, [-0.3, 0.24, 0.36, -0.34]); for (const u of [0.25, 0.5, 0.75]) { const x = -0.3 + 0.66 * u, y = 0.24 - 0.58 * u; k.line(b, 0.012, [x, y, x + 0.03, y - 0.14]); k.line(b, 0.012, [x, y, x + 0.15, y + 0.01]); } },
  fire(g, a, b, live) { const k = kit(g), f = beat(live, 3) * 0.05, f2 = beat(live, 4.3, 1) * 0.04;
    k.line(WOOD, 0.06, [-0.26, 0.4, 0.24, 0.3]); k.line("#7a4a12", 0.06, [-0.24, 0.3, 0.26, 0.4]);
    k.fill(a, () => { g.moveTo(-0.22, 0.3); g.quadraticCurveTo(-0.34, 0.02, -0.12 + f, -0.14); g.quadraticCurveTo(-0.1, 0.0, -0.02, -0.06); g.quadraticCurveTo(-0.08, -0.3, 0.06 + f2, -0.44 - f); g.quadraticCurveTo(0.08, -0.2, 0.2, -0.12); g.quadraticCurveTo(0.34, 0.08, 0.22, 0.3); g.closePath(); });
    k.fill(b, () => { g.moveTo(-0.12, 0.3); g.quadraticCurveTo(-0.2, 0.12, -0.04, 0.0); g.quadraticCurveTo(0.0, -0.12, 0.04 + f2, -0.2); g.quadraticCurveTo(0.2, 0.1, 0.12, 0.3); g.closePath(); }); },
  lightning(g, a, b, live) { const k = kit(g);
    g.globalAlpha = live ? (Math.abs(beat(live, 1.7)) > 0.5 ? 1 : 0.25) : 1; k.poly(a, [0.04, 0.0, -0.16, 0.26, -0.03, 0.26, -0.12, 0.48, 0.16, 0.18, 0.03, 0.18, 0.14, 0.0]); g.globalAlpha = 1;
    k.fill(b, () => { g.moveTo(-0.3, 0.06); g.arc(-0.28, -0.06, 0.13, Math.PI * 0.5, Math.PI * 1.4); g.arc(-0.1, -0.18, 0.17, Math.PI * 1.1, Math.PI * 1.75); g.arc(0.14, -0.14, 0.16, Math.PI * 1.35, Math.PI * 1.95); g.arc(0.3, -0.04, 0.11, Math.PI * 1.5, Math.PI * 0.5); g.closePath(); }); },
};

const THING = {
  house(g, a, b, live) { const k = kit(g);
    k.rect("#7a4a12", 0.16, -0.36, 0.09, 0.2); k.puffs(live, 0.2, -0.4);
    k.rect(a, -0.32, -0.06, 0.64, 0.48); k.poly(b, [-0.42, -0.04, 0, -0.42, 0.42, -0.04]);
    k.rect(WOOD, -0.07, 0.16, 0.14, 0.26, 0.02); k.oval("#fde047", 0.04, 0.3, 0.014); for (const x of [-0.25, 0.12]) { k.rect(GLASS, x, 0.02, 0.13, 0.13, 0.01); k.line("#ffffff", 0.012, [x + 0.065, 0.02, x + 0.065, 0.15]); k.line("#ffffff", 0.012, [x, 0.085, x + 0.13, 0.085]); } },
  castle(g, a, b, live) { const k = kit(g), w = beat(live, 1.5) * 0.02;
    k.line(D, 0.014, [0, -0.3, 0, -0.46]); k.poly(b, [0, -0.46, 0.14, -0.42 + w, 0, -0.37]);
    for (const x of [-0.42, 0.26]) { k.rect(a, x, -0.2, 0.16, 0.62); for (let i = 0; i < 3; i += 1) k.rect(a, x - 0.01 + i * 0.065, -0.27, 0.045, 0.08); k.rect(D, x + 0.055, -0.08, 0.05, 0.1, 0.02); }
    k.rect(a, -0.28, 0.0, 0.56, 0.42); for (let i = 0; i < 5; i += 1) k.rect(a, -0.28 + i * 0.128, -0.07, 0.07, 0.08); k.rect(a, -0.1, -0.3, 0.2, 0.32); for (let i = 0; i < 3; i += 1) k.rect(a, -0.11 + i * 0.085, -0.36, 0.05, 0.07);
    k.fill(WOOD, () => { g.moveTo(-0.09, 0.42); g.lineTo(-0.09, 0.2); g.arc(0, 0.2, 0.09, Math.PI, 0); g.lineTo(0.09, 0.42); }); k.rect(D, -0.025, -0.2, 0.05, 0.1, 0.02); },
  tent(g, a, b) { const k = kit(g);
    k.poly(a, [-0.44, 0.38, 0, -0.34, 0.44, 0.38]); k.poly(b, [-0.13, 0.38, 0, -0.02, 0.13, 0.38]); k.line("rgba(0,0,0,0.2)", 0.012, [0, -0.34, 0, -0.02]); k.line(WOOD, 0.02, [0, -0.34, 0, -0.42]); k.line("#6b7280", 0.012, [-0.44, 0.38, -0.5, 0.42]); k.line("#6b7280", 0.012, [0.44, 0.38, 0.5, 0.42]); },
  igloo(g, a, b) { const k = kit(g);
    k.fill(a, () => { g.arc(-0.04, 0.36, 0.38, Math.PI, 0); g.closePath(); }, b); k.rect(a, 0.14, 0.12, 0.3, 0.24, 0.03, b); k.fill(D, () => { g.arc(0.3, 0.36, 0.09, Math.PI, 0); g.closePath(); });
    g.save(); g.beginPath(); g.arc(-0.04, 0.36, 0.38, Math.PI, 0); g.clip(); for (const y of [0.24, 0.12, 0.0]) k.line(b, 0.012, [-0.44, y, 0.36, y]); for (const [x, y0] of [[-0.3, 0.24], [-0.12, 0.24], [0.04, 0.24], [-0.22, 0.12], [-0.04, 0.12], [-0.14, 0.0], [0.02, 0.0]]) k.line(b, 0.012, [x, y0, x, y0 + 0.12]); g.restore(); },
  lighthouse(g, a, b, live) { const k = kit(g);
    if (live) { g.globalAlpha = 0.25 + 0.3 * Math.abs(beat(live, 0.5)); k.poly("#fde047", [0.06, -0.32, 0.5, -0.46, 0.5, -0.14]); g.globalAlpha = 1; }
    k.poly(a, [-0.16, 0.42, -0.1, -0.22, 0.1, -0.22, 0.16, 0.42]); g.save(); g.beginPath(); g.moveTo(-0.16, 0.42); g.lineTo(-0.1, -0.22); g.lineTo(0.1, -0.22); g.lineTo(0.16, 0.42); g.clip(); k.rect(b, -0.2, -0.08, 0.4, 0.14); k.rect(b, -0.2, 0.2, 0.4, 0.14); g.restore();
    k.rect(D, -0.13, -0.25, 0.26, 0.04); k.rect("#fde047", -0.08, -0.38, 0.16, 0.13); k.poly(b, [-0.11, -0.38, 0, -0.48, 0.11, -0.38]); k.rect(D, -0.03, 0.3, 0.06, 0.12, 0.02); },
  windmill(g, a, b, live) { const k = kit(g), t0 = live ? live.t * 1.6 : 0.4;
    k.poly(a, [-0.17, 0.44, -0.1, -0.16, 0.1, -0.16, 0.17, 0.44], true); k.poly("#7a4a12", [-0.13, -0.16, 0, -0.32, 0.13, -0.16]); k.rect(WOOD, -0.04, 0.26, 0.08, 0.18, 0.02); k.rect(GLASS, -0.035, 0.0, 0.07, 0.09);
    for (let i = 0; i < 4; i += 1) { g.save(); g.translate(0, -0.16); g.rotate(t0 + (i * Math.PI) / 2); k.line(WOOD, 0.02, [0, 0, 0, -0.38]); k.rect(b, 0.01, -0.38, 0.1, 0.26, 0, "#7a4a12"); g.restore(); } k.oval(D, 0, -0.16, 0.03); },
  fence(g, a, b) { const k = kit(g);
    k.rect(b, -0.48, -0.02, 0.96, 0.06); k.rect(b, -0.48, 0.2, 0.96, 0.06); for (let i = 0; i < 6; i += 1) { const x = -0.44 + i * 0.165; k.poly(a, [x, 0.4, x, -0.14, x + 0.035, -0.22, x + 0.07, -0.14, x + 0.07, 0.4], true); } },
  signpost(g, a, b) { const k = kit(g);
    k.rect(WOOD, -0.03, -0.3, 0.06, 0.76, 0.01); k.poly(a, [-0.3, -0.34, 0.26, -0.34, 0.38, -0.25, 0.26, -0.16, -0.3, -0.16]); k.poly(b, [0.3, -0.08, -0.26, -0.08, -0.38, 0.01, -0.26, 0.1, 0.3, 0.1]);
    k.line("rgba(255,255,255,0.75)", 0.02, [-0.2, -0.25, 0.18, -0.25]); k.line("rgba(255,255,255,0.75)", 0.02, [-0.18, 0.01, 0.2, 0.01]); },
  trafficlight(g, a, b, live) { const k = kit(g), on = live ? Math.floor(live.t / 1.2) % 3 : 2;
    k.rect("#6b7280", -0.025, 0.14, 0.05, 0.32); k.rect(a, -0.13, -0.46, 0.26, 0.62, 0.05);
    ["#ef4444", "#fbbf24", "#22c55e"].forEach((c, i) => { k.oval("#111827", 0, -0.33 + i * 0.18, 0.075); g.globalAlpha = on === i ? 1 : 0.22; k.oval(c, 0, -0.33 + i * 0.18, 0.062); g.globalAlpha = 1; }); k.rect(b, -0.12, 0.44, 0.24, 0.04, 0.01); },
  ball(g, a, b, live) { const k = kit(g);
    g.rotate(roll(live) * 0.4); k.oval(a, 0, 0, 0.4); g.save(); g.beginPath(); g.arc(0, 0, 0.4, 0, TAU); g.clip(); k.oval(b, -0.3, -0.3, 0.3); k.oval(b, 0.36, 0.32, 0.26); g.restore(); k.oval("rgba(255,255,255,0.5)", -0.14, -0.18, 0.07, 0.045, -0.6); },
  football(g, a, b, live) { const k = kit(g);
    g.rotate(roll(live) * 0.4); k.oval(a, 0, 0, 0.4, 0.4, 0, "#9ca3af"); k.star(b, 0, 0, 0.13, 5, 0.81);
    for (let i = 0; i < 5; i += 1) { const t = -Math.PI / 2 + (i * TAU) / 5; k.line(b, 0.02, [Math.cos(t) * 0.13, Math.sin(t) * 0.13, Math.cos(t) * 0.27, Math.sin(t) * 0.27]); g.save(); g.beginPath(); g.arc(0, 0, 0.4, 0, TAU); g.clip(); k.star(b, Math.cos(t) * 0.4, Math.sin(t) * 0.4, 0.13, 5, 0.81, t); g.restore(); } },
  beachball(g, a, b, live) { const k = kit(g);
    g.rotate(roll(live) * 0.4); k.oval("#ffffff", 0, 0, 0.4, 0.4, 0, true);
    for (let i = 0; i < 6; i += 1) if (i % 2 === 0) { const c = i % 4 === 0 ? a : b; k.fill(c, () => { g.moveTo(0, 0); g.arc(0, 0, 0.4, (i * TAU) / 6, ((i + 1) * TAU) / 6); g.closePath(); }); } k.oval("#ffffff", 0, 0, 0.07, 0.07, 0, true); },
  balloon(g, a, b, live) { const k = kit(g), s = beat(live, 0.6) * 0.05;
    g.rotate(s); k.curve("#6b7280", 0.012, [0, 0.12], [0.06, 0.28], [-0.02 - s, 0.46]);
    k.oval(a, 0, -0.14, 0.26, 0.31); k.poly(a, [0, 0.16, -0.04, 0.22, 0.04, 0.22]); k.oval("rgba(255,255,255,0.5)", -0.1, -0.26, 0.05, 0.08, 0.5); k.oval(b, 0.1, -0.02, 0.03); },
  kite(g, a, b, live) { const k = kit(g), s = beat(live, 0.8);
    g.rotate(s * 0.08);
    g.strokeStyle = "#6b7280"; g.lineWidth = 0.012; g.beginPath(); g.moveTo(0.02, 0.12); g.bezierCurveTo(0.14 + s * 0.05, 0.2, -0.1 - s * 0.05, 0.3, 0.06 + s * 0.04, 0.46); g.stroke();
    for (const [x, y] of [[0.07, 0.2], [-0.02, 0.31], [0.04, 0.4]]) k.poly(b, [x - 0.04, y - 0.025, x + 0.04, y + 0.025, x + 0.04, y - 0.025, x - 0.04, y + 0.025]);
    k.poly(a, [0, -0.46, 0.26, -0.16, 0.02, 0.12, -0.26, -0.16]); k.poly(b, [0, -0.46, 0.26, -0.16, 0, -0.16]); k.poly(b, [-0.26, -0.16, 0.02, 0.12, 0, -0.16]); k.line("rgba(0,0,0,0.25)", 0.012, [0, -0.46, 0.02, 0.12]); k.line("rgba(0,0,0,0.25)", 0.012, [-0.26, -0.16, 0.26, -0.16]); },
  present(g, a, b) { const k = kit(g);
    k.rect(a, -0.32, -0.08, 0.64, 0.5, 0.02); k.rect(a, -0.36, -0.2, 0.72, 0.14, 0.02); k.rect("rgba(0,0,0,0.12)", -0.32, -0.06, 0.64, 0.03);
    k.rect(b, -0.05, -0.2, 0.1, 0.62); k.fill(b, () => { g.moveTo(0, -0.2); g.bezierCurveTo(-0.3, -0.46, -0.34, -0.14, 0, -0.2); g.bezierCurveTo(0.3, -0.46, 0.34, -0.14, 0, -0.2); }); k.oval(b, 0, -0.21, 0.04); },
  cake(g, a, b, live) { const k = kit(g);
    for (const x of [-0.16, 0, 0.16]) { k.rect("#7dd3fc", x - 0.018, -0.3, 0.036, 0.14); const f = 1 + beat(live, 4, x * 20) * 0.2; k.fill("#f97316", () => { g.moveTo(x, -0.3 - 0.1 * f); g.quadraticCurveTo(x + 0.04, -0.32, x, -0.3); g.quadraticCurveTo(x - 0.04, -0.32, x, -0.3 - 0.1 * f); }); }
    k.rect(a, -0.34, -0.16, 0.68, 0.5, 0.04); k.fill(b, () => { g.moveTo(-0.34, -0.12); g.arcTo(-0.34, -0.16, -0.3, -0.16, 0.04); g.lineTo(0.3, -0.16); g.arcTo(0.34, -0.16, 0.34, -0.12, 0.04); g.lineTo(0.34, 0.0); for (let i = 0; i < 4; i += 1) g.quadraticCurveTo(0.255 - i * 0.17, 0.12, 0.17 - i * 0.17, 0.0); g.closePath(); });
    k.rect("#e5e7eb", -0.42, 0.34, 0.84, 0.05, 0.02); for (const x of [-0.22, -0.07, 0.08, 0.23]) k.oval("#ef4444", x, 0.2, 0.025); },
  cupcake(g, a, b) { const k = kit(g);
    k.poly(b, [-0.24, 0.02, 0.24, 0.02, 0.17, 0.4, -0.17, 0.4]); for (const x of [-0.12, 0, 0.12]) k.line("rgba(0,0,0,0.15)", 0.014, [x * 1.25, 0.04, x, 0.4]);
    k.oval(a, 0, 0.0, 0.3, 0.12); k.oval(a, 0, -0.12, 0.23, 0.11); k.oval(a, 0, -0.23, 0.15, 0.09); k.oval(a, 0, -0.32, 0.07, 0.06); k.oval("#ef4444", 0, -0.39, 0.05); for (const [x, y, c] of [[-0.16, -0.02, "#fde047"], [0.1, -0.1, "#7dd3fc"], [-0.04, -0.2, "#ffffff"], [0.18, 0.02, "#ffffff"]]) k.oval(c, x, y, 0.018); },
  icecream(g, a, b) { const k = kit(g);
    k.poly("#e2b653", [-0.2, -0.02, 0.2, -0.02, 0, 0.46]); g.save(); g.beginPath(); g.moveTo(-0.2, -0.02); g.lineTo(0.2, -0.02); g.lineTo(0, 0.46); g.clip(); for (let i = -3; i < 4; i += 1) { k.line("#b98a2c", 0.012, [i * 0.09 - 0.2, -0.02, i * 0.09 + 0.2, 0.46]); k.line("#b98a2c", 0.012, [i * 0.09 + 0.2, -0.02, i * 0.09 - 0.2, 0.46]); } g.restore();
    k.oval(a, 0, -0.1, 0.23, 0.2); k.oval(b, 0, -0.3, 0.18, 0.16); k.oval("#ef4444", 0.02, -0.46, 0.045); k.oval("rgba(255,255,255,0.4)", -0.08, -0.34, 0.04, 0.03); },
  lollipop(g, a, b, live) { const k = kit(g);
    k.rect("#f5f5f4", -0.02, 0.04, 0.04, 0.42, 0.01, true); k.oval(a, 0, -0.16, 0.28); g.strokeStyle = b; g.lineWidth = 0.05; g.lineCap = "round"; g.beginPath(); const t0 = live ? live.t * 1.5 : 0; for (let i = 0; i <= 50; i += 1) { const t = t0 + (i / 50) * TAU * 2.2, r = 0.01 + i * 0.0048; const x = Math.cos(t) * r, y = -0.16 + Math.sin(t) * r; if (i) g.lineTo(x, y); else g.moveTo(x, y); } g.stroke(); },
  apple(g, a, b) { const k = kit(g);
    k.line(WOOD, 0.03, [0.0, -0.22, 0.04, -0.38]); k.oval(b, 0.14, -0.32, 0.11, 0.05, -0.4);
    k.fill(a, () => { g.moveTo(0, -0.2); g.bezierCurveTo(0.3, -0.42, 0.52, 0.02, 0.24, 0.36); g.quadraticCurveTo(0.1, 0.46, 0, 0.38); g.quadraticCurveTo(-0.1, 0.46, -0.24, 0.36); g.bezierCurveTo(-0.52, 0.02, -0.3, -0.42, 0, -0.2); }); k.oval("rgba(255,255,255,0.4)", -0.18, -0.08, 0.05, 0.09, 0.5); },
  banana(g, a, b) { const k = kit(g);
    k.fill(a, () => { g.moveTo(-0.4, -0.2); g.quadraticCurveTo(-0.2, 0.36, 0.36, 0.1); g.lineTo(0.42, 0.02); g.quadraticCurveTo(-0.04, 0.14, -0.32, -0.26); g.closePath(); }); k.curve("rgba(0,0,0,0.12)", 0.014, [-0.34, -0.16], [-0.12, 0.2], [0.36, 0.08]); k.oval(b, -0.36, -0.24, 0.04); k.oval(b, 0.4, 0.05, 0.03); },
  carrot(g, a, b) { const k = kit(g);
    for (const [x, y] of [[-0.42, -0.28], [-0.32, -0.42], [-0.18, -0.4]]) k.curve(b, 0.05, [-0.2, -0.2], [(x - 0.2) / 2 - 0.02, (y - 0.2) / 2], [x, y]);
    k.fill(a, () => { g.moveTo(-0.3, -0.14); g.quadraticCurveTo(-0.14, -0.34, -0.06, -0.24); g.lineTo(0.42, 0.42); g.closePath(); }); for (const u of [0.25, 0.45, 0.65]) k.line("rgba(0,0,0,0.18)", 0.014, [-0.2 + u * 0.6, -0.16 + u * 0.56, -0.1 + u * 0.6, -0.14 + u * 0.56]); },
  pizza(g, a, b) { const k = kit(g);
    k.poly(a, [-0.38, -0.34, 0.4, -0.2, -0.06, 0.44]); k.fill("#d6a15c", () => { g.moveTo(-0.4, -0.38); g.quadraticCurveTo(0.04, -0.4, 0.44, -0.2); g.lineTo(0.38, -0.12); g.quadraticCurveTo(0.02, -0.3, -0.36, -0.28); g.closePath(); });
    for (const [x, y] of [[-0.18, -0.16], [0.14, -0.1], [-0.04, 0.08], [-0.08, 0.26]]) k.oval(b, x, y, 0.06); for (const [x, y] of [[0.0, -0.18], [-0.16, 0.04], [0.08, 0.06]]) k.oval("#16a34a", x, y, 0.022); },
  crown(g, a, b) { const k = kit(g);
    k.poly(a, [-0.38, 0.26, -0.42, -0.22, -0.2, 0.0, 0, -0.34, 0.2, 0.0, 0.42, -0.22, 0.38, 0.26]); k.rect(a, -0.38, 0.2, 0.76, 0.1, 0.02); k.rect("rgba(0,0,0,0.12)", -0.38, 0.2, 0.76, 0.025);
    k.oval(b, 0, 0.1, 0.05); k.oval(b, -0.22, 0.12, 0.035); k.oval(b, 0.22, 0.12, 0.035); for (const [x, y] of [[-0.42, -0.22], [0, -0.34], [0.42, -0.22]]) k.oval(a, x, y, 0.04); },
  book(g, a, b) { const k = kit(g);
    k.rect(a, -0.3, -0.38, 0.6, 0.76, 0.03); k.rect("rgba(0,0,0,0.18)", -0.3, -0.38, 0.08, 0.76, 0.02); k.rect("#fffdf6", -0.2, 0.3, 0.48, 0.05); k.rect(b, -0.12, -0.22, 0.32, 0.2, 0.02); k.line("rgba(255,255,255,0.8)", 0.02, [-0.08, 0.1, 0.16, 0.1]); k.line("rgba(255,255,255,0.8)", 0.02, [-0.08, 0.17, 0.08, 0.17]); },
  pencil(g, a, b) { const k = kit(g);
    g.rotate(-0.7); k.rect(a, -0.3, -0.07, 0.5, 0.14); k.rect("rgba(0,0,0,0.12)", -0.3, 0.02, 0.5, 0.05); k.poly("#f1d9b0", [0.2, -0.07, 0.4, 0, 0.2, 0.07]); k.poly(D, [0.34, -0.02, 0.4, 0, 0.34, 0.02]); k.rect("#9ca3af", -0.36, -0.07, 0.06, 0.14); k.rect(b, -0.44, -0.07, 0.09, 0.14, 0.03); },
  lightbulb(g, a, b, live) { const k = kit(g);
    if (live) { g.globalAlpha = 0.25 + 0.2 * beat(live, 0.8); k.oval(a, 0, -0.1, 0.4); g.globalAlpha = 1; }
    k.fill(a, () => { g.arc(0, -0.12, 0.27, Math.PI * 0.75, Math.PI * 0.25); g.quadraticCurveTo(0.12, 0.14, 0.11, 0.24); g.lineTo(-0.11, 0.24); g.quadraticCurveTo(-0.12, 0.14, -0.19, 0.07); }, "#d1a514");
    k.line("#b45309", 0.014, [-0.06, 0.22, -0.08, 0.02, 0, 0.1, 0.08, 0.02, 0.06, 0.22]); k.rect(b, -0.11, 0.24, 0.22, 0.15, 0.02); k.line("rgba(0,0,0,0.25)", 0.012, [-0.11, 0.29, 0.11, 0.29]); k.line("rgba(0,0,0,0.25)", 0.012, [-0.11, 0.34, 0.11, 0.34]); k.oval(D, 0, 0.41, 0.06, 0.035); },
  clock(g, a, b, live) { const k = kit(g), t = live ? live.t : 0;
    k.oval(a, 0, 0, 0.42); k.oval("#fffdf6", 0, 0, 0.34); for (let i = 0; i < 12; i += 1) { const q = (i * TAU) / 12; k.line(D, i % 3 ? 0.012 : 0.024, [Math.cos(q) * 0.27, Math.sin(q) * 0.27, Math.cos(q) * 0.31, Math.sin(q) * 0.31]); }
    const h = -Math.PI / 2 + 1.0 + t * 0.1, m = -Math.PI / 2 + t * 1.2; k.line(D, 0.035, [0, 0, Math.cos(h) * 0.16, Math.sin(h) * 0.16]); k.line(D, 0.024, [0, 0, Math.cos(m) * 0.25, Math.sin(m) * 0.25]); k.oval(b, 0, 0, 0.035); },
  key(g, a, b) { const k = kit(g);
    g.rotate(-0.5); k.arc(a, 0.07, -0.26, 0, 0.13, 0, TAU); k.line(a, 0.065, [-0.12, 0, 0.42, 0]); k.line(a, 0.06, [0.28, 0, 0.28, 0.13]); k.line(a, 0.06, [0.4, 0, 0.4, 0.1]); k.oval(b, -0.26, -0.13, 0.03); },
  heart(g, a, b, live) { const k = kit(g), q = 1 + Math.max(0, beat(live, 1.2)) * 0.1;
    g.scale(q, q); k.fill(a, () => { g.moveTo(0, 0.4); g.bezierCurveTo(-0.6, 0.02, -0.4, -0.46, 0, -0.16); g.bezierCurveTo(0.4, -0.46, 0.6, 0.02, 0, 0.4); }); k.oval(b, -0.2, -0.12, 0.05, 0.08, 0.6); },
  gem(g, a, b, live) { const k = kit(g);
    k.poly(a, [-0.42, -0.1, -0.22, -0.34, 0.22, -0.34, 0.42, -0.1, 0, 0.42]); k.poly(b, [-0.42, -0.1, -0.22, -0.34, -0.1, -0.1]); k.poly(b, [0.1, -0.1, 0.22, -0.34, 0.42, -0.1]); k.poly("rgba(255,255,255,0.3)", [-0.1, -0.1, 0, -0.34, 0.1, -0.1]); k.poly("rgba(0,0,0,0.12)", [0.1, -0.1, 0.42, -0.1, 0, 0.42]);
    if (live) { g.globalAlpha = Math.abs(beat(live, 0.9)); k.star("#ffffff", 0.24, -0.26, 0.09, 4, 0.3); g.globalAlpha = 1; } },
  bell(g, a, b, live) { const k = kit(g);
    g.translate(0, -0.34); g.rotate(beat(live, 1.6) * 0.18); g.translate(0, 0.34);
    k.arc(a, 0.035, 0, -0.36, 0.05, 0, TAU); k.oval(b, beat(live, 1.6) * -0.06, 0.32, 0.06);
    k.fill(a, () => { g.moveTo(-0.36, 0.26); g.quadraticCurveTo(-0.22, 0.14, -0.22, -0.08); g.quadraticCurveTo(-0.2, -0.32, 0, -0.32); g.quadraticCurveTo(0.2, -0.32, 0.22, -0.08); g.quadraticCurveTo(0.22, 0.14, 0.36, 0.26); g.closePath(); }); k.rect("rgba(0,0,0,0.14)", -0.34, 0.2, 0.68, 0.06, 0.03); k.oval("rgba(255,255,255,0.4)", -0.1, -0.14, 0.035, 0.1, 0.2); },
  drum(g, a, b, live) { const k = kit(g), hit = beat(live, 2);
    k.rect(a, -0.34, -0.06, 0.68, 0.38); k.oval(a, 0, 0.32, 0.34, 0.1); for (let i = 0; i < 5; i += 1) { const x = -0.33 + i * 0.132; k.line(b, 0.016, [x, -0.02, x + 0.066, 0.36, x + 0.132, -0.02]); }
    k.oval("#fff4dc", 0, -0.06, 0.34, 0.1, 0, "#d6b38a");
    k.about(-0.3, -0.3, Math.max(0, hit) * 0.35, () => { k.line(WOOD, 0.025, [-0.42, -0.42, -0.12, -0.14]); k.oval(WOOD, -0.11, -0.13, 0.035); }); k.about(0.3, -0.3, Math.max(0, -hit) * -0.35, () => { k.line(WOOD, 0.025, [0.42, -0.42, 0.12, -0.14]); k.oval(WOOD, 0.11, -0.13, 0.035); }); },
  guitar(g, a, b) { const k = kit(g);
    g.rotate(0.6); k.rect(WOOD, -0.035, -0.46, 0.07, 0.5); k.rect(D, -0.06, -0.5, 0.12, 0.1, 0.02); k.oval(a, 0, 0.26, 0.21, 0.19); k.oval(a, 0, 0.04, 0.16, 0.14); k.oval(D, 0, 0.14, 0.07); k.rect(b, -0.08, 0.3, 0.16, 0.035, 0.01);
    for (const x of [-0.018, 0, 0.018]) k.line("rgba(255,255,255,0.75)", 0.006, [x, -0.44, x, 0.31]); },
  trophy(g, a, b) { const k = kit(g);
    k.arc(a, 0.045, -0.24, -0.2, 0.11, Math.PI * 0.5, Math.PI * 1.5); k.arc(a, 0.045, 0.24, -0.2, 0.11, Math.PI * 1.5, Math.PI * 0.5);
    k.fill(a, () => { g.moveTo(-0.24, -0.4); g.lineTo(0.24, -0.4); g.quadraticCurveTo(0.24, 0.06, 0, 0.08); g.quadraticCurveTo(-0.24, 0.06, -0.24, -0.4); }); k.rect(a, -0.035, 0.06, 0.07, 0.16); k.rect(b, -0.2, 0.22, 0.4, 0.18, 0.02); k.rect("#fde047", -0.1, 0.27, 0.2, 0.07, 0.01); k.star("rgba(255,255,255,0.7)", 0, -0.2, 0.1); },
  umbrella(g, a, b) { const k = kit(g);
    k.line(WOOD, 0.03, [0, -0.3, 0, 0.34]); k.arc(WOOD, 0.03, 0.07, 0.34, 0.07, 0, Math.PI); k.line(WOOD, 0.02, [0, -0.36, 0, -0.44]);
    k.fill(a, () => { g.arc(0, -0.02, 0.44, Math.PI, 0); for (let i = 0; i < 4; i += 1) g.quadraticCurveTo(0.33 - i * 0.22, -0.12, 0.22 - i * 0.22, -0.02); g.closePath(); });
    g.save(); g.beginPath(); g.arc(0, -0.02, 0.44, Math.PI, 0); g.clip(); k.fill(b, () => { g.moveTo(0, -0.46); g.quadraticCurveTo(-0.2, -0.3, -0.22, -0.02); g.quadraticCurveTo(-0.11, -0.12, 0, -0.02); g.quadraticCurveTo(0.11, -0.12, 0.22, -0.02); g.quadraticCurveTo(0.2, -0.3, 0, -0.46); }); g.restore(); },
  chair(g, a, b) { const k = kit(g);
    k.rect(a, -0.24, -0.44, 0.07, 0.88, 0.02); k.rect(a, 0.17, 0.0, 0.07, 0.44, 0.02); k.rect(a, -0.24, -0.4, 0.34, 0.07, 0.02); k.rect(a, -0.24, -0.26, 0.34, 0.06, 0.02); k.rect(a, 0.03, -0.44, 0.07, 0.48, 0.02); k.rect(b, -0.28, -0.02, 0.56, 0.1, 0.03); k.rect(a, -0.2, 0.26, 0.4, 0.05); },
  table(g, a, b) { const k = kit(g);
    k.rect(a, -0.36, -0.06, 0.08, 0.5, 0.02); k.rect(a, 0.28, -0.06, 0.08, 0.5, 0.02); k.rect(a, -0.3, 0.08, 0.6, 0.05); k.rect(b, -0.46, -0.16, 0.92, 0.11, 0.03); k.rect("rgba(0,0,0,0.12)", -0.46, -0.08, 0.92, 0.03); },
  chest(g, a, b, live) { const k = kit(g);
    k.rect(a, -0.38, 0.0, 0.76, 0.4, 0.03); k.fill(a, () => { g.moveTo(-0.38, 0.0); g.lineTo(-0.38, -0.12); g.quadraticCurveTo(-0.38, -0.32, 0, -0.32); g.quadraticCurveTo(0.38, -0.32, 0.38, -0.12); g.lineTo(0.38, 0.0); g.closePath(); });
    for (const x of [-0.26, 0.2]) k.rect(b, x, -0.3, 0.06, 0.7); k.rect(b, -0.38, -0.03, 0.76, 0.06); k.rect(b, -0.06, -0.08, 0.12, 0.16, 0.02); k.oval(D, 0, -0.01, 0.025); k.rect(D, -0.008, 0.0, 0.016, 0.05);
    if (live) { g.globalAlpha = Math.abs(beat(live, 0.9)); k.star("#fde047", 0.3, -0.34, 0.07, 4, 0.3); g.globalAlpha = Math.abs(beat(live, 0.9, 1.5)); k.star("#fde047", -0.3, -0.3, 0.05, 4, 0.3); g.globalAlpha = 1; } },
  flag(g, a, b, live) { const k = kit(g), f = beat(live, 1.3) * 0.04; // a pennant, not any country's flag
    k.rect("#6b7280", -0.34, -0.44, 0.04, 0.9, 0.01); k.oval("#fde047", -0.32, -0.45, 0.035); k.rect(WOOD, -0.42, 0.42, 0.2, 0.04, 0.01);
    k.fill(a, () => { g.moveTo(-0.3, -0.4); g.quadraticCurveTo(0.06, -0.34 + f, 0.44, -0.2 - f); g.quadraticCurveTo(0.06, -0.1 + f, -0.3, 0.0); g.closePath(); });
    k.fill(b, () => { g.moveTo(-0.3, -0.4); g.quadraticCurveTo(-0.2, -0.385 + f * 0.3, -0.1, -0.365 + f * 0.5); g.lineTo(-0.1, -0.04 + f * 0.5); g.quadraticCurveTo(-0.2, -0.02, -0.3, 0.0); g.closePath(); }); },
};

const make = (set, drawers, list) => list.map(([id, name, top, bot]) => ({ id: `thing-${id}`, name, custom: "thing", set, top, bot, draw: drawers[id] }));
export const THINGS = [
  ...make("go", GO, [["car", "Car", "#ef4444", "#fde047"], ["bus", "Bus", "#fbbf24", "#1f2937"], ["truck", "Lorry", "#3b82f6", "#e5e7eb"], ["fireengine", "Fire engine", "#dc2626", "#e5e7eb"], ["tractor", "Tractor", "#16a34a", "#fde047"], ["train", "Train", "#2563eb", "#dc2626"], ["bicycle", "Bicycle", "#ef4444", "#1f2937"], ["scooter", "Scooter", "#8b5cf6", "#1f2937"], ["motorbike", "Motorbike", "#f97316", "#1f2937"], ["skateboard", "Skateboard", "#22c55e", "#fde047"], ["plane", "Aeroplane", "#f1f5f9", "#ef4444"], ["helicopter", "Helicopter", "#f97316", "#1f2937"], ["rocket", "Rocket", "#f1f5f9", "#ef4444"], ["hotair", "Hot-air balloon", "#ef4444", "#fde047"], ["sailboat", "Sailing boat", "#2563eb", "#ef4444"], ["ship", "Ship", "#1e3a8a", "#ef4444"], ["submarine", "Submarine", "#fbbf24", "#f97316"], ["ufo", "Flying saucer", "#9ca3af", "#fde047"]]),
  ...make("nature", NATURE, [["tree", "Tree", "#22c55e", "#8b5a2b"], ["pine", "Pine tree", "#15803d", "#8b5a2b"], ["palm", "Palm tree", "#22c55e", "#b08968"], ["fruittree", "Fruit tree", "#22c55e", "#ef4444"], ["bush", "Bush", "#16a34a", "#ef4444"], ["flower", "Flower", "#f472b6", "#fde047"], ["tulip", "Tulip", "#ef4444", "#b91c1c"], ["sunflower", "Sunflower", "#fde047", "#7a4a12"], ["mushroom", "Mushroom", "#ef4444", "#ffffff"], ["cactus", "Cactus", "#22c55e", "#f472b6"], ["sun", "Sun", "#fbbf24", "#fb923c"], ["moon", "Moon", "#fde68a", "#fbbf24"], ["star", "Star", "#fde047", "#fb923c"], ["cloud", "Cloud", "#ffffff", "#b6c2d1"], ["raincloud", "Rain cloud", "#9ca3af", "#3b82f6"], ["rainbow", "Rainbow", "#ffffff", "#b6c2d1"], ["snowflake", "Snowflake", "#7dd3fc", "#e0f2fe"], ["mountain", "Mountain", "#6b7280", "#ffffff"], ["volcano", "Volcano", "#7a5230", "#f97316"], ["rock", "Rock", "#9ca3af", "#d1d5db"], ["leaf", "Leaf", "#22c55e", "#15803d"], ["fire", "Campfire", "#f97316", "#fde047"], ["lightning", "Lightning", "#fde047", "#6b7280"]]),
  ...make("thing", THING, [["house", "House", "#fde68a", "#dc2626"], ["castle", "Castle", "#9ca3af", "#dc2626"], ["tent", "Tent", "#f97316", "#7c2d12"], ["igloo", "Igloo", "#f1f5f9", "#93c5fd"], ["lighthouse", "Lighthouse", "#f8fafc", "#dc2626"], ["windmill", "Windmill", "#fef3c7", "#f8fafc"], ["fence", "Fence", "#f1f5f9", "#d6d3d1"], ["signpost", "Signpost", "#22c55e", "#3b82f6"], ["trafficlight", "Traffic light", "#374151", "#6b7280"], ["ball", "Ball", "#ef4444", "#fde047"], ["football", "Football", "#ffffff", "#1f2937"], ["beachball", "Beach ball", "#ef4444", "#3b82f6"], ["balloon", "Balloon", "#ef4444", "#ffffff"], ["kite", "Kite", "#f97316", "#3b82f6"], ["present", "Present", "#3b82f6", "#fde047"], ["cake", "Birthday cake", "#f9a8d4", "#ffffff"], ["cupcake", "Cupcake", "#f9a8d4", "#7dd3fc"], ["icecream", "Ice cream", "#f9a8d4", "#fef3c7"], ["lollipop", "Lollipop", "#ef4444", "#ffffff"], ["apple", "Apple", "#ef4444", "#22c55e"], ["banana", "Banana", "#fde047", "#7a4a12"], ["carrot", "Carrot", "#f97316", "#22c55e"], ["pizza", "Pizza slice", "#fde047", "#dc2626"], ["crown", "Crown", "#fbbf24", "#dc2626"], ["book", "Book", "#2563eb", "#fde047"], ["pencil", "Pencil", "#fbbf24", "#f472b6"], ["lightbulb", "Light bulb", "#fde047", "#9ca3af"], ["clock", "Clock", "#ef4444", "#ef4444"], ["key", "Key", "#fbbf24", "#b45309"], ["heart", "Heart", "#ef4444", "#fecaca"], ["gem", "Gem", "#38bdf8", "#bae6fd"], ["bell", "Bell", "#fbbf24", "#b45309"], ["drum", "Drum", "#dc2626", "#fde047"], ["guitar", "Guitar", "#d97706", "#1f2937"], ["trophy", "Trophy", "#fbbf24", "#7a4a12"], ["umbrella", "Umbrella", "#8b5cf6", "#c4b5fd"], ["chair", "Chair", "#b45309", "#dc2626"], ["table", "Table", "#b45309", "#d97706"], ["chest", "Treasure chest", "#92400e", "#fbbf24"], ["flag", "Pennant flag", "#8b5cf6", "#fde047"]]),
];

/** Draws a thing one unit across at the origin (the caller has already scaled). a and b are its two colours. */
export function drawThing(g, d, a, b, live = null) { g.save(); d.draw(g, a, b, live); g.restore(); }
