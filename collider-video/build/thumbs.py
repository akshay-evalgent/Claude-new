"""Three YouTube thumbnails (1280x720) for A/B testing with YouTube's Test & Compare.

usage: python thumbs.py FOOTAGE_DIR GEO_DIR OUT_DIR
  A  reference style: bright flat cross-section, ring buried under Texas farmland, LHC ring for scale
  B  photo: the real abandoned SSC building, ground cut away to a glowing tunnel, "$2 BILLION" + arrow
  C  scale shock: the ring drawn to scale over North Texas next to CERN's LHC ring, "3x BIGGER"
"""
import cairo, math, os, random, sys
import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(__file__))
import render as R
import render2 as R2

W, H = 1280, 720
BLACK = "Inter Display Black"; XB = "Inter Display ExtraBold"; SB = "Inter SemiBold"
YEL = (1.0, 0.76, 0.05); RED = (0.93, 0.12, 0.12); NAVY = (0.09, 0.16, 0.30)

def font(c, f, s): c.select_font_face(f, 0, 0); c.set_font_size(s)
def text_w(c, s): return c.text_extents(s)[4]

def label_box(c, s, x, y, size, style="white", pad=14, anchor="l"):
    """The reference's two label styles: white box with blue border + navy text, or black box + white text."""
    font(c, XB, size); w = text_w(c, s); h = size * 1.25
    if anchor == "c": x -= (w + 2 * pad) / 2
    c.rectangle(x, y, w + 2 * pad, h + pad * .6)
    if style == "white":
        c.set_source_rgb(1, 1, 1); c.fill_preserve(); c.set_source_rgb(0.42, 0.62, 0.86); c.set_line_width(3); c.stroke()
        c.set_source_rgb(*NAVY)
    elif style == "yellow":
        c.set_source_rgb(*YEL); c.fill(); c.set_source_rgb(0.05, 0.05, 0.05)
    else:
        c.set_source_rgb(0.02, 0.02, 0.02); c.fill(); c.set_source_rgb(1, 1, 1)
    c.move_to(x + pad, y + size * 1.02 + pad * .3); c.show_text(s)
    return w + 2 * pad

def stroke_text(c, s, x, y, size, fill, outline=(0, 0, 0), ow=10, f=BLACK, shadow=True):
    font(c, f, size)
    if shadow:
        c.move_to(x + 6, y + 8); c.text_path(s); c.set_source_rgba(0, 0, 0, .55); c.fill()
    c.move_to(x, y); c.text_path(s)
    c.set_source_rgb(*outline); c.set_line_width(ow); c.set_line_join(cairo.LINE_JOIN_ROUND); c.stroke_preserve()
    c.set_source_rgb(*fill); c.fill()

def glow_ellipse(c, cx, cy, rx, ry, col, width, passes=((26, .07), (16, .12), (9, .25), (4, .7), (2, 1))):
    for w, a in passes:
        c.save(); c.translate(cx, cy); c.scale(rx, ry); c.arc(0, 0, 1, 0, 2 * math.pi); c.restore()
        c.set_source_rgba(*col, a); c.set_line_width(width * w / 4); c.stroke()

def arrow(c, x0, y0, x1, y1, col=RED, w=26):
    ang = math.atan2(y1 - y0, x1 - x0); L = math.hypot(x1 - x0, y1 - y0)
    c.save(); c.translate(x0, y0); c.rotate(ang)
    c.move_to(0, -w / 2); c.line_to(L - w * 1.6, -w / 2); c.line_to(L - w * 1.6, -w * 1.4); c.line_to(L, 0)
    c.line_to(L - w * 1.6, w * 1.4); c.line_to(L - w * 1.6, w / 2); c.line_to(0, w / 2); c.close_path()
    c.set_source_rgb(1, 1, 1); c.set_line_width(8); c.set_line_join(cairo.LINE_JOIN_ROUND); c.stroke_preserve()
    c.set_source_rgb(*col); c.fill(); c.restore()

