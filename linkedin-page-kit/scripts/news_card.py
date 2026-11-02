"""Startupro-style news card, Lean Stack palette.

Layout (1080x1350): big photo/logo area on top (drop a real image), bold headline over the lower band,
one-line sub (the number or the twist), source + date, page mark. Also a 1080x1080 square variant.

Usage:
  python3 scripts/news_card.py spec.json out.png
spec: {"headline": "...", "sub": "...", "image": "path or null", "source": "Source · date", "kicker": "TOOLS" , "square": false}
"""
import os, sys, json
sys.path.insert(0, os.path.dirname(__file__))
from PIL import Image, ImageDraw, ImageFilter
from themes import THEMES, ACTIVE
from make_brand_options import mark
T = THEMES[ACTIVE]

def tl(d,t,f): return d.textlength(t, font=f)
def wrap(d,text,f,mw):
    lines,cur=[],""
    for w in text.split():
        t=(cur+" "+w).strip()
        if tl(d,t,f)<=mw: cur=t
        else:
            if cur: lines.append(cur)
            cur=w
    if cur: lines.append(cur)
    return lines

def fit_headline(d, text, mw, max_lines=4, start=84, floor=52):
    size=start
    while size>=floor:
        f=T["display"](size,"SemiBold"); lines=wrap(d,text,f,mw)
        if len(lines)<=max_lines: return f,lines
        size-=4
    f=T["display"](floor,"SemiBold"); return f, wrap(d,text,f,mw)[:max_lines]

def news_card(spec, out):
    square = spec.get("square", False)
    W,H = (1080,1080) if square else (1080,1350)
    img = Image.new("RGB",(W,H),T["bg"]); d=ImageDraw.Draw(img)
    M=72
    photo_h = int(H*0.46)
    # photo area
    box=(0,0,W,photo_h)
    path=spec.get("image")
    if path and os.path.exists(path):
        im=Image.open(path).convert("RGB")
        # cover-crop
        r=max(W/im.width, photo_h/im.height); im=im.resize((int(im.width*r)+1,int(im.height*r)+1))
        x=(im.width-W)//2; y=(im.height-photo_h)//2; img.paste(im.crop((x,y,x+W,y+photo_h)),(0,0))
    else:
        d.rectangle(box, fill=(228,226,219))
        ph=spec.get("placeholder","drop the photo here: the person, the product, or the logo")
        f=T["body"](26)
        for i,ln in enumerate(wrap(d,ph,f,W-2*M)):
            d.text(((W-tl(d,ln,f))/2, photo_h/2-30+i*36), ln, font=f, fill=(120,120,115))
    # soft fade so headline band reads
    fade=Image.new("L",(W,120),0); fd=ImageDraw.Draw(fade)
    for i in range(120): fd.line((0,i,W,i), fill=int(255*i/120))
    band=Image.new("RGB",(W,120),T["bg"]); img.paste(band,(0,photo_h-120),fade)
    # kicker
    y=photo_h+10
    if spec.get("kicker"):
        d.text((M,y), spec["kicker"].upper(), font=T["body"](22,"SemiBold"), fill=T["accent"]); y+=44
    # headline
    f,lines=fit_headline(d, spec["headline"], W-2*M, max_lines=4 if not square else 3)
    for ln in lines:
        d.text((M,y), ln, font=f, fill=T["ink"]); y+=int(f.size*1.08)
    # sub
    if spec.get("sub"):
        y+=18
        fs=T["body"](30)
        for ln in wrap(d,spec["sub"],fs,W-2*M)[:3]:
            d.text((M,y), ln, font=fs, fill=T["muted"]); y+=int(fs.size*1.3)
    # footer: mark + name + source
    d.line((M,H-130,W-M,H-130), fill=T["rule"], width=1)
    mark(d,ACTIVE,T, M+28, H-74, 52)
    d.text((M+70,H-92), T["name"], font=T["body"](26,"SemiBold"), fill=T["ink"])
    if spec.get("source"):
        fsrc=T["body"](20); s=spec["source"]
        d.text((W-M-tl(d,s,fsrc), H-86), s, font=fsrc, fill=T["muted"])
    os.makedirs(os.path.dirname(out) or ".", exist_ok=True); img.save(out); return out

if __name__=="__main__":
    spec=json.load(open(sys.argv[1])); print(news_card(spec, sys.argv[2]))
