const WORD_BANK = {
  easy: [
    { word: "cat", clue: "A pet that says meow.", emoji: "🐱" },
    { word: "dog", clue: "A pet that says woof.", emoji: "🐶" },
    { word: "sun", clue: "It shines in the sky in daytime.", emoji: "☀️" },
    { word: "hat", clue: "You wear it on your head.", emoji: "🧢" },
    { word: "fish", clue: "It swims in water.", emoji: "🐟" },
    { word: "milk", clue: "A white drink from a cup.", emoji: "🥛" },
    { word: "frog", clue: "A green jumper near ponds.", emoji: "🐸" },
    { word: "book", clue: "You read this to learn stories.", emoji: "📚" },
    { word: "tree", clue: "A tall plant with leaves.", emoji: "🌳" },
    { word: "ball", clue: "You can kick or throw it.", emoji: "⚽" },
    { word: "star", clue: "Twinkles in the night sky.", emoji: "⭐" },
    { word: "cake", clue: "A sweet treat for birthdays.", emoji: "🎂" }
  ],
  medium: [
    { word: "planet", clue: "Earth is one of these.", emoji: "🪐" },
    { word: "rocket", clue: "It blasts into space.", emoji: "🚀" },
    { word: "garden", clue: "Flowers can grow here.", emoji: "🌼" },
    { word: "butter", clue: "You can spread it on toast.", emoji: "🧈" },
    { word: "jungle", clue: "A wild forest with many animals.", emoji: "🌴" },
    { word: "pencil", clue: "You use this to write.", emoji: "✏️" },
    { word: "winter", clue: "The coldest season.", emoji: "❄️" },
    { word: "dragon", clue: "A magical fire-breathing creature.", emoji: "🐉" },
    { word: "bridge", clue: "Roads can pass over water on it.", emoji: "🌉" },
    { word: "cookie", clue: "A round baked snack.", emoji: "🍪" },
    { word: "soccer", clue: "A game played by kicking a ball.", emoji: "🥅" },
    { word: "school", clue: "A place where kids learn.", emoji: "🏫" }
  ],
  hard: [
    { word: "elephant", clue: "A huge animal with a long trunk.", emoji: "🐘" },
    { word: "dinosaur", clue: "A giant reptile from long ago.", emoji: "🦖" },
    { word: "rainbow", clue: "A colorful arc after rain.", emoji: "🌈" },
    { word: "treasure", clue: "Hidden gold and gems.", emoji: "💎" },
    { word: "sandwich", clue: "A meal between two slices of bread.", emoji: "🥪" },
    { word: "library", clue: "A place with many books.", emoji: "📖" },
    { word: "playground", clue: "A place for swings and slides.", emoji: "🛝" },
    { word: "adventure", clue: "An exciting trip or quest.", emoji: "🧭" },
    { word: "mountain", clue: "A very high hill.", emoji: "⛰️" },
    { word: "hospital", clue: "Doctors help people here.", emoji: "🏥" },
    { word: "question", clue: "What you ask when you need an answer.", emoji: "❓" },
    { word: "calendar", clue: "It shows days, weeks, and months.", emoji: "📅" }
  ]
};

