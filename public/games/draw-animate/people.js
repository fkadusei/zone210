// Draw & Animate: hand-drawn people. Each is a simple cartoon figure drawn by drawPerson() from a few choices:
// a pose, a hairstyle, clothes, and (chosen by the child) one of six skin tones and a hair colour.
// A person on a drawing is stored as { fig: id, sk: skin index, hc: hair index or -1 for the figure's own, w: height, p: [x, y] },
// with tc and bc (top and bottom clothing colours) when the child chose their own.
// Figures that move (walking, running, the wheelchair) are drawn facing right.

import { ANIMALS, drawAnimal } from "./animals.js";
export { ANIMALS };

export const SKINS = [["#ffe0bd", "Light"], ["#f6cfa0", "Light medium"], ["#e0ac69", "Medium"], ["#c68642", "Medium deep"], ["#8d5524", "Deep"], ["#5a3620", "Very deep"]];
export const HAIRS = [["#1f1b1a", "Black"], ["#4a2f1d", "Dark brown"], ["#8b5a2b", "Brown"], ["#e2b653", "Blonde"], ["#c0562a", "Red"], ["#b9bcc2", "Grey"]];

// pose: where the hands, elbows, knees and feet are, for a figure one unit tall with its middle at (0, 0)
const P = {
  stand: { ha: [-0.2, 0.1], ea: [-0.19, -0.04], hb: [0.2, 0.1], eb: [0.19, -0.04], ka: [-0.07, 0.3], fa: [-0.07, 0.46], kb: [0.07, 0.3], fb: [0.07, 0.46] },
  wave: { ha: [-0.2, 0.1], ea: [-0.19, -0.04], hb: [0.27, -0.42], eb: [0.25, -0.2], ka: [-0.07, 0.3], fa: [-0.07, 0.46], kb: [0.07, 0.3], fb: [0.07, 0.46] },
  walk: { ha: [0.13, 0.08], ea: [0.02, -0.03], hb: [-0.17, 0.06], eb: [-0.14, -0.05], ka: [-0.07, 0.3], fa: [-0.15, 0.45], kb: [0.09, 0.29], fb: [0.15, 0.45] },
  run: { ha: [0.26, -0.15], ea: [0.15, -0.03], hb: [-0.25, 0.07], eb: [-0.19, -0.05], ka: [-0.1, 0.3], fa: [-0.27, 0.31], kb: [0.15, 0.25], fb: [0.2, 0.45] },
  jump: { ha: [-0.27, -0.42], ea: [-0.24, -0.22], hb: [0.27, -0.42], eb: [0.24, -0.22], ka: [-0.13, 0.27], fa: [-0.2, 0.39], kb: [0.13, 0.27], fb: [0.2, 0.39] },
  dance: { ha: [-0.29, -0.1], ea: [-0.2, -0.14], hb: [0.24, -0.44], eb: [0.24, -0.22], ka: [-0.08, 0.3], fa: [-0.08, 0.46], kb: [0.15, 0.25], fb: [0.27, 0.34] },
  cheer: { ha: [-0.22, -0.46], ea: [-0.2, -0.26], hb: [0.22, -0.46], eb: [0.2, -0.26], ka: [-0.07, 0.3], fa: [-0.07, 0.46], kb: [0.07, 0.3], fb: [0.07, 0.46] },
  point: { ha: [-0.2, 0.1], ea: [-0.19, -0.04], hb: [0.35, -0.22], eb: [0.22, -0.16], ka: [-0.07, 0.3], fa: [-0.07, 0.46], kb: [0.07, 0.3], fb: [0.07, 0.46] },
  hips: { ha: [-0.13, 0.06], ea: [-0.25, -0.05], hb: [0.13, 0.06], eb: [0.25, -0.05], ka: [-0.08, 0.3], fa: [-0.09, 0.46], kb: [0.08, 0.3], fb: [0.09, 0.46] },
  kick: { ha: [-0.25, -0.02], ea: [-0.19, -0.09], hb: [0.2, 0.05], eb: [0.18, -0.06], ka: [-0.06, 0.3], fa: [-0.06, 0.46], kb: [0.14, 0.24], fb: [0.3, 0.3] },
  star: { ha: [-0.35, -0.2], ea: [-0.22, -0.18], hb: [0.35, -0.2], eb: [0.22, -0.18], ka: [-0.12, 0.3], fa: [-0.2, 0.46], kb: [0.12, 0.3], fb: [0.2, 0.46] },
  sit: { ha: [-0.17, 0.15], ea: [-0.2, 0.0], hb: [0.16, 0.05], eb: [0.2, -0.05], ka: [0.2, 0.1], fa: [0.38, 0.12], kb: [0.2, 0.14], fb: [0.38, 0.17] },
  think: { ha: [0.09, -0.03], ea: [-0.15, -0.02], hb: [0.07, -0.21], eb: [0.21, -0.09], ka: [-0.07, 0.3], fa: [-0.07, 0.46], kb: [0.07, 0.3], fb: [0.07, 0.46] },
  clap: { ha: [-0.03, -0.03], ea: [-0.18, -0.02], hb: [0.03, -0.03], eb: [0.18, -0.02], ka: [-0.07, 0.3], fa: [-0.07, 0.46], kb: [0.07, 0.3], fb: [0.07, 0.46] },
  open: { ha: [-0.36, -0.12], ea: [-0.22, -0.13], hb: [0.36, -0.12], eb: [0.22, -0.13], ka: [-0.07, 0.3], fa: [-0.08, 0.46], kb: [0.07, 0.3], fb: [0.08, 0.46] },
  throw: { ha: [-0.26, 0.0], ea: [-0.2, -0.08], hb: [0.3, -0.42], eb: [0.23, -0.2], ka: [-0.1, 0.3], fa: [-0.16, 0.46], kb: [0.1, 0.3], fb: [0.16, 0.46] },
  skip: { ha: [-0.26, -0.3], ea: [-0.2, -0.12], hb: [0.22, 0.05], eb: [0.19, -0.05], ka: [-0.05, 0.3], fa: [-0.05, 0.46], kb: [0.15, 0.22], fb: [0.1, 0.37] },
  reach: { ha: [0.3, -0.1], ea: [0.14, -0.12], hb: [0.33, -0.19], eb: [0.18, -0.17], ka: [-0.08, 0.3], fa: [-0.12, 0.46], kb: [0.08, 0.3], fb: [0.12, 0.46] },
  carry: { ha: [-0.2, 0.1], ea: [-0.19, -0.04], hb: [0.2, -0.02], eb: [0.21, -0.05], ka: [-0.07, 0.3], fa: [-0.07, 0.46], kb: [0.07, 0.3], fb: [0.07, 0.46] },
  hold: { ha: [-0.2, 0.1], ea: [-0.19, -0.04], hb: [0.22, -0.16], eb: [0.23, -0.06], ka: [-0.07, 0.3], fa: [-0.07, 0.46], kb: [0.07, 0.3], fb: [0.07, 0.46] },
  chair: { ha: [0.02, 0.14], ea: [-0.12, 0.0], hb: [0.2, -0.02], eb: [0.14, -0.08], ka: [0.17, 0.14], fa: [0.2, 0.38], kb: [0.17, 0.14], fb: [0.2, 0.38], chair: true },
  chairwave: { ha: [0.02, 0.14], ea: [-0.12, 0.0], hb: [0.27, -0.42], eb: [0.25, -0.2], ka: [0.17, 0.14], fa: [0.2, 0.38], kb: [0.17, 0.14], fb: [0.2, 0.38], chair: true },
};
// hair: 0 black, 1 dark brown, 2 brown, 3 blonde, 4 red, 5 grey.  bottom: "long" trousers, "short" shorts, "skirt"
export const PEOPLE = [
  { id: "stand1", name: "Standing", pose: "stand", hair: "short", hc: 1, top: "#3b82f6", bot: "#374151", kind: "long" },
  { id: "wave1", name: "Waving", pose: "wave", hair: "long", hc: 0, top: "#ec6aa0", bot: "#8a5ce0", kind: "skirt" },
  { id: "walk1", name: "Walking", pose: "walk", hair: "curly", hc: 0, top: "#2fb36d", bot: "#1f2937", kind: "long" },
  { id: "run1", name: "Running", pose: "run", hair: "bunches", hc: 2, top: "#f5d90a", bot: "#e5484d", kind: "short" },
  { id: "jump1", name: "Jumping", pose: "jump", hair: "short", hc: 4, top: "#e5484d", bot: "#3b82f6", kind: "short" },
  { id: "dance1", name: "Dancing", pose: "dance", hair: "long", hc: 3, top: "#8a5ce0", bot: "#8a5ce0", kind: "skirt" },
  { id: "run2", name: "Running, curly hair", pose: "run", hair: "curly", hc: 1, top: "#f5a623", bot: "#1f2937", kind: "short" },
  { id: "jump2", name: "Jumping, braids", pose: "jump", hair: "braids", hc: 0, top: "#14b8a6", bot: "#ec6aa0", kind: "skirt" },
  { id: "wave2", name: "Waving, headscarf", pose: "wave", hair: "scarf", hc: 0, top: "#a78bfa", bot: "#4b5563", kind: "skirt", scarf: "#0d9488" },
  { id: "walk2", name: "Walking, cap", pose: "walk", hair: "cap", hc: 2, top: "#f97316", bot: "#3b82f6", kind: "long", cap: "#e5484d" },
  { id: "chair1", name: "Wheelchair user", pose: "chair", hair: "short", hc: 0, top: "#2fb36d", bot: "#374151", kind: "long" },
  { id: "chair2", name: "Wheelchair user, waving", pose: "chairwave", hair: "long", hc: 2, top: "#f5d90a", bot: "#8a5ce0", kind: "long" },
  { id: "gran", name: "Grandma", pose: "wave", hair: "bun", hc: 5, top: "#14b8a6", bot: "#6b7280", kind: "skirt", specs: true },
  { id: "grandad", name: "Grandad", pose: "stand", hair: "thin", hc: 5, top: "#b45309", bot: "#374151", kind: "long", specs: true },
  { id: "dance2", name: "Dancing, curly hair", pose: "dance", hair: "curly", hc: 0, top: "#e5484d", bot: "#f5d90a", kind: "long" },
  { id: "stand2", name: "Standing, bunches", pose: "stand", hair: "bunches", hc: 3, top: "#ec6aa0", bot: "#3b82f6", kind: "short" },
  { id: "cheer1", name: "Cheering, ponytail", pose: "cheer", hair: "ponytail", hc: 2, top: "#f5a623", bot: "#3b82f6", kind: "long" },
  { id: "point1", name: "Pointing", pose: "point", hair: "short", hc: 0, top: "#14b8a6", bot: "#374151", kind: "long" },
  { id: "hips1", name: "Hands on hips, puffs", pose: "hips", hair: "puffs", hc: 0, top: "#f5d90a", bot: "#ec6aa0", kind: "skirt" },
  { id: "kick1", name: "Kicking a ball", pose: "kick", hair: "short", hc: 1, top: "#e5484d", bot: "#1f2937", kind: "short", ball: true },
  { id: "star1", name: "Star jump", pose: "star", hair: "bob", hc: 4, top: "#3b82f6", bot: "#8a5ce0", kind: "short" },
  { id: "sit1", name: "Sitting", pose: "sit", hair: "curly", hc: 1, top: "#2fb36d", bot: "#3b82f6", kind: "long" },
  { id: "think1", name: "Thinking", pose: "think", hair: "bob", hc: 0, top: "#8a5ce0", bot: "#374151", kind: "long", specs: true },
  { id: "turban1", name: "Waving, turban", pose: "wave", hair: "turban", hc: 0, top: "#f97316", bot: "#374151", kind: "long", scarf: "#2563eb", beard: true },
  { id: "dad", name: "Hands on hips, beard", pose: "hips", hair: "short", hc: 1, top: "#0d9488", bot: "#374151", kind: "long", beard: true },
  { id: "locs1", name: "Walking, locs", pose: "walk", hair: "locs", hc: 0, top: "#ec6aa0", bot: "#1f2937", kind: "long" },
  { id: "cane1", name: "Walking with a white cane", pose: "walk", hair: "bob", hc: 2, top: "#3b82f6", bot: "#6b7280", kind: "long", cane: true },
  { id: "cheer2", name: "Cheering, headscarf", pose: "cheer", hair: "scarf", hc: 0, top: "#f5d90a", bot: "#8a5ce0", kind: "skirt", scarf: "#be185d" },
  { id: "kick2", name: "Kicking a ball, ponytail", pose: "kick", hair: "ponytail", hc: 3, top: "#2fb36d", bot: "#f97316", kind: "short", ball: true },
  { id: "sit2", name: "Sitting, bunches", pose: "sit", hair: "bunches", hc: 2, top: "#a78bfa", bot: "#f5a623", kind: "short" },
  { id: "dance3", name: "Dancing, puffs", pose: "dance", hair: "puffs", hc: 1, top: "#14b8a6", bot: "#f5d90a", kind: "skirt" },
  { id: "run3", name: "Running, locs", pose: "run", hair: "locs", hc: 1, top: "#3b82f6", bot: "#e5484d", kind: "short" },
  { id: "clap1", name: "Clapping", pose: "clap", hair: "bob", hc: 1, top: "#f97316", bot: "#374151", kind: "long" },
  { id: "open1", name: "Arms wide", pose: "open", hair: "spiky", hc: 0, top: "#2fb36d", bot: "#3b82f6", kind: "short" },
  { id: "throw1", name: "Throwing a ball", pose: "throw", hair: "ponytail", hc: 0, top: "#e5484d", bot: "#1f2937", kind: "short", hold: "ball" },
  { id: "skip1", name: "Skipping", pose: "skip", hair: "braids", hc: 2, top: "#f5d90a", bot: "#ec6aa0", kind: "skirt" },
  { id: "balloon1", name: "Holding a balloon", pose: "hold", hair: "puffs", hc: 0, top: "#3b82f6", bot: "#f5d90a", kind: "short", hold: "balloon", holdc: "#e5484d" },
  { id: "book1", name: "Reading a book", pose: "clap", hair: "long", hc: 2, top: "#8a5ce0", bot: "#374151", kind: "long", specs: true, hold: "book" },
  { id: "flower1", name: "Holding a flower", pose: "hold", hair: "scarf", hc: 0, top: "#14b8a6", bot: "#6b7280", kind: "skirt", scarf: "#f59e0b", hold: "flower" },
  { id: "umbrella1", name: "With an umbrella", pose: "hold", hair: "short", hc: 2, top: "#f5d90a", bot: "#1e40af", kind: "long", hold: "umbrella", holdc: "#e5484d" },
  { id: "flag1", name: "Waving a flag", pose: "wave", hair: "mohawk", hc: 4, top: "#1f2937", bot: "#e5484d", kind: "long", hold: "flag", holdc: "#f5d90a" },
  { id: "blade1", name: "Running, running blade", pose: "run", hair: "short", hc: 0, top: "#14b8a6", bot: "#1f2937", kind: "short", blade: true },
  { id: "crutch1", name: "Walking with crutches", pose: "stand", hair: "bunches", hc: 4, top: "#ec6aa0", bot: "#3b82f6", kind: "long", crutch: true },
  { id: "beanie1", name: "Walking, woolly hat", pose: "walk", hair: "long", hc: 3, top: "#e5484d", bot: "#374151", kind: "long", hat: "beanie", hatc: "#2563eb", bow: "#2563eb" },
  { id: "party1", name: "Cheering, party hat", pose: "cheer", hair: "curly", hc: 2, top: "#a78bfa", bot: "#f97316", kind: "short", hat: "party", hatc: "#ec6aa0" },
  { id: "carry1", name: "Standing, spiky hair", pose: "hips", hair: "spiky", hc: 3, top: "#f97316", bot: "#2fb36d", kind: "short" },
  { id: "dance4", name: "Dancing, turban", pose: "dance", hair: "turban", hc: 0, top: "#2563eb", bot: "#f5d90a", kind: "long", scarf: "#d62839", beard: true },
  { id: "think2", name: "Thinking, locs", pose: "think", hair: "locs", hc: 0, top: "#f5a623", bot: "#1e40af", kind: "long" },
];
// Story characters: the same figures in costume. `fit` shrinks a figure a little so a tall hat stays inside its box.
// Extra parts: hat, back (cape or wings), hold (something in the near hand), and small touches such as a belt or a mask.
export const CHARACTERS = [
  { id: "santa", name: "Santa Claus", pose: "wave", hair: "none", hc: 5, top: "#d62839", bot: "#d62839", kind: "long", hat: "santa", bigbeard: "#ffffff", belt: true, trim: true, fit: 0.86 },
  { id: "mrsclaus", name: "Mrs Claus", pose: "hips", hair: "bun", hc: 5, top: "#d62839", bot: "#d62839", kind: "robe", specs: true, trim: true, apron: true, fit: 0.92 },
  { id: "elf", name: "Elf", pose: "cheer", hair: "short", hc: 2, top: "#2fb36d", bot: "#d62839", kind: "long", hat: "elf", ears: true, belt: true, fit: 0.84 },
  { id: "pirate", name: "Pirate", pose: "hips", hair: "short", hc: 0, top: "#f4f4f5", bot: "#374151", kind: "long", hat: "pirate", patch: true, beard: true, stripes: "#d62839", belt: true, fit: 0.94 },
  { id: "princess", name: "Princess", pose: "wave", hair: "long", hc: 3, top: "#ec6aa0", bot: "#f7a8c9", kind: "robe", hat: "crown", fit: 0.9 },
  { id: "king", name: "King", pose: "hips", hair: "short", hc: 1, top: "#7c3aed", bot: "#374151", kind: "long", hat: "crown", beard: true, back: "cape", backc: "#d62839", fit: 0.9 },
  { id: "wizard", name: "Wizard", pose: "point", hair: "none", hc: 5, top: "#5b3fd1", bot: "#5b3fd1", kind: "robe", hat: "wizard", bigbeard: "#e5e7eb", hold: "wand", fit: 0.8 },
  { id: "witch", name: "Witch", pose: "wave", hair: "long", hc: 0, top: "#2b2140", bot: "#2b2140", kind: "robe", hat: "witch", hold: "wand", fit: 0.8 },
  { id: "fairy", name: "Fairy", pose: "dance", hair: "bunches", hc: 4, top: "#7dd3fc", bot: "#a7f3d0", kind: "skirt", back: "wings", backc: "#e0f2fe", hold: "wand" },
  { id: "hero", name: "Superhero", pose: "hips", hair: "short", hc: 0, top: "#2563eb", bot: "#d62839", kind: "long", back: "cape", backc: "#d62839", mask: "#111827", emblem: "#f5d90a" },
  { id: "knight", name: "Knight", pose: "stand", hair: "none", hc: 0, top: "#9ca3af", bot: "#6b7280", kind: "long", hat: "helmet", hold: "sword", shield: "#d62839" },
  { id: "clown", name: "Clown", pose: "star", hair: "curly", hc: 4, top: "#f5d90a", bot: "#2563eb", kind: "long", nose: true, bow: "#d62839", dots: "#d62839", hairc: "#f97316" },
  { id: "astronaut", name: "Astronaut", pose: "wave", hair: "short", hc: 0, top: "#f4f4f5", bot: "#e5e7eb", kind: "long", hat: "astro", emblem: "#2563eb", outline: true },
  { id: "mermaid", name: "Mermaid", pose: "wave", hair: "long", hc: 4, top: "#a78bfa", bot: "#14b8a6", kind: "tail" },
  { id: "ninja", name: "Ninja", pose: "kick", hair: "none", hc: 0, top: "#1f2937", bot: "#1f2937", kind: "long", hat: "ninja", belt: "#d62839", nomouth: true },
  { id: "cowboy", name: "Cowboy", pose: "hips", hair: "short", hc: 2, top: "#b45309", bot: "#1e40af", kind: "long", hat: "cowboy", bow: "#d62839", belt: true, fit: 0.94 },
  { id: "angel", name: "Angel", pose: "cheer", hair: "long", hc: 3, top: "#f8fafc", bot: "#f8fafc", kind: "robe", hat: "halo", back: "wings", backc: "#ffffff", outline: true, fit: 0.9 },
  // not people: drawn by their own code below. The "top" colour is the snowman's scarf or the dragon's body; "bottom" is the hat or the wings.
  { id: "snowman", name: "Snowman", custom: "snowman", top: "#d62839", bot: "#1f2937" },
  { id: "dragon", name: "Dragon", custom: "dragon", top: "#22a55b", bot: "#f5c518" },
  { id: "robot", name: "Robot", custom: "robot", top: "#9ca3af", bot: "#22d3ee" },
  { id: "ghost", name: "Ghost", custom: "ghost", top: "#ffffff", bot: "#1f2937" },
  { id: "alien", name: "Alien", custom: "alien", top: "#84cc16", bot: "#7c3aed" },
  { id: "vampire", name: "Vampire", pose: "cheer", hair: "short", hc: 0, top: "#111827", bot: "#111827", kind: "long", back: "cape", backc: "#991b1b", fangs: true, bow: "#991b1b" },
  { id: "queen", name: "Queen", pose: "hips", hair: "long", hc: 1, top: "#7c3aed", bot: "#a78bfa", kind: "robe", hat: "crown", back: "cape", backc: "#d62839", fit: 0.9 },
  { id: "gnome", name: "Gnome", pose: "wave", hair: "none", hc: 5, top: "#2563eb", bot: "#7a5230", kind: "long", hat: "cone", hatc: "#d62839", bigbeard: "#ffffff", belt: true, fit: 0.78 },
  { id: "viking", name: "Viking", pose: "stand", hair: "long", hc: 4, top: "#7a5230", bot: "#374151", kind: "long", hat: "viking", beard: true, hold: "sword", shield: "#2563eb", belt: true, fit: 0.94 },
  { id: "firefighter", name: "Firefighter", pose: "point", hair: "short", hc: 1, top: "#1f2937", bot: "#1f2937", kind: "long", hat: "fire", stripes: "#f5d90a", fit: 0.94 },
  { id: "doctor", name: "Doctor", pose: "wave", hair: "bob", hc: 0, top: "#f8fafc", bot: "#0d9488", kind: "long", outline: true, steth: true },
  { id: "builder", name: "Builder", pose: "hips", hair: "short", hc: 2, top: "#f97316", bot: "#1e40af", kind: "long", hat: "hardhat", stripes: "#fde047", fit: 0.96 },
  { id: "farmer", name: "Farmer", pose: "wave", hair: "ponytail", hc: 4, top: "#e5484d", bot: "#2563eb", kind: "long", hat: "cowboy", hatc: "#e2b653", bib: true, fit: 0.94 },
  { id: "ballerina", name: "Ballerina", pose: "dance", hair: "bun", hc: 1, top: "#f7a8c9", bot: "#fbcfe8", kind: "skirt", tutu: true },
  { id: "scientist", name: "Scientist", pose: "point", hair: "curly", hc: 5, top: "#f8fafc", bot: "#374151", kind: "long", outline: true, specs: true, hold: "flask" },
  { id: "zombie", name: "Zombie", pose: "reach", hair: "thin", hc: 0, top: "#6b7280", bot: "#4b3f35", kind: "long", skinc: "#a3c78a", patchy: true },
  { id: "detective", name: "Detective", pose: "hold", hair: "short", hc: 2, top: "#b08968", bot: "#5b4636", kind: "long", hat: "tophat", hatc: "#7a5230", low: true, hold: "glass", belt: "#5b4636", fit: 0.92 },
  { id: "police", name: "Police officer", pose: "point", hair: "bun", hc: 0, top: "#1e3a8a", bot: "#1e3a8a", kind: "long", hat: "peak", hatc: "#1e3a8a", emblem: "#f5c518", belt: true, fit: 0.95 },
  { id: "sailor", name: "Sailor", pose: "wave", hair: "short", hc: 3, top: "#f8fafc", bot: "#1e3a8a", kind: "long", hat: "sailor", stripes: "#1e3a8a", outline: true, bow: "#d62839", fit: 0.95 },
  { id: "pilot", name: "Pilot", pose: "hips", hair: "ponytail", hc: 1, top: "#1f2937", bot: "#1f2937", kind: "long", hat: "peak", hatc: "#1f2937", bow: "#f5c518", emblem: "#f5c518", fit: 0.95 },
  { id: "explorer", name: "Explorer", pose: "hold", hair: "braids", hc: 0, top: "#c2a05b", bot: "#7a6a3a", kind: "short", hat: "pith", hatc: "#e7d7a8", hold: "glass", belt: true, fit: 0.95 },
  { id: "magician", name: "Magician", pose: "point", hair: "short", hc: 0, top: "#111827", bot: "#111827", kind: "long", hat: "tophat", hatc: "#111827", back: "cape", backc: "#7c3aed", bow: "#d62839", hold: "wand", fit: 0.84 },
  { id: "leprechaun", name: "Leprechaun", pose: "dance", hair: "short", hc: 4, top: "#15803d", bot: "#166534", kind: "long", hat: "tophat", hatc: "#15803d", buckle: true, beard: true, belt: true, fit: 0.84 },
  { id: "nurse", name: "Nurse", pose: "wave", hair: "puffs", hc: 0, top: "#7dd3fc", bot: "#7dd3fc", kind: "long", steth: true },
  { id: "teacher", name: "Teacher", pose: "point", hair: "locs", hc: 0, top: "#0d9488", bot: "#374151", kind: "skirt", specs: true, hold: "book" },
  { id: "artist", name: "Artist", pose: "hold", hair: "long", hc: 4, top: "#f8fafc", bot: "#1e40af", kind: "long", hat: "beret", hatc: "#d62839", hold: "brush", outline: true, dots: "#f59e0b", fit: 0.96 },
  { id: "footballer", name: "Footballer", pose: "kick", hair: "mohawk", hc: 0, top: "#d62839", bot: "#1f2937", kind: "short", stripes: "#f8fafc", ball: true },
  { id: "graduate", name: "Graduate", pose: "cheer", hair: "long", hc: 0, top: "#1e3a8a", bot: "#1e3a8a", kind: "robe", hat: "grad", fit: 0.92 },
  { id: "scarecrow", name: "Scarecrow", pose: "open", hair: "spiky", hc: 3, top: "#b45309", bot: "#1e40af", kind: "long", hat: "cowboy", hatc: "#e2b653", nose: true, dots: "#f5d90a", belt: "#7a5230", hairc: "#e2b653", fit: 0.94 },
  { id: "seaking", name: "Sea king", pose: "hold", hair: "long", hc: 5, top: "#0e7490", bot: "#0d9488", kind: "tail", hat: "crown", bigbeard: "#e5e7eb", hold: "trident", fit: 0.88 },
  { id: "bunny", name: "Bunny costume", pose: "skip", hair: "none", hc: 0, top: "#d8dee9", bot: "#d8dee9", kind: "long", hat: "bunny", emblem: "#ffffff", nose: true, bow: "#ec6aa0", fit: 0.82 },
  { id: "jester", name: "Jester", pose: "star", hair: "none", hc: 0, top: "#7c3aed", bot: "#f5d90a", kind: "long", hat: "jester", dots: "#f5d90a", bow: "#d62839", fit: 0.88 },
  { id: "chef", name: "Chef", pose: "point", hair: "short", hc: 1, top: "#f8fafc", bot: "#374151", kind: "long", hat: "chef", apron: true, outline: true, fit: 0.84 },
];
export const personById = (id) => PEOPLE.find((x) => x.id === id) || CHARACTERS.find((x) => x.id === id) || ANIMALS.find((x) => x.id === id) || PEOPLE[0];

