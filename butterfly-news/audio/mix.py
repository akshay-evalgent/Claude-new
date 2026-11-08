"""Score, foley, natural sound and voice for the butterfly film, all from timeline.json.

120 BPM. Minor groove for the bad news, a hard stop into silence before the turn,
a major brass hit on the turn, half-time low strings for the threat, a second short
silence, then a major chord with bells on the verdict. Every graphic move has a sound.
Writes mix_raw.wav; mux.sh normalises it to -14 LUFS / -1.2 dBTP.
"""
import json, os, numpy as np, soundfile as sf

HERE = os.path.dirname(os.path.abspath(__file__))
TL = json.load(open(os.path.join(HERE, '..', 'timeline.json')))
SR = 48000; DUR = TL['duration']; N = int(SR * DUR)
BEAT = 60 / TL['bpm']; rng = np.random.default_rng(11)

def T(sec): return np.arange(int(SR * sec)) / SR
def midi(n): return 440.0 * 2 ** ((n - 69) / 12)
def place(dst, x, t, g=1.0):
    i = int(round(t * SR));
    if i < 0: x = x[-i:]; i = 0
    n = min(len(x), len(dst) - i)
    if n > 0: dst[i:i + n] += x[:n] * g
def fft_filter(x, lo=None, hi=None, order=4):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR); H = np.ones_like(f)
    if lo: H *= 1 / (1 + (lo / np.maximum(f, 1)) ** order)
    if hi: H *= 1 / (1 + (f / hi) ** order)
    return np.fft.irfft(X * H, len(x))
def adsr(n, a, d, s, r):
    a, d, r = int(a * SR), int(d * SR), int(r * SR); h = max(0, n - a - d - r)
    e = np.concatenate([np.linspace(0, 1, a, False), np.linspace(1, s, d, False), np.full(h, s), np.linspace(s, 0, r)])
    return np.pad(e, (0, max(0, n - len(e))))[:n]
def noise(sec): return rng.uniform(-1, 1, int(SR * sec))

# ---------------- instruments ----------------
def kick():
    t = T(0.32); f = 130 * np.exp(-t * 22) + 46
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 9) + fft_filter(noise(0.32), 2000, 8000) * np.exp(-t * 200) * 0.3
def hat(open_=False):
    d = 0.18 if open_ else 0.05; t = T(d)
    return fft_filter(noise(d), 7000, 16000) * np.exp(-t * (18 if open_ else 90))
def snare():
    t = T(0.25)
    return fft_filter(noise(0.25), 900, 9000) * np.exp(-t * 22) * 0.9 + np.sin(2 * np.pi * 190 * t) * np.exp(-t * 30) * 0.6
def bass(n, d=0.24):
    t = T(d); f = midi(n)
    saw = 2 * ((t * f) % 1) - 1
    x = fft_filter(saw, None, 900) * 0.6 + np.sin(2 * np.pi * f * t) * 0.8
    return x * adsr(len(t), 0.004, 0.08, 0.6, 0.06)
def marimba(n, d=0.35):
    t = T(d); f = midi(n)
    return (np.sin(2 * np.pi * f * t) * np.exp(-t * 9) + 0.35 * np.sin(2 * np.pi * f * 3.93 * t) * np.exp(-t * 30) + 0.12 * np.sin(2 * np.pi * f * 9.2 * t) * np.exp(-t * 60)) * adsr(len(t), 0.001, 0.02, 1, 0.02)
def vibe(notes, d=1.1):
    t = T(d); x = np.zeros(len(t)); trem = 1 + 0.25 * np.sin(2 * np.pi * 5.5 * t)
    for n in notes:
        f = midi(n); x += (np.sin(2 * np.pi * f * t) + 0.25 * np.sin(2 * np.pi * f * 4.0 * t) * np.exp(-t * 8)) * np.exp(-t * 3.2)
    return x * trem / len(notes)
def glock(n, d=1.6):
    t = T(d); f = midi(n)
    return (np.sin(2 * np.pi * f * t) + 0.5 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t * 4) + 0.25 * np.sin(2 * np.pi * f * 5.4 * t) * np.exp(-t * 8)) * np.exp(-t * 2.6)
def brass(notes, d=0.3):
    t = T(d); x = np.zeros(len(t))
    for n in notes:
        for det in (-0.25, 0.25):
            f = midi(n) * 2 ** (det / 100); x += 2 * ((t * f) % 1) - 1
    bright = fft_filter(x, None, 2600)
    return bright * adsr(len(t), 0.012, 0.08, 0.55, 0.12) / len(notes)
