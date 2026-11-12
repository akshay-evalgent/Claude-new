#!/usr/bin/env bash
# Rebuild the short from source. Needs: node + playwright (with chromium), python3, ffmpeg,
# pip packages: kokoro-onnx soundfile scipy numpy faster-whisper.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"; WORK="${WORK:-$HERE/build}"; mkdir -p "$WORK/frames" "$WORK/fonts"

# 1. Voiceover (Kokoro TTS, voice am_fenrir, speed 0.9 -> ~187 wpm)
if [ ! -f "$WORK/vo.wav" ]; then
  [ -f "$WORK/kokoro-v1.0.onnx" ] || curl -sSL -o "$WORK/kokoro-v1.0.onnx" https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx
  [ -f "$WORK/voices-v1.0.bin" ] || curl -sSL -o "$WORK/voices-v1.0.bin" https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin
  python3 - "$HERE/script.txt" "$WORK" <<'PY'
import sys, numpy as np, soundfile as sf
from kokoro_onnx import Kokoro
text = open(sys.argv[1]).read().strip(); w = sys.argv[2]
k = Kokoro(f"{w}/kokoro-v1.0.onnx", f"{w}/voices-v1.0.bin")
a, sr = k.create(text, voice="am_fenrir", speed=0.9, lang="en-us")
idx = np.where(np.abs(a) > 0.01 * np.abs(a).max())[0]
sf.write(f"{w}/vo.wav", a[max(idx[0] - int(0.03 * sr), 0):idx[-1] + int(0.05 * sr)], sr)
PY
fi
# If you re-record the voice, re-time the cues: update words.json and the C = {...} table in src/dream.js.

# 2. Frames (three.js in headless Chromium, 1080x1920 @ 30 fps).
#    Each frame is 3-4 jittered sub-frames (anti-aliasing, soft shadows, 180-degree motion blur),
#    then depth of field, bloom and a film grade. About 1.75 hours on 4 CPU cores with software WebGL.
#    For a fast draft pass add ?sub=1 to the page: PAGE='dream.html?sub=1'.
(cd "$HERE/src" && npm install --silent)
(cd "$HERE/src" && python3 -m http.server 8765 --bind 127.0.0.1 >/dev/null 2>&1 & echo $! > "$WORK/http.pid")
sleep 1
node "$HERE/src/frames.js" "$WORK/frames" 0 1013 2 & node "$HERE/src/frames.js" "$WORK/frames" 1 1013 2 & wait
kill "$(cat "$WORK/http.pid")" || true

# 3. Music + sound effects + voice, mastered to about -11 LUFS
mkdir -p "$WORK/stems"
python3 "$HERE/audio/mix_dream.py" "$WORK/vo.wav" "$WORK/mix_raw.wav" "$WORK/stems"
ffmpeg -y -i "$WORK/mix_raw.wav" -af "volume=7dB,alimiter=limit=0.85:attack=3:release=60:level=false,loudnorm=I=-11:TP=-1.0:LRA=6:linear=true:measured_I=-11.41:measured_TP=-1.41:measured_LRA=1.80:measured_thresh=-21.44" -ar 48000 -c:a pcm_s24le "$WORK/mix_master.wav"

# 4. Encode, with and without burned-in captions
cp "$HERE/src/node_modules/@expo-google-fonts/nunito/Nunito_800ExtraBold.ttf" "$WORK/fonts/"
ffmpeg -y -framerate 30 -i "$WORK/frames/f_%05d.jpg" -i "$WORK/mix_master.wav" -vf "ass=$HERE/captions.ass:fontsdir=$WORK/fonts,format=yuv420p" -c:v libx264 -preset slow -crf 20 -profile:v high -c:a aac -b:a 192k -shortest -movflags +faststart "$WORK/why-we-dream.mp4"
ffmpeg -y -framerate 30 -i "$WORK/frames/f_%05d.jpg" -i "$WORK/mix_master.wav" -vf "format=yuv420p" -c:v libx264 -preset slow -crf 20 -profile:v high -c:a aac -b:a 192k -shortest -movflags +faststart "$WORK/why-we-dream-no-captions.mp4"
echo "done: $WORK/why-we-dream.mp4"