// `live` is null for a still picture, or { t: seconds, go: is it travelling } while an animation plays.
const beat = (live, rate, off = 0) => (live ? Math.sin(live.t * Math.PI * 2 * rate + off) : 0);
const step = (live, way) => (live && live.go ? Math.max(0, way * beat(live, 1.4)) : 0); // how far a foot is lifted

// ---------- characters that are not people (one unit tall, middle at the origin; the dragon faces right) ----------
const OTHER = {
  snowman(g, scarf, hat, live) {
    const k = beat(live, 1.2);
    if (live && live.go) { g.translate(0, 0.46); g.rotate(beat(live, 1.4) * 0.06); g.translate(0, -0.46 - Math.abs(beat(live, 1.4)) * 0.02); } // it shuffles along
    const ball = (x, y, r) => { g.fillStyle = "#ffffff"; g.strokeStyle = "#b6c2d1"; g.lineWidth = 0.012; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); g.stroke(); };
    const dot = (c, x, y, r) => { g.fillStyle = c; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); };
    g.strokeStyle = "#7a5230"; g.lineWidth = 0.022; // stick arms, behind the body: they wave
    g.save(); g.translate(-0.13, 0); g.rotate(k * 0.22); g.translate(0.13, 0); g.beginPath();
    g.moveTo(-0.13, 0.0); g.lineTo(-0.36, -0.14); g.moveTo(-0.3, -0.1); g.lineTo(-0.36, -0.04); g.moveTo(-0.3, -0.1); g.lineTo(-0.31, -0.19); g.stroke(); g.restore();
    g.save(); g.translate(0.13, 0); g.rotate(k * 0.3); g.translate(-0.13, 0); g.beginPath();
    g.moveTo(0.13, 0.0); g.lineTo(0.36, -0.16); g.moveTo(0.3, -0.12); g.lineTo(0.37, -0.07); g.moveTo(0.3, -0.12); g.lineTo(0.3, -0.21); g.stroke(); g.restore();
    ball(0, 0.28, 0.2); ball(0, 0.02, 0.15); ball(0, -0.2, 0.115);
    [0.02 - 0.05, 0.02 + 0.02, 0.02 + 0.09].forEach((y) => dot("#1f2937", 0, y, 0.02)); // buttons
    g.strokeStyle = scarf; g.lineWidth = 0.05; g.beginPath(); g.moveTo(-0.11, -0.11); g.quadraticCurveTo(0, -0.07, 0.11, -0.11); g.stroke(); // scarf
    g.lineWidth = 0.045; g.beginPath(); g.moveTo(0.07, -0.1); g.lineTo(0.1 + k * 0.03, 0.06); g.stroke();
    dot("#1f2937", -0.04, -0.23, 0.016); dot("#1f2937", 0.04, -0.23, 0.016);
    g.fillStyle = "#f97316"; g.beginPath(); g.moveTo(0, -0.205); g.lineTo(0.12, -0.185); g.lineTo(0, -0.17); g.fill(); // carrot nose
    [-0.05, -0.025, 0, 0.025, 0.05].forEach((x, i) => dot("#1f2937", x, -0.145 + (i === 0 || i === 4 ? -0.012 : i === 2 ? 0.004 : 0), 0.009)); // coal smile
    g.fillStyle = hat; g.fillRect(-0.085, -0.46, 0.17, 0.16); g.beginPath(); g.ellipse(0, -0.3, 0.14, 0.022, 0, 0, Math.PI * 2); g.fill(); // top hat
    g.fillStyle = scarf; g.fillRect(-0.085, -0.345, 0.17, 0.03);
  },
  robot(g, body, light, live) {
    const k = beat(live, 1.2), la = step(live, 1) * 0.035, lb = step(live, -1) * 0.035;
    const box = (c, x, y, w, h, r = 0.02) => { g.fillStyle = c; g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.fill(); };
    const dot = (c, x, y, r) => { g.fillStyle = c; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); };
    const rod = (pts, w = 0.045) => { g.strokeStyle = "#6b7280"; g.lineWidth = w; g.lineCap = "round"; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); pts.slice(1).forEach((q) => g.lineTo(q[0], q[1])); g.stroke(); };
    rod([[0, -0.38], [0, -0.46]], 0.02); g.globalAlpha = live ? 0.35 + 0.65 * Math.abs(beat(live, 0.8)) : 1; dot(light, 0, -0.47, 0.03); g.globalAlpha = 1; // antenna, with a light that blinks
    g.save(); g.translate(-0.17, -0.02); g.rotate(k * 0.3); g.translate(0.17, 0.02); rod([[-0.17, -0.02], [-0.29, 0.06], [-0.29, 0.18]]); dot("#6b7280", -0.29, 0.2, 0.035); g.restore(); // the arms swing and wave
    g.save(); g.translate(0.17, -0.02); g.rotate(k * 0.35); g.translate(-0.17, 0.02); rod([[0.17, -0.02], [0.3, -0.06], [0.33, -0.2]]); dot("#6b7280", 0.33, -0.22, 0.035); g.restore();
    rod([[-0.08, 0.26], [-0.08, 0.42 - la]], 0.06); rod([[0.08, 0.26], [0.08, 0.42 - lb]], 0.06); box("#4b5563", -0.16, 0.41 - la, 0.14, 0.06); box("#4b5563", 0.02, 0.41 - lb, 0.14, 0.06);
    box(body, -0.17, -0.08, 0.34, 0.36, 0.04); box("#e5e7eb", -0.11, 0.0, 0.22, 0.14, 0.02); dot("#ef4444", -0.06, 0.07, 0.025); dot("#facc15", 0, 0.07, 0.025); dot("#22c55e", 0.06, 0.07, 0.025);
    g.fillStyle = "#6b7280"; g.fillRect(-0.04, -0.13, 0.08, 0.06);
    box(body, -0.16, -0.38, 0.32, 0.26, 0.05); box("#1f2937", -0.12, -0.33, 0.24, 0.12, 0.03); dot(light, -0.055, -0.27, 0.032); dot(light, 0.055, -0.27, 0.032);
    g.strokeStyle = "#1f2937"; g.lineWidth = 0.014; g.beginPath(); g.moveTo(-0.06, -0.17); g.lineTo(0.06, -0.17); g.stroke();
    dot("#6b7280", -0.17, -0.25, 0.025); dot("#6b7280", 0.17, -0.25, 0.025);
  },
  ghost(g, sheet, face, live) {
    const r = beat(live, 1.5) * 0.05, k = beat(live, 1.1);
    g.translate(0, beat(live, 0.7) * 0.025); // it floats
    g.fillStyle = sheet; g.strokeStyle = "#b6c2d1"; g.lineWidth = 0.014; g.beginPath();
    g.moveTo(-0.22, 0.38); g.lineTo(-0.22, -0.14); g.arc(0, -0.14, 0.22, Math.PI, 0); g.lineTo(0.22, 0.38);
    g.quadraticCurveTo(0.165, 0.3 - r, 0.11, 0.38); g.quadraticCurveTo(0.055, 0.46 + r, 0, 0.38); g.quadraticCurveTo(-0.055, 0.3 - r, -0.11, 0.38); g.quadraticCurveTo(-0.165, 0.46 + r, -0.22, 0.38); // the hem ripples
    g.fill(); g.stroke();
    for (const sx of [-1, 1]) { g.fillStyle = sheet; g.beginPath(); g.ellipse(sx * 0.26, 0.02 - k * sx * 0.03, 0.07, 0.045, sx * -0.5 - k * 0.45, 0, Math.PI * 2); g.fill(); g.stroke(); }
    g.fillStyle = sheet; g.fillRect(-0.2, -0.05, 0.4, 0.14);
    g.fillStyle = face; for (const sx of [-1, 1]) { g.beginPath(); g.ellipse(sx * 0.08, -0.17, 0.035, 0.05, 0, 0, Math.PI * 2); g.fill(); }
    g.beginPath(); g.ellipse(0, -0.05, 0.04, 0.055, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = "rgba(244,114,182,0.5)"; for (const sx of [-1, 1]) { g.beginPath(); g.ellipse(sx * 0.15, -0.1, 0.03, 0.02, 0, 0, Math.PI * 2); g.fill(); }
  },
  alien(g, skin2, suit, live) {
    const k = beat(live, 1.3), la = step(live, 1) * 0.035, lb = step(live, -1) * 0.035;
    const oval = (c, x, y, rx, ry, turn = 0) => { g.fillStyle = c; g.beginPath(); g.ellipse(x, y, rx, ry, turn, 0, Math.PI * 2); g.fill(); };
    const rod = (c, w, pts) => { g.strokeStyle = c; g.lineWidth = w; g.lineCap = "round"; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); pts.slice(1).forEach((q) => g.lineTo(q[0], q[1])); g.stroke(); };
    for (const sx of [-1, 1]) { rod(skin2, 0.018, [[sx * 0.07, -0.36], [sx * 0.14 + k * 0.035, -0.47]]); oval(skin2, sx * 0.145 + k * 0.035, -0.475, 0.028, 0.028); }
    rod(skin2, 0.05, [[-0.11, 0.06], [-0.24, 0.14], [-0.25 - k * 0.03, 0.2]]);
    g.save(); g.translate(0.11, 0.06); g.rotate(k * 0.3); g.translate(-0.11, -0.06); // the raised arm waves
    rod(skin2, 0.05, [[0.11, 0.06], [0.25, -0.02], [0.3, -0.14]]);
    for (const dx of [-0.03, 0, 0.03]) rod(skin2, 0.016, [[0.3, -0.14], [0.3 + dx, -0.2]]);
    g.restore();
    rod(suit, 0.07, [[-0.06, 0.28], [-0.07, 0.42 - la]]); rod(suit, 0.07, [[0.06, 0.28], [0.07, 0.42 - lb]]); oval(skin2, -0.09, 0.44 - la, 0.07, 0.035); oval(skin2, 0.09, 0.44 - lb, 0.07, 0.035);
    oval(suit, 0, 0.16, 0.14, 0.17); oval("#fde047", 0, 0.12, 0.04, 0.04);
    oval(skin2, 0, -0.17, 0.24, 0.21);
    for (const sx of [-1, 1]) { oval("#111827", sx * 0.1, -0.17, 0.07, 0.095, sx * 0.35); oval("#ffffff", sx * 0.085, -0.2, 0.018, 0.022); }
    g.strokeStyle = "#365314"; g.lineWidth = 0.014; g.lineCap = "round"; g.beginPath(); g.arc(0, -0.08, 0.055, Math.PI * 0.2, Math.PI * 0.8); g.stroke();
  },
  dragon(g, body, second, live) {
    const flap = live ? 0.5 + 0.5 * beat(live, 1.6) : 0, sway = beat(live, 0.9) * 0.14, fa = step(live, 1) * 0.03, fb = step(live, -1) * 0.03;
    const fill = (c, draw) => { g.fillStyle = c; g.beginPath(); draw(); g.fill(); };
    const oval = (c, x, y, rx, ry, turn = 0) => fill(c, () => g.ellipse(x, y, rx, ry, turn, 0, Math.PI * 2));
    const tri = (c, a, b, d) => fill(c, () => { g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.lineTo(d[0], d[1]); });
    // wing, behind the body: it beats
    g.save(); g.translate(-0.04, 0.04); g.rotate(flap * 0.25); g.scale(1, 1 - flap * 0.5); g.translate(0.04, -0.04);
    fill(second, () => { g.moveTo(-0.04, 0.04); g.lineTo(-0.3, -0.36); g.quadraticCurveTo(-0.2, -0.2, -0.24, -0.12); g.quadraticCurveTo(-0.33, -0.18, -0.42, -0.14); g.quadraticCurveTo(-0.28, -0.04, -0.3, 0.06); g.quadraticCurveTo(-0.18, 0.02, -0.1, 0.12); });
    g.strokeStyle = "rgba(0,0,0,0.18)"; g.lineWidth = 0.01; g.beginPath(); g.moveTo(-0.04, 0.04); g.lineTo(-0.3, -0.36); g.moveTo(-0.04, 0.04); g.lineTo(-0.42, -0.14); g.moveTo(-0.04, 0.04); g.lineTo(-0.3, 0.06); g.stroke();
    g.restore();
    g.save(); g.translate(-0.14, 0.24); g.rotate(sway); g.translate(0.14, -0.24); // the tail swings
    // tail: thick near the body, thin at the tip, with a pointed end
    g.lineCap = "round"; g.strokeStyle = body; g.lineWidth = 0.1; g.beginPath(); g.moveTo(-0.14, 0.24); g.quadraticCurveTo(-0.34, 0.34, -0.42, 0.22); g.stroke();
    g.lineWidth = 0.055; g.beginPath(); g.moveTo(-0.42, 0.22); g.quadraticCurveTo(-0.47, 0.12, -0.4, 0.05); g.stroke();
    tri(second, [-0.44, 0.02], [-0.33, 0.0], [-0.39, 0.1]);
    g.restore();
    // back spikes, legs, body, belly
    [[-0.17, 0.0], [-0.08, -0.04], [0.01, -0.05]].forEach(([x, y]) => tri(second, [x - 0.04, y + 0.05], [x, y - 0.05], [x + 0.045, y + 0.04]));
    oval(body, -0.1, 0.4 - fa, 0.075, 0.05); oval(body, 0.1, 0.4 - fb, 0.075, 0.05);
    oval(body, -0.02, 0.17, 0.2, 0.19);
    oval("#fff4c2", 0.04, 0.21, 0.11, 0.13);
    g.strokeStyle = "rgba(0,0,0,0.12)"; g.lineWidth = 0.01; [0.14, 0.2, 0.26].forEach((y) => { g.beginPath(); g.moveTo(-0.05, y); g.quadraticCurveTo(0.04, y + 0.02, 0.13, y); g.stroke(); });
    oval(body, 0.17, 0.12, 0.04, 0.085, -0.5); // a little arm
    // neck, spikes on it, head, snout
    g.strokeStyle = body; g.lineWidth = 0.13; g.beginPath(); g.moveTo(0.08, 0.04); g.quadraticCurveTo(0.1, -0.12, 0.2, -0.22); g.stroke();
    tri(second, [0.03, -0.1], [0.045, -0.2], [0.1, -0.13]);
    tri("#fff4c2", [0.12, -0.33], [0.1, -0.44], [0.18, -0.36]); tri("#fff4c2", [0.2, -0.35], [0.22, -0.46], [0.27, -0.35]); // horns
    oval(body, 0.21, -0.26, 0.14, 0.11); oval(body, 0.34, -0.21, 0.1, 0.075);
    oval("#ffffff", 0.2, -0.3, 0.04, 0.045); oval("#1f2937", 0.21, -0.295, 0.02, 0.025); oval("#ffffff", 0.216, -0.305, 0.007, 0.008);
    oval("#14532d", 0.4, -0.235, 0.01, 0.012);
    g.strokeStyle = "#14532d"; g.lineWidth = 0.012; g.beginPath(); g.arc(0.3, -0.21, 0.09, Math.PI * 0.12, Math.PI * 0.62); g.stroke(); // smile
    // a small puff of flame, which flickers
    if (live) { const f = 0.7 + 0.5 * Math.abs(beat(live, 2.6)); g.translate(0.43, -0.2); g.scale(f, f); g.translate(-0.43, 0.2); }
    fill("#f97316", () => { g.moveTo(0.43, -0.2); g.quadraticCurveTo(0.5, -0.27, 0.54, -0.2); g.quadraticCurveTo(0.5, -0.19, 0.53, -0.14); g.quadraticCurveTo(0.47, -0.15, 0.43, -0.2); });
    fill("#fde047", () => { g.moveTo(0.44, -0.2); g.quadraticCurveTo(0.48, -0.23, 0.5, -0.195); g.quadraticCurveTo(0.48, -0.18, 0.44, -0.2); });
  },
};

