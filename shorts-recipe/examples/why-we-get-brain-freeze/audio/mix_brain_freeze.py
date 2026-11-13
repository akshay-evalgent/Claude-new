"""Music + sound effects + voiceover for the brain freeze short.
Everything is synthesized here so the track is original and royalty-free."""
import sys, numpy as np, soundfile as sf
from scipy import signal

SR = 48000
DUR = 974 / 30
vo_path, out_path, stems_dir = sys.argv[1], sys.argv[2], sys.argv[3]
N = int(DUR * SR)
rng = np.random.default_rng(33)
t_all = np.arange(N) / SR


def db(x): return 10 ** (x / 20)
def env_adsr(n, a, d, s, r):
    tt = np.arange(n) / SR
    e = np.where(tt < a, tt / max(a, 1e-6), np.where(tt < a + d, 1 - (1 - s) * (tt - a) / max(d, 1e-6), s))
    rel = np.clip((n / SR - tt) / max(r, 1e-6), 0, 1)
    return e * rel
def bp(x, lo, hi, order=2): b, a = signal.butter(order, [lo / (SR / 2), hi / (SR / 2)], 'band'); return signal.lfilter(b, a, x)
def lp(x, f, order=2): b, a = signal.butter(order, f / (SR / 2), 'low'); return signal.lfilter(b, a, x)
def hp(x, f, order=2): b, a = signal.butter(order, f / (SR / 2), 'high'); return signal.lfilter(b, a, x)
def place(track, clip, t, gain_db=0.0, pan=0.0):
    i = int(t * SR); n = min(len(clip), N - i)
    if n <= 0 or i < 0: return
    l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    track[0, i:i + n] += clip[:n] * db(gain_db) * l * 1.414
    track[1, i:i + n] += clip[:n] * db(gain_db) * r * 1.414
def norm(x): return x / (np.max(np.abs(x)) + 1e-9)

# ---------------- sound effects ----------------
def plip(f0=1400, f1=420, dur=0.09):
    n = int(dur * SR); tt = np.arange(n) / SR; f = f1 + (f0 - f1) * np.exp(-tt * 45)
    ph = 2 * np.pi * np.cumsum(f) / SR; return norm(np.sin(ph) * np.exp(-tt * 38))
def splash(dur=0.35, lo=800, hi=7000):
    n = int(dur * SR); tt = np.arange(n) / SR; x = bp(rng.standard_normal(n), lo, hi)
    return norm(x * np.exp(-tt * 12) * (1 - np.exp(-tt * 300)))
def whoosh(dur=0.4, f0=300, f1=2500, rise=True):
    """Noise through a state-variable band-pass whose centre sweeps (no block clicks)."""
    n = int(dur * SR); tt = np.arange(n) / SR; x = rng.standard_normal(n); out = np.zeros(n)
    low = band = 0.0; q = 0.7
    for i in range(n):
        k = i / n; fc = f0 + (f1 - f0) * k
        f = 2 * np.sin(np.pi * min(fc, 12000) / SR)
        high = x[i] - low - q * band; band += f * high; low += f * band; out[i] = band
    e = np.sin(np.pi * np.clip(tt / dur, 0, 1)) ** 1.5; return norm(lp(out, 7000) * e)
def tick(f=4200):
    n = int(0.02 * SR); tt = np.arange(n) / SR; return norm(np.sin(2 * np.pi * f * tt) * np.exp(-tt * 500) + 0.3 * rng.standard_normal(n) * np.exp(-tt * 800))
def thud(f=70, dur=0.25):
    n = int(dur * SR); tt = np.arange(n) / SR; f_ = f * (1 + 1.5 * np.exp(-tt * 30)); return norm(np.sin(2 * np.pi * np.cumsum(f_) / SR) * np.exp(-tt * 14))
def zap(dur=1.4, f0=220, f1=880):
    n = int(dur * SR); tt = np.arange(n) / SR; f = f0 * (f1 / f0) ** (tt / dur); ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sign(np.sin(ph)) * 0.4 + np.sin(ph * 2.01) * 0.6; x = lp(x, 3000) * (0.6 + 0.4 * np.sin(2 * np.pi * 28 * tt))
    return norm(x * np.sin(np.pi * tt / dur) ** 0.7)
def shrink(dur=0.5):
    n = int(dur * SR); tt = np.arange(n) / SR; f = 900 * (0.25) ** (tt / dur); return norm(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 3) * (1 - np.exp(-tt * 200)))
def pop(f=900):
    n = int(0.08 * SR); tt = np.arange(n) / SR; ff = f * (1 + 0.8 * np.exp(-tt * 60)); return norm(np.sin(2 * np.pi * np.cumsum(ff) / SR) * np.exp(-tt * 45))
def buzz(dur=0.6):
    n = int(dur * SR); tt = np.arange(n) / SR; x = signal.square(2 * np.pi * 110 * tt) * 0.5 + signal.square(2 * np.pi * 116 * tt) * 0.5
    crack = (rng.random(n) < 0.004) * rng.standard_normal(n) * 3; return norm(lp(x, 1800) * (1 - tt / dur) ** 0.5 + hp(crack, 2000) * 0.4)
