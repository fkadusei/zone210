import { GAMES } from "./games.js";

const $ = (id) => document.getElementById(id);
const grid = $("grid");
const tagsEl = $("tags");
const countEl = $("count");
const emptyEl = $("empty");
const searchEl = $("search");

const AUDIENCE_LABEL = { kids: "Kids", adults: "Adults", all: "Everyone" };
const state = { audience: "all", tag: null, query: "" };

// Restore filters from the URL hash, e.g. #kids or #adults
const hash = window.location.hash.replace("#", "");
if (["kids", "adults"].includes(hash)) state.audience = hash;

function matches(game) {
  // "kids" shows kids + everyone games; "adults" shows adults + everyone games
  if (state.audience !== "all" && game.audience !== "all" && game.audience !== state.audience) return false;
  if (state.tag && !game.tags.includes(state.tag)) return false;
  const q = state.query.trim().toLowerCase();
  if (q && !`${game.title} ${game.tagline} ${game.tags.join(" ")}`.toLowerCase().includes(q)) return false;
  return true;
}

function card(game) {
  const li = document.createElement("li");
  const a = document.createElement("a");
  a.className = `card${game.featured ? " featured" : ""}`;
  a.href = `games/${game.id}/`;
  a.style.setProperty("--a", game.colors[0]);
  a.style.setProperty("--b", game.colors[1]);

  const thumb = document.createElement("div");
  thumb.className = "thumb";
  const scatter = document.createElement("div");
  scatter.className = "scatter";
  scatter.setAttribute("aria-hidden", "true");
  (game.art || []).forEach((t) => {
    const s = document.createElement("span");
    s.textContent = t;
    scatter.appendChild(s);
  });
  thumb.appendChild(scatter);
  const emoji = document.createElement("span");
  emoji.className = "emoji";
  emoji.textContent = game.emoji;
  emoji.setAttribute("aria-hidden", "true");
  thumb.appendChild(emoji);
  const img = document.createElement("img");
  img.alt = "";
  img.loading = "lazy";
  img.src = `assets/thumbs/${game.id}.jpg`;
  img.addEventListener("load", () => {
    emoji.remove();
    scatter.remove();
  });
  img.addEventListener("error", () => img.remove());
  thumb.appendChild(img);

  const aud = document.createElement("span");
  aud.className = `badge-audience ${game.audience}`;
  aud.textContent = AUDIENCE_LABEL[game.audience];
  thumb.appendChild(aud);
  if (game.featured) {
    const f = document.createElement("span");
    f.className = "badge-featured";
    f.textContent = "★ Featured";
    thumb.appendChild(f);
  }

  const body = document.createElement("div");
  body.className = "body";
  const h = document.createElement("h2");
  h.textContent = game.title;
  const p = document.createElement("p");
  p.textContent = game.tagline;
  const meta = document.createElement("div");
  meta.className = "meta";
  game.tags.forEach((t) => {
    const s = document.createElement("span");
    s.className = "tag";
    s.textContent = t;
    meta.appendChild(s);
  });
  const pl = document.createElement("span");
  pl.className = "players";
  pl.textContent = game.players;
  meta.appendChild(pl);
  const play = document.createElement("span");
  play.className = "play";
  play.textContent = "Play →";
  body.append(h, p, meta, play);

  a.append(thumb, body);
  li.appendChild(a);
  return li;
}

function render() {
  const list = GAMES.filter(matches);
  grid.innerHTML = "";
  list.forEach((g) => grid.appendChild(card(g)));
  emptyEl.hidden = list.length > 0;
  countEl.textContent = `${list.length} ${list.length === 1 ? "game" : "games"}`;
}

function renderTags() {
  const all = [...new Set(GAMES.flatMap((g) => g.tags))].sort();
  tagsEl.innerHTML = "";
  all.forEach((tag) => {
    const b = document.createElement("button");
    b.className = "g-chip";
    b.textContent = tag;
    b.setAttribute("aria-pressed", String(state.tag === tag));
    b.addEventListener("click", () => {
      state.tag = state.tag === tag ? null : tag;
      renderTags();
      render();
    });
    tagsEl.appendChild(b);
  });
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

renderTags();
render();
