/**
 * The home page's "Save all games for offline" button. It saves every file of every game (the list is
 * offline-files.json, made by tools/offline-files.mjs) into the same store the service worker (sw.js) uses, so all
 * the games work without the internet, not only those played before. The story narration is most of the size, so
 * it is saved only when its box is ticked. It shows its progress, says when everything is saved, and offers to save
 * again when the site has gained new files since.
 */
const box = document.getElementById("offline");
const ok = box && "caches" in window && "serviceWorker" in navigator && location.hostname !== "zone210.com";

if (ok) {
  const $ = (id) => document.getElementById(id);
  const mb = (b) => `${Math.max(1, Math.round(b / 1048576))} MB`;
  let list = null, busy = false;

  /** How many of the files are not saved yet: { games, stories }. */
  async function missing(cache) {
    const have = new Set((await cache.keys()).map((r) => { const u = new URL(r.url); return u.origin === location.origin ? u.pathname : u.href; }));
    const count = (urls) => urls.filter((u) => !have.has(u)).length;
    return { games: count(list.games), stories: count(list.stories) };
  }
  async function show() {
    const cache = await caches.open(`zone210-${list.version}`), m = await missing(cache), stories = $("saveStories").checked;
    $("saveStories").nextElementSibling.textContent = `Include the story narration (+${mb(list.bytes.stories)})`;
    if (!m.games && (!stories || !m.stories)) {
      $("saveAll").textContent = "✓ All games saved for offline";
      $("saveAll").disabled = true;
      $("saveNote").textContent = stories || !list.stories.length ? "Every game works on this device without the internet." : "Every game works without the internet. Tick the box to save the story narration too.";
    } else {
      $("saveAll").disabled = false;
      $("saveAll").textContent = `📥 Save all games for offline (${mb(list.bytes.games * (m.games / list.games.length) + (stories ? list.bytes.stories * (m.stories / Math.max(1, list.stories.length)) : 0))})`;
      $("saveNote").textContent = m.games < list.games.length ? "Some are saved already: the rest will be added." : "";
    }
  }
  async function saveAll() {
    if (busy) return;
    busy = true;
    $("saveAll").disabled = true;
    try { if (navigator.storage && navigator.storage.persist) await navigator.storage.persist(); } catch (err) { /* the browser decides */ }
    const cache = await caches.open(`zone210-${list.version}`);
    const have = new Set((await cache.keys()).map((r) => r.url));
    const todo = list.games.concat($("saveStories").checked ? list.stories : []).map((u) => new URL(u, location.origin).href).filter((u) => !have.has(u));
    let done = 0, failed = 0;
    const one = async (url) => {
      try {
        const res = await fetch(url, { cache: "no-cache", mode: url.startsWith(location.origin) ? "same-origin" : "cors" });
        if (!res.ok) throw new Error(res.status);
        // a page Cloudflare reached by a redirect is kept as a plain answer, which a page visit accepts
        await cache.put(url, res.redirected ? new Response(await res.blob(), { status: res.status, statusText: res.statusText, headers: res.headers }) : res);
      } catch (err) { failed += 1; }
      done += 1;
      if (done % 5 === 0 || done === todo.length) $("saveAll").textContent = `Saving… ${Math.round((100 * done) / todo.length)}%`;
    };
    // six at a time, as a browser does
    const queue = todo.slice();
    await Promise.all(Array.from({ length: 6 }, async () => { while (queue.length) await one(queue.shift()); }));
    busy = false;
    await show();
    if (failed) $("saveNote").textContent = `${failed} ${failed === 1 ? "file" : "files"} could not be saved (the internet may have dropped). Tap the button again to try those.`;
    else $("saveNote").textContent = "Done! Every game now works on this device without the internet.";
  }

  (async () => {
    try { list = await (await fetch("/offline-files.json", { cache: "no-cache" })).json(); } catch (err) { return; } // offline already: nothing to offer
    box.hidden = false;
    $("saveAll").addEventListener("click", saveAll);
    $("saveStories").addEventListener("change", () => { if (!busy) show(); });
    show();
  })();
}
