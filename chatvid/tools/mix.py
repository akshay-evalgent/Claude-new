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


def boom():
    """Vine-boom style meme hit, synthesised (no third-party audio, no copyright).
    A pitch-dropping bass thump, saturated, with a click on the front and a dark
    reverb tail."""
    dur = 1.9
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = 46 + 120 * np.exp(-t / 0.05)                       # ~166 Hz falling to 46 Hz
    ph = 2 * np.pi * np.cumsum(f) / SR
    body = (np.sin(ph) + 0.35 * np.sin(2 * ph) + 0.15 * np.sin(3 * ph)) * np.exp(-t / 0.42)
    body *= np.minimum(1, t / 0.002)                        # 2 ms attack
    body = np.tanh(2.6 * body) / np.tanh(2.6)               # saturation = the "boomy" grit
    rnd = np.random.default_rng(11)
    click = rnd.standard_normal(n) * np.exp(-t / 0.004) * 0.35
    dry = body + click
    # reverb: convolve with decaying, low-passed noise
    ir_n = int(1.3 * SR)
    ti = np.arange(ir_n) / SR
    ir = rnd.standard_normal(ir_n) * np.exp(-ti / 0.35)
    k = 24
    ir = np.convolve(ir, np.ones(k) / k, mode="same")       # darken the tail
    ir /= np.abs(ir).sum() / 40
    wet = np.convolve(dry, ir)[:n]
    wet /= np.abs(wet).max() or 1
    mono = 0.82 * dry / (np.abs(dry).max() or 1) + 0.38 * wet
    mono[-int(0.05 * SR):] *= np.linspace(1, 0, int(0.05 * SR))
    mono /= np.abs(mono).max() or 1
    return np.stack([mono, mono], axis=1).astype(np.float32)


def ding():
    """Bright kitchen-timer / toaster bell: a few inharmonic partials with a strike."""
    dur = 1.6
    n = int(dur * SR)
    t = np.arange(n) / SR
    f0 = 1568.0
    parts = [(1.0, 1.0, 1.25), (2.0, 0.3, 0.55), (2.76, 0.45, 0.8), (5.4, 0.18, 0.25), (8.9, 0.08, 0.12)]
    left = np.zeros(n); right = np.zeros(n)
    for ratio, amp, dec in parts:
        env = amp * np.exp(-t / dec)
        left += env * np.sin(2 * np.pi * f0 * ratio * t)
        right += env * np.sin(2 * np.pi * f0 * ratio * 1.0015 * t + 0.3)
    rnd = np.random.default_rng(5)
    strike = rnd.standard_normal(n) * np.exp(-t / 0.003) * 0.25
    att = np.minimum(1, t / 0.0015)
    out = np.stack([(left + strike) * att, (right + strike) * att], axis=1)
    out /= np.abs(out).max() or 1
    return out.astype(np.float32)


def soft_swoosh():
    """Gentle camera move: a short, airy whisper (band-limited noise, soft swell)
    in place of a sharp whoosh, so it can repeat every few seconds without tiring."""
    dur = 0.34
    n = int(dur * SR)
    t = np.arange(n) / SR
    rnd = np.random.default_rng(21)
    noise = rnd.standard_normal((n, 2))
    cut = 350 + 1300 * np.sin(np.pi * t / dur) ** 2          # cutoff swells 350 Hz -> 1.65 kHz -> back
    a = np.exp(-2 * np.pi * cut / SR)
    y = noise
    for _ in range(3):                                      # three one-pole low-passes in a row: steep,
        out = np.empty_like(y); acc = np.zeros(2)            # so there is no hiss up top, just soft air
        for i in range(n):
            acc = a[i] * acc + (1 - a[i]) * y[i]
            out[i] = acc
        y = out
    env = np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 2.5
    pan = np.stack([1 - 0.35 * t / dur, 0.65 + 0.35 * t / dur], axis=1)  # drifts slightly left -> right
    y = y * env[:, None] * pan
    return (y / (np.abs(y).max() or 1)).astype(np.float32)


def soft_pop():
    """Gentle punch-in accent: a short, rounded "bloop" (falling sine with a soft attack)."""
    dur = 0.22
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = 260 + 300 * np.exp(-t / 0.035)                       # 560 Hz falling to 260 Hz
    ph = 2 * np.pi * np.cumsum(f) / SR
    env = np.minimum(1, t / 0.004) * np.exp(-t / 0.06)
    y = (np.sin(ph) + 0.18 * np.sin(2 * ph)) * env
    y[-int(0.03 * SR):] *= np.linspace(1, 0, int(0.03 * SR))   # fade to silence, no click
    y = y / (np.abs(y).max() or 1)
    return np.stack([y, y], axis=1).astype(np.float32)


SYNTH = {"boom": boom, "ding": ding, "soft-swoosh": soft_swoosh, "soft-pop": soft_pop}


def clip_audio(key):
    """A film clip's original sound. Unlike sound effects it is not trimmed (it has to
    stay in sync with the picture); it is levelled to a common loudness instead."""
    x = decode(os.path.join(ROOT, "assets", "media", key, "audio.wav"))
    rms = float(np.sqrt(np.mean(x ** 2))) or 1e-6
    # ~-16 dBFS RMS, peak <= -1 dB, and never more than +12 dB of boost (old film hiss)
    x = x * min(10 ** (-16 / 20) / rms, 10 ** (-1 / 20) / (np.abs(x).max() or 1), 10 ** (12 / 20))
    f_in, f_out = int(0.03 * SR), int(0.12 * SR)
    x[:f_in] *= np.linspace(0, 1, f_in)[:, None]
    x[-f_out:] *= np.linspace(1, 0, f_out)[:, None]
    return x.astype(np.float32)


