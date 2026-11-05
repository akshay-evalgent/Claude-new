"""LANTERN: a paper-cut lightbox engine in 2D (skia).

Grammar follows the "Paper-cut Lightbox" style (lemo-opuscar, MIT): flat cut
sheets stacked in depth, back layers light and translucent, front layers
dark; a warm light glowing through the paper; a rim of light on each sheet's
top edge, a dark band on its bottom edge and a soft cast shadow on the sheet
behind; holes (windows, tally slits) burn and bloom. Figures are jointed
silhouettes that only rotate at their joints.

Coordinates: every sheet is drawn in a 1920x1080 design plane as seen from
the default camera. A sheet has a depth z (0 = front, larger = farther). The
camera has a pan (px, py) in front-plane design pixels and a distance D
(default 1.0): moving D or the pan gives real parallax between sheets.
"""
import math
import os
from functools import lru_cache

import numpy as np
import skia

HERE = os.path.dirname(os.path.abspath(__file__))
DW, DH = 1920.0, 1080.0
D0 = 1.0

# ----------------------------------------------------------------- utilities

def clamp(x, a=0.0, b=1.0):
    return a if x < a else b if x > b else x


def lerp(a, b, u):
    return a + (b - a) * u


def smooth(u):
    u = clamp(u)
    return u * u * (3 - 2 * u)


def ramp(t, t0, t1):
    if t1 <= t0:
        return 1.0 if t >= t0 else 0.0
    return smooth((t - t0) / (t1 - t0))


def ease_out(u):
    u = clamp(u)
    return 1 - (1 - u) ** 3


def ease_in(u):
    u = clamp(u)
    return u ** 3


def hexc(h):
    h = h.lstrip('#')
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16))


def mixc(a, b, u):
    a = hexc(a) if isinstance(a, str) else a
    b = hexc(b) if isinstance(b, str) else b
    u = clamp(u)
    return (a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u)


def scalec(c, k):
    c = hexc(c) if isinstance(c, str) else c
    return (min(255, c[0] * k), min(255, c[1] * k), min(255, c[2] * k))


def argb(c, a=1.0):
    c = hexc(c) if isinstance(c, str) else c
    return skia.ColorSetARGB(int(clamp(a) * 255), int(clamp(c[0], 0, 255)), int(clamp(c[1], 0, 255)), int(clamp(c[2], 0, 255)))


def flicker(T, seed=0.0, amt=1.0):
    return 1 + amt * (0.05 * math.sin(7.3 * T + seed) * math.sin(3.1 * T + 2 * seed)
                      + 0.03 * math.sin(17.9 * T + 3 * seed) + 0.02 * math.sin(31.7 * T + seed))


def rng(seed):
    return np.random.default_rng(abs(int(seed)) % (2 ** 32))


# ----------------------------------------------------------------- fonts

FONT_DIR = os.path.join(HERE, 'fonts')
_TF = {}


def typeface(name, wght=None, wdth=None):
    key = (name, wght, wdth)
    if key in _TF:
        return _TF[key]
    files = {'serif': 'CormorantGaramond-wght.ttf', 'sans': 'SourceSans3-wght.ttf', 'display': 'Archivo-wdth-wght.ttf', 'play': 'PlayfairDisplay-wght.ttf'}
    tf = skia.Typeface.MakeFromFile(os.path.join(FONT_DIR, files[name]))
    coords = []
    if wght is not None:
        coords.append(skia.FontArguments.VariationPosition.Coordinate(0x77676874, float(wght)))
    if wdth is not None:
        coords.append(skia.FontArguments.VariationPosition.Coordinate(0x77647468, float(wdth)))
    if coords:
        vp = skia.FontArguments.VariationPosition(skia.FontArguments.VariationPosition.Coordinates(coords))
        args = skia.FontArguments()
        args.setVariationDesignPosition(vp)
        tf = tf.makeClone(args)
    _TF[key] = tf
    return tf


def font(name, size, wght=None, wdth=None):
    f = skia.Font(typeface(name, wght, wdth), size)
    f.setEdging(skia.Font.Edging.kAntiAlias)
    f.setSubpixel(True)
    return f


def text_path(s, f, x, y, align='center', tracking=0.0):
    """Glyph outlines as a path (so text can be a cut in paper)."""
    p = skia.Path()
    if tracking == 0:
        _g = [_lining_map(f.getTypeface()).get(g, g) for g in f.textToGlyphs(s)]
        w = sum(f.getWidths(_g))
        x0 = x - w / 2 if align == 'center' else x - w if align == 'right' else x
        glyph_path(p, s, f, x0, y)
        return p, w
    widths = [sum(f.getWidths([_lining_map(f.getTypeface()).get(g, g) for g in f.textToGlyphs(ch)])) for ch in s]
    w = sum(widths) + tracking * (len(s) - 1)
    x0 = x - w / 2 if align == 'center' else x - w if align == 'right' else x
    cx = x0
    for ch, cw in zip(s, widths):
        glyph_path(p, ch, f, cx, y)
        cx += cw + tracking
    return p, w


_LNUM = {}


def _lining_map(tf):
    """Glyph-id map from old-style to lining figures (OpenType lnum), per typeface file."""
    key = tf.getFamilyName()
    if key in _LNUM:
        return _LNUM[key]
    mp = {}
    try:
        from fontTools.ttLib import TTFont
        files = {'Playfair Display': 'PlayfairDisplay-wght.ttf', 'Cormorant Garamond': 'CormorantGaramond-wght.ttf'}
        if key in files:
            ft = TTFont(os.path.join(FONT_DIR, files[key]))
            order = ft.getGlyphOrder()
            gid = {n: i for i, n in enumerate(order)}
            cmap = ft.getBestCmap()
            gsub = ft['GSUB'].table
            subs = {}
            for fr in gsub.FeatureList.FeatureRecord:
                if fr.FeatureTag == 'lnum':
                    for li in fr.Feature.LookupListIndex:
                        for st in gsub.LookupList.Lookup[li].SubTable:
                            subs.update(getattr(st, 'mapping', {}) or {})
            for ch in '0123456789':
                g = cmap.get(ord(ch))
                if g in subs:
                    mp[gid[g]] = gid[subs[g]]
    except Exception:
        mp = {}
    _LNUM[key] = mp
    return mp


def glyph_path(p, s, f, x, y):
    glyphs = list(f.textToGlyphs(s))
    mp = _lining_map(f.getTypeface())
    if mp:
        glyphs = [mp.get(g, g) for g in glyphs]
    widths = f.getWidths(glyphs)
    cx = x
    for g, w in zip(glyphs, widths):
        gp = f.getPath(g)
        if gp is not None:
            gp.offset(cx, y)
            p.addPath(gp)
        cx += w


# ----------------------------------------------------------------- paper texture

