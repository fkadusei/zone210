import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { FACTS as BASE_FACTS } from "./data/facts.js";
import { RAW as F_AFRICA } from "./data/facts-africa.js";
import { RAW as F_ASIA } from "./data/facts-asia.js";
import { RAW as F_EUROPE } from "./data/facts-europe.js";
import { RAW as F_AMERICAS } from "./data/facts-americas.js";

const $ = (id) => document.getElementById(id);
const store = {
  get(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch (err) {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      /* private mode */
    }
  },
};
const SPEED = new URLSearchParams(location.search).has("fast") ? 20 : 1; // ?fast is only for testing
const sleep = (ms) => new Promise((r) => setTimeout(r, ms / SPEED));
const shuffle = (a) => {
  const arr = a.slice();
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};
const fmt = (n) => Math.round(n).toLocaleString("en");
const ordinal = (n) => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};
const norm = (s) => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");

// ---------- settings ----------
const SETTINGS_KEY = "zone210_globe_settings";
const BEST_KEY = "zone210_globe_best";
const settings = { mode: "explore", level: "all", region: "All", muted: false, ...store.get(SETTINGS_KEY, {}) };
if (!["explore", "find", "name", "speed", "passport"].includes(settings.mode)) settings.mode = "explore";
if (!["kids", "all", "expert"].includes(settings.level)) settings.level = "all";
const saveSettings = () => store.set(SETTINGS_KEY, settings);

// ---------- passport: what you have seen and what you have got right ----------
const PASS_KEY = "zone210_globe_passport";
let pass = store.get(PASS_KEY, {});
const isMastered = (id) => !!(pass[id] && pass[id].r > 0);
const isVisited = (id) => !!(pass[id] && (pass[id].s || pass[id].r));
function stamp(id, kind) {
  const p = pass[id] || (pass[id] = { s: 0, r: 0 });
  const wasMastered = p.r > 0;
  if (kind === "right") p.r += 1;
  else p.s += 1;
  store.set(PASS_KEY, pass);
  if (!wasMastered && p.r > 0) toast(`🛂 Stamped: ${byId.get(id).name}`, "good", 1400);
}
const passStats = () => {
  const total = COUNTRIES.length;
  const mastered = COUNTRIES.filter((c) => isMastered(c.id)).length;
  const visited = COUNTRIES.filter((c) => isVisited(c.id)).length;
  return { total, mastered, visited };
};
const passRank = (m) => (m >= 195 ? ["🏆", "World Citizen"] : m >= 100 ? ["🎖️", "Ambassador"] : m >= 50 ? ["🧭", "Globetrotter"] : m >= 20 ? ["🎒", "Traveller"] : m >= 5 ? ["🗺️", "Explorer"] : ["🌱", "New Tourist"]);

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
    osc.type = type;
    osc.frequency.value = freq;
    amp.gain.setValueAtTime(0.0001, t);
    amp.gain.exponentialRampToValueAtTime(gain, t + 0.015);
    amp.gain.exponentialRampToValueAtTime(0.0001, t + length);
    osc.connect(amp).connect(audio.destination);
    osc.start(t);
    osc.stop(t + length + 0.02);
  } catch (err) {
    /* audio unavailable */
  }
}
const sfx = {
  pick: () => tone(520, 0, 0.06, "triangle", 0.07),
  right: () => [523, 659, 784].forEach((f, i) => tone(f, i * 0.08, 0.16, "triangle", 0.09)),
  wrong: () => [220, 170].forEach((f, i) => tone(f, i * 0.1, 0.18, "sawtooth", 0.06)),
  done: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, i * 0.1, 0.22, "triangle", 0.1)),
};

// ---------- data ----------
const world = await (await fetch("data/world.json")).json();
const COUNTRIES = world.countries;
const OTHERS = world.others;
const byId = new Map(COUNTRIES.map((c) => [c.id, c]));

const parseFacts = (raw) =>
  Object.fromEntries(
    raw
      .trim()
      .split("\n")
      .map((line) => {
        const [id, ...f] = line.split("|");
        return [id, f];
      })
  );
const extra = [F_AFRICA, F_ASIA, F_EUROPE, F_AMERICAS].map(parseFacts);
const WRITTEN = {};
COUNTRIES.forEach((c) => {
  WRITTEN[c.id] = [...(BASE_FACTS[c.id] || []), ...extra.flatMap((e) => e[c.id] || [])];
});

// rankings for the facts that are computed from the data
const byArea = [...COUNTRIES].sort((a, b) => b.area - a.area);
const byPop = [...COUNTRIES].sort((a, b) => b.pop - a.pop);
const rankArea = new Map(byArea.map((c, i) => [c.id, i + 1]));
const rankPop = new Map(byPop.map((c, i) => [c.id, i + 1]));
const bySub = new Map();
COUNTRIES.forEach((c) => {
  if (!bySub.has(c.subregion)) bySub.set(c.subregion, []);
  bySub.get(c.subregion).push(c);
});

function derivedFacts(c) {
  const out = [];
  const nA = COUNTRIES.length;
  const ar = rankArea.get(c.id);
  const pr = rankPop.get(c.id);
  out.push(
    ar <= 3 ? `By area, ${c.name} is number ${ar} of the ${nA} countries in this game, covering about ${fmt(c.area)} square kilometres.` : ar > nA - 5 ? `${c.name} is one of the five smallest of the ${nA} countries by area, at about ${fmt(c.area)} square kilometres.` : `${c.name} covers about ${fmt(c.area)} square kilometres, which makes it the ${ordinal(ar)} largest of the ${nA} countries by area.`
  );
  out.push(
    pr <= 3 ? `${c.name} has the ${ordinal(pr)} largest population of the ${nA} countries, with roughly ${fmt(c.pop)} people (2019 estimate).` : pr > nA - 5 ? `${c.name} is one of the five least populated countries, with roughly ${fmt(c.pop)} people (2019 estimate).` : `About ${fmt(c.pop)} people live in ${c.name} (2019 estimate), the ${ordinal(pr)} largest population of the ${nA} countries.`
  );
  const dens = c.pop / c.area;
  out.push(`${c.name} has about ${dens >= 100 ? fmt(dens) : dens.toFixed(1)} people for every square kilometre.`);
  if (c.borders.length === 0) out.push(`${c.name} has no land borders with other countries.`);
  else out.push(`${c.name} shares land borders with ${c.borders.length} ${c.borders.length === 1 ? "country" : "countries"}: ${c.borders.join(", ")}.`);
  out.push(c.landlocked ? `${c.name} is landlocked, which means it has no coast on the sea.` : `${c.name} has a coastline on the sea.`);
  if (c.languages.length) out.push(`The official ${c.languages.length === 1 ? "language" : "languages"} of ${c.name} ${c.languages.length === 1 ? "is" : "are"} ${c.languages.join(", ")}.`);
  if (c.currencies.length) out.push(`The money used in ${c.name} is the ${c.currencies.join(" and the ")}.`);
  if (c.native.length && norm(c.native[0]) !== norm(c.name)) out.push(`In its own language, ${c.name} is called "${c.native[0]}".`);
  if (c.demonym) out.push(`A person from ${c.name} is called ${/^[aeiou]/i.test(c.demonym) ? "an" : "a"} ${c.demonym}.`);
  if (c.tld) out.push(`${c.name}'s internet domain ends in ${c.tld}${c.dial ? `, and its international phone code is ${c.dial}` : ""}.`);
  const sub = bySub.get(c.subregion) || [];
  if (sub.length > 2) {
    const biggest = [...sub].sort((a, b) => b.area - a.area)[0];
    const smallest = [...sub].sort((a, b) => a.area - b.area)[0];
    const mostPop = [...sub].sort((a, b) => b.pop - a.pop)[0];
    if (biggest === c) out.push(`${c.name} is the largest country by area in ${c.subregion}.`);
    else if (smallest === c) out.push(`${c.name} is the smallest country by area in ${c.subregion}.`);
    else out.push(`${c.name} is one of ${sub.length} countries in ${c.subregion}.`);
    if (mostPop === c && biggest !== c) out.push(`${c.name} has the most people of any country in ${c.subregion}.`);
  }
  return out;
}
const factsFor = (c) => [...WRITTEN[c.id], ...derivedFacts(c)];

