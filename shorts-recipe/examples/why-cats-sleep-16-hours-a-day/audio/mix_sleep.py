"""Music + real sound effects + voiceover for "Why Cats Sleep 16 Hours A Day".
Every sound effect is a real recording from BigSoundBank (CC0, public domain): a real cat purring in its sleep, morning
birds, crickets and night insects in the garden, steps and running in tall grass, a real dog panting, real mice, a
tawny owl and a ticking clock at night, a rooster at dawn and evening birds at dusk, fabric for the zoomies, a fly
buzzing and a click for the ears. Only the music is synthesized (16 bars across the video, so the loop lands on the downbeat).
usage: mix_sleep.py vo.wav sounds_dir events.py out.wav stems_dir"""
import sys, math, json, importlib.util, numpy as np, soundfile as sf
from scipy import signal

SR = 48000
DUR = 1032 / 30
vo_path, snd_dir, ev_path, out_path, stems_dir = sys.argv[1:6]
N = int(DUR * SR)
rng = np.random.default_rng(7)
spec = importlib.util.spec_from_file_location('events', ev_path); EVM = importlib.util.module_from_spec(spec); spec.loader.exec_module(EVM)

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
    """A slice of a BigSoundBank recording, mono, 48 kHz, peak-normalized, with short fades."""
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
W = json.load(open(ev_path.replace('events.py', 'words.json')))
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

bed = [(0, c('cats') - 0.05), (c('so') - 0.05, c('theyre') + 0.05), (c('most', 1) - 0.05, END)]
garden = [(c('cats') - 0.05, c('so') + 0.05), (c('when') - 0.05, c('thats') + 0.05)]
# the sunny bedroom: birds outside and a soft purr in its sleep, both running straight across the loop
place(amb, loop_bed('0222', 30.0, -33) * gate(bed, 0.15), 0.0)
place(amb, loop_bed('0981', 60.0, -30) * gate(bed, 0.15), 0.0)
# the garden at dusk: crickets and night insects
place(amb, loop_bed('1470', 30.0, -29) * gate(garden, 0.15), 0.0)
place(amb, loop_bed('0908', 8.0, -36) * gate(garden, 0.15), 0.0)
def grass(t, g=-20, pan=0.0, k=0):
    s0 = [0.25, 1.4, 2.5, 3.25, 4.4, 5.25][k % 6]; place(fx, rec('1024', s0, s0 + 0.45, 0.02, 0.1), t, g, pan)
# 1) one eye opens: a tiny fabric shift
place(fx, rec('1104', 1.35, 1.8, 0.02, 0.1), c('not') - 0.1, -26, 0.1)
# 2) the ambush crouch: a shift in the grass
grass(c('ambush') - 0.1, -22, 0.2, 0)
# 3) the dog thunders past: running in the grass and panting
place(fx, rec('1843', 0.5, 2.6, 0.05, 0.25), c('they') + 0.1, -12, 0.6); place(fx, rec('1547', 4.0, 5.6, 0.1, 0.3), c('they') + 0.3, -19, 0.2)
for k, tb in enumerate([c('dont') + 0.1, c('chase') + 0.2, c('prey') + 0.3, c('miles') + 0.1]): place(fx, rec('1839', 0.8, 1.0, 0.003, 0.05), tb, -21, 0.4 - 0.25 * k)
# 4) the wait, the wiggle, the explosion into a sprint after a squeaking mouse
grass(c('then') - 0.05, -24, 0.0, 1); place(fx, rec('1796', 0.0, 1.0, 0.01, 0.1), c('explode') - 0.3, -15)
place(fx, rec('1844', 0.0, 2.7, 0.01, 0.2), c('explode'), -11, -0.2); place(fx, rec('0459', 0.48, 0.8, 0.005, 0.06), c('wait') + 0.3, -21, -0.3); place(fx, rec('0459', 2.1, 2.4, 0.005, 0.06), c('seconds') + 0.1, -19, -0.4)
# 5) it flops down in the grass, spent
place(fx, rec('1839', 0.75, 1.1, 0.005, 0.1), c('and', 1) + 0.25, -17, 0.0); grass(c('burns') + 0.1, -24, 0.0, 2)
# 7) night: a tawny owl outside, the clock ticking
place(fx, rec('1763', 0.15, 0.85, 0.02, 0.15), c('really') + 0.05, -16, -0.5); place(fx, rec('2816', 0.0, 2.3, 0.02, 0.2), c('theyre') + 0.05, -24, 0.4)
# 8) dawn and dusk: a rooster at dawn, evening birds at dusk
place(fx, rec('0283', 0.2, 2.05, 0.02, 0.3), c('dawn') - 0.15, -17, -0.3); place(fx, rec('1859', 60.0, 62.0, 0.2, 0.4), c('dusk') - 0.2, -18, 0.3)
# 9) mice in the grass
for k, tm in enumerate([c('when') + 0.2, c('mice') + 0.35, c('active') + 0.2]): place(fx, rec('0459', [0.48, 2.1, 3.55][k], [0.8, 2.4, 3.85][k], 0.005, 0.06), tm, -20, [0.3, -0.2, 0.1][k]); grass(c('mice') - 0.1, -25, 0.3, 3)
# 10) the zoomies: paws drumming across the bed and the floor
t = c('thats') + 0.05; k = 0
while t < c('most', 1) - 0.3: place(fx, rec('1104', [0.35, 1.4, 2.6, 4.55, 5.1, 5.9][k % 6] - 0.02, [0.35, 1.4, 2.6, 4.55, 5.1, 5.9][k % 6] + 0.2, 0.005, 0.06), t, -18, 0.3 * math.sin(k)); t += 0.13; k += 1
place(fx, rec('1515', 11.55, 11.75, 0.003, 0.05), c('zoomies') + 0.2, -16, 0.3); place(fx, rec('1515', 19.05, 19.25, 0.003, 0.05), c('sunrise') + 0.1, -16, -0.3)
# 12) the ears: a fly buzzing on one side, then a click on the other
place(fx, rec('0822', 3.7, 5.2, 0.15, 0.3), c('turning') - 0.3, -20, -0.6)
place(fx, rec('0321', 0.2, 0.32, 0.002, 0.04), c('sound') - 0.05, -16, 0.6)
# ---------------- music ----------------
BAR = DUR / 16
def note(m): return 440 * 2 ** ((m - 69) / 12)
def pizz(f, dur=0.32, bright=1.0):
    n = int(dur * SR); tt = np.arange(n) / SR
    return (np.sin(2 * np.pi * f * tt) + 0.55 * bright * np.sin(4 * np.pi * f * tt) * np.exp(-tt * 14) + 0.3 * bright * np.sin(6 * np.pi * f * tt) * np.exp(-tt * 22)) * np.exp(-tt * 11) * np.minimum(1, tt / 0.003)