def boing(dur=0.45):
    n = int(dur * SR); tt = np.arange(n) / SR; f = 300 + 120 * np.sin(2 * np.pi * 7 * tt) * np.exp(-tt * 4); return norm(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 6))
def glass(f=3100):
    n = int(0.25 * SR); tt = np.arange(n) / SR
    return norm(sum(np.sin(2 * np.pi * f * k * tt) * np.exp(-tt * (25 + 12 * k)) / k for k in (1, 2.76, 5.4)))
def zip_(dur=0.5):
    n = int(dur * SR); tt = np.arange(n) / SR; x = rng.standard_normal(n); ratchet = (np.sin(2 * np.pi * (30 + 60 * tt / dur) * tt) > 0.85).astype(float)
    return norm(bp(x, 1500, 6000) * ratchet * np.sin(np.pi * tt / dur))

fx = np.zeros((2, N))
def purr(dur, rate=26.0, breath=1.3):
    n = int(dur * SR); tt = np.arange(n) / SR
    ph = (tt * rate) % 1.0; pulse = np.exp(-ph * 9) * (1 + 0.15 * rng.standard_normal(n))
    body = lp(rng.standard_normal(n), 380) * pulse * 3 + np.sin(2 * np.pi * rate * tt) * pulse * 0.6
    br = (tt % breath) / breath; env = np.where(br < 0.48, 0.75 + 0.25 * np.sin(np.pi * br / 0.48), 1.0) * (0.15 + 0.85 * np.minimum(1, np.abs(br - 0.48) / 0.04))
    fade = np.minimum(1, tt / 0.15) * np.minimum(1, (dur - tt) / 0.2)
    return norm(hp(body, 30) * env * fade)
def mew(f0=750, dur=0.32):
    n = int(dur * SR); tt = np.arange(n) / SR; k = tt / dur
    f = f0 * (1 + 0.35 * np.sin(np.pi * k) - 0.15 * k) * (1 + 0.01 * np.sin(2 * np.pi * 7 * tt))
    ph = 2 * np.pi * np.cumsum(f) / SR; x = sum(np.sin(ph * h) / h ** 1.2 for h in range(1, 6))
    return norm(bp(x, 500, 4000) * np.sin(np.pi * k) ** 0.8)
def cry(dur=0.9, f0=430):
    n = int(dur * SR); tt = np.arange(n) / SR; k = tt / dur
    f = f0 * (1 + 0.25 * np.sin(np.pi * k * 0.9)) * (1 + 0.02 * np.sin(2 * np.pi * 9 * tt))
    ph = 2 * np.pi * np.cumsum(f) / SR; x = sum(np.sin(ph * h) / h for h in range(1, 9))
    x = bp(x, 700, 3500) * 0.7 + bp(x, 2400, 3200) * 0.6
    return norm(x * np.sin(np.pi * k) ** 0.5 * (1 - 0.3 * k))
def thunder(dur=2.4):
    n = int(dur * SR); tt = np.arange(n) / SR; x = lp(rng.standard_normal(n), 180) * 2 + lp(rng.standard_normal(n), 900) * np.exp(-tt * 8)
    return norm(x * np.exp(-tt * 1.4) * (1 - np.exp(-tt * 60)))
def scratch(dur=0.12):
    n = int(dur * SR); tt = np.arange(n) / SR; return norm(bp(rng.standard_normal(n), 2500, 9000) * np.sin(np.pi * tt / dur))
def snap():
    n = int(0.25 * SR); tt = np.arange(n) / SR; return norm(hp(rng.standard_normal(n), 2000) * np.exp(-tt * 30) + glass(1900) * 0.5 * (np.arange(n) < len(glass(1900))) if False else hp(rng.standard_normal(n), 2000) * np.exp(-tt * 30))
def chime(f=1320, dur=1.2):
    n = int(dur * SR); tt = np.arange(n) / SR; return norm(sum(np.sin(2 * np.pi * f * m * tt) * np.exp(-tt * (3 + 2 * m)) / m for m in (1, 1.5, 2, 3)))
def ding(f=2400):
    n = int(0.6 * SR); tt = np.arange(n) / SR; return norm(sum(np.sin(2 * np.pi * f * m * tt) * np.exp(-tt * (6 + 4 * m)) / m for m in (1, 2.4, 3.9)))
def crinkle(dur=1.0):
    n = int(dur * SR); x = (rng.random(n) < 0.01) * rng.standard_normal(n); x = np.convolve(x, np.exp(-np.arange(200) / 25), 'same'); return norm(hp(x, 2500) * np.sin(np.pi * np.arange(n) / n))
def yawn_snd(dur=2.0, f0=210, f1=120, breath=0.35, growl=0.0):
    n = int(dur * SR); tt = np.arange(n) / SR; k = tt / dur
    f = f0 + (f1 - f0) * k; ph = 2 * np.pi * np.cumsum(f) / SR
    saw = 2 * ((ph / (2 * np.pi)) % 1) - 1
    if growl: saw *= 1 + growl * np.sin(2 * np.pi * 28 * tt)
    voiced = bp(saw, 600, 1000) * 1.0 + bp(saw, 1050, 1500) * 0.6 + bp(saw, 2400, 2900) * 0.15
    inh = bp(rng.standard_normal(n), 400, 3000) * np.clip(1 - k / breath, 0, 1) * 0.6
    venv = np.clip((k - breath * 0.7) / 0.15, 0, 1) * np.clip((1 - k) / 0.35, 0, 1)
    return norm(voiced * venv + inh + bp(rng.standard_normal(n), 300, 2500) * venv * 0.25)
