"""Render the whole Instagram asset pack.

  python3 scripts/make_pack.py

Writes into assets/: profile/, templates/, covers/, highlights/, carousel-start-here/,
format-sheet.png and grid-preview.png. Change brand tokens in scripts/brand.py first
if you picked another name.
"""
import math
import os
import sys

from PIL import Image, ImageDraw, ImageFilter

sys.path.insert(0, os.path.dirname(__file__))
from brand import (BRAND_NAME, HANDLE, TAGLINE, W, H, SAFE_TOP, SAFE_BOTTOM, SAFE_RIGHT, GRID_CROP,
                   INK, INK2, PAPER, TEXT, WHITE, MUTED, YELLOW, GREEN, RED,
                   font, tokenize, fit_font, draw_rich_lines, logo_mark, handle_tag, wrap_words)
from headline import render_headline

ROOT = os.path.join(os.path.dirname(__file__), "..", "assets")


def out(*p):
    path = os.path.join(ROOT, *p)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    return path


def canvas(w=W, h=H, color=INK):
    return Image.new("RGBA", (w, h), color + (255,))


def fake_clip(w, h, seed=0, hue=(40, 60, 90)):
    """A soft, photo-ish placeholder so mockups don't look empty."""
    img = Image.new("RGBA", (w, h))
    d = ImageDraw.Draw(img)
    for y in range(h):
        t = y / max(h - 1, 1)
        c = tuple(int(hue[i] * (1 - t) + INK2[i] * t) for i in range(3))
        d.line((0, y, w, y), fill=c + (255,))
    for i in range(6):
        r = int(w * (0.15 + 0.1 * ((i * 7 + seed) % 5)))
        cx = int(w * (((i * 37 + seed * 13) % 100) / 100))
        cy = int(h * (((i * 53 + seed * 29) % 100) / 100))
        d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=tuple(min(255, v + 25) for v in hue) + (90,))
    return img.filter(ImageFilter.GaussianBlur(28))


def subtitle(img, text, y, hl=None, size=64):
    d = ImageDraw.Draw(img)
    f = font("Black", size)
    tokens = tokenize(text, hl)
    lines = wrap_words(d, tokens, f, W - 2 * 120)
    for line in lines:
        s = " ".join(w for w, _ in line)
        lw = d.textlength(s, font=f)
        x = (W - lw) / 2
        for word, h in line:
            ww = d.textlength(word, font=f)
            d.text((x, y), word, font=f, fill=YELLOW if h else WHITE, stroke_width=7, stroke_fill=(0, 0, 0))
            x += ww + d.textlength(" ", font=f)
        y += int(size * 1.15)


# ---------------------------------------------------------------- profile
def make_profile():
    for size in (1080, 320):
        logo_mark(size, circle=False).save(out("profile", f"profile-{size}.png"))
    # legibility check: how it looks in the app at 110 px and 40 px, circle-cropped
    sheet = canvas(560, 220, (245, 245, 245))
    d = ImageDraw.Draw(sheet)
    big = logo_mark(1080)
    for x, s in ((40, 150), (240, 110), (400, 40)):
        im = big.resize((s, s), Image.LANCZOS)
        mask = Image.new("L", (s, s), 0)
        ImageDraw.Draw(mask).ellipse((0, 0, s - 1, s - 1), fill=255)
        sheet.paste(im, (x, 35), mask)
        d.text((x, 35 + s + 8), f"{s}px", font=font("Medium", 18, display=False), fill=(90, 90, 90))
    sheet.convert("RGB").save(out("profile", "profile-preview.png"))


