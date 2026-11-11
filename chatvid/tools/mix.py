#!/usr/bin/env python3
"""Mix the sound cues produced by the engine into one stereo WAV.

  python3 chatvid/tools/mix.py cues.json out.wav

cues.json = {"duration": s, "cues": [{t, s, g, rate?, dur?, duck?}], "music": {...}}
Cue names map to chatvid/assets/sfx/<name>.*; "@riser" is synthesised here.
Each sample is trimmed to its first sound and peak-normalised, so "g" (dB) is
the cue's loudness relative to full scale.
"""
import glob, json, os, subprocess, sys
import numpy as np

SR = 48000
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_cache = {}


def decode(path):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-f", "f32le", "-ac", "2", "-ar", str(SR), "-"],
                         check=True, capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.float32).reshape(-1, 2).copy()


def sample(name):
    if name in _cache:
        return _cache[name]
    hits = glob.glob(os.path.join(ROOT, "assets", "sfx", name + ".*"))
    if not hits:
        raise SystemExit(f"missing sound '{name}' - run chatvid/tools/fetch_assets.py")
    x = decode(hits[0])
    peak = np.abs(x).max() or 1.0
    x = x / peak
    on = np.argmax(np.abs(x).max(axis=1) > 10 ** (-30 / 20))   # first sample above -30 dB of peak
    x = x[max(0, on - int(0.003 * SR)):]
    _cache[name] = x
    return x


def riser(dur):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = 160 * (9 ** (t / dur))                                # 160 Hz -> 1.4 kHz sweep
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.5 * np.sin(4 * np.pi * np.cumsum(f) / SR)
    rnd = np.random.default_rng(3)
    noise = rnd.standard_normal(n)
    a = np.exp(-2 * np.pi * (300 + 6000 * (t / dur) ** 2) / SR)  # rising one-pole low-pass on the noise
    out = np.empty(n); acc = 0.0
    for i in range(n):
        acc = a[i] * acc + (1 - a[i]) * noise[i]
        out[i] = acc
    out = out / (np.abs(out).max() or 1)
    env = (t / dur) ** 2.2
    mono = (0.75 * tone / 1.5 + 0.3 * out) * env
    mono[-int(0.01 * SR):] *= np.linspace(1, 0, int(0.01 * SR))
    return np.stack([mono * 0.95, mono], axis=1).astype(np.float32)


def resample(x, rate):
    if abs(rate - 1) < 1e-3:
        return x
    idx = np.arange(0, len(x) - 1, rate)
    return np.stack([np.interp(idx, np.arange(len(x)), x[:, c]) for c in (0, 1)], axis=1).astype(np.float32)


def fade_tail(x, ms=25):
    k = min(len(x), int(ms / 1000 * SR))
    x = x.copy()
    x[-k:] *= np.linspace(1, 0, k)[:, None]
    return x


def main(cues_path, out_path):
    spec = json.load(open(cues_path))
    total = int((spec["duration"] + 1.5) * SR)
    out = np.zeros((total, 2), np.float32)
    duck = np.ones(total, np.float32)
    for c in spec["cues"]:
        x = riser(c["dur"]) if c["s"] == "@riser" else sample(c["s"])
        x = resample(x, c.get("rate", 1.0))
        if c.get("dur") and c["s"] != "@riser":
            x = fade_tail(x[: int(c["dur"] * SR)])
        x = x * (10 ** (c.get("g", 0) / 20))
        i = int(c["t"] * SR)
        j = min(total, i + len(x))
        if i >= total:
            continue
        out[i:j] += x[: j - i]
        if c.get("duck"):
            a, b = max(0, i - int(0.06 * SR)), min(total, j + int(0.15 * SR))
            duck[a:b] = np.minimum(duck[a:b], 10 ** (-9 / 20))
    m = spec.get("music")
    if m:
        hits = glob.glob(os.path.join(ROOT, "assets", "music", m["track"] + ".*"))
        mus = decode(hits[0])
        mus = mus / (np.abs(mus).max() or 1)
        a, b = int(m["start"] * SR), min(total, int(m["end"] * SR))
        need = b - a
        reps = int(np.ceil(need / len(mus)))
        bed = np.tile(mus, (reps, 1))[:need] * (10 ** (m.get("gain", -20) / 20))
        fi, fo = int(0.4 * SR), int(0.8 * SR)
        bed[:fi] *= np.linspace(0, 1, fi)[:, None]
        bed[-fo:] *= np.linspace(1, 0, fo)[:, None]
        # smooth the duck envelope (~60 ms) so it doesn't click
        k = int(0.06 * SR)
        d = np.convolve(duck, np.ones(k) / k, mode="same")
        out[a:b] += bed * d[a:b, None]
    out = out[: int(spec["duration"] * SR)]
    peak = np.abs(out).max() or 1
    out = np.tanh(out / peak * 1.2) / np.tanh(1.2) * 0.89     # gentle soft clip, peak ~ -1 dB
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "2", "-i", "-", out_path],
                   input=out.astype(np.float32).tobytes(), check=True)


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
