#!/usr/bin/env python3
"""Audit a vertical short before (or after) editing it.

Writes to --out (default: <video name>.audit/ next to the video):
  report.md      findings, flagged against the playbook
  sheet.jpg      timestamped contact sheet (every --every seconds)
  ruler.jpg      one frame with a y-axis ruler, for choosing --caption-band by eye
  captions.jpg   the caption band at every caption change, timestamped (read it to
                 get the script with timings; there is no offline speech-to-text)
  captions.json  [{start, end}] for each caption state
  pauses.json    gaps in the voice [{start, end, mid}] - cut only inside these
  envelope.npy   voice-band envelope (t, dB) for checking any other cut point

Usage:
  python3 audit.py film/input/draft.mp4
  python3 audit.py draft.mp4 --caption-band 1515:1605 --every 1.5
"""
from __future__ import annotations

import argparse
import json
import math
import os
import re
import subprocess
import sys
import tempfile
import wave

import numpy as np
from PIL import Image, ImageDraw, ImageFont

FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"


def run(cmd, **kw):
    return subprocess.run(cmd, capture_output=True, text=True, **kw)


def probe(path: str) -> dict:
    out = run(["ffprobe", "-v", "error", "-show_entries",
               "format=duration:stream=codec_type,width,height,r_frame_rate,sample_rate",
               "-of", "json", path]).stdout
    j = json.loads(out)
    v = next(s for s in j["streams"] if s["codec_type"] == "video")
    a = next((s for s in j["streams"] if s["codec_type"] == "audio"), None)
    num, den = v["r_frame_rate"].split("/")
    return {"duration": float(j["format"]["duration"]), "w": v["width"], "h": v["height"],
            "fps": float(num) / float(den), "audio_sr": int(a["sample_rate"]) if a else None}


def contact_sheet(path, out, every, dur):
    n = max(1, int(dur / every))
    cols = 8 if n > 24 else 6
    vf = (f"fps=1/{every},scale=180:-1,drawtext=fontfile={FONT}:text='%{{pts\\:hms}}':"
          f"x=4:y=4:fontsize=14:fontcolor=red:box=1:boxcolor=white@0.7,"
          f"tile={cols}x{math.ceil(n / cols)}:padding=4:color=black")
    run(["ffmpeg", "-v", "error", "-y", "-i", path, "-vf", vf, "-frames:v", "1", out])


