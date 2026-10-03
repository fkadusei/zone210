const $ = (id) => document.getElementById(id);
const rnd = (n) => Math.floor(Math.random() * n);
const pick = (a) => a[rnd(a.length)];
const shuffled = (a) => { const b = a.slice(); for (let i = b.length - 1; i > 0; i -= 1) { const j = rnd(i + 1); [b[i], b[j]] = [b[j], b[i]]; } return b; };

/* ---------- stars (saved on this device) ---------- */
const KEY = "zone210_shapes";
let stars = { spot: 0, angle: 0, sym: 0, area: 0 };
try { stars = { ...stars, ...JSON.parse(localStorage.getItem(KEY)) }; } catch (err) { /* storage unavailable */ }
function addStar(kind, n = 1) {
  stars[kind] += n;
  try { localStorage.setItem(KEY, JSON.stringify(stars)); } catch (err) { /* private mode */ }
  paintStars();
}
function paintStars() { $("starsum").textContent = `⭐ ${stars.spot + stars.angle + stars.sym + stars.area}`; }
paintStars();

/* ---------- sounds ---------- */
function tone(freq, at, dur, type = "triangle", vol = 0.08) {
  const c = window.z210Audio && window.z210Audio.get();
  if (!c) return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.value = freq;
  const t = c.currentTime + at;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g);
  g.connect(c.destination);
  o.start(t);
  o.stop(t + dur + 0.05);
}
const good = () => [523, 659, 784].forEach((f, i) => tone(f, i * 0.07, 0.2));
const bad = () => tone(200, 0, 0.16, "sawtooth", 0.05);

/* ---------- tabs ---------- */
$("tabs").addEventListener("click", (e) => {
  const t = e.target.closest(".tab");
  if (!t) return;
  $("tabs").querySelectorAll(".tab").forEach((x) => x.setAttribute("aria-selected", String(x === t)));
  ["spot", "angle", "sym", "area"].forEach((n) => { $(`p-${n}`).hidden = n !== t.dataset.tab; });
});
function chips(id, fn) {
  $(id).addEventListener("click", (e) => {
    const c = e.target.closest(".g-chip");
    if (!c) return;
    $(id).querySelectorAll(".g-chip").forEach((x) => x.setAttribute("aria-pressed", String(x === c)));
    fn(c.dataset.value);
  });
}

