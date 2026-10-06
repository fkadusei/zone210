"""Kokoro listening samples for ABC & 123: a few letters, numbers and sentences in several voices and speeds.
  python kokoro_samples.py OUTDIR      (Python 3.12 with kokoro + soundfile)"""
import os, subprocess, sys, tempfile
import misaki.espeak as _e
def _no(*a, **k): raise RuntimeError("espeak unavailable")
_e.EspeakFallback = _no
import numpy as np, soundfile as sf
from kokoro import KPipeline

# letter names as exact sounds (Kokoro phoneme alphabet: A = "ay", I = "eye", O = "oh")
L = {"A": "ˈA", "G": "ʤˈi", "H": "ˈAʧ", "R": "ˈɑɹ", "W": "dˈʌbᵊl jˌu", "Y": "wˈI", "Z": "zˈi"}
TEXT = " ".join(f"[{k}](/{v}/)." for k, v in L.items()) + "  Seven. Eleven. Thirteen. Twenty.  [G](/ʤˈi/) is for giraffe. Find the letter [R](/ˈɑɹ/). How many can you count?"
OLD = "Ay. Jee. Aitch. Are. Double you. Why. Zee.  Seven. Eleven. Thirteen. Twenty.  Jee is for giraffe. Find the letter Are. How many can you count?"
RUNS = [  # name, voice, speed, text
  ("now-heart-0.78-spelled", "af_heart", 0.78, OLD),
  ("before-heart-0.92-spelled", "af_heart", 0.92, OLD),
  ("heart-1.0-sounds", "af_heart", 1.0, TEXT),
  ("heart-0.92-sounds", "af_heart", 0.92, TEXT),
  ("bella-0.92-sounds", "af_bella", 0.92, TEXT),
  ("sarah-0.92-sounds", "af_sarah", 0.92, TEXT),
  ("emma-british-0.92-sounds", "bf_emma", 0.92, TEXT),
]
out = sys.argv[1]; os.makedirs(out, exist_ok=True)
pipes = {}
for name, voice, speed, text in RUNS:
    lang = "b" if voice.startswith("b") else "a"
    if lang not in pipes: pipes[lang] = KPipeline(lang_code=lang, repo_id="hexgrad/Kokoro-82M")
    parts = []
    for sentence in [s for s in text.replace("  ", "|").split("|")]:
        for _, ph, a in pipes[lang](sentence, voice=voice, speed=speed):
            parts.append(a.numpy() if hasattr(a, "numpy") else a)
        parts.append(np.zeros(int(24000 * 0.6), dtype=np.float32))
    wav = np.concatenate(parts)
    with tempfile.TemporaryDirectory() as tmp:
        w = os.path.join(tmp, "c.wav"); sf.write(w, wav, 24000)
        subprocess.run(["afconvert", "-f", "m4af", "-d", "aac", "-b", "48000", "-c", "1", w, os.path.join(out, name + ".m4a")], check=True)
    print(name, flush=True)
