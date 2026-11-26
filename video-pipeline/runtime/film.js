/* film.js: a small, deterministic timeline for code-rendered films.
 *
 * A composition is one HTML page. Each shot is a <section class="shot" id="...">
 * inside <main id="stage">. Nothing runs on the clock: the renderer calls
 * film.seek(t) for every frame, so the same t always draws the same picture.
 * Do not use CSS animations, transitions, setTimeout or Math.random().
 *
 *   Film.setup({ width: 1080, height: 1920, fps: 24 });
 *   Film.shot({ id: 'home', dur: 3.2 });                       // hard cut in
 *   Film.shot({ id: 'train', dur: 2.6, enter: { type: 'dissolve', dur: 0.5 } });
 *   Film.shot({ id: 'map', dur: 4, enter: { type: 'iris', dur: 0.8, at: [50, 40] },
 *               update(p, t, el) { ... } });                   // p 0-1, t seconds into the shot
 *   Film.captions([{ start: 0.2, end: 1.4, text: 'he was four' }, ...]);
 *   Film.ready();
 *
 * Shots run back to back in the order declared; `start` may be given instead
 * of relying on order. Inside a shot, mark elements up instead of writing code:
 *
 *   data-draw="0.2 1.4"     stroke draws on between 0.2 s and 1.4 s into the shot
 *   data-fade="0.5 1.0"     fades in over that window
 *   data-fadeout="2.0 2.6"  fades out over that window
 *   data-drift="0 -40 1.06" moves by x, y px and scales, evenly across the whole shot
 *   data-rise="0.3 0.9 30"  fades in while settling up from 30 px below
 *
 * Times in those attributes are seconds from the start of the shot.
 */