def timpani(n):
    t = T(1.8); f = midi(n)
    return (np.sin(2 * np.pi * f * t) * np.exp(-t * 2.2) + 0.5 * np.sin(2 * np.pi * f * 1.5 * t) * np.exp(-t * 3) + fft_filter(noise(1.8), 60, 400) * np.exp(-t * 14) * 0.6)
def cymbal(d=2.6):
    t = T(d); return fft_filter(noise(d), 3000, 15000) * np.exp(-t * 1.6) * adsr(len(t), 0.004, 0.1, 1, 0.3)
def strings(notes, d):
    t = T(d); x = np.zeros(len(t))
    for n in notes:
        for det in (-0.12, 0, 0.12):
            f = midi(n) * 2 ** (det / 100); x += 2 * ((t * f + rng.random()) % 1) - 1
    return fft_filter(x, None, 700) * adsr(len(t), 0.5, 0.2, 0.85, 0.6) / (3 * len(notes))
def bell(notes, d=3.5):
    t = T(d); x = np.zeros(len(t))
    for n in notes:
        f = midi(n)
        for k, (r, a, dec) in enumerate([(1, 1, 1.2), (2.0, .6, 1.8), (3.0, .4, 2.6), (4.2, .3, 3.4), (5.4, .2, 4.5)]): x += a * np.sin(2 * np.pi * f * r * t) * np.exp(-t * dec)
    return x / len(notes)
def pad(notes, d):
    t = T(d); x = np.zeros(len(t))
    for n in notes:
        f = midi(n); x += np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * 2 * f * t)
    return fft_filter(x, None, 1500) * adsr(len(t), 0.6, 0.3, 0.8, 0.8) / len(notes)

# ---------------- score ----------------
mus = np.zeros(N)
CH = {'Am': [57, 60, 64], 'F': [53, 57, 60], 'Dm': [50, 53, 57], 'E': [52, 56, 59], 'C': [48, 52, 55], 'G': [55, 59, 62]}
def groove(t0, t1, chords, half=False, mar=True, vib=True, kit=True, bass_on=True, gain=1.0):
    """chords: list of (start, name). Kit, eighth-note bass, sixteenth marimba, off-beat vibes."""
    b = t0
    while b < t1 - 1e-6:
        name = [c for s, c in chords if s <= b + 1e-6][-1]; notes = CH[name]
        beat_in_bar = int(round(b / BEAT)) % 4
        if kit:
            if not half or beat_in_bar in (0,): place(mus, kick(), b, 0.9 * gain)
            if half and beat_in_bar == 2: place(mus, snare(), b, 0.5 * gain)
            if not half: place(mus, hat(), b + BEAT / 2, 0.22 * gain)
            else: place(mus, hat(), b + BEAT / 2, 0.14 * gain)
        if bass_on:
            for k in range(2):
                n = notes[0] - 24 + (12 if k == 1 and not half else 0)
                place(mus, bass(n), b + k * BEAT / 2, 0.42 * gain)
        if mar:
            pat = [0, 2, 1, 2]
            for k in range(4): place(mus, marimba(notes[pat[k]] + 12), b + k * BEAT / 4, (0.2 if k == 0 else 0.13) * gain)
        if vib and beat_in_bar in (1, 3): place(mus, vibe([n + 12 for n in notes]), b + BEAT / 2, 0.16 * gain)
        b += BEAT

# A: the bad news, 0 - 9.5 (A minor)
groove(0.0, 9.5, [(0, 'Am'), (2, 'F'), (4, 'Dm'), (6, 'E'), (8, 'Am')])
place(mus, brass([57, 64, 69]), 0.1, 0.9); place(mus, timpani(45), 0.1, 0.45); place(mus, glock(81), 0.1, 0.25)   # frame-4 hook hit
place(mus, glock(76), 3.2, 0.18); place(mus, glock(77), 7.65, 0.22)
# hard stop 9.5 - 11.5: no music at all
# turn 11.5: major-key brass hit, timpani, suspended cymbal, then the groove in C major
place(mus, brass([48, 55, 60, 64, 67], 0.55), 11.5, 1.2); place(mus, timpani(36), 11.5, 0.8); place(mus, cymbal(), 11.5, 0.35)
place(mus, glock(84), 11.5, 0.25)
groove(11.5, 14.5, [(11.5, 'C'), (13.5, 'G')])
place(mus, brass([55, 59, 62, 67]), 12.95, 0.85)      # counter lands on 247,246
place(mus, brass([48, 55, 60, 64]), 13.1, 0.95); place(mus, timpani(36), 13.1, 0.5)   # x130 stamp
# held breath 14.5 - 17.0: pad and glock only
place(mus, pad([53, 57, 60, 67], 2.7), 14.5, 0.32); place(mus, glock(79), 14.5, 0.16); place(mus, glock(84), 15.5, 0.12)
# threat 17.0 - 23.5: half-time, low strings, A minor
groove(17.0, 23.5, [(17, 'Am'), (19, 'F'), (21, 'Dm'), (22.5, 'E')], half=True, mar=False, vib=False, gain=0.85)
for s, c, d in [(17, 'Am', 2.2), (19, 'F', 2.2), (21, 'Dm', 1.6), (22.5, 'E', 1.0)]:
    place(mus, strings([n - 12 for n in CH[c]] + [CH[c][0] - 24], d), s, 0.55)
