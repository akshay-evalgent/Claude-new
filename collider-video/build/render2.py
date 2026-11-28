"""v2 renderer: archive footage + photos + upgraded motion graphics.

usage:
  python render2.py prep   TIMING FOOTAGE_DIR VIDEOS_JSON          # cut + grade clip segments
  python render2.py render TIMING FOOTAGE_DIR GEO_DIR OUT.mp4
  python render2.py still  TIMING FOOTAGE_DIR GEO_DIR OUTPREFIX "vi,t;vi,t"   # vi = visual index
"""
import cairo, json, math, os, random, subprocess, sys, time
from multiprocessing import Pool
import numpy as np
from PIL import Image, ImageFilter

sys.path.insert(0, os.path.dirname(__file__))
import render as R
from render import W, H, FPS, BG, Y, WH, GR, DIM, PAPER, INK, BOLD, SEMI, SERIF
from render import cl, p, eo, eio, lerp, rgb, txt, typed, poly, arc, dot, callout, leader
from shots import S
from visuals import VIS, SOURCES

FOOT = None  # footage dir, set in main

# ------------------------------------------------------------------ visual timeline
def timeline(timing):
    out = []
    for sh in timing["shots"]:
        i = sh["i"]; s = S[i]
        vis = VIS.get(i, [dict(type="shot")])
        tot = sum(v.get("w", 1.0) for v in vis)
        t0 = sh["start"]
        for k, v in enumerate(vis):
            d = sh["dur"] * v.get("w", 1.0) / tot
            out.append(dict(shot=i, k=k, start=t0, dur=d, v=v, key=f"{i:03d}_{k}"))
            t0 += d
    return out

# ------------------------------------------------------------------ prep: cut and grade clips
GRADE_VF = "eq=saturation=0.82:contrast=1.06:brightness=-0.015,colorbalance=rs=0.03:gs=0.0:bs=-0.03:rh=0.03:bh=-0.03"

def prep(timing, foot, videos_json):
    vids = json.load(open(videos_json))
    os.makedirs(os.path.join(foot, "clips"), exist_ok=True)
    for vi in timeline(timing):
        v = vi["v"]
        if v.get("type") != "clip": continue
        src = SOURCES[v["src"]]; out = os.path.join(foot, "clips", vi["key"] + ".mp4")
        if os.path.exists(out): continue
        need = vi["dur"] * v.get("speed", 1.0) + 0.8
        if "url" in src:
            inp = vids[src["url"]]["url"]; pre = ["-user_agent", "ResearchClient/1.0 (documentary research)"]
            vf = f"setpts=PTS/{v.get('speed',1.0)},fps=30,scale=-2:720,pad=1280:720:(ow-iw)/2:0:black,{GRADE_VF}"
        else:
            inp = os.path.join(foot, src["file"]); pre = []
            vf = f"setpts=PTS/{v.get('speed',1.0)},fps=30,scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,{GRADE_VF}"
        for attempt in range(5):
            r = subprocess.run(["ffmpeg", "-v", "error", "-y", *pre, "-ss", str(v["ss"]), "-i", inp, "-t", f"{need:.2f}", "-vf", vf,
                                "-an", "-c:v", "libx264", "-preset", "veryfast", "-crf", "15", "-pix_fmt", "yuv420p", out])
            if r.returncode == 0 and os.path.exists(out): break
            time.sleep(8 * (attempt + 1))
        print("clip", vi["key"], v["src"], v["ss"], f"{need:.1f}s", "ok" if os.path.exists(out) else "FAIL")

# ------------------------------------------------------------------ photos
PHOTO = {}
def grade_arr(a, g):
    a = a.astype(np.float32) / 255.0
    lum = (a[..., 0] * .299 + a[..., 1] * .587 + a[..., 2] * .114)[..., None]
    if g == "mono":
        a = lum * np.array([1.02, 1.0, 0.94])
    elif g == "night":
        a = (lum * .7 + a * .3) * 0.42 * np.array([0.85, 0.95, 1.15])
    elif g == "cold":
        a = (lum * .45 + a * .55) * np.array([0.92, 0.98, 1.06]) * 0.88
    else:
        a = (lum * .18 + a * .82) * np.array([1.03, 1.0, 0.95])
    a = (a - .5) * 1.06 + .5 - .01
    return (np.clip(a, 0, 1) * 255).astype(np.uint8)

