"""Music + real sound effects + voiceover for "Why Dogs Are Scared Of Thunder".
Every sound effect is a real recording from BigSoundBank (CC0, public domain): real thunder, rain on glass, wind,
real dog whimpers, whines, panting and a sniff, a real electric shock, a bathtub drain, a balloon burst, a clock and
creaking floorboards. Only the music is synthesized (16 bars across the video, so the loop lands on the downbeat).
usage: mix_thunder.py vo.wav sounds_dir events.py out.wav stems_dir"""
import sys, json, importlib.util, numpy as np, soundfile as sf
from scipy import signal

SR = 48000
DUR = 966 / 30
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
indoor = [(0, c('some')), (c('so') - 0.05, c('that')), (c('and', 3), END)]       # in the living room during the storm
bath = [(c('that') - 0.05, c('so', 1))]                                         # in the bathroom (muffled)
outdoor = [(c('one', 1) - 0.05, c('so') + 0.02), (c('so', 1) - 0.02, c('and', 3) + 0.02)]
quiet = [(c('some') - 0.02, c('one', 1) + 0.02)]                               # before the storm: just a clock
rain_in = loop_bed('1295', 6.0, -23); wind_in = loop_bed('1714', 20.0, -31); rain_bath = loop_bed('1295', 40.0, -27, lowpass=700)
rain_out = loop_bed('0740', 20.0, -17)
for x, g in ((rain_in, gate(indoor)), (wind_in, gate(indoor + bath)), (rain_bath, gate(bath)), (rain_out, gate(outdoor))):
    place(amb, x * g, 0.0)
