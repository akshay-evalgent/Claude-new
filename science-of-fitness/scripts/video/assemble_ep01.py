"""Assemble Episode 1 from Google Flow shots onto the voiceover.

    python3 scripts/video/assemble_ep01.py [--shots DIR] [--scenes 1-3] [--out FILE]

For every shot in flow/shots.json:
  * if DIR/<ID>.mp4 exists (e.g. 03A.mp4), it is fitted to the shot's window: played at normal
    speed and trimmed if long; slowed down to 0.75x at most if short, then held on its last frame
    with a slow push-in;
  * otherwise the window falls back to the first-cut visuals (scripts/video/ep01_video.py).
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
    clips = {}
    used = 0
    for s in shots:
        path = os.path.join(ARGS.shots, s["id"] + ".mp4")
        if os.path.exists(path):
            clips[s["id"]] = Fitted(path); used += 1
    for fi in range(f0, f1):
        g = fi / FPS
        cur = shots[0]
        for s in shots:
            if s["start"] <= g + 1e-6:
                cur = s
        lt = g - cur["start"]
        win = cur["end"] - cur["start"]
        fr = None
        if cur["id"] in clips:
            img = clips[cur["id"]].frame(lt, win)
            if img is not None:
                fr = img.copy()
                overlay(fr, cur["overlay"], lt)
        if fr is None:  # fallback: first-cut visuals for this moment
            fr = v.frame(sc, g - scene["start"], scene["end"] - scene["start"])
        p.stdin.write(fr.convert("RGB").tobytes())
    p.stdin.close(); p.wait()
    return sc, used, len(shots)


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
