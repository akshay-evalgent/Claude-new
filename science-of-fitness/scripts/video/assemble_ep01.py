"""Assemble Episode 1 from Google Flow shots onto the voiceover.

    python3 scripts/video/assemble_ep01.py [--shots DIR] [--scenes 1-3] [--out FILE]

For every moment of the voiceover it uses the best footage available, in this order:
  1. DIR/<shot>.mp4      a single-shot clip (e.g. 03A.mp4), fitted to the shot's window
  2. DIR/<block>.mp4     a multi-shot clip (e.g. B07.mp4, see flow/MULTISHOT.md), fitted to the block's window
  3. DIR/<grid>.png      a 3x3 storyboard sheet (e.g. G02.png, see flow/GRIDS.md): the shot's panel is
                         cut out, upscaled and animated with a slow push-in and drift
  4. the first-cut visuals (scripts/video/ep01_video.py)
Clips are played at normal speed and trimmed if long, or slowed to 0.75x at most and then held on
their last frame with a slow push-in if short.
Then the shot's overlay (one key number) is added, and everything is joined with the voiceover.
"""
import argparse, json, os, shutil, subprocess, sys
from multiprocessing import Pool
from PIL import Image, ImageDraw
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import ep01_video as v

EP = v.EP
FPS, W, H = v.FPS, v.W, v.H
SHOTS = json.load(open(os.path.join(EP, "flow", "shots.json")))
BLOCKS = json.load(open(os.path.join(EP, "flow", "blocks.json"))) if os.path.exists(os.path.join(EP, "flow", "blocks.json")) else []
GRIDS = json.load(open(os.path.join(EP, "flow", "grids.json"))) if os.path.exists(os.path.join(EP, "flow", "grids.json")) else []
PANEL_OF = {sid: (g["id"], k) for g in GRIDS for k, sid in enumerate(g["shots"])}
ARGS = None


def probe(path):
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path],
                         capture_output=True, text=True).stdout.strip()
    return float(out or 0)


class Fitted:
    """A Flow clip scaled to fill 1920x1080 (cropping if needed), streamed frame by frame (requests only move forward)."""

    def __init__(self, path):
        self.dur = probe(path)
        vf = f"scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},fps={FPS}"
        self.p = subprocess.Popen(["ffmpeg", "-loglevel", "error", "-i", path, "-vf", vf, "-an", "-f", "rawvideo",
                                   "-pix_fmt", "rgba", "-"], stdout=subprocess.PIPE)
        self.i, self.last, self.ended = -1, None, False

    def _read_to(self, idx):
        while not self.ended and self.i < idx:
            b = self.p.stdout.read(W * H * 4)
            if len(b) < W * H * 4:
                self.ended = True; break
            self.last = b; self.i += 1

    def frame(self, t, window):
        speed = 1.0 if window <= self.dur else max(self.dur / window, 0.75)
        idx = int(t * speed * FPS)
        self._read_to(idx)
        if self.last is None:
            return None
        img = Image.frombuffer("RGBA", (W, H), self.last, "raw", "RGBA", 0, 1)
        if not self.ended or idx <= self.i:
            return img
        hold = t - (self.i + 1) / FPS / speed
        z = 1 + 0.02 * max(0.0, hold)  # slow push-in while holding the last frame
        big = img.resize((int(W * z), int(H * z)), Image.BILINEAR)
        x0, y0 = (big.width - W) // 2, (big.height - H) // 2
        return big.crop((x0, y0, x0 + W, y0 + H))


def find_grid(gid):
    for ext in (".png", ".jpg", ".jpeg", ".webp"):
        p = os.path.join(ARGS.shots, gid + ext)
        if os.path.exists(p):
            return p
    return None


def trim_gutters(im):
    """Cut light gutters/borders off a panel crop."""
    import numpy as np
    a = np.asarray(im.convert("L")).astype(np.float32)
    rows = np.flatnonzero(a.mean(1) < 200); cols = np.flatnonzero(a.mean(0) < 200)
    if len(rows) < a.shape[0] * 0.5 or len(cols) < a.shape[1] * 0.5:
        return im
    return im.crop((cols[0], rows[0], cols[-1] + 1, rows[-1] + 1))


class Still:
    """One storyboard panel, upscaled to cover 1920x1080 and animated with a slow push-in and drift."""

    def __init__(self, grid_path, k, seed):
        g = Image.open(grid_path).convert("RGB")
        cw, ch = g.width / 3, g.height / 3
        r, c = divmod(k, 3)
        ix, iy = cw * 0.02, ch * 0.02
        cell = g.crop((int(c * cw + ix), int(r * ch + iy), int((c + 1) * cw - ix), int((r + 1) * ch - iy)))
        cell = trim_gutters(cell)
        s = max(W / cell.width, H / cell.height) * 1.1
        self.base = cell.resize((int(cell.width * s), int(cell.height * s)), Image.LANCZOS)
        self.dir = (-1) ** seed

    def frame(self, t, window):
        p = min(1.0, t / max(window, 0.1))
        bw, bh = self.base.size
        w = min(bw, bh * W / H) / (1.0 + 0.07 * p)  # 16:9 crop that slowly tightens (push-in)
        h = w * H / W
        x0 = (bw - w) / 2 + self.dir * (bw - w) / 2 * (p - 0.5) * 0.8  # gentle sideways drift
        y0 = (bh - h) / 2
        return self.base.crop((int(x0), int(y0), int(x0 + w), int(y0 + h))).resize((W, H), Image.BILINEAR).convert("RGBA")