def click():
    n = int(0.03 * SR); tt = np.arange(n) / SR; return norm(np.sin(2 * np.pi * 2200 * tt) * np.exp(-tt * 300) + hp(rng.standard_normal(n), 3000) * np.exp(-tt * 500))
def hiss(dur):
    n = int(dur * SR); return norm(bp(rng.standard_normal(n), 2500, 10000) * np.minimum(1, np.arange(n) / (0.15 * SR)) * np.minimum(1, (n - np.arange(n)) / (0.3 * SR)))
def heartbeat():
    return np.concatenate([thud(55, 0.18), np.zeros(int(0.08 * SR)), thud(50, 0.2) * 0.7])
def fanwhir(dur):
    n = int(dur * SR); tt = np.arange(n) / SR; return norm(bp(rng.standard_normal(n), 200, 1500) * (0.6 + 0.4 * np.sin(2 * np.pi * 22 * tt)) * np.minimum(1, tt / 0.3) * np.minimum(1, (dur - tt) / 0.3))
def crickets(dur):
    n = int(dur * SR); tt = np.arange(n) / SR; chirp = np.sin(2 * np.pi * 4300 * tt) * (np.sin(2 * np.pi * 30 * tt) > 0.3) * ((tt * 1.7) % 1 < 0.25)
    return norm(chirp * np.minimum(1, tt / 0.2) + 0.15 * bp(rng.standard_normal(n), 3500, 6000))
def wind(dur):
    n = int(dur * SR); tt = np.arange(n) / SR; return norm(lp(rng.standard_normal(n), 500) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.4 * tt)) * np.minimum(1, tt / 0.5) * np.minimum(1, (dur - tt) / 0.5))
def glide(dur, f0, f1):
    n = int(dur * SR); tt = np.arange(n) / SR; f = f0 * (f1 / f0) ** (tt / dur); return norm(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * tt / dur) ** 0.5)
def hic_snd(f0=260, dur=0.13):
    n = int(dur * SR); tt = np.arange(n) / SR; k = tt / dur
    f = f0 * (1 + 0.25 * (1 - k)); ph = 2 * np.pi * np.cumsum(f) / SR; saw = 2 * ((ph / (2 * np.pi)) % 1) - 1
    v = bp(saw, 300, 600) * 1.0 + bp(saw, 1800, 2600) * 0.7
    clickn = hp(rng.standard_normal(n), 1500) * np.exp(-tt * 300) * 1.5
    env = np.minimum(1, tt / 0.004) * np.exp(-tt * 22)
    return norm((v + clickn) * env)
def burp_snd(dur=0.45):
    n = int(dur * SR); tt = np.arange(n) / SR; f = 95 + 25 * np.sin(2 * np.pi * 7 * tt); ph = 2 * np.pi * np.cumsum(f) / SR
    saw = 2 * ((ph / (2 * np.pi)) % 1) - 1; v = bp(saw, 200, 900) * (1 + 0.5 * rng.standard_normal(n) * 0.3)
    return norm(v * np.sin(np.pi * tt / dur) ** 0.6)
def crunch():
    n = int(0.09 * SR); tt = np.arange(n) / SR; return norm(bp(rng.standard_normal(n), 1500, 7000) * np.exp(-tt * 40) * (rng.random(n) > 0.3))
def glug():
    n = int(0.16 * SR); tt = np.arange(n) / SR; f = 180 * (1 + 0.6 * np.exp(-tt * 25)); return norm(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * tt / 0.16))
def creak(dur=0.7, f0=180):
    n = int(dur * SR); tt = np.arange(n) / SR; pulses = (np.sin(2 * np.pi * (35 + 15 * np.sin(2 * np.pi * 1.3 * tt)) * tt) > 0.92).astype(float)
    return norm(bp(np.convolve(pulses, np.exp(-np.arange(200) / 30), 'same'), f0, f0 * 6) * np.sin(np.pi * tt / dur))
def flip():
    n = int(0.06 * SR); tt = np.arange(n) / SR; return norm(bp(rng.standard_normal(n), 1200, 6000) * np.sin(np.pi * tt / 0.06))
def vowel(dur, f0, f1, formants=((700, 1100), (1100, 1500)), breath=0.35):
    n = int(dur * SR); tt = np.arange(n) / SR; f = f0 + (f1 - f0) * tt / dur; ph = 2 * np.pi * np.cumsum(f) / SR
    saw = 2 * ((ph / (2 * np.pi)) % 1) - 1; v = sum(bp(saw, lo, hi) for lo, hi in formants)
    v = v + breath * bp(rng.standard_normal(n), 500, 4000); return norm(v * np.sin(np.pi * tt / dur) ** 0.6)
