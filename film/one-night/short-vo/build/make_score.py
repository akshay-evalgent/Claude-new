"""Score, effects and voice-over for One Night, mixed in stereo on the edit's timeline (src/timeline.json).
Run with the audio venv:  python build/make_score.py
Writes build/mix.wav and src/score.m4a."""
import json, pathlib, subprocess
import numpy as np, soundfile as sf
from scipy.signal import butter, sosfilt, fftconvolve, resample_poly, lfilter

root = pathlib.Path(__file__).resolve().parent.parent
TL = json.load(open(root/'src/timeline.json'))
A = TL['anchors']
SR = 48000
DUR = A['end']; N = int(DUR*SR) + 1
t = np.arange(N)/SR
rng = np.random.default_rng(23)
music = np.zeros((N, 2)); sfx = np.zeros((N, 2)); ticks = np.zeros((N, 2)); vo = np.zeros((N, 2))

# ------------------------------------------------------------------ helpers
def lp(x, fc, order=2): return sosfilt(butter(order, fc, 'low', fs=SR, output='sos'), x, axis=0)
def hp(x, fc, order=2): return sosfilt(butter(order, fc, 'high', fs=SR, output='sos'), x, axis=0)
def bp(x, lo, hi): return sosfilt(butter(2, [lo, hi], 'band', fs=SR, output='sos'), x, axis=0)
def peq(x, f0, gain_db, q=0.8):
    A_ = 10**(gain_db/40); w = 2*np.pi*f0/SR; al = np.sin(w)/(2*q)
    b = [1 + al*A_, -2*np.cos(w), 1 - al*A_]; a = [1 + al/A_, -2*np.cos(w), 1 - al/A_]
    return lfilter(np.array(b)/a[0], np.array(a)/a[0], x, axis=0)
def shelf_low(x, f0, gain_db):
    A_ = 10**(gain_db/40); w = 2*np.pi*f0/SR; al = np.sin(w)/2*np.sqrt(2)
    c = np.cos(w); sA = 2*np.sqrt(A_)*al
    b = [A_*((A_+1)-(A_-1)*c+sA), 2*A_*((A_-1)-(A_+1)*c), A_*((A_+1)-(A_-1)*c-sA)]
    a = [(A_+1)+(A_-1)*c+sA, -2*((A_-1)+(A_+1)*c), (A_+1)+(A_-1)*c-sA]
    return lfilter(np.array(b)/a[0], np.array(a)/a[0], x, axis=0)
def place(buf, sig, at, gain=1.0, pan=0.0):
    i = int(round(at*SR))
    if sig.ndim == 1:
        l, r = np.cos((pan+1)*np.pi/4), np.sin((pan+1)*np.pi/4)
        sig = np.stack([sig*l*1.414, sig*r*1.414], 1)
    if i < 0: sig = sig[-i:]; i = 0
    L = min(len(sig), N - i)
    if L > 0: buf[i:i+L] += gain*sig[:L]
def env(n, a, r, hold=None):
    e = np.ones(n); na, nr = int(a*SR), int(r*SR)
    if na: e[:na] = np.linspace(0, 1, na)**1.5
    if nr: e[-nr:] *= np.linspace(1, 0, nr)**1.5
    return e
def ir(seconds, damp, seed):
    g = np.random.default_rng(seed); L = int(seconds*SR); tt = np.arange(L)/SR
    x = g.standard_normal((L, 2))*np.exp(-tt*6.9/seconds)[:, None]
    x = lp(x, damp); x[:int(0.01*SR)] *= np.linspace(0, 1, int(0.01*SR))[:, None]
    return x/np.sqrt((x**2).sum()/2)
HALL = ir(3.2, 5000, 1); ROOM = ir(0.7, 6000, 2)
def reverb(x, impulse, wet):
    out = np.stack([fftconvolve(x[:, 0], impulse[:, 0])[:len(x)], fftconvolve(x[:, 1], impulse[:, 1])[:len(x)]], 1)
    return x*(1 - wet) + out*wet

