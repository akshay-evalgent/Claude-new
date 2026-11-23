"""Sound design for the quicksand short, synthesised from scratch (no samples): beach ambience,
footsteps, mud suction, whooshes on cuts, grain crunch, car creak, tide rush, trickle, pats, the
final plunge and a quiet tension bed. Mixed under the narration with ducking.

usage: <venv>/bin/python sound.py   (needs numpy, scipy, soundfile; reads $QS_SCRATCH/vo.wav)
writes $QS_SCRATCH/mix.wav (48 kHz stereo)
"""
import os, sys
import numpy as np
import soundfile as sf
from scipy import signal

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from timeline import SHOT, SHOTS, END

SCRATCH = os.environ["QS_SCRATCH"]
SR = 48000
N = int((END + 0.3) * SR)
rng = np.random.default_rng(11)


# ----------------------------------------------------------------------------- dsp helpers
def sec(t):
    return int(round(t * SR))


def noise(dur):
    return rng.standard_normal(sec(dur)).astype(np.float64)


def pink(dur):
    w = noise(dur)
    b = [0.049922035, -0.095993537, 0.050612699, -0.004408786]
    a = [1, -2.494956002, 2.017265875, -0.522189400]
    return signal.lfilter(b, a, w) * 6.0


def brown(dur):
    x = np.cumsum(noise(dur)) / SR * 60
    return signal.sosfilt(signal.butter(1, 20, "hp", fs=SR, output="sos"), x)


def filt(x, kind, f, order=2):
    return signal.sosfilt(signal.butter(order, f, kind, fs=SR, output="sos"), x)


def sweep_bp(x, f0, f1, q=4.0, curve=1.0, block=512):
    """Band-pass whose centre glides from f0 to f1 (log) over the length of x."""
    out = np.zeros_like(x)
    zi = None
    n = len(x)
    for i in range(0, n, block):
        u = (i / max(1, n - 1)) ** curve
        fc = f0 * (f1 / f0) ** u
        bw = fc / q
        lo, hi = max(20, fc - bw / 2), min(SR / 2 - 100, fc + bw / 2)
        sos = signal.butter(2, [lo, hi], "bp", fs=SR, output="sos")
        if zi is None:
            zi = np.zeros((sos.shape[0], 2))
        out[i:i + block], zi = signal.sosfilt(sos, x[i:i + block], zi=zi)
    return out


def adsr(n, a=0.005, d=0.1, s=0.0, r=0.0, hold=0.0):
    t = np.arange(n) / SR
    e = np.zeros(n)
    A, D, H = a, a + d, a + d + hold
    e[t < A] = t[t < A] / max(a, 1e-6)
    m = (t >= A) & (t < D)
    e[m] = 1 - (1 - s) * (t[m] - A) / max(d, 1e-6)
    m = (t >= D) & (t < H)
    e[m] = s
    m = t >= H
    e[m] = s * np.exp(-(t[m] - H) / max(r, 1e-3)) if r else 0
    return e


def expdecay(n, tau, attack=0.002):
    t = np.arange(n) / SR
    return np.minimum(1, t / attack) * np.exp(-t / tau)


def sine(f, dur, f_end=None, phase=0.0):
    n = sec(dur)
    fr = np.full(n, f) if f_end is None else f * (f_end / f) ** (np.arange(n) / max(1, n - 1))
    return np.sin(2 * np.pi * np.cumsum(fr) / SR + phase)


def norm(x, peak=1.0):
    m = np.abs(x).max()
    return x / m * peak if m > 0 else x


def db(v):
    return 10 ** (v / 20)


class Track:
    def __init__(self):
        self.L = np.zeros(N); self.R = np.zeros(N)

    def add(self, t, x, gain_db=0.0, pan=0.0):
        i = sec(t)
        if i >= N:
            return
        x = x[: N - i] * db(gain_db)
        l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
        self.L[i:i + len(x)] += x * l * 1.414
        self.R[i:i + len(x)] += x * r * 1.414