def overlay(fr, text, t):
    if not text:
        return
    p = v.ap(t, 0.6, 0.4)
    if p <= 0:
        return
    sp = v.chip(text, v.TEAL, (10, 12, 16), 44)
    v.put(fr, sp, 80, H - 90 + (1 - p) * 20, p, "lb")


def render_scene(sc):
    shots = [s for s in SHOTS if s["scene"] == sc]
    scene = v.SCENES[sc]
    f0, f1 = round(scene["start"] * FPS), round(scene["end"] * FPS)
    out = os.path.join(EP, "flow", "_seg", f"seg-{sc:02d}.mp4")
    p = subprocess.Popen(["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}",
                          "-r", str(FPS), "-i", "-", "-c:v", "libx264", "-preset", "veryfast", "-crf", "19", "-pix_fmt", "yuv420p",
                          out], stdin=subprocess.PIPE)
    v.loop_clips(sc)
    clips, stills, bclips = {}, {}, {}
    used = 0
    for i, s in enumerate(shots):
        path = os.path.join(ARGS.shots, s["id"] + ".mp4")
        if os.path.exists(path):
            clips[s["id"]] = Fitted(path); used += 1
        elif s["id"] in PANEL_OF:
            gp = find_grid(PANEL_OF[s["id"]][0])
            if gp:
                stills[s["id"]] = Still(gp, PANEL_OF[s["id"]][1], i); used += 1
    myblocks = [b for b in BLOCKS if b["start"] < scene["end"] and b["end"] > scene["start"]
                and os.path.exists(os.path.join(ARGS.shots, b["id"] + ".mp4"))]
    for fi in range(f0, f1):
        g = fi / FPS
        cur = shots[0]
        for s in shots:
            if s["start"] <= g + 1e-6:
                cur = s
        lt = g - cur["start"]
        win = cur["end"] - cur["start"]
        fr = None
        if cur["id"] in clips:  # 1. a single-shot clip
            img = clips[cur["id"]].frame(lt, win)
            if img is not None:
                fr = img.copy()
        if fr is None:  # 2. a multi-shot block covering this moment
            for b in myblocks:
                if b["start"] <= g < b["end"]:
                    if b["id"] not in bclips:
                        bclips[b["id"]] = Fitted(os.path.join(ARGS.shots, b["id"] + ".mp4"))
                    img = bclips[b["id"]].frame(g - b["start"], b["end"] - b["start"])
                    if img is not None:
                        fr = img.copy()
                    break
        if fr is None and cur["id"] in stills:  # 3. an animated storyboard panel
            fr = stills[cur["id"]].frame(lt, win)
        if fr is not None:
            overlay(fr, cur["overlay"], lt)
        if fr is None:  # fallback: first-cut visuals for this moment
            fr = v.frame(sc, g - scene["start"], scene["end"] - scene["start"])
        p.stdin.write(fr.convert("RGB").tobytes())
    p.stdin.close(); p.wait()
    return sc, used + len(myblocks), len(shots)


def main():
    global ARGS
    ap = argparse.ArgumentParser()
    ap.add_argument("--shots", default=os.path.join(EP, "flow", "shots"))
    ap.add_argument("--scenes", default="1-34")
    ap.add_argument("--out", default=os.path.join(EP, "video", "ep01-flow-cut.mp4"))
    ARGS = ap.parse_args()
    a, b = (int(x) for x in ARGS.scenes.split("-"))
    scenes = list(range(a, b + 1))
    seg = os.path.join(EP, "flow", "_seg"); os.makedirs(seg, exist_ok=True)
    total_used = 0
    with Pool(4, initializer=_init, initargs=(ARGS,)) as pool:
        for sc, used, n in pool.imap_unordered(render_scene, sorted(scenes, key=lambda s: -(v.SCENES[s]["end"] - v.SCENES[s]["start"]))):
            total_used += used
            print(f"scene {sc}: {used}/{n} Flow shots", flush=True)
    lst = os.path.join(seg, "list.txt")
    with open(lst, "w") as f:
        for sc in scenes:
            f.write(f"file 'seg-{sc:02d}.mp4'\n")
    start, end = v.SCENES[a]["start"], v.SCENES[b]["end"]
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", lst,
                    "-ss", f"{start:.3f}", "-t", f"{end - start:.3f}", "-i", os.path.join(EP, "audio", "vo-full.flac"),
                    "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart",
                    "-shortest", ARGS.out], check=True)
    shutil.rmtree(seg)
    print(f"wrote {ARGS.out} using {total_used} Flow shots", flush=True)


def _init(args):
    global ARGS
    ARGS = args


if __name__ == "__main__":
    main()
