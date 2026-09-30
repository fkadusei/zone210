import { GAMES } from "./games.js";

const $ = (id) => document.getElementById(id);
const grid = $("grid");
const emptyEl = $("empty");
const searchEl = $("search");
const countEl = $("count");

const AUDIENCE_LABEL = { kids: "Kids", adults: "Adults", all: "Everyone" };
const state = { audience: "all", query: "" };

// Restore the audience tab from the URL hash, e.g. #kids or #adults
const hash = window.location.hash.replace("#", "");
if (["kids", "adults"].includes(hash)) state.audience = hash;

function matches(game) {
  // "kids" shows kids + everyone games; "adults" shows adults + everyone games
  if (state.audience !== "all" && game.audience !== "all" && game.audience !== state.audience) return false;
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

  if (game.online) {
    const on = document.createElement("span");
    on.className = "flag online";
    on.textContent = "🌐 Play online";
    art.appendChild(on);
  }

  a.append(art, body);
  li.appendChild(a);

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

function render() {
  const list = GAMES.filter(matches);
  grid.innerHTML = "";
  list.forEach((g, i) => grid.appendChild(card(g, i)));
  emptyEl.hidden = list.length > 0;
  countEl.textContent = `${list.length} ${list.length === 1 ? "game" : "games"}`;
}

document.querySelectorAll(".tab").forEach((tab) => {
  tab.setAttribute("aria-selected", String(tab.dataset.audience === state.audience));
  tab.addEventListener("click", () => {
    state.audience = tab.dataset.audience;
    document.querySelectorAll(".tab").forEach((t) => t.setAttribute("aria-selected", String(t === tab)));
    history.replaceState(null, "", state.audience === "all" ? window.location.pathname : `#${state.audience}`);
    render();
  });
});

searchEl.addEventListener("input", () => {
  state.query = searchEl.value;
  render();
});

$("surprise").addEventListener("click", () => {
  const pool = GAMES.filter((g) => state.audience === "all" || g.audience === "all" || g.audience === state.audience);
  const pick = pool[Math.floor(Math.random() * pool.length)];
  window.location.href = `games/${pick.id}/`;
});

render();
