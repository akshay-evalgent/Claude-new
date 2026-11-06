"""Remote Ledger single-image cards: tracker list, pay gap, fee comparison, rules checklist, poll.
All 1080x1350 (portrait) with a 1080x1080 square variant."""
import os, sys, json
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "..", "scripts"))
from PIL import Image, ImageDraw
from themes import THEMES
from make_brand_options import mark
T = THEMES["ledger"]; KEY = "ledger"
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
def block(d,xy,text,f,fill,mw,gap=1.15):
    x,y=xy
    for ln in wrap(d,text,f,mw): d.text((x,y),ln,font=f,fill=fill); y+=int(f.size*gap)
    return y
def fit_font(d, text, mk, mw, start, floor=24):
    s=start
    while s>floor and tl(d,text,mk(s))>mw: s-=2
    return mk(s)

def frame(square, checked):
    W,H = (1080,1080) if square else (1080,1350)
    im = Image.new("RGB",(W,H),T["bg"]); d=ImageDraw.Draw(im); M=72
    mark(d, KEY, T, M+18, 70, 40)
    d.text((M+48, 56), "REMOTE LEDGER", font=T["body"](20,"SemiBold"), fill=T["muted"])
    d.line((M,100,W-M,100), fill=T["rule"], width=1)
    d.line((M,H-96,W-M,H-96), fill=T["rule"], width=1)
    d.text((M, H-70), "remoteledger", font=T["body"](24,"SemiBold"), fill=T["ink"])
    f2=T["body"](22,"Medium"); d.text((W-M-tl(d,checked,f2), H-68), checked, font=f2, fill=T["muted"])
    return im,d,W,H,M

def tracker_card(spec, out, square=False):
    im,d,W,H,M = frame(square, spec.get("checked","Checked 6 Nov 2026"))
    y=128
    d.text((M,y), spec["kicker"].upper(), font=T["body"](22,"SemiBold"), fill=T["accent"]); y+=42
    ft=fit_font(d, spec["title"], lambda s:T["display"](s,"SemiBold"), W-2*M, 64 if not square else 54)
    d.text((M,y), spec["title"], font=ft, fill=T["ink"]); y+=int(ft.size*1.25)
    y=block(d,(M,y),spec["subtitle"],T["body"](25),T["muted"],W-2*M,1.2)+14
    rows=spec["rows"]; rh=(H-96-y-20)//len(rows)
    fco=T["display"](31 if not square else 27,"SemiBold"); fro=T["body"](23 if not square else 20); fwh=T["mono"](20,"Medium"); fpay=T["mono"](21,"Bold")
    for r in rows:
        d.line((M,y,W-M,y), fill=T["rule"], width=1)
        ty=y+12
        d.text((M,ty), r["company"], font=fco, fill=T["ink"])
        block(d,(M,ty+int(fco.size*1.2)), r["role"], fro, T["muted"], W-2*M-330, 1.18)
        tag=r["where"]; tw=tl(d,tag,fwh)
        d.rounded_rectangle((W-M-tw-24, ty+2, W-M, ty+34), radius=8, fill=T["bg2"], outline=T["rule"], width=1)
        d.text((W-M-tw-12, ty+7), tag, font=fwh, fill=T["accent"])
        if r.get("pay"):
            d.text((W-M-tl(d,r["pay"],fpay), ty+44), r["pay"], font=fpay, fill=T["ink"])
        y+=rh
    d.line((M,y,W-M,y), fill=T["rule"], width=1)
    os.makedirs(os.path.dirname(out) or ".", exist_ok=True); im.save(out); return out