def to_surface(rgb_arr):
    h, w, _ = rgb_arr.shape
    arr = np.zeros((h, w, 4), np.uint8)
    arr[..., 0] = rgb_arr[..., 2]; arr[..., 1] = rgb_arr[..., 1]; arr[..., 2] = rgb_arr[..., 0]; arr[..., 3] = 255
    return cairo.ImageSurface.create_for_data(bytearray(arr.tobytes()), cairo.FORMAT_ARGB32, w, h, w * 4)

def photo(src, g="default", blur=0):
    key = (src, g, blur)
    if key not in PHOTO:
        im = Image.open(os.path.join(FOOT, SOURCES[src]["file"])).convert("RGB")
        if max(im.size) > 2600: im.thumbnail((2600, 2600), Image.LANCZOS)
        if blur: im = im.filter(ImageFilter.GaussianBlur(blur))
        PHOTO[key] = to_surface(grade_arr(np.asarray(im), g))
    return PHOTO[key]

def kb_transform(iw, ih, fw, fh, kb, u):
    cx0, cy0, z0, cx1, cy1, z1 = kb
    e = eio(u) * 0.85 + u * 0.15
    cx, cy, z = lerp(cx0, cx1, e), lerp(cy0, cy1, e), lerp(z0, z1, e)
    sc = max(fw / iw, fh / ih) * z
    # clamp so the image always covers the frame
    hw, hh = fw / 2 / sc, fh / 2 / sc
    px = min(max(cx * iw, hw), iw - hw) if iw > 2 * hw else iw / 2
    py = min(max(cy * ih, hh), ih - hh) if ih > 2 * hh else ih / 2
    return sc, px, py

def draw_kb(c, surf, fw, fh, kb, u):
    iw, ih = surf.get_width(), surf.get_height()
    sc, px, py = kb_transform(iw, ih, fw, fh, kb, u)
    c.save(); c.rectangle(0, 0, fw, fh); c.clip()
    c.translate(fw / 2, fh / 2); c.scale(sc, sc); c.translate(-px, -py)
    c.set_source_surface(surf, 0, 0); c.get_source().set_filter(cairo.FILTER_GOOD); c.paint(); c.restore()
    return sc, px, py

def tape(c, t, x, y, lab, rot=-0.04, size=22):
    R.font(c, BOLD, size); lw = R.tw(c, lab, 1) + 36; k = eo(p(t, .2, .5))
    c.save(); c.translate(x, y); c.rotate(rot)
    c.rectangle(0, 0, lw * k, size + 18); rgb(c, Y); c.fill()
    txt(c, lab, 18, size + 6, size, BOLD, INK, 1, track=1, frac=typed(t, .3, lab, 50))
    c.restore()

def vis_photo(c, t, d, v):
    u = t / max(d, .01); g = v.get("grade", "default"); fr = v.get("frame", "full")
    if fr == "full":
        surf = photo(v["src"], g)
        sc, px, py = draw_kb(c, surf, W, H, v["kb"], u)
        for (x, y, lab, sub) in v.get("pins", []):
            fx = W / 2 + (x * surf.get_width() - px) * sc; fy = H / 2 + (y * surf.get_height() - py) * sc
            k = eo(p(t, .5, .9))
            for j in range(2):
                ph = (t * .8 + j * .5) % 1; arc(c, fx, fy, 6 + ph * 22, 0, 2 * math.pi, Y, 1.5, (1 - ph) * k)
            dot(c, fx, fy, 5 * k, Y)
            leader(c, t, .6, [(fx + 6, fy - 6), (fx + 60, fy - 60), (fx + 120, fy - 60)])
            c.rectangle(fx + 118, fy - 98, 360, 62); rgb(c, (0, 0, 0), .55 * eo(p(t, .8, 1.0))); c.fill()
            callout(c, t, .9, fx + 130, fy - 68, lab, sub, 24)
        g2 = cairo.LinearGradient(0, H * .55, 0, H); g2.add_color_stop_rgba(0, 0, 0, 0, 0); g2.add_color_stop_rgba(1, 0, 0, 0, .55)
        c.set_source(g2); c.paint()
    elif fr in ("print", "doc"):
        R.bg(c)
        surf = photo(v["src"], g)
        iw, ih = surf.get_width(), surf.get_height()
        if fr == "print":
            fw, fh = W * .68, H * .68; rot = -0.03
        else:
            fh = H * .9; fw = fh * iw / ih if iw < ih else W * .7; fh = fw * ih / iw if iw >= ih else fh; rot = 0.015
            v = dict(v, kb=(0.5, 0.5, 1.0, 0.5, 0.5, 1.0))
        ui = eo(p(t, 0, .45))
        c.save(); c.translate(W / 2, H / 2 + (1 - ui) * 40); c.rotate(rot + (1 - ui) * .05)
        sk = 1 + .06 * u if fr == "doc" else 1
        c.scale(sk, sk)
        bw = 14 if fr == "print" else 0
        c.rectangle(-fw / 2 - bw + 10, -fh / 2 - bw + 14, fw + 2 * bw, fh + 2 * bw); c.set_source_rgba(0, 0, 0, .6); c.fill()
        c.rectangle(-fw / 2 - bw, -fh / 2 - bw, fw + 2 * bw, fh + 2 * bw); rgb(c, (0.93, 0.92, 0.89)); c.fill()
        c.save(); c.translate(-fw / 2, -fh / 2)
        if fr == "doc":
            c.scale(fw / iw, fh / ih); c.set_source_surface(surf, 0, 0); c.get_source().set_filter(cairo.FILTER_GOOD); c.paint()
            c.restore()
            hk = eo(p(t, .6, 1.3))
            c.rectangle(-fw / 2 + fw * .06, -fh / 2 + fh * .085, fw * .88 * hk, fh * .07); rgb(c, Y, .35); c.fill()
        else:
            draw_kb(c, surf, fw, fh, v["kb"], u); c.restore()
        if v.get("label"): tape(c, t, -fw / 2 - 34, fh / 2 - 26, v["label"])
        c.restore()

