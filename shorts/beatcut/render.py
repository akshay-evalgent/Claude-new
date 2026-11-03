"""Render a beat-locked vertical short from an episode spec.

    python3 -m beatcut.render episodes/artemis-i                # full render
    python3 -m beatcut.render episodes/artemis-i --stills       # one still per shot, fast
    python3 -m beatcut.render episodes/artemis-i --bpm 140      # re-time the whole edit to another tempo

Everything is timed in beats, not seconds, so the same spec re-renders onto any
song's tempo. The beat grid drives:
  - cuts            every shot starts on a downbeat
  - camera          zoom punch on each beat, a twist on the backbeat in the drop,
                    rumble through the build, a big hit when the drop lands
  - transitions     punch / whip / zoom / flash, sound-designed with whooshes
  - captions        words pop in on 8th notes, the block bounces on the beat

Outputs (in <episode>/out/):
  short.mp4            picture + original placeholder track + sound design
  short_app_sound.mp4  picture + sound design only: upload this one and add the
                       trending sound in the YouTube Shorts editor (licensed there)
"""
import argparse
import json
import math
import subprocess
from pathlib import Path

import cv2
import numpy as np

from . import beatmap as bmap
from . import music
from .text import Caption, hex_bgr

ENERGY = {"intro": 0.45, "build": 0.6, "drop": 1.0, "break": 0.3, "rise": 0.55}


# ---------------------------------------------------------------- source frames

def probe(path):
    out = subprocess.check_output(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
                                   "stream=width,height,r_frame_rate", "-of", "json", str(path)])
    s = json.loads(out)["streams"][0]
    n, d = (int(x) for x in s["r_frame_rate"].split("/"))
    return s["width"], s["height"], n / d


class ClipReader:
    """Sequential frame reader: get(t) returns the source frame at clip time t
    (t must not go backwards). Frames come straight from an ffmpeg pipe."""

    def __init__(self, path, start, max_h=2160):
        self.w, self.h, self.fps = probe(path)
        vf = []
        if self.h > max_h:
            nw = int(self.w * max_h / self.h) // 2 * 2
            vf = ["-vf", f"scale={nw}:{max_h}"]
            self.w, self.h = nw, max_h
        self.start = start
        self.proc = subprocess.Popen(["ffmpeg", "-v", "error", "-ss", f"{start:.3f}", "-i", str(path), *vf,
                                      "-f", "rawvideo", "-pix_fmt", "bgr24", "-"], stdout=subprocess.PIPE,
                                     bufsize=self.w * self.h * 3 * 2)
        self.k = -1
        self.frame = None
        self.size = self.w * self.h * 3

    def _read(self):
        buf = self.proc.stdout.read(self.size)
        if len(buf) < self.size:
            return False
        self.frame = np.frombuffer(buf, np.uint8).reshape(self.h, self.w, 3)
        self.k += 1
        return True

    def get(self, t):
        target = int(math.floor((t - self.start) * self.fps + 1e-6))
        while self.k < target:
            if not self._read():
                break
        if self.frame is None:
            self._read()
        return self.frame

    def close(self):
        self.proc.kill()
        self.proc.wait()
        self.proc.stdout.close()


# ---------------------------------------------------------------- helpers

def smoothstep(x):
    x = min(max(x, 0.0), 1.0)
    return x * x * (3 - 2 * x)


def ease_out(x):
    x = min(max(x, 0.0), 1.0)
    return 1 - (1 - x) ** 3


def ease_in(x):
    x = min(max(x, 0.0), 1.0)
    return x ** 3


def lerp(a, b, x):
    return a + (b - a) * x


def affine(cx, cy, s, theta_deg, ox, oy):
    """Matrix mapping source point (cx, cy) to output (ox, oy), scaled by s and rotated."""
    th = math.radians(theta_deg)
    c, si = math.cos(th) * s, math.sin(th) * s
    return np.array([[c, -si, ox - (c * cx - si * cy)], [si, c, oy - (si * cx + c * cy)]], np.float32)


