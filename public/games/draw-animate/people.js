// Draw & Animate: hand-drawn people. Each is a simple cartoon figure drawn by drawPerson() from a few choices:
// a pose, a hairstyle, clothes, and (chosen by the child) one of six skin tones and a hair colour.
// A person on a drawing is stored as { fig: id, sk: skin index, hc: hair index or -1 for the figure's own, w: height, p: [x, y] },
// with tc and bc (top and bottom clothing colours) when the child chose their own.
// Figures that move (walking, running, the wheelchair) are drawn facing right.

export const SKINS = [["#ffe0bd", "Light"], ["#f6cfa0", "Light medium"], ["#e0ac69", "Medium"], ["#c68642", "Medium deep"], ["#8d5524", "Deep"], ["#5a3620", "Very deep"]];
export const HAIRS = [["#1f1b1a", "Black"], ["#4a2f1d", "Dark brown"], ["#8b5a2b", "Brown"], ["#e2b653", "Blonde"], ["#c0562a", "Red"], ["#b9bcc2", "Grey"]];

// pose: where the hands, elbows, knees and feet are, for a figure one unit tall with its middle at (0, 0)
const P = {
  stand: { ha: [-0.2, 0.1], ea: [-0.19, -0.04], hb: [0.2, 0.1], eb: [0.19, -0.04], ka: [-0.07, 0.3], fa: [-0.07, 0.46], kb: [0.07, 0.3], fb: [0.07, 0.46] },
  wave: { ha: [-0.2, 0.1], ea: [-0.19, -0.04], hb: [0.27, -0.42], eb: [0.25, -0.2], ka: [-0.07, 0.3], fa: [-0.07, 0.46], kb: [0.07, 0.3], fb: [0.07, 0.46] },
  walk: { ha: [0.13, 0.08], ea: [0.02, -0.03], hb: [-0.17, 0.06], eb: [-0.14, -0.05], ka: [-0.07, 0.3], fa: [-0.15, 0.45], kb: [0.09, 0.29], fb: [0.15, 0.45] },
  run: { ha: [0.26, -0.15], ea: [0.15, -0.03], hb: [-0.25, 0.07], eb: [-0.19, -0.05], ka: [-0.1, 0.3], fa: [-0.27, 0.31], kb: [0.15, 0.25], fb: [0.2, 0.45] },
  jump: { ha: [-0.27, -0.42], ea: [-0.24, -0.22], hb: [0.27, -0.42], eb: [0.24, -0.22], ka: [-0.13, 0.27], fa: [-0.2, 0.39], kb: [0.13, 0.27], fb: [0.2, 0.39] },
  dance: { ha: [-0.29, -0.1], ea: [-0.2, -0.14], hb: [0.24, -0.44], eb: [0.24, -0.22], ka: [-0.08, 0.3], fa: [-0.08, 0.46], kb: [0.15, 0.25], fb: [0.27, 0.34] },
  cheer: { ha: [-0.22, -0.46], ea: [-0.2, -0.26], hb: [0.22, -0.46], eb: [0.2, -0.26], ka: [-0.07, 0.3], fa: [-0.07, 0.46], kb: [0.07, 0.3], fb: [0.07, 0.46] },
  point: { ha: [-0.2, 0.1], ea: [-0.19, -0.04], hb: [0.35, -0.22], eb: [0.22, -0.16], ka: [-0.07, 0.3], fa: [-0.07, 0.46], kb: [0.07, 0.3], fb: [0.07, 0.46] },
  hips: { ha: [-0.13, 0.06], ea: [-0.25, -0.05], hb: [0.13, 0.06], eb: [0.25, -0.05], ka: [-0.08, 0.3], fa: [-0.09, 0.46], kb: [0.08, 0.3], fb: [0.09, 0.46] },
  kick: { ha: [-0.25, -0.02], ea: [-0.19, -0.09], hb: [0.2, 0.05], eb: [0.18, -0.06], ka: [-0.06, 0.3], fa: [-0.06, 0.46], kb: [0.14, 0.24], fb: [0.3, 0.3] },
  star: { ha: [-0.35, -0.2], ea: [-0.22, -0.18], hb: [0.35, -0.2], eb: [0.22, -0.18], ka: [-0.12, 0.3], fa: [-0.2, 0.46], kb: [0.12, 0.3], fb: [0.2, 0.46] },
  sit: { ha: [-0.17, 0.15], ea: [-0.2, 0.0], hb: [0.16, 0.05], eb: [0.2, -0.05], ka: [0.2, 0.1], fa: [0.38, 0.12], kb: [0.2, 0.14], fb: [0.38, 0.17] },
  think: { ha: [0.09, -0.03], ea: [-0.15, -0.02], hb: [0.07, -0.21], eb: [0.21, -0.09], ka: [-0.07, 0.3], fa: [-0.07, 0.46], kb: [0.07, 0.3], fb: [0.07, 0.46] },
  chair: { ha: [0.02, 0.14], ea: [-0.12, 0.0], hb: [0.2, -0.02], eb: [0.14, -0.08], ka: [0.17, 0.14], fa: [0.2, 0.38], kb: [0.17, 0.14], fb: [0.2, 0.38], chair: true },
  chairwave: { ha: [0.02, 0.14], ea: [-0.12, 0.0], hb: [0.27, -0.42], eb: [0.25, -0.2], ka: [0.17, 0.14], fa: [0.2, 0.38], kb: [0.17, 0.14], fb: [0.2, 0.38], chair: true },
};
// hair: 0 black, 1 dark brown, 2 brown, 3 blonde, 4 red, 5 grey.  bottom: "long" trousers, "short" shorts, "skirt"
export const PEOPLE = [
  { id: "stand1", name: "Standing", pose: "stand", hair: "short", hc: 1, top: "#3b82f6", bot: "#374151", kind: "long" },
  { id: "wave1", name: "Waving", pose: "wave", hair: "long", hc: 0, top: "#ec6aa0", bot: "#8a5ce0", kind: "skirt" },
  { id: "walk1", name: "Walking", pose: "walk", hair: "curly", hc: 0, top: "#2fb36d", bot: "#1f2937", kind: "long" },
  { id: "run1", name: "Running", pose: "run", hair: "bunches", hc: 2, top: "#f5d90a", bot: "#e5484d", kind: "short" },
  { id: "jump1", name: "Jumping", pose: "jump", hair: "short", hc: 4, top: "#e5484d", bot: "#3b82f6", kind: "short" },
  { id: "dance1", name: "Dancing", pose: "dance", hair: "long", hc: 3, top: "#8a5ce0", bot: "#8a5ce0", kind: "skirt" },
  { id: "run2", name: "Running, curly hair", pose: "run", hair: "curly", hc: 1, top: "#f5a623", bot: "#1f2937", kind: "short" },
  { id: "jump2", name: "Jumping, braids", pose: "jump", hair: "braids", hc: 0, top: "#14b8a6", bot: "#ec6aa0", kind: "skirt" },
  { id: "wave2", name: "Waving, headscarf", pose: "wave", hair: "scarf", hc: 0, top: "#a78bfa", bot: "#4b5563", kind: "skirt", scarf: "#0d9488" },
  { id: "walk2", name: "Walking, cap", pose: "walk", hair: "cap", hc: 2, top: "#f97316", bot: "#3b82f6", kind: "long", cap: "#e5484d" },
  { id: "chair1", name: "Wheelchair user", pose: "chair", hair: "short", hc: 0, top: "#2fb36d", bot: "#374151", kind: "long" },
  { id: "chair2", name: "Wheelchair user, waving", pose: "chairwave", hair: "long", hc: 2, top: "#f5d90a", bot: "#8a5ce0", kind: "long" },
  { id: "gran", name: "Grandma", pose: "wave", hair: "bun", hc: 5, top: "#14b8a6", bot: "#6b7280", kind: "skirt", specs: true },
  { id: "grandad", name: "Grandad", pose: "stand", hair: "thin", hc: 5, top: "#b45309", bot: "#374151", kind: "long", specs: true },
  { id: "dance2", name: "Dancing, curly hair", pose: "dance", hair: "curly", hc: 0, top: "#e5484d", bot: "#f5d90a", kind: "long" },
  { id: "stand2", name: "Standing, bunches", pose: "stand", hair: "bunches", hc: 3, top: "#ec6aa0", bot: "#3b82f6", kind: "short" },
  { id: "cheer1", name: "Cheering, ponytail", pose: "cheer", hair: "ponytail", hc: 2, top: "#f5a623", bot: "#3b82f6", kind: "long" },
  { id: "point1", name: "Pointing", pose: "point", hair: "short", hc: 0, top: "#14b8a6", bot: "#374151", kind: "long" },
  { id: "hips1", name: "Hands on hips, puffs", pose: "hips", hair: "puffs", hc: 0, top: "#f5d90a", bot: "#ec6aa0", kind: "skirt" },
  { id: "kick1", name: "Kicking a ball", pose: "kick", hair: "short", hc: 1, top: "#e5484d", bot: "#1f2937", kind: "short", ball: true },
  { id: "star1", name: "Star jump", pose: "star", hair: "bob", hc: 4, top: "#3b82f6", bot: "#8a5ce0", kind: "short" },
  { id: "sit1", name: "Sitting", pose: "sit", hair: "curly", hc: 1, top: "#2fb36d", bot: "#3b82f6", kind: "long" },
  { id: "think1", name: "Thinking", pose: "think", hair: "bob", hc: 0, top: "#8a5ce0", bot: "#374151", kind: "long", specs: true },
  { id: "turban1", name: "Waving, turban", pose: "wave", hair: "turban", hc: 0, top: "#f97316", bot: "#374151", kind: "long", scarf: "#2563eb", beard: true },
  { id: "dad", name: "Hands on hips, beard", pose: "hips", hair: "short", hc: 1, top: "#0d9488", bot: "#374151", kind: "long", beard: true },
  { id: "locs1", name: "Walking, locs", pose: "walk", hair: "locs", hc: 0, top: "#ec6aa0", bot: "#1f2937", kind: "long" },
  { id: "cane1", name: "Walking with a white cane", pose: "walk", hair: "bob", hc: 2, top: "#3b82f6", bot: "#6b7280", kind: "long", cane: true },
  { id: "cheer2", name: "Cheering, headscarf", pose: "cheer", hair: "scarf", hc: 0, top: "#f5d90a", bot: "#8a5ce0", kind: "skirt", scarf: "#be185d" },
  { id: "kick2", name: "Kicking a ball, ponytail", pose: "kick", hair: "ponytail", hc: 3, top: "#2fb36d", bot: "#f97316", kind: "short", ball: true },
  { id: "sit2", name: "Sitting, bunches", pose: "sit", hair: "bunches", hc: 2, top: "#a78bfa", bot: "#f5a623", kind: "short" },
  { id: "dance3", name: "Dancing, puffs", pose: "dance", hair: "puffs", hc: 1, top: "#14b8a6", bot: "#f5d90a", kind: "skirt" },
  { id: "run3", name: "Running, locs", pose: "run", hair: "locs", hc: 1, top: "#3b82f6", bot: "#e5484d", kind: "short" },
];
// Story characters: the same figures in costume. `fit` shrinks a figure a little so a tall hat stays inside its box.
// Extra parts: hat, back (cape or wings), hold (something in the near hand), and small touches such as a belt or a mask.
export const CHARACTERS = [
  { id: "santa", name: "Santa Claus", pose: "wave", hair: "none", hc: 5, top: "#d62839", bot: "#d62839", kind: "long", hat: "santa", bigbeard: "#ffffff", belt: true, trim: true, fit: 0.86 },
  { id: "mrsclaus", name: "Mrs Claus", pose: "hips", hair: "bun", hc: 5, top: "#d62839", bot: "#d62839", kind: "robe", specs: true, trim: true, apron: true, fit: 0.92 },
  { id: "elf", name: "Elf", pose: "cheer", hair: "short", hc: 2, top: "#2fb36d", bot: "#d62839", kind: "long", hat: "elf", ears: true, belt: true, fit: 0.84 },
  { id: "pirate", name: "Pirate", pose: "hips", hair: "short", hc: 0, top: "#f4f4f5", bot: "#374151", kind: "long", hat: "pirate", patch: true, beard: true, stripes: "#d62839", belt: true, fit: 0.94 },
  { id: "princess", name: "Princess", pose: "wave", hair: "long", hc: 3, top: "#ec6aa0", bot: "#f7a8c9", kind: "robe", hat: "crown", fit: 0.9 },
  { id: "king", name: "King", pose: "hips", hair: "short", hc: 1, top: "#7c3aed", bot: "#374151", kind: "long", hat: "crown", beard: true, back: "cape", backc: "#d62839", fit: 0.9 },
  { id: "wizard", name: "Wizard", pose: "point", hair: "none", hc: 5, top: "#5b3fd1", bot: "#5b3fd1", kind: "robe", hat: "wizard", bigbeard: "#e5e7eb", hold: "wand", fit: 0.8 },
  { id: "witch", name: "Witch", pose: "wave", hair: "long", hc: 0, top: "#2b2140", bot: "#2b2140", kind: "robe", hat: "witch", hold: "wand", fit: 0.8 },
  { id: "fairy", name: "Fairy", pose: "dance", hair: "bunches", hc: 4, top: "#7dd3fc", bot: "#a7f3d0", kind: "skirt", back: "wings", backc: "#e0f2fe", hold: "wand" },
  { id: "hero", name: "Superhero", pose: "hips", hair: "short", hc: 0, top: "#2563eb", bot: "#d62839", kind: "long", back: "cape", backc: "#d62839", mask: "#111827", emblem: "#f5d90a" },
  { id: "knight", name: "Knight", pose: "stand", hair: "none", hc: 0, top: "#9ca3af", bot: "#6b7280", kind: "long", hat: "helmet", hold: "sword", shield: "#d62839" },
  { id: "clown", name: "Clown", pose: "star", hair: "curly", hc: 4, top: "#f5d90a", bot: "#2563eb", kind: "long", nose: true, bow: "#d62839", dots: "#d62839", hairc: "#f97316" },
  { id: "astronaut", name: "Astronaut", pose: "wave", hair: "short", hc: 0, top: "#f4f4f5", bot: "#e5e7eb", kind: "long", hat: "astro", emblem: "#2563eb", outline: true },
  { id: "mermaid", name: "Mermaid", pose: "wave", hair: "long", hc: 4, top: "#a78bfa", bot: "#14b8a6", kind: "tail" },
  { id: "ninja", name: "Ninja", pose: "kick", hair: "none", hc: 0, top: "#1f2937", bot: "#1f2937", kind: "long", hat: "ninja", belt: "#d62839", nomouth: true },
  { id: "cowboy", name: "Cowboy", pose: "hips", hair: "short", hc: 2, top: "#b45309", bot: "#1e40af", kind: "long", hat: "cowboy", bow: "#d62839", belt: true, fit: 0.94 },
  { id: "angel", name: "Angel", pose: "cheer", hair: "long", hc: 3, top: "#f8fafc", bot: "#f8fafc", kind: "robe", hat: "halo", back: "wings", backc: "#ffffff", outline: true, fit: 0.9 },
  { id: "chef", name: "Chef", pose: "point", hair: "short", hc: 1, top: "#f8fafc", bot: "#374151", kind: "long", hat: "chef", apron: true, outline: true, fit: 0.84 },
];
export const personById = (id) => PEOPLE.find((x) => x.id === id) || CHARACTERS.find((x) => x.id === id) || PEOPLE[0];

