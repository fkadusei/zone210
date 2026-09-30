import { playMCQ } from "./mcq.js";
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const shuffle = (a) => a.map((v) => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map((x) => x[1]);
const pick = (a) => a[Math.floor(Math.random() * a.length)];

/* ---------------- Human body ---------------- */
const BODY = {
  brain: { name: "Brain", sys: "Nervous system", text: "The control centre of the body. It processes what you see, hear, feel and think, and sends signals along nerves to your muscles.", fact: "Your brain is about 2% of your body weight but uses around 20% of your energy." },
  lungs: { name: "Lungs", sys: "Respiratory system", text: "They bring oxygen into the blood and remove carbon dioxide when you breathe out.", fact: "Each lung is full of tiny air sacs called alveoli, hundreds of millions in total." },
  heart: { name: "Heart", sys: "Circulatory system", text: "A muscular pump that pushes blood around the body, carrying oxygen and nutrients to every cell.", fact: "The heart of an adult beats about 60 to 100 times a minute at rest." },
  liver: { name: "Liver", sys: "Digestive system", text: "It cleans the blood, stores energy, and makes bile that helps digest fats.", fact: "The liver is the largest organ inside the body, and it can regrow part of itself." },
  stomach: { name: "Stomach", sys: "Digestive system", text: "A stretchy bag that mixes food with acid and enzymes, turning it into a thick liquid.", fact: "Stomach acid is strong enough to break down food, and a layer of mucus protects the stomach wall." },
  kidneys: { name: "Kidneys", sys: "Urinary system", text: "They filter waste and extra water out of the blood to make urine, and keep the body's salt and water balanced.", fact: "Most people have two kidneys, but can live healthily with one." },
  gut: { name: "Intestines", sys: "Digestive system", text: "The small intestine absorbs nutrients into the blood, and the large intestine absorbs water and forms waste.", fact: "The small intestine is about 6 metres long in an adult, folded up inside the belly." },
  bones: { name: "Skeleton", sys: "Skeletal system", text: "Bones support the body, protect organs and work with muscles to let you move. Bone marrow makes blood cells.", fact: "An adult has 206 bones. Babies are born with about 270 that join together as they grow." },
};

export function mountBody(root, ctx) {
  let sel = "heart";
  const O = (id, inner) => `<g class="org" data-o="${id}">${inner}</g>`;
  root.innerHTML = `<div class="two"><div class="g-panel"><svg class="cellsvg" id="bsvg" viewBox="0 0 260 420" role="img" aria-label="Human body organs" style="max-width:340px;margin:auto">
    <g fill="#94a3b822" stroke="#94a3b8" stroke-width="2"><circle cx="130" cy="45" r="30"/><rect x="118" y="72" width="24" height="22"/><rect x="72" y="88" width="116" height="196" rx="42"/><rect x="34" y="94" width="30" height="150" rx="15"/><rect x="196" y="94" width="30" height="150" rx="15"/><rect x="82" y="270" width="44" height="140" rx="18"/><rect x="134" y="270" width="44" height="140" rx="18"/></g>
    ${O("bones", `<g stroke="#e2e8f0" stroke-width="7" stroke-linecap="round" opacity=".85"><path d="M104 285v110M156 285v110M49 104v130M211 104v130M130 96v56"/></g>`)}
    ${O("brain", `<ellipse cx="130" cy="38" rx="22" ry="17" fill="#ec4899"/><path d="M116 38q6-8 12 0t12 0" fill="none" stroke="#fff9" stroke-width="2"/>`)}
    ${O("lungs", `<ellipse cx="103" cy="140" rx="22" ry="38" fill="#38bdf8"/><ellipse cx="157" cy="140" rx="22" ry="38" fill="#38bdf8"/>`)}
    ${O("heart", `<path d="M132 190c-22-14-26-34-10-37 7-1 10 4 10 7 0-3 3-8 10-7 16 3 12 23-10 37z" fill="#e5484d"/>`)}
    ${O("liver", `<ellipse cx="106" cy="205" rx="30" ry="14" fill="#b45309"/>`)}
    ${O("stomach", `<ellipse cx="152" cy="206" rx="17" ry="12" fill="#f59e0b" transform="rotate(20 152 206)"/>`)}
    ${O("kidneys", `<ellipse cx="92" cy="236" rx="8" ry="12" fill="#a855f7"/><ellipse cx="168" cy="236" rx="8" ry="12" fill="#a855f7"/>`)}
    ${O("gut", `<rect x="106" y="226" width="48" height="44" rx="14" fill="#fb923c55" stroke="#fb923c" stroke-width="3"/><path d="M114 238h32M114 248h32M114 258h32" stroke="#fb923c" stroke-width="4" stroke-linecap="round"/>`)}
  </svg><div class="orglist" id="bl"></div></div><div class="g-panel" id="bd"></div></div>`;
  const $ = (id) => root.querySelector("#" + id);
  function detail() {
    const o = BODY[sel];
    $("bd").innerHTML = `<div class="lbl">${esc(o.sys)}</div><h3 style="margin:4px 0 8px;font-size:1.5rem">${esc(o.name)}</h3><p class="sumtext">${esc(o.text)}</p><p class="hint"><b>Did you know?</b> ${esc(o.fact)}</p>`;
    root.querySelectorAll("#bsvg [data-o]").forEach((n) => n.classList.toggle("sel", n.dataset.o === sel));
    $("bl").querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.o === sel)));
  }
  const pick1 = (k) => { sel = k; ctx.sfx.pop(); detail(); };
  $("bl").innerHTML = Object.entries(BODY).map(([k, v]) => `<button class="g-chip" data-o="${k}">${esc(v.name)}</button>`).join("");
  $("bl").querySelectorAll("button").forEach((b) => b.addEventListener("click", () => pick1(b.dataset.o)));
  root.querySelectorAll("#bsvg [data-o]").forEach((n) => n.addEventListener("click", () => pick1(n.dataset.o)));
  detail();
}

