import { createOnline } from "../../assets/online.js";

// ---------- fleet and rules ----------
const SHIPS = [
  { name: "Carrier", len: 5 },
  { name: "Battleship", len: 4 },
  { name: "Cruiser", len: 3 },
  { name: "Submarine", len: 3 },
  { name: "Destroyer", len: 2 },
];
const N = 10;
const cellName = (i) => "ABCDEFGHIJ"[i % N] + (Math.floor(i / N) + 1);
const shipCells = (head, len, horizontal) => Array.from({ length: len }, (_, k) => head + (horizontal ? k : k * N));
const fits = (head, len, horizontal) => {
  const r = Math.floor(head / N);
  const c = head % N;
  return horizontal ? c + len <= N : r + len <= N;
};

function randomFleet() {
  const occ = Array(N * N).fill(-1);
  const ships = [];
  SHIPS.forEach((s, idx) => {
    for (let tries = 0; tries < 500; tries += 1) {
      const horizontal = Math.random() < 0.5;
      const head = Math.floor(Math.random() * N * N);
      if (!fits(head, s.len, horizontal)) continue;
      const cells = shipCells(head, s.len, horizontal);
      if (cells.some((i) => occ[i] !== -1)) continue;
      cells.forEach((i) => (occ[i] = idx));
      ships[idx] = { idx, cells, horizontal, hits: 0 };
      return;
    }
  });
  return ships.length === SHIPS.length ? { ships, occ } : randomFleet();
}

const sunk = (fleet, idx) => fleet.ships[idx].hits >= SHIPS[idx].len;
const allSunk = (fleet) => fleet.ships.every((s) => s.hits >= SHIPS[s.idx].len);

// ---------- computer shooter ----------
function neighbours(i) {
  const r = Math.floor(i / N);
  const c = i % N;
  const out = [];
  if (r > 0) out.push(i - N);
  if (r < N - 1) out.push(i + N);
  if (c > 0) out.push(i - 1);
  if (c < N - 1) out.push(i + 1);
  return out;
}
const pick = (list) => list[Math.floor(Math.random() * list.length)];

// shots: 0 unknown, 1 miss, 2 hit. resolved: Set of cells belonging to ships that are already sunk
function aiShoot(shots, resolved, remainingLens, level) {
  const unknown = [];
  shots.forEach((v, i) => v === 0 && unknown.push(i));
  const open = shots.map((v, i) => (v === 2 && !resolved.has(i) ? i : -1)).filter((i) => i >= 0);

  const around = () => {
    // cells next to unresolved hits, preferring cells that extend a line of two hits
    const cands = new Set();
    open.forEach((h) => {
      neighbours(h).forEach((n) => {
        if (shots[n] !== 0) return;
        const dir = n - h;
        const back = h - dir;
        const aligned = shots[back] === 2 && !resolved.has(back) && neighbours(h).includes(back);
        cands.add(aligned ? `${n}:2` : `${n}:1`);
      });
    });
    const list = [...cands].map((s) => s.split(":").map(Number));
    const best = Math.max(...list.map((x) => x[1]));
    return list.filter((x) => x[1] === best).map((x) => x[0]);
  };

  if (level === "easy") {
    if (open.length && Math.random() < 0.3) return pick(around());
    return pick(unknown);
  }
  if (level === "normal") {
    if (open.length) return pick(around());
    const parity = unknown.filter((i) => (Math.floor(i / N) + (i % N)) % 2 === 0);
    return pick(parity.length ? parity : unknown);
  }
  // hard: probability density over every place the remaining ships could still be
  const density = Array(N * N).fill(0);
  const add = (focus) => {
    let any = false;
    remainingLens.forEach((len) => {
      [true, false].forEach((horizontal) => {
        for (let head = 0; head < N * N; head += 1) {
          if (!fits(head, len, horizontal)) continue;
          const cells = shipCells(head, len, horizontal);
          if (cells.some((i) => shots[i] === 1 || resolved.has(i))) continue;
          const covered = cells.filter((i) => open.includes(i)).length;
          if (focus && !covered) continue;
          any = true;
          const w = 1 + covered * 14;
          cells.forEach((i) => shots[i] === 0 && (density[i] += w));
        }
      });
    });
    return any;
  };
  if (!(open.length && add(true))) add(false);
  const max = Math.max(...unknown.map((i) => density[i]));
  return pick(unknown.filter((i) => density[i] === max));
}