# ------------------------------------------------------------------ A: reference style
def thumb_a(c):
    g = cairo.LinearGradient(0, 0, 0, 300); g.add_color_stop_rgb(0, .80, .87, .94); g.add_color_stop_rgb(1, .90, .93, .96)
    c.set_source(g); c.paint()
    hz = 250
    # curved ground surface like the reference's curved Earth
    def surface(y_off=0):
        c.move_to(-50, hz + 60 + y_off)
        c.curve_to(300, hz - 5 + y_off, 980, hz - 5 + y_off, W + 50, hz + 60 + y_off)
    layers = [(0, (.55, .66, .36)), (14, (.89, .70, .55)), (150, (.86, .62, .45)), (300, (.80, .52, .36))]
    for off, col in layers:
        surface(off); c.line_to(W + 50, H + 50); c.line_to(-50, H + 50); c.close_path(); c.set_source_rgb(*col); c.fill()
    surface(0); c.set_source_rgb(.36, .30, .22); c.set_line_width(5); c.stroke()
    # farm on the surface: barn, house, abandoned lab block, cows
    def rect(x, y, w, h, col): c.rectangle(x, y, w, h); c.set_source_rgb(*col); c.fill()
    rect(170, hz - 8, 70, 40, (.70, .18, .14)); c.move_to(165, hz - 8); c.line_to(205, hz - 34); c.line_to(245, hz - 8); c.close_path(); c.set_source_rgb(.45, .12, .10); c.fill()
    rect(905, hz - 30, 150, 52, (.55, .57, .60)); rect(905, hz - 30, 150, 8, (.38, .40, .44)); rect(1060, hz - 10, 70, 32, (.62, .64, .66))
    for x in range(915, 1050, 22): rect(x, hz - 14, 12, 8, (.38, .40, .44))
    for x, y in ((330, hz + 4), (380, hz + 10), (700, hz - 2)):
        c.save(); c.translate(x, y); c.scale(1.0, .62); c.arc(0, 0, 14, 0, 2 * math.pi); c.restore(); c.set_source_rgb(.15, .13, .12); c.fill()
        rect(x - 10, y + 4, 3, 10, (.15, .13, .12)); rect(x + 8, y + 4, 3, 10, (.15, .13, .12))
    # the buried ring (perspective), back half fainter
    cx, cy, rx, ry = 640, 505, 540, 135
    c.save(); c.translate(cx, cy); c.scale(rx, ry); c.arc(0, 0, 1, math.pi, 2 * math.pi); c.restore()
    c.set_source_rgba(.20, .18, .16, .55); c.set_line_width(26); c.stroke()
    glow_ellipse(c, cx, cy, rx, ry, YEL, 6)
    c.save(); c.translate(cx, cy); c.scale(rx, ry); c.arc(0, 0, 1, 0, math.pi); c.restore()
    c.set_source_rgba(.15, .13, .12, .9); c.set_line_width(30); c.stroke()
    c.save(); c.translate(cx, cy); c.scale(rx, ry); c.arc(0, 0, 1, 0, math.pi); c.restore()
    c.set_source_rgb(*YEL); c.set_line_width(8); c.stroke()
    # CERN's LHC ring for scale, same projection
    lr = 27 / 87
    c.save(); c.translate(cx + 40, cy + 8); c.scale(rx * lr, ry * lr); c.arc(0, 0, 1, 0, 2 * math.pi); c.restore()
    c.set_source_rgb(.20, .45, .85); c.set_line_width(9); c.stroke()
    # shaft from the surface down to the ring
    c.rectangle(988, hz + 20, 14, cy + ry * .55 - hz - 20); c.set_source_rgb(.15, .13, .12); c.fill()
    for y in range(int(hz + 40), int(cy + ry * .5), 22): c.rectangle(983, y, 24, 3); c.set_source_rgb(.15, .13, .12); c.fill()
    label_box(c, "TUNNEL: 54 MILES", 200, 595, 46, "white")
    label_box(c, "CERN's LHC", cx + 40, cy - 6, 34, "black", anchor="c")

# ------------------------------------------------------------------ B: dramatic photo
def thumb_b(c, foot):
    R2.FOOT = foot
    im = Image.open(os.path.join(foot, "raw/ssc_mdl.jpg")).convert("RGB")
    iw, ih = im.size; crop_h = iw * 9 / 16
    im = im.crop((0, int(ih * .04), iw, int(ih * .04 + crop_h))).resize((W, H), Image.LANCZOS)
    a = np.asarray(im).astype(np.float32) / 255
    lum = a @ np.array([.299, .587, .114])
    a = (lum[..., None] * .55 + a * .45) * np.array([.82, .92, 1.02])
    a = np.clip((a - .5) * 1.25 + .45, 0, 1)
    c.set_source_surface(R2.to_surface((a * 255).astype(np.uint8)), 0, 0); c.paint()
    g = cairo.LinearGradient(0, 0, 0, H); g.add_color_stop_rgba(0, 0, 0, 0, .55); g.add_color_stop_rgba(.5, 0, 0, 0, .05); g.add_color_stop_rgba(1, 0, 0, 0, .3)
    c.set_source(g); c.paint()
    # cut-away: jagged grass edge, soil, glowing tunnel ring
    top = 520; r = random.Random(3)
    c.move_to(0, top)
    for x in range(0, W + 20, 20): c.line_to(x, top + r.uniform(-12, 12))
    c.line_to(W, H); c.line_to(0, H); c.close_path()
    soil = cairo.LinearGradient(0, top, 0, H); soil.add_color_stop_rgb(0, .22, .16, .10); soil.add_color_stop_rgb(1, .08, .06, .04)
    c.set_source(soil); c.fill_preserve(); c.set_source_rgb(*YEL); c.set_line_width(3); c.stroke()
    glow_ellipse(c, 700, 640, 520, 58, YEL, 7)
    c.save(); c.translate(700, 640); c.scale(520, 58); c.arc(0, 0, 1, 0, math.pi); c.restore(); c.set_source_rgb(1, .95, .7); c.set_line_width(4); c.stroke()
    arrow(c, 300, 330, 470, 600)
    stroke_text(c, "$2 BILLION", 60, 170, 132, YEL, ow=14)
    stroke_text(c, "ABANDONED", 66, 290, 92, (1, 1, 1), ow=12)

