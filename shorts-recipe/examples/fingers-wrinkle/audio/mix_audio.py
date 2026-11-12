"""Music bed + sound effects + voiceover for the fingers-wrinkle short.
Everything is synthesized here so the track is original and royalty-free."""
import sys, numpy as np, soundfile as sf
from scipy import signal

SR = 48000
DUR = 34.95
vo_path, out_path, stems_dir = sys.argv[1], sys.argv[2], sys.argv[3]
N = int(DUR * SR)
rng = np.random.default_rng(12)
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
# hook: drips and water
for t0 in (0.12, 0.75, 1.55, 2.3, 2.95, 3.5): place(fx, plip(1500 + rng.random() * 600), t0, -8, rng.uniform(-0.3, 0.3))
place(fx, lp(splash(1.2, 200, 2500), 1500), 0.0, -14)
for i, t0 in enumerate(np.cumsum(np.linspace(0.16, 0.05, 30)) + 1.5):
    if t0 < 3.3: place(fx, tick(4200 if i % 2 else 3600), t0, -16, 0.35)
# card swing / transitions
place(fx, whoosh(0.38, 400, 3000), 3.6, -9)
for i in range(11): place(fx, plip(1700 + rng.random() * 700, 500, 0.08), 3.93 + i * 0.22 + rng.random() * 0.08, -9, rng.uniform(-0.5, 0.5))
place(fx, whoosh(0.5, 200, 5000), 6.15, -7)
place(fx, zap(1.6), 7.25, -15)
for t0 in (9.1, 9.55, 10.0, 10.45): place(fx, thud(55, 0.3), t0, -9)
place(fx, shrink(0.55), 10.62, -10)
place(fx, whoosh(0.3, 600, 2000, rise=False), 10.88, -16)
for i in range(6): place(fx, pop(800 + i * 90), 11.28 + i * 0.07, -13, 0.4)
place(fx, thud(80, 0.2), 13.66, -12)
place(fx, buzz(0.65), 14.72, -15, 0.4)
place(fx, whoosh(0.35, 300, 4000), 17.55, -7)
place(fx, thud(60, 0.3), 17.95, -10)
place(fx, boing(0.5), 18.45, -15)
place(fx, whoosh(0.5, 2000, 400, rise=True), 20.85, -16)
# tyre on a wet road
n = int((C_end := 25.3 - 21.0) * SR); road = lp(rng.standard_normal(n), 400) * (0.8 + 0.2 * np.sin(2 * np.pi * 9 * np.arange(n) / SR))
road *= np.minimum(1, np.arange(n) / (0.6 * SR)) * np.minimum(1, (n - np.arange(n)) / (0.2 * SR)); place(fx, norm(road), 21.0, -14)
hiss = bp(rng.standard_normal(int(3.0 * SR)), 1500, 9000) * np.sin(np.linspace(0, np.pi, int(3.0 * SR))) ** 0.5; place(fx, norm(hiss), 22.2, -16)
place(fx, splash(0.8, 400, 6000), 22.45, -10)
place(fx, whoosh(0.3, 3000, 300, rise=True), 25.1, -8)
# marbles
for lane, every, pan in ((0, 0.62, -0.35), (1, 1.15, 0.35)):
    for k in range(10):
        base = 25.53 + k * every
        if base + every * 0.7 > 30.75: break
        place(fx, plip(1200, 500, 0.07), base + every * 0.25, -16, pan)
        if lane == 1 and k == 2: place(fx, splash(0.25, 600, 5000), base + every * 0.55, -12, pan); continue
        place(fx, glass(2900 + 300 * rng.random()), base + every * 0.7 + 0.12, -12, pan)
for i in range(int((30.78 - 25.3) / 0.5)): place(fx, tick(2500), 25.3 + i * 0.5, -22, 0)
# rain finale
n = int((DUR - 30.78) * SR); rain = hp(rng.standard_normal(n), 2500) * 0.5 + lp(rng.standard_normal(n), 600) * 0.3
drops = (rng.random(n) < 0.0015) * rng.standard_normal(n); rain += hp(np.convolve(drops, np.exp(-np.arange(400) / 60), 'same'), 1500) * 2
place(fx, norm(rain) * np.minimum(1, np.arange(n) / (0.05 * SR)), 30.78, -15)
place(fx, zip_(0.6), 32.1, -13, 0.2)

