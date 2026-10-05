/**
 * Mango Mayhem levels. A level is a function that builds its structures through a small builder API, so the same
 * code runs in the browser and in the Node stability test (tools/check-mango-levels.mjs).
 *
 *   b.box(cx, bottomY, w, h, material)    a block standing on bottomY
 *   b.tower(cx, bottomY, floors, material, width = 120, postH = 100) -> top surface y
 *   b.pyramid(cx, bottomY, rows, material, size = 44)
 *   b.ledge(cx, topY, w, h)               a fixed rock shelf
 *   b.monkey(cx, bottomY, r = 26)         a mango-stealing monkey
 * World: 1600 x 900, ground surface at y = 840, slingshot at x = 230.
 */
export const W = 1600;
export const H = 900;
export const GROUND = 840;
export const SLING = { x: 230, y: 690 };

export const MATERIALS = {
  wood: { density: 0.0011, friction: 0.7, health: 130, score: 500 },
  stone: { density: 0.0035, friction: 0.9, health: 520, score: 800 },
  clay: { density: 0.0009, friction: 0.6, health: 45, score: 300 },
};

/** Birds: radius, density, and what a tap in mid-air does. */
export const BIRDS = {
  kweku: { name: "Kweku", r: 24, density: 0.004, power: "none", tip: "A steady, reliable shot." },
  ama: { name: "Ama", r: 22, density: 0.0038, power: "split", tip: "Tap in the air to split into three." },
  kofi: { name: "Kofi", r: 20, density: 0.0036, power: "dash", tip: "Tap in the air to dash forward fast." },
  nana: { name: "Nana", r: 30, density: 0.0085, power: "dive", tip: "Heavy! Tap in the air to dive straight down." },
};

export const WORLDS = [
  { id: "village", name: "The Village", sky: ["#8fd3ff", "#e6f6ff"], hill: "#7cc46a", ground: "#7a5a3a" },
  { id: "market", name: "The Market", sky: ["#ffc98f", "#fff1dc"], hill: "#c9a04f", ground: "#8a5a32" },
  { id: "hills", name: "Rocky Hills", sky: ["#9fb4ff", "#f0e6ff"], hill: "#8e8aa8", ground: "#5d5a6e" },
];

