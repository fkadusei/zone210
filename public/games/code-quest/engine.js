/**
 * Code Quest engine: a program is a list of blocks. Running it produces a trace of what the robot does,
 * which the page then plays back. Directions: 0 up, 1 right, 2 down, 3 left.
 *   { t: "fwd" } { t: "left" } { t: "right" }
 *   { t: "repeat", n, body: [] }          do the body n times
 *   { t: "until", body: [] }              do the body again and again until the robot reaches the star
 *   { t: "if", c: "clear" | "blocked", then: [], else: [] }
 */
export const DX = [0, 1, 0, -1];
export const DY = [-1, 0, 1, 0];
export const MAX_STEPS = 500;

export function parseMap(rows, face) {
  const h = rows.length, w = rows[0].length;
  const walls = new Set(), coins = new Set();
  let start = null, goal = null;
  rows.forEach((row, y) => [...row].forEach((ch, x) => {
    if (ch === "#") walls.add(`${x},${y}`);
    if (ch === "c") coins.add(`${x},${y}`);
    if (ch === "S") start = { x, y, d: face };
    if (ch === "G") goal = { x, y };
  }));
  return { w, h, walls, coins, start, goal };
}

/** Number of blocks in a program (containers count as one, plus what is inside them). */
export function countBlocks(list) {
  return list.reduce((t, b) => t + 1 + (b.body ? countBlocks(b.body) : 0) + (b.then ? countBlocks(b.then) : 0) + (b.else ? countBlocks(b.else) : 0), 0);
}

/** Runs the program on a map. Returns { events, outcome, coins } where outcome is "win", "crash", "end" or "loop". */
export function run(map, program) {
  const st = { x: map.start.x, y: map.start.y, d: map.start.d, got: new Set(), steps: 0, over: null };
  const events = [{ k: "start", x: st.x, y: st.y, d: st.d, got: 0 }];
  const open = (x, y) => x >= 0 && y >= 0 && x < map.w && y < map.h && !map.walls.has(`${x},${y}`);
  const ahead = () => open(st.x + DX[st.d], st.y + DY[st.d]);
  function emit(k, b, extra = {}) {
    events.push({ k, id: b ? b.id : null, x: st.x, y: st.y, d: st.d, got: st.got.size, ...extra });
    st.steps += 1;
    if (st.steps > MAX_STEPS) st.over = "loop";
  }
  function exec(list) {
    for (const b of list) {
      if (st.over) return;
      if (b.t === "fwd") {
        if (!ahead()) { emit("bump", b); st.over = "crash"; return; }
        st.x += DX[st.d]; st.y += DY[st.d];
        const key = `${st.x},${st.y}`;
        const coin = map.coins.has(key) && !st.got.has(key);
        if (coin) st.got.add(key);
        emit("move", b, { coin });
        if (st.x === map.goal.x && st.y === map.goal.y) { st.over = "win"; return; }
      } else if (b.t === "left") { st.d = (st.d + 3) % 4; emit("turn", b); }
      else if (b.t === "right") { st.d = (st.d + 1) % 4; emit("turn", b); }
      else if (b.t === "repeat") { events.push({ k: "enter", id: b.id }); for (let i = 0; i < b.n && !st.over; i += 1) exec(b.body); }
      else if (b.t === "until") { events.push({ k: "enter", id: b.id }); let guard = 0; while (!st.over && guard++ < 200) { if (st.x === map.goal.x && st.y === map.goal.y) break; exec(b.body); } }
      else if (b.t === "if") { const yes = b.c === "clear" ? ahead() : !ahead(); events.push({ k: "check", id: b.id, yes }); exec(yes ? b.then : b.else); }
    }
  }
  exec(program);
  const outcome = st.over || "end";
  return { events, outcome, coins: st.got.size, steps: st.steps };
}

// small builders, used for the stored solutions
export const F = () => ({ t: "fwd" });
export const L = () => ({ t: "left" });
export const R = () => ({ t: "right" });
export const rep = (n, ...body) => ({ t: "repeat", n, body });
export const until = (...body) => ({ t: "until", body });
export const iff = (c, then, els = []) => ({ t: "if", c, then, else: els });
