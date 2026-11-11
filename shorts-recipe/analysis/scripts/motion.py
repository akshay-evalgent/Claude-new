import sys, json, glob, os
import cv2, numpy as np
src, out = sys.argv[1], sys.argv[2]

def hist(fr):
    hsv = cv2.cvtColor(fr, cv2.COLOR_BGR2HSV)
    h = cv2.calcHist([hsv],[0,1,2],None,[16,8,8],[0,180,0,256,0,256])
    return cv2.normalize(h,h).flatten()

for f in sorted(glob.glob(os.path.join(src,"*.mp4"))):
    vid = os.path.basename(f)[:-4]
    cap = cv2.VideoCapture(f); fps = cap.get(cv2.CAP_PROP_FPS)
    prev=None; prevh=None; prevg=None; i=0
    frames=[]  # per-frame: t, cutscore, scale, dx, dy, rot, mad
    while True:
        ok, fr = cap.read()
        if not ok: break
        g = cv2.cvtColor(fr, cv2.COLOR_BGR2GRAY); h = hist(fr)
        rec = {"t": round(i/fps,3)}
        if prev is not None:
            rec["cut"] = float(1 - cv2.compareHist(prevh, h, cv2.HISTCMP_CORREL))
            rec["mad"] = float(np.mean(cv2.absdiff(g, prevg)))
            pts = cv2.goodFeaturesToTrack(prevg, 300, 0.01, 6)
            sc=1; dx=dy=rot=0; inl=0
            if pts is not None and len(pts) > 15:
                nxt, st, _ = cv2.calcOpticalFlowPyrLK(prevg, g, pts, None)
                a = pts[st==1]; b = nxt[st==1]
                if len(a) > 12:
                    M, mask = cv2.estimateAffinePartial2D(a, b, method=cv2.RANSAC, ransacReprojThreshold=1.5)
                    if M is not None:
                        sc = float(np.hypot(M[0,0], M[1,0])); rot = float(np.degrees(np.arctan2(M[1,0], M[0,0])))
                        # translation measured about image centre so zoom isn't read as pan
                        cx, cy = g.shape[1]/2, g.shape[0]/2
                        c2 = M @ np.array([cx, cy, 1])
                        dx, dy = float(c2[0]-cx), float(c2[1]-cy); inl = int(mask.sum())
            rec.update(scale=sc, dx=dx, dy=dy, rot=rot, inl=inl)
        frames.append(rec)
        prev=fr; prevh=h; prevg=g; i+=1
    # cut detection
    cuts=[0.0]
    for k,r in enumerate(frames[1:],1):
        if r["cut"] > 0.45 or (r["cut"] > 0.25 and r["mad"] > 25):
            if r["t"] - cuts[-1] > 0.2: cuts.append(r["t"])
    dur = len(frames)/fps; bounds = cuts + [dur]
    shots=[]
    for a,b in zip(bounds[:-1], bounds[1:]):
        seg=[r for r in frames if a < r["t"] < b and "scale" in r and r["inl"]>=10]
        z=float(np.prod([r["scale"] for r in seg])) if seg else 1
        px=float(sum(r["dx"] for r in seg)); py=float(sum(r["dy"] for r in seg)); ro=float(sum(r["rot"] for r in seg))
        jit=float(np.std([r["dx"] for r in seg])) if len(seg)>3 else 0
        mv=[]
        if z>1.04: mv.append(f"push-in x{z:.2f}")
        elif z<0.96: mv.append(f"pull-out x{z:.2f}")
        if abs(px)>20: mv.append(("pan-L" if px>0 else "pan-R")+f" {abs(px):.0f}px")   # content moves right => camera pans left
        if abs(py)>20: mv.append(("tilt-up" if py>0 else "tilt-down")+f" {abs(py):.0f}px")
        if abs(ro)>3: mv.append(f"roll {ro:.0f}deg")
        if not mv: mv.append("static/locked")
        shots.append({"start":round(a,2),"end":round(b,2),"len":round(b-a,2),"move":", ".join(mv),"zoom":round(z,3),"pan":round(px),"tilt":round(py),"jitter":round(jit,2)})
    json.dump({"id":vid,"fps":fps,"dur":dur,"shots":shots}, open(os.path.join(out,vid+".shots.json"),"w"), indent=1)
    lens=[s["len"] for s in shots]
    print(f"{vid}: {dur:.1f}s shots={len(shots)} avg={np.mean(lens):.2f}s med={np.median(lens):.2f}s first={lens[0]:.2f}s", flush=True)
