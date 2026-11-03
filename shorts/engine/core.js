/* Shorts engine core.
 * Everything is a pure function of time, so any frame can be rendered in any
 * order by any worker. An episode defines `EP.draw(ctx, t, fx)` and the engine
 * handles fonts, the 2D canvas, the WebGL post pass and frame export.
 */
(function () {
  const W = 1080, H = 1920;

  // ---------- math ----------
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const inv = (a, b, x) => clamp((x - a) / (b - a)); // progress of x through [a,b]
  const mix = (a, b, t) => a.map((v, i) => lerp(v, b[i], t));
  const TAU = Math.PI * 2;

  const E = {
    linear: t => t,
    inQuad: t => t * t,
    outQuad: t => 1 - (1 - t) * (1 - t),
    inOutQuad: t => (t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
    inCubic: t => t * t * t,
    outCubic: t => 1 - Math.pow(1 - t, 3),
    inOutCubic: t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    outQuart: t => 1 - Math.pow(1 - t, 4),
    inQuart: t => t * t * t * t,
    inOutQuart: t => (t < .5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2),
    outQuint: t => 1 - Math.pow(1 - t, 5),
    inExpo: t => (t === 0 ? 0 : Math.pow(2, 10 * t - 10)),
    outExpo: t => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
    inOutExpo: t => t === 0 ? 0 : t === 1 ? 1 : t < .5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2,
    outBack: (t, s = 1.70158) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2),
    inBack: (t, s = 1.70158) => (s + 1) * t * t * t - s * t * t,
    outElastic: t => t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - .75) * (TAU / 3)) + 1,
    // damped spring, overshoots once or twice then settles
    spring: (t, k = 7, d = 5.5) => 1 - Math.exp(-d * t) * Math.cos(k * t),
  };

  // progress through a window with an easing
  const ease = (t, a, b, fn = E.outCubic) => fn(inv(a, b, t));

  // ---------- deterministic randomness ----------
  function rng(seed) {
    let s = seed >>> 0;
    return function () {
      s += 0x6D2B79F5; let r = s;
      r = Math.imul(r ^ (r >>> 15), r | 1);
      r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }
  const hash = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  // smooth 1D value noise in [-1,1]
  function noise1(x) {
    const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
    return lerp(hash(i), hash(i + 1), u) * 2 - 1;
  }
  const fbm = (x, o = 3) => { let v = 0, a = .5, f = 1; for (let i = 0; i < o; i++) { v += a * noise1(x * f + i * 17.3); a *= .5; f *= 2; } return v; };

  // ---------- color ----------
  const rgba = (hex, a = 1) => {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  };

  // ---------- fonts ----------
  const FONT_DIR = (document.currentScript && document.currentScript.src.replace(/core\.js.*$/, 'fonts/')) || 'fonts/';
  const FONT_FILES = [
    ['Anton', 'anton-latin-400-normal.woff2', '400', 'normal'],
    ['Inter', 'inter-latin-500-normal.woff2', '500', 'normal'],
    ['Inter', 'inter-latin-700-normal.woff2', '700', 'normal'],
    ['Inter', 'inter-latin-800-normal.woff2', '800', 'normal'],
    ['Inter', 'inter-latin-900-normal.woff2', '900', 'normal'],
    ['Inter', 'inter-latin-900-italic.woff2', '900', 'italic'],
    ['JetBrains Mono', 'jetbrains-mono-latin-500-normal.woff2', '500', 'normal'],
    ['JetBrains Mono', 'jetbrains-mono-latin-800-normal.woff2', '800', 'normal'],
    ['Instrument Serif', 'instrument-serif-latin-400-italic.woff2', '400', 'italic'],
  ];
  async function loadFonts() {
    await Promise.all(FONT_FILES.map(async ([fam, file, weight, style]) => {
      const f = new FontFace(fam, `url(${FONT_DIR}${file})`, { weight, style });
      await f.load(); document.fonts.add(f);
    }));
  }

  // ---------- text ----------
  // Measures a run of words, returns layout with per-letter offsets so callers
  // can animate letters or words independently.
  function layoutText(ctx, str, font, tracking = 0) {
    ctx.font = font;
    const chars = [...str];
    let x = 0; const out = [];
    for (const c of chars) {
      const w = ctx.measureText(c).width;
      out.push({ c, x, w }); x += w + tracking;
    }
    return { chars: out, width: x - tracking };
  }

  /* Kinetic word: letters rise from a mask with stagger and overshoot.
   * opts: x,y (baseline centre), font, color, t (local time, s), stagger,
   * dur, from ('below'|'scale'|'blur'), align, tracking, stroke, shadow */
  function kinetic(ctx, str, o) {
    const L = layoutText(ctx, str, o.font, o.tracking || 0);
    const align = o.align || 'center';
    const x0 = align === 'center' ? o.x - L.width / 2 : align === 'right' ? o.x - L.width : o.x;
    const n = L.chars.length;
    const st = o.stagger ?? 0.03, dur = o.dur ?? 0.45;
    const out = o.out ?? Infinity, outDur = o.outDur ?? 0.25;
    ctx.save();
    ctx.font = o.font; ctx.textBaseline = 'alphabetic';
    for (let i = 0; i < n; i++) {
      const ch = L.chars[i];
      const ti = o.t - i * st;
      let p = clamp(ti / dur);
      if (p <= 0) continue;
      let q = 1; // exit progress (1 = fully visible)
      if (o.t > out) q = 1 - E.inCubic(clamp((o.t - out - (n - 1 - i) * st * .5) / outDur));
      if (q <= 0) continue;
      const e = (o.ease || E.outBack)(p);
      ctx.save();
      const cx = x0 + ch.x + ch.w / 2;
      let dy = 0, sc = 1, al = clamp(p * 3) * q, rot = 0, blur = 0;
      const from = o.from || 'below';
      if (from === 'below') dy = (1 - e) * (o.size || 100) * 0.9;
      if (from === 'above') dy = -(1 - e) * (o.size || 100) * 0.9;
      if (from === 'scale') sc = lerp(2.6, 1, e);
      if (from === 'drop') { sc = lerp(1.8, 1, E.outCubic(p)); blur = (1 - E.outCubic(p)) * 14; }
      if (from === 'spin') { rot = (1 - e) * 0.6 * (i % 2 ? 1 : -1); dy = (1 - e) * 60; }
      dy += (1 - q) * -40;
      ctx.translate(cx, o.y + dy);
      ctx.rotate(rot + (o.wobble ? Math.sin(o.t * 6 + i) * o.wobble : 0));
      ctx.scale(sc, sc);
      ctx.globalAlpha = al * (o.alpha ?? 1);
      if (blur > .5) ctx.filter = `blur(${blur.toFixed(1)}px)`;
      if (o.shadow) { ctx.shadowColor = o.shadow; ctx.shadowBlur = o.shadowBlur ?? 30; }
      if (o.stroke) { ctx.lineJoin = 'round'; ctx.lineWidth = o.strokeWidth || 12; ctx.strokeStyle = o.stroke; ctx.strokeText(ch.c, -ch.w / 2, 0); }
      ctx.fillStyle = (typeof o.color === 'function') ? o.color(i, n) : (o.color || '#fff');
      ctx.fillText(ch.c, -ch.w / 2, 0);
      ctx.restore();
    }
    ctx.restore();
    return L.width;
  }

  /* Shorts-style caption: words pop one by one, chosen words get a coloured
   * highlight box. words: [{w:'text', hl:'#ff6b1a', at: seconds}] */
  function caption(ctx, words, o) {
    ctx.save();
    const font = o.font || `900 ${o.size || 84}px Inter`;
    ctx.font = font;
    const space = ctx.measureText(' ').width * 1.05;
    const maxW = o.maxW || 900;
    // line breaking
    const lines = []; let cur = [], cw = 0;
    for (const wd of words) {
      const w = ctx.measureText(wd.w).width + (wd.hl ? 44 : 0);
      if (cur.length && (cw + space + w > maxW || wd.br)) { lines.push({ items: cur, width: cw }); cur = []; cw = 0; }
      const pad = wd.hl ? 22 : 0;
      cur.push({ ...wd, width: w - pad * 2, pad }); cw += (cur.length > 1 ? space : 0) + w;
    }
    if (cur.length) lines.push({ items: cur, width: cw });
    const lh = (o.size || 84) * (o.lineHeight || 1.12);
    const total = lines.length * lh;
    let y = o.y - total / 2 + lh * 0.78;
    const t = o.t;
    const outT = o.out ?? Infinity;
    const qOut = t > outT ? 1 - E.inCubic(clamp((t - outT) / 0.22)) : 1;
    for (const line of lines) {
      let x = o.x - line.width / 2;
      for (const it of line.items) {
        x += it.pad;
        const p = clamp((t - (it.at ?? 0)) / 0.32);
        if (p > 0 && qOut > 0) {
          const e = E.outBack(p, 2.2);
          ctx.save();
          ctx.translate(x + it.width / 2, y - lh * 0.3);
          const s = lerp(0.4, 1, e) * lerp(0.85, 1, qOut);
          ctx.scale(s, s);
          ctx.rotate((it.rot || 0) * (1 - E.outCubic(p)));
          ctx.globalAlpha = clamp(p * 2.5) * qOut;
          if (it.hl) {
            const padX = 18, padY = 10;
            const hp = E.outExpo(clamp((t - (it.at ?? 0) - 0.04) / 0.3));
            ctx.fillStyle = it.hl;
            const bw = (it.width + padX * 2) * hp;
            roundRect(ctx, -it.width / 2 - padX, -lh * 0.48 - padY + 4, bw, lh * 0.86 + padY, 14);
            ctx.fill();
          }
          ctx.font = it.font || font;
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          if (!it.hl) { ctx.lineJoin = 'round'; ctx.lineWidth = o.strokeWidth ?? 14; ctx.strokeStyle = o.stroke || 'rgba(0,0,0,0.85)'; ctx.strokeText(it.w, 0, 4); }
          ctx.fillStyle = it.color || (it.hl ? (it.ink || '#120a06') : (o.color || '#fff'));
          ctx.fillText(it.w, 0, 4);
          ctx.restore();
        }
        x += it.width + it.pad + space;
      }
      y += lh;
    }
    ctx.restore();
  }

  function roundRect(ctx, x, y, w, h, r) {
    r = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // Typewriter for mono labels
  function typewriter(ctx, str, o) {
    const n = Math.floor(clamp((o.t) / (o.dur || str.length * 0.035)) * str.length);
    const s = str.slice(0, n);
    ctx.save(); ctx.font = o.font; ctx.fillStyle = o.color || '#fff';
    ctx.textAlign = o.align || 'left'; ctx.textBaseline = 'middle';
    ctx.globalAlpha = o.alpha ?? 1;
    ctx.fillText(s + ((o.cursor !== false && n < str.length && Math.floor(o.t * 8) % 2 === 0) ? '▌' : ''), o.x, o.y);
    ctx.restore();
  }


  // ---------- post-processing (WebGL2) ----------
  const VS = `#version 300 es
  in vec2 p; out vec2 uv;
  void main(){ uv = p*.5+.5; uv.y = 1.-uv.y; gl_Position = vec4(p,0,1); }`;
  const FS = `#version 300 es
  precision highp float;
  in vec2 uv; out vec4 o;
  uniform sampler2D tex, bloomTex;
  uniform float uTime, uCA, uGlitch, uSeed, uBloom, uGrain, uVig, uFlash, uZoomBlur, uScan, uWarm;
  uniform vec2 uDirBlur, uRes;
  float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
  float h1(float x){ return fract(sin(x*91.345)*47453.5453); }
  vec3 samp(vec2 u){
    vec2 d = u - .5;
    float ca = uCA * (0.35 + length(d)*1.6);
    vec2 off = normalize(d + 1e-5) * ca;
    return vec3(texture(tex, u + off).r, texture(tex, u).g, texture(tex, u - off).b);
  }
  void main(){
    vec2 u = uv;
    // glitch: horizontal slice displacement + block jumps
    if (uGlitch > 0.0) {
      float row = floor(u.y * 48.0);
      float r = h1(row + uSeed * 13.1);
      float on = step(1.0 - uGlitch * 0.55, r);
      u.x += on * (h1(row * 3.7 + uSeed) - .5) * 0.18 * uGlitch;
      float blk = step(1.0 - uGlitch*0.25, h(floor(u * vec2(10.,22.)) + uSeed));
      u += blk * (vec2(h1(uSeed+row), h1(uSeed*2.+row)) - .5) * 0.05;
    }
    vec3 c;
    float extraCA = uGlitch * 0.012;
    if (uZoomBlur > 0.0 || length(uDirBlur) > 0.0) {
      c = vec3(0.);
      vec2 d = (u - .5) * uZoomBlur;
      for (int i = 0; i < 12; i++) {
        float k = float(i) / 11.0 - .5;
        c += samp(u - d * k - uDirBlur * k);
      }
      c /= 12.0;
    } else {
      c = samp(u);
    }
    if (extraCA > 0.0) {
      c.r = mix(c.r, texture(tex, u + vec2(extraCA, 0.)).r, .85);
      c.b = mix(c.b, texture(tex, u - vec2(extraCA, 0.)).b, .85);
    }
    // bloom (pre-blurred, low-res)
    vec3 b = texture(bloomTex, u).rgb;
    c += pow(max(b - 0.32, 0.0), vec3(1.25)) * uBloom * 1.5;
    // warm film response
    c = mix(c, c * vec3(1.04, 1.0, 0.94), uWarm);
    // scanlines (for screens / holograms)
    c *= 1.0 - uScan * 0.18 * (0.5 + 0.5 * sin(u.y * uRes.y * 1.6));
    // vignette
    vec2 d = uv - .5; d.x *= uRes.x / uRes.y;
    c *= 1.0 - uVig * smoothstep(0.25, 0.95, length(d) * 1.35);
    // flash
    c += uFlash;
    // grain (luma-weighted)
    float g = h(uv * uRes + fract(uTime * 7.13) * 100.0) - .5;
    c += g * uGrain * (0.6 + 0.4 * (1.0 - dot(c, vec3(.33))));
    o = vec4(clamp(c, 0., 1.), 1.);
  }`;

  function makePost(outCanvas, srcCanvas) {
    const gl = outCanvas.getContext('webgl2', { preserveDrawingBuffer: true, antialias: false, premultipliedAlpha: false });
    const sh = (type, s) => { const x = gl.createShader(type); gl.shaderSource(x, s); gl.compileShader(x); if (!gl.getShaderParameter(x, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(x)); return x; };
    const pr = gl.createProgram();
    gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(pr); gl.useProgram(pr);
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const mkTex = (unit) => { const t = gl.createTexture(); gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); return t; };
    const t0 = mkTex(0), t1 = mkTex(1);
    gl.uniform1i(gl.getUniformLocation(pr, 'tex'), 0);
    gl.uniform1i(gl.getUniformLocation(pr, 'bloomTex'), 1);
    const U = {}; for (const n of ['uTime', 'uCA', 'uGlitch', 'uSeed', 'uBloom', 'uGrain', 'uVig', 'uFlash', 'uZoomBlur', 'uScan', 'uWarm', 'uDirBlur', 'uRes']) U[n] = gl.getUniformLocation(pr, n);
    // bloom source: blurred low-res copy made with the 2D canvas filter
    const bc = document.createElement('canvas'); bc.width = W / 4; bc.height = H / 4;
    const bctx = bc.getContext('2d');
    return function run(fx, time) {
      bctx.globalCompositeOperation = 'copy';
      bctx.filter = 'blur(7px) brightness(0.9) contrast(1.4)';
      bctx.drawImage(srcCanvas, 0, 0, bc.width, bc.height);
      bctx.filter = 'none';
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, t0);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, srcCanvas);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, t1);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bc);
      gl.uniform1f(U.uTime, time);
      gl.uniform1f(U.uCA, fx.ca ?? 0.0007);
      gl.uniform1f(U.uGlitch, fx.glitch ?? 0);
      gl.uniform1f(U.uSeed, fx.seed ?? Math.floor(time * 24));
      gl.uniform1f(U.uBloom, fx.bloom ?? 0.6);
      gl.uniform1f(U.uGrain, fx.grain ?? 0.05);
      gl.uniform1f(U.uVig, fx.vig ?? 0.55);
      gl.uniform1f(U.uFlash, fx.flash ?? 0);
      gl.uniform1f(U.uZoomBlur, fx.zoomBlur ?? 0);
      gl.uniform1f(U.uScan, fx.scan ?? 0);
      gl.uniform1f(U.uWarm, fx.warm ?? 0.5);
      gl.uniform2f(U.uDirBlur, (fx.dirBlur || [0, 0])[0], (fx.dirBlur || [0, 0])[1]);
      gl.uniform2f(U.uRes, W, H);
      gl.viewport(0, 0, W, H);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };
  }

  // ---------- bootstrap ----------
  const S = window.SHORT = {
    W, H, TAU, clamp, lerp, inv, mix, E, ease, rng, hash, noise1, fbm, rgba,
    kinetic, caption, typewriter, roundRect, layoutText,
  };

  // ---------- media: images, frame-sequence clips, Ken Burns, perspective ----------
  const IMG = new Map(); const LRU = [];
  S._missing = [];
  function loadImg(src) {
    let e = IMG.get(src);
    if (e) return e;
    e = { ready: false, img: null };
    const im = new Image();
    e.p = new Promise(res => {
      im.onload = () => { (im.decode ? im.decode() : Promise.resolve()).catch(() => {}).then(() => { e.img = im; e.ready = true; res(); }); };
      im.onerror = () => { console.error('missing media: ' + src); e.ready = true; e.err = true; res(); };
    });
    im.src = src;
    IMG.set(src, e); LRU.push(src);
    if (LRU.length > 260) { const old = LRU.shift(); const oe = IMG.get(old); if (oe && oe.img) oe.img.src = ''; IMG.delete(old); }
    return e;
  }
  S.img = function (src) {
    const e = loadImg(src);
    if (!e.ready) { S._missing.push(e.p); return null; }
    return e.img;
  };
  S.prefetch = src => { loadImg(src); };
  // frame-sequence clip described in window.MEDIA[name] = {dir, n, fps, w, h, ext}
  S.clip = function (name, t, o = {}) {
    const m = (window.MEDIA || {})[name];
    if (!m) { console.error('unknown clip ' + name); return null; }
    let i = Math.floor((o.from || 0) * m.fps + t * m.fps * (o.speed || 1));
    if (o.loop) i = ((i % m.n) + m.n) % m.n; else i = Math.max(0, Math.min(m.n - 1, i));
    const src = k => `${m.dir}/f_${String(k).padStart(4, '0')}.${m.ext || 'jpg'}`;
    for (let k = 1; k <= 4; k++) { const j = i + k; if (j < m.n) S.prefetch(src(j)); }
    return S.img(src(i));
  };
  S.media = name => (window.MEDIA || {})[name];
  // draw img to cover rect, with zoom about a focus point (fx, fy in 0..1 of the source)
  S.cover = function (ctx, img, x, y, w, h, o = {}) {
    if (!img) return;
    const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
    const z = o.zoom || 1, fx = o.fx ?? .5, fy = o.fy ?? .5;
    const s = Math.max(w / iw, h / ih) * z;
    const sw = w / s, sh = h / s;
    let sx = fx * iw - sw / 2, sy = fy * ih - sh / 2;
    sx = Math.max(0, Math.min(iw - sw, sx)); sy = Math.max(0, Math.min(ih - sh, sy));
    ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
  };
  // draw a source rect of img into an arbitrary quad [tl,tr,br,bl] (strip-based perspective)
  S.warp = function (ctx, img, sx, sy, sw, sh, q, strips = 40) {
    if (!img) return;
    const L2 = (a, b, u) => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];
    const ssw = sw / strips;
    for (let i = 0; i < strips; i++) {
      const u0 = i / strips, u1 = (i + 1) / strips;
      const t0 = L2(q[0], q[1], u0), t1 = L2(q[0], q[1], u1), b0 = L2(q[3], q[2], u0), b1 = L2(q[3], q[2], u1);
      ctx.save();
      ctx.beginPath(); ctx.moveTo(t0[0] - .6, t0[1]); ctx.lineTo(t1[0] + .6, t1[1]); ctx.lineTo(b1[0] + .6, b1[1]); ctx.lineTo(b0[0] - .6, b0[1]); ctx.closePath(); ctx.clip();
      ctx.transform((t1[0] - t0[0]) / ssw, (t1[1] - t0[1]) / ssw, (b0[0] - t0[0]) / sh, (b0[1] - t0[1]) / sh, t0[0], t0[1]);
      ctx.drawImage(img, sx + u0 * sw, sy, ssw + .8, sh, 0, 0, ssw + .8, sh);
      ctx.restore();
    }
  };
  // quad for a w*h card centred at (cx,cy) rotated about Y by ry (radians) and X by rx, simple pinhole
  S.cardQuad = function (cx, cy, w, h, ry = 0, rx = 0, persp = 1800, rz = 0) {
    const pts = [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]].map(([x, y]) => {
      let X = x * Math.cos(ry), Z = -x * Math.sin(ry), Y = y;
      const Y2 = Y * Math.cos(rx) - Z * Math.sin(rx), Z2 = Y * Math.sin(rx) + Z * Math.cos(rx);
      const k = persp / (persp + Z2);
      let px = X * k, py = Y2 * k;
      const c = Math.cos(rz), s = Math.sin(rz);
      return [cx + px * c - py * s, cy + px * s + py * c];
    });
    return pts;
  };

  S.boot = async function (EP) {
    await loadFonts();
    const out = document.getElementById('out');
    out.width = W; out.height = H;
    const src = document.createElement('canvas'); src.width = W; src.height = H;
    const ctx = src.getContext('2d');
    if (EP.init) await EP.init(S);
    const post = makePost(out, src);
    S.duration = EP.duration;
    // Rendering is two-phase when media is involved: draw, and if any image was
    // requested that is not decoded yet, wait for it and draw again.
    S.renderAt = async function (t) {
      let fx = {};
      for (let pass = 0; pass < 5; pass++) {
        S._missing = [];
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none';
        ctx.clearRect(0, 0, W, H);
        fx = {};
        EP.draw(ctx, t, fx);
        if (!S._missing.length) break;
        await Promise.all(S._missing);
      }
      post(fx, t);
    };
    S.frameJPEG = async function (t, q = 0.93) { await S.renderAt(t); return out.toDataURL('image/jpeg', q); };
    S.framePNG = async function (t) { await S.renderAt(t); return out.toDataURL('image/png'); };
    window.READY = true;
    // live preview when opened in a normal browser: ?t=12.5 or scrub with play
    const qs = new URLSearchParams(location.search);
    if (qs.has('t')) S.renderAt(parseFloat(qs.get('t')));
    else if (qs.has('play')) { const st = performance.now(); const loop = async () => { await S.renderAt(((performance.now() - st) / 1000) % EP.duration); requestAnimationFrame(loop); }; loop(); }
  };
})();
