// Prints every line Calm Corner says as JSON for ../ananse-audio/generate.py:
//   node dump-texts.mjs > texts.json
//   python ../ananse-audio/generate.py texts.json ../../public/games/calm-corner/audio --voices af_nicole,af_heart,bf_emma --speed 0.88
// (samples.py made the comparison clips the voices were chosen from.)
import { allLines } from "../../public/games/calm-corner/lines.js";
console.log(JSON.stringify({ pron: {}, clips: allLines() }));
