"""Music + real sound effects + voiceover for "Why Octopuses Have Three Hearts".
Every sound effect is a real recording, all CC0 (public domain): from Freesound, an underwater ambience, bubbles, real
underwater motion (swooshes), a squelch, a laboratory ambience and a test tube being plucked; from BigSoundBank, a heartbeat,
a vascular Doppler (blood flow) and the room tone of a quiet room. Only the music is synthesized (16 bars).
usage: mix_octopus.py vo.wav sounds_dir words.json out.wav stems_dir"""
import sys, math, json, importlib.util, numpy as np, soundfile as sf
from scipy import signal

SR = 48000
DUR = 916 / 30
vo_path, snd_dir, words_path, out_path, stems_dir = sys.argv[1:6]
N = int(round(DUR * SR))
rng = np.random.default_rng(7)

def db(x): return 10 ** (x / 20)
def lp(x, f, order=2): b, a = signal.butter(order, f / (SR / 2), 'low'); return signal.lfilter(b, a, x)
def hp(x, f, order=2): b, a = signal.butter(order, f / (SR / 2), 'high'); return signal.lfilter(b, a, x)
def bp(x, lo, hi, order=2): b, a = signal.butter(order, [lo / (SR / 2), hi / (SR / 2)], 'band'); return signal.lfilter(b, a, x)
def norm(x): return x / (np.max(np.abs(x)) + 1e-9)
def env_adsr(n, a, d, s, r):
    tt = np.arange(n) / SR
    e = np.where(tt < a, tt / max(a, 1e-6), np.where(tt < a + d, 1 - (1 - s) * (tt - a) / max(d, 1e-6), s))
    return e * np.clip((n / SR - tt) / max(r, 1e-6), 0, 1)
def place(track, clip, t, gain_db=0.0, pan=0.0):
    i = int(round(t * SR)); j0 = max(0, -i); i = max(0, i); n = min(len(clip) - j0, N - i)
    if n <= 0: return
    l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    track[0, i:i + n] += clip[j0:j0 + n] * db(gain_db) * l * 1.414
    track[1, i:i + n] += clip[j0:j0 + n] * db(gain_db) * r * 1.414

# ---------------- real recordings ----------------
_cache = {}
def rec(i, s0, s1, fi=0.004, fo=0.03, rate=1.0):
    """A slice of a recording (BigSoundBank number, or fs<id> for Freesound), mono, 48 kHz, peak-normalized, with short fades."""
    if i not in _cache:
        a, sr = sf.read(f'{snd_dir}/{i}.wav', dtype='float64'); a = a if a.ndim == 1 else a.mean(1)
        if sr != SR: a = signal.resample_poly(a, SR, sr)
        _cache[i] = a
    a = _cache[i]; x = a[int(s0 * SR):int(s1 * SR)].copy()
    if rate != 1.0: x = signal.resample_poly(x, 100, int(round(100 * rate)))
    x = hp(x, 40); n = len(x); f1, f2 = max(1, int(fi * SR)), max(1, int(fo * SR))
    x[:f1] *= np.linspace(0, 1, f1); x[-f2:] *= np.linspace(1, 0, f2)
    return norm(x)

fx = np.zeros((2, N)); amb = np.zeros((2, N))
W = json.load(open(words_path))
C = {}
for w in W:
    k = ''.join(ch for ch in w['w'].lower() if ch.isalpha())
    C.setdefault(k, []).append(w['s'])
def c(k, i=0): return C[k][i]
def place_wrap(track, clip, t, gain_db=0.0, pan=0.0):
    """place a clip; whatever runs past the end wraps round to the start (the loop point)"""
    i = int(round(t * SR)); n1 = min(len(clip), N - i); place(track, clip[:n1], t, gain_db, pan)
    if len(clip) > n1: place(track, clip[n1:], 0.0, gain_db, pan)
def loop_bed(i, s0, gain_db, lowpass=None, fade=0.6):
    """a continuous bed as long as the video whose end crossfades into its start, so the loop has no seam"""
    F = int(fade * SR); x = rec(i, s0, s0 + DUR + fade + 0.05, 0.001, 0.001)[:N + F]
    if lowpass: x = lp(x, lowpass)
    out = x[:N].copy(); r = np.linspace(0, 1, F); out[:F] = x[:F] * r + x[N:N + F] * (1 - r)
    return out * db(gain_db)
def gate(spans, ramp=0.06):
    """a gain curve: 1 inside the (t0, t1) spans, 0 outside, with short ramps"""
    tt = np.arange(N) / SR; g = np.zeros(N)
    for a, b in spans: g = np.maximum(g, np.clip((tt - a) / ramp + 1, 0, 1) * np.clip((b - tt) / ramp, 0, 1))
    return g
END = DUR

