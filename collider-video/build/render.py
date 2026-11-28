"""Render the picture track with cairo, in parallel chunks, to an h264 file with no audio.

usage: python render.py TIMING_JSON GEO_DIR OUT.mp4 [--still SHOT_INDEX[,T]] [--from i --to j]
"""
import cairo, json, math, os, random, subprocess, sys
from multiprocessing import Pool
import numpy as np

sys.path.insert(0, os.path.dirname(__file__))
from shots import S

W, H, FPS = 1280, 720, 30
BG = (0.071, 0.071, 0.071)
Y = (0.973, 0.706, 0.0)
WH = (0.93, 0.93, 0.91)
GR = (0.42, 0.42, 0.42)
DIM = (0.22, 0.22, 0.22)
PAPER = (0.91, 0.895, 0.85)
INK = (0.07, 0.07, 0.07)
BOLD, SEMI, SERIF = "Inter Display ExtraBold", "Inter SemiBold", "Liberation Serif"

# ------------------------------------------------------------------ helpers
def cl(x, a=0.0, b=1.0): return max(a, min(b, x))
def p(t, a, b): return cl((t - a) / (b - a)) if b > a else float(t >= a)
def eo(x): x = cl(x); return 1 - (1 - x) ** 3
def eio(x): x = cl(x); return 4 * x ** 3 if x < .5 else 1 - (-2 * x + 2) ** 3 / 2
def lerp(a, b, u): return a + (b - a) * u
def rgb(c, col, a=1.0): c.set_source_rgba(col[0], col[1], col[2], a)

def font(c, f, size, italic=False):
    c.select_font_face(f, cairo.FONT_SLANT_ITALIC if italic else cairo.FONT_SLANT_NORMAL, cairo.FONT_WEIGHT_NORMAL)
    c.set_font_size(size)

def tw(c, s, track=0):
    return c.text_extents(s)[4] + track * max(len(s) - 1, 0)

def txt(c, s, x, y, size, f=BOLD, col=WH, a=1.0, align="l", track=0, frac=1.0, italic=False, cursor=False):
    if a <= 0: return 0
    font(c, f, size, italic)
    full = tw(c, s, track)
    n = int(round(len(s) * cl(frac)))
    sub = s[:n]
    x0 = x - full / 2 if align == "c" else x - full if align == "r" else x
    rgb(c, col, a)
    if track:
        xx = x0
        for ch in sub:
            c.move_to(xx, y); c.show_text(ch); xx += c.text_extents(ch)[4] + track
        end = xx
    else:
        c.move_to(x0, y); c.show_text(sub); end = x0 + c.text_extents(sub)[4]
    if cursor and frac < 1.02:
        c.rectangle(end + 3, y - size * 0.8, max(1.5, size * 0.05), size * 0.95); c.fill()
    return full

def typed(t, start, s, cps=22):
    return p(t, start, start + max(len(s), 1) / cps)

def poly(c, pts, frac=1.0, col=Y, w=2.0, a=1.0, dash=None):
    if frac <= 0 or a <= 0: return
    segs = [math.dist(pts[i], pts[i + 1]) for i in range(len(pts) - 1)]
    L = sum(segs) * cl(frac); c.move_to(*pts[0])
    for i, sl in enumerate(segs):
        if L <= 0: break
        if sl <= L: c.line_to(*pts[i + 1]); L -= sl
        else:
            u = L / sl; c.line_to(lerp(pts[i][0], pts[i + 1][0], u), lerp(pts[i][1], pts[i + 1][1], u)); L = 0
    rgb(c, col, a); c.set_line_width(w)
    if dash: c.set_dash(dash)
    c.stroke(); c.set_dash([])

def arc(c, x, y, r, a0, a1, col=Y, w=2.0, a=1.0, dash=None):
    if a <= 0 or a1 <= a0: return
    c.new_sub_path(); c.arc(x, y, r, a0, a1); rgb(c, col, a); c.set_line_width(w)
    if dash: c.set_dash(dash)
    c.stroke(); c.set_dash([])

def dot(c, x, y, r, col=Y, a=1.0):
    c.new_sub_path(); c.arc(x, y, r, 0, 2 * math.pi); rgb(c, col, a); c.fill()

def callout(c, t, start, x, y, big, small, size=46, align="l", col=Y):
    """Big yellow label with small caps line under it, typed on (the reference's '12 KM DEPTH')."""
    txt(c, big, x, y, size, BOLD, col, frac=typed(t, start, big, 26), align=align, track=-1)
    if small: txt(c, small, x, y + size * 0.62, 14, SEMI, WH, 0.92, align=align, track=1.5, frac=typed(t, start + .25, small, 40))

def leader(c, t, start, pts, dur=0.5, col=Y):
    poly(c, pts, eo(p(t, start, start + dur)), col, 1.6)

# ------------------------------------------------------------------ textures (built once per process)
TEX = {}
def textures():
    if TEX: return TEX
    rnd = np.random.default_rng(7)
    # diamond cross-hatch tile
    tile = cairo.ImageSurface(cairo.FORMAT_ARGB32, 28, 28); tc = cairo.Context(tile)
    tc.set_source_rgba(1, 1, 1, 0.028); tc.set_line_width(1)
    tc.move_to(0, 0); tc.line_to(28, 28); tc.move_to(28, 0); tc.line_to(0, 28); tc.stroke()
    pat = cairo.SurfacePattern(tile); pat.set_extend(cairo.EXTEND_REPEAT); TEX["hatch"] = pat
    # vignette
    v = cairo.ImageSurface(cairo.FORMAT_ARGB32, W, H); vc = cairo.Context(v)
    g = cairo.RadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, W * 0.75)
    g.add_color_stop_rgba(0, 0, 0, 0, 0); g.add_color_stop_rgba(1, 0, 0, 0, 0.62)
    vc.set_source(g); vc.paint(); TEX["vig"] = v
    # film grain frames
    TEX["grain"] = []
    for _ in range(6):
        n = rnd.integers(0, 256, (H, W), dtype=np.uint8)
        a = (rnd.random((H, W)) * 22).astype(np.uint8)
        arr = np.zeros((H, W, 4), np.uint8)
        pre = (n.astype(np.uint16) * a // 255).astype(np.uint8)
        arr[..., 0] = arr[..., 1] = arr[..., 2] = pre; arr[..., 3] = a
        s = cairo.ImageSurface.create_for_data(bytearray(arr.tobytes()), cairo.FORMAT_ARGB32, W, H, W * 4)
        TEX["grain"].append(s)
    # grunge for chapter cards
    lo = rnd.random((18, 32))
    big = np.kron(lo, np.ones((40, 40)))[:H, :W]
    k = np.ones(41) / 41
    big = np.apply_along_axis(lambda r: np.convolve(r, k, "same"), 1, big)
    big = np.apply_along_axis(lambda r: np.convolve(r, k, "same"), 0, big)
    fine = rnd.random((H, W))
    val = (14 + big * 26 + fine * 8).astype(np.uint8)
    arr = np.zeros((H, W, 4), np.uint8); arr[..., 0] = arr[..., 1] = arr[..., 2] = val; arr[..., 3] = 255
    TEX["grunge"] = cairo.ImageSurface.create_for_data(bytearray(arr.tobytes()), cairo.FORMAT_ARGB32, W, H, W * 4)
    return TEX

def bg(c, hatch=True, col=BG):
    rgb(c, col); c.paint()
    if hatch: c.set_source(textures()["hatch"]); c.paint()

def strata(c, a=0.5, y0=120, n=9, seed=3):
    r = random.Random(seed)
    for i in range(n):
        y = y0 + i * 70; pts = []
        ph = r.random() * 6
        for x in range(-40, W + 80, 80): pts.append((x, y + 14 * math.sin(x / 260 + ph) + r.uniform(-4, 4)))
        poly(c, pts, 1, GR, 1, a * 0.45)

# ------------------------------------------------------------------ maps
GEO = {}
VIEWS = {"na": (-127, -65, 23, 51), "ntx": (-97.45, -96.3, 32.12, 32.9), "europe": (-10, 25, 36, 58),
         "world": (-170, 180, -56, 78), "asia": (95, 160, 15, 55), "eurasia": (10, 180, 30, 80)}
USSR = ["Russia", "Ukraine", "Belarus", "Kazakhstan", "Uzbekistan", "Turkmenistan", "Kyrgyzstan", "Tajikistan",
        "Georgia", "Armenia", "Azerbaijan", "Moldova", "Lithuania", "Latvia", "Estonia"]
CARD = (60, 150, 640, 430)        # x, y, w, h of the paper card
FRAME = (72, 196, 616, 372)       # map frame inside it

def load_geo(d):
    if GEO: return GEO
    def rings(f):
        g = f["geometry"]; out = []
        polys = g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]]
        for pl in polys: out.append(np.array(pl[0]))
        return out
    cs = json.load(open(os.path.join(d, "ne_50m_admin_0_countries.geojson")))
    GEO["countries"] = {f["properties"]["NAME"]: rings(f) for f in cs["features"]}
    st = json.load(open(os.path.join(d, "ne_50m_admin_1_states_provinces.geojson")))
    GEO["states"] = {f["properties"]["name"]: rings(f) for f in st["features"] if f["properties"].get("admin") == "United States of America"}
    return GEO