/* ---------------- Genetics: Punnett square ---------------- */
const TRAITS = {
  flower: { name: "Pea flower colour", letter: "P", dom: ["Purple", "#a855f7"], rec: ["White", "#e2e8f0"] },
  seed: { name: "Pea seed shape", letter: "R", dom: ["Round", "#f59e0b"], rec: ["Wrinkled", "#84cc16"] },
  height: { name: "Pea plant height", letter: "T", dom: ["Tall", "#16a34a"], rec: ["Short", "#38bdf8"] },
};
const GENOS = ["Homozygous dominant", "Heterozygous", "Homozygous recessive"];
const genoStr = (L, g) => (g === 0 ? L + L : g === 1 ? L + L.toLowerCase() : L.toLowerCase() + L.toLowerCase());
const cross = (a, b) => { const out = []; for (const x of a) for (const y of b) out.push([x, y].sort((p, q) => (p === p.toUpperCase() ? -1 : 1) - (q === q.toUpperCase() ? -1 : 1)).join("")); return out; };
const isDom = (g) => g[0] === g[0].toUpperCase();

export function mountPunnett(root, ctx) {
  let t = "flower", p1 = 1, p2 = 1;
  root.innerHTML = `<div class="two"><div class="g-panel"><div class="lbl">Trait</div><div class="chips-row" id="pT"></div>
    <div class="lbl">Parent 1</div><div class="chips-row" id="p1"></div><div class="lbl">Parent 2</div><div class="chips-row" id="p2"></div>
    <p class="hint">Each parent passes one of its two letters to each offspring. A capital letter is the dominant version, which shows whenever it's present. A small letter is recessive and only shows when both letters are small.</p></div>
    <div class="g-panel"><div class="punn" id="pg"></div><div id="pr"></div><div class="row" style="margin-top:12px"><button class="g-btn" id="pQ">Practise predicting (8 questions)</button></div></div></div>`;
  const $ = (id) => root.querySelector("#" + id);
  let handle = null;
  function render() {
    const T = TRAITS[t], L = T.letter;
    const chips = (id, list, cur, set) => { $(id).innerHTML = list.map(([k, l]) => `<button class="g-chip" data-k="${k}" aria-pressed="${String(k) === String(cur)}">${l}</button>`).join(""); $(id).querySelectorAll("button").forEach((b) => b.addEventListener("click", () => { set(b.dataset.k); ctx.sfx.pick(); render(); })); };
    chips("pT", Object.entries(TRAITS).map(([k, v]) => [k, v.name]), t, (k) => (t = k));
    chips("p1", [0, 1, 2].map((g) => [g, `${genoStr(L, g)} · ${GENOS[g]}`]), p1, (k) => (p1 = +k));
    chips("p2", [0, 1, 2].map((g) => [g, `${genoStr(L, g)} · ${GENOS[g]}`]), p2, (k) => (p2 = +k));
    const a = genoStr(L, p1).split(""), b = genoStr(L, p2).split(""), kids = cross(a, b);
    const col = (g) => (isDom(g) ? T.dom[1] : T.rec[1]);
    $("pg").innerHTML = `<div class="h"></div><div class="h">${b[0]}</div><div class="h">${b[1]}</div>` + [0, 1].map((i) => `<div class="h">${a[i]}</div>` + [0, 1].map((j) => { const g = kids[i * 2 + j]; return `<div class="c" style="border-color:${col(g)}">${g}</div>`; }).join("")).join("");
    const cnt = {}; kids.forEach((g) => (cnt[g] = (cnt[g] || 0) + 1));
    const dom = kids.filter(isDom).length;
    $("pr").innerHTML = `<p class="sumtext"><b>Genotypes:</b> ${Object.entries(cnt).map(([g, n]) => `${g} ${n * 25}%`).join(" · ")}</p>
      <p class="sumtext"><span class="dot" style="background:${T.dom[1]}"></span><b>${T.dom[0]}</b> ${dom * 25}% &nbsp; <span class="dot" style="background:${T.rec[1]}"></span><b>${T.rec[0]}</b> ${(4 - dom) * 25}%</p>`;
  }
  function questions() {
    const out = [];
    for (let i = 0; i < 8; i++) {
      const T = TRAITS[pick(Object.keys(TRAITS))], L = T.letter, g1 = Math.floor(Math.random() * 3), g2 = Math.floor(Math.random() * 3);
      const kids = cross(genoStr(L, g1).split(""), genoStr(L, g2).split(""));
      const domPct = kids.filter(isDom).length * 25;
      const cross_ = `${genoStr(L, g1)} × ${genoStr(L, g2)}`;
      const opts = (right) => ["0%", "25%", "50%", "75%", "100%"].filter((x) => x !== `${right}%`).sort(() => Math.random() - 0.5).slice(0, 3).concat([`${right}%`]);
      if (i % 2) out.push({ tag: "Genetics", q: `Two pea plants are crossed: ${cross_}. What percentage of offspring show the ${T.dom[0].toLowerCase()} (dominant) trait?`, opts: opts(domPct), a: 3, why: `The Punnett square for ${cross_} gives ${domPct}% ${T.dom[0].toLowerCase()} offspring.` });
      else out.push({ tag: "Genetics", q: `Cross ${cross_}. What is the chance of a ${T.rec[0].toLowerCase()} (recessive) offspring?`, opts: opts(100 - domPct), a: 3, why: `Recessive shows only with two small letters. In ${cross_}, that is ${100 - domPct}% of offspring.` });
    }
    return out;
  }
  $("pQ").addEventListener("click", () => { root.firstChild.hidden = true; handle = playMCQ(root, ctx, { make: questions, title: "🧬 Genetics practice", bestKey: "punnett" }, () => { root.firstChild.hidden = false; }); });
  render();
  return () => handle && handle.cancel();
}

