/**
 * Home Life data: the two homes (a modern city apartment or a suburban family house), furniture, jobs and actions.
 * The house is a grid of 20 x 14 tiles. Rooms are rectangles carved out of solid wall; doors are single tiles.
 */
export const COLS = 20;
export const ROWS = 14;

// floor types: drawing colours and whether people can walk there
export const FLOORS = {
  "#": { walk: false },
  w: { walk: true, a: "#c99a63", b: "#b8874f" }, // wooden floor
  o: { walk: true, a: "#d8b07a", b: "#c99e66" }, // light oak
  t: { walk: true, a: "#e6e9ef", b: "#d6dae3" }, // kitchen tiles
  b: { walk: true, a: "#cfe6f2", b: "#b7d6e8" }, // bathroom tiles
  c: { walk: true, a: "#c9c2b6", b: "#bdb5a8" }, // concrete courtyard
  k: { walk: true, a: "#b9a48a", b: "#ab967b" }, // stone floor
  g: { walk: true, a: "#79c05f", b: "#6cb153" }, // grass
  s: { walk: true, a: "#9a9aa6", b: "#8d8d99" }, // pavement outside
  D: { walk: true, a: "#8a6a48", b: "#8a6a48" }, // doorway
};

function carve(rooms, doors, extra = []) {
  const g = Array.from({ length: ROWS }, () => new Array(COLS).fill("#"));
  rooms.forEach(([x, y, w, h, f]) => { for (let j = y; j < y + h; j += 1) for (let i = x; i < x + w; i += 1) g[j][i] = f; });
  extra.forEach(([x, y, f]) => { g[y][x] = f; });
  doors.forEach(([x, y]) => { g[y][x] = "D"; });
  return g;
}

export const SETTINGS = {
  city: {
    name: "Modern city apartment",
    blurb: "A bright apartment with an open kitchen, two bedrooms and a city view.",
    money: 2200,
    bills: 90,
    grid: carve(
      [[1, 1, 6, 4, "t"], [1, 5, 11, 7, "o"], [8, 1, 4, 3, "b"], [13, 1, 6, 5, "w"], [13, 7, 6, 5, "w"]],
      [[9, 4], [12, 5], [12, 9], [6, 12]],
      [[0, 13, "s"], ...Array.from({ length: COLS }, (_, i) => [i, 13, "s"])],
    ),
    exit: [6, 13],
    furniture: [
      ["fridge", 1, 1], ["counter", 2, 1], ["stove", 4, 1], ["sink", 5, 1], ["table", 2, 3], ["chair", 1, 3], ["chair", 4, 3],
      ["sofa", 2, 7], ["rug", 2, 9], ["tv", 2, 11], ["bookshelf", 8, 5], ["computer", 9, 11], ["plant", 11, 11], ["radio", 7, 11],
      ["toilet", 8, 1], ["bsink", 9, 1], ["shower", 11, 1],
      ["dbed", 14, 1], ["wardrobe", 17, 1], ["lamp", 16, 1],
      ["bed", 15, 7], ["bed", 17, 7], ["desk", 14, 11], ["plant", 18, 11],
    ],
    jobs: ["office", "nurse", "developer", "cashier", "teacher", "driver"],
  },
  suburb: {
    name: "Suburban family house",
    blurb: "A family house with three bedrooms, a big kitchen and a front lawn with a barbecue and an apple tree.",
    money: 2000,
    bills: 70,
    grid: carve(
      [[1, 1, 6, 4, "w"], [8, 1, 5, 4, "w"], [14, 1, 5, 4, "b"], [1, 6, 9, 4, "o"], [11, 6, 8, 4, "t"], [1, 11, 18, 2, "g"]],
      [[3, 5], [9, 5], [15, 5], [10, 7], [5, 10]],
      Array.from({ length: COLS }, (_, i) => [i, 13, "s"]),
    ),
    exit: [5, 13],
    furniture: [
      ["dbed", 1, 1], ["lamp", 3, 1], ["wardrobe", 6, 1],
      ["bed", 8, 1], ["desk", 10, 1], ["bed", 12, 1],
      ["toilet", 14, 1], ["bsink", 16, 1], ["shower", 18, 1],
      ["bookshelf", 1, 6], ["tv", 6, 6], ["sofa", 6, 8], ["computer", 2, 9], ["radio", 1, 9], ["plant", 9, 9],
      ["fridge", 12, 6], ["counter", 13, 6], ["stove", 16, 6], ["sink", 17, 6], ["table", 13, 8], ["chair", 12, 8], ["chair", 15, 8],
      ["grill", 2, 11], ["pchair", 6, 11], ["ptable", 7, 11], ["pchair", 9, 11], ["goal", 11, 12], ["apple", 14, 11], ["bench", 16, 11], ["plant", 18, 12],
    ],
    jobs: ["office", "nurse", "teacher", "chef", "mechanic", "artist"],
  },
};

