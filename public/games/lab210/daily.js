import { runMCQ } from "./mcq.js";
import { dailyQuestions } from "./quiz.js";

const KEY = "zone210_lab_daily";
const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const shift = (k, n) => { const [y, m, d] = k.split("-").map(Number); return dayKey(new Date(y, m - 1, d + n)); };

function streaks(days) {
  const keys = Object.keys(days).sort();
  let best = 0, run = 0, prev = null;
  for (const k of keys) { run = prev && shift(prev, 1) === k ? run + 1 : 1; best = Math.max(best, run); prev = k; }
  let cur = 0, k = days[dayKey()] ? dayKey() : shift(dayKey(), -1);
  while (days[k]) { cur += 1; k = shift(k, -1); }
  return { cur, best, played: keys.length };
}

export function mountDaily(root, ctx) {
  const box = document.createElement("div");
  box.className = "g-panel";
  root.appendChild(box);
  let run = null;
  function intro() {
    const st = ctx.store.get(KEY, { days: {} });
    const today = dayKey(), r = st.days[today], s = streaks(st.days);
    box.hidden = false;
    box.innerHTML = `<div class="lbl">Daily experiment</div><h3 style="margin:4px 0 6px;font-size:1.4rem">Ten questions, the same for everyone today</h3>
      <p class="sumtext">Three each from chemistry, physics and biology, going from easy to tough, plus one bonus element question. Play every day to build a streak.</p>
      <div class="dstats"><div><small>🔥 Streak</small><b>${s.cur}</b></div><div><small>Best streak</small><b>${s.best}</b></div><div><small>Days played</small><b>${s.played}</b></div></div>
      ${r ? `<p class="hint">Today's result: <b>${r.c} of 10</b> right · ${r.s} points. Come back tomorrow for a new set, or practise below (your saved score won't change).</p>` : ""}
      <div class="row"><button class="g-btn" id="dGo">${r ? "Practise today's set" : "Start today's experiment"}</button></div>`;
    box.querySelector("#dGo").addEventListener("click", () => start(!!r));
  }
  function start(practice) {
    const key = dayKey(), qs = dailyQuestions(ctx, key);
    box.hidden = true;
    const holder = document.createElement("div");
    holder.className = "g-panel";
    root.appendChild(holder);
    run = runMCQ(holder, { ctx, questions: qs, title: "📅 Daily experiment", bestKey: null });
    run.done.then((r) => {
      holder.remove();
      if (!r) return;
      const st = ctx.store.get(KEY, { days: {} });
      if (!practice) { st.days[key] = { s: r.score, c: r.correct }; ctx.store.set(KEY, st); }
      const s = streaks(st.days);
      ctx.showEnd({
        emoji: r.correct >= 9 ? "🏆" : r.correct >= 6 ? "🎉" : "💪",
        title: `${r.correct} of ${r.total} right`,
        text: practice ? `${r.score} points (practice run)` : `${r.score} points · 🔥 ${s.cur}-day streak`,
        missed: r.missed.map((q) => `${q.q.length > 60 ? q.q.slice(0, 57) + "…" : q.q} → ${q.opts[q.a]}`),
        again: intro,
        close: intro,
      });
    });
  }
  intro();
  return () => run && run.cancel();
}
