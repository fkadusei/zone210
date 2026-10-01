/** Procedural planet textures drawn on a canvas, so the page needs no image downloads. */
const W = 512;
const H = 256;

function hash(x, y, s) {
  let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0;
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
const smooth = (t) => t * t * (3 - 2 * t);
function vnoise(x, y, s) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = smooth(x - xi), yf = smooth(y - yi);
  const a = hash(xi, yi, s), b = hash(xi + 1, yi, s), c = hash(xi, yi + 1, s), d = hash(xi + 1, yi + 1, s);
  return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf;
}
function fbm(x, y, s, oct = 4) {
  let v = 0, amp = 0.5, f = 1;
  for (let i = 0; i < oct; i += 1) { v += amp * vnoise(x * f, y * f, s + i * 17); amp *= 0.5; f *= 2; }
  return v;
}
// noise that wraps around the sphere horizontally so there is no seam
function wrapNoise(u, v, scale, s, oct = 4) {
  const a = u * Math.PI * 2;
  const r = scale;
  return fbm(Math.cos(a) * r + 50, Math.sin(a) * r + v * scale * 1.2, s, oct);
}
const mix = (a, b, t) => a.map((x, i) => x + (b[i] - x) * t);
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

function paint(fn) {
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const ctx = c.getContext("2d");
  const img = ctx.createImageData(W, H);
  for (let y = 0; y < H; y += 1) for (let x = 0; x < W; x += 1) {
    const [r, g, b] = fn(x / W, y / H);
    const i = (y * W + x) * 4;
    img.data[i] = r; img.data[i + 1] = g; img.data[i + 2] = b; img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return c;
}
function craters(c, count, seed) {
  const ctx = c.getContext("2d");
  let s = seed;
  const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  for (let i = 0; i < count; i += 1) {
    const x = rnd() * W, y = rnd() * H, r = 2 + rnd() * rnd() * 14;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0,0,0,0.16)"; ctx.fill();
    ctx.lineWidth = 1.2; ctx.strokeStyle = "rgba(255,255,255,0.18)"; ctx.stroke();
  }
}
const banded = (palette, warp, seed, bands) => (u, v) => {
  const w = wrapNoise(u, v, 3, seed, 4);
  const t = Math.sin((v + (w - 0.5) * warp) * Math.PI * bands) * 0.5 + 0.5;
  const n = wrapNoise(u, v, 12, seed + 5, 3);
  const k = Math.min(1, Math.max(0, t * 0.8 + (n - 0.5) * 0.5));
  const i = k * (palette.length - 1);
  const lo = Math.floor(i);
  return mix(palette[lo], palette[Math.min(palette.length - 1, lo + 1)], i - lo);
};