# ------------------------------------------------------------------ C: scale shock
def thumb_c(c, geo):
    R.load_geo(geo)
    c.set_source_rgb(.06, .06, .07); c.paint()
    # map: Ellis County, cream land, roads, ring to scale; ring centre placed at (850, 390), radius ~250 px
    k = math.cos(math.radians(32.40)); sc = 250 / 0.1247
    def pr(lo, la): return 850 + (lo + 96.87) * k * sc, 390 - (la - 32.40) * sc
    c.set_source_rgb(.92, .90, .85); c.paint()
    r = random.Random(5)
    for i in range(40):
        y = r.uniform(0, H); ph = r.uniform(0, 7); amp = r.uniform(8, 26)
        c.move_to(-10, y)
        for x in range(0, W + 20, 16): c.line_to(x, y + amp * math.sin(x / r.uniform(70, 150) + ph))
        c.set_source_rgba(0, 0, 0, .07); c.set_line_width(1); c.stroke()
    for pts in ([(-96.80, 33.05), (-96.82, 32.78), (-96.86, 32.55), (-96.85, 32.39), (-96.95, 32.15), (-97.0, 31.9)],
                [(-97.8, 32.75), (-96.0, 32.77)], [(-97.32, 33.0), (-97.33, 32.75), (-97.1, 32.3), (-97.1, 31.9)]):
        q = [pr(*p) for p in pts]; c.move_to(*q[0]); [c.line_to(*x) for x in q[1:]]
        c.set_source_rgba(.25, .25, .25, .55); c.set_line_width(5); c.stroke()
    for lo, la, lab in ((-96.85, 32.39, "WAXAHACHIE"), (-96.99, 32.48, "MIDLOTHIAN")):
        x, y = pr(lo, la); c.arc(x, y, 9, 0, 2 * math.pi); c.set_source_rgb(.1, .1, .1); c.fill()
        font(c, XB, 24); c.move_to(x + 14, y - 10); c.set_source_rgb(.1, .1, .1); c.show_text(lab)
    # vignette darkening so the ring pops
    g = cairo.RadialGradient(850, 390, 150, 850, 390, 950); g.add_color_stop_rgba(0, 0, 0, 0, 0); g.add_color_stop_rgba(1, 0, 0, 0, .6)
    c.set_source(g); c.paint()
    cx, cy = pr(-96.87, 32.40); Rr = 0.1247 * sc
    c.arc(cx, cy, Rr, 0, 2 * math.pi); c.set_source_rgba(*YEL, .10); c.fill()
    glow_ellipse(c, cx, cy, Rr, Rr, YEL, 9, passes=((34, .08), (20, .14), (11, .3), (6, .8), (3, 1)))
    lr = Rr * 26.7 / 87.1; lx, ly = 250, 520
    c.arc(lx, ly, lr, 0, 2 * math.pi); c.set_source_rgba(.18, .45, .92, .15); c.fill()
    c.arc(lx, ly, lr, 0, 2 * math.pi); c.set_source_rgb(.18, .45, .92); c.set_line_width(10); c.stroke()
    label_box(c, "CERN's LHC", lx, ly + lr + 18, 34, "black", anchor="c")
    label_box(c, "54 MILES", cx, cy + Rr - 34, 46, "yellow", anchor="c")
    stroke_text(c, "3× BIGGER", 40, 140, 128, (1, 1, 1), ow=14)

def finish(surf, out):
    surf.flush()
    a = np.ndarray((H, W, 4), np.uint8, buffer=surf.get_data())
    Image.fromarray(a[..., [2, 1, 0]]).save(out, quality=94)

def main():
    foot, geo, out = sys.argv[1], sys.argv[2], sys.argv[3]
    os.makedirs(out, exist_ok=True)
    for name, fn in (("thumb_A_cross_section", lambda c: thumb_a(c)), ("thumb_B_2_billion", lambda c: thumb_b(c, foot)), ("thumb_C_3x_bigger", lambda c: thumb_c(c, geo))):
        surf = cairo.ImageSurface(cairo.FORMAT_RGB24, W, H); c = cairo.Context(surf)
        fn(c); finish(surf, os.path.join(out, name + ".jpg")); print("wrote", name)

if __name__ == "__main__":
    main()
