/**
 * Three.js view for Snakes & Ladders. Same interface as the flat fallback view:
 *   setPlayers, setTurn, setPos, hop, jump, rollDice, setDiceEnabled, celebrate, resetView, dispose
 * World mapping: square (col, row) centre = (col - 4.5, 0, 4.5 - row), row 0 is the bottom row nearest the camera.
 * The board top is y = 0.
 */
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const PAWN_COLORS = ["#a3161c", "#123b8f", "#0f6a3a", "#a87500"];
const RIM_COLORS = ["#ffc4c4", "#bcd0ff", "#bdf0d3", "#fff0b0"];
const SNAKE_STYLES = [
  ["#2f9e63", "#14603a"], ["#d94a4a", "#7c1d1d"], ["#7b57d6", "#3e2680"], ["#e8a020", "#8a5600"], ["#1aa3b5", "#0a5a66"],
  ["#d6538f", "#7a1f4c"], ["#7fa32a", "#3e5410"], ["#3a78e0", "#1a3f8a"], ["#c9701a", "#6d3606"], ["#25b59a", "#0d6152"],
];
const DICE_FACES = [
  { v: 3, n: [1, 0, 0] }, { v: 4, n: [-1, 0, 0] },
  { v: 1, n: [0, 1, 0] }, { v: 6, n: [0, -1, 0] },
  { v: 2, n: [0, 0, 1] }, { v: 5, n: [0, 0, -1] },
];
const ease = (k) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);

// square number (1..100) -> world x, z
function cellPos(n) {
  const idx = n - 1;
  const row = Math.floor(idx / 10);
  const col = row % 2 === 0 ? idx % 10 : 9 - (idx % 10);
  return new THREE.Vector3(col - 4.5, 0, 4.5 - row);
}

// ---------------------------------------------------------------------------
// procedural textures
// ---------------------------------------------------------------------------
function makeWoodTexture(renderer, { base, repeat }) {
  const S = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = S;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, S, S);
  for (let i = 0; i < 1100; i += 1) {
    const y = Math.random() * S;
    const phase = Math.random() * 6;
    const wave = 1 + Math.random() * 4;
    ctx.strokeStyle = Math.random() < 0.55 ? `rgba(0,0,0,${0.03 + Math.random() * 0.09})` : `rgba(255,215,160,${0.02 + Math.random() * 0.06})`;
    ctx.lineWidth = 0.5 + Math.random() * 2.6;
    ctx.beginPath();
    for (let x = 0; x <= S; x += 32) {
      const yy = y + Math.sin((x / S) * Math.PI * 2 * 2 + phase) * wave;
      if (x === 0) ctx.moveTo(x, yy);
      else ctx.lineTo(x, yy);
    }
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return tex;
}

