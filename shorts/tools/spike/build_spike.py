import os
"""Clip specs for The Spike Files #001-#003 (data: public view counts pulled Nov 21 2026)."""
import json, os, re, glob, subprocess, sys
from concurrent.futures import ThreadPoolExecutor
S = os.environ.get("SPIKE_WORK", ".")
SH = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
BO, SPEC, SRC = S + "/bo", S + "/spike/spec", S + "/spike/src"
sel = dict((n, c) for c, n in json.load(open(BO + "/sel.json")))
def hist(name):
    es = [e for e in json.load(open(f"{BO}/full/{sel[name]}.json"))["entries"] if e][::-1]
    return es, [e.get("view_count") or 0 for e in es]
def th(name, i):
    return glob.glob(f"{BO}/thumbs/{name.replace(' ', '_')}/{i:03d}_*.jpg")[0]
C = []
def clip(kind, n, **spec): C.append((kind, n, spec))

# ---- #001 Fusion Bricks
N = "Fusion Bricks"; es, v = hist(N)
clip("chart", "fb_chart_flat", views=v[:162], grow=[30, 162], dur=5.0, hold=1.2, highlight=[161], callouts=[{"i": 161, "text": "31M"}], title="FUSION BRICKS · EVERY SHORT")
pre = [1, 15, 29, 43, 57, 71, 85, 99, 113, 127, 134, 141, 148, 155, 158, 159, 160, 161]
clip("wall", "fb_wall", items=[{"img": th(N, i), "views": v[i - 1]} for i in pre], cols=6, rows=3, dur=3.6,
     pop={"img": th(N, 162), "views": v[161], "label": "SHORT #162"}, pop_at=1.5)
clip("versus", "fb_versus", left={"img": th(N, 159), "views": v[158], "title": es[158]["title"].split("#")[0].strip(), "tag": "SHOWING LEGO"},
     right={"img": th(N, 162), "views": v[161], "title": "Fixing a Stuck LEGO Minifigure with YOUR Comments", "tag": "FIXING LEGO"}, dur=4.5, right_at=0.9)
clip("stat", "fb_stat", title="TITLES · BEFORE #162 VS AFTER", rows=[{"label": "have a question or a cliffhanger (…)", "a": 17, "b": 80},
     {"label": "just say \"Building …\"", "a": 8, "b": 1}], dur=4.5)
post = [163, 168, 238, 251, 298, 314, 330, 346]
clip("wall", "fb_wall_after", items=[{"img": th(N, i), "views": v[i - 1]} for i in post], cols=4, rows=2, dur=3.5, dim=False, stagger=0.08)
clip("chart", "fb_chart_after", views=v, grow=[162, len(v)], dur=4.5, hold=0.8, highlight=[i for i in range(161, len(v)) if v[i] >= 1e6],
     callouts=[{"i": 250, "text": "53M"}], title="EVERY SHORT SINCE #162")
clip("rule", "fb_rule", lines=["1. Put a problem in the very first frame.", "2. Solve it with your hands, on camera.", "3. Title = the question, not the answer."], dur=6)
clip("logo", "fb_logo", line="FILE #002 · NEXT", dur=3)

# ---- #002 Shano Ghibli
N = "Shano Ghibli"; es, v = hist(N)
clip("versus", "sg_versus_tease", left={"img": th(N, 1), "views": v[0], "title": "Crispy Thread Chicken", "tag": "FOOD"},
     right={"img": th(N, 30), "views": v[29], "title": "Nana Nani's Long-Awaited Train Journey", "tag": "FEELINGS"}, dur=3.4, right_at=0.9)
clip("chart", "sg_chart", views=v, grow=[1, len(v)], dur=4.6, hold=0.8, highlight=[i for i in range(len(v)) if v[i] >= 1e6],
     callouts=[{"i": 23, "text": "#24: 10M"}, {"i": 29, "text": "16M"}], title="SHANO GHIBLI · EVERY SHORT")
clip("wall", "sg_wall", items=[{"img": th(N, i), "views": v[i - 1]} for i in range(1, 13)], cols=4, rows=3, dur=3.6,
     pop={"img": th(N, 14), "views": v[13], "label": "SHORT #14: A STORY"}, pop_at=1.7)
clip("versus", "sg_versus", left={"img": th(N, 21), "views": v[20], "title": "Nadru Yakhni Recipe", "tag": "A RECIPE"},
     right={"img": th(N, 24), "views": v[23], "title": "A Mother's Happiness When Her Daughters Come Home", "tag": "A FEELING"}, dur=4.2, right_at=0.8)
clip("stat", "sg_stat", title="TITLES · BEFORE #24 VS AFTER", rows=[{"label": "mention food", "a": 83, "b": 33},
     {"label": "are about family and feelings", "a": 30, "b": 92}], dur=4.5)
clip("wall", "sg_wall_after", items=[{"img": th(N, i), "views": v[i - 1]} for i in range(24, 36)], cols=4, rows=3, dur=3.5, dim=False, stagger=0.06)
clip("rule", "sg_rule", lines=["1. People don't share food. They share grandma.", "2. A face and a feeling in the first frame.", "3. Title = the moment: \"When Grandma…\""], dur=6)
clip("logo", "sg_logo", line="FILE #003 · NEXT", dur=3)

# ---- #003 OddVibe
N = "OddVibe"; es, v = hist(N)
clip("versus", "ov_versus_tease", left={"img": th(N, 13), "views": v[12], "title": "Top 10 Letters to Use as a Mustache", "tag": "SHORT #13"},
     right={"img": th(N, 17), "views": v[16], "title": "Top 10 Letters to Hide a Body", "tag": "SHORT #17"}, dur=3.6, right_at=1.0)
clip("chart", "ov_chart", views=v, grow=[1, len(v)], dur=4.6, hold=0.8, highlight=[i for i in range(len(v)) if v[i] >= 1e6],
     callouts=[{"i": 16, "text": "2.6M"}, {"i": 77, "text": "11M"}], title="ODDVIBE · EVERY SHORT")
clip("wall", "ov_wall", items=[{"img": th(N, i), "views": v[i - 1]} for i in range(1, 17)], cols=4, rows=4, dur=3.8,
     pop={"img": th(N, 17), "views": v[16], "label": "TRY #5: SHORT #17"}, pop_at=2.0)
clip("wall", "ov_wall_after", items=[{"img": th(N, i), "views": v[i - 1]} for i in [17, 18, 44, 47, 60, 68, 70, 78]], cols=4, rows=2, dur=3.5, dim=False, stagger=0.08)
clip("stat", "ov_stat", title="UPLOADS · BEFORE #17 VS AFTER", rows=[{"label": "are a \"Top 10 Letters / Languages\" ranking", "a": 25, "b": 71}], dur=3.5)
clip("rule", "ov_rule", lines=["1. One idea got a flicker? Don't switch ideas.", "2. Switch the premise until one hits.", "3. Then make it the whole channel."], dur=6)
clip("logo", "ov_logo", line="FILE #004 · NEXT", dur=3)

only = set(sys.argv[1:])
def go(c):
    kind, n, spec = c
    if only and n not in only: return None
    sp = f"{SPEC}/{n}.json"; json.dump(spec, open(sp, "w"))
    r = subprocess.run(["python3", f"{SH}/spike_clips.py", kind, sp, f"{SRC}/{n}.mp4"], capture_output=True, text=True, stdin=subprocess.DEVNULL)
    return n + (" ok" if r.returncode == 0 else " FAIL " + r.stderr[-500:])
with ThreadPoolExecutor(4) as ex:
    for r in ex.map(go, C):
        if r: print(r, flush=True)