# ---------------------------------------------------------------- templates
def make_templates():
    img = canvas(color=(40, 40, 46))
    d = ImageDraw.Draw(img)
    red = (255, 80, 80, 110)
    d.rectangle((0, 0, W, SAFE_TOP), fill=red)
    d.rectangle((0, H - SAFE_BOTTOM, W, H), fill=red)
    d.rectangle((W - SAFE_RIGHT, SAFE_TOP, W, H - SAFE_BOTTOM), fill=(255, 80, 80, 60))
    gx = GRID_CROP
    d.rectangle(gx, outline=YELLOW + (255,), width=6)
    f = font("Bold", 36)
    fs = font("Medium", 28, display=False)
    d.text((40, 90), "TOP 220 px: Instagram header", font=f, fill=WHITE)
    d.text((40, H - SAFE_BOTTOM + 40), "BOTTOM 380 px: caption, handle, audio", font=f, fill=WHITE)
    d.text((40, H - SAFE_BOTTOM + 90), "Nothing important here", font=fs, fill=WHITE)
    d.text((40, gx[1] + 24), "YELLOW BOX: profile grid crop (3:4, 1080 x 1440)", font=fs, fill=YELLOW)
    d.text((40, gx[1] + 60), "Cover text must sit inside it", font=fs, fill=YELLOW)
    txt = "BUTTONS"
    d.text((W - SAFE_RIGHT + 18, H // 2), txt, font=font("Bold", 26), fill=WHITE)
    d.text((40, 760), "Safe area for text: x 40 to 900, y 220 to 1540", font=f, fill=WHITE)
    img.convert("RGB").save(out("templates", "safe-zones.png"))

    # cover template: dark, crop box marked
    c = canvas()
    cd = ImageDraw.Draw(c)
    cd.rectangle(GRID_CROP, outline=(70, 70, 78, 255), width=4)
    cd.text((60, GRID_CROP[1] - 60), "grid crop: keep text inside", font=fs, fill=MUTED)
    c.convert("RGB").save(out("templates", "cover-template.png"))

    # blank overlays
    for style in ("white", "dark"):
        o, _ = render_headline("Your headline goes here in eight to fourteen words.", "fourteen words.", style)
        o.save(out("templates", f"headline-{style}-example.png"))


# ---------------------------------------------------------------- covers
COVERS = [
    ("01", "HOW IT MAKES MONEY", "Costco loses money on this hot dog. On purpose.", "On purpose.", "$1.50"),
    ("21", "BY THE NUMBERS", "Same $300 a month. Different start age.", "Different start age.", "$1.05M"),
    ("02", "HOW IT MAKES MONEY", "McDonald's isn't really in the burger business", "burger business", "RENT"),
    ("N1", "TODAY", "Today's business headline goes here", "headline", "NEWS"),
    ("10", "START HERE", "Business news that makes sense in 30 seconds", "30 seconds", BRAND_NAME.upper()),
    ("03", "HOW IT MAKES MONEY", "Rolex has no shareholders. So who gets the money?", "no shareholders.", "1960"),
    ("06", "TECH", "13 people built Instagram. Facebook paid $1 billion.", "13 people", "$1B"),
    ("N2", "TODAY", "This AI tool can do something surprising", "surprising", "AI"),
    ("22", "MONEY RULE", "Divide 72 by your interest rate.", "72", "72"),
]


COVER_STYLES = {
    # series: (background, ghost number, text, highlight text, highlight marker)
    "dark": (INK, (30, 30, 34), WHITE, YELLOW, None),
    "paper": (PAPER, (232, 232, 226), TEXT, TEXT, YELLOW),
    "yellow": (YELLOW, (242, 186, 40), TEXT, TEXT, PAPER),
}
SERIES_STYLE = {"TODAY": "paper", "TECH": "paper", "BY THE NUMBERS": "yellow", "MONEY RULE": "yellow"}


def cover(series, title, highlight, big):
    bg, ghost, fg, hl_fg, hl_bg = COVER_STYLES[SERIES_STYLE.get(series, "dark")]
    img = canvas(color=bg)
    d = ImageDraw.Draw(img)
    top, bottom = GRID_CROP[1], GRID_CROP[3]
    # big ghost number in the background
    gf = font("Black", 360)
    gw = d.textlength(big, font=gf)
    if gw > W - 80:
        gf = font("Black", int(360 * (W - 80) / gw))
        gw = d.textlength(big, font=gf)
    d.text(((W - gw) / 2, top + 120), big, font=gf, fill=ghost)
    # series label
    lf = font("Bold", 34)
    accent = YELLOW if bg == INK else TEXT
    d.rectangle((90, top + 640, 104, top + 1180), fill=accent)
    d.text((130, top + 640), series, font=lf, fill=accent)
    tokens = tokenize(title, highlight)
    f, lines = fit_font(d, tokens, W - 230, 4, start=96, minimum=60)
    draw_rich_lines(d, lines, f, 130, top + 700, fg, hl_fg, hl_bg=hl_bg)
    d.text((130, bottom - 90), HANDLE, font=font("Medium", 32, display=False), fill=MUTED if bg == INK else (90, 90, 90))
    return img


def make_covers():
    paths = []
    for num, series, title, hl, big in COVERS:
        p = out("covers", f"cover-{num}.png")
        cover(series, title, hl, big).convert("RGB").save(p)
        paths.append(p)
    return paths


# ---------------------------------------------------------------- grid preview
def make_grid(paths):
    gw = 1080
    tile_w = (gw - 2 * 4) // 3
    tile_h = int(tile_w * 4 / 3)
    head_h = 520
    img = Image.new("RGB", (gw, head_h + 3 * tile_h + 2 * 4), (255, 255, 255))
    d = ImageDraw.Draw(img)
    av = logo_mark(220).resize((200, 200), Image.LANCZOS)
    mask = Image.new("L", (200, 200), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, 199, 199), fill=255)
    img.paste(av, (48, 60), mask)
    nf = font("Bold", 40, display=False)
    sf = font("Regular", 34, display=False)
    d.text((290, 70), HANDLE.lstrip("@"), font=font("Bold", 46, display=False), fill=(0, 0, 0))
    stats = [("9", "posts"), ("0", "followers"), ("0", "following")]
    for i, (n, l) in enumerate(stats):
        x = 290 + i * 240
        d.text((x, 150), n, font=nf, fill=(0, 0, 0))
        d.text((x, 200), l, font=sf, fill=(0, 0, 0))
    y = 300
    d.text((48, y), f"{BRAND_NAME} | Business & Money News", font=font("SemiBold", 34, display=False), fill=(0, 0, 0))
    d.text((48, y + 46), "News & Media Website", font=sf, fill=(115, 115, 115))
    for i, line in enumerate([TAGLINE, "How companies really make money, daily.", "New breakdown every morning."]):
        d.text((48, y + 92 + i * 42), line, font=sf, fill=(0, 0, 0))
    for i, p in enumerate(paths[:9]):
        t = Image.open(p).crop(GRID_CROP).resize((tile_w, tile_h), Image.LANCZOS)
        r, c = divmod(i, 3)
        img.paste(t, (c * (tile_w + 4), head_h + r * (tile_h + 4)))
    img.save(out("grid-preview.png"))


# ---------------------------------------------------------------- highlights
def make_highlights():
    items = [("start", "Start"), ("breakdowns", "Breakdowns"), ("money", "Money"), ("tools", "Tools"), ("work", "Work with us")]
    sheet = canvas(5 * 220 + 40, 300, (255, 255, 255))
    sd = ImageDraw.Draw(sheet)
    for i, (key, label) in enumerate(items):
        img = canvas()
        d = ImageDraw.Draw(img)
        cx, cy, r = W // 2, H // 2, 300
        d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=INK2)
        if key == "start":
            d.polygon([(cx - 90, cy - 130), (cx - 90, cy + 130), (cx + 140, cy)], fill=YELLOW)
        elif key == "breakdowns":
            for j, hgt in enumerate((120, 200, 280)):
                x = cx - 150 + j * 110
                d.rounded_rectangle((x, cy + 140 - hgt, x + 80, cy + 140), radius=10, fill=YELLOW if j == 2 else WHITE)
        elif key == "money":
            f = font("Black", 340)
            tw = d.textlength("$", font=f)
            d.text((cx - tw / 2, cy - 230), "$", font=f, fill=YELLOW)
        elif key == "tools":
            d.polygon([(cx + 40, cy - 200), (cx - 110, cy + 30), (cx - 5, cy + 30), (cx - 40, cy + 200),
                       (cx + 110, cy - 30), (cx + 5, cy - 30)], fill=YELLOW)
        else:
            f = font("Black", 300)
            tw = d.textlength("@", font=f)
            d.text((cx - tw / 2, cy - 200), "@", font=f, fill=YELLOW)
        img.convert("RGB").save(out("highlights", f"highlight-{key}.png"))
        thumb = img.crop((cx - r - 20, cy - r - 20, cx + r + 20, cy + r + 20)).resize((180, 180), Image.LANCZOS)
        m = Image.new("L", (180, 180), 0)
        ImageDraw.Draw(m).ellipse((0, 0, 179, 179), fill=255)
        sheet.paste(thumb, (40 + i * 220, 30), m)
        lf = font("Medium", 24, display=False)
        lw = sd.textlength(label, font=lf)
        sd.text((40 + i * 220 + 90 - lw / 2, 230), label, font=lf, fill=(0, 0, 0))
    sheet.convert("RGB").save(out("highlights", "highlights-preview.png"))