def echo(x, delays=(0.16, 0.33, 0.52), gains=(-6, -11, -17), lowpass=(2400, 1500, 900)):
    """a real recording with fading, darker repeats (an echo in a hollow tube)"""
    n = len(x) + int(max(delays) * SR) + 10; y = np.zeros(n); y[:len(x)] += x
    for d, g, f in zip(delays, gains, lowpass): i = int(d * SR); y[i:i + len(x)] += lp(x, f) * db(g)
    return norm(y)
def tile_bed(i, s0, s1, gain_db, lowpass=None, xf=0.4):
    """a bed made by tiling a real segment with equal-power crossfades; the tiles divide the video length exactly,
    so the last tile's tail crossfades into the first tile's head at the loop point"""
    seg_ = rec(i, s0, s1, 0.001, 0.001); F = int(xf * SR)
    if len(seg_) >= N + F:  # long enough: one piece whose overhang crossfades into its own start
        x = seg_[:N + F].copy(); o = x[:N].copy(); o[:F] = x[:F] * np.sin(np.linspace(0, np.pi / 2, F)) + x[N:N + F] * np.cos(np.linspace(0, np.pi / 2, F))
        if lowpass: o = lp(o, lowpass)
        return o * db(gain_db)
    n_t = int(np.ceil(N / (len(seg_) - F))); L2 = N / n_t
    ov = int(len(seg_) - L2); F = min(F, ov); w = np.ones(len(seg_)); w[:F] = np.sin(np.linspace(0, np.pi / 2, F)); w[len(seg_) - F:] = np.cos(np.linspace(0, np.pi / 2, F))
    out = np.zeros(N + len(seg_) + 2)
    for k in range(n_t): st = int(round(k * L2)); x = seg_ * w; x[:max(0, ov - F)] *= 1.0; out[st:st + len(seg_)] += x
    o = out[:N].copy(); rest = out[N:]
    while len(rest): n_ = min(N, len(rest)); o[:n_] += rest[:n_]; rest = rest[n_:]
    if lowpass: o = lp(o, lowpass)
    return o * db(gain_db)
sea_sp = [(-1, c('three') + 0.05), (c('but') - 0.05, c('that', 1) + 0.05), (c('thats') - 0.05, END + 1)]
xray_sp = [(c('three') - 0.05, c('and', 1) + 0.05), (c('that', 1) - 0.05, c('thats') + 0.05)]
lab_sp = [(c('and', 1) - 0.05, c('but') + 0.05)]
# ambiences: a real underwater recording and bubbles on the seabed; under the x-rays, a heartbeat bed; a laboratory for the test tubes
place(amb, tile_bed('fs393819', 10.0, 55.0, -16) * gate(sea_sp, 0.12), 0.0)
place(amb, tile_bed('fs852478', 5.0, 40.0, -25) * gate(sea_sp, 0.12), 0.0)
place(amb, tile_bed('fs393819', 60.0, 100.0, -22, lowpass=900) * gate(xray_sp, 0.15), 0.0)
place(amb, tile_bed('fs648662', 3.0, 58.0, -20) * gate(lab_sp, 0.12), 0.0)
# 0-1) three hearts: three real heartbeats in turn as they light up; blue blood begins to flow
place(fx, rec('fs852478', 12.0, 13.4, 0.05, 0.3), 0.1, -14, 0.2)
for k in range(3): place(fx, lp(rec('0218', 1.8, 2.45, 0.01, 0.1), 500), c('three') + 0.15 + 0.32 * k, -8 - 2 * k, (-0.3, 0.3, 0.0)[k])
place(fx, lp(rec('2500', 6.0, 8.0, 0.1, 0.4), 1800), c('blue') - 0.05, -12, 0.0)
# 2) the two gill hearts beat; 3) the big heart pumps: the Doppler whoosh of blood flow
place(fx, lp(rec('0218', 1.8, 4.6, 0.02, 0.3), 450), c('two') + 0.1, -10, -0.2)
place(fx, lp(rec('0218', 4.6, 7.4, 0.02, 0.3), 450), c('gills') + 0.2, -11, 0.2)
place(fx, lp(rec('2500', 10.0, 13.0, 0.1, 0.4), 2000), c('third') - 0.05, -8, 0.0)
# 4) the test tubes: a real test tube plucked on "copper" and on "iron"
place(fx, rec('fs857650', 0.0, 0.22, 0.001, 0.08), c('copper') + 0.05, -6, -0.3)
place(fx, rec('fs857650', 0.0, 0.22, 0.001, 0.08, rate=0.9), c('iron') + 0.05, -7, 0.3)
# 5) the eye: a few bubbles
place(fx, rec('fs852478', 30.0, 31.0, 0.05, 0.3), c('but') + 0.1, -16, 0.2)
# 6) the jet: real underwater swooshes, bubbles
place(fx, rec('fs760849', 1.0, 2.5, 0.01, 0.4), c('jets') - 0.15, -5, -0.3)
place(fx, rec('fs760849', 3.0, 4.2, 0.01, 0.4), c('water') - 0.1, -8, -0.4)
place(fx, rec('fs852478', 50.0, 51.5, 0.03, 0.3), c('jets'), -12, -0.2)
# 7) the main heart pauses: beating, then nothing
place(fx, lp(rec('0218', 1.8, 3.4, 0.02, 0.05), 500), c('that', 1) - 0.1, -8, 0.0)
# 8) crawling: a soft wet squelch; 9) resting: slow bubbles
place(fx, lp(rec('fs547446', 0.8, 2.4, 0.05, 0.3), 2500), c('crawl') - 0.1, -14, 0.1)
place(fx, rec('fs852478', 70.0, 71.5, 0.1, 0.4), c('swimming') + 0.3, -15, -0.1)
# 10) another octopus zooms away behind
place(fx, rec('fs760849', 36.4, 38.0, 0.01, 0.4), c('zooming') - 0.2, -7, -0.4)

