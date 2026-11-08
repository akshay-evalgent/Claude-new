"""Write a Kaggle notebook that runs an image job file (scripts/video/kaggle_images.py) through WanGP.

    python3 scripts/video/make_kaggle_images_notebook.py JOBS.json OUT.ipynb

Reuses the GPU check and WanGP install cells of the shot notebook. Reference images come from an attached Kaggle
dataset (run_on_kaggle.py --images uploads them). Results: /kaggle/working/images/<name>.png and images.zip.
"""
import json, os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from make_kaggle_notebook import SETUP, INSTALL, WANGP_REF, md, code

SETTINGS = f"""
ATTENTION = "sdpa"
PROFILE   = 4
CHUNK     = 7          # images per WanGP run (one model per run in the photoreal test)
HOURS     = 11.0
WANGP_REF = "{WANGP_REF}"
"""

RESOLVE = r"""
# Swap reference file names for their paths in the attached dataset
JOBS = json.load(open(f"{SOF}/jobs.json"))["jobs"]
found = {}
for root, _, files in os.walk("/kaggle/input"):
    for f in files:
        found.setdefault(f, os.path.join(root, f))
missing = sorted({r for j in JOBS for r in j.get("image_refs", []) if r not in found})
assert not missing, f"reference images not found in /kaggle/input: {missing}"
done = {os.path.splitext(f)[0] for f in os.listdir(f"{WORK}/images")} if os.path.isdir(f"{WORK}/images") else set()
QUEUE = []
for j in JOBS:
    if j["output_filename"] in done:
        continue
    if j.get("image_refs"):
        j["image_refs"] = [found[r] for r in j["image_refs"]]
    QUEUE.append(j)
print(len(QUEUE), "images to make")
"""

RUN = r"""
import zipfile
IMAGES = f"{WORK}/images"
os.makedirs(IMAGES, exist_ok=True)

def collect():
    n = 0
    for root, _, files in os.walk(RAW):
        for f in files:
            stem, ext = os.path.splitext(f)
            if ext.lower() in (".png", ".jpg", ".jpeg", ".webp"):
                stem = re.sub(r"\(\d+\)$", "", stem)
                shutil.copy2(os.path.join(root, f), f"{IMAGES}/{stem}{ext.lower()}"); n += 1
    with zipfile.ZipFile(f"{WORK}/images.zip", "w") as z:
        for f in sorted(os.listdir(IMAGES)):
            z.write(f"{IMAGES}/{f}", f)
    return n

per = None
for n in range(0, (len(QUEUE) + CHUNK - 1) // CHUNK):
    tasks = QUEUE[n * CHUNK:(n + 1) * CHUNK]
    if per and per * len(tasks) > HOURS * 3600 - (time.time() - T0):
        print("Stopping before the time limit. Run again to continue."); break
    path = f"{TMP}/img-chunk-{n:02d}.json"
    json.dump(tasks, open(path, "w"))
    cmd = (f"cd {WANGP} && {sys.executable} wgp.py --process {path} --output-dir {RAW} "
           f"--profile {PROFILE} --attention {ATTN} --fp16")
    if n == 0 and sh(cmd + " --dry-run", check=False):
        raise RuntimeError("WanGP rejected the job file; see above.")
    t = time.time()
    code = sh(cmd, check=False)
    per = (time.time() - t) / len(tasks)
    print(f"chunk {n + 1}: exit {code}, {per:.0f} s per image, {collect()} images so far, "
          f"{(time.time() - T0) / 3600:.1f} h", flush=True)
print(sorted(os.listdir(IMAGES)))
shutil.rmtree(RAW, ignore_errors=True)
"""


def main(jobs_path, out):
    jobs = open(jobs_path).read()
    cells = [md("# Science of Fitness · image jobs (WanGP + FLUX.2 Klein 4B)\n\nMade by "
                "`scripts/video/make_kaggle_images_notebook.py`. Needs GPU T4 and internet on, with the reference "
                "dataset attached."),
             code(SETTINGS, "Settings"), code(SETUP), code(INSTALL),
             code(f"%%writefile /kaggle/working/sof/jobs.json\n{jobs}"), code(RESOLVE), code(RUN)]
    nb = {"cells": cells, "nbformat": 4, "nbformat_minor": 5,
          "metadata": {"kernelspec": {"display_name": "Python 3", "language": "python", "name": "python3"},
                       "language_info": {"name": "python"}}}
    os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
    json.dump(nb, open(out, "w"), indent=1, ensure_ascii=False)
    print("wrote", out)


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
