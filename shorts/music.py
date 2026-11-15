#!/usr/bin/env python3
"""Original signature music loops for the text-story format (textstory.py).

Every loop is exactly `bars` chords long and wraps seamlessly: three cycles are
rendered through the reverb and the middle one is kept, so reverb tails and
held notes carry across the loop point.

    python3 music.py --out signature.wav                 # default "night" loop
    python3 music.py --preset dawn --out dawn.wav        # hopeful major loop
"""
import argparse

import numpy as np
import soundfile as sf

SR = 44100

PRESETS = {
    # A-minor area: Fmaj7 - C/E - Dm7 - Esus4>E (deceptive pull back into F)
    "night": dict(
        dur=7.0, beats_per_chord=2,
        chords=[[41, 53, 57, 60, 64], [40, 52, 55, 60, 64], [38, 50, 57, 60, 65], [40, 52, 57, 59, 64]],
        resolve={3: [40, 52, 56, 59, 64]},      # sus4 -> major third on the last beat
        melody=[(0, 76), (1, 72), (2, 74), (3, 72), (4, 72), (5, 69), (6, 71), (7, 68)],
        cutoff=1600, bright=0.95, seed=11),
    # D-major area: G - D/F# - Em7 - A (warm, hopeful)
    "dawn": dict(
        dur=7.0, beats_per_chord=2,
        chords=[[43, 55, 59, 62, 67], [42, 54, 57, 62, 66], [40, 52, 55, 59, 62], [45, 57, 61, 64, 69]],
        resolve={},
        melody=[(0, 74), (1, 71), (2, 73), (3, 74), (4, 71), (5, 67), (6, 69), (7, 73)],
        cutoff=2200, bright=1.1, seed=5),
}