def projector(view):
    lon0, lon1, lat0, lat1 = VIEWS[view]
    k = math.cos(math.radians((lat0 + lat1) / 2))
    fx, fy, fw, fh = FRAME
    sc = min(fw / ((lon1 - lon0) * k), fh / (lat1 - lat0))
    cx, cy = fx + fw / 2, fy + fh / 2; mlon, mlat = (lon0 + lon1) / 2, (lat0 + lat1) / 2
    def pr(lon, lat): return cx + (lon - mlon) * k * sc, cy - (lat - mlat) * sc
    pr.sc, pr.k = sc, k
    return pr

def ring_pts(pr, ring): return [pr(lo, la) for lo, la in ring]

def path(c, pts):
    c.move_to(*pts[0])
    for q in pts[1:]: c.line_to(*q)
    c.close_path()

MAPCACHE = {}
def map_surface(view, title):
    key = (view, title)
    if key in MAPCACHE: return MAPCACHE[key]
    s = cairo.ImageSurface(cairo.FORMAT_ARGB32, W, H); c = cairo.Context(s)
    x, y, w, h = CARD
    c.rectangle(x + 6, y + 8, w, h); c.set_source_rgba(0, 0, 0, .55); c.fill()
    c.rectangle(x, y, w, h); rgb(c, PAPER); c.fill()
    txt(c, title, x + w / 2, y + 32, 15, SERIF, INK, 0.9, "c", track=2.2)
    fx, fy, fw, fh = FRAME
    c.save(); c.rectangle(fx, fy, fw, fh); c.clip()
    pr = projector(view)
    if view == "ntx":
        rgb(c, PAPER); c.paint()
        r = random.Random(11)
        for i in range(34):
            yy = fy + r.uniform(0, fh); ph = r.uniform(0, 7); amp = r.uniform(6, 22)
            pts = [(xx, yy + amp * math.sin(xx / r.uniform(60, 140) + ph)) for xx in range(fx - 10, fx + fw + 20, 12)]
            poly(c, pts, 1, INK, 0.7, 0.12)
        # Interstate 35E, roughly Dallas to Waxahachie and on south
        poly(c, [pr(-96.80, 33.05), pr(-96.82, 32.78), pr(-96.86, 32.55), pr(-96.85, 32.39), pr(-96.95, 32.15), pr(-97.0, 31.95)], 1, INK, 1.6, .35)
        poly(c, [pr(-97.75, 32.75), pr(-96.15, 32.77)], 1, INK, 1.6, .35)
    else:
        rgb(c, INK); c.paint()
        for name, rings in load_geo(None).get("countries").items():
            for rg in rings:
                path(c, ring_pts(pr, rg)); rgb(c, PAPER); c.fill()
        if view == "na":
            for name, rings in GEO["states"].items():
                for rg in rings: path(c, ring_pts(pr, rg)); rgb(c, INK, .25); c.set_line_width(.6); c.stroke()
    lon0, lon1, lat0, lat1 = VIEWS[view]
    step = 1 if view == "ntx" else 10 if view != "world" else 30
    for lo in np.arange(math.ceil(lon0 / step) * step, lon1, step):
        poly(c, [pr(lo, lat0 - 5), pr(lo, lat1 + 5)], 1, (0.5, 0.5, 0.5), .6, .5)
    for la in np.arange(math.ceil(lat0 / step) * step, lat1, step):
        poly(c, [pr(lon0 - 5, la), pr(lon1 + 5, la)], 1, (0.5, 0.5, 0.5), .6, .5)
    c.restore()
    c.rectangle(fx, fy, fw, fh); rgb(c, INK, .8); c.set_line_width(1.2); c.stroke()
    MAPCACHE[key] = (s, pr)
    return MAPCACHE[key]

def scene_map(c, t, d, s):
    bg(c)
    poly(c, [(40, 128), (W - 40, 128)], 1, GR, .7, .35); poly(c, [(40, 600), (W - 40, 600)], 1, GR, .7, .35)
    poly(c, [(730, 150), (730, 580)], eo(p(t, .2, .9)), GR, .7, .4)
    surf, pr = map_surface(s["view"], s["title"])
    u = eo(p(t, 0, .45))
    c.save(); c.translate(0, (1 - u) * 18); c.set_source_surface(surf, 0, 0); c.paint_with_alpha(u)
    fx, fy, fw, fh = FRAME; c.rectangle(fx, fy, fw, fh); c.clip()
    hl = s.get("hl")
    names = USSR if hl == "USSR" else (hl or [])
    if names:
        cs = GEO["countries"] if s["view"] != "na" else GEO["states"]
        allpts = []
        for nm in names:
            for rg in cs.get(nm, []):
                pts = ring_pts(pr, rg)
                if len(pts) < 4: continue
                allpts.append((nm, pts))
        if s.get("split"):
            ux = np.mean([q[0] for _, pts in allpts for q in pts]); uy = np.mean([q[1] for _, pts in allpts for q in pts])
        fa = 1.0 - (0.85 * eio(p(t, .9, d - .3)) if s.get("fade") else 0)
        for nm, pts in allpts:
            c.save()
            if s.get("split"):
                mx = np.mean([q[0] for q in pts]); my = np.mean([q[1] for q in pts])
                k = eio(p(t, 1.0, d - .2)) * 0.22
                c.translate((mx - ux) * k, (my - uy) * k)
            path(c, pts); rgb(c, Y, .38 * eo(p(t, .6, 1.4)) * fa); c.fill_preserve()
            L = sum(math.dist(pts[i], pts[i + 1]) for i in range(len(pts) - 1)) + 1
            f = 1 if s.get("still") else eo(p(t, .45, 1.6))
            c.set_dash([L * f, L + 1]); rgb(c, Y, fa); c.set_line_width(1.8); c.stroke(); c.set_dash([])
            c.restore()
    if s.get("pin"):
        lo, la, lab = s["pin"]; x, y = pr(lo, la); k = eo(p(t, .5, .9))
        for j in range(2):
            ph = ((t * .8 + j * .5) % 1)
            arc(c, x, y, 6 + ph * 26, 0, 2 * math.pi, Y, 1.5, (1 - ph) * k)
        dot(c, x, y, 5 * k, Y)
        txt(c, lab, x + 12, y - 9, 13, BOLD, INK, k, track=1)
    if s["view"] == "ntx":
        for lo, la, lab in [(-96.80, 32.78, "DALLAS"), (-97.33, 32.75, "FORT WORTH"), (-96.85, 32.39, "WAXAHACHIE")]:
            x, y = pr(lo, la); k = eo(p(t, .3, .7))
            dot(c, x, y, 3.5 * k, INK); txt(c, lab, x + 8, y - 6, 11, BOLD, INK, k * .85, track=1)
        if s.get("ring"):
            cx, cy = pr(-96.87, 32.40); R = 0.1247 * pr.sc
            f = eo(p(t, .6, 2.2))
            arc(c, cx, cy, R, -math.pi / 2, -math.pi / 2 + 2 * math.pi * f, Y, 4)
        else:
            x, y = pr(-96.95, 32.38)
            c.save(); c.translate(x, y); c.scale(1.25, 0.9)
            arc(c, 0, 0, 48, 0, 2 * math.pi * eo(p(t, .6, 1.6)), Y, 2.4, dash=[6, 4]); c.restore()
    c.restore()
    callout(c, t, .55, 770, 382, s["big"], None, 58)
    txt(c, s["sub"], 772, 318, 13, SEMI, WH, .85, track=2, frac=typed(t, .45, s["sub"], 40))

