"""Doghouse short: generate the narration line by line with Kokoro (Apache-2.0 neural TTS) and write
vo.wav plus vo_timing.json (start/end of every line), which drives the shot timing. Each line also
carries the caption text shown on screen (digits where the voice says the numbers).

The script is a chain: every step solves a problem and the next "But..." opens a new one, until the
last one lands somewhere nobody saw coming (a premise, the build told to "you" in short steps, three
"But..." turns, a break-through and a twist).

usage: <venv>/bin/python voiceover.py   (needs $QS_SCRATCH/tts/kokoro-v1.0.onnx + voices-v1.0.bin)
"""
import json, os
import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro

SCRATCH = os.environ["QS_SCRATCH"]
VOICE = os.environ.get("QS_VOICE", "am_michael")
SPEED = float(os.environ.get("QS_SPEED", "1.12"))
LEAD = 0.12          # silence before the first word
TAIL = 2.0           # room for the final beat after the last word

LINES = [  # spoken text, caption text (None = same), pause after (s)
    ("This doghouse has never had a dog.", None, 0.22),
    ("Because it isn't a doghouse.", None, 0.34),
    ("Start with a hole underneath it.", None, 0.24),
    ("But dirt walls cave in.", None, 0.18),
    ("So you lower concrete rings, one on top of another, six meters down.",
     "So you lower concrete rings, one on top of another, 6 meters down.", 0.2),
    ("Add a ladder.", None, 0.3),
    ("But a hole in the ground isn't a hideout.", None, 0.16),
    ("So at the bottom, you dig sideways, and pour a room.", None, 0.26),
    ("Down here, you need air.", None, 0.12),
    ("So the vent comes up through the doghouse roof, as a tiny chimney.", None, 0.3),
    ("Run power under the lawn, and now you've got lights, a bed, and Wi-Fi.", None, 0.36),
    ("But every bunker needs a second way out.", None, 0.22),
    ("So you keep digging.", None, 0.14),
    ("Under the garden. Under the fence.", None, 0.26),
    ("Until you break through...", None, 0.5),
    ("into your neighbor's bunker.", None, 0.75),
    ("Turns out, his doghouse doesn't have a dog either.", None, 0.0),
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
    for i, (text, cap, pause) in enumerate(LINES):
        a, sr = k.create(text, voice=VOICE, speed=SPEED, lang="en-us")
        sr0 = sr0 or sr
        a = trim(np.asarray(a, dtype=np.float32), sr)
        timing.append({"i": i, "text": text, "caption": cap or text, "start": round(t, 3), "end": round(t + len(a) / sr, 3)})
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
