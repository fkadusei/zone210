/**
 * Zone 210 theme switch (light / dark).
 * Load this in <head> (synchronously) so the right theme is applied before the page paints.
 *  - Follows the device setting until the visitor picks a theme; then remembers the choice.
 *  - Any element with [data-theme-toggle] becomes a toggle. Pages without one get a small floating button,
 *    unless <html data-no-theme-toggle> is set.
 */
(function () {
  var KEY = "zone210_theme";
  var root = document.documentElement;
  var saved = null;
  try {
    saved = localStorage.getItem(KEY);
  } catch (err) {
    saved = null;
  }
  if (saved !== "light" && saved !== "dark") saved = null;

  // game pages hold the animated background still to save GPU and battery
  if (/\/games\//.test(location.pathname)) root.setAttribute("data-motion", "calm");

  var mq = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;
  var effective = function () {
    return saved || (mq && mq.matches ? "dark" : "light");
  };

  function apply() {
    var t = effective();
    root.setAttribute("data-theme", t);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", t === "dark" ? "#0a0e1a" : "#eef0f5");
    var pressed = t === "dark" ? "true" : "false";
    var label = t === "dark" ? "Switch to light mode" : "Switch to dark mode";
    var buttons = document.querySelectorAll("[data-theme-toggle]");
    for (var i = 0; i < buttons.length; i += 1) {
      buttons[i].setAttribute("aria-pressed", pressed);
      buttons[i].setAttribute("aria-label", label);
      buttons[i].setAttribute("title", label);
    }
  }

  function toggle() {
    saved = effective() === "dark" ? "light" : "dark";
    try {
      localStorage.setItem(KEY, saved);
    } catch (err) {
      // storage unavailable: the choice still applies for this visit
    }
    apply();
  }

  apply();
  if (mq && mq.addEventListener) {
    mq.addEventListener("change", function () {
      if (!saved) apply();
    });
  }

  var ICON =
    '<svg class="i-sun" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">' +
    '<circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.2 5.2l1.6 1.6M17.2 17.2l1.6 1.6M18.8 5.2l-1.6 1.6M6.8 17.2l-1.6 1.6"/></svg>' +
    '<svg class="i-moon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5a8.5 8.5 0 1 0 10.7 10.7Z"/></svg>';

  document.addEventListener("DOMContentLoaded", function () {
    var existing = document.querySelectorAll("[data-theme-toggle]");
    if (!existing.length && !root.hasAttribute("data-no-theme-toggle")) {
      var b = document.createElement("button");
      b.className = "theme-toggle theme-toggle-float";
      b.setAttribute("data-theme-toggle", "");
      b.type = "button";
      b.innerHTML = ICON;
      document.body.appendChild(b);
    } else {
      for (var i = 0; i < existing.length; i += 1) if (!existing[i].firstElementChild) existing[i].innerHTML = ICON;
    }
    document.addEventListener("click", function (e) {
      var t = e.target.closest ? e.target.closest("[data-theme-toggle]") : null;
      if (t) toggle();
    });
    apply();
  });

  window.Zone210Theme = { toggle: toggle, get: effective };
})();
