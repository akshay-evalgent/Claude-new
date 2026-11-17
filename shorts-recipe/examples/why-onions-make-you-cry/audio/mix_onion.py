"""Music + real sound effects + voiceover for "Why Onions Make You Cry".
Every sound effect is a real recording from BigSoundBank (CC0, public domain): a knife chopping vegetables on a
wooden board (one hit per chop on screen), sniffs, bubbles for the bursting cells, a knife blade, a real mouse and a
crunch for its bite, the fridge door and its hum, and birds outside the kitchen window. Only the music is synthesized
(16 bars across the video, so the loop lands on the downbeat).
usage: mix_onion.py vo.wav sounds_dir events.py out.wav stems_dir"""
import sys, math, json, importlib.util, numpy as np, soundfile as sf
from scipy import signal

SR = 48000
DUR = 1074 / 30
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

CHOP = 2.1
kitchen = [(0, c('inside') + 0.1), (c('that') - 0.1, c('and', 1) + 0.1), (c('so') - 0.1, c('in') + 0.1), (c('and', 2) - 0.1, c('and', 3) + 0.1), (c('so', 1) - 0.1, END)]
place(amb, loop_bed('1859', 80.0, -34) * gate(kitchen, 0.2), 0.0)
PK = [0.24, 0.88, 1.45, 1.96, 2.47, 2.92, 3.39, 3.87, 4.35, 4.83, 5.28, 5.74]
def chops(a, b, g=-14, pan=0.15):
    k0 = math.ceil(a * CHOP)
    for k in range(k0, int(b * CHOP) + 1):
        t = k / CHOP; p = PK[k % len(PK)]; x = rec('2070', p - 0.03, p + 0.22, 0.003, 0.08)
        if t >= 0: place(fx, x, t, g + 1.5 * math.sin(k * 1.3), pan)
# 0 + 12) chopping, sniffing (the chops line up across the loop point, so the rhythm doesn't skip)
chops(0.0, c('inside') - 0.05); chops(c('so', 1) - 0.05, END - 0.01)
for ts in [1.9, END - 0.8]: place(fx, rec('0784', 0.05, 0.6, 0.01, 0.1), ts, -15, -0.1)
# 1-3) inside the cells: the blade swishes through, cells pop, the contents bubble into gas
place(fx, rec('2575', 0.2, 1.0, 0.01, 0.15), c('knife') - 0.05, -13, 0.0)
for k in range(9): place(fx, rec('0183', [0.91, 2.19, 2.53, 3.14, 3.96, 4.54, 5.64, 6.37, 7.11][k] - 0.03, [0.91, 2.19, 2.53, 3.14, 3.96, 4.54, 5.64, 6.37, 7.11][k] + 0.25, 0.005, 0.06), c('breaks') + 0.07 * k, -19, -0.6 + 0.15 * k)
for k in range(6): place(fx, rec('0183', [7.49, 7.79, 8.11, 6.71, 5.64, 4.54][k] - 0.03, [7.49, 7.79, 8.11, 6.71, 5.64, 4.54][k] + 0.25, 0.005, 0.06), c('turns') + 0.2 * k, -21, 0.3 - 0.12 * k)
# 4) the gas reaches your eyes: a slow chop, a sniff
chops(c('that'), c('and', 1)); place(fx, rec('1095', 0.2, 0.75, 0.01, 0.1), c('eyes') + 0.1, -17, 0.0)
# 6) tears: sniffs
place(fx, rec('0784', 1.5, 2.05, 0.01, 0.1), c('flood') - 0.05, -14, 0.0); place(fx, rec('1095', 1.05, 1.6, 0.01, 0.1), c('out') + 0.1, -15, 0.1)
# 7) the mouse bites the onion: a crunch, a squeak
place(fx, rec('1598', 0.25, 0.6, 0.003, 0.08), c('hungry') - 0.05, -13, 0.2); place(fx, rec('0459', 0.48, 0.8, 0.005, 0.06), c('animals') - 0.05, -15, 0.3)
# 9) the tear-free onion: chopping, no sniffs
chops(c('and', 2), c('cold') - 0.05, -15)
# 10) the fridge door opens; the hum
place(fx, rec('1158', 2.3, 3.6, 0.02, 0.3), c('cold') - 0.25, -13, -0.3); place(fx, lp(rec('1157', 2.0, 4.0, 0.2, 0.4), 900), c('cold'), -20, -0.2)
# 11) a dull blade crushes, a sharp one slices
place(fx, rec('1598', 0.25, 0.65, 0.003, 0.08), c('crushes') - 0.1, -14, -0.2); place(fx, rec('2574', 0.15, 0.8, 0.003, 0.15), c('sharp') + 0.05, -14, 0.2)
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
def pad(chord, dur, bright=1.0):
    n = int(dur * SR); tt = np.arange(n) / SR; x = np.zeros(n)
    for m in chord: x += sum(np.sin(2 * np.pi * note(m + 12) * h * tt + rng.random() * 6) / h ** 1.7 for h in range(1, 5))
    return lp(x, 1400 * bright) * env_adsr(n, 0.2, 0.2, 0.85, 0.25)
