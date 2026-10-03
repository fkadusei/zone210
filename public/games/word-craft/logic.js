/**
 * Word Craft rules (a crossword-style tile game on a 15 x 15 board).
 *   Board cell: 0 = empty, "A".."Z" = a letter tile, "a".."z" = a blank tile standing for that letter (worth 0).
 *   Rack tile: "A".."Z" or "?" (blank).
 * The state is plain JSON and carries its own random seed (rs), so online players deal identically.
 * Words are checked against the ENABLE word list (public domain), loaded by buildDict().
 */
import { shuffle } from "../../assets/cards-kit.js";

export const SIZE = 15;
export const CENTER = 112;
const PTS = { A: 1, B: 3, C: 3, D: 2, E: 1, F: 4, G: 2, H: 4, I: 1, J: 8, K: 5, L: 1, M: 3, N: 1, O: 1, P: 3, Q: 10, R: 1, S: 1, T: 1, U: 1, V: 4, W: 4, X: 8, Y: 4, Z: 10 };
const COUNTS = { A: 9, B: 2, C: 2, D: 4, E: 12, F: 2, G: 3, H: 2, I: 9, J: 1, K: 1, L: 4, M: 2, N: 6, O: 8, P: 2, Q: 1, R: 6, S: 4, T: 6, U: 4, V: 2, W: 2, X: 1, Y: 2, Z: 1, "?": 2 };
export const tileScore = (ch) => (ch === "?" || ch === ch.toLowerCase() ? 0 : PTS[ch]);

/** Premium squares: "TW" triple word, "DW" double word, "TL" triple letter, "DL" double letter. */
export const PREMIUM = (() => {
  const m = new Array(SIZE * SIZE).fill("");
  const put = (kind, list) => list.forEach(([r, c]) => {
    [[r, c], [r, 14 - c], [14 - r, c], [14 - r, 14 - c], [c, r], [c, 14 - r], [14 - c, r], [14 - c, 14 - r]].forEach(([a, b]) => { m[a * SIZE + b] = kind; });
  });
  put("TW", [[0, 0], [0, 7]]);
  put("DW", [[1, 1], [2, 2], [3, 3], [4, 4], [7, 7]]);
  put("TL", [[1, 5], [5, 5], [5, 1]]);
  put("DL", [[0, 3], [2, 6], [3, 7], [6, 6], [7, 3], [6, 2], [3, 0]]);
  return m;
})();

/* ---------------------------------------------------------------- dictionary */
/** Words as a Set plus a compact trie (first-child / next-sibling arrays) for fast move search. */
export function buildDict(text) {
  const words = text.split(/\r?\n/).filter((w) => w.length >= 2 && /^[a-z]+$/.test(w));
  const set = new Set(words);
  let cap = 420000;
  let letter = new Uint8Array(cap);
  let first = new Int32Array(cap);
  let next = new Int32Array(cap);
  let end = new Uint8Array(cap);
  let used = 2; // node 0 = none, node 1 = root
  const grow = () => {
    cap *= 2;
    const g = (A, T) => { const B = new T(cap); B.set(A); return B; };
    letter = g(letter, Uint8Array); first = g(first, Int32Array); next = g(next, Int32Array); end = g(end, Uint8Array);
  };
  for (const w of words) {
    let node = 1;
    for (let i = 0; i < w.length; i += 1) {
      const ch = w.charCodeAt(i) - 96;
      let c = first[node];
      while (c && letter[c] !== ch) c = next[c];
      if (!c) {
        if (used >= cap) grow();
        c = used;
        used += 1;
        letter[c] = ch;
        next[c] = first[node];
        first[node] = c;
      }
      node = c;
    }
    end[node] = 1;
  }
  const child = (node, ch) => { // ch: 1..26
    let c = first[node];
    while (c && letter[c] !== ch) c = next[c];
    return c;
  };
  return { set, has: (w) => set.has(w.toLowerCase()), root: 1, child, isEnd: (n) => end[n] === 1, size: words.length };
}

/* ---------------------------------------------------------------- state */
export function newGame(seed, n, first = 0) {
  const s = { n, rs: seed >>> 0, board: new Array(SIZE * SIZE).fill(0), bag: [], racks: [], turn: first, scores: new Array(n).fill(0), passes: 0, over: false, winner: -1, last: null, moves: 0 };
  const bag = [];
  Object.entries(COUNTS).forEach(([ch, k]) => { for (let i = 0; i < k; i += 1) bag.push(ch); });
  s.bag = shuffle(bag, s);
  for (let p = 0; p < n; p += 1) { s.racks.push([]); refill(s, p); }
  return s;
}
function refill(s, p) { while (s.racks[p].length < 7 && s.bag.length) s.racks[p].push(s.bag.pop()); }

