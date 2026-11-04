#!/usr/bin/env python3
"""Toy model of a YouTube Short's first 24 hours ("gate and cascade").

This is NOT YouTube's algorithm, which is unpublished. It is a small model in
which each part matches something public:
  - since 31 Mar 2025 a Shorts view counts every start and every replay;
  - YouTube's ranker scores each impression on several predicted behaviours
    and combines them (Zhao et al., RecSys 2019; Covington et al., 2016);
  - a feed slot goes to the best-scored candidate, so impression share is very
    sensitive to score (softmax / Gumbel-max ranking);
  - early views predict later views on a log scale (Szabo & Huberman, 2010).
The numbers it prints are illustrative. The shapes are the point.

Usage:
  python3 model.py demo                      # experiments, tables, charts
  python3 model.py one --viewed 0.8 --length 25
  python3 model.py fit history.csv --early views_2h --late views_24h --now 900
"""
from __future__ import annotations

import argparse
import csv
import math
import os
import sys
from dataclasses import dataclass, replace

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))


# --------------------------------------------------------------------------
# Inputs
# --------------------------------------------------------------------------

@dataclass(frozen=True)
class Short:
    length_s: float = 30.0   # running time in seconds
    viewed: float = 0.70     # share of feed impressions that stay past the hook (Studio "viewed")
    hazard: float = 0.030    # per-second chance a viewer who stayed leaves before the end
    loop: float = 0.10       # chance someone who finished plays it again (replays treated as full)
    engage: float = 0.030    # likes + comments + shares + subscribes per viewer who stayed
    share: float = 0.004     # shares per viewer who stayed (only used for the direct share channel)


# The median Short competing for the same viewers. Replace with your channel's
# medians from Studio; the model only ever uses your Short *relative* to this.
POOL = Short()


@dataclass(frozen=True)
class Platform:
    seed: int = 300           # impressions in the first test batch (subscribers + exploration)
    kappa: float = 6.0        # how sharply impression share follows score (1 / softmax temperature)
    fit_decay: float = 0.03   # log-score lost per wider audience ring, incl. fading novelty
    ring_sd: float = 0.03     # random fit of each new ring (does not shrink with batch size)
    noise: float = 1.0        # per-viewer sd of log satisfaction; batch noise = noise / sqrt(n)
    cycle_hours: float = 2.0  # hours per test-and-expand cycle at average audience activity
    min_batch: int = 30       # below this the Short leaves active testing
    cap: float = 5e6          # most impressions one cycle can serve (audience ceiling)
    views_per_share: float = 3.0
    post_hour: float = 18.0   # local hour of publish
    peak_hour: float = 20.0   # local hour when the audience is most active
    diurnal: float = 0.5      # activity swings between 1 - this and 1 + this
    # Weights on log(viewed), log(APV), log(watch seconds), log(engagement), each
    # relative to POOL. YouTube does not publish these; they are illustrative.
    weights: tuple = (1.0, 0.5, 0.2, 0.3)


# --------------------------------------------------------------------------
# Layer 1: what one impression is worth
# --------------------------------------------------------------------------

def per_impression(s: Short) -> dict:
    """Behaviour of one feed impression, from a hook drop then constant hazard.

    Retention among those who stayed is S(t) = exp(-hazard * t) for t in [0, L].
    """
    x = s.hazard * s.length_s
    finish = math.exp(-x)                         # share of stayers who reach the end
    one_pass = (1 - finish) / x if x > 0 else 1.0  # mean fraction of one pass, per stayer
    replays = finish * s.loop / (1 - s.loop)      # expected replays per stayer (geometric)
    apv = one_pass + replays                      # average percentage viewed, per stayer
    return {
        "completion": s.viewed * finish,          # per impression
        "apv": apv,
        "replays": replays,
        "views": 1 + s.viewed * replays,          # public views per impression
        "watch_s": s.length_s * apv,              # watch seconds per stayer
    }


def log_edge(s: Short, pool: Short = POOL, p: Platform = Platform()) -> float:
    """ln(score of this Short / score of the median competitor)."""
    a, b = per_impression(s), per_impression(pool)
    wv, wa, ww, we = p.weights
    return (wv * math.log(s.viewed / pool.viewed)
            + wa * math.log(a["apv"] / b["apv"])
            + ww * math.log(a["watch_s"] / b["watch_s"])
            + we * math.log(s.engage / pool.engage))


