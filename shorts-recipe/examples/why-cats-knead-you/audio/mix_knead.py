"""Music + real sound effects + voiceover for "Why Cats Knead You".
Every sound effect is a real recording from BigSoundBank (CC0, public domain): real purring (three different cats), real kittens
mewing, a real cat's chirp, fabric being rubbed for the kneading paws, cloth, water poured and a drip, and whooshes. Only the
music is synthesized (16 bars across the video, so the loop lands on the downbeat).
usage: mix_knead.py vo.wav sounds_dir events.py out.wav stems_dir"""
import sys, json, importlib.util, numpy as np, soundfile as sf
from scipy import signal

SR = 48000
DUR = 988 / 30
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
RATE = 1.35
def presses(a, b, rate=RATE):
    T = []
    for n in range(int(a * rate) - 1, int(b * rate) + 2):
        for o in (0.75, 0.25):
            t = (n + o) / rate
            if a <= t <= b: T.append(t)
    return sorted(T)
lap = [(0, c('its')), (c('so') - 0.05, c('kittens', 1)), (c('kneading') - 0.1, END)]          # the cat on your lap, purring
sun = [(c('when') - 0.05, c('so'))]                                                           # in the sunbeam
nurse = [(c('newborn') - 0.05, c('most')), (c('kittens', 1) - 0.05, c('so', 1))]              # the nursery
purr = loop_bed('0981', 12.0, -23); momp = loop_bed('1010', 25.0, -21)
place(amb, purr * gate(lap + sun), 0.0); place(amb, momp * gate(nurse), 0.0)
place(amb, loop_bed('1010', 50.0, -19) * gate([(c('purring') - 0.1, c('they', 2))]), 0.0)     # louder on "purring"
# kneading: a soft fabric rub on every press (real fabric being rubbed)
rubs = [(0.25, 0.55), (1.35, 1.65), (3.45, 3.75), (4.45, 4.75), (7.05, 7.35), (7.85, 8.15)]
def knead_rubs(a, b, gain=-25):
    for i, tt in enumerate(presses(a, b)): r0, r1 = rubs[i % len(rubs)]; place(fx, rec('1104', r0, r1, 0.01, 0.08), tt - 0.03, gain, -0.25 if i % 2 else 0.25)
knead_rubs(0.0, c('its')); knead_rubs(c('when'), c('they', 2), -27); knead_rubs(c('so'), c('youve'), -24); knead_rubs(c('kneading'), END)
# 1) rewind into a kitten: a whoosh, then a tiny mew
place(fx, rec('1796', 0.0, 1.0, 0.01, 0.1), c('first') - 0.3, -12); place(fx, rec('0098', 0.05, 0.5, 0.01, 0.06), c('learned') + 0.35, -13, 0.1)
# 2-3) the nursery: kittens squeak while they nurse; milk pours into the bottle
place(fx, rec('0390', 2.3, 2.8, 0.01, 0.06), c('newborn') + 0.35, -16, -0.2); place(fx, rec('0372', 1.25, 1.7, 0.01, 0.06), c('belly') + 0.1, -18, 0.25)
place(fx, rec('1156', 0.4, 2.2, 0.05, 0.3), c('pressing') - 0.05, -19, 0.3); place(fx, rec('0390', 4.25, 4.7, 0.01, 0.06), c('flow') + 0.1, -17, -0.2)
# 4) it grows up in one bounce: a whoosh and a grown-up chirp
place(fx, rec('1795', 0.0, 0.91, 0.01, 0.1), c('grow') - 0.15, -13); place(fx, rec('1899', 0.0, 0.5, 0.005, 0.05), c('it', 1) + 0.4, -11)
# 6) the ghost of the kitten: a faint mew
place(fx, rec('0098', 1.05, 1.5, 0.01, 0.08), c('kitten') + 0.15, -19, -0.3)
# 7) a drop of drool
place(fx, rec('1384', 0.05, 0.45, 0.002, 0.08), c('drool') + 0.3, -11, 0.0)
# 10) claimed: a pleased chirp
place(fx, rec('1899', 0.0, 0.5, 0.005, 0.05), c('claimed') + 0.2, -9, 0.0)
# 11) the claws catch the blanket
for k, tt in enumerate((c('claws') + 0.12, c('claws') + 0.5)): place(fx, rec('0013', 0.05, 0.22, 0.003, 0.05), tt, -15, 0.15 * (1 - 2 * k))
# 12-13) kittens mew; mom fluffs up
place(fx, rec('0390', 5.75, 6.2, 0.01, 0.06), c('kittens', 1) + 0.35, -16, 0.2); place(fx, rec('0372', 4.55, 5.0, 0.01, 0.06), c('too') + 0.15, -17, -0.2)
place(fx, rec('1104', 3.4, 3.95, 0.03, 0.15), c('mom') + 0.05, -20, 0.0)
# 14) a chirp, the hop, the landing on the blanket
place(fx, rec('1899', 0.0, 0.5, 0.005, 0.05), c('climbs') - 0.25, -11, -0.3); place(fx, rec('0013', 0.05, 0.3, 0.005, 0.08), c('climbs') + 0.33, -12, 0.0)

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
def snap():
    n = int(0.06 * SR); tt = np.arange(n) / SR; return bp(rng.standard_normal(n), 1800, 4500) * np.exp(-tt * 70)
