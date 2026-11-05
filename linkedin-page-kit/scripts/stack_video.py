"""Animated 4:5 MP4 of a free-stack card: title in, then each row builds itself
(paid name, red strike drawn across, free tool slides up, star count ticks up), warning box, footer.
Usage: python3 scripts/stack_video.py spec.json out.mp4"""
import os, sys, json, subprocess
sys.path.insert(0, os.path.dirname(__file__))
from PIL import Image, ImageDraw
from themes import THEMES, ACTIVE
from make_brand_options import mark
T = THEMES[ACTIVE]; W, H, M, FPS = 1080, 1350, 72, 30
def tl(d,t,f): return d.textlength(t, font=f)
def ease(x): x=max(0.0,min(1.0,x)); return 1-(1-x)**3
def mix(c,a): return tuple(int(T["bg"][i]*(1-a)+c[i]*a) for i in range(3))
def seg(t,a,b): return ease((t-a)/(b-a)) if b>a else float(t>=a)

def render(spec, out, seconds=17):
    rows=spec["rows"]
    f_head=T["body"](20,"SemiBold"); f_kick=T["body"](22,"SemiBold"); f_title=T["display"](70,"SemiBold"); f_sub=T["body"](26)
    f_paid=T["body"](26,"Medium"); f_free=T["display"](40,"SemiBold"); f_star=T["mono"](24,"Bold"); f_sym=T["sym"](24); f_note=T["body"](21)
    top=122+44+int(70*1.32)+52; rh=(H-top-250)//len(rows)
    row_t0=2.0; row_dur=1.55
    warn_t=row_t0+row_dur*len(rows)+0.2; foot_t=warn_t+0.7
    proc=subprocess.Popen(["ffmpeg","-y","-loglevel","error","-f","rawvideo","-pix_fmt","rgb24","-s",f"{W}x{H}","-r",str(FPS),"-i","-",
                           "-c:v","libx264","-pix_fmt","yuv420p","-crf","18","-preset","medium","-movflags","+faststart",out], stdin=subprocess.PIPE)
    for fi in range(int(seconds*FPS)):
        t=fi/FPS; im=Image.new("RGB",(W,H),T["bg"]); d=ImageDraw.Draw(im)
        a=seg(t,0,0.5); d.text((M,56),T["name"].upper(),font=f_head,fill=mix(T["muted"],a))
        d.line((M,94,M+int((W-2*M)*a),94),fill=T["rule"],width=1)
        a=seg(t,0.2,0.8); d.text((M,122+int(12*(1-a))),spec["kicker"].upper(),font=f_kick,fill=mix(T["accent"],a))
        a=seg(t,0.5,1.2); d.text((M,166+int(24*(1-a))),spec["title"],font=f_title,fill=mix(T["ink"],a))
        a=seg(t,1.1,1.7); d.text((M,166+int(70*1.32)),spec["subtitle"],font=f_sub,fill=mix(T["muted"],a))
        y=top
        for i,r in enumerate(rows):
            t0=row_t0+i*row_dur
            if t<t0: break
            d.line((M,y,M+int((W-2*M)*seg(t,t0,t0+0.3)),y),fill=T["rule"],width=1)
            ty=y+16
            a=seg(t,t0,t0+0.3); d.text((M,ty),r["paid"],font=f_paid,fill=mix(T["muted"],a))
            pw=tl(d,r["paid"],f_paid); s=seg(t,t0+0.3,t0+0.7)
            if s>0: d.line((M-2,ty+20,M-2+int((pw+4)*s),ty+20-int(4*s)),fill=T["strike"],width=3)
            a=seg(t,t0+0.6,t0+1.0); d.text((M,ty+36+int(18*(1-a))),r["free"],font=f_free,fill=mix(T["ink"],a))
            c=seg(t,t0+0.7,t0+1.4)
            if c>0:
                n=int(r["stars_n"]*c); num=f"{n:,} stars"; nx=W-M-tl(d,num,f_star)
                d.text((nx,ty+44),num,font=f_star,fill=mix(T["accent"],min(1,c*2)))
                d.text((nx-tl(d,"★ ",f_sym),ty+42),"★",font=f_sym,fill=mix(T["accent"],min(1,c*2)))
            a=seg(t,t0+0.9,t0+1.3); d.text((M,ty+36+int(40*1.15)),r["note"],font=f_note,fill=mix(T["muted"],a))
            y+=rh
        if t>=row_t0+row_dur*len(rows): d.line((M,y,W-M,y),fill=T["rule"],width=1)
        a=seg(t,warn_t,warn_t+0.6)
        if a>0:
            by=y+22+int(16*(1-a)); bh=92
            d.rounded_rectangle((M,by,W-M,by+bh),radius=14,fill=mix(T["bg2"],a),outline=mix(T["rule"],a),width=2)
            d.text((M+24,by+18),spec["warning_title"],font=T["body"](24,"SemiBold"),fill=mix(T["strike"],a))
            d.text((M+24,by+52),spec["warning"],font=T["body"](22),fill=mix(T["ink"],a))
        a=seg(t,foot_t,foot_t+0.6)
        if a>0:
            d.line((M,H-96,W-M,H-96),fill=mix(T["rule"],a),width=1)
            if a>0.5: mark(d,ACTIVE,T,M+22,H-56,40)
            d.text((M+56,H-70),"thefoundersignal",font=T["body"](24,"SemiBold"),fill=mix(T["ink"],a))
            sv="Save this for your next hire"; f2=T["body"](22,"Medium"); d.text((W-M-tl(d,sv,f2),H-68),sv,font=f2,fill=mix(T["accent"],a))
        proc.stdin.write(im.tobytes())
    proc.stdin.close(); proc.wait(); return out

if __name__=="__main__":
    print(render(json.load(open(sys.argv[1])), sys.argv[2]))
