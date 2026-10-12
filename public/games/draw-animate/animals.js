// Draw & Animate: hand-drawn animals. Most are a "critter": a sitting cartoon animal seen from the front, built from
// the same body, head and face with different ears, tails and markings. A few (fish, duck, turtle, butterfly, bee,
// bird) have their own drawing and face right. Every animal is one unit tall with its middle at the origin.
// `a` is the main colour and `b` the second colour: the child can change both (the Top and Bottom rows).

const DARK = "#1f2937";
function kit(g) {
  const oval = (c, x, y, rx, ry, turn = 0) => { g.fillStyle = c; g.beginPath(); g.ellipse(x, y, rx, ry, turn, 0, Math.PI * 2); g.fill(); };
  const tri = (c, p, q, r) => { g.fillStyle = c; g.beginPath(); g.moveTo(p[0], p[1]); g.lineTo(q[0], q[1]); g.lineTo(r[0], r[1]); g.closePath(); g.fill(); };
  const line = (c, w, pts) => { g.strokeStyle = c; g.lineWidth = w; g.lineCap = "round"; g.lineJoin = "round"; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i += 1) g.lineTo(pts[i][0], pts[i][1]); g.stroke(); };
  const curve = (c, w, p, q, r) => { g.strokeStyle = c; g.lineWidth = w; g.lineCap = "round"; g.beginPath(); g.moveTo(p[0], p[1]); g.quadraticCurveTo(q[0], q[1], r[0], r[1]); g.stroke(); };
  const edge = (x, y, rx, ry) => { g.strokeStyle = "#b6c2d1"; g.lineWidth = 0.012; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.stroke(); }; // so white fur shows on white paper
  return { oval, tri, line, curve, edge };
}

