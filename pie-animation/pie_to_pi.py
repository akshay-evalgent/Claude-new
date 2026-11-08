"""
Pie -> pi: why a pie's area is pi r^2.

A pumpkin pie is cut into slices and the slices are laid out in a row,
alternating tip-up and tip-down. Half the crust ends up on top, half on
the bottom. With more and more slices the row becomes a rectangle that is
(half the crust) = pi r wide and r tall, so the pie's area is pi r^2.

Built with 3Blue1Brown's manim (manimgl): https://github.com/3b1b/manim

Render (from this folder, so custom_config.yml is picked up):
    manimgl pie_to_pi.py PieToPi -w            # 1080p mp4 in ./videos
    manimgl pie_to_pi.py PieToPi -w --fps 60   # smoother
    manimgl pie_to_pi.py PieToPi               # interactive preview window
"""

from manimlib import *

import numpy as np


# ---------------------------------------------------------------------------
# Look
# ---------------------------------------------------------------------------
BG = "#1C1D22"
FILLING = "#D9772B"        # pumpkin
FILLING_SPECK = "#A9521C"  # nutmeg / spice flecks
CRUST = "#E9B872"
CRUST_DARK = "#B9823F"     # crimp marks
RADIUS_COLOR = "#58C4DD"   # 3b1b blue
PI_COLOR = "#FFD34E"
FONT = "Inter"

R = 1.9                     # pie radius (scene units)
CRUST_IN = 0.82 * R         # where the filling stops and the crust starts
PIE_CENTER = np.array([-3.6, -0.2, 0.0])
ROW_CENTER = np.array([2.7, -0.2, 0.0])

N_CRIMPS = 40
rng = np.random.default_rng(3)
# Spice flecks in polar coordinates, shared by every cut so the pie looks
# the same no matter how many slices it's in.
SPECKS = [
    (rng.uniform(0, TAU), CRUST_IN * np.sqrt(rng.uniform(0.02, 0.85)), rng.uniform(0.018, 0.035))
    for _ in range(70)
]


def polar(angle, radius=1.0):
    return radius * np.array([np.cos(angle), np.sin(angle), 0.0])


def wrap_angle(a):
    """Map an angle to (-pi, pi] so a slice turns the short way round."""
    return (a + PI) % TAU - PI


# ---------------------------------------------------------------------------
# Building the pie and its slices
# ---------------------------------------------------------------------------
def pie_details(center, a_start=0.0, a_end=TAU):
    """Crimps on the crust and spice flecks in the filling, within [a_start, a_end)."""
    crimps = VGroup()
    for j in range(N_CRIMPS):
        a = (j + 0.5) * TAU / N_CRIMPS
        if a_start <= a < a_end:
            crimps.add(Line(
                center + polar(a, CRUST_IN + 0.07 * R),
                center + polar(a, R - 0.05 * R),
                stroke_color=CRUST_DARK, stroke_width=2.5,
            ))
    specks = VGroup()
    for a, rad, size in SPECKS:
        if a_start <= a < a_end:
            specks.add(Dot(
                center + polar(a, rad), radius=size,
                fill_color=FILLING_SPECK, fill_opacity=0.9, stroke_width=0,
            ))
    return VGroup(crimps, specks)


def whole_pie(center, edge_width):
    filling = Circle(
        radius=CRUST_IN, fill_color=FILLING, fill_opacity=1,
        stroke_color=BG, stroke_width=edge_width,
    ).move_to(center)
    crust = Annulus(
        inner_radius=CRUST_IN, outer_radius=R,
        fill_color=CRUST, fill_opacity=1, stroke_width=0,
    ).move_to(center)
    return VGroup(crust, filling, pie_details(center))


def make_slices(n, center, edge_width):
    """n slices of the pie. Each remembers where its tip is and where it points."""
    slices = []
    da = TAU / n
    for k in range(n):
        a0 = k * da
        filling = Sector(
            angle=da, radius=CRUST_IN, start_angle=a0, arc_center=center,
            fill_color=FILLING, fill_opacity=1,
            stroke_color=BG, stroke_width=edge_width,
        )
        crust = AnnularSector(
            angle=da, start_angle=a0, inner_radius=CRUST_IN, outer_radius=R,
            arc_center=center, fill_color=CRUST, fill_opacity=1,
            stroke_color=BG, stroke_width=edge_width,
        )
        s = VGroup(crust, filling, pie_details(center, a0, a0 + da))
        s.crust = crust
        s.tip = center.copy()
        s.heading = a0 + da / 2      # direction from tip to the middle of the crust
        s.home_heading = s.heading
        slices.append(s)
    return slices


