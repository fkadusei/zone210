import { runMCQ } from "./mcq.js";

// [science, level 1 kids / 2 everyone / 3 expert, question, right, wrong, wrong, wrong, why]
const BANK = [
  ["Physics", 1, "What force pulls things down towards the Earth?", "Gravity", "Magnetism", "Friction", "Wind", "Gravity pulls objects towards the centre of the Earth."],
  ["Physics", 1, "Which of these is a source of light?", "The Sun", "The Moon", "A mirror", "A cloud", "The Moon only reflects sunlight."],
  ["Physics", 1, "What do we call frozen water?", "Ice", "Steam", "Vapour", "Fog", "Water freezes at 0°C."],
  ["Physics", 1, "Which is faster: light or sound?", "Light", "Sound", "They are equal", "It depends on the day", "Light is roughly a million times faster than sound in air."],
  ["Physics", 1, "What do magnets attract?", "Iron", "Wood", "Glass", "Plastic", "Iron, nickel and cobalt are magnetic."],
  ["Physics", 1, "What do we call the push or pull that slows things when they rub together?", "Friction", "Gravity", "Energy", "Sound", "Rough surfaces create more friction."],
  ["Physics", 1, "What colour do you get when you mix all colours of light together?", "White", "Black", "Brown", "Grey", "A prism splits white light into a rainbow."],
  ["Physics", 2, "What is the unit of force?", "Newton", "Joule", "Watt", "Pascal", "It is named after Isaac Newton."],
  ["Physics", 2, "What is the approximate speed of light in a vacuum?", "300,000 km/s", "30,000 km/s", "3,000 km/s", "300 km/s", "About 299,792 km per second."],
  ["Physics", 2, "What type of energy does a moving object have?", "Kinetic", "Potential", "Chemical", "Nuclear", "Kinetic energy is the energy of motion."],
  ["Physics", 2, "Which particle has a negative charge?", "Electron", "Proton", "Neutron", "Photon", "Protons are positive and neutrons are neutral."],
  ["Physics", 2, "What is the unit of electric current?", "Ampere", "Volt", "Ohm", "Watt", "Its symbol is A."],
  ["Physics", 2, "Why do we see lightning before we hear thunder?", "Light travels faster than sound", "Sound is quieter", "Thunder happens later", "Clouds block sound", "Light reaches us almost instantly, but sound takes about 3 seconds per kilometre."],
  ["Physics", 2, "What is the acceleration due to gravity on Earth?", "About 9.8 m/s²", "About 1.6 m/s²", "About 24.8 m/s²", "About 3.7 m/s²", "The Moon's is about 1.6 m/s²."],
  ["Physics", 2, "What is a change from liquid to gas called?", "Evaporation", "Condensation", "Freezing", "Melting", "Boiling is fast evaporation throughout the liquid."],
  ["Physics", 3, "What does Ohm's law state?", "V = I × R", "F = m × a", "E = m × c²", "P = W ÷ t", "Voltage equals current times resistance."],
  ["Physics", 3, "Who proposed the theory of general relativity?", "Albert Einstein", "Isaac Newton", "Niels Bohr", "Galileo Galilei", "Published in 1915."],
  ["Physics", 3, "What is the SI unit of frequency?", "Hertz", "Decibel", "Tesla", "Farad", "One hertz is one cycle per second."],
  ["Physics", 3, "In a pendulum, what mainly determines the period for small swings?", "Its length", "Its mass", "Its colour", "The starting height", "T = 2π√(L/g)."],
  ["Physics", 3, "What is the SI unit of energy?", "Joule", "Watt", "Newton", "Pascal", "A watt is one joule per second."],
  ["Physics", 3, "What kind of wave is sound?", "Longitudinal", "Transverse", "Electromagnetic", "Gravitational", "Sound compresses and stretches the air along its direction of travel."],
  ["Physics", 3, "What happens to the pressure of a gas if you halve its volume at constant temperature?", "It doubles", "It halves", "It stays the same", "It quadruples", "Boyle's law: pressure × volume is constant."],
  ["Chemistry", 1, "What is H₂O commonly called?", "Water", "Salt", "Air", "Sugar", "Two hydrogen atoms and one oxygen atom."],
  ["Chemistry", 1, "Which gas do we need to breathe to stay alive?", "Oxygen", "Helium", "Nitrogen", "Carbon dioxide", "About 21% of air is oxygen."],
  ["Chemistry", 1, "What are the three common states of matter?", "Solid, liquid, gas", "Hot, warm, cold", "Hard, soft, wet", "Big, medium, small", "Plasma is a fourth state."],
  ["Chemistry", 1, "Which of these is a metal?", "Iron", "Oxygen", "Carbon", "Neon", "Iron is a metal."],
  ["Chemistry", 1, "What gas do plants take in from the air?", "Carbon dioxide", "Oxygen", "Hydrogen", "Helium", "They use it in photosynthesis."],
  ["Chemistry", 2, "What is the chemical symbol for gold?", "Au", "Ag", "Go", "Gd", "From the Latin aurum."],
  ["Chemistry", 2, "What is the pH of pure water?", "7", "0", "10", "14", "7 is neutral, below 7 is acidic and above 7 is basic."],
  ["Chemistry", 2, "What is the most abundant gas in Earth's atmosphere?", "Nitrogen", "Oxygen", "Carbon dioxide", "Argon", "About 78% is nitrogen."],
  ["Chemistry", 2, "Which is the lightest element?", "Hydrogen", "Helium", "Lithium", "Carbon", "Hydrogen has atomic number 1."],
  ["Chemistry", 2, "Table salt is made of sodium and which other element?", "Chlorine", "Fluorine", "Potassium", "Calcium", "Sodium chloride, NaCl."],
  ["Chemistry", 2, "What is the chemical formula of carbon dioxide?", "CO₂", "CO", "C₂O", "O₂C₂", "One carbon atom and two oxygen atoms."],
  ["Chemistry", 2, "Which group of the periodic table contains helium, neon and argon?", "Noble gases", "Halogens", "Alkali metals", "Metalloids", "They are very unreactive."],
  ["Chemistry", 3, "What particles are found in the nucleus of an atom?", "Protons and neutrons", "Protons and electrons", "Electrons and neutrons", "Only electrons", "Electrons orbit outside the nucleus."],
  ["Chemistry", 3, "What type of bond shares electrons between atoms?", "Covalent", "Ionic", "Metallic", "Hydrogen", "Ionic bonds transfer electrons."],
  ["Chemistry", 3, "What is Avogadro's number approximately?", "6.02 × 10²³", "3.14 × 10⁸", "9.81 × 10⁴", "1.60 × 10⁻¹⁹", "The number of particles in one mole."],
  ["Chemistry", 3, "Which element has the highest electronegativity?", "Fluorine", "Oxygen", "Chlorine", "Nitrogen", "Fluorine is the most electronegative element."],
  ["Chemistry", 3, "What is an isotope?", "Atoms of one element with different numbers of neutrons", "Atoms with different numbers of protons", "A charged atom", "A molecule of one element", "Carbon-12 and carbon-14 are isotopes."],
  ["Chemistry", 3, "What is the process of a solid turning directly into a gas?", "Sublimation", "Deposition", "Condensation", "Distillation", "Dry ice does this at normal pressure."],
  ["Biology", 1, "What do plants need to make their own food?", "Sunlight", "Moonlight", "Sand", "Noise", "Plants use light, water and carbon dioxide."],
  ["Biology", 1, "Which organ pumps blood around your body?", "Heart", "Lungs", "Stomach", "Brain", "The heart beats about 100,000 times a day."],
  ["Biology", 1, "How many legs does an insect have?", "Six", "Four", "Eight", "Ten", "Spiders have eight and are not insects."],
  ["Biology", 1, "Which part of a plant takes in water from the soil?", "Roots", "Leaves", "Flowers", "Fruits", "Roots also hold the plant in place."],
  ["Biology", 1, "What do we call animals that eat only plants?", "Herbivores", "Carnivores", "Omnivores", "Predators", "Cows and rabbits are herbivores."],
  ["Biology", 1, "Which sense organ do we use to see?", "Eyes", "Ears", "Nose", "Skin", "The brain interprets the signals."],
  ["Biology", 2, "What is the powerhouse of the cell?", "Mitochondria", "Nucleus", "Ribosome", "Vacuole", "They produce ATP."],
  ["Biology", 2, "What is the green pigment in plants called?", "Chlorophyll", "Melanin", "Keratin", "Haemoglobin", "It absorbs sunlight for photosynthesis."],
  ["Biology", 2, "What carries oxygen in your blood?", "Red blood cells", "White blood cells", "Platelets", "Plasma", "They contain haemoglobin."],
  ["Biology", 2, "What is the largest organ of the human body?", "Skin", "Liver", "Heart", "Brain", "It covers about 2 square metres."],
  ["Biology", 2, "What does DNA stand for?", "Deoxyribonucleic acid", "Dinitrogen acid", "Dual nucleic acid", "Deoxyribose amino acid", "It carries genetic information."],
  ["Biology", 2, "Which gas do plants release during photosynthesis?", "Oxygen", "Carbon dioxide", "Nitrogen", "Methane", "Carbon dioxide goes in, oxygen comes out."],
  ["Biology", 2, "How many chromosomes does a typical human cell have?", "46", "23", "48", "92", "23 pairs."],
  ["Biology", 3, "Which bases pair together in DNA?", "A with T, C with G", "A with C, T with G", "A with G, C with T", "A with A, T with T", "Adenine pairs with thymine, cytosine with guanine."],
  ["Biology", 3, "Which organelle is the site of protein synthesis?", "Ribosome", "Lysosome", "Golgi body", "Centriole", "Ribosomes read mRNA."],
  ["Biology", 3, "Which process makes two identical daughter cells?", "Mitosis", "Meiosis", "Osmosis", "Diffusion", "Meiosis makes four different sex cells."],
  ["Biology", 3, "Which molecule is the main energy currency of the cell?", "ATP", "DNA", "RNA", "Glucose", "Adenosine triphosphate."],
  ["Biology", 3, "Who is known as the father of genetics?", "Gregor Mendel", "Charles Darwin", "Louis Pasteur", "Alexander Fleming", "He studied pea plants."],
  ["Biology", 3, "What is the movement of water across a semi-permeable membrane called?", "Osmosis", "Diffusion", "Active transport", "Respiration", "Water moves towards the higher solute concentration."],
  ["Biology", 1, "Which organ do we use to breathe?", "Lungs", "Heart", "Kidneys", "Liver", "Lungs take in oxygen and remove carbon dioxide."],
  ["Biology", 1, "What do herbivores eat?", "Plants", "Meat", "Rocks", "Nothing", "Carnivores eat meat and omnivores eat both."],
  ["Biology", 1, "Which animal group has feathers?", "Birds", "Fish", "Reptiles", "Insects", "Most birds can fly, but penguins and ostriches cannot."],
  ["Biology", 1, "What is the first living thing in a food chain?", "A plant (producer)", "A lion", "A snake", "A fish", "Plants make their own food using sunlight."],
  ["Biology", 2, "Which part of the blood fights infection?", "White blood cells", "Red blood cells", "Platelets", "Plasma", "Platelets help blood clot."],
  ["Biology", 2, "How many chambers does the human heart have?", "Four", "Two", "Three", "Five", "Two atria and two ventricles."],
  ["Biology", 2, "What is a dominant allele?", "One that shows when present", "One that is always rare", "One that is hidden", "One that only girls have", "A recessive allele only shows when two copies are present."],
  ["Biology", 2, "Where does digestion of food mostly finish and nutrients get absorbed?", "Small intestine", "Stomach", "Oesophagus", "Large intestine", "Its walls are folded with villi to absorb nutrients."],
  ["Biology", 2, "What do we call an animal that hunts other animals?", "Predator", "Producer", "Decomposer", "Prey", "The hunted animal is called prey."],
  ["Biology", 2, "Which animals are cold-blooded and have scaly skin?", "Reptiles", "Mammals", "Birds", "Amphibians", "Snakes, lizards and crocodiles are reptiles."],
  ["Biology", 3, "In a Punnett square, what fraction of offspring from Aa × Aa are aa?", "1/4", "1/2", "3/4", "0", "The cross gives AA, Aa, Aa and aa."],
  ["Biology", 3, "What is the role of decomposers such as fungi and bacteria?", "Break down dead matter and return nutrients", "Make food from sunlight", "Hunt herbivores", "Pollinate flowers", "They recycle nutrients into the soil."],
  ["Biology", 3, "Which part of the nervous system includes the brain and spinal cord?", "Central nervous system", "Peripheral nervous system", "Endocrine system", "Autonomic system", "Nerves outside these form the peripheral system."],
  ["Biology", 3, "About what percentage of energy passes from one level of a food chain to the next?", "About 10%", "About 50%", "About 90%", "100%", "Most energy is lost as heat and in life processes."],
  ["Biology", 3, "Which hormone, made by the pancreas, lowers blood sugar?", "Insulin", "Adrenaline", "Thyroxine", "Oestrogen", "Lack of insulin action causes diabetes."],
  ["Chemistry", 2, "In a balanced equation, what must be the same on both sides?", "The number of each type of atom", "The number of molecules", "The colour", "The state of matter", "Atoms are neither created nor destroyed."],
  ["Physics", 2, "What is the total resistance of two 10 Ω resistors in series?", "20 Ω", "5 Ω", "10 Ω", "100 Ω", "Series resistances add together."],
  ["Physics", 3, "Two identical resistors in parallel have a total resistance that is...", "Half of one", "Double one", "The same as one", "Zero", "Parallel paths lower the total resistance."],
];