const G = GROUND;
export const LEVELS = [
  // ---- The Village: wood ----
  { world: 0, birds: ["kweku", "kweku", "kweku"], build(b) { b.tower(1150, G, 1, "wood"); b.monkey(1150, G); } },
  { world: 0, birds: ["kweku", "kweku", "kweku"], build(b) { b.tower(1000, G, 1, "wood"); b.monkey(1000, G); b.tower(1300, G, 1, "wood"); b.monkey(1300, G); } },
  { world: 0, birds: ["kweku", "kweku", "kweku"], build(b) { b.tower(1200, G, 2, "wood"); b.monkey(1200, G); b.monkey(1200, G - 122); } },
  { world: 0, birds: ["kweku", "ama", "kweku"], build(b) { const top = b.pyramid(1200, G, 4, "wood", 46); b.monkey(1200, top); b.monkey(1360, G); } },
  { world: 0, birds: ["kweku", "ama", "kweku", "kweku"], build(b) { const t1 = b.tower(950, G, 1, "wood"); b.monkey(950, t1); const t2 = b.tower(1200, G, 2, "wood"); b.monkey(1200, t2); b.monkey(1200, G); const t3 = b.tower(1450, G, 1, "wood"); b.monkey(1450, t3); } },
  { world: 0, birds: ["kweku", "ama", "kofi"], build(b) { for (let i = 0; i < 3; i += 1) { b.box(960 + i * 52, G, 48, 60, "wood"); b.box(960 + i * 52, G - 60, 48, 60, "wood"); } const t = b.tower(1300, G, 2, "wood"); b.monkey(1300, G); b.monkey(1300, G - 122); b.monkey(1300, t); } },
  // ---- The Market: wood and clay pots ----
  { world: 1, birds: ["kweku", "kweku", "ama"], build(b) { const top = b.pyramid(1150, G, 3, "clay", 50); b.monkey(1150, top); b.tower(1380, G, 1, "wood"); b.monkey(1380, G); } },
  { world: 1, birds: ["kofi", "kweku", "kofi"], build(b) { b.ledge(1320, 600, 300, 30); const t = b.tower(1320, 600, 1, "wood"); b.monkey(1320, 600); b.monkey(1320, t); b.pyramid(1000, G, 3, "clay", 46); } },
  { world: 1, birds: ["kweku", "ama", "kweku", "kofi"], build(b) { [1000, 1200, 1400].forEach((x) => { const t = b.tower(x, G, 1, "wood"); b.box(x, t, 120, 40, "clay"); b.monkey(x, G); }); } },
  { world: 1, birds: ["ama", "kweku", "kofi"], build(b) { const t1 = b.tower(1050, G, 2, "wood", 110); const t2 = b.tower(1350, G, 2, "wood", 110); b.box(1200, Math.min(t1, t2), 420, 22, "wood"); b.monkey(1130, Math.min(t1, t2) - 22); b.monkey(1270, Math.min(t1, t2) - 22); b.monkey(1050, G); } },
  { world: 1, birds: ["kweku", "kofi", "ama"], build(b) { for (let i = 0; i < 5; i += 1) for (let j = 0; j <= i; j += 1) b.box(1000 + i * 70, G - j * 50, 66, 50, j === i ? "clay" : "wood"); b.monkey(1280, G - 250); b.monkey(1420, G); } },
  { world: 1, birds: ["kweku", "ama", "kofi", "kweku", "ama"], build(b) { const a = b.tower(1150, G, 3, "wood", 130); b.monkey(1150, G); b.monkey(1150, G - 244); b.monkey(1150, a); const c = b.tower(1400, G, 2, "wood", 110); b.box(1400, c, 130, 44, "clay"); b.monkey(1400, G); } },
  // ---- Rocky Hills: stone ----
  { world: 2, birds: ["nana", "kweku", "kweku"], build(b) { const t = b.tower(1200, G, 1, "stone"); b.monkey(1200, G); b.monkey(1200, t); } },
  { world: 2, birds: ["nana", "nana", "kofi"], build(b) { const top = b.pyramid(1200, G, 4, "stone", 46); b.monkey(1200, top); b.monkey(1040, G); b.monkey(1360, G); } },
  { world: 2, birds: ["kofi", "nana", "ama"], build(b) { b.ledge(1350, 560, 320, 34); const t = b.tower(1350, 560, 1, "stone", 130); b.monkey(1350, 560); b.box(1350, t, 150, 44, "wood"); b.monkey(1350, t - 44); b.tower(1050, G, 1, "wood"); b.monkey(1050, G); } },
  { world: 2, birds: ["nana", "ama", "kweku", "kofi"], build(b) { [1080, 1380].forEach((x) => { const t = b.tower(x, G, 2, "stone", 120); b.box(x, t, 150, 22, "wood"); b.monkey(x, G); b.monkey(x, t - 22); }); } },
  { world: 2, birds: ["nana", "kofi", "ama", "nana", "kweku"], build(b) { b.box(975, G, 40, 130, "stone"); b.box(1030, G, 40, 130, "stone"); const t = b.tower(1220, G, 2, "stone", 140); b.pyramid(1220, t, 2, "clay", 48); b.monkey(1220, G); b.monkey(1220, G - 122); const c = b.tower(1440, G, 1, "wood", 110); b.monkey(1440, G); b.monkey(1440, c); } },
  { world: 2, birds: ["nana", "ama", "kofi", "nana", "kweku", "ama"], build(b) { b.ledge(1400, 620, 260, 30); const a = b.tower(1150, G, 3, "stone", 140); b.monkey(1150, G); b.monkey(1150, G - 244); b.monkey(1150, a); const c = b.tower(1400, 620, 1, "wood", 120); b.box(1400, c, 140, 40, "clay"); b.monkey(1400, 620); b.pyramid(950, G, 3, "wood", 44); } },
];

