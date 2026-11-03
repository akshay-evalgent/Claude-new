"""Original placeholder music and sound design, synthesized from scratch.

Why this exists: a trending commercial track cannot be baked into the upload
(it draws a Content ID claim and can be muted or blocked). The trending sound
is added inside the YouTube Shorts editor, which licenses it. This module makes
a rights-clear track on the same beat grid and section map as the edit, so the
render can be previewed (or posted as-is) and every cut is proven on the beat.

    compose(bpm, sections)        -> stereo float32 array, sample rate
    sound_design(dur, cuts, ...)  -> whooshes / impacts that sit under any track

`sections` is the edit's bar map, e.g.
    [{"name": "intro", "bars": 2}, {"name": "build", "bars": 1},
     {"name": "drop", "bars": 8}, {"name": "break", "bars": 1}, {"name": "rise", "bars": 1}]
"""
import numpy as np
from scipy import signal

SR = 44100
rng = np.random.default_rng(7)

# D minor: i - VI - III - VII  (Dm  Bb  F  C)
CHORDS = [[62, 65, 69], [58, 62, 65], [65, 69, 72], [60, 64, 67]]
ROOTS = [38, 34, 41, 36]  # D2 Bb1 F2 C2


def hz(m):
    return 440.0 * 2 ** ((np.asarray(m, dtype=float) - 69) / 12)


def _t(sec):
    return np.arange(int(sec * SR)) / SR


def _sos(kind, f, order=2):
    return signal.butter(order, f, btype=kind, fs=SR, output="sos")


def filt(x, kind, f, order=2):
    return signal.sosfilt(_sos(kind, f, order), x, axis=0)


def noise(sec):
    return rng.standard_normal(int(sec * SR))


def saw_phase(freq):
    """Saw from an instantaneous-frequency array (allows glides)."""
    ph = np.cumsum(freq) / SR
    return 2.0 * (ph % 1.0) - 1.0


# ---------------------------------------------------------------- drums

def kick():
    t = _t(0.5)
    f = 46 + 130 * np.exp(-t / 0.032)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.26)
    click = filt(noise(0.5), "highpass", 2500) * np.exp(-t / 0.004) * 0.5
    return np.tanh(2.2 * (body + click)) * 0.95


def clap():
    t = _t(0.35)
    n = filt(noise(0.35), "bandpass", [900, 4200])
    env = np.zeros_like(t)
    for d in (0.0, 0.011, 0.022):
        env += np.where(t >= d, np.exp(-(t - d) / 0.006), 0)
    env += np.where(t >= 0.03, 0.55 * np.exp(-(t - 0.03) / 0.11), 0)
    return n * env * 0.5


def snare():
    t = _t(0.25)
    n = filt(noise(0.25), "bandpass", [1200, 8000]) * np.exp(-t / 0.07)
    tone = np.sin(2 * np.pi * 190 * t) * np.exp(-t / 0.04)
    return (n * 0.55 + tone * 0.35) * 0.8


def hat(open_=False):
    d = 0.2 if open_ else 0.04
    t = _t(d + 0.05)
    return filt(noise(d + 0.05), "highpass", 7500, 4) * np.exp(-t / (d / 3)) * (0.22 if open_ else 0.18)


# ---------------------------------------------------------------- tonal

def supersaw(notes, sec, detune=0.14, voices=5):
    t = _t(sec)
    out = np.zeros((len(t), 2))
    for m in notes:
        for v in range(voices):
            cents = (v - (voices - 1) / 2) * detune / (voices - 1) * 100
            for ch, sgn in ((0, 1), (1, -1)):
                f = hz(m) * 2 ** (sgn * cents / 1200)
                out[:, ch] += saw_phase(np.full(len(t), f)) * 0.12
    return out


def pluck(m, sec=0.32):
    t = _t(sec)
    f = hz(m)
    x = 0.6 * saw_phase(np.full(len(t), f)) + 0.4 * np.sign(np.sin(2 * np.pi * f * t))
    x = filt(x, "lowpass", 3800) * np.exp(-t / 0.09)
    return x * 0.22


