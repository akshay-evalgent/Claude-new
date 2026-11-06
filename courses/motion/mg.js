// mg.js — the motion-graphics kit for Seven Days To.
// Everything is a pure function of time, drawn on a 1080x1920 canvas.
// Design system: near-black ground, warm white type, one vermilion accent; Inter for text,
// Space Grotesk for numbers, Instrument Serif italic for the one word that matters.
(function () {
  const MG = {};
  MG.W = 1080; MG.H = 1920;
  MG.C = { bg: '#0B0C10', bg2: '#161922', ink: '#F3EFE6', mute: '#8B909A', dim: '#2A2E37', line: '#3A3F49',
           accent: '#FF5A36', accentSoft: 'rgba(255,90,54,0.16)', cool: '#7CC6FE', good: '#5BE49B' };
  MG.F = { sans: 'Inter', disp: 'Space Grotesk', serif: 'Instrument Serif' };
  MG.SAFE = { x: 96, top: 220, bottom: 1560 };   // Shorts UI covers the bottom ~360 px and the top ~180

  // ---------------------------------------------------------------- time and easing
  MG.clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  MG.p = (t, a, b) => MG.clamp((t - a) / (b - a));
  MG.lerp = (a, b, x) => a + (b - a) * x;
  MG.ease = {
    linear: (x) => x,
    outCubic: (x) => 1 - Math.pow(1 - x, 3),
    inOutCubic: (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
    outQuint: (x) => 1 - Math.pow(1 - x, 5),
    outExpo: (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x)),
    inExpo: (x) => (x <= 0 ? 0 : Math.pow(2, 10 * x - 10)),
    inOutExpo: (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x < 0.5 ? Math.pow(2, 20 * x - 10) / 2 : (2 - Math.pow(2, -20 * x + 10)) / 2),
    inCubic: (x) => x * x * x,
    outBack: (x) => { const s = 1.5; return 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2); },
  };
  MG.tw = (t, a, b, e = 'outExpo') => MG.ease[e](MG.p(t, a, b));
  // a damped spring: 0 -> 1 with a little overshoot; f = frequency (Hz), z = damping ratio
  MG.spring = (t, f = 2.4, z = 0.5) => {
    if (t <= 0) return 0;
    const w = 2 * Math.PI * f, wd = w * Math.sqrt(1 - z * z);
    return 1 - Math.exp(-z * w * t) * (Math.cos(wd * t) + (z * w / wd) * Math.sin(wd * t));
  };
  MG.rng = (seed) => { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };

  // ---------------------------------------------------------------- type
  MG.font = (c, o) => {
    c.font = `${o.italic ? 'italic ' : ''}${o.weight || 400} ${o.size}px "${o.family || MG.F.sans}"`;
    if ('letterSpacing' in c) c.letterSpacing = `${o.track || 0}px`;
  };
  MG.measure = (c, s, o) => { c.save(); MG.font(c, o); const w = c.measureText(s).width; c.restore(); return w; };
  MG.text = (c, s, x, y, o) => {
    c.save(); MG.font(c, o);
    c.fillStyle = o.color || MG.C.ink; c.globalAlpha *= (o.alpha ?? 1);
    c.textAlign = o.align || 'left'; c.textBaseline = 'alphabetic';
    if (o.glow) { c.shadowColor = o.glowColor || o.color; c.shadowBlur = o.glow; }
    c.fillText(s, x, y); c.restore();
  };
  // A word that rises into view through a mask (p 0 -> 1) and leaves upward (p 1 -> 2).
  MG.rise = (c, s, x, y, o, p) => {
    if (p <= 0 || p >= 2) return;
    const h = o.size * 1.2, w = MG.measure(c, s, o);
    const x0 = o.align === 'center' ? x - w / 2 : o.align === 'right' ? x - w : x;
    c.save();
    c.beginPath(); c.rect(x0 - o.size * 0.4, y - o.size * 1.0, w + o.size * 0.8, h * 1.12); c.clip();
    const dy = (1 - p) * h;
    MG.text(c, s, x0, y + dy, { ...o, align: 'left', alpha: (o.alpha ?? 1) * (p < 1 ? MG.clamp(p * 2) : MG.clamp(2 - p) * 1) });
    c.restore();
  };
  // A line of styled pieces, laid out together, each rising in with a stagger.
  // pieces: [{s, o}], o = style; align: 'center' | 'left'
  MG.line = (c, pieces, x, y, align, t, tIn, tOut, stagger = 0.06, dur = 0.7, gap = 0.28) => {
    const widths = pieces.map((p) => MG.measure(c, p.s, p.o));
    const space = pieces.map((p) => p.o.size * gap);
    const total = widths.reduce((a, b) => a + b, 0) + space.slice(0, -1).reduce((a, b) => a + b, 0);
    let cx = align === 'center' ? x - total / 2 : x;
    pieces.forEach((p, i) => {
      let q = MG.tw(t, tIn + i * stagger, tIn + i * stagger + dur, 'outExpo');
      if (tOut != null) q += MG.tw(t, tOut + i * stagger * 0.6, tOut + i * stagger * 0.6 + dur * 0.8, 'inOutExpo');
      MG.rise(c, p.s, cx, y, { ...p.o, align: 'left' }, q);
      cx += widths[i] + space[i];
    });
    return total;
  };

  // ---------------------------------------------------------------- rolling numbers
  // A slot-machine counter. value can be fractional during a roll; digits scroll continuously.
  // o: size, weight, family, color, decimals, cols (integer digits to reserve), align, commas
  MG.counter = (c, value, x, y, o) => {
    const dec = o.decimals || 0, k = Math.pow(10, dec);
    const scaled = Math.max(0, value) * k;
    const intDigits = Math.max(1, String(Math.floor(Math.max(0, value) + 1e-9)).length);
    const cols = Math.max(o.cols || intDigits, intDigits);
    c.save(); MG.font(c, o);
    const cw = c.measureText('0').width, comma = c.measureText(',').width, dot = c.measureText('.').width;
    const lh = o.size * 1.08;
    // layout from the left: integer columns with commas, then the decimal point and decimals
    const slots = [];
    for (let i = cols - 1; i >= 0; i--) {
      slots.push({ place: i + dec, w: cw });
      if (o.commas !== false && i > 0 && i % 3 === 0) slots.push({ comma: true, place: i + dec, w: comma });
    }
    if (dec) { slots.push({ dot: true, w: dot }); for (let i = dec - 1; i >= 0; i--) slots.push({ place: i, w: cw }); }
    const total = slots.reduce((a, s) => a + s.w, 0);
    const visOf = (s) => {  // how visible a slot is (leading columns appear as the number reaches them)
      if (s.dot || s.place <= dec) return 1;
      const pk = Math.pow(10, s.place);
      return scaled >= pk ? 1 : MG.clamp((scaled % pk) - (pk - 1));
    };
    const hidden = slots.reduce((a, s) => a + s.w * (1 - visOf(s)), 0);
    // centred on what is visible; the hidden columns wait to its left and it slides over as they arrive
    let cx = o.align === 'center' ? x - (total - hidden) / 2 - hidden : o.align === 'right' ? x - total : x;
    c.fillStyle = o.color || MG.C.ink; c.textAlign = 'left'; c.textBaseline = 'alphabetic';
    if (o.glow) { c.shadowColor = o.color; c.shadowBlur = o.glow; }
    const shows = (place) => {  // how visible a leading column is: 0 until the number reaches it, fading in as it rolls in
      if (place <= dec) return 1;
      const pk = Math.pow(10, place);
      if (scaled >= pk) return 1;
      return MG.clamp((scaled % pk) - (pk - 1));
    };
    for (const s of slots) {
      if (s.dot) { c.fillText('.', cx, y); cx += s.w; continue; }
      const sig = shows(s.place);
      if (s.comma) { c.globalAlpha = sig; c.fillText(',', cx, y); c.globalAlpha = 1; cx += s.w; continue; }
      if (sig <= 0) { cx += s.w; continue; }
      // a real odometer: the lowest digit turns continuously; every other digit turns only while
      // the digits below it roll over from 9 to 0, so a settled number is always crisp
      const pk = Math.pow(10, s.place);
      const d = Math.floor(scaled / pk + 1e-9) % 10;
      const f = s.place === 0 ? scaled - Math.floor(scaled) : MG.clamp((scaled % pk) - (pk - 1));
      const leading = s.place > dec && scaled < pk;   // rolling in from nothing: no "0" above the incoming digit
      c.save();
      c.beginPath(); c.rect(cx - 4, y - o.size * 0.92, s.w + 8, lh); c.clip();
      const cw0 = (ch) => (s.w - c.measureText(ch).width) / 2;   // each digit centred in its column (tabular)
      if (!leading) c.fillText(String(d), cx + cw0(String(d)), y - f * lh);
      c.fillText(String((d + 1) % 10), cx + cw0(String((d + 1) % 10)), y - f * lh + lh);
      c.restore();
      cx += s.w;
    }
    c.restore();
    return total;
  };

  // ---------------------------------------------------------------- shapes
  MG.rrect = (c, x, y, w, h, r) => {
    r = Math.min(r, w / 2, h / 2);
    c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  };
  // stroke a Path2D drawing itself on: p 0 -> 1 of its length (len = approximate path length)
  MG.drawOn = (c, path, len, p, o) => {
    c.save(); c.strokeStyle = o.color || MG.C.ink; c.lineWidth = o.width || 3; c.lineCap = 'round'; c.lineJoin = 'round';
    c.setLineDash([len, len]); c.lineDashOffset = len * (1 - p); c.stroke(path); c.restore();
  };
  MG.ring = (c, x, y, r, p, o) => {
    c.save(); c.lineWidth = o.width || 6; c.lineCap = 'round';
    c.strokeStyle = o.track || MG.C.dim; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.stroke();
    c.strokeStyle = o.color || MG.C.accent; c.beginPath(); c.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * p); c.stroke();
    c.restore();
  };
  // an expanding ring that fades: the "hit" accent
  MG.pulse = (c, x, y, r0, r1, p, color, width = 3) => {
    if (p <= 0 || p >= 1) return;
    c.save(); c.globalAlpha *= (1 - p); c.strokeStyle = color; c.lineWidth = width * (1 - p * 0.6);
    c.beginPath(); c.arc(x, y, MG.lerp(r0, r1, MG.ease.outCubic(p)), 0, Math.PI * 2); c.stroke(); c.restore();
  };
  // a small caps label in a hairline pill
  MG.tag = (c, s, x, y, p, o = {}) => {
    const st = { size: 26, weight: 600, family: MG.F.sans, track: 4, color: o.color || MG.C.mute };
    const w = MG.measure(c, s, st) + 44, h = 54;
    c.save(); c.globalAlpha *= MG.clamp(p * 1.4);
    c.translate(0, (1 - MG.ease.outExpo(p)) * 18);
    MG.rrect(c, x, y - h / 2, w, h, h / 2); c.strokeStyle = o.border || MG.C.line; c.lineWidth = 1.5; c.stroke();
    if (o.dot) { c.fillStyle = MG.C.accent; c.beginPath(); c.arc(x + 26, y, 6, 0, Math.PI * 2); c.fill(); }
    MG.text(c, s, x + (o.dot ? 44 : 22), y + 9, st);
    c.restore();
    return w;
  };

  // ---------------------------------------------------------------- ground, grain, vignette
  let grains = null;
  MG.ground = (c, t, o = {}) => {
    c.fillStyle = MG.C.bg; c.fillRect(0, 0, MG.W, MG.H);
    const gy = 520 + 40 * Math.sin(t * 0.35);
    const g = c.createRadialGradient(MG.W * 0.5, gy, 40, MG.W * 0.5, gy, 1100);
    g.addColorStop(0, o.glow || 'rgba(255,90,54,0.10)'); g.addColorStop(0.45, 'rgba(124,198,254,0.035)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g; c.fillRect(0, 0, MG.W, MG.H);
  };
  MG.finish = (c, t) => {  // after the motion-blur average: vignette, then grain and dither stay sharp
    if (!grains) {
      grains = [];
      for (let k = 0; k < 6; k++) {
        const cv = document.createElement('canvas'); cv.width = 540; cv.height = 960;
        const g = cv.getContext('2d'), img = g.createImageData(540, 960), r = MG.rng(17 + k);
        for (let i = 0; i < img.data.length; i += 4) { const v = 128 + (r() - 0.5) * 255; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
        g.putImageData(img, 0, 0); grains.push(cv);
      }
    }
    const v = c.createRadialGradient(MG.W / 2, MG.H * 0.45, MG.H * 0.25, MG.W / 2, MG.H * 0.5, MG.H * 0.75);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.55)');
    c.fillStyle = v; c.fillRect(0, 0, MG.W, MG.H);
    const g = grains[Math.floor(t * 24) % 6];
    c.save(); c.imageSmoothingEnabled = false;
    c.globalAlpha = 0.035; c.drawImage(g, 0, 0, MG.W, MG.H);                     // dither: no banding in dark gradients
    c.globalCompositeOperation = 'overlay'; c.globalAlpha = 0.06; c.drawImage(grains[(Math.floor(t * 24) + 3) % 6], 0, 0, MG.W, MG.H);  // film grain
    c.restore();
  };

  window.MG = MG;
})();
