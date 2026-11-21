// The Spike Files v2: every frame is a pure function of time. window.setFrame(f) draws frame f; render.js screenshots it.
import { Chart3D } from './chart3d.js';

const W = 1080, H = 1920, G = '#3DFF88', R = '#FF3B3B';
const TL = await (await fetch(new URLSearchParams(location.search).get('tl'))).json();
const FPS = TL.fps, DUR = TL.dur;
window.SFX = []; window.BREAKS = []; window.FRAMES = Math.round(DUR * FPS);

// ------------------------------------------------------------------ helpers
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, k) => a + (b - a) * k;
const ease = {
  lin: k => k, out: k => 1 - (1 - k) ** 3, out5: k => 1 - (1 - k) ** 5, in: k => k ** 3,
  io: k => (k < 0.5 ? 4 * k ** 3 : 1 - ((-2 * k + 2) ** 3) / 2),
  back: k => { const c = 1.9, c3 = c + 1; return 1 + c3 * (k - 1) ** 3 + c * (k - 1) ** 2; },
};
const P = (t, t0, d, e = ease.out) => e(clamp((t - t0) / d));
const el = (tag, cls, parent, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; parent.appendChild(e); return e; };
const fmt = n => n >= 1e9 ? (n / 1e9).toFixed(2) + 'B' : n >= 1e7 ? Math.round(n / 1e6) + 'M' : n >= 1e6 ? (n / 1e6).toFixed(1).replace('.0', '') + 'M'
  : n >= 1e4 ? Math.round(n / 1e3) + 'K' : n >= 1e3 ? (n / 1e3).toFixed(1).replace('.0', '') + 'K' : '' + Math.round(n);
const rnd = seed => { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
const IMG = new Map();
const img = src => { if (!IMG.has(src)) { const i = new Image(); i.src = '/' + src; IMG.set(src, i); } return IMG.get(src); };
const SHAKES = [], FLASHES = [];
const sfx = (t, name, o = {}) => window.SFX.push({ t: +Math.max(0, t).toFixed(3), name, ...o });
const shake = (t, amp = 20, dur = 0.4) => SHAKES.push({ t, amp, dur });
const flash = (t, dur = 0.2, a = 0.7) => FLASHES.push({ t, dur, a });
const brk = (a, b) => window.BREAKS.push([+a.toFixed(3), +b.toFixed(3)]);

class Media {                                   // real frames, drawn cover-fit with zoom / pan / rotation
  constructor(parent, srcs, w = W, h = H) {
    this.c = el('canvas', '', parent); this.c.width = w; this.c.height = h; this.x = this.c.getContext('2d');
    this.x.imageSmoothingQuality = 'high'; this.im = srcs.map(img); this.w = w; this.h = h;
  }
  draw(i, { zoom = 1, ox = 0, oy = 0, rot = 0 } = {}) {
    const im = this.im[((i % this.im.length) + this.im.length) % this.im.length], x = this.x;
    const s = Math.max(this.w / im.naturalWidth, this.h / im.naturalHeight) * zoom;
    x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, this.w, this.h);
    x.translate(this.w / 2 + ox, this.h / 2 + oy); x.rotate(rot);
    x.drawImage(im, -im.naturalWidth * s / 2, -im.naturalHeight * s / 2, im.naturalWidth * s, im.naturalHeight * s);
  }
}
// an item is shown as its real clip when one was cut (clips.py), else as its four real still frames in a quick cycle
const framesOf = it => it.clip ? Array.from({ length: it.clip.n }, (_, k) => `${it.clip.dir}/${String(k + 1).padStart(4, '0')}.jpg`) : it.frames;
const fidx = (it, lt, hold) => it.clip ? Math.floor(Math.max(0, lt) * it.clip.fps) % it.clip.n : Math.floor(Math.max(0, lt) / hold);
const grad = (root, css) => { const g = el('div', 'layer', root); g.style.background = css; return g; };
const TOPBOT = 'linear-gradient(180deg,rgba(0,0,0,.78) 0%,rgba(0,0,0,0) 30%,rgba(0,0,0,0) 60%,rgba(0,0,0,.62) 100%)';
const svgNS = 'http://www.w3.org/2000/svg';
function stroke(parent, d, color = G, width = 14) {      // a hand-drawn line that draws itself: call .set(0..1)
  const s = document.createElementNS(svgNS, 'svg'); s.setAttribute('width', W); s.setAttribute('height', H);
  s.style.cssText = 'position:absolute;left:0;top:0;overflow:visible'; parent.appendChild(s);
  const p = document.createElementNS(svgNS, 'path'); p.setAttribute('d', d); p.setAttribute('fill', 'none'); p.setAttribute('stroke', color);
  p.setAttribute('stroke-width', width); p.setAttribute('stroke-linecap', 'round'); p.setAttribute('stroke-linejoin', 'round'); s.appendChild(p);
  const L = p.getTotalLength(); p.style.strokeDasharray = L; p.style.filter = 'drop-shadow(0 4px 0 rgba(0,0,0,.6))';
  return { el: s, set: k => { p.style.strokeDashoffset = L * (1 - clamp(k)); s.style.display = k > 0 ? 'block' : 'none'; } };
}

