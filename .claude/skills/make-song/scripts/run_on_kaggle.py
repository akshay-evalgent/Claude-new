#!/usr/bin/env python3
"""Make a song on Kaggle's free T4 GPU without opening Kaggle.

Builds a batch version of ACE_Step_XL_Free_Kaggle.ipynb (next to this script) with the
song baked in, pushes it to your Kaggle account as a private notebook, waits for the run
to finish, then downloads the mastered MP3s.

Needs the Kaggle CLI (`pip install "kaggle>=2.2,<3"`) and a token in KAGGLE_API_TOKEN
(kaggle.com/settings/api → Generate New Token). The account must be phone-verified
for GPU + internet. Kaggle reuses one notebook slug, so run one song at a time.

    python run_on_kaggle.py --song song.json --out ./song-output
    python run_on_kaggle.py --song song.json --out ./song-output --dry-run   # build only
"""
import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
SOURCE_NOTEBOOK = os.path.join(HERE, "ACE_Step_XL_Free_Kaggle.ipynb")
KERNEL_SLUG = "ace-step-song-runner"  # Kaggle requires the slug to match the slugified title
ACCELERATOR = "NvidiaTeslaT4"
MODELS = ("acestep-v15-xl-turbo", "acestep-v15-xl-sft", "acestep-v15-turbo")
DEFAULT_MODEL = "acestep-v15-turbo"  # the only model verified end to end on Kaggle's T4
LANGUAGES = {"ar", "az", "bg", "bn", "ca", "cs", "da", "de", "el", "en", "es", "fa", "fi", "fr",
             "he", "hi", "hr", "ht", "hu", "id", "is", "it", "ja", "ko", "la", "lt", "ms", "ne",
             "nl", "no", "pa", "pl", "pt", "ro", "ru", "sa", "sk", "sr", "sv", "sw", "ta", "te",
             "th", "tl", "tr", "uk", "ur", "vi", "yue", "zh", "unknown"}  # ACE-Step's VALID_LANGUAGES
KEY_RE = re.compile(r"^[A-G][#b♯♭]? (major|minor)$")  # e.g. "C major", "F# minor"
SETUP, INSTALL, ENGINE, MASTER = 1, 2, 3, 7  # code-cell positions in the interactive notebook


def load_song(path):
    with open(path, encoding="utf-8") as f:
        song = json.load(f)
    if not song.get("caption") or not song.get("lyrics"):
        sys.exit("song.json needs at least \"caption\" and \"lyrics\".")
    song.setdefault("language", "en")
    song.setdefault("takes", 2)
    song.setdefault("duration", -1)
    song.setdefault("bpm", None)
    song.setdefault("key", "")
    song.setdefault("model", DEFAULT_MODEL)
    song.setdefault("mastering", "reference" if song.get("reference_dataset") else "loudness")
    if song["model"] not in MODELS:
        sys.exit(f"model must be one of {MODELS}")
    if song["language"] not in LANGUAGES:
        sys.exit(f"language must be an ACE-Step language code, one of {sorted(LANGUAGES)}")
    if song["bpm"] is not None and not 30 <= int(song["bpm"]) <= 300:
        sys.exit("bpm must be 30-300, or null to let the planner choose")
    if float(song["duration"]) != -1 and not 10 <= float(song["duration"]) <= 600:
        sys.exit("duration must be 10-600 seconds, or -1 to let the planner choose")
    if song["key"] and not KEY_RE.match(song["key"]):
        sys.exit('key must look like "C major" or "F# minor", or "" to let the planner choose')
    if song["mastering"] not in ("reference", "loudness", "none"):
        sys.exit("mastering must be reference, loudness or none")
    if song["mastering"] == "reference" and not song.get("reference_dataset"):
        sys.exit("mastering=reference needs reference_dataset (a Kaggle dataset like you/my-reference-song)")
    if not 1 <= int(song["takes"]) <= 4:
        sys.exit("takes must be 1-4")
    return song