def marimba(f, dur=0.5):
    n = int(dur * SR); tt = np.arange(n) / SR; return (np.sin(2 * np.pi * f * tt) + 0.35 * np.sin(2 * np.pi * f * 4.0 * tt) * np.exp(-tt * 30)) * np.exp(-tt * 7) * np.minimum(1, tt / 0.002)
def celesta(f, dur=0.9):
    n = int(dur * SR); tt = np.arange(n) / SR; return (np.sin(2 * np.pi * f * tt) + 0.4 * np.sin(2 * np.pi * f * 2 * tt) * np.exp(-tt * 6) + 0.15 * np.sin(2 * np.pi * f * 3.01 * tt) * np.exp(-tt * 9)) * np.exp(-tt * 3.2) * np.minimum(1, tt / 0.002)
def shaker():
    n = int(0.05 * SR); tt = np.arange(n) / SR; return hp(rng.standard_normal(n), 6500) * np.exp(-tt * 80)
def pad(chord, dur, bright=1.0):
    n = int(dur * SR); tt = np.arange(n) / SR; x = np.zeros(n)
    for m in chord: x += sum(np.sin(2 * np.pi * note(m + 12) * h * tt + rng.random() * 6) / h ** 1.7 for h in range(1, 5))
    return lp(x, 1400 * bright) * env_adsr(n, 0.2, 0.2, 0.85, 0.25)
LUL = [[53, 57, 60], [57, 60, 64], [50, 53, 57], [48, 52, 55]]   # F Am Dm C (a lullaby)
SNEAK = [[50, 53, 57], [49, 52, 56], [50, 53, 57], [45, 49, 52]]
def style(t):
    if t < c('cats'): return 'lull'
    if t < c('explode'): return 'sneak'
    if t < c('and', 1): return 'bright'
    if t < c('theyre', 1): return 'lull'
    if t < c('thats'): return 'sneak'
    if t < c('most', 1): return 'bright'
    return 'lull'
music = np.zeros((2, N))
for b in range(16):
    t0 = b * BAR
    for k in range(8):
        ts = t0 + k * BAR / 8; st = style(ts + 0.01)
        if st == 'lull':
            ch = LUL[b % 4]
            if k in (0, 3, 6): place(music, celesta(note(ch[[2, 1, 0][k // 3]] + 24), 1.1) * 0.16, ts, 0, 0.2)
            if k == 0: place(music, pad(ch, BAR, 0.6) * 0.06, ts)
            if k in (0, 4): place(music, pizz(note(ch[0] - 12), 0.6, 0.3) * 0.3, ts)
        elif st == 'sneak':
            ch = SNEAK[b % 4]
            if k % 2 == 0: place(music, pizz(note(ch[0] - 12), 0.3, 0.5) * 0.42, ts)
            if k in (3, 7): place(music, pizz(note(ch[2]), 0.18, 0.9) * 0.18, ts, 0, 0.3)
            if k == 0: place(music, pad(ch, BAR, 0.5) * 0.045, ts)
        else:
            ch = LUL[b % 4]
            place(music, marimba(note(ch[[0, 1, 2, 1, 0, 2, 1, 2][k]] + 12), 0.4) * 0.2, ts, 0, -0.3 if k % 2 else 0.3)
            if k in (0, 4): place(music, pizz(note(ch[0] - 12), 0.4, 0.6) * 0.42, ts)
            if k % 2 == 1: place(music, shaker() * 0.2, ts, 0, 0.5)
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
# effects sit about 7 dB under the voice (by peak-normalized clip gain above), ambiences lower still
fx_ref = rms_db(fx[0][np.abs(fx[0]) > 1e-3]); fx *= db(v_rms - fx_ref - 7.0)
amb *= db(v_rms - fx_ref - 7.0)
fx *= db(-2.5 * np.clip(duck, 0, 1))

mix = voice + music + fx + amb
mix /= np.max(np.abs(mix)) * 1.05     # no fade at the end: the last sample flows into the first on loop
sf.write(out_path, mix.T, SR, subtype='PCM_24')
for name, x in (('voice', voice), ('music', music), ('fx', fx + amb)): sf.write(f"{stems_dir}/{name}.wav", (x / (np.max(np.abs(x)) + 1e-9) * 0.9).T, SR, subtype='PCM_24')
print('mix written', mix.shape, 'voice rms', round(v_rms, 1), 'bar', round(BAR, 4), 'bpm', round(240 / BAR, 2))
