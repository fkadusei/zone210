const PLANETS = [["Earth", 9.81], ["Moon", 1.62], ["Mars", 3.71], ["Jupiter", 24.79]];
const css = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim() || "#888";

function controls(defs) {
  return defs.map((d) => d.type === "select"
    ? `<label>${d.label}<select class="search" id="${d.id}">${d.opts.map((o, i) => `<option value="${i}">${o[0]} (${o[1]} m/s²)</option>`).join("")}</select></label>`
    : `<label><span>${d.label}<b id="${d.id}V"></b></span><input type="range" id="${d.id}" min="${d.min}" max="${d.max}" step="${d.step}" value="${d.val}"></label>`).join("");
}

export function mountLaunch(root, ctx) {
  root.innerHTML = `<div class="two"><div class="g-panel"><canvas class="sim" id="lc" width="900" height="320"></canvas>
    <p class="hint" id="lHint">Set the angle and speed, pick a world, then fire at the target.</p></div>
    <div class="g-panel"><div class="ctl">${controls([
      { label: "Angle", id: "lAng", min: 5, max: 85, step: 1, val: 45 },
      { label: "Speed", id: "lSpd", min: 5, max: 40, step: 1, val: 25 },
      { type: "select", label: "World", id: "lG", opts: PLANETS }])}
      <div class="row"><button class="g-btn" id="lFire">🚀 Fire</button><button class="g-btn ghost" id="lNew">New target</button></div></div>
    <div class="readout"><div><small>Range</small><b id="rR">–</b></div><div><small>Max height</small><b id="rH">–</b></div>
    <div><small>Flight time</small><b id="rT">–</b></div><div><small>Hits</small><b id="rS">0</b></div></div></div></div>`;
  const $ = (id) => root.querySelector("#" + id);
  const cv = $("lc"), g = cv.getContext("2d");
  let target = 0, hits = 0, shots = [], anim = 0, ball = null, t0 = 0, cur = null;
  const W = cv.width, H = cv.height, PAD = 40, GROUND = H - 34;
  const gval = () => PLANETS[$("lG").value][1];
  const physics = () => {
    const a = $("lAng").value * Math.PI / 180, v = +$("lSpd").value, gr = gval();
    return { a, v, gr, T: 2 * v * Math.sin(a) / gr, R: v * v * Math.sin(2 * a) / gr, Hm: (v * Math.sin(a)) ** 2 / (2 * gr) };
  };
  // world width in metres: fits the longest possible shot at max speed on the chosen world
  const worldW = () => 1.25 * 1600 / gval();
  const sx = (x) => PAD + (x / worldW()) * (W - PAD * 2);
  const sy = (y) => GROUND - (y / worldW()) * (W - PAD * 2);
  const newTarget = () => { target = worldW() * (0.2 + Math.random() * 0.5); draw(); };
  function draw() {
    g.clearRect(0, 0, W, H);
    g.fillStyle = css("--surface-2"); g.fillRect(0, 0, W, H);
    g.fillStyle = "#3b8f4f"; g.fillRect(0, GROUND, W, H - GROUND);
    g.strokeStyle = css("--line"); g.fillStyle = css("--muted"); g.font = "12px system-ui"; g.lineWidth = 1;
    const step = worldW() > 400 ? 100 : worldW() > 150 ? 50 : 20;
    for (let x = 0; x <= worldW(); x += step) { g.beginPath(); g.moveTo(sx(x), GROUND); g.lineTo(sx(x), GROUND + 6); g.stroke(); g.fillText(x + " m", sx(x) - 10, GROUND + 20); }
    // target
    g.fillStyle = "#e5484d"; g.fillRect(sx(target) - 14, GROUND - 6, 28, 6);
    g.fillStyle = "#fff"; g.fillRect(sx(target) - 6, GROUND - 6, 12, 6);
    // cannon
    const p = physics();
    g.save(); g.translate(sx(0), GROUND); g.rotate(-p.a);
    g.fillStyle = "#555"; g.fillRect(0, -7, 46, 14); g.restore();
    g.fillStyle = "#333"; g.beginPath(); g.arc(sx(0), GROUND, 14, Math.PI, 0); g.fill();
    // previous shots
    shots.slice(-4).forEach((s, i, arr) => { g.strokeStyle = `rgba(245,180,0,${0.25 + 0.15 * i})`; g.lineWidth = 2; g.setLineDash([5, 5]); g.beginPath(); s.forEach(([x, y], k) => (k ? g.lineTo(sx(x), sy(y)) : g.moveTo(sx(x), sy(y)))); g.stroke(); });
    g.setLineDash([]);
    if (cur) { g.strokeStyle = "#f5b400"; g.lineWidth = 3; g.beginPath(); cur.forEach(([x, y], k) => (k ? g.lineTo(sx(x), sy(y)) : g.moveTo(sx(x), sy(y)))); g.stroke(); }
    if (ball) { g.fillStyle = "#f5b400"; g.beginPath(); g.arc(sx(ball[0]), sy(ball[1]), 8, 0, 7); g.fill(); }
  }
  const readouts = () => { const p = physics(); $("lAngV").textContent = $("lAng").value + "°"; $("lSpdV").textContent = $("lSpd").value + " m/s"; $("rR").textContent = p.R.toFixed(1) + " m"; $("rH").textContent = p.Hm.toFixed(1) + " m"; $("rT").textContent = p.T.toFixed(2) + " s"; };
  function fire() {
    if (anim) return;
    const p = physics(); cur = []; t0 = performance.now(); ctx.sfx.boom();
    const speedUp = ctx.saverOn() ? 2 : 1.4;
    const tick = (now) => {
      const t = Math.min(p.T, ((now - t0) / 1000) * speedUp);
      ball = [p.v * Math.cos(p.a) * t, p.v * Math.sin(p.a) * t - 0.5 * p.gr * t * t];
      cur.push(ball); draw();
      if (t >= p.T) {
        anim = 0; shots.push(cur); const land = p.R; ball = null; cur = null;
        const hit = Math.abs(land - target) <= 4; 
        if (hit) { hits++; $("rS").textContent = hits; ctx.sfx.right(); $("lHint").textContent = `🎯 Direct hit! You landed ${land.toFixed(1)} m away. Try a new target.`; newTarget(); }
        else { ctx.sfx.wrong(); $("lHint").textContent = `${land.toFixed(1)} m: you ${land < target ? "fell short of" : "overshot"} the target by ${Math.abs(land - target).toFixed(1)} m. ${p.a > 0.79 && p.a < 0.8 ? "" : "Tip: 45° gives the longest range on flat ground."}`; }
        draw(); return;
      }
      anim = requestAnimationFrame(tick);
    };
    anim = requestAnimationFrame(tick);
  }
  ["lAng", "lSpd", "lG"].forEach((id) => $(id).addEventListener("input", () => { if (id === "lG") { shots = []; newTarget(); } readouts(); if (!anim) draw(); }));
  $("lFire").addEventListener("click", fire);
  $("lNew").addEventListener("click", () => { shots = []; newTarget(); });
  readouts(); newTarget();
  return () => cancelAnimationFrame(anim);
}

