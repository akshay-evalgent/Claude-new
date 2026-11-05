#!/usr/bin/env python3
"""The numbers behind the study, reproducible offline.

1. Spread model. Each view produces on average R more views (recommendations
   plus shares). With a seed audience s inside an interested pool N, the share
   of the pool reached, z, solves

       z = 1 - (1 - s/N) * exp(-R * z)

   Below R = 1 this is about s / (1 - R) views; above it, the epidemic
   final-size curve. Total views = N * z.

2. Shots on goal. Fit a log-normal to a channel's per-upload views and get
   P(one film passes a threshold) and P(at least one hit in n films).

Usage: python3 viral_math.py
"""
import json
import math
import statistics
from pathlib import Path

HERE = Path(__file__).parent


def reach(R, seed=10_000, pool=20_000_000):
    eps = seed / pool
    z = eps
    for _ in range(5000):
        nz = 1 - (1 - eps) * math.exp(-R * z)
        if abs(nz - z) < 1e-12:
            break
        z = nz
    return pool * z


def lognormal_fit(views):
    logs = [math.log(v) for v in views]
    return statistics.mean(logs), statistics.stdev(logs)


def p_above(threshold, mu, sigma):
    return 0.5 * (1 - math.erf((math.log(threshold) - mu) / (sigma * math.sqrt(2))))


def main():
    ch = json.loads((HERE / "data" / "channel.json").read_text())
    views = [v["views"] for v in ch["uploads"]]
    others = [v["views"] for v in ch["uploads"] if v["title"] != ch["study_title"]]
    med = statistics.median(others)
    top = max(views)
    print(f"Channel: {len(views)} uploads, median of the others {med:,.0f}")
    print(f"Outlier score of the studied film: {top / med:.0f}x")
    print(f"Studied film's share of all channel views: {top / sum(views):.0%}")

    mu, sigma = lognormal_fit(views)
    p = p_above(1_000_000, mu, sigma)
    print(f"\nLog-normal fit: geometric mean {math.exp(mu):,.0f}, sigma {sigma:.2f}")
    print(f"P(one upload passes 1M) = {p:.1%}  (empirical: "
          f"{sum(v >= 1e6 for v in views)}/{len(views)})")
    for n in (1, 5, 10, 20, 30):
        print(f"  {n:>2} uploads -> P(at least one 1M+) = {1 - (1 - p) ** n:.0%}")

    print("\nSpread model, seed 10K views, pool 20M interested viewers")
    for R in (0.3, 0.5, 0.8, 0.9, 0.95, 0.99, 1.1, 1.25, 1.5, 2.0):
        print(f"  R = {R:<5} -> {reach(R):>12,.0f} views")

    print("\nFour levers each improved 20%: x{:.2f}".format(1.2 ** 4))


if __name__ == "__main__":
    main()
