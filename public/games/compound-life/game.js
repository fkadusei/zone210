import { SETTINGS, ITEMS, NEEDS, NEED_LABEL, NEED_ICON, ACTIONS, JOBS, SKINS, HAIRS, OUTFITS, NAMES } from "./data.js";
import { newHousehold, update, timeText, order, cancelAll, optionsFor, itemAt, buy, sell, move, canPlace, statusOf, gradeLetter } from "./sim.js";
import { drawScene, WIDTH, HEIGHT, T, OY, itemPreview, portrait } from "./draw.js";

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const cv = $("cv");
const ctx = cv.getContext("2d");
const SAVE = "zone210_life";
const MPS = [0, 1.5, 6, 24]; // game minutes per real second at each speed
const saverOn = () => !!(window.z210Saver && window.z210Saver.on);

let saves = {};
try { saves = JSON.parse(localStorage.getItem(SAVE)) || {}; } catch (err) { saves = {}; }
let H = null;
let speed = 1;
let selected = null;
let mode = "live";
let placing = null; // { id } to buy, or { uid } to move
let ghost = null;
let lastLog = null;

function persist() {
  if (!H) return;
  saves[H.setting] = H;
  saves.last = H.setting;
  try { localStorage.setItem(SAVE, JSON.stringify(saves)); } catch (err) { /* storage full or private */ }
}
setInterval(persist, 15000);
addEventListener("pagehide", persist);
document.addEventListener("visibilitychange", () => { if (document.hidden) persist(); });

/* ---------------------------------------------------------------- sounds */
function tone(f, d = 0.12, type = "triangle", vol = 0.06, at = 0) {
  const c = window.z210Audio && window.z210Audio.get();
  if (!c) return;
  const t = c.currentTime + at;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type; o.frequency.value = f;
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + d + 0.05);
}
const sfx = { tap: () => tone(660, 0.07), ok: () => { tone(523, 0.1); tone(784, 0.14, "triangle", 0.06, 0.08); }, no: () => tone(200, 0.15, "sawtooth", 0.04), cash: () => { tone(988, 0.08, "square", 0.04); tone(1318, 0.12, "square", 0.04, 0.07); } };

