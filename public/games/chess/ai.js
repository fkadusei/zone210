/**
 * Chess computer opponent: iterative-deepening negamax with alpha-beta pruning, quiescence search
 * (so it doesn't stop in the middle of a capture sequence), check extensions, killer-move ordering
 * and a material + piece-square evaluation. Pure logic (runs in a Web Worker or on the main thread).
 */
import { pseudoMoves, legalMoves, makeMove, unmakeMove, isAttacked, cloneState, positionKey, inCheck } from "./logic.js";

const VALUE = { P: 100, N: 320, B: 330, R: 500, Q: 900, K: 0 };
const MATE = 100000;
const INF = 1e9;

// Piece-square tables from White's point of view, row 0 = rank 8 (same layout as the board).
const PST = {
  P: [0,0,0,0,0,0,0,0, 50,50,50,50,50,50,50,50, 10,10,20,30,30,20,10,10, 5,5,10,25,25,10,5,5, 0,0,0,20,20,0,0,0, 5,-5,-10,0,0,-10,-5,5, 5,10,10,-20,-20,10,10,5, 0,0,0,0,0,0,0,0],
  N: [-50,-40,-30,-30,-30,-30,-40,-50, -40,-20,0,0,0,0,-20,-40, -30,0,10,15,15,10,0,-30, -30,5,15,20,20,15,5,-30, -30,0,15,20,20,15,0,-30, -30,5,10,15,15,10,5,-30, -40,-20,0,5,5,0,-20,-40, -50,-40,-30,-30,-30,-30,-40,-50],
  B: [-20,-10,-10,-10,-10,-10,-10,-20, -10,0,0,0,0,0,0,-10, -10,0,5,10,10,5,0,-10, -10,5,5,10,10,5,5,-10, -10,0,10,10,10,10,0,-10, -10,10,10,10,10,10,10,-10, -10,5,0,0,0,0,5,-10, -20,-10,-10,-10,-10,-10,-10,-20],
  R: [0,0,0,0,0,0,0,0, 5,10,10,10,10,10,10,5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, 0,0,0,5,5,0,0,0],
  Q: [-20,-10,-10,-5,-5,-10,-10,-20, -10,0,0,0,0,0,0,-10, -10,0,5,5,5,5,0,-10, -5,0,5,5,5,5,0,-5, 0,0,5,5,5,5,0,-5, -10,5,5,5,5,5,0,-10, -10,0,5,0,0,0,0,-10, -20,-10,-10,-5,-5,-10,-10,-20],
  K: [-30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30, -20,-30,-30,-40,-40,-30,-30,-20, -10,-20,-20,-20,-20,-20,-20,-10, 20,20,0,0,0,0,20,20, 20,30,10,0,0,10,30,20],
  KE: [-50,-40,-30,-20,-20,-30,-40,-50, -30,-20,-10,0,0,-10,-20,-30, -30,-10,20,30,30,20,-10,-30, -30,-10,30,40,40,30,-10,-30, -30,-10,30,40,40,30,-10,-30, -30,-10,20,30,30,20,-10,-30, -30,-30,0,0,0,0,-30,-30, -50,-30,-30,-30,-30,-30,-30,-50],
};

/** Static evaluation in centipawns from the point of view of the side to move. */
export function evaluate(st) {
  const { board } = st;
  let material = 0;
  for (let i = 0; i < 64; i += 1) {
    const p = board[i];
    if (p !== null && p !== "K" && p !== "k" && p !== "P" && p !== "p") material += VALUE[p.toUpperCase()];
  }
  const endgame = material <= 2600;
  let score = 0;
  for (let i = 0; i < 64; i += 1) {
    const p = board[i];
    if (p === null) continue;
    const t = p.toUpperCase();
    const white = p === t;
    const table = t === "K" ? (endgame ? PST.KE : PST.K) : PST[t];
    const v = VALUE[t] + table[white ? i : i ^ 56]; // mirror rows for Black
    score += white ? v : -v;
  }
  return st.turn === "w" ? score : -score;
}

const order = (moves, killers, ply) => {
  for (const m of moves) {
    let s = 0;
    if (m.capture) s = 10000 + 10 * VALUE[m.capture.toUpperCase()] - VALUE[m.piece.toUpperCase()] / 10;
    else if (killers[ply] && (killers[ply][0] === m.from * 64 + m.to || killers[ply][1] === m.from * 64 + m.to)) s = 9000;
    if (m.promo) s += 8000 + (m.promo === "q" ? 900 : 0);
    if (m.flag === "castleK" || m.flag === "castleQ") s += 50;
    m.s = s;
  }
  moves.sort((a, b) => b.s - a.s);
};

class Search {
  constructor(st, deadline) {
    this.st = st;
    this.deadline = deadline;
    this.nodes = 0;
    this.aborted = false;
    this.killers = [];
  }

