"""Pool short: generate the narration line by line with Kokoro (Apache-2.0 neural TTS) and write
vo.wav plus vo_timing.json (start/end of every line), which drives the shot timing. Each line also
carries the caption text shown on screen (digits where the voice says the numbers).

The script follows the step-by-step "How a ___ Becomes a ___" recipe: a one-line premise, then the
build told to "you" as short instructions, a turn ("Now the trick"), the reveal, and a closing joke.

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
    ("This is how a swimming pool becomes a secret garage.", None, 0.30),
    ("Start with a hole in your backyard.", None, 0.06),
    ("Ten meters long, and four meters deep.", "10 meters long, and 4 meters deep.", 0.22),
    ("Pour a thick concrete floor, and walls strong enough to hold back the ground.", None, 0.22),
    ("At one end, a car lift.", None, 0.06),
    ("Park your car on it.", None, 0.28),
    ("Now the trick.", None, 0.14),
    ("In each corner, a hydraulic ram that can lift thirty tons.", "In each corner, a hydraulic ram that can lift 30 tons.", 0.22),
    ("On top of them, a steel tub, as big as the hole.", None, 0.14),
    ("Tile it, and fill it with water.", None, 0.22),
    ("Lay the deck around it, so the edges line up perfectly.", None, 0.26),
    ("To everyone else, it's just a pool.", None, 0.40),
    ("But press this button,", None, 0.18),
    ("and the whole pool rises.", None, 0.25),
    ("Water and all.", None, 0.75),
    ("Underneath, your car comes up to meet you.", None, 0.65),
    ("Press it again, and it sinks back down, like nothing ever happened.", None, 0.34),
    ("Congratulations.", None, 0.16),
    ("Your neighbors just think you really like swimming.", None, 0.00),
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
