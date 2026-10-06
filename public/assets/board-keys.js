/**
 * Keyboard and screen-reader play for SVG boards whose points are clicked.
 *   boardKeys(svg, { selector: ".hit", describe: (i) => "Red stone" | "" })
 * Each clickable point needs data-i (its index). Tab moves onto the board once, the arrow keys move between
 * points (to the nearest one in that direction, so it works for square, hex and star boards alike), and
 * Enter or Space clicks it. Every point gets a label: "Row 2, column 3: Red stone" (or ": empty").
 * The board is redrawn often, so the labels and the focused point are restored after every redraw.
 */
export function boardKeys(svg, { selector, describe = () => "" }) {
  let at = null; // centre of the focused point, kept across redraws
  let inside = false;
  let queued = false;
  const items = () => [...svg.querySelectorAll(selector)].filter((e) => e.getAttribute("display") !== "none");
  const centre = (e) => { const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };
  const near = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  function label(list) {
    // rows and columns from the drawing itself: points within a few pixels of each other share a row / column
    const pts = list.map(centre);
    const band = (vals) => { const u = [...vals].sort((a, b) => a - b); const out = []; u.forEach((v) => { if (!out.length || v - out[out.length - 1] > 4) out.push(v); }); return out; };
    const rows = band(pts.map((p) => p.y)), cols = band(pts.map((p) => p.x));
    const idx = (arr, v) => arr.findIndex((a) => Math.abs(a - v) <= 4) + 1;
    list.forEach((e, k) => {
      const what = describe(Number(e.dataset.i)) || "empty";
      e.setAttribute("aria-label", `Row ${idx(rows, pts[k].y)}, column ${idx(cols, pts[k].x)}: ${what}`);
    });
  }
  function setup() {
    queued = false;
    const list = items();
    if (!list.length) return;
    list.forEach((e) => { e.setAttribute("role", "button"); e.setAttribute("tabindex", "-1"); });
    label(list);
    // first time: start in the middle of the board
    const goal = at || centre(svg);
    let pick = list[0];
    let best = Infinity; list.forEach((e) => { const d = near(centre(e), goal); if (d < best) { best = d; pick = e; } });
    pick.setAttribute("tabindex", "0");
    if (inside && document.activeElement !== pick) pick.focus({ preventScroll: true });
  }
  const later = () => { if (!queued) { queued = true; requestAnimationFrame(setup); } };

  svg.setAttribute("aria-roledescription", "game board");
  if (!svg.getAttribute("aria-label")) svg.setAttribute("aria-label", "Game board");
  svg.setAttribute("aria-description", "Use the arrow keys to move between points and Enter to choose.");
  svg.addEventListener("focusin", (e) => { if (e.target.matches(selector)) { inside = true; at = centre(e.target); } });
  // a redraw removes the focused point: that is not leaving the board, so focus comes back after the redraw
  svg.addEventListener("focusout", (e) => {
    if (e.relatedTarget && svg.contains(e.relatedTarget)) return;
    const gone = e.target;
    setTimeout(() => { if (gone.isConnected && !svg.contains(document.activeElement)) inside = false; }, 0);
  });
  svg.addEventListener("keydown", (e) => {
    const cur = e.target.closest && e.target.closest(selector);
    if (!cur) return;
    inside = true;
    at = centre(cur);
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      cur.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      return;
    }
    const dir = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowDown: [0, 1], ArrowUp: [0, -1] }[e.key];
    if (!dir) return;
    e.preventDefault();
    const c = centre(cur);
    let best = null, score = Infinity;
    for (const o of items()) {
      if (o === cur) continue;
      const p = centre(o);
      const along = (p.x - c.x) * dir[0] + (p.y - c.y) * dir[1];
      const across = Math.abs((p.x - c.x) * dir[1]) + Math.abs((p.y - c.y) * dir[0]);
      if (along < 3) continue;
      const sc = along + across * 2.5;
      if (sc < score) { score = sc; best = o; }
    }
    if (best) { cur.setAttribute("tabindex", "-1"); best.setAttribute("tabindex", "0"); best.focus({ preventScroll: true }); at = centre(best); }
  });
  new MutationObserver(later).observe(svg, { childList: true, subtree: true });
  setup();
}
