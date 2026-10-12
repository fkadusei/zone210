/**
 * Background music for Draw & Animate, made in the browser (Web Audio): twenty-four short original tunes that loop,
 * sixteen in film styles and eight others. Nothing is downloaded and nothing is copied from a real film.
 *
 * A tune is a few tracks. Each track is a line of steps, bars separated by "|":
 *   "."            rest
 *   "C4"           a note (letter, optional # or b, octave)        "C4:3" lasts three steps
 *   "C4+E4+G4"     notes together (a chord)
 *   drums:         k kick, s snare, h hi-hat, c clap, w woodblock, together as in "kh"
 * `div` is steps per beat (2 = eighth notes, 3 = triplets, 4 = sixteenths) and `bpb` beats per bar. `swing` (0 to 0.5)
 * makes every second step late, for a jazz lilt.
 * tools/check-draw-animate.mjs checks every bar has the right number of steps and every note can be read.
 */
const rep = (bar, n) => Array(n).fill(bar).join(" | ");
const x = (unit, n) => Array(n).fill(unit).join(" "); // the same few steps several times within one bar
const R8 = ". . . . . . . .", R16 = `${R8} ${R8}`;
const hold = (chord, steps) => `${chord}:${steps} ${Array(steps - 1).fill(".").join(" ")}`;

