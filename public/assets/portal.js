import { GAMES } from "./games.js";
import { createBook } from "./book.js";

const $ = (id) => document.getElementById(id);
const grid = $("grid");
const emptyEl = $("empty");
const searchEl = $("search");
const countEl = $("count");

const AUDIENCE_LABEL = { kids: "Kids", adults: "Adults", all: "Everyone" };
const state = { audience: "all", query: "", filter: "all", view: "grid" };
// favorites live on this device only
const FAV_KEY = "zone210_favorites";
let favs = new Set();
try { favs = new Set(JSON.parse(localStorage.getItem(FAV_KEY)) || []); } catch (err) { /* storage unavailable */ }
const saveFavs = () => { try { localStorage.setItem(FAV_KEY, JSON.stringify([...favs])); } catch (err) { /* private mode */ } };
const STAR = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M12 2.8l2.8 6 6.5.7-4.9 4.4 1.4 6.4L12 17l-5.8 3.3 1.4-6.4L2.7 9.5l6.5-.7z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>';
const toggleFav = (id) => { if (favs.has(id)) favs.delete(id); else favs.add(id); saveFavs(); };
const NEW_DAYS = 10;
const isNew = (g) => !!g.added && (Date.now() - new Date(g.added + "T00:00:00").getTime()) / 864e5 <= NEW_DAYS;
const CATS = { strategy: "♟️ Strategy", family: "🎲 Family", puzzles: "🧩 Puzzles", learn: "🔬 Learn", fun: "🎨 Arcade & art" };
const FILTERS = [["all", "All"], ["fav", "⭐ Favorites"], ["online", "🌐 Play online"], ["new", "✨ New"], ...Object.entries(CATS)];

// Restore the audience tab from the URL hash, e.g. #kids or #adults
const hash = window.location.hash.replace("#", "");
if (["kids", "adults"].includes(hash)) state.audience = hash;
// the Book view: #book or #book=<game id | contents | end>; otherwise the last choice on this device
const VIEW_KEY = "zone210_view";
const bookKey = (h) => (h === "book" ? "cover" : h.startsWith("book=") ? decodeURIComponent(h.slice(5)) : null);
try { if (localStorage.getItem(VIEW_KEY) === "book") state.view = "book"; } catch (err) { /* storage unavailable */ }
if (bookKey(hash) !== null) state.view = "book";
else if (["kids", "adults"].includes(hash)) state.view = "grid";
// if the Book stopped the page last time (a very weak device), fall back to the grid once
const BOOT_KEY = "zone210_bookboot";
try {
  if (localStorage.getItem(BOOT_KEY)) {
    localStorage.removeItem(BOOT_KEY);
    localStorage.setItem(VIEW_KEY, "grid");
    state.view = "grid";
    history.replaceState(null, "", window.location.pathname);
  }
} catch (err) { /* storage unavailable */ }
// leaving the page normally (a tap on Play, closing the tab) is not a crash
window.addEventListener("pagehide", () => { try { localStorage.removeItem(BOOT_KEY); } catch (err) { /* ignore */ } });
const bookHost = $("bookhost");

function matches(game) {
  // "kids" shows kids + everyone games; "adults" shows adults + everyone games
  if (state.audience !== "all" && game.audience !== "all" && game.audience !== state.audience) return false;
  if (state.filter === "online" && !game.online) return false;
  if (state.filter === "fav" && !favs.has(game.id)) return false;
  if (state.filter === "new" && !isNew(game)) return false;
  if (CATS[state.filter] && game.cat !== state.filter) return false;
  const q = state.query.trim().toLowerCase();
  if (q && !`${game.title} ${game.tagline} ${game.tags.join(" ")} ${game.online ? "online" : ""}`.toLowerCase().includes(q)) return false;
  return true;
}

const ARROW =
  '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';

