"""Write the self-contained Kaggle notebook that batch-generates Episode 1's shots with WanGP (Wan 2.2).

    python3 scripts/video/make_kaggle_notebook.py

It embeds the current shots.json, grids.json, wangp_batch.py and panels.py, so re-run it after changing the shots.
Output: episodes/ep01-skinny-to-bulky/kaggle/ep01-wangp-batch.ipynb
"""
import json, os

HERE = os.path.dirname(os.path.abspath(__file__))
EP = os.path.join(HERE, "..", "..", "episodes", "ep01-skinny-to-bulky")
OUT = os.path.join(EP, "kaggle", "ep01-wangp-batch.ipynb")
WANGP_REF = "f0b54e02aa32b539e7be5c65cf4ada67db69da26"  # the WanGP version wangp_batch.py's settings were checked against


def md(text):
    return {"cell_type": "markdown", "metadata": {}, "source": text.strip("\n").splitlines(True)}


def code(text, title=None):
    meta = {"_kg_hide-input": False}
    if title:
        meta["title"] = title
    return {"cell_type": "code", "metadata": meta, "execution_count": None, "outputs": [],
            "source": text.strip("\n").splitlines(True)}


def compact_json(path):
    data = json.load(open(path))
    return "[\n" + ",\n".join(json.dumps(x, ensure_ascii=False) for x in data) + "\n]\n"


INTRO = """
# Science of Fitness · Episode 1 · batch-generate shots with WanGP

This notebook makes Episode 1's character shots, unattended, on Kaggle's free GPU. It uses **Wan 2.2**, an open model under the Apache-2.0 licence, so the clips have no watermark and can go in a monetised video. **WanGP** runs it in headless batch mode.

**Before you run**
1. In the right-hand panel, set **Accelerator → GPU T4 x2**. Don't use the P100, because current PyTorch no longer supports it. Also turn **Internet → On**. Kaggle needs a phone-verified account for both.
2. Optional, for consistent characters: click **Add Input → Upload** and add a dataset with any of these:
   - your storyboard sheets `G01.png` … `G09.png` from `flow/GRIDS.md`. Each shot then starts from its panel.
   - keyframes named after the shot, like `03A.png`. These win over grid panels.
   - clips you already made, like `03A.mp4`. Those shots are skipped.

   Without any of these, every shot is generated from its text prompt, which already describes the characters.
3. Pick the shots and quality in the **Settings** cell below.

**Run it unattended.** Click **Save Version → Save & Run All (Commit)**. You can close the browser. When the run finishes, open the version and go to **Output**. There, download `ep01-shots.zip`, unzip it into `episodes/ep01-skinny-to-bulky/flow/shots/`, and run `python3 scripts/video/assemble_ep01.py`.

**Time.** The first run downloads about 15 GB of models and installs packages, which takes roughly 20–30 minutes. After that, each clip takes a few minutes on a T4. That figure is an estimate, not measured here. The notebook prints the real time per clip after the first batch, and it stops cleanly before Kaggle's 12-hour limit. To finish the rest, run it again with the earlier clips attached as input.

Made by `scripts/video/make_kaggle_notebook.py`. Re-make it after the shots change.
"""

SETTINGS = f"""
# ---------- Settings ----------
SHOT_SET  = "hero"     # "hero" (10 shots), "tier1" (28), "tier2" (69), "all" (73), or ids like "03A,11B,20B"
MODEL     = "5b"       # "5b": Wan 2.2 TI2V-5B + FastWan (3 steps), fits a T4.  "14b": Wan 2.2 I2V-14B Lightning (4 steps),
                       #   better motion, only for shots with a start image (others fall back to 5b); may run out of RAM.
RES       = ""         # blank = model default (1280x704 for 5b, 832x480 for 14b). "960x544" is about twice as fast.
ATTENTION = "sdpa"     # "sdpa" is the safe choice. "sage" (SageAttention 1, for the T4) can be faster; the notebook
                       #   falls back to sdpa if it doesn't install.
PROFILE   = 4          # WanGP memory profile. Use 5 if the run dies from lack of RAM.
CHUNK     = 6          # shots per WanGP run; results are collected after each run
HOURS     = 11.0       # stop starting new chunks after this many hours (Kaggle's limit is 12)
WANGP_REF = "{WANGP_REF}"  # WanGP version the settings were checked against; "main" for the latest
"""