# ------------------------------------------------------------------ instruments
NOTE = lambda n: 440*2**((n - 69)/12)
def organ(f, dur, a=0.12, r=0.9):
    n = int((dur + r)*SR); tt = np.arange(n)/SR
    bars = [(0.5, .55), (1, 1.0), (2, .7), (3, .3), (4, .32), (6, .14), (8, .12)]
    leslie = 1 + 0.004*np.sin(2*np.pi*5.7*tt)
    s = np.zeros((n, 2))
    for k, (h, amp) in enumerate(bars):
        if f*h > 9000: continue
        ph = 2*np.pi*f*h*np.cumsum(leslie)/SR
        s[:, 0] += amp*np.sin(ph + k); s[:, 1] += amp*np.sin(ph*1.0015 + 2*k)
    e = env(n, a, r); e[int(dur*SR):] = np.linspace(1, 0, n - int(dur*SR))**2
    return s*e[:, None]*0.12
def strings(f, dur, a=0.9, r=1.6):
    n = int((dur + r)*SR); tt = np.arange(n)/SR
    s = np.zeros((n, 2))
    for v in range(5):
        det = 1 + (v - 2)*0.0035; vib = 1 + 0.003*np.sin(2*np.pi*(5.0 + 0.3*v)*tt + v)
        ph = 2*np.pi*f*det*np.cumsum(vib)/SR
        saw = sum(np.sin(k*ph)/k for k in range(1, int(5000/f)))
        s[:, v % 2] += saw*(0.6 if v == 2 else 0.45)
    s = lp(s, 2400)
    e = env(n, a, 0.01); e[int(dur*SR):] = np.linspace(1, 0, n - int(dur*SR))**2
    return s*e[:, None]*0.06
def celesta(f, dur=2.2):
    n = int(dur*SR); tt = np.arange(n)/SR
    s = np.sin(2*np.pi*f*tt)*np.exp(-tt*2.2) + 0.35*np.sin(2*np.pi*f*4.0*tt)*np.exp(-tt*6) + 0.12*np.sin(2*np.pi*f*9.9*tt)*np.exp(-tt*12)
    s *= np.minimum(1, tt/0.002)
    return s*0.18
def piano(f, dur=3.5):
    n = int(dur*SR); tt = np.arange(n)/SR
    B = 0.0004; s = np.zeros(n)
    for k in range(1, 9):
        fk = f*k*np.sqrt(1 + B*k*k)
        s += np.sin(2*np.pi*fk*tt)*np.exp(-tt*(1.2 + 0.7*k))/k**1.1
    s *= np.minimum(1, tt/0.003)
    return s*0.2
def sleigh_bell(pitch=1.0, length=0.35, bright=1.0):
    n = int(length*SR); tt = np.arange(n)/SR
    parts = [(2140, 1.0, 22), (3410, .7, 30), (5230, .45, 40), (7720, .3, 55), (1030, .25, 14)]
    s = sum(a*np.sin(2*np.pi*f*pitch*tt + rng.uniform(0, 6))*np.exp(-tt*d) for f, a, d in parts)
    click = rng.standard_normal(n)*np.exp(-tt*600)*0.5*bright
    return (s*0.33 + click)*np.minimum(1, tt/0.0015)
def tock():
    n = int(0.12*SR); tt = np.arange(n)/SR
    return (np.sin(2*np.pi*1650*tt)*np.exp(-tt*90) + 0.5*rng.standard_normal(n)*np.exp(-tt*400))*0.5
def toll():
    n = int(5.0*SR); tt = np.arange(n)/SR
    parts = [(196, 1.0, .7), (392, .55, 1.0), (466, .3, 1.3), (587, .45, 1.2), (784, .25, 2.0), (98, .55, .45), (1175, .12, 2.6)]
    return sum(a*np.sin(2*np.pi*f*tt)*np.exp(-tt*d) for f, a, d in parts)*np.minimum(1, tt/0.004)*0.42
