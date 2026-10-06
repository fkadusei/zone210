// Writes all.html: every ABC & 123 clip with its text, to listen through.  node make-all.mjs  (serve the repo root)
import fs from "fs";
import { CLIPS, LETTERS } from "../../public/games/abc-123/data.js";
const idx = JSON.parse(fs.readFileSync(new URL("../../public/games/abc-123/audio/index.json", import.meta.url)));
const voice = Object.keys(idx)[0];
const plain = (k) => { const x = LETTERS.find((l) => `l/${l.L.toLowerCase()}` === k || `w/${l.L.toLowerCase()}` === k); return x ? (k[0] === "l" ? `${x.L}` : `${x.L} is for ${x.word}`) : CLIPS[k]; };
const groups = { l: "Letters", w: "Picture words", n: "Numbers", p: "Prompts and praise" };
let body = "";
for (const [g, title] of Object.entries(groups)) {
  body += `<h2>${title}</h2><div class="grid">`;
  for (const k of idx[voice].filter((k) => k[0] === g)) body += `<div class="c"><b>${plain(k)}</b><audio controls preload="none" src="../../public/games/abc-123/audio/${voice}/${k}.m4a"></audio></div>`;
  body += "</div>";
}
fs.writeFileSync(new URL("all.html", import.meta.url), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>All ABC &amp; 123 clips</title>
<style>:root{--bg:#0f1220;--fg:#eef;--card:#1a1f35}@media (prefers-color-scheme: light){:root{--bg:#f6f7fb;--fg:#1d2033;--card:#fff}}
body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.4 system-ui,sans-serif;padding:16px}h1{font-size:1.4rem}h2{font-size:1.1rem;margin-top:22px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:10px}.c{background:var(--card);border-radius:12px;padding:10px}.c b{display:block;margin-bottom:4px}audio{width:100%;height:36px}</style></head>
<body><h1>All ${idx[voice].length} ABC &amp; 123 clips (${voice})</h1>${body}</body></html>`);
console.log("wrote all.html");