/* ---------------- Food chains ---------------- */
const CHAINS = [
  ["Grassland", [["Grass", "🌱"], ["Grasshopper", "🦗"], ["Frog", "🐸"], ["Snake", "🐍"], ["Hawk", "🦅"]]],
  ["Ocean", [["Phytoplankton", "🟢"], ["Krill", "🦐"], ["Small fish", "🐟"], ["Tuna", "🐠"], ["Shark", "🦈"]]],
  ["Pond", [["Algae", "🌿"], ["Snail", "🐌"], ["Fish", "🐟"], ["Heron", "🦩"]]],
  ["Forest", [["Oak leaves", "🍃"], ["Caterpillar", "🐛"], ["Blue tit", "🐦"], ["Sparrowhawk", "🦅"]]],
  ["Savanna", [["Grass", "🌾"], ["Zebra", "🦓"], ["Lion", "🦁"]]],
  ["Desert", [["Cactus", "🌵"], ["Mouse", "🐭"], ["Snake", "🐍"], ["Eagle", "🦅"]]],
  ["Garden", [["Lettuce", "🥬"], ["Caterpillar", "🐛"], ["Robin", "🐦"], ["Cat", "🐈"]]],
  ["Arctic Ocean", [["Phytoplankton", "🟢"], ["Krill", "🦐"], ["Penguin", "🐧"], ["Leopard seal", "🦭"]]],
  ["Farm", [["Wheat", "🌾"], ["Mouse", "🐭"], ["Owl", "🦉"]]],
  ["Rainforest", [["Leaves", "🍃"], ["Caterpillar", "🐛"], ["Tree frog", "🐸"], ["Snake", "🐍"], ["Jaguar", "🐆"]]],
  ["Coral reef", [["Algae", "🌿"], ["Sea urchin", "🦔"], ["Octopus", "🐙"], ["Moray eel", "🐍"]]],
  ["Woodland", [["Acorn", "🌰"], ["Squirrel", "🐿️"], ["Fox", "🦊"]]],
];

