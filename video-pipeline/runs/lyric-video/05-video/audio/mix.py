#!/usr/bin/env python3
"""The film's sound track: tools/sound.py's own bed, hits and loudness, arranged as the script's sound_notes ask.

    python3 mix.py        (after build_voice.py, sync_words.py and cues.py; writes track.wav here)

sound.py makes one unchanging bed that fades up from nothing over 0.8 s. The script asks for
three things it has no switch for, so this file reuses its parts (bed, hit, the voice duck,
the loudness pass) and changes only how they are laid out:
  - the bed is at its full level from the first frame (review: the same level under the
    title as under the first two lines); it still fades over the last 0.8 s, to the last frame;
  - one added layer of weight (an octave and a fifth under the bed's drone) comes in on the
    word "light", as the window lights, and leaves before the payoff line starts, so the
    payoff and the last line are thin again;
  - a soft hit on each of the seven line starts, and none on beat "love" (the second row of a
    line already on the sheet).

After the final review (round 1), three more:
  - the bed and the added layer are BED_LIFT_DB louder against the voice, so the rests sit at
    about -22 dB (they measured -27.5; the reference is never thinner than about -23.5), and
    most of the bed's own slow swell is taken out, so the rests that were thinnest (-30 and
    lower, round "Until one word,") are lifted with the others. sound.py's duck under the
    voice is unchanged;
  - one more soft hit, the same sound at the same level, when the faint first line arrives
    (cues.json line_in), so something is heard before the first word;
  - the rest after "I know you're fine." is filled: the added layer swells by SWELL_DB through
    it instead of leaving, and goes in the last LEAVE_S before the payoff line; and each of the
    three road steps that land in that rest (cues.json rest_steps) is heard as a softer hit.
All of it was set by measurement, not by ear: see NOTES.md, "To check by ear".

Loudness: benchmarks.json sound.integrated_lufs, by sound.py's pass (one gain and a limiter),
with one change. The pass is run on the FIRST CUT's layout and its gain is then used for this
one, so the voice is as loud, and as limited, as it was in the first cut (within 0.1 dB on
every line). Run on this layout the pass does harm. The first cut's -13.1 LUFS was the voice
alone: its rests were under the loudness meter's gate. A bed at -22 dB is inside the gate, so
the meter now averages the rests in (the voice runs for 40% of the film) and reads about
2.5 LU lower for the same voice. The pass would make that up by driving the voice 2 to 3 dB
further into a limiter that already takes about 5 dB off its peaks (tried: after its four
rounds the reading was still -14.0). So this track reads under the target instead.
No music: sources.json lists none.
"""
import json
import subprocess
import sys
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
RUN = HERE.parent.parent
sys.path.insert(0, str(RUN.parent.parent / "tools"))
import sound  # noqa: E402

SR = sound.SR
PEAK = -1.5
BED_LIFT_DB = 5.0     # bed and added layer against the voice: the rests go from about -27.5 to about -22 dB
EVEN = 0.8            # how much of the bed's own slow swell is taken out (1 would be all of it)
SWELL_DB = 3.0        # how much the added layer gains through the rest after "fine."
LEAVE_S = 0.5         # ...and how long before the payoff line it takes to go
HIT = 0.7             # sound.py's level for a hit under a voice: the line starts, and the first line arriving
STEP = 0.4            # a road step landing in the rest: the same sound, about 5 dB under a line start


def ramp(n, t0, t1, up=True):
    """0 before t0, 1 after t1 (or the reverse), smooth in between."""
    t = np.arange(n) / SR
    p = np.clip((t - t0) / max(t1 - t0, 1e-6), 0, 1)
    p = p * p * (3 - 2 * p)
    return p if up else 1 - p