def pay_card(spec, out, square=False):
    im,d,W,H,M = frame(square, spec.get("checked","Checked 6 Nov 2026"))
    y=128
    d.text((M,y), spec["kicker"].upper(), font=T["body"](22,"SemiBold"), fill=T["accent"]); y+=42
    ft=fit_font(d, spec["title"], lambda s:T["display"](s,"SemiBold"), W-2*M, 72 if not square else 60)
    d.text((M,y), spec["title"], font=ft, fill=T["ink"]); y+=int(ft.size*1.3)
    y=block(d,(M,y),spec["subtitle"],T["body"](26),T["muted"],W-2*M,1.2)+30
    # two panels
    gap=28; pw=(W-2*M-gap)//2; ph=400 if not square else 340
    for i,p in enumerate(spec["panels"]):
        x=M+i*(pw+gap)
        d.rounded_rectangle((x,y,x+pw,y+ph), radius=20, fill=T["bg2"], outline=T["rule"], width=2)
        d.text((x+28,y+26), p["label"].upper(), font=T["body"](19,"SemiBold"), fill=T["muted"])
        fb=fit_font(d, p["big"], lambda s:T["mono"](s,"Bold"), pw-56, 96 if not square else 80)
        d.text((x+28,y+70), p["big"], font=fb, fill=(T["ink"] if i==0 else T["accent"]))
        block(d,(x+28,y+70+int(fb.size*1.25)),p["caption"],T["body"](23),T["ink"],pw-56,1.22)
    y+=ph+30
    y=block(d,(M,y),spec["note"],T["body"](27 if not square else 23,"Medium"),T["ink"],W-2*M,1.25)+22
    if spec.get("source"):
        d.line((M,y,W-M,y), fill=T["rule"], width=1)
        block(d,(M,y+16),spec["source"],T["mono"](20),T["muted"],W-2*M,1.3)
    os.makedirs(os.path.dirname(out) or ".", exist_ok=True); im.save(out); return out

def fee_card(spec, out, square=False):
    im,d,W,H,M = frame(square, spec.get("checked","Checked 6 Nov 2026"))
    y=128
    d.text((M,y), spec["kicker"].upper(), font=T["body"](22,"SemiBold"), fill=T["accent"]); y+=42
    ft=fit_font(d, spec["title"], lambda s:T["display"](s,"SemiBold"), W-2*M, 68 if not square else 56)
    d.text((M,y), spec["title"], font=ft, fill=T["ink"]); y+=int(ft.size*1.3)
    y=block(d,(M,y),spec["subtitle"],T["body"](25),T["muted"],W-2*M,1.2)+26
    rows=spec["rows"]; rh=(H-96-y-(150 if not square else 40))//len(rows)
    fname=T["display"](34 if not square else 30,"SemiBold"); frule=T["body"](22); fkeep=T["mono"](40 if not square else 34,"Bold")
    maxv=max(r["keep"] for r in rows)
    for i,r in enumerate(rows):
        d.line((M,y,W-M,y), fill=T["rule"], width=1)
        ty=y+14
        d.text((M,ty), r["name"], font=fname, fill=T["ink"])
        kt=f"${r['keep']:,.0f}"; d.text((W-M-tl(d,kt,fkeep), ty-2), kt, font=fkeep, fill=(T["accent"] if i==0 else T["ink"]))
        ty2=ty+int(fname.size*1.25)
        ty3=block(d,(M,ty2), r["rule"], frule, T["muted"], W-2*M, 1.2)
        # bar
        by=ty3+14; bw=int((W-2*M)*r["keep"]/maxv)
        d.rounded_rectangle((M,by,W-M,by+14), radius=7, fill=T["bg2"], outline=T["rule"], width=1)
        d.rounded_rectangle((M,by,M+bw,by+14), radius=7, fill=(T["accent"] if i==0 else T["ink"]))
        y+=rh
    d.line((M,y,W-M,y), fill=T["rule"], width=1)
    if not square: block(d,(M,y+22),spec["note"],T["body"](23,"Medium"),T["muted"],W-2*M,1.22)
    os.makedirs(os.path.dirname(out) or ".", exist_ok=True); im.save(out); return out

