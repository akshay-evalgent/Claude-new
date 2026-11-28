"""Render the narration line by line with Kokoro (offline) and write timing.json.

usage: python voice.py MODEL_DIR OUT_DIR [voice]
"""
import json, os, sys
import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro

sys.path.insert(0, os.path.dirname(__file__))
from shots import S

model_dir, out = sys.argv[1], sys.argv[2]
voice = sys.argv[3] if len(sys.argv) > 3 else "am_michael"
os.makedirs(out, exist_ok=True)
k = Kokoro(os.path.join(model_dir, "kokoro-v1.0.onnx"), os.path.join(model_dir, "voices-v1.0.bin"))

SR = 24000
GAP = 0.32          # breath after each line
CHAPTER = 3.8       # silent chapter cards, music only
timing, t = [], 0.6  # short black lead-in
for i, s in enumerate(S):
    if "say" in s:
        text = s.get("tts") or s["say"]
        audio, sr = k.create(text, voice=voice, speed=0.97, lang="en-us")
        assert sr == SR
        # trim leading/trailing near-silence so the cut lands on the word
        nz = np.where(np.abs(audio) > 0.01)[0]
        audio = audio[max(nz[0] - 600, 0): nz[-1] + 1200]
        path = os.path.join(out, f"line_{i:03d}.wav")
        sf.write(path, audio, SR)
        vo = len(audio) / SR
        dur = vo + GAP + s.get("hold", 0)
        timing.append(dict(i=i, start=t, dur=dur, vo=vo, wav=path))
    else:
        dur = s.get("dur", CHAPTER)
        timing.append(dict(i=i, start=t, dur=dur, vo=0, wav=None))
    t += dur
    print(f"{i:3d} {timing[-1]['start']:7.2f} {dur:5.2f}  {s.get('say', s.get('text'))[:60]}")

json.dump(dict(total=t, shots=timing), open(os.path.join(out, "timing.json"), "w"), indent=1)
print("total", round(t, 1), "s")