/* ================================================================ shapes (SVG) */
const COLORS = ["#e5484d", "#f5a623", "#2fb36d", "#3b82f6", "#8a5ce0", "#ec6aa0", "#14b8a6"];
const poly = (n, r = 42, rot = -Math.PI / 2) => Array.from({ length: n }, (_, i) => `${(50 + r * Math.cos(rot + (i * 2 * Math.PI) / n)).toFixed(1)},${(50 + r * Math.sin(rot + (i * 2 * Math.PI) / n)).toFixed(1)}`).join(" ");
const star5 = () => Array.from({ length: 10 }, (_, i) => { const r = i % 2 ? 19 : 44; const a = -Math.PI / 2 + (i * Math.PI) / 5; return `${(50 + r * Math.cos(a)).toFixed(1)},${(50 + r * Math.sin(a)).toFixed(1)}`; }).join(" ");
const SHAPES = {
  circle: { name: "Circle", sides: 0, svg: (f) => `<circle cx="50" cy="50" r="40" fill="${f}"/>` },
  oval: { name: "Oval", sides: 0, svg: (f) => `<ellipse cx="50" cy="50" rx="44" ry="28" fill="${f}"/>` },
  square: { name: "Square", sides: 4, svg: (f) => `<rect x="18" y="18" width="64" height="64" fill="${f}"/>` },
  rectangle: { name: "Rectangle", sides: 4, svg: (f) => `<rect x="8" y="28" width="84" height="44" fill="${f}"/>` },
  triangle: { name: "Triangle", sides: 3, svg: (f) => `<polygon points="50,12 90,84 10,84" fill="${f}"/>` },
  pentagon: { name: "Pentagon", sides: 5, svg: (f) => `<polygon points="${poly(5)}" fill="${f}"/>` },
  hexagon: { name: "Hexagon", sides: 6, svg: (f) => `<polygon points="${poly(6, 42, 0)}" fill="${f}"/>` },
  octagon: { name: "Octagon", sides: 8, svg: (f) => `<polygon points="${poly(8, 43, Math.PI / 8)}" fill="${f}"/>` },
  rhombus: { name: "Rhombus", sides: 4, svg: (f) => `<polygon points="50,8 90,50 50,92 10,50" fill="${f}"/>` },
  parallelogram: { name: "Parallelogram", sides: 4, svg: (f) => `<polygon points="26,28 94,28 74,72 6,72" fill="${f}"/>` },
  trapezoid: { name: "Trapezoid", sides: 4, svg: (f) => `<polygon points="30,28 70,28 94,72 6,72" fill="${f}"/>` },
  kite: { name: "Kite", sides: 4, svg: (f) => `<polygon points="50,6 82,38 50,94 18,38" fill="${f}"/>` },
  star: { name: "Star", sides: 10, svg: (f) => `<polygon points="${star5()}" fill="${f}"/>` },
};
const draw = (id, fill = pick(COLORS)) => `<svg viewBox="0 0 100 100" role="img" aria-label="${SHAPES[id].name}"><g stroke="rgba(0,0,0,0.35)" stroke-width="2" stroke-linejoin="round">${SHAPES[id].svg(fill)}</g></svg>`;

