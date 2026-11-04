#!/usr/bin/env python3
"""Cut rendered shots into a film, here on CPU with ffmpeg.

    python stitch.py [--shots shots.json] [--music track.mp3] [--out renders/film]

Takes renders/<id>.mp4 in shots.json order (missing shots are skipped) and writes:
  <out>_2160p.mp4      3840x2160 UHD (2176-line render, 8 px trimmed top and bottom)
  <out>_1080p.mp4      1920x1080
  <out>_vertical.mp4   1080x1920 for Reels/Shorts/LinkedIn mobile: a 1224x2176 crop
                       of the 4K frame, so it is still above 1080p before scaling.
                       Set "vertical_x" (0 = left edge, 1 = right edge, default 0.5)
                       on a shot to move its crop.
"""
import argparse
import json
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
W, H = 3840, 2176
VW = round(H * 9 / 16 / 2) * 2  # 1224


def probe_duration(path):
    out = subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                                   "-of", "default=nw=1:nk=1", path], text=True)
    return float(out.strip())


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--shots", default=os.path.join(HERE, "shots.json"))
    ap.add_argument("--renders", default=os.path.join(HERE, "renders"))
    ap.add_argument("--out", default=os.path.join(HERE, "renders", "film"))
    ap.add_argument("--music", help="optional audio track, trimmed and faded to the cut")
    ap.add_argument("--fps", type=int, default=30)
    ap.add_argument("--fade-in", type=float, default=0.5)
    ap.add_argument("--fade-out", type=float, default=0.8)
    a = ap.parse_args()

    with open(a.shots) as f:
        shots = json.load(f)["shots"]
    clips = []
    for s in shots:
        p = os.path.join(a.renders, f"{s['id']}.mp4")
        if os.path.exists(p):
            clips.append((s, p))
        else:
            print(f"skipping {s['id']}: no {p}")
    if not clips:
        sys.exit("no rendered shots found")

    total = sum(probe_duration(p) for _, p in clips)
    cmd = ["ffmpeg", "-y", "-v", "error"]
    for _, p in clips:
        cmd += ["-i", p]
    if a.music:
        cmd += ["-i", a.music]
    n = len(clips)
    parts = []
    for i, (s, _) in enumerate(clips):
        x = round((W - VW) * float(s.get("vertical_x", 0.5)) / 2) * 2
        parts.append(f"[{i}:v]fps={a.fps},setsar=1,split=2[w{i}][t{i}]")
        parts.append(f"[w{i}]crop={W}:2160:0:8[wc{i}]")
        parts.append(f"[t{i}]crop={VW}:{H}:{x}:0,scale=1080:1920:flags=lanczos[tc{i}]")
    fade = (f"fade=t=in:st=0:d={a.fade_in},"
            f"fade=t=out:st={max(0.0, total - a.fade_out):.3f}:d={a.fade_out}")
    parts.append("".join(f"[wc{i}]" for i in range(n)) + f"concat=n={n}:v=1:a=0,{fade},split=2[uhd][hd0]")
    parts.append("[hd0]scale=1920:1080:flags=lanczos[hd]")
    parts.append("".join(f"[tc{i}]" for i in range(n)) + f"concat=n={n}:v=1:a=0,{fade}[vert]")
    audio = []
    if a.music:
        parts.append(f"[{n}:a]atrim=0:{total:.3f},afade=t=in:st=0:d={a.fade_in},"
                     f"afade=t=out:st={max(0.0, total - a.fade_out):.3f}:d={a.fade_out},asplit=3[a0][a1][a2]")
    cmd += ["-filter_complex", ";".join(parts)]
    enc = ["-c:v", "libx264", "-preset", "medium", "-pix_fmt", "yuv420p", "-movflags", "+faststart"]
    for k, (label, crf) in enumerate((("uhd", 16), ("hd", 18), ("vert", 18))):
        name = {"uhd": "2160p", "hd": "1080p", "vert": "vertical"}[label]
        audio = ["-map", f"[a{k}]", "-c:a", "aac", "-b:a", "192k"] if a.music else []
        cmd += ["-map", f"[{label}]"] + audio + enc + ["-crf", str(crf), f"{a.out}_{name}.mp4"]
    os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
    print(f"cutting {n} shot(s), {total:.2f} s: {', '.join(s['id'] for s, _ in clips)}")
    subprocess.run(cmd, check=True)
    for name in ("2160p", "1080p", "vertical"):
        p = f"{a.out}_{name}.mp4"
        print(f"{p}  {os.path.getsize(p) / 2 ** 20:.1f} MiB  {probe_duration(p):.2f} s")


if __name__ == "__main__":
    main()
