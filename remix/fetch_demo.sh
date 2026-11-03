#!/usr/bin/env bash
# Download the three Blender Foundation open movies used by the demo (CC BY) into
# remix/sources/, then analyse them. About 1.1 GB of video.
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p sources
[ -f sources/sintel.mkv ] || {
  curl -L -o sources/sintel.mkv.zip https://download.blender.org/demo/movies/Sintel.2010.720p.mkv.zip
  unzip -p sources/sintel.mkv.zip > sources/sintel.mkv && rm sources/sintel.mkv.zip
}
[ -f sources/tears_of_steel.mov ] || \
  curl -L -o sources/tears_of_steel.mov https://download.blender.org/demo/movies/ToS/tears_of_steel_720p.mov
[ -f sources/elephants_dream.mp4 ] || \
  curl -L -o sources/elephants_dream.mp4 https://archive.org/download/ElephantsDream/ed_hd.mp4
python3 analyze.py work sintel=sources/sintel.mkv tos=sources/tears_of_steel.mov ed=sources/elephants_dream.mp4 \
  --names "Sintel, Scales, Thom, Celia, Barley, Proog, Emo, gatekeepers"