# ------------------------------------------------------------------ clips
class Clip:
    def __init__(self, path):
        self.path = path; self.proc = None; self.next = 0
        self.buf = bytearray(W * H * 4)
        self.surf = cairo.ImageSurface.create_for_data(self.buf, cairo.FORMAT_RGB24, W, H, W * 4)
        self.frames = None
    def open(self, f):
        if self.proc: self.proc.kill()
        self.proc = subprocess.Popen(["ffmpeg", "-v", "error", "-ss", f"{f / FPS:.4f}", "-i", self.path, "-f", "rawvideo", "-pix_fmt", "bgr0", "-"],
                                     stdout=subprocess.PIPE)
        self.next = f
    def frame(self, f):
        if self.proc is None or f < self.next or f > self.next + 5: self.open(f)
        while self.next <= f:
            data = self.proc.stdout.read(W * H * 4)
            if len(data) < W * H * 4: break
            self.buf[:] = data; self.next += 1
        return self.surf
    def close(self):
        if self.proc: self.proc.kill(); self.proc = None

CLIPS = {}
def vis_clip(c, t, d, v, key):
    path = os.path.join(FOOT, "clips", key + ".mp4")
    if key not in CLIPS:
        for k in list(CLIPS): CLIPS.pop(k).close()
        CLIPS[key] = Clip(path)
    surf = CLIPS[key].frame(int(t * FPS))
    u = t / max(d, .01); archive = SOURCES[v["src"]].get("archive")
    if archive:
        rgb(c, (0, 0, 0)); c.paint()
        c.save(); z = 1 + .05 * eio(u); c.translate(W / 2, H / 2); c.scale(z, z); c.translate(-W / 2, -H / 2)
        jx = random.Random(int(t * FPS)).uniform(-1, 1)
        c.set_source_surface(surf, jx, 0); c.paint()
        c.restore()
        fl = random.Random(int(t * FPS) * 7).uniform(0, .06)
        c.set_source_rgba(0, 0, 0, fl); c.paint()
    else:
        draw_kb(c, surf, W, H, v["kb"], u)