// which countries suit which level
const FAMOUS = new Set("USA CAN MEX BRA ARG PER COL CHL CUB JAM GBR FRA DEU ITA ESP PRT NLD GRC RUS CHN JPN IND EGY ZAF NGA GHA KEN ETH MAR TZA AUS NZL SAU TUR IRN IRQ IDN THA VNM KOR PHL PAK NOR SWE FIN ISL IRL CHE POL UKR SEN CIV COD MDG DZA LBY SDN UGA ZWE VEN BOL ECU".split(" "));
const levelPool = (level) => (level === "kids" ? COUNTRIES.filter((c) => FAMOUS.has(c.id)) : level === "all" ? COUNTRIES.filter((c) => FAMOUS.has(c.id) || c.pop > 8e6 || c.area > 300000) : COUNTRIES);

const CONTINENTS = ["Africa", "Asia", "Europe", "North America", "South America", "Oceania"];
const inRegion = (c, region) => region === "All" || c.continent === region || c.subregion === region;

// spellings people commonly use
const ALIASES = { USA: ["us", "usa", "america", "unitedstatesofamerica"], GBR: ["uk", "britain", "greatbritain", "england"], ARE: ["uae", "emirates"], CIV: ["cotedivoire", "ivorycoast"], CZE: ["czechrepublic"], TUR: ["turkey", "turkiye"], MMR: ["burma"], SWZ: ["swaziland"], CPV: ["caboverde"], COD: ["drc", "democraticrepublicofthecongo", "congokinshasa"], COG: ["republicofthecongo", "congobrazzaville"], TLS: ["easttimor"], VAT: ["holysee", "vatican"], MKD: ["macedonia"], BRN: ["brunei"], KOR: ["korea", "republicofkorea"], PRK: ["dprk"], GMB: ["thegambia"], BHS: ["thebahamas"], NLD: ["holland"], PSE: ["stateofpalestine"], LAO: ["laopdr"], STP: ["saotomeandprincipe"], BIH: ["bosnia"], TTO: ["trinidad"], VCT: ["saintvincent"], KNA: ["stkitts", "saintkitts"], LCA: ["stlucia"], ATG: ["antigua"] };
const matchesName = (c, guess) => {
  const g = norm(guess);
  if (!g) return false;
  return [c.name, c.official, ...(ALIASES[c.id] || [])].some((n) => norm(n) === g);
};

// ---------- flags ----------
function flagsSupported() {
  try {
    const ctx = document.createElement("canvas").getContext("2d");
    ctx.font = "32px sans-serif";
    return Math.abs(ctx.measureText("\u{1F1EC}\u{1F1ED}").width - ctx.measureText("GH").width) > 2;
  } catch (err) {
    return false;
  }
}
const FLAGS = flagsSupported();
const flagOf = (c) => (FLAGS ? c.flag : "");

// ---------- drawing the world onto a canvas ----------
const saverOn = () => !!(window.z210Saver && window.z210Saver.on);
const contHue = { Africa: [38, 64, 58], Asia: [352, 46, 62], Europe: [212, 48, 66], "North America": [132, 38, 52], "South America": [18, 62, 60], Oceania: [282, 40, 66] };
const hash = (s) => [...s].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7);
const landColor = (c) => {
  const [h, s, l] = contHue[c.continent];
  const j = (hash(c.id) % 13) - 6;
  return `hsl(${h + (j % 5)}, ${s}%, ${Math.max(38, Math.min(76, l + j))}%)`;
};

function tracePolys(ctx, polys, W, H) {
  ctx.beginPath();
  polys.forEach((rings) =>
    rings.forEach((ring) => {
      ring.forEach(([lon, lat], i) => {
        const x = ((lon + 180) / 360) * W;
        const y = ((90 - lat) / 180) * H;
        if (i) ctx.lineTo(x, y);
        else ctx.moveTo(x, y);
      });
      ctx.closePath();
    })
  );
}
const isTiny = (c) => c.bbox[2] - c.bbox[0] < 1.6 && c.bbox[3] - c.bbox[1] < 1.6;

