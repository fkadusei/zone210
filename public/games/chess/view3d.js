/**
 * 3D chess view (three.js). Knows nothing about the rules: the controller tells it what to show
 * (update) and which move to animate (animateMove), and it reports clicks on squares (onSquare).
 *
 * Board index = row * 8 + col, row 0 = rank 8. World: x = col - 3.5, z = row - 3.5, top of the board at y = 0.
 */
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { buildPiece } from "./pieces3d.js";

const isWhitePiece = (p) => p === p.toUpperCase();
const posOf = (i) => new THREE.Vector3((i % 8) - 3.5, 0, Math.floor(i / 8) - 3.5);
const ease = (k) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
const VALUE = { P: 1, N: 3, B: 3, R: 5, Q: 9, K: 0 };

function marbleTexture(renderer) {
  const S = 512;
  const c = document.createElement("canvas");
  c.width = c.height = S;
  const g = c.getContext("2d");
  g.fillStyle = "#ffffff";
  g.fillRect(0, 0, S, S);
  for (let i = 0; i < 46; i += 1) {
    g.strokeStyle = `rgba(90, 100, 130, ${0.03 + Math.random() * 0.07})`;
    g.lineWidth = 0.6 + Math.random() * 2.2;
    g.beginPath();
    let x = Math.random() * S;
    let y = Math.random() * S;
    g.moveTo(x, y);
    for (let k = 0; k < 6; k += 1) {
      x += (Math.random() - 0.5) * 160;
      y += (Math.random() - 0.5) * 160;
      g.lineTo(x, y);
    }
    g.stroke();
  }
  for (let i = 0; i < 1400; i += 1) {
    g.fillStyle = `rgba(80, 90, 120, ${Math.random() * 0.05})`;
    g.fillRect(Math.random() * S, Math.random() * S, 2, 2);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return t;
}

function labelTexture(text, size = 128) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d");
  g.fillStyle = "#e8b83a";
  g.font = `700 ${size * 0.62}px ui-sans-serif, system-ui, sans-serif`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(text, size / 2, size / 2 + 4);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function glowTexture(r, g, b) {
  const S = 128;
  const c = document.createElement("canvas");
  c.width = c.height = S;
  const ctx = c.getContext("2d");
  const grad = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.95)`);
  grad.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, 0.45)`);
  grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, S, S);
  return new THREE.CanvasTexture(c);
}

