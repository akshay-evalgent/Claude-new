"""Vector character rig: flat-colour anime-style busts with expressions,
lip-flap mouths, blinks, arm poses (2-bone IK) and props.

Local space: origin at the base of the neck, +y down. At scale 1 the head is
about 250 px wide. Characters are drawn waist-up; the set's foreground
(a desk, a counter) hides the cut.
"""
import math

import cairo

from .draw import (INK, OUTLINE, capsule, ellipse, fill_stroke, hexc, lin_grad,
                   rounded_rect, set_c, shade, smooth_closed, smooth_open, stroke)

# ------------------------------------------------------------------ expressions
# brows: (inner raise, outer raise) in px, negative = up
# lid: upper-lid closure 0..1, eyes: render mode, mouth: resting shape
EXPRESSIONS = {
    "neutral":    dict(brows=(0, 0), lid=0.12, eyes="normal", mouth="neutral"),
    "happy":      dict(brows=(-8, -4), lid=0.0, eyes="happy", mouth="grin", extras=["blush"]),
    "smile":      dict(brows=(-4, -2), lid=0.08, eyes="normal", mouth="smile"),
    "smug":       dict(brows=(6, -10), lid=0.45, eyes="normal", mouth="smirk"),
    "shocked":    dict(brows=(-22, -16), lid=0.0, eyes="shock", mouth="shock", extras=["shock_lines", "sweat"]),
    "confused":   dict(brows=(-14, 8), lid=0.1, eyes="normal", mouth="wobble", extras=["sweat"]),
    "determined": dict(brows=(14, -6), lid=0.18, eyes="normal", mouth="frown", extras=["sparkle"]),
    "unbothered": dict(brows=(0, 0), lid=0.55, eyes="normal", mouth="neutral"),
    "sip":        dict(brows=(0, 0), lid=1.0, eyes="closed", mouth="neutral"),
    "tired":      dict(brows=(4, 6), lid=0.5, eyes="normal", mouth="neutral"),
    "proud":      dict(brows=(-6, -6), lid=0.0, eyes="happy", mouth="grin"),
    "dead":       dict(brows=(0, 4), lid=0.3, eyes="dead", mouth="neutral", extras=["gloom", "sweat"]),
    "annoyed":    dict(brows=(12, 0), lid=0.4, eyes="normal", mouth="frown", extras=["anger"]),
}

# ------------------------------------------------------------------ arm poses
# Hand targets in the "facing right" frame: near arm is screen-left (x<0),
# far arm is screen-right. Mirrored automatically when facing left.
POSES = {
    "rest":   dict(near=(-118, 430, "fist", None), far=(118, 430, "fist", None)),
    "mug":    dict(near=(-38, 250, "grip", "mug"), far=(118, 430, "fist", None)),
    "sip":    dict(near=(-34, -86, "grip", "mug_sip"), far=(118, 430, "fist", None)),
    "shrug":  dict(near=(-245, 95, "open", None), far=(245, 95, "open", None), far_front=True),
    "fist":   dict(near=(-60, 150, "fist", None), far=(118, 430, "fist", None)),
    "wave":   dict(near=(-215, -170, "open", None), far=(118, 430, "fist", "cane")),
    "cane":   dict(near=(-150, 400, "fist", "cane"), far=(118, 430, "fist", None)),
    "point":  dict(near=(-40, 200, "fist", None), far=(300, 40, "point", None), far_front=True),
    "think":  dict(near=(-20, -70, "fist", None), far=(118, 430, "fist", None)),
}

UPPER, FORE = 180.0, 168.0
SHOULDER = (138.0, 58.0)


def _ik(s, h, flip_out):
    sx, sy = s
    hx, hy = h
    dx, dy = hx - sx, hy - sy
    d = max(1e-3, min(math.hypot(dx, dy), UPPER + FORE - 1))
    a = math.atan2(dy, dx)
    cos_e = (UPPER ** 2 + d ** 2 - FORE ** 2) / (2 * UPPER * d)
    b = math.acos(max(-1, min(1, cos_e)))
    cands = [(sx + UPPER * math.cos(a + sg * b), sy + UPPER * math.sin(a + sg * b)) for sg in (1, -1)]
    # elbow bends away from the body
    e = max(cands, key=lambda p: p[0] * flip_out)
    hx2, hy2 = sx + math.cos(a) * d, sy + math.sin(a) * d
    return e, (hx2, hy2)