function makeBoardTexture(renderer) {
  const S = 2048;
  const U = S / 10;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = S;
  const ctx = canvas.getContext("2d");
  const palette = [["#f1dea6", "#e4c77f"], ["#8ccbe3", "#62aecb"]];
  for (let idx = 0; idx < 100; idx += 1) {
    const n = idx + 1;
    const row = Math.floor(idx / 10);
    const col = row % 2 === 0 ? idx % 10 : 9 - (idx % 10);
    const x = col * U;
    const y = (9 - row) * U;
    const [a, b] = palette[(row + col) % 2 === 0 ? 0 : 1];
    const g = ctx.createLinearGradient(x, y, x, y + U);
    g.addColorStop(0, a);
    g.addColorStop(1, b);
    ctx.fillStyle = g;
    ctx.fillRect(x, y, U, U);
    // soft bevel
    ctx.strokeStyle = "rgba(255,255,255,0.3)";
    ctx.lineWidth = 5;
    ctx.strokeRect(x + 3, y + 3, U - 6, U - 6);
    ctx.strokeStyle = "rgba(90,60,30,0.28)";
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, U, U);
    // number: large, dark, with a light halo so it reads on either colour
    ctx.font = "900 92px Georgia, 'Times New Roman', serif";
    ctx.textBaseline = "top";
    ctx.textAlign = "left";
    ctx.lineJoin = "round";
    ctx.lineWidth = 14;
    ctx.strokeStyle = "rgba(255,255,255,0.92)";
    ctx.strokeText(String(n), x + 14, y + 8);
    ctx.fillStyle = "#2e1a0a";
    ctx.fillText(String(n), x + 14, y + 8);
  }
  // START and FINISH
  const startX = 0;
  const startY = 9 * U;
  const sg = ctx.createLinearGradient(startX, startY, startX, startY + U);
  sg.addColorStop(0, "#9be3a8");
  sg.addColorStop(1, "#4fbf70");
  ctx.fillStyle = sg;
  ctx.fillRect(startX + 4, startY + 4, U - 8, U - 8);
  ctx.fillStyle = "#123d22";
  ctx.font = "900 92px Georgia, serif";
  ctx.lineWidth = 14;
  ctx.strokeStyle = "rgba(255,255,255,0.92)";
  ctx.strokeText("1", startX + 14, startY + 8);
  ctx.fillText("1", startX + 14, startY + 8);
  ctx.font = "900 36px Georgia, serif";
  ctx.textAlign = "center";
  ctx.fillText("START", startX + U / 2, startY + U - 60);
  const fx = 0;
  const fy = 0; // 100 is top-left on a 10-row boustrophedon board
  const fg = ctx.createLinearGradient(fx, fy, fx + U, fy + U);
  fg.addColorStop(0, "#ffe27a");
  fg.addColorStop(1, "#f0a91a");
  ctx.fillStyle = fg;
  ctx.fillRect(fx + 4, fy + 4, U - 8, U - 8);
  ctx.textAlign = "left";
  ctx.fillStyle = "#4a2a02";
  ctx.font = "900 84px Georgia, serif";
  ctx.lineWidth = 14;
  ctx.strokeStyle = "rgba(255,255,255,0.92)";
  ctx.strokeText("100", fx + 14, fy + 10);
  ctx.fillText("100", fx + 14, fy + 10);
  ctx.textAlign = "center";
  ctx.font = "800 34px Georgia, serif";
  ctx.fillText("FINISH", fx + U / 2, fy + U - 60);
  // little crown
  ctx.fillStyle = "#b8790a";
  ctx.beginPath();
  const cx = fx + U * 0.62;
  const cy = fy + U * 0.28;
  ctx.moveTo(cx - 34, cy + 22);
  ctx.lineTo(cx - 34, cy - 14);
  ctx.lineTo(cx - 17, cy + 4);
  ctx.lineTo(cx, cy - 22);
  ctx.lineTo(cx + 17, cy + 4);
  ctx.lineTo(cx + 34, cy - 14);
  ctx.lineTo(cx + 34, cy + 22);
  ctx.closePath();
  ctx.fill();
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return tex;
}

function makeDiceFaceTexture(value) {
  const S = 256;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = S;
  const ctx = canvas.getContext("2d");
  const grad = ctx.createLinearGradient(0, 0, S, S);
  grad.addColorStop(0, "#fffdf7");
  grad.addColorStop(1, "#e9e2d2");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, S, S);
  const layouts = {
    1: [[1, 1]],
    2: [[0, 0], [2, 2]],
    3: [[0, 0], [1, 1], [2, 2]],
    4: [[0, 0], [2, 0], [0, 2], [2, 2]],
    5: [[0, 0], [2, 0], [1, 1], [0, 2], [2, 2]],
    6: [[0, 0], [2, 0], [0, 1], [2, 1], [0, 2], [2, 2]],
  };
  layouts[value].forEach(([cx, cy]) => {
    ctx.beginPath();
    ctx.arc(S * (0.24 + cx * 0.26), S * (0.24 + cy * 0.26), S * (value === 1 ? 0.13 : 0.085), 0, Math.PI * 2);
    ctx.fillStyle = value === 1 ? "#c8281e" : "#1b1b1b";
    ctx.fill();
  });
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeScaleTexture(base, dark, renderer) {
  const W = 256;
  const H = 256;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, W, H);
  // belly stripe along the seam, diamond pattern across the back
  const rows = 8;
  const cols = 6;
  for (let r = -1; r <= rows; r += 1) {
    for (let c = 0; c <= cols; c += 1) {
      const x = (c + (r % 2 ? 0.5 : 0)) * (W / cols);
      const y = r * (H / rows);
      ctx.beginPath();
      ctx.moveTo(x, y - 16);
      ctx.lineTo(x + 16, y);
      ctx.lineTo(x, y + 16);
      ctx.lineTo(x - 16, y);
      ctx.closePath();
      ctx.fillStyle = dark;
      ctx.globalAlpha = 0.55;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = "rgba(255,255,255,0.35)";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }
  const belly = ctx.createLinearGradient(0, 0, W, 0);
  belly.addColorStop(0, "rgba(255,245,200,0.75)");
  belly.addColorStop(0.12, "rgba(255,245,200,0)");
  belly.addColorStop(0.88, "rgba(255,245,200,0)");
  belly.addColorStop(1, "rgba(255,245,200,0.75)");
  ctx.fillStyle = belly;
  ctx.fillRect(0, 0, W, H);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return tex;
}