/** The duel: two mirrored forts. side -1 = left fort (player 1 at left sling), +1 = right fort. */
export function duelFort(b, side) {
  const cx = side < 0 ? 470 : W - 470;
  const out = side < 0 ? -1 : 1;
  b.box(cx - out * 110, G, 40, 120, "stone");
  const t = b.tower(cx, G, 2, "wood", 120);
  b.box(cx, t, 140, 40, "clay");
  b.monkey(cx, G);
  b.monkey(cx, G - 122);
  const t2 = b.tower(cx + out * 160, G, 1, "stone", 110);
  b.monkey(cx + out * 160, t2);
}
export const DUEL_SLING = [{ x: 150, y: 690 }, { x: W - 150, y: 690 }];

/** The builder: turns level code into Matter bodies. Shared by the game and the test. */
export function makeBuilder(Matter, world, onBody) {
  const { Bodies, Composite } = Matter;
  let id = 0;
  const add = (body, meta) => { body.plugin = { ...meta, id: id += 1 }; Composite.add(world, body); if (onBody) onBody(body); return body; };
  const b = {
    box(cx, bottomY, w, h, mat) {
      const M = MATERIALS[mat];
      return add(Bodies.rectangle(cx, bottomY - h / 2, w, h, { density: M.density, friction: M.friction, frictionStatic: 1, restitution: 0.05, sleepThreshold: 40 }), { kind: "block", mat, w, h, hp: M.health, max: M.health });
    },
    tower(cx, bottomY, floors, mat, width = 120, postH = 100) {
      let y = bottomY;
      for (let f = 0; f < floors; f += 1) {
        b.box(cx - width / 2 + 11, y, 22, postH, mat);
        b.box(cx + width / 2 - 11, y, 22, postH, mat);
        y -= postH;
        b.box(cx, y, width + 24, 22, mat);
        y -= 22;
      }
      return y;
    },
    pyramid(cx, bottomY, rows, mat, size = 44) {
      let y = bottomY;
      for (let r = 0; r < rows; r += 1) {
        const n = rows - r;
        for (let i = 0; i < n; i += 1) b.box(cx - ((n - 1) * size) / 2 + i * size, y, size - 2, size, mat);
        y -= size;
      }
      return y;
    },
    ledge(cx, topY, w, h) {
      return add(Bodies.rectangle(cx, topY + h / 2, w, h, { isStatic: true, friction: 1 }), { kind: "ledge", w, h });
    },
    monkey(cx, bottomY, r = 26) {
      return add(Bodies.circle(cx, bottomY - r, r, { density: 0.0012, friction: 0.8, frictionStatic: 1, restitution: 0.1, sleepThreshold: 40 }), { kind: "monkey", r, hp: 60, max: 60 });
    },
  };
  return b;
}

/** How much a collision hurts each body. */
export function impactDamage(pair) {
  const a = pair.bodyA;
  const c = pair.bodyB;
  const n = pair.collision.normal;
  const rv = (a.velocity.x - c.velocity.x) * n.x + (a.velocity.y - c.velocity.y) * n.y;
  const speed = Math.abs(rv);
  if (speed < 2.2) return [0, 0];
  const ma = a.isStatic ? Infinity : a.mass;
  const mc = c.isStatic ? Infinity : c.mass;
  const k = (speed - 2.2) * 3;
  // each body is hurt by the other body's mass (a static floor counts as twice your own weight)
  return [k * Math.min(mc === Infinity ? ma * 2 : mc, 40), k * Math.min(ma === Infinity ? mc * 2 : ma, 40)];
}