def _paper_texture(n=512, seed=7):
    r = rng(seed)
    f = np.fft.fftfreq(n)
    fx, fy = np.meshgrid(f, f)
    rad = np.sqrt(fx ** 2 + fy ** 2) + 1e-3
    cloud = np.real(np.fft.ifft2(np.fft.fft2(r.standard_normal((n, n))) / rad ** 1.6))
    cloud = (cloud - cloud.min()) / (np.ptp(cloud) + 1e-9)
    fib = r.standard_normal((n, n))
    k = np.ones(9) / 9
    fib = np.apply_along_axis(lambda row: np.convolve(np.concatenate([row[-8:], row]), k, 'valid')[: n], 1, fib)
    fib = (fib - fib.mean()) / (fib.std() + 1e-9)
    speck = r.standard_normal((n, n))
    v = 0.86 + 0.11 * cloud + 0.018 * fib + 0.012 * speck
    v = np.clip(v, 0, 1)
    g = (v * 255).astype(np.uint8)
    rgba = np.dstack([g, g, g, np.full_like(g, 255)])
    return skia.Image.fromarray(rgba, colorType=skia.ColorType.kRGBA_8888_ColorType)


PAPER = _paper_texture()

# ----------------------------------------------------------------- scene model


class Light:
    __slots__ = ('x', 'y', 'z', 'r', 'inten', 'col', 'halo', 'reach')

    def __init__(self, x, y, z, r, inten=1.0, col='#ffb45c', halo=0.0, reach=9.0):
        self.x, self.y, self.z, self.r, self.inten, self.col, self.halo, self.reach = x, y, z, r, inten, col, halo, reach


class Item:
    __slots__ = ('z', 'path', 'col', 'trans', 'shadow', 'rim', 'soft', 'emits', 'tex', 'alpha', 'shader', 'band', 'order')

    def __init__(self, z, path, col, trans=0.3, shadow=True, rim=True, soft=0.0, tex=True, alpha=1.0, shader=None, band=True):
        self.z, self.path, self.col, self.trans = z, path, col, trans
        self.shadow, self.rim, self.soft, self.tex, self.alpha = shadow, rim, soft, tex, alpha
        self.shader, self.band = shader, band
        self.emits = []
        self.order = 0

    def emit(self, path, col, a=1.0, bloom=0.6, sigma=14.0, shader=None):
        self.emits.append((path, col, a, bloom, sigma, shader))
        return self


class Cam:
    def __init__(self, px=0.0, py=0.0, D=1.0, drift=1.0):
        self.px, self.py, self.D, self.drift = px, py, D, drift


class Scene:
    def __init__(self, T=0.0):
        self.T = T
        self.items = []
        self.lights = []
        self.cam = Cam()
        self.overlays = []      # callables (canvas, W, H, fmt) in screen space
        self.box = None         # dict for box framing (pull out to the lamp)
        self.vig = 0.55
        self.exposure = 1.0
        self.bloom = 1.0
        self.paper = 1.0
        self.fade = 0.0         # 0..1 to black
        self.vfocus = None      # design x the vertical crop centres on (None = cam centre)
        self.vfocus_y = None
        self.vzoom = 1.0
        self.fmt = 'h'
        self.bg = '#03050a'
        self._n = 0

    def add(self, z, path, col, **kw):
        it = Item(z, path, col, **kw)
        it.order = self._n
        self._n += 1
        self.items.append(it)
        return it

    def light(self, x, y, z, r, inten=1.0, col='#ffb45c', halo=0.0, reach=9.0):
        L = Light(x, y, z, r, inten, col, halo, reach)
        self.lights.append(L)
        return L

    def overlay(self, fn):
        self.overlays.append(fn)


# ----------------------------------------------------------------- render


def layer_matrix(cam, z, W, H, s0, T):
    dx = cam.drift * (1.1 * math.sin(0.71 * T) + 0.6 * math.sin(1.37 * T + 1.3))
    dy = cam.drift * (0.8 * math.sin(0.53 * T + 0.4) + 0.5 * math.sin(1.11 * T + 2.1))
    r = (D0 + z) / (cam.D + z)
    shift = D0 / (cam.D + z)
    m = skia.Matrix.Translate(W / 2, H / 2)
    m.preScale(s0, s0)
    m.preTranslate(-(cam.px + dx) * shift, -(cam.py + dy) * shift)
    m.preScale(r, r)
    m.preTranslate(-DW / 2, -DH / 2)
    return m


def _gauss_stops(col, a):
    c = hexc(col) if isinstance(col, str) else col
    stops = [1.0, 0.8, 0.52, 0.27, 0.11, 0.03, 0.0]
    pos = [0.0, 0.15, 0.32, 0.5, 0.68, 0.85, 1.0]
    return [argb(c, a * s) for s in stops], pos


def radial(cx, cy, r, col, a):
    cols, pos = _gauss_stops(col, a)
    return skia.GradientShader.MakeRadial(skia.Point(cx, cy), max(r, 1.0), cols, pos)


_PAINTS = {}


def paint(col=None, a=1.0, blur=0.0, blend=None, shader=None, stroke=0.0):
    p = skia.Paint(AntiAlias=True)
    if col is not None:
        p.setColor(argb(col, a))
    if blur > 0:
        p.setMaskFilter(skia.MaskFilter.MakeBlur(skia.kNormal_BlurStyle, blur))
    if blend is not None:
        p.setBlendMode(blend)
    if shader is not None:
        p.setShader(shader)
        p.setAlphaf(clamp(a))
    if stroke > 0:
        p.setStyle(skia.Paint.kStroke_Style)
        p.setStrokeWidth(stroke)
        p.setStrokeCap(skia.Paint.kRound_Cap)
        p.setStrokeJoin(skia.Paint.kRound_Join)
    return p


