#!/usr/bin/env python3
"""
Free, offline narration with Piper TTS, plus word-level caption timings.

    pip install piper-tts numpy
    python3 scripts/voiceover.py src/stories/nobody/script.json

Writes, next to the story's public folder (public/stories/<name>/):
    vo.wav          the full narration, lines joined with the script's pauses
    timeline.json   { fps-free ms timings }  lines[] and words[] (@remotion/captions Caption shape)

Each line is synthesised on its own, so line timings are exact. Inside a line,
speech start/end are found from the waveform and words are spread across the
spoken span by length (letters + a small per-word constant), with extra weight
after commas. That lands within a frame or two for short narration lines.

Voices: https://huggingface.co/rhasspy/piper-voices (downloaded on first use to
~/.cache/shorts3d-voices). en_US-ryan-high is a calm documentary-style male voice.
"""
import json, re, sys, wave, urllib.request
from pathlib import Path

import numpy as np
from piper import PiperVoice

ROOT = Path(__file__).resolve().parent.parent
CACHE = Path.home() / ".cache" / "shorts3d-voices"
HF = "https://huggingface.co/rhasspy/piper-voices/resolve/main"


def voice_path(name: str) -> Path:
    lang, region, speaker, quality = name.split("-")[0].split("_")[0], name.split("-")[0], name.split("-")[1], name.split("-")[2]
    CACHE.mkdir(parents=True, exist_ok=True)
    onnx = CACHE / f"{name}.onnx"
    for suffix in (".onnx", ".onnx.json"):
        dst = CACHE / f"{name}{suffix}"
        if not dst.exists():
            url = f"{HF}/{lang}/{region}/{speaker}/{quality}/{name}{suffix}"
            print(f"downloading {url}")
            urllib.request.urlretrieve(url, dst)
    return onnx


def synth(voice: PiperVoice, text: str, length_scale: float) -> np.ndarray:
    from piper import SynthesisConfig
    cfg = SynthesisConfig(length_scale=length_scale)
    chunks = [c.audio_int16_array for c in voice.synthesize(text, syn_config=cfg)]
    return np.concatenate(chunks)


def speech_span(audio: np.ndarray, sr: int, thresh=0.02):
    """First/last sample where 10 ms RMS exceeds thresh (relative to peak)."""
    x = audio.astype(np.float32) / 32768.0
    win = int(sr * 0.01)
    n = len(x) // win
    rms = np.sqrt((x[: n * win].reshape(n, win) ** 2).mean(axis=1))
    on = np.where(rms > thresh * rms.max())[0]
    if len(on) == 0:
        return 0, len(x)
    return on[0] * win, min(len(x), (on[-1] + 1) * win)


def word_weights(words):
    w = []
    for word in words:
        letters = len(re.sub(r"[^A-Za-z0-9']", "", word))
        weight = letters + 2.0
        if re.search(r"[,;:]$", word):
            weight += 3.0  # the voice pauses after commas
        w.append(weight)
    return np.array(w)


def main(script_path: str):
    script_path = Path(script_path).resolve()
    script = json.loads(script_path.read_text())
    story = script_path.parent.name
    out_dir = ROOT / "public" / "stories" / story
    out_dir.mkdir(parents=True, exist_ok=True)

    voice = PiperVoice.load(str(voice_path(script["voice"])))
    sr = voice.config.sample_rate
    scale = float(script.get("lengthScale", 1.0))

    pieces, lines, words = [], [], []
    t = int(sr * 0.25)  # short breath before the first line
    pieces.append(np.zeros(t, np.int16))

    for line in script["lines"]:
        audio = synth(voice, line["text"], scale)
        s0, s1 = speech_span(audio, sr)
        start_ms = (t + s0) / sr * 1000
        end_ms = (t + s1) / sr * 1000
        lines.append({"id": line["id"], "text": line["text"], "startMs": round(start_ms), "endMs": round(end_ms)})

        toks = line["text"].split()
        wts = word_weights(toks)
        edges = np.concatenate([[0], np.cumsum(wts)]) / wts.sum()
        for i, tok in enumerate(toks):
            ws = start_ms + edges[i] * (end_ms - start_ms)
            we = start_ms + edges[i + 1] * (end_ms - start_ms)
            words.append({
                "text": (" " if words else "") + tok,
                "startMs": round(ws), "endMs": round(we),
                "timestampMs": round(ws), "confidence": 1,
                # a new caption page starts with every narration line
                "pageBreakAfter": i == len(toks) - 1,
            })

        pieces.append(audio)
        t += len(audio)
        gap = np.zeros(int(sr * float(line.get("pause", 0.3))), np.int16)
        pieces.append(gap)
        t += len(gap)

    full = np.concatenate(pieces)
    with wave.open(str(out_dir / "vo.wav"), "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sr)
        wf.writeframes(full.tobytes())

    timeline = {"durationMs": round(len(full) / sr * 1000), "lines": lines, "words": words}
    (script_path.parent / "timeline.json").write_text(json.dumps(timeline, indent=1))
    print(f"vo.wav {timeline['durationMs'] / 1000:.2f}s, {len(lines)} lines, {len(words)} words")
    for l in lines:
        print(f"  {l['startMs'] / 1000:6.2f}-{l['endMs'] / 1000:6.2f}  {l['id']:8s} {l['text']}")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "src/stories/nobody/script.json")
