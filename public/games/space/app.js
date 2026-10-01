import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { SUN, PLANETS, ratio } from "./data.js";
import { planetCanvas, paintEarth } from "./textures.js";

const $ = (id) => document.getElementById(id);
const store = {
  get(key, fallback) { try { const raw = localStorage.getItem(key); return raw === null ? fallback : JSON.parse(raw); } catch (err) { return fallback; } },
  set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (err) { /* private mode */ } },
};
const KEY = "zone210_space";
const settings = { tab: "explore", scale: "easy", speed: "20", orbits: true, labels: true, kg: 35, best: 0, muted: false, ...store.get(KEY, {}) };
const save = () => store.set(KEY, settings);
const saverOn = () => !!(window.z210Saver && window.z210Saver.on);
if (saverOn()) settings.speed = "0";

// ---------- sound ----------
let audio = null;
function tone(freq, start, length, type = "sine", gain = 0.08) {
  if (settings.muted) return;
  try {
    audio = window.z210Audio ? window.z210Audio.get() : audio || new (window.AudioContext || window.webkitAudioContext)();
    if (!audio) return;
    const t = audio.currentTime + start;
    const osc = audio.createOscillator();
    const amp = audio.createGain();
    osc.type = type; osc.frequency.value = freq;
    amp.gain.setValueAtTime(0.0001, t);
    amp.gain.exponentialRampToValueAtTime(gain, t + 0.01);
    amp.gain.exponentialRampToValueAtTime(0.0001, t + length);
    osc.connect(amp).connect(audio.destination);
    osc.start(t); osc.stop(t + length + 0.02);
  } catch (err) { /* audio unavailable */ }
}
const sfx = {
  pick: () => [440, 660].forEach((f, i) => tone(f, i * 0.06, 0.1, "sine", 0.06)),
  right: () => [523, 659, 784].forEach((f, i) => tone(f, i * 0.07, 0.14, "triangle", 0.09)),
  wrong: () => [220, 170].forEach((f, i) => tone(f, i * 0.1, 0.18, "sawtooth", 0.06)),
  done: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, i * 0.1, 0.22, "triangle", 0.1)),
};

const BODIES = [{ ...SUN, moons: [] }, ...PLANETS];
const byId = Object.fromEntries(BODIES.map((b) => [b.id, b]));
const fmtNum = (n) => Math.round(n).toLocaleString("en-GB");
const MOON_OWNER = Object.fromEntries(PLANETS.flatMap((p) => p.moons.map((m) => [m.id, p])));
function fmtDays(d) { return d < 1000 ? `${Number(d.toFixed(d < 10 ? 2 : 0)).toLocaleString("en-GB")} Earth days` : `${(d / 365.25).toFixed(1)} Earth years`; }
function fmtTime(sec) {
  if (sec < 90) return `${Math.round(sec)} seconds`;
  if (sec < 5400) return `${Math.floor(sec / 60)} min ${Math.round(sec % 60)} s`;
  return `${(sec / 3600).toFixed(1)} hours`;
}
const lightSec = (mkm) => (mkm * 1e6) / 299792;

// ---------- tabs ----------
let sceneApi = null;
function setTab(tab) {
  settings.tab = tab; save();
  document.querySelectorAll("#tabs .g-chip").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.tab === tab)));
  ["explore", "scale", "quiz"].forEach((t) => { $(t).hidden = t !== tab; });
  if (sceneApi) sceneApi.setActive(tab === "explore");
  if (tab === "scale") viewScale();
  if (tab === "quiz") startQuiz();
}
$("tabs").addEventListener("click", (e) => { const b = e.target.closest("[data-tab]"); if (b) setTab(b.dataset.tab); });

