#!/usr/bin/env bash
# Rebuild the short from source. Needs: node + playwright (with chromium), python3, ffmpeg, curl,
# pip packages: kokoro-onnx soundfile scipy numpy faster-whisper pillow.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"; WORK="${WORK:-$HERE/build}"; mkdir -p "$WORK/frames" "$WORK/fonts" "$WORK/sounds"

# 0a. The real sound effects: CC0 recordings from BigSoundBank (public domain)
for id in 0150 0218 0666 1026 1027 1028 1029 1069 1113 1280 1281 1372 1384 2183 2212 2387 2500 3176 3177 3178; do
  [ -s "$WORK/sounds/$id.wav" ] || curl -sSL -o "$WORK/sounds/$id.wav" "https://bigsoundbank.com/UPLOAD/bwf-en/$id.wav"
done
# 0b. The real visual assets: CC0 HDR environments, models and scanned textures from Poly Haven
python3 "$HERE/src/fetch_assets.py" "$HERE/src"

# 1. Voiceover (Kokoro TTS, voice am_fenrir, speed 0.9 -> about 178 wpm).
#    For the loop, the voice reads the script straight on into the first words and is cut just before the
#    repeated "That", so "because" flows straight into "That growl..." when the video loops.
if [ ! -f "$WORK/vo.wav" ]; then
  [ -f "$WORK/kokoro-v1.0.onnx" ] || curl -sSL -o "$WORK/kokoro-v1.0.onnx" https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx
  [ -f "$WORK/voices-v1.0.bin" ] || curl -sSL -o "$WORK/voices-v1.0.bin" https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin
  python3 - "$HERE/script.txt" "$WORK" <<'PY'
import sys, numpy as np, soundfile as sf
from kokoro_onnx import Kokoro
text = open(sys.argv[1]).read().strip() + " That growl"
w = sys.argv[2]; k = Kokoro(f"{w}/kokoro-v1.0.onnx", f"{w}/voices-v1.0.bin")
a, sr = k.create(text, voice="am_fenrir", speed=0.9, lang="en-us")
idx = np.where(np.abs(a) > 0.01 * np.abs(a).max())[0]; a = a[max(idx[0] - int(0.03 * sr), 0):]
# cut at 34.315 s (at the joint between "because" and the repeated "That"); the mix then trims to 34.3 s
a = a[:int(34.315 * sr)].copy()
f = int(0.006 * sr); a[-f:] *= np.linspace(1, 0, f)
sf.write(f"{w}/vo.wav", a.astype(np.float32), sr)
PY
fi
# If you re-record the voice, re-time the cues: update words.json and the C = {...} table in src/stomach-growls.js.

# 2. Frames (three.js in headless Chromium, 1080x1920 @ 30 fps, 3 sub-frames each). A few hours on 4 CPU cores.
#    Fast draft: PAGE='stomach-growls.html?sub=1'
(cd "$HERE/src" && npm install --silent)
(cd "$HERE/src" && python3 -m http.server 8765 --bind 127.0.0.1 >/dev/null 2>&1 & echo $! > "$WORK/http.pid")
sleep 1
node "$HERE/src/frames.js" "$WORK/frames" 0 1029 2 & node "$HERE/src/frames.js" "$WORK/frames" 1 1029 2 & wait
kill "$(cat "$WORK/http.pid")" || true

# 3. Music (16 bars; silent in the exam hall) + real sound effects + voice, mastered to about -12 LUFS.
#    No fade at the end, only 3 ms micro-fades at both edges so the loop seam doesn't click.
mkdir -p "$WORK/stems"
cp "$HERE/words.json" "$WORK/words.json"; cp "$HERE/audio/events.py" "$WORK/events.py"
python3 "$HERE/audio/mix_stomach.py" "$WORK/vo.wav" "$WORK/sounds" "$WORK/events.py" "$WORK/mix_raw.wav" "$WORK/stems"
ffmpeg -y -i "$WORK/mix_raw.wav" -af "volume=7dB,alimiter=limit=0.85:attack=3:release=60:level=false,loudnorm=I=-11:TP=-1.0:LRA=6:linear=true:measured_I=-12.27:measured_TP=-1.41:measured_LRA=2.10:measured_thresh=-22.36,volume=-0.5dB" -ar 48000 -c:a pcm_s24le "$WORK/mix_master.wav"
python3 -c "import soundfile as sf, numpy as np; a, sr = sf.read('$WORK/mix_master.wav'); f = int(0.003 * sr); r = np.linspace(0, 1, f)[:, None]; a[:f] *= r; a[-f:] *= r[::-1]; sf.write('$WORK/mix_master.wav', a, sr, subtype='PCM_24')"

# 4. Encode: captions + share prompt burned in, and a clean version (exactly 1029 frames, 34.3 s)
cp "$HERE/src/node_modules/@expo-google-fonts/nunito/Nunito_800ExtraBold.ttf" "$WORK/fonts/"
ffmpeg -y -framerate 30 -i "$WORK/frames/f_%05d.jpg" -i "$WORK/mix_master.wav" -vf "ass=$HERE/captions.ass:fontsdir=$WORK/fonts,format=yuv420p" -c:v libx264 -preset slow -crf 20 -profile:v high -c:a aac -b:a 192k -af "apad=whole_dur=34.3" -frames:v 1029 -t 34.3 -movflags +faststart "$WORK/why-your-stomach-growls.mp4"
ffmpeg -y -framerate 30 -i "$WORK/frames/f_%05d.jpg" -i "$WORK/mix_master.wav" -vf "format=yuv420p" -c:v libx264 -preset slow -crf 20 -profile:v high -c:a aac -b:a 192k -af "apad=whole_dur=34.3" -frames:v 1029 -t 34.3 -movflags +faststart "$WORK/why-your-stomach-growls-no-captions.mp4"
echo "done: $WORK/why-your-stomach-growls.mp4"
