"""Microscopic anatomy assets in the same manga-ink style.

    python3 micro.py <out dir>

skin-section, motor-neuron, bone-section are drawn procedurally in 2D.
muscle-hierarchy is built from procedural cylinders and drawn by manga_render.
Each asset is written clean (transparent PNG, for video) and labelled (JPG preview).
Shapes are textbook schematics, simplified for teaching.
"""
import math, os, sys
import numpy as np
import cv2
from scipy.spatial import Voronoi
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from manga_render import Scene, vertex_normals, over, add_glow, stage, save, stripes, smooth_noise

OUT = sys.argv[1] if len(sys.argv) > 1 else "."
W, H, SS = 1920, 1080, 2
INK = (14, 16, 20)
PAPER = (238, 241, 244)
TEAL = (38, 224, 196)
CORAL = (255, 84, 84)
AMBER = (255, 184, 48)
GREY = (150, 156, 166)
rng = np.random.default_rng(11)


class Canvas:
    def __init__(self):
        self.w, self.h = W * SS, H * SS
        self.rgb = np.zeros((self.h, self.w, 3), np.float32)
        self.a = np.zeros((self.h, self.w), np.float32)
        self.glow = np.zeros((self.h, self.w, 3), np.float32)

    def P(self, pts):
        return np.round(np.asarray(pts, np.float32) * SS * 16).astype(np.int32).reshape(-1, 1, 2)

    def _paint(self, mask, color, alpha=1.0):
        m = mask * alpha
        self.rgb = self.rgb * (1 - m[..., None]) + np.array(color, np.float32) * m[..., None]
        self.a = np.maximum(self.a, m)

    def fill(self, pts, color, alpha=1.0):
        m = np.zeros((self.h, self.w), np.float32)
        cv2.fillPoly(m, [self.P(pts)], 1.0, cv2.LINE_AA, shift=4)
        self._paint(m, color, alpha)
        return m

    def mask_of(self, pts):
        m = np.zeros((self.h, self.w), np.float32)
        cv2.fillPoly(m, [self.P(pts)], 1.0, cv2.LINE_AA, shift=4)
        return m

    def line(self, pts, color=INK, width=2.0, alpha=1.0, closed=False, glow=0.0):
        m = np.zeros((self.h, self.w), np.float32)
        cv2.polylines(m, [self.P(pts)], closed, 1.0, max(1, int(round(width * SS))), cv2.LINE_AA, shift=4)
        self._paint(m, color, alpha)
        if glow:
            g = cv2.GaussianBlur(m, (0, 0), 6 * SS)
            self.glow += g[..., None] * np.array(color, np.float32) * glow

    def tapered(self, pts, w0, w1, color=INK, alpha=1.0, glow=0.0):
        pts = np.asarray(pts, np.float32)
        for i in range(len(pts) - 1):
            t = i / max(1, len(pts) - 2)
            self.line(pts[i:i + 2], color, w0 + (w1 - w0) * t, alpha)
        if glow:
            self.line(pts, color, (w0 + w1) / 2, 0.0, glow=glow)

    def ellipse(self, c, ax, ang=0, color=INK, width=2.0, fill=None, alpha=1.0):
        pts = cv2.ellipse2Poly((int(c[0] * 8), int(c[1] * 8)), (int(ax[0] * 8), int(ax[1] * 8)), int(ang), 0, 360, 3)
        pts = pts.astype(np.float32) / 8
        if fill is not None:
            self.fill(pts, fill, alpha)
        if width:
            self.line(pts, color, width, alpha, closed=True)
        return pts

    def hatch(self, mask, angle=45, spacing=7, width=1.0, color=INK, alpha=0.6):
        st = stripes(self.h, self.w, angle, spacing * SS, width * SS)
        self._paint(st * mask, color, alpha)

    def stipple(self, mask, density=0.002, r=1.2, color=INK, alpha=0.8):
        ys, xs = np.nonzero(mask > 0.5)
        if len(xs) == 0:
            return
        n = int(len(xs) * density / SS / SS)
        idx = rng.choice(len(xs), size=min(n, len(xs)), replace=False)
        m = np.zeros((self.h, self.w), np.float32)
        for i in idx:
            cv2.circle(m, (int(xs[i]), int(ys[i])), max(1, int(r * SS)), 1.0, -1, cv2.LINE_AA)
        self._paint(m, color, alpha)

    def text(self, xy, s, size=26, color=(236, 240, 244)):
        from PIL import Image, ImageDraw, ImageFont
        f = ImageFont.truetype("/usr/share/fonts/opentype/inter/Inter-SemiBold.otf", int(size * SS))
        im = Image.new("L", (self.w, self.h), 0)
        ImageDraw.Draw(im).text((xy[0] * SS, (xy[1] - size) * SS), s, font=f, fill=255)
        self._paint(np.asarray(im, np.float32) / 255.0, color, 1.0)

    def result(self):
        rgba = np.dstack([self.rgb, self.a * 255])
        rgba = cv2.resize(rgba, (W, H), interpolation=cv2.INTER_AREA)
        glow = cv2.resize(self.glow, (W, H), interpolation=cv2.INTER_AREA)
        return rgba, glow


