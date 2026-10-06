import { canSharePhotos, toPhotos, download } from "../../assets/save-image.js";
import { makePages } from "./pages2.js";
import { makePeoplePages } from "./pages3.js";

const $ = (id) => document.getElementById(id);
const paint = $("paint");
const lines = $("lines");
const pctx = paint.getContext("2d", { willReadFrequently: true });
const lctx = lines.getContext("2d", { willReadFrequently: true });
const W = paint.width;
const H = paint.height;
const INK = "#2a1b13";

const COLORS = ["#e5484d", "#f28c28", "#f2c230", "#8bd66b", "#35a86d", "#2fb8c9", "#4a7de8", "#9b6be0", "#e26bb4", "#8a5a34", "#222222", "#ffffff"];
const STAMPS = ["⭐", "❤️", "🌸", "🐟", "🦋", "🐶", "🐱", "🌈", "☀️", "🚀", "🎈", "🍎"];
const TOOLS = [
  { id: "brush", label: "🖌 Brush" },
  { id: "rainbow", label: "🌈 Rainbow" },
  { id: "fill", label: "🪣 Fill" },
  { id: "stamp", label: "⭐ Stamps" },
  { id: "eraser", label: "🧽 Eraser" },
];

const state = { tool: "brush", color: COLORS[0], size: 16, stamp: STAMPS[0], page: "blank", hue: 0 };
let undoStack = [];
let redoStack = [];
let drawing = false;
let last = null;

/* ---------- colouring pages (drawn as outlines on the top layer) ---------- */
function stroke(fn, width = 6) {
  lctx.lineWidth = width;
  lctx.lineJoin = "round";
  lctx.lineCap = "round";
  lctx.strokeStyle = INK;
  lctx.beginPath();
  fn(lctx);
  lctx.stroke();
}
const circle = (x, y, r) => (c) => c.arc(x, y, r, 0, Math.PI * 2);
const ell = (x, y, rx, ry, rot = 0) => (c) => c.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
// clears any lines under the shape, then outlines it, so a piece can sit in front of another
function solid(fn, width = 6) {
  lctx.save();
  lctx.globalCompositeOperation = "destination-out";
  lctx.beginPath();
  fn(lctx);
  lctx.fill();
  lctx.restore();
  stroke(fn, width);
}
const poly = (pts) => (c) => {
  c.moveTo(...pts[0]);
  pts.slice(1).forEach((p) => c.lineTo(...p));
  c.closePath();
};