def render(scene, canvas, W, H, fmt='h'):
    """Draw a Scene. fmt 'h' = 16:9 full frame, 'v' = 9:16 crop with taller world."""
    c = canvas
    T = scene.T
    cam = scene.cam
    if fmt == 'v':
        s0 = H / 1350.0
        if scene.vfocus is not None:
            py = cam.py if scene.vfocus_y is None else 1.3 * (scene.vfocus_y - DH / 2)
            cam = Cam(1.3 * (scene.vfocus - DW / 2), py, cam.D * scene.vzoom, cam.drift)
    else:
        s0 = W / DW
    c.clear(argb(scene.bg))
    mats = {}

    def M(z):
        if z not in mats:
            mats[z] = layer_matrix(cam, z, W, H, s0, T)
        return mats[z]

    # screen-space lights
    sl = []
    for L in scene.lights:
        m = M(L.z)
        p = m.mapXY(L.x, L.y)
        sl.append((p.x(), p.y(), L.r * m.getScaleX(), L.inten, L.col, L.halo, L.z, L.reach))

    blooms = []
    box_clip = None
    if scene.box is not None:
        box_clip = scene.box['draw_room'](c, M, W, H, scene)
    items = sorted(scene.items, key=lambda it: (-it.z, it.order))
    for it in items:
        if it.alpha <= 0.002:
            continue
        m = M(it.z)
        sc = m.getScaleX()
        c.save()
        if box_clip is not None and it.z >= 0:
            c.clipPath(box_clip, skia.ClipOp.kIntersect, True)
        c.setMatrix(m)
        a = it.alpha
        need_layer = a < 0.999
        if need_layer:
            c.saveLayerAlpha(None, int(a * 255))
        if it.shadow:
            c.save()
            c.translate(5.0, 9.0)
            c.drawPath(it.path, paint('#000000', 0.5, blur=7.0))
            c.restore()
        if it.band:
            c.save()
            c.translate(0, 3.2)
            c.drawPath(it.path, paint(scalec(it.col, 0.45), 1.0))
            c.restore()
        if it.rim:
            # rim colour leans warm when a warm light is near the sheet
            rc = scalec(mixc(it.col, '#ffe2b0', 0.55), 1.35)
            c.save()
            c.translate(0, -2.2)
            c.drawPath(it.path, paint(rc, 0.85))
            c.restore()
        if it.shader is not None:
            c.drawPath(it.path, paint(None, 1.0, blur=it.soft, shader=it.shader(m)))
        else:
            c.drawPath(it.path, paint(it.col, 1.0, blur=it.soft))
        # light through the paper and the paper's own mottle
        if it.trans > 0 and sl:
            c.save()
            c.clipPath(it.path, skia.ClipOp.kIntersect, True)
            c.resetMatrix()
            for (lx, ly, lr, li, lc, _h, lz, lreach) in sl:
                if li <= 0.003:
                    continue
                k_ = 1.0 - clamp(abs(it.z - lz) / lreach) ** 2 if lreach < 9 else 1.0
                if k_ <= 0.01:
                    continue
                gc = mixc(lc, scalec(it.col, 2.2), 0.3)
                c.drawRect(skia.Rect.MakeLTRB(lx - lr, ly - lr, lx + lr, ly + lr),
                           paint(None, 1.0, blend=skia.BlendMode.kPlus, shader=radial(lx, ly, lr, gc, clamp(it.trans * li * k_))))
            c.restore()
        # holes / emissive cut-outs
        for (ep, ecol, ea, eb, es, esh) in it.emits:
            if ea <= 0.003:
                continue
            if esh is not None:
                c.drawPath(ep, paint(None, ea, shader=esh(m)))
            else:
                c.drawPath(ep, paint(ecol, ea))
            if eb > 0:
                ba = clamp(ea * eb * 0.9)
                if esh is not None:
                    c.drawPath(ep, paint(None, ba, blur=es, blend=skia.BlendMode.kPlus, shader=esh(m)))
                else:
                    c.drawPath(ep, paint(ecol, ba, blur=es, blend=skia.BlendMode.kPlus))
        if need_layer:
            c.restore()
        c.restore()

    # paper grain and pulp mottle, carried by the mid-depth sheet so it travels with the stack
    if scene.paper > 0:
        c.save()
        if box_clip is not None:
            c.clipPath(box_clip, skia.ClipOp.kIntersect, True)
        c.setMatrix(M(0.35))
        sh = PAPER.makeShader(skia.TileMode.kRepeat, skia.TileMode.kRepeat, skia.SamplingOptions(skia.FilterMode.kLinear), skia.Matrix())
        p_ = paint(None, scene.paper, blend=skia.BlendMode.kMultiply, shader=sh)
        c.drawRect(skia.Rect.MakeLTRB(-3000, -2000, 5000, 3000), p_)
        c.restore()
    # bloom: emissive holes bleed light over the sheets in front, like a lens
    for (m, ep, ecol, ba, bs, esh, bz) in blooms:
        c.save()
        if box_clip is not None and bz >= 0:
            c.clipPath(box_clip, skia.ClipOp.kIntersect, True)
        c.setMatrix(m)
        if esh is not None:
            c.drawPath(ep, paint(None, clamp(ba * 0.9), blur=bs, blend=skia.BlendMode.kPlus, shader=esh(m)))
        else:
            c.drawPath(ep, paint(ecol, clamp(ba * 0.9), blur=bs, blend=skia.BlendMode.kPlus))
        c.restore()
    # halos in the air around light sources
    for (lx, ly, lr, li, lc, lh, _lz, _lr) in sl:
        if lh > 0 and li > 0:
            c.save()
            if box_clip is not None:
                c.clipPath(box_clip, skia.ClipOp.kIntersect, True)
            c.drawPaint(paint(None, 1.0, blend=skia.BlendMode.kPlus, shader=radial(lx, ly, lr * 0.55, lc, clamp(lh * li * 0.5))))
            c.restore()
    if scene.box is not None and 'draw_front' in scene.box:
        scene.box['draw_front'](c, M, W, H, scene)
    for fn in scene.overlays:
        c.save()
        fn(c, W, H, fmt)
        c.restore()
    # vignette
    if scene.vig > 0:
        rr = math.hypot(W, H) * 0.62
        sh = skia.GradientShader.MakeRadial(skia.Point(W / 2, H * 0.48), rr,
                                            [argb('#000000', 0), argb('#000000', 0), argb('#000000', scene.vig)], [0.0, 0.55, 1.0])
        c.drawPaint(paint(None, 1.0, shader=sh))
    if scene.fade > 0:
        c.drawPaint(paint('#000000', clamp(scene.fade)))


# ----------------------------------------------------------------- path helpers

def P():
    p = skia.Path()
    p.setFillType(skia.PathFillType.kWinding)
    return p


def _area(pts):
    s = 0.0
    for i in range(len(pts)):
        x0, y0 = pts[i]
        x1, y1 = pts[(i + 1) % len(pts)]
        s += x0 * y1 - x1 * y0
    return s


def poly(p, pts, close=True):
    """Add a polygon with clockwise winding (screen coords, y down)."""
    pts = list(pts)
    if _area(pts) < 0:
        pts.reverse()
    p.moveTo(*pts[0])
    for q in pts[1:]:
        p.lineTo(*q)
    if close:
        p.close()
    return p


def smooth_poly(p, pts, tension=0.5):
    """Closed Catmull-Rom curve through pts, clockwise."""
    pts = list(pts)
    if _area(pts) < 0:
        pts.reverse()
    n = len(pts)
    p.moveTo(*pts[0])
    for i in range(n):
        p0, p1, p2, p3 = pts[i - 1], pts[i], pts[(i + 1) % n], pts[(i + 2) % n]
        c1 = (p1[0] + (p2[0] - p0[0]) * tension / 3, p1[1] + (p2[1] - p0[1]) * tension / 3)
        c2 = (p2[0] - (p3[0] - p1[0]) * tension / 3, p2[1] - (p3[1] - p1[1]) * tension / 3)
        p.cubicTo(c1[0], c1[1], c2[0], c2[1], p2[0], p2[1])
    p.close()
    return p


