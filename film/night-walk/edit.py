"""Cut the POV film: timeline, synced sound, grade, 2.39:1 bars, dissolves.

python edit.py SHOTS.json WORKDIR OUT.mp4
Uses WORKDIR/hf/<id>_ltx.mp4 (AI clip with handheld added) when present, else WORKDIR/<id>.mp4.
"""
import json
import os
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from pov import footfalls  # noqa: E402

X = 0.3  # dissolve length
GRADE = ("eq=contrast=1.07:saturation=1.06:gamma=0.98,"
         "curves=r='0/0 0.5/0.49 1/1':b='0/0.03 0.5/0.52 1/1',"
         "vignette=PI/4.5,noise=alls=9:allf=t,crop=1920:804:0:138,pad=1920:1080:0:138:black,setsar=1,format=yuv420p")


def probe(p):
    return float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                                          "-of", "default=nw=1:nk=1", p], text=True))


def main(shots_path, work, out):
    shots = json.load(open(shots_path))["shots"]
    clips = []
    for s in shots:
        ltx = os.path.join(work, "hf", f"{s['id']}_ltx.mp4")
        path, walk = (ltx, [[0, 1], [99, 1]]) if os.path.exists(ltx) else (os.path.join(work, f"{s['id']}.mp4"), s["walk"])
        clips.append(dict(s, path=path, walk=walk, dur=min(probe(path), s["seconds"]), ai=path == ltx))
    starts, t = [], 0.0
    for c in clips:
        starts.append(t)
        t += c["dur"] - X
    total = t + X
    steps = []
    for c, st in zip(clips, starts):
        kind = "gravel" if "lake" in c["id"] else "grass"
        for f in footfalls(c["walk"], c["dur"]):
            tt = st + f
            if tt < total - 0.2 and all(abs(tt - s0) > 0.3 for s0, _ in steps):
                steps.append((tt, kind))
    stars = [[st + s["t"], s["dur"], s["from"][0] / 960 - 1, s["to"][0] / 960 - 1]
             for c, st in zip(clips, starts) for s in c.get("stars", [])]
    s5 = clips[-1]
    stop = next((k[0] for k in s5["walk"] if k[1] == 0), None)
    tl = dict(duration=total, steps=sorted(steps), stars=stars, reveal=starts[1] + 1.0,
              exhale=starts[-1] + stop + 0.1 if stop is not None else None)
    tl_path = os.path.join(work, "timeline.json")
    json.dump(tl, open(tl_path, "w"), indent=1)
    wav = os.path.join(work, "sound.wav")
    subprocess.run([sys.executable, os.path.join(os.path.dirname(os.path.abspath(__file__)), "audio.py"), tl_path, wav], check=True)

    cmd = ["ffmpeg", "-v", "error", "-y"]
    for c in clips:
        cmd += ["-i", c["path"]]
    cmd += ["-i", wav]
    parts = [f"[{i}:v]trim=0:{c['dur']:.4f},setpts=PTS-STARTPTS,fps=24,{GRADE}[v{i}]" for i, c in enumerate(clips)]
    last, acc = "v0", clips[0]["dur"]
    for i in range(1, len(clips)):
        parts.append(f"[{last}][v{i}]xfade=transition=fade:duration={X}:offset={acc - X:.4f}[x{i}]")
        last, acc = f"x{i}", acc + clips[i]["dur"] - X
    parts.append(f"[{last}]fade=t=in:st=0:d=0.7,fade=t=out:st={total - 1.0:.3f}:d=1.0[v]")
    parts.append(f"[{len(clips)}:a]loudnorm=I=-16:TP=-1.5:LRA=9,alimiter=limit=0.8:level=false,atrim=0:{total:.3f}[a]")
    cmd += ["-filter_complex", ";".join(parts), "-map", "[v]", "-map", "[a]", "-c:v", "libx264", "-preset", "slow",
            "-crf", "21", "-maxrate", "16M", "-bufsize", "32M", "-tune", "grain", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-movflags", "+faststart", out]
    subprocess.run(cmd, check=True)
    print("film", out, f"{total:.2f}s", "shots:", [(c["id"], round(c["dur"], 2), "AI video" if c["ai"] else "cpu") for c in clips],
          f"{len(steps)} footsteps")


if __name__ == "__main__":
    main(*sys.argv[1:4])
