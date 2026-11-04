"""Assemble a Lesson Clip reel (the @wealth layout) from clips you have the rights to use.

One clip:
  python3 scripts/make_lesson_reel.py --clip footage.webm --hook "Growth Is Slow, Then Sudden" \
      --highlight "Slow, Then Sudden" --emoji "🌱" --start 5 --end 110 --length 30 --out reel.mp4

Several clips (e.g. shots from Google Flow), joined in order with hard cuts:
  python3 scripts/make_lesson_reel.py --clip shot1.mp4 --clip shot2.mp4 --clip shot3.mp4 \
      --hook "Kindness Is Free" --highlight "Free" --emoji "❤️" --hold 1 --out reel.mp4

What it does:
  1. Renders the black frame with the hook (scripts/headline.py, metaphor style).
  2. Joins the clips, cuts --start to --end on the joined timeline, and speeds it to fit --length.
  3. Centre-crops to --aspect (3:2 like @wealth by default), scales to full width, places it at y=600.
  4. Writes a 1080x1920, 30 fps H.264 MP4 plus a cover JPG.

By default the audio is silent: music is added inside Instagram (trending songs are licensed in-app
only). --keep-audio keeps the clips' own sound (every clip must have an audio track).
"""
import argparse
import json
import os
import subprocess
import sys
import tempfile

sys.path.insert(0, os.path.dirname(__file__))
from brand import W, H, META_CLIP
from headline import render_metaphor


def probe(path):
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration:stream=codec_type",
                          "-of", "json", path], capture_output=True, text=True, check=True).stdout
    info = json.loads(out)
    return float(info["format"]["duration"]), any(s["codec_type"] == "audio" for s in info["streams"])


def atempo_chain(speed):
    """atempo only takes 0.5 to 2.0, so chain several for bigger changes."""
    parts, s = [], speed
    while s > 2.0:
        parts.append("atempo=2.0")
        s /= 2.0
    while s < 0.5:
        parts.append("atempo=0.5")
        s /= 0.5
    parts.append(f"atempo={s:.5f}")
    return ",".join(parts)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--clip", required=True, action="append", help="repeat to join several clips in order")
    ap.add_argument("--hook", required=True)
    ap.add_argument("--highlight", action="append")
    ap.add_argument("--emoji")
    ap.add_argument("--start", type=float, default=0.0, help="seconds into the joined clips")
    ap.add_argument("--end", type=float, help="seconds into the joined clips (default: the end)")
    ap.add_argument("--length", type=float, help="final length in seconds; the footage is sped up or slowed to fit")
    ap.add_argument("--aspect", default="3:2", help="clip window aspect, e.g. 3:2, 16:9, 4:3, 1:1")
    ap.add_argument("--hold", type=float, default=0.0, help="freeze the last frame for this many seconds")
    ap.add_argument("--handle", action="store_true", help="put your handle under the clip")
    ap.add_argument("--keep-audio", action="store_true", help="keep the clips' own sound instead of silence")
    ap.add_argument("--cover-at", type=float, help="time in the FINAL reel to grab the cover frame (default 80%%)")
    ap.add_argument("--out", required=True)
    a = ap.parse_args()

    aw, ah = (float(x) for x in a.aspect.split(":"))
    clip_h = int(round(W * ah / aw / 2) * 2)
    infos = [probe(c) for c in a.clip]
    total = sum(d for d, _ in infos)
    if a.keep_audio and not all(has_a for _, has_a in infos):
        sys.exit("--keep-audio needs every clip to have an audio track")
    end = a.end if a.end is not None else total
    src_len = end - a.start
    speed = src_len / a.length if a.length else 1.0
    final_len = src_len / speed + a.hold

    overlay, _, _ = render_metaphor(a.hook, a.highlight, a.handle, clip_h, a.emoji)
    tmp = tempfile.mkdtemp()
    ov_path = os.path.join(tmp, "overlay.png")
    overlay.save(ov_path)

    n = len(a.clip)
    ov_idx, sil_idx = n, n + 1
    parts = []
    # normalise every clip to the same size, frame rate and pixel shape so they can be joined
    for i in range(n):
        parts.append(
            f"[{i}:v]crop='min(iw,ih*{aw}/{ah})':'min(ih,iw*{ah}/{aw})',scale={W}:{clip_h}:flags=lanczos,"
            f"setsar=1,fps=30,format=yuv420p[v{i}]"
        )
        if a.keep_audio:
            parts.append(f"[{i}:a]aformat=sample_rates=44100:channel_layouts=stereo[a{i}]")
    if a.keep_audio:
        parts.append("".join(f"[v{i}][a{i}]" for i in range(n)) + f"concat=n={n}:v=1:a=1[cv][ca]")
    else:
        parts.append("".join(f"[v{i}]" for i in range(n)) + f"concat=n={n}:v=1:a=0[cv]")
    parts.append(
        f"[cv]trim=start={a.start}:end={end},setpts=(PTS-STARTPTS)/{speed},fps=30,"
        f"tpad=stop_mode=clone:stop_duration={a.hold}[clip]"
    )
    parts.append(f"color=c=black:s={W}x{H}:r=30:d={final_len}[bg]")
    parts.append(f"[bg][clip]overlay=0:{META_CLIP[1]}:shortest=1[v1]")
    parts.append(f"[v1][{ov_idx}:v]overlay=0:0,format=yuv420p[v]")
    if a.keep_audio:
        parts.append(f"[ca]atrim=start={a.start}:end={end},asetpts=PTS-STARTPTS,{atempo_chain(speed)},apad[aout]")
    vf = ";".join(parts)

    cmd = ["ffmpeg", "-y", "-loglevel", "error"]
    for c in a.clip:
        cmd += ["-i", c]
    cmd += ["-loop", "1", "-i", ov_path, "-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo",
            "-filter_complex", vf, "-map", "[v]", "-map", "[aout]" if a.keep_audio else f"{sil_idx}:a",
            "-t", f"{final_len:.3f}",
            "-c:v", "libx264", "-profile:v", "high", "-preset", "slow", "-crf", "18",
            "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", a.out]
    subprocess.run(cmd, check=True)

    cover_t = a.cover_at if a.cover_at is not None else final_len * 0.8
    cover = os.path.splitext(a.out)[0] + "-cover.jpg"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-ss", f"{cover_t:.2f}", "-i", a.out,
                    "-frames:v", "1", "-q:v", "2", cover], check=True)
    print(f"wrote {a.out} ({final_len:.1f} s from {n} clip(s), speed {speed:.2f}x) and {cover}")


if __name__ == "__main__":
    main()