  timeUp() {
    if (this.aborted) return true;
    if ((this.nodes & 1023) === 0 && Date.now() > this.deadline) this.aborted = true;
    return this.aborted;
  }

  quiesce(alpha, beta, ply) {
    this.nodes += 1;
    if (this.timeUp()) return 0;
    const stand = evaluate(this.st);
    if (stand >= beta) return beta;
    if (stand > alpha) alpha = stand;
    if (ply > 24) return alpha;
    const us = this.st.turn;
    const them = us === "w" ? "b" : "w";
    const moves = pseudoMoves(this.st, true);
    order(moves, this.killers, ply);
    for (const m of moves) {
      const u = makeMove(this.st, m);
      if (isAttacked(this.st.board, this.st.king[us], them)) {
        unmakeMove(this.st, m, u);
        continue;
      }
      const score = -this.quiesce(-beta, -alpha, ply + 1);
      unmakeMove(this.st, m, u);
      if (this.aborted) return 0;
      if (score >= beta) return beta;
      if (score > alpha) alpha = score;
    }
    return alpha;
  }

  negamax(depth, alpha, beta, ply) {
    this.nodes += 1;
    if (this.timeUp()) return 0;
    const st = this.st;
    if (st.half >= 100) return 0;
    const us = st.turn;
    const them = us === "w" ? "b" : "w";
    const checked = isAttacked(st.board, st.king[us], them);
    if (checked && ply < 40) depth += 1; // check extension
    if (depth <= 0) return this.quiesce(alpha, beta, ply);

    const moves = pseudoMoves(st);
    order(moves, this.killers, ply);
    let legal = 0;
    for (const m of moves) {
      const u = makeMove(st, m);
      if (isAttacked(st.board, st.king[us], them)) {
        unmakeMove(st, m, u);
        continue;
      }
      legal += 1;
      const score = -this.negamax(depth - 1, -beta, -alpha, ply + 1);
      unmakeMove(st, m, u);
      if (this.aborted) return 0;
      if (score >= beta) {
        if (!m.capture) {
          const k = (this.killers[ply] = this.killers[ply] || [0, 0]);
          if (k[0] !== m.from * 64 + m.to) {
            k[1] = k[0];
            k[0] = m.from * 64 + m.to;
          }
        }
        return beta;
      }
      if (score > alpha) alpha = score;
    }
    if (legal === 0) return checked ? -MATE + ply : 0;
    return alpha;
  }
}

export const LEVELS = {
  easy: { depth: 2, ms: 300, noise: 140 },
  normal: { depth: 4, ms: 900, noise: 0 },
  hard: { depth: 7, ms: 2600, noise: 0 },
};

/**
 * Picks a move for the side to move. `hist` (position keys) lets the engine avoid repeating a position it is
 * winning from and steer for a repetition when it is losing.
 * Returns the move object, or null if there is no legal move.
 */
export function chooseMove(state, level = "normal", rng = Math.random) {
  const cfg = LEVELS[level] || LEVELS.normal;
  const st = cloneState(state);
  const roots = legalMoves(st);
  if (roots.length === 0) return null;
  if (roots.length === 1) return roots[0];

  // Has the position that now stands on the board (after a root move was made) already occurred twice?
  const repeatsNow = () => {
    const key = positionKey(st);
    return state.hist.filter((k) => k === key).length >= 2;
  };

  const deadline = Date.now() + cfg.ms;

  // Easy: a shallow search of every move, then a random pick among the reasonable ones.
  if (cfg.noise > 0) {
    const s = new Search(st, Infinity);
    const scored = roots.map((m) => {
      const u = makeMove(st, m);
      const score = -s.negamax(cfg.depth - 1, -INF, INF, 1);
      unmakeMove(st, m, u);
      return { m, score };
    });
    const best = Math.max(...scored.map((x) => x.score));
    const pool = scored.filter((x) => x.score >= best - cfg.noise);
    return pool[Math.floor(rng() * pool.length)].m;
  }

  let bestMove = roots[0];
  order(roots, [], 0);
  for (let depth = 1; depth <= cfg.depth; depth += 1) {
    const s = new Search(st, deadline);
    let alpha = -INF;
    let iterBest = null;
    for (const m of roots) {
      const u = makeMove(st, m);
      const score = repeatsNow() ? 0 : -s.negamax(depth - 1, -INF, -alpha, 1);
      unmakeMove(st, m, u);
      if (s.aborted) break;
      m.score = score;
      if (score > alpha) {
        alpha = score;
        iterBest = m;
      }
    }
    if (s.aborted && depth > 1) break; // keep the last fully searched iteration
    if (iterBest) {
      bestMove = iterBest;
      // search the previous best first next time
      roots.sort((a, b) => (b === iterBest) - (a === iterBest) || (b.score || 0) - (a.score || 0));
    }
    if (alpha > MATE - 100) break; // found a forced mate
    if (Date.now() > deadline) break;
  }
  return bestMove;
}

export { inCheck };
