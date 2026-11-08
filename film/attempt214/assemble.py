"""ATTEMPT 214 · assemble the film: concatenate rendered shots, attach the mix at -14 LUFS, run pre-flight.

  python3 assemble.py master   -> out/final/ATTEMPT_214_master_1080p.mp4
  python3 assemble.py short    -> out/final/ATTEMPT_214_short_1080x1920.mp4
  python3 assemble.py preflight
"""
import importlib.util
import json
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
from score import SHOTS, SHORT  # noqa: E402


def lantern(name):
    spec = importlib.util.spec_from_file_location('lantern_' + name, os.path.join(HERE, '..', 'lantern', name + '.py'))
    m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m); return m


def concat(files, out):
    lst = out + '.txt'
    with open(lst, 'w') as f:
        for p in files:
            f.write(f"file '{os.path.abspath(p)}'\n")
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', lst, '-c:v', 'libx264', '-preset', 'slow', '-tune', 'animation', '-crf', '17',
                    '-maxrate', '20M', '-bufsize', '40M', '-pix_fmt', 'yuv420p', '-r', '24', '-g', '48', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', out], check=True)
    os.remove(lst)


def frames(path):
    r = subprocess.run(['ffprobe', '-v', 'error', '-count_frames', '-select_streams', 'v:0', '-show_entries', 'stream=nb_read_frames', '-of', 'csv=p=0', path], capture_output=True, text=True)
    return int(r.stdout.strip() or 0)


def main(key):
    mux = lantern('mux')
    os.makedirs(os.path.join(HERE, 'out/final'), exist_ok=True)
    if key == 'master':
        files = [os.path.join(HERE, 'out/shots', f'{n}.mp4') for n, d in SHOTS]
        for (n, d), f in zip(SHOTS, files):
            got = frames(f)
            assert got == round(d * 24), f'{n}: {got} frames, expected {round(d * 24)}'
        silent = os.path.join(HERE, 'out/master_silent.mp4'); concat(files, silent)
        subprocess.run([sys.executable, os.path.join(HERE, 'score.py'), 'master', os.path.join(HERE, 'out/audio/master_mix.wav')], check=True)
        mux.mux(silent, os.path.join(HERE, 'out/audio/master_mix.wav'), os.path.join(HERE, 'out/final/ATTEMPT_214_master_1080p.mp4'))
    elif key == 'short':
        files = [os.path.join(HERE, 'out/shots_v', f'{n}_v.mp4') for n, a, b in SHORT]
        for (n, a, b), f in zip(SHORT, files):
            got = frames(f)
            assert got == round((b - a) * 24), f'{n}: {got} frames, expected {round((b - a) * 24)}'
        silent = os.path.join(HERE, 'out/short_silent.mp4'); concat(files, silent)
        subprocess.run([sys.executable, os.path.join(HERE, 'score.py'), 'short', os.path.join(HERE, 'out/audio/short_mix.wav')], check=True)
        mux.mux(silent, os.path.join(HERE, 'out/audio/short_mix.wav'), os.path.join(HERE, 'out/final/ATTEMPT_214_short_1080x1920.mp4'))
    elif key == 'preflight':
        pf = lantern('preflight')
        res = []
        for f in ('ATTEMPT_214_master_1080p.mp4', 'ATTEMPT_214_short_1080x1920.mp4'):
            p = os.path.join(HERE, 'out/final', f)
            if not os.path.exists(p):
                continue
            r = pf.check(p)
            res.append(r)
            print(f"\n{r['file']}  {r['duration']:.2f}s {r['size']} {r['fps']}")
            for k in ('first_frame_luma', 'first_motion_s', 'longest_still_s', 'longest_black_s', 'end_hold_s', 'mean_change', 'lufs', 'true_peak', 'lra'):
                print(f'  {k:18} {r[k]}')
            for rule, st in r['rules'].items():
                print(f'  [{st}] {rule}')
        json.dump(res, open(os.path.join(HERE, 'out/final/preflight.json'), 'w'), indent=1)


if __name__ == '__main__':
    main(sys.argv[1])
