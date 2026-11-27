"""Sets: a painted background (rendered once, blurred for depth of field)
plus a crisp foreground layer drawn every frame over the characters.

World units: characters stand with the base of the neck at y=0, about
840 units apart. The foreground desk top sits at y=330.
"""
import math
import random

import cairo
from PIL import ImageFilter

from .draw import (INK, ellipse, fill_stroke, hexc, lin_grad, pil_to_surface, rad_grad,
                   rounded_rect, set_c, shade, smooth_closed, stroke, surface_to_pil)

BG_RECT = (-1700, -2200, 3400, 4000)  # x, y, w, h in world units
DESK_Y = 330


def _text(ctx, txt, x, y, size, color, weight=cairo.FONT_WEIGHT_BOLD, center=True):
    ctx.select_font_face("Inter", cairo.FONT_SLANT_NORMAL, weight)
    ctx.set_font_size(size)
    e = ctx.text_extents(txt)
    ctx.move_to(x - (e.width / 2 + e.x_bearing if center else 0), y)
    set_c(ctx, color)
    ctx.show_text(txt)


# ------------------------------------------------------------------ office
def _office_bg(ctx, rnd):
    x0, y0, w, h = BG_RECT
    ctx.rectangle(x0, y0, w, h)
    ctx.set_source(lin_grad(0, y0, 0, y0 + h, [(0, hexc("#f4ead9")), (0.6, hexc("#eadcc6")), (1, hexc("#dccab0"))]))
    ctx.fill()
    # ceiling
    ctx.rectangle(x0, y0, w, 520)
    set_c(ctx, hexc("#f8f3ea")); ctx.fill()
    ctx.move_to(x0, y0 + 520); ctx.line_to(x0 + w, y0 + 520)
    stroke(ctx, shade(hexc("#eadcc6"), 0.85), 10)
    for lx in (-800, 0, 800):
        rounded_rect(ctx, lx - 260, y0 + 300, 520, 70, 12)
        set_c(ctx, hexc("#fffdf6")); ctx.fill_preserve()
        stroke(ctx, hexc("#d9d0c0"), 6)
        ctx.rectangle(lx - 300, y0 + 370, 600, 380)
        ctx.set_source(lin_grad(0, y0 + 370, 0, y0 + 750, [(0, (1, 1, 0.92, 0.35)), (1, (1, 1, 0.92, 0))]))
        ctx.fill()

    # window
    wx, wy, ww, wh = -760, -1450, 1520, 1360
    rounded_rect(ctx, wx - 30, wy - 30, ww + 60, wh + 60, 10)
    set_c(ctx, hexc("#c9b79b")); ctx.fill()
    ctx.rectangle(wx, wy, ww, wh)
    ctx.set_source(lin_grad(0, wy, 0, wy + wh, [(0, hexc("#7fb6ec")), (0.6, hexc("#b9dbf5")), (1, hexc("#f4e9d2"))]))
    ctx.fill()
    ctx.save(); ctx.rectangle(wx, wy, ww, wh); ctx.clip()
    # clouds
    for cx, cy, s in ((-500, -1250, 1.0), (300, -1330, 0.8), (620, -1080, 0.6), (-150, -1050, 0.55)):
        for dx, dy, r in ((0, 0, 70), (70, 10, 55), (-70, 15, 50), (35, -35, 55), (-30, -28, 45)):
            ellipse(ctx, cx + dx * s * 1.5, cy + dy * s, r * s * 1.4, r * s)
        set_c(ctx, (1, 1, 1, 0.9)); ctx.fill()
    # skyline, two layers
    for layer, (col, base, hmin, hmax) in enumerate(((hexc("#a7bfd6"), wy + wh, 300, 760),
                                                     (hexc("#6f8fb0"), wy + wh, 160, 560))):
        x = wx - 40
        while x < wx + ww:
            bw = rnd.randint(110, 220)
            bh = rnd.randint(hmin, hmax)
            ctx.rectangle(x, base - bh, bw, bh)
            set_c(ctx, col); ctx.fill()
            if layer == 1:
                for yy in range(int(base - bh + 30), int(base) - 20, 46):
                    for xx in range(int(x + 18), int(x + bw - 24), 36):
                        if rnd.random() < 0.55:
                            ctx.rectangle(xx, yy, 18, 24)
                            set_c(ctx, hexc("#f9e7a6") if rnd.random() < 0.3 else hexc("#8fb0cf")); ctx.fill()
            else:
                if rnd.random() < 0.4:
                    ctx.move_to(x + bw / 2, base - bh); ctx.line_to(x + bw / 2, base - bh - 80)
                    stroke(ctx, col, 8)
            x += bw + rnd.randint(-10, 30)
    ctx.restore()
    # mullions
    for k in range(1, 4):
        ctx.rectangle(wx + ww * k / 4 - 9, wy, 18, wh)
    ctx.rectangle(wx, wy + wh * 0.45 - 9, ww, 18)
    set_c(ctx, hexc("#e9e2d6")); ctx.fill()
    ctx.rectangle(wx, wy, ww, wh)
    stroke(ctx, hexc("#b8a588"), 10)
    # sill
    rounded_rect(ctx, wx - 60, wy + wh + 10, ww + 120, 40, 8)
    set_c(ctx, hexc("#f2ebe0")); ctx.fill()

    # wall clock (left)
    ccx, ccy = -1080, -1180
    ellipse(ctx, ccx, ccy, 120, 120)
    fill_stroke(ctx, hexc("#fffaf0"), hexc("#3b3443"), 14)
    for k in range(12):
        a = k * math.pi / 6
        ctx.move_to(ccx + math.cos(a) * 92, ccy + math.sin(a) * 92)
        ctx.line_to(ccx + math.cos(a) * 104, ccy + math.sin(a) * 104)
    stroke(ctx, hexc("#3b3443"), 6)

    # poster (right)
    px, py = 900, -1300
    ctx.rectangle(px, py, 380, 520)
    set_c(ctx, hexc("#2f4a6d")); ctx.fill()
    ctx.rectangle(px + 24, py + 24, 332, 300)
    ctx.set_source(lin_grad(0, py, 0, py + 324, [(0, hexc("#f6b26b")), (1, hexc("#e06666"))]))
    ctx.fill()
    ctx.move_to(px + 24, py + 324); ctx.line_to(px + 150, py + 160); ctx.line_to(px + 230, py + 250)
    ctx.line_to(px + 290, py + 190); ctx.line_to(px + 356, py + 324); ctx.close_path()
    set_c(ctx, hexc("#3d2c4f")); ctx.fill()
    _text(ctx, "WE'RE A", px + 190, py + 400, 52, hexc("#ffffff"))
    _text(ctx, "FAMILY", px + 190, py + 470, 64, hexc("#ffd36b"))

    # bookshelf (far left)
    bx, by = -1400, -700
    ctx.rectangle(bx, by, 380, 1200)
    set_c(ctx, hexc("#9c6b47")); ctx.fill()
    for k in range(4):
        sy = by + 40 + k * 280
        ctx.rectangle(bx + 20, sy, 340, 230)
        set_c(ctx, hexc("#6e4a33")); ctx.fill()
        xx = bx + 30
        while xx < bx + 330:
            bw = rnd.randint(22, 40)
            bh = rnd.randint(150, 220)
            col = rnd.choice(["#e0614f", "#4f86c6", "#f2c14e", "#5aa469", "#8e6bbf", "#f4f1ea"])
            ctx.rectangle(xx, sy + 230 - bh, bw, bh)
            set_c(ctx, hexc(col)); ctx.fill()
            xx += bw + 4

    # plant (far right)
    pcx = 1150
    for k in range(9):
        a = math.radians(-160 + k * 18)
        lx, ly = pcx + math.cos(a) * 260, -150 + math.sin(a) * 420
        ctx.move_to(pcx, 120)
        ctx.curve_to(pcx + (lx - pcx) * 0.3, 0, lx - 40, ly + 60, lx, ly)
        ctx.curve_to(lx + 40, ly + 80, pcx + (lx - pcx) * 0.4, 40, pcx, 120)
        set_c(ctx, hexc("#4f9a5a") if k % 2 else hexc("#3d7f4a")); ctx.fill()
    ctx.move_to(pcx - 140, 100); ctx.line_to(pcx + 140, 100); ctx.line_to(pcx + 110, 420); ctx.line_to(pcx - 110, 420)
    ctx.close_path()
    set_c(ctx, hexc("#d9784e")); ctx.fill()
    # back wall base strip
    ctx.rectangle(x0, 250, w, 60)
    set_c(ctx, hexc("#cbb593")); ctx.fill()