place(mus, brass([45, 52, 57]), 18.1, 0.6); place(mus, brass([40, 47, 52]), 21.15, 0.6)
# second silence 23.5 - 24.0, then the verdict: major chord with bells, light groove back
place(mus, bell([60, 64, 67, 72]), 24.0, 0.55); place(mus, pad([48, 55, 60, 64], 6.0), 24.0, 0.3); place(mus, cymbal(3.0), 24.0, 0.18)
groove(24.5, 29.0, [(24.5, 'C'), (26.0, 'F'), (27.0, 'G'), (28.0, 'C')], vib=True, gain=0.8)
place(mus, bell([60, 67, 72, 76]), 28.0, 0.45); place(mus, brass([48, 55, 60, 64, 67], 0.9), 29.0, 0.55)
# hard silences and the end fade
for a, b in TL['silences']: mus[int(a * SR):int(b * SR)] *= 0
mus[int(9.5 * SR) - 240:int(9.5 * SR)] *= np.linspace(1, 0, 240)           # click-free hard stop
mus[int(23.5 * SR) - 480:int(23.5 * SR)] *= np.linspace(1, 0, 480)
i0 = int(29.4 * SR); mus[i0:] *= np.linspace(1, 0, N - i0) ** 1.2

# ---------------- foley ----------------
fx = np.zeros(N)
def click_thump():
    t = T(0.12); return fft_filter(noise(0.12), 2500, 9000) * np.exp(-t * 300) * 0.7 + np.sin(2 * np.pi * (90 + 60 * np.exp(-t * 40)) * t) * np.exp(-t * 35)
def tick():
    t = T(0.03); return np.sin(2 * np.pi * 2600 * t) * np.exp(-t * 260) + fft_filter(noise(0.03), 4000, 12000) * np.exp(-t * 400) * 0.4
def whoosh(d=0.35, rise=False):
    t = T(d); env = np.sin(np.pi * t / d) ** 2 if not rise else (t / d) ** 2
    return fft_filter(noise(d), 400, 4000) * env
def squeak(d):
    t = T(d); f = 1800 + 500 * np.sin(2 * np.pi * 7 * t)
    return (np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.25 + fft_filter(noise(d), 3000, 8000) * 0.5) * np.sin(np.pi * t / d) ** 0.5
def shutter():
    a = fft_filter(noise(0.04), 1500, 9000) * np.exp(-T(0.04) * 120); b = fft_filter(noise(0.06), 800, 6000) * np.exp(-T(0.06) * 80)
    x = np.zeros(int(0.14 * SR)); x[:len(a)] += a; x[int(0.07 * SR):int(0.07 * SR) + len(b)] += b; return x
def stamp():
    t = T(0.4); return np.sin(2 * np.pi * (60 + 120 * np.exp(-t * 30)) * t) * np.exp(-t * 10) + fft_filter(noise(0.4), 300, 3000) * np.exp(-t * 50) * 0.7
def pop(f0=900, f1=420):
    t = T(0.08); f = f0 * (f1 / f0) ** (t / 0.08); return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 35)
def rattle(t0, t1, g=0.28):
    t = t0
    while t < t1: place(fx, tick(), t, g); t += 0.045

for c in TL['captions']:
    for k in range(len(c['zh'].split('|'))): place(fx, click_thump(), c['t0'] + 0.12 * k, 0.42)
rattle(0.1, 0.55); place(fx, stamp(), 0.55, 0.35); place(fx, pop(), 0.58, 0.3)       # hook counter
place(fx, whoosh(1.2, rise=True), 3.2, 0.25); rattle(3.2, 4.4, 0.18)                  # darkness sweep
place(fx, whoosh(0.3), 5.88, 0.55)                                                     # ledger card in
for i in range(23): place(fx, tick(), 6.25 + i * 1.35 / 23, 0.08)                      # line draws
place(fx, pop(700, 300), 7.65, 0.45); place(fx, pop(), 7.75, 0.35)                     # 2020 point + label
place(fx, shutter(), 9.8, 0.8)                                                         # freeze
place(fx, whoosh(0.25), 11.42, 0.45); place(fx, pop(), 11.65, 0.3); place(fx, pop(), 11.75, 0.3)
rattle(11.95, 12.95, 0.24); place(fx, stamp(), 13.1, 0.9)                              # split counter + stamp
place(fx, whoosh(0.3), 16.88, 0.55)                                                    # paper in
place(fx, squeak(0.25), 17.35, 0.3); place(fx, squeak(0.4), 17.6, 0.3); place(fx, pop(), 18.1, 0.4)
place(fx, squeak(0.4), 20.65, 0.3); place(fx, pop(), 21.15, 0.4)
place(fx, whoosh(0.3), 21.98, 0.35)                                                    # punch-in on the grove

