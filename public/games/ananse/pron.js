/**
 * How to say the Akan (Twi) names. `ipa` is for the recorded narration (the Kokoro voices); `guide` is what readers see (capitals mark the stressed syllable);
 * `say` is a respelling the browser's English voice reads closer to the real sound. These are careful
 * approximations: a Twi speaker's recording would always be better.
 */
export const PRON = {
  Anansesem: { ipa: "ɑnˈɑnsɛsˌɛm", guide: "ah-nan-seh-SEM", say: "Ahnansehsem", note: "“Spider stories”, the name for the Ananse tales." },
  Ananse: { ipa: "ɑnˈɑnsɛ", guide: "ah-NAN-seh", say: "Ahnanseh", note: "The spider, clever hero of the stories. “Ananse” is the Twi word for spider." },
  Kwaku: { ipa: "kwˈɑku", guide: "KWAH-koo", say: "Kwahkoo", note: "A name for a boy born on a Wednesday (an Akan day name)." },
  Nyame: { ipa: "ˈnjɑmɛ", guide: "NYAH-meh", say: "Nyahmeh", note: "The Sky God in Akan tradition." },
  Onini: { ipa: "oʊnˈini", guide: "oh-NEE-nee", say: "Ohneenee", note: "The python, a very long snake." },
  Osebo: { ipa: "oʊsˈɛboʊ", guide: "oh-SEH-boh", say: "Ohsehboh", note: "The leopard." },
  Mmoboro: { ipa: "mmoʊbˈoʊɹoʊ", guide: "m-moh-BOH-roh", say: "Mohbohroh", note: "The hornets: big, angry wasps that sting." },
  Mmoatia: { ipa: "mmwˈɑtiɑ", guide: "m-MWAH-tee-ah", say: "Mwahteeah", note: "A fairy of the forest who loves yams." },
  Ntikuma: { ipa: "ntikˈumɑ", guide: "n-tee-KOO-mah", say: "Nteekoomah", note: "Ananse's clever young son." },
  Akan: { ipa: "ˈɑkɑn", guide: "AH-kahn", say: "Ahkahn", note: "A large group of peoples in Ghana and Ivory Coast, who speak Twi and related languages." },
};
const names = Object.keys(PRON).sort((a, b) => b.length - a.length);
const re = new RegExp(`\\b(${names.join("|")})`, "g");

/** The text with the Akan names respelled so a speech voice says them better. */
export const forSpeech = (text) => text.replace(re, (m) => PRON[m].say);
export const guideFor = (word) => (PRON[word] ? PRON[word].guide : null);