def _office_fg(ctx, t, cast_x):
    x0, _, w, _ = BG_RECT
    # desk top
    ctx.rectangle(x0, DESK_Y, w, 70)
    ctx.set_source(lin_grad(0, DESK_Y, 0, DESK_Y + 70, [(0, hexc("#c8915e")), (1, hexc("#b37b4b"))]))
    ctx.fill()
    ctx.rectangle(x0, DESK_Y + 70, w, 1600)
    ctx.set_source(lin_grad(0, DESK_Y + 70, 0, DESK_Y + 900, [(0, hexc("#8f5d38")), (1, hexc("#6b4329"))]))
    ctx.fill()
    ctx.move_to(x0, DESK_Y); ctx.line_to(x0 + w, DESK_Y)
    stroke(ctx, INK, 8)
    ctx.move_to(x0, DESK_Y + 70); ctx.line_to(x0 + w, DESK_Y + 70)
    stroke(ctx, INK, 6)
    ctx.move_to(x0, DESK_Y + 12); ctx.line_to(x0 + w, DESK_Y + 12)
    stroke(ctx, (1, 1, 1, 0.35), 6)
    # wood grain
    for k in range(6):
        y = DESK_Y + 160 + k * 120
        ctx.move_to(x0, y)
        ctx.curve_to(-400, y + 30, 200, y - 30, x0 + w, y + 10)
        stroke(ctx, (0, 0, 0, 0.08), 6)

    # resume papers in front of the applicant
    ax = cast_x.get("applicant", -420)
    ctx.save()
    ctx.translate(ax + 40, DESK_Y + 30)
    ctx.rotate(-0.06)
    ctx.rectangle(-110, -36, 220, 46)
    fill_stroke(ctx, hexc("#fbfaf6"), INK, 4)
    ctx.restore()

    # nameplate in front of the boss
    bx = cast_x.get("boss", 420)
    ctx.move_to(bx - 170, DESK_Y + 40); ctx.line_to(bx - 150, DESK_Y - 70)
    ctx.line_to(bx + 150, DESK_Y - 70); ctx.line_to(bx + 170, DESK_Y + 40); ctx.close_path()
    fill_stroke(ctx, hexc("#2f2a3a"))
    ctx.rectangle(bx - 140, DESK_Y - 56, 280, 80)
    set_c(ctx, hexc("#d9b45a")); ctx.fill()
    _text(ctx, "HIRING", bx, DESK_Y - 22, 30, hexc("#2f2a3a"))
    _text(ctx, "MANAGER", bx, DESK_Y + 14, 30, hexc("#2f2a3a"))


SETS = {
    "office": dict(bg=_office_bg, fg=_office_fg),
}


def render_background(name, blur=5.0, seed=7, scale=1.0):
    """Paint the set background once and return (cairo surface, scale)."""
    x0, y0, w, h = BG_RECT
    W, H = int(w * scale), int(h * scale)
    surf = cairo.ImageSurface(cairo.FORMAT_ARGB32, W, H)
    ctx = cairo.Context(surf)
    ctx.scale(scale, scale)
    ctx.translate(-x0, -y0)
    SETS[name]["bg"](ctx, random.Random(seed))
    surf.flush()
    img = surface_to_pil(surf)
    if blur:
        img = img.filter(ImageFilter.GaussianBlur(blur * scale))
    return pil_to_surface(img.convert("RGBA")), scale


def draw_foreground(name, ctx, t, cast_x):
    fg = SETS[name].get("fg")
    if fg:
        fg(ctx, t, cast_x)
