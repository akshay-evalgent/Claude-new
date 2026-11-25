#!/usr/bin/env bash
# One-time setup for the video pipeline. Safe to run again: it skips what is there.
#
#   bash video-pipeline/tools/setup.sh [voice-name]
#
# Installs the optional Python packages (speech-to-text, text-to-speech, link
# downloads) and one narration voice. The measuring and rendering tools need
# none of this: only ffmpeg, numpy, Pillow and Playwright, which the cloud
# environment already has.
set -euo pipefail

VOICE="${1:-en_US-lessac-medium}"
VOICE_DIR="$HOME/.cache/video-pipeline/voices"

need=()
python3 -c "import faster_whisper" 2>/dev/null || need+=(faster-whisper)
python3 -c "import piper" 2>/dev/null || need+=(piper-tts)
python3 -c "import yt_dlp" 2>/dev/null || need+=(yt-dlp)
if [ ${#need[@]} -gt 0 ]; then
  echo "installing: ${need[*]}"
  pip install -q "${need[@]}" 2>&1 | grep -v "Running pip as the 'root' user" || true
fi

mkdir -p "$VOICE_DIR"
if [ ! -f "$VOICE_DIR/$VOICE.onnx" ]; then
  echo "downloading voice: $VOICE"
  python3 -m piper.download_voices "$VOICE" --download-dir "$VOICE_DIR"
fi

for c in ffmpeg ffprobe node; do
  command -v "$c" >/dev/null || { echo "missing: $c"; exit 1; }
done
python3 -c "import numpy, PIL" || { echo "missing: numpy or Pillow"; exit 1; }
node -e "require('playwright')" 2>/dev/null || { echo "missing: playwright (node)"; exit 1; }

echo "ready. voice: $VOICE_DIR/$VOICE.onnx"
