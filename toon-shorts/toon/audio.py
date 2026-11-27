"""Voices (Piper TTS, cached), synthesized SFX, lip-sync envelopes, mixing."""
import hashlib
import os
import subprocess
import sys
import wave

import numpy as np

SR = 44100
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VOICE_DIR = os.path.join(ROOT, ".cache", "voices")
TTS_DIR = os.path.join(ROOT, ".cache", "tts")
VOICE_BASE = "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US"


def ensure_voice(name):
    """name like 'en_US-ryan-medium'. Downloads the model on first use."""
    os.makedirs(VOICE_DIR, exist_ok=True)
    path = os.path.join(VOICE_DIR, name + ".onnx")
    if not os.path.exists(path):
        _, speaker, quality = name.split("-")
        for ext in (".onnx", ".onnx.json"):
            url = f"{VOICE_BASE}/{speaker}/{quality}/{name}{ext}"
            print(f"  downloading {url}", file=sys.stderr)
            subprocess.run(["curl", "-sfL", "-o", os.path.join(VOICE_DIR, name + ext), url], check=True)
    return path


def _load(path, filt=None):
    af = ["-af", filt] if filt else []
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, *af, "-ac", "1", "-ar", str(SR),
                          "-f", "f32le", "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).copy()


def tts(text, voice):
    """voice: dict(model, speed=1.0, pitch=1.0, noise=0.667). Returns mono float32 @ SR."""
    model = ensure_voice(voice["model"])
    speed = voice.get("speed", 1.0)
    pitch = voice.get("pitch", 1.0)
    key = hashlib.sha1(repr((text, voice["model"], speed, voice.get("noise"))).encode()).hexdigest()[:16]
    os.makedirs(TTS_DIR, exist_ok=True)
    wav = os.path.join(TTS_DIR, key + ".wav")
    if not os.path.exists(wav):
        cmd = [sys.executable, "-m", "piper", "-m", model, "-f", wav, "--length-scale", str(1.0 / speed)]
        if voice.get("noise") is not None:
            cmd += ["--noise-scale", str(voice["noise"])]
        subprocess.run(cmd, input=text.encode(), check=True, capture_output=True)
    filt = None
    if abs(pitch - 1.0) > 1e-3:
        with wave.open(wav) as w:
            sr = w.getframerate()
        # change pitch, then restore tempo partially (old/slow voices keep some drag)
        tempo = voice.get("tempo_fix", 1.0 / pitch)
        filt = f"asetrate={int(sr * pitch)},aresample={SR},atempo={tempo:.4f}"
    y = _load(wav, filt)
    # trim leading/trailing silence
    nz = np.where(np.abs(y) > 0.01)[0]
    if len(nz):
        y = y[max(0, nz[0] - 400): nz[-1] + 1200]
    return y * voice.get("gain", 1.0)


def envelope(y, fps):
    """Per-frame mouth openness 0..1 from speech amplitude."""
    hop = SR / fps
    n = int(np.ceil(len(y) / hop))
    env = np.array([np.sqrt(np.mean(y[int(i * hop): int((i + 1) * hop)] ** 2) + 1e-12) for i in range(n)])
    ref = np.percentile(env, 90) + 1e-6
    env = np.clip(env / ref, 0, 1)
    # quantise like limited animation: closed / half / open, with a bit of variety
    out = np.where(env < 0.18, 0.0, np.where(env < 0.55, 0.45, 0.9))
    for i in range(1, n - 1):  # avoid one-frame flickers
        if out[i] != out[i - 1] and out[i] != out[i + 1]:
            out[i] = out[i - 1]
    return out


# ------------------------------------------------------------------ SFX
def _t(d):
    return np.arange(int(SR * d)) / SR


def _noise(d, seed=0):
    return np.random.default_rng(seed).standard_normal(int(SR * d)).astype(np.float32)


def _lp(x, a):
    y = np.empty_like(x)
    acc = 0.0
    for i, v in enumerate(x):
        acc += a * (v - acc)
        y[i] = acc
    return y


def _fade(x, fin=0.005, fout=0.05):
    n1, n2 = int(SR * fin), int(SR * fout)
    x = x.copy()
    if n1:
        x[:n1] *= np.linspace(0, 1, n1)
    if n2:
        x[-n2:] *= np.linspace(1, 0, n2)
    return x


def sfx_whoosh(d=0.35):
    t = _t(d)
    n = _noise(d, 1)
    env = np.sin(np.pi * t / d) ** 2
    lo = _lp(n, 0.08)
    hi = n - _lp(n, 0.3)
    mixr = np.linspace(0.2, 1.0, len(t))
    return _fade((lo * (1 - mixr) * 3 + hi * mixr * 0.6) * env * 0.5)


