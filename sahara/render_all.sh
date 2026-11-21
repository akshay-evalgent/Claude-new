#!/bin/bash
# Renders every shot (resumable: finished frames are skipped).
cd "$(dirname "$0")"
for s in H1 H2 H3 R1 R2 S1 S2 A1 W1 M1 M2 M3 D1 D2 N1 K1 P1 P2; do
  /opt/blender/blender-4.5.16-linux-x64/blender -b -P scene.py -- --shot $s --anim --pct 50 --samples 12 > out/render_$s.log 2>&1
  grep RENDERED out/render_$s.log
done