// ------------------------------------------------------------------ scenes
const BUILD = {};

BUILD.hook = (sc, root) => {
  const bg = new Media(root, framesOf(sc.hit)); grad(root, TOPBOT);
  const fl = el('div', 'layer', root); const fm = new Media(fl, sc.flops.map(f => f.frame));
  fm.c.style.filter = 'grayscale(.9) contrast(1.15) brightness(.72)'; grad(fl, 'rgba(110,0,0,.22)');
  const stamp = el('div', 'stamp', fl), fnum = el('div', 'flopn', fl);
  const border = el('div', 'hitborder', root);
  const num = el('div', 'hooknum', root), lab = el('div', 'hooklab', root, 'VIEWS');
  const [, c1, c2] = sc.caps, T0 = sc.t0, tc = 0.78, nF = sc.flops.length, step = (c2.t0 - c1.t0) / nF;
  sfx(T0 + 0.02, 'ticks', { dur: tc, count: 22 }); sfx(T0 + tc, 'impact'); shake(T0 + tc, 30, 0.5); flash(T0 + tc, 0.22, 0.75);
  sfx(c1.t0 - 0.12, 'whoosh'); for (let i = 0; i < nF; i += 2) sfx(c1.t0 + i * step, 'stamp', { gain: 0.55, seed: i });
  sfx(c2.t0, 'impact', { gain: 0.9 }); shake(c2.t0, 22, 0.4); flash(c2.t0, 0.18, 0.6);
  return t => {
    const tl = t - T0, inF = t >= c1.t0 && t < c2.t0;
    fl.style.display = inF ? 'block' : 'none';
    if (inF) {
      const i = Math.min(nF - 1, Math.floor((t - c1.t0) / step)), lt = (t - c1.t0) - i * step;
      fm.draw(i, { zoom: 1.16 - 0.1 * clamp(lt / step) });
      stamp.textContent = fmt(sc.flops[i].views) + ' VIEWS';
      stamp.style.transform = `translate(-50%,-50%) rotate(${i % 2 ? 7 : -8}deg) scale(${1.4 - 0.4 * ease.out(clamp(lt / 0.07))})`;
      fnum.textContent = 'FLOP #' + Math.round(lerp(1, sc.flopCount, clamp((t - c1.t0) / (c2.t0 - c1.t0 - 0.06))));
    } else if (t < c1.t0) {
      bg.draw(fidx(sc.hit, tl, 0.36), { zoom: 1.06 + 0.14 * tl / (c1.t0 - T0) + 0.1 * (1 - P(tl, tc, 0.3)) * (tl >= tc ? 1 : 0) });
    } else bg.draw(sc.hit.clip ? fidx(sc.hit, t - c2.t0, 1) : (t - c2.t0 < 0.55 ? 0 : 1), { zoom: 1.3 - 0.22 * P(t, c2.t0, 0.4, ease.out5) + 0.05 * (t - c2.t0) });
    const kc = clamp((tl + 0.06) / tc); num.textContent = Math.round(sc.hit.views * ease.out5(kc)).toLocaleString('en-US');
    const pin = P(t, c1.t0 - 0.14, 0.26, ease.io), punch = kc >= 1 ? 1 + 0.24 * (1 - P(tl, tc, 0.32)) : 0.9 + 0.1 * kc;
    num.style.color = kc >= 1 ? G : '#fff';
    num.style.transform = `translate(-50%,-50%) translateY(${lerp(0, -230, pin)}px) scale(${punch * lerp(1, 0.6, pin)})`;
    lab.style.transform = `translate(-50%,-50%) translateY(${lerp(0, -290, pin)}px) scale(${lerp(1, 0.6, pin)})`;
    lab.style.opacity = kc >= 0.25 ? 1 : 0;
    border.style.opacity = t >= c2.t0 ? 1 : 0;
  };
};