# ----------------------------------------------------------------------------- sound objects
def footstep_wet(weight=1.0):
    d = 0.35
    n = sec(d)
    thump = sine(90, d, 45) * expdecay(n, 0.04)
    grit = filt(noise(d), "lp", 1800) * expdecay(n, 0.03)
    squish = sweep_bp(noise(d), 500, 900, q=3) * adsr(n, 0.02, 0.12, 0.0) * 2.2
    return norm(thump * 0.8 + grit * 0.5 + squish * 0.9) * weight


def blip(f0, f1, dur):
    n = sec(dur)
    return sine(f0, dur, f1) * expdecay(n, dur / 3, 0.001)


def bubbles(dur, rate=10, f_lo=180, f_hi=600, size=0.03):
    out = np.zeros(sec(dur))
    t = 0.0
    while True:
        t += rng.exponential(1 / rate)
        if t >= dur - size * 2:
            break
        f0 = rng.uniform(f_lo, f_hi)
        b = blip(f0, f0 * rng.uniform(1.6, 2.4), size * rng.uniform(0.6, 1.4)) * rng.uniform(0.3, 1.0)
        i = sec(t); out[i:i + len(b)] += b[: len(out) - i]
    return out


def suction(dur=0.45, f0=280, f1=1100, strength=1.0, down=False):
    n = sec(dur)
    a, b = (f1, f0) if down else (f0, f1)
    body = sweep_bp(noise(dur), a, b, q=6, curve=0.7) * adsr(n, 0.03, dur * 0.5, 0.25, dur * 0.25) * 3
    low = filt(noise(dur), "lp", 220) * adsr(n, 0.02, dur * 0.7, 0.0) * 1.5
    pops = bubbles(dur, rate=18, f_lo=150, f_hi=450, size=0.035)
    return norm(body + low + pops * 0.8) * strength


def mud_bed(dur, rate=7):
    n = sec(dur)
    x = filt(brown(dur), "lp", 300) * 0.6 + bubbles(dur, rate, 120, 420, 0.045)
    for _ in range(int(dur * 1.5)):
        s = suction(rng.uniform(0.25, 0.5), rng.uniform(200, 350), rng.uniform(600, 1000), rng.uniform(0.3, 0.6))
        i = sec(rng.uniform(0, max(0.01, dur - 0.5)))
        x[i:i + len(s)] += s[: n - i]
    fade = np.minimum(1, np.minimum(np.arange(n), n - np.arange(n)) / sec(0.08))
    return norm(x) * fade


def whoosh(dur=0.45, f0=300, f1=2600, f2=500):
    n = sec(dur)
    h = n // 2
    a = sweep_bp(pink(dur / 2), f0, f1, q=2.5)
    b = sweep_bp(pink(dur - dur / 2), f1, f2, q=2.5)
    x = np.concatenate([a, b])[:n]
    e = np.sin(np.pi * np.arange(n) / n) ** 1.6
    return norm(x * e)


def thud(depth=1.0):
    d = 0.5
    n = sec(d)
    return norm(sine(70, d, 32) * expdecay(n, 0.12) + filt(noise(d), "lp", 400) * expdecay(n, 0.05) * 0.6) * depth


def boom(dur=1.6):
    n = sec(dur)
    x = sine(48, dur, 40) * 0.9 + sine(96, dur, 80) * 0.35 + filt(noise(dur), "lp", 150) * 0.3
    return norm(x * expdecay(n, 0.5, 0.01))


def crunch(dur, density=120):
    n = sec(dur)
    clicks = np.zeros(n)
    k = int(dur * density)
    idx = rng.integers(0, n, k)
    clicks[idx] = rng.uniform(-1, 1, k)
    c = filt(clicks, "bp", [1500, 7000])
    creak_t = np.arange(n) / SR
    saw = signal.sawtooth(2 * np.pi * (55 + 8 * np.sin(2 * np.pi * 0.7 * creak_t)) * creak_t)
    creak = filt(saw * (0.5 + 0.5 * np.abs(filt(noise(dur), "lp", 6))), "bp", [180, 700])
    return norm(c * 1.0 + creak * 0.35)


