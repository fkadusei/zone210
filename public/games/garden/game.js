const $ = (id) => document.getElementById(id);
const rnd = (n) => Math.floor(Math.random() * n);

const PLANTS = [
  { id: "sunflower", name: "Sunflower", e: "🌻", cost: 0, reward: 3, wait: 14000 },
  { id: "tomato", name: "Tomato", e: "🍅", cost: 0, reward: 4, wait: 15000 },
  { id: "hibiscus", name: "Hibiscus", e: "🌺", cost: 10, reward: 6, wait: 17000 },
  { id: "pepper", name: "Pepper", e: "🌶️", cost: 15, reward: 6, wait: 18000 },
  { id: "maize", name: "Corn", e: "🌽", cost: 20, reward: 8, wait: 19000 },
  { id: "eggplant", name: "Eggplant", e: "🍆", cost: 25, reward: 8, wait: 20000 },
  { id: "pineapple", name: "Pineapple", e: "🍍", cost: 30, reward: 10, wait: 22000 },
  { id: "banana", name: "Banana", e: "🍌", cost: 35, reward: 10, wait: 22000 },
  { id: "mango", name: "Mango", e: "🥭", cost: 40, reward: 12, wait: 24000 },
  { id: "groundnut", name: "Peanut", e: "🥜", cost: 45, reward: 14, wait: 25000 },
];
const byId = (id) => PLANTS.find((p) => p.id === id);
const PLOT_COST = [0, 0, 0, 0, 0, 0, 15, 25, 40];
const MAX_WATER = 8;
const WATER_EVERY = 45000;
const KEY = "zone210_garden";

let S = { coins: 0, water: 5, waterAt: Date.now(), unlocked: ["sunflower", "tomato"], plots: new Array(9).fill(null), open: 6, collection: {}, best: {} };
try { const saved = JSON.parse(localStorage.getItem(KEY)); if (saved && saved.plots) S = { ...S, ...saved }; } catch (err) { /* storage unavailable */ }
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (err) { /* private mode */ } };
let seed = S.unlocked[0];

/* ---------- sounds ---------- */
function tone(freq, at, dur, type = "sine", vol = 0.08) {
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
const sfx = {
  plant: () => { tone(300, 0, 0.1); tone(450, 0.07, 0.1); },
  water: () => [700, 800, 650].forEach((f, i) => tone(f, i * 0.06, 0.12, "sine", 0.06)),
  harvest: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, i * 0.08, 0.2, "triangle")),
  flip: () => tone(500, 0, 0.06, "triangle", 0.06),
  match: () => [660, 880].forEach((f, i) => tone(f, i * 0.09, 0.18, "triangle")),
  no: () => tone(220, 0, 0.14, "sawtooth", 0.04),
};

const status = (t) => { $("status").textContent = t; };

/* ---------- water that comes back slowly ---------- */
function regen() {
  const now = Date.now();
  if (S.water >= MAX_WATER) { S.waterAt = now; return; }
  const n = Math.floor((now - S.waterAt) / WATER_EVERY);
  if (n > 0) { S.water = Math.min(MAX_WATER, S.water + n); S.waterAt += n * WATER_EVERY; if (S.water >= MAX_WATER) S.waterAt = now; }
}
function stats() { $("water").textContent = S.water; $("coins").textContent = S.coins; }

/* ---------- garden ---------- */
function seedbar() {
  $("seedbar").innerHTML = S.unlocked.map((id) => { const p = byId(id); return `<button type="button" class="seed" data-id="${id}" aria-pressed="${id === seed}"><span>${p.e}</span>${p.name}</button>`; }).join("");
}
$("seedbar").addEventListener("click", (e) => { const b = e.target.closest(".seed"); if (!b) return; seed = b.dataset.id; seedbar(); status(`Tap an empty patch to plant ${byId(seed).name.toLowerCase()}.`); });

