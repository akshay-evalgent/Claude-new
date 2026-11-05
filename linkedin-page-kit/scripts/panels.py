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
    size = 220
    f = T["display"](size,"ExtraBold")
    while tl(d,big,f) > W-120 and size > 100:
        size -= 10; f = T["display"](size,"ExtraBold")
    d.text(((W-tl(d,big,f))/2, H/2-220+(220-size)//2), big, font=f, fill=(255,255,255))
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

def text_panel(name, caption, out, size=(1000,1300), bg=(16,18,28), serif=False, sub=None):
    """Typographic wordmark panel for brands whose logo we cannot source."""
    W,H = size; im = Image.new("RGB",(W,H),bg); d = ImageDraw.Draw(im)
    for i in range(H):
        k=i/H; d.line((0,i,W,i), fill=tuple(int(c*(1+0.35*k)) for c in bg))
    from themes import THEMES
    f = THEMES["signal_teardown"]["display"](150,"Bold") if serif else T["display"](150,"ExtraBold")
    lines = name.split("\n"); y = int(H*0.40) - (len(lines)*160)//2
    for ln in lines:
        d.text(((W-tl(d,ln,f))/2, y), ln, font=f, fill=(245,245,250)); y += 160
    fc = T["display"](40,"SemiBold"); d.text(((W-tl(d,caption,fc))/2, y+30), caption, font=fc, fill=(190,198,215))
    if sub:
        fs = T["body"](30); d.text(((W-tl(d,sub,fs))/2, y+90), sub, font=fs, fill=(150,160,180))
    im.save(out); return out

def multi_logo_panel(logos, caption, out, size=(1000,1300), bg=(16,18,28), sub=None, logo_h=150):
    """Several white logos stacked vertically with a caption under them."""
    W,H = size; im = Image.new("RGB",(W,H),bg); d = ImageDraw.Draw(im)
    for i in range(H):
        k=i/H; d.line((0,i,W,i), fill=tuple(int(c*(1+0.35*k)) for c in bg))
    imgs=[]
    for p in logos:
        lg=Image.open(p).convert("RGBA"); lg=lg.crop(lg.getbbox()); r=logo_h/lg.height
        lg=lg.resize((int(lg.width*r), logo_h)); 
        if lg.width > W-200: r2=(W-200)/lg.width; lg=lg.resize((W-200,int(lg.height*r2)))
        imgs.append(lg)
    gap=70; total=sum(i.height for i in imgs)+gap*(len(imgs)-1); y=int(H*0.36)-total//2
    for lg in imgs:
        im.paste(lg, ((W-lg.width)//2, y), lg); y+=lg.height+gap
    f=T["display"](44,"SemiBold"); d.text(((W-tl(d,caption,f))/2, y+20), caption, font=f, fill=(245,245,250))
    if sub:
        fs=T["body"](30); d.text(((W-tl(d,sub,fs))/2, y+80), sub, font=fs, fill=(170,180,200))
    im.save(out); return out