def bass808(m, sec, glide_from=None):
    t = _t(sec)
    f = np.full(len(t), hz(m))
    if glide_from is not None:
        f = hz(m) + (hz(glide_from) - hz(m)) * np.exp(-t / 0.05)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR)
    env = np.minimum(1, t / 0.004) * np.exp(-t / max(0.25, sec * 0.7))
    # saturation adds harmonics so the bass still reads on phone speakers
    return np.tanh(2.5 * x * env) * 0.42


# ---------------------------------------------------------------- fx

def riser(sec):
    t = _t(sec)
    n = noise(sec)
    p = t / sec
    bands = [filt(n, "bandpass", [lo, lo * 1.8]) for lo in (300, 800, 2000, 5000)]
    w = np.clip(p * 3, 0, 3)
    out = np.zeros_like(t)
    for i, b in enumerate(bands):
        out += b * np.clip(1 - np.abs(w - i), 0, 1)
    tone = saw_phase(hz(50) * 2 ** (p * 2)) * 0.05
    return (out * 0.35 + filt(tone, "lowpass", 3000)) * p ** 1.6


def reverse_cymbal(sec):
    t = _t(sec)
    return filt(noise(sec), "highpass", 5000) * np.exp((t - sec) / (sec / 4)) * 0.35


def impact(sec=1.6):
    t = _t(sec)
    f = 32 + 40 * np.exp(-t / 0.15)
    boom = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.55)
    crack = filt(noise(sec), "lowpass", 5000) * np.exp(-t / 0.05) * 0.6
    tail = filt(noise(sec), "bandpass", [200, 2500]) * np.exp(-t / 0.5) * 0.12
    return np.tanh(1.8 * (boom + crack + tail)) * 0.8


def whoosh(sec=0.42):
    t = _t(sec)
    p = t / sec
    n = noise(sec)
    lo = filt(n, "bandpass", [400, 1400])
    hi = filt(n, "bandpass", [1800, 6000])
    out = lo * (1 - p) + hi * p
    return out * np.sin(np.pi * p) ** 2 * 0.5


def reverb(x, sec=1.4, mix=0.25):
    t = _t(sec)
    ir = np.stack([rng.standard_normal(len(t)) * np.exp(-t / (sec / 5)) for _ in range(2)], 1)
    ir[:, 0] = filt(ir[:, 0], "lowpass", 6000)
    ir[:, 1] = filt(ir[:, 1], "lowpass", 6000)
    ir /= np.sqrt((ir ** 2).sum(0, keepdims=True))
    mono = x.mean(1) if x.ndim == 2 else x
    wet = np.stack([signal.fftconvolve(mono, ir[:, c])[:len(mono)] for c in range(2)], 1)
    dry = x if x.ndim == 2 else np.stack([x, x], 1)
    return dry + wet * mix


# ---------------------------------------------------------------- arrangement

def _place(buf, clip, at, gain=1.0, pan=0.0):
    i = int(round(at * SR))
    if i >= len(buf) or i < 0:
        return
    c = clip if clip.ndim == 2 else np.stack([clip * (1 - max(0, pan)), clip * (1 + min(0, pan))], 1)
    n = min(len(c), len(buf) - i)
    buf[i:i + n] += c[:n] * gain


def bar_sections(sections):
    out = []
    for s in sections:
        for k in range(s["bars"]):
            out.append((s["name"], k, s["bars"]))
    return out


