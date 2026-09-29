/**
 * Oware (Abapa rules), the traditional mancala game played across Ghana and West Africa.
 * Pure logic, no DOM.
 *
 * Board: 12 pits. Pits 0-5 belong to player 0 (South), 6-11 to player 1 (North). Seeds are sown
 * counter-clockwise (increasing index, wrapping). Each pit starts with 4 seeds (48 total).
 *
 * Rules implemented:
 *  - Sow one seed per pit; the origin pit is skipped on laps of 12+ seeds.
 *  - If the last seed lands in an OPPONENT pit making it 2 or 3, capture it, and keep capturing backwards
 *    through consecutive opponent pits holding 2 or 3.
 *  - Grand slam: a move that would capture every seed on the opponent's side captures nothing.
 *  - If the opponent has no seeds you must, if possible, make a move that gives them seeds.
 *  - The game ends when a player has 25+ captured seeds, or when the player to move has no legal move
 *    (the player who can still move keeps the seeds on their own side). Equal 24-24 is a draw.
 */
export const PITS = 12;
export const WIN_SCORE = 25;
export const owner = (i) => (i < 6 ? 0 : 1);
export const ownPits = (p) => [0, 1, 2, 3, 4, 5].map((k) => p * 6 + k);

export function newState() {
  return { pits: Array(PITS).fill(4), store: [0, 0], turn: 0, moves: 0 };
}

export const cloneState = (s) => ({ pits: s.pits.slice(), store: s.store.slice(), turn: s.turn, moves: s.moves });
const sideTotal = (pits, p) => ownPits(p).reduce((sum, i) => sum + pits[i], 0);
export const seedsOn = (state, p) => sideTotal(state.pits, p);

/** The pits sown into (in order) if `from` were played, ignoring captures. */
export function sowPath(pits, from) {
  const path = [];
  let seeds = pits[from];
  let j = from;
  while (seeds > 0) {
    j = (j + 1) % PITS;
    if (j === from) continue; // skip the origin pit
    path.push(j);
    seeds -= 1;
  }
  return path;
}

/** Legal pit indexes for the player to move (enforces the "must feed" rule). */
export function legalMoves(state) {
  const p = state.turn;
  const mine = ownPits(p).filter((i) => state.pits[i] > 0);
  if (sideTotal(state.pits, 1 - p) > 0) return mine;
  // Opponent is out of seeds: only moves that reach their side are allowed.
  return mine.filter((i) => sowPath(state.pits, i).some((j) => owner(j) !== p));
}

/**
 * Plays pit `from` for the player to move. Returns a NEW state plus details for animation:
 * { state, path, captured, capturedPits }.
 */
export function applyMove(state, from) {
  const p = state.turn;
  const next = cloneState(state);
  const path = sowPath(next.pits, from);
  next.pits[from] = 0;
  path.forEach((j) => {
    next.pits[j] += 1;
  });

  let captured = 0;
  let capturedPits = [];
  const last = path[path.length - 1];
  if (owner(last) !== p && (next.pits[last] === 2 || next.pits[last] === 3)) {
    let k = last;
    const pits = [];
    while (owner(k) !== p && (next.pits[k] === 2 || next.pits[k] === 3)) {
      pits.push(k);
      k = (k - 1 + PITS) % PITS;
    }
    const total = pits.reduce((sum, i) => sum + next.pits[i], 0);
    // Grand slam captures nothing.
    if (total < sideTotal(next.pits, 1 - p)) {
      capturedPits = pits;
      captured = total;
      pits.forEach((i) => {
        next.pits[i] = 0;
      });
      next.store[p] += captured;
    }
  }

  next.turn = 1 - p;
  next.moves += 1;
  return { state: next, path, captured, capturedPits };
}

/**
 * Is the game over? Returns { over, winner (0 | 1 | null for a draw), final: state with leftover seeds
 * awarded } or { over: false }.
 */
export function status(state) {
  const finish = (s) => {
    const [a, b] = s.store;
    return { over: true, winner: a === b ? null : a > b ? 0 : 1, final: s };
  };

  if (state.store[0] >= WIN_SCORE || state.store[1] >= WIN_SCORE) return finish(state);

  const moves = legalMoves(state);
  const stuckOrLooping = moves.length === 0 || state.moves > 400;
  if (!stuckOrLooping) return { over: false };

  // Each player keeps the seeds still on their own side.
  const s = cloneState(state);
  for (let p = 0; p < 2; p += 1) {
    s.store[p] += sideTotal(s.pits, p);
    ownPits(p).forEach((i) => {
      s.pits[i] = 0;
    });
  }
  return finish(s);
}

/* ------------------------------ computer opponent ------------------------------ */

function evaluate(state, me) {
  const opp = 1 - me;
  return (state.store[me] - state.store[opp]) * 10 + (seedsOn(state, me) - seedsOn(state, opp)) * 0.25 + legalMoves(state).length * 0.1 * (state.turn === me ? 1 : -1);
}

function negamax(state, depth, alpha, beta, me) {
  const st = status(state);
  if (st.over) {
    const diff = st.final.store[me] - st.final.store[1 - me];
    return (state.turn === me ? 1 : -1) * (diff === 0 ? 0 : Math.sign(diff) * 10000 + diff);
  }
  if (depth === 0) return (state.turn === me ? 1 : -1) * evaluate(state, me);

  const moves = legalMoves(state);
  let best = -Infinity;
  for (const m of moves) {
    const { state: child } = applyMove(state, m);
    const value = -negamax(child, depth - 1, -beta, -alpha, me);
    if (value > best) best = value;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
  }
  return best;
}

/** Choose a pit for the player to move. level: "easy" | "normal" | "hard". */
export function chooseMove(state, level = "normal", rng = Math.random) {
  const moves = legalMoves(state);
  if (moves.length === 1) return moves[0];
  const me = state.turn;

  if (level === "easy") {
    // Greedy for a capture about half the time, otherwise random.
    if (rng() < 0.5) {
      let bestM = null;
      let bestC = 0;
      moves.forEach((m) => {
        const { captured } = applyMove(state, m);
        if (captured > bestC) {
          bestC = captured;
          bestM = m;
        }
      });
      if (bestM !== null) return bestM;
    }
    return moves[Math.floor(rng() * moves.length)];
  }

  const depth = level === "hard" ? 8 : 4;
  let best = moves[0];
  let bestValue = -Infinity;
  for (const m of moves) {
    const { state: child } = applyMove(state, m);
    const value = -negamax(child, depth - 1, -Infinity, Infinity, me) + rng() * 0.01;
    if (value > bestValue) {
      bestValue = value;
      best = m;
    }
  }
  return best;
}