const cellAt = (board, r, c) => (r < 0 || c < 0 || r >= SIZE || c >= SIZE ? 0 : board[r * SIZE + c]);

/**
 * Check and score a play. pl = [{ i, ch }] (ch is the letter shown: uppercase real tile, lowercase blank).
 * Returns { ok: true, score, words: [{ w, score }] } or { ok: false, err }.
 */
export function evaluate(board, pl, dict, firstMove = false) {
  if (!pl.length) return { ok: false, err: "Place at least one tile." };
  const seen = new Set();
  for (const p of pl) {
    if (board[p.i] || seen.has(p.i)) return { ok: false, err: "That square is taken." };
    seen.add(p.i);
  }
  const rows = new Set(pl.map((p) => Math.floor(p.i / SIZE)));
  const cols = new Set(pl.map((p) => p.i % SIZE));
  if (rows.size > 1 && cols.size > 1) return { ok: false, err: "Tiles must be in one row or one column." };
  const tmp = board.slice();
  pl.forEach((p) => { tmp[p.i] = p.ch; });
  const isNew = (r, c) => seen.has(r * SIZE + c);
  // no gaps along the line of play
  if (pl.length > 1) {
    const horiz = rows.size === 1;
    const r0 = Math.floor(pl[0].i / SIZE);
    const c0 = pl[0].i % SIZE;
    const lo = horiz ? Math.min(...cols) : Math.min(...rows);
    const hi = horiz ? Math.max(...cols) : Math.max(...rows);
    for (let k = lo; k <= hi; k += 1) if (!(horiz ? tmp[r0 * SIZE + k] : tmp[k * SIZE + c0])) return { ok: false, err: "There is a gap between your tiles." };
  }
  const words = [];
  const done = new Set();
  let touches = false;
  const run = (r, c, dr, dc) => {
    let a = r, b = c;
    while (cellAt(tmp, a - dr, b - dc)) { a -= dr; b -= dc; }
    const start = a * SIZE + b;
    let w = "", sum = 0, mult = 1, len = 0, old = false;
    while (cellAt(tmp, a, b)) {
      const ch = tmp[a * SIZE + b];
      let v = tileScore(ch);
      if (isNew(a, b)) {
        const pr = PREMIUM[a * SIZE + b];
        if (pr === "DL") v *= 2; else if (pr === "TL") v *= 3; else if (pr === "DW") mult *= 2; else if (pr === "TW") mult *= 3;
      } else old = true;
      sum += v; w += ch.toUpperCase(); len += 1; a += dr; b += dc;
    }
    return { start, w, len, score: sum * mult, old, key: `${start}:${dr}` };
  };
  for (const p of pl) {
    const r = Math.floor(p.i / SIZE);
    const c = p.i % SIZE;
    for (const [dr, dc] of [[0, 1], [1, 0]]) {
      const x = run(r, c, dr, dc);
      if (x.len >= 2 && !done.has(x.key)) { done.add(x.key); words.push(x); if (x.old) touches = true; }
    }
  }
  if (firstMove) {
    if (!seen.has(CENTER)) return { ok: false, err: "The first word must cover the centre star." };
    if (pl.length < 2) return { ok: false, err: "The first word needs at least two letters." };
  } else if (!touches) return { ok: false, err: "Your word must connect to the tiles already on the board." };
  if (!words.length) return { ok: false, err: "Tiles must form a word of two or more letters." };
  for (const x of words) if (!dict.has(x.w)) return { ok: false, err: `“${x.w}” is not in the word list.`, bad: x.w };
  let score = words.reduce((t, x) => t + x.score, 0);
  if (pl.length === 7) score += 50;
  return { ok: true, score, words: words.map((x) => ({ w: x.w, score: x.score })), bingo: pl.length === 7 };
}

