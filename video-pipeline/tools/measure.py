#!/usr/bin/env python3
"""Measure a video: shots, still stretches, motion, audio, cut-to-sound sync.

    python3 measure.py VIDEO --out DIR

Writes DIR/measure.json and prints a short summary. Needs ffmpeg, numpy.
The same tool is run on references and on our own output, so every number is
comparable between them. Numbers are not comparable with other tools.
"""
import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

import numpy as np

W = 96                  # analysis width in pixels
STILL_DIFF = 0.20       # mean luma change per frame (0-255) below which nothing moved
STILL_CHANGED = 0.0004  # and fewer than this share of pixels changed by more than 4 levels
STILL_MIN = 0.60        # seconds
SYNC_WINDOW = 0.080     # seconds either side of a cut that counts as "on the sound"
SYNC_GRADUAL = 0.300    # the same, for dissolves and other gradual transitions
SILENCE_DB = -50.0


def run(cmd, **kw):
    return subprocess.run(cmd, capture_output=True, **kw)


def probe(path):
    out = run(["ffprobe", "-v", "error", "-print_format", "json",
               "-show_format", "-show_streams", str(path)])
    if out.returncode != 0:
        sys.exit(f"ffprobe failed on {path}: {out.stderr.decode()[:400]}")
    info = json.loads(out.stdout)
    v = next((s for s in info["streams"] if s["codec_type"] == "video"), None)
    a = next((s for s in info["streams"] if s["codec_type"] == "audio"), None)
    if v is None:
        sys.exit(f"{path}: no video stream")
    num, den = (v.get("avg_frame_rate") or v["r_frame_rate"]).split("/")
    fps = float(num) / float(den) if float(den) else 0.0
    w, h = int(v["width"]), int(v["height"])
    rot = 0
    for sd in v.get("side_data_list", []):
        rot = int(sd.get("rotation", rot) or rot)
    if abs(rot) in (90, 270):
        w, h = h, w
    return {
        "width": w, "height": h, "fps": round(fps, 3),
        "duration": round(float(info["format"]["duration"]), 3),
        "codec": v.get("codec_name"),
        "aspect": round(w / h, 4),
        "orientation": "vertical" if h > w else "horizontal" if w > h else "square",
        "has_audio": a is not None,
        "audio_codec": a.get("codec_name") if a else None,
    }


def read_frames(path, meta):
    """Small grey frames at the film's own frame rate (capped at 30)."""
    fps = min(meta["fps"], 30.0) or 24.0
    h = max(2, int(round(W * meta["height"] / meta["width"] / 2)) * 2)
    cmd = ["ffmpeg", "-v", "error", "-i", str(path), "-an",
           "-vf", f"fps={fps},scale={W}:{h}:flags=area,format=gray",
           "-f", "rawvideo", "-"]
    raw = run(cmd).stdout
    n = len(raw) // (W * h)
    if n < 2:
        sys.exit(f"{path}: could not decode frames")
    return np.frombuffer(raw[:n * W * h], np.uint8).reshape(n, h, W).astype(np.float32), fps


def fine_pass(path, meta, fps):
    """Streamed pass at 320 px: per-frame mean change, and the share of pixels
    that changed at all. Thin lines drifting slowly are invisible at 96 px."""
    w = 320
    h = max(2, int(round(w * meta["height"] / meta["width"] / 2)) * 2)
    proc = subprocess.Popen(["ffmpeg", "-v", "error", "-i", str(path), "-an",
                             "-vf", f"fps={fps},scale={w}:{h}:flags=area,format=gray",
                             "-f", "rawvideo", "-"], stdout=subprocess.PIPE)
    size, prev, mean, changed = w * h, None, [0.0], [0.0]
    while True:
        buf = proc.stdout.read(size)
        if len(buf) < size:
            break
        cur = np.frombuffer(buf, np.uint8).astype(np.int16)
        if prev is not None:
            diff = np.abs(cur - prev)
            mean.append(float(diff.mean()))
            changed.append(float((diff > 4).mean()))
        prev = cur
    proc.wait()
    return np.array(mean), np.array(changed)


