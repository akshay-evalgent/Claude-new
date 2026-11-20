#!/usr/bin/env bash
# Rebuild the short from source. Needs: node + playwright (with chromium), python3, ffmpeg, curl,
# pip packages: kokoro-onnx soundfile scipy numpy faster-whisper pillow.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"; WORK="${WORK:-$HERE/build}"; mkdir -p "$WORK/frames" "$WORK/fonts" "$WORK/sounds"

# 0a. The real sound effects, all CC0 (public domain): a BigSoundBank heartbeat and room tone, plus from Freesound real mosquitoes,
#     a summer evening with crickets, a breath, a lotion bottle, a fizz, clothes rustling, a laboratory, a tally counter and a clock
for id in 0218 2387; do
  [ -s "$WORK/sounds/$id.wav" ] || curl -sSL -o "$WORK/sounds/$id.wav" "https://bigsoundbank.com/UPLOAD/bwf-en/$id.wav"
done
for p in 435/435650_3998965 477/477794_3472612 746/746366_11069322 717/717167_2631525 854/854468_17091295 521/521897_129727 566/566193_10435241 648/648662_10933546 664/664698_5369632 813/813355_17511816; do
  id=$(basename "$p" | cut -d_ -f1)
  [ -s "$WORK/sounds/fs$id.wav" ] || { curl -sSL -o "$WORK/sounds/fs$id.mp3" "https://cdn.freesound.org/previews/$p-hq.mp3" && ffmpeg -nostdin -v error -y -i "$WORK/sounds/fs$id.mp3" -ac 1 -ar 48000 "$WORK/sounds/fs$id.wav"; }
done
# 0b. The real visual assets: CC0 HDR environments (a park at sunset, a vintage lab), a scanned table and chairs, a lantern, plants, a clipboard and a chemistry set from Poly Haven
python3 "$HERE/src/fetch_assets.py" "$HERE/src"

# 1. Voiceover (Kokoro TTS, voice am_fenrir, speed 0.9 -> about 175 wpm).
#    For the loop, the voice reads the script straight on into the first words and is cut just before the
#    repeated "Some", so "It's because" flows straight into "Some people really are mosquito magnets" when the video loops.
if [ ! -f "$WORK/vo.wav" ]; then
  [ -f "$WORK/kokoro-v1.0.onnx" ] || curl -sSL -o "$WORK/kokoro-v1.0.onnx" https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx
  [ -f "$WORK/voices-v1.0.bin" ] || curl -sSL -o "$WORK/voices-v1.0.bin" https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin
  python3 - "$HERE/script.txt" "$WORK" <<'PY'
import sys, numpy as np, soundfile as sf
from kokoro_onnx import Kokoro
text = open(sys.argv[1]).read().strip() + " Some people really are mosquito magnets."
w = sys.argv[2]; k = Kokoro(f"{w}/kokoro-v1.0.onnx", f"{w}/voices-v1.0.bin")
a, sr = k.create(text, voice="am_fenrir", speed=0.9, lang="en-us")
idx = np.where(np.abs(a) > 0.01 * np.abs(a).max())[0]; a = a[max(idx[0] - int(0.03 * sr), 0):]
# cut at 33.967 s, between "because" and the repeated "Some" (exactly 1019 frames)
a = a[:int(33.966667 * sr)].copy()
f = int(0.006 * sr); a[-f:] *= np.linspace(1, 0, f)
sf.write(f"{w}/vo.wav", a.astype(np.float32), sr)
PY
fi
# If you re-record the voice, re-time the cues: update words.json and the C = {...} table in src/mosquito-magnets.js.

# 2. Frames (three.js in headless Chromium, 1080x1920 @ 30 fps, 3 sub-frames each). A few hours on 4 CPU cores.
#    Fast draft: PAGE='mosquito-magnets.html?sub=1'
(cd "$HERE/src" && npm install --silent)
(cd "$HERE/src" && python3 -m http.server 8765 --bind 127.0.0.1 >/dev/null 2>&1 & echo $! > "$WORK/http.pid")
sleep 1
node "$HERE/src/frames.js" "$WORK/frames" 0 1019 2 & node "$HERE/src/frames.js" "$WORK/frames" 1 1019 2 & wait
kill "$(cat "$WORK/http.pid")" || true

# 3. Music (16 bars) + real sound effects + voice, mastered to about -12 LUFS.
#    No fade at the end, only 3 ms micro-fades at both edges so the loop seam doesn't click.
mkdir -p "$WORK/stems"
python3 "$HERE/audio/mix_mosquito.py" "$WORK/vo.wav" "$WORK/sounds" "$HERE/words.json" "$WORK/mix_raw.wav" "$WORK/stems"
ffmpeg -y -i "$WORK/mix_raw.wav" -af "volume=7dB,alimiter=limit=0.85:attack=3:release=60:level=false,loudnorm=I=-11:TP=-1.0:LRA=6:linear=true:measured_I=-11.41:measured_TP=-1.41:measured_LRA=2.10:measured_thresh=-21.46,volume=-0.5dB" -ar 48000 -c:a pcm_s24le "$WORK/mix_master.wav"
python3 -c "import soundfile as sf, numpy as np; a, sr = sf.read('$WORK/mix_master.wav'); f = int(0.003 * sr); r = np.linspace(0, 1, f)[:, None]; a[:f] *= r; a[-f:] *= r[::-1]; sf.write('$WORK/mix_master.wav', a, sr, subtype='PCM_24')"

# 4. Encode: captions + share prompt burned in, and a clean version (exactly 1019 frames, 33.967 s)
cp "$HERE/src/node_modules/@expo-google-fonts/nunito/Nunito_800ExtraBold.ttf" "$WORK/fonts/"
ffmpeg -y -framerate 30 -i "$WORK/frames/f_%05d.jpg" -i "$WORK/mix_master.wav" -vf "ass=$HERE/captions.ass:fontsdir=$WORK/fonts,format=yuv420p" -c:v libx264 -preset slow -crf 20 -profile:v high -c:a aac -b:a 192k -af "apad=whole_dur=33.966667" -frames:v 1019 -t 33.966667 -movflags +faststart "$WORK/why-mosquitoes-bite-some-people-more.mp4"
ffmpeg -y -framerate 30 -i "$WORK/frames/f_%05d.jpg" -i "$WORK/mix_master.wav" -vf "format=yuv420p" -c:v libx264 -preset slow -crf 20 -profile:v high -c:a aac -b:a 192k -af "apad=whole_dur=33.966667" -frames:v 1019 -t 33.966667 -movflags +faststart "$WORK/why-mosquitoes-bite-some-people-more-no-captions.mp4"
echo "done: $WORK/why-mosquitoes-bite-some-people-more.mp4"
