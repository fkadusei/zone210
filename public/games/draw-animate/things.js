// Draw & Animate: hand-drawn things, in six kinds: things that go, nature, buildings, food, furniture and other things.
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

const BUILD = {
  flats(g, a, b, live) { const k = kit(g);
    k.rect(a, -0.26, -0.44, 0.52, 0.88); k.rect("rgba(0,0,0,0.14)", -0.26, -0.44, 0.52, 0.05);
    for (let r = 0; r < 4; r += 1) for (let c = 0; c < 3; c += 1) { const lit = live ? Math.sin(r * 5 + c * 3 + Math.floor(live.t / 1.5)) > 0.2 : (r + c) % 2; k.rect(lit ? "#fde047" : GLASS, -0.2 + c * 0.15, -0.34 + r * 0.17, 0.1, 0.11, 0.01); }
    k.rect(b, -0.06, 0.3, 0.12, 0.14, 0.01); },
  school(g, a, b, live) { const k = kit(g), w = beat(live, 1.5) * 0.02;
    k.line(D, 0.014, [0, -0.3, 0, -0.46]); k.poly("#ef4444", [0, -0.46, 0.13, -0.42 + w, 0, -0.38]);
    k.rect(a, -0.44, 0.0, 0.88, 0.42); k.rect(a, -0.14, -0.22, 0.28, 0.64); k.poly(b, [-0.18, -0.2, 0, -0.34, 0.18, -0.2]); k.rect(b, -0.46, -0.03, 0.92, 0.05);
    k.oval("#fffdf6", 0, -0.1, 0.07, 0.07, 0, D); k.line(D, 0.012, [0, -0.1, 0, -0.15]); k.line(D, 0.012, [0, -0.1, 0.03, -0.08]);
    k.rect(WOOD, -0.07, 0.2, 0.14, 0.22, 0.01); for (const x of [-0.38, -0.26, 0.17, 0.29]) k.rect(GLASS, x, 0.1, 0.09, 0.13, 0.01); },
  shop(g, a, b) { const k = kit(g);
    k.rect(a, -0.4, -0.12, 0.8, 0.54); k.rect("#9ca3af", -0.4, -0.3, 0.8, 0.1);
    for (let i = 0; i < 6; i += 1) k.fill(i % 2 ? "#ffffff" : b, () => { const x = -0.44 + i * 0.147; g.moveTo(x, -0.22); g.lineTo(x + 0.147, -0.22); g.lineTo(x + 0.147, -0.06); g.arc(x + 0.0735, -0.06, 0.0735, 0, Math.PI); g.closePath(); });
    k.rect(GLASS, -0.33, 0.08, 0.36, 0.22, 0.01); k.rect(WOOD, 0.12, 0.08, 0.18, 0.34, 0.01); k.oval("#fde047", 0.15, 0.26, 0.014); k.oval("#ef4444", -0.24, 0.24, 0.04); k.oval("#f97316", -0.15, 0.24, 0.04); k.oval("#22c55e", -0.06, 0.24, 0.04); },
  hospital(g, a, b) { const k = kit(g);
    k.rect(a, -0.42, -0.1, 0.84, 0.52, 0, true); k.rect(a, -0.2, -0.4, 0.4, 0.82, 0, true); k.rect(b, -0.1, -0.35, 0.055, 0.22); k.rect(b, 0.045, -0.35, 0.055, 0.22); k.rect(b, -0.1, -0.265, 0.2, 0.05); // an H for hospital
    for (const x of [-0.36, 0.26]) for (const y of [0.0, 0.2]) k.rect(GLASS, x, y, 0.1, 0.12, 0.01); for (const x of [-0.14, 0.04]) k.rect(GLASS, x, -0.04, 0.1, 0.12, 0.01); k.rect("#6b7280", -0.08, 0.22, 0.16, 0.2, 0.01); k.line("#e5e7eb", 0.012, [0, 0.22, 0, 0.42]); },
  barn(g, a, b) { const k = kit(g);
    k.poly(a, [-0.38, 0.42, -0.38, -0.06, -0.24, -0.3, 0, -0.42, 0.24, -0.3, 0.38, -0.06, 0.38, 0.42]); k.line(b, 0.035, [-0.4, -0.06, -0.25, -0.31, 0, -0.44, 0.25, -0.31, 0.4, -0.06]);
    k.rect(b, -0.17, 0.08, 0.34, 0.34, 0.01); k.line(a, 0.02, [-0.17, 0.08, 0.17, 0.42]); k.line(a, 0.02, [0.17, 0.08, -0.17, 0.42]); k.line(a, 0.02, [0, 0.08, 0, 0.42]); k.rect(b, -0.07, -0.24, 0.14, 0.14, 0.01); k.line(a, 0.014, [-0.07, -0.17, 0.07, -0.17]); },
  skyscraper(g, a, b) { const k = kit(g);
    k.line("#6b7280", 0.014, [0, -0.36, 0, -0.48]); k.rect(a, -0.1, -0.38, 0.2, 0.1); k.rect(a, -0.17, -0.28, 0.34, 0.72); k.rect(a, -0.24, 0.1, 0.48, 0.34);
    for (let r = 0; r < 7; r += 1) for (let c = 0; c < 3; c += 1) k.rect(b, -0.13 + c * 0.095, -0.24 + r * 0.095, 0.065, 0.055); k.rect(D, -0.04, 0.34, 0.08, 0.1); },
  cabin(g, a, b, live) { const k = kit(g);
    k.rect("#6b7280", 0.14, -0.34, 0.1, 0.2); k.puffs(live, 0.19, -0.38);
    k.rect(a, -0.36, -0.04, 0.72, 0.46, 0.02); for (let i = 1; i < 5; i += 1) k.line("rgba(0,0,0,0.2)", 0.014, [-0.36, -0.04 + i * 0.092, 0.36, -0.04 + i * 0.092]);
    k.poly(b, [-0.44, -0.02, 0, -0.36, 0.44, -0.02]); k.rect("#5b3a1c", -0.08, 0.14, 0.16, 0.28, 0.01); k.rect("#fde047", 0.16, 0.08, 0.13, 0.13, 0.01); k.line("#5b3a1c", 0.012, [0.225, 0.08, 0.225, 0.21]); },
  bridge(g, a, b) { const k = kit(g);
    k.rect(a, -0.48, 0.02, 0.96, 0.4); for (const x of [-0.3, 0, 0.3]) k.fill("#fffdf6", () => { g.moveTo(x - 0.11, 0.43); g.lineTo(x - 0.11, 0.26); g.arc(x, 0.26, 0.11, Math.PI, 0); g.lineTo(x + 0.11, 0.43); });
    for (const x of [-0.3, 0, 0.3]) k.fill("#7dd3fc", () => { g.rect(x - 0.11, 0.34, 0.22, 0.09); }); k.rect(b, -0.48, -0.04, 0.96, 0.07, 0.01); for (let i = 0; i < 9; i += 1) k.rect(b, -0.47 + i * 0.113, -0.14, 0.03, 0.1); k.rect(b, -0.48, -0.16, 0.96, 0.035, 0.01); },
  clocktower(g, a, b, live) { const k = kit(g), t = live ? live.t : 0;
    k.poly(b, [-0.17, -0.28, 0, -0.48, 0.17, -0.28]); k.rect(a, -0.14, -0.28, 0.28, 0.72); k.rect("rgba(0,0,0,0.14)", -0.14, 0.04, 0.28, 0.03);
    k.oval("#fffdf6", 0, -0.12, 0.1, 0.1, 0, D); const h = -Math.PI / 2 + 1 + t * 0.1, m = -Math.PI / 2 + t * 1.2; k.line(D, 0.018, [0, -0.12, Math.cos(h) * 0.05, -0.12 + Math.sin(h) * 0.05]); k.line(D, 0.013, [0, -0.12, Math.cos(m) * 0.075, -0.12 + Math.sin(m) * 0.075]);
    k.fill(D, () => { g.moveTo(-0.05, 0.44); g.lineTo(-0.05, 0.3); g.arc(0, 0.3, 0.05, Math.PI, 0); g.lineTo(0.05, 0.44); }); k.rect(GLASS, -0.03, 0.12, 0.06, 0.1, 0.02); },
  factory(g, a, b, live) { const k = kit(g);
    for (const x of [0.16, 0.3]) { k.rect(b, x, -0.4, 0.09, 0.42); k.rect(D, x, -0.4, 0.09, 0.04); k.puffs(live, x + 0.045, -0.44); }
    k.poly(a, [-0.46, 0.42, -0.46, -0.02, -0.26, -0.18, -0.26, -0.02, -0.06, -0.18, -0.06, -0.02, 0.14, -0.18, 0.14, -0.02, 0.46, -0.02, 0.46, 0.42]);
    for (const x of [-0.38, -0.2, -0.02]) k.rect(GLASS, x, 0.08, 0.11, 0.1, 0.01); k.rect("#6b7280", 0.2, 0.16, 0.18, 0.26, 0.01); for (const y of [0.22, 0.28, 0.34]) k.line("rgba(255,255,255,0.4)", 0.01, [0.2, y, 0.38, y]); },
  treehouse(g, a, b, live) { const k = kit(g);
    k.rect(WOOD, -0.06, 0.0, 0.12, 0.46, 0.02); k.oval("#22c55e", -0.24, -0.02, 0.2); k.oval("#22c55e", 0.24, -0.02, 0.2); k.oval("#16a34a", 0, -0.2, 0.3);
    k.rect(a, -0.2, -0.26, 0.4, 0.3, 0.02); k.poly(b, [-0.26, -0.24, 0, -0.44, 0.26, -0.24]); k.rect(GLASS, -0.13, -0.19, 0.11, 0.11, 0.01); k.rect("#5b3a1c", 0.03, -0.16, 0.11, 0.2, 0.01);
    k.line("#b08968", 0.016, [0.14, 0.04, 0.14, 0.44]); k.line("#b08968", 0.016, [0.24, 0.04, 0.24, 0.44]); for (const y of [0.12, 0.22, 0.32, 0.42]) k.line("#b08968", 0.016, [0.14, y, 0.24, y]); },
  pyramid(g, a, b) { const k = kit(g);
    k.poly(a, [-0.46, 0.38, 0.1, 0.38, -0.1, -0.38]); k.poly(b, [0.1, 0.38, 0.46, 0.26, -0.1, -0.38]); for (const u of [0.25, 0.5, 0.75]) k.line("rgba(0,0,0,0.15)", 0.01, [-0.1 - 0.36 * u, -0.38 + 0.76 * u, -0.1 + 0.2 * u, -0.38 + 0.76 * u]); k.rect(D, -0.2, 0.26, 0.08, 0.12); },
  beachhut(g, a, b) { const k = kit(g);
    k.rect(a, -0.26, -0.1, 0.52, 0.5); g.save(); g.beginPath(); g.rect(-0.26, -0.1, 0.52, 0.5); g.clip(); for (let i = 0; i < 4; i += 1) k.rect(b, -0.26 + i * 0.148, -0.1, 0.074, 0.5); g.restore();
    k.poly("#f8fafc", [-0.32, -0.08, 0, -0.38, 0.32, -0.08], true); k.rect("#f8fafc", -0.09, 0.08, 0.18, 0.32, 0.01, true); k.oval(D, 0.05, 0.25, 0.014); k.rect(WOOD, -0.3, 0.4, 0.6, 0.05); },
  well(g, a, b, live) { const k = kit(g), y = 0.02 + beat(live, 0.5) * 0.08;
    k.rect(WOOD, -0.27, -0.26, 0.05, 0.44); k.rect(WOOD, 0.22, -0.26, 0.05, 0.44); k.poly(b, [-0.36, -0.24, 0, -0.44, 0.36, -0.24]);
    k.line("#6b7280", 0.022, [-0.24, -0.16, 0.3, -0.16]); k.line("#6b7280", 0.022, [0.3, -0.16, 0.3, -0.08, 0.36, -0.08]); k.line("#b08968", 0.012, [0, -0.16, 0, y]); k.poly("#9ca3af", [-0.06, y, 0.06, y, 0.045, y + 0.1, -0.045, y + 0.1]);
    k.rect(a, -0.3, 0.14, 0.6, 0.3, 0.02); for (const yy of [0.24, 0.34]) k.line("rgba(0,0,0,0.2)", 0.012, [-0.3, yy, 0.3, yy]); for (const [x, y0] of [[-0.15, 0.14], [0.05, 0.14], [-0.05, 0.24], [0.17, 0.24], [-0.17, 0.34], [0.03, 0.34]]) k.line("rgba(0,0,0,0.2)", 0.012, [x, y0, x, y0 + 0.1]); },
  garage(g, a, b) { const k = kit(g);
    k.rect(a, -0.42, -0.14, 0.84, 0.56); k.poly("#6b7280", [-0.46, -0.12, 0, -0.34, 0.46, -0.12]); k.rect(b, -0.3, 0.02, 0.6, 0.4, 0.01); for (const y of [0.1, 0.18, 0.26, 0.34]) k.line("rgba(0,0,0,0.2)", 0.012, [-0.3, y, 0.3, y]); k.rect(D, -0.04, 0.37, 0.08, 0.02); },
};

