#!/usr/bin/env node
/**
 * Makes the ABC & 123 voice clips with Microsoft Azure neural voices. Every letter name is given as its exact
 * sound (IPA phonemes), so the voice cannot guess "I" for "A".
 *
 *   node tools/abc-audio/azure_generate.mjs --samples              listening samples in several voices
 *   node tools/abc-audio/azure_generate.mjs --voice en-US-AvaNeural all 91 clips in one voice, into the game
 *   options: --rate -8%   speaking speed (default -8%, a little slower than normal)
 *
 * It asks for your Speech resource key (typing is hidden) and region, unless AZURE_SPEECH_KEY and
 * AZURE_SPEECH_REGION are set. The key is only sent to Microsoft; it is never printed or saved.
 * Needs Node 18+ and macOS (afconvert makes the small .m4a files).
 */
import fs from "fs";
import os from "os";
import path from "path";
import readline from "readline";
import { execFileSync } from "child_process";
import { fileURLToPath } from "url";
import { CLIPS, LETTERS } from "../../public/games/abc-123/data.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i < 0 ? d : args[i + 1]; };
const RATE = opt("--rate", "-8%");

// the exact sound of each letter name (American English)
const IPA = { A: "eɪ", B: "biː", C: "siː", D: "diː", E: "iː", F: "ɛf", G: "dʒiː", H: "eɪtʃ", I: "aɪ", J: "dʒeɪ", K: "keɪ", L: "ɛl", M: "ɛm",
  N: "ɛn", O: "oʊ", P: "piː", Q: "kjuː", R: "ɑːɹ", S: "ɛs", T: "tiː", U: "juː", V: "viː", W: "ˈdʌbəl juː", X: "ɛks", Y: "waɪ", Z: "ziː" };
const esc = (t) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const letter = (L) => `<phoneme alphabet="ipa" ph="${IPA[L]}">${L}</phoneme>`;
// the words of each clip, with letters as exact sounds
function words(key) {
  const x = LETTERS.find((l) => key.slice(2) === l.L.toLowerCase());
  if (key.startsWith("l/")) return `${letter(x.L)}.`;
  if (key.startsWith("w/")) return `${letter(x.L)} is for ${esc(x.word)}.`;
  if (key === "p/abc") return `Let's say the ${letter("A")} <break time="150ms"/> ${letter("B")} <break time="150ms"/> ${letter("C")}!`;
  return esc(CLIPS[key]);
}
const ssml = (voice, inner) => `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US"><voice name="${voice}"><prosody rate="${RATE}">${inner}</prosody></voice></speak>`;

function ask(q, hidden) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (hidden) rl._writeToOutput = (s) => { if (s.includes(q)) rl.output.write(s); };
    rl.question(q, (a) => { rl.close(); if (hidden) process.stdout.write("\n"); resolve(a.trim()); });
  });
}
const KEY = process.env.AZURE_SPEECH_KEY || (await ask("Azure Speech key (hidden): ", true));
const REGION = process.env.AZURE_SPEECH_REGION || (await ask("Azure region (for example eastus): ", false));
if (!KEY || !/^[a-z0-9]+$/.test(REGION)) { console.error("Need a key and a region like eastus."); process.exit(1); }

async function speak(body) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const r = await fetch(`https://${REGION}.tts.speech.microsoft.com/cognitiveservices/v1`, {
      method: "POST",
      headers: { "Ocp-Apim-Subscription-Key": KEY, "Content-Type": "application/ssml+xml", "X-Microsoft-OutputFormat": "riff-24khz-16bit-mono-pcm", "User-Agent": "zone210-abc123" },
      body,
    });
    if (r.status === 429) { await new Promise((ok) => setTimeout(ok, 1500 * (attempt + 1))); continue; }
    if (!r.ok) throw new Error(`Azure said ${r.status} ${r.statusText}${r.status === 401 ? " (check the key and region)" : ""}`);
    return Buffer.from(await r.arrayBuffer());
  }
  throw new Error("Azure kept saying it is busy (429); try again in a minute.");
}
// cut the silence before and after (keep 50 ms before, 200 ms after), then make a small .m4a
function saveClip(wav, dst, padAfter = 0.2) {
  const dataAt = wav.indexOf("data") + 8;
  const pcm = new Int16Array(wav.buffer.slice(wav.byteOffset + dataAt, wav.byteOffset + wav.length - ((wav.length - dataAt) % 2)));
  let peak = 0; for (const v of pcm) peak = Math.max(peak, Math.abs(v));
  const th = peak * 0.03;
  let a = 0, b = pcm.length - 1;
  while (a < pcm.length && Math.abs(pcm[a]) < th) a += 1;
  while (b > a && Math.abs(pcm[b]) < th) b -= 1;
  const cut = pcm.slice(Math.max(0, a - 1200), Math.min(pcm.length, b + Math.round(24000 * padAfter)));
  const head = Buffer.alloc(44);
  head.write("RIFF", 0); head.writeUInt32LE(36 + cut.length * 2, 4); head.write("WAVEfmt ", 8); head.writeUInt32LE(16, 16);
  head.writeUInt16LE(1, 20); head.writeUInt16LE(1, 22); head.writeUInt32LE(24000, 24); head.writeUInt32LE(48000, 28); head.writeUInt16LE(2, 32); head.writeUInt16LE(16, 34);
  head.write("data", 36); head.writeUInt32LE(cut.length * 2, 40);
  const tmp = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "abc-")), "c.wav");
  fs.writeFileSync(tmp, Buffer.concat([head, Buffer.from(cut.buffer)]));
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  execFileSync("afconvert", ["-f", "m4af", "-d", "aac", "-b", "40000", "-c", "1", tmp, dst]);
  fs.rmSync(path.dirname(tmp), { recursive: true, force: true });
  return cut.length / 24000;
}

