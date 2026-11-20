"""Music + real sound effects + voiceover for "Why Pigeons Bob Their Heads".
Every sound effect is a real recording, all CC0 (public domain): from Freesound, real pigeons cooing and walking,
pigeons flapping in the Piazza della Signoria, wing beats, a red-tailed hawk and a treadmill; from BigSoundBank,
a camera shutter, air whooshes and the room tone of a quiet room. Only the music is synthesized (16 bars).
usage: mix_pigeon.py vo.wav sounds_dir words.json out.wav stems_dir"""
import sys, math, json, importlib.util, numpy as np, soundfile as sf
from scipy import signal

SR = 48000
DUR = 1005 / 30
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
    seg_ = rec(i, s0, s1, 0.001, 0.001); F = int(xf * SR); n_t = int(np.ceil(N / (len(seg_) - F))); L2 = N / n_t
    ov = int(len(seg_) - L2); F = min(F, ov); w = np.ones(len(seg_)); w[:F] = np.sin(np.linspace(0, np.pi / 2, F)); w[len(seg_) - F:] = np.cos(np.linspace(0, np.pi / 2, F))
    out = np.zeros(N + len(seg_) + 2)
    for k in range(n_t): st = int(round(k * L2)); x = seg_ * w; x[:max(0, ov - F)] *= 1.0; out[st:st + len(seg_)] += x
    o = out[:N].copy(); tail = out[N:]; o[:len(tail)] += tail
    if lowpass: o = lp(o, lowpass)
    return o * db(gain_db)
plaza = [(-1, c('scientists') + 0.05), (c('so', 2) - 0.12, END + 1)]
slowmo = [(c('with') - 0.05, c('hold') + 0.05)]
plaza_rt = [(-1, c('with') + 0.05), (c('hold') - 0.05, c('scientists') + 0.05), (c('so', 2) - 0.12, END + 1)]
lab = [(c('scientists') - 0.1, c('so', 2) - 0.05)]
# ambiences: a real Italian piazza with pigeons flapping, real pigeons cooing in a city park; slowed and darkened in slow motion;
# in the lab, the room tone of a quiet room and a real treadmill running
place(amb, tile_bed('fs709408', 0.5, 30.0, -22) * gate(plaza_rt, 0.12), 0.0)
place(amb, tile_bed('fs154865', 0.0, 25.0, -26) * gate(plaza_rt, 0.12), 0.0)
place(amb, tile_bed('fs709408', 0.5, 30.0, -27, lowpass=700) * gate(slowmo, 0.2), 0.0)
place(amb, loop_bed('2387', 30.0, -30) * gate(lab, 0.15), 0.0)
place(amb, tile_bed('fs585758', 0.5, 6.5, -17) * gate(lab, 0.15), 0.0)
# 0) the hook: a pigeon cooing as it struts, a flap somewhere behind
place(fx, rec('fs701282', 1.5, 4.6, 0.02, 0.3), 0.18, -9, 0.15)
place(fx, rec('fs701283', 0.0, 0.62, 0.01, 0.15), 1.25, -21, -0.6)
# 1) Watch. time slows: a soft whoosh down
place(fx, lp(rec('1796', 0.0, 1.0, 0.01, 0.3), 1400), c('watch') - 0.12, -15, 0.0)
# 2-4) slow motion: a coo slowed right down; a shutter-like click when the head locks; the snap is a whoosh; locks again
place(fx, lp(rec('fs795558', 2.35, 3.15, 0.02, 0.2, rate=0.55), 1800), c('every') + 0.1, -11, 0.1)
place(fx, rec('0307', 0.0, 0.35, 0.001, 0.08), c('locks') + 0.02, -15, 0.15)
place(fx, lp(rec('fs153277', 0.05, 0.9, 0.01, 0.2, rate=0.5), 2500), c('walks') - 0.1, -17, -0.2)
place(fx, rec('1795', 0.0, 0.9, 0.003, 0.2), c('snaps') - 0.04, -7, 0.15)
place(fx, rec('0307', 0.0, 0.35, 0.001, 0.08), c('locks', 1) + 0.02, -13, 0.15)
# 5) Hold, snap. Hold, snap: a shutter on every hold, a whoosh on every snap
for k in (0, 1): place(fx, rec('0307', 0.0, 0.35, 0.001, 0.08), c('hold', k) + 0.01, -10, 0.1)
for k in (0, 1): place(fx, rec('1796', 0.0, 0.8, 0.003, 0.2), c('snap', k) - 0.03, -8, 0.15)
# 6-8) close on the head: a soft coo
place(fx, rec('fs795558', 4.7, 5.35, 0.02, 0.15), c('why') + 0.1, -13, 0.1)
place(fx, rec('fs701282', 6.0, 7.55, 0.02, 0.25), c('so') + 0.3, -15, -0.1)
# 9) like a camera on a tripod: the shutter
place(fx, rec('0308', 0.0, 0.93, 0.001, 0.1), c('tripod') + 0.05, -9, -0.25)
# 10) the pigeon's own view: a soft rush of air on each snap forward
for k in range(7): place(fx, lp(rec('1796', 0.0, 0.7, 0.003, 0.2), 1800), 19.14 + 0.48 * k - 0.02, -21, 0.0)
place(fx, rec('fs701282', 24.0, 25.6, 0.02, 0.25), c('seeds') - 0.3, -16, 0.3)
# 11) and hawks: a real red-tailed hawk cries overhead; pigeons scatter
place(fx, rec('fs875513', 0.0, 0.8, 0.01, 0.25), c('and', 1) + 0.04, -5, 0.3)
place(fx, rec('fs875513', 4.75, 5.55, 0.01, 0.25), c('hawks') + 0.45, -10, 0.25)
place(fx, rec('fs701283', 0.0, 1.55, 0.01, 0.3), c('and', 1) + 0.25, -11, -0.3)
# 12-14) the lab: a pigeon cooing quietly on the treadmill
place(fx, rec('fs795558', 7.2, 7.85, 0.02, 0.15), c('world') + 0.2, -17, 0.1)
place(fx, rec('fs795558', 10.0, 10.8, 0.02, 0.2), c('bobbing', 1) + 0.25, -17, 0.1)
# 15) back in the square: a coo and a wing flap as it struts past (the bed loops into the hook)
place(fx, rec('fs701282', 8.7, 11.8, 0.02, 0.3), c('so', 2) + 0.25, -11, 0.1)
place(fx, rec('fs153277', 0.05, 0.7, 0.01, 0.15), c('struts') + 0.1, -19, -0.4)