export function mountFood(root, ctx) {
  let deck = [], idx = 0, next = 0, score = 0, mistakes = 0, level = ctx.store.get("zone210_lab_foodlvl", 0), correctChains = 0, order = [];
  root.innerHTML = `<div class="g-panel dnaq"><div class="chips-row" id="fl" style="justify-content:center"></div>
    <p class="hint" id="fInfo"></p><div class="slots" id="fSlots"></div><div class="chain" id="fCards"></div><p class="hint" id="fMsg"></p><div class="row" style="justify-content:center"><button class="g-btn" id="fNext" hidden>Next chain →</button></div></div>`;
  const $ = (id) => root.querySelector("#" + id);
  const LV = [["All chains", 0], ["Short (3)", 3], ["Long (4-5)", 4]];
  function pool() { return CHAINS.filter((c) => level === 0 || (level === 3 ? c[1].length === 3 : c[1].length >= 4)); }
  function newRound() { deck = shuffle(pool()).slice(0, 5); idx = 0; score = 0; correctChains = 0; load(); }
  function load() {
    const [hab, chain] = deck[idx]; next = 0; mistakes = 0; order = chain;
    $("fInfo").innerHTML = `<b>${esc(hab)}</b> · chain ${idx + 1} of ${deck.length}. Energy starts with the Sun ☀️ and passes along the chain. Tap the organisms in order: producer first, top predator last. Each arrow means "is eaten by".`;
    $("fSlots").innerHTML = `<span class="slot filled" style="border-color:#f59e0b"><span style="font-size:1.7rem">☀️</span><br>Sun</span>` + chain.map((_, i) => `<span class="arrow">→</span><span class="slot" data-i="${i}">${i === 0 ? "Producer" : i === chain.length - 1 ? "Top" : "Consumer"}</span>`).join("");
    $("fCards").innerHTML = shuffle(chain.map((c, i) => [c, i])).map(([c, i]) => `<button class="fcard" data-i="${i}"><span>${c[1]}</span>${esc(c[0])}</button>`).join("");
    $("fCards").querySelectorAll("button").forEach((b) => b.addEventListener("click", () => tap(b)));
    $("fNext").hidden = true; $("fMsg").textContent = `Round score ${score}`;
  }
  function tap(b) {
    if (b.classList.contains("placed")) return;
    const i = +b.dataset.i;
    if (i === next) {
      b.classList.add("placed"); ctx.sfx.right();
      const slot = $("fSlots").querySelector(`[data-i="${i}"]`); slot.classList.add("filled"); slot.innerHTML = `<span style="font-size:1.7rem">${order[i][1]}</span><br>${esc(order[i][0])}`;
      next += 1;
      if (next === order.length) {
        const pts = Math.max(20, 100 - mistakes * 20); score += pts; if (mistakes === 0) correctChains += 1;
        $("fMsg").textContent = `✅ Food chain complete! +${pts} · round score ${score}`;
        $("fNext").hidden = false; $("fNext").textContent = idx >= deck.length - 1 ? "See my score →" : "Next chain →"; $("fNext").focus({ preventScroll: true });
      }
    } else { mistakes += 1; ctx.sfx.wrong(); b.classList.add("shake"); setTimeout(() => b.classList.remove("shake"), 320); $("fMsg").textContent = next === 0 ? "Start with the producer, the living thing that makes its own food from sunlight." : `Not that one. What eats ${order[next - 1][0]}?`; }
  }
  $("fNext").addEventListener("click", () => {
    if (idx >= deck.length - 1) {
      const best = ctx.store.get("zone210_lab_best", {}), k = "food_" + level, rec = score > (best[k] || 0);
      if (rec) { best[k] = score; ctx.store.set("zone210_lab_best", best); }
      ctx.showEnd({ emoji: score >= 450 ? "🏆" : "🎉", title: rec ? "New best!" : "Chains complete", text: `${score} points · ${correctChains} of ${deck.length} chains with no mistakes${rec ? "" : ` · best ${best[k]}`}`, again: newRound, close: newRound });
    } else { idx += 1; load(); }
  });
  $("fl").innerHTML = LV.map(([l, v]) => `<button class="g-chip" data-v="${v}" aria-pressed="${v === level}">${l}</button>`).join("");
  $("fl").querySelectorAll("button").forEach((b) => b.addEventListener("click", () => { level = +b.dataset.v; ctx.store.set("zone210_lab_foodlvl", level); $("fl").querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b))); newRound(); }));
  newRound();
}

