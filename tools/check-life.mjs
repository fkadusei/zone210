#!/usr/bin/env node
/** Compound Life check: a family lives a week in each home without getting stuck. Run: node tools/check-life.mjs */
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "public/games/compound-life");
const D = await import(pathToFileURL(path.join(root, "data.js")).href);
const L = await import(pathToFileURL(path.join(root, "sim.js")).href);
let bad = 0;
for (const setting of Object.keys(D.SETTINGS)) {
  const jobs = D.SETTINGS[setting].jobs;
  const H = L.newHousehold({ setting, seed: 42, people: [
    { name: "Kwame", age: "adult", skin: D.SKINS[1], hair: "short", outfit: D.OUTFITS[1], job: jobs[0] },
    { name: "Ama", age: "adult", skin: D.SKINS[2], hair: "afro", outfit: D.OUTFITS[0], job: null },
    { name: "Kojo", age: "child", skin: D.SKINS[1], hair: "short", outfit: D.OUTFITS[2] },
    { name: "Esi", age: "child", skin: D.SKINS[3], hair: "puffs", outfit: D.OUTFITS[5] },
  ] });
  const seen = {};
  const lowFor = Object.fromEntries(H.people.map((p) => [p.name, {}]));
  let worst = {};
  const t0 = Date.now();
  for (let m = 0; m < 7 * 1440; m += 1) {
    L.update(H, 1);
    H.people.forEach((p) => {
      if (p.act && p.act.phase === "do") seen[p.act.type] = (seen[p.act.type] || 0) + 1;
      D.NEEDS.forEach((n) => {
        const k = lowFor[p.name];
        k[n] = !p.away && p.needs[n] < 5 ? (k[n] || 0) + 1 : 0;
        worst[`${p.name}.${n}`] = Math.max(worst[`${p.name}.${n}`] || 0, k[n]);
      });
    });
  }
  const stuck = Object.entries(worst).filter(([, v]) => v > 240);
  const moods = H.people.map((p) => `${p.name} ${p.mood}`).join(", ");
  console.log(`\n${setting}: day ${H.day}, money ₵${H.money}, ${((Date.now() - t0) / 1000).toFixed(1)}s, moods: ${moods}`);
  console.log("  jobs:", H.people.filter((p) => p.age === "adult").map((p) => `${p.name}: ${p.job ? D.JOBS[p.job].titles[p.level] : "none"}`).join(", "), "| grades:", H.people.filter((p) => p.age === "child").map((p) => `${p.name} ${L.gradeLetter(p.grade)}`).join(", "));
  console.log("  activities (minutes):", Object.entries(seen).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(", "));
  console.log("  last messages:", H.log.slice(0, 6).map((l) => l.text).join(" | "));
  if (stuck.length) { bad += 1; console.log("  STUCK LOW NEEDS (over 4h below 5):", stuck.map(([k, v]) => `${k} ${v}min`).join(", ")); }
  if (!seen.sleep || !(seen.eatmeal || seen.snack || seen.mangosnack)) { bad += 1; console.log("  PROBLEM: nobody slept or ate"); }
}
console.log(bad ? `\n${bad} PROBLEM(S)` : "\nlife sim OK");
process.exit(bad ? 1 : 0);