const POINTS = { easy: 10, medium: 15, hard: 20 };
const MAX_LIVES = 5;
const WORD_DIFFICULTY_RULES = {
  easy: { minLength: 3, maxLength: 5, emoji: "🌱" },
  medium: { minLength: 5, maxLength: 7, emoji: "🌿" },
  hard: { minLength: 7, maxLength: 10, emoji: "🌳" }
};
const REMOTE_TOPICS = {
  easy: ["animals", "school", "food", "nature", "sports", "family", "colors", "toys", "music", "weather"],
  medium: ["science", "space", "music", "travel", "weather", "ocean", "history", "art", "garden", "reading"],
  hard: ["history", "geography", "technology", "adventure", "culture", "astronomy", "engineering", "literature", "environment", "mountains"]
};
const REMOTE_WORD_API = "https://en.wikipedia.org/w/api.php";
const REMOTE_WORD_CACHE_KEY = "spellSproutRemoteWordsV3";
const LEGACY_REMOTE_WORD_CACHE_KEYS = ["spellSproutRemoteWordsV1", "spellSproutRemoteWordsV2"];
const REMOTE_WORD_TIMEOUT_MS = 4500;
const REMOTE_MIN_WORD_COUNT = 8;
const REMOTE_SEARCH_LIMIT = 50;
const WORD_IMAGE_CACHE_KEY = "spellSproutWordImageCacheV2";
const WORD_IMAGE_THUMB_SIZE = 220;
const MAX_WORD_IMAGE_CACHE_ENTRIES = 250;
const HARD_BLOCKED_WORDS = new Set([
  "anal", "anus", "arse", "ass", "asshole", "bastard", "bitch", "bloody", "boner", "boob", "boobs", "booty",
  "buttsex", "cock", "coon", "crap", "cunt", "damn", "dick", "dildo", "drugs", "fag", "faggot", "fuck",
  "fucker", "fucking", "hell", "hentai", "jerkoff", "jizz", "kike", "milf", "nazi", "nigga", "nigger",
  "nude", "nudes", "orgasm", "penis", "porn", "pussy", "rape", "rapist", "sex", "sexy", "shit", "slut",
  "tits", "vagina", "whore", "xxx"
]);
const HARD_BLOCKED_PATTERNS = [
  /f+u+c*k+/,
  /s+h+i+t+/,
  /b+i+t+c+h+/,
  /a+s+s+h*o+l+e+/,
  /d+i+c+k+/,
  /c+u+n+t+/,
  /p+e+n+i+s+/,
  /v+a+g+i+n+a+/,
  /n+i+g+g+e*r+/,
  /r+a+p+e+/,
  /p+o+r+n+/,
  /s+e+x+/,
  /x+x+x+/
];
const KID_SAFE_ALLOWLIST = new Set([
  "adventure", "ant", "ape", "apple", "apricot", "artist", "astronaut", "backpack", "badge", "ball", "banana",
  "barn", "basket", "beach", "bear", "bee", "beetle", "bench", "berry", "bicycle", "bird", "blanket", "boat",
  "book", "bottle", "bread", "bridge", "broccoli", "broom", "bubble", "bucket", "butter", "butterfly", "cabin",
  "calendar", "camel", "camera", "candle", "candy", "canoe", "car", "carpet", "carrot", "castle", "cat",
  "caterpillar", "chair", "cheese", "cherry", "chicken", "cloud", "coat", "coconut", "cookie", "corn", "cow",
  "crayon", "cup", "cupcake", "deer", "desk", "diamond", "dinosaur", "dolphin", "donkey", "dragon", "drum",
  "duck", "eagle", "ear", "earth", "elephant", "engine", "eraser", "falcon", "family", "farm", "feather",
  "fence", "field", "fire", "firefly", "fish", "flag", "flower", "forest", "fork", "fox", "frog", "fruit",
  "friend", "garden", "giraffe", "globe", "goat", "grape", "grass", "guitar", "hammer", "happy", "hat", "hippo",
  "holiday", "horse", "hospital", "house", "island", "jacket", "jelly", "jungle", "kangaroo", "kitten", "koala",
  "ladder", "lamp", "leaf", "lemon", "library", "lion", "lizard", "magic", "magnet", "mango", "map", "marble",
  "melon", "milk", "mirror", "monkey", "moon", "mountain", "mouse", "music", "nest", "notebook", "ocean",
  "octopus", "orange", "otter", "owl", "panda", "paper", "parrot", "peach", "pear", "pencil", "penguin",
  "piano", "planet", "playground", "plum", "pond", "potato", "pumpkin", "puppy", "question", "rabbit", "rain",
  "rainbow", "rocket", "rose", "ruler", "sand", "sandwich", "school", "science", "scissors", "sea", "seashell",
  "shark", "sheep", "ship", "shoe", "sky", "snail", "snake", "snow", "soccer", "star", "strawberry", "sun",
  "table", "teacher", "tiger", "tomato", "train", "treasure", "tree", "turtle", "village", "violin", "volcano",
  "water", "waterfall", "weather", "whale", "window", "winter", "wizard", "wolf", "yellow", "zebra",
  "airplane", "airplanes", "alligator", "alphabet", "aquarium", "backyard", "baseball", "bathroom", "beautiful",
  "birthday", "bookmark", "breakfast", "building", "campfire", "carnation", "carpenter", "classroom", "climbing",
  "colorful", "computer", "cupboard", "dandelion", "daylight", "discovery", "distance", "dragonfly", "envelope",
  "favorite", "festival", "fireplace", "fireworks", "football", "friendship", "furniture", "gardener", "geography",
  "gingerbread", "glittering", "hamburger", "handprint", "happiness", "harmonica", "headphones", "helicopter",
  "homework", "imagine", "important", "jellyfish", "keyboard", "landscape", "language", "librarian", "lighthouse",
  "magazine", "marshmallow", "microscope", "mushroom", "orchestra", "painting", "pancakes", "pineapple", "popcorn",
  "princess", "raincoat", "rainstorm", "recess", "reindeer", "riverbank", "sandcastle", "scarecrow", "schoolbus",
  "seahorse", "shoelace", "shoulders", "snowflake", "snowman", "spaceship", "spaghetti", "sparkling", "sunflower",
  "sunshine", "surprise", "telescope", "tomorrow", "triangle", "umbrella", "vacation", "watermelon", "weekend",
  "wildlife", "wonderful", "workbook", "xylophone", "yesterday", "zookeeper"
]);

function dedupeWordEntries(entries) {
  const seen = new Set();
  const result = [];
  entries.forEach((entry) => {
    if (!entry || typeof entry.word !== "string") return;
    const normalized = entry.word.toLowerCase();
    if (seen.has(normalized)) return;
    seen.add(normalized);
    result.push({
      word: normalized,
      clue: typeof entry.clue === "string" ? entry.clue : "Spell this word.",
      emoji: typeof entry.emoji === "string" ? entry.emoji : "🌟"
    });
  });
  return result;
}

function createPracticeEntries(words, difficulty) {
  return words.map((word) => ({
    word,
    clue: "Practice word: listen and spell it.",
    emoji: WORD_DIFFICULTY_RULES[difficulty].emoji
  }));
}

function classifyWordDifficulty(word) {
  if (word.length <= 5) return "easy";
  if (word.length <= 7) return "medium";
  return "hard";
}

function createInitialWordBank() {
  const grouped = { easy: [], medium: [], hard: [] };
  KID_SAFE_ALLOWLIST.forEach((word) => {
    grouped[classifyWordDifficulty(word)].push(word);
  });

  return {
    easy: dedupeWordEntries([...WORD_BANK.easy, ...createPracticeEntries(grouped.easy, "easy")]),
    medium: dedupeWordEntries([...WORD_BANK.medium, ...createPracticeEntries(grouped.medium, "medium")]),
    hard: dedupeWordEntries([...WORD_BANK.hard, ...createPracticeEntries(grouped.hard, "hard")])
  };
}

