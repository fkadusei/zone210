import { startCardGame } from "../../assets/cards-game.js";
import * as rules from "./logic.js";
import { SUITS, SUIT_NAMES, RANKS, suitOf, rankOf, cardName } from "./logic.js";

const face = (id) => {
  const r = RANKS[rankOf(id) - 1];
  const g = SUITS[suitOf(id)];
  return {
    cls: `${suitOf(id) === 1 || suitOf(id) === 2 ? "red" : "blk"}${rankOf(id) === 8 ? " wild" : ""}`,
    html: `<span class="rk">${r}</span><span class="st">${g}</span><span class="mid">${g}</span><span class="rk r2">${r}</span><span class="st s2">${g}</span>`,
    label: cardName(id),
  };
};

startCardGame({
  key: "zone210_crazy_eights_settings",
  prefix: "zone210-crazy8-",
  rules,
  face,
  sortKey: (id) => suitOf(id) * 20 + rankOf(id),
  callWord: "suit",
  drawLabel: () => "Draw a card",
  badges: (s) => [{ text: `Play ${SUITS[s.suit]} ${SUIT_NAMES[s.suit]} or a ${RANKS[s.rank - 1]}`, cls: "" }],
});
