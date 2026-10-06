/**
 * Generated questions: capitals, flags and continents for ~100 countries, plus fresh arithmetic every round.
 * country line: ISO code|name|capital|continent|level (k = well known, a = family, d = harder)
 */
const COUNTRIES = `
GH|Ghana|Accra|Africa|k
NG|Nigeria|Abuja|Africa|a
KE|Kenya|Nairobi|Africa|a
EG|Egypt|Cairo|Africa|k
ZA|South Africa|Pretoria|Africa|a
ET|Ethiopia|Addis Ababa|Africa|a
TZ|Tanzania|Dodoma|Africa|d
UG|Uganda|Kampala|Africa|a
SN|Senegal|Dakar|Africa|a
CI|Côte d'Ivoire|Yamoussoukro|Africa|d
CM|Cameroon|Yaoundé|Africa|d
MA|Morocco|Rabat|Africa|a
DZ|Algeria|Algiers|Africa|a
TN|Tunisia|Tunis|Africa|a
LY|Libya|Tripoli|Africa|d
SD|Sudan|Khartoum|Africa|d
ML|Mali|Bamako|Africa|d
BF|Burkina Faso|Ouagadougou|Africa|d
NE|Niger|Niamey|Africa|d
TG|Togo|Lomé|Africa|a
BJ|Benin|Porto-Novo|Africa|d
LR|Liberia|Monrovia|Africa|d
SL|Sierra Leone|Freetown|Africa|d
GM|The Gambia|Banjul|Africa|d
AO|Angola|Luanda|Africa|d
ZM|Zambia|Lusaka|Africa|d
ZW|Zimbabwe|Harare|Africa|a
BW|Botswana|Gaborone|Africa|d
NA|Namibia|Windhoek|Africa|d
MZ|Mozambique|Maputo|Africa|d
MG|Madagascar|Antananarivo|Africa|d
RW|Rwanda|Kigali|Africa|d
CD|DR Congo|Kinshasa|Africa|d
US|United States|Washington, D.C.|North America|k
CA|Canada|Ottawa|North America|k
MX|Mexico|Mexico City|North America|k
CU|Cuba|Havana|North America|a
JM|Jamaica|Kingston|North America|a
HT|Haiti|Port-au-Prince|North America|d
BR|Brazil|Brasília|South America|k
AR|Argentina|Buenos Aires|South America|k
CL|Chile|Santiago|South America|a
CO|Colombia|Bogotá|South America|a
PE|Peru|Lima|South America|a
VE|Venezuela|Caracas|South America|d
UY|Uruguay|Montevideo|South America|d
EC|Ecuador|Quito|South America|d
GB|United Kingdom|London|Europe|k
FR|France|Paris|Europe|k
DE|Germany|Berlin|Europe|k
IT|Italy|Rome|Europe|k
ES|Spain|Madrid|Europe|k
PT|Portugal|Lisbon|Europe|a
NL|Netherlands|Amsterdam|Europe|a
BE|Belgium|Brussels|Europe|a
CH|Switzerland|Bern|Europe|d
AT|Austria|Vienna|Europe|a
SE|Sweden|Stockholm|Europe|a
NO|Norway|Oslo|Europe|a
DK|Denmark|Copenhagen|Europe|a
FI|Finland|Helsinki|Europe|a
IE|Ireland|Dublin|Europe|a
GR|Greece|Athens|Europe|k
PL|Poland|Warsaw|Europe|a
UA|Ukraine|Kyiv|Europe|a
RU|Russia|Moscow|Europe|k
TR|Turkey|Ankara|Asia|d
CZ|Czechia|Prague|Europe|d
HU|Hungary|Budapest|Europe|d
RO|Romania|Bucharest|Europe|d
IS|Iceland|Reykjavík|Europe|d
CN|China|Beijing|Asia|k
JP|Japan|Tokyo|Asia|k
IN|India|New Delhi|Asia|k
KR|South Korea|Seoul|Asia|a
ID|Indonesia|Jakarta|Asia|a
PK|Pakistan|Islamabad|Asia|d
BD|Bangladesh|Dhaka|Asia|d
TH|Thailand|Bangkok|Asia|a
VN|Vietnam|Hanoi|Asia|a
PH|Philippines|Manila|Asia|a
MY|Malaysia|Kuala Lumpur|Asia|d
SG|Singapore|Singapore|Asia|d
SA|Saudi Arabia|Riyadh|Asia|a
AE|United Arab Emirates|Abu Dhabi|Asia|d
IR|Iran|Tehran|Asia|d
IQ|Iraq|Baghdad|Asia|d
AF|Afghanistan|Kabul|Asia|d
NP|Nepal|Kathmandu|Asia|d
LK|Sri Lanka|Colombo|Asia|d
KZ|Kazakhstan|Astana|Asia|d
AU|Australia|Canberra|Oceania|k
NZ|New Zealand|Wellington|Oceania|a
FJ|Fiji|Suva|Oceania|d
`;

