"""Sound design for the lightning short, synthesised from scratch (no samples): rain (outside and
drumming on the roof inside the car), driving and wipers, thunder cracks and rumbles, electrical
buzz and crackle, sparks, tire blast and hiss, antenna sizzle, glass shatter, dash frying, the sun's
roar, dawn birds and drips, the rolling hubcap and the sagging car, whooshes on cuts and a music bed.
Mixed under the narration with ducking.

usage: <venv>/bin/python sound.py   (needs numpy, scipy, soundfile; reads $QS_SCRATCH/vo.wav)
writes $QS_SCRATCH/mix.wav (48 kHz stereo)
"""
import os, sys
import numpy as np
import soundfile as sf
from scipy import signal

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from timeline import SHOT, SHOTS, END, FPS, f

SCRATCH = os.environ["QS_SCRATCH"]
SR = 48000
N = int((END + 0.3) * SR)
rng = np.random.default_rng(23)


# ----------------------------------------------------------------------------- dsp helpers
def sec(t):
    return int(round(t * SR))


def noise(dur):
    return rng.standard_normal(sec(dur))


def pink(dur):
    b = [0.049922035, -0.095993537, 0.050612699, -0.004408786]
    a = [1, -2.494956002, 2.017265875, -0.522189400]
    return signal.lfilter(b, a, noise(dur)) * 6.0


def brown(dur):
    x = np.cumsum(noise(dur)) / SR * 60
    return signal.sosfilt(signal.butter(1, 20, "hp", fs=SR, output="sos"), x)


def filt(x, kind, fq, order=2):
    return signal.sosfilt(signal.butter(order, fq, kind, fs=SR, output="sos"), x)


def sweep_bp(x, f0, f1, q=4.0, curve=1.0, block=512):
    out = np.zeros_like(x); zi = None; n = len(x)
    for i in range(0, n, block):
        u = (i / max(1, n - 1)) ** curve
        fc = f0 * (f1 / f0) ** u; bw = fc / q
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
    m = (t >= A) & (t < D); e[m] = 1 - (1 - s) * (t[m] - A) / max(d, 1e-6)
    m = (t >= D) & (t < H); e[m] = s
    m = t >= H; e[m] = s * np.exp(-(t[m] - H) / max(r, 1e-3)) if r else 0
    return e


def expdecay(n, tau, attack=0.002):
    t = np.arange(n) / SR
    return np.minimum(1, t / attack) * np.exp(-t / tau)


def sine(fq, dur, f_end=None, phase=0.0):
    n = sec(dur)
    fr = np.full(n, fq) if f_end is None else fq * (f_end / fq) ** (np.arange(n) / max(1, n - 1))
    return np.sin(2 * np.pi * np.cumsum(fr) / SR + phase)


def norm(x, peak=1.0):
    m = np.abs(x).max()
    return x / m * peak if m > 0 else x


def db(v):
    return 10 ** (v / 20)


