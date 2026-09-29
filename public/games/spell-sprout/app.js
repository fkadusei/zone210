import { THEMES, poolFor } from "./words.js";

const ROUNDS = 10;
const TRIES = 3;
const POINTS = { easy: 10, medium: 15, hard: 20 };
const EXTRA_LETTERS = { easy: 2, medium: 3, hard: 4 };
const NEXT_LEVEL = { easy: "medium", medium: "hard", hard: "easy" };
const PLANT = { 3: "🌻", 2: "🌷", 1: "🌿", 0: "🥀" };
const CHEERS = ["Great job!", "Wonderful!", "You got it!", "Brilliant!", "Super speller!", "Fantastic!", "Well done!"];
const KEYS = { best: "zone210_spell_best", seen: "zone210_spell_seen", level: "zone210_spell_level", mute: "zone210_spell_mute", theme: "zone210_spell_theme" };

const $ = (id) => document.getElementById(id);
const el = {
  score: $("score"), streak: $("streak"), best: $("best"), round: $("round"),
  garden: $("garden"), card: $("card"), picture: $("picture"), clue: $("clue"),
  tries: $("tries"), slots: $("slots"), bank: $("bank"), msg: $("msg"), burst: $("burst"),
  hear: $("hear"), slow: $("slow"), hint: $("hint"), back: $("back"), check: $("check"),
  end: $("end"),
};

const store = {
  get(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch (err) {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      /* private mode */
    }
  },
};

const game = {
  level: store.get(KEYS.level, "easy"),
  theme: store.get(KEYS.theme, "mixed"),
  muted: store.get(KEYS.mute, false),
  words: [],
  index: 0,
  score: 0,
  streak: 0,
  results: [], // stars per finished word (0 = missed)
  round: null,
  locked: false,
};
if (!["easy", "medium", "hard"].includes(game.level)) game.level = "easy";
if (!THEMES.some((t) => t.id === game.theme)) game.theme = "mixed";
const packKey = () => `${game.level}:${game.theme}`;

const shuffle = (list) => {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const bestScores = () => store.get(KEYS.best, {});

// ---------- sound ----------
let audio = null;
function tone(freq, start, length, type = "sine", gain = 0.12) {
  if (game.muted) return;
  try {
    audio = window.z210Audio ? window.z210Audio.get() : audio || new (window.AudioContext || window.webkitAudioContext)();
    if (!audio) return;
    const t = audio.currentTime + start;
    const osc = audio.createOscillator();
    const amp = audio.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    amp.gain.setValueAtTime(0.0001, t);
    amp.gain.exponentialRampToValueAtTime(gain, t + 0.02);
    amp.gain.exponentialRampToValueAtTime(0.0001, t + length);
    osc.connect(amp).connect(audio.destination);
    osc.start(t);
    osc.stop(t + length + 0.02);
  } catch (err) {
    /* audio unavailable */
  }
}
const sfx = {
  tap: () => tone(620, 0, 0.06, "triangle", 0.08),
  right: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, i * 0.09, 0.22, "triangle")),
  wrong: () => {
    tone(220, 0, 0.18, "sawtooth", 0.07);
    tone(175, 0.13, 0.25, "sawtooth", 0.07);
  },
  win: () => [523, 659, 784, 659, 784, 1046, 1318].forEach((f, i) => tone(f, i * 0.11, 0.3, "triangle")),
};

// ---------- speech ----------
let voice = null;
function pickVoice() {
  if (!("speechSynthesis" in window)) return;
  const voices = speechSynthesis.getVoices().filter((v) => /^en/i.test(v.lang));
  const score = (v) =>
    (/^en-(US|GB|AU)/i.test(v.lang) ? 2 : 0) + (/natural|premium|enhanced|samantha|daniel|karen|google/i.test(v.name) ? 3 : 0) + (v.localService ? 0 : 1);
  voice = voices.sort((a, b) => score(b) - score(a))[0] || null;
}
if ("speechSynthesis" in window) {
  pickVoice();
  speechSynthesis.addEventListener?.("voiceschanged", pickVoice);
}
function say(text, rate = 0.9) {
  if (!("speechSynthesis" in window)) {
    setMessage("This browser can't speak. Use the picture and the clue.");
    return;
  }
  const u = new SpeechSynthesisUtterance(text);
  if (voice) {
    u.voice = voice;
    u.lang = voice.lang;
  } else u.lang = "en-US";
  u.rate = rate;
  speechSynthesis.cancel();
  speechSynthesis.speak(u);
}

