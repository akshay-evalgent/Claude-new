#!/usr/bin/env python3
"""Collect the real material for a Spike Files v2 edit.

    python3 spike_v2/fetch_assets.py frames <root> <prefix> <n>:<video id> [<n>:<video id> ...]
        The four full-resolution frames YouTube serves for each Short (cover + three moments)
        -> <root>/frames/<prefix>_<n>_{oardefault,oar1,oar2,oar3}.jpg
    python3 spike_v2/fetch_assets.py ui <root>/ui/<handle>
        Downscale the page captures made by yt_ui.js (f###.jpg -> s###.jpg, 740 px wide) for the phone scene.
    python3 spike_v2/fetch_assets.py vendor <root>
        three.js (MIT) for the 3D chart -> <root>/vendor/three.module.min.js

Page captures themselves:  node spike_v2/yt_ui.js <handle> <root>/ui/<handle>
"""
import glob
import os
import subprocess
import sys


def curl(url, out):
    if not os.path.exists(out) or os.path.getsize(out) < 5000:
        subprocess.run(["curl", "-sS", "-m", "60", "-o", out, url], check=False)
    return os.path.exists(out) and os.path.getsize(out) >= 5000


def main():
    mode = sys.argv[1]
    if mode == "frames":
        root, prefix = sys.argv[2:4]; os.makedirs(os.path.join(root, "frames"), exist_ok=True); ok = 0; total = 0
        for a in sys.argv[4:]:
            n, vid = a.split(":", 1)
            for k in ("oardefault", "oar1", "oar2", "oar3"):
                total += 1; ok += curl(f"https://i.ytimg.com/vi/{vid}/{k}.jpg", os.path.join(root, "frames", f"{prefix}_{int(n):03d}_{k}.jpg"))
        print(f"{ok} of {total} frames")
    elif mode == "ui":
        from PIL import Image
        for d in glob.glob(os.path.join(sys.argv[2], "*")):
            for f in sorted(glob.glob(os.path.join(d, "f*.jpg"))):
                Image.open(f).resize((740, 1644), Image.LANCZOS).save(os.path.join(d, "s" + os.path.basename(f)[1:]), quality=90)
        print("ui frames downscaled")
    elif mode == "vendor":
        os.makedirs(os.path.join(sys.argv[2], "vendor"), exist_ok=True)
        print(curl("https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.min.js", os.path.join(sys.argv[2], "vendor", "three.module.min.js")))


if __name__ == "__main__":
    main()
