#!/bin/bash
# Join the locally rendered frames and the Kaggle segments into the final film with its mix.
set -e
cd "$(dirname "$0")/.."
KG=${KG:-kaggle}
mkdir -p kaggle/out build/segs
# 1. the local part: frames 0..570
ffmpeg -y -loglevel error -framerate 24 -start_number 0 -i build/frames/f%04d.png -frames:v 571 -c:v libx264 -preset slow -crf 8 -pix_fmt yuv420p build/segs/seg_0000_0571.mp4
# 2. the Kaggle parts
for k in a b c d e; do
  $KG kernels output akkikmr/one-night-render-$k -p kaggle/out/$k > /dev/null 2>&1 || true
  cp kaggle/out/$k/seg_*.mp4 build/segs/ 2>/dev/null || echo "missing segment from notebook $k"
done
ls build/segs/seg_*.mp4 | sort > build/segs/list.txt
sed -i "s#^#file '$(pwd)/#; s#\$#'#" build/segs/list.txt
cat build/segs/list.txt
# 3. one picture, the mix, one encode
ffmpeg -y -loglevel error -f concat -safe 0 -i build/segs/list.txt -i build/mix.wav -map 0:v -map 1:a \
  -c:v libx264 -preset slow -crf 17 -pix_fmt yuv420p -color_primaries bt709 -color_trc bt709 -colorspace bt709 \
  -c:a aac -b:a 192k -shortest -movflags +faststart one-night-narrated.mp4
ffprobe -v error -show_entries format=duration:stream=codec_type,width,height,nb_frames -of compact one-night-narrated.mp4
