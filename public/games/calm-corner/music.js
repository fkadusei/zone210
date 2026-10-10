/**
 * Calm music for Calm Corner, composed as it plays (Web Audio): never the same twice, nothing to download.
 * Each piece is a little set of rules: which notes, how slowly, which instrument. All of it goes through a soft
 * reverb and a gentle limiter. playMusic(id, volume) / stopMusic() / setMusicVolume(v).
 */
export const PIECES = [
  { id: "bowls", mood: "Meditation", emoji: "🥣", name: "Singing Bowls", about: "Bowls struck now and then, ringing out over a soft hum." },
  { id: "om", mood: "Meditation", emoji: "🌌", name: "Deep Hum", about: "A low, warm drone that slowly breathes in and out." },
  { id: "temple", mood: "Meditation", emoji: "🔔", name: "Temple Bells", about: "Deep bells, far apart, with long quiet between them." },
  { id: "handpan", mood: "Meditation", emoji: "🪘", name: "Handpan Garden", about: "A soft, rolling handpan pattern that slowly changes." },
  { id: "flute", mood: "Meditation", emoji: "🎋", name: "Bamboo Flute", about: "Slow, breathy flute phrases with room to breathe." },
  { id: "crystal", mood: "Meditation", emoji: "💎", name: "Crystal Bowls", about: "High, pure bowls that overlap and shimmer." },
  { id: "water", mood: "Meditation", emoji: "💧", name: "Still Water", about: "A few soft notes, like drops falling into a pond." },
  { id: "mountain", mood: "Meditation", emoji: "🏔️", name: "Mountain Air", about: "Wide, open voices holding long, steady notes." },
  { id: "piano", mood: "Relax", emoji: "🎹", name: "Morning Piano", about: "Slow, gentle piano over changing chords." },
  { id: "stars", mood: "Relax", emoji: "✨", name: "Starlight", about: "Soft high chimes floating over a warm pad." },
  { id: "harp", mood: "Relax", emoji: "🎼", name: "Gentle Harp", about: "Harp notes rising and falling through soft chords." },
  { id: "guitar", mood: "Relax", emoji: "🎸", name: "Evening Guitar", about: "Quiet finger-picked guitar, steady and warm." },
  { id: "rain", mood: "Relax", emoji: "🌧️", name: "Rainy Window", about: "Thoughtful, unhurried piano for a grey afternoon." },
  { id: "kalimba", mood: "Relax", emoji: "🌞", name: "Kalimba Sun", about: "A bright little thumb-piano tune that keeps coming back." },
  { id: "strings", mood: "Relax", emoji: "🎻", name: "Warm Strings", about: "Slow string chords with a low, singing melody." },
  { id: "glass", mood: "Relax", emoji: "🫧", name: "Glass Garden", about: "Soft notes circling at their own pace, never lining up twice." },
  { id: "clouds", mood: "Sleep", emoji: "☁️", name: "Floating Clouds", about: "Slow, warm chords that drift into each other." },
  { id: "lullaby", mood: "Sleep", emoji: "🎶", name: "Music Box Lullaby", about: "A quiet music-box tune, never quite the same." },
  { id: "moon", mood: "Sleep", emoji: "🌙", name: "Moonlight Piano", about: "Very slow, soft piano with long pauses." },
  { id: "drift", mood: "Sleep", emoji: "💤", name: "Dream Drift", about: "Only soft, slow chords, with nothing to wake you." },
  { id: "nightharp", mood: "Sleep", emoji: "🌃", name: "Night Harp", about: "One harp note at a time, slow as breathing." },
  { id: "ocean", mood: "Sleep", emoji: "🌊", name: "Ocean Lullaby", about: "Soft chords rising and falling with a gentle sea." },
  { id: "sleepystrings", mood: "Sleep", emoji: "🧸", name: "Sleepy Strings", about: "A slow, rocking lullaby on soft strings." },
  { id: "choir", mood: "Sleep", emoji: "🕊️", name: "Far Away Choir", about: "Soft voices humming long chords in the distance." },
];

