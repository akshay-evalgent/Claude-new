"""Narration for an AI-footage documentary with Kokoro TTS (Apache-2.0, CPU).

    python3 ai-documentary/scripts/narrate.py DOC_DIR KOKORO.onnx VOICES.bin [--voice bm_george] [--speed 0.9]

Reads DOC_DIR/shots.json ("lines": one narration line per beat). Writes DOC_DIR/audio/: narration.flac (-16 LUFS),
narration.srt and timings.json (start/end of each beat, including the pause after it).
"""
import argparse, json, os, re, subprocess
import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro

LEAD, GAP, TAIL = 1.5, 1.4, 4.0  # silence before the first line, between beats, and for the end card
SAY = [(r"\bBrihadeeswarar\b", "Bree-ha-dee-shwa-rar"), (r"\bThanjavur\b", "Tun-jah-voor"), (r"\bChola\b", "Cho-la"),
       (r"\bRaja Raja\b", "Raa-ja Raa-ja"), (r"\b1003\b", "ten oh three"), (r"\b1010\b", "ten ten")]


def speakable(t):
    for a, b in SAY:
        t = re.sub(a, b, t)
    return t


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("doc"); ap.add_argument("model"); ap.add_argument("voices")
    ap.add_argument("--voice", default="bm_george"); ap.add_argument("--speed", type=float, default=0.9)
    a = ap.parse_args()
    lines = json.load(open(os.path.join(a.doc, "shots.json")))["lines"]
    out = os.path.join(a.doc, "audio"); os.makedirs(out, exist_ok=True)
    k, sr = Kokoro(a.model, a.voices), 24000
    parts, beats, pos = [np.zeros(int(LEAD * sr), np.float32)], [], LEAD
    for i, line in enumerate(lines):
        start = pos
        # say each sentence separately with a short breath between: steadier pacing than one long take
        for j, sent in enumerate(re.split(r"(?<=[.?!])\s+", line)):
            if j:
                parts.append(np.zeros(int(0.35 * sr), np.float32)); pos += 0.35
            w, r = k.create(speakable(sent), voice=a.voice, speed=a.speed, lang="en-gb" if a.voice.startswith("b") else "en-us")
            w = w.astype(np.float32)
            nz = np.flatnonzero(np.abs(w) > 0.01)
            if len(nz):
                w = w[max(0, nz[0] - int(0.03 * sr)): nz[-1] + int(0.08 * sr)]
            parts.append(w); pos += len(w) / sr
        speech_end = pos
        gap = GAP if i < len(lines) - 1 else TAIL
        parts.append(np.zeros(int(gap * sr), np.float32)); pos += gap
        beats.append({"beat": i + 1, "start": round(start, 3), "speech_end": round(speech_end, 3), "end": round(pos, 3), "text": line})
        print(f"beat {i + 1:>2}  {start:6.1f}s  {speech_end - start:5.1f}s", flush=True)
    beats[0]["start"] = 0.0  # the opening shot starts with the lead-in
    raw = os.path.join(out, "_raw.wav")
    sf.write(raw, np.concatenate(parts), sr)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", raw, "-af", "loudnorm=I=-16:TP=-1.5:LRA=11", "-ar", "48000",
                    os.path.join(out, "narration.flac")], check=True)
    os.remove(raw)

    def ts(x):
        h, r = divmod(x, 3600); m, s = divmod(r, 60)
        return f"{int(h):02d}:{int(m):02d}:{int(s):02d},{int(round((s % 1) * 1000)) % 1000:03d}"
    with open(os.path.join(out, "narration.srt"), "w", encoding="utf-8") as f:
        for i, b in enumerate(beats, 1):
            f.write(f"{i}\n{ts(b['start'] if i > 1 else LEAD)} --> {ts(b['speech_end'])}\n{b['text']}\n\n")
    json.dump({"duration": round(pos, 2), "beats": beats}, open(os.path.join(out, "timings.json"), "w"), indent=1)
    print(f"total {pos:.1f} s ({pos / 60:.2f} min)")


if __name__ == "__main__":
    main()