def choo(dur=0.5, muffled=False):
    n = int(dur * SR); tt = np.arange(n) / SR
    burst = bp(rng.standard_normal(n), 1500, 9000) * np.exp(-tt * 9) * np.minimum(1, tt / 0.004)
    oo = vowel(dur * 0.7, 240, 150, ((250, 450), (700, 900)), 0.5); oo = np.pad(oo, (int(0.03 * SR), 0))[:n]; oo = np.pad(oo, (0, n - len(oo)))
    x = burst * 1.2 + oo * 0.6 * np.exp(-tt * 4)
    if muffled: x = lp(x, 420) * 3 + thud(70, dur)[:n] * 0.8
    return norm(x)
def sniff():
    n = int(0.22 * SR); tt = np.arange(n) / SR; return norm(bp(rng.standard_normal(n), 2000, 7000) * np.sin(np.pi * tt / 0.22) ** 2)
def gasp():
    n = int(0.25 * SR); tt = np.arange(n) / SR; return norm(bp(rng.standard_normal(n), 800, 5000) * np.sin(np.pi * tt / 0.25) * np.exp(-tt * 3))
def boing(f=500):
    n = int(0.3 * SR); tt = np.arange(n) / SR; ff = f * (1 + 0.6 * np.exp(-tt * 12)) * (1 + 0.05 * np.sin(2 * np.pi * 18 * tt)); return norm(np.sin(2 * np.pi * np.cumsum(ff) / SR) * np.exp(-tt * 10))
def bird():
    n = int(0.12 * SR); tt = np.arange(n) / SR; f = 3200 + 1400 * np.sin(np.pi * tt / 0.12); return norm(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * tt / 0.12))
def step():
    n = int(0.06 * SR); tt = np.arange(n) / SR; return norm(bp(rng.standard_normal(n), 300, 2500) * np.exp(-tt * 70))
def beep():
    n = int(0.12 * SR); tt = np.arange(n) / SR; return norm(np.sin(2 * np.pi * 980 * tt) * np.minimum(1, (0.12 - tt) / 0.02) * np.minimum(1, tt / 0.005))
def rip(dur=0.45):
    n = int(dur * SR); tt = np.arange(n) / SR; cr = (rng.random(n) < 0.03) * rng.standard_normal(n); return norm(hp(np.convolve(cr, np.exp(-np.arange(120) / 15), 'same'), 900) * np.exp(-tt * 3) + bp(rng.standard_normal(n), 400, 3000) * np.exp(-tt * 8) * 0.5)
def chatter(dur):
    n = int(dur * SR); out = np.zeros(n)
    for k in range(int(dur * 16)): i = int(k / 16 * SR) + int(rng.random() * 200); c = tick(1800 + rng.random() * 600); out[i:i + len(c)] += c[:max(0, n - i)] * 0.8
    return norm(out)
def howl(dur):
    n = int(dur * SR); tt = np.arange(n) / SR; out = np.zeros(n); low = band = 0.0; x = rng.standard_normal(n)
    for i in range(0, n):
        fc = 500 + 350 * np.sin(2 * np.pi * 0.6 * tt[i]) + 150 * np.sin(2 * np.pi * 1.7 * tt[i]); f = 2 * np.sin(np.pi * fc / SR)
        high = x[i] - low - 0.15 * band; band += f * high; low += f * band; out[i] = band
    return norm(out * np.minimum(1, tt / 0.3) * np.minimum(1, (dur - tt) / 0.3))
def honk(dur=0.28, f0=330):
    n = int(dur * SR); tt = np.arange(n) / SR; f = f0 * (1 + 0.08 * np.sin(np.pi * tt / dur)); ph = 2 * np.pi * np.cumsum(f) / SR
    saw = 2 * ((ph / (2 * np.pi)) % 1) - 1; v = bp(saw, 800, 1300) * 1.2 + bp(saw, 2200, 2800) * 0.6 + bp(saw, 300, 500) * 0.4
    return norm(v * np.minimum(1, tt / 0.01) * np.minimum(1, (dur - tt) / 0.05))
def hiss_cat(dur):
    n = int(dur * SR); tt = np.arange(n) / SR; return norm(bp(rng.standard_normal(n), 2500, 9000) * np.minimum(1, tt / 0.05) * np.exp(-tt * 1.2))
def growl(dur):
    n = int(dur * SR); tt = np.arange(n) / SR; f = 75 + 8 * np.sin(2 * np.pi * 3 * tt); ph = 2 * np.pi * np.cumsum(f) / SR; saw = 2 * ((ph / (2 * np.pi)) % 1) - 1
    return norm(lp(saw * (1 + 0.6 * np.sin(2 * np.pi * 26 * tt)), 900) * np.sin(np.pi * tt / dur))
def poof():
    n = int(0.4 * SR); tt = np.arange(n) / SR; return norm(lp(rng.standard_normal(n), 700) * np.exp(-tt * 10) * np.minimum(1, tt / 0.01))
def stinger():
    n = int(0.9 * SR); tt = np.arange(n) / SR; f = 1800 * (2 ** (tt * 1.2)); hi = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 3) * 0.6
    cl = sum(np.sin(2 * np.pi * fr * tt) for fr in (233, 247, 262, 277)) * np.exp(-tt * 2.5) * 0.4
    return norm(hi + cl + thud(50, 0.9)[:n] * 0.8)
def tingle(dur):
    n = int(dur * SR); x = (rng.random(n) < 0.006) * rng.standard_normal(n); x = np.convolve(x, np.exp(-np.arange(80) / 10), 'same'); return norm(hp(x, 3500) * np.linspace(0.2, 1, n))

