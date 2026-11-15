"""Music + real sound effects + voiceover for "Why Dogs Tilt Their Heads".
Every sound effect is a real recording from BigSoundBank (CC0, public domain): real dog whines, a
bark, panting, squeaky toys, a quacking duck toy, a phone shutter, keys, a bell, page flips and birds. Only the music is
synthesized (16 bars across the video, so the loop lands on the downbeat).
usage: mix_meow.py vo.wav sounds_dir events.py out.wav stems_dir"""
import sys, json, importlib.util, numpy as np, soundfile as sf
from scipy import signal

SR = 48000
DUR = 975 / 30
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
whine = lambda: rec('1546', 12.70, 13.12, 0.01, 0.06)
# evening birds through the window, laid across the loop point so nothing jumps
birds = rec('1859', 60.0, 63.3, 0.01, 0.01); tail = DUR - c('when', 1); split = int(tail * SR)
place(amb, birds[:split], c('when', 1), -30, 0.3); place(amb, birds[split:split + int(c('and') * SR)], 0.0, -30, 0.3)
# 0) the tilt after "who wants a walk?": a curious whine and the tag
place(fx, whine(), 0.24, -9, 0.0); place(fx, rec('0445', 2.62, 2.85, 0.002, 0.06), 0.14, -20, 0.1)
# 1) the phone: two shutter clicks
for tt in (c('not') + 0.02, c('look') + 0.02): place(fx, rec('0448', 0.1, 0.62, 0.002, 0.05), tt - 0.02, -11, 0.2)
# 2) whip into the study
place(fx, rec('1795', 0.0, 0.91, 0.01, 0.1), c('in') - 0.18, -13)
# 3) a squeak for every name tag (real squeaky toys; a quacking duck for DUCK)
sq = [('0364', 0.05, 0.42), ('3332', 0.0, 0.3), ('3335', 0.0, 0.33), ('3337', 0.0, 0.2), ('3338', 0.0, 0.22), ('3331', 0.02, 0.3), ('3334', 0.0, 0.3)]
for i, (rid, a0, a1) in enumerate(sq): place(fx, rec(rid, a0, a1, 0.002, 0.04), c('dogs') + 0.12 + i * 0.29, -14, -0.4 + 0.13 * i)
# 4) the big tilt
place(fx, rec('1546', 12.70, 13.12, 0.01, 0.06, rate=1.06), c('tilted') + 0.15, -10)
# 5) her question, then the tilt
place(fx, rec('1544', 1.38, 1.66, 0.01, 0.06), c('said') + 0.18, -9)
# 6) the ordinary dog: a little sniff while the music stops
place(fx, rec('1547', 2.0, 2.45, 0.02, 0.1), c('did') - 0.05, -14)
# 8) flipping through memories, then the match
place(fx, rec('0362', 0.1, 1.15, 0.01, 0.15), c('matching') + 0.15, -16, 0.2); place(fx, rec('0479', 0.0, 1.0, 0.002, 0.3), c('toy') - 0.05, -12, 0.2)
# 11) three tilts, three tag jingles
for tt in (c('and', 2) + 0.2, c('each') + 0.1, c('favorite') + 0.1): place(fx, rec('0445', 2.62, 2.85, 0.002, 0.06), tt, -17, 0.1)
# 12) the paw lands in her hand
place(fx, rec('0013', 0.05, 0.2, 0.002, 0.05), c('left') + 0.18, -18)
# 13) the leash comes off the hook (keys jingle), the dog jumps up with a bark and pants
place(fx, rec('0445', 2.55, 3.45, 0.005, 0.15), c('watch') + 0.1, -13, -0.2); place(fx, rec('2954', 0.05, 0.42, 0.002, 0.08), c('watch') + 0.62, -9)
place(fx, rec('1547', 4.0, 5.2, 0.05, 0.25), c('watch') + 0.85, -17)
# 14) "...walk?": the ears go up with a jingle of the tag
place(fx, rec('0445', 2.62, 2.85, 0.002, 0.06), c('walk') + 0.05, -19, 0.1)

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
    if t < c('in'): return 'tip'
    if t < c('ordinary'): return 'bright'
    if t < c('so'): return 'stop'               # "Ordinary dogs barely did it at all." in silence
    if t < c('another'): return 'warm'
    if t < c('and', 2): return 'tip'
    if t < c('so', 1): return 'bright'
    if t < c('when', 1): return 'sly'
    return 'tip'
music = np.zeros((2, N))
for b in range(16):
    t0 = b * BAR
    for k in range(8):
        ts = t0 + k * BAR / 8; st = style(ts + 0.01)
        ch = (SAD if st == 'sad' else F)[b % 4]
        if st in ('stop', 'hush'): continue
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