const PAGES = {
  blank: { label: "Blank", cat: "blank", draw() {} },
  house: {
    cat: "scenes",
    label: "🏠 House",
    draw() {
      stroke(poly([[0, 470], [800, 470], [800, 600], [0, 600]])); // ground
      stroke(poly([[250, 260], [250, 470], [550, 470], [550, 260]])); // walls
      stroke(poly([[210, 270], [400, 130], [590, 270]])); // roof
      stroke(poly([[470, 180], [470, 120], [520, 120], [520, 220]])); // chimney
      stroke(poly([[360, 470], [360, 350], [440, 350], [440, 470]])); // door
      stroke(circle(426, 415, 5), 4);
      stroke(poly([[280, 310], [280, 390], [340, 390], [340, 310]])); // window L
      stroke((c) => { c.moveTo(310, 310); c.lineTo(310, 390); c.moveTo(280, 350); c.lineTo(340, 350); }, 4);
      stroke(poly([[460, 310], [460, 390], [520, 390], [520, 310]])); // window R
      stroke((c) => { c.moveTo(490, 310); c.lineTo(490, 390); c.moveTo(460, 350); c.lineTo(520, 350); }, 4);
      stroke(circle(90, 90, 44)); // sun
      stroke((c) => {
        c.moveTo(640, 150);
        c.bezierCurveTo(605, 150, 605, 108, 645, 106);
        c.bezierCurveTo(652, 76, 700, 72, 712, 102);
        c.bezierCurveTo(736, 84, 778, 100, 764, 130);
        c.bezierCurveTo(796, 134, 790, 150, 764, 150);
        c.closePath();
      }, 5); // cloud
      stroke(poly([[640, 470], [640, 370], [670, 370], [670, 470]])); // trunk
      stroke(circle(655, 320, 70)); // tree top
    },
  },
  fish: {
    cat: "animals",
    label: "🐟 Fish",
    draw() {
      stroke((c) => c.ellipse(390, 300, 200, 120, 0, 0, Math.PI * 2)); // body
      stroke(poly([[580, 300], [720, 190], [720, 410]])); // tail
      stroke(poly([[380, 185], [430, 100], [500, 200]])); // top fin
      stroke(poly([[380, 415], [430, 490], [490, 400]])); // bottom fin
      stroke(circle(260, 270, 22)); // eye
      stroke(circle(266, 270, 9), 4);
      stroke((c) => { c.arc(218, 320, 34, 0.15 * Math.PI, 0.85 * Math.PI); }, 5); // mouth
      stroke((c) => { c.arc(450, 300, 70, -1.1, 1.1); }, 4); // gill
      [[120, 190, 16], [90, 130, 22], [140, 80, 12]].forEach(([x, y, r]) => stroke(circle(x, y, r), 5)); // bubbles
      stroke((c) => { c.moveTo(60, 570); c.bezierCurveTo(30, 520, 90, 490, 60, 440); c.bezierCurveTo(30, 400, 80, 380, 70, 350); }, 6); // seaweed
      stroke((c) => { c.moveTo(0, 60); c.bezierCurveTo(60, 20, 100, 100, 160, 60); c.bezierCurveTo(220, 20, 260, 100, 320, 60); }, 5); // waves
    },
  },
  flower: {
    cat: "nature",
    label: "🌸 Flower",
    draw() {
      for (let i = 0; i < 8; i += 1) {
        const a = (i / 8) * Math.PI * 2;
        stroke(circle(400 + Math.cos(a) * 105, 210 + Math.sin(a) * 105, 62)); // petals
      }
      stroke(circle(400, 210, 58)); // centre
      stroke(poly([[385, 320], [385, 600], [415, 600], [415, 320]])); // stem
      stroke((c) => { c.moveTo(385, 470); c.bezierCurveTo(300, 470, 240, 420, 230, 360); c.bezierCurveTo(310, 350, 370, 400, 385, 470); }, 6); // leaf L
      stroke((c) => { c.moveTo(415, 520); c.bezierCurveTo(500, 520, 560, 470, 570, 410); c.bezierCurveTo(490, 400, 430, 450, 415, 520); }, 6); // leaf R
      stroke(circle(90, 90, 44)); // sun
      stroke((c) => { c.moveTo(0, 590); c.lineTo(30, 550); c.lineTo(60, 590); c.lineTo(90, 545); c.lineTo(120, 590); }, 5); // grass
      stroke((c) => { c.moveTo(680, 590); c.lineTo(710, 545); c.lineTo(740, 590); c.lineTo(770, 550); c.lineTo(800, 590); }, 5);
    },
  },
  rocket: {
    cat: "vehicles",
    label: "🚀 Rocket",
    draw() {
      stroke((c) => { c.moveTo(400, 60); c.bezierCurveTo(500, 150, 520, 300, 500, 420); c.lineTo(300, 420); c.bezierCurveTo(280, 300, 300, 150, 400, 60); c.closePath(); }); // body
      stroke(circle(400, 230, 50)); // window
      stroke(circle(400, 230, 30), 4);
      stroke(poly([[300, 330], [220, 450], [300, 420]])); // left fin
      stroke(poly([[500, 330], [580, 450], [500, 420]])); // right fin
      stroke(poly([[340, 420], [340, 470], [460, 470], [460, 420]])); // engine
      stroke(poly([[350, 470], [400, 590], [450, 470]])); // flame
      [[110, 100], [690, 80], [150, 300], [660, 330], [90, 480], [720, 520]].forEach(([x, y]) => {
        stroke(poly([[x, y - 22], [x + 7, y - 7], [x + 22, y], [x + 7, y + 7], [x, y + 22], [x - 7, y + 7], [x - 22, y], [x - 7, y - 7]]), 4);
      }); // stars
      stroke(circle(660, 180, 46)); // planet
      stroke((c) => c.ellipse(660, 180, 82, 20, -0.4, 0, Math.PI * 2), 5); // ring
    },
  },
};

