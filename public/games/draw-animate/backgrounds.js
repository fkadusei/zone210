// Draw & Animate: the 32 backgrounds. Each is painted by drawBg onto a stage-sized canvas (W by H, from engine.js);
// game.js keeps a painted copy of the ones in use, so a background is only drawn once.

import { W, H } from "./engine.js";

export const BGS = [["paper", "Paper"], ["grid", "Squared paper"], ["lined", "Lined paper"], ["chalk", "Chalkboard"], ["sky", "Sky"], ["meadow", "Meadow"], ["rainbow", "Rainbow"], ["rainy", "Rainy day"],
  ["park", "Park"], ["farm", "Farm"], ["forest", "Forest"], ["jungle", "Jungle"], ["mountains", "Mountains"], ["volcano", "Volcano"], ["desert", "Desert"], ["snow", "Snow"], ["arctic", "Arctic"],
  ["beach", "Beach"], ["island", "Island"], ["sea", "Under the sea"], ["cave", "Cave"], ["road", "Road"], ["city", "City"], ["castle", "Castle"], ["pitch", "Sports pitch"], ["stage", "Stage"],
  ["bedroom", "Bedroom"], ["candy", "Candy land"], ["sunset", "Sunset"], ["night", "Night"], ["moon", "Moon"], ["space", "Space"]];
export const DARK = new Set(["space", "night", "chalk", "sunset", "cave", "moon", "stage", "volcano", "jungle"]); // backgrounds where the outline round a chosen drawing needs to be light

