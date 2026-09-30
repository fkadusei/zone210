import { runMCQ } from "./mcq.js";

const CAT_COLOR = {
  "Alkali metal": "var(--c-alkali)",
  "Alkaline earth metal": "var(--c-alkaline)",
  "Transition metal": "var(--c-trans)",
  "Post-transition metal": "var(--c-post)",
  Metalloid: "var(--c-metalloid)",
  "Reactive nonmetal": "var(--c-nonmetal)",
  "Noble gas": "var(--c-noble)",
  Lanthanide: "var(--c-lanth)",
  Actinide: "var(--c-actin)",
  "Unknown properties": "var(--c-unknown)",
};
const PHASE_COLOR = { Solid: "#3b6fd9", Liquid: "#12a4a4", Gas: "#e08a0a" };
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const shuffle = (a) => {
  const arr = a.slice();
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};
const celsius = (k) => (k == null ? "unknown" : `${Math.round(k - 273.15).toLocaleString("en")} °C`);
const COMMON = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 22, 24, 25, 26, 27, 28, 29, 30, 35, 36, 47, 50, 53, 54, 74, 78, 79, 80, 82, 86, 88, 92, 94]);
const POOLS = {
  kids: (els) => els.filter((e) => COMMON.has(e.n)),
  all: (els) => els.filter((e) => e.n <= 56 || COMMON.has(e.n)),
  expert: (els) => els,
};

function bohrSvg(e) {
  const k = e.shells.length;
  const R = 26 + 16 * (k - 1) + 12;
  let svg = `<svg class="bohr" viewBox="${-R} ${-R} ${R * 2} ${R * 2}" role="img" aria-label="Electron shells of ${esc(e.name)}: ${e.shells.join(", ")}" style="--col:${CAT_COLOR[e.cat]}">`;
  e.shells.forEach((n, si) => {
    const r = 26 + 16 * si;
    svg += `<circle class="orbit" r="${r}"/>`;
    for (let d = 0; d < n; d += 1) {
      const a = (d / n) * Math.PI * 2 - Math.PI / 2 + si * 0.4;
      svg += `<circle class="e" r="3" cx="${(r * Math.cos(a)).toFixed(1)}" cy="${(r * Math.sin(a)).toFixed(1)}"/>`;
    }
  });
  svg += `<circle class="core" r="15"/><text>${esc(e.s)}</text></svg>`;
  return svg;
}

