#!/usr/bin/env python3
"""Step 1 of a Spike Files v2 render: narration -> timeline.

    TTS_CACHE=... python3 spike_v2/spike_tl.py edits_spike/<name>.json <workdir>

The script is a list of scenes; each scene has caption chunks: ["ON-SCREEN TEXT with *highlights*", "what the voice says"],
{"pause": 0.6}, or {"show": "...", "say": "...", "hide": true}. Every chunk is voiced on its own, so captions are
timed exactly; scene lengths follow the narration (snapped to the beat grid). Writes <workdir>/timeline.json and voice.wav.
"""
import json
import math
import os
import re
import sys

import numpy as np
import soundfile as sf

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
import render as rd  # noqa: E402

SR = 44100
rd.SR = SR


def main():
    spec = json.load(open(sys.argv[1])); work = sys.argv[2]; os.makedirs(work, exist_ok=True)
    cache = os.environ.get("TTS_CACHE", os.path.join(work, "tts")); os.makedirs(cache, exist_ok=True)
    voice, speed = spec.get("voice", "am_michael"), spec.get("speed", 1.15)
    gap, grid = spec.get("gap", 0.08), spec.get("grid", 60 / spec.get("bpm", 124) / 2)
    t = 0.0; track = np.zeros((int(240 * SR), 2), np.float32); scenes = []
    for sc in spec["scenes"]:
        t0 = t; t += sc.get("lead", 0.06); caps = []
        for ch in sc.get("say", []):
            if isinstance(ch, dict) and "pause" in ch:
                t += ch["pause"]; continue
            show, say, hide = (ch.get("show", ""), ch["say"], ch.get("hide", False)) if isinstance(ch, dict) else (ch[0], ch[1], False)
            a, path = rd.tts(say, voice, speed, cache)
            i0 = int(t * SR); track[i0:i0 + len(a)] += a; dur = len(a) / SR
            words = []; toks = [w for w in show.split(" ") if w]      # a non-breaking space keeps two words in one pop
            lens = [max(1, len(re.sub(r"\W", "", w))) for w in toks]; cum = np.cumsum([0] + lens) / max(1, sum(lens))
            for w, c in zip(toks, cum):
                words.append({"w": w.replace("*", ""), "hl": "*" in w or False, "t0": round(t + c * dur * 0.9, 3)})
            # *multi word highlight* spans
            on = False
            for w, tok in zip(words, toks):
                if tok.startswith("*"):
                    on = True
                w["hl"] = on
                if tok.rstrip(".,!?:").endswith("*"):
                    on = False
            caps.append({"text": show.replace("*", ""), "t0": round(t, 3), "t1": round(t + dur, 3), "words": words, "hide": hide})
            t += dur + (ch.get("gap", gap) if isinstance(ch, dict) else gap)
        t = max(t + sc.get("tail", 0.1), t0 + sc.get("min", 0))
        t = math.ceil(t / grid - 1e-6) * grid                    # cuts land on the beat grid
        scenes.append({**{k: v for k, v in sc.items() if k != "say"}, "t0": round(t0, 3), "t1": round(t, 3), "caps": caps})
    total = round(t, 3)
    sf.write(os.path.join(work, "voice.wav"), track[: int(total * SR)], SR)
    tl = {k: v for k, v in spec.items() if k != "scenes"}
    tl.update({"fps": 30, "dur": total, "scenes": scenes})
    json.dump(tl, open(os.path.join(work, "timeline.json"), "w"), indent=1)
    print(f"{total:.2f}s  " + "  ".join(f"{s['type']} {s['t1'] - s['t0']:.2f}" for s in scenes))


if __name__ == "__main__":
    main()
