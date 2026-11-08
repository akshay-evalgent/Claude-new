// Reference illustration → knife strokes. Design each set as a flat, value-planned illustration made of shapes;
// each shape belongs to a group, and strokes never cross groups, so silhouettes stay crisp.
import { Strokes, KNIFE, hash } from './impasto.js';

export class Ref {
  constructor(pw, ph) {
    this.pw = pw; this.ph = ph; this.shapes = [];
    this.cv = document.createElement('canvas'); this.cv.width = pw; this.cv.height = ph;
    this.g = this.cv.getContext('2d', { willReadFrequently: true });
    this.nextGroup = 1;
  }
  // o: { path: Path2D | (g)=>void, fill: style | (g)=>style, group, maxR, detail, dir, jit, run, taper, exempt, gloss, h, after:(g)=>void }
  shape(o) { if (o.group === undefined) o.group = this.nextGroup++; else this.nextGroup = Math.max(this.nextGroup, o.group + 1); this.shapes.push(o); return o.group; }
  _path(g, o) { if (o.path instanceof Path2D) return o.path; const p = new Path2D(); o.path(p); return p; }
  // paint the reference and the group map
  build(ss = 2) {
    const g = this.g; g.clearRect(0, 0, this.pw, this.ph);
    this.gcv = document.createElement('canvas'); this.gcv.width = Math.round(this.pw * ss); this.gcv.height = Math.round(this.ph * ss);
    const gg = this.gcv.getContext('2d'); gg.scale(ss, ss);
    this.gsm = document.createElement('canvas'); this.gsm.width = Math.ceil(this.pw / 2); this.gsm.height = Math.ceil(this.ph / 2);
    const gs = this.gsm.getContext('2d', { willReadFrequently: true }); gs.scale(0.5, 0.5); gs.imageSmoothingEnabled = false;
    for (const o of this.shapes) {
      const idc = `rgb(${o.group},0,0)`;
      if (o.text) {   // titles: the glyphs are the shape
        const T = o.text;
        for (const [cx, col] of [[g, typeof o.fill === 'function' ? o.fill(g) : o.fill], [gg, idc], [gs, idc]]) {
          cx.save(); cx.font = T.font; cx.textAlign = T.align || 'center'; cx.textBaseline = 'alphabetic'; if (T.letter) cx.letterSpacing = T.letter + 'px';
          cx.fillStyle = col; cx.fillText(T.str, T.x, T.y); if (T.stroke) { cx.lineWidth = T.stroke; cx.strokeStyle = col; cx.lineJoin = 'round'; cx.strokeText(T.str, T.x, T.y); } cx.restore();
        }
        continue;
      }
      const p = this._path(g, o);
      g.save(); g.fillStyle = typeof o.fill === 'function' ? o.fill(g) : o.fill; g.fill(p); if (o.after) { g.clip(p); o.after(g); } g.restore();
      gg.fillStyle = idc; gg.fill(p); gs.fillStyle = idc; gs.fill(p);
    }
    this.ss = ss;
    return this;
  }
  underpainting(ss = 2, blur = 1.5) {
    const c = document.createElement('canvas'); c.width = Math.round(this.pw * ss); c.height = Math.round(this.ph * ss);
    const g = c.getContext('2d'); g.filter = `blur(${blur * ss}px)`; g.drawImage(this.cv, 0, 0, c.width, c.height);
    return c;
  }
}

