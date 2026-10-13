// Draw & Animate: the 74 backgrounds. Each is painted by drawBg onto a stage-sized canvas (W by H, from engine.js);
// game.js keeps a painted copy of the ones in use, so a background is only drawn once.

import { W, H } from "./engine.js";

export const BGS = [["paper", "Paper"], ["grid", "Squared paper"], ["lined", "Lined paper"], ["chalk", "Chalkboard"], ["sky", "Sky"], ["meadow", "Meadow"], ["rainbow", "Rainbow"], ["rainy", "Rainy day"],
  ["park", "Park"], ["farm", "Farm"], ["forest", "Forest"], ["jungle", "Jungle"], ["mountains", "Mountains"], ["volcano", "Volcano"], ["desert", "Desert"], ["snow", "Snow"], ["arctic", "Arctic"],
  ["beach", "Beach"], ["island", "Island"], ["sea", "Under the sea"], ["cave", "Cave"], ["road", "Road"], ["city", "City"], ["castle", "Castle"], ["pitch", "Sports pitch"], ["stage", "Stage"],
  ["harbor", "Harbor"], ["ocean", "Open sea"], ["lake", "Lake"], ["river", "River"], ["waterfall", "Waterfall"], ["canyon", "Canyon"], ["savanna", "Savanna"], ["autumn", "Autumn"], ["blossom", "Blossom"], ["garden", "Garden"],
  ["clouds", "Above the clouds"], ["railway", "Railway"], ["street", "Street"], ["citynight", "City at night"], ["playground", "Playground"], ["classroom", "Classroom"], ["kitchen", "Kitchen"], ["livingroom", "Living room"], ["circus", "Circus"], ["haunted", "Haunted house"],
  ["eiffel", "Eiffel Tower"], ["london", "Big Ben"], ["colosseum", "Colosseum"], ["pisa", "Leaning Tower of Pisa"], ["parthenon", "Parthenon"], ["stonehenge", "Stonehenge"], ["windmills", "Windmills and tulips"],
  ["pyramids", "Pyramids"], ["kilimanjaro", "Kilimanjaro"], ["tablemountain", "Table Mountain"], ["dubai", "Dubai"], ["tajmahal", "Taj Mahal"], ["greatwall", "Great Wall"], ["fuji", "Mount Fuji"], ["angkor", "Angkor Wat"],
  ["sydney", "Sydney Opera House"], ["moai", "Easter Island"], ["liberty", "Statue of Liberty"], ["goldengate", "Golden Gate Bridge"], ["chichenitza", "Chichen Itza"], ["machupicchu", "Machu Picchu"], ["rio", "Rio de Janeiro"],
  ["bedroom", "Bedroom"], ["candy", "Candy land"], ["sunset", "Sunset"], ["night", "Night"], ["moon", "Moon"], ["space", "Space"]];
export const DARK = new Set(["space", "night", "chalk", "sunset", "cave", "moon", "stage", "volcano", "jungle", "citynight", "haunted", "circus", "angkor"]); // backgrounds where the outline round a chosen drawing needs to be light

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
  } else if (!more(g, bg)) { g.fillStyle = "#fffdf6"; g.fillRect(0, 0, W, H); }
}