/* ================================================================ shape spotter */
let spotLevel = 1;
let spotN = 0;
let spotRight = 0;
let spotTries = 0;
let spotQ = null;
const L1 = ["circle", "square", "triangle", "rectangle", "pentagon", "hexagon"];
const L2 = ["octagon", "rhombus", "parallelogram", "trapezoid", "kite", "oval", "star", "pentagon", "hexagon"];
function spotQuestion() {
  const level = spotLevel;
  if (level === 1 || level === 2) {
    const pool = level === 1 ? L1 : [...L1, ...L2];
    const ans = pick(level === 1 ? L1 : L2.concat(["rectangle", "square"]));
    const opts = shuffled([ans, ...shuffled(pool.filter((s) => s !== ans)).slice(0, 3)]);
    return { text: "What is this shape?", shape: ans, opts: opts.map((s) => ({ label: SHAPES[s].name, ok: s === ans })), explain: `It is a ${SHAPES[ans].name.toLowerCase()}.` };
  }
  const k = rnd(6);
  if (k === 0) { const s = pick(["triangle", "square", "pentagon", "hexagon", "octagon", "rectangle"]); const n = SHAPES[s].sides; return { text: "How many sides does this shape have?", shape: s, opts: shuffled([n, ...[3, 4, 5, 6, 8].filter((x) => x !== n).slice(0, 3)]).map((x) => ({ label: String(x), ok: x === n })), explain: `A ${SHAPES[s].name.toLowerCase()} has ${n} sides.` }; }
  if (k === 1) return pickShape("Which shape has no corners?", "circle", ["square", "triangle", "hexagon", "kite"], "A circle is round, so it has no corners.");
  if (k === 2) return pickShape("Which shape has all 4 sides equal and 4 right angles?", "square", ["rectangle", "rhombus", "kite", "parallelogram"], "A square has 4 equal sides and 4 right angles.");
  if (k === 3) return pickShape("Which shape has exactly one pair of parallel sides?", "trapezoid", ["square", "rectangle", "parallelogram", "kite"], "A trapezoid has just one pair of parallel sides.");
  if (k === 4) return pickShape("Which shape has 6 sides?", "hexagon", ["pentagon", "octagon", "square", "triangle"], "Hex means six: a hexagon has 6 sides.");
  return pickShape("Which shape has two pairs of equal sides next to each other?", "kite", ["rectangle", "rhombus", "trapezoid", "square"], "A kite has two pairs of equal sides that touch.");
}
function pickShape(text, ans, others, explain) {
  const color = pick(COLORS);
  return { text, pics: shuffled([ans, ...others.slice(0, 3)]).map((s) => ({ svg: draw(s, color), ok: s === ans, label: SHAPES[s].name })), explain };
}
function spotShow() {
  spotQ = spotQuestion();
  spotTries = 0;
  $("spotNum").textContent = `Question ${spotN + 1} of 10`;
  $("spotScore").textContent = `Score ${spotRight}`;
  $("spotQ").textContent = spotQ.text;
  $("spotShape").innerHTML = spotQ.shape ? draw(spotQ.shape) : "";
  $("spotShape").hidden = !spotQ.shape;
  $("spotA").innerHTML = spotQ.opts
    ? spotQ.opts.map((o, i) => `<button class="ans" data-i="${i}">${o.label}</button>`).join("")
    : spotQ.pics.map((o, i) => `<button class="ans pic" data-i="${i}" aria-label="${o.label}">${o.svg}</button>`).join("");
  $("spotMsg").textContent = "";
}
$("spotA").addEventListener("click", (e) => {
  const b = e.target.closest(".ans");
  if (!b || b.disabled) return;
  const list = spotQ.opts || spotQ.pics;
  const o = list[Number(b.dataset.i)];
  if (o.ok) {
    b.classList.add("right");
    if (!spotTries) { spotRight += 1; addStar("spot"); }
    good();
    $("spotMsg").textContent = `✅ ${spotQ.explain}`;
    $("spotA").querySelectorAll(".ans").forEach((x) => { x.disabled = true; });
    spotN += 1;
    setTimeout(() => {
      if (spotN >= 10) {
        const msg = spotRight >= 9 ? "Amazing! 🌟🌟🌟" : spotRight >= 7 ? "Great work! 🌟🌟" : spotRight >= 5 ? "Good try! 🌟" : "Keep practising!";
        $("spotMsg").textContent = `Round complete: ${spotRight} out of 10. ${msg}`;
        spotN = 0; spotRight = 0;
        setTimeout(spotShow, 2400);
      } else spotShow();
    }, spotN >= 10 ? 800 : 1500);
  } else { b.classList.add("wrong"); b.disabled = true; spotTries += 1; bad(); $("spotMsg").textContent = "Not quite. Try again!"; }
});
chips("spotLevel", (v) => { spotLevel = Number(v); spotN = 0; spotRight = 0; spotShow(); });
spotShow();