def hz(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def lp(x, fc, order=2):
    from scipy.signal import butter, sosfilt
    sos = butter(order, fc, "low", fs=SR, output="sos")
    return sosfilt(sos, x, axis=0)


def hp(x, fc, order=2):
    from scipy.signal import butter, sosfilt
    sos = butter(order, fc, "high", fs=SR, output="sos")
    return sosfilt(sos, x, axis=0)


def saw(f, t, phase=0.0):
    # band-limited-ish saw: additive partials up to ~6 kHz
    n = max(1, int(6000 / f))
    k = np.arange(1, n + 1)[:, None]
    return (np.sin(2 * np.pi * k * (f * t + phase)) / k).sum(0) * (2 / np.pi)


def strings(midi, dur, rng, amp, cutoff, attack=0.45, release=0.7):
    """Warm, clean string/organ pad: few soft harmonics, light 3-voice chorus."""
    n = int((dur + release) * SR); t = np.arange(n) / SR
    f0 = hz(midi)
    vib = 1 + 0.0018 * np.sin(2 * np.pi * (4.8 + 0.4 * rng.random()) * t + rng.random() * 6)
    L = np.zeros(n); R = np.zeros(n)
    nh = max(1, min(7, int(cutoff / f0)))
    for d, pan in ((-0.0035, 0.3), (0.0, 0.5), (0.004, 0.7)):
        ph = 2 * np.pi * f0 * (1 + d) * np.cumsum(vib) / SR
        w = sum(np.sin(k * ph + rng.random()) / k ** 2.2 for k in range(1, nh + 1))
        L += w * (1 - pan); R += w * pan
    env = np.minimum(1, t / attack) ** 1.6
    env *= np.clip((dur + release - t) / release, 0, 1) ** 1.5
    return np.stack([L, R], 1) * env[:, None] * amp / 3


def piano(midi, dur, amp, rng):
    """Additive soft piano: inharmonic partials, per-partial decay, hammer noise."""
    n = int(dur * SR); t = np.arange(n) / SR
    f0 = hz(midi); B = 0.00035
    y = np.zeros(n)
    for k in range(1, 7):
        fk = k * f0 * np.sqrt(1 + B * k * k)
        if fk > 6000:
            break
        a = 1 / k ** 1.8
        dec = 1.1 + 0.55 * k + f0 / 900
        y += a * np.sin(2 * np.pi * fk * t + rng.random()) * np.exp(-t * dec)
    y *= 1 - np.exp(-t * 250)
    pan = 0.4 + 0.2 * rng.random()
    return np.stack([y * (1 - pan), y * pan], 1) * amp


def reverb_ir(seconds=2.4, seed=3):
    rng = np.random.default_rng(seed)
    n = int(seconds * SR); t = np.arange(n) / SR
    ir = rng.standard_normal((n, 2)) * np.exp(-t * 6.9 / seconds)[:, None]
    ir = lp(ir, 3200, 2)
    ir[: int(0.012 * SR)] *= np.linspace(0, 1, int(0.012 * SR))[:, None]
    return ir / np.sqrt((ir ** 2).sum(0))


def convolve(x, ir):
    from scipy.signal import fftconvolve
    return np.stack([fftconvolve(x[:, c], ir[:, c])[: len(x)] for c in range(2)], 1)


def render(preset="night", cycles=3):
    p = PRESETS[preset]; rng = np.random.default_rng(p["seed"])
    dur = p["dur"]; nch = len(p["chords"]); beat = dur / (nch * p["beats_per_chord"])
    total = dur * cycles
    out = np.zeros((int(total * SR) + SR * 4, 2))

    def add(sig, at):
        i = int(at * SR)
        if i < 0:
            sig = sig[-i:]; i = 0
        out[i:i + len(sig)] += sig[: len(out) - i]

    for c in range(cycles):
        rng = np.random.default_rng(p["seed"])   # identical cycles -> seamless wrap
        base = c * dur
        for k, ch in enumerate(p["chords"]):
            t0 = base + k * beat * p["beats_per_chord"]
            span = beat * p["beats_per_chord"]
            res = p["resolve"].get(k)
            parts = [(ch, t0, span)] if not res else [(ch, t0, beat), (res, t0 + beat, beat)]
            for notes, at, ln in parts:
                bass, *upper = notes
                add(strings(bass, ln + 0.1, rng, 0.3, 700, attack=0.25), at)
                add(strings(bass - 12, ln + 0.1, rng, 0.1, 300, attack=0.3), at)
                for m in upper:
                    add(strings(m, ln + 0.1, rng, 0.3, p["cutoff"]), at)
        for b, m in p["melody"]:
            add(piano(m, 2.6, 0.16 * p["bright"] * (0.9 + 0.2 * rng.random()), rng), base + b * beat)
            add(piano(m - 12, 2.6, 0.05, rng), base + b * beat + 0.012)
    out = hp(out, 35, 2)
    wet = convolve(out, reverb_ir())
    mix = 0.8 * out + 0.38 * wet
    # gentle glue compression, then keep the middle cycle: tails from the previous
    # cycle wrap in, so it loops cleanly
    env = np.sqrt(lp(mix.mean(1, keepdims=True) ** 2, 4, 1)).clip(1e-6)
    mix = mix * np.minimum(1, (env / env.max()) ** -0.25)
    i0 = int(dur * (cycles // 2) * SR); seg = mix[i0:i0 + int(dur * SR)]
    return (seg / np.abs(seg).max() * 0.89).astype(np.float32)


def loudnorm(y, target=-14.0):
    import pyloudnorm as pyln
    meter = pyln.Meter(SR)
    tiled = np.concatenate([y] * 3)
    return (y * 10 ** ((target - meter.integrated_loudness(tiled)) / 20)).clip(-0.98, 0.98).astype(np.float32)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--preset", default="night", choices=sorted(PRESETS))
    ap.add_argument("--out", required=True)
    ap.add_argument("--lufs", type=float, default=-14.0)
    a = ap.parse_args()
    y = render(a.preset)
    try:
        y = loudnorm(y, a.lufs)
    except ImportError:
        pass
    sf.write(a.out, y, SR)
    print(a.out, len(y) / SR, "s")
