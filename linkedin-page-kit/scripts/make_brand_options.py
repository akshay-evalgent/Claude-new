"""Render logo + banner for all six directions and a one-page comparison sheet."""
import os, sys, math
sys.path.insert(0, os.path.dirname(__file__))
from PIL import Image, ImageDraw
from themes import THEMES

OUT = os.path.join(os.path.dirname(__file__), "..", "assets", "options")
os.makedirs(OUT, exist_ok=True)

def tl(d, t, f): return d.textlength(t, font=f)

def mark(d, key, T, cx, cy, s):
    """Logo mark per direction. s = overall size."""
    a, ink, bg2 = T["accent"], T["ink"], T["bg2"]
    if key in ("signal", "signal_teardown"):   # three ascending bars: a signal
        d.rounded_rectangle((cx-s/2, cy-s/2, cx+s/2, cy+s/2), radius=s*0.18, fill=bg2, outline=T["rule"], width=max(2,int(s*0.012)))
        bw = s*0.14; gap = s*0.07; x = cx - (3*bw + 2*gap)/2
        for i,(h,c) in enumerate([(0.22,ink),(0.38,ink),(0.56,a)]):
            d.rounded_rectangle((x, cy+s*0.28-s*h, x+bw, cy+s*0.28), radius=bw*0.35, fill=c); x += bw+gap
    elif key == "lean":      # three stacked bars, shrinking: a lean stack
        d.rounded_rectangle((cx-s/2, cy-s/2, cx+s/2, cy+s/2), radius=s*0.18, fill=bg2, outline=T["rule"], width=max(2,int(s*0.012)))
        for i,(w,c) in enumerate([(0.56,ink),(0.40,ink),(0.24,a)]):
            y = cy - s*0.22 + i*s*0.22
            d.rounded_rectangle((cx-s*w/2, y-s*0.06, cx+s*w/2, y+s*0.06), radius=s*0.06, fill=c)
    elif key == "underpriced":   # price tag with a slash
        pts=[(cx-s*0.36,cy-s*0.18),(cx+s*0.12,cy-s*0.18),(cx+s*0.38,cy),(cx+s*0.12,cy+s*0.18),(cx-s*0.36,cy+s*0.18)]
        d.rounded_rectangle((cx-s/2, cy-s/2, cx+s/2, cy+s/2), radius=s*0.5, fill=ink)
        d.polygon(pts, fill=T["bg"])
        d.ellipse((cx-s*0.30,cy-s*0.05,cx-s*0.20,cy+s*0.05), fill=ink)
        d.line((cx-s*0.40,cy+s*0.26,cx+s*0.40,cy-s*0.26), fill=a, width=max(3,int(s*0.05)))
    elif key == "swapped":   # two arcs swapping
        d.ellipse((cx-s/2, cy-s/2, cx+s/2, cy+s/2), fill=T["bg2"])
        w=max(4,int(s*0.075)); r=s*0.30
        d.arc((cx-r,cy-r,cx+r,cy+r), 200, 340, fill=a, width=w)
        d.arc((cx-r,cy-r,cx+r,cy+r), 20, 160, fill=T["ink"], width=w)
        # arrow heads
        ah=s*0.10
        ex,ey = cx+r*math.cos(math.radians(340)), cy+r*math.sin(math.radians(340))
        d.polygon([(ex-ah*0.2,ey-ah*0.9),(ex+ah*0.8,ey+ah*0.1),(ex-ah*0.6,ey+ah*0.5)], fill=a)
        ex,ey = cx+r*math.cos(math.radians(160)), cy+r*math.sin(math.radians(160))
        d.polygon([(ex+ah*0.2,ey+ah*0.9),(ex-ah*0.8,ey-ah*0.1),(ex+ah*0.6,ey-ah*0.5)], fill=T["ink"])
    elif key == "zero":   # $0 tag
        d.rounded_rectangle((cx-s/2, cy-s/2, cx+s/2, cy+s/2), radius=s*0.22, fill=bg2, outline=a, width=max(3,int(s*0.025)))
        f = T["display"](int(s*0.5),"Black"); t="$0"
        d.text((cx-tl(d,t,f)/2, cy-f.size*0.62), t, font=f, fill=ink)
    elif key == "frugal":   # coin with slot
        d.ellipse((cx-s/2, cy-s/2, cx+s/2, cy+s/2), fill=a)
        d.ellipse((cx-s*0.38, cy-s*0.38, cx+s*0.38, cy+s*0.38), outline=T["bg"], width=max(2,int(s*0.02)))
        d.rounded_rectangle((cx-s*0.22, cy-s*0.05, cx+s*0.22, cy+s*0.05), radius=s*0.05, fill=T["bg"])
    elif key == "tenx":   # 10x in brackets
        d.rectangle((cx-s/2, cy-s/2, cx+s/2, cy+s/2), fill=T["bg2"])
        f = T["display"](int(s*0.40),"ExtraBold"); t="10x"
        d.text((cx-tl(d,t,f)/2, cy-f.size*0.60), t, font=f, fill=a)
        w=max(3,int(s*0.03))
        d.line((cx-s*0.42,cy-s*0.32,cx-s*0.42,cy+s*0.32), fill=ink, width=w); d.line((cx-s*0.42,cy-s*0.32,cx-s*0.30,cy-s*0.32), fill=ink, width=w); d.line((cx-s*0.42,cy+s*0.32,cx-s*0.30,cy+s*0.32), fill=ink, width=w)
        d.line((cx+s*0.42,cy-s*0.32,cx+s*0.42,cy+s*0.32), fill=ink, width=w); d.line((cx+s*0.42,cy-s*0.32,cx+s*0.30,cy-s*0.32), fill=ink, width=w); d.line((cx+s*0.42,cy+s*0.32,cx+s*0.30,cy+s*0.32), fill=ink, width=w)

