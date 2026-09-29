/** Word Guess scoring and daily-word selection. Pure logic. */

/**
 * Scores a guess against the answer. Returns an array of "correct" | "present" | "absent".
 * Duplicate letters are handled properly: a letter is only marked "present" as many times as it
 * remains unmatched in the answer.
 */
export function score(guess, answer) {
  const n = answer.length;
  const result = Array(n).fill("absent");
  const remaining = {};
  for (let i = 0; i < n; i += 1) {
    if (guess[i] === answer[i]) result[i] = "correct";
    else remaining[answer[i]] = (remaining[answer[i]] || 0) + 1;
  }
  for (let i = 0; i < n; i += 1) {
    if (result[i] === "correct") continue;
    if (remaining[guess[i]] > 0) {
      result[i] = "present";
      remaining[guess[i]] -= 1;
    }
  }
  return result;
}

/** Days since a fixed date, using the player's local calendar day. */
export function dayNumber(date = new Date()) {
  const start = new Date(2024, 0, 1);
  const today = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.round((today - start) / 86400000);
}

/** Deterministic pick for the daily puzzle: everyone gets the same word on the same day. */
export function dailyWord(answers, date = new Date()) {
  // scramble the day number so consecutive days don't step through the list in order
  let x = (dayNumber(date) + 1) * 2654435761;
  x = (x ^ (x >>> 15)) >>> 0;
  return answers[x % answers.length];
}

/** Emoji grid for sharing. */
export function shareGrid(rows) {
  const icon = { correct: "🟩", present: "🟨", absent: "⬛" };
  return rows.map((r) => r.map((s) => icon[s]).join("")).join("\n");
}

/** Best status per letter for colouring the on-screen keyboard (correct > present > absent). */
export function keyStates(guesses, scores) {
  const rank = { absent: 1, present: 2, correct: 3 };
  const out = {};
  guesses.forEach((g, gi) => {
    [...g].forEach((ch, i) => {
      const s = scores[gi][i];
      if (!out[ch] || rank[s] > rank[out[ch]]) out[ch] = s;
    });
  });
  return out;
}