const TAU = Math.PI * 2;
/**
 * The pose at one moment of an animation. `live` is { t: seconds, go: is the figure travelling }.
 * Arms that are held up wave; arms that hang down swing; the legs step when the figure is travelling.
 */
function livePose(base, live) {
  if (!live) return base;
  const s = Math.sin(live.t * TAU * 1.4), c = Math.cos(live.t * TAU * 1.4), p = { ...base };
  const turn = (e, hand, by) => { const dx = hand[0] - e[0], dy = hand[1] - e[1], ca = Math.cos(by), sa = Math.sin(by); return [e[0] + dx * ca - dy * sa, e[1] + dx * sa + dy * ca]; };
  const arm = (e, hand, k) => { // k runs from -1 to 1 through the step
    if (hand[1] < e[1] - 0.04) return [e, turn(e, hand, 0.32 * k)]; // held up: it waves from the elbow
    if (base.chair) return [e, live.go ? [hand[0] + 0.05 * k, hand[1] + 0.03 * Math.abs(k)] : hand]; // pushing the wheel
    if (!live.go) return [e, [hand[0] + 0.025 * k, hand[1]]];
    const lift = Math.max(0, k) * (base === P.run ? 0.16 : 0.08); // the figure faces us, so a swinging arm is seen as a hand that comes up and in a little
    return [[e[0], e[1] - lift * 0.2], [hand[0] - Math.sign(e[0] || 1) * lift * 0.35 + 0.02 * k, hand[1] - lift]];
  };
  [p.ea, p.ha] = arm(base.ea, base.ha, -s); [p.eb, p.hb] = arm(base.eb, base.hb, s);
  if (live.go && !base.chair) {
    const A = base === P.run ? 0.17 : 0.1, high = base === P.run ? 0.09 : 0.05;
    const leg = (hipX, k, lift) => { const f = [hipX + A * k, 0.46 - lift * high]; return [[(hipX + f[0]) / 2 + 0.035 + lift * 0.04, 0.29 - lift * high * 0.6], f]; };
    [p.ka, p.fa] = leg(-0.06, s, Math.max(0, c)); [p.kb, p.fb] = leg(0.06, -s, Math.max(0, -c));
  } else if (base === P.dance || base === P.kick) p.fb = turn(base.kb, base.fb, 0.35 * s);
  return p;
}

