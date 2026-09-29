/**
 * Battery saver for all of Zone 210. One switch (top right, next to the theme button) that:
 *  - freezes the animated background and card animations
 *  - drops 3D games to lower resolution, no shadows and a lower frame rate
 *  - draws Tetris at half rate
 * Remembered per device. If the visitor has never chosen, it turns itself on when the browser reports
 * Data Saver or a low, unplugged battery.
 * Games read window.z210Saver.on and listen for the "z210:saver" event.
 */
(function () {
  var KEY = "zone210_saver";
  var root = document.documentElement;
  var stored = null;
  try {
    stored = localStorage.getItem(KEY);
  } catch (err) {
    stored = null;
  }
  var on = stored === "on" ? true : stored === "off" ? false : !!(navigator.connection && navigator.connection.saveData);
  var button = null;

  function paint() {
    root.setAttribute("data-saver", on ? "on" : "off");
    if (button) {
      button.setAttribute("aria-pressed", String(on));
      button.title = on ? "Battery saver is on (tap to turn off)" : "Battery saver is off (tap to reduce heat and battery use)";
      button.querySelector("span").textContent = on ? "Saver on" : "Saver";
    }
  }
  function set(value, remember) {
    on = !!value;
    if (remember) {
      try {
        localStorage.setItem(KEY, on ? "on" : "off");
      } catch (err) {
        /* private mode */
      }
    }
    paint();
    window.dispatchEvent(new CustomEvent("z210:saver", { detail: { on: on } }));
  }

  window.z210Saver = {
    get on() {
      return on;
    },
    set: function (v) {
      set(v, true);
    },
    toggle: function () {
      set(!on, true);
    },
  };
  paint();

  if (stored === null && navigator.getBattery) {
    navigator.getBattery().then(function (b) {
      if (!b.charging && b.level <= 0.2 && !on) set(true, false);
    }).catch(function () {});
  }

  function mount() {
    if (document.querySelector(".saver-toggle")) return;
    var style = document.createElement("style");
    style.textContent =
      ".saver-toggle{position:fixed;top:max(14px,calc(env(safe-area-inset-top) + 8px));right:calc(max(12px,env(safe-area-inset-right)) + 48px);z-index:55;display:inline-flex;align-items:center;gap:6px;height:38px;padding:0 12px;font:700 0.8rem ui-sans-serif,-apple-system,'Segoe UI',Roboto,Arial,sans-serif;color:var(--ink,#161a2b);background:var(--surface,#fff);border:1px solid var(--line,rgba(0,0,0,.15));border-radius:999px;box-shadow:var(--shadow,0 2px 8px rgba(0,0,0,.2));cursor:pointer}" +
      ".saver-toggle.inline{position:static;flex:none}" +
      ".saver-toggle:hover{background:var(--surface-2,#f3f3f8)}" +
      ".saver-toggle[aria-pressed=true]{background:#1f9d61;color:#fff;border-color:transparent}" +
      ".saver-toggle:focus-visible{outline:3px solid var(--focus,#4f6df5);outline-offset:2px}" +
      "body.saver-corner .saver-toggle{top:auto;bottom:max(12px,env(safe-area-inset-bottom));left:max(12px,env(safe-area-inset-left));right:auto;opacity:.9}";
    document.head.appendChild(style);
    if (document.querySelector(".topbar")) document.body.classList.add("saver-corner"); // Ludo has its own top bar
    button = document.createElement("button");
    button.type = "button";
    button.className = "saver-toggle";
    button.innerHTML = '<span aria-hidden="false">Saver</span>';
    button.setAttribute("aria-label", "Battery saver");
    button.addEventListener("click", function () {
      window.z210Saver.toggle();
    });
    // where the page has its own theme button in a header (the home page), sit right beside it instead of floating
    var toggle = document.querySelector("[data-theme-toggle]");
    if (toggle && !toggle.classList.contains("theme-toggle-float") && toggle.parentNode) {
      button.classList.add("inline");
      var wrap = document.createElement("span");
      wrap.style.cssText = "display:inline-flex;align-items:center;gap:8px;flex:none";
      toggle.parentNode.insertBefore(wrap, toggle);
      wrap.appendChild(button);
      wrap.appendChild(toggle);
    } else {
      document.body.appendChild(button);
    }
    button.insertAdjacentHTML("afterbegin", '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="7" width="16" height="10" rx="2"/><path d="M22 11v2"/><path d="M6 10v4"/></svg>');
    paint();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount);
  else mount();
})();
