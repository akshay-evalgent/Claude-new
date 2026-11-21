#!/bin/bash
# ./scan.sh clip [step]  -> out/scan_clip.jpg, one tile per step seconds
/opt/blender/blender-4.5.16-linux-x64/blender -b -P scan.py -- $1 ${2:-0.5} 2>&1 | grep -E "SCANNED|Error|Traceback"
n=$(ls out/scan_$1 | wc -l); cols=$(( n < 12 ? n : 12 )); rows=$(( (n + cols - 1) / cols ))
ffmpeg -loglevel error -y -pattern_type glob -i "out/scan_$1/*.png" -vf "tile=${cols}x${rows}" -q:v 4 out/scan_$1.jpg
