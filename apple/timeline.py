"""Shot timeline for the Apple short (pure Python, shared by the Blender scene and the sound design).
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
#   office : 1970s office / workshop (panelled walls, carpet, desk, typewriter, workbench, arcade cabinets)
#   house  : his 1970s house and car outside        stage  : the money stage (pallets of cash)
#   shop   : a collectibles counter (1990s)          auction: the 2011 auction hall
#   nevada : his living room today, desert outside
SHOTS = [
    ("intro", 0.0, w(0, 0.56), "office"),                 # "In 1976, this man owned"
    ("contract10", w(0, 0.56), s(1) - 0.06, "office"),    # "10% of Apple" on the paper
    ("sold800", s(1) - 0.06, s(2) - 0.1, "office"),       # "He sold it for $800."
    ("atari", s(2) - 0.1, w(2, 0.42), "office"),          # "Ronald Wayne met"
    ("steves", w(2, 0.42), s(3) - 0.04, "office"),        # "Steve Jobs and Steve Wozniak at Atari."
    ("adult", s(3) - 0.04, s(4) - 0.1, "office"),         # "At 41, he was the adult in the room."
    ("split45", s(4) - 0.1, s(5) - 0.02, "office"),       # "The two Steves took 45% each."
    ("split10", s(5) - 0.02, s(6) - 0.1, "office"),       # "Wayne got 10%, to break their ties."
    ("typewriter", s(6) - 0.1, w(6, 0.40), "office"),     # "He wrote the contract,"
    ("sketch", w(6, 0.40), s(7) - 0.08, "office"),        # "and drew the very first Apple logo."
    ("boards", s(7) - 0.08, w(7, 0.48), "office"),        # "Then Jobs took on $15,000"
    ("credit", w(7, 0.48), s(8) - 0.08, "office"),        # "in credit for their first big order."
    ("hook", s(8) - 0.08, s(9) - 0.08, "office"),         # "every partner is on the hook for every debt."
    ("pockets", s(9) - 0.08, s(10) - 0.04, "office"),     # "The two Steves had almost nothing to lose."
    ("house", s(10) - 0.04, s(11) - 0.02, "house"),       # "Wayne did."
    ("calendar", s(11) - 0.02, w(11, 0.36), "office"),    # "So 12 days later,"
    ("strike", w(11, 0.36), w(11, 0.68), "office"),       # "he took his name off,"
    ("cash800", w(11, 0.68), s(12) - 0.06, "office"),     # "for $800."
    ("check", s(12) - 0.06, w(12, 0.50), "office"),       # "Later, he took $1,500 more"
    ("signoff", w(12, 0.50), s(13) - 0.1, "office"),      # "to give up any claim."
    ("trillion", s(13) - 0.1, s(14) - 0.02, "stage"),     # "Today, Apple is worth over $5 trillion."
    ("slab", s(14) - 0.02, s(15) - 0.1, "stage"),         # "10% is about $500 billion."
    ("drawer", s(15) - 0.1, w(15, 0.50), "office"),       # "He kept just one thing: his copy"
    ("signatures", w(15, 0.50), s(16) - 0.06, "office"),  # "of the contract, signed by all three."
    ("sold500", s(16) - 0.06, s(17) - 0.08, "shop"),      # "He sold that for $500."
    ("auction", s(17) - 0.08, w(17, 0.55), "auction"),    # "In 2011, it sold at auction"
    ("gavel", w(17, 0.55), s(18) - 0.1, "auction"),       # "for $1.6 million."
    ("armchair", s(18) - 0.1, s(19) - 0.1, "nevada"),     # "He says he doesn't regret leaving Apple."
    ("newspaper", s(19) - 0.1, e(19) + 0.55, "nevada"),   # "Just selling that piece of paper."
    ("stare", e(19) + 0.55, END, "nevada"),               # the beat
]
SHOT = {n: (t0, t1, st) for n, t0, t1, st in SHOTS}
CUT_FRAMES = sorted({f(t0) for _, t0, _, _ in SHOTS})

if __name__ == "__main__":
    for n, t0, t1, st in SHOTS:
        print(f"{n:12s} {t0:6.2f} {t1:6.2f} {t1 - t0:5.2f}s  f{f(t0):04d}-f{f(t1) - 1:04d}  {st}")
