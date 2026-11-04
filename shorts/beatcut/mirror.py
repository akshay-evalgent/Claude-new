"""Mirror a reference edit: measure its transitions, flicker and ending, take its
soundtrack, and write a skeleton story.json in the same slots.

    python3 -m beatcut.mirror analyze reference.mp4 episodes/<new>     # skeleton + timeline report
    python3 -m beatcut.mirror sheet video.mp4 out.jpg [--start S --end E --step 0.5]
    python3 -m beatcut.mirror compare reference.mp4 our_edit.mp4 out.mp4
    python3 -m beatcut.mirror window reference.mp4        # picture-window box + scale_keys (THIS IS WHY format)

What analyze detects, per frame (108x135 thumbnails):
  white / leak  brightness peaks (> 200); a leak is cyan-tinted. Ramp in/out = a/b.
  tvoff         darkening over several frames into a near-black frame
  glitch        a single sudden dark frame
  cut           a hard change of picture that is not a flash
  flicker       runs of alternate-frame brightness wobble
  fade in/out   ramps from/to black at the start and end
and from the audio: tempo/beats, the drop (biggest bass jump) and stops (pauses).
"""
import argparse
import io
import json
import subprocess
from pathlib import Path

import numpy as np

from . import beatmap


def _frames(path, W=108, H=135):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-vf", f"scale={W}:{H}", "-f", "rawvideo",
                          "-pix_fmt", "rgb24", "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(-1, H, W, 3).astype(np.float32)


def _fps(path):
    s = subprocess.check_output(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
                                 "stream=r_frame_rate", "-of", "csv=p=0", str(path)]).decode().strip()
    n, d = (int(x) for x in s.split("/"))
    return n / d


def merge(spans, gap=0.12):
    """Join [start, end] spans separated by less than `gap` seconds."""
    out = []
    for a, b in sorted(spans):
        if out and a - out[-1][1] <= gap:
            out[-1][1] = max(out[-1][1], b)
        else:
            out.append([a, b])
    return [[round(float(a), 2), round(float(b), 2)] for a, b in out]


