#!/usr/bin/env python3
"""Build the film's final sound track and set its loudness.

    python3 sound.py --out track.wav --duration 36.5 [--vo vo.wav] [--music bed.mp3]
                     [--hits 3.4,8.2,10.3] [--lufs -14] [--peak -1.5] [--no-bed]

Layers, quietest first:
  bed     a soft synthesised room tone and drone (skipped with --no-bed or --music)
  music   a file you supply, ducked under the voice
  hits    a short brush sound at each time in --hits (put one on every cut, so
          the picture changes on a sound)
  vo      the voice, on top
Then one gain and a limiter bring the mix to --lufs (match the references'
measured loudness) with peaks under --peak.

The bed and hits are placeholders that keep the film from being silent and keep
the cuts on a sound. Real music and sound design, supplied with --music, are
better.
"""
import argparse
import re
import subprocess
import sys
import wave
from pathlib import Path

import numpy as np

SR = 48000


def read_any(path, duration):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-vn", "-ac", "1", "-ar", str(SR),
                          "-f", "f32le", "-"], capture_output=True).stdout
    x = np.frombuffer(raw, np.float32)
    n = int(duration * SR)
    if len(x) == 0:
        sys.exit(f"could not read audio from {path}")
    return np.pad(x, (0, max(0, n - len(x))))[:n].copy()


def shaped_noise(n, lo, hi, rng):
    spec = np.fft.rfft(rng.normal(0, 1, n))
    f = np.fft.rfftfreq(n, 1 / SR)
    spec *= np.exp(-0.5 * ((np.log(np.maximum(f, 1)) - np.log((lo * hi) ** 0.5)) / (np.log(hi / lo) / 2.2)) ** 2)
    x = np.fft.irfft(spec, n)
    return x / (np.abs(x).max() + 1e-9)


def bed(n, rng):
    t = np.arange(n) / SR
    drone = sum(a * np.sin(2 * np.pi * f * t + p) * (0.75 + 0.25 * np.sin(2 * np.pi * lfo * t + p))
                for f, a, p, lfo in [(110.0, 1.0, 0.0, 0.07), (164.8, 0.6, 1.3, 0.05), (220.4, 0.35, 2.1, 0.11)])
    air = shaped_noise(n, 300, 3000, rng)
    x = 0.05 * drone / np.abs(drone).max() + 0.012 * air
    fade = int(0.8 * SR)
    x[:fade] *= np.linspace(0, 1, fade)
    x[-fade:] *= np.linspace(1, 0, fade)
    return x


def hit(rng):
    n = int(0.45 * SR)
    t = np.arange(n) / SR
    brush = shaped_noise(n, 900, 6000, rng) * np.minimum(t / 0.012, 1) * np.exp(-t * 11)
    thump = np.sin(2 * np.pi * 82 * t) * np.exp(-t * 16)
    return 0.20 * brush + 0.16 * thump


def measure(path):
    out = subprocess.run(["ffmpeg", "-nostats", "-i", str(path), "-af", "ebur128=peak=true", "-f", "null", "-"],
                         capture_output=True).stderr.decode(errors="replace")
    tail = out[out.rfind("Summary:"):]
    i = re.search(r"I:\s+(-?[\d.]+) LUFS", tail)
    p = re.search(r"Peak:\s+(-?[\d.]+) dBFS", tail)
    return (float(i.group(1)) if i else None), (float(p.group(1)) if p else None)


def write(path, x):
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((np.clip(x, -1, 1) * 32767).astype(np.int16).tobytes())


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--out", required=True)
    ap.add_argument("--duration", type=float, required=True)
    ap.add_argument("--vo")
    ap.add_argument("--music")
    ap.add_argument("--hits", default="")
    ap.add_argument("--lufs", type=float, default=-14.0)
    ap.add_argument("--peak", type=float, default=-1.5)
    ap.add_argument("--no-bed", action="store_true")
    args = ap.parse_args()

    n = int(args.duration * SR)
    rng = np.random.default_rng(7)
    mix = np.zeros(n, np.float32)
    layers = []

    vo = read_any(args.vo, args.duration) if args.vo else None
    duck = np.ones(n, np.float32)
    if vo is not None:
        vo = vo / (np.abs(vo).max() + 1e-9) * 0.8
        env = np.abs(vo)
        k = int(0.15 * SR)
        env = np.convolve(env, np.ones(k) / k, mode="same")
        duck = 1 - 0.6 * np.clip(env / 0.05, 0, 1)        # things under the voice drop about 8 dB while it speaks

    if args.music:
        m = read_any(args.music, args.duration)
        m = m / (np.abs(m).max() + 1e-9) * 0.35
        fade = int(1.2 * SR)
        m[-fade:] *= np.linspace(1, 0, fade)
        mix += m * duck
        layers.append("music")
    elif not args.no_bed:
        mix += bed(n, rng) * duck
        layers.append("bed")

    times = [float(v) for v in args.hits.split(",") if v.strip()]
    for t in times:
        h = hit(rng)
        i = int(t * SR)
        if 0 <= i < n:
            mix[i:i + len(h)] += h[:n - i] * (0.7 if vo is not None else 1.0)
    if times:
        layers.append(f"{len(times)} hits")

    if vo is not None:
        mix += vo
        layers.append("voice")
    if not layers:
        sys.exit("nothing to mix: give --vo, --music or --hits, or drop --no-bed")

    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    tmp = out.with_suffix(".premix.wav")
    write(tmp, mix / max(1.0, np.abs(mix).max()))
    lufs, _ = measure(tmp)
    if lufs is None:
        sys.exit("could not measure loudness of the mix")
    # the limiter takes a little loudness back, so correct until it lands
    gain = args.lufs - lufs
    for _ in range(4):
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(tmp), "-af",
                        f"volume={gain:.2f}dB,alimiter=limit={10 ** (args.peak / 20):.4f}:level=disabled:attack=3:release=60",
                        "-ar", str(SR), "-c:a", "pcm_s16le", str(out)], check=True)
        got, peak = measure(out)
        if got is None or abs(got - args.lufs) <= 0.3:
            break
        gain += args.lufs - got
    tmp.unlink(missing_ok=True)
    print(f"mixed {', '.join(layers)}: {got} LUFS (target {args.lufs}), peak {peak} dBTP, {args.duration:.2f} s")
    print(f"wrote {out}")


if __name__ == "__main__":
    main()