def rect(p, x, y, w, h, r=0.0):
    rr = skia.Rect.MakeXYWH(x, y, w, h)
    if r > 0:
        p.addRRect(skia.RRect.MakeRectXY(rr, r, r), skia.PathDirection.kCW)
    else:
        p.addRect(rr, skia.PathDirection.kCW)
    return p


def circle(p, x, y, r):
    p.addCircle(x, y, r, skia.PathDirection.kCW)
    return p


def oval(p, x, y, rx, ry):
    p.addOval(skia.Rect.MakeLTRB(x - rx, y - ry, x + rx, y + ry), skia.PathDirection.kCW)
    return p


def capsule(p, x0, y0, x1, y1, w0, w1=None):
    """A limb: tapered capsule from (x0,y0) to (x1,y1)."""
    w1 = w0 if w1 is None else w1
    dx, dy = x1 - x0, y1 - y0
    L = math.hypot(dx, dy) or 1e-3
    nx, ny = -dy / L, dx / L
    r0, r1 = w0 / 2, w1 / 2
    pts = [(x0 + nx * r0, y0 + ny * r0), (x1 + nx * r1, y1 + ny * r1), (x1 - nx * r1, y1 - ny * r1), (x0 - nx * r0, y0 - ny * r0)]
    poly(p, pts)
    circle(p, x0, y0, r0)
    circle(p, x1, y1, r1)
    return p


def transformed(path, m):
    q = skia.Path(path)
    q.transform(m)
    return q


def union(*paths):
    out = P()
    for q in paths:
        out.addPath(q)
    return out


# ----------------------------------------------------------------- puppets

KINDS = {
    #            head  torso thigh shin  uarm  farm  limb  leg   torso_w hip_w
    'father':   (0.072, 0.30, 0.235, 0.235, 0.17, 0.16, 0.060, 0.068, 0.200, 0.15),
    'old':      (0.072, 0.29, 0.230, 0.230, 0.165, 0.155, 0.058, 0.066, 0.200, 0.15),
    'son':      (0.072, 0.30, 0.240, 0.240, 0.17, 0.16, 0.058, 0.066, 0.185, 0.14),
    'teen':     (0.078, 0.29, 0.240, 0.235, 0.165, 0.155, 0.055, 0.062, 0.170, 0.13),
    'boy':      (0.095, 0.27, 0.215, 0.205, 0.15, 0.14, 0.055, 0.060, 0.170, 0.13),
    'small':    (0.120, 0.25, 0.190, 0.180, 0.14, 0.13, 0.060, 0.066, 0.190, 0.15),
}


def pose(**kw):
    base = dict(lean=0.0, head=0.0, sf=0.0, ef=0.0, sb=0.0, eb=0.0, hf=0.0, kf=0.0, hb=0.0, kb=0.0)
    base.update(kw)
    return base


def mixpose(a, b, u):
    out = {}
    for k in set(a) | set(b):
        va, vb = a.get(k), b.get(k)
        if isinstance(va, tuple) or isinstance(vb, tuple):
            if va is None or vb is None:
                out[k] = vb if u >= 0.5 else va
            else:
                out[k] = (lerp(va[0], vb[0], u), lerp(va[1], vb[1], u))
        elif isinstance(va, bool) or isinstance(vb, bool):
            out[k] = vb if u >= 0.5 else va
        else:
            out[k] = lerp(va or 0.0, vb or 0.0, u)
    return out


def walk(phase, stride=1.0, arms=1.0, lean=4.0):
    s = math.sin(phase)
    c2 = math.cos(phase)
    return pose(lean=lean, head=-2,
                hf=24 * stride * s, kf=max(0, 38 * stride * -c2) + 4,
                hb=-24 * stride * s, kb=max(0, 38 * stride * c2) + 4,
                sf=-18 * arms * s, ef=14, sb=18 * arms * s, eb=14)


def _dir(angle_deg, f):
    a = math.radians(angle_deg)
    return (f * math.sin(a), math.cos(a))


ADULT_HEAD = [(-0.55, -0.86), (-0.92, -0.35), (-0.98, 0.2), (-0.78, 0.68), (-0.3, 0.98), (0.3, 0.96), (0.68, 0.7),
              (0.84, 0.36), (0.88, 0.2), (0.81, 0.1), (0.9, 0.02), (1.17, -0.21), (1.12, -0.28), (0.95, -0.3),
              (0.97, -0.41), (0.9, -0.47), (0.95, -0.55), (0.86, -0.73), (0.62, -0.89), (0.15, -0.87)]
CHILD_HEAD = [(-0.6, -0.85), (-0.98, -0.3), (-1.0, 0.25), (-0.8, 0.72), (-0.3, 1.0), (0.3, 0.98), (0.75, 0.72),
              (0.95, 0.35), (0.97, 0.12), (0.93, 0.04), (1.06, -0.14), (0.95, -0.24), (0.96, -0.36), (0.9, -0.44),
              (0.92, -0.52), (0.82, -0.7), (0.55, -0.86), (0.1, -0.88)]
TORSO = {
    'father': [(-0.085, -0.082), (0.10, -0.078), (None, -0.09), (None, -0.062), (None, 0.0), (None, 0.066), (None, 0.088), (0.12, 0.088), (-0.085, 0.092)],
    'old':    [(-0.085, -0.082), (0.10, -0.08), (None, -0.095), (None, -0.065), (None, 0.0), (None, 0.062), (None, 0.084), (0.12, 0.086), (-0.085, 0.09)],
    'son':    [(-0.03, -0.072), (0.12, -0.07), (None, -0.082), (None, -0.056), (None, 0.0), (None, 0.06), (None, 0.078), (0.10, 0.078), (-0.03, 0.078)],
    'teen':   [(-0.03, -0.07), (0.12, -0.068), (None, -0.08), (None, -0.054), (None, 0.0), (None, 0.058), (None, 0.075), (0.10, 0.075), (-0.03, 0.075)],
    'boy':    [(-0.02, -0.075), (0.1, -0.075), (None, -0.08), (None, -0.05), (None, 0.0), (None, 0.06), (None, 0.07), (0.1, 0.075), (-0.02, 0.078)],
    'small':  [(-0.02, -0.085), (0.1, -0.09), (None, -0.085), (None, -0.05), (None, 0.0), (None, 0.06), (None, 0.085), (0.1, 0.1), (-0.02, 0.095)],
}
_TOP = [-0.06, -0.02, 0.008, 0.012, -0.01, -0.07]   # offsets from shoulder height for the None rows


