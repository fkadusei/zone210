/**
 * Zone 210 service worker: the site keeps working without the internet.
 *
 *  - On the first visit it saves the home page and the files every page shares (SHELL below).
 *  - After that, everything a visit loads from the site is saved as it goes, so any game you have opened
 *    before works offline: its page, code, pictures and sounds, and the 3D engine some games load from
 *    cdn.jsdelivr.net (those addresses name an exact version, so they never change).
 *  - Pages, code and data are fetched fresh whenever the internet is there (the saved copy is used only if it
 *    is not, or takes more than a few seconds), so a new version of the site shows up straight away.
 *    Pictures, sounds and fonts come from the saved copy at once and are refreshed in the background.
 *  - A page opened before the service worker started (a first visit) tells it what it loaded, and that is saved too.
 *  - Opening something offline that was never saved shows /offline, which lists the games ready to play.
 *  - Sounds played a piece at a time come from the saved copy when there is one (the home page's "Save all games
 *    for offline" button saves every file, including story narration if asked: assets/save-offline.js).
 * Never saved: /api/* (online play needs the internet anyway), and other websites (except that 3D engine).
 * Registered from assets/www.js. Change VERSION to throw away everything saved and start again.
 */
const VERSION = "v1";
const CACHE = `zone210-${VERSION}`;
const SHELL = [
  "/", "/offline", "/manifest.webmanifest", "/favicon.svg", "/apple-touch-icon.png",
  "/assets/www.js", "/assets/theme.js", "/assets/saver.js", "/assets/sky.js", "/assets/sound.js", "/assets/back-link.js",
  "/assets/shell.css", "/assets/portal.css", "/assets/portal.js", "/assets/book.css", "/assets/book.js", "/assets/games.js", "/assets/paper.js", "/assets/save-offline.js", "/assets/install.js",
  "/assets/fonts/fredoka-latin.woff2", "/assets/fonts/nunito-latin.woff2", "/assets/icons/icon-192.png", "/assets/icons/icon-512.png",
];
const FRESH = /\.(html|js|mjs|css|json|webmanifest|txt|xml)$|\/$|^[^.]*$/; // pages, code and data: newest first
const WAIT = 4000; // how long to wait for the internet before using the saved copy

// a page Cloudflare reached by a redirect (/move.html → /move) is saved as a plain answer, which a page visit accepts
const plain = (res) => (res.redirected ? res.blob().then((b) => new Response(b, { status: res.status, statusText: res.statusText, headers: res.headers })) : Promise.resolve(res));
const keepable = (req, res) => res && res.status === 200 && (res.type === "basic" || res.type === "cors") && !req.headers.has("range");
async function put(req, res) { if (!keepable(req, res)) return; const c = await caches.open(CACHE); await c.put(req, await plain(res.clone())); }

self.addEventListener("install", (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    // one at a time, so one missing file cannot stop the rest being saved
    await Promise.all(SHELL.map(async (u) => { try { const r = await fetch(u, { cache: "no-cache" }); if (r.ok) await c.put(u, await plain(r)); } catch (err) { /* saved on a later visit */ } }));
    await self.skipWaiting();
  })());
});
self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith("zone210-") && k !== CACHE) await caches.delete(k); // an older version's copies
    await self.clients.claim();
  })());
});

// a page opened before the service worker started sends what it loaded, so that page is saved as well
self.addEventListener("message", (e) => {
  if (!e.data || e.data.zone210 !== "save" || !Array.isArray(e.data.urls)) return;
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    for (const u of e.data.urls.slice(0, 400)) {
      let url; try { url = new URL(u); } catch (err) { continue; }
      const ours = url.origin === self.location.origin && !url.pathname.startsWith("/api/"), cdn = url.hostname === "cdn.jsdelivr.net" && /@\d/.test(url.pathname);
      if (!ours && !cdn) continue;
      url.hash = "";
      if (await c.match(url.href)) continue;
      try { const r = await fetch(url.href, ours ? { cache: "no-cache" } : { mode: "cors" }); if (r.ok) await c.put(url.href, await plain(r)); } catch (err) { /* saved next time it is used */ }
    }
  })());
});

/** The internet first; the saved copy if it is not there or too slow; for a page, the offline page last. */
async function fresh(e) {
  const req = e.request, c = await caches.open(CACHE);
  const net = fetch(req).then((res) => { e.waitUntil(put(req, res.clone())); return res; });
  const timer = new Promise((r) => setTimeout(() => r(null), WAIT));
  try {
    const res = await Promise.race([net, timer]);
    if (res) return res;
  } catch (err) { /* offline: use what was saved */ }
  const saved = (await c.match(req)) || (req.mode === "navigate" && (await c.match(req, { ignoreSearch: true }))); // ?room=… or other extras
  if (saved) return saved;
  try { return await net; } catch (err) { /* nothing saved and no internet */ }
  if (req.mode === "navigate") return (await c.match("/offline")) || new Response("You are offline.", { status: 503, headers: { "Content-Type": "text/plain" } });
  return new Response("", { status: 504 });
}
/** The saved copy at once (refreshed in the background); the internet if there is none. */
async function saved(e) {
  const req = e.request, c = await caches.open(CACHE), have = (await c.match(req)) || (await c.match(req, { ignoreSearch: true })); // a sound asked for with ?v=… is the same sound
  const net = fetch(req).then((res) => { e.waitUntil(put(req, res.clone())); return res; });
  if (have) { e.waitUntil(net.catch(() => {})); return have; }
  try { return await net; } catch (err) { return new Response("", { status: 504 }); }
}

/** Sounds are played a piece at a time ("bytes=0-" and so on): from the saved copy if there is one, else the internet. */
async function piece(req) {
  const c = await caches.open(CACHE), have = (await c.match(req.url)) || (await c.match(req.url, { ignoreSearch: true }));
  if (!have) return fetch(req);
  const blob = await have.blob(), size = blob.size, m = /bytes=(\d*)-(\d*)/.exec(req.headers.get("range") || "");
  let start = m && m[1] ? Number(m[1]) : 0, end = m && m[2] ? Number(m[2]) : size - 1;
  if (m && !m[1] && m[2]) { start = Math.max(0, size - Number(m[2])); end = size - 1; } // the last n bytes
  end = Math.min(end, size - 1);
  if (start > end || start >= size) return new Response("", { status: 416, headers: { "Content-Range": `bytes */${size}` } });
  return new Response(blob.slice(start, end + 1), { status: 206, headers: { "Content-Type": have.headers.get("Content-Type") || "audio/mp4", "Content-Range": `bytes ${start}-${end}/${size}`, "Content-Length": String(end - start + 1), "Accept-Ranges": "bytes" } });
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin === self.location.origin) {
    if (url.pathname.startsWith("/api/")) return; // online play needs the internet anyway
    if (req.headers.has("range")) { e.respondWith(piece(req)); return; } // sound played a piece at a time
    e.respondWith(req.mode === "navigate" || FRESH.test(url.pathname) ? fresh(e) : saved(e));
  } else if (url.hostname === "cdn.jsdelivr.net" && /@\d/.test(url.pathname)) {
    e.respondWith(saved(e)); // an exact version: it never changes
  }
});
