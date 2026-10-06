// Prints every line the ABC & 123 voice says as JSON, keyed by clip name.
//   node dump-texts.mjs --plain > texts.json      (letters written as letters: "G is for giraffe." — for Chatterbox)
//   python chatterbox_generate.py texts.json ../../public/games/abc-123/audio   (Chatterbox guesses letter names; prefer azure_generate.mjs)
// After re-recording, raise CLIPS_V in public/games/abc-123/game.js so phones fetch the new clips.
// Without --plain, letter names are spelled for the voice ("Jee is for giraffe."), as the device-voice fallback uses.
import { CLIPS, LETTERS } from "../../public/games/abc-123/data.js";
const clips = { ...CLIPS };
const spelled = {}; // the spelled form, as a second option for clips that come out wrong
if (process.argv.includes("--plain")) {
  for (const x of LETTERS) {
    const k = x.L.toLowerCase();
    clips[`l/${k}`] = `${x.L}.`;
    clips[`w/${k}`] = `${x.L} is for ${x.word}.`;
    spelled[`l/${k}`] = CLIPS[`l/${k}`];
    spelled[`w/${k}`] = CLIPS[`w/${k}`];
  }
}
console.log(JSON.stringify({ pron: {}, clips, spelled }));
