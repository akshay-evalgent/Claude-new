#!/usr/bin/env python3
"""The film's sound track: tools/sound.py's own bed, hits and loudness, arranged as the script's sound_notes ask.

    python3 mix.py        (after build_voice.py and sync_words.py; writes track.wav here)

sound.py makes one unchanging bed that fades up from nothing over 0.8 s. The script asks for
three things it has no switch for, so this file reuses its parts (bed, hit, the voice duck,
the loudness pass) and changes only how they are laid out:
  - the bed is at its full level from the first frame (review: the same level under the
    title as under the first two lines); it still fades over the last 0.8 s, to the last frame;
  - one added layer of weight (an octave and a fifth under the bed's drone) comes in on the
    word "light", as the window lights, and leaves before the payoff line starts, so the
    payoff and the last line are thin again;
  - a soft hit on each of the seven line starts, and none on beat "love" (the second row of a
    line already on the sheet).
Loudness: benchmarks.json sound.integrated_lufs. No music: sources.json lists none.
"""
import json
import subprocess
import sys
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
RUN = HERE.parent.parent
sys.path.insert(0, str(RUN.parent.parent / "tools"))
import sound  # noqa: E402

SR = sound.SR
PEAK = -1.5


def ramp(n, t0, t1, up=True):
    """0 before t0, 1 after t1 (or the reverse), smooth in between."""
    t = np.arange(n) / SR
    p = np.clip((t - t0) / max(t1 - t0, 1e-6), 0, 1)
    p = p * p * (3 - 2 * p)
    return p if up else 1 - p


def main():
    timing = json.loads((HERE / "timing.json").read_text())
    words = json.loads((HERE / "words.json").read_text())["beats"]
    bench = json.loads((RUN / "02-analysis" / "benchmarks.json").read_text())
    lufs = bench["sound"]["integrated_lufs"]
    beats = {b["id"]: b for b in timing["beats"]}
    dur = timing["duration"]
    n = int(dur * SR)
    rng = np.random.default_rng(7)                      # sound.py's seed

    vo = sound.read_any(HERE / "vo.wav", dur)
    vo = vo / (np.abs(vo).max() + 1e-9) * 0.8
    k = int(0.15 * SR)
    env = np.convolve(np.abs(vo), np.ones(k) / k, mode="same")
    duck = 1 - 0.6 * np.clip(env / 0.05, 0, 1)          # sound.py: about 8 dB down while the voice speaks

    # the bed, without its fade-in: make it 0.8 s longer and drop the head
    head = int(0.8 * SR)
    bed = sound.bed(n + head, rng)[head:]
    bed[:int(0.03 * SR)] *= np.linspace(0, 1, int(0.03 * SR))      # 30 ms, so the first sample does not click

    # the added weight: from the word "light" to the start of the payoff line
    t = np.arange(n) / SR
    t_in = words["light"][1]["at"]
    t_out = beats["asking"]["shot_start"]
    low = sum(a * np.sin(2 * np.pi * f * t + p) * (0.8 + 0.2 * np.sin(2 * np.pi * lfo * t + p))
              for f, a, p, lfo in [(55.0, 1.0, 0.4, 0.06), (82.4, 0.8, 1.9, 0.09), (329.6, 0.22, 0.7, 0.13)])
    low = 0.045 * low / np.abs(low).max()
    low *= ramp(n, t_in, t_in + 0.9) * ramp(n, t_out - 1.2, t_out, up=False)

    mix = (bed + low) * duck

    hits = [beats[i]["shot_start"] for i in ("ask", "again", "until", "light", "fine", "asking", "home")]
    for ht in hits:
        h = sound.hit(rng)
        i = int(ht * SR)
        mix[i:i + len(h)] += h[:n - i] * 0.7            # sound.py's level for a hit under a voice
    mix = mix + vo

    out = HERE / "track.wav"
    tmp = HERE / "track.premix.wav"
    sound.write(tmp, mix / max(1.0, np.abs(mix).max()))
    got, _ = sound.measure(tmp)
    gain = lufs - got
    for _ in range(4):                                  # sound.py's loudness pass
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(tmp), "-af",
                        f"volume={gain:.2f}dB,alimiter=limit={10 ** (PEAK / 20):.4f}:level=disabled:attack=3:release=60",
                        "-ar", str(SR), "-c:a", "pcm_s16le", str(out)], check=True)
        got, peak = sound.measure(out)
        if got is None or abs(got - lufs) <= 0.3:
            break
        gain += lufs - got
    tmp.unlink(missing_ok=True)

    # what the bed does between the lines, measured on the finished track (voice-free stretches only)
    x = sound.read_any(out, dur)
    def level(a, b):
        s = x[int(a * SR):int(b * SR)]
        return round(float(20 * np.log10(np.sqrt((s ** 2).mean()) + 1e-9)), 1)
    rests = {"title 0.1-1.3": level(0.1, 1.3),
             "after line 1": level(beats["ask"]["vo_end"] + 0.1, beats["again"]["shot_start"] - 0.05),
             "after line 2": level(beats["again"]["vo_end"] + 0.1, beats["until"]["shot_start"] - 0.05),
             "after 'stays on.' (weight in)": level(beats["light"]["vo_end"] + 0.1, beats["fine"]["shot_start"] - 0.05),
             "after 'fine.' (weight in, leaving)": level(beats["fine"]["vo_end"] + 0.1, beats["asking"]["shot_start"] - 0.05),
             "after 'you.' (thin again)": level(beats["love"]["vo_end"] + 0.1, beats["home"]["shot_start"] - 0.05),
             "end hold, first 1.5 s": level(beats["home"]["vo_end"] + 0.1, beats["home"]["vo_end"] + 1.6),
             "last 0.2 s": level(dur - 0.2, dur)}
    info = {"lufs": got, "target_lufs": lufs, "peak_dbtp": peak, "duration": dur, "hits": hits,
            "weight_layer": [round(t_in, 3), round(t_out, 3)], "rest_levels_db": rests}
    (HERE / "mix.json").write_text(json.dumps(info, indent=1))
    print(json.dumps(info, indent=1))
    print(f"wrote {out}")


if __name__ == "__main__":
    main()