/* ================================================================ angle lab */
let angleMode = "make";
let target = 60;
let theta = 20; // the movable arm, degrees counter-clockwise from the fixed arm
let aDone = false;
const CX = 110, CY = 190, R = 130;
const rad = (d) => (d * Math.PI) / 180;
const pt = (d, r) => [CX + r * Math.cos(rad(d)), CY - r * Math.sin(rad(d))];
function arcPath(d, r) {
  const [x1, y1] = pt(0, r);
  const [x2, y2] = pt(d, r);
  const big = d > 180 ? 1 : 0;
  return `M ${CX} ${CY} L ${x1} ${y1} A ${r} ${r} 0 ${big} 0 ${x2} ${y2} Z`;
}
function drawAngle() {
  const svg = $("angleSvg");
  const [hx, hy] = pt(theta, R);
  const [lx, ly] = pt(theta / 2, 56);
  const showDeg = angleMode === "make" ? true : aDone;
  svg.innerHTML = `
    <path d="${arcPath(theta, 44)}" fill="rgba(245,180,31,0.35)" stroke="#f5b41f" stroke-width="2"/>
    <line x1="${CX}" y1="${CY}" x2="${CX + R}" y2="${CY}" stroke="var(--ink)" stroke-width="5" stroke-linecap="round"/>
    <line x1="${CX}" y1="${CY}" x2="${hx}" y2="${hy}" stroke="#e5484d" stroke-width="5" stroke-linecap="round"/>
    <circle cx="${CX}" cy="${CY}" r="6" fill="var(--ink)"/>
    ${angleMode === "make" ? `<circle id="handle" cx="${hx}" cy="${hy}" r="15" fill="#e5484d" stroke="#fff" stroke-width="3" style="cursor:grab"/>` : ""}
    ${showDeg ? `<text x="${lx}" y="${ly}" text-anchor="middle" font-weight="800" font-size="20" fill="var(--ink)">${Math.round(theta)}°</text>` : ""}
    ${angleMode === "make" ? `<text x="230" y="30" font-size="14" fill="var(--muted)" font-weight="700">Drag the red dot</text>` : ""}`;
}
function angleNew() {
  aDone = false;
  $("angleMsg").textContent = "";
  $("angleA").innerHTML = "";
  if (angleMode === "make") {
    target = pick([30, 45, 60, 75, 90, 105, 120, 135, 150, 180]);
    theta = pick([15, 160, 200, 300]);
    $("angleQ").textContent = `Make an angle of ${target}°`;
    $("angleCheck").hidden = false;
  } else {
    theta = pick([20, 35, 50, 70, 85, 90, 90, 100, 120, 140, 160, 180, 200, 240, 290]) + (rnd(2) ? 0 : 5);
    if (theta === 95) theta = 90;
    $("angleQ").textContent = "What kind of angle is this?";
    $("angleCheck").hidden = true;
    $("angleA").innerHTML = ["Acute", "Right", "Obtuse", "Straight", "Reflex"].map((n) => `<button class="ans" data-n="${n}">${n}</button>`).join("");
  }
  drawAngle();
}
const kindOf = (d) => (d === 90 ? "Right" : d === 180 ? "Straight" : d < 90 ? "Acute" : d < 180 ? "Obtuse" : "Reflex");
let dragging = false;
function moveHandle(e) {
  const svg = $("angleSvg");
  const r = svg.getBoundingClientRect();
  const x = ((e.clientX - r.left) / r.width) * 320 - CX;
  const y = CY - ((e.clientY - r.top) / r.height) * 240;
  let d = (Math.atan2(y, x) * 180) / Math.PI;
  if (d < 0) d += 360;
  theta = Math.round(d);
  drawAngle();
}
$("angleSvg").addEventListener("pointerdown", (e) => { if (angleMode !== "make" || aDone) return; dragging = true; try { $("angleSvg").setPointerCapture(e.pointerId); } catch (err) { /* ok */ } moveHandle(e); });
$("angleSvg").addEventListener("pointermove", (e) => { if (dragging) moveHandle(e); });
addEventListener("pointerup", () => { dragging = false; });
$("angleCheck").addEventListener("click", () => {
  if (aDone) return;
  const diff = Math.abs(theta - target);
  if (diff <= 4) { aDone = true; addStar("angle"); good(); $("angleMsg").textContent = diff === 0 ? "🎯 Perfect!" : `✅ Great! You are only ${diff}° away.`; }
  else { bad(); $("angleMsg").textContent = diff <= 12 ? `So close! You are ${diff}° ${theta > target ? "too wide" : "too narrow"}.` : `Not yet: your angle is ${Math.round(theta)}°, the goal is ${target}°.`; }
});
$("angleA").addEventListener("click", (e) => {
  const b = e.target.closest(".ans");
  if (!b || aDone) return;
  const right = kindOf(Math.round(theta)) === b.dataset.n;
  if (right) { aDone = true; b.classList.add("right"); addStar("angle"); good(); $("angleMsg").textContent = `✅ ${Math.round(theta)}° is a${b.dataset.n === "Acute" || b.dataset.n === "Obtuse" || b.dataset.n === "Right" ? "n" : ""} ${b.dataset.n.toLowerCase()} angle. ${{ Acute: "Smaller than 90°.", Right: "Exactly 90°, like a corner.", Obtuse: "Between 90° and 180°.", Straight: "Exactly 180°, a straight line.", Reflex: "More than 180°." }[b.dataset.n]}`; drawAngle(); }
  else { b.classList.add("wrong"); b.disabled = true; bad(); $("angleMsg").textContent = "Not quite. Think about 90° as a corner."; }
});
$("angleNext").addEventListener("click", angleNew);
chips("angleMode", (v) => { angleMode = v; angleNew(); });
angleNew();

