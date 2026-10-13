#!/usr/bin/env node
/**
 * Makes the small WebP copy of each card picture that the home page shows.
 *   node tools/thumbs.mjs          (only the ones that are missing or older than their .jpg)
 *   node tools/thumbs.mjs --all    (every one again)
 * The .jpg in public/assets/thumbs/ stays the original: the jigsaw and the share cards are made from it, and the
 * home page falls back to it. The .webp is about a third of the size at the same 960 pixels wide.
 * Needs cwebp (brew install webp). tools/check-catalog.mjs warns when a .webp is missing or out of date.
 */
import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";
import { fileURLToPath } from "url";

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "public", "assets", "thumbs");
const all = process.argv.includes("--all");
let made = 0, before = 0, after = 0;
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".jpg")).sort()) {
  const jpg = path.join(dir, f), webp = jpg.replace(/\.jpg$/, ".webp");
  if (!all && fs.existsSync(webp) && fs.statSync(webp).mtimeMs >= fs.statSync(jpg).mtimeMs) continue;
  execFileSync("cwebp", ["-quiet", "-q", "72", jpg, "-o", webp]);
  made += 1; before += fs.statSync(jpg).size; after += fs.statSync(webp).size;
}
console.log(made ? `${made} WebP thumbnails made: ${Math.round(before / 1024)} KB of JPEG became ${Math.round(after / 1024)} KB` : "WebP thumbnails are all up to date.");
