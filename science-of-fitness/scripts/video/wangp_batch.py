"""Build a WanGP batch file from Episode 1's shot list, for unattended generation (e.g. on a free Kaggle GPU).

    python3 scripts/video/wangp_batch.py [--set hero|tier1|tier2|all|03A,11B,...] [--model 5b|14b]
                                         [--res 1280x704] [--keyframes DIR] [--grids DIR] [--media DIR]
                                         [--skip-existing DIR] [--out wangp-queue.json]

Then run it headless inside a WanGP checkout:

    python wgp.py --process wangp-queue.json --output-dir OUT --profile 4 --attention sdpa --fp16

Each shot becomes one WanGP task:
  * image-to-video when the shot has a start image: KEYFRAMES/<shot>.png|jpg|webp, or its panel cut from a storyboard
    sheet GRIDS/G0N.png (flow/GRIDS.md). The start image keeps the characters consistent from shot to shot.
  * text-to-video otherwise. Every prompt already spells out the characters (flow/CHARACTER-SHEET.md) and the style.
Outputs are named ep01_<shot>.mp4. `collect` renames them to <shot>.mp4 for scripts/video/assemble_ep01.py:

    python3 scripts/video/wangp_batch.py collect OUT DEST
"""
import argparse, glob, json, math, os, re, shutil, sys

HERE = os.path.dirname(os.path.abspath(__file__))
FLOW = os.path.join(HERE, "..", "..", "episodes", "ep01-skinny-to-bulky", "flow")
WANGP_SETTINGS_VERSION = 2.83  # matches the pinned WanGP commit in the Kaggle notebook

# Wan 2.2 models that fit a free 16 GB T4.
MODELS = {
    # 5B text+image-to-video with the FastWan 3-step LoRA: fits a T4 and its 29 GB of RAM comfortably.
    "5b": dict(model_type="ti2v_2_2_fastwan", fps=24, max_frames=121, res="1280x704", text=True),
    # 14B image-to-video, Lightning 4-step: better motion, but needs a start image and is tight on Kaggle's RAM.
    "14b": dict(model_type="i2v_2_2_Enhanced_Lightning_v2", fps=16, max_frames=81, res="832x480", text=False),
}

NEGATIVE = ("text, captions, subtitles, letters, numbers, watermark, logo, signature, photorealistic, photo, 3d render, "
            "cgi, blurry, low quality, jpeg artifacts, flicker, deformed face, distorted body, extra fingers, extra limbs, "
            "fused fingers, bad hands, muscular skinny guy, static frame")


def load_json(name, explicit=None):
    for p in ([explicit] if explicit else []) + [os.path.join(HERE, name), os.path.join(FLOW, name)]:
        if p and os.path.exists(p):
            return json.load(open(p))
    return []


def pick(shots, which):
    hero = ["03A", "03C", "11A", "11B", "12A", "13A", "20B", "24B", "29B", "34B"]
    if which == "all":
        return shots
    if which == "hero":
        return [s for s in shots if s["id"] in hero]
    if which.startswith("tier"):
        n = int(which[4:])
        return [s for s in shots if s["tier"] <= n]
    ids = [x.strip().upper() for x in which.split(",") if x.strip()]
    missing = set(ids) - {s["id"] for s in shots}
    if missing:
        sys.exit(f"unknown shot ids: {', '.join(sorted(missing))}")
    return [s for s in shots if s["id"] in ids]


def frames_for(seconds, fps, max_frames):
    """Wan wants 4n+1 frames. Clips longer than the model allows are slowed and held by the assembler."""
    n = max(33, math.ceil(seconds * fps))
    return min(max_frames, 4 * math.ceil((n - 1) / 4) + 1)


def find_image(folder, stem):
    if not folder:
        return None
    for ext in (".png", ".jpg", ".jpeg", ".webp"):
        p = os.path.join(folder, stem + ext)
        if os.path.exists(p):
            return p
    return None


def start_image(shot, args, grids, w, h):
    """A start frame for the shot, written to args.media as <shot>.png, or None."""
    from PIL import Image
    from panels import cut_panel, cover
    src = find_image(args.keyframes, shot["id"])
    if src:
        im = Image.open(src).convert("RGB")
    else:
        g = next(((g, k) for g in grids for k, sid in enumerate(g["shots"]) if sid == shot["id"]), None)
        gp = g and find_image(args.grids, g[0]["id"])
        if not gp:
            return None
        im = cut_panel(gp, g[1], g[0].get("rows", 3), g[0].get("cols", 3))
    os.makedirs(args.media, exist_ok=True)
    out = os.path.abspath(os.path.join(args.media, shot["id"] + ".png"))
    cover(im, w, h).save(out)
    return out