const MAKERS = {
  sun: () => paint((u, v) => { const n = wrapNoise(u, v, 18, 3, 4); const m = wrapNoise(u, v, 5, 9, 3); return mix(hex("#ff8a00"), hex("#fff07a"), Math.min(1, n * 1.2 + m * 0.3)); }),
  mercury: () => { const c = paint((u, v) => { const n = wrapNoise(u, v, 9, 2, 5); return mix(hex("#6e6862"), hex("#b5aea6"), n); }); craters(c, 90, 11); return c; },
  venus: () => paint((u, v) => { const n = wrapNoise(u, v, 4, 5, 5); const s = Math.sin((v * 9 + n * 4) * Math.PI) * 0.5 + 0.5; return mix(hex("#c79a52"), hex("#f1dca0"), s * 0.6 + n * 0.4); }),
  earth: () => paint((u, v) => { const n = wrapNoise(u, v, 4, 21, 5); const land = n > 0.52; const polar = v < 0.07 || v > 0.93; if (polar) return hex("#f2f6fa"); return land ? mix(hex("#3f8f4a"), hex("#a98f55"), wrapNoise(u, v, 9, 4, 3)) : mix(hex("#12408c"), hex("#2a6fcf"), wrapNoise(u, v, 6, 8, 3)); }),
  mars: () => { const c = paint((u, v) => { const n = wrapNoise(u, v, 6, 7, 5); const polar = v < 0.05 || v > 0.95; if (polar) return hex("#f4eee8"); return mix(hex("#7a3418"), hex("#d58b55"), n); }); craters(c, 40, 5); return c; },
  jupiter: () => { const c = paint(banded([hex("#8c5e3c"), hex("#d9b995"), hex("#f1e2c8"), hex("#b57d55"), hex("#e3c9a1"), hex("#9a6b4a")], 0.55, 13, 15)); const x = c.getContext("2d"); x.save(); x.translate(W * 0.32, H * 0.62); x.scale(1, 0.55); const g = x.createRadialGradient(0, 0, 2, 0, 0, 30); g.addColorStop(0, "#b3402a"); g.addColorStop(0.7, "#c9694a"); g.addColorStop(1, "rgba(200,120,90,0)"); x.fillStyle = g; x.beginPath(); x.arc(0, 0, 30, 0, Math.PI * 2); x.fill(); x.restore(); return c; },
  saturn: () => paint(banded([hex("#b49762"), hex("#e8d6a4"), hex("#f4e8c4"), hex("#cdb27c"), hex("#e3cd97")], 0.06, 31, 13)),
  uranus: () => paint(banded([hex("#6fc2cf"), hex("#9fe3e8"), hex("#82d0da")], 0.1, 41, 8)),
  neptune: () => { const c = paint(banded([hex("#1f3fae"), hex("#3f66e0"), hex("#2a4ec2"), hex("#5d86f0")], 0.35, 51, 9)); const x = c.getContext("2d"); x.fillStyle = "rgba(255,255,255,0.35)"; for (let i = 0; i < 7; i += 1) x.fillRect(40 + i * 63, 60 + (i % 3) * 40, 26, 2); return c; },
  pluto: () => { const c = paint((u, v) => { const n = wrapNoise(u, v, 7, 61, 5); const heart = Math.hypot((u - 0.55) * 2, (v - 0.5) * 3) < 0.28; return heart ? hex("#efe3d4") : mix(hex("#6e4f3b"), hex("#cdb199"), n); }); craters(c, 25, 3); return c; },
  moon: (color) => { const base = hex(color || "#bdbdbd"); const c = paint((u, v) => mix(base.map((x) => x * 0.55), base, wrapNoise(u, v, 8, 71, 5))); craters(c, 70, 9); return c; },
};

export function planetCanvas(id, color) { return (MAKERS[id] || (() => MAKERS.moon(color)))(color); }

/** Paints the real continents onto the Earth texture, from the World Globe's country outlines. */
export async function paintEarth(canvas) {
  const res = await fetch("../globe/data/world.json");
  const world = await res.json();
  const ctx = canvas.getContext("2d");
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#0f3b86"); g.addColorStop(0.5, "#1e63c4"); g.addColorStop(1, "#0f3b86");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const X = (lon) => ((lon + 180) / 360) * W;
  const Y = (lat) => ((90 - lat) / 180) * H;
  world.countries.forEach((c) => {
    const lat = Math.abs(c.latlng ? c.latlng[0] : 0);
    ctx.fillStyle = lat < 12 ? "#2f7d3f" : lat < 34 ? "#a99560" : lat < 58 ? "#4b8f48" : "#9cb890";
    if (c.id === "GRL" || c.id === "ATA") ctx.fillStyle = "#f2f6fa";
    (c.polys || []).forEach((poly) => {
      ctx.beginPath();
      poly.forEach((ring) => ring.forEach(([lon, la], i) => (i ? ctx.lineTo(X(lon), Y(la)) : ctx.moveTo(X(lon), Y(la)))));
      ctx.fill("evenodd");
    });
  });
  ctx.fillStyle = "#f2f6fa";
  ctx.fillRect(0, Y(-62), W, H - Y(-62));
  ctx.fillRect(0, 0, W, Y(86));
  ctx.fillStyle = "rgba(255,255,255,0.1)";
  for (let i = 0; i < 40; i += 1) ctx.fillRect(Math.random() * W, Math.random() * H * 0.9, 30 + Math.random() * 60, 2);
}