# ---------------- dream-specific sounds ----------------
def mixc(*xs):
    n = max(len(x) for x in xs); return sum(np.pad(x, (0, n - len(x))) for x in xs)
def musicbox(f, dur=0.9):
    n = int(dur * SR); tt = np.arange(n) / SR
    return norm(sum(np.sin(2 * np.pi * f * m * tt) * np.exp(-tt * (5 + 6 * m)) / m ** 1.3 for m in (1, 2.0, 3.01, 4.2)) * np.minimum(1, tt / 0.002))
def rustle(dur=0.4):
    n = int(dur * SR); tt = np.arange(n) / SR; x = bp(rng.standard_normal(n), 1200, 7000) * (0.5 + 0.5 * np.abs(np.sin(2 * np.pi * 9 * tt + rng.random())))
    return norm(x * np.sin(np.pi * tt / dur) ** 1.2)
def flop():
    return norm(thud(95, 0.18) + 0.4 * rustle(0.18))
def swing_creak(dur=0.6): return norm(lp(rustle(dur), 2500))
def kickball():
    n = int(0.12 * SR); tt = np.arange(n) / SR; return norm(thud(140, 0.12) + 0.8 * bp(rng.standard_normal(n), 800, 4000) * np.exp(-tt * 60))
def netswish(dur=0.5):
    n = int(dur * SR); tt = np.arange(n) / SR; return norm(bp(rng.standard_normal(n), 2000, 8000) * np.exp(-tt * 6) * np.minimum(1, tt / 0.01))
def drawer(dur=0.35, opening=True):
    n = int(dur * SR); tt = np.arange(n) / SR; roll = bp(rng.standard_normal(n), 150, 1200) * (0.6 + 0.4 * np.sin(2 * np.pi * 40 * tt)); x = roll * np.sin(np.pi * tt / dur)
    if not opening: x = x * 0.5; x[-int(0.12 * SR):] += (thud(110, 0.12) + 0.6 * glass(1400)[:int(0.12 * SR)])
    return norm(x)
def roar(dur=1.1):
    n = int(dur * SR); tt = np.arange(n) / SR; f = 85 + 30 * np.sin(np.pi * tt / dur) + 6 * np.sin(2 * np.pi * 7 * tt); ph = 2 * np.pi * np.cumsum(f) / SR
    saw = 2 * ((ph / (2 * np.pi)) % 1) - 1; v = bp(saw, 200, 900) * 1.0 + bp(saw, 900, 2200) * 0.5
    grit = bp(rng.standard_normal(n), 300, 3000) * (0.5 + 0.5 * np.sin(2 * np.pi * 31 * tt))
    return norm((v * (1 + 0.5 * np.sin(2 * np.pi * 23 * tt)) + grit * 0.6) * np.minimum(1, tt / 0.06) * np.minimum(1, (dur - tt) / 0.35))
def heavy(f=48): return norm(thud(f, 0.35) + 0.5 * lp(rng.standard_normal(int(0.35 * SR)), 300) * np.exp(-np.arange(int(0.35 * SR)) / SR * 14))
def snore(dur=0.9):
    n = int(dur * SR); tt = np.arange(n) / SR; f = 42 + 6 * np.sin(np.pi * tt / dur); ph = 2 * np.pi * np.cumsum(f) / SR; saw = 2 * ((ph / (2 * np.pi)) % 1) - 1
    v = bp(saw, 120, 700) * (1 + 0.8 * np.sin(2 * np.pi * 38 * tt)) + 0.4 * bp(rng.standard_normal(n), 300, 2000)
    return norm(v * np.sin(np.pi * tt / dur) ** 1.5)
def swish(dur=0.16): return whoosh(dur, 600, 3500)
def oof(): return vowel(0.22, 230, 170, ((500, 800), (1100, 1400)), 0.4)
def sparkle(dur=0.6):
    n = int(dur * SR); out = np.zeros(n)
    for k in range(9):
        f = 2400 + rng.random() * 2600; i = int(rng.random() * (n - int(0.2 * SR))); c = musicbox(f, 0.2) * 0.5; out[i:i + len(c)] += c[:n - i]
    return norm(out)
def alarm(dur=0.55):
    n = int(dur * SR); tt = np.arange(n) / SR; on = ((tt * 8) % 1 < 0.5).astype(float); return norm(np.sin(2 * np.pi * 2050 * tt) * on * np.minimum(1, (dur - tt) / 0.02))
def roomtone(dur):
    n = int(dur * SR); return norm(lp(rng.standard_normal(n), 350) * 0.6 + bp(rng.standard_normal(n), 2000, 7000) * 0.05)


C = dict(slurp=0.28, fast=1.56, a=2.28, stabbing=2.38, pain=2.76, shoots=3.2, into=3.88, forehead=4.26, yousee=5.18, cold=5.84, vessels=7.32,
         clamp=8.82, then=9.84, flood=10.46, rush=11.82, that=13.8, swelling=14.08, nerve=15.4, covers=16.28, so=17.3, blames=18.12, the=19.88,
         fix=20.46, pressing=21.16, tongue=21.74, warm2=23.76, up=24.34, andd=24.72, wolfed=26.78, got=28.14, twice=29.18, kids2=30.44, because=31.74)
