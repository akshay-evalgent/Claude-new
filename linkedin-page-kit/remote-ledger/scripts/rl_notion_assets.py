"""Notion cover (1500x600) and transparent icon for the Remote Ledger tracker page."""
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "..", "scripts"))
from PIL import Image, ImageDraw
from themes import THEMES
from make_brand_options import mark
T = THEMES["ledger"]; OUT = os.path.join(HERE, "..", "assets", "brand")
S = 2                      # supersample, then downscale for clean edges
W, H = 1500 * S, 600 * S
RULE = (233, 229, 220); MARGIN = (168, 208, 188)

im = Image.new("RGB", (W, H), T["bg"]); d = ImageDraw.Draw(im)
for y in range(20 * S, H, 40 * S):                         # ledger paper
    d.line((0, y, W, y), fill=RULE, width=S)
for x in (118 * S, 126 * S):                               # the margin line every ledger book has
    d.line((x, 0, x, H), fill=MARGIN, width=2 * S)
for x in (W - 126 * S, W - 118 * S):
    d.line((x, 0, x, H), fill=MARGIN, width=2 * S)

fw = T["display"](78 * S, "SemiBold"); fs = T["body"](28 * S, "Medium")
word = "Remote Ledger"; sub = "Roles open to India  ·  read from the posting  ·  checked every Monday"
ms = 100 * S; gap = 30 * S
tw = d.textlength(word, font=fw); total = ms + gap + tw
x0 = (W - total) / 2; base = 300 * S
mark(d, "ledger", T, x0 + ms / 2, base - 28 * S, ms)
d.text((x0 + ms + gap, base), word, font=fw, fill=T["ink"], anchor="ls")
d.text((W / 2, 380 * S), sub, font=fs, fill=T["muted"], anchor="ms")
im.resize((1500, 600), Image.LANCZOS).save(f"{OUT}/notion-cover-1500x600.png")

ic = Image.new("RGBA", (512 * S, 512 * S), (0, 0, 0, 0))
mark(ImageDraw.Draw(ic), "ledger", T, 256 * S, 256 * S, 500 * S)
ic.resize((512, 512), Image.LANCZOS).save(f"{OUT}/notion-icon-512.png")
print("ok")
