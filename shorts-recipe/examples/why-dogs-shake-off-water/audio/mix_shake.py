"""Music + real sound effects + voiceover for "Why Dogs Shake Off Water".
Every sound effect is a real recording, all CC0 (public domain). The dog shakes are real dogs shaking themselves dry,
from Freesound (files fs<id>.wav: 632413 by JKata, 505822 by jedg, 547569 by PicklesSuck, 435368 by giddster). Everything else is BigSoundBank: bath water, drops, splashes, a whimper, breathing,
kibble, a crackling fire, a real mouse and birds outside. In the slow-motion shots the real shakes are slowed down.
Only the music is synthesized (16 bars across the video, so the loop lands on the downbeat).
usage: mix_shake.py vo.wav sounds_dir events.py out.wav stems_dir"""
import sys, json, importlib.util, numpy as np, soundfile as sf
from scipy import signal

SR = 48000
DUR = 1051 / 30
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

# birds outside the bathroom window: a quiet bed under everything, continuous across the loop
place(amb, loop_bed('0222', 5.0, -33), 0.0)
place(amb, lp(rec('0192', 0.2, 4.6, 0.3, 0.4), 2500), c('a', 1) - 0.2, -36); place(amb, lp(rec('0192', 5.0, 8.4, 0.3, 0.3), 2500), c('so', 1) - 0.3, -36)   # bath water
def drip(t, g=-24, pan=0.0, k=0):
    i, s0 = [('1386', 1.55), ('1384', 1.55), ('1387', 2.1), ('1386', 4.45), ('1384', 4.42), ('1387', 4.15)][k % 6]
    place(fx, rec(i, s0, s0 + 0.35, 0.002, 0.08), t, g, pan)
def slowshake(i, s0, s1, t, g, rate=0.45, pan=0.0):
    x = rec(i, s0, s1, 0.02, 0.2, rate=rate); x = lp(x, 6000); place(fx, x, t, g, pan)