const thirsty = (pl) => pl && pl.stage < 3 && Date.now() >= pl.thirstyAt;
function plotHTML(i) {
  if (i >= S.open) return `<span class="cost">🔒 ${PLOT_COST[i]} 🪙</span>`;
  const pl = S.plots[i];
  if (!pl) return "";
  const p = byId(pl.id);
  const e = pl.stage === 0 ? "🌰" : pl.stage === 1 ? "🌱" : pl.stage === 2 ? "🌿" : p.e;
  return `<span class="plant s${pl.stage}">${e}</span>${thirsty(pl) ? '<span class="need">💧</span>' : ""}`;
}
function plots() {
  $("plots").innerHTML = S.plots.map((pl, i) => `<button type="button" class="plot${i >= S.open ? " locked" : ""}${pl && pl.stage === 3 ? " ready" : ""}" data-i="${i}" aria-label="${plotLabel(i)}">${plotHTML(i)}</button>`).join("");
}
function plotLabel(i) {
  if (i >= S.open) return `Locked patch, costs ${PLOT_COST[i]} coins`;
  const pl = S.plots[i];
  if (!pl) return "Empty soil";
  const p = byId(pl.id);
  return pl.stage === 3 ? `${p.name}, ready to pick` : `${p.name}, growing${thirsty(pl) ? ", thirsty" : ""}`;
}
function paintPlot(i) {
  const b = $("plots").children[i];
  const pl = S.plots[i];
  b.className = `plot${i >= S.open ? " locked" : ""}${pl && pl.stage === 3 ? " ready" : ""}`;
  b.innerHTML = plotHTML(i);
  b.setAttribute("aria-label", plotLabel(i));
}
$("plots").addEventListener("click", (e) => {
  const b = e.target.closest(".plot");
  if (!b) return;
  const i = Number(b.dataset.i);
  regen();
  if (i >= S.open) {
    if (i !== S.open) { status("Open the patches in order."); sfx.no(); return; }
    if (S.coins >= PLOT_COST[i]) { S.coins -= PLOT_COST[i]; S.open += 1; save(); stats(); plots(); sfx.harvest(); status("A new patch of soil is ready!"); } else { sfx.no(); status(`You need ${PLOT_COST[i]} coins for this patch. Pick plants to earn coins.`); }
    return;
  }
  const pl = S.plots[i];
  if (!pl) {
    S.plots[i] = { id: seed, stage: 0, thirstyAt: 0 };
    save(); paintPlot(i); sfx.plant();
    status(`Planted ${byId(seed).name.toLowerCase()}. Now give it some water!`);
    return;
  }
  const p = byId(pl.id);
  if (pl.stage === 3) {
    S.coins += p.reward;
    S.collection[pl.id] = (S.collection[pl.id] || 0) + 1;
    S.plots[i] = null;
    save(); stats(); paintPlot(i); sfx.harvest();
    status(`You picked a ${p.name.toLowerCase()}! +${p.reward} coins. Plant something new.`);
    return;
  }
  if (!thirsty(pl)) { const s = Math.ceil((pl.thirstyAt - Date.now()) / 1000); status(`${p.name} is growing quietly. It will be thirsty in ${s} second${s === 1 ? "" : "s"}.`); return; }
  if (S.water < 1) { sfx.no(); status("The watering can is empty! Win a Memory Match to get more water."); return; }
  S.water -= 1;
  pl.stage += 1;
  pl.thirstyAt = Date.now() + p.wait;
  save(); stats(); sfx.water();
  paintPlot(i);
  const nb = $("plots").children[i];
  nb.classList.add("splash");
  setTimeout(() => nb.classList.remove("splash"), 700);
  status(pl.stage === 3 ? `Your ${p.name.toLowerCase()} is ready to pick!` : `Growing! Water it again when it gets thirsty.`);
});

// thirst shows up while you watch
let lastThirsty = [];
setInterval(() => {
  regen();
  stats();
  S.plots.forEach((pl, i) => {
    const t = !!thirsty(pl);
    if (lastThirsty[i] !== t) { lastThirsty[i] = t; if (pl && $("plots").children[i]) paintPlot(i); }
  });
}, 1000);

/* butterflies visit and give a coin when tapped */
function butterfly() {
  const f = $("fly");
  if (!document.hidden && !(window.z210Saver && window.z210Saver.on) && !$("p-garden").hidden) {
    f.style.top = `${15 + rnd(40)}%`;
    f.hidden = false;
    f.style.animation = "none";
    void f.offsetWidth;
    f.style.animation = "";
    setTimeout(() => { f.hidden = true; }, 9000);
  }
  setTimeout(butterfly, 22000 + rnd(20000));
}
$("fly").addEventListener("click", () => { $("fly").hidden = true; S.coins += 1; save(); stats(); sfx.match(); status("A butterfly left you a coin! 🦋"); });
setTimeout(butterfly, 9000);