// summed-area tables on a half-resolution grid for fast box averages and variance
function stats(ref) {
  const w = Math.ceil(ref.pw / 2), h = Math.ceil(ref.ph / 2);
  const sc = document.createElement('canvas'); sc.width = w; sc.height = h;
  const sg = sc.getContext('2d', { willReadFrequently: true }); sg.imageSmoothingQuality = 'high'; sg.drawImage(ref.cv, 0, 0, w, h);
  const img = sg.getImageData(0, 0, w, h).data;
  const grp = ref.gsm.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, w, h).data;
  const W1 = w + 1;
  const SR = new Float64Array(W1 * (h + 1)), SG = new Float64Array(W1 * (h + 1)), SB = new Float64Array(W1 * (h + 1)), SL = new Float64Array(W1 * (h + 1)), SL2 = new Float64Array(W1 * (h + 1));
  const G = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    let r = 0, gg = 0, b = 0, l = 0, l2 = 0;
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4; const R = img[i] / 255, Gc = img[i + 1] / 255, B = img[i + 2] / 255, Lm = 0.299 * R + 0.587 * Gc + 0.114 * B;
      r += R; gg += Gc; b += B; l += Lm; l2 += Lm * Lm;
      const k = (y + 1) * W1 + x + 1, k0 = y * W1 + x + 1;
      SR[k] = SR[k0] + r; SG[k] = SG[k0] + gg; SB[k] = SB[k0] + b; SL[k] = SL[k0] + l; SL2[k] = SL2[k0] + l2;
      G[y * w + x] = grp[i];
    }
  }
  // distance to the nearest group boundary (chamfer 3-4), in half-res pixels
  const D = new Float32Array(w * h).fill(1e9);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const v = G[y * w + x];
    if ((x > 0 && G[y * w + x - 1] !== v) || (x < w - 1 && G[y * w + x + 1] !== v) || (y > 0 && G[(y - 1) * w + x] !== v) || (y < h - 1 && G[(y + 1) * w + x] !== v)) D[y * w + x] = 0;
  }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let d = D[y * w + x];
    if (x > 0) d = Math.min(d, D[y * w + x - 1] + 3); if (y > 0) d = Math.min(d, D[(y - 1) * w + x] + 3);
    if (x > 0 && y > 0) d = Math.min(d, D[(y - 1) * w + x - 1] + 4); if (x < w - 1 && y > 0) d = Math.min(d, D[(y - 1) * w + x + 1] + 4);
    D[y * w + x] = d;
  }
  for (let y = h - 1; y >= 0; y--) for (let x = w - 1; x >= 0; x--) {
    let d = D[y * w + x];
    if (x < w - 1) d = Math.min(d, D[y * w + x + 1] + 3); if (y < h - 1) d = Math.min(d, D[(y + 1) * w + x] + 3);
    if (x < w - 1 && y < h - 1) d = Math.min(d, D[(y + 1) * w + x + 1] + 4); if (x > 0 && y < h - 1) d = Math.min(d, D[(y + 1) * w + x - 1] + 4);
    D[y * w + x] = d;
  }
  const box = (S, x0, y0, x1, y1) => S[y1 * W1 + x1] - S[y0 * W1 + x1] - S[y1 * W1 + x0] + S[y0 * W1 + x0];
  return {
    w, h, G, D,
    group(px, py) { const x = Math.min(w - 1, Math.max(0, px >> 1)), y = Math.min(h - 1, Math.max(0, py >> 1)); return G[y * w + x]; },
    dist(px, py) { const x = Math.min(w - 1, Math.max(0, Math.round(px / 2))), y = Math.min(h - 1, Math.max(0, Math.round(py / 2))); return D[y * w + x] / 3 * 2; },
    grad(px, py) { const x = Math.min(w - 2, Math.max(1, Math.round(px / 2))), y = Math.min(h - 2, Math.max(1, Math.round(py / 2)));
      return [D[y * w + x + 1] - D[y * w + x - 1], D[(y + 1) * w + x] - D[(y - 1) * w + x]]; },
    mean(px, py, r) {
      const x0 = Math.max(0, Math.floor((px - r) / 2)), y0 = Math.max(0, Math.floor((py - r) / 2)), x1 = Math.min(w, Math.ceil((px + r) / 2) + 1), y1 = Math.min(h, Math.ceil((py + r) / 2) + 1);
      const n = Math.max(1, (x1 - x0) * (y1 - y0));
      return [box(SR, x0, y0, x1, y1) / n, box(SG, x0, y0, x1, y1) / n, box(SB, x0, y0, x1, y1) / n];
    },
    vari(px, py, r) {
      const x0 = Math.max(0, Math.floor((px - r) / 2)), y0 = Math.max(0, Math.floor((py - r) / 2)), x1 = Math.min(w, Math.ceil((px + r) / 2) + 1), y1 = Math.min(h, Math.ceil((py + r) / 2) + 1);
      const n = Math.max(1, (x1 - x0) * (y1 - y0)); const m = box(SL, x0, y0, x1, y1) / n;
      return box(SL2, x0, y0, x1, y1) / n - m * m;
    },
  };
}

