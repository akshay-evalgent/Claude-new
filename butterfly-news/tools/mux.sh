#!/bin/bash
# Master: normalise the mix to -14 LUFS / -1.2 dBTP (two-pass loudnorm), add light grain, mux.
set -e; cd "$(dirname "$0")/.."
M=$(ffmpeg -hide_banner -i audio/mix_raw.wav -af loudnorm=I=-14:TP=-1.2:LRA=11:print_format=json -f null - 2>&1 | sed -n '/^{/,/^}/p')
g() { echo "$M" | python3 -c "import json,sys; print(json.load(sys.stdin)['$1'])"; }
ffmpeg -y -loglevel error -i audio/mix_raw.wav -af "loudnorm=I=-14:TP=-1.2:LRA=11:measured_I=$(g input_i):measured_TP=$(g input_tp):measured_LRA=$(g input_lra):measured_thresh=$(g input_thresh):offset=$(g target_offset):linear=true,aresample=48000" -c:a pcm_s16le audio/mix_master.wav
ffmpeg -y -loglevel error -i out/video_only.mp4 -i audio/mix_master.wav -vf "noise=alls=2:allf=t,format=yuv420p" -c:v libx264 -preset slow -tune grain -crf 21 -maxrate 14M -bufsize 28M -c:a aac -b:a 256k -movflags +faststart -shortest out/butterfly-caption-news.mp4
ffmpeg -hide_banner -i out/butterfly-caption-news.mp4 -af ebur128=peak=true -f null - 2>&1 | grep -E "^\s+(I|Peak):"