const INITIAL_WORD_BANK = createInitialWordBank();

const POSITIVE_MESSAGES = [
  "Awesome spelling!",
  "Super work!",
  "You nailed it!",
  "Great job!",
  "Fantastic!"
];

const ui = {
  difficulty: document.getElementById("difficulty"),
  newGame: document.getElementById("newGame"),
  hearWord: document.getElementById("hearWord"),
  useHint: document.getElementById("useHint"),
  backspace: document.getElementById("backspace"),
  checkWord: document.getElementById("checkWord"),
  scoreValue: document.getElementById("scoreValue"),
  bestValue: document.getElementById("bestValue"),
  streakValue: document.getElementById("streakValue"),
  livesValue: document.getElementById("livesValue"),
  roundValue: document.getElementById("roundValue"),
  solvedValue: document.getElementById("solvedValue"),
  clueEmoji: document.getElementById("clueEmoji"),
  clueText: document.getElementById("clueText"),
  resultMark: document.getElementById("resultMark"),
  wordVisual: document.getElementById("wordVisual"),
  wordPhoto: document.getElementById("wordPhoto"),
  slots: document.getElementById("slots"),
  bank: document.getElementById("bank"),
  message: document.getElementById("message"),
  wordCard: document.getElementById("wordCard"),
  celebration: document.getElementById("celebration"),
  gameOverModal: document.getElementById("gameOverModal"),
  gameOverText: document.getElementById("gameOverText"),
  finalScore: document.getElementById("finalScore"),
  finalWords: document.getElementById("finalWords"),
  playAgain: document.getElementById("playAgain")
};

const state = {
  difficulty: "easy",
  queue: [],
  wordBank: {
    easy: [...INITIAL_WORD_BANK.easy],
    medium: [...INITIAL_WORD_BANK.medium],
    hard: [...INITIAL_WORD_BANK.hard]
  },
  currentWord: null,
  guess: [],
  activeSlot: 0,
  score: 0,
  streak: 0,
  lives: MAX_LIVES,
  round: 0,
  solved: 0,
  hintUsed: false,
  locked: false,
  isDownloadingWords: false,
  bankLetters: [],
  bankLetterCounts: {},
  imageCache: trimWordImageCache(readWordImageCache()),
  imageRequestId: 0,
  bestScore: Number(localStorage.getItem("spellSproutBest") || "0")
};

let sfxAudioContext = null;
let preferredSpeechVoice = null;
let speechVoicesPrimed = false;

function shuffle(list) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function randomLetter() {
  const alphabet = "abcdefghijklmnopqrstuvwxyz";
  return alphabet[Math.floor(Math.random() * alphabet.length)];
}

function randomPositiveMessage() {
  return POSITIVE_MESSAGES[Math.floor(Math.random() * POSITIVE_MESSAGES.length)];
}

function scoreSpeechVoice(voice) {
  const name = String(voice?.name || "").toLowerCase();
  const lang = String(voice?.lang || "").toLowerCase();
  let score = 0;

  if (lang === "en-us") score += 40;
  else if (lang.startsWith("en-")) score += 25;
  if (voice?.localService) score += 10;
  if (name.includes("google us english")) score += 100;
  if (name.includes("aria")) score += 85;
  if (name.includes("samantha")) score += 80;
  if (name.includes("alex")) score += 75;
  if (name.includes("zira")) score += 70;
  if (name.includes("allison")) score += 65;
  if (name.includes("karen")) score += 60;
  if (name.includes("english")) score += 15;

  return score;
}

function getPreferredSpeechVoice() {
  if (!("speechSynthesis" in window)) return null;

  const voices = speechSynthesis.getVoices();
  if (!Array.isArray(voices) || voices.length === 0) return null;

  if (preferredSpeechVoice && voices.includes(preferredSpeechVoice)) {
    return preferredSpeechVoice;
  }

  const englishVoices = voices.filter((voice) => /^en(-|$)/i.test(voice?.lang || ""));
  const pool = englishVoices.length ? englishVoices : voices;
  preferredSpeechVoice = [...pool].sort((a, b) => scoreSpeechVoice(b) - scoreSpeechVoice(a))[0] || null;
  return preferredSpeechVoice;
}

function primeSpeechVoices() {
  if (!("speechSynthesis" in window) || speechVoicesPrimed) return;
  speechVoicesPrimed = true;
  getPreferredSpeechVoice();

  if (typeof speechSynthesis.addEventListener === "function") {
    speechSynthesis.addEventListener("voiceschanged", () => {
      preferredSpeechVoice = null;
      getPreferredSpeechVoice();
    });
  }
}

