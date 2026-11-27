"""EP04 audio (neon cut): ambient pad + sparse felt piano, warm swell at "AGE 30"; phone SFX.

usage: python3 scripts/make_ep04_audio.py public/audio
"""
import os
import sys
import wave

import numpy as np

SR = 44100
OUT = sys.argv[1] if len(sys.argv) > 1 else "public/audio"
rng = np.random.default_rng(41)


def write(name, x):
    x = np.asarray(x, dtype=np.float64)
    if x.ndim == 1:
        x = np.stack([x, x], axis=1)
    x = x / (np.max(np.abs(x)) or 1) * 0.89
    with wave.open(os.path.join(OUT, name), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((x * 32767).astype(np.int16).tobytes())


def t_(d):
    return np.arange(int(SR * d)) / SR


def lowpass(x, cutoff):
    a = 1 - np.exp(-2 * np.pi * cutoff / SR)
    y = np.zeros_like(x)
    acc = 0.0
    for i in range(len(x)):
        acc += a * (x[i] - acc)
        y[i] = acc
    return y


def hz(n):
    names = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11, "Bb": 10, "Eb": 3, "Ab": 8}
    return 440 * 2 ** ((names[n[:-1]] + 12 * (int(n[-1]) + 1) - 69) / 12)


# ---------- SFX ----------
t = t_(0.9)
buzz = np.sin(2 * np.pi * 150 * t) * (np.sin(2 * np.pi * 30 * t) > 0) * ((t % 0.45) < 0.32)
write("buzz.wav", lowpass(buzz, 900))
t = t_(0.18)
write("blip.wav", np.sin(2 * np.pi * (700 + 500 * t / 0.18) * t) * np.exp(-t * 22))
t = t_(0.7)
write("ping.wav", (np.sin(2 * np.pi * 1568 * t) + 0.5 * np.sin(2 * np.pi * 2093 * t) * (t > 0.09)) * np.exp(-t * 6))
ring = np.zeros(int(2.2 * SR))
for st in (0.0, 1.1):
    tt = t_(0.7)
    r = (np.sin(2 * np.pi * 440 * tt) + np.sin(2 * np.pi * 480 * tt)) * ((tt % 0.1) < 0.07) * 0.5
    i0 = int(st * SR)
    ring[i0 : i0 + len(r)] += r
write("ring.wav", lowpass(ring, 3000))
t = t_(0.5)
write("decline.wav", np.sin(2 * np.pi * np.where(t < 0.18, 620, 410) * t) * np.exp(-t * 5) * (t < 0.42))


# ---------- score ----------
def felt(f, d=3.0, vel=0.5):
    t = t_(d)
    x = sum((1 / n ** 1.6) * np.sin(2 * np.pi * f * n * t + rng.uniform(0, 6)) * np.exp(-t * (1.2 + 0.9 * n)) for n in range(1, 7))
    a = np.minimum(1, t / 0.012)
    return lowpass(x * a * vel, 2600)


def pad(freqs, d, vel=0.3):
    t = t_(d)
    x = np.zeros(len(t))
    for f in freqs:
        for det in (-0.005, 0, 0.005):
            x += np.sin(2 * np.pi * f * (1 + det) * t + rng.uniform(0, 6))
    x = lowpass(x, 900)
    return x * np.minimum(1, t / 2.0) * np.minimum(1, (d - t) / 1.6).clip(0) * vel / len(freqs)


DUR = 32.5
BAR = 22.6 / 7
mix = np.zeros(int(DUR * SR) + SR * 8)


def place(x, at, g=1.0):
    st = int(at * SR)
    e = min(len(mix), st + len(x))
    mix[st:e] += x[: e - st] * g


CH = {
    "Am": ["A2", "E3", "A3", "C4", "E4"],
    "F": ["F2", "C3", "F3", "A3", "C4"],
    "C": ["C3", "G3", "C4", "E4", "G4"],
    "G": ["G2", "D3", "G3", "B3", "D4"],
    "Fmaj7": ["F2", "C3", "E3", "A3", "C4"],
}
prog = ["Am", "F", "C", "G", "Am", "F", "G", "F", "C", "Fmaj7"]
for b, ch in enumerate(prog):
    tones = CH[ch]
    t0 = b * BAR
    place(pad([hz(n) for n in tones[1:]], BAR * 1.5, 0.5 if b < 7 else 0.75), t0)
    place(felt(hz(tones[0]), 4.0, 0.35), t0)
    notes = [3, 4] if b < 7 else [2, 3, 4, 3]
    for i, idx in enumerate(notes):
        place(felt(hz(tones[idx]) * 2, 2.8, 0.28 if b < 7 else 0.36), t0 + (i + 1) * BAR / (len(notes) + 1))
mel = [(7, 0.0, "C5"), (7, 1.0, "E5"), (7, 2.0, "A5"), (8, 0.0, "G5"), (8, 1.5, "E5"), (8, 2.5, "D5"), (9, 0.0, "C5"), (9, 1.0, "E5")]
for bar, beat, n in mel:
    place(felt(hz(n), 4.0, 0.5), bar * BAR + beat * BAR / 4)

dry = mix[: int(DUR * SR)]
n_ir = int(3.2 * SR)
tt = np.arange(n_ir) / SR
irs = [rng.standard_normal(n_ir) * np.exp(-tt * 1.8) for _ in range(2)]
nfft = 1 << int(np.ceil(np.log2(len(dry) + n_ir)))
D = np.fft.rfft(dry, nfft)
wet = [np.fft.irfft(D * np.fft.rfft(ir, nfft), nfft)[: len(dry)] for ir in irs]
wet = [w / np.max(np.abs(w)) for w in wet]
d = dry / np.max(np.abs(dry))
fade = np.ones(len(d))
fade[-int(1.8 * SR):] = np.linspace(1, 0, int(1.8 * SR))
write("ep04-music.wav", np.stack([(0.6 * d + 0.5 * wet[0]) * fade, (0.6 * d + 0.5 * wet[1]) * fade], axis=1))
print("EP04 audio written to", OUT)