function clipped(shape, draw) {
  lctx.save();
  lctx.beginPath();
  shape(lctx);
  lctx.clip();
  draw();
  lctx.restore();
}
Object.assign(PAGES, makePages({ stroke, solid, circle, poly, ell, clipped }));
Object.assign(PAGES, makePeoplePages({ stroke, solid, circle, poly, ell, clipped }));

function loadPage(id) {
  state.page = id;
  const tip = document.getElementById("photoTip");
  if (tip) tip.hidden = true;
  lctx.clearRect(0, 0, W, H);
  PAGES[id].draw();
  pctx.fillStyle = "#ffffff";
  pctx.fillRect(0, 0, W, H);
  // keep the undo history so an accidental page switch can be undone
  if (undoStack.length === 0) undoStack.push(pctx.getImageData(0, 0, W, H));
  else snapshot();
  refreshButtons();
}

/* ---------- history ---------- */
function snapshot() {
  undoStack.push(pctx.getImageData(0, 0, W, H));
  if (undoStack.length > 25) undoStack.shift();
  redoStack = [];
  refreshButtons();
}
function undo() {
  if (undoStack.length < 2) return;
  redoStack.push(undoStack.pop());
  pctx.putImageData(undoStack[undoStack.length - 1], 0, 0);
  refreshButtons();
}
function redo() {
  const img = redoStack.pop();
  if (!img) return;
  undoStack.push(img);
  pctx.putImageData(img, 0, 0);
  refreshButtons();
}
function refreshButtons() {
  $("undo").disabled = undoStack.length < 2;
  $("redo").disabled = redoStack.length === 0;
}

/* ---------- drawing ---------- */
function pos(e) {
  const r = paint.getBoundingClientRect();
  return [((e.clientX - r.left) / r.width) * W, ((e.clientY - r.top) / r.height) * H];
}

function dab(x, y, x0, y0) {
  pctx.lineCap = "round";
  pctx.lineJoin = "round";
  pctx.lineWidth = state.tool === "eraser" ? state.size * 1.6 : state.size;
  if (state.tool === "eraser") pctx.strokeStyle = "#ffffff";
  else if (state.tool === "rainbow") {
    state.hue = (state.hue + 4) % 360;
    pctx.strokeStyle = `hsl(${state.hue} 90% 55%)`;
  } else pctx.strokeStyle = state.color;
  pctx.beginPath();
  pctx.moveTo(x0, y0);
  pctx.lineTo(x + 0.01, y + 0.01);
  pctx.stroke();
}

paint.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  const [x, y] = pos(e);
  if (state.tool === "fill") {
    floodFill(Math.round(x), Math.round(y), state.color);
    snapshot();
    return;
  }
  if (state.tool === "stamp") {
    pctx.font = `${state.size * 3.2 + 30}px serif`;
    pctx.textAlign = "center";
    pctx.textBaseline = "middle";
    pctx.fillText(state.stamp, x, y);
    snapshot();
    return;
  }
  paint.setPointerCapture(e.pointerId);
  drawing = true;
  last = [x, y];
  dab(x, y, x, y);
});
paint.addEventListener("pointermove", (e) => {
  if (!drawing) return;
  const events = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
  (events.length ? events : [e]).forEach((ev) => {
    const [x, y] = pos(ev);
    dab(x, y, last[0], last[1]);
    last = [x, y];
  });
});
const end = () => {
  if (!drawing) return;
  drawing = false;
  snapshot();
};
paint.addEventListener("pointerup", end);
paint.addEventListener("pointercancel", end);

