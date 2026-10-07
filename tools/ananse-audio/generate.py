"""
Makes the narration audio for Ananse Stories with the open-source Kokoro voices.

  node dump-texts.mjs > texts.json
  python generate.py texts.json ../../public/games/ananse/audio            # all voices, only what changed
  python generate.py texts.json OUTDIR --voices bf_emma --only ananse      # a few clips
  python generate.py texts.json OUTDIR --oov                               # list words Kokoro does not know
  python generate.py texts.json OUTDIR --trim --speed 0.78                 # ABC & 123: slower, calm, no silence around clips

Needs Python 3.12 with: pip install kokoro soundfile   (the macOS command afconvert makes the small .m4a files).
Names (see pron.js) are given to Kokoro as explicit phonemes. Clips are only remade when the text, the
pronunciation or the voice changes, so fixing one name only redoes the clips that mention it.
"""
import argparse, hashlib, json, os, re, subprocess, sys, tempfile
import misaki.espeak as _e
def _no(*a, **k): raise RuntimeError("espeak unavailable")
_e.EspeakFallback = _no  # the bundled espeak crashes on some Macs; the names get phonemes from pron.js instead
import numpy as np, soundfile as sf
from kokoro import KPipeline

VOICES = {"bf_emma": "b", "bm_george": "b", "af_heart": "a", "af_nicole": "a"}  # voice -> Kokoro language code (b British, a American)

# ordinary words the Kokoro dictionary lacks (found with --oov), and a few African names that are not in pron.js
EXTRA = {"Kwasi": "kwˈɑsi", "Akosua": "ɑkˈoʊsuɑ", "Kwadwo": "kwˈɑʤoʊ", "Adwoa": "ɑʤˈoʊɑ", "Kwabena": "kwɑbˈɛnɑ", "Abena": "ɑbˈɛnɑ", "Akua": "ɑkˈuɑ", "Yaa": "jˈɑ", "Afua": "ɑfˈuɑ", "Kwame": "kwˈɑmɛ", "heavier": "hˈɛviəɹ", "nodded": "nˈɑdɪd", "tugged": "tˈʌgd", "Ama": "ˈɑmɑ", "Esi": "ˈɛsi", "Kofi": "kˈoʊfi", "hopped": "hˈɑpt", "patted": "pˈætɪd", "pitter": "pˈɪtəɹ", "popped": "pˈɑpt", "rubbed": "ɹˈʌbd", "scurried": "skˈʌɹid", "splish": "splˈɪʃ", "tapped": "tˈæpt", "tipped": "tˈɪpt", "zipped": "zˈɪpt"}

def speakable(text, pron, british=True):
    pron = {**EXTRA, **pron}
    # the long "oh" sound is one letter in Kokoro's own phoneme alphabet (O American, Q British)
    pron = {k: v.replace("oʊ", "Q" if british else "O") for k, v in pron.items()}
    for a, b in [("÷", " divided by "), ("×", " times "), ("−", " minus "), (" + ", " plus "), (" = ", " equals "), ("…", "..."), ("–", ", ")]:
        text = text.replace(a, b)
    text = re.sub(r"\b(" + "|".join(sorted(pron, key=len, reverse=True)) + r")\b", lambda m: f"[{m.group(1)}](/{pron[m.group(1)]}/)", text)
    return text

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("texts"); ap.add_argument("out")
    ap.add_argument("--voices", default=",".join(VOICES)); ap.add_argument("--only", default=""); ap.add_argument("--oov", action="store_true")
    ap.add_argument("--speed", type=float, default=0.92, help="speaking speed (1 is Kokoro's normal pace)")
    ap.add_argument("--trim", action="store_true", help="cut the silence before and after each clip (short words, counting)")
    a = ap.parse_args()
    data = json.load(open(a.texts)); pron = data["pron"]; clips = data["clips"]
    if a.oov:
        from misaki import en
        g2p = en.G2P(trf=False, british=True, fallback=None)
        bad = {}
        for k, t in clips.items():
            _, toks = g2p(speakable(t, pron, True))
            for tok in toks:
                if tok.phonemes is None and re.search(r"[A-Za-z]", tok.text): bad.setdefault(tok.text.lower(), []).append(k)
        print(json.dumps({w: v[:2] for w, v in sorted(bad.items())}, indent=1)); return
    os.makedirs(a.out, exist_ok=True)
    mpath = os.path.join(a.out, "manifest.json")
    manifest = json.load(open(mpath)) if os.path.exists(mpath) else {}
    for voice in a.voices.split(","):
        pipe = KPipeline(lang_code=VOICES[voice], repo_id="hexgrad/Kokoro-82M")
        done = manifest.setdefault(voice, {})
        for key, text in clips.items():
            if a.only and not key.startswith(a.only): continue
            ready = speakable(text, pron, VOICES[voice] == "b")
            h = hashlib.sha1(f"{voice}|{ready}{'|trim' if a.trim else ''}{f'|{a.speed}' if a.speed != 0.92 else ''}".encode()).hexdigest()[:12]
            dst = os.path.join(a.out, voice, key + ".m4a")
            if done.get(key) == h and os.path.exists(dst): continue
            audio = [x for _, _, x in pipe(ready, voice=voice, speed=a.speed)]
            if not audio: print("NO AUDIO", voice, key); continue
            wav = np.concatenate([x.numpy() if hasattr(x, "numpy") else x for x in audio])
            if a.trim:
                loud = np.where(np.abs(wav) > np.abs(wav).max() * 0.03)[0]
                if len(loud): wav = wav[max(0, loud[0] - 1200):loud[-1] + 4800]  # keep 50 ms before, 200 ms after
            os.makedirs(os.path.dirname(dst), exist_ok=True)
            with tempfile.TemporaryDirectory() as tmp:
                w = os.path.join(tmp, "c.wav"); sf.write(w, wav, 24000)
                subprocess.run(["afconvert", "-f", "m4af", "-d", "aac", "-b", "32000", "-c", "1", w, dst], check=True)
            done[key] = h
            print(voice, key, f"{os.path.getsize(dst)//1024} KB", flush=True)
        json.dump(manifest, open(mpath, "w"), indent=0, sort_keys=True)
    # the list the page reads, so it only asks for clips that exist
    idx = {v: sorted(k for k in d if os.path.exists(os.path.join(a.out, v, k + ".m4a"))) for v, d in manifest.items()}
    json.dump(idx, open(os.path.join(a.out, "index.json"), "w"), sort_keys=True)

if __name__ == "__main__":
    main()