# --------------------------------------------------------------------------
# Layer 2: test, measure, expand
# --------------------------------------------------------------------------

def activity(hour: float, p: Platform) -> float:
    return 1 + p.diurnal * math.cos(2 * math.pi * (hour - p.peak_hour) / 24)


def simulate(s: Short, p: Platform, rng: np.random.Generator, hours: int = 24,
             trace: bool = False):
    """Cumulative public views at the end of each hour, one random run.

    With trace=True also returns the score the system measured on the first batch.
    """
    le0 = log_edge(s, POOL, p)
    vpi = per_impression(s)["views"]
    r_share = s.viewed * s.share * p.views_per_share  # direct share reproduction number
    vpi *= 1 / (1 - r_share)
    hourly = np.zeros(hours)
    t, k, n = 0.0, 0, float(p.seed)
    ring = 0.0
    first_est = None
    while t < hours and n >= p.min_batch:
        dur = p.cycle_hours / activity(p.post_hour + t, p)
        _spread(hourly, t, t + dur, n * vpi)
        ring += rng.normal(0, p.ring_sd)                    # how well this audience ring fits
        true_le = le0 - p.fit_decay * k + ring
        est = true_le + rng.normal(0, p.noise / math.sqrt(n))  # what the system measures
        if first_est is None:
            first_est = est
        n = min(n * math.exp(p.kappa * est), p.cap)          # next batch: R = E_hat ** kappa
        t += dur
        k += 1
    cum = np.cumsum(hourly)
    return (cum, first_est) if trace else cum


def _spread(hourly: np.ndarray, t0: float, t1: float, amount: float) -> None:
    """Add `amount` uniformly over [t0, t1) into hourly bins, ignoring time past the end."""
    rate = amount / (t1 - t0)
    h = int(t0)
    while h < len(hourly) and h < t1:
        lo, hi = max(t0, h), min(t1, h + 1)
        if hi > lo:
            hourly[h] += rate * (hi - lo)
        h += 1


def run_many(s: Short, p: Platform, n: int = 2000, seed: int = 7) -> np.ndarray:
    rng = np.random.default_rng(seed)
    return np.array([simulate(s, p, rng) for _ in range(n)])


def closed_form(s: Short, p: Platform) -> dict:
    """No-noise approximation: R_k = exp(a - b k), a = kappa ln E, b = kappa d."""
    a = p.kappa * log_edge(s, POOL, p)
    b = p.kappa * p.fit_decay
    k_peak = max(a / b, 0.0)
    peak_hours = k_peak * p.cycle_hours
    ln_mult = a * a / (2 * b) if a > 0 else 0.0
    width = math.sqrt(2 * math.pi / b)
    return {"a": a, "b": b, "k_peak": k_peak, "peak_hours": peak_hours,
            "impressions": p.seed * width * math.exp(ln_mult) if a > 0 else p.seed * width / 2}


# --------------------------------------------------------------------------
# Experiments
# --------------------------------------------------------------------------

def fmt(x: float) -> str:
    if x >= 1e6:
        return f"{x / 1e6:.1f}M"
    if x >= 1e3:
        return f"{x / 1e3:.1f}k"
    return f"{x:.0f}"


SHORTS = {
    "Median Short": Short(),
    "Strong hook": Short(viewed=0.80),
    "Strong hook + holds": Short(viewed=0.80, hazard=0.025, loop=0.12, engage=0.035),
}


