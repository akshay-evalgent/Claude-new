"""Make the top-bar headline overlay for a reel (transparent 1080x1920 PNG).

Usage:
  python3 scripts/headline.py "Costco loses money on this hot dog. On purpose." \
      --highlight "On purpose." --out costco.png [--style white|dark] [--source "Source: Costco 10-K"] [--preview]

  Movie-metaphor layout (the one @wealth uses: black frame, centred Title Case hook, clip in the middle):
  python3 scripts/headline.py "The Perfect Example Of What Saving Vs Investing Looks Like:" \
      --highlight "Saving" --highlight "Investing" --style metaphor --out saving.png --preview
  This PNG is opaque black with a transparent window. Put your clip underneath, scaled to full width.

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
                   PALE_YELLOW, META_TEXT_BOTTOM, META_CLIP,
                   tokenize, fit_font, draw_rich_lines, handle_tag, font, wrap_words)

MARGIN_X = 54
BOX_TOP = 300
PAD = 40


EMOJI_FONT = "/usr/share/fonts/truetype/noto/NotoColorEmoji.ttf"
EMOJI_MARK = "\u2063EMOJI"  # placeholder token, swapped for the emoji image when drawing


def emoji_image(chars, height):
    """Render colour emoji with Noto Color Emoji (bitmap font, only works at size 109) and scale."""
    from PIL import ImageFont
    f = ImageFont.truetype(EMOJI_FONT, 109)
    tmp = Image.new("RGBA", (150 * len(chars), 160), (0, 0, 0, 0))
    ImageDraw.Draw(tmp).text((0, 0), chars, font=f, embedded_color=True)
    tmp = tmp.crop(tmp.getbbox())
    return tmp.resize((int(tmp.width * height / tmp.height), height), Image.LANCZOS)


def render_metaphor(text, highlight=None, handle=False, clip_height=None, emoji=None):
    """Black frame, centred hook text above a full-width clip window starting at y=600."""
    clip = (META_CLIP[0], META_CLIP[1], META_CLIP[2], META_CLIP[1] + (clip_height or META_CLIP[3] - META_CLIP[1]))
    img = Image.new("RGBA", (W, H), (0, 0, 0, 255))
    d = ImageDraw.Draw(img)
    d.rectangle(clip, fill=(0, 0, 0, 0))
    if "|" in text:
        # forced line breaks: "1% Better Vs 1% Worse | Every Day" keeps each part on its own line
        lines = [tokenize(seg.strip(), highlight) for seg in text.split("|") if seg.strip()]
        size = 62
        while size > 40:
            fnt = font("Bold", size)
            widths = [d.textlength(" ".join(w for w, _ in ln), font=fnt) for ln in lines]
            if emoji:
                widths[-1] += d.textlength(" ", font=fnt) + size * len(emoji)
            if max(widths) <= W - 180:
                break
            size -= 2
    else:
        tokens = tokenize(text, highlight)
        fnt, lines = fit_font(d, tokens, W - 2 * 90, 3, start=62, minimum=46, weight="Bold")
    if emoji and "|" not in text:
        # glue a placeholder (about one em per emoji) to the last word so the emoji never sits alone,
        # and shrink the font until the hook keeps the same number of lines it had without the emoji
        target = len(lines)
        last_w, last_hl = tokens[-1]
        glued = tokens[:-1] + [(last_w + " " + "W" * len(emoji), last_hl)]
        size = fnt.size
        while True:
            f = font("Bold", size)
            wrapped = wrap_words(d, glued, f, W - 2 * 90)
            if len(wrapped) <= target or size <= 40:
                fnt, lines = f, wrapped
                break
            size -= 2
        lines[-1] = lines[-1][:-1] + [(last_w, last_hl)]
    line_h = int(fnt.size * 1.22)
    top = META_TEXT_BOTTOM - line_h * len(lines)
    em = emoji_image(emoji, int(fnt.size * 0.95)) if emoji else None
    space = d.textlength(" ", font=fnt)
    y = top
    for i, line in enumerate(lines):
        words_w = d.textlength(" ".join(w for w, _ in line), font=fnt)
        extra = (space + em.width) if (em is not None and i == len(lines) - 1) else 0
        x = 90 + (W - 180 - words_w - extra) / 2
        for word, hl in line:
            d.text((x, y), word, font=fnt, fill=PALE_YELLOW if hl else WHITE)
            x += d.textlength(word, font=fnt) + space
        if extra:
            img.alpha_composite(em, (int(x), int(y + fnt.size * 0.12)))
        y += line_h
    if handle:
        handle_tag(img, 90, clip[3] + 40, size=30, color=MUTED)
    return img, clip[1], clip[3]


def render_headline(text, highlight=None, style="white", source=None, max_lines=3):
    if style == "metaphor":
        img, top, _ = render_metaphor(text, highlight)
        return img, top
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


def preview(overlay, video_top, video_bottom=None):
    """Composite on a dark frame with a striped placeholder where the clip goes."""
    bg = Image.new("RGBA", (W, H), INK + (255,))
    d = ImageDraw.Draw(bg)
    vb = video_bottom or H - SAFE_BOTTOM - 40
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
    ap.add_argument("--highlight", action="append", help="phrase to highlight; repeat for more than one")
    ap.add_argument("--style", default="white", choices=["white", "dark", "metaphor"])
    ap.add_argument("--source")
    ap.add_argument("--handle", action="store_true", help="metaphor style: add your handle under the clip")
    ap.add_argument("--clip-height", type=int, help="metaphor style: clip window height in px (720 = 3:2, 920 = squarer)")
    ap.add_argument("--emoji", help="metaphor style: emoji to put after the hook, e.g. 🌱")
    ap.add_argument("--out", default="headline.png")
    ap.add_argument("--preview", action="store_true", help="also write <out>-preview.png on a mock frame")
    a = ap.parse_args()
    if a.style == "metaphor":
        img, video_top, video_bottom = render_metaphor(a.text, a.highlight, a.handle, a.clip_height, a.emoji)
    else:
        img, bottom = render_headline(a.text, a.highlight, a.style, a.source)
        video_top, video_bottom = bottom + 30, H - SAFE_BOTTOM - 40
    img.save(a.out)
    print(f"wrote {a.out}  VIDEO_TOP={video_top}  VIDEO_BOTTOM={video_bottom}")
    if a.preview:
        p = os.path.splitext(a.out)[0] + "-preview.png"
        under = preview(Image.new("RGBA", (W, H), (0, 0, 0, 0)), video_top, video_bottom)
        under.alpha_composite(img)
        under.convert("RGB").save(p)
        print(f"wrote {p}")


if __name__ == "__main__":
    main()
