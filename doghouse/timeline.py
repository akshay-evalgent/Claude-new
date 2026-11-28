"""Shot timeline for the doghouse short (pure Python, shared by the Blender scene and the sound design).
Shots are cut to the narration line timings in $QS_SCRATCH/vo_timing.json.

view: "ext" = the backyard as anyone sees it; "cut" = cutaway, the ground and everything in front of
the section plane (y = 0) removed so the shaft, the rooms and the tunnel read in cross-section."""
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
    ("intro", 0.0, s(1) - 0.1, "ext"),            # "This doghouse has never had a dog."
    ("notdog", s(1) - 0.1, s(2) - 0.1, "ext"),    # "Because it isn't a doghouse."
    ("hole", s(2) - 0.1, s(3) - 0.06, "ext"),     # "Start with a hole underneath it."
    ("cavein", s(3) - 0.06, s(4) - 0.06, "cut"),  # "But dirt walls cave in."
    ("rings", s(4) - 0.06, w(4, 0.62), "cut"),    # "So you lower concrete rings, one on top of another,"
    ("sixm", w(4, 0.62), s(5) - 0.06, "cut"),     # "6 meters down."
    ("ladder", s(5) - 0.06, s(6) - 0.1, "cut"),   # "Add a ladder."
    ("nothideout", s(6) - 0.1, s(7) - 0.06, "cut"),  # "But a hole in the ground isn't a hideout."
    ("dig", s(7) - 0.06, w(7, 0.55), "cut"),      # "So at the bottom, you dig sideways,"
    ("pour", w(7, 0.55), s(8) - 0.1, "cut"),      # "and pour a room."
    ("air", s(8) - 0.1, s(9) - 0.04, "cut"),      # "Down here, you need air."
    ("vent", s(9) - 0.04, w(9, 0.62), "cut"),     # "So the vent comes up through the doghouse roof,"
    ("chimney", w(9, 0.62), s(10) - 0.1, "ext"),  # "as a tiny chimney."
    ("power", s(10) - 0.1, w(10, 0.40), "cut"),   # "Run power under the lawn,"
    ("lights", w(10, 0.40), s(11) - 0.1, "cut"),  # "and now you've got lights, a bed, and Wi-Fi."
    ("secondway", s(11) - 0.1, s(12) - 0.06, "cut"),  # "But every bunker needs a second way out."
    ("keepdig", s(12) - 0.06, s(13) - 0.06, "cut"),   # "So you keep digging."
    ("garden", s(13) - 0.06, s(14) - 0.06, "cut"),    # "Under the garden. Under the fence."
    ("break", s(14) - 0.06, s(15) - 0.08, "cut"),     # "Until you break through..."
    ("neighbor", s(15) - 0.08, s(16) - 0.1, "cut"),   # "into your neighbor's bunker."
    ("dog2", s(16) - 0.1, END, "ext"),                # "Turns out, his doghouse doesn't have a dog either."
]
SHOT = {n: (t0, t1, v) for n, t0, t1, v in SHOTS}
CUT_FRAMES = sorted({f(t0) for _, t0, _, _ in SHOTS})

if __name__ == "__main__":
    for n, t0, t1, v in SHOTS:
        print(f"{n:10s} {t0:6.2f} {t1:6.2f} {t1 - t0:5.2f}s  f{f(t0):04d}-f{f(t1) - 1:04d}  {v}")
