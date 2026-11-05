"""Carousel (PDF document post) for a free-stack spec: cover, one slide per swap, warning, recap, CTA."""
import os, sys, json
sys.path.insert(0, os.path.dirname(__file__))
from PIL import Image, ImageDraw
from themes import THEMES, ACTIVE
from make_brand_options import mark
T = THEMES[ACTIVE]; W, H, M = 1080, 1350, 84
def tl(d,t,f): return d.textlength(t, font=f)
def wrap(d,text,f,mw):
    out,cur=[], ""
    for w in text.split():
        t=(cur+" "+w).strip()
        if tl(d,t,f)<=mw: cur=t
        else: out.append(cur); cur=w
    if cur: out.append(cur)
    return out
def block(d,xy,text,f,fill,mw,gap=1.25):
    x,y=xy
    for ln in wrap(d,text,f,mw): d.text((x,y),ln,font=f,fill=fill); y+=int(f.size*gap)
    return y

def frame(n, total, swipe=True):
    im=Image.new("RGB",(W,H),T["bg"]); d=ImageDraw.Draw(im)
    d.text((M,64),T["name"].upper(),font=T["body"](20,"SemiBold"),fill=T["muted"])
    c=f"{n}/{total}"; d.text((W-M-tl(d,c,T["body"](20,"Medium")),64),c,font=T["body"](20,"Medium"),fill=T["muted"])
    d.line((M,102,W-M,102),fill=T["rule"],width=1)
    d.line((M,H-112,W-M,H-112),fill=T["rule"],width=1)
    mark(d,ACTIVE,T,M+20,H-66,36)
    d.text((M+50,H-80),"thefoundersignal",font=T["body"](22,"SemiBold"),fill=T["ink"])
    if swipe:
        s="swipe  →"; f=T["body"](22,"SemiBold"); d.text((W-M-tl(d,s,f),H-78),s,font=f,fill=T["accent"])
    return im,d

def stars_txt(d, x_right, y, n):
    f=T["mono"](30,"Bold"); fs=T["sym"](30); s=f"{n:,} stars"
    x=x_right-tl(d,s,f); d.text((x,y),s,font=f,fill=T["accent"]); d.text((x-tl(d,"★ ",fs),y-2),"★",font=fs,fill=T["accent"])

def cover(spec,total):
    im,d=frame(1,total)
    d.text((M,170),spec["kicker"].upper(),font=T["body"](24,"SemiBold"),fill=T["accent"])
    y=block(d,(M,220),spec["cover_title"],T["display"](88,"SemiBold"),T["ink"],W-2*M,1.08)
    y=block(d,(M,y+24),spec["cover_sub"],T["body"](32),T["muted"],W-2*M,1.3)+40
    fp=T["body"](34,"Medium")
    for r in spec["rows"]:
        pw=tl(d,r["paid"],fp); d.text((M,y),r["paid"],font=fp,fill=T["muted"]); d.line((M-3,y+24,M+pw+3,y+19),fill=T["strike"],width=4); y+=60
    return im

def swap(spec,r,i,total):
    im,d=frame(i+2,total)
    d.text((M,160),f"SWAP {i+1} OF {len(spec['rows'])}  ·  {r['job'].upper()}",font=T["body"](22,"SemiBold"),fill=T["accent"])
    fp=T["display"](46,"Medium"); y=220
    for ln in wrap(d,r["paid"],fp,W-2*M):
        pw=tl(d,ln,fp); d.text((M,y),ln,font=fp,fill=T["muted"]); d.line((M-3,y+31,M+pw+3,y+25),fill=T["strike"],width=5); y+=60
    d.text((M,y+6),"↓",font=T["sym"](54),fill=T["accent"]); y+=88
    sz=104; ff=T["display"](sz,"SemiBold")
    while tl(d,r["free"],ff) > W-2*M and sz > 56: sz-=4; ff=T["display"](sz,"SemiBold")
    d.text((M,y+(104-sz)//2),r["free"],font=ff,fill=T["ink"]); y+=int(104*1.18)
    stars_txt(d,W-M,y,r["stars_n"]); d.text((M,y+2),"open source",font=T["body"](28,"Medium"),fill=T["muted"]); y+=78
    d.line((M,y,W-M,y),fill=T["rule"],width=1); y+=30
    d.text((M,y),"WHAT YOU GET",font=T["body"](20,"SemiBold"),fill=T["muted"]); y+=40
    for g in r["get"]:
        d.text((M,y),"✓",font=T["sym"](30),fill=T["accent"]); y=block(d,(M+46,y),g,T["body"](32),T["ink"],W-2*M-46,1.22)+10
    y+=18; d.text((M,y),"THE CATCH",font=T["body"](20,"SemiBold"),fill=T["muted"]); y+=40
    y=block(d,(M,y),r["catch"],T["body"](30),T["ink"],W-2*M,1.25)
    d.text((M,H-170),r["repo"],font=T["mono"](24),fill=T["muted"])
    return im

def warning(spec,total):
    im,d=frame(len(spec["rows"])+2,total)
    d.text((M,170),"ONE THING TO BE CAREFUL ABOUT",font=T["body"](24,"SemiBold"),fill=T["strike"])
    y=block(d,(M,230),"Use AI to read CVs faster. Not to reject people.",T["display"](80,"SemiBold"),T["ink"],W-2*M,1.08)+40
    for line in spec["warning_lines"]:
        d.text((M,y),"–",font=T["body"](32,"Bold"),fill=T["muted"]); y=block(d,(M+40,y),line,T["body"](32),T["ink"],W-2*M-40,1.28)+18
    return im

def recap(spec,total):
    im,d=frame(len(spec["rows"])+3,total)
    d.text((M,170),"THE WHOLE STACK",font=T["body"](24,"SemiBold"),fill=T["accent"]); y=230
    for r in spec["rows"]:
        d.line((M,y,W-M,y),fill=T["rule"],width=1); y+=22
        d.text((M,y),r["job"],font=T["body"](24,"Medium"),fill=T["muted"]); y+=36
        d.text((M,y),r["free"],font=T["display"](48,"SemiBold"),fill=T["ink"])
        fp=T["body"](24); s="instead of "+r["paid_short"]; d.text((W-M-tl(d,s,fp),y+18),s,font=fp,fill=T["muted"]); y+=88
    return im

def cta(spec,total):
    im,d=frame(total,total,swipe=False)
    y=block(d,(M,260),"Save this for your next hire.",T["display"](92,"SemiBold"),T["ink"],W-2*M,1.06)+40
    y=block(d,(M,y),"Repo links are in the first comment. I post one free tool most days on this page.",T["body"](34),T["muted"],W-2*M,1.3)+60
    f=T["body"](32,"SemiBold"); t="What's in your hiring stack?"
    d.rounded_rectangle((M,y,M+tl(d,t,f)+64,y+84),radius=42,fill=T["accent"]); d.text((M+32,y+22),t,font=f,fill=T["bg"])
    return im

def build(spec, outdir):
    total=len(spec["rows"])+4
    pages=[cover(spec,total)]+[swap(spec,r,i,total) for i,r in enumerate(spec["rows"])]+[warning(spec,total),recap(spec,total),cta(spec,total)]
    os.makedirs(outdir,exist_ok=True)
    for i,p in enumerate(pages,1): p.save(f"{outdir}/slide-{i:02d}.png")
    pages[0].save(f"{outdir}/carousel.pdf",save_all=True,append_images=pages[1:],resolution=150)
    return len(pages)

if __name__=="__main__":
    print(build(json.load(open(sys.argv[1])), sys.argv[2]))