def detect(path):
    fr = _frames(path)
    fps = _fps(path)
    n = len(fr)
    luma = fr.mean(axis=(1, 2, 3))
    r, g, b = fr[..., 0].mean((1, 2)), fr[..., 1].mean((1, 2)), fr[..., 2].mean((1, 2))
    cyan = (g + b) / 2 - r
    gray = fr.mean(3)
    diff = np.r_[0, np.abs(np.diff(gray, axis=0)).mean((1, 2))]
    ev = []
    used = np.zeros(n, bool)

    def ramp(i, step):
        """Walk away from a peak until brightness is back near the level around it."""
        far = luma[max(0, i - 24):max(1, i - 10)] if step < 0 else luma[min(n - 1, i + 10):min(n, i + 24)]
        base = float(np.median(far)) if len(far) else luma[i] - 60
        lim = base + 0.15 * (luma[i] - base)
        j = i
        while 0 < j < n - 1 and luma[j + step] > lim and abs(j - i) < 15:
            j += step
        return j

    # bright peaks: white flash or light leak
    for i in range(2, n - 2):
        if luma[i] > 200 and luma[i] >= luma[i - 1] and luma[i] >= luma[i + 1]:
            s, e = ramp(i, -1), ramp(i, 1)
            ev.append({"t": round(i / fps, 3), "type": "leak" if cyan[i] > 25 else "white",
                       "a": round(max(0.05, (i - s) / fps), 3), "b": round(max(0.08, (e - i) / fps), 3)})
            used[max(0, s - 1):e + 2] = True
    # fade in / fade out
    fade_in = None
    if luma[0] < 30:
        k = 0
        while k < n - 1 and luma[k + 1] > luma[k] + 3 and k < 30:
            k += 1
        fade_in = [0.0, round(k / fps, 3)]
    fade_out = None
    if luma[-1] < 30:
        k = n - 1
        while k > 0 and luma[k - 1] > luma[k] + 1.5:
            k -= 1
        if (n - 1 - k) >= 4:
            fade_out = [round(k / fps, 3), round((n - 1) / fps, 3)]
            used[k:] = True
    # dark dips: tv-off (gradual) or glitch (sudden)
    for i in range(2, n - 2):
        if used[i] or luma[i] > 45 or not (luma[i] <= luma[i - 1] and luma[i] <= luma[i + 1]):
            continue
        k = i
        while k > 0 and luma[k - 1] > luma[k] + 3:
            k -= 1
        gradual = (i - k) >= 3 and diff[i] < 60
        e = i
        while e < n - 1 and luma[e + 1] > luma[e] + 3:
            e += 1
        if gradual:
            ev.append({"t": round(i / fps, 3), "type": "tvoff", "a": round((i - k) / fps, 3),
                       "b": round(max(0.1, (e - i) / fps), 3)})
        else:
            ev.append({"t": round(i / fps, 3), "type": "glitch", "b": round(max(0.06, (e - i + 1) / fps), 3)})
        used[max(0, k - 1):e + 2] = True
    # hard cuts
    for i in range(2, n - 2):
        if used[i] or used[i - 1]:
            continue
        lo, hi = max(0, i - 6), min(n, i + 7)
        neigh = np.median(np.r_[diff[lo:i], diff[i + 1:hi]])
        a0, b0 = gray[i - 1] - gray[i - 1].mean(), gray[i] - gray[i].mean()
        corr = (a0 * b0).sum() / (np.sqrt((a0 * a0).sum() * (b0 * b0).sum()) + 1e-6)
        if diff[i] > 25 and diff[i] > 2.5 * neigh and corr < 0.6:
            ev.append({"t": round(i / fps, 3), "type": "cut"})
            used[i - 1:i + 2] = True
    ev.sort(key=lambda e: e["t"])
    # flicker: alternate-frame brightness wobble, each step undone by the next one
    d2 = np.diff(luma)
    alt = np.r_[False, (np.sign(d2[1:]) != np.sign(d2[:-1])) & (np.abs(d2[1:]) > 3) & (np.abs(d2[1:]) < 15)
                & (np.abs(d2[1:] + d2[:-1]) < 0.35 * np.abs(d2[1:]))]
    flick, i = [], 0
    while i < len(alt):
        if alt[i]:
            j = i
            while j < len(alt) and alt[j]:
                j += 1
            if j - i >= 6:
                flick.append([round(i / fps, 2), round((j + 1) / fps, 2)])
            i = j
        else:
            i += 1
    return {"fps": fps, "duration": round(n / fps, 3), "events": ev, "fade_in": fade_in, "fade_out": fade_out,
            "flicker": merge(flick)}


def audio_report(path):
    y, sr = beatmap.load_audio(path)
    bm = beatmap.analyze(path)
    hop = int(0.05 * sr)
    frames = np.lib.stride_tricks.sliding_window_view(y, hop)[::hop]
    spec = np.abs(np.fft.rfft(frames * np.hanning(hop), axis=1))
    freqs = np.fft.rfftfreq(hop, 1 / sr)
    low = 20 * np.log10(spec[:, freqs < 150].mean(1) + 1e-6)
    high = 20 * np.log10(spec[:, freqs > 2500].mean(1) + 1e-6)
    t = np.arange(len(low)) * 0.05
    # drop: biggest lasting rise of bass level, 3 s after vs 3 s before
    k = 60
    rise = [low[i:i + k].mean() - low[max(0, i - k):i].mean() if i > k else -99 for i in range(len(low) - k)]
    drop = float(t[int(np.argmax(rise))]) if rise else None
    # stops: the highs (melody, vocal, hats) drop out 11 dB below the song's usual level for >= 0.25 s
    level = float(np.median(high[high > -100]))
    quiet = (high < level - 11) & (high > -100)
    stops, i = [], 0
    while i < len(quiet):
        if quiet[i]:
            j = i
            while j < len(quiet) and quiet[j]:
                j += 1
            if (j - i) * 0.05 >= 0.25:
                stops.append([round(t[i], 2), round(t[j - 1] + 0.05, 2)])
            i = j
        else:
            i += 1
    return {"bpm": bm["bpm"], "beats": bm["beats"], "drop": round(drop, 2) if drop else None, "stops": merge(stops, 0.2)}