function drawBase(W) {
  const H = W / 2;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  const sea = ctx.createLinearGradient(0, 0, 0, H);
  sea.addColorStop(0, "#143a6b");
  sea.addColorStop(0.5, "#1b5d94");
  sea.addColorStop(1, "#143a6b");
  ctx.fillStyle = sea;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "rgba(255,255,255,0.07)";
  ctx.lineWidth = W / 2048;
  for (let lon = -150; lon <= 180; lon += 30) {
    const x = ((lon + 180) / 360) * W;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  for (let lat = -60; lat <= 60; lat += 30) {
    const y = ((90 - lat) / 180) * H;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
  const px = W / 2048;
  ctx.lineJoin = "round";
  OTHERS.forEach((o) => {
    tracePolys(ctx, o.polys, W, H);
    ctx.fillStyle = o.id === "ATA" ? "#dfe9f5" : "#5d6b80";
    ctx.fill("evenodd");
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = 0.8 * px;
    ctx.stroke();
  });
  COUNTRIES.forEach((c) => {
    tracePolys(ctx, c.polys, W, H);
    ctx.fillStyle = landColor(c);
    ctx.fill("evenodd");
    ctx.strokeStyle = "rgba(255,255,255,0.75)";
    ctx.lineWidth = 1.1 * px;
    ctx.stroke();
  });
  // very small countries get a visible dot so they can be found and tapped
  COUNTRIES.filter(isTiny).forEach((c) => {
    const [lat, lon] = c.latlng;
    const x = ((lon + 180) / 360) * W;
    const y = ((90 - lat) / 180) * H;
    ctx.beginPath();
    ctx.arc(x, y, 3.2 * px, 0, Math.PI * 2);
    ctx.fillStyle = landColor(c);
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1.2 * px;
    ctx.stroke();
  });
  return canvas;
}

// ---------- finding a country from a point on the map ----------
function inRing(lon, lat, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
function inPolys(lon, lat, polys) {
  return polys.some((rings) => inRing(lon, lat, rings[0]) && !rings.slice(1).some((h) => inRing(lon, lat, h)));
}
function nearestDistance(c, lon, lat) {
  let best = Infinity;
  const k = Math.cos((lat * Math.PI) / 180);
  const d = (x, y) => Math.hypot((x - lon) * k, y - lat);
  c.polys.forEach((rings) => rings[0].forEach(([x, y]) => (best = Math.min(best, d(x, y)))));
  if (isTiny(c)) best = Math.min(best, d(c.latlng[1], c.latlng[0])); // the centre point only counts for tiny countries
  return best;
}
const TINY = COUNTRIES.filter(isTiny);
function pickAt(lon, lat, tol) {
  // very small countries (some sit inside a bigger one, like the Vatican) are checked first, with a little slack
  const k = Math.cos((lat * Math.PI) / 180);
  let tinyBest = null;
  let td = 0.25 + tol * 0.6;
  TINY.forEach((c) => {
    const d = Math.min(Math.hypot((c.latlng[1] - lon) * k, c.latlng[0] - lat), inPolys(lon, lat, c.polys) ? 0 : Infinity);
    if (d < td) {
      td = d;
      tinyBest = c;
    }
  });
  if (tinyBest) return { country: tinyBest };
  for (const c of COUNTRIES) {
    const b = c.bbox;
    if (lon >= b[0] - 0.01 && lon <= b[2] + 0.01 && lat >= b[1] - 0.01 && lat <= b[3] + 0.01 && inPolys(lon, lat, c.polys)) return { country: c };
  }
  for (const o of OTHERS) {
    const b = o.bbox;
    if (lon >= b[0] && lon <= b[2] && lat >= b[1] && lat <= b[3] && inPolys(lon, lat, o.polys)) return { other: o };
  }
  // a near miss on a small country counts, so islands are not impossible to tap
  let best = null;
  let bd = tol;
  COUNTRIES.forEach((c) => {
    const b = c.bbox;
    if (lon < b[0] - 4 || lon > b[2] + 4 || lat < b[1] - 4 || lat > b[3] + 4) return;
    const d = nearestDistance(c, lon, lat);
    if (d < bd) {
      bd = d;
      best = c;
    }
  });
  return best ? { country: best } : null;
}

// ---------- the highlight layer ----------
const OV_W = (window.z210Saver && window.z210Saver.on) || window.innerWidth < 700 ? 2048 : 4096;
const overlay = document.createElement("canvas");
overlay.width = OV_W;
overlay.height = OV_W / 2;
const octx = overlay.getContext("2d");
let overlayTex = null;
let requestDraw = () => {};
const layers = { dim: null, passport: false, marks: [] }; // marks: [{ id, fill, stroke }]
function drawOverlay() {
  const W = OV_W;
  const H = W / 2;
  octx.clearRect(0, 0, W, H);
  if (layers.dim) {
    octx.fillStyle = "rgba(4, 10, 30, 0.62)";
    COUNTRIES.forEach((c) => {
      if (layers.dim.has(c.id)) return;
      tracePolys(octx, c.polys, W, H);
      octx.fill("evenodd");
    });
  }
  if (layers.passport) {
    COUNTRIES.forEach((c) => {
      tracePolys(octx, c.polys, W, H);
      octx.fillStyle = isMastered(c.id) ? "rgba(46, 210, 120, 0.62)" : isVisited(c.id) ? "rgba(255, 205, 80, 0.4)" : "rgba(4, 10, 30, 0.7)";
      octx.fill("evenodd");
      if (isTiny(c) && isMastered(c.id)) {
        const [lat, lon] = c.latlng;
        octx.beginPath();
        octx.arc(((lon + 180) / 360) * W, ((90 - lat) / 180) * H, 11, 0, Math.PI * 2);
        octx.strokeStyle = "#2ed278";
        octx.lineWidth = 4;
        octx.stroke();
      }
    });
  }
  layers.marks.forEach((m) => {
    const c = byId.get(m.id);
    tracePolys(octx, c.polys, W, H);
    octx.fillStyle = m.fill;
    octx.fill("evenodd");
    octx.strokeStyle = m.stroke;
    octx.lineWidth = 3.2;
    octx.stroke();
    if (isTiny(c) || Math.max(c.bbox[2] - c.bbox[0], c.bbox[3] - c.bbox[1]) < 4) {
      const [lat, lon] = c.latlng;
      octx.beginPath();
      octx.arc(((lon + 180) / 360) * W, ((90 - lat) / 180) * H, 13, 0, Math.PI * 2);
      octx.strokeStyle = m.stroke;
      octx.lineWidth = 4;
      octx.stroke();
    }
  });
  if (overlayTex) overlayTex.needsUpdate = true;
  requestDraw();
}
const MARK = {
  select: { fill: "rgba(255, 255, 255, 0.34)", stroke: "#ffd25a" },
  good: { fill: "rgba(60, 220, 130, 0.5)", stroke: "#3cdc82" },
  bad: { fill: "rgba(240, 80, 80, 0.5)", stroke: "#f05050" },
  hint: { fill: "rgba(255, 210, 90, 0.4)", stroke: "#ffd25a" },
};
function setMarks(list) {
  layers.marks = list;
  drawOverlay();
}
function setDim(ids) {
  layers.dim = ids;
  drawOverlay();
}

// ---------- the globe ----------
const stage = $("stage");
const toLatLon = (lat, lon, r = 1) => {
  const la = (lat * Math.PI) / 180;
  const lo = (lon * Math.PI) / 180;
  return new THREE.Vector3(r * Math.cos(la) * Math.cos(lo), r * Math.sin(la), -r * Math.cos(la) * Math.sin(lo));
};
const hasWebGL = () => {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch (err) {
    return false;
  }
};

let view; // { focus(lat, lon, span), reset(), onPick }
let pickHandler = () => {};
const pixelRatio = () => (saverOn() ? 1 : Math.min(window.devicePixelRatio || 1, window.matchMedia && window.matchMedia("(pointer: coarse)").matches ? 1.5 : 2));

function makeGlobe() {
  const baseCanvas = drawBase(saverOn() || window.innerWidth < 700 ? 2048 : 4096);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(pixelRatio());
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  stage.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.05, 50);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enablePan = false;
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 1.28;
  controls.maxDistance = 5;
  controls.zoomSpeed = 0.7;
  controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_ROTATE };
  controls.autoRotate = !saverOn();
  controls.autoRotateSpeed = 0.7;

  const baseTex = new THREE.CanvasTexture(baseCanvas);
  baseTex.colorSpace = THREE.SRGBColorSpace;
  baseTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  overlayTex = new THREE.CanvasTexture(overlay);
  overlayTex.colorSpace = THREE.SRGBColorSpace;
  overlayTex.anisotropy = 4;
  const globe = new THREE.Mesh(new THREE.SphereGeometry(1, 96, 64), new THREE.MeshBasicMaterial({ map: baseTex }));
  scene.add(globe);
  const layer = new THREE.Mesh(new THREE.SphereGeometry(1.002, 96, 64), new THREE.MeshBasicMaterial({ map: overlayTex, transparent: true, depthWrite: false }));
  scene.add(layer);
  // soft blue glow around the planet
  const halo = new THREE.Mesh(
    new THREE.SphereGeometry(1.14, 64, 48),
    new THREE.ShaderMaterial({
      transparent: true,
      side: THREE.BackSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: "varying vec3 n; void main(){ n = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
      fragmentShader: "varying vec3 n; void main(){ float i = pow(max(0.0, 0.62 - dot(n, vec3(0.0,0.0,1.0))), 3.0); gl_FragColor = vec4(0.32, 0.6, 1.0, 1.0) * i * 0.85; }",
    })
  );
  scene.add(halo);
  scene.add(new THREE.AmbientLight(0xffffff, 0.95));
  const sun = new THREE.DirectionalLight(0xffffff, 0.55);
  camera.add(sun);
  sun.position.set(-1.5, 1, 2);
  scene.add(camera);
  // stars
  const starPos = [];
  for (let i = 0; i < 700; i += 1) {
    const v = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize().multiplyScalar(12 + Math.random() * 8);
    starPos.push(v.x, v.y, v.z);
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute("position", new THREE.Float32BufferAttribute(starPos, 3));
  scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xcfdcff, size: 0.04, sizeAttenuation: true, transparent: true, opacity: 0.8 })));

  let wake = 10;
  requestDraw = () => {
    wake = 12;
  };
  controls.addEventListener("change", () => {
    wake = 6;
    controls.rotateSpeed = Math.max(0.18, Math.min(0.75, (camera.position.length() - 1) * 0.55));
  });
  const introEnd = performance.now() + 9000;
  const stopIntro = () => {
    controls.autoRotate = false;
  };
  renderer.domElement.addEventListener("pointerdown", stopIntro);
  renderer.domElement.addEventListener("wheel", stopIntro, { passive: true });

  function place(dir, dist) {
    camera.position.copy(dir).multiplyScalar(dist);
    controls.update();
    wake = 8;
  }
  const startDir = toLatLon(15, 5);
  const fitDist = () => {
    const aspect = camera.aspect;
    return aspect < 1 ? 3.7 / Math.max(0.5, aspect * 1.05) * 0.85 : 3.4;
  };
  let tweenId = 0;
  function focus(lat, lon, span = 30) {
    stopIntro();
    const id = (tweenId += 1);
    const from = camera.position.clone();
    const dist0 = from.length();
    const dir1 = toLatLon(lat, lon).normalize();
    const dist1 = Math.min(3.4, Math.max(1.35, 1.2 + span * 0.03));
    const dir0 = from.clone().normalize();
    const t0 = performance.now();
    const dur = 850;
    const step = (now) => {
      if (id !== tweenId) return;
      const k = Math.min(1, (now - t0) / dur);
      const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      const d = new THREE.Vector3().copy(dir0).lerp(dir1, e).normalize();
      camera.position.copy(d).multiplyScalar(dist0 + (dist1 - dist0) * e);
      camera.lookAt(0, 0, 0);
      controls.update();
      wake = 4;
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  function resize() {
    const w = stage.clientWidth || 600;
    const h = stage.clientHeight || 600;
    renderer.setPixelRatio(pixelRatio());
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    wake = 6;
  }
  new ResizeObserver(resize).observe(stage);
  resize();
  place(startDir, fitDist());
  window.addEventListener("z210:saver", () => {
    resize();
    controls.autoRotate = false;
  });

  // taps (not drags) pick a country
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let down = null;
  renderer.domElement.addEventListener("pointerdown", (e) => {
    down = { x: e.clientX, y: e.clientY, t: performance.now() };
  });
  renderer.domElement.addEventListener("pointerup", (e) => {
    if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 7 || performance.now() - down.t > 600) return;
    down = null;
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObject(globe)[0];
    if (!hit || !hit.uv) return;
    const lon = hit.uv.x * 360 - 180;
    const lat = hit.uv.y * 180 - 90;
    const tol = 0.5 + (camera.position.length() - 1) * 0.5;
    pickHandler(pickAt(lon, lat, tol), { lon, lat });
  });

  renderer.setAnimationLoop(() => {
    const moved = controls.update();
    if (wake > 0) {
      wake -= 1;
      renderer.render(scene, camera);
    } else if (controls.autoRotate) {
      if (performance.now() > introEnd) controls.autoRotate = false;
      renderer.render(scene, camera);
    } else if (moved) renderer.render(scene, camera);
  });

  return {
    focus,
    reset: () => {
      stopIntro();
      const id = (tweenId += 1);
      const from = camera.position.clone();
      const to = startDir.clone().normalize();
      const dist0 = from.length();
      const dist1 = fitDist();
      const t0 = performance.now();
      const step = (now) => {
        if (id !== tweenId) return;
        const k = Math.min(1, (now - t0) / 700);
        const e = k * (2 - k);
        camera.position.copy(from.clone().normalize().lerp(to, e).normalize().multiplyScalar(dist0 + (dist1 - dist0) * e));
        camera.lookAt(0, 0, 0);
        controls.update();
        wake = 4;
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    },
    kind: "globe",
  };
}

// a flat map for devices without WebGL
function makeFlat() {
  const baseCanvas = drawBase(2048);
  const wrap = document.createElement("div");
  wrap.style.cssText = "position:absolute;inset:0;overflow:hidden;display:grid;place-items:center";
  const holder = document.createElement("div");
  holder.style.cssText = "position:relative;width:100%;aspect-ratio:2/1";
  baseCanvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%";
  overlay.style.cssText = "position:absolute;inset:0;width:100%;height:100%;pointer-events:none";
  holder.append(baseCanvas, overlay);
  wrap.appendChild(holder);
  stage.appendChild(wrap);
  holder.style.cursor = "pointer";
  holder.addEventListener("click", (e) => {
    const r = holder.getBoundingClientRect();
    const lon = ((e.clientX - r.left) / r.width) * 360 - 180;
    const lat = 90 - ((e.clientY - r.top) / r.height) * 180;
    pickHandler(pickAt(lon, lat, 1.2), { lon, lat });
  });
  requestDraw = () => {};
  return { focus: () => {}, reset: () => {}, kind: "flat" };
}

// ---------- the country card ----------
const card = $("card");
let current = null; // country shown on the card
let factOrder = [];
let factIdx = 0;
const esc = (s) => String(s).replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch]);
const flagBadge = (c) => (FLAGS ? c.flag : c.iso2);