export const TUNES = [
  { id: "adventure", group: "Movie music", name: "Adventure", emoji: "🗺️", bpm: 116, bpb: 4, div: 2, tracks: [
    { inst: "brass", vol: 0.5, steps: "C4 . E4 G4 C5:2 . G4 . | A4:2 . F4 A4 G4:3 . . . | F4 . A4 C5 D5:2 . B4 . | C5:4 . . . G4 . G4 . | C5 . E5 D5 C5:2 . G4 . | A4:2 . C5 A4 G4:3 . . . | F4 G4 A4 B4 C5:2 . D5 . | C5:6 . . . . . . ." },
    { inst: "strings", vol: 0.3, steps: [hold("C3+E3+G3", 8), hold("F3+A3+C4", 8), `${hold("F3+A3+C4", 4)} ${hold("G3+B3+D4", 4)}`, hold("C3+E3+G3", 8), hold("C3+E3+G3", 8), hold("F3+A3+C4", 8), `${hold("F3+A3+C4", 4)} ${hold("G3+B3+D4", 4)}`, hold("C3+E3+G3", 8)].join(" | ") },
    { inst: "bass", vol: 0.3, steps: ["C2 . G2 . C2 . G2 .", "F2 . C3 . F2 . C3 .", "F2 . C3 . G2 . D3 .", "C2 . G2 . C2 . G2 .", "C2 . G2 . C2 . G2 .", "F2 . C3 . F2 . C3 .", "F2 . C3 . G2 . D3 .", "C2 . G2 . C2 . . ."].join(" | ") },
    { inst: "drums", vol: 0.5, steps: rep("kh . s . k . s s", 8) },
  ] },
  { id: "spooky", group: "Movie music", name: "Spooky", emoji: "👻", bpm: 76, bpb: 4, div: 2, tracks: [
    { inst: "theremin", vol: 0.48, steps: "A4:3 . . C5 B4:3 . . G#4 | A4:4 . . . E4:3 . . . | F4:3 . . A4 G#4:3 . . E4 | A4:6 . . . . . . ." },
    { inst: "organ", vol: 0.3, steps: [hold("A2+E3", 8), hold("A2+E3", 8), hold("F2+C3", 8), hold("A2+E3", 8)].join(" | ") },
    { inst: "bell", vol: 0.25, steps: `${R8} | . . . . E6 . . . | ${R8} | . . D#6 E6 . . . .` },
    { inst: "pluck", vol: 0.3, steps: `${R8} | ${R8} | . . . . . . D#3+A3 . | ${R8}` },
    { inst: "drums", vol: 0.3, steps: rep("w . . . w . . .", 4) },
  ] },
  { id: "silent", group: "Movie music", name: "Silent movie", emoji: "🎹", bpm: 172, bpb: 4, div: 2, tracks: [
    { inst: "piano", vol: 0.56, steps: "E5 G5 . E5 C6 . G5 . | E5 G5 . E5 C6:2 . . . | D5 G5 . D5 B5 . G5 . | F5 G5 . D5 B5:2 . . . | E5 G5 . E5 C6 . G5 . | F5 A5 . F5 C6 . A5 . | B5 A5 G5 F5 D5 F5 B4 D5 | C5:2 . E5 G5 C6:2 . . ." },
    { inst: "piano", vol: 0.34, steps: [rep("C3 C4+E4+G4 G2 C4+E4+G4 C3 C4+E4+G4 G2 C4+E4+G4", 2), rep("G2 B3+D4+F4 D3 B3+D4+F4 G2 B3+D4+F4 D3 B3+D4+F4", 2), "C3 C4+E4+G4 G2 C4+E4+G4 C3 C4+E4+G4 G2 C4+E4+G4", "F2 A3+C4+F4 C3 A3+C4+F4 F2 A3+C4+F4 C3 A3+C4+F4", "G2 B3+D4+F4 D3 B3+D4+F4 G2 B3+D4+F4 D3 B3+D4+F4", "C3 C4+E4+G4 G2 C4+E4+G4 C3:2 . . ."].join(" | ") },
  ] },
  { id: "space", group: "Movie music", name: "Space", emoji: "🚀", bpm: 72, bpb: 4, div: 4, tracks: [
    { inst: "bell", vol: 0.36, steps: [rep("D4 A4 C#5 F#5 A5 F#5 C#5 A4", 2).replace(" | ", " "), rep("D4 G#4 B4 E5 G#5 E5 B4 G#4", 2).replace(" | ", " "), rep("B3 F#4 A4 D5 F#5 D5 A4 F#4", 2).replace(" | ", " "), rep("G3 D4 F#4 B4 D5 B4 F#4 D4", 2).replace(" | ", " ")].join(" | ") },
    { inst: "strings", vol: 0.24, steps: [hold("D3+A3+F#4", 16), hold("D3+B3+E4+G#4", 16), hold("B2+F#3+D4", 16), hold("G2+D3+B3", 16)].join(" | ") },
    { inst: "theremin", vol: 0.32, steps: [`${hold("F#5", 8)} ${hold("A5", 8)}`, `${hold("G#5", 12)} . . . .`, `${hold("F#5", 8)} ${hold("D5", 8)}`, `${hold("B4", 12)} . . . .`].join(" | ") },
    { inst: "bass", vol: 0.16, steps: [hold("D2", 16), hold("D2", 16), hold("B1", 16), hold("G1", 16)].join(" | ") },
  ] },
  { id: "western", group: "Movie music", name: "Western", emoji: "🤠", bpm: 104, bpb: 4, div: 4, tracks: [
    { inst: "whistle", vol: 0.5, steps: "A4:4 . . . C5:2 . E5:2 . A5:6 . . . . . G5:2 . | E5:8 . . . . . . . . . . . C5:2 . D5:2 . | D5:4 . . . B4:2 . D5:2 . G5:6 . . . . . E5:2 . | E5:10 . . . . . . . . . . . . . . . | F5:4 . . . A5:2 . F5:2 . C5:6 . . . . . A4:2 . | B4:4 . . . D5:2 . G5:2 . D5:6 . . . . . B4:2 . | C5:4 . . . B4:2 . A4:2 . E5:6 . . . . . C5:2 . | A4:12 . . . . . . . . . . . . . . ." },
    { inst: "bass", vol: 0.2, steps: [rep(rep("A2 . A2 A2", 4).replace(/ \| /g, " "), 2), rep("G2 . G2 G2", 4).replace(/ \| /g, " "), rep("A2 . A2 A2", 4).replace(/ \| /g, " "), rep("F2 . F2 F2", 4).replace(/ \| /g, " "), rep("G2 . G2 G2", 4).replace(/ \| /g, " "), rep(rep("A2 . A2 A2", 4).replace(/ \| /g, " "), 2)].join(" | ") },
    { inst: "pluck", vol: 0.32, steps: [rep(". . . . A3+C4+E4 . . . . . . . A3+C4+E4 . . .", 2), ". . . . G3+B3+D4 . . . . . . . G3+B3+D4 . . .", ". . . . A3+C4+E4 . . . . . . . A3+C4+E4 . . .", ". . . . F3+A3+C4 . . . . . . . F3+A3+C4 . . .", ". . . . G3+B3+D4 . . . . . . . G3+B3+D4 . . .", rep(". . . . A3+C4+E4 . . . . . . . A3+C4+E4 . . .", 2)].join(" | ") },
    { inst: "drums", vol: 0.32, steps: rep(rep("w . w w", 4).replace(/ \| /g, " "), 8) },
  ] },
  { id: "chase", group: "Movie music", name: "Chase", emoji: "🏃", bpm: 168, bpb: 4, div: 2, tracks: [
    { inst: "marimba", vol: 0.5, steps: "C5 E5 G5 E5 C5 E5 G5 C6 | C6 G5 E5 G5 C6 G5 E5 C5 | F5 A5 C6 A5 F5 A5 C6 F6 | D6 B5 G5 B5 D6 B5 G5 F5 | E5 G5 C6 G5 E5 G5 C6 E6 | C6 A5 E5 A5 C6 A5 E5 C5 | D5 F5 A5 F5 G5 B5 D6 B5 | C6 . G5 . C5:2 . . ." },
    { inst: "bass", vol: 0.3, steps: [rep("C3 . G2 . C3 . G2 .", 2), "F2 . C3 . F2 . C3 .", "G2 . D3 . G2 . D3 .", "C3 . G2 . C3 . G2 .", "A2 . E3 . A2 . E3 .", "D3 . A2 . G2 . D3 .", "C3 . G2 . C3 . . ."].join(" | ") },
    { inst: "drums", vol: 0.45, steps: rep("kh h sh h kh h sh h", 8) },
  ] },
  { id: "fairytale", group: "Movie music", name: "Fairy tale", emoji: "✨", bpm: 132, bpb: 3, div: 2, tracks: [
    { inst: "bell", vol: 0.6, steps: "F5:2 . A5:2 . C6:2 . | C6:4 . . . A5:2 . | G5:2 . Bb5:2 . E5:2 . | F5:6 . . . . . | D5:2 . F5:2 . Bb5:2 . | A5:4 . . . F5:2 . | G5:2 . E5:2 . C5:2 . | F5:6 . . . . ." },
    { inst: "pluck", vol: 0.5, steps: [rep("F2 . A3+C4 . A3+C4 .", 2), "C3 . G3+Bb3+E4 . G3+Bb3+E4 .", "F2 . A3+C4 . A3+C4 .", "Bb2 . Bb3+D4 . Bb3+D4 .", "F2 . A3+C4 . A3+C4 .", "C3 . G3+Bb3+E4 . G3+Bb3+E4 .", "F2 . A3+C4 . A3+C4 ."].join(" | ") },
    { inst: "strings", vol: 0.18, steps: [rep(hold("F3+A3+C4", 6), 2), hold("C3+E3+Bb3", 6), hold("F3+A3+C4", 6), hold("Bb2+D3+F3", 6), hold("F3+A3+C4", 6), hold("C3+E3+Bb3", 6), hold("F3+A3+C4", 6)].join(" | ") },
  ] },
  { id: "mystery", group: "Movie music", name: "Mystery", emoji: "🕵️", bpm: 92, bpb: 4, div: 2, tracks: [
    { inst: "pluck", vol: 0.85, steps: "D3 . F3 . A3 . G#3 . | A3 . F3 . D3 . . . | D3 . F3 . A3 . C4 . | Bb3 . A3 . D3 . . ." },
    { inst: "marimba", vol: 0.52, steps: `${R8} | . . . . . . D5 F5 | ${R8} | . . . . . . A4 D5` },
    { inst: "organ", vol: 0.3, steps: `${R8} | ${R8} | ${R8} | . . . . . D4+F4+A4+C#5:3 . .` },
    { inst: "drums", vol: 0.5, steps: rep(". . c . . . c .", 4) },
  ] },
  { id: "pirate", group: "Movie music", name: "Pirate", emoji: "🏴‍☠️", bpm: 104, bpb: 2, div: 3, tracks: [
    { inst: "organ", vol: 0.5, steps: "D5 . F5 A5 . F5 | D5 . E5 F5:3 . . | E5 . G5 C5 . E5 | D5:5 . . . . A4 | F5 . A5 C6 . A5 | G5 . E5 C5:3 . . | D5 . F5 E5 . C#5 | D5:6 . . . . ." },
    { inst: "pluck", vol: 0.34, steps: [rep(". . D4+F4+A4 . . D4+F4+A4", 2), ". . C4+E4+G4 . . C4+E4+G4", ". . D4+F4+A4 . . D4+F4+A4", ". . C4+F4+A4 . . C4+F4+A4", ". . C4+E4+G4 . . C4+E4+G4", ". . D4+F4+A4 . . A3+C#4+E4", ". . D4+F4+A4 . . ."].join(" | ") },
    { inst: "bass", vol: 0.3, steps: [rep("D2 . . A2 . .", 2), "C3 . . G2 . .", "D2 . . A2 . .", "F2 . . C3 . .", "C3 . . G2 . .", "D3 . . A2 . .", "D2 . . . . ."].join(" | ") },
    { inst: "drums", vol: 0.4, steps: rep("k . h s . h", 8) },
  ] },
  { id: "superhero", group: "Movie music", name: "Superhero", emoji: "🦸", bpm: 132, bpb: 4, div: 2, tracks: [
    { inst: "brass", vol: 0.52, steps: "G4 . C5 . . G4 C5 E5 | G5:4 . . . E5:2 . C5 . | F5 . D5 . . Bb4 D5 F5 | A5:4 . . . F5:2 . C5 . | G4 . C5 . . G4 C5 E5 | G5:3 . . E5 G5:2 . C6 . | C6:2 . Ab5 . Eb5:2 . Ab5 . | Bb5:2 . D6:2 . C6:4 . . ." },
    { inst: "strings", vol: 0.3, steps: [rep(hold("C3+E3+G3", 8), 2), hold("Bb2+D3+F3", 8), hold("F3+A3+C4", 8), rep(hold("C3+E3+G3", 8), 2), hold("Ab2+C3+Eb3", 8), `${hold("Bb2+D3+F3", 4)} ${hold("C3+E3+G3", 4)}`].join(" | ") },
    { inst: "bass", vol: 0.26, steps: [rep(x("C2", 8), 2), x("Bb2", 8), x("F2", 8), rep(x("C2", 8), 2), x("Ab2", 8), `${x("Bb2", 4)} ${x("C3", 4)}`].join(" | ") },
    { inst: "drums", vol: 0.45, steps: rep("k h s h k k s h", 8) },
  ] },
  { id: "jungle", group: "Movie music", name: "Jungle", emoji: "🌴", bpm: 108, bpb: 4, div: 4, tracks: [
    { inst: "marimba", vol: 0.55, steps: "A4 . C5 . D5 . E5 . . . E5 . D5 . C5 . | A4 . . . G4 . A4 . . . . . . . . . | A4 . C5 . D5 . E5 . . . G5 . E5 . D5 . | C5 . . . A4 . . . . . . . E4 . G4 ." },
    { inst: "whistle", vol: 0.4, steps: `${R16} | ${R8} E5:2 . G5:2 . A5:4 . . . | ${R16} | ${R8} A5:2 . G5:2 . E5:4 . . .` },
    { inst: "bass", vol: 0.3, steps: rep("A2 . . . . . A2 . . . E2 . . . G2 .", 4) },
    { inst: "drums", vol: 0.42, steps: rep("k . w w k . w . k w . w k . w w", 4) },
  ] },
  { id: "underwater", group: "Movie music", name: "Underwater", emoji: "🐠", bpm: 96, bpb: 3, div: 2, tracks: [
    { inst: "bell", vol: 0.34, steps: "A4 C5 E5 A5 E5 C5 | F4 A4 C5 F5 C5 A4 | G4 C5 E5 G5 E5 C5 | G4 B4 D5 G5 D5 B4 | A4 C5 E5 A5 E5 C5 | F4 A4 C5 F5 C5 A4 | F4 A4 D5 F5 D5 A4 | E4 G#4 B4 E5 B4 G#4" },
    { inst: "theremin", vol: 0.36, steps: [hold("E5", 6), "F5:4 . . . A5:2 .", hold("G5", 6), "D5:4 . . . B4:2 .", hold("C5", 6), "A4:4 . . . C5:2 .", "D5:4 . . . F5:2 .", hold("E5", 6)].join(" | ") },
    { inst: "strings", vol: 0.26, steps: [hold("A2+E3+C4", 6), hold("F2+C3+A3", 6), hold("C3+G3+E4", 6), hold("G2+D3+B3", 6), hold("A2+E3+C4", 6), hold("F2+C3+A3", 6), hold("D3+A3+F4", 6), hold("E3+B3+G#4", 6)].join(" | ") },
  ] },
  { id: "circus", group: "Movie music", name: "Circus", emoji: "🎪", bpm: 126, bpb: 4, div: 2, tracks: [
    { inst: "organ", vol: 0.5, steps: "E5 D#5 E5 G5 C6 . G5 . | E5 D#5 E5 G5 C6:2 . . . | D5 C#5 D5 F5 B5 . G5 . | D5 C#5 D5 F5 B5:2 . . . | E5 D#5 E5 G5 C6 . E6 . | D6 C6 A5 F5 A5 . C6 . | B5 A5 G5 F5 D5 F5 B4 D5 | C5 . G5 . C6:2 . . ." },
    { inst: "pluck", vol: 0.34, steps: [rep("C3 . C4+E4+G4 . G2 . C4+E4+G4 .", 2), rep("G2 . B3+D4+F4 . D3 . B3+D4+F4 .", 2), "C3 . C4+E4+G4 . G2 . C4+E4+G4 .", "F2 . A3+C4+F4 . C3 . A3+C4+F4 .", "G2 . B3+D4+F4 . D3 . B3+D4+F4 .", "C3 . C4+E4+G4 . C3 . . ."].join(" | ") },
    { inst: "drums", vol: 0.42, steps: rep("k . s . k . s h", 8) },
  ] },
  { id: "monster", group: "Movie music", name: "Monster stomp", emoji: "🦖", bpm: 72, bpb: 4, div: 2, tracks: [
    { inst: "brass", vol: 0.6, steps: "E3:2 . . . G3:2 . . . | F#3:2 . . . E3:3 . . . | E3:2 . . . Bb3:2 . . . | A3:2 . G3 . E3:4 . . ." },
    { inst: "strings", vol: 0.24, steps: [rep(hold("E5+G5", 8), 2), hold("E5+Bb5", 8), hold("E5+G5", 8)].join(" | ") },
    { inst: "bass", vol: 0.3, steps: rep("E2 . . . E2 . . .", 4) },
    { inst: "drums", vol: 0.55, steps: rep("k . . . k . s .", 4) },
  ] },
  { id: "magic", group: "Movie music", name: "Magic", emoji: "🪄", bpm: 100, bpb: 4, div: 4, tracks: [
    { inst: "bell", vol: 0.32, steps: [x("C5 E5 G5 B5 D6 B5 G5 E5", 2), x("D5 F#5 A5 D6 F#6 D6 A5 F#5", 2), x("A4 C5 E5 A5 C6 A5 E5 C5", 2), "G4 C5 D5 G5 C6 G5 D5 C5 G4 B4 D5 G5 B5 G5 D5 B4"].join(" | ") },
    { inst: "whistle", vol: 0.34, steps: [`${hold("G5", 8)} ${hold("B5", 8)}`, `${hold("A5", 12)} . . . .`, `${hold("E5", 8)} ${hold("C6", 8)}`, `${hold("D6", 12)} . . . .`].join(" | ") },
    { inst: "strings", vol: 0.26, steps: [hold("C3+G3+E4", 16), hold("D3+A3+F#4", 16), hold("A2+E3+C4", 16), hold("G2+D3+B3", 16)].join(" | ") },
  ] },
  { id: "sad", group: "Movie music", name: "Sad moment", emoji: "🌧️", bpm: 66, bpb: 4, div: 2, tracks: [
    { inst: "piano", vol: 0.44, steps: "A3 E4 A4 C5 E5 C5 A4 E4 | F3 C4 F4 A4 C5 A4 F4 C4 | C3 G3 C4 E4 G4 E4 C4 G3 | G3 D4 G4 B4 D5 B4 G4 D4" },
    { inst: "strings", vol: 0.4, steps: "E5:6 . . . . . D5:2 . | C5:8 . . . . . . . | E5:6 . . . . . G5:2 . | D5:8 . . . . . . ." },
    { inst: "strings", vol: 0.22, steps: [hold("A2+E3+C4", 8), hold("F2+C3+A3", 8), hold("C3+G3+E4", 8), hold("G2+D3+B3", 8)].join(" | ") },
  ] },
  { id: "happy", group: "More music", name: "Happy day", emoji: "🌞", bpm: 118, bpb: 4, div: 2, tracks: [
    { inst: "marimba", vol: 0.56, steps: "B4 D5 G5 . D5 . B4 . | D5:2 . B4 . G4:2 . . . | C5 E5 G5 . E5 . C5 . | A4:2 . F#4 A4 D5:2 . . . | B4 D5 G5 . B5 . G5 . | E5:2 . G5 . B4:2 . . . | C5 E5 G5 E5 D5 F#5 A5 F#5 | G5:4 . . . . . . ." },
    { inst: "pluck", vol: 0.3, steps: [rep(". G3+B3+D4 . G3+B3+D4 . G3+B3+D4 . G3+B3+D4", 2), ". C4+E4+G4 . C4+E4+G4 . C4+E4+G4 . C4+E4+G4", ". D4+F#4+A4 . D4+F#4+A4 . D4+F#4+A4 . D4+F#4+A4", ". G3+B3+D4 . G3+B3+D4 . G3+B3+D4 . G3+B3+D4", ". E4+G4+B4 . E4+G4+B4 . E4+G4+B4 . E4+G4+B4", ". C4+E4+G4 . C4+E4+G4 . D4+F#4+A4 . D4+F#4+A4", ". G3+B3+D4 . G3+B3+D4 . G3+B3+D4 . ."].join(" | ") },
    { inst: "bass", vol: 0.32, steps: [rep("G2 . . . D3 . . .", 2), "C3 . . . G2 . . .", "D3 . . . A2 . . .", "G2 . . . D3 . . .", "E2 . . . B2 . . .", "C3 . . . D3 . . .", "G2 . . . G2 . . ."].join(" | ") },
    { inst: "drums", vol: 0.4, steps: rep("k . c . k . c .", 8) },
  ] },
  { id: "dance", group: "More music", name: "Dance", emoji: "🪩", bpm: 122, bpb: 4, div: 4, tracks: [
    { inst: "square", vol: 0.3, steps: "E5:2 . . . A5:2 . G5:2 . E5:4 . . . . . . . | F5:2 . . . A5:2 . G5:2 . F5:4 . . . . . . . | E5:2 . . . G5:2 . C6:2 . G5:4 . . . . . . . | D5:2 . . . G5:2 . B5:2 . D6:4 . . . . . . ." },
    { inst: "pluck", vol: 0.3, steps: [". . . A3+C4+E4 . . A3+C4+E4 . . . . A3+C4+E4 . . A3+C4+E4 .", ". . . A3+C4+F4 . . A3+C4+F4 . . . . A3+C4+F4 . . A3+C4+F4 .", ". . . G3+C4+E4 . . G3+C4+E4 . . . . G3+C4+E4 . . G3+C4+E4 .", ". . . G3+B3+D4 . . G3+B3+D4 . . . . G3+B3+D4 . . G3+B3+D4 ."].join(" | ") },
    { inst: "bass", vol: 0.26, steps: [rep("A2 . A3 .", 4), rep("F2 . F3 .", 4), rep("C3 . C4 .", 4), rep("G2 . G3 .", 4)].map((b) => b.replace(/ \| /g, " ")).join(" | ") },
    { inst: "drums", vol: 0.4, steps: rep("k . h . kc . h . k . h . kc . h .", 4) },
  ] },
  { id: "lullaby", group: "More music", name: "Lullaby", emoji: "🌙", bpm: 80, bpb: 4, div: 2, tracks: [
    { inst: "bell", vol: 0.6, steps: "E5:2 . G5:2 . E5:2 . C5:2 . | F5:2 . A5:2 . F5:4 . . . | D5:2 . G5:2 . B4:2 . D5:2 . | C5:6 . . . . . . ." },
    { inst: "strings", vol: 0.3, steps: [hold("C3+G3+E4", 8), hold("F3+C4+A4", 8), hold("G3+D4+B4", 8), hold("C3+G3+E4", 8)].join(" | ") },
    { inst: "pluck", vol: 0.36, steps: "C3 . G3 . E4 . G3 . | F3 . C4 . A4 . C4 . | G3 . D4 . B4 . D4 . | C3 . G3 . E4 . . ." },
  ] },
  { id: "robot", group: "More music", name: "Robot", emoji: "🤖", bpm: 140, bpb: 4, div: 4, tracks: [
    { inst: "square", vol: 0.42, steps: "E5:2 . G5:2 . C6:4 . . . G5:2 . E5:2 . . . . . | E5:2 . A5:2 . C6:4 . . . A5:2 . E5:2 . . . . . | F5:2 . A5:2 . C6:4 . . . A5:2 . F5:2 . . . . . | G5:2 . B5:2 . D6:4 . . . B5:2 . G5:2 . D5:2 . . ." },
    { inst: "square", vol: 0.2, steps: [rep("C4 E4 G4 C5", 4), rep("A3 C4 E4 A4", 4), rep("F3 A3 C4 F4", 4), rep("G3 B3 D4 G4", 4)].map((b) => b.replace(/ \| /g, " ")).join(" | ") },
    { inst: "bass", vol: 0.2, steps: [rep("C2 . C2 .", 4), rep("A2 . A2 .", 4), rep("F2 . F2 .", 4), rep("G2 . G2 .", 4)].map((b) => b.replace(/ \| /g, " ")).join(" | ") },
    { inst: "drums", vol: 0.34, steps: rep("k . h . s . h . k k h . s . h .", 4) },
  ] },
  { id: "rock", group: "More music", name: "Rock", emoji: "🎸", bpm: 138, bpb: 4, div: 2, tracks: [
    { inst: "square", vol: 0.4, steps: "E5:2 . G5 E5 . D5 E5 . | G5:2 . A5 G5 . E5:2 . . | A5:2 . C6 A5 . G5 A5 . | G5 E5 D5 E5:4 . . . ." },
    { inst: "brass", vol: 0.44, steps: [rep("E3+B3 . E3+B3 E3+B3 . E3+B3 G3+D4 A3+E4", 2), "A3+E4 . A3+E4 A3+E4 . A3+E4 C4+G4 D4+A4", "E3+B3 . E3+B3 E3+B3 . G3+D4 . A3+E4"].join(" | ") },
    { inst: "bass", vol: 0.18, steps: [rep(x("E2", 8), 2), x("A2", 8), "E2 E2 E2 E2 E2 G2 G2 A2"].join(" | ") },
    { inst: "drums", vol: 0.48, steps: rep("kh h sh h kh kh sh h", 4) },
  ] },
  { id: "jazz", group: "More music", name: "Jazz", emoji: "🎷", bpm: 132, bpb: 4, div: 2, swing: 0.3, tracks: [
    { inst: "bell", vol: 0.42, steps: "A4 . D5 F5 . E5 . D5 | B4 . . D5 F5:2 . . . | E5 . G5 B5 . A5 . G5 | E5:3 . . C#5 E5:2 . . ." },
    { inst: "piano", vol: 0.3, steps: ". . . F3+A3+C4+E4 . . . F3+A3+C4+E4 | . . . F3+A3+B3+D4 . . . F3+A3+B3+D4 | . . . E3+G3+B3+D4 . . . E3+G3+B3+D4 | . . . G3+B3+C#4+E4 . . . G3+B3+C#4+E4" },
    { inst: "bass", vol: 0.34, steps: "D2 . F2 . A2 . C3 . | G2 . B2 . D3 . F3 . | C3 . E3 . G3 . A3 . | A2 . C#3 . E3 . G3 ." },
    { inst: "drums", vol: 0.34, steps: rep("kh . sh h h . sh h", 4) },
  ] },
  { id: "island", group: "More music", name: "Island", emoji: "🏝️", bpm: 112, bpb: 4, div: 4, tracks: [
    { inst: "bell", vol: 0.42, steps: "E5 . G5 . . C6 . G5 . E5 . G5 . . C5 . | F5 . A5 . . C6 . A5 . F5 . A5 . . F5 . | D5 . G5 . . B5 . G5 . D5 . G5 . . B4 . | C5 . E5 . G5 . C6 . . . G5 . C6:4 . . ." },
    { inst: "pluck", vol: 0.32, steps: [x(". . C4+E4+G4 .", 4), x(". . C4+F4+A4 .", 4), x(". . B3+D4+G4 .", 4), x(". . C4+E4+G4 .", 4)].join(" | ") },
    { inst: "bass", vol: 0.3, steps: "C3 . . . . . G2 . C3 . . . G2 . . . | F2 . . . . . C3 . F2 . . . C3 . . . | G2 . . . . . D3 . G2 . . . D3 . . . | C3 . . . . . G2 . C3 . . . . . . ." },
    { inst: "drums", vol: 0.38, steps: rep("k . h w . h k . k . h w . h w .", 4) },
  ] },
  { id: "march", group: "More music", name: "Marching band", emoji: "🥁", bpm: 120, bpb: 4, div: 2, tracks: [
    { inst: "brass", vol: 0.5, steps: "F4 . A4 C5 F5:2 . C5 . | A4 . C5 F5 A5:2 . F5 . | Bb4 . D5 F5 Bb5:2 . F5 . | A5:2 . F5 . C5:2 . . . | G4 . C5 E5 G5:2 . E5 . | F5 . A5 . C6:2 . A5 . | Bb5 A5 G5 F5 E5 G5 C6 Bb5 | A5:2 . F5 . F5:4 . . ." },
    { inst: "pluck", vol: 0.3, steps: [rep(". . A3+C4+F4 . . . A3+C4+F4 .", 2), ". . Bb3+D4+F4 . . . Bb3+D4+F4 .", ". . A3+C4+F4 . . . A3+C4+F4 .", ". . G3+C4+E4 . . . G3+C4+E4 .", ". . A3+C4+F4 . . . A3+C4+F4 .", ". . Bb3+D4+F4 . . . G3+C4+E4 .", ". . A3+C4+F4 . . . . ."].join(" | ") },
    { inst: "bass", vol: 0.3, steps: [rep("F2 . C3 . F2 . C3 .", 2), "Bb2 . F3 . Bb2 . F3 .", "F2 . C3 . F2 . C3 .", "C3 . G2 . C3 . G2 .", "F2 . C3 . F2 . C3 .", "Bb2 . F3 . C3 . G2 .", "F2 . C3 . F2 . . ."].join(" | ") },
    { inst: "drums", vol: 0.44, steps: rep("k . s s k . s s", 8) },
  ] },
];