function readRemoteWordCache() {
  try {
    const raw = localStorage.getItem(REMOTE_WORD_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch (_) {
    return null;
  }
}

function writeRemoteWordCache(cache) {
  try {
    localStorage.setItem(REMOTE_WORD_CACHE_KEY, JSON.stringify(cache));
  } catch (_) {
    // Ignore localStorage write failures and continue with in-memory words.
  }
}

function readWordImageCache() {
  try {
    const raw = localStorage.getItem(WORD_IMAGE_CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    return parsed;
  } catch (_) {
    return {};
  }
}

function writeWordImageCache(cache) {
  try {
    localStorage.setItem(WORD_IMAGE_CACHE_KEY, JSON.stringify(cache));
  } catch (_) {
    // Ignore localStorage write failures and continue with in-memory cache.
  }
}

function trimWordImageCache(cache) {
  const entries = Object.entries(cache);
  if (entries.length <= MAX_WORD_IMAGE_CACHE_ENTRIES) return cache;
  return Object.fromEntries(entries.slice(entries.length - MAX_WORD_IMAGE_CACHE_ENTRIES));
}

function getCachedWordImage(word) {
  if (!Object.prototype.hasOwnProperty.call(state.imageCache, word)) return undefined;
  const value = state.imageCache[word];
  return typeof value === "string" && value ? value : undefined;
}

function cacheWordImage(word, imageUrl) {
  if (!word || !imageUrl) return;
  state.imageCache[word] = imageUrl;
  state.imageCache = trimWordImageCache(state.imageCache);
  writeWordImageCache(state.imageCache);
}

function clearWordImage() {
  if (!ui.wordVisual || !ui.wordPhoto) return;
  ui.wordVisual.classList.add("hidden");
  ui.wordVisual.classList.remove("loading");
  ui.wordPhoto.removeAttribute("src");
  ui.wordPhoto.alt = "";
}

function showWordImageLoading() {
  if (!ui.wordVisual || !ui.wordPhoto) return;
  ui.wordVisual.classList.remove("hidden");
  ui.wordVisual.classList.add("loading");
  ui.wordPhoto.removeAttribute("src");
  ui.wordPhoto.alt = "Loading image";
}

function showWordImage(imageUrl, word) {
  if (!ui.wordVisual || !ui.wordPhoto) return;
  ui.wordVisual.classList.remove("hidden");
  ui.wordVisual.classList.remove("loading");
  ui.wordPhoto.src = imageUrl;
  ui.wordPhoto.alt = `Photo of ${word}`;
}

function singularizeForImageMatch(text) {
  if (text.endsWith("ies") && text.length > 4) return `${text.slice(0, -3)}y`;
  if (text.endsWith("es") && text.length > 4) return text.slice(0, -2);
  if (text.endsWith("s") && text.length > 3) return text.slice(0, -1);
  return text;
}

function normalizeForImageMatch(value) {
  const cleaned = String(value || "").toLowerCase().replace(/\s*\([^)]*\)\s*/g, " ");
  return cleaned.replace(/[^a-z]/g, "");
}

function scoreImageTitleMatch(word, pageTitle) {
  const normalizedWord = normalizeForImageMatch(word);
  const normalizedTitle = normalizeForImageMatch(pageTitle);
  if (!normalizedWord || !normalizedTitle) return 0;

  if (normalizedWord === normalizedTitle) return 100;

  const singularWord = singularizeForImageMatch(normalizedWord);
  const singularTitle = singularizeForImageMatch(normalizedTitle);
  if (singularWord && singularWord === singularTitle) return 90;

  return 0;
}

function pickImageFromWikipediaResponse(data, word) {
  const pages = Object.values(data?.query?.pages || {});
  const candidates = pages
    .filter((page) => page?.thumbnail?.source && !(page?.pageprops && "disambiguation" in page.pageprops))
    .map((page) => ({ page, score: scoreImageTitleMatch(word, page.title) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || (a.page.index || 9999) - (b.page.index || 9999));

  return candidates.length ? candidates[0].page.thumbnail.source : null;
}

function getWikipediaImageQueryParams() {
  return {
    format: "json",
    origin: "*",
    prop: "pageimages|pageprops",
    piprop: "thumbnail",
    pithumbsize: String(WORD_IMAGE_THUMB_SIZE),
    pilimit: "12"
  };
}

async function fetchWordImageByExactTitle(word) {
  const params = new URLSearchParams({
    action: "query",
    titles: word,
    redirects: "1",
    ...getWikipediaImageQueryParams()
  });
  const query = `${REMOTE_WORD_API}?${params.toString()}`;
  const data = await fetchJsonWithTimeout(query, REMOTE_WORD_TIMEOUT_MS);
  return pickImageFromWikipediaResponse(data, word);
}

async function fetchWordImageBySearch(word, searchTerm) {
  const params = new URLSearchParams({
    action: "query",
    generator: "search",
    gsrsearch: searchTerm,
    gsrlimit: "12",
    ...getWikipediaImageQueryParams()
  });
  const query = `${REMOTE_WORD_API}?${params.toString()}`;
  const data = await fetchJsonWithTimeout(query, REMOTE_WORD_TIMEOUT_MS);
  return pickImageFromWikipediaResponse(data, word);
}

async function fetchWordImage(word) {
  try {
    const exactMatch = await fetchWordImageByExactTitle(word);
    if (exactMatch) return exactMatch;
  } catch (_) {
    // Try search fallback.
  }

  const searchTerms = [`intitle:"${word}"`, `intitle:${word}`];
  for (const searchTerm of searchTerms) {
    try {
      const imageUrl = await fetchWordImageBySearch(word, searchTerm);
      if (imageUrl) return imageUrl;
    } catch (_) {
      // Try next query strategy.
    }
  }

  return null;
}

function renderWordImageForCurrentWord() {
  if (!state.currentWord || !ui.wordVisual || !ui.wordPhoto) return;
  const word = state.currentWord.word.toLowerCase();
  const cachedImage = getCachedWordImage(word);

  if (cachedImage) {
    showWordImage(cachedImage, word);
    return;
  }

  if (navigator.onLine === false) {
    clearWordImage();
    return;
  }

  const requestId = ++state.imageRequestId;
  showWordImageLoading();

  fetchWordImage(word)
    .then((imageUrl) => {
      if (requestId !== state.imageRequestId) return;
      if (!state.currentWord || state.currentWord.word.toLowerCase() !== word) return;
      if (!imageUrl) {
        clearWordImage();
        return;
      }
      cacheWordImage(word, imageUrl);
      showWordImage(imageUrl, word);
    })
    .catch(() => {
      if (requestId !== state.imageRequestId) return;
      clearWordImage();
    });
}

function handleWordImageError() {
  if (!state.currentWord) {
    clearWordImage();
    return;
  }
  const word = state.currentWord.word.toLowerCase();
  if (state.imageCache[word]) {
    delete state.imageCache[word];
    writeWordImageCache(state.imageCache);
  }
  clearWordImage();
}

function purgeLegacyRemoteWordCaches() {
  LEGACY_REMOTE_WORD_CACHE_KEYS.forEach((key) => {
    try {
      localStorage.removeItem(key);
    } catch (_) {
      // Ignore localStorage failures and continue.
    }
  });
}

function normalizeOnlineWord(rawWord) {
  return String(rawWord || "").trim().toLowerCase();
}

function normalizeForSafety(rawWord) {
  const leetMap = {
    "0": "o",
    "1": "i",
    "3": "e",
    "4": "a",
    "5": "s",
    "7": "t",
    "8": "b",
    "9": "g"
  };
  const replaced = String(rawWord || "")
    .toLowerCase()
    .replace(/[01345789]/g, (digit) => leetMap[digit] || "");
  return replaced.replace(/[^a-z]/g, "");
}

function isKidSafeWord(word) {
  const normalized = normalizeForSafety(word);
  if (!normalized) return false;
  if (HARD_BLOCKED_WORDS.has(normalized)) return false;
  if (HARD_BLOCKED_PATTERNS.some((pattern) => pattern.test(normalized))) return false;
  return KID_SAFE_ALLOWLIST.has(normalized);
}

function isUsableOnlineWord(word, difficulty) {
  const rules = WORD_DIFFICULTY_RULES[difficulty];
  if (!rules) return false;
  if (!/^[a-z]+$/.test(word)) return false;
  if (word.length < rules.minLength || word.length > rules.maxLength) return false;
  if (!isKidSafeWord(word)) return false;
  return true;
}

function uniqueWordEntries(entries) {
  return dedupeWordEntries(entries);
}

function mergeRemoteWordsIntoBank(difficulty, remoteEntries) {
  const merged = uniqueWordEntries([...remoteEntries, ...INITIAL_WORD_BANK[difficulty]]);
  if (merged.length > 0) {
    state.wordBank[difficulty] = merged;
  }
}

function sanitizeWordBank() {
  ["easy", "medium", "hard"].forEach((difficulty) => {
    const builtInWords = new Set(INITIAL_WORD_BANK[difficulty].map((entry) => entry.word.toLowerCase()));
    const source = Array.isArray(state.wordBank[difficulty]) ? state.wordBank[difficulty] : [];
    const filtered = source.filter((entry) => {
      if (!entry || typeof entry.word !== "string") return false;
      const normalized = normalizeOnlineWord(entry.word);
      if (builtInWords.has(normalized)) return true;
      return isUsableOnlineWord(normalized, difficulty);
    });
    state.wordBank[difficulty] = uniqueWordEntries([...filtered, ...INITIAL_WORD_BANK[difficulty]]);
  });
}

function loadCachedRemoteWords() {
  const cached = readRemoteWordCache();
  if (!cached) return;

  ["easy", "medium", "hard"].forEach((difficulty) => {
    const entries = Array.isArray(cached[difficulty]) ? cached[difficulty] : [];
    if (!entries.length) return;

    const filtered = entries.filter((entry) => {
      if (!entry || typeof entry.word !== "string") return false;
      return isUsableOnlineWord(entry.word.toLowerCase(), difficulty);
    });
    if (filtered.length) {
      mergeRemoteWordsIntoBank(difficulty, filtered);
    }
  });
}

async function fetchJsonWithTimeout(url, timeoutMs) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

function buildRemoteWordEntry(word, difficulty) {
  const firstLetter = word[0] ? word[0].toUpperCase() : "?";
  return {
    word,
    clue: `Online bonus word: ${word.length} letters, starts with ${firstLetter}.`,
    emoji: WORD_DIFFICULTY_RULES[difficulty].emoji
  };
}

function extractCandidateWords(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

async function fetchWikipediaTopicWords(topic, difficulty) {
  const randomOffset = Math.floor(Math.random() * 800);
  const params = new URLSearchParams({
    action: "query",
    list: "search",
    format: "json",
    origin: "*",
    utf8: "1",
    srlimit: String(REMOTE_SEARCH_LIMIT),
    sroffset: String(randomOffset),
    srsearch: `${topic} words for kids`
  });

  const query = `${REMOTE_WORD_API}?${params.toString()}`;
  const data = await fetchJsonWithTimeout(query, REMOTE_WORD_TIMEOUT_MS);
  const rows = Array.isArray(data?.query?.search) ? data.query.search : [];
  const entries = [];

  rows.forEach((row) => {
    extractCandidateWords(row.title).forEach((candidate) => {
      if (!isUsableOnlineWord(candidate, difficulty)) return;
      entries.push(buildRemoteWordEntry(candidate, difficulty));
    });
  });

  return uniqueWordEntries(entries);
}

async function downloadWordsForDifficulty(difficulty) {
  const topics = REMOTE_TOPICS[difficulty] || [];
  if (!topics.length) return [];

  const requests = topics.map(async (topic) => {
    try {
      return await fetchWikipediaTopicWords(topic, difficulty);
    } catch (_) {
      return [];
    }
  });

  const settled = await Promise.all(requests);
  const newEntries = [];
  const seen = new Set(state.wordBank[difficulty].map((entry) => entry.word.toLowerCase()));

  settled.forEach((entries) => {
    entries.forEach((entry) => {
      const normalized = normalizeOnlineWord(entry.word);
      if (seen.has(normalized)) return;
      seen.add(normalized);
      newEntries.push(entry);
    });
  });

  return uniqueWordEntries(newEntries).slice(0, 30);
}

async function refreshWordsFromInternet(difficulty) {
  const likelyOffline = navigator.onLine === false;
  const downloaded = await downloadWordsForDifficulty(difficulty);
  if (downloaded.length < REMOTE_MIN_WORD_COUNT) {
    return likelyOffline ? "offline" : "failed";
  }

  mergeRemoteWordsIntoBank(difficulty, downloaded);

  const cache = readRemoteWordCache() || {};
  cache[difficulty] = downloaded;
  cache.savedAt = Date.now();
  writeRemoteWordCache(cache);
  return "downloaded";
}

function setMessage(text, type = "info") {
  ui.message.className = `message ${type}`;
  ui.message.textContent = text;
}

function setResultMark(status) {
  if (!ui.resultMark) return;

  if (status === "correct") {
    ui.resultMark.textContent = "✓";
    ui.resultMark.className = "result-mark correct";
    ui.resultMark.setAttribute("aria-label", "Correct spelling");
    return;
  }
  if (status === "wrong") {
    ui.resultMark.textContent = "✗";
    ui.resultMark.className = "result-mark wrong";
    ui.resultMark.setAttribute("aria-label", "Incorrect spelling");
    return;
  }
  ui.resultMark.textContent = "";
  ui.resultMark.className = "result-mark hidden";
  ui.resultMark.setAttribute("aria-label", "Spelling result");
}

function updateHud() {
  ui.scoreValue.textContent = String(state.score);
  ui.bestValue.textContent = String(state.bestScore);
  ui.streakValue.textContent = String(state.streak);
  ui.livesValue.textContent = `${"❤".repeat(state.lives)}${"♡".repeat(MAX_LIVES - state.lives)}`;
  ui.roundValue.textContent = String(state.round);
  ui.solvedValue.textContent = String(state.solved);
}

function nextEmptySlot(startIndex = 0) {
  for (let i = startIndex; i < state.guess.length; i += 1) {
    if (!state.guess[i]) return i;
  }
  for (let i = 0; i < state.guess.length; i += 1) {
    if (!state.guess[i]) return i;
  }
  return state.guess.length - 1;
}

function countLetters(chars) {
  const counts = {};
  chars.forEach((char) => {
    const normalized = String(char || "").toLowerCase();
    if (!normalized) return;
    counts[normalized] = (counts[normalized] || 0) + 1;
  });
  return counts;
}

function usedLetterCount(letter) {
  const normalized = letter.toLowerCase();
  return state.guess.reduce((total, guessLetter) => total + (guessLetter === normalized ? 1 : 0), 0);
}

function canUseLetterFromBank(letter) {
  const normalized = letter.toLowerCase();
  const available = state.bankLetterCounts[normalized] || 0;
  return usedLetterCount(normalized) < available;
}

function updateLetterBankState() {
  const buttons = ui.bank.querySelectorAll(".letter-btn");
  buttons.forEach((button) => {
    const letter = button.dataset.letter || "";
    if (!letter) return;
    const disabled = !canUseLetterFromBank(letter);
    button.disabled = disabled;
    button.setAttribute("aria-disabled", disabled ? "true" : "false");
  });
}

function renderSlots() {
  const slotEls = ui.slots.querySelectorAll(".slot");
  slotEls.forEach((slot, index) => {
    slot.textContent = state.guess[index] ? state.guess[index].toUpperCase() : "";
    slot.classList.toggle("filled", Boolean(state.guess[index]));
    slot.classList.toggle("active", index === state.activeSlot);
  });
  updateLetterBankState();
}

function renderWordCard() {
  ui.clueEmoji.textContent = state.currentWord.emoji;
  ui.clueText.textContent = state.currentWord.clue;
  setResultMark("none");

  ui.slots.innerHTML = "";
  state.currentWord.word.split("").forEach((_, index) => {
    const slot = document.createElement("button");
    slot.type = "button";
    slot.className = "slot";
    slot.setAttribute("aria-label", `Letter ${index + 1}`);
    slot.addEventListener("click", () => {
      state.activeSlot = index;
      renderSlots();
    });
    ui.slots.appendChild(slot);
  });

  renderSlots();
  renderWordImageForCurrentWord();
}

function buildLetterBank() {
  const letters = state.currentWord.word.split("");
  const extraCount = Math.max(8, 14 - letters.length);
  const extras = [];

  while (extras.length < extraCount) {
    extras.push(randomLetter());
  }

  const pool = shuffle([...letters, ...extras]);
  state.bankLetters = [...pool];
  state.bankLetterCounts = countLetters(pool);
  ui.bank.innerHTML = "";

  pool.forEach((char) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "letter-btn";
    button.textContent = char.toUpperCase();
    button.dataset.letter = char.toLowerCase();
    button.setAttribute("aria-label", `Letter ${char.toUpperCase()}`);
    button.addEventListener("click", () => addLetter(char));
    ui.bank.appendChild(button);
  });
  updateLetterBankState();
}

async function startGame(options = {}) {
  const { downloadOnlineWords = false } = options;
  if (state.isDownloadingWords) return;

  state.difficulty = ui.difficulty.value;
  sanitizeWordBank();
  let downloadStatus = "skipped";
  if (downloadOnlineWords) {
    state.isDownloadingWords = true;
    ui.newGame.disabled = true;
    setMessage("Checking internet for new words...", "info");
    try {
      downloadStatus = await refreshWordsFromInternet(state.difficulty);
    } catch (_) {
      downloadStatus = "failed";
    }
    state.isDownloadingWords = false;
    ui.newGame.disabled = false;
  }

  state.queue = shuffle(state.wordBank[state.difficulty]);
  state.currentWord = null;
  state.guess = [];
  state.activeSlot = 0;
  state.score = 0;
  state.streak = 0;
  state.lives = MAX_LIVES;
  state.round = 0;
  state.solved = 0;
  state.hintUsed = false;
  state.locked = false;
  state.bankLetters = [];
  state.bankLetterCounts = {};
  state.imageRequestId += 1;
  clearWordImage();
  ui.useHint.disabled = false;
  ui.gameOverModal.classList.add("hidden");
  ui.gameOverModal.setAttribute("aria-hidden", "true");
  nextRound();
  if (downloadStatus === "downloaded") {
    setMessage("New words downloaded. Press Hear Word and start spelling!", "good");
  } else if (downloadStatus === "failed") {
    setMessage("Could not download new words. Using saved words.", "info");
  } else if (downloadStatus === "offline") {
    setMessage("You are offline. Using saved words.", "info");
  } else {
    setMessage("Press Hear Word and start spelling!", "info");
  }
}

function nextRound() {
  if (state.lives <= 0) {
    showGameOver();
    return;
  }

  if (state.queue.length === 0) {
    state.queue = shuffle(state.wordBank[state.difficulty]);
  }

  state.round += 1;
  state.currentWord = state.queue.pop();
  state.guess = new Array(state.currentWord.word.length).fill("");
  state.activeSlot = 0;
  state.hintUsed = false;
  state.locked = false;

  ui.useHint.disabled = false;
  renderWordCard();
  buildLetterBank();
  updateHud();
}

function addLetter(letter) {
  if (state.locked || !state.currentWord) return;
  const normalizedLetter = letter.toLowerCase();
  if (!canUseLetterFromBank(normalizedLetter)) {
    setMessage(`No more ${normalizedLetter.toUpperCase()} tiles left in the letter bank.`, "info");
    return;
  }

  let index = state.activeSlot;
  if (state.guess[index]) {
    index = nextEmptySlot(index);
  }
  if (index < 0) return;

  state.guess[index] = normalizedLetter;
  state.activeSlot = nextEmptySlot(index + 1);
  renderSlots();
  setResultMark("none");

  if (!state.guess.includes("")) {
    const attempt = state.guess.join("").toLowerCase();
    if (attempt !== state.currentWord.word) return;

    setTimeout(() => {
      const latestAttempt = state.guess.join("").toLowerCase();
      if (!state.locked && !state.guess.includes("") && latestAttempt === state.currentWord.word) {
        checkWord();
      }
    }, 120);
  }
}

function removeLetter() {
  if (state.locked || !state.currentWord) return;

  let index = state.activeSlot;
  if (!state.guess[index]) {
    index = state.guess.map((char, i) => (char ? i : -1)).filter((i) => i >= 0).pop();
  }

  if (typeof index !== "number") return;
  state.guess[index] = "";
  state.activeSlot = index;
  renderSlots();
  setResultMark("none");
}

function revealHelpfulLetter() {
  const answer = state.currentWord.word;
  const mismatch = [];
  for (let i = 0; i < answer.length; i += 1) {
    if (state.guess[i] !== answer[i]) mismatch.push(i);
  }
  if (mismatch.length === 0) return false;

  const revealIndex = mismatch[Math.floor(Math.random() * mismatch.length)];
  state.guess[revealIndex] = answer[revealIndex];

  for (let i = 0; i < answer.length; i += 1) {
    if (i !== revealIndex && state.guess[i] !== answer[i]) {
      state.guess[i] = "";
    }
  }

  state.activeSlot = nextEmptySlot(revealIndex + 1);
  renderSlots();
  return true;
}

function useHint() {
  if (state.locked || !state.currentWord) return;
  if (state.hintUsed) {
    setMessage("You already used a hint for this word.", "info");
    return;
  }

  const revealed = revealHelpfulLetter();
  if (!revealed) return;

  state.hintUsed = true;
  ui.useHint.disabled = true;
  setResultMark("none");
  setMessage("Hint used: one correct letter has been filled in.", "info");
}

function celebrate() {
  for (let i = 0; i < 14; i += 1) {
    const spark = document.createElement("span");
    spark.className = "spark";
    spark.style.left = `${Math.random() * 100}%`;
    spark.style.background = `hsl(${Math.floor(Math.random() * 360)}, 85%, 60%)`;
    spark.style.animationDelay = `${Math.random() * 0.1}s`;
    ui.celebration.appendChild(spark);
    spark.addEventListener("animationend", () => spark.remove());
  }
}

function getSfxContext() {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;

  if (!sfxAudioContext) {
    sfxAudioContext = new AudioCtx();
  }

  if (sfxAudioContext.state === "suspended") {
    sfxAudioContext.resume().catch(() => {});
  }
  return sfxAudioContext;
}

function playCheerSound() {
  const ctx = getSfxContext();
  if (!ctx) return;

  const now = ctx.currentTime + 0.02;
  const notes = [523.25, 659.25, 783.99, 1046.5];

  notes.forEach((freq, index) => {
    const start = now + index * 0.08;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, start);

    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.15, start + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.18);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + 0.2);
  });
}

function playWrongSound() {
  const ctx = getSfxContext();
  if (!ctx) return;

  const now = ctx.currentTime + 0.02;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(320, now);
  osc.frequency.exponentialRampToValueAtTime(150, now + 0.26);

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.12, now + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.3);
}