const isEmptyBoard = (board) => !board[CENTER];
/** Play tiles from the rack. pl = [{ i, tile, as }] where tile is a rack tile ("?" for blank, then `as` is the letter). */
export function play(s, pl, dict) {
  if (s.over) return null;
  const rack = s.racks[s.turn].slice();
  const cells = [];
  for (const p of pl) {
    const at = rack.indexOf(p.tile);
    if (at < 0) return { ok: false, err: "You don't have that tile." };
    rack.splice(at, 1);
    cells.push({ i: p.i, ch: p.tile === "?" ? String(p.as || "").toLowerCase() : p.tile });
    if (p.tile === "?" && !/^[a-zA-Z]$/.test(p.as || "")) return { ok: false, err: "Choose a letter for the blank." };
  }
  const res = evaluate(s.board, cells, dict, isEmptyBoard(s.board));
  if (!res.ok) return res;
  cells.forEach((c) => { s.board[c.i] = c.ch; });
  s.racks[s.turn] = rack;
  s.scores[s.turn] += res.score;
  s.last = { by: s.turn, cells: cells.map((c) => c.i), score: res.score, words: res.words.map((x) => x.w), bingo: res.bingo };
  s.passes = 0;
  s.moves += 1;
  refill(s, s.turn);
  if (!s.racks[s.turn].length) return finish(s, res, s.turn);
  s.turn = (s.turn + 1) % s.n;
  return res;
}
export function pass(s) {
  if (s.over) return null;
  s.last = { by: s.turn, cells: [], score: 0, words: [], passed: true };
  s.passes += 1;
  s.moves += 1;
  if (s.passes >= s.n * 2) { endGame(s, -1); return { ok: true, score: 0, words: [] }; }
  s.turn = (s.turn + 1) % s.n;
  return { ok: true, score: 0, words: [] };
}
/** Swap some rack tiles (by index) for new ones from the bag; costs the turn. */
export function exchange(s, idx) {
  if (s.over || s.bag.length < 7 || !idx.length) return null;
  const give = [...new Set(idx)].sort((a, b) => b - a).map((i) => s.racks[s.turn].splice(i, 1)[0]);
  refill(s, s.turn);
  s.bag.push(...give);
  s.bag = shuffle(s.bag, s);
  s.last = { by: s.turn, cells: [], score: 0, words: [], swapped: give.length };
  s.passes += 1;
  s.moves += 1;
  if (s.passes >= s.n * 2) { endGame(s, -1); return { ok: true }; }
  s.turn = (s.turn + 1) % s.n;
  return { ok: true };
}
function finish(s, res, out) { endGame(s, out); return res; }
function endGame(s, out) {
  s.over = true;
  const left = s.racks.map((r) => r.reduce((t, ch) => t + tileScore(ch), 0));
  if (out >= 0) { s.scores[out] += left.reduce((t, v, i) => (i === out ? t : t + v), 0); }
  s.scores = s.scores.map((v, i) => (out >= 0 ? v - (i === out ? 0 : left[i]) : v - left[i]));
  let best = 0;
  s.scores.forEach((v, i) => { if (v > s.scores[best]) best = i; });
  s.winner = s.scores.filter((v) => v === s.scores[best]).length > 1 ? -2 : best; // -2 = a tie
  s.leftover = left;
}