/* ---------------------------------------------------------------- the start screen: pick a home, build a family */
let draft = null;
function housePreview(setting) {
  const temp = newHousehold({ setting, people: [], seed: 1 });
  const c = document.createElement("canvas");
  c.width = WIDTH; c.height = HEIGHT;
  drawScene(c.getContext("2d"), temp, { t: 0 });
  return c.toDataURL("image/jpeg", 0.8);
}
const previews = {};
function randomPerson(age, i) {
  const names = NAMES[age];
  return { name: names[(i * 3 + Math.floor(Math.random() * names.length)) % names.length], age, skin: SKINS[Math.floor(Math.random() * 4)], hair: age === "adult" ? ["short", "afro", "braids", "bun"][Math.floor(Math.random() * 4)] : ["short", "puffs", "afro", "braids"][Math.floor(Math.random() * 4)], outfit: OUTFITS[Math.floor(Math.random() * OUTFITS.length)], job: null };
}
function showStart() {
  H = null;
  $("play").hidden = true;
  $("start").hidden = false;
  if (!draft) draft = { setting: saves.last || "compound", people: [randomPerson("adult", 0), randomPerson("adult", 1), randomPerson("child", 2)], step: "home" };
  ["city", "compound"].forEach((s) => { if (!previews[s]) previews[s] = housePreview(s); });
  if (draft.step === "home") {
    $("start").innerHTML = `<h2>Choose a home</h2><div class="choices">${["compound", "city"].map((s) => {
      const sv = saves[s];
      return `<button class="home-card" data-home="${s}" aria-pressed="${draft.setting === s}"><img src="${previews[s]}" alt=""><b>${s === "city" ? "🏙️" : "🏘️"} ${SETTINGS[s].name}</b><span>${SETTINGS[s].blurb} Starting money ₵${SETTINGS[s].money.toLocaleString()}.</span>${sv ? `<span class="cont">Saved family: ${esc(sv.people.map((p) => p.name).join(", "))} · Day ${sv.day - 4}</span>` : ""}</button>`;
    }).join("")}</div>
    <div class="row">${saves[draft.setting] ? '<button class="g-btn" data-act="continue">▶ Continue this family</button><button class="g-btn ghost" data-act="family">Start a new family here</button>' : '<button class="g-btn" data-act="family">Next: create your family ▶</button>'}</div>`;
    return;
  }
  // the family builder
  $("start").innerHTML = `<h2>Create your family <small style="color:var(--muted);font-weight:600">· ${SETTINGS[draft.setting].name}</small></h2>
    <div class="members">${draft.people.map((p, i) => `<div class="member" data-i="${i}">
      <img src="${portrait(p)}" alt="">
      <div class="fields">
        <input value="${esc(p.name)}" maxlength="14" data-f="name" aria-label="Name">
        <div class="row"><span class="lbl">Age</span>${["adult", "child"].map((a) => `<button class="mini" data-f="age" data-v="${a}" aria-pressed="${p.age === a}">${a === "adult" ? "Grown-up" : "Child"}</button>`).join("")}</div>
        <div class="row"><span class="lbl">Skin</span>${SKINS.map((s) => `<button class="sw" style="background:${s}" data-f="skin" data-v="${s}" aria-pressed="${p.skin === s}" aria-label="Skin tone"></button>`).join("")}</div>
        <div class="row"><span class="lbl">Hair</span>${HAIRS.map((h) => `<button class="mini" data-f="hair" data-v="${h}" aria-pressed="${p.hair === h}">${{ short: "Short", afro: "Afro", puffs: "Puffs", braids: "Braids", bun: "Bun", bald: "Bald" }[h]}</button>`).join("")}</div>
        <div class="row"><span class="lbl">Clothes</span>${OUTFITS.map((o) => `<button class="sw" style="background:${o}" data-f="outfit" data-v="${o}" aria-pressed="${p.outfit === o}" aria-label="Clothes colour"></button>`).join("")}</div>
        ${p.age === "adult" ? `<div class="row"><span class="lbl">Job</span><select data-f="job" aria-label="Job"><option value="">No job yet (find one later)</option>${SETTINGS[draft.setting].jobs.map((j) => `<option value="${j}" ${p.job === j ? "selected" : ""}>${JOBS[j].titles[0]} · ${JOBS[j].start}:00–${JOBS[j].end}:00 · ₵${JOBS[j].pay[0]}/day</option>`).join("")}</select></div>` : '<div class="facts">Goes to school on weekdays.</div>'}
      </div>
      ${draft.people.length > 1 ? `<button class="mini" data-act="remove" aria-label="Remove ${esc(p.name)}">✕</button>` : "<span></span>"}
    </div>`).join("")}</div>
    <div class="row">${draft.people.length < 4 ? '<button class="g-btn ghost" data-act="add">+ Add a person</button>' : ""}<button class="g-btn ghost" data-act="back">◀ Back</button><button class="g-btn" data-act="start">🏠 Move in!</button></div>`;
}
$("start").addEventListener("click", (e) => {
  const home = e.target.closest("[data-home]");
  if (home) { draft.setting = home.dataset.home; sfx.tap(); showStart(); return; }
  const b = e.target.closest("[data-act], [data-f]");
  if (!b) return;
  const m = b.closest(".member");
  const p = m ? draft.people[Number(m.dataset.i)] : null;
  if (b.dataset.f && p && b.dataset.v) {
    p[b.dataset.f] = b.dataset.v;
    if (b.dataset.f === "age") { p.name = NAMES[p.age][Math.floor(Math.random() * NAMES[p.age].length)]; if (p.age === "child") p.job = null; }
    showStart();
    return;
  }
  const act = b.dataset.act;
  if (act === "family") { draft.step = "family"; showStart(); }
  else if (act === "back") { draft.step = "home"; showStart(); }
  else if (act === "add") { draft.people.push(randomPerson(draft.people.length >= 2 ? "child" : "adult", draft.people.length)); showStart(); }
  else if (act === "remove" && p) { draft.people.splice(draft.people.indexOf(p), 1); showStart(); }
  else if (act === "continue") { startGame(saves[draft.setting]); }
  else if (act === "start") { startGame(newHousehold({ setting: draft.setting, people: draft.people.map((x) => ({ ...x, name: x.name.trim() || "Friend" })) })); }
});
$("start").addEventListener("input", (e) => {
  const m = e.target.closest(".member");
  if (!m) return;
  const p = draft.people[Number(m.dataset.i)];
  if (e.target.dataset.f === "name") p.name = e.target.value;
  if (e.target.dataset.f === "job") p.job = e.target.value || null;
});
$("newGame").addEventListener("click", () => { persist(); draft = null; showStart(); });