def fade(x, a=0.02, b=0.05):
    n = len(x); ka, kb = min(n // 2, sec(a)), min(n // 2, sec(b))
    x = x.copy()
    if ka:
        x[:ka] *= np.linspace(0, 1, ka)
    if kb:
        x[-kb:] *= np.linspace(1, 0, kb)
    return x


class Track:
    def __init__(self):
        self.L = np.zeros(N); self.R = np.zeros(N)

    def add(self, t, x, gain_db=0.0, pan=0.0):
        i = sec(max(0.0, t))
        if i >= N:
            return
        x = x[: N - i] * db(gain_db)
        l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
        self.L[i:i + len(x)] += x * l * 1.414
        self.R[i:i + len(x)] += x * r * 1.414


def ft(frame):
    return (frame - 1) / FPS


def shot(name):
    a, b, _ = SHOT[name]
    return a, b


# ----------------------------------------------------------------------------- sound objects
def clicks(dur, rate, band, size=1.0):
    n = sec(dur); x = np.zeros(n)
    k = int(dur * rate)
    idx = rng.integers(0, n, k); x[idx] = rng.uniform(-1, 1, k) * size
    return filt(x, "bp", band)


def rain_outside(dur):
    hiss = filt(pink(dur), "hp", 500) * 0.8
    patter = clicks(dur, 2500, [1500, 9000], 1.0) * 1.2
    body = filt(brown(dur), "bp", [80, 400]) * 0.6
    swell = 0.8 + 0.2 * filt(noise(dur), "lp", 0.5) * 30
    return norm((hiss + patter + body) * np.clip(swell, 0.5, 1.2))


def rain_inside(dur):
    """Muffled rain plus drops drumming on the metal roof."""
    m = filt(rain_outside(dur), "lp", 900) * 0.7
    n = sec(dur); drum = np.zeros(n)
    k = int(dur * 220)
    for i in rng.integers(0, n - sec(0.03), k):
        tick = np.sin(2 * np.pi * rng.uniform(700, 1400) * np.arange(sec(0.025)) / SR) * expdecay(sec(0.025), 0.004)
        drum[i:i + len(tick)] += tick * rng.uniform(0.2, 1.0)
    return norm(m + filt(drum, "bp", [400, 3000]) * 0.5)


def thunder_crack(dur=4.5, near=1.0):
    n = sec(dur)
    crack = np.zeros(n)
    t = 0.0
    while t < 0.35 * near + 0.05:                     # a ripping series of cracks
        d = rng.uniform(0.01, 0.04)
        b = filt(noise(d), "hp", 1200) * expdecay(sec(d), d / 3, 0.0005) * rng.uniform(0.5, 1.0)
        i = sec(t); crack[i:i + len(b)] += b[: n - i]
        t += rng.uniform(0.008, 0.05)
    boomx = sine(42, dur, 28) * expdecay(n, 0.8, 0.01) * 0.9
    rumble = filt(brown(dur), "lp", 180) * expdecay(n, dur / 2.5, 0.05)
    roll = 0.5 + 0.5 * np.clip(filt(noise(dur), "lp", 2.5) * 40, -1, 1)
    return norm(crack * 1.6 * near + boomx + rumble * roll * 1.2)


def thunder_far(dur=4.0):
    n = sec(dur)
    x = filt(brown(dur), "lp", 120) * adsr(n, 0.4, dur * 0.4, 0.4, dur * 0.3)
    return norm(x * (0.6 + 0.4 * np.clip(filt(noise(dur), "lp", 1.5) * 40, -1, 1)))


def buzz(dur, fq=120, crackle=1.0):
    n = sec(dur); t = np.arange(n) / SR
    x = sum(np.sign(np.sin(2 * np.pi * fq * h * t)) / h for h in (1, 2, 3, 5)) * 0.4
    x = filt(x, "bp", [80, 3000])
    cr = clicks(dur, 900, [2000, 10000], 1.0) * crackle
    return norm(x * (0.6 + 0.4 * np.abs(filt(noise(dur), "lp", 8)) * 6) + cr)


def zap(dur=0.35):
    n = sec(dur)
    x = clicks(dur, 4000, [1500, 12000], 1.0) * 2 + sine(1800, dur, 300) * 0.4
    return norm(x * adsr(n, 0.002, dur * 0.8, 0.0))


def sizzle(dur):
    n = sec(dur)
    return norm(clicks(dur, 1800, [3000, 12000]) * (0.4 + 0.6 * np.abs(filt(noise(dur), "lp", 4)) * 5))


def bang():
    d = 0.6; n = sec(d)
    x = filt(noise(d), "lp", 6000) * expdecay(n, 0.03, 0.0005) * 1.5 + sine(65, d, 35) * expdecay(n, 0.12)
    return norm(x)


def hiss(dur, slow=False):
    n = sec(dur)
    x = filt(noise(dur), "hp", 2500)
    e = np.exp(-np.arange(n) / SR / (dur / (1.5 if slow else 3))) * (1 + 0.2 * np.sin(2 * np.pi * 7 * np.arange(n) / SR))
    return norm(x * e * adsr(n, 0.01 if not slow else 0.15, dur, 1.0))


def shatter(dur=1.4):
    n = sec(dur)
    x = filt(noise(0.08), "hp", 1500) * expdecay(sec(0.08), 0.02)
    out = np.zeros(n); out[:len(x)] += x * 1.5
    t = 0.0
    while t < dur - 0.1:
        fq = rng.uniform(2500, 9000); d = rng.uniform(0.03, 0.12)
        p = np.sin(2 * np.pi * fq * np.arange(sec(d)) / SR) * expdecay(sec(d), d / 4)
        i = sec(t); out[i:i + len(p)] += p[: n - i] * rng.uniform(0.2, 0.8) * np.exp(-t * 2.0)
        t += rng.exponential(0.012 + t * 0.03)
    return norm(out)


def engine(dur):
    n = sec(dur); t = np.arange(n) / SR
    hum = sum(np.sin(2 * np.pi * 38 * h * t + rng.uniform(0, 6)) / h for h in (1, 2, 3, 4)) * 0.4
    tires = filt(pink(dur), "bp", [300, 2500]) * 0.8
    return norm(hum + tires)


def wiper():
    d = 0.5; n = sec(d)
    sw = sweep_bp(noise(d), 600, 1400, q=2) * np.sin(np.pi * np.arange(n) / n) ** 2
    th = sine(90, 0.12) * expdecay(sec(0.12), 0.03)
    x = sw * 0.6; x[-len(th):] += th * 0.8
    return norm(x)


def whoosh(dur=0.45, f0=300, f1=2600, f2=500):
    n = sec(dur)
    a = sweep_bp(pink(dur / 2), f0, f1, q=2.5); b = sweep_bp(pink(dur - dur / 2), f1, f2, q=2.5)
    x = np.concatenate([a, b])[:n]
    return norm(x * np.sin(np.pi * np.arange(n) / n) ** 1.6)


def roar(dur):
    n = sec(dur)
    x = filt(brown(dur), "lp", 220) * 1.2 + filt(pink(dur), "bp", [200, 900]) * 0.4
    return norm(x * adsr(n, 0.25, dur, 1.0))


def bird():
    d = rng.uniform(0.12, 0.25); n = sec(d)
    f0 = rng.uniform(2800, 4200)
    fr = f0 * (1 + 0.35 * np.sin(2 * np.pi * rng.uniform(8, 16) * np.arange(n) / SR))
    return norm(np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.sin(np.pi * np.arange(n) / n) ** 2)


def drip():
    d = 0.08; n = sec(d)
    return norm(sine(rng.uniform(900, 1600), d, rng.uniform(1800, 2600)) * expdecay(n, 0.015))


def hubcap_roll(dur):
    """Metal disc rolling on asphalt, slowing, then the wobbling spin-down and a final clatter."""
    n = sec(dur); x = np.zeros(n)
    t = 0.0; rate = 18.0
    while t < dur * 0.7:
        c = filt(noise(0.02), "bp", [2000, 6000]) * expdecay(sec(0.02), 0.004)
        ring = np.sin(2 * np.pi * 2400 * np.arange(sec(0.05)) / SR) * expdecay(sec(0.05), 0.012) * 0.4
        i = sec(t); x[i:i + len(c)] += c[: n - i]; x[i:i + len(ring)] += ring[: n - i]
        t += 1 / rate; rate *= 0.985
    w0 = sec(dur * 0.62); wd = n - w0
    tw = np.arange(wd) / SR
    wob_rate = 6 + 30 * (tw / tw[-1]) ** 2                       # accelerating wobble
    wob = np.sin(2 * np.pi * np.cumsum(wob_rate) / SR)
    metal = np.sin(2 * np.pi * 1900 * tw) * 0.3 + filt(noise(len(tw) / SR), "bp", [1500, 5000]) * 0.6
    x[w0:] += metal * (0.5 + 0.5 * wob) * np.exp(-((tw - tw[-1] * 0.9) / (tw[-1] * 0.6)) ** 2) * 0.8
    return norm(x)


def creak(dur=1.2):
    n = sec(dur); t = np.arange(n) / SR
    rate = 25 + 15 * np.sin(2 * np.pi * 0.8 * t)
    imp = (np.diff(np.floor(np.cumsum(rate) / SR), prepend=0) > 0).astype(float)
    metal = filt(imp, "bp", [700, 2600]) * 3
    groan = sine(70, dur, 52) * 0.4
    return norm((metal + groan) * adsr(n, 0.1, dur * 0.7, 0.3, 0.2))


def pad(dur, freqs, cutoff=900, detune=0.004):
    n = sec(dur); t = np.arange(n) / SR; x = np.zeros(n)
    for fq in freqs:
        for dt in (-detune, 0, detune):
            x += signal.sawtooth(2 * np.pi * fq * (1 + dt) * t + rng.uniform(0, 6))
    x = filt(x, "lp", cutoff, 2)
    return norm(x * np.clip(np.minimum(t / 0.6, (dur - t) / 0.6), 0, 1))


# ----------------------------------------------------------------------------- the mix
INSIDE = {"driver_flash", "dash", "driver_fine", "window_rain", "xray_cabin", "driver_xray"}


def build():
    vo, vsr = sf.read(os.path.join(SCRATCH, "vo.wav"))
    if vo.ndim > 1:
        vo = vo.mean(1)
    if vsr != SR:
        vo = signal.resample_poly(vo, SR, vsr)
    vo = np.pad(vo, (0, max(0, N - len(vo))))[:N]
    amb, sfx, mus = Track(), Track(), Track()
    D = END + 0.3

    # ambience per shot: rain outside / inside, roar for the sun, birds and drips at dawn
    outside = rain_outside(D)[:N]; inside = rain_inside(D)[:N]; sunroar = roar(D)[:N]
    t = np.arange(N) / SR
    breeze = norm(filt(pink(D), "lp", 500)[:N]) * 0.4
    for name, t0, t1, st in SHOTS:
        i0, i1 = sec(t0), min(N, sec(t1))
        if st == "dawn":
            src = breeze
        elif st == "sun":
            src = sunroar * 1.4
        elif name in INSIDE:
            src = inside
        else:
            src = outside
        seg = fade(src[i0:i1], 0.015, 0.015)
        amb.L[i0:i1] += seg; amb.R[i0:i1] += seg
    for name in ("dawn_wide", "step_out", "hubcap", "sag"):
        a, b = shot(name)
        tt = a + 0.1
        while tt < b:
            sfx.add(tt, bird(), -30, rng.uniform(-0.8, 0.8)); tt += rng.uniform(0.25, 0.9)
        for _ in range(3):
            sfx.add(rng.uniform(a, b), drip(), -26, rng.uniform(-0.5, 0.5))

    # whooshes on cuts into a different set
    prev = None
    for name, t0, t1, st in SHOTS:
        if prev is not None and t0 > 0.5:
            big = st != prev
            sfx.add(t0 - 0.2, whoosh(0.45 if big else 0.3), -13 if big else -23, rng.uniform(-0.5, 0.5))
        prev = st

    # opening: driving, wipers, distant thunder
    a, b = shot("tire_roll")
    sfx.add(0.0, fade(engine(b + 0.1), 0.3, 0.1), -16)
    for k in range(int(b / 1.3) + 1):
        tt = k * 1.3 + 0.3
        if tt < b:
            sfx.add(tt, wiper(), -22 if k != 1 else -16)
    sfx.add(ft(f(SHOT["aerial_drive"][0]) + 13) + 0.6, thunder_far(4.0), -8, 0.4)
    sfx.add(ft(f(SHOT["driver_flash"][0]) + 3) + 0.25, thunder_crack(4.0, 0.5), -9, -0.3)
    # the bolt crossing the sky: building crackle then the return-stroke crack
    a, b = shot("bolt_sky")
    g1 = ft(f(a) + 44)
    sfx.add(a + 0.15, fade(filt(sizzle(g1 - a - 0.15), "hp", 1500), 0.4, 0.02), -24)
    sfx.add(g1, thunder_crack(5.0, 1.0), -3)
    # tire close-ups: arc jumping over the rubber
    a, b = shot("arc_jump")
    sfx.add(ft(f(a) + 4), zap(0.5), -10); sfx.add(ft(f(a) + 4), buzz(b - a - 0.1, 120, 1.0), -18)
    # THE STRIKE
    a, b = shot("strike_wide")
    hit = ft(f(a) + 8)
    sfx.add(hit - 0.05, zap(0.3), -6)
    sfx.add(hit, thunder_crack(6.0, 1.3), 0)
    a, b = shot("antenna_hit")
    sfx.add(a, buzz(b - a, 100, 1.4), -10); sfx.add(a + 0.1, sizzle(b - a), -14)
    a, b = shot("xray_current")
    sfx.add(a, buzz(b - a, 110, 1.2), -11)
    for k in range(5):
        sfx.add(a + k * 0.33, zap(0.25), -14, rng.uniform(-0.6, 0.6))
    a, b = shot("tire_blast")
    sfx.add(a + 0.15, bang(), -5); sfx.add(a + 0.2, sizzle(1.6), -12); sfx.add(a + 0.3, hiss(1.8), -16)
    sfx.add(a, buzz(b - a, 100, 1.0), -16)
    for name in ("xray_cabin", "driver_xray"):
        a, b = shot(name)
        sfx.add(a, filt(buzz(b - a, 110, 0.8), "lp", 2500), -15)
    a, b = shot("car_smoke")
    sfx.add(a, sizzle(b - a), -22); sfx.add(a + 0.2, thunder_far(3.0), -14, -0.5)
    a, b = shot("bolt_macro")
    sfx.add(a, buzz(b - a, 90, 1.6), -9); sfx.add(a, filt(roar(b - a), "lp", 300), -14)
    # damage list
    a, b = shot("antenna_melt")
    sfx.add(a + 0.1, sizzle(b - a), -12); sfx.add(a + 0.4, sine(2200, 1.0, 900) * adsr(sec(1.0), 0.1, 0.8, 0.0), -26)
    a, b = shot("tire_pop")
    pop = ft(f(a) + 6)
    sfx.add(pop, bang(), -2); sfx.add(pop + 0.04, hiss(1.2), -10)
    a, b = shot("glass")
    sfx.add(ft(f(a) + 3), shatter(1.4), -4)
    a, b = shot("dash")
    for k in range(6):
        sfx.add(a + 0.15 + k * 0.2 + rng.uniform(0, 0.1), zap(0.15), -14, -0.2)
    fry = ft(f(a) + int(round((f(b) - 1 - f(a)) * 0.62)))
    sfx.add(fry - 0.08, sine(900, 0.5, 60) * adsr(sec(0.5), 0.01, 0.45, 0.0), -14)
    sfx.add(fry, bang() * 0.4, -12)
    # roof: rain bouncing
    a, b = shot("roof_crane")
    sfx.add(a, clicks(b - a, 300, [800, 4000]), -18)
    # convertible strike
    a, b = shot("conv_xray")
    sfx.add(ft(f(a) + 6), thunder_crack(4.0, 1.2), -2); sfx.add(ft(f(a) + 6), buzz(b - a - 0.25, 100, 1.4), -12)
    # dawn and the punchline
    a, b = shot("dawn_wide")
    sfx.add(a + 0.4, filt(noise(0.9), "bp", [500, 1600]) * adsr(sec(0.9), 0.1, 0.8, 0.0), -26)   # stretch exhale
    a, b = shot("hubcap")
    pop = ft(f(a) + 8)
    sfx.add(pop - 0.02, filt(noise(0.04), "bp", [1500, 6000]) * expdecay(sec(0.04), 0.008), -8)
    sfx.add(pop, hubcap_roll(b - pop + 0.7), -9, 0.3)
    a, b = shot("sag")
    sfx.add(ft(f(a) + 4), hiss(1.6, slow=True), -12, -0.2)
    sfx.add(ft(f(a) + 12), creak(1.3), -12)

    # music: low tension through the storm, warm when he's fine, light at dawn, out on the punchline
    def music(t0, t1, freqs, cutoff, g):
        mus.add(t0, pad(t1 - t0, freqs, cutoff), g)
    music(0.0, SHOT["strike_wide"][0], [55.0, 82.4, 110.0], 300, -25)
    music(SHOT["xray_cabin"][0], SHOT["driver_fine"][0], [49.0, 73.4, 98.0], 260, -26)
    music(SHOT["driver_fine"][0], SHOT["dawn_wide"][0], [73.4, 110.0, 146.8, 185.0], 650, -27)
    music(SHOT["dawn_wide"][0], SHOT["hubcap"][0] + 0.3, [98.0, 146.8, 196.0, 246.9, 293.7], 1500, -25)

    env = filt(np.abs(vo), "lp", 6)
    env = np.clip(env / (env.max() + 1e-9) * 4, 0, 1)
    duck = db(-7) ** env
    sduck = db(-4) ** env
    L = vo * db(-1) + (amb.L * db(-26) + mus.L) * duck + sfx.L * sduck
    R = vo * db(-1) + (amb.R * db(-26) + mus.R) * duck + sfx.R * sduck
    st = np.stack([L, R], 1)
    st = st / max(1.0, np.abs(st).max() / 0.97)
    sf.write(os.path.join(SCRATCH, "mix.wav"), st.astype(np.float32), SR)
    print("wrote mix.wav", round(N / SR, 2), "s")


if __name__ == "__main__":
    build()
