"""The score for One Night, synthesised on the picture's timeline (45 s, loops seamlessly).
A sleigh bell is the clock. It ticks once a second, slows as he flies, keeps home time while
the years pass, and is the only sound left when he comes back."""
import numpy as np, subprocess, wave, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
SR = 48000; DUR = 45.0; N = int(SR*DUR); t = np.arange(N)/SR
rng = np.random.default_rng(11)
out = np.zeros(N)

def lp(x, fc):
    y = np.zeros_like(x); a = np.exp(-2*np.pi*fc/SR); s = 0.0
    for i in range(len(x)): s = a*s + (1-a)*x[i]; y[i] = s
    return y
def put(sig, at, gain=1.0):
    i = int(at*SR)
    if i >= N: return
    L = min(len(sig), N - i)
    out[i:i+L] += gain*sig[:L]
def env_range(a, b, fade=0.05):
    return np.clip((t - a)/fade, 0, 1)*np.clip((b - t)/fade, 0, 1)

# ---- the bell tick: a small sleigh bell, inharmonic partials and a click
def bell(pitch=1.0, length=0.35, bright=1.0):
    L = int(length*SR); tt = np.arange(L)/SR
    parts = [(2140, 1.0, 22), (3410, 0.7, 30), (5230, 0.45, 40), (7720, 0.3, 55), (1030, 0.25, 14)]
    s = sum(a*np.sin(2*np.pi*f*pitch*tt + rng.uniform(0, 6))*np.exp(-tt*d) for f, a, d in parts)
    click = rng.standard_normal(L)*np.exp(-tt*600)*0.6*bright
    return (s*0.35 + click)*np.minimum(1, tt/0.0015)
# a big clock bell for midnight
def toll():
    L = int(4.0*SR); tt = np.arange(L)/SR
    parts = [(196, 1.0, 0.9), (392, 0.6, 1.2), (523, 0.45, 1.6), (587, 0.5, 1.4), (784, 0.3, 2.2), (98, 0.6, 0.6)]
    return sum(a*np.sin(2*np.pi*f*tt)*np.exp(-tt*d) for f, a, d in parts)*np.minimum(1, tt/0.004)*0.5
def boom(f0=55, length=2.5):
    L = int(length*SR); tt = np.arange(L)/SR
    f = f0*np.exp(-tt*1.2) + 30
    return np.sin(np.cumsum(2*np.pi*f/SR))*np.exp(-tt*1.8)*np.minimum(1, tt/0.005)

ticks = [0, 1, 2]
for s in ticks: put(bell(), s, 0.5)
put(toll(), 3.0, 0.55); put(boom(), 3.0, 0.7)
# the jingle of the harness as they leap
for k in range(70):
    put(bell(pitch=rng.uniform(0.9, 1.6), length=0.25, bright=0.3), 3.0 + rng.uniform(0, 1.6)**1.6, 0.12*(1 - k/90))
# time dilation: his ticks stretch apart and drop in pitch
for s, pch in [(4.3, 0.92), (5.9, 0.84), (7.9, 0.74), (10.4, 0.62)]:
    put(bell(pitch=pch, length=0.6), s, 0.5)
# home: ordinary seconds while the years pass
for s in range(12, 30): put(bell(), s, 0.38 if s < 22 else 0.22)
# the wall clock spinning: a blur of ticks
for k in range(int(2.0*28)):
    put(bell(pitch=0.6, length=0.06, bright=1.5), 14.5 + k/28 + rng.uniform(0, 0.01), 0.12)
# return: one tick a second, the only clock left
for s in range(30, 45): put(bell(), s, 0.5)

# ---- wind and room tone
noise = rng.standard_normal(N)
wind = lp(noise, 380); wind /= np.abs(wind).max()
gust = 0.6 + 0.4*np.sin(2*np.pi*0.13*t) * np.sin(2*np.pi*0.07*t + 1)
ext = env_range(3.0, 12.0)*0.8 + env_range(12.0, 14.5)*1.2 + env_range(18.5, 20.0)*1.2 + env_range(30.0, 34.0)*0.7
out += wind*gust*ext*0.22
room = lp(noise, 120); room /= np.abs(room).max()
out += room*0.04*(env_range(14.5, 18.5) + env_range(20.0, 22.0) + env_range(34.0, 45.0))
# launch whoosh: a noise sweep climbing as they go
w = lp(rng.standard_normal(int(4*SR)), 900)
w *= np.sin(np.linspace(0, np.pi, len(w)))**2
put(w/np.abs(w).max(), 3.1, 0.35)

# ---- drone under the first half, cut dead at 30.0
drone = 0.5*np.sin(2*np.pi*55*t) + 0.35*np.sin(2*np.pi*82.4*t) + 0.25*np.sin(2*np.pi*110.2*t + 0.4)
drone *= 0.6 + 0.4*np.sin(2*np.pi*0.09*t)
dr_env = np.clip(t/1.5, 0, 1)*(t < 30.0)
out += drone*dr_env*0.07

# ---- Shepard risers: into light speed, and under the present
def shepard(a, b, rate, gain):
    m = (t >= a) & (t < b)
    tt = t - a; OCT = 6; FMIN = 40.0
    sig = np.zeros(N)
    for k in range(OCT):
        pos = np.mod(k + tt*rate, OCT)
        f = FMIN*2.0**pos
        ph = np.cumsum(2*np.pi*f/SR)
        sig += np.exp(-((pos - OCT/2)**2)/(2*1.2**2))*np.sin(ph)
    ramp = np.clip((t - a)/(b - a), 0, 1)**1.6
    out[:] += sig/OCT*gain*ramp*m*np.clip((b - t)/0.01, 0, 1)
shepard(7.5, 12.0, 0.45, 0.5)
shepard(22.0, 30.0, 0.3, 0.55)

# ---- the present touches down, slowed
L = int(1.2*SR); tt = np.arange(L)/SR
thump = np.sin(2*np.pi*(70*np.exp(-tt*3) + 40)*tt)*np.exp(-tt*5)
put(thump, 25.0, 0.5)
# ---- the sleigh lands
put(boom(45, 1.5), 33.0, 0.35)
for k in range(20): put(bell(pitch=rng.uniform(0.9, 1.4), length=0.25, bright=0.2), 33.0 + rng.uniform(0, 0.8), 0.06)

# ---- coming home: a slow chord, gone before she speaks
chord = [110.0, 164.8, 220.0, 277.2, 329.6]
pad = sum(np.sin(2*np.pi*f*t + i)*(1/(i+1))**0.5 for i, f in enumerate(chord))
pad = pad + 0.5*sum(np.sin(2*np.pi*f*1.003*t) for f in chord[:3])
pad_env = np.clip((t - 34.0)/2.0, 0, 1)*np.clip((40.0 - t)/1.8, 0, 1)
out += lp(pad, 1400)*pad_env*0.06

# master; the first and last 5 ms are faded so the loop does not click
out = np.tanh(out*1.2)
fade = int(0.005*SR); out[:fade] *= np.linspace(0, 1, fade); out[-fade:] *= np.linspace(1, 0, fade)
out *= 0.89/np.abs(out).max()
with wave.open(str(root/'build/score.wav'), 'wb') as wv:
    wv.setnchannels(1); wv.setsampwidth(2); wv.setframerate(SR); wv.writeframes((out*32767).astype('<i2').tobytes())
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', str(root/'build/score.wav'), '-c:a', 'aac', '-b:a', '96k', str(root/'src/score.m4a')], check=True)
print('score ok', DUR, 's')