def ruler(path, out, info, t):
    raw = run_bytes(["ffmpeg", "-v", "error", "-ss", f"{t:.2f}", "-i", path, "-frames:v", "1",
                     "-f", "rawvideo", "-pix_fmt", "rgb24", "-"])
    img = Image.frombytes("RGB", (info["w"], info["h"]), raw)
    d = ImageDraw.Draw(img)
    f = ImageFont.truetype(FONT, 28)
    for y in range(0, info["h"], 100):
        d.line([(0, y), (info["w"], y)], fill=(255, 0, 0), width=2 if y % 500 else 4)
        d.text((8, y + 2), str(y), fill=(255, 0, 0), font=f)
    img.resize((info["w"] // 2, info["h"] // 2)).save(out, quality=85)


def run_bytes(cmd) -> bytes:
    return subprocess.run(cmd, capture_output=True).stdout


def freezes(path, dur):
    err = run(["ffmpeg", "-hide_banner", "-nostats", "-i", path, "-vf",
               "scale=270:-1,freezedetect=n=0.002:d=0.6", "-an", "-f", "null", "-"]).stderr
    starts = [float(x) for x in re.findall(r"freeze_start: ([0-9.]+)", err)]
    ends = [float(x) for x in re.findall(r"freeze_end: ([0-9.]+)", err)]
    if len(ends) < len(starts):
        ends.append(dur)
    return list(zip(starts, ends))


def loudness(path):
    err = run(["ffmpeg", "-hide_banner", "-nostats", "-i", path, "-af", "ebur128=peak=true",
               "-vn", "-f", "null", "-"]).stderr
    i = re.findall(r"I:\s+(-?[0-9.]+) LUFS", err)
    p = re.findall(r"Peak:\s+(-?[0-9.]+) dBFS", err)
    return (float(i[-1]) if i else None, float(p[-1]) if p else None)


def voice_envelope(path):
    """Voice-band (250-3500 Hz) energy in dB, 20 ms windows every 10 ms."""
    with tempfile.TemporaryDirectory() as td:
        wav = os.path.join(td, "a.wav")
        run(["ffmpeg", "-v", "error", "-y", "-i", path, "-ac", "1", "-ar", "16000", wav])
        w = wave.open(wav)
        sr = w.getframerate()
        x = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(float) / 32768
    hop, win = 160, 640
    n = max(0, (len(x) - win) // hop)
    frames = np.lib.stride_tricks.sliding_window_view(x, win)[::hop][:n] * np.hanning(win)
    sp = np.abs(np.fft.rfft(frames, axis=1)) ** 2
    freqs = np.fft.rfftfreq(win, 1 / sr)
    band = (freqs > 250) & (freqs < 3500)
    env = 10 * np.log10(sp[:, band].sum(axis=1) + 1e-12)
    env = np.convolve(env, np.ones(3) / 3, mode="same")
    t = np.arange(n) * hop / sr + win / 2 / sr
    return t, env


def find_pauses(t, env, gap_db, min_len=0.07):
    quiet = env < gap_db
    out, i = [], 0
    while i < len(quiet):
        if quiet[i]:
            j = i
            while j < len(quiet) and quiet[j]:
                j += 1
            if t[j - 1] - t[i] >= min_len:
                lo = i + int(np.argmin(env[i:j]))
                out.append({"start": round(float(t[i]), 3), "end": round(float(t[j - 1]), 3),
                            "mid": round(float(t[lo]), 3)})
            i = j
        else:
            i += 1
    return out


def detect_band(path, info):
    """Guess the caption band: rows in the lower 45-95% whose bright/yellow/dark
    text pixels flip on and off most often (captions change; scenery drifts)."""
    w, h = 270, int(270 * info["h"] / info["w"])
    raw = run_bytes(["ffmpeg", "-v", "error", "-i", path, "-vf", f"fps=4,scale={w}:{h}",
                     "-f", "rawvideo", "-pix_fmt", "rgb24", "-"])
    a = np.frombuffer(raw, np.uint8).reshape(-1, h, w, 3).astype(int)
    white = a.min(axis=3) > 215
    yellow = (a[..., 0] > 200) & (a[..., 1] > 160) & (a[..., 2] < 110)
    dark = a.max(axis=3) < 45
    best = None
    for mask in (white | yellow, dark):
        flips = np.abs(np.diff(mask.astype(np.int8), axis=0)).mean(axis=(0, 2))
        lo, hi = int(0.45 * h), int(0.95 * h)
        win = max(4, int(0.045 * h))
        sums = np.convolve(flips[lo:hi], np.ones(win), mode="valid")
        k = int(np.argmax(sums))
        score = float(sums[k])
        if best is None or score > best[0]:
            best = (score, lo + k, lo + k + win)
    scale = info["h"] / h
    y0 = max(0, int(best[1] * scale) - 12)
    y1 = min(info["h"], int(best[2] * scale) + 12)
    return y0, y1


def caption_states(path, info, band, out_img):
    y0, y1 = band
    bw, bh = info["w"] // 2, (y1 - y0) // 2
    raw = run_bytes(["ffmpeg", "-v", "error", "-i", path, "-vf",
                     f"crop={info['w']}:{y1 - y0}:0:{y0},scale={bw}:{bh}",
                     "-f", "rawvideo", "-pix_fmt", "rgb24", "-"])
    a = np.frombuffer(raw, np.uint8).reshape(-1, bh, bw, 3)
    ai = a.astype(int)
    mask = (ai.min(axis=3) > 200) | ((ai[..., 0] > 200) & (ai[..., 1] > 160) & (ai[..., 2] < 110)) \
        | (ai.max(axis=3) < 45)
    fps = info["fps"]
    diff = np.abs(np.diff(mask.astype(np.int8), axis=0)).sum(axis=(1, 2))
    thr = max(0.012 * bw * bh, np.percentile(diff, 90) * 0.5)
    cuts = [0] + [k + 1 for k in np.where(diff > thr)[0]]
    starts = []
    for c in cuts:
        if not starts or c - starts[-1] >= 4:
            starts.append(c)
    starts.append(len(a))
    states = [{"start": round(s / fps, 3), "end": round(e / fps, 3)} for s, e in zip(starts, starts[1:])]
    # tile: 2 columns of (timestamp + crop)
    f = ImageFont.truetype(FONT, 14)
    rows = math.ceil(len(states) / 2)
    tile_h = bh + 4
    pages = []
    per_page = 120
    for p0 in range(0, len(states), per_page):
        chunk = states[p0:p0 + per_page]
        rows = math.ceil(len(chunk) / 2)
        img = Image.new("RGB", (2 * (bw + 80), rows * tile_h), "black")
        d = ImageDraw.Draw(img)
        for j, s in enumerate(chunk):
            k = min(len(a) - 1, int((s["start"] + s["end"]) / 2 * fps))
            x, y = (j % 2) * (bw + 80), (j // 2) * tile_h
            d.text((x + 2, y + bh // 2 - 8), f"{s['start']:6.2f}", fill="red", font=f)
            img.paste(Image.fromarray(a[k]), (x + 76, y + 2))
        name = out_img if p0 == 0 else out_img.replace(".jpg", f"-{p0 // per_page + 1}.jpg")
        img.save(name, quality=88)
        pages.append(name)
    return states, pages


def frame_diff(path, n_a, n_b):
    def grab(n):
        raw = run_bytes(["ffmpeg", "-v", "error", "-i", path, "-vf",
                         f"select=eq(n\\,{n}),scale=270:480", "-frames:v", "1",
                         "-f", "rawvideo", "-pix_fmt", "rgb24", "-"])
        return np.frombuffer(raw, np.uint8).reshape(480, 270, 3).astype(int)
    return float(np.abs(grab(n_a) - grab(n_b)).mean())


def opening_motion(path, fps):
    raw = run_bytes(["ffmpeg", "-v", "error", "-t", "1.0", "-i", path, "-vf", "scale=135:240",
                     "-f", "rawvideo", "-pix_fmt", "gray", "-"])
    a = np.frombuffer(raw, np.uint8).reshape(-1, 240, 135).astype(int)
    return float(np.abs(np.diff(a, axis=0)).mean()) if len(a) > 1 else 0.0


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("video")
    ap.add_argument("--out")
    ap.add_argument("--every", type=float, default=2.0, help="contact-sheet spacing (s)")
    ap.add_argument("--caption-band", help="y0:y1 in pixels; guessed if omitted")
    ap.add_argument("--no-captions", action="store_true")
    ap.add_argument("--gap-db", type=float, help="voice-band level below which is a gap")
    args = ap.parse_args()

    v = args.video
    out = args.out or os.path.splitext(v)[0] + ".audit"
    os.makedirs(out, exist_ok=True)
    info = probe(v)
    dur, fps = info["duration"], info["fps"]
    nframes = int(round(dur * fps))

    contact_sheet(v, os.path.join(out, "sheet.jpg"), args.every, dur)
    ruler(v, os.path.join(out, "ruler.jpg"), info, min(2.0, dur / 2))
    fr = freezes(v, dur)
    lufs, peak = loudness(v)
    t, env = voice_envelope(v)
    np.save(os.path.join(out, "envelope.npy"), np.vstack([t, env]))
    gap_db = args.gap_db if args.gap_db is not None else float(np.percentile(env, 25))
    speech_db = float(np.percentile(env, 75))
    pauses = find_pauses(t, env, gap_db)
    json.dump({"gap_db": gap_db, "speech_db": speech_db, "pauses": pauses},
              open(os.path.join(out, "pauses.json"), "w"), indent=1)
    voiced = np.where(env > (gap_db + speech_db) / 2)[0]
    first_word = float(t[voiced[0]]) if len(voiced) else None
    last_word = float(t[voiced[-1]]) if len(voiced) else None
    motion = opening_motion(v, fps)
    loop = frame_diff(v, 0, nframes - 1)

    band, states, pages = None, [], []
    if not args.no_captions:
        band = tuple(int(x) for x in args.caption_band.split(":")) if args.caption_band \
            else detect_band(v, info)
        states, pages = caption_states(v, info, band, os.path.join(out, "captions.jpg"))
        json.dump({"band": band, "states": states}, open(os.path.join(out, "captions.json"), "w"), indent=1)

    end_hold = next((e - s for s, e in fr if e >= dur - 0.05), 0.0)
    mid_freezes = [(s, e) for s, e in fr if e < dur - 0.05]
    flags = []
    if dur > 60:
        flags.append(f"**Length {dur:.1f} s > 60 s.** A Short over 1 minute with a Content ID claim is "
                     "blocked; longer also means lower completion. Cut to under 60 s unless every "
                     "sound and image is yours.")
    if first_word is not None and first_word > 0.5:
        flags.append(f"**First words at {first_word:.2f} s.** The hook window is the first 1-2 s; start "
                     "the voice (or on-screen text) at frame 0.")
    if motion < 1.0:
        flags.append(f"**Opening second is nearly still** (mean frame change {motion:.2f}/255). The first "
                     "frame acts as the thumbnail: make sure it carries the payoff (image or on-screen "
                     "text) or has motion. Fine if a hook card is doing that job.")
    for s, e in mid_freezes:
        flags.append(f"**Frozen picture {s:.2f}-{e:.2f} s ({e - s:.2f} s).** Add motion, or cut it if the "
                     "voice has a gap there (check pauses.json).")
    tail = dur - last_word if last_word is not None else 0.0
    if tail > 1.0:
        flags.append(f"**Silent tail {tail:.2f} s** after the last word. About 0.8 s is right: a "
                     "0.3 s hold, then a 0.5 s dissolve into the first frame.")
    if end_hold > 1.0:
        flags.append(f"**End hold {end_hold:.2f} s.** Dead time at the end costs completion and loops; "
                     "trim it and dissolve into the first frame.")
    if loop > 6:
        flags.append(f"**Loop jump:** last vs first frame differ by {loop:.1f}/255. Dissolve the last "
                     "0.5 s into frame 0 so the replay runs on.")
    if lufs is not None and not (-16 <= lufs <= -12):
        flags.append(f"**Loudness {lufs:.1f} LUFS.** Aim for about -14.")
    if peak is not None and peak > -1.0:
        flags.append(f"**True peak {peak:.1f} dBFS.** Keep below -1.")

    lines = [f"# Audit: {os.path.basename(v)}", "",
             f"{info['w']}x{info['h']}, {fps:g} fps, {dur:.2f} s, audio {info['audio_sr']} Hz", "",
             "## Flags", ""]
    lines += [f"- {f}" for f in flags] or ["- None. Nothing in the mechanical checks needs fixing."]
    lines += ["", "## Measurements", "",
              "| check | value |", "|---|---|",
              f"| first words | {first_word:.2f} s |" if first_word is not None else "| first words | none |",
              f"| last words | {last_word:.2f} s |" if last_word is not None else "| last words | none |",
              f"| opening motion (1st s) | {motion:.2f}/255 |",
              f"| frozen stretches >= 0.6 s | {', '.join(f'{s:.2f}-{e:.2f}' for s, e in fr) or 'none'} |",
              f"| end hold (frozen) | {end_hold:.2f} s |",
              f"| silent tail after last word | {dur - last_word:.2f} s |" if last_word is not None else "| silent tail | n/a |",
              f"| loudness | {lufs} LUFS, peak {peak} dBFS |",
              f"| last vs first frame | {loop:.1f}/255 |",
              f"| voice gaps found | {len(pauses)} (gap < {gap_db:.1f} dB, speech ~{speech_db:.1f} dB) |"]
    if band:
        lines += [f"| caption band | y {band[0]}-{band[1]} ({len(states)} caption states) |"]
    lines += ["", "## Files", "",
              "- `sheet.jpg`: contact sheet; check it is the video you think it is",
              "- `ruler.jpg`: pick `--caption-band` here if the guess is wrong",
              "- " + ", ".join(f"`{os.path.basename(p)}`" for p in pages) +
              ": read these to write the script with timings" if pages else "- captions: skipped",
              "- `pauses.json`: cut only at a `mid` inside these gaps"]
    report = "\n".join(lines) + "\n"
    open(os.path.join(out, "report.md"), "w").write(report)
    print(report)
    print(f"Wrote {out}/")


if __name__ == "__main__":
    sys.exit(main())
