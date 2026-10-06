"""Chatterbox listening samples for ABC & 123, each line made on its own (as the game plays them).
  python chatterbox_samples.py OUTDIR      (Python 3.12 with chatterbox-tts)"""
import os, subprocess, sys, tempfile
import numpy as np, soundfile as sf, torch
from chatterbox.tts import ChatterboxTTS

LINES = ["A.", "G.", "H.", "R.", "W.", "Y.", "Z.", "Seven.", "Eleven.", "Thirteen.", "Twenty.", "G is for giraffe.", "Find the letter R.", "How many can you count?"]
SPELLED = ["Ay.", "Jee.", "Aitch.", "Ar.", "Double-you.", "Why.", "Zee."] + LINES[7:11] + ["Jee is for giraffe.", "Find the letter Ar.", "How many can you count?"]
RUNS = [("chatterbox-calm", 0.35, 0.3, LINES), ("chatterbox-default", 0.5, 0.5, LINES), ("chatterbox-calm-spelled", 0.35, 0.3, SPELLED)]  # name, exaggeration, cfg_weight, lines
ONLY = sys.argv[2:]  # optional: names of runs to make
dev = "mps" if torch.backends.mps.is_available() else "cpu"
model = ChatterboxTTS.from_pretrained(device=dev)
out = sys.argv[1]; os.makedirs(out, exist_ok=True)
for name, ex, cfg, lines in RUNS:
    if ONLY and name not in ONLY: continue
    parts = []
    for line in lines:
        torch.manual_seed(7)
        wav = model.generate(line, exaggeration=ex, cfg_weight=cfg).squeeze(0).cpu().numpy()
        loud = np.where(np.abs(wav) > np.abs(wav).max() * 0.03)[0]
        if len(loud): wav = wav[max(0, loud[0] - 1200):loud[-1] + 4800]
        parts += [wav, np.zeros(int(model.sr * 0.7), dtype=np.float32)]
        print(name, line, f"{len(wav) / model.sr:.2f}s", flush=True)
    with tempfile.TemporaryDirectory() as tmp:
        w = os.path.join(tmp, "c.wav"); sf.write(w, np.concatenate(parts), model.sr)
        subprocess.run(["afconvert", "-f", "m4af", "-d", "aac", "-b", "48000", "-c", "1", w, os.path.join(out, name + ".m4a")], check=True)
