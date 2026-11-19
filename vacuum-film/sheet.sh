#!/bin/bash
# usage: ./sheet.sh name t1 t2 ...  -> out/sheet-name.jpg
name=$1; shift
rm -rf out/stills; node render.js stills "$@" 2>&1 | grep -E "ERR" | head -5
ffmpeg -loglevel error -y -pattern_type glob -i 'out/stills/*.png' -vf "scale=360:640,tile=$#x1" -q:v 3 out/sheet-$name.jpg