def cut_lines(n, center, edge_width):
    return VGroup(*(
        Line(center, center + polar(k * TAU / n, R * 1.002), stroke_color=BG, stroke_width=edge_width)
        for k in range(n)
    ))


def row_slots(n, center):
    """
    Where each slot of the laid-out row puts a slice's tip, and which way it
    points. Even slots: tip down, crust up. Odd slots: tip up, crust down.
    Neighbouring slices share a cut edge exactly.
    """
    step = R * np.sin(PI / n)
    height = R * np.cos(PI / n)
    x0 = center[0] - (n - 1) * step / 2
    slots = []
    for i in range(n):
        up = (i % 2 == 0)
        y = center[1] - height / 2 if up else center[1] + height / 2
        slots.append((np.array([x0 + i * step, y, 0.0]), PI / 2 if up else -PI / 2))
    return slots


def row_order(slices):
    """
    Top half of the pie fills the crust-up slots (left to right), bottom half
    fills the crust-down slots, so the crust "unrolls" onto the top and bottom.
    """
    n = len(slices)
    top = slices[: n // 2][::-1]
    bottom = slices[n // 2:]
    order = []
    for t, b in zip(top, bottom):
        order += [t, b]
    return order


def move_slice(s, tip, heading, **kwargs):
    """Rigid motion (rotate about the tip + translate) so slices never warp mid-flight."""
    start = s.copy()
    tip0 = s.tip.copy()
    turn = wrap_angle(heading - s.heading)
    shift = tip - tip0

    def update(m, alpha):
        m.become(start)
        m.rotate(alpha * turn, about_point=tip0)
        m.shift(alpha * shift)

    s.tip = np.array(tip, dtype=float)
    s.heading = s.heading + turn
    return UpdateFromAlphaFunc(s, update, **kwargs)


# ---------------------------------------------------------------------------
# The scene
# ---------------------------------------------------------------------------
class PieToPi(Scene):
    def construct(self):
        self.intro()
        self.meet_the_pie()
        slices = self.cut_and_lay_out(8, edge_width=3.0, first=True)
        slices = self.recut(slices, 16, edge_width=2.2, caption="More slices...")
        slices = self.recut(slices, 48, edge_width=1.2, caption="...and more slices")
        self.it_is_a_rectangle(slices)
        self.outro(slices)

    # -- helpers -----------------------------------------------------------
    def set_caption(self, text, run_time=1.0):
        new = Text(text, font=FONT, font_size=34, fill_color=GREY_A)
        new.move_to(2.45 * UP)
        old = getattr(self, "caption", None)
        if old is None:
            self.play(FadeIn(new, shift=0.15 * UP), run_time=run_time)
        else:
            self.play(
                LaggedStart(
                    FadeOut(old, shift=0.15 * UP),
                    FadeIn(new, shift=0.15 * UP),
                    lag_ratio=0.85,
                ),
                run_time=run_time,
            )
        self.caption = new

    # -- acts --------------------------------------------------------------
    def intro(self):
        word = Text("pie", font=FONT, font_size=160)
        pi = Tex(R"\pi", font_size=260, fill_color=PI_COLOR)
        self.play(Write(word), run_time=1.2)
        self.wait(0.4)
        self.play(FadeTransform(word, pi), run_time=1.2)
        self.wait(0.4)

        q1 = Text("Why does a pie have area", font=FONT, font_size=40)
        q2 = Tex(R"\pi r^2", font_size=56)
        q2[0].set_fill(PI_COLOR)
        q3 = Text("?", font=FONT, font_size=40)
        title = VGroup(q1, q2, q3).arrange(RIGHT, buff=0.2)
        q2.align_to(q1, DOWN).shift(0.04 * DOWN)
        q3.align_to(q1, DOWN)
        title.to_edge(UP, buff=0.45)

        self.play(
            ReplacementTransform(pi, q2[0]),
            FadeIn(q1, shift=0.2 * RIGHT),
            FadeIn(q2[1:], shift=0.2 * LEFT),
            FadeIn(q3),
            run_time=1.5,
        )
        self.title = title

    def meet_the_pie(self):
        pie = whole_pie(PIE_CENTER, edge_width=3.0)
        self.play(GrowFromCenter(pie), run_time=1.3, rate_func=lambda t: overshoot(t, 1.2))
        self.pie = pie

        # radius
        dot = Dot(PIE_CENTER, radius=0.06, fill_color=WHITE)
        radius = Line(PIE_CENTER, PIE_CENTER + R * RIGHT, stroke_color=RADIUS_COLOR, stroke_width=6)
        r_label = Tex("r", font_size=52, fill_color=RADIUS_COLOR)
        r_label.next_to(radius, UP, buff=0.12)
        r_label.set_backstroke(BG, 6)
        self.set_caption("Say the pie has radius r")
        self.play(FadeIn(dot), ShowCreation(radius), run_time=1)
        self.play(Write(r_label), run_time=0.8)
        self.wait(0.6)

        # crust = circumference
        rim = Circle(radius=R, stroke_color=PI_COLOR, stroke_width=7).move_to(PIE_CENTER)
        crust_label = Tex(R"\text{crust} = 2\pi r", t2c={R"2\pi r": PI_COLOR}, font_size=44)
        crust_label.next_to(PIE_CENTER + R * DOWN, DOWN, buff=0.35)
        self.set_caption("Its crust runs all the way round: the circumference")
        self.play(ShowCreation(rim), run_time=2)
        self.play(Write(crust_label), run_time=1)
        self.wait(0.8)
        self.play(FadeOut(rim), FadeOut(VGroup(dot, radius, r_label)), run_time=0.8)
        self.crust_label = crust_label

    def cut(self, n, edge_width):
        """Draw the knife cuts over the whole pie, then swap it for separate slices."""
        knife = cut_lines(n, PIE_CENTER, edge_width)
        self.play(
            LaggedStart(*(ShowCreation(l) for l in knife), lag_ratio=0.08),
            run_time=1.2 if n <= 16 else 1.6,
        )
        slices = make_slices(n, PIE_CENTER, edge_width)
        self.remove(self.pie, knife)
        self.add(*slices)
        return slices

    def lay_out(self, slices, run_time=3.0, lag_ratio=0.12):
        n = len(slices)
        anims = [
            move_slice(s, tip, heading, rate_func=smooth)
            for s, (tip, heading) in zip(row_order(slices), row_slots(n, ROW_CENTER))
        ]
        self.play(LaggedStart(*anims, lag_ratio=lag_ratio), run_time=run_time)

    def gather(self, slices, run_time=2.0):
        anims = [
            move_slice(s, PIE_CENTER.copy(), s.home_heading, rate_func=smooth)
            for s in row_order(slices)
        ]
        self.play(LaggedStart(*anims, lag_ratio=0.06), run_time=run_time)

    def cut_and_lay_out(self, n, edge_width, first=False):
        self.set_caption(f"Cut it into {n} slices")
        slices = self.cut(n, edge_width)

        # nudge the slices apart so they read as separate pieces
        anims = []
        for s in slices:
            out = 0.14 * polar(s.heading)
            anims.append(s.animate.shift(out))
            s.tip = s.tip + out
        self.play(*anims, run_time=0.7)

        ghost = DashedVMobject(
            Circle(radius=R, stroke_color=GREY_B, stroke_width=2).move_to(PIE_CENTER),
            num_dashes=60,
        ).set_stroke(opacity=0.45)
        self.ghost = ghost

        self.set_caption("Lay them out in a row, alternating up and down", run_time=0.8)
        self.play(FadeIn(ghost), run_time=0.4)
        self.lay_out(slices, run_time=3.2, lag_ratio=0.12)
        self.wait(0.5)

        # half the crust on top, half on the bottom
        order = row_order(slices)
        top = VGroup(*(s.crust for s in order[0::2]))
        bottom = VGroup(*(s.crust for s in order[1::2]))
        row = VGroup(*slices)

        top_brace = Brace(row, UP, buff=0.12)
        top_label = Tex(R"\tfrac{1}{2}(2\pi r) = \pi r", font_size=40, t2c={R"\pi r": PI_COLOR})
        top_label.next_to(top_brace, UP, buff=0.1)
        bot_brace = Brace(row, DOWN, buff=0.12)
        bot_label = top_label.copy().next_to(bot_brace, DOWN, buff=0.1)

        self.set_caption("Half the crust ends up on top, half on the bottom")
        self.play(top.animate.set_fill(PI_COLOR), run_time=0.8)
        self.play(GrowFromCenter(top_brace), FadeIn(top_label, shift=0.1 * UP))
        self.wait(0.6)
        self.play(bottom.animate.set_fill(PI_COLOR), run_time=0.8)
        self.play(GrowFromCenter(bot_brace), FadeIn(bot_label, shift=0.1 * DOWN))
        self.wait(1.2)
        self.play(
            top.animate.set_fill(CRUST), bottom.animate.set_fill(CRUST),
            FadeOut(VGroup(top_brace, top_label, bot_brace, bot_label)),
            run_time=0.8,
        )
        self.set_caption("The edges are still bumpy, though")
        self.wait(0.8)
        return slices

    def recut(self, slices, n, edge_width, caption):
        self.set_caption(caption, run_time=0.6)
        self.gather(slices, run_time=1.8)
        # the gathered slices are the pie again
        old = VGroup(*slices)
        self.pie = old
        new_slices = self.cut(n, edge_width)
        self.remove(old)
        self.set_caption(f"{n} slices", run_time=0.5)
        self.lay_out(new_slices, run_time=2.6, lag_ratio=2.0 / n)
        self.wait(0.6)
        return new_slices

    def it_is_a_rectangle(self, slices):
        row = VGroup(*slices)
        self.set_caption("...until it's basically a rectangle")

        rect = Rectangle(width=PI * R, height=R, stroke_color=WHITE, stroke_width=3)
        rect.move_to(row)
        self.play(ShowCreation(rect), run_time=1.2)
        self.play(FadeOut(rect), run_time=0.6)

        width_brace = Brace(row, UP, buff=0.12)
        width_label = Tex(R"\pi r", font_size=48, t2c={R"\pi r": PI_COLOR})
        width_label.next_to(width_brace, UP, buff=0.1)
        height_brace = Brace(row, LEFT, buff=0.12)
        height_label = Tex("r", font_size=48, fill_color=RADIUS_COLOR)
        height_label.next_to(height_brace, LEFT, buff=0.12)

        self.set_caption("Width: half the crust.   Height: the radius.")
        self.play(GrowFromCenter(width_brace), FadeIn(width_label, shift=0.1 * UP))
        self.play(GrowFromCenter(height_brace), FadeIn(height_label, shift=0.1 * LEFT))
        self.wait(0.6)

        f1 = Tex(R"A = \pi r \times r", font_size=60, t2c={R"\pi": PI_COLOR})
        f1.next_to(row, DOWN, buff=0.55)
        f2 = Tex(R"A = \pi r^2", font_size=72, t2c={R"\pi": PI_COLOR})
        f2.move_to(f1)
        self.set_caption("Area = width × height")
        self.play(Write(f1), run_time=1.2)
        self.wait(0.6)
        self.play(TransformMatchingTex(f1, f2), run_time=1.2)
        box = SurroundingRectangle(f2, buff=0.2, stroke_color=PI_COLOR, stroke_width=3)
        self.play(ShowCreation(box), run_time=0.8)
        self.wait(1.2)

        self.braces = VGroup(width_brace, width_label, height_brace, height_label)
        self.formula = VGroup(f2, box)

    def outro(self, slices):
        self.set_caption("That's why a pie's area is π r²")
        self.play(FadeOut(self.braces), run_time=0.6)
        self.gather(slices, run_time=2.2)
        self.play(FadeOut(self.ghost), run_time=0.3)

        # Swap the 48 slices for a whole pie with one generous slice cut out.
        served = make_slices(8, PIE_CENTER, edge_width=3.0)
        self.play(FadeOut(VGroup(*slices)), FadeIn(VGroup(*served)), run_time=0.6)
        treat = served[1]
        out = 0.55 * polar(treat.heading)
        self.play(
            treat.animate.shift(out).rotate(-10 * DEGREES, about_point=treat.tip + out),
            self.formula.animate.move_to(ROW_CENTER + 0.3 * UP).scale(1.25),
            run_time=1.4,
        )
        self.wait(2.5)
        self.play(
            FadeOut(VGroup(*served)), FadeOut(self.formula), FadeOut(self.crust_label),
            FadeOut(self.title), FadeOut(self.caption),
            run_time=1.0,
        )
