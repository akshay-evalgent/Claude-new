"""Generate one narration clip per shot with Kokoro and build timeline.json.

Usage: python3 tts.py [voice]
Writes build/voice/<id>.wav (24 kHz mono), build/voice.wav and build/timeline.json.
"""
import json, sys, os
import numpy as np
import soundfile as sf
from kokoro import KPipeline

HERE = os.path.dirname(os.path.abspath(__file__))
SR = 24000
script = json.load(open(os.path.join(HERE, "script.json")))
voice = sys.argv[1] if len(sys.argv) > 1 else script["voice"]
out = os.path.join(HERE, "build")
os.makedirs(os.path.join(out, "voice"), exist_ok=True)

pipe = KPipeline(lang_code=voice[0])


def trim(a, thr=0.004):
    idx = np.where(np.abs(a) > thr)[0]
    if len(idx) == 0:
        return a, 0.0
    s = max(0, idx[0] - int(0.02 * SR))
    e = min(len(a), idx[-1] + int(0.06 * SR))
    return a[s:e], s / SR


t = script["lead_in"]
timeline = []
chunks = []
for shot in script["shots"]:
    audio, words, off = [], [], 0.0
    for r in pipe(shot.get("say", shot["text"]), voice=voice, speed=script["speed"]):
        a = r.audio.numpy() if hasattr(r.audio, "numpy") else np.asarray(r.audio)
        for tok in (r.tokens or []):
            if not tok.text.strip():
                continue
            st = tok.start_ts if tok.start_ts is not None else (words[-1]["e"] - off if words else 0.0)
            en = tok.end_ts if tok.end_ts is not None else st
            words.append({"w": tok.text, "ws": bool(tok.whitespace), "s": off + st, "e": off + en})
        audio.append(a)
        off += len(a) / SR
    a = np.concatenate(audio).astype(np.float32)
    a, cut = trim(a)
    dur = len(a) / SR
    for w in words:
        w["s"] = round(max(0.0, w["s"] - cut), 3)
        w["e"] = round(min(dur, w["e"] - cut), 3)
    sf.write(os.path.join(out, "voice", shot["id"] + ".wav"), a, SR)
    timeline.append({"id": shot["id"], "text": shot["text"], "vs": round(t, 3), "ve": round(t + dur, 3), "words": words})
    chunks.append((t, a))
    t += dur + script["gap"] + shot.get("pause", 0.0)

end = timeline[-1]["ve"] + script["tail"]
# Cuts sit in the silent gap between phrases, slightly before the next voice.
for i, s in enumerate(timeline):
    if i == 0:
        s["start"] = 0.0
    else:
        prev = timeline[i - 1]["ve"]
        s["start"] = round(max(prev + 0.04, s["vs"] - 0.14), 3)
for i, s in enumerate(timeline):
    s["end"] = timeline[i + 1]["start"] if i + 1 < len(timeline) else round(end, 3)

total = int(np.ceil(end * SR))
mix = np.zeros(total, np.float32)
for st, a in chunks:
    i = int(st * SR)
    mix[i:i + len(a)] += a
sf.write(os.path.join(out, "voice.wav"), mix, SR)
json.dump({"voice": voice, "duration": round(end, 3), "shots": timeline}, open(os.path.join(out, "timeline.json"), "w"), indent=1)
print(f"voice={voice} duration={end:.2f}s shots={len(timeline)}")
for s in timeline:
    print(f'{s["id"]} {s["start"]:6.2f}-{s["end"]:6.2f} ({s["end"]-s["start"]:.2f}s) words={len(s["words"])}  {s["text"]}')