/** Draws a person `h` pixels tall with its middle at the origin. `fig` is { fig: id, sk, hc }. `live` (optional) is
 *  { t, go } while an animation plays, and makes the figure move its arms and legs. */
export function drawPerson(g, fig, h, live = null) {
  const what = personById(fig.fig);
  if (what.custom) { g.save(); g.scale(h, h); g.lineCap = "round"; g.lineJoin = "round"; if (what.custom === "animal") drawAnimal(g, what, fig.tc || what.top, fig.bc || what.bot, live); else OTHER[what.custom](g, fig.tc || what.top, fig.bc || what.bot, live); g.restore(); return; }
  const own = personById(fig.fig), d = { ...own, top: fig.tc || own.top, bot: fig.bc || own.bot }, pose = livePose(P[d.pose], live), skin = own.skinc || (SKINS[fig.sk] || SKINS[2])[0], hair = own.hairc || (HAIRS[fig.hc >= 0 ? fig.hc : d.hc] || HAIRS[0])[0];
  const limb = 0.062, HEAD = [0, -0.34], R = 0.135, sh = [0, -0.17], hipA = [-0.06, 0.1], hipB = [0.06, 0.1];
  g.save(); g.scale(h, h); g.lineCap = "round"; g.lineJoin = "round";
  if (d.fit) { g.translate(0, (1 - d.fit) * 0.46); g.scale(d.fit, d.fit); } // feet stay on the ground; the hat comes down inside the box
  const poly = (c, pts) => { g.fillStyle = c; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i += 1) g.lineTo(pts[i][0], pts[i][1]); g.closePath(); g.fill(); };
  const edge = () => { if (d.outline) { g.strokeStyle = "#9ca3af"; g.lineWidth = 0.01; g.stroke(); } }; // white clothes get a thin grey edge so they show on white paper
  const line = (c, w, pts) => { g.strokeStyle = c; g.lineWidth = w; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i += 1) g.lineTo(pts[i][0], pts[i][1]); g.stroke(); };
  const disc = (c, x, y, r, ry = r) => { g.fillStyle = c; g.beginPath(); g.ellipse(x, y, r, ry, 0, 0, Math.PI * 2); g.fill(); };
  const shoe = (f) => disc("#2b2f3a", f[0] + 0.02, f[1] + 0.012, 0.05, 0.028);
  const arm = (e, hand) => { line(d.top, limb, [[sh[0] + Math.sign(e[0] || 1) * 0.1, sh[1] + 0.02], e]); line(skin, limb * 0.9, [e, hand]); disc(skin, hand[0], hand[1], 0.036); };
  const leg = (hip, k, f) => {
    if (d.kind === "long") line(d.bot, limb * 1.1, [hip, k, f]);
    else { line(skin, limb, [hip, k, f]); if (d.kind === "short") line(d.bot, limb * 1.25, [hip, [(hip[0] + k[0]) / 2, (hip[1] + k[1]) / 2]]); }
    shoe(f);
  };
  if (d.back === "cape") { const fl = beat(live, 1.1) * 0.045; poly(d.backc, [[-0.12, -0.2], [0.12, -0.2], [0.24 + fl, 0.34], [-0.24 + fl, 0.34]]); } // the cape flutters
  if (d.back === "wings") { g.save(); g.scale(1 - Math.abs(beat(live, 2.2)) * 0.3, 1); g.fillStyle = d.backc; g.strokeStyle = "#93c5fd"; g.lineWidth = 0.012; for (const sx of [-1, 1]) { g.beginPath(); g.ellipse(sx * 0.2, -0.14, 0.11, 0.2, sx * 0.5, 0, Math.PI * 2); g.fill(); g.stroke(); g.beginPath(); g.ellipse(sx * 0.17, 0.06, 0.08, 0.12, sx * -0.4, 0, Math.PI * 2); g.fill(); g.stroke(); } g.restore(); }
  if (d.hat === "astro") { g.fillStyle = "#f4f4f5"; g.beginPath(); g.arc(HEAD[0], HEAD[1], R * 1.36, 0, Math.PI * 2); g.fill(); g.strokeStyle = "#9ca3af"; g.lineWidth = 0.014; g.stroke(); disc("#bfe3ff", HEAD[0], HEAD[1], R * 1.14); }
  // the wheelchair goes behind the person
  if (pose.chair) { g.strokeStyle = "#4b5563"; g.lineWidth = 0.022; g.beginPath(); g.arc(-0.03, 0.27, 0.2, 0, Math.PI * 2); g.stroke(); g.lineWidth = 0.012; g.beginPath(); for (let i = 0; i < 6; i += 1) { const a = (i * Math.PI) / 3 + (live && live.go ? live.t * 3.2 : 0); g.moveTo(-0.03, 0.27); g.lineTo(-0.03 + Math.cos(a) * 0.2, 0.27 + Math.sin(a) * 0.2); } g.stroke(); line("#4b5563", 0.026, [[-0.15, -0.16], [-0.13, 0.14], [0.17, 0.16]]); line("#4b5563", 0.02, [[0.17, 0.16], [0.21, 0.4]]); g.strokeStyle = "#4b5563"; g.lineWidth = 0.02; g.beginPath(); g.arc(0.2, 0.43, 0.045, 0, Math.PI * 2); g.stroke(); }
  // long hair and headscarves fall behind the body
  if (d.hair === "long") { g.fillStyle = hair; g.beginPath(); g.moveTo(-0.17, -0.38); g.quadraticCurveTo(-0.2, -0.1, -0.15, -0.06); g.lineTo(0.15, -0.06); g.quadraticCurveTo(0.2, -0.1, 0.17, -0.38); g.fill(); }
  if (d.hair === "scarf") { g.fillStyle = d.scarf; g.beginPath(); g.moveTo(-0.17, -0.36); g.quadraticCurveTo(-0.21, -0.12, -0.14, -0.05); g.lineTo(0.14, -0.05); g.quadraticCurveTo(0.21, -0.12, 0.17, -0.36); g.fill(); }
  if (d.hair === "curly") disc(hair, HEAD[0], HEAD[1] - 0.02, R * 1.42);
  if (d.hair === "bob") { g.fillStyle = hair; g.beginPath(); g.moveTo(-0.165, -0.38); g.quadraticCurveTo(-0.2, -0.24, -0.15, -0.2); g.lineTo(0.15, -0.2); g.quadraticCurveTo(0.2, -0.24, 0.165, -0.38); g.fill(); }
  if (d.hair === "ponytail") line(hair, 0.075, [[-0.1, -0.42], [-0.2, -0.32], [-0.22, -0.18]]);
  if (d.hair === "locs") { for (let i = 0; i < 7; i += 1) { const lx = -0.15 + i * 0.05; line(hair, 0.034, [[lx, -0.4], [lx * 1.12, -0.2 + Math.abs(lx) * 0.12]]); } }
  if (d.hair === "braids") { line(hair, 0.045, [[-0.13, -0.3], [-0.16, -0.08]]); line(hair, 0.045, [[0.13, -0.3], [0.16, -0.08]]); disc("#e5484d", -0.16, -0.07, 0.022); disc("#e5484d", 0.16, -0.07, 0.022); }
  arm(pose.ea, pose.ha); // the arm on the far side
  if (d.kind === "tail") { g.save(); g.translate(0, 0.07); g.rotate(beat(live, 1) * 0.14); g.translate(0, -0.07); g.fillStyle = d.bot; g.beginPath(); g.moveTo(-0.125, 0.07); g.lineTo(0.125, 0.07); g.quadraticCurveTo(0.12, 0.26, 0.04, 0.37); g.lineTo(0.17, 0.48); g.quadraticCurveTo(0, 0.42, -0.17, 0.48); g.lineTo(-0.04, 0.37); g.quadraticCurveTo(-0.12, 0.26, -0.125, 0.07); g.fill(); g.strokeStyle = "rgba(255,255,255,0.45)"; g.lineWidth = 0.012; for (const yy of [0.14, 0.21, 0.28]) { g.beginPath(); g.arc(0, yy - 0.05, 0.09, Math.PI * 0.2, Math.PI * 0.8); g.stroke(); } g.restore(); }
  else {
    leg(hipA, pose.ka, pose.fa);
    if (d.blade) { const k = pose.kb, f = pose.fb; line(skin, limb, [hipB, k]); line(d.bot, limb * 1.25, [hipB, [(hipB[0] + k[0]) / 2, (hipB[1] + k[1]) / 2]]); g.strokeStyle = "#4b5563"; g.lineWidth = 0.028; g.beginPath(); g.moveTo(k[0], k[1]); g.quadraticCurveTo(f[0] - 0.07, f[1] - 0.02, f[0] + 0.04, f[1] + 0.02); g.stroke(); disc("#6b7280", k[0], k[1], 0.036); } // a running blade below the knee
    else leg(hipB, pose.kb, pose.fb);
  }
  // body
  if (d.kind === "robe") { g.fillStyle = d.bot; g.beginPath(); g.moveTo(-0.125, 0.07); g.lineTo(0.125, 0.07); g.lineTo(0.19, 0.44); g.lineTo(-0.19, 0.44); g.closePath(); g.fill(); edge(); }
  g.fillStyle = d.top; g.beginPath(); g.moveTo(-0.115, -0.2); g.lineTo(0.115, -0.2); g.quadraticCurveTo(0.135, -0.19, 0.125, 0.12); g.lineTo(-0.125, 0.12); g.quadraticCurveTo(-0.135, -0.19, -0.115, -0.2); g.fill(); edge();
  if (d.stripes) { g.strokeStyle = d.stripes; g.lineWidth = 0.03; for (const yy of [-0.14, -0.06, 0.02]) { g.beginPath(); g.moveTo(-0.118, yy); g.lineTo(0.118, yy); g.stroke(); } }
  if (d.dots) [[-0.05, -0.1], [0.06, -0.02], [-0.04, 0.05]].forEach(([dx, dy]) => disc(d.dots, dx, dy, 0.024));
  if (d.patchy) { poly("#4b5563", [[-0.06, -0.12], [0.0, -0.1], [-0.02, -0.03], [-0.08, -0.05]]); poly(skin, [[0.04, 0.0], [0.1, 0.02], [0.07, 0.08]]); }
  if (d.emblem) { disc(d.emblem, 0, -0.07, 0.05); }
  if (d.bib) { poly(d.bot, [[-0.075, -0.1], [0.075, -0.1], [0.085, 0.1], [-0.085, 0.1]]); line(d.bot, 0.024, [[-0.06, -0.1], [-0.085, -0.2]]); line(d.bot, 0.024, [[0.06, -0.1], [0.085, -0.2]]); disc("#fde047", -0.055, -0.085, 0.012); disc("#fde047", 0.055, -0.085, 0.012); }
  if (d.steth) { g.strokeStyle = "#374151"; g.lineWidth = 0.014; g.beginPath(); g.moveTo(-0.06, -0.2); g.quadraticCurveTo(-0.07, -0.04, 0, -0.03); g.quadraticCurveTo(0.07, -0.04, 0.06, -0.2); g.stroke(); g.beginPath(); g.moveTo(0, -0.03); g.lineTo(0.03, 0.04); g.stroke(); disc("#9ca3af", 0.03, 0.05, 0.022); }
  if (d.apron) { poly("#ffffff", [[-0.08, -0.12], [0.08, -0.12], [0.1, 0.13], [-0.1, 0.13]]); edge(); }
  if (d.trim) { g.strokeStyle = "#ffffff"; g.lineWidth = 0.035; g.beginPath(); g.moveTo(-0.125, 0.115); g.lineTo(0.125, 0.115); g.stroke(); if (d.kind === "robe") { g.beginPath(); g.moveTo(-0.185, 0.425); g.lineTo(0.185, 0.425); g.stroke(); } }
  if (d.kind === "robe" || d.kind === "tail") { /* drawn already */ }
  else if (d.tutu) { g.fillStyle = d.bot; g.beginPath(); g.moveTo(-0.12, 0.05); g.lineTo(0.12, 0.05); g.lineTo(0.3, 0.17); g.quadraticCurveTo(0, 0.24, -0.3, 0.17); g.closePath(); g.fill(); g.strokeStyle = "rgba(255,255,255,0.7)"; g.lineWidth = 0.01; g.beginPath(); for (const sx of [-0.18, -0.06, 0.06, 0.18]) { g.moveTo(sx * 0.6, 0.07); g.lineTo(sx * 1.3, 0.19); } g.stroke(); }
  else if (d.kind === "skirt") { g.fillStyle = d.bot; g.beginPath(); g.moveTo(-0.125, 0.07); g.lineTo(0.125, 0.07); g.lineTo(pose.chair ? 0.22 : 0.2, pose.chair ? 0.2 : 0.3); g.lineTo(pose.chair ? -0.13 : -0.2, pose.chair ? 0.2 : 0.3); g.fill(); }
  else { g.fillStyle = d.bot; g.fillRect(-0.125, 0.07, 0.25, 0.06); }
  if (d.belt) { g.strokeStyle = typeof d.belt === "string" ? d.belt : "#111827"; g.lineWidth = 0.04; g.lineCap = "butt"; g.beginPath(); g.moveTo(-0.127, 0.07); g.lineTo(0.127, 0.07); g.stroke(); g.lineCap = "round"; if (d.belt === true) { g.fillStyle = "#f5d90a"; g.fillRect(-0.028, 0.047, 0.056, 0.046); g.fillStyle = "#111827"; g.fillRect(-0.012, 0.059, 0.024, 0.022); } }
  line(skin, 0.06, [[0, -0.24], [0, -0.19]]); // neck
  if (d.bow) { poly(d.bow, [[0, -0.19], [-0.07, -0.225], [-0.07, -0.155]]); poly(d.bow, [[0, -0.19], [0.07, -0.225], [0.07, -0.155]]); }
  if (d.shield) { const [hx, hy] = pose.ha; g.fillStyle = d.shield; g.beginPath(); g.moveTo(hx - 0.09, hy - 0.1); g.lineTo(hx + 0.09, hy - 0.1); g.lineTo(hx + 0.09, hy + 0.02); g.quadraticCurveTo(hx, hy + 0.14, hx - 0.09, hy + 0.02); g.closePath(); g.fill(); g.strokeStyle = "#f5d90a"; g.lineWidth = 0.014; g.stroke(); }
  arm(pose.eb, pose.hb); // the arm on the near side
  if (d.hold === "wand") { const [hx, hy] = pose.hb; line("#8b5a2b", 0.018, [[hx - 0.02, hy + 0.03], [hx + 0.09, hy - 0.13]]); g.fillStyle = "#f5d90a"; g.beginPath(); for (let i = 0; i < 10; i += 1) { const a1 = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? 0.022 : 0.052; g.lineTo(hx + 0.09 + Math.cos(a1) * rr, hy - 0.13 + Math.sin(a1) * rr); } g.fill(); }
  if (d.hold === "flask") { const [hx, hy] = pose.hb; g.fillStyle = "rgba(190,230,255,0.9)"; g.strokeStyle = "#64748b"; g.lineWidth = 0.01; g.beginPath(); g.moveTo(hx - 0.02, hy - 0.16); g.lineTo(hx + 0.02, hy - 0.16); g.lineTo(hx + 0.02, hy - 0.09); g.lineTo(hx + 0.075, hy + 0.01); g.lineTo(hx - 0.075, hy + 0.01); g.lineTo(hx - 0.02, hy - 0.09); g.closePath(); g.fill(); g.stroke(); poly("#22c55e", [[hx - 0.04, hy - 0.05], [hx + 0.04, hy - 0.05], [hx + 0.07, hy + 0.005], [hx - 0.07, hy + 0.005]]); disc("#22c55e", hx + 0.01, hy - 0.2, 0.014); disc("#22c55e", hx - 0.02, hy - 0.25, 0.01); }
  if (d.hold === "ball") { const [hx, hy] = pose.hb; disc("#f59e0b", hx + 0.01, hy - 0.06, 0.05); g.strokeStyle = "#92400e"; g.lineWidth = 0.008; g.beginPath(); g.arc(hx + 0.01, hy - 0.06, 0.05, 0, Math.PI * 2); g.moveTo(hx - 0.04, hy - 0.06); g.lineTo(hx + 0.06, hy - 0.06); g.stroke(); }
  if (d.hold === "balloon") { const [hx, hy] = pose.hb, sway = beat(live, 0.6) * 0.03; g.strokeStyle = "#6b7280"; g.lineWidth = 0.008; g.beginPath(); g.moveTo(hx, hy); g.quadraticCurveTo(hx + 0.03, hy - 0.1, hx + 0.02 + sway, hy - 0.2); g.stroke(); g.fillStyle = d.holdc; g.beginPath(); g.ellipse(hx + 0.02 + sway, hy - 0.28, 0.075, 0.09, 0, 0, Math.PI * 2); g.fill(); disc("rgba(255,255,255,0.55)", hx - 0.005 + sway, hy - 0.31, 0.018); poly(d.holdc, [[hx + 0.02 + sway, hy - 0.195], [hx + 0.005 + sway, hy - 0.175], [hx + 0.035 + sway, hy - 0.175]]); }
  if (d.hold === "book") { const [hx, hy] = pose.hb, cx = pose === P.clap || Math.abs(hx) < 0.1 ? 0 : hx + 0.02, cy = hy - 0.01; poly("#b91c1c", [[cx - 0.1, cy - 0.06], [cx, cy - 0.045], [cx, cy + 0.065], [cx - 0.1, cy + 0.05]]); poly("#dc2626", [[cx + 0.1, cy - 0.06], [cx, cy - 0.045], [cx, cy + 0.065], [cx + 0.1, cy + 0.05]]); poly("#ffffff", [[cx - 0.085, cy - 0.045], [cx - 0.005, cy - 0.032], [cx - 0.005, cy + 0.05], [cx - 0.085, cy + 0.037]]); poly("#ffffff", [[cx + 0.085, cy - 0.045], [cx + 0.005, cy - 0.032], [cx + 0.005, cy + 0.05], [cx + 0.085, cy + 0.037]]); disc(skin, pose.ha[0], pose.ha[1] + 0.02, 0.03); disc(skin, hx, hy + 0.02, 0.03); }
  if (d.hold === "flower") { const [hx, hy] = pose.hb; line("#16a34a", 0.016, [[hx, hy + 0.03], [hx + 0.01, hy - 0.14]]); for (let i = 0; i < 6; i += 1) { const a = (i * Math.PI) / 3; disc("#f472b6", hx + 0.01 + Math.cos(a) * 0.036, hy - 0.16 + Math.sin(a) * 0.036, 0.024); } disc("#f5d90a", hx + 0.01, hy - 0.16, 0.022); disc(skin, hx, hy, 0.03); }
  if (d.hold === "flag") { const [hx, hy] = pose.hb, fl = beat(live, 1.3) * 0.025; line("#7a5230", 0.016, [[hx, hy + 0.04], [hx + 0.01, hy - 0.2]]); g.fillStyle = d.holdc; g.beginPath(); g.moveTo(hx + 0.01, hy - 0.2); g.quadraticCurveTo(hx + 0.08, hy - 0.23 + fl, hx + 0.17, hy - 0.19 - fl); g.lineTo(hx + 0.17, hy - 0.09 - fl); g.quadraticCurveTo(hx + 0.08, hy - 0.13 + fl, hx + 0.01, hy - 0.1); g.fill(); disc(skin, hx, hy, 0.03); }
  if (d.hold === "umbrella") { const [hx, hy] = pose.hb; line("#4b5563", 0.016, [[hx, hy + 0.05], [hx, hy - 0.3]]); g.fillStyle = d.holdc; g.beginPath(); g.arc(hx, hy - 0.27, 0.23, Math.PI, 0); g.quadraticCurveTo(hx + 0.17, hy - 0.31, hx + 0.115, hy - 0.27); g.quadraticCurveTo(hx + 0.06, hy - 0.31, hx, hy - 0.27); g.quadraticCurveTo(hx - 0.06, hy - 0.31, hx - 0.115, hy - 0.27); g.quadraticCurveTo(hx - 0.17, hy - 0.31, hx - 0.23, hy - 0.27); g.fill(); disc(skin, hx, hy, 0.03); }
  if (d.hold === "glass") { const [hx, hy] = pose.hb; line("#7a5230", 0.022, [[hx, hy + 0.02], [hx + 0.03, hy - 0.06]]); g.fillStyle = "rgba(190,230,255,0.75)"; g.strokeStyle = "#374151"; g.lineWidth = 0.016; g.beginPath(); g.arc(hx + 0.055, hy - 0.115, 0.058, 0, Math.PI * 2); g.fill(); g.stroke(); }
  if (d.hold === "brush") { const [hx, hy] = pose.hb; line("#7a5230", 0.016, [[hx - 0.01, hy + 0.03], [hx + 0.05, hy - 0.12]]); line("#e5484d", 0.03, [[hx + 0.05, hy - 0.12], [hx + 0.065, hy - 0.16]]); const [px, py] = pose.ha; g.fillStyle = "#d6b38a"; g.beginPath(); g.ellipse(px - 0.02, py + 0.01, 0.075, 0.055, 0.3, 0, Math.PI * 2); g.fill(); [["#e5484d", -0.05, -0.01], ["#3b82f6", -0.02, -0.025], ["#f5d90a", 0.01, -0.005], ["#2fb36d", -0.03, 0.03]].forEach(([c, dx, dy]) => disc(c, px + dx, py + dy, 0.014)); }
  if (d.hold === "trident") { const [hx, hy] = pose.hb; line("#f5c518", 0.02, [[hx, 0.42], [hx, hy - 0.3]]); line("#f5c518", 0.018, [[hx - 0.06, hy - 0.36], [hx - 0.06, hy - 0.27], [hx + 0.06, hy - 0.27], [hx + 0.06, hy - 0.36]]); line("#f5c518", 0.018, [[hx, hy - 0.27], [hx, hy - 0.39]]); disc(skin, hx, hy, 0.03); }
  if (d.hold === "sword") { const [hx, hy] = pose.hb; line("#d1d5db", 0.026, [[hx, hy], [hx + 0.05, hy - 0.32]]); line("#8b5a2b", 0.03, [[hx - 0.045, hy - 0.035], [hx + 0.055, hy - 0.02]]); }
  if (d.ears) { poly(skin, [[-0.125, -0.37], [-0.2, -0.43], [-0.13, -0.31]]); poly(skin, [[0.125, -0.37], [0.2, -0.43], [0.13, -0.31]]); }
  // head, hair on top, face
  disc(skin, HEAD[0], HEAD[1], R);
  const cap = (c, lift = 0) => { g.fillStyle = c; g.beginPath(); g.arc(HEAD[0], HEAD[1] - lift, R * 1.04, Math.PI * 1.02, Math.PI * 1.98); g.quadraticCurveTo(0, HEAD[1] - R * 0.55 - lift, -R * 1.03, HEAD[1] - 0.008 - lift); g.fill(); };
  if (["short", "bunches", "bun", "braids", "long", "ponytail", "puffs", "bob", "locs"].includes(d.hair)) cap(hair);
  if (d.hair === "puffs") { disc(hair, -0.125, -0.47, 0.078); disc(hair, 0.125, -0.47, 0.078); }
  if (d.hair === "turban") { g.fillStyle = d.scarf; g.beginPath(); g.ellipse(HEAD[0], HEAD[1] - 0.075, R * 1.16, R * 0.86, 0, Math.PI * 0.98, Math.PI * 2.02); g.quadraticCurveTo(0, HEAD[1] - 0.105, -R * 1.16, HEAD[1] - 0.068); g.fill(); g.strokeStyle = "rgba(255,255,255,0.35)"; g.lineWidth = 0.012; g.beginPath(); g.moveTo(-0.1, -0.44); g.quadraticCurveTo(0, -0.52, 0.1, -0.44); g.stroke(); }
  if (d.hair === "curly") { for (let i = 0; i < 7; i += 1) { const a = Math.PI * (1.05 + (i * 0.9) / 6); disc(hair, HEAD[0] + Math.cos(a) * R * 0.98, HEAD[1] + Math.sin(a) * R * 0.98, R * 0.36); } }
  if (d.hair === "bunches") { disc(hair, -0.165, -0.33, 0.062); disc(hair, 0.165, -0.33, 0.062); }
  if (d.hair === "bun") disc(hair, 0, -0.5, 0.06);
  if (d.hair === "spiky") { g.fillStyle = hair; g.beginPath(); g.arc(HEAD[0], HEAD[1], R * 1.03, Math.PI * 1.02, Math.PI * 1.98); g.fill(); for (let i = 0; i < 6; i += 1) { const a = Math.PI * (1.12 + i * 0.152), a2 = a + 0.076 * Math.PI; poly(hair, [[Math.cos(a - 0.2) * R * 0.98, HEAD[1] + Math.sin(a - 0.2) * R * 0.98], [Math.cos(a2 - 0.24) * R * 1.5, HEAD[1] + Math.sin(a2 - 0.24) * R * 1.5], [Math.cos(a + 0.3) * R * 0.98, HEAD[1] + Math.sin(a + 0.3) * R * 0.98]]); } g.fillStyle = skin; g.beginPath(); g.ellipse(HEAD[0], HEAD[1] + 0.03, R * 0.93, R * 0.9, 0, 0, Math.PI * 2); g.fill(); }
  if (d.hair === "mohawk") { g.fillStyle = hair; g.beginPath(); g.ellipse(0, HEAD[1] - R * 0.98, 0.04, 0.085, 0, 0, Math.PI * 2); g.fill(); for (const dx of [-0.035, 0, 0.035]) poly(hair, [[dx - 0.03, HEAD[1] - R], [dx + 0.005, HEAD[1] - R - 0.12], [dx + 0.03, HEAD[1] - R]]); }
  if (d.hair === "thin") { g.strokeStyle = hair; g.lineWidth = 0.03; g.beginPath(); g.arc(HEAD[0], HEAD[1], R * 0.98, Math.PI * 1.03, Math.PI * 1.3); g.stroke(); g.beginPath(); g.arc(HEAD[0], HEAD[1], R * 0.98, Math.PI * 1.7, Math.PI * 1.97); g.stroke(); }
  if (d.hair === "scarf") { g.fillStyle = d.scarf; g.beginPath(); g.arc(HEAD[0], HEAD[1], R * 1.12, Math.PI * 0.95, Math.PI * 2.05); g.quadraticCurveTo(0.1, -0.5, 0, -0.46); g.quadraticCurveTo(-0.1, -0.5, -R * 1.12, HEAD[1] + 0.02); g.fill(); disc(skin, HEAD[0], HEAD[1] + 0.012, R * 0.86, R * 0.92); line(d.scarf, 0.05, [[-0.1, -0.215], [0.1, -0.215]]); }
  if (d.hair === "cap") { cap(hair, -0.01); g.fillStyle = d.cap; g.beginPath(); g.arc(HEAD[0], HEAD[1] - 0.03, R * 1.06, Math.PI, 0); g.fill(); line(d.cap, 0.035, [[0.08, HEAD[1] - 0.035], [0.24, HEAD[1] - 0.03]]); }
  const top = HEAD[1] - R; // the top of the head
  if (d.hat === "santa") { poly("#d62839", [[-0.14, top + 0.05], [0.14, top + 0.05], [0.2, top - 0.02], [0.06, top - 0.13]]); line("#ffffff", 0.055, [[-0.14, top + 0.055], [0.14, top + 0.055]]); disc("#ffffff", 0.2, top - 0.01, 0.042); }
  if (d.hat === "cone") { poly(d.hatc, [[-0.15, top + 0.07], [0.15, top + 0.07], [0.02, top - 0.27]]); }
  if (d.hat === "fire") { g.fillStyle = "#d62839"; g.beginPath(); g.arc(HEAD[0], HEAD[1] - 0.03, R * 1.08, Math.PI, 0); g.fill(); line("#d62839", 0.04, [[-0.2, top + 0.105], [0.17, top + 0.105]]); poly("#f5d90a", [[-0.035, top + 0.09], [0.035, top + 0.09], [0.025, top + 0.02], [-0.025, top + 0.02]]); }
  if (d.hat === "hardhat") { g.fillStyle = "#facc15"; g.beginPath(); g.arc(HEAD[0], HEAD[1] - 0.03, R * 1.06, Math.PI, 0); g.fill(); line("#facc15", 0.035, [[-0.15, top + 0.105], [0.21, top + 0.105]]); line("#ca8a04", 0.012, [[0, top - 0.035], [0, top + 0.09]]); }
  if (d.hat === "viking") { g.fillStyle = "#9ca3af"; g.beginPath(); g.arc(HEAD[0], HEAD[1] - 0.03, R * 1.06, Math.PI, 0); g.fill(); line("#6b7280", 0.03, [[-0.145, top + 0.105], [0.145, top + 0.105]]); for (const sx of [-1, 1]) { g.fillStyle = "#fff4c2"; g.beginPath(); g.moveTo(sx * 0.12, top + 0.06); g.quadraticCurveTo(sx * 0.24, top + 0.04, sx * 0.22, top - 0.1); g.quadraticCurveTo(sx * 0.17, top - 0.01, sx * 0.1, top + 0.0); g.fill(); } }
  if (d.hat === "elf") { poly("#2fb36d", [[-0.14, top + 0.06], [0.14, top + 0.06], [0.03, top - 0.2]]); line("#d62839", 0.04, [[-0.14, top + 0.06], [0.14, top + 0.06]]); disc("#f5d90a", 0.03, top - 0.2, 0.03); }
  if (d.hat === "pirate") { g.fillStyle = "#111827"; g.beginPath(); g.moveTo(-0.22, top + 0.06); g.quadraticCurveTo(0, top - 0.2, 0.22, top + 0.06); g.quadraticCurveTo(0, top + 0.01, -0.22, top + 0.06); g.fill(); disc("#ffffff", 0, top - 0.035, 0.03); line("#ffffff", 0.012, [[-0.035, top - 0.005], [0.035, top - 0.065]]); line("#ffffff", 0.012, [[-0.035, top - 0.065], [0.035, top - 0.005]]); }
  if (d.hat === "crown") { poly("#f5c518", [[-0.115, top + 0.05], [-0.115, top - 0.08], [-0.058, top - 0.02], [0, top - 0.1], [0.058, top - 0.02], [0.115, top - 0.08], [0.115, top + 0.05]]); disc("#d62839", 0, top + 0.01, 0.018); disc("#2563eb", -0.07, top + 0.015, 0.014); disc("#2563eb", 0.07, top + 0.015, 0.014); }
  if (d.hat === "wizard" || d.hat === "witch") { const c = d.hat === "wizard" ? "#5b3fd1" : "#1f1830"; poly(c, [[-0.13, top + 0.07], [0.13, top + 0.07], [0.05, top - 0.3]]); line(c, 0.045, [[-0.23, top + 0.075], [0.23, top + 0.075]]); if (d.hat === "wizard") { disc("#f5d90a", 0.02, top - 0.07, 0.022); disc("#f5d90a", -0.04, top + 0.0, 0.014); } else line("#7c3aed", 0.03, [[-0.12, top + 0.04], [0.12, top + 0.04]]); }
  if (d.hat === "helmet") { g.fillStyle = "#9ca3af"; g.beginPath(); g.arc(HEAD[0], HEAD[1], R * 1.1, 0, Math.PI * 2); g.fill(); g.fillStyle = "#1f2937"; g.fillRect(-0.1, -0.375, 0.2, 0.05); line("#6b7280", 0.02, [[0, -0.33], [0, -0.22]]); line("#d62839", 0.05, [[0, top - 0.01], [0.04, top - 0.1]]); }
  if (d.hat === "astro") { g.strokeStyle = "rgba(255,255,255,0.8)"; g.lineWidth = 0.02; g.beginPath(); g.arc(HEAD[0], HEAD[1], R * 1.24, Math.PI * 1.15, Math.PI * 1.45); g.stroke(); }
  if (d.hat === "cowboy") { g.fillStyle = d.hatc || "#8b5a2b"; g.beginPath(); g.ellipse(0, top + 0.05, 0.25, 0.04, 0, 0, Math.PI * 2); g.fill(); g.beginPath(); g.moveTo(-0.11, top + 0.05); g.quadraticCurveTo(-0.1, top - 0.11, 0, top - 0.08); g.quadraticCurveTo(0.1, top - 0.11, 0.11, top + 0.05); g.fill(); line("#5b3a1c", 0.02, [[-0.105, top + 0.02], [0.105, top + 0.02]]); }
  if (d.hat === "chef") { g.fillStyle = "#ffffff"; g.strokeStyle = "#9ca3af"; g.lineWidth = 0.01; g.beginPath(); g.moveTo(-0.1, top + 0.06); g.lineTo(-0.1, top - 0.08); g.arc(-0.07, top - 0.1, 0.06, Math.PI * 0.7, Math.PI * 1.6); g.arc(0, top - 0.13, 0.065, Math.PI * 1.1, Math.PI * 1.9); g.arc(0.07, top - 0.1, 0.06, Math.PI * 1.4, Math.PI * 0.3); g.lineTo(0.1, top + 0.06); g.closePath(); g.fill(); g.stroke(); }
  if (d.hat === "tophat") { const h = d.low ? 0.1 : 0.2; g.fillStyle = d.hatc; g.fillRect(-0.1, top + 0.05 - h, 0.2, h); g.beginPath(); g.ellipse(0, top + 0.05, 0.19, 0.028, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = d.buckle ? "#111827" : "rgba(255,255,255,0.28)"; g.fillRect(-0.1, top - 0.005, 0.2, 0.035); if (d.buckle) { g.fillStyle = "#f5c518"; g.fillRect(-0.025, top - 0.012, 0.05, 0.048); g.fillStyle = "#111827"; g.fillRect(-0.011, top + 0.001, 0.022, 0.022); } }
  if (d.hat === "beanie") { g.fillStyle = d.hatc; g.beginPath(); g.arc(HEAD[0], HEAD[1] - 0.02, R * 1.08, Math.PI, 0); g.fill(); line("rgba(255,255,255,0.55)", 0.04, [[-0.14, top + 0.115], [0.14, top + 0.115]]); disc("#ffffff", 0, top - 0.03, 0.04); }
  if (d.hat === "party") { poly(d.hatc, [[-0.085, top + 0.05], [0.085, top + 0.05], [0, top - 0.2]]); for (const [dx, dy, c] of [[-0.02, 0, "#f5d90a"], [0.03, -0.04, "#7dd3fc"], [0, -0.1, "#ffffff"]]) disc(c, dx, top + dy, 0.014); disc("#f5d90a", 0, top - 0.2, 0.028); }
  if (d.hat === "peak") { g.fillStyle = d.hatc; g.beginPath(); g.moveTo(-0.13, top + 0.06); g.lineTo(-0.15, top - 0.04); g.quadraticCurveTo(0, top - 0.11, 0.15, top - 0.04); g.lineTo(0.13, top + 0.06); g.closePath(); g.fill(); line("#111827", 0.03, [[-0.13, top + 0.075], [0.19, top + 0.085]]); disc("#f5c518", 0, top - 0.005, 0.024); }
  if (d.hat === "sailor") { g.fillStyle = "#ffffff"; g.strokeStyle = "#9ca3af"; g.lineWidth = 0.01; g.beginPath(); g.moveTo(-0.125, top + 0.07); g.lineTo(-0.15, top - 0.02); g.quadraticCurveTo(0, top - 0.07, 0.15, top - 0.02); g.lineTo(0.125, top + 0.07); g.closePath(); g.fill(); g.stroke(); line("#1e3a8a", 0.02, [[-0.125, top + 0.045], [0.125, top + 0.045]]); }
  if (d.hat === "pith") { g.fillStyle = d.hatc; g.beginPath(); g.arc(HEAD[0], HEAD[1] - 0.04, R * 1.08, Math.PI, 0); g.fill(); g.beginPath(); g.ellipse(0, top + 0.095, 0.2, 0.03, 0, 0, Math.PI * 2); g.fill(); line("#7a5230", 0.02, [[-0.14, top + 0.07], [0.14, top + 0.07]]); }
  if (d.hat === "beret") { g.fillStyle = d.hatc; g.beginPath(); g.ellipse(-0.02, top + 0.035, 0.17, 0.065, -0.12, 0, Math.PI * 2); g.fill(); line(d.hatc, 0.016, [[0, top - 0.02], [0.01, top - 0.06]]); }
  if (d.hat === "grad") { g.fillStyle = "#111827"; g.fillRect(-0.1, top + 0.0, 0.2, 0.07); poly("#111827", [[-0.2, top - 0.01], [0, top - 0.06], [0.2, top - 0.01], [0, top + 0.04]]); line("#f5c518", 0.012, [[0, top - 0.01], [0.16, top + 0.0], [0.16, top + 0.1]]); disc("#f5c518", 0.16, top + 0.11, 0.016); }
  if (d.hat === "bunny") { for (const sx of [-1, 1]) { g.fillStyle = "#ffffff"; g.strokeStyle = "#b6c2d1"; g.lineWidth = 0.01; g.beginPath(); g.ellipse(sx * 0.07, top - 0.08, 0.04, 0.13, sx * 0.14, 0, Math.PI * 2); g.fill(); g.stroke(); g.fillStyle = "#f9a8d4"; g.beginPath(); g.ellipse(sx * 0.07, top - 0.07, 0.018, 0.09, sx * 0.14, 0, Math.PI * 2); g.fill(); } g.fillStyle = "#ffffff"; g.beginPath(); g.arc(HEAD[0], HEAD[1], R * 1.06, Math.PI * 0.92, Math.PI * 2.08); g.fill(); g.stroke(); g.fillStyle = skin; g.beginPath(); g.ellipse(0, HEAD[1] + 0.02, R * 0.84, R * 0.86, 0, 0, Math.PI * 2); g.fill(); }
  if (d.hat === "jester") { for (const [sx, c] of [[-1, "#d62839"], [1, "#2563eb"]]) { g.fillStyle = c; g.beginPath(); g.moveTo(0, top + 0.07); g.lineTo(sx * 0.13, top + 0.07); g.quadraticCurveTo(sx * 0.2, top - 0.08, sx * 0.27, top + 0.0); g.quadraticCurveTo(sx * 0.14, top - 0.12, 0, top - 0.04); g.fill(); disc("#f5c518", sx * 0.27, top + 0.01, 0.026); } line("#f5c518", 0.03, [[-0.13, top + 0.075], [0.13, top + 0.075]]); }
  if (d.hat === "halo") { g.strokeStyle = "#f5c518"; g.lineWidth = 0.022; g.beginPath(); g.ellipse(0, top - 0.05, 0.11, 0.03, 0, 0, Math.PI * 2); g.stroke(); }
  if (d.hat === "ninja") { g.fillStyle = "#1f2937"; g.beginPath(); g.arc(HEAD[0], HEAD[1], R * 1.07, 0, Math.PI * 2); g.fill(); g.fillStyle = skin; g.beginPath(); g.ellipse(0, -0.347, 0.105, 0.034, 0, 0, Math.PI * 2); g.fill(); line("#d62839", 0.022, [[-0.13, -0.4], [-0.21, -0.36]]); }
  if (d.mask) { g.strokeStyle = d.mask; g.lineWidth = 0.055; g.beginPath(); g.moveTo(-0.115, -0.347); g.lineTo(0.115, -0.347); g.stroke(); disc("#ffffff", -0.05, -0.345, 0.024); disc("#ffffff", 0.05, -0.345, 0.024); }
  if (d.bigbeard) { g.fillStyle = d.bigbeard; g.beginPath(); g.moveTo(-0.128, -0.33); g.quadraticCurveTo(-0.15, -0.16, 0, -0.1); g.quadraticCurveTo(0.15, -0.16, 0.128, -0.33); g.quadraticCurveTo(0.06, -0.27, 0, -0.29); g.quadraticCurveTo(-0.06, -0.27, -0.128, -0.33); g.fill(); g.strokeStyle = "#9ca3af"; g.lineWidth = 0.008; g.stroke(); }
  if (d.beard) { g.strokeStyle = hair; g.lineWidth = 0.05; g.beginPath(); g.arc(HEAD[0], HEAD[1] + 0.01, R * 0.82, Math.PI * 0.12, Math.PI * 0.88); g.stroke(); }
  const dark = fig.sk >= 4 ? "#1a1210" : "#2b1d16";
  if (d.hat !== "helmet") { disc(dark, -0.05, -0.345, 0.016); disc(dark, 0.05, -0.345, 0.016); }
  if (d.patch) { disc("#111827", 0.05, -0.345, 0.036); line("#111827", 0.012, [[-0.12, -0.41], [0.13, -0.36]]); }
  if (!d.nomouth && d.hat !== "helmet") { g.strokeStyle = d.bigbeard ? "#b4534b" : dark; g.lineWidth = 0.014; g.beginPath(); g.arc(0, d.bigbeard ? -0.3 : -0.315, d.bigbeard ? 0.034 : 0.05, Math.PI * 0.18, Math.PI * 0.82); g.stroke(); }
  if (d.nose) disc("#e5484d", 0, -0.322, 0.03);
  if (d.fangs) { poly("#ffffff", [[-0.03, -0.272], [-0.012, -0.272], [-0.021, -0.245]]); poly("#ffffff", [[0.012, -0.272], [0.03, -0.272], [0.021, -0.245]]); }
  if (d.crutch) for (const hnd of [pose.ha, pose.hb]) { const sx = Math.sign(hnd[0]) || 1; line("#9ca3af", 0.02, [[hnd[0] - sx * 0.02, hnd[1] - 0.16], [hnd[0] + sx * 0.02, 0.47]]); line("#6b7280", 0.026, [[hnd[0] - sx * 0.045, hnd[1] - 0.16], [hnd[0] + sx * 0.005, hnd[1] - 0.16]]); line("#6b7280", 0.024, [[hnd[0] - sx * 0.03, hnd[1]], [hnd[0] + sx * 0.03, hnd[1]]]); disc(skin, hnd[0], hnd[1], 0.03); }
  if (d.cane) { line("#f4f4f5", 0.022, [pose.ha, [pose.ha[0] + 0.2, 0.47]]); line("#e5484d", 0.024, [[pose.ha[0] + 0.17, 0.42], [pose.ha[0] + 0.2, 0.47]]); disc(skin, pose.ha[0], pose.ha[1], 0.036); }
  if (d.ball) { const by = 0.37 - Math.abs(beat(live, 1.4)) * 0.13; // the ball bounces
    disc("#ffffff", 0.4, by, 0.065); g.strokeStyle = "#1f2937"; g.lineWidth = 0.012; g.beginPath(); g.arc(0.4, by, 0.065, 0, Math.PI * 2); g.stroke(); disc("#1f2937", 0.4, by, 0.022); }
  if (d.specs) { g.strokeStyle = "#374151"; g.lineWidth = 0.012; g.beginPath(); g.arc(-0.05, -0.345, 0.034, 0, Math.PI * 2); g.moveTo(0.084, -0.345); g.arc(0.05, -0.345, 0.034, 0, Math.PI * 2); g.moveTo(-0.016, -0.345); g.lineTo(0.016, -0.345); g.stroke(); }
  g.restore();
}
