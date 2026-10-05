/**
 * Compound Life drawing: floors, walls, furniture and people in a gentle three-quarter view, all with canvas shapes.
 */
import { COLS, ROWS, FLOORS, SETTINGS, ITEMS, ACTIONS, NEEDS, NEED_ICON } from "./data.js";

export const T = 48; // tile size in canvas units
export const OY = 18; // room for the top wall
export const WIDTH = COLS * T;
export const HEIGHT = ROWS * T + OY;

const rr = (c, x, y, w, h, r) => { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); };
const fillR = (c, x, y, w, h, r, col) => { c.fillStyle = col; rr(c, x, y, w, h, r); c.fill(); };
const line = (c, col, wid, ...pts) => { c.strokeStyle = col; c.lineWidth = wid; c.beginPath(); c.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]); c.stroke(); };
const circ = (c, x, y, r, col) => { c.fillStyle = col; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); };
const shade = "rgba(0,0,0,0.18)";

/* ---------------------------------------------------------------- the house */
export function drawHouse(c, H) {
  const S = SETTINGS[H.setting];
  const city = H.setting === "city";
  c.fillStyle = city ? "#6f7d96" : "#c9a06a";
  c.fillRect(0, 0, WIDTH, HEIGHT);
  for (let y = 0; y < ROWS; y += 1) for (let x = 0; x < COLS; x += 1) {
    const f = S.grid[y][x];
    if (f === "#") continue;
    const F = FLOORS[f];
    const px = x * T;
    const py = y * T + OY;
    c.fillStyle = (x + y) % 2 ? F.a : F.b;
    c.fillRect(px, py, T, T);
    if (f === "w" || f === "o") { c.strokeStyle = "rgba(90,55,25,0.18)"; c.lineWidth = 1; for (let k = 1; k < 4; k += 1) { c.beginPath(); c.moveTo(px, py + (k * T) / 4); c.lineTo(px + T, py + (k * T) / 4); c.stroke(); } c.beginPath(); c.moveTo(px + ((y * 17) % T), py); c.lineTo(px + ((y * 17) % T), py + T / 4); c.stroke(); }
    else if (f === "t" || f === "b") { c.strokeStyle = "rgba(80,90,110,0.18)"; c.lineWidth = 1; c.strokeRect(px + 0.5, py + 0.5, T / 2, T / 2); c.strokeRect(px + T / 2 + 0.5, py + T / 2 + 0.5, T / 2 - 1, T / 2 - 1); }
    else if (f === "g") { c.fillStyle = "rgba(40,110,30,0.35)"; for (let k = 0; k < 5; k += 1) c.fillRect(px + ((k * 13 + x * 7) % 44), py + ((k * 19 + y * 11) % 44), 2, 5); }
    else if (f === "c" || f === "k") { c.fillStyle = "rgba(0,0,0,0.08)"; for (let k = 0; k < 4; k += 1) c.fillRect(px + ((k * 17 + x * 5) % 44), py + ((k * 23 + y * 7) % 44), 3, 2); }
    else if (f === "s") { c.strokeStyle = "rgba(0,0,0,0.15)"; c.strokeRect(px + 0.5, py + 0.5, T - 1, T - 1); }
  }
  // walls: a top face, and a front face where the floor below shows
  for (let y = 0; y < ROWS; y += 1) for (let x = 0; x < COLS; x += 1) {
    if (S.grid[y][x] !== "#") continue;
    const px = x * T;
    const py = y * T + OY;
    const outer = y === 0 || x === 0 || x === COLS - 1 || y === ROWS - 1;
    c.fillStyle = city ? (outer ? "#e8e4dc" : "#f4f1ea") : outer ? "#d9784a" : "#f0d9b5";
    c.fillRect(px, py - OY, T, T);
    const below = y + 1 < ROWS ? S.grid[y + 1][x] : "#";
    if (below !== "#") {
      c.fillStyle = city ? "#cfc8bb" : outer ? "#b55a33" : "#d9b98d";
      c.fillRect(px, py + T - OY, T, OY);
      c.fillStyle = "rgba(0,0,0,0.12)";
      c.fillRect(px, py + T - 3, T, 3);
    }
    if (city && outer && y === 0 && x % 3 === 1 && x < COLS - 1) { c.fillStyle = "#9fd3f2"; c.fillRect(px + 6, py - OY + 4, T * 2 - 12, 10); }
  }
  // doors: a little mat
  for (let y = 0; y < ROWS; y += 1) for (let x = 0; x < COLS; x += 1) if (S.grid[y][x] === "D") { c.fillStyle = "rgba(0,0,0,0.12)"; c.fillRect(x * T + 6, y * T + OY + 6, T - 12, T - 12); }
  if (!city) { // the gate
    const [gx, gy] = S.exit;
    c.fillStyle = "#3a6a8a"; c.fillRect(gx * T + 2, gy * T + OY - 4, T - 4, T); c.strokeStyle = "#24485e"; c.lineWidth = 2; for (let k = 1; k < 4; k += 1) { c.beginPath(); c.moveTo(gx * T + 2 + (k * (T - 4)) / 4, gy * T + OY - 4); c.lineTo(gx * T + 2 + (k * (T - 4)) / 4, gy * T + OY + T - 4); c.stroke(); }
  }
}

