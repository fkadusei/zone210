// Prints every line of narration in the Ananse stories as JSON, keyed by the audio clip name.
// usage: node dump-texts.mjs > texts.json
import { STORIES } from "../../public/games/ananse/stories.js";
import { PRON } from "../../public/games/ananse/pron.js";
const out = { pron: Object.fromEntries(Object.entries(PRON).map(([k, v]) => [k, v.ipa])), clips: {} };
for (const s of STORIES) {
  for (const [id, sc] of Object.entries(s.scenes)) {
    out.clips[`${s.id}/${id}`] = sc.text.join(" ");
    (sc.choices || []).forEach((c, i) => { if (c.wrong) out.clips[`${s.id}/${id}-h${i}`] = `Not quite. ${c.wrong}`; });
    if (sc.end) out.clips[`${s.id}/end-${id}`] = `The end: ${sc.end.title}. ${sc.end.moral} Think about it: ${sc.end.think}`;
  }
}
out.clips["names/all"] = "Ananse. Kwaku. Nyame. Onini. Osebo. Mmoboro. Mmoatia. Ntikuma. Anansesem.";
out.clips["names/sample"] = "Ananse the spider met Nyame the Sky God.";
console.log(JSON.stringify(out));
