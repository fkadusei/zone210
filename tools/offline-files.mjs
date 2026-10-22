#!/usr/bin/env node
/**
 * Writes public/offline-files.json: every file the "Save all games for offline" button on the home page saves
 * (assets/save-offline.js), with their total sizes.   node tools/offline-files.mjs   (tools/seo.mjs runs it too)
 *  - games:   every page, script, style, picture, font and sound of the site and its games, and the 3D engine the
 *             3D games load from jsDelivr
 *  - stories: the narration for Ananse Stories and Once Upon a Time (all three voices), which is most of the size,
 *             so it is saved only if asked for
 * Left out: share pictures (assets/og), the full-size card pictures (the home page shows the .webp ones), and files
 * a visitor never asks for (sitemap, robots, headers, the move page).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "public");
const version = (fs.readFileSync(path.join(root, "sw.js"), "utf8").match(/const VERSION = "([^"]+)"/) || [])[1];
if (!version) throw new Error("no VERSION in public/sw.js");
const STORIES = /^games\/(ananse|once-upon)\/audio\//;
const SKIP = /^(assets\/og\/|assets\/thumbs\/.*\.jpg$|sitemap\.xml$|robots\.txt$|_headers$|move\.html$|sw\.js$|offline-files\.json$|.*\.DS_Store$|.*LICENSE.*|.*\.md$)/;
const THREE = "https://cdn.jsdelivr.net/npm/three@0.160.0/";
const CDN = ["build/three.module.js", "examples/jsm/controls/OrbitControls.js", "examples/jsm/environments/RoomEnvironment.js", "examples/jsm/geometries/RoundedBoxGeometry.js", "examples/jsm/utils/BufferGeometryUtils.js"].map((p) => THREE + p);

const out = { version, games: [], stories: [], bytes: { games: 0, stories: 0 } };
const walk = (dir) => {
  for (const name of fs.readdirSync(dir).sort()) {
    const full = path.join(dir, name), rel = path.relative(root, full).split(path.sep).join("/");
    if (fs.statSync(full).isDirectory()) { walk(full); continue; }
    if (SKIP.test(rel)) continue;
    // a folder's page is asked for by its folder address; other pages by their own (Cloudflare serves x.html at x)
    const url = rel === "index.html" ? "/" : rel.endsWith("/index.html") ? `/${rel.slice(0, -10)}` : rel.endsWith(".html") ? `/${rel.slice(0, -5)}` : `/${rel}`;
    const kind = STORIES.test(rel) ? "stories" : "games";
    out[kind].push(url);
    out.bytes[kind] += fs.statSync(full).size;
  }
};
walk(root);
out.games.push(...CDN);
out.bytes.games += 700 * 1024; // the 3D engine, about this much
fs.writeFileSync(path.join(root, "offline-files.json"), JSON.stringify(out));
const mb = (b) => `${(b / 1048576).toFixed(1)} MB`;
console.log(`offline-files.json: ${out.games.length} files for the games (${mb(out.bytes.games)}), ${out.stories.length} story narrations (${mb(out.bytes.stories)})`);
