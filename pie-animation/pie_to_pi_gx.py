"""
Pie -> pi: why a pie's area is pi r^2  (ManimGX version).

Same animation as pie_to_pi.py, written for ManimGX
(https://github.com/academa-labs/manimgx), which has Manim CE's API and a
Rust + wgpu renderer. No LaTeX install is needed: formulas are set with Typst.

A pumpkin pie is cut into slices and the slices are laid out in a row,
alternating tip-up and tip-down. Half the crust ends up on top, half on
the bottom. With more and more slices the row becomes a rectangle that is
(half the crust) = pi r wide and r tall, so the pie's area is pi r^2.

Render:
    manimgx render pie_to_pi_gx.py PieToPi                      # 1080p60 mp4
    manimgx render pie_to_pi_gx.py PieToPi -r 1280x720 --fps 30 # quick draft
    manimgx inspect pie_to_pi_gx.py PieToPi                     # storyboard + layout checks
"""

import manimgx as m
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
FONT = "sans-serif"

m.config.background_color = BG

TAU, PI = m.TAU, m.PI
UP, DOWN, LEFT, RIGHT = m.UP, m.DOWN, m.LEFT, m.RIGHT

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
    crimps = m.VGroup()
    for j in range(N_CRIMPS):
        a = (j + 0.5) * TAU / N_CRIMPS
        if a_start <= a < a_end:
            crimps.add(m.Line(
                center + polar(a, CRUST_IN + 0.07 * R),
                center + polar(a, R - 0.05 * R),
                stroke_color=CRUST_DARK, stroke_width=2.5,
            ))
    specks = m.VGroup()
    for a, rad, size in SPECKS:
        if a_start <= a < a_end:
            specks.add(m.Dot(
                center + polar(a, rad), radius=size,
                fill_color=FILLING_SPECK, fill_opacity=0.9, stroke_width=0,
            ))
    return m.VGroup(crimps, specks)


def whole_pie(center, edge_width):
    filling = m.Circle(
        radius=CRUST_IN, fill_color=FILLING, fill_opacity=1,
        stroke_color=BG, stroke_width=edge_width,
    ).move_to(center)
    crust = m.Annulus(
        inner_radius=CRUST_IN, outer_radius=R,
        fill_color=CRUST, fill_opacity=1, stroke_width=0,
    ).move_to(center)
    return m.VGroup(crust, filling, pie_details(center))


def make_slices(n, center, edge_width):
    """n slices of the pie. Each remembers where its tip is and where it points."""
    slices = []
    da = TAU / n
    for k in range(n):
        a0 = k * da
        filling = m.Sector(
            radius=CRUST_IN, angle=da, start_angle=a0, arc_center=center,
            fill_color=FILLING, fill_opacity=1,
            stroke_color=BG, stroke_width=edge_width,
        )
        crust = m.AnnularSector(
            inner_radius=CRUST_IN, outer_radius=R, angle=da, start_angle=a0,
            arc_center=center, fill_color=CRUST, fill_opacity=1,
            stroke_color=BG, stroke_width=edge_width,
        )
        s = m.VGroup(crust, filling, pie_details(center, a0, a0 + da))
        s.crust = crust
        s.tip = np.array(center, dtype=float)
        s.heading = a0 + da / 2      # direction from tip to the middle of the crust
        s.home_heading = s.heading
        slices.append(s)
    return slices