BUILD.uiscroll = async (sc, root) => {
  const seq = await (await fetch(`/${sc.seq}/boxes.json`)).json(); const N = seq.n, PW = 740, PH = 1644, sx = PW / 412;
  root.style.background = 'radial-gradient(ellipse at 50% 40%, #1d2430 0%, #0c0c10 70%)';
  const col = sc.tone === 'green' ? G : R;
  const wrap = el('div', 'layer phonewrap', root), phone = el('div', 'phone', wrap);
  const cv = new Media(phone, Array.from({ length: N }, (_, i) => `${sc.seq}/s${String(i).padStart(3, '0')}.jpg`), PW, PH);
  const pool = Array.from({ length: 10 }, () => { const d = el('div', 'vc', phone); d.style.background = col; d.style.color = sc.tone === 'green' ? '#000' : '#fff'; return d; });
  const tag = el('div', 'pill', root, sc.tag || ''); tag.style.top = '150px'; tag.style.borderColor = col;
  const T0 = sc.t0, dur = sc.t1 - sc.t0, quick = !!sc.quick, tPop = quick ? 0.28 : 0.85;
  sfx(T0, 'whoosh'); if (!quick) sfx(T0 + 0.35, 'scroll', { dur: Math.max(0.6, dur - 1.0) });
  sfx(T0 + tPop, 'pop'); sfx(T0 + tPop + 0.09, 'pop', { f0: 640 }); sfx(T0 + tPop + 0.18, 'pop', { f0: 760 });
  return t => {
    const tl = t - T0, k = P(tl, 0, 0.5, ease.back), z = P(tl, dur * 0.5, 0.7, ease.io);
    const fi = quick ? Math.round(lerp(0, 26, ease.out(clamp(tl / dur)))) : Math.round(lerp(0, N - 1, ease.io(clamp((tl - 0.3) / (dur - 0.3)))));
    cv.draw(fi);
    phone.style.transform = `translateY(${lerp(1300, lerp(0, -40, z), k)}px) rotateX(${lerp(30, lerp(8, 2, z), k)}deg) rotateY(${lerp(-26, lerp(-11, -3, z), k)}deg) rotateZ(${lerp(7, lerp(2, 0, z), k)}deg) scale(${lerp(1, 1.1, z)})`;
    const bs = seq.boxes[fi].filter(b => b.y > 300 && b.y < 800), pk = P(tl, tPop, 0.22, ease.back);
    pool.forEach((d, i) => {
      const b = bs[i]; if (!b || tl < tPop) { d.style.display = 'none'; return; }
      d.style.display = 'block'; d.textContent = b.text.replace(' views', '');
      d.style.left = (b.x * sx - 6) + 'px'; d.style.top = (b.y * sx - 46) + 'px'; d.style.transform = `scale(${pk})`;
    });
    tag.style.opacity = P(tl, 0.1, 0.2);
  };
};

