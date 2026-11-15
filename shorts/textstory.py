#!/usr/bin/env python3
"""Text-story Shorts: a short looping clip under a written story, music only.

Format (reverse-engineered from @The_fatal_second, 15 videos measured):
  * 7.0 s total. The story takes ~20 s to read, so viewers watch the loop 2-3x.
  * Black 1080x1920 frame. A 55-80 word story in bold white text, key phrases in
    yellow, centred at the top. No voiceover.
  * Below it, one continuous clip of the key moment in a rounded card
    (1030 px wide, 72 px corner radius) that fills the space down to y=1750.
  * One signature music loop on every video, with the clip's own sound mixed
    in only when it matters (a cheer, a name, a line).
Improvements over theirs: the clip and music loop seamlessly (crossfade +
an exactly-7 s music loop), the card stops above YouTube's caption overlay,
and an optional small credit line.

    SRC_DIR=/path/to/videos python3 textstory.py edits_ts/<name>.json --out <name>.mp4

Edit file fields:
  source      YouTube id; the video is SRC_DIR/<id>.mp4
  in          start of the moment in the source (seconds)
  dur         output length (default 7.0)
  speed       <1 slows the moment down (0.8 = 80 % speed); source window = dur*speed
  fx, fy      focus point inside the card crop (0-1, default 0.5)
  zoom        extra zoom inside the card (default 1.0)
  text        the story; wrap highlighted phrases in *asterisks*
  music       "night" | "dawn" | path to a wav (default "night")
  clip_db     mix the clip's own sound at this level relative to the music
              (e.g. -3); omit to mute it
  credit      optional small line under the card, e.g. "Video: Born Free Foundation"
  loop_xfade  seconds of crossfade at the loop point (default 0.35)
  cover_t     time of the frame saved as <out>_cover.jpg for the thumbnail (default 1.0)
  title       YouTube title (used by the upload kit only)
"""
import argparse
import json
import os
import subprocess
import sys
import tempfile

import numpy as np
import soundfile as sf
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import music  # noqa: E402

W, H, FPS, SR = 1080, 1920, 30, 44100
FONT = os.path.join(HERE, "fonts", "OpenSans-ExtraBold.ttf")
SIZE, LINE_H, MAX_W = 44, 49, 880
TEXT_TOP = 165
CARD_X, CARD_W, RADIUS, GAP = 25, 1030, 72, 34
CARD_BOTTOM, CARD_MAX_H = 1750, 1220
WHITE, YELLOW, GREY = (255, 255, 255), (255, 226, 0), (150, 150, 150)


def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode:
        sys.exit(f"command failed: {' '.join(cmd[:6])}...\n{r.stderr[-1500:]}")
    return r.stdout


def probe(path):
    d = json.loads(run(["ffprobe", "-v", "error", "-show_streams", "-show_format", "-of", "json", path]))
    v = next(s for s in d["streams"] if s["codec_type"] == "video")
    rot = int((v.get("tags") or {}).get("rotate", 0) or 0)
    for sd in v.get("side_data_list", []) or []:
        rot = int(sd.get("rotation", rot) or rot)
    w, h = v["width"], v["height"]
    if abs(rot) in (90, 270):
        w, h = h, w
    return w, h, any(s["codec_type"] == "audio" for s in d["streams"])


# ---------------------------------------------------------------- text layout

def tokens(text):
    """Split into (word, highlighted) pairs; *...* spans may cover several words."""
    out, on = [], False
    for w in text.split():
        starts = w.lstrip("\"“‘(").startswith("*")
        ends = w.rstrip(".,!?;:…'\"”’)").endswith("*")
        hl = on or starts
        out.append((w.replace("*", ""), hl))
        on = hl and not ends
    return out


def wrap(toks, font):
    space = font.getlength(" ")
    lines, cur, cur_w = [], [], 0.0
    for word, hl in toks:
        ww = font.getlength(word)
        if cur and cur_w + space + ww > MAX_W:
            lines.append(cur); cur, cur_w = [], 0.0
        cur_w += (space if cur else 0) + ww
        cur.append((word, hl, ww))
    if cur:
        lines.append(cur)
    return lines, space