export function mountTable(root, ctx) {
  const els = ctx.elements;
  const state = { by: "family", filter: null, sel: null, q: "" };
  root.innerHTML = `
    <div class="two">
      <div>
        <div class="row" style="margin-bottom:10px">
          <span class="lbl">Colour by</span>
          <div class="g-chips" id="ptBy"><button class="g-chip" data-v="family" aria-pressed="true">Family</button><button class="g-chip" data-v="state" aria-pressed="false">State at room temperature</button></div>
          <input class="search" id="ptSearch" placeholder="Search a name, symbol or number" aria-label="Search elements" />
        </div>
        <div class="pt-wrap"><div class="pt-grid" id="ptGrid"></div></div>
        <div class="legend" id="ptLegend"></div>
      </div>
      <aside class="g-panel detail" id="ptDetail" aria-live="polite"></aside>
    </div>`;
  const grid = root.querySelector("#ptGrid");
  const detail = root.querySelector("#ptDetail");
  const legend = root.querySelector("#ptLegend");

  const colorOf = (e) => (state.by === "family" ? CAT_COLOR[e.cat] : PHASE_COLOR[e.ph] || "var(--c-unknown)");
  const matches = (e) => {
    if (state.q) {
      const q = state.q.toLowerCase();
      if (!(e.name.toLowerCase().includes(q) || e.s.toLowerCase() === q || String(e.n) === q)) return false;
    }
    if (state.filter) return (state.by === "family" ? e.cat : e.ph) === state.filter;
    return true;
  };

  function buildGrid() {
    grid.style.gridTemplateRows = "repeat(7, auto) 8px repeat(2, auto)";
    let html = "";
    els.forEach((e) => {
      html += `<button class="el" data-n="${e.n}" style="grid-column:${e.x};grid-row:${e.y};--col:${colorOf(e)}" aria-label="${esc(e.name)}, atomic number ${e.n}"><span class="n">${e.n}</span><span class="s">${esc(e.s)}</span><span class="nm">${esc(e.name)}</span></button>`;
    });
    html += `<div class="el" style="grid-column:3;grid-row:6;--col:var(--c-lanth);pointer-events:none;opacity:.55"><span class="s" style="font-size:.62rem">57–71</span></div>`;
    html += `<div class="el" style="grid-column:3;grid-row:7;--col:var(--c-actin);pointer-events:none;opacity:.55"><span class="s" style="font-size:.62rem">89–103</span></div>`;
    html += `<div class="pt-note" style="grid-row:1;grid-column:3/13">Tap any element</div>`;
    grid.innerHTML = html;
    grid.querySelectorAll(".el[data-n]").forEach((b) => b.addEventListener("click", () => select(Number(b.dataset.n), true)));
  }
  function paint() {
    grid.querySelectorAll(".el[data-n]").forEach((b) => {
      const e = els[Number(b.dataset.n) - 1];
      b.style.setProperty("--col", colorOf(e));
      b.classList.toggle("dim", !matches(e));
      b.classList.toggle("sel", state.sel === e.n);
    });
    const groups = state.by === "family" ? Object.keys(CAT_COLOR) : Object.keys(PHASE_COLOR);
    legend.innerHTML = groups.map((g) => `<button data-g="${esc(g)}" aria-pressed="${state.filter === g}" style="--col:${state.by === "family" ? CAT_COLOR[g] : PHASE_COLOR[g]}"><i></i>${esc(g)}</button>`).join("");
    legend.querySelectorAll("button").forEach((b) =>
      b.addEventListener("click", () => {
        state.filter = state.filter === b.dataset.g ? null : b.dataset.g;
        paint();
      })
    );
  }
  function select(n, scroll = false) {
    const e = els[n - 1];
    state.sel = n;
    ctx.sfx.pick();
    const col = CAT_COLOR[e.cat];
    const unit = e.ph === "Gas" ? "g/L" : "g/cm³";
    detail.innerHTML = `
      <div class="big-el" style="--col:${col}"><div class="tile"><span class="n">${e.n}</span><span class="s">${esc(e.s)}</span><span class="m">${e.m.toFixed(3).replace(/0+$/, "").replace(/\.$/, "")}</span></div><div><h2>${esc(e.name)}</h2><p>${esc(e.cat)} · ${esc(e.ph)} at room temperature</p></div></div>
      ${bohrSvg(e)}
      <div class="kv">
        <div><span>Atomic number</span><b>${e.n}</b></div>
        <div><span>Atomic mass</span><b>${e.m.toFixed(3).replace(/0+$/, "").replace(/\.$/, "")}</b></div>
        <div><span>Period · Group</span><b>${e.per} · ${e.grp}</b></div>
        <div><span>Block</span><b>${esc(e.blk)}-block</b></div>
        <div><span>Melts at</span><b>${celsius(e.melt)}</b></div>
        <div><span>Boils at</span><b>${celsius(e.boil)}</b></div>
        <div><span>Density</span><b>${e.dens == null ? "unknown" : `${e.dens} ${unit}`}</b></div>
        <div><span>Electron shells</span><b>${e.shells.join(", ")}</b></div>
        <div class="wide"><span>Electron configuration</span><b>${esc(e.cfg)}</b></div>
        ${e.look ? `<div class="wide"><span>Appearance</span><b>${esc(e.look)}</b></div>` : ""}
        ${e.by ? `<div class="wide"><span>Discovered by</span><b>${esc(e.by)}</b></div>` : ""}
      </div>
      <p class="sumtext">${esc(e.sum)}</p>`;
    paint();
    if (scroll && window.matchMedia("(max-width: 979px)").matches) detail.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  root.querySelector("#ptBy").addEventListener("click", (ev) => {
    const b = ev.target.closest("button");
    if (!b) return;
    state.by = b.dataset.v;
    state.filter = null;
    root.querySelectorAll("#ptBy button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    paint();
  });
  root.querySelector("#ptSearch").addEventListener("input", (ev) => {
    state.q = ev.target.value.trim();
    paint();
    const hit = els.filter(matches);
    if (state.q && hit.length === 1) select(hit[0].n);
  });
  detail.innerHTML = `<p class="empty">Tap an element to see its atom, its properties and what it is used for. Use the colour buttons or the legend to find whole families.</p>`;
  buildGrid();
  paint();
  select(26);
  return () => {};
}

// ---------- challenges ----------
function distractors(e, pool, key, n = 3) {
  const same = shuffle(pool.filter((x) => x.n !== e.n && x.cat === e.cat));
  const rest = shuffle(pool.filter((x) => x.n !== e.n && x.cat !== e.cat));
  const out = [];
  [...same, ...rest].forEach((x) => {
    if (out.length < n && !out.some((y) => y[key] === x[key]) && x[key] !== e[key]) out.push(x);
  });
  return out;
}
const ord = (n) => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};
function makeQuestion(kind, e, pool) {
  if (kind === "sym2name") {
    const d = distractors(e, pool, "name");
    return { tag: "Chemistry", big: e.s, q: "Which element has this symbol?", opts: [e.name, ...d.map((x) => x.name)], a: 0, why: `${e.name} is element ${e.n}.` };
  }
  if (kind === "name2sym") {
    const d = distractors(e, pool, "s");
    return { tag: "Chemistry", big: e.name, q: "What is its symbol?", opts: [e.s, ...d.map((x) => x.s)], a: 0, why: `${e.name} has the symbol ${e.s}.` };
  }
  const d = distractors(e, pool, "name");
  const clues = [
    `It is a ${e.cat.toLowerCase()}, and it is a ${e.ph.toLowerCase()} at room temperature.`,
    `It is in the ${ord(e.per)} period${typeof e.grp === "number" ? ` and group ${e.grp}` : ""} of the periodic table.`,
    `Its electron shells hold ${e.shells.join(", ")} electrons.`,
    e.by ? `It was discovered by ${e.by}.` : `Its electron configuration is ${e.cfg}.`,
    `Its atomic number is ${e.n}.`,
  ];
  return { tag: "Chemistry · guess the element", q: "Which element is it?", clues, opts: [e.name, ...d.map((x) => x.name)], a: 0, why: `${e.name}: atomic number ${e.n}.` };
}

export function mountChallenge(root, ctx) {
  const st = { kind: "sym2name", level: "all" };
  let run = null;
  const KINDS = [["sym2name", "Symbol → name"], ["name2sym", "Name → symbol"], ["clue", "Guess the element"], ["speed", "⏱️ 60-second speed round"]];
  const LEVELS = [["kids", "🧒 Kids"], ["all", "👨‍👩‍👧 Everyone"], ["expert", "🧑‍🎓 Expert"]];
  function menu() {
    root.innerHTML = `<div class="g-panel picker">
      <div class="row"><span class="lbl">Challenge</span><div class="g-chips" id="chK">${KINDS.map(([v, t]) => `<button class="g-chip" data-v="${v}" aria-pressed="${st.kind === v}">${t}</button>`).join("")}</div></div>
      <div class="row"><span class="lbl">Level</span><div class="g-chips" id="chL">${LEVELS.map(([v, t]) => `<button class="g-chip" data-v="${v}" aria-pressed="${st.level === v}">${t}</button>`).join("")}</div></div>
      <p class="sub" style="margin:0;color:var(--muted)">Kids uses the ${POOLS.kids(ctx.elements).length} most familiar elements, Everyone uses the first 56 plus favourites, and Expert uses all 118.</p>
      <div class="row"><button class="g-btn" id="chGo">▶ Start</button></div>
    </div>`;
    root.querySelector("#chK").addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      st.kind = b.dataset.v;
      menu();
    });
    root.querySelector("#chL").addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      st.level = b.dataset.v;
      menu();
    });
    root.querySelector("#chGo").addEventListener("click", start);
  }
  async function start() {
    const pool = POOLS[st.level](ctx.elements);
    const speed = st.kind === "speed";
    const count = speed ? 200 : 10;
    const picks = shuffle(pool);
    const questions = [];
    for (let i = 0; i < count; i += 1) {
      const e = picks[i % picks.length];
      const kind = speed ? (i % 2 ? "name2sym" : "sym2name") : st.kind;
      questions.push(makeQuestion(kind, e, pool));
    }
    run = runMCQ(root, { ctx, questions, speedSeconds: speed ? 60 : 0, title: KINDS.find((k) => k[0] === st.kind)[1], bestKey: `chem-${st.kind}-${st.level}` });
    const res = await run.done;
    if (!res) return;
    ctx.showEnd({
      emoji: res.correct === res.total ? "🏆" : res.correct >= res.total * 0.6 ? "🧪" : "🔬",
      title: speed ? "Time's up!" : res.correct === res.total ? "Perfect round!" : "Round complete",
      text: `${res.correct} of ${res.total} right · ${res.score} points${res.record ? " · New best!" : res.best ? ` · Best ${res.best}` : ""}`,
      missed: res.missed.map((q) => `${q.big || ""} ${q.opts[q.a]}`.trim()),
      again: start,
      close: menu,
    });
  }
  menu();
  return () => run && run.cancel();
}