BUILD.chart = (sc, root) => {
  const ch = new Chart3D(root, TL.views), S = sc.spike, N = TL.views.length, T0 = sc.t0;
  grad(root, 'linear-gradient(180deg,rgba(0,0,0,.6) 0%,rgba(0,0,0,0) 28%)');
  const [sx0, sz0] = ch.pos(S), HS = ch.height(S);
  if (sc.mode === 'reveal') {
    const cnum = el('div', 'chud cnum', root), clab = el('div', 'chud clab', root);
    const [c0, c1] = sc.caps, tr = c1.t1 + 0.3, tEnd = c1.t0 + 0.1;
    brk(c1.t0, tr); sfx(c1.t0, 'riser', { dur: tr - c1.t0 }); sfx(tr, 'impact', { gain: 1.2 }); shake(tr, 34, 0.6); flash(tr, 0.25, 0.8);
    sfx(T0 + 0.1, 'ticks', { dur: tEnd - T0 - 0.1, count: 30, gain: 0.6 }); sfx(tr + 0.05, 'ticks', { dur: 0.6, count: 18 });
    return t => {
      const play = lerp(0, S - 1, ease.io(clamp((t - T0) / (tEnd - T0)))), kt = P(t, tr, 0.55, ease.back), kc = P(t, tr, 1.1, ease.io);
      for (let i = 0; i < N; i++) {
        if (i < S) ch.set(i, i <= play ? ch.height(i) * (1 + 0.6 * clamp(1 - (play - i) / 3)) : 0.03, false);
        else if (i === S) ch.set(i, t >= tr ? Math.max(0.03, HS * kt) : 0.0001, 2);
        else ch.set(i, 0.0001, 0);
      }
      ch.commit(); ch.marker(S, t >= tEnd && t < tr ? 0.35 + 0.65 * Math.abs(Math.sin((t - tEnd) * 9)) : 0);
      const [, pz] = ch.pos(Math.floor(play)); const sway = Math.sin((t - T0) * 1.3) * 1.2, creep = Math.max(0, t - tEnd) * 2.2;
      const p0 = [sway, 2.3 + creep * 0.25, pz + 8.5 - creep], l0 = [0, 0.4, pz - 6];
      const orb = Math.max(0, t - tr) * 2.2, p1 = [10 - orb * 2.4, 3.2 + orb * 0.5, sz0 + 31 - orb], l1 = [sx0, HS * 0.47, sz0];
      ch.cam(p0.map((v, i) => lerp(v, p1[i], kc)), l0.map((v, i) => lerp(v, l1[i], kc)), lerp(64, 58, kc)); ch.render();
      if (t < tr) {
        const i = Math.floor(play); cnum.textContent = fmt(TL.views[i]); cnum.style.color = '#fff'; cnum.style.transform = 'scale(.8)';
        clab.textContent = `VIEWS · SHORT #${i + 1}`; cnum.style.top = '250px'; clab.style.top = '420px';
        if (t >= tEnd + 0.25) { cnum.textContent = '?'; cnum.style.color = G; cnum.style.transform = `scale(${1 + 0.15 * Math.abs(Math.sin((t - tEnd) * 9))})`; clab.textContent = `SHORT #${S + 1}`; }
      } else {                                               // the number rides on top of the tower
        const [, py] = ch.project(S, Math.max(0.03, HS * kt)), y = clamp(py - 330, 170, 900);
        cnum.textContent = fmt(TL.views[S] * P(t, tr, 0.6, ease.out5)); cnum.style.color = G;
        cnum.style.transform = `scale(${1.25 + 0.5 * (1 - P(t, tr, 0.35))})`; clab.textContent = `VIEWS · SHORT #${S + 1}`;
        cnum.style.top = y + 'px'; clab.style.top = (y + 200) + 'px';
      }
    };
  }
  // after: everything since the spike rises in a wave while the camera cranes up over the city
  const stats = (sc.stats || []).map((s, i) => { const d = el('div', 'stat', root); d.style.top = (180 + i * 250) + 'px'; d.innerHTML = '<b></b><span></span>'; d.lastChild.textContent = s.label; return d; });
  const tops = [...TL.views.keys()].sort((a, b) => TL.views[b] - TL.views[a]).slice(0, 5).map(i => ({ i, d: el('div', 'tlab', root, fmt(TL.views[i])) }));
  sfx(T0, 'whoosh'); sfx(T0 + 0.15, 'riser', { dur: 1.5, gain: 0.7 }); sfx(T0 + 1.65, 'impact', { gain: 0.8 }); shake(T0 + 1.65, 14, 0.4);
  sc.caps.forEach((c, i) => { sfx(c.t0, 'ticks', { dur: 0.6, count: 16 }); sfx(c.t0 + 0.6, 'ding', { gain: 0.8 }); });
  return t => {
    const tl = t - T0;
    for (let i = 0; i < N; i++) {
      const lv = TL.views[i] >= 1e7 ? 2 : TL.views[i] >= 1e6 ? 1 : 0;
      if (i <= S) ch.set(i, ch.height(i), lv);
      else { const k = P(tl, 0.15 + (i - S) / (N - S) * 1.4, 0.35, ease.back); ch.set(i, Math.max(0.03, ch.height(i) * k), lv); }
    }
    ch.commit();
    const kc = P(tl, 0, 2.0, ease.io), ang = -0.55 + tl * 0.16, rad = 78;        // crane up, then keep circling the city
    const p0 = [10, 3.2, sz0 + 31], l0 = [sx0, HS * 0.47, sz0], l1 = [0, 26, -17], p1 = [Math.sin(ang) * rad, 36 - tl * 1.0, -17 + Math.cos(ang) * rad];
    ch.cam(p0.map((v, i) => lerp(v, p1[i], kc)), l0.map((v, i) => lerp(v, l1[i], kc)), lerp(58, 52, kc)); ch.render();
    tops.forEach(o => {
      const k = P(tl, 0.15 + (o.i - S) / (N - S) * 1.4 + 0.3, 0.25, ease.back), [x, y, z] = ch.project(o.i, ch.height(o.i));
      o.d.style.display = k > 0 && z < 1 && y > 640 ? 'block' : 'none'; o.d.style.left = x + 'px'; o.d.style.top = (y - 64) + 'px'; o.d.style.transform = `translateX(-50%) scale(${k})`;
    });
    stats.forEach((d, i) => {
      const s = sc.stats[i], c = sc.caps[i] || sc.caps[sc.caps.length - 1], k = P(t, c.t0, 0.6, ease.out5);
      d.style.display = t >= c.t0 - 0.03 ? 'block' : 'none';
      d.firstChild.textContent = (s.to * k).toFixed(s.dec || 0) + (s.suffix || '');
      d.style.transform = `scale(${1 + 0.18 * (1 - P(t, c.t0 + 0.6, 0.25)) * (t >= c.t0 + 0.6 ? 1 : 0)})`;
    });
  };
};

