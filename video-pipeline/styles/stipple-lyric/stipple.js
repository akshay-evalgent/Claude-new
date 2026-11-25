/* Stipple-lyric: the dots and the lyric timing. Load it after the page's markup
   and before film.js is set up:
     <script src=".../styles/stipple-lyric/stipple.js"></script>
   Classes that use it are in stipple.css.

   Everything here is seeded and driven by the time it is given: the same call
   with the same time draws the same picture, on every render worker.

   DRAWING. Three ways to put dots into a <g class="stipple"> inside an
   <svg viewBox="0 0 1920 1080">. Dots never overlap: tone is how close they stand.

     Stipple.trail(g, { d: 'M...' })          a band of dots along a path: a road, a shoreline
     Stipple.beads(g, { d: 'M...' })          single larger dots spaced along a path
     Stipple.halo(g, { x, y, w, h })          dots gathering round a rectangle of bare paper,
                                              thickest at its edge: the dark is drawn, the light is left

   Every dot has an order from 0 to 1 (along the path; from the edge outward
   for a halo). Stipple.reveal(g, share) shows the dots up to that share, so a
   drawing grows by raising one number. In markup:

     <g class="stipple" id="road" data-share="0.5"></g>                    a still: half the road
     <g class="stipple" id="road" data-grow="0 0, 1.2 0.02, 4.6 0.17"></g> pairs of "time share",
                                                                            straight lines between them

   LYRICS. A line is a .lyric holding .row holding .w words (see stipple.css):

     <p class="lyric" data-in="1.33 1.33" data-out="4.61 4.61">
       <span class="row"><span class="w" data-at="1.45">Text</span> <span class="w" data-at="1.72">me</span></span>
       <span class="row">... <span class="w accent lit" data-pulse="2.70">home</span></span>
     </p>

     data-at="2.01"         the word turns from faint to full ink at 2.01 s (over data-ramp, 0.1 s)
     data-pulse="2.70"      the word swells by 6% and settles, starting at 2.70 s
     data-in="a b"          on a .lyric or a .w: arrives between a and b seconds (a = b: in one frame)
     data-out="a b"         leaves between a and b seconds

   Stipple.line(el, rows, opts) writes that markup from word times.

   DRIVING. Call Stipple.update(root, t) once a frame with the time those
   attributes are written in. With film.js:

     Film.shot({ id: 'sheet', dur: 23.8, update: (p, t, el) => Stipple.update(el, t) });

   One shot for the whole sheet, with every time in seconds from its start, is
   the simplest way to build a lyric video. If each line is its own shot, the
   times inside it are seconds from that shot's start, and a drawing that must
   outlive the shots goes in <svg class="drawing"> directly inside #stage and is
   driven with Stipple.update(drawing, shotStart + t).
*/
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const span = (t, a, b) => (b <= a ? (t >= b ? 1 : 0) : clamp((t - a) / (b - a)));
  const smooth = (p) => p * p * (3 - 2 * p);
  const nums = (s) => String(s).trim().split(/[\s,]+/).map(Number);
  const el = (q) => (typeof q === 'string' ? document.querySelector(q) : q);

  /* seeded random numbers: mulberry32 */
  function rng(seed) {
    let a = (seed | 0) || 1;
    return () => {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* smooth seeded noise on a ring, -1 to 1: makes a halo's outline uneven */
  function ringNoise(rand, lobes) {
    const ph = Array.from({ length: lobes }, () => [rand() * Math.PI * 2, 0.5 + rand() * 0.5]);
    const tot = ph.reduce((s, _, i) => s + ph[i][1] / (i + 1), 0);
    return (ang) => ph.reduce((s, [p, a], i) => s + (a / (i + 1)) * Math.sin((i + 1) * ang + p), 0) / tot;
  }

  /* dots keep their distance: a grid of what is already down */
  function Field(cell) {
    const m = new Map();
    const key = (i, j) => i * 73856093 ^ j * 19349663;
    return {
      free(x, y, gap) {
        const i0 = Math.floor((x - gap) / cell), i1 = Math.floor((x + gap) / cell);
        const j0 = Math.floor((y - gap) / cell), j1 = Math.floor((y + gap) / cell);
        const g2 = gap * gap;
        for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
          const b = m.get(key(i, j));
          if (!b) continue;
          for (let k = 0; k < b.length; k += 2) {
            const dx = b[k] - x, dy = b[k + 1] - y;
            if (dx * dx + dy * dy < g2) return false;
          }
        }
        return true;
      },
      add(x, y) {
        const k = key(Math.floor(x / cell), Math.floor(y / cell));
        const b = m.get(k);
        if (b) b.push(x, y); else m.set(k, [x, y]);
      },
    };
  }

  /* a path as a table of points and normals, one a pixel */
  function measure(g, d) {
    const p = document.createElementNS(NS, 'path');
    p.setAttribute('d', d);
    g.appendChild(p);
    const len = p.getTotalLength(), n = Math.max(2, Math.ceil(len));
    const pts = new Float32Array((n + 1) * 2);
    for (let i = 0; i <= n; i++) {
      const q = p.getPointAtLength((i / n) * len);
      pts[i * 2] = q.x; pts[i * 2 + 1] = q.y;
    }
    g.removeChild(p);
    return {
      len,
      at(u) {
        const f = clamp(u / len) * n, i = Math.min(n - 1, Math.floor(f)), k = f - i;
        const x0 = pts[i * 2], y0 = pts[i * 2 + 1], x1 = pts[i * 2 + 2], y1 = pts[i * 2 + 3];
        const dx = x1 - x0, dy = y1 - y0, l = Math.hypot(dx, dy) || 1;
        return { x: x0 + dx * k, y: y0 + dy * k, nx: -dy / l, ny: dx / l };
      },
    };
  }

  /* put dots into the group, in order, and remember them for reveal() */
  function commit(g, dots, order) {
    const [k0, k1] = order || [0, 1];
    dots.sort((a, b) => a.k - b.k);
    const frag = document.createDocumentFragment();
    for (const d of dots) {
      d.k = k0 + (k1 - k0) * clamp(d.k);
      const c = document.createElementNS(NS, 'circle');
      c.setAttribute('cx', d.x.toFixed(2)); c.setAttribute('cy', d.y.toFixed(2)); c.setAttribute('r', d.r.toFixed(2));
      frag.appendChild(c);
      d.el = c;
    }
    g.appendChild(frag);
    g._dots = (g._dots || []).concat(dots).sort((a, b) => a.k - b.k);
    g._shown = g._dots.length;
    if (g.dataset.share != null) Stipple.reveal(g, Number(g.dataset.share));
    return dots.length;
  }

  const pick = (rand, r) => r[0] + (r[1] - r[0]) * Math.pow(rand(), 1.6);   // mostly small dots, a few large

  const Stipple = {
    rng,

    /* A band of dots along a path, thickest on its centre line.
       d       the path
       half    half the band's width in px (default 22)
       tight   distance between dots on the centre line (2.8); loose: at the band's edge (12)
       r       [smallest, largest] dot radius ([1.2, 2.5])
       ragged  how uneven the growing end is, in px along the path (16)
       taper   the band narrows to a point over this many px at each end (48; 0 for blunt ends)
       order   [from, to]: the part of the group's 0-1 order this band takes ([0, 1]) */
    trail(g, o) {
      g = el(g);
      const { d, half = 22, tight = 2.8, loose = 12, r = [1.2, 2.5], seed = 1, ragged = 16, taper = 48, order } = o;
      const rand = rng(seed), path = measure(g, d), field = Field(4), dots = [];
      const lanes = 8;
      for (let b = 0; b < lanes; b++) {                           // from the centre line outward, so the middle fills first
        const e0 = b / lanes, e1 = (b + 1) / lanes, em = (e0 + e1) / 2;
        const gapM = tight * Math.pow(loose / tight, em);
        const tries = Math.ceil((path.len * half * 2 / lanes) / (0.7 * gapM * gapM) * 8);
        for (let i = 0; i < tries; i++) {
          const u = rand() * path.len, e = e0 + rand() * (e1 - e0);
          const thin = taper > 0 ? 0.22 + 0.78 * smooth(clamp(Math.min(u, path.len - u) / taper)) : 1;
          const off = (rand() < 0.5 ? -1 : 1) * e * half * thin;
          if (rand() < e * e * 0.7) continue;                     // the edge thins to scattered points
          const gap = tight * Math.pow(loose / tight, e);
          const p = path.at(u), x = p.x + p.nx * off, y = p.y + p.ny * off;
          if (!field.free(x, y, gap)) continue;
          field.add(x, y);
          dots.push({ x, y, r: pick(rand, r) * (1 - 0.3 * e), k: (u + (rand() - 0.5) * ragged) / path.len });
        }
      }
      return commit(g, dots, order);
    },

    /* Single dots spaced along a path: the first marks of a line before it fills in.
       every   distance between dots in px (60), never quite even;  r: [smallest, largest] radius ([3.6, 4.8])
       jitter  how far a dot may sit off the line (2.5);  from, to: the part of the path, 0-1
       The first dot sits exactly on the start of the path. */
    beads(g, o) {
      g = el(g);
      const { d, every = 60, r = [3.6, 4.8], jitter = 2.5, seed = 1, from = 0, to = 1, order } = o;
      const rand = rng(seed), path = measure(g, d), dots = [];
      for (let u = from * path.len; u <= to * path.len + 0.01; u += every * (0.78 + 0.44 * rand())) {
        const p = path.at(u), a = rand() * Math.PI * 2, j = u > from * path.len ? rand() * jitter : 0;
        dots.push({ x: p.x + Math.cos(a) * j, y: p.y + Math.sin(a) * j, r: r[0] + (r[1] - r[0]) * rand(), k: u / path.len });
      }
      return commit(g, dots, order);
    },

    /* Dots gathering round bare paper: the shape is what is left alone.
       x, y, w, h   the bare rectangle
       bare         more bare rectangles close by, [[x, y, w, h], ...] (a sill, a second pane)
       reach        how far the dots scatter from the edge, px (175)
       tight        distance between dots at the edge (2.3); loose: at the reach (17)
       uneven       how far the outline wanders, 0-1 (0.4)
       square       0 a round cloud, 1 a cloud with the rectangle's own corners (0.45)
       r            [smallest, largest] dot radius ([1.1, 2.2]) */
    halo(g, o) {
      g = el(g);
      const { x, y, w, h, bare = [], reach = 175, tight = 2.3, loose = 17, uneven = 0.4, square = 0.45,
              r = [1.1, 2.2], seed = 1, order } = o;
      const rand = rng(seed), wob = ringNoise(rand, 5), field = Field(4), dots = [];
      const rects = [[x, y, w, h]].concat(bare);
      const X0 = Math.min(...rects.map((q) => q[0])), X1 = Math.max(...rects.map((q) => q[0] + q[2]));
      const Y0 = Math.min(...rects.map((q) => q[1])), Y1 = Math.max(...rects.map((q) => q[1] + q[3]));
      const W = X1 - X0, H = Y1 - Y0, cx = x + w / 2, cy = y + h / 2;
      const dist = (px, py) => {               // to the nearest bare rectangle
        let best = Infinity;
        for (const [rx, ry, rw, rh] of rects) {
          const dx = Math.max(rx - px, 0, px - (rx + rw)), dy = Math.max(ry - py, 0, py - (ry + rh));
          best = Math.min(best, (1 - square) * Math.hypot(dx, dy) + square * Math.max(dx, dy));
        }
        return best;
      };
      const gapAt = (far) => tight * Math.pow(loose / tight, Math.pow(far, 1.5));     // stays dark for a while, then opens
      const drop = (px, py) => {
        const dd = dist(px, py), rr = pick(rand, r);
        if (dd < rr + 0.8) return;                                            // never on the bare paper
        const far = dd / (reach * (1 + uneven * wob(Math.atan2(py - cy, px - cx))));
        if (far > 1 || rand() < Math.pow(far, 1.2)) return;                   // thins to scattered points, then nothing
        if (!field.free(px, py, gapAt(far))) return;
        field.add(px, py);
        dots.push({ x: px, y: py, r: rr * (1 - 0.3 * far), k: (rand() * 0.75 + far * 0.6) / 1.35 });
      };
      // the edge first, so the bare shape is cut cleanly out of the dark
      const m = 1.5;
      for (const [rx, ry, rw, rh] of rects) {
        const ex = rx - m, ey = ry - m, ew = rw + 2 * m, eh = rh + 2 * m;
        const n = Math.floor((2 * (ew + eh)) / (tight * 0.95));
        for (let i = 0; i < n; i++) {
          const s = ((i + rand() * 0.3) / n) * 2 * (ew + eh);
          let px, py;
          if (s < ew) { px = ex + s; py = ey; }
          else if (s < ew + eh) { px = ex + ew; py = ey + (s - ew); }
          else if (s < 2 * ew + eh) { px = ex + ew - (s - ew - eh); py = ey + eh; }
          else { px = ex; py = ey + eh - (s - 2 * ew - eh); }
          px += (rand() - 0.5) * 0.6; py += (rand() - 0.5) * 0.6;
          if (dist(px, py) < 1.2 || !field.free(px, py, tight * 0.8)) continue;
          field.add(px, py);
          dots.push({ x: px, y: py, r: 1.2 + rand() * 0.3, k: rand() * 0.3 });
        }
      }
      // the pockets between the bare rectangles
      for (let i = Math.ceil((W * H) / (tight * tight) * 5); i > 0; i--) drop(X0 + rand() * W, Y0 + rand() * H);
      // then ring by ring outward, so each distance gets as many dots as it can hold
      const rings = 28, R = reach * (1 + uneven) * (1 + 0.42 * square), bw = R / rings;
      for (let b = 0; b < rings; b++) {
        const d0 = b * bw, dm = d0 + bw / 2, arc = Math.PI * dm / 2, per = 2 * (W + H) + 4 * arc;
        const gapM = gapAt(Math.min(1, dm / reach));
        for (let i = Math.ceil((per * bw) / (0.7 * gapM * gapM) * 8); i > 0; i--) {
          const dd = d0 + rand() * bw, a4 = Math.PI * dd / 2;
          let s = rand() * (2 * (W + H) + 4 * a4), px, py, a;
          if (s < W) { px = X0 + s; py = Y0 - dd; }
          else if ((s -= W) < a4) { a = -Math.PI / 2 + (s / a4) * Math.PI / 2; px = X1 + dd * Math.cos(a); py = Y0 + dd * Math.sin(a); }
          else if ((s -= a4) < H) { px = X1 + dd; py = Y0 + s; }
          else if ((s -= H) < a4) { a = (s / a4) * Math.PI / 2; px = X1 + dd * Math.cos(a); py = Y1 + dd * Math.sin(a); }
          else if ((s -= a4) < W) { px = X1 - s; py = Y1 + dd; }
          else if ((s -= W) < a4) { a = Math.PI / 2 + (s / a4) * Math.PI / 2; px = X0 + dd * Math.cos(a); py = Y1 + dd * Math.sin(a); }
          else if ((s -= a4) < H) { px = X0 - dd; py = Y1 - s; }
          else { s -= H; a = Math.PI + (s / a4) * Math.PI / 2; px = X0 + dd * Math.cos(a); py = Y0 + dd * Math.sin(a); }
          drop(px, py);
        }
      }
      return commit(g, dots, order);
    },

    /* Show the dots whose order is at or below share (0 none, 1 all). */
    reveal(g, share) {
      g = el(g);
      const dots = g._dots;
      if (!dots) return;
      let lo = 0, hi = dots.length;
      if (share <= 0) hi = 0;
      else if (share < 1) { while (lo < hi) { const m = (lo + hi) >> 1; if (dots[m].k <= share) lo = m + 1; else hi = m; } }
      const n = share >= 1 ? dots.length : share <= 0 ? 0 : lo;
      for (let i = n; i < g._shown; i++) dots[i].el.style.display = 'none';
      for (let i = g._shown; i < n; i++) dots[i].el.style.display = '';
      g._shown = n;
    },

    /* Write a lyric line from word times.
       rows   [[{ text, at, accent, lit, pulse, out }, ...], [...]]   one array per row
              at: when the word is spoken; lit: full ink from the start; pulse: when it swells;
              out: true for a word that only holds its place
       opts   { in: [a, b], out: [a, b] } for the whole line */
    line(target, rows, opts = {}) {
      target = el(target);
      target.classList.add('lyric');
      if (opts.in) target.dataset.in = opts.in.join(' ');
      if (opts.out) target.dataset.out = opts.out.join(' ');
      target.textContent = '';
      for (const row of rows) {
        const r = document.createElement('span');
        r.className = 'row';
        row.forEach((w, i) => {
          const s = document.createElement('span');
          s.className = 'w' + (w.accent ? ' accent' : '') + (w.lit ? ' lit' : '') + (w.out ? ' out' : '');
          s.textContent = w.text;
          if (w.at != null) s.dataset.at = w.at;
          if (w.pulse != null) s.dataset.pulse = w.pulse;
          if (i) r.appendChild(document.createTextNode(' '));
          r.appendChild(s);
        });
        target.appendChild(r);
      }
      target._marks = null;
      return target;
    },

    /* Set every timed thing under root to how it stands at time t. */
    update(root, t) {
      root = el(root);
      let m = root._stipple;
      if (!m) {
        const q = (a) => Array.from(root.querySelectorAll('[' + a + ']')).concat(root.hasAttribute && root.hasAttribute(a) ? [root] : []);
        m = root._stipple = {
          at: q('data-at').map((e) => [e, Number(e.dataset.at), e.dataset.ramp != null ? Number(e.dataset.ramp) : 0.1]),
          pulse: q('data-pulse').map((e) => [e, Number(e.dataset.pulse)]),
          on: Array.from(new Set(q('data-in').concat(q('data-out')))).map((e) => [e,
            e.dataset.in != null ? nums(e.dataset.in) : null, e.dataset.out != null ? nums(e.dataset.out) : null,
            e.classList.contains('lyric') ? '--line-on' : '--on']),
          grow: q('data-grow').map((e) => [e, e.dataset.grow.split(',').map(nums)]),
        };
      }
      for (const [e, at, ramp] of m.at) e.style.setProperty('--lit', smooth(span(t, at, at + ramp)).toFixed(3));
      for (const [e, at] of m.pulse) {
        const p = span(t, at, at + 0.42);
        e.style.transform = p > 0 && p < 1 ? `scale(${(1 + 0.06 * Math.sin(Math.PI * p) * (1 - 0.35 * p)).toFixed(4)})` : '';
      }
      for (const [e, a, b, name] of m.on) {
        const v = (a ? span(t, a[0], a[1]) : 1) * (b ? 1 - span(t, b[0], b[1]) : 1);
        e.style.setProperty(name, smooth(v).toFixed(3));
      }
      for (const [g, keys] of m.grow) {
        let s = keys[0][1];
        for (let i = 0; i < keys.length; i++) {
          const [ta, sa] = keys[i], nx = keys[i + 1];
          if (t >= ta) s = nx && t < nx[0] ? sa + (nx[1] - sa) * ((t - ta) / (nx[0] - ta)) : sa;
        }
        Stipple.reveal(g, s);
      }
    },
  };

  /* The one filter: type that sat on paper. A slight wobble on the edge and a
     few pin-holes where the sheet shows through. SVG filters only work from
     inside the same document, so this injects it. */
  const defs = `
<svg xmlns="${NS}" width="0" height="0" style="position:absolute" aria-hidden="true">
  <defs>
    <filter id="ink-press" x="-4%" y="-6%" width="108%" height="112%" color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.042" numOctaves="2" seed="6" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="3.4" xChannelSelector="R" yChannelSelector="G" result="d"/>
      <feTurbulence type="fractalNoise" baseFrequency="0.62" numOctaves="2" seed="14" result="g"/>
      <feColorMatrix in="g" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  6 0 0 0 -1.3" result="pits"/>
      <feComposite in="d" in2="pits" operator="in"/>
    </filter>
  </defs>
</svg>`;
  const mount = () => document.body.insertAdjacentHTML('afterbegin', defs);
  if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount);

  window.Stipple = Stipple;
})();
