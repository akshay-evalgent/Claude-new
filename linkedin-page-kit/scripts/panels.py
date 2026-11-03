"""Data panels to use as collage photos when no rights-cleared photo exists yet: a bar leaderboard and a stat tile."""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
from PIL import Image, ImageDraw
from themes import THEMES, ACTIVE
T = THEMES[ACTIVE]
def tl(d,t,f): return d.textlength(t, font=f)

def bars_panel(rows, title, out, size=(1000, 1300), bg=(20, 24, 40)):
    W,H = size; im = Image.new("RGB",(W,H),bg); d = ImageDraw.Draw(im)
    d.text((70,90), title.upper(), font=T["body"](30,"SemiBold"), fill=(170,180,200))
    maxv = max(v for _,v in rows); y = 190; barw = W-140-180
    for i,(label,v) in enumerate(rows):
        col = T["accent"] if i==0 else (120,130,160)
        d.text((70,y), label, font=T["display"](42,"SemiBold"), fill=(245,245,250)); y += 62
        w = max(10, int(barw*v/maxv)); d.rounded_rectangle((70,y,70+w,y+34), radius=17, fill=col)
        d.text((70+w+22,y-4), f"{v:.1f}%", font=T["mono"](34,"Bold"), fill=col); y += 110
    im.save(out); return out

def tile_panel(big, sub, out, size=(800,1300), bg=(140, 36, 36)):
    W,H = size; im = Image.new("RGB",(W,H),bg); d = ImageDraw.Draw(im)
    f = T["display"](220,"ExtraBold"); d.text(((W-tl(d,big,f))/2, H/2-220), big, font=f, fill=(255,255,255))
    fs = T["display"](44,"SemiBold")
    y = H/2+40
    for ln in sub.split("\n"):
        d.text(((W-tl(d,ln,fs))/2, y), ln, font=fs, fill=(255,230,230)); y += 56
    im.save(out); return out

def logo_panel(logo_png, caption, out, size=(1000,1300), bg=(16,18,28), logo_w=560, sub=None):
    """A logo (RGBA, white) centred on a dark panel with a caption under it."""
    W,H = size; im = Image.new("RGB",(W,H),bg); d = ImageDraw.Draw(im)
    for i in range(H):  # subtle vertical gradient
        k=i/H; d.line((0,i,W,i), fill=tuple(int(c*(1+0.35*k)) for c in bg))
    lg = Image.open(logo_png).convert("RGBA"); bb = lg.getbbox(); lg = lg.crop(bb)
    r = logo_w/lg.width; lg = lg.resize((int(lg.width*r), int(lg.height*r)))
    im.paste(lg, ((W-lg.width)//2, int(H*0.40)-lg.height//2), lg)
    f = T["display"](44,"SemiBold"); d.text(((W-tl(d,caption,f))/2, int(H*0.40)+lg.height//2+60), caption, font=f, fill=(245,245,250))
    if sub:
        fs = T["body"](30); d.text(((W-tl(d,sub,fs))/2, int(H*0.40)+lg.height//2+120), sub, font=fs, fill=(170,180,200))
    im.save(out); return out
