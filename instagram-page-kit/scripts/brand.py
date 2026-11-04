"""Brand tokens and drawing helpers for the Instagram page kit.

Change BRAND_NAME / HANDLE / LETTER here and rerun make_pack.py to rebrand everything.
"""
from PIL import Image, ImageDraw, ImageFont

BRAND_NAME = "Margin"
HANDLE = "@margin.news"
LETTER = "M"
TAGLINE = "Business news that makes sense in 30 seconds."

FONT_DIR = "/usr/share/fonts/opentype/inter/"

INK = (14, 14, 16)          # near-black background
INK2 = (28, 28, 32)         # raised card
PAPER = (250, 250, 247)     # headline box white
TEXT = (16, 16, 18)         # headline text on white
WHITE = (255, 255, 255)
MUTED = (150, 150, 158)
YELLOW = (255, 201, 60)     # the margin line and highlight
GREEN = (52, 211, 120)
RED = (255, 92, 92)
PALE_YELLOW = (245, 250, 90)  # the highlight colour measured from @wealth's movie-metaphor reel

# Movie-metaphor layout, measured from @wealth reel DfLHlFtptGu (scaled 720x1280 -> 1080x1920)
META_TEXT_BOTTOM = 560      # hook text block ends here
META_CLIP = (0, 600, 1080, 1320)  # full-width 3:2 clip window

W, H = 1080, 1920           # reel canvas
SAFE_TOP = 220              # Instagram header
SAFE_BOTTOM = 380           # caption + audio label
SAFE_RIGHT = 140            # action buttons
GRID_CROP = (0, (H - 1440) // 2, W, (H - 1440) // 2 + 1440)  # 3:4 profile grid crop


def font(weight="Bold", size=48, display=True):
    fam = "InterDisplay" if display else "Inter"
    return ImageFont.truetype(f"{FONT_DIR}{fam}-{weight}.otf", size)


def wrap_words(draw, words, fnt, max_w):
    """Greedy wrap that keeps (word, is_highlight) pairs together."""
    lines, cur = [], []
    for w in words:
        trial = cur + [w]
        t = " ".join(x[0] for x in trial)
        if draw.textlength(t, font=fnt) <= max_w or not cur:
            cur = trial
        else:
            lines.append(cur)
            cur = [w]
    if cur:
        lines.append(cur)
    return lines


def tokenize(text, highlight=None):
    """Split text into words, flagging the words that belong to the highlight phrase(s).

    highlight can be one phrase or a list of phrases.
    """
    words = text.split()
    flags = [False] * len(words)
    phrases = [highlight] if isinstance(highlight, str) else (highlight or [])
    for phrase in phrases:
        hw = phrase.split()
        n = len(hw)
        for i in range(len(words) - n + 1):
            if [w.strip() for w in words[i:i + n]] == hw:
                for j in range(i, i + n):
                    flags[j] = True
                break
    return list(zip(words, flags))


def fit_font(draw, tokens, max_w, max_lines, start=86, minimum=48, weight="Black"):
    size = start
    while size >= minimum:
        f = font(weight, size)
        lines = wrap_words(draw, tokens, f, max_w)
        if len(lines) <= max_lines:
            return f, lines
        size -= 4
    f = font(weight, minimum)
    return f, wrap_words(draw, tokens, f, max_w)


def draw_rich_lines(draw, lines, fnt, x, y, fg, hl_fg, hl_bg=None, line_gap=1.12, align="left", box_w=None):
    """Draw wrapped lines; highlighted words get hl_fg text (and optional marker behind)."""
    lh = int(fnt.size * line_gap)
    space = draw.textlength(" ", font=fnt)
    for line in lines:
        line_w = draw.textlength(" ".join(w for w, _ in line), font=fnt)
        cx = x if align == "left" else x + (box_w - line_w) / 2
        for word, hl in line:
            ww = draw.textlength(word, font=fnt)
            if hl and hl_bg:
                pad = fnt.size * 0.10
                draw.rectangle((cx - pad, y + fnt.size * 0.12, cx + ww + pad, y + fnt.size * 1.08), fill=hl_bg)
            draw.text((cx, y), word, font=fnt, fill=hl_fg if hl else fg)
            cx += ww + space
        y += lh
    return y


def logo_mark(size, bg=INK, fg=WHITE, accent=YELLOW, circle=False):
    """The brand mark: a heavy letter with a yellow margin bar on its left."""
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    if circle:
        d.ellipse((0, 0, size - 1, size - 1), fill=bg)
    else:
        d.rounded_rectangle((0, 0, size - 1, size - 1), radius=int(size * 0.22), fill=bg)
    f = font("Black", int(size * 0.56))
    bbox = d.textbbox((0, 0), LETTER, font=f)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    bar_w = max(2, int(size * 0.04))
    gap = int(size * 0.085)
    total = bar_w + gap + tw
    x0 = (size - total) / 2
    y0 = (size - th) / 2 - bbox[1]
    # the bar runs well past the cap height so it reads as a rule, not a letter I
    ext = th * 0.32
    d.rectangle((x0, (size - th) / 2 - ext, x0 + bar_w, (size + th) / 2 + ext), fill=accent)
    d.text((x0 + bar_w + gap - bbox[0], y0), LETTER, font=f, fill=fg)
    return img


def handle_tag(img, x, y, size=38, color=WHITE):
    d = ImageDraw.Draw(img)
    mark = logo_mark(int(size * 1.45), circle=True, bg=INK2)
    img.alpha_composite(mark, (int(x), int(y - size * 0.2)))
    d.text((x + size * 1.75, y), HANDLE, font=font("Bold", size), fill=color)