/* ---------- paint bucket: fills the region under the tap, stopping at outlines ---------- */
function floodFill(sx, sy, hex) {
  if (sx < 0 || sy < 0 || sx >= W || sy >= H) return;
  const img = pctx.getImageData(0, 0, W, H);
  const data = img.data;
  const barrier = lctx.getImageData(0, 0, W, H).data;
  const at = (x, y) => y * W + x;
  const seed = at(sx, sy) * 4;
  if (barrier[seed + 3] > 60) return; // tapped an outline
  const tr = data[seed];
  const tg = data[seed + 1];
  const tb = data[seed + 2];
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  if (Math.abs(tr - r) + Math.abs(tg - g) + Math.abs(tb - b) < 6) return; // already this colour
  const tol = 60;
  const visited = new Uint8Array(W * H);
  const stack = [sx, sy];
  while (stack.length) {
    const y = stack.pop();
    const x = stack.pop();
    let xl = x;
    // scan left then right along the row
    const ok = (px) => {
      const i = at(px, y);
      if (visited[i] || barrier[i * 4 + 3] > 60) return false;
      const k = i * 4;
      return Math.abs(data[k] - tr) + Math.abs(data[k + 1] - tg) + Math.abs(data[k + 2] - tb) <= tol;
    };
    if (!ok(x)) continue;
    while (xl > 0 && ok(xl - 1)) xl -= 1;
    let xr = x;
    while (xr < W - 1 && ok(xr + 1)) xr += 1;
    for (let px = xl; px <= xr; px += 1) {
      const i = at(px, y);
      visited[i] = 1;
      const k = i * 4;
      data[k] = r;
      data[k + 1] = g;
      data[k + 2] = b;
      data[k + 3] = 255;
    }
    for (const ny of [y - 1, y + 1]) {
      if (ny < 0 || ny >= H) continue;
      let inRun = false;
      for (let px = xl; px <= xr; px += 1) {
        const i = at(px, ny);
        const k = i * 4;
        const fillable =
          !visited[i] && barrier[k + 3] <= 60 && Math.abs(data[k] - tr) + Math.abs(data[k + 1] - tg) + Math.abs(data[k + 2] - tb) <= tol;
        if (fillable && !inRun) {
          stack.push(px, ny);
          inRun = true;
        } else if (!fillable) inRun = false;
      }
    }
  }
  pctx.putImageData(img, 0, 0);
}

/* ---------- UI ---------- */
function pressed(container, el) {
  container.querySelectorAll("[aria-pressed]").forEach((b) => b.setAttribute("aria-pressed", String(b === el)));
}

TOOLS.forEach((t) => {
  const b = document.createElement("button");
  b.className = "tool";
  b.textContent = t.label;
  b.dataset.id = t.id;
  b.setAttribute("aria-pressed", String(t.id === state.tool));
  b.addEventListener("click", () => {
    state.tool = t.id;
    pressed($("tools"), b);
    $("stamps").hidden = t.id !== "stamp";
    paint.style.cursor = t.id === "fill" ? "copy" : "crosshair";
  });
  $("tools").appendChild(b);
});

COLORS.forEach((c, i) => {
  const b = document.createElement("button");
  b.className = "swatch";
  b.style.background = c;
  b.setAttribute("aria-label", `Colour ${i + 1}`);
  b.setAttribute("aria-pressed", String(i === 0));
  b.addEventListener("click", () => {
    state.color = c;
    pressed($("palette"), b);
    if (state.tool === "eraser" || state.tool === "rainbow") selectTool("brush");
  });
  $("palette").appendChild(b);
});
$("custom").addEventListener("input", (e) => {
  state.color = e.target.value;
  $("palette").querySelectorAll(".swatch").forEach((s) => s.setAttribute("aria-pressed", "false"));
  if (state.tool === "eraser" || state.tool === "rainbow") selectTool("brush");
});

function selectTool(id) {
  $("tools").querySelector(`[data-id="${id}"]`).click();
}