// ---------- side card ----------
let selected = null; // body id or moon id
const card = $("card");
function showIntro() {
  card.innerHTML = `<h2>Welcome, explorer!</h2><p class="nick">Pick a world to visit</p>
    <p style="line-height:1.55;margin:0 0 12px">The solar system has one star, eight planets, a dwarf planet called Pluto, and hundreds of moons. Tap a planet or its name in the picture, or use the <b>Go to</b> buttons, to fly there.</p>
    <p style="line-height:1.55;margin:0 0 12px">In <b>Easy to see</b> mode the planets are made bigger and brought closer so you can see them. Try <b>True scale</b> to see how big and how empty space really is.</p>
    <span class="lbl2">Did you know?</span><p style="margin:0;line-height:1.55">${SUN.facts[3]}</p>`;
}
function showBody(id, moonId) {
  const b = byId[id];
  if (!b) return showIntro();
  const moons = b.moons || [];
  const m = moons.find((x) => x.id === moonId);
  const stats = b.id === "sun"
    ? [["Type", "Star"], ["Width", `${fmtNum(b.diameter)} km`], ["Size", `${(b.diameter / 12756).toFixed(0)} × Earth`], ["Sunlight to Earth", "8 min 20 s"]]
    : [["Type", b.type], ["Width", `${fmtNum(b.diameter)} km (${ratio(b).toFixed(ratio(b) < 1 ? 2 : 1)} × Earth)`], ["From the Sun", `${fmtNum(b.dist)} million km (${b.au} AU)`], ["Sunlight takes", fmtTime(lightSec(b.dist))], ["Year", fmtDays(b.year)], ["Day", b.dayText], ["Gravity", `${b.gravity} m/s² (Earth 9.8)`], ["Temperature", b.temp], ["Moons", b.moonsText]];
  const w = b.gravity ? (settings.kg * b.gravity) / 9.8 : 0;
  card.innerHTML = `<h2><span class="dot" style="background:${b.color}"></span>${b.name}</h2><p class="nick">${b.nick}</p>
    <div class="stats">${stats.map(([k, v]) => `<div class="stat"><small>${k}</small><b>${v}</b></div>`).join("")}</div>
    <ul class="facts">${b.facts.map((f) => `<li>${f}</li>`).join("")}</ul>
    ${moons.length ? `<span class="lbl2">Moons you can see</span><div class="moonrow">${moons.map((x) => `<button class="g-chip" data-moon="${x.id}" aria-pressed="${x.id === moonId}">${x.name}</button>`).join("")}</div>${m ? `<p class="moonfact"><b>${m.name}</b> (${fmtNum(m.diameter)} km wide, ${m.period} days per orbit). ${m.fact}</p>` : ""}` : ""}
    ${b.gravity ? `<span class="lbl2">Your weight on ${b.name}</span><div class="weigh"><label>On Earth <input id="kg" type="number" min="1" max="200" value="${settings.kg}" inputmode="numeric" aria-label="Your weight on Earth in kilograms" /> kg</label><span>→</span><output id="wout">${w.toFixed(1)} kg</output></div>` : ""}`;
  const kg = $("kg");
  if (kg) kg.addEventListener("input", () => { settings.kg = Math.max(1, Math.min(200, Number(kg.value) || 1)); save(); $("wout").textContent = `${((settings.kg * b.gravity) / 9.8).toFixed(1)} kg`; });
  card.querySelectorAll("[data-moon]").forEach((btn) => btn.addEventListener("click", () => { sfx.pick(); showBody(id, selected && selected.moon === btn.dataset.moon ? undefined : btn.dataset.moon); if (sceneApi) sceneApi.markMoon(btn.dataset.moon); }));
}

