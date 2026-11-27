"""Shot timeline for the pool short (pure Python, shared by the Blender scene and the sound design).
Shots are cut to the narration line timings in $QS_SCRATCH/vo_timing.json.

view: "ext" = the backyard as anyone sees it; "cut" = cutaway, the ground and everything in front of
the section plane removed so the garage, the rams and the water read in cross-section."""
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


# (name, t0, t1, view)
SHOTS = [
    ("hook", 0.0, s(1) - 0.1, "ext"),            # "This is how a swimming pool becomes a secret garage."
    ("yard", s(1) - 0.1, s(2) - 0.04, "ext"),     # "Start with a hole in your backyard."
    ("dig", s(2) - 0.04, s(3) - 0.12, "ext"),     # "Ten meters long, and four meters deep."
    ("slab", s(3) - 0.12, w(3, 0.42), "cut"),     # "Pour a thick concrete floor,"
    ("walls", w(3, 0.42), s(4) - 0.1, "cut"),     # "and walls strong enough to hold back the ground."
    ("lift", s(4) - 0.1, s(5) - 0.04, "cut"),     # "At one end, a car lift."
    ("park", s(5) - 0.04, s(6) - 0.1, "cut"),     # "Park your car on it."
    ("trick", s(6) - 0.1, s(7) - 0.06, "ext"),    # "Now the trick."
    ("rams", s(7) - 0.06, s(8) - 0.1, "cut"),     # "In each corner, a hydraulic ram that can lift 30 tons."
    ("tub", s(8) - 0.1, s(9) - 0.06, "ext"),      # "On top of them, a steel tub, as big as the hole."
    ("tilefill", s(9) - 0.06, s(10) - 0.08, "ext"),  # "Tile it, and fill it with water."
    ("deck", s(10) - 0.08, w(10, 0.55), "ext"),   # "Lay the deck around it,"
    ("edges", w(10, 0.55), s(11) - 0.1, "ext"),   # "so the edges line up perfectly."
    ("justpool", s(11) - 0.1, s(12) - 0.12, "ext"),  # "To everyone else, it's just a pool."
    ("button", s(12) - 0.12, s(13) - 0.06, "ext"),   # "But press this button,"
    ("rise", s(13) - 0.06, s(14) - 0.04, "ext"),  # "and the whole pool rises."
    ("water", s(14) - 0.04, s(15) - 0.1, "cut"),  # "Water and all."
    ("carup", s(15) - 0.1, w(15, 0.80), "cut"),   # "Underneath, your car comes up to meet you."
    ("driveout", w(15, 0.80), s(16) - 0.1, "ext"),  # (the car drives out)
    ("sink", s(16) - 0.1, s(17) - 0.08, "ext"),   # "Press it again, and it sinks back down, like nothing ever happened."
    ("congrats", s(17) - 0.08, s(18) - 0.06, "ext"),  # "Congratulations."
    ("neighbor", s(18) - 0.06, END, "ext"),       # "Your neighbors just think you really like swimming."
]
SHOT = {n: (t0, t1, v) for n, t0, t1, v in SHOTS}
CUT_FRAMES = sorted({f(t0) for _, t0, _, _ in SHOTS})

if __name__ == "__main__":
    for n, t0, t1, v in SHOTS:
        print(f"{n:10s} {t0:6.2f} {t1:6.2f} {t1 - t0:5.2f}s  f{f(t0):04d}-f{f(t1) - 1:04d}  {v}")