def draw_text(draw, lines, space, font, top):
    for i, line in enumerate(lines):
        lw = sum(w for _, _, w in line) + space * (len(line) - 1)
        x = (W - lw) / 2; y = top + i * LINE_H
        for word, hl, ww in line:
            draw.text((x, y), word, font=font, fill=YELLOW if hl else WHITE)
            x += ww + space


def layout(edl):
    font = ImageFont.truetype(FONT, SIZE)
    lines, space = wrap(tokens(edl["text"]), font)
    text_h = len(lines) * LINE_H
    card_top = TEXT_TOP + text_h + GAP
    card_h = CARD_BOTTOM - card_top
    shift = 0
    if card_h > CARD_MAX_H:              # short story: centre text + card vertically
        shift = (card_h - CARD_MAX_H) // 2
        card_h = CARD_MAX_H
    card_h -= card_h % 2                 # yuv420p needs even sizes
    if card_h < 760:
        print(f"warning: story is long ({len(lines)} lines), card only {card_h}px tall", file=sys.stderr)
    return font, lines, space, TEXT_TOP + shift, card_top + shift, card_h


def make_background(edl, path):
    font, lines, space, text_top, card_top, card_h = layout(edl)
    im = Image.new("RGB", (W, H), (0, 0, 0))
    d = ImageDraw.Draw(im)
    draw_text(d, lines, space, font, text_top)
    if edl.get("credit"):
        f2 = ImageFont.truetype(FONT, 26)
        tw = f2.getlength(edl["credit"])
        d.text(((W - tw) / 2, card_top + card_h + 16), edl["credit"], font=f2, fill=GREY)
    im.save(path)
    mask = Image.new("L", (CARD_W * 4, card_h * 4), 0)       # 4x supersampled corners
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, CARD_W * 4 - 1, card_h * 4 - 1), RADIUS * 4, fill=255)
    mask.resize((CARD_W, card_h), Image.LANCZOS).save(path.replace(".png", "_mask.png"))
    return card_top, card_h, len(lines)


# ---------------------------------------------------------------- audio

def read_audio(path, start, dur):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{start:.3f}", "-t", f"{dur:.3f}", "-i", path,
                          "-vn", "-ac", "2", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True).stdout
    a = np.frombuffer(raw, np.float32).reshape(-1, 2).copy()
    n = int(round(dur * SR))
    return np.pad(a, ((0, max(0, n - len(a))), (0, 0)))[:n]


def loop_xfade(a, D, X):
    """a has length D+X: return length-D signal whose end flows into its start."""
    nD, nX = int(D * SR), int(X * SR)
    out = a[nX:nX + nD].copy()
    ramp = np.linspace(0, 1, nX)[:, None]
    out[nD - nX:] = out[nD - nX:] * (1 - ramp) + a[:nX] * ramp
    return out