# ---------------- natural sound: coastal grove ----------------
def ambience():
    t = np.arange(N) / SR
    wind = fft_filter(rng.standard_normal(N), 250, 2500) * (0.55 + 0.45 * np.sin(2 * np.pi * 0.13 * t + 1) * np.sin(2 * np.pi * 0.07 * t))
    leaves = fft_filter(rng.standard_normal(N), 3000, 9000) * (0.3 + 0.7 * np.clip(np.sin(2 * np.pi * 0.21 * t), 0, 1)) * 0.5
    surf = fft_filter(rng.standard_normal(N), 40, 500) * (0.5 + 0.5 * np.sin(2 * np.pi * t / 7.5) ** 2)
    x = wind * 0.5 + leaves * 0.35 + surf * 0.6
    for tc in [1.3, 4.8, 10.2, 10.9, 15.6, 25.1, 26.9, 28.3]:                         # a few distant birds
        d = 0.22; tt = T(d); f = 3200 + 1400 * np.sin(np.pi * tt / d)
        place(x, np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * tt / d) ** 2 * 3.0, tc)
    return x / np.max(np.abs(x))
amb = ambience()
lvl = np.full(N, 0.07)
def ramp(a, b, v0, v1): i, j = int(a * SR), int(b * SR); lvl[i:j] = np.linspace(v0, v1, j - i)
ramp(9.5, 9.8, 0.07, 0.24); lvl[int(9.8 * SR):int(11.5 * SR)] = 0.24; ramp(11.5, 12.0, 0.24, 0.07)   # J-cut into the freeze
lvl[int(6.0 * SR):int(9.5 * SR)] = 0.03; lvl[int(16.9 * SR):int(22.0 * SR)] = 0.03                  # quieter under data and paper
ramp(23.3, 23.6, 0.07, 0.2); lvl[int(23.6 * SR):] = 0.16                                             # bed under the ending
lvl[-int(0.6 * SR):] *= np.linspace(1, 0, int(0.6 * SR))
amb *= lvl

# ---------------- voice ----------------
vo = np.zeros(N)
for i, v in enumerate(TL['voice']):
    x, sr = sf.read(os.path.join(HERE, 'voice', f'v{i:02d}.wav'))
    if x.ndim > 1: x = x.mean(1)
    if sr != SR: x = np.interp(np.arange(int(len(x) * SR / sr)) / SR, np.arange(len(x)) / sr, x)
    x = np.tanh(x / np.max(np.abs(x)) * 2.2) / np.tanh(2.2)                            # simple compression
    place(vo, x, v['t'])
# duck the music ~45% under the voice (smoothed envelope)
env = np.abs(vo); k = int(0.05 * SR); env = np.convolve(env, np.ones(k) / k, 'same'); env = np.clip(env / 0.08, 0, 1)
k2 = int(0.12 * SR); env = np.convolve(env, np.ones(k2) / k2, 'same')
duck = 1 - 0.45 * env

def rms(x): return np.sqrt(np.mean(x[np.abs(x) > 1e-4] ** 2)) if np.any(np.abs(x) > 1e-4) else 1
mus /= np.max(np.abs(mus)); fx /= np.max(np.abs(fx)); vo /= np.max(np.abs(vo))
# voice about 8 dB over the music
mix = vo * 1.0 + mus * duck * (rms(vo) / rms(mus)) * 10 ** (-8 / 20) + fx * 0.32 + amb
L = mix + np.roll(amb, 240) * 0.15; R = mix - np.roll(amb, 240) * 0.15                  # a little width from the ambience only
st = np.stack([L, R], 1); st /= np.max(np.abs(st)) * 1.05
sf.write(os.path.join(HERE, 'mix_raw.wav'), st.astype(np.float32), SR, subtype='FLOAT')
sf.write(os.path.join(HERE, 'stems_music.wav'), (mus * duck).astype(np.float32), SR, subtype='FLOAT')
print('wrote mix_raw.wav', DUR, 's')