def compose(bpm, sections):
    spb = 60.0 / bpm
    bars = bar_sections(sections)
    total = len(bars) * 4 * spb
    n = int(total * SR) + 1
    drums = np.zeros((n, 2))
    bass = np.zeros((n, 2))
    music = np.zeros((n, 2))   # pad + arp, sidechained
    fx = np.zeros((n, 2))
    kicks = []
    K, C, S, H, HO = kick(), clap(), snare(), hat(), hat(True)

    for b, (name, k, nb) in enumerate(bars):
        t0 = b * 4 * spb
        ch = CHORDS[b % 4]
        root = ROOTS[b % 4]
        prog = (k + 1) / nb   # progress through the section

        # pad: whole bar chord, filter opens with energy
        cutoff = {"intro": 700 + 1500 * prog, "build": 2200 + 2500 * prog, "drop": 5200,
                  "break": 1400, "rise": 1200 + 2500 * prog}[name]
        pad = supersaw([m - 12 for m in ch] + [ch[0]], 4 * spb + 0.05)
        pad = np.stack([filt(pad[:, c], "lowpass", cutoff) for c in range(2)], 1)
        tt = _t(4 * spb + 0.05)
        pad *= (np.minimum(1, tt / 0.25) * np.minimum(1, (4 * spb + 0.05 - tt) / 0.05))[:, None]
        _place(music, pad, t0, 0.55 if name != "drop" else 0.45)

        # arp: 16ths over the chord tones
        arp_gain = {"intro": 0.5, "build": 0.8, "drop": 1.0, "break": 0.7, "rise": 0.8}[name]
        tones = ch + [ch[0] + 12, ch[1] + 12]
        for s16 in range(16):
            m = tones[[0, 2, 1, 3, 2, 4, 3, 2][s16 % 8]]
            p = pluck(m)
            if name in ("intro", "break"):
                p = filt(p, "lowpass", 1200 if name == "intro" else 1800)
            _place(music, p, t0 + s16 * spb / 4, arp_gain, pan=0.35 if s16 % 2 else -0.35)

        # drums
        if name == "intro":
            _place(drums, K, t0, 0.9); kicks.append(t0)
            for e in range(8):
                if e % 2:
                    _place(drums, H, t0 + e * spb / 2, 0.5 + 0.5 * prog)
        elif name in ("build", "rise"):
            for q in range(3):
                _place(drums, K, t0 + q * spb, 0.6 + 0.12 * q); kicks.append(t0 + q * spb)
            hits = [i * spb / 2 for i in range(4)] + [2 * spb + i * spb / 4 for i in range(4)] \
                + [3 * spb + i * spb / 8 for i in range(4)]
            for i, h in enumerate(hits):
                _place(drums, S, t0 + h, 0.35 + 0.5 * i / len(hits))
            _place(fx, riser(4 * spb), t0, 0.9)
            _place(fx, reverse_cymbal(spb), t0 + 3 * spb, 1.0)
        elif name == "drop":
            if k == 0:
                _place(fx, impact(), t0, 0.9)
                _place(fx, filt(noise(1.2), "highpass", 4000) * np.exp(-_t(1.2) / 0.35) * 0.25, t0)
            for q in range(4):
                _place(drums, K, t0 + q * spb); kicks.append(t0 + q * spb)
                if q in (1, 3):
                    _place(drums, C, t0 + q * spb, 0.9)
                _place(drums, HO, t0 + (q + 0.5) * spb, 0.8, pan=0.2)
                _place(drums, H, t0 + (q + 0.25) * spb, 0.5, pan=-0.2)
                _place(drums, H, t0 + (q + 0.75) * spb, 0.5, pan=-0.2)
            # fill on the last beat of every 4th bar of the drop
            if k % 4 == 3:
                for i in range(4):
                    _place(drums, S, t0 + 3 * spb + i * spb / 4, 0.4 + 0.12 * i)
            # 808: root on 1, octave pickup on the and-of-2, glide back on 3
            _place(bass, bass808(root, 1.6 * spb), t0)
            _place(bass, bass808(root + 12, 0.5 * spb, glide_from=root), t0 + 1.5 * spb, 0.8)
            _place(bass, bass808(root, 1.3 * spb, glide_from=root + 12), t0 + 2 * spb)
            _place(bass, bass808(root + 7, 0.6 * spb), t0 + 3.5 * spb, 0.7)
        elif name == "break":
            _place(drums, C, t0 + 3 * spb, 0.6)
            _place(bass, bass808(root, 3.5 * spb), t0, 0.6)

    if bars and bars[0][0] == "intro":
        _place(fx, impact(), 0.0, 0.85)

    # sidechain: duck the pad/arp and bass under every kick (the "pump")
    duck = np.ones(n)
    tt = np.arange(n) / SR
    for kt in kicks:
        i = int(kt * SR)
        m = min(n - i, int(0.3 * SR))
        duck[i:i + m] = np.minimum(duck[i:i + m], 1 - 0.65 * np.exp(-tt[:m] / 0.09))
    music *= duck[:, None]
    bass *= (0.5 + 0.5 * duck)[:, None]

    mix = reverb(music, 1.6, 0.3) + reverb(drums * [0.25, 0.25], 0.6, 0.15) + drums + bass + reverb(fx, 1.2, 0.2)
    mix = filt(mix, "highpass", 28)
    mix /= np.percentile(np.abs(mix), 99.95)   # gentle: only the top peaks touch the soft clip
    mix = np.tanh(mix * 0.9) * 0.5
    return mix[: int(round(total * SR))].astype(np.float32), SR


