"""Mix an explainer: narration + music bed (ducked under the voice) + sound effects.

usage: python mix.py VIDEO_DIR
Reads VIDEO_DIR/beats.json (music, musicDb, duckDb, sfx per beat) and VIDEO_DIR/build/timing.json.
Writes VIDEO_DIR/build/mix.wav (48 kHz stereo), voice.wav and music.wav stems.

beats.json keys used here:
  "music": [{"track": "Spy Glass", "from": "b01", "to": "b40", "db": -17, "offset": 0, "fadeIn": 0.5, "fadeOut": 2}]
           (from/to are beat ids; "to" is exclusive and defaults to the end; tracks loop if short)
  "duckDb": extra attenuation of music while the voice speaks (default -9)
  per beat "sfx": [[seconds_from_beat_start, "pack/name", gain]]   (files in trader-stories/assets/sfx)
Music: Kevin MacLeod (incompetech.com), CC BY 4.0. SFX: Kenney and others, CC0.
"""
import json, subprocess, sys, hashlib
from pathlib import Path
import numpy as np
import soundfile as sf

TOOLS = Path(__file__).parent
ASSETS = TOOLS.parent.parent / "assets"
vdir = Path(sys.argv[1])
spec = json.load(open(vdir / "beats.json"))
timing = json.load(open(vdir / "build" / "timing.json"))
fps = timing["fps"]; SR = 48000
N = int(timing["total"] / fps * SR) + SR // 2
cache = vdir / "build" / "audio_cache"; cache.mkdir(parents=True, exist_ok=True)

def load(path):
    """Decode any audio file to 48 kHz stereo float32 via ffmpeg (cached)."""
    key = hashlib.sha1(str(path).encode()).hexdigest()[:12]
    wav = cache / f"{key}.wav"
    if not wav.exists():
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(path), "-ar", str(SR), "-ac", "2", str(wav)], check=True)
    a, _ = sf.read(wav, dtype="float32")
    return a

def find_sfx(name):
    for ext in (".ogg", ".wav", ".mp3"):
        p = ASSETS / "sfx" / (name + ext)
        if p.exists():
            return p
    raise FileNotFoundError(name)

beat_start = {b["id"]: b["start"] / fps for b in timing["beats"]}
beat_end = {b["id"]: (b["start"] + b["frames"]) / fps for b in timing["beats"]}
total = timing["total"] / fps

# ---------------------------------------------------------------- voice
voice = np.zeros((N, 2), dtype=np.float32)
for b in timing["beats"]:
    if not b["text"]:
        continue
    a = load(vdir / "build" / "vo" / f"{b['id']}.wav")
    i0 = int((b["start"] / fps + b["voiceAt"]) * SR)
    m = min(len(a), N - i0)
    voice[i0:i0 + m] += a[:m] * 0.95

# ducking envelope (attack fast, release slow)
env = np.abs(voice[:, 0]); hop = 480
fr = env[: len(env) // hop * hop].reshape(-1, hop).max(axis=1)
sm = np.zeros_like(fr)
for k in range(1, len(fr)):
    target = 1.0 if fr[k] > 0.015 else 0.0
    sm[k] = sm[k - 1] + (0.35 if target > sm[k - 1] else 0.025) * (target - sm[k - 1])
duck = np.pad(np.repeat(sm, hop), (0, N - len(sm) * hop))

# ---------------------------------------------------------------- music
music = np.zeros((N, 2), dtype=np.float32)
duck_db = spec.get("duckDb", -9)
for m in spec.get("music", []):
    a = load(ASSETS / "music" / f"{m['track']}.mp3")
    a = a[int(m.get("offset", 0) * SR):]
    t0 = beat_start[m["from"]] if "from" in m else 0.0
    t1 = beat_start[m["to"]] if m.get("to") in beat_start else total + 0.5
    L = int((t1 - t0) * SR)
    reps = int(np.ceil(L / len(a))) + 1
    xf = int(1.5 * SR)
    seg = a.copy()
    for _ in range(reps - 1):  # crossfaded loop
        ramp = np.linspace(0, 1, xf, dtype=np.float32)[:, None]
        seg = np.concatenate([seg[:-xf], seg[-xf:] * (1 - ramp) + a[:xf] * ramp, a[xf:]])
    seg = seg[:L]
    fi, fo = int(m.get("fadeIn", 0.3) * SR), int(m.get("fadeOut", 1.5) * SR)
    g = np.ones(L, dtype=np.float32)
    if fi: g[:fi] = np.linspace(0, 1, fi)
    if fo: g[-fo:] = np.minimum(g[-fo:], np.linspace(1, 0, fo))
    gain = 10 ** (m.get("db", -17) / 20)
    i0 = int(t0 * SR)
    seg = seg * (g * gain)[:, None]
    music[i0:i0 + L] += seg[: N - i0]
music *= (10 ** (duck_db * duck / 20))[:, None]

# ---------------------------------------------------------------- sfx
fx = np.zeros((N, 2), dtype=np.float32)
for b in timing["beats"]:
    for off, name, gain in b.get("sfx", []):
        a = load(find_sfx(name))
        i0 = int((b["start"] / fps + off) * SR)
        if i0 < 0 or i0 >= N:
            continue
        m = min(len(a), N - i0)
        fx[i0:i0 + m] += a[:m] * gain

mix = voice + music + fx
peak = np.abs(mix).max()
if peak > 0.98:
    mix *= 0.98 / peak
out = vdir / "build"
sf.write(out / "mix.wav", mix, SR)
sf.write(out / "voice.wav", voice, SR)
sf.write(out / "music.wav", music, SR)
print(f"mix {total:.1f}s peak {peak:.2f}")