# ---------------- music: a strutting pizzicato, frozen to a pad in slow motion, quiet for "hold, snap" ----------------
BAR = DUR / 16
def note(m): return 440 * 2 ** ((m - 69) / 12)
def pizz(f, dur=0.32, bright=1.0):
    n = int(dur * SR); tt = np.arange(n) / SR
    return (np.sin(2 * np.pi * f * tt) + 0.55 * bright * np.sin(4 * np.pi * f * tt) * np.exp(-tt * 14) + 0.3 * bright * np.sin(6 * np.pi * f * tt) * np.exp(-tt * 22)) * np.exp(-tt * 11) * np.minimum(1, tt / 0.003)
def marimba(f, dur=0.5):
    n = int(dur * SR); tt = np.arange(n) / SR; return (np.sin(2 * np.pi * f * tt) + 0.35 * np.sin(2 * np.pi * f * 4.0 * tt) * np.exp(-tt * 30)) * np.exp(-tt * 7) * np.minimum(1, tt / 0.002)
def celesta(f, dur=0.9):
    n = int(dur * SR); tt = np.arange(n) / SR; return (np.sin(2 * np.pi * f * tt) + 0.4 * np.sin(2 * np.pi * f * 2 * tt) * np.exp(-tt * 6) + 0.15 * np.sin(2 * np.pi * f * 3.01 * tt) * np.exp(-tt * 9)) * np.exp(-tt * 3.2) * np.minimum(1, tt / 0.002)
def pad(chord, dur, bright=1.0):
    n = int(dur * SR); tt = np.arange(n) / SR; x = np.zeros(n)
    for m in chord: x += sum(np.sin(2 * np.pi * note(m + 12) * h * tt + rng.random() * 6) / h ** 1.7 for h in range(1, 5))
    return lp(x, 1400 * bright) * env_adsr(n, 0.25, 0.2, 0.85, 0.3)
STRUT = [[48, 52, 55], [45, 48, 52], [41, 45, 48], [43, 47, 50]]   # C Am F G: a jaunty walk
def style(t):
    if c('with') - 0.05 <= t < c('hold') - 0.05: return 'frozen'
    if c('hold') - 0.05 <= t < c('why'): return 'rest'
    if c('why') <= t < c('every', 1) - 0.05: return 'curious'
    if c('and', 1) - 0.05 <= t < c('scientists') - 0.1: return 'rest'
    if c('scientists') - 0.1 <= t < c('so', 2) - 0.05: return 'lab'
    return 'strut'
music = np.zeros((2, N))
for b in range(16):
    t0 = b * BAR; ch = STRUT[b % 4]
    for k in range(8):
        ts = t0 + k * BAR / 8; st = style(ts + 0.01)
        if st == 'strut':
            if k % 2 == 0: place(music, pizz(note(ch[0] - 12 + (7 if k % 4 == 2 else 0)), 0.3, 0.7) * 0.42, ts)
            else: place(music, marimba(note(ch[(k // 2) % 3] + 12), 0.25) * 0.16, ts, 0, -0.3 if k % 4 == 1 else 0.3)
        elif st == 'frozen':
            if k == 0: place(music, pad(ch, BAR, 0.5) * 0.07, ts)
            if k == 4: place(music, celesta(note(ch[2] + 24), 1.2) * 0.07, ts, 0, 0.3)
        elif st == 'curious':
            place(music, marimba(note(ch[k % 3] + (12 if k % 4 == 3 else 0)), 0.3) * 0.12, ts, 0, -0.25 if k % 2 else 0.25)
            if k == 0: place(music, pad(ch, BAR, 0.6) * 0.04, ts)
        elif st == 'lab':
            if k in (0, 2, 4, 6): place(music, celesta(note(ch[[0, 1, 2, 1][k // 2]] + 24), 0.8) * 0.14, ts, 0, 0.2)
            if k in (0, 4): place(music, pizz(note(ch[0] - 12), 0.4, 0.6) * 0.36, ts)
            if k == 0: place(music, pad(ch, BAR) * 0.05, ts)
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