// ---------- the 3D scene ----------
function startScene() {
  const stage = $("stage");
  const ok = (() => { try { const c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); } catch (e) { return false; } })();
  if (!ok) { $("loading").textContent = "3D isn't available on this device. You can still use the Scale lab and the quiz."; return null; }
  const renderer = new THREE.WebGLRenderer({ antialias: !saverOn(), alpha: true, logarithmicDepthBuffer: true });
  const pr = () => Math.min(window.devicePixelRatio || 1, saverOn() ? 1 : 2);
  renderer.setPixelRatio(pr());
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  stage.insertBefore(renderer.domElement, stage.firstChild);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.05, 2e7);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.dampingFactor = 0.08; controls.zoomSpeed = 0.9; controls.enablePan = true; controls.screenSpacePanning = true;
  scene.add(new THREE.AmbientLight(0xffffff, 0.16));
  const sunLight = new THREE.PointLight(0xffffff, 3.2, 0, 0);
  scene.add(sunLight);

  // stars follow the camera so they always look infinitely far away
  const starGeo = new THREE.BufferGeometry();
  const sp = new Float32Array(1400 * 3);
  for (let i = 0; i < 1400; i += 1) { const v = new THREE.Vector3().randomDirection().multiplyScalar(4000); sp.set([v.x, v.y, v.z], i * 3); }
  starGeo.setAttribute("position", new THREE.BufferAttribute(sp, 3));
  const dotTex = (() => { const c = document.createElement("canvas"); c.width = c.height = 32; const x = c.getContext("2d"); const g = x.createRadialGradient(16, 16, 0, 16, 16, 16); g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(0.4, "rgba(255,255,255,0.7)"); g.addColorStop(1, "rgba(255,255,255,0)"); x.fillStyle = g; x.fillRect(0, 0, 32, 32); return new THREE.CanvasTexture(c); })();
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ map: dotTex, color: 0xffffff, size: 3.2, sizeAttenuation: false, depthWrite: false, transparent: true, opacity: 0.9 }));
  stars.renderOrder = -10; stars.frustumCulled = false;
  scene.add(stars);

  const tex = (id, color) => { const t = new THREE.CanvasTexture(planetCanvas(id, color)); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };
  const EASY_R = { sun: 6, mercury: 0.55, venus: 0.95, earth: 1.05, mars: 0.75, jupiter: 3.8, saturn: 3.2, uranus: 2.0, neptune: 1.95, pluto: 0.45 };
  const EASY_D = { mercury: 14, venus: 19, earth: 25, mars: 31, jupiter: 48, saturn: 66, uranus: 84, neptune: 100, pluto: 114 };
  const UNIT = 6371; // km per scene unit in true scale
  const trueR = (b) => b.diameter / 2 / UNIT;
  const trueD = (b) => (b.dist * 1e6) / UNIT;
  const lerpLog = (a, b, t) => Math.exp(Math.log(a) * (1 - t) + Math.log(b) * t);

  const bodies = {};
  BODIES.forEach((b, i) => {
    const group = new THREE.Group();
    const geo = new THREE.SphereGeometry(1, 48, 32);
    const mat = b.id === "sun" ? new THREE.MeshBasicMaterial({ map: tex("sun") }) : new THREE.MeshStandardMaterial({ map: tex(b.id, b.color), roughness: 0.95, metalness: 0 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.userData.id = b.id;
    const tilt = new THREE.Group();
    tilt.rotation.z = b.tilt || 0;
    tilt.add(mesh);
    group.add(tilt);
    let ring = null;
    if (b.rings) {
      const inner = 1.35, outer = b.rings === true ? 2.35 : 1.9;
      const rg = new THREE.RingGeometry(inner, outer, 96, 1);
      const pos = rg.attributes.position, uv = rg.attributes.uv;
      for (let k = 0; k < pos.count; k += 1) { const r = Math.hypot(pos.getX(k), pos.getY(k)); uv.setXY(k, (r - inner) / (outer - inner), 0.5); }
      const c = document.createElement("canvas"); c.width = 256; c.height = 4;
      const x = c.getContext("2d");
      for (let px = 0; px < 256; px += 1) { const t = px / 256; const a = b.rings === true ? (0.25 + 0.7 * Math.abs(Math.sin(t * 38) * 0.5 + Math.sin(t * 11) * 0.5)) * (t > 0.62 && t < 0.68 ? 0.1 : 1) : 0.18; x.fillStyle = b.rings === true ? `rgba(226,205,160,${a})` : `rgba(200,230,240,${a})`; x.fillRect(px, 0, 1, 4); }
      const rt = new THREE.CanvasTexture(c);
      ring = new THREE.Mesh(rg, new THREE.MeshBasicMaterial({ map: rt, transparent: true, side: THREE.DoubleSide, depthWrite: false }));
      ring.rotation.x = Math.PI / 2;
      tilt.add(ring);
    }
    scene.add(group);
    const orbit = (() => {
      if (b.id === "sun") return null;
      const pts = Array.from({ length: 256 }, (_, k) => new THREE.Vector3(Math.cos((k / 256) * Math.PI * 2), 0, Math.sin((k / 256) * Math.PI * 2)));
      const l = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x8aa4ff, transparent: true, opacity: 0.28, depthWrite: false }));
      l.frustumCulled = false;
      scene.add(l);
      return l;
    })();
    bodies[b.id] = { data: b, group, mesh, tilt, ring, orbit, a0: (i * 2.399963) % (Math.PI * 2), r: 1, d: 0 };
  });
  const sunGlow = (() => {
    const c = document.createElement("canvas"); c.width = c.height = 128;
    const x = c.getContext("2d"); const g = x.createRadialGradient(64, 64, 4, 64, 64, 64);
    g.addColorStop(0, "rgba(255,230,150,0.95)"); g.addColorStop(0.3, "rgba(255,170,60,0.45)"); g.addColorStop(1, "rgba(255,120,0,0)");
    x.fillStyle = g; x.fillRect(0, 0, 128, 128);
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    scene.add(s);
    return s;
  })();
  paintEarth(bodies.earth.mesh.material.map.image).then(() => { bodies.earth.mesh.material.map.needsUpdate = true; }).catch(() => { /* keep the generated Earth */ });

  // ----- layout (easy <-> true) -----
  let layoutT = settings.scale === "true" ? 1 : 0; // 0 easy, 1 true
  let layoutGoal = layoutT;
  const sizeOf = (b) => lerpLog(EASY_R[b.id], b.id === "sun" ? 109.3 : trueR(b), layoutT);
  const distOf = (b) => (b.id === "sun" ? 0 : lerpLog(EASY_D[b.id], trueD(b), layoutT));
  const sim = { days: 0 };
  const posOf = (id) => { const o = bodies[id]; const a = o.a0 + (2 * Math.PI * sim.days) / (o.data.year || 1); return new THREE.Vector3(Math.cos(a) * o.d, 0, Math.sin(a) * o.d); };
  function applyLayout() {
    Object.values(bodies).forEach((o) => {
      o.r = sizeOf(o.data); o.d = distOf(o.data);
      o.mesh.scale.setScalar(o.r);
      if (o.ring) o.ring.scale.setScalar(o.r);
      if (o.orbit) { o.orbit.scale.set(o.d, 1, o.d); o.orbit.visible = settings.orbits; }
    });
    const sr = bodies.sun.r;
    sunGlow.scale.setScalar(sr * 5.2);
    controls.minDistance = layoutT > 0.5 ? 0.3 : 2;
    controls.maxDistance = layoutT > 0.5 ? 6e6 : 700;
  }

  // ----- moons for the planet in focus -----
  let moonGroup = null;
  let moons = [];
  function buildMoons(id) {
    if (moonGroup) { scene.remove(moonGroup); moonGroup.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); moonGroup = null; moons = []; }
    const o = bodies[id];
    if (!o || !o.data.moons || !o.data.moons.length) return;
    moonGroup = new THREE.Group();
    scene.add(moonGroup);
    const biggest = Math.max(...o.data.moons.map((m) => m.diameter));
    o.data.moons.forEach((m, k) => {
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 24), new THREE.MeshStandardMaterial({ map: tex(m.id === "moon" ? "moon" : "moon", m.color), roughness: 1 }));
      mesh.userData.moon = m.id;
      moonGroup.add(mesh);
      const line = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 128 }, (_, q) => new THREE.Vector3(Math.cos((q / 128) * Math.PI * 2), 0, Math.sin((q / 128) * Math.PI * 2)))), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.18, depthWrite: false }));
      line.frustumCulled = false;
      moonGroup.add(line);
      moons.push({ m, mesh, line, a0: k * 1.9, easyR: (0.1 + 0.2 * (m.diameter / biggest)) , k });
    });
  }
  function moonGeom(o, mo) {
    const t = layoutT;
    const easyD = o.r * (o.data.rings === true ? 3.4 : 2.5) + o.r * 1.15 * mo.k + o.r * 0.4;
    const easyRad = Math.max(0.12, o.r * mo.easyR);
    const trueRad = mo.m.diameter / 2 / UNIT;
    const trueDist = (mo.m.dist * 1e6) / UNIT + o.r * 0 + trueR(o.data);
    return { dist: lerpLog(easyD, Math.max(trueDist, trueR(o.data) * 1.05), t), rad: lerpLog(easyRad, Math.max(trueRad, 1e-4), t) };
  }

  // ----- labels -----
  const labelsEl = $("labels");
  const labels = [];
  const mkLabel = (text, cls, onClick, ref) => { const b = document.createElement("button"); b.className = `lab ${cls || ""}`; b.textContent = text; b.addEventListener("click", onClick); labelsEl.appendChild(b); labels.push({ el: b, ref }); return b; };
  BODIES.forEach((b) => mkLabel(b.name.replace("The ", ""), "", () => select(b.id), { id: b.id }));
  let moonLabels = [];
  function rebuildMoonLabels() {
    moonLabels.forEach((l) => { l.el.remove(); labels.splice(labels.indexOf(l), 1); });
    moonLabels = moons.map((mo) => { const el = mkLabel(mo.m.name.replace("The ", ""), "moon", () => { sfx.pick(); showBody(selected.id, mo.m.id); selected.moon = mo.m.id; }, { moon: mo }); return labels[labels.length - 1]; });
  }
  const v3 = new THREE.Vector3();

  // ----- camera flights -----
  let fly = null;
  function flyTo(pos, target, ms = 1100) {
    if (saverOn()) ms = 1;
    fly = { p0: camera.position.clone(), t0: controls.target.clone(), p1: pos, t1: target, start: performance.now(), ms };
  }
  let focusId = null;
  let lastFocusPos = null;
  function focusDistance(id) {
    const o = bodies[id];
    let d = o.r * (id === "sun" ? 3.2 : 6.5);
    if (moons.length) { let far = 0; moons.forEach((mo) => { far = Math.max(far, moonGeom(o, mo).dist); }); d = Math.max(d, far * 2.1); }
    return d;
  }
  function select(id, opts = {}) {
    if (!bodies[id]) return;
    sfx.pick();
    selected = { id, moon: null };
    focusId = id;
    buildMoons(id);
    rebuildMoonLabels();
    const o = bodies[id];
    const target = id === "sun" ? new THREE.Vector3() : posOf(id);
    // approach from the sunlit side so the planet looks lit
    const sunDir = id === "sun" ? new THREE.Vector3(0, 0.3, 1).normalize() : target.clone().negate().normalize();
    const perp = new THREE.Vector3(-sunDir.z, 0, sunDir.x);
    const dir = sunDir.multiplyScalar(0.75).add(perp.multiplyScalar(0.5)).add(new THREE.Vector3(0, 0.7, 0)).normalize();
    const dist = focusDistance(id);
    flyTo(target.clone().add(dir.multiplyScalar(dist)), target, opts.fast ? 1 : 1100);
    lastFocusPos = target.clone();
    controls.minDistance = Math.max(o.r * 1.6, layoutT > 0.5 ? 0.2 : 1.2);
    showBody(id);
    document.querySelectorAll("#goto .g-chip").forEach((c) => c.setAttribute("aria-pressed", String(c.dataset.id === id)));
    updateNote();
  }
  function home() {
    focusId = null; selected = null;
    buildMoons(null); rebuildMoonLabels();
    applyLayout();
    const trueMode = layoutT > 0.5;
    flyTo(trueMode ? new THREE.Vector3(0, 900000, 1500000) : new THREE.Vector3(0, 80, 175), new THREE.Vector3(), 1100);
    showIntro();
    document.querySelectorAll("#goto .g-chip").forEach((c) => c.setAttribute("aria-pressed", "false"));
    updateNote();
  }
  function updateNote() {
    const n = $("note");
    const trueMode = settings.scale === "true";
    if (trueMode && !focusId) { n.hidden = false; n.textContent = "True scale: if Earth were a pea, the Sun would be a beach ball 9 metres away... and the planets are far smaller than the dots you can see. Zoom in on one!"; }
    else if (trueMode && focusId && focusId !== "sun") { n.hidden = false; n.textContent = `True scale: this is how big ${byId[focusId].name} really is compared with the space around it.`; }
    else n.hidden = true;
  }

  // ----- picking -----
  const ray = new THREE.Raycaster();
  let downAt = null;
  renderer.domElement.addEventListener("pointerdown", (e) => { downAt = { x: e.clientX, y: e.clientY }; });
  renderer.domElement.addEventListener("pointerup", (e) => {
    if (!downAt || Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > 6) return;
    const r = renderer.domElement.getBoundingClientRect();
    ray.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1)), camera);
    const hits = ray.intersectObjects([...Object.values(bodies).map((o) => o.mesh), ...moons.map((m) => m.mesh)], false);
    if (!hits.length) return;
    const u = hits[0].object.userData;
    if (u.moon && selected) { showBody(selected.id, u.moon); selected.moon = u.moon; sfx.pick(); }
    else if (u.id) select(u.id);
  });

  // ----- loop -----
  let active = true, last = performance.now(), raf = 0, frames = 0;
  function size() {
    const w = stage.clientWidth, h = stage.clientHeight;
    if (!w || !h) return;
    renderer.setPixelRatio(pr());
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(size).observe(stage);
  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (!active) { last = now; return; }
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (saverOn() && (frames += 1) % 2) return; // battery saver: half the frames
    const dps = Number(settings.speed);
    sim.days += dps * dt;
    if (Math.abs(layoutT - layoutGoal) > 1e-3) { layoutT += Math.sign(layoutGoal - layoutT) * Math.min(Math.abs(layoutGoal - layoutT), dt / (saverOn() ? 0.05 : 1.1)); applyLayout(); }
    Object.values(bodies).forEach((o) => {
      if (o.data.id !== "sun") { const p = posOf(o.data.id); o.group.position.copy(p); }
      o.mesh.rotation.y += dt * (o.data.id === "sun" ? 0.04 : 0.25) * (dps ? 1 : 0);
    });
    sunGlow.position.set(0, 0, 0);
    if (focusId) {
      const p = focusId === "sun" ? new THREE.Vector3() : posOf(focusId);
      if (lastFocusPos && !fly) { camera.position.add(p.clone().sub(lastFocusPos)); controls.target.copy(p); }
      lastFocusPos = p;
      if (moonGroup) {
        moonGroup.position.copy(p);
        const o = bodies[focusId];
        moons.forEach((mo) => {
          const g = moonGeom(o, mo);
          const a = mo.a0 + (2 * Math.PI * sim.days * 0.15) / mo.m.period;
          mo.mesh.scale.setScalar(g.rad);
          mo.mesh.position.set(Math.cos(a) * g.dist, 0, Math.sin(a) * g.dist);
          mo.line.scale.set(g.dist, 1, g.dist);
          mo.line.visible = settings.orbits;
        });
      }
    }
    if (fly) {
      const t = Math.min(1, (now - fly.start) / fly.ms);
      const e = t * t * (3 - 2 * t);
      if (focusId) { // keep following a moving planet while flying in
        const p = focusId === "sun" ? new THREE.Vector3() : posOf(focusId);
        const shift = p.clone().sub(fly.t1);
        fly.p1.add(shift); fly.t1.copy(p);
      }
      camera.position.lerpVectors(fly.p0, fly.p1, e);
      controls.target.lerpVectors(fly.t0, fly.t1, e);
      if (t >= 1) fly = null;
    }
    controls.update();
    stars.position.copy(camera.position);
    // labels
    const w = stage.clientWidth, h = stage.clientHeight;
    labels.forEach((l) => {
      let show = settings.labels, world = null, on = false;
      if (l.ref.id) { world = l.ref.id === "sun" ? v3.set(0, 0, 0) : bodies[l.ref.id].group.position.clone(); if (focusId === l.ref.id) on = true; const o = bodies[l.ref.id]; world.y += o.r * 1.15; }
      else { const mo = l.ref.moon; world = mo.mesh.getWorldPosition(new THREE.Vector3()); world.y += mo.mesh.scale.x * 1.2; show = true; on = selected && selected.moon === mo.m.id; }
      if (!show) { l.el.style.display = "none"; return; }
      const sp2 = world.clone().project(camera);
      if (sp2.z > 1 || Math.abs(sp2.x) > 1.05 || Math.abs(sp2.y) > 1.05) { l.el.style.display = "none"; return; }
      l.el.style.display = "";
      l.el.style.transform = `translate(${((sp2.x + 1) / 2) * w}px, ${((1 - sp2.y) / 2) * h}px) translate(-50%, -140%)`;
      l.el.classList.toggle("on", !!on);
    });
    renderer.render(scene, camera);
  }

  size();
  applyLayout();
  camera.position.set(0, 80, 175);
  if (layoutT > 0.5) camera.position.set(0, 900000, 1500000);
  controls.target.set(0, 0, 0);
  Object.values(bodies).forEach((o) => { if (o.data.id !== "sun") o.group.position.copy(posOf(o.data.id)); });
  $("loading").hidden = true;
  raf = requestAnimationFrame(frame);

  $("home").addEventListener("click", () => { sfx.pick(); home(); });
  return {
    setActive(v) { active = v; if (v) { last = performance.now(); size(); } },
    setScale(mode) { layoutGoal = mode === "true" ? 1 : 0; settings.scale = mode; save(); fly = null; if (focusId) { const id = focusId; select(id, { fast: false }); } else { home(); } updateNote(); },
    refresh() { applyLayout(); },
    select, home,
    debug: () => ({ layoutT, layoutGoal, sunR: bodies.sun.r, earthR: bodies.earth.r, earthD: bodies.earth.d, cam: camera.position.toArray(), tgt: controls.target.toArray() }),
    markMoon(id) { if (selected) selected.moon = id; },
  };
}