function card(game, index) {
  const li = document.createElement("li");
  li.style.setProperty("--i", index);
  const wide = false; // every game gets the same size card; "featured" only adds the badge

  const a = document.createElement("a");
  a.className = `card${wide ? " featured" : ""}`;
  a.href = `games/${game.id}/`;
  a.dataset.aud = game.audience;
  a.style.setProperty("--a", game.colors[0]);
  a.style.setProperty("--b", game.colors[1]);

  const art = document.createElement("div");
  art.className = "art";
  const tile = document.createElement("span");
  tile.className = "icon-tile";
  tile.textContent = game.emoji;
  tile.setAttribute("aria-hidden", "true");
  art.appendChild(tile);
  const img = document.createElement("img");
  img.alt = "";
  img.loading = "lazy";
  img.src = `assets/thumbs/${game.id}.jpg`;
  img.addEventListener("load", () => tile.remove());
  img.addEventListener("error", () => img.remove());
  art.appendChild(img);
  if (game.featured) {
    const flag = document.createElement("span");
    flag.className = "flag";
    flag.textContent = "Featured";
    art.appendChild(flag);
  }

  const body = document.createElement("div");
  body.className = "body";
  const row = document.createElement("div");
  row.className = "title-row";
  const h = document.createElement("h2");
  h.textContent = game.title;
  const go = document.createElement("span");
  go.className = "go";
  go.innerHTML = ARROW;
  row.append(h, go);
  const p = document.createElement("p");
  p.textContent = game.tagline;
  const meta = document.createElement("div");
  meta.className = "meta";
  const aud = document.createElement("span");
  aud.className = "aud";
  aud.textContent = AUDIENCE_LABEL[game.audience];
  const players = document.createElement("span");
  players.textContent = game.players;
  meta.append(aud, players);
  body.append(row, p, meta);

  if (isNew(game)) {
    const nw = document.createElement("span");
    nw.className = "flag fresh";
    nw.textContent = "✨ New";
    art.appendChild(nw);
  }
  if (game.online) {
    const on = document.createElement("span");
    on.className = "flag online";
    on.textContent = "🌐 Play online";
    art.appendChild(on);
  }

  a.append(art, body);
  li.appendChild(a);
  const star = document.createElement("button");
  star.type = "button";
  star.className = "fav-btn";
  star.innerHTML = STAR;
  const on = favs.has(game.id);
  star.setAttribute("aria-pressed", String(on));
  star.setAttribute("aria-label", `${on ? "Remove" : "Add"} ${game.title} ${on ? "from" : "to"} favorites`);
  star.title = on ? "Remove from favorites" : "Add to favorites";
  star.addEventListener("click", () => {
    toggleFav(game.id);
    const y = window.scrollY;
    render();
    window.scrollTo(0, y);
    const again = grid.querySelector(`.fav-btn[data-id="${game.id}"]`);
    if (again) again.focus({ preventScroll: true });
  });
  star.dataset.id = game.id;
  li.appendChild(star);

  // gentle 3D tilt that follows the pointer (mouse only)
  if (window.matchMedia("(hover: hover) and (pointer: fine)").matches && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    a.addEventListener("pointermove", (e) => {
      if (window.z210Saver && window.z210Saver.on) return; // no tilt effects in battery saver
      const r = a.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = (e.clientY - r.top) / r.height;
      a.classList.add("tilting");
      a.style.setProperty("--ry", `${((x - 0.5) * 12).toFixed(2)}deg`);
      a.style.setProperty("--rx", `${((0.5 - y) * 9).toFixed(2)}deg`);
      a.style.setProperty("--mx", `${(x * 100).toFixed(1)}%`);
      a.style.setProperty("--my", `${(y * 100).toFixed(1)}%`);
    });
    a.addEventListener("pointerleave", () => {
      a.classList.remove("tilting");
      a.style.removeProperty("--rx");
      a.style.removeProperty("--ry");
    });
  }
  return li;
}

function summary(list) {
  const who = state.audience === "all" ? "Everyone" : AUDIENCE_LABEL[state.audience];
  const what = FILTERS.find(([k]) => k === state.filter);
  return `Showing: ${who}${state.filter !== "all" && what ? ` · ${what[1]}` : ""}${state.query.trim() ? ` · “${state.query.trim()}”` : ""} · ${list.length} ${list.length === 1 ? "game" : "games"}`;
}

