"""Startupro-style collage quote card, Lean Stack branding.

Matches the reference: photo collage on top (main photo left, second photo right), circular inset of the
person quoted overlapping the band, round logo badge top-left, dark band at the bottom with a long
headline in bold white where [bracketed] words render in yellow, social handles bottom-right.

Spec JSON:
{
 "headline": "\"Forget [labour laws], our ministers are busy ...\" : [Bengaluru man] slams ...",
 "main_photo": "path or null", "side_photo": "path or null", "inset_photo": "path or null",
 "main_label": "PHOTO: Nithin Kamath (press kit)", "side_label": "PHOTO: Zerodha office", "inset_label": "inset: founder",
 "handle": "leanstack", "square": false
}
Usage: python3 scripts/quote_card.py spec.json out.png
"""
import os, sys, json, re
sys.path.insert(0, os.path.dirname(__file__))
from PIL import Image, ImageDraw, ImageFilter
from themes import THEMES
from make_brand_options import mark
T = THEMES["lean"]
YELLOW = (255, 217, 59); WHITE = (250, 250, 250); BAND = (14, 14, 18)

def tl(d, t, f): return d.textlength(t, font=f)

def tokens(text):
    """Split into (word, highlight). [word word] = highlighted. Punctuation glued to a bracket stays glued to the word."""
    out = []
    for m in re.finditer(r"([^\s\[]*)\[([^\]]+)\]([^\s\[]*)|(\S+)", text):
        if m.group(2):
            words = m.group(2).split()
            if m.group(1): words[0] = m.group(1) + words[0]
            if m.group(3): words[-1] = words[-1] + m.group(3)
            for w in words: out.append((w, True))
        else:
            out.append((m.group(4), False))
    return out

def layout(d, toks, f, max_w):
    lines, cur, w = [], [], 0
    space = tl(d, " ", f)
    for word, hi in toks:
        ww = tl(d, word, f)
        if cur and w + space + ww > max_w:
            lines.append(cur); cur, w = [], 0
        cur.append((word, hi)); w += (space if len(cur) > 1 else 0) + ww
    if cur: lines.append(cur)
    return lines

def fit(d, toks, max_w, avail_h, start=58, floor=36):
    size = start
    while size >= floor:
        f = T["display"](size, "ExtraBold"); lines = layout(d, toks, f, max_w)
        if len(lines) * int(size * 1.18) <= avail_h: return f, lines
        size -= 2
    f = T["display"](floor, "ExtraBold"); return f, layout(d, toks, f, max_w)

def photo(img, box, path, label, tone):
    x0, y0, x1, y1 = box; w, h = x1 - x0, y1 - y0
    if path and os.path.exists(path):
        im = Image.open(path).convert("RGB"); r = max(w / im.width, h / im.height)
        im = im.resize((int(im.width * r) + 1, int(im.height * r) + 1))
        cx, cy = (im.width - w) // 2, (im.height - h) // 2
        img.paste(im.crop((cx, cy, cx + w, cy + h)), (x0, y0))
    else:
        ph = Image.new("RGB", (w, h), tone); pd = ImageDraw.Draw(ph)
        for i in range(h):  # soft vertical gradient so it reads as a photo slot
            k = i / h; pd.line((0, i, w, i), fill=tuple(int(c * (1 - 0.35 * k)) for c in tone))
        f = T["body"](22, "Medium")
        for j, ln in enumerate((label or "photo").split("\n")):
            pd.text(((w - tl(pd, ln, f)) / 2, h / 2 - 16 + j * 30), ln, font=f, fill=(255, 255, 255))
        img.paste(ph, (x0, y0))

def quote_card(s, out):
    square = s.get("square", False)
    W, H = (1080, 1080) if square else (1080, 1350)
    img = Image.new("RGB", (W, H), BAND)
    band_top = int(H * (0.60 if not square else 0.56))
    # collage: main left ~58%, side right
    split = int(W * 0.58)
    photo(img, (0, 0, split, band_top), s.get("main_photo"), s.get("main_label", "PHOTO: main subject"), (92, 102, 128))
    photo(img, (split, 0, W, band_top), s.get("side_photo"), s.get("side_label", "PHOTO: context"), (120, 128, 112))
    d = ImageDraw.Draw(img)
    d.line((split, 0, split, band_top), fill=WHITE, width=4)
    # fade into band
    fade = Image.new("L", (W, 90), 0); fd = ImageDraw.Draw(fade)
    for i in range(90): fd.line((0, i, W, i), fill=int(255 * i / 90))
    img.paste(Image.new("RGB", (W, 90), BAND), (0, band_top - 90), fade)
    # circular inset
    r = 150; cx, cy = W // 2, band_top - 20
    inset = Image.new("RGB", (2 * r, 2 * r), (60, 60, 70))
    p = s.get("inset_photo")
    if p and os.path.exists(p):
        im = Image.open(p).convert("RGB"); k = max(2 * r / im.width, 2 * r / im.height)
        im = im.resize((int(im.width * k) + 1, int(im.height * k) + 1)); ox, oy = (im.width - 2 * r) // 2, (im.height - 2 * r) // 2
        inset = im.crop((ox, oy, ox + 2 * r, oy + 2 * r))
    else:
        idd = ImageDraw.Draw(inset); f = T["body"](20, "Medium")
        for j, ln in enumerate((s.get("inset_label") or "inset:\nperson quoted").split("\n")):
            idd.text(((2 * r - tl(idd, ln, f)) / 2, r - 20 + j * 26), ln, font=f, fill=WHITE)
    m = Image.new("L", (2 * r, 2 * r), 0); ImageDraw.Draw(m).ellipse((0, 0, 2 * r, 2 * r), fill=255)
    ring = Image.new("RGB", (2 * r + 16, 2 * r + 16), WHITE); rm = Image.new("L", ring.size, 0); ImageDraw.Draw(rm).ellipse((0, 0) + ring.size, fill=255)
    img.paste(ring, (cx - r - 8, cy - r - 8), rm); img.paste(inset, (cx - r, cy - r), m)
    d = ImageDraw.Draw(img)
    # logo badge top-left
    d.ellipse((28, 28, 128, 128), fill=WHITE); mark(d, "lean", T, 78, 78, 70)
    # headline
    M = 56; top = cy + r + 26
    toks = tokens(s["headline"])
    f, lines = fit(d, toks, W - 2 * M, avail_h=(H - 78) - top)
    y = top; lh = int(f.size * 1.18)
    for line in lines:
        x = M
        for i, (word, hi) in enumerate(line):
            d.text((x, y), word, font=f, fill=YELLOW if hi else WHITE); x += tl(d, word + " ", f)
        y += lh
    # handles bottom right
    fh = T["body"](24, "SemiBold"); handle = s.get("handle", "leanstack")
    txt = "in  ·  X  ·  ig    " + handle
    d.text((W - M - tl(d, txt, fh), H - 54), txt, font=fh, fill=WHITE)
    os.makedirs(os.path.dirname(out) or ".", exist_ok=True); img.save(out); return out

if __name__ == "__main__":
    print(quote_card(json.load(open(sys.argv[1])), sys.argv[2]))