# ------------------------------------------------------------------ field (illustrated prairie)
def buildings(seed=5, wide=False):
    r = random.Random(seed); out = []; x = 330 if not wide else 470
    for i in range(7):
        w = r.uniform(50, 130) * (0.6 if wide else 1); h = r.uniform(26, 70) * (0.6 if wide else 1)
        out.append((x, w, h)); x += w + r.uniform(4, 30) * (0.6 if wide else 1)
    return out

def scene_field(c, t, d, s):
    mode = s.get("mode", "surface"); wide = s.get("wide", False)
    night = mode == "night"
    hz = 400
    lift = 0
    if mode in ("cutaway", "water"):
        lift = 230 * (eio(p(t, .3, 1.6)) if mode == "cutaway" else 1)
    c.save(); c.translate(0, -lift)
    g = cairo.LinearGradient(0, -lift, 0, hz)
    top, bot = ((0.03, 0.035, 0.045), (0.08, 0.085, 0.09)) if night else ((0.13, 0.14, 0.155), (0.33, 0.33, 0.32))
    g.add_color_stop_rgb(0, *top); g.add_color_stop_rgb(1, *bot); c.rectangle(0, -lift - 10, W, hz + lift + 10); c.set_source(g); c.fill()
    r = random.Random(2)
    for i in range(7):  # cloud bands
        y = r.uniform(40, 300); x = (r.uniform(-200, W) + t * r.uniform(4, 10)) % (W + 400) - 200
        c.save(); c.translate(x, y); c.scale(1, 0.18); dot(c, 0, 0, r.uniform(120, 260), WH, 0.035 if not night else .015); c.restore()
    if night:
        g2 = cairo.RadialGradient(980, 120, 0, 980, 120, 140); g2.add_color_stop_rgba(0, .8, .8, .75, .18); g2.add_color_stop_rgba(1, .8, .8, .75, 0)
        c.set_source(g2); c.paint()
    # ground
    c.rectangle(0, hz, W, 900); rgb(c, (0.11, 0.115, 0.095) if not night else (0.04, 0.042, 0.038)); c.fill()
    for (x, w, h) in buildings(5, wide):
        k = 1.0
        if mode == "build":
            i = (x - 330) / 700; k = eo(p(t, .3 + i * 1.6, .9 + i * 1.6))
        hh = h * k
        if hh < 1: continue
        col = (0.2, 0.2, 0.2) if not night else (0.07, 0.07, 0.075)
        c.rectangle(x, hz - hh, w, hh); rgb(c, col); c.fill()
        c.rectangle(x, hz - hh, w, 3); rgb(c, (0.28, 0.28, 0.27) if not night else (.1, .1, .1)); c.fill()
        for wx in range(int(x + 8), int(x + w - 10), 16):
            for wy in range(int(hz - hh + 12), int(hz - 8), 14):
                c.rectangle(wx, wy, 7, 5); rgb(c, (0.13, 0.13, 0.13) if not night else (0.05, 0.05, 0.05)); c.fill()
    r = random.Random(9)
    for i in range(900):  # grass
        x = r.uniform(0, W); y = hz + r.random() ** 1.6 * 330; hgt = 3 + (y - hz) * 0.07
        sway = math.sin(t * 1.3 + x * 0.02) * hgt * 0.15
        c.move_to(x, y); c.line_to(x + sway + r.uniform(-1, 1), y - hgt)
        v = r.uniform(.16, .3) if not night else r.uniform(.05, .09)
        rgb(c, (v, v * 1.02, v * .82)); c.set_line_width(1); c.stroke()
    if mode in ("cutaway", "water"):
        top = hz + 30
        k = eio(p(t, .1, .9)) if mode == "cutaway" else 1
        c.rectangle(0, top, W, 800); rgb(c, (0.09, 0.088, 0.08), k); c.fill()
        c.save(); c.rectangle(0, top, W, 800); c.clip(); c.set_source(textures()["hatch"]); c.paint_with_alpha(k); c.restore()
        r2 = random.Random(4)
        for i in range(7):
            y = top + 40 + i * 62; ph = r2.random() * 5
            poly(c, [(x, y + 8 * math.sin(x / 200 + ph)) for x in range(-20, W + 40, 40)], 1, GR, 1, .35 * k)
        poly(c, [(0, top), (W, top)], 1, Y, 1.5, k)
        tx, ty, tr = W / 2, top + 250, 58
        if mode == "water" or t > .9:
            kk = 1 if mode == "water" else eo(p(t, .9, 1.5))
            dot(c, tx, ty, tr + 12, (0.3, 0.3, 0.29), kk)
            dot(c, tx, ty, tr, (0.025, 0.025, 0.025), kk)
            if mode == "water":
                lvl = ty + tr - (12 + 30 * eio(p(t, .4, d)))
                c.save(); c.new_sub_path(); c.arc(tx, ty, tr, 0, 2 * math.pi); c.clip()
                c.rectangle(tx - tr, lvl, 2 * tr, 200); rgb(c, (0.08, 0.16, 0.18)); c.fill()
                poly(c, [(tx - tr + j * 6, lvl + 1.5 * math.sin(t * 3 + j)) for j in range(21)], 1, Y, 1.4, .9)
                c.restore()
                for j in range(3):
                    ph = (t * .7 + j * .33) % 1
                    dot(c, tx - 20 + j * 20, ty - tr + 6 + ph * (lvl - (ty - tr) - 6), 1.8, (0.5, 0.7, 0.75), 1 - ph)
            arc(c, tx, ty, tr + 12, 0, 2 * math.pi * eo(p(t, 1.0 if mode == "cutaway" else 0, 1.8 if mode == "cutaway" else .8)), Y, 2)
            lx = tx + tr + 22
            leader(c, t, 1.4 if mode == "cutaway" else .5, [(lx, ty), (lx + 60, ty - 40), (lx + 140, ty - 40)])
            lab = s.get("label") if mode == "cutaway" else "FLOODED"
            sub = "SSC TUNNEL  ·  BORED 1991–93" if mode == "cutaway" else "SEALED  ·  ABANDONED"
            st = 1.7 if mode == "cutaway" else .8
            txt(c, lab, lx + 150, ty - 34, 30, BOLD, Y, frac=typed(t, st, lab, 26), track=-.5)
            txt(c, sub, lx + 150, ty - 12, 12, SEMI, WH, .9, frac=typed(t, st + .3, sub, 40), track=1.5)
    c.restore()

def scene_tunnel(c, t, d, s):
    bg(c); strata(c, .9, 90)
    y = 400; x0, x1 = 80, W - 80
    f = eio(p(t, .1, d * .8)); xe = lerp(x0, x1, f)
    c.rectangle(x0, y - 22, xe - x0, 44); rgb(c, (0.03, 0.03, 0.03)); c.fill()
    poly(c, [(x0, y - 22), (xe, y - 22)], 1, GR, 1.4); poly(c, [(x0, y + 22), (xe, y + 22)], 1, GR, 1.4)
    poly(c, [(x0, y), (xe, y)], 1, Y, 2.5)
    dot(c, xe, y, 5, Y)
    poly(c, [(x0, y + 60), (xe, y + 60)], 1, WH, 1, .5)
    for xx in (x0, xe): poly(c, [(xx, y + 52), (xx, y + 68)], 1, WH, 1, .5)
    txt(c, s["big"], W / 2 + 120, y - 60, 64, BOLD, WH, frac=typed(t, .5, s["big"], 18), track=-1)
    txt(c, "OF TUNNEL UNDER ELLIS COUNTY", W / 2 + 124, y - 34, 13, SEMI, Y, .95, frac=typed(t, .9, "OF TUNNEL UNDER ELLIS COUNTY", 40), track=1.5)

# ------------------------------------------------------------------ ring schematics
RC = (W / 2, H / 2 + 10); RR = 230

