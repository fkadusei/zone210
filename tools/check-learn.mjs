#!/usr/bin/env node
/**
 * Checks the questions of the learning games built on assets/learn-kit.js (Algebra Lab, Calculus Lab, Grammar & Words).
 *   node tools/check-learn.mjs            check everything
 *   node tools/check-learn.mjs algebra 3  also print 3 sample questions per level of one game
 * For every topic and level it makes a few hundred questions from different seeds and checks each one is well formed:
 * a prompt and an explanation, no "undefined"/"NaN" in any text, multiple choice with at least three different options
 * and a valid right answer, typed answers that the checker itself accepts, word-order answers that use exactly the
 * given words, and tap answers that point at a real word. It also checks the same seed gives the same question.
 */
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "public");
const { rng, rightInput } = await import(pathToFileURL(path.join(root, "assets/learn-core.js")).href);
const GAMES = ["algebra", "calculus", "grammar"];
const [, , only, samples] = process.argv;
const plain = (h) => String(h).replace(/<svg[\s\S]*?<\/svg>/g, "[picture]").replace(/<sup>(.*?)<\/sup>/g, "^$1").replace(/<span class="fr"><span>(.*?)<\/span><span>(.*?)<\/span><\/span>/g, "($1/$2)").replace(/<small>/g, " | ").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
const BAD = /undefined|NaN|Infinity|\[object|null/;
let problems = 0, total = 0;
const fail = (where, msg, q) => { problems += 1; if (problems <= 40) console.log(`✗ ${where}: ${msg}\n    ${plain(q.q)}${q.opts ? `\n    options: ${q.opts.map(plain).join(" | ")}` : ""}`); };

for (const game of GAMES) {
  if (only && only !== game) continue;
  let TOPICS;
  try { ({ TOPICS } = await import(pathToFileURL(path.join(root, "games", game, "topics.js")).href)); } catch (err) { if (err.code === "ERR_MODULE_NOT_FOUND" && !only) { console.log(`- ${game}: not built yet`); continue; } throw err; }
  for (const t of TOPICS) {
    t.levels.forEach((levelName, level) => {
      const where = `${game} / ${t.name} / ${level + 1} ${levelName}`, seen = new Set();
      let few = 0;
      for (let seed = 1; seed <= 400; seed += 1) {
        const q = t.make(level, rng(seed)), again = t.make(level, rng(seed));
        total += 1;
        if (JSON.stringify(q) !== JSON.stringify(again)) fail(where, "the same seed gave two different questions", q);
        if (!q || !["choice", "input", "order", "tap"].includes(q.type)) { fail(where, `unknown type ${q && q.type}`, q || { q: "" }); continue; }
        if (!q.q || !plain(q.q)) fail(where, "no prompt", q);
        if (!q.why) fail(where, "no explanation", q);
        const texts = [q.q, q.why, q.show, q.pre, q.unit, ...(q.opts || []), ...(q.words || [])].filter((x) => x !== undefined).map(plain);
        if (texts.some((x) => BAD.test(x))) fail(where, `broken text: ${texts.find((x) => BAD.test(x))}`, q);
        if (q.vis && BAD.test(q.vis.replace(/<svg[\s\S]*?<\/svg>/g, (s) => s.replace(/[^<]*</g, "<")))) fail(where, "broken picture or passage", q);
        if (q.vis && /NaN|undefined/.test(q.vis)) fail(where, "NaN in picture", q);
        if (q.type === "choice") {
          const o = q.opts.map(plain);
          if (new Set(o).size !== o.length) fail(where, "two options read the same", q);
          if (o.length < 3) fail(where, `only ${o.length} options`, q);
          if (o.length < 4) few += 1;
          if (!(q.a >= 0 && q.a < o.length)) fail(where, "right answer is not one of the options", q);
        } else if (q.type === "input") {
          if (typeof q.a === "number" ? !Number.isFinite(q.a) : !String(q.a).trim()) fail(where, `bad answer ${q.a}`, q);
          else if (!rightInput(q, String(q.a))) fail(where, `the checker rejects its own answer ${q.a}`, q);
        } else if (q.type === "order") {
          const bag = (s) => s.split(" ").sort().join(" ");
          if (q.words.length < 3) fail(where, "fewer than three words", q);
          for (const a of [q.a, ...(q.alt || [])]) if (bag(a) !== bag(q.words.join(" "))) fail(where, `answer "${a}" does not use exactly the given words`, q);
          if (q.words.some((w) => /\s/.test(w))) fail(where, "a word tile contains a space", q);
        } else if (q.type === "tap") {
          if (![].concat(q.a).every((i) => Number.isInteger(i) && i >= 0 && i < q.words.length)) fail(where, "answer points outside the sentence", q);
        }
        seen.add(plain(q.q) + (q.vis || "") + (q.words || []).join(" ") + (q.opts ? q.opts.slice().sort().join("|") : ""));
        if (only && samples && seed <= Number(samples)) console.log(`  [${t.name} ${level + 1}] ${plain(q.q)}${q.vis && !/<svg/.test(q.vis) ? `\n      passage: ${plain(q.vis).slice(0, 90)}…` : ""}${q.opts ? `\n      ${q.opts.map((o, i) => (i === q.a ? `(${plain(o)})` : plain(o))).join("  ·  ")}` : q.words ? `\n      ${q.words.join(" / ")} → ${q.type === "tap" ? [].concat(q.a).map((i) => q.words[i]).join(",") : q.a}` : `\n      = ${q.a}`}\n      why: ${plain(q.why)}`);
      }
      if (seen.size < 12) fail(where, `only ${seen.size} different questions in 400`, { q: "" });
      if (!only || !samples) console.log(`✓ ${where}: ${seen.size} different questions`);
    });
  }
}
console.log(problems ? `\n${problems} problem(s) in ${total} questions.` : `\nAll ${total} questions are well formed.`);
process.exit(problems ? 1 : 0);
