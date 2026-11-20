#!/usr/bin/env bash
# Rebuild the short from source. Needs: node + playwright (with chromium), python3, ffmpeg, curl,
# pip packages: kokoro-onnx soundfile scipy numpy faster-whisper pillow.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"; WORK="${WORK:-$HERE/build}"; mkdir -p "$WORK/frames" "$WORK/fonts" "$WORK/sounds"

# 0a. The real sound effects, all CC0 (public domain): BigSoundBank room tone, plus from Freesound a tokay gecko calling, a house
#     gecko's chirp, crickets at night, a bulb's hum, magnets on a fridge, a creaking rope, a dropped bag, tape peeling and claws on wood
for id in 2387; do
  [ -s "$WORK/sounds/$id.wav" ] || curl -sSL -o "$WORK/sounds/$id.wav" "https://bigsoundbank.com/UPLOAD/bwf-en/$id.wav"
done
for p in 686/686626_8281041 400/400573_7554526 645/645863_5902878 637/637661_612689 594/594451_12596088 862/862995_15375955 382/382642_4297074 458/458446_3972347 369/369915_2402876 830/830466_6775466; do
  id=$(basename "$p" | cut -d_ -f1)
  [ -s "$WORK/sounds/fs$id.wav" ] || { curl -sSL -o "$WORK/sounds/fs$id.mp3" "https://cdn.freesound.org/previews/$p-hq.mp3" && ffmpeg -nostdin -v error -y -i "$WORK/sounds/fs$id.mp3" -ac 1 -ar 48000 "$WORK/sounds/fs$id.wav"; }
done
# 0b. The real visual assets: CC0 HDR environments (a room by the fire at night, a studio), a scanned ceiling texture, a light socket and bulb, a cement bag and a potted plant from Poly Haven
python3 "$HERE/src/fetch_assets.py" "$HERE/src"

# 1. Voiceover (Kokoro TTS, voice am_fenrir, speed 0.9 -> about 183 wpm).
#    For the loop, the voice reads the script straight on into the first words and is cut just before the
#    repeated "A", so "because" flows straight into "A gecko could hang from your ceiling all day" when the video loops.
if [ ! -f "$WORK/vo.wav" ]; then
  [ -f "$WORK/kokoro-v1.0.onnx" ] || curl -sSL -o "$WORK/kokoro-v1.0.onnx" https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx
  [ -f "$WORK/voices-v1.0.bin" ] || curl -sSL -o "$WORK/voices-v1.0.bin" https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin
  python3 - "$HERE/script.txt" "$WORK" <<'PY'
import sys, numpy as np, soundfile as sf
from kokoro_onnx import Kokoro
text = open(sys.argv[1]).read().strip() + " A gecko could hang from your ceiling all day."
w = sys.argv[2]; k = Kokoro(f"{w}/kokoro-v1.0.onnx", f"{w}/voices-v1.0.bin")
a, sr = k.create(text, voice="am_fenrir", speed=0.9, lang="en-us")
idx = np.where(np.abs(a) > 0.01 * np.abs(a).max())[0]; a = a[max(idx[0] - int(0.03 * sr), 0):]
# cut at 32.767 s, between "because" and the repeated "A" (exactly 983 frames)
a = a[:int(32.766667 * sr)].copy()
f = int(0.006 * sr); a[-f:] *= np.linspace(1, 0, f)
sf.write(f"{w}/vo.wav", a.astype(np.float32), sr)
PY
fi
# If you re-record the voice, re-time the cues: update words.json and the C = {...} table in src/gecko-ceilings.js.

# 2. Frames (three.js in headless Chromium, 1080x1920 @ 30 fps, 3 sub-frames each). A few hours on 4 CPU cores.
#    Fast draft: PAGE='gecko-ceilings.html?sub=1'
(cd "$HERE/src" && npm install --silent)
(cd "$HERE/src" && python3 -m http.server 8765 --bind 127.0.0.1 >/dev/null 2>&1 & echo $! > "$WORK/http.pid")
sleep 1
node "$HERE/src/frames.js" "$WORK/frames" 0 983 2 & node "$HERE/src/frames.js" "$WORK/frames" 1 983 2 & wait
kill "$(cat "$WORK/http.pid")" || true

# 3. Music (16 bars) + real sound effects + voice, mastered to about -12 LUFS.
#    No fade at the end, only 3 ms micro-fades at both edges so the loop seam doesn't click.
mkdir -p "$WORK/stems"
python3 "$HERE/audio/mix_gecko.py" "$WORK/vo.wav" "$WORK/sounds" "$HERE/words.json" "$WORK/mix_raw.wav" "$WORK/stems"
ffmpeg -y -i "$WORK/mix_raw.wav" -af "volume=7dB,alimiter=limit=0.85:attack=3:release=60:level=false,loudnorm=I=-11:TP=-1.0:LRA=6:linear=true:measured_I=-11.44:measured_TP=-1.41:measured_LRA=2.20:measured_thresh=-21.47,volume=-0.5dB" -ar 48000 -c:a pcm_s24le "$WORK/mix_master.wav"
python3 -c "import soundfile as sf, numpy as np; a, sr = sf.read('$WORK/mix_master.wav'); f = int(0.003 * sr); r = np.linspace(0, 1, f)[:, None]; a[:f] *= r; a[-f:] *= r[::-1]; sf.write('$WORK/mix_master.wav', a, sr, subtype='PCM_24')"

# 4. Encode: captions + share prompt burned in, and a clean version (exactly 983 frames, 32.767 s)
cp "$HERE/src/node_modules/@expo-google-fonts/nunito/Nunito_800ExtraBold.ttf" "$WORK/fonts/"
ffmpeg -y -framerate 30 -i "$WORK/frames/f_%05d.jpg" -i "$WORK/mix_master.wav" -vf "ass=$HERE/captions.ass:fontsdir=$WORK/fonts,format=yuv420p" -c:v libx264 -preset slow -crf 20 -profile:v high -c:a aac -b:a 192k -af "apad=whole_dur=32.766667" -frames:v 983 -t 32.766667 -movflags +faststart "$WORK/how-geckos-walk-on-ceilings.mp4"
ffmpeg -y -framerate 30 -i "$WORK/frames/f_%05d.jpg" -i "$WORK/mix_master.wav" -vf "format=yuv420p" -c:v libx264 -preset slow -crf 20 -profile:v high -c:a aac -b:a 192k -af "apad=whole_dur=32.766667" -frames:v 983 -t 32.766667 -movflags +faststart "$WORK/how-geckos-walk-on-ceilings-no-captions.mp4"
echo "done: $WORK/how-geckos-walk-on-ceilings.mp4"