// coarse-to-fine strokes for every shape, confined to its group
export function paintRef(ref, opt = {}) {
  const S = stats(ref), out = new Strokes(8192);
  let seed = (opt.seed || 1) * 100000;
  for (const o of ref.shapes) {
    if (o.paint === false) continue;
    // bounding box of the group on the stats grid
    let bx0 = S.w, by0 = S.h, bx1 = -1, by1 = -1;
    for (let y = 0; y < S.h; y++) for (let x = 0; x < S.w; x++) if (S.G[y * S.w + x] === o.group) { if (x < bx0) bx0 = x; if (x > bx1) bx1 = x; if (y < by0) by0 = y; if (y > by1) by1 = y; }
    if (bx1 < 0) continue;
    const X0 = bx0 * 2, X1 = bx1 * 2 + 2, Y0 = by0 * 2, Y1 = by1 * 2 + 2;
    const maxR = o.maxR || 24, detail = o.detail || Math.max(3, maxR / 6), jit = (o.jit ?? 13) * Math.PI / 180;
    const levels = []; for (let r = maxR; r >= detail * 0.999; r /= 1.7) levels.push(r);
    levels.forEach((r, li) => {
      const sp = r * (li === 0 ? 0.9 : 0.9);
      for (let gy = Y0 - sp * 0.5; gy < Y1 + sp; gy += sp) for (let gx = X0 - sp * 0.5; gx < X1 + sp; gx += sp) {
        seed++;
        const x = gx + (hash(seed * 1.3) - 0.5) * sp * 1.3, y = gy + (hash(seed * 2.7) - 0.5) * sp * 1.3;
        if (x < 0 || y < 0 || x >= ref.pw || y >= ref.ph) continue;
        if (S.group(x, y) !== o.group) continue;
        const d = S.dist(x, y);
        if (li > 0) {
          const need = d < r * 2.0 || S.vari(x, y, r) > (o.varThr ?? 0.0018);
          if (!need) continue;
        }
        let ang;
        const dir = typeof o.dir === 'function' ? o.dir(x, y) : (o.dir ?? 0);
        if (d < r * 1.6 && o.follow !== false) { const [gx_, gy_] = S.grad(x, y); ang = Math.atan2(gy_, gx_) + Math.PI / 2; if (Math.abs(((ang - dir + Math.PI * 2.5) % Math.PI) - Math.PI / 2) > Math.PI / 2) ang += Math.PI; }
        else ang = dir;
        ang += (hash(seed * 3.1) - 0.5) * 2 * jit;
        const len = r * (1.7 + hash(seed * 4.3) * 1.4) * (o.lenK || 1), wid = r * (0.95 + hash(seed * 5.9) * 0.5) * (o.widK || 1);
        const c = S.mean(x, y, r * 0.55);
        const ox = Math.cos(ang) * len * 0.45, oy = Math.sin(ang) * len * 0.45;
        let c2 = S.mean(x + ox, y + oy, r * 0.5);
        if (o.c2) { const k = o.c2k ?? 0.5; c2 = [c2[0] + (o.c2[0] - c2[0]) * k, c2[1] + (o.c2[1] - c2[1]) * k, c2[2] + (o.c2[2] - c2[2]) * k]; }
        out.push({ x, y, ang, len, wid, c, c2, group: o.group, seed, type: o.type ?? KNIFE, taper: o.taper ?? 0.25, run: (o.run ?? 0.45) * (li === 0 ? 1 : 0.6),
          exempt: !!o.exempt, gloss: o.gloss ?? 0.12, h: (o.h ?? 1) * (li === 0 ? 1 : 0.9) });
      }
    });
  }
  return out;
}

// bake a reference into a plate: underpainting, then strokes confined to groups
export function bake(E, ref, opt = {}) {
  ref.build(E.ss);
  const t = E.plate(ref.pw, ref.ph);
  E.clear(t, [0, 0, 0, 1]);
  E.under(t, ref.underpainting(t.w / ref.pw));
  if (opt.bare) { t.count = 0; t.ref = ref; return t; }   // the bare canvas: underpainting only
  const strokes = paintRef(ref, opt);
  const gtex = E.texFromCanvas(ref.gcv, true);
  E.draw(t, strokes.data(), { group: gtex });
  if (opt.extra) E.draw(t, opt.extra.data());
  t.count = strokes.n; t.ref = ref;
  return t;
}