const pick = (a) => a[Math.floor(Math.random() * a.length)];
const shuffle = (a) => a.map((v) => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map((x) => x[1]);
const pool = (all, n, not) => shuffle(all.filter((x) => x !== not)).slice(0, n);

function generated(ctx, level) {
  const els = ctx.elements, out = [];
  const common = els.filter((e) => e.n <= (level === 1 ? 36 : level === 2 ? 86 : 118));
  const e1 = pick(common), e2 = pick(common);
  out.push({ tag: "Chemistry", q: `What is the atomic number of ${e1.name}?`, opts: [e1.n, ...pool([e1.n + 1, e1.n - 1, e1.n + 2, e1.n + 5, Math.max(1, e1.n - 3)].filter((x) => x > 0 && x !== e1.n), 3)].map(String), a: 0, why: `${e1.name} (${e1.s}) has ${e1.n} protons.`, id: `g-an-${e1.n}` });
  out.push({ tag: "Chemistry", q: `Which element has the symbol ${e2.s}?`, opts: [e2.name, ...pool(common.map((x) => x.name), 3, e2.name)], a: 0, why: `${e2.s} is ${e2.name}, atomic number ${e2.n}.`, id: `g-sym-${e2.n}` });
  const st = pick(common.filter((e) => e.ph));
  out.push({ tag: "Chemistry", q: `Is ${st.name} a solid, liquid or gas at room temperature?`, opts: ["Solid", "Liquid", "Gas", "Plasma"], a: ["Solid", "Liquid", "Gas"].indexOf(st.ph), why: `${st.name} is a ${st.ph.toLowerCase()} at room temperature.`, id: `g-ph-${st.n}` });
  if (level > 1) {
    const g = pick([["Earth", 9.81], ["Moon", 1.62], ["Mars", 3.71], ["Jupiter", 24.79]]), m = pick([2, 5, 10, 20, 50]);
    const w = +(m * g[1]).toFixed(1);
    out.push({ tag: "Physics", q: `A ${m} kg object is on ${g[0]}. What is its weight? (weight = mass × g, with g = ${g[1]} m/s²)`, opts: [`${w} N`, `${(w * 2).toFixed(1)} N`, `${(w / 2).toFixed(1)} N`, `${(m + g[1]).toFixed(1)} N`], a: 0, why: `${m} × ${g[1]} = ${w} N.`, id: `g-w-${g[0]}-${m}` });
    const d = pick([100, 150, 200, 300, 450]), t = pick([2, 3, 5, 10]);
    const v = +(d / t).toFixed(1);
    out.push({ tag: "Physics", q: `A car travels ${d} m in ${t} s at a steady speed. How fast is it going?`, opts: [`${v} m/s`, `${(v * 2).toFixed(1)} m/s`, `${(d * t)} m/s`, `${(v / 2).toFixed(1)} m/s`], a: 0, why: `speed = distance ÷ time = ${d} ÷ ${t} = ${v} m/s.`, id: `g-v-${d}-${t}` });
  }
  const L = level === 1 ? 3 : level === 2 ? 4 : 5, seq = Array.from({ length: L }, () => "ATCG"[Math.floor(Math.random() * 4)]);
  const comp = (s, m) => s.map((b) => m[b]).join("");
  const D = { A: "T", T: "A", C: "G", G: "C" };
  const right = comp(seq, D), wrongs = new Set();
  while (wrongs.size < 3) { const w = seq.map((b) => pick("ATCG".split("").filter((x) => x !== D[b]).concat([D[b], D[b]]))).join(""); if (w !== right) wrongs.add(w); }
  out.push({ tag: "Biology", q: `The DNA strand ${seq.join("")} is copied. What is the matching (complementary) strand?`, opts: [right, ...wrongs], a: 0, why: "A pairs with T and C pairs with G.", id: `g-dna-${seq.join("")}` });
  return out;
}

export function mountQuiz(root, ctx) {
  const st = ctx.store.get("zone210_lab_quiz", { level: 2, sci: "all", seen: [] });
  const shell = document.createElement("div");
  shell.className = "g-panel quizsetup";
  shell.innerHTML = `<div><div class="lbl">Level</div><div class="g-chips" id="qL"></div></div>
    <div><div class="lbl">Subject</div><div class="g-chips" id="qS"></div></div>
    <div><div class="lbl">Length</div><div class="g-chips" id="qN"></div></div>
    <div class="row"><button class="g-btn" id="qGo">Start quiz</button></div><p class="hint" id="qInfo"></p>`;
  root.appendChild(shell);
  const $ = (id) => shell.querySelector("#" + id);
  const LV = [[1, "Kids"], [2, "Everyone"], [3, "Expert"]], SC = [["all", "All three"], ["Physics", "⚛️ Physics"], ["Chemistry", "🧪 Chemistry"], ["Biology", "🧬 Biology"]], NN = [[10, "10 questions"], [20, "20 questions"]];
  let count = st.count || 10, run = null;
  const save = () => ctx.store.set("zone210_lab_quiz", { level: st.level, sci: st.sci, count, seen: st.seen.slice(-400) });
  const chips = (id, list, cur, set) => {
    $(id).innerHTML = list.map(([k, l]) => `<button class="g-chip" data-k="${k}" aria-pressed="${String(k) === String(cur())}">${l}</button>`).join("");
    $(id).querySelectorAll("button").forEach((b) => b.addEventListener("click", () => { set(b.dataset.k); render(); }));
  };
  function render() {
    chips("qL", LV, () => st.level, (k) => (st.level = +k));
    chips("qS", SC, () => st.sci, (k) => (st.sci = k));
    chips("qN", NN, () => count, (k) => (count = +k));
    $("qInfo").textContent = "Questions you've already answered won't repeat until you've seen them all. Easier levels include some quick calculations, and every answer comes with an explanation.";
    save();
  }
  function build() {
    const lvl = st.level;
    const staticQs = BANK.filter((b) => (st.sci === "all" || b[0] === st.sci) && (lvl === 2 ? b[1] <= 2 : lvl === 3 ? b[1] >= 2 : b[1] === 1)).map((b, i) => ({ tag: b[0], q: b[2], opts: [b[3], b[4], b[5], b[6]], a: 0, why: b[7], id: `s-${b[2].slice(0, 40)}` }));
    let gen = [];
    for (let i = 0; i < 6; i++) gen = gen.concat(generated(ctx, lvl));
    gen = gen.filter((g) => st.sci === "all" || g.tag === st.sci);
    const seen = new Set(st.seen);
    const dedupe = (list) => { const m = new Map(); list.forEach((q) => m.set(q.id, q)); return [...m.values()]; };
    const fresh = shuffle(dedupe(staticQs.concat(gen)));
    const unseen = fresh.filter((q) => !seen.has(q.id));
    let chosen = unseen.slice(0, count);
    if (chosen.length < count) {
      st.seen = st.seen.filter((id) => !fresh.some((q) => q.id === id));
      chosen = chosen.concat(fresh.filter((q) => !chosen.includes(q)).slice(0, count - chosen.length));
    }
    return chosen;
  }
  function start() {
    const qs = build();
    shell.hidden = true;
    const holder = document.createElement("div"); holder.className = "g-panel";
    root.appendChild(holder);
    run = runMCQ(holder, { ctx, questions: qs, title: `${SC.find((s) => s[0] === st.sci)[1]} · ${LV.find((l) => l[0] === st.level)[1]}`, bestKey: `quiz_${st.sci}_${st.level}_${count}` });
    run.done.then((r) => {
      if (!r) return;
      qs.forEach((q) => st.seen.push(q.id));
      save();
      const pct = r.total ? Math.round((r.correct / r.total) * 100) : 0;
      const back = () => { holder.remove(); shell.hidden = false; };
      ctx.showEnd({
        emoji: pct >= 90 ? "🏆" : pct >= 60 ? "🎉" : "💪",
        title: r.record ? "New best!" : `${r.correct} of ${r.total} right`,
        text: `${r.score} points · ${pct}% correct${r.record ? "" : ` · best ${r.best}`}`,
        missed: r.missed.map((q) => `${q.q.length > 60 ? q.q.slice(0, 57) + "…" : q.q} → ${q.opts[q.a]}`),
        again: () => { holder.remove(); shell.hidden = false; start(); },
        close: back,
      });
    });
  }
  $("qGo").addEventListener("click", start);
  render();
  return () => run && run.cancel();
}

// Ten questions that are the same for everyone on a given day (seeded by the date key).
export function dailyQuestions(ctx, key) {
  let h = 2166136261;
  for (const ch of key) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  let a = h >>> 0;
  const rand = () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const real = Math.random;
  Math.random = rand;
  try {
    const out = [];
    for (const sci of ["Chemistry", "Physics", "Biology"]) {
      for (const lv of [1, 2, 3]) {
        const list = BANK.filter((b) => b[0] === sci && b[1] === lv);
        const b = list[Math.floor(rand() * list.length)];
        out.push({ tag: b[0], q: b[2], opts: [b[3], b[4], b[5], b[6]], a: 0, why: b[7], id: b[2] });
      }
    }
    const gen = generated(ctx, 2).filter((g) => g.tag === "Chemistry");
    out.push(gen[Math.floor(rand() * gen.length)]);
    return shuffle(out);
  } finally {
    Math.random = real;
  }
}
