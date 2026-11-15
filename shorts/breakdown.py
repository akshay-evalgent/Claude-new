#!/usr/bin/env python3
""""Breakdown" Shorts: an edited, narrated, sourced story (15-40 s).

Built to be clearly original under YouTube's inauthentic/reused-content rules.
Every video has its own structure instead of a fixed template:
  * several segments from different sources (clips, our own screen recordings
    of the evidence, stills), each with its own caption chunk,
  * narration (your own recorded voice, or a Kokoro draft to time the edit),
  * editorial additions: highlight boxes, push-ins, a "why it matters" ending,
  * on-screen sources.

    SRC_DIR=... python3 breakdown.py edits_bd/<name>.json --out <name>.mp4

Edit file:
{
  "series": "THE CODE THAT…",              small label at the top
  "sources": "Sources: NASA · MIT News",   small line under the card
  "voiceover": "tts" | "path/to/your_voice.wav" | null,
  "voice": "am_michael", "speed": 1.08,
  "music": "orbit", "music_db": -12,        music level under narration
  "segments": [
    {"source": "<file in SRC_DIR without .mp4>", "in": 7.6, "dur": 4.5,
     "fx": 0.5, "fy": 0.5, "zoom": 1.0, "push": 1.06, "speed": 1.0,
     "audio_db": 0,                    # keep the clip's own sound (omit to mute)
     "text": "caption shown during this segment, *highlights* in yellow",
     "say": "narration for this segment (defaults to text)",
     "box": [x0, y0, x1, y1, t0, t1]   # optional highlight box, 0-1 card coords
    }, ...
  ]
}
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
import textstory as ts  # noqa: E402

W, H, FPS, SR = 1080, 1920, 30, 44100
FONT = os.path.join(HERE, "fonts", "OpenSans-ExtraBold.ttf")
YELLOW, WHITE, GREY = (255, 226, 0), (255, 255, 255), (150, 150, 150)
LABEL_Y, TEXT_TOP, TEXT_SIZE, TEXT_LH, TEXT_W = 150, 230, 56, 66, 920
CARD_X, CARD_Y, CARD_W, CARD_H, RADIUS = 25, 800, 1030, 900, 72


def background(seg_text, series, sources, path):
    im = Image.new("RGB", (W, H), (0, 0, 0)); d = ImageDraw.Draw(im)
    if series:
        f = ImageFont.truetype(FONT, 34)
        lab = " ".join(series.upper())          # letter-spaced label
        d.text(((W - f.getlength(lab)) / 2, LABEL_Y), lab, font=f, fill=YELLOW)
    f = ImageFont.truetype(FONT, TEXT_SIZE)
    toks = ts.tokens(seg_text)
    space = f.getlength(" "); lines, cur, cw = [], [], 0.0
    for word, hl in toks:
        ww = f.getlength(word)
        if cur and cw + space + ww > TEXT_W:
            lines.append(cur); cur, cw = [], 0.0
        cw += (space if cur else 0) + ww; cur.append((word, hl, ww))
    if cur:
        lines.append(cur)
    block = len(lines) * TEXT_LH
    top = TEXT_TOP + max(0, (CARD_Y - 40 - TEXT_TOP - block) // 2)   # centre in the text zone
    for i, line in enumerate(lines):
        lw = sum(w for _, _, w in line) + space * (len(line) - 1); x = (W - lw) / 2
        for word, hl, ww in line:
            d.text((x, top + i * TEXT_LH), word, font=f, fill=YELLOW if hl else WHITE); x += ww + space
    if sources:
        sz = 26
        while sz > 18 and ImageFont.truetype(FONT, sz).getlength(sources) > W - 60:
            sz -= 1
        f2 = ImageFont.truetype(FONT, sz)
        d.text(((W - f2.getlength(sources)) / 2, CARD_Y + CARD_H + 18), sources, font=f2, fill=GREY)
    im.save(path)
    if block > CARD_Y - 40 - TEXT_TOP:
        print(f"warning: caption too long ({len(lines)} lines): {seg_text[:40]}…", file=sys.stderr)


def card_mask(path):
    m = Image.new("L", (CARD_W * 4, CARD_H * 4), 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, CARD_W * 4 - 1, CARD_H * 4 - 1), RADIUS * 4, fill=255)
    m.resize((CARD_W, CARD_H), Image.LANCZOS).save(path)


def render_segment(seg, dur, src_dir, work, k, series, sources):
    src = os.path.join(src_dir, seg["source"] + ".mp4")
    sw, sh, _ = ts.probe(src)
    bg = os.path.join(work, f"bg{k}.png"); background(seg["text"], series, sources, bg)
    mask = os.path.join(work, "mask.png")
    if not os.path.exists(mask):
        card_mask(mask)
    speed = seg.get("speed", 1.0); push = seg.get("push", 1.05); zoom = seg.get("zoom", 1.0)
    s = max(CARD_W / sw, CARD_H / sh) * zoom * push
    vw, vh = int(np.ceil(sw * s / 2) * 2), int(np.ceil(sh * s / 2) * 2)
    cx = int(np.clip(seg.get("fx", 0.5) * vw - CARD_W / 2, 0, vw - CARD_W))
    cy = int(np.clip(seg.get("fy", 0.5) * vh - CARD_H / 2, 0, vh - CARD_H))
    n = int(round(dur * FPS))
    pw, ph = int(CARD_W * push) // 2 * 2, int(CARD_H * push) // 2 * 2
    px = int(np.clip(cx - (pw - CARD_W) / 2, 0, vw - pw)); py = int(np.clip(cy - (ph - CARD_H) / 2, 0, vh - ph))
    delogo = "".join(f"delogo=x={x}:y={y}:w={w}:h={h}," for x, y, w, h in seg.get("delogo", []))
    box = ""
    if seg.get("box"):
        x0, y0, x1, y1, t0, t1 = seg["box"]
        box = (f"drawbox=x={int(x0 * CARD_W)}:y={int(y0 * CARD_H)}:w={int((x1 - x0) * CARD_W)}:"
               f"h={int((y1 - y0) * CARD_H)}:color=0xFFE200@0.95:t=8:enable='between(t,{t0},{t1})',")
    # slow push-in (zoompan on a 2x upscale keeps it smooth)
    fg = (
        f"[1:v]trim=start={seg['in']:.3f}:duration={dur * speed + 0.2:.3f},setpts=(PTS-STARTPTS)/{speed},fps={FPS},tpad=stop_mode=clone:stop_duration={dur + 1:.2f},{delogo}"
        f"scale={vw}:{vh}:flags=lanczos,crop={pw}:{ph}:{px}:{py},scale={CARD_W * 2}:{CARD_H * 2}:flags=lanczos,"
        f"zoompan=z='1+({push}-1)*on/{max(1, n - 1)}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s={CARD_W}x{CARD_H}:fps={FPS},"
        f"eq=contrast=1.05:saturation=1.1,unsharp=5:5:0.4,{box}"
        f"format=rgba[c];[2:v]format=gray[m];[c][m]alphamerge[card];"
        f"[0:v][card]overlay={CARD_X}:{CARD_Y}:shortest=1,trim=duration={dur:.3f},format=yuv420p[v]"
    )
    out = os.path.join(work, f"seg{k}.mp4")
    ts.run(["ffmpeg", "-v", "error", "-y", "-loop", "1", "-framerate", str(FPS), "-i", bg, "-i", src,
            "-loop", "1", "-framerate", str(FPS), "-i", mask, "-filter_complex", fg, "-map", "[v]",
            "-c:v", "libx264", "-preset", "medium", "-crf", "17", "-r", str(FPS), "-an", out])
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("edl"); ap.add_argument("--out", required=True)
    ap.add_argument("--src-dir", default=os.environ.get("SRC_DIR", "."))
    a = ap.parse_args()
    edl = json.load(open(a.edl))
    work = tempfile.mkdtemp(prefix="bd_")
    segs = edl["segments"]
    # 1. narration per segment
    vo_mode = edl.get("voiceover")
    vos = [None] * len(segs)
    import render as rd
    rd.SR = SR                                 # narration and whooshes at our sample rate
    if vo_mode == "tts":
        cache = os.environ.get("TTS_CACHE", os.path.join(HERE, ".tts_cache")); os.makedirs(cache, exist_ok=True)
        for i, sg in enumerate(segs):
            line = sg.get("say", sg["text"])
            if line:
                vos[i] = rd.tts(line, edl.get("voice", "am_michael"), edl.get("speed", 1.08), cache)[0]
    durs = []
    for i, sg in enumerate(segs):
        d = sg.get("dur", 3.0)
        if vos[i] is not None:
            d = max(d, len(vos[i]) / SR + 0.45)
        durs.append(round(d * FPS) / FPS)
    total = sum(durs)
    # 2. video
    parts = [render_segment(sg, durs[i], a.src_dir, work, i, edl.get("series"), edl.get("sources"))
             for i, sg in enumerate(segs)]
    lst = os.path.join(work, "list.txt")
    open(lst, "w").write("".join(f"file '{p}'\n" for p in parts))
    vid = os.path.join(work, "video.mp4")
    ts.run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", lst, "-c", "copy", vid])
    # 3. audio: music bed, clip sound, narration (or your own recording), whooshes on cuts
    n = int(total * SR)
    mname = edl.get("music", "orbit")
    if mname in music.PRESETS:
        cache = os.path.join(os.environ.get("MUSIC_CACHE", tempfile.gettempdir()), f"music_{mname}.wav")
        if not os.path.exists(cache):
            sf.write(cache, music.loudnorm(music.render(mname)), SR)
        mname = cache
    m, _ = sf.read(mname, dtype="float32", always_2d=True)
    bed = np.tile(m, (n // len(m) + 1, 1))[:n]
    voice = np.zeros((n, 2), np.float32); clip = np.zeros((n, 2), np.float32); fx = np.zeros((n, 2), np.float32)
    t = 0.0
    for i, sg in enumerate(segs):
        i0 = int(t * SR)
        if sg.get("audio_db") is not None:
            c = ts.read_audio(os.path.join(a.src_dir, sg["source"] + ".mp4"), sg["in"], durs[i] * sg.get("speed", 1.0))
            c = c * 10 ** ((sg["audio_db"] - 20 * np.log10(np.sqrt(np.mean(c ** 2)) + 1e-9) - 20) / 20)
            c = c[: n - i0]; ramp = min(len(c), int(0.04 * SR))
            c[:ramp] *= np.linspace(0, 1, ramp)[:, None]; c[-ramp:] *= np.linspace(1, 0, ramp)[:, None]
            clip[i0:i0 + len(c)] += c
        if vos[i] is not None:
            v = vos[i][: n - i0 - int(0.15 * SR)]
            voice[i0 + int(0.15 * SR): i0 + int(0.15 * SR) + len(v)] += v
        if i > 0:
            w = rd.whoosh(0.35, -26, seed=i)[: n - i0]
            fx[max(0, i0 - int(0.12 * SR)): max(0, i0 - int(0.12 * SR)) + len(w)] += w
        t += durs[i]
    if isinstance(vo_mode, str) and vo_mode not in ("tts",) and os.path.exists(vo_mode):
        v, sr = sf.read(vo_mode, dtype="float32", always_2d=True)
        v = np.repeat(v[:, :1], 2, 1) if v.shape[1] == 1 else v
        voice[: min(n, len(v))] += v[:n]
    if np.abs(voice).max() > 0:
        voice = voice / (np.sqrt(np.mean(voice[np.abs(voice).max(1) > 0.01] ** 2)) + 1e-9) * 0.1
    env = np.convolve(np.abs(voice).max(1), np.ones(int(0.25 * SR)) / int(0.25 * SR), "same")
    duck = 10 ** ((edl.get("music_db", -12) * np.clip(env / (env.max() + 1e-9) * 3, 0, 1)) / 20)
    mix = bed * duck[:, None] * 0.6 + voice + clip + fx
    mix = music.loudnorm(mix.astype(np.float32), -14.0)
    wav = os.path.join(work, "a.wav"); sf.write(wav, mix, SR)
    ts.run(["ffmpeg", "-v", "error", "-y", "-i", vid, "-i", wav, "-map", "0:v", "-map", "1:a", "-c:v", "copy",
            "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", a.out])
    cover = os.path.splitext(a.out)[0] + "_cover.jpg"
    ts.run(["ffmpeg", "-v", "error", "-y", "-ss", str(edl.get("cover_t", 1.0)), "-i", a.out, "-frames:v", "1", "-q:v", "2", cover])
    print(f"{a.out}: {total:.1f}s, {len(segs)} segments ({', '.join(f'{d:.1f}' for d in durs)})")


if __name__ == "__main__":
    main()
