#!/usr/bin/env python3
"""Render a flip story end to end.

    python3 flip/make.py <site_root> <out.mp4> [jobs]

<site_root> is the folder served to the browser, holding links: web -> flip/web, vendor -> three.js build,
assets -> CC0 textures (wood_*.jpg), repo_fonts -> fonts. Frames are drawn in headless Chromium in parallel chunks
(spike_v2/render.js), then flip_audio.py builds the music and paper/shutter sounds and ffmpeg muxes them.
"""
import json
import os
import subprocess
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
RENDER = os.path.join(os.path.dirname(HERE), "spike_v2", "render.js")


def main():
    root, out = sys.argv[1:3]; jobs = int(sys.argv[3]) if len(sys.argv) > 3 else 4
    work = os.path.join(root, "work"); os.makedirs(work, exist_ok=True)
    port = 8791
    srv = subprocess.Popen([sys.executable, "-m", "http.server", str(port), "--bind", "127.0.0.1", "--directory", root],
                           stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        time.sleep(1.0)
        url = f"http://127.0.0.1:{port}/web/index.html"
        info = os.path.join(work, "sfx.json")
        subprocess.run(["node", RENDER, url, os.path.join(work, "probe.jpg"), "0", "0", info], check=True)   # writes sfx.json
        n = json.load(open(info))["frames"]
        step = -(-n // jobs); procs, parts = [], []
        for j in range(jobs):
            a, b = j * step, min(n, (j + 1) * step)
            if a >= b:
                break
            part = os.path.join(work, f"part{j}.mp4"); parts.append(part)
            procs.append(subprocess.Popen(["node", RENDER, url, part, str(a), str(b)], stdin=subprocess.DEVNULL))
        if any(p.wait() for p in procs):
            sys.exit("render failed")
    finally:
        srv.terminate()
    lst = os.path.join(work, "parts.txt"); open(lst, "w").write("".join(f"file '{p}'\n" for p in parts if os.path.exists(p)))
    video = os.path.join(work, "video.mp4")
    subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", lst, "-c", "copy", video], check=True)
    dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", video], capture_output=True, text=True).stdout)
    wav = os.path.join(work, "audio.wav")
    subprocess.run([sys.executable, os.path.join(HERE, "flip_audio.py"), info, f"{dur:.3f}", wav], check=True)
    subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-y", "-i", video, "-i", wav, "-map", "0:v", "-map", "1:a", "-c:v", "copy",
                    "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", out], check=True)
    print(out, f"{dur:.2f}s")


if __name__ == "__main__":
    main()
