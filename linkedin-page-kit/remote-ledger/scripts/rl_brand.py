"""Remote Ledger brand pack: logos and LinkedIn banners (both sizes)."""
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "..", "scripts"))
from PIL import Image, ImageDraw
from themes import THEMES
from make_brand_options import mark
T = THEMES["ledger"]; KEY = "ledger"
OUT = os.path.join(HERE, "..", "assets", "brand"); os.makedirs(OUT, exist_ok=True)
def tl(d,t,f): return d.textlength(t, font=f)

for s in (400, 300):
    im = Image.new("RGB", (s, s), T["bg"]); mark(ImageDraw.Draw(im), KEY, T, s/2, s/2, s*0.78); im.save(f"{OUT}/logo-{s}.png")
im = Image.new("RGB", (300,300), (255,255,255)); mark(ImageDraw.Draw(im), KEY, T, 150, 150, 240); im.save(f"{OUT}/newsletter-logo-300.png")

def banner(variant, W, H):
    k = W/1128.0
    im = Image.new("RGB", (W,H), T["bg"]); d = ImageDraw.Draw(im)
    x0 = int(330*k)
    d.text((x0, int(28*k)), T["name"], font=T["display"](int(56*k)), fill=T["ink"])
    d.text((x0, int(96*k)), "Remote work for clients abroad  ·  checked for India", font=T["body"](int(23*k),"Medium"), fill=T["muted"])
    if variant == "A":
        d.line((x0, int(146*k), W-int(60*k), int(146*k)), fill=T["rule"], width=max(2,int(2*k)))
        d.text((x0, int(156*k)), "Open to India?   What does it really pay?   How does the money land?   Three checks, every post.", font=T["body"](int(17*k),"Medium"), fill=T["muted"])
        # three ledger ticks at right
        rx = W-int(100*k)
        for i,(w,c) in enumerate([(0.5,T["ink"]),(0.7,T["ink"]),(1.0,T["accent"])]):
            y = int((40+i*26)*k); lw=int(56*k)
            d.rounded_rectangle((rx-int(lw*w), y, rx, y+int(10*k)), radius=int(5*k), fill=c)
    else:
        fx = T["mono"](int(30*k),"Bold"); rx = W-int(400*k)
        d.text((rx, int(30*k)), "advertised  $85/hr", font=fx, fill=T["muted"])
        d.text((rx, int(74*k)), "India median  $21/hr", font=fx, fill=T["accent"])
        d.text((rx, int(120*k)), "WE PRINT BOTH NUMBERS", font=T["body"](int(13*k),"SemiBold"), fill=T["muted"])
        d.line((x0, int(146*k), rx-int(40*k), int(146*k)), fill=T["rule"], width=max(2,int(2*k)))
        d.text((x0, int(156*k)), "Roles and requests open to India. The real rate behind the advertised one. Getting paid without losing 6%.", font=T["body"](int(16*k),"Medium"), fill=T["muted"])
    return im
for v in "AB":
    banner(v,1128,191).save(f"{OUT}/banner-{v}-1128x191.png")
    banner(v,4200,700).save(f"{OUT}/banner-{v}-4200x700.png")
print("brand written to", os.path.abspath(OUT))
