"""Synthesise the 10 s score. Everything is derived from the same timeline as the picture.
  0.00  drone fades in under black
  0.70  cut in; Shepard riser begins to climb
  2.10  the drop hits the pool (plink + stone-hall tail)
  6.00  a single clock tick; picture freezes
  6.12  time runs backward: riser descends, drop plays reversed at 8.02
  8.70  hard cut to silence
  9.00  low pulse under the title
"""
import numpy as np, subprocess, sys
SR = 48000
DUR = 10.0
N = int(SR*DUR)
t = np.arange(N)/SR

CUT_IN, FREEZE, FREEZE_LEN, CUT_OUT, TITLE = 0.70, 6.00, 0.12, 8.70, 9.00
S_MAX = FREEZE - CUT_IN                      # 5.3 s of story time
REV_LEN = CUT_OUT - (FREEZE + FREEZE_LEN)    # 2.58 s of inverted story time

def story_time(tt):
    s = np.where(tt < CUT_IN, 0.0, tt - CUT_IN)
    s = np.where(tt >= FREEZE, S_MAX, s)
    rev = (tt - (FREEZE+FREEZE_LEN)) / REV_LEN
    s = np.where(tt >= FREEZE+FREEZE_LEN, S_MAX*(1.0-np.clip(rev,0,1)), s)
    return s

s = story_time(t)
ds = np.gradient(s, 1/SR)                    # story-time velocity: +1 forward, ~-2.05 reversed, 0 frozen

def env(a, d, hold=None):
    """linear fade in over a seconds then exponential decay with time constant d."""
    return a, d

out = np.zeros(N)

# ---- drone -----------------------------------------------------------------
drone = (np.sin(2*np.pi*55*t) + 0.5*np.sin(2*np.pi*110*t + 0.3) + 0.6*np.sin(2*np.pi*55.35*t))
# slow breathing
drone *= 0.55 + 0.45*np.sin(2*np.pi*0.11*t - 1.2)
# brown-ish noise bed
rng = np.random.default_rng(7)
white = rng.standard_normal(N)
bed = np.zeros(N); y = 0.0; a = np.exp(-2*np.pi*180/SR)
for i in range(N):
    y = a*y + (1-a)*white[i]; bed[i] = y
bed /= (np.abs(bed).max()+1e-9)
drone = 0.30*drone + 0.12*bed
drone_env = np.clip(t/CUT_IN, 0, 1)**1.5
drone_env *= (t < CUT_OUT)
# 12 ms fade at the cut so it does not click
fade = np.clip((CUT_OUT - t)/0.012, 0, 1)
drone *= drone_env*fade
out += drone

# ---- Shepard riser (6 partials, gaussian spectral envelope) -----------------
OCT = 6; FMIN = 36.0
rate = 0.19                                   # octaves per story-second
p = s*rate                                    # log-pitch offset in octaves (reverses with s)
riser = np.zeros(N)
for k in range(OCT):
    pos = np.mod(k + p, OCT)                  # position inside the 6-octave window
    f = FMIN * 2.0**pos
    phase = np.cumsum(2*np.pi*f/SR)
    amp = np.exp(-((pos - OCT/2)**2)/(2*1.25**2))
    riser += amp*np.sin(phase)
riser /= OCT*0.6
# intensity grows across the push-in, holds through the inversion, dies at the cut
inten = np.clip((t-CUT_IN)/(FREEZE-CUT_IN), 0, 1)**1.7
inten = np.where(t >= FREEZE, 1.0, inten)
inten *= (t < CUT_OUT)*fade
riser *= 0.22*inten
# in reversal, add a faint high shimmer to mark the inversion
inv = np.clip((t-(FREEZE+FREEZE_LEN))/0.4, 0, 1)*(t < CUT_OUT)
shimmer = np.sin(np.cumsum(2*np.pi*(1200 + 400*np.sin(2*np.pi*0.5*t))/SR))*0.03*inv*fade
out += riser + shimmer

# ---- stone-hall reverb impulse ----------------------------------------------
ir_len = int(1.1*SR)
ir = rng.standard_normal(ir_len)*np.exp(-np.arange(ir_len)/(0.28*SR))
# darken the tail
y=0.0; a2=np.exp(-2*np.pi*2500/SR)
for i in range(ir_len):
    y = a2*y + (1-a2)*ir[i]; ir[i]=y
ir /= np.abs(ir).sum()*0.02

def plink():
    L = int(0.6*SR); tt = np.arange(L)/SR
    f = 1500*np.exp(-tt*9) + 820
    ph = np.cumsum(2*np.pi*f/SR)
    sig = np.sin(ph)*np.exp(-tt*11) + 0.35*np.sin(2.01*ph)*np.exp(-tt*18)
    sig[:int(0.002*SR)] *= np.linspace(0,1,int(0.002*SR))
    return sig*0.55

def place(sig, at, gain=1.0, reverse=False, wet=0.5):
    sig = sig[::-1] if reverse else sig
    dry = np.zeros(N); i = int(at*SR); L = min(len(sig), N-i); dry[i:i+L] = sig[:L]
    wetsig = np.convolve(dry, ir)[:N]
    return gain*(dry + wet*wetsig)

DROP_S = 1.4
out += place(plink(), CUT_IN + DROP_S, 0.9)
# the same drop, time-reversed, where the inverted story passes s = 1.4
t_rev_drop = FREEZE + FREEZE_LEN + REV_LEN*(1 - DROP_S/S_MAX)
rev_sig = plink()
rev_env_sig = place(rev_sig, 0, 1.0, reverse=False)          # make the tail first
rev_env_sig = rev_env_sig[:int(1.2*SR)][::-1]                 # then reverse dry+wet together
i = int((t_rev_drop - 1.2)*SR); L = len(rev_env_sig)
out[i:i+L] += 0.8*rev_env_sig*(t[i:i+L] < CUT_OUT)

# ---- tick at the freeze -----------------------------------------------------
L = int(0.09*SR); tt = np.arange(L)/SR
tick = rng.standard_normal(L)*np.exp(-tt*260)
y=0.0; a3=np.exp(-2*np.pi*3200/SR)
for k in range(L): y=a3*y+(1-a3)*tick[k]; tick[k]=y
tick = tick/np.abs(tick).max()*0.9 + 0.5*np.sin(2*np.pi*1900*tt)*np.exp(-tt*90)
out += place(tick, FREEZE, 0.7, wet=0.35)

# ---- low pulse under the title ---------------------------------------------
L = int(1.0*SR); tt = np.arange(L)/SR
f = 64*np.exp(-tt*1.4) + 38
pulse = np.sin(np.cumsum(2*np.pi*f/SR))*np.exp(-tt*2.6)
pulse[:int(0.01*SR)] *= np.linspace(0,1,int(0.01*SR))
i = int(TITLE*SR); out[i:i+L] += 0.5*pulse

# ---- master -----------------------------------------------------------------
out = np.tanh(out*1.1)
out *= 0.89/np.abs(out).max()
pcm = (out*32767).astype('<i2')
import wave
with wave.open('build/score.wav', 'wb') as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
subprocess.run(['ffmpeg','-y','-loglevel','error','-i','build/score.wav','-c:a','aac','-b:a','96k','src/score.m4a'], check=True)
print('score ok', N/SR, 's; peak', float(np.abs(out).max()))