/** Draws a person `h` pixels tall with its middle at the origin. `fig` is { fig: id, sk, hc }. */
export function drawPerson(g, fig, h) {
  const own = personById(fig.fig), d = { ...own, top: fig.tc || own.top, bot: fig.bc || own.bot }, pose = P[d.pose], skin = (SKINS[fig.sk] || SKINS[2])[0], hair = own.hairc || (HAIRS[fig.hc >= 0 ? fig.hc : d.hc] || HAIRS[0])[0];
  const limb = 0.062, HEAD = [0, -0.34], R = 0.135, sh = [0, -0.17], hipA = [-0.06, 0.1], hipB = [0.06, 0.1];
  g.save(); g.scale(h, h); g.lineCap = "round"; g.lineJoin = "round";
  if (d.fit) { g.translate(0, (1 - d.fit) * 0.46); g.scale(d.fit, d.fit); } // feet stay on the ground; the hat comes down inside the box
  const poly = (c, pts) => { g.fillStyle = c; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i += 1) g.lineTo(pts[i][0], pts[i][1]); g.closePath(); g.fill(); };
  const edge = () => { if (d.outline) { g.strokeStyle = "#9ca3af"; g.lineWidth = 0.01; g.stroke(); } }; // white clothes get a thin grey edge so they show on white paper
  const line = (c, w, pts) => { g.strokeStyle = c; g.lineWidth = w; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i += 1) g.lineTo(pts[i][0], pts[i][1]); g.stroke(); };
  const disc = (c, x, y, r, ry = r) => { g.fillStyle = c; g.beginPath(); g.ellipse(x, y, r, ry, 0, 0, Math.PI * 2); g.fill(); };
  const shoe = (f) => disc("#2b2f3a", f[0] + 0.02, f[1] + 0.012, 0.05, 0.028);
  const arm = (e, hand) => { line(d.top, limb, [[sh[0] + Math.sign(e[0] || 1) * 0.1, sh[1] + 0.02], e]); line(skin, limb * 0.9, [e, hand]); disc(skin, hand[0], hand[1], 0.036); };
  const leg = (hip, k, f) => {
    if (d.kind === "long") line(d.bot, limb * 1.1, [hip, k, f]);
    else { line(skin, limb, [hip, k, f]); if (d.kind === "short") line(d.bot, limb * 1.25, [hip, [(hip[0] + k[0]) / 2, (hip[1] + k[1]) / 2]]); }
    shoe(f);
  };
  if (d.back === "cape") poly(d.backc, [[-0.12, -0.2], [0.12, -0.2], [0.24, 0.34], [-0.24, 0.34]]);
  if (d.back === "wings") { g.fillStyle = d.backc; g.strokeStyle = "#93c5fd"; g.lineWidth = 0.012; for (const sx of [-1, 1]) { g.beginPath(); g.ellipse(sx * 0.2, -0.14, 0.11, 0.2, sx * 0.5, 0, Math.PI * 2); g.fill(); g.stroke(); g.beginPath(); g.ellipse(sx * 0.17, 0.06, 0.08, 0.12, sx * -0.4, 0, Math.PI * 2); g.fill(); g.stroke(); } }
  if (d.hat === "astro") { g.fillStyle = "#f4f4f5"; g.beginPath(); g.arc(HEAD[0], HEAD[1], R * 1.36, 0, Math.PI * 2); g.fill(); g.strokeStyle = "#9ca3af"; g.lineWidth = 0.014; g.stroke(); disc("#bfe3ff", HEAD[0], HEAD[1], R * 1.14); }
  // the wheelchair goes behind the person
  if (pose.chair) { g.strokeStyle = "#4b5563"; g.lineWidth = 0.022; g.beginPath(); g.arc(-0.03, 0.27, 0.2, 0, Math.PI * 2); g.stroke(); g.lineWidth = 0.012; g.beginPath(); for (let i = 0; i < 6; i += 1) { const a = (i * Math.PI) / 3; g.moveTo(-0.03, 0.27); g.lineTo(-0.03 + Math.cos(a) * 0.2, 0.27 + Math.sin(a) * 0.2); } g.stroke(); line("#4b5563", 0.026, [[-0.15, -0.16], [-0.13, 0.14], [0.17, 0.16]]); line("#4b5563", 0.02, [[0.17, 0.16], [0.21, 0.4]]); g.strokeStyle = "#4b5563"; g.lineWidth = 0.02; g.beginPath(); g.arc(0.2, 0.43, 0.045, 0, Math.PI * 2); g.stroke(); }
  // long hair and headscarves fall behind the body
  if (d.hair === "long") { g.fillStyle = hair; g.beginPath(); g.moveTo(-0.17, -0.38); g.quadraticCurveTo(-0.2, -0.1, -0.15, -0.06); g.lineTo(0.15, -0.06); g.quadraticCurveTo(0.2, -0.1, 0.17, -0.38); g.fill(); }
  if (d.hair === "scarf") { g.fillStyle = d.scarf; g.beginPath(); g.moveTo(-0.17, -0.36); g.quadraticCurveTo(-0.21, -0.12, -0.14, -0.05); g.lineTo(0.14, -0.05); g.quadraticCurveTo(0.21, -0.12, 0.17, -0.36); g.fill(); }
  if (d.hair === "curly") disc(hair, HEAD[0], HEAD[1] - 0.02, R * 1.42);
  if (d.hair === "bob") { g.fillStyle = hair; g.beginPath(); g.moveTo(-0.165, -0.38); g.quadraticCurveTo(-0.2, -0.24, -0.15, -0.2); g.lineTo(0.15, -0.2); g.quadraticCurveTo(0.2, -0.24, 0.165, -0.38); g.fill(); }
  if (d.hair === "ponytail") line(hair, 0.075, [[-0.1, -0.42], [-0.2, -0.32], [-0.22, -0.18]]);
  if (d.hair === "locs") { for (let i = 0; i < 7; i += 1) { const lx = -0.15 + i * 0.05; line(hair, 0.034, [[lx, -0.4], [lx * 1.12, -0.2 + Math.abs(lx) * 0.12]]); } }
  if (d.hair === "braids") { line(hair, 0.045, [[-0.13, -0.3], [-0.16, -0.08]]); line(hair, 0.045, [[0.13, -0.3], [0.16, -0.08]]); disc("#e5484d", -0.16, -0.07, 0.022); disc("#e5484d", 0.16, -0.07, 0.022); }
  arm(pose.ea, pose.ha); // the arm on the far side
  if (d.kind === "tail") { g.fillStyle = d.bot; g.beginPath(); g.moveTo(-0.125, 0.07); g.lineTo(0.125, 0.07); g.quadraticCurveTo(0.12, 0.26, 0.04, 0.37); g.lineTo(0.17, 0.48); g.quadraticCurveTo(0, 0.42, -0.17, 0.48); g.lineTo(-0.04, 0.37); g.quadraticCurveTo(-0.12, 0.26, -0.125, 0.07); g.fill(); g.strokeStyle = "rgba(255,255,255,0.45)"; g.lineWidth = 0.012; for (const yy of [0.14, 0.21, 0.28]) { g.beginPath(); g.arc(0, yy - 0.05, 0.09, Math.PI * 0.2, Math.PI * 0.8); g.stroke(); } }
  else { leg(hipA, pose.ka, pose.fa); leg(hipB, pose.kb, pose.fb); }
  // body
  if (d.kind === "robe") { g.fillStyle = d.bot; g.beginPath(); g.moveTo(-0.125, 0.07); g.lineTo(0.125, 0.07); g.lineTo(0.19, 0.44); g.lineTo(-0.19, 0.44); g.closePath(); g.fill(); edge(); }
  g.fillStyle = d.top; g.beginPath(); g.moveTo(-0.115, -0.2); g.lineTo(0.115, -0.2); g.quadraticCurveTo(0.135, -0.19, 0.125, 0.12); g.lineTo(-0.125, 0.12); g.quadraticCurveTo(-0.135, -0.19, -0.115, -0.2); g.fill(); edge();
  if (d.stripes) { g.strokeStyle = d.stripes; g.lineWidth = 0.03; for (const yy of [-0.14, -0.06, 0.02]) { g.beginPath(); g.moveTo(-0.118, yy); g.lineTo(0.118, yy); g.stroke(); } }
  if (d.dots) [[-0.05, -0.1], [0.06, -0.02], [-0.04, 0.05]].forEach(([dx, dy]) => disc(d.dots, dx, dy, 0.024));
  if (d.emblem) { disc(d.emblem, 0, -0.07, 0.05); }
  if (d.apron) { poly("#ffffff", [[-0.08, -0.12], [0.08, -0.12], [0.1, 0.13], [-0.1, 0.13]]); edge(); }
  if (d.trim) { g.strokeStyle = "#ffffff"; g.lineWidth = 0.035; g.beginPath(); g.moveTo(-0.125, 0.115); g.lineTo(0.125, 0.115); g.stroke(); if (d.kind === "robe") { g.beginPath(); g.moveTo(-0.185, 0.425); g.lineTo(0.185, 0.425); g.stroke(); } }
  if (d.kind === "robe" || d.kind === "tail") { /* drawn already */ }
  else if (d.kind === "skirt") { g.fillStyle = d.bot; g.beginPath(); g.moveTo(-0.125, 0.07); g.lineTo(0.125, 0.07); g.lineTo(pose.chair ? 0.22 : 0.2, pose.chair ? 0.2 : 0.3); g.lineTo(pose.chair ? -0.13 : -0.2, pose.chair ? 0.2 : 0.3); g.fill(); }
  else { g.fillStyle = d.bot; g.fillRect(-0.125, 0.07, 0.25, 0.06); }
  if (d.belt) { g.strokeStyle = typeof d.belt === "string" ? d.belt : "#111827"; g.lineWidth = 0.04; g.lineCap = "butt"; g.beginPath(); g.moveTo(-0.127, 0.07); g.lineTo(0.127, 0.07); g.stroke(); g.lineCap = "round"; if (d.belt === true) { g.fillStyle = "#f5d90a"; g.fillRect(-0.028, 0.047, 0.056, 0.046); g.fillStyle = "#111827"; g.fillRect(-0.012, 0.059, 0.024, 0.022); } }
  line(skin, 0.06, [[0, -0.24], [0, -0.19]]); // neck
  if (d.bow) { poly(d.bow, [[0, -0.19], [-0.07, -0.225], [-0.07, -0.155]]); poly(d.bow, [[0, -0.19], [0.07, -0.225], [0.07, -0.155]]); }
  if (d.shield) { const [hx, hy] = pose.ha; g.fillStyle = d.shield; g.beginPath(); g.moveTo(hx - 0.09, hy - 0.1); g.lineTo(hx + 0.09, hy - 0.1); g.lineTo(hx + 0.09, hy + 0.02); g.quadraticCurveTo(hx, hy + 0.14, hx - 0.09, hy + 0.02); g.closePath(); g.fill(); g.strokeStyle = "#f5d90a"; g.lineWidth = 0.014; g.stroke(); }
  arm(pose.eb, pose.hb); // the arm on the near side
  if (d.hold === "wand") { const [hx, hy] = pose.hb; line("#8b5a2b", 0.018, [[hx - 0.02, hy + 0.03], [hx + 0.09, hy - 0.13]]); g.fillStyle = "#f5d90a"; g.beginPath(); for (let i = 0; i < 10; i += 1) { const a1 = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? 0.022 : 0.052; g.lineTo(hx + 0.09 + Math.cos(a1) * rr, hy - 0.13 + Math.sin(a1) * rr); } g.fill(); }
  if (d.hold === "sword") { const [hx, hy] = pose.hb; line("#d1d5db", 0.026, [[hx, hy], [hx + 0.05, hy - 0.32]]); line("#8b5a2b", 0.03, [[hx - 0.045, hy - 0.035], [hx + 0.055, hy - 0.02]]); }
  if (d.ears) { poly(skin, [[-0.125, -0.37], [-0.2, -0.43], [-0.13, -0.31]]); poly(skin, [[0.125, -0.37], [0.2, -0.43], [0.13, -0.31]]); }
  // head, hair on top, face
  disc(skin, HEAD[0], HEAD[1], R);
  const cap = (c, lift = 0) => { g.fillStyle = c; g.beginPath(); g.arc(HEAD[0], HEAD[1] - lift, R * 1.04, Math.PI * 1.02, Math.PI * 1.98); g.quadraticCurveTo(0, HEAD[1] - R * 0.55 - lift, -R * 1.03, HEAD[1] - 0.008 - lift); g.fill(); };
  if (["short", "bunches", "bun", "braids", "long", "ponytail", "puffs", "bob", "locs"].includes(d.hair)) cap(hair);
  if (d.hair === "puffs") { disc(hair, -0.125, -0.47, 0.078); disc(hair, 0.125, -0.47, 0.078); }
  if (d.hair === "turban") { g.fillStyle = d.scarf; g.beginPath(); g.ellipse(HEAD[0], HEAD[1] - 0.075, R * 1.16, R * 0.86, 0, Math.PI * 0.98, Math.PI * 2.02); g.quadraticCurveTo(0, HEAD[1] - 0.105, -R * 1.16, HEAD[1] - 0.068); g.fill(); g.strokeStyle = "rgba(255,255,255,0.35)"; g.lineWidth = 0.012; g.beginPath(); g.moveTo(-0.1, -0.44); g.quadraticCurveTo(0, -0.52, 0.1, -0.44); g.stroke(); }
  if (d.hair === "curly") { for (let i = 0; i < 7; i += 1) { const a = Math.PI * (1.05 + (i * 0.9) / 6); disc(hair, HEAD[0] + Math.cos(a) * R * 0.98, HEAD[1] + Math.sin(a) * R * 0.98, R * 0.36); } }
  if (d.hair === "bunches") { disc(hair, -0.165, -0.33, 0.062); disc(hair, 0.165, -0.33, 0.062); }
  if (d.hair === "bun") disc(hair, 0, -0.5, 0.06);
  if (d.hair === "thin") { g.strokeStyle = hair; g.lineWidth = 0.03; g.beginPath(); g.arc(HEAD[0], HEAD[1], R * 0.98, Math.PI * 1.03, Math.PI * 1.3); g.stroke(); g.beginPath(); g.arc(HEAD[0], HEAD[1], R * 0.98, Math.PI * 1.7, Math.PI * 1.97); g.stroke(); }
  if (d.hair === "scarf") { g.fillStyle = d.scarf; g.beginPath(); g.arc(HEAD[0], HEAD[1], R * 1.12, Math.PI * 0.95, Math.PI * 2.05); g.quadraticCurveTo(0.1, -0.5, 0, -0.46); g.quadraticCurveTo(-0.1, -0.5, -R * 1.12, HEAD[1] + 0.02); g.fill(); disc(skin, HEAD[0], HEAD[1] + 0.012, R * 0.86, R * 0.92); line(d.scarf, 0.05, [[-0.1, -0.215], [0.1, -0.215]]); }
  if (d.hair === "cap") { cap(hair, -0.01); g.fillStyle = d.cap; g.beginPath(); g.arc(HEAD[0], HEAD[1] - 0.03, R * 1.06, Math.PI, 0); g.fill(); line(d.cap, 0.035, [[0.08, HEAD[1] - 0.035], [0.24, HEAD[1] - 0.03]]); }
  const top = HEAD[1] - R; // the top of the head
  if (d.hat === "santa") { poly("#d62839", [[-0.14, top + 0.05], [0.14, top + 0.05], [0.2, top - 0.02], [0.06, top - 0.13]]); line("#ffffff", 0.055, [[-0.14, top + 0.055], [0.14, top + 0.055]]); disc("#ffffff", 0.2, top - 0.01, 0.042); }
  if (d.hat === "elf") { poly("#2fb36d", [[-0.14, top + 0.06], [0.14, top + 0.06], [0.03, top - 0.2]]); line("#d62839", 0.04, [[-0.14, top + 0.06], [0.14, top + 0.06]]); disc("#f5d90a", 0.03, top - 0.2, 0.03); }
  if (d.hat === "pirate") { g.fillStyle = "#111827"; g.beginPath(); g.moveTo(-0.22, top + 0.06); g.quadraticCurveTo(0, top - 0.2, 0.22, top + 0.06); g.quadraticCurveTo(0, top + 0.01, -0.22, top + 0.06); g.fill(); disc("#ffffff", 0, top - 0.035, 0.03); line("#ffffff", 0.012, [[-0.035, top - 0.005], [0.035, top - 0.065]]); line("#ffffff", 0.012, [[-0.035, top - 0.065], [0.035, top - 0.005]]); }
  if (d.hat === "crown") { poly("#f5c518", [[-0.115, top + 0.05], [-0.115, top - 0.08], [-0.058, top - 0.02], [0, top - 0.1], [0.058, top - 0.02], [0.115, top - 0.08], [0.115, top + 0.05]]); disc("#d62839", 0, top + 0.01, 0.018); disc("#2563eb", -0.07, top + 0.015, 0.014); disc("#2563eb", 0.07, top + 0.015, 0.014); }
  if (d.hat === "wizard" || d.hat === "witch") { const c = d.hat === "wizard" ? "#5b3fd1" : "#1f1830"; poly(c, [[-0.13, top + 0.07], [0.13, top + 0.07], [0.05, top - 0.3]]); line(c, 0.045, [[-0.23, top + 0.075], [0.23, top + 0.075]]); if (d.hat === "wizard") { disc("#f5d90a", 0.02, top - 0.07, 0.022); disc("#f5d90a", -0.04, top + 0.0, 0.014); } else line("#7c3aed", 0.03, [[-0.12, top + 0.04], [0.12, top + 0.04]]); }
  if (d.hat === "helmet") { g.fillStyle = "#9ca3af"; g.beginPath(); g.arc(HEAD[0], HEAD[1], R * 1.1, 0, Math.PI * 2); g.fill(); g.fillStyle = "#1f2937"; g.fillRect(-0.1, -0.375, 0.2, 0.05); line("#6b7280", 0.02, [[0, -0.33], [0, -0.22]]); line("#d62839", 0.05, [[0, top - 0.01], [0.04, top - 0.1]]); }
  if (d.hat === "astro") { g.strokeStyle = "rgba(255,255,255,0.8)"; g.lineWidth = 0.02; g.beginPath(); g.arc(HEAD[0], HEAD[1], R * 1.24, Math.PI * 1.15, Math.PI * 1.45); g.stroke(); }
  if (d.hat === "cowboy") { g.fillStyle = "#8b5a2b"; g.beginPath(); g.ellipse(0, top + 0.05, 0.25, 0.04, 0, 0, Math.PI * 2); g.fill(); g.beginPath(); g.moveTo(-0.11, top + 0.05); g.quadraticCurveTo(-0.1, top - 0.11, 0, top - 0.08); g.quadraticCurveTo(0.1, top - 0.11, 0.11, top + 0.05); g.fill(); line("#5b3a1c", 0.02, [[-0.105, top + 0.02], [0.105, top + 0.02]]); }
  if (d.hat === "chef") { g.fillStyle = "#ffffff"; g.strokeStyle = "#9ca3af"; g.lineWidth = 0.01; g.beginPath(); g.moveTo(-0.1, top + 0.06); g.lineTo(-0.1, top - 0.08); g.arc(-0.07, top - 0.1, 0.06, Math.PI * 0.7, Math.PI * 1.6); g.arc(0, top - 0.13, 0.065, Math.PI * 1.1, Math.PI * 1.9); g.arc(0.07, top - 0.1, 0.06, Math.PI * 1.4, Math.PI * 0.3); g.lineTo(0.1, top + 0.06); g.closePath(); g.fill(); g.stroke(); }
  if (d.hat === "halo") { g.strokeStyle = "#f5c518"; g.lineWidth = 0.022; g.beginPath(); g.ellipse(0, top - 0.05, 0.11, 0.03, 0, 0, Math.PI * 2); g.stroke(); }
  if (d.hat === "ninja") { g.fillStyle = "#1f2937"; g.beginPath(); g.arc(HEAD[0], HEAD[1], R * 1.07, 0, Math.PI * 2); g.fill(); g.fillStyle = skin; g.beginPath(); g.ellipse(0, -0.347, 0.105, 0.034, 0, 0, Math.PI * 2); g.fill(); line("#d62839", 0.022, [[-0.13, -0.4], [-0.21, -0.36]]); }
  if (d.mask) { g.strokeStyle = d.mask; g.lineWidth = 0.055; g.beginPath(); g.moveTo(-0.115, -0.347); g.lineTo(0.115, -0.347); g.stroke(); disc("#ffffff", -0.05, -0.345, 0.024); disc("#ffffff", 0.05, -0.345, 0.024); }
  if (d.bigbeard) { g.fillStyle = d.bigbeard; g.beginPath(); g.moveTo(-0.128, -0.33); g.quadraticCurveTo(-0.15, -0.16, 0, -0.1); g.quadraticCurveTo(0.15, -0.16, 0.128, -0.33); g.quadraticCurveTo(0.06, -0.27, 0, -0.29); g.quadraticCurveTo(-0.06, -0.27, -0.128, -0.33); g.fill(); g.strokeStyle = "#9ca3af"; g.lineWidth = 0.008; g.stroke(); }
  if (d.beard) { g.strokeStyle = hair; g.lineWidth = 0.05; g.beginPath(); g.arc(HEAD[0], HEAD[1] + 0.01, R * 0.82, Math.PI * 0.12, Math.PI * 0.88); g.stroke(); }
  const dark = fig.sk >= 4 ? "#1a1210" : "#2b1d16";
  if (d.hat !== "helmet") { disc(dark, -0.05, -0.345, 0.016); disc(dark, 0.05, -0.345, 0.016); }
  if (d.patch) { disc("#111827", 0.05, -0.345, 0.036); line("#111827", 0.012, [[-0.12, -0.41], [0.13, -0.36]]); }
  if (!d.nomouth && d.hat !== "helmet") { g.strokeStyle = d.bigbeard ? "#b4534b" : dark; g.lineWidth = 0.014; g.beginPath(); g.arc(0, d.bigbeard ? -0.3 : -0.315, d.bigbeard ? 0.034 : 0.05, Math.PI * 0.18, Math.PI * 0.82); g.stroke(); }
  if (d.nose) disc("#e5484d", 0, -0.322, 0.03);
  if (d.cane) { line("#f4f4f5", 0.022, [pose.ha, [pose.ha[0] + 0.2, 0.47]]); line("#e5484d", 0.024, [[pose.ha[0] + 0.17, 0.42], [pose.ha[0] + 0.2, 0.47]]); disc(skin, pose.ha[0], pose.ha[1], 0.036); }
  if (d.ball) { disc("#ffffff", 0.4, 0.37, 0.065); g.strokeStyle = "#1f2937"; g.lineWidth = 0.012; g.beginPath(); g.arc(0.4, 0.37, 0.065, 0, Math.PI * 2); g.stroke(); disc("#1f2937", 0.4, 0.37, 0.022); }
  if (d.specs) { g.strokeStyle = "#374151"; g.lineWidth = 0.012; g.beginPath(); g.arc(-0.05, -0.345, 0.034, 0, Math.PI * 2); g.moveTo(0.084, -0.345); g.arc(0.05, -0.345, 0.034, 0, Math.PI * 2); g.moveTo(-0.016, -0.345); g.lineTo(0.016, -0.345); g.stroke(); }
  g.restore();
}
