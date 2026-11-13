#!/bin/bash
# sheet.sh name t1 t2 ...  -> build/sheet_name.jpg (contact sheet, 6 per row)
name=$1; shift; rm -f build/stills/*.jpg
time node render.mjs stills "$@" 2>&1 | grep -v '^$' | head -20
n=$#; cols=$(( n < 6 ? n : 6 )); rows=$(( (n + cols - 1) / cols ))
ffmpeg -y -loglevel error -pattern_type glob -i 'build/stills/*.jpg' -vf "scale=432:768,tile=${cols}x${rows}" -frames:v 1 build/sheet_$name.jpg