// ---------- UI ----------
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
const SETTINGS_KEY = "zone210_battleship_settings";
const settings = { mode: "cpu", level: "normal", muted: false, ...store.get(SETTINGS_KEY, {}) };
if (!["cpu", "online"].includes(settings.mode)) settings.mode = "cpu";
if (!["easy", "normal", "hard"].includes(settings.level)) settings.level = "normal";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
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
    osc.frequency.setValueAtTime(freq, t);
    amp.gain.setValueAtTime(0.0001, t);
    amp.gain.exponentialRampToValueAtTime(gain, t + 0.01);
    amp.gain.exponentialRampToValueAtTime(0.0001, t + length);
    osc.connect(amp).connect(audio.destination);
    osc.start(t);
    osc.stop(t + length + 0.02);
  } catch (err) {
    /* audio unavailable */
  }
}
const sfx = {
  place: () => tone(300, 0, 0.06, "triangle", 0.08),
  fire: () => tone(700, 0, 0.12, "sawtooth", 0.04),
  miss: () => tone(260, 0.1, 0.15, "sine", 0.08),
  hit: () => {
    tone(130, 0.1, 0.25, "sawtooth", 0.1);
    tone(90, 0.12, 0.3, "square", 0.06);
  },
  sunk: () => [392, 330, 262, 196].forEach((f, i) => tone(f, 0.1 + i * 0.09, 0.2, "sawtooth", 0.08)),
  win: () => [523, 659, 784, 1046, 784, 1046].forEach((f, i) => tone(f, i * 0.1, 0.24, "triangle", 0.1)),
  lose: () => [330, 262, 196, 130].forEach((f, i) => tone(f, i * 0.16, 0.3, "sawtooth", 0.06)),
};

const statusEl = $("status");
const setStatus = (t, kind = "") => {
  statusEl.textContent = t;
  statusEl.className = "g-status" + (kind ? ` ${kind}` : "");
};

// phases: "placing" | "battle" | "over"
let phase = "placing";
let mine = null; // player's fleet { ships, occ }
let enemy = null; // computer's fleet
let placed = []; // during placing: ship objects or undefined
let selectedShip = 0;
let horizontal = true;
let pShots = Array(N * N).fill(0); // player's shots on the enemy
let aShots = Array(N * N).fill(0); // computer's shots on the player
let resolved = new Set();
let busy = false;

