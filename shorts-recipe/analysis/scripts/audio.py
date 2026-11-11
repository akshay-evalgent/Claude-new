import sys, json, glob, os, subprocess, re
import numpy as np, soundfile as sf, librosa
wavdir, out = sys.argv[1], sys.argv[2]
rows=[]
for wf in sorted(glob.glob(os.path.join(out,"*.words.json"))):
    d=json.load(open(wf)); vid=d["id"]; W=d["words"]
    y,sr=sf.read(os.path.join(wavdir,vid+".wav"),dtype="float32"); dur=len(y)/sr
    # loudness
    r=subprocess.run(["ffmpeg","-nostats","-i",os.path.join(wavdir,vid+".wav"),"-af","ebur128","-f","null","-"],capture_output=True,text=True).stderr
    I=re.findall(r"I:\s+(-?[\d.]+) LUFS",r); LRA=re.findall(r"LRA:\s+([\d.]+) LU",r)
    # speech vs gap level
    def rms(a,b):
        s=y[int(a*sr):int(b*sr)]; return 20*np.log10(np.sqrt(np.mean(s**2))+1e-9) if len(s)>sr*0.05 else None
    sp=[rms(w["s"],w["e"]) for w in W]; sp=[x for x in sp if x is not None]
    gaps=[(W[i]["e"],W[i+1]["s"]) for i in range(len(W)-1) if W[i+1]["s"]-W[i]["e"]>0.25]
    gl=[rms(a+0.05,b-0.05) for a,b in gaps]; gl=[x for x in gl if x is not None]
    # tail after last word (payoff / outro)
    tail=dur-W[-1]["e"] if W else 0
    words=len(W); speak=W[-1]["e"]-W[0]["s"] if W else 1
    pauses=[round(b-a,2) for a,b in gaps]
    # pitch of narrator
    f0,vf,_=librosa.pyin(y[:sr*20],fmin=60,fmax=300,sr=sr)
    f0m=float(np.nanmedian(f0)) if np.any(~np.isnan(f0)) else 0
    rows.append(dict(id=vid,dur=round(dur,1),words=words,wps=round(words/speak,2),wpm=round(60*words/speak),
        first_word=W[0]["s"] if W else None,tail=round(tail,2),pauses_gt250ms=len(pauses),
        long_pauses_gt500=[p for p in pauses if p>0.5],lufs=I[-1] if I else None,lra=LRA[-1] if LRA else None,
        speech_db=round(float(np.median(sp)),1),gap_db=round(float(np.median(gl)),1) if gl else None,f0_hz=round(f0m)))
    print(rows[-1],flush=True)
json.dump(rows,open(os.path.join(out,"audio_summary.json"),"w"),indent=1)