const FOOD = {
  orange(g, a, b) { const k = kit(g); k.oval(a, 0, 0.04, 0.38); k.oval(b, 0.1, -0.36, 0.11, 0.05, -0.4); k.oval("#7a4a12", 0, -0.32, 0.025); k.oval("rgba(255,255,255,0.35)", -0.14, -0.12, 0.06, 0.09, 0.6); for (const [x, y] of [[0.1, 0.1], [0.2, -0.04], [-0.04, 0.24], [0.18, 0.22]]) k.oval("rgba(0,0,0,0.1)", x, y, 0.01); },
  pear(g, a, b) { const k = kit(g); k.line(WOOD, 0.03, [0, -0.3, 0.04, -0.44]); k.oval(b, 0.13, -0.36, 0.1, 0.045, -0.4);
    k.fill(a, () => { g.moveTo(0, -0.34); g.bezierCurveTo(0.2, -0.34, 0.1, -0.06, 0.26, 0.08); g.bezierCurveTo(0.44, 0.3, 0.2, 0.46, 0, 0.44); g.bezierCurveTo(-0.2, 0.46, -0.44, 0.3, -0.26, 0.08); g.bezierCurveTo(-0.1, -0.06, -0.2, -0.34, 0, -0.34); }); k.oval("rgba(255,255,255,0.35)", -0.12, 0.12, 0.05, 0.1, 0.4); },
  strawberry(g, a, b) { const k = kit(g);
    k.fill(a, () => { g.moveTo(0, 0.44); g.bezierCurveTo(-0.5, 0.1, -0.4, -0.3, 0, -0.26); g.bezierCurveTo(0.4, -0.3, 0.5, 0.1, 0, 0.44); });
    for (const [x, y] of [[-0.16, -0.08], [0.02, -0.1], [0.18, -0.06], [-0.2, 0.08], [-0.04, 0.06], [0.12, 0.1], [-0.08, 0.22], [0.06, 0.26]]) k.oval("#fde68a", x, y, 0.016, 0.024);
    for (let i = 0; i < 5; i += 1) { const t = Math.PI * (1.1 + i * 0.2); k.poly(b, [0, -0.24, Math.cos(t) * 0.26 - 0.03, -0.24 + Math.sin(t) * 0.16 + 0.04, Math.cos(t) * 0.2 + 0.05, -0.24 + Math.sin(t) * 0.1 + 0.07]); } k.line(b, 0.03, [0, -0.26, 0.02, -0.4]); },
  grapes(g, a, b) { const k = kit(g); k.line(WOOD, 0.03, [0, -0.3, 0.03, -0.44]); k.oval(b, 0.14, -0.34, 0.13, 0.07, -0.3);
    for (const [x, y] of [[-0.2, -0.2], [0, -0.2], [0.2, -0.2], [-0.1, -0.04], [0.1, -0.04], [-0.2, 0.12], [0, 0.12], [0.2, 0.12], [-0.1, 0.28], [0.1, 0.28], [0, 0.4]]) { k.oval(a, x, y, 0.11); k.oval("rgba(255,255,255,0.35)", x - 0.035, y - 0.04, 0.03); } },
  watermelon(g, a, b) { const k = kit(g);
    k.fill(b, () => { g.arc(0, -0.12, 0.46, 0, Math.PI); g.closePath(); }); k.fill("#f0fdf4", () => { g.arc(0, -0.12, 0.4, 0, Math.PI); g.closePath(); }); k.fill(a, () => { g.arc(0, -0.12, 0.36, 0, Math.PI); g.closePath(); });
    for (const [x, y] of [[-0.2, -0.02], [0, 0.0], [0.2, -0.02], [-0.1, 0.12], [0.1, 0.12]]) k.oval(D, x, y, 0.016, 0.026); },
  cherries(g, a, b) { const k = kit(g); k.curve(b, 0.025, [-0.18, 0.14], [-0.14, -0.26], [0.1, -0.4]); k.curve(b, 0.025, [0.2, 0.2], [0.2, -0.16], [0.1, -0.4]); k.oval(b, 0.22, -0.38, 0.13, 0.06, 0.2);
    for (const [x, y] of [[-0.18, 0.22], [0.2, 0.28]]) { k.oval(a, x, y, 0.17); k.oval("rgba(255,255,255,0.4)", x - 0.06, y - 0.07, 0.04, 0.05); } },
  lemon(g, a, b) { const k = kit(g); g.rotate(-0.3);
    k.fill(a, () => { g.moveTo(-0.44, 0); g.quadraticCurveTo(-0.34, -0.02, -0.3, -0.1); g.bezierCurveTo(-0.14, -0.36, 0.14, -0.36, 0.3, -0.1); g.quadraticCurveTo(0.34, -0.02, 0.44, 0); g.quadraticCurveTo(0.34, 0.02, 0.3, 0.1); g.bezierCurveTo(0.14, 0.36, -0.14, 0.36, -0.3, 0.1); g.quadraticCurveTo(-0.34, 0.02, -0.44, 0); }); k.oval("rgba(255,255,255,0.4)", -0.1, -0.12, 0.1, 0.045, -0.2); k.oval(b, 0.36, -0.14, 0.09, 0.04, -0.6); },
  pineapple(g, a, b) { const k = kit(g);
    for (const [x, y, t] of [[-0.14, -0.26, -0.6], [0.14, -0.26, 0.6], [-0.07, -0.34, -0.25], [0.07, -0.34, 0.25], [0, -0.38, 0]]) k.oval(b, x, y, 0.045, 0.14, t);
    k.oval(a, 0, 0.14, 0.26, 0.31); g.save(); g.beginPath(); g.ellipse(0, 0.14, 0.26, 0.31, 0, 0, TAU); g.clip(); for (let i = -4; i < 5; i += 1) { k.line("rgba(0,0,0,0.2)", 0.012, [i * 0.11 - 0.3, -0.2, i * 0.11 + 0.3, 0.5]); k.line("rgba(0,0,0,0.2)", 0.012, [i * 0.11 + 0.3, -0.2, i * 0.11 - 0.3, 0.5]); } g.restore(); },
  tomato(g, a, b) { const k = kit(g); k.oval(a, 0, 0.06, 0.4, 0.36); k.oval("rgba(255,255,255,0.35)", -0.16, -0.08, 0.06, 0.09, 0.6); k.star(b, 0, -0.26, 0.16, 5, 0.35); k.line(b, 0.03, [0, -0.28, 0.02, -0.4]); },
  corn(g, a, b) { const k = kit(g); g.rotate(0.25);
    k.rect(a, -0.14, -0.44, 0.28, 0.7, 0.14); g.save(); g.beginPath(); g.rect(-0.14, -0.44, 0.28, 0.7); g.clip(); for (let r = 0; r < 9; r += 1) for (let c = 0; c < 4; c += 1) k.oval("rgba(0,0,0,0.1)", -0.105 + c * 0.07 + (r % 2 ? 0.035 : 0), -0.4 + r * 0.075, 0.012); g.restore();
    k.fill(b, () => { g.moveTo(-0.16, 0.44); g.quadraticCurveTo(-0.32, 0.1, -0.2, -0.16); g.quadraticCurveTo(-0.1, 0.16, 0, 0.3); g.quadraticCurveTo(0.1, 0.16, 0.2, -0.16); g.quadraticCurveTo(0.32, 0.1, 0.16, 0.44); g.closePath(); }); },
  broccoli(g, a, b) { const k = kit(g); k.poly(b, [-0.09, 0.44, 0.09, 0.44, 0.07, 0.04, -0.07, 0.04]); k.line(b, 0.07, [-0.04, 0.16, -0.18, 0.0]); k.line(b, 0.07, [0.04, 0.16, 0.18, 0.0]);
    for (const [x, y, r] of [[-0.24, -0.06, 0.16], [0.24, -0.06, 0.16], [0, -0.22, 0.2], [-0.14, -0.2, 0.14], [0.14, -0.2, 0.14], [0, -0.04, 0.16]]) k.oval(a, x, y, r); for (const [x, y] of [[-0.2, -0.1], [0.06, -0.28], [0.2, -0.04], [-0.04, -0.1]]) k.oval("rgba(255,255,255,0.14)", x, y, 0.05); },
  bread(g, a, b) { const k = kit(g);
    k.fill(a, () => { g.moveTo(-0.42, 0.3); g.lineTo(-0.42, -0.04); g.bezierCurveTo(-0.44, -0.34, -0.1, -0.32, 0, -0.3); g.bezierCurveTo(0.1, -0.32, 0.44, -0.34, 0.42, -0.04); g.lineTo(0.42, 0.3); g.closePath(); }); k.rect(b, -0.42, 0.06, 0.84, 0.26, 0.03);
    for (const x of [-0.2, 0, 0.2]) k.line("rgba(0,0,0,0.18)", 0.02, [x - 0.04, -0.22, x + 0.04, -0.06]); },
  cheese(g, a, b) { const k = kit(g); k.poly(a, [-0.44, 0.3, -0.44, 0.02, 0.44, -0.28, 0.44, 0.3]); k.poly(b, [-0.44, 0.02, 0.44, -0.28, 0.2, -0.34]); for (const [x, y, r] of [[-0.22, 0.16, 0.06], [0.08, 0.06, 0.05], [0.28, 0.18, 0.045], [0.0, 0.22, 0.03], [0.3, -0.08, 0.035]]) k.oval("rgba(0,0,0,0.16)", x, y, r); },
  egg(g, a, b) { const k = kit(g); k.fill(a, () => { g.moveTo(-0.4, 0.06); g.bezierCurveTo(-0.5, -0.24, -0.14, -0.4, 0.06, -0.32); g.bezierCurveTo(0.34, -0.42, 0.52, -0.12, 0.4, 0.1); g.bezierCurveTo(0.44, 0.34, 0.12, 0.42, -0.06, 0.34); g.bezierCurveTo(-0.3, 0.42, -0.46, 0.24, -0.4, 0.06); }, true); k.oval(b, 0.02, 0.0, 0.17); k.oval("rgba(255,255,255,0.5)", -0.04, -0.06, 0.045, 0.035, -0.5); },
  burger(g, a, b) { const k = kit(g);
    k.rect(a, -0.38, 0.2, 0.76, 0.18, 0.07); k.rect("#7a4a12", -0.42, 0.08, 0.84, 0.13, 0.05); k.fill("#fde047", () => { g.moveTo(-0.42, 0.04); g.lineTo(0.42, 0.04); g.lineTo(0.3, 0.14); g.lineTo(0.18, 0.05); g.lineTo(-0.02, 0.16); g.lineTo(-0.2, 0.05); g.lineTo(-0.32, 0.13); g.closePath(); });
    k.fill(b, () => { g.moveTo(-0.44, 0.02); for (let i = 0; i < 6; i += 1) g.quadraticCurveTo(-0.37 + i * 0.147, 0.1, -0.293 + i * 0.147, 0.02); g.lineTo(0.44, -0.04); g.lineTo(-0.44, -0.04); g.closePath(); });
    k.fill(a, () => { g.moveTo(-0.4, -0.04); g.bezierCurveTo(-0.4, -0.44, 0.4, -0.44, 0.4, -0.04); g.closePath(); }); for (const [x, y] of [[-0.2, -0.2], [0, -0.28], [0.2, -0.2], [-0.08, -0.14], [0.1, -0.14]]) k.oval("#fff4dc", x, y, 0.022, 0.014, 0.4); },
  hotdog(g, a, b) { const k = kit(g); k.rect(a, -0.44, -0.04, 0.88, 0.3, 0.15); k.rect("#b91c1c", -0.48, -0.16, 0.96, 0.2, 0.1); k.rect(a, -0.44, -0.3, 0.88, 0.22, 0.11); k.rect("#b91c1c", -0.48, -0.14, 0.96, 0.12, 0.06);
    g.strokeStyle = b; g.lineWidth = 0.035; g.lineCap = "round"; g.beginPath(); g.moveTo(-0.38, -0.08); for (let i = 0; i < 6; i += 1) g.quadraticCurveTo(-0.32 + i * 0.127, i % 2 ? -0.02 : -0.14, -0.253 + i * 0.127, -0.08); g.stroke(); },
  fries(g, a, b) { const k = kit(g);
    for (const [x, y, t] of [[-0.18, -0.2, -0.2], [-0.08, -0.3, -0.08], [0.02, -0.26, 0.02], [0.12, -0.32, 0.1], [0.2, -0.2, 0.22], [-0.02, -0.16, 0]]) { g.save(); g.translate(x, 0.1); g.rotate(t); k.rect(b, -0.035, y - 0.1, 0.07, 0.4, 0.01, "#d1a514"); g.restore(); }
    k.poly(a, [-0.28, -0.04, 0.28, -0.04, 0.2, 0.44, -0.2, 0.44]); k.fill("rgba(255,255,255,0.3)", () => { g.arc(0, 0.2, 0.09, 0, TAU); }); },
  sandwich(g, a, b) { const k = kit(g);
    k.poly(a, [-0.44, 0.34, 0.44, 0.34, 0, -0.26]); k.poly("#fff4dc", [-0.36, 0.3, 0.36, 0.3, 0, -0.18]); k.poly(b, [-0.46, 0.38, 0.46, 0.38, 0.42, 0.3, -0.42, 0.3]); k.rect("#fde047", -0.4, 0.36, 0.8, 0.035); k.rect("#ef4444", -0.38, 0.39, 0.76, 0.035); k.poly(a, [-0.44, 0.42, 0.44, 0.42, 0.44, 0.48, -0.44, 0.48]); },
  doughnut(g, a, b) { const k = kit(g);
    g.save(); g.beginPath(); g.rect(-0.6, -0.6, 1.2, 1.2); g.arc(0, 0, 0.12, 0, TAU); g.clip("evenodd"); k.oval("#d6a15c", 0, 0, 0.42);
    k.fill(a, () => { for (let i = 0; i <= 24; i += 1) { const t = (i / 24) * TAU, r = 0.35 + Math.sin(t * 6) * 0.03; g.lineTo(Math.cos(t) * r, Math.sin(t) * r); } });
    [["#fde047", 0.24, 0.3], ["#7dd3fc", 0.26, 1.4], ["#ffffff", 0.22, 2.5], ["#22c55e", 0.27, 3.6], ["#fde047", 0.23, 4.7], ["#ffffff", 0.27, 5.6], ["#7dd3fc", 0.2, 0.9], ["#22c55e", 0.21, 3.0]].forEach(([c, r, t]) => { if (c !== a) k.line(b === c ? "#ffffff" : c, 0.022, [Math.cos(t) * r, Math.sin(t) * r, Math.cos(t) * r + Math.cos(t * 3) * 0.045, Math.sin(t) * r + Math.sin(t * 3) * 0.045]); }); k.oval(b, 0.2, -0.22, 0.02); g.restore(); },
  cookie(g, a, b) { const k = kit(g); k.oval(a, 0, 0, 0.42); k.oval("rgba(255,255,255,0.12)", -0.1, -0.12, 0.26); for (const [x, y, r] of [[-0.2, -0.16, 0.055], [0.12, -0.22, 0.05], [0.24, 0.04, 0.06], [-0.06, 0.06, 0.05], [-0.24, 0.16, 0.045], [0.08, 0.26, 0.055]]) k.oval(b, x, y, r); },
  juice(g, a, b, live) { const k = kit(g);
    k.line(b, 0.035, [0.08, 0.2, 0.2, -0.44]); k.poly("rgba(190,230,255,0.55)", [-0.24, -0.26, 0.24, -0.26, 0.18, 0.42, -0.18, 0.42], "#93c5fd"); k.poly(a, [-0.225, -0.1, 0.225, -0.1, 0.17, 0.4, -0.17, 0.4]);
    for (let i = 0; i < 3; i += 1) { const u = live ? (live.t * 0.5 + i / 3) % 1 : i / 3; k.oval("rgba(255,255,255,0.6)", -0.1 + i * 0.09, 0.34 - u * 0.4, 0.016); } k.fill("#f97316", () => { g.arc(-0.22, -0.26, 0.12, Math.PI * 0.9, Math.PI * 2.1); g.closePath(); }); },
  popcorn(g, a, b) { const k = kit(g);
    for (const [x, y, r] of [[-0.2, -0.18, 0.11], [0, -0.26, 0.13], [0.2, -0.18, 0.11], [-0.1, -0.12, 0.11], [0.1, -0.12, 0.11], [-0.12, -0.32, 0.08], [0.13, -0.33, 0.08]]) k.oval("#fff4c2", x, y, r, r, 0, "#e2c56b");
    k.poly(a, [-0.28, -0.08, 0.28, -0.08, 0.2, 0.44, -0.2, 0.44]); g.save(); g.beginPath(); g.moveTo(-0.28, -0.08); g.lineTo(0.28, -0.08); g.lineTo(0.2, 0.44); g.lineTo(-0.2, 0.44); g.clip(); for (let i = 0; i < 4; i += 1) k.poly(b, [-0.28 + i * 0.16, -0.08, -0.2 + i * 0.16, -0.08, -0.14 + i * 0.114, 0.44, -0.2 + i * 0.114, 0.44]); g.restore(); },
};