const hz = (midi) => 440 * Math.pow(2, (midi - 69) / 12);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
let M = null; // the piece playing: { id, ctx, out, timer, nextAt, state }

function reverb(ctx, seconds = 4.5) {
  const len = Math.floor(ctx.sampleRate * seconds), buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch += 1) { const d = buf.getChannelData(ch); for (let i = 0; i < len; i += 1) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.8); }
  const c = ctx.createConvolver(); c.buffer = buf; return c;
}

// ---------- instruments ----------
function piano(f, t, vel = 0.25, len = 3.2) {
  const { ctx, bus } = M;
  const g = ctx.createGain(), lp = ctx.createBiquadFilter();
  lp.type = "lowpass"; lp.frequency.value = 2600;
  [[1, 1], [2, 0.32], [3, 0.12], [4.01, 0.05]].forEach(([mult, amp]) => { const o = ctx.createOscillator(); o.type = "sine"; o.frequency.value = f * mult; const og = ctx.createGain(); og.gain.value = amp; o.connect(og).connect(g); o.start(t); o.stop(t + len + 0.2); });
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vel, t + 0.012); g.gain.exponentialRampToValueAtTime(vel * 0.35, t + 0.5); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
  g.connect(lp).connect(bus);
}
function bowl(f, t, vel = 0.22, len = 11) {
  const { ctx, bus } = M;
  // a singing bowl's partials are not whole-number multiples; two slightly apart give its slow wobble
  [[1, 1], [2.76, 0.42], [5.4, 0.18], [8.9, 0.07]].forEach(([mult, amp], i) => {
    for (const det of [-0.35, 0.35]) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "sine"; o.frequency.value = f * mult + det * (i + 1);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vel * amp * 0.5, t + 0.04); g.gain.exponentialRampToValueAtTime(0.0001, t + len / (1 + i * 0.6));
      o.connect(g).connect(bus); o.start(t); o.stop(t + len + 0.2);
    }
  });
}
function bell(f, t, vel = 0.1, len = 2.6) {
  const { ctx, bus } = M;
  [[1, 1], [3, 0.25], [4.2, 0.08]].forEach(([mult, amp]) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = "sine"; o.frequency.value = f * mult; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vel * amp, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + len / mult); o.connect(g).connect(bus); o.start(t); o.stop(t + len + 0.1); });
}
function pad(notes, t, dur, vel = 0.05, bright = 900) {
  const { ctx, bus } = M;
  const g = ctx.createGain(), lp = ctx.createBiquadFilter();
  lp.type = "lowpass"; lp.frequency.value = bright; lp.Q.value = 0.3;
  const atk = Math.min(3.5, dur * 0.4);
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vel, t + atk); g.gain.setValueAtTime(vel, t + dur - atk); g.gain.linearRampToValueAtTime(0.0001, t + dur + atk);
  notes.forEach((m) => { for (const det of [-6, 6]) { const o = ctx.createOscillator(); o.type = "sawtooth"; o.frequency.value = hz(m); o.detune.value = det; o.connect(lp); o.start(t); o.stop(t + dur + atk + 0.2); } });
  lp.connect(g).connect(bus);
}
function drone(root, t, dur, vel = 0.12) {
  // a warm hum that swells and softens like a slow breath (about 10 seconds). Its notes start around 110 Hz and
  // reach up to about 900 Hz, so phone and laptop speakers (which can't play deep bass) still sound it.
  const { ctx, bus } = M;
  const g = ctx.createGain(), lp = ctx.createBiquadFilter(), breath = ctx.createGain();
  lp.type = "lowpass"; lp.frequency.value = 1100; lp.Q.value = 0.7;
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vel, t + 4); g.gain.setValueAtTime(vel, t + dur - 4); g.gain.linearRampToValueAtTime(0.0001, t + dur + 2);
  // breathing: the filter opens and the level rises, then both ease back
  const lfo = ctx.createOscillator(), lfoF = ctx.createGain(), lfoA = ctx.createGain();
  lfo.frequency.value = 0.1; lfoF.gain.value = 450; lfoA.gain.value = 0.35;
  breath.gain.value = 0.65;
  lfo.connect(lfoF).connect(lp.frequency); lfo.connect(lfoA).connect(breath.gain);
  lfo.start(t); lfo.stop(t + dur + 2.2);
  // strong overtones: a small speaker plays these, and the ear still hears the deep note underneath ("missing fundamental")
  [[root, 0.55, "triangle"], [root * 2, 0.85, "sine"], [root * 3, 0.75, "sine"], [root * 4, 0.55, "sine"], [root * 5, 0.32, "sine"], [root * 6, 0.22, "sine"], [root * 1.5, 0.3, "sine"]].forEach(([f, amp, type]) => { for (const det of [-2, 2]) { const o = ctx.createOscillator(), og = ctx.createGain(); o.type = type; o.frequency.value = f; o.detune.value = det; og.gain.value = amp * 0.5; o.connect(og).connect(lp); o.start(t); o.stop(t + dur + 2.2); } });
  lp.connect(breath).connect(g).connect(bus);
}

