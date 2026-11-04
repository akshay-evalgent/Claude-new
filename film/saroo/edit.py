#!/usr/bin/env python3
"""Re-cut the Saroo Brierley map Short: under 60 s, hook first, seamless loop.

Input:  film/input/draft.mp4   (83.9 s, 1080x1920, 30 fps; not in git)
Output: film/saroo/out/saroo-v2.mp4

What it does (see film/saroo/NOTES.md for the reasoning):
  1. Keeps seven narration segments, cut in the gaps between words, joined
     with 2-frame dissolves (video) and matching 2-frame crossfades (audio).
  2. Puts a hook title card over the opening for 2.6 s, in the video's own
     title style: "THE TRUE STORY BEHIND LION / HE FOUND HIS WAY HOME /
     ON GOOGLE EARTH". It then fades to reveal the "1986" title underneath.
  3. Dissolves the last 0.5 s into the first frame, so the replay is seamless.

Usage:
  python3 film/saroo/edit.py                 # render
  python3 film/saroo/edit.py --plan          # print the cut list and new length
"""
from __future__ import annotations

import argparse
import os
import subprocess
import sys
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
SRC = os.path.join(ROOT, "film", "input", "draft.mp4")
OUT_DIR = os.path.join(HERE, "out")
FONT_URL = ("https://raw.githubusercontent.com/google/fonts/main/ofl/montserrat/"
            "Montserrat%5Bwght%5D.ttf")
FONT_CACHE = os.path.join(HERE, ".cache", "Montserrat-VF.ttf")

FPS = 30
XF = 2 / FPS            # join length: 2 frames
LOOP = 0.5              # end dissolve into the first frame
HOOK_ON = 2.6           # seconds the hook card is fully visible
HOOK_FADE = 0.3
W, H = 1080, 1920
YELLOW = (255, 213, 63)  # sampled from the video's own titles
NAVY = (6, 10, 24)

# (start, end, what is said). Cut points sit in measured gaps in the voice; each
# segment starts 1-2 frames before the next word so the 2-frame fade-in ends first.
SEGMENTS = [
    (1.367, 12.100, "A little boy fell asleep on a train in India and woke up nearly "
                    "1,500 kilometres from home. Twenty-five years later, he found his "
                    "way back using Google Earth."),
    (16.700, 20.233, "One day his older brother Guddu took him on a train to Burhanpur."),
    (22.067, 36.000, "Saroo fell asleep on the platform. When he woke up, Guddu was gone. "
                     "He climbed onto an empty train to look for him, and the train began "
                     "to move. It didn't stop until Kolkata. He couldn't read and didn't "
                     "know the name of his town."),
    (44.200, 54.967, "A couple from Tasmania adopted him and he flew to the other side of "
                     "the world. Years later, he opened Google Earth, drew a circle around "
                     "Kolkata and followed the railway lines."),
    (58.467, 67.100, "He spotted a station called Burhanpur. He followed the tracks north, "
                     "and there it was: Khandwa. A fountain he remembered, right by the tracks."),
    (68.767, 74.233, "He flew home. Locals led him to his mother, Kamla. But Guddu had been "
                     "killed by a train."),
    (76.267, 78.200, "Saroo's story became the film Lion."),
    (79.867, 83.000, "All because he never forgot what home looked like. [end title]"),
]


def snap(t: float) -> float:
    return round(t * FPS) / FPS


def edited_length() -> float:
    total = sum(snap(b) - snap(a) for a, b, _ in SEGMENTS)
    return total - XF * (len(SEGMENTS) - 1)


def plan() -> None:
    t = 0.0
    print(f"{'#':>2} {'source':>15} {'new':>15}  line")
    for i, (a, b, text) in enumerate(SEGMENTS):
        a, b = snap(a), snap(b)
        print(f"{i + 1:>2} {a:6.2f}-{b:6.2f}s {t:6.2f}-{t + b - a:6.2f}s  {text[:70]}")
        t += b - a - XF
    print(f"\nOriginal 83.90 s -> edited {edited_length():.2f} s")


def font(size: int, weight: str = "ExtraBold"):
    from PIL import ImageFont
    if not os.path.exists(FONT_CACHE):
        os.makedirs(os.path.dirname(FONT_CACHE), exist_ok=True)
        try:
            urllib.request.urlretrieve(FONT_URL, FONT_CACHE)
        except OSError:
            return ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", size)
    f = ImageFont.truetype(FONT_CACHE, size)
    f.set_variation_by_name(weight)
    return f