const HOME = {
  sofa(g, a, b) { const k = kit(g); k.rect(a, -0.4, -0.2, 0.8, 0.4, 0.08); k.rect(b, -0.34, 0.02, 0.68, 0.2, 0.05); k.line("rgba(0,0,0,0.15)", 0.012, [0, 0.02, 0, 0.22]); k.rect(a, -0.48, -0.04, 0.16, 0.34, 0.07); k.rect(a, 0.32, -0.04, 0.16, 0.34, 0.07); k.rect(WOOD, -0.4, 0.3, 0.06, 0.08); k.rect(WOOD, 0.34, 0.3, 0.06, 0.08); },
  armchair(g, a, b) { const k = kit(g); k.rect(a, -0.28, -0.32, 0.56, 0.5, 0.1); k.rect(b, -0.22, 0.04, 0.44, 0.2, 0.05); k.rect(a, -0.38, -0.04, 0.16, 0.36, 0.07); k.rect(a, 0.22, -0.04, 0.16, 0.36, 0.07); k.rect(WOOD, -0.3, 0.32, 0.06, 0.08); k.rect(WOOD, 0.24, 0.32, 0.06, 0.08); },
  bed(g, a, b) { const k = kit(g); k.rect(WOOD, -0.46, -0.24, 0.08, 0.64, 0.02); k.rect(WOOD, 0.4, 0.0, 0.07, 0.4, 0.02); k.rect("#f8fafc", -0.4, 0.04, 0.82, 0.16, 0.04, true); k.rect("#ffffff", -0.36, -0.06, 0.24, 0.14, 0.06, true); k.rect(a, -0.1, 0.02, 0.52, 0.2, 0.05); k.rect(b, -0.1, 0.02, 0.1, 0.2, 0.03); k.rect(WOOD, -0.4, 0.2, 0.82, 0.08); },
  bookshelf(g, a, b) { const k = kit(g); k.rect(a, -0.3, -0.44, 0.6, 0.88, 0.02); const cols = ["#ef4444", "#3b82f6", "#22c55e", "#fde047", "#8b5cf6", "#f97316"];
    for (let r = 0; r < 3; r += 1) { k.rect("#fffdf6", -0.25, -0.39 + r * 0.28, 0.5, 0.23); let x = -0.24; for (let i = 0; i < 6; i += 1) { const w = 0.05 + ((i + r) % 3) * 0.012, h = 0.15 + ((i * 2 + r) % 3) * 0.03; if (x + w > 0.24) break; k.rect(i === 1 + r ? b : cols[(i + r * 2) % 6], x, -0.39 + r * 0.28 + 0.23 - h, w, h); x += w + 0.008; } } },
  wardrobe(g, a, b) { const k = kit(g); k.rect(a, -0.3, -0.44, 0.6, 0.84, 0.03); k.rect("rgba(0,0,0,0.12)", -0.3, -0.44, 0.6, 0.05, 0.02); k.line("rgba(0,0,0,0.25)", 0.012, [0, -0.38, 0, 0.36]); k.rect("rgba(255,255,255,0.14)", -0.25, -0.34, 0.2, 0.66, 0.02); k.rect("rgba(255,255,255,0.14)", 0.05, -0.34, 0.2, 0.66, 0.02); k.oval(b, -0.04, 0.0, 0.025); k.oval(b, 0.04, 0.0, 0.025); k.rect(a, -0.26, 0.4, 0.08, 0.05); k.rect(a, 0.18, 0.4, 0.08, 0.05); },
  drawers(g, a, b) { const k = kit(g); k.rect(a, -0.36, -0.3, 0.72, 0.66, 0.03); for (let i = 0; i < 3; i += 1) { k.rect("rgba(255,255,255,0.16)", -0.31, -0.25 + i * 0.2, 0.62, 0.16, 0.02); k.oval(b, -0.1, -0.17 + i * 0.2, 0.025); k.oval(b, 0.1, -0.17 + i * 0.2, 0.025); } k.rect(a, -0.32, 0.36, 0.08, 0.06); k.rect(a, 0.24, 0.36, 0.08, 0.06); },
  desk(g, a, b, live) { const k = kit(g); k.rect(a, -0.42, -0.02, 0.07, 0.44, 0.01); k.rect(a, 0.12, 0.04, 0.3, 0.38, 0.02); k.rect("rgba(255,255,255,0.16)", 0.15, 0.08, 0.24, 0.13, 0.01); k.rect("rgba(255,255,255,0.16)", 0.15, 0.25, 0.24, 0.13, 0.01); k.oval(b, 0.27, 0.145, 0.02); k.oval(b, 0.27, 0.315, 0.02); k.rect(a, -0.46, -0.08, 0.92, 0.09, 0.02);
    k.line(D, 0.022, [-0.2, -0.08, -0.2, -0.26, -0.08, -0.36]); k.poly(b, [-0.14, -0.4, -0.02, -0.38, -0.04, -0.26]); if (live) { g.globalAlpha = 0.3; k.poly("#fde047", [-0.03, -0.32, 0.2, -0.08, -0.06, -0.08]); g.globalAlpha = 1; } },
  floorlamp(g, a, b, live) { const k = kit(g); if (live) { g.globalAlpha = 0.22 + 0.06 * beat(live, 0.7); k.oval("#fde047", 0, -0.24, 0.36); g.globalAlpha = 1; } k.rect(b, -0.025, -0.14, 0.05, 0.56); k.oval(b, 0, 0.43, 0.16, 0.035); k.poly(a, [-0.16, -0.42, 0.16, -0.42, 0.26, -0.12, -0.26, -0.12]); k.line("#6b7280", 0.012, [0.12, -0.12, 0.12, -0.02]); k.oval("#6b7280", 0.12, -0.01, 0.018); },
  tv(g, a, b, live) { const k = kit(g); k.rect(a, -0.44, -0.3, 0.88, 0.56, 0.04); k.rect("#0f172a", -0.39, -0.25, 0.78, 0.46, 0.02); k.rect(a, -0.05, 0.26, 0.1, 0.1); k.rect(a, -0.22, 0.36, 0.44, 0.05, 0.02);
    g.save(); g.beginPath(); g.rect(-0.39, -0.25, 0.78, 0.46); g.clip(); k.rect("#7dd3fc", -0.39, -0.25, 0.78, 0.3); k.rect("#22c55e", -0.39, 0.05, 0.78, 0.16); k.oval("#fde047", 0.24, -0.14, 0.06); const x = live ? ((live.t * 0.25) % 1) * 0.9 - 0.45 : -0.1; k.oval(b, x, 0.02, 0.06, 0.05); k.oval(b, x + 0.06, -0.02, 0.035); g.restore(); },
  fridge(g, a, b) { const k = kit(g); k.rect(a, -0.24, -0.44, 0.48, 0.88, 0.04, true); k.line("#9ca3af", 0.014, [-0.24, -0.14, 0.24, -0.14]); k.rect(b, 0.14, -0.36, 0.035, 0.16, 0.015); k.rect(b, 0.14, -0.06, 0.035, 0.24, 0.015); k.oval("#ef4444", -0.1, -0.3, 0.035); k.rect("#fde047", -0.16, 0.04, 0.1, 0.08, 0.01); },
  cooker(g, a, b, live) { const k = kit(g); k.rect(a, -0.3, -0.26, 0.6, 0.7, 0.03, true); k.rect(D, -0.3, -0.3, 0.6, 0.06, 0.02); for (const x of [-0.18, -0.06, 0.06, 0.18]) k.oval(b, x, -0.17, 0.03); k.rect("#111827", -0.22, -0.06, 0.44, 0.34, 0.02); k.rect("rgba(255,255,255,0.12)", -0.18, -0.02, 0.36, 0.26, 0.01); k.rect("#9ca3af", -0.2, -0.1, 0.4, 0.03, 0.01);
    if (live) { g.globalAlpha = 0.5 + 0.3 * beat(live, 2); k.oval("#f97316", 0, 0.16, 0.12, 0.06); g.globalAlpha = 1; } },
  bath(g, a, b, live) { const k = kit(g); k.line("#9ca3af", 0.03, [0.34, 0.0, 0.34, -0.26, 0.24, -0.26, 0.24, -0.2]); for (const [x, y, r] of [[-0.22, -0.06, 0.09], [-0.08, -0.1, 0.11], [0.08, -0.06, 0.09], [-0.3, -0.02, 0.06]]) k.oval("#ffffff", x, y + beat(live, 0.8, x * 9) * 0.01, r, r, 0, "#bae6fd");
    k.fill(a, () => { g.moveTo(-0.46, 0.0); g.lineTo(0.46, 0.0); g.quadraticCurveTo(0.44, 0.34, 0.26, 0.34); g.lineTo(-0.26, 0.34); g.quadraticCurveTo(-0.44, 0.34, -0.46, 0.0); }, true); k.rect(a, -0.48, -0.04, 0.96, 0.07, 0.03, true); k.oval(b, -0.26, 0.4, 0.05); k.oval(b, 0.26, 0.4, 0.05); },
  mirror(g, a, b, live) { const k = kit(g); k.oval(a, 0, -0.04, 0.3, 0.4); k.oval("#dbeafe", 0, -0.04, 0.24, 0.34); const u = live ? ((live.t * 0.3) % 1) * 0.5 - 0.25 : -0.06; g.save(); g.beginPath(); g.ellipse(0, -0.04, 0.24, 0.34, 0, 0, TAU); g.clip(); k.line("rgba(255,255,255,0.8)", 0.05, [u - 0.1, 0.2, u + 0.06, -0.3]); k.line("rgba(255,255,255,0.8)", 0.02, [u, 0.2, u + 0.16, -0.3]); g.restore(); k.rect(b, -0.1, 0.36, 0.2, 0.06, 0.02); },
  rug(g, a, b) { const k = kit(g); for (let i = 0; i < 9; i += 1) { k.line(b, 0.016, [-0.44, -0.24 + i * 0.06, -0.49, -0.24 + i * 0.06]); k.line(b, 0.016, [0.44, -0.24 + i * 0.06, 0.49, -0.24 + i * 0.06]); } k.rect(a, -0.44, -0.27, 0.88, 0.54, 0.02); k.rect(b, -0.37, -0.2, 0.74, 0.4, 0.01); k.rect(a, -0.31, -0.14, 0.62, 0.28, 0.01); k.poly(b, [0, -0.1, 0.2, 0, 0, 0.1, -0.2, 0]); },
  window(g, a, b, live) { const k = kit(g); k.rect("#7dd3fc", -0.3, -0.34, 0.6, 0.62); k.oval("#fde047", 0.14, -0.2, 0.07); const x = live ? ((live.t * 0.08) % 1) * 0.7 - 0.4 : -0.16; g.save(); g.beginPath(); g.rect(-0.3, -0.34, 0.6, 0.62); g.clip(); k.oval("#ffffff", x, -0.06, 0.1, 0.06); k.oval("#ffffff", x + 0.08, -0.09, 0.07, 0.05); k.rect("#22c55e", -0.3, 0.14, 0.6, 0.14); g.restore();
    g.strokeStyle = a; g.lineWidth = 0.05; g.strokeRect(-0.3, -0.34, 0.6, 0.62); k.line(a, 0.03, [0, -0.34, 0, 0.28]); k.line(a, 0.03, [-0.3, -0.03, 0.3, -0.03]); k.rect(a, -0.36, 0.28, 0.72, 0.06, 0.01); for (const sx of [-1, 1]) k.fill(b, () => { g.moveTo(sx * 0.34, -0.4); g.lineTo(sx * 0.16, -0.4); g.quadraticCurveTo(sx * 0.2, -0.06, sx * 0.34, 0.2); g.closePath(); }); k.rect(WOOD, -0.38, -0.44, 0.76, 0.04, 0.01); },
  door(g, a, b) { const k = kit(g); k.rect("#9ca3af", -0.24, -0.46, 0.48, 0.92); k.rect(a, -0.2, -0.42, 0.4, 0.88); for (const [x, y, h] of [[-0.15, -0.36, 0.3], [0.02, -0.36, 0.3], [-0.15, 0.0, 0.38], [0.02, 0.0, 0.38]]) k.rect("rgba(255,255,255,0.15)", x, y, 0.13, h, 0.01); k.oval(b, 0.13, -0.02, 0.03); },
  stool(g, a, b) { const k = kit(g); k.line(a, 0.05, [-0.14, -0.06, -0.22, 0.42]); k.line(a, 0.05, [0.14, -0.06, 0.22, 0.42]); k.line(a, 0.035, [-0.18, 0.22, 0.18, 0.22]); k.rect(b, -0.26, -0.16, 0.52, 0.12, 0.05); },
  bench(g, a, b) { const k = kit(g); for (const x of [-0.36, 0.3]) { k.rect(b, x, -0.26, 0.06, 0.68, 0.01); } for (const y of [-0.24, -0.12]) k.rect(a, -0.44, y, 0.88, 0.08, 0.02); k.rect(a, -0.46, 0.08, 0.92, 0.09, 0.02); k.rect(b, -0.4, 0.17, 0.06, 0.03); },
  plantpot(g, a, b, live) { const k = kit(g); k.about(0, 0.1, beat(live, 0.5) * 0.04, () => { for (const [x, y, t] of [[-0.2, -0.16, -0.7], [0.2, -0.16, 0.7], [-0.1, -0.28, -0.3], [0.1, -0.28, 0.3], [0, -0.32, 0]]) k.oval(a, x, y, 0.07, 0.2, t); });
    k.poly(b, [-0.22, 0.08, 0.22, 0.08, 0.16, 0.44, -0.16, 0.44]); k.rect(b, -0.25, 0.04, 0.5, 0.08, 0.02); k.rect("rgba(0,0,0,0.12)", -0.22, 0.12, 0.44, 0.025); },
  picture(g, a, b) { const k = kit(g); k.line("#6b7280", 0.01, [-0.14, -0.3, 0, -0.44, 0.14, -0.3]); k.rect(a, -0.38, -0.3, 0.76, 0.6, 0.02); k.rect("#7dd3fc", -0.31, -0.23, 0.62, 0.46); g.save(); g.beginPath(); g.rect(-0.31, -0.23, 0.62, 0.46); g.clip(); k.poly("#6b7280", [-0.3, 0.23, -0.06, -0.1, 0.16, 0.23]); k.poly("#9ca3af", [0.0, 0.23, 0.18, -0.02, 0.36, 0.23]); k.oval(b, 0.18, -0.12, 0.06); k.rect("#22c55e", -0.31, 0.16, 0.62, 0.07); g.restore(); },
  washer(g, a, b, live) { const k = kit(g), t = live ? live.t * 5 : 0.5; k.rect(a, -0.3, -0.4, 0.6, 0.82, 0.04, true); k.rect("#d1d5db", -0.3, -0.4, 0.6, 0.14, 0.03); k.oval(b, 0.18, -0.33, 0.035); k.rect("#6b7280", -0.22, -0.36, 0.2, 0.06, 0.01);
    k.oval("#6b7280", 0, 0.08, 0.22); k.oval("#bfdbfe", 0, 0.08, 0.17); for (let i = 0; i < 3; i += 1) k.oval(["#ef4444", "#fde047", "#22c55e"][i], Math.cos(t + i * 2.1) * 0.08, 0.08 + Math.sin(t + i * 2.1) * 0.08, 0.05, 0.035, t + i); k.oval("rgba(255,255,255,0.35)", -0.06, 0.02, 0.05, 0.03, -0.6); },
};