fx = np.zeros((2, N))
def slurp(dur, intensity=1.0):
    n = int(dur * SR); tt = np.arange(n) / SR
    base = bp(rng.standard_normal(n), 900, 5000) * (0.5 + 0.5 * np.abs(np.sin(2 * np.pi * 11 * tt + 3 * np.sin(2 * np.pi * 1.3 * tt))))
    bub = np.zeros(n)
    for k in range(int(dur * 26 * intensity)):
        i = int(rng.random() * (n - 2000)); f = 500 + rng.random() * 900; m = 1200; t2 = np.arange(m) / SR
        bub[i:i + m] += np.sin(2 * np.pi * (f + 2500 * t2) * t2) * np.exp(-t2 * 70)
    return norm((base * 0.7 + bub * 0.6) * np.minimum(1, tt / 0.04) * np.minimum(1, (dur - tt) / 0.06))
def icecrack():
    n = int(0.5 * SR); tt = np.arange(n) / SR; x = hp(rng.standard_normal(n), 2500) * np.exp(-tt * 18)
    cr = (rng.random(n) < 0.01) * rng.standard_normal(n) * np.exp(-tt * 8); cr = np.convolve(cr, np.exp(-np.arange(60) / 6), 'same')
    gl = np.pad(mixc(glass(3600), glass(2700) * 0.7), (0, n))[:n]
    return norm(x * 0.6 + hp(cr, 1500) * 1.2 + gl * 0.5 + thud(70, 0.5)[:n] * 0.5)
def frostcrackle(dur):
    n = int(dur * SR); x = (rng.random(n) < 0.004) * rng.standard_normal(n); x = np.convolve(x, np.exp(-np.arange(90) / 9), 'same'); tt = np.arange(n) / SR
    return norm(hp(x, 3000) * np.minimum(1, tt / 0.2) * np.minimum(1, (dur - tt) / 0.3))
def coldstinger():
    n = int(1.4 * SR); tt = np.arange(n) / SR
    x = sum(np.sin(2 * np.pi * f * tt + 0.3 * np.sin(2 * np.pi * 6 * tt)) for f in (1568, 1661, 2349, 3136)) * np.exp(-tt * 2.2) * 0.4
    return norm(x + hp(rng.standard_normal(n), 6000) * np.exp(-tt * 3) * 0.3)
def squeeze(dur=0.45):
    n = int(dur * SR); tt = np.arange(n) / SR; f = 700 * (0.4) ** (tt / dur); ph = 2 * np.pi * np.cumsum(f) / SR
    return norm((np.sin(ph) * 0.6 + np.sign(np.sin(ph * 0.5)) * 0.2) * (0.6 + 0.4 * np.sin(2 * np.pi * 30 * tt)) * np.sin(np.pi * tt / dur) + creak(dur, 300) * 0.5)
def liquidrush(dur):
    n = int(dur * SR); tt = np.arange(n) / SR; x = rng.standard_normal(n); out = np.zeros(n); low = band = 0.0
    for i in range(n):
        fc = 300 + 900 * (i / n) + 150 * np.sin(2 * np.pi * 3 * tt[i]); f = 2 * np.sin(np.pi * fc / SR); high = x[i] - low - 0.5 * band; band += f * high; low += f * band; out[i] = band
    return norm(out * np.minimum(1, tt / 0.15) * np.minimum(1, (dur - tt) / 0.4))
def heart(): return np.concatenate([thud(52, 0.16), np.zeros(int(0.07 * SR)), thud(46, 0.2) * 0.7])
def drip(f=1800): return plip(f, f * 0.4, 0.09)
def murmur(dur):
    n = int(dur * SR); tt = np.arange(n) / SR; out = np.zeros(n)
    for k in range(5):
        f0 = 140 + 60 * k; ph = 2 * np.pi * np.cumsum(f0 * (1 + 0.1 * np.sin(2 * np.pi * (2 + k) * tt))) / SR; saw = 2 * ((ph / (2 * np.pi)) % 1) - 1
        env = np.clip(np.sin(2 * np.pi * (1.1 + 0.37 * k) * tt + k), 0, 1) ** 2
        out += (bp(saw, 400, 900) + bp(saw, 1100, 1800) * 0.6) * env
    return norm(lp(out, 2500) * np.minimum(1, tt / 0.3) * np.minimum(1, (dur - tt) / 0.3))
def clink(f=2800): return norm(mixc(glass(f) * 0.8, tick(f * 1.3) * 0.4))
def chalk(dur):
    n = int(dur * SR); tt = np.arange(n) / SR; sq = bp(rng.standard_normal(n), 2500, 7000) * (0.4 + 0.6 * (np.sin(2 * np.pi * 7 * tt + rng.random()) > 0.2))
    return norm(sq * np.minimum(1, tt / 0.03) * np.minimum(1, (dur - tt) / 0.05))
def ow(f0=330): return vowel(0.3, f0, f0 * 0.8, ((700, 1100), (1100, 1600)), 0.3)
def waves(dur):
    n = int(dur * SR); tt = np.arange(n) / SR; sw = 0.55 + 0.45 * np.sin(2 * np.pi * tt / 3.7) ** 2
    return norm(lp(rng.standard_normal(n), 900) * sw + bp(rng.standard_normal(n), 2000, 6000) * sw ** 3 * 0.25)
