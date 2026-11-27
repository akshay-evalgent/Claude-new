"""Export reusable assets for an episode: transparent character expression
sheets, single-pose PNGs, the background plate and a thumbnail frame.

    python -m toon.export_assets episodes/entry_level.py
"""
import os
import sys

import cairo

from .character import Character, EXPRESSIONS
from .render import Renderer, load_episode
from .sets import render_background

CELL_W, CELL_H = 520, 640


def char_png(look, st, path, scale=1.0):
    s = cairo.ImageSurface(cairo.FORMAT_ARGB32, int(CELL_W * scale), int(CELL_H * scale))
    c = cairo.Context(s)
    c.scale(scale, scale)
    c.translate(CELL_W / 2, 470)
    c.scale(0.95, 0.95)
    Character(look).draw(c, st)
    s.write_to_png(path)


def expression_sheet(name, look, facing, path, cols=5):
    exprs = list(EXPRESSIONS)
    rows = (len(exprs) + cols - 1) // cols
    w, h = 300, 330
    s = cairo.ImageSurface(cairo.FORMAT_ARGB32, cols * w, rows * h + 70)
    c = cairo.Context(s)
    c.set_source_rgb(0.97, 0.95, 0.91); c.paint()
    c.select_font_face("Inter", cairo.FONT_SLANT_NORMAL, cairo.FONT_WEIGHT_BOLD)
    c.set_source_rgb(0.15, 0.12, 0.18); c.set_font_size(36)
    c.move_to(20, 48); c.show_text(name)
    ch = Character(look)
    for i, e in enumerate(exprs):
        c.save()
        c.translate((i % cols) * w + w / 2, 70 + (i // cols) * h + 300)
        c.scale(0.62, 0.62)
        c.rectangle(-w / 1.24, -480, w / 0.62, 520); c.clip()
        ch.draw(c, dict(facing=facing, expr=e, pose="rest", t=1.0))
        c.restore()
        c.set_source_rgb(0.15, 0.12, 0.18); c.set_font_size(22)
        c.move_to((i % cols) * w + 14, 70 + (i // cols) * h + 26); c.show_text(e)
    s.write_to_png(path)


def main():
    ep = load_episode(sys.argv[1])
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    out = os.path.join(root, "assets")
    os.makedirs(os.path.join(out, "characters"), exist_ok=True)
    os.makedirs(os.path.join(out, "sets"), exist_ok=True)
    for name, c in ep["cast"].items():
        f = c["start"].get("facing", 1)
        expression_sheet(name, c["look"], f, os.path.join(out, "characters", f"{name}_expressions.png"))
        for pose in ("rest", "shrug", "wave", "mug", "fist"):
            char_png(c["look"], dict(facing=f, expr="neutral", pose=pose, t=1.0),
                     os.path.join(out, "characters", f"{name}_{pose}.png"))
    for blur in (0, 5):
        surf, _ = render_background(ep["set"], blur=blur)
        surf.write_to_png(os.path.join(out, "sets", f"{ep['set']}_{'sharp' if blur == 0 else 'blurred'}.png"))
    r = Renderer(ep)
    t = ep.get("thumb_at", r.beats[min(3, len(r.beats) - 1)]["start"] + 0.6)
    r.still(t, os.path.join(root, "out", ep["slug"], "thumbnail.png"))
    print("assets written to", out)


if __name__ == "__main__":
    main()