function nextFact() {
  if (!current) return "";
  if (factIdx >= factOrder.length) {
    factOrder = shuffle(factsFor(current).map((_, i) => i));
    factIdx = 0;
  }
  return factsFor(current)[factOrder[factIdx++]];
}
function showCountry(c, { fresh = true, compact = false } = {}) {
  current = c;
  if (fresh) {
    const all = factsFor(c);
    // the hand-written facts come first, then the ones worked out from the data
    factOrder = shuffle(all.map((_, i) => i).filter((i) => i < WRITTEN[c.id].length)).concat(shuffle(all.map((_, i) => i).filter((i) => i >= WRITTEN[c.id].length)));
    factIdx = 0;
  }
  const capital = c.id === "ISR" || c.id === "PSE" ? "Jerusalem is claimed as a capital by both; the seat of government is " + (c.id === "ISR" ? "in Jerusalem" : "in Ramallah") : c.capital.join(", ");
  const total = factsFor(c).length;
  card.innerHTML = `
    <div class="head"><span class="flagbig" aria-hidden="true">${esc(flagBadge(c))}</span><div><h2>${esc(c.name)}</h2><p class="sub">${esc(c.official)} · ${esc(c.subregion)}, ${esc(c.continent)}</p></div></div>
    <div class="fact" id="factBox"><small>Did you know? · fact <span id="factNo">1</span> of ${total}</small><span id="factText"></span></div>
    <div class="cardbar"><button class="g-btn sm2" id="moreFact">Another fact</button>${settings.mode === "explore" ? '<button class="g-btn ghost sm2" id="randomCountry">🎲 Random country</button>' : ""}</div>
    ${
      compact
        ? ""
        : `<div class="stats">
      <div class="stat"><span>Capital</span><b>${esc(capital)}</b></div>
      <div class="stat"><span>Population (2019)</span><b>${fmt(c.pop)}</b></div>
      <div class="stat"><span>Area</span><b>${fmt(c.area)} km²</b></div>
      <div class="stat"><span>People per km²</span><b>${(c.pop / c.area) >= 100 ? fmt(c.pop / c.area) : (c.pop / c.area).toFixed(1)}</b></div>
      <div class="stat wide"><span>Official ${c.languages.length === 1 ? "language" : "languages"}</span><b>${esc(c.languages.join(", "))}</b></div>
      <div class="stat wide"><span>Currency</span><b>${esc(c.currencies.join(", "))}</b></div>
    </div>
    <div><div class="stat wide" style="border:0;background:none;padding:0"><span>${c.borders.length ? "Neighbours (tap to visit)" : "Land borders"}</span></div>${c.borders.length ? `<div class="chips">${c.borders.map((b) => `<button data-go="${esc(b)}">${esc(b)}</button>`).join("")}</div>` : '<b style="font-size:.9rem">None (an island or island group)</b>'}</div>`
    }`;
  const setFact = () => {
    const f = nextFact();
    $("factText").textContent = f;
    $("factNo").textContent = String(Math.min(total, factIdx));
  };
  setFact();
  $("moreFact").addEventListener("click", () => {
    setFact();
    sfx.pick();
  });
  $("randomCountry")?.addEventListener("click", () => selectCountry(shuffle(COUNTRIES.filter((x) => inRegion(x, settings.region)))[0], true));
  card.querySelectorAll("[data-go]").forEach((b) =>
    b.addEventListener("click", () => {
      const n = COUNTRIES.find((x) => x.name === b.dataset.go);
      if (n) selectCountry(n, true);
    })
  );
}