function animateWordCard(animationClass) {
  ui.wordCard.classList.remove("shake", "pulse");
  void ui.wordCard.offsetWidth;
  ui.wordCard.classList.add(animationClass);
}

function checkWord() {
  if (state.locked || !state.currentWord) return;
  if (state.guess.includes("")) {
    setMessage("Fill every letter box first.", "info");
    return;
  }

  state.locked = true;
  const answer = state.currentWord.word;
  const attempt = state.guess.join("").toLowerCase();

  if (attempt === answer) {
    let points = POINTS[state.difficulty] + Math.min(state.streak * 2, 10);
    if (state.hintUsed) points = Math.max(points - 3, 5);

    state.score += points;
    state.streak += 1;
    state.solved += 1;
    if (state.score > state.bestScore) {
      state.bestScore = state.score;
      localStorage.setItem("spellSproutBest", String(state.bestScore));
    }

    updateHud();
    setResultMark("correct");
    animateWordCard("pulse");
    celebrate();
    playCheerSound();
    setMessage(`${randomPositiveMessage()} +${points} points`, "good");

    setTimeout(() => {
      state.locked = false;
      nextRound();
    }, 900);
    return;
  }

  state.lives -= 1;
  state.streak = 0;
  updateHud();
  setResultMark("wrong");
  animateWordCard("shake");
  playWrongSound();

  if (state.lives <= 0) {
    setMessage(`The word was ${answer.toUpperCase()}.`, "bad");
    setTimeout(() => {
      state.locked = false;
      showGameOver();
    }, 1000);
    return;
  }

  state.locked = false;
  setMessage(`Not quite. Listen again and try. Lives left: ${state.lives}`, "bad");
}

