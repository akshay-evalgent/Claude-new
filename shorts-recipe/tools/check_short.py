"""Score your own short against the numbers measured on the 20 reference shorts.

Usage:
  pip install faster-whisper opencv-python-headless numpy
  python check_short.py my_short.mp4

Needs ffmpeg on PATH. Prints each measure, the reference range, and PASS / CHECK.
"""
import json
import re
import subprocess
import sys
import tempfile
import os

import numpy as np

# Ranges measured on the 20 reference shorts (see ../analysis/metrics.csv)
TARGETS = {
    "first_word_s": (0.0, 0.3, "voice starts on frame one (19 of 19 narrated shorts: 0.00 s)"),
    "wpm": (155, 200, "words per minute (reference 139-197, median 180)"),
    "tail_s": (0.0, 1.0, "seconds after the last word (reference median 0.7 s)"),
    "lufs": (-13.5, -9.0, "integrated loudness, stereo (reference -9.1 to -13.1 LUFS, median -11)"),
    "median_shot_s": (1.0, 3.5, "median shot length (reference median 2.5 s)"),
    "locked_shot_pct": (0, 20, "% of shots with no camera move (reference 9%)"),
}


def sh(cmd):
    return subprocess.run(cmd, capture_output=True, text=True)


def loudness(path):
    r = sh(["ffmpeg", "-nostats", "-i", path, "-af", "ebur128", "-f", "null", "-"]).stderr
    vals = re.findall(r"I:\s+(-?[\d.]+) LUFS", r)
    return float(vals[-1]) if vals else None


def words_of(path):
    from faster_whisper import WhisperModel

    raw = subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-i", path, "-vn", "-ac", "1", "-ar", "16000",
                          "-f", "f32le", "-"], capture_output=True, check=True).stdout
    audio = np.frombuffer(raw, dtype=np.float32).copy()
    m = WhisperModel("small.en", device="cpu", compute_type="int8")
    segs, _ = m.transcribe(audio, word_timestamps=True)
    return [{"w": w.word, "s": w.start, "e": w.end} for s in segs for w in s.words]


def readable_copy(path, tmpdir):
    """OpenCV often cannot decode AV1 (common in YouTube downloads); fall back to an H.264 copy."""
    import cv2

    cap = cv2.VideoCapture(path)
    ok, _ = cap.read()
    cap.release()
    if ok:
        return path
    out = os.path.join(tmpdir, "h264.mp4")
    sh(["ffmpeg", "-y", "-i", path, "-an", "-c:v", "libx264", "-crf", "18", "-preset", "veryfast", out])
    return out


def shots_of(path):
    import cv2

    cap = cv2.VideoCapture(path)
    fps = cap.get(cv2.CAP_PROP_FPS) or 30
    prev_h = prev_g = None
    cuts, moves, i = [0.0], [], 0
    seg_scale, seg_shift = 1.0, 0.0
    while True:
        ok, fr = cap.read()
        if not ok:
            break
        fr = cv2.resize(fr, (240, int(240 * fr.shape[0] / fr.shape[1])))
        g = cv2.cvtColor(fr, cv2.COLOR_BGR2GRAY)
        hsv = cv2.cvtColor(fr, cv2.COLOR_BGR2HSV)
        h = cv2.normalize(cv2.calcHist([hsv], [0, 1, 2], None, [16, 8, 8], [0, 180, 0, 256, 0, 256]), None).flatten()
        t = i / fps
        if prev_h is not None:
            diff = 1 - cv2.compareHist(prev_h, h, cv2.HISTCMP_CORREL)
            mad = float(np.mean(cv2.absdiff(g, prev_g)))
            if (diff > 0.45 or (diff > 0.25 and mad > 25)) and t - cuts[-1] > 0.2:
                moves.append(abs(np.log(seg_scale)) > 0.04 or seg_shift > 20)
                cuts.append(t)
                seg_scale, seg_shift = 1.0, 0.0
            else:
                pts = cv2.goodFeaturesToTrack(prev_g, 300, 0.01, 6)
                if pts is not None and len(pts) > 15:
                    nxt, st, _ = cv2.calcOpticalFlowPyrLK(prev_g, g, pts, None)
                    a, b = pts[st == 1], nxt[st == 1]
                    if len(a) > 12:
                        M, _ = cv2.estimateAffinePartial2D(a, b, method=cv2.RANSAC, ransacReprojThreshold=1.5)
                        if M is not None:
                            seg_scale *= float(np.hypot(M[0, 0], M[1, 0]))
                            seg_shift += float(np.hypot(M[0, 2], M[1, 2]))
        prev_h, prev_g = h, g
        i += 1
    dur = i / fps
    moves.append(abs(np.log(seg_scale)) > 0.04 or seg_shift > 20)
    lens = np.diff(cuts + [dur])
    return float(dur), float(np.median(lens)), float(100.0 * (1 - np.mean(moves)))


def main():
    path = sys.argv[1]
    W = words_of(path)
    with tempfile.TemporaryDirectory() as d:
        dur, med_shot, locked = shots_of(readable_copy(path, d))
    res = {"duration_s": round(dur, 1)}
    if W:
        speak = max(W[-1]["e"] - W[0]["s"], 1e-3)
        res.update(first_word_s=round(W[0]["s"], 2), wpm=round(60 * len(W) / speak),
                   tail_s=round(dur - W[-1]["e"], 2))
        gaps = [W[i + 1]["s"] - W[i]["e"] for i in range(len(W) - 1)]
        res["pauses_over_0.5s"] = int(sum(g > 0.5 for g in gaps))
    res.update(lufs=loudness(path), median_shot_s=round(med_shot, 2), locked_shot_pct=int(round(locked)))

    print(json.dumps(res, indent=1))
    print()
    for k, (lo, hi, why) in TARGETS.items():
        v = res.get(k)
        if v is None:
            print(f"  ?      {k:16s} not measured")
            continue
        ok = lo <= v <= hi
        print(f"  {'PASS ' if ok else 'CHECK'}  {k:16s} {v:>7}   target {lo}-{hi}  ({why})")
    if W:
        print("\nfirst line :", " ".join(w["w"].strip() for w in W[:12]))
        print("last line  :", " ".join(w["w"].strip() for w in W[-12:]))
        print("Loop test  : read the last line, then the first line. Does it flow? (see Recipe > Ending)")


if __name__ == "__main__":
    main()