def skeleton(vis, aud, music_rel="clips/music.m4a"):
    """story.json with one shot per slot between transitions, placeholder captions,
    the camera habits of the format, and the heart ending in the last slot."""
    bounds = [e for e in vis["events"]]
    times = [0.0] + [e["t"] for e in bounds] + [vis["duration"]]
    shots, caps = [], []
    drop = aud.get("drop") or 1e9
    for k in range(len(times) - 1):
        t0, t1 = times[k], times[k + 1]
        if t1 - t0 < 0.2:
            continue
        nxt = bounds[k]["type"] if k < len(bounds) else "end"
        prv = bounds[k - 1] if k > 0 else None
        D = round(t1 - t0, 3)
        zk = [[0, 1.0], [D, 1.2, "in"]] if nxt in ("white", "glitch") else [[0, 1.0], [D, 1.06]]
        shot = {"t0": round(t0, 3), "t1": round(t1, 3), "clip": "CLIP", "in": 0.0, "speed": 1.0,
                "focus": [0.5, 0.5], "zoom_keys": zk, "_what": "describe the shot"}
        if t0 >= drop - 0.5:
            shot["handheld"] = 5
        shots.append(shot)
        lead = (prv.get("b", 0.0) if prv else 0.0) + 0.1
        caps.append({"t0": round(t0 + lead, 2), "t1": round(t1 + 0.02, 2), "cps": 15,
                     "lines": ["LINE ONE", "^yLINE ^rTWO"]})
    last = shots[-1]
    glitch = next((e for e in reversed(bounds) if e["type"] == "glitch"), None)
    heart_t = round((glitch["t"] + glitch["b"] * 0.45) if glitch else last["t0"] + 0.1, 3)
    # the format: a short silent opener, then a quoted label (with the arrow) on the second shot
    if shots[0]["t1"] - shots[0]["t0"] < 1.2 and len(caps) > 2:
        caps.pop(0)
    caps[0].update({"cps": 0, "lines": ["“^xKEY ^yWORDS”"], "y": 0.72})
    caps[-1].update({"t0": round(heart_t + 0.03, 2), "cps": 0, "y": 0.63, "size": 0.095,
                     "lines": ["“^xRESPECT”"]})
    beats_after = [b for b in aud["beats"] if b > heart_t + 0.4][:3]
    return {
        "title": "TITLE",
        "_timing": "Transition times measured from the reference edit; keep them, they sit on the song.",
        "_audio": {"bpm": aud["bpm"], "drop": aud["drop"], "stops": aud["stops"]},
        "size": [1080, 1350], "fps": 30, "crf": 18,
        "music": {"file": music_rel},
        "fade_in": vis["fade_in"] or [0.0, 0.1],
        "fade_out": vis["fade_out"],
        "shots": shots,
        "transitions": bounds,
        "captions": caps,
        "overlays": [
            {"type": "arrow", "t0": round(shots[1]["t0"] + 0.05, 2), "t1": round(shots[1]["t1"], 2),
             "tail": [0.8, 0.68], "tip": [0.61, 0.53], "bend": 0.4, "_note": "point at the detail that matters"},
            {"type": "heart", "t": heart_t, "big": 0.45, "big_at": [0.5, 0.45], "small_at": [0.5, 0.535],
             "beats": beats_after},
            {"type": "sparkles", "t0": round(last["t0"], 2), "t1": round(last["t1"] + 0.1, 2), "n": 50},
        ],
        "flicker": vis["flicker"],
    }