// anything struck or plucked that rings as a few pure tones: parts are [how many times the note's pitch, how loud, how long]
function struck(f, t, vel, parts, atk = 0.006) {
  const { ctx, bus } = M;
  parts.forEach(([mult, amp, len]) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = "sine"; o.frequency.value = f * mult; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vel * amp, t + atk); g.gain.exponentialRampToValueAtTime(0.0001, t + len); o.connect(g).connect(bus); o.start(t); o.stop(t + len + 0.1); });
}
const kalimba = (f, t, vel = 0.14) => struck(f, t, vel, [[1, 1, 2.2], [2, 0.18, 1], [5.4, 0.25, 0.14]]);
const marimba = (f, t, vel = 0.14) => struck(f, t, vel, [[1, 1, 1.8], [4, 0.28, 0.3], [10, 0.06, 0.06]], 0.004);
const handpan = (f, t, vel = 0.14) => struck(f, t, vel, [[1, 1, 3.4], [1.004, 0.6, 3.4], [2, 0.5, 2.4], [3, 0.26, 1.6]]);
const glass = (f, t, vel = 0.1) => struck(f, t, vel, [[1, 1, 5], [2, 0.3, 3], [3.01, 0.12, 2]], 0.03);
// plucked strings: the harp is clear and round; the guitar starts brighter and mellows as it rings
function plucked(f, t, vel, len, type, open, closed) {
  const { ctx, bus } = M;
  const g = ctx.createGain(), lp = ctx.createBiquadFilter();
  lp.type = "lowpass"; lp.Q.value = 0.5; lp.frequency.setValueAtTime(open, t); lp.frequency.exponentialRampToValueAtTime(closed, t + 0.7);
  [[type, 1, 1], ["sine", 2, 0.3], ["sine", 3, 0.1]].forEach(([ty, mult, amp]) => { const o = ctx.createOscillator(), og = ctx.createGain(); o.type = ty; o.frequency.value = f * mult; og.gain.value = amp; o.connect(og).connect(g); o.start(t); o.stop(t + len + 0.2); });
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vel, t + 0.005); g.gain.exponentialRampToValueAtTime(vel * 0.3, t + 0.45); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
  g.connect(lp).connect(bus);
}
const harp = (f, t, vel = 0.14, len = 3.2) => plucked(f, t, vel, len, "triangle", 3400, 1800);
const guitar = (f, t, vel = 0.1, len = 2.8) => plucked(f, t, vel * 0.7, len, "sawtooth", 2600, 600);
function noise() {
  const { ctx } = M;
  if (!M.noise) { M.noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate); const d = M.noise.getChannelData(0); for (let i = 0; i < d.length; i += 1) d[i] = Math.random() * 2 - 1; }
  const src = ctx.createBufferSource(); src.buffer = M.noise; src.loop = true; return src;
}
// a held note with a slow start, a soft end and a little wobble that arrives late, like a player's breath or bow
function held(f, t, dur, vel, build) {
  const { ctx, bus } = M;
  const g = ctx.createGain(), end = t + Math.max(0.8, dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vel, t + 0.35); g.gain.setValueAtTime(vel, end - 0.1); g.gain.linearRampToValueAtTime(0.0001, end + 0.7);
  const vib = ctx.createOscillator(), vg = ctx.createGain();
  vib.frequency.value = 4.8; vg.gain.setValueAtTime(0, t); vg.gain.linearRampToValueAtTime(f * 0.005, t + 1.2);
  vib.connect(vg); vib.start(t); vib.stop(end + 0.9);
  build(g, vg, end + 0.9);
  g.connect(bus);
}
function flute(f, t, dur, vel = 0.09) {
  const { ctx } = M;
  held(f, t, dur, vel, (g, vg, stop) => {
    [[1, 1], [2, 0.22], [3, 0.06]].forEach(([mult, amp]) => { const o = ctx.createOscillator(), og = ctx.createGain(); o.type = "sine"; o.frequency.value = f * mult; og.gain.value = amp; vg.connect(o.frequency); o.connect(og).connect(g); o.start(t); o.stop(stop); });
    const n = noise(), bp = ctx.createBiquadFilter(), ng = ctx.createGain(); // the breath
    bp.type = "bandpass"; bp.frequency.value = f * 2; bp.Q.value = 1.5; ng.gain.value = 0.1;
    n.connect(bp).connect(ng).connect(g); n.start(t); n.stop(stop);
  });
}
function cello(f, t, dur, vel = 0.05) {
  const { ctx } = M;
  held(f, t, dur, vel, (g, vg, stop) => {
    const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 1200; lp.Q.value = 0.4;
    for (const det of [-5, 5]) { const o = ctx.createOscillator(); o.type = "sawtooth"; o.frequency.value = f; o.detune.value = det; vg.connect(o.frequency); o.connect(lp); o.start(t); o.stop(stop); }
    lp.connect(g);
  });
}
// voices humming "ooh": the two band filters are what make it sound sung
function choir(notes, t, dur, vel = 0.05) {
  const { ctx, bus } = M;
  const g = ctx.createGain(), mix = ctx.createGain(), atk = Math.min(4, dur * 0.4);
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vel, t + atk); g.gain.setValueAtTime(vel, t + dur - atk); g.gain.linearRampToValueAtTime(0.0001, t + dur + atk);
  notes.forEach((m) => { for (const det of [-9, 9]) { const o = ctx.createOscillator(); o.type = "sawtooth"; o.frequency.value = hz(m); o.detune.value = det; o.connect(mix); o.start(t); o.stop(t + dur + atk + 0.2); } });
  [[430, 2.2, 1], [880, 3, 0.55], [2600, 4, 0.08]].forEach(([fr, q, amp]) => { const bp = ctx.createBiquadFilter(), bg = ctx.createGain(); bp.type = "bandpass"; bp.frequency.value = fr; bp.Q.value = q; bg.gain.value = amp; mix.connect(bp).connect(bg).connect(g); });
  g.connect(bus);
}
// a soft wave washing in and out
function wash(t, dur, vel = 0.03) {
  const { ctx, bus } = M;
  const n = noise(), lp = ctx.createBiquadFilter(), g = ctx.createGain();
  lp.type = "lowpass"; lp.frequency.setValueAtTime(350, t); lp.frequency.linearRampToValueAtTime(900, t + dur * 0.45); lp.frequency.linearRampToValueAtTime(350, t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vel, t + dur * 0.45); g.gain.linearRampToValueAtTime(0.0001, t + dur);
  n.connect(lp).connect(g).connect(bus); n.start(t); n.stop(t + dur + 0.1);
}