def wavy(x0, x1, y, amp, period, phase=0, n=400, jitter=0.0):
    xs = np.linspace(x0, x1, n)
    ys = y + amp * np.sin((xs / period) * 2 * math.pi + phase) + jitter * smooth1d(n)
    return np.stack([xs, ys], 1)


def smooth1d(n, k=25):
    r = rng.standard_normal(n + 2 * k)
    return np.convolve(r, np.ones(k) / k, "same")[k:-k] * 3


def label(cv, tip, text_xy, s):
    from PIL import ImageFont
    f = ImageFont.truetype("/usr/share/fonts/opentype/inter/Inter-SemiBold.otf", 24)
    tw = f.getlength(s)
    x, y = text_xy
    cv.line([tip, (x - 10, y - 9)], (190, 198, 208), 1.6)
    cv.ellipse(tip, (5, 5), 0, (14, 16, 20), 1.5, fill=(236, 240, 244))
    cv.fill([(x - 12, y - 30), (x + tw + 12, y - 30), (x + tw + 12, y + 8), (x - 12, y + 8)], (10, 12, 16), 0.88)
    cv.text(text_xy, s, 24)


def finish(cv, name, labels):
    rgba, glow = cv.result()
    os.makedirs(os.path.join(OUT, "micro"), exist_ok=True)
    os.makedirs(os.path.join(OUT, "previews"), exist_ok=True)
    g = glow.max(axis=2, keepdims=True) / 255.0
    col = np.where(g > 1e-4, glow / np.maximum(g, 1e-4), 0)
    a = rgba[..., 3:4] / 255.0; ga = np.clip(g * 0.55, 0, 1); out_a = a + ga * (1 - a)
    rgb = (rgba[..., :3] * a + col * ga * (1 - a)) / np.maximum(out_a, 1e-4)
    save(os.path.join(OUT, "micro", name + ".png"), np.dstack([rgb, out_a * 255]))
    clean = add_glow(over(stage(W, H), rgba), glow)
    save(os.path.join(OUT, "previews", f"micro-{name}.jpg"), clean)
    lab = Canvas(); lab.rgb[:] = 0
    for tip, txy, s in labels:
        label(lab, tip, txy, s)
    lr, _ = lab.result()
    save(os.path.join(OUT, "previews", f"micro-{name}-labelled.jpg"), over(clean, lr))


