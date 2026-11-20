"""Music + real sound effects + voiceover for "Why Mosquitoes Bite Some People More".
Every sound effect is a real recording, all CC0 (public domain): from Freesound, a single mosquito's whine and mosquitoes
buzzing past, a summer evening full of crickets, a breath, a lotion bottle squeezed, a fizz of bubbles, clothes rustling,
a laboratory, a tally counter and a ticking clock; from BigSoundBank, a heartbeat and the room tone of a quiet room.
Only the music is synthesized (16 bars).
usage: mix_mosquito.py vo.wav sounds_dir words.json out.wav stems_dir"""
import sys, math, json, importlib.util, numpy as np, soundfile as sf
from scipy import signal

SR = 48000
DUR = 1019 / 30
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
park_sp = [(-1, c('your', 2) + 0.05), (c('so') - 0.12, END + 1)]
micro_sp = [(c('your', 2) - 0.05, c('in') + 0.05), (c('that') - 0.05, c('and', 2) + 0.05)]
lab_sp = [(c('in') - 0.05, c('that') + 0.05), (c('and', 2) - 0.05, c('so') + 0.05)]
# ambiences: a real summer evening full of crickets in the park; a quiet room under the microscope; a real laboratory
place(amb, tile_bed('fs746366', 1.0, 44.0, -19) * gate(park_sp, 0.12), 0.0)
place(amb, tile_bed('2387', 30.0, 120.0, -29) * gate(micro_sp, 0.12), 0.0)
place(amb, tile_bed('fs648662', 2.0, 60.0, -21) * gate(lab_sp, 0.12), 0.0)
def whine(t0, t1, gain, pan=0.0, s0=2.0, rate=1.0, fi=0.25, fo=0.25, wobble=0.0):
    """a real mosquito's whine from t0 to t1, with a slow swell and sway as she moves"""
    x = rec('fs435650', s0, s0 + (t1 - t0) * rate + 0.1, fi, fo, rate=rate)[:int((t1 - t0) * SR)]
    if wobble: tt = np.arange(len(x)) / SR; x = x * (1 + wobble * np.sin(tt * 2 * np.pi * 0.45))
    place(fx, x, t0, gain, pan)
# 0) she has landed and starts to bite: no whine; two others pass behind (their flight wraps round from the last shot)
place_wrap(fx, rec('fs477794', 3.6, 6.2, 0.05, 0.4), END - 0.9, -14, -0.4)
# 1) a female and a male hovering: two real whines, his higher
whine(c('only') - 0.05, c('they') + 0.05, -9, -0.2, 3.0)
whine(c('only') - 0.05, c('they') + 0.05, -14, 0.3, 9.0, rate=1.35)
# 2) she feeds: a slow real heartbeat under the skin
place(fx, lp(rec('0218', 0.8, 2.8, 0.05, 0.4), 900), c('they') + 0.05, -12, 0.0)
# 3) she follows your breath: a real breath out, then her whine as she flies up the plume
place(fx, rec('fs717167', 1.6, 3.4, 0.05, 0.4), c('first') - 0.05, -7, 0.25)
whine(c('first') + 0.1, c('from') + 0.08, -8, -0.1, 6.0, wobble=0.35)
# 4) 30 feet away: the whine faint and far
whine(c('from') - 0.05, c('up', 1) + 0.05, -21, 0.4, 12.0, fi=0.1, fo=0.2)
# 5) up close: hovering right by the camera
whine(c('up', 1) - 0.05, c('your', 2) + 0.05, -9, 0.1, 15.0, wobble=0.2)
# 6) oils welling up: a real lotion bottle squeezed
place(fx, rec('fs854468', 15.6, 16.5, 0.02, 0.3), c('oils') - 0.35, -9, 0.0)
place(fx, rec('fs854468', 17.0, 17.7, 0.02, 0.3), c('and') - 0.3, -13, 0.2)
# 7) bacteria at work: real bubbles, softened
place(fx, lp(rec('fs521897', 1.0, 4.4, 0.2, 0.5), 2600), c('bacteria') - 0.2, -14, 0.0)
# 8) nylon stockings: clothes rustling
place(fx, rec('fs566193', 3.2, 4.9, 0.03, 0.3), c('nylon') - 0.15, -9, -0.15)
# 9) the test: mosquitoes released buzz down the tube; the tally counter clicks
for k, (s0, s1) in enumerate([(7.6, 9.8), (31.4, 33.6), (18.2, 20.2)]):
    place(fx, rec('fs477794', s0, s1, 0.1, 0.4), c('mosquitoes') + 0.15 + k * 0.5, -13 - 2 * k, [-0.3, 0.3, 0.0][k])
for k, (s0, s1) in enumerate([(3.05, 3.55), (5.9, 6.4), (8.1, 8.6), (11.65, 12.1), (13.2, 13.9)]):
    place(fx, rec('fs664698', s0, s1, 0.002, 0.08), c('hundred') - 0.05 + k * 0.17, -8, 0.15)
# 10) the acids: just the room and the music
# 11) years go by: a real clock, its ticks coming faster and faster
tk = rec('fs813355', 0.95, 1.2, 0.002, 0.05); tt_ = c('and', 2) + 0.1; gap = 0.26
while tt_ < c('so') - 0.1: place(fx, tk, tt_, -9, -0.1); tt_ += gap; gap = max(0.07, gap * 0.9)
# 12) back at the table: she flies in and lands (the whine swells, then stops as she touches down)
whine(c('so') + 0.05, END - 0.42, -9, 0.15, 18.0, fi=0.8, fo=0.12, wobble=0.25)

# ---------------- music: curious and a little tense at dusk; a slow pulse under the microscope and in the lab ----------------
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
NIGHT = [[50, 53, 57], [46, 50, 53], [53, 57, 60], [48, 52, 55]]   # Dm Bb F C: curious, dusky
def style(t):
    for a, b in micro_sp + lab_sp:
        if a <= t < b: return 'xray'
    return 'night'
music = np.zeros((2, N))
for b in range(16):
    t0 = b * BAR; ch = NIGHT[b % 4]
    for k in range(8):
        ts = t0 + k * BAR / 8; st = style(ts + 0.01)
        if st == 'night':
            if k in (0, 3, 6): place_wrap(music, pizz(note(ch[0] - 12), 0.5, 0.4) * 0.4, ts)
            if k in (2, 5): place_wrap(music, celesta(note(ch[[1, 2][k // 3 - 0]] + 24), 1.0) * 0.12, ts, 0, 0.3 if k == 2 else -0.3)
            if k == 0: place_wrap(music, pad(ch, BAR, 0.6) * 0.05, ts)
        else:
            if k in (0, 4): place_wrap(music, pizz(note(ch[0] - 12), 0.6, 0.3) * 0.45, ts)
            if k in (2, 6): place_wrap(music, lp(celesta(note(ch[2] + 12), 0.9), 2500) * 0.1, ts, 0, 0.2)
            if k == 0: place_wrap(music, pad(ch, BAR, 0.5) * 0.07, ts)
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
