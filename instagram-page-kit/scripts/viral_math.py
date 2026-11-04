"""The 24-hour growth maths for a reel: what it takes, and where your reel is heading.

  # What hourly growth does a target need?
  python3 scripts/viral_math.py need --first-hour 200 --target 1000000

  # Where is my reel heading? Give cumulative views at the times you checked (hours:views).
  python3 scripts/viral_math.py track 1:180 3:650 6:1900

  # Redraw the chart in assets/
  python3 scripts/viral_math.py chart

The model: views in each hour are the previous hour's views times g (the hourly growth factor).
Cumulative views after t hours = v1 * (g^t - 1) / (g - 1). g above 1 compounds, g below 1 stalls.
Instagram doesn't publish its ranking, so this is a model of the shape, not Instagram's formula.
"""
import argparse
import math
import os
import sys


def cumulative(v1, g, t):
    if abs(g - 1) < 1e-9:
        return v1 * t
    return v1 * (g ** t - 1) / (g - 1)


def solve_growth(v1, target, hours=24):
    lo, hi = 0.3, 6.0
    for _ in range(200):
        mid = (lo + hi) / 2
        lo, hi = (mid, hi) if cumulative(v1, mid, hours) < target else (lo, mid)
    return (lo + hi) / 2


def fit(points):
    """Least squares in log space: best (v1, g) for cumulative views at checkpoints."""
    best = None
    for i in range(1, 1500):
        g = 0.6 + i * 0.001
        logs = [math.log(c) - math.log(cumulative(1, g, t)) for t, c in points]
        lv1 = sum(logs) / len(logs)
        err = sum((l - lv1) ** 2 for l in logs)
        if best is None or err < best[0]:
            best = (err, math.exp(lv1), g)
    return best[1], best[2]


def doubling(g):
    return math.log(2) / math.log(g) if g > 1 else float("inf")


def fmt(n):
    return f"{n/1e6:.1f}M" if n >= 1e6 else f"{n/1e3:.0f}K" if n >= 1e4 else f"{n/1e3:.1f}K" if n >= 1e3 else f"{n:.0f}"


def cmd_need(a):
    g = solve_growth(a.first_hour, a.target)
    print(f"To reach {a.target:,.0f} views in 24 h from {a.first_hour:,.0f} in the first hour:")
    print(f"  each hour needs {(g-1)*100:.0f}% more views than the hour before (g = {g:.3f}),")
    print(f"  which means views double every {doubling(g):.1f} hours, all day.")
    print("  Checkpoints to beat:", ", ".join(f"{t}h {fmt(cumulative(a.first_hour, g, t))}" for t in (1, 3, 6, 12, 24)))


def cmd_track(a):
    pts = []
    for p in a.points:
        t, v = p.split(":")
        pts.append((float(t), float(v)))
    if len(pts) < 2:
        sys.exit("give at least two checkpoints, e.g. 1:180 3:650")
    v1, g = fit(pts)
    proj = cumulative(v1, g, 24)
    print(f"Best fit: {fmt(v1)} views in hour 1, then {(g-1)*100:+.0f}% per hour (g = {g:.3f}).")
    if g > 1:
        print(f"Views are doubling every {doubling(g):.1f} h. If that holds, 24 h total ≈ {fmt(proj)}.")
    else:
        cap = v1 / (1 - g) if g < 1 else float("inf")
        print(f"Views are slowing down each hour. It will level off around {fmt(min(cap, proj * 1.5))} in total.")
    verdict = ("on a viral path (1M+ pace)" if proj >= 1e6 else "breaking out (100K+ pace)" if proj >= 1e5
               else "above average, keep watching" if g > 1.05 else "normal for now, not breaking out")
    print("Verdict:", verdict)
    print("Real reels slow down as they use up the interested audience, so treat the projection as a ceiling.")


