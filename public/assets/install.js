/**
 * "Install" on the home page: a button beside Battery saver (and a link in the footer) that opens the steps to add
 * Zone 210 to a phone's home screen or a computer, for the device it is opened on (tabs show the others).
 * Where the browser can install with one tap (Chrome and Edge on Android and computers), the steps start with an
 * "Install now" button. Hidden when Zone 210 is already open as an installed app.
 */
(function () {
  var ua = navigator.userAgent || "";
  var installed = (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) || window.navigator.standalone === true;
  var ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  var android = /Android/.test(ua);
  var device = ios ? "ios" : android ? "android" : "computer";
  var prompt = null; // the browser's own install offer, when there is one
  window.addEventListener("beforeinstallprompt", function (e) { e.preventDefault(); prompt = e; paint(); });
  window.addEventListener("appinstalled", function () { prompt = null; if (button) button.hidden = true; if (dialog && dialog.open) dialog.close(); });

  var PLUS = '<span class="ins-ico" aria-hidden="true">＋</span>';
  var SHARE = '<span class="ins-ico" aria-hidden="true"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15V3"/><path d="m7 8 5-5 5 5"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/></svg></span>';
  function steps(which) {
    if (which === "ios") {
      if (/CriOS|FxiOS|EdgiOS/.test(ua)) return ["Tap " + SHARE + " <b>Share</b> (in the address bar, or in the ⋯ menu).", "Scroll down and choose " + PLUS + " <b>Add to Home Screen</b>.", "Tap <b>Add</b>."];
      return ["Tap " + SHARE + " <b>Share</b>. In the new Safari layout, Share is in the ⋯ menu beside the address bar.", "Scroll down and choose " + PLUS + " <b>Add to Home Screen</b>.", "Keep <b>Open as Web App</b> on, then tap <b>Add</b>."];
    }
    if (which === "android") {
      if (/SamsungBrowser/.test(ua)) return ["Tap the <b>☰</b> menu at the bottom.", "Choose <b>Add page to</b>, then <b>Home screen</b>.", "Tap <b>Add</b>."];
      return ["Tap the <b>⋮</b> menu at the top right.", "Choose <b>Add to home screen</b> (or <b>Install app</b>).", "Tap <b>Install</b>."];
    }
    if (/Edg\//.test(ua)) return ["Click the <b>⋯</b> menu at the top right.", "Choose <b>Apps</b>, then <b>Install this site as an app</b>.", "Click <b>Install</b>."];
    if (/Safari/.test(ua) && !/Chrome|Chromium|Firefox/.test(ua)) return ["In Safari, open the <b>File</b> menu (or " + SHARE + " Share).", "Choose <b>Add to Dock</b>.", "Click <b>Add</b>."];
    if (/Firefox/.test(ua)) return ["Firefox can't install sites as apps. Open www.zone210.com in <b>Chrome</b>, <b>Edge</b> or <b>Safari</b>, and choose Install there.", "Or bookmark it: press <b>Ctrl + D</b> (<b>⌘ + D</b> on a Mac)."];
    return ["Click the install icon at the right end of the address bar (a screen with a down arrow).", "Or open the <b>⋮</b> menu, then <b>Cast, save and share</b>, then <b>Install page as app</b>.", "Click <b>Install</b>."];
  }
  var NAMES = { ios: "iPhone / iPad", android: "Android", computer: "Computer" };

  var button = null, dialog = null, shown = device;
  function paint() {
    if (!dialog) return;
    dialog.querySelectorAll("[data-dev]").forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-dev") === shown)); });
    dialog.querySelector(".ins-eyebrow").textContent = NAMES[shown];
    var now = prompt && !ios && shown === device ? '<button class="g-btn ins-now" type="button">📲 Install now</button><p class="ins-or">or do it yourself:</p>' : "";
    dialog.querySelector(".ins-body").innerHTML = now + "<ol>" + steps(shown).map(function (s) { return "<li>" + s + "</li>"; }).join("") + "</ol>";
    var nb = dialog.querySelector(".ins-now");
    if (nb) nb.addEventListener("click", function () { prompt.prompt(); prompt.userChoice.then(function () { prompt = null; paint(); }); });
  }
  function open() {
    if (!dialog) {
      dialog = document.createElement("dialog");
      dialog.className = "ins";
      dialog.setAttribute("aria-labelledby", "insTitle");
      dialog.innerHTML = '<button class="ins-x" type="button" aria-label="Close">✕</button><p class="ins-eyebrow"></p><h2 id="insTitle">Install Zone 210</h2><div class="ins-body"></div>' +
        '<p class="ins-foot">Zone 210 then opens like an app, from its own icon, and the games you have saved play without the internet.</p>' +
        '<div class="ins-tabs" role="group" aria-label="Steps for">' + ["ios", "android", "computer"].map(function (d) { return '<button type="button" data-dev="' + d + '">' + NAMES[d] + "</button>"; }).join("") + "</div>";
      document.body.appendChild(dialog);
      dialog.querySelector(".ins-x").addEventListener("click", function () { dialog.close(); });
      dialog.addEventListener("click", function (e) { if (e.target === dialog) dialog.close(); var d = e.target.closest && e.target.closest("[data-dev]"); if (d) { shown = d.getAttribute("data-dev"); paint(); } });
    }
    shown = device;
    paint();
    if (dialog.showModal) dialog.showModal(); else dialog.setAttribute("open", "");
  }
  window.z210Install = { open: open };

  function mount() {
    var style = document.createElement("style");
    style.textContent =
      ".ins-btn{gap:6px}.ins-btn .lbl{display:inline}@media (max-width:420px){.ins-btn .lbl{display:none}.ins-btn{padding:0 11px}}" +
      ".ins{width:min(92vw,520px);padding:26px 26px 20px;border-radius:22px;border:1px solid var(--line-strong,rgba(255,255,255,.2));background:var(--surface,#11152a);color:var(--ink,#eef1fa);box-shadow:0 30px 80px rgba(0,0,0,.5)}" +
      ".ins::backdrop{background:rgba(5,8,20,.6)}" +
      ".ins-x{position:absolute;top:16px;right:16px;width:42px;height:42px;border-radius:12px;border:1px solid var(--line,rgba(255,255,255,.15));background:transparent;color:inherit;font-size:1.1rem;cursor:pointer}" +
      ".ins-eyebrow{margin:0 0 6px;font-weight:800;font-size:.78rem;letter-spacing:.14em;text-transform:uppercase;color:var(--muted,#98a1bb)}" +
      ".ins h2{margin:0 0 14px;font-family:var(--font-head,inherit);font-size:clamp(1.6rem,6vw,2.1rem);line-height:1.1}" +
      ".ins ol{margin:0;padding-left:1.4em;display:grid;gap:10px;font-size:1.02rem;line-height:1.5}" +
      ".ins-ico{display:inline-grid;place-items:center;min-width:24px;height:24px;margin:0 2px;border:1.5px solid currentColor;border-radius:7px;font-weight:800;vertical-align:-5px}" +
      ".ins-now{margin:0 0 8px}.ins-or{margin:0 0 8px;color:var(--muted,#98a1bb);font-size:.9rem}" +
      ".ins-foot{margin:16px 0 14px;color:var(--muted,#98a1bb);font-size:.92rem;line-height:1.5}" +
      ".ins-tabs{display:flex;flex-wrap:wrap;gap:6px}.ins-tabs button{padding:6px 12px;border-radius:999px;border:1px solid var(--line,rgba(255,255,255,.15));background:transparent;color:var(--muted,#98a1bb);font:700 .82rem inherit;cursor:pointer}" +
      ".ins-tabs button[aria-pressed=true]{color:var(--ink,#fff);border-color:var(--gold,#f5b41f)}" +
      ".ins button:focus-visible{outline:3px solid var(--focus,#4f6df5);outline-offset:2px}";
    document.head.appendChild(style);
    document.querySelectorAll("[data-install]").forEach(function (a) { a.hidden = installed; a.addEventListener("click", function (e) { e.preventDefault(); open(); }); });
    if (installed) return;
    var saver = document.querySelector(".saver-toggle.inline");
    if (!saver) return;
    button = document.createElement("button");
    button.type = "button";
    button.className = "saver-toggle inline ins-btn";
    button.setAttribute("aria-label", "Install Zone 210");
    button.setAttribute("aria-haspopup", "dialog");
    button.innerHTML = '<span aria-hidden="true">📲</span><span class="lbl">Install</span>';
    button.addEventListener("click", open);
    saver.parentNode.insertBefore(button, saver);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount);
  else mount();
})();
