#!/usr/bin/env bash
# Anime-style re-render of a video, CPU only.
#   usage: render.sh INPUT.mp4 OUTPUT.mp4 [STYLED_LAST_FRAME]
# STYLED_LAST_FRAME: frames after this index are passed through untouched
# (used to keep the logo end card clean). Defaults to the last frame.
set -euo pipefail
IN=$1; OUT=$2
HERE=$(cd "$(dirname "$0")" && pwd)
WORK=${WORK:-$(dirname "$HERE")/work}
PY=${PY:-python3}            # needs numpy, onnxruntime, opencv-python-headless
WORKERS=${WORKERS:-2}; THREADS=${THREADS:-2}
MODEL=$WORK/AnimeGANv3_large_Ghibli_c1_e299.onnx
mkdir -p "$WORK/src" "$WORK/sty"

[ -f "$MODEL" ] || curl -fL -o "$MODEL" \
  https://huggingface.co/trysem/AnimeGANv3_Portrait_Inference/resolve/main/AnimeGANv3_large_Ghibli_c1_e299.onnx

IFS=, read W H FPS < <(ffprobe -v error -select_streams v:0 -show_entries stream=width,height,r_frame_rate -of csv=p=0 "$IN")
[ -f "$WORK/src/00000.png" ] || ffmpeg -v error -i "$IN" -fps_mode passthrough -start_number 0 "$WORK/src/%05d.png"
N=$(ls "$WORK/src" | wc -l); LAST=$((N - 1)); STYLED_LAST=${3:-$LAST}

# 1) neural stylisation (resumable; skips frames already done)
for w in $(seq 0 $((WORKERS - 1))); do
  "$PY" "$HERE/stage1_stylize.py" "$MODEL" "$WORK/src" "$WORK/sty" $w $WORKERS $STYLED_LAST $THREADS &
done
wait

# 2) grade onto source palette + cel shading + ink lines + flow-based de-flicker, 3) encode with source audio
"$PY" "$HERE/stage2_compose.py" --src "$WORK/src" --sty "$WORK/sty" --last $LAST --styled_last $STYLED_LAST |
  ffmpeg -v error -y -f rawvideo -pix_fmt rgb24 -s ${W}x${H} -r "$FPS" -i - -i "$IN" \
    -map 0:v -map 1:a? -c:v libx264 -preset slow -crf 17 -pix_fmt yuv420p -movflags +faststart \
    -c:a aac -b:a 192k -shortest "$OUT"
echo "wrote $OUT"