# ---------------------------------------------------------------- carousel
SLIDES = [
    ("cover", "Business news that makes sense in 30 seconds.", "30 seconds.", "Swipe for what you'll get here →"),
    ("text", "Every morning: one company, one number, one reason.", "one number,", "That's the whole format."),
    ("example", "Costco has sold its hot dog for $1.50 since 1985.", "$1.50", "The money is in the membership card, not the food."),
    ("example", "McDonald's earns huge sums from rent.", "rent.", "It owns or leases the land, then rents it to franchisees."),
    ("example", "Rolex has no shareholders.", "no shareholders.", "A foundation has owned it since 1960."),
    ("text", "What you won't get here: hype, trading signals, or get-rich-quick.", "won't", "Every number has a source in the caption."),
    ("cta", "Follow for a new breakdown every morning.", "every morning.", "Send this to the friend who reads the business section."),
]


def make_carousel():
    sw, sh = 1080, 1350
    paths = []
    for i, (kind, title, hl, sub) in enumerate(SLIDES, 1):
        img = canvas(sw, sh)
        d = ImageDraw.Draw(img)
        d.rectangle((80, 200, 96, sh - 260), fill=YELLOW)
        handle_tag(img, 80, 90, size=32)
        pf = font("Medium", 30, display=False)
        pg = f"{i}/{len(SLIDES)}"
        d.text((sw - 80 - d.textlength(pg, font=pf), 96), pg, font=pf, fill=MUTED)
        if kind == "example":
            d.text((130, 220), "EXAMPLE", font=font("Bold", 32), fill=YELLOW)
        tokens = tokenize(title, hl)
        start = 104 if kind == "cover" else 88
        f, lines = fit_font(d, tokens, sw - 230, 5, start=start, minimum=56)
        y = draw_rich_lines(d, lines, f, 130, 290, WHITE, YELLOW)
        sf = font("Medium", 40, display=False)
        for line in wrap_words(d, [(w, False) for w in sub.split()], sf, sw - 230):
            d.text((130, y + 50), " ".join(w for w, _ in line), font=sf, fill=MUTED)
            y += 54
        if kind == "cta":
            lm = logo_mark(200)
            img.alpha_composite(lm, (130, sh - 470))
        p = out("carousel-start-here", f"slide-{i:02d}.png")
        img.convert("RGB").save(p)
        paths.append(p)
    # contact sheet
    tw, th = 360, 450
    sheet = Image.new("RGB", (4 * tw + 5 * 20, 2 * th + 3 * 20), (230, 230, 230))
    for i, p in enumerate(paths):
        r, c = divmod(i, 4)
        sheet.paste(Image.open(p).resize((tw, th), Image.LANCZOS), (20 + c * (tw + 20), 20 + r * (th + 20)))
    sheet.save(out("carousel-start-here", "contact-sheet.png"))


