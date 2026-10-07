/**
 * Hello World: ten languages, each with the same everyday phrases and the numbers one to five.
 * [meaning, written, romanised (for other scripts), say-it guide]. lang is the code used to find a voice.
 */
export const MEANINGS = ["Hello", "Goodbye", "Please", "Thank you", "Yes", "No", "Good night", "How are you?", "My name is…", "Friend", "One", "Two", "Three", "Four", "Five"];

export const LANGS = [
  { id: "es", name: "Spanish", native: "Español", lang: "es-ES", where: "Spain, Mexico, Argentina, Colombia and many more countries", color: "#e5484d",
    words: [["Hola", "", "OH-lah"], ["Adiós", "", "ah-DYOHS"], ["Por favor", "", "por fah-VOR"], ["Gracias", "", "GRAH-syahs"], ["Sí", "", "see"], ["No", "", "noh"], ["Buenas noches", "", "BWEH-nahs NOH-chehs"], ["¿Cómo estás?", "", "KOH-moh ehs-TAHS"], ["Me llamo…", "", "meh YAH-moh"], ["Amigo / Amiga", "", "ah-MEE-goh / ah-MEE-gah"], ["Uno", "", "OO-noh"], ["Dos", "", "dohs"], ["Tres", "", "trehs"], ["Cuatro", "", "KWAH-troh"], ["Cinco", "", "SEEN-koh"]] },
  { id: "fr", name: "French", native: "Français", lang: "fr-FR", where: "France, Canada, Senegal, Côte d'Ivoire, Belgium and many more countries", color: "#3b82f6",
    words: [["Bonjour", "", "bohn-ZHOOR"], ["Au revoir", "", "oh ruh-VWAHR"], ["S'il vous plaît", "", "seel voo PLEH"], ["Merci", "", "mehr-SEE"], ["Oui", "", "wee"], ["Non", "", "nohn"], ["Bonne nuit", "", "bun NWEE"], ["Comment ça va ?", "", "koh-mahn sah VAH"], ["Je m'appelle…", "", "zhuh mah-PELL"], ["Ami / Amie", "", "ah-MEE"], ["Un", "", "uhn"], ["Deux", "", "duh"], ["Trois", "", "twah"], ["Quatre", "", "KAH-truh"], ["Cinq", "", "sank"]] },
  { id: "de", name: "German", native: "Deutsch", lang: "de-DE", where: "Germany, Austria and Switzerland", color: "#f59e0b",
    words: [["Hallo", "", "HAH-loh"], ["Tschüss", "", "choos"], ["Bitte", "", "BIT-tuh"], ["Danke", "", "DAHN-kuh"], ["Ja", "", "yah"], ["Nein", "", "nine"], ["Gute Nacht", "", "GOO-tuh nahkht"], ["Wie geht's?", "", "vee GAYTS"], ["Ich heiße…", "", "ikh HY-suh"], ["Freund / Freundin", "", "froynd / FROYN-din"], ["Eins", "", "ines"], ["Zwei", "", "tsvy"], ["Drei", "", "dry"], ["Vier", "", "feer"], ["Fünf", "", "fuenf"]] },
  { id: "pt", name: "Portuguese", native: "Português", lang: "pt-BR", where: "Brazil, Portugal, Angola, Mozambique and more", color: "#16a34a",
    words: [["Olá", "", "oh-LAH"], ["Tchau", "", "chow"], ["Por favor", "", "por fah-VOR"], ["Obrigado / Obrigada", "", "oh-bree-GAH-doo / oh-bree-GAH-dah"], ["Sim", "", "seeng"], ["Não", "", "nowng"], ["Boa noite", "", "BOH-ah NOY-chee"], ["Como vai?", "", "KOH-moo vai"], ["Meu nome é…", "", "MEH-oo NOH-mee eh"], ["Amigo / Amiga", "", "ah-MEE-goo / ah-MEE-gah"], ["Um", "", "oong"], ["Dois", "", "doysh"], ["Três", "", "trehs"], ["Quatro", "", "KWAH-troo"], ["Cinco", "", "SEEN-koo"]] },
  { id: "ar", name: "Arabic", native: "العربية", lang: "ar", rtl: true, where: "North Africa and the Middle East, from Morocco to Iraq", color: "#0d9488",
    words: [["مرحبا", "marḥaban", "MAR-ha-ban"], ["مع السلامة", "maʿa as-salāma", "MAA-a ss-sa-LAA-ma"], ["من فضلك", "min faḍlak", "min FAD-lak"], ["شكرا", "shukran", "SHOOK-ran"], ["نعم", "naʿam", "NA-am"], ["لا", "lā", "laa"], ["تصبح على خير", "tuṣbiḥ ʿalā khayr", "toos-BEEH aa-la KHAYR"], ["كيف حالك؟", "kayfa ḥāluk", "KAY-fa HAA-luk"], ["اسمي…", "ismī", "IS-mee"], ["صديق", "ṣadīq", "sa-DEEK"], ["واحد", "wāḥid", "WAA-hid"], ["اثنان", "ithnān", "ith-NAAN"], ["ثلاثة", "thalātha", "tha-LAA-tha"], ["أربعة", "arbaʿa", "AR-ba-a"], ["خمسة", "khamsa", "KHAM-sa"]] },
  { id: "sw", name: "Swahili", native: "Kiswahili", lang: "sw", where: "East Africa: Kenya, Tanzania, Uganda and more", color: "#ea580c",
    words: [["Jambo", "", "JAHM-boh"], ["Kwaheri", "", "kwah-HEH-ree"], ["Tafadhali", "", "tah-fah-THAH-lee"], ["Asante", "", "ah-SAHN-teh"], ["Ndiyo", "", "n-DEE-yoh"], ["Hapana", "", "hah-PAH-nah"], ["Usiku mwema", "", "oo-SEE-koo MWEH-mah"], ["Habari yako?", "", "hah-BAH-ree YAH-koh"], ["Jina langu ni…", "", "JEE-nah LAHN-goo nee"], ["Rafiki", "", "rah-FEE-kee"], ["Moja", "", "MOH-jah"], ["Mbili", "", "m-BEE-lee"], ["Tatu", "", "TAH-too"], ["Nne", "", "n-neh"], ["Tano", "", "TAH-noh"]] },
  { id: "hi", name: "Hindi", native: "हिन्दी", lang: "hi-IN", where: "India", color: "#db2777",
    words: [["नमस्ते", "namaste", "nuh-muh-STAY"], ["अलविदा", "alvidā", "ul-vee-DAA"], ["कृपया", "kripayā", "KRIP-yaa"], ["धन्यवाद", "dhanyavād", "DHUN-yuh-vaad"], ["हाँ", "hā̃", "haan"], ["नहीं", "nahī̃", "nuh-HEEN"], ["शुभ रात्रि", "shubh rātri", "shubh RAA-tree"], ["आप कैसे हैं?", "āp kaise haĩ", "aap KAY-say hain"], ["मेरा नाम … है", "merā nām … hai", "MAY-raa naam … hai"], ["दोस्त", "dost", "dohst"], ["एक", "ek", "ayk"], ["दो", "do", "doh"], ["तीन", "tīn", "teen"], ["चार", "chār", "chaar"], ["पाँच", "pā̃ch", "paanch"]] },
  { id: "zh", name: "Mandarin Chinese", native: "中文", lang: "zh-CN", where: "China, Singapore, Taiwan and Chinese communities all over the world", color: "#dc2626",
    words: [["你好", "nǐ hǎo", "nee how"], ["再见", "zàijiàn", "dzai-jyen"], ["请", "qǐng", "ching"], ["谢谢", "xièxie", "shyeh-shyeh"], ["是", "shì", "shr"], ["不是", "bú shì", "boo-shr"], ["晚安", "wǎn'ān", "wahn-ahn"], ["你好吗？", "nǐ hǎo ma", "nee how mah"], ["我叫…", "wǒ jiào", "woh jyow"], ["朋友", "péngyou", "pung-yo"], ["一", "yī", "ee"], ["二", "èr", "ar"], ["三", "sān", "sahn"], ["四", "sì", "sz"], ["五", "wǔ", "woo"]] },
  { id: "ja", name: "Japanese", native: "日本語", lang: "ja-JP", where: "Japan", color: "#be123c",
    words: [["こんにちは", "konnichiwa", "kon-NEE-chee-wah"], ["さようなら", "sayōnara", "sah-YOH-nah-rah"], ["お願いします", "onegaishimasu", "oh-neh-GAI-shee-mas"], ["ありがとう", "arigatō", "ah-ree-GAH-toh"], ["はい", "hai", "hai"], ["いいえ", "iie", "ee-eh"], ["おやすみなさい", "oyasuminasai", "oh-yah-soo-mee-nah-sai"], ["お元気ですか？", "o-genki desu ka", "oh-GEN-kee dess-kah"], ["私の名前は…です", "watashi no namae wa … desu", "wah-TAH-shee noh nah-MAH-eh wah … dess"], ["友達", "tomodachi", "toh-moh-DAH-chee"], ["一", "ichi", "EE-chee"], ["二", "ni", "nee"], ["三", "san", "sahn"], ["四", "yon", "yohn"], ["五", "go", "goh"]] },
  { id: "ko", name: "Korean", native: "한국어", lang: "ko-KR", where: "Korea", color: "#7c3aed",
    words: [["안녕하세요", "annyeonghaseyo", "ahn-nyong-hah-SAY-yo"], ["안녕히 가세요", "annyeonghi gaseyo", "ahn-nyong-hee GAH-say-yo"], ["주세요", "juseyo", "JOO-say-yo"], ["감사합니다", "gamsahamnida", "gahm-sah-hahm-nee-dah"], ["네", "ne", "neh"], ["아니요", "aniyo", "ah-nee-yo"], ["안녕히 주무세요", "annyeonghi jumuseyo", "ahn-nyong-hee joo-moo-SAY-yo"], ["잘 지내요?", "jal jinaeyo", "jahl jee-NEH-yo"], ["제 이름은 …입니다", "je ireumeun … imnida", "jeh ee-REU-meun … im-nee-dah"], ["친구", "chingu", "CHIN-goo"], ["하나", "hana", "HAH-nah"], ["둘", "dul", "dool"], ["셋", "set", "set"], ["넷", "net", "net"], ["다섯", "daseot", "dah-SUT"]] },
];
// a few phrases need a word about how they are used
export const NOTES = {
  "es:9": "Amigo for a boy or man, amiga for a girl or woman.",
  "pt:3": "Boys and men say obrigado; girls and women say obrigada.",
  "pt:9": "Amigo for a boy or man, amiga for a girl or woman.",
  "fr:0": "Bonjour means hello and good morning.",
  "fr:9": "Ami for a boy or man, amie for a girl or woman. They sound the same!",
  "de:1": "Tschüss is the friendly goodbye. Auf Wiedersehen is more polite.",
  "de:9": "Freund for a boy or man, Freundin for a girl or woman.",
  "ar:2": "Min faḍlak is said to a man or boy; to a woman or girl it is min faḍlik.",
  "ar:7": "Kayfa ḥāluk to a man or boy; kayfa ḥāluki to a woman or girl.",
  "sw:0": "Jambo is a friendly hello. Habari? (What news?) is also very common.",
  "hi:0": "Namaste is said with your palms pressed together.",
  "zh:4": "是 (shì) means “it is”. Mandarin speakers often say yes by repeating the question's verb instead.",
  "ja:3": "To be extra polite, say ありがとうございます (arigatō gozaimasu).",
  "ja:13": "Four can also be shi, but yon is used more often.",
  "ko:1": "Said to someone who is leaving. To someone staying, say 안녕히 계세요 (annyeonghi gyeseyo).",
  "ko:2": "Juseyo means “please give me”, used when asking for something.",
  "ko:10": "These are native Korean numbers, used for counting things.",
};
