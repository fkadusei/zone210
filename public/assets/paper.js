/**
 * The sound of a page of paper being turned, made in the browser (no sound files). Used by the Playbook on the home
 * page (book.js) and by the flipbook in Draw & Animate.
 *
 * A real page turn is three things, and a plain hiss of noise has none of them:
 *   1. the lift    a thumb catches the edge: one or two tiny dry ticks
 *   2. the sweep   the sheet bends and travels through the air: a rustle that crackles, because paper creases in
 *                  little snaps, over a soft low breath of moving air
 *   3. the land    the page slaps down on the pile and settles: a dull pat, a low bump, and a second, softer pat
 * The crackle comes from the "paper" buffer below: noise whose loudness wanders, salted with hundreds of very short
 * snaps. Every turn starts at a different place in it and at a slightly different pitch, so no two sound the same.
 *
 *   pageTurn(ac, { dur, vol, out, also, at })
 *     dur   seconds from lift to landing (0.06 to 1.2). Under 0.25 the thumb and the bump are left out; under 0.15
 *           it is a quick riffle: one short dry flick.
 *     vol   loudness, 1 = normal
 *     out   where the sound goes (default: ac.destination);  also: a second place, such as a recorder
 *     at    when to start, on the audio clock (default: now)
 *   pageLift(ac, { vol, out, also })   just the thumb catching the edge, for a page picked up by hand
 */

const sheets = new WeakMap(); // one paper buffer for each audio context

function paper(ac) {
  let buf = sheets.get(ac);
  if (buf) return buf;
  const sr = ac.sampleRate, n = Math.floor(sr * 2);
  buf = ac.createBuffer(1, n, sr);
  const d = buf.getChannelData(0);
  // the rustle: noise that swells and fades as the sheet flexes
  let swell = 0.5, drift = 0;
  for (let i = 0; i < n; i += 1) {
    drift += (Math.random() - 0.5) * 0.004; drift *= 0.9995;
    swell = Math.min(1, Math.max(0.15, swell + drift * 0.02));
    d[i] = (Math.random() * 2 - 1) * 0.3 * swell;
  }
  // the crackle: short dry snaps, a few loud and many quiet, as creases give way
  for (let k = 0; k < 520; k += 1) {
    const at = Math.floor(Math.random() * (n - sr * 0.01)), len = Math.floor(sr * (0.0012 + Math.random() * 0.005)), amp = 0.25 + 0.75 * Math.random() ** 3;
    let last = 0;
    for (let i = 0; i < len; i += 1) { const w = Math.random() * 2 - 1, v = (w - last) * 0.7; last = w; d[at + i] += v * amp * Math.exp((-5 * i) / len); } // (w - last) keeps only the crisp top of the noise
  }
  let peak = 0; for (let i = 0; i < n; i += 1) peak = Math.max(peak, Math.abs(d[i]));
  for (let i = 0; i < n; i += 1) d[i] *= 0.9 / peak;
  sheets.set(ac, buf);
  return buf;
}

/** A stretch of the paper buffer, filtered and shaped. `env` is a list of [how far through (0 to 1), loudness]. */
function strip(ac, to, { t, len, rate = 1, hp = 0, lp = 0, band = null, q = 0.7, env }) {
  const src = ac.createBufferSource(); src.buffer = paper(ac); src.playbackRate.value = rate; src.loop = true;
  let node = src;
  const add = (type, freq, Q) => { const f = ac.createBiquadFilter(); f.type = type; f.Q.value = Q; f.frequency.value = freq; node.connect(f); node = f; return f; };
  if (hp) add("highpass", hp, 0.7);
  if (lp) add("lowpass", lp, 0.7);
  if (band) { const f = add("bandpass", band[0], q); f.frequency.setValueAtTime(band[0], t); for (let i = 1; i < band.length; i += 1) f.frequency.exponentialRampToValueAtTime(band[i], t + (len * i) / (band.length - 1)); }
  const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t);
  for (const [u, v] of env) g.gain.linearRampToValueAtTime(Math.max(0.0001, v), t + len * u);
  node.connect(g); g.connect(to);
  src.start(t, Math.random() * 1.6); src.stop(t + len + 0.03);
}

function bump(ac, to, t, vol, from, down, len) {
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = "sine"; o.frequency.setValueAtTime(from, t); o.frequency.exponentialRampToValueAtTime(down, t + len);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
  o.connect(g); g.connect(to); o.start(t); o.stop(t + len + 0.03);
}

function bus(ac, o) {
  const out = ac.createGain(); out.gain.value = o.vol ?? 1;
  out.connect(o.out || ac.destination); if (o.also) out.connect(o.also);
  return out;
}

/** A thumb catching the edge of the page: a couple of tiny dry ticks. */
function lift(ac, to, t, vol) {
  strip(ac, to, { t, len: 0.03, rate: 1.3, hp: 3200, env: [[0.1, 0.5 * vol], [1, 0]] });
  strip(ac, to, { t: t + 0.035 + Math.random() * 0.02, len: 0.022, rate: 1.5, hp: 4200, env: [[0.15, 0.3 * vol], [1, 0]] });
}

export function pageLift(ac, o = {}) {
  if (!ac) return;
  lift(ac, bus(ac, o), (o.at ?? ac.currentTime) + 0.005, 1);
}

export function pageTurn(ac, o = {}) {
  if (!ac) return;
  const dur = Math.min(1.2, Math.max(0.06, o.dur ?? 0.5)), quick = dur < 0.15;
  const t = (o.at ?? ac.currentTime) + 0.005, to = bus(ac, o), j = 0.88 + Math.random() * 0.24; // j: each turn a little higher or lower
  if (quick) { // a riffle: one short dry flick, brighter, with the lightest of pats
    strip(ac, to, { t, len: dur, rate: 1.15 * j, hp: 900, band: [3600 * j, 2200], q: 0.6, env: [[0.2, 0.5], [1, 0]] });
    strip(ac, to, { t: t + dur * 0.8, len: 0.04, lp: 2200, env: [[0.1, 0.28], [1, 0]] });
    return;
  }
  const brisk = dur < 0.25; // pages going by several a second: no thumb and no bump, or it turns into a drum roll
  if (!brisk) lift(ac, to, t, 0.7);
  // the sweep: the crackling sheet, rising in pitch as it comes over and falling as it drops
  strip(ac, to, { t: t + 0.02, len: dur * 0.9, rate: j, hp: 600, band: [1300 * j, 3200 * j, 1800], q: 0.55, env: [[0.12, 0.26], [0.42, 0.72], [0.7, 0.44], [1, 0]] });
  // the air it moves: a low, soft breath under the crackle
  strip(ac, to, { t: t + dur * 0.1, len: dur * 0.75, rate: 0.6, lp: 900, band: [300, 620, 280], q: 0.5, env: [[0.45, 0.85], [1, 0]] });
  // the landing: a dull pat and a low bump, then the page settling
  const land = t + dur * 0.9;
  strip(ac, to, { t: land, len: 0.075, rate: 0.9, lp: 1700, env: [[0.06, 0.8], [1, 0]] });
  if (!brisk) bump(ac, to, land, 0.26, 135 * j, 68, 0.1);
  strip(ac, to, { t: land + 0.05 + Math.random() * 0.02, len: 0.05, rate: 1, lp: 2400, hp: 500, env: [[0.1, 0.16], [1, 0]] });
}
