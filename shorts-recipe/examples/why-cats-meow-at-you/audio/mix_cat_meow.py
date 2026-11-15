"""Music + real sound effects + voiceover for "Why Cats Meow At You".
Every sound effect is a real recording from BigSoundBank (CC0, public domain): real meows, a real
3-week-old kitten, real purrs, a real door, kibble, clock, baby, birds and crickets. Only the music is
synthesized (16 bars across the video, so the loop lands on the downbeat).
usage: mix_meow.py vo.wav sounds_dir events.py out.wav stems_dir"""
import sys, json, importlib.util, numpy as np, soundfile as sf
from scipy import signal

SR = 48000
DUR = 954 / 30
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
# the meows, mews and chirps (same table that drives the animated mouths)
for name, i, s0, s1, t, g, who in EVM.EVENTS:
    if name == 'cry_hidden': continue
    place(fx, rec(i, s0, s1, 0.002, 0.04), t, g, {'kit': -0.1, 'mom': 0.2}.get(who, 0.0))
# 0-1.36 / 30.66-31.8: dawn birdsong, laid across the loop point so it never jumps
birds = rec('0999', 40.0, 42.6, 0.01, 0.01)
split = int((DUR - 30.66) * SR)
place(amb, birds[:split], 30.66, -27, 0.3); place(amb, birds[split:split + int(1.36 * SR)], 0.0, -27, 0.3)
# garden: crickets
place(amb, rec('1020', 2.0, 4.4, 0.02, 0.06), 1.36, -24, -0.2); place(amb, rec('1020', 8.0, 11.1, 0.06, 0.08), 9.46, -24, -0.2)
# kitten nest: a faint night insect through the window
place(amb, rec('0426', 3.0, 7.6, 0.2, 0.15), 3.58, -36, 0.4)
# 3) the mother's paws on the floor (real soft steps, quickened)
for k, tt in enumerate([6.28, 6.46, 6.62, 6.78, 6.92, 7.06]): place(fx, rec('0373', 0.08 + 0.75 * (k % 3), 0.3 + 0.75 * (k % 3), 0.002, 0.05, rate=1.35), tt, -19 - k * 0.5, 0.1)
# 3) purr as she curls up with the kitten
place(fx, rec('0436', 0.5, 1.2, 0.15, 0.25), 7.55, -15, 0.1)
# 4) grow up: a soft whoosh
place(fx, rec('1796', 0.0, 1.04, 0.01, 0.15), 8.05, -14)
# 5) cheek rub along the post (fur on wood)
place(fx, rec('1104', 1.35, 2.15, 0.03, 0.12), 9.6, -13, 0.2)
# 8) the bag tips, the kibble rattles into the bowl
place(fx, rec('1431', 1.1, 1.6, 0.01, 0.1), 13.62, -18, 0.3); place(fx, rec('2071', 0.55, 1.75, 0.01, 0.2), 13.84, -9, 0.15)
# 10) tuning the radio
place(fx, rec('2617', 0.0, 1.15, 0.03, 0.2), 16.98, -12, -0.2)
# 11) whip into the lab
place(fx, rec('1795', 0.0, 0.91, 0.01, 0.1), 17.88, -13)
# 11-14) the purr, from the lab to the bedroom (one long real purr), with the hidden cry inside it
purr = rec('0981', 10.0, 18.6, 0.2, 0.3)
place(fx, purr, 18.0, -10)
ch = [e for e in EVM.EVENTS if e[0] == 'cry_hidden'][0]
place(fx, lp(rec(ch[1], ch[2], ch[3], 0.04, 0.1), 1400), ch[4], -22)
# 13) a real baby crying, matched to the screen
place(fx, rec('0881', 0.15, 1.75, 0.02, 0.25), 22.38, -15, -0.15)
# 14) pillow pressed, pillow pulled off, a sigh
place(fx, rec('0013', 0.4, 0.62, 0.01, 0.06), 23.86, -17); place(fx, rec('0013', 0.75, 1.02, 0.01, 0.08), 25.3, -15, 0.2)
place(fx, rec('1405', 1.85, 3.2, 0.02, 0.4), 25.62, -15)
# 15) door handle and the door swinging open
place(fx, rec('1702', 0.0, 2.2, 0.002, 0.5), 26.78, -14, -0.2)
# 16) typing, then the laptop snaps shut
place(fx, rec('1726', 0.1, 0.8, 0.01, 0.08), 27.45, -18, 0.2); place(fx, lp(rec('0053', 3.66, 4.0, 0.002, 0.08), 3500), 28.5, -17, 0.2)
# 17) the alarm clock ticking
place(fx, rec('1372', 0.0, 1.3, 0.005, 0.08), 29.42, -14, 0.25)
# 18) the bowl lands on the duvet: a soft cloth thump and a ceramic knock
place(fx, rec('0013', 0.05, 0.2, 0.002, 0.05), 31.06, -12); place(fx, lp(rec('0246', 0.0, 0.18, 0.001, 0.06), 2500), 31.07, -21)

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
W = json.load(open(ev_path.replace('events.py', 'words.json')))
C = {}
for w in W:
    k = ''.join(ch for ch in w['w'].lower() if ch.isalpha())
    C.setdefault(k, []).append(w['s'])
def c(k, i=0): return C[k][i]
def style(t):
    if t < c('but'): return 'tip'
    if t < c('kittens'): return 'hush'          # "but almost never at other cats": the music drops out, crickets only
    if t < c('so'): return 'sad'
    if t < c('adult'): return 'warm'
    if t < c('except'): return 'bright'
    if t < c('humans'): return 'stop'           # "Except with us." lands on a real meow, in silence
    if t < c('and', 2): return 'sly'
    if t < c('in'): return 'stop'               # the radio sweep
    if t < c('and', 3): return 'lab'
    if t < c('every'): return 'tip'
    if t < c('so', 2): return 'bright'
    return 'tick'
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