def demo(make_charts: bool = True) -> None:
    p = Platform()
    pool = per_impression(POOL)
    print(f"Pool (median competitor): viewed {POOL.viewed:.0%}, APV {pool['apv']:.0%}, "
          f"views/impression {pool['views']:.3f}\n")

    print("1. Three Shorts, 2,000 random first days each")
    print(f"{'Short':<22}{'ln E':>6}{'R0':>6}{'P10':>9}{'median':>9}{'P90':>9}{'P99':>9}"
          f"{'P(>=100k)':>11}{'P(>=1M)':>9}")
    runs = {}
    for name, s in SHORTS.items():
        r = run_many(s, p)[:, -1]
        runs[name] = r
        le = log_edge(s, POOL, p)
        q = np.percentile(r, [10, 50, 90, 99])
        print(f"{name:<22}{le:>6.3f}{math.exp(p.kappa * le):>6.2f}"
              + "".join(f"{fmt(v):>9}" for v in q)
              + f"{np.mean(r >= 1e5):>11.1%}{np.mean(r >= 1e6):>9.1%}")

    print("\n2. Viewed-rate sweep, everything else at the median")
    print(f"{'viewed':>7}{'ln E':>7}{'closed form':>13}{'sim median':>12}{'sim P90':>10}{'peak hour':>11}")
    sweep = []
    for v in np.round(np.arange(0.60, 0.921, 0.02), 2):
        s = Short(viewed=float(v))
        r = run_many(s, p, n=800, seed=11)[:, -1]
        cf = closed_form(s, p)
        q10, q50, q90 = np.percentile(r, [10, 50, 90])
        sweep.append((v, q10, q50, q90))
        print(f"{v:>7.2f}{log_edge(s, POOL, p):>7.3f}"
              f"{fmt(cf['impressions'] * per_impression(s)['views']):>13}"
              f"{fmt(q50):>12}{fmt(q90):>10}{cf['peak_hours']:>10.0f}h")

    print("\n3. How much of 24h is known early? (log-log fit across 3,000 mixed Shorts)")
    rng = np.random.default_rng(3)
    mix, first = [], []
    for _ in range(3000):
        s = Short(viewed=float(rng.uniform(0.6, 0.9)),
                  hazard=float(rng.uniform(0.015, 0.045)),
                  loop=float(rng.uniform(0.05, 0.2)),
                  engage=float(rng.uniform(0.015, 0.06)))
        cum, est = simulate(s, p, rng, trace=True)
        mix.append(cum)
        first.append(est)
    mix, first = np.array(mix), np.array(first)
    late = np.log(mix[:, -1])

    def explained(x):
        b, a = np.polyfit(x, late, 1)
        resid = late - (a + b * x)
        return 1 - resid.var() / late.var(), math.exp(1.2816 * resid.std()), b

    print(f"{'predictor':<34}{'R^2':>6}{'80% band':>12}{'slope':>7}")
    r2, band, _ = explained(first)
    print(f"{'first-batch score (rate metrics)':<34}{r2:>6.2f}{'x/÷ ' + f'{band:.1f}':>12}{'':>7}")
    for h in (1, 2, 3, 6, 12):
        r2, band, b = explained(np.log(mix[:, h - 1]))
        print(f"{'views at ' + str(h) + 'h':<34}{r2:>6.2f}{'x/÷ ' + f'{band:.1f}':>12}"
              f"{(f'{b:.2f}' if r2 > 0.5 else '-'):>7}")

    print("\n4. Posting time (Strong hook + holds, median 24h views)")
    s = SHORTS["Strong hook + holds"]
    for hour in (4, 10, 18):
        r = run_many(s, replace(p, post_hour=hour))
        print(f"  posted {hour:02d}:00   at 2h {fmt(np.median(r[:, 1])):>7}   "
              f"at 24h {fmt(np.median(r[:, -1])):>7}")

    print("\n5. Length, same hook and per-second hazard (0.03/s), loop 10%")
    print(f"{'length':>7}{'finish':>8}{'APV':>7}{'watch s':>9}{'ln E':>7}")
    for L in (10, 15, 20, 30, 45, 60):
        s = Short(length_s=L)
        m = per_impression(s)
        print(f"{L:>6}s{m['completion'] / s.viewed:>8.0%}{m['apv']:>7.0%}"
              f"{m['watch_s']:>9.1f}{log_edge(s, POOL, p):>7.3f}")

    r_share = POOL.viewed * POOL.share * p.views_per_share
    print(f"\n6. Direct share channel: R_share = viewed x share rate x views per share "
          f"= {r_share:.4f}  ->  x{1 / (1 - r_share):.3f} views")

    if make_charts:
        charts(runs, sweep, p)


# --------------------------------------------------------------------------
# Charts (static PNGs; reference palette from the dataviz skill)
# --------------------------------------------------------------------------

INK, INK2, GRID, SURFACE = "#0b0b0b", "#52514e", "#e4e3df", "#fcfcfb"
SERIES = ["#2a78d6", "#eb6834", "#1baf7a"]


