#!/usr/bin/env bash
# Render an episode at full quality and normalise loudness for YouTube (-14 LUFS, -1.5 dBTP).
# usage: scripts/finish.sh <CompositionId> <out-basename> [extra remotion flags, e.g. --gl=swangle]
set -euo pipefail
ID=$1; OUT=$2; shift 2
BROWSER=${REMOTION_BROWSER:-/opt/pw-browsers/chromium_headless_shell}
npx remotion render src/index.ts "$ID" "$OUT.raw.mp4" --browser-executable="$BROWSER" "$@"
ffmpeg -loglevel error -y -i "$OUT.raw.mp4" -c:v copy -af loudnorm=I=-14:TP=-1.5:LRA=11 -ar 48000 -c:a aac -b:a 192k -movflags +faststart "$OUT.mp4"
rm -f "$OUT.raw.mp4"
echo "done: $OUT.mp4"
