"""Music bed + sound effects + voiceover for the why-we-yawn short.
Everything is synthesized here so the track is original and royalty-free."""
import sys, numpy as np, soundfile as sf
from scipy import signal

SR = 48000
DUR = 35.05
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
place(fx, yawn_snd(1.9, 230, 130), 0.05, -14)
for i in range(16): place(fx, tick(3200 if i % 2 else 2600), 2.3 + i * 0.095, -18, 0.4)
place(fx, whoosh(0.34, 400, 3000), 4.25, -9)
for i in range(10): place(fx, pop(700 + i * 60), 4.45 + i * 0.05, -17, (i % 2) - 0.5)
place(fx, whoosh(0.3, 3000, 300, rise=True), 6.8, -8)
place(fx, hiss(2.2), 7.95, -18, 0.5)
for t0, d_ in ((10.0, 1.0), (10.95, 0.75), (11.55, 0.75)): place(fx, yawn_snd(d_, 220, 140) * 0.8, t0, -20)
for t0 in (10.21, 11.16, 11.76): place(fx, click(), t0, -11, -0.4)
place(fx, whoosh(0.5, 200, 5000), 11.65, -7)
n = int(1.8 * SR); air = bp(rng.standard_normal(n), 300, 2500) * np.sin(np.linspace(0, np.pi, n)) ** 2; place(fx, norm(air), 13.3, -16)
for t0 in (14.24, 14.8, 15.36): place(fx, heartbeat(), t0, -9)
crk = (rng.random(int(1.3 * SR)) < 0.004) * rng.standard_normal(int(1.3 * SR)); place(fx, norm(hp(np.convolve(crk, np.exp(-np.arange(300) / 40), 'same'), 2000)), 15.75, -18)
place(fx, chime(1760, 1.0), 16.9, -18)
place(fx, fanwhir(1.4), 17.95, -15)
place(fx, whoosh(0.3, 600, 2000, rise=False), 19.2, -16)
place(fx, wind(4.6), 19.3, -18)
place(fx, glide(3.0, 300, 900), 19.7, -24)
place(fx, ding(2200), 22.6, -15)
place(fx, whoosh(0.34, 400, 3000), 23.84, -9)
place(fx, yawn_snd(0.6, 1900, 1300, 0.3), 24.15, -16, 0.5)
place(fx, yawn_snd(3.1, 105, 70, 0.25, growl=0.6), 24.2, -9, -0.3)
place(fx, whoosh(0.3, 3000, 300, rise=True), 27.0, -8)
place(fx, crickets(4.8), 27.12, -24)
for i in range(8): place(fx, click(), 29.2 + i * 0.18, -22, 0.2)
place(fx, yawn_snd(1.6, 220, 140) * 0.8, C_y := 30.6, -18)
place(fx, thud(70, 0.22), 31.9, -12)
place(fx, yawn_snd(3.1, 235, 125, 0.28), 32.0, -12)

# ---------------- music bed: warm pad + soft pluck, D major ----------------
def note(m): return 440 * 2 ** ((m - 69) / 12)
chords = [[57, 64, 68, 73], [54, 61, 64, 69], [50, 57, 61, 66], [52, 59, 64, 68]]  # Amaj7  F#m7  Dmaj7  E
bar = 60 / 92 * 4
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
music *= db(v_rms - m_rms - 16)
duck = lp(np.convolve(speech.astype(float), np.ones(int(0.15 * SR)) / int(0.15 * SR), 'same'), 4)
music *= db(-3 * np.clip(duck, 0, 1))
fx *= db(v_rms - rms_db(fx[0][np.abs(fx[0]) > 1e-4]) - 8.5) if np.any(fx) else 1
mix = voice + music + fx
mix *= np.minimum(1, (N - np.arange(N)) / (0.012 * SR))  # avoid a click on the final hard stop
mix /= np.max(np.abs(mix)) * 1.05
sf.write(out_path, mix.T, SR, subtype='PCM_24')
for name, x in (('voice', voice), ('music', music), ('fx', fx)): sf.write(f"{stems_dir}/{name}.wav", (x / (np.max(np.abs(x)) + 1e-9) * 0.9).T, SR, subtype='PCM_24')
print('mix written', mix.shape, 'voice rms', round(v_rms, 1))