function render() {
  if (state.filter === "fav" && !favs.size) state.filter = "all"; // last favorite removed while filtering by favorites
  const list = GAMES.filter(matches);
  grid.hidden = state.view === "book";
  if (state.view === "book") {
    emptyEl.hidden = list.length > 0;
    drawFilters();
    countEl.textContent = `${list.length} ${list.length === 1 ? "game" : "games"} in the book`;
    bookHost.hidden = !list.length;
    book.setGames(list, { favs, summary: summary(list), startKey: pendingKey });
    pendingKey = null;
    if (list.length) {
      try { localStorage.setItem(BOOT_KEY, "1"); setTimeout(() => localStorage.removeItem(BOOT_KEY), 3500); } catch (err) { /* storage unavailable */ }
      book.show();
    } else book.hide();
    return;
  }
  grid.innerHTML = "";
  const top = list.filter((g) => favs.has(g.id));
  const rest = list.filter((g) => !favs.has(g.id));
  const heading = (text) => { const h = document.createElement("li"); h.className = "group"; h.textContent = text; grid.appendChild(h); };
  let i = 0;
  if (top.length && state.filter !== "fav") heading("⭐ Your favorites");
  top.forEach((g) => grid.appendChild(card(g, i++)));
  if (top.length && rest.length && state.filter !== "fav") heading("All games");
  rest.forEach((g) => grid.appendChild(card(g, i++)));
  emptyEl.hidden = list.length > 0;
  drawFilters();
  countEl.textContent = `${list.length} ${list.length === 1 ? "game" : "games"}`;
}

document.querySelectorAll(".tab").forEach((tab) => {
  tab.setAttribute("aria-selected", String(tab.dataset.audience === state.audience));
  tab.addEventListener("click", () => {
    state.audience = tab.dataset.audience;
    document.querySelectorAll(".tab").forEach((t) => t.setAttribute("aria-selected", String(t === tab)));
    if (state.view === "grid") history.replaceState(null, "", state.audience === "all" ? window.location.pathname : `#${state.audience}`);
    render();
  });
});

searchEl.addEventListener("input", () => {
  state.query = searchEl.value;
  render();
});

$("surprise").addEventListener("click", () => {
  if (state.view === "book") { book.surprise(); return; } // in the Book, flip to a random page
  const pool = GAMES.filter(matches);
  if (!pool.length) return;
  const pick = pool[Math.floor(Math.random() * pool.length)];
  window.location.href = `games/${pick.id}/`;
});

const filtersEl = $("filters");
function matchesWith(g, k) {
  const old = state.filter;
  state.filter = k;
  const r = matches(g);
  state.filter = old;
  return r;
}
function drawFilters() {
  const n = (k) => GAMES.filter((g) => matchesWith(g, k)).length;
  if (state.filter === "fav" && !favs.size) state.filter = "all";
  filtersEl.innerHTML = FILTERS.filter(([k]) => (k !== "new" || n("new") > 0) && (k !== "fav" || favs.size > 0))
    .map(([k, label]) => `<button class="fchip" type="button" data-f="${k}" aria-pressed="${k === state.filter}">${label}<span>${n(k)}</span></button>`)
    .join("");
}
filtersEl.addEventListener("click", (e) => {
  const b = e.target.closest("[data-f]");
  if (!b) return;
  state.filter = b.dataset.f;
  render();
});

// ---------- the Book view ----------
let pendingKey = state.view === "book" ? bookKey(hash) : null;
const book = createBook(bookHost, {
  cats: CATS,
  isNew,
  onFav: (id) => {
    toggleFav(id);
    if (state.filter === "fav") render(); else { book.refreshFavs(favs); drawFilters(); }
  },
  onSurprise: () => book.surprise(),
  onGrid: () => setView("grid"),
  onNavigate: (key) => { if (state.view === "book") history.replaceState(null, "", key === "cover" ? "#book" : `#book=${encodeURIComponent(key)}`); },
});
function setView(view, key) {
  state.view = view;
  try { localStorage.setItem(VIEW_KEY, view); } catch (err) { /* private mode */ }
  document.body.classList.toggle("view-book", view === "book");
  document.querySelectorAll(".vbtn").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.view === view)));
  if (view === "book") {
    pendingKey = key || null;
    history.replaceState(null, "", "#book");
    render();
    const top = bookHost.getBoundingClientRect().top + window.scrollY - 70;
    if (window.scrollY > top || top - window.scrollY > 40) window.scrollTo(0, Math.max(0, top - 120));
  } else {
    book.hide();
    history.replaceState(null, "", state.audience === "all" ? window.location.pathname : `#${state.audience}`);
    render();
  }
}
document.querySelectorAll(".vbtn").forEach((b) => b.addEventListener("click", () => { if (b.dataset.view !== state.view) setView(b.dataset.view); }));
document.body.classList.toggle("view-book", state.view === "book");
document.querySelectorAll(".vbtn").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.view === state.view)));
window.addEventListener("hashchange", () => {
  const k = bookKey(window.location.hash.replace("#", ""));
  if (k === null) return;
  if (state.view !== "book") { setView("book", k); return; }
  if (k !== book.key) {
    // a link to a page hidden by the current filters: show everything first
    if (!GAMES.filter(matches).some((g) => g.id === k) && GAMES.some((g) => g.id === k)) { state.filter = "all"; state.audience = "all"; state.query = ""; searchEl.value = ""; pendingKey = k; render(); } else book.goToKey(k);
  }
});

