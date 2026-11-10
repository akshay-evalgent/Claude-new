"""Download a short clip and sample frames from it: the "eyes" for the Analyst (Milestone 9).

Pipeline: yt-dlp downloads the first minute at 480p or less, video only. ffmpeg finds scene
changes, and frames are chosen in code: the opening frame (the hook), then scene changes, then
evenly spaced fill, at most six, each scaled to 512 px wide. Only the frames go to the model.

YouTube blocks downloads from cloud and datacenter IPs ("Sign in to confirm you're not a bot").
From a home connection it usually works; if YouTube asks anyway, set YTDLP_COOKIES_FROM_BROWSER
(for example `chrome`) so yt-dlp uses your browser's YouTube session. Vimeo works from anywhere.
"""
from __future__ import annotations

import re
import subprocess
from dataclasses import dataclass
from pathlib import Path

from ..config import settings

CLIP_SECONDS = 60
MAX_FRAMES = 6
FRAME_WIDTH = 512
SCENE_THRESHOLD = 0.3
MIN_GAP = 1.0                     # seconds between chosen frames


@dataclass
class Frame:
    path: Path
    t: float                      # seconds from the start


def download_clip(url: str, out_dir: Path, seconds: int = CLIP_SECONDS) -> Path:
    import yt_dlp
    from yt_dlp.utils import download_range_func

    out_dir.mkdir(parents=True, exist_ok=True)
    opts = {
        "quiet": True, "no_warnings": True,
        "outtmpl": str(out_dir / "clip.%(ext)s"),
        "format": "bv*[height<=480]/b[height<=480]/bv*/b",   # video only is enough: no audio needed
        "download_ranges": download_range_func(None, [(0, seconds)]),
        "js_runtimes": {settings.ytdlp_js_runtime: {}},
    }
    if settings.ytdlp_cookies_from_browser:
        opts["cookiesfrombrowser"] = (settings.ytdlp_cookies_from_browser,)
    try:
        with yt_dlp.YoutubeDL(opts) as ydl:
            ydl.download([url])
    except Exception as exc:
        if "youtube" in url and not settings.ytdlp_cookies_from_browser:
            raise RuntimeError(f"{exc} | YouTube often blocks video downloads from cloud machines. From a home "
                               "connection it usually works; if not, set YTDLP_COOKIES_FROM_BROWSER=chrome (or your "
                               "browser) in .env.") from exc
        raise
    clips = sorted(out_dir.glob("clip.*"))
    if not clips:
        raise FileNotFoundError("yt-dlp finished without writing a clip")
    return clips[0]


def probe(clip: Path) -> tuple[float, int, int]:
    """Duration in seconds, width and height."""
    out = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
                          "stream=width,height:format=duration", "-of", "default=noprint_wrappers=1", str(clip)],
                         capture_output=True, text=True, check=True).stdout
    values = dict(line.split("=", 1) for line in out.splitlines() if "=" in line)
    return float(values.get("duration", 0) or 0), int(values.get("width", 0) or 0), int(values.get("height", 0) or 0)


def scene_changes(clip: Path, threshold: float = SCENE_THRESHOLD) -> list[float]:
    proc = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(clip), "-vf", f"select='gt(scene,{threshold})',showinfo",
                           "-f", "null", "-"], capture_output=True, text=True)
    return [float(t) for t in re.findall(r"pts_time:([0-9.]+)", proc.stderr)]


def choose_times(duration: float, scenes: list[float], max_frames: int = MAX_FRAMES) -> list[float]:
    """The hook first, then scene changes spread across the clip, then even fill. Pure function."""
    if duration <= 0:
        return [0.0]
    chosen = [min(0.5, duration / 2)]

    def far_enough(t: float) -> bool:
        return all(abs(t - c) >= MIN_GAP for c in chosen)

    usable = [t for t in scenes if 0 < t < duration - 0.2]
    step = max(1, len(usable) // max(1, max_frames - 1))
    for t in usable[::step]:
        if len(chosen) < max_frames and far_enough(t):
            chosen.append(t)
    n = max_frames + 1
    for i in range(1, n):
        t = duration * i / n
        if len(chosen) < max_frames and far_enough(t):
            chosen.append(t)
    return sorted(round(t, 2) for t in chosen)


def extract_frames(clip: Path, times: list[float], out_dir: Path) -> list[Frame]:
    frames = []
    for i, t in enumerate(times):
        path = out_dir / f"frame_{i:02d}.jpg"
        subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-ss", f"{t:.2f}", "-i", str(clip), "-frames:v", "1",
                        "-vf", f"scale={FRAME_WIDTH}:-2", "-q:v", "4", str(path)], check=True)
        if path.exists():
            frames.append(Frame(path=path, t=t))
    return frames


def sample_frames(url: str, work_dir: Path, max_frames: int = MAX_FRAMES) -> tuple[list[Frame], tuple[int, int]]:
    """Download, pick and extract. Returns the frames and the clip's (width, height)."""
    clip = download_clip(url, work_dir)
    duration, width, height = probe(clip)
    times = choose_times(duration, scene_changes(clip), max_frames)
    return extract_frames(clip, times, work_dir), (width, height)


def aspect_label(width: int, height: int) -> str:
    if not width or not height:
        return "unknown aspect ratio"
    ratio = width / height
    shape = "vertical" if ratio < 0.9 else "square" if ratio < 1.1 else "horizontal"
    return f"{shape}, {width}x{height}"
