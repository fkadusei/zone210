// Money & Shopping: count coins and notes, pay the exact price, give change, and go shopping on a budget.
// Works in a choice of currencies with one simple set of coins and notes. Amounts are kept in cents (whole numbers).
const $ = (id) => document.getElementById(id);
const store = {
  get(key, fallback) { try { const raw = localStorage.getItem(key); return raw === null ? fallback : JSON.parse(raw); } catch (err) { return fallback; } },
  set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (err) { /* private mode */ } },
};
const KEY = "zone210_money";
const data = { tab: "count", level: "whole", cur: "usd", stars: 0, muted: false, ...store.get(KEY, {}) };
const save = () => store.set(KEY, data);
const rnd = (n) => Math.floor(Math.random() * n);
const pick = (a) => a[rnd(a.length)];
const shuffle = (a) => { for (let i = a.length - 1; i > 0; i -= 1) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };

const CURRENCIES = {
  usd: { sym: "$", name: "Dollars", small: "cents" },
  eur: { sym: "€", name: "Euros", small: "cents" },
  gbp: { sym: "£", name: "Pounds", small: "pence" },
  inr: { sym: "₹", name: "Rupees", small: "paise" },
  ngn: { sym: "₦", name: "Naira", small: "kobo" },
  ghs: { sym: "₵", name: "Cedis", small: "pesewas" },
  kes: { sym: "KSh ", name: "Shillings", small: "cents" },
  zar: { sym: "R", name: "Rand", small: "cents" },
};
const C = () => CURRENCIES[data.cur] || CURRENCIES.usd;
// one simple set of money, in cents: coins, then notes
const COINS = [1, 5, 10, 20, 50, 100, 200];
const NOTES = [500, 1000, 2000, 5000];
const LEVELS = {
  whole: { label: "Whole amounts", money: [100, 200, 500, 1000], max: 2000, step: 100 },
  big: { label: "Up to 100", money: [100, 200, 500, 1000, 2000, 5000], max: 10000, step: 100 },
  cents: { label: "With cents", money: [5, 10, 20, 50, 100, 200, 500, 1000], max: 2000, step: 5 },
};
const L = () => LEVELS[data.level] || LEVELS.whole;
const fmt = (c) => (L().step >= 100 && c % 100 === 0 ? `${C().sym}${c / 100}` : `${C().sym}${(c / 100).toFixed(2)}`);
const label = (c) => (c < 100 ? `${c}${C().small[0]}` : `${C().sym}${c / 100}`); // 50c, 50p, 50k...: the first letter of the small unit
const isNote = (c) => NOTES.includes(c);
const piece = (c, extra = "") => `<span class="money ${isNote(c) ? "note" : "coin"} v${c}" ${extra}>${label(c)}</span>`;
/** fewest coins and notes that make an amount, using what this level allows */
function makeChange(amount, set = L().money) {
  const out = [];
  [...set].sort((a, b) => b - a).forEach((v) => { while (amount >= v) { out.push(v); amount -= v; } });
  return amount === 0 ? out : null;
}
const randAmount = (min, max) => { const s = L().step; return Math.max(s, Math.round((min + Math.random() * (max - min)) / s) * s); };

const SHOP = [["🍎", "apple"], ["🍌", "banana"], ["🧃", "juice"], ["🍞", "bread"], ["🥛", "milk"], ["🧸", "teddy"], ["⚽", "ball"], ["🖍️", "crayons"], ["📕", "book"], ["🪁", "kite"], ["🍦", "ice cream"], ["🧁", "cupcake"], ["🎈", "balloon"], ["🪀", "yo-yo"], ["✏️", "pencil"], ["🍪", "cookie"], ["🧀", "cheese"], ["🥚", "eggs"]];