/* ---------------------------------------------------------------- furniture */
// x, y, w, h in canvas units; `use` = someone is using it right now
export function drawItem(c, id, x, y, w, h, use = false, setting = "city") {
  const p = 4;
  switch (id) {
    case "bed": case "dbed": {
      fillR(c, x + p, y + p, w - 2 * p, h - 2 * p, 6, "#8a5a33");
      fillR(c, x + p + 3, y + p + 3, w - 2 * p - 6, h - 2 * p - 6, 5, "#f6f2e8");
      const pil = id === "dbed" ? 2 : 1;
      for (let i = 0; i < pil; i += 1) fillR(c, x + p + 8 + (i * (w - 2 * p - 16)) / pil, y + p + 7, (w - 2 * p - 16) / pil - 4, 14, 5, "#ffffff");
      fillR(c, x + p + 3, y + h * 0.42, w - 2 * p - 6, h * 0.58 - p - 3, 5, setting === "compound" ? "#e8a33a" : "#5b7fd6");
      if (setting === "compound") { c.fillStyle = "#c0392b"; for (let k = 0; k < 4; k += 1) c.fillRect(x + p + 3, y + h * 0.48 + k * 14, w - 2 * p - 6, 4); }
      break;
    }
    case "wardrobe": fillR(c, x + p, y - 14, w - 2 * p, h + 10, 4, "#9a6a3e"); line(c, "#5a3a1e", 2, x + w / 2, y - 12, x + w / 2, y + h - 6); circ(c, x + w / 2 - 5, y + h / 2 - 6, 2.5, "#e8c060"); circ(c, x + w / 2 + 5, y + h / 2 - 6, 2.5, "#e8c060"); break;
    case "lamp": fillR(c, x + 8, y + 18, w - 16, h - 22, 4, "#9a6a3e"); circ(c, x + w / 2, y + 16, 11, "#ffe9a8"); if (true) { c.fillStyle = "rgba(255,230,150,0.25)"; c.beginPath(); c.arc(x + w / 2, y + 16, 22, 0, Math.PI * 2); c.fill(); } break;
    case "desk": fillR(c, x + p, y + 10, w - 2 * p, h - 16, 4, "#b98a52"); line(c, "#6a4a2a", 3, x + 10, y + h - 6, x + 10, y + h - 2); line(c, "#6a4a2a", 3, x + w - 10, y + h - 6, x + w - 10, y + h - 2); fillR(c, x + 14, y + 14, 18, 12, 2, "#3b82f6"); line(c, "#f5c518", 3, x + 40, y + 16, x + 58, y + 24); break;
    case "bookshelf": fillR(c, x + p, y - 14, w - 2 * p, h + 10, 3, "#7a4e2a"); ["#e5484d", "#3b82f6", "#2fb36d", "#f5a623", "#8a5ce0", "#ec6aa0"].forEach((col, i) => { c.fillStyle = col; c.fillRect(x + 9 + (i % 3) * 10, y - 8 + Math.floor(i / 3) * 22, 7, 18); }); break;
    case "computer": fillR(c, x + p, y + 12, w - 2 * p, h - 18, 4, "#d9dde6"); fillR(c, x + w / 2 - 22, y - 10, 44, 28, 3, "#1b1f2a"); fillR(c, x + w / 2 - 18, y - 6, 36, 20, 2, use ? "#4ad6c8" : "#2b3550"); fillR(c, x + w / 2 - 16, y + 24, 32, 8, 2, "#9aa1b0"); break;
    case "sofa": fillR(c, x + 2, y + 4, w - 4, h - 6, 10, setting === "compound" ? "#8a3a2a" : "#2f8f88"); fillR(c, x + 6, y + 6, w - 12, 14, 7, setting === "compound" ? "#a24a36" : "#3aa79f"); for (let i = 0; i < 3; i += 1) fillR(c, x + 8 + (i * (w - 16)) / 3, y + 22, (w - 16) / 3 - 4, h - 30, 5, setting === "compound" ? "#b55a44" : "#48b8b0"); break;
    case "tv": fillR(c, x + 6, y + 22, w - 12, h - 26, 4, "#5a3a1e"); fillR(c, x + 14, y - 14, w - 28, 36, 4, "#111"); { const g = c.createLinearGradient(x, y - 10, x + w, y + 18); if (use) { g.addColorStop(0, "#4ad6c8"); g.addColorStop(0.5, "#f5c518"); g.addColorStop(1, "#e5484d"); } else { g.addColorStop(0, "#1e2638"); g.addColorStop(1, "#2c3a5a"); } c.fillStyle = g; c.fillRect(x + 18, y - 10, w - 36, 28); } break;
    case "radio": fillR(c, x + 8, y + 14, w - 16, h - 20, 5, "#c0392b"); circ(c, x + 18, y + 28, 7, "#2a1a14"); circ(c, x + 32, y + 28, 4, "#f5c518"); line(c, "#555", 2, x + 34, y + 14, x + 42, y + 2); if (use) { c.fillStyle = "#fff"; c.font = "14px system-ui"; c.fillText("♪", x + 36, y + 6); } break;
    case "rug": { fillR(c, x + 4, y + 6, w - 8, h - 12, 4, setting === "compound" ? "#f5c518" : "#c9b8e8"); const stripes = setting === "compound" ? ["#2fb36d", "#e5484d", "#111", "#2fb36d"] : ["#8a7ab8", "#b8a8e0"]; stripes.forEach((col, i) => { c.fillStyle = col; c.fillRect(x + 10 + i * ((w - 20) / stripes.length), y + 10, (w - 20) / stripes.length / 2, h - 20); }); break; }
    case "plant": fillR(c, x + 14, y + 26, w - 28, 18, 4, "#c0603a"); [[0, -6, 12], [-9, 4, 9], [9, 4, 9], [0, 10, 8]].forEach(([dx, dy, r]) => circ(c, x + w / 2 + dx, y + 18 + dy, r, "#3e9e4e")); break;
    case "painting": line(c, "#6a4a2a", 3, x + 14, y + h - 4, x + w / 2, y + 4, x + w - 14, y + h - 4); fillR(c, x + 8, y + 6, w - 16, 26, 2, "#f6efe0"); circ(c, x + 18, y + 16, 5, "#f5a623"); line(c, "#2fb36d", 3, x + 12, y + 28, x + 22, y + 20, x + 30, y + 26, x + 40, y + 16); break;
    case "fishtank": fillR(c, x + 6, y + 18, w - 12, h - 22, 3, "#5a3a1e"); fillR(c, x + 8, y - 6, w - 16, 26, 3, "rgba(120,200,255,0.8)"); circ(c, x + 30, y + 6, 4, "#f5a623"); circ(c, x + 56, y + 2, 3, "#e5484d"); break;
    case "console": fillR(c, x + 8, y + 18, w - 16, h - 24, 4, "#222"); fillR(c, x + 12, y + 30, 22, 8, 4, "#3b82f6"); break;
    case "keyboard": fillR(c, x + 4, y + 14, w - 8, 16, 3, "#222"); for (let i = 0; i < 12; i += 1) c.fillStyle = "#fff", c.fillRect(x + 8 + i * ((w - 16) / 12), y + 16, (w - 16) / 12 - 1, 10); break;
    case "weights": fillR(c, x + 10, y + 16, w - 40, 12, 4, "#333"); line(c, "#888", 3, x + w - 30, y + 30, x + w - 8, y + 30); circ(c, x + w - 30, y + 30, 6, "#222"); circ(c, x + w - 8, y + 30, 6, "#222"); break;
    case "goal": line(c, "#fff", 4, x + 4, y + h - 4, x + 4, y + 4, x + w - 4, y + 4, x + w - 4, y + h - 4); c.strokeStyle = "rgba(255,255,255,0.5)"; c.lineWidth = 1; for (let k = 1; k < 8; k += 1) { c.beginPath(); c.moveTo(x + 4 + (k * (w - 8)) / 8, y + 4); c.lineTo(x + 4 + (k * (w - 8)) / 8, y + h - 4); c.stroke(); } circ(c, x + w / 2, y + h + 4, 6, "#fff"); circ(c, x + w / 2, y + h + 4, 2, "#222"); break;
    case "fridge": fillR(c, x + 6, y - 18, w - 12, h + 14, 5, "#eef1f6"); line(c, "#c3c9d4", 2, x + 6, y + 2, x + w - 6, y + 2); line(c, "#9aa1b0", 3, x + w - 12, y - 12, x + w - 12, y - 2); line(c, "#9aa1b0", 3, x + w - 12, y + 8, x + w - 12, y + 18); break;
    case "counter": fillR(c, x + 2, y + 4, w - 4, h - 8, 3, "#e3e6ec"); fillR(c, x + 2, y + 4, w - 4, 10, 3, "#b8bec9"); line(c, "#c3c9d4", 1, x + w / 2, y + 16, x + w / 2, y + h - 6); break;
    case "stove": fillR(c, x + 4, y + 4, w - 8, h - 8, 3, "#f1f3f7"); [[14, 14], [32, 14], [14, 30], [32, 30]].forEach(([dx, dy]) => { c.strokeStyle = use ? "#ff7a2e" : "#444"; c.lineWidth = 2.5; c.beginPath(); c.arc(x + dx, y + dy, 6, 0, Math.PI * 2); c.stroke(); }); break;
    case "sink": fillR(c, x + 2, y + 4, w - 4, h - 8, 3, "#e3e6ec"); fillR(c, x + 10, y + 12, w - 20, h - 24, 8, "#9fb4c8"); line(c, "#777", 3, x + w / 2, y + 6, x + w / 2, y + 14); break;
    case "coalpot": fillR(c, x + 12, y + 26, w - 24, 14, 3, "#3a3a3a"); circ(c, x + w / 2, y + 24, 13, "#555"); circ(c, x + w / 2, y + 24, 9, use ? "#ff7a2e" : "#7a3a1a"); if (use) { c.fillStyle = "rgba(255,140,40,0.35)"; c.beginPath(); c.arc(x + w / 2, y + 22, 20, 0, Math.PI * 2); c.fill(); } fillR(c, x + 12, y + 8, w - 24, 12, 4, "#8a8a8a"); break;
    case "cupboard": fillR(c, x + 4, y - 6, w - 8, h + 2, 4, "#9a6a3e"); line(c, "#5a3a1e", 2, x + w / 2, y - 4, x + w / 2, y + h - 6); circ(c, x + w / 2 - 5, y + 18, 2.5, "#e8c060"); circ(c, x + w / 2 + 5, y + 18, 2.5, "#e8c060"); break;
    case "barrel": fillR(c, x + 10, y + 6, w - 20, h - 10, 8, "#2f6fd6"); c.fillStyle = "#4a8af0"; c.beginPath(); c.ellipse(x + w / 2, y + 8, (w - 20) / 2, 6, 0, 0, Math.PI * 2); c.fill(); break;
    case "table": case "ptable": { const top = id === "ptable" ? "#f2f2f2" : "#b98a52"; fillR(c, x + 4, y + 8, w - 8, h - 14, 6, top); fillR(c, x + 4, y + h - 10, w - 8, 4, 2, shade); circ(c, x + w * 0.3, y + h / 2, 8, "#fff"); circ(c, x + w * 0.7, y + h / 2, 8, "#fff"); circ(c, x + w * 0.3, y + h / 2, 5, "#f5a623"); break; }
    case "chair": fillR(c, x + 12, y + 12, w - 24, h - 18, 4, "#9a6a3e"); fillR(c, x + 12, y + 6, w - 24, 8, 3, "#7a4e2a"); break;
    case "pchair": fillR(c, x + 12, y + 14, w - 24, h - 20, 6, "#e5484d"); fillR(c, x + 12, y + 6, w - 24, 10, 5, "#c0392b"); break;
    case "bench": fillR(c, x + 4, y + 16, w - 8, 14, 4, "#a8733d"); line(c, "#6a4a2a", 4, x + 10, y + 30, x + 10, y + 40); line(c, "#6a4a2a", 4, x + w - 10, y + 30, x + w - 10, y + 40); break;
    case "mango": fillR(c, x + w / 2 - 8, y + h / 2, 16, h / 2 - 4, 4, "#6a4a2a"); [[-24, -12, 26], [20, -16, 26], [0, -30, 28], [-10, 6, 22], [16, 4, 22]].forEach(([dx, dy, r]) => circ(c, x + w / 2 + dx, y + h / 2 + dy, r, "#2f8a3a")); [[-20, -4], [12, -22], [24, 2], [-2, -18]].forEach(([dx, dy]) => circ(c, x + w / 2 + dx, y + h / 2 + dy, 5, "#ffb02e")); break;
    case "tank": fillR(c, x + 8, y - 22, w - 16, h + 14, 10, "#1e1e22"); c.fillStyle = "#333"; c.beginPath(); c.ellipse(x + w / 2, y - 20, (w - 16) / 2, 6, 0, 0, Math.PI * 2); c.fill(); line(c, "#444", 2, x + 10, y - 4, x + w - 10, y - 4); break;
    case "line": line(c, "#6a4a2a", 4, x + 6, y + h - 4, x + 6, y + 4); line(c, "#6a4a2a", 4, x + w - 6, y + h - 4, x + w - 6, y + 4); line(c, "#ddd", 1.5, x + 6, y + 8, x + w - 6, y + 8); ["#e5484d", "#3b82f6", "#f5c518", "#2fb36d"].forEach((col, i) => fillR(c, x + 16 + i * 28, y + 9, 18, 18, 2, col)); break;
    case "toilet": fillR(c, x + 14, y + 4, w - 28, 12, 3, "#fff"); c.fillStyle = "#fff"; c.beginPath(); c.ellipse(x + w / 2, y + 28, 12, 14, 0, 0, Math.PI * 2); c.fill(); c.strokeStyle = "#cfd6e0"; c.lineWidth = 2; c.stroke(); break;
    case "bsink": fillR(c, x + 10, y + 6, w - 20, 22, 8, "#fff"); fillR(c, x + 15, y + 10, w - 30, 12, 5, "#cfe6f2"); fillR(c, x + w / 2 - 4, y + 26, 8, 16, 3, "#fff"); break;
    case "shower": fillR(c, x + 3, y + 3, w - 6, h - 6, 4, "rgba(180,220,245,0.55)"); c.strokeStyle = "#8fb8d0"; c.lineWidth = 2; rr(c, x + 3, y + 3, w - 6, h - 6, 4); c.stroke(); circ(c, x + w / 2, y + 10, 5, "#9aa1b0"); if (use) { c.fillStyle = "rgba(255,255,255,0.7)"; [[-10, 8], [6, 2], [0, 16], [12, 14]].forEach(([dx, dy]) => { c.beginPath(); c.arc(x + w / 2 + dx, y + 18 + dy, 6, 0, Math.PI * 2); c.fill(); }); } break;
    case "bucket": fillR(c, x + 3, y + 3, w - 6, h - 6, 4, "rgba(160,200,230,0.45)"); fillR(c, x + 14, y + 18, 20, 18, 4, "#2f6fd6"); c.fillStyle = "#9fd3f2"; c.beginPath(); c.ellipse(x + 24, y + 19, 10, 4, 0, 0, Math.PI * 2); c.fill(); if (use) { c.fillStyle = "rgba(255,255,255,0.7)"; circ(c, x + 14, y + 12, 5, "rgba(255,255,255,0.75)"); circ(c, x + 32, y + 10, 4, "rgba(255,255,255,0.75)"); } break;
    default: fillR(c, x + 6, y + 6, w - 12, h - 12, 4, "#bbb");
  }
}