const list = COUNTRIES.trim().split("\n").map((line) => {
  const [code, name, capital, continent, level] = line.split("|");
  return { code, name, capital, continent, level: { k: "kids", a: "all", d: "adults" }[level] };
});
// Windows browsers draw flag emoji as two plain letters, so flag questions are only offered where flags render
export function flagsSupported() {
  try {
    const ctx = document.createElement("canvas").getContext("2d");
    ctx.font = "32px sans-serif";
    const f = String.fromCodePoint(0x1f1ec, 0x1f1ed); // a flag emoji
    return Math.abs(ctx.measureText(f).width - ctx.measureText("GH").width) > 2;
  } catch (err) {
    return false;
  }
}
const flag = (code) => String.fromCodePoint(...[...code].map((ch) => 0x1f1e6 + ch.charCodeAt(0) - 65));
const pick = (arr, n, not) => {
  const pool = arr.filter((x) => !not.includes(x));
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, n);
};
const CONTINENTS = ["Africa", "Asia", "Europe", "North America", "South America", "Oceania"];

/** Static-looking country questions; wrong answers are re-picked each time the round is built. */
export function countryQuestions() {
  const out = [];
  list.forEach((c) => {
    const africa = c.continent === "Africa";
    const topicCapital = africa ? "Africa" : "Geography";
    const same = list.filter((x) => x !== c);
    out.push({
      c: topicCapital,
      l: c.level,
      q: `What is the capital of ${c.name}?`,
      a: [c.capital, ...pick(same.map((x) => x.capital).filter((x) => x !== c.capital), 3, [])],
      gen: true,
    });
    if (flagsSupported()) out.push({
      c: "Geography",
      l: c.level === "adults" ? "all" : c.level,
      q: `${flag(c.code)}  Which country's flag is this?`,
      a: [c.name, ...pick(same.map((x) => x.name), 3, [])],
      why: `${flag(c.code)} is the flag of ${c.name}.`,
      gen: true,
    });
    if (!["TR", "RU", "KZ"].includes(c.code)) { // countries that span two continents are skipped here
      out.push({
        c: "Geography",
        l: c.level === "adults" ? "all" : c.level,
        q: `On which continent is ${c.name}?`,
        a: [c.continent, ...pick(CONTINENTS, 3, [c.continent])],
        gen: true,
      });
    }
    out.push({
      c: africa ? "Africa" : "Geography",
      l: c.level,
      q: `${c.capital} is the capital of which country?`,
      a: [c.name, ...pick(same.map((x) => x.name), 3, [])],
      gen: true,
    });
  });
  return out;
}

/** Fresh arithmetic every time. */
const r = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
function wrongNumbers(right, n = 3) {
  const set = new Set();
  const spread = Math.max(3, Math.round(Math.abs(right) * 0.15));
  while (set.size < n) {
    const w = right + r(-spread, spread) || right + 1;
    if (w !== right && w >= 0) set.add(w);
  }
  return [...set];
}
export function mathQuestions(count = 60) {
  const out = [];
  for (let i = 0; i < count; i += 1) {
    const tier = i % 3; // 0 kids, 1 family, 2 adults
    let q;
    let right;
    if (tier === 0) {
      const kind = r(0, 2);
      const a = r(2, 12);
      const b = r(2, 12);
      if (kind === 0) {
        q = `What is ${a} + ${b}?`;
        right = a + b;
      } else if (kind === 1) {
        const big = Math.max(a, b) + r(1, 8);
        q = `What is ${big} − ${Math.min(a, b)}?`;
        right = big - Math.min(a, b);
      } else {
        q = `What is ${r(2, 5)} × ${r(2, 5)}?`;
        const m = q.match(/(\d+) × (\d+)/);
        right = m[1] * m[2];
      }
    } else if (tier === 1) {
      const kind = r(0, 3);
      if (kind === 0) {
        const a = r(6, 12);
        const b = r(6, 12);
        q = `What is ${a} × ${b}?`;
        right = a * b;
      } else if (kind === 1) {
        const b = r(3, 9);
        const x = r(4, 12);
        q = `What is ${b * x} ÷ ${b}?`;
        right = x;
      } else if (kind === 2) {
        const a = r(120, 480);
        const b = r(35, 190);
        q = `What is ${a} + ${b}?`;
        right = a + b;
      } else {
        const p = [10, 20, 25, 50][r(0, 3)];
        const n = r(2, 10) * 40;
        q = `What is ${p}% of ${n}?`;
        right = (n * p) / 100;
      }
    } else {
      const kind = r(0, 3);
      if (kind === 0) {
        const a = r(13, 25);
        q = `What is ${a} squared?`;
        right = a * a;
      } else if (kind === 1) {
        const a = r(12, 19);
        const b = r(12, 19);
        q = `What is ${a} × ${b}?`;
        right = a * b;
      } else if (kind === 2) {
        const p = [15, 35, 45, 12][r(0, 3)];
        const n = r(4, 20) * 20;
        q = `What is ${p}% of ${n}?`;
        right = (n * p) / 100;
      } else {
        const a = r(3, 9);
        const b = r(2, 5);
        q = `What is ${a} to the power of ${b}?`;
        right = a ** b;
      }
    }
    out.push({ c: "Maths", l: ["kids", "all", "adults"][tier], q, a: [String(right), ...wrongNumbers(right).map(String)], gen: true });
  }
  return out;
}
