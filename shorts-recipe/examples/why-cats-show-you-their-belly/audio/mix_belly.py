"""Music + real sound effects + voiceover for "Why Cats Show You Their Belly".
Every sound effect is a real recording from BigSoundBank (CC0, public domain): real purring (two cats), real growls
and an angry yowl, a chirp, a real heartbeat for the x-ray, a body falling for the flop, fabric and cloth for the
rolling, grabbing and kicking, skin rubbing for the chin scratch, and birds outside. Only the music is synthesized
(16 bars across the video, so the loop lands on the downbeat).
usage: mix_belly.py vo.wav sounds_dir events.py out.wav stems_dir"""
import sys, json, importlib.util, numpy as np, soundfile as sf
from scipy import signal

SR = 48000
DUR = 1020 / 30
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

# birds outside: a quiet bed under everything, continuous across the loop
place(amb, loop_bed('1859', 40.0, -34), 0.0)
# purring whenever the cat is relaxed (it runs straight across the loop point)
calm = [(0, c('its', 1) + 0.2), (c('its', 2) - 0.1, c('the') + 0.15), (c('so', 1) - 0.05, END)]
place(amb, loop_bed('0981', 31.0, -27) * gate(calm, 0.25), 0.0)
def rustle(t, g=-20, pan=0.0, k=0):
    s0 = [0.35, 1.4, 2.6, 4.55, 5.1, 5.9, 6.4][k % 7]; place(fx, rec('1104', s0 - 0.03, s0 + 0.42, 0.01, 0.1), t, g, pan)
# 0) the roll onto its back, on the rug
rustle(0.15, -19, 0.1, 0); rustle(0.75, -21, -0.1, 1)
# 1) your hand comes near: a fabric whisper, the tail tip flicks
rustle(c('asking') + 0.1, -26, 0.3, 2)
# 2) it feels safe: a louder purr up close, a happy chirp
place(fx, rec('1010', 30.0, 32.3, 0.2, 0.4), c('its', 2) - 0.1, -16, 0.0)
# 3-4) the x-ray: a real heartbeat
place(fx, rec('1796', 0.0, 1.0, 0.01, 0.1), c('the') - 0.35, -15)
place(fx, rec('0218', 0.0, 4.6, 0.05, 0.3), c('the') + 0.1, -13, 0.0)
# 5) the visitor; then the flop next to you
place(fx, rec('2453', 0.1, 0.7, 0.005, 0.1), c('trusts') + 0.0, -16, 0.1); rustle(c('trusts') + 0.12, -20, 0.1, 3)
# 6) touch it: the hand lands, then a growl
place(fx, rec('0013', 0.42, 0.62, 0.005, 0.05), c('touch') + 0.08, -18, 0.2)
place(fx, rec('1885', 0.15, 1.5, 0.02, 0.15), c('it', 3) + 0.05, -11, 0.0); place(fx, rec('1795', 0.0, 0.91, 0.01, 0.1), c('reflex') - 0.3, -17)
# 7) the front paws grab: cloth, and the growl carries on
place(fx, rec('0013', 2.2, 2.6, 0.005, 0.08), c('grab') - 0.05, -14, 0.0); place(fx, rec('1886', 0.2, 1.4, 0.02, 0.15), c('front'), -15, 0.0)
# 8) the claws come out: cloth catching
place(fx, rec('0013', 0.8, 0.95, 0.003, 0.04), c('claws') + 0.05, -14, 0.1); place(fx, rec('0013', 0.45, 0.6, 0.003, 0.04), c('come') + 0.05, -15, -0.1)
# 9) the bunny kicks: rapid scuffs against your arm, a low growl
k = 0; t = c('back') - 0.05
while t < c('on') - 0.1: rustle(t, -16 + (2 if k % 2 else 0), 0.25 if k % 2 else -0.25, k); t += 1 / 5.2; k += 1
place(fx, rec('1887', 0.3, 2.4, 0.05, 0.25), c('and', 2) + 0.1, -16, 0.0)
# 10) four paws, and a hiss-yowl at "fight"
place(fx, rec('1882', 0.1, 0.85, 0.01, 0.12), c('fight') - 0.05, -10, 0.0); place(fx, rec('1884', 0.05, 0.8, 0.01, 0.12), c('once') - 0.1, -15, 0.1)
# 12) it's a compliment: a happy chirp
place(fx, rec('1899', 0.0, 0.5, 0.005, 0.06), c('compliment') + 0.1, -13, 0.0)
# 13) the chin scratch: fingers in fur
t = c('chin') - 0.15
while t < c('and', 3) - 0.1: place(fx, rec('0663', 0.6, 1.0, 0.04, 0.1), t, -21, 0.15); t += 0.36
place(fx, rec('1010', 40.0, 42.4, 0.2, 0.4), c('chin'), -17, 0.0)
# 14) it flops over in front of you again
place(fx, rec('2452', 0.08, 0.4, 0.005, 0.1), c('flops') + 0.2, -16, 0.0); rustle(c('flops') + 0.3, -20, 0.0, 4); rustle(END - 0.4, -21, 0.1, 5)
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
F = [[53, 57, 60], [50, 53, 57], [46, 50, 53], [48, 52, 55]]     # F Dm Bb C
SNEAK = [[50, 53, 57], [49, 52, 56], [50, 53, 57], [45, 49, 52]]  # Dm C#dim Dm A
def style(t):
    if t < c('the'): return 'warm'
    if t < c('so'): return 'lab'
    if t < c('but'): return 'warm'
    if t < c('so', 1): return 'tense'
    return 'warm'
music = np.zeros((2, N))
for b in range(16):
    t0 = b * BAR
    for k in range(8):
        ts = t0 + k * BAR / 8; st = style(ts + 0.01)
        if st == 'warm':
            ch = F[b % 4]
            if k in (0, 2, 4, 6): place(music, celesta(note(ch[[0, 1, 2, 1][k // 2]] + 24), 0.8) * 0.15, ts, 0, 0.2)
            if k in (0, 4): place(music, pizz(note(ch[0] - 12), 0.4, 0.6) * 0.38, ts)
            if k == 0: place(music, pad(ch, BAR) * 0.05, ts)
        elif st == 'lab':
            ch = F[b % 4]
            place(music, marimba(note(ch[0] + (12 if k % 2 else 0)), 0.3) * 0.15, ts, 0, -0.2 if k % 2 else 0.2)
            if k == 0: place(music, pad(ch, BAR, 0.6) * 0.045, ts)
        else:
            ch = SNEAK[b % 4]
            if k % 2 == 0: place(music, pizz(note(ch[0] - 12), 0.3, 0.5) * 0.45, ts)
            if k in (3, 7): place(music, pizz(note(ch[2]), 0.18, 0.9) * 0.2, ts, 0, 0.3)
            if k == 0: place(music, pad(ch, BAR, 0.5) * 0.05, ts)
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