def cut_lines(n, center, edge_width):
    return m.VGroup(*(
        m.Line(center, center + polar(k * TAU / n, R * 1.002), stroke_color=BG, stroke_width=edge_width)
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
    shift = np.array(tip, dtype=float) - tip0

    def update(mob, alpha):
        mob.become(start)
        mob.rotate(alpha * turn, about_point=tip0)
        mob.shift(alpha * shift)

    s.tip = np.array(tip, dtype=float)
    s.heading = s.heading + turn
    return m.UpdateFromAlphaFunc(s, update, **kwargs)


# ---------------------------------------------------------------------------
# The scene
# ---------------------------------------------------------------------------
class PieToPi(m.Scene):
    def construct(self) -> None:
        self.caption = None
        self.intro()
        self.meet_the_pie()
        slices = self.cut_and_lay_out(8, edge_width=3.0)
        slices = self.recut(slices, 16, edge_width=2.2, caption="More slices...")
        slices = self.recut(slices, 48, edge_width=1.2, caption="...and more slices")
        self.it_is_a_rectangle(slices)
        self.outro(slices)

    # -- helpers -----------------------------------------------------------
    def set_caption(self, text, run_time=1.0):
        new = m.Text(text, font=FONT, font_size=30, color=m.GREY_A)
        new.move_to(2.45 * UP)
        if self.caption is None:
            self.play(m.FadeIn(new, shift=0.15 * UP), run_time=run_time)
        else:
            self.play(
                m.LaggedStart(
                    m.FadeOut(self.caption, shift=0.15 * UP),
                    m.FadeIn(new, shift=0.15 * UP),
                    lag_ratio=0.85,
                ),
                run_time=run_time,
            )
        self.caption = new

    # -- acts --------------------------------------------------------------
    def intro(self):
        word = m.Text("pie", font=FONT, font_size=150)
        pi = m.MathTex(R"\pi", font_size=260, color=PI_COLOR)
        self.play(m.Write(word), run_time=1.2)
        self.wait(0.4)
        self.play(m.FadeTransform(word, pi), run_time=1.2)
        self.wait(0.4)

        q1 = m.Text("Why does a pie have area", font=FONT, font_size=36)
        q2 = m.MathTex(R"\pi", "r^2", font_size=56)
        q2[0].set_color(PI_COLOR)
        q3 = m.Text("?", font=FONT, font_size=36)
        title = m.VGroup(q1, q2, q3).arrange(RIGHT, buff=0.2)
        q2.align_to(q1, DOWN).shift(0.04 * DOWN)
        q3.align_to(q1, DOWN)
        title.to_edge(UP, buff=0.45)

        self.play(
            m.ReplacementTransform(pi, q2[0]),
            m.FadeIn(q1, shift=0.2 * RIGHT),
            m.FadeIn(q2[1], shift=0.2 * LEFT),
            m.FadeIn(q3),
            run_time=1.5,
        )
        self.title = title

    def meet_the_pie(self):
        pie = whole_pie(PIE_CENTER, edge_width=3.0)
        self.play(m.GrowFromCenter(pie), run_time=1.3, rate_func=m.ease_out_back)
        self.pie = pie

        # radius
        dot = m.Dot(PIE_CENTER, radius=0.06, color=m.WHITE)
        radius = m.Line(PIE_CENTER, PIE_CENTER + R * RIGHT, stroke_color=RADIUS_COLOR, stroke_width=6)
        r_label = m.MathTex("r", font_size=52, color=RADIUS_COLOR)
        r_label.next_to(radius, UP, buff=0.12)
        r_label.set_stroke(BG, width=6, background=True)
        self.set_caption("Say the pie has radius r")
        self.play(m.FadeIn(dot), m.Create(radius), run_time=1)
        self.play(m.Write(r_label), run_time=0.8)
        self.wait(0.6)

        # crust = circumference
        rim = m.Circle(radius=R, stroke_color=PI_COLOR, stroke_width=7).move_to(PIE_CENTER)
        crust_label = m.MathTex(R"\text{crust} =", R"2\pi r", font_size=44)
        crust_label[1].set_color(PI_COLOR)
        crust_label.next_to(PIE_CENTER + R * DOWN, DOWN, buff=0.35)
        self.set_caption("Its crust runs all the way round: the circumference")
        self.play(m.Create(rim), run_time=2)
        self.play(m.Write(crust_label), run_time=1)
        self.wait(0.8)
        self.play(m.FadeOut(rim), m.FadeOut(m.VGroup(dot, radius, r_label)), run_time=0.8)
        self.crust_label = crust_label

    def cut(self, n, edge_width, current):
        """Draw the knife cuts over the pie, then swap it for n separate slices."""
        knife = cut_lines(n, PIE_CENTER, edge_width)
        self.play(
            m.LaggedStart(*(m.Create(line) for line in knife), lag_ratio=0.08),
            run_time=1.2 if n <= 16 else 1.6,
        )
        slices = make_slices(n, PIE_CENTER, edge_width)
        self.remove(*current, knife)
        self.add(*slices)
        return slices

    def lay_out(self, slices, run_time=3.0, lag_ratio=0.12):
        n = len(slices)
        anims = [
            move_slice(s, tip, heading, rate_func=m.smooth)
            for s, (tip, heading) in zip(row_order(slices), row_slots(n, ROW_CENTER))
        ]
        self.play(m.LaggedStart(*anims, lag_ratio=lag_ratio), run_time=run_time)

    def gather(self, slices, run_time=2.0):
        anims = [
            move_slice(s, PIE_CENTER.copy(), s.home_heading, rate_func=m.smooth)
            for s in row_order(slices)
        ]
        self.play(m.LaggedStart(*anims, lag_ratio=0.06), run_time=run_time)

    def cut_and_lay_out(self, n, edge_width):
        self.set_caption(f"Cut it into {n} slices")
        slices = self.cut(n, edge_width, [self.pie])

        # nudge the slices apart so they read as separate pieces
        anims = []
        for s in slices:
            out = 0.14 * polar(s.heading)
            anims.append(s.animate.shift(out))
            s.tip = s.tip + out
        self.play(*anims, run_time=0.7)

        ghost = m.DashedVMobject(
            m.Circle(radius=R, stroke_color=m.GREY_B, stroke_width=2).move_to(PIE_CENTER),
            num_dashes=60,
        ).set_stroke(opacity=0.45)
        self.ghost = ghost

        self.set_caption("Lay them out in a row, alternating up and down", run_time=0.8)
        self.play(m.FadeIn(ghost), run_time=0.4)
        self.lay_out(slices, run_time=3.2, lag_ratio=0.12)
        self.wait(0.5)

        # half the crust on top, half on the bottom
        order = row_order(slices)
        top = m.VGroup(*(s.crust for s in order[0::2]))
        bottom = m.VGroup(*(s.crust for s in order[1::2]))
        row = m.VGroup(*slices)

        def half_crust_label():
            label = m.MathTex(R"\tfrac{1}{2}(2\pi r) =", R"\pi r", font_size=40)
            label[1].set_color(PI_COLOR)
            return label

        top_brace = m.Brace(row, UP, buff=0.12)
        top_label = half_crust_label().next_to(top_brace, UP, buff=0.1)
        bot_brace = m.Brace(row, DOWN, buff=0.12)
        bot_label = half_crust_label().next_to(bot_brace, DOWN, buff=0.1)

        self.set_caption("Half the crust ends up on top, half on the bottom")
        self.play(top.animate.set_fill(PI_COLOR), run_time=0.8)
        self.play(m.GrowFromCenter(top_brace), m.FadeIn(top_label, shift=0.1 * UP))
        self.wait(0.6)
        self.play(bottom.animate.set_fill(PI_COLOR), run_time=0.8)
        self.play(m.GrowFromCenter(bot_brace), m.FadeIn(bot_label, shift=0.1 * DOWN))
        self.wait(1.2)
        self.play(
            top.animate.set_fill(CRUST), bottom.animate.set_fill(CRUST),
            m.FadeOut(m.VGroup(top_brace, top_label, bot_brace, bot_label)),
            run_time=0.8,
        )
        self.set_caption("The edges are still bumpy, though")
        self.wait(0.8)
        return slices

    def recut(self, slices, n, edge_width, caption):
        self.set_caption(caption, run_time=0.6)
        self.gather(slices, run_time=1.8)
        new_slices = self.cut(n, edge_width, slices)
        self.set_caption(f"{n} slices", run_time=0.5)
        self.lay_out(new_slices, run_time=2.6, lag_ratio=2.0 / n)
        self.wait(0.6)
        return new_slices

    def it_is_a_rectangle(self, slices):
        row = m.VGroup(*slices)
        self.set_caption("...until it's basically a rectangle")

        rect = m.Rectangle(width=PI * R, height=R, stroke_color=m.WHITE, stroke_width=3)
        rect.move_to(row)
        self.play(m.Create(rect), run_time=1.2)
        self.play(m.FadeOut(rect), run_time=0.6)

        width_brace = m.Brace(row, UP, buff=0.12)
        width_label = m.MathTex(R"\pi r", font_size=48, color=PI_COLOR)
        width_label.next_to(width_brace, UP, buff=0.1)
        height_brace = m.Brace(row, LEFT, buff=0.12)
        height_label = m.MathTex("r", font_size=48, color=RADIUS_COLOR)
        height_label.next_to(height_brace, LEFT, buff=0.12)

        self.set_caption("Width: half the crust.   Height: the radius.")
        self.play(m.GrowFromCenter(width_brace), m.FadeIn(width_label, shift=0.1 * UP))
        self.play(m.GrowFromCenter(height_brace), m.FadeIn(height_label, shift=0.1 * LEFT))
        self.wait(0.6)

        f1 = m.MathTex("A", "=", R"\pi", "r", R"\times", "r", font_size=60)
        f1[2].set_color(PI_COLOR)
        f1.next_to(row, DOWN, buff=0.55)
        f2 = m.MathTex("A", "=", R"\pi", "r^2", font_size=72)
        f2[2].set_color(PI_COLOR)
        f2.move_to(f1)
        self.set_caption("Area = width × height")
        self.play(m.Write(f1), run_time=1.2)
        self.wait(0.6)
        self.play(m.TransformMatchingTex(f1, f2), run_time=1.2)
        box = m.SurroundingRectangle(f2, buff=0.2, stroke_color=PI_COLOR, stroke_width=3)
        self.play(m.Create(box), run_time=0.8)
        self.wait(1.2)

        self.braces = m.VGroup(width_brace, width_label, height_brace, height_label)
        self.formula = m.VGroup(f2, box)

    def outro(self, slices):
        self.set_caption("That's why a pie's area is π r²")
        self.play(m.FadeOut(self.braces), run_time=0.6)
        self.gather(slices, run_time=2.2)
        self.play(m.FadeOut(self.ghost), run_time=0.3)

        # Swap the 48 slices for a pie in 8 slices, and serve one of them.
        served = make_slices(8, PIE_CENTER, edge_width=3.0)
        self.play(m.FadeOut(m.VGroup(*slices)), m.FadeIn(m.VGroup(*served)), run_time=0.6)
        treat = served[1]
        out = 0.55 * polar(treat.heading)
        self.play(
            treat.animate.shift(out).rotate(-10 * m.DEGREES, about_point=treat.tip + out),
            self.formula.animate.move_to(ROW_CENTER + 0.3 * UP).scale(1.25),
            run_time=1.4,
        )
        self.wait(2.5)
        self.play(
            m.FadeOut(m.VGroup(*served)), m.FadeOut(self.formula), m.FadeOut(self.crust_label),
            m.FadeOut(self.title), m.FadeOut(self.caption),
            run_time=1.0,
        )
