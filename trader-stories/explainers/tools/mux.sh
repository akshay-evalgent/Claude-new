#!/bin/bash
# Mux rendered video with the mix, two-pass loudness normalised to -14 LUFS.
# usage: mux.sh VIDEO.mp4 MIX.wav OUT.mp4
set -e
V=$1; M=$2; O=$3
J=$(ffmpeg -hide_banner -i "$M" -af loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json -f null - 2>&1 | sed -n '/^{/,/^}/p')
g(){ echo "$J" | python3 -c "import json,sys;print(json.load(sys.stdin)['$1'])"; }
ffmpeg -y -v error -i "$V" -i "$M" -map 0:v -map 1:a -c:v copy \
  -af "loudnorm=I=-14:TP=-1.5:LRA=11:measured_I=$(g input_i):measured_TP=$(g input_tp):measured_LRA=$(g input_lra):measured_thresh=$(g input_thresh):offset=$(g target_offset):linear=true,aresample=48000" \
  -c:a aac -b:a 256k -shortest -movflags +faststart "$O"
ffmpeg -hide_banner -i "$O" -af ebur128 -f null - 2>&1 | grep -E "^\s+I:" | tail -1
