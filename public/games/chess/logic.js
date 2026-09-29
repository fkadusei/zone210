/**
 * Chess rules engine. Pure logic, no DOM.
 *
 * Board: 64-element array, index = row * 8 + col, row 0 = rank 8 (Black's back rank), col 0 = file a.
 * Pieces: "PNBRQK" for White, "pnbrqk" for Black, null for empty.
 * Handles castling, en passant, promotion, check / checkmate / stalemate and the standard draw rules.
 */
export const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
const FILES = "abcdefgh";

export const isWhite = (p) => p !== null && p === p.toUpperCase();
export const colorOf = (p) => (p === null ? null : isWhite(p) ? "w" : "b");
export const sqName = (i) => FILES[i % 8] + (8 - Math.floor(i / 8));
export const sqIndex = (name) => (8 - Number(name[1])) * 8 + FILES.indexOf(name[0]);

const KNIGHT = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
const KING = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
const DIAG = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
const ORTHO = [[-1, 0], [1, 0], [0, -1], [0, 1]];

/* ------------------------------------------------------------------ state */

export function fromFEN(fen) {
  const [placement, turn = "w", castling = "-", ep = "-", half = "0", full = "1"] = fen.trim().split(/\s+/);
  const board = Array(64).fill(null);
  let i = 0;
  for (const ch of placement) {
    if (ch === "/") continue;
    if (ch >= "1" && ch <= "8") i += Number(ch);
    else {
      board[i] = ch;
      i += 1;
    }
  }
  const st = {
    board,
    turn,
    castle: { K: castling.includes("K"), Q: castling.includes("Q"), k: castling.includes("k"), q: castling.includes("q") },
    ep: ep === "-" ? -1 : sqIndex(ep),
    half: Number(half),
    full: Number(full),
    king: { w: board.indexOf("K"), b: board.indexOf("k") },
    hist: [],
  };
  st.hist.push(positionKey(st));
  return st;
}

export function toFEN(st) {
  let out = "";
  for (let r = 0; r < 8; r += 1) {
    let empty = 0;
    for (let c = 0; c < 8; c += 1) {
      const p = st.board[r * 8 + c];
      if (p === null) empty += 1;
      else {
        if (empty) out += empty;
        empty = 0;
        out += p;
      }
    }
    if (empty) out += empty;
    if (r < 7) out += "/";
  }
  const c = (st.castle.K ? "K" : "") + (st.castle.Q ? "Q" : "") + (st.castle.k ? "k" : "") + (st.castle.q ? "q" : "");
  return `${out} ${st.turn} ${c || "-"} ${st.ep < 0 ? "-" : sqName(st.ep)} ${st.half} ${st.full}`;
}

export const newGame = () => fromFEN(START_FEN);

export function cloneState(st) {
  return {
    board: st.board.slice(),
    turn: st.turn,
    castle: { ...st.castle },
    ep: st.ep,
    half: st.half,
    full: st.full,
    king: { ...st.king },
    hist: st.hist.slice(),
  };
}

/** Identity of a position for repetition: pieces, side to move, castling rights and a capturable en-passant square. */
export function positionKey(st) {
  let epPart = "-";
  if (st.ep >= 0) {
    const r = Math.floor(st.ep / 8);
    const c = st.ep % 8;
    const pawn = st.turn === "w" ? "P" : "p";
    const pr = st.turn === "w" ? r + 1 : r - 1;
    if ((c > 0 && st.board[pr * 8 + c - 1] === pawn) || (c < 7 && st.board[pr * 8 + c + 1] === pawn)) epPart = String(st.ep);
  }
  return `${st.board.map((p) => p || ".").join("")} ${st.turn} ${st.castle.K ? "K" : ""}${st.castle.Q ? "Q" : ""}${st.castle.k ? "k" : ""}${st.castle.q ? "q" : ""} ${epPart}`;
}

/* ------------------------------------------------------------ attacks */

