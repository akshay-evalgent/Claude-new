"""Music + real sound effects + voiceover for "Why Your Stomach Growls".
Every sound effect is a real recording from BigSoundBank (CC0, public domain): real stomach gurgling (five recordings),
the room tone of a quiet room, a quartz clock ticking, pages, a pen, a chair and a cough in the exam hall, gurgling sink
drains and water drops for the old pipes, an apple crunch, a heartbeat and a portable vascular Doppler (blood flow).
The echo on "echo" is a real gurgle with delayed copies. Only the music is synthesized (16 bars across the video).
usage: mix_stomach.py vo.wav sounds_dir events.py out.wav stems_dir"""
import sys, math, json, importlib.util, numpy as np, soundfile as sf
from scipy import signal

SR = 48000
DUR = 1029 / 30
vo_path, snd_dir, ev_path, out_path, stems_dir = sys.argv[1:6]
N = int(round(DUR * SR))
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

def echo(x, delays=(0.16, 0.33, 0.52), gains=(-6, -11, -17), lowpass=(2400, 1500, 900)):
    """a real recording with fading, darker repeats (an echo in a hollow tube)"""
    n = len(x) + int(max(delays) * SR) + 10; y = np.zeros(n); y[:len(x)] += x
    for d, g, f in zip(delays, gains, lowpass): i = int(d * SR); y[i:i + len(x)] += lp(x, f) * db(g)
    return norm(y)
def ticks(t0, t1, first=0.32, last=0.045, g=-14):
    """a real quartz-clock tick repeated faster and faster (time-lapse)"""
    tk = rec('1069', 0.66, 0.78, 0.002, 0.04); t = t0; k = 0
    while t < t1: f = (t - t0) / (t1 - t0); place(fx, tk, t, g + 2 * f, 0.1); t += first * (1 - f) + last * f; k += 1
def tile_bed(i, s0, s1, gain_db, lowpass=None, xf=0.4):
    """a bed made by tiling a real segment with crossfades, wrapping round the loop point without a seam"""
    seg_ = rec(i, s0, s1, 0.001, 0.001); F = int(xf * SR); L = len(seg_) - F; out = np.zeros(N + len(seg_)); k = 0
    w = np.ones(len(seg_)); w[:F] = np.linspace(0, 1, F); w[-F:] = np.linspace(1, 0, F)
    while k * L < N + F: out[k * L:k * L + len(seg_)] += seg_ * w; k += 1
    o = out[:N].copy(); o[:F] += out[N:N + F] * 0  # the first tile already fades in; add the overhang from the end
    o[:len(out) - N] += out[N:]; o[:F] *= 1.0
    if lowpass: o = lp(o, lowpass)
    return o * db(gain_db)
