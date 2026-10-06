// ABC & 123: the letters, numbers and every line the voice says.
// The voice clips are made from CLIPS by tools/abc-audio (node dump-texts.mjs, then generate.py). If a clip is
// missing the page falls back to the device's own voice reading the same text.

// say: how the letter name is spelled for the voice (a lone "A" is read as "uh")
export const LETTERS = [
  ["A", "ay", "apple", "🍎"], ["B", "bee", "ball", "⚽"], ["C", "see", "cat", "🐱"], ["D", "dee", "dog", "🐶"],
  ["E", "ee", "elephant", "🐘"], ["F", "eff", "fish", "🐟"], ["G", "jee", "giraffe", "🦒"], ["H", "aitch", "house", "🏠"],
  ["I", "eye", "ice cream", "🍦"], ["J", "jay", "juice", "🧃"], ["K", "kay", "kite", "🪁"], ["L", "ell", "lion", "🦁"],
  ["M", "em", "moon", "🌙"], ["N", "en", "nose", "👃"], ["O", "oh", "orange", "🍊"], ["P", "pee", "penguin", "🐧"],
  ["Q", "cue", "queen", "👸"], ["R", "are", "rabbit", "🐰"], ["S", "ess", "sun", "☀️"], ["T", "tee", "tree", "🌳"],
  ["U", "you", "umbrella", "☂️"], ["V", "vee", "violin", "🎻"], ["W", "double you", "whale", "🐳"], ["X", "ex", "x-ray", "🩻"],
  ["Y", "why", "yo-yo", "🪀"], ["Z", "zee", "zebra", "🦓"],
].map(([L, say, word, emoji]) => ({ L, say, word, emoji }));

export const NUMBER_WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
  "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen", "twenty"];

// things to count
export const THINGS = ["🍎", "⭐", "🐟", "🎈", "🐞", "🌸", "🚗", "🐥", "🍓", "⚽", "🦋", "🍪"];

export const PRAISE = ["p/great", "p/welldone", "p/super", "p/yes", "p/clever"];

const cap = (s) => s[0].toUpperCase() + s.slice(1);
export const CLIPS = {
  ...Object.fromEntries(LETTERS.map((x) => [`l/${x.L.toLowerCase()}`, `${cap(x.say)}.`])),
  ...Object.fromEntries(LETTERS.map((x) => [`w/${x.L.toLowerCase()}`, `${cap(x.say)} is for ${x.word}.`])),
  ...Object.fromEntries(NUMBER_WORDS.map((w, n) => [`n/${n}`, `${cap(w)}.`])),
  "p/find-letter": "Find the letter",
  "p/find-small": "Find the small letter",
  "p/match": "Which small letter goes with",
  "p/find-number": "Find the number",
  "p/how-many": "How many can you count?",
  "p/trace-letter": "Trace the letter",
  "p/trace-number": "Trace the number",
  "p/count": "Let's count!",
  "p/abc": "Let's say the A B C!",
  "p/great": "Great job!",
  "p/welldone": "Well done!",
  "p/super": "Super!",
  "p/yes": "Yes! That's right!",
  "p/clever": "You're so clever!",
  "p/try": "Oops! Try again.",
  "p/again": "Let's try that one again.",
  "p/star": "You earned a star!",
  "p/finished": "Hooray! You finished! Let's play again!",
};