def build_batch_notebook(song):
    with open(SOURCE_NOTEBOOK, encoding="utf-8") as f:
        nb = json.load(f)
    src = [c["source"] if isinstance(c["source"], str) else "".join(c["source"]) for c in nb["cells"]]

    setup = src[SETUP].replace('SONG_MODEL = "acestep-v15-xl-turbo"', f'SONG_MODEL = "{song["model"]}"', 1)
    if f'SONG_MODEL = "{song["model"]}"' not in setup:
        raise RuntimeError("Could not set SONG_MODEL in the setup cell; the source notebook changed.")
    no_audio = re.compile(r"^[ \t]*display\(Audio\(filename=\w+\)\)[ \t]*\n?", re.M)  # keep the saved notebook small
    engine = no_audio.sub("", src[ENGINE])
    master = no_audio.sub("", src[MASTER].replace('MASTERING = "reference"', f'MASTERING = "{song["mastering"]}"', 1))
    if f'MASTERING = "{song["mastering"]}"' not in master:
        raise RuntimeError("Could not set MASTERING in the mastering cell; the source notebook changed.")
    for cell, marker in ((engine, "display(Audio"), (master, "display(Audio")):
        if marker in cell:
            raise RuntimeError("Could not strip inline audio from the batch notebook; the source notebook changed.")

    request = {"caption": song["caption"].strip(), "lyrics": song["lyrics"].strip(),
               "vocal_language": song["language"], "duration": float(song["duration"]),
               "bpm": song["bpm"], "keyscale": song["key"], "thinking": True}
    generate = (
        "# Batch run: the song request is baked in by run_on_kaggle.py\n"
        "import json\n"
        f"LAST_REQUEST = json.loads({json.dumps(json.dumps(request, ensure_ascii=False))})\n"
        f"LAST_TAKES = run_job(LAST_REQUEST, {int(song['takes'])}, 'Planning, composing and singing your song')\n"
    )
    finish = (
        "# Write a manifest, then stop the engine so the run ends cleanly.\n"
        "import glob, json, os\n"
        "manifest = {'request': LAST_REQUEST, 'song_model': SONG_MODEL, 'takes': LAST_TAKES,\n"
        "            'mastered': sorted(glob.glob(os.path.join(OUT_DIR, 'mastered', '*.mp3')))}\n"
        "with open(os.path.join(OUT_DIR, 'manifest.json'), 'w') as f:\n"
        "    json.dump(manifest, f, indent=1, ensure_ascii=False)\n"
        "print(json.dumps(manifest, indent=1, ensure_ascii=False))\n"
        "engine_proc.terminate()\n"
    )

    def code(text):
        return {"cell_type": "code", "execution_count": None, "metadata": {}, "outputs": [], "source": text}

    cells = [{"cell_type": "markdown", "metadata": {},
              "source": "# ACE-Step song runner (batch)\nGenerated by `ai-music/kaggle_runner/run_on_kaggle.py`."}]
    cells += [code(setup), code(src[INSTALL]), code(engine), code(generate), code(master), code(finish)]
    return {"nbformat": 4, "nbformat_minor": 4, "metadata": nb["metadata"], "cells": cells}


def kaggle_cli():
    exe = shutil.which("kaggle") or os.path.join(os.path.dirname(sys.executable), "kaggle")
    if not os.path.exists(exe):
        sys.exit("Kaggle CLI not found. Install it with: pip install kaggle")
    return exe


def run(cmd, check=True):
    r = subprocess.run(cmd, capture_output=True, text=True)
    out = (r.stdout + r.stderr).strip()
    if check and r.returncode != 0:
        sys.exit(f"$ {' '.join(cmd)}\n{out}")
    return out


def kaggle_username(cli):
    if os.environ.get("KAGGLE_USERNAME"):
        return os.environ["KAGGLE_USERNAME"]
    m = re.search(r"username:\s*(\S+)", run([cli, "config", "view"], check=False))
    if not m or m.group(1) in ("None", "null"):
        sys.exit("Couldn't read your Kaggle username from the token. Set KAGGLE_USERNAME.")
    return m.group(1)


