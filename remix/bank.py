#!/usr/bin/env python3
"""Query the analysed sources while writing a remix.

usage:
  bank.py WORK lines [SRC]                 every line (optionally one source)
  bank.py WORK find REGEX                  lines whose text matches (case-insensitive)
  bank.py WORK words SRC LINE              word-by-word timings of one line (for 'words: [a, b]')
  bank.py WORK quiet [SRC] [--min 1.0]     shots with (almost) no dialogue: reactions, cutaways
  bank.py WORK shot SRC SHOT               one shot: times and what is said in it
  bank.py WORK strip SRC T0 T1 [--n 6]     a strip of frames across a time range (writes a jpg)
"""
import argparse
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from remixlib import font_path, load_work, parse_time, run, tc  # noqa: E402


def fmt_line(name, ln):
    flag = "?" if ln["conf"] < 0.6 else " "
    return f"{name}:L{ln['id']:03d}{flag} {tc(ln['s'])}–{tc(ln['e'])} ({ln['e'] - ln['s']:.1f}s)  {ln['text']}"


def strip(src, t0, t1, n, out):
    from PIL import Image, ImageDraw, ImageFont

    fp = font_path()
    f = ImageFont.truetype(fp, 16) if fp else ImageFont.load_default()
    frames = []
    tmp = out + ".parts"
    os.makedirs(tmp, exist_ok=True)
    for k in range(n):
        t = t0 + (t1 - t0) * (k + 0.5) / n
        p = os.path.join(tmp, f"{k:02d}.jpg")
        run(["ffmpeg", "-y", "-v", "error", "-ss", f"{t:.3f}", "-i", src["meta"]["path"], "-frames:v", "1",
             "-vf", "scale=360:-2", p])
        frames.append((t, p))
    ims = [Image.open(p) for _, p in frames]
    w, h = ims[0].size
    sheet = Image.new("RGB", (w * n, h + 26), (15, 15, 15))
    d = ImageDraw.Draw(sheet)
    for k, ((t, _), im) in enumerate(zip(frames, ims)):
        sheet.paste(im, (k * w, 26))
        d.text((k * w + 6, 4), tc(t, 2), fill=(255, 200, 90), font=f)
    sheet.save(out, quality=88)
    for _, p in frames:
        os.remove(p)
    os.rmdir(tmp)
    return out


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("work")
    ap.add_argument("cmd", choices=["lines", "find", "words", "quiet", "shot", "strip"])
    ap.add_argument("args", nargs="*")
    ap.add_argument("--min", type=float, default=1.0)
    ap.add_argument("--n", type=int, default=6)
    ap.add_argument("--out", default=None)
    a = ap.parse_args()
    srcs = load_work(a.work)
    if not srcs:
        sys.exit(f"no analysed sources in {a.work} — run analyze.py first")

    def need(name):
        if name not in srcs:
            sys.exit(f"unknown source {name!r}; have: {', '.join(srcs)}")
        return srcs[name]

    if a.cmd == "lines":
        names = a.args[:1] or list(srcs)
        for n in names:
            for ln in need(n)["lines"]:
                print(fmt_line(n, ln))
    elif a.cmd == "find":
        rx = re.compile(" ".join(a.args), re.I)
        for n, s in srcs.items():
            for ln in s["lines"]:
                if rx.search(ln["text"]):
                    print(fmt_line(n, ln))
    elif a.cmd == "words":
        s = need(a.args[0])
        lid = int(str(a.args[1]).lstrip("Ll"))
        ln = next(x for x in s["lines"] if x["id"] == lid)
        print(fmt_line(a.args[0], ln))
        for i, w in enumerate(ln["words"]):
            print(f"  [{i:2d}] {w['s']:8.2f}–{w['e']:8.2f}  p={w['p']:.2f}  {w['w']}")
    elif a.cmd == "quiet":
        for n in (a.args[:1] or list(srcs)):
            for sh in need(n)["shots"]:
                if sh["talk"] < 0.15 and sh["dur"] >= a.min:
                    print(f"{n}:S{sh['id']:03d}  {tc(sh['s'])}–{tc(sh['e'])}  {sh['dur']:.1f}s  {sh['still']}")
    elif a.cmd == "shot":
        s = need(a.args[0])
        sid = int(str(a.args[1]).lstrip("Ss"))
        sh = next(x for x in s["shots"] if x["id"] == sid)
        print(f"{a.args[0]}:S{sid:03d}  {tc(sh['s'])}–{tc(sh['e'])}  {sh['dur']:.2f}s  talk {sh['talk']:.0%}")
        for lid in sh["lines"]:
            print("   ", fmt_line(a.args[0], next(x for x in s["lines"] if x["id"] == lid)))
    elif a.cmd == "strip":
        s = need(a.args[0])
        t0, t1 = parse_time(a.args[1]), parse_time(a.args[2])
        out = a.out or os.path.join(a.work, f"strip-{a.args[0]}-{t0:.1f}-{t1:.1f}.jpg")
        print(strip(s, t0, t1, a.n, out))


if __name__ == "__main__":
    main()