def car_creak(dur=1.6):
    n = sec(dur)
    t = np.arange(n) / SR
    rate = 30 + 25 * np.sin(2 * np.pi * 0.6 * t)
    ph = np.cumsum(rate) / SR
    imp = (np.diff(np.floor(ph), prepend=0) > 0).astype(float) * rng.uniform(0.5, 1, n)
    metal = filt(imp, "bp", [900, 3200])
    for fr in (1250, 1890, 2710):
        metal += filt(imp, "bp", [fr * 0.98, fr * 1.02]) * 2.5
    groan = sine(85, dur, 70) * 0.3 * (0.5 + 0.5 * np.sin(2 * np.pi * 3 * t))
    e = adsr(n, 0.15, dur * 0.6, 0.4, 0.3)
    return norm((metal + groan) * e)


def tide_rush(dur=3.0):
    n = sec(dur)
    body = sweep_bp(pink(dur), 300, 1600, q=1.2)
    foam = filt(noise(dur), "hp", 3000) * np.abs(filt(noise(dur), "lp", 30)) * 6
    e = np.linspace(0.2, 1.0, n) ** 1.5
    return norm((body + foam * 0.5) * e)


def breath_out(dur=0.9):
    n = sec(dur)
    x = sweep_bp(noise(dur), 1400, 700, q=1.5)
    return norm(x * adsr(n, 0.08, dur * 0.7, 0.0))


def pat():
    d = 0.08
    return norm(filt(noise(d), "bp", [900, 4000]) * expdecay(sec(d), 0.012))


def trickle(dur):
    n = sec(dur)
    fizz = filt(noise(dur), "hp", 4000) * np.abs(filt(noise(dur), "lp", 12)) * 4
    return norm(fizz * 0.6 + bubbles(dur, 26, 500, 1600, 0.02) * 0.8)


def plunge():
    d = 1.4
    n = sec(d)
    s1 = sweep_bp(noise(0.45), 1400, 220, q=7, curve=0.6) * adsr(sec(0.45), 0.01, 0.3, 0.2, 0.1) * 3
    x = np.zeros(n)
    x[:len(s1)] += s1
    x += sine(65, d, 30) * expdecay(n, 0.18) * 1.2
    sp = filt(noise(0.7), "hp", 1500) * expdecay(sec(0.7), 0.15)
    x[sec(0.05):sec(0.05) + len(sp)] += sp * 0.6
    bb = bubbles(0.9, 20, 150, 500, 0.04)
    x[sec(0.4):sec(0.4) + len(bb)] += bb * 0.7
    return norm(x)


def gull():
    d = 0.42
    n = sec(d)
    f = 1500 + 900 * np.sin(np.pi * np.arange(n) / n) ** 0.7
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph) + 0.4 * np.sin(2 * ph) + 0.2 * np.sin(3 * ph)
    return norm(x * adsr(n, 0.03, 0.3, 0.0) * (1 + 0.3 * np.sin(2 * np.pi * 28 * np.arange(n) / SR)))


def pad(dur, freqs, cutoff=900, detune=0.004):
    n = sec(dur)
    t = np.arange(n) / SR
    x = np.zeros(n)
    for fq in freqs:
        for dt in (-detune, 0, detune):
            x += signal.sawtooth(2 * np.pi * fq * (1 + dt) * t + rng.uniform(0, 6))
    x = filt(x, "lp", cutoff, 2)
    fade = np.minimum(1, np.minimum(t / 0.6, (dur - t) / 0.6))
    return norm(x * np.clip(fade, 0, 1))