/* ---------------- Animal groups ---------------- */
const ANIMALS = [
  ["Dog", "🐕", "Mammal", 1], ["Cow", "🐄", "Mammal", 1], ["Elephant", "🐘", "Mammal", 1], ["Lion", "🦁", "Mammal", 1], ["Monkey", "🐒", "Mammal", 1], ["Rabbit", "🐇", "Mammal", 1], ["Dolphin", "🐬", "Mammal", 2], ["Whale", "🐋", "Mammal", 2], ["Bat", "🦇", "Mammal", 3],
  ["Eagle", "🦅", "Bird", 1], ["Parrot", "🦜", "Bird", 1], ["Owl", "🦉", "Bird", 1], ["Chicken", "🐔", "Bird", 1], ["Duck", "🦆", "Bird", 1], ["Penguin", "🐧", "Bird", 2], ["Flamingo", "🦩", "Bird", 2],
  ["Snake", "🐍", "Reptile", 1], ["Crocodile", "🐊", "Reptile", 1], ["Turtle", "🐢", "Reptile", 1], ["Lizard", "🦎", "Reptile", 1],
  ["Frog", "🐸", "Amphibian", 1],
  ["Goldfish", "🐠", "Fish", 1], ["Fish", "🐟", "Fish", 1], ["Shark", "🦈", "Fish", 2], ["Pufferfish", "🐡", "Fish", 2],
  ["Bee", "🐝", "Insect", 1], ["Butterfly", "🦋", "Insect", 1], ["Ant", "🐜", "Insect", 1], ["Ladybird", "🐞", "Insect", 1], ["Beetle", "🪲", "Insect", 2],
  ["Spider", "🕷️", "Arachnid", 3], ["Scorpion", "🦂", "Arachnid", 3], ["Crab", "🦀", "Crustacean", 3], ["Lobster", "🦞", "Crustacean", 3], ["Octopus", "🐙", "Mollusc", 3], ["Snail", "🐌", "Mollusc", 3],
];
const CLUE = { Mammal: "Mammals are warm-blooded, have hair or fur and feed their babies milk.", Bird: "Birds have feathers, wings and lay eggs.", Reptile: "Reptiles are cold-blooded with dry, scaly skin.", Amphibian: "Amphibians live part of their life in water and part on land, with moist skin.", Fish: "Fish live in water and breathe through gills.", Insect: "Insects have six legs and three body parts.", Arachnid: "Arachnids have eight legs and two body parts.", Crustacean: "Crustaceans have a hard shell and many legs, and mostly live in water.", Mollusc: "Molluscs have soft bodies, often with a shell." };