def ring_base(c, t, a=1.0, f=1.0, col=Y, w=3.0):
    cx, cy = RC
    arc(c, cx, cy, RR + 14, 0, 2 * math.pi, DIM, 1, a)
    arc(c, cx, cy, RR - 14, 0, 2 * math.pi, DIM, 1, a)
    arc(c, cx, cy, RR, -math.pi / 2, -math.pi / 2 + 2 * math.pi * f, col, w, a)
    for i in range(72):
        an = i / 72 * 2 * math.pi
        if (an / (2 * math.pi)) > f: continue
        r0, r1 = RR + 16, RR + (24 if i % 6 == 0 else 20)
        poly(c, [(cx + r0 * math.cos(an - math.pi / 2), cy + r0 * math.sin(an - math.pi / 2)),
                 (cx + r1 * math.cos(an - math.pi / 2), cy + r1 * math.sin(an - math.pi / 2))], 1, GR, 1, a * .7)

def scene_ring(c, t, d, s):
    bg(c); cx, cy = RC; mode = s["mode"]
    if mode == "design":
        f = eio(p(t, .1, 1.8)); ring_base(c, t, f=f)
        for an in (0, math.pi):
            k = eo(p(t, 1.6, 2.0)); x = cx + RR * math.cos(an); y = cy + RR * math.sin(an)
            c.rectangle(x - 9 * k, y - 14 * k, 18 * k, 28 * k); rgb(c, WH, k); c.fill()
        if s.get("labels"):
            callout(c, t, .8, cx + RR + 70, cy - 10, "54 MILES", "87 KM AROUND  ·  27.7 KM ACROSS", 52)
            leader(c, t, .6, [(cx, cy), (cx + RR - 4, cy)], .6, WH)
            txt(c, "27.7 KM", cx + RR / 2, cy - 10, 13, SEMI, WH, eo(p(t, 1.2, 1.5)), "c", 1.5)
        else:
            callout(c, t, 1.0, cx + RR + 70, cy - 10, "SSC", "SUPERCONDUCTING SUPER COLLIDER", 52)
    elif mode in ("beams", "ghost"):
        a = .35 if mode == "ghost" else 1
        ring_base(c, t, a=a, col=Y if mode != "ghost" else GR, w=2)
        om = 1.6 if mode == "beams" else .5
        for sgn, col in ((1, WH), (-1, Y)):
            th = sgn * om * t
            for j in range(26):
                tt = th - sgn * j * 0.03
                dot(c, cx + RR * math.cos(tt), cy + RR * math.sin(tt), 4 - j * .12, col, (1 - j / 26) * a)
        if mode == "beams":
            callout(c, t, .6, 70, 120, "PROTONS", "TWO BEAMS  ·  NEARLY THE SPEED OF LIGHT", 40)
        else:
            txt(c, "40 TeV", cx, cy + 12, 44, BOLD, GR, .5 * eo(p(t, .5, 1.5)), "c")
            txt(c, "?", cx, cy + 70, 36, SERIF, Y, .8 * eo(p(t, 1.5, 2.3)), "c")
    elif mode == "collide":
        tc = d * .42; u = eio(p(t, 0, tc))
        xl, xr = lerp(-40, cx, u), lerp(W + 40, cx, u)
        for j in range(30):
            dot(c, xl - j * 9, cy, 4 - j * .12, WH, 1 - j / 30)
            dot(c, xr + j * 9, cy, 4 - j * .12, Y, 1 - j / 30)
        poly(c, [(0, cy), (W, cy)], 1, DIM, 1)
        if t > tc:
            k = p(t, tc, tc + 1.4)
            g = cairo.RadialGradient(cx, cy, 0, cx, cy, 160 * eo(k) + 10)
            g.add_color_stop_rgba(0, 1, 1, .9, 1 - k); g.add_color_stop_rgba(.3, *Y, (1 - k) * .8); g.add_color_stop_rgba(1, *Y, 0)
            c.set_source(g); c.paint()
            r = random.Random(1)
            for i in range(46):
                an = r.uniform(0, 2 * math.pi); ln = r.uniform(120, 420) * eo(p(t, tc, tc + 1.6)); bend = r.uniform(-.6, .6)
                pts = [(cx + (ln * q) * math.cos(an + bend * q * q), cy + (ln * q) * math.sin(an + bend * q * q)) for q in np.linspace(0, 1, 12)]
                poly(c, pts, 1, Y if i % 3 else WH, 1.2, .8)
        if s.get("labels"):
            txt(c, "20 TeV  →", 120, cy - 30, 34, BOLD, WH, eo(p(t, .2, .6)))
            txt(c, "←  20 TeV", W - 120, cy - 30, 34, BOLD, Y, eo(p(t, .2, .6)), "r")
            if t > tc: callout(c, t, tc + .3, cx, cy + 210, "40 TeV", "HEAD-ON COLLISION ENERGY", 64, "c")
        else:
            callout(c, t, .4, 70, 120, "COLLISION", "HARDER THAN ANY MACHINE BEFORE IT", 40)
    elif mode == "grow":
        for i, (r, lab, lab2, an) in enumerate([(60, "SMALL RING", "LOW ENERGY", .5), (140, "BIGGER RING", "HIGHER ENERGY", -.05), (230, "SSC", "40 TeV", -.55)]):
            st = .3 + i * (d * .27)
            col = Y if i == 2 else WH
            arc(c, cx, cy, r, -math.pi / 2, -math.pi / 2 + 2 * math.pi * eio(p(t, st, st + 1)), col, 2.5 if i == 2 else 1.6, 1 if i == 2 else .7)
            ly = cy + 150 - i * 150; px, py = cx + r * math.cos(an), cy + r * math.sin(an)
            leader(c, t, st + .5, [(px, py), (cx + 300, ly), (cx + 330, ly)], .4, col)
            callout(c, t, st + .7, cx + 342, ly + 8, lab, lab2, 26 if i < 2 else 40, col=col)
    elif mode == "progress":
        f = 14.6 / 54
        arc(c, cx, cy, RR, -math.pi / 2, 3 * math.pi / 2, GR, 1.5, .8, dash=[6, 6])
        arc(c, cx, cy, RR, -math.pi / 2, -math.pi / 2 + 2 * math.pi * f * eio(p(t, .1, 1.6)), Y, 7)
        if s.get("rest"):
            k = eio(p(t, .3, d * .7))
            arc(c, cx, cy, RR, -math.pi / 2 + 2 * math.pi * f, -math.pi / 2 + 2 * math.pi * (f + (1 - f) * k), WH, 2.5, .9, dash=[10, 7])
            callout(c, t, .5, cx - 160, cy + 10, "54 MI", "PLANNED  ·  NEVER FINISHED", 48)
        else:
            txt(c, s["year"], 920, 300, 20, SEMI, WH, eo(p(t, .4, .7)))
            callout(c, t, .5, 920, 352, s["value"], None, 64)
            poly(c, [(920, 372), (1210, 372)], eo(p(t, .6, 1.1)), Y, 1.4)
            txt(c, s["caption"], 920, 392, 12, SEMI, WH, .9, frac=typed(t, .9, s["caption"], 40), track=1.5)
            an = -math.pi / 2 + 2 * math.pi * f
            leader(c, t, 1.2, [(cx + RR * math.cos(an) + 8, cy + RR * math.sin(an)), (900, 372)], .5)
    elif mode == "erase":
        f = 1 - eio(p(t, d * .35, d * .9))
        ring_base(c, t, f=f)
        txt(c, "1987 — 1993", cx, cy + 12, 40, BOLD, WH, .9 * (0.3 + .7 * f), "c", -1)
    elif mode == "compare":
        lr = RR * 27 / 87; lx = cx - 330
        arc(c, cx + 80, cy, RR, -math.pi / 2, 3 * math.pi / 2, Y, 2.5, .9, dash=[10, 7])
        arc(c, lx, cy, lr, -math.pi / 2, -math.pi / 2 + 2 * math.pi * eio(p(t, .3, 1.3)), WH, 4)
        callout(c, t, .6, lx, cy + lr + 46, "LHC  ·  27 KM", "GENEVA  ·  FOUND THE HIGGS", 30, "c", WH)
        callout(c, t, 1.2, cx + 80, cy + 8, "SSC  ·  87 KM", "TEXAS  ·  CANCELLED", 36, "c")

