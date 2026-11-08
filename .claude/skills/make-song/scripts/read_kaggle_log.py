#!/usr/bin/env python3
"""Turn a Kaggle kernel log (a JSON list of stream chunks) into readable text.

    python read_kaggle_log.py path/to/ace-step-song-runner.log            # last 80 lines
    python read_kaggle_log.py path/to/ace-step-song-runner.log --all      # everything
    python read_kaggle_log.py path/to/ace-step-song-runner.log --stages   # stage timings + [engine] lines

Progress bars rewrite their line with carriage returns; only the final state of each
line is kept. Install noise (package lists, download bars, debugger warnings) is dropped.
"""
import argparse
import json
import re
import sys

NOISE = re.compile(r"^\s*(\+ |Downloading |Downloaded |Building |Built |Fetching )|SyntaxWarning|NbConvert"
                   r"|Debugger warning|frozen modules|Xfrozen_modules|PYDEVD|re\.sub\(")
STAGES = [("$ git clone", "install begins"), ("Patched ACE-Step", "float32 patch applied"),
          ("Installed. Run step 3", "install done"), ("Engine ready", "models loaded"),
          ("finished in", "takes generated"), ("_master.mp3", "mastering done"),
          ("Traceback", "error raised")]


def load_chunks(path):
    with open(path, encoding="utf-8", errors="ignore") as f:
        raw = f.read()
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        # A log cut off mid-write: close the list and try again.
        return json.loads(raw.rstrip().rstrip(",") + "]")


def decode(path):
    text = "".join(c.get("data", "") for c in load_chunks(path))
    text = re.sub(r"[^\n]*\r(?!\n)", "", text)  # keep only the last redraw of progress lines
    return [l for l in text.splitlines() if l.strip() and not NOISE.search(l)]


def stages(path):
    seen, out = set(), []
    for c in load_chunks(path):
        for marker, label in STAGES:
            if marker in c.get("data", "") and label not in seen:
                seen.add(label)
                out.append(f"{c.get('time', 0) / 60:6.1f} min  {label}")
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("log")
    ap.add_argument("--all", action="store_true")
    ap.add_argument("--stages", action="store_true")
    ap.add_argument("--tail", type=int, default=80)
    args = ap.parse_args()
    if args.stages:
        print("\n".join(stages(args.log)))
        print("\n".join(l for l in decode(args.log) if l.startswith("[engine]")))
        return
    lines = decode(args.log)
    print("\n".join(lines if args.all else lines[-args.tail:]))


if __name__ == "__main__":
    sys.exit(main())
