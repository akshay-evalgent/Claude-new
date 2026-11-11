"""Make short-form captions in the style measured on the reference shorts.

Style (measured from the reference videos):
  - 1-3 words on screen at a time, changing with the voice
  - white, bold, sentence case, thin dark shadow, no box, no colour highlights
  - centred, lower third (baseline ~78% down the frame)

Usage:
  pip install faster-whisper
  python captions.py voiceover.wav captions.ass           # writes subtitles
  ffmpeg -i video.mp4 -vf "ass=captions.ass" -c:a copy out.mp4   # burns them in

Options:
  --font "Nunito ExtraBold"   any installed bold sans (Montserrat Bold also works)
  --max-words 3               words per caption chunk
  --model small.en            whisper model (base.en is faster, medium.en more accurate)
"""
import argparse
import re


def load_audio(path):
    """Decode any audio/video file to 16 kHz mono float32 with ffmpeg (avoids PyAV version issues)."""
    import subprocess
    import numpy as np

    raw = subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-i", path, "-vn", "-ac", "1", "-ar", "16000",
                          "-f", "f32le", "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).copy()

ASS_HEADER = """[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Short,{font},{size},&H00FFFFFF,&H00FFFFFF,&H64000000,&H78000000,-1,0,0,0,100,100,0,0,1,2.2,3,2,80,80,{margin_v},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""


def ts(t):
    t = max(t, 0)
    h, rem = divmod(t, 3600)
    m, s = divmod(rem, 60)
    return f"{int(h)}:{int(m):02d}:{s:05.2f}"


# Words that usually start a new phrase. The reference captions break before these
# ("had swallowed" / "a living eel", "something wiggling" / "out of its body").
PHRASE_STARTERS = {
    "a", "an", "the", "of", "to", "into", "in", "on", "at", "and", "but", "so", "or", "then",
    "its", "his", "her", "their", "your", "my", "our", "with", "from", "through", "for", "as",
    "because", "while", "until", "before", "after", "when", "which", "who", "that",
}


def chunk(words, max_words):
    """Group words into 1..max_words chunks, breaking at punctuation, pauses and phrase starts."""
    out, cur = [], []
    for i, w in enumerate(words):
        cur.append(w)
        text = w["w"].strip()
        nxt = words[i + 1] if i + 1 < len(words) else None
        nxt_gap = nxt["s"] - w["e"] if nxt else 9
        nxt_word = nxt["w"].strip().lower().strip(",.?!") if nxt else ""
        if (len(cur) >= max_words
                or re.search(r"[.,!?;:]$", text)
                or nxt_gap > 0.3
                or (len(cur) >= 2 and nxt_word in PHRASE_STARTERS)):
            out.append(cur)
            cur = []
    if cur:
        out.append(cur)
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("audio")
    ap.add_argument("out_ass")
    ap.add_argument("--font", default="Nunito ExtraBold")
    ap.add_argument("--size", type=int, default=74)
    ap.add_argument("--max-words", type=int, default=3)
    ap.add_argument("--model", default="small.en")
    a = ap.parse_args()

    from faster_whisper import WhisperModel

    model = WhisperModel(a.model, device="cpu", compute_type="int8")
    segs, _ = model.transcribe(load_audio(a.audio), word_timestamps=True)
    words = [{"w": w.word, "s": w.start, "e": w.end} for s in segs for w in s.words]

    lines = []
    chunks = chunk(words, a.max_words)
    for i, c in enumerate(chunks):
        start = c[0]["s"]
        # hold each chunk until the next one starts, so the screen is never empty mid-sentence
        end = chunks[i + 1][0]["s"] if i + 1 < len(chunks) else c[-1]["e"] + 0.3
        text = " ".join(w["w"].strip() for w in c)
        text = text.rstrip(".,;:")  # the reference captions drop trailing punctuation
        lines.append(f"Dialogue: 0,{ts(start)},{ts(end)},Short,,0,0,0,,{text}")

    # caption bottom edge at ~80% of the frame height => bottom margin = 20% of 1920
    header = ASS_HEADER.format(font=a.font, size=a.size, margin_v=int(1920 * 0.20))
    with open(a.out_ass, "w", encoding="utf-8") as f:
        f.write(header + "\n".join(lines) + "\n")
    print(f"wrote {len(lines)} caption chunks to {a.out_ass}")


if __name__ == "__main__":
    main()
