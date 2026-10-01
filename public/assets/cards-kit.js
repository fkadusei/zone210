/**
 * Shared pieces for the card games (Whot, Crazy Eights): a seeded shuffle that lives inside the game state (so
 * both players of an online game reshuffle identically) and the card table (opponents, piles, your hand).
 */

/** One mulberry32 step on state.rs (a uint32). Returns a number in [0, 1). */
export function rnd(s) {
  s.rs = (s.rs + 0x6d2b79f5) >>> 0;
  let t = s.rs;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function shuffle(arr, s) {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rnd(s) * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

/**
 * The table. handlers: { onCard(id), onDraw() }.
 * render(view) with view = {
 *   opps:  [{ name, count, active, tag }],                   other players (their cards stay face down)
 *   draw:  { count, enabled, label },                        the draw pile
 *   top:   { id, cls, html, label },                         the card on the discard pile
 *   under: [{ cls, html }],                                  up to two earlier discards, shown peeking out
 *   badges:[{ text, cls }],                                  e.g. the suit that was called, or a penalty
 *   hand:  [{ id, cls, html, label, ok }], handActive        your cards; ok = can be played now
 * }
 */
export function createTable(root, { onCard, onDraw }) {
  root.classList.add("ct");
  root.innerHTML = `<div class="ct-opps"></div>
    <div class="ct-center">
      <button type="button" class="ct-draw"><span class="stack"><i></i><i></i><i></i></span><span class="lab"></span></button>
      <div class="ct-disc" aria-live="polite"><div class="under"></div><div class="top"></div></div>
      <div class="ct-badges"></div>
    </div>
    <div class="ct-hand" role="group" aria-label="Your cards"></div>`;
  const q = (sel) => root.querySelector(sel);
  const draw = q(".ct-draw");
  draw.addEventListener("click", () => onDraw());
  q(".ct-hand").addEventListener("click", (e) => {
    const b = e.target.closest("[data-id]");
    if (b && !b.disabled) onCard(Number(b.dataset.id));
  });
  let lastTop = null;

  return {
    render(v) {
      q(".ct-opps").innerHTML = v.opps
        .map((o) => {
          const backs = Array.from({ length: Math.min(o.count, 10) }, (_, i) => `<i style="--k:${i}"></i>`).join("");
          return `<div class="ct-opp${o.active ? " on" : ""}"><div class="nm">${esc(o.name)}</div><div class="backs">${backs}</div><div class="meta"><b>${o.count}</b> card${o.count === 1 ? "" : "s"}${o.tag ? ` · <em>${esc(o.tag)}</em>` : ""}</div></div>`;
        })
        .join("");
      draw.disabled = !v.draw.enabled;
      draw.classList.toggle("hint", !!v.draw.enabled);
      draw.classList.toggle("empty", v.draw.count === 0);
      draw.querySelector(".lab").innerHTML = `${esc(v.draw.label)}<small>${v.draw.count} left</small>`;
      draw.setAttribute("aria-label", `${v.draw.label}. ${v.draw.count} cards left in the pile.`);
      q(".ct-disc .under").innerHTML = (v.under || []).map((c, i) => `<span class="pcard ${c.cls} u${i}" aria-hidden="true">${c.html}</span>`).join("");
      const fresh = v.top && v.top.id !== lastTop;
      lastTop = v.top ? v.top.id : null;
      q(".ct-disc .top").innerHTML = v.top ? `<span class="pcard ${v.top.cls}${fresh ? " land" : ""}" role="img" aria-label="Top card: ${esc(v.top.label)}">${v.top.html}</span>` : "";
      q(".ct-badges").innerHTML = (v.badges || []).map((b) => `<span class="ct-badge ${b.cls || ""}">${esc(b.text)}</span>`).join("");
      q(".ct-hand").innerHTML = v.hand
        .map((c) => `<button type="button" class="pcard ${c.cls}${c.ok ? " ok" : v.handActive ? " dim" : ""}" data-id="${c.id}"${c.ok ? "" : " disabled"} aria-label="${esc(c.label)}">${c.html}</button>`)
        .join("");
    },
  };
}
