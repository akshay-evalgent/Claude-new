"""Cut one panel out of a 3x3 storyboard sheet (flow/GRIDS.md). Used by the assembler and the WanGP batch builder."""
import numpy as np
from PIL import Image


def trim_gutters(im):
    """Cut light gutters/borders off a panel crop."""
    a = np.asarray(im.convert("L")).astype(np.float32)
    rows = np.flatnonzero(a.mean(1) < 200); cols = np.flatnonzero(a.mean(0) < 200)
    if len(rows) < a.shape[0] * 0.5 or len(cols) < a.shape[1] * 0.5:
        return im
    return im.crop((cols[0], rows[0], cols[-1] + 1, rows[-1] + 1))


def cut_panel(grid_path, k, rows=3, cols=3):
    """Panel k (0-based, left to right, top to bottom) of a storyboard sheet, gutters removed."""
    g = Image.open(grid_path).convert("RGB")
    cw, ch = g.width / cols, g.height / rows
    r, c = divmod(k, cols)
    ix, iy = cw * 0.02, ch * 0.02
    cell = g.crop((int(c * cw + ix), int(r * ch + iy), int((c + 1) * cw - ix), int((r + 1) * ch - iy)))
    return trim_gutters(cell)


def cover(im, w, h):
    """Scale and centre-crop an image to exactly w x h."""
    s = max(w / im.width, h / im.height)
    big = im.resize((max(w, round(im.width * s)), max(h, round(im.height * s))), Image.LANCZOS)
    x0, y0 = (big.width - w) // 2, (big.height - h) // 2
    return big.crop((x0, y0, x0 + w, y0 + h))