// ---------- sounds ----------
function tone(freqs, type = "sine", vol = 0.14) {
  if (data.muted) return;
  const ac = window.z210Audio && window.z210Audio.get();
  if (!ac) return;
  freqs.forEach((f, i) => { const o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.value = f; const t = ac.currentTime + i * 0.08; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.26); o.connect(g).connect(ac.destination); o.start(t); o.stop(t + 0.28); });
}
const clink = () => tone([1500, 2100], "sine", 0.06);
const yes = () => tone([660, 880, 1320]);
const no = () => tone([240, 190], "triangle");
const till = () => tone([1200, 1600, 2000, 2600], "triangle", 0.08);

// ---------- tabs ----------
const view = $("view");
const TABS = { count: () => start("count"), pay: () => start("pay"), change: () => start("change"), shop: viewShop };
function setTab(tab) {
  data.tab = TABS[tab] ? tab : "count"; save();
  document.querySelectorAll("#tabs .g-chip").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.tab === data.tab)));
  TABS[data.tab]();
}
$("tabs").addEventListener("click", (e) => { const b = e.target.closest("[data-tab]"); if (b) setTab(b.dataset.tab); });
const opts = () => `<div class="optbar"><div class="g-chips" role="group" aria-label="Level">${Object.entries(LEVELS).map(([k, l]) => `<button class="g-chip" data-level="${k}" aria-pressed="${k === data.level}">${l.label}</button>`).join("")}</div>
  <label class="cur">Money <select id="cur">${Object.entries(CURRENCIES).map(([k, c]) => `<option value="${k}" ${k === data.cur ? "selected" : ""}>${c.sym.trim()} ${c.name}</option>`).join("")}</select></label></div>`;
view.addEventListener("click", (e) => { const b = e.target.closest("[data-level]"); if (b) { data.level = b.dataset.level; save(); TABS[data.tab](); } });
view.addEventListener("change", (e) => { if (e.target.id === "cur") { data.cur = e.target.value; save(); TABS[data.tab](); } });
const paintStars = () => { $("stars").textContent = `⭐ ${data.stars}`; };
const muteBtn = () => { $("mute").textContent = data.muted ? "🔇 Sound off" : "🔊 Sound on"; $("mute").setAttribute("aria-pressed", String(!data.muted)); };
$("mute").addEventListener("click", () => { data.muted = !data.muted; save(); muteBtn(); });

