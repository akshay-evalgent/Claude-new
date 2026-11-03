"""Fetch an episode's source clips from the NASA Image and Video Library.

    python3 -m beatcut.fetch episodes/artemis-i

Reads <episode>/clips.json and writes <episode>/clips/<name>.mp4 (video only,
trimmed to the segment, re-encoded at high quality so in-points are exact).
ffmpeg seeks over HTTP, so only the needed part of a large original is read.
"""
import json
import subprocess
import sys
import urllib.parse
import urllib.request
from pathlib import Path

API = "https://images-api.nasa.gov/asset/"


def asset_url(nasa_id, variant):
    with urllib.request.urlopen(API + urllib.parse.quote(nasa_id), timeout=30) as r:
        items = json.load(r)["collection"]["items"]
    for it in items:
        href = it["href"]
        if href.endswith(f"~{variant}.mp4"):
            p = urllib.parse.urlsplit(href.replace("http://", "https://"))
            return urllib.parse.urlunsplit((p.scheme, p.netloc, urllib.parse.quote(urllib.parse.unquote(p.path)), "", ""))
    raise SystemExit(f"no ~{variant}.mp4 for {nasa_id}")


def main(episode, only=None):
    ep = Path(episode)
    clips = json.loads((ep / "clips.json").read_text())["clips"]
    out = ep / "clips"
    out.mkdir(exist_ok=True)
    for name, c in clips.items():
        if only and name not in only:
            continue
        dst = out / f"{name}.mp4"
        if dst.exists():
            print(f"have {dst}")
            continue
        url = asset_url(c["nasa_id"], c["variant"])
        print(f"fetch {name}: {c['start']}+{c['dur']}s of {c['nasa_id']} ~{c['variant']}")
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", str(c["start"]), "-i", url, "-t", str(c["dur"]),
                        "-an", "-c:v", "libx264", "-crf", "14", "-preset", "veryfast", "-pix_fmt", "yuv420p",
                        str(dst)], check=True)


if __name__ == "__main__":
    main(sys.argv[1], set(sys.argv[2:]) or None)