/* ---------------------------------------------------------------- playing */
function startGame(h) {
  H = h;
  selected = H.people[0] ? H.people[0].id : null;
  lastLog = H.log[0] || null;
  draft = null;
  $("start").hidden = true;
  $("play").hidden = false;
  setMode("live");
  resize();
  drawFamily();
  drawPanels();
  persist();
}
function resize() {
  const dpr = saverOn() ? 1 : Math.min(2, window.devicePixelRatio || 1);
  const w = Math.min(1000, cv.getBoundingClientRect().width || 1000);
  cv.width = Math.round(w * dpr);
  cv.height = Math.round((w * dpr * HEIGHT) / WIDTH);
}
addEventListener("resize", () => { if (H) resize(); });

const person = (id) => H.people.find((p) => p.id === id);
function setSpeed(s) {
  speed = s;
  document.querySelectorAll(".sp").forEach((b) => b.setAttribute("aria-pressed", String(Number(b.dataset.s) === s)));
}
document.querySelector(".speeds").addEventListener("click", (e) => { const b = e.target.closest(".sp"); if (b) { setSpeed(Number(b.dataset.s)); sfx.tap(); } });
setSpeed(1);
function setMode(m) {
  mode = m;
  placing = null;
  ghost = null;
  $("liveMode").setAttribute("aria-pressed", String(m === "live"));
  $("buyMode").setAttribute("aria-pressed", String(m === "buy"));
  $("shop").hidden = m !== "buy";
  $("person").hidden = m === "buy";
  hideMenu();
  if (m === "buy") drawShop();
}
$("liveMode").addEventListener("click", () => setMode("live"));
$("buyMode").addEventListener("click", () => setMode("buy"));

