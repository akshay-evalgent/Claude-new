"""Render LANTERN: the 16:9 master, the 9:16 Shorts, contact sheets.

  python3 render.py sheet master 0 150 24          # contact sheet: 24 frames between 0 s and 150 s
  python3 render.py video master out/master.mp4    # full render (silent); mux.py adds sound
  python3 render.py video short_wall out/short_wall_silent.mp4
"""
import os
import subprocess
import sys
import time
import multiprocessing as mp

import numpy as np
import skia

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import engine  # noqa: E402
import shots   # noqa: E402

FPS = 30
ORDER = ['S%02d' % i for i in range(1, 22)]


def _end(sc, t):
    shots.s21(sc, 6.0 + t)


shots.SHOTS['END'] = (5.0, _end)
shots.EVENTS['END'] = [(0.0, 'paper_slide'), (4.5, 'call_out'), (0.0, 'end_bed', 5.0)]

EDLS = {
    'master': [(n, 0.0, shots.SHOTS[n][0]) for n in ORDER],
    # The Wall: the hook, the years, the snooze, the declined call, the reveal, the line. Ends on the frame it began.
    'short_wall': [('S01', 0.0, 3.0), ('S05', 0.0, 4.125), ('S10', 0.0, 2.25), ('S13', 0.75, 2.25), ('S15', 4.0, 12.6), ('END', 0.0, 5.0)],
    # Two Lights: phone blue against lantern amber.
    'short_lights': [('S08', 1.2, 3.0), ('S12', 1.5, 4.5), ('S14', 1.0, 2.5), ('S15', 4.1, 7.6), ('S17', 0.0, 2.06), ('S18', 1.3, 4.2), ('END', 0.0, 5.0)],
    # The Loop: 4:30 to 4:30. Father becomes son becomes father.
    'short_loop': [('S01', 0.0, 3.75), ('S02', 0.0, 3.75), ('S05', 0.0, 4.5), ('S09', 0.3, 4.5), ('S15', 4.1, 9.6), ('S16', 0.8, 3.2),
                   ('S19', 3.0, 8.25), ('S20', 0.0, 7.5), ('S01', 0.0, 1.5)],
}
FORMATS = {'master': ('h', 1920, 1080), 'short_wall': ('v', 1080, 1920), 'short_lights': ('v', 1080, 1920), 'short_loop': ('v', 1080, 1920)}


def duration(edl):
    return sum(b - a for (_n, a, b) in edl)


def locate(edl, T):
    acc = 0.0
    for (n, a, b) in edl:
        d = b - a
        if T < acc + d - 1e-9:
            return n, a + (T - acc)
        acc += d
    n, a, b = edl[-1]
    return n, b - 1e-4


def draw(edl, T, canvas, W, H, fmt):
    name, lt = locate(edl, T)
    sc = engine.Scene(T)
    sc.fmt = fmt
    shots.SHOTS[name][1](sc, lt)
    engine.render(sc, canvas, W, H, fmt)
    return name, lt


def _worker(args):
    key, i0, i1, path = args
    fmt, W, H = FORMATS[key]
    edl = EDLS[key]
    cmd = ['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'bgra', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
           '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-tune', 'animation', '-pix_fmt', 'yuv420p',
           '-profile:v', 'high', '-g', '60', '-bf', '2', '-x264-params', 'threads=2',
           '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', path]
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    surf = skia.Surface(W, H)
    for i in range(i0, i1):
        draw(edl, i / FPS, surf.getCanvas(), W, H, fmt)
        proc.stdin.write(surf.makeImageSnapshot().toarray().tobytes())
    proc.stdin.close()
    proc.wait()
    return path


def video(key, out, workers=4):
    edl = EDLS[key]
    n = int(round(duration(edl) * FPS))
    os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
    tmp = os.path.abspath(out) + '.parts'
    os.makedirs(tmp, exist_ok=True)
    step = (n + workers - 1) // workers
    jobs = [(key, k * step, min(n, (k + 1) * step), os.path.join(tmp, f'p{k}.mp4')) for k in range(workers) if k * step < n]
    t0 = time.time()
    with mp.Pool(len(jobs)) as pool:
        parts = pool.map(_worker, jobs)
    lst = os.path.join(tmp, 'list.txt')
    with open(lst, 'w') as fh:
        for p in parts:
            fh.write(f"file '{p}'\n")
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', lst, '-c', 'copy', out], check=True)
    for p in parts:
        os.remove(p)
    os.remove(lst)
    os.rmdir(tmp)
    print(f'{key}: {n} frames in {time.time() - t0:.0f} s -> {out}')


def sheet(key, t0, t1, count, out, cols=4, scale=0.3):
    fmt, W, H = FORMATS[key]
    edl = EDLS[key]
    w, h = int(W * scale), int(H * scale)
    rows = (count + cols - 1) // cols
    big = skia.Surface(cols * w, rows * (h + 22))
    bc = big.getCanvas()
    bc.clear(skia.ColorWHITE)
    f = skia.Font(None, 15)
    surf = skia.Surface(w, h)
    for k in range(count):
        T = t0 + (t1 - t0) * k / max(1, count - 1) if count > 1 else t0
        T = min(T, duration(edl) - 1e-3)
        name, lt = draw(edl, T, surf.getCanvas(), w, h, fmt)
        x, y = (k % cols) * w, (k // cols) * (h + 22)
        bc.drawImage(surf.makeImageSnapshot(), x, y + 22)
        bc.drawString(f'{T:6.2f}s {name} {lt:5.2f}', x + 4, y + 16, f, skia.Paint(Color=skia.ColorBLACK, AntiAlias=True))
    big.makeImageSnapshot().save(out)
    print('sheet ->', out)


if __name__ == '__main__':
    mode, key = sys.argv[1], sys.argv[2]
    if mode == 'video':
        video(key, sys.argv[3], int(sys.argv[4]) if len(sys.argv) > 4 else 4)
    elif mode == 'sheet':
        t0, t1, cnt = float(sys.argv[3]), float(sys.argv[4]), int(sys.argv[5])
        out = sys.argv[6] if len(sys.argv) > 6 else f'/tmp/claude-0/-home-user-Claude-new/e300cb5f-bdcf-516f-8e8e-205a72e255f2/scratchpad/sheet_{key}_{int(t0)}_{int(t1)}.png'
        sheet(key, t0, t1, cnt, out)
    elif mode == 'frame':
        T = float(sys.argv[3])
        fmt, W, H = FORMATS[key]
        surf = skia.Surface(W, H)
        draw(EDLS[key], T, surf.getCanvas(), W, H, fmt)
        out = sys.argv[4]
        surf.makeImageSnapshot().save(out)
        print('frame ->', out)
