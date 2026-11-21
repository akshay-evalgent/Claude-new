#!/usr/bin/env python3
"""Clips for "The Spike Files" (1030x900, used as breakdown.py segment sources) and the channel's brand art.

    python3 spike_clips.py chart  spec.json out.mp4   # every Short a channel posted as bars; the spike rises
    python3 spike_clips.py wall   spec.json out.mp4   # wall of (dimmed) thumbnails with views, then the hit pops out
    python3 spike_clips.py versus spec.json out.mp4   # before vs after: two thumbnails, titles and views
    python3 spike_clips.py stat   spec.json out.mp4   # "17% -> 80%" style numbers that count up
    python3 spike_clips.py rule   spec.json out.mp4   # "STEAL THIS" card, lines appear one by one
    python3 spike_clips.py logo   spec.json out.mp4   # brand end card
    python3 spike_clips.py avatar out.png | banner out.png

Specs:
  chart:  {"views": [...oldest first], "grow": [n0, n1], "dur", "hold": 0.6, "highlight": [i, ...] (0-based),
           "callouts": [{"i", "text"}], "title"}
  wall:   {"items": [{"img", "views"}], "cols": 6, "rows": 3, "dur", "pop": {"img", "views", "label"}, "pop_at": 1.6}
  versus: {"left": {"img", "views", "title", "tag"}, "right": {...}, "dur", "right_at": 0.8}
  stat:   {"title", "rows": [{"label", "a", "b"}], "dur"}
  rule:   {"title": "STEAL THIS", "lines": [...], "dur"}
  logo:   {"line": "FILE #002 · NEXT", "dur"}
All numbers shown come from public view counts; nothing is estimated.
"""
import json
import math
import os
import sys
import textwrap

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from fx_clips import CW, CH, FPS, ease, writer  # noqa: E402

BOLD = os.path.join(HERE, "fonts", "OpenSans-ExtraBold.ttf")
BLACK = os.path.join(HERE, "fonts", "Montserrat-Black.ttf")
ACCENT = (61, 255, 136)            # "spike green"
BG, GRID, BAR, WHITE, GREY = (12, 12, 16), (34, 34, 42), (88, 88, 100), (245, 245, 245), (150, 150, 160)
BRAND = "THE SPIKE FILES"


def font(path, size):
    return ImageFont.truetype(path, size)


def fmt(n):
    n = float(n)
    if n >= 1e9:
        return f"{n / 1e9:.2f}".rstrip("0").rstrip(".") + "B"
    if n >= 1e6:
        return (f"{n / 1e6:.1f}".rstrip("0").rstrip(".") if n < 1e7 else f"{n / 1e6:.0f}") + "M"
    if n >= 1e3:
        return f"{n / 1e3:.0f}K"
    return f"{n:.0f}"


