#!/usr/bin/env python3
"""Build this film's voice track from the scriptwriter's, with line 6 respoken.

    python3 build_voice.py                  (run from anywhere; paths are relative to this file)
    python3 build_voice.py --line6 split    the fallback: the scriptwriter's own two halves of line 6
                                            (each spoken alone), if the cure fails a human listen.
                                            Then re-run sync_words.py, mix.py and the render.

Why this exists: review round 2 asked for two things voice.py cannot do in one run.
  1. Line 6 ("Asking is how" / "I love you.") spoken as ONE utterance with a comma
     and cut at the silence, so "how" does not fall like the end of a sentence.
  2. A longer end hold (--tail 2.6 instead of 2.2), so "Home." stands about 2.0 s.

What it does:
  - beats title to fine, and beat home: the scriptwriter's own audio, copied sample
    for sample from 03-script/timing/vo.wav. Up to line 6 every time is unchanged.
  - beats asking and love: the two halves of takes/line6_one_utterance.wav
    ("Asking is how, I love you.", built-in voice, pace 0.8), cut inside the silence
    at the comma. Each half is trimmed by voice.py's own rule (20 ms before the first
    loud sample, 60 ms after the last) and the script's 0.6 s pause is laid between.
  - every pause of the script is kept (pause_after_s), then the tail.
Writes vo.wav, timing.json and timing.js here, in voice.py's format, plus
"line6" in timing.json: how the cut was made and what was measured.
"""
import json
import sys
import wave
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
RUN = HERE.parent.parent
sys.path.insert(0, str(RUN.parent.parent / "tools"))
from voice import chunks  # noqa: E402  the caption grouping voice.py uses (kept for the file format; not drawn)

TAIL = 2.6      # picture after the last word: the reset at about 0.6 s, then "Home." for about 2.0 s
FPS = 30        # the film's frame rate (style.json): the run is a whole number of frames
LOUD = 0.01     # voice.py's trim threshold
CUT_FADE = 0.005


def read(path):
    with wave.open(str(path), "rb") as w:
        sr = w.getframerate()
        x = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768
    return x, sr


def trim(x, sr):
    """voice.py's trim: 20 ms before the first loud sample, 60 ms after the last."""
    loud = np.abs(x) > LOUD
    a = max(0, int(np.argmax(loud)) - int(0.02 * sr))
    b = min(len(x), len(x) - int(np.argmax(loud[::-1])) + int(0.06 * sr))
    return x[a:b].copy(), a, b


