const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

const ORGS = {
  nucleus: { name: "Nucleus", both: true, fill: "#7c5cff", text: "The control centre. It holds the cell's DNA, the instructions for building and running the cell.", fact: "Almost every human cell has one nucleus. Red blood cells lose theirs as they mature." },
  mito: { name: "Mitochondria", both: true, fill: "#e5484d", text: "The powerhouses. They turn food (glucose) and oxygen into ATP, the energy the cell uses.", fact: "Mitochondria have their own small piece of DNA, passed down from your mother." },
  er: { name: "Endoplasmic reticulum", both: true, fill: "#f59e0b", text: "A network of folded membranes that builds and moves proteins and fats around the cell.", fact: "Rough ER is dotted with ribosomes. Smooth ER has none." },
  golgi: { name: "Golgi body", both: true, fill: "#14b8a6", text: "The post office. It sorts, packages and ships proteins to where they are needed.", fact: "It is named after Camillo Golgi, who described it in 1898." },
  ribo: { name: "Ribosomes", both: true, fill: "#111827", text: "Tiny factories that read instructions and join amino acids together to make proteins.", fact: "A single cell can contain millions of ribosomes." },
  lyso: { name: "Lysosome", animal: true, fill: "#84cc16", text: "The recycling centre. It contains enzymes that break down waste and worn-out parts.", fact: "Plant cells usually break down waste in their large vacuole instead." },
  membrane: { name: "Cell membrane", both: true, fill: "#ec4899", text: "A thin, flexible skin that controls what goes into and out of the cell.", fact: "It is made of a double layer of fat molecules with proteins embedded in it." },
  wall: { name: "Cell wall", plant: true, fill: "#65a30d", text: "A stiff layer outside the membrane that gives plant cells their fixed shape and strength.", fact: "It is made mostly of cellulose. Animal cells have no cell wall." },
  chloro: { name: "Chloroplast", plant: true, fill: "#16a34a", text: "Where photosynthesis happens: it captures sunlight and turns water and carbon dioxide into sugar and oxygen.", fact: "Chloroplasts contain chlorophyll, which makes plants green." },
  vacuole: { name: "Large vacuole", plant: true, fill: "#38bdf8", text: "A big water-filled sac that stores nutrients and pushes against the wall to keep the plant firm.", fact: "A wilting plant has lost water from its vacuoles." },
  cyto: { name: "Cytoplasm", both: true, fill: "#94a3b8", text: "The jelly-like fluid filling the cell. Organelles float in it and many chemical reactions happen there.", fact: "It is mostly water." },
};