# ----------------------------------------------------------------------------- the mix
def build():
    vo, vsr = sf.read(os.path.join(SCRATCH, "vo.wav"))
    if vo.ndim > 1:
        vo = vo.mean(1)
    if vsr != SR:
        vo = signal.resample_poly(vo, SR, vsr)
    vo = np.pad(vo, (0, max(0, N - len(vo))))[:N]

    amb, sfx, mus = Track(), Track(), Track()
    sets_at = [(SHOT[n][0], SHOT[n][1], st) for n, *_r in SHOTS for st in [SHOT[n][2]]]

    # ambience per set: wind + distant surf on the beach, muffled inside the cutaways, lapping in the pool
    wind = filt(pink(END + 0.3), "lp", 700) * (0.6 + 0.4 * np.abs(filt(noise(END + 0.3), "lp", 0.4)) * 4)
    surf = filt(brown(END + 0.3), "bp", [120, 900])
    t = np.arange(N) / SR
    swell = 0.35 + 0.65 * np.clip(np.sin(2 * np.pi * t / 7.0), 0, 1) ** 2
    beach = norm(wind[:N] * 0.7 + surf[:N] * swell * 0.6)
    under = norm(filt(beach, "lp", 260))
    poolamb = norm(filt(pink(END + 0.3), "bp", [200, 1200])[:N] * (0.5 + 0.5 * np.sin(2 * np.pi * 0.45 * t)))
    for t0, t1, st in sets_at:
        i0, i1 = sec(t0), min(N, sec(t1))
        src = {"beach": beach, "car": beach, "section_x": under, "section_y": under, "macro": under * 0.5, "pool": poolamb}[st]
        seg = src[i0:i1].copy()
        k = min(len(seg) // 2, sec(0.03))
        if k:
            seg[:k] *= np.linspace(0, 1, k); seg[-k:] *= np.linspace(1, 0, k)
        amb.L[i0:i1] += seg; amb.R[i0:i1] += seg
    for tg, pan in ((0.7, -0.5), (13.4, 0.6), (40.2, -0.4)):
        sfx.add(tg, gull(), -30, pan)

    # whooshes on cuts (stronger into cutaways / other sets)
    prev = None
    for name, t0, t1, st in SHOTS:
        if prev is not None and t0 > 0.5:
            big = st != prev
            sfx.add(t0 - 0.22, whoosh(0.5 if big else 0.32), -12 if big else -22, rng.uniform(-0.5, 0.5))
        prev = st

    # 1-2 footsteps, then the foot plunges in
    for ts in (0.425, 0.95, 1.475):
        sfx.add(ts - 0.02, footstep_wet(), -12, 0.1)
    sfx.add(1.98, suction(0.5, 220, 800, 1.0, down=True), -6)
    sfx.add(2.0, thud(0.8), -10)
    # 3 sinking
    a, b, _ = SHOT["sink_front"]
    sfx.add(a, mud_bed(b - a + 0.1, 8), -10)
    # 4 yanks
    a, b, _ = SHOT["yank"]
    for u in (0.2, 0.58, 1.0):
        sfx.add(a + (b - a) * u - 0.18, suction(0.42, 250, 1200), -6, -0.2)
    # 5 section: muffled squelch
    a, b, _ = SHOT["section_knees"]
    sfx.add(a + 0.6, filt(suction(0.5, 200, 700), "lp", 900), -10)
    sfx.add(a + 1.4, filt(suction(0.5, 200, 700), "lp", 900), -12)
    # 6 macro: grains locking
    a, b, _ = SHOT["macro_lock"]
    sfx.add(a, crunch(b - a), -14)
    # 7 car: strain creak
    a, b, _ = SHOT["car"]
    sfx.add(a + 0.6, car_creak(1.8), -10, 0.3)
    sfx.add(a + 0.4, footstep_wet(0.6), -20)
    # 8 panic sinking
    a, b, _ = SHOT["orbit_sink"]
    sfx.add(a, mud_bed(b - a, 12), -8)
    # 9 settles: thud
    a, b, _ = SHOT["section_waist"]
    sfx.add(a + (b - a) * 0.45, filt(thud(1.0), "lp", 500), -6)
    sfx.add(a, filt(mud_bed(b - a, 6), "lp", 800), -16)
    # 10 relief
    a, b, _ = SHOT["stop_waist"]
    sfx.add(a + 0.4, breath_out(1.0), -20)
    # 11 bad news sting
    a, b, _ = SHOT["bad_news"]
    sfx.add(a + 0.12, boom(1.8), -8)
    # 12 struggle
    a, b, _ = SHOT["stuck_high"]
    for u in (0.3, 0.75):
        sfx.add(a + (b - a) * u - 0.1, suction(0.35, 250, 700, 0.8), -12)
    # 13-14 tide rushing in
    a, _, _ = SHOT["tide_aerial"]; _, b, _ = SHOT["tide_low"]
    sfx.add(a, tide_rush(b - a + 0.4), -9)
    # 15 calm: breath out
    a, b, _ = SHOT["calm_face"]
    sfx.add(a + (b - a) * 0.3, breath_out(1.1), -16)
    # 16 lean back: slow mud shift
    a, b, _ = SHOT["lean_back"]
    sfx.add(a + 0.3, suction(1.0, 180, 450, 0.7, down=True), -14)
    # 18 wiggle (muffled squish)
    a, b, _ = SHOT["section_wiggle"]
    for k in range(3):
        sfx.add(a + 0.2 + k * 0.55, filt(suction(0.4, 200, 600, 0.6), "lp", 800), -16)
    # 19 water seeps in
    a, b, _ = SHOT["macro_seep"]
    sfx.add(a + 0.2, trickle(b - a - 0.2), -12)
    sfx.add(a + (b - a) * 0.6, crunch(1.2, 60), -20)
    # 20 float up: slow release
    a, b, _ = SHOT["float_up"]
    sfx.add(a + 0.2, suction(1.4, 160, 520, 0.8), -12)
    # 21 roll out: pop free, flop onto firm sand
    a, b, _ = SHOT["roll_out"]
    sfx.add(a + 0.15, suction(0.5, 300, 1400, 1.0), -6)
    sfx.add(a + (b - a) * 0.72, thud(0.7), -10)
    sfx.add(a + (b - a) * 0.75, footstep_wet(0.6), -16)
    # 22 brush hands off
    a, b, _ = SHOT["hero"]
    for u in (0.36, 0.44, 0.52, 0.6):
        sfx.add(a + (b - a) * u, pat(), -16, rng.uniform(-0.2, 0.2))
    # 23 one confident step
    a, b, _ = SHOT["step"]
    sfx.add(b - 0.06, footstep_wet(0.9), -10)
    # 24 plunge
    a, b, _ = SHOT["drop"]
    sfx.add(a, plunge(), -1)
    sfx.add(a + 0.05, whoosh(0.3, 2000, 600, 200), -14)

    # music bed: low tension under the problem, warm under the fix, bright for the "expert", silence after the drop
    def music(t0, t1, freqs, cutoff, g):
        mus.add(t0, pad(t1 - t0, freqs, cutoff), g)
    music(SHOT["sink_front"][0], SHOT["calm_face"][0], [55.0, 82.4, 110.0], 260, -24)
    music(SHOT["calm_face"][0], SHOT["hero"][0], [73.4, 110.0, 146.8, 185.0], 700, -27)
    music(SHOT["hero"][0], SHOT["drop"][0] + 0.02, [98.0, 146.8, 196.0, 246.9, 293.7], 1500, -25)

    # duck ambience/music under the voice
    env = np.abs(signal.hilbert(vo)) if False else np.abs(vo)
    env = filt(env, "lp", 6)
    env = np.clip(env / (env.max() + 1e-9) * 4, 0, 1)
    duck = db(-7) ** env
    L = vo * db(-1) + (amb.L * db(-24) + mus.L) * duck + sfx.L
    R = vo * db(-1) + (amb.R * db(-24) + mus.R) * duck + sfx.R
    st = np.stack([L, R], 1)
    st = st / max(1.0, np.abs(st).max() / 0.97)
    sf.write(os.path.join(SCRATCH, "mix.wav"), st.astype(np.float32), SR)
    sf.write(os.path.join(SCRATCH, "sfx_only.wav"), np.stack([sfx.L, sfx.R], 1).astype(np.float32) * 0.5, SR)
    print("wrote mix.wav", round(N / SR, 2), "s")


if __name__ == "__main__":
    build()