function stars(g, n, seed) { let a = seed; const r = () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; }; g.fillStyle = "#fff"; for (let i = 0; i < n; i += 1) { g.globalAlpha = 0.4 + r() * 0.6; g.beginPath(); g.arc(r() * W, r() * H * 0.85, 0.8 + r() * 1.8, 0, 7); g.fill(); } g.globalAlpha = 1; }
export function drawBg(g, bg) {
  const grad = (stops) => { const q = g.createLinearGradient(0, 0, 0, H); stops.forEach(([o, c]) => q.addColorStop(o, c)); return q; };
  if (bg === "sky") {
    g.fillStyle = grad([[0, "#8fd3ff"], [0.75, "#dff4ff"]]); g.fillRect(0, 0, W, H);
    g.fillStyle = "#7ccf6b"; g.beginPath(); g.moveTo(0, 520); g.quadraticCurveTo(200, 480, 400, 515); g.quadraticCurveTo(620, 550, W, 500); g.lineTo(W, H); g.lineTo(0, H); g.fill();
  } else if (bg === "sea") {
    g.fillStyle = grad([[0, "#5fc3e8"], [0.6, "#2a7fc0"], [1, "#1b4f8f"]]); g.fillRect(0, 0, W, H);
    g.fillStyle = "#e9d49a"; g.beginPath(); g.moveTo(0, 560); g.quadraticCurveTo(250, 520, 480, 556); g.quadraticCurveTo(650, 580, W, 540); g.lineTo(W, H); g.lineTo(0, H); g.fill();
    g.fillStyle = "rgba(255,255,255,0.12)"; [[90, 60], [330, 40], [600, 70]].forEach(([x, w]) => { g.beginPath(); g.moveTo(x, 0); g.lineTo(x + w, 0); g.lineTo(x + w + 110, 520); g.lineTo(x + 70, 520); g.fill(); });
  } else if (bg === "space") {
    g.fillStyle = grad([[0, "#070b22"], [1, "#1a1446"]]); g.fillRect(0, 0, W, H); stars(g, 130, 7);
  } else if (bg === "night") {
    g.fillStyle = grad([[0, "#0c1740"], [1, "#2b3d7a"]]); g.fillRect(0, 0, W, H); stars(g, 70, 21);
    g.fillStyle = "#fdf3c4"; g.beginPath(); g.arc(660, 110, 46, 0, 7); g.fill(); g.fillStyle = "#16224f"; g.beginPath(); g.arc(680, 96, 40, 0, 7); g.fill();
    g.fillStyle = "#14331f"; g.beginPath(); g.moveTo(0, 530); g.quadraticCurveTo(300, 480, 520, 525); g.quadraticCurveTo(680, 555, W, 515); g.lineTo(W, H); g.lineTo(0, H); g.fill();
  } else if (bg === "grid") {
    g.fillStyle = "#fdfefe"; g.fillRect(0, 0, W, H);
    g.strokeStyle = "#cfe3f5"; g.lineWidth = 1; g.beginPath();
    for (let x = 0; x <= W; x += 40) { g.moveTo(x, 0); g.lineTo(x, H); }
    for (let y = 0; y <= H; y += 40) { g.moveTo(0, y); g.lineTo(W, y); }
    g.stroke();
  } else if (bg === "chalk") {
    g.fillStyle = "#6b4a2b"; g.fillRect(0, 0, W, H);
    g.fillStyle = grad([[0, "#2c5a47"], [1, "#22483a"]]); g.fillRect(14, 14, W - 28, H - 28);
    g.fillStyle = "rgba(255,255,255,0.05)"; [[60, 70, 300, 26], [420, 300, 260, 22], [120, 470, 380, 24]].forEach(([x, y, w, h]) => g.fillRect(x, y, w, h));
  } else if (bg === "beach") {
    g.fillStyle = grad([[0, "#8fd3ff"], [0.5, "#d9f1ff"]]); g.fillRect(0, 0, W, H);
    g.fillStyle = "#3fa7d6"; g.fillRect(0, 300, W, 130);
    g.fillStyle = "#63bfe6"; g.fillRect(0, 300, W, 26);
    g.fillStyle = "#f3dfa2"; g.beginPath(); g.moveTo(0, 420); g.quadraticCurveTo(200, 395, 400, 418); g.quadraticCurveTo(620, 445, W, 405); g.lineTo(W, H); g.lineTo(0, H); g.fill();
    g.strokeStyle = "rgba(255,255,255,0.8)"; g.lineWidth = 5; g.beginPath(); g.moveTo(0, 420); g.quadraticCurveTo(200, 395, 400, 418); g.quadraticCurveTo(620, 445, W, 405); g.stroke();
  } else if (bg === "desert") {
    g.fillStyle = grad([[0, "#ffcf8a"], [0.7, "#ffeccb"]]); g.fillRect(0, 0, W, H);
    g.fillStyle = "#eec27c"; g.beginPath(); g.moveTo(0, 430); g.quadraticCurveTo(180, 340, 380, 420); g.quadraticCurveTo(560, 480, W, 380); g.lineTo(W, H); g.lineTo(0, H); g.fill();
    g.fillStyle = "#dca85a"; g.beginPath(); g.moveTo(0, 520); g.quadraticCurveTo(260, 440, 470, 510); g.quadraticCurveTo(650, 560, W, 490); g.lineTo(W, H); g.lineTo(0, H); g.fill();
    g.strokeStyle = "#4f9a5b"; g.lineWidth = 16; g.lineCap = "round"; g.beginPath(); g.moveTo(690, 470); g.lineTo(690, 380); g.moveTo(690, 430); g.lineTo(665, 430); g.lineTo(665, 405); g.moveTo(690, 415); g.lineTo(715, 415); g.lineTo(715, 392); g.stroke(); g.lineCap = "butt";
  } else if (bg === "snow") {
    g.fillStyle = grad([[0, "#bfdcf7"], [0.7, "#eef7ff"]]); g.fillRect(0, 0, W, H);
    g.fillStyle = "#e3eefb"; g.beginPath(); g.moveTo(0, 450); g.quadraticCurveTo(220, 370, 430, 440); g.quadraticCurveTo(620, 500, W, 420); g.lineTo(W, H); g.lineTo(0, H); g.fill();
    g.fillStyle = "#ffffff"; g.beginPath(); g.moveTo(0, 520); g.quadraticCurveTo(250, 470, 480, 525); g.quadraticCurveTo(660, 560, W, 505); g.lineTo(W, H); g.lineTo(0, H); g.fill();
    stars(g, 60, 99);
  } else if (bg === "forest") {
    g.fillStyle = grad([[0, "#bfe6d3"], [0.8, "#eef9f1"]]); g.fillRect(0, 0, W, H);
    const tree = (x, base, h, c) => { g.fillStyle = "#6b4a2b"; g.fillRect(x - 6, base - 14, 12, 26); g.fillStyle = c; for (let k = 0; k < 3; k += 1) { const top = base - h + k * h * 0.26, half = h * (0.2 + k * 0.08); g.beginPath(); g.moveTo(x, top); g.lineTo(x + half, top + h * 0.42); g.lineTo(x - half, top + h * 0.42); g.fill(); } };
    [[70, 150], [190, 190], [330, 160], [470, 200], [610, 165], [735, 185]].forEach(([x, h]) => tree(x, 470, h, "#3f8f5e"));
    g.fillStyle = "#79c56a"; g.beginPath(); g.moveTo(0, 480); g.quadraticCurveTo(300, 450, 520, 482); g.quadraticCurveTo(680, 505, W, 470); g.lineTo(W, H); g.lineTo(0, H); g.fill();
    [[130, 130], [400, 120], [680, 135]].forEach(([x, h]) => tree(x, 560, h, "#2f7a4c"));
  } else if (bg === "mountains") {
    g.fillStyle = grad([[0, "#9fd0ff"], [0.7, "#e4f3ff"]]); g.fillRect(0, 0, W, H);
    const peak = (x, top, half, c) => { g.fillStyle = c; g.beginPath(); g.moveTo(x, top); g.lineTo(x + half, 480); g.lineTo(x - half, 480); g.fill(); g.fillStyle = "#ffffff"; g.beginPath(); g.moveTo(x, top); g.lineTo(x + half * 0.24, top + (480 - top) * 0.24); g.lineTo(x + half * 0.08, top + (480 - top) * 0.19); g.lineTo(x - half * 0.06, top + (480 - top) * 0.26); g.lineTo(x - half * 0.24, top + (480 - top) * 0.24); g.fill(); };
    peak(190, 170, 250, "#8094b8"); peak(600, 140, 280, "#8a9cc0"); peak(400, 220, 230, "#6f84ab");
    g.fillStyle = "#7ccf6b"; g.beginPath(); g.moveTo(0, 480); g.quadraticCurveTo(260, 455, 480, 485); g.quadraticCurveTo(660, 508, W, 470); g.lineTo(W, H); g.lineTo(0, H); g.fill();
  } else if (bg === "road") {
    g.fillStyle = grad([[0, "#8fd3ff"], [0.6, "#dff4ff"]]); g.fillRect(0, 0, W, H);
    g.fillStyle = "#7ccf6b"; g.fillRect(0, 360, W, H - 360);
    g.fillStyle = "#5a5f6b"; g.fillRect(0, 420, W, 120);
    g.fillStyle = "#f4f4f4"; for (let x = 20; x < W; x += 110) g.fillRect(x, 475, 60, 8);
  } else if (bg === "city") {
    g.fillStyle = grad([[0, "#9cc4ff"], [0.75, "#e9f2ff"]]); g.fillRect(0, 0, W, H);
    let a = 5; const r = () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; };
    for (let x = 0; x < W; ) { const w = 60 + Math.floor(r() * 60), h = 150 + Math.floor(r() * 220); g.fillStyle = ["#7c8aa8", "#6a7896", "#8b97b3"][Math.floor(r() * 3)]; g.fillRect(x, 500 - h, w - 6, h); g.fillStyle = "rgba(255,244,190,0.85)"; for (let wy = 500 - h + 16; wy < 480; wy += 30) for (let wx = x + 10; wx < x + w - 22; wx += 22) if (r() < 0.6) g.fillRect(wx, wy, 10, 14); x += w; }
    g.fillStyle = "#5a5f6b"; g.fillRect(0, 500, W, 100);
    g.fillStyle = "#f4f4f4"; for (let x = 20; x < W; x += 110) g.fillRect(x, 546, 60, 8);
  } else if (bg === "sunset") {
    g.fillStyle = grad([[0, "#3b2a6b"], [0.45, "#d9577a"], [0.75, "#ffb35c"]]); g.fillRect(0, 0, W, H);
    g.fillStyle = "#ffe08a"; g.beginPath(); g.arc(400, 470, 80, Math.PI, 0); g.fill();
    g.fillStyle = "#2a1f45"; g.beginPath(); g.moveTo(0, 470); g.quadraticCurveTo(220, 440, 420, 470); g.quadraticCurveTo(640, 498, W, 462); g.lineTo(W, H); g.lineTo(0, H); g.fill();
  } else if (bg === "lined") {
    g.fillStyle = "#fdfefe"; g.fillRect(0, 0, W, H);
    g.strokeStyle = "#bcd6f0"; g.lineWidth = 1.5; g.beginPath(); for (let y = 60; y < H; y += 40) { g.moveTo(0, y); g.lineTo(W, y); } g.stroke();
    g.strokeStyle = "#f0a3a3"; g.beginPath(); g.moveTo(70, 0); g.lineTo(70, H); g.stroke();
  } else if (bg === "meadow") {
    g.fillStyle = grad([[0, "#8fd3ff"], [0.7, "#e6f6ff"]]); g.fillRect(0, 0, W, H);
    g.fillStyle = "#93d67a"; g.beginPath(); g.moveTo(0, 400); g.quadraticCurveTo(230, 330, 460, 390); g.quadraticCurveTo(640, 430, W, 370); g.lineTo(W, H); g.lineTo(0, H); g.fill();
    g.fillStyle = "#74c463"; g.beginPath(); g.moveTo(0, 470); g.quadraticCurveTo(280, 420, 520, 475); g.quadraticCurveTo(680, 505, W, 455); g.lineTo(W, H); g.lineTo(0, H); g.fill();
    let a = 11; const r = () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; };
    for (let i = 0; i < 46; i += 1) { const x = r() * W, y = 470 + r() * 120; g.fillStyle = ["#ffffff", "#ffd84d", "#ff8fb1", "#c79bff"][Math.floor(r() * 4)]; g.beginPath(); g.arc(x, y, 4 + r() * 3, 0, 7); g.fill(); g.fillStyle = "#f5a623"; g.beginPath(); g.arc(x, y, 1.6, 0, 7); g.fill(); }
  } else if (bg === "rainbow") {
    g.fillStyle = grad([[0, "#9bd8ff"], [0.75, "#e8f7ff"]]); g.fillRect(0, 0, W, H);
    ["#e5484d", "#f5a623", "#f5d90a", "#2fb36d", "#3b82f6", "#5b5bd6", "#8a5ce0"].forEach((c, i) => { g.strokeStyle = c; g.lineWidth = 18; g.beginPath(); g.arc(400, 520, 360 - i * 18, Math.PI, 0); g.stroke(); });
    g.fillStyle = "#7ccf6b"; g.beginPath(); g.moveTo(0, 500); g.quadraticCurveTo(220, 455, 420, 495); g.quadraticCurveTo(640, 535, W, 480); g.lineTo(W, H); g.lineTo(0, H); g.fill();
    g.fillStyle = "#ffffff"; [[70, 470], [730, 455]].forEach(([x, y]) => { [[-34, 8, 30], [0, -8, 38], [36, 8, 30]].forEach(([dx, dy, rr]) => { g.beginPath(); g.arc(x + dx, y + dy, rr, 0, 7); g.fill(); }); });
  } else if (bg === "rainy") {
    g.fillStyle = grad([[0, "#7f8ea3"], [0.7, "#b8c4d3"]]); g.fillRect(0, 0, W, H);
    g.fillStyle = "#66758b"; [[120, 80], [380, 60], [640, 90]].forEach(([x, y]) => { [[-60, 10, 44], [-10, -12, 58], [50, 8, 46]].forEach(([dx, dy, rr]) => { g.beginPath(); g.arc(x + dx, y + dy, rr, 0, 7); g.fill(); }); });
    let a = 3; const r = () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; };
    g.strokeStyle = "rgba(255,255,255,0.45)"; g.lineWidth = 2; g.beginPath(); for (let i = 0; i < 120; i += 1) { const x = r() * W, y = 110 + r() * 380; g.moveTo(x, y); g.lineTo(x - 6, y + 18); } g.stroke();
    g.fillStyle = "#6f8f6a"; g.fillRect(0, 500, W, 100);
    g.fillStyle = "rgba(170,200,225,0.75)"; [[180, 548, 90, 14], [560, 565, 120, 16]].forEach(([x, y, w, h]) => { g.beginPath(); g.ellipse(x, y, w, h, 0, 0, 7); g.fill(); });
  } else if (bg === "park") {
    g.fillStyle = grad([[0, "#8fd3ff"], [0.65, "#e2f5ff"]]); g.fillRect(0, 0, W, H);
    g.fillStyle = "#86cf70"; g.fillRect(0, 380, W, 220);
    g.fillStyle = "#e8d3a2"; g.beginPath(); g.moveTo(300, H); g.quadraticCurveTo(360, 470, 520, 380); g.lineTo(560, 380); g.quadraticCurveTo(440, 480, 440, H); g.fill();
    g.fillStyle = "#6fc3ea"; g.beginPath(); g.ellipse(650, 500, 110, 38, 0, 0, 7); g.fill();
    [[120, 380, 1], [250, 372, 0.8], [700, 376, 0.9]].forEach(([x, y, k]) => { g.fillStyle = "#7a5230"; g.fillRect(x - 9 * k, y - 70 * k, 18 * k, 80 * k); g.fillStyle = "#3f9b57"; [[0, -120, 58], [-36, -90, 42], [36, -90, 42]].forEach(([dx, dy, rr]) => { g.beginPath(); g.arc(x + dx * k, y + dy * k, rr * k, 0, 7); g.fill(); }); });
  } else if (bg === "farm") {
    g.fillStyle = grad([[0, "#8fd3ff"], [0.6, "#e2f5ff"]]); g.fillRect(0, 0, W, H);
    g.fillStyle = "#8fd06f"; g.fillRect(0, 360, W, 240);
    g.fillStyle = "#e9cf63"; for (let i = 0; i < 5; i += 1) { g.beginPath(); g.moveTo(380 + i * 90, 600); g.lineTo(440 + i * 90, 600); g.lineTo(470 + i * 46, 430); g.lineTo(445 + i * 46, 430); g.fill(); }
    g.fillStyle = "#c0392b"; g.fillRect(90, 250, 200, 150); g.beginPath(); g.moveTo(70, 252); g.lineTo(190, 170); g.lineTo(310, 252); g.fill();
    g.fillStyle = "#ffffff"; g.fillRect(160, 320, 60, 80); g.strokeStyle = "#c0392b"; g.lineWidth = 5; g.beginPath(); g.moveTo(160, 320); g.lineTo(220, 400); g.moveTo(220, 320); g.lineTo(160, 400); g.stroke();
    g.strokeStyle = "#8b6a3d"; g.lineWidth = 6; g.beginPath(); g.moveTo(0, 420); g.lineTo(W, 420); g.moveTo(0, 445); g.lineTo(W, 445); for (let x = 20; x < W; x += 70) { g.moveTo(x, 405); g.lineTo(x, 462); } g.stroke();
  } else if (bg === "jungle") {
    g.fillStyle = grad([[0, "#1f6b4a"], [1, "#0f3f2c"]]); g.fillRect(0, 0, W, H);
    g.fillStyle = "rgba(190,255,170,0.12)"; [[150, 70], [420, 50], [650, 80]].forEach(([x, w]) => { g.beginPath(); g.moveTo(x, 0); g.lineTo(x + w, 0); g.lineTo(x + w + 90, 600); g.lineTo(x + 50, 600); g.fill(); });
    const leaf = (x, y, len, ang, c) => { g.save(); g.translate(x, y); g.rotate(ang); g.fillStyle = c; g.beginPath(); g.ellipse(len / 2, 0, len / 2, len / 6, 0, 0, 7); g.fill(); g.restore(); };
    [[0, 90, 230, 0.5], [0, 220, 200, 0.2], [0, 20, 190, 0.9], [W, 100, 230, 2.6], [W, 240, 200, 2.95], [W, 20, 190, 2.25]].forEach(([x, y, l, ang], i) => leaf(x, y, l, ang, i % 2 ? "#2f9a5c" : "#37ad69"));
    g.strokeStyle = "#2b7a4b"; g.lineWidth = 6; g.beginPath(); g.moveTo(300, 0); g.quadraticCurveTo(250, 120, 320, 210); g.moveTo(540, 0); g.quadraticCurveTo(600, 100, 520, 180); g.stroke();
    g.fillStyle = "#1a5a3a"; g.beginPath(); g.moveTo(0, 520); g.quadraticCurveTo(260, 480, 480, 520); g.quadraticCurveTo(660, 548, W, 505); g.lineTo(W, H); g.lineTo(0, H); g.fill();
  } else if (bg === "volcano") {
    g.fillStyle = grad([[0, "#3a1d3f"], [0.5, "#b8433b"], [0.8, "#f4a04a"]]); g.fillRect(0, 0, W, H);
    g.fillStyle = "#3b2b33"; g.beginPath(); g.moveTo(120, 500); g.lineTo(340, 170); g.lineTo(460, 170); g.lineTo(700, 500); g.fill();
    g.fillStyle = "#ff7a1a"; g.beginPath(); g.moveTo(340, 170); g.lineTo(460, 170); g.lineTo(445, 200); g.lineTo(420, 185); g.lineTo(400, 215); g.lineTo(378, 188); g.lineTo(355, 205); g.fill();
    g.strokeStyle = "#ff9a2e"; g.lineWidth = 9; g.lineCap = "round"; g.beginPath(); g.moveTo(385, 200); g.quadraticCurveTo(350, 300, 300, 400); g.moveTo(425, 200); g.quadraticCurveTo(470, 310, 500, 380); g.stroke(); g.lineCap = "butt";
    g.fillStyle = "rgba(90,80,90,0.55)"; [[400, 110, 46], [450, 70, 38], [370, 60, 30]].forEach(([x, y, rr]) => { g.beginPath(); g.arc(x, y, rr, 0, 7); g.fill(); });
    g.fillStyle = "#2a1f26"; g.beginPath(); g.moveTo(0, 500); g.quadraticCurveTo(260, 470, 470, 500); g.quadraticCurveTo(650, 525, W, 485); g.lineTo(W, H); g.lineTo(0, H); g.fill();
  } else if (bg === "arctic") {
    g.fillStyle = grad([[0, "#b9dcf5"], [0.6, "#eaf6ff"]]); g.fillRect(0, 0, W, H);
    g.fillStyle = "#2f6f9f"; g.fillRect(0, 330, W, 270);
    const berg = (x, y, w, h) => { g.fillStyle = "#f4fbff"; g.beginPath(); g.moveTo(x, y); g.lineTo(x + w * 0.25, y - h); g.lineTo(x + w * 0.5, y - h * 0.6); g.lineTo(x + w * 0.7, y - h * 0.9); g.lineTo(x + w, y); g.fill(); g.fillStyle = "#cfe6f5"; g.beginPath(); g.moveTo(x + w * 0.5, y - h * 0.6); g.lineTo(x + w * 0.7, y - h * 0.9); g.lineTo(x + w, y); g.lineTo(x + w * 0.6, y); g.fill(); };
    berg(60, 340, 240, 150); berg(420, 345, 300, 190); berg(300, 338, 130, 70);
    g.fillStyle = "#f4fbff"; g.beginPath(); g.moveTo(0, 470); g.quadraticCurveTo(200, 440, 420, 475); g.quadraticCurveTo(620, 505, W, 460); g.lineTo(W, H); g.lineTo(0, H); g.fill();
  } else if (bg === "island") {
    g.fillStyle = grad([[0, "#8fd3ff"], [0.55, "#dff4ff"]]); g.fillRect(0, 0, W, H);
    g.fillStyle = "#ffe27a"; g.beginPath(); g.arc(660, 110, 48, 0, 7); g.fill();
    g.fillStyle = "#2f95c9"; g.fillRect(0, 340, W, 260);
    g.fillStyle = "#49acd8"; g.fillRect(0, 340, W, 20);
    g.fillStyle = "#f1dc9c"; g.beginPath(); g.ellipse(360, 392, 190, 44, 0, Math.PI, 0); g.fill(); g.fillRect(170, 390, 380, 6);
    g.strokeStyle = "#8b5a2b"; g.lineWidth = 14; g.lineCap = "round"; g.beginPath(); g.moveTo(330, 370); g.quadraticCurveTo(350, 280, 320, 200); g.stroke(); g.lineCap = "butt";
    g.fillStyle = "#3fa55b"; [[-1.2, 100], [-0.5, 110], [0.2, 105], [2.6, 100], [3.4, 110], [4.1, 95]].forEach(([ang, len]) => { g.save(); g.translate(320, 200); g.rotate(ang); g.beginPath(); g.ellipse(len / 2, 0, len / 2, 13, 0, 0, 7); g.fill(); g.restore(); });
    g.strokeStyle = "rgba(255,255,255,0.6)"; g.lineWidth = 3; g.beginPath(); [[90, 470], [520, 500], [300, 545], [650, 440]].forEach(([x, y]) => { g.moveTo(x, y); g.quadraticCurveTo(x + 22, y - 10, x + 44, y); }); g.stroke();
  } else if (bg === "cave") {
    g.fillStyle = grad([[0, "#2a2530"], [1, "#3b3440"]]); g.fillRect(0, 0, W, H);
    const glow = g.createRadialGradient(400, 300, 20, 400, 300, 330); glow.addColorStop(0, "rgba(255,225,170,0.38)"); glow.addColorStop(1, "rgba(255,225,170,0)"); g.fillStyle = glow; g.fillRect(0, 0, W, H);
    g.fillStyle = "#1c1820"; [[40, 150], [150, 90], [250, 190], [380, 110], [500, 170], [620, 80], [730, 140]].forEach(([x, h]) => { g.beginPath(); g.moveTo(x - 46, 0); g.lineTo(x, h); g.lineTo(x + 46, 0); g.fill(); });
    [[90, 110], [230, 70], [360, 130], [520, 90], [690, 120]].forEach(([x, h]) => { g.beginPath(); g.moveTo(x - 50, H); g.lineTo(x, H - h); g.lineTo(x + 50, H); g.fill(); });
    g.fillStyle = "#241f29"; g.fillRect(0, 540, W, 60);
  } else if (bg === "castle") {
    g.fillStyle = grad([[0, "#8fd3ff"], [0.7, "#e6f6ff"]]); g.fillRect(0, 0, W, H);
    g.fillStyle = "#86cf70"; g.beginPath(); g.moveTo(0, 470); g.quadraticCurveTo(400, 380, W, 470); g.lineTo(W, H); g.lineTo(0, H); g.fill();
    const tower = (x, top, w) => { g.fillStyle = "#aab2c2"; g.fillRect(x, top, w, 440 - top); for (let k = 0; k < 3; k += 1) g.fillRect(x - 4 + k * ((w + 8) / 3 + 1), top - 16, (w + 8) / 3 - 6, 18); g.fillStyle = "#c44b5a"; g.beginPath(); g.moveTo(x - 10, top - 16); g.lineTo(x + w / 2, top - 90); g.lineTo(x + w + 10, top - 16); g.fill(); g.fillStyle = "#3d4660"; g.fillRect(x + w / 2 - 7, top + 30, 14, 26); };
    g.fillStyle = "#bfc6d4"; g.fillRect(280, 280, 240, 160); for (let x = 280; x < 520; x += 40) g.fillRect(x, 262, 26, 20);
    tower(230, 220, 70); tower(500, 220, 70); tower(365, 170, 70);
    g.fillStyle = "#5b3a22"; g.beginPath(); g.moveTo(370, 440); g.lineTo(370, 380); g.arc(400, 380, 30, Math.PI, 0); g.lineTo(430, 440); g.fill();
  } else if (bg === "pitch") {
    for (let i = 0; i < 8; i += 1) { g.fillStyle = i % 2 ? "#57b45a" : "#63c266"; g.fillRect(i * 100, 0, 100, H); }
    g.strokeStyle = "#ffffff"; g.lineWidth = 5; g.strokeRect(30, 30, W - 60, H - 60);
    g.beginPath(); g.moveTo(400, 30); g.lineTo(400, H - 30); g.stroke(); g.beginPath(); g.arc(400, 300, 80, 0, 7); g.stroke();
    g.strokeRect(30, 180, 110, 240); g.strokeRect(W - 140, 180, 110, 240);
    g.fillStyle = "#ffffff"; g.beginPath(); g.arc(400, 300, 6, 0, 7); g.fill();
  } else if (bg === "stage") {
    g.fillStyle = "#231a2c"; g.fillRect(0, 0, W, H);
    const spot = g.createRadialGradient(400, 330, 30, 400, 330, 300); spot.addColorStop(0, "rgba(255,240,200,0.4)"); spot.addColorStop(1, "rgba(255,240,200,0)"); g.fillStyle = spot; g.fillRect(0, 0, W, H);
    g.fillStyle = "#8a5a33"; g.fillRect(0, 470, W, 130); g.strokeStyle = "#6f4627"; g.lineWidth = 2; g.beginPath(); for (let y = 496; y < H; y += 26) { g.moveTo(0, y); g.lineTo(W, y); } g.stroke();
    const curtain = (x0, x1) => { const q = g.createLinearGradient(x0, 0, x1, 0); for (let k = 0; k <= 6; k += 1) q.addColorStop(k / 6, k % 2 ? "#8f1f2c" : "#c22e3f"); g.fillStyle = q; g.fillRect(Math.min(x0, x1), 0, Math.abs(x1 - x0), 500); };
    curtain(0, 130); curtain(W, W - 130);
    g.fillStyle = "#a82636"; g.fillRect(0, 0, W, 60); g.fillStyle = "#e0b33c"; for (let x = 0; x < W; x += 40) { g.beginPath(); g.arc(x + 20, 60, 20, 0, Math.PI); g.fill(); }
  } else if (bg === "bedroom") {
    g.fillStyle = "#cfe3f7"; g.fillRect(0, 0, W, 430);
    g.fillStyle = "#b98a5a"; g.fillRect(0, 430, W, 170); g.strokeStyle = "#a47646"; g.lineWidth = 2; g.beginPath(); for (let y = 460; y < H; y += 30) { g.moveTo(0, y); g.lineTo(W, y); } g.stroke();
    g.fillStyle = "#ffffff"; g.fillRect(0, 418, W, 14);
    g.fillStyle = "#ffffff"; g.fillRect(510, 90, 210, 200); g.fillStyle = grad([[0, "#8fd3ff"], [0.5, "#dff4ff"]]); g.fillRect(522, 102, 186, 176);
    g.strokeStyle = "#ffffff"; g.lineWidth = 8; g.beginPath(); g.moveTo(615, 102); g.lineTo(615, 278); g.moveTo(522, 190); g.lineTo(708, 190); g.stroke();
    g.fillStyle = "#f2a7b8"; g.beginPath(); g.ellipse(360, 520, 230, 52, 0, 0, 7); g.fill(); g.fillStyle = "#f8c9d4"; g.beginPath(); g.ellipse(360, 520, 170, 34, 0, 0, 7); g.fill();
    g.fillStyle = "#f5d90a"; [[90, 120], [170, 200], [290, 100], [380, 220]].forEach(([x, y]) => { g.beginPath(); for (let k = 0; k < 5; k += 1) { const a1 = -Math.PI / 2 + (k * 2 * Math.PI) / 5, a2 = a1 + Math.PI / 5; g.lineTo(x + Math.cos(a1) * 14, y + Math.sin(a1) * 14); g.lineTo(x + Math.cos(a2) * 6, y + Math.sin(a2) * 6); } g.fill(); });
  } else if (bg === "candy") {
    g.fillStyle = grad([[0, "#ffd1e8"], [0.7, "#fff0f7"]]); g.fillRect(0, 0, W, H);
    g.fillStyle = "#b9e6ff"; g.beginPath(); g.moveTo(0, 430); g.quadraticCurveTo(200, 340, 400, 430); g.lineTo(400, H); g.lineTo(0, H); g.fill();
    g.fillStyle = "#c9f2c7"; g.beginPath(); g.moveTo(330, 440); g.quadraticCurveTo(580, 330, W, 440); g.lineTo(W, H); g.lineTo(330, H); g.fill();
    g.fillStyle = "#fff6c9"; g.beginPath(); g.moveTo(0, 510); g.quadraticCurveTo(300, 470, 520, 512); g.quadraticCurveTo(680, 540, W, 500); g.lineTo(W, H); g.lineTo(0, H); g.fill();
    const lolly = (x, y, rr, c1, c2) => { g.strokeStyle = "#ffffff"; g.lineWidth = 8; g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + rr * 2.6); g.stroke(); g.fillStyle = c1; g.beginPath(); g.arc(x, y, rr, 0, 7); g.fill(); g.strokeStyle = c2; g.lineWidth = 6; g.beginPath(); for (let k = 0; k < 40; k += 1) { const a1 = k * 0.42, d = (k / 40) * (rr - 5); g.lineTo(x + Math.cos(a1) * d, y + Math.sin(a1) * d); } g.stroke(); };
    lolly(120, 300, 44, "#ff8fb1", "#ffffff"); lolly(660, 280, 52, "#8fd3ff", "#ffffff"); lolly(420, 340, 34, "#c79bff", "#ffffff");
    let a = 17; const r = () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; };
    for (let i = 0; i < 40; i += 1) { g.fillStyle = ["#ff6b8a", "#4db6ff", "#ffcf3f", "#6fd08c"][Math.floor(r() * 4)]; g.save(); g.translate(r() * W, 520 + r() * 70); g.rotate(r() * 3); g.fillRect(-7, -2.5, 14, 5); g.restore(); }
  } else if (bg === "moon") {
    g.fillStyle = "#05060f"; g.fillRect(0, 0, W, H); stars(g, 150, 31);
    g.fillStyle = "#3f8fd6"; g.beginPath(); g.arc(640, 130, 56, 0, 7); g.fill(); g.fillStyle = "#58b06a"; [[620, 115, 20, 12], [655, 150, 18, 10], [660, 105, 10, 7]].forEach(([x, y, w, h]) => { g.beginPath(); g.ellipse(x, y, w, h, 0.4, 0, 7); g.fill(); });
    g.fillStyle = "#b9bcc6"; g.beginPath(); g.moveTo(0, 430); g.quadraticCurveTo(260, 380, 500, 425); g.quadraticCurveTo(680, 455, W, 410); g.lineTo(W, H); g.lineTo(0, H); g.fill();
    [[150, 500, 60, 16], [420, 540, 90, 20], [640, 490, 50, 13], [300, 460, 36, 9], [720, 560, 44, 11]].forEach(([x, y, w, h]) => { g.fillStyle = "#8f93a0"; g.beginPath(); g.ellipse(x, y, w, h, 0, 0, 7); g.fill(); g.fillStyle = "#a4a8b4"; g.beginPath(); g.ellipse(x, y + 3, w * 0.86, h * 0.7, 0, 0, 7); g.fill(); });
  } else { g.fillStyle = "#fffdf6"; g.fillRect(0, 0, W, H); }
}
