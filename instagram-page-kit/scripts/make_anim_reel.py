"""Render an animated Lesson Clip reel (motion graphics drawn in code) in the @wealth layout.

  python3 scripts/make_anim_reel.py one_percent --out test-03/test-03.mp4

Each idea is one scene function that draws a frame for time t (seconds) into the clip window.
The hook frame on top comes from headline.py (metaphor style). Output: 1080x1920, 30 fps H.264
with a silent audio track (the song is added in Instagram), plus a cover JPG at the reveal.

Recipe rules baked in (content/10-ANIMATION-RECIPE.md): motion from frame 1, a visible progress
cue, payoff in the last third, a new event every couple of seconds, and a seamless loop
(the last frame matches the first).

Add a new idea: write a scene function with the same signature, register it in SCENES with its
hook, highlights, emoji, length and cover time.
"""
import argparse
import math
import os
import subprocess
import sys

from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, os.path.dirname(__file__))
from brand import W, H, META_CLIP, PALE_YELLOW, WHITE
from headline import render_metaphor

FPS = 30
FONT_DIR = "/usr/share/fonts/opentype/inter/"
GRAY_SQ = (118, 118, 126)
GRAY_TXT = (150, 150, 158)
TRACK = (44, 44, 50)
LINE = (58, 58, 64)


def F(weight, size):
    return ImageFont.truetype(f"{FONT_DIR}InterDisplay-{weight}.otf", size)


def text_c(d, cx, y, s, font, fill, scale=1.0):
    """Centred text with tabular figures so changing numbers don't wobble."""
    if scale != 1.0:
        font = F(font.path.split("-")[-1].split(".")[0], int(font.size * scale))
    w = d.textlength(s, font=font, features=["tnum"])
    d.text((cx - w / 2, y), s, font=font, fill=fill, features=["tnum"])


def ease_in_out(u):
    return 0.5 - 0.5 * math.cos(math.pi * max(0.0, min(1.0, u)))


def pop(t, t0, dur=0.5, amount=0.15):
    """Scale punch: 1 -> 1+amount -> 1 over dur seconds starting at t0."""
    if t < t0 or t > t0 + dur:
        return 1.0
    return 1.0 + amount * math.sin(math.pi * (t - t0) / dur)


# ------------------------------------------------------------------ scenes
def one_percent(d, t, top, bottom):
    """1.01^day vs 0.99^day from Day 1 to Day 365, reveal, then rewind to Day 1 for the loop."""
    GROW, REVEAL_END, LENGTH = 7.5, 10.2, 12.0
    if t < GROW:
        u = t / GROW
        day = 1 + 364 * (0.35 * u + 0.65 * u * u)   # moving from frame 1, accelerating like the maths
    elif t < REVEAL_END:
        day = 365
    else:
        day = 365 - 364 * ease_in_out((t - REVEAL_END) / (LENGTH - REVEAL_END))
    good, bad = 1.01 ** day, 0.99 ** day

    cx_l, cx_r = W * 0.25, W * 0.75
    # day counter and progress bar (the visible progress cue)
    text_c(d, W / 2, top + 30, f"Day {int(round(day))}", F("Bold", 60), WHITE)
    bx0, bx1, by = 190, 890, top + 122
    d.rounded_rectangle((bx0, by, bx1, by + 10), radius=5, fill=TRACK)
    fill_w = (bx1 - bx0) * (day - 1) / 364
    if fill_w > 10:
        d.rounded_rectangle((bx0, by, bx0 + fill_w, by + 10), radius=5, fill=PALE_YELLOW)
    # column labels
    text_c(d, cx_l, top + 175, "1% better", F("Bold", 42), WHITE)
    text_c(d, cx_r, top + 175, "1% worse", F("Bold", 42), GRAY_TXT)
    # squares, area proportional to the value, standing on a baseline
    base_y = bottom - 215
    d.line((60, base_y, W - 60, base_y), fill=LINE, width=2)
    unit = 68
    for cx, val, col in ((cx_l, good, PALE_YELLOW), (cx_r, bad, GRAY_SQ)):
        side = max(4.0, unit * math.sqrt(val))
        r = min(14, side * 0.12)
        d.rounded_rectangle((cx - side / 2, base_y - side, cx + side / 2, base_y - 2), radius=r, fill=col)
    # values, with a punch on the reveal
    s = pop(t, GROW, 0.55, 0.16)
    text_c(d, cx_l, base_y + 28 - (s - 1) * 40, f"{good:.2f}x", F("Black", 80), WHITE, scale=s)
    text_c(d, cx_r, base_y + 28 - (s - 1) * 40, f"{bad:.2f}x", F("Black", 80), GRAY_TXT, scale=s)
    # series tag
    text_c(d, W / 2, bottom - 60, "MONEY MATHS #1", F("SemiBold", 28), (110, 110, 118))


SCENES = {
    "one_percent": dict(
        fn=one_percent, length=12.0, cover=9.0, clip_height=900,
        hook="1% Better Vs 1% Worse | Every Day", highlight=["1% Better", "1% Worse"], emoji="📈",
    ),
}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("scene", choices=sorted(SCENES))
    ap.add_argument("--out", required=True)
    a = ap.parse_args()
    sc = SCENES[a.scene]
    overlay, top, bottom = render_metaphor(sc["hook"], sc["highlight"], False, sc["clip_height"], sc["emoji"])
    n = int(round(sc["length"] * FPS))
    os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
    ff = subprocess.Popen(
        ["ffmpeg", "-y", "-loglevel", "error",
         "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
         "-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo",
         "-map", "0:v", "-map", "1:a", "-t", f"{sc['length']:.3f}",
         "-c:v", "libx264", "-profile:v", "high", "-preset", "slow", "-crf", "16", "-pix_fmt", "yuv420p",
         "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", a.out],
        stdin=subprocess.PIPE)
    cover_frame = int(sc["cover"] * FPS)
    cover_img = None
    for i in range(n):
        t = i / FPS
        frame = Image.new("RGBA", (W, H), (0, 0, 0, 255))
        sc["fn"](ImageDraw.Draw(frame), t, top, bottom)
        frame.alpha_composite(overlay)
        rgb = frame.convert("RGB")
        if i == cover_frame:
            cover_img = rgb.copy()
        ff.stdin.write(rgb.tobytes())
    ff.stdin.close()
    if ff.wait() != 0:
        sys.exit("ffmpeg failed")
    cover = os.path.splitext(a.out)[0] + "-cover.jpg"
    cover_img.save(cover, quality=92)
    print(f"wrote {a.out} ({sc['length']:.1f} s, {n} frames) and {cover}")


if __name__ == "__main__":
    main()
