"""Inline the plate, masks and score into one self-contained index.html."""
import base64, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
def b64(p, mime): return f"data:{mime};base64," + base64.b64encode((root/p).read_bytes()).decode()
html = (root/'src/index.template.html').read_text()
html = html.replace('%%PLATE%%', b64('src/plate.jpg', 'image/jpeg'))
html = html.replace('%%MASKS%%', b64('src/masks.png', 'image/png'))
html = html.replace('%%SCORE%%', b64('src/score.m4a', 'audio/mp4'))
(root/'index.html').write_text(html)
print('index.html', len(html)//1024, 'KB')
