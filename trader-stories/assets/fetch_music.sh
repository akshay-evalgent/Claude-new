#!/bin/bash
# Re-download the music beds (Kevin MacLeod, incompetech.com, CC BY 4.0). They are not kept in git.
cd "$(dirname "$0")/music" || exit 1
while read -r t; do
  [ -z "$t" ] && continue
  [ -f "$t.mp3" ] || curl -s -A "trader-stories/0.1" -o "$t.mp3" "https://incompetech.com/music/royalty-free/mp3-royaltyfree/$(python3 -c 'import urllib.parse,sys;print(urllib.parse.quote(sys.argv[1]))' "$t.mp3")"
done < tracks.txt
