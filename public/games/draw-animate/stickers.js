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
