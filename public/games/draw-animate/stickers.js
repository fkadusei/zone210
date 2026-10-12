// Draw & Animate: the ready-made stickers (emoji, in their standard colours). `turn` marks the sets whose pictures
// usually face left, so they are mirrored when stamped: then "Turns to face the way it is going" points them the right way.
export const STICKERS = [
  { id: "drawn", name: "Drawn people", icon: "🧑‍🎨", drawn: "people", list: [] }, // hand-drawn figures from people.js, in any skin tone
  { id: "chars", name: "Drawn characters", icon: "🎅", drawn: "characters", list: [] }, // Santa, a wizard, a pirate… drawn the same way
  { id: "beasts", name: "Drawn animals", icon: "🐻", drawn: "animals", list: [] }, // hand-drawn animals (animals.js)
  { id: "walkers", name: "Walking animals", icon: "🐎", drawn: "animals", walk: true, list: [] }, // hand-drawn from the side, facing right: their legs step when they travel
  { id: "people", name: "Emoji people", icon: "🧍", turn: true, list: ["🧍", "🚶", "🏃", "💃", "🕺", "🤸", "⛹️", "🏄", "🚴", "🏊", "🧒", "👧", "👦", "👶", "🧑", "👩", "👨", "👵", "👴", "🧑‍🚀", "🧑‍🚒", "🧑‍🍳", "🧑‍🎨", "🧑‍⚕️", "🦸", "🧙", "🧚", "🧜", "👸", "🤴", "🥷", "🤖"] },
  { id: "story", name: "Emoji characters", icon: "🧙", turn: true, list: ["🎅", "🤶", "🧑‍🎄", "🧝", "🧙", "🧚", "🧜", "🧛", "🧟", "🧞", "🦸", "🦹", "🥷", "👸", "🤴", "🫅", "🤡", "👼", "💂", "🕵️", "👮", "👷", "🧑‍🚀", "☃️", "👻", "👽", "🤖", "🎃", "🦄", "🐉", "🧌", "🦖"] },
  { id: "pets", name: "Pets", icon: "🐶", turn: true, list: ["🐶", "🐕", "🐩", "🐱", "🐈", "🐹", "🐰", "🐇", "🐭", "🐦", "🦜", "🐠", "🐟", "🐢", "🦎", "🐍", "🐴", "🐎", "🐷", "🐮", "🐔", "🐥", "🦆", "🐑"] },
  { id: "wild", name: "Wild animals", icon: "🦁", turn: true, list: ["🦁", "🐯", "🐘", "🦒", "🦓", "🐒", "🐻", "🐼", "🦊", "🐺", "🦌", "🦘", "🐊", "🦈", "🐬", "🐳", "🐙", "🦀", "🦋", "🐝", "🐞", "🦉", "🦅", "🐧", "🦖", "🦕"] },
  { id: "go", name: "Things that go", icon: "🚗", turn: true, list: ["🚗", "🚕", "🚌", "🚓", "🚑", "🚒", "🚚", "🚜", "🚲", "🛴", "🏍️", "🚂", "✈️", "🚁", "🚀", "🛸", "⛵", "🚤", "🚢", "🎈"] },
  { id: "nature", name: "Nature", icon: "🌳", list: ["🌳", "🌲", "🌴", "🌵", "🌻", "🌷", "🌹", "🍄", "☀️", "🌙", "⭐", "☁️", "🌧️", "⛄", "🔥", "🌈", "🍎", "🍌", "🍓", "🥕"] },
  { id: "things", name: "Things", icon: "🏠", list: ["🏠", "🏰", "⛺", "⚽", "🏀", "🎾", "🪁", "🎁", "🎂", "👑", "🎩", "🎸", "🥁", "📚", "✏️", "💡", "❤️", "💎", "🔑", "🕰️"] },
  { id: "faces", name: "Faces", icon: "😀", list: ["😀", "😂", "😍", "😎", "😢", "😡", "😴", "🤔", "😱", "🥳", "👻", "👽", "👀", "👋", "👍", "💬"] },
];

