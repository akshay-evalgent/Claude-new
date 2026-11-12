"""Music + sound effects + voiceover for the dream short.
Everything is synthesized here so the track is original and royalty-free."""
import sys, numpy as np, soundfile as sf
from scipy import signal

SR = 48000
DUR = 33.75
vo_path, out_path, stems_dir = sys.argv[1], sys.argv[2], sys.argv[3]
N = int(DUR * SR)
rng = np.random.default_rng(21)
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

C = dict(your=0.72, darting=1.66, brain=3.26, body=5.8, goes=6.42, limp=7.2, yousee=8.18, brainstem=9.78, signals=11.18, so=12.28, act=12.98,
         scientists=14.76, sort=16.44, and1=17.2, which=19.06, chased=19.98, common=21.28, but=22.74, people=24.14, punch=24.64, kick=25.2,
         asleep=26.1, and2=26.5, six=28.58, then=30.3, forget=30.46, minutes=31.82, end=33.75)
fx = np.zeros((2, N))
# night ambience in the bedroom scenes
for a, b in ((0, C['yousee']), (C['so'], C['scientists']), (C['but'], C['and2']), (C['and2'], C['then'])):
    d = b - a; place(fx, crickets(d) * 0.5, a, -31, 0.5); place(fx, roomtone(d), a, -34)
# clock ticks
for k in range(0, 9): place(fx, tick(3000), 0.2 + k, -30, -0.6)
# REM: a tiny flick on each eye saccade
for k in range(0, 40):
    tk = (k - 3 * 0.37) / 3.6
    if C['your'] + 0.05 < tk < C['brain'] - 0.05: place(fx, tick(5200), tk, -27, 0.1 * ((k % 2) * 2 - 1))
# the brain lights up
place(fx, glide(1.2, 300, 1400) * 0.7, C['brain'] - 0.05, -17); place(fx, sparkle(1.6), C['brain'] + 0.2, -19)
for k_, f_ in enumerate((880, 1109, 1319, 1760)): place(fx, musicbox(f_, 1.2), C['brain'] + 0.12 + k_ * 0.07, -21)
# limp: arm slides, drops, swings; the cat leaps and lands; purr
place(fx, rustle(0.3), C['goes'], -18, 0.4); place(fx, swing_creak(0.3) * 0.5, C['goes'] + 0.25, -24, 0.5); place(fx, flop(), C['goes'] + 0.5, -15, 0.5)
place(fx, whoosh(0.32, 400, 2200), 6.98, -18, 0.6); place(fx, mixc(thud(110, 0.15) * 0.7, rustle(0.2) * 0.4), 7.38, -14, 0.2)
place(fx, mew(820, 0.28), 7.62, -18, 0.2); place(fx, purr(0.75) * 0.8, 7.75, -18, 0.2)
# push into the x-ray
place(fx, whoosh(0.32, 300, 4500), C['yousee'] - 0.18, -10)
# signals flowing, the gate slams shut, pulses spark against it
for k in range(5): place(fx, zap(0.18, 500 + 60 * k, 1500) * 0.6, 8.35 + k * 0.28, -22, 0.2 * ((k % 2) * 2 - 1))
place(fx, heavy(70) * 0.8, C['brainstem'] - 0.05, -12); place(fx, glass(1700) * 0.5, C['brainstem'] - 0.03, -16)
place(fx, buzz(0.35), C['brainstem'] + 0.05, -20)
for tk in (10.48, 11.28, 12.08): place(fx, zap(0.15, 900, 2400) * 0.7, tk, -17); place(fx, tick(2600), tk, -22)
# the thought bubble and the dream kick
for i in range(3): place(fx, pop(700 + 150 * i), C['so'] + i * 0.07, -18)
place(fx, pop(500), C['so'] + 0.14, -15); place(fx, sparkle(0.9), C['so'] + 0.15, -22)
for i in range(3): place(fx, lp(step(), 1500) * 0.8, 12.55 + i * 0.2, -25)
place(fx, lp(kickball(), 2500), 13.24, -14); place(fx, lp(netswish(), 4000), 13.72, -18); place(fx, lp(chime(1568, 0.8), 3000), 13.9, -22)
# memory filing
place(fx, whoosh(0.32, 400, 3000), C['scientists'] - 0.16, -11)
place(fx, drawer(0.35, True), 14.86, -17, -0.3)
for i in range(8): place(fx, flip() * 0.8, 14.88 + i * 0.2 + 0.1, -22, 0.3); place(fx, flip(), 14.88 + i * 0.2 + 0.6, -19, -0.2)
place(fx, drawer(0.4, False), 16.05, -14, -0.3); place(fx, drawer(0.35, True), 15.6, -18, -0.3); place(fx, drawer(0.4, False), 16.85, -15, -0.3)
place(fx, sparkle(1.2), 15.2, -24)
# the chase
place(fx, wind(5.5) * 0.6, C['and1'], -26)
for i in range(3): place(fx, step() * 0.8, 17.3 + i * 0.26, -22)
place(fx, stinger(), 17.92, -12); place(fx, roar(1.15), 18.12, -10); place(fx, gasp(), 18.25, -14)
for k in range(12):
    tk = C['which'] + (k + 0.5) * np.pi / 9.6
    if tk < C['but']: place(fx, step(), tk, -15, 0.25 * ((k % 2) * 2 - 1))