# 0) the hook: the shake from the loop, slowed down; drops hit the lens
slowshake('fs632413', 4.65, 5.6, 0.0, -9, 0.42)
for k, tl in enumerate([0.55, 1.15, 1.7]): drip(tl, -16, [-0.2, 0.3, -0.35][k], k)
# 1) the soaked dog in the bath: drips into the water, a little whimper
for k, tt in enumerate(np.arange(c('a', 1) + 0.15, c('drying') - 0.1, 0.48)): drip(tt, -25, 0.2 if k % 2 else -0.2, k)
place(fx, rec('1545', 0.4, 0.62, 0.005, 0.05), c('soaked') + 0.45, -15, 0.1)
# 2) water streams out of the fur into one big drop
for k in range(6): place(fx, rec('0183', [0.91, 2.19, 3.14, 3.96, 4.54, 5.64][k] - 0.03, [0.91, 2.19, 3.14, 3.96, 4.54, 5.64][k] + 0.32, 0.005, 0.08), c('pound') - 0.1 + k * 0.17, -19 + k, 0.15)
# 3) dripping onto the tiles; breathing, a shiver
for k, tt in enumerate(np.arange(c('drying') + 0.1, c('burn'), 0.4)): drip(tt, -24, -0.15 if k % 2 else 0.15, k + 3)
place(fx, rec('1547', 4.0, 5.6, 0.1, 0.3), c('drying') + 0.2, -22, 0.0)
# 4) a fifth of the kibble burns away: a nudge of kibble, then a little crackle
place(fx, rec('2071', 1.05, 1.5, 0.01, 0.1), c('burn') + 0.05, -20, 0.2)
place(fx, rec('0030', 3.0, 5.2, 0.15, 0.4), c('about', 1) - 0.05, -20, 0.2)
# 5) so instead, it shakes: the real thing, at full speed
place(fx, rec('1796', 0.0, 1.0, 0.01, 0.1), c('so') - 0.32, -15)
place(fx, rec('fs632413', 4.35, 6.1, 0.01, 0.15), c('it') - 0.14, -4, 0.0)
# 6-9) slow motion: the same kind of shake, slowed down, one per shot
slowshake('fs505822', 0.85, 1.75, c('it', 1) - 0.05, -10, 0.38, -0.1)
slowshake('fs547569', 0.35, 1.95, c('starting') - 0.05, -10, 0.5, 0.1)
slowshake('fs632413', 4.4, 5.5, c('its') - 0.05, -10, 0.45, -0.1)
slowshake('fs435368', 0.05, 1.0, c('flinging') - 0.05, -9, 0.4, 0.1)
for k, tt in enumerate([c('flinging') + 0.3, c('the', 2) + 0.2, c('off') + 0.15, c('faster') + 0.3]): drip(tt, -19, [-0.4, 0.4, -0.2, 0.3][k], k)
# 10) two quick shakes in four seconds
place(fx, rec('1795', 0.0, 0.91, 0.01, 0.1), c('in', 1) - 0.3, -16)
place(fx, rec('fs505822', 0.8, 1.78, 0.01, 0.12), c('in', 1) + 0.12, -6, -0.1)
place(fx, rec('fs632413', 4.4, 6.05, 0.01, 0.15), c('in', 1) + 1.74, -7, 0.1)
# 11) the big dog and the little terrier, side by side: a slower, deeper shake and a quick, light one
place(fx, rec('fs435368', 0.05, 1.05, 0.01, 0.12), c('smaller') + 0.1, -7, -0.3); place(fx, rec('fs632413', 4.9, 5.6, 0.01, 0.12), c('smaller') + 1.0, -9, -0.3)
place(fx, rec('fs547569', 0.3, 2.05, 0.01, 0.12), c('smaller') + 0.05, -9, 0.4)
# 12) the wet mouse: a squeak or two
place(fx, rec('0459', 0.48, 0.8, 0.005, 0.06), c('a', 6) + 0.35, -15, 0.2); place(fx, rec('0459', 2.1, 2.4, 0.005, 0.06), c('thirty') + 0.5, -18, 0.2)
# 13) the dog sloshes in the bath, splashes out, lands on the mat; your towel; then the shake starts (cut by the loop)
place(fx, rec('0192', 2.9, 3.9, 0.05, 0.2, ), c('so', 1) + 0.1, -18, -0.1)
place(fx, rec('1529', 0.1, 1.1, 0.005, 0.2), c('out') - 0.1, -11, 0.0); place(fx, rec('1531', 0.05, 0.7, 0.005, 0.2), c('bath') + 0.1, -16, 0.1)
place(fx, rec('1104', 1.35, 1.9, 0.02, 0.1), c('grab') - 0.05, -16, 0.4)
place(fx, rec('fs632413', 4.35, 5.4, 0.01, 0.0), END - 0.78, -12, 0.0)
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
G = [[55, 59, 62], [52, 55, 59], [48, 52, 55], [50, 54, 57]]     # G  Em  C  D   (sunny)
def style(t):
    if t < c('a', 1): return 'slow'           # the slow-motion hook
    if t < c('so'): return 'tip'
    if t < c('it', 1): return 'bright'
    if t < c('in', 1): return 'slow'          # slow motion
    if t < c('so', 1): return 'bright'
    return 'tip'
music = np.zeros((2, N))
for b in range(16):
    t0 = b * BAR
    for k in range(8):
        ts = t0 + k * BAR / 8; st = style(ts + 0.01); ch = G[b % 4]
        if st == 'slow':
            if k in (0, 4): place(music, celesta(note(ch[[2, 0][k // 4]] + 24), 1.4) * 0.15, ts, 0, 0.2)
            if k == 0: place(music, pad(ch, BAR, 0.6) * 0.06, ts)
            if k in (0, 4): place(music, pizz(note(ch[0] - 24), 0.9, 0.3) * 0.32, ts)
        elif st == 'tip':
            if k % 2 == 0: place(music, pizz(note(ch[[0, 2, 1, 2][k // 2]] - 12), 0.34, 0.8) * 0.5, ts)
            else: place(music, (pizz(note(ch[1] + 12), 0.16) + pizz(note(ch[2] + 12), 0.16)) * 0.13, ts, 0, 0.3)
        else:
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