def status_of(cli, kernel):
    out = run([cli, "kernels", "status", kernel], check=False)
    m = re.search(r"(QUEUED|RUNNING|COMPLETE|ERROR|CANCEL\w*|NEW_SCRIPT)", out, re.I)
    return (m.group(1).upper() if m else "UNKNOWN"), out


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--song", required=True, help="path to the song.json to make")
    ap.add_argument("--out", default=os.path.join(os.getcwd(), "song-output"),
                    help="where to build the notebook and download the songs")
    ap.add_argument("--all-files", action="store_true", help="also download the lossless takes and WAV masters")
    ap.add_argument("--timeout-min", type=int, default=150)
    ap.add_argument("--poll-sec", type=int, default=60)
    ap.add_argument("--dry-run", action="store_true", help="build the notebook and metadata, don't push")
    args = ap.parse_args()

    song = load_song(args.song)
    stage = os.path.join(args.out, "_kaggle_push")
    shutil.rmtree(stage, ignore_errors=True)
    os.makedirs(stage)
    with open(os.path.join(stage, f"{KERNEL_SLUG}.ipynb"), "w", encoding="utf-8") as f:
        json.dump(build_batch_notebook(song), f, indent=1, ensure_ascii=False)

    cli = None if args.dry_run else kaggle_cli()
    user = os.environ.get("KAGGLE_USERNAME", "YOUR_USERNAME") if args.dry_run else kaggle_username(cli)
    kernel = f"{user}/{KERNEL_SLUG}"
    metadata = {
        "id": kernel, "title": KERNEL_SLUG, "code_file": f"{KERNEL_SLUG}.ipynb",
        "language": "python", "kernel_type": "notebook", "is_private": True,
        "enable_gpu": True, "enable_internet": True, "machine_shape": ACCELERATOR,
        "dataset_sources": [song["reference_dataset"]] if song.get("reference_dataset") else [],
    }
    with open(os.path.join(stage, "kernel-metadata.json"), "w") as f:
        json.dump(metadata, f, indent=1)
    print(f"Built {stage}/  ({song['model']}, {song['takes']} takes, mastering={song['mastering']})")
    if args.dry_run:
        return

    print(run([cli, "kernels", "push", "-p", stage, "--accelerator", ACCELERATOR]))
    print(f"Running on Kaggle: https://www.kaggle.com/code/{kernel}  (2B turbo, 2 takes: ≈ 13 min; XL is slower)")
    started, state = time.time(), "QUEUED"
    while True:
        time.sleep(args.poll_sec)
        state, raw = status_of(cli, kernel)
        print(f"  {int((time.time() - started) / 60):3d} min  {state}", flush=True)
        if state in ("COMPLETE", "ERROR") or state.startswith("CANCEL"):
            break
        if time.time() - started > args.timeout_min * 60:
            sys.exit(f"Still {state} after {args.timeout_min} min. Check https://www.kaggle.com/code/{kernel}")

    dest = os.path.join(args.out, time.strftime("%Y%m%d-%H%M%S"))
    os.makedirs(dest, exist_ok=True)
    pattern = [] if args.all_files or state != "COMPLETE" else ["--file-pattern", r".*\.(mp3|json|log)$"]
    print(run([cli, "kernels", "output", kernel, "-p", dest, "-o", *pattern], check=False))
    if state != "COMPLETE":
        print(raw)
        logs = [os.path.join(r, n) for r, _, fs in os.walk(dest) for n in fs if n.endswith(".log")]
        for log in logs:
            print(f"--- {log} (decoded, last 60 lines)")
            try:
                from read_kaggle_log import decode
                print("\n".join(decode(log)[-60:]))
            except Exception as exc:  # fall back to the raw tail rather than hide the log
                print(f"(couldn't decode: {exc})\n" + open(log, errors="ignore").read()[-4000:])
        sys.exit(f"The Kaggle run ended with {state}. See https://www.kaggle.com/code/{kernel}")

    mp3s = sorted(os.path.join(r, n) for r, _, fs in os.walk(dest) for n in fs if n.endswith(".mp3"))
    if not mp3s:
        sys.exit(f"The run finished but returned no MP3s. Look in {dest} and https://www.kaggle.com/code/{kernel}")
    print(f"\n✅ Done in {int((time.time() - started) / 60)} min. Files in {dest}:")
    for p in mp3s:
        print("  ", os.path.relpath(p, dest))


if __name__ == "__main__":
    main()
