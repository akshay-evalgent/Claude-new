"""Final Lean Stack asset pack: logos, banners (both LinkedIn sizes), newsletter covers, post cards."""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
from PIL import Image, ImageDraw
from themes import THEMES, ACTIVE
from make_brand_options import mark

T = THEMES[ACTIVE]; TD = THEMES[ACTIVE+"_teardown"]
OUT = os.path.join(os.path.dirname(__file__), "..", "assets", "brand"); os.makedirs(OUT, exist_ok=True)
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

# ---- logos
for s in (400, 300):
    im = Image.new("RGB", (s, s), T["bg"]); mark(ImageDraw.Draw(im), ACTIVE, T, s/2, s/2, s*0.78); im.save(f"{OUT}/logo-{s}.png")
# newsletter logo (300x300, mark on white)
im = Image.new("RGB", (300,300), (255,255,255)); mark(ImageDraw.Draw(im), ACTIVE, T, 150, 150, 240); im.save(f"{OUT}/newsletter-logo-300.png")

# ---- banners: A (minimal) and B (teardown promise), in 1128x191 and 4200x700
def banner(variant, W, H):
    k = W/1128.0
    im = Image.new("RGB", (W,H), T["bg"]); d = ImageDraw.Draw(im)
    x0 = int(330*k)
    if variant == "A":
        d.text((x0, int(40*k)), T["name"], font=T["display"](int(58*k)), fill=T["ink"])
        d.text((x0 + tl(d,T["name"],T["display"](int(58*k))) + int(26*k), int(72*k)), "AI news · tool swaps · thought experiments", font=T["body"](int(24*k)), fill=T["muted"])
        d.line((x0, int(150*k), W-int(60*k), int(150*k)), fill=T["rule"], width=max(2,int(2*k)))
        d.text((x0, int(158*k)), T["promise"], font=T["body"](int(17*k),"Medium"), fill=T["muted"])
        r=int(20*k); d.ellipse((W-int(90*k), int(30*k), W-int(90*k)+2*r, int(30*k)+2*r), fill=T["accent"])
    else:
        d.text((x0, int(34*k)), T["name"], font=T["display"](int(54*k)), fill=T["ink"])
        d.text((x0, int(100*k)), T["tagline"] if len(T["tagline"])<48 else "AI news · tool swaps · thought experiments", font=T["body"](int(24*k)), fill=T["muted"])
        # right: a mini swap
        fx = T["display"](int(34*k)); rx = W-int(400*k)
        d.text((rx, int(44*k)), "$2,310", font=fx, fill=T["muted"]); d.line((rx-int(4*k), int(66*k), rx+tl(d,"$2,310",fx)+int(4*k), int(60*k)), fill=T["strike"], width=max(3,int(5*k)))
        d.text((rx, int(96*k)), "$47 / month", font=fx, fill=T["accent"])
        d.text((rx, int(146*k)), "THE SWAP: ONE PAID TOOL, ONE FREE WAY", font=T["body"](int(14*k),"SemiBold"), fill=T["muted"])
        d.line((x0, int(150*k), rx-int(40*k), int(150*k)), fill=T["rule"], width=max(2,int(2*k)))
        d.text((x0, int(158*k)), "What happened in AI today. The cheaper tool that does the job. One question to sit with.", font=T["body"](int(17*k),"Medium"), fill=T["muted"])
    return im
for v in "AB":
    banner(v,1128,191).save(f"{OUT}/banner-{v}-1128x191.png")
    banner(v,4200,700).save(f"{OUT}/banner-{v}-4200x700.png")

# ---- newsletter cover 1920x1080 + edition cover generator
def cover(title, kicker, out, serif=False):
    W,H = 1920,1080; th = TD if serif else T
    im = Image.new("RGB", (W,H), T["bg"]); d = ImageDraw.Draw(im)
    mark(d, ACTIVE, T, 180, 170, 170)
    d.text((300, 120), T["name"].upper(), font=T["body"](30,"SemiBold"), fill=T["muted"])
    d.text((300, 165), kicker, font=T["body"](30,"Medium"), fill=th["accent"])
    y = block(d, (140, 380), title, th["display"](118), T["ink"], 1640, 1.05)
    d.line((140, H-170, W-140, H-170), fill=T["rule"], width=2)
    d.text((140, H-140), T["tagline"] if len(T["tagline"])<48 else "AI news · tool swaps · thought experiments", font=T["body"](30), fill=T["muted"])
    im.save(out)
