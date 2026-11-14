#!/usr/bin/env python3
"""Prepare a panel-show episode ("engine": "stage").

Speaks every line with its character's Kokoro voice and measures how loud each
1/30 s of it is, so the engine can open the puppet's mouth in time with the voice.

  python3 chatvid/tools/stage_prepare.py chatvid/episodes/latency-ep1.json

Each character in the episode's "cast" has a voice:
  "voice": {"blend": {"am_puck": 1.0}, "speed": 1.04, "pitch": 2.5}
"blend" mixes Kokoro voices, "pitch" shifts by semitones (formants kept), "fx" is an
optional ffmpeg filter chain. Lines are cached by content: only edits are re-voiced.
A beat's "speak" overrides how its "line" is pronounced.

Writes chatvid/assets/voice/<episode>/: one WAV per line and plan.json.
Needs `pip install kokoro-onnx soundfile` (Kokoro is Apache-2.0).
"""
import hashlib, json, os, subprocess, sys, urllib.request, wave

import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VOICES = os.path.join(ROOT, "assets", "voices", "kokoro")
KOKORO = "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/"
FPS = 30


def model():
    from kokoro_onnx import Kokoro
    os.makedirs(VOICES, exist_ok=True)
    for f in ("kokoro-v1.0.onnx", "voices-v1.0.bin"):
        if not os.path.exists(os.path.join(VOICES, f)):
            print(f"  downloading {f}")
            urllib.request.urlretrieve(KOKORO + f, os.path.join(VOICES, f))
    return Kokoro(os.path.join(VOICES, "kokoro-v1.0.onnx"), os.path.join(VOICES, "voices-v1.0.bin"))


def envelope(path):
    """Loudness per video frame as a string of digits 0-9 (0 = silent, 9 = loudest)."""
    w = wave.open(path)
    sr, n = w.getframerate(), w.getnframes()
    x = np.frombuffer(w.readframes(n), np.int16).astype(np.float32) / 32768
    step = sr // FPS
    rms = np.array([np.sqrt(np.mean(x[i:i + step] ** 2)) for i in range(0, max(len(x) - step, 1), step)])
    ref = np.percentile(rms, 92) or 1e-6
    e = np.clip(rms / ref, 0, 1) ** 0.7
    e = np.convolve(np.concatenate([[e[0]], e, [e[-1]]]), [0.25, 0.5, 0.25], mode="valid")   # soften the flapping
    return "".join(str(int(round(v * 9))) for v in e), round(n / sr, 3)


def main(ep_path):
    import soundfile as sf
    ep = json.load(open(ep_path, encoding="utf-8"))
    slug = os.path.splitext(os.path.basename(ep_path))[0]
    out = os.path.join(ROOT, "assets", "voice", slug)
    os.makedirs(out, exist_ok=True)
    k, styles = None, {}
    plan, keep, total = [], set(), 0.0
    for i, b in enumerate(ep["beats"]):
        entry = {}
        if b.get("line"):
            who = b["who"]
            v = ep["cast"][who]["voice"]
            text = b.get("speak", b["line"])
            h = hashlib.sha1(json.dumps([text, v, b.get("speed"), "v2"], sort_keys=True).encode()).hexdigest()[:10]
            fn = f"{h}.wav"
            path = os.path.join(out, fn)
            if not os.path.exists(path):
                k = k or model()
                if who not in styles:
                    styles[who] = sum(k.get_voice_style(name) * wgt for name, wgt in v["blend"].items())
                # one- to three-word lines are the easiest to garble: say them a little slower
                speed = b.get("speed", v.get("speed", 1.0) * (0.93 if len(text.split()) <= 3 else 1.0))
                a, sr = k.create(text, voice=styles[who], speed=speed, lang=v.get("lang", "en-us"))
                raw = path + ".raw.wav"
                sf.write(raw, np.asarray(a, dtype=np.float32), sr)
                # pad first: the pitch shifter smears whatever sits at the very start of a file
                af = ["adelay=140", "apad=pad_dur=0.25"]
                if v.get("pitch"):
                    af.append(f"rubberband=pitch={2 ** (v['pitch'] / 12):.5f}:formant=preserved")
                if v.get("fx"):
                    af.append(v["fx"])
                # trim the silence Kokoro leaves at both ends so lines can be cut tightly together
                af.append("silenceremove=start_periods=1:start_threshold=-52dB:start_silence=0.05,areverse,"
                          "silenceremove=start_periods=1:start_threshold=-52dB:start_silence=0.08,areverse")
                subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", raw, "-af", ",".join(af),
                                "-ac", "1", "-ar", "48000", "-c:a", "pcm_s16le", path], check=True)
                os.remove(raw)
            entry["voice"] = fn
            entry["env"], entry["voiceDur"] = envelope(path)
            keep.add(fn)
            total += entry["voiceDur"]
        plan.append(entry)
        if b.get("line"):
            print(f"  {i:03d} {entry['voiceDur']:5.2f}s  {b['who']:12} {b['line'][:74]}")
    for f in os.listdir(out):
        if f.endswith(".wav") and f not in keep:
            os.remove(os.path.join(out, f))
    json.dump({"beats": plan}, open(os.path.join(out, "plan.json"), "w"))
    print(f"  {len(keep)} lines, {total:.0f}s of speech")


if __name__ == "__main__":
    main(sys.argv[1])