STAMPS.forEach((s, i) => {
  const b = document.createElement("button");
  b.className = "stamp";
  b.textContent = s;
  b.setAttribute("aria-label", `Stamp ${s}`);
  b.setAttribute("aria-pressed", String(i === 0));
  b.addEventListener("click", () => {
    state.stamp = s;
    pressed($("stamps"), b);
  });
  $("stamps").appendChild(b);
});

$("sizes").addEventListener("click", (e) => {
  const chip = e.target.closest(".g-chip");
  if (!chip) return;
  state.size = Number(chip.dataset.value);
  pressed($("sizes"), chip);
});

const CATS = [["animals", "🐾 Animals"], ["people", "👦 People"], ["vehicles", "🚀 Vehicles"], ["scenes", "🏡 Scenes"], ["things", "🎨 Things"], ["patterns", "🔯 Patterns"]];
const catOf = (p) => (p.cat === "nature" ? "scenes" : p.cat);
let shownCat = "animals";
function pageButton(id, label) {
  const b = document.createElement("button");
  b.className = "g-chip";
  b.textContent = label;
  b.dataset.page = id;
  b.setAttribute("aria-pressed", String(id === state.page));
  b.addEventListener("click", () => { pressed($("pages"), b); loadPage(id); });
  return b;
}
function renderPages() {
  const box = $("pages");
  box.innerHTML = "";
  box.appendChild(pageButton("blank", "⬜ Blank"));
  Object.entries(PAGES).filter(([, p]) => catOf(p) === shownCat).forEach(([id, p]) => box.appendChild(pageButton(id, p.label)));
  const more = document.createElement("button");
  more.className = "g-chip";
  more.textContent = "🎲 Surprise me";
  more.addEventListener("click", () => {
    const ids = Object.keys(PAGES).filter((k) => k !== "blank" && k !== state.page);
    const id = ids[Math.floor(Math.random() * ids.length)];
    shownCat = catOf(PAGES[id]);
    renderCats();
    renderPages();
    loadPage(id);
  });
  box.appendChild(more);
  const mine = document.createElement("button");
  mine.className = "g-chip";
  mine.textContent = "📷 My own picture";
  mine.addEventListener("click", () => $("photo").click());
  box.appendChild(mine);
}
function renderCats() {
  $("cats").innerHTML = CATS.map(([id, label]) => `<button class="g-chip" data-cat="${id}" aria-pressed="${id === shownCat}">${label}</button>`).join("");
}
$("cats").addEventListener("click", (e) => {
  const b = e.target.closest("[data-cat]");
  if (!b) return;
  shownCat = b.dataset.cat;
  renderCats();
  renderPages();
});
renderCats();
renderPages();