// ---------- the pieces: each step plays something and says how long until the next ----------
const CHORDS = [[48, [60, 64, 67, 71]], [45, [57, 60, 64, 67]], [41, [57, 60, 65, 69]], [43, [55, 59, 62, 67]]]; // Cmaj7, Am7, Fmaj7, G
const PENTA = [60, 62, 64, 67, 69, 72, 74, 76, 79, 81];
const CH_D = [[50, [57, 62, 66, 69]], [47, [59, 62, 66, 69]], [43, [55, 59, 62, 66]], [45, [57, 61, 64, 69]]]; // D, Bm, Gmaj7, A
const CH_F = [[41, [57, 60, 65]], [38, [57, 62, 65]], [46, [58, 62, 65]], [48, [55, 60, 64]]]; // F, Dm, B flat, C
const CH_RAIN = [[45, [57, 60, 64, 71]], [41, [57, 60, 64, 69]], [38, [57, 60, 65, 69]], [43, [55, 59, 62, 69]]]; // Am add9, Fmaj7, Dm7, G add9
const CH_DREAM = [[48, [55, 60, 64, 71]], [50, [57, 62, 66, 69]], [45, [57, 60, 64, 67]], [43, [55, 59, 62, 66]]]; // Cmaj7, D, Am7, Gmaj7 (a floating, lifted sound)
const step = (i, by, len) => Math.max(0, Math.min(len - 1, i + by)); // move along a scale without falling off either end
const STEP = {
  bowls(t, s) {
    if (!s.hum || t >= s.hum) { drone(130.8, t, 40, 0.035); s.hum = t + 36; }
    bowl(hz(pick([57, 60, 62, 64, 67])), t, 0.25 + Math.random() * 0.06);
    return 7 + Math.random() * 6;
  },
  om(t, s) {
    drone(110, t, 30, 0.1);
    if (Math.random() < 0.5) bowl(hz(pick([57, 64])), t + 6, 0.08, 14);
    return 26;
  },
  piano(t, s) {
    s.n = (s.n || 0) + 1;
    const ci = Math.floor((s.n - 1) / 8) % CHORDS.length, [bass, chord] = CHORDS[ci];
    if ((s.n - 1) % 8 === 0) { piano(hz(bass), t, 0.18, 5); pad(chord.map((m) => m - 12), t, 9, 0.018, 700); }
    const notes = [...chord, chord[0] + 12, chord[1] + 12];
    piano(hz(pick(notes)), t, 0.12 + Math.random() * 0.06);
    if (Math.random() < 0.25) piano(hz(pick(notes) + 12), t + 0.35, 0.06);
    return pick([1.1, 1.1, 1.6, 2.2]);
  },
  stars(t, s) {
    s.n = (s.n || 0) + 1;
    if ((s.n - 1) % 6 === 0) pad(CHORDS[Math.floor((s.n - 1) / 6) % 4][1].map((m) => m - 12), t, 12, 0.03, 650);
    bell(hz(pick(PENTA) + 12), t, 0.06 + Math.random() * 0.04, 3.5);
    return 1.4 + Math.random() * 1.6;
  },
  clouds(t, s) {
    s.n = (s.n || 0) + 1;
    const [bass, chord] = CHORDS[(s.n - 1) % CHORDS.length];
    pad([bass + 12, ...chord], t, 11, 0.04, 800);
    if (Math.random() < 0.6) bell(hz(pick(chord) + 12), t + 4 + Math.random() * 3, 0.035, 4);
    return 9;
  },
  lullaby(t, s) {
    // a gentle wander up and down the scale, in phrases of eight, with a soft pad underneath
    s.i = s.i === undefined ? 4 : s.i;
    s.n = (s.n || 0) + 1;
    if ((s.n - 1) % 8 === 0) pad(CHORDS[Math.floor((s.n - 1) / 8) % 4][1].map((m) => m - 12), t, 7.6, 0.022, 600);
    s.i = Math.max(0, Math.min(PENTA.length - 1, s.i + pick([-2, -1, -1, 1, 1, 2, 0])));
    bell(hz(PENTA[s.i] + 12), t, 0.14, 2.4);
    return (s.n % 8 === 0) ? 1.9 : pick([0.95, 0.95, 0.95, 1.9]);
  },

  // ----- meditation -----
  temple(t, s) {
    if (!s.hum || t >= s.hum) { drone(98, t, 44, 0.042); s.hum = t + 40; }
    const m = pick([50, 55, 57, 62]);
    bowl(hz(m), t, 0.28, 14); bell(hz(m + 12), t, 0.07, 6);
    if (Math.random() < 0.3) bell(hz(m + 19), t + 2.5, 0.035, 5);
    return 9 + Math.random() * 7;
  },
  handpan(t, s) {
    // an eight-note pattern in D minor that repeats, and is swapped for a new one every so often
    const SC = [50, 57, 58, 60, 62, 64, 65, 69];
    s.n = (s.n || 0) + 1;
    if (!s.pat || (s.n - 1) % 32 === 0) s.pat = Array.from({ length: 8 }, (_, i) => (i === 0 ? 0 : pick([1, 2, 3, 4, 5, 6, 7, -1, -1])));
    const k = s.pat[(s.n - 1) % 8];
    if (k >= 0) handpan(hz(SC[k]), t, k === 0 ? 0.2 : 0.1 + Math.random() * 0.04);
    if ((s.n - 1) % 16 === 0) pad([50, 57, 62], t, 13, 0.014, 600);
    return 0.78;
  },
  flute(t, s) {
    // a short phrase of two to four long notes, then silence before the next one
    const SC = [62, 63, 67, 69, 72, 74, 75, 79];
    if (!s.hum || t >= s.hum) { drone(146.8, t, 40, 0.03); s.hum = t + 36; }
    s.i = s.i === undefined ? 3 : s.i;
    const count = pick([2, 3, 3, 4]);
    let at = t;
    for (let k = 0; k < count; k += 1) { s.i = step(s.i, pick([-2, -1, -1, 1, 1, 2]), SC.length); const d = pick([1.6, 2.2, 3]); flute(hz(SC[s.i]), at, k === count - 1 ? d + 1.5 : d, 0.085); at += d; }
    return at - t + 3.5 + Math.random() * 4;
  },
  crystal(t, s) {
    const m = pick([69, 72, 76, 79, 81]);
    bowl(hz(m), t, 0.2, 12);
    if (Math.random() < 0.4) bowl(hz(m - 5), t + 1.5 + Math.random() * 2, 0.12, 12);
    if (!s.pad || t >= s.pad) { pad([57, 64, 69], t, 22, 0.018, 700); s.pad = t + 20; }
    return 5 + Math.random() * 5;
  },
  water(t, s) {
    if (!s.pad || t >= s.pad) { pad([48, 55, 60, 64], t, 22, 0.025, 600); s.pad = t + 20; }
    const n = pick([1, 1, 2, 3]);
    for (let k = 0; k < n; k += 1) kalimba(hz(pick(PENTA) + 12), t + k * (0.35 + Math.random() * 0.3), 0.2 - k * 0.045);
    return 3 + Math.random() * 4.5;
  },
  mountain(t, s) {
    s.n = (s.n || 0) + 1;
    choir([[50, 57, 62, 69], [48, 55, 60, 67], [53, 60, 65, 69], [55, 62, 67, 71]][(s.n - 1) % 4], t, 14, 0.08);
    if (Math.random() < 0.35) bowl(hz(pick([62, 69])), t + 5, 0.06, 12);
    return 11;
  },

  // ----- relax -----
  harp(t, s) {
    s.n = (s.n || 0) + 1;
    const k = (s.n - 1) % 8, [bass, c] = CHORDS[Math.floor((s.n - 1) / 8) % 4];
    if (k === 0) pad(c.map((m) => m - 12), t, 5.6, 0.012, 700);
    harp(hz([bass + 12, c[0], c[1], c[2], c[3], c[0] + 12, c[3], c[1]][k]), t, k === 0 ? 0.15 : 0.1 + Math.random() * 0.03);
    return k === 7 ? 1.2 : 0.6;
  },
  guitar(t, s) {
    s.n = (s.n || 0) + 1;
    const k = (s.n - 1) % 8, [bass, c] = CH_D[Math.floor((s.n - 1) / 8) % 4];
    guitar(hz([bass + 12, c[1], c[2], c[3], c[1], c[2], c[3], c[2]][k]), t, k === 0 ? 0.26 : 0.17 + Math.random() * 0.04);
    if (k === 0) guitar(hz(bass + 12), t, 0.16, 4);
    return 0.56;
  },
  rain(t, s) {
    s.n = (s.n || 0) + 1;
    const [bass, c] = CH_RAIN[Math.floor((s.n - 1) / 6) % 4];
    if ((s.n - 1) % 6 === 0) { piano(hz(bass + 12), t, 0.18, 6); pad(c.map((m) => m - 12), t, 11, 0.018, 600); }
    const m = pick(c);
    piano(hz(m + 12), t, 0.12 + Math.random() * 0.05, 4);
    if (Math.random() < 0.3) piano(hz(pick(c)), t + 0.02, 0.08, 4);
    return pick([1.5, 1.5, 2.2, 3]);
  },
  kalimba(t, s) {
    // a six-note tune that repeats four times, then a new one
    const SC = [67, 69, 71, 74, 76, 79, 81, 83];
    s.n = (s.n || 0) + 1;
    if (!s.tune || (s.n - 1) % 24 === 0) s.tune = Array.from({ length: 6 }, () => pick([0, 1, 2, 3, 4, 5, 6, 7, -1]));
    const k = s.tune[(s.n - 1) % 6];
    if (k >= 0) kalimba(hz(SC[k]), t, 0.12 + Math.random() * 0.03);
    if ((s.n - 1) % 12 === 0) pad([55, 62, 67, 71], t, 7.5, 0.014, 650);
    return (s.n % 6 === 0) ? 1.3 : 0.52;
  },
  strings(t, s) {
    s.n = (s.n || 0) + 1;
    const [bass, c] = CH_D[(s.n - 1) % 4];
    pad([bass + 12, ...c], t, 9, 0.028, 1300);
    cello(hz(pick(c) - 12), t + 1, 5.5, 0.055);
    return 8;
  },
  glass(t, s) {
    // six notes, each coming round at its own pace, so the pattern never repeats exactly
    if (!s.loops) s.loops = [67, 72, 76, 79, 83, 84].map((m, i) => ({ m, at: t + i * 1.9, per: 6.5 + i * 2.3 + Math.random() }));
    if (!s.pad || t >= s.pad) { pad([48, 55, 60, 64], t, 22, 0.014, 650); s.pad = t + 20; }
    s.loops.forEach((l) => { if (l.at <= t + 0.01) { glass(hz(l.m), t, 0.1); marimba(hz(l.m), t, 0.05); l.at += l.per; } });
    return Math.max(0.05, Math.min(...s.loops.map((l) => l.at)) - t);
  },

  // ----- sleep -----
  moon(t, s) {
    s.n = (s.n || 0) + 1;
    const [bass, c] = CH_F[Math.floor((s.n - 1) / 4) % 4];
    if ((s.n - 1) % 4 === 0) { piano(hz(bass + 12), t, 0.19, 8); pad(c.map((m) => m - 12), t, 13, 0.022, 550); }
    else piano(hz(pick(c) + pick([0, 0, 12])), t, 0.12 + Math.random() * 0.03, 6);
    return pick([2.8, 3.4, 4.2]);
  },
  drift(t, s) {
    s.n = (s.n || 0) + 1;
    const [bass, c] = CH_DREAM[(s.n - 1) % 4];
    pad([bass + 12, ...c], t, 15, 0.036, 700);
    return 12;
  },
  nightharp(t, s) {
    s.n = (s.n || 0) + 1;
    const k = (s.n - 1) % 6, [bass, c] = CH_F[Math.floor((s.n - 1) / 6) % 4];
    if (k === 0) pad(c.map((m) => m - 12), t, 10, 0.024, 550);
    harp(hz([bass + 12, c[0], c[1], c[2], c[1] + 12, c[2]][k]), t, 0.145, 5);
    return k === 5 ? 3 : 1.5;
  },
  ocean(t, s) {
    s.n = (s.n || 0) + 1;
    const [bass, c] = CH_F[(s.n - 1) % 4];
    wash(t, 9, 0.042);
    pad([bass + 12, ...c], t, 7, 0.041, 750);
    if (Math.random() < 0.4) bell(hz(pick(c) + 12), t + 3 + Math.random() * 2, 0.03, 4);
    return 9.5;
  },
  sleepystrings(t, s) {
    // a rocking tune, three beats to the bar: two short notes and a long one
    const SC = [65, 67, 69, 72, 74, 77];
    s.n = (s.n || 0) + 1;
    s.i = s.i === undefined ? 2 : s.i;
    const k = (s.n - 1) % 3;
    if ((s.n - 1) % 6 === 0) pad([CH_F[Math.floor((s.n - 1) / 6) % 4][0] + 12, ...CH_F[Math.floor((s.n - 1) / 6) % 4][1]], t, 8.5, 0.022, 800);
    s.i = step(s.i, pick([-1, -1, 1, 1, -2, 2]), SC.length);
    const d = k === 2 ? 2.6 : 1.3;
    cello(hz(SC[s.i]), t, d - 0.5, 0.05);
    return d;
  },
  choir(t, s) {
    s.n = (s.n || 0) + 1;
    const [bass, c] = CH_F[(s.n - 1) % 4];
    choir([bass + 12, ...c], t, 12, 0.06);
    if (Math.random() < 0.3) bell(hz(pick(c) + 12), t + 5, 0.022, 5);
    return 10;
  },
};

