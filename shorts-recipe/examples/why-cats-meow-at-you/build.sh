#!/usr/bin/env bash
# Rebuild the short from source. Needs: node + playwright (with chromium), python3, ffmpeg, curl,
# pip packages: kokoro-onnx soundfile scipy numpy faster-whisper.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"; WORK="${WORK:-$HERE/build}"; mkdir -p "$WORK/frames" "$WORK/fonts" "$WORK/sounds"

# 0. The real sound effects: CC0 recordings from BigSoundBank (public domain)
for id in 0013 0053 0098 0246 0373 0390 0426 0436 0881 0981 0999 1020 1104 1372 1405 1431 1702 1726 1795 1796 1891 1896 1898 1899 1902 2071 2617; do
  [ -s "$WORK/sounds/$id.wav" ] || curl -sSL -o "$WORK/sounds/$id.wav" "https://bigsoundbank.com/UPLOAD/bwf-en/$id.wav"
done

# 1. Voiceover (Kokoro TTS, voice am_fenrir, speed 0.9 -> about 185 wpm).
#    For the loop, the voice reads the script straight on into the first line and is cut just before "your"
#    of the repeated line, so "empty," keeps its mid-sentence pitch and comma pause.
if [ ! -f "$WORK/vo.wav" ]; then
  [ -f "$WORK/kokoro-v1.0.onnx" ] || curl -sSL -o "$WORK/kokoro-v1.0.onnx" https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx
  [ -f "$WORK/voices-v1.0.bin" ] || curl -sSL -o "$WORK/voices-v1.0.bin" https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin
  python3 - "$HERE/script.txt" "$WORK" <<'PY'
import sys, numpy as np, soundfile as sf
from kokoro_onnx import Kokoro
text = open(sys.argv[1]).read().strip() + " your cat meows at you, but almost never at other cats."
w = sys.argv[2]; k = Kokoro(f"{w}/kokoro-v1.0.onnx", f"{w}/voices-v1.0.bin")
a, sr = k.create(text, voice="am_fenrir", speed=0.9, lang="en-us")
idx = np.where(np.abs(a) > 0.01 * np.abs(a).max())[0]; a = a[max(idx[0] - int(0.03 * sr), 0):]
# trim the one sentence gap longer than 0.42 s (at 25.99 s) to 0.36 s, then cut at 31.91 s (20 ms before "your")
cut = int(31.91 * sr); a = a[:cut]; g0, g1 = int((25.99 + 0.18) * sr), int((25.99 + 0.47 - 0.18) * sr); a = np.concatenate([a[:g0], a[g1:]])
f = int(0.006 * sr); a[-f:] *= np.linspace(1, 0, f)
sf.write(f"{w}/vo.wav", a.astype(np.float32), sr)
PY
fi
# If you re-record the voice, re-time the cues: update words.json, the C = {...} table in src/cat-meow.js
# and the event times in audio/events.py (they drive both the sound and the cats' mouths).

# 2. Frames (three.js in headless Chromium, 1080x1920 @ 30 fps, 3 sub-frames each). About 1 h 45 min on 4 CPU cores.
#    Fast draft: PAGE='cat-meow.html?sub=1&fur=0'
(cd "$HERE/src" && npm install --silent)
(cd "$HERE/src" && python3 -m http.server 8765 --bind 127.0.0.1 >/dev/null 2>&1 & echo $! > "$WORK/http.pid")
sleep 1
node "$HERE/src/frames.js" "$WORK/frames" 0 954 2 & node "$HERE/src/frames.js" "$WORK/frames" 1 954 2 & wait
kill "$(cat "$WORK/http.pid")" || true

# 3. Music (16 bars, loops on the downbeat) + real sound effects + voice, mastered to about -11.5 LUFS.
#    No fade at the end, only 3 ms micro-fades at both edges so the loop seam doesn't click.
mkdir -p "$WORK/stems"
cp "$HERE/words.json" "$WORK/words.json"; cp "$HERE/audio/events.py" "$WORK/events.py"
python3 "$HERE/audio/mix_cat_meow.py" "$WORK/vo.wav" "$WORK/sounds" "$WORK/events.py" "$WORK/mix_raw.wav" "$WORK/stems"
ffmpeg -y -i "$WORK/mix_raw.wav" -af "volume=7dB,alimiter=limit=0.85:attack=3:release=60:level=false,loudnorm=I=-11:TP=-1.0:LRA=6:linear=true:measured_I=-11.78:measured_TP=-1.41:measured_LRA=2.50:measured_thresh=-21.85,volume=-0.5dB" -ar 48000 -c:a pcm_s24le "$WORK/mix_master.wav"
python3 -c "import soundfile as sf, numpy as np; a, sr = sf.read('$WORK/mix_master.wav'); f = int(0.003 * sr); r = np.linspace(0, 1, f)[:, None]; a[:f] *= r; a[-f:] *= r[::-1]; sf.write('$WORK/mix_master.wav', a, sr, subtype='PCM_24')"

# 4. Encode: captions + share prompt burned in, and a clean version
cp "$HERE/src/node_modules/@expo-google-fonts/nunito/Nunito_800ExtraBold.ttf" "$WORK/fonts/"
ffmpeg -y -framerate 30 -i "$WORK/frames/f_%05d.jpg" -i "$WORK/mix_master.wav" -vf "ass=$HERE/captions.ass:fontsdir=$WORK/fonts,format=yuv420p" -c:v libx264 -preset slow -crf 20 -profile:v high -c:a aac -b:a 192k -shortest -movflags +faststart "$WORK/why-cats-meow-at-you.mp4"
ffmpeg -y -framerate 30 -i "$WORK/frames/f_%05d.jpg" -i "$WORK/mix_master.wav" -vf "format=yuv420p" -c:v libx264 -preset slow -crf 20 -profile:v high -c:a aac -b:a 192k -shortest -movflags +faststart "$WORK/why-cats-meow-at-you-no-captions.mp4"
echo "done: $WORK/why-cats-meow-at-you.mp4"