function makeBlobTexture() {
  const S = 128;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = S;
  const ctx = canvas.getContext("2d");
  const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  g.addColorStop(0, "rgba(0,0,0,0.65)");
  g.addColorStop(0.55, "rgba(0,0,0,0.25)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);
  return new THREE.CanvasTexture(canvas);
}

// a tube whose radius changes along its length
function taperedTube(curve, radiusAt, { segments = 160, radial = 20, tile = 9 } = {}) {
  const pts = curve.getPoints(segments);
  const frames = curve.computeFrenetFrames(segments, false);
  const pos = [];
  const nor = [];
  const uv = [];
  const idx = [];
  for (let i = 0; i <= segments; i += 1) {
    const t = i / segments;
    const r = radiusAt(t);
    const p = pts[i];
    const n = frames.normals[i];
    const b = frames.binormals[i];
    for (let j = 0; j <= radial; j += 1) {
      const a = (j / radial) * Math.PI * 2;
      const dx = n.x * Math.cos(a) + b.x * Math.sin(a);
      const dy = n.y * Math.cos(a) + b.y * Math.sin(a);
      const dz = n.z * Math.cos(a) + b.z * Math.sin(a);
      pos.push(p.x + dx * r, p.y + dy * r, p.z + dz * r);
      nor.push(dx, dy, dz);
      uv.push(j / radial, t * tile);
    }
  }
  for (let i = 0; i < segments; i += 1) {
    for (let j = 0; j < radial; j += 1) {
      const a = i * (radial + 1) + j;
      const b = a + radial + 1;
      idx.push(a, a + 1, b, b, a + 1, b + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}

// ---------------------------------------------------------------------------
export function createView3D(container, { LADDERS, SNAKES, onDiceClick }) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.88;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);
  renderer.domElement.style.display = "block";
  renderer.domElement.style.width = "100%";
  renderer.domElement.style.height = "100%";
  renderer.domElement.style.touchAction = "none";

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.22;

  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 200);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.rotateSpeed = 0.7;
  controls.minDistance = 8;
  controls.maxDistance = 46;
  controls.minPolarAngle = 0.15;
  controls.maxPolarAngle = 1.36;
  controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_ROTATE };
  const TARGET = new THREE.Vector3(0, 0, 3.9);
  controls.target.copy(TARGET);

  // lights
  scene.add(new THREE.HemisphereLight(0xfff4e0, 0x3a2a20, 0.42));
  const sun = new THREE.DirectionalLight(0xffefd6, 1.55);
  sun.position.set(-6, 15, 9);
  sun.castShadow = true;
  sun.shadow.mapSize.set(4096, 4096);
  Object.assign(sun.shadow.camera, { left: -11, right: 11, top: 13, bottom: -11, near: 1, far: 45 });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.03;
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0xaec6ff, 0.55);
  fill.position.set(9, 7, -8);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0xffd6a0, 0.7);
  rim.position.set(0, 5, -14);
  scene.add(rim);
  scene.fog = new THREE.Fog(0x1a110c, 60, 160);

  // table
  const tableTex = makeWoodTexture(renderer, { base: "#3b281c", repeat: 6 });
  const table = new THREE.Mesh(
    new THREE.CircleGeometry(60, 64),
    new THREE.MeshStandardMaterial({ map: tableTex, bumpMap: tableTex, bumpScale: 0.6, roughness: 0.55 })
  );
  table.rotation.x = -Math.PI / 2;
  table.position.y = -0.62;
  table.receiveShadow = true;
  scene.add(table);

  // board: hardwood frame + painted top
  const FRAME = 12.6;
  const frameTex = makeWoodTexture(renderer, { base: "#6b4327", repeat: 1 });
  const woodMat = new THREE.MeshPhysicalMaterial({ map: frameTex, bumpMap: frameTex, bumpScale: 0.4, roughness: 0.4, clearcoat: 0.5, clearcoatRoughness: 0.3 });
  const frame = new THREE.Mesh(new RoundedBoxGeometry(FRAME, 0.6, FRAME, 4, 0.1), woodMat);
  frame.position.y = -0.3;
  frame.castShadow = true;
  frame.receiveShadow = true;
  scene.add(frame);
  const boardTex = makeBoardTexture(renderer);
  const paint = new THREE.Mesh(
    new THREE.PlaneGeometry(10, 10),
    new THREE.MeshPhysicalMaterial({ map: boardTex, roughness: 0.78, clearcoat: 0.04, clearcoatRoughness: 0.6 })
  );
  paint.rotation.x = -Math.PI / 2;
  paint.position.y = 0.012;
  paint.receiveShadow = true;
  scene.add(paint);
  const gold = new THREE.MeshStandardMaterial({ color: 0xd4a52a, metalness: 0.95, roughness: 0.28 });
  [[0, -5.05, 10.2, 0.1], [0, 5.05, 10.2, 0.1], [-5.05, 0, 0.1, 10.2], [5.05, 0, 0.1, 10.2]].forEach(([x, z, w, d]) => {
    const trim = new THREE.Mesh(new THREE.BoxGeometry(w, 0.07, d), gold);
    trim.position.set(x, 0.04, z);
    trim.castShadow = true;
    scene.add(trim);
  });

  // felt tray + dice
  const DICE_HOME = new THREE.Vector3(0, 0.5 - 0.62 + 0.05, 8.5);
  const tray = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.8, 0.1, 64), new THREE.MeshStandardMaterial({ color: 0x1d4a34, roughness: 1 }));
  tray.position.set(DICE_HOME.x, -0.62 + 0.05, DICE_HOME.z);
  tray.receiveShadow = true;
  scene.add(tray);
  const trayRim = new THREE.Mesh(new THREE.TorusGeometry(1.8, 0.08, 12, 64), gold);
  trayRim.rotation.x = Math.PI / 2;
  trayRim.position.set(DICE_HOME.x, -0.62 + 0.1, DICE_HOME.z);
  scene.add(trayRim);
  const DICE_SIZE = 1.0;
  const dice = new THREE.Mesh(
    new RoundedBoxGeometry(DICE_SIZE, DICE_SIZE, DICE_SIZE, 5, 0.14),
    DICE_FACES.map(({ v }) => new THREE.MeshPhysicalMaterial({ map: makeDiceFaceTexture(v), roughness: 0.28, clearcoat: 0.6, clearcoatRoughness: 0.2 }))
  );
  dice.castShadow = true;
  dice.position.copy(DICE_HOME);
  scene.add(dice);
  const diceRing = new THREE.Mesh(
    new THREE.RingGeometry(0.85, 1.1, 48),
    new THREE.MeshBasicMaterial({ color: 0xffe08a, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })
  );
  diceRing.rotation.x = -Math.PI / 2;
  diceRing.position.set(DICE_HOME.x, -0.62 + 0.11, DICE_HOME.z);
  scene.add(diceRing);
  const UP = new THREE.Vector3(0, 1, 0);
  const diceQuat = (value, yaw) => {
    const face = DICE_FACES.find((f) => f.v === value);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(...face.n), UP);
    return new THREE.Quaternion().setFromAxisAngle(UP, yaw).multiply(q);
  };
  dice.quaternion.copy(diceQuat(6, 0.4));
  let diceEnabled = false;
  let diceRolling = false;

  // ladders
  const ladderWood = new THREE.MeshPhysicalMaterial({ map: makeWoodTexture(renderer, { base: "#c98a45", repeat: 1 }), roughness: 0.5, clearcoat: 0.3 });
  const railGeo = new THREE.BoxGeometry(0.11, 0.09, 1);
  const rungGeo = new THREE.CylinderGeometry(0.05, 0.05, 1, 10);
  Object.entries(LADDERS).forEach(([from, to]) => {
    const a = cellPos(Number(from));
    const b = cellPos(Number(to));
    const dir = new THREE.Vector3().subVectors(b, a);
    const len = dir.length();
    const yaw = Math.atan2(dir.x, dir.z);
    const mid = a.clone().add(b).multiplyScalar(0.5);
    const g = new THREE.Group();
    g.position.set(mid.x, 0.07, mid.z);
    g.rotation.y = yaw;
    [-0.2, 0.2].forEach((off) => {
      const rail = new THREE.Mesh(railGeo, ladderWood);
      rail.scale.z = len;
      rail.position.x = off;
      rail.castShadow = true;
      g.add(rail);
    });
    const rungs = Math.max(3, Math.round(len / 0.45));
    for (let i = 1; i < rungs; i += 1) {
      const rung = new THREE.Mesh(rungGeo, ladderWood);
      rung.rotation.z = Math.PI / 2;
      rung.scale.y = 0.4;
      rung.position.set(0, 0.02, -len / 2 + (i / rungs) * len);
      rung.castShadow = true;
      g.add(rung);
    }
    scene.add(g);
  });

  // snakes
  const snakeCurves = {};
  Object.entries(SNAKES).forEach(([from, to], i) => {
    const head = cellPos(Number(from));
    const tail = cellPos(Number(to));
    const dir = new THREE.Vector3().subVectors(tail, head);
    const len = dir.length();
    const side = new THREE.Vector3(-dir.z, 0, dir.x).normalize();
    const waves = Math.max(1.5, len / 3.3);
    const amp = 0.42 + Math.min(0.35, len / 22);
    const pts = [];
    const N = 34;
    for (let k = 0; k <= N; k += 1) {
      const t = k / N;
      const off = Math.sin(t * Math.PI * 2 * waves) * amp * (0.4 + 0.6 * Math.sin(Math.min(1, t * 1.2) * Math.PI * 0.5));
      const p = head.clone().addScaledVector(dir, t).addScaledVector(side, off);
      p.y = 0.2 + Math.sin(t * Math.PI * waves * 2) * 0.03;
      pts.push(p);
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    snakeCurves[from] = curve;
    const [base, dark] = SNAKE_STYLES[i % SNAKE_STYLES.length];
    const tex = makeScaleTexture(base, dark, renderer);
    const radiusAt = (t) => {
      if (t < 0.06) return 0.16;
      const body = 0.2 - 0.03 * t;
      const taper = t > 0.62 ? Math.pow(1 - (t - 0.62) / 0.38, 1.4) : 1;
      return Math.max(0.028, body * taper);
    };
    const geo = taperedTube(curve, radiusAt, { segments: Math.round(60 + len * 12), radial: 18, tile: Math.max(5, len * 1.6) });
    const mat = new THREE.MeshPhysicalMaterial({ map: tex, roughness: 0.32, clearcoat: 0.6, clearcoatRoughness: 0.25 });
    const body = new THREE.Mesh(geo, mat);
    body.castShadow = true;
    body.receiveShadow = true;
    scene.add(body);
    // head
    const headGroup = new THREE.Group();
    const p0 = curve.getPointAt(0);
    const tangent = curve.getTangentAt(0).multiplyScalar(-1); // pointing away from the body
    headGroup.position.copy(p0);
    headGroup.lookAt(p0.clone().add(tangent));
    const skull = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 20), new THREE.MeshPhysicalMaterial({ color: base, roughness: 0.3, clearcoat: 0.6 }));
    skull.scale.set(0.27, 0.19, 0.36);
    skull.position.set(0, 0.02, 0.1);
    skull.castShadow = true;
    headGroup.add(skull);
    [-1, 1].forEach((s) => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.075, 16, 12), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.2, clearcoat: 1 }));
      eye.position.set(0.14 * s, 0.11, 0.2);
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 10), new THREE.MeshBasicMaterial({ color: 0x111111 }));
      pupil.position.set(0.15 * s, 0.12, 0.26);
      headGroup.add(eye, pupil);
    });
    const tongueMat = new THREE.MeshStandardMaterial({ color: 0xe11d48, roughness: 0.5 });
    const stem = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.012, 0.3), tongueMat);
    stem.position.set(0, 0, 0.52);
    headGroup.add(stem);
    [-1, 1].forEach((s) => {
      const fork = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.012, 0.14), tongueMat);
      fork.position.set(0.05 * s, 0, 0.72);
      fork.rotation.y = 0.5 * s;
      headGroup.add(fork);
    });
    scene.add(headGroup);
  });

  // pawns
  const pawnProfile = [[0, 0], [0.34, 0], [0.36, 0.04], [0.31, 0.1], [0.21, 0.19], [0.15, 0.3], [0.125, 0.44], [0.2, 0.49], [0.2, 0.54], [0.12, 0.58], [0, 0.58]].map(([x, y]) => new THREE.Vector2(x, y));
  const pawnGeo = new THREE.LatheGeometry(pawnProfile, 40);
  const rimGeo = new THREE.TorusGeometry(0.33, 0.04, 12, 40);
  const collarGeo = new THREE.TorusGeometry(0.19, 0.03, 12, 32);
  const headGeo = new THREE.SphereGeometry(0.21, 32, 24);
  const blobTex = makeBlobTexture();
  const blobGeo = new THREE.PlaneGeometry(1.4, 1.4);
  const ringGeo = new THREE.RingGeometry(0.4, 0.5, 40);
  let pawns = [];
  let positions = [];
  let turn = -1;

  function buildPawn(i) {
    const mat = new THREE.MeshPhysicalMaterial({ color: PAWN_COLORS[i], roughness: 0.32, metalness: 0.05, clearcoat: 0.7, clearcoatRoughness: 0.18 });
    const root = new THREE.Group();
    const body = new THREE.Group();
    const base = new THREE.Mesh(pawnGeo, mat);
    const head = new THREE.Mesh(headGeo, mat);
    head.position.y = 0.74;
    base.castShadow = head.castShadow = true;
    const rimMat = new THREE.MeshStandardMaterial({ color: RIM_COLORS[i], roughness: 0.3, metalness: 0.2 });
    const rimM = new THREE.Mesh(rimGeo, rimMat);
    rimM.rotation.x = Math.PI / 2;
    rimM.position.y = 0.05;
    const collar = new THREE.Mesh(collarGeo, rimMat);
    collar.rotation.x = Math.PI / 2;
    collar.position.y = 0.52;
    body.add(base, head, rimM, collar);
    body.scale.setScalar(0.92);
    const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.03;
    ring.visible = false;
    const blob = new THREE.Mesh(blobGeo, new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false, opacity: 0.55 }));
    blob.rotation.x = -Math.PI / 2;
    blob.position.y = 0.02;
    root.add(blob, body, ring);
    scene.add(root);
    return { root, body, ring, blob, busy: 0, target: new THREE.Vector3(), bob: 0 };
  }

  const YARD = (i, count) => {
    // pawns waiting to enter sit in a tidy row along the front edge of the board, left of square 1
    return new THREE.Vector3(-5.65, 0, 4.4 - i * 0.95);
  };
  function slotFor(i) {
    const pos = positions[i];
    if (!pos) return YARD(i, positions.length);
    const c = cellPos(pos);
    const same = positions.map((p, k) => (p === pos ? k : -1)).filter((k) => k >= 0);
    if (same.length > 1) {
      const s = same.indexOf(i);
      const a = (s / same.length) * Math.PI * 2 + 0.6;
      c.x += Math.cos(a) * 0.24;
      c.z += Math.sin(a) * 0.24;
    }
    return c;
  }
  function relayout(except = -1, tween = true) {
    pawns.forEach((p, i) => {
      if (i === except) return;
      p.target.copy(slotFor(i));
      if (!tween) p.root.position.copy(p.target);
    });
  }

  // tweening + particles
  const tweens = new Set();
  function tween(duration, onUpdate) {
    return new Promise((resolve) => {
      tweens.add({ start: performance.now(), duration: duration * 1000, onUpdate, resolve });
    });
  }
  const bursts = [];
  function burst(position, color, count = 60) {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const vel = [];
    for (let i = 0; i < count; i += 1) {
      pos.set([position.x, position.y + 0.3, position.z], i * 3);
      vel.push(new THREE.Vector3((Math.random() - 0.5) * 5, 2 + Math.random() * 5, (Math.random() - 0.5) * 5));
    }
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color, size: 0.16, transparent: true, depthWrite: false }));
    scene.add(pts);
    bursts.push({ pts, vel, life: 1.4 });
  }

  // ---- public API ----
  const api = {
    setPlayers(list) {
      pawns.forEach((p) => scene.remove(p.root));
      pawns = list.map((_, i) => buildPawn(i));
      positions = list.map(() => 0);
      turn = -1;
      relayout(-1, false);
    },
    setTurn(i) {
      turn = i;
    },
    setPos(i, pos) {
      positions[i] = pos;
      relayout(-1, true);
    },
    async hop(i, pos) {
      const p = pawns[i];
      const from = p.root.position.clone();
      positions[i] = pos;
      const to = slotFor(i);
      p.busy += 1;
      await tween(0.2, (k) => {
        p.root.position.set(THREE.MathUtils.lerp(from.x, to.x, k), Math.sin(k * Math.PI) * 0.4, THREE.MathUtils.lerp(from.z, to.z, k));
      });
      p.root.position.copy(to);
      p.busy -= 1;
      relayout(i, true);
    },
    async jump(i, fromSq, toSq, kind) {
      const p = pawns[i];
      p.busy += 1;
      const startPos = p.root.position.clone();
      positions[i] = toSq;
      const end = slotFor(i);
      if (kind === "snake") {
        const curve = snakeCurves[fromSq];
        await tween(1.5, (k) => {
          const t = ease(k);
          const pt = curve.getPointAt(t);
          p.root.position.set(pt.x, pt.y + 0.05, pt.z);
          p.body.rotation.z = Math.sin(k * 14) * 0.18;
        });
        p.body.rotation.z = 0;
      } else {
        await tween(1.1, (k) => {
          const t = ease(k);
          p.root.position.set(THREE.MathUtils.lerp(startPos.x, end.x, t), 0.07 + Math.abs(Math.sin(k * Math.PI * 6)) * 0.13, THREE.MathUtils.lerp(startPos.z, end.z, t));
        });
      }
      p.root.position.copy(end);
      p.busy -= 1;
      relayout(i, true);
    },
    rollDice(value) {
      if (diceRolling) return Promise.resolve();
      diceRolling = true;
      const startQ = dice.quaternion.clone();
      const finalQ = diceQuat(value, Math.random() * Math.PI * 2);
      const axis = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
      const spin = Math.PI * (7 + Math.random() * 3);
      const from = dice.position.clone();
      from.y = DICE_HOME.y;
      const landing = DICE_HOME.clone().add(new THREE.Vector3((Math.random() - 0.5) * 1.6, 0, (Math.random() - 0.5) * 0.8));
      const tmp = new THREE.Quaternion();
      return tween(1.3, (k) => {
        let h;
        if (k < 0.62) h = 3 * 4 * (k / 0.62) * (1 - k / 0.62);
        else if (k < 0.82) h = 0.6 * 4 * ((k - 0.62) / 0.2) * (1 - (k - 0.62) / 0.2);
        else h = 0.16 * 4 * ((k - 0.82) / 0.18) * (1 - (k - 0.82) / 0.18);
        const travel = ease(Math.min(1, k / 0.82));
        dice.position.set(THREE.MathUtils.lerp(from.x, landing.x, travel), DICE_HOME.y + h, THREE.MathUtils.lerp(from.z, landing.z, travel));
        const remaining = Math.pow(1 - k, 1.6);
        tmp.setFromAxisAngle(axis, spin * remaining);
        dice.quaternion.copy(tmp).multiply(k < 0.1 ? startQ.clone().slerp(finalQ, k / 0.1) : finalQ);
      }).then(() => {
        dice.quaternion.copy(finalQ);
        dice.position.copy(landing);
        diceRolling = false;
      });
    },
    setDiceEnabled(on) {
      diceEnabled = on;
      renderer.domElement.style.cursor = on ? "pointer" : "grab";
    },
    celebrate(i) {
      const c = pawns[i] ? pawns[i].root.position : new THREE.Vector3();
      [0xffd25a, 0xff6b6b, 0x6bd6ff, 0x9bff8a].forEach((col, k) => setTimeout(() => burst(c, col, 50), k * 160));
    },
    resetView() {
      placeCamera();
    },
    dispose() {
      renderer.setAnimationLoop(null);
      renderer.dispose();
      renderer.domElement.remove();
      window.removeEventListener("resize", resize);
    },
    el: renderer.domElement,
  };

  // ---- camera and sizing ----
  function placeCamera() {
    const aspect = Math.max(0.3, camera.aspect);
    const fovV = THREE.MathUtils.degToRad(camera.fov);
    const distW = (aspect < 0.85 ? 6.5 : 6.05) / (Math.tan(fovV / 2) * aspect); // fit the board width
    const distH = 7.0 / Math.tan(fovV / 2); // and the board + dice tray depth
    const dist = Math.max(distW, distH * 0.98);
    const polar = aspect < 0.85 ? 0.5 : 0.62;
    camera.position.set(TARGET.x, TARGET.y + dist * Math.cos(polar), TARGET.z + dist * Math.sin(polar));
    controls.target.copy(TARGET);
    controls.update();
  }
  function resize() {
    const w = container.clientWidth || 640;
    const h = container.clientHeight || 640;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  placeCamera();
  window.addEventListener("resize", () => {
    resize();
    placeCamera();
  });
  new ResizeObserver(() => {
    resize();
  }).observe(container);

  // clicking the dice
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let down = null;
  renderer.domElement.addEventListener("pointerdown", (e) => (down = { x: e.clientX, y: e.clientY }));
  renderer.domElement.addEventListener("pointerup", (e) => {
    if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) return;
    down = null;
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    if (ray.intersectObject(dice).length && diceEnabled) onDiceClick?.();
  });

  // ---- render loop ----
  const clock = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    const dt = Math.min(0.05, clock.getDelta());
    const now = performance.now();
    tweens.forEach((t) => {
      const k = Math.min(1, (now - t.start) / t.duration);
      t.onUpdate(k);
      if (k >= 1) {
        tweens.delete(t);
        t.resolve();
      }
    });
    const time = now / 1000;
    pawns.forEach((p, i) => {
      if (!p.busy) {
        p.root.position.x += (p.target.x - p.root.position.x) * Math.min(1, dt * 10);
        p.root.position.z += (p.target.z - p.root.position.z) * Math.min(1, dt * 10);
        const bob = i === turn ? 0.06 + Math.sin(time * 5) * 0.05 : 0;
        p.root.position.y += (bob - p.root.position.y) * Math.min(1, dt * 12);
      }
      p.ring.visible = i === turn && !p.busy;
      if (p.ring.visible) p.ring.material.opacity = 0.32 + Math.sin(time * 5) * 0.16;
      p.blob.position.y = 0.02 - p.root.position.y;
    });
    diceRing.material.opacity = diceEnabled && !diceRolling ? 0.16 + Math.sin(time * 4) * 0.1 : 0;
    for (let i = bursts.length - 1; i >= 0; i -= 1) {
      const b = bursts[i];
      b.life -= dt;
      const arr = b.pts.geometry.attributes.position;
      b.vel.forEach((v, k) => {
        v.y -= 9 * dt;
        arr.setXYZ(k, arr.getX(k) + v.x * dt, arr.getY(k) + v.y * dt, arr.getZ(k) + v.z * dt);
      });
      arr.needsUpdate = true;
      b.pts.material.opacity = Math.max(0, b.life / 1.4);
      if (b.life <= 0) {
        scene.remove(b.pts);
        bursts.splice(i, 1);
      }
    }
    controls.update();
    renderer.render(scene, camera);
  });

  return api;
}
