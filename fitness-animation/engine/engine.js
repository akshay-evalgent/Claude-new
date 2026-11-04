/*
 * Motion: a small deterministic animation runtime for anatomy explainer videos.
 *
 * Every element's look is a pure function of the time t (seconds), so the
 * browser preview and the frame-by-frame MP4 render always agree. Nothing
 * uses CSS transitions, requestAnimationFrame timing or Math.random.
 *
 * Authoring:  Motion.episode({ scenes: [ Motion.scene({ dur, build(s) { s.plate(...); s.arrow(...); } }) ] })
 * See episodes/grip-strength.js for a complete example of every component.
 */
(function () {
  'use strict';

  const W = 1920, H = 1080, NS = 'http://www.w3.org/2000/svg';
  // Timings measured on the reference video (see ANALYSIS.md)
  const POP = 0.08;        // text line / number appears: 4-5 frames
  const XFADE = 0.55;      // image-to-image crossfade
  const DIP = 0.27;        // fade to / from black at a section break
  const DIP_HOLD = 0.3;    // black hold at a section break

  // ------------------------------------------------------------------ math
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  const ease = {
    linear: k => k,
    outCubic: k => 1 - Math.pow(1 - k, 3),
    outQuart: k => 1 - Math.pow(1 - k, 4),
    outQuint: k => 1 - Math.pow(1 - k, 5),
    outExpo: k => (k >= 1 ? 1 : 1 - Math.pow(2, -10 * k)),
    inCubic: k => k * k * k,
    inOutCubic: k => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2),
    inOutSine: k => -(Math.cos(Math.PI * k) - 1) / 2,
    outBack: k => { const c1 = 1.5, c3 = c1 + 1; return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); },
  };
  const E = name => (typeof name === 'function' ? name : ease[name] || ease.outCubic);
  /** eased progress of the window [start, start+dur] at time t */
  function prog(t, start, dur, e) {
    if (dur <= 0) return t >= start ? 1 : 0;
    return E(e)(clamp((t - start) / dur));
  }
  /** enter/exit envelope: 0 before `at`, 1 while shown, back to 0 after `out` */
  function life(t, o, inDur, outDur) {
    const a = prog(t, o.at || 0, o.inDur != null ? o.inDur : inDur, o.ease || 'outCubic');
    const b = o.out != null ? prog(t, o.out, o.outDur != null ? o.outDur : outDur, 'inOutCubic') : 0;
    return { a, b, v: a * (1 - b) };
  }
  function rng(seed) { // mulberry32
    let s = seed >>> 0;
    return () => { s = (s + 0x6d2b79f5) >>> 0; let x = s; x = Math.imul(x ^ (x >>> 15), x | 1); x ^= x + Math.imul(x ^ (x >>> 7), x | 61); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
  }
  function hex(c) { const n = parseInt(c.replace('#', ''), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }

  // ------------------------------------------------------------------ theme
  const theme = {
    bg: '#000000', ink: '#F3F3F1', muted: '#8E8E96', card: '#0B0B0E', line: '#26262C',
    hl: '#FF3434',      // muscle / tendon highlight (anatomy red)
    accent: '#FF8A1F',  // channel accent: answers, key numbers
    good: '#5BE38B',    // prescriptions, "do this"
    warn: '#FFC23D',    // safety badge
    grain: 0.12,
  };
  const col = c => (c && theme[c] ? theme[c] : c || theme.ink);

  // ------------------------------------------------------------------ dom helpers
  function el(tag, cls, parent, style) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (style) Object.assign(e.style, style);
    if (parent) parent.appendChild(e);
    return e;
  }
  function svg(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    if (attrs) for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  let uid = 0;
  const nextId = p => `${p}${++uid}`;

  /** Smooth hand-drawn path through points (Catmull-Rom -> cubic Bezier). */
  function smoothPath(pts) {
    let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
      const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      d += ` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
    }
    return d;
  }
  /** Points along a bent stroke from a to b with a little marker wobble. */
  function strokePoints(a, b, bend, wobble, seed, n = 26) {
    const r = rng(seed);
    const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len, ny = dx / len;
    const c = [a[0] + dx / 2 + nx * bend * len, a[1] + dy / 2 + ny * bend * len];
    const ph1 = r() * 6.28, ph2 = r() * 6.28;
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const k = i / n, u = 1 - k;
      let x = u * u * a[0] + 2 * u * k * c[0] + k * k * b[0];
      let y = u * u * a[1] + 2 * u * k * c[1] + k * k * b[1];
      const w = wobble * Math.sin(k * Math.PI) * (Math.sin(k * 7.1 + ph1) * 0.6 + Math.sin(k * 15.3 + ph2) * 0.4);
      pts.push([x + nx * w, y + ny * w]);
    }
    return pts;
  }

  // ------------------------------------------------------------------ registry
  const plates = {};          // filled by assets/plates/plates.js
  const cues = [];            // sound cues [{t, type, gain}] in episode time
  let EP = null;

  // ================================================================== Scene
  class Scene {
    constructor(o) {
      this.o = o;
      this.dur = o.dur;
      // resolved in mount() from the transition into and out of this scene
      this.fadeIn = 0; this.fadeOut = 0; this.overlapIn = 0; this.gapIn = 0;
      this.items = [];
    }
    mount(stage, start) {
      this.start = start;
      this.root = el('div', 'scene', stage);
      this.world = el('div', 'world', this.root);
      this.hud = el('div', 'world', this.root);   // screen chrome (tag, badge): not moved by the camera
      this.svg = svg('svg', { class: 'svgfull', viewBox: `0 0 ${W} ${H}` });
      this.defs = svg('defs', null, this.svg);
      this.o.build(this);
      this.world.appendChild(this.svg); // vector overlays (arrows, pins) sit above images and text
    }
    cue(tLocal, type, gain = 1) { cues.push({ t: +(this.start + tLocal).toFixed(3), type, gain }); }
    add(item) { this.items.push(item); return item; }
    update(T) {
      const t = T - this.start;
      const vis = T >= this.start - 0.001 && T <= this.start + this.dur + 0.001;
      this.root.style.display = vis ? 'block' : 'none';
      if (!vis) return;
      const fi = prog(t, 0, this.fadeIn, 'linear'), fo = 1 - prog(t, this.dur - this.fadeOut, this.fadeOut, 'linear');
      this.root.style.opacity = Math.min(fi, fo);
      // camera: slow continuous push so the frame never fully freezes
      // camera. Measured on the reference: instruction shots are locked (default),
      // story shots push in 1.2-1.8 % per second toward the subject: cam: { push: 1.5, cx, cy }
      const cam = this.o.cam || {};
      const s0 = cam.s0 != null ? cam.s0 : 1;
      const s1 = cam.push != null ? s0 * Math.pow(1 + cam.push / 100, this.dur) : (cam.s1 != null ? cam.s1 : 1);
      const k = prog(t, 0, this.dur, cam.ease || (cam.push != null ? 'linear' : 'inOutSine'));
      const s = lerp(s0, s1, k);
      const x = lerp(cam.x0 || 0, cam.x1 || 0, k), y = lerp(cam.y0 || 0, cam.y1 || 0, k);
      if (cam.cx != null || cam.cy != null) this.world.style.transformOrigin = `${cam.cx != null ? cam.cx : W / 2}px ${cam.cy != null ? cam.cy : H / 2}px`;
      this.world.style.transform = `translate(${x}px,${y}px) scale(${s})`;
      for (const it of this.items) it.update(t);
    }

    // -------------------------------------------------------------- components
    /** Engraved figure on black with ink-in reveal, push, dim and red muscle highlights. */
    plate(o) { return this.add(new Plate(this, o)); }
    /** Thick red marker arrow that draws itself on. */
    arrow(o) { return this.add(new Arrow(this, o)); }
    /** Hand-drawn strike-through / underline / circle stroke. */
    stroke(o) { return this.add(new Stroke(this, o)); }
    /** Handwritten label that writes on left to right. */
    hand(o) { return this.add(new Hand(this, o)); }
    /** Stack of short lines (question / answer / prescription), staggered. */
    lines(o) { return this.add(new Lines(this, o)); }
    /** Anatomical call-out: pulsing dot, leader line, label. */
    pin(o) { return this.add(new Pin(this, o)); }
    /** Rounded card with drawn border, kicker, title, a visual and a caption. */
    card(o) { return this.add(new Card(this, o)); }
    /** Big uppercase headline, word by word. */
    headline(o) { return this.add(new Headline(this, o)); }
    /** Free text that fades up. */
    text(o) { return this.add(new Text(this, o)); }
    /** Number that counts up. */
    counter(o) { return this.add(new Counter(this, o)); }
    /** Chapter title card: ghost number, title, drawn underline. */
    chapter(o) { return this.add(new Chapter(this, o)); }
    /** Safety badge (bottom-left by default). */
    badge(o) { return this.add(new Badge(this, o)); }
    /** Series tag, top-left pill with a red bar ("TENDON TRAINING · AT HOME"). */
    tag(o) { return this.add(new Tag(this, o)); }
    /** Running ring timer in real seconds; `move` keyframes can shrink it to a corner while it keeps counting. */
    timer(o) { return this.add(new Timer(this, o)); }
  }

  // ================================================================== Plate
  class Plate {
    constructor(s, o) {
      const p = plates[o.plate];
      if (!p) throw new Error(`unknown plate "${o.plate}" - add it to assets/plates/plates.js`);
      this.o = o; this.p = p; this.s = s;
      const id = nextId('pl');
      const w = p.w, h = p.h;
      this.h = o.h || 900;
      this.box = svg('svg', { viewBox: `0 0 ${w} ${h}`, width: this.h * w / h, height: this.h }, null);
      this.box.style.cssText = 'position:absolute;left:0;top:0;overflow:visible;transform-origin:50% 50%';
      if (o.flip) this.box.style.scale = '-1 1';
      const defs = svg('defs', null, this.box);
      // reveal: soft wipe along a direction (default top -> bottom)
      const dir = o.reveal || [0, 0, 0, 1];
      this.wipe = svg('linearGradient', { id: id + 'w', x1: dir[0], y1: dir[1], x2: dir[2], y2: dir[3] }, defs);
      this.w0 = svg('stop', { offset: 0, 'stop-color': '#fff' }, this.wipe);
      this.w1 = svg('stop', { offset: 0, 'stop-color': '#000' }, this.wipe);
      const m = svg('mask', { id: id + 'm', maskUnits: 'userSpaceOnUse', x: -20, y: -20, width: w + 40, height: h + 40 }, defs);
      svg('rect', { x: -20, y: -20, width: w + 40, height: h + 40, fill: `url(#${id}w)` }, m);
      // develop: contrast rises from a washed pencil ghost to full ink; dim scales it all
      const f = svg('filter', { id: id + 'd', 'color-interpolation-filters': 'sRGB', x: 0, y: 0, width: 1, height: 1 }, defs);
      const ct = svg('feComponentTransfer', null, f);
      this.dev = ['R', 'G', 'B'].map(c => svg('feFunc' + c, { type: 'linear', slope: 1, intercept: 0 }, ct));
      const g = svg('g', { mask: `url(#${id}m)` }, this.box);
      this.img = svg('image', { href: p.src, width: w, height: h, filter: `url(#${id}d)`, preserveAspectRatio: 'none' }, g);
      // highlights
      this.hls = (o.highlight || []).map((hl, i) => {
        const region = p.regions && p.regions[hl.region];
        if (!region) throw new Error(`plate "${o.plate}" has no region "${hl.region}"`);
        const c = hex(col(hl.color || 'hl'));
        const hid = `${id}h${i}`;
        const fd = svg('filter', { id: hid + 'f', 'color-interpolation-filters': 'sRGB', x: -0.1, y: -0.1, width: 1.2, height: 1.2 }, defs);
        svg('feColorMatrix', { type: 'saturate', values: 0, result: 'g' }, fd);
        const tr = svg('feComponentTransfer', { in: 'g', result: 'duo' }, fd);
        // ink -> deep tone of the colour, paper -> light tint of it
        ['R', 'G', 'B'].forEach((ch, j) => svg('feFunc' + ch, { type: 'table', tableValues: `${(c[j] / 255 * 0.12).toFixed(3)} ${(lerp(c[j], 255, 0.06) / 255).toFixed(3)}` }, tr));
        svg('feGaussianBlur', { in: 'duo', stdDeviation: 7, result: 'glow' }, fd);
        const mg = svg('feMerge', null, fd);
        svg('feMergeNode', { in: 'glow' }, mg); svg('feMergeNode', { in: 'duo' }, mg);
        const sw = hl.sweep || [0, 0, 0, h];
        const grad = svg('linearGradient', { id: hid + 'g', gradientUnits: 'userSpaceOnUse', x1: sw[0], y1: sw[1], x2: sw[2], y2: sw[3] }, defs);
        const s0 = svg('stop', { offset: 0, 'stop-color': '#fff' }, grad), s1 = svg('stop', { offset: 0, 'stop-color': '#000' }, grad);
        const fb = svg('filter', { id: hid + 'b', x: -0.2, y: -0.2, width: 1.4, height: 1.4 }, defs);
        svg('feGaussianBlur', { stdDeviation: hl.feather || 26 }, fb);
        const mk = svg('mask', { id: hid + 'm', maskUnits: 'userSpaceOnUse', x: -40, y: -40, width: w + 80, height: h + 80 }, defs);
        svg('path', { d: region, fill: `url(#${hid}g)`, filter: `url(#${hid}b)` }, mk);
        const im = svg('image', { href: p.src, width: w, height: h, filter: `url(#${hid}f)`, mask: `url(#${hid}m)`, preserveAspectRatio: 'none' }, g);
        s.cue((hl.at || 0), 'swell', 0.7);
        return { hl, im, s0, s1 };
      });
      s.world.appendChild(this.box);
      s.cue(o.at || 0, 'whoosh', 0.8);
    }
    /** keyframed x, y, h, dim: [{at, dur, x, y, h, dim, ease}] applied in order */
    state(t) {
      const o = this.o;
      let x = o.x, y = o.y, h = this.h, dim = o.dim != null ? o.dim : 1;
      for (const k of o.to || []) {
        const q = prog(t, k.at, k.dur || 0.8, k.ease || 'inOutCubic');
        if (k.x != null) x = lerp(x, k.x, q);
        if (k.y != null) y = lerp(y, k.y, q);
        if (k.h != null) h = lerp(h, k.h, q);
        if (k.dim != null) dim = lerp(dim, k.dim, q);
      }
      return { x, y, h, dim };
    }
    update(t) {
      // style 'fade' (default): a 0.55 s fade, as the reference brings images in.
      // style 'ink': soft top-down wipe while contrast develops, with a small scale settle.
      const o = this.o, at = o.at || 0, ink = o.style === 'ink', inDur = o.inDur || (ink ? 1.1 : 0.55);
      const L = life(t, o, inDur, 0.5);
      const st = this.state(t);
      let fadeIn = 1, settle = 1, slope = st.dim, icpt = 0;
      if (ink) {
        const f = 0.16, e = lerp(-f, 1 + f, prog(t, at, inDur, 'inOutSine'));
        this.w0.setAttribute('offset', clamp(e - f)); this.w1.setAttribute('offset', clamp(e + f));
        const dv = prog(t, at + inDur * 0.25, inDur, 'outCubic');
        slope = lerp(0.28, 1, dv) * st.dim; icpt = lerp(0.62, 0, dv) * st.dim;
        settle = lerp(1.035, 1, prog(t, at, inDur * 1.4, 'outCubic'));
      } else {
        this.w0.setAttribute('offset', 1); this.w1.setAttribute('offset', 1);
        fadeIn = at > 0.001 ? prog(t, at, inDur, 'linear') : 1;
      }
      for (const fn of this.dev) { fn.setAttribute('slope', slope.toFixed(4)); fn.setAttribute('intercept', icpt.toFixed(4)); }
      const push = 1 + (o.push || 0) * clamp((t - at) / Math.max(1, (o.pushDur || 8)));
      const sc = settle * push * (st.h / this.h) * lerp(1, 0.985, L.b);
      const bw = this.h * this.p.w / this.p.h;
      this.box.style.transform = `translate(${st.x - bw / 2}px,${st.y - this.h / 2}px) scale(${sc})`;
      this.box.style.opacity = (fadeIn * (1 - L.b)).toFixed(4);
      this.box.style.display = t < at - 0.01 ? 'none' : 'block';
      for (const { hl, im, s0, s1 } of this.hls) {
        const hp = prog(t, hl.at || 0, hl.dur || 1.2, 'inOutCubic');
        const ff = 0.12, he = lerp(-ff, 1 + ff, hp);
        s0.setAttribute('offset', clamp(he - ff)); s1.setAttribute('offset', clamp(he + ff));
        let op = hp > 0 ? 1 : 0;
        if (hl.pulse !== false && hp >= 1) op = 0.86 + 0.14 * Math.cos((t - (hl.at || 0) - (hl.dur || 1.2)) * 2.4);
        if (hl.out != null) op *= 1 - prog(t, hl.out, hl.outDur || 0.5, 'inOutCubic');
        im.setAttribute('opacity', (op * Math.max(0.35, st.dim)).toFixed(4));
      }
    }
  }

  // ================================================================== Arrow & Stroke
  class Arrow {
    constructor(s, o) {
      this.o = o;
      const a = o.from, b = o.to, w = o.width || 11;
      const pts = strokePoints(a, b, o.bend != null ? o.bend : 0.28, o.wobble != null ? o.wobble : 3, o.seed || 7);
      this.g = svg('g', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', fill: 'none', stroke: col(o.color || 'hl') }, s.svg);
      this.shaft = svg('path', { d: smoothPath(pts), 'stroke-width': w, pathLength: 1, 'stroke-dasharray': '1 1', 'stroke-dashoffset': 1 }, this.g);
      const n = pts.length - 1, tip = pts[n], prev = pts[n - 3];
      const ang = Math.atan2(tip[1] - prev[1], tip[0] - prev[0]), hl = o.head || 40, sp = 0.52;
      const l = [tip[0] - hl * Math.cos(ang - sp), tip[1] - hl * Math.sin(ang - sp)];
      const r = [tip[0] - hl * Math.cos(ang + sp), tip[1] - hl * Math.sin(ang + sp)];
      this.head = svg('path', { d: `M${l[0]},${l[1]} L${tip[0]},${tip[1]} L${r[0]},${r[1]}`, 'stroke-width': w, pathLength: 1, 'stroke-dasharray': '1 1', 'stroke-dashoffset': 1 }, this.g);
      s.cue(o.at || 0, 'marker', 0.9);
    }
    update(t) {
      const o = this.o, at = o.at || 0, d = o.dur || 0.55;
      const k1 = prog(t, at, d * 0.78, 'inOutCubic'), k2 = prog(t, at + d * 0.7, d * 0.3, 'outCubic');
      this.shaft.setAttribute('stroke-dashoffset', (1 - k1).toFixed(4));
      this.head.setAttribute('stroke-dashoffset', (1 - k2).toFixed(4));
      const L = life(t, o, d, 0.35);
      this.g.setAttribute('opacity', (t < at ? 0 : 1 - L.b).toFixed(4));
    }
  }
  class Stroke {
    constructor(s, o) {
      this.o = o;
      let d;
      if (o.circle) { // loose hand-drawn ellipse around [cx, cy] with radii [rx, ry]
        const [cx, cy] = o.circle, [rx, ry] = o.r, r = rng(o.seed || 3), pts = [];
        for (let i = 0; i <= 30; i++) {
          const a = -2.2 + (i / 30) * Math.PI * 2.15, j = 1 + (r() - 0.5) * 0.05;
          pts.push([cx + Math.cos(a) * rx * j, cy + Math.sin(a) * ry * j]);
        }
        d = smoothPath(pts);
      } else d = smoothPath(strokePoints(o.from, o.to, o.bend || 0.04, o.wobble != null ? o.wobble : 2.5, o.seed || 11));
      this.p = svg('path', { d, fill: 'none', stroke: col(o.color || 'hl'), 'stroke-width': o.width || 9, 'stroke-linecap': 'round', pathLength: 1, 'stroke-dasharray': '1 1', 'stroke-dashoffset': 1 }, s.svg);
      s.cue(o.at || 0, 'marker', 0.7);
    }
    update(t) {
      const o = this.o, k = prog(t, o.at || 0, o.dur || 0.4, 'inOutCubic'), L = life(t, o, 0.4, 0.3);
      this.p.setAttribute('stroke-dashoffset', (1 - k).toFixed(4));
      this.p.setAttribute('opacity', (t < (o.at || 0) ? 0 : 1 - L.b).toFixed(4));
    }
  }

  // ================================================================== text components
  function anchorXform(align) { return align === 'left' ? '0' : align === 'right' ? '-100%' : '-50%'; }

  class Hand {
    constructor(s, o) {
      this.o = o;
      this.e = el('div', 'abs hand', s.world, { fontSize: (o.size || 76) + 'px', color: col(o.color || 'ink') });
      this.e.textContent = o.text;
      s.cue(o.at || 0, 'write', 0.6);
    }
    update(t) {
      const o = this.o, at = o.at || 0, d = o.dur || 0.6 + o.text.length * 0.018;
      const k = prog(t, at, d, 'inOutSine'), L = life(t, o, d, 0.35);
      const edge = lerp(-12, 112, k);
      const m = `linear-gradient(90deg, #000 ${edge - 12}%, transparent ${edge}%)`;
      this.e.style.maskImage = m; this.e.style.webkitMaskImage = m;
      const dy = lerp(10, 0, prog(t, at, d, 'outCubic'));
      this.e.style.transform = `translate(${o.x}px,${o.y + dy}px) translate(${anchorXform(o.align)},-50%) rotate(${o.rotate != null ? o.rotate : -3}deg)`;
      this.e.style.opacity = t < at ? 0 : (1 - L.b).toFixed(4);
    }
  }

  class Lines {
    constructor(s, o) {
      this.o = o;
      this.rows = o.items.map((it, i) => {
        const e = el('div', 'abs line', s.world, { fontSize: (it.size || o.size || 44) + 'px', color: col(it.color || 'ink') });
        e.textContent = it.text;
        const at = it.at != null ? it.at : (o.at || 0) + i * (o.stagger || 0.5);
        s.cue(at, 'tick', 0.5);
        return { e, at, it, y: o.y + (it.dy != null ? it.dy : i * (o.gap || 66)) };
      });
    }
    update(t) {
      const o = this.o, rise = o.enter === 'rise';
      for (const r of this.rows) {
        const k = prog(t, r.at, o.inDur || (rise ? 0.5 : POP), rise ? 'outCubic' : 'linear');
        const L = o.out != null ? prog(t, o.out, o.outDur || (rise ? 0.4 : 0.2), 'inOutCubic') : 0;
        r.e.style.opacity = (k * (1 - L)).toFixed(4);
        r.e.style.filter = rise && k < 1 ? `blur(${(1 - k) * 6}px)` : 'none';
        r.e.style.transform = `translate(${o.x}px,${r.y + (rise ? (1 - k) * 18 - L * 8 : 0)}px) translate(${anchorXform(o.align || 'center')},-50%)`;
      }
    }
  }

  class Text {
    constructor(s, o) {
      this.o = o;
      this.e = el('div', 'abs line', s.world, Object.assign({ fontSize: (o.size || 44) + 'px', color: col(o.color || 'ink'), fontWeight: o.weight || 600 }, o.style || {}));
      if (o.html) this.e.innerHTML = o.html; else this.e.textContent = o.text;
      if (o.sound !== false) s.cue(o.at || 0, o.sound || 'tick', 0.45);
    }
    update(t) {
      const o = this.o, at = o.at || 0, rise = o.enter === 'rise', d = o.inDur || (rise ? 0.5 : POP);
      const L = life(t, Object.assign({ inDur: d, ease: rise ? 'outCubic' : 'linear' }, o), d, rise ? 0.35 : 0.2);
      const k = prog(t, at, d, rise ? 'outCubic' : 'linear');
      const sc = o.pop ? lerp(0.86, 1, prog(t, at, 0.55, 'outBack')) : 1;
      this.e.style.opacity = (L.v).toFixed(4);
      this.e.style.filter = rise && k < 1 ? `blur(${(1 - k) * 5}px)` : 'none';
      this.e.style.transform = `translate(${o.x}px,${o.y + (rise ? (1 - k) * (o.rise != null ? o.rise : 16) : 0)}px) translate(${anchorXform(o.align)},-50%) scale(${sc})`;
    }
  }

  class Headline {
    constructor(s, o) {
      this.o = o;
      this.e = el('div', 'abs headline', s.world, { fontSize: (o.size || 52) + 'px', color: col(o.color || 'ink') });
      this.words = o.text.split(' ').map((w, i, a) => {
        const sp = el('span', null, this.e, { display: 'inline-block', marginRight: i < a.length - 1 ? '0.28em' : 0 });
        sp.textContent = w; return sp;
      });
      s.cue(o.at || 0, 'pop', 0.6);
    }
    update(t) {
      const o = this.o, at = o.at || 0, L = life(t, o, 0.5, 0.35);
      this.e.style.transform = `translate(${o.x}px,${o.y}px) translate(${anchorXform(o.align)},-50%)`;
      this.e.style.opacity = (1 - L.b).toFixed(4);
      this.words.forEach((w, i) => {
        const k = prog(t, at + i * 0.06, o.enter === 'rise' ? 0.5 : 0.12, 'outCubic');
        w.style.opacity = k.toFixed(4);
        w.style.transform = o.enter === 'rise' ? `translateY(${(1 - k) * 22}px)` : 'none';
      });
    }
  }

  function fmtNum(v, o) {
    const d = o.decimals || 0;
    let s = v.toFixed(d);
    if (o.sep !== false) s = s.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return (o.prefix || '') + s + (o.suffix || '');
  }
  class Counter {
    constructor(s, o) {
      this.o = o;
      this.e = el('div', 'abs line tnum', s.world, { fontSize: (o.size || 120) + 'px', fontWeight: o.weight || 800, color: col(o.color || 'ink'), letterSpacing: '-0.02em' });
      s.cue(o.at || 0, 'roll', 0.6);
    }
    update(t) {
      const o = this.o, at = o.at || 0, L = life(t, Object.assign({ ease: 'linear' }, o), POP, 0.25);
      const k = prog(t, at, o.dur || 1.4, 'outQuart');
      this.e.textContent = fmtNum(lerp(o.from || 0, o.to, k), o);
      this.e.style.opacity = L.v.toFixed(4);
      this.e.style.transform = `translate(${o.x}px,${o.y}px) translate(${anchorXform(o.align)},-50%)`;
    }
  }

  // ================================================================== Pin
  class Pin {
    constructor(s, o) {
      this.o = o;
      const [tx, ty] = o.target, side = o.side || 'right';
      const ex = o.elbow ? o.elbow[0] : tx + (side === 'right' ? 90 : -90), ey = o.elbow ? o.elbow[1] : ty - 60;
      const lx = o.labelX != null ? o.labelX : ex + (side === 'right' ? 160 : -160);
      this.end = [lx, ey]; this.side = side;
      this.g = svg('g', null, s.svg);
      const c = col(o.color || 'ink');
      this.ring = svg('circle', { cx: tx, cy: ty, r: 8, fill: 'none', stroke: c, 'stroke-width': 2.5 }, this.g);
      this.dot = svg('circle', { cx: tx, cy: ty, r: 7, fill: c }, this.g);
      this.line = svg('path', { d: `M${tx},${ty} L${ex},${ey} L${lx},${ey}`, fill: 'none', stroke: c, 'stroke-width': 2.5, 'stroke-opacity': 0.85, pathLength: 1, 'stroke-dasharray': '1 1', 'stroke-dashoffset': 1, 'stroke-linejoin': 'round' }, this.g);
      this.lab = el('div', 'abs line', s.world, { fontSize: (o.size || 38) + 'px', color: col(o.labelColor || o.color || 'ink') });
      this.lab.textContent = o.label;
      if (o.sub) { const sb = el('div', null, this.lab, { fontSize: '0.62em', fontWeight: 500, color: theme.muted, marginTop: '4px' }); sb.textContent = o.sub; }
      s.cue(o.at || 0, 'blip', 0.6);
    }
    update(t) {
      const o = this.o, at = o.at || 0, L = life(t, o, 0.9, 0.35);
      const kd = prog(t, at, 0.35, 'outBack'), kl = prog(t, at + 0.15, 0.55, 'inOutCubic'), kt = prog(t, at + 0.5, 0.45, 'outCubic');
      const vis = t >= at ? 1 - L.b : 0;
      this.g.setAttribute('opacity', vis.toFixed(4));
      this.dot.setAttribute('r', (7 * kd).toFixed(2));
      const pk = t > at + 0.3 ? ((t - at - 0.3) % 1.6) / 1.6 : 0;
      this.ring.setAttribute('r', (8 + pk * 22).toFixed(2));
      this.ring.setAttribute('stroke-opacity', (t > at + 0.3 ? (1 - pk) * 0.7 : 0).toFixed(3));
      this.line.setAttribute('stroke-dashoffset', (1 - kl).toFixed(4));
      const right = this.side === 'right';
      this.lab.style.opacity = (kt * vis).toFixed(4);
      this.lab.style.transform = `translate(${this.end[0] + (right ? 18 : -18) + (1 - kt) * (right ? -14 : 14)}px,${this.end[1]}px) translate(${right ? '0' : '-100%'},-50%)`;
      this.lab.style.textAlign = right ? 'left' : 'right';
    }
  }

  // ================================================================== Card + visuals
  class Card {
    constructor(s, o) {
      this.o = o; this.s = s;
      const { x, y, w, h } = o, c = col(o.color || 'accent');
      this.wrap = el('div', 'abs', s.world, { width: w + 'px', height: h + 'px' });
      this.bg = el('div', 'card-bg', this.wrap, { inset: 0 });
      const bs = svg('svg', { width: w + 8, height: h + 8, viewBox: `-4 -4 ${w + 8} ${h + 8}` }, this.wrap);
      bs.style.cssText = 'position:absolute;left:-4px;top:-4px;overflow:visible';
      this.border = svg('rect', { x: 0, y: 0, width: w, height: h, rx: 14, fill: 'none', stroke: c, 'stroke-width': 3, pathLength: 1, 'stroke-dasharray': '1 1', 'stroke-dashoffset': 1 }, bs);
      // fixed slots (kicker / title / visual / caption) so cards in a row line up exactly
      const inner = el('div', null, this.wrap, { position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', paddingTop: (o.padTop || 46) + 'px', gap: (o.gap || 14) + 'px', textAlign: 'center', boxSizing: 'border-box' });
      this.parts = [];
      const part = (node, delay) => { this.parts.push({ node, delay }); return node; };
      if (o.kicker) { const k = part(el('div', 'kicker', inner), 0.25); k.textContent = o.kicker; }
      if (o.title) { const tt = part(el('div', 'ctitle', inner, { fontSize: (o.titleSize || 54) + 'px', color: col(o.titleColor || o.color || 'accent') }), 0.35); tt.textContent = o.title; }
      this.vis = null;
      if (o.visual) {
        const holder = part(el('div', null, inner, { position: 'relative', height: (o.visualH || 230) + 'px', display: 'flex', alignItems: 'center', justifyContent: 'center' }), 0.45);
        const V = { ring: Ring, bars: Bars, meter: Meter }[o.visual.type];
        this.vis = new V(s, holder, Object.assign({ at: (o.at || 0) + 0.55 }, o.visual));
      }
      if (o.caption) { const cp = part(el('div', 'caption', inner, { fontSize: (o.captionSize || 26) + 'px' }), 0.75 + (o.captionDelay || 0)); cp.textContent = o.caption; }
      s.cue(o.at || 0, 'pop', 0.8);
    }
    update(t) {
      const o = this.o, at = o.at || 0, L = life(t, o, 0.7, 0.4);
      const k = prog(t, at, 0.6, 'outCubic');
      this.wrap.style.opacity = (t < at ? 0 : 1 - L.b).toFixed(4);
      this.wrap.style.transform = `translate(${o.x - o.w / 2}px,${o.y - o.h / 2 + (1 - k) * 26 - L.b * 10}px) scale(${lerp(0.965, 1, k)})`;
      this.border.setAttribute('stroke-dashoffset', (1 - prog(t, at, 0.75, 'inOutCubic')).toFixed(4));
      this.bg.style.opacity = prog(t, at + 0.1, 0.5, 'linear').toFixed(4);
      for (const p of this.parts) {
        const q = prog(t, at + p.delay, 0.5, 'outCubic');
        p.node.style.opacity = q.toFixed(4);
        p.node.style.transform = `translateY(${(1 - q) * 14}px)`;
      }
      if (this.vis) this.vis.update(t);
    }
  }

  /** Countdown/up ring: arc fills while the number counts (one tick per second). */
  class Ring {
    constructor(s, parent, o) {
      this.o = o;
      const size = o.size || 190, r = size / 2 - 12, c = col(o.color || 'good');
      const box = el('div', null, parent, { width: size + 'px', height: size + 'px', position: 'relative' });
      const sv = svg('svg', { width: size, height: size, viewBox: `0 0 ${size} ${size}` }, box);
      svg('circle', { cx: size / 2, cy: size / 2, r, fill: 'none', stroke: theme.line, 'stroke-width': 14 }, sv);
      this.arc = svg('circle', { cx: size / 2, cy: size / 2, r, fill: 'none', stroke: c, 'stroke-width': 14, 'stroke-linecap': 'round', pathLength: 1, 'stroke-dasharray': '1 1', 'stroke-dashoffset': 1, transform: `rotate(-90 ${size / 2} ${size / 2})` }, sv);
      this.num = el('div', 'tnum', box, { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: (size * 0.3) + 'px', color: theme.ink });
      const secs = Math.round((o.to || 30) - (o.from || 0));
      const dur = o.dur || 3;
      for (let i = 1; i <= Math.min(secs, 40); i++) s.cue(o.at + (dur * i) / secs, 'tick', 0.25);
    }
    update(t) {
      const o = this.o, k = prog(t, o.at, o.dur || 3, o.ease || 'linear');
      const v = lerp(o.from || 0, o.to || 30, k);
      this.arc.setAttribute('stroke-dashoffset', (1 - k).toFixed(4));
      this.num.textContent = Math.floor(v + 1e-6) + (o.unit != null ? o.unit : 's');
    }
  }

  /** Rising bars, the first `on` lit from good -> accent, the rest dark. */
  class Bars {
    constructor(s, parent, o) {
      this.o = o;
      const n = o.n || 10, bw = o.barW || 30, gap = o.gapW || 10, hMax = o.hMax || 130, hMin = o.hMin || 38;
      const box = el('div', null, parent, { display: 'flex', alignItems: 'flex-end', gap: gap + 'px', height: hMax + 'px' });
      const a = hex(col(o.from || 'good')), b = hex(col(o.toColor || 'accent'));
      this.bars = [];
      for (let i = 0; i < n; i++) {
        const lit = i < (o.on || 7);
        const q = (o.on || 7) > 1 ? i / ((o.on || 7) - 1) : 0;
        const c = lit ? `rgb(${a.map((v, j) => Math.round(lerp(v, b[j], q))).join(',')})` : '#2E2E35';
        const e = el('div', null, box, { width: bw + 'px', height: lerp(hMin, hMax, i / (n - 1)) + 'px', background: c, borderRadius: '3px', transformOrigin: '50% 100%' });
        this.bars.push(e);
        s.cue(o.at + i * (o.step || 0.09), lit ? 'tick' : 'tick2', 0.18);
      }
    }
    update(t) {
      const o = this.o;
      this.bars.forEach((e, i) => {
        const k = prog(t, o.at + i * (o.step || 0.09), 0.4, 'outBack');
        e.style.transform = `scaleY(${Math.max(0, k)})`;
        e.style.opacity = clamp(k * 3).toFixed(3);
      });
    }
  }

  /** Horizontal progress bar with a counting value (e.g. carry distance). */
  class Meter {
    constructor(s, parent, o) {
      this.o = o;
      const w = o.w || 340;
      const box = el('div', null, parent, { width: w + 'px' });
      this.val = el('div', 'tnum', box, { fontWeight: 800, fontSize: '64px', color: theme.ink, lineHeight: 1, marginBottom: '16px' });
      const tr = el('div', null, box, { height: '14px', borderRadius: '7px', background: theme.line, overflow: 'hidden' });
      this.fill = el('div', null, tr, { height: '100%', width: '100%', borderRadius: '7px', background: col(o.color || 'accent'), transformOrigin: '0 50%' });
      const marks = el('div', null, box, { display: 'flex', justifyContent: 'space-between', fontSize: '18px', color: theme.muted, marginTop: '10px', fontWeight: 600 });
      (o.marks || ['0', `${o.to} ${o.unit || ''}`]).forEach(m => { el('span', null, marks).textContent = m; });
      const n = 8;
      for (let i = 1; i <= n; i++) s.cue(o.at + ((o.dur || 2.4) * i) / n, 'step', 0.22);
    }
    update(t) {
      const o = this.o, k = prog(t, o.at, o.dur || 2.4, 'inOutSine');
      this.fill.style.transform = `scaleX(${k})`;
      this.val.textContent = Math.round(lerp(0, o.to, k)) + (o.unit ? ' ' + o.unit : '');
    }
  }

  // ================================================================== Chapter, Badge
  class Chapter {
    constructor(s, o) {
      this.o = o;
      const c = col(o.color || 'accent');
      this.num = el('div', 'abs headline tnum', s.world, { fontSize: '210px', color: 'transparent', WebkitTextStroke: `3px ${c}`, opacity: 0, letterSpacing: '0.02em' });
      this.num.textContent = o.num;
      this.title = el('div', 'abs headline', s.world, { fontSize: (o.size || 74) + 'px', color: theme.ink });
      this.title.textContent = o.title;
      if (o.sub) { this.sub = el('div', 'abs line', s.world, { fontSize: '30px', color: theme.muted, fontWeight: 500 }); this.sub.textContent = o.sub; }
      this.line = svg('path', { d: `M${W / 2 - 170},${(o.y || 540) + 86} L${W / 2 + 170},${(o.y || 540) + 86}`, stroke: c, 'stroke-width': 6, 'stroke-linecap': 'round', pathLength: 1, 'stroke-dasharray': '1 1', 'stroke-dashoffset': 1 }, s.svg);
      s.cue(o.at || 0, 'boom', 1);
    }
    update(t) {
      const o = this.o, at = o.at || 0, L = life(t, o, 0.6, 0.4), y = o.y || 540;
      const kn = prog(t, at, 1.0, 'outCubic'), kt = prog(t, at + 0.2, 0.6, 'outCubic'), kl = prog(t, at + 0.45, 0.6, 'inOutCubic');
      this.num.style.opacity = (0.9 * kn * (1 - L.b)).toFixed(4);
      this.num.style.transform = `translate(${W / 2}px,${y - 150}px) translate(-50%,-50%) scale(${lerp(1.12, 1, kn) + 0.03 * clamp((t - at) / 4)})`;
      this.title.style.opacity = (kt * (1 - L.b)).toFixed(4);
      this.title.style.transform = `translate(${W / 2}px,${y + 20 + (1 - kt) * 20}px) translate(-50%,-50%)`;
      this.line.setAttribute('stroke-dashoffset', (1 - kl).toFixed(4));
      this.line.setAttribute('opacity', (1 - L.b).toFixed(4));
      if (this.sub) {
        const ks = prog(t, at + 0.6, 0.5, 'outCubic');
        this.sub.style.opacity = (ks * (1 - L.b)).toFixed(4);
        this.sub.style.transform = `translate(${W / 2}px,${y + 140 + (1 - ks) * 12}px) translate(-50%,-50%)`;
      }
    }
  }

  class Badge {
    constructor(s, o) {
      this.o = o;
      this.e = el('div', 'abs badge', s.hud);
      this.e.innerHTML = `<svg width="36" height="32" viewBox="0 0 30 27"><path d="M15 2 L28 25 H2 Z" fill="${theme.warn}" stroke="${theme.warn}" stroke-width="2.5" stroke-linejoin="round"/><rect x="13.6" y="9" width="2.8" height="9" rx="1.2" fill="#111"/><circle cx="15" cy="21.2" r="1.7" fill="#111"/></svg><div><b></b><span></span></div>`;
      this.e.querySelector('b').textContent = o.title || 'BE SAFE';
      this.e.querySelector('span').textContent = o.text || '';
      s.cue(o.at || 0, 'pop', 0.4);
    }
    update(t) {
      const o = this.o, at = o.at || 0, L = life(t, o, 0.5, 0.35);
      const k = prog(t, at, 0.5, 'outBack');
      this.e.style.opacity = (t < at ? 0 : clamp(k * 2) * (1 - L.b)).toFixed(4);
      this.e.style.transform = `translate(${o.x != null ? o.x : 40}px,${o.y != null ? o.y : 1080 - 40}px) translate(0,-100%) scale(${lerp(0.9, 1, k)})`;
      this.e.style.transformOrigin = '0 100%';
    }
  }

  // ================================================================== Tag, Timer
  class Tag {
    constructor(s, o) {
      this.o = o;
      this.e = el('div', 'abs tag', s.hud, o.size ? { fontSize: o.size + 'px' } : null);
      this.e.textContent = o.text;
    }
    update(t) {
      const o = this.o, L = life(t, Object.assign({ ease: 'linear' }, o), 0.2, 0.2);
      this.e.style.opacity = (t < (o.at || 0) ? 0 : L.v).toFixed(4);
      this.e.style.transform = `translate(${o.x != null ? o.x : 48}px,${o.y != null ? o.y : 44}px)`;
    }
  }

  class Timer {
    constructor(s, o) {
      this.o = o;
      const size = this.base = o.size || 220, r = size / 2 - 12, c = col(o.color || 'good');
      this.box = el('div', 'abs', s.world, { width: size + 'px', height: size + 'px', transformOrigin: '50% 50%' });
      const sv = svg('svg', { width: size, height: size, viewBox: `0 0 ${size} ${size}` }, this.box);
      svg('circle', { cx: size / 2, cy: size / 2, r, fill: 'none', stroke: theme.line, 'stroke-width': 13 }, sv);
      this.arc = svg('circle', { cx: size / 2, cy: size / 2, r, fill: 'none', stroke: c, 'stroke-width': 13, 'stroke-linecap': 'round', pathLength: 1, 'stroke-dasharray': '1 1', 'stroke-dashoffset': 1, transform: `rotate(-90 ${size / 2} ${size / 2})` }, sv);
      this.num = el('div', 'tnum', this.box, { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: (size * 0.3) + 'px', color: theme.ink });
      this.lab = el('div', 'line', this.box, { position: 'absolute', left: '50%', top: (size + 14) + 'px', transform: 'translateX(-50%)', fontSize: (o.labelSize || 26) + 'px', fontWeight: 600, color: theme.ink, opacity: 0.85 });
      const span = (o.to || 30) - (o.from || 0), end = o.out != null ? Math.min(o.out, (o.at || 0) + span) : (o.at || 0) + span;
      for (let k = 1; (o.at || 0) + k <= end + 1e-6; k++) s.cue((o.at || 0) + k, 'tick', 0.22);
    }
    update(t) {
      const o = this.o, at = o.at || 0, from = o.from || 0, to = o.to || 30;
      const v = from + clamp(t - at, 0, to - from);
      let x = o.x, y = o.y, size = this.base, label = o.label || '';
      for (const m of o.move || []) {
        const q = prog(t, m.at, m.dur || 0.5, 'inOutCubic');
        if (m.x != null) x = lerp(x, m.x, q);
        if (m.y != null) y = lerp(y, m.y, q);
        if (m.size != null) size = lerp(size, m.size, q);
        if (m.label != null && t >= m.at) label = m.label;
      }
      const L = life(t, Object.assign({ ease: 'linear' }, o), 0.15, 0.25);
      this.box.style.opacity = (t < at ? 0 : L.v).toFixed(4);
      this.box.style.transform = `translate(${x - this.base / 2}px,${y - this.base / 2}px) scale(${size / this.base})`;
      this.arc.setAttribute('stroke-dashoffset', (1 - (v - from) / (to - from)).toFixed(4));
      this.num.textContent = Math.floor(v + 1e-6) + (o.unit != null ? o.unit : 's');
      this.lab.textContent = label;
    }
  }

  // ================================================================== Episode
  function makeGrain(seed) {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const ctx = c.getContext('2d'), img = ctx.createImageData(256, 256), r = rng(seed);
    for (let i = 0; i < img.data.length; i += 4) { const v = Math.floor(r() * 255); img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
    ctx.putImageData(img, 0, 0);
    return c.toDataURL();
  }

  function episode(def) {
    Object.assign(theme, def.theme || {});
    EP = { def, fps: def.fps || 30, scenes: def.scenes, duration: 0 };
    return EP;
  }
  function scene(o) { return new Scene(o); }

  /** Build the DOM for the loaded episode inside #stage. Returns the controller. */
  async function mount(stage) {
    if (!EP) throw new Error('no episode loaded');
    for (const k of ['bg', 'ink', 'muted', 'card', 'line', 'hl', 'accent', 'good', 'warn']) stage.style.setProperty('--' + k, theme[k]);
    // preload images and fonts so the very first rendered frame is complete
    const srcs = [...new Set(Object.values(plates).map(p => p.src))];
    await Promise.all(srcs.map(src => new Promise(res => { const i = new Image(); i.onload = () => (i.decode ? i.decode().then(res, res) : res()); i.onerror = () => { console.warn('missing', src); res(); }; i.src = src; })));
    await Promise.all(['500', '600', '700', '800'].map(w => document.fonts.load(`${w} 40px Montserrat`))).catch(() => {});
    await document.fonts.load('700 40px Kalam').catch(() => {});
    await document.fonts.ready;

    // transitions: crossfade (default, 0.55 s), 'dip' (fade to black, hold, fade up), or 'cut'
    EP.scenes.forEach((sc, i) => {
      const o = sc.o, prev = EP.scenes[i - 1];
      const mode = i === 0 ? 'first' : (o.transition || 'crossfade');
      if (mode === 'first') sc.fadeIn = o.fadeIn != null ? o.fadeIn : 0.3;
      else if (mode === 'crossfade') { sc.fadeIn = o.fadeIn != null ? o.fadeIn : XFADE; sc.overlapIn = o.overlap != null ? o.overlap : sc.fadeIn; prev.fadeOut = prev.o.fadeOut != null ? prev.o.fadeOut : sc.overlapIn; }
      else if (mode === 'dip') { sc.fadeIn = o.fadeIn != null ? o.fadeIn : DIP; sc.gapIn = o.hold != null ? o.hold : DIP_HOLD; prev.fadeOut = prev.o.fadeOut != null ? prev.o.fadeOut : DIP; }
      else { sc.fadeIn = 0; prev.fadeOut = 0; }
    });
    const lastSc = EP.scenes[EP.scenes.length - 1];
    lastSc.fadeOut = lastSc.o.fadeOut != null ? lastSc.o.fadeOut : 0.6;
    let tcur = 0;
    cues.length = 0;
    for (const sc of EP.scenes) {
      tcur += sc.gapIn - sc.overlapIn;
      sc.mount(stage, tcur);
      tcur += sc.dur;
    }
    EP.duration = +tcur.toFixed(3);
    const grain = el('div', null, stage); grain.id = 'grain';
    grain.style.backgroundImage = `url(${makeGrain(5)})`;
    grain.style.opacity = theme.grain;
    el('div', null, stage).id = 'vignette';
    const cap = el('div', null, stage); cap.id = 'caption';
    cues.sort((a, b) => a.t - b.t);

    const fps = EP.fps;
    function seek(T) {
      for (const sc of EP.scenes) sc.update(T);
      const f = Math.floor(T * fps), r = rng(f * 7919 + 13);
      grain.style.transform = `translate(${Math.floor(r() * 64) - 64}px,${Math.floor(r() * 64) - 64}px)`;
      const sc = EP.scenes.filter(s => T >= s.start && T < s.start + s.dur).pop();
      cap.textContent = sc && sc.o.vo ? sc.o.vo : '';
    }
    seek(0);
    return {
      duration: EP.duration, fps, seek, cues: cues.slice(),
      title: EP.def.title || 'episode',
      vo: EP.scenes.map((s, i) => ({ start: s.start, end: Math.min(s.start + s.dur, EP.scenes[i + 1] ? EP.scenes[i + 1].start : Infinity), text: s.o.vo || '', name: s.o.name || '' })),
      chapters: EP.scenes.filter(s => s.o.chapter).map(s => ({ t: s.start, title: s.o.chapter })),
      showCaptions(on) { cap.style.display = on ? 'block' : 'none'; },
    };
  }

  window.Motion = { episode, scene, mount, plates, theme, ease, prog, lerp, clamp, W, H };
})();
