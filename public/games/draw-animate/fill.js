// Draw & Animate: filling a space that several lines enclose between them (a box drawn as four lines, the gap
// between a box and a circle inside it). The lines are painted onto a grid as "ink"; the space is found by spreading
// out from the tap until ink stops it, as paint would; then the edge of that space is traced into an outline, which
// becomes an ordinary filled shape. Nothing here touches the page: game.js paints the ink and adds the shape.

/**
 * The space around (x, y) that ink encloses. `ink` is w*h cells, 1 where a line is.
 * Returns null if the tap is on a line, else { cells (1 = in the space), count, open: did it reach the page edge }.
 */
export function flood(ink, w, h, x, y) {
  x = Math.round(x); y = Math.round(y);
  if (x < 0 || y < 0 || x >= w || y >= h || ink[y * w + x]) return null;
  const cells = new Uint8Array(w * h), todo = new Int32Array(w * h);
  let head = 0, tail = 0, count = 0, open = false;
  cells[y * w + x] = 1; todo[tail++] = y * w + x;
  while (head < tail) {
    const at = todo[head++], cx = at % w, cy = (at - cx) / w; count += 1;
    if (cx === 0 || cy === 0 || cx === w - 1 || cy === h - 1) open = true;
    if (cx > 0 && !cells[at - 1] && !ink[at - 1]) { cells[at - 1] = 1; todo[tail++] = at - 1; }
    if (cx < w - 1 && !cells[at + 1] && !ink[at + 1]) { cells[at + 1] = 1; todo[tail++] = at + 1; }
    if (cy > 0 && !cells[at - w] && !ink[at - w]) { cells[at - w] = 1; todo[tail++] = at - w; }
    if (cy < h - 1 && !cells[at + w] && !ink[at + w]) { cells[at + w] = 1; todo[tail++] = at + w; }
  }
  return { cells, count, open };
}

/** The space made n cells bigger all round (so the colour tucks in under the lines that enclose it). */
export function grow(cells, w, h, n) {
  let cur = cells;
  for (let pass = 0; pass < n; pass += 1) {
    const next = cur.slice();
    for (let y = 0; y < h; y += 1) for (let x = 0; x < w; x += 1) {
      const at = y * w + x;
      if (cur[at]) continue;
      if ((x > 0 && cur[at - 1]) || (x < w - 1 && cur[at + 1]) || (y > 0 && cur[at - w]) || (y < h - 1 && cur[at + w])) next[at] = 1;
    }
    cur = next;
  }
  return cur;
}

const area = (p) => { let a = 0; for (let i = 0, j = p.length - 1; i < p.length; j = i, i += 1) a += (p[j][0] + p[i][0]) * (p[j][1] - p[i][1]); return a / 2; };

/** Fewer points for the same shape: corners are kept, and a point is dropped if the line hardly moves without it. */
function simpler(loop, slack) {
  const keep = new Uint8Array(loop.length);
  const run = (a, b) => { // the points between a and b: keep the one furthest from the straight line, if it is far enough
    let far = 0, at = -1; const [ax, ay] = loop[a], [bx, by] = loop[b], len = Math.hypot(bx - ax, by - ay) || 1;
    for (let i = a + 1; i < b; i += 1) { const d = Math.abs((loop[i][0] - ax) * (by - ay) - (loop[i][1] - ay) * (bx - ax)) / len; if (d > far) { far = d; at = i; } }
    if (far > slack) { keep[at] = 1; run(a, at); run(at, b); }
  };
  // start from the two points furthest apart, so a closed loop has two fixed ends to work between
  let far = 0, other = 0; for (let i = 1; i < loop.length; i += 1) { const d = Math.hypot(loop[i][0] - loop[0][0], loop[i][1] - loop[0][1]); if (d > far) { far = d; other = i; } }
  keep[0] = 1; keep[other] = 1; run(0, other);
  const tail = loop.slice(other).concat([loop[0]]), base = other; // the second half, back round to the start
  const keep2 = new Uint8Array(tail.length), run2 = (a, b) => { let f = 0, at = -1; const [ax, ay] = tail[a], [bx, by] = tail[b], len = Math.hypot(bx - ax, by - ay) || 1; for (let i = a + 1; i < b; i += 1) { const d = Math.abs((tail[i][0] - ax) * (by - ay) - (tail[i][1] - ay) * (bx - ax)) / len; if (d > f) { f = d; at = i; } } if (f > slack) { keep2[at] = 1; run2(a, at); run2(at, b); } };
  run2(0, tail.length - 1);
  for (let i = 1; i < tail.length - 1; i += 1) if (keep2[i]) keep[base + i] = 1;
  return loop.filter((_, i) => keep[i]);
}

/**
 * The edge of a space, as one outline: flat [x, y, x, y, …]. A space with a hole in it (the gap between a box and a
 * circle inside it) is joined to its hole by a cut too thin to see, so that it is still a single outline.
 */
export function outline(cells, w, h, slack = 0.9) {
  // every side of a cell that faces out of the space, as a step from one grid corner to the next, the space on its right
  const from = new Map(), key = (x, y) => y * (w + 1) + x;
  const add = (x0, y0, x1, y1) => { const k = key(x0, y0); if (!from.has(k)) from.set(k, []); from.get(k).push([x1, y1]); };
  const inAt = (x, y) => x >= 0 && y >= 0 && x < w && y < h && cells[y * w + x];
  for (let y = 0; y < h; y += 1) for (let x = 0; x < w; x += 1) {
    if (!cells[y * w + x]) continue;
    if (!inAt(x, y - 1)) add(x, y, x + 1, y);
    if (!inAt(x + 1, y)) add(x + 1, y, x + 1, y + 1);
    if (!inAt(x, y + 1)) add(x + 1, y + 1, x, y + 1);
    if (!inAt(x - 1, y)) add(x, y + 1, x, y);
  }
  const loops = [];
  for (const [start, outs] of from) {
    while (outs.length) {
      const loop = []; let k = start;
      for (;;) { const next = from.get(k); if (!next || !next.length) break; const [nx, ny] = next.pop(); loop.push([nx, ny]); k = key(nx, ny); if (k === start) break; }
      if (loop.length >= 4) loops.push(loop);
    }
  }
  if (!loops.length) return null;
  loops.sort((a, b) => Math.abs(area(b)) - Math.abs(area(a)));
  const outer = loops[0], sign = Math.sign(area(outer));
  let poly = simpler(outer, slack);
  for (const hole of loops.slice(1)) {
    if (Math.sign(area(hole)) === sign || Math.abs(area(hole)) < 12) continue; // not a hole, or a speck
    const hp = simpler(hole, slack);
    let best = Infinity, pi = 0, hi = 0;
    for (let i = 0; i < poly.length; i += 1) for (let j = 0; j < hp.length; j += 1) { const d = (poly[i][0] - hp[j][0]) ** 2 + (poly[i][1] - hp[j][1]) ** 2; if (d < best) { best = d; pi = i; hi = j; } }
    poly = [...poly.slice(0, pi + 1), ...hp.slice(hi), ...hp.slice(0, hi + 1), ...poly.slice(pi)]; // out to the hole, round it, and back
  }
  return poly.flatMap(([x, y]) => [Math.round(x * 10) / 10, Math.round(y * 10) / 10]);
}