/* ---------------------------------------------------------------- people */
export function drawPerson(c, p, cx, cy, opts = {}) {
  const child = p.age === "child";
  const k = (child ? 0.78 : 1) * (opts.scale || 1);
  const step = opts.walking ? Math.sin((opts.t || 0) * 0.02) : 0;
  const dir = p.dir || 1;
  const outfit = opts.outfit || p.outfit;
  c.save();
  c.translate(cx, cy);
  if (opts.lie) { c.rotate(-Math.PI / 2 * dir); }
  c.scale(k * dir, k);
  if (!opts.lie) { c.fillStyle = "rgba(0,0,0,0.2)"; c.beginPath(); c.ellipse(0, 2, 12, 4, 0, 0, Math.PI * 2); c.fill(); }
  const sitting = opts.sit;
  // legs
  c.fillStyle = "#2b2f3a";
  if (!sitting) { c.fillRect(-6, -16 + step * 0, 5, 16 - step * 2); c.fillRect(1, -16, 5, 16 + step * 2); }
  else { c.fillRect(-6, -12, 12, 6); }
  // shoes
  c.fillStyle = "#1a1a1a";
  if (!sitting) { c.fillRect(-7, -2 - step * 2, 6, 3); c.fillRect(1, -2 + step * 2, 6, 3); }
  // body
  fillR(c, -9, sitting ? -30 : -34, 18, 20, 6, outfit);
  // arms
  c.fillStyle = p.skin;
  c.save(); c.translate(-9, sitting ? -28 : -32); c.rotate(step * 0.4); c.fillRect(-3, 0, 4, 15); c.restore();
  c.save(); c.translate(9, sitting ? -28 : -32); c.rotate(-step * 0.4); c.fillRect(-1, 0, 4, 15); c.restore();
  // head
  const hy = sitting ? -40 : -44;
  if (p.hair === "afro") circ(c, 0, hy - 3, 13, "#1a120c");
  if (p.hair === "puffs") { circ(c, -9, hy - 10, 6.5, "#1a120c"); circ(c, 9, hy - 10, 6.5, "#1a120c"); }
  circ(c, 0, hy, 10, p.skin);
  if (p.hair === "short") { c.fillStyle = "#1a120c"; c.beginPath(); c.arc(0, hy - 1, 10.4, Math.PI * 1.05, Math.PI * 1.95); c.fill(); }
  if (p.hair === "afro") { c.fillStyle = "#1a120c"; c.beginPath(); c.arc(0, hy - 2, 10.6, Math.PI * 1.02, Math.PI * 1.98); c.fill(); }
  if (p.hair === "puffs") { c.fillStyle = "#1a120c"; c.beginPath(); c.arc(0, hy - 1, 10.4, Math.PI * 1.1, Math.PI * 1.9); c.fill(); }
  if (p.hair === "braids") { c.fillStyle = "#1a120c"; c.beginPath(); c.arc(0, hy - 1, 10.6, Math.PI * 1.0, Math.PI * 2.0); c.fill(); c.strokeStyle = "#1a120c"; c.lineWidth = 2.4; [-8, -5, 5, 8].forEach((dx) => { c.beginPath(); c.moveTo(dx, hy); c.lineTo(dx * 1.1, hy + 13); c.stroke(); }); }
  if (p.hair === "bun") { c.fillStyle = "#1a120c"; c.beginPath(); c.arc(0, hy - 1, 10.4, Math.PI * 1.05, Math.PI * 1.95); c.fill(); circ(c, 0, hy - 12, 5, "#1a120c"); }
  // face (looking the way they walk)
  if (!opts.sleep) { circ(c, 3, hy, 1.6, "#111"); circ(c, 7, hy, 1.6, "#111"); c.strokeStyle = "#5a2a18"; c.lineWidth = 1.2; c.beginPath(); c.arc(5, hy + 3, 3, 0.2, Math.PI - 0.2); c.stroke(); }
  else { c.strokeStyle = "#111"; c.lineWidth = 1.4; c.beginPath(); c.moveTo(1, hy); c.lineTo(5, hy); c.moveTo(6, hy); c.lineTo(9, hy); c.stroke(); }
  c.restore();
}
export function personPose(H, p) {
  const a = p.act;
  if (!a || a.phase !== "do") return { walking: !!(a && a.phase === "walk" && a.path && a.path.length) };
  const A = ACTIONS[a.type];
  if (a.floor) return { lie: true, sleep: true };
  if (A.hidden_person) return { hidden: true };
  if (A.lie) return { lie: true, sleep: a.type === "sleep" || a.type === "nap" };
  if (A.sit) return { sit: true };
  if (a.type === "dance" || a.type === "football" || a.type === "workout") return { walking: true };
  return {};
}

