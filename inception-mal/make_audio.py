"""Narration + character voices (local Piper) + synthesized score/ambience -> build/audio.wav, build/timeline.json"""
import json, os, re, subprocess, sys, wave
import numpy as np

SR = 44100
HERE = os.path.dirname(os.path.abspath(__file__))
B = os.path.join(HERE, "build"); os.makedirs(os.path.join(B, "vo"), exist_ok=True)
script = json.load(open(os.path.join(HERE, "script.json")))
FPS = script["fps"]
VOICES = {"N": ("en_US-ryan-high", 1.07), "mal": ("en_US-amy-medium", 1.08), "cobb": ("en_US-joe-medium", 1.02), "saito": ("en_GB-alan-medium", 1.08)}
CARD = 2.5


def tts(text, v, path):
    model, ls = VOICES[v]
    if not os.path.exists(path):
        subprocess.run([sys.executable, "-m", "piper", "-m", os.path.join(HERE, "voices", model + ".onnx"), "-f", path, "--length-scale", str(ls)], input=text.encode(), check=True, capture_output=True)
    w = wave.open(path); a = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768; sr = w.getframerate()
    idx = np.where(np.abs(a) > 0.012)[0]; a = a[max(0, idx[0] - int(0.02 * sr)): idx[-1] + int(0.06 * sr)]
    n = int(len(a) * SR / sr); a = np.interp(np.linspace(0, len(a) - 1, n), np.arange(len(a)), a).astype(np.float32)
    return a / max(1e-6, np.abs(a).max()) * (0.9 if v == "N" else 0.8)


cur = 0.0; clips = []; chapters = []; amb_marks = []; amb = "room"
for ch in script["chapters"]:
    c0 = cur; cur += CARD if ch["card"] else ch.get("lead", 0.6)
    lines = []; slot0 = c0
    for ln in ch["lines"]:
        if "amb" in ln and ln["amb"] != amb: amb = ln["amb"]; amb_marks.append((slot0, amb))
        elif not amb_marks: amb_marks.append((0.0, amb))
        sents = []
        parts = [p.strip() for p in re.findall(r"[^.?!]+[.?!]+", ln["text"])] or [ln["text"]]
        for i, p in enumerate(parts):
            a = tts(p, ln["v"], os.path.join(B, "vo", f"{ln['id']}_{i}.wav")); d = len(a) / SR
            clips.append((cur, a, ln["v"])); sents.append({"text": p, "start": round(cur, 3), "end": round(cur + d, 3)}); cur += d + 0.26
        cur += 0.22 + ln.get("gap", 0.0)
        L = {"id": ln["id"], "v": ln["v"], "slot": [round(slot0, 3), round(cur, 3)], "sents": sents}
        lines.append(L); slot0 = cur
    chapters.append({"id": ch["id"], "card": ch["card"], "mood": ch["mood"], "start": round(c0, 3), "end": round(cur, 3), "lines": lines})
total = cur + 1.0
N = int(total * SR)
vo = np.zeros(N, np.float32)
for t, a, v in clips:
    i = int(t * SR); vo[i:i + len(a)] += a[: N - i]
# lip-sync envelopes for dialogue lines
for ch in chapters:
    for L in ch["lines"]:
        if L["v"] != "N":
            f0, f1 = int(L["slot"][0] * FPS), int(L["slot"][1] * FPS) + 1; env = []
            for f in range(f0, f1):
                seg = vo[int(f / FPS * SR): int((f + 1) / FPS * SR)]; env.append(round(float(min(1, np.sqrt(np.mean(seg ** 2) + 1e-9) / 0.16)), 2))
            L["env0"] = f0; L["env"] = env
json.dump({"fps": FPS, "total": round(total, 3), "card": CARD, "chapters": chapters}, open(os.path.join(B, "timeline.json"), "w"))

# ================= score =================
rng = np.random.default_rng(7)
def lpf(x, k):
    if k <= 1: return x
    c = np.cumsum(np.insert(x, 0, 0.0)); y = (c[k:] - c[:-k]) / k
    return np.pad(y, (0, len(x) - len(y))).astype(np.float32)
def saw(f, tt, det=0.0): return 2 * (((f * (1 + det)) * tt) % 1.0) - 1
def note(f, dur, a=0.01, r=0.1, kind="saw"):
    n = int(dur * SR); tt = np.arange(n) / SR
    x = (saw(f, tt) + saw(f, tt, 0.004) + saw(f, tt, -0.005)) / 3 if kind == "saw" else np.sin(2 * np.pi * f * tt) + (0.3 * np.sin(4 * np.pi * f * tt) if kind == "piano" else 0)
    env = np.minimum(1, tt / a) * np.minimum(1, (dur - tt) / r)
    if kind == "piano": env = env * np.exp(-tt / 0.7)
    return (x * env).astype(np.float32)