def sfx_impact(d=0.6):
    t = _t(d)
    f = 120 * np.exp(-t * 6) + 40
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 7)
    click = _lp(_noise(d, 2), 0.25) * np.exp(-t * 40) * 1.5
    return _fade((body + click) * 0.8)


def sfx_door(d=0.5):
    t = _t(d)
    thud = np.sin(2 * np.pi * 70 * t) * np.exp(-t * 14)
    rattle = _lp(_noise(d, 3), 0.2) * np.exp(-t * 18) * 1.2
    return _fade((thud + rattle) * 0.9)


def sfx_creak(d=1.1):
    t = _t(d)
    f = 260 + 90 * np.sin(2 * np.pi * 1.3 * t) + 40 * np.sin(2 * np.pi * 7 * t)
    ph = np.cumsum(f) / SR
    saw = 2 * (ph % 1) - 1
    grain = (np.sin(2 * np.pi * 38 * t) > 0.2).astype(np.float32)
    x = _lp(saw * (0.6 + 0.4 * grain), 0.2)
    return _fade(x * np.sin(np.pi * t / d) * 0.35, 0.05, 0.2)


def sfx_tick(d=1.6, n=4):
    out = np.zeros(int(SR * d), np.float32)
    for k in range(n):
        s = int(SR * k * d / n)
        tt = _t(0.06)
        f = 2400 if k % 2 == 0 else 1800
        click = np.sin(2 * np.pi * f * tt) * np.exp(-tt * 90)
        out[s:s + len(click)] += click * 0.6
    return out


def sfx_steps(d=1.2, n=4, seed=5):
    out = np.zeros(int(SR * d), np.float32)
    for k in range(n):
        s = int(SR * (0.05 + k * d / n))
        tt = _t(0.12)
        st = (np.sin(2 * np.pi * 90 * tt) * 0.8 + _lp(_noise(0.12, seed + k), 0.3)) * np.exp(-tt * 35)
        out[s:s + len(st)] += st[: len(out) - s] * 0.55
    return out


def sfx_sip(d=0.9):
    t = _t(d)
    n = _noise(d, 9)
    band = _lp(n, 0.35) - _lp(n, 0.05)
    trem = 0.5 + 0.5 * np.sin(2 * np.pi * 11 * t)
    return _fade(band * trem * np.sin(np.pi * t / d) * 0.9, 0.05, 0.1)


def sfx_sad_trombone(d=2.6):
    notes = [(311.1, 0.42), (293.7, 0.42), (277.2, 0.42), (261.6, 1.3)]
    out = []
    for i, (f0, nd) in enumerate(notes):
        t = _t(nd)
        vib = 1 + (0.012 * np.sin(2 * np.pi * 5.5 * t) * (t / nd) if i == 3 else 0)
        bend = 1 - (0.03 * (t / nd) if i == 3 else 0)
        ph = np.cumsum(f0 * vib * bend) / SR
        tone = sum(np.sin(2 * np.pi * ph * h) / h ** 1.1 for h in range(1, 9))
        env = np.minimum(1, t / 0.04) * np.minimum(1, (nd - t) / 0.08)
        out.append(_lp(tone, 0.35) * env * 0.28)
    return np.concatenate(out)


def sfx_pop(d=0.12):
    t = _t(d)
    f = 900 * np.exp(-t * 30) + 300
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 30) * 0.5


def sfx_ding(d=1.0):
    t = _t(d)
    return (np.sin(2 * np.pi * 1318 * t) + 0.5 * np.sin(2 * np.pi * 1976 * t)) * np.exp(-t * 4) * 0.35


SFX = {
    "whoosh": sfx_whoosh, "impact": sfx_impact, "door": sfx_door, "creak": sfx_creak,
    "tick": sfx_tick, "steps": sfx_steps, "sip": sfx_sip, "sad_trombone": sfx_sad_trombone,
    "pop": sfx_pop, "ding": sfx_ding,
}


def room_tone(d, level=0.004):
    n = _noise(d, 11)
    return _lp(n, 0.02) * level * 20


class Mixer:
    def __init__(self, dur):
        self.buf = np.zeros(int(SR * dur) + SR, np.float32)

    def add(self, clip, at, gain=1.0):
        s = int(SR * at)
        if s >= len(self.buf):
            return
        e = min(len(self.buf), s + len(clip))
        self.buf[s:e] += clip[: e - s].astype(np.float32) * gain

    def write(self, path, dur):
        y = self.buf[: int(SR * dur)]
        peak = np.max(np.abs(y)) + 1e-9
        y = np.tanh(y / peak * 1.2) * 0.9
        pcm = (y * 32767).astype(np.int16)
        with wave.open(path, "wb") as w:
            w.setnchannels(1)
            w.setsampwidth(2)
            w.setframerate(SR)
            w.writeframes(pcm.tobytes())