/* ================================================================ symmetry */
const PAL = ["#e5484d", "#f5a623", "#2fb36d", "#3b82f6", "#8a5ce0", "#111111"];
let symMode = "puzzle";
let symType = "v";
let freeType = "b";
let N = 8;
let cells = []; // colour strings or ""
let given = []; // booleans: cell is part of the given pattern
let brushColor = PAL[0];
let palette = PAL;
function mirrors(r, c, type) {
  const n = N;
  if (type === "v") return [[r, n - 1 - c]];
  if (type === "h") return [[n - 1 - r, c]];
  if (type === "b") return [[r, n - 1 - c], [n - 1 - r, c], [n - 1 - r, n - 1 - c]];
  return [[c, n - 1 - r], [n - 1 - r, n - 1 - c], [n - 1 - c, r]]; // r: spin x4
}
const inSource = (r, c) => (symType === "v" ? c < N / 2 : symType === "h" ? r < N / 2 : r < N / 2 && c < N / 2);
function symNew() {
  $("symMsg").textContent = "";
  if (symMode === "free") { N = 10; cells = Array.from({ length: N * N }, () => ""); given = cells.map(() => false); palette = [...PAL, "#ec6aa0", "#14b8a6", "#f5d90a"]; $("symQ").textContent = "Paint on any square. Your pattern mirrors itself!"; }
  else {
    N = 8;
    palette = shuffled(PAL).slice(0, 3);
    cells = Array.from({ length: N * N }, () => "");
    given = cells.map(() => false);
    let count = 0;
    while (count < 7) {
      count = 0;
      for (let r = 0; r < N; r += 1) for (let c = 0; c < N; c += 1) { if (inSource(r, c) && Math.random() < 0.42) { cells[r * N + c] = pick(palette); given[r * N + c] = true; count += 1; } else if (inSource(r, c)) { cells[r * N + c] = ""; given[r * N + c] = true; } }
    }
    $("symQ").textContent = symType === "v" ? "Copy the left side onto the right as a mirror image." : symType === "h" ? "Copy the top onto the bottom as a mirror image." : "Copy the top-left corner into the other three corners as mirror images.";
  }
  brushColor = palette[0];
  drawSym();
}
function drawSym() {
  const g = $("symGrid");
  g.style.setProperty("--n", N);
  let html = "";
  for (let r = 0; r < N; r += 1) for (let c = 0; c < N; c += 1) {
    const col = cells[r * N + c];
    const mid = symMode === "puzzle" || true;
    html += `<button type="button" class="cell${given[r * N + c] ? " fixed" : ""}${mid && c === N / 2 - 1 ? " mid-r" : ""}${mid && r === N / 2 - 1 ? " mid-b" : ""}" data-r="${r}" data-c="${c}" style="${col ? `background:${col}` : ""}" role="gridcell" aria-label="Row ${r + 1} column ${c + 1}${col ? ", coloured" : ", empty"}"></button>`;
  }
  g.innerHTML = html;
  $("symPal").innerHTML = palette.map((c) => `<button type="button" class="swatch" data-c="${c}" style="background:${c}" aria-label="Colour" aria-pressed="${c === brushColor}"></button>`).join("") + `<button type="button" class="swatch erase" data-c="" aria-label="Eraser" aria-pressed="${brushColor === ""}">🧽</button>`;
}
$("symPal").addEventListener("click", (e) => { const s = e.target.closest(".swatch"); if (!s) return; brushColor = s.dataset.c; $("symPal").querySelectorAll(".swatch").forEach((x) => x.setAttribute("aria-pressed", String(x === s))); });
function paintCell(r, c) {
  if (given[r * N + c]) return;
  const set = (rr, cc) => { if (!given[rr * N + cc]) { cells[rr * N + cc] = brushColor; const b = $("symGrid").children[rr * N + cc]; b.style.background = brushColor || ""; b.classList.remove("bad", "good"); } };
  set(r, c);
  if (symMode === "free") mirrors(r, c, freeType).forEach(([a, b]) => set(a, b));
}
function painter(gridEl, onCell) {
  let down = false;
  const hit = (e) => { const el = document.elementFromPoint(e.clientX, e.clientY); const b = el && el.closest && el.closest(".cell"); return b && gridEl.contains(b) ? b : null; };
  gridEl.addEventListener("pointerdown", (e) => { const b = hit(e); if (!b) return; e.preventDefault(); down = true; onCell(b, true); });
  gridEl.addEventListener("pointermove", (e) => { if (!down) return; const b = hit(e); if (b) onCell(b, false); });
  addEventListener("pointerup", () => { down = false; });
}
painter($("symGrid"), (b) => paintCell(Number(b.dataset.r), Number(b.dataset.c)));
$("symCheck").addEventListener("click", () => {
  if (symMode === "free") { $("symMsg").textContent = "Free painting has nothing to check. Make something beautiful!"; return; }
  let wrong = 0;
  for (let r = 0; r < N; r += 1) for (let c = 0; c < N; c += 1) {
    if (given[r * N + c]) continue;
    // find the source cell that this cell mirrors
    const src = [[r, c], ...mirrors(r, c, symType)].find(([a, b]) => given[a * N + b]);
    const want = cells[src[0] * N + src[1]];
    const b = $("symGrid").children[r * N + c];
    const ok = (cells[r * N + c] || "") === (want || "");
    b.classList.toggle("bad", !ok);
    b.classList.toggle("good", ok && !!want);
    if (!ok) wrong += 1;
  }
  if (!wrong) { addStar("sym"); good(); $("symMsg").textContent = "✅ A perfect mirror image! You earned a star."; } else { bad(); $("symMsg").textContent = `${wrong} square${wrong === 1 ? " is" : "s are"} not right yet (red outlines). Check the mirror line!`; }
});
$("symNext").addEventListener("click", symNew);
$("symClear").addEventListener("click", () => { cells = cells.map((c, i) => (given[i] ? c : "")); drawSym(); $("symMsg").textContent = ""; });
chips("symMode", (v) => { symMode = v; $("symLevelRow").hidden = v !== "puzzle"; $("symFreeRow").hidden = v !== "free"; $("symCheck").hidden = v === "free"; symNew(); });
chips("symLevel", (v) => { symType = v; symNew(); });
chips("symFree", (v) => { freeType = v; });
symNew();

