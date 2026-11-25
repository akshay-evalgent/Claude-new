#!/usr/bin/env python3
"""Checks the pipeline's tools do not make, for the things the reviews asked about.

    python3 check_extras.py        (after the final render; writes into check/)

  check/phone_390.jpg      eight moments at 390 px wide: does every line and the window read on a phone
  check/reset_frames.jpg   the six frames in which "home" is redrawn as "Home."
  check/fall_frames.jpg    the frames round 4.49 s, where the repeated line falls back to faint
  check/rest_frames.jpg    the rest after "I know you're fine.", first cut above, this cut below
  check/activity.json      the longest run of frames in which no pixel changes, and how much of the
                           picture changes in each rest, in this cut and in the first (video_round1.mp4)

A pixel "changes" when its grey level moves by more than 24 between one frame and the next,
which is well above what the video encoder does to a still picture.
"""
import json
import subprocess
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

HERE = Path(__file__).resolve().parent
CHECK = HERE / "check"
W, H, FPS = 1920, 1080, 30


def frames(path):
    """Every frame of a video as a grey array."""
    p = subprocess.Popen(["ffmpeg", "-v", "error", "-i", str(path), "-f", "rawvideo", "-pix_fmt", "gray", "-"],
                         stdout=subprocess.PIPE)
    while True:
        raw = p.stdout.read(W * H)
        if len(raw) < W * H:
            break
        yield np.frombuffer(raw, np.uint8).reshape(H, W)
    p.wait()


def changed(path):
    """For each frame after the first: how many pixels changed from the frame before."""
    out, prev = [], None
    for f in frames(path):
        if prev is not None:
            out.append(int((np.abs(f.astype(np.int16) - prev) > 24).sum()))
        prev = f
    return out


def still(path, t):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-vf", f"select=eq(n\\,{round(t * FPS)})",
                          "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], capture_output=True).stdout
    return Image.frombytes("RGB", (W, H), raw)


def sheet(name, rows, width, box=None):
    """rows: lists of (label, video, time). box: crop each frame to (x0, y0, x1, y1) first."""
    cw, ch = (box[2] - box[0], box[3] - box[1]) if box else (W, H)
    h = round(width * ch / cw)
    im = Image.new("RGB", (width * max(len(r) for r in rows), h * len(rows)), "white")
    for j, row in enumerate(rows):
        for i, (label, video, t) in enumerate(row):
            f = still(video, t)
            f = (f.crop(box) if box else f).resize((width, h), Image.LANCZOS)
            ImageDraw.Draw(f).text((6, 4), label, fill=(0, 0, 0))
            im.paste(f, (i * width, j * h))
    im.save(CHECK / name, quality=90)
    print("wrote", CHECK / name)


def main():
    now, was = HERE / "video.mp4", HERE / "video_round1.mp4"
    timing = json.loads((HERE / "audio" / "timing.json").read_text())
    beats = {b["id"]: b for b in timing["beats"]}
    dur = timing["duration"]
    f = lambda t: round(t * FPS) / FPS                      # the frame at or nearest a time

    sheet("phone_390.jpg", [[(f"{t:g}", now, t) for t in row] for row in ([0, 1.4, 8.6, 12.9], [17.7, 20.3, 22.6, 24.73])], 390)
    sheet("reset_frames.jpg", [[(f"{t:g}", now, t) for t in row] for row in ([22.6, 22.7, 22.733], [22.767, 22.8, 22.867])], 640)
    cut = beats["again"]["shot_start"]
    sheet("fall_frames.jpg", [[(f"{f(cut + k / FPS):.3f} s", now, f(cut + k / FPS)) for k in row] for row in ([-1, 0, 1, 2], [3, 4, 5, 7])],
          480, box=(100, 230, 1380, 730))
    r0, r1 = beats["fine"]["vo_end"], beats["asking"]["shot_start"]
    times = [r0 + (r1 - r0) * k / 4 for k in range(5)]
    rows = [[(f"this cut {t:.2f} s", now, f(t)) for t in times]]
    if was.exists():
        rows.insert(0, [(f"first cut {t:.2f} s", was, f(t)) for t in times])
    sheet("rest_frames.jpg", rows, 384)

    # the rests: from the end of a spoken line to the frame before the next line is put on the sheet
    # (the line change itself is thousands of pixels and would hide what the dots do)
    said = [b for b in timing["beats"] if b["vo_start"] is not None]
    rests = [(f"after '{b['text']}' ({b['id']})", b["vo_end"], b["shot_end"] - 1 / FPS) for b in said[:-1]]
    rests.append((f"after the last word, to 'Home.' ({said[-1]['id']})", said[-1]["vo_end"] + 0.75, dur))

    report = {"note": "A pixel changes when its grey level moves by more than 24 from one frame to the next. "
                      "Frame k is compared with frame k-1; times are frame k's."}
    for label, video in (("this_cut", now), ("first_cut", was)):
        if not video.exists():
            continue
        c = changed(video)                                   # c[k-1]: frame k against frame k-1
        run = best = end = 0
        for k, v in enumerate(c, start=1):
            run = run + 1 if v == 0 else 0
            if run > best:
                best, end = run, k
        report[label] = {
            "file": video.name,
            "longest_run_with_no_pixel_changed": {"frames": best, "seconds": round(best / FPS, 2),
                                                  "from": round((end - best + 1) / FPS, 2), "to": round((end + 1) / FPS, 2)},
            "rests": [{"rest": name, "from": round(a, 2), "to": round(b, 2),
                       "pixels_changed_per_frame_mean": round(float(np.mean(c[int(a * FPS):int(b * FPS)])), 1),
                       "pixels_changed_per_frame_median": round(float(np.median(c[int(a * FPS):int(b * FPS)])), 1),
                       "frames_with_no_change": int(sum(1 for v in c[int(a * FPS):int(b * FPS)] if v == 0)),
                       "frames": len(c[int(a * FPS):int(b * FPS)])} for name, a, b in rests],
        }
    (CHECK / "activity.json").write_text(json.dumps(report, indent=1) + "\n")
    print(json.dumps(report, indent=1))


if __name__ == "__main__":
    main()
