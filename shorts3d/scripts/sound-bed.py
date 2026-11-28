#!/usr/bin/env python3
"""
Royalty-free sound bed, synthesised from scratch (no samples, no licences):
  music.wav   soft storybook-suspense loop: Am-F-C-G pad, plucked bass, ticking pulse
  crowd.wav   murmuring crowd roar (filtered noise with syllable-rate wobble)
  whoosh.wav  whip-pan swish

    python3 scripts/sound-bed.py public/stories/nobody [seconds]
"""
import sys, wave
from pathlib import Path
import numpy as np

SR = 48000
rng = np.random.default_rng(7)


def write(path, x):
    x = np.clip(x, -1, 1)
    st = np.stack([x, x], axis=1) if x.ndim == 1 else x
    with wave.open(str(path), "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((st * 32767).astype(np.int16).tobytes())




def fft_band(x, lo, hi):
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    w = np.clip((f - lo * 0.7) / (lo * 0.3 + 1e-9), 0, 1) * np.clip((hi * 1.3 - f) / (hi * 0.3), 0, 1)
    return np.fft.irfft(X * w, len(x))


def reverb(x, taps=((0.031, 0.35), (0.047, 0.28), (0.071, 0.22), (0.113, 0.16), (0.173, 0.11), (0.251, 0.07))):
    y = x.copy()
    for d, g in taps:
        n = int(d * SR)
        y[n:] += g * x[:-n]
    return y


def music(dur):
    t = np.arange(int(dur * SR)) / SR
    chords = [(110.0, 130.81, 164.81), (87.31, 110.0, 130.81), (130.81, 164.81, 196.0), (98.0, 123.47, 146.83)]
    idx = (t // 4).astype(int) % 4
    pad = np.zeros_like(t)
    local = t % 4
    gate = np.minimum(1, local / 0.4) * np.minimum(1, (4 - local) / 0.4)
    trem = 1 + 0.15 * np.sin(2 * np.pi * 0.25 * t)
    for k, amp in enumerate((0.15, 0.12, 0.10)):
        f = np.array([c[k] for c in chords])[idx]
        ph = 2 * np.pi * np.cumsum(f) / SR
        pad += amp * (np.sin(ph) + 0.3 * np.sin(2 * ph) + 0.1 * np.sin(3 * ph))
    pad *= gate * trem
    beat = 0.75
    bt = t % beat
    root = np.array([c[0] for c in chords])[idx]
    bph = 2 * np.pi * np.cumsum(root / 2) / SR
    bass = 0.3 * np.sin(bph) * np.exp(-4.5 * bt)
    tt = (t + beat / 2) % beat
    top = np.array([c[2] for c in chords])[idx] * 2
    tph = 2 * np.pi * np.cumsum(top) / SR
    tick = 0.045 * np.sin(tph) * np.exp(-16 * tt)
    x = pad + bass + tick
    x = fft_band(x, 30, 2600)
    x = reverb(x)
    fade = np.minimum(1, t / 1.5) * np.minimum(1, (dur - t) / 2.0)
    return 0.7 * x * fade / np.max(np.abs(x))


def crowd(dur):
    n = int(dur * SR)
    t = np.arange(n) / SR
    base = fft_band(rng.standard_normal(n), 180, 900)
    voices = fft_band(rng.standard_normal(n), 700, 2400)
    wob1 = 1 + 0.45 * np.sin(2 * np.pi * 3.3 * t + 2 * np.sin(2 * np.pi * 0.7 * t))
    wob2 = 1 + 0.6 * np.sin(2 * np.pi * 6.1 * t + 3 * np.sin(2 * np.pi * 1.1 * t))
    x = base * wob1 + 0.6 * voices * wob2
    x = reverb(x)
    return 0.8 * x / np.max(np.abs(x))


def whoosh(dur=0.7):
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = fft_band(rng.standard_normal(n), 250, 4200)
    env = np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 2.2
    return 0.9 * x * env / np.max(np.abs(x * env))


if __name__ == "__main__":
    out = Path(sys.argv[1] if len(sys.argv) > 1 else "public/stories/nobody")
    dur = float(sys.argv[2]) if len(sys.argv) > 2 else 34
    out.mkdir(parents=True, exist_ok=True)
    write(out / "music.wav", music(dur))
    write(out / "crowd.wav", crowd(dur))
    write(out / "whoosh.wav", whoosh())
    print("wrote music.wav, crowd.wav, whoosh.wav to", out)
    print("tip: ffmpeg -i music.wav -b:a 160k music.mp3  (the compositions load .mp3 for music/crowd)")