SETUP = r"""
import os, re, subprocess, sys, time, json, glob, shutil
T0 = time.time()
WORK = "/kaggle/working"
TMP = "/kaggle/tmp" if os.access("/kaggle", os.W_OK) else "/tmp"
os.makedirs(TMP, exist_ok=True)
SOF = f"{WORK}/sof"                 # this episode's scripts and shot list (next cells)
WANGP = f"{TMP}/Wan2GP"             # WanGP and its ~15 GB of models live outside /kaggle/working (not saved)
RAW = f"{WORK}/wangp-out"           # WanGP's raw outputs
SHOTS = f"{WORK}/shots"             # renamed clips: 03A.mp4 ... (what the assembler wants)
for d in (SOF, RAW, SHOTS):
    os.makedirs(d, exist_ok=True)

def sh(cmd, check=True):
    print("$", cmd, flush=True)
    r = subprocess.run(cmd, shell=True)
    if check and r.returncode:
        raise RuntimeError(f"failed ({r.returncode}): {cmd}")
    return r.returncode

smi = subprocess.run("nvidia-smi --query-gpu=name,driver_version,memory.total --format=csv,noheader",
                     shell=True, capture_output=True, text=True).stdout.strip()
print("GPU:", smi or "none")
assert smi, "No GPU. Set Accelerator to 'GPU T4 x2' in the right-hand panel, then run again."
assert "P100" not in smi, "This is a P100, which current PyTorch doesn't support. Switch Accelerator to 'GPU T4 x2'."
DRIVER = int(smi.splitlines()[0].split(",")[1].strip().split(".")[0])
print("Python", sys.version.split()[0], "| driver", DRIVER)
"""

INSTALL = r"""
# WanGP, pinned to the version this notebook was written for
if not os.path.exists(f"{WANGP}/wgp.py"):
    sh(f"git clone --filter=blob:none https://github.com/deepbeepmeep/Wan2GP.git {WANGP}")
sh(f"cd {WANGP} && git checkout -q {WANGP_REF} && git log -1 --format='WanGP %h %cd'")
sh("which ffmpeg >/dev/null || (apt-get -qq update && apt-get -qq install -y ffmpeg)")

# PyTorch matching the GPU driver: WanGP recommends 2.10 + CUDA 13 (driver 580+); older drivers get 2.7.1 + CUDA 12.x.
if DRIVER >= 580:
    TORCH, NEW_STACK = "torch==2.10.0 torchvision==0.25.0 torchaudio==2.10.0 --index-url https://download.pytorch.org/whl/cu130", True
elif DRIVER >= 570:
    TORCH, NEW_STACK = "torch==2.7.1 torchvision==0.22.1 torchaudio==2.7.1 --index-url https://download.pytorch.org/whl/cu128", False
else:
    TORCH, NEW_STACK = "torch==2.7.1 torchvision==0.22.1 torchaudio==2.7.1 --index-url https://download.pytorch.org/whl/cu126", False
sh(f"pip install -q {TORCH}")
import importlib.metadata as md
pins = [f"{p}=={md.version(p)}" for p in ("torch", "torchvision", "torchaudio")]
open(f"{TMP}/constraints.txt", "w").write("\n".join(pins) + "\n")   # nothing below may swap PyTorch

# WanGP's requirements. On the older stack, skip the pieces built for CUDA 13 (audio tools only, not needed for video).
reqs = open(f"{WANGP}/requirements.txt").read().splitlines()
if not NEW_STACK:
    reqs = [r for r in reqs if not re.match(r"\s*(--extra-index-url|torchcodec|onnxruntime-gpu)", r)]
open(f"{TMP}/requirements.txt", "w").write("\n".join(reqs) + "\n")
if sh(f"cd {WANGP} && pip install -q -r {TMP}/requirements.txt -c {TMP}/constraints.txt", check=False):
    print("Full install failed; installing the requirements one by one and skipping the ones that don't fit.")
    for r in reqs:
        r = r.split("#")[0].strip()
        if r and not r.startswith("-"):
            sh(f"pip install -q '{r}' -c {TMP}/constraints.txt", check=False)

ATTN = ATTENTION
if ATTN == "sage":
    sh(f"pip install -q sageattention==1.0.6 -c {TMP}/constraints.txt", check=False)
    if not NEW_STACK:
        sh(f"pip install -q 'triton<3.3' -c {TMP}/constraints.txt", check=False)   # the T4 needs Triton 3.2
    if subprocess.run([sys.executable, "-c", "import sageattention"]).returncode:
        print("SageAttention didn't install; using sdpa."); ATTN = "sdpa"
print(f"Ready after {(time.time() - T0) / 60:.0f} min. Attention: {ATTN}")
"""

FIND = r"""
# Look for storyboard sheets, keyframes and finished clips in the attached datasets
def find_dir(pattern):
    for root, _, files in os.walk("/kaggle/input"):
        if any(re.fullmatch(pattern, f, re.I) for f in files):
            return root
    return None
GRIDS = find_dir(r"G0[1-9]\.(png|jpe?g|webp)")
KEYS = find_dir(r"\d\d[A-Z]\.(png|jpe?g|webp)")
DONE = find_dir(r"(ep01_)?\d\d[A-Z](\(\d+\))?\.mp4")
print("storyboard sheets:", GRIDS, "| keyframes:", KEYS, "| finished clips:", DONE)

args = f"--set '{SHOT_SET}' --model {MODEL} --media {WORK}/wangp-media --out {WORK}/wangp-queue.json"
args += f" --res {RES}" if RES else ""
args += f" --grids '{GRIDS}'" if GRIDS else ""
args += f" --keyframes '{KEYS}'" if KEYS else ""
for d in [DONE, SHOTS]:
    if d:
        args += f" --skip-existing '{d}'"
sh(f"cd {SOF} && {sys.executable} wangp_batch.py {args}")
QUEUE = json.load(open(f"{WORK}/wangp-queue.json"))
print(len(QUEUE), "shots to make")
"""

