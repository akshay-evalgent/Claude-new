import sys, subprocess, numpy as np, cv2
out = sys.argv[1]; x0, y0, x1, y1 = [int(v) for v in sys.argv[2:6]]; frames = [int(v) for v in sys.argv[6:]]
tiles = []
for f in frames:
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", "seg.mkv", "-vf", f"select=eq(n\\,{f})", "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "bgr24", "-"], capture_output=True).stdout
    im = np.frombuffer(raw, np.uint8).reshape(1080, 1920, 3)[y0:y1, x0:x1].copy()
    s = 400 / (x1 - x0); im = cv2.resize(im, (400, int((y1 - y0) * s)))
    for gx in range((x0 // 100 + 1) * 100, x1, 100):
        X = int((gx - x0) * s); cv2.line(im, (X, 0), (X, 8), (0, 255, 255), 2); cv2.putText(im, str(gx), (X + 2, 20), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 255, 255), 1)
    for gy in range((y0 // 100 + 1) * 100, y1, 100):
        Y = int((gy - y0) * s); cv2.line(im, (0, Y), (8, Y), (0, 255, 255), 2); cv2.putText(im, str(gy), (10, Y + 4), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 255, 255), 1)
    cv2.putText(im, str(f), (330, im.shape[0] - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 255), 2); tiles.append(im)
while len(tiles) % 5: tiles.append(np.zeros_like(tiles[0]))
cv2.imwrite(out, np.vstack([np.hstack(tiles[i:i + 5]) for i in range(0, len(tiles), 5)]))
