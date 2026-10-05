#!/usr/bin/env node
/**
 * Mango Mayhem level check: every level must stand still on its own (nothing breaks or slides before the first shot),
 * and a plain first shot from the slingshot must be able to hurt something. Run: node tools/check-mango-levels.mjs
 */
import { createRequire } from "module";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "public");
const require = createRequire(import.meta.url);
const Matter = require(path.join(root, "assets/vendor/matter.min.js"));
const L = await import(pathToFileURL(path.join(root, "games/mango-mayhem/levels.js")).href);
const { Engine, Bodies, Composite, Events, Body } = Matter;

function setup(build) {
  const engine = Engine.create({ enableSleeping: true, positionIterations: 10, velocityIterations: 8 });
  Composite.add(engine.world, Bodies.rectangle(L.W / 2, L.GROUND + 60, L.W * 3, 120, { isStatic: true, friction: 1 }));
  const bodies = [];
  const b = L.makeBuilder(Matter, engine.world, (x) => bodies.push(x));
  build(b);
  const hurt = [];
  Events.on(engine, "collisionStart", (e) => e.pairs.forEach((p) => {
    const [da, dc] = L.impactDamage(p);
    [[p.bodyA, da], [p.bodyB, dc]].forEach(([x, d]) => { if (x.plugin && x.plugin.hp !== undefined && d > 0) { x.plugin.hp -= d; hurt.push(x); } });
  }));
  return { engine, bodies, hurt };
}
let bad = 0;
const t0 = Date.now();
L.LEVELS.forEach((lv, i) => {
  const n = i + 1;
  // 1) stands on its own for 8 seconds
  const s = setup((b) => lv.build(b));
  const start = s.bodies.map((x) => ({ x: x.position.x, y: x.position.y }));
  for (let k = 0; k < 480; k += 1) Engine.update(s.engine, 1000 / 60);
  const moved = s.bodies.map((x, j) => Math.hypot(x.position.x - start[j].x, x.position.y - start[j].y));
  const broke = s.bodies.filter((x) => x.plugin.hp !== undefined && x.plugin.hp <= 0);
  const drift = moved.filter((d) => d > 6).length;
  const monkeys = s.bodies.filter((x) => x.plugin.kind === "monkey").length;
  // 2) some plain shot can knock out a monkey
  let best = 0;
  for (const kind of [...new Set(lv.birds)]) for (let ang = 10; ang <= 70; ang += 4) for (const pw of [0.7, 0.85, 1]) {
    const t = setup((b) => lv.build(b));
    for (let k = 0; k < 60; k += 1) Engine.update(t.engine, 1000 / 60);
    t.hurt.length = 0;
    const B = L.BIRDS[kind];
    const bird = Bodies.circle(L.SLING.x, L.SLING.y, B.r, { density: B.density, frictionAir: 0.003, restitution: 0.3 });
    Composite.add(t.engine.world, bird);
    const v = 19.5 * pw;
    Body.setVelocity(bird, { x: v * Math.cos((ang * Math.PI) / 180), y: -v * Math.sin((ang * Math.PI) / 180) });
    for (let k = 0; k < 420; k += 1) Engine.update(t.engine, 1000 / 60);
    const killed = t.bodies.filter((x) => x.plugin.kind === "monkey" && (x.plugin.hp <= 0 || x.position.y > L.H + 50 || x.position.x > L.W + 80)).length;
    best = Math.max(best, killed);
  }
  const ok = !broke.length && drift === 0 && best > 0;
  if (!ok) bad += 1;
  console.log(`level ${String(n).padStart(2)}: ${s.bodies.length} bodies, ${monkeys} monkeys, settles ${drift ? `NO (${drift} moved)` : "yes"}, breaks by itself ${broke.length ? `YES (${broke.map((x) => x.plugin.kind + "/" + (x.plugin.mat || "")).join(",")})` : "no"}, best first shot knocks out ${best}`);
});
// duel forts stand too
const d = setup((b) => { L.duelFort(b, -1); L.duelFort(b, 1); });
const ds = d.bodies.map((x) => ({ x: x.position.x, y: x.position.y }));
for (let k = 0; k < 480; k += 1) Engine.update(d.engine, 1000 / 60);
const dd = d.bodies.filter((x, j) => Math.hypot(x.position.x - ds[j].x, x.position.y - ds[j].y) > 6).length;
const db = d.bodies.filter((x) => x.plugin.hp !== undefined && x.plugin.hp <= 0).length;
if (dd || db) bad += 1;
console.log(`duel forts: ${d.bodies.length} bodies, settle ${dd ? "NO" : "yes"}, broken ${db}`);
console.log(bad ? `${bad} PROBLEM(S)` : `all levels OK (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
process.exit(bad ? 1 : 0);