/**
 * Furniture. w/h in tiles; walk = people can walk over it (rugs); acts = what people can do with it;
 * where: "both" | "city" | "suburb" (what the shop sells in each home).
 */
export const ITEMS = {
  bed: { name: "Single bed", cat: "Bedroom", w: 1, h: 2, price: 300, acts: ["sleep", "nap"], where: "both" },
  dbed: { name: "Double bed", cat: "Bedroom", w: 2, h: 2, price: 650, acts: ["sleep", "nap"], where: "both" },
  wardrobe: { name: "Wardrobe", cat: "Bedroom", w: 1, h: 1, price: 220, acts: ["dress"], where: "both" },
  lamp: { name: "Bedside lamp", cat: "Decor", w: 1, h: 1, price: 60, acts: [], where: "both" },
  desk: { name: "Study desk", cat: "Study", w: 2, h: 1, price: 180, acts: ["homework", "study"], where: "both" },
  bookshelf: { name: "Bookshelf", cat: "Study", w: 1, h: 1, price: 160, acts: ["read"], where: "both" },
  computer: { name: "Computer desk", cat: "Study", w: 2, h: 1, price: 750, acts: ["game", "homework", "jobsearch"], where: "both" },
  sofa: { name: "Sofa", cat: "Living", w: 3, h: 1, price: 420, acts: ["relax", "nap"], where: "both" },
  tv: { name: "Television", cat: "Living", w: 3, h: 1, price: 520, acts: ["tv"], where: "both" },
  radio: { name: "Radio", cat: "Living", w: 1, h: 1, price: 120, acts: ["dance", "music"], where: "both" },
  rug: { name: "Rug", cat: "Decor", w: 3, h: 2, price: 90, acts: [], walk: true, where: "both" },
  plant: { name: "Potted plant", cat: "Decor", w: 1, h: 1, price: 45, acts: ["water"], where: "both" },
  painting: { name: "Painting", cat: "Decor", w: 1, h: 1, price: 80, acts: ["admire"], where: "both" },
  fishtank: { name: "Fish tank", cat: "Fun", w: 2, h: 1, price: 280, acts: ["fish"], where: "both" },
  console: { name: "Game console", cat: "Fun", w: 1, h: 1, price: 420, acts: ["game"], where: "both" },
  keyboard: { name: "Keyboard piano", cat: "Fun", w: 2, h: 1, price: 650, acts: ["piano"], where: "both" },
  weights: { name: "Exercise set", cat: "Fun", w: 2, h: 1, price: 300, acts: ["workout"], where: "both" },
  goal: { name: "Football goal", cat: "Fun", w: 2, h: 1, price: 200, acts: ["football"], where: "both" },
  fridge: { name: "Fridge", cat: "Kitchen", w: 1, h: 1, price: 480, acts: ["snack", "cook"], where: "both" },
  counter: { name: "Kitchen counter", cat: "Kitchen", w: 2, h: 1, price: 200, acts: [], where: "both" },
  stove: { name: "Cooker", cat: "Kitchen", w: 1, h: 1, price: 380, acts: ["cook"], where: "both" },
  sink: { name: "Kitchen sink", cat: "Kitchen", w: 1, h: 1, price: 150, acts: ["dishes"], where: "both" },
  table: { name: "Dining table", cat: "Kitchen", w: 2, h: 1, price: 220, acts: [], where: "both" },
  chair: { name: "Dining chair", cat: "Kitchen", w: 1, h: 1, price: 55, acts: [], where: "both" },
  ptable: { name: "Patio table", cat: "Outdoor", w: 2, h: 1, price: 90, acts: [], where: "suburb" },
  pchair: { name: "Patio chair", cat: "Outdoor", w: 1, h: 1, price: 25, acts: ["relax"], where: "suburb" },
  grill: { name: "Barbecue grill", cat: "Outdoor", w: 1, h: 1, price: 250, acts: ["cook"], where: "suburb" },
  apple: { name: "Apple tree", cat: "Outdoor", w: 2, h: 2, price: 120, acts: ["pick", "shade"], where: "suburb" },
  bench: { name: "Garden bench", cat: "Outdoor", w: 2, h: 1, price: 75, acts: ["relax"], where: "suburb" },
  line: { name: "Clothes line", cat: "Outdoor", w: 3, h: 1, price: 30, acts: ["laundry"], where: "suburb" },
  toilet: { name: "Toilet", cat: "Bathroom", w: 1, h: 1, price: 260, acts: ["toilet"], where: "both" },
  bsink: { name: "Bathroom sink", cat: "Bathroom", w: 1, h: 1, price: 140, acts: ["wash"], where: "both" },
  shower: { name: "Shower", cat: "Bathroom", w: 1, h: 1, price: 420, acts: ["shower"], where: "both" },
};