class Look:
    """One grade over every clip so footage from different cameras reads as one film."""

    def __init__(self, W, H, seed=3):
        yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
        r2 = ((xx - W / 2) / (W / 2)) ** 2 * 0.6 + ((yy - H / 2) / (H / 2)) ** 2
        self.vig = (1 - 0.32 * np.clip(r2, 0, 1.6) ** 1.4)[:, :, None].astype(np.float32)
        rng = np.random.default_rng(seed)
        self.grain = [cv2.resize(rng.normal(0, 1, (H // 2, W // 2)).astype(np.float32), (W, H))[:, :, None]
                      for _ in range(6)]

    def apply(self, img, f, exposure=1.0, contrast=1.08, sat=1.12, grain=4.0, chroma=0.0, flash=0.0):
        x = img.astype(np.float32) * (exposure / 255.0)
        luma = x @ np.array([0.114, 0.587, 0.299], np.float32)
        x = luma[:, :, None] + (x - luma[:, :, None]) * sat
        x = (x - 0.5) * contrast + 0.5
        x = x * self.vig
        if chroma > 0.3:
            # radial chromatic split: red pushed out, blue pulled in
            H, W = x.shape[:2]
            for ch, k in ((2, 1), (0, -1)):
                s = 1 + k * chroma / (W / 2)
                M = affine(W / 2, H / 2, s, 0, W / 2, H / 2)
                x[:, :, ch] = cv2.warpAffine(x[:, :, ch], M, (W, H), borderMode=cv2.BORDER_REFLECT101)
        x = x + self.grain[f % len(self.grain)] * (grain / 255.0)
        if flash > 0:
            x = x + (1.0 - x) * flash
        return np.clip(x * 255.0, 0, 255).astype(np.uint8)


# ---------------------------------------------------------------- timeline

def build_timeline(spec, bm):
    bpb = bm["beats_per_bar"]
    beats = bm["beats"]
    spb = 60.0 / bm["bpm"]
    # section of every bar
    bar_sec = []
    for s in spec["sections"]:
        for k in range(s["bars"]):
            bar_sec.append((s["name"], k, s["bars"]))
    shots, b = [], 0
    for sh in spec["shots"]:
        n = sh["beats"]
        t0 = beats[b] if b < len(beats) else bm["end"]
        t1 = beats[b + n] if b + n < len(beats) else bm["end"]
        shots.append(dict(sh, t0=t0, t1=t1, beat0=b))
        b += n
    total_beats = len(bar_sec) * bpb
    if b != total_beats:
        raise SystemExit(f"shots add up to {b} beats, sections to {total_beats}")
    # accent hits: (time, strength, kind) - what the camera reacts to
    hits = []
    for i, t in enumerate(beats):
        bar, pos = divmod(i, bpb)
        name, k, nb = bar_sec[bar]
        if name in ("build", "rise"):
            sub = 1 if pos < 2 else (2 if pos == 2 else 4)
            for j in range(sub):
                hits.append((t + j * spb / sub, 0.55 + 0.45 * (pos + j / sub) / bpb, "roll"))
        elif name == "break":
            if pos == 0:
                hits.append((t, 0.6, "down"))
        else:
            hits.append((t, 1.0 if pos == 0 else 0.7, "down" if pos == 0 else ("back" if pos % 2 else "beat")))
    hits.sort()
    drop_bars = [i for i, (n_, k, _) in enumerate(bar_sec) if n_ == "drop" and k == 0]
    drop_times = [beats[i * bpb] for i in drop_bars]
    return shots, bar_sec, hits, drop_times, spb


def energy_at(t, bm, bar_sec, spb):
    bpb = bm["beats_per_bar"]
    bar = min(len(bar_sec) - 1, max(0, int(t / (spb * bpb))))
    name, k, nb = bar_sec[bar]
    prog = (k + (t - bar * spb * bpb) / (spb * bpb)) / nb
    e = ENERGY[name]
    if name in ("build", "rise"):
        e = lerp(e, 1.0, prog)
    return name, e, prog


def last_hit(t, hits, kinds=None):
    best = None
    for h in hits:
        if h[0] > t + 1e-6:
            break
        if kinds is None or h[2] in kinds:
            best = h
    return best


# ---------------------------------------------------------------- render

def render(ep_dir, stills=False, bpm_override=None, only=None):
    ep = Path(ep_dir)
    spec = json.loads((ep / "spec.json").read_text())
    W, H = spec.get("size", [1080, 1920])
    fps = spec.get("fps", 30)
    style = spec.get("style", {})
    accent = hex_bgr(style.get("accent", "#FFD23F"))
    nbars = sum(s["bars"] for s in spec["sections"])
    mspec = spec["music"]
    song_offset = 0.0
    if mspec.get("track"):
        full = bmap.analyze(ep / mspec["track"])
        bm, song_offset = bmap.window(full, mspec.get("start_bar", 0), nbars)
    else:
        bm = bmap.grid(bpm_override or mspec["bpm"], nbars)
    shots, bar_sec, hits, drop_times, spb = build_timeline(spec, bm)
    dur = bm["end"]
    nframes = int(round(dur * fps))
    out_dir = ep / "out"
    out_dir.mkdir(exist_ok=True)
    look = Look(W, H)
    rng = np.random.default_rng(11)
    ph = rng.uniform(0, 2 * np.pi, 4)

    captions = []
    for sh in shots:
        c = None
        if sh.get("text"):
            c = Caption(sh["text"], sh.get("size", style.get("size", 100)), W - 2 * style.get("margin", 110),
                        accent, kicker=sh.get("kicker"), count=sh.get("count"))
        captions.append(c)

    if stills:
        frames_to_do = [int(((sh["t0"] + sh["t1"]) / 2 + spb * 0.5) * fps) for sh in shots]
        if only is not None:
            frames_to_do = [frames_to_do[i] for i in only]
    else:
        frames_to_do = range(nframes)
        enc = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "bgr24", "-s", f"{W}x{H}",
                                "-r", str(fps), "-i", "-", "-c:v", "libx264", "-preset", "slow",
                                "-crf", str(spec.get("crf", 19)),
                                "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(out_dir / "video.mp4")],
                               stdin=subprocess.PIPE)
    readers = {}
    stills_out = []

    for f in frames_to_do:
        t = f / fps
        si = max(i for i, sh in enumerate(shots) if sh["t0"] <= t + 1e-9) if t >= shots[0]["t0"] else 0
        sh = shots[si]
        nxt = shots[si + 1] if si + 1 < len(shots) else shots[0]  # the edit loops
        D = sh["t1"] - sh["t0"]
        tau = t - sh["t0"]
        x = tau / D
        name, E, prog = energy_at(t, bm, bar_sec, spb)

        # --- source time (supports a linear speed ramp)
        sp = sh.get("speed", 1.0)
        s0, s1 = (sp, sp) if not isinstance(sp, list) else sp
        src_t = sh["in"] + s0 * tau + (s1 - s0) * tau * tau / (2 * D)
        key = si
        if stills:
            rd = ClipReader(ep / "clips" / f"{sh['clip']}.mp4", src_t)
            frame = rd.get(src_t)
            rd.close()
        else:
            if key not in readers:
                for k in list(readers):
                    readers.pop(k).close()
                readers[key] = ClipReader(ep / "clips" / f"{sh['clip']}.mp4", sh["in"])
            frame = readers[key].get(src_t)
        sw, sh_h = frame.shape[1], frame.shape[0]

        # --- camera: base framing
        fx0, fy0 = sh.get("focus", [0.5, 0.5])
        fx1, fy1 = sh.get("focus_to", [fx0, fy0])
        e = smoothstep(x)
        cx, cy = lerp(fx0, fx1, e) * sw, lerp(fy0, fy1, e) * sh_h
        if sh.get("focus_keys"):
            # follow a moving subject: [[clip_time, fx, fy], ...]
            k = np.array(sh["focus_keys"], float)
            cx = float(np.interp(src_t, k[:, 0], k[:, 1])) * sw
            cy = float(np.interp(src_t, k[:, 0], k[:, 2])) * sh_h
        z0, z1 = sh.get("zoom", [1.0, 1.08])
        zoom = lerp(z0, z1, e) * 1.06  # overscan leaves room for shake and twist

        # --- camera: beat reaction
        h = last_hit(t, hits)
        pulse, theta, shake = 0.0, 0.0, 0.0
        flash, chroma = 0.0, 0.0
        if h:
            dt = t - h[0]
            amp = {"intro": 0.035, "build": 0.05, "drop": 0.06, "break": 0.02, "rise": 0.045}[name]
            pulse = amp * h[1] * math.exp(-dt / 0.11)
            if name == "drop":
                shake += 10 * h[1] * math.exp(-dt / 0.09)
                flash += 0.07 * h[1] * math.exp(-dt / 0.06)
                chroma += (3.0 if h[2] == "down" else 1.2) * math.exp(-dt / 0.1)
        hb = last_hit(t, hits, ("back",))
        if hb and name == "drop":
            bar_i = int(hb[0] / (spb * 4))
            sign = 1 if (bar_i + int(hb[0] / spb)) % 2 else -1
            theta += sign * 1.3 * math.exp(-(t - hb[0]) / 0.16)
        if name in ("build", "rise"):
            shake += 2 + 14 * prog ** 2
            theta += 1.2 * prog ** 2 * math.sin(2 * math.pi * 3.1 * t)
        for dt_ in (t - d for d in drop_times):
            if 0 <= dt_ < 1.2:
                shake += 34 * math.exp(-dt_ / 0.3)
                flash += 0.75 * math.exp(-dt_ / 0.09)
                chroma += 9 * math.exp(-dt_ / 0.18)
        shake += sh.get("shake", 0) + 1.5 * E
        dx = shake * (math.sin(2 * math.pi * 7.3 * t + ph[0]) + 0.5 * math.sin(2 * math.pi * 13.7 * t + ph[1])) / 1.5
        dy = shake * (math.sin(2 * math.pi * 6.1 * t + ph[2]) + 0.5 * math.sin(2 * math.pi * 11.3 * t + ph[3])) / 1.5

        # --- transitions
        enter = sh.get("enter", "cut")
        tz, tx, blur_x, radial = 1.0, 0.0, 0, 0.0
        if enter in ("punch", "flash"):
            a = ease_out(tau / 0.2)
            tz *= lerp(1.22, 1.0, a)
            radial = 0.05 * (1 - a) if tau < 0.12 else 0
            if enter == "flash":
                flash += 0.9 * math.exp(-tau / 0.08)
        elif enter == "whip":
            a = ease_out(tau / 0.17)
            tx += lerp(W * 0.45, 0, a)
            blur_x = int(90 * (1 - a))
        elif enter == "zoom":
            a = ease_out(tau / 0.22)
            tz *= lerp(1.6, 1.0, a)
            radial = 0.10 * (1 - a)
        # exits prepare the next shot's entrance
        left = sh["t1"] - t
        nenter = nxt.get("enter", "cut")
        if nenter == "whip" and left < 0.13:
            a = ease_in(1 - left / 0.13)
            tx -= W * 0.45 * a
            blur_x = max(blur_x, int(90 * a))
        elif nenter == "zoom" and left < 0.15:
            a = ease_in(1 - left / 0.15)
            tz *= lerp(1.0, 1.7, a)
            radial = max(radial, 0.12 * a)

        s = max(W / sw, H / sh_h) * zoom * tz * (1 + pulse)
        # keep the crop inside the source (no empty borders)
        hw, hh = W / (2 * s), H / (2 * s)
        cx = min(max(cx, hw), sw - hw) if sw > 2 * hw else sw / 2
        cy = min(max(cy, hh), sh_h - hh) if sh_h > 2 * hh else sh_h / 2
        ox, oy = W / 2 + dx + tx, H / 2 + dy
        if radial > 0.004:
            acc = np.zeros((H, W, 3), np.float32)
            n = 6
            for k in range(n):
                M = affine(cx, cy, s * (1 + radial * k / (n - 1)), theta, ox, oy)
                acc += cv2.warpAffine(frame, M, (W, H), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT101)
            img = (acc / n).astype(np.uint8)
        else:
            M = affine(cx, cy, s, theta, ox, oy)
            img = cv2.warpAffine(frame, M, (W, H), flags=cv2.INTER_CUBIC if stills else cv2.INTER_LINEAR,
                                 borderMode=cv2.BORDER_REFLECT101)
        if blur_x > 2:
            img = cv2.blur(img, (blur_x, 1))

        g = sh.get("grade", {})
        img = look.apply(img, f, exposure=g.get("exposure", 1.0) * (1 + 0.6 * pulse), contrast=g.get("contrast", 1.08),
                         sat=g.get("sat", 1.12), grain=g.get("grain", style.get("grain", 2.5)), chroma=chroma, flash=min(0.9, flash))

        # --- caption, riding a share of the camera motion
        cap = captions[si]
        if cap is not None:
            ty = sh.get("y", style.get("y", 0.27)) * H
            bounce = 1 + 0.5 * pulse
            cval = None
            if sh.get("count"):
                c = sh["count"]
                b0, b1 = c.get("beats", [0, 2])
                cval = lerp(c["from"], c["to"], ease_out((tau - b0 * spb) / ((b1 - b0) * spb)))
            cap.draw(img, W / 2 + 0.4 * (dx + tx), ty + 0.4 * dy, tau - sh.get("text_at", 0) * spb, spb,
                     bounce=bounce, count_value=cval, stagger=sh.get("stagger"))

        if stills:
            stills_out.append((si, img))
        else:
            enc.stdin.write(img.tobytes())

    for r in readers.values():
        r.close()
    if stills:
        for si, img in stills_out:
            cv2.imwrite(str(out_dir / f"still_{si + 1:02d}.jpg"), img, [cv2.IMWRITE_JPEG_QUALITY, 88])
        return
    enc.stdin.close()
    enc.wait()

    # ---------------------------------------------------------- audio
    cuts = [sh["t0"] for sh in shots]
    whoosh_at = [sh["t0"] for sh in shots if sh.get("enter") in ("whip", "zoom")]
    whooshes, sr = music.sound_design(dur, whooshes=whoosh_at)
    # app-sound version: whooshes plus hits on the hook and the drop, kept quiet
    # so the trending sound added in the Shorts editor sits on top
    sfx_only = music.normalize(music.sound_design(dur, whooshes=whoosh_at, impacts=[0.0] + drop_times)[0],
                               target_lufs=-20)
    if mspec.get("track"):
        tmp = out_dir / "track_window.wav"
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{song_offset:.4f}", "-t", f"{dur:.4f}", "-i",
                        str(ep / mspec["track"]), "-ar", str(sr), "-ac", "2", str(tmp)], check=True)
        track = _read_wav(tmp)
    else:
        track, _ = music.compose(bm["bpm"], spec["sections"])
        track = music.normalize(track)
    track = _fit(track, len(whooshes))
    mixed = music.normalize(track + whooshes * 0.5)
    music.write_wav(out_dir / "mix.wav", mixed, sr)
    music.write_wav(out_dir / "sfx.wav", sfx_only, sr)
    for name, wav in (("short.mp4", "mix.wav"), ("short_app_sound.mp4", "sfx.wav")):
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(out_dir / "video.mp4"), "-i", str(out_dir / wav),
                        "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest",
                        "-movflags", "+faststart", str(out_dir / name)], check=True)
    (out_dir / "video.mp4").unlink()
    meta = {"bpm": bm["bpm"], "duration": dur, "cuts": cuts, "drops": drop_times, "song_offset": song_offset,
            "beats": bm["beats"]}
    (out_dir / "timeline.json").write_text(json.dumps(meta, indent=1))
    print(f"wrote {out_dir / 'short.mp4'} and {out_dir / 'short_app_sound.mp4'} ({dur:.2f}s @ {bm['bpm']} bpm)")


def _fit(x, n):
    if len(x) >= n:
        return x[:n]
    return np.concatenate([x, np.zeros((n - len(x),) + x.shape[1:], x.dtype)])


def _read_wav(path):
    import wave
    with wave.open(str(path)) as w:
        a = np.frombuffer(w.readframes(w.getnframes()), "<i2").astype(np.float32) / 32767
        return a.reshape(-1, w.getnchannels())


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("episode")
    ap.add_argument("--stills", action="store_true")
    ap.add_argument("--shots", help="comma list of shot numbers for --stills")
    ap.add_argument("--bpm", type=float)
    a = ap.parse_args()
    only = [int(i) - 1 for i in a.shots.split(",")] if a.shots else None
    render(a.episode, stills=a.stills, bpm_override=a.bpm, only=only)
