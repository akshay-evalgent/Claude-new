"""Assemble index.html: timeline, shaders and score inlined into one self-contained page."""
import base64, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
html = (root/'src/index.template.html').read_text()
for key, f in [('COMMON','common.glsl'),('WATCH','scene_watch.glsl'),('EXT','scene_ext.glsl'),('ROOM','scene_room.glsl'),
               ('LIVING','scene_living.glsl'),('MAIN','main.glsl'),('POST','post.glsl'),('TIMELINE','timeline.json')]:
    html = html.replace(f'%%{key}%%', (root/'src'/f).read_text())
score = root/'src/score.m4a'
html = html.replace('%%SCORE%%', 'data:audio/mp4;base64,' + base64.b64encode(score.read_bytes()).decode() if score.exists() else '')
(root/'index.html').write_text(html)
print('index.html', len(html)//1024, 'KB')
