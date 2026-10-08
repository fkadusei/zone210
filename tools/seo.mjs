#!/usr/bin/env node
/**
 * Keeps Zone 210 easy for search engines to find, from the catalog (public/assets/games.js). Run it after adding or
 * renaming a game:   node tools/seo.mjs
 * It writes or updates:
 *  - public/sitemap.xml   every page, so search engines know all the games exist
 *  - public/robots.txt    allow everything, and point at the sitemap
 *  - every game page      a canonical link (the one true address) and structured data (schema.org) about the game
 *  - the home page        a canonical link, structured data listing the games, the up-to-date game count in its
 *                         descriptions, and a plain "All games" list of links (crawlers that don't run JavaScript
 *                         can't see the cards, and it's handy for people too)
 * tools/check-catalog.mjs warns if the sitemap is out of date.
 */
import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";
import { fileURLToPath, pathToFileURL } from "url";

const SITE = "https://zone210.com";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "public");
const { GAMES } = await import(pathToFileURL(path.join(root, "assets/games.js")).href);
const games = GAMES.filter((g) => g.id && fs.existsSync(path.join(root, "games", g.id, "index.html"))).sort((a, b) => a.title.localeCompare(b.title));
const esc = (t) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const jsonld = (o) => JSON.stringify(o, null, 0).replace(/</g, "\\u003c");
// when a page last changed, from git (falls back to today)
const lastmod = (rel) => { try { const d = execFileSync("git", ["log", "-1", "--format=%cs", "--", rel], { cwd: path.join(root, ".."), encoding: "utf8" }).trim(); return d || new Date().toISOString().slice(0, 10); } catch (e) { return new Date().toISOString().slice(0, 10); } };
const CAT = { strategy: "Strategy games", family: "Family games", puzzles: "Puzzles", learn: "Learning", fun: "Arcade and creative" };
const AUD = { kids: "Kids", adults: "Adults", all: "Everyone" };

// ---------- sitemap.xml and robots.txt ----------
const urls = [{ loc: `${SITE}/`, mod: lastmod("public/index.html"), pri: "1.0" }, ...games.map((g) => ({ loc: `${SITE}/games/${g.id}/`, mod: lastmod(`public/games/${g.id}`), pri: "0.8" }))];
fs.writeFileSync(path.join(root, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${u.loc}</loc><lastmod>${u.mod}</lastmod><priority>${u.pri}</priority></url>`).join("\n")}\n</urlset>\n`);
fs.writeFileSync(path.join(root, "robots.txt"), `# Zone 210: everyone is welcome to crawl and index the games.\nUser-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);

// ---------- a block between two marker comments in a page, added before </head> (or a given spot) if missing ----------
function setBlock(html, name, content, before = "  </head>") {
  const a = `<!-- seo:${name} -->`, b = `<!-- /seo:${name} -->`;
  const block = `${a}\n${content}\n    ${b}`;
  if (html.includes(a)) return html.replace(new RegExp(`${a}[\\s\\S]*?${b}`), block);
  return html.replace(before, `    ${block}\n${before}`);
}

// ---------- game pages ----------
let changed = 0;
for (const g of games) {
  const file = path.join(root, "games", g.id, "index.html");
  const before = fs.readFileSync(file, "utf8");
  const url = `${SITE}/games/${g.id}/`;
  const data = {
    "@context": "https://schema.org", "@type": "VideoGame", name: g.title, description: g.tagline, url, image: `${SITE}/assets/og/${g.id}.jpg`,
    genre: [...new Set([CAT[g.cat] || "Games", ...g.tags.filter((t) => t !== "Offline")])], applicationCategory: "Game", operatingSystem: "Any web browser",
    playMode: g.online ? ["SinglePlayer", "MultiPlayer"] : /2|4|players/.test(g.players) && !/^1 player$/.test(g.players) ? ["SinglePlayer", "MultiPlayer"] : "SinglePlayer",
    audience: { "@type": "Audience", audienceType: AUD[g.audience] || "Everyone" }, isAccessibleForFree: true, inLanguage: "en",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" }, publisher: { "@type": "Organization", name: "Zone 210", url: `${SITE}/` },
  };
  let html = setBlock(before, "head", `    <link rel="canonical" href="${url}" />\n    <script type="application/ld+json">${jsonld(data)}</script>`);
  if (html !== before) { fs.writeFileSync(file, html); changed += 1; }
}

// ---------- the home page ----------
const homeFile = path.join(root, "index.html");
let home = fs.readFileSync(homeFile, "utf8");
const n = games.length;
home = home.replace(/content="\d+ free games, puzzles and learning adventures/g, `content="${n} free games, puzzles and learning adventures`);
const site = { "@context": "https://schema.org", "@type": "WebSite", name: "Zone 210", url: `${SITE}/`, description: `${n} free games, puzzles and learning adventures for kids and grown-ups. Play in your browser, no sign-up.` };
const list = { "@context": "https://schema.org", "@type": "ItemList", name: "Zone 210 games", numberOfItems: n, itemListElement: games.map((g, i) => ({ "@type": "ListItem", position: i + 1, url: `${SITE}/games/${g.id}/`, name: g.title })) };
home = setBlock(home, "head", `    <link rel="canonical" href="${SITE}/" />\n    <script type="application/ld+json">${jsonld(site)}</script>\n    <script type="application/ld+json">${jsonld(list)}</script>`);
const groups = Object.entries(CAT).map(([k, label]) => [label, games.filter((g) => g.cat === k)]).filter(([, gs]) => gs.length);
const links = `      <details class="allgames"><summary>All ${n} games, A to Z</summary>\n${groups.map(([label, gs]) => `        <h2>${esc(label)}</h2><ul>${gs.map((g) => `<li><a href="games/${g.id}/">${esc(g.title)}</a></li>`).join("")}</ul>`).join("\n")}\n      </details>`;
home = setBlock(home, "links", links, "    </footer>");
fs.writeFileSync(homeFile, home);
console.log(`sitemap.xml: ${urls.length} pages · robots.txt · ${changed} game pages updated · home page: ${n} games`);