def arrow(d, x, y, w, color, t=10):
    """Right arrow drawn as shapes (the fonts have no arrow glyph)."""
    d.rectangle((x, y - t // 2, x + w - 22, y + t // 2), fill=color)
    d.polygon([(x + w - 30, y - 22), (x + w, y), (x + w - 30, y + 22)], fill=color)


def pill(d, xy, text, size, fg, bg, anchor="l"):
    f = font(BOLD, size); w = f.getlength(text); x, y = xy
    if anchor == "c":
        x -= (w + 30) / 2
    d.rounded_rectangle((x, y, x + w + 30, y + size + 20), 14, fill=bg); d.text((x + 15, y + 5), text, font=f, fill=fg)
    return x + w + 30


def frames(spec):
    return int(spec.get("dur", 4.0) * FPS)


# ---------------------------------------------------------------- chart
def chart(spec, out):
    v = np.array(spec["views"], float); N = len(v)
    n0, n1 = spec.get("grow", [1, N]); hold = spec.get("hold", 0.6)
    hi = set(spec.get("highlight", [])); calls = {c["i"]: c["text"] for c in spec.get("callouts", [])}
    L, R, T, B = 40, CW - 40, 210, CH - 90
    PR = 70                                                  # keep the last (spike) bar off the edge
    bw = (R - PR - L) / N; gap = 1 if bw > 3 else 0
    hw = max(bw, 14) if len(hi) <= 6 else max(bw - gap, 2)    # a lone spike stays visible however many bars
    f_big, f_small, f_call = font(BLACK, 76), font(BOLD, 28), font(BLACK, 40)
    n = frames(spec); ymax_s = None
    p = writer(out)
    for fr in range(n):
        t = fr / FPS
        k = ease(min(1.0, t / max(0.1, spec.get("dur", 4) - hold)))
        shown = int(round(n0 + (n1 - n0) * k)); shown = max(1, min(N, shown))
        target = max(v[:shown].max(), 1)
        ymax_s = target if ymax_s is None else ymax_s + (target - ymax_s) * 0.25      # rescale smoothly
        im = Image.new("RGB", (CW, CH), BG); d = ImageDraw.Draw(im)
        for g in range(1, 5):
            y = B - (B - T) * g / 4; d.line((L, y, R, y), fill=GRID, width=2)
            d.text((L + 4, y - 30), fmt(ymax_s * g / 4), font=f_small, fill=(80, 80, 92))
        for i in range(shown):
            if i in hi:
                continue
            h = (B - T) * min(1.0, v[i] / ymax_s); x0 = L + i * bw
            d.rectangle((x0, B - max(2, h), x0 + max(1, bw - gap), B), fill=BAR)
        glow = Image.new("L", (CW, CH), 0); gd = ImageDraw.Draw(glow)
        for i in sorted(hi):                                 # highlighted bars on top, wider, with a soft glow
            if i >= shown:
                continue
            h = (B - T) * min(1.0, v[i] / ymax_s); cx = L + (i + 0.5) * bw
            gd.rectangle((cx - hw / 2 - 6, B - max(2, h) - 6, cx + hw / 2 + 6, B), fill=110)
            d.rectangle((cx - hw / 2, B - max(2, h), cx + hw / 2, B), fill=ACCENT)
        if hi:
            g = glow.filter(ImageFilter.GaussianBlur(14))
            im = Image.composite(Image.new("RGB", (CW, CH), ACCENT), im, g.point(lambda x: int(x * 0.5)))
            d = ImageDraw.Draw(im)
            for i in sorted(hi):
                if i < shown:
                    h = (B - T) * min(1.0, v[i] / ymax_s); cx = L + (i + 0.5) * bw
                    d.rectangle((cx - hw / 2, B - max(2, h), cx + hw / 2, B), fill=ACCENT)
        d.line((L, B, R, B), fill=(120, 120, 130), width=3)
        cur = shown - 1
        d.text((L, 40), fmt(v[cur]), font=f_big, fill=ACCENT if cur in hi else WHITE)
        d.text((L + 6, 132), f"views · Short #{cur + 1}", font=f_small, fill=GREY)
        title = spec.get("title", "EVERY SHORT THEY POSTED")
        d.text((R - f_small.getlength(title), 60), title, font=f_small, fill=GREY)
        d.text((L, B + 22), "#1", font=f_small, fill=GREY)
        end = f"#{N}"; d.text((R - f_small.getlength(end), B + 22), end, font=f_small, fill=GREY)
        for i, txt in calls.items():
            if i < shown:
                h = (B - T) * min(1.0, v[i] / ymax_s); cx = L + (i + 0.5) * bw; top = B - h
                tw = f_call.getlength(txt)
                if cx + hw / 2 + 12 + tw <= R:                   # label beside the bar when there's room
                    tx, ty = cx + hw / 2 + 12, max(T - 20, top)
                else:
                    tx, ty = max(L, cx - hw / 2 - 12 - tw), max(T - 20, top)
                d.rounded_rectangle((tx - 10, ty + 2, tx + tw + 10, ty + 54), 10, fill=BG, outline=ACCENT, width=3)
                d.text((tx, ty), txt, font=f_call, fill=ACCENT)
        p.stdin.write(im.tobytes())
    p.stdin.close(); p.wait()


# ---------------------------------------------------------------- thumbnails
def thumb(path, w, h, dim=False):
    im = Image.open(path).convert("RGB")
    s = max(w / im.width, h / im.height)
    im = im.resize((math.ceil(im.width * s), math.ceil(im.height * s)), Image.LANCZOS)
    l, t = (im.width - w) // 2, (im.height - h) // 2
    im = im.crop((l, t, l + w, t + h))
    if dim:
        g = im.convert("L").convert("RGB")
        im = Image.blend(g, Image.new("RGB", (w, h), (0, 0, 0)), 0.45)
    return im


def wall(spec, out):
    items = spec["items"]; cols, rows = spec.get("cols", 6), spec.get("rows", 3); g = 10
    cw = (CW - (cols + 1) * g) // cols; ch = (CH - (rows + 1) * g) // rows
    f_v = font(BOLD, 26)
    cells = [thumb(it["img"], cw, ch, dim=spec.get("dim", True)) for it in items[: cols * rows]]
    pop = spec.get("pop"); pop_at = spec.get("pop_at", 1.6)
    if pop:
        ph = CH - 120; pw = int(ph * 9 / 16); P = thumb(pop["img"], pw, ph)
        f_pop = font(BLACK, 84)
    n = frames(spec); p = writer(out)
    for fr in range(n):
        t = fr / FPS; im = Image.new("RGB", (CW, CH), BG); d = ImageDraw.Draw(im)
        for i, c in enumerate(cells):
            if t < i * spec.get("stagger", 0.035):
                continue
            x, y = g + (i % cols) * (cw + g), g + (i // cols) * (ch + g)
            im.paste(c, (x, y))
            lab = fmt(items[i]["views"]); lw = f_v.getlength(lab)
            d.rounded_rectangle((x + (cw - lw) / 2 - 10, y + ch - 46, x + (cw + lw) / 2 + 10, y + ch - 8), 8, fill=(0, 0, 0))
            d.text((x + (cw - lw) / 2, y + ch - 46), lab, font=f_v, fill=WHITE)
        if pop and t >= pop_at:
            k = ease(min(1.0, (t - pop_at) / 0.35)); s = 0.6 + 0.4 * k
            ov = Image.new("RGB", (CW, CH), (0, 0, 0)); im = Image.blend(im, ov, 0.55 * k); d = ImageDraw.Draw(im)
            w2, h2 = int(pw * s), int(ph * s); x2, y2 = (CW - w2) // 2, (CH - h2) // 2 - 20
            d.rounded_rectangle((x2 - 8, y2 - 8, x2 + w2 + 8, y2 + h2 + 8), 18, fill=ACCENT)
            im.paste(P.resize((w2, h2), Image.LANCZOS), (x2, y2))
            cnt = pop["views"] * ease(min(1.0, (t - pop_at) / 0.9))
            lab = fmt(cnt); lw = f_pop.getlength(lab)
            d.rounded_rectangle(((CW - lw) / 2 - 20, y2 + h2 - 70, (CW + lw) / 2 + 20, y2 + h2 + 40), 16, fill=(0, 0, 0))
            d.text(((CW - lw) / 2, y2 + h2 - 72), lab, font=f_pop, fill=ACCENT)
            if pop.get("label"):
                pill(d, (CW / 2, 14), pop["label"], 30, (0, 0, 0), ACCENT, "c")
        p.stdin.write(im.tobytes())
    p.stdin.close(); p.wait()


def versus(spec, out):
    tw, th = 300, 534; y0 = 70
    xs = [(CW // 2 - tw) // 2 + 10, CW // 2 + (CW // 2 - tw) // 2 - 10]
    f_v, f_t = font(BLACK, 66), font(BOLD, 27)
    sides = []
    for key, x in zip(("left", "right"), xs):
        s = spec[key]; sides.append((s, x, thumb(s["img"], tw, th, dim=(key == "left" and spec.get("dim_left", True)))))
    n = frames(spec); ra = spec.get("right_at", 0.8); p = writer(out)
    for fr in range(n):
        t = fr / FPS; im = Image.new("RGB", (CW, CH), BG); d = ImageDraw.Draw(im)
        for j, (s, x, img) in enumerate(sides):
            if j == 1 and t < ra:
                continue
            k = 1.0 if j == 0 else ease(min(1.0, (t - ra) / 0.3))
            xo = x + int((1 - k) * 120)
            col = ACCENT if j == 1 else GREY
            d.rounded_rectangle((xo - 6, y0 - 6, xo + tw + 6, y0 + th + 6), 16, fill=col)
            im.paste(img, (xo, y0))
            pill(d, (xo + tw / 2, y0 - 46 if y0 > 46 else 4), s.get("tag", "BEFORE" if j == 0 else "AFTER"), 26,
                 (0, 0, 0), col, "c")
            val = s["views"] * (1.0 if j == 0 else ease(min(1.0, (t - ra) / 0.8)))
            lab = fmt(val); d.text((xo + (tw - f_v.getlength(lab)) / 2, y0 + th + 14), lab, font=f_v, fill=col if j else WHITE)
            yy = y0 + th + 98
            for ln in textwrap.wrap(s.get("title", ""), 22)[:3]:
                d.text((xo + (tw - f_t.getlength(ln)) / 2, yy), ln, font=f_t, fill=WHITE if j else GREY); yy += 34
        p.stdin.write(im.tobytes())
    p.stdin.close(); p.wait()


# ---------------------------------------------------------------- cards
def stat(spec, out):
    rows = spec["rows"]; f_n, f_l, f_h = font(BLACK, 96), font(BOLD, 34), font(BOLD, 30)
    n = frames(spec); p = writer(out)
    for fr in range(n):
        t = fr / FPS; im = Image.new("RGB", (CW, CH), BG); d = ImageDraw.Draw(im)
        if spec.get("title"):
            d.text(((CW - f_h.getlength(spec["title"])) / 2, 46), spec["title"], font=f_h, fill=GREY)
        hgt = (CH - 140) / max(2, len(rows))                     # one row sits in the middle
        y0 = 120 + (CH - 140 - hgt * len(rows)) / 2
        for r, row in enumerate(rows):
            y = y0 + r * hgt + (hgt - 220) / 2; tr = r * 0.5
            if t < tr:
                continue
            k = ease(min(1.0, (t - tr) / 1.0))
            unit = row.get("unit", "%")
            a, b = f"{row['a']}{unit}", f"{round(row['a'] + (row['b'] - row['a']) * k)}{unit}"
            wa = f_n.getlength(a); wb = f_n.getlength(f"{row['b']}{unit}"); total = wa + 140 + wb; x = (CW - total) / 2
            d.text((x, y), a, font=f_n, fill=WHITE); arrow(d, x + wa + 25, y + 62, 90, GREY)
            d.text((x + wa + 140, y), b, font=f_n, fill=ACCENT)
            yy = y + 128
            for ln in textwrap.wrap(row["label"], 46):
                d.text(((CW - f_l.getlength(ln)) / 2, yy), ln, font=f_l, fill=WHITE); yy += 44
        p.stdin.write(im.tobytes())
    p.stdin.close(); p.wait()


def rule(spec, out):
    f_l = font(BOLD, 46); lines = spec["lines"]; n = frames(spec); p = writer(out)
    for fr in range(n):
        t = fr / FPS; im = Image.new("RGB", (CW, CH), BG); d = ImageDraw.Draw(im)
        d.rounded_rectangle((24, 24, CW - 24, CH - 24), 40, outline=ACCENT, width=6)
        pill(d, (CW / 2, 70), spec.get("title", "STEAL THIS"), 44, (0, 0, 0), ACCENT, "c")
        y = 210
        for i, ln in enumerate(lines):
            if t < 0.3 + i * 0.55:
                break
            num, _, rest = ln.partition(". ")
            x = 80
            if num.isdigit():
                d.text((x, y), num, font=f_l, fill=ACCENT); x = 150
            else:
                rest = ln
            for w in textwrap.wrap(rest, 28 if x > 80 else 31):
                d.text((x, y), w, font=f_l, fill=WHITE); y += 60
            y += 34
        p.stdin.write(im.tobytes())
    p.stdin.close(); p.wait()


# ---------------------------------------------------------------- brand
def draw_icon(d, cx, cy, size, accent=ACCENT, bar=BAR):
    """The logo: a flat row of bars with one spike."""
    hs = [0.16, 0.22, 0.14, 0.2, 0.18, 1.0, 0.62]
    n = len(hs); bw = size / (n * 1.45); gap = bw * 0.45; total = n * bw + (n - 1) * gap
    x = cx - total / 2; base = cy + size * 0.42
    for i, h in enumerate(hs):
        col = accent if i >= 5 else bar
        d.rounded_rectangle((x, base - h * size * 0.84, x + bw, base), bw * 0.3, fill=col); x += bw + gap


def logo(spec, out):
    f_t, f_l = font(BLACK, 74), font(BOLD, 38)
    n = frames(spec); p = writer(out)
    for fr in range(n):
        t = fr / FPS; k = ease(min(1.0, t / 0.5))
        im = Image.new("RGB", (CW, CH), BG); d = ImageDraw.Draw(im)
        draw_icon(d, CW / 2, 300, 300 * (0.8 + 0.2 * k))
        d.text(((CW - f_t.getlength(BRAND)) / 2, 520), BRAND, font=f_t, fill=WHITE)
        if spec.get("line"):
            pill(d, (CW / 2, 650), spec["line"], 38, (0, 0, 0), ACCENT, "c")
        p.stdin.write(im.tobytes())
    p.stdin.close(); p.wait()


def avatar(out):
    S = 1600; im = Image.new("RGB", (S, S), BG); d = ImageDraw.Draw(im)
    draw_icon(d, S / 2, S / 2 + 10, S * 0.6)
    im.resize((800, 800), Image.LANCZOS).save(out)


def banner(out):
    W, H = 2560, 1440; im = Image.new("RGB", (W, H), BG); d = ImageDraw.Draw(im)
    rng = np.random.default_rng(7); n = 120; bw = W / n
    for i in range(n):                                      # faint flat chart across the banner...
        h = 40 + rng.random() * 70
        d.rectangle((i * bw, H - h, i * bw + bw - 3, H), fill=(26, 26, 32))
    d.rectangle((int(n * 0.93) * bw, H - 900, int(n * 0.93) * bw + bw - 3, H), fill=(30, 120, 72))   # ...with one spike (outside the safe area)
    # safe area (visible on every device): 1546x423 centred
    draw_icon(d, W / 2 - 520, H / 2, 300)
    f_t, f_s = font(BLACK, 120), font(BOLD, 52)
    d.text((W / 2 - 330, H / 2 - 110), BRAND, font=f_t, fill=WHITE)
    d.text((W / 2 - 326, H / 2 + 50), "Why channels suddenly blow up. With the data.", font=f_s, fill=ACCENT)
    im.save(out)


if __name__ == "__main__":
    kind = sys.argv[1]
    if kind in ("avatar", "banner"):
        {"avatar": avatar, "banner": banner}[kind](sys.argv[2])
    else:
        spec, out = json.load(open(sys.argv[2])), sys.argv[3]
        {"chart": chart, "wall": wall, "versus": versus, "stat": stat, "rule": rule, "logo": logo}[kind](spec, out)
    print(sys.argv[-1])
