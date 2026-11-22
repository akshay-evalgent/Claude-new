#!/usr/bin/env python3
"""Original nostalgic bed for Then vs Now edits: 117.5 BPM, one chord per photo (4 beats = 2.043 s).

    python3 tvn/music_tvn.py <seconds> <out.wav>

The reference Shorts use a trending vocal song added in the YouTube app; this is the fallback for uploads where
no in-app sound is added. Every cut lands on a chord change. No intro (the first photo is on screen at frame 0),
no fade-out (Shorts loop). Mastered to -14 LUFS, peaks under -1 dBFS.
"""
import os
import sys

import numpy as np
import soundfile as sf

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import music as mu  # noqa: E402

SR = mu.SR
BPM = 117.5
SPB = 60 / BPM
# Am9 - Fmaj7 - C(add9) - G6 : the "time passes" vi-IV-I-V loop, voiced warm and low
CHORDS = [[45, 57, 60, 64, 67, 71], [41, 53, 57, 60, 64, 67], [48, 55, 60, 62, 64, 67], [43, 55, 59, 62, 64, 66]]
TOP = [[76, 74, 72], [72, 69, 67], [74, 72, 67], [71, 67, 74]]        # a sparse bell answer per chord


def kick(amp):
    n = int(0.35 * SR); t = np.arange(n) / SR
    f = 48 + 70 * np.exp(-t * 30)
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 9)
    return np.stack([y, y], 1) * amp


def snap(amp, rng):
    n = int(0.25 * SR); t = np.arange(n) / SR
    y = mu.hp(rng.standard_normal(n), 1400) * (np.exp(-t * 38) + 0.3 * np.exp(-t * 12))
    y += 0.4 * np.sin(2 * np.pi * 210 * t) * np.exp(-t * 40)
    return np.stack([y, y], 1) * amp


def shaker(amp, rng, pan):
    n = int(0.09 * SR); t = np.arange(n) / SR
    y = mu.hp(rng.standard_normal(n), 6000) * np.minimum(1, t / 0.012) * np.exp(-t * 45)
    return np.stack([y * (1 - pan), y * pan], 1) * amp


def render(seconds, seed=7):
    rng = np.random.default_rng(seed)
    n = int((seconds + 3) * SR)
    dry, verb_send, drums = np.zeros((n, 2)), np.zeros((n, 2)), np.zeros((n, 2))
    side = np.ones(n)

    def add(buf, x, at):
        p = int(at * SR)
        if p < n:
            buf[p:p + len(x)] += x[: n - p]

    bars = int(np.ceil(seconds / (4 * SPB)))
    for b in range(bars):
        t0 = b * 4 * SPB
        ch = CHORDS[b % 4]
        # pad under everything, piano stabs on beat 1 and the "and" of 2 (a slow R&B lilt)
        for m in ch[1:]:
            add(dry, mu.strings(m, 4 * SPB, rng, 0.09, 2400, attack=0.25, release=0.4), t0)
        for at, vel in ((0, 0.22), (1.5 * SPB, 0.14), (3 * SPB, 0.10)):
            for m in ch[1:]:
                x = mu.piano(m + 12 if m < 55 else m, 1.6, vel, rng); add(dry, x, t0 + at); add(verb_send, x * 0.9, t0 + at)
        bass = mu.sub_pulse(ch[0], 4 * SPB, 0.07, SPB / 2); add(dry, bass, t0)
        for i, m in enumerate(TOP[b % 4]):
            x = mu.bell(m, 1.4, 0.06); add(verb_send, x, t0 + (2 + i * 0.5) * SPB); add(dry, x * 0.5, t0 + (2 + i * 0.5) * SPB)
        # drums: kick 1 and 3 (+ a pickup), snap 2 and 4, shaker eighths
        for beat in range(4):
            tb = t0 + beat * SPB
            if beat in (0, 2):
                add(drums, kick(0.32), tb)
                p = int(tb * SR); k = np.arange(min(n - p, int(0.25 * SR)))
                side[p:p + len(k)] = np.minimum(side[p:p + len(k)], 1 - 0.35 * np.exp(-k / SR / 0.08))
            if beat in (1, 3):
                x = snap(0.16, rng); add(drums, x, tb); add(verb_send, x * 0.6, tb)
            for h in (0, 0.5):
                add(drums, shaker(0.05 if h else 0.035, rng, 0.35 if h else 0.65), tb + h * SPB)
        add(drums, kick(0.16), t0 + 3.75 * SPB)
    wet = mu.convolve(verb_send, mu.reverb_ir(2.2))
    y = (dry + wet * 0.35) * side[:, None] + drums
    y = y[: int(seconds * SR)]
    y = np.tanh(y * 1.2) / 1.2
    lim = 10 ** (-1 / 20)
    for _ in range(3):                                      # normalise, soft-limit, repeat (limiting lowers loudness a little)
        y = mu.loudnorm_gain(y, -14.0)
        if np.abs(y).max() > lim:
            y = np.tanh(y / lim) * lim
    return y.astype(np.float32)


if __name__ == "__main__":
    sec, out = float(sys.argv[1]), sys.argv[2]
    y = render(sec)
    sf.write(out, y, SR)
    import pyloudnorm as pyln
    print(f"{out}: {len(y) / SR:.2f}s, {pyln.Meter(SR).integrated_loudness(y):.1f} LUFS, peak {20 * np.log10(np.abs(y).max()):.1f} dBFS")