const make = (set, drawers, list) => list.map(([id, name, top, bot]) => ({ id: `thing-${id}`, name, custom: "thing", set, top, bot, draw: drawers[id] }));
export const THINGS = [
  ...make("go", GO, [["car", "Car", "#ef4444", "#fde047"], ["bus", "Bus", "#fbbf24", "#1f2937"], ["truck", "Truck", "#3b82f6", "#e5e7eb"], ["fireengine", "Fire engine", "#dc2626", "#e5e7eb"], ["tractor", "Tractor", "#16a34a", "#fde047"], ["train", "Train", "#2563eb", "#dc2626"], ["bicycle", "Bicycle", "#ef4444", "#1f2937"], ["scooter", "Scooter", "#8b5cf6", "#1f2937"], ["motorbike", "Motorbike", "#f97316", "#1f2937"], ["skateboard", "Skateboard", "#22c55e", "#fde047"], ["plane", "Airplane", "#f1f5f9", "#ef4444"], ["helicopter", "Helicopter", "#f97316", "#1f2937"], ["rocket", "Rocket", "#f1f5f9", "#ef4444"], ["hotair", "Hot-air balloon", "#ef4444", "#fde047"], ["sailboat", "Sailing boat", "#2563eb", "#ef4444"], ["ship", "Ship", "#1e3a8a", "#ef4444"], ["submarine", "Submarine", "#fbbf24", "#f97316"], ["ufo", "Flying saucer", "#9ca3af", "#fde047"]]),
  ...make("nature", NATURE, [["tree", "Tree", "#22c55e", "#8b5a2b"], ["pine", "Pine tree", "#15803d", "#8b5a2b"], ["palm", "Palm tree", "#22c55e", "#b08968"], ["fruittree", "Fruit tree", "#22c55e", "#ef4444"], ["bush", "Bush", "#16a34a", "#ef4444"], ["flower", "Flower", "#f472b6", "#fde047"], ["tulip", "Tulip", "#ef4444", "#b91c1c"], ["sunflower", "Sunflower", "#fde047", "#7a4a12"], ["mushroom", "Mushroom", "#ef4444", "#ffffff"], ["cactus", "Cactus", "#22c55e", "#f472b6"], ["sun", "Sun", "#fbbf24", "#fb923c"], ["moon", "Moon", "#fde68a", "#fbbf24"], ["star", "Star", "#fde047", "#fb923c"], ["cloud", "Cloud", "#ffffff", "#b6c2d1"], ["raincloud", "Rain cloud", "#9ca3af", "#3b82f6"], ["rainbow", "Rainbow", "#ffffff", "#b6c2d1"], ["snowflake", "Snowflake", "#7dd3fc", "#e0f2fe"], ["mountain", "Mountain", "#6b7280", "#ffffff"], ["volcano", "Volcano", "#7a5230", "#f97316"], ["rock", "Rock", "#9ca3af", "#d1d5db"], ["leaf", "Leaf", "#22c55e", "#15803d"], ["fire", "Campfire", "#f97316", "#fde047"], ["lightning", "Lightning", "#fde047", "#6b7280"]]),
  ...make("build", THING, [["house", "House", "#fde68a", "#dc2626"], ["castle", "Castle", "#9ca3af", "#dc2626"], ["tent", "Tent", "#f97316", "#7c2d12"], ["igloo", "Igloo", "#f1f5f9", "#93c5fd"], ["lighthouse", "Lighthouse", "#f8fafc", "#dc2626"], ["windmill", "Windmill", "#fef3c7", "#f8fafc"]]),
  ...make("build", BUILD, [["cabin", "Log cabin", "#b45309", "#7a4a12"], ["flats", "Block of flats", "#f59e0b", "#7a4a12"], ["skyscraper", "Skyscraper", "#64748b", "#bae6fd"], ["school", "School", "#fca5a5", "#b91c1c"], ["shop", "Shop", "#fde68a", "#ef4444"], ["hospital", "Hospital", "#f8fafc", "#2563eb"], ["barn", "Barn", "#dc2626", "#f8fafc"], ["factory", "Factory", "#9ca3af", "#b45309"], ["garage", "Garage", "#e5e7eb", "#3b82f6"], ["clocktower", "Clock tower", "#d6b38a", "#7c2d12"], ["treehouse", "Tree house", "#d97706", "#dc2626"], ["beachhut", "Beach hut", "#38bdf8", "#f8fafc"], ["pyramid", "Pyramid", "#fbbf24", "#d97706"], ["bridge", "Bridge", "#9ca3af", "#6b7280"], ["well", "Well", "#9ca3af", "#b91c1c"]]),
  ...make("food", THING, [["apple", "Apple", "#ef4444", "#22c55e"], ["banana", "Banana", "#fde047", "#7a4a12"], ["carrot", "Carrot", "#f97316", "#22c55e"]]),
  ...make("food", FOOD, [["orange", "Orange", "#fb923c", "#22c55e"], ["pear", "Pear", "#a3e635", "#22c55e"], ["strawberry", "Strawberry", "#ef4444", "#22c55e"], ["grapes", "Grapes", "#8b5cf6", "#22c55e"], ["watermelon", "Watermelon", "#ef4444", "#16a34a"], ["cherries", "Cherries", "#dc2626", "#16a34a"], ["lemon", "Lemon", "#fde047", "#22c55e"], ["pineapple", "Pineapple", "#fbbf24", "#16a34a"], ["tomato", "Tomato", "#ef4444", "#16a34a"], ["corn", "Corn on the cob", "#fde047", "#22c55e"], ["broccoli", "Broccoli", "#16a34a", "#86efac"], ["bread", "Loaf of bread", "#d6a15c", "#e9c891"], ["cheese", "Cheese", "#fbbf24", "#fde68a"], ["egg", "Fried egg", "#ffffff", "#fbbf24"], ["sandwich", "Sandwich", "#d6a15c", "#22c55e"], ["burger", "Burger", "#e2a55a", "#22c55e"], ["hotdog", "Hot dog", "#e2a55a", "#fde047"], ["fries", "Fries", "#ef4444", "#fde047"]]),
  ...make("food", THING, [["pizza", "Pizza slice", "#fde047", "#dc2626"]]),
  ...make("food", FOOD, [["popcorn", "Popcorn", "#f8fafc", "#ef4444"], ["juice", "Glass of juice", "#fb923c", "#ef4444"], ["cookie", "Cookie", "#d6a15c", "#7a4a12"], ["doughnut", "Doughnut", "#f472b6", "#fde047"]]),
  ...make("food", THING, [["cake", "Birthday cake", "#f9a8d4", "#ffffff"], ["cupcake", "Cupcake", "#f9a8d4", "#7dd3fc"], ["icecream", "Ice cream", "#f9a8d4", "#fef3c7"], ["lollipop", "Lollipop", "#ef4444", "#ffffff"]]),
  ...make("home", THING, [["chair", "Chair", "#b45309", "#dc2626"], ["table", "Table", "#b45309", "#d97706"]]),
  ...make("home", HOME, [["stool", "Stool", "#b45309", "#22c55e"], ["bench", "Bench", "#d97706", "#374151"], ["sofa", "Sofa", "#3b82f6", "#60a5fa"], ["armchair", "Armchair", "#ef4444", "#f87171"], ["bed", "Bed", "#8b5cf6", "#c4b5fd"], ["desk", "Desk with a lamp", "#b45309", "#ef4444"], ["bookshelf", "Bookshelf", "#b45309", "#ec4899"], ["wardrobe", "Wardrobe", "#92400e", "#fbbf24"], ["drawers", "Chest of drawers", "#d97706", "#fde047"], ["floorlamp", "Floor lamp", "#fde68a", "#6b7280"], ["tv", "Television", "#374151", "#ef4444"], ["fridge", "Fridge", "#f1f5f9", "#9ca3af"], ["cooker", "Stove", "#f1f5f9", "#ef4444"], ["washer", "Washing machine", "#f1f5f9", "#3b82f6"], ["bath", "Bath", "#f8fafc", "#fbbf24"], ["mirror", "Mirror", "#fbbf24", "#b45309"], ["rug", "Rug", "#dc2626", "#fde047"], ["window", "Window", "#f8fafc", "#f472b6"], ["door", "Door", "#16a34a", "#fbbf24"], ["picture", "Picture", "#b45309", "#fde047"], ["plantpot", "Pot plant", "#22c55e", "#c2622d"]]),
  ...make("thing", THING, [["fence", "Fence", "#f1f5f9", "#d6d3d1"], ["signpost", "Signpost", "#22c55e", "#3b82f6"], ["trafficlight", "Traffic light", "#374151", "#6b7280"], ["ball", "Ball", "#ef4444", "#fde047"], ["football", "Football", "#ffffff", "#1f2937"], ["beachball", "Beach ball", "#ef4444", "#3b82f6"], ["balloon", "Balloon", "#ef4444", "#ffffff"], ["kite", "Kite", "#f97316", "#3b82f6"], ["present", "Present", "#3b82f6", "#fde047"], ["crown", "Crown", "#fbbf24", "#dc2626"], ["book", "Book", "#2563eb", "#fde047"], ["pencil", "Pencil", "#fbbf24", "#f472b6"], ["lightbulb", "Light bulb", "#fde047", "#9ca3af"], ["clock", "Clock", "#ef4444", "#ef4444"], ["key", "Key", "#fbbf24", "#b45309"], ["heart", "Heart", "#ef4444", "#fecaca"], ["gem", "Gem", "#38bdf8", "#bae6fd"], ["bell", "Bell", "#fbbf24", "#b45309"], ["drum", "Drum", "#dc2626", "#fde047"], ["guitar", "Guitar", "#d97706", "#1f2937"], ["trophy", "Trophy", "#fbbf24", "#7a4a12"], ["umbrella", "Umbrella", "#8b5cf6", "#c4b5fd"], ["chest", "Treasure chest", "#92400e", "#fbbf24"], ["flag", "Pennant flag", "#8b5cf6", "#fde047"]]),
];

/** Draws a thing one unit across at the origin (the caller has already scaled). a and b are its two colours. */
export function drawThing(g, d, a, b, live = null) { g.save(); d.draw(g, a, b, live); g.restore(); }
