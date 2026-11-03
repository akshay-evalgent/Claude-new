"""Turn media_src/ (downloads + live captures) into media/ (graded frame sequences + stills)
and media/manifest.js. Run after tools/fetch_media.sh and the capture scripts.

    python3 prep_media.py            # everything
    python3 prep_media.py code fish  # only some clips
"""
import json
import os
import shutil
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'media_src')
OUT = os.path.join(HERE, 'media')

GRADES = {
    'cool': 'eq=contrast=1.12:brightness=-0.035:saturation=0.78,colorbalance=rs=-0.06:gs=-0.01:bs=0.09:rm=-0.03:bm=0.05',
    'night': 'eq=contrast=1.18:brightness=-0.06:saturation=0.7,colorbalance=rs=-0.08:bs=0.12:bm=0.06',
    'gold': 'eq=contrast=1.18:brightness=-0.02:saturation=1.15,colorbalance=rs=0.09:gs=0.03:bs=-0.1:rh=0.05:bh=-0.06',
    'goldbright': 'eq=contrast=1.1:brightness=0.04:saturation=1.15:gamma=1.15,colorbalance=rs=0.09:gs=0.03:bs=-0.1:rh=0.05:bh=-0.06',
    'teal': 'eq=contrast=1.2:brightness=-0.03:saturation=1.1,colorbalance=rs=-0.1:gs=0.02:bs=0.08',
    'dusk': 'eq=contrast=1.12:saturation=0.95,colorbalance=rs=0.04:bs=-0.02',
    'none': 'null',
}

# name: source, start (s), duration (s), mode, grade, extra
CLIPS = {
    'code':     ('stock/coverr-coding-developer-7198.mp4', 1.0, 4.0, 'vfill', 'night', {'fx': .66}),
    'typing':   ('stock/coverr-a-female-s-hands-typing-on-laptop-7520.mp4', 3.0, 3.0, 'vfill', 'night', {'fx': .62}),
    'coins':    ('stock/coverr-a-heap-of-old-money-illuminated-in-studio-lighting-9527.mp4', 0.0, 3.2, 'vfill', 'goldbright', {'fx': .5}),
    'fish':     ('stock/Fish_Zaitunay_Bay_10.webm', 1.0, 4.5, 'vfill', 'teal', {'fx': .5}),
    'crowd':    ('stock/coverr-a-crowded-street-3991.mp4', 1.5, 4.0, 'vfill', 'cool', {'fx': .45, 'fps': 25}),
    'bridge':   ('stock/coverr-crowded-bridge-8424.mp4', 1.0, 3.0, 'vfill', 'cool', {'fx': .5}),
    'phone2':   ('stock/coverr-a-man-typing-on-his-phone-while-sitting-on-the-curb-56.mp4', 4.0, 3.0, 'vfill', 'cool', {'fx': .52}),
    'cheer':    ('stock/coverr-cheering-crowd-1136.mp4', 0.5, 6.0, 'vfill', 'cool', {'fx': .5}),
    'broker':   ('stock/coverr-a-broker-working-with-a-candlestick-chart-7524.mp4', 2.0, 3.0, 'vfill', 'night', {'fx': .62}),
}
# live-demo captures (virtual-clock sequences, one frame per 160 ms of app time)
SEQS = {'graph': 'cap/graph', 'env': 'cap/env', 'sim': 'cap/sim', 'report': 'cap/report'}
SEQ_FPS = 1000 / 160
STILLS = {
    'gh_repo': 'cap/gh_repo.jpg', 'gh_readme': 'cap/gh_readme.jpg', 'landing': 'cap/landing.jpg', 'console': 'cap/console.jpg',
    'interaction': 'cap/interaction.jpg', 'interaction_agents': 'cap/interaction_agents.jpg', 'graph_full': 'cap/graph_full.jpg',
    'logo': 'repo/logo.jpg', 'logo_left': 'repo/logo_left.jpg', 'shot_home': 'repo/shot1_home.png', 'shot_chat': 'repo/shot5_chat.png',
    'hlm_cover': 'repo/hlm_cover.jpg',
}
# Red Chamber, 1791 Cheng-Gao edition, vol. 1 (NLC scan, Public Domain Mark): page -> crop
HLM_PAGES = {'hlm_jiamu': (12, 'left'), 'hlm_yuanchun': (14, 'left'), 'hlm_liwan': (18, 'left'), 'hlm_baochai': (22, 'left'),
             'hlm_poem': (22, 'right'), 'hlm_preface': (4, 'full')}


def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode:
        print(r.stderr[-1500:])
        raise SystemExit('failed: ' + ' '.join(cmd[:6]))


def probe(path):
    r = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height,r_frame_rate',
                        '-of', 'json', path], capture_output=True, text=True)
    s = json.loads(r.stdout)['streams'][0]
    n, d = s['r_frame_rate'].split('/')
    return s['width'], s['height'], float(n) / float(d)


