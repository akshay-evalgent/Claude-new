#!/usr/bin/env python3
"""When each lyric word lights: writes words.json and words.js (window.WORDS).

    python3 sync_words.py        (after build_voice.py, and after transcribe.py has been run on
                                  vo.wav into stt/base, stt/small and stt/medium)

The script's sync rule:
  - a line's FIRST word lights at the beat's vo_start (timing.json), never at a
    speech-to-text time: speech-to-text stamps line starts 0.1 to 1.7 s early on this voice;
  - the words in between take their times from transcribe.py on the voice track;
  - every time is kept inside vo_start to vo_end, and the last word is fully lit by vo_end.

One thing had to be added. transcribe.py's times for the words in between are not good
enough on this voice to light a word by: its base and small models put some of them up to
0.29 s early ("me" in line 2: 4.72 s, where the waveform has the word's first sound at
5.01 s), and its medium model puts others up to 0.23 s late ("fine", "home" in the last
line). No one model is right throughout. So each word was checked against the waveform:
WAVEFORM below is where the word's first sound is, read off a table of band energies
(under 800 Hz, 800 to 3500 Hz, over 4500 Hz, every 20 ms), as seconds after the beat's
vo_start. The time used is transcribe.py's, from whichever of its three models comes
nearest the waveform; where none comes within TOLERANCE, the waveform reading is used
and the word is marked "waveform" in words.json. Nothing here is an estimate from letter
counts or even spacing.
"""
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
TOLERANCE = 0.04      # about one frame
RAMP = 0.1            # the kit lights a word over 0.1 s

# beat: (length of the beat's voice in s, which the readings belong to; [seconds after vo_start, what was read])
WAVEFORM = {
    "ask":    (1.505, [None, (0.41, "m, after the silence that follows the t of Text"), (0.77, "w, after an 80 ms dip"),
                       (0.88, "y, as the n of when ends"), (1.03, "h: low band falls, high band rises")]),
    "again":  (1.591, [None, (0.41, "m, after the silence that follows the t of Text"), (0.77, "w, after an 80 ms dip"),
                       (0.89, "y, as the n of when ends"), (1.03, "h: low band falls, high band rises")]),
    "until":  (1.247, [None, (0.42, "w, as the l of Until ends"), (0.71, "w: the mid band falls after the n of one")]),
    "light":  (1.219, [None, (0.10, "l, before the vowel at 0.16"), (0.34, "s, after the t of light closes"),
                       (0.77, "the vowel, as the z of stays ends")]),
    "fine":   (0.981, [None, (0.10, "n: the mid band falls"), (0.30, "y, as the vowel of know ends"),
                       (0.41, "f: low band falls, high band rises")]),
    "asking": (1.139, [None, (0.47, "the vowel, as the ng of Asking ends"), (0.63, "h, as the z of is ends")]),
    "love":   (0.694, [None, (0.10, "l: the mid band falls"), (0.33, "y, as the v of love ends")]),
    "home":   (1.584, [None, (0.39, "m, after the release of the t of Text"), (0.69, "w, after an 80 ms dip"),
                       (0.83, "y, as the n of when ends"), (1.00, "h: low band falls, high band rises")]),
}
MODELS = ("base", "small", "medium")


def main():
    timing = json.loads((HERE / "timing.json").read_text())
    stt = {m: json.loads((HERE / "stt" / m / "transcript.json").read_text())["words"] for m in MODELS}
    clean = lambda w: "".join(c for c in w.lower() if c.isalnum() or c == "'")
    out, k, misheard = {}, 0, []
    for b in timing["beats"]:
        if b["vo_start"] is None:
            continue
        texts = b["text"].split()
        vs, ve = b["vo_start"], b["vo_end"]
        length, marks = WAVEFORM.get(b["id"], (None, None))
        checked = marks is not None and abs(length - (ve - vs)) < 0.002 and len(marks) == len(texts)
        if not checked:
            print(f"warning: beat {b['id']} is not the recording the waveform readings were made on; "
                  f"using the later of transcribe.py's base and small times", file=sys.stderr)
        rows = []
        for j, text in enumerate(texts):
            cand = {m: stt[m][k + j]["start"] for m in MODELS}
            for m in MODELS:
                if clean(stt[m][k + j]["word"]) != clean(text):
                    misheard.append((b["id"], text, m, stt[m][k + j]["word"]))
            row = {"text": text, "transcribe": cand}
            if j == 0:
                at, source = vs, "vo_start"
            elif checked:
                wave_t = round(vs + marks[j][0], 3)
                best = min(MODELS, key=lambda m: abs(cand[m] - wave_t))
                if abs(cand[best] - wave_t) <= TOLERANCE + 1e-6:
                    at, source = cand[best], f"transcribe.py {best}"
                else:
                    at, source = wave_t, "waveform"
                row["waveform"] = wave_t
                row["waveform_read"] = marks[j][1]
            else:
                at, source = max(cand["base"], cand["small"]), "transcribe.py, later of base and small"
            # inside the beat, after the word before it, and lit by the time the voice ends
            lo = rows[-1]["at"] + 0.06 if rows else vs
            at = round(min(max(at, lo, vs), ve - RAMP), 3)
            row.update(at=at, source=source)
            rows.append(row)
        k += len(texts)
        out[b["id"]] = rows
    if k != len(stt["base"]):
        sys.exit(f"transcribe.py heard {len(stt['base'])} words; the script has {k}")
    data = {"note": "at: when the word starts to turn to full ink, seconds from the start of the film. "
                    "Built by sync_words.py; see its header for the rule.",
            "ramp": RAMP, "misheard": [list(m) for m in misheard], "beats": out}
    (HERE / "words.json").write_text(json.dumps(data, indent=1))
    (HERE / "words.js").write_text("window.WORDS = " + json.dumps(data, indent=1) + ";\n")
    n = {}
    for b, rows in out.items():
        print(b)
        for r in rows:
            n[r["source"]] = n.get(r["source"], 0) + 1
            c = r["transcribe"]
            print(f"   {r['text']:8s} at {r['at']:7.3f}  {r['source']:22s} waveform {r.get('waveform', '-'):>7}  "
                  f"base {c['base']:.2f} small {c['small']:.2f} medium {c['medium']:.2f}")
    print(n)
    print("misheard:", misheard or "none: all three models heard every word of the script")


if __name__ == "__main__":
    main()
