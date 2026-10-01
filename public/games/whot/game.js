import { startCardGame } from "../../assets/cards-game.js";
import * as rules from "./logic.js";
import { SHAPES, shapeOf, numOf, isWhot, cardName } from "./logic.js";

const CAPTION = { 1: "HOLD ON", 2: "PICK TWO", 5: "PICK THREE", 8: "SUSPENSION", 14: "MARKET" };

const face = (id) => {
  if (isWhot(id)) return { cls: "whot", html: `<span class="rk">20</span><span class="wt">WHOT</span><span class="rk r2">20</span>`, label: cardName(id) };
  const n = numOf(id);
  const s = shapeOf(id);
  return {
    cls: `s${s}`,
    html: `<span class="rk">${n}</span><span class="shp sm s${s}"></span><span class="shp big s${s}"></span>${CAPTION[n] ? `<span class="cap">${CAPTION[n]}</span>` : ""}<span class="rk r2">${n}</span>`,
    label: cardName(id),
  };
};

startCardGame({
  key: "zone210_whot_settings",
  prefix: "zone210-whot-",
  rules,
  face,
  sortKey: (id) => (isWhot(id) ? 999 : shapeOf(id) * 20 + numOf(id)),
  callWord: "shape",
  drawLabel: (s) => (s && s.pend > 0 ? `Pick ${s.pend}` : "Go to market"),
  badges: (s) => [
    { text: `Shape: ${SHAPES[s.shape]}`, cls: "" },
    ...(s.pend > 0 ? [{ text: `Penalty: pick ${s.pend}`, cls: "warn" }] : []),
  ],
});