# ---------------- music bed: warm pad + soft pluck, D major ----------------
def note(m): return 440 * 2 ** ((m - 69) / 12)
chords = [[50, 57, 61, 66], [47, 54, 59, 62], [43, 50, 54, 59], [45, 52, 57, 61]]  # Dmaj7  Bm7  Gmaj7  A
bar = 60 / 104 * 4
music = np.zeros((2, N))
for ci, start in enumerate(np.arange(0, DUR, bar)):
    ch = chords[ci % 4]; n = int(min(bar + 0.6, DUR - start) * SR); tt = np.arange(n) / SR
    for ch_i, side in ((0, -1), (1, 1)):
        pad = np.zeros(n)
        for m in ch:
            f = note(m + 12) * (1 + side * 0.0025)
            pad += sum(np.sin(2 * np.pi * f * h * tt + rng.random() * 6.28) / h ** 1.6 for h in range(1, 7))
        pad = lp(pad, 1400) * env_adsr(n, 0.5, 0.3, 0.85, 0.6)
        i = int(start * SR); music[ch_i, i:i + n] += pad[:N - i] * 0.11
    bass = np.sin(2 * np.pi * note(ch[0] - 12) * tt) * env_adsr(n, 0.08, 0.2, 0.7, 0.5)
    i = int(start * SR); music[:, i:i + n] += bass[:N - i] * 0.35
    # pluck arpeggio on eighth notes
    for k in range(8):
        ts = start + k * bar / 8
        if ts >= DUR: break
        m = ch[[0, 2, 1, 3, 2, 1, 3, 2][k]] + 24; nn = int(0.35 * SR); t2 = np.arange(nn) / SR
        pl = (np.sin(2 * np.pi * note(m) * t2) + 0.3 * np.sin(4 * np.pi * note(m) * t2)) * np.exp(-t2 * 9)
        place(music, pl * 0.18, ts, 0, -0.4 if k % 2 else 0.4)
music = music / np.max(np.abs(music))

# ---------------- voice ----------------
vo, vsr = sf.read(vo_path, dtype='float32')
if vo.ndim > 1: vo = vo.mean(1)
vo = signal.resample_poly(vo, SR, vsr); vo = vo[:N]; vo = np.pad(vo, (0, N - len(vo)))
vo = hp(vo, 80); vo = vo / np.max(np.abs(vo))
# gentle compression on the voice
env = np.sqrt(np.maximum(lp(vo ** 2, 15), 0)); env = np.maximum(env, 1e-4); gain = np.minimum(1, (0.25 / env) ** 0.4); vo = vo * gain; vo /= np.max(np.abs(vo))
voice = np.stack([vo, vo])

# levels: music ~11 dB under the voice, ducked a further 3 dB while words are spoken
def rms_db(x): return 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-9)
speech = np.abs(vo) > 0.02
v_rms = rms_db(vo[speech]); m_rms = rms_db(music[0])
music *= db(v_rms - m_rms - 14)
duck = lp(np.convolve(speech.astype(float), np.ones(int(0.15 * SR)) / int(0.15 * SR), 'same'), 4)
music *= db(-3 * np.clip(duck, 0, 1))
fx *= db(v_rms - rms_db(fx[0][np.abs(fx[0]) > 1e-4]) - 6) if np.any(fx) else 1
mix = voice + music + fx
mix *= np.minimum(1, (N - np.arange(N)) / (0.012 * SR))  # avoid a click on the final hard stop
mix /= np.max(np.abs(mix)) * 1.05
sf.write(out_path, mix.T, SR, subtype='PCM_24')
for name, x in (('voice', voice), ('music', music), ('fx', fx)): sf.write(f"{stems_dir}/{name}.wav", (x / (np.max(np.abs(x)) + 1e-9) * 0.9).T, SR, subtype='PCM_24')
print('mix written', mix.shape, 'voice rms', round(v_rms, 1))
