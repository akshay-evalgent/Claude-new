"""Assemble a Lesson Clip reel (the @wealth layout) from any clip you have the rights to use.

  python3 scripts/make_lesson_reel.py --clip footage.webm --hook "Growth Is Slow, Then Sudden" \
      --highlight "Slow, Then Sudden" --emoji "🌱" --start 5 --end 110 --length 30 --out reel.mp4

What it does:
  1. Renders the black frame with the hook (scripts/headline.py, metaphor style).
  2. Cuts the clip from --start to --end and speeds it up to fit --length seconds.
  3. Centre-crops it to --aspect (3:2 like @wealth by default), scales to full width, places it at y=600.
  4. Writes a 1080x1920, 30 fps H.264 MP4 with a silent audio track, plus a cover JPG.

Music is added inside Instagram (trending songs are licensed in-app only), so the file is silent.
"""
import argparse
import os
import subprocess
import sys
import tempfile

sys.path.insert(0, os.path.dirname(__file__))
from brand import W, H, META_CLIP
from headline import render_metaphor


def probe_duration(path):
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path],
                         capture_output=True, text=True, check=True).stdout.strip()
    return float(out)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--clip", required=True)
    ap.add_argument("--hook", required=True)
    ap.add_argument("--highlight", action="append")
    ap.add_argument("--emoji")
    ap.add_argument("--start", type=float, default=0.0, help="seconds into the source clip")
    ap.add_argument("--end", type=float, help="seconds into the source clip (default: its end)")
    ap.add_argument("--length", type=float, help="final length in seconds; the clip is sped up or slowed to fit")
    ap.add_argument("--aspect", default="3:2", help="clip window aspect, e.g. 3:2, 16:9, 4:3, 1:1")
    ap.add_argument("--hold", type=float, default=0.0, help="freeze the last frame for this many seconds")
    ap.add_argument("--handle", action="store_true", help="put your handle under the clip")
    ap.add_argument("--cover-at", type=float, help="time in the FINAL reel to grab the cover frame (default 80%%)")
    ap.add_argument("--out", required=True)
    a = ap.parse_args()

    aw, ah = (float(x) for x in a.aspect.split(":"))
    clip_h = int(round(W * ah / aw / 2) * 2)
    end = a.end if a.end is not None else probe_duration(a.clip)
    src_len = end - a.start
    speed = src_len / a.length if a.length else 1.0
    final_len = src_len / speed + a.hold

    overlay, top, bottom = render_metaphor(a.hook, a.highlight, a.handle, clip_h, a.emoji)
    tmp = tempfile.mkdtemp()
    ov_path = os.path.join(tmp, "overlay.png")
    overlay.save(ov_path)

    vf = (
        f"[0:v]trim=start={a.start}:end={end},setpts=(PTS-STARTPTS)/{speed},"
        f"crop='min(iw,ih*{aw}/{ah})':'min(ih,iw*{ah}/{aw})',scale={W}:{clip_h}:flags=lanczos,"
        f"fps=30,tpad=stop_mode=clone:stop_duration={a.hold}[clip];"
        f"color=c=black:s={W}x{H}:r=30:d={final_len}[bg];"
        f"[bg][clip]overlay=0:{META_CLIP[1]}:shortest=1[v1];"
        f"[v1][1:v]overlay=0:0,format=yuv420p[v]"
    )
    cmd = [
        "ffmpeg", "-y", "-loglevel", "error",
        "-i", a.clip, "-loop", "1", "-i", ov_path,
        "-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo",
        "-filter_complex", vf, "-map", "[v]", "-map", "2:a",
        "-t", f"{final_len:.3f}",
        "-c:v", "libx264", "-profile:v", "high", "-preset", "slow", "-crf", "18",
        "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", a.out,
    ]
    subprocess.run(cmd, check=True)

    cover_t = a.cover_at if a.cover_at is not None else final_len * 0.8
    cover = os.path.splitext(a.out)[0] + "-cover.jpg"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-ss", f"{cover_t:.2f}", "-i", a.out,
                    "-frames:v", "1", "-q:v", "2", cover], check=True)
    print(f"wrote {a.out} ({final_len:.1f} s, clip sped up {speed:.2f}x) and {cover}")


if __name__ == "__main__":
    main()
