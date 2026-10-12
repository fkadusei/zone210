// Grammar & Words: the questions, made from the word banks in data.js with the seeded random helper (so a seed always
// gives the same round: used by the online race and by tools/check-learn.mjs). No page code here.
import { mc } from "../../assets/learn-core.js";
import { TAGGED_1, TAGGED_2, TAG_INFO, FORMS, ENDS, LISTS, SHORT, OWNERS, OWNERS_MANY, SPEECH, ITS, PAIRS, MIXUPS, MIX_WHY, PREFIX, MEANINGS, ORDER, JOIN, JOIN_WHY, VERBS, READING } from "./data.js";

const blank = (sentence) => sentence.replace("___", '<span class="blank" role="img" aria-label="blank"></span>');
const cap = (w) => w[0].toUpperCase() + w.slice(1);
const an = (word) => (/^[aeiou]/.test(word) ? "an" : "a");
/** "The small/A dog/N ran." as words ["The", "small", "dog", "ran."] and their tags ["", "A", "N", ""]. */
export function untag(sentence) {
  const words = [], tags = [];
  sentence.split(" ").forEach((tok) => { const m = tok.match(/^([^/]+?)(?:\/([A-Z]+))?([.,!?]*)$/); words.push(m[1] + m[3]); tags.push(m[2] || ""); });
  return { words, tags };
}

// ---------- 1. grammar ----------
function grammar(level, r) {
  if (level < 2) {
    const { words, tags } = untag(r.pick(level === 0 ? TAGGED_1 : TAGGED_2));
    const tag = r.pick([...new Set(tags.filter(Boolean))]), a = tags.map((t, i) => (t === tag ? i : -1)).filter((i) => i >= 0), [name, info] = TAG_INFO[tag];
    const found = a.map((i) => `“${words[i].replace(/[.,!?]/g, "")}”`).join(" and ");
    return { type: "tap", q: a.length > 1 ? `Tap ${an(name)} ${name} in this sentence.` : `Tap the ${name} in this sentence.`, words, a, why: `${info} Here: ${found}.` };
  }
  const [sentence, right, wrongs, why] = r.pick(FORMS);
  return { type: "choice", q: `${blank(sentence)}<small>Choose the word that fits.</small>`, ...mc(r, right, wrongs), why };
}