/* ---------------------------------------------------------------- the whole scene */
export function drawScene(c, H, view) {
  drawHouse(c, H);
  const using = new Set(H.people.filter((p) => p.act && p.act.phase === "do" && p.act.uid).map((p) => p.act.uid));
  // depth: furniture and people, sorted by their bottom edge
  const things = [];
  H.furniture.forEach((f) => { const it = ITEMS[f.id]; things.push({ z: it.walk ? -1 : (f.y + it.h) * T - (ITEMS[f.id].acts.includes("sleep") ? T * 0.6 : 0), f }); });
  H.people.forEach((p) => { if (!p.away) { const pose = personPose(H, p); if (!pose.hidden) things.push({ z: (p.y + 1) * T - (pose.lie ? T * 0.3 : 0) + 1, p, pose }); } });
  things.sort((a, b) => a.z - b.z);
  things.forEach((th) => {
    if (th.f) {
      const it = ITEMS[th.f.id];
      if (view.moving && view.moving === th.f.uid) c.globalAlpha = 0.35;
      drawItem(c, th.f.id, th.f.x * T, th.f.y * T + OY, it.w * T, it.h * T, using.has(th.f.uid), H.setting);
      c.globalAlpha = 1;
    } else {
      const p = th.p;
      const px = p.x * T + T / 2;
      const py = p.y * T + OY + T - 6;
      if (view.selected === p.id) { c.strokeStyle = "#ffcc33"; c.lineWidth = 3; c.beginPath(); c.ellipse(px, py + 2, 16, 6, 0, 0, Math.PI * 2); c.stroke(); }
      drawPerson(c, p, th.pose.lie ? px : px, th.pose.lie ? py - 14 : py, { ...th.pose, t: view.t + p.id * 300 });
      if (th.pose.sleep && th.pose.lie) { c.fillStyle = "#fff"; c.font = "bold 14px system-ui"; c.fillText("z", px + 10, py - 30 - ((view.t / 40 + p.id * 10) % 12)); }
    }
  });
  // thought bubbles: what they are doing, and urgent needs
  H.people.forEach((p) => {
    if (p.away) return;
    const pose = personPose(H, p);
    let px = p.x * T + T / 2;
    let py = p.y * T + OY + T - 62;
    if (pose.hidden) { py += 20; }
    const low = NEEDS.filter((n) => p.needs[n] < 18).sort((a, b) => p.needs[a] - p.needs[b])[0];
    const doing = p.act && p.act.phase === "do" && ACTIONS[p.act.type] ? ACTIONS[p.act.type].icon : null;
    const icon = low && !(p.act && ACTIONS[p.act.type] && ACTIONS[p.act.type].need[low] > 0) ? NEED_ICON[low] : view.selected === p.id || pose.hidden ? doing : null;
    if (!icon) return;
    const alert = !!low && icon === NEED_ICON[low];
    c.fillStyle = alert ? "#ffe0e0" : "#fff";
    c.strokeStyle = alert ? "#e5484d" : "rgba(0,0,0,0.25)";
    c.lineWidth = 2;
    c.beginPath(); c.ellipse(px + 14, py - 10, 15, 13, 0, 0, Math.PI * 2); c.fill(); c.stroke();
    circ(c, px + 5, py + 4, 3, alert ? "#ffe0e0" : "#fff");
    c.font = "16px system-ui";
    c.textAlign = "center";
    c.fillText(icon, px + 14, py - 4);
    c.textAlign = "left";
    void px;
  });
  // evening light
  const h = H.minute / 60;
  const dark = h >= 19 ? Math.min(0.42, (h - 19) * 0.12) : h < 6 ? 0.42 : h < 7 ? (7 - h) * 0.42 : 0;
  if (dark > 0) {
    c.fillStyle = `rgba(10,20,60,${dark})`;
    c.fillRect(0, 0, WIDTH, HEIGHT);
    H.furniture.forEach((f) => { if (f.id === "lamp" || f.id === "tv" || f.id === "coalpot") { const it = ITEMS[f.id]; const g = c.createRadialGradient(f.x * T + (it.w * T) / 2, f.y * T + OY + 10, 4, f.x * T + (it.w * T) / 2, f.y * T + OY + 10, 90); g.addColorStop(0, `rgba(255,220,140,${dark * 0.8})`); g.addColorStop(1, "rgba(255,220,140,0)"); c.fillStyle = g; c.fillRect(f.x * T - 90, f.y * T - 90, 180 + it.w * T, 180); } });
  }
  // buy mode: grid and the item being placed
  if (view.ghost) {
    c.strokeStyle = "rgba(255,255,255,0.18)"; c.lineWidth = 1;
    for (let x = 0; x <= COLS; x += 1) { c.beginPath(); c.moveTo(x * T, OY); c.lineTo(x * T, HEIGHT); c.stroke(); }
    for (let y = 0; y <= ROWS; y += 1) { c.beginPath(); c.moveTo(0, y * T + OY); c.lineTo(WIDTH, y * T + OY); c.stroke(); }
    const g = view.ghost;
    const it = ITEMS[g.id];
    c.globalAlpha = 0.8;
    drawItem(c, g.id, g.x * T, g.y * T + OY, it.w * T, it.h * T, false, H.setting);
    c.globalAlpha = 1;
    c.fillStyle = g.ok ? "rgba(47,179,109,0.3)" : "rgba(229,72,77,0.35)";
    c.fillRect(g.x * T, g.y * T + OY, it.w * T, it.h * T);
  }
}

/** A small picture of a piece of furniture for the shop. */
export function itemPreview(id, setting) {
  const it = ITEMS[id];
  const cv = document.createElement("canvas");
  const s = 1;
  cv.width = Math.max(it.w, 1) * T * s + 8;
  cv.height = Math.max(it.h, 1) * T * s + 30;
  const c = cv.getContext("2d");
  c.translate(4, 24);
  drawItem(c, id, 0, 0, it.w * T, it.h * T, false, setting);
  return cv.toDataURL();
}
/** A portrait for the family bar. */
export function portrait(p) {
  const cv = document.createElement("canvas");
  cv.width = 64;
  cv.height = 64;
  const c = cv.getContext("2d");
  c.translate(32, 120);
  drawPerson(c, { ...p, dir: 1 }, 0, 0, { scale: 2.1 });
  return cv.toDataURL();
}