// everything a piece plays goes into "bus", then through a soft reverb and a gentle limiter to "out"
function chain(ctx) {
  const out = ctx.createGain(), bus = ctx.createGain(), wet = ctx.createGain(), dry = ctx.createGain(), comp = ctx.createDynamicsCompressor();
  const verb = reverb(ctx);
  wet.gain.value = 0.55; dry.gain.value = 0.6;
  comp.threshold.value = -20; comp.ratio.value = 3;
  bus.connect(dry).connect(comp);
  bus.connect(verb).connect(wet).connect(comp);
  const makeup = ctx.createGain(); makeup.gain.value = 3.2; // the instruments are soft on purpose; this brings the whole mix up to a comfortable level
  comp.connect(makeup).connect(out).connect(ctx.destination);
  return { out, bus };
}
export function playMusic(id, volume, ctx) {
  stopMusic();
  if (!ctx || !STEP[id]) return;
  const { out, bus } = chain(ctx);
  out.gain.setValueAtTime(0.0001, ctx.currentTime);
  out.gain.linearRampToValueAtTime(volume, ctx.currentTime + 3); // fade in
  M = { id, ctx, out, bus, state: {}, nextAt: ctx.currentTime + 0.3 };
  const me = M;
  // schedule a little ahead so the timing stays smooth even if the page is busy
  me.timer = setInterval(() => {
    if (M !== me) return;
    while (me.nextAt < ctx.currentTime + 1.5) me.nextAt += STEP[id](me.nextAt, me.state);
  }, 250);
}
/** For checking loudness (tools/check-music.html): writes the first `seconds` of a piece into an OfflineAudioContext. */
export function renderMusic(id, volume, ctx, seconds) {
  const was = M, { out, bus } = chain(ctx), state = {};
  out.gain.value = volume;
  M = { id, ctx, out, bus, state };
  for (let t = 0.3; t < seconds;) t += STEP[id](t, state);
  M = was;
}
export function stopMusic(fade = 2.5) {
  if (!M) return;
  const { ctx, out, timer } = M;
  clearInterval(timer);
  const t = ctx.currentTime;
  out.gain.cancelScheduledValues(t);
  out.gain.setValueAtTime(out.gain.value, t);
  out.gain.linearRampToValueAtTime(0.0001, t + fade);
  setTimeout(() => { try { out.disconnect(); } catch (err) { /* already gone */ } }, fade * 1000 + 200);
  M = null;
}
export const setMusicVolume = (v) => { if (M) { const t = M.ctx.currentTime; M.out.gain.cancelScheduledValues(t); M.out.gain.setValueAtTime(v, t); } };
export const playingMusic = () => (M ? M.id : null);
