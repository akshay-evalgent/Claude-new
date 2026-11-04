"""Synthesize the film's sound (no samples, nothing copyrighted).

python audio.py TIMELINE.json OUT.wav
TIMELINE: {"duration": s, "steps": [[t, "grass"|"gravel"], ...], "stars": [[t, dur, pan_from, pan_to], ...],
           "reveal": t, "exhale": t}
"""
import json
import sys
import wave

import numpy as np

SR = 48000
rng = np.random.default_rng(7)


def band(x, lo, hi):
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    X[(f < lo) | (f > hi)] = 0
    return np.fft.irfft(X, len(x))


def env(n, attack, decay):
    t = np.arange(n) / SR
    return np.minimum(t / attack, 1.0) * np.exp(-np.maximum(t - attack, 0) / decay)


def pan(mono, p):  # p in [-1, 1]
    a = (p + 1) * np.pi / 4
    return np.stack([mono * np.cos(a), mono * np.sin(a)], 1)


def place(buf, clip, t):
    i = int(t * SR)
    if i >= len(buf):
        return
    j = min(len(buf), i + len(clip))
    buf[i:j] += clip[: j - i]


def footstep(kind, k):
    n = int(0.32 * SR)
    gain = 10 ** (rng.uniform(-2.5, 1.0) / 20)
    noise = rng.standard_normal(n)
    if kind == "gravel":
        body = band(noise, 900, 7000) * env(n, 0.004, 0.11)
        clicks = np.zeros(n)
        for _ in range(rng.integers(14, 26)):
            clicks[int(rng.uniform(0, 0.16) * SR)] += rng.uniform(0.3, 1.0) * rng.choice([-1, 1])
        body = 0.55 * body + 0.9 * band(clicks, 2500, 12000)
    else:  # grass: soft swish + muffled heel
        body = band(noise, 350, 4200) * env(n, 0.012, 0.13)
        body += 0.35 * band(rng.standard_normal(n), 2500, 8000) * env(n, 0.03, 0.09)
    t = np.arange(n) / SR
    thud = np.sin(2 * np.pi * rng.uniform(65, 85) * t) * env(n, 0.003, 0.045)
    mono = gain * (0.16 * body / (np.abs(body).max() + 1e-9) + 0.24 * thud)
    return pan(mono, 0.12 if k % 2 else -0.12)


def crickets(dur):
    n = int(dur * SR)
    out = np.zeros((n, 2))
    t = np.arange(n) / SR
    for carrier, p, lvl in ((4400, -0.6, 0.020), (4750, 0.5, 0.016), (4100, 0.1, 0.010)):
        am = np.zeros(n)
        c = rng.uniform(0, 0.5)
        while c < dur:
            for k in range(rng.integers(3, 6)):
                s = int((c + k * 0.028) * SR)
                m = int(0.014 * SR)
                if s + m < n:
                    am[s:s + m] += np.hanning(m)
            c += rng.uniform(0.45, 0.85)
        out += pan(lvl * am * np.sin(2 * np.pi * carrier * t), p)
    chorus = band(rng.standard_normal(n), 4000, 5200) * (0.5 + 0.5 * np.sin(2 * np.pi * 31 * t))
    out += pan(0.004 * chorus / np.abs(chorus).max(), 0.0)
    return out


def wind(dur):
    n = int(dur * SR)
    w = band(np.cumsum(rng.standard_normal(n)) * 0.02 + rng.standard_normal(n) * 0.2, 40, 650)
    w /= np.abs(w).max()
    t = np.arange(n) / SR
    lfo = 0.6 + 0.4 * np.sin(2 * np.pi * 0.09 * t + 1.0)
    return np.stack([0.030 * w * lfo, 0.030 * np.roll(w, 2400) * lfo], 1)