def add(buf, x, at, g=1.0):
    i = int(at * SR)
    if i >= len(buf) or i < 0: return
    x = x[: len(buf) - i]; buf[i:i + len(x)] += x * g
def hz(m): return 440 * 2 ** ((m - 69) / 12)
def noise(n): return rng.standard_normal(n).astype(np.float32)

BPM = 96; beat = 60 / BPM; bar = 4 * beat
MIN = [[38, 50, 57, 62, 65], [34, 46, 53, 58, 62], [31, 43, 55, 58, 62], [33, 45, 52, 57, 61]]       # Dm Bb Gm A
MAJ = [[41, 53, 57, 60, 65], [36, 48, 55, 60, 64], [38, 50, 57, 62, 65], [34, 46, 53, 58, 62]]       # F C Dm Bb
def mood_at(t):
    for ch in chapters:
        if ch["start"] <= t < ch["end"]: return ch["mood"], ch
    return "outro", chapters[-1]
line = {L["id"]: L for ch in chapters for L in ch["lines"]}
quiet0, quiet1 = line["h6"]["sents"][-1]["end"] + 0.3, line["h7"]["slot"][0] + 1.0   # the fall: near silence
black0 = line["h11"]["sents"][-1]["end"] + 1.2; out0 = chapters[-1]["start"]
dry = np.zeros(N, np.float32); wet = np.zeros(N, np.float32)
for b in range(int(total / bar) + 1):
    t0 = b * bar; mood, ch = mood_at(t0)
    if quiet0 - bar < t0 < quiet1 or black0 - 0.5 < t0 < out0: continue
    prog = MAJ if mood in ("wonder", "outro") or (mood == "finale" and t0 > line["h7"]["slot"][0]) else MIN
    c = prog[(b // 2) % 4]
    for m in c[1:]: add(wet, lpf(note(hz(m), bar * 1.05, a=0.7, r=0.9), 70), t0, 0.045 if mood != "sad" else 0.035)
    add(dry, lpf(note(hz(c[0] - 12), bar, a=0.3, r=0.6, kind="sine"), 4), t0, 0.16)
    if mood in ("heist", "action", "finale", "outro"):
        g = {"heist": 0.2, "action": 0.3, "finale": 0.26, "outro": 0.2}[mood]
        for k in range(8): add(dry, lpf(note(hz(c[0]), beat * 0.48, a=0.005, r=0.12), 40), t0 + k * beat / 2, g * (1.0 if k % 2 == 0 else 0.7))
    if mood in ("heist", "action", "outro"):
        for k in range(8): add(wet, note(hz(c[1 + (k * 2) % 4] + 12), beat * 0.45, a=0.004, r=0.3, kind="sine"), t0 + k * beat / 2, 0.05)
    if mood in ("action", "finale"):
        for k in range(16):
            n = int(0.03 * SR); h = noise(n) * np.exp(-np.arange(n) / (0.006 * SR)); add(dry, h - lpf(h, 8), t0 + k * beat / 4, 0.035 if k % 4 else 0.07)
        for k in (0, 2, 2.5):
            n = int(0.5 * SR); tt = np.arange(n) / SR; add(dry, (np.sin(2 * np.pi * (45 * tt + 22 * (1 - np.exp(-tt * 18)) / 18 * 18 * 0.06)) * np.exp(-tt / 0.16)).astype(np.float32), t0 + k * beat, 0.5)
    if mood in ("sad", "wonder", "mystery", "finale", "outro"):
        mel = [c[3] + 12, c[4] + 12, c[2] + 12, c[3] + 12] if b % 2 == 0 else [c[4] + 12, c[3] + 12, c[2] + 12, c[1] + 24]
        for k, m in enumerate(mel): add(wet, note(hz(m), beat * 2.2, a=0.005, r=0.4, kind="piano"), t0 + k * beat, 0.11 if mood != "mystery" else 0.06)
    if mood == "finale" and t0 > line["h3"]["slot"][0]:
        for m in c[2:]: add(wet, lpf(note(hz(m + 12), bar * 1.05, a=1.2, r=1.0), 30), t0, 0.03)

def braam(at, g=0.5, dur=3.0):
    n = int(dur * SR); tt = np.arange(n) / SR
    x = sum(saw(hz(m), tt, d) for m in (26, 38, 45) for d in (0, 0.006, -0.007)) / 9
    add(wet, (np.tanh(3 * lpf(x.astype(np.float32), 30)) * np.minimum(1, tt / 0.05) * np.exp(-tt / 1.0)).astype(np.float32), at, g)
def whoosh(at, g=0.2, dur=0.6):
    n = int(dur * SR); tt = np.arange(n) / SR; add(wet, lpf(noise(n), 25) * (np.sin(np.pi * tt / dur) ** 3 * 3).astype(np.float32), at - dur * 0.6, g)
def riser(at, dur=1.6, g=0.12):
    n = int(dur * SR); tt = np.arange(n) / SR; add(wet, (lpf(noise(n), 12) * (tt / dur) ** 2.5).astype(np.float32), at - dur, g)
def boom(at, g=0.9):
    n = int(1.4 * SR); tt = np.arange(n) / SR; add(dry, (np.sin(2 * np.pi * (38 * tt + 6 * np.exp(-tt * 8))) * np.exp(-tt / 0.4)).astype(np.float32), at, g); add(wet, lpf(noise(n), 60) * np.exp(-tt / 0.3).astype(np.float32), at, g * 0.8)

braam(0.2, 0.45); braam(line["p5"]["sents"][-1]["end"] + 0.5, 0.75)
for ch in chapters:
    if ch["card"]: riser(ch["start"] + 0.1); braam(ch["start"] + 0.15, 0.55)
    for L in ch["lines"]: whoosh(L["slot"][0], 0.1)
S = lambda i, k=0: line[i]["sents"][k]["start"]
boom(S("a8", 1)); boom(S("e3")); boom(line["e9"]["sents"][-1]["start"] + 0.5); boom(S("h1", 1)); boom(S("h1", 2)); boom(S("h1", 3)); boom(quiet0 - 0.2, 0.7)
n = int(1.3 * SR); tt = np.arange(n) / SR   # train horn
add(wet, (lpf(((saw(233, tt) + saw(277, tt) + saw(349, tt)) / 3).astype(np.float32), 14) * np.minimum(1, tt / 0.05) * np.minimum(1, (1.3 - tt) / 0.2)).astype(np.float32), S("e3") - 0.5, 0.22)
tfall = line["h10"]["sents"][-1]["end"] - 0.35   # the top clatters
for k in range(9): add(wet, note(2600 + 300 * (k % 3), 0.09, a=0.001, r=0.08, kind="sine"), tfall + 0.05 * k * (1 + k * 0.12), 0.1 * (0.85 ** k))
# ambience beds
ambx = np.zeros(N, np.float32)
def bed(kind, n):
    tt = np.arange(n) / SR; x = noise(n)
    if kind == "sea": return lpf(x, 40) * (0.5 + 0.5 * np.sin(2 * np.pi * tt / 7.0)) ** 2 * 1.6
    if kind == "rain": return (x - lpf(x, 6)) * 0.35 + lpf(x, 80) * 0.5
    if kind == "wind": return lpf(x, 30) * (0.55 + 0.45 * np.sin(2 * np.pi * tt / 5.3 + 1)) * 1.2
    if kind == "city": return lpf(x, 120) * 2.2
    if kind == "plane": return lpf(x, 90) * 2.6
    if kind == "room": return lpf(x, 200) * 1.2
    return x * 0
marks = amb_marks + [(total, "none")]
for (t0, k), (t1, _) in zip(marks, marks[1:]):
    n = int((t1 - t0 + 0.6) * SR); x = bed(k, n).astype(np.float32); f = int(0.6 * SR); x[:f] *= np.linspace(0, 1, f); x[-f:] *= np.linspace(1, 0, f); add(ambx, x, t0, 0.09)
# reverb on wet bus
def reverb(x, seed):
    r = np.random.default_rng(seed); n = int(2.4 * SR); ir = r.standard_normal(n) * np.exp(-np.arange(n) / (0.55 * SR)); ir[: int(0.01 * SR)] = 0
    L = 1 << int(np.ceil(np.log2(len(x) + n))); y = np.fft.irfft(np.fft.rfft(x, L) * np.fft.rfft(ir, L), L)[: len(x)]
    return (y / 28).astype(np.float32)
for i0, i1 in ((int(quiet0 * SR), int(quiet1 * SR)), (int(black0 * SR), int(out0 * SR))):
    f = int(0.25 * SR)
    for bus in (dry, wet, ambx): bus[i0:i0 + f] *= np.linspace(1, 0, f); bus[i0 + f:i1] = 0
env = lpf(np.abs(vo), int(0.3 * SR)); duck = 1 - 0.6 * np.clip(env / 0.07, 0, 1)
out = []
for seed in (1, 2):
    mus = dry + wet * 0.75 + reverb(wet, seed) * 0.9
    out.append(np.tanh((vo + mus * duck * 0.95 + ambx * (0.6 + 0.4 * duck)) * 1.05) * 0.9)
st = np.stack(out, 1)
w = wave.open(os.path.join(B, "audio.wav"), "w"); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((st * 32767).astype(np.int16).tobytes()); w.close()
print("total %.1fs (%d:%02d)" % (total, total // 60, total % 60))
for ch in chapters: print(f"  {ch['id']}  {ch['start']:6.1f} - {ch['end']:6.1f}  {ch['mood']}")