// ---------- controls ----------
$("goto").innerHTML = BODIES.map((b) => `<button class="g-chip" data-id="${b.id}" aria-pressed="false">${b.name.replace("The ", "")}</button>`).join("");
$("goto").addEventListener("click", (e) => { const b = e.target.closest("[data-id]"); if (b && sceneApi) sceneApi.select(b.dataset.id); });
function syncChips() {
  document.querySelectorAll("#scaleMode .g-chip").forEach((c) => c.setAttribute("aria-pressed", String(c.dataset.value === settings.scale)));
  document.querySelectorAll("#speed .g-chip").forEach((c) => c.setAttribute("aria-pressed", String(c.dataset.value === String(settings.speed))));
  document.querySelectorAll("#show .g-chip").forEach((c) => c.setAttribute("aria-pressed", String(!!settings[c.dataset.value])));
}
$("scaleMode").addEventListener("click", (e) => { const c = e.target.closest(".g-chip"); if (!c || c.dataset.value === settings.scale) return; settings.scale = c.dataset.value; save(); syncChips(); if (sceneApi) sceneApi.setScale(settings.scale); });
$("speed").addEventListener("click", (e) => { const c = e.target.closest(".g-chip"); if (!c) return; settings.speed = c.dataset.value; save(); syncChips(); });
$("show").addEventListener("click", (e) => { const c = e.target.closest(".g-chip"); if (!c) return; settings[c.dataset.value] = !settings[c.dataset.value]; save(); syncChips(); if (sceneApi) sceneApi.refresh(); });

