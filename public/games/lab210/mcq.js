/**
 * A small multiple-choice engine shared by the chemistry challenges and the lab quiz.
 * question: { q, big?, opts: [4 strings], a: index of the right one, why?, clues?: [strings], tag? }
 * options: { title, questions, speedSeconds?, bestKey, ctx }
 * Returns { cancel(), done } where `done` resolves with { score, correct, total, missed, record, best },
 * or with null if the round was cancelled.
 */
export function runMCQ(root, options) {
  const { ctx, questions, speedSeconds = 0, bestKey } = options;
  const { sfx, store } = ctx;
  let i = 0;
  let score = 0;
  let streak = 0;
  let correct = 0;
  let locked = false;
  let cluesShown = 1;
  let timer = null;
  let endAt = 0;
  let cancelled = false;
  const missed = [];
  const shuffleOpts = (q) => {
    const idx = q.opts.map((_, k) => k).sort(() => Math.random() - 0.5);
    return { opts: idx.map((k) => q.opts[k]), a: idx.indexOf(q.a) };
  };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

  root.innerHTML = `<div class="qbox">
    <div class="qhead"><span>${esc(options.title || "")}</span><span class="pills"><span class="pill" id="mqN"></span><span class="pill" id="mqS">0</span></span></div>
    ${speedSeconds ? '<div class="qbar"><i id="mqBar"></i></div>' : ""}
    <div id="mqBody"></div>
  </div>`;
  const body = root.querySelector("#mqBody");

  const handle = { cancel() {}, done: null };
  handle.cancel = () => {
    cancelled = true;
    clearInterval(timer);
  };
  handle.done = new Promise((resolve) => {
    const finish = () => {
      clearInterval(timer);
      if (cancelled) return resolve(null);
      const bests = store.get("zone210_lab_best", {});
      const record = !!bestKey && score > (bests[bestKey] || 0);
      if (record) {
        bests[bestKey] = score;
        store.set("zone210_lab_best", bests);
      }
      return resolve({ score, correct, total: Math.min(i, questions.length), missed, record, best: bestKey ? bests[bestKey] || 0 : 0 });
    };
    const show = () => {
      if (cancelled) return;
      if (i >= questions.length) return finish();
      const q = questions[i];
      q._s = shuffleOpts(q);
      locked = false;
      cluesShown = 1;
      root.querySelector("#mqN").textContent = speedSeconds ? `#${i + 1}` : `${i + 1}/${questions.length}`;
      root.querySelector("#mqS").textContent = score;
      body.innerHTML = `
        ${q.tag ? `<div class="lbl">${esc(q.tag)}</div>` : ""}
        ${q.big ? `<div class="qbig">${esc(q.big)}</div>` : ""}
        ${q.q ? `<div class="qtext">${esc(q.q)}</div>` : ""}
        ${q.clues ? `<ul class="clues" id="mqClues"></ul><div class="row"><button class="g-btn ghost sm" id="mqClue">Another clue (-20)</button></div>` : ""}
        <div class="choices">${q._s.opts.map((o, k) => `<button class="choice" data-k="${k}">${esc(o)}</button>`).join("")}</div>
        <div class="explain" id="mqWhy"></div>
        <div class="row"><button class="g-btn" id="mqNext" hidden>Next →</button></div>`;
      if (q.clues) {
        const list = body.querySelector("#mqClues");
        const add = () => {
          const li = document.createElement("li");
          li.className = "new";
          li.textContent = q.clues[cluesShown - 1];
          list.appendChild(li);
          if (cluesShown >= q.clues.length) body.querySelector("#mqClue").hidden = true;
        };
        add();
        body.querySelector("#mqClue").addEventListener("click", () => {
          if (locked || cluesShown >= q.clues.length) return;
          cluesShown += 1;
          add();
          sfx.pick();
        });
      }
      body.querySelectorAll(".choice").forEach((b) => b.addEventListener("click", () => answer(Number(b.dataset.k), b)));
      body.querySelector("#mqNext").addEventListener("click", () => {
        i += 1;
        show();
      });
    };
    const answer = (k, btn) => {
      if (locked || cancelled) return;
      locked = true;
      const q = questions[i];
      const right = k === q._s.a;
      body.querySelectorAll(".choice").forEach((b) => {
        b.disabled = true;
        if (Number(b.dataset.k) === q._s.a) b.classList.add("right");
      });
      if (!right) btn.classList.add("wrong");
      const clueCost = q.clues ? (cluesShown - 1) * 20 : 0;
      if (right) {
        streak += 1;
        const pts = Math.max(20, 100 - clueCost) + Math.min(50, (streak - 1) * 10);
        score += pts;
        correct += 1;
        sfx.right();
        body.querySelector("#mqWhy").textContent = `✅ Correct! +${pts}${q.why ? ` · ${q.why}` : ""}`;
      } else {
        streak = 0;
        missed.push(q);
        sfx.wrong();
        body.querySelector("#mqWhy").textContent = `❌ The answer is ${q.opts[q.a]}.${q.why ? ` ${q.why}` : ""}`;
      }
      root.querySelector("#mqS").textContent = score;
      if (speedSeconds) {
        setTimeout(() => {
          if (cancelled) return;
          i += 1;
          show();
        }, right ? 350 : 900);
      } else {
        const next = body.querySelector("#mqNext");
        next.hidden = false;
        next.textContent = i >= questions.length - 1 ? "See my score →" : "Next →";
        next.focus({ preventScroll: true });
      }
    };
    if (speedSeconds) {
      endAt = performance.now() + speedSeconds * 1000;
      timer = setInterval(() => {
        const left = endAt - performance.now();
        const bar = root.querySelector("#mqBar");
        if (bar) bar.style.transform = `scaleX(${Math.max(0, left / (speedSeconds * 1000))})`;
        if (left <= 0) finish();
      }, 100);
    }
    show();
  });
  return handle;
}

/**
 * Runs a round in its own panel and shows the shared end overlay.
 * opts: { questions | make(), title, bestKey, speedSeconds }. `back()` is called when the player closes the overlay.
 * Returns { cancel() }.
 */
export function playMCQ(root, ctx, opts, back) {
  const handle = { run: null, holder: null, cancel() { this.run && this.run.cancel(); } };
  const go = () => {
    const holder = document.createElement("div");
    holder.className = "g-panel";
    root.appendChild(holder);
    handle.holder = holder;
    const questions = opts.make ? opts.make() : opts.questions;
    handle.run = runMCQ(holder, { ctx, ...opts, questions });
    handle.run.done.then((r) => {
      if (!r) return;
      const pct = r.total ? Math.round((r.correct / r.total) * 100) : 0;
      const short = (q) => `${(q.q || q.big || "").length > 60 ? (q.q || q.big).slice(0, 57) + "…" : q.q || q.big} → ${q.opts[q.a]}`;
      ctx.showEnd({
        emoji: pct >= 90 ? "🏆" : pct >= 60 ? "🎉" : "💪",
        title: r.record ? "New best!" : `${r.correct} of ${r.total} right`,
        text: `${r.score} points · ${pct}% correct${r.record || !r.best ? "" : ` · best ${r.best}`}`,
        missed: r.missed.map(short),
        again: () => { holder.remove(); go(); },
        close: () => { holder.remove(); back && back(); },
      });
    });
  };
  go();
  return handle;
}
