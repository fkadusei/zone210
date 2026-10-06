// Prints every line the ABC & 123 voice says as JSON, keyed by clip name, for ../ananse-audio/generate.py.
//   node dump-texts.mjs > texts.json
//   python ../ananse-audio/generate.py texts.json ../../public/games/abc-123/audio --voices af_heart --trim
// (generate.py needs Python 3.12 with kokoro and soundfile; see its header.)
import { CLIPS } from "../../public/games/abc-123/data.js";
// letter names the voice dictionary lacks, as phonemes (Kokoro alphabet: A is the "ay" sound)
const PRON = { Ay: "ˈA", Ee: "ˈi", Jee: "ʤˈi", Oops: "ˈups" };
console.log(JSON.stringify({ pron: PRON, clips: CLIPS }));
