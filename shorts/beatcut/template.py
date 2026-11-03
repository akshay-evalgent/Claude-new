"""Series templates timed in BARS -> an episode's story.json timed in seconds.

    python3 -m beatcut.template new real-or-ai episodes/<name>        # scaffold an episode from formats/<series>/
    python3 -m beatcut.template build episodes/<name> --bpm 140       # placeholder music at 140 BPM
    python3 -m beatcut.template build episodes/<name> --track song.m4a [--drop 31.2]
                                                                   # lock to a song: its drop lands on the template's drop_bar

In episode.json every time field (shots t0/t1, transitions t, captions t0/t1, overlays t0/t1/t, flicker, sfx, voice t)
is in bars from the start of the edit; transition a/b ramps stay in seconds; shot zoom_keys use 0..1 of the shot.
Then render with:  python3 -m beatcut.story episodes/<name>
"""
import argparse
import json
import shutil
import subprocess
from pathlib import Path

import numpy as np

from . import beatmap

FORMATS = Path(__file__).resolve().parent.parent / "formats"


def new(series, ep_dir):
    src = FORMATS / series
    ep = Path(ep_dir)
    (ep / "clips").mkdir(parents=True, exist_ok=True)
    (ep / "out").mkdir(exist_ok=True)
    if (ep / "episode.json").exists():
        raise SystemExit(f"{ep / 'episode.json'} already exists")
    shutil.copy(src / "template.json", ep / "episode.json")
    for extra in ("EVIDENCE.md", "POST.md"):
        if (src / extra).exists() and not (ep / extra).exists():
            shutil.copy(src / extra, ep / extra)
    print(f"scaffolded {ep}: fill episode.json (clips, in-points, focus, captions, circles, verdict), EVIDENCE.md, POST.md")


def clock(spec, ep, bpm=None, track=None, drop=None):
    """Returns (bar -> seconds function, music dict for story.json)."""
    total = sum(s["bars"] for s in spec["music_sections"])
    if track is None:
        bpm = bpm or spec["bpm"]
        bar = 4 * 60.0 / bpm
        music = {"file": "clips/music.wav", "synth": {"bpm": bpm, "sections": spec["music_sections"]}}
        (ep / "clips" / "music.wav").unlink(missing_ok=True)      # re-synthesize at this tempo
        return (lambda b: b * bar), music, bpm
    bm = beatmap.analyze(track)
    beats = np.array(bm["beats"])
    if drop is None:
        from .mirror import audio_report
        drop = audio_report(track)["drop"]
    downs = beats[::4]
    j = int(np.argmin(np.abs(downs - drop)))
    start = j - spec["drop_bar"]
    if start < 0 or (start + total) * 4 >= len(beats):
        raise SystemExit(f"song does not have {spec['drop_bar']} bars before its drop at {drop:.2f}s and "
                         f"{total - spec['drop_bar']} after it; pick another --drop")
    idx = np.arange(len(beats))
    t0 = beats[start * 4]

    def T(b):
        return float(np.interp(start * 4 + b * 4, idx, beats) - t0)

    out = ep / "clips" / "music.m4a"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{t0:.4f}", "-t", f"{T(total):.4f}", "-i", str(track),
                    "-vn", "-c:a", "aac", "-b:a", "192k", str(out)], check=True)
    print(f"locked to {track}: drop {drop:.2f}s -> bar {spec['drop_bar']}, song starts at {t0:.2f}s, ~{bm['bpm']} bpm")
    return T, {"file": "clips/music.m4a"}, bm["bpm"]


def build(ep_dir, bpm=None, track=None, drop=None):
    ep = Path(ep_dir)
    spec = json.loads((ep / "episode.json").read_text())
    T, music, used_bpm = clock(spec, ep, bpm, track, drop)
    r = lambda b: round(T(b), 3)
    story = {k: v for k, v in spec.items() if k not in ("music_sections", "drop_bar", "bpm", "_how")}
    story["music"] = music
    story["shots"] = []
    for sh in spec["shots"]:
        s = dict(sh, t0=r(sh["t0"]), t1=r(sh["t1"]))
        D = s["t1"] - s["t0"]
        if "zoom_keys" in sh:
            s["zoom_keys"] = [[round(k[0] * D, 3)] + k[1:] for k in sh["zoom_keys"]]
        story["shots"].append(s)
    story["transitions"] = [dict(c, t=r(c["t"])) for c in spec.get("transitions", [])]
    story["captions"] = [dict(c, t0=r(c["t0"]), t1=r(c["t1"])) for c in spec.get("captions", [])]
    ovs = []
    for o in spec.get("overlays", []):
        o = dict(o)
        for k in ("t0", "t1", "t"):
            if k in o:
                o[k] = r(o[k])
        if "beats" in o:
            o["beats"] = [r(b) for b in o["beats"]]
        ovs.append(o)
    story["overlays"] = ovs
    story["flicker"] = [[r(a), r(b)] for a, b in spec.get("flicker", [])]
    story["sfx"] = [[r(t), k] for t, k in spec.get("sfx", [])]
    story["voice"] = [dict(v, t=r(v["t"])) for v in spec.get("voice", [])]
    if spec.get("fade_out"):
        story["fade_out"] = [r(spec["fade_out"][0]), r(spec["fade_out"][1])]
    story["_built"] = {"bpm": used_bpm, "track": str(track) if track else None, "drop_bar": spec["drop_bar"],
                       "drop_at_s": r(spec["drop_bar"])}
    (ep / "story.json").write_text(json.dumps(story, indent=1, ensure_ascii=False))
    print(f"wrote {ep / 'story.json'}: {len(story['shots'])} shots, {r(sum(s['bars'] for s in spec['music_sections']))} s, "
          f"verdict/drop at {r(spec['drop_bar'])} s")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    a = sub.add_parser("new"); a.add_argument("series"); a.add_argument("episode")
    b = sub.add_parser("build"); b.add_argument("episode"); b.add_argument("--bpm", type=float)
    b.add_argument("--track"); b.add_argument("--drop", type=float)
    args = ap.parse_args()
    if args.cmd == "new":
        new(args.series, args.episode)
    else:
        build(args.episode, args.bpm, args.track, args.drop)
