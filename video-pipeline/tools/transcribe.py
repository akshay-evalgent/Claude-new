#!/usr/bin/env python3
"""Transcribe the speech in a video or audio file, with word times.

    python3 transcribe.py VIDEO_OR_AUDIO --out DIR [--model base] [--language en]

Writes DIR/transcript.json (segments, words, speech stats) and DIR/transcript.md
(one timed line per sentence). The stats are what the critics compare:
words a minute, when the first word lands, and every pause longer than 0.7 s.

Needs faster-whisper: run tools/setup.sh once. If a video has no speech (music
and on-screen text only), this writes an empty transcript and says so; read the
words off the contact sheets instead.
"""
import argparse
import json
import subprocess
import sys
from pathlib import Path

import numpy as np


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("media")
    ap.add_argument("--out", required=True)
    ap.add_argument("--model", default="base", help="tiny, base, small, medium; bigger is slower and more accurate")
    ap.add_argument("--language", default=None)
    args = ap.parse_args()
    if not Path(args.media).is_file():
        sys.exit(f"no such file: {args.media}")
    try:
        from faster_whisper import WhisperModel
    except ImportError:
        sys.exit("faster-whisper is not installed. Run: bash video-pipeline/tools/setup.sh")

    # decode with ffmpeg ourselves: the library's own decoder breaks on some PyAV versions
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", args.media, "-vn", "-ac", "1", "-ar", "16000",
                          "-f", "f32le", "-"], capture_output=True).stdout
    audio = np.frombuffer(raw, np.float32)
    if len(audio) < 1600:
        sys.exit(f"{args.media}: no audio to transcribe")
    model = WhisperModel(args.model, device="cpu", compute_type="int8")
    segs, info = model.transcribe(audio, language=args.language, word_timestamps=True, vad_filter=True)
    segments, words = [], []
    for s in segs:
        segments.append({"start": round(s.start, 2), "end": round(s.end, 2), "text": s.text.strip()})
        for w in s.words or []:
            words.append({"start": round(w.start, 2), "end": round(w.end, 2), "word": w.word.strip()})

    pauses = [{"at": words[i]["end"], "dur": round(words[i + 1]["start"] - words[i]["end"], 2)}
              for i in range(len(words) - 1) if words[i + 1]["start"] - words[i]["end"] > 0.7]
    spoken = sum(w["end"] - w["start"] for w in words)
    span = (words[-1]["end"] - words[0]["start"]) if words else 0
    stats = {"language": info.language, "duration": round(info.duration, 2), "words": len(words),
             "first_word_s": words[0]["start"] if words else None,
             "last_word_s": words[-1]["end"] if words else None,
             "words_per_minute": round(len(words) / span * 60) if span else 0,
             "speech_share": round(spoken / info.duration, 3) if info.duration else 0,
             "words_in_first_3s": sum(1 for w in words if w["start"] < 3.0),
             "pauses_over_0.7s": pauses}

    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    (out / "transcript.json").write_text(json.dumps({"stats": stats, "segments": segments, "words": words}, indent=1))
    lines = [f"# Transcript: {Path(args.media).name}", ""]
    if not words:
        lines.append("No speech found.")
    else:
        lines += [f"{stats['words']} words, {stats['words_per_minute']} words a minute, "
                  f"first word at {stats['first_word_s']} s, speech on {stats['speech_share']:.0%} of the run.", ""]
        lines += [f"- **{s['start']:.2f}-{s['end']:.2f}** {s['text']}" for s in segments]
    (out / "transcript.md").write_text("\n".join(lines) + "\n")
    print(lines[2] if words else "No speech found.")
    print(f"wrote {out / 'transcript.json'} and {out / 'transcript.md'}")


if __name__ == "__main__":
    main()
