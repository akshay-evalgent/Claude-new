#!/bin/bash
# Download the GPU-rendered segments from Kaggle, join them, and lay the voice and score mix over the picture.
set -e
cd "$(dirname "$0")/.."
KG=${KG:-kaggle}
mkdir -p kaggle/out build/segs
rm -f build/segs/*.mp4
for k in g1 g2; do
  [ -f kaggle/out/$k/seg_*.mp4 ] 2>/dev/null || $KG kernels output akkikmr/one-night-render-$k -p kaggle/out/$k > /dev/null
  cp kaggle/out/$k/seg_*.mp4 build/segs/
done
ls build/segs/seg_*.mp4 | sort | sed "s#^#file '$(pwd)/#; s#\$#'#" > build/segs/list.txt
cat build/segs/list.txt
ffmpeg -y -loglevel error -f concat -safe 0 -i build/segs/list.txt -i build/mix.wav -map 0:v -map 1:a \
  -c:v libx264 -preset slow -crf 17 -pix_fmt yuv420p -color_primaries bt709 -color_trc bt709 -colorspace bt709 \
  -c:a aac -b:a 192k -shortest -movflags +faststart one-night-narrated.mp4
ffprobe -v error -show_entries format=duration:stream=codec_type,width,height,nb_frames -of compact one-night-narrated.mp4