def rules_card(spec, out, square=False):
    im,d,W,H,M = frame(square, spec.get("checked","Free to pitch. Free to apply."))
    y=128
    d.text((M,y), spec["kicker"].upper(), font=T["body"](22,"SemiBold"), fill=T["accent"]); y+=42
    y=block(d,(M,y),spec["title"],T["display"](62 if not square else 52,"SemiBold"),T["ink"],W-2*M,1.08)+10
    y=block(d,(M,y),spec["subtitle"],T["body"](25),T["muted"],W-2*M,1.2)+24
    items=spec["items"]; avail=H-96-y-(130 if not square else 30); rh=avail//len(items)
    fn=T["mono"](26,"Bold"); fi=T["body"](27 if not square else 24,"Medium")
    for i,it in enumerate(items):
        d.line((M,y,W-M,y), fill=T["rule"], width=1)
        d.rounded_rectangle((M,y+16,M+44,y+60), radius=10, fill=T["accent"])
        d.text((M+13,y+22), str(i+1), font=fn, fill=T["bg2"])
        block(d,(M+66,y+18),it,fi,T["ink"],W-2*M-66,1.2)
        y+=rh
    d.line((M,y,W-M,y), fill=T["rule"], width=1)
    if not square:
        fs=T["display"](34,"SemiBold"); d.rounded_rectangle((M,y+22,M+tl(d,spec["badge"],fs)+48,y+86), radius=32, fill=T["ink"]); d.text((M+24,y+34), spec["badge"], font=fs, fill=T["bg"])
    os.makedirs(os.path.dirname(out) or ".", exist_ok=True); im.save(out); return out

def poll_card(spec, out, square=False):
    im,d,W,H,M = frame(square, spec.get("checked","Vote in the poll. Argue in the comments."))
    y=128
    d.text((M,y), spec["kicker"].upper(), font=T["body"](22,"SemiBold"), fill=T["accent"]); y+=42
    y=block(d,(M,y),spec["question"],T["display"](76 if not square else 58,"SemiBold"),T["ink"],W-2*M,1.08)+44
    for i,o in enumerate(spec["options"]):
        d.rounded_rectangle((M,y-10,W-M,y+66), radius=16, fill=T["bg2"], outline=T["rule"], width=2)
        d.text((M+22,y+8), chr(65+i), font=T["mono"](32,"Bold"), fill=T["accent"]); block(d,(M+74,y+10),o,T["body"](33 if not square else 27,"Medium"),T["ink"],W-2*M-100,1.2); y+=96
    if not square: block(d,(M,y+30),spec["note"],T["body"](26),T["muted"],W-2*M,1.25)
    os.makedirs(os.path.dirname(out) or ".", exist_ok=True); im.save(out); return out

def repost_card(spec, out, square=False):
    """Quote a found public post: the fact in large type, the author, where it was said. Link goes in the first comment."""
    im,d,W,H,M = frame(square, spec.get("checked", spec.get("via","via LinkedIn")))
    y=128
    d.text((M,y), spec["kicker"].upper(), font=T["body"](22,"SemiBold"), fill=T["accent"]); y+=46
    d.text((M-6,y-30), "\u201c", font=T["display"](150,"Bold"), fill=T["accent"])
    y+=74
    fq=T["display"](54 if not square else 44,"SemiBold")
    while len(wrap(d,spec["quote"],fq,W-2*M))*int(fq.size*1.14) > (H-96-y-330 if not square else H-96-y-230) and fq.size>30:
        fq=T["display"](fq.size-2,"SemiBold")
    y=block(d,(M,y),spec["quote"],fq,T["ink"],W-2*M,1.14)+34
    d.line((M,y,M+120,y), fill=T["accent"], width=4); y+=24
    d.text((M,y), spec["author"], font=T["display"](34,"SemiBold"), fill=T["ink"]); y+=46
    y=block(d,(M,y),spec["author_sub"],T["body"](24),T["muted"],W-2*M,1.2)+10
    d.text((M,y), spec.get("via","via LinkedIn"), font=T["mono"](21), fill=T["muted"]); y+=40
    if spec.get("take") and not square:
        d.line((M,y+10,W-M,y+10), fill=T["rule"], width=1)
        d.text((M,y+28), "OUR TAKE", font=T["body"](20,"SemiBold"), fill=T["accent"])
        block(d,(M,y+58),spec["take"],T["body"](26,"Medium"),T["ink"],W-2*M,1.25)
    os.makedirs(os.path.dirname(out) or ".", exist_ok=True); im.save(out); return out

RENDER = dict(tracker=tracker_card, pay=pay_card, fee=fee_card, rules=rules_card, poll=poll_card, repost=repost_card)
if __name__ == "__main__":
    spec=json.load(open(sys.argv[1])); fn=RENDER[spec["type"]]
    fn(spec, sys.argv[2]); fn(spec, sys.argv[2].replace(".png","-square.png"), square=True); print(sys.argv[2])
