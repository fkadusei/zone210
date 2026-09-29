// Adds an "All games" pill that links back to the portal root, wherever the site is hosted.
// Self-contained (inline style) so it can be dropped into games with their own stylesheets.
(function () {
  var me = document.currentScript;
  if (!me) return;

  var style = document.createElement("style");
  style.textContent =
    ".back-link{position:fixed;top:max(14px,calc(env(safe-area-inset-top) + 8px));left:max(10px,env(safe-area-inset-left));z-index:2147483000;" +
    "display:inline-flex;align-items:center;gap:6px;padding:7px 13px;font:700 0.85rem 'Avenir Next','Trebuchet MS',system-ui,sans-serif;" +
    "color:#2a2433;text-decoration:none;background:#fff;border:1px solid rgba(42,36,51,.16);border-radius:999px;" +
    "box-shadow:0 3px 0 rgba(42,36,51,.12)}" +
    ".back-link:hover{background:#fff8e6}";
  document.head.appendChild(style);

  var a = document.createElement("a");
  a.className = "back-link";
  a.href = new URL("../", me.src).href; // /assets/back-link.js -> site root
  a.textContent = "← All games";
  a.setAttribute("aria-label", "Back to all games");
  document.body.appendChild(a);
})();
