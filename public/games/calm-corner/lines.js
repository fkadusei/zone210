/** Everything Calm Corner says out loud, so the recorded voices (tools/calm-audio) and the page use the same words. */
export const FEELINGS = [
  ["😊", "Happy", "That's lovely! Who could you share your happy feeling with?", "sounds"],
  ["😌", "Calm", "Calm is a great feeling. Enjoy it for a moment: take one slow breath and smile.", "sounds"],
  ["🤩", "Excited", "Excitement is full of energy! If it feels too big, try a few balloon breaths to settle.", "breathe"],
  ["😢", "Sad", "It's okay to feel sad. You could talk to someone you trust, have a hug, or do something gentle.", "breathe"],
  ["😠", "Angry", "It's okay to feel angry. Try squeezing your hands tight, then letting go, and take five slow breaths.", "breathe"],
  ["😟", "Worried", "Worries can feel heavy. Try the 5-4-3-2-1 senses game to bring your mind back to right now.", "senses"],
  ["😨", "Scared", "Being scared is your body trying to keep you safe. Find a grown-up you trust, and breathe slowly together.", "breathe"],
  ["😤", "Frustrated", "When something is hard, take a break. Breathe, have a drink of water, then try again.", "breathe"],
  ["😴", "Tired", "Your body might need rest. Try sleepy breathing, or listen to some calm sounds.", "sounds"],
  ["🥺", "Lonely", "Feeling lonely is hard. Who could you call, play with, or sit next to today?", "senses"],
];
export const KIND = ["You are braver than you think.", "It's okay to make mistakes. That's how we learn.", "Your feelings matter.", "You can do hard things, one small step at a time.", "Take your time. There's no rush.", "You are kind, and kindness is strong.", "Every day is a fresh start.", "It's okay to ask for help.", "You are loved.", "Breathe. You're doing great."];
export const SENSES = [[5, "👀", "things you can see", "Look around slowly. Name them out loud or in your head."], [4, "✋", "things you can touch", "Your clothes, the floor, a cushion... how do they feel?"], [3, "👂", "things you can hear", "Listen carefully: near sounds and far-away sounds."], [2, "👃", "things you can smell", "If you can't smell anything, think of two smells you like."], [1, "👅", "thing you can taste", "Or think of your favourite taste."]];
// the breathing cues, and what is said when an exercise ends
export const CUES = { in: "Breathe in, slowly.", hold: "Hold it gently.", out: "And breathe out.", done: "Well done. Notice how you feel now.", senses: "All done. You brought your mind back to right now." };
export const sensesLine = ([n, , what]) => `Find ${["", "one", "two", "three", "four", "five"][n]} ${what}.`;
/** every clip: key -> words */
export function allLines() {
  const out = { "b/in": CUES.in, "b/hold": CUES.hold, "b/out": CUES.out, "b/done": CUES.done, "s/done": CUES.senses };
  FEELINGS.forEach(([, name, msg], i) => { out[`f/${i}`] = `${name}. ${msg}`; });
  KIND.forEach((k, i) => { out[`k/${i}`] = k; });
  SENSES.forEach((x, i) => { out[`s/${i}`] = sensesLine(x); });
  return out;
}
