#!/bin/bash
# Render + mix + mux a list of explainers in sequence.  usage: queue.sh comp:videodir:outname [...]
M=/home/user/Claude-new/trader-stories/motion
E=/home/user/Claude-new/trader-stories/explainers
PY=/tmp/claude-0/-home-user-Claude-new/3a8fcc30-d052-55b8-8316-44455840ca23/scratchpad/tts/bin/python
export REMOTION_BROWSER=/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell
for job in "$@"; do
  IFS=: read -r comp dir name gl <<< "$job"
  echo "=== $comp $(date +%H:%M)"
  (cd $M && GL=${gl:-default} CONCURRENCY=4 node scripts/render-ex.mjs $comp out/ex/$comp-video.mp4 2>&1 | grep -E "^(100|50)%|done|Error" ) || { echo "render failed $comp"; continue; }
  (cd /tmp && $PY -I $E/tools/mix.py $E/$dir) || { echo "mix failed $comp"; continue; }
  (cd $E/$dir && $E/tools/mux.sh $M/out/ex/$comp-video.mp4 build/mix.wav build/$name.mp4)
  echo "=== done $comp $(date +%H:%M)"
done
