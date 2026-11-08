#!/usr/bin/env python3
"""Check the songs a Kaggle run downloaded, then copy them out under readable names.

    python check_songs.py <run-dir>                                   # check only
    python check_songs.py <run-dir> --copy-to <dir> --name neon-rain  # check + copy

<run-dir> is the timestamped folder run_on_kaggle.py prints ("Files in ..."). The songs
to deliver are songs/mastered/*_master.mp3; if mastering was "none", the takes'
*_preview.mp3 files are used instead.

Per file it reports duration, loudness (LUFS), true peak and how much is silent, and it
flags: duplicate files, songs under 10 s, and songs that are mostly silence. ffmpeg is
used when available; without it only sizes and checksums are compared. Exit code 1 means
something looks wrong.
"""
import argparse
import glob
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys


def ffmpeg_stats(path):
    probe = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "json", path],
                           capture_output=True, text=True)
    duration = float(json.loads(probe.stdout)["format"]["duration"])
    r = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", path, "-af",
                        "ebur128=peak=true,silencedetect=n=-50dB:d=1", "-f", "null", "-"],
                       capture_output=True, text=True)
    err = r.stderr
    lufs = re.findall(r"^\s+I:\s+(-?[\d.]+) LUFS", err, re.M)
    peak = re.findall(r"^\s+Peak:\s+(-?[\d.]+|-inf) dBFS", err, re.M)
    silent = sum(float(x) for x in re.findall(r"silence_duration: ([\d.]+)", err))
    return {"duration_s": round(duration, 1), "lufs": float(lufs[-1]) if lufs else None,
            "peak_dbfs": peak[-1] if peak else None, "silent_s": round(silent, 1)}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("run_dir")
    ap.add_argument("--copy-to")
    ap.add_argument("--name", default="song", help="file-name stem for the copies, e.g. neon-rain")
    args = ap.parse_args()

    songs = sorted(glob.glob(os.path.join(args.run_dir, "**", "mastered", "*_master.mp3"), recursive=True))
    kind = "mastered"
    if not songs:
        songs = sorted(glob.glob(os.path.join(args.run_dir, "**", "*_preview.mp3"), recursive=True))
        kind = "preview"
    if not songs:
        sys.exit(f"No MP3s found under {args.run_dir}")

    have_ffmpeg = bool(shutil.which("ffmpeg") and shutil.which("ffprobe"))
    problems, digests, results = [], {}, []
    for i, path in enumerate(songs, 1):
        info = {"take": i, "file": os.path.relpath(path, args.run_dir), "bytes": os.path.getsize(path)}
        digest = hashlib.md5(open(path, "rb").read()).hexdigest()
        if digest in digests:
            problems.append(f"take {i} is byte-identical to take {digests[digest]}")
        digests.setdefault(digest, i)
        if have_ffmpeg:
            info.update(ffmpeg_stats(path))
            if info["duration_s"] < 10:
                problems.append(f"take {i} is only {info['duration_s']} s long")
            if info["silent_s"] > 0.5 * info["duration_s"]:
                problems.append(f"take {i} is mostly silence ({info['silent_s']} of {info['duration_s']} s)")
        results.append(info)
        print(json.dumps(info, ensure_ascii=False))

    if not have_ffmpeg:
        print("ffmpeg not found: checked sizes and checksums only (install ffmpeg for length/loudness/silence).")
    if args.copy_to:
        os.makedirs(args.copy_to, exist_ok=True)
        for info, path in zip(results, songs):
            dst = os.path.join(args.copy_to, f"{args.name}_take{info['take']}_{kind}.mp3")
            shutil.copyfile(path, dst)
            print(f"copied → {dst}")
    for p in problems:
        print(f"PROBLEM: {p}")
    print("OK" if not problems else "CHECK FAILED")
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
