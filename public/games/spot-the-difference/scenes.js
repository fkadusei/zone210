/**
 * Puzzle maker for Spot the Difference. A puzzle is a backdrop with objects scattered over it, and a list of
 * differences made to one copy. Everything comes from a seed, so two friends playing online get the same puzzle.
 * Object codes: f = faces one way (can be flipped), c = colourful (its colour can change).
 */
const THEMES = {
  meadow: { name: "Sunny meadow", items: "🌻c 🌷c 🌼c 🦋c 🐞c 🐝c 🐇f 🐄f 🐑f 🍄c 🐌fc 🐦fc 🐿️f 🦔f 🐓fc 🌸c 🍓c 🐛fc" },
  forest: { name: "In the woods", items: "🦊f 🦉c 🐻 🦌f 🐿️f 🍄c 🍂c 🦔f 🐺f 🐸c 🐌fc 🍓c 🦝f 🪺 🐗f 🌰" },
  village: { name: "Village day", items: "🐕f 🐈f 🚲f 🧺 🐓fc 🚗fc 🐄f 📮c 🌻c 🛒f 🪣c 🎈c 🪁c 🐐f 🛵fc 🥖" },
  sea: { name: "At the beach", items: "🐠fc 🐟fc 🐬f 🦀c 🐚c ⛵fc 🐙c 🦭f 🐢f 🦈f 🐳f ⭐c 🏐c 🪣c 🦩fc 🐡fc" },
  kitchen: { name: "Kitchen", items: "🍎c 🍌c 🥕c 🍞 🧀c 🥚 🍳 🍯c 🫖c 🍇c 🍋c 🍅c 🧁c 🥐 🍰c 🐈f 🥦c 🍉c" },
  castle: { name: "The castle", items: "👑c 🐴f 🛡️c 🐉fc 🦄fc 💎c 🌹c 🦚fc 🗝️ 🏆c 🎺f 📜 🕯️ 🦢f 🪞" },
  night: { name: "Starry night", items: "⭐c 🦉c 🦇f 🏮c 🛸c 🚀f 🪐c 🌟c 🦔f 🐺f 🔭f 🕯️ 🐈f 🦊f 🍄c" },
  bazaar: { name: "Market day", items: "🍉c 🧺 🏺c 🥭c 🍍c 🧵c 🪔c 🍊c 🥥 🐪f 👜c 🧶c 🫖c 🍐c 🌶️c 🥕c 🐓fc" },
  pond: { name: "Duck pond", items: "🦆f 🐸c 🐢f 🐟fc 🪷c 🐞c 🦢f 🐌fc 🦋c 🐊f 🦫f 🐝c 🪲c 🐇f 🌼c" },
  clouds: { name: "Up in the sky", items: "🎈c 🪁c 🦅f ✈️f 🐦fc 🦋c 🕊️f 🌟c 🛩️f 🚁f 🪂c 🌈 ⚡c 🦜fc" },
  winter: { name: "Snowy day", items: "⛄ 🐧f 🦊f 🛷f 🧤c 🧣c 🎄c 🦌f 🏂f ☕c 🎁c 🐻‍❄️ 🦉c 🍪 🔔c" },
  road: { name: "Busy road", items: "🚗fc 🚌fc 🚲f 🚦 🛵fc 🐕f 🚧 🏁 🚜fc 🚑f 🚒f 🚓f 🛴f 🚐fc 🚚fc" },
};
export const THEME_NAMES = Object.fromEntries(Object.entries(THEMES).map(([k, t]) => [k, t.name]));
const parse = (s) => s.split(" ").filter(Boolean).map((t) => { const m = t.match(/^(.*?)([fc]*)$/u); return { e: m[1], f: m[2].includes("f"), c: m[2].includes("c") }; });

export const LEVELS = {
  easy: { label: "Easy", diffs: 3, objects: 10, subtle: false },
  medium: { label: "Medium", diffs: 5, objects: 14, subtle: false },
  hard: { label: "Hard", diffs: 7, objects: 18, subtle: true },
};