def still_runs(mean, changed, fps, min_s):
    """Stretches where the picture does not change. One odd frame (a keyframe
    refresh) inside a frozen stretch does not break it."""
    still = (changed < STILL_CHANGED) & (mean < STILL_DIFF)
    still[0] = still[1] if len(still) > 1 else True
    for i in range(1, len(still) - 1):
        if not still[i] and still[i - 1] and still[i + 1] and mean[i] < 2 * STILL_DIFF:
            still[i] = True
    out, start = [], None
    for i in range(len(still) + 1):
        on = i < len(still) and still[i]
        if on and start is None:
            start = i
        elif not on and start is not None:
            if (i - start) / fps >= min_s:
                out.append((max(start - 1, 0) / fps, i / fps))
            start = None
    end_hold = 0
    for i in range(len(still) - 1, 0, -1):
        if not still[i]:
            break
        end_hold += 1
    return out, end_hold / fps


def corr(a, b):
    a = a - a.mean()
    b = b - b.mean()
    d = float(np.sqrt((a * a).sum() * (b * b).sum()))
    return float((a * b).sum() / d) if d > 1e-6 else 1.0


def find_cuts(frames, fps):
    """Hard cuts (one-frame spike) and gradual transitions (dissolves, wipes)."""
    n = len(frames)
    d = np.abs(np.diff(frames, axis=0)).mean(axis=(1, 2))      # d[i]: frame i -> i+1
    d = np.concatenate([[0.0], d])                              # d[i]: change arriving at frame i
    half = max(3, int(round(fps * 0.5)))
    cand = []
    for i in range(1, n):
        lo, hi = max(1, i - half), min(n, i + half + 1)
        near = np.concatenate([d[lo:max(lo, i - 1)], d[min(hi, i + 2):hi]])
        base = float(np.median(near)) if len(near) else 0.0
        ratio = d[i] / max(base, 0.25)
        c = corr(frames[i], frames[i - 1])
        textured = frames[i].std() >= 6.0 and frames[i - 1].std() >= 6.0   # a fade up from blank is not a cut
        if (d[i] >= 6.0 and ratio >= 3.0) or (d[i] >= 3.0 and c < 0.5 and textured) or (d[i] >= 12.0 and ratio >= 2.0):
            cand.append((i, "cut", float(d[i]), c))
    # gradual: the picture k frames apart is unrelated, with no spike in between
    k = max(4, int(round(fps * 0.5)))
    hard = {i for i, *_ in cand}
    run_start = None
    best = None
    for i in range(k, n):
        c = corr(frames[i], frames[i - k])
        spike = any(j in hard for j in range(i - k, i + 1))
        textured = frames[i].std() >= 6.0 and frames[i - k].std() >= 6.0
        if c < 0.35 and not spike and textured and np.abs(frames[i] - frames[i - k]).mean() >= 4.0:
            if run_start is None:
                run_start, best = i, (c, i)
            elif c < best[0]:
                best = (c, i)
        elif run_start is not None:
            mid = best[1] - k // 2
            cand.append((mid, "gradual", float(np.abs(frames[best[1]] - frames[best[1] - k]).mean()), best[0]))
            run_start = None
    # keep the strongest candidate inside any 0.3 s window
    cand.sort(key=lambda x: x[0])
    gap = max(2, int(round(fps * 0.3)))
    kept = []
    for c in cand:
        if kept and c[0] - kept[-1][0] < gap:
            if c[2] > kept[-1][2]:
                kept[-1] = c
        else:
            kept.append(c)
    return d, [{"t": round(i / fps, 3), "frame": int(i), "kind": kind,
                "strength": round(s, 2), "corr": round(cc, 2)} for i, kind, s, cc in kept]


def loudness(path):
    out = run(["ffmpeg", "-nostats", "-i", str(path), "-vn",
               "-af", "ebur128=peak=true", "-f", "null", "-"]).stderr.decode(errors="replace")
    tail = out[out.rfind("Summary:"):] if "Summary:" in out else ""
    def grab(pat):
        m = re.search(pat, tail)
        return float(m.group(1)) if m else None
    return {"integrated_lufs": grab(r"I:\s+(-?[\d.]+) LUFS"),
            "lra_lu": grab(r"LRA:\s+(-?[\d.]+) LU"),
            "true_peak_dbtp": grab(r"Peak:\s+(-?[\d.]+) dBFS")}


