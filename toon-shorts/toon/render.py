"""Render an episode script into a vertical short (1080x1920 mp4).

    python -m toon.render episodes/entry_level.py            # full render
    python -m toon.render episodes/entry_level.py --stills   # contact sheet only
"""
import argparse
import copy
import importlib.util
import json
import math
import os
import random
import subprocess
import sys
import time

import cairo
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

from . import audio
from .character import Character
from .draw import ease, hexc, lin_grad, pil_to_surface, rad_grad, set_c
from .sets import render_background, draw_foreground, BG_RECT, DESK_Y

W, H = 1080, 1920
FONT = "/usr/share/fonts/opentype/inter/Inter-ExtraBold.otf"
FACE_Y = -166  # world y of a character's face centre (neck base at 0)


# ------------------------------------------------------------------ text sprites
def text_sprite(text, size, width=900, stroke=8, fill=(255, 255, 255, 255), shadow=True):
    font = ImageFont.truetype(FONT, size)
    words, lines, cur = text.split(), [], ""
    probe = ImageDraw.Draw(Image.new("RGBA", (10, 10)))
    for wd in words:
        trial = (cur + " " + wd).strip()
        if probe.textlength(trial, font=font) > width and cur:
            lines.append(cur)
            cur = wd
        else:
            cur = trial
    lines.append(cur)
    lh = int(size * 1.18)
    pad = stroke + 18
    tw = int(max(probe.textlength(l, font=font) for l in lines)) + pad * 2
    th = lh * len(lines) + pad * 2
    img = Image.new("RGBA", (tw, th), (0, 0, 0, 0))
    if shadow:
        sh = Image.new("RGBA", (tw, th), (0, 0, 0, 0))
        d = ImageDraw.Draw(sh)
        for i, l in enumerate(lines):
            lw = probe.textlength(l, font=font)
            d.text(((tw - lw) / 2, pad + i * lh + 6), l, font=font, fill=(0, 0, 0, 120),
                   stroke_width=stroke, stroke_fill=(0, 0, 0, 120))
        img.alpha_composite(sh.filter(ImageFilter.GaussianBlur(5)))
    d = ImageDraw.Draw(img)
    for i, l in enumerate(lines):
        lw = probe.textlength(l, font=font)
        d.text(((tw - lw) / 2, pad + i * lh), l, font=font, fill=fill, stroke_width=stroke,
               stroke_fill=(20, 16, 24, 255))
    return pil_to_surface(img), tw, th