# ------------------------------------------------------------------ new graphic scenes
def scene_ring3d(c, t, d, s):
    rgb(c, (0.035, 0.035, 0.04)); c.paint()
    g = cairo.RadialGradient(W / 2, H / 2 + 60, 0, W / 2, H / 2 + 60, 600)
    g.add_color_stop_rgba(0, *Y, .07); g.add_color_stop_rgba(1, *Y, 0); c.set_source(g); c.paint()
    mode = s.get("mode", "design")
    yaw = .5 + .09 * t; pitch = .82 - .08 * eio(p(t, 0, d)); dist = 2.55 - .2 * eio(p(t, 0, d)); f = 700
    cy0 = H / 2 + 30
    def pr(x, y, z):
        x1 = x * math.cos(yaw) - z * math.sin(yaw); z1 = x * math.sin(yaw) + z * math.cos(yaw)
        y2 = y * math.cos(pitch) - z1 * math.sin(pitch); z2 = y * math.sin(pitch) + z1 * math.cos(pitch) + dist
        return W / 2 + f * x1 / z2, cy0 + f * y2 / z2, z2
    # ground grid
    for i in range(-10, 11):
        a = .06 * (1 - abs(i) / 11)
        q = [pr(i * .2, 0.02, z * .2)[:2] for z in range(-10, 11)]; poly(c, q, 1, WH, 1, a)
        q = [pr(z * .2, 0.02, i * .2)[:2] for z in range(-10, 11)]; poly(c, q, 1, WH, 1, a)
    if mode == "design": fr = eio(p(t, .1, 2.0))
    elif mode == "erase": fr = 1 - eio(p(t, d * .3, d * .9))
    else: fr = 1
    col = Y if mode != "ghost" else GR
    a_main = 1 if mode != "ghost" else .45
    n = 220
    for rr, w_, a_ in ((1.035, 1.0, .35), (0.965, 1.0, .35), (1.0, 3.0, 1.0)):
        q = [pr(rr * math.cos(2 * math.pi * j / n * fr - math.pi / 2), 0, rr * math.sin(2 * math.pi * j / n * fr - math.pi / 2)) for j in range(n + 1)]
        poly(c, [x[:2] for x in q], 1, col if w_ > 2 else WH, w_, a_ * a_main)
    # detector halls and campus blocks
    def box(x, z, sx, sy, sz, a):
        pts = [pr(x + dx * sx, -dy * sy, z + dz * sz)[:2] for dx in (-1, 1) for dy in (0, 1) for dz in (-1, 1)]
        edges = [(0, 1), (0, 2), (1, 3), (2, 3), (4, 5), (4, 6), (5, 7), (6, 7), (0, 4), (1, 5), (2, 6), (3, 7)]
        for e0, e1 in edges: poly(c, [pts[e0], pts[e1]], 1, WH, 1.2, a)
    if fr > .99 or mode != "design":
        k = eo(p(t, 1.8, 2.4)) if mode == "design" else a_main
        for an in (0, math.pi):
            box(math.cos(an), math.sin(an), .05, .06, .04, k)
        for j in range(5): box(-0.25 + j * .1, 1.18 + (j % 2) * .07, .03, .03 + .02 * (j % 3), .025, k * .7)
    # beams
    if mode in ("design", "ghost") and (fr > .99):
        om = 1.4 if mode == "design" else .5
        for sgn, cc in ((1, WH), (-1, Y)):
            for j in range(30):
                th = sgn * om * t - sgn * j * .025
                x, y = pr(math.cos(th), 0, math.sin(th))[:2]
                dot(c, x, y, 3.6 - j * .1, cc, (1 - j / 30) * a_main)
    rx, ry = pr(1.0, 0, 0)[:2]
    if mode == "design" and s.get("labels"):
        leader(c, t, 1.4, [(rx + 6, ry), (rx + 70, ry - 70), (rx + 120, ry - 70)])
        callout(c, t, 1.6, min(rx + 132, W - 330), ry - 62, "54 MILES", "87 KM RING  ·  ELLIS COUNTY, TEXAS", 52)
    elif mode == "design":
        callout(c, t, 1.2, 70, 110, "SSC", "SUPERCONDUCTING SUPER COLLIDER", 52)
    elif mode == "erase":
        txt(c, "1987 — 1993", W / 2, 120, 40, BOLD, WH, .9, "c", -1)
    elif mode == "ghost":
        txt(c, "40 TeV", W / 2, 130, 52, BOLD, GR, .55 * eo(p(t, .5, 1.5)), "c")
        txt(c, "?", W / 2, 190, 40, SERIF, Y, .9 * eo(p(t, 1.4, 2.2)), "c")

