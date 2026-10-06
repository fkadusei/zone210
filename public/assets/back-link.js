// Adds a "Back" pill that works like the browser's Back button: if the visitor came from another Zone 210 page
// it goes back there (keeping their place in the list or the book); if they arrived from somewhere else (a shared
// link, a search) it takes them to the home page instead of leaving the site.
// Self-contained (inline style) so it can be dropped into games with their own stylesheets.
// A page with its own back link can mark it data-back and it gets the same behaviour instead of a new pill.
(function () {
  var me = document.currentScript;
  if (!me) return;
  var home = new URL("../", me.src).href; // /assets/back-link.js -> site root

  function cameFromSite() {
    try {
      return !!document.referrer && new URL(document.referrer).origin === location.origin && history.length > 1;
    } catch (err) {
      return false;
    }
  }
  function wire(a) {
    a.href = home; // still works without JavaScript, and for "open in new tab"
    a.addEventListener("click", function (e) {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      if (!cameFromSite()) return;
      e.preventDefault();
      history.back();
    });
  }

  var own = document.querySelector("[data-back]");
  if (own) return wire(own);

  // Pages that use the shared theme (shell.css) already style .back-link and follow light/dark.
  var themed = getComputedStyle(document.documentElement).getPropertyValue("--surface").trim() !== "";

  var style = document.createElement("style");
  style.textContent =
    ".back-link{position:fixed;top:max(14px,calc(env(safe-area-inset-top) + 8px));left:max(10px,env(safe-area-inset-left));z-index:2147483000;" +
    "display:inline-flex;align-items:center;gap:6px;padding:7px 13px;font:700 0.85rem 'Avenir Next','Trebuchet MS',system-ui,sans-serif;" +
    "color:#2a2433;text-decoration:none;background:#fff;border:1px solid rgba(42,36,51,.16);border-radius:999px;" +
    "box-shadow:0 3px 0 rgba(42,36,51,.12)}" +
    ".back-link:hover{background:#fff8e6}";
  if (!themed) document.head.appendChild(style);

  var a = document.createElement("a");
  a.className = "back-link";
  a.textContent = "← Back";
  a.setAttribute("aria-label", "Go back");
  wire(a);
  document.body.appendChild(a);
})();
