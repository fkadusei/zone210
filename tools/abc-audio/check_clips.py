"""Listens to every ABC & 123 clip with Whisper (speech recognition, runs locally) and lists the ones that
do not say what they should.
  python check_clips.py texts.json ../../public/games/abc-123/audio cbx_calm
Needs Python with torch + transformers; the first run downloads openai/whisper-base.en (about 290 MB)."""
import json, os, re, subprocess, sys, tempfile
import numpy as np, soundfile as sf
from transformers import pipeline

_asr = None
def asr(x):
    global _asr
    if _asr is None: _asr = pipeline("automatic-speech-recognition", model="openai/whisper-base.en")
    return _asr(x)
NUM = "zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty".split()
# ways a letter name can be written down
SAY = {"a": "a ay", "b": "b be bee", "c": "c see sea", "d": "d dee", "e": "e ee", "f": "f eff ef", "g": "g gee jee", "h": "h aitch age",
       "i": "i eye aye", "j": "j jay", "k": "k kay", "l": "l el ell", "m": "m em", "n": "n en", "o": "o oh owe", "p": "p pee pea", "q": "q cue queue",
       "r": "r are ar", "s": "s es ess", "t": "t tee tea", "u": "u you", "v": "v vee", "w": "w doubleyou doubleu", "x": "x ex", "y": "y why", "z": "z zee zed"}
def norm(t):
    t = t.lower().replace("-", " ")
    t = re.sub(r"\b(\d+)\b", lambda m: NUM[int(m.group(1))] if int(m.group(1)) <= 20 else m.group(1), t)
    return " ".join(re.sub(r"[^a-z' ]", " ", t).split())
def hear(path):
    with tempfile.TemporaryDirectory() as tmp:
        w = os.path.join(tmp, "c.wav")
        subprocess.run(["afconvert", "-f", "WAVE", "-d", "LEI16@16000", path, w], check=True)
        x, sr = sf.read(w, dtype="float32")
    return asr({"raw": x, "sampling_rate": sr})["text"]
def matches(key, text, got):
    g, want = norm(got), norm(text)
    names = SAY[key[2]].split() if key[:2] in ("l/", "w/") else []
    if key.startswith("l/"):
        ok = g.replace(" ", "") in names
    elif key.startswith("w/"):
        rest = norm(text.split(" is for ", 1)[1])
        ok = g.endswith("is for " + rest) and g[: -len("is for " + rest)].replace(" ", "") in names
    else:
        ok = g.replace(" ", "") == want.replace(" ", "")
    return ok

if __name__ == "__main__":
  texts, audio, voice = sys.argv[1], sys.argv[2], sys.argv[3]
  clips = json.load(open(texts))["clips"]
  bad = []
  for key, text in clips.items():
    got = hear(os.path.join(audio, voice, key + ".m4a"))
    ok = matches(key, text, got)
    print(("ok  " if ok else "BAD ") + f"{key:16} want: {text!r:44} heard: {got.strip()!r}", flush=True)
    if not ok: bad.append(key)
  print("\nmismatches:", len(bad), " ".join(bad))
