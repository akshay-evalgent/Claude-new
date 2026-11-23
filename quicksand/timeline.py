"""Shot timeline for the quicksand short (pure Python, shared by the Blender scene and the
sound design). Shots are cut to the narration line timings in $QS_SCRATCH/vo_timing.json."""
import json, os

FPS = 24
TIMING = json.load(open(os.path.join(os.environ["QS_SCRATCH"], "vo_timing.json")))
LN = TIMING["lines"]
END = TIMING["total"]


def f(t):
    return int(round(t * FPS)) + 1


def s(i):  # start of narration line i
    return LN[i]["start"]


# (name, t0, t1, set). Cuts land just before the word they illustrate.
SHOTS = [
    ("walk_wide", 0.0, 1.30, "beach"),
    ("boots", 1.30, 2.30, "beach"),
    ("sink_front", 2.30, s(1) + 1.16, "beach"),
    ("yank", s(1) + 1.16, s(2) - 0.18, "beach"),
    ("section_knees", s(2) - 0.18, s(2) + 2.0, "section_x"),
    ("macro_lock", s(2) + 2.0, s(3) - 0.03, "macro"),
    ("car", s(3) - 0.03, s(4) - 0.2, "car"),
    ("orbit_sink", s(4) - 0.2, s(5) - 0.18, "beach"),
    ("section_waist", s(5) - 0.18, s(6) - 0.09, "section_x"),
    ("stop_waist", s(6) - 0.09, s(7) - 0.12, "beach"),
    ("bad_news", s(7) - 0.12, s(8) - 0.08, "beach"),
    ("stuck_high", s(8) - 0.08, s(9) - 0.12, "beach"),
    ("tide_aerial", s(9) - 0.12, s(9) + 1.43, "beach"),
    ("tide_low", s(9) + 1.43, s(10) - 0.15, "beach"),
    ("calm_face", s(10) - 0.15, s(11) - 0.12, "beach"),
    ("lean_back", s(11) - 0.12, s(12) - 0.04, "beach"),
    ("pool", s(12) - 0.04, s(13) - 0.17, "pool"),
    ("section_wiggle", s(13) - 0.17, s(14) - 0.08, "section_y"),
    ("macro_seep", s(14) - 0.08, s(15) - 0.2, "macro"),
    ("float_up", s(15) - 0.2, s(16) - 0.03, "beach"),
    ("roll_out", s(16) - 0.03, s(17) - 0.17, "beach"),
    ("hero", s(17) - 0.17, s(18) - 0.38, "beach"),
    ("step", s(18) - 0.38, s(18) + 1.12, "beach"),
    ("drop", s(18) + 1.12, END, "beach"),
]
SHOT = {n: (t0, t1, st) for n, t0, t1, st in SHOTS}
CUT_FRAMES = sorted({f(t0) for _, t0, _, _ in SHOTS})