// ---------- online (each player keeps their own fleet private and answers the other's shots) ----------
const online = () => settings.mode === "online";
const blankFleet = () => ({ ships: SHIPS.map((s, idx) => ({ idx, cells: [], horizontal: true, hits: 0 })), occ: Array(N * N).fill(-1) });
let myReady = false;
let theirReady = false;
let turnMine = false;
let awaiting = false;
let pendingShots = [];
const net = createOnline({
  container: document.querySelector(".g-page"),
  before: $("placing"),
  prefix: "zone210-battleship-",
  names: ["Fires first", "Fires second"],
  onStart: ({ role }) => { newGame(); turnMine = role === 0; },
  onData: (m) => onNet(m),
  onLeft: () => { awaiting = false; setStatus("Your friend left the game.", "bad"); },
});
function onNet(m) {
  if (!online() || !m) return;
  if (m.t === "ready") {
    theirReady = true;
    if (myReady && phase === "placing") startBattle();
  } else if (m.t === "shot" && Number.isInteger(m.i)) {
    if (phase !== "battle") pendingShots.push(m.i);
    else onShot(m.i);
  } else if (m.t === "res") onResult(m);
}
function onShot(i) {
  if (turnMine || aShots[i]) return;
  const res = hitAt(mine, aShots, i);
  if (res.sunk) mine.ships[res.idx].cells.forEach((c) => resolved.add(c));
  const over = allSunk(mine);
  net.send({ t: "res", i, hit: res.hit, sunk: !!res.sunk, idx: res.idx, cells: res.sunk ? mine.ships[res.idx].cells : undefined, over });
  res.hit ? sfx.hit() : sfx.miss();
  if (res.sunk) sfx.sunk();
  renderBattle();
  if (over) return finish(false);
  turnMine = true;
  const msg = res.sunk ? `Your friend sank your ${SHIPS[res.idx].name} (${cellName(i)})!` : res.hit ? `Your friend hit your ship at ${cellName(i)}!` : `Your friend missed at ${cellName(i)}.`;
  setStatus(`${msg} Your turn.`, res.hit ? "bad" : "");
}
function onResult(m) {
  if (!awaiting || !Number.isInteger(m.i) || pShots[m.i]) return;
  awaiting = false;
  pShots[m.i] = m.hit ? 2 : 1;
  if (m.sunk && Array.isArray(m.cells) && Number.isInteger(m.idx) && enemy.ships[m.idx]) {
    const s = enemy.ships[m.idx];
    s.cells = m.cells;
    s.hits = SHIPS[m.idx].len;
    s.horizontal = m.cells.length < 2 || m.cells[1] - m.cells[0] === 1;
    m.cells.forEach((c) => (enemy.occ[c] = m.idx));
  }
  m.hit ? sfx.hit() : sfx.miss();
  if (m.sunk) sfx.sunk();
  renderBattle();
  const msg = m.sunk ? `You sank their ${SHIPS[m.idx].name}!` : m.hit ? `${cellName(m.i)}: a hit!` : `${cellName(m.i)}: a miss.`;
  if (m.over) return finish(true);
  turnMine = false;
  setStatus(`${msg} Waiting for your friend's shot…`, m.hit ? "good" : "");
}

function buildGrid(container, onClick, onHover) {
  container.innerHTML = "";
  for (let i = 0; i < N * N; i += 1) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "cell";
    b.dataset.i = i;
    b.setAttribute("role", "gridcell");
    b.setAttribute("aria-label", cellName(i));
    b.addEventListener("click", () => onClick(i));
    if (onHover) {
      b.addEventListener("mouseenter", () => onHover(i));
      b.addEventListener("focus", () => onHover(i));
    }
    container.appendChild(b);
  }
  if (onHover) container.addEventListener("mouseleave", () => onHover(-1));
}

function shipClasses(fleet, i) {
  const idx = fleet.occ[i];
  if (idx < 0) return "";
  const s = fleet.ships[idx];
  const first = s.cells[0] === i;
  const last = s.cells[s.cells.length - 1] === i;
  return ` ship ${s.horizontal ? "h" : "v"}${first ? " s" : ""}${last ? " e" : ""}`;
}

// ----- placing -----
const placeGridEl = $("placeGrid");
function placingFleet() {
  const ships = placed.filter(Boolean);
  const occ = Array(N * N).fill(-1);
  const list = [];
  ships.forEach((s) => {
    list[s.idx] = s;
    s.cells.forEach((i) => (occ[i] = s.idx));
  });
  return { ships: list, occ };
}