/** Is square `sq` attacked by any piece of colour `by`? */
export function isAttacked(board, sq, by) {
  const r = Math.floor(sq / 8);
  const c = sq % 8;
  const white = by === "w";

  // pawns: a white pawn attacks up the board (toward row 0), so it sits one row BELOW the target
  const pr = white ? r + 1 : r - 1;
  const pawn = white ? "P" : "p";
  if (pr >= 0 && pr < 8) {
    if (c > 0 && board[pr * 8 + c - 1] === pawn) return true;
    if (c < 7 && board[pr * 8 + c + 1] === pawn) return true;
  }
  const knight = white ? "N" : "n";
  for (const [dr, dc] of KNIGHT) {
    const rr = r + dr;
    const cc = c + dc;
    if (rr >= 0 && rr < 8 && cc >= 0 && cc < 8 && board[rr * 8 + cc] === knight) return true;
  }
  const king = white ? "K" : "k";
  for (const [dr, dc] of KING) {
    const rr = r + dr;
    const cc = c + dc;
    if (rr >= 0 && rr < 8 && cc >= 0 && cc < 8 && board[rr * 8 + cc] === king) return true;
  }
  const bishop = white ? "B" : "b";
  const rook = white ? "R" : "r";
  const queen = white ? "Q" : "q";
  for (const [dr, dc] of DIAG) {
    let rr = r + dr;
    let cc = c + dc;
    while (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) {
      const p = board[rr * 8 + cc];
      if (p !== null) {
        if (p === bishop || p === queen) return true;
        break;
      }
      rr += dr;
      cc += dc;
    }
  }
  for (const [dr, dc] of ORTHO) {
    let rr = r + dr;
    let cc = c + dc;
    while (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) {
      const p = board[rr * 8 + cc];
      if (p !== null) {
        if (p === rook || p === queen) return true;
        break;
      }
      rr += dr;
      cc += dc;
    }
  }
  return false;
}

export const inCheck = (st, color = st.turn) => isAttacked(st.board, st.king[color], color === "w" ? "b" : "w");

/* --------------------------------------------------- move generation */

/**
 * Move: { from, to, piece, capture (piece or null), promo ("q"|"r"|"b"|"n"|undefined), flag ("ep"|"castleK"|"castleQ"|"double"|undefined) }
 * Pseudo-legal moves ignore whether the mover's king is left in check.
 */
export function pseudoMoves(st, capturesOnly = false) {
  const { board } = st;
  const us = st.turn;
  const moves = [];
  const push = (from, to, piece, capture, extra) => moves.push({ from, to, piece, capture, ...extra });

  for (let from = 0; from < 64; from += 1) {
    const piece = board[from];
    if (piece === null || colorOf(piece) !== us) continue;
    const r = Math.floor(from / 8);
    const c = from % 8;
    const type = piece.toUpperCase();

    if (type === "P") {
      const dir = us === "w" ? -1 : 1;
      const startRow = us === "w" ? 6 : 1;
      const promoRow = us === "w" ? 0 : 7;
      const addPawn = (to, capture, flag) => {
        if (Math.floor(to / 8) === promoRow) for (const promo of ["q", "r", "b", "n"]) push(from, to, piece, capture, { promo });
        else push(from, to, piece, capture, flag ? { flag } : undefined);
      };
      const one = (r + dir) * 8 + c;
      if (r + dir >= 0 && r + dir < 8) {
        if (board[one] === null && !capturesOnly) {
          addPawn(one, null);
          const two = (r + 2 * dir) * 8 + c;
          if (r === startRow && board[two] === null) push(from, two, piece, null, { flag: "double" });
        } else if (board[one] === null && capturesOnly && Math.floor(one / 8) === promoRow) {
          addPawn(one, null); // queen-promotions count as "noisy" moves for quiescence search
        }
        for (const dc of [-1, 1]) {
          const cc = c + dc;
          if (cc < 0 || cc > 7) continue;
          const to = (r + dir) * 8 + cc;
          const target = board[to];
          if (target !== null && colorOf(target) !== us) addPawn(to, target);
          else if (to === st.ep && target === null) push(from, to, piece, us === "w" ? "p" : "P", { flag: "ep" });
        }
      }
      continue;
    }

    if (type === "N" || type === "K") {
      for (const [dr, dc] of type === "N" ? KNIGHT : KING) {
        const rr = r + dr;
        const cc = c + dc;
        if (rr < 0 || rr > 7 || cc < 0 || cc > 7) continue;
        const to = rr * 8 + cc;
        const target = board[to];
        if (target === null) {
          if (!capturesOnly) push(from, to, piece, null);
        } else if (colorOf(target) !== us) push(from, to, piece, target);
      }
      if (type === "K" && !capturesOnly) {
        const row = us === "w" ? 7 : 0;
        if (from === row * 8 + 4) {
          const them = us === "w" ? "b" : "w";
          const rights = us === "w" ? [st.castle.K, st.castle.Q] : [st.castle.k, st.castle.q];
          const rook = us === "w" ? "R" : "r";
          if (rights[0] && board[row * 8 + 5] === null && board[row * 8 + 6] === null && board[row * 8 + 7] === rook &&
              !isAttacked(board, row * 8 + 4, them) && !isAttacked(board, row * 8 + 5, them) && !isAttacked(board, row * 8 + 6, them)) {
            push(from, row * 8 + 6, piece, null, { flag: "castleK" });
          }
          if (rights[1] && board[row * 8 + 3] === null && board[row * 8 + 2] === null && board[row * 8 + 1] === null && board[row * 8] === rook &&
              !isAttacked(board, row * 8 + 4, them) && !isAttacked(board, row * 8 + 3, them) && !isAttacked(board, row * 8 + 2, them)) {
            push(from, row * 8 + 2, piece, null, { flag: "castleQ" });
          }
        }
      }
      continue;
    }

    const dirs = type === "B" ? DIAG : type === "R" ? ORTHO : [...DIAG, ...ORTHO];
    for (const [dr, dc] of dirs) {
      let rr = r + dr;
      let cc = c + dc;
      while (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) {
        const to = rr * 8 + cc;
        const target = board[to];
        if (target === null) {
          if (!capturesOnly) push(from, to, piece, null);
        } else {
          if (colorOf(target) !== us) push(from, to, piece, target);
          break;
        }
        rr += dr;
        cc += dc;
      }
    }
  }
  return moves;
}