def puppet(kind, ps, x, ground, h, facing=1, extras=(), hip=None, eye=None):
    """Jointed paper silhouette as one path. Returns (path, joints).

    Angles in degrees from straight down, positive = toward the facing side.
    Knee angles bend the shin backward. `hip` pins the hip (sitting)."""
    hr, tl, th, sh, ua, fa, lw, gw, tw, hw = KINDS[kind]
    f = facing
    H = h
    th_, sh_ = th * H, sh * H

    def leg(hipa, knee):
        kx, ky = _dir(hipa, f)
        knee_p = (kx * th_, ky * th_)
        fx, fy = _dir(hipa - knee, f)
        foot = (knee_p[0] + fx * sh_, knee_p[1] + fy * sh_)
        return knee_p, foot
    kf_p, ff_p = leg(ps['hf'], ps['kf'])
    kb_p, fb_p = leg(ps['hb'], ps['kb'])
    if hip is None:
        low = max(ff_p[1], fb_p[1])
        hx, hy = x, ground - low - 0.018 * H
    else:
        hx, hy = hip
    def leg_ik(target):
        L1, L2 = th_, sh_
        vx, vy = target[0] - hx, target[1] - hy
        dd = math.hypot(vx, vy) or 1e-3
        d = max(1e-3, min(dd, (L1 + L2) * 0.999))
        base = math.atan2(vy, vx)
        al = math.acos(clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1.0, 1.0))
        ks = [(math.cos(base + sg * al) * L1, math.sin(base + sg * al) * L1) for sg in (1, -1)]
        knee_p = max(ks, key=lambda k_: f * k_[0])
        return knee_p, (vx * d / dd, vy * d / dd)
    if ps.get('lf') is not None:
        kf_p, ff_p = leg_ik(ps['lf'])
    if ps.get('lb') is not None:
        kb_p, fb_p = leg_ik(ps['lb'])
    lean = ps['lean']
    la = math.radians(lean)
    up = (f * math.sin(la), -math.cos(la))
    bf = (f * math.cos(la), math.sin(la))

    def B(a, b):
        return (hx + (a * up[0] + b * bf[0]) * H, hy + (a * up[1] + b * bf[1]) * H)
    shp = B(tl, 0.0)
    neck = B(tl + 0.045, 0.012)
    ha = math.radians(lean + ps['head'])
    hup = (f * math.sin(ha), -math.cos(ha))
    hfw = (f * math.cos(ha), math.sin(ha))
    r = hr * H
    head = (neck[0] + hup[0] * r * 0.82, neck[1] + hup[1] * r * 0.82)

    def at(u, v):
        return (head[0] + (u * hfw[0] + v * hup[0]) * r, head[1] + (u * hfw[1] + v * hup[1]) * r)

    def arm(sa, ea):
        ex, ey = _dir(sa + lean * 0.3, f)
        el = (shp[0] + ex * ua * H, shp[1] + ey * ua * H)
        hx2, hy2 = _dir(sa + ea + lean * 0.3, f)
        hand = (el[0] + hx2 * fa * H, el[1] + hy2 * fa * H)
        return el, hand, (hx2, hy2)
    def ik(target, up_elbow=False):
        L1, L2 = ua * H, fa * H
        vx, vy = target[0] - shp[0], target[1] - shp[1]
        d = max(1e-3, min(math.hypot(vx, vy), (L1 + L2) * 0.999))
        base = math.atan2(vy, vx)
        cosa = clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1.0, 1.0)
        al = math.acos(cosa)
        cands = []
        for sgn in (1, -1):
            a1 = base + sgn * al
            el = (shp[0] + math.cos(a1) * L1, shp[1] + math.sin(a1) * L1)
            cands.append(el)
        # elbows hang down (or out behind the body when reaching up)
        el = max(cands, key=lambda e: (-e[1] if up_elbow else e[1]) - f * e[0] * 0.15)
        tx, ty = shp[0] + vx * d / max(1e-3, math.hypot(vx, vy)), shp[1] + vy * d / max(1e-3, math.hypot(vx, vy))
        dl = math.hypot(tx - el[0], ty - el[1]) or 1e-3
        return el, (tx, ty), ((tx - el[0]) / dl, (ty - el[1]) / dl)
    if ps.get('tf') is not None:
        elf, hnf, dfh = ik(ps['tf'], ps.get('tf_up', False))
    else:
        elf, hnf, dfh = arm(ps['sf'], ps['ef'])
    if ps.get('tb') is not None:
        elb, hnb, dbh = ik(ps['tb'], ps.get('tb_up', False))
    else:
        elb, hnb, dbh = arm(ps['sb'], ps['eb'])
    A = lambda q: (hx + q[0], hy + q[1])

    p = P()

    def limb_leg(kp, fp, hipa, knee):
        capsule(p, *B(0.0, 0.0), *A(kp), gw * H * 1.05, gw * H * 0.88)
        capsule(p, *A(kp), *A(fp), gw * H * 0.88, gw * H * 0.72)
        _shoe(p, A(fp), f, H, kind)

    def limb_arm(el, hn, d):
        capsule(p, *shp, *el, lw * H, lw * H * 0.86)
        capsule(p, *el, *hn, lw * H * 0.86, lw * H * 0.7)
        circle(p, hn[0] + d[0] * lw * H * 0.25, hn[1] + d[1] * lw * H * 0.25, lw * H * 0.62)
    limb_leg(kb_p, fb_p, ps['hb'], ps['kb'])
    limb_arm(elb, hnb, dbh)
    # torso
    rows = TORSO.get(kind, TORSO['son'])
    pts = []
    k = 0
    for (a_, b_) in rows:
        if a_ is None:
            a_ = tl + _TOP[k]
            k += 1
        pts.append(B(a_, b_))
    smooth_poly(p, pts, 0.32)
    capsule(p, *B(tl * 0.95, 0.0), *neck, 0.055 * H, 0.05 * H)
    # head in profile
    prof = CHILD_HEAD if kind in ('boy', 'small') else ADULT_HEAD
    smooth_poly(p, [at(u, v) for (u, v) in prof], 0.3)
    limb_leg(kf_p, ff_p, ps['hf'], ps['kf'])
    limb_arm(elf, hnf, dfh)
    hd = dict(head=head, hr=r, ha=ha, f=f, neck=neck, sh=shp, hip=(hx, hy),
              hand_f=hnf, hand_b=hnb, elbow_f=elf, elbow_b=elb,
              foot_f=A(ff_p), foot_b=A(fb_p), H=H, at=at)
    for e in extras:
        _extra(p, e, hd)
    if eye is not None:
        ep = P()
        ex, ey = at(0.5, 0.16)
        if eye == 'open':
            smooth_poly(ep, [at(0.36, 0.16), at(0.5, 0.24), at(0.64, 0.17), at(0.5, 0.1)], 0.5)
        else:
            capsule(ep, *at(0.36, 0.13), *at(0.64, 0.11), 0.05 * r)
        hd['eye_path'] = ep
    return p, hd


def _shoe(p, at_, f, H, kind):
    x, y = at_
    L = (0.085 if kind not in ('boy', 'small') else 0.07) * H
    pts = [(x - f * 0.028 * H, y - 0.03 * H), (x + f * 0.01 * H, y - 0.03 * H), (x + f * L * 0.8, y - 0.012 * H),
           (x + f * L, y + 0.004 * H), (x + f * L * 0.95, y + 0.014 * H), (x - f * 0.03 * H, y + 0.014 * H)]
    smooth_poly(p, pts, 0.25)