BUILD.compare = (sc, root) => {
  // two whole real frames side by side: before (muted) and after (lit), then the real titles underneath
  root.style.background = 'radial-gradient(ellipse at 50% 35%, #1b222c 0%, #0c0c10 72%)';
  const CW = 500, CH = 889, Y0 = 330, XS = [28, 552];
  const mk = (it, x, color, tagText, cls) => {
    const c = el('div', 'pcard ' + cls, root); c.style.left = x + 'px'; c.style.top = Y0 + 'px'; c.style.borderColor = color;
    const m = new Media(c, framesOf(it), CW, CH);
    const tg = el('div', 'ptag', root, tagText); tg.style.left = x + 'px'; tg.style.color = color; tg.style.borderColor = color;
    const v = el('div', 'pviews', root); v.style.left = x + 'px'; v.style.color = color;
    return { c, m, v, tg, it };
  };
  const A = mk(sc.before, XS[0], '#c9c9d2', `BEFORE · #${sc.before.n}`, 'old'), B = mk(sc.after, XS[1], G, `AFTER · #${sc.after.n}`, 'new');
  const q = el('div', 'pq', B.c, '?');
  const meta = el('div', 'pmeta', root, sc.afterMeta || ''); meta.style.left = (XS[1] + 250) + 'px'; meta.style.top = (Y0 + CH + 26) + 'px';
  const nA = el('div', 'note', root, sc.beforeTag || ''); nA.style.cssText += `left:${XS[0] + 40}px;top:${Y0 + CH - 150}px;background:#000;color:#d0d0d8;border:4px solid #d0d0d8`;
  const nB = el('div', 'note', root, sc.afterTag || ''); nB.style.cssText += `left:${XS[1] + 120}px;top:${Y0 + 40}px;background:${G};color:#000`;
  const rg = sc.ring || [820, 690, 190, 170];               // cx, cy, rx, ry on the stage
  const ring = stroke(root, `M ${rg[0] - rg[2]} ${rg[1]} a ${rg[2]} ${rg[3]} 0 1 1 ${2 * rg[2]} 0 a ${rg[2]} ${rg[3]} 0 1 1 ${-2 * rg[2]} 12`, G, 16);
  const hl = (title, words) => title.split(' ').map(w => words.includes(w.replace(/[^\w]/g, '')) ? `<mark>${w}</mark>` : w).join(' ');
  const t1 = el('div', 'ytt old', root); t1.style.top = '1010px'; t1.innerHTML = `<small>TITLE · BEFORE</small>${sc.before.title}`; const st = el('div', 'strike', t1);
  const t2 = el('div', 'ytt', root); t2.style.top = '1235px'; el('small', '', t2, 'TITLE · AFTER'); const t2b = el('span', '', t2);
  const [c0, c1, c2] = sc.caps, T0 = sc.t0, full = sc.after.title;
  sfx(T0, 'whoosh'); sfx(c1.t0, 'impact', { gain: 0.9 }); shake(c1.t0, 20, 0.35); flash(c1.t0, 0.15, 0.5);
  sfx(c1.t0 + 0.45, 'pop'); sfx(c2.t0 - 0.05, 'whoosh'); sfx(c2.t0 + 0.25, 'stamp'); sfx(c2.t0 + 0.4, 'typing', { dur: 1.0 }); sfx(c2.t0 + 1.45, 'ding');
  return t => {
    const tl = t - T0, up = P(t, c2.t0 - 0.1, 0.4, ease.io), sc2 = lerp(1, 0.72, up);
    A.m.draw(fidx(A.it, tl, 0.45), { zoom: 1.0 + 0.012 * tl }); A.v.textContent = fmt(A.it.views * P(tl, 0.15, 0.5, ease.out5));
    const kb = P(t, c1.t0, 0.35, ease.back), shown = t >= c1.t0;
    B.m.draw(B.it.clip ? fidx(B.it, t - c1.t0, 1) : (t < c2.t0 ? 0 : Math.floor((t - c2.t0) / 0.4)), { zoom: 1.0 + 0.012 * Math.max(0, t - c1.t0) });
    B.m.c.style.visibility = shown ? 'visible' : 'hidden'; q.style.display = shown ? 'none' : 'block';
    B.v.textContent = shown ? fmt(B.it.views * P(t, c1.t0, 0.6, ease.out5)) : '';
    const kin = P(tl, 0, 0.4, ease.back);
    A.c.style.transform = `translateY(${lerp(900, -70 * up, kin)}px) rotate(${lerp(-8, -1.5, kin)}deg) scale(${sc2 * (shown ? 0.96 : 1)})`;
    A.c.style.filter = `saturate(.5) brightness(${shown ? 0.62 : 0.9})`;
    B.c.style.transform = `translateY(${lerp(900, -70 * up, P(tl, 0.08, 0.4, ease.back))}px) rotate(1.5deg) scale(${sc2 * (shown ? lerp(1.18, 1.04, kb) : 1)})`;
    B.c.style.boxShadow = shown ? '0 0 80px rgba(61,255,136,.6), 0 30px 80px rgba(0,0,0,.7)' : '0 30px 80px rgba(0,0,0,.7)';
    [A, B].forEach(o => { o.tg.style.opacity = o.v.style.opacity = P(tl, 0.2, 0.2) * (1 - up); });
    nA.style.transform = `scale(${P(tl, 0.5, 0.25, ease.back) * (t < c2.t0 - 0.1 ? 1 : 0)})`;
    nB.style.transform = `rotate(4deg) scale(${P(t, c1.t0 + 0.45, 0.25, ease.back) * (t < c2.t0 - 0.1 ? 1 : 0)})`;
    ring.set(t < c2.t0 - 0.1 ? (t - c1.t0 - 0.3) / 0.45 : 0);
    meta.style.transform = `translateX(-50%) scale(${sc.afterMeta ? P(t, c1.t0 + 0.8, 0.25, ease.back) * (t < c2.t0 - 0.1 ? 1 : 0) : 0})`;
    const k1 = P(t, c2.t0 - 0.05, 0.3, ease.back), k2 = P(t, c2.t0 + 0.3, 0.3, ease.back);
    t1.style.transform = `translateX(${lerp(-1100, 0, k1)}px) rotate(-2deg)`; st.style.width = (P(t, c2.t0 + 0.25, 0.25) * 860) + 'px';
    t2.style.transform = `translateX(${lerp(1100, 80, k2)}px) rotate(1.5deg)`;
    const nch = Math.round(full.length * clamp((t - c2.t0 - 0.4) / 1.0));
    t2b.innerHTML = nch >= full.length ? hl(full, sc.hlAfter || []) : full.slice(0, nch) + (nch > 0 ? '▍' : '');
  };
};

