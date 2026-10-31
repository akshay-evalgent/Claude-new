"""Sound design for the 15 s Mamaearth spot. No samples: everything is synthesised.
Beat grid 0.6 s (100 BPM). Writes out/audio_raw.wav; ffmpeg loudnorm runs later."""
import numpy as np, wave, struct, sys, os

SR = 48000
DUR = 15.0
N = int(SR * DUR)
t = np.arange(N) / SR
rng = np.random.default_rng(7)
mix = np.zeros(N)

def add(sig, at=0.0, gain=1.0):
    i0 = int(at * SR); n = min(len(sig), N - i0)
    if n > 0: mix[i0:i0 + n] += sig[:n] * gain

def env_ad(n, a, d, curve=4.0):
    x = np.arange(n) / SR
    e = np.where(x < a, x / max(a, 1e-6), np.exp(-(x - a) * curve / max(d, 1e-6)))
    return e

def lowpass(x, cutoff):
    # one-pole, run twice for a gentler slope
    rc = 1.0 / (2 * np.pi * cutoff); dt = 1 / SR; a = dt / (rc + dt)
    y = np.zeros_like(x); acc = 0.0
    for _ in range(2):
        acc = 0.0
        for i in range(len(x)):
            acc += a * (x[i] - acc); y[i] = acc
        x = y.copy()
    return y

def tone(freq, dur, partials=((1, 1.0), (2, 0.35), (3, 0.12)), a=0.004, d=0.6, curve=5.0, detune=0.0):
    n = int(dur * SR); x = np.arange(n) / SR; s = np.zeros(n)
    for k, g in partials:
        s += g * np.sin(2 * np.pi * freq * k * (1 + detune) * x + rng.uniform(0, 0.3))
    return s * env_ad(n, a, d, curve)

# ---- pad: warm D-major-ish bed, slow swell, resolves at the logo ----
def pad(freqs, start, end, gain, attack=1.6, release=1.2):
    n = int((end - start) * SR); x = np.arange(n) / SR; s = np.zeros(n)
    for f in freqs:
        vib = 1 + 0.0025 * np.sin(2 * np.pi * 0.23 * x + rng.uniform(0, 6))
        s += np.sin(2 * np.pi * f * vib * x) + 0.22 * np.sin(2 * np.pi * 2 * f * vib * x + 0.5) + 0.08 * np.sin(2 * np.pi * 3 * f * x)
    s /= len(freqs)
    e = np.minimum(1, x / attack) * np.minimum(1, (x[-1] - x) / release)
    add(s * e, start, gain)

pad([146.83, 220.0, 293.66, 369.99], 0.0, 10.8, 0.12)                 # D A D F#
pad([164.81, 246.94, 329.63, 415.30], 10.8, 13.2, 0.14, attack=0.6)   # E B E G#  (lift under claim 3)
pad([146.83, 220.0, 293.66, 369.99, 440.0], 13.2, 15.0, 0.15, attack=0.5, release=1.6)  # home

# ---- whoosh for the falling onion (0.2 -> 1.8), rising noise ----
n = int(1.6 * SR); x = np.arange(n) / SR
noise = rng.standard_normal(n)
w = lowpass(noise, 600) * (x / 1.6) ** 2.2
# add a rising pitched air tone
w += 0.4 * np.sin(2 * np.pi * (180 + 500 * (x / 1.6) ** 2) * x) * (x / 1.6) ** 3
add(w, 0.2, 0.22)

# ---- splash at the impact (1.8): burst of bright noise + low thump + droplet plinks ----
n = int(0.5 * SR)
burst = rng.standard_normal(n) * env_ad(n, 0.002, 0.18, 5)
add(burst, 1.8, 0.28)
thump = np.sin(2 * np.pi * (70 + 60 * np.exp(-np.arange(n) / SR * 18)) * np.arange(n) / SR) * env_ad(n, 0.002, 0.25, 5)
add(thump, 1.8, 0.5)
for k in range(14):
    f = rng.uniform(1400, 3200); at = 1.84 + rng.uniform(0, 0.5)
    add(tone(f, 0.25, partials=((1, 1.0), (2.7, 0.2)), d=0.08, curve=6), at, 0.05)

# ---- swirl shimmer (2.4 -> 4.4): a slow upward glissando with sparkle ----
n = int(2.2 * SR); x = np.arange(n) / SR
gl = np.sin(2 * np.pi * (330 + 330 * (x / 2.2)) * x) * np.sin(np.pi * x / 2.2)
add(gl, 2.4, 0.045)
for k in range(28):
    f = rng.choice([1174.66, 1318.51, 1479.98, 1760.0, 2349.32]); at = 2.4 + rng.uniform(0, 2.0)
    add(tone(f, 0.4, partials=((1, 1.0), (3, 0.1)), d=0.15, curve=5), at, 0.035)

# ---- marimba-like hits on the type beats ----
def hit(f, at, g=0.32):
    add(tone(f, 1.2, partials=((1, 1.0), (4, 0.25), (9.2, 0.07)), a=0.002, d=0.55, curve=4), at, g)
    add(lowpass(rng.standard_normal(int(0.05 * SR)), 2500) * env_ad(int(0.05 * SR), 0.001, 0.02, 6), at, 0.08)  # mallet click

hit(587.33, 2.4)          # D5  "Nature. Bottled."
hit(739.99, 2.48, 0.22)   # F#5 second word
hit(587.33, 4.8)          # claim 1
hit(880.0, 4.88, 0.2)
hit(659.25, 8.4)          # claim 2
hit(987.77, 9.0, 0.22)    # callouts on the beat
hit(1174.66, 9.6, 0.22)
hit(739.99, 10.8)         # claim 3 (lift)
hit(1108.73, 10.88, 0.2)
hit(587.33, 13.2, 0.36)   # logo
hit(880.0, 13.26, 0.26)
hit(1174.66, 13.32, 0.18)

# ---- bottle "settle" soft thud when it lands centre (11.6) and when droplets finish forming it (4.8) ----
for at, g in ((4.75, 0.25), (11.55, 0.18)):
    n = int(0.3 * SR)
    add(np.sin(2 * np.pi * 95 * np.arange(n) / SR) * env_ad(n, 0.003, 0.12, 5), at, g)

# ---- shaker pulse on the grid, very quiet, from the swirl to the logo ----
for k in range(4, 22):
    at = k * 0.6
    n = int(0.045 * SR)
    add(lowpass(rng.standard_normal(n), 5000) * env_ad(n, 0.002, 0.02, 6), at, 0.05 if k % 2 == 0 else 0.03)

# ---- tail: nothing after 14.85 s but the pad release ----
mix *= np.minimum(1, (DUR - t) / 0.4)
mix *= np.minimum(1, t / 0.02)
peak = np.max(np.abs(mix)); mix = mix / peak * 0.7

os.makedirs('out', exist_ok=True)
with wave.open('out/audio_raw.wav', 'wb') as wf:
    wf.setnchannels(2); wf.setsampwidth(2); wf.setframerate(SR)
    st = (mix * 32767).astype(np.int16)
    # slight stereo width: delay right by 0.4 ms on the shimmer-heavy band only is overkill; simple dual mono with tiny offset
    r = np.roll(st, 6)
    wf.writeframes(np.column_stack([st, r]).astype('<i2').tobytes())
print('wrote out/audio_raw.wav', len(mix) / SR, 's')
