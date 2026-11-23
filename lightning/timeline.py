"""Shot timeline for the lightning short (pure Python, shared by the Blender scene and the sound
design). Shots are cut to the narration line timings in $QS_SCRATCH/vo_timing.json."""
import json, os

FPS = 24
TIMING = json.load(open(os.path.join(os.environ["QS_SCRATCH"], "vo_timing.json")))
LN = TIMING["lines"]
END = TIMING["total"]


def f(t):
    return int(round(t * FPS)) + 1


def s(i):  # start of narration line i
    return LN[i]["start"]


def e(i):  # end of narration line i
    return LN[i]["end"]


def w(i, frac):
    """Time at a fraction of line i, by character count (to land a cut on a word)."""
    return LN[i]["start"] + (LN[i]["end"] - LN[i]["start"]) * frac


# (name, t0, t1, set)
#   storm  : road at stormy dusk, sedan painted   xray : sedan in x-ray
#   conv   : convertible (painted)                conv_xray : convertible x-ray
#   sun    : the sun close-up                     dawn : road after the storm
SHOTS = [
    ("aerial_drive", 0.0, w(0, 0.30), "storm"),
    ("driver_flash", w(0, 0.30), w(0, 0.49), "storm"),
    ("tire_roll", w(0, 0.49), s(1) - 0.06, "storm"),
    ("bolt_sky", s(1) - 0.06, s(2) - 0.08, "storm"),
    ("tire_macro", s(2) - 0.08, w(2, 0.52), "storm"),
    ("arc_jump", w(2, 0.52), s(3) - 0.2, "storm"),
    ("shell_paint", s(3) - 0.2, w(3, 0.50), "storm"),
    ("xray_reveal", w(3, 0.50), s(4) - 0.1, "xray"),
    ("strike_wide", s(4) - 0.1, w(4, 0.40), "storm"),
    ("antenna_hit", w(4, 0.40), s(5) - 0.04, "storm"),
    ("xray_current", s(5) - 0.04, s(6) - 0.02, "xray"),
    ("tire_blast", s(6) - 0.02, s(7) - 0.12, "storm"),
    ("xray_cabin", s(7) - 0.12, w(7, 0.55), "xray"),
    ("driver_xray", w(7, 0.55), s(8) - 0.12, "xray"),
    ("car_smoke", s(8) - 0.12, s(9) - 0.12, "storm"),
    ("bolt_macro", s(9) - 0.12, w(9, 0.55), "storm"),
    ("sun", w(9, 0.55), s(10) - 0.1, "sun"),
    ("antenna_melt", s(10) - 0.1, s(11) - 0.03, "storm"),
    ("tire_pop", s(11) - 0.03, s(12) - 0.03, "storm"),
    ("glass", s(12) - 0.03, s(13) - 0.03, "storm"),
    ("dash", s(13) - 0.03, s(14) - 0.15, "storm"),
    ("driver_fine", s(14) - 0.15, w(14, 0.38), "storm"),
    ("window_rain", w(14, 0.38), s(15) - 0.02, "storm"),
    ("roof_crane", s(15) - 0.02, s(16) - 0.12, "storm"),
    ("convertible", s(16) - 0.12, w(16, 0.50), "conv"),
    ("conv_xray", w(16, 0.50), s(17) - 0.15, "conv_xray"),
    ("dawn_wide", s(17) - 0.15, w(17, 0.45), "dawn"),
    ("step_out", w(17, 0.45), s(18) - 0.2, "dawn"),
    ("hubcap", s(18) - 0.2, e(18) + 0.45, "dawn"),
    ("sag", e(18) + 0.45, END, "dawn"),
]
SHOT = {n: (t0, t1, st) for n, t0, t1, st in SHOTS}
CUT_FRAMES = sorted({f(t0) for _, t0, _, _ in SHOTS})

if __name__ == "__main__":
    for n, t0, t1, st in SHOTS:
        print(f"{n:14s} {t0:6.2f} {t1:6.2f} {t1 - t0:5.2f}s  f{f(t0):04d}-f{f(t1) - 1:04d}  {st}")