// ---------- 2. punctuation ----------
function punctuation(level, r) {
  if (level === 0) {
    const [core, mark, proper] = r.pick(ENDS), low = core[0].toLowerCase() + core.slice(1);
    const wrongs = [`${low}${mark}`, `${core}${mark === "?" ? "." : "?"}`, proper ? `${core.replace(new RegExp(`\\b${proper}\\b`), proper.toLowerCase())}${mark}` : core, `${low}`];
    const why = `${mark === "." ? "A sentence starts with a capital letter and ends with a full stop (also called a period)." : mark === "?" ? "It asks something, so it ends with a question mark. It still starts with a capital letter." : "It shows strong feeling, so it ends with an exclamation mark. It still starts with a capital letter."}${proper ? (proper === "I" ? " The word ‘I’ is always a capital." : ` Names of people, places, days and months start with a capital: ${proper}.`) : ""}`;
    return { type: "choice", wide: true, q: "Which sentence is written correctly?", ...mc(r, `${core}${mark}`, wrongs), why };
  }
  if (level === 1) {
    const kind = r.pick(["list", "short", "short", "owner"]);
    if (kind === "list") { const [lead, [a, b, c]] = r.pick(LISTS); return { type: "choice", wide: true, q: "Which sentence uses commas correctly?", ...mc(r, `${lead} ${a}, ${b} and ${c}.`, [`${lead} ${a} ${b} and ${c}.`, `${lead}, ${a}, ${b} and ${c}.`, `${lead} ${a}, ${b} and, ${c}.`]), why: "Put a comma between the things in a list. The last two are joined by ‘and’. There is no comma before the list starts." }; }
    if (kind === "short") {
      const [full, right] = r.pick(SHORT), bare = right.replace("'", ""), i = right.indexOf("'");
      const swap = (j) => { const c = right.split(""); [c[i], c[j]] = [c[j], c[i]]; return c.join(""); };
      return { type: "choice", q: `Which is the correct short form of “${full}”?`, ...mc(r, right, [bare, `${bare}'`, ...(i > 1 ? [swap(i - 1)] : []), ...(i < right.length - 2 ? [swap(i + 1)] : [])]), why: `The apostrophe goes exactly where letters have been left out: ${full} → ${right}.` };
    }
    const [owner, thing] = r.pick(OWNERS);
    return { type: "choice", q: `The ${thing} ${thing.endsWith("s") ? "belong" : "belongs"} to the ${owner}.<small>Which is written correctly?</small>`, ...mc(r, `the ${owner}'s ${thing}`, [`the ${owner}s ${thing}`, `the ${owner}s' ${thing}`, `the ${owner} ${thing}'s`]), why: `To show that something belongs to one ${owner}, add an apostrophe and then s: ${owner}'s.` };
  }
  const kind = r.pick(["speech", "speech", "its", "many"]);
  if (kind === "speech") {
    const [said, mark, verb, who] = r.pick(SPEECH), inner = mark === "." ? "," : mark;
    return { type: "choice", wide: true, q: "Which sentence shows the spoken words correctly?", ...mc(r, `“${said}${inner}” ${verb} ${who}.`, [`${said}${inner} ${verb} ${who}.`, `“${said}”${inner} ${verb} ${who}.`, `“${said}${inner} ${verb} ${who}.”`]), why: `Speech marks go round the exact words that are spoken, and the ${mark === "." ? "comma" : mark === "?" ? "question mark" : "exclamation mark"} goes inside them.` };
  }
  if (kind === "its") {
    const [sentence, right] = r.pick(ITS), up = right[0] === "I", opts = up ? ["Its", "It's", "Its'"] : ["its", "it's", "its'"];
    return { type: "choice", q: `${blank(sentence)}<small>Choose the word that fits.</small>`, ...mc(r, right, opts.filter((o) => o !== right)), why: "‘It's’ is short for ‘it is’ or ‘it has’. ‘Its’, with no apostrophe, means belonging to it. Try saying ‘it is’ in the gap: if that makes sense, use ‘it's’." };
  }
  const [owners, thing] = r.pick(OWNERS_MANY), one = owners.slice(0, -1);
  return { type: "choice", q: `The ${thing} ${thing.endsWith("s") ? "belong" : "belongs"} to the ${owners} (more than one ${one}).<small>Which is written correctly?</small>`, ...mc(r, `the ${owners}' ${thing}`, [`the ${one}'s ${thing}`, `the ${owners} ${thing}`, `the ${owners}'s ${thing}`]), why: `When the owners are plural and already end in s, just add an apostrophe after the s: ${owners}'.` };
}

// ---------- 3. vocabulary ----------
function vocabulary(level, r) {
  if (level === 0) {
    const [word, same, opposite, group] = r.pick(PAIRS), others = r.shuffle(PAIRS.filter((p) => p[3] !== group)), isSame = r() < 0.5;
    const wrongs = [isSame ? opposite : same, others[0][1], others[1][2], others[2][r.int(1, 2)]];
    return { type: "choice", q: isSame ? `Which word means the same as “${word}”?` : `Which word is the opposite of “${word}”?`, ...mc(r, isSame ? same : opposite, wrongs), why: `“${cap(word)}” and “${same}” mean nearly the same. The opposite of “${word}” is “${opposite}”.` };
  }
  if (level === 1) {
    if (r() < 0.25) {
      const [word, pre] = r.pick(PREFIX), made = `${pre}${word}`;
      return { type: "choice", q: pre === "mis" ? `Which beginning makes “${word}” mean doing it wrongly or badly?` : `Which beginning turns “${word}” into its opposite?`, ...mc(r, `${pre}-`, ["un-", "dis-", "im-", "in-", "mis-"].filter((p) => p !== `${pre}-`)), why: `${pre}- + ${word} = ${made}. ${pre === "mis" ? "The beginning ‘mis-’ means wrongly or badly." : `The beginning ‘${pre}-’ here means ‘not’ or ‘the opposite of’.`}` };
    }
    const [sentence, right, set] = r.pick(MIXUPS), up = right[0] !== right[0].toLowerCase(), opts = set.map((w) => (up ? cap(w) : w));
    return { type: "choice", q: `${blank(sentence)}<small>Choose the word that fits.</small>`, ...mc(r, right, opts.filter((o) => o !== right)), why: MIX_WHY.get(set) };
  }
  const [word, meaning] = r.pick(MEANINGS), others = r.shuffle(MEANINGS.filter((m) => m[0] !== word));
  if (r() < 0.5) return { type: "choice", wide: true, q: `What does “${word}” mean?`, ...mc(r, cap(meaning), others.slice(0, 3).map((m) => cap(m[1]))), why: `“${cap(word)}” means ${meaning}.` };
  return { type: "choice", q: `Which word means “${meaning}”?`, ...mc(r, word, others.slice(0, 3).map((m) => m[0])), why: `“${cap(word)}” means ${meaning}.` };
}

