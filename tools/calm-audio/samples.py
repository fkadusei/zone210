"""Calm Corner voice samples: the same calming lines in a few Kokoro voices.  python samples.py OUTDIR"""
import os, subprocess, sys, tempfile
import misaki.espeak as _e
def _no(*a, **k): raise RuntimeError("espeak unavailable")
_e.EspeakFallback = _no
import numpy as np, soundfile as sf
from kokoro import KPipeline
LINES = ["Breathe in, slowly.", "And breathe out.", "Worries can feel heavy. Let's bring your mind back to right now.", "You are braver than you think.", "Well done. Notice how you feel now."]
RUNS = [("nicole", "af_nicole", "a", 0.9), ("heart", "af_heart", "a", 0.88), ("emma", "bf_emma", "b", 0.88)]
out = sys.argv[1]; os.makedirs(out, exist_ok=True)
pipes = {}
for name, voice, lang, speed in RUNS:
    if lang not in pipes: pipes[lang] = KPipeline(lang_code=lang, repo_id="hexgrad/Kokoro-82M")
    parts = []
    for line in LINES:
        for _, _, a in pipes[lang](line, voice=voice, speed=speed):
            parts.append(a.numpy() if hasattr(a, "numpy") else a)
        parts.append(np.zeros(int(24000 * 1.1), dtype=np.float32))
    with tempfile.TemporaryDirectory() as tmp:
        w = os.path.join(tmp, "c.wav"); sf.write(w, np.concatenate(parts), 24000)
        subprocess.run(["afconvert", "-f", "m4af", "-d", "aac", "-b", "48000", "-c", "1", w, os.path.join(out, f"calm-{name}.m4a")], check=True)
    print(name, flush=True)