def _style(ax, plt):
    ax.set_facecolor(SURFACE)
    for side in ("top", "right"):
        ax.spines[side].set_visible(False)
    for side in ("left", "bottom"):
        ax.spines[side].set_color(GRID)
    ax.tick_params(colors=INK2, labelsize=10)
    ax.grid(True, which="major", color=GRID, linewidth=0.8)
    ax.set_axisbelow(True)


def _views_axis(axis):
    from matplotlib.ticker import FuncFormatter, LogLocator
    axis.set_major_locator(LogLocator(base=10))
    axis.set_major_formatter(FuncFormatter(lambda x, _: fmt(x)))


def charts(runs: dict, sweep: list, p: Platform) -> None:
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    out = os.path.join(HERE, "charts")
    os.makedirs(out, exist_ok=True)
    plt.rcParams.update({"font.family": "DejaVu Sans", "figure.facecolor": SURFACE})

    # 1. Chance of reaching at least X views in 24 hours
    fig, ax = plt.subplots(figsize=(8, 4.8), dpi=200)
    _style(ax, plt)
    xs = np.logspace(2, 7.5, 300)
    for (name, r), c in zip(runs.items(), SERIES):
        ys = [(r >= x).mean() for x in xs]
        ax.plot(xs, ys, color=c, linewidth=2, label=name)
        i = int(np.argmin(np.abs(np.array(ys) - 0.5)))
        ax.annotate(name, (xs[i], ys[i]), xytext=(6, 6), textcoords="offset points",
                    color=INK, fontsize=10)
    ax.set_xscale("log")
    _views_axis(ax.xaxis)
    ax.set_ylim(0, 1.02)
    ax.yaxis.set_major_formatter(matplotlib.ticker.PercentFormatter(1.0))
    ax.set_xlabel("Views after 24 hours (at least)", color=INK2)
    ax.set_ylabel("Share of simulated first days", color=INK2)
    ax.set_title("Chance a Short reaches at least X views in 24 hours", color=INK,
                 loc="left", fontsize=13, pad=12)
    ax.legend(frameon=False, labelcolor=INK, loc="lower left")
    fig.tight_layout()
    fig.savefig(os.path.join(out, "chance-of-reaching.png"))
    plt.close(fig)

    # 2. Viewed-rate sweep
    fig, ax = plt.subplots(figsize=(8, 4.8), dpi=200)
    _style(ax, plt)
    v = np.array([row[0] for row in sweep])
    lo, mid, hi = (np.array([row[i] for row in sweep]) for i in (1, 2, 3))
    ax.fill_between(v * 100, lo, hi, color=SERIES[0], alpha=0.15, linewidth=0,
                    label="10th to 90th percentile")
    ax.plot(v * 100, mid, color=SERIES[0], linewidth=2, marker="o", markersize=4,
            label="Median")
    ax.set_yscale("log")
    _views_axis(ax.yaxis)
    for x, y in ((70, mid[np.argmin(abs(v - 0.70))]), (80, mid[np.argmin(abs(v - 0.80))]),
                 (90, mid[np.argmin(abs(v - 0.90))])):
        ax.annotate(fmt(y), (x, y), xytext=(-8, 8), textcoords="offset points",
                    color=INK, fontsize=10, ha="right")
    ax.set_xlabel("Viewed rate: share of impressions that stay past the hook (%)", color=INK2)
    ax.set_ylabel("Views after 24 hours", color=INK2)
    ax.set_title("Each point of viewed rate is worth more than the last",
                 color=INK, loc="left", fontsize=13, pad=12)
    ax.legend(frameon=False, labelcolor=INK, loc="upper left")
    fig.tight_layout()
    fig.savefig(os.path.join(out, "viewed-rate-sweep.png"))
    plt.close(fig)

    # 3. Same Short, forty first days
    fig, ax = plt.subplots(figsize=(8, 4.8), dpi=200)
    _style(ax, plt)
    rng = np.random.default_rng(21)
    s = SHORTS["Strong hook + holds"]
    many = np.array([simulate(s, p, rng) for _ in range(40)])
    hrs = np.arange(1, 25)
    for row in many:
        ax.plot(hrs, row, color=SERIES[0], linewidth=1, alpha=0.35)
    med = np.median(run_many(s, p, n=1000)[:, :], axis=0)
    ax.plot(hrs, med, color=INK, linewidth=2, label="Median of 1,000 runs")
    ax.plot([], [], color=SERIES[0], linewidth=1, alpha=0.6, label="One random first day")
    ax.set_yscale("log")
    _views_axis(ax.yaxis)
    ax.set_xlim(1, 24)
    ax.set_xticks([1, 3, 6, 9, 12, 15, 18, 21, 24])
    ax.set_xlabel("Hours since posting", color=INK2)
    ax.set_ylabel("Cumulative views", color=INK2)
    ax.set_title("The same Short, forty different first days", color=INK, loc="left",
                 fontsize=13, pad=12)
    ax.legend(frameon=False, labelcolor=INK, loc="upper left")
    fig.tight_layout()
    fig.savefig(os.path.join(out, "same-short-forty-days.png"))
    plt.close(fig)
    print("\nCharts written to charts/")