# ------------------------------------------------------------------ skin
def skin_section():
    cv = Canvas()
    X0, X1 = 140, 1780
    top = wavy(X0, X1, 300, 5, 210, 0.3, jitter=0.6)
    dej = wavy(X0, X1, 372, 20, 74, 1.0)  # dermo-epidermal junction with papillae
    y_hypo, y_musc = 700, 965
    hypo = wavy(X0, X1, y_hypo, 8, 260, 0.7, jitter=1.0)
    musc = wavy(X0, X1, y_musc, 5, 330, 2.0)
    box = lambda upper, lower: np.vstack([upper, lower[::-1]])
    # layers
    epi = cv.fill(box(top, dej), PAPER)
    der = cv.fill(box(dej, hypo), PAPER)
    hyp = cv.fill(box(hypo, musc), PAPER)
    mus = cv.fill(box(musc, np.array([[X0, 1060], [X1, 1060]])), PAPER)
    # epidermis: basal cell row + flaky stratum corneum
    for x, y in dej[::5]:
        cv.ellipse((x, y - 7), (5, 4), 0, INK, 1.0, fill=(205, 210, 218))
    for k in range(4):
        cv.line(wavy(X0, X1, 304 + k * 6, 4, 210, 0.3 + k * 0.1), INK, 0.8, 0.45)
    cv.hatch(epi, 30, 6, 0.6, INK, 0.18)
    # dermis collagen: short wavy strokes
    for _ in range(420):
        x, y = rng.uniform(X0 + 10, X1 - 10), rng.uniform(410, y_hypo - 20)
        L = rng.uniform(25, 60); a = rng.uniform(-0.4, 0.4)
        xs = np.linspace(0, L, 10)
        pts = np.stack([x + xs * math.cos(a), y + xs * math.sin(a) + 3 * np.sin(xs / 7)], 1)
        cv.line(pts, GREY, 1.0, 0.55)
    # hypodermis: fat lobules
    centers = []
    for _ in range(2500):
        c = (rng.uniform(X0 + 25, X1 - 25), rng.uniform(y_hypo + 30, y_musc - 25)); r = rng.uniform(20, 31)
        if all((c[0] - q[0]) ** 2 + (c[1] - q[1]) ** 2 > (r + q[2] + 3) ** 2 for q in centers):
            centers.append((c[0], c[1], r))
    for x, y, r in centers:
        cv.ellipse((x, y), (r, r * 0.9), rng.uniform(0, 180), INK, 1.4, fill=(250, 236, 205))
        cv.ellipse((x + r * 0.45, y + r * 0.35), (3, 2), 0, INK, 0, fill=INK)
    # muscle at the bottom: fibres
    for k in range(9):
        cv.line(wavy(X0, X1, y_musc + 14 + k * 10, 3, 330, 2.0 + k * 0.05), INK, 0.9, 0.6)
    # vessels: deep and superficial plexus, capillary loops into papillae
    for yy, w in ((675, 3.2), (420, 2.0)):
        cv.line(wavy(X0, X1, yy, 6, 300, 1.3), CORAL, w)
    peaks = [i for i in range(2, len(dej) - 2) if dej[i, 1] < dej[i - 1, 1] and dej[i, 1] <= dej[i + 1, 1]]
    for i in peaks[::2]:
        px, py = dej[i]
        loop = [(px - 6, 420), (px - 5, py + 10), (px, py + 4), (px + 5, py + 10), (px + 6, 420)]
        cv.line(loop, CORAL, 1.4)
    # hair follicles with sebaceous gland and arrector pili
    for fx, tilt in ((470, 0.18), (1180, 0.22), (1560, 0.16)):
        ytop = np.interp(fx, top[:, 0], top[:, 1]); yb = 840
        dx = (yb - ytop) * tilt
        sheath_l = [(fx - 16, ytop), (fx - 16 + dx * 0.5, (ytop + yb) / 2), (fx - 26 + dx, yb - 10)]
        sheath_r = [(fx + 16, ytop), (fx + 16 + dx * 0.5, (ytop + yb) / 2), (fx + 26 + dx, yb - 10)]
        cv.fill(np.vstack([sheath_l, sheath_r[::-1]]), (225, 228, 233))
        cv.line(sheath_l, INK, 2.0); cv.line(sheath_r, INK, 2.0)
        cv.ellipse((fx + dx, yb), (32, 28), 0, INK, 2.0, fill=(215, 219, 226))  # bulb
        cv.ellipse((fx + dx, yb + 6), (13, 11), 0, CORAL, 1.6, fill=(255, 205, 205))  # papilla with capillaries
        shaft = [(fx + dx, yb - 18), (fx + dx * 0.5, (ytop + yb) / 2), (fx, ytop), (fx - 10, ytop - 70), (fx - 38, ytop - 150),
                 (fx - 80, ytop - 205)]
        cv.tapered(shaft, 9, 4, INK)
        cv.tapered(shaft[2:], 5, 2, (205, 210, 218))
        gx, gy = fx + dx * 0.28 + 40, ytop + 125  # sebaceous gland
        for k in range(4):
            cv.ellipse((gx + 12 * (k % 2), gy + k * 14), (24, 13), 20, INK, 1.4, fill=AMBER, alpha=0.9)
        cv.line([(fx + dx * 0.55 - 14, (ytop + yb) / 2 + 30), (fx - 90, dej[:, 1].min() + 40)], CORAL, 6)  # arrector pili
    # sweat gland: coil in deep dermis, duct to a pore
    sx, sy = 860, 745
    t = np.linspace(0, 14 * math.pi, 600)
    coil = np.stack([sx + 34 * np.cos(t) + 6 * np.sin(3 * t), sy + 20 * np.sin(t) + (t / t.max()) * 24 - 12], 1)
    cv.line(coil, INK, 3.4); cv.line(coil, (210, 226, 236), 1.4)
    yy = np.linspace(sy - 30, 300, 120)
    duct = np.stack([sx + 10 * np.sin((yy - 300) / 18), yy], 1)
    cv.line(duct, INK, 3.0); cv.line(duct, (210, 226, 236), 1.2)
    # nerves: deep trunk, free endings into epidermis, Meissner in papillae, Pacinian in fat
    nerve = wavy(X0, X1, 640, 10, 420, 0.4)
    cv.line(nerve, TEAL, 3.0, glow=0.7)
    for i in peaks[1::4]:
        px, py = dej[i]
        x0 = px + rng.uniform(-40, 40)
        path = [(x0, 640 + 10 * math.sin((x0 / 420) * 2 * math.pi + 0.4)), (px + 10, 520), (px, py + 22)]
        cv.line(path, TEAL, 1.5, glow=0.6)
        cv.ellipse((px, py + 14), (6, 11), 0, TEAL, 1.4, fill=(200, 245, 238))  # Meissner corpuscle
        cv.line([(px, py + 4), (px + 4, 330), (px - 3, 312)], TEAL, 1.0, glow=0.5)  # free ending
    pc = (1330, 865)
    for r in range(6, 44, 6):
        cv.ellipse(pc, (r * 1.5, r), -8, TEAL, 1.3, fill=None)
    cv.line([(1290, 640 + 10 * math.sin((1290 / 420) * 2 * math.pi + 0.4)), (1305, 760), (pc[0] - 60, pc[1])], TEAL, 2.0, glow=0.6)
    cv.glow += cv2.GaussianBlur(cv.mask_of(cv.ellipse(pc, (66, 44), -8, TEAL, 0)), (0, 0), 14 * SS)[..., None] * np.array(TEAL) * 0.6
    # cut-face border
    for xx in (X0, X1):
        cv.line([(xx, 300), (xx, 1060)], INK, 3.0)
    cv.line(top, INK, 3.0); cv.line(dej, INK, 1.8); cv.line(hypo, INK, 1.6, 0.7); cv.line(musc, INK, 1.8)
    finish(cv, "skin-section", [
        ((300, 304), (210, 190), "Epidermis"), ((300, 520), (180, 470), "Dermis"), ((260, 820), (180, 790), "Fat (hypodermis)"),
        ((300, 1010), (180, 1045), "Muscle"), ((1220, 600), (1320, 520), "Hair follicle"), ((1230, 430), (1330, 400), "Oil gland"),
        ((860, 745), (930, 820), "Sweat gland"), ((1330, 865), (1420, 940), "Pressure sensor"), ((600, 640), (560, 600), "Nerve"),
        ((1000, 675), (1000, 735), "Blood vessels"), ((1110, 360), (1060, 250), "Touch sensor")])