hall = [(0, c('its') + 0.15), (c('so', 1) - 0.15, END)]
body_spans = [(c('its') - 0.1, c('about') + 0.05), (c('a', 2) - 0.1, c('like') + 0.1), (c('it', 2) - 0.1, c('so', 1) + 0.1)]
# ambiences: the quiet room (with a clock ticking somewhere), and inside the body a low blood-flow hum
place(amb, loop_bed('2387', 40.0, -30) * gate(hall, 0.12), 0.0)
place(amb, loop_bed('1372', 2.0, -36) * gate(hall, 0.12), 0.0)
place(amb, tile_bed('2500', 4.8, 10.0, -26, lowpass=500) * gate(body_spans, 0.15), 0.0)
# 0) the hook: a real stomach growl in the silent hall, a second smaller one, a page, an awkward cough
place(fx, rec('3177', 0.08, 2.2, 0.01, 0.3), c('growl') + 0.02, -2, 0.1)
place(fx, rec('1280', 0.25, 1.3, 0.01, 0.2), c('food') + 0.08, -7, 0.1)
place(fx, rec('2212', 0.0, 1.0, 0.01, 0.2), 1.05, -20, -0.5)
place(fx, rec('2183', 0.05, 0.5, 0.01, 0.12), c('its') - 0.5, -20, 0.6)
# 1) the whole gut: a soft gurgle as the squeeze starts
place(fx, lp(rec('3176', 0.15, 0.75, 0.01, 0.15), 1600), c('gut') - 0.05, -10, 0.0)
place(fx, lp(rec('1281', 0.0, 0.7, 0.01, 0.15), 1200), c('cleaning') + 0.2, -12, -0.2)
# 2) inside the empty stomach: a hollow gurgle with its echo, a drip
place(fx, echo(lp(rec('3177', 0.6, 1.6, 0.02, 0.2), 1100)), c('when') + 0.25, -9, 0.0)
place(fx, echo(rec('1384', 3.0, 3.35, 0.002, 0.1), (0.2, 0.42), (-8, -14), (2000, 1200)), c('empty') + 0.1, -16, 0.3)
# 3) the clock: real ticks speeding up, ninety minutes in a second and a half
ticks(c('about') + 0.03, c('a', 2) - 0.12)
# 4) the squeeze runs through the stomach: a long deep gurgle and a drain-like slurp
place(fx, lp(rec('3177', 0.1, 4.2, 0.02, 0.5), 1800), c('powerful') - 0.1, -6, -0.1)
place(fx, lp(rec('1027', 4.65, 5.6, 0.02, 0.2), 1400), c('squeezes') + 0.1, -10, 0.2)
# 5) on into the intestines, travelling left to right with the camera
place(fx, lp(rec('3178', 0.15, 1.2, 0.01, 0.2), 2000), c('and', 1) + 0.05, -8, -0.4)
place(fx, lp(rec('1280', 0.3, 1.4, 0.01, 0.2), 2000), c('intestines') - 0.05, -9, 0.4)
# 6) the tunnel: the squeeze closes in and slurps the scraps away
place(fx, lp(rec('1029', 3.8, 4.75, 0.02, 0.2), 1300), c('sweeping') + 0.1, -8, 0.0)
for k, ts in enumerate([0.6, 2.9, 5.1]): place(fx, rec('0150', ts, ts + 0.35, 0.01, 0.1), c('leftover') + 0.12 * k, -18, -0.3 + 0.3 * k)
# 7) gas and liquid pushed along: a steady liquid gurgle, bubbles on "gas"
place(fx, lp(rec('1027', 0.4, 3.6, 0.1, 0.4), 1500), c('with') + 0.05, -11, 0.0)
place(fx, rec('0150', 8.0, 8.9, 0.02, 0.2), c('gas') - 0.05, -14, 0.3)
place(fx, lp(rec('1028', 1.2, 2.4, 0.05, 0.3), 1800), c('liquid') - 0.05, -12, -0.2)
# 8) a bubble forces through the narrow ring, and the gut echoes
place(fx, rec('1281', 0.0, 0.7, 0.01, 0.12), c('squeeze') - 0.05, -6, 0.0)
place(fx, echo(rec('3176', 0.15, 0.75, 0.005, 0.12), (0.17, 0.35, 0.55), (-5, -10, -16), (2600, 1600, 900)), c('echo') - 0.08, -5, 0.0)
# 9) old pipes: a real drain gurgling, water dripping
place(fx, rec('1028', 5.15, 6.25, 0.01, 0.2), c('like') + 0.05, -5, 0.2)
place(fx, rec('1026', 5.1, 6.1, 0.01, 0.2), c('pipes') - 0.05, -9, -0.2)
for ts, src in [(c('water') + 0.25, 4.4), (c('pipes') + 0.35, 5.8)]: place(fx, rec('1384', src, src + 0.3, 0.002, 0.1), ts, -14, -0.1)
# 10) the stethoscope: what the doctor hears, a gurgle through the tubing
place(fx, lp(hp(rec('1280', 0.25, 1.4, 0.01, 0.2), 90), 700), c('borborygmi') - 0.05, -5, 0.0)
place(fx, lp(hp(rec('3178', 0.15, 0.9, 0.01, 0.15), 90), 700), c('doctors') + 0.05, -14, 0.0)
# 11) after a meal: a crunch; then the gurgle, smothered by the food
place(fx, rec('1113', 0.45, 0.85, 0.003, 0.15), c('meals') - 0.05, -9, 0.2)
place(fx, lp(rec('3177', 0.1, 2.4, 0.05, 0.6), 320), c('muffles') - 0.05, -7, 0.0)
# 12) hunger hormones in the blood: a heartbeat and the Doppler whoosh; the squeeze starts early
place(fx, lp(rec('2500', 6.0, 8.6, 0.1, 0.4), 1800), c('and', 4) - 0.05, -12, 0.0)
place(fx, lp(rec('0218', 1.8, 4.4, 0.02, 0.3), 400), c('hunger') - 0.1, -14, 0.0)
place(fx, lp(rec('3178', 0.15, 1.6, 0.01, 0.3), 2200), c('early') - 0.05, -7, 0.0)
# 13) back in the hall: a chair creaks, a page turns, then the roar (it runs on into the start of the loop)
place(fx, rec('0666', 50.85, 51.45, 0.02, 0.15), c('so', 1) + 0.25, -18, -0.4)
place(fx, rec('2212', 0.0, 1.0, 0.01, 0.2), c('next') + 0.3, -21, 0.5)
place_wrap(fx, rec('1281', 0.0, 0.75, 0.005, 0.1), c('roars') + 0.04, -3, 0.1)
place_wrap(fx, rec('3178', 0.12, 1.9, 0.01, 0.4), c('roars') + 0.3, -6, 0.1)

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
CUR = [[45, 48, 52], [41, 45, 48], [43, 47, 50], [40, 44, 47]]   # Am F G E: curious, a little mysterious
WARM = [[48, 52, 55], [45, 48, 52], [41, 45, 48], [43, 47, 50]]  # C Am F G
def style(t):
    if t < c('pipes') + 0.3: return 'body'
    if t < c('so', 1): return 'warm'
    return 'body'
music = np.zeros((2, N))
for b in range(16):
    t0 = b * BAR
    for k in range(8):
        ts = t0 + k * BAR / 8; st = style(ts + 0.01)
        if st == 'body':
            ch = CUR[b % 4]; place(music, marimba(note(ch[k % 3] + (12 if k % 4 == 3 else 0)), 0.35) * 0.15, ts, 0, -0.25 if k % 2 else 0.25)
            if k in (0, 4): place(music, pizz(note(ch[0] - 12), 0.45, 0.5) * 0.4, ts)
            if k == 0: place(music, pad(ch, BAR, 0.6) * 0.05, ts)
        else:
            ch = WARM[b % 4]
            if k in (0, 2, 4, 6): place(music, celesta(note(ch[[0, 1, 2, 1][k // 2]] + 24), 0.8) * 0.15, ts, 0, 0.2)
            if k in (0, 4): place(music, pizz(note(ch[0] - 12), 0.4, 0.6) * 0.38, ts)
            if k == 0: place(music, pad(ch, BAR) * 0.05, ts)
music = music / np.max(np.abs(music))
# the hall is silent: no music until the cut into the body, and it fades out before the roar at the end
tt = np.arange(N) / SR
music *= (np.clip((tt - c('its') + 0.05) / 0.35, 0, 1) * np.clip((c('roars') - 0.25 - tt) / 0.8, 0, 1))[None, :]

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