export function seeded(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/**
 * makePuzzle(seed, level) -> { theme, name, base: [obj], other: [obj], diffs: [{ x, y, r, kind }] }
 * obj: { e, x, y, s, flip?, hue?, scale? } with x, y in % of the picture and s the size in % of its width.
 */
export function makePuzzle(seed, levelKey) {
  const rnd = seeded(seed);
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  const level = LEVELS[levelKey] || LEVELS.medium;
  const themeKey = pick(Object.keys(THEMES));
  const pool = parse(THEMES[themeKey].items);
  // spread the objects over a jittered grid so they never sit on top of each other
  const n = level.objects;
  const cols = Math.ceil(Math.sqrt(n * 1.7)), rows = Math.ceil(n / cols);
  // (a Fisher-Yates shuffle: the same in every browser, so online friends get the same puzzle)
  const all = Array.from({ length: cols * rows }, (_, i) => i);
  for (let i = all.length - 1; i > 0; i -= 1) { const j = Math.floor(rnd() * (i + 1)); [all[i], all[j]] = [all[j], all[i]]; }
  const cells = all.slice(0, n);
  const base = cells.map((c) => {
    const it = pick(pool);
    const s = level.subtle ? 7 + rnd() * 5 : 8 + rnd() * 6;
    return {
      e: it.e, f: it.f, c: it.c, s,
      x: ((c % cols) + 0.5 + (rnd() - 0.5) * 0.45) * (100 / cols) * 0.9 + 5,
      y: (Math.floor(c / cols) + 0.5 + (rnd() - 0.5) * 0.35) * (100 / rows) * 0.84 + 9,
    };
  });
  const other = base.map((o) => ({ ...o }));
  const diffs = [];
  const used = new Set();
  const kinds = level.subtle ? ["missing", "color", "swap", "flip", "size", "move", "extra"] : ["missing", "color", "swap", "flip", "size", "extra"];
  for (let guard = 0; diffs.length < level.diffs && guard < 200; guard += 1) {
    const kind = pick(kinds);
    if (kind === "extra") {
      // something new appears in a gap, away from everything else
      let spot = null;
      for (let t = 0; t < 40 && !spot; t += 1) {
        const x = 10 + rnd() * 80, y = 14 + rnd() * 72;
        if (base.every((o) => Math.hypot(o.x - x, (o.y - y) * 0.56) > o.s * 0.9 + 6) && diffs.every((d) => Math.hypot(d.x - x, (d.y - y) * 0.56) > 12)) spot = { x, y };
      }
      if (!spot) continue;
      const it = pick(pool), s = level.subtle ? 7 : 9;
      other.push({ e: it.e, x: spot.x, y: spot.y, s, extra: true });
      diffs.push({ x: spot.x, y: spot.y, r: s, kind });
      continue;
    }
    const i = Math.floor(rnd() * base.length);
    if (used.has(i)) continue;
    const o = other[i], b = base[i];
    if (kind === "color" && !b.c) continue;
    if (kind === "flip" && !b.f) continue;
    if (kind === "missing") o.gone = true;
    else if (kind === "color") o.hue = 110 + Math.floor(rnd() * 140);
    else if (kind === "swap") { const alt = pool.filter((p) => p.e !== b.e); if (!alt.length) continue; o.e = pick(alt).e; }
    else if (kind === "flip") o.flip = true;
    else if (kind === "size") o.scale = level.subtle ? (rnd() < 0.5 ? 0.72 : 1.32) : (rnd() < 0.5 ? 0.6 : 1.5);
    else if (kind === "move") { o.x = Math.min(92, Math.max(8, b.x + (rnd() < 0.5 ? -1 : 1) * (6 + rnd() * 4))); o.y = Math.min(90, Math.max(12, b.y + (rnd() - 0.5) * 8)); }
    used.add(i);
    diffs.push({ x: (b.x + o.x) / 2, y: (b.y + o.y) / 2, r: Math.max(b.s, o.s * (o.scale || 1)) * (kind === "move" ? 1.2 : 0.8), kind, i });
  }
  // the changed copy is on the left or the right, so you can't just study one side
  const flipSides = rnd() < 0.5;
  return { theme: themeKey, name: THEMES[themeKey].name, left: flipSides ? other : base, right: flipSides ? base : other, diffs };
}