def clip(name, spec, manifest):
    src, ss, dur, mode, grade, ex = spec
    path = os.path.join(SRC, src)
    w, h, fps = probe(path)
    fps = ex.get('fps', fps)
    d = os.path.join(OUT, name)
    shutil.rmtree(d, ignore_errors=True)
    os.makedirs(d)
    if mode == 'vfill':
        cw = min(w, int(h * 9 / 16)) // 2 * 2
        cx = int(max(0, min(w - cw, ex.get('fx', .5) * w - cw / 2)))
        geo = f'crop={cw}:{h}:{cx}:0,scale=1080:1920:flags=lanczos,unsharp=5:5:0.6'
        ow, oh = 1080, 1920
    elif mode == 'band':
        geo = 'scale=1080:-2:flags=lanczos,unsharp=5:5:0.5'
        ow, oh = 1080, int(round(1080 * h / w / 2) * 2)
    else:
        geo = 'null'
        ow, oh = w, h
    vf = f'fps={fps},{geo},{GRADES[grade]}'
    run(['ffmpeg', '-v', 'error', '-y', '-ss', str(ss), '-t', str(dur), '-i', path, '-vf', vf, '-q:v', '3', os.path.join(d, 'f_%04d.jpg')])
    # ffmpeg numbers from 1; shift to 0-based
    files = sorted(os.listdir(d))
    for i, f in enumerate(files):
        os.rename(os.path.join(d, f), os.path.join(d, f'f_{i:04d}.jpg'))
    manifest[name] = {'dir': f'media/{name}', 'n': len(files), 'fps': fps, 'w': ow, 'h': oh}
    print(f'{name:10} {len(files)} frames @ {fps:.2f} fps  {ow}x{oh}')


def seq(name, rel, manifest):
    sdir = os.path.join(SRC, rel)
    if not os.path.isdir(sdir):
        print('skip (not captured yet):', name)
        return
    d = os.path.join(OUT, name)
    shutil.rmtree(d, ignore_errors=True)
    os.makedirs(d)
    files = sorted(f for f in os.listdir(sdir) if f.endswith('.jpg'))
    for i, f in enumerate(files):
        shutil.copyfile(os.path.join(sdir, f), os.path.join(d, f'f_{i:04d}.jpg'))
    manifest[name] = {'dir': f'media/{name}', 'n': len(files), 'fps': SEQ_FPS, 'w': 2880, 'h': 1800}
    print(f'{name:10} {len(files)} capture frames')


def stills(manifest):
    d = os.path.join(OUT, 'stills')
    os.makedirs(d, exist_ok=True)
    st = {}
    from PIL import Image
    for k, rel in STILLS.items():
        p = os.path.join(SRC, rel)
        if not os.path.exists(p):
            print('missing still', rel)
            continue
        im = Image.open(p)
        if im.mode in ('RGBA', 'LA', 'P'):
            im = im.convert('RGBA')
            bg = Image.new('RGBA', im.size, (255, 255, 255, 255))
            bg.alpha_composite(im)
            im = bg
        im.convert('RGB').save(os.path.join(d, k + '.jpg'), quality=93)
        st[k] = f'media/stills/{k}.jpg'
    pdf = os.path.join(SRC, 'ia', 'hlm_v1.pdf')
    if os.path.exists(pdf):
        tmp = os.path.join(d, '_pg')
        for k, (pg, side) in HLM_PAGES.items():
            run(['pdftoppm', '-f', str(pg), '-l', str(pg), '-r', '200', '-jpeg', '-jpegopt', 'quality=93', '-singlefile', pdf, tmp])
            im = Image.open(tmp + '.jpg')
            W, H = im.size
            if side == 'left':
                im = im.crop((0, 0, W // 2, H))
            elif side == 'right':
                im = im.crop((W // 2, 0, W, H))
            im.save(os.path.join(d, k + '.jpg'), quality=92)
            st[k] = f'media/stills/{k}.jpg'
        os.remove(tmp + '.jpg')
    manifest['__stills__'] = st
    print('stills:', ', '.join(st))


def main():
    os.makedirs(OUT, exist_ok=True)
    mpath = os.path.join(OUT, 'manifest.js')
    manifest = {}
    if os.path.exists(mpath):
        txt = open(mpath).read()
        a = txt.index('window.MEDIA = ') + len('window.MEDIA = ')
        b = txt.index(';\nwindow.STILLS')
        manifest = json.loads(txt[a:b])
        c = txt.index('window.STILLS = ') + len('window.STILLS = ')
        manifest['__stills__'] = json.loads(txt[c:txt.rindex(';')])
    only = set(sys.argv[1:])
    for k, v in CLIPS.items():
        if not only or k in only:
            clip(k, v, manifest)
    for k, v in SEQS.items():
        if not only or k in only:
            seq(k, v, manifest)
    if not only or 'stills' in only:
        stills(manifest)
    st = manifest.pop('__stills__', {})
    with open(mpath, 'w') as f:
        f.write('window.MEDIA = ' + json.dumps(manifest, indent=1) + ';\n')
        f.write('window.STILLS = ' + json.dumps(st, indent=1) + ';\n')
    print('wrote', mpath)


if __name__ == '__main__':
    main()
