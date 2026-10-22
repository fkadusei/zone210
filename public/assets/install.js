/**
 * "Install": a button on every page (beside Battery saver) that opens the steps to add Zone 210 to the home
 * screen or computer it is opened on: the device and browser are worked out here, so only their steps are shown
 * (an iPhone with the newest Safari is told about its ⋯ menu, an older one about the Share button at the bottom).
 * Where the browser can install with one tap (Chrome and Edge on Android and computers) the steps start with an
 * "Install now" button. The home page also has a link to the same steps in its footer ([data-install]).
 * Hidden when Zone 210 is already open as an installed app. Loaded on every page by assets/www.js.
 */
(function () {
  if (window.z210Install) return;
  var ua = navigator.userAgent || "";
  var installed = (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) || window.navigator.standalone === true;
  var prompt = null; // the browser's own install offer, when there is one
  window.addEventListener("beforeinstallprompt", function (e) { e.preventDefault(); prompt = e; if (dialog && dialog.open) paint(); });
  window.addEventListener("appinstalled", function () { prompt = null; if (button) button.hidden = true; if (dialog && dialog.open) dialog.close(); });

  // ---------- which device and browser ----------
  var ipad = /iPad/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1); // iPads say they are Macs
  var iphone = /iPhone|iPod/.test(ua);
  var ios = ipad || iphone, android = /Android/.test(ua);
  var iosMajor = Number((ua.match(/OS (\d+)_/) || ua.match(/Version\/(\d+)/) || [])[1] || 0);
  var browser = /SamsungBrowser/.test(ua) ? "Samsung Internet" : /EdgiOS|EdgA|Edg\//.test(ua) ? "Edge" : /FxiOS|Firefox/.test(ua) ? "Firefox" : /CriOS|Chrome|Chromium/.test(ua) ? "Chrome" : /Safari/.test(ua) ? "Safari" : "your browser";
  var device = ipad ? "iPad" : iphone ? "iPhone" : android ? "Android" : /Mac/.test(ua) ? "Mac" : /Windows/.test(ua) ? "Windows" : /CrOS/.test(ua) ? "Chromebook" : /Linux/.test(ua) ? "Linux" : "computer";

  var PLUS = '<span class="ins-ico" aria-hidden="true">＋</span>';
  var SHARE = '<span class="ins-ico" aria-hidden="true"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15V3"/><path d="m7 8 5-5 5 5"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/></svg></span>';
  var DOTS = '<span class="ins-ico" aria-hidden="true">⋯</span>';
  /** The steps for this device and browser, or null if it can't install sites (it gets other advice). */
  function steps() {
    if (ios) {
      var share;
      if (browser === "Safari") share = iosMajor >= 26 ? "Tap " + DOTS + " beside the address bar, then " + SHARE + " <b>Share</b>." : ipad ? "Tap " + SHARE + " <b>Share</b> at the top right of the screen." : "Tap " + SHARE + " <b>Share</b> at the bottom of the screen.";
      else share = "Tap " + SHARE + " <b>Share</b> in the address bar (or in the " + DOTS + " menu).";
      return [share, "Scroll down and choose " + PLUS + " <b>Add to Home Screen</b>.", browser === "Safari" && iosMajor >= 18 ? "Keep <b>Open as Web App</b> on, then tap <b>Add</b>." : "Tap <b>Add</b>."];
    }
    if (android) {
      if (browser === "Samsung Internet") return ["Tap the <b>☰</b> menu at the bottom of the screen.", "Choose <b>Add page to</b>, then <b>Home screen</b>.", "Tap <b>Add</b>."];
      if (browser === "Firefox") return ["Tap the <b>⋮</b> menu.", "Choose <b>Add app to Home screen</b> (or <b>Install</b>).", "Tap <b>Add</b>."];
      if (browser === "Edge") return ["Tap the <b>⋯</b> menu at the bottom.", "Choose <b>Add to phone</b>.", "Tap <b>Install</b>."];
      return ["Tap the <b>⋮</b> menu at the top right.", "Choose <b>Add to home screen</b>, then <b>Install</b>.", "Tap <b>Install</b> again to confirm."];
    }
    if (browser === "Edge") return ["Click the <b>⋯</b> menu at the top right.", "Choose <b>Apps</b>, then <b>Install this site as an app</b>.", "Click <b>Install</b>."];
    if (browser === "Safari") return ["Open the <b>File</b> menu at the top of the screen.", "Choose <b>Add to Dock</b>.", "Click <b>Add</b>."];
    if (browser === "Chrome") return ["Click the install icon at the right end of the address bar (a screen with a down arrow).", "If it isn't there: open the <b>⋮</b> menu, then <b>Cast, save and share</b>, then <b>Install page as app</b>.", "Click <b>Install</b>."];
    return null;
  }

  var button = null, dialog = null;
  function paint() {
    var list = steps();
    dialog.querySelector(".ins-eyebrow").textContent = device + (browser !== "your browser" ? " · " + browser : "");
    var now = prompt && !ios ? '<button class="g-btn ins-now" type="button">📲 Install now</button><p class="ins-or">Or do it yourself:</p>' : "";
    dialog.querySelector(".ins-body").innerHTML = list ? now + "<ol>" + list.map(function (s) { return "<li>" + s + "</li>"; }).join("") + "</ol>"
      : "<p>" + browser + " can't add sites as apps. Open <b>www.zone210.com</b> in " + (/Mac/.test(device) ? "Safari, Chrome or Edge" : "Chrome or Edge") + " and choose Install there, or bookmark it with <b>" + (/Mac/.test(device) ? "⌘" : "Ctrl") + " + D</b>.</p>";
    var nb = dialog.querySelector(".ins-now");
    if (nb) nb.addEventListener("click", function () { prompt.prompt(); prompt.userChoice.then(function () { prompt = null; paint(); }); });
  }
  function open() {
    if (!dialog) {
      dialog = document.createElement("dialog");
      dialog.className = "ins";
      dialog.setAttribute("aria-labelledby", "insTitle");
      dialog.innerHTML = '<button class="ins-x" type="button" aria-label="Close">✕</button><p class="ins-eyebrow"></p><h2 id="insTitle">Install Zone 210</h2><div class="ins-body"></div>' +
        '<p class="ins-foot">Zone 210 then opens like an app, from its own icon, with every game inside, and the games you have saved play without the internet.</p>';
      document.body.appendChild(dialog);
      dialog.querySelector(".ins-x").addEventListener("click", function () { dialog.close(); });
      dialog.addEventListener("click", function (e) { if (e.target === dialog) dialog.close(); });
    }
    paint();
    if (dialog.showModal) dialog.showModal(); else dialog.setAttribute("open", "");
  }
  window.z210Install = { open: open };

  // ---------- the button: beside Battery saver, wherever that is on the page ----------
  function place() { // where Battery saver floats (game pages), sit just beside it
    if (!button || !button.classList.contains("float")) return;
    var saver = document.querySelector(".saver-toggle"), r = saver && saver.getBoundingClientRect();
    if (!r || !r.width) return;
    if (document.body.classList.contains("saver-corner")) { button.style.left = r.right + 8 + "px"; button.style.right = "auto"; } // Ludo keeps it at the bottom left
    else { button.style.right = document.documentElement.clientWidth - r.left + 8 + "px"; button.style.left = "auto"; }
  }
  function mount() {
    var style = document.createElement("style");
    style.textContent =
      ".ins-btn{display:inline-flex;align-items:center;gap:6px;height:38px;padding:0 12px;font:700 0.8rem ui-sans-serif,-apple-system,'Segoe UI',Roboto,Arial,sans-serif;color:var(--ink,#161a2b);background:var(--surface,#fff);border:1px solid var(--line,rgba(0,0,0,.15));border-radius:999px;box-shadow:var(--shadow,0 2px 8px rgba(0,0,0,.2));cursor:pointer;flex:none}.ins-btn:hover{background:var(--surface-2,#f3f3f8)}.ins-btn:focus-visible{outline:3px solid var(--focus,#4f6df5);outline-offset:2px}.ins-btn .lbl{display:inline}@media (max-width:420px){.ins-btn .lbl{display:none}.ins-btn{padding:0 11px}}" +
      ".ins-btn.float{position:fixed;top:max(14px,calc(env(safe-area-inset-top) + 8px));z-index:55}" +
      "body.saver-corner .ins-btn.float{top:auto;bottom:max(12px,env(safe-area-inset-bottom))}" +
      ".ins{width:min(92vw,520px);padding:26px 26px 22px;border-radius:22px;border:1px solid var(--line-strong,rgba(255,255,255,.2));background:var(--surface,#11152a);color:var(--ink,#eef1fa);box-shadow:0 30px 80px rgba(0,0,0,.5)}" +
      ".ins::backdrop{background:rgba(5,8,20,.6)}" +
      ".ins-x{position:absolute;top:16px;right:16px;width:42px;height:42px;border-radius:12px;border:1px solid var(--line,rgba(255,255,255,.15));background:transparent;color:inherit;font-size:1.1rem;cursor:pointer}" +
      ".ins-eyebrow{margin:0 0 6px;font-weight:800;font-size:.78rem;letter-spacing:.14em;text-transform:uppercase;color:var(--muted,#98a1bb)}" +
      ".ins h2{margin:0 0 14px;font-family:var(--font-head,inherit);font-size:clamp(1.6rem,6vw,2.1rem);line-height:1.1}" +
      ".ins ol{margin:0;padding-left:1.4em;display:grid;gap:10px;font-size:1.02rem;line-height:1.5}.ins-body p{margin:0;line-height:1.5}" +
      ".ins-ico{display:inline-grid;place-items:center;min-width:24px;height:24px;margin:0 2px;border:1.5px solid currentColor;border-radius:7px;font-weight:800;vertical-align:-5px}" +
      ".ins-now{margin:0 0 8px}.ins-or{margin:0 0 8px!important;color:var(--muted,#98a1bb);font-size:.9rem}" +
      ".ins-foot{margin:16px 0 0;color:var(--muted,#98a1bb);font-size:.92rem;line-height:1.5}" +
      ".ins button:focus-visible{outline:3px solid var(--focus,#4f6df5);outline-offset:2px}";
    document.head.appendChild(style);
    document.querySelectorAll("[data-install]").forEach(function (a) { a.hidden = installed; a.addEventListener("click", function (e) { e.preventDefault(); open(); }); });
    if (installed) return;
    var saver = document.querySelector(".saver-toggle");
    button = document.createElement("button");
    button.type = "button";
    button.className = "ins-btn";
    button.setAttribute("aria-label", "Install Zone 210");
    button.setAttribute("aria-haspopup", "dialog");
    button.innerHTML = '<span aria-hidden="true">📲</span><span class="lbl">Install</span>';
    button.addEventListener("click", open);
    if (!saver) { button.classList.add("float"); button.style.right = "max(12px, env(safe-area-inset-right))"; document.body.appendChild(button); } // a page without Battery saver
    else if (saver.classList.contains("inline")) { button.classList.add("inline"); saver.parentNode.insertBefore(button, saver); } // the home page's header
    else {
      button.classList.add("float");
      document.body.appendChild(button);
      place();
      window.addEventListener("resize", place);
      if (window.ResizeObserver) new ResizeObserver(place).observe(saver); // "Saver" ↔ "Saver on"
    }
  }
  // after Battery saver has put its button in place
  var tries = 0;
  var start = function () { if (!document.querySelector(".saver-toggle") && tries++ < 20) { setTimeout(start, 100); return; } mount(); };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
