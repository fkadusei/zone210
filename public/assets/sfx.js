/**
 * Small, ready-made sound effects for games that don't make their own, made in the browser (no sound files), plus
 * the "🔊 Sound on" button. Load after assets/sound.js (which keeps audio working on phones):
 *
 *   <script src="../../assets/sound.js"></script>
 *   <script src="../../assets/sfx.js"></script>
 *   z210Sfx.init("minesweeper");   // adds the Sound on/off button to the page's header; remembered for this game
 *   z210Sfx.play("good");          // tap, place, drop, good, bad, win, lose, pop, flip, slide, merge, boom, tick, type
 *
 * Every effect is short and quiet, so it never covers the game. Battery saver does not turn sound off.
 */
(function () {
  var muted = false, key = null, btn = null;
  function ctx() { return window.z210Audio && window.z210Audio.get(); }
  // one note: frequency, when it starts (seconds from now), how long, the kind of wave, how loud, and a slide to
  function note(f, at, len, type, vol, to) {
    var c = ctx();
    if (!c) return;
    var t = c.currentTime + (at || 0), o = c.createOscillator(), g = c.createGain();
    o.type = type || "triangle";
    o.frequency.setValueAtTime(f, t);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + len);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol || 0.08, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    o.connect(g); g.connect(c.destination);
    o.start(t); o.stop(t + len + 0.03);
  }
  // a short burst of noise, for thuds and bangs
  function noise(at, len, vol, lowpass) {
    var c = ctx();
    if (!c) return;
    var t = c.currentTime + (at || 0), n = Math.floor(c.sampleRate * len), b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0);
    for (var i = 0; i < n; i += 1) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2);
    var s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = b; f.type = "lowpass"; f.frequency.value = lowpass || 1200; g.gain.value = vol || 0.2;
    s.connect(f); f.connect(g); g.connect(c.destination);
    s.start(t);
  }
  var run = function (fs, gap, len, type, vol) { fs.forEach(function (f, i) { note(f, i * gap, len, type, vol); }); };
  var SOUNDS = {
    tap: function () { note(660, 0, 0.05, "triangle", 0.05); },
    type: function () { note(900 + Math.random() * 120, 0, 0.03, "square", 0.025); },
    tick: function () { note(1200, 0, 0.03, "sine", 0.04); },
    place: function () { note(520, 0, 0.08, "triangle", 0.08); note(780, 0.04, 0.08, "triangle", 0.05); },
    drop: function () { note(700, 0, 0.16, "sine", 0.08, 260); noise(0.14, 0.08, 0.12, 700); },
    slide: function () { noise(0, 0.07, 0.06, 2400); },
    merge: function () { note(440, 0, 0.1, "triangle", 0.07); note(660, 0.05, 0.12, "triangle", 0.06); },
    pop: function () { note(880, 0, 0.07, "sine", 0.07, 1320); },
    flip: function () { note(380, 0, 0.06, "triangle", 0.05); },
    good: function () { run([523, 659, 784], 0.07, 0.16, "triangle", 0.08); },
    bad: function () { note(220, 0, 0.16, "sawtooth", 0.045); note(175, 0.11, 0.22, "sawtooth", 0.045); },
    boom: function () { noise(0, 0.45, 0.32, 600); note(120, 0, 0.4, "sine", 0.12, 45); },
    win: function () { run([523, 659, 784, 1046, 784, 1046, 1318], 0.1, 0.24, "triangle", 0.09); },
    lose: function () { run([392, 330, 262, 196], 0.14, 0.3, "triangle", 0.07); },
  };
  function paint() {
    if (!btn) return;
    btn.textContent = muted ? "🔇 Sound off" : "🔊 Sound on";
    btn.setAttribute("aria-pressed", String(!muted));
  }
  window.z210Sfx = {
    play: function (name) { if (!muted && SOUNDS[name]) { try { SOUNDS[name](); } catch (err) { /* no audio */ } } },
    get muted() { return muted; },
    init: function (game) {
      key = "zone210_" + game + "_muted";
      try { muted = localStorage.getItem(key) === "1"; } catch (err) { muted = false; }
      var head = document.querySelector(".g-head");
      if (!head) return;
      var bar = head.querySelector(".g-bar");
      if (!bar) { bar = document.createElement("div"); bar.className = "g-bar"; head.appendChild(bar); }
      btn = document.createElement("button");
      btn.type = "button";
      btn.className = "g-btn ghost";
      btn.addEventListener("click", function () {
        muted = !muted;
        try { localStorage.setItem(key, muted ? "1" : "0"); } catch (err) { /* private mode */ }
        paint();
        if (!muted) SOUNDS.tap();
      });
      bar.insertBefore(btn, bar.firstChild);
      paint();
    },
  };
})();