def warp_perspective(surf, tilt, yaw=0.0):
    """Return a new surface: the frame tilted back by `tilt` radians (simple 3D card)."""
    a = np.ndarray((H, W, 4), np.uint8, buffer=surf.get_data())
    im = Image.frombuffer("RGBA", (W, H), bytes(a), "raw", "BGRA", 0, 1)
    f = 900.0
    def proj(x, y):
        X, Yy = x - W / 2, y - H / 2
        z = f + Yy * math.sin(tilt) + X * math.sin(yaw)
        return W / 2 + X * math.cos(yaw) * f / z, H / 2 + Yy * math.cos(tilt) * f / z
    src = [(0, 0), (W, 0), (W, H), (0, H)]
    dst = [proj(*q) for q in src]
    # coefficients mapping output -> input
    A = []; B = []
    for (x, y), (u, v) in zip(dst, src):
        A.append([x, y, 1, 0, 0, 0, -u * x, -u * y]); B.append(u)
        A.append([0, 0, 0, x, y, 1, -v * x, -v * y]); B.append(v)
    coef = np.linalg.solve(np.array(A, float), np.array(B, float))
    out = im.transform((W, H), Image.PERSPECTIVE, tuple(coef), Image.BILINEAR)
    arr = np.asarray(out.convert("RGBA")).copy()
    bgra = arr[..., [2, 1, 0, 3]].copy()
    return cairo.ImageSurface.create_for_data(bytearray(bgra.tobytes()), cairo.FORMAT_ARGB32, W, H, W * 4)

def scene_map3d(c, t, d, s):
    sub = cairo.ImageSurface(cairo.FORMAT_ARGB32, W, H); sc = cairo.Context(sub)
    R.scene_map(sc, t, d, s)
    tilt = lerp(0.85, 0.12, eio(p(t, 0, 1.6))) - 0.04 * p(t, 1.6, d); yaw = lerp(-0.25, 0.05, eio(p(t, 0, 2.0)))
    R.bg(c)
    c.set_source_surface(warp_perspective(sub, tilt, yaw), 0, 0); c.paint()

def scene_docstack(c, t, d, s):
    R.bg(c)
    docs = s["docs"]; n = len(docs)
    for i, key in enumerate(docs):
        st = .1 + i * d * .17; u = eo(p(t, st, st + .55))
        if u <= 0: continue
        surf = photo(key, "default"); iw, ih = surf.get_width(), surf.get_height()
        fh = H * .66; fw = fh * iw / ih
        x = 250 + i * 245; y = H / 2 - 40 + (1 - u) * 500
        c.save(); c.translate(x, y); c.rotate((-0.08 + i * 0.05) + (1 - u) * .2)
        c.rectangle(-fw / 2 + 10, -fh / 2 + 14, fw, fh); c.set_source_rgba(0, 0, 0, .55); c.fill()
        c.save(); c.translate(-fw / 2, -fh / 2); c.scale(fw / iw, fh / ih)
        c.set_source_surface(surf, 0, 0); c.get_source().set_filter(cairo.FILTER_GOOD); c.paint(); c.restore()
        hk = eo(p(t, st + .5, st + 1.0))
        c.rectangle(-fw / 2 + fw * .08, -fh / 2 + fh * .08, fw * .84 * hk, fh * .07); rgb(c, Y, .38); c.fill()
        c.restore()
    c.rectangle(0, H - 120, W, 120); g = cairo.LinearGradient(0, H - 120, 0, H); g.add_color_stop_rgba(0, 0, 0, 0, 0); g.add_color_stop_rgba(1, 0, 0, 0, .8); c.set_source(g); c.fill()
    callout(c, t, d * .55, 60, H - 52, "CONGRESSIONAL HEARINGS", "1988 – 1992  ·  COSTS, SITE, MANAGEMENT", 40)

def scene_kinetic2(c, t, d, s):
    if s.get("bg"):
        surf = photo(s["bg"], "night", blur=3); draw_kb(c, surf, W, H, (0.5, 0.5, 1.05, 0.5, 0.5, 1.15), t / d)
        c.set_source_rgba(0, 0, 0, .35); c.paint()
    else:
        R.bg(c)
    lines = s["lines"]; n = len(lines)
    poly(c, [(96, 190), (96, 190 + 76 * n)], eo(p(t, 0, .8)), Y, 3)
    for i, ln in enumerate(lines):
        st = .15 + i * (d * .6 / n); u = eo(p(t, st, st + .5))
        y = 250 + i * 76
        c.save(); c.rectangle(110, y - 62, W, 78); c.clip()
        R.rich(c, ln, 128, y + (1 - u) * 70, 58, 1)
        c.restore()

