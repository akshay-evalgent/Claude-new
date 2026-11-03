"""Fetch an episode's source clips: NASA Image and Video Library ("nasa_id") or a NOAA Fisheries
video page ("noaa_page"). Both are US government works (public domain; credit lines may apply).

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


def noaa_url(page):
    """Full-quality MP4 for a NOAA Fisheries video page (videos.fisheries.noaa.gov/detail/video/...).
    The page itself links its download file ("high.mp4"); nothing is bypassed."""
    import html as _html
    import re
    req = urllib.request.Request(page, headers={"User-Agent": "Mozilla/5.0 beatcut"})
    with urllib.request.urlopen(req, timeout=30) as r:
        text = r.read().decode("utf-8", "ignore")
    urls = [_html.unescape(u) for u in re.findall(r'https://fastly-signed[^"\' ]+?\.mp4[^"\' ]*', text)]
    if not urls:
        raise SystemExit(f"no video file found on {page}")
    urls.sort(key=lambda u: ("high" not in u, u))
    return urls[0]


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
        if c.get("noaa_page"):
            url = noaa_url(c["noaa_page"])
            print(f"fetch {name}: {c['start']}+{c['dur']}s of {c['noaa_page']}")
        else:
            url = asset_url(c["nasa_id"], c["variant"])
            print(f"fetch {name}: {c['start']}+{c['dur']}s of {c['nasa_id']} ~{c['variant']}")
        src = url
        if c.get("noaa_page"):
            # download the whole file first: the CDN cuts long seeking streams short
            src = str(out / f"{name}.source.mp4")
            subprocess.run(["curl", "-sS", "-L", "--retry", "4", "-o", src, url], check=True)
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", str(c["start"]), "-i", src, "-t", str(c["dur"]),
                        "-an", "-c:v", "libx264", "-crf", "14", "-preset", "veryfast", "-pix_fmt", "yuv420p",
                        str(dst)], check=True)
        if src != url:
            Path(src).unlink()


if __name__ == "__main__":
    main(sys.argv[1], set(sys.argv[2:]) or None)