def gull(): return norm(mixc(glide(0.35, 1500, 2300) * 0.6, glide(0.3, 2200, 1400)) * 1.0)
def exhale(dur=0.6):
    n = int(dur * SR); tt = np.arange(n) / SR; return norm(bp(rng.standard_normal(n), 400, 3000) * np.sin(np.pi * tt / dur) ** 1.5 * np.exp(-tt * 1.5))

# ambience: waves on the boardwalk, a quiet room inside the head, a cafeteria murmur
for a, b in ((0, C['yousee']), (C['so'], C['andd']), (C['because'], DUR)):
    place(fx, waves(b - a + 0.2), a, -27)
place(fx, gull(), 0.55, -24, 0.6); place(fx, gull(), 18.6, -28, -0.4); place(fx, gull(), 32.0, -26, 0.6)
place(fx, murmur(C['because'] - C['andd']), C['andd'], -30)
# slurping (also starts again at the very end so the loop is seamless)
place(fx, slurp(C['stabbing'] + 0.02, 1.0), 0.0, -14, 0.05); place(fx, slurp(DUR - 32.05, 1.0), 32.05, -14, 0.05)
# the stab
place(fx, icecrack(), C['stabbing'], -9); place(fx, coldstinger(), C['stabbing'] + 0.02, -15); place(fx, ow(240), C['stabbing'] + 0.12, -16)
for i in range(6): place(fx, glass(3000 + 400 * i) * 0.6, C['stabbing'] + 0.05 + i * 0.03, -24, (i - 2.5) * 0.3)
place(fx, frostcrackle(1.9), C['shoots'], -19); place(fx, icecrack() * 0.6, C['into'], -17)
# inside the head
place(fx, whoosh(0.32, 300, 4500), C['yousee'] - 0.18, -10)
place(fx, wind(2.0) * 0.7, C['yousee'] + 0.1, -25); place(fx, frostcrackle(1.6), C['cold'], -22)
place(fx, frostcrackle(1.3), C['vessels'] + 0.2, -21)
place(fx, squeeze(0.45), C['clamp'] - 0.1, -14)
place(fx, liquidrush(1.6), C['then'] + 0.02, -13); place(fx, whoosh(0.4, 200, 1800), C['flood'] - 0.05, -16)
for k in range(9): place(fx, heart(), C['then'] + 0.15 + k / 1.4, -16 + (2 if k < 3 else 0))
place(fx, liquidrush(1.8) * 0.8, C['rush'], -16)
for k in range(5): place(fx, zap(0.22, 500 + 120 * k, 1800 + 200 * k) * 0.7, C['swelling'] + 0.15 + k * 0.38, -20, -0.4 + 0.2 * k)
place(fx, heavy(55), C['covers'] + 0.04, -10); place(fx, icecrack() * 0.5, C['covers'] + 0.06, -17); place(fx, coldstinger() * 0.5, C['covers'] + 0.05, -22)
# back outside in x-ray
place(fx, whoosh(0.3, 3000, 300), C['so'] - 0.12, -9); place(fx, buzz(1.6) * 0.4, C['so'] + 0.2, -27)
for k in range(4): place(fx, thud(60, 0.18), C['so'] + 0.3 + k * 0.6, -21)
place(fx, ding(2400), C['fix'] - 0.02, -16)
# the fix, the melt, the relief
place(fx, lp(rustle(0.3), 1500), C['pressing'] + 0.1, -20); place(fx, glide(1.6, 200, 330) * 0.6, C['tongue'], -22)
for k in range(7): place(fx, drip(1500 + 180 * (k % 3)), C['tongue'] + 0.45 + k * 0.28, -22, (k % 2) - 0.5)
place(fx, exhale(0.7), C['warm2'] + 0.12, -15); place(fx, chime(1568, 1.0), C['warm2'] + 0.08, -20)
# the cafeteria study
place(fx, whoosh(0.32, 400, 3000), C['andd'] - 0.12, -11)
for k in range(int((C['got'] + 0.4 - 24.9) / 0.27)): place(fx, clink(2600 + 200 * (k % 4)), 24.9 + k * 0.27 + 0.03 * np.sin(k), -22, -0.4)
for k in range(4): place(fx, clink(3100), 25.3 + k * 1.5, -24, 0.4)
for i, (tf, f0) in enumerate(((28.3, 300), (28.55, 360), (28.8, 260))): place(fx, icecrack() * 0.5, tf, -16, -0.3); place(fx, ow(f0), tf + 0.08, -15, -0.3)
for k in range(5): place(fx, chalk(0.16 + 0.05 * (k % 2)), C['twice'] + 0.05 + k * 0.22, -19, 0.1)
place(fx, ding(2000) * 0.8, C['kids2'] + 0.1, -19)
place(fx, whoosh(0.28, 2400, 400), C['because'] - 0.1, -14)