def analyze(ref, ep_dir):
    ep = Path(ep_dir)
    (ep / "clips").mkdir(parents=True, exist_ok=True)
    music = ep / "clips" / "music.m4a"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(ref), "-vn", "-c:a", "aac", "-b:a", "192k", str(music)],
                   check=True)
    vis = detect(ref)
    aud = audio_report(ref)
    sk = skeleton(vis, aud)
    out = ep / "story.json"
    if out.exists():
        out = ep / "story.skeleton.json"
    out.write_text(json.dumps(sk, indent=1, ensure_ascii=False))
    lines = [f"reference {ref}", f"duration {vis['duration']} s at {vis['fps']:.3f} fps",
             f"tempo ~{aud['bpm']} bpm, drop at {aud['drop']} s, stops {aud['stops']}", "", "transitions:"]
    lines += [f"  {e['t']:7.3f}  {e['type']:6s}" + (f"  in {e.get('a', 0):.2f}s out {e.get('b', 0):.2f}s"
                                                   if e["type"] != "cut" else "") for e in vis["events"]]
    lines += ["", f"fade in {vis['fade_in']}, fade out {vis['fade_out']}", f"flicker {vis['flicker']}",
              "", f"{len(sk['shots'])} shot slots: " + ", ".join(f"{s['t1'] - s['t0']:.2f}" for s in sk["shots"])]
    (ep / "reference_timeline.txt").write_text("\n".join(lines) + "\n")
    print("\n".join(lines))
    print(f"\nwrote {out}, {music}, {ep / 'reference_timeline.txt'}")