for k in range(1, 7):
    tk = C['which'] + k * np.pi / 5.2
    if tk < C['but']: place(fx, heavy(46) * 0.9, tk, -15)
place(fx, growl(0.9), 20.3, -15); place(fx, gasp(), 21.68, -14); place(fx, roar(0.8), 22.15, -12)
# whip into the bedroom; snoring; the strikes; the fall
place(fx, whoosh(0.3, 3000, 300), C['but'] - 0.12, -9)
place(fx, snore(0.9), 22.95, -20, -0.3); place(fx, snore(0.9), 23.95, -21, -0.3)
place(fx, rustle(0.5), 24.14, -19, -0.3)
for tp in (24.64, 24.97): place(fx, swish(0.16), tp - 0.06, -12, -0.2)
place(fx, swish(0.18), 25.12, -12, 0.0); place(fx, thud(120, 0.15), 25.24, -14, 0.3); place(fx, oof(), 25.27, -15, 0.3)
place(fx, rustle(0.45), 25.3, -15, 0.4); place(fx, whoosh(0.28, 1200, 300), 25.56, -17, 0.5)
place(fx, heavy(60), 25.82, -8, 0.5); place(fx, thud(140, 0.1) * 0.6, 25.84, -14, 0.5); place(fx, gasp(), 25.98, -12, 0.5)
# six years: time-lapse
place(fx, whoosh(0.32, 400, 3000), C['and2'] - 0.12, -11)
for i in range(3, 14): place(fx, pop(500 + 60 * (i % 6)), 26.0 + i * 0.24, -22, 0.4 * np.sin(i))
for k in range(16): place(fx, tick(2800 + 40 * k), 26.6 + k * 0.22 * (1 - k * 0.025), -27, -0.5)
place(fx, chime(1046, 1.4), C['six'] + 0.02, -15); place(fx, thud(55, 0.4), C['six'], -17); place(fx, sparkle(1.0), C['six'] + 0.05, -20)
# morning
place(fx, alarm(0.5), C['then'] + 0.02, -21, -0.6)
for k in range(7): place(fx, bird(), 30.6 + k * 0.42 + 0.1 * np.sin(k), -24, 0.7)
place(fx, rustle(0.6), C['then'] + 0.1, -17); place(fx, yawn_snd(0.95, 200, 135, 0.3), 31.0, -17)
for i, tp in enumerate((31.05, 31.3, 31.55, 31.8, 32.05, 32.3, 32.78)): place(fx, pop(650 + 90 * i), tp, -16 if i < 6 else -12, (i - 3) * 0.2)
place(fx, sparkle(0.4) * 0.6, 32.8, -22)
for k in range(5): place(fx, scratch(0.08), 33.1 + k * 0.11, -21, 0.3)

# ---------------- music: dreamy -> tense chase -> comic -> wonder -> bright morning ----------------
def note(m): return 440 * 2 ** ((m - 69) / 12)
def pad(n, chord, cut=1400, amp=0.1, oct=12):
    tt = np.arange(n) / SR; out = np.zeros((2, n))
    for ci, side in ((0, -1), (1, 1)):
        x = np.zeros(n)
        for m in chord: f = note(m + oct) * (1 + side * 0.003); x += sum(np.sin(2 * np.pi * f * h * tt + rng.random() * 6.28) / h ** 1.7 for h in range(1, 6))
        out[ci] = lp(x, cut) * env_adsr(n, 0.6, 0.3, 0.85, 0.6) * amp
    return out
