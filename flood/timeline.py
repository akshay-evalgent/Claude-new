"""Shot timeline for the flood short (pure Python, shared by the Blender scene and the sound design).
Shots are cut to the narration line timings in $QS_SCRATCH/vo_timing.json."""
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
    """Time at a fraction of line i (to land a cut on a word)."""
    return LN[i]["start"] + (LN[i]["end"] - LN[i]["start"]) * frac


# (name, t0, t1, set)
#   storm   : the flooded crossing in the rain          cutY : side cutaway (section in front of the car)
#   cutX    : front cutaway (section ahead of the nose)  xray : side cutaway with the x-ray car
#   evening : after the storm, golden light
SHOTS = [
    ("aerial_approach", 0.0, w(0, 0.52), "storm"),
    ("water_flow", w(0, 0.52), s(1) - 0.04, "storm"),
    ("conv_cross", s(1) - 0.04, w(1, 0.62), "storm"),
    ("driver_watch", w(1, 0.62), s(2) - 0.08, "storm"),
    ("rise_gauge", s(2) - 0.08, w(2, 0.47), "storm"),
    ("murky", w(2, 0.47), w(2, 0.80), "storm"),
    ("depth_reveal", w(2, 0.80), s(3) - 0.06, "cutY"),
    ("six_cut", s(3) - 0.06, w(3, 0.55), "cutY"),
    ("underbody", w(3, 0.55), s(4) - 0.02, "storm"),
    ("stall_dash", s(4) - 0.02, s(5) - 0.1, "storm"),
    ("foot_cut", s(5) - 0.1, w(5, 0.55), "cutY"),
    ("float_wide", w(5, 0.55), s(6) - 0.06, "storm"),
    ("air_box", s(6) - 0.06, w(6, 0.52), "xray"),
    ("air_box2", w(6, 0.52), s(7) - 0.06, "xray"),
    ("lift_arrows", s(7) - 0.06, w(7, 0.50), "xray"),
    ("lift_close", w(7, 0.50), s(8) - 0.06, "cutY"),
    ("tire_lift", s(8) - 0.06, s(9) - 0.02, "cutY"),
    ("current_cut", s(9) - 0.02, w(9, 0.50), "cutX"),
    ("swept", w(9, 0.50), s(10) - 0.06, "storm"),
    ("suv", s(10) - 0.06, w(10, 0.50), "storm"),
    ("truck", w(10, 0.50), s(11) - 0.06, "storm"),
    ("washout_surface", s(11) - 0.06, w(11, 0.40), "storm"),
    ("washout_cut", w(11, 0.40), s(12) - 0.08, "cutY"),
    ("stranded", s(12) - 0.08, w(12, 0.50), "storm"),
    ("stranded_close", w(12, 0.50), s(13) - 0.08, "storm"),
    ("sign", s(13) - 0.08, w(13, 0.45), "storm"),
    ("turn_around", w(13, 0.45), s(14) - 0.08, "storm"),
    ("wade", s(14) - 0.08, w(14, 0.52), "storm"),
    ("high_ground", w(14, 0.52), s(15) - 0.12, "storm"),
    ("long_way", s(15) - 0.12, s(16) - 0.1, "evening"),
    ("scenic", s(16) - 0.1, e(16) + 0.35, "evening"),
    ("scenic_wide", e(16) + 0.35, END, "evening"),
]
SHOT = {n: (t0, t1, st) for n, t0, t1, st in SHOTS}
CUT_FRAMES = sorted({f(t0) for _, t0, _, _ in SHOTS})

if __name__ == "__main__":
    for n, t0, t1, st in SHOTS:
        print(f"{n:16s} {t0:6.2f} {t1:6.2f} {t1 - t0:5.2f}s  f{f(t0):04d}-f{f(t1) - 1:04d}  {st}")