cover("Founder Signal Weekly", "WEEKLY NEWSLETTER  •  FIVE SWAPS, WHAT YOU KEEP, WHAT YOU GIVE UP", f"{OUT}/newsletter-cover-1920x1080.png")
cover("The week AI scored 12% on expert work, and the tools that still beat their paid rivals", "FOUNDER SIGNAL WEEKLY  •  ISSUE 01", f"{OUT}/edition-01-cover-1920x1080.png")
cover("Intercom vs Chatwoot: the $390 question", "THE SWAP  •  No. 1", f"{OUT}/swap-01-cover-1920x1080.png", serif=True)

# ---- single-image post cards (1080x1350)
def card_frame(th):
    im = Image.new("RGB", (1080,1350), th["bg"]); d = ImageDraw.Draw(im)
    d.text((96,72), T["name"].upper(), font=T["body"](20,"SemiBold"), fill=T["muted"])
    d.line((96,112,984,112), fill=T["rule"], width=1); d.line((96,1232,984,1232), fill=T["rule"], width=1)
    d.text((96,1254), T["tagline"] if len(T["tagline"])<48 else "AI news · tool swaps · thought experiments", font=T["body"](20), fill=T["muted"])
    return im, d

def swap_card(left, lprice, right, rprice, saving, keep, giveup, out):
    im,d = card_frame(T)
    d.text((96,150), "THE SWAP", font=T["body"](20,"SemiBold"), fill=T["accent"])
    f = T["display"](58); fp = T["display"](120)
    d.text((96,230), left, font=f, fill=T["muted"])
    d.text((96,310), lprice, font=fp, fill=T["muted"]); d.line((90, 390, 96+tl(d,lprice,fp)+6, 376), fill=T["strike"], width=8)
    d.text((96,470), "↓", font=T["sym"](70), fill=T["accent"])
    d.text((96,570), right, font=f, fill=T["ink"])
    d.text((96,650), rprice, font=fp, fill=T["accent"])
    d.line((96,820,984,820), fill=T["rule"], width=1)
    d.text((96,850), "YOU KEEP", font=T["body"](20,"SemiBold"), fill=T["muted"]); block(d,(96,886),keep,T["body"](28),T["ink"],400,1.2)
    d.text((560,850), "YOU GIVE UP", font=T["body"](20,"SemiBold"), fill=T["muted"]); block(d,(560,886),giveup,T["body"](28),T["ink"],424,1.2)
    fs = T["display"](40); d.rounded_rectangle((96,1100,96+tl(d,saving,fs)+56,1176), radius=38, fill=T["accent"]); d.text((124,1114), saving, font=fs, fill=T["bg"])
    im.save(out)

def question_card(kicker, question, options, out, serif=False):
    th = TD if serif else T
    im,d = card_frame(th)
    d.text((96,150), kicker, font=T["body"](20,"SemiBold"), fill=th["accent"])
    y = block(d,(96,230),question,th["display"](84),T["ink"],888,1.05)
    y += 40
    for i,o in enumerate(options):
        d.text((96,y), f"{chr(65+i)}", font=T["mono"](30,"Bold"), fill=th["accent"]); block(d,(150,y),o,T["body"](34),T["ink"],830,1.2); y += 70
    d.text((96,1130), "Tell us in the comments. We read all of them.", font=T["body"](26), fill=T["muted"])
    im.save(out)

swap_card("Typeform Plus", "$59", "Tally Pro", "$29", "Save $360 / yr",
          "Unlimited forms, logic, payments, file uploads, Notion-style editor.",
          "Video questions. Typeform's brand on the form.", f"{OUT}/card-swap-sample.png")
question_card("WE WANT YOUR INPUT", "Which bill should we tear down next?",
              ["HubSpot for a 10-person sales team", "Intercom plus Zendesk for support", "Adobe Creative Cloud for a 3-person agency", "Your bill. Name it below."],
              f"{OUT}/card-question-sample.png")
question_card("THE TEARDOWN  •  DEBATE", "Is a $6 VPS really 'free'? Defend your answer.",
              ["Yes. $6 is a rounding error next to $400.", "No. Your time is the real bill.", "Depends who maintains it."],
              f"{OUT}/card-debate-sample.png", serif=True)
print("pack written to", os.path.abspath(OUT))
