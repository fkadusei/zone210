"""Makes the ABC & 123 voice clips with Chatterbox (Resemble AI, MIT licence), calm settings.
  node dump-texts.mjs --plain > texts.json
  python chatterbox_generate.py texts.json ../../public/games/abc-123/audio [--only l/]
Needs Python 3.12 with: pip install chatterbox-tts "setuptools<81"   (afconvert makes the .m4a files).
Each clip is made on its own, trimmed of silence, and only remade when its text or the settings change."""
import argparse, hashlib, json, os, subprocess, sys, tempfile
import numpy as np, soundfile as sf, torch
from chatterbox.tts import ChatterboxTTS

VOICE, EXAGGERATION, CFG, SEED = "cbx_calm", 0.35, 0.3, 7
# more ways to write the letters that are also ordinary words or easily swallowed
EXTRA = {"l/a": ["A!", "Ay!", "Aye.", "A?", "Ay."], "l/i": ["I!", "Eye!", "Aye!"], "l/n": ["N!", "En!", "Enn."], "l/s": ["S!", "Ess!", "Es."]}

ap = argparse.ArgumentParser(); ap.add_argument("texts"); ap.add_argument("out"); ap.add_argument("--only", default="")
ap.add_argument("--retake", nargs="*", default=[], help="clips to remake until Whisper hears the right words (several takes)")
a = ap.parse_args()
clips = json.load(open(a.texts))["clips"]
mpath = os.path.join(a.out, "manifest.json")
manifest = json.load(open(mpath)) if os.path.exists(mpath) else {}
done = manifest.setdefault(VOICE, {})
model = ChatterboxTTS.from_pretrained(device="mps" if torch.backends.mps.is_available() else "cpu")
def make(text, seed):
    torch.manual_seed(seed)
    wav = model.generate(text, exaggeration=EXAGGERATION, cfg_weight=CFG).squeeze(0).cpu().numpy()
    loud = np.where(np.abs(wav) > np.abs(wav).max() * 0.03)[0]
    return wav[max(0, loud[0] - 1200):loud[-1] + 4800] if len(loud) else wav  # 50 ms before, 200 ms after
def save(wav, dst):
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        w = os.path.join(tmp, "c.wav"); sf.write(w, wav, model.sr)
        subprocess.run(["afconvert", "-f", "m4af", "-d", "aac", "-b", "40000", "-c", "1", w, dst], check=True)

if a.retake:
    # several takes per clip; letters also try the spelled name ("Zee."). Keep the first take Whisper agrees with.
    from check_clips import hear, matches
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "public", "games", "abc-123"))
    spelled = json.load(open(a.texts)).get("spelled", {})
    for key in a.retake:
        text = clips[key]
        variants = [text] + ([spelled[key]] if key in spelled else []) + EXTRA.get(key, [])
        tries = [(t, s) for s in range(1, 21 if key in EXTRA else 7) for t in variants]
        dst = os.path.join(a.out, VOICE, key + ".m4a")
        for t, seed in tries:
            wav = make(t, seed)
            with tempfile.TemporaryDirectory() as tmp:
                p = os.path.join(tmp, "t.m4a"); save(wav, p); got = hear(p)
            if matches(key, text, got):
                save(wav, dst); done[key] = f"retake|{t}|{seed}"
                print(key, "OK", repr(t), seed, repr(got.strip()), flush=True); break
        else:
            print(key, "NO GOOD TAKE", flush=True)
        json.dump(manifest, open(mpath, "w"), indent=0, sort_keys=True)
    sys.exit(0)

for key, text in clips.items():
    if a.only and not key.startswith(a.only): continue
    h = hashlib.sha1(f"{VOICE}|{text}|{EXAGGERATION}|{CFG}|{SEED}".encode()).hexdigest()[:12]
    dst = os.path.join(a.out, VOICE, key + ".m4a")
    if done.get(key) == h and os.path.exists(dst): continue
    torch.manual_seed(SEED)
    wav = model.generate(text, exaggeration=EXAGGERATION, cfg_weight=CFG).squeeze(0).cpu().numpy()
    loud = np.where(np.abs(wav) > np.abs(wav).max() * 0.03)[0]
    if len(loud): wav = wav[max(0, loud[0] - 1200):loud[-1] + 4800]  # 50 ms before, 200 ms after
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        w = os.path.join(tmp, "c.wav"); sf.write(w, wav, model.sr)
        subprocess.run(["afconvert", "-f", "m4af", "-d", "aac", "-b", "40000", "-c", "1", w, dst], check=True)
    done[key] = h
    print(key, f"{len(wav) / model.sr:.2f}s", flush=True)
    json.dump(manifest, open(mpath, "w"), indent=0, sort_keys=True)
idx = {v: sorted(k for k in d if os.path.exists(os.path.join(a.out, v, k + ".m4a"))) for v, d in manifest.items() if v == VOICE}
json.dump(idx, open(os.path.join(a.out, "index.json"), "w"), sort_keys=True)
