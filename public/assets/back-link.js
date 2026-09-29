// Adds an "All games" pill that links back to the portal root, wherever the site is hosted.
// Self-contained (inline style) so it can be dropped into games with their own stylesheets.
(function () {
  var me = document.currentScript;
  if (!me) return;

  var style = document.createElement("style");
  style.textContent =
    ".back-link{position:fixed;top:max(10px,env(safe-area-inset-top));left:max(10px,env(safe-area-inset-left));z-index:2147483000;" +
    "display:inline-flex;align-items:center;gap:6px;padding:7px 13px;font:700 0.85rem 'Avenir Next','Trebuchet MS',system-ui,sans-serif;" +
    "color:#f6efe2;text-decoration:none;background:rgba(28,20,15,.86);border:1px solid rgba(255,233,190,.22);border-radius:999px;" +
    "box-shadow:0 6px 16px rgba(0,0,0,.4);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px)}" +
    ".back-link:hover{background:rgba(60,44,34,.94)}";
  document.head.appendChild(style);

  var a = document.createElement("a");
  a.className = "back-link";
  a.href = new URL("../", me.src).href; // /assets/back-link.js -> site root
  a.textContent = "← All games";
  a.setAttribute("aria-label", "Back to all games");
  document.body.appendChild(a);
})();
