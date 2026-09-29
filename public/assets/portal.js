import { GAMES } from "./games.js";

const $ = (id) => document.getElementById(id);
const grid = $("grid");
const emptyEl = $("empty");
const searchEl = $("search");

const AUDIENCE_LABEL = { kids: "Kids", adults: "Adults", all: "Everyone" };
const state = { audience: "all", query: "" };

// Restore the audience tab from the URL hash, e.g. #kids or #adults
const hash = window.location.hash.replace("#", "");
if (["kids", "adults"].includes(hash)) state.audience = hash;

function matches(game) {
  // "kids" shows kids + everyone games; "adults" shows adults + everyone games
  if (state.audience !== "all" && game.audience !== "all" && game.audience !== state.audience) return false;
  const q = state.query.trim().toLowerCase();
  if (q && !`${game.title} ${game.tagline} ${game.tags.join(" ")}`.toLowerCase().includes(q)) return false;
  return true;
}

function card(game) {
  const li = document.createElement("li");
  const wide = game.featured && state.audience === "all" && !state.query;
  if (wide) li.className = "featured"; // the grid item is the <li>, so it is the one that spans two columns
  const a = document.createElement("a");
  a.className = `card${wide ? " featured" : ""}`;
  a.href = `games/${game.id}/`;
  a.dataset.aud = game.audience;
  a.style.setProperty("--a", game.colors[0]);
  a.style.setProperty("--b", game.colors[1]);

  const thumb = document.createElement("div");
  thumb.className = "thumb";
  const emoji = document.createElement("span");
  emoji.className = "emoji";
  emoji.textContent = game.emoji;
  emoji.setAttribute("aria-hidden", "true");
  thumb.appendChild(emoji);
  const img = document.createElement("img");
  img.alt = "";
  img.loading = "lazy";
  img.src = `assets/thumbs/${game.id}.jpg`;
  img.addEventListener("load", () => emoji.remove());
  img.addEventListener("error", () => img.remove());
  thumb.appendChild(img);

  const body = document.createElement("div");
  body.className = "body";
  const h = document.createElement("h2");
  h.textContent = game.title;
  const p = document.createElement("p");
  p.textContent = game.tagline;
  const meta = document.createElement("div");
  meta.className = "meta";
  const aud = document.createElement("span");
  aud.className = "aud";
  aud.textContent = AUDIENCE_LABEL[game.audience];
  meta.append(aud, document.createTextNode(` · ${game.players}`));
  body.append(h, p, meta);

  a.append(thumb, body);
  li.appendChild(a);
  return li;
}

function render() {
  const list = GAMES.filter(matches);
  grid.innerHTML = "";
  list.forEach((g) => grid.appendChild(card(g)));
  emptyEl.hidden = list.length > 0;
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