# ------------------------------------------------------------------ particles
GRID = [["u", "c", "t", "g"], ["d", "s", "b", "γ"], ["e", "μ", "τ", "Z"], ["νe", "νμ", "ντ", "W"]]
def tile(c, x, y, sym, a, col=WH, fill=None, dash=False, sz=70):
    if a <= 0: return
    c.rectangle(x, y, sz, sz)
    if fill: rgb(c, fill, a); c.fill_preserve()
    rgb(c, col, a); c.set_line_width(1.6)
    if dash: c.set_dash([6, 5])
    c.stroke(); c.set_dash([])
    main, subs = (sym[0], sym[1:]) if sym.startswith("ν") else (sym, "")
    txt(c, main, x + sz / 2 - (5 if subs else 0), y + sz / 2 + 13, 34, BOLD, col if not fill else INK, a, "c")
    if subs: txt(c, subs, x + sz / 2 + 13, y + sz / 2 + 20, 16, BOLD, col, a, "c")

def scene_particles(c, t, d, s):
    bg(c); mode = s["mode"]; x0, y0, sz, gap = 300, 170, 70, 16
    n = 16
    for r in range(4):
        for k in range(4):
            i = r * 4 + k
            if mode == "build": a = eo(p(t, .2 + i * (d * .55 / n), .5 + i * (d * .55 / n)))
            elif mode == "question": a = eo(p(t, i * .04, .3 + i * .04))
            else: a = 1
            col = GR if mode == "dim" else WH
            tile(c, x0 + k * (sz + gap), y0 + r * (sz + gap), GRID[r][k], a * (0.5 if mode in ("dim", "found") else .9), col)
    hx, hy = x0 + 4 * (sz + gap) + 60, y0 + 1.5 * (sz + gap)
    if mode == "build":
        a = eo(p(t, d * .7, d * .7 + .4)); pulse = .5 + .5 * math.sin(t * 5)
        tile(c, hx, hy, "?", a * (.5 + .5 * pulse), Y, dash=True)
        callout(c, t, d * .72, hx, hy + sz + 40, "MISSING", "ONE PIECE THE THEORY NEEDS", 30)
    elif mode == "question":
        pulse = .5 + .5 * math.sin(t * 5); tile(c, hx, hy, "?", .5 + .5 * pulse, Y, dash=True)
        callout(c, t, .8, hx, hy + sz + 40, "WHAT IS", "THE UNIVERSE MADE OF?", 30)
    elif mode == "higgs":
        tile(c, hx, hy, "H", eo(p(t, .2, .8)), Y, dash=True)
        callout(c, t, .6, hx, hy + sz + 40, "HIGGS BOSON", "PREDICTED 1964  ·  NEVER SEEN", 30)
        leader(c, t, .4, [(hx + sz / 2, hy + sz), (hx + sz / 2, hy + sz + 10)])
    elif mode == "found":
        k = eo(p(t, .3, .9))
        tile(c, hx, hy, "H", 1, Y, fill=Y if k > .5 else None)
        if k > 0:
            g = cairo.RadialGradient(hx + 35, hy + 35, 0, hx + 35, hy + 35, 160); g.add_color_stop_rgba(0, *Y, .25 * k); g.add_color_stop_rgba(1, *Y, 0)
            c.set_source(g); c.paint()
        callout(c, t, .7, hx, hy + sz + 40, "FOUND", "4 JULY 2012  ·  CERN, GENEVA", 30)
    if mode in ("dim",):
        txt(c, "THE STANDARD MODEL", x0, y0 - 24, 13, SEMI, GR, .9, track=2)
    else:
        txt(c, "THE STANDARD MODEL", x0, y0 - 24, 13, SEMI, WH, eo(p(t, 0, .5)), track=2, frac=typed(t, 0, "THE STANDARD MODEL", 40))

def scene_bigbang(c, t, d, s):
    bg(c, hatch=False, col=(0.02, 0.02, 0.025)); cx, cy = W / 2, H / 2
    r = random.Random(3); u = t / d
    g = cairo.RadialGradient(cx, cy, 0, cx, cy, 260 * (1 - u) + 30)
    g.add_color_stop_rgba(0, 1, .95, .8, .9 * (1 - u) + .1); g.add_color_stop_rgba(.4, *Y, .35 * (1 - u)); g.add_color_stop_rgba(1, *Y, 0)
    c.set_source(g); c.paint()
    for i in range(420):
        an = r.uniform(0, 2 * math.pi); v = r.uniform(.2, 1) ** 2
        rr = v * 700 * (u ** .55)
        dot(c, cx + rr * math.cos(an), cy + rr * math.sin(an) * .8, r.uniform(.6, 2), Y if i % 4 == 0 else WH, cl(1 - rr / 760))
    callout(c, t, .8, 70, 640, "THE FIRST INSTANT", "RECREATE IT IN A MACHINE", 34)

# ------------------------------------------------------------------ type-driven scenes
def rich(c, line, x, y, size, a):
    parts = line.split("*"); xx = x
    for i, part in enumerate(parts):
        if not part: continue
        txt(c, part, xx, y, size, BOLD, Y if i % 2 else WH, a, track=-1)
        font(c, BOLD, size); xx += tw(c, part, -1)

def scene_kinetic(c, t, d, s):
    bg(c); lines = s["lines"]; n = len(lines)
    poly(c, [(96, 190), (96, 190 + 76 * n)], eo(p(t, 0, .8)), Y, 3)
    for i, ln in enumerate(lines):
        st = .15 + i * (d * .62 / n); u = eo(p(t, st, st + .45))
        rich(c, ln, 128, 250 + i * 76 + (1 - u) * 18, 58, u)

def scene_stat(c, t, d, s):
    bg(c); strata(c, .8, 160, 8, 5)
    x = 380
    poly(c, [(x, -10), (x, 360)], eio(p(t, 0, .7)), Y, 2)
    dot(c, x, 360, 4 * eo(p(t, .6, .8)), Y)
    poly(c, [(x, 360), (1060, 360)], eo(p(t, .6, 1.1)), Y, 1.4)
    txt(c, s["year"], x + 24, 268, 22, SEMI, WH, eo(p(t, .6, .9)))
    txt(c, s["value"], x + 20, 340, 84, BOLD, Y, frac=typed(t, .7, s["value"], 18), track=-2)
    txt(c, s["caption"], x + 24, 388, 13, SEMI, WH, .9, frac=typed(t, 1.0, s["caption"], 45), track=1.6)

def scene_quote(c, t, d, s):
    c.set_source_surface(textures()["grunge"]); c.paint()
    fr = typed(t, .3, s["text"], 9)
    txt(c, s["text"], W / 2, H / 2 + 20, 92, SERIF, WH, 1, "c", italic=True, frac=fr, cursor=(int(t * 2.4) % 2 == 0))
    txt(c, "—  " + s["who"], W / 2, H / 2 + 90, 15, SEMI, Y, eo(p(t, 1.8, 2.3)), "c", 2.5)

def scene_questions(c, t, d, s):
    c.set_source_surface(textures()["grunge"]); c.paint()
    qs = ["Why did America try to build it?", "What went wrong?", "And why did it walk away?"]
    hi, pre = s["hi"], s.get("pre", 0)
    for i, q in enumerate(qs):
        y = 270 + i * 80
        if i < pre: a, fr = .45, 1
        elif i == 0 and hi == 1: a, fr = (.45 if t > d * .45 else 1), typed(t, .1, q, 24)
        elif i == hi: st = .1 if pre else d * .45; a, fr = 1, typed(t, st, q, 24)
        else: continue
        txt(c, q, W / 2, y, 46, SERIF, Y if (i == hi and fr > 0 and (pre or t > d * .45)) else WH, a, "c", frac=fr)

def scene_title(c, t, d, s):
    bg(c, hatch=False, col=(0.03, 0.03, 0.03)); cx, cy = W / 2, H / 2
    c.save(); c.translate(cx, cy); c.rotate(t * .05)
    for i in range(3): arc(c, 0, 0, 300 + i * 14, 0, 2 * math.pi, Y if i == 1 else DIM, 1, .25 * eo(p(t, 0, 1.5)))
    c.restore()
    u = eo(p(t, .1, 1.4))
    txt(c, "Superconducting", cx, cy - 18, 78, SERIF, WH, u, "c", track=lerp(14, 2, u))
    txt(c, "Super Collider", cx, cy + 66, 78, SERIF, WH, eo(p(t, .4, 1.7)), "c", track=lerp(14, 2, eo(p(t, .4, 1.7))))
    txt(c, "ELLIS COUNTY, TEXAS  ·  1987–1993", cx, cy + 118, 14, SEMI, Y, eo(p(t, 1.4, 2.0)), "c", 3)

