// Draw & Animate: hand-drawn people. Each is a simple cartoon figure drawn by drawPerson() from a few choices:
// a pose, a hairstyle, clothes, and (chosen by the child) one of six skin tones and a hair colour.
// A person on a drawing is stored as { fig: id, sk: skin index, hc: hair index or -1 for the figure's own, w: height, p: [x, y] },
// with tc and bc (top and bottom clothing colours) when the child chose their own.
// Figures that move (walking, running, the wheelchair) are drawn facing right.

import { ANIMALS, drawAnimal, sideOf } from "./animals.js";
import { THINGS, drawThing } from "./things.js";
import { hop } from "./engine.js";
export { ANIMALS, THINGS };

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
  // `still` poses keep their arms where they are when the figure travels: the hands are busy holding something
  stick: { ha: [-0.2, 0.1], ea: [-0.19, -0.04], hb: [0.24, 0.1], eb: [0.2, -0.04], ka: [-0.07, 0.3], fa: [-0.07, 0.46], kb: [0.07, 0.3], fb: [0.07, 0.46], still: true },
  cradle: { ha: [-0.05, 0.075], ea: [-0.19, 0.01], hb: [0.1, 0.08], eb: [0.2, 0.02], ka: [-0.07, 0.3], fa: [-0.07, 0.46], kb: [0.07, 0.3], fb: [0.07, 0.46], still: true },
  push: { ha: [0.24, 0.08], ea: [0.1, -0.03], hb: [0.27, 0.05], eb: [0.15, -0.07], ka: [-0.07, 0.3], fa: [-0.15, 0.45], kb: [0.09, 0.29], fb: [0.15, 0.45], still: true },
  box: { ha: [-0.1, -0.2], ea: [-0.2, -0.02], hb: [0.32, -0.17], eb: [0.2, -0.06], ka: [-0.1, 0.3], fa: [-0.15, 0.46], kb: [0.1, 0.3], fb: [0.16, 0.46] },
  fly: { ha: [-0.22, 0.1], ea: [-0.2, -0.04], hb: [0.3, -0.44], eb: [0.22, -0.24], ka: [-0.09, 0.3], fa: [-0.2, 0.42], kb: [0.02, 0.3], fb: [-0.08, 0.44] },
  yoga: { ha: [-0.015, -0.52], ea: [-0.17, -0.3], hb: [0.015, -0.52], eb: [0.17, -0.3], ka: [-0.06, 0.3], fa: [-0.06, 0.46], kb: [0.22, 0.2], fb: [-0.01, 0.27], still: true },
  phone: { ha: [-0.2, 0.1], ea: [-0.19, -0.04], hb: [0.14, -0.3], eb: [0.25, -0.1], ka: [-0.07, 0.3], fa: [-0.07, 0.46], kb: [0.07, 0.3], fb: [0.07, 0.46], still: true },
  lift: { ha: [-0.26, -0.46], ea: [-0.22, -0.26], hb: [0.26, -0.46], eb: [0.22, -0.26], ka: [-0.1, 0.3], fa: [-0.14, 0.46], kb: [0.1, 0.3], fb: [0.14, 0.46], still: true },
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
  { id: "gran2", name: "Grandma with a walking stick", pose: "stick", hair: "bun", hc: 5, top: "#a78bfa", bot: "#6b7280", kind: "skirt", specs: true, stick: true },
  { id: "grandad2", name: "Grandad with a walking stick", pose: "stick", hair: "thin", hc: 5, top: "#0d9488", bot: "#57534e", kind: "long", hat: "flat", hatc: "#78716c", beard: true, stick: true },
  { id: "frame1", name: "Walking with a walking frame", pose: "push", hair: "curly", hc: 5, top: "#f472b6", bot: "#374151", kind: "long", specs: true, frame: true },
  { id: "mum1", name: "Mother holding a baby", pose: "cradle", hair: "long", hc: 1, top: "#14b8a6", bot: "#374151", kind: "long", baby: "#fde68a" },
  { id: "mum2", name: "Mother holding a baby, headscarf", pose: "cradle", hair: "scarf", hc: 0, top: "#f59e0b", bot: "#7c3aed", kind: "skirt", scarf: "#be185d", baby: "#bfdbfe" },
  { id: "dad1", name: "Father holding a baby", pose: "cradle", hair: "short", hc: 0, top: "#3b82f6", bot: "#1f2937", kind: "long", beard: true, baby: "#fbcfe8" },
  { id: "pram1", name: "Pushing a stroller", pose: "push", hair: "ponytail", hc: 2, top: "#ef4444", bot: "#1e40af", kind: "long", pram: "#22c55e" },
  { id: "bump1", name: "Expecting a baby", pose: "hips", hair: "bob", hc: 0, top: "#f472b6", bot: "#374151", kind: "long", bump: true },
  { id: "toddler1", name: "Toddler with a teddy", pose: "hold", hair: "curly", hc: 1, top: "#fde047", bot: "#3b82f6", kind: "short", hold: "teddy", fit: 0.66 },
  { id: "bags1", name: "Carrying shopping bags", pose: "stand", hair: "puffs", hc: 0, top: "#22c55e", bot: "#1f2937", kind: "long", hold: "bags" },
  { id: "pack1", name: "Walking with a backpack", pose: "walk", hair: "braids", hc: 0, top: "#f97316", bot: "#374151", kind: "short", pack: "#2563eb" },
  { id: "phone1", name: "Talking on the phone", pose: "phone", hair: "locs", hc: 0, top: "#8b5cf6", bot: "#1f2937", kind: "long", hold: "phone" },
  { id: "music1", name: "Dancing with headphones", pose: "dance", hair: "short", hc: 2, top: "#06b6d4", bot: "#f59e0b", kind: "short", hat: "phones", hatc: "#ef4444" },
  { id: "yoga1", name: "Doing yoga", pose: "yoga", hair: "bun", hc: 1, top: "#a3e635", bot: "#7c3aed", kind: "long" },
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
  { id: "boxer", name: "Boxer", pose: "box", hair: "short", hc: 0, top: "#dc2626", bot: "#1d4ed8", kind: "short", gloves: "#dc2626", belt: "#fde047" },
  { id: "boxer2", name: "Boxer, braids", pose: "box", hair: "braids", hc: 0, top: "#1d4ed8", bot: "#111827", kind: "short", gloves: "#2563eb", belt: "#fde047" },
  { id: "karate", name: "Karate kid", pose: "kick", hair: "ponytail", hc: 0, top: "#e2e8f0", bot: "#e2e8f0", kind: "long", outline: true, belt: "#111827" },
  { id: "basketball", name: "Basketball player", pose: "throw", hair: "short", hc: 0, top: "#f97316", bot: "#1f2937", kind: "short", hold: "ball", stripes: "#ffffff" },
  { id: "tennis", name: "Tennis player", pose: "wave", hair: "ponytail", hc: 3, top: "#f8fafc", bot: "#22c55e", kind: "skirt", outline: true, hold: "racket", hat: "band", hatc: "#ef4444" },
  { id: "swimmer", name: "Swimmer", pose: "cheer", hair: "none", hc: 0, top: "#0ea5e9", bot: "#0ea5e9", kind: "short", hat: "swim", hatc: "#fde047", goggles: true },
  { id: "lifter", name: "Weightlifter", pose: "lift", hair: "short", hc: 1, top: "#dc2626", bot: "#111827", kind: "short", hold: "barbell", belt: "#7a5230" },
  { id: "cheerleader", name: "Cheerleader", pose: "cheer", hair: "bunches", hc: 4, top: "#2563eb", bot: "#fde047", kind: "skirt", pom: "#fde047", stripes: "#fde047" },
  { id: "referee", name: "Referee", pose: "point", hair: "short", hc: 5, top: "#111827", bot: "#111827", kind: "short", stripes: "#f8fafc", hold: "card" },
  { id: "gardener", name: "Gardener", pose: "hold", hair: "bob", hc: 5, top: "#65a30d", bot: "#78716c", kind: "long", hat: "cowboy", hatc: "#e2b653", apron: true, hold: "can", fit: 0.94 },
  { id: "fisher", name: "Fishing", pose: "hold", hair: "short", hc: 2, top: "#f59e0b", bot: "#0f766e", kind: "long", hat: "beanie", hatc: "#0f766e", hold: "rod" },
  { id: "singer", name: "Singer", pose: "phone", hair: "curly", hc: 0, top: "#db2777", bot: "#111827", kind: "skirt", hold: "mic", dots: "#fde047" },
  { id: "guitarist", name: "Guitarist", pose: "cradle", hair: "long", hc: 0, top: "#111827", bot: "#1e3a8a", kind: "long", hold: "guitar" },
  { id: "waiter", name: "Waiter", pose: "hold", hair: "bun", hc: 1, top: "#f8fafc", bot: "#111827", kind: "long", outline: true, bow: "#111827", apron: true, hold: "tray" },
  { id: "bride", name: "Bride", pose: "hold", hair: "long", hc: 0, top: "#ffffff", bot: "#ffffff", kind: "robe", outline: true, veil: true, hold: "flower", fit: 0.94 },
  { id: "groom", name: "Groom", pose: "hips", hair: "short", hc: 0, top: "#1f2937", bot: "#1f2937", kind: "long", bow: "#f8fafc", emblem: "#f472b6" },
  { id: "mummy", name: "Mummy", pose: "reach", hair: "none", hc: 0, top: "#e7e5e4", bot: "#e7e5e4", kind: "long", skinc: "#e7e5e4", wraps: true, outline: true },
  { id: "flyhero", name: "Flying superhero", pose: "fly", hair: "long", hc: 4, top: "#dc2626", bot: "#1d4ed8", kind: "long", back: "cape", backc: "#fde047", mask: "#111827", emblem: "#fde047" },
  { id: "mail", name: "Mail carrier", pose: "walk", hair: "short", hc: 4, top: "#38bdf8", bot: "#1e3a8a", kind: "short", hat: "peak", hatc: "#1e3a8a", satchel: "#92400e" },
  { id: "chef", name: "Chef", pose: "point", hair: "short", hc: 1, top: "#f8fafc", bot: "#374151", kind: "long", hat: "chef", apron: true, outline: true, fit: 0.84 },
];
export const personById = (id) => PEOPLE.find((x) => x.id === id) || CHARACTERS.find((x) => x.id === id) || ANIMALS.find((x) => x.id === id) || THINGS.find((x) => x.id === id) || PEOPLE[0];

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
function livePose(base, live, gait) {
  if (!live) return base;
  if (gait === "jump" && hop(live.t) > 0.12) { const j = P.jump, arms = { ha: j.ha, ea: j.ea, hb: j.hb, eb: j.eb }, legs = { ka: j.ka, fa: j.fa, kb: j.kb, fb: j.fb }; return base.chair ? { ...base, ...arms } : base.still ? { ...base, ...legs } : { ...base, ...j }; } // in the air
  const s = Math.sin(live.t * TAU * 1.4), c = Math.cos(live.t * TAU * 1.4), p = { ...base };
  const turn = (e, hand, by) => { const dx = hand[0] - e[0], dy = hand[1] - e[1], ca = Math.cos(by), sa = Math.sin(by); return [e[0] + dx * ca - dy * sa, e[1] + dx * sa + dy * ca]; };
  const arm = (e, hand, k) => { // k runs from -1 to 1 through the step
    if (base.still) return [e, hand];
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

// ---------- seen from the side ----------
// A person travelling turns side-on, facing the way they go (right; the page mirrors them to go left), and steps
// the way people really do: each foot pushes back along the ground, lifts, and swings through to land in front, the
// knee bending forward, the body rising and dipping, each arm swinging forward with the opposite leg.
// Walking always has a foot on the ground; jogging and running spend part of each stride in the air.
const STRIDE = {
  walk: { rate: 1.2, duty: 0.6, A: 0.1, H: 0.05, kick: 0, bob: -0.012, arm: 0.42, elbow: 0.25 },
  jog: { rate: 1.55, duty: 0.45, A: 0.12, H: 0.09, kick: 0.04, bob: 0.016, arm: 0.6, elbow: 1.3 },
  run: { rate: 1.9, duty: 0.36, A: 0.16, H: 0.14, kick: 0.08, bob: 0.024, arm: 0.95, elbow: 1.6 },
};
const frac = (v) => v - Math.floor(v);
const HIP = [0, 0.1], SHOULDER = [0, -0.155], THIGH = 0.19, SHIN = 0.18, UPPER = 0.14, FORE = 0.13;
/** The knee of a leg from `hip` to `foot`, bending forward as a knee does (the foot is pulled in if it is out of reach). */
function knee(hip, foot) {
  let dx = foot[0] - hip[0], dy = foot[1] - hip[1], d = Math.hypot(dx, dy);
  const most = THIGH + SHIN - 0.002;
  if (d > most) { foot = [hip[0] + (dx * most) / d, hip[1] + (dy * most) / d]; dx = foot[0] - hip[0]; dy = foot[1] - hip[1]; d = most; }
  const a = Math.acos(Math.min(1, Math.max(-1, (THIGH * THIGH + d * d - SHIN * SHIN) / (2 * THIGH * d)))), at = Math.atan2(dy, dx);
  const k1 = [hip[0] + Math.cos(at - a) * THIGH, hip[1] + Math.sin(at - a) * THIGH], k2 = [hip[0] + Math.cos(at + a) * THIGH, hip[1] + Math.sin(at + a) * THIGH];
  return [k1[0] >= k2[0] ? k1 : k2, foot];
}
/** An arm hanging from the shoulder, swung `th` forward from straight down, its forearm bent `by` further forward. */
const armAt = (th, by) => { const e = [SHOULDER[0] + Math.sin(th) * UPPER, SHOULDER[1] + Math.cos(th) * UPPER]; return [e, [e[0] + Math.sin(th + by) * FORE, e[1] + Math.cos(th + by) * FORE]]; };
// arms that stay put while the figure travels side-on, because the hands are busy: [far arm, near arm] as [elbow, hand]
const BUSY = {
  stick: [null, [[0.07, -0.03], [0.16, 0.08]]],
  cradle: [[[0.03, 0.0], [0.12, 0.0]], [[0.04, 0.01], [0.14, 0.01]]],
  push: [[[0.12, -0.04], [0.25, 0.06]], [[0.13, -0.03], [0.26, 0.05]]],
  phone: [null, [[0.1, -0.12], [0.05, -0.29]]],
  lift: [[[0.03, -0.3], [0.04, -0.46]], [[0.04, -0.3], [0.05, -0.46]]],
  yoga: [[[0.02, -0.33], [0.02, -0.52]], [[0.03, -0.33], [0.03, -0.52]]],
};
/** The pose of a person seen from the side at one moment. `gait` is walk, jog, run, jump or fly; `d` is the person. */
function sidePose(name, live, gait, d) {
  const base = P[name], p = { side: true, bob: 0, tilt: 0 };
  let swing = [0, 0], bend = [0.25, 0.25]; // how far each arm swings forward, and its elbow bend: [far, near]
  if (gait === "jump") { // both feet together: crouch, spring up with the arms, tuck the legs, land
    const air = hop(live.t), q = frac(live.t * 1.1), crouch = q < 0.15 ? Math.sin((Math.PI * q) / 0.15) : 0;
    p.bob = crouch * 0.05;
    [p.ka, p.fa] = knee(HIP, [-0.035, 0.46 - p.bob - air * 0.1]); [p.kb, p.fb] = knee(HIP, [0.01, 0.46 - p.bob - air * 0.1]);
    swing = [2.1 * air - 0.7 * crouch, 2.2 * air - 0.7 * crouch]; bend = [0.15, 0.1]; // up and forward, clear of the face
  } else if (gait === "fly") { // stretched out, leaning into the wind: one arm reaching ahead, legs trailing
    const flap = Math.sin(live.t * Math.PI * 2 * 1.6) * 0.012;
    p.tilt = 1.2;
    [p.ka, p.fa] = knee(HIP, [-0.06, 0.45 + flap]); [p.kb, p.fb] = knee(HIP, [-0.01, 0.455 - flap]);
    swing = [0.25, 3.0]; bend = [0.2, 0.05];
  } else {
    const G = STRIDE[gait] || STRIDE.walk, q = frac(live.t * G.rate);
    const foot = (ph) => { // where a foot is through its stride: on the ground going back, then up and through to the front
      ph = frac(ph);
      if (ph < G.duty) return [G.A - (2 * G.A * ph) / G.duty, 0];
      const u = (ph - G.duty) / (1 - G.duty), e = u * u * (3 - 2 * u);
      return [-G.A + 2 * G.A * e - G.kick * Math.sin(Math.PI * u), G.H * Math.sin(Math.PI * u)];
    };
    const fb = foot(q), fa = foot(q + 0.5);
    p.bob = G.bob * Math.cos(4 * Math.PI * (q - G.duty / 2)); // up over the foot as it passes beneath (walking); down onto it (running)
    [p.kb, p.fb] = knee(HIP, [fb[0], 0.46 - p.bob - fb[1]]); [p.ka, p.fa] = knee(HIP, [fa[0], 0.46 - p.bob - fa[1]]);
    const holding = d.hold || d.gloves ? 0.35 : 1;
    swing = [(-G.arm * fa[0]) / G.A, (-G.arm * fb[0] * holding) / G.A]; // each arm goes forward as the leg on its side goes back
    bend = swing.map((th) => (G.elbow > 1 ? G.elbow : G.elbow + (0.35 * Math.max(0, th)) / G.arm));
  }
  [p.ea, p.ha] = armAt(swing[0], bend[0]); [p.eb, p.hb] = armAt(swing[1], bend[1]);
  if (gait === "fly") { p.eb = [0.03, -0.37]; p.hb = [0.05, -0.6]; } // the near arm reaches right out ahead, past the head
  if (gait !== "fly") { // arms the person is holding up or busy with stay that way
    const busy = BUSY[name];
    const up = (e, hd) => !["walk", "run", "skip"].includes(name) && hd[1] < e[1] - 0.04; // held up in the picture: a wave, a cheer, something held high
    // held up in front; a hand up above the shoulders is held out past the face, so it doesn't cover it
    const raise = (e, hd, k) => { const high = hd[1] < -0.25, ee = [high ? 0.17 : 0.1 + Math.abs(e[0]) * 0.1, Math.max(-0.26, e[1])], hh = [ee[0] + (high ? 0.05 : 0.07), hd[1]], a = 0.25 * k, c = Math.cos(a), sn = Math.sin(a); return [ee, [ee[0] + (hh[0] - ee[0]) * c - (hh[1] - ee[1]) * sn, ee[1] + (hh[0] - ee[0]) * sn + (hh[1] - ee[1]) * c]]; };
    const k = Math.sin(live.t * Math.PI * 2 * 1.4);
    if (busy && busy[0]) [p.ea, p.ha] = busy[0]; else if (up(base.ea, base.ha)) [p.ea, p.ha] = raise(base.ea, base.ha, -k);
    if (busy && busy[1]) [p.eb, p.hb] = busy[1]; else if (up(base.eb, base.hb)) [p.eb, p.hb] = raise(base.eb, base.hb, k);
  }
  return p;
}
/** A colour a little darker: the arm and leg on the far side are in the body's shadow. */
const dim = (c) => { if (typeof c !== "string" || !/^#[0-9a-f]{6}$/i.test(c)) return c; const n = parseInt(c.slice(1), 16), f = (v) => Math.round(v * 0.8).toString(16).padStart(2, "0"); return `#${f(n >> 16)}${f((n >> 8) & 255)}${f(n & 255)}`; };

/** Draws a person `h` pixels tall with its middle at the origin. `fig` is { fig: id, sk, hc }. `live` (optional) is
 *  { t, go } while an animation plays, and makes the figure move its arms and legs. */
export function drawPerson(g, fig, h, live = null) {
  const what = personById(fig.fig);
  if (what.custom) { g.save(); g.scale(h, h); g.lineCap = "round"; g.lineJoin = "round";
    const turned = what.custom === "animal" && !what.walk && live && live.go && sideOf(what.id); // a sitting animal gets up and walks side-on
    if (turned) drawAnimal(g, turned, fig.tc || turned.top, fig.bc || turned.bot, live);
    else if (what.custom === "animal") drawAnimal(g, what, fig.tc || what.top, fig.bc || what.bot, live); else if (what.custom === "thing") drawThing(g, what, fig.tc || what.top, fig.bc || what.bot, live); else OTHER[what.custom](g, fig.tc || what.top, fig.bc || what.bot, live); g.restore(); return; }
  const own = personById(fig.fig), d = { ...own, top: fig.tc || own.top, bot: fig.bc || own.bot };
  const gait = live ? live.gait || (d.pose === "run" ? "run" : d.pose === "fly" ? "fly" : "walk") : null;
  const side = !!(live && live.go && !P[d.pose].chair && d.kind !== "tail"); // travelling: seen from the side
  const pose = side ? sidePose(d.pose, live, gait, d) : livePose(P[d.pose], live, gait), skin = own.skinc || (SKINS[fig.sk] || SKINS[2])[0], hair = own.hairc || (HAIRS[fig.hc >= 0 ? fig.hc : d.hc] || HAIRS[0])[0];
  const limb = 0.062, HEAD = [0, -0.34], R = 0.135, sh = [0, -0.17], hipA = side ? HIP : [-0.06, 0.1], hipB = side ? HIP : [0.06, 0.1];
  g.save(); g.scale(h, h); g.lineCap = "round"; g.lineJoin = "round";
  if (d.fit) { g.translate(0, (1 - d.fit) * 0.46); g.scale(d.fit, d.fit); } // feet stay on the ground; the hat comes down inside the box
  if (side) { g.translate(0, pose.bob); if (pose.tilt) g.rotate(pose.tilt); } // rising and dipping with each step; a flyer leans right over
  const poly = (c, pts) => { g.fillStyle = c; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i += 1) g.lineTo(pts[i][0], pts[i][1]); g.closePath(); g.fill(); };
  const edge = () => { if (d.outline) { g.strokeStyle = "#9ca3af"; g.lineWidth = 0.01; g.stroke(); } }; // white clothes get a thin grey edge so they show on white paper
  const line = (c, w, pts) => { g.strokeStyle = c; g.lineWidth = w; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i += 1) g.lineTo(pts[i][0], pts[i][1]); g.stroke(); };
  const disc = (c, x, y, r, ry = r) => { g.fillStyle = c; g.beginPath(); g.ellipse(x, y, r, ry, 0, 0, Math.PI * 2); g.fill(); };
  const shoe = (f) => disc("#2b2f3a", f[0] + 0.02, f[1] + 0.012, 0.05, 0.028);
  const shade = (c, far) => (far && side ? dim(c) : c); // from the side, the far arm and leg are a little darker
  const arm = (e, hand, far) => { const sk = shade(skin, far); line(shade(d.top, far), limb, [side ? SHOULDER : [sh[0] + Math.sign(e[0] || 1) * 0.1, sh[1] + 0.02], e]); line(sk, limb * 0.9, [e, hand]); disc(sk, hand[0], hand[1], 0.036); };
  const leg = (hip, k, f, far) => {
    const sk = shade(skin, far), bt = shade(d.bot, far);
    if (d.kind === "long") line(bt, limb * 1.1, [hip, k, f]);
    else { line(sk, limb, [hip, k, f]); if (d.kind === "short") line(bt, limb * 1.25, [hip, [(hip[0] + k[0]) / 2, (hip[1] + k[1]) / 2]]); }
    shoe(f);
  };
  const sway = beat(live, 1.2) * 0.02, H0 = d.hair;
  if (side) { // what is behind someone seen from the side: hair down their back, a cape streaming out, one wing
    if (d.veil) { g.fillStyle = "rgba(255,255,255,0.85)"; g.strokeStyle = "#b6c2d1"; g.lineWidth = 0.01; g.beginPath(); g.moveTo(0.02, -0.47); g.quadraticCurveTo(-0.3, -0.35, -0.3 + sway, 0.3); g.lineTo(-0.08, 0.3); g.quadraticCurveTo(-0.12, -0.1, -0.02, -0.3); g.closePath(); g.fill(); g.stroke(); }
    if (d.pack) disc(d.pack, -0.13, -0.05, 0.075, 0.13);
    if (d.back === "cape") { const fl = beat(live, 1.6) * 0.03, out = gait === "run" || gait === "fly" ? 0.13 : gait === "jog" ? 0.08 : 0.03; poly(d.backc, [[-0.05, -0.2], [0.04, -0.2], [-0.1 - out + fl, 0.36], [-0.24 - out * 1.5 + fl, 0.3]]); }
    if (d.back === "wings") { g.save(); g.translate(-0.06, -0.12); g.rotate(-0.35 + beat(live, 2.2) * 0.35); g.fillStyle = d.backc; g.strokeStyle = "#93c5fd"; g.lineWidth = 0.012; g.beginPath(); g.ellipse(-0.11, -0.03, 0.14, 0.075, -0.25, 0, Math.PI * 2); g.fill(); g.stroke(); g.beginPath(); g.ellipse(-0.08, 0.07, 0.09, 0.05, 0.4, 0, Math.PI * 2); g.fill(); g.stroke(); g.restore(); }
    if (H0 === "long") { g.fillStyle = hair; g.beginPath(); g.moveTo(0.03, -0.46); g.quadraticCurveTo(-0.22, -0.46, -0.16 + sway, -0.07); g.lineTo(-0.05 + sway * 0.5, -0.09); g.quadraticCurveTo(-0.04, -0.25, 0.02, -0.3); g.closePath(); g.fill(); }
    if (H0 === "scarf") { g.fillStyle = d.scarf; g.beginPath(); g.moveTo(0.06, -0.45); g.quadraticCurveTo(-0.23, -0.45, -0.16 + sway, -0.05); g.lineTo(0.09, -0.05); g.quadraticCurveTo(0.13, -0.18, 0.06, -0.24); g.closePath(); g.fill(); }
    if (H0 === "curly") disc(hair, -0.035, HEAD[1] - 0.02, R * 1.36);
    if (H0 === "bob") { g.fillStyle = hair; g.beginPath(); g.moveTo(0.05, -0.46); g.quadraticCurveTo(-0.21, -0.45, -0.15, -0.21); g.lineTo(0, -0.22); g.closePath(); g.fill(); }
    if (H0 === "ponytail") line(hair, 0.07, [[-0.11, -0.42], [-0.21, -0.37], [-0.24 + sway * 1.5, -0.22]]);
    if (H0 === "locs") for (let i = 0; i < 5; i += 1) { const lx = -0.13 + i * 0.035; line(hair, 0.034, [[lx, -0.4], [lx - 0.04 + sway, -0.19 + i * 0.012]]); }
    if (H0 === "braids") { line(hair, 0.045, [[-0.1, -0.32], [-0.13 + sway, -0.08]]); disc("#e5484d", -0.13 + sway, -0.07, 0.022); }
    if (H0 === "bunches") disc(hair, -0.15, -0.33, 0.062);
  }
  if (!side && d.veil) { g.fillStyle = "rgba(255,255,255,0.85)"; g.strokeStyle = "#b6c2d1"; g.lineWidth = 0.01; g.beginPath(); g.moveTo(-0.13, -0.44); g.quadraticCurveTo(-0.3, -0.1, -0.24, 0.3); g.lineTo(0.24, 0.3); g.quadraticCurveTo(0.3, -0.1, 0.13, -0.44); g.closePath(); g.fill(); g.stroke(); }
  if (!side && d.pack) { g.fillStyle = d.pack; g.beginPath(); g.ellipse(0, -0.04, 0.17, 0.17, 0, 0, Math.PI * 2); g.fill(); }
  if (!side && d.back === "cape") { const fl = beat(live, 1.1) * 0.045; poly(d.backc, [[-0.12, -0.2], [0.12, -0.2], [0.24 + fl, 0.34], [-0.24 + fl, 0.34]]); } // the cape flutters
  if (!side && d.back === "wings") { g.save(); g.scale(1 - Math.abs(beat(live, 2.2)) * 0.3, 1); g.fillStyle = d.backc; g.strokeStyle = "#93c5fd"; g.lineWidth = 0.012; for (const sx of [-1, 1]) { g.beginPath(); g.ellipse(sx * 0.2, -0.14, 0.11, 0.2, sx * 0.5, 0, Math.PI * 2); g.fill(); g.stroke(); g.beginPath(); g.ellipse(sx * 0.17, 0.06, 0.08, 0.12, sx * -0.4, 0, Math.PI * 2); g.fill(); g.stroke(); } g.restore(); }
  if (d.hat === "astro") { g.fillStyle = "#f4f4f5"; g.beginPath(); g.arc(HEAD[0], HEAD[1], R * 1.36, 0, Math.PI * 2); g.fill(); g.strokeStyle = "#9ca3af"; g.lineWidth = 0.014; g.stroke(); disc("#bfe3ff", HEAD[0], HEAD[1], R * 1.14); }
  // the wheelchair goes behind the person
  if (pose.chair) { g.strokeStyle = "#4b5563"; g.lineWidth = 0.022; g.beginPath(); g.arc(-0.03, 0.27, 0.2, 0, Math.PI * 2); g.stroke(); g.lineWidth = 0.012; g.beginPath(); for (let i = 0; i < 6; i += 1) { const a = (i * Math.PI) / 3 + (live && live.go ? live.t * 3.2 : 0); g.moveTo(-0.03, 0.27); g.lineTo(-0.03 + Math.cos(a) * 0.2, 0.27 + Math.sin(a) * 0.2); } g.stroke(); line("#4b5563", 0.026, [[-0.15, -0.16], [-0.13, 0.14], [0.17, 0.16]]); line("#4b5563", 0.02, [[0.17, 0.16], [0.21, 0.4]]); g.strokeStyle = "#4b5563"; g.lineWidth = 0.02; g.beginPath(); g.arc(0.2, 0.43, 0.045, 0, Math.PI * 2); g.stroke(); }
  // long hair and headscarves fall behind the body
  if (!side) {
  if (d.hair === "long") { g.fillStyle = hair; g.beginPath(); g.moveTo(-0.17, -0.38); g.quadraticCurveTo(-0.2, -0.1, -0.15, -0.06); g.lineTo(0.15, -0.06); g.quadraticCurveTo(0.2, -0.1, 0.17, -0.38); g.fill(); }
  if (d.hair === "scarf") { g.fillStyle = d.scarf; g.beginPath(); g.moveTo(-0.17, -0.36); g.quadraticCurveTo(-0.21, -0.12, -0.14, -0.05); g.lineTo(0.14, -0.05); g.quadraticCurveTo(0.21, -0.12, 0.17, -0.36); g.fill(); }
  if (d.hair === "curly") disc(hair, HEAD[0], HEAD[1] - 0.02, R * 1.42);
  if (d.hair === "bob") { g.fillStyle = hair; g.beginPath(); g.moveTo(-0.165, -0.38); g.quadraticCurveTo(-0.2, -0.24, -0.15, -0.2); g.lineTo(0.15, -0.2); g.quadraticCurveTo(0.2, -0.24, 0.165, -0.38); g.fill(); }
  if (d.hair === "ponytail") line(hair, 0.075, [[-0.1, -0.42], [-0.2, -0.32], [-0.22, -0.18]]);
  if (d.hair === "locs") { for (let i = 0; i < 7; i += 1) { const lx = -0.15 + i * 0.05; line(hair, 0.034, [[lx, -0.4], [lx * 1.12, -0.2 + Math.abs(lx) * 0.12]]); } }
  if (d.hair === "braids") { line(hair, 0.045, [[-0.13, -0.3], [-0.16, -0.08]]); line(hair, 0.045, [[0.13, -0.3], [0.16, -0.08]]); disc("#e5484d", -0.16, -0.07, 0.022); disc("#e5484d", 0.16, -0.07, 0.022); }
  }
  arm(pose.ea, pose.ha, true); // the arm on the far side
  if (d.kind === "tail") { g.save(); g.translate(0, 0.07); g.rotate(beat(live, 1) * 0.14); g.translate(0, -0.07); g.fillStyle = d.bot; g.beginPath(); g.moveTo(-0.125, 0.07); g.lineTo(0.125, 0.07); g.quadraticCurveTo(0.12, 0.26, 0.04, 0.37); g.lineTo(0.17, 0.48); g.quadraticCurveTo(0, 0.42, -0.17, 0.48); g.lineTo(-0.04, 0.37); g.quadraticCurveTo(-0.12, 0.26, -0.125, 0.07); g.fill(); g.strokeStyle = "rgba(255,255,255,0.45)"; g.lineWidth = 0.012; for (const yy of [0.14, 0.21, 0.28]) { g.beginPath(); g.arc(0, yy - 0.05, 0.09, Math.PI * 0.2, Math.PI * 0.8); g.stroke(); } g.restore(); }
  else {
    leg(hipA, pose.ka, pose.fa, true);
    if (d.blade) { const k = pose.kb, f = pose.fb; line(skin, limb, [hipB, k]); line(d.bot, limb * 1.25, [hipB, [(hipB[0] + k[0]) / 2, (hipB[1] + k[1]) / 2]]); g.strokeStyle = "#4b5563"; g.lineWidth = 0.028; g.beginPath(); g.moveTo(k[0], k[1]); g.quadraticCurveTo(f[0] - 0.07, f[1] - 0.02, f[0] + 0.04, f[1] + 0.02); g.stroke(); disc("#6b7280", k[0], k[1], 0.036); } // a running blade below the knee
    else leg(hipB, pose.kb, pose.fb);
  }
  // body (narrower from the side)
  g.save(); if (side) g.scale(0.74, 1);
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
  g.restore();
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
  // ---- more things to hold, wear and push ----
  const hand = (pt) => disc(skin, pt[0], pt[1], 0.036);
  if (d.bump) { if (side) disc(d.top, 0.06, 0.03, 0.1, 0.11); else disc(d.top, 0.0, 0.03, 0.15, 0.11); }
  if (d.pack && side) line(d.pack, 0.03, [[-0.01, -0.2], [-0.03, 0.02]]);
  else if (d.pack) { for (const sx of [-1, 1]) line(d.pack, 0.03, [[sx * 0.075, -0.2], [sx * 0.1, 0.02]]); line(d.pack, 0.03, [[-0.1, 0.02], [0.1, 0.02]]); }
  if (d.satchel) { line(d.satchel, 0.022, [[-0.1, -0.19], [0.13, 0.08]]); g.fillStyle = d.satchel; g.fillRect(0.06, 0.06, 0.16, 0.13); g.fillStyle = "#fef3c7"; g.fillRect(0.1, 0.03, 0.09, 0.06); }
  if (d.wraps) { g.save(); if (side) g.scale(0.74, 1); g.strokeStyle = "#a8a29e"; g.lineWidth = 0.012; g.beginPath(); for (const [x0, y0, x1, y1] of [[-0.12, -0.14, 0.12, -0.1], [-0.12, -0.04, 0.12, -0.08], [-0.12, 0.04, 0.12, 0.0], [-0.12, 0.1, 0.12, 0.08]]) { g.moveTo(x0, y0); g.lineTo(x1, y1); } g.stroke(); g.restore(); }
  if (d.stick) { const [hx, hy] = pose.hb; line("#8b5a2b", 0.026, [[hx + 0.01, hy - 0.02], [hx + 0.05, 0.47]]); g.strokeStyle = "#8b5a2b"; g.lineWidth = 0.026; g.beginPath(); g.arc(hx - 0.025, hy - 0.02, 0.035, Math.PI, 0); g.stroke(); hand(pose.hb); }
  if (d.frame) { const [hx, hy] = pose.hb; for (const dx of [0, 0.16]) { line("#9ca3af", 0.022, [[hx + dx - 0.02, hy], [hx + dx + 0.02, 0.44]]); disc("#374151", hx + dx + 0.02, 0.45, 0.025); } line("#9ca3af", 0.022, [[hx - 0.03, hy], [hx + 0.14, hy]]); line("#9ca3af", 0.018, [[hx, 0.28], [hx + 0.17, 0.28]]); hand(pose.ha); hand(pose.hb); }
  if (d.pram) { const [hx, hy] = pose.hb, roll = live && live.go ? live.t * 9 : 0; line("#6b7280", 0.02, [[hx, hy], [hx + 0.05, hy + 0.12]]); line("#6b7280", 0.016, [[hx + 0.08, hy + 0.24], [hx + 0.06, hy + 0.34]]); line("#6b7280", 0.016, [[hx + 0.2, hy + 0.24], [hx + 0.22, hy + 0.34]]);
    g.fillStyle = d.pram; g.beginPath(); g.moveTo(hx + 0.02, hy + 0.1); g.lineTo(hx + 0.27, hy + 0.1); g.quadraticCurveTo(hx + 0.27, hy + 0.26, hx + 0.16, hy + 0.26); g.lineTo(hx + 0.1, hy + 0.26); g.quadraticCurveTo(hx + 0.02, hy + 0.26, hx + 0.02, hy + 0.1); g.fill(); g.beginPath(); g.arc(hx + 0.15, hy + 0.1, 0.12, Math.PI * 1.02, Math.PI * 1.6); g.lineTo(hx + 0.15, hy + 0.1); g.fill();
    disc(skin, hx + 0.2, hy + 0.07, 0.04); for (const wx of [hx + 0.06, hx + 0.22]) { disc("#374151", wx, 0.42, 0.045); disc("#d1d5db", wx, 0.42, 0.02); line("#374151", 0.008, [[wx - Math.cos(roll) * 0.04, 0.42 - Math.sin(roll) * 0.04], [wx + Math.cos(roll) * 0.04, 0.42 + Math.sin(roll) * 0.04]]); } hand(pose.ha); hand(pose.hb); }
  if (d.baby) { // a baby wrapped in a blanket, lying across the arms with its head on the near side
    const bob = beat(live, 0.7) * 0.008, y = 0.0 + bob;
    g.save(); if (side) g.translate(0.03, 0);
    g.fillStyle = d.baby; g.beginPath(); g.ellipse(0.0, y + 0.02, 0.15, 0.085, -0.22, 0, Math.PI * 2); g.fill();
    g.strokeStyle = "rgba(0,0,0,0.12)"; g.lineWidth = 0.01; g.beginPath(); g.moveTo(-0.1, y + 0.0); g.quadraticCurveTo(0.0, y + 0.06, 0.08, y - 0.03); g.stroke();
    disc(skin, 0.115, y - 0.055, 0.058); g.fillStyle = d.baby; g.beginPath(); g.arc(0.115, y - 0.055, 0.064, Math.PI * 0.75, Math.PI * 1.7); g.quadraticCurveTo(0.1, y - 0.08, 0.07, y - 0.01); g.fill();
    g.strokeStyle = "#1f2937"; g.lineWidth = 0.008; g.beginPath(); g.arc(0.1, y - 0.05, 0.011, 0.1, Math.PI - 0.1); g.moveTo(0.146, y - 0.05); g.arc(0.135, y - 0.05, 0.011, 0.1, Math.PI - 0.1); g.stroke(); disc("rgba(244,114,182,0.5)", 0.118, y - 0.025, 0.012);
    g.restore();
  }
  if (d.hold === "teddy") { const [hx, hy] = pose.hb, c = "#b45309"; for (const sx of [-1, 1]) { disc(c, hx + 0.02 + sx * 0.035, hy - 0.115, 0.02); disc(c, hx + 0.02 + sx * 0.05, hy + 0.0, 0.022); disc(c, hx + 0.02 + sx * 0.035, hy + 0.07, 0.024); } disc(c, hx + 0.02, hy + 0.01, 0.05, 0.06); disc(c, hx + 0.02, hy - 0.075, 0.042); disc("#fde68a", hx + 0.02, hy - 0.065, 0.02, 0.016); disc("#1f2937", hx + 0.006, hy - 0.085, 0.006); disc("#1f2937", hx + 0.034, hy - 0.085, 0.006); }
  if (d.hold === "bags") for (const [pt, c] of [[pose.ha, "#f59e0b"], [pose.hb, "#38bdf8"]]) { g.strokeStyle = "#6b7280"; g.lineWidth = 0.01; g.beginPath(); g.arc(pt[0], pt[1] + 0.05, 0.03, Math.PI, 0); g.stroke(); g.fillStyle = c; g.fillRect(pt[0] - 0.06, pt[1] + 0.05, 0.12, 0.15); g.fillStyle = "rgba(255,255,255,0.4)"; g.fillRect(pt[0] - 0.06, pt[1] + 0.05, 0.12, 0.03); hand(pt); }
  if (d.hold === "phone") { const [hx, hy] = pose.hb; g.save(); g.translate(hx - 0.01, hy - 0.02); g.rotate(-0.25); g.fillStyle = "#111827"; g.fillRect(-0.02, -0.05, 0.04, 0.09); g.restore(); }
  if (d.hold === "mic") { const [hx, hy] = pose.hb; line("#374151", 0.022, [[hx + 0.02, hy + 0.04], [hx - 0.04, hy - 0.03]]); disc("#9ca3af", hx - 0.055, hy - 0.045, 0.03); for (let i = 0; i < 2; i += 1) { const u = live ? (live.t * 0.8 + i / 2) % 1 : i / 2; g.fillStyle = `rgba(219,39,119,${1 - u})`; g.font = "0.1px sans-serif"; g.fillText("♪", -0.3 - i * 0.08, -0.3 - u * 0.16); } }
  if (d.hold === "racket") { const [hx, hy] = pose.hb; line("#6b7280", 0.02, [[hx, hy + 0.02], [hx + 0.04, hy - 0.12]]); g.strokeStyle = "#ef4444"; g.lineWidth = 0.018; g.fillStyle = "rgba(255,255,255,0.6)"; g.beginPath(); g.ellipse(hx + 0.065, hy - 0.21, 0.065, 0.09, 0.25, 0, Math.PI * 2); g.fill(); g.stroke(); disc("#bef264", hx - 0.14, hy - 0.16, 0.026); }
  if (d.hold === "barbell" && side) { const x = (pose.ha[0] + pose.hb[0]) / 2, y = (pose.ha[1] + pose.hb[1]) / 2; disc("#1f2937", x, y, 0.1); disc("#374151", x, y, 0.06); disc("#6b7280", x, y, 0.02); hand(pose.ha); hand(pose.hb); } // seen end on
  else if (d.hold === "barbell") { const y = (pose.ha[1] + pose.hb[1]) / 2; line("#6b7280", 0.022, [[-0.44, y], [0.44, y]]); for (const sx of [-1, 1]) { g.fillStyle = "#1f2937"; g.fillRect(sx * 0.36 - 0.02, y - 0.09, 0.04, 0.18); g.fillStyle = "#374151"; g.fillRect(sx * 0.41 - 0.015, y - 0.065, 0.03, 0.13); } hand(pose.ha); hand(pose.hb); }
  if (d.hold === "card") { const [hx, hy] = pose.hb; g.fillStyle = "#fde047"; g.fillRect(hx - 0.01, hy - 0.11, 0.07, 0.1); hand(pose.hb); }
  if (d.hold === "can") { const [hx, hy] = pose.hb, tip = beat(live, 0.8) * 0.1; g.save(); g.translate(hx, hy); g.rotate(0.25 + tip); g.fillStyle = "#38bdf8"; g.fillRect(0.0, -0.02, 0.14, 0.12); line("#38bdf8", 0.022, [[0.14, 0.06], [0.24, -0.02]]); disc("#0284c7", 0.25, -0.03, 0.022); g.strokeStyle = "#0284c7"; g.lineWidth = 0.016; g.beginPath(); g.arc(0.0, 0.04, 0.045, Math.PI * 0.5, Math.PI * 1.5); g.stroke(); g.restore(); hand(pose.hb); }
  if (d.hold === "rod") { const [hx, hy] = pose.hb, bob = beat(live, 0.9) * 0.02; line("#7a5230", 0.016, [[hx - 0.03, hy + 0.04], [hx + 0.2, hy - 0.3]]); line("#9ca3af", 0.006, [[hx + 0.2, hy - 0.3], [hx + 0.24, 0.3 + bob]]); disc("#ef4444", hx + 0.24, 0.3 + bob, 0.02); disc("#ffffff", hx + 0.24, 0.29 + bob, 0.012); hand(pose.hb); }
  if (d.hold === "guitar") { g.save(); g.translate(0.02, 0.02); g.rotate(-0.35); line("#7a5230", 0.03, [[0.06, 0], [0.34, 0]]); g.fillStyle = "#111827"; g.fillRect(0.33, -0.03, 0.06, 0.06); disc("#d97706", -0.06, 0, 0.1, 0.085); disc("#d97706", 0.05, 0, 0.07, 0.065); disc("#1f2937", 0.0, 0, 0.03); line("rgba(255,255,255,0.7)", 0.005, [[-0.1, 0], [0.34, 0]]); g.restore(); hand([pose.ha[0] + 0.02, pose.ha[1] - 0.06 + beat(live, 3) * 0.012]); hand([pose.hb[0] + 0.14, pose.hb[1] - 0.17]); }
  if (d.hold === "tray") { const [hx, hy] = pose.hb; g.fillStyle = "#9ca3af"; g.beginPath(); g.ellipse(hx + 0.02, hy - 0.03, 0.13, 0.022, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = "rgba(190,230,255,0.9)"; g.strokeStyle = "#64748b"; g.lineWidth = 0.008; for (const dx of [-0.05, 0.07]) { g.beginPath(); g.moveTo(hx + dx - 0.025, hy - 0.13); g.lineTo(hx + dx + 0.025, hy - 0.13); g.lineTo(hx + dx + 0.018, hy - 0.04); g.lineTo(hx + dx - 0.018, hy - 0.04); g.closePath(); g.fill(); g.stroke(); } }
  if (d.gloves) for (const pt of [pose.ha, pose.hb]) { disc(d.gloves, pt[0], pt[1], 0.065); disc("rgba(255,255,255,0.35)", pt[0] - 0.02, pt[1] - 0.025, 0.02); g.fillStyle = "#ffffff"; g.fillRect(pt[0] - 0.03, pt[1] + 0.05, 0.06, 0.025); }
  if (d.pom) for (const pt of [pose.ha, pose.hb]) { for (let i = 0; i < 10; i += 1) { const a1 = (i * Math.PI) / 5 + beat(live, 2) * 0.3; line(i % 2 ? d.pom : "#ffffff", 0.02, [[pt[0], pt[1]], [pt[0] + Math.cos(a1) * 0.085, pt[1] + Math.sin(a1) * 0.085]]); } disc(d.pom, pt[0], pt[1], 0.045); }
  if (d.hold === "sword") { const [hx, hy] = pose.hb; line("#d1d5db", 0.026, [[hx, hy], [hx + 0.05, hy - 0.32]]); line("#8b5a2b", 0.03, [[hx - 0.045, hy - 0.035], [hx + 0.055, hy - 0.02]]); }
  if (d.ears && side) poly(skin, [[-0.02, -0.37], [-0.11, -0.45], [-0.035, -0.31]]);
  else if (d.ears) { poly(skin, [[-0.125, -0.37], [-0.2, -0.43], [-0.13, -0.31]]); poly(skin, [[0.125, -0.37], [0.2, -0.43], [0.13, -0.31]]); }
  // head, hair on top, face
  disc(skin, HEAD[0], HEAD[1], R);
  if (side) sideHead(); else frontHair();
  function sideHead() { // hair seen from the side: over the top and down the back, the face and an ear left showing
    const back = (c) => { g.save(); g.beginPath(); g.arc(HEAD[0], HEAD[1], R * 1.05, 0, Math.PI * 2); g.clip(); g.fillStyle = c; g.beginPath(); g.moveTo(-0.2, HEAD[1] + 0.12); g.lineTo(-0.2, -0.53); g.lineTo(0.2, -0.53); g.lineTo(0.2, HEAD[1] - 0.06); g.quadraticCurveTo(0.07, HEAD[1] - 0.08, 0.025, HEAD[1] - 0.035); g.lineTo(-0.03, HEAD[1] + 0.05); g.closePath(); g.fill(); g.restore(); };
    if (["short", "bunches", "bun", "braids", "long", "ponytail", "puffs", "bob", "locs", "curly", "cap", "spiky"].includes(H0)) back(hair);
    if (H0 === "curly") for (let i = 0; i < 6; i += 1) { const a = Math.PI * (0.85 + i * 0.17); disc(hair, Math.cos(a) * R * 0.98 - 0.01, HEAD[1] + Math.sin(a) * R * 0.98, R * 0.34); }
    if (H0 === "spiky") for (let i = 0; i < 5; i += 1) { const a = Math.PI * (1.05 + i * 0.15), at = (b, r) => [Math.cos(b) * R * r, HEAD[1] + Math.sin(b) * R * r]; poly(hair, [at(a - 0.18, 0.95), at(a - 0.35, 1.5), at(a + 0.18, 0.95)]); }
    if (H0 === "mohawk") { disc(hair, -0.01, HEAD[1] - R * 0.92, 0.11, 0.04); for (const dx of [-0.08, -0.03, 0.02, 0.065]) poly(hair, [[dx - 0.03, HEAD[1] - R * 0.9], [dx - 0.01, HEAD[1] - R - 0.1], [dx + 0.03, HEAD[1] - R * 0.9]]); }
    if (H0 === "thin") { g.strokeStyle = hair; g.lineWidth = 0.03; g.beginPath(); g.arc(HEAD[0], HEAD[1], R * 0.98, Math.PI * 0.8, Math.PI * 1.15); g.stroke(); }
    if (H0 === "puffs") disc(hair, -0.09, -0.47, 0.075);
    if (H0 === "bun") disc(hair, -0.1, -0.46, 0.06);
    if (H0 === "cap") { g.fillStyle = d.cap; g.beginPath(); g.arc(HEAD[0], HEAD[1] - 0.03, R * 1.06, Math.PI, 0); g.fill(); line(d.cap, 0.035, [[0.08, HEAD[1] - 0.035], [0.24, HEAD[1] - 0.03]]); }
    if (H0 === "turban") { g.fillStyle = d.scarf; g.beginPath(); g.ellipse(HEAD[0] - 0.01, HEAD[1] - 0.075, R * 1.16, R * 0.86, 0, Math.PI * 0.98, Math.PI * 2.02); g.quadraticCurveTo(0, HEAD[1] - 0.105, -R * 1.16, HEAD[1] - 0.068); g.fill(); }
    if (H0 === "scarf") { disc(d.scarf, HEAD[0], HEAD[1], R * 1.12); disc(skin, 0.045, HEAD[1] + 0.012, R * 0.7, R * 0.86); line(d.scarf, 0.05, [[-0.04, -0.215], [0.06, -0.215]]); }
    if (!["long", "scarf", "curly", "bob", "locs"].includes(H0) && !["ninja", "helmet", "astro", "bunny"].includes(d.hat)) { disc(skin, -0.012, -0.335, 0.027, 0.036); g.strokeStyle = "rgba(0,0,0,0.18)"; g.lineWidth = 0.008; g.beginPath(); g.arc(-0.012, -0.335, 0.014, -1.2, 1.4); g.stroke(); } // the ear
    disc(skin, R * 0.97, HEAD[1] + 0.012, 0.03, 0.025); // the nose
  }
  function frontHair() {
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
  }
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
  if (d.hat === "flat") { g.fillStyle = d.hatc; g.beginPath(); g.ellipse(0, top + 0.035, 0.155, 0.06, 0, 0, Math.PI * 2); g.fill(); g.beginPath(); g.ellipse(0.1, top + 0.075, 0.1, 0.025, 0.15, 0, Math.PI * 2); g.fill(); }
  if (d.hat === "phones") { g.strokeStyle = "#374151"; g.lineWidth = 0.022; g.beginPath(); g.arc(HEAD[0], HEAD[1], R * 1.12, Math.PI * 1.08, Math.PI * 1.92); g.stroke(); for (const sx of [-1, 1]) { g.fillStyle = d.hatc; g.beginPath(); g.ellipse(sx * R * 1.08, HEAD[1] + 0.01, 0.035, 0.055, 0, 0, Math.PI * 2); g.fill(); } }
  if (d.hat === "band") { line(d.hatc, 0.03, [[-R * 0.95, top + 0.07], [R * 0.95, top + 0.07]]); }
  if (d.hat === "swim") { g.fillStyle = d.hatc; g.beginPath(); g.arc(HEAD[0], HEAD[1] - 0.012, R * 1.04, Math.PI * 1.02, Math.PI * 1.98); g.quadraticCurveTo(0, HEAD[1] - R * 0.5, -R * 1.03, HEAD[1] - 0.016); g.fill(); }
  if (d.veil) { disc("#fbbf24", -0.05, top + 0.03, 0.016); disc("#fbbf24", 0, top + 0.015, 0.02); disc("#fbbf24", 0.05, top + 0.03, 0.016); }
  if (d.wraps && side) { g.fillStyle = "#1f2937"; g.fillRect(0.0, -0.375, 0.14, 0.055); disc("#fde047", 0.07, -0.347, 0.02); }
  else if (d.wraps) { g.strokeStyle = "#a8a29e"; g.lineWidth = 0.012; g.beginPath(); for (const [x0, y0, x1, y1] of [[-0.12, -0.42, 0.12, -0.39], [-0.13, -0.29, 0.13, -0.27], [-0.1, -0.24, 0.1, -0.25]]) { g.moveTo(x0, y0); g.lineTo(x1, y1); } g.stroke(); g.fillStyle = "#1f2937"; g.fillRect(-0.1, -0.375, 0.2, 0.055); disc("#fde047", -0.05, -0.347, 0.02); disc("#fde047", 0.05, -0.347, 0.02); }
  if (d.hat === "halo") { g.strokeStyle = "#f5c518"; g.lineWidth = 0.022; g.beginPath(); g.ellipse(0, top - 0.05, 0.11, 0.03, 0, 0, Math.PI * 2); g.stroke(); }
  if (d.hat === "ninja" && side) { disc("#1f2937", HEAD[0], HEAD[1], R * 1.07); disc(skin, 0.075, -0.347, 0.065, 0.034); line("#d62839", 0.022, [[-0.12, -0.39], [-0.21, -0.35 + sway]]); }
  else if (d.hat === "ninja") { g.fillStyle = "#1f2937"; g.beginPath(); g.arc(HEAD[0], HEAD[1], R * 1.07, 0, Math.PI * 2); g.fill(); g.fillStyle = skin; g.beginPath(); g.ellipse(0, -0.347, 0.105, 0.034, 0, 0, Math.PI * 2); g.fill(); line("#d62839", 0.022, [[-0.13, -0.4], [-0.21, -0.36]]); }
  if (side) sideFace(); else frontFace();
  function sideFace() { // one eye, the mouth at the front, glasses and beards seen side-on
    const dark = fig.sk >= 4 ? "#1a1210" : "#2b1d16", ex = 0.072, ey = -0.345;
    if (d.mask) { g.save(); g.beginPath(); g.arc(HEAD[0], HEAD[1], R * 1.01, 0, Math.PI * 2); g.clip(); line(d.mask, 0.055, [[-0.2, ey - 0.002], [0.2, ey - 0.002]]); g.restore(); disc("#ffffff", ex, ey, 0.024); }
    if (d.bigbeard) { g.fillStyle = d.bigbeard; g.beginPath(); g.moveTo(-0.01, -0.34); g.quadraticCurveTo(-0.03, -0.17, 0.07, -0.13); g.quadraticCurveTo(0.16, -0.18, 0.135, -0.3); g.quadraticCurveTo(0.07, -0.27, -0.01, -0.34); g.fill(); g.strokeStyle = "#9ca3af"; g.lineWidth = 0.008; g.stroke(); }
    if (d.beard) { g.fillStyle = hair; g.beginPath(); g.moveTo(-0.01, -0.33); g.quadraticCurveTo(-0.01, -0.22, 0.07, -0.21); g.quadraticCurveTo(0.13, -0.215, 0.135, -0.285); g.lineTo(0.11, -0.29); g.quadraticCurveTo(0.06, -0.265, 0.025, -0.33); g.closePath(); g.fill(); }
    if (d.hat !== "helmet" && !d.wraps) disc(dark, ex, ey, 0.016);
    if (d.patch) { disc("#111827", ex, ey, 0.034); line("#111827", 0.012, [[-0.12, -0.41], [0.12, -0.37]]); }
    if (!d.nomouth && d.hat !== "helmet") { g.strokeStyle = d.bigbeard ? "#b4534b" : dark; g.lineWidth = 0.014; g.beginPath(); g.arc(0.09, -0.305, 0.028, Math.PI * 0.2, Math.PI * 0.65); g.stroke(); }
    if (d.nose) disc("#e5484d", R + 0.012, -0.325, 0.032);
    if (d.fangs) poly("#ffffff", [[0.085, -0.283], [0.1, -0.283], [0.092, -0.258]]);
    if (d.goggles) { line("#1f2937", 0.014, [[-R, -0.35], [0.05, -0.35]]); g.fillStyle = "#7dd3fc"; g.strokeStyle = "#1f2937"; g.lineWidth = 0.012; g.beginPath(); g.ellipse(0.085, -0.347, 0.035, 0.03, 0, 0, Math.PI * 2); g.fill(); g.stroke(); }
    if (d.specs) { g.strokeStyle = "#374151"; g.lineWidth = 0.012; g.beginPath(); g.arc(0.08, ey, 0.032, 0, Math.PI * 2); g.moveTo(0.048, ey); g.lineTo(-0.01, ey + 0.004); g.stroke(); }
    if (d.ball) { const by = 0.37 - Math.abs(beat(live, 1.4)) * 0.13; disc("#ffffff", 0.4, by, 0.065); g.strokeStyle = "#1f2937"; g.lineWidth = 0.012; g.beginPath(); g.arc(0.4, by, 0.065, 0, Math.PI * 2); g.stroke(); disc("#1f2937", 0.4, by, 0.022); }
    if (d.crutch) for (const hnd of [pose.ha, pose.hb]) { line("#9ca3af", 0.02, [[hnd[0] - 0.02, hnd[1] - 0.16], [hnd[0] + 0.03, 0.47]]); line("#6b7280", 0.024, [[hnd[0] - 0.03, hnd[1]], [hnd[0] + 0.03, hnd[1]]]); disc(skin, hnd[0], hnd[1], 0.03); }
    if (d.cane) { line("#f4f4f5", 0.022, [pose.hb, [pose.hb[0] + 0.14, 0.47]]); line("#e5484d", 0.024, [[pose.hb[0] + 0.12, 0.42], [pose.hb[0] + 0.14, 0.47]]); disc(skin, pose.hb[0], pose.hb[1], 0.036); }
  }
  function frontFace() {
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
  if (d.goggles) { line("#1f2937", 0.014, [[-R, -0.35], [R, -0.35]]); for (const sx of [-1, 1]) { g.fillStyle = "#7dd3fc"; g.strokeStyle = "#1f2937"; g.lineWidth = 0.012; g.beginPath(); g.ellipse(sx * 0.05, -0.347, 0.04, 0.03, 0, 0, Math.PI * 2); g.fill(); g.stroke(); } }
  if (d.specs) { g.strokeStyle = "#374151"; g.lineWidth = 0.012; g.beginPath(); g.arc(-0.05, -0.345, 0.034, 0, Math.PI * 2); g.moveTo(0.084, -0.345); g.arc(0.05, -0.345, 0.034, 0, Math.PI * 2); g.moveTo(-0.016, -0.345); g.lineTo(0.016, -0.345); g.stroke(); }
  }
  g.restore();
}