// ---------- more backgrounds (drawn with a few shared pieces: clouds, trees, a sun, the ground) ----------
function more(g, bg) {
  const grad = (stops, y0 = 0, y1 = H) => { const q = g.createLinearGradient(0, y0, 0, y1); stops.forEach(([o, c]) => q.addColorStop(o, c)); return q; };
  const rect = (c, x, y, w, h) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
  const oval = (c, x, y, rx, ry = rx, t = 0) => { g.fillStyle = c; g.beginPath(); g.ellipse(x, y, rx, ry, t, 0, 7); g.fill(); };
  const poly = (c, pts) => { g.fillStyle = c; g.beginPath(); g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.closePath(); g.fill(); };
  const line = (c, w, pts) => { g.strokeStyle = c; g.lineWidth = w; g.lineCap = "round"; g.lineJoin = "round"; g.beginPath(); g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.stroke(); };
  const sky = (top = "#8fd3ff", low = "#e2f5ff", to = H) => rect(grad([[0, top], [1, low]], 0, to), 0, 0, W, to);
  const ground = (c, y, dip = 0) => { g.fillStyle = c; g.beginPath(); g.moveTo(0, y); g.quadraticCurveTo(W * 0.3, y - 26 + dip, W * 0.6, y + 6); g.quadraticCurveTo(W * 0.85, y + 24, W, y - 8); g.lineTo(W, H); g.lineTo(0, H); g.fill(); };
  const cloud = (x, y, k = 1, c = "#ffffff") => { [[0, 0, 34], [-34, 10, 24], [34, 10, 26], [0, 16, 30]].forEach(([dx, dy, r]) => oval(c, x + dx * k, y + dy * k, r * k, r * k * 0.8)); };
  const sun = (x, y, r, c = "#ffd84d") => { oval("rgba(255,216,77,0.25)", x, y, r * 1.6); oval(c, x, y, r); };
  const tree = (x, y, k, leaf = "#3f9b57", trunk = "#7a5230") => { rect(trunk, x - 9 * k, y - 70 * k, 18 * k, 80 * k); [[0, -120, 58], [-36, -90, 42], [36, -90, 42]].forEach(([dx, dy, r]) => oval(leaf, x + dx * k, y + dy * k, r * k)); };
  const pine = (x, y, k, c = "#2f7d4f") => { rect("#7a5230", x - 6 * k, y - 20 * k, 12 * k, 26 * k); [[0, 60], [-30, 46], [-58, 34]].forEach(([dy, w]) => poly(c, [x - w * k, y - 20 * k + dy * k, x + w * k, y - 20 * k + dy * k, x, y - 96 * k + dy * k])); };
  let seed = 7; const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };

  if (bg === "autumn") {
    sky("#f7c98b", "#fdebd0"); sun(650, 110, 44, "#ffb347"); ground("#c98a3c", 420);
    [[110, 420, 1.1, "#d9622b"], [270, 410, 0.85, "#e8a13a"], [520, 414, 0.95, "#c0392b"], [700, 424, 1.15, "#e07b39"]].forEach(([x, y, k, c]) => tree(x, y, k, c, "#5b3a1c"));
    for (let i = 0; i < 46; i += 1) oval(["#d9622b", "#e8a13a", "#c0392b", "#f2c14e"][i % 4], rnd() * W, 440 + rnd() * 150, 7, 4, rnd() * 3);
  } else if (bg === "blossom") {
    sky("#bfe3ff", "#fdeef4"); ground("#9bd88a", 430); cloud(160, 100, 1.1); cloud(560, 70, 0.9);
    [[130, 430, 1.1], [330, 420, 0.8], [600, 426, 1.2]].forEach(([x, y, k]) => { tree(x, y, k, "#f7a8c9", "#6b4226"); [[-20, -130], [26, -100], [-40, -84], [8, -150]].forEach(([dx, dy]) => oval("#fbd0e0", x + dx * k, y + dy * k, 14 * k)); });
    for (let i = 0; i < 60; i += 1) oval(i % 3 ? "#f9c1d6" : "#ffffff", rnd() * W, 60 + rnd() * 520, 4, 2.5, rnd() * 3);
  } else if (bg === "savanna") {
    sky("#ffb866", "#ffe6b3"); sun(400, 330, 70, "#ff8a3d"); ground("#d9b25f", 400, 20);
    [[140, 400, 1], [610, 392, 1.25]].forEach(([x, y, k]) => { line("#4a3520", 12 * k, [x, y, x + 6 * k, y - 80 * k]); line("#4a3520", 7 * k, [x + 6 * k, y - 80 * k, x - 40 * k, y - 120 * k]); line("#4a3520", 7 * k, [x + 6 * k, y - 80 * k, x + 50 * k, y - 124 * k]); oval("#5f7a2e", x + 4 * k, y - 132 * k, 90 * k, 22 * k); oval("#6f8d36", x - 20 * k, y - 142 * k, 50 * k, 14 * k); });
    for (let i = 0; i < 30; i += 1) { const x = rnd() * W, y = 420 + rnd() * 170; line("#b8923f", 2, [x, y, x - 4, y - 14]); line("#b8923f", 2, [x, y, x + 5, y - 12]); }
  } else if (bg === "lake") {
    sky(); poly("#8fa6c9", [0, 330, 160, 170, 300, 330]); poly("#7d95bb", [200, 330, 420, 130, 640, 330]); poly("#93abd0", [520, 330, 700, 190, W, 330]); poly("#ffffff", [420, 130, 385, 162, 410, 158, 425, 172, 448, 156]);
    rect(grad([[0, "#6fb9e6"], [1, "#3f8fc7"]], 320, 470), 0, 320, W, 150); for (let i = 0; i < 14; i += 1) { const x = rnd() * W, y = 340 + rnd() * 110; line("rgba(255,255,255,0.45)", 2, [x, y, x + 30 + rnd() * 30, y]); }
    ground("#7ccf6b", 470); pine(90, 470, 1.2); pine(170, 480, 0.9); pine(720, 474, 1.1);
  } else if (bg === "waterfall") {
    sky("#9bd9ff", "#e6f7ff"); rect("#6b7f5a", 0, 120, 300, 380); rect("#62745a", 500, 120, 300, 380); poly("#58a05a", [0, 120, 300, 120, 300, 150, 0, 170]); poly("#58a05a", [500, 120, W, 120, W, 170, 500, 150]);
    rect(grad([[0, "#dff4ff"], [1, "#8fd3ff"]], 120, 470), 300, 120, 200, 360); for (let x = 316; x < 500; x += 22) line("rgba(255,255,255,0.7)", 3, [x, 130, x + 4, 460]);
    rect("#6fb9e6", 0, 470, W, 130); for (let i = 0; i < 9; i += 1) oval("rgba(255,255,255,0.8)", 300 + i * 25, 474 + (i % 2) * 8, 26, 14);
    [[60, 190], [220, 240], [560, 210], [720, 260]].forEach(([x, y]) => oval("#4a8f4f", x, y, 46, 22));
  } else if (bg === "canyon") {
    sky("#ffd9a0", "#fff1d6"); sun(130, 100, 40, "#ffb347");
    [["#d98b5a", [0, 300, 0, 180, 120, 180, 150, 240, 250, 240, 250, 300]], ["#c9764a", [520, 300, 560, 160, 700, 160, 720, 220, W, 220, W, 300]], ["#e0a070", [260, 300, 300, 220, 420, 220, 450, 300]]].forEach(([c, p]) => poly(c, p));
    for (const y of [200, 230, 260]) { line("rgba(0,0,0,0.12)", 3, [0, y, 240, y + 10]); line("rgba(0,0,0,0.12)", 3, [540, y, W, y + 12]); }
    rect(grad([[0, "#e8b07a"], [1, "#d49560"]], 300, H), 0, 300, W, 300); g.fillStyle = "#b9703f"; g.beginPath(); g.moveTo(330, 300); g.quadraticCurveTo(300, 420, 200, H); g.lineTo(440, H); g.quadraticCurveTo(430, 420, 400, 300); g.fill();
    [[90, 470], [650, 440], [720, 540]].forEach(([x, y]) => { rect("#4f9d55", x - 8, y - 70, 16, 70); line("#4f9d55", 12, [x - 22, y - 30, x - 22, y - 50, x, y - 50]); line("#4f9d55", 12, [x + 22, y - 20, x + 22, y - 44, x, y - 44]); });
  } else if (bg === "river") {
    sky(); cloud(140, 90); cloud(600, 120, 0.8); ground("#86cf70", 360);
    g.fillStyle = "#5fb3e6"; g.beginPath(); g.moveTo(330, 360); g.bezierCurveTo(260, 440, 520, 480, 380, H); g.lineTo(620, H); g.bezierCurveTo(700, 480, 440, 440, 470, 360); g.fill();
    line("#8b5a2b", 16, [250, 470, 610, 470]); for (let x = 262; x < 610; x += 28) line("#a9743f", 10, [x, 462, x, 478]); line("#6b4226", 6, [250, 440, 610, 440]); for (const x of [250, 370, 490, 610]) line("#6b4226", 6, [x, 440, x, 472]);
    tree(110, 370, 0.9); tree(710, 366, 1); for (let i = 0; i < 10; i += 1) { const x = rnd() * W, y = 380 + rnd() * 200; if (x < 240 || x > 650) { oval(["#ff6b8a", "#ffd84d", "#ffffff"][i % 3], x, y, 6); oval("#ffb347", x, y, 2.5); } }
  } else if (bg === "railway") {
    sky(); cloud(200, 80, 1.1); poly("#9cc38a", [0, 330, 200, 240, 420, 330]); poly("#8dba7c", [330, 330, 600, 220, W, 330]); ground("#7ccf6b", 330);
    poly("#b7a58c", [330, 330, 470, 330, 760, H, 40, H]); line("#6b6b6b", 6, [352, 330, 120, H]); line("#6b6b6b", 6, [448, 330, 680, H]);
    for (let i = 0; i < 9; i += 1) { const u = (i / 9) ** 1.7, y = 340 + u * 260, half = 52 + u * 250; line("#7a5230", 5 + u * 9, [400 - half, y, 400 + half, y]); }
    line("#4b5563", 6, [640, 330, 640, 200]); rect("#1f2937", 618, 170, 44, 70); oval("#ef4444", 640, 190, 11); oval("#22c55e", 640, 220, 11);
  } else if (bg === "ocean") {
    sky("#7cc7ff", "#dff4ff", 300); sun(660, 90, 40); cloud(180, 100, 1.1); cloud(420, 60, 0.7);
    rect(grad([[0, "#3f9bd6"], [1, "#1f5f9c"]], 290, H), 0, 290, W, 310);
    for (let r = 0; r < 7; r += 1) { const y = 320 + r * 42; g.strokeStyle = `rgba(255,255,255,${0.25 + r * 0.06})`; g.lineWidth = 3 + r * 0.5; g.beginPath(); for (let x = -40 + (r % 2) * 40; x < W + 40; x += 80) { g.moveTo(x, y); g.quadraticCurveTo(x + 20, y - 12 - r, x + 40, y); } g.stroke(); }
  } else if (bg === "clouds") {
    rect(grad([[0, "#3f8fe0"], [0.6, "#9bd3ff"], [1, "#e6f6ff"]]), 0, 0, W, H); sun(120, 110, 46);
    [[620, 90, 1.2], [300, 170, 0.9], [100, 300, 1.4], [520, 330, 1.6], [730, 250, 1], [260, 430, 1.8], [640, 500, 2], [60, 540, 1.6], [420, 570, 1.4]].forEach(([x, y, k]) => cloud(x, y, k));
  } else if (bg === "street") {
    sky(); cloud(150, 80); cloud(640, 60, 0.8);
    [[20, "#f6c177", "#b5533c"], [220, "#9ad0c2", "#3f6f8f"], [420, "#f2a7b8", "#8a4f7d"], [620, "#fff1b8", "#a0522d"]].forEach(([x, wall, roof]) => { rect(wall, x, 220, 170, 200); poly(roof, [x - 12, 222, x + 85, 140, x + 182, 222]); rect("#7a5230", x + 66, 340, 40, 80); for (const [dx, dy] of [[22, 250], [112, 250], [22, 330], [112, 330]]) { if (dy === 330 && dx > 40 && dx < 110) continue; rect("#dff4ff", x + dx, dy, 36, 40); line("#ffffff", 3, [x + dx + 18, dy, x + dx + 18, dy + 40]); } });
    rect("#cfcfcf", 0, 420, W, 34); rect("#5b5f6b", 0, 454, W, 146); for (let x = 20; x < W; x += 110) rect("#f5f0d0", x, 520, 60, 8);
    for (const x of [200, 600]) { line("#4b5563", 6, [x, 420, x, 300]); line("#4b5563", 6, [x, 300, x + 26, 300]); oval("#ffd84d", x + 30, 306, 9); }
  } else if (bg === "citynight") {
    rect(grad([[0, "#0b1030"], [1, "#2a2f6b"]]), 0, 0, W, H); stars(g, 110, 91); oval("#fdf3c7", 650, 100, 42); oval("#0b1030", 668, 90, 38);
    let x = 0; while (x < W) { const w = 50 + rnd() * 70, h = 150 + rnd() * 250; rect(["#161a3d", "#1d2250", "#12163a"][Math.floor(rnd() * 3)], x, 470 - h, w, h); for (let wy = 470 - h + 14; wy < 456; wy += 24) for (let wx = x + 9; wx < x + w - 12; wx += 20) if (rnd() > 0.4) rect(rnd() > 0.5 ? "#ffd84d" : "#ffe9a6", wx, wy, 10, 13); x += w + 4; }
    rect("#11142b", 0, 470, W, 130); for (let lx = 30; lx < W; lx += 120) rect("#f5f0d0", lx, 532, 60, 6);
  } else if (bg === "playground") {
    sky(); cloud(520, 80, 1.1); ground("#86cf70", 390); rect("#e6cf9a", 0, 470, W, 130);
    line("#e5484d", 10, [90, 470, 150, 250]); line("#e5484d", 10, [270, 470, 210, 250]); line("#e5484d", 10, [150, 250, 210, 250]); for (const sx of [165, 198]) { line("#6b7280", 3, [sx, 250, sx - 4, 400]); } line("#3b82f6", 9, [150, 402, 208, 402]);
    rect("#f59e0b", 520, 270, 110, 12); line("#8b5a2b", 10, [530, 282, 530, 470]); line("#8b5a2b", 10, [620, 282, 620, 470]); for (let y = 310; y < 470; y += 34) line("#8b5a2b", 6, [530, y, 620, y]);
    g.strokeStyle = "#22c55e"; g.lineWidth = 26; g.lineCap = "round"; g.beginPath(); g.moveTo(630, 284); g.quadraticCurveTo(700, 380, 770, 462); g.stroke();
    line("#6b7280", 8, [330, 470, 330, 430]); line("#a855f7", 12, [250, 400, 410, 446]); tree(730, 392, 0.7);
  } else if (bg === "classroom") {
    rect("#f6ecd0", 0, 0, W, 440); rect("#c89a63", 0, 440, W, 160); for (let x = 0; x < W; x += 80) line("#b5854f", 2, [x, 440, x - 60, H]);
    rect("#7a5230", 120, 80, 480, 230); rect("#2f5d50", 134, 94, 452, 202); g.fillStyle = "rgba(255,255,255,0.85)"; g.font = "700 40px sans-serif"; g.textAlign = "left"; g.fillText("A B C", 170, 160); g.fillText("1 + 2 = 3", 170, 230); rect("#e5e7eb", 300, 304, 90, 10);
    oval("#ffffff", 700, 120, 46); oval("#1f2937", 700, 120, 40); oval("#ffffff", 700, 120, 36); line("#1f2937", 4, [700, 120, 700, 96]); line("#1f2937", 4, [700, 120, 718, 128]);
    for (const [x, c] of [[60, "#ef4444"], [96, "#3b82f6"], [690, "#22c55e"], [726, "#fde047"]]) rect(c, x, 330, 26, 110);
    rect("#ffffff", 0, 428, W, 14);
  } else if (bg === "kitchen") {
    rect("#fdf1d6", 0, 0, W, 420); for (let x = 0; x < W; x += 50) for (let y = 250; y < 420; y += 50) rect((x / 50 + y / 50) % 2 ? "#ffffff" : "#bfe3ff", x, y, 50, 50);
    rect("#ffffff", 0, 410, W, 16); for (let x = 0; x < W; x += 80) for (let y = 426; y < H; y += 80) rect((x / 80 + (y - 426) / 80) % 2 ? "#e9d8b8" : "#d7bf93", x, y, 80, 80);
    rect("#c98a5a", 40, 60, 300, 130); rect("#b5764a", 190, 60, 6, 130); oval("#fde047", 170, 125, 6); oval("#fde047", 214, 125, 6);
    rect("#ffffff", 470, 60, 220, 170); rect(grad([[0, "#8fd3ff"], [1, "#dff4ff"]], 60, 230), 482, 72, 196, 146); line("#ffffff", 8, [580, 72, 580, 218]); oval("#ffd84d", 640, 110, 20);
    rect("#8d6e4a", 0, 300, W, 18); for (const [x, c] of [[80, "#ef4444"], [130, "#22c55e"], [700, "#3b82f6"]]) { oval(c, x, 284, 18, 18); rect(c, x - 18, 284, 36, 16); }
  } else if (bg === "livingroom") {
    rect("#e8d5f2", 0, 0, W, 430); rect("#a9745a", 0, 430, W, 170); for (let y = 460; y < H; y += 30) line("#93614a", 2, [0, y, W, y]); rect("#ffffff", 0, 418, W, 14);
    rect("#ffffff", 90, 90, 200, 170); rect(grad([[0, "#8fd3ff"], [1, "#dff4ff"]], 90, 260), 102, 102, 176, 146); line("#ffffff", 8, [190, 102, 190, 248]);
    rect("#7a5230", 480, 110, 210, 140); rect("#bfe3ff", 494, 124, 182, 112); poly("#6b7280", [500, 236, 560, 170, 610, 236]); poly("#9ca3af", [580, 236, 630, 190, 676, 236]); oval("#ffd84d", 640, 150, 14);
    oval("#f2a7b8", 400, 530, 250, 50); oval("#f8c9d4", 400, 530, 180, 32);
    line("#6b7280", 6, [730, 430, 730, 300]); poly("#fde68a", [700, 300, 760, 300, 746, 250, 714, 250]);
    oval("#c2622d", 60, 420, 30, 12); rect("#c2622d", 36, 380, 48, 40); for (const [dx, t] of [[-20, -0.6], [0, 0], [20, 0.6]]) oval("#22c55e", 60 + dx, 350, 12, 34, t);
  } else if (bg === "circus") {
    rect("#2b1a4f", 0, 0, W, H); for (let i = 0; i < 10; i += 1) poly(i % 2 ? "#e5484d" : "#fff4dc", [400, -40, i * 80, 380, (i + 1) * 80, 380]);
    rect("#3a2466", 0, 380, W, 40); for (let x = 20; x < W; x += 60) poly(["#fde047", "#22c55e", "#3b82f6", "#f472b6"][(x / 60) % 4 | 0], [x, 380, x + 40, 380, x + 20, 410]);
    oval("#d9a441", 400, 560, 430, 130); oval("#e8bb5a", 400, 560, 380, 108); g.strokeStyle = "#e5484d"; g.lineWidth = 14; g.beginPath(); g.ellipse(400, 560, 405, 119, 0, Math.PI, 0); g.stroke();
    for (const x of [120, 680]) { g.fillStyle = "rgba(255,255,220,0.16)"; g.beginPath(); g.moveTo(x, 0); g.lineTo(x < 400 ? 300 : 360, 560); g.lineTo(x < 400 ? 440 : 500, 560); g.fill(); }
  } else if (bg === "haunted") {
    rect(grad([[0, "#1a1033"], [1, "#3b2a5c"]]), 0, 0, W, H); stars(g, 70, 51); oval("#fdf3c7", 140, 110, 50); oval("rgba(253,243,199,0.18)", 140, 110, 80);
    g.fillStyle = "#1c1430"; g.beginPath(); g.moveTo(0, 470); g.quadraticCurveTo(400, 380, W, 470); g.lineTo(W, H); g.lineTo(0, H); g.fill();
    rect("#120c22", 330, 220, 220, 210); poly("#120c22", [310, 222, 440, 120, 570, 222]); rect("#120c22", 520, 150, 60, 280); poly("#120c22", [508, 152, 550, 80, 592, 152]);
    for (const [x, y] of [[360, 260], [470, 260], [538, 200], [360, 340]]) rect("#ffd84d", x, y, 30, 40); rect("#2a1b47", 420, 340, 46, 90);
    for (const [x, y, k] of [[110, 470, 1], [700, 450, 1.2]]) { line("#120c22", 10 * k, [x, y, x + 4 * k, y - 90 * k]); line("#120c22", 6 * k, [x + 4 * k, y - 60 * k, x - 36 * k, y - 110 * k]); line("#120c22", 6 * k, [x + 4 * k, y - 80 * k, x + 40 * k, y - 130 * k]); line("#120c22", 4 * k, [x - 20 * k, y - 88 * k, x - 30 * k, y - 140 * k]); }
    for (const [x, y] of [[230, 180], [620, 110], [680, 190]]) { poly("#120c22", [x, y, x - 20, y - 8, x - 12, y + 4, x - 24, y + 6, x, y + 10, x + 24, y + 6, x + 12, y + 4, x + 20, y - 8]); }
  } else if (bg === "harbor") {
    sky("#8fd3ff", "#e6f7ff", 340); cloud(160, 90); cloud(560, 60, 0.8); sun(700, 100, 36);
    rect(grad([[0, "#4aa3dc"], [1, "#2b6ea8"]], 330, H), 0, 330, W, 270); for (let r = 0; r < 5; r += 1) for (let x = (r % 2) * 50; x < W; x += 100) line("rgba(255,255,255,0.35)", 3, [x, 370 + r * 46, x + 40, 370 + r * 46]);
    rect("#f8fafc", 600, 150, 46, 180); rect("#e5484d", 600, 190, 46, 30); rect("#e5484d", 600, 260, 46, 30); rect("#1f2937", 594, 140, 58, 12); rect("#ffd84d", 606, 112, 34, 28); poly("#e5484d", [600, 112, 623, 86, 646, 112]); rect("#6b7280", 560, 330, 130, 16);
    rect("#8b5a2b", 0, 440, 330, 26); for (let x = 20; x < 330; x += 70) rect("#6b4226", x, 440, 16, 160); for (let x = 0; x < 330; x += 34) line("#6b4226", 2, [x, 440, x, 466]);
  } else if (bg === "garden") {
    sky(); cloud(180, 90, 1.1); cloud(620, 110, 0.9); sun(700, 80, 34); ground("#86cf70", 380);
    rect("#f1f5f9", 0, 330, W, 12); rect("#f1f5f9", 0, 372, W, 12); for (let x = 10; x < W; x += 44) poly("#ffffff", [x, 400, x, 310, x + 13, 292, x + 26, 310, x + 26, 400]);
    poly("#d7bf93", [340, H, 380, 400, 420, 400, 470, H]);
    for (let i = 0; i < 26; i += 1) { const x = rnd() * W, y = 430 + rnd() * 150; if (x > 320 && x < 490) continue; const c = ["#ff6b8a", "#ffd84d", "#c79bff", "#ffffff", "#ff9f43"][i % 5]; line("#3f9b57", 3, [x, y, x, y + 22]); for (let k = 0; k < 5; k += 1) oval(c, x + Math.cos(k * 1.257) * 7, y + Math.sin(k * 1.257) * 7, 5.5); oval("#f5b041", x, y, 4); }
    oval("#4a8f4f", 70, 420, 70, 40); oval("#4a8f4f", 740, 426, 66, 38);

  // ---------- famous places around the world ----------
  } else if (bg === "eiffel") {
    sky("#8fd3ff", "#fdeee0"); cloud(140, 100); cloud(640, 140, 0.8); ground("#86cf70", 450);
    const iron = "#6e5a48"; poly(iron, [296, 452, 342, 452, 388, 250, 372, 250]); poly(iron, [504, 452, 458, 452, 412, 250, 428, 250]);
    g.strokeStyle = iron; g.lineWidth = 12; g.beginPath(); g.arc(400, 452, 62, Math.PI, 0); g.stroke(); rect(iron, 346, 330, 108, 13); rect(iron, 366, 248, 68, 11);
    poly(iron, [374, 250, 426, 250, 406, 96, 394, 96]); rect(iron, 390, 150, 20, 8); line(iron, 5, [400, 96, 400, 52]);
    for (const [y0, y1, a, b] of [[440, 345, 316, 372], [330, 262, 362, 384], [246, 160, 380, 396]]) { line("#8a7460", 3, [a, y0, 800 - b, y1]); line("#8a7460", 3, [800 - a, y0, b, y1]); }
    tree(110, 458, 0.8); tree(700, 462, 0.9); for (let x = 180; x < 640; x += 46) if (x < 280 || x > 520) oval("#4a8f4f", x, 452, 24, 16);
  } else if (bg === "london") {
    sky("#a9c9e8", "#eef4f9", 470); cloud(180, 90, 1.2, "#f4f6f8"); cloud(480, 60, 0.9, "#f4f6f8"); cloud(690, 130, 0.8, "#f4f6f8");
    const stone = "#c9a66b", dark = "#9a7b46"; rect(stone, 150, 330, 400, 130); for (let x = 150; x < 550; x += 40) { rect(dark, x + 14, 350, 12, 100); poly(dark, [x, 330, x + 8, 300, x + 16, 330]); }
    rect(stone, 150, 250, 60, 210); poly(dark, [144, 252, 180, 180, 216, 252]); rect(stone, 560, 150, 74, 310); rect(dark, 554, 240, 86, 10);
    oval("#fffdf6", 597, 196, 27); g.strokeStyle = "#3f2f1a"; g.lineWidth = 4; g.beginPath(); g.arc(597, 196, 27, 0, 7); g.stroke(); line("#3f2f1a", 4, [597, 196, 597, 176]); line("#3f2f1a", 3, [597, 196, 612, 204]);
    poly(dark, [556, 152, 597, 60, 638, 152]); line("#3f2f1a", 3, [597, 60, 597, 36]); for (let y = 260; y < 440; y += 34) rect(dark, 584, y, 26, 20);
    rect("#8d8d8d", 0, 458, W, 14); rect(grad([[0, "#7fa9c9"], [1, "#4f7fa6"]], 470, H), 0, 472, W, 128); for (let i = 0; i < 12; i += 1) { const x = rnd() * W, y = 490 + rnd() * 90; line("rgba(255,255,255,0.4)", 2, [x, y, x + 34, y]); }
  } else if (bg === "liberty") {
    sky("#7cc7ff", "#e8f6ff", 420); cloud(600, 90, 1.1); cloud(120, 140, 0.8); rect(grad([[0, "#4aa3dc"], [1, "#2b6ea8"]], 410, H), 0, 410, W, 190);
    for (let x = 20; x < 250; x += 30) rect("#b7c4d6", x, 410 - (60 + ((x * 7) % 90)), 24, 60 + ((x * 7) % 90));
    oval("#5fa35f", 430, 470, 250, 50); rect("#c9c1b3", 330, 420, 200, 40); rect("#d8d0c2", 372, 320, 116, 104); rect("#c9c1b3", 362, 312, 136, 12);
    const cu = "#7fbfa5", cud = "#5fa58a"; poly(cu, [392, 312, 468, 312, 452, 190, 408, 190]); poly(cud, [430, 312, 468, 312, 452, 190, 440, 190]);
    line(cu, 16, [446, 198, 482, 120]); oval(cu, 430, 170, 22, 24); for (let i = -2; i <= 2; i += 1) line(cu, 5, [430 + i * 9, 152, 430 + i * 16, 128]);
    rect(cud, 398, 214, 22, 34); rect("#e2c56b", 474, 100, 18, 22); poly("#ff8a3d", [472, 100, 483, 70, 494, 100]); poly("#ffd84d", [477, 100, 483, 82, 489, 100]);
    for (let i = 0; i < 10; i += 1) { const x = rnd() * W, y = 440 + rnd() * 150; if (y > 500 || x < 180 || x > 680) line("rgba(255,255,255,0.4)", 2, [x, y, x + 36, y]); }
  } else if (bg === "goldengate") {
    sky("#ffc89a", "#ffeeda", 420); sun(140, 130, 46, "#ffb347"); rect(grad([[0, "#5fa6d6"], [1, "#2f6ea3"]], 400, H), 0, 400, W, 200);
    poly("#8a9a6a", [0, 400, 0, 300, 130, 330, 200, 400]); poly("#7c8c5e", [620, 400, 700, 310, W, 280, W, 400]);
    const red = "#c0392b"; for (const x of [250, 550]) { rect(red, x - 18, 130, 12, 330); rect(red, x + 6, 130, 12, 330); for (const y of [150, 210, 270, 390]) rect(red, x - 18, y, 36, 10); }
    rect(red, 0, 340, W, 12); rect("#8f2a20", 0, 352, W, 4);
    g.strokeStyle = red; g.lineWidth = 5; g.beginPath(); g.moveTo(-40, 250); g.quadraticCurveTo(120, 330, 250, 132); g.quadraticCurveTo(400, 420, 550, 132); g.quadraticCurveTo(680, 330, 840, 250); g.stroke();
    for (let x = 270; x < 540; x += 22) { const u = (x - 250) / 300, y = 132 + 208 * (1 - (1 - 2 * u) ** 2) * 0.72 + 0; line(red, 1.5, [x, Math.min(338, 132 + (1 - (2 * u - 1) ** 2) * 150), x, 340]); }
    for (let i = 0; i < 6; i += 1) cloud(60 + i * 140, 410 + (i % 2) * 14, 0.9, "rgba(255,255,255,0.75)");
  } else if (bg === "pyramids") {
    sky("#ffd08a", "#fff0cf"); sun(650, 110, 50, "#ffb347"); ground("#e8c57a", 400, 14);
    for (const [x, y, wd, hh] of [[560, 404, 150, 150], [330, 410, 230, 230], [130, 420, 130, 120]]) { poly("#d9a441", [x - wd, y, x, y - hh, x + wd * 0.2, y]); poly("#b8862f", [x + wd * 0.2, y, x, y - hh, x + wd, y]); for (let k = 1; k < 6; k += 1) line("rgba(0,0,0,0.1)", 2, [x - wd * (1 - k / 6), y - (hh * k) / 6, x + wd * (1 - k / 6), y - (hh * k) / 6]); }
    rect("#c9973a", 600, 440, 120, 36); rect("#c9973a", 690, 404, 40, 44); poly("#b8862f", [684, 404, 710, 380, 736, 404]); rect("#c9973a", 590, 462, 60, 14); oval("#3f2f1a", 716, 420, 3);
    line("#6b4226", 9, [90, 520, 104, 430]); for (const [dx, dy] of [[-50, -10], [-30, -36], [10, -44], [44, -26], [56, 0]]) g.strokeStyle = "#3f9b57", g.lineWidth = 9, g.beginPath(), g.moveTo(104, 430), g.quadraticCurveTo(104 + dx * 0.5, 430 + dy - 14, 104 + dx, 430 + dy), g.stroke();
  } else if (bg === "tajmahal") {
    sky("#ffc7b0", "#fff3e6"); sun(400, 180, 60, "#ffd9a8"); rect("#7ccf6b", 0, 400, W, 200); poly("#8fd0f0", [330, 400, 470, 400, 620, H, 180, H]); poly("rgba(255,255,255,0.35)", [392, 400, 408, 400, 430, H, 370, H]);
    for (let i = 0; i < 6; i += 1) { oval("#3f9b57", 280 - i * 46, 420 + i * 30, 16 + i * 3, 26 + i * 5); oval("#3f9b57", 520 + i * 46, 420 + i * 30, 16 + i * 3, 26 + i * 5); }
    const mar = "#fbf7ef", shade = "#e3dccd"; rect(shade, 190, 372, 420, 30); rect(mar, 300, 262, 200, 112); for (const x of [318, 452]) { rect(shade, x, 300, 30, 74); g.fillStyle = "#c7d3e6"; g.beginPath(); g.moveTo(x + 4, 374); g.lineTo(x + 4, 322); g.quadraticCurveTo(x + 15, 300, x + 26, 322); g.lineTo(x + 26, 374); g.fill(); }
    g.fillStyle = "#b7c6dd"; g.beginPath(); g.moveTo(374, 374); g.lineTo(374, 310); g.quadraticCurveTo(400, 270, 426, 310); g.lineTo(426, 374); g.fill();
    g.fillStyle = mar; g.beginPath(); g.moveTo(352, 264); g.bezierCurveTo(330, 200, 372, 170, 400, 150); g.bezierCurveTo(428, 170, 470, 200, 448, 264); g.fill(); line("#d6b25e", 4, [400, 150, 400, 124]);
    for (const x of [322, 478]) { oval(mar, x, 256, 22, 20); rect(mar, x - 16, 254, 32, 12); } for (const x of [214, 586]) { rect(mar, x - 9, 220, 18, 154); oval(mar, x, 216, 13, 12); rect(shade, x - 12, 268, 24, 5); rect(shade, x - 12, 316, 24, 5); }
  } else if (bg === "greatwall") {
    sky(); cloud(150, 80); cloud(620, 110, 0.9); poly("#7fae8a", [0, 330, 180, 180, 360, 330]); poly("#6f9f7b", [240, 330, 470, 150, 720, 330]); poly("#8fbf96", [560, 330, 720, 220, W, 300, W, 330]); ground("#6fbf6a", 330, 30);
    const wall = "#c9b189", sh = "#a8906a", path = [-20, 540, 140, 470, 250, 500, 360, 400, 470, 430, 560, 320, 660, 340, 740, 250, 830, 260];
    line(sh, 34, path); line(wall, 26, path.map((v, i) => (i % 2 ? v - 6 : v)));
    for (let i = 0; i + 3 < path.length; i += 2) { const [x0, y0, x1, y1] = path.slice(i, i + 4); for (let u = 0.1; u < 1; u += 0.2) rect(wall, x0 + (x1 - x0) * u - 5, y0 + (y1 - y0) * u - 26, 10, 9); }
    for (const [x, y, k] of [[250, 500, 1.2], [470, 430, 1], [660, 340, 0.8]]) { rect(wall, x - 26 * k, y - 60 * k, 52 * k, 60 * k); rect(sh, x - 30 * k, y - 64 * k, 60 * k, 8 * k); for (let c = -2; c <= 2; c += 2) rect(wall, x + c * 11 * k - 5 * k, y - 74 * k, 10 * k, 10 * k); rect("#5b4a36", x - 6 * k, y - 34 * k, 12 * k, 18 * k); }
  } else if (bg === "fuji") {
    sky("#9fd6ff", "#fdeff3"); cloud(640, 90, 0.9); poly("#7f95c2", [130, 400, 400, 110, 670, 400]); poly("#ffffff", [400, 110, 334, 182, 362, 172, 384, 196, 404, 170, 430, 194, 448, 176, 466, 182]);
    rect(grad([[0, "#8fc7ea"], [1, "#5fa3d6"]], 390, 470), 0, 390, W, 80); ground("#86cf70", 470);
    tree(110, 470, 1, "#f7a8c9", "#6b4226"); tree(210, 480, 0.7, "#f9c1d6", "#6b4226"); for (let i = 0; i < 26; i += 1) oval("#f9c1d6", rnd() * 300, 300 + rnd() * 280, 4, 2.5, rnd() * 3);
    const red = "#d6392b"; rect(red, 566, 360, 18, 130); rect(red, 676, 360, 18, 130); rect(red, 548, 378, 164, 12); g.fillStyle = "#2b1a14"; g.beginPath(); g.moveTo(530, 350); g.quadraticCurveTo(630, 366, 730, 350); g.lineTo(722, 336); g.quadraticCurveTo(630, 352, 538, 336); g.fill(); rect(red, 540, 350, 180, 10);
  } else if (bg === "sydney") {
    sky("#7cc7ff", "#e6f6ff", 420); cloud(160, 80, 1.1); cloud(660, 60, 0.8); rect(grad([[0, "#4aa3dc"], [1, "#2b6ea8"]], 410, H), 0, 410, W, 190);
    g.strokeStyle = "#4b5563"; g.lineWidth = 9; g.beginPath(); g.moveTo(-20, 400); g.quadraticCurveTo(160, 190, 340, 400); g.stroke(); g.lineWidth = 5; g.beginPath(); g.moveTo(-20, 400); g.quadraticCurveTo(160, 250, 340, 400); g.stroke(); rect("#4b5563", 0, 372, 350, 9); for (let x = 20; x < 330; x += 26) line("#4b5563", 2, [x, 376, x, 400 - 0]); rect("#6b7280", 326, 340, 26, 70);
    rect("#d9c3a0", 380, 400, 380, 26); rect("#c9b08a", 360, 420, 420, 12);
    const shell = (x, y, k, lean) => { g.fillStyle = "#ffffff"; g.strokeStyle = "#c9d3de"; g.lineWidth = 2; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + lean * 10 * k, y - 130 * k, x + lean * 96 * k, y - 150 * k); g.quadraticCurveTo(x + lean * 70 * k, y - 60 * k, x + lean * 78 * k, y); g.closePath(); g.fill(); g.stroke(); };
    shell(600, 400, 1.15, -1); shell(680, 400, 0.9, -1); shell(520, 400, 1, -1); shell(440, 400, 0.75, -1); shell(700, 400, 0.6, 1); shell(480, 400, 0.5, 1);
    for (let i = 0; i < 12; i += 1) { const x = rnd() * W, y = 450 + rnd() * 140; line("rgba(255,255,255,0.4)", 2, [x, y, x + 36, y]); }
  } else if (bg === "colosseum") {
    sky("#ffd9a8", "#fff3e0"); sun(120, 110, 44, "#ffc266"); ground("#d9c08f", 450);
    const st = "#e2c9a0", dk = "#7a5c3a"; g.fillStyle = "#cdb48a"; g.beginPath(); g.ellipse(400, 250, 250, 46, 0, 0, 7); g.fill();
    poly(st, [150, 452, 150, 190, 410, 190, 440, 250, 650, 250, 650, 452]); poly("#d4b98c", [150, 190, 410, 190, 440, 250, 150, 250]);
    for (let r = 0; r < 4; r += 1) { const y = 204 + r * 62; if (r > 0) rect("#cdb48a", 150, y - 10, 500, 6); for (let x = 164; x < 640; x += 40) { if (r === 0 && x > 400) continue; g.fillStyle = r === 3 ? "#5b4024" : dk; g.beginPath(); g.moveTo(x, y + 44); g.lineTo(x, y + 18); g.quadraticCurveTo(x + 13, y - 2, x + 26, y + 18); g.lineTo(x + 26, y + 44); g.fill(); } }
    pine(70, 452, 1.1, "#3f7d4f"); pine(735, 456, 1.2, "#3f7d4f");
  } else if (bg === "pisa") {
    sky(); cloud(170, 90); cloud(620, 70, 0.9); ground("#86cf70", 450);
    rect("#f4efe4", 60, 330, 220, 122); poly("#c98a5a", [50, 332, 170, 270, 290, 332]); oval("#f4efe4", 170, 300, 46, 40); poly("#c98a5a", [130, 290, 170, 240, 210, 290]); for (let x = 76; x < 270; x += 30) rect("#c9bfae", x, 380, 14, 72);
    g.save(); g.translate(500, 452); g.rotate(0.09); const m = "#fbf7ef", s2 = "#d9d0c0";
    rect(m, -52, -300, 104, 300); for (let t = 0; t < 6; t += 1) { rect(s2, -56, -300 + t * 50 + 44, 112, 6); for (let x = -46; x < 46; x += 16) { g.fillStyle = "#b9ae9c"; g.beginPath(); g.moveTo(x, -300 + t * 50 + 44); g.lineTo(x, -300 + t * 50 + 22); g.quadraticCurveTo(x + 5, -300 + t * 50 + 12, x + 10, -300 + t * 50 + 22); g.lineTo(x + 10, -300 + t * 50 + 44); g.fill(); } }
    rect(m, -38, -344, 76, 46); rect(s2, -42, -348, 84, 6); line("#c0392b", 3, [0, -348, 0, -372]); poly("#c0392b", [0, -372, 18, -366, 0, -360]); g.restore();
  } else if (bg === "rio") {
    sky("#8fd3ff", "#fff0d6", 400); sun(660, 100, 44); cloud(200, 90); rect(grad([[0, "#4ab0dc"], [1, "#2b79a8"]], 380, H), 0, 380, W, 220);
    g.fillStyle = "#5f8f5a"; g.beginPath(); g.moveTo(-10, 400); g.bezierCurveTo(40, 150, 240, 120, 300, 400); g.fill(); g.fillStyle = "#7a6a52"; g.beginPath(); g.moveTo(470, 390); g.bezierCurveTo(490, 180, 600, 170, 640, 390); g.fill(); g.fillStyle = "#6b8f5a"; g.beginPath(); g.moveTo(600, 390); g.bezierCurveTo(660, 290, 760, 300, 810, 390); g.fill();
    rect("#b9b0a0", 139, 196, 14, 16); line("#8d8676", 11, [146, 160, 146, 198]); line("#8d8676", 10, [116, 172, 176, 172]); oval("#8d8676", 146, 152, 8); line("#f4f1ea", 7, [146, 160, 146, 198]); line("#f4f1ea", 6, [116, 172, 176, 172]); oval("#f4f1ea", 146, 152, 6); // the statue on its hilltop, with a dark edge so it shows against the sky
    g.fillStyle = "#f2dca0"; g.beginPath(); g.moveTo(0, 470); g.quadraticCurveTo(300, 400, 560, 470); g.quadraticCurveTo(700, 520, W, 500); g.lineTo(W, H); g.lineTo(0, H); g.fill();
    for (let x = 250; x < 470; x += 22) rect(["#f8fafc", "#fde68a", "#bfdbfe"][(x / 22) % 3 | 0], x, 400 - ((x * 13) % 40) - 14, 16, 30 + ((x * 13) % 40)); for (const [x, c] of [[120, "#ef4444"], [330, "#3b82f6"], [620, "#22c55e"]]) { g.fillStyle = c; g.beginPath(); g.arc(x, 530, 26, Math.PI, 0); g.fill(); line("#6b7280", 3, [x, 530, x, 566]); }
  } else if (bg === "machupicchu") {
    sky("#a9d8f5", "#eef7fb"); cloud(160, 120, 1.3, "rgba(255,255,255,0.85)"); cloud(640, 90, 1.1, "rgba(255,255,255,0.85)");
    poly("#6f9a7f", [0, 400, 120, 230, 260, 400]); g.fillStyle = "#4f8a5a"; g.beginPath(); g.moveTo(330, 420); g.bezierCurveTo(380, 250, 420, 90, 470, 100); g.bezierCurveTo(520, 110, 560, 280, 620, 420); g.fill(); poly("#5f9468", [560, 420, 700, 250, W, 400, W, 420]);
    cloud(420, 300, 1.4, "rgba(255,255,255,0.7)");
    for (let t = 0; t < 6; t += 1) { const y = 400 + t * 34; rect(t % 2 ? "#7ccf6b" : "#8bd87a", 0, y, W, 34); rect("#a8a08f", 0, y, W, 7); }
    for (const [x, y, wd] of [[120, 400, 90], [250, 434, 70], [470, 400, 110], [620, 434, 80], [360, 468, 90]]) { rect("#b8b0a0", x, y - 44, wd, 44); rect("#8d8676", x, y - 48, wd, 6); poly("#5b5347", [x + wd / 2 - 9, y, x + wd / 2 - 6, y - 26, x + wd / 2 + 6, y - 26, x + wd / 2 + 9, y]); }
  } else if (bg === "chichenitza") {
    sky(); sun(120, 100, 40); cloud(600, 90); rect("#3f8f52", 0, 330, W, 90); for (let x = 10; x < W; x += 60) oval(x % 120 ? "#3f9b57" : "#2f7d4f", x, 330, 46, 40); ground("#8fd07a", 420, 10);
    const st = "#d8c9a3", dk = "#b3a27c"; for (let t = 0; t < 9; t += 1) { const half = 230 - t * 20, y = 450 - t * 26; poly(t % 2 ? st : "#cfc09a", [400 - half, y, 400 + half, y, 400 + half - 14, y - 26, 400 - half + 14, y - 26]); }
    poly(dk, [362, 450, 438, 450, 420, 216, 380, 216]); for (let t = 0; t < 12; t += 1) line("#9a8a66", 2, [364 + t * 1.5, 446 - t * 19, 436 - t * 1.5, 446 - t * 19]);
    rect(st, 356, 170, 88, 46); rect(dk, 350, 164, 100, 8); rect("#5b4a36", 388, 184, 24, 32);
  } else if (bg === "kilimanjaro") {
    sky("#ffcf8a", "#fff0cf"); sun(660, 130, 46, "#ff9f43"); poly("#8f8fb8", [60, 400, 250, 190, 560, 190, 760, 400]); poly("#ffffff", [250, 190, 560, 190, 596, 228, 560, 220, 520, 244, 470, 218, 420, 246, 370, 220, 320, 242, 270, 222, 222, 222]);
    cloud(180, 300, 1.2, "rgba(255,255,255,0.8)"); cloud(600, 320, 1, "rgba(255,255,255,0.8)"); ground("#d9b25f", 400, 16);
    for (const [x, y, k] of [[120, 420, 1.1], [650, 410, 1.3], [400, 404, 0.7]]) { line("#4a3520", 12 * k, [x, y, x + 6 * k, y - 80 * k]); line("#4a3520", 7 * k, [x + 6 * k, y - 80 * k, x - 40 * k, y - 120 * k]); line("#4a3520", 7 * k, [x + 6 * k, y - 80 * k, x + 50 * k, y - 124 * k]); oval("#5f7a2e", x + 4 * k, y - 132 * k, 90 * k, 22 * k); oval("#6f8d36", x - 20 * k, y - 142 * k, 50 * k, 14 * k); }
    for (let i = 0; i < 26; i += 1) { const x = rnd() * W, y = 440 + rnd() * 150; line("#b8923f", 2, [x, y, x - 4, y - 14]); line("#b8923f", 2, [x, y, x + 5, y - 12]); }
  } else if (bg === "tablemountain") {
    sky("#8fd3ff", "#e8f6ff", 430); poly("#7f8f84", [40, 400, 110, 230, 150, 210, 560, 210, 600, 240, 650, 400]); poly("#6f7f74", [150, 210, 560, 210, 600, 240, 560, 260, 150, 260, 110, 230]); for (let x = 170; x < 560; x += 46) line("rgba(0,0,0,0.12)", 3, [x, 262, x - 14, 396]);
    poly("#8a9a8a", [600, 400, 690, 250, 720, 262, 790, 400]); for (let i = 0; i < 8; i += 1) cloud(160 + i * 56, 204 + (i % 2) * 6, 0.75, "rgba(255,255,255,0.95)");
    rect("#6fbf6a", 0, 396, W, 40); for (let x = 30; x < W; x += 34) rect(["#f8fafc", "#fde68a", "#fecaca", "#bfdbfe", "#bbf7d0"][(x / 34) % 5 | 0], x, 404 - ((x * 7) % 22), 26, 30 + ((x * 7) % 22));
    rect(grad([[0, "#4aa3dc"], [1, "#2b6ea8"]], 430, H), 0, 434, W, 166); for (let i = 0; i < 12; i += 1) { const x = rnd() * W, y = 460 + rnd() * 130; line("rgba(255,255,255,0.4)", 2, [x, y, x + 36, y]); }
  } else if (bg === "stonehenge") {
    sky("#ffd3a8", "#fdf0e0"); sun(400, 300, 70, "#ffb86b"); ground("#7fbf6a", 400, 10);
    const stone = (x, y, wd, hh, c = "#9a9a94") => { g.fillStyle = "rgba(0,0,0,0.16)"; g.beginPath(); g.ellipse(x + wd * 0.9, y + 4, wd * 1.2, 8, 0, 0, 7); g.fill(); g.fillStyle = c; g.beginPath(); g.moveTo(x - wd / 2, y); g.lineTo(x - wd / 2 + 4, y - hh); g.quadraticCurveTo(x, y - hh - 8, x + wd / 2 - 4, y - hh); g.lineTo(x + wd / 2, y); g.fill(); rect("rgba(255,255,255,0.14)", x - wd / 2 + 5, y - hh + 6, 6, hh - 14); };
    for (const [x, y, k] of [[250, 410, 0.7], [330, 406, 0.7], [470, 406, 0.7], [550, 410, 0.7]]) stone(x, y, 30 * k, 110 * k, "#8a8a84"); rect("#8a8a84", 240, 326, 100, 14); rect("#8a8a84", 460, 326, 100, 14);
    for (const [x, y] of [[150, 470], [250, 480], [560, 480], [660, 470]]) stone(x, y, 46, 160); rect("#a4a49e", 136, 300, 128, 22); rect("#a4a49e", 546, 300, 128, 22); stone(400, 500, 54, 130, "#a8a8a2"); stone(60, 520, 60, 60, "#9a9a94"); stone(740, 530, 70, 44, "#9a9a94");
  } else if (bg === "windmills") {
    sky(); cloud(160, 90, 1.1); cloud(620, 70, 0.9); rect("#7ccf6b", 0, 330, W, 30); rect(grad([[0, "#7fc0e8"], [1, "#5fa3d6"]], 350, 400), 0, 356, W, 44);
    ["#ef4444", "#fde047", "#f472b6", "#a855f7", "#fb923c", "#ef4444"].forEach((c, i) => { poly(c, [0, 400 + i * 34, W, 400 + i * 34, W, 434 + i * 34, 0, 434 + i * 34]); for (let x = (i % 2) * 14; x < W; x += 28) oval("rgba(255,255,255,0.28)", x, 412 + i * 34, 7, 5); line("#3f9b57", 3, [0, 434 + i * 34, W, 434 + i * 34]); });
    for (const [x, y, k, a0] of [[200, 334, 1, 0.5], [600, 330, 0.8, 0.2]]) { poly("#b98a5a", [x - 44 * k, y, x - 24 * k, y - 150 * k, x + 24 * k, y - 150 * k, x + 44 * k, y]); poly("#7a5230", [x - 30 * k, y - 150 * k, x, y - 186 * k, x + 30 * k, y - 150 * k]); rect("#5b3a1c", x - 10 * k, y - 46 * k, 20 * k, 46 * k); rect("#dff4ff", x - 8 * k, y - 110 * k, 16 * k, 18 * k);
      for (let i = 0; i < 4; i += 1) { g.save(); g.translate(x, y - 160 * k); g.rotate(a0 + (i * Math.PI) / 2); line("#5b3a1c", 4 * k, [0, 0, 0, -120 * k]); g.fillStyle = "#fff4dc"; g.strokeStyle = "#7a5230"; g.lineWidth = 2; g.beginPath(); g.rect(4 * k, -120 * k, 26 * k, 84 * k); g.fill(); g.stroke(); g.restore(); } oval("#3f2f1a", x, y - 160 * k, 6 * k); }
  } else if (bg === "moai") {
    sky("#8fd3ff", "#e8f6ff", 330); cloud(600, 90, 1.1); cloud(180, 130, 0.8); rect(grad([[0, "#3f9bd6"], [1, "#2b79b8"]], 300, 400), 0, 300, W, 100); g.fillStyle = "#7ccf6b"; g.beginPath(); g.moveTo(0, 400); g.quadraticCurveTo(400, 330, W, 380); g.lineTo(W, H); g.lineTo(0, H); g.fill();
    rect("#8d8676", 120, 440, 560, 26); for (let x = 130; x < 680; x += 46) line("#6f685a", 2, [x, 440, x, 466]);
    [[190, 1], [320, 1.2], [460, 1.05], [590, 0.9]].forEach(([x, k], n) => { const y = 440, st = "#8f8a80", dk = "#6f6a60"; rect(st, x - 34 * k, y - 60 * k, 68 * k, 60 * k); g.fillStyle = st; g.beginPath(); g.moveTo(x - 30 * k, y - 56 * k); g.lineTo(x - 28 * k, y - 170 * k); g.quadraticCurveTo(x, y - 184 * k, x + 28 * k, y - 170 * k); g.lineTo(x + 30 * k, y - 56 * k); g.fill();
      rect(dk, x - 28 * k, y - 142 * k, 56 * k, 10 * k); poly(dk, [x - 6 * k, y - 134 * k, x + 6 * k, y - 134 * k, x + 11 * k, y - 92 * k, x - 11 * k, y - 92 * k]); line(dk, 4 * k, [x - 14 * k, y - 76 * k, x + 14 * k, y - 76 * k]); rect(dk, x - 34 * k, y - 120 * k, 5 * k, 40 * k); rect(dk, x + 29 * k, y - 120 * k, 5 * k, 40 * k);
      if (n === 1) { rect("#a0522d", x - 24 * k, y - 204 * k, 48 * k, 28 * k); rect("#8a4526", x - 14 * k, y - 216 * k, 28 * k, 14 * k); } });
  } else if (bg === "angkor") {
    sky("#ffb37a", "#ffe9c9"); sun(400, 250, 80, "#ffd08a"); const dk = "#4a3a34";
    const bud = (x, y, k) => { g.fillStyle = dk; g.beginPath(); g.moveTo(x - 30 * k, y); g.bezierCurveTo(x - 36 * k, y - 60 * k, x - 14 * k, y - 110 * k, x, y - 150 * k); g.bezierCurveTo(x + 14 * k, y - 110 * k, x + 36 * k, y - 60 * k, x + 30 * k, y); g.fill(); for (let t = 1; t < 5; t += 1) line("rgba(255,200,140,0.18)", 2, [x - (30 - t * 5) * k, y - t * 28 * k, x + (30 - t * 5) * k, y - t * 28 * k]); };
    rect(dk, 130, 350, 540, 60); rect(dk, 220, 310, 360, 44); bud(400, 320, 1.25); bud(290, 330, 0.9); bud(510, 330, 0.9); bud(170, 360, 0.7); bud(630, 360, 0.7); for (let x = 150; x < 660; x += 26) rect("rgba(255,200,140,0.2)", x, 370, 10, 30);
    for (const x of [60, 740]) { line("#3a2a24", 9, [x, 420, x + (x < 400 ? 10 : -10), 250]); for (const [dx, dy] of [[-50, 0], [-34, -30], [0, -44], [34, -30], [50, 0]]) { g.strokeStyle = "#3a4a2e"; g.lineWidth = 8; g.beginPath(); const tx = x + (x < 400 ? 10 : -10); g.moveTo(tx, 250); g.quadraticCurveTo(tx + dx * 0.5, 236 + dy, tx + dx, 258 + dy); g.stroke(); } }
    rect("#5f8f5a", 0, 406, W, 26); rect(grad([[0, "#f2b98a"], [1, "#7f8fb8"]], 430, H), 0, 430, W, 170); g.save(); g.globalAlpha = 0.25; g.translate(0, 860); g.scale(1, -1); rect(dk, 130, 350, 540, 60); bud(400, 320, 1.25); bud(290, 330, 0.9); bud(510, 330, 0.9); g.restore();
    for (let i = 0; i < 9; i += 1) { const x = 40 + i * 90, y = 470 + ((i * 37) % 100); oval("#5fa35f", x, y, 22, 8); oval("#f9a8d4", x + 6, y - 4, 6, 5); }
  } else if (bg === "parthenon") {
    sky(); sun(680, 100, 40); cloud(160, 100); g.fillStyle = "#c9b089"; g.beginPath(); g.moveTo(0, 480); g.quadraticCurveTo(160, 330, 300, 380); g.lineTo(560, 380); g.quadraticCurveTo(700, 360, W, 470); g.lineTo(W, H); g.lineTo(0, H); g.fill();
    for (let i = 0; i < 14; i += 1) oval("#4f8f52", 40 + i * 58, 500 + ((i * 29) % 60), 30, 20);
    const m = "#f4efe2", sh = "#d9d1bf"; rect(sh, 196, 366, 408, 14); rect(m, 208, 352, 384, 14); for (let i = 0; i < 8; i += 1) { const x = 222 + i * 50; rect(m, x, 210, 24, 142); line(sh, 2, [x + 8, 214, x + 8, 350]); line(sh, 2, [x + 16, 214, x + 16, 350]); rect(sh, x - 3, 206, 30, 7); }
    rect(m, 208, 184, 384, 24); for (let x = 216; x < 590; x += 20) rect(sh, x, 190, 6, 12); poly(m, [200, 184, 400, 120, 600, 184]); poly(sh, [236, 180, 400, 132, 564, 180]);
  } else if (bg === "dubai") {
    rect(grad([[0, "#5b6fd6"], [0.55, "#f7a8a0"], [1, "#ffe1b0"]], 0, 430), 0, 0, W, 430); sun(170, 330, 56, "#ffd08a");
    const tw = (x, wd, hh, c) => rect(c, x, 430 - hh, wd, hh); tw(60, 44, 150, "#6f7fb8"); tw(120, 36, 210, "#7f8fc8"); tw(540, 50, 190, "#7f8fc8"); tw(610, 40, 250, "#6f7fb8"); tw(670, 56, 160, "#8f9fd8"); tw(250, 40, 130, "#8f9fd8");
    const b = "#55659f"; poly(b, [372, 430, 376, 300, 384, 300, 386, 220, 392, 220, 394, 140, 398, 140, 400, 40, 402, 140, 406, 140, 408, 220, 414, 220, 416, 300, 424, 300, 428, 430]); for (const y of [300, 220, 140]) line("#8fa0e0", 2, [380, y, 420, y]);
    g.fillStyle = "#f4f6fb"; g.beginPath(); g.moveTo(470, 430); g.lineTo(470, 270); g.quadraticCurveTo(560, 300, 520, 430); g.fill(); line("#55659f", 4, [470, 430, 470, 250]); line("#c9d3e6", 2, [476, 300, 512, 330]); line("#c9d3e6", 2, [476, 350, 520, 376]);
    for (const [x, wd, hh] of [[60, 44, 150], [120, 36, 210], [540, 50, 190], [610, 40, 250], [670, 56, 160]]) for (let y = 430 - hh + 12; y < 420; y += 18) for (let wx = x + 6; wx < x + wd - 6; wx += 12) if (rnd() > 0.45) rect("#ffe9a6", wx, y, 5, 8);
    rect(grad([[0, "#7fb0e0"], [1, "#4f7fc0"]], 430, 480), 0, 430, W, 50); g.fillStyle = "#e8c98a"; g.beginPath(); g.moveTo(0, 480); g.quadraticCurveTo(250, 450, 480, 486); g.quadraticCurveTo(660, 510, W, 470); g.lineTo(W, H); g.lineTo(0, H); g.fill(); g.fillStyle = "#d9b673"; g.beginPath(); g.moveTo(0, 560); g.quadraticCurveTo(300, 500, 560, 560); g.quadraticCurveTo(700, 590, W, 550); g.lineTo(W, H); g.lineTo(0, H); g.fill();
    line("#6b4226", 9, [720, 560, 708, 450]); for (const [dx, dy] of [[-54, 0], [-36, -30], [0, -44], [36, -30], [54, 0]]) { g.strokeStyle = "#3f9b57"; g.lineWidth = 9; g.beginPath(); g.moveTo(708, 450); g.quadraticCurveTo(708 + dx * 0.5, 436 + dy, 708 + dx, 458 + dy); g.stroke(); }
  } else return false;
  return true;
}

