#!/usr/bin/env python3
"""Speak a script's voice-over and time the film to it.

    python3 voice.py SCRIPT.json --out DIR [--voice en_US-lessac-medium]
                     [--pace 1.0] [--gap 0.28] [--lead 0.25] [--tail 1.0] [--chunk 3]

Reads beats[].vo from the script, speaks each beat on its own (so every beat's
start and end are known exactly), lays them end to end and writes:
  DIR/vo.wav        the whole voice track
  DIR/timing.json   per-beat times, shot boundaries and ready-made captions
  DIR/timing.js     the same as `window.TIMING = {...}`, for the composition to load
                    with a <script> tag (a page opened from disk cannot fetch JSON)

The film is cut to the voice, never the other way round: build the composition
from timing.json. A beat with no "vo" holds for its "hold_s" (default 1.5 s).
A beat may set "pause_after_s" to breathe longer than --gap.

If you have a recorded or generated voice instead, put it at DIR/vo.wav and run
transcribe.py on it to get word times; this tool is the built-in fallback.
Needs piper-tts and a voice model: run tools/setup.sh once.
"""
import argparse
import json
import re
import sys
import wave
from pathlib import Path

import numpy as np

VOICE_DIR = Path.home() / ".cache" / "video-pipeline" / "voices"


def load_voice(name):
    try:
        from piper import PiperVoice
    except ImportError:
        sys.exit("piper-tts is not installed. Run: bash video-pipeline/tools/setup.sh")
    model = Path(name) if name.endswith(".onnx") else VOICE_DIR / f"{name}.onnx"
    if not model.is_file():
        sys.exit(f"voice model not found: {model}\nRun: bash video-pipeline/tools/setup.sh {name}")
    return PiperVoice.load(str(model))


def speak(voice, text, pace, tmp):
    from piper import SynthesisConfig
    with wave.open(str(tmp), "wb") as w:
        voice.synthesize_wav(text, w, syn_config=SynthesisConfig(length_scale=1.0 / pace))
    with wave.open(str(tmp), "rb") as w:
        sr = w.getframerate()
        x = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768
    # trim the silence the model leaves at both ends
    loud = np.abs(x) > 0.01
    if loud.any():
        a = max(0, int(np.argmax(loud)) - int(0.02 * sr))
        b = min(len(x), len(x) - int(np.argmax(loud[::-1])) + int(0.06 * sr))
        x = x[a:b]
    return x, sr


def chunks(text, start, end, size):
    """Split one spoken beat into caption groups of at most `size` words,
    breaking early at punctuation, timed by share of letters."""
    words = text.split()
    groups, cur = [], []
    for w in words:
        cur.append(w)
        if len(cur) >= size or re.search(r"[.,;:!?…—]$", w):
            groups.append(cur)
            cur = []
    if cur:
        groups.append(cur)
    merged = []
    for g in groups:                               # no one-word caption left dangling mid-sentence
        if merged and len(g) == 1 and len(merged[-1]) <= size and not re.search(r"[.!?…]$", merged[-1][-1]):
            merged[-1] = merged[-1] + g
        else:
            merged.append(g)
    groups = merged
    weights = [sum(len(re.sub(r"\W", "", w)) + 1.5 for w in g) for g in groups]
    total = sum(weights) or 1
    out, t = [], start
    for g, wt in zip(groups, weights):
        d = (end - start) * wt / total
        out.append({"start": round(t, 3), "end": round(t + d, 3), "text": " ".join(g)})
        t += d
    return out


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("script")
    ap.add_argument("--out", required=True)
    ap.add_argument("--voice", default="en_US-lessac-medium")
    ap.add_argument("--pace", type=float, default=1.0, help="1.0 normal, 0.9 slower, 1.1 faster")
    ap.add_argument("--gap", type=float, default=0.28, help="silence between beats, seconds")
    ap.add_argument("--lead", type=float, default=0.25, help="silence before the first word")
    ap.add_argument("--tail", type=float, default=1.0, help="picture held after the last word")
    ap.add_argument("--chunk", type=int, default=3, help="most words in one caption")
    args = ap.parse_args()

    script = json.loads(Path(args.script).read_text())
    beats = script["beats"]
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    voice = load_voice(args.voice)

    sr, parts, rows, caps, t = None, [], [], [], args.lead
    for i, b in enumerate(beats):
        text = (b.get("vo") or "").strip()
        pause = float(b.get("pause_after_s", args.gap))
        if text:
            x, sr_b = speak(voice, text, args.pace, out / "_beat.wav")
            sr = sr or sr_b
            dur = len(x) / sr
            parts.append((t, x))
            rows.append({"id": b["id"], "vo_start": round(t, 3), "vo_end": round(t + dur, 3), "text": text})
            caps += chunks(text, t, t + dur, args.chunk)
            t += dur + pause
        else:
            hold = float(b.get("hold_s", 1.5))
            rows.append({"id": b["id"], "vo_start": None, "vo_end": None, "text": "", "hold": [round(t, 3), round(t + hold, 3)]})
            t += hold
    (out / "_beat.wav").unlink(missing_ok=True)
    if sr is None:
        sys.exit("the script has no voice-over lines (beats[].vo)")
    total = t - args.gap + args.tail if rows[-1]["vo_end"] is not None else t + args.tail
    total = round(round(total * 24) / 24, 4)          # a whole number of frames at 24 fps

    track = np.zeros(int(total * sr) + 1, np.float32)
    for start, x in parts:
        i = int(start * sr)
        track[i:i + len(x)] += x[:len(track) - i]
    with wave.open(str(out / "vo.wav"), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes((np.clip(track, -1, 1) * 32767).astype(np.int16).tobytes())

    # a beat's picture starts a touch before its first word and runs to the next beat's start
    edges = []
    for i, r in enumerate(rows):
        s = r["vo_start"] if r["vo_start"] is not None else r["hold"][0]
        edges.append(0.0 if i == 0 else round(max(s - 0.12, 0), 3))
    for i, r in enumerate(rows):
        r["shot_start"] = edges[i]
        r["shot_end"] = edges[i + 1] if i + 1 < len(rows) else total
        r["shot_dur"] = round(r["shot_end"] - r["shot_start"], 3)
        r.pop("hold", None)

    words = sum(len(r["text"].split()) for r in rows)
    spoken = sum(r["vo_end"] - r["vo_start"] for r in rows if r["vo_end"] is not None)
    timing = {"duration": total, "voice": args.voice, "pace": args.pace,
              "words": words, "words_per_minute": round(words / spoken * 60) if spoken else 0,
              "speech_share": round(spoken / total, 3), "beats": rows, "captions": caps}
    (out / "timing.json").write_text(json.dumps(timing, indent=1))
    (out / "timing.js").write_text("window.TIMING = " + json.dumps(timing, indent=1) + ";\n")
    print(f"{len(rows)} beats, {words} words, {total:.2f} s, {timing['words_per_minute']} words a minute, "
          f"voice on {timing['speech_share']:.0%} of the run")
    print(f"wrote {out / 'vo.wav'} and {out / 'timing.json'}")


if __name__ == "__main__":
    main()
