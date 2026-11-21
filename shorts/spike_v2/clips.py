#!/usr/bin/env python3
"""Swap real moving clips into a Spike Files v2 edit.

    python3 spike_v2/clips.py edits_spike/<name>.json <folder with downloaded Shorts> <root> [seconds=3.0]

For every Short the edit shows (hook hit, before/after, montage items) it looks for a downloaded file whose name
contains the video id, cuts a short excerpt (default 3 s, never more than 9 s; start with "clip_in" on the item,
default 0.4 s) into 1080x1920 frames under <root>/clips/<id>/, and records it on the item as "clip".
Scenes then play the clip instead of cycling the four still frames. Items without a file keep their stills.
"""
import glob
import json
import os
import subprocess
import sys


def main():
    spec_path, src, root = sys.argv[1:4]; secs = min(9.0, float(sys.argv[4])) if len(sys.argv) > 4 else 3.0
    spec = json.load(open(spec_path)); files = glob.glob(os.path.join(src, "*.mp4")) + glob.glob(os.path.join(src, "*.webm")) + glob.glob(os.path.join(src, "*.mkv"))
    items = []
    for sc in spec["scenes"]:
        items += [sc[k] for k in ("hit", "before", "after") if isinstance(sc.get(k), dict)] + sc.get("items", [])
    done = 0
    for it in items:
        vid = it.get("id")
        f = next((p for p in files if vid and vid in os.path.basename(p)), None)
        if not f:
            continue
        out = os.path.join(root, "clips", vid); os.makedirs(out, exist_ok=True)
        subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-y", "-ss", str(it.get("clip_in", 0.4)), "-t", str(secs), "-i", f,
                        "-vf", "fps=30,scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920", "-q:v", "3",
                        os.path.join(out, "%04d.jpg")], check=True, stdin=subprocess.DEVNULL)
        n = len(glob.glob(os.path.join(out, "*.jpg")))
        it["clip"] = {"dir": f"clips/{vid}", "n": n, "fps": 30}; done += 1
    json.dump(spec, open(spec_path, "w"), indent=1, ensure_ascii=False)
    print(f"{done} of {len(items)} items now use a real clip ({secs:.1f}s each)")


if __name__ == "__main__":
    main()