def sound_design(duration, whooshes=(), impacts=(), risers=()):
    """Transition sound that sits under whatever track is used.
    whooshes: cut times (centered on the cut); impacts: hit times; risers: (start, end)."""
    n = int(duration * SR) + 1
    buf = np.zeros((n, 2))
    for t in whooshes:
        w = whoosh(0.42)
        _place(buf, w, t - 0.3, 0.8, pan=0.0)
    for t in impacts:
        _place(buf, impact(1.4), t, 0.7)
    for s, e in risers:
        _place(buf, riser(e - s), s, 0.6)
    buf = reverb(buf, 0.9, 0.2)
    return np.tanh(buf)[: int(round(duration * SR))].astype(np.float32), SR


def loudness(x, sr=SR):
    """Integrated loudness (LUFS) via ffmpeg's EBU R128 meter."""
    import re, subprocess, tempfile, os
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
        tmp = f.name
    try:
        write_wav(tmp, x, sr)
        out = subprocess.run(["ffmpeg", "-nostats", "-i", tmp, "-af", "ebur128", "-f", "null", "-"],
                             capture_output=True, text=True).stderr
        return float(re.findall(r"I:\s+(-?[\d.]+) LUFS", out)[-1])
    finally:
        os.unlink(tmp)


def normalize(x, target_lufs=-14.0, ceiling=0.89, sr=SR):
    """Gain to the YouTube loudness target, then a soft ceiling for the peaks."""
    x = x * 10 ** ((target_lufs - loudness(x, sr)) / 20)
    over = np.abs(x) > ceiling * 0.8
    knee = ceiling * 0.8
    x = np.where(over, np.sign(x) * (knee + (ceiling - knee) * np.tanh((np.abs(x) - knee) / (ceiling - knee))), x)
    return x.astype(np.float32)


def write_wav(path, x, sr=SR):
    import wave
    x = np.clip(x, -1, 1)
    pcm = (x * 32767).astype("<i2")
    with wave.open(str(path), "wb") as w:
        w.setnchannels(pcm.shape[1] if pcm.ndim == 2 else 1)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes(pcm.tobytes())


if __name__ == "__main__":
    import sys
    secs = [{"name": "intro", "bars": 2}, {"name": "build", "bars": 1}, {"name": "drop", "bars": 8},
            {"name": "break", "bars": 1}, {"name": "rise", "bars": 1}]
    y, sr = compose(float(sys.argv[1]) if len(sys.argv) > 1 else 125, secs)
    y = normalize(y)
    write_wav(sys.argv[2] if len(sys.argv) > 2 else "track.wav", y, sr)