RUN = r"""
# Run WanGP headless on chunks of the queue, collecting and zipping the clips after each chunk
def run_chunk(tasks, n):
    path = f"{TMP}/chunk-{n:02d}.json"
    json.dump(tasks, open(path, "w"))
    cmd = (f"cd {WANGP} && {sys.executable} wgp.py --process {path} --output-dir {RAW} "
           f"--profile {PROFILE} --attention {ATTN} --fp16")
    if n == 0 and sh(cmd + " --dry-run", check=False):
        raise RuntimeError("WanGP rejected the batch file; see the messages above.")
    return sh(cmd, check=False)

def collect():
    sh(f"cd {SOF} && {sys.executable} wangp_batch.py collect {RAW} {SHOTS}")
    import zipfile
    with zipfile.ZipFile(f"{WORK}/ep01-shots.zip", "w") as z:
        for f in sorted(glob.glob(f"{SHOTS}/*.mp4")):
            z.write(f, os.path.basename(f))

per_shot = None
for n in range(0, (len(QUEUE) + CHUNK - 1) // CHUNK):
    tasks = QUEUE[n * CHUNK:(n + 1) * CHUNK]
    left = HOURS * 3600 - (time.time() - T0)
    if per_shot and per_shot * len(tasks) > left:
        print(f"Stopping: {len(QUEUE) - n * CHUNK} shots left would not finish in time. Run again to continue.")
        break
    t = time.time()
    code = run_chunk(tasks, n)
    per_shot = (time.time() - t) / len(tasks)
    collect()
    print(f"chunk {n + 1}: exit {code}, {per_shot / 60:.1f} min per shot, {(time.time() - T0) / 3600:.1f} h so far", flush=True)

made = sorted(os.path.splitext(f)[0] for f in os.listdir(SHOTS))
print(f"\n{len(made)} clips in {SHOTS}: {' '.join(made)}")
print("Download ep01-shots.zip from the Output tab and unzip it into episodes/ep01-skinny-to-bulky/flow/shots/")
"""

PREVIEW = r"""
# Quick look at the first few clips (works in the interactive editor)
from IPython.display import Video, display
for f in sorted(glob.glob(f"{SHOTS}/*.mp4"))[:3]:
    print(os.path.basename(f)); display(Video(f, embed=True, width=480))
"""

CLEAN = r"""
# Keep the saved output small: only the clips, the zip and the batch file are kept
shutil.rmtree(f"{WORK}/wangp-media", ignore_errors=True)
shutil.rmtree(RAW, ignore_errors=True)
sh(f"du -sh {WORK}/*", check=False)
"""


def main():
    files = {
        "wangp_batch.py": open(os.path.join(HERE, "wangp_batch.py")).read(),
        "panels.py": open(os.path.join(HERE, "panels.py")).read(),
        "shots.json": compact_json(os.path.join(EP, "flow", "shots.json")),
        "grids.json": compact_json(os.path.join(EP, "flow", "grids.json")),
    }
    cells = [md(INTRO), code(SETTINGS, "Settings"), md("## 1 · Check the GPU"), code(SETUP),
             md("## 2 · Install WanGP\nRoughly 10 minutes. The models download on the first generation."), code(INSTALL),
             md("## 3 · Episode files\nGenerated from the repo. Edit the repo and re-make the notebook rather than editing these cells.")]
    for name, text in files.items():
        cells.append(code(f"%%writefile /kaggle/working/sof/{name}\n{text}"))
    cells += [md("## 4 · Build the batch"), code(FIND),
              md("## 5 · Generate\nWanGP's progress prints below. The clips are collected after each chunk, so a stopped run keeps what it made."),
              code(RUN), md("## 6 · Check and tidy"), code(PREVIEW), code(CLEAN)]
    nb = {"cells": cells, "nbformat": 4, "nbformat_minor": 5,
          "metadata": {"kernelspec": {"display_name": "Python 3", "language": "python", "name": "python3"},
                       "language_info": {"name": "python"},
                       "kaggle": {"accelerator": "nvidiaTeslaT4", "isInternetEnabled": True, "isGpuEnabled": True}}}
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    json.dump(nb, open(OUT, "w"), indent=1, ensure_ascii=False)
    print("wrote", os.path.relpath(OUT))


if __name__ == "__main__":
    main()