const CORNER_RIGHTS = { 63: "K", 56: "Q", 7: "k", 0: "q" };

/** Applies a move in place and returns an undo record. Does not touch `hist`. */
export function makeMove(st, m) {
  const { board } = st;
  const undo = { castle: { ...st.castle }, ep: st.ep, half: st.half, full: st.full, king: { w: st.king.w, b: st.king.b } };
  const us = st.turn;

  board[m.from] = null;
  if (m.flag === "ep") {
    board[m.to + (us === "w" ? 8 : -8)] = null; // the captured pawn sits behind the destination square
  }
  board[m.to] = m.promo ? (us === "w" ? m.promo.toUpperCase() : m.promo) : m.piece;

  if (m.flag === "castleK") {
    board[m.to - 1] = board[m.to + 1];
    board[m.to + 1] = null;
  } else if (m.flag === "castleQ") {
    board[m.to + 1] = board[m.to - 2];
    board[m.to - 2] = null;
  }

  if (m.piece === "K") {
    st.king.w = m.to;
    st.castle.K = st.castle.Q = false;
  } else if (m.piece === "k") {
    st.king.b = m.to;
    st.castle.k = st.castle.q = false;
  }
  if (CORNER_RIGHTS[m.from]) st.castle[CORNER_RIGHTS[m.from]] = false;
  if (CORNER_RIGHTS[m.to]) st.castle[CORNER_RIGHTS[m.to]] = false;

  st.ep = m.flag === "double" ? (m.from + m.to) / 2 : -1;
  st.half = m.piece.toUpperCase() === "P" || m.capture ? 0 : st.half + 1;
  if (us === "b") st.full += 1;
  st.turn = us === "w" ? "b" : "w";
  return undo;
}

export function unmakeMove(st, m, undo) {
  const { board } = st;
  st.turn = st.turn === "w" ? "b" : "w";
  const us = st.turn;
  board[m.from] = m.piece;
  board[m.to] = null;
  if (m.flag === "ep") board[m.to + (us === "w" ? 8 : -8)] = us === "w" ? "p" : "P";
  else if (m.capture) board[m.to] = m.capture;

  if (m.flag === "castleK") {
    board[m.to + 1] = board[m.to - 1];
    board[m.to - 1] = null;
  } else if (m.flag === "castleQ") {
    board[m.to - 2] = board[m.to + 1];
    board[m.to + 1] = null;
  }
  st.castle = undo.castle;
  st.ep = undo.ep;
  st.half = undo.half;
  st.full = undo.full;
  st.king = undo.king;
}

