"""Make the top-bar headline overlay for a reel (transparent 1080x1920 PNG).

Usage:
  python3 scripts/headline.py "Costco loses money on this hot dog. On purpose." \
      --highlight "On purpose." --out costco.png [--style white|dark] [--source "Source: Costco 10-K"] [--preview]

Drop the PNG on the top layer in Edits or CapCut and put your clip underneath.
The clear area below the box is the video window. Keep the clip between
y=VIDEO_TOP and y=VIDEO_BOTTOM (printed when you run this).
"""
import argparse
import os
import sys

from PIL import Image, ImageDraw

sys.path.insert(0, os.path.dirname(__file__))
from brand import (W, H, SAFE_BOTTOM, PAPER, TEXT, YELLOW, INK, INK2, WHITE, MUTED,
                   tokenize, fit_font, draw_rich_lines, handle_tag, font)

MARGIN_X = 54
BOX_TOP = 300
PAD = 40


def render_headline(text, highlight=None, style="white", source=None, max_lines=3):
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    box_w = W - 2 * MARGIN_X
    inner_w = box_w - 2 * PAD
    tokens = tokenize(text, highlight)
    fnt, lines = fit_font(d, tokens, inner_w, max_lines)
    line_h = int(fnt.size * 1.12)
    box_h = PAD * 2 + line_h * len(lines) - int(fnt.size * 0.12)
    box = (MARGIN_X, BOX_TOP, MARGIN_X + box_w, BOX_TOP + box_h)

    handle_tag(img, MARGIN_X + 6, BOX_TOP - 70, size=34, color=WHITE)

    if style == "white":
        d.rounded_rectangle(box, radius=22, fill=PAPER + (255,))
        # the margin line: a yellow bar on the left edge of the box
        d.rounded_rectangle((box[0], box[1], box[0] + 14, box[3]), radius=7, fill=YELLOW + (255,))
        draw_rich_lines(d, lines, fnt, box[0] + PAD + 6, box[1] + PAD - int(fnt.size * 0.08),
                        TEXT, TEXT, hl_bg=YELLOW + (255,))
    else:
        d.rounded_rectangle(box, radius=22, fill=INK + (240,))
        d.rounded_rectangle((box[0], box[1], box[0] + 14, box[3]), radius=7, fill=YELLOW + (255,))
        draw_rich_lines(d, lines, fnt, box[0] + PAD + 6, box[1] + PAD - int(fnt.size * 0.08),
                        WHITE, YELLOW)

    bottom = box[3]
    if source:
        sf = font("Medium", 28, display=False)
        d.text((MARGIN_X + 8, bottom + 16), source, font=sf, fill=MUTED + (255,))
        bottom += 16 + 34
    return img, bottom


def preview(overlay, video_top):
    """Composite on a dark frame with a striped placeholder where the clip goes."""
    bg = Image.new("RGBA", (W, H), INK + (255,))
    d = ImageDraw.Draw(bg)
    vb = H - SAFE_BOTTOM - 40
    d.rectangle((0, video_top, W, vb), fill=INK2 + (255,))
    for x in range(-H, W, 36):
        d.line((x, video_top, x + (vb - video_top), vb), fill=(38, 38, 44, 255), width=10)
    f = font("Bold", 40)
    t = "YOUR CLIP HERE"
    tw = d.textlength(t, font=f)
    d.text(((W - tw) / 2, (video_top + vb) / 2 - 20), t, font=f, fill=MUTED + (255,))
    bg.alpha_composite(overlay)
    return bg


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("text")
    ap.add_argument("--highlight")
    ap.add_argument("--style", default="white", choices=["white", "dark"])
    ap.add_argument("--source")
    ap.add_argument("--out", default="headline.png")
    ap.add_argument("--preview", action="store_true", help="also write <out>-preview.png on a mock frame")
    a = ap.parse_args()
    img, bottom = render_headline(a.text, a.highlight, a.style, a.source)
    img.save(a.out)
    video_top = bottom + 30
    print(f"wrote {a.out}  VIDEO_TOP={video_top}  VIDEO_BOTTOM={H - SAFE_BOTTOM - 40}")
    if a.preview:
        p = os.path.splitext(a.out)[0] + "-preview.png"
        preview(img, video_top).convert("RGB").save(p)
        print(f"wrote {p}")


if __name__ == "__main__":
    main()
