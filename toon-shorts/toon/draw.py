"""Small cairo helpers shared by characters, sets and the renderer."""
import math

import cairo
import numpy as np
from PIL import Image

INK = (0.14, 0.11, 0.17)
OUTLINE = 6.0


def hexc(h, a=1.0):
    h = h.lstrip("#")
    r, g, b = (int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))
    return (r, g, b, a)


def shade(c, k):
    """Darken (k<1) or lighten (k>1) a colour tuple."""
    r, g, b = c[:3]
    a = c[3] if len(c) > 3 else 1.0
    if k < 1:
        return (r * k, g * k, b * k, a)
    t = k - 1
    return (r + (1 - r) * t, g + (1 - g) * t, b + (1 - b) * t, a)


def mix(c1, c2, t):
    return tuple(a + (b - a) * t for a, b in zip(c1, c2))


def set_c(ctx, c):
    if len(c) == 3:
        ctx.set_source_rgb(*c)
    else:
        ctx.set_source_rgba(*c)


def fill_stroke(ctx, fill, ink=INK, width=OUTLINE):
    set_c(ctx, fill)
    ctx.fill_preserve()
    set_c(ctx, ink)
    ctx.set_line_width(width)
    ctx.set_line_join(cairo.LINE_JOIN_ROUND)
    ctx.set_line_cap(cairo.LINE_CAP_ROUND)
    ctx.stroke()


def stroke(ctx, c=INK, width=OUTLINE):
    set_c(ctx, c)
    ctx.set_line_width(width)
    ctx.set_line_join(cairo.LINE_JOIN_ROUND)
    ctx.set_line_cap(cairo.LINE_CAP_ROUND)
    ctx.stroke()


def ellipse(ctx, x, y, rx, ry, angle=0.0):
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(angle)
    ctx.scale(rx, ry)
    ctx.arc(0, 0, 1, 0, 2 * math.pi)
    ctx.restore()


def smooth_closed(ctx, pts, tension=0.5):
    """Closed Catmull-Rom spline through pts."""
    n = len(pts)
    ctx.move_to(*pts[0])
    for i in range(n):
        p0, p1, p2, p3 = pts[i - 1], pts[i], pts[(i + 1) % n], pts[(i + 2) % n]
        c1 = (p1[0] + (p2[0] - p0[0]) * tension / 3, p1[1] + (p2[1] - p0[1]) * tension / 3)
        c2 = (p2[0] - (p3[0] - p1[0]) * tension / 3, p2[1] - (p3[1] - p1[1]) * tension / 3)
        ctx.curve_to(*c1, *c2, *p2)
    ctx.close_path()


def smooth_open(ctx, pts, tension=0.5, move=True):
    n = len(pts)
    if move:
        ctx.move_to(*pts[0])
    for i in range(n - 1):
        p0 = pts[max(i - 1, 0)]
        p1, p2 = pts[i], pts[i + 1]
        p3 = pts[min(i + 2, n - 1)]
        c1 = (p1[0] + (p2[0] - p0[0]) * tension / 3, p1[1] + (p2[1] - p0[1]) * tension / 3)
        c2 = (p2[0] - (p3[0] - p1[0]) * tension / 3, p2[1] - (p3[1] - p1[1]) * tension / 3)
        ctx.curve_to(*c1, *c2, *p2)


def capsule(ctx, pts, width, fill, ink=INK, outline=OUTLINE):
    """A limb: polyline stroked thick in ink, then in fill colour."""
    for c, w in ((ink, width + 2 * outline), (fill, width)):
        ctx.move_to(*pts[0])
        for p in pts[1:]:
            ctx.line_to(*p)
        stroke(ctx, c, w)


def rounded_rect(ctx, x, y, w, h, r):
    r = min(r, w / 2, h / 2)
    ctx.new_sub_path()
    ctx.arc(x + w - r, y + r, r, -math.pi / 2, 0)
    ctx.arc(x + w - r, y + h - r, r, 0, math.pi / 2)
    ctx.arc(x + r, y + h - r, r, math.pi / 2, math.pi)
    ctx.arc(x + r, y + r, r, math.pi, 1.5 * math.pi)
    ctx.close_path()


def lin_grad(x0, y0, x1, y1, stops):
    g = cairo.LinearGradient(x0, y0, x1, y1)
    for off, c in stops:
        if len(c) == 3:
            g.add_color_stop_rgb(off, *c)
        else:
            g.add_color_stop_rgba(off, *c)
    return g


def rad_grad(cx, cy, r, stops):
    g = cairo.RadialGradient(cx, cy, 0, cx, cy, r)
    for off, c in stops:
        if len(c) == 3:
            g.add_color_stop_rgb(off, *c)
        else:
            g.add_color_stop_rgba(off, *c)
    return g


# ---------------------------------------------------------------- PIL <-> cairo

def surface_to_pil(surf):
    w, h = surf.get_width(), surf.get_height()
    buf = np.ndarray((h, surf.get_stride() // 4, 4), np.uint8, surf.get_data())[:, :w]
    bgra = buf.copy()
    a = bgra[..., 3:4].astype(np.float32)
    rgb = bgra[..., [2, 1, 0]].astype(np.float32)
    with np.errstate(divide="ignore", invalid="ignore"):
        rgb = np.where(a > 0, rgb * 255.0 / np.maximum(a, 1), 0)
    out = np.concatenate([rgb.clip(0, 255), a], axis=2).astype(np.uint8)
    return Image.fromarray(out, "RGBA")


def pil_to_surface(img):
    img = img.convert("RGBA")
    arr = np.asarray(img).astype(np.float32)
    a = arr[..., 3:4] / 255.0
    bgra = np.empty_like(arr)
    bgra[..., 0] = arr[..., 2] * a[..., 0]
    bgra[..., 1] = arr[..., 1] * a[..., 0]
    bgra[..., 2] = arr[..., 0] * a[..., 0]
    bgra[..., 3] = arr[..., 3]
    h, w = arr.shape[:2]
    stride = cairo.ImageSurface.format_stride_for_width(cairo.FORMAT_ARGB32, w)
    data = np.zeros((h, stride // 4, 4), np.uint8)
    data[:, :w] = bgra.round().clip(0, 255).astype(np.uint8)
    surf = cairo.ImageSurface.create_for_data(bytearray(data.tobytes()), cairo.FORMAT_ARGB32, w, h, stride)
    return surf


def ease(t, kind="inout"):
    t = max(0.0, min(1.0, t))
    if kind == "in":
        return t * t * t
    if kind == "out":
        return 1 - (1 - t) ** 3
    if kind == "back":
        c = 1.70158
        return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2
    if kind == "linear":
        return t
    return 3 * t * t - 2 * t * t * t
