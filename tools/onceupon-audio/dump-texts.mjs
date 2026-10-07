// Prints every line read aloud in Once Upon a Time as JSON, keyed by the audio clip name, for
// ../ananse-audio/generate.py:
//   node dump-texts.mjs > texts.json
//   python ../ananse-audio/generate.py texts.json ../../public/games/once-upon/audio          (all three narrators)
//   python ../ananse-audio/generate.py texts.json OUTDIR --oov                                 (words the voice doesn't know)
import { STORIES } from "../../public/games/once-upon/stories.js";
// names and words the voice dictionary lacks, as phonemes (Kokoro's alphabet)
const PRON = { Rapunzel: "ɹəpˈʌnzəl", Momotaro: "mˌoʊmoʊtˈɑɹoʊ", Morgiana: "mˌɔɹʤiˈɑnə", Cassim: "kˈæsɪm", Liang: "liˈɑŋ", hugged: "hˈʌɡd", curtsied: "kˈɜɹtsid" };
const out = { pron: PRON, clips: {} };
for (const s of STORIES) {
  for (const [id, sc] of Object.entries(s.scenes)) {
    out.clips[`${s.id}/${id}`] = sc.text.join(" ");
    (sc.choices || []).forEach((c, i) => { if (c.wrong) out.clips[`${s.id}/${id}-h${i}`] = `Not quite. ${c.wrong}`; });
    if (sc.end) out.clips[`${s.id}/end-${id}`] = `The end: ${sc.end.title}. ${sc.end.moral} Think about it: ${sc.end.think}`;
  }
}
["one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"].forEach((w, i) => { out.clips[`n/${i + 1}`] = `${w[0].toUpperCase()}${w.slice(1)}.`; });
out.clips.sample = "Once upon a time, in a land far away...";
console.log(JSON.stringify(out));