def scene_title2(c, t, d, s):
    if s.get("bg"):
        surf = photo(s["bg"], "night", blur=1); draw_kb(c, surf, W, H, (0.5, 0.5, 1.0, 0.5, 0.5, 1.12), t / d)
        c.set_source_rgba(0, 0, 0, .45); c.paint()
    else:
        rgb(c, (0.03, 0.03, 0.03)); c.paint()
    cx, cy = W / 2, H / 2; u = eo(p(t, .1, 1.4))
    txt(c, "Superconducting", cx, cy - 18, 78, SERIF, WH, u, "c", track=lerp(14, 2, u))
    u2 = eo(p(t, .4, 1.7))
    txt(c, "Super Collider", cx, cy + 66, 78, SERIF, WH, u2, "c", track=lerp(14, 2, u2))
    poly(c, [(cx - 180 * eo(p(t, 1.0, 1.8)), cy + 92), (cx + 180 * eo(p(t, 1.0, 1.8)), cy + 92)], 1, Y, 1.5)
    txt(c, "ELLIS COUNTY, TEXAS  ·  1987–1993", cx, cy + 122, 14, SEMI, Y, eo(p(t, 1.4, 2.0)), "c", 3)

NEW = {"ring3d": scene_ring3d, "map3d": scene_map3d, "docstack": scene_docstack, "kinetic": scene_kinetic2, "title": scene_title2}

# ------------------------------------------------------------------ post: bloom
def bloom(surf, amount=0.55):
    from scipy.ndimage import gaussian_filter
    a = np.ndarray((H, W, 4), np.uint8, buffer=surf.get_data())
    small = a[::6, ::6, :3].astype(np.float32)
    lum = small.max(axis=2, keepdims=True)
    hi = np.clip((lum - 150) / 105, 0, 1) * small
    hi = gaussian_filter(hi, sigma=(4, 4, 0))
    up = np.asarray(Image.fromarray(np.clip(hi, 0, 255).astype(np.uint8)).resize((W, H), Image.BILINEAR)).astype(np.float32)
    base = a[..., :3].astype(np.float32)
    a[..., :3] = np.clip(base + up * amount, 0, 255).astype(np.uint8)
    surf.mark_dirty()

# ------------------------------------------------------------------ frame assembly
def draw_visual(c, vi, t, Tg):
    v = vi["v"]; s = S[vi["shot"]]; d = vi["dur"]
    typ = v.get("type")
    graphic = typ in ("shot", "graphic")
    c.save()
    # punch-in on every cut: 3% scale settling over 0.3 s
    punch = 1 + .03 * (1 - eo(p(t, 0, .3))) if s["scene"] not in ("chapter", "black", "end") else 1
    if graphic and s["scene"] not in ("chapter", "black", "end", "quote", "questions") and v.get("scene") not in ("map3d", "ring3d", "title"):
        u = t / max(d, .01); z = (1 + .04 * u) * punch; dx = (6 if vi["shot"] % 2 else -6) * u
        c.translate(W / 2 + dx, H / 2); c.scale(z, z); c.translate(-W / 2, -H / 2)
    elif punch != 1:
        c.translate(W / 2, H / 2); c.scale(punch, punch); c.translate(-W / 2, -H / 2)
    if typ == "photo": vis_photo(c, t, d, v)
    elif typ == "clip": vis_clip(c, t, d, v, vi["key"])
    else:
        sd = dict(s); sd.update({k: val for k, val in v.items() if k not in ("type", "w", "scene")})
        scene = v.get("scene") or s["scene"]
        fn = NEW.get(scene) or R.SCENES[scene]
        if sd.get("card") and typ == "shot": R.card_wrap(c, t, d, sd, fn)
        else: fn(c, t, d, sd)
    c.restore()
    cap = v.get("cap") if typ in ("photo", "clip") else (v.get("cap") or (s.get("cap") if vi["k"] == 0 else None))
    if cap:
        R.font(c, BOLD, 24)
        txt(c, cap, 44, 672, 24, BOLD, WH, 1, frac=typed(t, .25, cap, 18), track=-.3)
    return graphic

