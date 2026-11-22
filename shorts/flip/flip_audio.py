#!/usr/bin/env python3
"""Sound for a flip story: an original soft piano piece (one chord per page) plus paper and shutter sounds.

    python3 flip/flip_audio.py <sfx.json> <seconds> <out.wav>

sfx.json comes from the page (window.SFX + window.TIMELINE): flip / land / shutter events and the bar length.
Pages land on bar lines, so every new scene arrives with a new chord. Mastered to -14 LUFS, peaks under -1 dBFS.
"""
import json
import os
import sys

import numpy as np
import soundfile as sf

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT); sys.path.insert(0, os.path.join(ROOT, "spike_v2"))
import music as mu  # noqa: E402
import sfx as fx    # noqa: E402

SR = mu.SR
# C - G/B - Am7 - Fmaj7 - C/E - Dm7 - G - C : a slow, warm "growing up" progression
PROG = [[48, 55, 60, 62, 64, 67], [47, 55, 59, 62, 67, 74], [45, 52, 57, 60, 64, 67], [41, 53, 57, 60, 64, 69],
        [40, 52, 55, 60, 64, 67], [38, 50, 57, 60, 62, 65], [43, 50, 55, 59, 62, 67], [36, 48, 55, 60, 64, 72]]
MEL = [[76, 74], [74, 71], [72, 76], [77, 76], [76, 79], [77, 74], [74, 71], [72]]


def paper_flip(seed):
    n = int(0.55 * SR); t = np.arange(n) / SR
    env = np.minimum(1, t / 0.07) * np.exp(-np.maximum(0, t - 0.12) * 7)
    crinkle = 1 + 0.6 * (np.random.default_rng(seed).random(n) > 0.997).astype(float).cumsum() % 2
    hi = fx._f("band", [1800, 7500], fx._noise(n, seed)) * env * crinkle
    lo = fx._f("band", [250, 1200], fx._noise(n, seed + 5)) * env * 0.6
    y = hi * 0.55 + lo
    pan = np.linspace(0.25, -0.25, n)
    return np.stack([y * np.cos((pan + 1) * np.pi / 4), y * np.sin((pan + 1) * np.pi / 4)], 1) * 0.35


def paper_land(seed):
    n = int(0.25 * SR); t = np.arange(n) / SR
    y = fx._f("low", 380, fx._noise(n, seed)) * np.exp(-t * 28) * 1.6 + fx._f("band", [2000, 6000], fx._noise(n, seed + 1)) * np.exp(-t * 60) * 0.25
    return np.stack([y, y], 1) * 0.5


def music(seconds, bar, seed=4):
    rng = np.random.default_rng(seed)
    n = int((seconds + 4) * SR); dry = np.zeros((n, 2)); send = np.zeros((n, 2))
    beat = bar / 4

    def add(buf, x, at):
        p = int(at * SR)
        if p < n:
            buf[p:p + len(x)] += x[: n - p]

    bars = int(np.ceil(seconds / bar))
    for b in range(bars):
        ch = PROG[min(b, len(PROG) - 1)]; t0 = b * bar
        last = b >= len(PROG) - 1 or (b + 1) * bar >= seconds
        # left hand: root on the bar, fifth on beat 3
        add(dry, mu.piano(ch[0], bar * 1.1, 0.30, rng), t0); add(send, mu.piano(ch[0], bar, 0.22, rng), t0)
        if not last:
            add(dry, mu.piano(ch[1], bar * 0.6, 0.18, rng), t0 + 2 * beat)
        # right hand: gentle eighth-note arpeggio (held chord on the final bar)
        if last:
            for m in ch[2:]:
                x = mu.piano(m, bar * 1.6, 0.13, rng); add(dry, x, t0); add(send, x, t0)
        else:
            pat = [ch[2], ch[3], ch[4], ch[5], ch[4], ch[3], ch[4], ch[5]]
            for i, m in enumerate(pat):
                x = mu.piano(m, beat * 1.4, 0.085 + (0.03 if i == 0 else 0), rng); add(dry, x, t0 + i * beat / 2); add(send, x * 0.8, t0 + i * beat / 2)
        # a simple melody on top from bar 2, louder for the last scene
        if b >= 1:
            for i, m in enumerate(MEL[min(b, len(MEL) - 1)]):
                x = mu.piano(m, beat * 2.2, 0.14 if b < 5 else 0.18, rng); add(dry, x, t0 + i * 2 * beat + 0.02); add(send, x, t0 + i * 2 * beat + 0.02)
        # strings swell in for the second half
        if b >= 2:
            amp = 0.035 if b < 5 else 0.06
            for m in ch[1:5]:
                add(dry, mu.strings(m, bar, rng, amp, 2200, attack=0.9, release=1.2), t0)
    wet = mu.convolve(send, mu.reverb_ir(3.2))
    y = dry + wet * 0.55
    return y[: int(seconds * SR)]


def main():
    ev = json.load(open(sys.argv[1])); seconds = float(sys.argv[2]); out = sys.argv[3]
    bar = ev.get("bar", 60 / 72 * 4)
    y = music(seconds, bar)
    y = mu.loudnorm_gain(y.astype(np.float32), -17.0)                  # music sits under the effects
    sfx = np.zeros_like(y)
    for i, e in enumerate(ev["sfx"]):
        x = {"flip": lambda: paper_flip(i), "land": lambda: paper_land(i), "shutter": lambda: fx.shutter(i) * 1.1}[e["name"]]()
        p = int(e["t"] * SR)
        if p < len(sfx):
            sfx[p:p + len(x)] += x[: len(sfx) - p]
    mix = y + sfx * 0.9
    lim = 10 ** (-1 / 20)
    for _ in range(3):
        mix = mu.loudnorm_gain(mix.astype(np.float32), -14.0)
        if np.abs(mix).max() > lim:
            mix = np.tanh(mix / lim) * lim
    sf.write(out, mix.astype(np.float32), SR)
    import pyloudnorm as pyln
    print(f"{out}: {len(mix) / SR:.2f}s, {pyln.Meter(SR).integrated_loudness(mix):.1f} LUFS, peak {20 * np.log10(np.abs(mix).max()):.1f} dBFS")


if __name__ == "__main__":
    main()