/* ---------- memory match ---------- */
let pairs = 6;
let deck = [];
let open = [];
let moves = 0;
let found = 0;
let lock = false;
function mNew() {
  const faces = PLANTS.slice().sort(() => Math.random() - 0.5).slice(0, pairs).map((p) => p.e);
  deck = [...faces, ...faces].sort(() => Math.random() - 0.5);
  open = []; moves = 0; found = 0; lock = false;
  $("cards").className = `cards${pairs === 10 ? " five" : ""}`;
  $("cards").innerHTML = deck.map((e, i) => `<button type="button" class="mc" data-i="${i}" aria-label="Card ${i + 1}"><i></i><b>${e}</b></button>`).join("");
  $("mMoves").textContent = 0;
  $("mBest").textContent = S.best[pairs] || "-";
  $("mStatus").textContent = "Find the matching pairs. Every pair you find waters your garden!";
}
$("cards").addEventListener("click", (e) => {
  const b = e.target.closest(".mc");
  if (!b || lock || b.classList.contains("up")) return;
  b.classList.add("up");
  b.setAttribute("aria-label", `Card ${Number(b.dataset.i) + 1}: ${deck[Number(b.dataset.i)]}`);
  sfx.flip();
  open.push(b);
  if (open.length < 2) return;
  moves += 1;
  $("mMoves").textContent = moves;
  const [a, c] = open;
  if (deck[Number(a.dataset.i)] === deck[Number(c.dataset.i)]) {
    a.classList.add("done"); c.classList.add("done");
    open = []; found += 1; sfx.match();
    if (found === pairs) {
      const coins = Math.floor(pairs / 2);
      S.water = Math.min(MAX_WATER + 4, S.water + pairs);
      S.coins += coins;
      if (!S.best[pairs] || moves < S.best[pairs]) { S.best[pairs] = moves; $("mBest").textContent = moves; }
      save(); stats(); sfx.harvest();
      $("mStatus").textContent = `🎉 You found them all in ${moves} moves! +${pairs} 💧 and +${coins} 🪙.`;
    }
  } else {
    lock = true;
    setTimeout(() => { a.classList.remove("up"); c.classList.remove("up"); a.setAttribute("aria-label", `Card ${Number(a.dataset.i) + 1}`); c.setAttribute("aria-label", `Card ${Number(c.dataset.i) + 1}`); open = []; lock = false; }, 800);
  }
});
$("mlevel").addEventListener("click", (e) => {
  const c = e.target.closest(".g-chip");
  if (!c) return;
  $("mlevel").querySelectorAll(".g-chip").forEach((x) => x.setAttribute("aria-pressed", String(x === c)));
  pairs = Number(c.dataset.value);
  mNew();
});
$("mnew").addEventListener("click", mNew);

/* ---------- shop and plant book ---------- */
function shop() {
  const seeds = PLANTS.map((p) => (S.unlocked.includes(p.id)
    ? `<div class="item have"><span class="big">${p.e}</span><b>${p.name}</b><small>You own these seeds</small></div>`
    : `<div class="item"><span class="big">${p.e}</span><b>${p.name}</b><small>Seeds · pays ${p.reward} 🪙</small><button class="g-btn" data-buy="${p.id}">${p.cost} 🪙</button></div>`)).join("");
  const water = `<div class="item"><span class="big">💧</span><b>5 water drops</b><small>Fill the can</small><button class="g-btn" data-water="1">5 🪙</button></div>`;
  $("shop").innerHTML = water + seeds;
}
$("shop").addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  if (b.dataset.water) {
    if (S.coins < 5) { sfx.no(); return; }
    S.coins -= 5; S.water = Math.min(MAX_WATER + 4, S.water + 5);
  } else {
    const p = byId(b.dataset.buy);
    if (!p || S.coins < p.cost) { sfx.no(); return; }
    S.coins -= p.cost; S.unlocked.push(p.id);
  }
  save(); stats(); seedbar(); shop(); sfx.harvest();
});
function book() {
  const n = PLANTS.filter((p) => S.collection[p.id]).length;
  $("bookLead").textContent = `You have grown ${n} of ${PLANTS.length} kinds of plants. Pick them from your garden to collect them!`;
  $("book").innerHTML = PLANTS.map((p) => `<div class="item${S.collection[p.id] ? "" : " unseen"}"><span class="big">${p.e}</span><b>${S.collection[p.id] ? p.name : "???"}</b><small>${S.collection[p.id] ? `Grown ${S.collection[p.id]} time${S.collection[p.id] === 1 ? "" : "s"}` : "Not grown yet"}</small></div>`).join("");
}

/* ---------- tabs ---------- */
$("tabs").addEventListener("click", (e) => {
  const t = e.target.closest(".tab");
  if (!t) return;
  $("tabs").querySelectorAll(".tab").forEach((x) => x.setAttribute("aria-selected", String(x === t)));
  ["garden", "match", "shop", "book"].forEach((n) => { $(`p-${n}`).hidden = n !== t.dataset.tab; });
  if (t.dataset.tab === "shop") shop();
  if (t.dataset.tab === "book") book();
  if (t.dataset.tab === "garden") { seedbar(); plots(); }
});

regen();
stats();
seedbar();
plots();
mNew();
