"""Music + sound effects + voiceover for the "Why Cats Knock Things Off Tables" short.
Everything is synthesized here so the track is original and royalty-free."""
import sys, numpy as np, soundfile as sf
from scipy import signal

SR = 48000
DUR = 948 / 30
vo_path, out_path, stems_dir = sys.argv[1], sys.argv[2], sys.argv[3]
N = int(DUR * SR)
rng = np.random.default_rng(44)
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


C = dict(slowly=2.08, off=3.56, table=4.0, yousee=4.76, hunters=5.84, test=6.76, paws=7.86, tapping=8.48, run=9.74, so=10.58, that=12.0, sudden=12.12,
         instinct=13.96, chasing=14.82, but=16.1, the=17.76, crashed=18.54, gasped=19.3, came=19.96, and2=20.54, learned=21.34, fastest=22.02,
         attention=23.32, in1=24.32, half=25.32, human=27.1, food=27.68, toys=28.3, so2=29.04, more=29.52, react=29.88, the2=30.66)
IMPACT = C['off'] + 0.644; HIT2 = C['crashed'] + 0.06
fx = np.zeros((2, N))
def shatter():
    n = int(1.3 * SR); tt = np.arange(n) / SR
    x = hp(rng.standard_normal(n), 2200) * np.exp(-tt * 16) * 1.4 + lp(rng.standard_normal(n), 400) * np.exp(-tt * 20) * 0.9
    for k in range(22):
        i = int((0.01 + rng.random() ** 2 * 0.75) * SR); g = glass(1800 + rng.random() * 4200) * (0.3 + 0.7 * rng.random()); m = min(len(g), n - i); x[i:i + m] += g[:m] * 0.5
    sk = (rng.random(n) < 0.004) * rng.standard_normal(n); sk = np.convolve(sk, np.exp(-np.arange(70) / 7), 'same'); x += hp(sk, 3000) * np.clip((tt - 0.15) * 4, 0, 1) * np.exp(-tt * 2.5) * 0.8
    return norm(x)
def scrape(dur):
    n = int(dur * SR); tt = np.arange(n) / SR; st = 0.5 + 0.5 * np.sign(np.sin(2 * np.pi * (34 + 10 * np.sin(2 * np.pi * 2 * tt)) * tt))
    x = bp(rng.standard_normal(n), 700, 3200) * st + 0.35 * np.sin(2 * np.pi * 1450 * tt) * st
    return norm(x * np.sin(np.pi * tt / dur) ** 0.6)
def iceclink(): return norm(mixc(glass(3900) * 0.7, np.pad(glass(4700), (int(0.04 * SR), 0)) * 0.5))
def slosh(dur=0.5):
    n = int(dur * SR); tt = np.arange(n) / SR; x = lp(rng.standard_normal(n), 900) * (0.5 + 0.5 * np.sin(2 * np.pi * 5 * tt))
    for k in range(6): i = int(rng.random() * (n - 1500)); f = 500 + rng.random() * 700; t2 = np.arange(1200) / SR; x[i:i + 1200] += np.sin(2 * np.pi * (f + 2200 * t2) * t2) * np.exp(-t2 * 70) * 1.5
    return norm(x * np.sin(np.pi * tt / dur))
def splashbig():
    n = int(0.7 * SR); tt = np.arange(n) / SR; return norm(bp(rng.standard_normal(n), 500, 6000) * np.exp(-tt * 7) * (1 - np.exp(-tt * 200)))
def squeak(f0=3400, dur=0.11):
    n = int(dur * SR); tt = np.arange(n) / SR; f = f0 * (1 + 0.35 * np.sin(np.pi * tt / dur)); return norm(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * tt / dur) ** 0.7)
def scurry(dur):
    n = int(dur * SR); out = np.zeros(n)
    for k in range(int(dur * 24)): i = int(k / 24 * SR + rng.random() * 300); c = tick(2600 + rng.random() * 900) * 0.7; m = min(len(c), n - i); out[i:i + m] += c[:m]
    return norm(out * np.linspace(1, 0.35, n))
def pat(): return norm(mixc(thud(170, 0.09), rustle(0.09) * 0.35))
def typing(dur):
    n = int(dur * SR); out = np.zeros(n); t0 = 0.0
    while t0 < dur - 0.05: i = int(t0 * SR); c = click() * (0.5 + 0.5 * rng.random()); m = min(len(c), n - i); out[i:i + m] += c[:m]; t0 += 0.07 + rng.random() * 0.13
    return norm(out)