# ---------------------------------------------------------------- format sheet
def mock_headline(text, hl, style="white"):
    img = canvas()
    o, bottom = render_headline(text, hl, style)
    clip = fake_clip(W, H - SAFE_BOTTOM - 40 - (bottom + 30), seed=len(text))
    img.alpha_composite(clip, (0, bottom + 30))
    img.alpha_composite(o)
    return img, bottom + 30


def make_format_sheet():
    mocks = []
    # F1
    m, vt = mock_headline("Spotify is raising prices again. Third time in two years.", "Third time")
    mocks.append(("F1 The Headline", "news, 7 to 20 s", m))
    # F2
    m, vt = mock_headline("Costco loses money on this hot dog. On purpose.", "On purpose.")
    d = ImageDraw.Draw(m)
    f = font("Black", 230)
    t = "$5B"
    d.text(((W - d.textlength(t, font=f)) / 2, vt + 160), t, font=f, fill=YELLOW, stroke_width=8, stroke_fill=(0, 0, 0))
    subtitle(m, "in membership fees every year", 1300, "membership fees")
    mocks.append(("F2 The Breakdown", "voiceover, 30 to 60 s", m))
    # F3
    m, vt = mock_headline('Buffett: "Price is what you pay. Value is what you get."', "Value is what you get.", "dark")
    subtitle(m, "he wrote this in 2008", 1300, "2008")
    mocks.append(("F3 The Take", "quote + your view, 15 to 30 s", m))
    # F4
    m = canvas()
    o, bottom = render_headline("Same $300 a month. Different start age.", "Different start age.")
    m.alpha_composite(o)
    d = ImageDraw.Draw(m)
    rows = [("25", 1.0, "$1.05M"), ("35", 0.427, "$447K"), ("45", 0.169, "$177K")]
    for i, (age, frac, val) in enumerate(rows):
        y = bottom + 110 + i * 230
        d.text((80, y), f"Start at {age}", font=font("Bold", 46), fill=WHITE)
        d.rounded_rectangle((80, y + 70, 80 + int(620 * frac), y + 140), radius=12, fill=YELLOW if i == 0 else (90, 90, 98))
        d.text((80 + int(620 * frac) + 20, y + 76), val, font=font("Black", 52), fill=WHITE)
    mocks.append(("F4 By the Numbers", "animated data, 10 to 20 s", m))
    # F5
    s5 = Image.open(out("carousel-start-here", "slide-03.png")).convert("RGBA").resize((1000, 1250))
    m = canvas(color=(235, 235, 235))
    m.alpha_composite(s5, (40, 300))
    d = ImageDraw.Draw(m)
    for k in range(7):
        d.ellipse((440 + k * 30, 1600, 456 + k * 30, 1616), fill=(30, 30, 30) if k == 2 else (170, 170, 170))
    mocks.append(("F5 The Carousel", "6 to 10 slides, 4:5", m))
    # F6
    m = canvas()
    o, bottom = render_headline("This AI turned a napkin sketch into a working website.", "working website.")
    m.alpha_composite(o)
    d = ImageDraw.Draw(m)
    x0, y0, x1, y1 = 90, bottom + 60, W - 90, H - SAFE_BOTTOM - 60
    d.rounded_rectangle((x0, y0, x1, y1), radius=24, fill=(245, 245, 245))
    d.rectangle((x0, y0 + 60, x1, y0 + 62), fill=(210, 210, 210))
    for k, c in enumerate(((255, 95, 87), (255, 189, 46), (39, 201, 63))):
        d.ellipse((x0 + 30 + k * 40, y0 + 20, x0 + 52 + k * 40, y0 + 42), fill=c)
    for k in range(6):
        d.rounded_rectangle((x0 + 50, y0 + 110 + k * 90, x1 - 50 - (k % 3) * 120, y0 + 150 + k * 90), radius=8, fill=(215, 215, 220))
    d.ellipse((x1 - 330, y0 + 260, x1 - 60, y0 + 530), outline=YELLOW, width=12)
    mocks.append(("F6 The Demo", "screen recording, 10 to 25 s", m))
    # F7
    m = canvas()
    d = ImageDraw.Draw(m)
    tokens = tokenize("Divide 72 by your interest rate. That's how many years it takes to double.", "72")
    f, lines = fit_font(d, tokens, W - 240, 6, start=96, minimum=60)
    draw_rich_lines(d, lines, f, 120, 640, WHITE, YELLOW)
    d.rectangle((80, 640, 94, 640 + len(lines) * int(f.size * 1.12)), fill=YELLOW)
    handle_tag(m, 120, 1420, size=34)
    mocks.append(("F7 The Rule", "one line, 5 to 8 s", m))

    tw, th = 360, 640
    pad = 30
    sheet = Image.new("RGB", (4 * tw + 5 * pad, 2 * (th + 120) + 3 * pad), (245, 245, 242))
    d = ImageDraw.Draw(sheet)
    for i, (name, sub, im) in enumerate(mocks):
        r, c = divmod(i, 4)
        x = pad + c * (tw + pad)
        y = pad + r * (th + 120 + pad)
        sheet.paste(im.convert("RGB").resize((tw, th), Image.LANCZOS), (x, y))
        d.text((x, y + th + 14), name, font=font("Bold", 30), fill=(10, 10, 10))
        d.text((x, y + th + 54), sub, font=font("Medium", 24, display=False), fill=(100, 100, 100))
    # legend in the empty 8th slot
    x = pad + 3 * (tw + pad)
    y = pad + (th + 120 + pad)
    d.text((x, y + 10), "Mix to start", font=font("Bold", 30), fill=(10, 10, 10))
    mix = ["F1 + F6  news/tech  45%", "F2  breakdowns  25%", "F4 + F5  data  15%", "F3  takes  10%", "F7  rules  5%"]
    for k, line in enumerate(mix):
        d.text((x, y + 70 + k * 44), line, font=font("Medium", 26, display=False), fill=(40, 40, 40))
    sheet.save(out("format-sheet.png"))


if __name__ == "__main__":
    make_profile()
    make_templates()
    paths = make_covers()
    make_grid(paths)
    make_highlights()
    make_carousel()
    make_format_sheet()
    print("assets written to", os.path.abspath(ROOT))