export const NEEDS = ["hunger", "energy", "fun", "hygiene", "social", "bladder"];
export const NEED_LABEL = { hunger: "Hunger", energy: "Energy", fun: "Fun", hygiene: "Hygiene", social: "Social", bladder: "Bladder" };
export const NEED_ICON = { hunger: "🍲", energy: "😴", fun: "🎉", hygiene: "🛁", social: "💬", bladder: "🚽" };
// how fast each need drops per game minute while awake at home
export const DECAY = { hunger: 0.075, energy: 0.06, fun: 0.07, hygiene: 0.05, social: 0.045, bladder: 0.11 };

/**
 * Actions. need: per-minute change while doing it; mins: how long (or until the need is full when `fill`);
 * label: shown in menus; kids/adults: who can do it; on: "self" means no furniture needed.
 */
export const ACTIONS = {
  sleep: { label: "Sleep", icon: "😴", need: { energy: 0.24 }, fill: "energy", mins: 600, lie: true, quiet: true },
  nap: { label: "Take a nap", icon: "💤", need: { energy: 0.2 }, mins: 90, lie: true },
  cook: { label: "Cook a meal", icon: "🍳", need: { hunger: 0 }, mins: 30, then: "eatmeal", skill: "cooking" },
  eatmeal: { label: "Eat the meal", icon: "🍲", need: { hunger: 3.2, fun: 0.1 }, mins: 20, hidden: true },
  snack: { label: "Grab a snack", icon: "🍌", need: { hunger: 2.2 }, mins: 10 },
  dishes: { label: "Wash the dishes", icon: "🧽", need: { fun: -0.05, hygiene: -0.05 }, mins: 20, chore: true },
  shower: { label: "Take a bath", icon: "🚿", need: { hygiene: 4.5 }, mins: 22, hidden_person: true },
  wash: { label: "Wash hands and face", icon: "🫧", need: { hygiene: 1.6 }, mins: 8 },
  toilet: { label: "Use the toilet", icon: "🚽", need: { bladder: 12 }, mins: 8, hidden_person: true },
  tv: { label: "Watch TV", icon: "📺", need: { fun: 0.7, energy: 0.02 }, mins: 90, sit: true },
  relax: { label: "Sit and relax", icon: "🛋️", need: { energy: 0.08, fun: 0.18 }, mins: 45, sit: true },
  dance: { label: "Dance to music", icon: "💃", need: { fun: 1.0, energy: -0.12, hygiene: -0.05 }, mins: 40, skill: "fitness" },
  music: { label: "Listen to music", icon: "🎵", need: { fun: 0.55 }, mins: 45 },
  read: { label: "Read a book", icon: "📖", need: { fun: 0.4 }, mins: 60, skill: "logic" },
  study: { label: "Study", icon: "✏️", need: { fun: -0.05 }, mins: 60, skill: "logic", adults: true },
  homework: { label: "Do homework", icon: "📝", need: { fun: -0.05 }, mins: 50, kids: true, homework: true },
  game: { label: "Play video games", icon: "🎮", need: { fun: 1.1, energy: -0.03 }, mins: 60 },
  jobsearch: { label: "Look for a job", icon: "💼", need: { fun: -0.02 }, mins: 30, adults: true, jobsearch: true },
  fish: { label: "Watch the fish", icon: "🐠", need: { fun: 0.5, energy: 0.03 }, mins: 30 },
  piano: { label: "Play the piano", icon: "🎹", need: { fun: 0.9 }, mins: 45, skill: "music" },
  workout: { label: "Work out", icon: "🏋", need: { fun: 0.3, energy: -0.2, hygiene: -0.2 }, mins: 45, skill: "fitness" },
  football: { label: "Play football", icon: "⚽", need: { fun: 1.2, energy: -0.25, hygiene: -0.15, social: 0.2 }, mins: 50, skill: "fitness" },
  pick: { label: "Pick apples", icon: "🍎", need: { fun: 0.3 }, mins: 15, mango: true },
  shade: { label: "Rest in the shade", icon: "🌳", need: { energy: 0.12, fun: 0.25 }, mins: 40 },
  laundry: { label: "Hang the laundry", icon: "👕", need: { fun: -0.04 }, mins: 25, chore: true },
  water: { label: "Water the plant", icon: "💧", need: { fun: 0.25 }, mins: 6 },
  admire: { label: "Admire the painting", icon: "🖼️", need: { fun: 0.3 }, mins: 6 },
  dress: { label: "Change clothes", icon: "👔", need: { fun: 0.2 }, mins: 6, dress: true },
  chat: { label: "Chat", icon: "💬", need: { social: 0.9, fun: 0.25 }, mins: 40, self: true },
  phone: { label: "Call a friend", icon: "📱", need: { social: 0.45, fun: 0.1 }, mins: 20, self: true },
  findwork: { label: "Look for work", icon: "💼", need: { fun: -0.02 }, mins: 40, self: true, adults: true, jobsearch: true },
};