// ---------- rounds: count, pay, change ----------
const ROUNDS = 8;
let R = null;
function start(kind) { R = { kind, n: 0, got: 0 }; next(); }
const meter = () => `<div class="meter">${Array.from({ length: ROUNDS }, (_, i) => `<i class="${i < R.n ? "done" : i === R.n ? "now" : ""}"></i>`).join("")}</div>`;
function next() {
  if (R.n >= ROUNDS) return finish();
  R.tries = 0;
  if (R.kind === "count") roundCount(); else if (R.kind === "pay") roundPay(); else roundChange();
}
function roundCount() {
  const pieces = Array.from({ length: 2 + rnd(data.level === "whole" ? 3 : 5) }, () => pick(L().money)).sort((a, b) => b - a);
  const total = pieces.reduce((a, b) => a + b, 0);
  const wrong = new Set();
  while (wrong.size < 3) { const d = pick([L().step, 2 * L().step, 5 * L().step, 10 * L().step, 100]) * (Math.random() < 0.5 ? -1 : 1); if (total + d > 0 && d !== 0) wrong.add(total + d); }
  const options = shuffle([total, ...wrong]);
  view.innerHTML = `${opts()}${meter()}<p class="q">How much money is here?</p><div class="tray big">${pieces.map((c) => piece(c)).join("")}</div>
    <div class="choices">${options.map((v) => `<button class="choice" data-v="${v}">${fmt(v)}</button>`).join("")}</div><p class="tip">Tip: start with the biggest one, then count on.</p>`;
  view.querySelectorAll(".choice").forEach((b) => b.addEventListener("click", () => {
    if (Number(b.dataset.v) === total) { b.classList.add("right"); win(`That's ${fmt(total)}!`); }
    else { b.classList.add("wrong"); b.disabled = true; R.tries += 1; no(); }
  }));
}
function wallet(set) {
  return `<div class="wallet" aria-label="Your money">${set.map((c) => `<button class="pay" data-c="${c}" aria-label="Add ${label(c)}">${piece(c)}</button>`).join("")}</div>`;
}
function tray(onChange) {
  // the money you are handing over; tap a piece on the tray to take it back
  const st = { list: [] };
  const draw = () => {
    $("tray").innerHTML = st.list.length ? st.list.map((c, i) => `<button class="back" data-i="${i}" aria-label="Take back ${label(c)}">${piece(c)}</button>`).join("") : '<span class="empty">Tap money below to put it here.</span>';
    $("sum").textContent = fmt(st.list.reduce((a, b) => a + b, 0));
    onChange && onChange();
  };
  view.querySelector(".wallet").addEventListener("click", (e) => { const b = e.target.closest(".pay"); if (!b) return; st.list.push(Number(b.dataset.c)); st.list.sort((a, c) => c - a); clink(); draw(); });
  $("tray").addEventListener("click", (e) => { const b = e.target.closest(".back"); if (!b) return; st.list.splice(Number(b.dataset.i), 1); draw(); });
  draw();
  return st;
}
function roundPay() {
  const [e, name] = pick(SHOP);
  const price = randAmount(L().step, Math.min(L().max, data.level === "whole" ? 1500 : L().max));
  view.innerHTML = `${opts()}${meter()}<div class="item"><span class="ie">${e}</span><span class="tag">${fmt(price)}</span></div><p class="q">Pay exactly ${fmt(price)} for the ${name}.</p>
    <div class="tray" id="tray"></div><p class="sumline">You are paying: <b id="sum"></b></p>${wallet(L().money)}<div class="row"><button class="g-btn" id="go">Pay 🛒</button></div><p class="live" id="live" aria-live="polite"></p>`;
  const st = tray();
  $("go").addEventListener("click", () => {
    const paid = st.list.reduce((a, b) => a + b, 0);
    if (paid === price) { $("go").disabled = true; till(); win("Exactly right!"); }
    else { R.tries += 1; no(); $("live").textContent = paid < price ? `That's ${fmt(price - paid)} too little.` : `That's ${fmt(paid - price)} too much. Can you pay exactly?`; }
  });
}
function roundChange() {
  const [e, name] = pick(SHOP);
  const notes = L().money.filter((v) => v >= (data.level === "cents" ? 200 : 500));
  const given = pick(notes.length ? notes : [L().money[L().money.length - 1]]);
  const price = randAmount(L().step, given - L().step);
  const due = given - price;
  const coinSet = L().money.filter((v) => v < given);
  view.innerHTML = `${opts()}${meter()}<div class="item"><span class="ie">${e}</span><span class="tag">${fmt(price)}</span><span class="cust">🧑 pays with ${piece(given)}</span></div>
    <p class="q">The ${name} costs ${fmt(price)}. The customer pays ${fmt(given)}. Give the right change.</p>
    <div class="tray" id="tray"></div><p class="sumline">Change: <b id="sum"></b></p>${wallet(coinSet)}<div class="row"><button class="g-btn" id="go">Give change</button></div><p class="live" id="live" aria-live="polite"></p>
    <p class="tip">Tip: count up from ${fmt(price)} to ${fmt(given)}.</p>`;
  const st = tray();
  $("go").addEventListener("click", () => {
    const back = st.list.reduce((a, b) => a + b, 0);
    if (back === due) { $("go").disabled = true; till(); win(`Yes! ${fmt(price)} + ${fmt(due)} = ${fmt(given)}.`); }
    else { R.tries += 1; no(); $("live").textContent = back < due ? "Not enough change yet." : "That's too much change!"; }
  });
}
function win(msg) {
  yes();
  if (R.tries === 0) { R.got += 1; data.stars += 1; save(); paintStars(); }
  const live = $("live");
  if (live) live.textContent = msg;
  R.n += 1;
  setTimeout(next, 1300);
}
function finish() {
  view.innerHTML = `<div class="done"><p class="big">🏆</p><h2>Well done!</h2><p>You got ${R.got} of ${ROUNDS} right first time.</p><p class="starsrow">${"⭐".repeat(R.got)}</p><button class="g-btn" id="again">Play again</button></div>`;
  $("again").addEventListener("click", () => start(R.kind));
}