// ---------- reading the tracks ----------
const SEMI = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
/** "C#4" as a MIDI note number, or NaN. */
export function midi(name) { const m = /^([A-G])(#|b)?(-?\d)$/.exec(name); return m ? 12 * (Number(m[3]) + 1) + SEMI[m[1]] + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0) : NaN; }
const hz = (n) => 440 * Math.pow(2, (n - 69) / 12);
/** One track's steps as a flat list: null (rest), { hits: "kh" } for drums, or { notes: [midi…], len }. Also the bars, for checking. */
export function readTrack(track) {
  const bars = track.steps.split("|").map((b) => b.trim().split(/\s+/));
  const steps = bars.flat().map((tok) => {
    if (tok === ".") return null;
    if (track.inst === "drums") return { hits: tok };
    const [what, len] = tok.split(":");
    return { notes: what.split("+").map(midi), len: len ? Number(len) : 1 };
  });
  return { bars, steps };
}

// ---------- instruments: each plays one note of pitch f (Hz) at time t for `dur` seconds, at loudness v, into `out` ----------
function env(ac, out, t, dur, v, attack, release) { const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + attack); g.gain.setValueAtTime(v, t + Math.max(attack, dur)); g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(attack, dur) + release); g.connect(out); return g; }
function decay(ac, out, t, v, len) { const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + len); g.connect(out); return g; }
function osc(ac, type, f, t, stop, to, detune = 0) { const o = ac.createOscillator(); o.type = type; o.frequency.value = f; o.detune.value = detune; o.connect(to); o.start(t); o.stop(stop); return o; }
function vibrato(ac, o, f, t, stop, depth, late = 0.15) { const l = ac.createOscillator(), g = ac.createGain(); l.frequency.value = 5.5; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(f * depth, t + late); l.connect(g).connect(o.frequency); l.start(t); l.stop(stop); }
const INST = {
  piano(ac, out, f, t, dur, v) { const len = Math.max(0.5, dur + 0.5), g = decay(ac, out, t, v, len); [[1, 1], [2, 0.3], [3, 0.12], [4.01, 0.05]].forEach(([m, a]) => { const og = ac.createGain(); og.gain.value = a; og.connect(g); osc(ac, "sine", f * m, t, t + len + 0.05, og); }); },
  brass(ac, out, f, t, dur, v) { const lp = ac.createBiquadFilter(); lp.type = "lowpass"; lp.Q.value = 1; lp.frequency.setValueAtTime(700, t); lp.frequency.linearRampToValueAtTime(2400, t + 0.07); lp.frequency.linearRampToValueAtTime(1400, t + dur + 0.1); const g = env(ac, out, t, dur * 0.92, v * 0.5, 0.04, 0.1); lp.connect(g); osc(ac, "sawtooth", f, t, t + dur + 0.2, lp, -5); osc(ac, "sawtooth", f, t, t + dur + 0.2, lp, 5); },
  strings(ac, out, f, t, dur, v) { const lp = ac.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 1500; lp.Q.value = 0.4; const g = env(ac, out, t, dur, v * 0.34, Math.min(0.25, dur * 0.3), 0.3); lp.connect(g); osc(ac, "sawtooth", f, t, t + dur + 0.4, lp, -7); osc(ac, "sawtooth", f, t, t + dur + 0.4, lp, 7); },
  organ(ac, out, f, t, dur, v) { const g = env(ac, out, t, dur, v * 0.5, 0.05, 0.15); [[1, 1], [2, 0.5], [3, 0.25], [4, 0.12]].forEach(([m, a]) => { const og = ac.createGain(); og.gain.value = a; og.connect(g); osc(ac, "sine", f * m, t, t + dur + 0.25, og); }); },
  pluck(ac, out, f, t, dur, v) { const len = Math.max(0.35, dur + 0.25), lp = ac.createBiquadFilter(); lp.type = "lowpass"; lp.Q.value = 0.6; lp.frequency.setValueAtTime(3000, t); lp.frequency.exponentialRampToValueAtTime(600, t + len * 0.8); const g = decay(ac, out, t, v * 0.8, len); lp.connect(g); osc(ac, "sawtooth", f, t, t + len + 0.05, lp); osc(ac, "triangle", f, t, t + len + 0.05, lp); },
  bass(ac, out, f, t, dur, v) { const len = Math.max(0.2, dur * 0.95), g = env(ac, out, t, len, v, 0.012, 0.08); osc(ac, "triangle", f, t, t + len + 0.12, g); const og = ac.createGain(); og.gain.value = 0.5; og.connect(g); osc(ac, "sine", f * 2, t, t + len + 0.12, og); },
  theremin(ac, out, f, t, dur, v) { const g = env(ac, out, t, dur, v * 0.6, 0.09, 0.2), o = osc(ac, "sine", f, t, t + dur + 0.3, g); vibrato(ac, o, f, t, t + dur + 0.3, 0.012); const og = ac.createGain(); og.gain.value = 0.15; og.connect(g); osc(ac, "sine", f * 2, t, t + dur + 0.3, og); },
  whistle(ac, out, f, t, dur, v) { const g = env(ac, out, t, dur * 0.9, v * 0.5, 0.05, 0.1), o = osc(ac, "sine", f, t, t + dur + 0.2, g); vibrato(ac, o, f, t, t + dur + 0.2, 0.008, 0.3); const og = ac.createGain(); og.gain.value = 0.08; og.connect(g); osc(ac, "sine", f * 3, t, t + dur + 0.2, og); },
  bell(ac, out, f, t, dur, v) { const len = Math.max(1.2, dur + 1); [[1, 1, len], [3, 0.22, len * 0.4], [4.2, 0.07, len * 0.25]].forEach(([m, a, l]) => { const g = decay(ac, out, t, v * a * 0.8, l); osc(ac, "sine", f * m, t, t + l + 0.05, g); }); },
  marimba(ac, out, f, t, dur, v) { [[1, 1, 0.6], [4, 0.25, 0.14], [10, 0.05, 0.04]].forEach(([m, a, l]) => { const g = decay(ac, out, t, v * a * 0.9, l); osc(ac, "sine", f * m, t, t + l + 0.05, g); }); },
  square(ac, out, f, t, dur, v) { const lp = ac.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 3200; const g = env(ac, out, t, Math.max(0.05, dur * 0.8), v * 0.3, 0.005, 0.03); lp.connect(g); osc(ac, "square", f, t, t + dur + 0.1, lp); },
};
let hiss = null;
function noise(ac, out, t, len, v, type, freq) {
  if (!hiss || hiss.sampleRate !== ac.sampleRate) { hiss = ac.createBuffer(1, ac.sampleRate, ac.sampleRate); const d = hiss.getChannelData(0); for (let i = 0; i < d.length; i += 1) d[i] = Math.random() * 2 - 1; }
  const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = decay(ac, out, t, v, len);
  s.buffer = hiss; f.type = type; f.frequency.value = freq; s.connect(f).connect(g); s.start(t, Math.random() * 0.5); s.stop(t + len + 0.02);
}
function drum(ac, out, hits, t, v) {
  for (const h of hits) {
    if (h === "k") { const o = ac.createOscillator(), g = decay(ac, out, t, v, 0.22); o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(48, t + 0.14); o.connect(g); o.start(t); o.stop(t + 0.25); }
    else if (h === "s") { noise(ac, out, t, 0.14, v * 0.55, "highpass", 1400); const o = ac.createOscillator(), g = decay(ac, out, t, v * 0.3, 0.09); o.type = "triangle"; o.frequency.value = 190; o.connect(g); o.start(t); o.stop(t + 0.1); }
    else if (h === "h") noise(ac, out, t, 0.045, v * 0.28, "highpass", 6500);
    else if (h === "c") { noise(ac, out, t, 0.1, v * 0.5, "bandpass", 1500); noise(ac, out, t + 0.012, 0.09, v * 0.4, "bandpass", 1700); }
    else if (h === "w") { const o = ac.createOscillator(), g = decay(ac, out, t, v * 0.7, 0.07); o.type = "sine"; o.frequency.value = 820; o.connect(g); o.start(t); o.stop(t + 0.08); const o2 = ac.createOscillator(), g2 = decay(ac, out, t, v * 0.3, 0.05); o2.frequency.value = 1240; o2.connect(g2); o2.start(t); o2.stop(t + 0.06); }
  }
}