/* ---------- turn any picture into a colouring page: find its edges and draw them as outlines ---------- */
$("photo").addEventListener("change", async (e) => {
  const file = e.target.files && e.target.files[0];
  e.target.value = "";
  if (!file) return;
  let bmp;
  try { bmp = await createImageBitmap(file); } catch (err) { alert("Sorry, that picture could not be opened. Try a JPG or PNG."); return; }
  const tmp = document.createElement("canvas");
  tmp.width = W; tmp.height = H;
  const t = tmp.getContext("2d", { willReadFrequently: true });
  t.fillStyle = "#fff";
  t.fillRect(0, 0, W, H);
  const k = Math.min(W / bmp.width, H / bmp.height);
  const dw = bmp.width * k, dh = bmp.height * k;
  t.drawImage(bmp, (W - dw) / 2, (H - dh) / 2, dw, dh);
  const src = t.getImageData(0, 0, W, H).data;
  const gray = new Float32Array(W * H);
  for (let i = 0; i < W * H; i += 1) gray[i] = 0.299 * src[i * 4] + 0.587 * src[i * 4 + 1] + 0.114 * src[i * 4 + 2];
  // a light blur so tiny speckles do not become lines
  const blur = new Float32Array(W * H);
  for (let y = 1; y < H - 1; y += 1) for (let x = 1; x < W - 1; x += 1) {
    const i = y * W + x;
    blur[i] = (gray[i - W - 1] + gray[i - W] * 2 + gray[i - W + 1] + gray[i - 1] * 2 + gray[i] * 4 + gray[i + 1] * 2 + gray[i + W - 1] + gray[i + W] * 2 + gray[i + W + 1]) / 16;
  }
  const mag = new Float32Array(W * H);
  let sum = 0, sum2 = 0;
  for (let y = 1; y < H - 1; y += 1) for (let x = 1; x < W - 1; x += 1) {
    const i = y * W + x;
    const gx = -blur[i - W - 1] - 2 * blur[i - 1] - blur[i + W - 1] + blur[i - W + 1] + 2 * blur[i + 1] + blur[i + W + 1];
    const gy = -blur[i - W - 1] - 2 * blur[i - W] - blur[i - W + 1] + blur[i + W - 1] + 2 * blur[i + W] + blur[i + W + 1];
    const m = Math.hypot(gx, gy);
    mag[i] = m; sum += m; sum2 += m * m;
  }
  const n = W * H;
  const mean = sum / n;
  const sd = Math.sqrt(Math.max(0, sum2 / n - mean * mean));
  const thr = Math.max(40, mean + 1.1 * sd);
  const edge = new Uint8Array(W * H);
  for (let i = 0; i < n; i += 1) if (mag[i] > thr) edge[i] = 1;
  // thicken by one pixel so the paint bucket cannot leak through gaps
  const out = lctx.createImageData(W, H);
  const ink = [0x2a, 0x1b, 0x13];
  for (let y = 1; y < H - 1; y += 1) for (let x = 1; x < W - 1; x += 1) {
    const i = y * W + x;
    if (edge[i] || edge[i - 1] || edge[i + 1] || edge[i - W] || edge[i + W]) { const k4 = i * 4; out.data[k4] = ink[0]; out.data[k4 + 1] = ink[1]; out.data[k4 + 2] = ink[2]; out.data[k4 + 3] = 255; }
  }
  state.page = "photo";
  lctx.clearRect(0, 0, W, H);
  lctx.putImageData(out, 0, 0);
  pctx.fillStyle = "#ffffff";
  pctx.fillRect(0, 0, W, H);
  snapshot();
  refreshButtons();
  document.querySelectorAll("#pages .g-chip").forEach((c) => c.setAttribute("aria-pressed", "false"));
  $("photoTip").hidden = false;
  selectTool("fill");
});

$("undo").addEventListener("click", undo);
$("redo").addEventListener("click", redo);
$("clear").addEventListener("click", () => {
  pctx.fillStyle = "#ffffff";
  pctx.fillRect(0, 0, W, H);
  snapshot();
});
function pictureCanvas() {
  const out = document.createElement("canvas");
  out.width = W;
  out.height = H;
  const octx = out.getContext("2d");
  octx.drawImage(paint, 0, 0);
  octx.drawImage(lines, 0, 0);
  return out;
}
const pictureName = () => `my-picture-${state.page}.png`;
$("save").addEventListener("click", async () => {
  await download(pictureCanvas(), pictureName());
  $("saveNote").textContent = "Saved to your Downloads.";
});
// phones and tablets: hand the picture to the share sheet so it can go straight into the photo library
if (canSharePhotos()) {
  $("savePhotos").hidden = false;
  $("savePhotos").addEventListener("click", async () => {
    const r = await toPhotos(pictureCanvas(), pictureName());
    $("saveNote").textContent = r === "shared" ? "Done! If you chose Save Image, it is in your Photos." : r === "cancelled" ? "" : "Your browser could not open the share sheet, so the picture was downloaded instead.";
    if (r === "unsupported") await download(pictureCanvas(), pictureName());
  });
}

document.addEventListener("keydown", (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
    e.preventDefault();
    if (e.shiftKey) redo();
    else undo();
  }
});

loadPage("blank");
window.__doodle = { state, floodFill, loadPage, snapshot, pctx, lctx, W, H };