SAD = [[50, 53, 57], [46, 50, 53], [43, 46, 50], [45, 49, 52]]   # Dm Bb Gm A (mock-tragic)
F = [[53, 57, 60], [50, 53, 57], [46, 50, 53], [48, 52, 55]]
def style(t):
    if t < c('inside'): return 'sad'
    if t < c('that'): return 'lab'
    if t < c('its'): return 'sad'
    if t < c('and', 2): return 'lab'
    if t < c('so', 1): return 'warm'
    return 'sad'
music = np.zeros((2, N))
for b in range(16):
    t0 = b * BAR
    for k in range(8):
        ts = t0 + k * BAR / 8; st = style(ts + 0.01)
        if st == 'sad':
            ch = SAD[b % 4]
            if k in (0, 3, 6): place(music, celesta(note(ch[[2, 1, 0][k // 3]] + 24), 0.9) * 0.16, ts, 0, -0.2)
            if k in (0, 4): place(music, pizz(note(ch[0] - 12), 0.45, 0.5) * 0.42, ts)
            if k == 0: place(music, pad(ch, BAR, 0.7) * 0.05, ts)
        elif st == 'lab':
            ch = F[b % 4]; place(music, marimba(note(ch[0] + (12 if k % 2 else 0)), 0.3) * 0.16, ts, 0, -0.2 if k % 2 else 0.2)
            if k == 0: place(music, pad(ch, BAR, 0.6) * 0.045, ts)
        else:
            ch = F[b % 4]
            if k in (0, 2, 4, 6): place(music, celesta(note(ch[[0, 1, 2, 1][k // 2]] + 24), 0.8) * 0.15, ts, 0, 0.2)
            if k in (0, 4): place(music, pizz(note(ch[0] - 12), 0.4, 0.6) * 0.38, ts)
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
# effects sit about 7 dB under the voice (by peak-normalized clip gain above), ambiences lower still
fx_ref = rms_db(fx[0][np.abs(fx[0]) > 1e-3]); fx *= db(v_rms - fx_ref - 7.0)
amb *= db(v_rms - fx_ref - 7.0)
fx *= db(-2.5 * np.clip(duck, 0, 1))

mix = voice + music + fx + amb
mix /= np.max(np.abs(mix)) * 1.05     # no fade at the end: the last sample flows into the first on loop
sf.write(out_path, mix.T, SR, subtype='PCM_24')
for name, x in (('voice', voice), ('music', music), ('fx', fx + amb)): sf.write(f"{stems_dir}/{name}.wav", (x / (np.max(np.abs(x)) + 1e-9) * 0.9).T, SR, subtype='PCM_24')
print('mix written', mix.shape, 'voice rms', round(v_rms, 1), 'bar', round(BAR, 4), 'bpm', round(240 / BAR, 2))