def _extra(p, e, hd):
    at, r, H, f = hd['at'], hd['hr'], hd['H'], hd['f']
    if e == 'cap':
        smooth_poly(p, [at(-1.0, 0.12), at(-0.98, 0.62), at(-0.55, 1.0), at(0.2, 1.12), at(0.75, 0.95), at(1.0, 0.62),
                        at(1.55, 0.5), at(1.62, 0.4), at(1.0, 0.36), at(0.2, 0.42), at(-0.6, 0.3)], 0.25)
    elif e == 'mustache':
        smooth_poly(p, [at(0.82, -0.27), at(1.04, -0.29), at(1.1, -0.4), at(0.98, -0.47), at(0.8, -0.42)], 0.35)
    elif e == 'beard':
        smooth_poly(p, [at(0.3, -0.5), at(0.95, -0.42), at(0.98, -0.75), at(0.7, -1.02), at(0.2, -0.95)], 0.35)
    elif e == 'hair':
        smooth_poly(p, [at(-1.02, -0.1), at(-1.04, 0.55), at(-0.7, 0.98), at(-0.1, 1.2), at(0.35, 1.22), at(0.75, 1.1),
                        at(1.0, 0.86), at(0.86, 0.72), at(0.55, 0.78), at(0.2, 0.62), at(-0.3, 0.5), at(-0.6, 0.12)], 0.3)
    elif e == 'kidhair':
        smooth_poly(p, [at(-1.04, 0.0), at(-0.98, 0.7), at(-0.55, 1.08), at(0.1, 1.16), at(0.62, 1.02), at(0.95, 0.75),
                        at(0.9, 0.55), at(0.6, 0.66), at(0.3, 0.58), at(-0.2, 0.62), at(-0.65, 0.25)], 0.3)
    elif e == 'hood':
        nk = hd['neck']
        smooth_poly(p, [at(-0.5, -0.95), at(-1.25, -0.6), at(-1.3, 0.1), at(-1.0, 0.2), at(-0.7, -0.5)], 0.4)
    elif e == 'backpack':
        sh, hip = hd['sh'], hd['hip']
        cx = (sh[0] * 0.55 + hip[0] * 0.45) - f * 0.105 * H
        cy = sh[1] * 0.55 + hip[1] * 0.45
        rect(p, cx - 0.055 * H, cy - 0.085 * H, 0.11 * H, 0.17 * H, 0.03 * H)
    elif e == 'bag':
        sh, hip = hd['sh'], hd['hip']
        cx, cy = hip[0] - f * 0.11 * H, hip[1] - 0.01 * H
        rect(p, cx - 0.09 * H, cy - 0.07 * H, 0.18 * H, 0.14 * H, 0.03 * H)
        capsule(p, sh[0] + f * 0.03 * H, sh[1] + 0.01 * H, cx + f * 0.02 * H, cy - 0.065 * H, 0.014 * H)


def add_puppet(sc, z, kind, ps, x, ground, h, facing=1, extras=(), col='#07060a', eye=None, eye_col='#ffcf8a', eye_a=0.9, hip=None, trans=0.05):
    path, j = puppet(kind, ps, x, ground, h, facing, extras, hip=hip, eye=eye)
    it = sc.add(z, path, col, trans=trans)
    if eye is not None and eye_a > 0:
        it.emit(j['eye_path'], eye_col, a=eye_a, bloom=0.4, sigma=5)
    j['item'] = it
    return j


# ----------------------------------------------------------------- props

def lantern_path(x, y, s=1.0, swing=0.0):
    """Hurricane lantern hanging from its bail at (x, y). Returns (frame path, globe path, flame point)."""
    m = skia.Matrix.Translate(x, y)
    m.preRotate(swing)
    m.preScale(s, s)
    fr = P()
    # bail (handle)
    q = P()
    q.moveTo(-15, 22)
    q.cubicTo(-16, -4, 16, -4, 15, 22)
    st = skia.Paint(AntiAlias=True, Style=skia.Paint.kStroke_Style, StrokeWidth=3.2, StrokeCap=skia.Paint.kRound_Cap)
    bail = P()
    st.getFillPath(q, bail)
    fr.addPath(bail)
    rect(fr, -13, 16, 26, 7, 2)        # top cap
    poly(fr, [(-9, 16), (9, 16), (5, 9), (-5, 9)])
    rect(fr, -17, 58, 34, 9, 3)        # base
    rect(fr, -14, 54, 28, 5, 2)
    for gx in (-13.5, -4.5, 4.5, 13.5):  # guard wires
        capsule(fr, gx * 0.85, 24, gx, 55, 2.0)
    globe = P()
    smooth_poly(globe, [(0, 23), (11, 28), (14.5, 40), (11, 52), (0, 55), (-11, 52), (-14.5, 40), (-11, 28)], 0.5)
    return transformed(fr, m), transformed(globe, m), m.mapXY(0, 41)


def flame_path(x, y, s, T, wind=0.0, size=1.0, seed=0.0):
    fl = flicker(T, seed, 1.6)
    h = 15 * s * size * fl
    w = 5.2 * s * size
    lean = wind * 6 * s + 1.2 * s * math.sin(9.1 * T + seed)
    p = P()
    smooth_poly(p, [(x, y + 3 * s * size), (x - w, y - h * 0.15), (x - w * 0.35 + lean * 0.5, y - h * 0.65), (x + lean, y - h), (x + w * 0.4 + lean * 0.5, y - h * 0.6), (x + w, y - h * 0.15)], 0.55)
    return p


def add_lantern(sc, x, y, z, s=1.0, swing=0.0, lit=1.0, T=0.0, wind=0.0, col='#120d0a', light_r=620, inten=1.0, seed=0.0, halo=0.35):
    fr, globe, fp = lantern_path(x, y, s, swing)
    it = sc.add(z, fr, col, trans=0.0, shadow=True, rim=True)
    g = sc.add(z + 0.0005, globe, '#2a1e14', trans=0.0, shadow=False, rim=False, tex=False, band=False)
    if lit > 0:
        fl = flicker(T, seed)
        gl = clamp(lit)
        g.emit(globe, '#ffb456', a=0.85 * gl, bloom=0.9, sigma=26)
        fpath = flame_path(fp.x(), fp.y() + 6 * s, s, T, wind, size=0.6 + 0.4 * gl, seed=seed)
        g.emit(fpath, '#fff1c8', a=gl, bloom=1.2, sigma=10)
        sc.light(fp.x(), fp.y(), z, light_r * s * (0.55 + 0.45 * gl) * (0.97 + 0.03 * fl), inten * gl * fl, '#ffb35a', halo=halo)
    return it, fp