function selectCountry(c, focus = false) {
  setMarks([{ id: c.id, ...MARK.select }]);
  showCountry(c);
  stamp(c.id, "seen");
  if (settings.mode === "passport") {
    card.insertAdjacentHTML("afterbegin", '<div class="cardbar"><button class="g-btn ghost sm2" id="backPass">← Back to my passport</button></div>');
    $("backPass").addEventListener("click", showPassport);
    layers.passport = true;
    drawOverlay();
  }
  sfx.pick();
  if (focus) view.focus(c.latlng[0], c.latlng[1], Math.max(c.bbox[2] - c.bbox[0], (c.bbox[3] - c.bbox[1]) * 1.4));
}

// ---------- toast ----------
let toastTimer = 0;
function toast(text, kind = "", ms = 2200) {
  const t = $("toast");
  t.textContent = text;
  t.className = "toast show" + (kind ? ` ${kind}` : "");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), ms);
}

// ---------- modes ----------
const ROUND = 10;
let game = null; // active quiz state
const answersEl = $("answers");
const typebox = $("typebox");
const bestOf = () => store.get(BEST_KEY, {})[`${settings.mode}-${settings.level}`] || 0;

function regionSet() {
  return settings.region === "All" ? null : new Set(COUNTRIES.filter((c) => inRegion(c, settings.region)).map((c) => c.id));
}
function applyRegion(focusIt = true) {
  const set = regionSet();
  setDim(set);
  if (set && focusIt) {
    const list = COUNTRIES.filter((c) => set.has(c.id));
    const lat = list.reduce((a, c) => a + c.latlng[0], 0) / list.length;
    // average longitude on a circle so regions near the date line still centre correctly
    const x = list.reduce((a, c) => a + Math.cos((c.latlng[1] * Math.PI) / 180), 0);
    const y = list.reduce((a, c) => a + Math.sin((c.latlng[1] * Math.PI) / 180), 0);
    view.focus(lat, (Math.atan2(y, x) * 180) / Math.PI, list.length > 30 ? 70 : list.length > 12 ? 45 : 25);
  } else if (!set && focusIt) view.reset();
}

function resetQuizUi() {
  if (game && game.timer) clearInterval(game.timer);
  game = null;
  layers.passport = false;
  $("quizbar").hidden = true;
  $("hint").hidden = true;
  $("skip").hidden = true;
  answersEl.hidden = true;
  typebox.hidden = true;
  answersEl.innerHTML = "";
}

let practiceOnly = false;
function setMode(mode, { practice = false } = {}) {
  practiceOnly = practice;
  settings.mode = mode;
  saveSettings();
  document.querySelectorAll("#mode .g-chip").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.value === mode)));
  $("levelRow").hidden = mode === "explore" || mode === "passport";
  resetQuizUi();
  setMarks([]);
  $("end").classList.remove("show");
  if (mode === "explore") {
    setDim(regionSet());
    $("hintline").textContent = "Drag to spin, scroll or pinch to zoom, tap a country.";
    card.innerHTML = `<p class="empty">Tap any country on the globe to see its facts, or press the button for a surprise.</p><div class="cardbar"><button class="g-btn sm2" id="randomStart">🎲 Random country</button></div>`;
    $("randomStart").addEventListener("click", () => selectCountry(shuffle(COUNTRIES.filter((x) => inRegion(x, settings.region)))[0], true));
    typebox.hidden = false;
    $("typeInput").placeholder = "Jump to a country…";
    $("typeInput").value = "";
  } else if (mode === "passport") showPassport();
  else if (mode === "speed") showSpeedIntro();
  else startQuiz();
}
const restartMode = () => {
  if (settings.mode === "passport") showPassport();
  else if (settings.mode === "speed") showSpeedIntro();
  else if (settings.mode !== "explore") startQuiz();
};