/* ---- the family bar and the person panel ---- */
const portraits = new Map();
function drawFamily() {
  setHTML($("family"), H.people.map((p) => {
    const key = `${p.id}:${p.hair}:${p.skin}:${p.outfit}`;
    if (!portraits.has(key)) portraits.set(key, portrait(p));
    const face = p.mood > 70 ? "😄" : p.mood > 45 ? "🙂" : p.mood > 25 ? "😕" : "😫";
    return `<button class="fam" data-id="${p.id}" aria-pressed="${selected === p.id}"><img src="${portraits.get(key)}" alt="">${esc(p.name)} ${face}<small>${p.away ? (p.age === "adult" ? "at work" : "at school") : ""}</small></button>`;
  }).join(""));
}
$("family").addEventListener("click", (e) => { const b = e.target.closest(".fam"); if (!b) return; selected = Number(b.dataset.id); sfx.tap(); drawFamily(); drawPanels(); });
const barColor = (v) => (v > 60 ? "#2fb36d" : v > 30 ? "#f5a623" : "#e5484d");
function drawPanels() {
  if (!H) return;
  $("money").textContent = `₵${Math.round(H.money).toLocaleString()}`;
  $("money").classList.toggle("debt", H.money < 0);
  $("clock").textContent = `Day ${H.day - 4} · ${timeText(H)}`;
  const p = person(selected);
  if (p && mode === "live") {
    const job = p.age === "adult" ? (p.job ? `${JOBS[p.job].titles[p.level]} (${JOBS[p.job].start}:00–${JOBS[p.job].end}:00, ₵${JOBS[p.job].pay[p.level]}/day) · performance ${Math.max(0, Math.round(p.perf))}%` : "No job yet: look for work on the phone or computer.") : `School grade: <b>${gradeLetter(p.grade)}</b> (homework helps)`;
    const skills = Object.entries(p.skills).filter(([, v]) => v >= 0.5).map(([k, v]) => `${k} ${v.toFixed(1)}`).join(", ") || "none yet";
    setHTML($("person"), `<h3>${esc(p.name)} · ${statusOf(H, p)}</h3>
      <div class="needs">${NEEDS.map((n) => `<div class="need" title="${NEED_LABEL[n]}"><span>${NEED_ICON[n]}</span><span><span class="bar"><i data-n="${n}"></i></span></span></div>`).join("")}</div>
      <div class="facts">${job}<br>Skills: ${skills}${H.mangoes ? ` · 🥭 ${H.mangoes} mangoes in the house` : ""}</div>
      <div class="queue">${p.act && p.act.type !== "leave" && ACTIONS[p.act.type] ? `<span class="mini" aria-pressed="true">${ACTIONS[p.act.type].icon} ${ACTIONS[p.act.type].label}</span>` : ""}${p.queue.map((q, i) => (ACTIONS[q.type] ? `<button class="mini" data-cancel="${i}">${ACTIONS[q.type].icon} ${ACTIONS[q.type].label} ✕</button>` : "")).join("")}</div>
      <div class="row" style="margin-top:8px"><button class="mini" data-do="phone">📱 Call a friend</button>${H.mangoes ? '<button class="mini" data-do="mangosnack">🥭 Eat a mango</button>' : ""}${p.age === "adult" && !p.job ? '<button class="mini" data-do="findwork">💼 Look for work</button>' : ""}<button class="mini" data-do="stop">✋ Stop</button></div>
      <label class="toggle"><input type="checkbox" id="fw" ${H.freeWill ? "checked" : ""}> Free will (people look after themselves)</label>`);
    $("person").querySelectorAll("[data-n]").forEach((i) => { const v = p.needs[i.dataset.n]; i.style.width = `${Math.round(v)}%`; i.style.background = barColor(v); });
  }
  setHTML($("log"), H.log.slice(0, 14).map((l) => { const h = Math.floor(l.minute / 60); const mm = String(l.minute % 60).padStart(2, "0"); return `<li><b>Day ${l.day - 4} ${h}:${mm}</b> ${esc(l.text)}</li>`; }).join(""));
}
function setHTML(el, html) { if (el.__html !== html) { el.__html = html; el.innerHTML = html; } }
$("person").addEventListener("click", (e) => {
  const p = person(selected);
  if (!p) return;
  const c = e.target.closest("[data-cancel]");
  if (c) { p.queue.splice(Number(c.dataset.cancel), 1); drawPanels(); return; }
  const d = e.target.closest("[data-do]");
  if (d) {
    if (d.dataset.do === "stop") cancelAll(H, p);
    else if (!order(H, p, d.dataset.do)) { toast(`${p.name} can't do that right now.`); sfx.no(); return; }
    sfx.ok();
    drawPanels();
  }
});
$("person").addEventListener("change", (e) => { if (e.target.id === "fw") H.freeWill = e.target.checked; });

/* ---- the shop ---- */
let shopCat = "Bedroom";
const previewCache = new Map();
function drawShop() {
  const avail = Object.entries(ITEMS).filter(([, it]) => it.where === "both" || it.where === H.setting);
  const cats = [...new Set(avail.map(([, it]) => it.cat))];
  if (!cats.includes(shopCat)) shopCat = cats[0];
  $("shop").innerHTML = `<h3>Buy furniture · ₵${Math.round(H.money).toLocaleString()}</h3><p class="facts">Tap an item, then tap the floor to place it. Tap something you own to move or sell it.</p>
    <div class="cats">${cats.map((c) => `<button class="mini" data-cat="${c}" aria-pressed="${c === shopCat}">${c}</button>`).join("")}</div>
    <div class="items">${avail.filter(([, it]) => it.cat === shopCat).map(([id, it]) => {
      const key = `${id}:${H.setting}`;
      if (!previewCache.has(key)) previewCache.set(key, itemPreview(id, H.setting));
      return `<button class="item" data-buy="${id}" aria-pressed="${placing && placing.id === id}" ${H.money < it.price ? "disabled" : ""}><img src="${previewCache.get(key)}" alt="">${it.name}<small>₵${it.price}</small></button>`;
    }).join("")}</div>`;
}
$("shop").addEventListener("click", (e) => {
  const c = e.target.closest("[data-cat]");
  if (c) { shopCat = c.dataset.cat; drawShop(); return; }
  const b = e.target.closest("[data-buy]");
  if (b && !b.disabled) { placing = { id: b.dataset.buy }; sfx.tap(); drawShop(); toast(`Tap the floor to place the ${ITEMS[b.dataset.buy].name.toLowerCase()}.`); }
});