def bloop(f=520): n = int(0.16 * SR); tt = np.arange(n) / SR; return norm(np.sin(2 * np.pi * np.cumsum(f * (1 + 1.2 * tt / 0.16)) / SR) * np.sin(np.pi * tt / 0.16))
def mrrp(): n = int(0.28 * SR); tt = np.arange(n) / SR; f = 420 * (1 + 0.7 * tt / 0.28) * (1 + 0.06 * np.sin(2 * np.pi * 28 * tt)); ph = 2 * np.pi * np.cumsum(f) / SR; x = sum(np.sin(ph * h) / h ** 1.3 for h in range(1, 6)); return norm(bp(x, 400, 3500) * np.sin(np.pi * tt / 0.28) ** 0.7)
def riser(dur, f0=180, f1=720): n = int(dur * SR); tt = np.arange(n) / SR; f = f0 * (f1 / f0) ** (tt / dur); return norm((np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.4 * np.sin(2 * np.pi * np.cumsum(f * 1.5) / SR)) * (tt / dur) ** 1.5)
def ugh(): return vowel(0.4, 210, 150, ((600, 900), (1000, 1300)), 0.35)
def aww(): return vowel(0.5, 330, 290, ((700, 1000), (1100, 1500)), 0.25)

# ambience: living room tone, garden crickets, bright lab
for a, b in ((0, C['yousee']), (C['so'], C['instinct']), (C['but'], C['in1']), (C['so2'], DUR)): place(fx, roomtone(b - a + 0.1), a, -33)
place(fx, crickets(C['so'] - C['yousee']), C['yousee'], -25, 0.3); place(fx, wind(C['so'] - C['yousee']) * 0.6, C['yousee'], -27)
place(fx, roomtone(C['so2'] - C['in1']) * 0.8, C['in1'], -30)
# the stare: a purr that also closes the video, so the loop is seamless
place(fx, purr(C['slowly'] + 0.1) * 0.8, 0.0, -21, -0.1); place(fx, purr(DUR - 30.95) * 0.8, 30.95, -21, -0.1)
place(fx, tick(5200), 0.02, -24)
# three little shoves, the tip, the fall, the smash
for a, b in ((2.1, 2.5), (2.74, 3.14), (3.28, 3.58)): place(fx, scrape(b - a), a, -14, 0.1); place(fx, slosh(b - a + 0.15) * 0.7, a + 0.05, -20); place(fx, iceclink() * 0.6, b - 0.05, -21)
clink = norm(mixc(glass(2600), tick(3200) * 0.5)); place(fx, clink, C['off'] + 0.02, -15); place(fx, whoosh(0.4, 900, 250), C['off'] + 0.22, -15)
place(fx, shatter(), IMPACT, -6); place(fx, splashbig(), IMPACT + 0.01, -12); place(fx, thud(60, 0.3), IMPACT, -11)
# into the garden
place(fx, whoosh(0.32, 300, 4500), C['yousee'] - 0.18, -10)
place(fx, rustle(1.2) * 0.7, C['yousee'] + 0.1, -22, -0.2)
for i, tp in enumerate((C['test'] + 0.07, C['paws'] + 0.07, C['tapping'] + 0.14)): place(fx, pat(), tp, -13, 0.1); place(fx, squeak(3200 + 300 * i, 0.07) * 0.6, tp + 0.05, -21, 0.2)
place(fx, squeak(3800, 0.16), C['run'] - 0.05, -13, 0.2); place(fx, scurry(0.85), C['run'] - 0.02, -15, 0.3)
place(fx, whoosh(0.45, 300, 2600), C['run'] + 0.3, -9, -0.2); place(fx, rustle(0.4), C['run'] + 0.35, -15)
# slow motion, pupils, x-ray
place(fx, lp(whoosh(1.3, 500, 120), 900), C['so'] + 0.02, -13); place(fx, glide(1.4, 2400, 1700) * 0.5, C['so'] + 0.05, -24)
place(fx, riser(0.8, 160, 640), C['sudden'] - 0.05, -17); place(fx, thud(50, 0.5), C['sudden'] + 0.7, -13); place(fx, chime(1760, 0.9) * 0.6, C['sudden'] + 0.72, -22)
for k in range(3): place(fx, heartbeat(), C['sudden'] + 0.85 + k * 0.42, -17)
for k in range(5): place(fx, zap(0.2, 500 + 130 * k, 1700 + 200 * k) * 0.7, C['instinct'] + 0.1 + k * 0.36, -19, -0.4 + 0.2 * k)
place(fx, scurry(1.2) * 0.7, C['chasing'] - 0.2, -19, 0.0); place(fx, swish(0.18), C['chasing'] + 0.08, -14); place(fx, swish(0.18), C['chasing'] + 0.48, -14)
# another reason: typing, the first crash, the gasp, running
place(fx, whoosh(0.32, 400, 3000), C['but'] - 0.12, -11)
place(fx, typing(C['the'] - C['but'] - 0.1), C['but'] + 0.1, -22, 0.3)
place(fx, lp(whoosh(0.8, 700, 200), 1200), C['the'] + 0.05, -15)
place(fx, shatter(), HIT2, -7); place(fx, splashbig(), HIT2 + 0.01, -13); place(fx, thud(60, 0.3), HIT2, -12)
place(fx, gasp(), C['gasped'] - 0.03, -10, 0.2); place(fx, creak(0.3, 300) * 0.6, C['gasped'] + 0.45, -20)
for k in range(4): place(fx, step(), C['came'] + 0.05 + k * 0.15, -13, 0.2 - 0.1 * k)
for k, (f0, d) in enumerate(((300, 0.22), (350, 0.18), (280, 0.26))): place(fx, vowel(d, f0, f0 * 0.85, ((650, 1000), (1100, 1500)), 0.3), C['and2'] + 0.1 + k * 0.42, -19, -0.3)
place(fx, bloop(480), C['and2'] + 0.2, -15); place(fx, pop(900), C['and2'] + 0.42, -20); place(fx, pop(1100), C['learned'] - 0.1, -20); place(fx, ding(2200), C['learned'] + 0.25, -15)
place(fx, purr(C['in1'] - C['fastest'] - 0.05), C['fastest'] + 0.05, -15, 0.1); place(fx, aww(), C['fastest'] + 0.3, -21, -0.4); place(fx, chime(2093, 0.8), C['attention'] + 0.12, -17)
# the study
place(fx, whoosh(0.3, 3000, 300), C['in1'] - 0.12, -9); place(fx, beep(), C['in1'] + 0.12, -22)
place(fx, mrrp(), C['half'] - 0.3, -15)
for k in range(9): place(fx, pat() * 0.7, C['half'] - 0.2 + k * 0.2, -22, 0.1 * ((k % 2) * 2 - 1))
place(fx, purr(1.6) * 0.8, C['human'] - 0.1, -19)
place(fx, ding(1760), C['human'] + 0.02, -12); place(fx, thud(70, 0.3), C['human'], -17)
for tp, f in ((C['food'], 700), (C['toys'] - 0.1, 850), (C['toys'] + 0.15, 1000)): place(fx, pop(f), tp + 0.02, -15)
# back home: the reaction, a fresh glass, the paw
place(fx, whoosh(0.32, 400, 3000), C['so2'] - 0.12, -11)
place(fx, ugh(), C['more'] - 0.05, -13, 0.2); place(fx, rustle(0.4), C['more'], -20)
place(fx, clink, 30.33, -13); place(fx, slosh(0.4), 30.36, -19); place(fx, iceclink(), 30.45, -19)
place(fx, tick(5200), 31.22, -20)