export function mountClassify(root, ctx) {
  let level = ctx.store.get("zone210_lab_animlvl", 1);
  root.innerHTML = `<div class="g-panel"><div class="chips-row" id="cl"></div><div id="cq"></div></div>`;
  const $ = (id) => root.querySelector("#" + id);
  let handle = null;
  function questions() {
    const groups = [...new Set(ANIMALS.filter((a) => a[3] <= level).map((a) => a[2]))];
    return shuffle(ANIMALS.filter((a) => a[3] <= level)).slice(0, 12).map((a) => ({ tag: "Animal groups", big: a[1], q: `What kind of animal is a ${a[0].toLowerCase()}?`, opts: [a[2], ...shuffle(groups.filter((g) => g !== a[2])).slice(0, 3)], a: 0, why: CLUE[a[2]] }));
  }
  const LV = [[1, "Kids"], [2, "Everyone"], [3, "Expert"]];
  function start() {
    const panel = root.firstChild; panel.hidden = true;
    handle = playMCQ(root, ctx, { make: questions, title: "🦁 Animal groups", bestKey: `animals_${level}` }, () => { panel.hidden = false; });
  }
  $("cl").innerHTML = `<span class="lbl" style="align-self:center">Level</span>` + LV.map(([v, l]) => `<button class="g-chip" data-v="${v}" aria-pressed="${v === level}">${l}</button>`).join("") + `<button class="g-btn" id="cGo">Start</button>`;
  $("cl").querySelectorAll(".g-chip").forEach((b) => b.addEventListener("click", () => { level = +b.dataset.v; ctx.store.set("zone210_lab_animlvl", level); $("cl").querySelectorAll(".g-chip").forEach((x) => x.setAttribute("aria-pressed", String(x === b))); }));
  $("cGo").addEventListener("click", start);
  $("cq").innerHTML = `<p class="sumtext">Sort animals into their groups: mammals, birds, reptiles, amphibians, fish and insects. Higher levels add tricky ones like dolphins, bats, spiders and octopuses. Every answer explains what makes each group special.</p><div class="orglist">${Object.keys(CLUE).map((g) => `<span class="g-chip" title="${esc(CLUE[g])}">${g}</span>`).join("")}</div>`;
  return () => handle && handle.cancel();
}
