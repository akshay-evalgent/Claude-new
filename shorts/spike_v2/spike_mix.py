#!/usr/bin/env python3
"""Step 3 of a Spike Files v2 render: sound mix and mux.

    python3 spike_v2/spike_mix.py <workdir> <out.mp4>

Reads timeline.json, voice.wav, video.mp4 (silent) and sfx.json (events the scenes asked for) from <workdir>.
Builds the beat (drums drop out in the scenes' "breaks"), places the effects, ducks the music under the voice,
normalises to -14 LUFS with a -1 dBFS limiter, and writes the final file plus <out>_cover.jpg.
"""
import json
import os
import subprocess
import sys

import numpy as np
import soundfile as sf

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE); sys.path.insert(0, os.path.dirname(HERE))
import sfx  # noqa: E402
import music  # noqa: E402
from breakdown import limit  # noqa: E402

SR = 44100


def main():
    work, out = sys.argv[1], sys.argv[2]
    tl = json.load(open(os.path.join(work, "timeline.json"))); ev = json.load(open(os.path.join(work, "sfx.json")))
    n = int(tl["dur"] * SR)
    voice, _ = sf.read(os.path.join(work, "voice.wav"), dtype="float32", always_2d=True)
    voice = np.pad(voice, ((0, max(0, n - len(voice))), (0, 0)))[:n]
    if np.abs(voice).max() > 0:
        voice = voice / (np.sqrt(np.mean(voice[np.abs(voice).max(1) > 0.01] ** 2)) + 1e-9) * 0.11
    bed = sfx.beat(tl["dur"], tl.get("bpm", 124), [tuple(b) for b in ev.get("breaks", [])])
    bed = np.pad(bed, ((0, max(0, n - len(bed))), (0, 0)))[:n]
    fx = np.zeros((n, 2), np.float32)
    for e in ev.get("sfx", []):
        fn = sfx.SFX[e["name"]]; kw = {k: e[k] for k in ("dur", "count", "f0", "seed") if k in e}
        x = fn(**kw) * e.get("gain", 1.0); p = int(e["t"] * SR)
        if 0 <= p < n:
            fx[p:p + len(x)] += x[: n - p]
    # duck the beat under the voice (0.2 s window), keep it lively in the gaps
    k = int(0.2 * SR); lead = np.abs(voice).max(1)
    cs = np.concatenate([[0.0], np.cumsum(lead, dtype=np.float64)]); lo = np.clip(np.arange(n) - k // 2, 0, n); hi = np.clip(lo + k, 0, n)
    env = (cs[hi] - cs[lo]) / k
    duck = 10 ** ((tl.get("music_duck_db", -11) * np.clip(env / (env.max() + 1e-9) * 3, 0, 1)) / 20)
    mix = bed * duck[:, None] * tl.get("music_gain", 0.3) + voice + fx * tl.get("sfx_gain", 0.46)
    fade = int(0.25 * SR); mix[-fade:] *= np.linspace(1, 0, fade)[:, None]
    mix = limit(music.loudnorm_gain(mix.astype(np.float32), -14.0))
    wav = os.path.join(work, "mix.wav"); sf.write(wav, mix, SR)
    run = lambda c: subprocess.run(c, check=True, stdin=subprocess.DEVNULL)
    run(["ffmpeg", "-nostdin", "-v", "error", "-y", "-i", os.path.join(work, "video.mp4"), "-i", wav, "-map", "0:v", "-map", "1:a",
         "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", out])
    run(["ffmpeg", "-nostdin", "-v", "error", "-y", "-ss", str(tl.get("cover_t", 0.9)), "-i", out, "-frames:v", "1", "-q:v", "2",
         os.path.splitext(out)[0] + "_cover.jpg"])
    print(out, f"{tl['dur']:.1f}s", len(ev.get("sfx", [])), "sfx")


if __name__ == "__main__":
    main()
