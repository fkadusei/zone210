const shuffle = (a) => a.map((v) => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map((x) => x[1]);

// [level 1-3, reactants, products, coefficients in order, name]
const REACTIONS = [
  [1, ["H2", "O2"], ["H2O"], [2, 1, 2], "Making water"],
  [1, ["Na", "Cl2"], ["NaCl"], [2, 1, 2], "Making table salt"],
  [1, ["Mg", "O2"], ["MgO"], [2, 1, 2], "Magnesium burning"],
  [1, ["N2", "O2"], ["NO"], [1, 1, 2], "Nitrogen monoxide"],
  [1, ["CaCO3"], ["CaO", "CO2"], [1, 1, 1], "Heating limestone"],
  [1, ["H2", "Cl2"], ["HCl"], [1, 1, 2], "Hydrogen chloride"],
  [2, ["N2", "H2"], ["NH3"], [1, 3, 2], "Making ammonia"],
  [2, ["CH4", "O2"], ["CO2", "H2O"], [1, 2, 1, 2], "Burning methane"],
  [2, ["Al", "O2"], ["Al2O3"], [4, 3, 2], "Aluminium oxide"],
  [2, ["Fe", "O2"], ["Fe2O3"], [4, 3, 2], "Rusting iron"],
  [2, ["H2O2"], ["H2O", "O2"], [2, 2, 1], "Hydrogen peroxide breaking down"],
  [2, ["Zn", "HCl"], ["ZnCl2", "H2"], [1, 2, 1, 1], "Zinc in acid"],
  [2, ["Na", "H2O"], ["NaOH", "H2"], [2, 2, 2, 1], "Sodium in water"],
  [3, ["C3H8", "O2"], ["CO2", "H2O"], [1, 5, 3, 4], "Burning propane"],
  [3, ["C6H12O6", "O2"], ["CO2", "H2O"], [1, 6, 6, 6], "Respiration"],
  [3, ["CO2", "H2O"], ["C6H12O6", "O2"], [6, 6, 1, 6], "Photosynthesis"],
  [3, ["C2H6", "O2"], ["CO2", "H2O"], [2, 7, 4, 6], "Burning ethane"],
  [3, ["Fe2O3", "CO"], ["Fe", "CO2"], [1, 3, 2, 3], "Extracting iron"],
  [3, ["KClO3"], ["KCl", "O2"], [2, 2, 3], "Oxygen from potassium chlorate"],
  [3, ["C4H10", "O2"], ["CO2", "H2O"], [2, 13, 8, 10], "Burning butane"],
];

const parse = (f) => { const c = {}; for (const [, el, n] of f.matchAll(/([A-Z][a-z]?)(\d*)/g)) c[el] = (c[el] || 0) + (n ? +n : 1); return c; };
const html = (f) => f.replace(/(\d+)/g, "<sub>$1</sub>");

export function mountBalance(root, ctx) {
  let level = ctx.store.get("zone210_lab_ballvl", 1), deck = [], idx = 0, co = [], score = 0, hints = 0, tries = 0, solved = false, done = 0;
  root.innerHTML = `<div class="g-panel dnaq"><div class="chips-row" id="bl" style="justify-content:center"></div>
    <p class="hint" id="bInfo"></p><div class="eq" id="bEq"></div><div class="counts" id="bCnt"></div><p class="hint" id="bMsg"></p>
    <div class="row" style="justify-content:center"><button class="g-btn ghost" id="bHint">💡 Hint (-15)</button><button class="g-btn" id="bNext" hidden>Next equation →</button></div></div>`;
  const $ = (id) => root.querySelector("#" + id);
  const LV = [[1, "Kids"], [2, "Everyone"], [3, "Expert"]];
  function round() { deck = shuffle(REACTIONS.filter((r) => r[0] === level)).slice(0, 5); idx = 0; score = 0; done = 0; load(); }
  function load() {
    const r = deck[idx]; co = r[1].concat(r[2]).map(() => 1); hints = 0; tries = 0; solved = false;
    $("bInfo").innerHTML = `<b>${r[4]}</b> · equation ${idx + 1} of ${deck.length}. Atoms can't appear or disappear, so both sides need the same number of each atom. Change the big numbers (coefficients) until every count matches.`;
    $("bNext").hidden = true; $("bHint").hidden = false; draw(); $("bMsg").textContent = `Round score ${score}`;
  }
  function tally() {
    const r = deck[idx], L = {}, R = {};
    r[1].forEach((f, i) => { for (const [e, n] of Object.entries(parse(f))) L[e] = (L[e] || 0) + n * co[i]; });
    r[2].forEach((f, i) => { for (const [e, n] of Object.entries(parse(f))) R[e] = (R[e] || 0) + n * co[r[1].length + i]; });
    return { L, R };
  }
  function draw() {
    const r = deck[idx], nL = r[1].length;
    const mol = (f, i) => `<span class="mol"><span class="f">${html(f)}</span><span class="step"><button data-i="${i}" data-d="-1" aria-label="Decrease ${f}" ${solved ? "disabled" : ""}>−</button><b class="co">${co[i]}</b><button data-i="${i}" data-d="1" aria-label="Increase ${f}" ${solved ? "disabled" : ""}>+</button></span></span>`;
    $("bEq").innerHTML = r[1].map((f, i) => mol(f, i)).join('<span>+</span>') + '<span>→</span>' + r[2].map((f, i) => mol(f, nL + i)).join('<span>+</span>');
    $("bEq").querySelectorAll("button").forEach((b) => b.addEventListener("click", () => { co[+b.dataset.i] = Math.max(1, Math.min(20, co[+b.dataset.i] + +b.dataset.d)); ctx.sfx.pop(); draw(); check(); }));
    const { L, R } = tally(), els = [...new Set([...Object.keys(L), ...Object.keys(R)])];
    $("bCnt").innerHTML = els.map((e) => `<div class="${(L[e] || 0) === (R[e] || 0) ? "ok" : "no"}">${e}<br>${L[e] || 0} = ${R[e] || 0}${(L[e] || 0) === (R[e] || 0) ? " ✓" : ""}</div>`).join("");
  }
  const gcd = (a, b) => (b ? gcd(b, a % b) : a);
  function check() {
    const { L, R } = tally(), r = deck[idx];
    const balanced = Object.keys({ ...L, ...R }).every((e) => (L[e] || 0) === (R[e] || 0));
    if (!balanced || solved) return;
    const simplest = co.reduce(gcd) === 1;
    if (!simplest) { $("bMsg").textContent = "Balanced, but can you use smaller whole numbers? Divide every number by the same amount."; return; }
    solved = true; done += 1;
    const pts = Math.max(20, 100 - hints * 15); score += pts;
    $("bMsg").textContent = `✅ Balanced! +${pts} · round score ${score}`;
    ctx.sfx.right(); draw();
    $("bHint").hidden = true; $("bNext").hidden = false; $("bNext").textContent = idx >= deck.length - 1 ? "See my score →" : "Next equation →"; $("bNext").focus({ preventScroll: true });
  }
  $("bHint").addEventListener("click", () => {
    if (solved) return; const r = deck[idx];
    const wrong = co.map((c, i) => (c !== r[3][i] ? i : -1)).filter((i) => i >= 0);
    if (!wrong.length) return; const i = wrong[0]; co[i] = r[3][i]; hints += 1; ctx.sfx.pick(); draw(); check();
  });
  $("bNext").addEventListener("click", () => {
    if (idx >= deck.length - 1) {
      const best = ctx.store.get("zone210_lab_best", {}), k = "balance_" + level, rec = score > (best[k] || 0);
      if (rec) { best[k] = score; ctx.store.set("zone210_lab_best", best); }
      ctx.showEnd({ emoji: score >= 450 ? "🏆" : "🎉", title: rec ? "New best!" : "Round complete", text: `${score} points across ${deck.length} equations${rec ? "" : ` · best ${best[k]}`}`, again: round, close: round });
    } else { idx += 1; load(); }
  });
  $("bl").innerHTML = `<span class="lbl" style="align-self:center">Level</span>` + LV.map(([v, l]) => `<button class="g-chip" data-v="${v}" aria-pressed="${v === level}">${l}</button>`).join("");
  $("bl").querySelectorAll("button").forEach((b) => b.addEventListener("click", () => { level = +b.dataset.v; ctx.store.set("zone210_lab_ballvl", level); $("bl").querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b))); round(); }));
  round();
}
