#!/usr/bin/env bash
# Rebuild the voice tools in a fresh session (the cloud container starts empty each time):
#
#     bash voices/setup.sh
#
# Creates a Python environment with CPU PyTorch and the voice libraries, and clones Seed-VC
# (the voice converter) at a pinned commit. Model weights download on first use.
# Afterwards run any tool with:  voices/run <script>.py ...
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VENV="${VOICES_VENV:-$HOME/.voices-venv}"
VENDOR="${VOICES_VENDOR:-$HOME/.voices-vendor}"
SEEDVC_COMMIT="51383efd921027683c89e5348211d93ff12ac2a8"   # Plachtaa/seed-vc, Apr 2025 (repo archived Nov 2025)

command -v ffmpeg >/dev/null || { echo "ffmpeg is required (apt-get install ffmpeg)" >&2; exit 1; }

if [ ! -x "$VENV/bin/python" ]; then
  echo "Creating Python environment in $VENV"
  python3 -m venv "$VENV"
fi
"$VENV/bin/pip" install -q --upgrade pip
echo "Installing CPU PyTorch"
"$VENV/bin/pip" install -q torch torchaudio --index-url https://download.pytorch.org/whl/cpu
echo "Installing voice libraries"
"$VENV/bin/pip" install -q -r "$ROOT/voices/requirements.txt"

mkdir -p "$VENDOR"
if [ ! -d "$VENDOR/seed-vc/.git" ]; then
  echo "Cloning Seed-VC"
  GIT_LFS_SKIP_SMUDGE=1 git clone -q https://github.com/Plachtaa/seed-vc "$VENDOR/seed-vc"
fi
if [ "$(git -C "$VENDOR/seed-vc" rev-parse HEAD)" != "$SEEDVC_COMMIT" ]; then
  git -C "$VENDOR/seed-vc" fetch -q --depth 1 origin "$SEEDVC_COMMIT"
  git -C "$VENDOR/seed-vc" checkout -q "$SEEDVC_COMMIT"
fi

"$VENV/bin/python" -c "import torch, librosa, faster_whisper, speechbrain, gradio_client; print('voice tools ready: torch', torch.__version__)"
echo "Seed-VC at $VENDOR/seed-vc ($(git -C "$VENDOR/seed-vc" rev-parse --short HEAD))"