/* ---- tapping the house ---- */
function where(e) {
  const r = cv.getBoundingClientRect();
  const x = ((e.clientX - r.left) / r.width) * WIDTH;
  const y = ((e.clientY - r.top) / r.height) * HEIGHT;
  return { x, y, tx: Math.floor(x / T), ty: Math.floor((y - OY) / T), sx: e.clientX - r.left, sy: e.clientY - r.top };
}
function personAt(x, y) {
  let best = null;
  H.people.forEach((p) => { if (p.away) return; const px = p.x * T + T / 2; const py = p.y * T + OY + T - 26; const d = Math.hypot(px - x, py - y); if (d < 26 && (!best || d < best.d)) best = { p, d }; });
  return best ? best.p : null;
}
cv.addEventListener("pointermove", (e) => {
  if (!H || mode !== "buy" || !placing) return;
  const w = where(e);
  const id = placing.id || H.furniture.find((f) => f.uid === placing.uid).id;
  const it = ITEMS[id];
  const gx = Math.max(0, Math.min(w.tx, 20 - it.w));
  const gy = Math.max(0, Math.min(w.ty, 14 - it.h));
  ghost = { id, x: gx, y: gy, ok: canPlace(H, id, gx, gy, placing.uid) && (placing.uid || H.money >= it.price) };
});
cv.addEventListener("click", (e) => {
  if (!H) return;
  const w = where(e);
  hideMenu();
  if (mode === "buy") {
    if (placing) {
      const id = placing.id || H.furniture.find((f) => f.uid === placing.uid).id;
      const it = ITEMS[id];
      const gx = Math.max(0, Math.min(w.tx, 20 - it.w));
      const gy = Math.max(0, Math.min(w.ty, 14 - it.h));
      const ok = placing.uid ? move(H, placing.uid, gx, gy) : buy(H, id, gx, gy);
      if (ok) { sfx.cash(); toast(placing.uid ? `Moved the ${it.name.toLowerCase()}.` : `Bought a ${it.name.toLowerCase()} for ₵${it.price}.`); placing = null; ghost = null; drawShop(); }
      else { sfx.no(); toast(H.money < it.price && !placing.uid ? "Not enough money." : "It doesn't fit there (and doorways must stay clear)."); }
      return;
    }
    const f = itemAt(H, w.tx, w.ty);
    if (f) showMenu(w, ITEMS[f.id].name, [{ label: "✋ Move it", go: () => { placing = { uid: f.uid }; toast("Tap where it should go."); } }, { label: `💰 Sell for ₵${Math.floor(ITEMS[f.id].price / 2)}`, go: () => { const back = sell(H, f.uid); sfx.cash(); toast(`Sold for ₵${back}.`); drawShop(); } }]);
    return;
  }
  // live mode
  const who = personAt(w.x, w.y);
  const me = person(selected);
  if (who) {
    if (me && who !== me && !me.away) {
      showMenu(w, who.name, [{ label: `💬 ${me.name}: chat with ${who.name}`, go: () => chatWith(me, who) }, { label: `👆 Switch to ${who.name}`, go: () => { selected = who.id; drawFamily(); drawPanels(); } }]);
    } else { selected = who.id; sfx.tap(); drawFamily(); drawPanels(); }
    return;
  }
  const f = itemAt(H, w.tx, w.ty);
  if (!f) return;
  if (!me) { toast("Tap a family member first."); return; }
  if (me.away) { toast(`${me.name} is ${me.age === "adult" ? "at work" : "at school"} right now.`); return; }
  const opts = optionsFor(H, me).filter((o) => o.uid === f.uid);
  if (!opts.length) { toast(`${me.name} can't use the ${ITEMS[f.id].name.toLowerCase()}.`); return; }
  showMenu(w, `${me.name} · ${ITEMS[f.id].name}`, opts.map((o) => ({ label: `${ACTIONS[o.type].icon} ${ACTIONS[o.type].label}`, go: () => { if (order(H, me, o.type, o.uid)) { sfx.ok(); drawPanels(); } else { sfx.no(); toast("Not possible right now."); } } })));
});
function chatWith(me, who) {
  if (order(H, me, "chat", null, { with: who.id })) sfx.ok(); else sfx.no();
  drawPanels();
}
function showMenu(w, title, items) {
  const m = $("menu");
  m.innerHTML = `<h4>${esc(title)}</h4>${items.map((it, i) => `<button data-i="${i}" role="menuitem">${esc(it.label)}</button>`).join("")}<button data-i="x" role="menuitem">✕ Close</button>`;
  m.hidden = false;
  const sr = $("stage").getBoundingClientRect();
  const mw = 220;
  m.style.left = `${Math.max(6, Math.min(w.sx + 8, sr.width - mw - 6))}px`;
  m.style.top = `${Math.max(6, Math.min(w.sy + 8, sr.height - (items.length + 2) * 40 - 6))}px`;
  m.onclick = (e) => { const b = e.target.closest("[data-i]"); if (!b) return; hideMenu(); if (b.dataset.i !== "x") items[Number(b.dataset.i)].go(); };
  const first = m.querySelector("button");
  if (first) first.focus({ preventScroll: true });
}
function hideMenu() { $("menu").hidden = true; }
document.addEventListener("keydown", (e) => { if (e.key === "Escape") { hideMenu(); placing = null; ghost = null; } if (e.key === " " && H && e.target === document.body) { e.preventDefault(); setSpeed(speed ? 0 : 1); } });

