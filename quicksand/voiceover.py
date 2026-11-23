"""Generate the narration line by line with Kokoro (Apache-2.0 neural TTS) and write
vo.wav plus vo_timing.json (start/end of every line), which drives the shot timing.

usage: <venv>/bin/python voiceover.py   (needs $QS_SCRATCH/tts/kokoro-v1.0.onnx + voices-v1.0.bin)
"""
import json, os, sys
import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro

SCRATCH = os.environ["QS_SCRATCH"]
VOICE = os.environ.get("QS_VOICE", "am_michael")
SPEED = float(os.environ.get("QS_SPEED", "1.08"))
LEAD = 0.12          # silence before the first word
TAIL = 2.0           # room for the final gag after the last word

LINES = [  # text, pause after (s)
    ("If you ever start sinking in quicksand,", 0.12),
    ("whatever you do, don't try to yank your legs out.", 0.35),
    ("Scientists worked out that pulling your foot out at just one centimeter per second", 0.08),
    ("takes about the same force as lifting a car.", 0.40),
    ("The good news is, you can't sink all the way.", 0.25),
    ("Quicksand is about twice as dense as your body,", 0.08),
    ("so you stop around your waist.", 0.35),
    ("The bad news?", 0.18),
    ("That's where you get stuck.", 0.30),
    ("And if you're on a beach, the tide is coming in.", 0.45),
    ("So instead, stop struggling.", 0.28),
    ("Lean back and spread your arms,", 0.05),
    ("like you're floating in a pool.", 0.30),
    ("Then wiggle your legs, slowly.", 0.20),
    ("That lets water seep into the sand, and loosens its grip.", 0.35),
    ("Inch by inch, you float up,", 0.08),
    ("and roll onto solid ground.", 0.45),
    ("Then you stand up, feeling like a survival expert.", 0.55),
    ("And take one step.", 0.0),
]


def trim(a, sr, thr=0.012, pad=0.02):
    idx = np.where(np.abs(a) > thr)[0]
    if len(idx) == 0:
        return a
    s = max(0, idx[0] - int(pad * sr)); e = min(len(a), idx[-1] + int(pad * sr))
    return a[s:e]


def main():
    k = Kokoro(os.path.join(SCRATCH, "tts", "kokoro-v1.0.onnx"), os.path.join(SCRATCH, "tts", "voices-v1.0.bin"))
    out, timing, sr0 = [], [], None
    t = LEAD
    for i, (text, pause) in enumerate(LINES):
        a, sr = k.create(text, voice=VOICE, speed=SPEED, lang="en-us")
        sr0 = sr0 or sr
        a = trim(np.asarray(a, dtype=np.float32), sr)
        timing.append({"i": i, "text": text, "start": round(t, 3), "end": round(t + len(a) / sr, 3)})
        out.append(a); t += len(a) / sr
        out.append(np.zeros(int(pause * sr), np.float32)); t += pause
        print(f"{i:2d} {timing[-1]['start']:6.2f}-{timing[-1]['end']:6.2f}  {text}")
    audio = np.concatenate([np.zeros(int(LEAD * sr0), np.float32)] + out + [np.zeros(int(TAIL * sr0), np.float32)])
    audio = audio / max(1e-6, np.abs(audio).max()) * 0.89
    sf.write(os.path.join(SCRATCH, "vo.wav"), audio, sr0)
    total = len(audio) / sr0
    json.dump({"sr": sr0, "total": total, "lines": timing}, open(os.path.join(SCRATCH, "vo_timing.json"), "w"), indent=1)
    print("total", round(total, 2), "s")


if __name__ == "__main__":
    main()
