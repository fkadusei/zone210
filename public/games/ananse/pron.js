/**
 * How to say the Akan (Twi) names. `guide` is what readers see (capitals mark the stressed syllable);
 * `say` is a respelling the browser's English voice reads closer to the real sound. These are careful
 * approximations: a Twi speaker's recording would always be better.
 */
export const PRON = {
  Anansesem: { guide: "ah-nan-seh-SEM", say: "Ahnansehsem", note: "“Spider stories”, the name for the Ananse tales." },
  Ananse: { guide: "ah-NAN-seh", say: "Ahnanseh", note: "The spider, clever hero of the stories. “Ananse” is the Twi word for spider." },
  Kwaku: { guide: "KWAH-koo", say: "Kwahkoo", note: "A name for a boy born on a Wednesday (an Akan day name)." },
  Nyame: { guide: "NYAH-meh", say: "Nyahmeh", note: "The Sky God in Akan tradition." },
  Onini: { guide: "oh-NEE-nee", say: "Ohneenee", note: "The python, a very long snake." },
  Osebo: { guide: "oh-SEH-boh", say: "Ohsehboh", note: "The leopard." },
  Mmoboro: { guide: "m-moh-BOH-roh", say: "Mohbohroh", note: "The hornets: big, angry wasps that sting." },
  Mmoatia: { guide: "m-MWAH-tee-ah", say: "Mwahteeah", note: "A fairy of the forest who loves yams." },
  Ntikuma: { guide: "n-tee-KOO-mah", say: "Nteekoomah", note: "Ananse's clever young son." },
  Akan: { guide: "AH-kahn", say: "Ahkahn", note: "A large group of peoples in Ghana and Ivory Coast, who speak Twi and related languages." },
};
const names = Object.keys(PRON).sort((a, b) => b.length - a.length);
const re = new RegExp(`\\b(${names.join("|")})`, "g");

/** The text with the Akan names respelled so a speech voice says them better. */
export const forSpeech = (text) => text.replace(re, (m) => PRON[m].say);
export const guideFor = (word) => (PRON[word] ? PRON[word].guide : null);
