"""Narration (local Piper voice) + synthesized score -> build/audio.wav and build/timeline.json"""
import json, os, subprocess, wave, sys
import numpy as np

SR = 44100
HERE = os.path.dirname(os.path.abspath(__file__))
B = os.path.join(HERE, "build")
os.makedirs(os.path.join(B, "vo"), exist_ok=True)
script = json.load(open(os.path.join(HERE, "script.json")))
VOICE = os.path.join(HERE, "voices", "en_US-ryan-high.onnx")


def tts(text, path):
    if not os.path.exists(path):
        subprocess.run([sys.executable, "-m", "piper", "-m", VOICE, "-f", path, "--length-scale", "0.93"],
                       input=text.encode(), check=True, capture_output=True)
    w = wave.open(path)
    a = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768
    sr = w.getframerate()
    # trim silence
    idx = np.where(np.abs(a) > 0.012)[0]
    a = a[max(0, idx[0] - int(0.02 * sr)): idx[-1] + int(0.06 * sr)]
    # resample to SR
    n = int(len(a) * SR / sr)
    return np.interp(np.linspace(0, len(a) - 1, n), np.arange(len(a)), a).astype(np.float32)


# ---------- narration + timeline ----------
cur = script["lead"]
clips, scenes = [], []
for sc in script["scenes"]:
    s0 = cur
    cur += 0.25
    sents = []
    for i, text in enumerate(sc["sents"]):
        a = tts(text, os.path.join(B, "vo", f"{sc['id']}_{i}.wav"))
        d = len(a) / SR
        clips.append((cur, a))
        sents.append({"text": text, "start": round(cur, 3), "end": round(cur + d, 3)})
        cur += d + 0.22
    cur += 0.3
    scenes.append({"id": sc["id"], "start": round(s0, 3), "end": round(cur, 3), "sents": sents})
total = cur + script["tail"]
N = int(total * SR)
vo = np.zeros(N, np.float32)
for t, a in clips:
    i = int(t * SR)
    vo[i:i + len(a)] += a[: N - i]
vo /= max(1e-6, np.abs(vo).max()) / 0.9
json.dump({"fps": script["fps"], "total": round(total, 3), "lead": script["lead"], "scenes": scenes},
          open(os.path.join(B, "timeline.json"), "w"), indent=1)

# ---------- score ----------
t = np.arange(N) / SR
rng = np.random.default_rng(7)


def lp(x, k):  # crude low-pass (moving average)
    c = np.cumsum(np.insert(x, 0, 0.0))
    return (c[k:] - c[:-k])[: len(x) - k + 1] / k if k > 1 else x


def lpf(x, k):
    y = lp(x, k)
    return np.pad(y, (0, len(x) - len(y)))


def saw(f, tt, det=0.0):
    return 2 * (((f * (1 + det)) * tt) % 1.0) - 1


def note(f, dur, a=0.01, r=0.1, kind="saw"):
    n = int(dur * SR); tt = np.arange(n) / SR
    if kind == "saw":
        x = (saw(f, tt) + saw(f, tt, 0.004) + saw(f, tt, -0.005)) / 3
    else:
        x = np.sin(2 * np.pi * f * tt)
    env = np.minimum(1, tt / a) * np.minimum(1, (dur - tt) / r)
    return (x * env).astype(np.float32)


def add(buf, x, at, g=1.0):
    i = int(at * SR)
    if i >= len(buf) or i < 0: return
    x = x[: len(buf) - i]
    buf[i:i + len(x)] += x * g


def hz(m): return 440 * 2 ** ((m - 69) / 12)