// ---------- shopping trip ----------
function viewShop() {
  const budget = data.level === "big" ? pick([2000, 3000, 5000]) : data.level === "cents" ? pick([500, 750, 1000]) : pick([1000, 1500, 2000]);
  const items = shuffle([...SHOP]).slice(0, 8).map(([e, n]) => ({ e, n, p: randAmount(L().step, budget * 0.45) }));
  const tasks = [["Spend as much as you can without going over your budget.", (b, t) => t <= budget && budget - t <= Math.max(L().step, budget * 0.1)], ["Buy exactly three things and stay within budget.", (b, t) => b.length === 3 && t <= budget], ["Buy something to eat and something to play with.", (b, t) => t <= budget && b.some((x) => FOOD.has(x.e)) && b.some((x) => !FOOD.has(x.e))]];
  const [task, ok] = pick(tasks);
  const basket = [];
  view.innerHTML = `${opts()}<div class="budget"><span>Your budget</span><b>${fmt(budget)}</b></div><p class="q">${task}</p>
    <div class="shop">${items.map((it, i) => `<button class="shelf" data-i="${i}"><span class="ie">${it.e}</span><span>${it.n}</span><b>${fmt(it.p)}</b></button>`).join("")}</div>
    <h3 class="bh">🧺 Basket <span id="btot"></span></h3><div class="basket" id="basket"></div><div class="row"><button class="g-btn" id="buy">Go to the till 🛒</button><button class="g-btn ghost" id="newshop">New shop</button></div><p class="live" id="live" aria-live="polite"></p>`;
  const draw = () => {
    const tot = basket.reduce((a, x) => a + x.p, 0);
    $("basket").innerHTML = basket.length ? basket.map((x, i) => `<button class="inb" data-i="${i}" aria-label="Take the ${x.n} out">${x.e} ${fmt(x.p)}</button>`).join("") : '<span class="empty">Tap things in the shop to add them.</span>';
    $("btot").innerHTML = `Total <b class="${tot > budget ? "over" : ""}">${fmt(tot)}</b> · Left <b class="${tot > budget ? "over" : ""}">${fmt(budget - tot)}</b>`;
  };
  view.querySelector(".shop").addEventListener("click", (e) => { const b = e.target.closest(".shelf"); if (!b) return; basket.push(items[Number(b.dataset.i)]); clink(); draw(); });
  $("basket").addEventListener("click", (e) => { const b = e.target.closest(".inb"); if (!b) return; basket.splice(Number(b.dataset.i), 1); draw(); });
  $("buy").addEventListener("click", () => {
    const tot = basket.reduce((a, x) => a + x.p, 0);
    if (!basket.length) { $("live").textContent = "Your basket is empty!"; return; }
    if (ok(basket, tot)) { till(); yes(); data.stars += 2; save(); paintStars(); $("live").textContent = `Brilliant shopping! You spent ${fmt(tot)} and have ${fmt(budget - tot)} left. ⭐⭐`; $("buy").disabled = true; }
    else { no(); $("live").textContent = tot > budget ? `Oh no, that's ${fmt(tot - budget)} over your budget. Take something out.` : "Not quite. Read the task again and try changing your basket."; }
  });
  $("newshop").addEventListener("click", viewShop);
  draw();
}
const FOOD = new Set(["🍎", "🍌", "🧃", "🍞", "🥛", "🍦", "🧁", "🍪", "🧀", "🥚"]);

paintStars();
muteBtn();
setTab(data.tab);
window.__money = { makeChange, fmt };