# ---------------- music: 16 bars across the whole video so the loop lands on the downbeat ----------------
BAR = DUR / 16; BEAT = BAR / 4
def note(m): return 440 * 2 ** ((m - 69) / 12)
def pizz(f, dur=0.32, bright=1.0):
    n = int(dur * SR); tt = np.arange(n) / SR
    return (np.sin(2 * np.pi * f * tt) + 0.55 * bright * np.sin(4 * np.pi * f * tt) * np.exp(-tt * 14) + 0.3 * bright * np.sin(6 * np.pi * f * tt) * np.exp(-tt * 22)) * np.exp(-tt * 11) * np.minimum(1, tt / 0.003)
def marimba(f, dur=0.5):
    n = int(dur * SR); tt = np.arange(n) / SR; return (np.sin(2 * np.pi * f * tt) + 0.35 * np.sin(2 * np.pi * f * 4.0 * tt) * np.exp(-tt * 30)) * np.exp(-tt * 7) * np.minimum(1, tt / 0.002)
def shaker():
    n = int(0.05 * SR); tt = np.arange(n) / SR; return hp(rng.standard_normal(n), 6500) * np.exp(-tt * 80)
def fingersnap():
    n = int(0.06 * SR); tt = np.arange(n) / SR; return bp(rng.standard_normal(n), 1800, 4500) * np.exp(-tt * 70)
