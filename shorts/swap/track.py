# track.py: person instance masks + track ids for every frame of seg.mkv -> det/NNNN.npz (boxes, ids, conf, masks at half res)
import os, numpy as np, cv2
from ultralytics import YOLO
os.makedirs("det", exist_ok=True)
m = YOLO("yolo11m-seg.pt")
res = m.track("seg.mkv", classes=[0], imgsz=1024, conf=0.25, retina_masks=True, stream=True, persist=True, tracker="bytetrack.yaml", verbose=False)
for i, r in enumerate(res):
    h, w = r.orig_shape
    if r.masks is None or r.boxes.id is None:
        np.savez_compressed(f"det/{i:04d}.npz", boxes=np.zeros((0, 4)), ids=np.zeros(0), conf=np.zeros(0), masks=np.zeros((0, h // 2, w // 2), bool)); continue
    mk = r.masks.data.cpu().numpy()
    half = np.stack([cv2.resize(x.astype(np.uint8), (w // 2, h // 2), interpolation=cv2.INTER_AREA) > 0 for x in mk])
    np.savez_compressed(f"det/{i:04d}.npz", boxes=r.boxes.xyxy.cpu().numpy(), ids=r.boxes.id.cpu().numpy(), conf=r.boxes.conf.cpu().numpy(), masks=half)
    if i % 50 == 0: print(i, len(mk), flush=True)
print("done", i + 1)
