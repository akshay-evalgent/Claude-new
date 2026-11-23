"""Music + real sound effects + voiceover for "Why Cats Sit On Your Laptop".
Every sound effect is a real recording, all CC0 (public domain): from Freesound, a cat purring, a laptop keyboard (typing and
single key presses), a fireplace crackling, wind on an open desert plain, a camera shutter, a cat's meow, a cat sniffing,
a ticking clock and birds outside; from BigSoundBank, the room tone of a quiet room.
Only the music is synthesized (16 bars).
usage: mix_laptop.py vo.wav sounds_dir words.json out.wav stems_dir"""
import sys, math, json, importlib.util, numpy as np, soundfile as sf
from scipy import signal

SR = 48000
DUR = 979 / 30
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
# cue times (s) from the voiceover (see words.json): shots change on these words
T = dict(its=2.98, a2=4.64, and1=7.16, cats=7.58, their=10.97, thats=13.22, warm2=14.56, and2=15.18, theres=17.94, the4=19.46,
         to2=22.38, stealing=23.66, so=24.86, sits=25.4, and3=26.74, smell=27.26, so2=28.52)
desk_sp = [(-1, T['and1']), (T['thats'], T['and2']), (T['theres'], END + 1)]
fire_sp = [(T['and1'] - 0.05, T['their'] + 0.1)]
desert_sp = [(T['their'] - 0.05, T['thats'] + 0.1)]
sun_sp = [(T['and2'] - 0.05, T['theres'] + 0.05)]
# beds: a quiet room indoors; the fire; desert wind; outside the sunny window, birds
place(amb, tile_bed('2387', 30.0, 120.0, -28) * gate(desk_sp, 0.1), 0.0)
place(amb, tile_bed('fs444920', 3.0, 70.0, -20) * gate(fire_sp, 0.12), 0.0)
place(amb, tile_bed('fs697217', 2.0, 40.0, -19, lowpass=6000) * gate(desert_sp, 0.12), 0.0)
place(amb, tile_bed('fs469289', 0.2, 8.0, -27) * gate(sun_sp, 0.12), 0.0)
# the purring cat asleep on the laptop (through the loop point), by the fire and on the armchair
purr = rec('fs502051', 2.0, 29.0, 0.3, 0.6)
place_wrap(fx, purr[:int((END - T['so2'] + T['a2'] + 0.4) * SR)] * np.r_[np.linspace(0, 1, int(0.4 * SR)), np.ones(int((END - T['so2'] + T['a2']) * SR))][:int((END - T['so2'] + T['a2'] + 0.4) * SR)], T['so2'] - 0.3, -13, -0.1)
place(fx, rec('fs502051', 5.0, 9.5, 0.4, 0.5), T['and1'] + 0.3, -17, 0.1)
place(fx, rec('fs502051', 12.0, 13.6, 0.3, 0.4), T['thats'] + 0.1, -18, 0.15)
# thermal camera switching on: a real camera shutter at each scan-line wipe
place(fx, rec('fs271010', 0.6, 1.45, 0.002, 0.08), T['its'] - 0.14, -9, 0.0)
place(fx, rec('fs271010', 0.6, 1.45, 0.002, 0.08), T['warm2'] - 0.14, -10, 0.0)
# time-lapse across the floor: a clock ticking fast
place(fx, rec('fs412751', 0.0, 7.8, 0.01, 0.2, rate=2.6), T['and2'], -15, 0.2)
# all day at the laptop: typing
place(fx, rec('fs466785', 1.0, 4.2, 0.1, 0.3), T['the4'] + 0.05, -19, -0.1)
# the rival: a grumpy meow
place(fx, rec('fs412017', 0.3, 1.4, 0.01, 0.15), T['stealing'] - 0.1, -11, 0.15)
# paws landing on keys: real key presses
for k, dt in enumerate((0.0, 0.31, 0.58, 0.86, 1.1)): place(fx, rec('fs850586', 2.5 + 0.35 * k, 2.5 + 0.35 * k + 0.16, 0.002, 0.04), T['sits'] - 0.05 + dt, -12, -0.15 + 0.07 * k)
# sniffing the keys
place(fx, rec('fs848385', 1.0, 3.6, 0.05, 0.3), T['smell'] - 0.35, -10, 0.1)
# ---------------- music: cosy and a little sly; sparse in the desert ----------------
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
COSY = [[48, 52, 55], [53, 57, 60], [45, 48, 52], [50, 53, 57]]   # C F Am Dm
def style(t):
    for a, b in desert_sp:
        if a <= t < b: return 'desert'
    return 'cosy'
music = np.zeros((2, N))
for b in range(16):
    t0 = b * BAR; ch = COSY[b % 4]
    for k in range(8):
        ts = t0 + k * BAR / 8; st = style(ts + 0.01)
        if st == 'cosy':
            if k in (0, 3, 6): place_wrap(music, pizz(note(ch[0] - 12), 0.5, 0.4) * 0.4, ts)
            if k in (2, 5, 7): place_wrap(music, celesta(note(ch[[1, 2, 1][(k - 2) // 3 if k < 7 else 2]] + 24), 1.0) * 0.11, ts, 0, 0.3 if k == 2 else -0.3)
            if k == 0: place_wrap(music, pad(ch, BAR, 0.6) * 0.05, ts)
        else:
            if k in (0, 4): place_wrap(music, pizz(note(ch[0] - 24), 0.9, 0.25) * 0.5, ts)
            if k == 0: place_wrap(music, pad(ch, BAR, 0.4) * 0.08, ts)
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