/** A sitting animal seen from the front. `o` says what kind of ears, tail, nose and markings it has. */
function critter(g, o, a, b) {
  const { oval, tri, line, curve, edge } = kit(g), limb = o.limb || a, ear = o.ear || a;
  for (const sx of [-1, 1]) { // ears and anything else behind the head
    if (o.ears === "long") { oval(ear, sx * 0.09, -0.4, 0.05, 0.15, sx * 0.12); oval(b, sx * 0.09, -0.39, 0.024, 0.1, sx * 0.12); }
    if (o.ears === "big") { oval(ear, sx * 0.25, -0.13, 0.14, 0.18); oval(b, sx * 0.26, -0.12, 0.08, 0.12); }
    if (o.ears === "side") { oval(ear, sx * 0.21, -0.15, 0.065, 0.065); oval(b, sx * 0.215, -0.15, 0.035, 0.035); }
    if (o.antlers) { line("#7a5230", 0.022, [[sx * 0.08, -0.31], [sx * 0.15, -0.46]]); line("#7a5230", 0.02, [[sx * 0.12, -0.39], [sx * 0.2, -0.41]]); line("#7a5230", 0.02, [[sx * 0.14, -0.43], [sx * 0.09, -0.48]]); }
    if (o.horns) tri("#fff4c2", [sx * 0.1, -0.31], [sx * 0.17, -0.44], [sx * 0.16, -0.29]);
  }
  if (o.tail === "long") { curve(limb, 0.05, [0.15, 0.36], [0.36, 0.38], [0.34, 0.14]); if (o.tuft) oval(o.tuft, 0.34, 0.12, 0.045, 0.055); }
  if (o.tail === "bushy") { oval(a, 0.27, 0.24, 0.1, 0.17, 0.5); oval(b, 0.33, 0.13, 0.055, 0.07, 0.5); }
  if (o.tail === "puff") oval(b, 0.19, 0.37, 0.065, 0.065);
  if (o.tail === "curly") { g.strokeStyle = a; g.lineWidth = 0.028; g.lineCap = "round"; g.beginPath(); g.arc(0.24, 0.3, 0.04, Math.PI * 0.9, Math.PI * 2.9); g.stroke(); }
  if (o.mane) oval(o.mane, 0, -0.14, 0.275, 0.275);
  oval(o.foot || limb, -0.1, 0.43, 0.085, 0.048); oval(o.foot || limb, 0.1, 0.43, 0.085, 0.048);
  oval(a, 0, 0.2, 0.19, 0.23); if (o.edge) edge(0, 0.2, 0.19, 0.23);
  oval(b, 0, 0.25, 0.12, 0.16);
  if (o.spots) [[-0.11, 0.1, 0.05], [0.12, 0.2, 0.045], [-0.08, 0.34, 0.04]].forEach(([x, y, r]) => oval(o.spots, x, y, r, r * 0.8));
  if (o.stripes) [[-0.15, 0.1], [-0.17, 0.22], [0.15, 0.1], [0.17, 0.22]].forEach(([x, y]) => line(o.stripes, 0.022, [[x, y], [x * 0.55, y + 0.02]]));
  oval(limb, -0.185, 0.17, 0.05, 0.1, 0.35); oval(limb, 0.185, 0.17, 0.05, 0.1, -0.35);
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

const OWN = {
  fish(g, a, b) {
    const { oval, tri, curve } = kit(g);
    tri(b, [-0.2, 0.0], [-0.44, -0.2], [-0.44, 0.2]); tri(b, [-0.02, -0.2], [0.14, -0.2], [-0.1, -0.36]); tri(b, [-0.02, 0.2], [0.1, 0.2], [-0.08, 0.32]);
    oval(a, 0.04, 0, 0.3, 0.22);
    for (const x of [-0.12, 0.0, 0.11]) curve("rgba(255,255,255,0.4)", 0.02, [x, -0.14], [x + 0.07, 0], [x, 0.14]);
    oval("#ffffff", 0.2, -0.06, 0.055, 0.055); oval(DARK, 0.21, -0.06, 0.028, 0.028); curve(DARK, 0.012, [0.27, 0.06], [0.3, 0.08], [0.33, 0.05]);
    oval("rgba(255,255,255,0.7)", 0.42, -0.2, 0.025, 0.025); oval("rgba(255,255,255,0.7)", 0.46, -0.3, 0.035, 0.035);
  },
  duck(g, a, b) {
    const { oval, tri, curve } = kit(g);
    tri(a, [-0.3, 0.1], [-0.44, -0.02], [-0.2, 0.0]);
    oval(a, -0.05, 0.14, 0.27, 0.19); oval(b, -0.09, 0.15, 0.14, 0.1, -0.2);
    oval("#f59e0b", -0.02, 0.4, 0.08, 0.035); oval("#f59e0b", 0.12, 0.4, 0.08, 0.035);
    oval(a, 0.16, -0.17, 0.15, 0.15);
    g.fillStyle = "#f59e0b"; g.beginPath(); g.ellipse(0.33, -0.14, 0.09, 0.04, 0.05, 0, Math.PI * 2); g.fill();
    oval(DARK, 0.2, -0.22, 0.022, 0.022); oval("#ffffff", 0.194, -0.227, 0.007, 0.007); curve("rgba(0,0,0,0.25)", 0.01, [0.26, -0.14], [0.33, -0.13], [0.41, -0.14]);
  },
  turtle(g, a, b) {
    const { oval, curve } = kit(g);
    oval(a, 0.37, 0.03, 0.12, 0.1); oval(a, -0.2, 0.26, 0.07, 0.085); oval(a, 0.14, 0.27, 0.07, 0.085); oval(a, -0.36, 0.14, 0.06, 0.03, 0.4);
    g.fillStyle = b; g.beginPath(); g.ellipse(-0.03, 0.1, 0.3, 0.26, 0, Math.PI, 0); g.lineTo(-0.33, 0.1); g.fill();
    g.strokeStyle = "rgba(0,0,0,0.2)"; g.lineWidth = 0.014; g.beginPath(); g.arc(-0.03, 0.1, 0.14, Math.PI, 0); g.moveTo(-0.03, -0.04); g.lineTo(-0.03, -0.16); g.moveTo(-0.14, 0.0); g.lineTo(-0.24, -0.08); g.moveTo(0.08, 0.0); g.lineTo(0.18, -0.08); g.stroke();
    oval(a, -0.03, 0.12, 0.32, 0.045);
    oval(DARK, 0.41, 0.0, 0.02, 0.02); oval("#ffffff", 0.405, -0.006, 0.007, 0.007); curve(DARK, 0.012, [0.38, 0.07], [0.42, 0.09], [0.46, 0.06]);
  },
  butterfly(g, a, b) {
    const { oval, line, curve } = kit(g);
    for (const sx of [-1, 1]) { oval(a, sx * 0.21, -0.12, 0.2, 0.24, sx * 0.35); oval(b, sx * 0.17, 0.2, 0.15, 0.17, sx * -0.3); oval("rgba(255,255,255,0.75)", sx * 0.23, -0.14, 0.07, 0.09, sx * 0.35); oval(a, sx * 0.17, 0.21, 0.055, 0.065); }
    oval(DARK, 0, 0.03, 0.045, 0.24); oval(DARK, 0, -0.24, 0.055, 0.055);
    curve(DARK, 0.014, [-0.02, -0.28], [-0.1, -0.4], [-0.14, -0.42]); curve(DARK, 0.014, [0.02, -0.28], [0.1, -0.4], [0.14, -0.42]);
    line("#ffffff", 0.012, [[-0.02, -0.25], [-0.02, -0.25]]); line("#ffffff", 0.012, [[0.02, -0.25], [0.02, -0.25]]);
  },
  bee(g, a, b) {
    const { oval, line, curve } = kit(g);
    oval("rgba(190,225,255,0.85)", -0.08, -0.22, 0.13, 0.17, -0.5); oval("rgba(190,225,255,0.85)", 0.08, -0.24, 0.12, 0.16, 0.3);
    g.fillStyle = b; g.beginPath(); g.moveTo(-0.3, 0.08); g.lineTo(-0.42, 0.05); g.lineTo(-0.3, 0.02); g.fill(); // sting
    oval(a, -0.04, 0.06, 0.28, 0.2);
    g.save(); g.beginPath(); g.ellipse(-0.04, 0.06, 0.28, 0.2, 0, 0, Math.PI * 2); g.clip(); g.fillStyle = b; for (const x of [-0.22, -0.08, 0.06]) g.fillRect(x, -0.2, 0.07, 0.5); g.restore();
    oval(a, 0.24, 0.02, 0.14, 0.14);
    oval(DARK, 0.28, -0.01, 0.024, 0.024); oval("#ffffff", 0.274, -0.017, 0.008, 0.008); curve(DARK, 0.012, [0.25, 0.07], [0.3, 0.1], [0.34, 0.06]);
    curve(DARK, 0.012, [0.22, -0.1], [0.24, -0.22], [0.3, -0.24]); curve(DARK, 0.012, [0.28, -0.1], [0.34, -0.2], [0.4, -0.2]);
    line(DARK, 0.03, [[0.3, -0.24], [0.3, -0.24]]); line(DARK, 0.03, [[0.4, -0.2], [0.4, -0.2]]);
  },
  bird(g, a, b) {
    const { oval, tri, line } = kit(g);
    tri(a, [-0.2, 0.06], [-0.45, -0.02], [-0.42, 0.16]);
    line("#f59e0b", 0.02, [[-0.03, 0.24], [-0.03, 0.4], [0.04, 0.4]]); line("#f59e0b", 0.02, [[0.08, 0.24], [0.08, 0.4], [0.15, 0.4]]);
    oval(a, 0, 0.06, 0.26, 0.2); oval(b, 0.04, 0.12, 0.15, 0.11);
    oval(a, -0.08, 0.04, 0.15, 0.09, 0.4);
    oval(a, 0.2, -0.16, 0.14, 0.14);
    tri("#f59e0b", [0.32, -0.2], [0.46, -0.15], [0.32, -0.1]);
    oval(DARK, 0.23, -0.2, 0.022, 0.022); oval("#ffffff", 0.224, -0.207, 0.007, 0.007);
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
  { id: "fish", name: "Fish", custom: "animal", top: "#f97316", bot: "#fbbf24" },
  { id: "duck", name: "Duck", custom: "animal", top: "#fde047", bot: "#facc15" },
  { id: "bird", name: "Bird", custom: "animal", top: "#3b82f6", bot: "#bfdbfe" },
  { id: "turtle", name: "Turtle", custom: "animal", top: "#65a30d", bot: "#a16207" },
  { id: "butterfly", name: "Butterfly", custom: "animal", top: "#a855f7", bot: "#ec4899" },
  { id: "bee", name: "Bee", custom: "animal", top: "#fde047", bot: "#1f2937" },
];

/** Draws an animal one unit tall at the origin (the caller has already scaled). a and b are its two colours. */
export function drawAnimal(g, d, a, b) { if (OWN[d.id]) OWN[d.id](g, a, b); else critter(g, d.o || {}, a, b); }