def scene_chapter(c, t, d, s):
    c.set_source_surface(textures()["grunge"]); c.paint()
    fr = typed(t, .5, s["text"], 24)
    txt(c, s["text"], W / 2, H / 2 + 12, 44, SERIF, WH, 1, "c", frac=fr, cursor=(int(t * 2.4) % 2 == 0 and t < d - .6))

def scene_timeline(c, t, d, s):
    bg(c); a, b = s["a"], s["b"]; x0, x1, y = 140, 1140, 420
    def X(yr): return lerp(x0, x1, (yr - a) / (b - a))
    poly(c, [(x0, y), (x1, y)], eo(p(t, 0, .6)), GR, 1.4)
    step = 1 if b - a <= 10 else 5
    for i, yr in enumerate(range(a, b + 1)):
        if (yr - a) % step and yr != b: continue
        k = eo(p(t, .1 + i * .02, .4 + i * .02))
        poly(c, [(X(yr), y - 8), (X(yr), y + 8)], 1, GR, 1, k)
        txt(c, str(yr), X(yr), y + 34, 14, SEMI, WH, k * .75, "c")
    s0, s1 = s["span"]; f = eio(p(t, .5, 1.8))
    c.rectangle(X(s0), y - 5, (X(s1) - X(s0)) * f, 10); rgb(c, Y); c.fill()
    callout(c, t, 1.0, (X(s0) + X(s1)) / 2, y - 60, s["label"], f"{s0} – {s1}", 50, "c")

