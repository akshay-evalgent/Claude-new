"""'Free stack' list card: paid tool struck through -> free/open-source tool, star count, one-line note.
Light Founder Signal theme, 1080x1350 (portrait) or 1080x1080 (square)."""
import os, sys, json
sys.path.insert(0, os.path.dirname(__file__))
from PIL import Image, ImageDraw
from themes import THEMES, ACTIVE
from make_brand_options import mark
T = THEMES[ACTIVE]
def tl(d,t,f): return d.textlength(t, font=f)

def stack_card(spec, out, square=False):
    W, H = (1080, 1080) if square else (1080, 1350)
    im = Image.new("RGB", (W, H), T["bg"]); d = ImageDraw.Draw(im); M = 72
    d.text((M, 56), T["name"].upper(), font=T["body"](20, "SemiBold"), fill=T["muted"])
    d.line((M, 94, W-M, 94), fill=T["rule"], width=1)
    y = 122
    d.text((M, y), spec["kicker"].upper(), font=T["body"](22, "SemiBold"), fill=T["accent"]); y += 44
    ft = T["display"](70 if not square else 60, "SemiBold"); d.text((M, y), spec["title"], font=ft, fill=T["ink"]); y += int(ft.size*1.32)
    fs = T["body"](26); d.text((M, y), spec["subtitle"], font=fs, fill=T["muted"]); y += 52
    rows = spec["rows"]; rh = (H - y - (250 if not square else 210)) // len(rows)
    fpaid = T["body"](26, "Medium"); ffree = T["display"](40 if not square else 34, "SemiBold"); fstar = T["mono"](24, "Bold"); fnote = T["body"](21)
    for r in rows:
        d.line((M, y, W-M, y), fill=T["rule"], width=1)
        ty = y + 16
        pw = tl(d, r["paid"], fpaid); d.text((M, ty), r["paid"], font=fpaid, fill=T["muted"])
        d.line((M-2, ty+20, M+pw+2, ty+16), fill=T["strike"], width=3)
        d.text((M, ty+36), r["free"], font=ffree, fill=T["ink"])
        if r.get("stars"):
            num = r["stars"] + " stars"; fsym = T["sym"](24)
            nx = W-M-tl(d, num, fstar); d.text((nx, ty+44), num, font=fstar, fill=T["accent"])
            d.text((nx-tl(d, "★ ", fsym), ty+42), "★", font=fsym, fill=T["accent"])
        if r.get("note") and not square:
            d.text((M, ty+36+int(ffree.size*1.15)), r["note"], font=fnote, fill=T["muted"])
        y += rh
    d.line((M, y, W-M, y), fill=T["rule"], width=1)
    # warning box
    by = y + 22; bh = 92 if not square else 80
    d.rounded_rectangle((M, by, W-M, by+bh), radius=14, fill=T["bg2"], outline=T["rule"], width=2)
    d.text((M+24, by+18), spec["warning_title"], font=T["body"](24, "SemiBold"), fill=T["strike"])
    d.text((M+24, by+52), spec["warning"], font=T["body"](22), fill=T["ink"])
    # footer
    d.line((M, H-96, W-M, H-96), fill=T["rule"], width=1)
    mark(d, ACTIVE, T, M+22, H-56, 40)
    d.text((M+56, H-70), "thefoundersignal", font=T["body"](24, "SemiBold"), fill=T["ink"])
    sv = spec.get("footer_right", "Save this for your next hire"); f2 = T["body"](22, "Medium")
    d.text((W-M-tl(d, sv, f2), H-68), sv, font=f2, fill=T["accent"])
    os.makedirs(os.path.dirname(out) or ".", exist_ok=True); im.save(out); return out

if __name__ == "__main__":
    spec = json.load(open(sys.argv[1])); stack_card(spec, sys.argv[2]); stack_card(spec, sys.argv[2].replace(".png","-square.png"), square=True)
