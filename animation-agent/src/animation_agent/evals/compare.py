"""Compare a run with the baseline. All metrics are higher-is-better; 'n' is ignored."""
from __future__ import annotations

TOLERANCE = 0.05            # ratios: a drop of more than 5 points is a regression
JUDGE_TOLERANCE = 0.3       # judge scores (1-5) are noisy: allow 0.3


def regressions(current: dict[str, dict], baseline: dict[str, dict]) -> list[str]:
    found = []
    for suite, metrics in current.items():
        base = baseline.get(suite, {})
        for name, value in metrics.items():
            if name == "n" or name not in base:
                continue
            allowed = JUDGE_TOLERANCE if name.startswith("judge_") else TOLERANCE
            if value < base[name] - allowed:
                found.append(f"{suite}.{name}: {value} vs baseline {base[name]} (allowed drop {allowed})")
    return found