def render(mix, out, gain_db):
    """One gain and sound.py's limiter. Returns (LUFS, true peak)."""
    tmp = HERE / "track.premix.wav"
    scale = max(1.0, float(np.abs(mix).max()))          # the 16-bit file cannot hold more than 1
    sound.write(tmp, mix / scale)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(tmp), "-af",
                    f"volume={gain_db + 20 * np.log10(scale):.2f}dB,"
                    f"alimiter=limit={10 ** (PEAK / 20):.4f}:level=disabled:attack=3:release=60",
                    "-ar", str(SR), "-c:a", "pcm_s16le", str(out)], check=True)
    tmp.unlink(missing_ok=True)
    return sound.measure(out)


def loudness_gain(mix, lufs):
    """sound.py's loudness pass: the gain (dB on the unscaled mix) that brings it to `lufs` through the limiter."""
    probe = HERE / "track.probe.wav"
    got, _ = render(mix, probe, 0.0)
    gain = lufs - got
    for _ in range(4):
        got, _ = render(mix, probe, gain)
        if got is None or abs(got - lufs) <= 0.3:
            break
        gain += lufs - got
    probe.unlink(missing_ok=True)
    return gain, got


def main():
    timing = json.loads((HERE / "timing.json").read_text())
    words = json.loads((HERE / "words.json").read_text())["beats"]
    cues = json.loads((HERE / "cues.json").read_text())
    bench = json.loads((RUN / "02-analysis" / "benchmarks.json").read_text())
    lufs = bench["sound"]["integrated_lufs"]
    beats = {b["id"]: b for b in timing["beats"]}
    dur = timing["duration"]
    n = int(dur * SR)
    rng = np.random.default_rng(7)                      # sound.py's seed

    vo = sound.read_any(HERE / "vo.wav", dur)
    vo = vo / (np.abs(vo).max() + 1e-9) * 0.8
    k = int(0.15 * SR)
    env = np.convolve(np.abs(vo), np.ones(k) / k, mode="same")
    duck = 1 - 0.6 * np.clip(env / 0.05, 0, 1)          # sound.py: about 8 dB down while the voice speaks

    # the bed, without its fade-in: make it 0.8 s longer and drop the head
    head = int(0.8 * SR)
    bed = sound.bed(n + head, rng)[head:]
    bed[:int(0.03 * SR)] *= np.linspace(0, 1, int(0.03 * SR))      # 30 ms, so the first sample does not click
    bed_first = bed                                                 # the first cut's bed
    # sound.py's bed swells and sinks by itself, 5 dB over about 17 s, and is at its lowest under
    # "Until one word," (the first cut's thinnest rests). Take EVEN of that out, so every rest is
    # lifted to about the same level. The envelope is held from 1.5 s before the end, so the
    # bed's own fade to the last frame is left alone.
    w = int(1.0 * SR)
    e = np.sqrt(np.convolve(np.pad(bed ** 2, (w // 2, w - w // 2 - 1), mode="reflect"), np.ones(w) / w, mode="valid"))
    e[int((dur - 1.5) * SR):] = e[int((dur - 1.5) * SR)]
    bed = bed * (np.percentile(e, 90) / e) ** EVEN

    # the added weight: from the word "light" to the start of the payoff line
    t = np.arange(n) / SR
    t_in = words["light"][1]["at"]
    t_out = beats["asking"]["shot_start"]
    low = sum(a * np.sin(2 * np.pi * f * t + p) * (0.8 + 0.2 * np.sin(2 * np.pi * lfo * t + p))
              for f, a, p, lfo in [(55.0, 1.0, 0.4, 0.06), (82.4, 0.8, 1.9, 0.09), (329.6, 0.22, 0.7, 0.13)])
    low = 0.045 * low / np.abs(low).max() * ramp(n, t_in, t_in + 0.9)
    low_first = low * ramp(n, t_out - 1.2, t_out, up=False)        # the first cut: it left through the rest
    r0, r1 = cues["rest"]                                           # now: it swells through the rest, then goes
    swell = 1 + (10 ** (SWELL_DB / 20) - 1) * ramp(n, r0, t_out - LEAVE_S)
    low = low * swell * ramp(n, t_out - LEAVE_S, t_out, up=False)

    hits = [beats[i]["shot_start"] for i in ("ask", "again", "until", "light", "fine", "asking", "home")]
    marks = np.zeros(n)
    for ht in hits:
        h = sound.hit(rng)
        i = int(ht * SR)
        marks[i:i + len(h)] += h[:n - i] * HIT

    # the first cut's layout, only to find the gain its loudness pass used
    first = (bed_first + low_first) * duck + marks + vo
    gain, first_lufs = loudness_gain(first, lufs)

    # this cut
    rng2 = np.random.default_rng(8)                     # their own seed: the seven line-start hits stay the same samples
    extra = [(cues["line_in"][0], HIT)] + [(at, STEP) for at in cues["rest_steps"]]
    for ht, level in extra:
        h = sound.hit(rng2)
        i = int(ht * SR)
        marks[i:i + len(h)] += h[:n - i] * level
    mix = (bed + low) * 10 ** (BED_LIFT_DB / 20) * duck + marks + vo

    out = HERE / "track.wav"
    got, peak = render(mix, out, gain)

    # what the bed does between the lines, measured on the finished track (voice-free stretches only)
    x = sound.read_any(out, dur)
    def level(a, b):
        s = x[int(a * SR):int(b * SR)]
        return round(float(20 * np.log10(np.sqrt((s ** 2).mean()) + 1e-9)), 1)
    steps = cues["rest_steps"]
    rests = {"title, before the added hit": level(0.1, cues["line_in"][0] - 0.05),
             "title, after it": level(cues["line_in"][0] + 0.45, beats["ask"]["shot_start"] - 0.05),
             "after line 1": level(beats["ask"]["vo_end"] + 0.1, beats["again"]["shot_start"] - 0.05),
             "after line 2": level(beats["again"]["vo_end"] + 0.1, beats["until"]["shot_start"] - 0.05),
             "after 'word,'": level(beats["until"]["vo_end"] + 0.1, beats["light"]["shot_start"] - 0.05),
             "after 'stays on.' (weight in)": level(beats["light"]["vo_end"] + 0.1, beats["fine"]["shot_start"] - 0.05),
             "after 'fine.', the whole rest (weight swelling, three steps)": level(r0 + 0.1, r1 - 0.05),
             "after 'fine.', before the first step": level(r0 + 0.1, steps[0] - 0.02),
             "after 'fine.', between steps 2 and 3 (bed and weight only)": level(steps[1] + 0.3, steps[2] - 0.02),
             "after 'how' (the pause)": level(beats["asking"]["vo_end"] + 0.1, beats["love"]["shot_start"] - 0.02),
             "after 'you.' (thin again)": level(beats["love"]["vo_end"] + 0.1, beats["home"]["shot_start"] - 0.05),
             "end hold, first 1.5 s": level(beats["home"]["vo_end"] + 0.1, beats["home"]["vo_end"] + 1.6),
             "last 0.2 s": level(dur - 0.2, dur)}
    voiced = {b: level(beats[b]["vo_start"], beats[b]["vo_end"])
              for b in ("ask", "again", "until", "light", "fine", "asking", "love", "home")}
    info = {"lufs": got, "target_lufs": lufs, "peak_dbtp": peak, "duration": dur,
            "gain_db": round(gain, 2), "gain_from": f"the first cut's layout, which that gain brings to {first_lufs} LUFS",
            "bed_lift_db": BED_LIFT_DB, "hits": hits,
            "added_hits": [{"at": at, "level": lv} for at, lv in extra],
            "weight_layer": [round(t_in, 3), round(t_out, 3)],
            "weight_swell": {"db": SWELL_DB, "from": r0, "to": round(t_out - LEAVE_S, 3)},
            "rest_levels_db": rests, "voiced_levels_db": voiced}
    (HERE / "mix.json").write_text(json.dumps(info, indent=1) + "\n")
    print(json.dumps(info, indent=1))
    print(f"wrote {out}")


if __name__ == "__main__":
    main()