export function createView3D(container, { onSquare }) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.matchMedia && window.matchMedia("(pointer: coarse)").matches ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.style.touchAction = "none";
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.6;

  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.minDistance = 7;
  controls.maxDistance = 30;
  controls.minPolarAngle = 0.2;
  controls.maxPolarAngle = 1.4;
  controls.rotateSpeed = 0.7;
  controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_ROTATE };
  controls.target.set(0, 0.3, 0);

  // lights
  scene.add(new THREE.HemisphereLight(0xdfe6ff, 0x2a2a44, 0.45));
  const key = new THREE.DirectionalLight(0xfff1dc, 1.9);
  key.position.set(-6, 13, 8);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 1, far: 40 });
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.03;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x9fb4ff, 0.9);
  rim.position.set(7, 6, -9);
  scene.add(rim);

  // soft shadow catcher so the board floats over the page background
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.ShadowMaterial({ opacity: 0.3 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.61;
  floor.receiveShadow = true;
  scene.add(floor);

  /* ---------- board ---------- */
  const marble = marbleTexture(renderer);
  const lightMat = new THREE.MeshPhysicalMaterial({ color: 0xd9d3c1, map: marble, roughness: 0.32, clearcoat: 0.5, clearcoatRoughness: 0.25 });
  const darkMat = new THREE.MeshPhysicalMaterial({ color: 0x2c3866, map: marble, roughness: 0.3, clearcoat: 0.6, clearcoatRoughness: 0.2 });
  const frameMat = new THREE.MeshPhysicalMaterial({ color: 0x141a31, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.15, metalness: 0.1 });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xe8b83a, metalness: 1, roughness: 0.28 });

  const boardGroup = new THREE.Group();
  scene.add(boardGroup);
  const squareGeo = new THREE.BoxGeometry(1, 0.3, 1);
  const squares = [];
  const squareMeshes = [];
  for (let i = 0; i < 64; i += 1) {
    const m = new THREE.Mesh(squareGeo, ((i % 8) + Math.floor(i / 8)) % 2 === 0 ? lightMat : darkMat);
    const p = posOf(i);
    m.position.set(p.x, -0.15, p.z);
    m.receiveShadow = true;
    m.userData.sq = i;
    boardGroup.add(m);
    squares[i] = m;
    squareMeshes.push(m);
  }
  const plate = new THREE.Mesh(new THREE.BoxGeometry(9.5, 0.3, 9.5), frameMat);
  plate.position.y = -0.45;
  plate.receiveShadow = true;
  plate.castShadow = true;
  boardGroup.add(plate);
  const bar = (w, d, x, z, mat, h = 0.34, y = -0.13) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    b.position.set(x, y, z);
    b.castShadow = true;
    b.receiveShadow = true;
    boardGroup.add(b);
  };
  const outer = 9.5;
  const edge = (outer - 8) / 2; // frame thickness
  bar(outer, edge, 0, -(4 + edge / 2), frameMat);
  bar(outer, edge, 0, 4 + edge / 2, frameMat);
  bar(edge, 8, -(4 + edge / 2), 0, frameMat);
  bar(edge, 8, 4 + edge / 2, 0, frameMat);
  // gold inlay along the inside edge of the frame
  bar(8.16, 0.06, 0, -4.03, goldMat, 0.05, 0.03);
  bar(8.16, 0.06, 0, 4.03, goldMat, 0.05, 0.03);
  bar(0.06, 8, -4.03, 0, goldMat, 0.05, 0.03);
  bar(0.06, 8, 4.03, 0, goldMat, 0.05, 0.03);
  // coordinate labels on the frame
  const labelGeo = new THREE.PlaneGeometry(0.36, 0.36);
  for (let c = 0; c < 8; c += 1) {
    const tex = labelTexture("abcdefgh"[c]);
    for (const z of [-4.4, 4.4]) {
      const l = new THREE.Mesh(labelGeo, new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
      l.rotation.x = -Math.PI / 2;
      l.position.set(c - 3.5, 0.06, z);
      boardGroup.add(l);
    }
  }
  for (let r = 0; r < 8; r += 1) {
    const tex = labelTexture(String(8 - r));
    for (const x of [-4.4, 4.4]) {
      const l = new THREE.Mesh(labelGeo, new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
      l.rotation.x = -Math.PI / 2;
      l.position.set(x, 0.06, r - 3.5);
      boardGroup.add(l);
    }
  }

  /* ---------- pieces ---------- */
  const mats = {
    white: new THREE.MeshPhysicalMaterial({ color: 0xf3ead6, roughness: 0.24, clearcoat: 1, clearcoatRoughness: 0.1, sheen: 0.4, sheenColor: new THREE.Color(0xfff6e0) }),
    black: new THREE.MeshPhysicalMaterial({ color: 0x1b1d2e, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.08, metalness: 0.1 }),
    groove: (white) => (white ? grooveWhite : grooveBlack),
  };
  const grooveWhite = new THREE.MeshStandardMaterial({ color: 0x6b6459, roughness: 0.6 });
  const grooveBlack = new THREE.MeshStandardMaterial({ color: 0xc9cfe6, roughness: 0.5 });

  const piecesGroup = new THREE.Group();
  scene.add(piecesGroup);
  const pieces = new Map(); // square index -> Group
  const trayGroup = new THREE.Group();
  scene.add(trayGroup);

  function createPiece(letter, sq, pop) {
    const g = buildPiece(letter.toUpperCase(), isWhitePiece(letter), mats);
    const p = posOf(sq);
    g.position.set(p.x, 0, p.z);
    g.userData.sq = sq;
    g.userData.rest = 0;
    piecesGroup.add(g);
    pieces.set(sq, g);
    if (pop) {
      g.scale.setScalar(0.01);
      tween(0.35, (k) => g.scale.setScalar(0.01 + 0.99 * (1 - Math.pow(1 - k, 3)) * (k < 1 ? 1 + Math.sin(k * Math.PI) * 0.12 : 1)));
    }
    return g;
  }

  function removePiece(sq) {
    const g = pieces.get(sq);
    if (!g) return;
    piecesGroup.remove(g);
    pieces.delete(sq);
  }

  function syncPieces(board, instant) {
    // drop meshes that no longer match the position
    for (const [sq, g] of [...pieces]) {
      if (board[sq] !== g.userData.type || g.userData.leaving) removePiece(sq);
    }
    for (let i = 0; i < 64; i += 1) {
      const letter = board[i];
      if (letter && !pieces.has(i)) createPiece(letter, i, !instant);
    }
    // snap any mesh that is not where it should be (e.g. after undo)
    for (const [sq, g] of pieces) {
      if (g.userData.busy) continue;
      const p = posOf(sq);
      if (Math.abs(g.position.x - p.x) > 0.001 || Math.abs(g.position.z - p.z) > 0.001) g.position.set(p.x, g.position.y, p.z);
      g.userData.sq = sq;
    }
  }

  function syncTrays(board) {
    while (trayGroup.children.length) trayGroup.remove(trayGroup.children[0]);
    const START = { P: 8, N: 2, B: 2, R: 2, Q: 1 };
    for (const color of ["w", "b"]) {
      const count = {};
      for (const p of board) if (p && (isWhitePiece(p) ? "w" : "b") === color) count[p.toUpperCase()] = (count[p.toUpperCase()] || 0) + 1;
      const lost = [];
      for (const t of ["Q", "R", "B", "N", "P"]) for (let k = 0; k < Math.max(0, START[t] - (count[t] || 0)); k += 1) lost.push(t);
      lost.forEach((t, n) => {
        const g = buildPiece(t, color === "w", mats);
        g.scale.setScalar(0.38);
        const col = Math.floor(n / 8);
        const row = n % 8;
        // white's lost pieces wait on the left of the board, black's on the right
        const x = (color === "w" ? -5.2 : 5.2) + (color === "w" ? -col : col) * 0.5;
        g.position.set(x, -0.3 + 0.0, -3.4 + row * 0.62);
        g.rotation.y += Math.random() * 0.4 - 0.2;
        trayGroup.add(g);
      });
    }
  }

  /* ---------- markers ---------- */
  const markers = new THREE.Group();
  scene.add(markers);
  const goldGlow = new THREE.MeshBasicMaterial({ color: 0xf5b41f, transparent: true, opacity: 0.85, depthWrite: false });
  const dotGeo = new THREE.CircleGeometry(0.17, 32);
  const ringGeo = new THREE.RingGeometry(0.34, 0.46, 40);
  const tileGeo = new THREE.PlaneGeometry(1, 1);
  const lastMat = new THREE.MeshBasicMaterial({ color: 0xf5b41f, transparent: true, opacity: 0.42, depthWrite: false });
  const hintMat = new THREE.MeshBasicMaterial({ color: 0x5b7bff, transparent: true, opacity: 0.55, depthWrite: false });
  const hoverMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.22, depthWrite: false });
  const flat = (mesh, i, y = 0.012) => {
    mesh.rotation.x = -Math.PI / 2;
    const p = posOf(i);
    mesh.position.set(p.x, y, p.z);
    return mesh;
  };
  const lastTiles = [0, 1].map(() => {
    const m = new THREE.Mesh(tileGeo, lastMat);
    m.visible = false;
    markers.add(m);
    return m;
  });
  const hintTiles = [0, 1].map(() => {
    const m = new THREE.Mesh(tileGeo, hintMat);
    m.visible = false;
    markers.add(m);
    return m;
  });
  const hoverTile = new THREE.Mesh(tileGeo, hoverMat);
  hoverTile.visible = false;
  markers.add(hoverTile);
  const selRing = new THREE.Mesh(new THREE.RingGeometry(0.4, 0.5, 48), new THREE.MeshBasicMaterial({ color: 0xf5b41f, transparent: true, opacity: 0.95, depthWrite: false }));
  selRing.visible = false;
  markers.add(selRing);
  const checkGlow = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 2.1), new THREE.MeshBasicMaterial({ map: glowTexture(255, 60, 70), transparent: true, depthWrite: false }));
  checkGlow.visible = false;
  markers.add(checkGlow);
  const targetMarkers = [];

  /* ---------- tweens, particles ---------- */
  const tweens = new Set();
  function tween(duration, fn) {
    return new Promise((resolve) => {
      tweens.add({ t: 0, duration, fn, resolve });
    });
  }
  const bursts = [];
  function burst(position, colors, { count = 40, speed = 3.5, life = 1, size = 0.1 } = {}) {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const vel = [];
    const c = new THREE.Color();
    for (let i = 0; i < count; i += 1) {
      pos.set([position.x, position.y + 0.3, position.z], i * 3);
      c.set(colors[i % colors.length]);
      col.set([c.r, c.g, c.b], i * 3);
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.3 + Math.random() * 0.7);
      vel.push(new THREE.Vector3(Math.cos(a) * s, (0.6 + Math.random()) * speed * 0.8, Math.sin(a) * s));
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    const mat = new THREE.PointsMaterial({ size, vertexColors: true, transparent: true, depthWrite: false });
    const pts = new THREE.Points(geo, mat);
    pts.frustumCulled = false;
    scene.add(pts);
    bursts.push({ pts, geo, mat, vel, age: 0, life });
  }

  /* ---------- camera ---------- */
  let flipped = false;
  let userMoved = false;
  let azimuth = 0;
  controls.addEventListener("start", () => {
    userMoved = true;
  });
  function cameraPosition(az = azimuth) {
    const aspect = container.clientWidth / Math.max(1, container.clientHeight);
    const dist = Math.max(10.5, 5.5 / (Math.tan(THREE.MathUtils.degToRad(17.5)) * aspect));
    const polar = aspect < 0.85 ? 0.6 : 0.92;
    return new THREE.Vector3(Math.sin(az) * Math.sin(polar) * dist, Math.cos(polar) * dist, Math.cos(az) * Math.sin(polar) * dist).add(controls.target);
  }
  let wakeFrames = 8; // draw a few frames after anything changes; when nothing changes, nothing is drawn
  const wake = () => {
    wakeFrames = 8;
  };
  function resize() {
    wake();
    const w = Math.max(1, container.clientWidth);
    const h = Math.max(1, container.clientHeight);
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    if (!userMoved) camera.position.copy(cameraPosition());
  }
  new ResizeObserver(resize).observe(container);
  resize();
  camera.position.copy(cameraPosition());

  function setFlipped(value, animate = true) {
    if (value === flipped && !animate) return Promise.resolve();
    flipped = value;
    userMoved = false;
    const from = azimuth;
    let to = flipped ? Math.PI : 0;
    while (to - from > Math.PI) to -= Math.PI * 2;
    while (to - from < -Math.PI) to += Math.PI * 2;
    if (!animate) {
      azimuth = to;
      camera.position.copy(cameraPosition());
      return Promise.resolve();
    }
    return tween(0.9, (k) => {
      azimuth = THREE.MathUtils.lerp(from, to, ease(k));
      camera.position.copy(cameraPosition());
    }).then(() => {
      azimuth = to;
    });
  }

  function intro() {
    userMoved = false;
    const end = cameraPosition();
    const start = end.clone().add(new THREE.Vector3(-6, 9, 5));
    return tween(1.6, (k) => {
      const e = 1 - Math.pow(1 - k, 3);
      camera.position.lerpVectors(start, cameraPosition(), e);
    });
  }

  /* ---------- picking / hover ---------- */
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let hoverSq = -1;
  controls.addEventListener("change", wake);
  let pickable = new Set();
  let downAt = null;

  function squareAt(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects([...piecesGroup.children, ...squareMeshes], true);
    for (const hit of hits) {
      let o = hit.object;
      while (o && o.userData.sq === undefined) o = o.parent;
      if (o) return o.userData.sq;
    }
    return -1;
  }
  renderer.domElement.addEventListener("pointermove", (e) => {
    if (e.buttons) return;
    const prevHover = hoverSq;
    hoverSq = squareAt(e);
    if (hoverSq !== prevHover) wake();
    renderer.domElement.style.cursor = hoverSq >= 0 && pickable.has(hoverSq) ? "pointer" : "grab";
  });
  renderer.domElement.addEventListener("pointerleave", () => {
    hoverSq = -1;
    wake();
  });
  renderer.domElement.addEventListener("pointerdown", (e) => {
    downAt = { x: e.clientX, y: e.clientY };
  });
  renderer.domElement.addEventListener("pointerup", (e) => {
    if (!downAt) return;
    const moved = Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y);
    downAt = null;
    if (moved > 6) return; // it was an orbit drag
    const sq = squareAt(e);
    if (sq >= 0) onSquare(sq);
  });

  /* ---------- public: state sync ---------- */
  let view = { board: [], selected: -1, targets: [], last: null, checkSq: -1, hint: [], over: false };
  let firstSync = true;

  function update(v, { instant = false } = {}) {
    view = { ...view, ...v };
    syncPieces(view.board, instant || firstSync);
    firstSync = false;
    syncTrays(view.board);
    pickable = new Set(v.pickable || []);

    // targets
    while (targetMarkers.length) markers.remove(targetMarkers.pop());
    (view.targets || []).forEach((i) => {
      const capture = !!view.board[i] || (view.capTargets || []).includes(i);
      const m = flat(new THREE.Mesh(capture ? ringGeo : dotGeo, goldGlow), i, 0.018);
      m.userData.pulse = capture ? 0.8 : 1;
      markers.add(m);
      targetMarkers.push(m);
    });
    // last-move tiles
    lastTiles.forEach((t, n) => {
      const i = view.last ? (n === 0 ? view.last.from : view.last.to) : -1;
      t.visible = i >= 0;
      if (i >= 0) flat(t, i);
    });
    hintTiles.forEach((t, n) => {
      const i = view.hint && view.hint.length ? view.hint[n] : -1;
      t.visible = i >= 0;
      if (i >= 0) flat(t, i, 0.016);
    });
    if (view.selected >= 0) {
      selRing.visible = true;
      flat(selRing, view.selected, 0.02);
    } else selRing.visible = false;
    if (view.checkSq >= 0) {
      checkGlow.visible = true;
      flat(checkGlow, view.checkSq, 0.014);
    } else checkGlow.visible = false;
    for (const [sq, g] of pieces) g.userData.rest = sq === view.selected ? 0.22 : 0;
  }

  /* ---------- public: move animation ---------- */
  function slide(g, from, to, jump) {
    const a = posOf(from);
    const b = posOf(to);
    g.userData.busy = true;
    const dist = a.distanceTo(b);
    return tween(0.32 + dist * 0.06, (k) => {
      const e = ease(k);
      g.position.set(THREE.MathUtils.lerp(a.x, b.x, e), Math.sin(Math.PI * k) * jump + (1 - k) * (g.userData.rest || 0), THREE.MathUtils.lerp(a.z, b.z, e));
      g.rotation.z = Math.sin(Math.PI * k) * 0.08 * Math.sign(b.x - a.x || 1);
    }).then(() => {
      g.position.set(b.x, 0, b.z);
      g.rotation.z = 0;
      g.userData.busy = false;
      g.userData.sq = to;
    });
  }

  function captureFx(g, sq) {
    const p = posOf(sq);
    g.userData.leaving = true;
    burst(p, [0xffd166, 0xffffff, isWhitePiece(g.userData.type) ? 0xf3ead6 : 0x4a4f7a], { count: 34, speed: 3.2, life: 0.9 });
    return tween(0.45, (k) => {
      g.position.y = k * 0.9;
      g.scale.setScalar(Math.max(0.001, 1 - k));
      g.rotation.y += 0.25;
    }).then(() => piecesGroup.remove(g));
  }

  async function animateMove(m, boardBefore) {
    const g = pieces.get(m.from);
    if (!g) return;
    const white = isWhitePiece(m.piece);
    const tasks = [];
    pieces.delete(m.from);
    g.userData.rest = 0;
    let victimSq = -1;
    if (m.flag === "ep") victimSq = m.to + (white ? 8 : -8);
    else if (m.capture) victimSq = m.to;
    const victim = victimSq >= 0 ? pieces.get(victimSq) : null;
    if (victim) pieces.delete(victimSq);
    pieces.set(m.to, g);
    const jump = m.piece.toUpperCase() === "N" ? 1.15 : 0.32;
    tasks.push(slide(g, m.from, m.to, jump));
    if (victim) tasks.push(new Promise((r) => setTimeout(r, 200)).then(() => captureFx(victim, victimSq)));
    if (m.flag === "castleK" || m.flag === "castleQ") {
      const rookFrom = m.flag === "castleK" ? m.to + 1 : m.to - 2;
      const rookTo = m.flag === "castleK" ? m.to - 1 : m.to + 1;
      const rook = pieces.get(rookFrom);
      if (rook) {
        pieces.delete(rookFrom);
        pieces.set(rookTo, rook);
        tasks.push(slide(rook, rookFrom, rookTo, 0.3));
      }
    }
    // if the tab is in the background animations pause: never let that block the game
    await Promise.race([Promise.all(tasks), new Promise((r) => setTimeout(r, 2500))]);
    if (victim && victim.parent) piecesGroup.remove(victim);
    g.userData.busy = false;
    g.position.set(posOf(m.to).x, 0, posOf(m.to).z);
    burst(posOf(m.to), [0xffffff, 0xf5b41f], { count: 10, speed: 1.2, life: 0.5, size: 0.06 });
  }

  function celebrate(winnerColor) {
    const cols = [0xf5b41f, 0xe5484d, 0x1f9d61, 0xffffff, 0x8a5ce0];
    [[-3, 0], [3, 0], [0, -3], [0, 3], [0, 0]].forEach(([x, z], i) => setTimeout(() => burst(new THREE.Vector3(x, 0.5, z), cols, { count: 90, speed: 6, life: 1.8, size: 0.14 }), i * 240));
    if (winnerColor) {
      for (const [sq, g] of pieces) if (g.userData.type.toUpperCase() === "K" && (winnerColor === "w") === isWhitePiece(g.userData.type)) tween(0.9, (k) => (g.rotation.y = Math.sin(k * Math.PI) * Math.PI * 2));
    }
  }

  /* ---------- frame loop ---------- */
  const clock = new THREE.Clock();
  let lastDraw = 0;
  renderer.setAnimationLoop(() => {
    const raw = clock.getDelta();
    const dt = Math.min(raw, 0.05);
    const tdt = Math.min(raw, 0.25);
    const time = clock.elapsedTime;

    tweens.forEach((tw) => {
      tw.t += tdt;
      const k = Math.min(1, tw.t / tw.duration);
      tw.fn(k);
      if (k >= 1) {
        tweens.delete(tw);
        tw.resolve();
      }
    });

    const follow = 1 - Math.exp(-14 * dt);
    for (const [sq, g] of pieces) {
      if (g.userData.busy || g.userData.leaving) continue;
      const lift = g.userData.rest + (g.userData.rest ? Math.abs(Math.sin(time * 4)) * 0.05 : 0);
      g.position.y += (lift - g.position.y) * follow;
    }
    targetMarkers.forEach((m) => {
      const s = m.userData.pulse * (1 + 0.14 * Math.sin(time * 5));
      m.scale.setScalar(s);
    });
    selRing.material.opacity = 0.7 + 0.25 * Math.sin(time * 5);
    checkGlow.material.opacity = 0.75 + 0.25 * Math.sin(time * 6);
    hintMat.opacity = 0.35 + 0.25 * Math.sin(time * 5);
    if (hoverSq >= 0 && pickable.has(hoverSq)) {
      hoverTile.visible = true;
      flat(hoverTile, hoverSq, 0.01);
    } else hoverTile.visible = false;

    for (let i = bursts.length - 1; i >= 0; i -= 1) {
      const b = bursts[i];
      b.age += dt;
      const arr = b.geo.attributes.position.array;
      b.vel.forEach((v, j) => {
        v.y -= 9.8 * dt;
        arr[j * 3] += v.x * dt;
        arr[j * 3 + 1] += v.y * dt;
        arr[j * 3 + 2] += v.z * dt;
      });
      b.geo.attributes.position.needsUpdate = true;
      b.mat.opacity = Math.max(0, 1 - b.age / b.life);
      if (b.age >= b.life) {
        scene.remove(b.pts);
        b.geo.dispose();
        b.mat.dispose();
        bursts.splice(i, 1);
      }
    }
    const moved = controls.update();
    const busyNow = tweens.size > 0 || bursts.length > 0 || moved;
    const pulsing = targetMarkers.length > 0 || selRing.visible || checkGlow.visible || hoverTile.visible || hintTiles.some((t) => t.visible) || [...pieces.values()].some((g) => g.userData.rest);
    if (wakeFrames > 0) wakeFrames -= 1;
    if (!busyNow && !pulsing && wakeFrames === 0) return; // nothing is changing: skip drawing
    const nowMs = performance.now();
    if (!busyNow && wakeFrames === 0 && nowMs - lastDraw < 33) return; // gentle pulses only need ~30 fps
    lastDraw = nowMs;
    renderer.render(scene, camera);
  });

  return {
    wake,
    update: (...a) => {
      wake();
      return update(...a);
    },
    animateMove,
    setFlipped: (...a) => {
      wake();
      return setFlipped(...a);
    },
    intro,
    celebrate: (...a) => {
      wake();
      return celebrate(...a);
    },
    resetView: () => setFlipped(flipped, true),
    dispose() {
      renderer.setAnimationLoop(null);
      renderer.dispose();
      renderer.domElement.remove();
    },
    canvas: renderer.domElement,
    _debug: { scene, camera, pieces, renderer },
  };
}