(function () {
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, p) => a + (b - a) * p;
  const ease = {
    linear: (p) => p,
    out: (p) => 1 - Math.pow(1 - p, 3),
    in: (p) => p * p * p,
    inOut: (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2),
  };
  const span = (t, a, b) => (b <= a ? (t >= b ? 1 : 0) : clamp((t - a) / (b - a)));
  const nums = (s) => String(s).trim().split(/[\s,]+/).map(Number);

  const Film = {
    width: 1080, height: 1920, fps: 24, duration: 0,
    shots: [], caps: [], clamp, lerp, ease, span, _ready: false,

    setup(o) { Object.assign(this, o); return this; },

    shot(o) {
      const prev = this.shots[this.shots.length - 1];
      const start = o.start != null ? o.start : prev ? prev.end : 0;
      const end = o.end != null ? o.end : start + o.dur;
      const el = document.getElementById(o.id);
      if (!el) throw new Error('film.js: no <section id="' + o.id + '">');
      this.shots.push({ id: o.id, start, end, enter: o.enter || { type: 'cut' }, update: o.update, el, marks: null });
      return this;
    },

    captions(list) { this.caps = list.slice().sort((a, b) => a.start - b.start); return this; },

    /* Seeded noise for hand-drawn wobble: same input, same output. */
    noise(i, seed = 1) {
      const x = Math.sin(i * 127.1 + seed * 311.7) * 43758.5453;
      return (x - Math.floor(x)) * 2 - 1;
    },

    draw(el, p) {
      if (el._len == null) {
        el._len = el.getTotalLength ? el.getTotalLength() : 0;
        el.style.strokeDasharray = el._len;
      }
      el.style.strokeDashoffset = el._len * (1 - clamp(p));
    },

    _collect(s) {
      const q = (a) => Array.from(s.el.querySelectorAll('[' + a + ']'));
      s.marks = {
        draw: q('data-draw').map((el) => [el, nums(el.dataset.draw)]),
        fade: q('data-fade').map((el) => [el, nums(el.dataset.fade)]),
        fadeout: q('data-fadeout').map((el) => [el, nums(el.dataset.fadeout)]),
        drift: q('data-drift').map((el) => [el, nums(el.dataset.drift)]),
        rise: q('data-rise').map((el) => [el, nums(el.dataset.rise)]),
      };
      // fades scale the element's own opacity (a pale wash stays pale)
      s.base = new Map();
      for (const k of ['fade', 'fadeout', 'rise']) {
        for (const [el] of s.marks[k]) {
          if (!s.base.has(el)) s.base.set(el, parseFloat(getComputedStyle(el).opacity) || 1);
        }
      }
    },

    _apply(s, t) {
      const dur = s.end - s.start, p = clamp(t / dur), m = s.marks;
      for (const [el, [a, b]] of m.draw) this.draw(el, ease.inOut(span(t, a, b)));
      const op = new Map();
      for (const [el, [a, b]] of m.fade) op.set(el, ease.inOut(span(t, a, b)));
      for (const [el, [a, b]] of m.fadeout) op.set(el, (op.has(el) ? op.get(el) : 1) * (1 - ease.inOut(span(t, a, b))));
      const tf = new Map();
      for (const [el, [x, y, sc = 1]] of m.drift) {
        tf.set(el, `translate(${(x * p).toFixed(2)}px, ${(y * p).toFixed(2)}px) scale(${lerp(1, sc, p).toFixed(4)})`);
      }
      for (const [el, [a, b, dy = 24]] of m.rise) {
        const k = ease.out(span(t, a, b));
        op.set(el, (op.has(el) ? op.get(el) : 1) * k);
        tf.set(el, (tf.get(el) || '') + ` translateY(${((1 - k) * dy).toFixed(2)}px)`);
      }
      for (const [el, v] of op) el.style.opacity = (v * s.base.get(el)).toFixed(4);
      for (const [el, v] of tf) el.style.transform = v;
      if (s.update) s.update(p, t, s.el);
    },

    ready() {
      this.duration = this.duration || Math.max(...this.shots.map((s) => s.end));
      const stage = document.getElementById('stage');
      stage.style.width = this.width + 'px';
      stage.style.height = this.height + 'px';
      this.shots.forEach((s, i) => { this._collect(s); s.el.style.zIndex = i + 1; });
      this.cap = document.getElementById('caption');
      this._ready = true;
      const q = new URLSearchParams(location.search);
      this.seek(q.has('t') ? Number(q.get('t')) : 0);
      if (q.has('play')) this.play();
      return this;
    },

    seek(t) {
      t = clamp(t, 0, this.duration);
      const last = this.shots.length - 1;
      this.shots.forEach((s, i) => {
        const next = this.shots[i + 1];
        const overlap = next && next.enter.type !== 'cut' ? next.enter.dur || 0.5 : 0;
        const on = t >= s.start && (t < s.end + overlap || (i === last && t <= s.end));
        s.el.style.visibility = on ? 'visible' : 'hidden';
        if (!on) return;
        const local = t - s.start, e = s.enter, k = e.type === 'cut' ? 1 : span(local, 0, e.dur || 0.5);
        s.el.style.opacity = e.type === 'dissolve' ? ease.inOut(k).toFixed(4) : 1;
        if (e.type === 'iris') {
          const [cx, cy] = e.at || [50, 50], r = ease.inOut(k) * 135;
          const g = k >= 1 ? 'none'
            : `radial-gradient(circle at ${cx}% ${cy}%, #000 ${Math.max(r - 14, 0).toFixed(2)}%, transparent ${r.toFixed(2)}%)`;
          s.el.style.webkitMaskImage = g; s.el.style.maskImage = g;
        }
        this._apply(s, Math.min(local, s.end - s.start + overlap));
      });
      if (this.cap) {
        const c = this.caps.find((c) => t >= c.start && t < c.end);
        const text = c ? c.text : '';
        if (this.cap.dataset.text !== text) {
          this.cap.dataset.text = text;
          this.cap.innerHTML = text ? '<i class="bullet"></i><span>' + text + '</span>' : '';
        }
        this.cap.style.visibility = text ? 'visible' : 'hidden';
      }
      this.time = t;
    },

    /* Preview only (open the page with ?play). The renderer never calls this. */
    play() {
      const t0 = performance.now();
      const tick = () => {
        const t = ((performance.now() - t0) / 1000) % this.duration;
        this.seek(t);
        requestAnimationFrame(tick);
      };
      tick();
    },
  };

  window.Film = Film;
  window.film = Film;
})();