BUILD.montage = (sc, root) => {
  const its = sc.items.map((it, i) => {
    const l = el('div', 'layer', root), m = new Media(l, framesOf(it)); grad(l, TOPBOT);
    const n = el('div', 'mnum', l), lb = el('div', 'mlab', l, 'VIEWS');
    const tt = el('div', 'ytt', l); tt.style.top = '1420px'; tt.style.left = '70px'; tt.innerHTML = `<small>SHORT #${it.n} · REAL TITLE</small>${it.title}`;
    const c = sc.caps[i]; sfx(c.t0 - 0.08, 'whoosh'); sfx(c.t0 + 0.05, 'ticks', { dur: 0.55, count: 16 }); sfx(c.t0 + 0.6, 'impact', { gain: 0.7 }); shake(c.t0 + 0.6, 16, 0.3);
    return { l, m, n, tt, it, c };
  });
  return t => its.forEach((o, i) => {
    const a = i === 0 ? sc.t0 : o.c.t0 - 0.06, b = i + 1 < its.length ? its[i + 1].c.t0 - 0.06 : sc.t1, on = t >= a && t < b;
    o.l.style.display = on ? 'block' : 'none'; if (!on) return;
    const lt = t - a; o.m.draw(fidx(o.it, lt, 0.34), { zoom: 1.2 - 0.14 * P(lt, 0, 0.3) + 0.04 * lt, rot: (i % 2 ? 1 : -1) * 0.012 * (1 - P(lt, 0, 0.3)) });
    const k = P(lt, 0.06, 0.55, ease.out5); o.n.textContent = fmt(o.it.views * k);
    o.n.style.transform = `scale(${k >= 1 ? 1 + 0.2 * (1 - P(lt, 0.61, 0.25)) : 0.85})`;
    o.tt.style.transform = `translateY(${lerp(500, 0, P(lt, 0.2, 0.35, ease.back))}px) rotate(${i % 2 ? 1.5 : -1.5}deg)`;
  });
};

BUILD.titlewall = (sc, root) => {
  root.style.background = 'radial-gradient(ellipse at 50% 30%, #18202a 0%, #0c0c10 70%)';
  const re = new RegExp(sc.pattern), esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  el('div', 'wlab', root, sc.label || '');
  const mk = (titles, x, head, color) => {
    const pc = el('div', 'pct', root); pc.style.left = x + 'px'; pc.style.color = color;
    const hd = el('div', 'colh', root, head); hd.style.left = x + 'px';
    const c = el('div', 'col', root); c.style.left = x + 'px';
    const chips = titles.map((tt, i) => {
      const d = el('div', 'chip' + (re.test(tt) ? ' on' : ''), c); d.style.top = (i * 86) + 'px'; d.style.left = '0px';
      d.innerHTML = esc(tt).replace(/(\?|…|\.\.\.)/g, '<em>$1</em>'); return d;
    });
    return { pc, c, inner: chips, n: titles.length };
  };
  const A = mk(sc.before, 30, `BEFORE #${TL.scenes.find(s => s.type === 'chart').spike + 1}`, '#c9c9d2'), B = mk(sc.after, 550, 'AFTER', G);
  const T0 = sc.t0; sfx(T0, 'whoosh', { gain: 0.5 }); sfx(T0 + 0.2, 'ticks', { dur: 0.7, count: 14, gain: 0.6 }); sfx(T0 + 1.05, 'ticks', { dur: 0.7, count: 20, gain: 0.6 }); sfx(T0 + 1.8, 'impact', { gain: 0.6 }); shake(T0 + 1.8, 14, 0.3);
  return t => {
    const tl = t - T0;
    [A, B].forEach((o, j) => {
      const y = -(220 + j * 60) * tl - 40; o.inner.forEach((d, i) => { d.style.transform = `translateY(${y}px)`; });
      const k = P(tl, 0.2 + j * 0.85, 0.7, ease.out5); o.pc.textContent = Math.round((j ? sc.b : sc.a) * k) + '%';
      o.pc.style.transform = `scale(${j && k >= 1 ? 1.12 + 0.2 * (1 - P(tl, 1.75, 0.3)) : 1})`; o.pc.style.opacity = tl >= 0.15 + j * 0.85 ? 1 : 0.15;
    });
  };
};