sneak = [[45, 48, 52], [50, 53, 57], [52, 56, 59], [45, 48, 52]]      # Am  Dm  E  Am
bright = [[48, 52, 55], [53, 57, 60], [55, 59, 62], [48, 52, 55]]     # C   F   G  C
def style(t):
    if t < IMPACT - 0.05: return 'sneak'
    if t < C['yousee']: return 'stop'
    if t < C['so']: return 'hunt'
    if t < C['but']: return 'hold'
    if t < HIT2 - 0.05: return 'sneak'
    if t < C['gasped'] + 0.6: return 'stop'
    if t < C['in1']: return 'sly'
    if t < C['so2']: return 'bright'
    return 'sneak'
music = np.zeros((2, N))
for b in range(16):
    t0 = b * BAR
    for k in range(8):
        ts = t0 + k * BAR / 8; st = style(ts); ch = (bright if st == 'bright' else sneak)[b % 4]
        if st == 'stop': continue
        if st in ('sneak', 'sly'):
            if k % 2 == 0: place(music, pizz(note(ch[[0, 2, 1, 2][k // 2]] - 12), 0.34, 0.8) * 0.5, ts, 0)                 # tiptoe bass
            else: place(music, (pizz(note(ch[1] + 12), 0.16) + pizz(note(ch[2] + 12), 0.16)) * 0.13, ts, 0, 0.3)            # offbeat stabs
            if k in (2, 6): place(music, fingersnap() * 0.35, ts, 0, -0.3)
            if st == 'sly' and k in (3, 7): place(music, marimba(note(ch[[2, 1][k // 4]] + 24), 0.3) * 0.12, ts, 0, -0.4)
        elif st == 'hunt':
            if k in (0, 3, 6): place(music, marimba(note(ch[0] - 12), 0.5) * 0.4, ts, 0)
            if k % 2 == 1: place(music, shaker() * 0.22, ts, 0, 0.5)
            if k in (2, 5): place(music, marimba(note(ch[[1, 2][k // 3 % 2]] + 12), 0.35) * 0.13, ts, 0, -0.4)
        elif st == 'bright':
            place(music, marimba(note(ch[[0, 1, 2, 1, 0, 2, 1, 2][k]] + 12), 0.4) * 0.2, ts, 0, -0.3 if k % 2 else 0.3)
            if k in (0, 4): place(music, pizz(note(ch[0] - 12), 0.4, 0.6) * 0.42, ts, 0)
            if k % 2 == 1: place(music, shaker() * 0.2, ts, 0, 0.5)
    # a held, slowly rising pad under the slow motion, the eyes and the x-ray
    if C['so'] - 0.3 < t0 + BAR / 2 < C['but']:
        n = int(BAR * SR); tt = np.arange(n) / SR; pd = np.zeros(n)
        for m in sneak[b % 4]: pd += sum(np.sin(2 * np.pi * note(m + 12) * h * tt + rng.random() * 6) / h ** 1.6 for h in range(1, 5))
        rise = 0.5 + 0.9 * (t0 - C['so']) / (C['but'] - C['so'])
        place(music, lp(pd, 1500) * env_adsr(n, 0.25, 0.2, 0.9, 0.25) * 0.05 * rise, t0, 0)
        for k in range(8): place(music, pizz(note(sneak[b % 4][0] - 12), 0.12, 0.4) * 0.2 * rise, t0 + k * BAR / 8, 0)
mute = np.ones(N)
for a, b2 in ((IMPACT - 0.05, C['yousee']), (HIT2 - 0.05, C['gasped'] + 0.6)): i0, i1 = int(a * SR), int(b2 * SR); mute[i0:i1] = 0; f = int(0.02 * SR); mute[i0 - f:i0] *= np.linspace(1, 0, f)
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
music *= db(v_rms - m_rms - 14.5)
duck = lp(np.convolve(speech.astype(float), np.ones(int(0.15 * SR)) / int(0.15 * SR), 'same'), 4)
music *= db(-3 * np.clip(duck, 0, 1))
fx *= db(v_rms - rms_db(fx[0][np.abs(fx[0]) > 1e-4]) - 8.5)
mix = voice + music + fx
mix /= np.max(np.abs(mix)) * 1.05     # no fade at the end: the last sample flows into the first on loop
sf.write(out_path, mix.T, SR, subtype='PCM_24')
for name, x in (('voice', voice), ('music', music), ('fx', fx)): sf.write(f"{stems_dir}/{name}.wav", (x / (np.max(np.abs(x)) + 1e-9) * 0.9).T, SR, subtype='PCM_24')
print('mix written', mix.shape, 'voice rms', round(v_rms, 1), 'bar', round(BAR, 3), 'bpm', round(240 / BAR, 1))
