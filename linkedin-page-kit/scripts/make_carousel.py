"""Render a LinkedIn document carousel (PDF + PNG slides) from a JSON spec.

Usage:
  python3 scripts/make_carousel.py content/carousel-sample.json --out assets/carousels/sample

Spec format:
{
  "title": "5 free tools that replace $1,140/mo of SaaS",
  "subtitle": "Open source. Self-host or free tier. Ready today.",
  "items": [
    {"name": "n8n", "replaces": "Zapier Pro", "saves": "$49/mo", "what": "Visual workflow automation...",
     "how": "docker run -it n8nio/n8n", "stars": "60k", "url": "github.com/n8n-io/n8n"}
  ],
  "cta": "Follow Zero Cost AI for one free tool a day.",
  "total_saved": "$1,140/mo"
}
"""
import argparse, json, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from PIL import Image, ImageDraw
from brand import *

W, H = 1080, 1350  # 4:5 portrait, best for LinkedIn document posts
M = 80             # margin

def frame(page, total):
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)
    grid(d, W, H, 60)
    # header: brand + page counter
    zero_tag(d, M + 34, 92, 68, with_spark=False)
    d.text((M + 90, 70), "Zero Cost AI", font=font("Bold", 34), fill=WHITE)
    d.text((W - M - 90, 76), f"{page:02d} / {total:02d}", font=font("Medium", 26), fill=MUTED)
    # footer swipe hint
    d.line((M, H - 110, W - M, H - 110), fill=(30, 42, 66), width=2)
    d.text((M, H - 90), "Swipe  →", font=font("SemiBold", 26), fill=GREEN)
    d.text((W - M - 420, H - 90), "Free tools • Open source • Workflows", font=font("Medium", 24), fill=MUTED)
    return img, d

def cover(spec, total):
    img, d = frame(1, total)
    pill(d, (M, 210), "FREE  •  OPEN SOURCE  •  WORKS TODAY", font("Bold", 24), BG, GREEN)
    y = text_block(d, (M, 300), spec["title"], font("ExtraBold", 86, display=True), WHITE, W - 2 * M, 1.08)
    if spec.get("subtitle"):
        y = text_block(d, (M, y + 30), spec["subtitle"], font("Medium", 38), MUTED, W - 2 * M)
    if spec.get("total_saved"):
        d.text((M, H - 330), "Total you stop paying:", font=font("Medium", 30), fill=MUTED)
        d.text((M, H - 285), spec["total_saved"], font=font("Black", 120, display=True), fill=GREEN)
    return img

def item_slide(it, idx, total):
    img, d = frame(idx, total)
    # name + stars
    d.text((M, 200), f"{idx - 1}.", font=font("Black", 60, display=True), fill=GREEN)
    d.text((M + 90, 206), it["name"], font=font("ExtraBold", 64, display=True), fill=WHITE)
    if it.get("stars"):
        pill(d, (M, 300), f"★ {it['stars']} stars", font("SemiBold", 24), WHITE, BG2, pad=(16, 8))
    if it.get("license"):
        pill(d, (M + 230, 300), it["license"], font("SemiBold", 24), WHITE, BG2, pad=(16, 8))
    # replaces box
    bx = (M, 380, W - M, 530)
    d.rounded_rectangle(bx, radius=24, fill=BG2)
    d.text((M + 30, 400), "REPLACES", font=font("Bold", 22), fill=MUTED)
    rf = font("Bold", 44)
    d.text((M + 30, 440), it.get("replaces", ""), font=rf, fill=WHITE)
    if it.get("saves"):
        sw = d.textlength(it["saves"], font=rf)
        d.text((W - M - 30 - sw, 440), it["saves"], font=rf, fill=AMBER)
        d.line((W - M - 34 - sw, 466, W - M - 26, 458), fill=AMBER, width=5)
        d.text((W - M - 30 - d.textlength("you pay: $0", font=font("SemiBold", 24)), 490), "you pay: $0", font=font("SemiBold", 24), fill=GREEN)
    # what it does
    y = text_block(d, (M, 580), it.get("what", ""), font("Medium", 36), WHITE, W - 2 * M, 1.25)
    # how to start
    if it.get("how"):
        d.text((M, y + 40), "START IN 1 LINE", font=font("Bold", 22), fill=MUTED)
        cb = (M, y + 80, W - M, y + 160)
        d.rounded_rectangle(cb, radius=16, fill=(6, 10, 20), outline=(40, 56, 86), width=2)
        d.text((M + 24, y + 102), "$ " + it["how"][:52], font=ImageFont_mono(30), fill=GREEN)
    if it.get("url"):
        d.text((M, H - 170), it["url"], font=font("Medium", 26), fill=MUTED)
    return img

def ImageFont_mono(size):
    from PIL import ImageFont
    return ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf", size)

def cta_slide(spec, total):
    img, d = frame(total, total)
    zero_tag(d, W // 2, 430, 260)
    y = text_block(d, (M, 620), spec.get("cta", "Follow Zero Cost AI for one free tool a day."),
                   font("ExtraBold", 64, display=True), WHITE, W - 2 * M, 1.1)
    text_block(d, (M, y + 30), "Save this. Send it to the person who approves your software budget.",
               font("Medium", 34), MUTED, W - 2 * M)
    pill(d, (M, H - 300), "Subscribe to the weekly $0 AI Stack newsletter", font("Bold", 28), BG, GREEN, pad=(24, 14), radius=22)
    return img

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("spec"); ap.add_argument("--out", default="assets/carousels/out")
    a = ap.parse_args()
    spec = json.load(open(a.spec))
    total = len(spec["items"]) + 2
    pages = [cover(spec, total)] + [item_slide(it, i + 2, total) for i, it in enumerate(spec["items"])] + [cta_slide(spec, total)]
    os.makedirs(a.out, exist_ok=True)
    for i, p in enumerate(pages, 1):
        p.save(f"{a.out}/slide-{i:02d}.png")
    pages[0].save(f"{a.out}/carousel.pdf", save_all=True, append_images=pages[1:], resolution=150)
    print(f"{total} slides -> {a.out}/carousel.pdf")

if __name__ == "__main__":
    main()
