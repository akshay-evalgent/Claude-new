"""Apple short: generate the narration line by line with Kokoro (Apache-2.0 neural TTS) and write
vo.wav plus vo_timing.json (start/end of every line), which drives the shot timing. Each line also
carries the caption text shown on screen (digits and $ signs where the voice says the words).

usage: <venv>/bin/python voiceover.py   (needs $QS_SCRATCH/tts/kokoro-v1.0.onnx + voices-v1.0.bin)
"""
import json, os
import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro

SCRATCH = os.environ["QS_SCRATCH"]
VOICE = os.environ.get("QS_VOICE", "am_michael")
SPEED = float(os.environ.get("QS_SPEED", "1.17"))
LEAD = 0.12          # silence before the first word
TAIL = 2.2           # room for the final beat after the last word

LINES = [  # spoken text, caption text (None = same), pause after (s)
    ("In nineteen seventy-six, this man owned ten percent of Apple.", "In 1976, this man owned 10% of Apple.", 0.18),
    ("He sold it for eight hundred dollars.", "He sold it for $800.", 0.30),
    ("Ronald Wayne met Steve Jobs and Steve Wozniak at Atari.", None, 0.05),
    ("At forty-one, he was the adult in the room.", "At 41, he was the adult in the room.", 0.23),
    ("The two Steves took forty-five percent each.", "The two Steves took 45% each.", 0.05),
    ("Wayne got ten, to break their ties.", "Wayne got 10%, to break their ties.", 0.23),
    ("He wrote the contract, and drew the very first Apple logo.", None, 0.23),
    ("Then Jobs took on fifteen thousand dollars in credit for their first big order.",
     "Then Jobs took on $15,000 in credit for their first big order.", 0.23),
    ("In a partnership, every partner is on the hook for every debt.", None, 0.20),
    ("The two Steves had almost nothing to lose.", None, 0.07),
    ("Wayne did.", None, 0.28),
    ("So twelve days later, he took his name off, for eight hundred dollars.",
     "So 12 days later, he took his name off, for $800.", 0.23),
    ("Later, he took fifteen hundred more to give up any claim.", "Later, he took $1,500 more to give up any claim.", 0.28),
    ("Today, Apple is worth over five trillion dollars.", "Today, Apple is worth over $5 trillion.", 0.07),
    ("Ten percent is about five hundred billion.", "10% is about $500 billion.", 0.33),
    ("He kept just one thing: his copy of the contract, signed by all three.", None, 0.23),
    ("He sold that for five hundred dollars.", "He sold that for $500.", 0.28),
    ("In twenty eleven, it sold at auction for one point six million.", "In 2011, it sold at auction for $1.6 million.", 0.37),
    ("He says he doesn't regret leaving Apple.", None, 0.30),
    ("Just selling that piece of paper.", None, 0.00),
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
