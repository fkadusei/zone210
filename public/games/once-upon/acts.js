/**
 * Little hands-on activities inside a story page. Each one is drawn over the scene's picture and calls done()
 * when it is solved (with an option for "paint", which can lead to different pages).
 *   collect: tap every target among the other things     { type, targets: ["🫘"], n: 8, decoys: ["⚫"], m: 8 }
 *   count:   tap each thing to count it, then pick a number  { type, item: "🥣", n: 7, options: [6, 7, 8] }
 *   order:   tap things in the right order                  { type, items: [["🥣", 0.7, "small"], ...], how: "smallest first" }
 *            with path: true the things stay where they are (a trail of pebbles); without, they are shuffled
 *   pairs:   find the matching pairs                         { type, items: ["👞", "👟", ...] }
 *   taps:    tap the big button again and again             { type, n: 8, button: "💨 Huff!", actor: "🐺", target: "🛖", effect: "blow" }
 *   paint:   draw with a finger, then say what it is        { type, options: [["🐦", "A bird", "sceneId"], ...] }
 */
const rnd = (n) => Math.floor(Math.random() * n);
const shuffle = (a) => { for (let i = a.length - 1; i > 0; i -= 1) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
// spots for things scattered over the picture that do not sit on top of each other
function spots(n) {
  const cols = Math.ceil(Math.sqrt(n * 1.8)), rows = Math.ceil(n / cols);
  const cells = shuffle(Array.from({ length: cols * rows }, (_, i) => i)).slice(0, n);
  return cells.map((c) => ({ x: ((c % cols) + 0.5 + (Math.random() - 0.5) * 0.5) * (100 / cols), y: (Math.floor(c / cols) + 0.5 + (Math.random() - 0.5) * 0.4) * (100 / rows) }));
}

export function runAct(host, act, { done, sfx, say }) {
  host.innerHTML = "";
  host.className = `act act-${act.type}`;
  const status = document.createElement("p");
  status.className = "act-status";
  status.setAttribute("role", "status");
  const board = document.createElement("div");
  board.className = "act-board";
  host.append(board, status);
  const setStatus = (t) => { status.textContent = t; };
  const finish = (to) => { host.classList.add("solved"); sfx.win(); setTimeout(() => done(to), 900); };
  const btn = (label, cls = "") => { const b = document.createElement("button"); b.type = "button"; b.className = `ab ${cls}`; b.innerHTML = label; return b; };

  if (act.type === "collect") {
    const targets = act.targets, decoys = act.decoys || [];
    const list = shuffle([...Array.from({ length: act.n }, (_, i) => ({ e: targets[i % targets.length], t: true })), ...Array.from({ length: act.m || 0 }, (_, i) => ({ e: decoys[i % decoys.length], t: false }))]);
    const at = spots(list.length);
    let got = 0;
    setStatus(`Found ${got} of ${act.n}`);
    list.forEach((it, i) => {
      const b = btn(it.e, "loose");
      b.style.left = `${at[i].x}%`; b.style.top = `${at[i].y}%`;
      b.setAttribute("aria-label", it.t ? act.label || "This one" : act.decoyLabel || "Something else");
      if (act.wobble && it.t) b.classList.add("wob"); // the jars with thieves inside wobble
      b.addEventListener("click", () => {
        if (b.classList.contains("got")) return;
        if (!it.t) { b.classList.remove("nope"); void b.offsetWidth; b.classList.add("nope"); sfx.no(); return; }
        b.classList.add("got"); b.disabled = true; got += 1; sfx.yes(got);
        setStatus(`Found ${got} of ${act.n}`);
        if (got === act.n) finish();
      });
      board.appendChild(b);
    });
  } else if (act.type === "count") {
    const at = spots(act.n);
    let counted = 0;
    const row = document.createElement("div");
    row.className = "act-answers";
    setStatus("Tap each one to count it.");
    for (let i = 0; i < act.n; i += 1) {
      const b = btn(act.item, "loose");
      b.style.left = `${at[i].x}%`; b.style.top = `${at[i].y}%`;
      b.setAttribute("aria-label", `${act.label || "Thing"} to count`);
      b.addEventListener("click", () => {
        if (b.dataset.n) return;
        counted += 1; b.dataset.n = counted; b.classList.add("got"); b.insertAdjacentHTML("beforeend", `<b class="num">${counted}</b>`);
        sfx.yes(counted); say(`n/${counted}`);
        if (counted === act.n) { setStatus("How many are there?"); row.hidden = false; }
      });
      board.appendChild(b);
    }
    row.hidden = true;
    act.options.forEach((v) => {
      const b = btn(String(v), "num-ans");
      b.addEventListener("click", () => { if (v === act.n) { b.classList.add("right"); finish(); } else { b.classList.add("wrong"); b.disabled = true; sfx.no(); } });
      row.appendChild(b);
    });
    host.appendChild(row);
  } else if (act.type === "order") {
    const items = act.items.map((it, i) => ({ e: it[0], s: it[1] || 1, label: it[2] || "", i, x: it[3], y: it[4] }));
    const shown = act.path ? items : shuffle([...items]);
    const at = act.path ? null : spots(shown.length);
    let next = 0;
    setStatus(act.how ? `Tap them ${act.how}.` : "Tap them in order.");
    shown.forEach((it, k) => {
      const b = btn(it.e, "loose");
      b.style.left = `${act.path ? it.x : at[k].x}%`; b.style.top = `${act.path ? it.y : at[k].y}%`;
      b.style.setProperty("--sz", it.s);
      if (act.path && it.i === 0) b.classList.add("hintme");
      b.setAttribute("aria-label", it.label || `Item ${k + 1}`);
      b.addEventListener("click", () => {
        if (b.classList.contains("got")) return;
        if (it.i !== next) { b.classList.remove("nope"); void b.offsetWidth; b.classList.add("nope"); sfx.no(); return; }
        next += 1; b.classList.add("got"); b.classList.remove("hintme"); b.insertAdjacentHTML("beforeend", `<b class="num">${next}</b>`); sfx.yes(next);
        if (act.path) { const nb = [...board.children][items.findIndex((x) => x.i === next)]; if (nb) nb.classList.add("hintme"); }
        if (next === items.length) finish(); else setStatus(`${next} done, ${items.length - next} to go.`);
      });
      board.appendChild(b);
    });
  } else if (act.type === "pairs") {
    const deck = shuffle([...act.items, ...act.items]);
    let open = [], left = act.items.length, lock = false;
    board.classList.add("cards");
    setStatus("Find the matching pairs.");
    deck.forEach((e) => {
      const b = btn(`<span class="face">${e}</span><span class="back">?</span>`, "card");
      b.setAttribute("aria-label", "Hidden card");
      b.addEventListener("click", () => {
        if (lock || b.classList.contains("up")) return;
        b.classList.add("up"); b.setAttribute("aria-label", e); open.push([b, e]); sfx.tap();
        if (open.length < 2) return;
        const [[b1, e1], [b2, e2]] = open; open = [];
        if (e1 === e2) { b1.classList.add("got"); b2.classList.add("got"); left -= 1; sfx.yes(act.items.length - left); setStatus(left ? `${left} pairs to go.` : "All matched!"); if (!left) finish(); }
        else { lock = true; setTimeout(() => { b1.classList.remove("up"); b2.classList.remove("up"); b1.setAttribute("aria-label", "Hidden card"); b2.setAttribute("aria-label", "Hidden card"); lock = false; }, 800); }
      });
      board.appendChild(b);
    });
  } else if (act.type === "taps") {
    let n = 0;
    board.innerHTML = `<span class="tap-actor" aria-hidden="true">${act.actor || ""}</span><span class="tap-target" aria-hidden="true">${act.target || ""}</span><div class="tap-bar" aria-hidden="true"><i></i></div>`;
    const target = board.querySelector(".tap-target"), bar = board.querySelector(".tap-bar i");
    const b = btn(act.button || "Tap!", "tap-btn");
    setStatus(`Tap ${act.n} times!`);
    b.addEventListener("click", () => {
      if (n >= act.n) return;
      n += 1; sfx.yes(n);
      bar.style.width = `${(n / act.n) * 100}%`;
      target.classList.remove("hit"); void target.offsetWidth; target.classList.add("hit");
      if (act.effect === "climb") board.style.setProperty("--climb", n / act.n);
      if (act.effect === "run") board.style.setProperty("--run", n / act.n);
      setStatus(n < act.n ? `${act.n - n} more!` : "You did it!");
      if (n === act.n) { target.classList.add(`end-${act.effect || "pop"}`); b.disabled = true; finish(); }
    });
    host.appendChild(b);
  } else if (act.type === "paint") {
    const cv = document.createElement("canvas");
    cv.className = "paint";
    cv.setAttribute("aria-label", "Painting canvas: draw with your finger");
    board.appendChild(cv);
    const fit = () => { const r = board.getBoundingClientRect(); cv.width = Math.round(r.width * 2); cv.height = Math.round(r.height * 2); };
    fit();
    const c = cv.getContext("2d");
    c.lineCap = "round"; c.lineJoin = "round"; c.lineWidth = 10; c.strokeStyle = "#1b1b2f";
    let down = false, last = null, ink = 0;
    const pt = (e) => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * (cv.width / r.width), y: (e.clientY - r.top) * (cv.height / r.height) }; };
    cv.addEventListener("pointerdown", (e) => { down = true; last = pt(e); try { cv.setPointerCapture(e.pointerId); } catch (err) { /* synthetic */ } });
    cv.addEventListener("pointermove", (e) => { if (!down) return; const p = pt(e); c.beginPath(); c.moveTo(last.x, last.y); c.lineTo(p.x, p.y); c.stroke(); ink += Math.hypot(p.x - last.x, p.y - last.y); last = p; if (ink > 300 && row.hidden) { row.hidden = false; setStatus("Lovely! What did you paint?"); } });
    const up = () => { down = false; };
    cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", up);
    const row = document.createElement("div");
    row.className = "act-answers";
    row.hidden = true;
    setStatus("Paint something with your finger.");
    act.options.forEach(([e, label, to]) => {
      const b = btn(`${e} ${label}`, "paint-ans");
      b.addEventListener("click", () => {
        board.insertAdjacentHTML("beforeend", `<span class="alive" aria-hidden="true">${e}</span>`);
        row.querySelectorAll("button").forEach((x) => { x.disabled = true; });
        finish(to);
      });
      row.appendChild(b);
    });
    const skipDraw = btn("I'd rather choose", "ghosty");
    skipDraw.addEventListener("click", () => { row.hidden = false; skipDraw.remove(); setStatus("What would you like to paint?"); });
    host.append(row, skipDraw);
  }
  // every activity can be skipped, so nobody gets stuck
  const skip = btn("Skip this activity", "skip");
  skip.addEventListener("click", () => done(act.type === "paint" ? act.options[0][2] : undefined));
  host.appendChild(skip);
}