let hoverAt = -1;
function renderPlacing() {
  const f = placingFleet();
  let previewCells = [];
  let previewOk = true;
  if (hoverAt >= 0 && selectedShip >= 0) {
    const len = SHIPS[selectedShip].len;
    let head = hoverAt;
    const r = Math.floor(head / N);
    const c = head % N;
    if (horizontal && c + len > N) head = r * N + (N - len);
    if (!horizontal && r + len > N) head = (N - len) * N + c;
    previewCells = shipCells(head, len, horizontal);
    previewOk = previewCells.every((i) => f.occ[i] === -1 || f.occ[i] === selectedShip);
  }
  [...placeGridEl.children].forEach((cell, i) => {
    let cls = "cell" + shipClasses(f, i);
    if (previewCells.includes(i)) cls += " preview" + (previewOk ? "" : " bad");
    cell.className = cls;
  });
  // tray
  const tray = $("tray");
  tray.innerHTML = "";
  SHIPS.forEach((s, idx) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "ship-btn" + (idx === selectedShip ? " sel" : "") + (placed[idx] ? " placed" : "");
    b.innerHTML = `<span class="len">${"<i></i>".repeat(s.len)}</span>${s.name}`;
    b.addEventListener("click", () => {
      if (placed[idx]) {
        horizontal = placed[idx].horizontal;
        placed[idx] = undefined; // pick it up to move it
      }
      selectedShip = idx;
      renderPlacing();
    });
    tray.appendChild(b);
  });
  const done = placed.filter(Boolean).length === SHIPS.length;
  $("start").disabled = !done || myReady;
  if (myReady) return;
  setStatus(online() && !net.active ? "Create or join a room to start." : done ? "Fleet ready. Press Start battle, or tap a ship to move it." : `Place your ${SHIPS[selectedShip] ? SHIPS[selectedShip].name : "ships"} (${SHIPS[selectedShip] ? SHIPS[selectedShip].len : ""} squares). Use Rotate to turn it.`);
}

function onPlaceCell(i) {
  if (phase !== "placing" || myReady) return;
  const f = placingFleet();
  const occupant = f.occ[i];
  // tapping a placed ship picks it up, unless we are already carrying that one
  if (occupant >= 0 && occupant !== selectedShip) {
    selectedShip = occupant;
    horizontal = placed[occupant].horizontal;
    placed[occupant] = undefined;
    hoverAt = i;
    renderPlacing();
    return;
  }
  if (selectedShip < 0) return;
  const len = SHIPS[selectedShip].len;
  let head = i;
  const r = Math.floor(head / N);
  const c = head % N;
  if (horizontal && c + len > N) head = r * N + (N - len);
  if (!horizontal && r + len > N) head = (N - len) * N + c;
  const cells = shipCells(head, len, horizontal);
  const bad = cells.some((k) => f.occ[k] !== -1 && f.occ[k] !== selectedShip);
  if (bad) {
    setStatus("Ships can't overlap. Try another spot.", "bad");
    return;
  }
  placed[selectedShip] = { idx: selectedShip, cells, horizontal, hits: 0 };
  sfx.place();
  const next = SHIPS.findIndex((_, idx) => !placed[idx]);
  selectedShip = next;
  hoverAt = -1;
  renderPlacing();
}

function rotate() {
  horizontal = !horizontal;
  renderPlacing();
}

// ----- battle -----
const enemyGridEl = $("enemyGrid");
const myGridEl = $("myGrid");

function renderBattle() {
  [...enemyGridEl.children].forEach((cell, i) => {
    let cls = "cell";
    const v = pShots[i];
    if (v) cls += " shot";
    const idx = enemy.occ[i];
    if (idx >= 0 && sunk(enemy, idx)) cls += shipClasses(enemy, i) + " sunk hit";
    else if (v === 1) cls += " miss";
    else if (v === 2) cls += " hit";
    else if (phase === "over" && idx >= 0) cls += shipClasses(enemy, i);
    cell.className = cls;
    cell.disabled = false;
  });
  [...myGridEl.children].forEach((cell, i) => {
    let cls = "cell" + shipClasses(mine, i);
    const v = aShots[i];
    const idx = mine.occ[i];
    if (v === 1) cls += " miss";
    else if (v === 2) cls += " hit" + (idx >= 0 && sunk(mine, idx) ? " sunk" : "");
    cell.className = cls;
  });
  const tracker = (el, fleet, title) => {
    el.innerHTML = `<h3>${title}</h3>` + SHIPS.map((s, idx) => `<div class="row${sunk(fleet, idx) ? " sunk" : ""}"><span class="len">${"<i></i>".repeat(s.len)}</span>${s.name}</div>`).join("");
  };
  tracker($("enemyFleet"), enemy, "Enemy fleet");
  tracker($("myFleet"), mine, "Your fleet");
}