def sample(name):
    if name in _cache:
        return _cache[name]
    if name.startswith("@media:"):
        _cache[name] = clip_audio(name[7:])
        return _cache[name]
    if name in SYNTH:
        _cache[name] = SYNTH[name]()
        return _cache[name]
    hits = glob.glob(os.path.join(ROOT, "assets", "sfx", name + ".*"))
    if not hits:
        raise SystemExit(f"missing sound '{name}' - run chatvid/tools/fetch_assets.py")
    x = decode(hits[0])
    peak = np.abs(x).max() or 1.0
    x = x / peak
    on = np.argmax(np.abs(x).max(axis=1) > 10 ** (-30 / 20))   # first sample above -30 dB of peak
    x = x[max(0, on - int(0.003 * SR)):]
    if name.startswith("key"):
        # key clicks are the sharpest transients in the mix: take the edge off
        # (soft low-pass, ~1 ms fade-in) so they don't spike after loudness gain
        k = np.hanning(9)[1:-1]
        k /= k.sum()
        x = np.stack([np.convolve(x[:, c], k, mode="same") for c in (0, 1)], axis=1)
        f = int(0.001 * SR)
        x[:f] *= np.linspace(0, 1, f)[:, None]
        x /= np.abs(x).max() or 1
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


def limit(x, ceil=0.89, max_gr_db=12.0, release=0.08, pct=97.0):
    """Look-ahead peak limiter. Sets the level so only the loudest few percent of the
    programme is limited (at most max_gr_db of gain reduction), instead of
    scaling the whole mix down to fit its single loudest hit. pct sets how much
    of the programme may be limited (97 = the loudest 3% of 1 ms blocks)."""
    blk = 48                                        # 1 ms blocks
    n = len(x)
    pk = np.abs(x).max(axis=1)
    pad = (-n) % blk
    bp = np.concatenate([pk, np.zeros(pad, pk.dtype)]).reshape(-1, blk).max(axis=1)
    loud = bp[bp > 1e-4]
    ref = np.percentile(loud, pct) if len(loud) else 1.0
    pre = min(ceil / max(ref, 1e-9), ceil * 10 ** (max_gr_db / 20) / max(bp.max(), 1e-9))
    req = np.minimum(1.0, ceil / np.maximum(bp * pre, 1e-9))
    la = req.copy()                                 # 2 ms look-ahead
    la[:-1] = np.minimum(la[:-1], req[1:])
    la[:-2] = np.minimum(la[:-2], req[2:])
    g = np.empty_like(la)
    cur, a = 1.0, 1 - np.exp(-1 / (release * 1000))
    for i, r in enumerate(la):
        cur = r if r < cur else cur + (r - cur) * a
        g[i] = cur
    centres = np.arange(len(g)) * blk + blk / 2
    gs = np.interp(np.arange(n), centres, g).astype(np.float32)
    y = x * pre * gs[:, None]
    return np.clip(y, -0.99, 0.99)


def main(cues_path, out_path):
    spec = json.load(open(cues_path))
    total = int((spec["duration"] + 1.5) * SR)
    out = np.zeros((total, 2), np.float32)
    duck = np.ones(total, np.float32)
    for c in spec["cues"]:
        x = riser(c["dur"]) if c["s"] == "@riser" else sample(c["s"])
        x = resample(x, c.get("rate", 1.0))
        if c.get("dur") and c["s"] != "@riser" and not c["s"].startswith("@media:"):
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
    if m and m.get("tracks"):
        a, b = int(m["start"] * SR), min(total, int(m["end"] * SR))
        need = b - a
        xf = int(2.0 * SR)                                  # crossfade between tracks
        songs = []
        for name in m["tracks"]:
            hits = glob.glob(os.path.join(ROOT, "assets", "music", name + ".*"))
            if not hits:
                raise SystemExit(f"missing music '{name}' - run chatvid/tools/fetch_assets.py")
            x = decode(hits[0])
            songs.append(x / (np.abs(x).max() or 1))
        bed = np.zeros((0, 2), np.float32)
        i = 0
        while len(bed) < need + xf:
            x = songs[i % len(songs)]
            i += 1
            if len(bed) == 0:
                bed = x.copy()
                continue
            ramp = np.linspace(0, 1, xf)[:, None]
            head = bed[:-xf]
            mixz = bed[-xf:] * (1 - ramp) + x[:xf] * ramp
            bed = np.concatenate([head, mixz, x[xf:]])
        bed = bed[:need] * (10 ** (m.get("gain", -20) / 20))
        fi, fo = int(0.4 * SR), int(0.8 * SR)
        bed[:fi] *= np.linspace(0, 1, fi)[:, None]
        bed[-fo:] *= np.linspace(1, 0, fo)[:, None]
        # smooth the duck envelope (~60 ms) so it doesn't click
        k = int(0.06 * SR)
        d = np.convolve(duck, np.ones(k) / k, mode="same")
        out[a:b] += bed * d[a:b, None]
    out = out[: int(spec["duration"] * SR)]
    out = limit(out)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "2", "-i", "-", out_path],
                   input=out.astype(np.float32).tobytes(), check=True)


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