// ---------- scale lab ----------
let sunCm = 24;
function fmtLen(m) {
  if (m < 0.001) return `${(m * 1000).toFixed(2)} mm`;
  if (m < 0.01) return `${(m * 1000).toFixed(1)} mm`;
  if (m < 1) return `${(m * 100).toFixed(1)} cm`;
  if (m < 1000) return `${m < 10 ? m.toFixed(1) : Math.round(m)} m`;
  return `${(m / 1000).toFixed(1)} km`;
}
function viewScale() {
  const view = $("scale");
  const scale = (sunCm / 100) / SUN.diameter; // metres per km
  const maxD = 12756 * 11.3;
  view.innerHTML = `<div class="panel"><h2>How big are the planets?</h2><p class="muted" style="margin:0">Every planet drawn to the same scale. The little blue dot is Earth. The Sun would be ${Math.round(SUN.diameter / 12756)} Earths wide, far too big to fit on this page!</p>
      <div class="sizes">${PLANETS.map((p) => { const px = Math.max(4, (p.diameter / 12756) * 15); return `<div class="sz"><i style="width:${px}px;height:${px}px;background:radial-gradient(circle at 35% 30%, ${p.color}, #111 140%)"></i>${p.name}<small>${ratio(p).toFixed(ratio(p) < 1 ? 2 : 1)} × Earth</small></div>`; }).join("")}</div></div>
    <div class="panel"><h2>Shrink the Sun</h2><p class="muted" style="margin:0">Pretend the Sun is a ball that size. How big would everything else be, and how far away?</p>
      <div class="g-chips" id="presets" style="margin-top:10px"><button class="g-chip" data-cm="1.6" aria-pressed="${sunCm === 1.6}">Marble (1.6 cm)</button><button class="g-chip" data-cm="7" aria-pressed="${sunCm === 7}">Tennis ball (7 cm)</button><button class="g-chip" data-cm="24" aria-pressed="${sunCm === 24}">Basketball (24 cm)</button><button class="g-chip" data-cm="100" aria-pressed="${sunCm === 100}">Big ball (1 m)</button></div>
      <div class="slider"><label for="cm" style="font-weight:700">Sun width: <output id="cmv">${sunCm} cm</output></label><input id="cm" type="range" min="1" max="100" step="0.5" value="${sunCm}" /></div>
      <table class="scaletbl"><thead><tr><th>World</th><th>Size</th><th>Distance from the Sun</th><th>Steps (75 cm)</th></tr></thead><tbody>${PLANETS.map((p) => { const dm = p.dist * 1e6 * scale; return `<tr><td><span class="dot" style="background:${p.color};width:10px;height:10px;border-radius:50%;display:inline-block;margin-right:6px"></span>${p.name}</td><td>${fmtLen(p.diameter * scale)}</td><td>${fmtLen(dm)}</td><td>${fmtNum(dm / 0.75)}</td></tr>`; }).join("")}</tbody></table>
      <p class="muted" style="margin:10px 0 0;font-size:0.88rem">Walking to Neptune on this scale would take about ${Math.round((4495e6 * scale) / 1.3 / 60)} minutes at a normal walking pace.</p></div>
    <div class="panel"><h2>How long does sunlight take?</h2><p class="muted" style="margin:0 0 10px">Light is the fastest thing there is, about 300,000 km every second. Even so, space is so big that it takes a while.</p>
      <table class="scaletbl"><thead><tr><th>World</th><th>Sunlight takes</th><th></th></tr></thead><tbody>${PLANETS.map((p) => { const s = lightSec(p.dist); return `<tr><td>${p.name}</td><td>${fmtTime(s)}</td><td style="width:45%"><div class="lightbar" style="width:${Math.max(1, (s / lightSec(5906)) * 100)}%"></div></td></tr>`; }).join("")}</tbody></table></div>`;
  const apply = (cm) => { sunCm = cm; viewScale(); };
  $("presets").addEventListener("click", (e) => { const b = e.target.closest("[data-cm]"); if (b) apply(Number(b.dataset.cm)); });
  $("cm").addEventListener("input", (e) => { sunCm = Number(e.target.value); $("cmv").textContent = `${sunCm} cm`; });
  $("cm").addEventListener("change", (e) => apply(Number(e.target.value)));
}

