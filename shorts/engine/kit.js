/* Shared building blocks for episodes: timing helpers, captions, browser frames,
 * light leaks, counters. Load after core.js; exposes window.KIT. */
(function () {
  const S = SHORT, { W, H, TAU, clamp, lerp, inv, E, hash, noise1 } = S;

  const decay = (t, at, dur) => (t >= at && t < at + dur) ? 1 - (t - at) / dur : 0;
  const win = (t, a, b) => t >= a && t < b;
  function shake(t, at, amp, dur, freq = 38) {
    const k = decay(t, at, dur); if (!k) return [0, 0];
    const kk = k * k * amp;
    return [noise1(t * freq + at * 3) * kk, noise1(t * freq + 91 + at * 7) * kk];
  }
  function camera(ctx, c) {
    ctx.translate(W / 2 + (c.cx || 0), H / 2 + (c.cy || 0)); ctx.rotate(c.r || 0); ctx.scale(c.z || 1, c.z || 1);
    ctx.translate(-W / 2 - (c.cx || 0) + (c.x || 0), -H / 2 - (c.cy || 0) + (c.y || 0));
  }
  const fmt = n => Math.round(n).toLocaleString('en-US');

  // "*word*" highlights, "|" forces a line break
  function words(str, at, step, hl) {
    const out = []; let br = false, i = 0;
    for (let w of str.split(' ')) {
      if (w === '|') { br = true; continue; }
      let h = null; if (w.includes('*')) { h = hl; w = w.replace(/\*/g, ''); }
      out.push({ w, at: at + (i++) * step, hl: h, br }); br = false;
    }
    return out;
  }
  const THEME = { hl: '#ffc94d', ink: '#0b0d12', text: '#fff', serif: '#f4ecdf' };
  function cap(ctx, t, str, at, out, o = {}) {
    if (t < at - .01 || t > out + .3) return;
    S.caption(ctx, words(str, at, o.step ?? .07, o.hl || THEME.hl), Object.assign({ x: 540, y: 400, t, out, size: 84, maxW: 920 }, o));
  }
  function serif(ctx, t, str, at, out, o = {}) {
    if (t < at || t > out + .4) return;
    S.kinetic(ctx, str, Object.assign({ x: 540, y: 400, t: t - at, out: out - at, font: `italic 400 ${o.size || 140}px "Instrument Serif"`, size: o.size || 140, color: THEME.serif, stagger: .022, dur: .5, from: 'below', shadow: 'rgba(0,0,0,.7)', shadowBlur: 30 }, o));
  }
  function pill(ctx, x, y, text, o = {}) {
    ctx.save(); ctx.font = o.font || '800 28px "JetBrains Mono"';
    const w = ctx.measureText(text).width + (o.padX ?? 22) * 2, h = o.h || 54;
    const x0 = o.align === 'right' ? x - w : o.align === 'center' ? x - w / 2 : x;
    ctx.globalAlpha = o.alpha ?? 1;
    ctx.fillStyle = o.bg || 'rgba(0,0,0,.6)'; S.roundRect(ctx, x0, y - h / 2, w, h, o.r ?? h / 2); ctx.fill();
    if (o.border) { ctx.strokeStyle = o.border; ctx.lineWidth = o.borderW || 3; ctx.stroke(); }
    ctx.fillStyle = o.color || '#fff'; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    ctx.fillText(text, x0 + (o.padX ?? 22), y + 2); ctx.restore();
    return w;
  }

  // ---- browser window around a screenshot, optional 3D tilt ----
  const OFF = {};
  function off(key, w, h) {
    let c = OFF[key];
    if (!c) { c = OFF[key] = document.createElement('canvas'); }
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    return c;
  }
  /* o: cx, cy (centre), w (window width on screen), crop [sx,sy,sw,sh] of img, ry/rx/rz tilt,
     url, bar (true), alpha, radius, shadow, persp, key (cache id) */
  function browser(ctx, img, o) {
    if (!img) return null;
    const crop = o.crop || [0, 0, img.naturalWidth || img.width, img.naturalHeight || img.height];
    const barH = o.bar === false ? 0 : Math.round(o.w * .052);
    const ch = Math.round(o.w * crop[3] / crop[2]);
    const w = Math.round(o.w), h = ch + barH, r = o.radius ?? Math.round(o.w * .025);
    const c = off(o.key || 'browser', w, h), x = c.getContext('2d');
    x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, w, h);
    x.save(); S.roundRect(x, 0, 0, w, h, r); x.clip();
    if (barH) {
      x.fillStyle = o.barColor || '#1b1f29'; x.fillRect(0, 0, w, barH);
      ['#ff5f57', '#febc2e', '#28c840'].forEach((col, i) => { x.fillStyle = col; x.beginPath(); x.arc(barH * .55 + i * barH * .42, barH / 2, barH * .13, 0, TAU); x.fill(); });
      if (o.url) {
        x.fillStyle = 'rgba(255,255,255,.08)'; S.roundRect(x, w * .22, barH * .2, w * .56, barH * .6, barH * .3); x.fill();
        x.fillStyle = 'rgba(255,255,255,.75)'; x.font = `500 ${Math.round(barH * .34)}px "JetBrains Mono"`; x.textAlign = 'center'; x.textBaseline = 'middle';
        x.fillText(o.url, w / 2, barH / 2 + 1);
      }
    }
    x.imageSmoothingQuality = 'high';
    x.drawImage(img, crop[0], crop[1], crop[2], crop[3], 0, barH, w, ch);
    if (o.shade) { x.fillStyle = `rgba(0,0,0,${o.shade})`; x.fillRect(0, barH, w, ch); }
    if (o.overlay) { x.save(); x.translate(0, barH); x.scale(w / crop[2], ch / crop[3]); x.translate(-crop[0], -crop[1]); o.overlay(x); x.restore(); }
    x.restore();
    const q = S.cardQuad(o.cx, o.cy, w, h, o.ry || 0, o.rx || 0, o.persp || 2200, o.rz || 0);
    ctx.save(); ctx.globalAlpha = o.alpha ?? 1;
    if (o.shadow !== false) {
      ctx.save(); ctx.filter = `blur(${Math.round(w * .03)}px)`; ctx.fillStyle = 'rgba(0,0,0,.6)';
      ctx.beginPath(); ctx.moveTo(q[0][0] + 10, q[0][1] + 40); for (const p of [q[1], q[2], q[3]]) ctx.lineTo(p[0] + 10, p[1] + 40); ctx.closePath(); ctx.fill(); ctx.restore();
    }
    if (!o.ry && !o.rx) { ctx.translate(o.cx, o.cy); ctx.rotate(o.rz || 0); ctx.drawImage(c, -w / 2, -h / 2); }
    else S.warp(ctx, c, 0, 0, w, h, q, o.strips || 48);
    if (o.glow) { ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = o.glow; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(...q[0]); for (const p of [q[1], q[2], q[3]]) ctx.lineTo(...p); ctx.closePath(); ctx.stroke(); }
    ctx.restore();
    // mapper from image coords to screen (bilinear on the quad)
    return (px, py) => {
      const u = (px - crop[0]) / crop[2], v = (barH + (py - crop[1]) / crop[3] * ch) / h;
      const top = [lerp(q[0][0], q[1][0], u), lerp(q[0][1], q[1][1], u)], bot = [lerp(q[3][0], q[2][0], u), lerp(q[3][1], q[2][1], u)];
      return [lerp(top[0], bot[0], v), lerp(top[1], bot[1], v)];
    };
  }

  function lightLeak(ctx, t, col = '#ffb347', k = 1, seed = 1) {
    ctx.save(); ctx.globalCompositeOperation = 'screen';
    for (let i = 0; i < 3; i++) {
      const x = W * (.2 + .6 * (.5 + .5 * Math.sin(t * .7 + seed * 3 + i * 2.1))), y = H * (.15 + .7 * (.5 + .5 * Math.cos(t * .5 + i * 1.7 + seed)));
      const r = 500 + 300 * Math.sin(t * .9 + i);
      const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, S.rgba(col, .32 * k)); g.addColorStop(1, S.rgba(col, 0));
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }
    ctx.restore();
  }

  function ring(ctx, x, y, rw, rh, p, col = '#ffc94d', lw = 7) {
    ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.lineCap = 'round';
    ctx.shadowColor = col; ctx.shadowBlur = 20;
    ctx.beginPath(); ctx.ellipse(x, y, rw, rh, -.05, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(p)); ctx.stroke(); ctx.restore();
  }

  function highlighter(ctx, x, y, w, h, p, col = 'rgba(255,214,0,.55)') {
    ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = col;
    ctx.fillRect(x, y, w * clamp(p), h); ctx.restore();
  }

  function vignetteBox(ctx, a = .55) {
    const g = ctx.createRadialGradient(W / 2, H / 2, H * .25, W / 2, H / 2, H * .75);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${a})`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }

  window.KIT = { decay, win, shake, camera, fmt, words, cap, serif, pill, browser, lightLeak, ring, highlighter, vignetteBox, THEME };
})();