clock = rec('0007', 0.0, 4.0, 0.002, 0.05); place(amb, clock[:int((c('one', 1) - c('some')) * SR)], c('some') + 0.05, -21, 0.4)
thunder = lambda i, s0, s1, lpf=None: (lambda x: lp(x, lpf) if lpf else x)(rec(i, s0, s1, 0.01, 0.6))
# 0) the loop starts on a flash: a crack, a whimper; then the big one on "thunder"
place(fx, thunder('3180', 0.0, 3.0), 0.02, -7, -0.3); place(fx, rec('1544', 0.0, 0.2, 0.005, 0.05), 0.45, -9, 0.1)
place(fx, thunder('3115', 1.05, 7.5), c('thunder') - 0.26, -2, -0.2); place(fx, rec('1545', 0.4, 0.62, 0.005, 0.05), c('thunder') + 0.3, -10, 0.1)
# 1) the boom on "loud noises"; the golden one whimpers
place(fx, thunder('3179', 0.35, 4.0), 4.37, -5, -0.3); place(fx, rec('1544', 4.05, 4.25, 0.005, 0.05), 4.68, -10, 0.15)
# 2) lightning at the window, twice
place(fx, thunder('2718', 0.25, 4.0), 5.93, -6, -0.4); place(fx, thunder('3184', 10.9, 13.6), 7.4, -7, -0.4)
# 3) before the storm: panting and the floorboards as the dog paces
place(fx, rec('1547', 4.0, 6.6, 0.1, 0.3), c('some') + 0.15, -19, 0.1)
for tt in (c('start') + 0.1, c('you') + 0.05): place(fx, rec('3051', 0.25, 0.9, 0.01, 0.1), tt, -21, -0.2)
# 4) the pressure drops: the dog sniffs the air
place(fx, rec('1547', 2.0, 2.45, 0.02, 0.1), c('drop') + 0.2, -14)
# 5) the charged cloud rumbles; the bolt cracks on "air"
place(fx, thunder('3116', 0.5, 3.5), c('theory') - 0.1, -15, 0.2); place(fx, thunder('3113', 1.95, 5.0), c('air', 1) - 0.27, -4, 0.0)
# 6) static: little crackles in the fur, and a distant rumble
for tt, a0, a1 in ((c('static') + 0.3, 0.76, 0.9), (c('up') + 0.1, 1.58, 1.78), (c('fur') + 0.05, 0.76, 0.9), (c('and', 1) + 0.25, 1.58, 1.78)): place(fx, rec('0134', a0, a1, 0.002, 0.03), tt, -19, 0.2)
place(fx, thunder('3181', 1.0, 4.5, 1200), 16.2, -18, -0.3)
# 7) ZAP on "shocks", and a yelp
place(fx, rec('0134', 2.3, 2.65, 0.001, 0.05), c('shocks') - 0.06, -4, 0.0); place(fx, rec('1544', 0.38, 0.6, 0.005, 0.05), c('shocks') + 0.14, -7, 0.05)
# 8) thunder muffled through the bathroom walls; a whine from the tub
place(fx, thunder('3180', 0.0, 3.5, 900), 19.98, -6, 0.0); place(fx, rec('1546', 12.75, 13.15, 0.01, 0.06), 20.5, -9, 0.0)
# 9) the charge drains away: the bathtub drain gurgles
place(fx, rec('0439', 0.2, 1.9, 0.05, 0.3), c('right') + 0.05, -11, -0.2); place(fx, rec('0134', 0.76, 0.9, 0.002, 0.03), c('right') + 0.15, -22)
# 10) your hand strokes the dog's head
for tt in (c('comforting') + 0.1, c('make') + 0.0, c('worse') + 0.2): place(fx, rec('0013', 0.05, 0.42, 0.04, 0.12), tt, -21, 0.2)
# 11) the myth pops
place(fx, rec('0551', 0.66, 1.2, 0.001, 0.08), c('myth') - 0.02, -5, 0.0)
# 12) the sky rumbles: the biggest crack of the film, from outside
place(fx, thunder('3184', 13.8, 17.0), 28.15, -1, -0.2); place(fx, thunder('3181', 2.0, 5.0), 28.9, -9, 0.3)
# 13) the hop onto the sofa, a small whine as it squeezes in
place(fx, thunder('3114', 2.0, 5.5, 2000), 29.4, -13, -0.3); place(fx, rec('0013', 0.05, 0.3, 0.005, 0.08), c('they', 1) + 0.4, -12, 0.0)
place(fx, rec('1545', 0.88, 1.1, 0.005, 0.05), c('in', 3) + 0.3, -12, 0.0)
# 14) "hold them close, because…": a low rumble that rolls across the loop point
place_wrap(fx, thunder('3116', 2.0, 5.5, 1600), 31.2, -13, -0.2)

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
    if t < c('some'): return 'tense'
    if t < c('one', 1): return 'tick'          # the quiet before the storm
    if t < c('that'): return 'lab'
    if t < c('and', 2): return 'sad'
    if t < c('so', 1): return 'warm'
    if t < c('and', 3): return 'stop'          # "So when the sky rumbles": thunder only
    return 'warm'
music = np.zeros((2, N))
for b in range(16):
    t0 = b * BAR
    for k in range(8):
        ts = t0 + k * BAR / 8; st = style(ts + 0.01)
        ch = (SAD if st in ('sad', 'tick', 'lab') else F)[b % 4]
        if st in ('stop', 'hush'): continue
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
fxenv = lp(np.abs(fx[0]), 3); music *= db(-6 * np.clip(fxenv / (np.percentile(fxenv, 99) + 1e-9), 0, 1))
mix = voice + music + fx + amb
mix /= np.max(np.abs(mix)) * 1.05     # no fade at the end: the last sample flows into the first on loop
sf.write(out_path, mix.T, SR, subtype='PCM_24')
for name, x in (('voice', voice), ('music', music), ('fx', fx + amb)): sf.write(f"{stems_dir}/{name}.wav", (x / (np.max(np.abs(x)) + 1e-9) * 0.9).T, SR, subtype='PCM_24')
print('mix written', mix.shape, 'voice rms', round(v_rms, 1), 'bar', round(BAR, 4), 'bpm', round(240 / BAR, 2))