music = np.zeros((2, N))
def section(t0, t1, chords, bar, style):
    seg_ = np.zeros((2, N))
    for ci, st in enumerate(np.arange(t0, t1, bar)):
        ch = chords[ci % len(chords)]; n = int(min(bar + 0.7, t1 + 0.3 - st) * SR); i = int(st * SR)
        if n <= 0 or i >= N: continue
        p = pad(n, ch, 1300 if style != 'tense' else 900, 0.09 if style != 'comic' else 0.05); nn = min(n, N - i); seg_[:, i:i + nn] += p[:, :nn]
        if style in ('dream', 'wonder', 'morning'):
            for k in range(8):
                ts = st + k * bar / 8
                if ts >= t1: break
                m = ch[[0, 2, 1, 3, 2, 1, 3, 2][k] % len(ch)] + (24 if style != 'morning' else 12)
                place(seg_, musicbox(note(m), 0.9) * (0.16 if style != 'morning' else 0.12), ts, 0, -0.35 if k % 2 else 0.35)
            bass = np.sin(2 * np.pi * note(ch[0] - 12) * np.arange(nn) / SR) * env_adsr(nn, 0.1, 0.2, 0.6, 0.5) * 0.28; seg_[:, i:i + nn] += bass
        if style == 'tense':
            for k in range(16):
                ts = st + k * bar / 16
                if ts >= t1: break
                m2 = int(0.12 * SR); t2 = np.arange(m2) / SR; b_ = np.sign(np.sin(2 * np.pi * note(ch[0] - 12) * t2)) * np.exp(-t2 * 18)
                place(seg_, lp(b_, 700) * 0.32, ts, 0)
            place(seg_, lp(np.sin(2 * np.pi * note(ch[0] - 24) * np.arange(int(bar * SR)) / SR), 200) * 0.2, st, 0)
        if style == 'comic':
            for k in range(4):
                ts = st + k * bar / 4; m2 = int(0.25 * SR); t2 = np.arange(m2) / SR
                pl = (np.sin(2 * np.pi * note(ch[k % len(ch)]) * t2) + 0.4 * np.sin(4 * np.pi * note(ch[k % len(ch)]) * t2)) * np.exp(-t2 * 14)
                place(seg_, pl * 0.22, ts, 0, 0.3 * (k % 2 * 2 - 1))
    fade = np.ones(N); a, b = int(t0 * SR), int(min(t1, DUR) * SR); fade[:a] = 0; fade[b:] = 0
    r = int(0.12 * SR); fade[a:a + r] *= np.linspace(0, 1, min(r, N - a)); fade[max(b - r, 0):b] *= np.linspace(1, 0, b - max(b - r, 0))
    return seg_ * fade
music += section(0, C['and1'], [[53, 57, 60, 64], [52, 55, 59, 62], [50, 53, 57, 60], [48, 52, 55, 59]], 60 / 78 * 4, 'dream')
music += section(C['and1'], C['but'], [[57, 60, 64], [53, 57, 60], [50, 53, 57], [52, 56, 59]], 60 / 132 * 4, 'tense') * 1.15
music += section(C['but'], C['and2'], [[48, 52, 55], [53, 57, 60], [55, 59, 62], [48, 52, 55]], 60 / 120 * 4, 'comic')
music += section(C['and2'], C['then'], [[53, 57, 60, 64], [55, 59, 62, 66], [52, 55, 59, 62], [57, 60, 64, 67]], 60 / 84 * 4, 'wonder')
music += section(C['then'], DUR, [[60, 64, 67], [55, 59, 62], [57, 60, 64], [53, 57, 60]], 60 / 100 * 4, 'morning')
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
v_rms = rms_db(vo[speech]); m_rms = rms_db(music[0])
music *= db(v_rms - m_rms - 16)
duck = lp(np.convolve(speech.astype(float), np.ones(int(0.15 * SR)) / int(0.15 * SR), 'same'), 4)
music *= db(-3 * np.clip(duck, 0, 1))
fx *= db(v_rms - rms_db(fx[0][np.abs(fx[0]) > 1e-4]) - 8.5)
mix = voice + music + fx
mix *= np.minimum(1, (N - np.arange(N)) / (0.012 * SR))
mix /= np.max(np.abs(mix)) * 1.05
sf.write(out_path, mix.T, SR, subtype='PCM_24')
for name, x in (('voice', voice), ('music', music), ('fx', fx)): sf.write(f"{stems_dir}/{name}.wav", (x / (np.max(np.abs(x)) + 1e-9) * 0.9).T, SR, subtype='PCM_24')
print('mix written', mix.shape, 'voice rms', round(v_rms, 1))
