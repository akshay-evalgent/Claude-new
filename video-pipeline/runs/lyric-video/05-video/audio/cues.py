#!/usr/bin/env python3
"""The moments the picture and the sound share: writes cues.json and cues.js (window.CUES).

    python3 cues.py        (after build_voice.py; before mix.py and before a render)

Two things on the sheet are also heard, so their times are worked out once, here, and read by
both composition.html (cues.js) and mix.py (cues.json). Neither is a voice time: the voice
track, timing.json and words.json are not touched.

  line_in      the faint first line arrives on the sheet (the script's "at about 0.5 s"),
               over four frames. Heard as one soft hit when it starts (final review, hook).
  rest_steps   the rest after "I know you're fine." is the film's longest (2.1 s by the
               script; the review's ruling keeps it and asks for it to be filled). Three
               road steps land in it, one at each quarter of the rest, so with the next
               line's own hit they make four even beats: step, step, step, line. Each step
               is heard as a softer hit (final review, retention).
"""
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
LINE_IN = [0.5, 0.62]     # the picture's own time, from the script's motion note for the title
REST_STEPS = 3


def main():
    timing = json.loads((HERE / "timing.json").read_text())
    beats = {b["id"]: b for b in timing["beats"]}
    rest = [beats["fine"]["vo_end"], beats["asking"]["shot_start"]]
    every = (rest[1] - rest[0]) / (REST_STEPS + 1)
    cues = {
        "note": "Built by cues.py from timing.json. Seconds from the start of the film.",
        "line_in": LINE_IN,
        "rest": rest,
        "rest_steps": [round(rest[0] + every * (i + 1), 3) for i in range(REST_STEPS)],
        "rest_step_every": round(every, 3),
    }
    (HERE / "cues.json").write_text(json.dumps(cues, indent=1) + "\n")
    (HERE / "cues.js").write_text("window.CUES = " + json.dumps(cues, indent=1) + ";\n")
    print(json.dumps(cues, indent=1))


if __name__ == "__main__":
    main()