/* ---------------------------------------------------------------- the computer */
/** Every legal play for a rack. Returns [{ pl: [{i, tile, as}], score, words }]. */
export function allMoves(s, rack, dict, limit = 6000) {
  const board = s.board;
  const firstMove = isEmptyBoard(board);
  const out = [];
  const distinct = [...new Set(rack)];
  const letterNode = (node, L) => dict.child(node, L.charCodeAt(0) - 64);
  for (const dir of [0, 1]) {
    // the board seen across (dir 0) or turned on its side (dir 1)
    const idx = (r, c) => (dir === 0 ? r * SIZE + c : c * SIZE + r);
    const get = (r, c) => (r < 0 || c < 0 || r >= SIZE || c >= SIZE ? 0 : board[idx(r, c)]);
    const anchor = (r, c) => !get(r, c) && (get(r - 1, c) || get(r + 1, c) || get(r, c - 1) || get(r, c + 1) || (firstMove && idx(r, c) === CENTER));
    // letters that keep the crossing word valid when put on an empty square (null = anything goes)
    const cross = (r, c) => {
      let up = "";
      let dn = "";
      for (let a = r - 1; get(a, c); a -= 1) up = String(get(a, c)).toUpperCase() + up;
      for (let a = r + 1; get(a, c); a += 1) dn += String(get(a, c)).toUpperCase();
      if (!up && !dn) return null;
      const ok = new Set();
      for (let k = 0; k < 26; k += 1) { const ch = String.fromCharCode(65 + k); if (dict.set.has((up + ch + dn).toLowerCase())) ok.add(ch); }
      return ok;
    };
    for (let r = 0; r < SIZE; r += 1) {
      const cc = [];
      for (let c = 0; c < SIZE; c += 1) cc[c] = get(r, c) ? null : cross(r, c);
      for (let c = 0; c < SIZE; c += 1) {
        if (!anchor(r, c)) continue;
        const placed = [];
        const rk = rack.slice();
        const record = () => {
          const cells = placed.map((p) => ({ i: idx(r, p.c), ch: p.tile === "?" ? p.ch.toLowerCase() : p.tile }));
          const res = evaluate(board, cells, dict, firstMove);
          if (res.ok) out.push({ pl: placed.map((p) => ({ i: idx(r, p.c), tile: p.tile, as: p.tile === "?" ? p.ch : undefined })), score: res.score, words: res.words.map((x) => x.w) });
        };
        const extendRight = (node, col) => {
          if (out.length > limit) return;
          if (col > c && dict.isEnd(node) && (col >= SIZE || !get(r, col))) record();
          if (col >= SIZE) return;
          const here = get(r, col);
          if (here) {
            const nx = letterNode(node, String(here).toUpperCase());
            if (nx) extendRight(nx, col + 1);
            return;
          }
          const allow = cc[col];
          for (const t of distinct) {
            const have = rk.indexOf(t);
            if (have < 0) continue;
            for (const L of t === "?" ? "ABCDEFGHIJKLMNOPQRSTUVWXYZ" : t) {
              if (allow && !allow.has(L)) continue;
              const nx = letterNode(node, L);
              if (!nx) continue;
              rk.splice(have, 1);
              placed.push({ c: col, tile: t, ch: L });
              extendRight(nx, col + 1);
              placed.pop();
              rk.splice(have, 0, t);
            }
          }
        };
        if (get(r, c - 1)) {
          // tiles already stand to the left: the word must start with them
          let a = c - 1;
          while (get(r, a - 1)) a -= 1;
          let node = dict.root;
          for (let k = a; k < c && node; k += 1) node = letterNode(node, String(get(r, k)).toUpperCase());
          if (node) extendRight(node, c);
        } else {
          let room = 0;
          for (let a = c - 1; a >= 0 && !get(r, a) && !anchor(r, a) && room < 6; a -= 1) room += 1;
          // squares left of the anchor that are not anchors themselves have no neighbours, so no crossing words to check
          const leftPart = (node, pre, left) => {
            const base = c - pre.length;
            pre.forEach((p, k) => placed.push({ c: base + k, tile: p.tile, ch: p.ch }));
            extendRight(node, c);
            placed.length -= pre.length;
            if (left <= 0) return;
            for (const t of distinct) {
              const have = rk.indexOf(t);
              if (have < 0) continue;
              for (const L of t === "?" ? "ABCDEFGHIJKLMNOPQRSTUVWXYZ" : t) {
                const nx = letterNode(node, L);
                if (!nx) continue;
                rk.splice(have, 1);
                pre.push({ tile: t, ch: L });
                leftPart(nx, pre, left - 1);
                pre.pop();
                rk.splice(have, 0, t);
              }
            }
          };
          leftPart(dict.root, [], room);
        }
      }
    }
  }
  return out;
}

/** The computer's choice: easy = a modest word, normal = a good one, hard = the best. Returns a move or null (pass). */
export function chooseMove(s, dict, level) {
  const rack = s.racks[s.turn];
  const moves = allMoves(s, rack, dict);
  if (!moves.length) return null;
  const seen = new Set();
  const uniq = moves.filter((m) => { const k = m.pl.map((p) => `${p.i}${p.as || p.tile}`).sort().join(","); if (seen.has(k)) return false; seen.add(k); return true; });
  uniq.sort((a, b) => b.score - a.score);
  if (level === "hard") return uniq[0];
  if (level === "normal") return uniq[Math.min(uniq.length - 1, Math.floor(Math.random() * Math.min(4, uniq.length)))];
  const lo = Math.floor(uniq.length * 0.45);
  return uniq[Math.min(uniq.length - 1, lo + Math.floor(Math.random() * Math.max(1, uniq.length - lo)))];
}