export function mountCell(root, ctx) {
  let kind = "animal", sel = "nucleus";
  root.innerHTML = `<div class="two"><div class="g-panel"><div class="g-chips" id="ck" style="margin-bottom:10px">
    <button class="g-chip" data-k="animal">🐾 Animal cell</button><button class="g-chip" data-k="plant">🌿 Plant cell</button></div>
    <svg class="cellsvg" id="csvg" viewBox="0 0 420 320" role="img" aria-label="Cell diagram"></svg>
    <div class="orglist" id="ol"></div></div>
    <div class="g-panel" id="cd"></div></div>`;
  const $ = (id) => root.querySelector("#" + id);
  const has = (k) => ORGS[k].both || ORGS[k][kind];
  function svg() {
    const p = kind === "plant";
    const cell = p
      ? `<rect x="24" y="22" width="372" height="276" rx="26" fill="#a3e63533" stroke="${ORGS.wall.fill}" stroke-width="10" class="org" data-o="wall"/><rect x="34" y="32" width="352" height="256" rx="20" fill="none" stroke="${ORGS.membrane.fill}" stroke-width="3" class="org" data-o="membrane"/>`
      : `<ellipse cx="210" cy="160" rx="192" ry="138" fill="#fbcfe833" stroke="${ORGS.membrane.fill}" stroke-width="5" class="org" data-o="membrane"/>`;
    const common = `
      <g class="org" data-o="er"><path d="M255 90c30-10 50 10 30 28s-45 5-30 28 45 10 25 30" fill="none" stroke="${ORGS.er.fill}" stroke-width="9" stroke-linecap="round"/></g>
      <g class="org" data-o="golgi"><path d="M100 220q30-14 60 0M104 232q30-14 60 0M108 244q30-14 60 0" fill="none" stroke="${ORGS.golgi.fill}" stroke-width="8" stroke-linecap="round"/></g>
      <g class="org" data-o="mito"><ellipse cx="255" cy="222" rx="30" ry="15" fill="${ORGS.mito.fill}" transform="rotate(-20 255 222)"/><path d="M238 224q8-8 12 0t12 0" fill="none" stroke="#fff8" stroke-width="2" transform="rotate(-20 255 222)"/></g>
      <g class="org" data-o="ribo">${[[190, 95], [205, 105], [150, 75], [325, 200], [335, 180], [120, 130]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4.5" fill="${ORGS.ribo.fill}"/>`).join("")}</g>
      <g class="org" data-o="nucleus"><circle cx="175" cy="150" r="42" fill="${ORGS.nucleus.fill}"/><circle cx="185" cy="145" r="13" fill="#4c3bd1"/></g>
      <text x="300" y="130">ER</text><text x="100" y="268">Golgi</text><text x="232" y="256">Mitochondrion</text><text x="148" y="208">Nucleus</text>`;
    const extra = p
      ? `<g class="org" data-o="vacuole"><ellipse cx="315" cy="140" rx="50" ry="56" fill="${ORGS.vacuole.fill}88" stroke="${ORGS.vacuole.fill}" stroke-width="3"/></g>
         <g class="org" data-o="chloro">${[[90, 90], [110, 190], [70, 150]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="22" ry="12" fill="${ORGS.chloro.fill}"/>`).join("")}</g>
         <text x="360" y="100">Vacuole</text><text x="46" y="70">Chloroplast</text>`
      : `<g class="org" data-o="lyso"><circle cx="105" cy="105" r="14" fill="${ORGS.lyso.fill}"/></g><text x="88" y="80">Lysosome</text>`;
    $("csvg").innerHTML = `<g class="org" data-o="cyto">${cell}</g>${common}${extra}`;
    $("csvg").querySelectorAll("[data-o]").forEach((n) => n.addEventListener("click", (e) => { e.stopPropagation(); pick(n.dataset.o); }));
  }
  function detail() {
    const o = ORGS[sel];
    $("cd").innerHTML = `<div class="lbl">${kind === "plant" ? "Plant" : "Animal"} cell</div><h3 style="margin:4px 0 8px;font-size:1.5rem">${esc(o.name)}</h3>
      <p class="sumtext">${esc(o.text)}</p><p class="hint"><b>Did you know?</b> ${esc(o.fact)}</p>
      <p class="hint">${o.both ? "Found in both plant and animal cells." : o.plant ? "Found in plant cells only." : "Found in animal cells only."}</p>`;
    $("csvg").querySelectorAll("[data-o]").forEach((n) => n.classList.toggle("sel", n.dataset.o === sel));
    $("ol").querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.o === sel)));
  }
  function pick(k) { if (!has(k)) k = "nucleus"; sel = k; ctx.sfx.pop(); detail(); }
  function render() {
    root.querySelectorAll("#ck button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.k === kind)));
    svg();
    $("ol").innerHTML = Object.keys(ORGS).filter(has).map((k) => `<button class="g-chip" data-o="${k}">${esc(ORGS[k].name)}</button>`).join("");
    $("ol").querySelectorAll("button").forEach((b) => b.addEventListener("click", () => pick(b.dataset.o)));
    if (!has(sel)) sel = "nucleus";
    detail();
  }
  root.querySelectorAll("#ck button").forEach((b) => b.addEventListener("click", () => { kind = b.dataset.k; ctx.sfx.pick(); render(); }));
  render();
}

