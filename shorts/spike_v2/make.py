#!/usr/bin/env python3
"""Render one Spike Files v2 Short end to end.

    TTS_CACHE=... python3 spike_v2/make.py edits_spike/<name>.json <root> <out.mp4> [jobs]

<root> is the asset folder served to the browser: frames/ (real frames of the Shorts), ui/ (channel-page captures),
vendor/three.module.min.js, plus links web -> spike_v2/web and fonts -> fonts. Work files go to <root>/work/<slug>/.
Steps: narration timeline (spike_tl.py) -> frames drawn in headless Chromium, in parallel (render.js) -> sound mix (spike_mix.py).
"""
import json
import os
import subprocess
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))


def main():
    spec, root, out = sys.argv[1:4]; jobs = int(sys.argv[4]) if len(sys.argv) > 4 else 4
    slug = json.load(open(spec))["slug"]; work = os.path.join(root, "work", slug); os.makedirs(work, exist_ok=True)
    for name, target in (("web", os.path.join(HERE, "web")), ("fonts", os.path.join(os.path.dirname(HERE), "fonts"))):
        link = os.path.join(root, name)
        if not os.path.exists(link):
            os.symlink(target, link)
    subprocess.run([sys.executable, os.path.join(HERE, "spike_tl.py"), spec, work], check=True)
    tl = json.load(open(os.path.join(work, "timeline.json"))); n = round(tl["dur"] * tl["fps"])
    port = 8770
    srv = subprocess.Popen([sys.executable, "-m", "http.server", str(port), "--bind", "127.0.0.1", "--directory", root],
                           stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        time.sleep(1.0)
        url = f"http://127.0.0.1:{port}/web/index.html?tl=/work/{slug}/timeline.json"
        step = -(-n // jobs); procs = []; parts = []
        for j in range(jobs):
            a, b = j * step, min(n, (j + 1) * step)
            if a >= b:
                break
            part = os.path.join(work, f"part{j}.mp4"); parts.append(part)
            cmd = ["node", os.path.join(HERE, "render.js"), url, part, str(a), str(b)] + ([os.path.join(work, "sfx.json")] if j == 0 else [])
            procs.append(subprocess.Popen(cmd, stdin=subprocess.DEVNULL))
        if any(p.wait() for p in procs):
            sys.exit("render failed")
    finally:
        srv.terminate()
    lst = os.path.join(work, "parts.txt"); open(lst, "w").write("".join(f"file '{p}'\n" for p in parts))
    subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", lst, "-c", "copy", os.path.join(work, "video.mp4")], check=True)
    subprocess.run([sys.executable, os.path.join(HERE, "spike_mix.py"), work, out], check=True)


if __name__ == "__main__":
    main()