// ---------- passport screen ----------
function showPassport() {
  resetQuizUi();
  layers.passport = true;
  layers.dim = null;
  setMarks([]);
  typebox.hidden = true;
  const s = passStats();
  const [icon, title] = passRank(s.mastered);
  $("hintline").textContent = "Green countries are stamped (you got them right), yellow ones you have seen, dark ones are still waiting.";
  const bars = CONTINENTS.map((ct) => {
    const list = COUNTRIES.filter((c) => c.continent === ct);
    const m = list.filter((c) => isMastered(c.id)).length;
    const v = list.filter((c) => isVisited(c.id)).length;
    return `<div class="pbar"><div class="pl"><span>${esc(ct)}</span><b>${m} / ${list.length}</b></div><div class="track"><i class="seen" style="width:${(v / list.length) * 100}%"></i><i class="done" style="width:${(m / list.length) * 100}%"></i></div></div>`;
  }).join("");
  const next = COUNTRIES.filter((c) => !isMastered(c.id) && inRegion(c, settings.region)).length;
  card.innerHTML = `
    <div class="head"><span class="flagbig" aria-hidden="true">${icon}</span><div><h2>${esc(title)}</h2><p class="sub">${s.mastered} of ${s.total} stamped · ${s.visited} seen</p></div></div>
    <div class="track big"><i class="seen" style="width:${(s.visited / s.total) * 100}%"></i><i class="done" style="width:${(s.mastered / s.total) * 100}%"></i></div>
    <div class="legend"><span><i class="dot done"></i>Stamped (answered right)</span><span><i class="dot seen"></i>Seen</span><span><i class="dot none"></i>Not yet</span></div>
    ${bars}
    <div class="cardbar">
      <button class="g-btn sm2" id="pracBtn" ${next ? "" : "disabled"}>🎯 Practise the ones I haven't stamped (${next})</button>
      <button class="g-btn ghost sm2" id="unseenBtn">🎲 Visit a new country</button>
      <button class="g-btn ghost sm2" id="resetPass">Reset passport</button>
    </div>
    <p class="sub">Your passport is saved on this device only. Tap any country on the globe to visit it.</p>`;
  $("pracBtn").addEventListener("click", () => setMode("find", { practice: true }));
  $("unseenBtn").addEventListener("click", () => {
    const pool = COUNTRIES.filter((c) => !isVisited(c.id) && inRegion(c, settings.region));
    const c = shuffle(pool.length ? pool : COUNTRIES.filter((x) => inRegion(x, settings.region)))[0];
    selectCountry(c, true);
  });
  $("resetPass").addEventListener("click", () => {
    if (!window.confirm("Clear your whole passport? This can't be undone.")) return;
    pass = {};
    store.set(PASS_KEY, pass);
    showPassport();
  });
  drawOverlay();
}

// ---------- speed run ----------
const SPEED_SECONDS = 60;
const SPEED_PENALTY = 3;
function showSpeedIntro() {
  resetQuizUi();
  setMarks([]);
  setDim(regionSet());
  typebox.hidden = true;
  const best = store.get(BEST_KEY, {})[`speed-${settings.level}`] || 0;
  $("hintline").textContent = "Press Start, then tap the countries as fast as you can.";
  card.innerHTML = `
    <div class="head"><span class="flagbig" aria-hidden="true">⏱️</span><div><h2>Speed run</h2><p class="sub">${SPEED_SECONDS} seconds · one country at a time</p></div></div>
    <div class="fact"><small>How it works</small>The game names a country and you tap it on the globe. A right answer moves straight to the next one. A wrong tap or a skip costs ${SPEED_PENALTY} seconds. Find as many as you can.</div>
    <div class="cardbar"><button class="g-btn" id="startSpeed">▶ Start</button></div>
    <p class="sub">${best ? `Your best on ${settings.level === "kids" ? "Kids" : settings.level === "all" ? "Everyone" : "Expert"}: ${best} countries` : "Pick a level and region above first."}</p>`;
  $("startSpeed").addEventListener("click", startSpeed);
}
function startSpeed() {
  const pool = levelPool(settings.level).filter((c) => inRegion(c, settings.region));
  if (pool.length < 3) {
    toast("That region is too small for this level. Try a bigger region or level.", "bad", 3200);
    return;
  }
  resetQuizUi();
  setMarks([]);
  setDim(regionSet());
  game = { speed: true, targets: shuffle(pool), i: 0, found: 0, streak: 0, missed: [], endAt: performance.now() + SPEED_SECONDS * 1000, pool };
  game.timer = setInterval(speedTick, 100);
  $("quizbar").hidden = false;
  $("skip").hidden = false;
  $("hint").hidden = true;
  card.innerHTML = `<p class="empty">Go go go! Facts appear again when the time is up.</p>`;
  $("hintline").textContent = "Tap the named country. Wrong tap or skip = -3 seconds.";
  speedShow();
  speedTick();
}
function speedShow() {
  if (game.i >= game.targets.length) {
    game.targets = game.targets.concat(shuffle(game.pool));
  }
  const c = game.targets[game.i];
  $("qLabel").textContent = "Speed run · find";
  $("qText").textContent = c.name;
  $("qFlag").textContent = settings.level === "expert" ? "" : flagOf(c);
  $("qScore").textContent = game.found;
}
function speedTick() {
  if (!game || !game.speed) return;
  const left = (game.endAt - performance.now()) / 1000;
  $("qRound").textContent = `${Math.max(0, Math.ceil(left))}s`;
  if (left <= 0) endSpeed();
}
function speedPick(hit) {
  if (!hit) return;
  if (hit.other) return toast(`${hit.other.name} isn't one of the 195.`, "", 900);
  const c = hit.country;
  const t = game.targets[game.i];
  if (c.id === t.id) {
    game.found += 1;
    game.streak += 1;
    stamp(t.id, "right");
    sfx.right();
    setMarks([{ id: t.id, ...MARK.good }]);
  } else {
    game.streak = 0;
    game.endAt -= SPEED_PENALTY * 1000;
    stamp(c.id, "seen");
    sfx.wrong();
    setMarks([{ id: c.id, ...MARK.bad }]);
    toast(`-${SPEED_PENALTY}s · that was ${c.name}`, "bad", 900);
    setTimeout(() => game && game.speed && setMarks([]), 350);
    speedTick();
    return;
  }
  game.i += 1;
  setTimeout(() => game && game.speed && setMarks([]), 260);
  speedShow();
}
function speedSkip() {
  const t = game.targets[game.i];
  game.missed.push(t);
  game.streak = 0;
  game.endAt -= SPEED_PENALTY * 1000;
  game.i += 1;
  toast(`Skipped ${t.name} (-${SPEED_PENALTY}s)`, "", 900);
  speedShow();
  speedTick();
}
function endSpeed() {
  const g = game;
  if (!g || !g.speed) return;
  clearInterval(g.timer);
  g.timer = null;
  const key = `speed-${settings.level}`;
  const bests = store.get(BEST_KEY, {});
  const record = g.found > (bests[key] || 0);
  if (record && g.found > 0) {
    bests[key] = g.found;
    store.set(BEST_KEY, bests);
  }
  sfx.done();
  $("endEmoji").textContent = g.found >= 25 ? "🏆" : g.found >= 12 ? "🚀" : "⏱️";
  $("endTitle").textContent = "Time's up!";
  $("endText").textContent = `${g.found} ${g.found === 1 ? "country" : "countries"} in ${SPEED_SECONDS} seconds${record && g.found > 0 ? " · New best!" : bests[key] ? ` · Best ${bests[key]}` : ""}`;
  const skipped = g.missed;
  const missed = $("missed");
  missed.hidden = skipped.length === 0;
  missed.innerHTML = skipped.length ? `<b>Skipped</b>${skipped.map((c) => `<span>${esc(flagOf(c))} ${esc(c.name)}</span>`).join("")}` : "";
  $("end").classList.add("show");
  $("quizbar").hidden = true;
  $("skip").hidden = true;
  game = { speed: true, over: true, timer: null };
  card.innerHTML = `<p class="empty">Nice run! Pick Explore to read about any country you missed.</p>`;
}

