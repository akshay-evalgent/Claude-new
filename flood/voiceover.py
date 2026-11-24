"""Flood short: generate the narration line by line with Kokoro (Apache-2.0 neural TTS) and write
vo.wav plus vo_timing.json (start/end of every line), which drives the shot timing.

usage: <venv>/bin/python voiceover.py   (needs $QS_SCRATCH/tts/kokoro-v1.0.onnx + voices-v1.0.bin)
"""
import json, os, sys
import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro

SCRATCH = os.environ["QS_SCRATCH"]
VOICE = os.environ.get("QS_VOICE", "am_michael")
SPEED = float(os.environ.get("QS_SPEED", "1.15"))
LEAD = 0.12          # silence before the first word
TAIL = 2.4           # room for the final gag after the last word

LINES = [  # text, pause after (s)
    ("Just one foot of rushing water can carry your car away.", 0.22),
    ("Even if the car in front of you made it across.", 0.30),
    ("Flash floods rise fast, and you can't tell how deep the water is.", 0.30),
    ("At six inches, water reaches the bottom of your car,", 0.04),
    ("and the engine can stall.", 0.30),
    ("At one foot, your car can start to float.", 0.26),
    ("That's because your car is basically a giant box of air.", 0.22),
    ("A foot of water pushes up on it with about fifteen hundred pounds of lift.", 0.26),
    ("Your tires lose their grip on the road,", 0.04),
    ("and the current slams into the side of your car with hundreds of pounds of force.", 0.30),
    ("Two feet of rushing water can carry away even SUVs and trucks.", 0.30),
    ("And the road under the water might not even be there anymore.", 0.34),
    ("That's why more than half of all flood drownings happen in vehicles.", 0.34),
    ("So if you see a flooded road, turn around, don't drown.", 0.30),
    ("And if the water rises around you, get out and get to higher ground, if it's safe.", 0.45),
    ("He took the long way home.", 0.41),
    ("The guy in front of him took the scenic route.", 0.00),
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