def logo(key, T, size=400):
    img = Image.new("RGB", (size, size), T["bg"]); d = ImageDraw.Draw(img)
    mark(d, key, T, size/2, size/2, size*0.78)
    return img

def banner(key, T):
    W,H = 1128,191
    img = Image.new("RGB", (W,H), T["bg"]); d = ImageDraw.Draw(img)
    st = T["style"]
    # left 300px stays quiet (page logo overlaps there on desktop)
    if st in ("minimal-light", "warm-minimal", "editorial-light"):
        d.line((330, 150, W-60, 150), fill=T["rule"], width=2)
        f = T["display"](58); d.text((330, 40), T["name"], font=f, fill=T["ink"])
        f2 = T["body"](24); d.text((330+tl(d,T["name"],f)+26, 72), T["tagline"], font=f2, fill=T["muted"])
        d.text((330, 158), T["promise"], font=T["body"](17,"Medium"), fill=T["muted"])
        d.ellipse((W-90, 30, W-50, 70), fill=T["accent"])
    elif st == "editorial":
        d.rectangle((0,0,W,10), fill=T["ink"])
        f = T["display"](66); d.text((330, 48), T["name"], font=f, fill=T["ink"])
        d.text((330, 128), T["tagline"].upper(), font=T["body"](20,"SemiBold"), fill=T["accent"])
        # masthead rules on right
        for i,y in enumerate((60,70,80)): d.line((W-330, y, W-40, y), fill=T["ink"], width=2)
        d.text((W-330, 96), "A DAILY TEARDOWN OF SOFTWARE BILLS", font=T["body"](15,"SemiBold"), fill=T["muted"])
    elif st == "duotone":
        d.rectangle((W-330,0,W,H), fill=T["accent"])
        f = T["display"](64); d.text((330, 44), T["name"], font=f, fill=T["ink"])
        d.text((330, 124), T["tagline"], font=T["body"](24,"Medium"), fill=T["muted"])
        f3 = T["display"](40,"ExtraBold")
        d.text((W-290, 44), "$499/mo", font=f3, fill=T["bg"]); d.line((W-294, 70, W-290+tl(d,"$499/mo",f3)+4, 62), fill=T["bg"], width=6)
        d.text((W-290, 100), "→  $0", font=f3, fill=T["bg"])
    elif st == "dark-tech":
        d.rectangle((W-10,0,W,H), fill=T["accent"])
        f = T["display"](58); d.text((330, 44), T["name"], font=f, fill=T["ink"])
        d.text((330, 118), T["tagline"], font=T["body"](24,"Medium"), fill=T["muted"])
        d.text((330, 156), "1 TOOL A DAY  •  FREE OR NEAR-FREE  •  SETUP INCLUDED", font=T["body"](15,"SemiBold"), fill=T["accent"])
    elif st == "mono-brutalist":
        f = T["display"](62,"ExtraBold"); d.text((330, 46), T["name"], font=f, fill=T["ink"])
        d.text((330, 128), "> " + T["tagline"], font=T["mono"](22), fill=T["accent"])
        d.rectangle((W-300, 40, W-40, 150), outline=T["ink"], width=3)
        d.text((W-284, 56), "$2,300/mo", font=T["mono"](28,"Bold"), fill=T["muted"]); d.line((W-288, 76, W-284+tl(d,"$2,300/mo",T["mono"](28,"Bold"))+4, 70), fill=T["accent"], width=4)
        d.text((W-284, 100), "$   230/mo", font=T["mono"](28,"Bold"), fill=T["ink"])
    return img

if __name__ == "__main__":
    cards = []
    for key, T in THEMES.items():
        lg = logo(key, T); bn = banner(key, T)
        lg.save(f"{OUT}/{key}-logo-400.png"); bn.save(f"{OUT}/{key}-banner-1128x191.png")
        # card: banner with logo overlapped like LinkedIn desktop, plus name/tagline row
        card = Image.new("RGB", (1128, 191+150), T["bg"]); card.paste(bn, (0,0))
        card.paste(lg.resize((140,140)), (40, 120))
        d = ImageDraw.Draw(card)
        d.text((210, 215), T["name"], font=T["display"](40), fill=T["ink"])
        d.text((210, 266), f"linkedin.com/company/{T['handle']}", font=T["body"](20,"Medium"), fill=T["accent"])
        d.text((210, 296), T["promise"], font=T["body"](20), fill=T["muted"])
        cards.append(card)
    sheet = Image.new("RGB", (1128+80, len(cards)*(341+40)+40), (255,255,255)); y=40
    for c in cards:
        sheet.paste(c, (40, y)); y += 341+40
    sheet.save(f"{OUT}/name-options-sheet.png")
    print("written", os.path.abspath(OUT))
