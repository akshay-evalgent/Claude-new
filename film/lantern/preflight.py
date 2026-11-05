"""Pre-flight: measure the finished files against the retention and sound rules from the study.

Rules (from film/viral-study and the earlier film test in film/NOTE.md):
  hook     frame one is not black and something moves in the first second
  pace     no stretch of unchanged picture longer than 2.0 s
  black    no black run longer than 0.3 s (a long black reads as a broken film)
  end      frozen end hold under 1.4 s
  sound    -14 LUFS integrated (+-1), true peak <= -1 dBTP
  cuts     share of cuts that land on the 0.75 s beat grid

  python3 preflight.py out/final/*.mp4  -> prints a table and writes out/final/preflight.json
"""
import json
import os
import re
import subprocess
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))


def probe(path):
    r = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration:stream=codec_type,codec_name,width,height,r_frame_rate,sample_rate,bit_rate',
                        '-of', 'json', path], capture_output=True, text=True)
    return json.loads(r.stdout)


def frames_gray(path, fps=10, w=160):
    r = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-vf', f'fps={fps},scale={w}:-2,format=gray', '-f', 'rawvideo', '-'],
                       capture_output=True)
    js = probe(path)
    v = [s for s in js['streams'] if s['codec_type'] == 'video'][0]
    h = int(round(v['height'] * w / v['width'] / 2) * 2)
    arr = np.frombuffer(r.stdout, np.uint8)
    n = len(arr) // (w * h)
    return arr[: n * w * h].reshape(n, h, w).astype(np.float32)


def loudness(path):
    r = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', path, '-map', '0:a', '-af', 'ebur128=peak=true', '-f', 'null', '-'],
                       capture_output=True, text=True)
    txt = r.stderr[r.stderr.rfind('Summary'):]
    I = float(re.search(r'I:\s+(-?[\d.]+) LUFS', txt).group(1))
    lra = float(re.search(r'LRA:\s+(-?[\d.]+) LU', txt).group(1))
    tp = float(re.search(r'Peak:\s+(-?[\d.]+) dBFS', txt).group(1))
    return I, tp, lra


def check(path, edl_key=None):
    fps = 10
    fr = frames_gray(path, fps)
    lum = fr.mean(axis=(1, 2))
    diff = np.abs(np.diff(fr, axis=0)).mean(axis=(1, 2))
    still = diff < 0.15
    longest, run, end_hold = 0, 0, 0
    for s in still:
        run = run + 1 if s else 0
        longest = max(longest, run)
    for s in still[::-1]:
        if s:
            end_hold += 1
        else:
            break
    dark = lum < 6.0
    blk, run = 0, 0
    for d in dark:
        run = run + 1 if d else 0
        blk = max(blk, run)
    first_move = next((i for i, d in enumerate(diff) if d > 0.15), len(diff)) / fps
    I, tp, lra = loudness(path)
    js = probe(path)
    v = [s for s in js['streams'] if s['codec_type'] == 'video'][0]
    out = dict(file=os.path.basename(path), duration=float(js['format']['duration']), size=f"{v['width']}x{v['height']}", fps=v['r_frame_rate'],
               first_frame_luma=round(float(lum[0]), 1), first_motion_s=round(first_move, 2),
               longest_still_s=round(longest / fps, 2), longest_black_s=round(blk / fps, 2), end_hold_s=round(end_hold / fps, 2),
               mean_change=round(float(diff.mean()), 2), lufs=I, true_peak=tp, lra=lra)
    if edl_key:
        import render
        edl = render.EDLS[edl_key]
        cuts, acc = [], 0.0
        for (_n, a, b) in edl[:-1]:
            acc += b - a
            cuts.append(acc)
        on = sum(1 for c in cuts if min(c % 0.75, 0.75 - c % 0.75) < 0.04)
        out['cuts'] = len(cuts)
        out['cuts_on_beat'] = f'{on}/{len(cuts)}'
        out['mean_shot_s'] = round(render.duration(edl) / len(edl), 2)
    rules = {
        'hook: frame one lit (luma > 20)': out['first_frame_luma'] > 20,
        'hook: motion within 1 s': out['first_motion_s'] <= 1.0,
        'pace: no still stretch > 2.0 s': out['longest_still_s'] <= 2.0,
        'black: no black run > 0.3 s': out['longest_black_s'] <= 0.3,
        'end: frozen end hold < 1.4 s': out['end_hold_s'] < 1.4,
        'sound: -14 LUFS +-1': abs(I + 14) <= 1.0,
        'sound: true peak <= -1 dBTP': tp <= -0.9,
    }
    out['rules'] = {k: ('PASS' if v_ else 'FAIL') for k, v_ in rules.items()}
    return out


if __name__ == '__main__':
    keys = {'master': 'master', 'the_wall': 'short_wall', 'two_lights': 'short_lights', 'the_loop': 'short_loop'}
    res = []
    for p in sys.argv[1:]:
        k = next((v for kk, v in keys.items() if kk in os.path.basename(p)), None)
        r = check(p, k)
        res.append(r)
        print(f"\n{r['file']}  {r['duration']:.2f}s {r['size']} {r['fps']}")
        for kk in ('first_frame_luma', 'first_motion_s', 'longest_still_s', 'longest_black_s', 'end_hold_s', 'mean_change', 'lufs', 'true_peak', 'lra', 'cuts', 'cuts_on_beat', 'mean_shot_s'):
            if kk in r:
                print(f'  {kk:18} {r[kk]}')
        for rule, st in r['rules'].items():
            print(f'  [{st}] {rule}')
    if res:
        outp = os.path.join(os.path.dirname(os.path.abspath(sys.argv[1])), 'preflight.json')
        json.dump(res, open(outp, 'w'), indent=1)
        print('\n->', outp)