def analyse_audio(path, duration):
    sr = 16000
    raw = run(["ffmpeg", "-v", "error", "-i", str(path), "-vn", "-ac", "1",
               "-ar", str(sr), "-f", "s16le", "-"]).stdout
    x = np.frombuffer(raw, np.int16).astype(np.float32) / 32768.0
    if len(x) < sr // 10:
        return None
    hop, win = 160, 512                                   # 10 ms hop
    nfr = 1 + (len(x) - win) // hop
    idx = np.arange(win)[None, :] + hop * np.arange(nfr)[:, None]
    fr = x[idx]
    rms_db = 20 * np.log10(np.sqrt((fr ** 2).mean(axis=1)) + 1e-9)
    t = np.arange(nfr) * hop / sr
    t_on = t + (win - hop) / sr                           # new sound enters at the window's far edge
    loud = rms_db > SILENCE_DB
    audible_share = float(loud.mean())
    lead = float(t[np.argmax(loud)]) if loud.any() else duration
    tail = float(duration - t[len(loud) - 1 - np.argmax(loud[::-1])]) if loud.any() else duration
    drop, start = [], None
    for i, on in enumerate(loud):
        if not on and start is None:
            start = i
        elif on and start is not None:
            if (i - start) * hop / sr >= 0.3 and start > 0:
                drop.append([round(float(t[start]), 2), round(float(t[i]), 2)])
            start = None
    # onsets: spectral flux, adaptive threshold
    mag = np.abs(np.fft.rfft(fr * np.hanning(win), axis=1))
    logm = np.log1p(40 * mag)
    flux = np.maximum(logm[1:] - logm[:-1], 0).sum(axis=1)
    flux = np.concatenate([[0.0], flux])
    flux = flux / (flux.max() + 1e-9)
    onsets, last = [], -1.0
    half = 15
    for i in range(1, nfr - 1):
        lo, hi = max(0, i - half), min(nfr, i + half)
        local = flux[lo:hi]
        if (flux[i] >= local.max() and flux[i] > np.median(local) + 0.08
                and rms_db[min(i + 2, nfr - 1)] > SILENCE_DB and t_on[i] - last >= 0.08):
            onsets.append(round(float(t_on[i]), 3))
            last = t_on[i]
    res = {"audible_share": round(audible_share, 3), "lead_silence": round(lead, 2),
           "tail_silence": round(max(tail, 0.0), 2), "dropouts": drop,
           "onsets": onsets, "onsets_per_s": round(len(onsets) / max(duration, 0.1), 2)}
    res.update(loudness(path))
    return res


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("video")
    ap.add_argument("--out", required=True, help="directory for measure.json")
    args = ap.parse_args()
    path = Path(args.video)
    if not path.is_file():
        sys.exit(f"no such file: {path}")
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)

    meta = probe(path)
    frames, fps = read_frames(path, meta)
    n = len(frames)
    dur = n / fps
    d, cuts = find_cuts(frames, fps)

    bounds = [0.0] + [c["t"] for c in cuts] + [round(dur, 3)]
    shots = [{"n": i + 1, "start": bounds[i], "end": bounds[i + 1],
              "dur": round(bounds[i + 1] - bounds[i], 3)} for i in range(len(bounds) - 1)]
    lens = np.array([s["dur"] for s in shots])

    fine, changed = fine_pass(path, meta, fps)
    m = min(n, len(fine))
    fine, changed = fine[:m], changed[:m]
    stills, end_hold = still_runs(fine, changed, fps, STILL_MIN)
    still_total = sum(b - a for a, b in stills)
    flat = frames.reshape(n, -1).std(axis=1) < 2.0
    flat_runs, start = [], None
    for i in range(n + 1):
        f = i < n and flat[i]
        if f and start is None:
            start = i
        elif not f and start is not None:
            if i - start > 3:
                flat_runs.append([round(start / fps, 2), round(i / fps, 2)])
            start = None

    secs = int(np.ceil(dur))
    timeline = []
    for s in range(secs):
        a, b = int(s * fps), min(n, int((s + 1) * fps))
        timeline.append({"s": s, "motion": round(float(fine[a:min(b, m)].mean()), 2) if min(b, m) > a else 0.0,
                         "cuts": sum(1 for c in cuts if s <= c["t"] < s + 1)})

    audio = analyse_audio(path, dur) if meta["has_audio"] else None
    sync = None
    if audio and cuts and audio["onsets"]:
        on = np.array(audio["onsets"])
        offs = [round(float(on[np.argmin(np.abs(on - c["t"]))] - c["t"]), 3) for c in cuts]
        # a dissolve has no single frame to hit: a sound anywhere inside it counts
        hit = [abs(o) <= (SYNC_GRADUAL if c["kind"] == "gradual" else SYNC_WINDOW) for o, c in zip(offs, cuts)]
        sync = {"window_s": SYNC_WINDOW, "gradual_window_s": SYNC_GRADUAL,
                "share_on_sound": round(sum(hit) / len(hit), 3),
                "offsets_s": offs}
    if audio:
        on = np.array(audio["onsets"]) if audio["onsets"] else np.array([])
        for row in timeline:
            row["onsets"] = int(((on >= row["s"]) & (on < row["s"] + 1)).sum()) if len(on) else 0

    hook_n = min(n, int(3 * fps))
    result = {
        "file": str(path), "video": dict(meta, frames=n, analysed_fps=round(fps, 3),
                                         duration=round(dur, 3)),
        "shots": shots, "cuts": cuts,
        "shot_stats": {"count": len(shots), "mean_s": round(float(lens.mean()), 2),
                       "median_s": round(float(np.median(lens)), 2),
                       "min_s": round(float(lens.min()), 2), "max_s": round(float(lens.max()), 2),
                       "cuts_per_10s": round(len(cuts) / dur * 10, 2),
                       "final_shot_share": round(float(lens[-1] / dur), 3)},
        "stills": [{"start": round(a, 2), "end": round(b, 2), "dur": round(b - a, 2)} for a, b in stills],
        "still_share": round(still_total / dur, 3),
        "end_hold_s": round(end_hold, 2),
        "flat_runs": flat_runs,
        "motion": {"mean": round(float(fine[1:].mean()), 2), "median": round(float(np.median(fine[1:])), 2),
                   "p90": round(float(np.percentile(fine[1:], 90)), 2)},
        "hook": {"window_s": 3.0,
                 "first_cut_s": cuts[0]["t"] if cuts else None,
                 "cuts": sum(1 for c in cuts if c["t"] < 3.0),
                 "motion_mean": round(float(fine[1:min(hook_n, m)].mean()), 2),
                 "first_sound_s": audio["lead_silence"] if audio else None,
                 "onsets": sum(1 for o in audio["onsets"] if o < 3.0) if audio else None},
        "audio": audio, "sync": sync, "timeline": timeline,
    }
    (out / "measure.json").write_text(json.dumps(result, indent=1))

    v, ss = result["video"], result["shot_stats"]
    print(f"{path.name}: {v['width']}x{v['height']} {v['fps']} fps, {v['duration']:.2f} s, {v['orientation']}")
    print(f"shots {ss['count']} (mean {ss['mean_s']} s, min {ss['min_s']}, max {ss['max_s']}), "
          f"{ss['cuts_per_10s']} cuts per 10 s, first cut at {result['hook']['first_cut_s']} s")
    print(f"still {result['still_share']:.0%} of the run in {len(stills)} stretches, "
          f"end hold {result['end_hold_s']} s, motion mean {result['motion']['mean']}")
    if audio:
        print(f"audio {audio['integrated_lufs']} LUFS, peak {audio['true_peak_dbtp']} dBTP, "
              f"audible {audio['audible_share']:.0%}, {len(audio['onsets'])} onsets"
              + (f", {sync['share_on_sound']:.0%} of cuts on a sound" if sync else ""))
    else:
        print("audio: none")
    print(f"wrote {out / 'measure.json'}")


if __name__ == "__main__":
    main()