def scene_magnet(c, t, d, s):
    bg(c); mode = s["mode"]
    if mode == "basic":
        cx, cy = 420, H / 2 + 20
        arc(c, cx, cy, 210, 0, 2 * math.pi * eio(p(t, 0, .9)), GR, 1.5)
        k = eo(p(t, .3, .9)); dot(c, cx, cy, 180 * k, (0.17, 0.17, 0.17)); dot(c, cx, cy, 110 * k, BG)
        for i in range(4):
            a0 = i * math.pi / 2 + .2; kk = eo(p(t, .6 + i * .12, 1.0 + i * .12))
            arc(c, cx, cy, 78, a0, a0 + (math.pi / 2 - .4) * kk, Y, 26)
        dot(c, cx, cy, 34, (0.05, 0.05, 0.05)); arc(c, cx, cy, 34, 0, 2 * math.pi, WH, 1.4)
        g = cairo.RadialGradient(cx, cy, 0, cx, cy, 16); g.add_color_stop_rgba(0, 1, 1, .9, .9); g.add_color_stop_rgba(1, *Y, 0)
        c.set_source(g); c.arc(cx, cy, 16, 0, 2 * math.pi); c.fill()
        labs = [((cx + 70, cy - 60), "SUPERCONDUCTING COILS", 160), ((cx + 150, cy + 60), "IRON YOKE", 260), ((cx + 200, cy - 150), "LIQUID HELIUM  −269 °C", 40)]
        for i, ((px, py), lab, ty) in enumerate(labs):
            st = d * .18 + i * d * .13
            leader(c, t, st, [(px, py), (720, ty + 210), (760, ty + 210)], .4, WH)
            txt(c, lab, 772, ty + 215, 15, SEMI, Y if i == 2 else WH, eo(p(t, st + .3, st + .6)), track=1.5)
        callout(c, t, d * .55, 772, 600, "×10,000", "MAGNETS AROUND THE RING", 52)
        if s.get("label"): txt(c, s["label"], 70, 92, 15, SEMI, Y, eo(p(t, 0, .4)), track=2.5)
    elif mode == "widen":
        cx, cy = 470, H / 2; u = eio(p(t, d * .45, d * .7))
        r = lerp(120, 150, u)
        for i in range(4):
            a0 = i * math.pi / 2 + .2; arc(c, cx, cy, r + 46, a0, a0 + math.pi / 2 - .4, Y, 50, .9)
        dot(c, cx, cy, r, (0.05, 0.05, 0.05)); arc(c, cx, cy, r, 0, 2 * math.pi, WH, 1.6)
        wob = (1 - u) * 26 * math.sin(t * 3.1); dot(c, cx + wob, cy + wob * .4, 10, WH)
        poly(c, [(cx - r, cy + r + 40), (cx + r, cy + r + 40)], 1, WH, 1.2)
        for xx in (cx - r, cx + r): poly(c, [(xx, cy + r + 30), (xx, cy + r + 50)], 1, WH, 1.2)
        lab = "4 cm" if u < .5 else "5 cm"
        txt(c, lab, cx, cy + r + 76, 26, BOLD, WH if u < .5 else Y, 1, "c")
        callout(c, t, .4, 800, 300, "BEAM WANDERS", "EARLY MAGNET TESTS", 40, col=WH)
        if t > d * .5: callout(c, t, d * .52, 800, 420, "+1 CM", "WIDER OPENING, EVERY MAGNET", 64)
    elif mode == "grid":
        cols, rows, sp = 125, 80, 8.0; x0, y0 = 140, 40
        f = eio(p(t, .2, d * .75)); n = int(cols * rows * f)
        rgb(c, Y, .85)
        for i in range(n):
            c.rectangle(x0 + (i % cols) * sp, y0 + (i // cols) * sp, 4.2, 4.2)
        c.fill()
        c.rectangle(380, 250, 520, 190); rgb(c, BG, .92); c.fill()
        txt(c, f"{n:,}", W / 2, 350, 92, BOLD, WH, 1, "c", -2)
        txt(c, "+1 CM  ×  EVERY MAGNET", W / 2, 400, 15, SEMI, Y, 1, "c", 2.5)

def scene_bars(c, t, d, s):
    bg(c); data = [(1987, 4.4, "$4.4B"), (1991, 8.25, "$8.2B"), (1993, 11.0, "$11B+")]
    base = 590; xs = [400, 640, 880]; bw = 150; k = 34
    poly(c, [(300, base), (1060, base)], eo(p(t, 0, .5)), GR, 1.4)
    txt(c, "ESTIMATED COST  ·  BILLIONS OF DOLLARS", 300, 110, 14, SEMI, WH, .85, track=2, frac=typed(t, .1, "ESTIMATED COST  ·  BILLIONS OF DOLLARS", 45))
    show = s["show"]
    if show == 0:
        callout(c, t, .3, W / 2, 380, s["label"], "AN ESTIMATE THAT KEPT MOVING", 54, "c")
    for i in range(show):
        newest = (show == 1 and i == 0) or (show == 3 and i >= 1)
        st = .2 + (i - 1) * (d * .45) if show == 3 and i >= 1 else .2
        g = eio(p(t, st, st + 1.0)) if newest else 1
        hgt = data[i][1] * k * g
        c.rectangle(xs[i] - bw / 2, base - hgt, bw, hgt); rgb(c, Y if i == show - 1 else (0.55, 0.42, 0.08)); c.fill()
        txt(c, data[i][2], xs[i], base - hgt - 16, 34, BOLD, WH, eo(p(t, st + .6, st + 1)) if newest else 1, "c", -1)
        txt(c, str(data[i][0]), xs[i], base + 30, 16, SEMI, WH, .8, "c")

def scene_strata(c, t, d, s):
    bg(c)
    layers = [(170, 210, "TOPSOIL", (0.16, 0.15, 0.13)), (210, 520, "AUSTIN CHALK", (0.2, 0.2, 0.19)), (520, 720, "EAGLE FORD SHALE", (0.12, 0.12, 0.12))]
    for i, (y0, y1, lab, col) in enumerate(layers):
        k = eo(p(t, i * .25, .5 + i * .25))
        c.rectangle(0, y0, W, (y1 - y0) * k); rgb(c, col); c.fill()
        poly(c, [(x, y0 + 5 * math.sin(x / 90 + i)) for x in range(0, W + 20, 20)], k, GR, 1)
        txt(c, lab, 60, y0 + 34, 14, SEMI, Y if i == 1 else WH, k * .9, track=2)
    c.save(); c.rectangle(0, 210, W, 310); c.clip(); c.set_source(textures()["hatch"]); c.paint(); c.restore()
    tx, ty = 560, 400; k = eo(p(t, .8, 1.3))
    dot(c, tx, ty, 50 * k, (0.33, 0.33, 0.32)); dot(c, tx, ty, 40 * k, (0.03, 0.03, 0.03)); arc(c, tx, ty, 50, 0, 2 * math.pi * k, Y, 2)
    leader(c, t, d * .3, [(tx + 52, ty - 20), (760, 300), (800, 300)])
    callout(c, t, d * .3 + .3, 812, 308, "SOFT", "FAST TO BORE THROUGH", 38)
    leader(c, t, d * .55, [(tx + 52, ty + 20), (760, 470), (800, 470)])
    callout(c, t, d * .55 + .3, 812, 478, "SOLID", "STANDS FOR DECADES", 38)

def scene_shafts(c, t, d, s):
    bg(c); sy, ty = 200, 560
    c.rectangle(0, sy, W, H); rgb(c, (0.1, 0.1, 0.095)); c.fill()
    c.save(); c.rectangle(0, sy, W, H); c.clip(); c.set_source(textures()["hatch"]); c.paint(); c.restore()
    strata(c, .7, sy + 50, 6, 8)
    poly(c, [(0, sy), (W, sy)], 1, GR, 1.6)
    poly(c, [(60, ty - 16), (W - 60, ty - 16)], 1, DIM, 1); poly(c, [(60, ty + 16), (W - 60, ty + 16)], 1, DIM, 1)
    if s["mode"] == "tbm":
        x = lerp(80, 1050, eio(p(t, .1, d)))
        c.rectangle(60, ty - 16, x - 60, 32); rgb(c, (0.03, 0.03, 0.03)); c.fill()
        poly(c, [(60, ty), (x, ty)], 1, Y, 2.4)
        c.rectangle(x - 70, ty - 14, 70, 28); rgb(c, (0.35, 0.35, 0.33)); c.fill()
        c.save(); c.translate(x + 4, ty); c.rotate(t * 4)
        for i in range(6): poly(c, [(0, 0), (16 * math.cos(i), 16 * math.sin(i))], 1, Y, 2)
        c.restore(); arc(c, x + 4, ty, 16, 0, 2 * math.pi, Y, 2)
        r = random.Random(int(t * 10))
        for i in range(10): dot(c, x + 22 + r.uniform(0, 26), ty + r.uniform(-14, 14), r.uniform(.8, 2), WH, r.uniform(.2, .6))
        callout(c, t, .5, 70, 120, "TUNNEL BORING MACHINES", "CUTTING THROUGH CHALK", 38)
    else:
        c.rectangle(60, ty - 16, W - 120, 32); rgb(c, (0.03, 0.03, 0.03)); c.fill()
        poly(c, [(60, ty), (W - 60, ty)], 1, Y, 2.4)
        n = 17; done = 0
        for i in range(n):
            x = lerp(100, W - 100, i / (n - 1)); st = .2 + i * (d * .6 / n)
            k = eio(p(t, st, st + .5))
            if k > 0:
                c.rectangle(x - 4, sy, 8, (ty - 16 - sy) * k); rgb(c, (0.03, 0.03, 0.03)); c.fill()
                poly(c, [(x, sy), (x, sy + (ty - 16 - sy) * k)], 1, Y, 1.5)
            if k >= 1: done += 1
        txt(c, str(done), W - 80, 140, 84, BOLD, Y, 1, "r", -2)
        txt(c, "SHAFTS FROM THE SURFACE", W - 80, 170, 13, SEMI, WH, .9, "r", 1.6)

def paper_card(c, x, y, w, h, rot, a=1.0):
    c.save(); c.translate(x + w / 2, y + h / 2); c.rotate(rot)
    c.rectangle(-w / 2 + 6, -h / 2 + 8, w, h); c.set_source_rgba(0, 0, 0, .5 * a); c.fill()
    c.rectangle(-w / 2, -h / 2, w, h); rgb(c, PAPER, a); c.fill()
    c.translate(-w / 2, -h / 2)
    return c

def scene_docs(c, t, d, s):
    bg(c)
    heads = ["COST & SCHEDULE REVIEW", "MANAGEMENT AUDIT", "COST CONTROLS"]
    for i, hd in enumerate(heads):
        st = .1 + i * (d * .25); u = eo(p(t, st, st + .6))
        if u <= 0: continue
        x = lerp(W + 50, 150 + i * 190, u); r = random.Random(i)
        paper_card(c, x, 120 + i * 30, 440, 500, (-0.06 + i * 0.05))
        txt(c, hd, 30, 60, 22, SERIF, INK, 1, track=1)
        poly(c, [(30, 78), (410, 78)], 1, INK, 1, .6)
        for j in range(16):
            ln = r.uniform(240, 380)
            c.rectangle(30, 108 + j * 22, ln, 7); rgb(c, INK, .18); c.fill()
        hl = eo(p(t, st + .7, st + 1.2))
        c.rectangle(28, 104 + 6 * 22, 340 * hl, 14); rgb(c, Y, .55); c.fill()
        c.restore()
    callout(c, t, d * .6, W - 70, 660, "AUDITS", "WEAK COST CONTROLS  ·  POOR MANAGEMENT", 44, "r")

def scene_headlines(c, t, d, s):
    bg(c)
    heads = ["COLLIDER COSTS CLIMB AGAIN", "SUPER COLLIDER UNDER FIRE", "HOUSE VOTES TO KILL COLLIDER"]
    for i, hd in enumerate(heads):
        st = i * (d * .3); u = eo(p(t, st, st + .35))
        if u <= 0: continue
        paper_card(c, 190 + i * 40, 110 + i * 150, 820, 150, (-0.03 + i * .025), u)
        txt(c, hd, 410, 92, 44, SERIF, INK, u, "c", frac=typed(t, st + .1, hd, 30))
        c.restore()

def station_icon(c, x, y, a, col):
    poly(c, [(x - 90, y), (x + 90, y)], 1, col, 4, a)
    for sx in (-80, -45, 45, 80):
        c.rectangle(x + sx - 14, y - 40, 28, 80); rgb(c, col, a * .5); c.fill()
        c.rectangle(x + sx - 14, y - 40, 28, 80); rgb(c, col, a); c.set_line_width(1.2); c.stroke()
    c.rectangle(x - 18, y - 12, 36, 24); rgb(c, col, a); c.fill()

def scene_split(c, t, d, s):
    bg(c); mode = s["mode"]
    poly(c, [(W / 2, 120), (W / 2, 600)], eo(p(t, 0, .6)), GR, 1)
    la = ra = 1.0
    if mode == "each": la = 1 if t < d * .45 else .35; ra = .35 if t < d * .45 else 1
    if mode == "cancel": la = lerp(1, .4, eo(p(t, d * .45, d * .6)))
    k = eo(p(t, .1, .7))
    arc(c, W / 4, 330, 100, -math.pi / 2, -math.pi / 2 + 2 * math.pi * k, Y, 4, la)
    for an in (0, math.pi): dot(c, W / 4 + 100 * math.cos(an), 330 + 100 * math.sin(an), 7, WH, la * k)
    station_icon(c, 3 * W / 4, 330, ra * k, WH)
    txt(c, "SUPER COLLIDER", W / 4, 500, 30, BOLD, Y, la * k, "c", -.5)
    txt(c, "SPACE STATION", 3 * W / 4, 500, 30, BOLD, WH, ra * k, "c", -.5)
    txt(c, "$11B+  ·  TEXAS", W / 4, 528, 13, SEMI, WH, la * k * .8, "c", 2)
    txt(c, "NASA  ·  LOW EARTH ORBIT", 3 * W / 4, 528, 13, SEMI, WH, ra * k * .8, "c", 2)
    if mode == "cancel":
        u = eo(p(t, d * .5, d * .6))
        if u > 0:
            c.save(); c.translate(W / 4, 330); c.rotate(-.18); c.scale(lerp(1.6, 1, u), lerp(1.6, 1, u))
            c.rectangle(-150, -34, 300, 68); rgb(c, Y, u); c.set_line_width(5); c.stroke()
            txt(c, "CANCELLED", 0, 15, 44, BOLD, Y, u, "c", 2); c.restore()
        txt(c, "FUNDED", 3 * W / 4, 590, 20, BOLD, WH, eo(p(t, d * .6, d * .7)), "c", 3)

def scene_vote(c, t, d, s):
    bg(c); u = eio(p(t, .3, 2.2))
    txt(c, "SPACE STATION  ·  HOUSE VOTE  ·  JUNE 1993", W / 2, 150, 14, SEMI, WH, .9, "c", 2.5, frac=typed(t, 0, "SPACE STATION  ·  HOUSE VOTE  ·  JUNE 1993", 45))
    for x, lab, n, col in ((W / 2 - 230, "KEEP", 216, Y), (W / 2 + 230, "CUT", 215, WH)):
        txt(c, lab, x, 260, 18, SEMI, col, 1, "c", 4)
        txt(c, str(int(round(n * u))), x, 390, 130, BOLD, col, 1, "c", -3)
    poly(c, [(W / 2, 220), (W / 2, 420)], 1, GR, 1)
    callout(c, t, 2.5, W / 2, 520, "1 VOTE", "THE MARGIN THAT SAVED IT", 56, "c")

def scene_chart(c, t, d, s):
    bg(c); x0, x1, y0, y1 = 120, 1160, 160, 560
    for i in range(6): poly(c, [(x0, y0 + i * 80), (x1, y0 + i * 80)], 1, DIM, 1)
    r = random.Random(12); v = 0; pts = []
    for i in range(140):
        v += r.uniform(-1, 1.18); pts.append((lerp(x0, x1, i / 139), 470 - v * 13))
    poly(c, pts, eio(p(t, .1, d * .85)), Y, 2)
    callout(c, t, .5, x0, 120, "PHYSICISTS → WALL STREET", "BUILDING MODELS FOR BANKS", 36)

def scene_black(c, t, d, s):
    rgb(c, (0, 0, 0)); c.paint()
    if s.get("say") == "Nobody knows.":
        txt(c, "Nobody knows.", W / 2, H / 2 + 12, 40, SERIF, WH, .9 * eo(p(t, .1, .8)) * (1 - p(t, d - .8, d)), "c")

def scene_end(c, t, d, s):
    rgb(c, (0, 0, 0)); c.paint()
    a = eo(p(t, .3, 1.3)) * (1 - p(t, d - 1.0, d))
    txt(c, s["text"], W / 2, H / 2, 40, SERIF, WH, a, "c", 3)
    txt(c, "1987 – 1993", W / 2, H / 2 + 42, 14, SEMI, Y, a, "c", 4)

SCENES = {k[6:]: v for k, v in globals().items() if k.startswith("scene_")}

# ------------------------------------------------------------------ frame assembly
def card_wrap(c, t, d, s, inner):
    sub = cairo.ImageSurface(cairo.FORMAT_ARGB32, W, H); sc = cairo.Context(sub)
    inner(sc, t, d, s)
    bg(c)
    u = eo(p(t, 0, .5)); rot = -0.035
    c.save(); c.translate(W / 2, H / 2 + (1 - u) * 30); c.rotate(rot); sk = .66
    w, h = W * sk, H * sk
    c.rectangle(-w / 2 - 14 + 8, -h / 2 - 14 + 10, w + 28, h + 28); c.set_source_rgba(0, 0, 0, .6); c.fill()
    c.rectangle(-w / 2 - 14, -h / 2 - 14, w + 28, h + 28); rgb(c, (0.92, 0.91, 0.88)); c.fill()
    c.save(); c.translate(-w / 2, -h / 2); c.scale(sk, sk); c.set_source_surface(sub, 0, 0); c.paint(); c.restore()
    lab = s["card"]; font(c, BOLD, 22); lw = tw(c, lab, 1) + 36
    k = eo(p(t, .5, .9))
    c.save(); c.translate(-w / 2 - 30, h / 2 - 24); c.rotate(-0.04)
    c.rectangle(0, 0, lw * k, 40); rgb(c, Y); c.fill()
    txt(c, lab, 18, 28, 22, BOLD, INK, 1, track=1, frac=typed(t, .7, lab, 30))
    c.restore(); c.restore()

def draw(c, i, t, d, total_t):
    s = S[i]; fn = SCENES[s["scene"]]
    c.save()
    still = s["scene"] in ("chapter", "black", "end", "quote", "questions")
    if not still:
        u = t / max(d, .01); z = 1 + .05 * u; dx = (8 if i % 2 else -8) * u
        c.translate(W / 2 + dx, H / 2); c.scale(z, z); c.translate(-W / 2, -H / 2)
    if s.get("card"): card_wrap(c, t, d, s, fn)
    else: fn(c, t, d, s)
    c.restore()
    if s.get("cap"):
        cap = s["cap"]; txt(c, cap, 44, 672, 24, BOLD, WH, 1, frac=typed(t, .25, cap, 16), track=-.3)
    tex = textures()
    c.set_source_surface(tex["vig"]); c.paint()
    c.set_source_surface(tex["grain"][int(total_t * FPS) % 6]); c.paint()
    fade = 0
    if s["scene"] == "chapter": fade = max(1 - p(t, 0, .45), p(t, d - .5, d))
    if i == 0: fade = max(fade, 1 - p(t, 0, .6))
    nxt = S[i + 1]["scene"] if i + 1 < len(S) else None
    if nxt == "chapter": fade = max(fade, p(t, d - .35, d))
    if i > 0 and S[i - 1]["scene"] == "chapter": fade = max(fade, 1 - p(t, 0, .35))
    if fade > 0: c.set_source_rgba(0, 0, 0, cl(fade)); c.paint()

def frame_iter(timing, f0, f1):
    shots = timing["shots"]; lead = shots[0]["start"]
    surf = cairo.ImageSurface(cairo.FORMAT_RGB24, W, H); c = cairo.Context(surf)
    j = 0
    for fi in range(f0, f1):
        T = fi / FPS
        if T < lead:
            rgb(c, (0, 0, 0)); c.paint(); yield surf; continue
        while j + 1 < len(shots) and shots[j + 1]["start"] <= T: j += 1
        while j > 0 and shots[j]["start"] > T: j -= 1
        sh = shots[j]
        draw(c, sh["i"], T - sh["start"], sh["dur"], T)
        surf.flush(); yield surf

def render_chunk(args):
    timing, geo, f0, f1, out = args
    load_geo(geo)
    ff = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "bgr0", "-s", f"{W}x{H}", "-r", str(FPS),
                           "-i", "-", "-c:v", "libx264", "-preset", "medium", "-crf", "19", "-pix_fmt", "yuv420p", out], stdin=subprocess.PIPE)
    for surf in frame_iter(timing, f0, f1):
        ff.stdin.write(bytes(surf.get_data()))
    ff.stdin.close(); ff.wait()
    return out