BPM = 104; beat = 60 / BPM; bar = 4 * beat
chords = [[38, 50, 57, 62, 65], [34, 46, 53, 58, 62], [31, 43, 55, 58, 62], [33, 45, 52, 57, 61]]  # Dm Bb Gm A
mus = np.zeros(N, np.float32)
home_t = scenes[-1]["start"]
end_cut = scenes[-1]["end"] + 1.6  # picture cuts to black here
nbars = int(total / bar) + 1
for b in range(nbars):
    ch = chords[(b // 2) % 4]; t0 = b * bar
    if t0 > end_cut: break
    inten = 0.55 if t0 < scenes[3]["end"] else 1.0
    if t0 >= home_t: inten = 0.35
    # pad
    for m in ch[1:]:
        add(mus, lpf(note(hz(m), bar * 1.05, a=0.6, r=0.9), 60), t0, 0.05)
    # pulsing bass 8ths
    for k in range(8):
        add(mus, lpf(note(hz(ch[0]), beat * 0.48, a=0.005, r=0.12), 40), t0 + k * beat / 2, 0.30 * inten * (1.0 if k % 2 == 0 else 0.7))
    # ostinato arpeggio (sine plucks) once the heist starts
    if t0 >= scenes[3]["start"] and t0 < home_t:
        for k in range(8):
            m = ch[1 + (k * 2) % 4] + 12
            add(mus, note(hz(m), beat * 0.45, a=0.004, r=0.3, kind="sine"), t0 + k * beat / 2, 0.07)
        # ticking hats
        for k in range(16):
            n = int(0.03 * SR); h = rng.standard_normal(n).astype(np.float32) * np.exp(-np.arange(n) / (0.006 * SR))
            add(mus, h - lpf(h, 8), t0 + k * beat / 4, 0.05 if k % 4 else 0.09)
    # soft piano-ish melody at home
    if t0 >= home_t:
        for k, m in enumerate([ch[3] + 12, ch[4] + 12, ch[2] + 12, ch[3] + 12]):
            add(mus, note(hz(m), beat * 1.6, a=0.005, r=1.2, kind="sine") * np.exp(-np.arange(int(beat * 1.6 * SR)) / (0.5 * SR)), t0 + k * beat, 0.16)


def braam(at, g=0.5, dur=2.6):
    n = int(dur * SR); tt = np.arange(n) / SR
    x = sum(saw(hz(m), tt, d) for m in (26, 38, 45) for d in (0, 0.006, -0.007)) / 9
    x = np.tanh(3 * lpf(x.astype(np.float32), 30)) * np.minimum(1, tt / 0.04) * np.exp(-tt / 0.9)
    add(mus, x.astype(np.float32), at, g)


def whoosh(at, g=0.18, dur=0.5):
    n = int(dur * SR); tt = np.arange(n) / SR
    x = lpf(rng.standard_normal(n).astype(np.float32), 25) * np.sin(np.pi * tt / dur) ** 3 * 3
    add(mus, x.astype(np.float32), at - dur * 0.6, g)


braam(0.15, 0.6)
for sc in scenes:
    whoosh(sc["start"])
    if sc["id"] in ("level1", "level2", "level3", "kick"):
        braam(sc["start"], 0.5)
braam(scenes[7]["start"], 0.35)
# hard stop when the picture cuts to black, tiny tail
i = int(end_cut * SR); fade = int(0.05 * SR)
mus[i:i + fade] *= np.linspace(1, 0, fade); mus[i + fade:] = 0
add(mus, note(hz(38), 2.2, a=0.3, r=1.5, kind="sine"), end_cut + 1.0, 0.25)  # low resolve under end card

# duck music under narration
env = lpf(np.abs(vo), int(0.25 * SR))
duck = 1 - 0.55 * np.clip(env / 0.08, 0, 1)
mix = vo * 1.0 + mus * duck * 0.9
mix = np.tanh(mix * 1.1) * 0.89
st = np.stack([mix, mix], 1)
w = wave.open(os.path.join(B, "audio.wav"), "w"); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
w.writeframes((st * 32767).astype(np.int16).tobytes()); w.close()
print("total", round(total, 2), "s;", len(scenes), "scenes")
for s in scenes: print(f"  {s['id']:8s} {s['start']:6.2f} - {s['end']:6.2f}")