def boom(f0=50, length=3.0):
    n = int(length*SR); tt = np.arange(n)/SR
    f = f0*np.exp(-tt*1.3) + 28
    return np.sin(np.cumsum(2*np.pi*f/SR))*np.exp(-tt*1.5)*np.minimum(1, tt/0.006)
def noise_burst(length, lo, hi, a=0.05, r=None):
    n = int(length*SR); x = bp(rng.standard_normal((n, 2)), lo, hi)
    e = np.sin(np.linspace(0, np.pi, n))**2 if r is None else env(n, a, r)
    return x*e[:, None]/np.abs(x).max()
def shepard(t0, t1, rate, gain, down=False):
    i0, i1 = int(t0*SR), int(t1*SR); n = i1 - i0; tt = np.arange(n)/SR
    s = np.zeros(n)
    for k in range(6):
        pos = np.mod(k + (-1 if down else 1)*tt*rate, 6)
        s += np.exp(-((pos - 3)**2)/(2*1.2**2))*np.sin(np.cumsum(2*np.pi*40*2**pos/SR))
    ramp = (tt/(tt[-1] + 1e-9))**1.4
    s = s/6*ramp*gain; s[-int(0.03*SR):] *= np.linspace(1, 0, int(0.03*SR))
    music[i0:i1] += np.stack([s, s], 1)

def chord(fn, notes, at, dur, gain=1.0, **kw):
    for k, m in enumerate(notes): place(music, fn(NOTE(m), dur, **kw), at, gain)

# ------------------------------------------------------------------ the arrangement
mid, warp, home = A['midnight'], A['warp'], A['home']
# 1. before midnight: a pedal A and the watch's ticks, one landing on each second up to midnight
place(music, organ(NOTE(33), mid - 0.2, a=2.5, r=0.4), 0.0, 0.5)
n = 1
while mid - n >= 0.05:
    place(ticks, sleigh_bell(), mid - n, 0.42, pan=-0.1); n += 1
# 2. midnight: a bell tolls, the team leaps, the organ opens up
place(sfx, toll(), mid, 0.6); place(sfx, boom(), mid, 0.75)
for k in range(80):
    place(sfx, sleigh_bell(rng.uniform(0.9, 1.7), 0.25, 0.3), mid + rng.uniform(0, 1.8)**1.5, 0.12*(1 - k/100), pan=rng.uniform(-0.6, 0.6))
place(sfx, noise_burst(4.5, 200, 2200), mid + 0.2, 0.35)
prog = [[45, 57, 60, 64, 69], [41, 53, 57, 60, 65], [48, 55, 60, 64, 67], [43, 55, 59, 62, 67]]   # Am F C G
seg = (warp - mid)/4
for i, ch in enumerate(prog):
    chord(organ, ch, mid + i*seg, seg + 0.05, 0.55 + 0.15*i, a=0.25 if i == 0 else 0.08, r=0.5)
    chord(strings, [m + 12 for m in ch[1:]], mid + i*seg, seg + 0.05, 0.4 + 0.25*i, a=0.6, r=0.6)
shepard(warp - 4.0, home, 0.42, 0.55)
for k, (dt, p) in enumerate([(1.0, .95), (2.5, .88), (4.4, .8), (6.8, .7), (9.6, .6)]):   # his ticks stretch apart
    if mid + dt < warp: place(ticks, sleigh_bell(p, 0.6), mid + dt, 0.45)
# 3. light speed: a held cluster that keeps rising, ticks almost stopped
chord(organ, [57, 64, 69, 76, 81], warp, home - warp - 0.05, 0.7, a=1.2, r=0.06)
chord(strings, [69, 76, 81, 88], warp, home - warp - 0.05, 0.9, a=2.0, r=0.06)
place(ticks, sleigh_bell(0.55, 0.9), warp + 2.2, 0.5); place(ticks, sleigh_bell(0.45, 1.2), warp + 5.6, 0.5)
# 4. home, normal time: almost nothing, ticks on the second, one piano note
for s in np.arange(home + 0.3, A['tick'], 1.0): place(ticks, tock(), s, 0.35, pan=0.2)
place(music, np.stack([piano(NOTE(57)), piano(NOTE(64))*0.8], 1), home + 0.6, 0.6)
# 5. the watch insert: one tick on "second"
place(ticks, sleigh_bell(1.0, 0.5, 1.4), A['tick_second'], 0.75)
# 6. the clock spinning: nine hours a second, a blur of ticks
for k in range(int((A['present'] - A['clock'])*34)):
    place(ticks, tock(), A['clock'] + k/34 + rng.uniform(0, 0.008), 0.16*(0.6 + 0.4*k/80), pan=0.3)