// ---------- quiz ----------
const shuffle = (a) => { for (let i = a.length - 1; i > 0; i -= 1) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const planetNames = PLANETS.filter((p) => p.id !== "pluto").map((p) => p.name);
function opts(answer, pool, n = 4) { const o = shuffle(pool.filter((x) => x !== answer)).slice(0, n - 1); o.push(answer); return shuffle(o); }
const SUPER = [
  ["Which planet is the biggest?", "Jupiter", "Jupiter is so big that all the other planets would fit inside it."],
  ["Which planet is the smallest?", "Mercury", "Mercury is only a little bigger than our Moon."],
  ["Which planet is closest to the Sun?", "Mercury", "Mercury is about 58 million km from the Sun."],
  ["Which planet is farthest from the Sun?", "Neptune", "Neptune is 30 times farther from the Sun than Earth is. (Pluto is a dwarf planet.)"],
  ["Which planet is the hottest?", "Venus", "Thick clouds trap heat on Venus, so it is hotter than Mercury even though it is farther from the Sun."],
  ["Which planet has the most moons?", "Saturn", "Saturn has more than 270 known moons."],
  ["Which planet has the shortest day?", "Jupiter", "Jupiter spins around once in under 10 hours."],
  ["Which planet has the longest year?", "Neptune", "One Neptune year is about 165 Earth years."],
  ["Which planet is famous for its bright rings?", "Saturn", "Saturn's rings are made of billions of pieces of ice and rock."],
  ["Which planet spins on its side?", "Uranus", "Uranus is tipped over so far that it rolls around the Sun."],
  ["Which planet is called the Red Planet?", "Mars", "Rusty iron dust gives Mars its colour."],
  ["Which planet do we live on?", "Earth", "Earth is the only planet we know of with life."],
  ["On which planet is a day longer than its year?", "Venus", "Venus spins very slowly: 243 Earth days to turn once, but only 225 days to orbit the Sun."],
  ["Which planet has the Great Red Spot, a giant storm?", "Jupiter", "The storm is wider than Earth."],
];
const GEN = [
  () => { const [q, a, why] = pick(SUPER); return { q, o: opts(a, planetNames), a, why }; },
  () => { const p = pick(PLANETS.filter((x) => x.id !== "pluto")); return { q: `Which planet is nicknamed “${p.nick}”?`, o: opts(p.name, planetNames), a: p.name, why: p.facts[0] }; },
  () => { const ms = PLANETS.filter((p) => p.moons.length).flatMap((p) => p.moons.map((m) => [m, p])); const [m, p] = pick(ms); return { q: `Which planet does the moon ${m.name.replace("The ", "")} orbit?`, o: opts(p.name, planetNames.concat(["Pluto"])), a: p.name, why: m.fact }; },
  () => { const k = pick([1, 2, 3, 4, 5, 6, 7, 8]); const a = PLANETS[k - 1].name; return { q: `Counting out from the Sun, which planet is number ${k}?`, o: opts(a, planetNames), a, why: `The order is Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, Neptune.` }; },
  () => { const p = pick(PLANETS.filter((x) => ["jupiter", "saturn", "uranus", "neptune", "venus"].includes(x.id))); const r = ratio(p); const a = r >= 2 ? `About ${Math.round(r)} times wider` : `About the same width`; const pool = ["About the same width", "About 4 times wider", "About 11 times wider", "About 9 times wider", "About 3 times wider"]; return { q: `How wide is ${p.name} compared with Earth?`, o: opts(r < 2 ? "About the same width" : a, pool.includes(a) ? pool : pool.concat([a])), a: r < 2 ? "About the same width" : a, why: `${p.name} is ${fmtNum(p.diameter)} km across and Earth is 12,756 km.` }; },
  () => { const a = "8 minutes"; return { q: "How long does sunlight take to reach Earth?", o: shuffle(["8 minutes", "8 seconds", "8 hours", "8 days"]), a, why: "Light travels about 300,000 km every second, and the Sun is 150 million km away." }; },
  () => { const p = pick(PLANETS.filter((x) => x.gravity > 8 || x.gravity < 4)); const w = ((40 * p.gravity) / 9.8); const a = `${Math.round(w)} kg`; const pool = [a, `${Math.round(w * 2)} kg`, `${Math.max(2, Math.round(w / 2))} kg`, "40 kg", `${Math.round(w * 1.5 + 8)} kg`]; return { q: `A child weighs 40 kg on Earth. About how much would they weigh on ${p.name}?`, o: opts(a, [...new Set(pool)]), a, why: `${p.name}'s gravity is ${p.gravity} m/s² compared with 9.8 on Earth, so 40 × ${p.gravity} ÷ 9.8 ≈ ${Math.round(w)} kg.` }; },
  () => ({ q: "How many planets are there in our solar system?", o: shuffle(["8", "9", "7", "10"]), a: "8", why: "Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus and Neptune. Pluto is a dwarf planet." }),
  () => ({ q: "What is Pluto?", o: shuffle(["A dwarf planet", "A moon of Neptune", "A star", "A comet"]), a: "A dwarf planet", why: "Pluto was moved from “planet” to “dwarf planet” in 2006." }),
  () => ({ q: "Which is bigger: the Sun or Earth?", o: shuffle(["The Sun (over a million Earths could fit inside)", "Earth", "They are the same size", "It depends on the day"]), a: "The Sun (over a million Earths could fit inside)", why: "The Sun is a star 109 times wider than Earth." }),
];
function startQuiz() {
  const view = $("quiz");
  const TOTAL = 10;
  let n = 0, correct = 0, seen = new Set(), answered = false;
  function next() {
    if (n >= TOTAL) return finish();
    let q, tries = 0;
    do { q = pick(GEN)(); tries += 1; } while (seen.has(q.q) && tries < 40);
    seen.add(q.q); n += 1; answered = false;
    view.innerHTML = `<div class="panel qz"><div class="stat2"><span>Question ${n} of ${TOTAL}</span><span>⭐ ${correct}</span></div><h2>${q.q}</h2><div class="opts" id="opts">${q.o.map((o) => `<button>${o}</button>`).join("")}</div><div class="fbk" id="fbk"></div><div id="nx"></div></div>`;
    $("opts").addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (!b || answered) return;
      answered = true;
      const ok = b.textContent === q.a;
      $("opts").querySelectorAll("button").forEach((x) => { x.disabled = true; if (x.textContent === q.a) x.classList.add("right"); else if (x === b) x.classList.add("wrong"); });
      if (ok) { correct += 1; sfx.right(); } else sfx.wrong();
      $("fbk").className = `fbk ${ok ? "good" : "bad"}`;
      $("fbk").innerHTML = `${ok ? "Correct!" : `Not quite: it's ${q.a}.`}<small>${q.why}</small>`;
      $("nx").innerHTML = `<button class="g-btn" id="nxt">${n >= TOTAL ? "See my score" : "Next question"}</button>`;
      $("nxt").addEventListener("click", next);
      $("nxt").focus({ preventScroll: true });
    });
  }
  function finish() {
    sfx.done();
    const isBest = correct > settings.best;
    if (isBest) { settings.best = correct; save(); }
    const stars = correct >= 9 ? 3 : correct >= 7 ? 2 : correct >= 5 ? 1 : 0;
    view.innerHTML = `<div class="panel qz"><h2>${correct >= 9 ? "Space expert!" : correct >= 6 ? "Great exploring!" : "Keep exploring!"}</h2><div class="big">${correct}/${TOTAL}</div><p style="font-size:2rem;margin:0">${"⭐".repeat(stars)}${"☆".repeat(3 - stars)}</p><p class="muted">${isBest ? "New best score!" : `Best so far: ${settings.best}`}</p><div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-top:12px"><button class="g-btn" id="again">Play again</button><button class="g-btn ghost" id="toexp">Back to exploring</button></div></div>`;
    $("again").addEventListener("click", startQuiz);
    $("toexp").addEventListener("click", () => setTab("explore"));
  }
  next();
}

const mute = $("mute");
const syncMute = () => { mute.textContent = settings.muted ? "Sound Off" : "Sound On"; mute.setAttribute("aria-pressed", String(settings.muted)); };
mute.addEventListener("click", () => { settings.muted = !settings.muted; save(); syncMute(); });
syncMute();
syncChips();
showIntro();
sceneApi = startScene();
setTab(["explore", "scale", "quiz"].includes(settings.tab) ? settings.tab : "explore");
window.__space = { settings, get api() { return sceneApi; }, byId };