def main():
    timing = json.load(open(sys.argv[1])); geo = sys.argv[2]; out = sys.argv[3]
    if "--still" in sys.argv:
        load_geo(geo)
        spec = sys.argv[sys.argv.index("--still") + 1]
        for item in spec.split(";"):
            i, tt = (item.split(",") + ["0.6"])[:2]; i = int(i); tt = float(tt)
            sh = timing["shots"][i]
            surf = cairo.ImageSurface(cairo.FORMAT_RGB24, W, H); c = cairo.Context(surf)
            T = sh["start"] + min(tt, sh["dur"] - .01) if tt >= 0 else sh["start"] + sh["dur"] - .05
            draw(c, i, T - sh["start"], sh["dur"], T)
            surf.write_to_png(f"{out}_{i:03d}.png")
        return
    total = int(math.ceil(timing["total"] * FPS))
    n = os.cpu_count() or 4
    bounds = [round(total * k / n) for k in range(n + 1)]
    tmp = out + ".parts"; os.makedirs(tmp, exist_ok=True)
    jobs = [(timing, geo, bounds[k], bounds[k + 1], os.path.join(tmp, f"p{k:02d}.mp4")) for k in range(n)]
    with Pool(n) as pool: parts = pool.map(render_chunk, jobs)
    lst = os.path.join(tmp, "list.txt")
    open(lst, "w").write("".join(f"file '{os.path.abspath(q)}'\n" for q in parts))
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", lst, "-c", "copy", out], check=True)
    print("wrote", out, total, "frames")

if __name__ == "__main__":
    main()