export function mountDNA(root, ctx) {
  const LV = { kids: { n: 4, label: "Kids · 4 bases", rna: false }, all: { n: 8, label: "Everyone · 8 bases", rna: false }, expert: { n: 10, label: "Expert · make RNA", rna: true } };
  const PAIR = { A: "T", T: "A", C: "G", G: "C" };
  const RNA = { A: "U", T: "A", C: "G", G: "C" };
  let level = ctx.store.get("zone210_lab_dnalevel", "all"), round = 0, strand = [], idx = 0, score = 0, mistakes = 0, t0 = 0, done = false;
  if (!LV[level]) level = "all";
  root.innerHTML = `<div class="g-panel dnaq"><div class="g-chips" id="dl" style="justify-content:center"></div>
    <p class="hint" id="dInfo"></p><div class="strand" id="dTop"></div><div class="strand" id="dBot"></div>
    <div class="pad" id="dPad"></div><p class="hint" id="dMsg"></p><div class="row" style="justify-content:center"><button class="g-btn" id="dNext" hidden>Next strand →</button></div></div>`;
  const $ = (id) => root.querySelector("#" + id);
  function start() {
    const L = LV[level]; round += 1; idx = 0; done = false; mistakes = 0; t0 = performance.now();
    strand = Array.from({ length: L.n }, () => "ATCG"[Math.floor(Math.random() * 4)]);
    $("dInfo").textContent = L.rna
      ? "Copy this DNA strand into RNA. RNA uses U instead of T, so A→U, T→A, C→G, G→C."
      : "Match each base to its partner: A pairs with T, and C pairs with G.";
    $("dTop").innerHTML = strand.map((b) => `<div class="base b${b}">${b}</div>`).join("");
    $("dBot").innerHTML = strand.map((_, i) => `<div class="base ans ${i === 0 ? "cur" : ""}">?</div>`).join("");
    $("dPad").innerHTML = (L.rna ? "AUCG" : "ATCG").split("").map((b) => `<button class="base b${b}" data-b="${b}" aria-label="${b}">${b}</button>`).join("");
    $("dPad").querySelectorAll("button").forEach((b) => b.addEventListener("click", () => press(b.dataset.b)));
    $("dNext").hidden = true;
    $("dMsg").textContent = `Strand ${round} · score ${score}`;
  }
  function press(b) {
    if (done) return;
    const want = (LV[level].rna ? RNA : PAIR)[strand[idx]];
    const cell = $("dBot").children[idx];
    if (b === want) {
      cell.className = `base b${b} ok`; cell.textContent = b; ctx.sfx.right(); idx += 1;
      if (idx >= strand.length) {
        done = true;
        const secs = (performance.now() - t0) / 1000;
        const pts = Math.max(10, Math.round(strand.length * 20 - mistakes * 15 - secs * 2));
        score += pts;
        const best = ctx.store.get("zone210_lab_best", {}); const k = "dna_" + level;
        const rec = score > (best[k] || 0); if (rec) { best[k] = score; ctx.store.set("zone210_lab_best", best); }
        $("dMsg").textContent = `✅ Complete in ${secs.toFixed(1)}s with ${mistakes} slip${mistakes === 1 ? "" : "s"}. +${pts} · total ${score}${rec ? " · new best!" : ` · best ${best[k]}`}`;
        $("dNext").hidden = false; $("dNext").focus({ preventScroll: true }); ctx.sfx.done();
      } else $("dBot").children[idx].classList.add("cur");
    } else {
      mistakes += 1; ctx.sfx.wrong(); cell.classList.add("bad"); setTimeout(() => cell.classList.remove("bad"), 350);
      $("dMsg").textContent = "Not quite. Remember: A–T and C–G" + (LV[level].rna ? " (and in RNA, A pairs with U)" : "") + ".";
    }
  }
  const lv = $("dl");
  lv.innerHTML = Object.entries(LV).map(([k, v]) => `<button class="g-chip" data-l="${k}" aria-pressed="${k === level}">${v.label}</button>`).join("");
  lv.querySelectorAll("button").forEach((b) => b.addEventListener("click", () => { level = b.dataset.l; ctx.store.set("zone210_lab_dnalevel", level); lv.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b))); score = 0; round = 0; start(); }));
  $("dNext").addEventListener("click", start);
  start();
}
