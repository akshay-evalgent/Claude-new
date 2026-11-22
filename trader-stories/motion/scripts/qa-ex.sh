#!/bin/bash
# QA contact sheets: one frame per shot at 60% of its length.  usage: qa-ex.sh <composition-id> <timing.json> <outdir> [pos=0.6]
ID=$1; TJ=$2; OUT=$3; POS=${4:-0.6}
FR=$(python3 -c "
import json,sys
t=json.load(open('$TJ')); sh={}
for b in t['beats']:
    s=sh.setdefault(b['shot'],[b['start'],0]); s[1]=b['start']+b['frames']-s[0]
print(' '.join(str(int(a+l*$POS)) for a,l in sh.values()))")
rm -rf "$OUT"; node "$(dirname "$0")/stills-ex.mjs" "$ID" "$OUT" $FR > /dev/null 2>&1
python3 -I - "$OUT" <<'PY'
import sys, glob
from PIL import Image, ImageDraw
d=sys.argv[1]; fs=sorted(glob.glob(d+'/*.jpg')); ims=[Image.open(f) for f in fs]
w,h=ims[0].size; cols=4 if w>h else 6; s=0.5 if w>h else 0.5
tw,th=int(w*s),int(h*s); per=cols*(3 if w>h else 2)
for k in range(0,len(ims),per):
    c=ims[k:k+per]; rows=(len(c)+cols-1)//cols; sh=Image.new('RGB',(tw*cols,th*rows),'black'); dr=ImageDraw.Draw(sh)
    for i,im in enumerate(c):
        sh.paste(im.resize((tw,th)),((i%cols)*tw,(i//cols)*th)); dr.text(((i%cols)*tw+6,(i//cols)*th+4),fs[k+i].split('_')[-1][:-4],fill='red')
    sh.save(f'{d}/sheet{k//per+1}.jpg',quality=80)
print(len(ims),'stills')
PY