# ---------------- music: deep and curious; a slow pulse under the x-rays ----------------
BAR = DUR / 16
def note(m): return 440 * 2 ** ((m - 69) / 12)
def pizz(f, dur=0.32, bright=1.0):
    n = int(dur * SR); tt = np.arange(n) / SR
    return (np.sin(2 * np.pi * f * tt) + 0.55 * bright * np.sin(4 * np.pi * f * tt) * np.exp(-tt * 14) + 0.3 * bright * np.sin(6 * np.pi * f * tt) * np.exp(-tt * 22)) * np.exp(-tt * 11) * np.minimum(1, tt / 0.003)
def celesta(f, dur=0.9):
    n = int(dur * SR); tt = np.arange(n) / SR; return (np.sin(2 * np.pi * f * tt) + 0.4 * np.sin(2 * np.pi * f * 2 * tt) * np.exp(-tt * 6) + 0.15 * np.sin(2 * np.pi * f * 3.01 * tt) * np.exp(-tt * 9)) * np.exp(-tt * 3.2) * np.minimum(1, tt / 0.002)
def pad(chord, dur, bright=1.0):
    n = int(dur * SR); tt = np.arange(n) / SR; x = np.zeros(n)
    for m in chord: x += sum(np.sin(2 * np.pi * note(m + 12) * h * tt + rng.random() * 6) / h ** 1.7 for h in range(1, 5))
    return lp(x, 1400 * bright) * env_adsr(n, 0.25, 0.2, 0.85, 0.3)
NIGHT = [[50, 53, 57], [46, 50, 53], [48, 52, 55], [45, 48, 52]]   # Dm Bb C Am: deep, curious
def style(t):
    for a, b in xray_sp + lab_sp:
        if a <= t < b: return 'xray'
    return 'night'
music = np.zeros((2, N))
for b in range(16):
    t0 = b * BAR; ch = NIGHT[b % 4]
    for k in range(8):
        ts = t0 + k * BAR / 8; st = style(ts + 0.01)
        if st == 'night':
            if k in (0, 3, 6): place(music, pizz(note(ch[0] - 12), 0.5, 0.4) * 0.4, ts)
            if k in (2, 5): place(music, celesta(note(ch[[1, 2][k // 3 - 0]] + 24), 1.0) * 0.12, ts, 0, 0.3 if k == 2 else -0.3)
            if k == 0: place(music, pad(ch, BAR, 0.6) * 0.05, ts)
        else:
            if k in (0, 4): place(music, pizz(note(ch[0] - 12), 0.6, 0.3) * 0.45, ts)
            if k in (2, 6): place(music, lp(celesta(note(ch[2] + 12), 0.9), 2500) * 0.1, ts, 0, 0.2)
            if k == 0: place(music, pad(ch, BAR, 0.5) * 0.07, ts)
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
music *= db(v_rms - m_rms - 15.5)
duck = lp(np.convolve(speech.astype(float), np.ones(int(0.15 * SR)) / int(0.15 * SR), 'same'), 4)
music *= db(-3 * np.clip(duck, 0, 1))
fx_ref = rms_db(fx[0][np.abs(fx[0]) > 1e-3]); fx *= db(v_rms - fx_ref - 7.0)
amb *= db(v_rms - fx_ref - 7.0)
fx *= db(-2.5 * np.clip(duck, 0, 1))
mix = voice + music + fx + amb
mix /= np.max(np.abs(mix)) * 1.05     # no fade at the end: the last sample flows into the first on loop
sf.write(out_path, mix.T, SR, subtype='PCM_24')
for name, x in (('voice', voice), ('music', music), ('fx', fx + amb)): sf.write(f"{stems_dir}/{name}.wav", (x / (np.max(np.abs(x)) + 1e-9) * 0.9).T, SR, subtype='PCM_24')
print('mix written', mix.shape, 'voice rms', round(v_rms, 1), 'bar', round(BAR, 4), 'bpm', round(240 / BAR, 2))