def split_at_silence(x, sr):
    """Find the longest run of quiet samples inside the utterance and cut in it."""
    loud = np.abs(x) > LOUD
    first, last = int(np.argmax(loud)), len(x) - int(np.argmax(loud[::-1]))
    best, start = None, None
    for j in range(first + int(0.3 * sr), last - int(0.3 * sr)):
        if not loud[j] and start is None:
            start = j
        elif loud[j] and start is not None:
            if best is None or j - start > best[1] - best[0]:
                best = (start, j)
            start = None
    if best is None or (best[1] - best[0]) / sr < 0.10:
        sys.exit("no silence of 0.10 s or more inside the utterance: the cut would not be clean")
    g0, g1 = best
    # the cut point: the quietest 10 ms inside the gap
    w = int(0.01 * sr)
    rms = [float(np.sqrt((x[i:i + w] ** 2).mean())) for i in range(g0, g1 - w)]
    cut = g0 + int(np.argmin(rms)) + w // 2
    a_part, _, a_end = trim(x[:cut], sr)
    b_part, b_start, _ = trim(x[cut:], sr)
    n = int(CUT_FADE * sr)
    a_part[-n:] *= np.linspace(1, 0, n)          # the two cut edges close to nothing over 5 ms
    b_part[:n] *= np.linspace(0, 1, n)
    floor = 20 * np.log10(np.sqrt((x[g0 + (g1 - g0) // 4: g1 - (g1 - g0) // 4] ** 2).mean()) + 1e-9)
    info = {"gap_s": round((g1 - g0) / sr, 3), "gap_floor_db": round(float(floor), 1),
            "level_at_cut_db": round(float(20 * np.log10(min(rms) + 1e-9)), 1),
            "a_tail_kept_s": round(min(0.06, (cut - g0) / sr), 3), "b_lead_kept_s": round(min(0.02, (g1 - cut) / sr), 3)}
    return a_part, b_part, info


def main():
    cure = not (len(sys.argv) > 2 and sys.argv[1] == "--line6" and sys.argv[2] == "split")
    script = json.loads((RUN / "03-script" / "script.json").read_text())
    old = json.loads((RUN / "03-script" / "timing" / "timing.json").read_text())
    src, sr = read(RUN / "03-script" / "timing" / "vo.wav")
    take, sr2 = read(HERE / "takes" / "line6_one_utterance.wav")
    assert sr == sr2, "sample rates differ"
    half_a, half_b, cut = split_at_silence(take, sr)

    old_rows = {r["id"]: r for r in old["beats"]}
    beats = script["beats"]

    def old_piece(i):
        """A beat's audio from the scriptwriter's track: every non-zero sample between its neighbours."""
        r = old_rows[beats[i]["id"]]
        lo = int(old_rows[beats[i - 1]["id"]]["vo_end"] * sr) + 2 if i > 0 and old_rows[beats[i - 1]["id"]]["vo_end"] else 0
        hi = int(old_rows[beats[i + 1]["id"]]["vo_start"] * sr) - 2 if i + 1 < len(beats) else len(src)
        lo = max(lo, int((r["vo_start"] - 0.05) * sr))
        hi = min(hi, int((r["vo_end"] + 0.05) * sr))
        nz = np.nonzero(src[lo:hi])[0]
        # the offset keeps the piece exactly where it sat against the beat's vo_start
        return src[lo + nz[0]: lo + nz[-1] + 1].copy(), lo + int(nz[0]) - int(round(r["vo_start"] * sr))

    parts, rows, caps, t = [], [], [], 0.25           # voice.py's default --lead
    last_pause = 0.0
    for i, b in enumerate(beats):
        text = (b.get("vo") or "").strip()
        if not text:
            hold = float(b.get("hold_s", 1.5))
            rows.append({"id": b["id"], "vo_start": None, "vo_end": None, "text": "", "hold": [t, t + hold]})
            t += hold
            last_pause = 0.0
            continue
        pause = float(b.get("pause_after_s", 0.28))
        r_old = old_rows[b["id"]]
        off = 0
        if b["id"] == "asking" and cure:
            x, source = half_a, "takes/line6_one_utterance.wav, first half"
            dur = len(x) / sr
        elif b["id"] == "love" and cure:
            x, source = half_b, "takes/line6_one_utterance.wav, second half"
            dur = len(x) / sr
        else:
            (x, off), source = old_piece(i), "03-script/timing/vo.wav"
            dur = round(r_old["vo_end"] - r_old["vo_start"], 3)      # the scriptwriter's own length for the beat
            if abs(len(x) / sr - dur) > 0.01:
                sys.exit(f"beat {b['id']}: the piece cut from the scriptwriter's track is not the length timing.json gives")
            if abs(t - r_old["vo_start"]) < 0.0015:
                t = r_old["vo_start"]                 # beats before line 6 keep the scriptwriter's times exactly
        parts.append((t, x, off))
        rows.append({"id": b["id"], "vo_start": round(t, 3), "vo_end": round(t + dur, 3), "text": text, "source": source})
        caps += chunks(text, t, t + dur, 3)
        t += dur + pause
        last_pause = pause
    for a, b in zip(caps, caps[1:]):
        if 0 < b["start"] - a["end"] <= 0.8:
            a["end"] = b["start"]
    total = t - last_pause + TAIL
    total = round(round(total * FPS) / FPS, 4)

    track = np.zeros(int(total * sr) + 1, np.float32)
    for start, x, off in parts:
        i = int(round(start * sr)) + off
        track[i:i + len(x)] += x[:len(track) - i]
    with wave.open(str(HERE / "vo.wav"), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sr)
        # read as n/32768 and written back the same way, so copied beats are the scriptwriter's samples exactly
        w.writeframes(np.clip(np.round(track * 32768), -32768, 32767).astype(np.int16).tobytes())

    # shots: as voice.py cuts them. Every beat here enters by a cut, 0.12 s before its first word.
    for i, r in enumerate(rows):
        s = r["vo_start"] if r["vo_start"] is not None else r["hold"][0]
        r["enter"] = {"type": "cut"}
        r["shot_start"] = 0.0 if i == 0 else round(max(s - 0.12, 0), 3)
    for i, r in enumerate(rows):
        r["shot_end"] = rows[i + 1]["shot_start"] if i + 1 < len(rows) else total
        r["shot_dur"] = round(r["shot_end"] - r["shot_start"], 3)
        r.pop("hold", None)

    words = sum(len(r["text"].split()) for r in rows)
    said = [r for r in rows if r["vo_end"] is not None]
    spoken = said[-1]["vo_end"] - said[0]["vo_start"] - sum(
        max(0.0, b["vo_start"] - a["vo_end"]) for a, b in zip(said, said[1:]) if b["vo_start"] - a["vo_end"] > 0.7)
    timing = {"duration": total, "voice": old["voice"], "pace": old["pace"], "tail": TAIL, "fps": FPS,
              "words": words, "words_per_minute": round(words / total * 60),
              "speaking_rate_wpm": round(words / spoken * 60), "speech_share": round(spoken / total, 3),
              "built_by": "05-video/audio/build_voice.py from 03-script/timing/vo.wav (beats title to fine, and home) "
                          + ("and takes/line6_one_utterance.wav (beats asking and love)" if cure else "(all beats; tail lengthened)"),
              "line6": dict(cut, spoken_as="Asking is how, I love you.", pause_laid_between_s=0.6) if cure
              else {"spoken_as": "two utterances, the scriptwriter's (fallback)"},
              "beats": rows, "captions": caps, "captions_note": "not drawn: the lyric rows are the only words on screen"}
    (HERE / "timing.json").write_text(json.dumps(timing, indent=1))
    (HERE / "timing.js").write_text("window.TIMING = " + json.dumps(timing, indent=1) + ";\n")
    print(f"{len(rows)} beats, {words} words, {total:.3f} s ({round(total * FPS)} frames at {FPS})")
    for r in rows:
        o = old_rows[r["id"]]
        print(f"  {r['id']:7s} shot {r['shot_start']:7.3f}  voice {r['vo_start']} to {r['vo_end']}   (was {o['vo_start']} to {o['vo_end']})")
    print("line 6 cut:", cut)


if __name__ == "__main__":
    main()