BUILD.steal = (sc, root) => {
  const bg = new Media(root, [sc.bg]); bg.c.style.filter = 'blur(26px) brightness(.38) saturate(1.2)'; bg.c.style.transform = 'scale(1.15)';
  const card = el('div', 'card', root), h1 = el('h1', '', card, 'STEAL THIS');
  const lines = sc.lines.map((tx, i) => { const l = el('div', 'line', card); l.style.top = (160 + i * 262) + 'px'; el('div', 'n', l, '' + (i + 1)); el('div', '', l, tx); return l; });
  el('div', 'shot', card, 'SCREENSHOT THIS');
  const T0 = sc.t0, cs = sc.caps; sfx(T0, 'impact', { gain: 0.8 }); shake(T0, 16, 0.3);
  lines.forEach((_, i) => sfx(cs[i + 1].t0, 'pop', { f0: 520 + i * 120 })); sfx(sc.t1 - 0.55, 'shutter'); flash(sc.t1 - 0.55, 0.18, 0.85);
  return t => {
    const tl = t - T0; bg.draw(0, { zoom: 1 + 0.035 * tl, ox: Math.sin(tl * 0.9) * 40, rot: 0.01 * tl });
    card.style.transform = `translateY(${Math.sin(tl * 1.7) * 9}px) scale(${lerp(0.7, 1, P(tl, 0, 0.35, ease.back))}) rotate(${lerp(-4, 0, P(tl, 0, 0.35)) + Math.sin(tl * 1.1) * 0.5}deg)`;
    h1.style.transform = `translateX(-50%) scale(${P(tl, 0.05, 0.3, ease.back)}) rotate(-3deg)`;
    lines.forEach((l, i) => { const k = P(t, cs[i + 1].t0 - 0.04, 0.3, ease.back); l.style.opacity = t >= cs[i + 1].t0 - 0.04 ? 1 : 0; l.style.transform = `translateX(${lerp(-160, 0, k)}px)`; });
  };
};

BUILD.cta = (sc, root) => {
  const bg = new Media(root, [sc.bg]); bg.c.style.filter = 'blur(18px) brightness(.3)'; bg.c.style.transform = 'scale(1.12)';
  const loop = new Media(root, [TL.scenes[0].hit.frames[0]]); grad(root, 'rgba(0,0,0,0)');
  const logo = el('div', 'logo', root), hs = [0.16, 0.22, 0.14, 0.2, 0.18, 1.0, 0.62];
  const bars = hs.map((h, i) => { const b = el('i', '', logo); if (i >= 5) { b.style.background = G; b.style.boxShadow = '0 0 50px rgba(61,255,136,.7)'; } return b; });
  const lt = el('div', 'logot', root, 'THE SPIKE FILES'), box = el('div', 'cbox', root);
  const T0 = sc.t0, typed = 'investigate @', tLoop = sc.t1 - 0.2;
  sfx(T0, 'whoosh'); sfx(T0 + 0.35, 'impact', { gain: 0.7 }); sfx(sc.caps[sc.caps.length - 1].t0, 'typing', { dur: 0.7 }); sfx(tLoop - 0.12, 'whoosh');
  return t => {
    const tl = t - T0; bg.draw(0, { zoom: 1 + 0.03 * tl });
    bars.forEach((b, i) => { b.style.height = (420 * hs[i] * P(tl, (i >= 5 ? 0.3 : 0.04 * i), i >= 5 ? 0.4 : 0.25, ease.back)) + 'px'; });
    lt.style.transform = `scale(${P(tl, 0.15, 0.3, ease.back)})`;
    const c = sc.caps[sc.caps.length - 1], n = Math.round(typed.length * clamp((t - c.t0) / 0.6));
    box.style.transform = `translateY(${lerp(500, 0, P(t, c.t0 - 0.2, 0.3, ease.back))}px)`; box.textContent = typed.slice(0, n) + (Math.floor(t * 4) % 2 ? '|' : '');
    const on = t >= tLoop; loop.c.style.display = on ? 'block' : 'none'; if (on) loop.draw(0, { zoom: 1.06 });
    [logo, lt, box].forEach(e => { e.style.visibility = on ? 'hidden' : 'visible'; });
  };
};