# ------------------------------------------------------------------ timeline
def load_episode(path):
    spec = importlib.util.spec_from_file_location("episode", path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod.EPISODE


def build_timeline(ep, fps):
    cast = ep["cast"]
    state = {k: dict(v.get("start", {})) for k, v in cast.items()}
    for k, v in state.items():
        v.setdefault("expr", "neutral")
        v.setdefault("pose", "rest")
        v.setdefault("facing", 1)
        v.setdefault("x", 0)
        v.setdefault("visible", True)
    beats, t = [], 0.0
    for i, b in enumerate(ep["beats"]):
        b = dict(b)
        for key in ("expr", "pose", "facing", "x", "visible"):
            for who, val in b.get(key, {}).items():
                state[who][key] = val
        snap = copy.deepcopy(state)
        speech, env, lead = None, None, 0.0
        pad_in, pad_out = b.get("pad", (0.12, 0.28))
        if "say" in b:
            who, text = b["say"]
            print(f"  voice  {who:10s} {text}", file=sys.stderr)
            speech = audio.tts(text, cast[who]["voice"])
            env = audio.envelope(speech, fps)
            lead = pad_in + b.get("delay", 0.0)
            dur = lead + len(speech) / audio.SR + pad_out
            dur = max(dur, b.get("dur", 0))
        else:
            dur = b.get("dur", 1.0)
        beats.append(dict(i=i, start=t, dur=dur, b=b, state=snap, speech=speech, env=env, lead=lead))
        # moves leave characters at their destination
        for who, mv in b.get("move", {}).items():
            state[who]["x"] = mv[1]
        t += dur
    return beats, t


# ------------------------------------------------------------------ camera
def shot_camera(shot, st):
    """Return (cx, cy, zoom) in world units for a shot spec."""
    if shot == "wide":
        return (0.0, -250.0, 0.84)
    if shot == "two":
        return (0.0, -200.0, 0.96)
    if shot[0] == "at":
        return tuple(shot[1:4])
    kind, who = shot[0], shot[1]
    x = st[who]["x"]
    HEAD_Y = FACE_Y + st[who].get("face_dy", 0)
    f = 1 if st[who]["facing"] >= 0 else -1
    if kind == "cu":
        z = 1.5
        return (x + f * 70, HEAD_Y + (960 - 840) / z, z)
    if kind == "mcu":
        z = 1.15
        return (x + f * 80, HEAD_Y + (960 - 780) / z, z)
    if kind == "ecu":
        z = 2.3
        return (x + f * 30, HEAD_Y + (960 - 900) / z, z)
    raise ValueError(shot)


def camera_at(beat, lt):
    b = beat["b"]
    if b.get("card"):
        return None
    st = beat["state"]
    cx, cy, z = shot_camera(b.get("shot", "wide"), st)
    p = ease(lt / max(beat["dur"], 1e-3), "inout")
    push = b.get("push", 1.035)
    if "pan" in b:
        p = ease(max(0.0, lt - b.get("pan_delay", 0.0)) / max(beat["dur"] - b.get("pan_delay", 0.0), 1e-3), "inout")
    z = z * (1 + (push - 1) * p)
    if "pan" in b:
        dx, dy = b["pan"]
        cx += dx * p
        cy += dy * p
    punch = b.get("punch", 0)
    if punch:
        k = math.exp(-lt * 9) * (1 - math.exp(-lt * 60))
        z *= 1 + punch * k
    sh = b.get("shake", 0)
    if sh:
        a = sh * math.exp(-lt * 5)
        cx += math.sin(lt * 53) * a / z
        cy += math.cos(lt * 47) * a / z
    return cx, cy, z


# ------------------------------------------------------------------ renderer
class Renderer:
    def __init__(self, ep, fps=24):
        self.ep = ep
        self.fps = fps
        self.chars = {k: Character(v["look"]) for k, v in ep["cast"].items()}
        self.order = ep.get("draw_order", list(ep["cast"].keys()))
        print("painting set ...", file=sys.stderr)
        self.bg, self.bg_scale = render_background(ep["set"], blur=ep.get("bg_blur", 5.0))
        self.bg_sharp = None
        if any(b.get("rack_focus") for b in ep["beats"]):
            self.bg_sharp, _ = render_background(ep["set"], blur=0)
        self.beats, self.total = build_timeline(ep, fps)
        self.captions = {}
        rnd = random.Random(3)
        self.blinks = {k: self._blink_times(rnd) for k in ep["cast"]}
        self.wm = text_sprite(ep.get("brand", "Side Quest"), 50, stroke=0, fill=(255, 255, 255, 215), shadow=True)
        self.vignette = self._vignette()

    def _blink_times(self, rnd):
        ts, t = [], rnd.uniform(0.5, 2.0)
        while t < 600:
            ts.append(t)
            t += rnd.uniform(2.2, 4.8)
        return np.array(ts)

    def _vignette(self):
        s = cairo.ImageSurface(cairo.FORMAT_ARGB32, W, H)
        c = cairo.Context(s)
        g = cairo.RadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.75)
        g.add_color_stop_rgba(0, 0, 0, 0, 0)
        g.add_color_stop_rgba(1, 0.1, 0.05, 0.15, 0.32)
        c.set_source(g)
        c.paint()
        return s

    def caption(self, text):
        if text not in self.captions:
            self.captions[text] = text_sprite(text, 60, width=880, stroke=8)
        return self.captions[text]

    def beat_at(self, t):
        for bt in self.beats:
            if bt["start"] <= t < bt["start"] + bt["dur"]:
                return bt
        return self.beats[-1]

    def char_state(self, who, beat, lt, t):
        st = dict(beat["state"][who])
        b = beat["b"]
        if who in b.get("move", {}):
            x0, x1, *rest = b["move"][who]
            opts = rest[0] if rest else {}
            t0, t1 = opts.get("t0", 0.0), opts.get("t1", beat["dur"])
            p = (lt - t0) / max(t1 - t0, 1e-3)
            p = max(0.0, min(1.0, p))
            st["x"] = x0 + (x1 - x0) * ease(p, opts.get("ease", "linear"))
            walking = 0 < p < 1
            if walking and opts.get("walk", True):
                st["bob"] = -abs(math.sin(lt * opts.get("cadence", 9.0))) * opts.get("bob", 16)
                st["swing"] = opts.get("swing", 1.0)
        mouth = 0.0
        if beat["speech"] is not None and b["say"][0] == who:
            fi = int((lt - beat["lead"]) * self.fps)
            if 0 <= fi < len(beat["env"]):
                mouth = float(beat["env"][fi])
        st["mouth"] = mouth
        # blink: 4-frame close/open
        bl = self.blinks[who]
        k = np.searchsorted(bl, t) - 1
        blink = 0.0
        if k >= 0:
            d = t - bl[k]
            if d < 0.17:
                blink = 1.0 - abs(d - 0.085) / 0.085 * 0.6
                blink = 1.0 if blink > 0.75 else 0.5
        st["blink"] = blink
        st["t"] = t + hash(who) % 7
        for key, val in b.get("override", {}).get(who, {}).items():
            st[key] = val
        return st

    def frame(self, t):
        surf = cairo.ImageSurface(cairo.FORMAT_ARGB32, W, H)
        ctx = cairo.Context(surf)
        beat = self.beat_at(t)
        lt = t - beat["start"]
        b = beat["b"]
        if b.get("card"):
            self._card(ctx, b["card"], lt, beat["dur"])
        else:
            cam = camera_at(beat, lt)
            cx, cy, z = cam
            ctx.save()
            ctx.translate(W / 2, H / 2)
            ctx.scale(z, z)
            ctx.translate(-cx, -cy)
            # background (parallax: slightly less movement than the action plane)
            ctx.save()
            x0, y0, _, _ = BG_RECT
            ctx.translate(x0, y0)
            ctx.scale(1 / self.bg_scale, 1 / self.bg_scale)
            ctx.set_source_surface(self.bg, 0, 0)
            ctx.get_source().set_filter(cairo.FILTER_BILINEAR)
            ctx.paint()
            if b.get("rack_focus") and self.bg_sharp is not None:
                d0 = b.get("pan_delay", 0.0)
                a = ease((lt - d0) / max(beat["dur"] - d0, 1e-3) * 1.4, "inout")
                if a > 0:
                    ctx.set_source_surface(self.bg_sharp, 0, 0)
                    ctx.get_source().set_filter(cairo.FILTER_BILINEAR)
                    ctx.paint_with_alpha(a)
            ctx.restore()
            cast_x = {}
            for who in self.order:
                st = self.char_state(who, beat, lt, t)
                cast_x[who] = st["x"]
                if not st.get("visible", True):
                    continue
                ctx.save()
                ctx.translate(st["x"], st.get("bob", 0) + st.get("y", 0))
                s = st.get("scale", 1.0)
                ctx.scale(s, s)
                self.chars[who].draw(ctx, st)
                ctx.restore()
            draw_foreground(self.ep["set"], ctx, t, cast_x)
            ctx.restore()
            ctx.set_source_surface(self.vignette, 0, 0)
            ctx.paint()
            # flash on impact
            if b.get("flash"):
                a = max(0.0, 1 - lt / 0.18) * 0.7
                if a > 0:
                    ctx.set_source_rgba(1, 1, 1, a)
                    ctx.paint()
        # caption
        text = b.get("caption", b["say"][1] if "say" in b else None)
        if text:
            spr, tw, th = self.caption(text)
            k = ease(min(1.0, lt / 0.12), "back")
            s = 0.86 + 0.14 * k
            ctx.save()
            ctx.translate(W / 2, self.ep.get("caption_y", 300) + th / 2)
            ctx.scale(s, s)
            ctx.set_source_surface(spr, -tw / 2, -th / 2)
            ctx.paint_with_alpha(min(1.0, lt / 0.06))
            ctx.restore()
        spr, tw, th = self.wm
        ctx.set_source_surface(spr, W - tw - 28, 44)
        ctx.paint()
        surf.flush()
        return surf

    def _card(self, ctx, text, lt, dur):
        ctx.set_source_rgb(0.06, 0.05, 0.08)
        ctx.paint()
        spr, tw, th = self.caption("​" + text) if False else text_sprite(text, 84, stroke=0)
        a = min(1.0, lt / 0.25) * min(1.0, (dur - lt) / 0.25)
        ctx.set_source_surface(spr, (W - tw) / 2, (H - th) / 2)
        ctx.paint_with_alpha(max(0.0, a))

    # -------------------------------------------------------------- audio
    def mix(self, path):
        m = audio.Mixer(self.total)
        m.add(audio.room_tone(self.total), 0, 1.0)
        for bt in self.beats:
            if bt["speech"] is not None:
                m.add(bt["speech"], bt["start"] + bt["lead"], 1.0)
            for s in bt["b"].get("sfx", []):
                name, off = s[0], s[1]
                gain = s[2] if len(s) > 2 else 0.6
                m.add(audio.SFX[name](), bt["start"] + off, gain)
        m.write(path, self.total)

    # -------------------------------------------------------------- outputs
    def render(self, out_mp4, workdir):
        os.makedirs(workdir, exist_ok=True)
        wav = os.path.join(workdir, "mix.wav")
        self.mix(wav)
        silent = os.path.join(workdir, "video.mp4")
        n = int(round(self.total * self.fps))
        print(f"rendering {n} frames ({self.total:.2f}s @ {self.fps}fps)", file=sys.stderr)
        p = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "bgra",
                              "-s", f"{W}x{H}", "-r", str(self.fps), "-i", "-",
                              "-c:v", "libx264", "-preset", "medium", "-crf", "18",
                              "-pix_fmt", "yuv420p", "-tune", "animation", silent], stdin=subprocess.PIPE)
        t0 = time.time()
        for i in range(n):
            surf = self.frame(i / self.fps)
            p.stdin.write(bytes(surf.get_data()))
            if i % 48 == 0:
                print(f"  frame {i}/{n}  {time.time() - t0:.0f}s", file=sys.stderr)
        p.stdin.close()
        p.wait()
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", silent, "-i", wav,
                        "-af", "loudnorm=I=-14:TP=-1.5:LRA=11", "-ar", "48000",
                        "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest",
                        "-movflags", "+faststart", out_mp4], check=True)
        print(f"wrote {out_mp4}", file=sys.stderr)

    def still(self, t, path):
        self.frame(t).write_to_png(path)

    def contact_sheet(self, path, cols=5):
        mids = [bt["start"] + min(bt["dur"] * 0.6, bt["dur"] - 0.05) for bt in self.beats]
        thumbs = []
        for t in mids:
            img = Image.frombuffer("RGBA", (W, H), bytes(self.frame(t).get_data()), "raw", "BGRA", 0, 1)
            thumbs.append(img.convert("RGB").resize((W // 4, H // 4)))
        rows = math.ceil(len(thumbs) / cols)
        sheet = Image.new("RGB", (cols * W // 4 + (cols + 1) * 8, rows * H // 4 + (rows + 1) * 8), (30, 30, 30))
        for i, im in enumerate(thumbs):
            sheet.paste(im, (8 + (i % cols) * (W // 4 + 8), 8 + (i // cols) * (H // 4 + 8)))
        sheet.save(path, quality=88)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("episode")
    ap.add_argument("--out", default=None)
    ap.add_argument("--fps", type=int, default=24)
    ap.add_argument("--stills", action="store_true", help="only write a contact sheet")
    ap.add_argument("--at", type=float, nargs="*", help="write stills at these times")
    a = ap.parse_args()
    ep = load_episode(a.episode)
    slug = ep.get("slug", os.path.splitext(os.path.basename(a.episode))[0])
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    outdir = os.path.join(root, "out", slug)
    os.makedirs(outdir, exist_ok=True)
    r = Renderer(ep, a.fps)
    print(f"timeline {r.total:.2f}s, {len(r.beats)} beats", file=sys.stderr)
    with open(os.path.join(outdir, "timeline.json"), "w") as fh:
        json.dump([dict(beat=bt["i"], start=round(bt["start"], 3), dur=round(bt["dur"], 3),
                        line=bt["b"].get("say", [None, bt["b"].get("card")])[1]) for bt in r.beats], fh, indent=1)
    if a.at:
        for t in a.at:
            r.still(t, os.path.join(outdir, f"still_{t:05.2f}.png"))
    if a.stills:
        r.contact_sheet(os.path.join(outdir, "sheet.jpg"))
        return
    if not a.at:
        r.contact_sheet(os.path.join(outdir, "sheet.jpg"))
        r.render(a.out or os.path.join(outdir, f"{slug}.mp4"), os.path.join(root, ".cache", "work", slug))


if __name__ == "__main__":
    main()
