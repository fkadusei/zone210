/**
 * Calm music for Calm Corner, composed as it plays (Web Audio): never the same twice, nothing to download.
 * Each piece is a little set of rules: which notes, how slowly, which instrument. All of it goes through a soft
 * reverb and a gentle limiter. playMusic(id, volume) / stopMusic() / setMusicVolume(v).
 */
export const PIECES = [
  { id: "bowls", mood: "Meditation", emoji: "🥣", name: "Singing Bowls", about: "Bowls struck now and then, ringing out over a soft hum." },
  { id: "om", mood: "Meditation", emoji: "🌌", name: "Deep Hum", about: "A low, warm drone that slowly breathes in and out." },
  { id: "piano", mood: "Relax", emoji: "🎹", name: "Morning Piano", about: "Slow, gentle piano over changing chords." },
  { id: "stars", mood: "Relax", emoji: "✨", name: "Starlight", about: "Soft high chimes floating over a warm pad." },
  { id: "clouds", mood: "Sleep", emoji: "☁️", name: "Floating Clouds", about: "Slow, warm chords that drift into each other." },
  { id: "lullaby", mood: "Sleep", emoji: "🎶", name: "Music Box Lullaby", about: "A quiet music-box tune, never quite the same." },
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

// ---------- the pieces: each step plays something and says how long until the next ----------
const CHORDS = [[48, [60, 64, 67, 71]], [45, [57, 60, 64, 67]], [41, [57, 60, 65, 69]], [43, [55, 59, 62, 67]]]; // Cmaj7, Am7, Fmaj7, G
const PENTA = [60, 62, 64, 67, 69, 72, 74, 76, 79, 81];
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
};

export function playMusic(id, volume, ctx) {
  stopMusic();
  if (!ctx || !STEP[id]) return;
  const out = ctx.createGain(), bus = ctx.createGain(), wet = ctx.createGain(), dry = ctx.createGain(), comp = ctx.createDynamicsCompressor();
  const verb = reverb(ctx);
  wet.gain.value = 0.55; dry.gain.value = 0.6;
  comp.threshold.value = -20; comp.ratio.value = 3;
  bus.connect(dry).connect(comp);
  bus.connect(verb).connect(wet).connect(comp);
  const makeup = ctx.createGain(); makeup.gain.value = 3.2; // the instruments are soft on purpose; this brings the whole mix up to a comfortable level
  comp.connect(makeup).connect(out).connect(ctx.destination);
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