// ---------- helpers ----------
function setMessage(text, kind = "") {
  el.msg.textContent = text;
  el.msg.className = "g-status" + (kind ? ` ${kind}` : "");
}

function pickWords() {
  const pool = poolFor(game.level, game.theme);
  const all = store.get(KEYS.seen, {});
  const seen = new Set(all[packKey()] || []);
  let fresh = pool.filter((w) => !seen.has(w.word));
  if (fresh.length < ROUNDS) {
    seen.clear();
    fresh = pool;
  }
  const chosen = shuffle(fresh).slice(0, ROUNDS);
  chosen.forEach((w) => seen.add(w.word));
  all[packKey()] = [...seen];
  store.set(KEYS.seen, all);
  return chosen;
}

// ---------- rendering ----------
function renderGarden() {
  el.garden.innerHTML = "";
  for (let i = 0; i < ROUNDS; i += 1) {
    const plot = document.createElement("div");
    const done = i < game.results.length;
    plot.className = "plot" + (i === game.index && !done ? " now" : "") + (done ? " grown" : "");
    plot.textContent = done ? PLANT[game.results[i]] : i === game.index ? "🌱" : "";
    el.garden.appendChild(plot);
  }
}

function renderStats() {
  el.score.textContent = game.score;
  el.streak.textContent = game.streak;
  el.best.textContent = bestScores()[packKey()] || 0;
  el.round.textContent = `${Math.min(game.index + 1, ROUNDS)}/${ROUNDS}`;
}

function renderTries() {
  el.tries.innerHTML = "";
  for (let i = 0; i < TRIES; i += 1) {
    const s = document.createElement("span");
    s.textContent = i < game.round.tries ? "💚" : "🤍";
    el.tries.appendChild(s);
  }
  el.tries.setAttribute("aria-label", `${game.round.tries} tries left`);
}

function renderSlots(flash = null) {
  const r = game.round;
  el.slots.innerHTML = "";
  el.slots.style.setProperty("--len", r.letters.length);
  r.letters.forEach((_, i) => {
    const slot = document.createElement("button");
    slot.type = "button";
    const g = r.guess[i];
    slot.className = "slot" + (g ? " filled" : "") + (r.locked[i] ? " locked" : "") + (flash && flash[i] ? ` ${flash[i]}` : "");
    slot.textContent = g ? g.ch : "";
    slot.setAttribute("aria-label", g ? `Letter ${i + 1}: ${g.ch}${r.locked[i] ? ", correct" : ". Press to remove"}` : `Letter ${i + 1}: empty`);
    slot.addEventListener("click", () => removeAt(i));
    el.slots.appendChild(slot);
  });
}

function renderBank() {
  const r = game.round;
  el.bank.innerHTML = "";
  r.tiles.forEach((tile) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "tile" + (tile.used ? " used" : "");
    b.textContent = tile.ch;
    b.disabled = tile.used;
    b.setAttribute("aria-label", tile.ch);
    b.addEventListener("click", () => addTile(tile));
    el.bank.appendChild(b);
  });
}

function renderAll() {
  renderStats();
  renderGarden();
  renderTries();
  renderSlots();
  renderBank();
}

// ---------- round flow ----------
function startRound() {
  const entry = game.words[game.index];
  const letters = entry.word.split("");
  const extras = shuffle("abcdefghijklmnopqrstuvwxyz".split("").filter((c) => !letters.includes(c))).slice(0, EXTRA_LETTERS[game.level]);
  game.round = {
    entry,
    letters,
    guess: Array(letters.length).fill(null),
    locked: Array(letters.length).fill(false),
    tiles: shuffle([...letters, ...extras]).map((ch, id) => ({ id, ch, used: false })),
    tries: TRIES,
    hints: 0,
    mistakes: 0,
  };
  game.locked = false;
  el.picture.textContent = entry.emoji;
  el.picture.classList.remove("pop");
  void el.picture.offsetWidth;
  el.picture.classList.add("pop");
  el.clue.textContent = entry.clue;
  el.hint.disabled = false;
  el.check.disabled = false;
  renderAll();
  setMessage("Listen, then spell the word.");
  if (!game.muted) setTimeout(() => game.round?.entry === entry && say(entry.word), 450);
}

function newGame() {
  game.words = pickWords();
  game.index = 0;
  game.score = 0;
  game.streak = 0;
  game.results = [];
  el.end.classList.remove("show");
  startRound();
}

function addTile(tile) {
  const r = game.round;
  if (game.locked || tile.used) return;
  const slot = r.guess.findIndex((g, i) => !g && !r.locked[i]);
  if (slot === -1) return;
  tile.used = true;
  r.guess[slot] = { ch: tile.ch, tile };
  sfx.tap();
  renderSlots();
  renderBank();
  if (r.guess.every(Boolean)) setMessage("Press Check when you are ready.");
}