place(music, organ(NOTE(33), A['present'] - A['clock'], a=0.4, r=0.3), A['clock'], 0.6)
# 7. one present, three seconds: a music-box line, slow, and the present settling on the rug
mel = [69, 72, 76, 74, 72, 71, 69]
for k, m in enumerate(mel):
    place(music, celesta(NOTE(m + 12)), A['present'] + 0.5 + k*0.62, 0.55, pan=0.25)
chord(strings, [53, 60, 65, 69], A['present'], A['day'] - A['present'], 0.35, a=1.2, r=0.4)
place(sfx, boom(85, 0.9)*0.4 + 0.2*noise_burst(0.9, 80, 600, a=0.003, r=0.85)[:, 0], A['present'] + 3.0, 0.6)
# 8. years: an organ ostinato that accelerates to "twenty-three", then cuts dead at dawn
t0, t1 = A['day'], A['dawn']
pos, k = t0, 0
arp = [57, 60, 64, 69, 64, 60]
while pos < t1 - 0.05:
    frac = (pos - t0)/(t1 - t0)
    step = 60/(150 + 190*frac)/2
    m = arp[k % len(arp)] + (12 if frac > 0.7 and k % 2 else 0)
    place(music, organ(NOTE(m), step*0.9, a=0.005, r=0.06), pos, 0.45 + 0.4*frac)
    if k % 2 == 0: place(ticks, tock(), pos, 0.2 + 0.2*frac)
    pos += step; k += 1
for ch, at in [([45, 57, 64], A['day']), ([41, 53, 60], A['year1']), ([48, 55, 64], A['ten']), ([40, 52, 56, 59], A['t23'])]:
    chord(strings, [m + 12 for m in ch], at, t1 - at, 0.9, a=0.3, r=0.01)
for at in [A['year1'], A['ten'], A['t23']]: place(sfx, boom(55, 1.6), at, 0.55)
cut = int(t1*SR); music[cut:cut + 1] *= 1   # the cut is the silence that follows
# 9. dawn: wind, distant bells coming in, touchdown
wind = lp(rng.standard_normal((N, 2)), 420); wind /= np.abs(wind).max()
gust = (0.6 + 0.4*np.sin(2*np.pi*0.11*t)*np.sin(2*np.pi*0.05*t + 1))[:, None]
def win(a, b, f=0.3): return (np.clip((t - a)/f, 0, 1)*np.clip((b - t)/f, 0, 1))[:, None]
sfx += wind*gust*(win(mid, warp, 0.4)*0.7 + win(home, A['tick'])*0.5 + win(A['day'], A['marks'])*0.6 + win(A['aged'], A['dawn'], 0.05)*0.6 + win(A['dawn'], A['inside'])*0.8)*0.18
for k in range(60):
    at = A['dawn'] + 0.6 + (A['touchdown'] - A['dawn'] - 0.6)*rng.uniform(0, 1)**0.7
    place(sfx, sleigh_bell(rng.uniform(0.95, 1.5), 0.25, 0.2), at, 0.1*((at - A['dawn'])/2.7)**1.5, pan=rng.uniform(-0.5, 0.3))
