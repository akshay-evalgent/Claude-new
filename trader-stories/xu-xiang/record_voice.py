"""Record the narration, one file per shot, with Kokoro (Apache 2.0).

usage: python record_voice.py OUT_DIR [--voice af_heart] [--speed 1.12]

Writes OUT_DIR/<shot_id>.wav (24 kHz mono) and timing.json:
  { shot_id: { "audio": seconds, "segments": [[start, end, text], ...] } }
Segments are the narrator's own phrase chunks, used for subtitles.
"""
import argparse, csv, json, re
from pathlib import Path

import numpy as np
import soundfile as sf
from kokoro import KPipeline

HERE = Path(__file__).parent
ap = argparse.ArgumentParser()
ap.add_argument("out")
ap.add_argument("--voice", default="af_heart")
ap.add_argument("--speed", type=float, default=1.12)
args = ap.parse_args()
out = Path(args.out); out.mkdir(parents=True, exist_ok=True)

lex = {k: v for k, v in json.load(open(HERE / "pronunciations.json")).items() if not k.startswith("_")}
keys = sorted(lex, key=len, reverse=True)
pattern = re.compile("|".join(r"(?<![\w\[])" + re.escape(k) + (r"(?![\w\]])" if k[-1].isalnum() or k[-1] == "s" else "") for k in keys))

def mark(text):
    def sub(m):
        word = m.group(0)
        trail = "," if word.endswith(",") else ""
        return f"[{word.rstrip(',')}]({lex[word]}){trail}"
    return pattern.sub(sub, text)

pipe = KPipeline(lang_code="a")
SR = 24000
timing = {}
for row in csv.DictReader(open(HERE / "shots.csv", encoding="utf-8")):
    text = row["narration"].strip()
    if not text:
        continue
    pieces, segs, t = [], [], 0.0
    for graphemes, _, audio in pipe(mark(text), voice=args.voice, speed=args.speed):
        a = audio.numpy()
        pieces.append(a)
        clean = re.sub(r"\[([^\]]+)\]\([^)]*\)", r"\1", graphemes).strip()
        segs.append([round(t, 3), round(t + len(a) / SR, 3), clean])
        t += len(a) / SR
    wav = np.concatenate(pieces)
    sf.write(out / f"{row['shot_id']}.wav", wav, SR)
    timing[row["shot_id"]] = {"audio": round(len(wav) / SR, 3), "segments": segs}
    print(row["shot_id"], f"{len(wav) / SR:.1f}s", flush=True)

meta = {"voice": args.voice, "speed": args.speed, "engine": "Kokoro-82M (hexgrad, Apache 2.0)"}
json.dump({"meta": meta, "shots": timing}, open(out / "timing.json", "w"), indent=1, ensure_ascii=False)
print("total narration", round(sum(v["audio"] for v in timing.values()) / 60, 1), "min")