/* ---- toasts from the family log ---- */
function toast(text) {
  const t = document.createElement("div");
  t.className = "toast";
  t.textContent = text;
  $("toasts").appendChild(t);
  while ($("toasts").children.length > 3) $("toasts").firstChild.remove();
  setTimeout(() => t.remove(), 5000);
}
function checkLog() {
  if (!H.log.length || H.log[0] === lastLog) return;
  const fresh = [];
  for (const l of H.log) { if (l === lastLog) break; fresh.push(l); }
  lastLog = H.log[0];
  fresh.reverse().slice(-3).forEach((l) => { toast(l.text); if (/Promoted|found a job/.test(l.text)) sfx.ok(); });
}

/* ---------------------------------------------------------------- main loop */
let last = performance.now();
let panelT = 0;
let frame = 0;
function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.25, (now - last) / 1000);
  last = now;
  if (!H || document.hidden) return;
  let mins = dt * MPS[speed];
  while (mins > 0) { const step = Math.min(1, mins); update(H, step); mins -= step; }
  frame += 1;
  if (saverOn() && frame % 2) return;
  const k = cv.width / WIDTH;
  ctx.setTransform(k, 0, 0, k, 0, 0);
  drawScene(ctx, H, { t: now, selected, ghost: mode === "buy" && placing ? ghost : null, moving: placing && placing.uid });
  panelT += dt;
  if (panelT > 0.4) { panelT = 0; drawPanels(); drawFamily(); checkLog(); if (mode === "buy") { const m = $("shop").querySelector("h3"); if (m) m.textContent = `Buy furniture · ₵${Math.round(H.money).toLocaleString()}`; } }
}
requestAnimationFrame(loop);

// open the saved family, or the start screen
if (saves.last && saves[saves.last]) startGame(saves[saves.last]);
else showStart();
window.__life = { get H() { return H; }, startGame, setSpeed };