// ---------- playing ----------
const ready = new Map(); // tune id -> its tracks read into steps
function parts(tune) { if (!ready.has(tune.id)) ready.set(tune.id, tune.tracks.map((tr) => ({ tr, steps: readTrack(tr).steps }))); return ready.get(tune.id); }
/** Schedules step number `i` of a tune at time t; returns how long one step lasts. */
function playStep(ac, out, tune, i, t) {
  const stepLen = 60 / tune.bpm / tune.div;
  if (tune.swing && i % 2) t += tune.swing * stepLen; // every second step a little late
  for (const { tr, steps } of parts(tune)) {
    const s = steps[i % steps.length];
    if (!s) continue;
    if (s.hits) drum(ac, out, s.hits, t, tr.vol);
    else s.notes.forEach((n) => INST[tr.inst](ac, out, hz(n), t, s.len * stepLen, tr.vol / Math.sqrt(s.notes.length)));
  }
  return stepLen;
}
/** Everything goes through a gentle limiter to the speakers, and also to `tap` if one is given (the video recorder). */
function chain(ac, volume, tap) { const out = ac.createGain(), comp = ac.createDynamicsCompressor(); out.gain.value = volume; comp.threshold.value = -16; comp.ratio.value = 4; out.connect(comp).connect(ac.destination); if (tap) comp.connect(tap); return out; }

