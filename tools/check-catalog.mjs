#!/usr/bin/env node
/**
 * Checks the game catalog (public/assets/games.js) against the files on disk. Run it before every commit:
 *   node tools/check-catalog.mjs
 * Exit code 1 if anything is wrong. It catches duplicate ids, missing pages / thumbnails / share cards,
 * share tags that point at the wrong game, bad field values, and leftover files for games that are gone.
 * It also prints the real number of games: quote that number, never a guess.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "public");
const { GAMES } = await import(pathToFileURL(path.join(root, "assets/games.js")).href);
const problems = [];
const warns = [];
const bad = (m) => problems.push(m);

const CATS = new Set(["strategy", "family", "puzzles", "learn", "fun"]);
const AUD = new Set(["kids", "adults", "all"]);
const seen = new Map();
GAMES.forEach((g, i) => {
  const at = `#${i + 1} ${g.id || "(no id)"}`;
  if (!g.id || !/^[a-z0-9-]+$/.test(g.id)) bad(`${at}: id missing or not lowercase-with-dashes`);
  if (seen.has(g.id)) bad(`${at}: DUPLICATE id (first seen at #${seen.get(g.id)})`);
  else seen.set(g.id, i + 1);
  for (const f of ["title", "tagline", "audience", "cat", "players", "emoji"]) if (!g[f] || typeof g[f] !== "string") bad(`${at}: missing ${f}`);
  if (g.cat && !CATS.has(g.cat)) bad(`${at}: unknown category "${g.cat}"`);
  if (g.audience && !AUD.has(g.audience)) bad(`${at}: unknown audience "${g.audience}"`);
  if (!Array.isArray(g.tags) || !g.tags.length) bad(`${at}: tags must be a non-empty list`);
  if (!Array.isArray(g.colors) || g.colors.length !== 2 || !g.colors.every((c) => /^#[0-9a-f]{6}$/i.test(c))) bad(`${at}: colors must be two #rrggbb values`);
  if (g.added && !/^\d{4}-\d{2}-\d{2}$/.test(g.added)) bad(`${at}: added must be YYYY-MM-DD`);
  if (g.online !== undefined && typeof g.online !== "boolean") bad(`${at}: online must be true/false`);
  if (g.tagline && g.tagline.length > 220) warns.push(`${at}: tagline is ${g.tagline.length} characters (share cards cut it off)`);
  const page = path.join(root, "games", g.id, "index.html");
  if (!fs.existsSync(page)) { bad(`${at}: games/${g.id}/index.html is missing`); return; }
  const html = fs.readFileSync(page, "utf8");
  if (!fs.existsSync(path.join(root, "assets/thumbs", `${g.id}.jpg`))) warns.push(`${at}: no thumbnail (assets/thumbs/${g.id}.jpg), the card falls back to the emoji`);
  if (!fs.existsSync(path.join(root, "assets/og", `${g.id}.jpg`))) bad(`${at}: no share card (assets/og/${g.id}.jpg)`);
  const og = (html.match(/<meta property="og:image" content="([^"]+)"/) || [])[1];
  if (!og) bad(`${at}: page has no og:image share tag`);
  else if (og !== `https://zone210.com/assets/og/${g.id}.jpg`) bad(`${at}: og:image points at ${og}`);
  const ou = (html.match(/<meta property="og:url" content="([^"]+)"/) || [])[1];
  if (ou && ou !== `https://zone210.com/games/${g.id}/`) bad(`${at}: og:url points at ${ou}`);
  if (g.title && !html.includes(`<title>${g.title.replace(/&/g, "&amp;")} · Zone 210</title>`) && !html.includes(`<title>${g.title} · Zone 210</title>`)) warns.push(`${at}: page <title> does not match "${g.title} · Zone 210"`);
});

// files for games that are not in the catalog
const ids = new Set(GAMES.map((g) => g.id));
for (const d of fs.readdirSync(path.join(root, "games"))) if (fs.statSync(path.join(root, "games", d)).isDirectory() && !ids.has(d)) warns.push(`games/${d}/ is not in the catalog`);
for (const [dir, label] of [["assets/thumbs", "thumbnail"], ["assets/og", "share card"]]) {
  for (const f of fs.readdirSync(path.join(root, dir))) {
    const id = f.replace(/\.jpg$/, "");
    if (f.endsWith(".jpg") && !ids.has(id) && id !== "home") warns.push(`${dir}/${f}: ${label} for a game that is not in the catalog`);
  }
}
if (!fs.existsSync(path.join(root, "assets/og/home.jpg"))) bad("assets/og/home.jpg (home share card) is missing");

const online = GAMES.filter((g) => g.online).length;
console.log(`${GAMES.length} games (${seen.size} unique ids), ${online} with online play.`);
warns.forEach((w) => console.log("warning:", w));
if (problems.length) { problems.forEach((p) => console.log("PROBLEM:", p)); console.log(`\n${problems.length} problem${problems.length === 1 ? "" : "s"} found.`); process.exit(1); }
console.log("Catalog OK.");
