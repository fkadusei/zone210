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
const poly = (pts) => (c) => {
  c.moveTo(...pts[0]);
  pts.slice(1).forEach((p) => c.lineTo(...p));
  c.closePath();
};

const PAGES = {
  blank: { label: "Blank", draw() {} },
  house: {
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

function loadPage(id) {
  state.page = id;
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

Object.entries(PAGES).forEach(([id, p]) => {
  const b = document.createElement("button");
  b.className = "g-chip";
  b.textContent = p.label;
  b.setAttribute("aria-pressed", String(id === state.page));
  b.addEventListener("click", () => {
    pressed($("pages"), b);
    loadPage(id);
  });
  $("pages").appendChild(b);
});

$("undo").addEventListener("click", undo);
$("redo").addEventListener("click", redo);
$("clear").addEventListener("click", () => {
  pctx.fillStyle = "#ffffff";
  pctx.fillRect(0, 0, W, H);
  snapshot();
});
$("save").addEventListener("click", () => {
  const out = document.createElement("canvas");
  out.width = W;
  out.height = H;
  const octx = out.getContext("2d");
  octx.drawImage(paint, 0, 0);
  octx.drawImage(lines, 0, 0);
  const a = document.createElement("a");
  a.download = `my-picture-${state.page}.png`;
  a.href = out.toDataURL("image/png");
  a.click();
});

document.addEventListener("keydown", (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
    e.preventDefault();
    if (e.shiftKey) redo();
    else undo();
  }
});

loadPage("blank");
window.__doodle = { state, floodFill, loadPage, snapshot, pctx, lctx, W, H };
