"""Assemble index.html: timeline, shaders and score inlined into one self-contained page."""
import base64, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
html = (root/'src/index.template.html').read_text()
for key, f in [('COMMON','common.glsl'),('WATCH','scene_watch.glsl'),('EXT','scene_ext.glsl'),('ROOM','scene_room.glsl'),
               ('LIVING','scene_living.glsl'),('MAIN','main.glsl'),('POST','post.glsl'),('TIMELINE','timeline.json')]:
    html = html.replace(f'%%{key}%%', (root/'src'/f).read_text())
FONTS = [('Inter', 400, 'normal', '/usr/share/fonts/opentype/inter/Inter-Regular.otf', 'opentype'),
         ('Inter', 600, 'normal', '/usr/share/fonts/opentype/inter/Inter-SemiBold.otf', 'opentype'),
         ('Inter', 500, 'italic', '/usr/share/fonts/opentype/inter/Inter-MediumItalic.otf', 'opentype'),
         ('Liberation Serif', 400, 'normal', '/usr/share/fonts/truetype/liberation/LiberationSerif-Regular.ttf', 'truetype'),
         ('Liberation Serif', 400, 'italic', '/usr/share/fonts/truetype/liberation/LiberationSerif-Italic.ttf', 'truetype'),
         ('DejaVu Sans', 700, 'normal', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 'truetype'),
         ('DejaVu Serif', 400, 'normal', '/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf', 'truetype')]
css = []
for fam, w, st, path, fmt in FONTS:
    mime = 'font/otf' if fmt == 'opentype' else 'font/ttf'
    data = base64.b64encode(pathlib.Path(path).read_bytes()).decode()
    css.append(f"  @font-face {{ font-family: '{fam}'; font-weight: {w}; font-style: {st}; src: url(data:{mime};base64,{data}) format('{fmt}'); }}")
html = html.replace('%%FONTS%%', '\n'.join(css))
score = root/'src/score.m4a'
html = html.replace('%%SCORE%%', 'data:audio/mp4;base64,' + base64.b64encode(score.read_bytes()).decode() if score.exists() else '')
(root/'index.html').write_text(html)
print('index.html', len(html)//1024, 'KB')
