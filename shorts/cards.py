#!/usr/bin/env python3
"""Original graphic clips for tutorial Shorts (1030x900, used as breakdown.py sources).

    python3 cards.py terminal spec.json out.mp4   # replay of a real terminal session
    python3 cards.py prompt   spec.json out.mp4   # "copy this prompt" card
    python3 cards.py result   spec.json out.mp4   # result/checklist card, items appear one by one

Specs:
  terminal: {"title": "~/voice-notes", "commands": [{"cmd": "python transcribe.py memo.wav",
             "output": "full real output text"}], "dur": 7}
  prompt:   {"label": "PROMPT · copy this", "text": "multi-line prompt", "dur": 5}
  result:   {"label": "RESULT", "sections": [{"head": "Today", "items": ["...", "..."]}], "dur": 5,
             "reveal": true}
Only replay output that a command really printed.
"""
import json
import subprocess
import sys
import textwrap

from PIL import Image, ImageDraw, ImageFont

CW, CH, FPS = 1030, 900, 30
MONO = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"
MONO_B = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf"
SANS = __import__("os").path.join(__import__("os").path.dirname(__file__), "fonts", "OpenSans-ExtraBold.ttf")
SANS_R = __import__("os").path.join(__import__("os").path.dirname(__file__), "fonts", "OpenSans-Bold.ttf")
BG, PANEL, GREEN, YELLOW, WHITE, GREY = (14, 16, 22), (28, 31, 40), (80, 220, 120), (255, 226, 0), (235, 235, 235), (140, 145, 160)


def writer(out, dur):
    return subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{CW}x{CH}",
                             "-r", str(FPS), "-i", "-", "-c:v", "libx264", "-crf", "16", "-pix_fmt", "yuv420p", out],
                            stdin=subprocess.PIPE), int(dur * FPS)


def window(title):
    im = Image.new("RGB", (CW, CH), BG); d = ImageDraw.Draw(im)
    d.rounded_rectangle((30, 30, CW - 30, CH - 30), 26, fill=PANEL)
    d.rounded_rectangle((30, 30, CW - 30, 96), 26, fill=(40, 44, 56)); d.rectangle((30, 70, CW - 30, 96), fill=(40, 44, 56))
    for i, c in enumerate([(255, 95, 86), (255, 189, 46), (39, 201, 63)]):
        d.ellipse((60 + i * 34, 52, 80 + i * 34, 72), fill=c)
    f = ImageFont.truetype(MONO, 22); d.text(((CW - f.getlength(title)) / 2, 50), title, font=f, fill=GREY)
    return im


def terminal(spec, out):
    dur = spec.get("dur", 7); p, n = writer(out, dur)
    f = ImageFont.truetype(MONO, 27); fb = ImageFont.truetype(MONO_B, 27); lh = 38
    # build the full list of (kind, text) lines
    lines = []
    for c in spec["commands"]:
        lines.append(("cmd", c["cmd"]))
        for para in c.get("output", "").split("\n"):
            wrapped = textwrap.wrap(para, 52) or [""]
            lines += [("out", w) for w in wrapped]
    type_frames = int(0.045 * FPS * len(spec["commands"][0]["cmd"]) / 1.6)
    for fr in range(n):
        im = window(spec.get("title", "Terminal")); d = ImageDraw.Draw(im); y = 120
        shown_out = max(0, int((fr - type_frames - 8) / 2.2))      # output lines appear after typing
        out_seen = 0
        for kind, txt in lines:
            if kind == "cmd":
                k = min(len(txt), int(fr * 1.6)) if fr < type_frames + 1 else len(txt)
                d.text((60, y), "$", font=fb, fill=GREEN); d.text((90, y), txt[:k], font=fb, fill=WHITE)
                if fr < type_frames + 6 and (fr // 8) % 2 == 0:
                    d.rectangle((90 + f.getlength(txt[:k]) + 4, y + 4, 90 + f.getlength(txt[:k]) + 18, y + 32), fill=WHITE)
            else:
                if out_seen >= shown_out:
                    break
                col = YELLOW if txt.startswith("[") else WHITE
                d.text((60, y), txt, font=f, fill=col); out_seen += 1
            y += lh
            if y > CH - 70:
                break
        p.stdin.write(im.tobytes())
    p.stdin.close(); p.wait()


def prompt(spec, out):
    dur = spec.get("dur", 5); p, n = writer(out, dur)
    im = Image.new("RGB", (CW, CH), BG); d = ImageDraw.Draw(im)
    d.rounded_rectangle((30, 30, CW - 30, CH - 30), 30, fill=PANEL, outline=YELLOW, width=4)
    fl = ImageFont.truetype(SANS, 34); d.text((70, 62), spec.get("label", "PROMPT · copy this"), font=fl, fill=YELLOW)
    f = ImageFont.truetype(MONO, 34); y = 140
    for para in spec["text"].split("\n"):
        for w in (textwrap.wrap(para, 44) or [""]):
            d.text((70, y), w, font=f, fill=WHITE); y += 50
    for fr in range(n):
        p.stdin.write(im.tobytes())
    p.stdin.close(); p.wait()


def result(spec, out):
    dur = spec.get("dur", 5); p, n = writer(out, dur)
    fl = ImageFont.truetype(SANS, 34); fh = ImageFont.truetype(SANS, 36); fi = ImageFont.truetype(SANS_R, 34)
    items = []
    for s in spec["sections"]:
        items.append(("head", s["head"]))
        items += [("item", it) for it in s["items"]]
    for fr in range(n):
        im = Image.new("RGB", (CW, CH), (250, 250, 247)); d = ImageDraw.Draw(im)
        d.text((60, 50), spec.get("label", "RESULT"), font=fl, fill=(120, 120, 120))
        k = len(items) if not spec.get("reveal", True) else int(fr / (n * 0.7 / len(items))) + 1
        y = 120
        for kind, txt in items[:k]:
            if kind == "head":
                y += 14; d.text((60, y), txt, font=fh, fill=(20, 20, 20)); y += 54
            else:
                d.rounded_rectangle((66, y + 8, 94, y + 36), 6, outline=(60, 60, 60), width=3)
                d.text((112, y), txt, font=fi, fill=(40, 40, 40)); y += 52
        p.stdin.write(im.tobytes())
    p.stdin.close(); p.wait()


if __name__ == "__main__":
    kind, spec, out = sys.argv[1], json.load(open(sys.argv[2])), sys.argv[3]
    {"terminal": terminal, "prompt": prompt, "result": result}[kind](spec, out)
    print(out)