class Character:
    def __init__(self, spec):
        self.s = spec
        self.skin = hexc(spec.get("skin", "#f6d7c3"))
        self.hair = hexc(spec.get("hair", "#e07b39"))
        self.iris = hexc(spec.get("eyes", "#3b6fb6"))
        self.cloth = hexc(spec.get("outfit_color", "#4b7bd1"))
        self.inner = hexc(spec.get("inner_color", "#ffffff"))
        self.style = spec.get("hair_style", "spiky")
        self.outfit = spec.get("outfit", "hoodie")
        self.old = spec.get("old", False)
        self.glasses = spec.get("glasses", False)

    # ============================================================== entry
    def draw(self, ctx, st):
        """st: dict(facing, expr, mouth, blink, pose, t, look, extras)."""
        f = 1.0 if st.get("facing", 1) >= 0 else -1.0
        t = st.get("t", 0.0)
        ex = dict(EXPRESSIONS[st.get("expr", "neutral")])
        extras = list(ex.get("extras", [])) + list(st.get("extras", []))
        talk = st.get("mouth", 0.0)
        breathe = math.sin(t * 2.1) * 3.0
        hunch = 40.0 if self.old else 0.0

        ctx.save()
        ctx.translate(0, breathe)
        pose = POSES[st.get("pose", "rest")]
        arms = self._arms(pose, f, t, st.get("swing", 0.0))

        for arm in arms:
            if not arm["front"]:
                self._arm(ctx, arm)

        # head transform (shared by back hair and face)
        head_dx = f * (hunch * 0.6) + st.get("head_dx", 0)
        head_dy = 42 + hunch + talk * -3.0 + st.get("head_dy", 0)
        tilt = st.get("tilt", 0.0) + (0.06 * f if self.old else 0.0)

        def head_tf():
            ctx.translate(head_dx, head_dy)
            ctx.translate(0, -110)
            ctx.rotate(tilt)
            ctx.translate(0, 110)

        ctx.save(); head_tf(); self._hair_back(ctx, f, t); ctx.restore()
        self._torso(ctx, f, hunch)
        self._neck(ctx, f, head_dx, head_dy)

        ctx.save(); head_tf()
        self._head(ctx, f)
        self._face(ctx, f, ex, extras, talk, st.get("blink", 0.0), st.get("look", 0.0), t)
        self._hair_front(ctx, f, t)
        self._brows(ctx, f, ex)
        if self.glasses:
            self._glasses(ctx, f)
        self._extras(ctx, f, extras, t)
        ctx.restore()

        for arm in arms:
            if arm["front"]:
                self._arm(ctx, arm)
        ctx.restore()

    # ============================================================== body
    def _torso(self, ctx, f, hunch):
        sh = 35 + hunch * 0.35
        ctx.new_path()
        ctx.move_to(-44, -6)
        ctx.curve_to(-100, 0, -150, sh - 15, -166, sh + 32)
        ctx.curve_to(-180, sh + 95, -160, 300, -148, 520)
        ctx.line_to(-156, 760)
        ctx.line_to(156, 760)
        ctx.line_to(148, 520)
        ctx.curve_to(160, 300, 180, sh + 95, 166, sh + 32)
        ctx.curve_to(150, sh - 15, 100, 0, 44, -6)
        ctx.close_path()
        path = ctx.copy_path()
        set_c(ctx, self.cloth)
        ctx.fill()
        # cel shade on far side
        ctx.save()
        ctx.append_path(path)
        ctx.clip()
        ctx.move_to(f * 70, -20)
        ctx.curve_to(f * 95, 200, f * 80, 450, f * 110, 780)
        ctx.line_to(f * 400, 780)
        ctx.line_to(f * 400, -20)
        ctx.close_path()
        set_c(ctx, shade(self.cloth, 0.8))
        ctx.fill()
        ctx.restore()

        if self.outfit == "hoodie":
            # hood bunched around the neck
            ellipse(ctx, f * 6, 8, 104, 46)
            fill_stroke(ctx, shade(self.cloth, 0.9))
            ellipse(ctx, f * 6, 2, 62, 24)
            set_c(ctx, shade(self.cloth, 0.55))
            ctx.fill()
            for sx in (-1, 1):
                x0 = f * 6 + sx * 30
                ctx.move_to(x0, 40)
                ctx.curve_to(x0 + sx * 2, 90, x0 - sx * 4, 140, x0 + sx * 4, 185)
                stroke(ctx, self.inner, 7)
                rounded_rect(ctx, x0 + sx * 4 - 6, 182, 12, 22, 4)
                fill_stroke(ctx, shade(self.inner, 0.85), INK, 3)
            # chest emblem
            ellipse(ctx, f * -60, 250, 26, 26)
            fill_stroke(ctx, self.inner, INK, 4)
            ctx.move_to(f * -60 - 12, 250); ctx.line_to(f * -60 + 12, 250)
            ctx.move_to(f * -60, 238); ctx.line_to(f * -60, 262)
            stroke(ctx, self.cloth, 5)
            ctx.move_to(-130, 470); ctx.curve_to(-60, 455, 60, 455, 130, 470)
            stroke(ctx, shade(self.cloth, 0.7), 4)
        elif self.outfit == "blazer":
            # shirt V
            ctx.move_to(-50, -6); ctx.line_to(50, -6); ctx.line_to(0, 235); ctx.close_path()
            fill_stroke(ctx, self.inner, INK, 4)
            for sx in (-1, 1):
                ctx.move_to(sx * 4, 8); ctx.line_to(sx * 48, -8); ctx.line_to(sx * 30, 52); ctx.close_path()
                fill_stroke(ctx, shade(self.inner, 0.92), INK, 4)
                ctx.move_to(sx * 50, -6)
                ctx.line_to(sx * 100, 60)
                ctx.line_to(sx * 66, 108)
                ctx.line_to(0, 240)
                ctx.line_to(sx * 2, 200)
                ctx.close_path()
                fill_stroke(ctx, shade(self.cloth, 0.72), INK, 4)
            for by in (300, 400):
                ellipse(ctx, f * 6, by, 10, 10)
                fill_stroke(ctx, hexc("#d8b45a"), INK, 3)
            # name badge
            rounded_rect(ctx, f * -110 - 34, 150, 68, 40, 6)
            fill_stroke(ctx, hexc("#ffffff"), INK, 3)
            ctx.rectangle(f * -110 - 34, 150, 68, 12)
            set_c(ctx, hexc("#e05a4f")); ctx.fill()

        # outline last so shading sits inside
        ctx.append_path(path)
        stroke(ctx, INK, OUTLINE)

    def _neck(self, ctx, f, hdx, hdy):
        top_x = hdx * 0.8
        ctx.move_to(-34, 6)
        ctx.line_to(-32 + top_x, -150 + hdy)
        ctx.line_to(32 + top_x, -150 + hdy)
        ctx.line_to(34, 6)
        ctx.curve_to(12, 18, -12, 18, -34, 6)
        ctx.close_path()
        set_c(ctx, self.skin)
        ctx.fill_preserve()
        ctx.save(); ctx.clip()
        ellipse(ctx, top_x + f * 8, -128 + hdy, 50, 34)
        set_c(ctx, shade(self.skin, 0.82)); ctx.fill()
        ctx.restore()
        ctx.move_to(-34, 6); ctx.line_to(-32 + top_x, -150 + hdy)
        ctx.move_to(34, 6); ctx.line_to(32 + top_x, -150 + hdy)
        stroke(ctx, INK, OUTLINE)

    def _arms(self, pose, f, t, swing):
        arms = []
        for which in ("near", "far"):
            hx, hy, hand, prop = pose[which]
            if swing:
                ph = 0 if which == "near" else math.pi
                hx += math.sin(t * 9 + ph) * 26 * swing
                hy += -abs(math.cos(t * 9 + ph)) * 10 * swing
            side = -1 if which == "near" else 1  # facing-right frame
            sx, sy = side * SHOULDER[0] * f, SHOULDER[1] + (14 if self.old else 0)
            h = (hx * f, hy)
            e, h2 = _ik((sx, sy), h, side * f)
            front = which == "near" or pose.get("far_front", False)
            arms.append(dict(s=(sx, sy), e=e, h=h2, hand=hand, prop=prop, front=front, f=f, which=which))
        return arms

    def _arm(self, ctx, a):
        sleeve = self.cloth if a["front"] or a["which"] == "near" else shade(self.cloth, 0.8)
        if a["prop"] == "cane":
            hx, hy = a["h"]
            ctx.move_to(hx + 4, hy - 30)
            ctx.line_to(hx - a["f"] * 30, hy + 900)
            stroke(ctx, INK, 26)
            ctx.move_to(hx + 4, hy - 30)
            ctx.line_to(hx - a["f"] * 30, hy + 900)
            stroke(ctx, hexc("#8a5a33"), 14)
            ctx.arc(hx + 4 + a["f"] * 26, hy - 30, 26, math.pi, 2 * math.pi)
            stroke(ctx, INK, 26)
            ctx.arc(hx + 4 + a["f"] * 26, hy - 30, 26, math.pi, 2 * math.pi)
            stroke(ctx, hexc("#8a5a33"), 14)
        capsule(ctx, [a["s"], a["e"], a["h"]], 64, sleeve)
        # cuff
        ex, ey = a["e"]
        hx, hy = a["h"]
        dx, dy = hx - ex, hy - ey
        d = math.hypot(dx, dy) or 1
        ux, uy = dx / d, dy / d
        cx, cy = hx - ux * 26, hy - uy * 26
        capsule(ctx, [(cx - ux * 8, cy - uy * 8), (cx + ux * 4, cy + uy * 4)], 70, shade(sleeve, 0.85))
        self._hand(ctx, a, ux, uy)

    def _hand(self, ctx, a, ux, uy):
        hx, hy = a["h"]
        kind = a["hand"]
        f = a["f"]
        if a["prop"] == "mug" or a["prop"] == "mug_sip":
            self._mug(ctx, hx + f * -40, hy - 30, f, sip=a["prop"] == "mug_sip")
        if kind == "open":
            for i, ang in enumerate((-0.9, -0.45, 0.0, 0.45)):
                base = math.atan2(uy, ux) + ang * 0.8
                capsule(ctx, [(hx, hy), (hx + math.cos(base) * 48, hy + math.sin(base) * 48)], 17, self.skin, INK, 4)
            ellipse(ctx, hx, hy, 32, 30)
            fill_stroke(ctx, self.skin)
        elif kind == "point":
            base = math.atan2(uy, ux)
            capsule(ctx, [(hx, hy), (hx + math.cos(base) * 62, hy + math.sin(base) * 62)], 17, self.skin, INK, 4)
            ellipse(ctx, hx, hy, 30, 28)
            fill_stroke(ctx, self.skin)
        else:
            ellipse(ctx, hx, hy, 31, 29)
            fill_stroke(ctx, self.skin)
            for k in (-1, 0, 1):
                ctx.move_to(hx - f * 6 + k * 10, hy - 8)
                ctx.line_to(hx - f * 10 + k * 10, hy + 6)
            stroke(ctx, shade(self.skin, 0.6), 3)

    def _mug(self, ctx, x, y, f, sip=False):
        ctx.save()
        ctx.translate(x, y)
        if sip:
            ctx.rotate(-f * 0.35)
        ctx.arc(f * -42, 6, 22, 0, 2 * math.pi)
        stroke(ctx, INK, 20)
        ctx.arc(f * -42, 6, 22, 0, 2 * math.pi)
        stroke(ctx, hexc("#fafafa"), 9)
        rounded_rect(ctx, -40, -50, 80, 96, 12)
        fill_stroke(ctx, hexc("#fafafa"))
        ctx.rectangle(-36, -20, 72, 30)
        set_c(ctx, hexc("#e05a4f")); ctx.fill()
        ctx.select_font_face("Inter", cairo.FONT_SLANT_NORMAL, cairo.FONT_WEIGHT_BOLD)
        ctx.set_font_size(19)
        txt = "#1 BOSS"
        ext = ctx.text_extents(txt)
        ctx.move_to(-ext.width / 2 - ext.x_bearing, 1)
        set_c(ctx, hexc("#ffffff")); ctx.show_text(txt)
        if not sip:
            for k, sx in enumerate((-14, 12)):
                ctx.move_to(sx, -62)
                ctx.curve_to(sx - 12, -80, sx + 12, -92, sx, -112)
                stroke(ctx, (1, 1, 1, 0.75), 6)
        ctx.restore()

    # ============================================================== head
    def _head_path(self, ctx, f):
        chin = (f * 14, -98)
        ctx.move_to(-121, -222)
        ctx.curve_to(-120, -150, -56 + f * 10, -104, chin[0], chin[1])
        ctx.curve_to(56 + f * 10, -104, 120, -150, 121, -222)
        ctx.arc_negative(0, -252, 124, math.atan2(30, 121), math.atan2(30, -121))
        ctx.close_path()

    def _head(self, ctx, f):
        # ears
        for sx in (-1, 1):
            ellipse(ctx, sx * 122, -205, 20, 30)
            fill_stroke(ctx, self.skin)
            ctx.move_to(sx * 118, -218); ctx.curve_to(sx * 130, -210, sx * 128, -196, sx * 118, -190)
            stroke(ctx, shade(self.skin, 0.7), 3)
        self._head_path(ctx, f)
        p = ctx.copy_path()
        set_c(ctx, self.skin)
        ctx.fill()
        # far-side cheek shade
        ctx.save(); ctx.append_path(p); ctx.clip()
        ctx.move_to(f * 96, -330); ctx.curve_to(f * 112, -230, f * 100, -160, f * 40, -96)
        ctx.line_to(f * 200, -96); ctx.line_to(f * 200, -330); ctx.close_path()
        set_c(ctx, shade(self.skin, 0.9)); ctx.fill()
        ctx.restore()
        if self.old:
            self._beard(ctx, f)
        ctx.append_path(p)
        stroke(ctx, INK, OUTLINE)

    def _beard(self, ctx, f):
        c = hexc("#e9e6e1")
        cx = f * 14
        ctx.move_to(-120, -232)
        ctx.curve_to(-118, -150, -70, -70, cx, -52)
        ctx.curve_to(70, -70, 118, -150, 120, -232)
        ctx.curve_to(100, -200, 70, -150, cx + 40, -146)
        ctx.curve_to(cx + 22, -158, cx - 22, -158, cx - 40, -146)
        ctx.curve_to(-70, -150, -100, -200, -120, -232)
        ctx.close_path()
        fill_stroke(ctx, c)
        for k in range(5):
            x = -70 + k * 35 + cx * 0.5
            ctx.move_to(x, -110 + abs(k - 2) * -8); ctx.line_to(x + 6, -80 + abs(k - 2) * -10)
        stroke(ctx, shade(c, 0.78), 3)

    def _face(self, ctx, f, ex, extras, talk, blink, look, t):
        fx = f * 20
        if "blush" in extras:
            for sx in (-1, 1):
                ellipse(ctx, fx + sx * 62, -150, 28, 12)
                set_c(ctx, (0.95, 0.45, 0.5, 0.45)); ctx.fill()
        if self.old:
            for sx in (-1, 1):
                ctx.move_to(fx + sx * 40, -160); ctx.curve_to(fx + sx * 55, -150, fx + sx * 70, -152, fx + sx * 80, -165)
                ctx.move_to(fx + sx * 82, -200); ctx.line_to(fx + sx * 96, -192)
            ctx.move_to(fx - 40, -300); ctx.curve_to(fx - 10, -310, fx + 10, -310, fx + 40, -300)
            ctx.move_to(fx - 30, -285); ctx.curve_to(fx - 10, -292, fx + 10, -292, fx + 30, -285)
            stroke(ctx, shade(self.skin, 0.65), 3)
        lid = max(ex["lid"], blink)
        mode = ex["eyes"]
        if blink > 0.85 and mode in ("normal", "dead", "shock"):
            mode = "closed"
        for side in (-1, 1):
            cx = fx + side * 56
            far = (side == 1) == (f > 0)
            sx = 0.84 if far else 1.0
            ctx.save()
            ctx.translate(cx, -200)
            ctx.scale(sx, 1)
            self._eye(ctx, side, mode, lid, look * 7 + f * 5, t)
            ctx.restore()
        # nose
        ctx.move_to(fx + f * 6, -168); ctx.line_to(fx + f * 12, -152); ctx.line_to(fx + f * 2, -150)
        stroke(ctx, shade(self.skin, 0.62), 4)
        self._mouth(ctx, fx * 0.8, -126, ex["mouth"], talk, t)

    def _eye(self, ctx, side, mode, lid, lookx, t):
        if mode == "happy":
            ctx.move_to(-28, 10); ctx.curve_to(-18, -16, 18, -16, 28, 10)
            stroke(ctx, INK, 9)
            return
        if mode == "closed":
            ctx.move_to(-28, 2); ctx.curve_to(-14, 14, 14, 14, 28, 2)
            stroke(ctx, INK, 8)
            ctx.move_to(side * 26, 4); ctx.line_to(side * 36, -2)
            stroke(ctx, INK, 5)
            return
        ellipse(ctx, 0, 2, 30, 36)
        sclera = ctx.copy_path()
        set_c(ctx, (1, 1, 1)); ctx.fill()
        ctx.save(); ctx.append_path(sclera); ctx.clip()
        if mode == "shock":
            jx = math.sin(t * 61) * 1.6
            ellipse(ctx, jx, 4, 6.5, 7.5)
            set_c(ctx, INK); ctx.fill()
        else:
            dull = mode == "dead"
            iris = shade(self.iris, 0.55) if dull else self.iris
            if dull:
                g = sum(iris[:3]) / 3
                iris = (g * 0.9, g * 0.9, g * 1.0)
            ellipse(ctx, lookx, 5, 22, 30)
            ctx.set_source(lin_grad(0, -25, 0, 35, [(0, shade(iris, 0.55)), (0.55, iris), (1, shade(iris, 1.35))]))
            ctx.fill_preserve()
            stroke(ctx, shade(iris, 0.45), 3)
            ellipse(ctx, lookx, 6, 10, 15)
            set_c(ctx, shade(iris, 0.3)); ctx.fill()
            if not dull:
                ellipse(ctx, lookx - 8, -7, 8, 9)
                set_c(ctx, (1, 1, 1)); ctx.fill()
                ellipse(ctx, lookx + 9, 16, 3.5, 3.5)
                ctx.fill()
        # lid cover
        ly = -34 + lid * 72
        if lid > 0.01:
            ctx.rectangle(-40, -50, 80, ly + 50)
            set_c(ctx, self.skin); ctx.fill()
        ctx.restore()
        # upper lash follows the lid
        ctx.move_to(-33, ly + 14)
        ctx.curve_to(-22, ly - 6, 22, ly - 6, 33, ly + 14)
        stroke(ctx, INK, 9 if not self.old else 6)
        ctx.move_to(side * 30, ly + 8); ctx.line_to(side * 41, ly + 1)
        stroke(ctx, INK, 6)
        ctx.move_to(-side * 6, 38); ctx.line_to(side * 14, 37)
        stroke(ctx, INK, 3)

    def _mouth(self, ctx, mx, my, shape, talk, t):
        if talk > 0.08 or shape == "shock":
            if shape == "shock":
                op = max(talk, 0.75)
                ellipse(ctx, mx, my + 12, 20 + talk * 4, 14 + op * 18)
            else:
                op = talk
                w = 26 if shape not in ("grin", "smile", "smirk") else 30
                up = 6 if shape in ("grin", "smile", "smirk") else 0
                ctx.move_to(mx - w, my - up)
                ctx.curve_to(mx - w * 0.4, my + 2, mx + w * 0.4, my + 2, mx + w, my - up)
                ctx.curve_to(mx + w * 0.8, my + 10 + op * 38, mx - w * 0.8, my + 10 + op * 38, mx - w, my - up)
                ctx.close_path()
            p = ctx.copy_path()
            set_c(ctx, hexc("#5b1d28")); ctx.fill()
            ctx.save(); ctx.append_path(p); ctx.clip()
            ellipse(ctx, mx + 4, my + 12 + op * 34, 18, 12)
            set_c(ctx, hexc("#e06a78")); ctx.fill()
            if shape in ("grin",):
                ctx.rectangle(mx - 40, my - 14, 80, 12)
                set_c(ctx, (1, 1, 1)); ctx.fill()
            ctx.restore()
            ctx.append_path(p)
            stroke(ctx, INK, 4.5)
            return
        if shape == "neutral":
            ctx.move_to(mx - 14, my + 2); ctx.curve_to(mx - 4, my + 4, mx + 6, my + 4, mx + 14, my + 1)
            stroke(ctx, INK, 4.5)
        elif shape == "smile":
            ctx.move_to(mx - 22, my - 4); ctx.curve_to(mx - 8, my + 10, mx + 8, my + 10, mx + 22, my - 4)
            stroke(ctx, INK, 4.5)
        elif shape == "grin":
            ctx.move_to(mx - 26, my - 6)
            ctx.curve_to(mx - 10, my - 2, mx + 10, my - 2, mx + 26, my - 6)
            ctx.curve_to(mx + 18, my + 30, mx - 18, my + 30, mx - 26, my - 6)
            ctx.close_path()
            p = ctx.copy_path()
            set_c(ctx, hexc("#5b1d28")); ctx.fill()
            ctx.save(); ctx.append_path(p); ctx.clip()
            ctx.rectangle(mx - 30, my - 10, 60, 11); set_c(ctx, (1, 1, 1)); ctx.fill()
            ellipse(ctx, mx, my + 22, 14, 9); set_c(ctx, hexc("#e06a78")); ctx.fill()
            ctx.restore()
            ctx.append_path(p); stroke(ctx, INK, 4.5)
        elif shape == "smirk":
            ctx.move_to(mx - 16, my + 4); ctx.curve_to(mx, my + 6, mx + 12, my + 2, mx + 22, my - 8)
            stroke(ctx, INK, 4.5)
        elif shape == "frown":
            ctx.move_to(mx - 16, my + 6); ctx.curve_to(mx - 6, my - 4, mx + 6, my - 4, mx + 16, my + 6)
            stroke(ctx, INK, 4.5)
        elif shape == "wobble":
            pts = [(mx - 20 + i * 8, my + (3 if i % 2 else -3)) for i in range(6)]
            smooth_open(ctx, pts)
            stroke(ctx, INK, 4)

    def _brows(self, ctx, f, ex):
        inner, outer = ex["brows"]
        c = shade(self.hair, 0.55) if not self.old else hexc("#d9d6d0")
        w = 9 if not self.old else 14
        fx = f * 20
        for side in (-1, 1):
            cx = fx + side * 56
            y0 = -262
            ix, iy = cx - side * 26, y0 + inner
            ox, oy = cx + side * 30, y0 + outer + 4
            mx_, my_ = (ix + ox) / 2, (iy + oy) / 2 - 7
            ctx.move_to(ix, iy); ctx.curve_to(mx_, my_, mx_, my_, ox, oy)
            stroke(ctx, INK, w + 4)
            ctx.move_to(ix, iy); ctx.curve_to(mx_, my_, mx_, my_, ox, oy)
            stroke(ctx, c, w)

    def _glasses(self, ctx, f):
        fx = f * 20
        for side in (-1, 1):
            cx = fx + side * 56
            far = (side == 1) == (f > 0)
            w = 84 * (0.86 if far else 1)
            rounded_rect(ctx, cx - w / 2, -240, w, 76, 20)
            set_c(ctx, (0.85, 0.92, 1.0, 0.18)); ctx.fill_preserve()
            stroke(ctx, hexc("#2b2b3a"), 6)
            ctx.move_to(cx - w * 0.25, -228); ctx.line_to(cx - w * 0.05, -200)
            stroke(ctx, (1, 1, 1, 0.6), 4)
        ctx.move_to(fx - 14, -214); ctx.curve_to(fx - 6, -224, fx + 6, -224, fx + 14, -214)
        stroke(ctx, hexc("#2b2b3a"), 6)

    # ============================================================== hair
    def _hair_back(self, ctx, f, t):
        c = self.hair if not self.old else hexc("#e2dfda")
        sway = math.sin(t * 1.7) * 3
        if self.style == "spiky":
            tips = [(-200, 182), (-172, 205), (-143, 222), (-114, 232), (-86, 236),
                    (-58, 222), (-30, 210), (-4, 192), (18, 168)]
            pts = []
            for i, (ad, r) in enumerate(tips):
                if i:
                    va = math.radians((tips[i - 1][0] + ad) / 2 - 4)
                    pts.append((math.cos(va) * 142 - f * 8, -262 + math.sin(va) * 140))
                a = math.radians(ad + 9)
                pts.append((math.cos(a) * r + sway - f * 8, -262 + math.sin(a) * r * 0.95))
            ctx.move_to(*pts[0])
            for p in pts[1:]:
                ctx.line_to(*p)
            ctx.line_to(110, -180); ctx.line_to(-110, -180); ctx.close_path()
            fill_stroke(ctx, shade(c, 0.85))
        elif self.style == "bob":
            pts = [(-152, -240), (-140, -345), (-75, -405), (0, -414), (75, -405), (140, -345),
                   (154, -240), (164 + sway, -140), (148, -86), (100, -96), (0, -110), (-100, -96),
                   (-148, -86), (-164 + sway, -140)]
            smooth_closed(ctx, [(x - f * 6, y) for x, y in pts], 0.45)
            p = ctx.copy_path()
            set_c(ctx, c); ctx.fill()
            ctx.save(); ctx.append_path(p); ctx.clip()
            ellipse(ctx, 0, -120, 130, 60); set_c(ctx, shade(c, 0.6)); ctx.fill()
            ctx.restore()
            ctx.append_path(p); stroke(ctx, INK, OUTLINE)
        elif self.style == "old":
            for sx in (-1, 1):
                pts = [(sx * 112, -300), (sx * 150, -290), (sx * 165, -250), (sx * 150, -215),
                       (sx * 160, -185), (sx * 135, -160), (sx * 112, -190)]
                smooth_closed(ctx, pts, 0.5)
                fill_stroke(ctx, c)

    def _hair_front(self, ctx, f, t):
        c = self.hair if not self.old else hexc("#e2dfda")
        hi = shade(c, 1.35)
        sway = math.sin(t * 1.7 + 0.6) * 2.5
        if self.style == "spiky":
            ctx.move_to(-132, -236)
            ctx.arc(0, -258, 133, math.radians(170), math.radians(370))
            ctx.line_to(132, -236)
            # zig-zag fringe back to the left
            xs = [116, 92, 64, 36, 6, -24, -54, -84, -112]
            for i, x in enumerate(xs):
                y = -222 if i % 2 == 0 else -292
                if i % 2 == 0:
                    x += f * 14 + sway
                ctx.line_to(x + f * 8, y - (abs(x) / 9 if i % 2 == 0 else 0))
            ctx.line_to(-138, -190)
            ctx.close_path()
            p = ctx.copy_path()
            set_c(ctx, c); ctx.fill()
            ctx.save(); ctx.append_path(p); ctx.clip()
            ctx.arc(f * 10, -262, 100, math.radians(205), math.radians(300))
            stroke(ctx, hi, 14)
            ctx.restore()
            ctx.append_path(p); stroke(ctx, INK, OUTLINE)
        elif self.style == "bob":
            pts = [(-140, -186), (-138, -300), (-82, -388), (0, -400), (82, -388), (138, -300),
                   (144, -190 + sway), (118, -252), (70, -268), (20, -290), (-40, -300),
                   (-86, -282), (-112, -236)]
            smooth_closed(ctx, [(x + (f * 10 if y < -240 else 0), y) for x, y in pts], 0.35)
            p = ctx.copy_path()
            set_c(ctx, c); ctx.fill()
            ctx.save(); ctx.append_path(p); ctx.clip()
            ctx.arc(f * 10, -255, 112, math.radians(215), math.radians(290))
            stroke(ctx, hi, 13)
            ctx.restore()
            ctx.append_path(p); stroke(ctx, INK, OUTLINE)
        elif self.style == "old":
            for k in (-1, 0, 1):
                ctx.move_to(k * 30 + f * 8, -372)
                ctx.curve_to(k * 30 + 30, -420 + sway, k * 30 + 60, -400, k * 30 + 50, -372)
                stroke(ctx, INK, 9)
                ctx.move_to(k * 30 + f * 8, -372)
                ctx.curve_to(k * 30 + 30, -420 + sway, k * 30 + 60, -400, k * 30 + 50, -372)
                stroke(ctx, c, 4)
            # shine on the bald head
            ctx.arc(f * -30, -320, 48, math.radians(200), math.radians(260))
            stroke(ctx, (1, 1, 1, 0.55), 10)

    # ============================================================== effects
    def _extras(self, ctx, f, extras, t):
        if "sweat" in extras:
            x, y = -f * 128, -300 + (t * 40) % 30
            ctx.move_to(x, y - 34)
            ctx.curve_to(x + 22, y - 4, x + 20, y + 16, x, y + 16)
            ctx.curve_to(x - 20, y + 16, x - 22, y - 4, x, y - 34)
            fill_stroke(ctx, hexc("#a9dcff"), INK, 4)
            ellipse(ctx, x - 6, y + 2, 4, 6); set_c(ctx, (1, 1, 1)); ctx.fill()
        if "shock_lines" in extras:
            for k in range(3):
                a = math.radians(-130 + k * 25) if f > 0 else math.radians(-50 - k * 25)
                a = math.radians(-150 + k * 22) * (1 if f < 0 else 1)
                for sx in (-1, 1):
                    aa = a if sx < 0 else math.pi - a
                    r0, r1 = 175, 225 + (math.sin(t * 40 + k) * 6)
                    ctx.move_to(math.cos(aa) * r0, -262 + math.sin(aa) * r0)
                    ctx.line_to(math.cos(aa) * r1, -262 + math.sin(aa) * r1)
            stroke(ctx, INK, 7)
        if "gloom" in extras:
            ctx.save()
            self._head_path(ctx, f); ctx.clip()
            ctx.rectangle(-140, -400, 280, 180)
            ctx.set_source(lin_grad(0, -400, 0, -215, [(0, (0.25, 0.22, 0.45, 0.55)), (1, (0.25, 0.22, 0.45, 0.0))]))
            ctx.fill()
            for k in range(7):
                x = -90 + k * 30 + f * 20
                ctx.move_to(x, -330); ctx.line_to(x, -250 - (k % 3) * 12)
            stroke(ctx, (0.2, 0.17, 0.4, 0.7), 5)
            ctx.restore()
        if "sparkle" in extras:
            x, y = f * 20 + f * 110, -250
            s = 22 + math.sin(t * 12) * 6
            ctx.move_to(x, y - s); ctx.line_to(x + s * 0.25, y - s * 0.25); ctx.line_to(x + s, y)
            ctx.line_to(x + s * 0.25, y + s * 0.25); ctx.line_to(x, y + s); ctx.line_to(x - s * 0.25, y + s * 0.25)
            ctx.line_to(x - s, y); ctx.line_to(x - s * 0.25, y - s * 0.25); ctx.close_path()
            fill_stroke(ctx, hexc("#fff3a8"), INK, 3)
        if "anger" in extras:
            x, y = -f * 70, -330
            for a in range(4):
                ang = a * math.pi / 2 + math.pi / 4
                ctx.move_to(x + math.cos(ang) * 6, y + math.sin(ang) * 6)
                ctx.line_to(x + math.cos(ang) * 22, y + math.sin(ang) * 22)
            stroke(ctx, hexc("#e0413a"), 8)
