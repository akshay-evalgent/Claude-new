#!/bin/bash
# Render every frame in resumable chunks, each in a fresh browser, then report.
cd "$(dirname "$0")/.."
N=$(python3 -c "import json; print(round(json.load(open('src/timeline.json'))['anchors']['end']*24))")
for a in $(seq 0 100 $((N-1))); do
  b=$((a+100)); [ $b -gt $N ] && b=$N
  H=1920 FROM=$a TO=$b node build/render.cjs >> build/render.log 2>&1 || echo "chunk $a failed" >> build/render.log
done
echo "ALL DONE $(ls build/frames | grep -c '^f[0-9]*\.png$') of $N" >> build/render.log