// ------------------------------------------------------------------ build
const scenesEl = document.getElementById('scenes'), capsEl = document.getElementById('caps');
const CAPY = { hook: 1330, uiscroll: 1330, chart: 1380, compare: [1400, 1400, 1560], montage: 1130, titlewall: 1500, steal: 1500, cta: 1200 };
const scenes = [], caps = [];
for (const [si, sc] of TL.scenes.entries()) {
  const root = el('div', 'scene', scenesEl);
  scenes.push({ sc, root, update: await BUILD[sc.type](sc, root) });
  sc.caps.forEach((c, ci) => {
    if (c.hide || !c.text) return;
    const d = el('div', 'cap', capsEl), n = c.text.length;
    d.style.fontSize = (n <= 12 ? 136 : n <= 20 ? 116 : n <= 30 ? 96 : 80) + 'px';
    const cy = sc.capY ?? CAPY[sc.type] ?? 1250; d.dataset.y = Array.isArray(cy) ? cy[Math.min(ci, cy.length - 1)] : cy;
    const ws = c.words.map(w => { const s = el('span', '', d, w.w); s.style.color = w.hl ? G : '#fff'; return { s, w }; });
    const nxt = sc.caps.slice(ci + 1).find(x => !x.hide && x.text);
    caps.push({ d, c, ws, end: Math.min(nxt ? nxt.t0 - 0.02 : sc.t1, c.t1 + 0.9, sc.t1), rot: (caps.length % 2 ? 1 : -1) * 1.6 });
  });
}
TL.scenes.forEach((sc, i) => { if (i) flash(sc.t0, 0.1, 0.16); });
// hud
const ico = document.querySelector('#brand .ico'); [0.3, 0.42, 0.28, 0.38, 0.34, 1, 0.66].forEach((h, i) => { const b = el('i', '', ico); b.style.height = (h * 44) + 'px'; if (i >= 5) b.style.background = G; });
document.getElementById('credit').textContent = `public view counts · ${TL.asof} · ${TL.handle}`;
const gr = document.getElementById('grain'), gx = gr.getContext('2d'), gd = gx.createImageData(540, 960), rr = rnd(7);
for (let i = 0; i < gd.data.length; i += 4) { const v = 255 * rr(); gd.data[i] = gd.data[i + 1] = gd.data[i + 2] = v; gd.data[i + 3] = 255; } gx.putImageData(gd, 0, 0);
const world = document.getElementById('world'), flashEl = document.getElementById('flash'), prog = document.getElementById('prog');

window.setFrame = f => {
  const t = f / FPS;
  for (const s of scenes) {
    const on = t >= s.sc.t0 && t < s.sc.t1; s.root.style.display = on ? 'block' : 'none';
    if (on) { s.update(t); const k = P(t, s.sc.t0, 0.28, ease.out5); s.root.style.transform = s.sc.type === 'hook' ? '' : `scale(${1.08 - 0.08 * k})`; }
  }
  for (const c of caps) {
    const on = t >= c.c.t0 - 0.02 && t < c.end; c.d.style.display = on ? 'block' : 'none'; if (!on) continue;
    c.d.style.top = (c.d.dataset.y - c.d.offsetHeight / 2) + 'px'; c.d.style.transform = `rotate(${c.rot}deg)`;
    for (const { s, w } of c.ws) { const k = P(t, w.t0, 0.16, ease.back); s.style.opacity = t >= w.t0 - 0.01 ? 1 : 0; s.style.transform = `translateY(${(1 - k) * 34}px) scale(${lerp(0.35, 1, k)})`; }
  }
  let sxp = 0, syp = 0; const r2 = rnd(f * 7919 + 13);
  for (const s of SHAKES) { const k = (t - s.t) / s.dur; if (k >= 0 && k < 1) { const a = s.amp * (1 - k) ** 2; sxp += (r2() - 0.5) * 2 * a; syp += (r2() - 0.5) * 2 * a; } }
  world.style.transform = `translate(${sxp.toFixed(1)}px,${syp.toFixed(1)}px)`;
  let fa = 0; for (const s of FLASHES) { const k = (t - s.t) / s.dur; if (k >= 0 && k < 1) fa = Math.max(fa, s.a * (1 - k) ** 2); }
  flashEl.style.opacity = fa;
  gr.style.transform = `translate(${(f * 37) % 23 - 11}px,${(f * 53) % 19 - 9}px) scale(1.03)`;
  prog.style.width = (W * t / DUR) + 'px';
};

await Promise.all([...IMG.values()].map(i => i.complete ? 0 : new Promise((res, rej) => { i.onload = res; i.onerror = () => rej(new Error('image failed: ' + i.src)); })));
await Promise.all(['MB', 'ME', 'OB', 'OX'].map(f => document.fonts.load(`40px ${f}`)));
window.setFrame(0);
window.READY = true;