function startQuiz() {
  const pool = levelPool(settings.level).filter((c) => inRegion(c, settings.region) && (!practiceOnly || !isMastered(c.id)));
  const need = Math.min(ROUND, pool.length);
  if (need < 3) {
    toast(practiceOnly ? "You have stamped everything here. Try another level or region." : "That region is too small for this level. Try a bigger region or level.", "bad", 3200);
    card.innerHTML = `<p class="empty">Pick a bigger region or a harder level to play here.</p>`;
    return;
  }
  game = { targets: shuffle(pool).slice(0, need), i: 0, score: 0, streak: 0, attempts: 0, hints: 0, missed: [], correct: 0, locked: false };
  $("quizbar").hidden = false;
  $("hint").hidden = false;
  $("skip").hidden = false;
  $("end").classList.remove("show");
  $("hintline").textContent = settings.mode === "find" ? "Find the country named above and tap it. Use Hint if you are stuck." : "The country is glowing. Work out its name.";
  card.innerHTML = `<p class="empty">Facts about each country appear here after you answer.</p>`;
  nextQuestion();
}

const target = () => game.targets[game.i];
function nextQuestion() {
  const c = target();
  game.attempts = 0;
  game.hints = 0;
  game.locked = false;
  $("qRound").textContent = `${game.i + 1}/${game.targets.length}`;
  $("qScore").textContent = game.score;
  setMarks([]);
  applyDimForQuiz();
  answersEl.hidden = true;
  typebox.hidden = true;
  if (settings.mode === "find") {
    $("qLabel").textContent = "Find this country";
    $("qText").textContent = c.name;
    $("qFlag").textContent = settings.level === "expert" ? "" : flagOf(c);
  } else {
    $("qLabel").textContent = "Name this country";
    $("qText").textContent = "What is it called?";
    $("qFlag").textContent = "";
    setMarks([{ id: c.id, ...MARK.select }]);
    view.focus(c.latlng[0], c.latlng[1], Math.max(c.bbox[2] - c.bbox[0], (c.bbox[3] - c.bbox[1]) * 1.4));
    if (settings.level === "expert") {
      typebox.hidden = false;
      $("typeInput").placeholder = "Type the country's name";
      $("typeInput").value = "";
      $("typeInput").focus({ preventScroll: true });
    } else {
      const pool = levelPool(settings.level);
      const sameCont = shuffle(pool.filter((x) => x.continent === c.continent && x.id !== c.id));
      const rest = shuffle(pool.filter((x) => x.id !== c.id && !sameCont.includes(x)));
      const options = shuffle([c, ...sameCont.slice(0, 3), ...rest].slice(0, 4));
      answersEl.innerHTML = "";
      options.forEach((o) => {
        const b = document.createElement("button");
        b.className = "ans";
        b.textContent = o.name;
        b.addEventListener("click", () => answerName(o, b));
        answersEl.appendChild(b);
      });
      answersEl.hidden = false;
    }
  }
}
function applyDimForQuiz() {
  setDim(regionSet());
}

function award(hintsUsed, attempts) {
  const streakBonus = Math.min(50, game.streak * 10);
  return Math.max(20, 100 - attempts * 25 - hintsUsed * 15) + streakBonus;
}
async function finishQuestion(correct, note) {
  game.locked = true;
  const c = target();
  if (correct) {
    const pts = award(game.hints, game.attempts);
    game.score += pts;
    game.streak += 1;
    game.correct += 1;
    stamp(c.id, "right");
    sfx.right();
    toast(`${c.name}! +${pts}${game.streak > 1 ? ` (streak ${game.streak})` : ""}`, "good");
  } else {
    game.streak = 0;
    game.missed.push(c);
    stamp(c.id, "seen");
    sfx.wrong();
    toast(note || `It was ${c.name}.`, "bad", 2600);
  }
  $("qScore").textContent = game.score;
  setMarks([{ id: c.id, ...(correct ? MARK.good : MARK.bad) }]);
  view.focus(c.latlng[0], c.latlng[1], Math.max(c.bbox[2] - c.bbox[0], (c.bbox[3] - c.bbox[1]) * 1.4));
  showCountry(c, { compact: true });
  answersEl.hidden = true;
  typebox.hidden = true;
  const myGame = game;
  await sleep(correct ? 2600 : 3200);
  if (game !== myGame) return;
  game.i += 1;
  if (game.i >= game.targets.length) endQuiz();
  else nextQuestion();
}

function answerName(country, btn) {
  if (!game || game.locked) return;
  const right = country.id === target().id;
  btn.classList.add(right ? "right" : "wrong");
  if (!right) [...answersEl.children].find((b) => b.textContent === target().name)?.classList.add("right");
  answersEl.querySelectorAll("button").forEach((b) => (b.disabled = true));
  if (!right) game.attempts = 3;
  finishQuestion(right, right ? "" : `That was ${target().name}, not ${country.name}.`);
}

function onPickQuiz(hit) {
  if (game && game.speed && !game.over && settings.mode === "speed") return speedPick(hit);
  if (!game || game.speed || game.locked || settings.mode !== "find") return;
  if (!hit) return toast("That's the ocean. Try a country.", "", 1400);
  if (hit.other) return toast(`${hit.other.name} isn't one of the 195 countries in this game.`, "", 2200);
  const c = hit.country;
  if (c.id === target().id) return finishQuestion(true);
  game.attempts += 1;
  game.streak = 0;
  sfx.wrong();
  setMarks([{ id: c.id, ...MARK.bad }]);
  setTimeout(() => game && !game.locked && setMarks([]), 900);
  if (game.attempts >= 3) return finishQuestion(false, `Out of tries. It was ${target().name}.`);
  toast(`That's ${c.name}. ${3 - game.attempts} ${3 - game.attempts === 1 ? "try" : "tries"} left.`, "bad", 1800);
}

function useHint() {
  if (!game || game.locked) return;
  const c = target();
  game.hints += 1;
  if (settings.mode === "find") {
    if (game.hints === 1) {
      toast(`Hint: it is in ${c.continent}.`, "", 3200);
      setDim(new Set(COUNTRIES.filter((x) => x.continent === c.continent).map((x) => x.id)));
      const list = COUNTRIES.filter((x) => x.continent === c.continent);
      const lat = list.reduce((a, x) => a + x.latlng[0], 0) / list.length;
      const xs = list.reduce((a, x) => a + Math.cos((x.latlng[1] * Math.PI) / 180), 0);
      const ys = list.reduce((a, x) => a + Math.sin((x.latlng[1] * Math.PI) / 180), 0);
      view.focus(lat, (Math.atan2(ys, xs) * 180) / Math.PI, 60);
    } else if (game.hints === 2) {
      toast(`Hint: its capital is ${c.capital[0]}.`, "", 3600);
    } else {
      toast(`Hint: it is in ${c.subregion}.`, "", 3200);
      setDim(new Set((bySub.get(c.subregion) || []).map((x) => x.id)));
      view.focus(c.latlng[0], c.latlng[1], 35);
    }
  } else if (settings.level === "expert") {
    toast(game.hints === 1 ? `Hint: it starts with "${c.name[0]}" and has ${c.name.length} letters.` : `Hint: its capital is ${c.capital[0]}.`, "", 3600);
  } else {
    toast(`Hint: its capital is ${c.capital[0]}.`, "", 3600);
  }
}

