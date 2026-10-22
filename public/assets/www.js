/**
 * Zone 210 lives at www.zone210.com. A visit to zone210.com (no www) goes there, to the same page.
 * Load this first in <head>, before anything else, on every page. On www.zone210.com it starts the service worker.
 *
 * A browser keeps what a site saves (drawings, progress, settings) separately for zone210.com and www.zone210.com.
 * So the first time someone who has played at zone210.com is sent on, their saved things go with them: this page
 * hands them to www.zone210.com/move in a hidden frame, which keeps whatever www does not have yet, and then
 * the visit goes on. It is done once per device; if it cannot finish within a few seconds the visit goes on anyway
 * and it is tried again next time.
 */
(function () {
  if (location.hostname !== "zone210.com") {
    // here to stay: the service worker (sw.js) saves what is played, so the site keeps working offline
    if ("serviceWorker" in navigator) window.addEventListener("load", function () {
      navigator.serviceWorker.register("/sw.js").catch(function () { /* the site still works online */ });
      // on a first visit this page loaded before the service worker was there: tell it what the page used, to save too
      if (!navigator.serviceWorker.controller) navigator.serviceWorker.ready.then(function (reg) {
        var urls = [location.href].concat(performance.getEntriesByType("resource").map(function (r) { return r.name; }));
        if (reg.active) reg.active.postMessage({ zone210: "save", urls: urls });
      });
    });
    return;
  }
  var WWW = "https://www.zone210.com";
  var to = WWW + location.pathname + location.search + location.hash;
  var go = function () { location.replace(to); };
  var data = {}, n = 0;
  try {
    if (localStorage.getItem("zone210_moved") !== "1") {
      for (var i = 0; i < localStorage.length; i += 1) {
        var k = localStorage.key(i);
        if (k && k !== "zone210_moved") { data[k] = localStorage.getItem(k); n += 1; }
      }
    }
  } catch (err) { n = 0; }
  if (!n) { go(); return; }
  document.documentElement.style.visibility = "hidden"; // nothing to see here: the page is about to move
  var done = false;
  var finish = function (moved) {
    if (done) return;
    done = true;
    if (moved) { try { localStorage.setItem("zone210_moved", "1"); } catch (err) { /* it will simply be tried again */ } }
    go();
  };
  var frame = document.createElement("iframe");
  frame.src = WWW + "/move"; // (Cloudflare serves move.html at /move)
  frame.setAttribute("aria-hidden", "true");
  frame.setAttribute("tabindex", "-1");
  frame.style.cssText = "position:absolute;width:0;height:0;border:0;visibility:hidden";
  window.addEventListener("message", function (e) {
    if (e.origin !== WWW || !e.data) return;
    if (e.data.zone210 === "ready") frame.contentWindow.postMessage({ zone210: "move", data: data }, WWW);
    else if (e.data.zone210 === "moved") finish(true);
  });
  setTimeout(function () { finish(false); }, 4000);
  document.documentElement.appendChild(frame);
})();
