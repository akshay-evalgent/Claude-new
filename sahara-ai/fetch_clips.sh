#!/bin/bash
# Downloads the Kaggle clip outputs and unpacks each clip into 1080x1920 JPEG frames for the edit.
#   ./fetch_clips.sh            (uses the kaggle CLI on PATH or $KAGGLE)
set -e; cd "$(dirname "$0")"
K=${KAGGLE:-kaggle}
mkdir -p out/kaggle_clips && $K kernels output akkikmr/sahara-ai-clips -p out/kaggle_clips > /dev/null
python3 - <<'PY'
import glob, json, os, subprocess
lens = {}
for mp4 in sorted(glob.glob('out/kaggle_clips/clips/*.mp4')):
    n = os.path.basename(mp4)[:-4]; d = f'out/clips/{n}'; os.makedirs(d, exist_ok=True)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', mp4, '-vf', 'scale=-2:1920:flags=lanczos,crop=1080:1920', '-q:v', '2', f'{d}/f%04d.jpg'], check=True)
    lens[n] = len(os.listdir(d))
json.dump(lens, open('out/clips.json', 'w'), indent=1); print(lens)
PY