// ---------- 4. building sentences ----------
function sentences(level, r) {
  if (level === 0) {
    const s = r.pick(ORDER), end = s.slice(-1);
    return { type: "order", q: "Tap the words in order to make a sentence.", words: s.split(" "), a: s, why: `It starts with the word that has a capital letter, and ends with the word that has the ${end === "?" ? "question mark" : "full stop"}.` };
  }
  if (level === 1) {
    const [sentence, right, wrongs] = r.pick(JOIN);
    return { type: "choice", q: `${blank(sentence)}<small>Choose the best joining word.</small>`, ...mc(r, right, wrongs), why: JOIN_WHY[right.toLowerCase()] };
  }
  const [who, base, withS, past, badPast, rest] = r.pick(VERBS), tense = r.pick(["past", "past", "future", "present"]);
  const all = { present: `${who} ${withS} ${rest}.`, past: `${who} ${past} ${rest}.`, future: `${who} will ${base} ${rest}.` };
  const bad = tense === "past" ? `${who} ${badPast} ${rest}.` : tense === "future" ? `${who} will ${past} ${rest}.` : `${who} ${base} ${rest}.`;
  const why = tense === "past" ? `The past of “${base}” is “${past}”, not “${badPast}”.` : tense === "future" ? `The future uses “will” and the plain verb: will ${base}.` : `For something that happens now or regularly, with one person or thing, the verb takes -s: ${withS}.`;
  return { type: "choice", wide: true, q: `Which sentence is correctly written in the ${tense} tense?`, ...mc(r, all[tense], [...Object.entries(all).filter(([k]) => k !== tense).map(([, v]) => v), bad]), why };
}

// ---------- 5. reading ----------
function reading(level, r) {
  const [title, text, questions] = r.pick(READING[level]), [question, right, ...wrongs] = r.pick(questions);
  return { type: "choice", wide: true, visFirst: true, whyWrongOnly: true, q: question, vis: `<div class="lk-read"><b class="t">${title}</b>${text}</div>`, ...mc(r, right, wrongs), why: "Look back at the passage: the answer is there, or can be worked out from what it says." };
}

export const TOPICS = [
  { id: "grammar", name: "Grammar", emoji: "🧱", tip: "Every word in a sentence has a job to do.", levels: ["Nouns, verbs, adjectives", "More word jobs", "The right form"], make: grammar },
  { id: "punctuation", name: "Punctuation", emoji: "❗", tip: "Punctuation marks show where sentences stop, pause and who is speaking.", levels: ["Capitals and end marks", "Commas and apostrophes", "Speech and belonging"], make: punctuation },
  { id: "vocabulary", name: "Vocabulary", emoji: "📖", tip: "The more words you know, the more exactly you can say what you mean.", levels: ["Same and opposite", "Easy to mix up", "What does it mean?"], make: vocabulary },
  { id: "sentences", name: "Sentences", emoji: "🧩", tip: "A sentence needs its words in the right order to make sense.", levels: ["Build a sentence", "Joining words", "Past, present, future"], make: sentences },
  { id: "reading", name: "Reading", emoji: "📚", tip: "Read the passage first, then the question. Look back as often as you like.", levels: ["Short passages", "Longer passages", "Read between the lines"], make: reading },
];