/** Jobs: hours (24h), working days (Mon-Fri), titles and daily pay for each level. */
export const JOBS = {
  office: { name: "Office", start: 9, end: 17, titles: ["Office assistant", "Administrator", "Team lead", "Office manager"], pay: [160, 220, 300, 420] },
  nurse: { name: "Nurse", start: 7, end: 15, titles: ["Nursing assistant", "Nurse", "Senior nurse", "Head nurse"], pay: [150, 210, 290, 380] },
  developer: { name: "Software developer", start: 9, end: 17, titles: ["Junior developer", "Developer", "Senior developer", "Tech lead"], pay: [200, 300, 420, 600] },
  cashier: { name: "Supermarket", start: 10, end: 18, titles: ["Cashier", "Shift lead", "Supervisor", "Store manager"], pay: [110, 150, 210, 300] },
  teacher: { name: "Teacher", start: 7, end: 14, titles: ["Teaching assistant", "Teacher", "Head of year", "Head teacher"], pay: [130, 180, 240, 320] },
  driver: { name: "Taxi driver", start: 6, end: 14, titles: ["Learner driver", "Driver", "Senior driver", "Fleet owner"], pay: [120, 170, 230, 340] },
  chef: { name: "Chef", start: 10, end: 18, titles: ["Kitchen helper", "Line cook", "Sous chef", "Head chef"], pay: [120, 170, 240, 340] },
  mechanic: { name: "Mechanic", start: 8, end: 16, titles: ["Apprentice", "Mechanic", "Senior mechanic", "Garage owner"], pay: [110, 160, 230, 320] },
  artist: { name: "Artist", start: 9, end: 17, titles: ["Art student", "Illustrator", "Designer", "Creative director"], pay: [100, 160, 250, 380] },
};
export const SCHOOL = { start: 7.5, end: 14 };
export const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export const SKINS = ["#fbe0c8", "#eec3a0", "#d9a273", "#c68642", "#9c6436", "#6b3e1f", "#3a1f0d"]; // light to dark: every family can look like itself
export const HAIRS = ["short", "afro", "puffs", "braids", "bun", "bald"];
export const OUTFITS = ["#e5484d", "#3b82f6", "#2fb36d", "#f5a623", "#8a5ce0", "#ec6aa0", "#14b8a6", "#f2f2f2"];
export const NAMES = { adult: ["Alex", "Maya", "Sam", "Leo", "Zara", "Omar", "Mei", "Lucas", "Priya", "Noah", "Aisha", "Kofi", "Ama", "Elena", "Ravi", "Sofia"], child: ["Kai", "Lily", "Ben", "Nia", "Mateo", "Hana", "Finn", "Amara", "Yuki", "Ezra"] };