place(sfx, boom(48, 1.5), A['touchdown'], 0.45); place(sfx, noise_burst(0.8, 300, 3500, a=0.01, r=0.7), A['touchdown'], 0.3)
for s in np.arange(A['dawn'] + 0.5, A['end'], 1.0): place(ticks, sleigh_bell(), s, 0.3)
# 10. inside: a warm chord, a few piano notes
chord(strings, [53, 60, 65, 69, 72], A['inside'] + 0.2, A['her'] - A['inside'] + 1.0, 0.55, a=1.5, r=1.2)
for k, m in enumerate([72, 69, 65]): place(music, piano(NOTE(m)), A['inside'] + 1.2 + k*1.3, 0.35, pan=-0.2)
# 11. her: strings hold, then fall away before she speaks
her_line = [v for v in TL['vo'] if v['id'] == 'L15'][0]['at']
chord(strings, [45, 57, 64, 69], A['her'], her_line - A['her'] - 0.2, 0.5, a=0.8, r=0.8)
# 12. "For him, it was." then a soft major chord, the bittersweet resolution
l16 = [v for v in TL['vo'] if v['id'] == 'L16'][0]['at']
chord(organ, [45, 57, 61, 64, 69], l16 + 1.7, A['end'] - l16 - 1.7 - 0.6, 0.45, a=0.9, r=0.6)
chord(strings, [69, 73, 76], l16 + 1.9, A['end'] - l16 - 2.0 - 0.6, 0.4, a=1.0, r=0.5)

# ------------------------------------------------------------------ voice-over
def load_line(v):
    path = root/'vo/takes'/('bm_george' if v['who'] == 'narrator' else 'bm_george')/f"{v['id']}.wav"
    if v['who'] == 'her':
        tmp = root/'build/her.wav'
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', str(path), '-af', 'rubberband=pitch=0.93:formant=preserved', str(tmp)], check=True)
        path = tmp
    x, sr = sf.read(path)
    x = resample_poly(x, SR, sr)
    x = hp(x, 75); x = shelf_low(x, 160, 2.5); x = peq(x, 3500, 2.0, 1.0); x = peq(x, 7000, -2.0, 1.2)
    x = x/np.sqrt(np.mean(x[np.abs(x) > 0.01]**2) + 1e-9)*0.11
    return x
for v in TL['vo']:
    x = load_line(v)
    place(vo, x, v['at'], 1.0)
vo = reverb(vo, ROOM, 0.07)
# gentle compression on the voice
e = np.convolve(np.abs(vo[:, 0]), np.ones(int(0.02*SR))/int(0.02*SR), 'same')
g = np.where(e > 0.06, (0.06 + (e - 0.06)*0.4)/np.maximum(e, 1e-9), 1.0)
vo *= g[:, None]

# ------------------------------------------------------------------ mix
music = reverb(music, HALL, 0.32)
ticks = reverb(ticks, ROOM, 0.18)
sfx = reverb(sfx, HALL, 0.15)
# the dawn cut: everything musical stops dead on the cut to dawn
c = int(A['dawn']*SR); f = int(0.015*SR)
music[c:c+f] *= np.linspace(1, 0, f)[:, None]; music[c+f:int(A['inside']*SR)] = 0
# duck music and effects under the voice
venv = np.convolve(np.abs(vo[:, 0]), np.ones(int(0.25*SR))/int(0.25*SR), 'same')
duck = 1 - 0.62*np.clip(venv/0.04, 0, 1)
mix = (music*0.95 + sfx*0.9)*duck[:, None] + ticks*0.8 + vo*1.25
fade = int(0.006*SR); mix[:fade] *= np.linspace(0, 1, fade)[:, None]; mix[-fade:] *= np.linspace(1, 0, fade)[:, None]
mix = np.tanh(mix*1.05)/np.tanh(1.05)
mix *= 0.8/np.abs(mix).max()
sf.write(root/'build/mix_raw.wav', mix, SR)
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', str(root/'build/mix_raw.wav'), '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11', '-ar', '48000', str(root/'build/mix.wav')], check=True)
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', str(root/'build/mix.wav'), '-c:a', 'aac', '-b:a', '128k', str(root/'src/score.m4a')], check=True)
print('mix ok', round(DUR, 2), 's')