// ---------- how a sticker moves by itself while an animation plays ----------
// An emoji is one picture, so its legs cannot step. Instead each kind gets the movement that suits it: animals and
// people waddle and hop along, birds flap, fish wriggle, cars rumble, boats rock, plants sway, flames flicker.
// Things that do not move in real life (a house, a book, a crown) are left alone.
const KINDS = {
  fly: "🐦 🦜 🦋 🐝 🐞 🦉 🦅 🧚 👼 🐉",
  swim: "🐠 🐟 🦈 🐬 🐳 🐙 🧜 🏊 🏄",
  crawl: "🐍 🦎 🐊 🐢 🦀",
  roll: "🚗 🚕 🚌 🚓 🚑 🚒 🚚 🚜 🚲 🛴 🏍️ 🚂 🚴",
  air: "✈️ 🚁 🚀 🛸",
  float: "🎈 🪁 ☁️ 🌧️ 👻 🧞",
  boat: "⛵ 🚤 🚢",
  sway: "🌳 🌲 🌴 🌵 🌻 🌷 🌹 🍄",
  ball: "⚽ 🏀 🎾",
  glow: "☀️ 🌙 ⭐ 🔥 💡 ❤️ 💎",
  dance: "💃 🕺 🤸 ⛹️ 🥁 🎸",
  wave: "👋 👍",
};
const KIND = new Map();
for (const set of STICKERS) if (["people", "story", "pets", "wild"].includes(set.id)) set.list.forEach((ch) => KIND.set(ch, "walk"));
STICKERS.find((k) => k.id === "faces").list.forEach((ch) => KIND.set(ch, "face"));
for (const [kind, list] of Object.entries(KINDS)) list.split(" ").forEach((ch) => KIND.set(ch, kind));
KIND.delete("🎃"); KIND.delete("💬");

/** Does this sticker move by itself? */
export const stickerMoves = (ch) => KIND.has(ch);
/**
 * How a sticker is shifted, turned and stretched at one moment: { x, y (in sticker heights), r, sx, sy, base }.
 * `base` means it turns about its feet, not its middle. `live` is { t: seconds, go: is it travelling }.
 */
export function stickerLife(ch, live) {
  const kind = KIND.get(ch);
  if (!kind || !live) return null;
  const w = (rate, off = 0) => Math.sin(live.t * Math.PI * 2 * rate + off), m = { x: 0, y: 0, r: 0, sx: 1, sy: 1, base: false };
  if (kind === "walk") { m.base = true; if (live.go) { m.r = 0.08 * w(1.4); m.y = -Math.abs(w(1.4)) * 0.05; } else m.sy = 1 + 0.025 * w(0.5); }
  else if (kind === "fly") { m.sy = 1 - 0.14 * Math.abs(w(3)); m.y = 0.03 * w(0.8); }
  else if (kind === "swim") { m.r = 0.1 * w(1.2); m.sx = 1 - 0.06 * Math.abs(w(1.2, 1)); }
  else if (kind === "crawl") { m.r = 0.05 * w(1.5); m.sx = 1 + 0.045 * w(1.5, 1.5); }
  else if (kind === "roll") { if (live.go) { m.y = 0.012 * w(6); m.r = 0.014 * w(2.3); } else m.y = 0.006 * w(8); }
  else if (kind === "air") { m.y = 0.03 * w(0.9); m.r = 0.035 * w(0.6); m.x = 0.006 * w(7); }
  else if (kind === "float") { m.y = 0.04 * w(0.5); m.r = 0.06 * w(0.35); }
  else if (kind === "boat") { m.base = true; m.r = 0.07 * w(0.45); m.y = 0.015 * w(0.9); }
  else if (kind === "sway") { m.base = true; m.r = 0.045 * w(0.4); }
  else if (kind === "ball") { if (live.go) m.r = live.t * 4; else m.y = -Math.abs(w(0.9)) * 0.06; }
  else if (kind === "glow") m.sx = m.sy = 1 + 0.07 * w(0.8);
  else if (kind === "dance") { m.base = true; m.r = 0.1 * w(1.5); m.y = -Math.abs(w(1.5)) * 0.04; }
  else if (kind === "wave") { m.base = true; m.r = 0.25 * w(1.5); }
  else if (kind === "face") { m.r = 0.07 * w(0.7); m.sy = 1 + 0.02 * w(1.4); }
  return m;
}