function removeAt(i) {
  const r = game.round;
  if (game.locked || !r.guess[i] || r.locked[i]) return;
  r.guess[i].tile.used = false;
  r.guess[i] = null;
  renderSlots();
  renderBank();
}

function removeLast() {
  const r = game.round;
  for (let i = r.guess.length - 1; i >= 0; i -= 1) {
    if (r.guess[i] && !r.locked[i]) return removeAt(i);
  }
}

function typeLetter(ch) {
  const tile = game.round.tiles.find((t) => t.ch === ch && !t.used);
  if (tile) addTile(tile);
  else sfx.wrong();
}

function useHint() {
  const r = game.round;
  if (game.locked) return;
  const i = r.guess.findIndex((g, idx) => !r.locked[idx] && (!g || g.ch !== r.letters[idx]));
  if (i === -1) return;
  if (r.hints >= r.letters.length - 1) {
    setMessage("You have all the hints you can have. You can do it!");
    return;
  }
  if (r.guess[i]) {
    r.guess[i].tile.used = false;
    r.guess[i] = null;
  }
  const ch = r.letters[i];
  let tile = r.tiles.find((t) => t.ch === ch && !t.used);
  if (!tile) {
    // the letter is sitting in a wrong slot: take it from there
    const from = r.guess.findIndex((g, idx) => g && g.ch === ch && !r.locked[idx] && idx !== i);
    tile = r.guess[from].tile;
    r.guess[from] = null;
  }
  tile.used = true;
  r.guess[i] = { ch, tile };
  r.locked[i] = true;
  r.hints += 1;
  sfx.tap();
  renderSlots();
  renderBank();
  setMessage(`Hint: letter ${i + 1} is ${ch.toUpperCase()}.`);
}

function starsFor(r) {
  return Math.max(1, 3 - r.mistakes - r.hints);
}

async function check() {
  const r = game.round;
  if (game.locked) return;
  if (!r.guess.every(Boolean)) {
    setMessage("Fill in every box first.");
    return;
  }
  game.locked = true;
  const flash = r.guess.map((g, i) => (g.ch === r.letters[i] ? "good" : "bad"));
  renderSlots(flash);

  if (flash.every((f) => f === "good")) {
    const stars = starsFor(r);
    game.results.push(stars);
    game.streak += 1;
    const points = POINTS[game.level] * stars + Math.min(game.streak - 1, 5) * 2;
    game.score += points;
    const all = bestScores();
    if (game.score > (all[packKey()] || 0)) {
      all[packKey()] = game.score;
      store.set(KEYS.best, all);
    }
    sfx.right();
    burst("✨");
    el.card.classList.add("cheer");
    setMessage(`${CHEERS[Math.floor(Math.random() * CHEERS.length)]} ${"⭐".repeat(stars)} +${points}`, "good");
    renderStats();
    renderGarden();
    if (!game.muted) say(r.entry.word, 1);
    await sleep(1500);
    el.card.classList.remove("cheer");
    return advance();
  }

  // wrong
  sfx.wrong();
  r.mistakes += 1;
  r.tries -= 1;
  game.streak = 0;
  el.card.classList.add("shake");
  setTimeout(() => el.card.classList.remove("shake"), 500);
  renderTries();
  renderStats();
  await sleep(900);

  if (r.tries <= 0) {
    // show the answer, then move on
    r.tiles.forEach((t) => (t.used = false));
    r.letters.forEach((ch, i) => {
      const tile = r.tiles.find((t) => t.ch === ch && !t.used);
      tile.used = true;
      r.guess[i] = { ch, tile };
      r.locked[i] = true;
    });
    game.results.push(0);
    renderSlots();
    renderBank();
    renderGarden();
    setMessage(`The word was ${r.entry.word.toUpperCase()}. You'll get it next time!`, "bad");
    if (!game.muted) say(`${r.entry.word}. ${r.entry.word.split("").join(", ")}.`, 0.75);
    await sleep(2800);
    return advance();
  }

  // keep the right letters, send the wrong ones back to the bank
  r.guess.forEach((g, i) => {
    if (g.ch === r.letters[i]) r.locked[i] = true;
    else {
      g.tile.used = false;
      r.guess[i] = null;
    }
  });
  game.locked = false;
  renderSlots();
  renderBank();
  setMessage(`Not quite. Green letters are right. ${r.tries} ${r.tries === 1 ? "try" : "tries"} left.`, "bad");
}