def prompt_for(shot):
    """The shot's Flow prompt (it already holds the character descriptions and style), on one line: WanGP splits
    multi-line prompts into separate tasks. Audio lines are dropped since Wan makes silent clips."""
    p = " ".join(shot["prompt"].split())
    return p.replace(" No speech, music or sound effects.", "").replace(
        " Mouth moving as if talking, but no audible speech.", " Mouth moving as if talking.")


def build(args):
    model = MODELS[args.model]
    res = args.res or model["res"]
    w, h = (int(x) for x in res.lower().split("x"))
    shots = pick(load_json("shots.json", args.shots), args.set)
    grids = load_json("grids.json", args.grids_json)
    done = set()
    for d in args.skip_existing or []:
        for f in glob.glob(os.path.join(d, "**", "*.mp4"), recursive=True):
            m = re.match(r"(?:ep01_)?(\d\d[A-Z])\b", os.path.basename(f))
            if m and os.path.getsize(f) > 0:
                done.add(m.group(1))
    tasks, report = [], []
    for i, s in enumerate(shots):
        if s["id"] in done:
            report.append((s["id"], "skip (already made)"))
            continue
        img = start_image(s, args, grids, w, h)
        m = model
        if img is None and not model["text"]:
            m = MODELS["5b"]  # the 14B model needs a start image
        if m is not model:
            mw, mh = (int(x) for x in m["res"].split("x"))
        else:
            mw, mh = w, h
        t = {
            "settings_version": WANGP_SETTINGS_VERSION,
            "model_type": m["model_type"],
            "prompt": prompt_for(s),
            "negative_prompt": NEGATIVE,
            "resolution": f"{mw}x{mh}",
            "video_length": frames_for(s["end"] - s["start"], m["fps"], m["max_frames"]),
            "seed": args.seed + i,
            "repeat_generation": 1,
            "prompt_enhancer": "",
            "image_prompt_type": "S" if img else "T",
            "output_filename": f"ep01_{s['id']}",
        }
        if img:
            t["image_start"] = img
        tasks.append(t)
        report.append((s["id"], f"{'image' if img else 'text'}-to-video, {m['model_type']}, {t['resolution']}, "
                                f"{t['video_length']} frames ({t['video_length'] / m['fps']:.1f} s)"))
    tasks.sort(key=lambda t: t["model_type"])  # one model load per model
    json.dump(tasks, open(args.out, "w"), indent=1, ensure_ascii=False)
    for sid, r in report:
        print(f"  {sid}: {r}")
    print(f"wrote {args.out}: {len(tasks)} tasks")


def collect(src, dest):
    """Copy WanGP outputs ep01_<shot>[ (n)].mp4 to DEST/<shot>.mp4 (newest wins)."""
    os.makedirs(dest, exist_ok=True)
    best = {}
    for f in glob.glob(os.path.join(src, "**", "ep01_*.mp4"), recursive=True):
        m = re.match(r"ep01_(\d\d[A-Z])\b", os.path.basename(f))
        if m and (m.group(1) not in best or os.path.getmtime(f) > os.path.getmtime(best[m.group(1)])):
            best[m.group(1)] = f
    for sid, f in sorted(best.items()):
        shutil.copy2(f, os.path.join(dest, sid + ".mp4"))
    print(f"copied {len(best)} clips to {dest}: {' '.join(sorted(best))}")


def main():
    if len(sys.argv) > 1 and sys.argv[1] == "collect":
        if len(sys.argv) != 4:
            sys.exit("usage: wangp_batch.py collect WANGP_OUTPUT_DIR DEST_DIR")
        return collect(sys.argv[2], sys.argv[3])
    ap = argparse.ArgumentParser(description="Build a WanGP batch file from Episode 1's shots.")
    ap.add_argument("--set", default="hero", help="hero (10 shots), tier1 (28), tier2 (69), all (73), or ids like 03A,11B")
    ap.add_argument("--model", default="5b", choices=sorted(MODELS))
    ap.add_argument("--res", default=None, help="WIDTHxHEIGHT; default 1280x704 for 5b, 832x480 for 14b")
    ap.add_argument("--keyframes", default=None, help="folder of start images named <shot>.png")
    ap.add_argument("--grids", default=None, help="folder of storyboard sheets named G01.png ... G09.png")
    ap.add_argument("--media", default="wangp-media", help="where the start images for WanGP are written")
    ap.add_argument("--skip-existing", action="append", help="skip shots that already have a clip in this folder (repeatable)")
    ap.add_argument("--shots", default=None, help="shots.json (default: next to this script, then flow/)")
    ap.add_argument("--grids-json", default=None)
    ap.add_argument("--seed", type=int, default=1000)
    ap.add_argument("--out", default="wangp-queue.json")
    build(ap.parse_args())


if __name__ == "__main__":
    main()