function startBattle() {
  if (placed.filter(Boolean).length !== SHIPS.length) return;
  if (online() && !(myReady && theirReady)) {
    // lock in my fleet and wait for the other player
    myReady = true;
    $("start").disabled = true;
    $("random").disabled = $("clearShips").disabled = $("rotate").disabled = true;
    net.send({ t: "ready" });
    if (!theirReady) { setStatus("Fleet locked in. Waiting for your friend to place their ships…"); return; }
  }
  mine = placingFleet();
  enemy = online() ? blankFleet() : randomFleet();
  pShots = Array(N * N).fill(0);
  aShots = Array(N * N).fill(0);
  resolved = new Set();
  phase = "battle";
  busy = false;
  $("placing").hidden = true;
  $("battle").hidden = false;
  buildGrid(enemyGridEl, fire);
  buildGrid(myGridEl, () => {});
  [...myGridEl.children].forEach((c) => (c.tabIndex = -1));
  renderBattle();
  if (online()) {
    setStatus(turnMine ? "Your shot, Admiral. Tap a square in the enemy waters." : "Your friend fires first…");
    const queued = pendingShots;
    pendingShots = [];
    queued.forEach(onShot);
    return;
  }
  setStatus("Your shot, Admiral. Tap a square in the enemy waters.");
}

function hitAt(fleet, shots, i) {
  const idx = fleet.occ[i];
  if (idx < 0) {
    shots[i] = 1;
    return { hit: false };
  }
  shots[i] = 2;
  const ship = fleet.ships[idx];
  ship.hits += 1;
  return { hit: true, idx, sunk: ship.hits >= SHIPS[idx].len };
}

async function fire(i) {
  if (online()) {
    if (phase !== "battle" || !net.active || !turnMine || awaiting || pShots[i]) return;
    awaiting = true;
    sfx.fire();
    net.send({ t: "shot", i });
    return;
  }
  if (phase !== "battle" || busy || pShots[i]) return;
  busy = true;
  sfx.fire();
  const res = hitAt(enemy, pShots, i);
  res.hit ? sfx.hit() : sfx.miss();
  if (res.sunk) sfx.sunk();
  renderBattle();
  const msg = res.sunk ? `You sank their ${SHIPS[res.idx].name}!` : res.hit ? `${cellName(i)}: a hit!` : `${cellName(i)}: a miss.`;
  setStatus(msg, res.hit ? "good" : "");
  if (allSunk(enemy)) return finish(true);
  await sleep(900);
  await enemyTurn();
  busy = false;
}

async function enemyTurn() {
  setStatus("The enemy is aiming…");
  await sleep(600);
  const remaining = SHIPS.map((s, idx) => (sunk(mine, idx) ? -1 : s.len)).filter((l) => l > 0);
  const i = aiShoot(aShots.slice(), resolved, remaining, settings.level);
  sfx.fire();
  const res = hitAt(mine, aShots, i);
  res.hit ? sfx.hit() : sfx.miss();
  if (res.sunk) {
    sfx.sunk();
    mine.ships[res.idx].cells.forEach((c) => resolved.add(c));
  }
  renderBattle();
  const msg = res.sunk ? `The enemy sank your ${SHIPS[res.idx].name} (${cellName(i)})!` : res.hit ? `The enemy hit your ship at ${cellName(i)}!` : `The enemy missed at ${cellName(i)}.`;
  setStatus(msg, res.hit ? "bad" : "");
  if (allSunk(mine)) return finish(false);
  await sleep(500);
  setStatus(`${msg} Your turn.`, res.hit ? "bad" : "");
}