def sheet(video, out, start=0.0, end=None, step=0.5, cols=12, w=200):
    from PIL import Image, ImageDraw, ImageFont
    if end is None:
        end = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                                             "-of", "csv=p=0", str(video)]))
    raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", str(start), "-i", str(video), "-t", str(end - start),
                          "-vf", f"fps={1 / step},scale={w}:-2", "-f", "image2pipe", "-vcodec", "png", "-"],
                         capture_output=True).stdout
    sig = b"\x89PNG\r\n\x1a\n"
    ims = [Image.open(io.BytesIO(sig + p)).convert("RGB") for p in raw.split(sig)[1:]]
    font = ImageFont.truetype("/usr/share/fonts/opentype/inter/Inter-Bold.otf", 14)
    h = ims[0].height
    S = Image.new("RGB", (cols * w, ((len(ims) + cols - 1) // cols) * h))
    for i, im in enumerate(ims):
        t = start + i * step
        d = ImageDraw.Draw(im)
        d.rectangle([0, 0, 64, 16], fill=(0, 0, 0))
        d.text((2, 0), f"{int(t) // 60}:{t % 60:05.2f}", font=font, fill=(255, 230, 0))
        S.paste(im, ((i % cols) * w, (i // cols) * h))
    S.save(out, quality=85)
    print(f"wrote {out} ({len(ims)} frames)")


def compare(ref, ours, out):
    font = "/usr/share/fonts/opentype/inter/Inter-Bold.otf"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(ref), "-i", str(ours), "-filter_complex",
                    "[0:v]fps=30,scale=540:676,setsar=1[a];[1:v]scale=540:676,setsar=1[b];[a][b]hstack=inputs=2,"
                    f"drawtext=fontfile={font}:text='reference':x=12:y=10:fontsize=26:fontcolor=yellow:box=1:boxcolor=black@0.5,"
                    f"drawtext=fontfile={font}:text='ours':x=552:y=10:fontsize=26:fontcolor=yellow:box=1:boxcolor=black@0.5[v]",
                    "-map", "[v]", "-map", "1:a?", "-c:v", "libx264", "-crf", "20", "-c:a", "aac", "-shortest",
                    "-movflags", "+faststart", str(out)], check=True)
    print(f"wrote {out}")


def window(path, thr=6, fill=0.5, bridge=2):
    """Measure a picture window on a black canvas: its box at rest and how it scales over time.
    The canvas is pure black, so a row is picture when > `fill` of it is brighter than `thr` AND both of its outer
    edges are lit (a caption's glow never reaches the sides). Dark picture content (a car's window frame, night sky)
    can hide one edge, so the scale is the larger of the top-edge and bottom-edge estimates."""
    W, H = 180, 320
    fr = _frames(path, W, H)
    fps = _fps(path)
    k = max(2, int(0.03 * W))
    spans = []
    for f in fr.mean(-1):
        lit = f > thr
        rows = (lit.mean(1) > fill) & (lit[:, :k].mean(1) > 0.5) & (lit[:, -k:].mean(1) > 0.5)
        idx = np.nonzero(rows)[0]
        if len(idx) < H * 0.1:
            spans.append(None)
            continue
        runs, a0, prev = [], idx[0], idx[0]
        for i in idx[1:]:
            if i - prev > bridge:
                runs.append((a0, prev)); a0 = i
            prev = i
        runs.append((a0, prev))
        y0, y1 = max(runs, key=lambda r: r[1] - r[0])
        spans.append((y0, y1 + 1))
    mode = lambda v: float(np.bincount(np.array(v, int)).argmax())
    top0 = mode([sp[0] for sp in spans if sp])
    bot0 = mode([sp[1] for sp in spans if sp])
    c = (top0 + bot0) / 2
    sc = np.array([max((c - sp[0]) / (c - top0), (sp[1] - c) / (bot0 - c)) if sp else np.nan for sp in spans])
    good = ~np.isnan(sc)
    sc = np.interp(np.arange(len(sc)), np.nonzero(good)[0], sc[good])
    sc = np.array([np.median(sc[max(0, i - 1):i + 2]) for i in range(len(sc))])   # drop single-frame misreads
    # keys: the fewest points that keep the curve within `tol` (Ramer-Douglas-Peucker), joined linearly
    tol = 0.012
    ts = np.arange(len(sc)) / fps

    def rdp(i, j):
        if j - i < 2:
            return [i, j]
        line = sc[i] + (sc[j] - sc[i]) * (ts[i:j + 1] - ts[i]) / (ts[j] - ts[i])
        k = int(np.argmax(np.abs(sc[i:j + 1] - line)))
        if abs(sc[i + k] - line[k]) <= tol:
            return [i, j]
        return rdp(i, i + k)[:-1] + rdp(i + k, j)

    out = [[round(float(ts[i]), 2), round(float(sc[i]), 2), "linear"] for i in rdp(0, len(sc) - 1)]
    out[0] = out[0][:2]
    box = [0.0, round(top0 / H, 3), 1.0, round(bot0 / H, 3)]
    print(f"window box at rest (fractions of the frame): {box}")
    print("scale_keys:", json.dumps(out))
    step = max(1, int(round(fps / 10)))
    print("scale every 0.1 s:\n  " + " ".join(f"{i / fps:.1f}:{sc[i]:.2f}" for i in range(0, len(sc), step)))
    return box, out


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    a = sub.add_parser("analyze"); a.add_argument("reference"); a.add_argument("episode")
    s = sub.add_parser("sheet"); s.add_argument("video"); s.add_argument("out")
    s.add_argument("--start", type=float, default=0.0); s.add_argument("--end", type=float); s.add_argument("--step", type=float, default=0.5)
    c = sub.add_parser("compare"); c.add_argument("reference"); c.add_argument("ours"); c.add_argument("out")
    w = sub.add_parser("window"); w.add_argument("video")
    args = ap.parse_args()
    if args.cmd == "analyze":
        analyze(args.reference, args.episode)
    elif args.cmd == "sheet":
        sheet(args.video, args.out, args.start, args.end, args.step)
    elif args.cmd == "window":
        window(args.video)
    else:
        compare(args.reference, args.ours, args.out)