def add_match(sc, x, y, z, s, T, t_strike, ang=-20.0):
    """A match struck at t_strike: a flare, then a small flame."""
    u = T - t_strike
    m = skia.Matrix.Translate(x, y)
    m.preRotate(ang)
    m.preScale(s, s)
    stick = P()
    rect(stick, -2, 0, 4, 46, 2)
    it = sc.add(z, transformed(stick, m), '#2a1a10', trans=0.0, shadow=False)
    tip = m.mapXY(0, -2)
    if u >= 0:
        flare = math.exp(-u * 7.0) * 1.0
        size = 0.8 + 1.8 * flare
        fp = flame_path(tip.x(), tip.y(), s * 1.1, T, 0, size=size, seed=2.0)
        it.emit(fp, '#fff4d6', a=1.0, bloom=1.4 + 2.5 * flare, sigma=16 + 30 * flare)
        sc.light(tip.x(), tip.y(), z, (360 + 260 * flare) * s, 0.75 + 0.6 * flare, '#ffc070', halo=0.22 + 0.35 * flare)
    return it


def add_tally_wall(sc, z, count, col, region, lit_count=None, light_xy=None, warm=1.0, alpha=1.0, mark=16.0, a_dim=0.32):
    """Tally slits cut through a wall sheet (they glow: light behind the paper)."""
    x0, y0, x1, y1 = region
    n_lit = count if lit_count is None else lit_count
    for chunk, path in tally_chunks(count, x0, y0, x1, y1, mark):
        lo, hi = chunk
        if hi <= n_lit:
            a = 1.0
        elif lo >= n_lit:
            a = a_dim
        else:
            a = lerp(a_dim, 1.0, (n_lit - lo) / max(1, hi - lo))
        if light_xy is not None:
            lx, ly, lr = light_xy

            def shader(m, lx=lx, ly=ly, lr=lr, a=a):
                return skia.GradientShader.MakeRadial(skia.Point(lx, ly), lr,
                                                      [argb(mixc('#ffd79a', '#a9c3ff', 1 - warm), 1.0), argb(mixc('#ffb860', '#7f9dd8', 1 - warm), 0.85), argb(mixc('#d89048', '#5d79b6', 1 - warm), 0.55), argb('#6d84b8', 0.35)],
                                                      [0.0, 0.35, 0.7, 1.0])
            sc.items[-1].emit(path, col, a=a * alpha, bloom=0.5, sigma=9, shader=shader)
        else:
            sc.items[-1].emit(path, col, a=a * alpha, bloom=0.5, sigma=9)


TALLY_EXCLUDE = [(612.0, 222.0, 858.0, 448.0)]   # the window frame


