"""Record an explainer's narration with Kokoro (Apache 2.0), one file per beat, with word timings.

usage: python voice.py VIDEO_DIR [--to MOTION_VIDEO_DIR]

Reads VIDEO_DIR/beats.json:
  { "voice": "am_michael", "speed": 1.22, "fps": 30,
    "beats": [ {"id": "b01", "shot": "s01", "text": "...", "pad": 0.25,
                "hold": 0, "sfx": [[0.0, "kenney-casino/chips-stack-1", 0.6]]}, ... ] }
  - pad: silence after the line (seconds). hold: length of a beat with no text.
  - lines are cached by text+voice+speed, so editing one line re-records only that line.
Writes VIDEO_DIR/build/vo/<id>.wav, VIDEO_DIR/build/timing.json, VIDEO_DIR/build/captions.srt,
and copies timing.json to --to (the Remotion video folder) when given.
"""
import argparse, hashlib, json, math, re, shutil
from pathlib import Path

import numpy as np
import soundfile as sf

TOOLS = Path(__file__).parent
ap = argparse.ArgumentParser()
ap.add_argument("video")
ap.add_argument("--to")
args = ap.parse_args()
vdir = Path(args.video)
spec = json.load(open(vdir / "beats.json"))
voice, speed, fps = spec.get("voice", "am_michael"), spec.get("speed", 1.22), spec.get("fps", 30)
VOICE_AT = spec.get("voiceAt", 0.06)
out = vdir / "build" / "vo"; out.mkdir(parents=True, exist_ok=True)

lex = {}
for p in (TOOLS.parent / "pronunciations.json", vdir / "pronunciations.json"):
    if p.exists():
        lex.update({k: v for k, v in json.load(open(p)).items() if not k.startswith("_")})
keys = sorted(lex, key=len, reverse=True)
pattern = re.compile("|".join(r"(?<![\w\[])" + re.escape(k) + r"(?![\w\]])" for k in keys)) if keys else None

def mark(text):
    return pattern.sub(lambda m: f"[{m.group(0)}]({lex[m.group(0)]})", text) if pattern else text

cache_file = out / "cache.json"
cache = json.load(open(cache_file)) if cache_file.exists() else {}
pipe = None
SR = 24000

def record(text):
    global pipe
    if pipe is None:
        from kokoro import KPipeline
        pipe = KPipeline(lang_code="a")
    pieces, words, t = [], [], 0.0
    for r in pipe(mark(text), voice=voice, speed=speed):
        a = r.audio.numpy()
        toks = list(r.tokens or [])
        # fill missing timestamps by interpolation inside this chunk
        for i, tk in enumerate(toks):
            s, e = tk.start_ts, tk.end_ts
            if s is None:
                s = words[-1][1] - t if words else 0.0
            if e is None:
                e = s + 0.12
            words.append([round(t + s, 3), round(t + e, 3), tk.text])
        pieces.append(a)
        t += len(a) / SR
    return np.concatenate(pieces), words

timing_beats, start, srt, n = [], 0, [], 1
for b in spec["beats"]:
    text = b.get("text", "").strip()
    pad = b.get("pad", 0.25)
    words, audio = [], 0.0
    if text:
        h = hashlib.sha1(f"{text}|{voice}|{speed}|{json.dumps(lex, sort_keys=True)}".encode()).hexdigest()[:16]
        wav_path = out / f"{b['id']}.wav"
        if cache.get(b["id"], {}).get("hash") == h and wav_path.exists():
            words = cache[b["id"]]["words"]; audio = cache[b["id"]]["audio"]
        else:
            wav, words = record(text)
            sf.write(wav_path, wav, SR)
            audio = round(len(wav) / SR, 3)
            cache[b["id"]] = {"hash": h, "words": words, "audio": audio}
            print(b["id"], f"{audio:.2f}s", text[:70], flush=True)
        frames = math.ceil((VOICE_AT + audio + pad) * fps)
    else:
        frames = math.ceil(b.get("hold", 1.0) * fps)
    w_rel = [[round(VOICE_AT + s, 3), round(VOICE_AT + e, 3), w] for s, e, w in words]
    timing_beats.append({"id": b["id"], "shot": b.get("shot", b["id"]), "start": start, "frames": frames,
                         "audio": audio, "voiceAt": VOICE_AT, "text": text, "words": w_rel,
                         "sfx": b.get("sfx", [])})
    # subtitles: chunks of up to 7 words, broken at punctuation
    chunk = []
    for s, e, w in w_rel:
        if not chunk and not re.search(r"\w", w):
            continue
        chunk.append((s, e, w))
        if (len([c for c in chunk if re.search(r"\w", c[2])]) >= 7 and re.search(r"\w", w)) or w in ".?!;:,":
            txt = ""
            for _, _, cw in chunk:
                txt += cw if (not txt or not re.search(r"\w", cw[0]) and cw not in "$") else " " + cw
            srt.append((start / fps + chunk[0][0], start / fps + chunk[-1][1], txt.strip()))
            chunk = []
    if chunk:
        txt = " ".join(c[2] for c in chunk)
        srt.append((start / fps + chunk[0][0], start / fps + chunk[-1][1], txt.strip()))
    start += frames

json.dump(cache, open(cache_file, "w"), indent=0)
timing = {"fps": fps, "total": start, "voice": voice, "speed": speed,
          "engine": "Kokoro-82M (hexgrad, Apache 2.0)", "beats": timing_beats}
(vdir / "build").mkdir(exist_ok=True)
json.dump(timing, open(vdir / "build" / "timing.json", "w"), indent=1, ensure_ascii=False)

def ts(x):
    ms = int(round(x * 1000)); h, ms = divmod(ms, 3600000); m, ms = divmod(ms, 60000); s, ms = divmod(ms, 1000)
    return f"{h:02}:{m:02}:{s:02},{ms:03}"
with open(vdir / "build" / "captions.srt", "w") as f:
    for i, (a, e, t) in enumerate([x for x in srt if x[2]], 1):
        t = re.sub(r"\s+([,.?!;:%])", r"\1", t)
        f.write(f"{i}\n{ts(a)} --> {ts(max(e, a + 0.6))}\n{t}\n\n")
if args.to:
    Path(args.to).mkdir(parents=True, exist_ok=True)
    shutil.copy(vdir / "build" / "timing.json", Path(args.to) / "timing.json")
print(f"total {start / fps:.1f}s ({start} frames), {len(timing_beats)} beats")
