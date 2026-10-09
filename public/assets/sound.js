/**
 * Shared, phone-proof game audio (Web Audio has no asset files). Load before a game's script.
 *  - creates one AudioContext and resumes it whenever it is suspended or "interrupted" (calls, app switches)
 *  - unlocks audio on the first touch / key press
 *  - plays a silent clip so iPhones keep Web Audio audible even with the ringer switch on silent
 *  - when you come back to a page that was left in the background (an iPhone tab left overnight), checks the context
 *    still works; iOS can leave it stuck and silent, so a stuck one is replaced on the next tap, and the page gets a
 *    "z210:audio-reset" event so anything long-running (music, loops) can stop and be started again
 * Games call window.z210Audio.get() for the context instead of creating their own.
 */
(function () {
  var ctx = null;
  var silentEl = null;
  var stale = false;
  var SILENT = "data:audio/wav;base64,UklGRkQDAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YSADAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgA==";

  function get() {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (stale && ctx) {
      // a stuck context from before the page was put away: tell the page, then start over with a fresh one
      stale = false;
      var old = ctx;
      ctx = null;
      if (silentEl) { try { silentEl.pause(); } catch (err) { /* gone */ } silentEl = null; }
      try { window.dispatchEvent(new CustomEvent("z210:audio-reset")); } catch (err) { /* old browser */ }
      try { old.close().catch(function () {}); } catch (err) { /* already closed */ }
    }
    stale = false;
    if (!ctx || ctx.state === "closed") ctx = new AC();
    if (ctx.state !== "running") ctx.resume().catch(function () {});
    return ctx;
  }

  function unlock() {
    if (!stale && ctx && ctx.state === "running" && silentEl && !silentEl.paused) return;
    try {
      if (navigator.audioSession) navigator.audioSession.type = "playback"; // Safari 16.4+: play even on silent
      var c = get();
      if (!c) return;
      var src = c.createBufferSource();
      src.buffer = c.createBuffer(1, 1, 22050);
      src.connect(c.destination);
      src.start(0);
      if (!silentEl) {
        silentEl = new Audio(SILENT);
        silentEl.loop = true;
        silentEl.setAttribute("playsinline", "");
      }
      silentEl.play().catch(function () {});
    } catch (err) {
      /* audio unavailable */
    }
  }

  function resume() {
    if (ctx && ctx.state !== "running") ctx.resume().catch(function () {});
    if (silentEl && silentEl.paused) silentEl.play().catch(function () {});
  }

  // back on the page: if the context isn't running, or its clock has stopped, it is stuck (iOS after a long time away)
  function check() {
    if (!ctx || ctx.state === "closed") return;
    var c = ctx, t0 = c.currentTime;
    resume();
    setTimeout(function () {
      if (c === ctx && (c.state !== "running" || c.currentTime - t0 < 0.15)) stale = true;
    }, 700);
  }

  ["pointerdown", "touchstart", "touchend", "mousedown", "keydown", "click"].forEach(function (type) {
    document.addEventListener(type, unlock, { capture: true, passive: true });
  });
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible") check();
  });
  window.addEventListener("pageshow", function (e) { if (e.persisted) check(); else resume(); });
  window.addEventListener("focus", resume);

  window.z210Audio = { get: get, unlock: unlock, resume: resume };
})();