# --------------------------------------------------------------------------
# Your own data: early views -> 24h views
# --------------------------------------------------------------------------

def fit(path: str, early: str, late: str, now: float | None) -> None:
    xs, ys = [], []
    with open(path, newline="") as f:
        for row in csv.DictReader(f):
            try:
                x, y = float(row[early]), float(row[late])
            except (KeyError, ValueError):
                continue
            if x > 0 and y > 0:
                xs.append(math.log(x))
                ys.append(math.log(y))
    if len(xs) < 8:
        sys.exit(f"Need at least 8 Shorts with both {early} and {late}; found {len(xs)}.")
    x, y = np.array(xs), np.array(ys)
    b, a = np.polyfit(x, y, 1)
    resid = y - (a + b * x)
    sd = resid.std(ddof=2)
    r2 = 1 - resid.var() / y.var()
    band = math.exp(1.2816 * sd)
    print(f"{len(x)} Shorts.  ln({late}) = {a:.2f} + {b:.2f} ln({early})   R^2 {r2:.2f}")
    print(f"80% of Shorts land within x/÷ {band:.1f} of the line.")
    if now is not None:
        mid = math.exp(a + b * math.log(now))
        print(f"With {fmt(now)} at the early mark: expect ~{fmt(mid)} "
              f"(80% band {fmt(mid / band)} to {fmt(mid * band)}).")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    d = sub.add_parser("demo", help="run the experiments and draw the charts")
    d.add_argument("--no-charts", action="store_true")
    o = sub.add_parser("one", help="simulate one Short")
    o.add_argument("--length", type=float, default=30)
    o.add_argument("--viewed", type=float, default=0.70)
    o.add_argument("--hazard", type=float, default=0.03)
    o.add_argument("--loop", type=float, default=0.10)
    o.add_argument("--engage", type=float, default=0.03)
    o.add_argument("--post-hour", type=float, default=18)
    o.add_argument("--runs", type=int, default=2000)
    f = sub.add_parser("fit", help="fit early -> 24h views from your own history CSV")
    f.add_argument("csv")
    f.add_argument("--early", default="views_2h")
    f.add_argument("--late", default="views_24h")
    f.add_argument("--now", type=float, help="this Short's views at the early mark")
    args = ap.parse_args()

    if args.cmd == "demo":
        demo(make_charts=not args.no_charts)
    elif args.cmd == "one":
        s = Short(length_s=args.length, viewed=args.viewed, hazard=args.hazard,
                  loop=args.loop, engage=args.engage)
        p = replace(Platform(), post_hour=args.post_hour)
        m, le = per_impression(s), log_edge(s, POOL, p)
        r = run_many(s, p, n=args.runs)
        print(f"completion {m['completion']:.0%}  APV {m['apv']:.0%}  "
              f"views/impression {m['views']:.3f}  ln E {le:+.3f}  R0 {math.exp(p.kappa * le):.2f}")
        for h in (1, 3, 6, 12, 24):
            q = np.percentile(r[:, h - 1], [10, 50, 90])
            print(f"  {h:>2}h   P10 {fmt(q[0]):>7}   median {fmt(q[1]):>7}   P90 {fmt(q[2]):>7}")
    else:
        fit(args.csv, args.early, args.late, args.now)


if __name__ == "__main__":
    main()
