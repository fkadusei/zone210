/**
 * The home page sky: tiny stars that fade and glow, and frequent shooting stars (dark theme), or soft drifting
 * golden sparkles (light theme). One small canvas behind everything, about 30 frames a second, paused when the tab
 * is hidden. Battery saver or the device's "reduce motion" setting shows a still sky instead.
 */
(function () {
  var root = document.documentElement;
  var cv = document.createElement("canvas");
  cv.className = "sky";
  cv.setAttribute("aria-hidden", "true");
  document.body.insertBefore(cv, document.body.firstChild);
  var ctx = cv.getContext("2d");
  var W = 0, H = 0, dpr = 1, stars = [], meteors = [], nextMeteor = 0, raf = 0, last = 0;
  var reduce = window.matchMedia ? matchMedia("(prefers-reduced-motion: reduce)") : { matches: false };
  var dark = function () { return root.getAttribute("data-theme") !== "light"; };
  var calm = function () { return root.getAttribute("data-saver") === "on" || reduce.matches; };
  var rnd = function (a, b) { return a + Math.random() * (b - a); };

  // a soft glow, drawn once and stamped for each star
  function sprite(color) {
    var s = document.createElement("canvas");
    s.width = s.height = 64;
    var g = s.getContext("2d");
    var grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, "rgba(" + color + ",1)");
    grad.addColorStop(0.18, "rgba(" + color + ",0.85)");
    grad.addColorStop(0.45, "rgba(" + color + ",0.18)");
    grad.addColorStop(1, "rgba(" + color + ",0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
    return s;
  }
  var SPRITES = { white: sprite("255,255,255"), blue: sprite("190,215,255"), gold: sprite("255,214,140"), peach: sprite("255,170,120") };

  function build() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    cv.width = Math.round(W * dpr);
    cv.height = Math.round(H * dpr);
    cv.style.width = W + "px";
    cv.style.height = H + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    stars = [];
    var n = dark() ? Math.min(150, Math.round((W * H) / 8000)) : Math.min(46, Math.round((W * H) / 26000));
    for (var i = 0; i < n; i += 1) {
      var big = Math.random() < (dark() ? 0.1 : 0.3);
      stars.push({
        x: Math.random() * W, y: Math.random() * H,
        r: dark() ? (big ? rnd(2.2, 3.4) : rnd(0.8, 1.7)) : rnd(3, 7),
        a: dark() ? rnd(0.5, 1) : rnd(0.3, 0.6),
        sp: rnd(0.4, 1.6), ph: Math.random() * Math.PI * 2,
        dy: dark() ? 0 : rnd(-6, -2), // light theme: sparkles drift slowly upwards (pixels a second)
        img: dark() ? (Math.random() < 0.7 ? SPRITES.white : Math.random() < 0.6 ? SPRITES.blue : SPRITES.gold) : Math.random() < 0.6 ? SPRITES.gold : SPRITES.peach,
      });
    }
    meteors = [];
    nextMeteor = performance.now() + rnd(800, 2500);
  }

  function meteor() {
    var fromLeft = Math.random() < 0.5;
    var ang = rnd(0.35, 0.7); // downward slope
    var speed = rnd(700, 1100); // pixels a second
    meteors.push({ x: fromLeft ? rnd(-50, W * 0.5) : rnd(W * 0.5, W + 50), y: rnd(-30, H * 0.35), vx: (fromLeft ? 1 : -1) * Math.cos(ang) * speed, vy: Math.sin(ang) * speed, len: rnd(110, 210), life: 0, max: rnd(0.7, 1.1) });
  }

  function draw(t, dt) {
    ctx.clearRect(0, 0, W, H);
    var still = calm();
    for (var i = 0; i < stars.length; i += 1) {
      var s = stars[i];
      if (!still && s.dy) { s.y += s.dy * dt; if (s.y < -10) { s.y = H + 10; s.x = Math.random() * W; } }
      var tw = still ? 0.75 : 0.55 + 0.45 * Math.sin(s.ph + (t / 1000) * s.sp);
      ctx.globalAlpha = s.a * tw;
      var d = s.r * 6;
      ctx.drawImage(s.img, s.x - d / 2, s.y - d / 2, d, d);
    }
    ctx.globalAlpha = 1;
    if (still || !dark()) return;
    if (t > nextMeteor) { meteor(); if (Math.random() < 0.2) meteor(); nextMeteor = t + rnd(1800, 4500); } // frequent, sometimes two at once
    for (var j = meteors.length - 1; j >= 0; j -= 1) {
      var m = meteors[j];
      m.life += dt;
      m.x += m.vx * dt;
      m.y += m.vy * dt;
      var k = m.life / m.max;
      if (k >= 1) { meteors.splice(j, 1); continue; }
      var fade = k < 0.2 ? k / 0.2 : 1 - (k - 0.2) / 0.8;
      var sp = Math.hypot(m.vx, m.vy);
      var tx = m.x - (m.vx / sp) * m.len, ty = m.y - (m.vy / sp) * m.len;
      var g = ctx.createLinearGradient(m.x, m.y, tx, ty);
      g.addColorStop(0, "rgba(255,255,255," + 0.95 * fade + ")");
      g.addColorStop(0.3, "rgba(200,220,255," + 0.45 * fade + ")");
      g.addColorStop(1, "rgba(200,220,255,0)");
      ctx.strokeStyle = g;
      ctx.lineWidth = 1.8;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(m.x, m.y);
      ctx.lineTo(tx, ty);
      ctx.stroke();
      ctx.globalAlpha = fade;
      ctx.drawImage(SPRITES.white, m.x - 9, m.y - 9, 18, 18);
      ctx.globalAlpha = 1;
    }
  }

  function frame(t) {
    raf = 0;
    if (document.hidden) return;
    var dt = last ? Math.min(0.1, (t - last) / 1000) : 0;
    if (t - last >= 32 || !last) { draw(t, dt); last = t; } // about 30 frames a second
    if (!calm()) raf = requestAnimationFrame(frame);
  }
  function start() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    last = 0;
    if (calm()) draw(performance.now(), 0); // one still picture
    else raf = requestAnimationFrame(frame);
  }

  var resizeTimer = 0;
  window.addEventListener("resize", function () { clearTimeout(resizeTimer); resizeTimer = setTimeout(function () { build(); start(); }, 150); });
  document.addEventListener("visibilitychange", function () { if (!document.hidden) start(); });
  window.addEventListener("z210:saver", start);
  if (reduce.addEventListener) reduce.addEventListener("change", start);
  // the theme switch: rebuild for stars or sparkles
  new MutationObserver(function () { build(); start(); }).observe(root, { attributes: true, attributeFilter: ["data-theme"] });
  window.z210Sky = { meteor: function () { if (dark() && !calm()) meteor(); } }; // for testing: a shooting star now
  build();
  start();
})();