def drone(dur, reveal):
    n = int(dur * SR)
    t = np.arange(n) / SR
    swell = np.clip(t / reveal, 0, 1) ** 1.6 * 0.55 + 0.45 * np.clip((t - reveal) / 3.0, 0, 1)
    swell *= np.clip(t / 1.5, 0, 1)
    pad = np.zeros((n, 2))
    for f, a in ((73.42, 1.0), (110.0, 0.8), (146.83, 0.6), (220.0, 0.45), (329.63, 0.3), (349.23, 0.18), (523.25, 0.12)):
        for det, p in ((-0.35, -0.5), (0.35, 0.5)):
            ph = rng.uniform(0, 2 * np.pi)
            pad += pan(a * np.sin(2 * np.pi * (f + det) * t + ph), p)
    pad *= 0.022 * swell[:, None]
    shimmer = np.zeros((n, 2))
    sh_env = np.clip((t - reveal + 0.5) / 2.5, 0, 1) * (0.6 + 0.4 * np.sin(2 * np.pi * 4.8 * t))
    for f, p in ((880.0, -0.4), (1318.5, 0.4), (1760.0, 0.0)):
        shimmer += pan(np.sin(2 * np.pi * f * t), p)
    return pad + 0.0045 * shimmer * sh_env[:, None]


def whoosh(dur, p0, p1):
    n = int(dur * SR)
    x = rng.standard_normal(n)
    out = np.zeros(n)
    seg = n // 12
    for k in range(12):  # downward sweep, piecewise band-pass
        f = 6000 * (1 - k / 12) + 900
        s = slice(k * seg, (k + 1) * seg if k < 11 else n)
        out[s] = band(x[s], f * 0.6, f * 1.3)
    out *= np.sin(np.pi * np.linspace(0, 1, n)) ** 1.5
    out /= np.abs(out).max() + 1e-9
    pans = np.linspace(p0, p1, n)
    a = (pans + 1) * np.pi / 4
    return 0.05 * np.stack([out * np.cos(a), out * np.sin(a)], 1)


def exhale():
    n = int(1.1 * SR)
    x = band(rng.standard_normal(n), 250, 2200)
    t = np.arange(n) / SR
    e = np.clip(t / 0.15, 0, 1) * np.exp(-np.maximum(t - 0.15, 0) / 0.35)
    x = x * e
    return pan(0.06 * x / np.abs(x).max(), 0.0)


def reverb(x, seconds=2.4, wet=0.32):
    n = int(seconds * SR)
    t = np.arange(n) / SR
    ir = np.stack([rng.standard_normal(n), rng.standard_normal(n)], 1) * np.exp(-t / (seconds / 6.9))[:, None]
    ir[: int(0.02 * SR)] = 0
    ir /= np.sqrt((ir ** 2).sum(0))
    m = len(x) + n
    size = 1 << (m - 1).bit_length()
    y = np.stack([np.fft.irfft(np.fft.rfft(x[:, c], size) * np.fft.rfft(ir[:, c], size), size)[: len(x)] for c in (0, 1)], 1)
    return (1 - wet) * x + wet * y


def main(tl_path, out):
    tl = json.load(open(tl_path))
    dur = tl["duration"]
    n = int(dur * SR)
    dry = np.zeros((n, 2))
    for k, (t, kind) in enumerate(tl["steps"]):
        place(dry, footstep(kind, k), t)
    amb = crickets(dur) + wind(dur) + drone(dur, tl["reveal"])
    for t, d, p0, p1 in tl["stars"]:
        place(amb, whoosh(d + 0.3, p0, p1), max(0, t - 0.1))
    if tl.get("exhale") is not None:
        place(dry, exhale(), tl["exhale"])
    mix = reverb(dry, 0.9, 0.18) + reverb(amb, 2.6, 0.38)
    tt = np.arange(n) / SR
    mix *= (np.clip(tt / 0.6, 0, 1) * np.clip((dur - tt) / 0.9, 0, 1))[:, None]
    mix = np.tanh(mix / (np.abs(mix).max() + 1e-9) * 1.2) * 0.89
    with wave.open(out, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((mix * 32767).astype(np.int16).tobytes())
    print("audio", out, f"{dur:.2f}s", len(tl["steps"]), "steps")


if __name__ == "__main__":
    main(*sys.argv[1:3])