# ------------------------------------------------------------------ motor neuron
def branch(cv, p, ang, length, w, depth, color, glow):
    if depth == 0 or length < 8:
        return
    n = 6
    pts = [p]
    a = ang
    for k in range(n):
        a += rng.uniform(-0.25, 0.25)
        pts.append((pts[-1][0] + math.cos(a) * length / n, pts[-1][1] + math.sin(a) * length / n))
    cv.tapered(pts, w + 3, w * 0.6 + 3, INK)
    cv.tapered(pts, w, w * 0.6, PAPER)
    if glow:
        cv.line(pts, color, w * 0.7, 0.0, glow=glow)
    end = pts[-1]
    for s in (-1, 1):
        branch(cv, end, a + s * rng.uniform(0.35, 0.7), length * rng.uniform(0.55, 0.75), w * 0.62, depth - 1, color, glow)


def motor_neuron():
    cv = Canvas()
    soma = (360, 540)
    for k in range(8):
        ang = math.pi * (0.5 + 1.0 * k / 7) + rng.uniform(-0.12, 0.12)
        start = (soma[0] + 90 * math.cos(ang), soma[1] + 80 * math.sin(ang))
        branch(cv, start, ang, rng.uniform(120, 170), 12, 4, INK, 0)
    blob = cv.ellipse(soma, (110, 94), 10, INK, 3.4, fill=PAPER)
    cv.stipple(cv.mask_of(blob), 0.02, 1.4, INK, 0.5)  # Nissl bodies
    cv.ellipse((soma[0] - 8, soma[1] - 4), (42, 36), 0, INK, 2.6, fill=(212, 218, 226))  # nucleus
    cv.ellipse((soma[0] - 2, soma[1] - 10), (12, 12), 0, INK, 0, fill=INK)  # nucleolus
    # axon: hillock then myelinated segments to the right
    xs = np.linspace(470, 1460, 600)
    ys = 540 + 70 * np.sin((xs - 470) / 990 * math.pi * 1.2) - (xs - 470) * 0.06
    axon = np.stack([xs, ys], 1)
    cv.tapered([(soma[0] + 100, soma[1] + 5), (475, 544), axon[3]], 22, 10, INK)
    cv.tapered([(soma[0] + 100, soma[1] + 5), (475, 544), axon[3]], 16, 6, PAPER)
    cv.line(axon, TEAL, 6, glow=0.9)
    seg_len, gap = 112, 14
    cum = np.concatenate([[0], np.cumsum(np.linalg.norm(np.diff(axon, axis=0), axis=1))])
    s = 40.0
    k = 0
    while s + seg_len < cum[-1] - 20:
        i0, i1 = np.searchsorted(cum, s), np.searchsorted(cum, s + seg_len)
        seg = axon[i0:i1]
        d = seg[-1] - seg[0]; ang = math.degrees(math.atan2(d[1], d[0]))
        c = seg.mean(0)
        cv.ellipse(c, (seg_len / 2, 24), ang, INK, 2.6, fill=PAPER)
        cv.hatch(cv.mask_of(cv.ellipse(c, (seg_len / 2 - 4, 19), ang, INK, 0)), ang + 90, 7, 0.8, INK, 0.25)
        cv.line(seg[len(seg) // 5: -len(seg) // 5], TEAL, 3, 0.9)
        if k % 2 == 0:
            cv.ellipse((c[0] + 10, c[1] - 9), (16, 6), ang, INK, 1.4, fill=(212, 218, 226))  # Schwann cell nucleus
        s += seg_len + gap; k += 1
    # muscle fibres and synaptic endings
    for j, fy in enumerate((330, 500, 670, 840)):
        x0, x1 = 1520, 1840
        r = 48
        cv.fill([(x0, fy - r), (x1, fy - r), (x1, fy + r), (x0, fy + r)], PAPER)
        for xx in np.arange(x0 + 8, x1, 13):
            cv.line([(xx, fy - r + 3), (xx, fy + r - 3)], INK, 1.2 if (xx // 13) % 3 else 2.2, 0.55)  # striations
        cv.ellipse((x0, fy), (14, r), 0, INK, 2.4, fill=(225, 229, 235))
        cv.line([(x0, fy - r), (x1, fy - r)], INK, 2.4); cv.line([(x0, fy + r), (x1, fy + r)], INK, 2.4)
        cv.ellipse((x0 + 60 + j * 30, fy - 12), (9, 5), 0, INK, 1.2, fill=(200, 206, 214))  # fibre nucleus
    end = axon[-1]
    for j, fy in enumerate((330, 500, 670, 840)):
        tgt = (1640 + j * 25, fy - 48)
        path = [end, ((end[0] + tgt[0]) / 2, (end[1] + tgt[1]) / 2 + rng.uniform(-30, 30)), tgt]
        cv.line(path, TEAL, 3.0, glow=0.8)
        for b in (-14, 0, 14):
            cv.ellipse((tgt[0] + b, tgt[1] + 2), (8, 6), 0, TEAL, 1.6, fill=(200, 245, 238))
        cv.glow += cv2.GaussianBlur(cv.mask_of(cv.ellipse(tgt, (30, 14), 0, TEAL, 0)), (0, 0), 10 * SS)[..., None] * np.array(TEAL) * 0.9
    finish(cv, "motor-neuron", [
        ((400, 600), (300, 760), "Cell body"), ((352, 536), (420, 330), "Nucleus"), ((200, 360), (90, 200), "Dendrites"),
        ((800, 570), (720, 700), "Axon with myelin"), ((1140, 505), (1100, 420), "Node"), ((1640, 282), (1500, 230), "Nerve ending"),
        ((1760, 840), (1620, 960), "Muscle fibres")])


# ------------------------------------------------------------------ bone
def bone_section():
    cv = Canvas()
    c = np.array([700, 540.0]); R, r_cort = 330, 250
    # shaft running back to the right
    back = c + np.array([820, -210])
    top_l, bot_l = c + [0, -R], c + [0, R]
    shaft = np.array([top_l, back + [0, -R * 0.92], back + [0, R * 0.92], bot_l])
    sm = cv.fill(shaft, PAPER)
    cv.hatch(sm, 100, 7, 1.0, INK, 0.35)
    cv.hatch(sm * (np.mgrid[0:cv.h, 0:cv.w][0] > (c[1] + 60) * SS), 10, 7, 1.0, INK, 0.35)
    cv.line([top_l, back + [0, -R * 0.92]], INK, 3.2); cv.line([bot_l, back + [0, R * 0.92]], INK, 3.2)
    cv.ellipse(back, (R * 0.25, R * 0.92), 0, INK, 2.4, fill=None)
    # periosteum (outer membrane) with vessel and nerve on the surface
    face = cv.ellipse(c, (R * 0.62, R), 0, INK, 3.4, fill=(232, 228, 216))
    cv.line(np.stack([np.linspace(c[0] + 40, back[0], 50), np.linspace(c[1] - R + 6, back[1] - R * 0.92 + 6, 50) +
                      6 * np.sin(np.linspace(0, 12, 50))], 1), CORAL, 3)
    cv.line(np.stack([np.linspace(c[0] + 60, back[0], 50), np.linspace(c[1] - R + 22, back[1] - R * 0.92 + 22, 50) +
                      5 * np.sin(np.linspace(1, 14, 50))], 1), TEAL, 2.2, glow=0.5)
    # compact bone ring filled with osteons
    inner = cv.ellipse(c, (R * 0.62 * r_cort / R, r_cort), 0, INK, 2.0, fill=PAPER)
    for _ in range(140):
        t = rng.uniform(0, 2 * math.pi); rr = rng.uniform(r_cort + 18, R - 16)
        p = c + np.array([math.cos(t) * rr * 0.62, math.sin(t) * rr])
        s = rng.uniform(13, 17)
        for k in range(4, 0, -1):
            cv.ellipse(p, (s * k / 4 * 0.75, s * k / 4), 0, INK, 0.9, alpha=0.7)
        cv.ellipse(p, (2.5, 3), 0, INK, 0, fill=CORAL)
    # spongy bone: trabecular network with marrow spaces
    pts = np.stack([rng.uniform(-1, 1, 260), rng.uniform(-1, 1, 260)], 1)
    vor = Voronoi(pts)
    spong = cv.mask_of(cv.ellipse(c, (R * 0.62 * r_cort / R, r_cort), 0, INK, 0))
    hole = cv.mask_of(cv.ellipse(c + [6, 10], (R * 0.62 * 0.42, R * 0.42), 0, INK, 0))
    cv._paint(spong * (1 - hole), (255, 214, 140), 0.75)  # red marrow area tinted amber-warm
    tm = np.zeros((cv.h, cv.w), np.float32)
    for (i, j) in vor.ridge_vertices:
        if i < 0 or j < 0:
            continue
        a, b = vor.vertices[i], vor.vertices[j]
        if np.abs(a).max() > 1.2 or np.abs(b).max() > 1.2:
            continue
        A = c + a * [R * 0.62 * r_cort / R, r_cort]; B = c + b * [R * 0.62 * r_cort / R, r_cort]
        cv2.line(tm, tuple(int(v * SS) for v in A), tuple(int(v * SS) for v in B), 1.0, int(5 * SS), cv2.LINE_AA)
    tm = tm * spong * (1 - hole)
    cv._paint(tm, PAPER, 1.0)
    edges = cv2.Canny((tm * 255).astype(np.uint8), 50, 150).astype(np.float32) / 255
    cv._paint(cv2.dilate(edges, np.ones((2, 2), np.uint8)), INK, 0.9)
    # medullary cavity with yellow marrow
    cav = cv.ellipse(c + [6, 10], (R * 0.62 * 0.42, R * 0.42), 0, INK, 2.4, fill=(255, 226, 160))
    cv.stipple(cv.mask_of(cav), 0.01, 2.0, (200, 140, 40), 0.7)
    # osteon inset
    oc = np.array([1600, 300.0]); orad = 170
    cv.ellipse(oc, (orad, orad), 0, INK, 3.0, fill=PAPER)
    for k in range(1, 9):
        cv.ellipse(oc, (orad * k / 9, orad * k / 9), 0, INK, 1.4, alpha=0.8)
    cv.ellipse(oc, (orad * 0.11, orad * 0.11), 0, INK, 2.0, fill=CORAL)
    for _ in range(26):
        t = rng.uniform(0, 2 * math.pi); rr = rng.uniform(0.25, 0.9) * orad
        p = oc + [math.cos(t) * rr, math.sin(t) * rr]
        cv.ellipse(p, (6, 3), math.degrees(t) + 90, INK, 0, fill=INK)  # osteocyte
        for s in (-1, 1):
            cv.line([p, p + [math.cos(t + s * 0.4) * 16, math.sin(t + s * 0.4) * 16]], INK, 0.8, 0.8)
    cv.line([c + [R * 0.55, -R * 0.55], oc + [-orad * 0.92, orad * 0.35]], (190, 198, 208), 1.6)
    finish(cv, "bone-section", [
        ((700, 220), (560, 160), "Periosteum"), ((560, 340), (300, 280), "Compact bone"), ((640, 450), (300, 470), "Spongy bone"),
        ((706, 560), (330, 640), "Marrow cavity"), ((1600, 300), (1480, 520), "Osteon (zoomed)"), ((1000, 360), (1000, 300), "Vessel and nerve")])


# ------------------------------------------------------------------ muscle hierarchy (3D cylinders)
def cylinder(x0, x1, cy, cz, r, n=40):
    t = np.linspace(0, 2 * math.pi, n, endpoint=False)
    ring = np.stack([np.zeros(n), cy + r * np.cos(t), cz + r * np.sin(t)], 1)
    V = np.vstack([ring + [x0, 0, 0], ring + [x1, 0, 0], [[x0, cy, cz], [x1, cy, cz]]]).astype(np.float32)
    F = []
    for i in range(n):
        j = (i + 1) % n
        F += [[i, j, n + i], [j, n + j, n + i], [2 * n, j, i], [2 * n + 1, n + i, n + j]]
    return V, np.array(F, np.int32)


def packed(r_out, r_in, k, seed):
    g = np.random.default_rng(seed); pts = []
    for _ in range(4000):
        a, d = g.uniform(0, 2 * math.pi), math.sqrt(g.uniform(0, 1)) * (r_out - r_in)
        p = (d * math.cos(a), d * math.sin(a))
        if all((p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 > (2 * r_in + 2) ** 2 for q in pts):
            pts.append(p)
        if len(pts) >= k:
            break
    return pts


def muscle_hierarchy():
    Vs, Fs, P, parts = [], [], [], []
    off = 0

    def add(V, F, layer, name):
        nonlocal off
        pid = len(parts); parts.append({"id": pid, "layer": layer, "name": name})
        Vs.append(V); Fs.append(F + off); P.append(np.full(len(F), pid, np.int32)); off += len(V)

    add(*cylinder(-1250, -620, 0, 0, 300, 72), "muscle", "whole muscle")
    fas = packed(285, 62, 14, 3)
    for k, (y, z) in enumerate(fas):
        x1 = -480 + (240 if k == 0 else (70 if k % 3 == 0 else 0))
        add(*cylinder(-620, x1, y, z, 62, 32), "muscle", "fascicle" if k else "fascicle pulled")
    fy, fz = fas[0]
    fib = packed(58, 17, 8, 5)
    for k, (y, z) in enumerate(fib):
        x1 = -240 + (330 if k == 0 else (60 if k % 2 else 0))
        add(*cylinder(-240 - 1, x1, fy + y, fz + z, 17, 24), "muscle", "fibre" if k else "fibre pulled")
    by, bz = fy + fib[0][0], fz + fib[0][1]
    for k, (y, z) in enumerate(packed(16, 5.0, 7, 8)):
        add(*cylinder(90, 300 + (160 if k == 0 else (60 if k % 2 else 0)), by + y, bz + z, 5.0, 14), "muscle", "myofibril")
    V = np.vstack(Vs); F = np.vstack(Fs); PID = np.concatenate(P)
    sc = Scene.__new__(Scene)
    sc.V, sc.F, sc.PID, sc.parts = V, F, PID, parts
    sc.layer = np.array([p["layer"] for p in parts]); sc.names = [p["name"] for p in parts]
    sc.VN = vertex_normals(V, F); sc.center = (V.min(0) + V.max(0)) / 2
    hl = [([p["id"] for p in parts if p["name"] == "fascicle pulled"], "coral"),
          ([p["id"] for p in parts if p["name"] == "fibre pulled"], "coral"),
          ([p["id"] for p in parts if p["name"] == "myofibril"], "teal")]
    rgba, glow, _ = sc.draw(["muscle"], W, H, yaw=-34.0, view=(-260, 0, 980), ss=SS, highlight=hl)
    os.makedirs(os.path.join(OUT, "micro"), exist_ok=True)
    os.makedirs(os.path.join(OUT, "previews"), exist_ok=True)
    save(os.path.join(OUT, "micro", "muscle-hierarchy.png"), rgba)
    clean = add_glow(over(stage(W, H), rgba), glow)
    save(os.path.join(OUT, "previews", "micro-muscle-hierarchy.jpg"), clean)
    lab = Canvas()
    for tip, txy, s in [((300, 560), (160, 930), "Muscle"), ((820, 400), (760, 930), "Fascicle"), ((1180, 470), (1120, 930), "Fibre"),
                        ((1560, 470), (1480, 930), "Myofibrils")]:
        label(lab, tip, txy, s)
    lr, _ = lab.result()
    save(os.path.join(OUT, "previews", "micro-muscle-hierarchy-labelled.jpg"), over(clean, lr))


if __name__ == "__main__":
    which = sys.argv[2:] or ["skin", "neuron", "bone", "muscle"]
    if "skin" in which: skin_section(); print("skin-section", flush=True)
    if "neuron" in which: motor_neuron(); print("motor-neuron", flush=True)
    if "bone" in which: bone_section(); print("bone-section", flush=True)
    if "muscle" in which: muscle_hierarchy(); print("muscle-hierarchy", flush=True)