# ---------------- music: 16 bars across the whole video so the loop lands on the downbeat ----------------
BAR = DUR / 16; BEAT = BAR / 4
def note(m): return 440 * 2 ** ((m - 69) / 12)
prog = [[60, 64, 67], [57, 60, 64], [53, 57, 60], [55, 59, 62]]   # C Am F G
music = np.zeros((2, N))
def pluck(f, dur=0.5, bright=1.0):
    n = int(dur * SR); tt = np.arange(n) / SR
    return (np.sin(2 * np.pi * f * tt) + 0.5 * bright * np.sin(4 * np.pi * f * tt) * np.exp(-tt * 9) + 0.25 * np.sin(6 * np.pi * f * tt) * np.exp(-tt * 14)) * np.exp(-tt * 6)
def shaker():
    n = int(0.06 * SR); tt = np.arange(n) / SR; return hp(rng.standard_normal(n), 6000) * np.exp(-tt * 70)
def gate(t):
    """which texture plays at time t"""
    if t < C['stabbing']: return 'groove'
    if t < C['yousee']: return 'stop'
    if t < C['then']: return 'pizz'
    if t < C['that']: return 'swell'
    if t < C['so']: return 'tense'
    if t < C['andd']: return 'light'
    return 'groove'
for b in range(16):
    t0 = b * BAR; ch = prog[b % 4]
    for k in range(8):
        ts = t0 + k * BAR / 8; g = gate(ts)
        if g == 'stop': continue
        m = ch[[0, 1, 2, 1, 0, 2, 1, 2][k]] + (12 if g in ('groove', 'light') else 24)
        if g in ('groove', 'light'):
            place(music, pluck(note(m), 0.45) * (0.22 if g == 'groove' else 0.14), ts, 0, -0.3 if k % 2 else 0.3)
            if k % 2 == 1 and g == 'groove': place(music, shaker() * 0.25, ts, 0, 0.5)
            if k in (0, 4): place(music, np.sin(2 * np.pi * note(ch[0] - 24) * np.arange(int(0.45 * SR)) / SR) * np.exp(-np.arange(int(0.45 * SR)) / SR * 5) * 0.4, ts, 0)
        elif g == 'pizz' and k % 2 == 0:
            place(music, pluck(note(m), 0.25, 0.4) * np.exp(-np.arange(int(0.25 * SR)) / SR * 10) * 0.2, ts, 0, -0.4 if k % 4 else 0.4)
        elif g == 'tense':
            place(music, pluck(note(ch[k % 3] + 12 + (k // 3)), 0.2, 0.6) * 0.16, ts, 0, 0.3 * ((k % 2) * 2 - 1))
    # pads under the inside-the-head part
    if C['yousee'] - BAR < t0 < C['so']:
        n = int(BAR * SR); tt = np.arange(n) / SR; pd = np.zeros(n)
        for m in ch: pd += sum(np.sin(2 * np.pi * note(m + 12) * h * tt + rng.random() * 6) / h ** 1.6 for h in range(1, 5))
        sw = 1.0 + (1.2 if C['then'] <= t0 + BAR / 2 < C['that'] else 0)
        place(music, lp(pd, 1600) * env_adsr(n, 0.3, 0.2, 0.9, 0.3) * 0.05 * sw, t0, 0)
# keep the stab silent in the music, with a short fade so it reads as a stop, not a glitch
mute = np.ones(N); a, b2 = int(C['stabbing'] * SR), int(C['yousee'] * SR); mute[a:b2] = 0; mute[a - int(0.02 * SR):a] *= np.linspace(1, 0, int(0.02 * SR))
music *= mute
music = music / np.max(np.abs(music))

# ---------------- voice ----------------
vo, vsr = sf.read(vo_path, dtype='float32')
if vo.ndim > 1: vo = vo.mean(1)
vo = signal.resample_poly(vo, SR, vsr); vo = vo[:N]; vo = np.pad(vo, (0, N - len(vo)))
vo = hp(vo, 80); vo = vo / np.max(np.abs(vo))
env = np.sqrt(np.maximum(lp(vo ** 2, 15), 0)); env = np.maximum(env, 1e-4); gain = np.minimum(1, (0.25 / env) ** 0.4); vo = vo * gain; vo /= np.max(np.abs(vo))
voice = np.stack([vo, vo])
def rms_db(x): return 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-9)
speech = np.abs(vo) > 0.02
v_rms = rms_db(vo[speech]); m_rms = rms_db(music[0][np.abs(music[0]) > 1e-5])
music *= db(v_rms - m_rms - 15)
duck = lp(np.convolve(speech.astype(float), np.ones(int(0.15 * SR)) / int(0.15 * SR), 'same'), 4)
music *= db(-3 * np.clip(duck, 0, 1))
fx *= db(v_rms - rms_db(fx[0][np.abs(fx[0]) > 1e-4]) - 8.5)
mix = voice + music + fx
# no fade at the end: the last sample flows straight into the first one on loop
mix /= np.max(np.abs(mix)) * 1.05
sf.write(out_path, mix.T, SR, subtype='PCM_24')
for name, x in (('voice', voice), ('music', music), ('fx', fx)): sf.write(f"{stems_dir}/{name}.wav", (x / (np.max(np.abs(x)) + 1e-9) * 0.9).T, SR, subtype='PCM_24')
print('mix written', mix.shape, 'voice rms', round(v_rms, 1), 'bar', round(BAR, 3))