export function mountPendulum(root, ctx) {
  root.innerHTML = `<div class="two"><div class="g-panel"><canvas class="sim" id="pc" width="900" height="520"></canvas>
    <p class="hint">Drag the weight to pull it aside, then let go. Try a longer string or another world and watch the period.</p></div>
    <div class="g-panel"><div class="ctl">${controls([
      { label: "String length", id: "pLen", min: 0.2, max: 3, step: 0.1, val: 1.5 },
      { type: "select", label: "World", id: "pG", opts: PLANETS }])}
      <div class="row"><button class="g-btn" id="pStop">⏸ Hold</button><button class="g-btn ghost" id="pKick">Give a push</button></div></div>
    <div class="readout"><div><small>Period</small><b id="pT">–</b></div><div><small>Swings/min</small><b id="pF">–</b></div>
    <div><small>Angle</small><b id="pA">–</b></div><div><small>Measured</small><b id="pM">–</b></div></div>
    <p class="hint">The period is T = 2π√(L/g). It doesn't depend on the weight, and (for small swings) not on how far you pull it.</p></div></div>`;
  const $ = (id) => root.querySelector("#" + id);
  const cv = $("pc"), g = cv.getContext("2d"), W = cv.width, H = cv.height;
  let th = 0.6, om = 0, held = false, drag = false, raf = 0, last = 0, lastCross = 0, measured = 0;
  const L = () => +$("pLen").value, G = () => PLANETS[$("pG").value][1];
  const pivot = [W / 2, 50], scale = () => (H - 140) / 3;
  const bob = () => [pivot[0] + Math.sin(th) * L() * scale(), pivot[1] + Math.cos(th) * L() * scale()];
  const info = () => { const T = 2 * Math.PI * Math.sqrt(L() / G()); $("pLenV").textContent = L().toFixed(1) + " m"; $("pT").textContent = T.toFixed(2) + " s"; $("pF").textContent = (60 / T).toFixed(0); $("pA").textContent = Math.round(th * 180 / Math.PI) + "°"; $("pM").textContent = measured ? measured.toFixed(2) + " s" : "–"; };
  function draw() {
    g.clearRect(0, 0, W, H); g.fillStyle = css("--surface-2"); g.fillRect(0, 0, W, H);
    g.fillStyle = css("--line"); g.fillRect(pivot[0] - 90, pivot[1] - 12, 180, 10);
    const [bx, by] = bob();
    g.strokeStyle = css("--muted"); g.lineWidth = 2; g.beginPath(); g.moveTo(pivot[0], pivot[1]); g.lineTo(bx, by); g.stroke();
    g.setLineDash([4, 6]); g.beginPath(); g.moveTo(pivot[0], pivot[1]); g.lineTo(pivot[0], pivot[1] + L() * scale()); g.stroke(); g.setLineDash([]);
    const grad = g.createRadialGradient(bx - 6, by - 6, 3, bx, by, 26); grad.addColorStop(0, "#ffd66b"); grad.addColorStop(1, "#c98a00");
    g.fillStyle = grad; g.beginPath(); g.arc(bx, by, 26, 0, 7); g.fill();
  }
  function step(now) {
    const dt = Math.min(0.03, (now - last) / 1000); last = now;
    if (!held && !drag) {
      const prev = th; om += (-G() / L()) * Math.sin(th) * dt; om *= 1 - 0.02 * dt; th += om * dt;
      if (prev < 0 && th >= 0 && om > 0) { if (lastCross) measured = (now - lastCross) / 1000; lastCross = now; }
    }
    draw(); info();
    raf = requestAnimationFrame(step);
  }
  const pt = (e) => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * W / r.width, (e.clientY - r.top) * H / r.height]; };
  cv.addEventListener("pointerdown", (e) => { const [x, y] = pt(e), [bx, by] = bob(); if (Math.hypot(x - bx, y - by) < 50) { drag = true; cv.setPointerCapture(e.pointerId); ctx.sfx.pick(); } });
  cv.addEventListener("pointermove", (e) => { if (!drag) return; const [x, y] = pt(e); th = Math.atan2(x - pivot[0], y - pivot[1]); th = Math.max(-1.4, Math.min(1.4, th)); om = 0; lastCross = 0; measured = 0; });
  const up = () => { if (drag) { drag = false; ctx.sfx.pop(); } };
  cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", up);
  $("pStop").addEventListener("click", () => { held = !held; om = 0; $("pStop").textContent = held ? "▶ Release" : "⏸ Hold"; lastCross = 0; measured = 0; });
  $("pKick").addEventListener("click", () => { held = false; $("pStop").textContent = "⏸ Hold"; om += 2.5; ctx.sfx.pop(); });
  ["pLen", "pG"].forEach((id) => $(id).addEventListener("input", () => { lastCross = 0; measured = 0; info(); }));
  last = performance.now(); raf = requestAnimationFrame(step);
  const vis = () => { if (document.hidden) cancelAnimationFrame(raf); else { last = performance.now(); raf = requestAnimationFrame(step); } };
  document.addEventListener("visibilitychange", vis);
  return () => { cancelAnimationFrame(raf); document.removeEventListener("visibilitychange", vis); };
}