def build_audio(edl, src, has_audio, path):
    D = edl.get("dur", 7.0); X = edl.get("loop_xfade", 0.35); speed = edl.get("speed", 1.0)
    m = edl.get("music", "night")
    if m in music.PRESETS:
        cache = os.path.join(os.environ.get("MUSIC_CACHE", tempfile.gettempdir()), f"music_{m}.wav")
        if not os.path.exists(cache):
            sf.write(cache, music.loudnorm(music.render(m)), SR)
        m = cache
    y, sr = sf.read(m, dtype="float32", always_2d=True)
    if sr != SR or y.shape[1] != 2:
        sys.exit("music must be 44.1 kHz stereo")
    n = int(D * SR)
    y = np.tile(y, (n // len(y) + 1, 1))[:n]
    if edl.get("clip_db") is not None and has_audio:
        c = read_audio(src, edl["in"], (D + X) * speed)
        if speed != 1.0:
            from scipy.signal import resample
            c = resample(c, int(len(c) / speed)).astype(np.float32)
        c = np.pad(c, ((0, max(0, int((D + X) * SR) - len(c))), (0, 0)))[: int((D + X) * SR)]
        c = loop_xfade(c, D, X)
        import pyloudnorm as pyln
        meter = pyln.Meter(SR)
        lc = meter.integrated_loudness(np.concatenate([c] * 3))
        if np.isfinite(lc):
            c = c * 10 ** ((-14 + edl["clip_db"] - lc) / 20)
            y = y * 10 ** (-3 / 20) + c
    y = music.loudnorm(y, -14.0)
    sf.write(path, y, SR)


# ---------------------------------------------------------------- video

def render(edl, src_dir, out):
    src = os.path.join(src_dir, edl["source"] + ".mp4")
    sw, sh, has_audio = probe(src)
    D = edl.get("dur", 7.0); speed = edl.get("speed", 1.0)
    X = round(edl.get("loop_xfade", 0.35) * FPS) / FPS          # frame-exact crossfade
    edl = dict(edl, loop_xfade=X)
    work = tempfile.mkdtemp(prefix="ts_")
    bg = os.path.join(work, "bg.png")
    card_top, card_h, n_lines = make_background(edl, bg)
    zoom = edl.get("zoom", 1.0)
    s = max(CARD_W / sw, card_h / sh) * zoom
    vw, vh = int(np.ceil(sw * s / 2) * 2), int(np.ceil(sh * s / 2) * 2)
    cx = int(np.clip(edl.get("fx", 0.5) * vw - CARD_W / 2, 0, vw - CARD_W))
    cy = int(np.clip(edl.get("fy", 0.5) * vh - card_h / 2, 0, vh - card_h))
    grade = edl.get("grade", "eq=contrast=1.05:saturation=1.12,unsharp=5:5:0.5")
    win = (D + X) * speed
    fg = (
        f"[1:v]trim=start={edl['in']:.3f}:duration={win:.3f},setpts=(PTS-STARTPTS)/{speed},fps={FPS},"
        f"scale={vw}:{vh}:flags=lanczos,crop={CARD_W}:{card_h}:{cx}:{cy},{grade},format=yuv420p,split[c1][c2];"
        f"[c1]trim=start={X},setpts=PTS-STARTPTS[a];[c2]trim=end={X + 1 / FPS:.4f},setpts=PTS-STARTPTS[b];"
        f"[a][b]xfade=transition=fade:duration={X}:offset={D - X:.3f},format=rgba[lp];"
        f"[2:v]format=gray[m];[lp][m]alphamerge[card];"
        f"[0:v][card]overlay={CARD_X}:{card_top}:shortest=1,trim=duration={D},format=yuv420p[v]"
    )
    wav = os.path.join(work, "a.wav")
    build_audio(edl, src, has_audio, wav)
    run(["ffmpeg", "-v", "error", "-y", "-loop", "1", "-framerate", str(FPS), "-i", bg,
         "-i", src, "-loop", "1", "-framerate", str(FPS), "-i", bg.replace(".png", "_mask.png"),
         "-i", wav, "-filter_complex", fg, "-map", "[v]", "-map", "3:a",
         "-c:v", "libx264", "-preset", "slow", "-crf", "17", "-pix_fmt", "yuv420p", "-r", str(FPS),
         "-c:a", "aac", "-b:a", "192k", "-t", f"{D}", "-movflags", "+faststart", out])
    # cover image for the thumbnail upload: the frame at cover_t (default 1.0 s)
    cover = os.path.splitext(out)[0] + "_cover.jpg"
    run(["ffmpeg", "-v", "error", "-y", "-ss", f"{edl.get('cover_t', 1.0):.2f}", "-i", out,
         "-frames:v", "1", "-q:v", "2", cover])
    words = len(edl["text"].replace("*", "").split())
    print(f"{out}: {D:.1f}s, {words} words (~{words / 3.3:.0f}s to read, {words / 3.3 / D:.1f} loops), "
          f"{n_lines} lines, card {CARD_W}x{card_h} at y={card_top}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("edl", nargs="+")
    ap.add_argument("--out")
    ap.add_argument("--out-dir", default=".")
    ap.add_argument("--src-dir", default=os.environ.get("SRC_DIR", "."))
    a = ap.parse_args()
    for p in a.edl:
        edl = json.load(open(p))
        name = os.path.splitext(os.path.basename(p))[0]
        out = a.out if a.out and len(a.edl) == 1 else os.path.join(a.out_dir, name + ".mp4")
        render(edl, a.src_dir, out)


if __name__ == "__main__":
    main()
