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
    # tech/innovation: B minor -> G -> D -> A (vi-IV-I-V in D), pluck arpeggio over a pad
    "orbit": dict(
        style="tech", dur=7.0, beats_per_chord=2,
        chords=[[47, 59, 62, 66], [43, 59, 62, 67], [50, 57, 62, 66], [45, 57, 61, 64]],
        bells=[78, 74, 78, 76], cutoff=2600, seed=21),
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


def pluck(midi, dur, amp, pan, cutoff=3800):
    """Plucky synth: bright harmonics that die away faster than the fundamental."""
    n = int(dur * SR); t = np.arange(n) / SR; f0 = hz(midi)
    y = np.zeros(n)
    for k in range(1, 12):
        if k * f0 > cutoff:
            break
        y += np.sin(2 * np.pi * k * f0 * t) / k * np.exp(-t * (5 + 2.2 * k))
    y *= 1 - np.exp(-t * 400)
    return np.stack([y * (1 - pan), y * pan], 1) * amp


def bell(midi, dur, amp):
    n = int(dur * SR); t = np.arange(n) / SR; f0 = hz(midi)
    y = sum(a * np.sin(2 * np.pi * f0 * r * t) * np.exp(-t * d)
            for r, a, d in ((1, 1, 1.6), (2.76, 0.35, 3.5), (5.4, 0.12, 6)))
    y *= 1 - np.exp(-t * 600)
    return np.stack([y, y], 1) * amp


def sub_pulse(midi, dur, amp, eighth):
    """Sine sub-bass that ducks on every eighth note (side-chain pump)."""
    n = int(dur * SR); t = np.arange(n) / SR; f0 = hz(midi)
    y = np.sin(2 * np.pi * f0 * t) + 0.18 * np.sin(4 * np.pi * f0 * t)
    ph = (t % eighth)
    y *= 0.3 + 0.7 * (1 - np.exp(-ph / 0.09))
    y *= np.minimum(1, t / 0.05) * np.clip((dur - t) / 0.08, 0, 1)
    return np.stack([y, y], 1) * amp


def thump(amp):
    n = int(0.3 * SR); t = np.arange(n) / SR
    f = 42 + 80 * np.exp(-t * 25)
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 11)
    return np.stack([y, y], 1) * amp


def tick(amp, rng, pan):
    n = int(0.05 * SR); t = np.arange(n) / SR
    y = hp(rng.standard_normal(n), 7000, 2) * np.exp(-t * 90)
    return np.stack([y * (1 - pan), y * pan], 1) * amp


def render_tech(p, cycles=3):
    """Futuristic loop: 16th-note pluck arpeggio with ping-pong echoes, warm pad,
    pumping sub-bass, soft pulse and a bell on each chord change."""
    dur = p["dur"]; nch = len(p["chords"]); beat = dur / (nch * p["beats_per_chord"])
    six = beat / 4
    out = np.zeros((int(dur * cycles * SR) + SR * 4, 2))

    def add(sig, at):
        i = int(round(at * SR))
        out[i:i + len(sig)] += sig[: len(out) - i]

    for c in range(cycles):
        rng = np.random.default_rng(p["seed"])
        base = c * dur
        for k, ch in enumerate(p["chords"]):
            t0 = base + k * beat * p["beats_per_chord"]; span = beat * p["beats_per_chord"]
            bass, *upper = ch
            for m in upper:
                add(strings(m, span + 0.15, rng, 0.17, p["cutoff"], attack=0.5, release=0.6), t0)
            add(sub_pulse(bass - 12, span, 0.15, beat / 2), t0)
            arp = [u + 12 for u in upper] + [upper[0] + 24]
            pattern = [0, 1, 2, 3, 2, 1, 3, 2]
            for s in range(int(round(span / six))):
                m = arp[pattern[s % len(pattern)]]
                pan = 0.35 if s % 2 == 0 else 0.65
                v = 0.16 * (1.0 if s % 4 == 0 else 0.75)
                add(pluck(m, 0.6, v, pan), t0 + s * six)
                add(pluck(m, 0.6, v * 0.35, 1 - pan), t0 + s * six + 3 * six)   # ping-pong echo
            add(bell(p["bells"][k], 2.2, 0.09), t0)
            for b in range(p["beats_per_chord"]):
                add(thump(0.13), t0 + b * beat)
                add(tick(0.03, rng, 0.6), t0 + b * beat + beat / 2)
    out = hp(out, 30, 2)
    wet = convolve(out, reverb_ir(1.8, seed=9))
    mix = 0.85 * out + 0.3 * wet
    env = np.sqrt(lp(mix.mean(1, keepdims=True) ** 2, 4, 1)).clip(1e-6)
    mix = mix * np.minimum(1, (env / env.max()) ** -0.25)
    i0 = int(dur * (cycles // 2) * SR); seg = mix[i0:i0 + int(dur * SR)]
    return (seg / np.abs(seg).max() * 0.89).astype(np.float32)


def render(preset="night", cycles=3):
    p = PRESETS[preset]; rng = np.random.default_rng(p["seed"])
    if p.get("style") == "tech":
        return render_tech(p, cycles)
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


def loudnorm_gain(y, target=-14.0):
    """Gain to the target loudness, no clipping (follow with a limiter)."""
    import pyloudnorm as pyln
    meter = pyln.Meter(SR)
    return (y * 10 ** ((target - meter.integrated_loudness(np.concatenate([y] * 3))) / 20)).astype(np.float32)


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
