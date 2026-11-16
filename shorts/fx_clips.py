#!/usr/bin/env python3
"""Visual "reveal" clips (1030x900) for Repo Reveal Shorts; used as breakdown.py segment sources.

    python3 fx_clips.py pip   spec.json out.mp4   # demo video: main crop + picture-in-picture inset crop
    python3 fx_clips.py crop  spec.json out.mp4   # demo video: one region, slow push
    python3 fx_clips.py wipe  spec.json out.mp4   # before/after with a moving slider
    python3 fx_clips.py kenburns spec.json out.mp4  # still image: animated zoom/pan between two boxes
    python3 fx_clips.py flip  spec.json out.mp4   # fast flipbook of stills (punch-in on each)

Boxes are [x0, y0, x1, y1] in source pixels.
  pip:      {"video", "in", "dur", "main": box, "inset": box, "inset_label": "HER FACE"}
  crop:     {"video", "in", "dur", "box": box, "speed": 1.0}
  wipe:     {"before": img, "after": img} or {"pair": img (left=before, right=after)},
            "crop": box (optional, applied to both), "dur", "hold": 0.6, "labels": true
  kenburns: {"image", "from": box, "to": box, "dur"}
  flip:     {"images": [img, ...], "each": 0.45, "crop_to_card": true}
  parallax: {"image", "depth": .npy (relative inverse depth), "dur", "amp": 0.05, "zoom": 0.06}   3D-photo move
  img2vid:  {"image", "video", "in", "dur", "speed", "layout": "inset"|"side", "label_in", "label_out", "timer": true}
  cutout:   {"image", "cut": rgba png, "dur", "bg": optional new background image}
  grid:     {"pairs": [[img, rgba], ...], "cols": 4, "dur"}            batch: every cell flips to its cut-out
  voice:    {"wav", "name", "desc", "text", "pad": 0.5}                 voice sample card (keeps the audio)
  subs:     {"video", "in", "dur", "words": whisper json, "box", "tag"}  live auto-subtitles (keeps the audio)
  browser:  {"steps": steps.json [{img, url}], "from", "to", "each": 0.1, "last_hold": 1.2, "tag"}  page + live URL bar
"""
import json
import math
import subprocess
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

CW, CH, FPS = 1030, 900, 30
FONT = __import__("os").path.join(__import__("os").path.dirname(__file__), "fonts", "OpenSans-ExtraBold.ttf")


def run(cmd):
    cmd = cmd[:1] + ["-nostdin"] + cmd[1:] if cmd[0] == "ffmpeg" else cmd
    r = subprocess.run(cmd, capture_output=True, text=True, stdin=subprocess.DEVNULL)
    if r.returncode:
        sys.exit(r.stderr[-1500:])


def writer(out):
    return subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{CW}x{CH}",
                             "-r", str(FPS), "-i", "-", "-c:v", "libx264", "-crf", "16", "-pix_fmt", "yuv420p", out],
                            stdin=subprocess.PIPE)


def fit_box(box, aspect=CW / CH):
    """Grow a box to the card aspect ratio around its centre."""
    x0, y0, x1, y1 = box; w, h = x1 - x0, y1 - y0; cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    if w / h < aspect:
        w = h * aspect
    else:
        h = w / aspect
    return [cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2]


def ease(t):
    return 0.5 - 0.5 * math.cos(math.pi * min(1, max(0, t)))