def draw(c, surf, vtl, j, T):
    vi = vtl[j]; t = T - vi["start"]; d = vi["dur"]; s = S[vi["shot"]]
    graphic = draw_visual(c, vi, t, T)
    surf.flush()
    if graphic and s["scene"] not in ("chapter", "quote", "questions", "black", "end"): bloom(surf, .5)
    elif vi["v"].get("type") in ("photo", "clip"): bloom(surf, .18)
    tex = R.textures()
    c.set_source_surface(tex["vig"]); c.paint()
    c.set_source_surface(tex["grain"][int(T * FPS) % 6]); c.paint()
    if vi["v"].get("type") == "clip" and SOURCES[vi["v"]["src"]].get("archive"):
        c.set_source_surface(tex["grain"][(int(T * FPS) + 3) % 6]); c.paint()
    # flashes and fades
    fade = 0; flash = 0
    if s["scene"] == "chapter": fade = max(1 - p(t, 0, .45), p(t, d - .5, d))
    if j == 0: fade = max(fade, 1 - p(t, 0, .6))
    nxt = S[vtl[j + 1]["shot"]]["scene"] if j + 1 < len(vtl) else None
    if nxt == "chapter": fade = max(fade, p(t, d - .35, d))
    if j > 0 and S[vtl[j - 1]["shot"]]["scene"] == "chapter": fade = max(fade, 1 - p(t, 0, .35))
    if vi["k"] == 0 and s["scene"] == "title": flash = 1 - p(t, 0, .25)
    if vi["v"].get("src") == "cern_collision": flash = max(flash, .7 * (1 - p(t, 0, .2)))
    if flash > 0: c.set_source_rgba(1, 1, .96, flash * .85); c.paint()
    if fade > 0: c.set_source_rgba(0, 0, 0, cl(fade)); c.paint()
    surf.flush()

def render_chunk(args):
    timing, foot, geo, f0, f1, out = args
    global FOOT; FOOT = foot; R.load_geo(geo)
    vtl = timeline(timing); lead = timing["shots"][0]["start"]
    surf = cairo.ImageSurface(cairo.FORMAT_RGB24, W, H); c = cairo.Context(surf)
    ff = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "bgr0", "-s", f"{W}x{H}", "-r", str(FPS),
                           "-i", "-", "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p", out], stdin=subprocess.PIPE)
    j = 0
    for fi in range(f0, f1):
        T = fi / FPS
        if T < lead:
            rgb(c, (0, 0, 0)); c.paint()
        else:
            while j + 1 < len(vtl) and vtl[j + 1]["start"] <= T: j += 1
            draw(c, surf, vtl, j, T)
        surf.flush(); ff.stdin.write(bytes(surf.get_data()))
    ff.stdin.close(); ff.wait()
    for k in list(CLIPS): CLIPS.pop(k).close()
    return out

def main():
    global FOOT
    mode = sys.argv[1]; timing = json.load(open(sys.argv[2])); FOOT = sys.argv[3]
    if mode == "prep":
        prep(timing, FOOT, sys.argv[4]); return
    geo = sys.argv[4]; out = sys.argv[5]
    if mode == "list":
        for n, vi in enumerate(timeline(timing)): print(n, vi["key"], f"{vi['start']:.1f}", f"{vi['dur']:.1f}", vi["v"].get("type"), vi["v"].get("src") or vi["v"].get("scene") or S[vi["shot"]]["scene"])
        return
    if mode == "still":
        R.load_geo(geo); vtl = timeline(timing)
        surf = cairo.ImageSurface(cairo.FORMAT_RGB24, W, H); c = cairo.Context(surf)
        for item in sys.argv[6].split(";"):
            j, tt = item.split(","); j = int(j); tt = float(tt)
            T = vtl[j]["start"] + (vtl[j]["dur"] * tt if tt <= 1 else tt)
            draw(c, surf, vtl, j, T); surf.write_to_png(f"{out}_{j:03d}.png")
        return
    total = int(math.ceil(timing["total"] * FPS)); n = os.cpu_count() or 4
    bounds = [round(total * k / n) for k in range(n + 1)]
    tmp = out + ".parts"; os.makedirs(tmp, exist_ok=True)
    jobs = [(timing, FOOT, geo, bounds[k], bounds[k + 1], os.path.join(tmp, f"p{k:02d}.mp4")) for k in range(n)]
    with Pool(n) as pool: parts = pool.map(render_chunk, jobs)
    lst = os.path.join(tmp, "list.txt"); open(lst, "w").write("".join(f"file '{os.path.abspath(q)}'\n" for q in parts))
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", lst, "-c", "copy", out], check=True)
    print("wrote", out, total, "frames")

if __name__ == "__main__":
    main()