if (args.includes("--samples")) {
  // the same lines as the other samples, in a few calm voices (two are children's voices)
  const VOICES = ["en-US-AvaNeural", "en-US-JennyNeural", "en-US-EmmaNeural", "en-US-AnaNeural", "en-GB-SoniaNeural", "en-GB-MaisieNeural"];
  const keys = ["l/a", "l/g", "l/h", "l/i", "l/r", "l/w", "l/y", "l/z", "n/7", "n/11", "n/13", "n/20", "w/a", "w/i", "w/g", "p/find-letter", "p/how-many"];
  const out = path.join(here, "..", "voice-samples", "audio");
  const made = [];
  for (const v of VOICES) {
    const inner = keys.map((k) => `${words(k)}<break time="700ms"/>`).join(" ");
    try {
      const secs = saveClip(await speak(ssml(v, inner)), path.join(out, `azure-${v}.m4a`), 0.4);
      made.push(v); console.log(`${v}: ${secs.toFixed(1)} s`);
    } catch (e) { console.log(`${v}: skipped (${e.message})`); }
  }
  const page = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Azure voice samples</title>
<style>:root{--bg:#0f1220;--fg:#eef;--card:#1a1f35}@media (prefers-color-scheme: light){:root{--bg:#f6f7fb;--fg:#1d2033;--card:#fff}}body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.5 system-ui,sans-serif;padding:16px}main{max-width:720px;margin:0 auto}.s{background:var(--card);border-radius:14px;padding:14px 16px;margin:12px 0}audio{width:100%}</style></head>
<body><main><h1>Azure voice samples</h1><p>Each says: A, G, H, I, R, W, Y, Z · seven, eleven, thirteen, twenty · A is for apple · I is for ice cream · G is for giraffe · Find the letter · How many can you count?</p>
${made.map((v, i) => `<div class="s"><b>${i + 1}. ${v.replace("Neural", "").replace(/^en-(US|GB)-/, (m, c) => (c === "GB" ? "British: " : "American: "))}${/Ana|Maisie/.test(v) ? " (child's voice)" : ""}</b><audio controls preload="none" src="audio/azure-${v}.m4a"></audio></div>`).join("\n")}
</main></body></html>`;
  fs.writeFileSync(path.join(here, "..", "voice-samples", "azure.html"), page);
  console.log("\nSamples are ready: tools/voice-samples/azure.html");
  process.exit(0);
}

const VOICE = opt("--voice", "");
if (!/^[a-z]{2}-[A-Z]{2}-\w+Neural$/.test(VOICE)) { console.error("Use --samples, or --voice en-US-AvaNeural (a voice name)."); process.exit(1); }
const folder = "az_" + VOICE.replace(/^[a-z]{2}-[A-Z]{2}-/, "").replace("Neural", "").toLowerCase();
const audio = path.join(here, "..", "..", "public", "games", "abc-123", "audio");
const keys = Object.keys(CLIPS);
let n = 0;
for (const k of keys) {
  const secs = saveClip(await speak(ssml(VOICE, words(k))), path.join(audio, folder, k + ".m4a"));
  n += 1;
  process.stdout.write(`\r${n}/${keys.length} ${k.padEnd(16)} ${secs.toFixed(2)} s   `);
}
fs.writeFileSync(path.join(audio, "index.json"), JSON.stringify({ [folder]: keys.slice().sort() }));
fs.writeFileSync(path.join(audio, "manifest.json"), JSON.stringify({ [folder]: { voice: VOICE, rate: RATE, made: new Date().toISOString().slice(0, 10) } }, null, 0));
console.log(`\nDone: ${keys.length} clips in public/games/abc-123/audio/${folder}/`);