def pip(spec, out):
    x0, y0, x1, y1 = [int(v) for v in fit_box(spec["main"])]
    ix0, iy0, ix1, iy1 = [int(v) for v in spec["inset"]]
    iw = 300; ih = int(iw * (iy1 - iy0) / (ix1 - ix0)) // 2 * 2
    lab = spec.get("inset_label", "")
    fl = ImageFont.truetype(FONT, 30)
    # inset frame decoration (border + label) as a transparent PNG overlay
    deco = Image.new("RGBA", (iw + 16, ih + 16 + (46 if lab else 0)), (0, 0, 0, 0)); d = ImageDraw.Draw(deco)
    d.rounded_rectangle((0, 0, iw + 15, ih + 15), 22, outline=(255, 226, 0, 255), width=6)
    if lab:
        tw = fl.getlength(lab); d.rounded_rectangle(((iw + 16 - tw) / 2 - 14, ih + 18, (iw + 16 + tw) / 2 + 14, ih + 60), 12, fill=(0, 0, 0, 200))
        d.text(((iw + 16 - tw) / 2, ih + 20), lab, font=fl, fill=(255, 226, 0, 255))
    deco_p = out + ".deco.png"; deco.save(deco_p)
    fg = (f"[0:v]trim=start={spec['in']}:duration={spec['dur'] + 0.1},setpts=PTS-STARTPTS,fps={FPS},split[a][b];"
          f"[a]crop={x1 - x0}:{y1 - y0}:{x0}:{y0},scale={CW}:{CH}:flags=lanczos[m];"
          f"[b]crop={ix1 - ix0}:{iy1 - iy0}:{ix0}:{iy0},scale={iw}:{ih}:flags=lanczos[i];"
          f"[m][i]overlay=36:{CH - ih - 36 - (46 if lab else 0)}[mi];[mi][1:v]overlay=28:{CH - ih - 44 - (46 if lab else 0)},"
          f"trim=duration={spec['dur']},format=yuv420p[v]")
    run(["ffmpeg", "-v", "error", "-y", "-i", spec["video"], "-loop", "1", "-i", deco_p, "-filter_complex", fg,
         "-map", "[v]", "-c:v", "libx264", "-crf", "16", "-an", out])


def crop(spec, out):
    sp = spec.get("speed", 1.0)
    head = f"[0:v]trim=start={spec['in']}:duration={spec['dur'] * sp + 0.1},setpts=(PTS-STARTPTS)/{sp},fps={FPS},"
    if spec.get("fit") == "contain":
        x0, y0, x1, y1 = [int(v) for v in spec["box"]]
        fg = (head + f"crop={x1 - x0}:{y1 - y0}:{x0}:{y0},split[a][b];"
              f"[a]scale={CW}:{CH}:force_original_aspect_ratio=increase,crop={CW}:{CH},boxblur=30:2,eq=brightness=-0.18[bg];"
              f"[b]scale={CW}:{CH}:force_original_aspect_ratio=decrease:flags=lanczos[fg];"
              f"[bg][fg]overlay=(W-w)/2:(H-h)/2,trim=duration={spec['dur']},format=yuv420p[v]")
    else:
        x0, y0, x1, y1 = [int(v) for v in fit_box(spec["box"])]
        fg = head + f"crop={x1 - x0}:{y1 - y0}:{x0}:{y0},scale={CW}:{CH}:flags=lanczos,trim=duration={spec['dur']},format=yuv420p[v]"
    run(["ffmpeg", "-v", "error", "-y", "-i", spec["video"], "-filter_complex", fg, "-map", "[v]", "-c:v", "libx264", "-crf", "16", "-an", out])


