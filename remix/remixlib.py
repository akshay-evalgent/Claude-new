"""Shared helpers for the remix toolkit: probing, time formatting, loading analysis."""
import json
import os
import re
import subprocess
import wave

import numpy as np

FONT_CANDIDATES = [
    "/usr/share/fonts/opentype/inter/Inter-SemiBold.otf",
    "/usr/share/fonts/opentype/inter/Inter-Regular.otf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    "/Library/Fonts/Arial.ttf",
    "C:/Windows/Fonts/arial.ttf",
]


def font_path():
    for p in FONT_CANDIDATES:
        if os.path.exists(p):
            return p
    return None


def run(cmd, quiet=True):
    """Run a command, raise with stderr tail on failure."""
    r = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if r.returncode != 0:
        tail = "\n".join(r.stderr.strip().splitlines()[-25:])
        raise RuntimeError(f"command failed ({r.returncode}): {' '.join(cmd[:6])} ...\n{tail}")
    if not quiet:
        print(r.stderr)
    return r


def probe(path):
    r = run(["ffprobe", "-v", "error", "-print_format", "json", "-show_format", "-show_streams", path])
    d = json.loads(r.stdout)
    v = next((s for s in d["streams"] if s["codec_type"] == "video"), None)
    a = next((s for s in d["streams"] if s["codec_type"] == "audio"), None)
    if v is None:
        raise RuntimeError(f"{path}: no video stream")
    num, den = (v.get("avg_frame_rate") or v.get("r_frame_rate") or "24/1").split("/")
    fps = float(num) / float(den) if float(den) else 24.0
    if fps <= 0 or fps > 240:
        num, den = v.get("r_frame_rate", "24/1").split("/")
        fps = float(num) / float(den)
    w, h = int(v["width"]), int(v["height"])
    sar = v.get("sample_aspect_ratio", "1:1")
    if sar and sar not in ("0:1", "1:1", "N/A"):
        sn, sd = sar.split(":")
        w = int(round(w * float(sn) / float(sd)))
    rot = 0
    for sd in v.get("side_data_list", []) or []:
        if "rotation" in sd:
            rot = int(sd["rotation"])
    if (v.get("tags") or {}).get("rotate"):
        rot = int(v["tags"]["rotate"])
    if abs(rot) in (90, 270):
        w, h = h, w
    return {
        "path": os.path.abspath(path),
        "duration": float(d["format"]["duration"]),
        "fps": round(fps, 3),
        "width": w,
        "height": h,
        "has_audio": a is not None,
        "audio_channels": int(a["channels"]) if a else 0,
    }


def tc(t, frac=1):
    """Seconds -> M:SS.s (or H:MM:SS.s)."""
    if t is None:
        return "-"
    neg = t < 0
    t = abs(t)
    h = int(t // 3600)
    m = int((t % 3600) // 60)
    s = t % 60
    body = f"{m:02d}:{s:0{3 + frac}.{frac}f}" if not h else f"{h}:{m:02d}:{s:0{3 + frac}.{frac}f}"
    return ("-" if neg else "") + body


def parse_time(x):
    """Accept 83.2, '83.2', '1:23.2', '0:01:23.2'."""
    if isinstance(x, (int, float)):
        return float(x)
    x = str(x).strip()
    if re.fullmatch(r"-?\d+(\.\d+)?", x):
        return float(x)
    parts = x.split(":")
    t = 0.0
    for p in parts:
        t = t * 60 + float(p)
    return t


def load_work(work_dir):
    """Load every analysed source in a work dir -> {name: {meta, shots, lines}}."""
    out = {}
    if not os.path.isdir(work_dir):
        return out
    for name in sorted(os.listdir(work_dir)):
        d = os.path.join(work_dir, name)
        mp = os.path.join(d, "analysis.json")
        if os.path.isfile(mp):
            with open(mp) as f:
                out[name] = json.load(f)
            out[name]["dir"] = d
    return out


def all_words(src):
    """Flat list of words for an analysed source, each with line id and index in line."""
    ws = []
    for ln in src["lines"]:
        for i, w in enumerate(ln["words"]):
            ws.append({**w, "line": ln["id"], "i": i})
    return ws


class Wav:
    """Random access to a PCM wav (used to snap cut points to quiet moments)."""

    def __init__(self, path):
        self.w = wave.open(path, "rb")
        self.sr = self.w.getframerate()
        self.ch = self.w.getnchannels()
        self.n = self.w.getnframes()

    def read(self, t0, t1):
        a = max(0, int(t0 * self.sr))
        b = min(self.n, int(t1 * self.sr))
        if b <= a:
            return np.zeros(0, dtype=np.float32)
        self.w.setpos(a)
        raw = self.w.readframes(b - a)
        x = np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768.0
        if self.ch > 1:
            x = x.reshape(-1, self.ch).mean(axis=1)
        return x

    def quietest(self, t, lo, hi, hop=0.005, win=0.02):
        """Time in [lo, hi] with the lowest short-term energy, biased toward t."""
        lo, hi = max(0.0, lo), max(0.0, hi)
        if hi - lo < 2 * hop:
            return t
        x = self.read(lo, hi + win)
        if len(x) < int(win * self.sr):
            return t
        step = max(1, int(hop * self.sr))
        size = max(1, int(win * self.sr))
        n = (len(x) - size) // step
        if n <= 1:
            return t
        e = np.array([np.sqrt(np.mean(x[i * step:i * step + size] ** 2)) for i in range(n)])
        times = lo + np.arange(n) * hop + win / 2
        # small bias so equal-energy choices stay near the transcript boundary
        bias = 1.0 + 0.6 * np.abs(times - t) / max(hi - lo, 1e-3)
        return float(times[int(np.argmin((e + 1e-4) * bias))])

    def close(self):
        self.w.close()