def hook_card(path: str) -> None:
    """Transparent 1080x1920 PNG: a dark card over the '1986' title with the hook."""
    from PIL import Image, ImageDraw, ImageFilter

    x0, x1, top, pad, gap = 48, W - 48, 150, 46, 26
    probe = ImageDraw.Draw(Image.new("RGBA", (W, H)))
    max_w = (x1 - x0) - 2 * 44

    def fit(text: str, size: int, weight: str):
        while size > 20 and probe.textlength(text, font=font(size, weight)) > max_w:
            size -= 2
        return font(size, weight)

    lines = [  # text, font, colour, letter spacing
        ("THE TRUE STORY BEHIND LION", font(38, "Bold"), (235, 238, 245), 7),
        ("HE FOUND HIS WAY HOME", fit("HE FOUND HIS WAY HOME", 84, "ExtraBold"), (255, 255, 255), 0),
        ("ON GOOGLE EARTH", fit("ON GOOGLE EARTH", 104, "Black"), YELLOW, 0),
    ]
    # lay out by ink boxes so the padding above and below is equal
    placed, y = [], top + pad
    for text, f, color, spacing in lines:
        l, t, r, b = probe.textbbox((0, 0), text, font=f, stroke_width=0 if spacing else 3)
        placed.append((text, f, color, spacing, y - t))
        y += (b - t) + gap
    y1 = y - gap + pad

    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    shadow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle((x0, top + 10, x1, y1 + 10), 36, fill=(0, 0, 0, 150))
    img = Image.alpha_composite(img, shadow.filter(ImageFilter.GaussianBlur(18)))
    card = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(card).rounded_rectangle((x0, top, x1, y1), 36, fill=NAVY + (255,),
                                           outline=YELLOW + (255,), width=4)
    img = Image.alpha_composite(img, card)

    d = ImageDraw.Draw(img)
    for text, f, color, spacing, y in placed:
        if spacing:
            widths = [d.textlength(ch, font=f) for ch in text]
            x = (W - (sum(widths) + spacing * (len(text) - 1))) / 2
            for ch, wch in zip(text, widths):
                d.text((x, y), ch, font=f, fill=color)
                x += wch + spacing
        else:
            tw = d.textlength(text, font=f)
            d.text(((W - tw) / 2, y), text, font=f, fill=color,
                   stroke_width=3, stroke_fill=(0, 0, 0))
    img.save(path)


def render(crf: int) -> str:
    if not os.path.exists(SRC):
        sys.exit(f"Missing {SRC}")
    os.makedirs(OUT_DIR, exist_ok=True)
    card = os.path.join(OUT_DIR, ".hook_card.png")
    hook_card(card)

    segs = [(snap(a), snap(b)) for a, b, _ in SEGMENTS]
    parts, v_prev, a_prev, length = [], "v0", "a0", 0.0
    for i, (a, b) in enumerate(segs):
        parts.append(f"[0:v]trim=start={a:.4f}:end={b:.4f},setpts=PTS-STARTPTS,fps={FPS}[v{i}]")
        parts.append(f"[0:a]atrim=start={a:.4f}:end={b:.4f},asetpts=PTS-STARTPTS,"
                     f"aresample=48000[a{i}]")
    length = segs[0][1] - segs[0][0]
    for i in range(1, len(segs)):
        dur = segs[i][1] - segs[i][0]
        off = length - XF
        parts.append(f"[{v_prev}][v{i}]xfade=transition=fade:duration={XF:.4f}:offset={off:.4f}[vx{i}]")
        parts.append(f"[{a_prev}][a{i}]acrossfade=d={XF:.4f}:c1=qsin:c2=qsin[ax{i}]")
        v_prev, a_prev = f"vx{i}", f"ax{i}"
        length = off + dur
    # hook card: fully on, then fade out
    parts.append(f"[1:v]format=rgba,fade=t=out:st={HOOK_ON:.3f}:d={HOOK_FADE:.3f}:alpha=1[card]")
    parts.append(f"[{v_prev}][card]overlay=0:0:shortest=0:eof_action=pass,format=yuv420p,"
                 f"split[main][forfirst]")
    # loop: dissolve the last LOOP seconds into the edit's own first frame
    parts.append(f"[forfirst]trim=end_frame=1,loop=loop={int(LOOP * FPS) + 2}:size=1:start=0,"
                 f"setpts=N/{FPS}/TB,fps={FPS}[first]")
    # end one frame early so the final frame is exactly the first frame
    parts.append(f"[main][first]xfade=transition=fade:duration={LOOP:.4f}:"
                 f"offset={length - LOOP - 1 / FPS:.4f}[vout]")
    parts.append(f"[{a_prev}]afade=t=out:st={length - LOOP:.4f}:d={LOOP:.4f},"
                 f"atrim=end={length:.4f}[aout]")
    graph = ";\n".join(parts)

    out = os.path.join(OUT_DIR, "saroo-v2.mp4")
    cmd = ["ffmpeg", "-v", "error", "-y", "-i", SRC, "-loop", "1", "-framerate", str(FPS),
           "-t", f"{HOOK_ON + HOOK_FADE + 0.1:.2f}", "-i", card,
           "-filter_complex", graph, "-map", "[vout]", "-map", "[aout]",
           "-c:v", "libx264", "-preset", "slow", "-crf", str(crf), "-pix_fmt", "yuv420p",
           "-r", str(FPS), "-c:a", "aac", "-b:a", "192k", "-ar", "48000",
           "-t", f"{length:.4f}", "-movflags", "+faststart", out]
    subprocess.run(cmd, check=True)
    return out


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--plan", action="store_true", help="print the cut list only")
    ap.add_argument("--crf", type=int, default=18)
    args = ap.parse_args()
    plan()
    if not args.plan:
        print("\nRendering…")
        print(render(args.crf))


if __name__ == "__main__":
    main()
