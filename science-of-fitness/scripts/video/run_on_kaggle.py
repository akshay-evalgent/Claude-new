"""Run the Episode 1 WanGP notebook on Kaggle from here, wait for it, and fetch the clips.

    pip install kaggle
    python3 scripts/video/run_on_kaggle.py [--set hero] [--model 5b] [--res ""] [--no-wait] [--dry-run]
    python3 scripts/video/run_on_kaggle.py --fetch      # just download the last run's output

Credentials come from the environment: KAGGLE_USERNAME + KAGGLE_KEY, or KAGGLE_API_TOKEN (+ KAGGLE_USERNAME),
or ~/.kaggle/kaggle.json. The kernel is pushed as a private notebook with a T4 GPU and internet on. When it finishes,
ep01-shots.zip is unzipped into episodes/ep01-skinny-to-bulky/flow/shots/.
"""
import argparse, json, os, re, shutil, subprocess, sys, tempfile, time, zipfile

HERE = os.path.dirname(os.path.abspath(__file__))
EP = os.path.join(HERE, "..", "..", "episodes", "ep01-skinny-to-bulky")
NB = os.path.join(EP, "kaggle", "ep01-wangp-batch.ipynb")
SLUG = "sof-ep01-wangp-batch"


def kaggle(*args, check=True, capture=True):
    r = subprocess.run(["kaggle", *args], capture_output=capture, text=True)
    if check and r.returncode:
        sys.exit(f"kaggle {' '.join(args)} failed:\n{r.stdout}\n{r.stderr}")
    return (r.stdout or "") + (r.stderr or "")


def username():
    u = os.environ.get("KAGGLE_USERNAME")
    if u:
        return u
    p = os.path.expanduser("~/.kaggle/kaggle.json")
    if os.path.exists(p):
        return json.load(open(p))["username"]
    m = re.search(r"username:\s*(\S+)", kaggle("config", "view", check=False))
    if m and m.group(1) != "None":
        return m.group(1)
    sys.exit("Set KAGGLE_USERNAME (your Kaggle user name) next to the key.")


def set_settings(nb, values):
    """Rewrite the notebook's Settings cell with the given values."""
    for c in nb["cells"]:
        src = "".join(c["source"])
        if c["cell_type"] == "code" and src.lstrip().startswith("# ---------- Settings"):
            for k, v in values.items():
                src, n = re.subn(rf"^({k}\s*=\s*)(\"[^\"]*\"|[\d.]+)", lambda m: m.group(1) + json.dumps(v), src, flags=re.M)
                if not n:
                    sys.exit(f"setting {k} not found in the notebook")
            c["source"] = src.splitlines(True)
            return nb
    sys.exit("Settings cell not found")


def fetch(kid):
    out = tempfile.mkdtemp(prefix="kaggle-out-")
    kaggle("kernels", "output", kid, "-p", out, "-o")
    z = os.path.join(out, "ep01-shots.zip")
    dest = os.path.join(EP, "flow", "shots")
    os.makedirs(dest, exist_ok=True)
    if os.path.exists(z):
        with zipfile.ZipFile(z) as f:
            names = [n for n in f.namelist() if re.fullmatch(r"\d\d[A-Z]\.mp4", n)]
            for n in names:
                with f.open(n) as src, open(os.path.join(dest, n), "wb") as dst:
                    shutil.copyfileobj(src, dst)
        print(f"{len(names)} clips -> {os.path.relpath(dest)}: {' '.join(sorted(n[:3] for n in names))}")
    else:
        print("No ep01-shots.zip in the output. Files:", os.listdir(out))
    log = [f for f in os.listdir(out) if f.endswith(".log")]
    if log:
        print("Run log saved to", os.path.join(out, log[0]))
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--set", default="hero")
    ap.add_argument("--model", default="5b")
    ap.add_argument("--res", default="")
    ap.add_argument("--hours", type=float, default=11.0)
    ap.add_argument("--no-wait", action="store_true")
    ap.add_argument("--fetch", action="store_true", help="only download the last run's output")
    ap.add_argument("--dry-run", action="store_true", help="write the kernel folder but don't push")
    a = ap.parse_args()

    kid = f"{username()}/{SLUG}" if not a.dry_run else f"USERNAME/{SLUG}"
    if a.fetch:
        fetch(kid); return

    d = tempfile.mkdtemp(prefix="kaggle-kernel-")
    nb = set_settings(json.load(open(NB)), {"SHOT_SET": a.set, "MODEL": a.model, "RES": a.res, "HOURS": a.hours})
    json.dump(nb, open(os.path.join(d, "ep01-wangp-batch.ipynb"), "w"), indent=1, ensure_ascii=False)
    json.dump({"id": kid, "title": SLUG, "code_file": "ep01-wangp-batch.ipynb", "language": "python",
               "kernel_type": "notebook", "is_private": True, "enable_gpu": True, "enable_tpu": False,
               "enable_internet": True, "machine_shape": "NvidiaTeslaT4", "dataset_sources": [],
               "competition_sources": [], "kernel_sources": [], "model_sources": []},
              open(os.path.join(d, "kernel-metadata.json"), "w"), indent=1)
    if a.dry_run:
        print("kernel folder:", d); return

    print(kaggle("kernels", "push", "-p", d).strip())
    print(f"Running on Kaggle: https://www.kaggle.com/code/{kid}")
    if a.no_wait:
        return
    t0, last = time.time(), None
    while True:
        time.sleep(120)
        s = kaggle("kernels", "status", kid, check=False).strip()
        st = re.search(r'status "?(?:KernelWorkerStatus\.)?(\w+)', s, re.I)
        st = st.group(1).lower() if st else s
        if st != last:
            print(f"[{(time.time() - t0) / 60:.0f} min] {st}", flush=True); last = st
        if st in ("complete", "error", "cancelacknowledged", "cancelrequested"):
            break
    fetch(kid)


if __name__ == "__main__":
    main()