/** Fully legal moves for the side to move. */
export function legalMoves(st) {
  const us = st.turn;
  const them = us === "w" ? "b" : "w";
  const out = [];
  for (const m of pseudoMoves(st)) {
    const u = makeMove(st, m);
    if (!isAttacked(st.board, st.king[us], them)) out.push(m);
    unmakeMove(st, m, u);
  }
  return out;
}

export function perft(st, depth) {
  if (depth === 0) return 1;
  const moves = legalMoves(st);
  if (depth === 1) return moves.length;
  let total = 0;
  for (const m of moves) {
    const u = makeMove(st, m);
    total += perft(st, depth - 1);
    unmakeMove(st, m, u);
  }
  return total;
}

/* ---------------------------------------------------------- playing */

/** Plays a move on a copy and returns the new state (history updated). */
export function play(st, m) {
  const next = cloneState(st);
  makeMove(next, m);
  next.hist.push(positionKey(next));
  return next;
}

/** Finds the legal move matching from/to (and promotion) or null. */
export function findMove(st, from, to, promo) {
  return legalMoves(st).find((m) => m.from === from && m.to === to && (m.promo || undefined) === (promo || undefined)) || null;
}

function insufficientMaterial(board) {
  const minors = [];
  for (let i = 0; i < 64; i += 1) {
    const p = board[i];
    if (!p) continue;
    const t = p.toUpperCase();
    if (t === "K") continue;
    if (t === "P" || t === "R" || t === "Q") return false;
    minors.push({ t, sq: (Math.floor(i / 8) + (i % 8)) % 2, white: isWhite(p) });
  }
  if (minors.length <= 1) return true; // K v K, K+minor v K
  if (minors.every((m) => m.t === "B") && minors.every((m) => m.sq === minors[0].sq)) return true; // bishops all on one colour
  return false;
}

/**
 * Game status for the side to move:
 * { over: false, check } or { over: true, result: "checkmate"|"stalemate"|"fifty"|"repetition"|"insufficient", winner: "w"|"b"|null }
 */
export function status(st) {
  const moves = legalMoves(st);
  const check = inCheck(st);
  if (moves.length === 0) {
    return check ? { over: true, result: "checkmate", winner: st.turn === "w" ? "b" : "w" } : { over: true, result: "stalemate", winner: null };
  }
  if (insufficientMaterial(st.board)) return { over: true, result: "insufficient", winner: null };
  if (st.half >= 100) return { over: true, result: "fifty", winner: null };
  const key = st.hist[st.hist.length - 1];
  if (st.hist.filter((k) => k === key).length >= 3) return { over: true, result: "repetition", winner: null };
  return { over: false, check };
}

/* ------------------------------------------------------------- SAN */

/** Standard algebraic notation for `m` in position `st` (before the move). */
export function toSAN(st, m) {
  let s;
  if (m.flag === "castleK") s = "O-O";
  else if (m.flag === "castleQ") s = "O-O-O";
  else {
    const type = m.piece.toUpperCase();
    const capture = m.capture !== null;
    if (type === "P") {
      s = capture ? FILES[m.from % 8] + "x" + sqName(m.to) : sqName(m.to);
      if (m.promo) s += "=" + m.promo.toUpperCase();
    } else {
      const others = legalMoves(st).filter((o) => o.piece === m.piece && o.to === m.to && o.from !== m.from);
      let dis = "";
      if (others.length) {
        const sameFile = others.some((o) => o.from % 8 === m.from % 8);
        const sameRank = others.some((o) => Math.floor(o.from / 8) === Math.floor(m.from / 8));
        if (!sameFile) dis = FILES[m.from % 8];
        else if (!sameRank) dis = String(8 - Math.floor(m.from / 8));
        else dis = sqName(m.from);
      }
      s = type + dis + (capture ? "x" : "") + sqName(m.to);
    }
  }
  const after = play(st, m);
  const check = inCheck(after);
  if (check) s += legalMoves(after).length === 0 ? "#" : "+";
  return s;
}