def contain(region):
    """Fit a region inside the card; fill the rest with a blurred, darkened copy of it."""
    s = min(CW / region.width, CH / region.height)
    fg = region.resize((max(1, round(region.width * s)), max(1, round(region.height * s))), Image.LANCZOS)
    if fg.size == (CW, CH):
        return fg.convert("RGB")
    sb = max(CW / region.width, CH / region.height)
    bg = region.resize((math.ceil(region.width * sb), math.ceil(region.height * sb)), Image.BILINEAR)
    l, t = (bg.width - CW) // 2, (bg.height - CH) // 2
    bg = bg.crop((l, t, l + CW, t + CH)).filter(ImageFilter.GaussianBlur(28))
    bg = Image.blend(bg.convert("RGB"), Image.new("RGB", (CW, CH), (0, 0, 0)), 0.45)
    bg.paste(fg.convert("RGB"), ((CW - fg.width) // 2, (CH - fg.height) // 2))
    return bg


def card_from(img, box=None, fit="cover"):
    if fit == "contain":
        return contain(img.crop([int(v) for v in box]) if box else img)
    if box:
        img = img.crop([int(v) for v in fit_box(box)])
    s = max(CW / img.width, CH / img.height)
    img = img.resize((math.ceil(img.width * s), math.ceil(img.height * s)), Image.LANCZOS)
    l, t = (img.width - CW) // 2, (img.height - CH) // 2
    return img.crop((l, t, l + CW, t + CH)).convert("RGB")


def wipe(spec, out):
    if "pair" in spec:
        p = Image.open(spec["pair"]).convert("RGB"); w = p.width // 2
        before, after = p.crop((0, 0, w, p.height)), p.crop((w, 0, 2 * w, p.height))
    else:
        before, after = Image.open(spec["before"]).convert("RGB"), Image.open(spec["after"]).convert("RGB")
    if spec.get("after_size") == "before":                 # e.g. a 4x upscale shown at the same framing
        after = after.resize(before.size, Image.LANCZOS) if after.size != before.size else after
    if spec.get("before_resample") == "nearest":           # show the low-res input honestly: blocky pixels
        before = before.resize(after.size, Image.NEAREST) if before.size != after.size else before
    elif before.size != after.size:
        before = before.resize(after.size, Image.BICUBIC)
    b, a = card_from(before, spec.get("crop"), spec.get("fit", "cover")), card_from(after, spec.get("crop"), spec.get("fit", "cover"))
    b = b.filter(ImageFilter.UnsharpMask(2, 60, 2)); a = a.filter(ImageFilter.UnsharpMask(2, 60, 2))
    dur, hold = spec.get("dur", 3.5), spec.get("hold", 0.6)
    n = int(dur * FPS); fl = ImageFont.truetype(FONT, 34)
    p = writer(out)
    for fr in range(n):
        t = fr / FPS
        x = int(CW * ease((t - hold) / max(0.1, dur - 2 * hold)))       # slider moves left -> right
        im = a.copy(); im.paste(b.crop((x, 0, CW, CH)), (x, 0))       # after on the left, before on the right
        d = ImageDraw.Draw(im)
        if 0 < x < CW:
            d.rectangle((x - 3, 0, x + 3, CH), fill=(255, 255, 255)); d.ellipse((x - 22, CH / 2 - 22, x + 22, CH / 2 + 22), fill=(255, 255, 255))
        if spec.get("labels", True):
            lb, la = spec.get("label_before", "BEFORE"), spec.get("label_after", "AFTER")
            wb, wa = fl.getlength(lb), fl.getlength(la)
            if x < CW - wb - 90:
                d.rounded_rectangle((CW - wb - 60, 24, CW - 24, 76), 14, fill=(0, 0, 0)); d.text((CW - wb - 42, 30), lb, font=fl, fill=(255, 255, 255))
            if x > wa + 90:
                d.rounded_rectangle((24, 24, wa + 60, 76), 14, fill=(255, 226, 0)); d.text((42, 30), la, font=fl, fill=(0, 0, 0))
        p.stdin.write(im.tobytes())
    p.stdin.close(); p.wait()


def kenburns(spec, out):
    img = Image.open(spec["image"]).convert("RGB")
    f0, f1 = spec["from"], spec["to"]; n = int(spec.get("dur", 4) * FPS)
    small = img.resize((img.width // 2, img.height // 2), Image.LANCZOS)      # faster frames when zoomed out
    p = writer(out)
    for fr in range(n):
        k = ease(fr / max(1, n - 1))
        b = [f0[i] + (f1[i] - f0[i]) * k for i in range(4)]
        b = [max(0, b[0]), max(0, b[1]), min(img.width, b[2]), min(img.height, b[3])]
        src, sc = (small, 0.5) if (b[2] - b[0]) > 2 * CW else (img, 1.0)
        im = contain(src.crop(tuple(int(v * sc) for v in b)))
        p.stdin.write(im.tobytes())
    p.stdin.close(); p.wait()


def flip(spec, out):
    each = spec.get("each", 0.45); n_each = int(each * FPS)
    cards = [card_from(Image.open(f).convert("RGB"), spec.get("crop"), spec.get("fit", "cover")) for f in spec["images"]]
    p = writer(out)
    for c in cards:
        for fr in range(n_each):
            z = 1.06 - 0.06 * ease(fr / max(1, n_each - 1))           # punch in, settle
            w, h = CW / z, CH / z
            im = c.resize((CW, CH), Image.LANCZOS, box=((CW - w) / 2, (CH - h) / 2, (CW + w) / 2, (CH + h) / 2))
            p.stdin.write(im.tobytes())
    p.stdin.close(); p.wait()


def label(d, xy, text, size=30, fg=(0, 0, 0), bg=(255, 226, 0), anchor="l"):
    f = ImageFont.truetype(FONT, size); w = f.getlength(text); x, y = xy
    if anchor == "c":
        x -= (w + 28) / 2
    d.rounded_rectangle((x, y, x + w + 28, y + size + 18), 12, fill=bg); d.text((x + 14, y + 4), text, font=f, fill=fg)


def parallax(spec, out):
    """3D-photo move: the image is re-projected from its depth map as the camera drifts."""
    import cv2
    img = Image.open(spec["image"]).convert("RGB"); dep = np.load(spec["depth"]).astype(np.float32)
    if "box" in spec:
        b = [int(v) for v in fit_box(spec["box"])]; img = img.crop(b)
        dep = dep[max(0, b[1]):b[3], max(0, b[0]):b[2]]
    m = 1 + spec.get("margin", 0.14)
    s = max(CW * m / img.width, CH * m / img.height)
    Wb, Hb = math.ceil(img.width * s), math.ceil(img.height * s)
    base = np.asarray(img.resize((Wb, Hb), Image.LANCZOS)).astype(np.float32)
    d = cv2.resize(dep, (Wb, Hb), interpolation=cv2.INTER_CUBIC)
    lo, hi = np.percentile(d, 2), np.percentile(d, 98)
    d = np.clip((d - lo) / (hi - lo + 1e-6), 0, 1)
    k = max(3, int(0.012 * Wb) | 1)
    d = cv2.dilate(cv2.GaussianBlur(d, (k, k), 0), np.ones((k, k), np.uint8))   # grow the foreground over its edge
    n = int(spec.get("dur", 4) * FPS); amp = spec.get("amp", 0.05) * CW; zoom = spec.get("zoom", 0.06)
    focus = spec.get("focus", 0.35)                         # depth that stays still (0 far .. 1 near)
    uu, vv = np.meshgrid(np.arange(CW, dtype=np.float32), np.arange(CH, dtype=np.float32))
    p = writer(out)
    for fr in range(n):
        t = fr / max(1, n - 1)
        ang = 2 * math.pi * (spec.get("turns", 0.75) * t) + spec.get("phase", -math.pi / 2)
        ox, oy = amp * math.cos(ang), 0.35 * amp * math.sin(ang)
        z = 1 + zoom * ease(t)
        X = Wb / 2 + (uu - CW / 2) / z; Y = Hb / 2 + (vv - CH / 2) / z
        xs, ys = X.copy(), Y.copy()
        for _ in range(4):                                   # fixed-point: sample where the surface came from
            dd = cv2.remap(d, xs, ys, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
            xs = X - ox * (dd - focus) * z; ys = Y - oy * (dd - focus) * z
        im = cv2.remap(base, xs, ys, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
        p.stdin.write(np.clip(im, 0, 255).astype(np.uint8).tobytes())
    p.stdin.close(); p.wait()


def video_frames(path, start, dur, speed=1.0):
    """Decode a clip to RGB frames at FPS (sped up by `speed`), returns (frames, w, h)."""
    w, h = [int(v) for v in subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
            "stream=width,height", "-of", "csv=p=0", path], capture_output=True, text=True).stdout.strip().split(",")[:2]]
    raw = subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-ss", f"{start}", "-t", f"{dur * speed + 0.2}", "-i", path,
                          "-vf", f"setpts=PTS/{speed},fps={FPS}", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], capture_output=True).stdout
    fr = np.frombuffer(raw, np.uint8).reshape(-1, h, w, 3)
    n = int(dur * FPS)
    if len(fr) < n:
        fr = np.concatenate([fr, np.repeat(fr[-1:], n - len(fr), 0)])
    return fr[:n], w, h


def fit_in(im, w, h):
    s = min(w / im.width, h / im.height)
    return im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.LANCZOS)


def img2vid(spec, out):
    """Still image -> generated video. inset: video fills the card, the input photo sits beside it.
    side: input on the left, result on the right (for image-to-3D turntables)."""
    sp = spec.get("speed", 1.0)
    frames, vw, vh = video_frames(spec["video"], spec.get("in", 0), spec["dur"], sp)
    photo = Image.open(spec["image"]).convert("RGBA")
    fl = ImageFont.truetype(FONT, 30)
    layout = spec.get("layout", "inset")
    first = Image.fromarray(frames[0])
    if layout == "side":
        pw = (CW - 3 * 24) // 2; ph = CH - 2 * 110
        bgc = tuple(spec.get("bg", (18, 18, 22)))
        base = Image.new("RGB", (CW, CH), bgc); d = ImageDraw.Draw(base)
        pin = fit_in(photo, pw, ph)
        panel = Image.new("RGB", (pw, ph), (0, 0, 0)); panel.paste(pin, ((pw - pin.width) // 2, (ph - pin.height) // 2), pin)
        base.paste(panel, (24, 110))
        label(d, (24 + pw / 2, 30), spec.get("label_in", "1 IMAGE"), 32, (255, 255, 255), (0, 0, 0), "c")
        label(d, (48 + pw + pw / 2, 30), spec.get("label_out", "3D MODEL"), 32, (0, 0, 0), (255, 226, 0), "c")
        ar = ImageFont.truetype(FONT, 60); d.text((CW / 2 - 18, CH / 2 - 44), "›", font=ar, fill=(255, 226, 0))
        p = writer(out)
        for f in frames:
            im = base.copy(); v = fit_in(Image.fromarray(f), pw, ph)
            im.paste(v, (48 + pw + (pw - v.width) // 2, 110 + (ph - v.height) // 2))
            p.stdin.write(im.tobytes())
        p.stdin.close(); p.wait(); return
    # inset layout: video contained in the card with a blurred fill; photo inset at the left
    bg = contain(first)                     # only for size reference
    iw = spec.get("inset_w", 230); pin = fit_in(photo, iw, int(iw * 1.9))
    p = writer(out)
    for k, f in enumerate(frames):
        im = contain(Image.fromarray(f)); d = ImageDraw.Draw(im)
        x0, y0 = 26, CH - pin.height - 92
        d.rounded_rectangle((x0 - 6, y0 - 6, x0 + pin.width + 6, y0 + pin.height + 6), 16, fill=(255, 226, 0))
        im.paste(pin.convert("RGB"), (x0, y0))
        label(d, (x0 + pin.width / 2, y0 + pin.height + 14), spec.get("label_in", "THE PHOTO"), 26, (0, 0, 0), (255, 226, 0), "c")
        if spec.get("timer"):
            sec = spec.get("in", 0) + k / FPS * sp
            tt = f"{int(sec // 60)}:{int(sec % 60):02d}"
            if spec.get("timer_total"):
                tt += " / " + spec["timer_total"]
            label(d, (CW - 26 - fl.getlength(tt) - 28, 26), tt, 30, (255, 255, 255), (200, 20, 20))
        if spec.get("speed_tag") and sp != 1:
            label(d, (CW - 160, CH - 80), f"{sp:g}x speed", 26, (255, 255, 255), (0, 0, 0))
        p.stdin.write(im.tobytes())
    p.stdin.close(); p.wait()


def checker(w, h, c=28, a=(58, 58, 64), b=(40, 40, 46)):
    yy, xx = np.mgrid[0:h, 0:w]
    m = ((xx // c + yy // c) % 2)[..., None]
    return Image.fromarray(np.where(m, np.array(a, np.uint8), np.array(b, np.uint8)).astype(np.uint8))


def cutout(spec, out):
    """Original photo -> a scan line removes the background -> the cut-out on a checkerboard (-> a new background)."""
    src = Image.open(spec["image"]).convert("RGB"); cut = Image.open(spec["cut"]).convert("RGBA").resize(src.size)
    box = spec.get("box"); fit = spec.get("fit", "contain")
    def card(im):
        if box:
            im = im.crop([int(v) for v in (fit_box(box) if fit == "cover" else box)])
        s = (max if fit == "cover" else min)(CW / im.width, CH / im.height)
        im = im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.LANCZOS)
        if fit == "cover":
            l, t = (im.width - CW) // 2, (im.height - CH) // 2; return im.crop((l, t, l + CW, t + CH)), (0, 0)
        return im, ((CW - im.width) // 2, (CH - im.height) // 2)
    a, off = card(src); c, _ = card(cut)
    chk = checker(CW, CH)
    newbg = contain(Image.open(spec["bg"]).convert("RGB")) if spec.get("bg") else None
    n = int(spec.get("dur", 3.6) * FPS); t1, t2 = spec.get("hold", 0.5), spec.get("hold", 0.5) + spec.get("scan", 1.1)
    p = writer(out)
    for fr in range(n):
        t = fr / FPS
        after = chk.copy() if newbg is None or t < t2 + 0.6 else Image.blend(chk, newbg, min(1, (t - t2 - 0.6) / 0.5))
        after.paste(c, off, c)
        before = (contain(src) if fit == "contain" and not box else Image.new("RGB", (CW, CH)))
        if fit != "contain" or box:
            before.paste(a, off)
        else:
            before.paste(a, off)
        y = int(CH * ease((t - t1) / (t2 - t1)))
        im = after.copy(); im.paste(before.crop((0, y, CW, CH)), (0, y))
        d = ImageDraw.Draw(im)
        if 0 < y < CH:
            d.rectangle((0, y - 3, CW, y + 3), fill=(255, 226, 0))
        p.stdin.write(im.tobytes())
    p.stdin.close(); p.wait()


def grid(spec, out):
    """Batch: a grid of photos; each cell flips to its cut-out in turn ("the whole folder")."""
    pairs = spec["pairs"]; cols = spec.get("cols", 4); rows = math.ceil(len(pairs) / cols)
    g = 10; cw = (CW - (cols + 1) * g) // cols; ch = (CH - (rows + 1) * g) // rows
    cells = []
    for a, b in pairs:
        A = Image.open(a).convert("RGB"); B = Image.open(b).convert("RGBA").resize(A.size)
        s = max(cw / A.width, ch / A.height); size = (math.ceil(A.width * s), math.ceil(A.height * s))
        A = A.resize(size, Image.LANCZOS); B = B.resize(size, Image.LANCZOS)
        l, t = (size[0] - cw) // 2, (size[1] - ch) // 2
        A = A.crop((l, t, l + cw, t + ch)); B = B.crop((l, t, l + cw, t + ch))
        C = checker(cw, ch, 14); C.paste(B, (0, 0), B); cells.append((A, C))
    n = int(spec.get("dur", 4) * FPS); start, stag = spec.get("start", 0.6), spec.get("stagger", 0.14)
    p = writer(out)
    for fr in range(n):
        t = fr / FPS; im = Image.new("RGB", (CW, CH), (12, 12, 14))
        for i, (A, C) in enumerate(cells):
            x, y = g + (i % cols) * (cw + g), g + (i // cols) * (ch + g)
            k = min(1, max(0, (t - start - i * stag) / 0.18))
            if k <= 0:
                im.paste(A, (x, y))
            elif k >= 1:
                im.paste(C, (x, y))
            else:                                        # flip: squash the old cell, then grow the new one
                w = max(1, int(cw * abs(1 - 2 * k))); src = A if k < 0.5 else C
                im.paste(src.resize((w, ch)), (x + (cw - w) // 2, y))
        p.stdin.write(im.tobytes())
    p.stdin.close(); p.wait()


def mux_audio(video, audio, out, offset=0.0):
    run(["ffmpeg", "-v", "error", "-y", "-i", video, "-itsoffset", f"{offset}", "-i", audio, "-map", "0:v", "-map", "1:a",
         "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-af", "apad", "-shortest", out])


def voice(spec, out):
    """A voice sample as a card: name tag, the sentence, and a waveform that lights up as it plays."""
    import soundfile as sf
    a, sr = sf.read(spec["wav"], dtype="float32", always_2d=True); a = a.mean(1)
    pad = spec.get("pad", 0.45); dur = len(a) / sr + 2 * pad; n = int(dur * FPS)
    hop = int(sr / FPS); env = np.array([np.sqrt(np.mean(a[i * hop:(i + 1) * hop] ** 2) + 1e-12) for i in range(len(a) // hop + 1)])
    env = env / (env.max() + 1e-9)
    nb = 46; bw = 14; gx = (CW - nb * (bw + 6)) // 2
    bars = np.interp(np.linspace(0, len(env) - 1, nb), np.arange(len(env)), np.convolve(env, np.ones(3) / 3, "same"))
    fn = ImageFont.truetype(FONT, 64); fd = ImageFont.truetype(FONT, 34); ft = ImageFont.truetype(FONT, 40)
    import textwrap
    lines = textwrap.wrap(spec.get("text", ""), 34)
    p = writer(out)
    for fr in range(n):
        t = fr / FPS - pad; pos = t / (len(a) / sr)
        im = Image.new("RGB", (CW, CH), tuple(spec.get("bg", (16, 16, 22)))); d = ImageDraw.Draw(im)
        nm = spec.get("name", ""); d.text(((CW - fn.getlength(nm)) / 2, 90), nm, font=fn, fill=(255, 226, 0))
        ds = spec.get("desc", ""); d.text(((CW - fd.getlength(ds)) / 2, 180), ds, font=fd, fill=(200, 200, 200))
        live = env[min(len(env) - 1, max(0, int(t * FPS)))] if 0 <= t <= len(a) / sr else 0
        for i, b in enumerate(bars):
            h = 16 + 230 * b * (0.55 + 0.45 * live)
            on = 0 <= pos and i / nb <= pos
            x = gx + i * (bw + 6)
            d.rounded_rectangle((x, 430 - h / 2, x + bw, 430 + h / 2), 6, fill=(255, 226, 0) if on else (90, 90, 100))
        y = 610
        for ln in lines:
            d.text(((CW - ft.getlength(ln)) / 2, y), ln, font=ft, fill=(255, 255, 255)); y += 54
        p.stdin.write(im.tobytes())
    p.stdin.close(); p.wait()
    tmp = out + ".v.mp4"; import os; os.replace(out, tmp)
    mux_audio(tmp, spec["wav"], out, pad); os.remove(tmp)


def subs(spec, out):
    """Clip with its own audio and live, word-by-word subtitles from a faster-whisper JSON."""
    import os
    frames, vw, vh = video_frames(spec["video"], spec["in"], spec["dur"])
    js = json.load(open(spec["words"]))
    words = [w for s in js["segments"] for w in s["words"]]
    fs = ImageFont.truetype(FONT, spec.get("size", 46)); ftg = ImageFont.truetype(FONT, 26)
    box = spec.get("box")
    p = writer(out)
    for k, f in enumerate(frames):
        t = spec["in"] + k / FPS
        fim = Image.fromarray(f)
        im = contain(fim.crop(box) if box else fim); d = ImageDraw.Draw(im)
        said = [w for w in words if w[0] <= t and w[0] >= t - spec.get("window", 3.2)]
        # keep the last ~2 lines of what has been said
        txt = "".join(w[2] for w in said).strip()
        import textwrap
        lines = textwrap.wrap(txt, spec.get("wrap", 30))[-2:]
        y = CH - 70 - len(lines) * 62
        for ln in lines:
            w = fs.getlength(ln)
            d.rounded_rectangle(((CW - w) / 2 - 16, y - 4, (CW + w) / 2 + 16, y + 58), 10, fill=(0, 0, 0))
            d.text(((CW - w) / 2, y), ln, font=fs, fill=(255, 255, 255)); y += 62
        if spec.get("tag"):
            label(d, (24, 24), spec["tag"], 26, (0, 0, 0), (255, 226, 0))
        p.stdin.write(im.tobytes())
    p.stdin.close(); p.wait()
    tmp = out + ".v.mp4"; os.replace(out, tmp)
    run(["ffmpeg", "-v", "error", "-y", "-i", tmp, "-ss", f"{spec['in']}", "-t", f"{spec['dur']}", "-i", spec["video"],
         "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", out])
    os.remove(tmp)


def browser(spec, out):
    """Screenshots of a page inside a minimal browser frame whose address bar shows the real URL at each step."""
    import os
    st = json.load(open(spec["steps"]))["steps"][spec.get("from", 0): spec.get("to")]
    mono = os.path.join(os.path.dirname(os.path.abspath(__file__)), "fonts", "DejaVuSansMono.ttf")
    fm = ImageFont.truetype(mono if os.path.exists(mono) else "DejaVuSansMono.ttf", 29)
    top = 150; cpl = 54
    p = writer(out)
    for i, s in enumerate(st):
        im = Image.new("RGB", (CW, CH), (32, 33, 38)); d = ImageDraw.Draw(im)
        for k, c in enumerate([(255, 95, 87), (254, 188, 46), (40, 200, 64)]):
            d.ellipse((22 + k * 30, 18, 40 + k * 30, 36), fill=c)
        d.rounded_rectangle((18, 48, CW - 18, top - 10), 14, fill=(18, 18, 22))
        url = s["url"].replace("https://", "")
        host, _, h = url.partition("#")
        full = host + ("#" + h if _ else "")
        lines = [full[j:j + cpl] for j in range(0, len(full), cpl)][:2]
        if len(full) > 2 * cpl:
            lines[1] = lines[1][:-1] + "…"
        y = 56 if len(lines) > 1 else 72
        n_host = len(host)
        for ln_i, ln in enumerate(lines):
            x = 34; off = ln_i * cpl
            for j, ch in enumerate(ln):
                col = (235, 235, 235) if off + j < n_host else (255, 226, 0)
                d.text((x, y), ch, font=fm, fill=col); x += fm.getlength(ch)
            y += 38
        shot = Image.open(s["img"]).convert("RGB")
        shot = shot.resize((CW, round(shot.height * CW / shot.width)), Image.LANCZOS)
        im.paste(shot.crop((0, 0, CW, CH - top)), (0, top))
        if s.get("tag") == "reopen" and spec.get("reopen_tag"):
            label(d, (CW - 24 - ImageFont.truetype(FONT, 28).getlength(spec["reopen_tag"]) - 28, top + 18), spec["reopen_tag"], 28)
        hold = spec.get("last_hold", 1.2) if i == len(st) - 1 else spec.get("each", 0.1)
        for _ in range(max(1, round(hold * FPS))):
            p.stdin.write(im.tobytes())
    p.stdin.close(); p.wait()


if __name__ == "__main__":
    kind, spec, out = sys.argv[1], json.load(open(sys.argv[2])), sys.argv[3]
    {"pip": pip, "crop": crop, "wipe": wipe, "kenburns": kenburns, "flip": flip, "parallax": parallax, "img2vid": img2vid,
     "cutout": cutout, "grid": grid, "voice": voice, "subs": subs, "browser": browser}[kind](spec, out)
    print(out)