$("typeForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const guess = $("typeInput").value.trim();
  if (!guess) return;
  if (settings.mode === "explore") {
    const c = COUNTRIES.find((x) => matchesName(x, guess)) || COUNTRIES.find((x) => norm(x.name).startsWith(norm(guess)));
    if (c) {
      selectCountry(c, true);
      $("typeInput").value = "";
    } else toast("I couldn't find that country. Check the spelling.", "bad", 2000);
    return;
  }
  if (!game || game.locked || settings.mode !== "name") return;
  if (matchesName(target(), guess)) return finishQuestion(true);
  game.attempts += 1;
  game.streak = 0;
  sfx.wrong();
  $("typeInput").select();
  if (game.attempts >= 3) return finishQuestion(false, `Out of tries. It was ${target().name}.`);
  toast(`Not quite. ${3 - game.attempts} ${3 - game.attempts === 1 ? "try" : "tries"} left.`, "bad", 1800);
});

function endQuiz() {
  const key = `${settings.mode}-${settings.level}`;
  const bests = store.get(BEST_KEY, {});
  const record = game.score > (bests[key] || 0);
  if (record) {
    bests[key] = game.score;
    store.set(BEST_KEY, bests);
  }
  sfx.done();
  const n = game.targets.length;
  $("endEmoji").textContent = game.correct === n ? "🏆" : game.correct >= n * 0.6 ? "🌍" : "🧭";
  $("endTitle").textContent = game.correct === n ? "Perfect round!" : game.correct >= n * 0.6 ? "Great exploring!" : "Keep exploring!";
  $("endText").textContent = `${game.correct} of ${n} right · ${game.score} points${record ? " · New best!" : bests[key] ? ` · Best ${bests[key]}` : ""}`;
  const missed = $("missed");
  missed.hidden = game.missed.length === 0;
  missed.innerHTML = game.missed.length ? `<b>Worth another look</b>${game.missed.map((c) => `<span>${esc(flagOf(c))} ${esc(c.name)}</span>`).join("")}` : "";
  $("end").classList.add("show");
  $("quizbar").hidden = true;
  $("hint").hidden = true;
  $("skip").hidden = true;
  answersEl.hidden = true;
  typebox.hidden = true;
}

// ---------- start-up ----------
function buildRegionChips() {
  const box = $("region");
  const subs = settings.region !== "All" && CONTINENTS.includes(settings.region) ? [...new Set(COUNTRIES.filter((c) => c.continent === settings.region).map((c) => c.subregion))].sort() : [];
  const list = ["All", ...CONTINENTS];
  const subRow = CONTINENTS.includes(settings.region) || (settings.region !== "All" && !CONTINENTS.includes(settings.region));
  let subList = subs;
  if (settings.region !== "All" && !CONTINENTS.includes(settings.region)) {
    const parent = COUNTRIES.find((c) => c.subregion === settings.region).continent;
    subList = [...new Set(COUNTRIES.filter((c) => c.continent === parent).map((c) => c.subregion))].sort();
  }
  box.innerHTML =
    list.map((r) => `<button class="g-chip" data-value="${esc(r)}" aria-pressed="${r === settings.region}">${esc(r === "All" ? "🌐 World" : r)}</button>`).join("") +
    (subRow ? `<span class="sublabel">Within it:</span>` + subList.map((r) => `<button class="g-chip" data-value="${esc(r)}" aria-pressed="${r === settings.region}">${esc(r)}</button>`).join("") : "");
  box.querySelectorAll(".g-chip").forEach((b) =>
    b.addEventListener("click", () => {
      settings.region = settings.region === b.dataset.value && b.dataset.value !== "All" && CONTINENTS.includes(b.dataset.value) ? "All" : b.dataset.value;
      saveSettings();
      buildRegionChips();
      applyRegion(true);
      if (settings.mode !== "explore") restartMode();
      else if (settings.region !== "All") toast(`${settings.region === "All" ? "World" : settings.region}: ${COUNTRIES.filter((c) => inRegion(c, settings.region)).length} countries`, "", 1600);
    })
  );
}

function boot() {
  view = hasWebGL() ? makeGlobe() : makeFlat();
  pickHandler = (hit) => {
    if (settings.mode === "explore" || settings.mode === "passport") {
      if (!hit) return;
      if (hit.other) return toast(`${hit.other.name} isn't one of the 195 countries in this game.`, "", 2200);
      selectCountry(hit.country, false);
    } else onPickQuiz(hit);
  };
  $("loading").remove();
  $("names").innerHTML = COUNTRIES.map((c) => `<option value="${esc(c.name)}"></option>`).join("");
  document.querySelectorAll("#mode .g-chip").forEach((b) => b.addEventListener("click", () => settings.mode !== b.dataset.value && setMode(b.dataset.value)));
  document.querySelectorAll("#level .g-chip").forEach((b) => {
    b.setAttribute("aria-pressed", String(b.dataset.value === settings.level));
    b.addEventListener("click", () => {
      settings.level = b.dataset.value;
      saveSettings();
      document.querySelectorAll("#level .g-chip").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      restartMode();
    });
  });
  $("reset").addEventListener("click", () => {
    view.reset();
    if (settings.mode === "explore" || settings.mode === "passport") setMarks([]);
  });
  $("hint").addEventListener("click", useHint);
  $("skip").addEventListener("click", () => {
    if (game && game.speed && !game.over) return speedSkip();
    if (game && !game.locked) finishQuestion(false, `It was ${target().name}.`);
  });
  $("again").addEventListener("click", () => {
    $("end").classList.remove("show");
    if (settings.mode === "speed") startSpeed();
    else startQuiz();
  });
  $("endExplore").addEventListener("click", () => {
    $("end").classList.remove("show");
    setMode("explore");
  });
  const mute = $("mute");
  const syncMute = () => {
    mute.textContent = settings.muted ? "Sound Off" : "Sound On";
    mute.setAttribute("aria-pressed", String(settings.muted));
  };
  mute.addEventListener("click", () => {
    settings.muted = !settings.muted;
    saveSettings();
    syncMute();
  });
  syncMute();
  buildRegionChips();
  drawOverlay();
  setMode(settings.mode);
  if (settings.region !== "All") applyRegion(true);
  window.__globe = { COUNTRIES, OTHERS, byId, factsFor, WRITTEN, derivedFacts, pickAt, selectCountry, setMode, get game() { return game; }, get view() { return view; }, get settings() { return settings; }, matchesName, levelPool, target: () => game && target(), finishQuestion, onPickQuiz, startQuiz, flagsSupported: FLAGS, pass: () => pass, stamp, passStats, startSpeed, speedPick, endSpeed, speedSkip, showPassport };
}
boot();
