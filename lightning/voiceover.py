"""Lightning short: generate the narration line by line with Kokoro (Apache-2.0 neural TTS) and write
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
TAIL = 2.6           # room for the final gag after the last word

LINES = [  # text, pause after (s)
    ("If lightning ever hits your car, the rubber tires won't save you.", 0.40),
    ("That bolt just crossed miles of open sky.", 0.15),
    ("A few inches of rubber won't even slow it down.", 0.40),
    ("What actually saves you is the metal shell around you.", 0.40),
    ("When lightning strikes, thirty thousand amps hit the roof,", 0.06),
    ("race across the outside of the car,", 0.04),
    ("and blast through the tires into the ground.", 0.40),
    ("Inside, the current flows around you, not through you.", 0.40),
    ("The car isn't so lucky.", 0.30),
    ("The bolt is five times hotter than the surface of the sun.", 0.30),
    ("It can melt your antenna,", 0.06),
    ("blow out the tires,", 0.06),
    ("shatter the rear window,", 0.06),
    ("and fry the electronics.", 0.45),
    ("But you'll be fine, as long as the windows are closed,", 0.05),
    ("and the roof is metal.", 0.40),
    ("A convertible gives you no protection, even with the top up.", 0.55),
    ("So when the storm passes, you'll step out without a scratch.", 0.60),
    ("Your car, though...", 0.0),
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