function advance() {
  game.index += 1;
  if (game.index >= ROUNDS) return finish();
  startRound();
}

function finish() {
  const stars = game.results.reduce((a, b) => a + b, 0);
  const missed = game.words.filter((_, i) => game.results[i] === 0);
  const perfect = missed.length === 0;
  $("endEmoji").textContent = stars >= 24 ? "🌻" : stars >= 14 ? "🌷" : "🌱";
  $("endTitle").textContent = stars >= 24 ? "Amazing garden!" : stars >= 14 ? "Lovely garden!" : "Your garden is growing!";
  $("endText").textContent = `${stars} of ${ROUNDS * 3} stars · ${game.score} points`;
  $("endGarden").textContent = game.results.map((s) => PLANT[s]).join(" ");
  const practice = $("practice");
  practice.hidden = perfect;
  practice.innerHTML = "";
  if (!perfect) {
    const h = document.createElement("b");
    h.textContent = "Words to practice";
    practice.appendChild(h);
    missed.forEach((w) => {
      const s = document.createElement("span");
      s.textContent = `${w.emoji} ${w.word}`;
      practice.appendChild(s);
    });
  }
  $("endNext").textContent = game.level === "hard" ? "Start over at Easy" : `Try ${NEXT_LEVEL[game.level]}`;
  el.end.classList.add("show");
  sfx.win();
  burst("🌟", 20);
}

function burst(symbol, count = 12) {
  el.burst.innerHTML = "";
  for (let i = 0; i < count; i += 1) {
    const p = document.createElement("span");
    p.textContent = symbol;
    p.style.setProperty("--x", `${(Math.random() - 0.5) * 320}px`);
    p.style.setProperty("--y", `${-40 - Math.random() * 160}px`);
    p.style.setProperty("--d", `${Math.random() * 0.2}s`);
    el.burst.appendChild(p);
  }
  setTimeout(() => (el.burst.innerHTML = ""), 1400);
}

// ---------- controls ----------
function setLevel(level) {
  game.level = level;
  store.set(KEYS.level, level);
  document.querySelectorAll("#level .g-chip").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.value === level)));
}

const themeBox = $("theme");
THEMES.forEach((t) => {
  const b = document.createElement("button");
  b.className = "g-chip";
  b.dataset.value = t.id;
  b.setAttribute("aria-pressed", String(t.id === game.theme));
  b.textContent = `${t.emoji} ${t.label}`;
  b.addEventListener("click", () => {
    if (t.id === game.theme) return;
    game.theme = t.id;
    store.set(KEYS.theme, t.id);
    themeBox.querySelectorAll(".g-chip").forEach((c) => c.setAttribute("aria-pressed", String(c.dataset.value === t.id)));
    newGame();
  });
  themeBox.appendChild(b);
});

document.querySelectorAll("#level .g-chip").forEach((b) =>
  b.addEventListener("click", () => {
    if (b.dataset.value === game.level) return;
    setLevel(b.dataset.value);
    newGame();
  })
);
$("newGame").addEventListener("click", newGame);
$("endAgain").addEventListener("click", newGame);
$("endNext").addEventListener("click", () => {
  setLevel(NEXT_LEVEL[game.level]);
  newGame();
});
el.hear.addEventListener("click", () => say(game.round.entry.word, 0.9));
el.slow.addEventListener("click", () => say(game.round.entry.word.split("").join(" ... ") , 0.6));
el.hint.addEventListener("click", useHint);
el.back.addEventListener("click", removeLast);
el.check.addEventListener("click", check);

const mute = $("mute");
function syncMute() {
  mute.textContent = game.muted ? "Sound Off" : "Sound On";
  mute.setAttribute("aria-pressed", String(game.muted));
}
mute.addEventListener("click", () => {
  game.muted = !game.muted;
  store.set(KEYS.mute, game.muted);
  if (game.muted && "speechSynthesis" in window) speechSynthesis.cancel();
  syncMute();
});

document.addEventListener("keydown", (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey || !game.round || el.end.classList.contains("show")) return;
  if (e.target instanceof HTMLButtonElement && (e.key === "Enter" || e.key === " ")) return;
  if (game.locked) return;
  if (/^[a-z]$/i.test(e.key)) typeLetter(e.key.toLowerCase());
  else if (e.key === "Backspace") {
    removeLast();
    e.preventDefault();
  } else if (e.key === "Enter") check();
});

setLevel(game.level);
syncMute();
newGame();

// exposed for testing
window.__spell = { game, check, addTile, useHint };
