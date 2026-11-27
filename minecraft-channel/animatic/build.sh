#!/usr/bin/env bash
# Full animatic build for one episode:
#   ./build.sh ep01-pets            -> out/ep01-pets/<ep>_animatic.mp4 + thumbnail.jpg + captions .srt
# Needs: node + npm install (three, fonts), Playwright Chromium, ffmpeg, python3 + numpy.
set -euo pipefail
EP=${1:?episode folder name under ../episodes}
WORKERS=${WORKERS:-3}
THUMB_FRAME=${THUMB_FRAME:-110}
THUMB_TEXT=${THUMB_TEXT:-"ONLY|ONE?!"}
THUMB_CAM=${THUMB_CAM:-}
cd "$(dirname "$0")"
OUT=out/$EP
mkdir -p "$OUT"

if [ "${SKIP_RENDER:-0}" != 1 ]; then
  node render.cjs "$EP" --workers "$WORKERS"
fi
python3 audio.py "$OUT/cues.json" "$OUT/mix.wav"
ffmpeg -y -loglevel error -f concat -safe 0 -i "$OUT/segments.txt" -c copy "$OUT/video.mp4"

# two-pass loudness normalisation to -14 LUFS / -1 dBTP (style bible §8)
STATS=$(ffmpeg -hide_banner -nostats -i "$OUT/mix.wav" -af loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json -f null - 2>&1 | sed -n '/^{/,/^}/p')
mi=$(echo "$STATS" | python3 -c "import json,sys;d=json.load(sys.stdin);print(d['input_i'],d['input_tp'],d['input_lra'],d['input_thresh'],d['target_offset'])")
read -r II TP LRA TH OFF <<<"$mi"
ffmpeg -y -loglevel error -i "$OUT/video.mp4" -i "$OUT/mix.wav" \
  -af "loudnorm=I=-14:TP=-1.5:LRA=11:measured_I=$II:measured_TP=$TP:measured_LRA=$LRA:measured_thresh=$TH:offset=$OFF:linear=true,aresample=192000,alimiter=limit=0.72:attack=1:release=60:level=false,aresample=48000" \
  -c:v copy -c:a aac -b:a 320k -ar 48000 -shortest -movflags +faststart "$OUT/${EP}_animatic.mp4"

# captions file for the YouTube CC track
python3 - "$OUT/cues.json" "$OUT/${EP}.srt" <<'PY'
import json, sys
c = json.load(open(sys.argv[1]))
def ts(t):
    ms = int(round(t * 1000)); h, ms = divmod(ms, 3600000); m, ms = divmod(ms, 60000); s, ms = divmod(ms, 1000)
    return f"{h:02}:{m:02}:{s:02},{ms:03}"
names = {'mom': 'MOM'}
lines = sorted(c['lines'], key=lambda l: l['t0'])
with open(sys.argv[2], 'w') as f:
    for i, l in enumerate(lines, 1):
        end = min(l['t1'] + 0.4, lines[i]['t0'] if i < len(lines) else l['t1'] + 0.4)
        who = names.get(l['who'], l['who'].upper())
        f.write(f"{i}\n{ts(l['t0'])} --> {ts(end)}\n{who}: {l['text']}\n\n")
PY

# thumbnail 1280x720 (style bible §9.2)
node render.cjs "$EP" --thumb "$THUMB_FRAME" --text "$THUMB_TEXT" ${THUMB_CAM:+--cam "$THUMB_CAM"}
ffmpeg -y -loglevel error -i "$OUT/thumbnail_full.jpg" -vf scale=1280:720:flags=lanczos -q:v 2 "$OUT/thumbnail.jpg"
ffmpeg -y -loglevel error -i "$OUT/thumbnail.jpg" -vf scale=160:90 "$OUT/thumbnail_160.jpg"

ffmpeg -hide_banner -nostats -i "$OUT/${EP}_animatic.mp4" -af ebur128=peak=true -f null - 2>&1 | grep -E "^\s+(I|Peak):" || true
echo "done: $OUT/${EP}_animatic.mp4"
