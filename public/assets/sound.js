/**
 * Shared, phone-proof game audio (Web Audio has no asset files). Load before a game's script.
 *  - creates one AudioContext and resumes it whenever it is suspended or "interrupted" (calls, app switches)
 *  - unlocks audio on the first touch / key press
 *  - plays a silent clip so iPhones keep Web Audio audible even with the ringer switch on silent
 * Games call window.z210Audio.get() for the context instead of creating their own.
 */
(function () {
  var ctx = null;
  var silentEl = null;
  var SILENT = "data:audio/wav;base64,UklGRkQDAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YSADAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgA==";

  function get() {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!ctx || ctx.state === "closed") ctx = new AC();
    if (ctx.state !== "running") ctx.resume().catch(function () {});
    return ctx;
  }

  function unlock() {
    if (ctx && ctx.state === "running" && silentEl && !silentEl.paused) return;
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

  ["pointerdown", "touchstart", "touchend", "mousedown", "keydown", "click"].forEach(function (type) {
    document.addEventListener(type, unlock, { capture: true, passive: true });
  });
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible") resume();
  });
  window.addEventListener("pageshow", resume);
  window.addEventListener("focus", resume);

  window.z210Audio = { get: get, unlock: unlock, resume: resume };
})();