render();

// unfinished online games in this tab (saved by assets/online.js): offer to jump back in
function drawResume() {
  const box = $("resume");
  const found = [];
  try {
    for (let i = 0; i < sessionStorage.length; i += 1) {
      const key = sessionStorage.key(i);
      if (!key.startsWith("z210_online_")) continue;
      const rec = JSON.parse(sessionStorage.getItem(key));
      const id = rec && rec.path && (rec.path.match(/\/games\/([^/]+)\//) || [])[1];
      const game = GAMES.find((g) => g.id === id);
      if (game) found.push({ key, rec, game });
    }
  } catch (err) { /* storage unavailable */ }
  box.hidden = !found.length;
  box.innerHTML = "";
  found.forEach(({ key, rec, game }) => {
    const row = document.createElement("div");
    row.className = "resume-row";
    const text = document.createElement("span");
    text.innerHTML = `<b>🌐 ${game.title}</b> · online game in progress · room ${rec.code}`;
    const go = document.createElement("a");
    go.className = "resume-go";
    go.href = `games/${game.id}/`;
    go.textContent = "Resume game";
    const drop = document.createElement("button");
    drop.type = "button";
    drop.className = "resume-drop";
    drop.textContent = "Forget";
    drop.title = "Stop waiting for this game";
    drop.addEventListener("click", () => { try { sessionStorage.removeItem(key); } catch (err) { /* ignore */ } drawResume(); });
    row.append(text, go, drop);
    box.appendChild(row);
  });
}
drawResume();
window.addEventListener("pageshow", drawResume);

// a greeting for the time of day on this device (its own clock and time zone; nothing is looked up or sent),
// with a little extra on Fridays and weekends and on world days that everyone can share
const WORLD_DAYS = {
  "1-1": ["🎆", "Happy New Year!"],
  "3-14": ["🥧", "Happy Pi Day!"], // 3.14
  "4-22": ["🌍", "Happy Earth Day!"],
  "4-23": ["📚", "Happy World Book Day!"],
  "6-1": ["🎈", "Happy Children's Day!"],
  "6-11": ["🪁", "Happy International Day of Play!"],
  "10-5": ["🍎", "Happy World Teachers' Day!"],
  "11-13": ["💛", "Happy World Kindness Day!"],
  "11-20": ["🧒", "Happy World Children's Day!"],
  "12-24": ["✨", "Season's greetings!"],
  "12-25": ["✨", "Season's greetings!"],
  "12-26": ["✨", "Season's greetings!"],
  "12-31": ["🎇", "Happy New Year's Eve!"],
};
const DAY_EXTRA = { 5: "Happy Friday!", 6: "Happy Saturday!", 0: "Happy Sunday!" };
function greet() {
  const el = document.getElementById("greet");
  if (!el) return;
  const now = new Date();
  const h = now.getHours();
  const [emoji, text] = h >= 5 && h < 12 ? ["🌅", "Good morning!"] : h >= 12 && h < 17 ? ["☀️", "Good afternoon!"] : h >= 17 && h < 22 ? ["🌆", "Good evening!"] : ["🌙", "Hello, night owl!"];
  const special = WORLD_DAYS[`${now.getMonth() + 1}-${now.getDate()}`];
  // a world day leads; otherwise the time of day, plus the day's name on Friday to Sunday
  el.innerHTML = special
    ? `<span aria-hidden="true">${special[0]}</span> ${special[1]} <small>${text}</small>`
    : `<span aria-hidden="true">${emoji}</span> ${text}${DAY_EXTRA[now.getDay()] ? ` <small>${DAY_EXTRA[now.getDay()]}</small>` : ""}`;
  el.hidden = false;
}
greet();
setInterval(greet, 60000); // still right if the page is left open past a change