def cmd_chart(a):
    from PIL import Image, ImageDraw, ImageFont
    S = 2  # draw at 2x for a sharp image
    Wd, Ht = 900 * S, 560 * S
    surface, ink, ink2, muted, grid = "#fcfcfb", "#0b0b0b", "#52514e", "#8a8984", "#e6e5e1"
    series = [(1.00, "#86b6ef", "flat"), (1.15, "#3987e5", "+15%/h"), (1.25, "#1c5cab", "+25%/h"),
              (1.37, "#0d366b", "+37%/h")]  # ordinal blue ramp, validated light-mode
    fdir = "/usr/share/fonts/opentype/inter/"
    f = lambda w, s: ImageFont.truetype(f"{fdir}Inter-{w}.otf", s * S)
    img = Image.new("RGB", (Wd, Ht), surface)
    d = ImageDraw.Draw(img)
    L, R, T, B = 78 * S, 150 * S, 96 * S, 52 * S
    x0, x1, y0, y1 = L, Wd - R, T, Ht - B
    lo, hi = 2, 7  # log10 range: 100 to 10M
    X = lambda h: x0 + (x1 - x0) * h / 24
    Y = lambda v: y1 - (y1 - y0) * (math.log10(max(v, 10 ** lo)) - lo) / (hi - lo)

    d.text((x0, 22 * S), "Views after 24 hours, starting from 200 in the first hour", font=f("SemiBold", 19), fill=ink)
    d.text((x0, 50 * S), "Growth per hour decides everything. At hour 6 the lines are close; by hour 24 they are 200x apart.",
           font=f("Regular", 13), fill=ink2)
    for e in range(lo, hi + 1):
        y = Y(10 ** e)
        d.line((x0, y, x1, y), fill=grid, width=1 * S)
        lab = {2: "100", 3: "1K", 4: "10K", 5: "100K", 6: "1M", 7: "10M"}[e]
        tw = d.textlength(lab, font=f("Regular", 12))
        d.text((x0 - 10 * S - tw, y - 8 * S), lab, font=f("Regular", 12), fill=muted)
    for h in (0, 6, 12, 18, 24):
        d.text((X(h) - 8 * S, y1 + 10 * S), f"{h}h", font=f("Regular", 12), fill=muted)
    # 6-hour check marker
    for yy in range(int(y0), int(y1), 10 * S):
        d.line((X(6), yy, X(6), yy + 5 * S), fill="#b9b8b2", width=1 * S)
    d.text((X(6) + 6 * S, y0 + 2 * S), "6-hour check", font=f("Medium", 12), fill=ink2)
    # lines
    for g, col, name in series:
        pts = [(X(t / 4), Y(cumulative(200, g, t / 4))) for t in range(4, 97)]
        d.line(pts, fill=col, width=2 * S, joint="curve")
        end = cumulative(200, g, 24)
        ex, ey = pts[-1]
        d.ellipse((ex - 4 * S, ey - 4 * S, ex + 4 * S, ey + 4 * S), fill=col, outline=surface, width=2 * S)
        d.text((ex + 10 * S, ey - 9 * S), f"{name} → {fmt(end)}", font=f("Medium", 13), fill=ink)
    # legend
    lx = x0
    for g, col, name in series:
        d.line((lx, 78 * S, lx + 18 * S, 78 * S), fill=col, width=3 * S)
        d.text((lx + 24 * S, 70 * S), name, font=f("Regular", 12), fill=ink2)
        lx += 24 * S + d.textlength(name, font=f("Regular", 12)) + 22 * S
    out = os.path.join(os.path.dirname(__file__), "..", "assets", "viral-math-chart.png")
    img.save(out)
    print("wrote", os.path.abspath(out))


def main():
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    n = sub.add_parser("need")
    n.add_argument("--first-hour", type=float, required=True)
    n.add_argument("--target", type=float, required=True)
    t = sub.add_parser("track")
    t.add_argument("points", nargs="+", help="hours:cumulative_views, e.g. 1:180 3:650 6:1900")
    sub.add_parser("chart")
    a = ap.parse_args()
    {"need": cmd_need, "track": cmd_track, "chart": cmd_chart}[a.cmd](a)


if __name__ == "__main__":
    main()
