// Runs the chess search off the main thread so the page stays responsive while the computer thinks.
import { chooseMove } from "./ai.js";
import { fromFEN } from "./logic.js";

self.onmessage = (event) => {
  const { id, fen, hist, level } = event.data;
  const st = fromFEN(fen);
  st.hist = hist;
  const move = chooseMove(st, level);
  self.postMessage({ id, move: move ? { from: move.from, to: move.to, promo: move.promo } : null });
};
