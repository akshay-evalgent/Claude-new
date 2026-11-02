"""Generate logo, LinkedIn page banner, and post/newsletter header images."""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
from PIL import Image, ImageDraw
from brand import *

OUT = os.path.join(os.path.dirname(__file__), "..", "assets")
os.makedirs(OUT, exist_ok=True)

# 1. Logo 400x400 (LinkedIn page logo min 268x268, square)
img = Image.new("RGB", (400, 400), BG)
d = ImageDraw.Draw(img)
zero_tag(d, 200, 200, 330)
img.save(f"{OUT}/logo-400.png")
img.resize((300, 300), Image.LANCZOS).save(f"{OUT}/logo-300.png")

# 2. Page banner 1128x191 (LinkedIn recommended). Logo overlaps bottom-left on desktop, keep left 300px light.
W, H = 1128, 191
img = Image.new("RGB", (W, H), BG)
d = ImageDraw.Draw(img)
grid(d, W, H, 48)
# right-side accent band
d.rectangle((W - 14, 0, W, H), fill=GREEN)
f_name = font("ExtraBold", 54, display=True)
f_tag = font("Medium", 24)
f_small = font("SemiBold", 18)
d.text((330, 36), "Zero Cost AI", font=f_name, fill=WHITE)
d.text((330, 104), "Run your business on AI without the bill.", font=f_tag, fill=MUTED)
pill(d, (330, 142), "1 free tool or repo, every day", f_small, BG, GREEN, pad=(14, 7), radius=14)
pill(d, (640, 142), "Workflows  •  Open source  •  Cost teardowns", f_small, WHITE, BG2, pad=(14, 7), radius=14)
# faint strike-through price motif on the right
f_price = font("Black", 64, display=True)
px = 1100 - d.textlength("$499/mo", font=f_price)
d.text((px, 62), "$499/mo", font=f_price, fill=(34, 48, 76))
d.line((px - 6, 104, px + d.textlength("$499/mo", font=f_price) + 6, 92), fill=AMBER, width=7)
img.save(f"{OUT}/banner-1128x191.png")

# 3. Square post template 1080x1080 (single-image posts / newsletter header crop)
W, H = 1200, 630
img = Image.new("RGB", (W, H), BG)
d = ImageDraw.Draw(img)
grid(d, W, H, 60)
zero_tag(d, 150, 315, 200)
d.text((300, 190), "Zero Cost AI", font=font("ExtraBold", 72, display=True), fill=WHITE)
text_block(d, (300, 285), "The weekly $0 AI stack for people who run businesses.", font("Medium", 34), MUTED, 800)
pill(d, (300, 410), "Subscribe on LinkedIn", font("SemiBold", 26), BG, GREEN, pad=(26, 14), radius=22)
img.save(f"{OUT}/newsletter-header-1200x630.png")
print("assets written to", os.path.abspath(OUT))