function finish(won) {
  phase = "over";
  busy = false;
  renderBattle();
  won ? sfx.win() : sfx.lose();
  net.setOver(true);
  $("again").textContent = online() ? "Rematch" : "Play again";
  const shots = pShots.filter(Boolean).length;
  $("endEmoji").textContent = won ? "🏆" : "🌊";
  $("endTitle").textContent = won ? "Victory!" : "Your fleet was sunk";
  $("endText").textContent = won ? `You sank the whole enemy fleet in ${shots} shots.` : "The enemy found all your ships. Hide them better next time!";
  setStatus(won ? "You win!" : "You lose.", won ? "good" : "bad");
  setTimeout(() => $("end").classList.add("show"), 700);
}

function newGame() {
  phase = "placing";
  placed = [];
  selectedShip = 0;
  horizontal = true;
  hoverAt = -1;
  busy = false;
  $("end").classList.remove("show");
  myReady = false; theirReady = false; turnMine = false; awaiting = false; pendingShots = [];
  net.setOver(false);
  $("again").textContent = "Play again";
  $("placing").hidden = online() && !net.active;
  $("battle").hidden = true;
  $("start").textContent = online() ? "Ready!" : "Start battle";
  $("random").disabled = $("clearShips").disabled = $("rotate").disabled = false;
  buildGrid(placeGridEl, onPlaceCell, (i) => {
    hoverAt = i;
    renderPlacing();
  });
  renderPlacing();
}

function randomPlace() {
  const f = randomFleet();
  placed = f.ships.map((s) => ({ ...s, hits: 0 }));
  selectedShip = -1;
  hoverAt = -1;
  sfx.place();
  renderPlacing();
}

// ---------- controls ----------
function syncChips() {
  document.querySelectorAll("#mode .g-chip").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.value === settings.mode)));
  $("levelRow").hidden = online();
  $("newGame").hidden = online();
  if (online()) net.open(); else net.close();
  document.querySelectorAll("#level .g-chip").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.value === settings.level)));
}
document.querySelectorAll("#level .g-chip").forEach((b) =>
  b.addEventListener("click", () => {
    settings.level = b.dataset.value;
    store.set(SETTINGS_KEY, settings);
    syncChips();
  })
);
document.querySelectorAll("#mode .g-chip").forEach((b) =>
  b.addEventListener("click", () => {
    if (settings.mode === b.dataset.value) return;
    settings.mode = b.dataset.value;
    store.set(SETTINGS_KEY, settings);
    syncChips();
    newGame();
  })
);
$("rotate").addEventListener("click", rotate);
$("random").addEventListener("click", randomPlace);
$("clearShips").addEventListener("click", () => {
  placed = [];
  selectedShip = 0;
  renderPlacing();
});
$("start").addEventListener("click", startBattle);
$("newGame").addEventListener("click", newGame);
$("again").addEventListener("click", () => { if (online()) { net.rematch(); $("end").classList.remove("show"); } else newGame(); });
$("endView").addEventListener("click", () => $("end").classList.remove("show"));
document.addEventListener("keydown", (e) => {
  if ((e.key === "r" || e.key === "R") && phase === "placing") rotate();
});
const mute = $("mute");
function syncMute() {
  mute.textContent = settings.muted ? "Sound Off" : "Sound On";
  mute.setAttribute("aria-pressed", String(settings.muted));
}
mute.addEventListener("click", () => {
  settings.muted = !settings.muted;
  store.set(SETTINGS_KEY, settings);
  syncMute();
});

syncChips();
syncMute();
newGame();
const invited = net.roomParam();
if (invited) {
  settings.mode = "online";
  syncChips();
  newGame();
  net.join(invited);
}
window.__bs = {
  randomFleet, aiShoot, hitAt, allSunk, SHIPS, N, randomPlace, startBattle, fire, newGame,
  get phase() { return phase; }, get enemy() { return enemy; }, get mine() { return mine; }, get busy() { return busy; }, get pShots() { return pShots; }, get turnMine() { return turnMine; }, get awaiting() { return awaiting; }, get aShots() { return aShots; }, get myReady() { return myReady; },
};