@lru_cache(maxsize=4096)
def _tally_positions(x0, y0, x1, y1, mark):
    gw = mark * 1.45     # group width
    rh = mark * 1.62     # row height
    cols_per_block = 8
    rows = int((y1 - y0) // rh)
    blocks = int((x1 - x0) // (gw * cols_per_block)) + 1
    out = []
    start = int(rows * 0.36)
    order = sorted(range(rows), key=lambda i: (abs(i - start) + (0.5 if i < start else 0.0)))
    for b in range(blocks):
        bx = x1 - (b + 1) * gw * cols_per_block
        for r_ in order:
            for cidx in range(cols_per_block):
                gx = bx + (cols_per_block - 1 - cidx) * gw
                gy = y0 + r_ * rh
                if gx < x0 - gw * 0.2:
                    continue
                if any(ex0 - gw < gx < ex1 and ey0 - rh < gy < ey1 for (ex0, ey0, ex1, ey1) in TALLY_EXCLUDE):
                    continue
                out.append((gx, gy))
    return out


@lru_cache(maxsize=64)
def tally_chunks(count, x0, y0, x1, y1, mark, chunk=40):
    groups = _tally_positions(x0, y0, x1, y1, mark)
    n_groups_full = count // 5
    rem = count % 5
    res = []
    r = np.random.default_rng(11)
    jit = r.uniform(-1, 1, (len(groups) + 2, 8))
    total = n_groups_full + (1 if rem else 0)
    for c0 in range(0, total, chunk):
        p = P()
        for gi in range(c0, min(total, c0 + chunk)):
            if gi >= len(groups):
                break
            gx, gy = groups[gi]
            j = jit[gi]
            marks = 5 if gi < n_groups_full else rem
            w = max(1.6, mark * 0.13)
            for k in range(min(marks, 4)):
                mx = gx + k * mark * 0.26 + j[k] * 0.9
                capsule(p, mx + j[4] * 0.6, gy + j[5] * 0.8, mx - 0.8 + j[6] * 0.5, gy + mark + j[7] * 0.8, w, w * 0.8)
            if marks == 5:
                capsule(p, gx - mark * 0.1, gy + mark * 0.82, gx + mark * 0.95, gy + mark * 0.12, w * 0.9)
        lo = c0 * 5
        hi = min(count, (c0 + chunk) * 5)
        res.append(((lo, hi), p))
    return tuple(res)


def tally_point(index, region, mark=16.0):
    """Design position of mark number `index` (0-based), for the hand that cuts it."""
    x0, y0, x1, y1 = region
    groups = _tally_positions(x0, y0, x1, y1, mark)
    g = groups[min(len(groups) - 1, index // 5)]
    k = index % 5
    if k < 4:
        return (g[0] + k * mark * 0.26, g[1] + mark * 0.5)
    return (g[0] + mark * 0.42, g[1] + mark * 0.45)


def clock_paths(x, y, s, hh=4, mm=30):
    """Wind-up alarm clock standing at (x, y bottom). Returns (body, face, hands)."""
    body, face, hands = P(), P(), P()
    circle(body, x, y - 48 * s, 34 * s)
    circle(body, x - 26 * s, y - 80 * s, 11 * s)
    circle(body, x + 26 * s, y - 80 * s, 11 * s)
    capsule(body, x - 20 * s, y - 22 * s, x - 30 * s, y, 5 * s)
    capsule(body, x + 20 * s, y - 22 * s, x + 30 * s, y, 5 * s)
    rect(body, x - 3 * s, y - 92 * s, 6 * s, 12 * s, 2 * s)
    circle(face, x, y - 48 * s, 26 * s)
    cx, cy = x, y - 48 * s
    ha = math.radians((hh % 12 + mm / 60) * 30)
    ma = math.radians(mm * 6)
    capsule(hands, cx, cy, cx + math.sin(ha) * 14 * s, cy - math.cos(ha) * 14 * s, 3.4 * s, 2.4 * s)
    capsule(hands, cx, cy, cx + math.sin(ma) * 21 * s, cy - math.cos(ma) * 21 * s, 2.6 * s, 1.6 * s)
    circle(hands, cx, cy, 3 * s)
    for k in range(12):
        a = math.radians(k * 30)
        L = 4 * s if k % 3 else 6 * s
        capsule(hands, cx + math.sin(a) * (24 * s - L), cy - math.cos(a) * (24 * s - L), cx + math.sin(a) * 23 * s, cy - math.cos(a) * 23 * s, 1.6 * s)
    return body, face, hands


def add_clock(sc, x, y, z, s, hh, mm, col, face_col='#ffd9a0', face_a=0.8):
    body, face, hands = clock_paths(x, y, s, hh, mm)
    it = sc.add(z, body, col, trans=0.0)
    f = sc.add(z - 0.0004, face, '#000000', trans=0.0, shadow=False, rim=False, tex=False, band=False)
    f.emit(face, face_col, a=face_a, bloom=0.4, sigma=10)
    sc.add(z - 0.0008, hands, '#140e0a', trans=0.0, shadow=False, rim=False, band=False, tex=False)
    return it


def sky_shader(top, bot, y0=-300, y1=1380):
    def sh(m):
        g = skia.GradientShader.MakeLinear([skia.Point(0, y0), skia.Point(0, y1)], [argb(top), argb(bot)], [0.0, 1.0])
        return g
    return sh


def add_sky(sc, z, top, bot, stars=0, seed=3, star_a=1.0, x0=-1400, x1=3300):
    p = P()
    rect(p, x0, -700, x1 - x0, 2500)
    it = sc.add(z, p, top, trans=0.0, shadow=False, rim=False, band=False, shader=sky_shader(top, bot))
    if stars:
        r = rng(seed)
        sp = P()
        for _ in range(stars):
            sx, sy = r.uniform(x0, x1), r.uniform(-500, 700)
            circle(sp, sx, sy, r.uniform(0.9, 2.3))
        it.emit(sp, '#dfe8ff', a=0.75 * star_a, bloom=0.3, sigma=4)
    return it


def hills_path(x0, x1, base, peaks, seed=0, bottom=2000):
    """peaks: list of (cx, width, height)."""
    p = P()
    pts = [(x0, bottom)]
    n = 90
    for i in range(n + 1):
        x = x0 + (x1 - x0) * i / n
        y = base
        for (cx, w, h) in peaks:
            y -= h * math.exp(-((x - cx) / w) ** 2)
        pts.append((x, y))
    pts.append((x1, bottom))
    poly(p, pts)
    return p


def house_path(x, base, w, h, roof=0.45, chimney=True):
    p = P()
    rh = h * roof
    poly(p, [(x, base), (x, base - h), (x + w / 2, base - h - rh), (x + w, base - h), (x + w, base)])
    if chimney:
        rect(p, x + w * 0.68, base - h - rh * 0.95, w * 0.1, rh * 0.6)
    return p


def tree_path(x, base, h, kind='round', seed=0):
    p = P()
    r = rng(seed)
    capsule(p, x, base, x, base - h * 0.45, h * 0.07, h * 0.05)
    if kind == 'round':
        for k in range(5):
            circle(p, x + r.uniform(-0.18, 0.18) * h, base - h * (0.55 + r.uniform(0, 0.3)), h * r.uniform(0.17, 0.26))
    else:  # pine
        for k in range(4):
            yy = base - h * (0.25 + 0.2 * k)
            ww = h * (0.32 - 0.06 * k)
            poly(p, [(x - ww, yy), (x, yy - h * 0.32), (x + ww, yy)])
    return p


def rain(sc, z, T, region, density=1.0, angle=12.0, col='#9fb6e0', a=0.35, seed=1, speed=1800.0, length=42.0):
    x0, y0, x1, y1 = region
    r = rng(seed)
    n = int(160 * density)
    xs = r.uniform(x0, x1, n)
    ph = r.uniform(0, 1, n)
    sp = r.uniform(0.8, 1.2, n)
    p = P()
    tan = math.tan(math.radians(angle))
    hgt = y1 - y0
    for i in range(n):
        yy = y0 + ((ph[i] + T * speed * sp[i] / hgt) % 1.0) * hgt
        xx = xs[i] + (yy - y0) * tan * 0.4
        capsule(p, xx, yy, xx + tan * length, yy + length, 1.6, 1.0)
    it = sc.add(z, p, col, trans=0.0, shadow=False, rim=False, band=False, tex=False, alpha=a)
    return it


def fog_sheet(x, y, w, h, seed=0):
    r = rng(seed)
    p = P()
    pts = []
    n = 18
    for i in range(n):
        u = i / (n - 1)
        pts.append((x + u * w, y + r.uniform(-0.12, 0.12) * h - math.sin(u * math.pi) * h * 0.35))
    for i in range(n):
        u = 1 - i / (n - 1)
        pts.append((x + u * w, y + h + r.uniform(-0.1, 0.1) * h))
    smooth_poly(p, pts, 0.5)
    return p


# ----------------------------------------------------------------- overlay text

def paper_strip_text(c, s, f, cx, cy, reveal=1.0, col='#ffd9a0', strip='#0b0a0d', pad=(36, 22), a=1.0, glow=0.7, tracking=0.0, strip_a=0.92):
    """Paper text: a dark strip with letters cut out and lit from behind, grown from its left edge."""
    if a <= 0.003 or reveal <= 0.0:
        return
    tp, w = text_path(s, f, cx, cy, 'center', tracking)
    b = tp.getBounds()
    x0, y0 = b.left() - pad[0], b.top() - pad[1]
    x1, y1 = b.right() + pad[0], b.bottom() + pad[1]
    c.save()
    c.clipRect(skia.Rect.MakeLTRB(x0 - 4, y0 - 30, x0 + (x1 - x0) * reveal + 2, y1 + 30), skia.ClipOp.kIntersect, True)
    sp = P()
    rect(sp, x0, y0, x1 - x0, y1 - y0, 3)
    c.save(); c.translate(4, 8); c.drawPath(sp, paint('#000000', 0.45 * a * strip_a, blur=8)); c.restore()
    c.drawPath(sp, paint(strip, a * strip_a))
    sh = PAPER.makeShader(skia.TileMode.kRepeat, skia.TileMode.kRepeat, skia.SamplingOptions(skia.FilterMode.kLinear), skia.Matrix())
    c.save(); c.clipPath(sp, skia.ClipOp.kIntersect, True); c.drawPaint(paint(None, a * strip_a, blend=skia.BlendMode.kMultiply, shader=sh)); c.restore()
    c.drawPath(tp, paint(col, a))
    if glow > 0:
        c.drawPath(tp, paint(col, a * glow, blur=12, blend=skia.BlendMode.kPlus))
    c.restore()


def plain_text(c, s, f, x, y, col='#f3e6cf', a=1.0, align='center', shadow=0.6, tracking=0.0):
    if a <= 0.003:
        return
    tp, w = text_path(s, f, x, y, align, tracking)
    if shadow > 0:
        c.save(); c.translate(0, 3); c.drawPath(tp, paint('#000000', a * shadow, blur=6)); c.restore()
    c.drawPath(tp, paint(col, a))