/* ================================================================ area and perimeter */
const AW = 12, AH = 9;
let grid = new Array(AW * AH).fill(false);
let task = null;
const fill = () => grid.map((v, i) => (v ? i : -1)).filter((i) => i >= 0);
function measure() {
  let area = 0, per = 0;
  for (let r = 0; r < AH; r += 1) for (let c = 0; c < AW; c += 1) {
    if (!grid[r * AW + c]) continue;
    area += 1;
    [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(([dr, dc]) => { const rr = r + dr, cc = c + dc; if (rr < 0 || cc < 0 || rr >= AH || cc >= AW || !grid[rr * AW + cc]) per += 1; });
  }
  return { area, per };
}
function connected() {
  const f = fill();
  if (!f.length) return false;
  const seen = new Set([f[0]]);
  const stack = [f[0]];
  while (stack.length) {
    const i = stack.pop();
    const r = Math.floor(i / AW), c = i % AW;
    [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(([dr, dc]) => { const rr = r + dr, cc = c + dc; const j = rr * AW + cc; if (rr >= 0 && cc >= 0 && rr < AH && cc < AW && grid[j] && !seen.has(j)) { seen.add(j); stack.push(j); } });
  }
  return seen.size === f.length;
}
function isRect() {
  const f = fill();
  if (!f.length) return false;
  const rs = f.map((i) => Math.floor(i / AW)), cs = f.map((i) => i % AW);
  const w = Math.max(...cs) - Math.min(...cs) + 1, h = Math.max(...rs) - Math.min(...rs) + 1;
  return w * h === f.length;
}
function areaNew() {
  grid = new Array(AW * AH).fill(false);
  $("areaMsg").textContent = "";
  const kind = pick(["area", "rect", "per", "both"]);
  if (kind === "area") { const A = 4 + rnd(10); task = { kind, A }; $("areaQ").textContent = `Colour exactly ${A} squares.`; }
  else if (kind === "rect") { const A = pick([6, 8, 9, 10, 12, 15, 16, 18, 20]); task = { kind, A }; $("areaQ").textContent = `Make a rectangle with an area of ${A} squares.`; }
  else if (kind === "per") { const P = 6 + 2 * rnd(10); task = { kind, P }; $("areaQ").textContent = `Make one connected shape with a perimeter of ${P} units.`; }
  else { const A = 5 + rnd(8); const min = 2 * Math.ceil(2 * Math.sqrt(A)); const max = Math.min(2 * A + 2, 24); const P = min + 2 * rnd(Math.floor((max - min) / 2) + 1); task = { kind, A, P }; $("areaQ").textContent = `Make one connected shape with an area of ${A} and a perimeter of ${P}.`; }
  drawArea();
}
function drawArea() {
  const g = $("areaGrid");
  g.style.setProperty("--n", AW);
  g.innerHTML = grid.map((on, i) => `<button type="button" class="cell${on ? " on" : ""}" data-i="${i}" role="gridcell" aria-label="Square ${i + 1}${on ? ", coloured" : ""}"></button>`).join("");
  live();
}
function live() { const m = measure(); $("areaVal").textContent = m.area; $("perVal").textContent = m.per; }
painter($("areaGrid"), (b, first) => {
  const i = Number(b.dataset.i);
  if (first) areaPaint = !grid[i];
  if (grid[i] === areaPaint) return;
  grid[i] = areaPaint;
  b.classList.toggle("on", areaPaint);
  live();
});
let areaPaint = true;
$("areaCheck").addEventListener("click", () => {
  const m = measure();
  let ok = false;
  let why = "";
  if (task.kind === "area") { ok = m.area === task.A; why = `You have ${m.area} squares; you need ${task.A}.`; }
  else if (task.kind === "rect") { ok = m.area === task.A && isRect(); why = m.area !== task.A ? `Your area is ${m.area}; you need ${task.A}.` : "That is not a rectangle yet. All the squares should fill a box shape."; }
  else if (task.kind === "per") { ok = m.per === task.P && connected(); why = !connected() ? "Your squares should all touch each other (side to side)." : `Your perimeter is ${m.per}; you need ${task.P}.`; }
  else { ok = m.area === task.A && m.per === task.P && connected(); why = !connected() ? "Your squares should all touch each other (side to side)." : `You have area ${m.area} and perimeter ${m.per}; you need ${task.A} and ${task.P}.`; }
  if (ok) { addStar("area"); good(); $("areaMsg").textContent = "✅ You did it! A star for you."; } else { bad(); $("areaMsg").textContent = why; }
});
$("areaNext").addEventListener("click", areaNew);
$("areaClear").addEventListener("click", () => { grid = new Array(AW * AH).fill(false); drawArea(); $("areaMsg").textContent = ""; });
areaNew();