function speakWord() {
  if (!state.currentWord) return;

  if (!("speechSynthesis" in window)) {
    setMessage("This browser has no speech support. Use the clue text.", "info");
    return;
  }

  const word = state.currentWord.word.toLowerCase();
  const utterance = new SpeechSynthesisUtterance(word);
  const voice = getPreferredSpeechVoice();
  if (voice) {
    utterance.voice = voice;
    utterance.lang = voice.lang || "en-US";
  } else {
    utterance.lang = "en-US";
  }
  utterance.rate = 0.88;
  utterance.pitch = 1;
  utterance.volume = 1;
  speechSynthesis.cancel();
  speechSynthesis.speak(utterance);
  setMessage("Listen carefully and spell the word you hear.", "info");
}

function showGameOver() {
  state.locked = true;
  ui.gameOverModal.classList.remove("hidden");
  ui.gameOverModal.setAttribute("aria-hidden", "false");
  ui.finalScore.textContent = String(state.score);
  ui.finalWords.textContent = String(state.solved);

  if (state.solved >= 10) {
    ui.gameOverText.textContent = "Amazing! Your spelling garden is blooming!";
  } else if (state.solved >= 5) {
    ui.gameOverText.textContent = "Nice work! Keep practicing to grow more words.";
  } else {
    ui.gameOverText.textContent = "Great effort! Start again and beat your score.";
  }
}

function handleKeyboard(event) {
  if (state.locked) return;
  const key = event.key;

  if (/^[a-zA-Z]$/.test(key)) {
    addLetter(key.toLowerCase());
    return;
  }

  if (key === "Backspace") {
    event.preventDefault();
    removeLetter();
    return;
  }

  if (key === "Enter") {
    checkWord();
  }
}

function bindEvents() {
  primeSpeechVoices();
  ui.newGame.addEventListener("click", () => {
    startGame({ downloadOnlineWords: true });
  });
  ui.hearWord.addEventListener("click", speakWord);
  ui.useHint.addEventListener("click", useHint);
  ui.backspace.addEventListener("click", removeLetter);
  ui.checkWord.addEventListener("click", checkWord);
  ui.playAgain.addEventListener("click", () => {
    startGame({ downloadOnlineWords: true });
  });
  ui.difficulty.addEventListener("change", () => {
    startGame();
  });
  if (ui.wordPhoto) {
    ui.wordPhoto.addEventListener("error", handleWordImageError);
  }
  document.addEventListener("keydown", handleKeyboard);
}

purgeLegacyRemoteWordCaches();
loadCachedRemoteWords();
bindEvents();
startGame();
