// Draw & Animate: how one stroke is drawn. A stroke is a pen line, a filled shape, a sticker, a hand-drawn person,
// animal or thing, or a piece of text (the kinds are listed at the top of engine.js). strokeLive draws it at one
// moment of an animation: jointed parts swing about their pins and bend at their elbows.

import { drawPerson } from "./people.js";
import { stickerLife } from "./stickers.js";
import { jointAngle, bend } from "./engine.js";

export const EMOJI = '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
function trace(g, p, sharp) {
  g.beginPath(); g.moveTo(p[0], p[1]);
  if (sharp) { for (let i = 2; i < p.length; i += 2) g.lineTo(p[i], p[i + 1]); return; }
  for (let i = 2; i < p.length - 2; i += 2) g.quadraticCurveTo(p[i], p[i + 1], (p[i] + p[i + 2]) / 2, (p[i + 1] + p[i + 3]) / 2);
  g.lineTo(p[p.length - 2], p[p.length - 1]);
}
// ---------- text ----------
// Words on the page: { tx: the words (lines split by \n), f: which font, c: colour, w: letter size, p: [x, y] (the middle), tw: measured width }.
// The fonts are the two that come with the site and ones every phone and computer already has, so nothing is downloaded.
export const FONTS = [
  ["round", "Round", '700 SIZE "Fredoka", "Nunito", sans-serif'],
  ["plain", "Plain", '700 SIZE "Nunito", "Helvetica Neue", Arial, sans-serif'],
  ["book", "Storybook", 'SIZE Georgia, "Times New Roman", serif'],
  ["hand", "Handwriting", 'SIZE "Comic Sans MS", "Chalkboard SE", "Comic Neue", cursive'],
  ["script", "Curly", 'SIZE "Snell Roundhand", "Brush Script MT", "Segoe Script", "Lucida Handwriting", cursive'],
  ["poster", "Poster", 'SIZE Impact, "Arial Black", "Haettenschweiler", sans-serif'],
  ["marker", "Marker", 'SIZE "Marker Felt", "Segoe Print", "Chalkduster", fantasy'],
  ["type", "Typewriter", 'SIZE "Courier New", Courier, monospace'],
];
export const TEXT_SIZE = { 4: 26, 10: 42, 22: 66, 44: 100 }; // how tall the letters are at each size button
export const fontOf = (s) => (FONTS.find((f) => f[0] === s.f) || FONTS[0])[2].replace("SIZE", `${s.w}px`);
/** Measures a piece of text, so its box, the eraser and the Move tool know how wide it is. */
let meter = null; // a canvas of its own to measure with
export function fitText(s) { if (!meter) meter = document.createElement("canvas").getContext("2d"); meter.font = fontOf(s); s.tw = Math.round(Math.max(...s.tx.split("\n").map((l) => meter.measureText(l).width))); return s; }
export function strokeOn(g, s, live = null) {
  const p = s.p;
  if (s.tx) { // words
    const lines = s.tx.split("\n");
    g.save(); g.translate(p[0], p[1]); if (s.r) g.rotate(s.r);
    g.font = fontOf(s); g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = s.c;
    lines.forEach((l, i) => g.fillText(l, 0, (i - (lines.length - 1) / 2) * s.w * 1.2 + s.w * 0.04));
    g.restore(); return;
  }
  if (s.fig) { g.save(); g.translate(p[0], p[1]); if (s.m) g.scale(-1, 1); if (s.r) g.rotate(s.r); drawPerson(g, s, s.w, live); g.restore(); return; } // a hand-drawn person
  if (s.ch) { // a sticker
    g.save(); g.translate(p[0], p[1]); if (s.m) g.scale(-1, 1); if (s.r) g.rotate(s.r);
    const life = live && stickerLife(s.ch, live); // while playing, the sticker waddles, flaps, sways… by itself
    if (life) { const foot = life.base ? s.w * 0.5 : 0; g.translate(life.x * s.w, life.y * s.w + foot); g.rotate(life.r); g.scale(life.sx, life.sy); g.translate(0, -foot); }
    g.font = `${s.w}px ${EMOJI}`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = "#000"; g.fillText(s.ch, 0, s.w * 0.07);
    g.restore(); return;
  }
  g.globalCompositeOperation = s.e ? "destination-out" : "source-over";
  g.lineWidth = s.w; g.lineCap = "round"; g.lineJoin = "round";
  if (s.ff && p.length >= 6) { g.fillStyle = s.ff; trace(g, p, s.k); g.closePath(); g.fill(); } // coloured in (the Fill tool)
  g.strokeStyle = g.fillStyle = s.c;
  if (p.length === 2) { g.beginPath(); g.arc(p[0], p[1], s.w / 2, 0, Math.PI * 2); g.fill(); } else { trace(g, p, s.k); g.stroke(); }
  g.globalCompositeOperation = "source-over";
}
/** A stroke at one moment of an animation: one with a joint is first swung about its pin. */
export function strokeLive(g, s, live) {
  if (!live || !s.j || live.still) { strokeOn(g, s, live); return; }
  g.save(); g.translate(s.j[0], s.j[1]); g.rotate(jointAngle(s, live.t)); g.translate(-s.j[0], -s.j[1]);
  if (!s.jx || !s.jx.length) strokeOn(g, s, live);
  else { // elbows and knees: what lies beyond each one bends again
    const b = bend(s, live.t);
    for (const [x, y, a] of b.turns) { g.translate(x, y); g.rotate(a); g.translate(-x, -y); }
    strokeOn(g, b.turns.length ? s : { ...s, p: b.p }, live);
  }
  g.restore();
}