let playing = null; // { id, out, timer }
export const playingTune = () => (playing ? playing.id : null);
export function playTune(id, ac, volume = 0.5, tap = null) {
  stopTune();
  const tune = TUNES.find((x) => x.id === id);
  if (!tune || !ac) return;
  const out = chain(ac, volume, tap), me = { id, out, i: 0, at: ac.currentTime + 0.12 };
  playing = me;
  me.timer = setInterval(() => { if (playing !== me) return; while (me.at < ac.currentTime + 0.5) { me.at += playStep(ac, out, tune, me.i, me.at); me.i += 1; } }, 120);
}
export function stopTune() {
  if (!playing) return;
  const { out, timer } = playing, ac = out.context, t = ac.currentTime;
  clearInterval(timer);
  out.gain.cancelScheduledValues(t); out.gain.setValueAtTime(out.gain.value, t); out.gain.linearRampToValueAtTime(0.0001, t + 0.25);
  setTimeout(() => { try { out.disconnect(); } catch (err) { /* already gone */ } }, 600);
  playing = null;
}
/** For checking loudness (tools/check-tunes.html): writes the first `seconds` of a tune into an OfflineAudioContext. */
export function renderTune(id, ac, seconds, volume = 0.5) {
  const tune = TUNES.find((x) => x.id === id), out = chain(ac, volume);
  for (let t = 0.05, i = 0; t < seconds; i += 1) t += playStep(ac, out, tune, i, t);
}
