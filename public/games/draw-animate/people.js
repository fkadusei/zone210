// Draw & Animate: hand-drawn people. Each is a simple cartoon figure drawn by drawPerson() from a few choices:
// a pose, a hairstyle, clothes, and (chosen by the child) one of six skin tones and a hair colour.
// A person on a drawing is stored as { fig: id, sk: skin index, hc: hair index or -1 for the figure's own, w: height, p: [x, y] }.
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
];
export const personById = (id) => PEOPLE.find((x) => x.id === id) || PEOPLE[0];

/** Draws a person `h` pixels tall with its middle at the origin. `fig` is { fig: id, sk, hc }. */
export function drawPerson(g, fig, h) {
  const d = personById(fig.fig), pose = P[d.pose], skin = (SKINS[fig.sk] || SKINS[2])[0], hair = (HAIRS[fig.hc >= 0 ? fig.hc : d.hc] || HAIRS[0])[0];
  const limb = 0.062, HEAD = [0, -0.34], R = 0.135, sh = [0, -0.17], hipA = [-0.06, 0.1], hipB = [0.06, 0.1];
  g.save(); g.scale(h, h); g.lineCap = "round"; g.lineJoin = "round";
  const line = (c, w, pts) => { g.strokeStyle = c; g.lineWidth = w; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i += 1) g.lineTo(pts[i][0], pts[i][1]); g.stroke(); };
  const disc = (c, x, y, r, ry = r) => { g.fillStyle = c; g.beginPath(); g.ellipse(x, y, r, ry, 0, 0, Math.PI * 2); g.fill(); };
  const shoe = (f) => disc("#2b2f3a", f[0] + 0.02, f[1] + 0.012, 0.05, 0.028);
  const arm = (e, hand) => { line(d.top, limb, [[sh[0] + Math.sign(e[0] || 1) * 0.1, sh[1] + 0.02], e]); line(skin, limb * 0.9, [e, hand]); disc(skin, hand[0], hand[1], 0.036); };
  const leg = (hip, k, f) => {
    if (d.kind === "long") line(d.bot, limb * 1.1, [hip, k, f]);
    else { line(skin, limb, [hip, k, f]); if (d.kind === "short") line(d.bot, limb * 1.25, [hip, [(hip[0] + k[0]) / 2, (hip[1] + k[1]) / 2]]); }
    shoe(f);
  };
  // the wheelchair goes behind the person
  if (pose.chair) { g.strokeStyle = "#4b5563"; g.lineWidth = 0.022; g.beginPath(); g.arc(-0.03, 0.27, 0.2, 0, Math.PI * 2); g.stroke(); g.lineWidth = 0.012; g.beginPath(); for (let i = 0; i < 6; i += 1) { const a = (i * Math.PI) / 3; g.moveTo(-0.03, 0.27); g.lineTo(-0.03 + Math.cos(a) * 0.2, 0.27 + Math.sin(a) * 0.2); } g.stroke(); line("#4b5563", 0.026, [[-0.15, -0.16], [-0.13, 0.14], [0.17, 0.16]]); line("#4b5563", 0.02, [[0.17, 0.16], [0.21, 0.4]]); g.strokeStyle = "#4b5563"; g.lineWidth = 0.02; g.beginPath(); g.arc(0.2, 0.43, 0.045, 0, Math.PI * 2); g.stroke(); }
  // long hair and headscarves fall behind the body
  if (d.hair === "long") { g.fillStyle = hair; g.beginPath(); g.moveTo(-0.17, -0.38); g.quadraticCurveTo(-0.2, -0.1, -0.15, -0.06); g.lineTo(0.15, -0.06); g.quadraticCurveTo(0.2, -0.1, 0.17, -0.38); g.fill(); }
  if (d.hair === "scarf") { g.fillStyle = d.scarf; g.beginPath(); g.moveTo(-0.17, -0.36); g.quadraticCurveTo(-0.21, -0.12, -0.14, -0.05); g.lineTo(0.14, -0.05); g.quadraticCurveTo(0.21, -0.12, 0.17, -0.36); g.fill(); }
  if (d.hair === "curly") disc(hair, HEAD[0], HEAD[1] - 0.02, R * 1.42);
  if (d.hair === "braids") { line(hair, 0.045, [[-0.13, -0.3], [-0.16, -0.08]]); line(hair, 0.045, [[0.13, -0.3], [0.16, -0.08]]); disc("#e5484d", -0.16, -0.07, 0.022); disc("#e5484d", 0.16, -0.07, 0.022); }
  arm(pose.ea, pose.ha); // the arm on the far side
  leg(hipA, pose.ka, pose.fa); leg(hipB, pose.kb, pose.fb);
  // body
  g.fillStyle = d.top; g.beginPath(); g.moveTo(-0.115, -0.2); g.lineTo(0.115, -0.2); g.quadraticCurveTo(0.135, -0.19, 0.125, 0.12); g.lineTo(-0.125, 0.12); g.quadraticCurveTo(-0.135, -0.19, -0.115, -0.2); g.fill();
  if (d.kind === "skirt") { g.fillStyle = d.bot; g.beginPath(); g.moveTo(-0.125, 0.07); g.lineTo(0.125, 0.07); g.lineTo(pose.chair ? 0.22 : 0.2, pose.chair ? 0.2 : 0.3); g.lineTo(pose.chair ? -0.13 : -0.2, pose.chair ? 0.2 : 0.3); g.fill(); }
  else { g.fillStyle = d.bot; g.fillRect(-0.125, 0.07, 0.25, 0.06); }
  line(skin, 0.06, [[0, -0.24], [0, -0.19]]); // neck
  arm(pose.eb, pose.hb); // the arm on the near side
  // head, hair on top, face
  disc(skin, HEAD[0], HEAD[1], R);
  const cap = (c, lift = 0) => { g.fillStyle = c; g.beginPath(); g.arc(HEAD[0], HEAD[1] - lift, R * 1.04, Math.PI * 1.02, Math.PI * 1.98); g.quadraticCurveTo(0, HEAD[1] - R * 0.55 - lift, -R * 1.03, HEAD[1] - 0.008 - lift); g.fill(); };
  if (d.hair === "short" || d.hair === "bunches" || d.hair === "bun" || d.hair === "braids" || d.hair === "long") cap(hair);
  if (d.hair === "curly") { for (let i = 0; i < 7; i += 1) { const a = Math.PI * (1.05 + (i * 0.9) / 6); disc(hair, HEAD[0] + Math.cos(a) * R * 0.98, HEAD[1] + Math.sin(a) * R * 0.98, R * 0.36); } }
  if (d.hair === "bunches") { disc(hair, -0.165, -0.33, 0.062); disc(hair, 0.165, -0.33, 0.062); }
  if (d.hair === "bun") disc(hair, 0, -0.5, 0.06);
  if (d.hair === "thin") { g.strokeStyle = hair; g.lineWidth = 0.03; g.beginPath(); g.arc(HEAD[0], HEAD[1], R * 0.98, Math.PI * 1.03, Math.PI * 1.3); g.stroke(); g.beginPath(); g.arc(HEAD[0], HEAD[1], R * 0.98, Math.PI * 1.7, Math.PI * 1.97); g.stroke(); }
  if (d.hair === "scarf") { g.fillStyle = d.scarf; g.beginPath(); g.arc(HEAD[0], HEAD[1], R * 1.12, Math.PI * 0.95, Math.PI * 2.05); g.quadraticCurveTo(0.1, -0.5, 0, -0.46); g.quadraticCurveTo(-0.1, -0.5, -R * 1.12, HEAD[1] + 0.02); g.fill(); disc(skin, HEAD[0], HEAD[1] + 0.012, R * 0.86, R * 0.92); line(d.scarf, 0.05, [[-0.1, -0.215], [0.1, -0.215]]); }
  if (d.hair === "cap") { cap(hair, -0.01); g.fillStyle = d.cap; g.beginPath(); g.arc(HEAD[0], HEAD[1] - 0.03, R * 1.06, Math.PI, 0); g.fill(); line(d.cap, 0.035, [[0.08, HEAD[1] - 0.035], [0.24, HEAD[1] - 0.03]]); }
  const dark = fig.sk >= 4 ? "#1a1210" : "#2b1d16";
  disc(dark, -0.05, -0.345, 0.016); disc(dark, 0.05, -0.345, 0.016);
  g.strokeStyle = dark; g.lineWidth = 0.014; g.beginPath(); g.arc(0, -0.315, 0.05, Math.PI * 0.18, Math.PI * 0.82); g.stroke();
  if (d.specs) { g.strokeStyle = "#374151"; g.lineWidth = 0.012; g.beginPath(); g.arc(-0.05, -0.345, 0.034, 0, Math.PI * 2); g.moveTo(0.084, -0.345); g.arc(0.05, -0.345, 0.034, 0, Math.PI * 2); g.moveTo(-0.016, -0.345); g.lineTo(0.016, -0.345); g.stroke(); }
  g.restore();
}