def pad(chord, dur, bright=1.0):
    n = int(dur * SR); tt = np.arange(n) / SR; x = np.zeros(n)
    for m in chord: x += sum(np.sin(2 * np.pi * note(m + 12) * h * tt + rng.random() * 6) / h ** 1.7 for h in range(1, 5))
    return lp(x, 1400 * bright) * env_adsr(n, 0.2, 0.2, 0.85, 0.25)
F = [[53, 57, 60], [50, 53, 57], [46, 50, 53], [48, 52, 55]]     # F  Dm  Bb  C   (warm, a bit playful)
SAD = [[50, 53, 57], [46, 50, 53], [43, 46, 50], [45, 49, 52]]   # Dm Bb  Gm  A
def style(t):
    if t < c('its'): return 'warm'
    if t < c('newborn'): return 'tip'
    if t < c('most'): return 'lull'
    if t < c('when'): return 'bright'
    if t < c('they', 2): return 'warm'
    if t < c('so'): return 'lab'
    if t < c('and', 3): return 'bright'
    if t < c('kittens', 1): return 'stop'     # "And the claws?": a beat of silence
    if t < c('so', 1): return 'tip'
    return 'warm'
music = np.zeros((2, N))
for b in range(16):
    t0 = b * BAR
    for k in range(8):
        ts = t0 + k * BAR / 8; st = style(ts + 0.01)
        ch = (SAD if st in ('sad',) else F)[b % 4]
        if st in ('stop', 'hush'): continue
        if st == 'lull':
            if k in (0, 3, 6): place(music, celesta(note(ch[[2, 1, 0][k // 3]] + 24), 0.9) * 0.14, ts, 0, 0.2)
            if k == 0: place(music, pad(ch, BAR, 0.6) * 0.045, ts)
            continue
        if st == 'tense':
            ch = SAD[b % 4]
            if k in (0, 3, 6): place(music, pizz(note(ch[0] - 12), 0.4, 0.5) * 0.42, ts)
            if k == 0: place(music, pad(ch, BAR, 0.5) * 0.05, ts)
            if k == 5: place(music, celesta(note(ch[2] + 24), 0.7) * 0.08, ts, 0, 0.3)
            continue
        if st == 'tip':
            if k % 2 == 0: place(music, pizz(note(ch[[0, 2, 1, 2][k // 2]] - 12), 0.34, 0.8) * 0.5, ts)
            else: place(music, (pizz(note(ch[1] + 12), 0.16) + pizz(note(ch[2] + 12), 0.16)) * 0.13, ts, 0, 0.3)
            if k in (2, 6): place(music, snap() * 0.3, ts, 0, -0.3)
        elif st == 'sad':
            if k in (0, 3, 6): place(music, celesta(note(ch[[2, 1, 0][k // 3]] + 24), 0.9) * 0.16, ts, 0, -0.2)
            if k == 0: place(music, pad(ch, BAR, 0.7) * 0.05, ts)
        elif st == 'warm':
            if k in (0, 2, 4, 6): place(music, celesta(note(ch[[0, 1, 2, 1][k // 2]] + 24), 0.8) * 0.15, ts, 0, 0.2)
            if k == 0: place(music, pad(ch, BAR) * 0.06, ts)
        elif st in ('bright', 'sly'):
            place(music, marimba(note(ch[[0, 1, 2, 1, 0, 2, 1, 2][k]] + 12), 0.4) * (0.2 if st == 'bright' else 0.14), ts, 0, -0.3 if k % 2 else 0.3)
            if k in (0, 4): place(music, pizz(note(ch[0] - 12), 0.4, 0.6) * 0.42, ts)
            if k % 2 == 1: place(music, shaker() * 0.2, ts, 0, 0.5)
        elif st == 'lab':
            place(music, marimba(note(ch[0] + (12 if k % 2 else 0)), 0.3) * 0.16, ts, 0, -0.2 if k % 2 else 0.2)
            if k == 0: place(music, pad(ch, BAR, 0.6) * 0.045, ts)
        elif st == 'tick':
            if k in (0, 4): place(music, pizz(note(ch[0] - 12), 0.3, 0.5) * 0.35, ts)
            if k == 7: place(music, pizz(note(ch[2]), 0.16) * 0.15, ts, 0, 0.3)
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
