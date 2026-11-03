/* MoCha: "This is Dave."
 * A 46 s vertical short about Orange-3DV-Team/MoCha (CVPR 2026), a model that
 * swaps the person in a video for a new character from one first-frame mask
 * and a reference photo. Timings live in cues.js and are shared with the score.
 */
(function () {
  const S = SHORT, { W, H, TAU, clamp, lerp, inv, E, ease, hash, noise1 } = S;
  const { SK } = RIG;
  const CU = window.CUES;

  const C = {
    esp: '#0d0806', esp2: '#1d120c', cream: '#f4e6cf', paper: '#f3e6d0', ink: '#1a0f0a',
    orange: '#ff6b1a', cyan: '#3de3ff', red: '#ff3b30', green: '#7dff9a', steel: '#0e1014',
  };
  const FLOOR_Y = 1490;

  // ---------- small helpers ----------
  const decay = (t, at, dur) => (t >= at && t < at + dur) ? 1 - (t - at) / dur : 0;
  const win = (t, a, b) => t >= a && t < b;
  function shake(t, at, amp, dur, freq = 38) {
    const k = decay(t, at, dur); if (!k) return [0, 0];
    const kk = k * k * amp;
    return [noise1(t * freq + at * 3) * kk, noise1(t * freq + 91 + at * 7) * kk];
  }
  function camera(ctx, c) {
    ctx.translate(W / 2, H / 2); ctx.rotate(c.r || 0); ctx.scale(c.z || 1, c.z || 1);
    ctx.translate(-W / 2 + (c.x || 0), -H / 2 + (c.y || 0));
  }
  function place(ctx, x, floorY, sc) { ctx.translate(x, floorY); ctx.scale(sc, sc); ctx.translate(0, -RIG.FLOOR); }
  function words(str, at, step, hl) {
    const out = []; let br = false, i = 0;
    for (let w of str.split(' ')) {
      if (w === '|') { br = true; continue; }
      let h = null; if (w.includes('*')) { h = hl || C.orange; w = w.replace(/\*/g, ''); }
      out.push({ w, at: at + (i++) * step, hl: h, br }); br = false;
    }
    return out;
  }
  function cap(ctx, t, str, at, out, o = {}) {
    if (t < at - .01 || t > out + .3) return;
    S.caption(ctx, words(str, at, o.step ?? .075, o.hl), Object.assign({ x: 540, y: 400, t, out, size: 84, maxW: 900 }, o));
  }
  function serif(ctx, t, str, at, out, o = {}) {
    if (t < at || t > out + .4) return;
    S.kinetic(ctx, str, Object.assign({ x: 540, y: 400, t: t - at, out: out - at, font: `italic 400 ${o.size || 150}px "Instrument Serif"`, size: o.size || 150, color: C.cream, stagger: .025, dur: .5, from: 'below', shadow: 'rgba(0,0,0,.6)', shadowBlur: 30 }, o));
  }
  function pill(ctx, x, y, text, o = {}) {
    ctx.save(); ctx.font = o.font || '800 30px "JetBrains Mono"';
    const w = ctx.measureText(text).width + 44, h = o.h || 56;
    const x0 = o.align === 'right' ? x - w : o.align === 'center' ? x - w / 2 : x;
    ctx.globalAlpha = o.alpha ?? 1;
    ctx.fillStyle = o.bg || 'rgba(0,0,0,.55)'; S.roundRect(ctx, x0, y - h / 2, w, h, h / 2); ctx.fill();
    if (o.border) { ctx.strokeStyle = o.border; ctx.lineWidth = 3; ctx.stroke(); }
    ctx.fillStyle = o.color || '#fff'; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    ctx.fillText(text, x0 + 22, y + 2); ctx.restore();
    return w;
  }
  function partial(pts, p) { // polyline cut at fraction p of its length
    const seg = []; let tot = 0;
    for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(d); tot += d; }
    let rem = tot * clamp(p); const out = [pts[0]];
    for (let i = 1; i < pts.length && rem > 0; i++) {
      const d = seg[i - 1];
      if (rem >= d) { out.push(pts[i]); rem -= d; }
      else { const k = rem / d; out.push([lerp(pts[i - 1][0], pts[i][0], k), lerp(pts[i - 1][1], pts[i][1], k)]); rem = 0; }
    }
    return out;
  }

  // ---------- the film set ----------
  function drawSet(ctx, t, o = {}) {
    const tint = o.tint || '#ffb070';
    let g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#080504'); g.addColorStop(.5, '#1a100b'); g.addColorStop(.68, '#2a1a11'); g.addColorStop(.715, '#1b110b'); g.addColorStop(1, '#060403');
    ctx.fillStyle = g; ctx.fillRect(-400, -400, W + 800, H + 800);
    // back wall panels
    ctx.fillStyle = 'rgba(255,220,180,.025)';
    for (let x = -360; x < W + 360; x += 120) ctx.fillRect(x, -400, 3, 1700);
    // backlight behind the actor
    let rg = ctx.createRadialGradient(540, 930, 20, 540, 930, 640);
    rg.addColorStop(0, S.rgba(tint, .26 * (o.light ?? 1))); rg.addColorStop(1, S.rgba(tint, 0));
    ctx.fillStyle = rg; ctx.fillRect(-400, 200, W + 800, 1500);
    // floor pool
    ctx.save(); ctx.translate(540, FLOOR_Y + 10); ctx.scale(1, .24);
    rg = ctx.createRadialGradient(0, 0, 10, 0, 0, 520);
    rg.addColorStop(0, S.rgba('#ffd9b0', .5 * (o.light ?? 1))); rg.addColorStop(.5, S.rgba(tint, .18 * (o.light ?? 1))); rg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(0, 0, 520, 0, TAU); ctx.fill(); ctx.restore();
    // light cone
    ctx.save(); ctx.globalCompositeOperation = 'screen';
    g = ctx.createLinearGradient(0, -100, 0, FLOOR_Y);
    g.addColorStop(0, S.rgba('#ffe2c4', .2 * (o.light ?? 1))); g.addColorStop(1, S.rgba('#ffcf9e', .05 * (o.light ?? 1)));
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(470, -120); ctx.lineTo(610, -120); ctx.lineTo(1010, FLOOR_Y); ctx.lineTo(70, FLOOR_Y); ctx.closePath(); ctx.fill();
    // dust in the cone (periodic so the loop point is seamless)
    for (let i = 0; i < 70; i++) {
      const ph = t * TAU / 23 * (hash(i) > .5 ? 1 : -1) + hash(i + 3) * TAU;
      const yy = (hash(i * 3.1) * 1500 + (t * 40 * (0.3 + hash(i)) )) % 1500 - 50;
      const spread = lerp(70, 470, clamp((yy + 120) / 1610));
      const x = 540 + (hash(i * 7.7) * 2 - 1) * spread * .9 + Math.sin(ph) * 20;
      const r = 1.2 + hash(i * 1.3) * 2.6;
      ctx.fillStyle = `rgba(255,230,200,${.25 + .35 * hash(i * 9.1)})`;
      ctx.beginPath(); ctx.arc(x, yy, r, 0, TAU); ctx.fill();
    }
    ctx.restore();
    if (o.props !== false) drawProps(ctx, t);
  }
  function drawProps(ctx, t) {
    // studio light, left
    ctx.save();
    ctx.strokeStyle = '#140d09'; ctx.lineWidth = 12; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(60, 1560); ctx.lineTo(110, 980); ctx.moveTo(160, 1560); ctx.lineTo(110, 980); ctx.moveTo(110, 1600); ctx.lineTo(110, 980); ctx.stroke();
    ctx.translate(110, 960); ctx.rotate(.5);
    ctx.fillStyle = '#1a120d'; S.roundRect(ctx, -70, -60, 150, 120, 16); ctx.fill();
    ctx.strokeStyle = 'rgba(255,170,110,.5)'; ctx.lineWidth = 3; ctx.stroke();
    const lg = ctx.createRadialGradient(80, 0, 2, 80, 0, 90); lg.addColorStop(0, 'rgba(255,240,220,.9)'); lg.addColorStop(.25, 'rgba(255,190,120,.35)'); lg.addColorStop(1, 'rgba(255,160,90,0)');
    ctx.fillStyle = lg; ctx.beginPath(); ctx.arc(80, 0, 90, 0, TAU); ctx.fill();
    ctx.restore();
    // cinema camera, right
    ctx.save();
    ctx.strokeStyle = '#140d09'; ctx.lineWidth = 12; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(990, 1110); ctx.lineTo(930, 1580); ctx.moveTo(990, 1110); ctx.lineTo(1060, 1580); ctx.moveTo(990, 1110); ctx.lineTo(1000, 1600); ctx.stroke();
    ctx.translate(1000, 1050);
    ctx.fillStyle = '#18110c'; S.roundRect(ctx, -60, -70, 170, 120, 14); ctx.fill();
    ctx.fillStyle = '#1f1610'; S.roundRect(ctx, -150, -45, 100, 70, 10); ctx.fill();
    ctx.fillStyle = '#0c0806'; ctx.fillRect(-185, -62, 40, 104);
    ctx.strokeStyle = 'rgba(255,170,110,.45)'; ctx.lineWidth = 3; ctx.strokeRect(-185, -62, 40, 104);
    const on = Math.floor(t * 2) % 2 === 0;
    ctx.fillStyle = on ? '#ff3b30' : '#5a1512'; ctx.beginPath(); ctx.arc(-20, -50, 8, 0, TAU); ctx.fill();
    if (on) { ctx.fillStyle = 'rgba(255,59,48,.3)'; ctx.beginPath(); ctx.arc(-20, -50, 22, 0, TAU); ctx.fill(); }
    ctx.restore();
  }
  function beams(ctx, t, cols, k = 1) {
    ctx.save(); ctx.globalCompositeOperation = 'screen';
    cols.forEach((col, i) => {
      const side = i % 2 ? 1 : -1, ox = side > 0 ? W + 80 : -80;
      const a = Math.sin(t * 1.7 + i * 1.9) * .35 + side * -.55;
      ctx.save(); ctx.translate(ox, -60); ctx.rotate(a);
      const g = ctx.createLinearGradient(0, 0, 0, 2000); g.addColorStop(0, S.rgba(col, .38 * k)); g.addColorStop(1, S.rgba(col, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-18, 0); ctx.lineTo(18, 0); ctx.lineTo(190, 2000); ctx.lineTo(-190, 2000); ctx.closePath(); ctx.fill();
      ctx.restore();
    });
    ctx.restore();
  }

  // ---------- dancer with shadow + floor reflection ----------
  function dancer(ctx, t, skin, o = {}) {
    const x = o.x ?? 540, fy = o.floor ?? FLOOR_Y, sc = o.scale ?? 1.55;
    const P = o.pose || RIG.danceAt(o.danceT ?? t, o.move);
    if (o.face) P.face = o.face;
    const J = RIG.solve(P);
    const draw = (c) => { (Array.isArray(skin) ? skin : [skin]).forEach(s => SK[s](c, J, Object.assign({ t, rim: o.rim }, o.skinOpts || {}))); };
    if (o.shadow !== false) {
      ctx.save(); ctx.translate(x + J.pel[0] * sc * .3, fy + 8); ctx.scale(1, .18);
      const g = ctx.createRadialGradient(0, 0, 5, 0, 0, 190 * sc / 1.55); g.addColorStop(0, 'rgba(0,0,0,.65)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 200 * sc / 1.55, 0, TAU); ctx.fill(); ctx.restore();
    }
    if (o.reflect !== false) {
      ctx.save(); ctx.globalAlpha = (o.alpha ?? 1) * .16; ctx.translate(x, fy); ctx.scale(sc, -sc * .55); ctx.translate(0, -RIG.FLOOR);
      if (o.clip) { /* reflection ignores clip for simplicity */ }
      draw(ctx); ctx.restore();
      const g = ctx.createLinearGradient(0, fy, 0, fy + 330); g.addColorStop(0, 'rgba(8,5,3,0)'); g.addColorStop(1, 'rgba(8,5,3,.95)');
      ctx.fillStyle = g; ctx.fillRect(-400, fy, W + 800, 340);
    }
    ctx.save(); ctx.globalAlpha = o.alpha ?? 1; place(ctx, x, fy, sc); draw(ctx); ctx.restore();
    return { J, x, fy, sc, P };
  }
  const toScreen = (d, p) => [d.x + p[0] * d.sc, d.fy + (p[1] - RIG.FLOOR) * d.sc];

  // two skins split by a line; band in the middle shows the hologram "re-render"
  function splitDancer(ctx, t, skinA, skinB, o) {
    const P = o.pose || RIG.danceAt(o.danceT ?? t, o.move);
    if (o.face) P.face = o.face;
    const base = Object.assign({}, o, { pose: P });
    const clipDraw = (rect, skin, extra = {}) => {
      ctx.save(); ctx.beginPath(); ctx.rect(...rect); ctx.clip();
      dancer(ctx, t, skin, Object.assign({}, base, extra)); ctx.restore();
    };
    if (o.axis === 'x') {
      const X = o.at;
      clipDraw([-400, -400, X + 400, H + 800], skinA);
      clipDraw([X, -400, W + 800, H + 800], skinB, { shadow: false });
    } else {
      const Y = o.at;
      clipDraw([-400, -400, W + 800, Y + 400], skinB, { reflect: false });
      clipDraw([-400, Y, W + 800, H + 800], skinA, { shadow: false });
      ctx.save(); ctx.beginPath(); ctx.rect(-400, Y - 46, W + 800, 92); ctx.clip();
      dancer(ctx, t, 'hologram', Object.assign({}, base, { shadow: false, reflect: false })); ctx.restore();
    }
  }
  function scanLine(ctx, t, y, k = 1, axis = 'y') {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const len = axis === 'y' ? W + 800 : H + 800;
    const g = axis === 'y' ? ctx.createLinearGradient(0, y - 160, 0, y + 160) : ctx.createLinearGradient(y - 160, 0, y + 160, 0);
    const gk = axis === 'y' ? .28 : .1;
    g.addColorStop(0, 'rgba(61,227,255,0)'); g.addColorStop(.5, S.rgba(C.cyan, gk * k)); g.addColorStop(1, 'rgba(61,227,255,0)');
    ctx.fillStyle = g;
    if (axis === 'y') ctx.fillRect(-400, y - 160, len, 320); else ctx.fillRect(y - 160, -400, 320, len);
    for (const [w, a] of [[16, .25], [6, .6], [2.5, 1]]) {
      ctx.fillStyle = S.rgba(w < 3 ? '#ffffff' : C.cyan, a * k);
      if (axis === 'y') ctx.fillRect(-400, y - w / 2, len, w); else ctx.fillRect(y - w / 2, -400, w, len);
    }
    // sparks
    for (let i = 0; i < 26; i++) {
      const life = (t * 3 + hash(i)) % 1;
      const along = (axis === 'y' ? 300 : 500) + hash(i * 4.1) * (axis === 'y' ? 480 : 800);
      const off = (hash(i * 2.7) - .5) * 140 * life;
      const px = axis === 'y' ? along : y + off, py = axis === 'y' ? y + off : along;
      ctx.fillStyle = S.rgba(i % 3 ? C.cyan : '#ffffff', (1 - life) * .9 * k);
      ctx.fillRect(px, py, 3, 3);
    }
    ctx.restore();
  }

  // ---------- scenes ----------
  // 0-3: This is Dave.
  function sIntro(ctx, t, fx) {
    const z = 1 + .05 * E.inOutQuad(clamp(t / 3));
    const loopIn = t > 45 ? 1 : 0;
    ctx.save(); camera(ctx, { z: loopIn ? 1 : z, y: 0 });
    drawSet(ctx, t);
    const face = t > 2.05 && t < 3.1 ? 'alarm' : undefined;
    if (t < 2.25 || t > 45) dancer(ctx, t, 'dave', { face });
    else {
      const p = E.inOutCubic(inv(2.25, 3.0, t));
      const top = 560, bot = FLOOR_Y + 30, Y = lerp(top, bot, p);
      splitDancer(ctx, t, 'dave', 'robot', { at: Y, face });
      scanLine(ctx, t, Y, clamp((t - 2.25) / .1));
    }
    // target brackets: the "first-frame mask" moment
    if (win(t, 2.0, 3.0)) {
      const k = E.outBack(inv(2.0, 2.18, t)), q = 1 - inv(2.85, 3.0, t);
      const x0 = 300, y0 = 520, x1 = 780, y1 = 1530, s = 70 * k;
      ctx.save(); ctx.globalAlpha = q; ctx.strokeStyle = C.cyan; ctx.lineWidth = 7; ctx.lineCap = 'square';
      const grow = lerp(80, 0, k);
      for (const [x, y, dx, dy] of [[x0 - grow, y0 - grow, 1, 1], [x1 + grow, y0 - grow, -1, 1], [x0 - grow, y1 + grow, 1, -1], [x1 + grow, y1 + grow, -1, -1]]) {
        ctx.beginPath(); ctx.moveTo(x, y + dy * s); ctx.lineTo(x, y); ctx.lineTo(x + dx * s, y); ctx.stroke();
      }
      pill(ctx, 540, y1 + grow + 52, 'TARGET: DAVE', { bg: C.cyan, color: C.ink, alpha: q * clamp(k), align: 'center' });
      ctx.restore();
    }
    ctx.restore();
    if (t < 45) {
      cap(ctx, t, 'This is Dave.', .15, 1.15);
      cap(ctx, t, 'Dave is an *actor.*', 1.25, 2.6);
    }
    fx.bloom = .55; fx.vig = .6;
  }

  // 3-5: WAS.
  function sDrop(ctx, t, fx) {
    const lt = t - 3;
    const [sx, sy] = shake(t, 3.0, 26, .5);
    const punch = 1.12 - .08 * E.outCubic(clamp(lt / .5));
    const push = E.inExpo(inv(4.45, 5.0, t));
    ctx.save(); camera(ctx, { z: punch + push * 2.6, x: sx, y: sy + push * 160 });
    drawSet(ctx, t, { tint: lt % 1 < .5 ? '#ff8a3d' : '#3de3ff' });
    beams(ctx, t, ['#ff6b1a', '#3de3ff', '#ff6b1a', '#3de3ff'], 1);
    // WAS. sits behind the robot (text-behind-subject)
    const k = clamp(lt / .28);
    ctx.save(); ctx.translate(540, 760); const sc = lerp(2.4, 1, E.outExpo(k)); ctx.scale(sc, sc);
    ctx.font = '400 430px Anton'; ctx.textAlign = 'center'; ctx.globalAlpha = clamp(k * 3);
    ctx.fillStyle = C.orange; ctx.shadowColor = 'rgba(255,107,26,.6)'; ctx.shadowBlur = 60;
    ctx.fillText('WAS.', 0, 0); ctx.restore();
    dancer(ctx, t, 'robot', { rim: lt % 1 < .5 ? '#ffb27a' : '#9df3ff' });
    ctx.restore();
    fx.flash = decay(t, 3.0, .3) * .9;
    fx.glitch = decay(t, 3.0, .18) * .8 + push * .4;
    fx.zoomBlur = push * .35;
    fx.ca = .0007 + decay(t, 3.0, .3) * .006 + push * .01;
    fx.bloom = .8;
  }

  // 5-9: MoCha title
  let PARTS = null, LOGO = null;
  function initTitle() {
    const c = document.createElement('canvas'); c.width = W; c.height = 520;
    const x = c.getContext('2d'); x.font = '900 268px Inter'; x.textAlign = 'center'; x.fillStyle = '#fff';
    x.fillText('MoCha', 540, 380);
    const d = x.getImageData(0, 0, W, 520).data, pts = [];
    for (let yy = 0; yy < 520; yy += 5) for (let xx = 0; xx < W; xx += 5) if (d[(yy * W + xx) * 4 + 3] > 140) pts.push([xx, yy + 440]);
    const r = S.rng(7);
    for (let i = pts.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [pts[i], pts[j]] = [pts[j], pts[i]]; }
    PARTS = pts.slice(0, 2400).map((p, i) => ({ tx: p[0], ty: p[1], sx: 540 + (r() - .5) * 220, d: .15 + (p[0] / W) * .55 + r() * .25, w: r() * TAU, sz: 2.2 + r() * 2.4, c: r() }));
    LOGO = document.createElement('canvas'); LOGO.width = W; LOGO.height = 520;
  }
  function cup(ctx, x, y, o = {}) {
    ctx.save(); ctx.translate(x, y);
    // saucer
    ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.beginPath(); ctx.ellipse(10, 182, 250, 50, 0, 0, TAU); ctx.fill();
    let g = ctx.createLinearGradient(-240, 0, 240, 0); g.addColorStop(0, '#9c8c78'); g.addColorStop(.4, '#f6efe3'); g.addColorStop(1, '#8e7f6c');
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 166, 240, 48, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,.12)'; ctx.beginPath(); ctx.ellipse(0, 160, 150, 26, 0, 0, TAU); ctx.fill();
    // handle
    ctx.strokeStyle = '#d9cdbb'; ctx.lineWidth = 26; ctx.beginPath(); ctx.ellipse(170, 50, 52, 62, 0, -1.4, 1.5); ctx.stroke();
    // body
    g = ctx.createLinearGradient(-170, 0, 170, 0); g.addColorStop(0, '#a6977f'); g.addColorStop(.3, '#fbf6ec'); g.addColorStop(.62, '#e6dbc9'); g.addColorStop(1, '#8f806a');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-165, -10); ctx.bezierCurveTo(-160, 120, -120, 158, 0, 160); ctx.bezierCurveTo(120, 158, 160, 120, 165, -10); ctx.closePath(); ctx.fill();
    ctx.fillStyle = C.orange; ctx.globalAlpha = .9; ctx.font = '800 26px "JetBrains Mono"'; ctx.textAlign = 'center'; ctx.fillText('MoCha', 0, 90); ctx.globalAlpha = 1;
    // rim + coffee
    ctx.fillStyle = '#efe6d6'; ctx.beginPath(); ctx.ellipse(0, -10, 166, 40, 0, 0, TAU); ctx.fill();
    const rg = ctx.createRadialGradient(0, -10, 4, 0, -10, 150); rg.addColorStop(0, '#d39a61'); rg.addColorStop(.55, '#8a5530'); rg.addColorStop(1, '#3b2213');
    ctx.fillStyle = rg; ctx.beginPath(); ctx.ellipse(0, -8, 150, 32, 0, 0, TAU); ctx.fill();
    // latte-art heart
    ctx.fillStyle = 'rgba(250,236,214,.9)'; ctx.beginPath();
    ctx.moveTo(0, 12); ctx.bezierCurveTo(-70, -6, -50, -30, -18, -24); ctx.bezierCurveTo(-6, -22, 0, -16, 0, -12);
    ctx.bezierCurveTo(0, -16, 6, -22, 18, -24); ctx.bezierCurveTo(50, -30, 70, -6, 0, 12); ctx.fill();
    ctx.restore();
  }
  function steam(ctx, t, x, y, k = 1, n = 5) {
    ctx.save(); ctx.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const off = (i - (n - 1) / 2) * 34, ph = t * 1.4 + i * 1.7;
      ctx.strokeStyle = `rgba(255,240,225,${.14 * k})`; ctx.lineWidth = 18 - i;
      ctx.beginPath(); ctx.moveTo(x + off, y);
      for (let s = 1; s <= 8; s++) ctx.lineTo(x + off + Math.sin(ph + s * .8) * (10 + s * 5), y - s * 42);
      ctx.stroke();
    }
    ctx.restore();
  }
  function sTitle(ctx, t, fx) {
    const lt = t - 5;
    const [sx, sy] = shake(t, 7.0, 22, .45);
    ctx.save(); camera(ctx, { z: 1.04 - .04 * E.outCubic(clamp(lt / 4)), x: sx, y: sy });
    let rg = ctx.createRadialGradient(540, 900, 30, 540, 900, 1200);
    rg.addColorStop(0, '#3a2215'); rg.addColorStop(.5, '#170d08'); rg.addColorStop(1, '#070403');
    ctx.fillStyle = rg; ctx.fillRect(-300, -300, W + 600, H + 600);
    // bokeh
    for (let i = 0; i < 26; i++) {
      const x = hash(i * 3.3) * W, y = (hash(i * 5.1) * H - lt * (20 + 30 * hash(i))) % H, r = 20 + hash(i * 1.7) * 70;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(255,140,60,${.08 + .1 * hash(i)})`); g.addColorStop(1, 'rgba(255,140,60,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    }
    const cupY = lerp(1700, 1260, E.outBack(clamp(lt / .6), 1.2));
    steam(ctx, t, 540, cupY - 40, clamp((lt - .3) / .5) * (1 - .6 * clamp((lt - 1.4) / .5)));
    cup(ctx, 540, cupY);
    // particles: steam that becomes the logo
    const solid = E.inOutCubic(clamp((lt - 1.45) / .35));
    if (solid < 1) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (const p of PARTS) {
        const u = clamp((lt - .3 - p.d) / .95);
        if (u <= 0) continue;
        const e = E.inOutCubic(u);
        const sy0 = cupY - 40;
        const wob = Math.sin(lt * 3 + p.w) * 70 * (1 - e);
        const x = lerp(p.sx, p.tx, e) + wob, y = lerp(sy0, p.ty, E.outCubic(u)) + Math.cos(lt * 2.3 + p.w) * 30 * (1 - e);
        ctx.fillStyle = p.c > .82 ? `rgba(255,140,60,${.9 * (1 - solid)})` : `rgba(255,236,210,${.85 * (1 - solid)})`;
        ctx.fillRect(x - p.sz / 2, y - p.sz / 2, p.sz, p.sz);
      }
      ctx.restore();
    }
    if (solid > 0) {
      const lx = LOGO.getContext('2d');
      lx.globalCompositeOperation = 'source-over'; lx.clearRect(0, 0, W, 520);
      lx.font = '900 268px Inter'; lx.textAlign = 'center'; lx.fillStyle = C.cream; lx.fillText('MoCha', 540, 380);
      lx.globalCompositeOperation = 'source-atop';
      const sp = (lt - 1.6) / .7; const sxp = lerp(-300, 1400, clamp(sp));
      const g = lx.createLinearGradient(sxp - 160, 0, sxp + 160, 0); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(.5, 'rgba(255,255,255,.95)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      lx.fillStyle = g; lx.fillRect(0, 0, W, 520);
      ctx.save(); ctx.globalAlpha = solid; ctx.shadowColor = 'rgba(255,107,26,.75)'; ctx.shadowBlur = 50; ctx.drawImage(LOGO, 0, 440); ctx.restore();
    }
    // subtitle
    S.typewriter(ctx, 'END-TO-END VIDEO CHARACTER REPLACEMENT', { x: 540, y: 905, t: lt - 1.3, dur: .9, font: '800 31px "JetBrains Mono"', color: C.orange, align: 'center' });
    ctx.save(); ctx.globalAlpha = clamp((lt - 1.2) / .4) * .65; ctx.font = '500 27px "JetBrains Mono"'; ctx.fillStyle = C.cream; ctx.textAlign = 'center';
    ctx.fillText('github.com/Orange-3DV-Team/MoCha', 540, 250); ctx.restore();
    // CVPR stamp
    if (lt >= 2.0) {
      const k = clamp((lt - 2.0) / .22), e = E.outCubic(k);
      ctx.save(); ctx.translate(800, 560); ctx.rotate(-.16); const sc = lerp(3.2, 1, e); ctx.scale(sc, sc);
      ctx.globalAlpha = clamp(k * 2);
      ctx.strokeStyle = C.orange; ctx.lineWidth = 7; S.roundRect(ctx, -170, -70, 340, 140, 18); ctx.stroke();
      ctx.lineWidth = 2.5; S.roundRect(ctx, -158, -58, 316, 116, 12); ctx.stroke();
      ctx.fillStyle = C.orange; ctx.font = '400 84px Anton'; ctx.textAlign = 'center'; ctx.fillText('CVPR 2026', 0, 22);
      ctx.font = '800 20px "JetBrains Mono"'; ctx.fillText('ACCEPTED PAPER', 0, 50);
      ctx.restore();
      // dust ring
      if (lt < 2.8) {
        const r = S.rng(11);
        for (let i = 0; i < 40; i++) {
          const a = r() * TAU, sp = 200 + r() * 360, u = clamp((lt - 2.18) / .6);
          if (u <= 0) break;
          ctx.fillStyle = `rgba(255,170,110,${(1 - u) * .8})`;
          ctx.beginPath(); ctx.arc(800 + Math.cos(a) * sp * E.outCubic(u), 560 + Math.sin(a) * sp * .6 * E.outCubic(u), 3 + r() * 4, 0, TAU); ctx.fill();
        }
      }
    }
    ctx.restore();
    cap(ctx, t, 'Swap the actor.', 7.5, 8.75, { y: 1060, size: 76 });
    cap(ctx, t, 'Keep *every* *move.*', 7.95, 8.75, { y: 1150, size: 76 });
    fx.flash = decay(t, 5.0, .35) * .8 + decay(t, 7.0, .12) * .25;
    fx.glitch = (t > 8.82 ? (t - 8.82) / .18 : 0) * .9;
    fx.bloom = .9; fx.vig = .6;
  }

  // 9-15: what older methods needed
  const off1 = document.createElement('canvas'); off1.width = 760; off1.height = 760;
  function card(ctx, x, y, w, h, o = {}) {
    ctx.save(); ctx.fillStyle = o.bg || '#16181d'; S.roundRect(ctx, x, y, w, h, 26); ctx.fill();
    ctx.strokeStyle = o.border || '#2a2e37'; ctx.lineWidth = 3; ctx.stroke(); ctx.restore();
  }
  function miniDave(ctx, t, x, floorY, sc, skin = 'dave', o = {}) {
    ctx.save(); place(ctx, x, floorY, sc); const J = RIG.solve(o.pose || RIG.danceAt(t, o.move)); (Array.isArray(skin) ? skin : [skin]).forEach(s => SK[s](ctx, J, Object.assign({ t }, o))); ctx.restore();
  }
  function sOld(ctx, t, fx) {
    const lt = t - 9;
    ctx.save();
    const suck = E.inBack(inv(14.62, 15.0, t), 1.4);
    if (suck > 0) { ctx.translate(540, 900); ctx.rotate(suck * .6); ctx.scale(1 - suck * .98, 1 - suck * .98); ctx.translate(-540, -900); }
    ctx.fillStyle = C.steel; ctx.fillRect(-400, -400, W + 800, H + 800);
    ctx.strokeStyle = 'rgba(120,150,190,.06)'; ctx.lineWidth = 2;
    for (let x = 0; x <= W; x += 60) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y <= H; y += 60) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    const phase2 = t >= 12.5;
    if (!phase2 || t < 12.9) {
      const out = E.inCubic(inv(12.45, 12.85, t));
      if (!phase2) S.kinetic(ctx, 'Older AI swaps needed:', { x: 540, y: 330, t: lt, font: '900 70px Inter', size: 70, color: '#fff', stagger: .018, from: 'below' });
      const items = [
        { at: 9.5, label: ['A mask on every', 'single frame'], tag: 'PER-FRAME MASKS' },
        { at: 10.5, label: ['A pose skeleton'], tag: 'STRUCTURAL GUIDANCE' },
        { at: 11.5, label: ['A depth map'], tag: 'STRUCTURAL GUIDANCE' },
      ];
      items.forEach((it, i) => {
        if (t < it.at) return;
        const k = E.outExpo(clamp((t - it.at) / .38));
        const y = 430 + i * 360 - out * (900 + i * 120);
        const x = 80 + (1 - k) * 1100;
        for (let g = 2; g >= 0; g--) { // ghost trail = motion blur
          const gx = x + g * (1 - k) * 160;
          ctx.save(); ctx.globalAlpha = g ? .18 * (1 - k) : 1;
          card(ctx, gx, y, 920, 330);
          if (!g) drawOldItem(ctx, t, i, gx, y, it);
          ctx.restore();
        }
      });
    }
    if (phase2) {
      const k = E.outExpo(inv(12.55, 12.95, t));
      S.kinetic(ctx, 'And it still broke when:', { x: 540, y: 330, t: t - 12.55, font: '900 70px Inter', size: 70, color: '#fff', stagger: .018, from: 'below' });
      const py = lerp(1900, 440, k);
      card(ctx, 90, py, 900, 700, { bg: '#0a0b0e', border: S.rgba(C.red, .8) });
      ctx.save(); ctx.beginPath(); S.roundRect(ctx, 90, py, 900, 700, 26); ctx.clip();
      brokenDave(ctx, t, 540, py + 650, .95);
      ctx.restore();
      pill(ctx, 120, py + 50, 'OUTPUT.mp4', { font: '800 26px "JetBrains Mono"', bg: 'rgba(255,255,255,.08)' });
      if (Math.floor(t * 3) % 2 === 0) pill(ctx, 960, py + 50, '● ERROR', { font: '800 26px "JetBrains Mono"', bg: S.rgba(C.red, .9), align: 'right' });
      const fails = [[13.0, 'he grabbed a cup'], [13.5, 'the lights changed'], [14.0, 'he danced like Dave']];
      fails.forEach(([at, txt], i) => {
        if (t < at) return;
        const e = E.outBack(clamp((t - at) / .3), 2);
        const y = 1250 + i * 84;
        ctx.save(); ctx.translate(130 + (1 - e) * -200, y); ctx.globalAlpha = clamp((t - at) / .15);
        ctx.fillStyle = C.red; ctx.beginPath(); ctx.arc(24, 0, 26, 0, TAU); ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(14, -10); ctx.lineTo(34, 10); ctx.moveTo(34, -10); ctx.lineTo(14, 10); ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.font = '800 50px Inter'; ctx.textBaseline = 'middle'; ctx.fillText(txt, 72, 2);
        ctx.restore();
      });
      if (t > 14.4) {
        ctx.fillStyle = `rgba(5,5,7,${.78 * clamp((t - 14.4) / .15)})`; ctx.fillRect(-400, -400, W + 800, H + 800);
        serif(ctx, t, 'Flawless.', 14.4, 15.2, { y: 920, size: 210 });
      }
    }
    ctx.restore();
    fx.glitch = decay(t, 9.0, .2) * .9 + (win(t, 12.95, 14.4) ? .12 + .25 * (decay(t, 13.0, .15) + decay(t, 13.5, .15) + decay(t, 14.0, .15)) : 0);
    fx.zoomBlur = suck * .5; fx.vig = .5; fx.bloom = .5; fx.warm = .1;
    const [sx, sy] = [0, 0]; void sx; void sy;
  }
  function drawOldItem(ctx, t, i, x, y, it) {
    const vx = x + 22, vy = y + 22, vw = 340, vh = 286;
    ctx.save(); ctx.fillStyle = '#07080a'; S.roundRect(ctx, vx, vy, vw, vh, 18); ctx.fill(); ctx.clip();
    if (i === 0) {
      const scroll = Math.max(0, t - it.at - .5) * 120;
      for (let r = -1; r < 6; r++) for (let c = 0; c < 4; c++) {
        const fx0 = vx + 10 + c * 82, fy0 = vy + 10 + r * 68 - (scroll % 68), n = (r + Math.floor(scroll / 68)) * 4 + c;
        ctx.fillStyle = '#1d2027'; ctx.fillRect(fx0, fy0, 74, 60);
        ctx.save(); ctx.beginPath(); ctx.rect(fx0, fy0, 74, 60); ctx.clip();
        miniDave(ctx, n * .13, fx0 + 37, fy0 + 57, .09, 'dave', { rim: '#000' });
        const on = t > it.at + .15 + n * .045;
        if (on) { ctx.globalAlpha = .75; miniDave(ctx, n * .13, fx0 + 37, fy0 + 57, .09, 'flat', {}); ctx.globalAlpha = 1; ctx.save(); place(ctx, fx0 + 37, fy0 + 57, .09); SK.flat(C.orange)(ctx, RIG.solve(RIG.danceAt(n * .13)), {}); ctx.restore(); }
        ctx.restore();
      }
      const cnt = Math.min(240, Math.floor(Math.max(0, t - it.at - .1) * 120));
      ctx.restore(); ctx.save();
      pill(ctx, vx + 12, vy + vh - 28, `MASK ${String(cnt).padStart(3, '0')}/240`, { font: '800 22px "JetBrains Mono"', bg: S.rgba(C.orange, .95), color: C.ink, h: 40 });
    } else if (i === 1) {
      miniDave(ctx, t, vx + vw / 2, vy + vh - 14, .46, 'dave', { rim: '#000' });
      ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(vx, vy, vw, vh);
      miniDave(ctx, t, vx + vw / 2, vy + vh - 14, .46, 'pose', { w: 12 });
    } else {
      miniDave(ctx, t, vx + vw / 2, vy + vh - 14, .46, 'depth');
    }
    ctx.restore();
    ctx.save(); ctx.fillStyle = '#fff'; ctx.font = '800 54px Inter'; ctx.textBaseline = 'alphabetic';
    it.label.forEach((l, j) => ctx.fillText(l, x + 392, y + (it.label.length === 1 ? 170 : 136) + j * 64));
    ctx.font = '800 24px "JetBrains Mono"'; ctx.fillStyle = S.rgba(C.cyan, .85);
    ctx.fillText(it.tag, x + 394, y + (it.label.length === 1 ? 222 : 256));
    ctx.restore();
  }
  function brokenDave(ctx, t, x, floorY, sc) {
    const o = off1.getContext('2d');
    o.setTransform(1, 0, 0, 1, 0, 0); o.clearRect(0, 0, 760, 760);
    const move = t >= 14.0 ? 'flamingo' : undefined;
    o.save();
    if (win(t, 13.5, 14.0)) o.filter = `hue-rotate(${Math.floor(t * 12) * 70}deg) saturate(2.5) brightness(${Math.floor(t * 12) % 2 ? 1.8 : .5})`;
    place(o, 380, 740, sc * .95); const J = RIG.solve(RIG.danceAt(t, move));
    SK.dave(o, J, { t, rim: '#000', face: 'o' });
    if (t >= 13.0) { // cup fused into the hand
      for (let k = 0; k < 4; k++) { o.globalAlpha = 1 - k * .22; o.fillStyle = '#f2ece2'; o.fillRect(J.rha[0] - 18 + k * 14, J.rha[1] - 40 + k * 9, 36, 48); o.fillStyle = C.orange; o.fillRect(J.rha[0] - 18 + k * 14, J.rha[1] - 24 + k * 9, 36, 12); }
      o.globalAlpha = 1;
    }
    o.restore();
    const step = Math.floor(t * 14), amp = t >= 14.0 ? 120 : 60;
    for (let s = 0; s < 760; s += 19) {
      const r = hash(s * .37 + step * 1.3), dx = r > .65 ? (hash(s + step) - .5) * amp * 2 : 0;
      ctx.drawImage(off1, 0, s, 760, 19, x - 380 * 1 + dx, floorY - 740 + s, 760, 19);
    }
    ctx.save(); ctx.globalCompositeOperation = 'screen';
    for (let i = 0; i < 9; i++) {
      const r1 = hash(i * 3 + step), r2 = hash(i * 7 + step * 2);
      ctx.fillStyle = [S.rgba(C.cyan, .45), 'rgba(255,0,170,.4)', S.rgba(C.orange, .45)][i % 3];
      ctx.fillRect(x - 300 + r1 * 600, floorY - 680 + r2 * 640, 40 + hash(i + step) * 140, 8 + hash(i * 2 + step) * 40);
    }
    ctx.restore();
  }

  // 15-19: MoCha needs (light palette)
  function miniSet(ctx, x, y, w, h) {
    const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, '#120b07'); g.addColorStop(.72, '#2c1b12'); g.addColorStop(.74, '#1a100a'); g.addColorStop(1, '#0a0605');
    ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
    const rg = ctx.createRadialGradient(x + w / 2, y + h * .5, 5, x + w / 2, y + h * .5, w * .55); rg.addColorStop(0, 'rgba(255,170,100,.3)'); rg.addColorStop(1, 'rgba(255,170,100,0)');
    ctx.fillStyle = rg; ctx.fillRect(x, y, w, h);
  }
  function sNeeds(ctx, t, fx) {
    const lt = t - 15;
    ctx.fillStyle = C.steel; ctx.fillRect(0, 0, W, H);
    const R = E.outExpo(inv(15.0, 15.4, t)) * 1300;
    ctx.save(); ctx.beginPath(); ctx.arc(540, 900, R, 0, TAU); ctx.clip();
    ctx.fillStyle = C.paper; ctx.fillRect(0, 0, W, H);
    // paper grain dots
    ctx.fillStyle = 'rgba(120,80,40,.05)'; for (let i = 0; i < 200; i++) ctx.fillRect(hash(i * 1.1) * W, hash(i * 2.3) * H, 3, 3);
    const apart = E.inCubic(inv(18.45, 18.8, t));
    // header
    S.kinetic(ctx, 'MoCha needs:', { x: 540, y: 300, t: lt - .25, font: '900 84px Inter', size: 84, color: (i) => i < 5 ? C.orange : C.ink, stagger: .025, out: 3.45, outDur: .2 });
    // Row 1: one mask on frame 1
    if (t >= 15.55) {
      const k = E.outBack(clamp((t - 15.55) / .4), 1.3);
      const fx0 = 60 - apart * 900, fy0 = 430, fw = 560, fh = 400;
      ctx.save(); ctx.translate(fx0 + fw / 2, fy0 + fh / 2); ctx.rotate(-.025); ctx.scale(k, k); ctx.translate(-fw / 2, -fh / 2);
      ctx.fillStyle = 'rgba(60,30,10,.18)'; S.roundRect(ctx, 10, 18, fw, fh, 20); ctx.fill();
      ctx.fillStyle = '#fff'; S.roundRect(ctx, 0, 0, fw, fh, 20); ctx.fill();
      ctx.save(); S.roundRect(ctx, 14, 14, fw - 28, fh - 80, 12); ctx.clip();
      miniSet(ctx, 14, 14, fw - 28, fh - 80);
      const pose = RIG.danceAt(1.0);
      ctx.save(); place(ctx, fw / 2, fh - 82, .46); const J = RIG.solve(pose); SK.dave(ctx, J, { t: 0, rim: '#ffb27a' });
      // brush stroke then clean mask
      const bp = clamp((t - 15.8) / .7);
      const pts = [[-40, -40], [40, -60], [-60, 20], [60, 30], [-70, 110], [70, 110], [-60, 190], [60, 190], [-50, 280], [50, 300], [-40, 380], [40, 400], [-30, 470], [30, 490]].map(p => [p[0], p[1]]);
      const clean = clamp((t - 16.55) / .15);
      if (bp > 0 && clean < 1) { ctx.globalAlpha = .78 * (1 - clean); RIG.seg(ctx, partial(pts, bp), 70, C.orange); ctx.globalAlpha = 1; }
      if (clean > 0) { ctx.globalAlpha = .72 * clean; SK.flat(C.orange)(ctx, J, {}); ctx.globalAlpha = 1; }
      ctx.restore();
      ctx.restore();
      ctx.fillStyle = C.ink; ctx.font = '800 24px "JetBrains Mono"'; ctx.fillText('FRAME 001', 24, fh - 30);
      ctx.fillStyle = '#e8dccb'; ctx.fillRect(190, fh - 42, 380, 8); ctx.fillStyle = C.orange; ctx.fillRect(190, fh - 46, 10, 16);
      ctx.restore();
      S.kinetic(ctx, '1 mask.', { x: 1020 + apart * 600, y: 640, t: t - 15.75, font: '900 88px Inter', size: 88, color: C.ink, align: 'right', stagger: .03 });
      ctx.save(); ctx.globalAlpha = clamp((t - 16.0) / .3); ctx.font = '800 26px "JetBrains Mono"'; ctx.fillStyle = C.orange; ctx.textAlign = 'right';
      ctx.fillText('FIRST FRAME ONLY', 1016 + apart * 600, 700); ctx.restore();
    }
    // Row 2: one reference photo
    if (t >= 17.0) {
      const k = clamp((t - 17.0) / .45), e = E.outBack(k, 1.6);
      const px = 520 + apart * 700, py = 930;
      ctx.save(); ctx.translate(px + 230, py + 270 - (1 - e) * 300); ctx.rotate(.06 - (1 - e) * .5); ctx.globalAlpha = clamp(k * 3);
      ctx.fillStyle = 'rgba(60,30,10,.2)'; ctx.fillRect(-222, -252, 460, 540);
      ctx.fillStyle = '#fffdf8'; ctx.fillRect(-230, -270, 460, 540);
      ctx.save(); ctx.beginPath(); ctx.rect(-200, -240, 400, 400); ctx.clip();
      const g = ctx.createLinearGradient(0, -240, 0, 160); g.addColorStop(0, '#dfe7ee'); g.addColorStop(1, '#b8c6d3'); ctx.fillStyle = g; ctx.fillRect(-200, -240, 400, 400);
      ctx.save(); ctx.translate(0, 560); ctx.scale(1.25, 1.25); ctx.translate(0, -RIG.FLOOR); SK.robot(ctx, RIG.solve(RIG.base()), { t, rim: '#ffffff' }); ctx.restore();
      ctx.restore();
      ctx.fillStyle = '#5a4636'; ctx.font = 'italic 400 54px "Instrument Serif"'; ctx.textAlign = 'center'; ctx.fillText('the new guy', 0, 228);
      // flash of the shutter
      ctx.fillStyle = `rgba(255,255,255,${decay(t, 17.0, .25)})`; ctx.fillRect(-200, -240, 400, 400);
      ctx.restore();
      S.kinetic(ctx, '1 photo.', { x: 70 - apart * 700, y: 1180, t: t - 17.1, font: '900 92px Inter', size: 92, color: C.ink, align: 'left', stagger: .03 });
      ctx.save(); ctx.globalAlpha = clamp((t - 17.35) / .3); ctx.font = '800 26px "JetBrains Mono"'; ctx.fillStyle = C.orange;
      ctx.fillText('OF THE NEW GUY', 74 - apart * 700, 1240); ctx.restore();
    }
    if (t >= 18.5) {
      S.kinetic(ctx, "That's it.", { x: 540, y: 1000, t: t - 18.5, font: '900 150px Inter', size: 150, color: C.ink, stagger: .03, from: 'scale' });
    }
    ctx.restore();
    // iris to dark from the full stop of "That's it."
    if (t >= 19.0) {
      ctx.font = '900 150px Inter'; const tw = ctx.measureText("That's it.").width, pw = ctx.measureText('.').width;
      ctx.save(); ctx.fillStyle = '#07080b'; ctx.beginPath(); ctx.arc(540 + tw / 2 - pw / 2, 985, E.inOutCubic(inv(19.0, 19.35, t)) * 2100, 0, TAU); ctx.fill(); ctx.restore();
    }
    fx.vig = .25; fx.bloom = .2; fx.grain = .045; fx.warm = .2; fx.ca = .0004;
  }

  // 19-21: one token stream
  function sTokens(ctx, t, fx) {
    const lt = t - 19.0;
    ctx.fillStyle = '#07080b'; ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.globalAlpha = .5; ctx.strokeStyle = 'rgba(61,227,255,.06)'; ctx.lineWidth = 2;
    for (let y = 0; y < H; y += 48) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    ctx.restore();
    ctx.save(); ctx.translate(540, 960); ctx.scale(1.12, 1.12); ctx.translate(-540, -900);
    const srcs = [[220, 470, C.cream, 'VIDEO'], [540, 470, C.orange, 'MASK'], [860, 470, C.cyan, 'PHOTO']];
    srcs.forEach(([x, y, col, lab], i) => {
      const k = E.outBack(clamp((lt - .05 - i * .08) / .35));
      ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
      ctx.fillStyle = '#12151b'; S.roundRect(ctx, -130, -90, 260, 180, 18); ctx.fill();
      ctx.strokeStyle = S.rgba(col, .9); ctx.lineWidth = 4; ctx.stroke();
      ctx.save(); S.roundRect(ctx, -120, -80, 240, 160, 12); ctx.clip();
      if (i === 0) { miniSet(ctx, -120, -80, 240, 160); for (let f = 0; f < 3; f++) miniDave(ctx, t + f * .2, -80 + f * 80, 72, .2, 'dave', { rim: '#000' }); ctx.fillStyle = 'rgba(255,255,255,.5)'; for (let f = 0; f < 10; f++) { ctx.fillRect(-120 + f * 26, -80, 14, 8); ctx.fillRect(-120 + f * 26, 72, 14, 8); } }
      if (i === 1) { ctx.fillStyle = '#0b0c0f'; ctx.fillRect(-120, -80, 240, 160); miniDave(ctx, 1.0, 0, 76, .25, 'flat', {}); ctx.globalAlpha = 1; ctx.save(); place(ctx, 0, 76, .25); SK.flat(C.orange)(ctx, RIG.solve(RIG.danceAt(1.0)), {}); ctx.restore(); }
      if (i === 2) { const g = ctx.createLinearGradient(0, -80, 0, 80); g.addColorStop(0, '#dfe7ee'); g.addColorStop(1, '#a9b8c6'); ctx.fillStyle = g; ctx.fillRect(-120, -80, 240, 160); ctx.save(); ctx.translate(0, 300); ctx.scale(.62, .62); ctx.translate(0, -RIG.FLOOR); SK.robot(ctx, RIG.solve(RIG.base()), { t, rim: '#fff' }); ctx.restore(); }
      ctx.restore();
      ctx.fillStyle = col; ctx.font = '800 24px "JetBrains Mono"'; ctx.textAlign = 'center'; ctx.fillText(lab, 0, 130);
      ctx.restore();
    });
    // tokens
    const N = 260;
    ctx.save();
    for (let i = 0; i < N; i++) {
      const s = i % 3, ts = .25 + (i / N) * 1.45, u = (lt - ts) / .75;
      if (u <= 0 || u >= 1) continue;
      const [sx0, sy0, col] = srcs[s];
      const jx = (hash(i * 1.7) - .5) * 160, jy = (hash(i * 2.9) - .5) * 60;
      let x, y;
      if (u < .45) { const e = E.inOutCubic(u / .45); x = lerp(sx0 + jx, 540, e); y = lerp(sy0 + 100 + jy, 790, e); x += Math.sin(e * Math.PI) * (s === 0 ? -40 : s === 2 ? 40 : 0); }
      else if (u < .72) { const e = (u - .45) / .27; x = 540 + (hash(i) - .5) * 26; y = lerp(790, 1150, e); }
      else { const e = E.outCubic((u - .72) / .28); x = lerp(540, 200 + hash(i * 5.3) * 680, e); y = lerp(1150, 1390 + (hash(i * 3.3) - .5) * 120, e); }
      const sz = 16;
      ctx.fillStyle = col; ctx.globalAlpha = .95;
      ctx.fillRect(x - sz / 2, y - sz / 2, sz, sz);
    }
    ctx.restore();
    // label on the merged stream
    ctx.save(); ctx.globalAlpha = clamp((lt - .6) / .3);
    pill(ctx, 580, 810, '1 TOKEN STREAM', { font: '800 24px "JetBrains Mono"', bg: 'rgba(255,255,255,.1)', border: 'rgba(255,255,255,.35)', h: 46 });
    ctx.restore();
    // model block
    const mk = E.outBack(clamp((lt - .15) / .4));
    ctx.save(); ctx.translate(540, 1030); ctx.scale(mk, mk);
    const pulse = .5 + .5 * Math.sin(lt * 14);
    ctx.shadowColor = S.rgba(C.orange, .8); ctx.shadowBlur = 40 + 30 * pulse;
    ctx.fillStyle = '#14100d'; S.roundRect(ctx, -300, -130, 600, 260, 34); ctx.fill(); ctx.shadowBlur = 0;
    const g = ctx.createLinearGradient(-300, 0, 300, 0); g.addColorStop(0, C.orange); g.addColorStop(.5, C.cream); g.addColorStop(1, C.cyan);
    ctx.strokeStyle = g; ctx.lineWidth = 5; ctx.stroke();
    for (let r = 0; r < 6; r++) { const a = .15 + .6 * Math.max(0, Math.sin(lt * 10 - r * .9)); ctx.fillStyle = `rgba(255,170,110,${a})`; S.roundRect(ctx, -250, -100 + r * 18, 500, 8, 4); ctx.fill(); }
    ctx.fillStyle = C.cream; ctx.font = '900 70px Inter'; ctx.textAlign = 'center'; ctx.fillText('MoCha', 0, 66);
    ctx.font = '500 22px "JetBrains Mono"'; ctx.fillStyle = 'rgba(244,230,207,.75)'; ctx.fillText('on Wan2.1 · 14B', 0, 104);
    ctx.restore();
    // output strip
    const ok = clamp((lt - 1.0) / .5);
    ctx.save(); ctx.globalAlpha = ok;
    for (let f = 0; f < 3; f++) {
      const x = 130 + f * 280, y = 1300;
      ctx.fillStyle = '#12151b'; S.roundRect(ctx, x, y, 260, 180, 14); ctx.fill(); ctx.strokeStyle = S.rgba(C.cyan, .6); ctx.lineWidth = 3; ctx.stroke();
      ctx.save(); S.roundRect(ctx, x + 8, y + 8, 244, 164, 10); ctx.clip(); miniSet(ctx, x + 8, y + 8, 244, 164);
      miniDave(ctx, t + f * .25, x + 130, y + 166, .25, 'robot', { rim: '#9df3ff' }); ctx.restore();
    }
    ctx.fillStyle = C.cyan; ctx.font = '800 24px "JetBrains Mono"'; ctx.textAlign = 'center'; ctx.fillText('OUTPUT', 540, 1530);
    ctx.restore();
    ctx.restore();
    cap(ctx, t, 'Everything goes in as *one* *stream.*', 19.15, 20.85, { y: 235, size: 64, maxW: 960 });
    fx.bloom = .9; fx.vig = .55; fx.warm = .2;
    fx.zoomBlur = E.inExpo(inv(20.75, 21.0, t)) * .5;
  }

  // 21-29: the reveal
  const CYCLE = [['astronaut', 'ASTRONAUT', '#7fb4ff'], ['knight', 'KNIGHT', '#ff5a4a'], ['cat', 'CAT IN A SUIT', '#ffa53d'], ['hologram', 'HOLOGRAM', '#3de3ff'], ['robot', 'ROBOT', '#b07bff'], ['astronaut', 'ASTRONAUT', '#7fb4ff'], ['knight', 'KNIGHT', '#ff5a4a'], ['cat', 'CAT IN A SUIT', '#ffa53d']];
  function wipeX(t) {
    const keys = [[21.0, 1150], [21.75, 120], [22.55, 960], [23.35, 240], [24.15, 780], [24.95, 540]];
    for (let i = 0; i < keys.length - 1; i++) if (t < keys[i + 1][0]) return lerp(keys[i][1], keys[i + 1][1], E.inOutCubic(inv(keys[i][0], keys[i + 1][0], t)));
    return 540;
  }
  function sReveal(ctx, t, fx) {
    const [sx, sy] = shake(t, 21.0, 24, .45);
    const cyc = t >= 25 ? Math.min(7, Math.floor((t - 25) / .5)) : -1;
    const tint = cyc >= 0 ? CYCLE[cyc][2] : '#ffb070';
    ctx.save(); camera(ctx, { z: 1.02 + .02 * Math.sin(t * .8), x: sx, y: sy, r: .006 * Math.sin(t * .6) });
    drawSet(ctx, t, { tint });
    beams(ctx, t, cyc >= 0 ? [tint, '#ffffff', tint, '#ffffff'] : ['#ff6b1a', '#3de3ff'], cyc >= 0 ? .9 : .6);
    if (t < 25) {
      const X = wipeX(t);
      splitDancer(ctx, t, 'dave', 'robot', { axis: 'x', at: X, rim: '#ffb27a' });
      scanLine(ctx, t, X, 1, 'x');
      // knob
      ctx.save(); ctx.translate(X, 1010); ctx.fillStyle = '#fff'; ctx.shadowColor = C.cyan; ctx.shadowBlur = 30; ctx.beginPath(); ctx.arc(0, 0, 38, 0, TAU); ctx.fill(); ctx.shadowBlur = 0;
      ctx.strokeStyle = C.ink; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(-8, -12); ctx.lineTo(-18, 0); ctx.lineTo(-8, 12); ctx.moveTo(8, -12); ctx.lineTo(18, 0); ctx.lineTo(8, 12); ctx.stroke(); ctx.restore();
    } else {
      const [skin, name, col] = CYCLE[cyc];
      // giant name behind the dancer
      ctx.save(); ctx.font = '400 250px Anton'; ctx.textAlign = 'center';
      const w = ctx.measureText(name).width, sc = Math.min(1, 980 / w);
      const k = E.outExpo(clamp((t - 25 - cyc * .5) / .25));
      ctx.translate(540, 1300); ctx.scale(sc * lerp(1.25, 1, k), sc * lerp(1.25, 1, k));
      ctx.globalAlpha = .9; ctx.lineWidth = 5; ctx.strokeStyle = S.rgba(col, .8); ctx.strokeText(name, 0, 0);
      ctx.fillStyle = S.rgba(col, .12); ctx.fillText(name, 0, 0); ctx.restore();
      dancer(ctx, t, skin, { rim: col });
    }
    ctx.restore();
    if (t < 25) {
      pill(ctx, 70, 1640 - 1640 + 270, 'ORIGINAL', { bg: 'rgba(0,0,0,.6)', border: 'rgba(255,255,255,.4)', alpha: clamp((t - 21.1) / .2) });
      pill(ctx, 1010, 270, 'MOCHA', { bg: C.cyan, color: C.ink, align: 'right', alpha: clamp((t - 21.1) / .2) });
      cap(ctx, t, 'Same dance.', 21.5, 24.7, { y: 420 });
      cap(ctx, t, '*New* *actor.*', 22.1, 24.7, { y: 520 });
    } else {
      cap(ctx, t, 'Any character.', 25.1, 26.85, { y: 400 });
      cap(ctx, t, 'Same *moves.*', 27.0, 28.85, { y: 400 });
    }
    fx.flash = decay(t, 21.0, .3) * .85 + (cyc >= 0 ? decay(t, 25 + cyc * .5, .12) * .45 : 0);
    fx.glitch = cyc >= 0 ? decay(t, 25 + cyc * .5, .12) * .7 : decay(t, 21.0, .15) * .6;
    fx.bloom = .85; fx.vig = .6;
    fx.ca = .0007 + (cyc >= 0 ? decay(t, 25 + cyc * .5, .15) * .006 : 0);
  }

  // 29-33: freeze frame
  function sFreeze(ctx, t, fx) {
    const lt = t - 29;
    const z = 1 + .14 * E.inOutCubic(clamp(lt / 4));
    ctx.save(); camera(ctx, { z, y: lt * 30 });
    drawSet(ctx, 29.0, { tint: '#ffa53d' });
    const blinkCat = win(t, 31.75, 31.9);
    dancer(ctx, 29.0, 'cat', { pose: RIG.MOVES.flamingo(RIG.beatAt(29.25)), rim: '#ffa53d', face: blinkCat ? 'o' : 'o', skinOpts: {} });
    ctx.restore();
    // freeze-frame treatment
    ctx.fillStyle = 'rgba(255,190,120,.06)'; ctx.fillRect(0, 0, W, H);
    // inset: the original
    if (t > 29.6) {
      const k = E.outBack(clamp((t - 29.6) / .4), 1.8);
      ctx.save(); ctx.translate(215, 1390); ctx.scale(k * .9, k * .9);
      ctx.fillStyle = '#0b0705'; ctx.beginPath(); ctx.arc(0, 0, 170, 0, TAU); ctx.fill();
      ctx.save(); ctx.beginPath(); ctx.arc(0, 0, 160, 0, TAU); ctx.clip(); miniSet(ctx, -170, -170, 340, 340);
      miniDave(ctx, 29.0, 0, 150, .5, 'dave', { pose: RIG.MOVES.flamingo(RIG.beatAt(29.25)), rim: '#ffb27a' });
      ctx.restore();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(0, 0, 164, 0, TAU); ctx.stroke();
      pill(ctx, 0, 190, 'ORIGINAL', { align: 'center', bg: '#fff', color: C.ink, font: '800 26px "JetBrains Mono"', h: 48 });
      ctx.restore();
    }
    cap(ctx, t, "It even copied *Dave's* *dancing.*", 29.3, 30.85, { y: 400 });
    serif(ctx, t, "Some things AI", 31.0, 32.9, { y: 380, size: 128 });
    serif(ctx, t, "can't fix.", 31.25, 32.9, { y: 510, size: 128, color: C.orange });
    // CRT off at the end handled by catch scene start
    fx.flash = decay(t, 29.0, .2) * .6;
    fx.bloom = .6; fx.vig = .75; fx.grain = .07; fx.warm = .8;
  }

  // 33-41: the catch
  function laptop(ctx, t, x, y, o = {}) {
    ctx.save(); ctx.translate(x, y); ctx.scale(1.4, 1.4);
    // screen
    ctx.fillStyle = '#26292f'; S.roundRect(ctx, -270, -360, 540, 350, 22); ctx.fill();
    ctx.fillStyle = '#05070a'; S.roundRect(ctx, -250, -342, 500, 314, 10); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.rect(-250, -342, 500, 314); ctx.clip();
    if (o.screen) o.screen(ctx);
    ctx.restore();
    // base
    const g = ctx.createLinearGradient(0, -10, 0, 40); g.addColorStop(0, '#c9ced6'); g.addColorStop(1, '#6d737c');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-300, -10); ctx.lineTo(300, -10); ctx.lineTo(340, 30); ctx.lineTo(-340, 30); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#4a4f57'; ctx.fillRect(-60, -10, 120, 8);
    ctx.restore();
  }
  let FROZEN = null;
  const SMOKE = document.createElement('canvas'); SMOKE.width = W / 4; SMOKE.height = H / 4;
  function sCatch(ctx, t, fx) {
    ctx.fillStyle = '#050505'; ctx.fillRect(0, 0, W, H);
    // CRT power-off of the frozen frame
    if (t < 33.4) {
      const k = inv(33.0, 33.35, t);
      if (!FROZEN) { FROZEN = document.createElement('canvas'); FROZEN.width = W; FROZEN.height = H; const fc = FROZEN.getContext('2d'); sFreeze(fc, 32.99, {}); }
      ctx.save(); ctx.translate(540, 960); ctx.scale(lerp(1, 1.15, k), Math.max(.004, 1 - E.inQuart(k)));
      ctx.drawImage(FROZEN, -540, -960);
      ctx.fillStyle = `rgba(255,245,230,${E.inCubic(k)})`; ctx.fillRect(-540, -960, W, H); ctx.restore();
      if (k > .8) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(540, 960, 30 * (1 - k) * 5, 0, TAU); ctx.fill(); }
    }
    cap(ctx, t, 'Okay. The *catch.*', 33.4, 34.05, { y: 900, size: 96 });
    // laptop
    if (t >= 34.15 && t < 37.0) {
      const lt = t - 34.15;
      const lift = Math.max(0, t - 35.6);
      const ly = 1150 - 1400 * lift * lift - 160 * lift;
      const heat = clamp(lt / 1.4);
      const sh = (heat * heat * 10 + (lift > 0 ? 8 : 0));
      const shx = noise1(t * 60) * sh, shy = noise1(t * 60 + 9) * sh;
      ctx.save(); ctx.translate(shx, shy);
      // flames + smoke
      if (lift > 0 || t > 35.45) {
        const fk = clamp((t - 35.45) / .2), base = ly + 44;
        // smoke: puffs are born under the laptop wherever it was, then billow out.
        // Drawn at quarter resolution and scaled up, which makes them soft.
        const sc4 = SMOKE.getContext('2d'); sc4.setTransform(1, 0, 0, 1, 0, 0); sc4.clearRect(0, 0, W / 4, H / 4); sc4.scale(.25, .25);
        for (let i = 0; i < 70; i++) {
          const born = 35.45 + (i / 70) * 1.4; if (t < born) continue;
          const a = t - born, bl = Math.max(0, born - 35.6), by = 1150 - 1400 * bl * bl - 160 * bl + 60;
          const dirx = (hash(i * 2.1) - .5) * 2, x = 540 + dirx * (120 + 520 * E.outCubic(clamp(a / 1.2))) , y = by + 60 + 260 * E.outCubic(clamp(a / 1.4)) + hash(i) * 40;
          const r = 50 + 190 * E.outCubic(clamp(a / 1.4));
          const sh = 120 + Math.floor(70 * hash(i * 5.5));
          sc4.fillStyle = `rgba(${sh},${sh - 6},${sh - 12},${Math.max(0, .5 - a * .3)})`; sc4.beginPath(); sc4.arc(x, y, r, 0, TAU); sc4.fill();
        }
        ctx.save(); ctx.imageSmoothingQuality = 'high'; ctx.drawImage(SMOKE, 0, 0, W, H); ctx.restore();
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        const glow = ctx.createRadialGradient(540, base + 60, 10, 540, base + 60, 420 * fk); glow.addColorStop(0, 'rgba(255,200,120,.55)'); glow.addColorStop(1, 'rgba(255,90,20,0)');
        ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(540, base + 60, 420 * fk, 0, TAU); ctx.fill();
        for (let i = 0; i < 9; i++) {
          const fxp = -320 + i * 80, fl = Math.floor(t * 30), wv = 26 + 14 * hash(i * 3 + fl);
          const len = (230 + 220 * hash(i + fl) + (i === 4 ? 120 : 0)) * fk;
          for (const [lw, c0, c1, lk] of [[1.6, 'rgba(255,120,30,.75)', 'rgba(255,40,10,0)', 1.15], [1, 'rgba(255,210,90,.9)', 'rgba(255,120,30,0)', .85], [.45, 'rgba(255,255,240,1)', 'rgba(255,230,160,0)', .5]]) {
            const L = len * lk, w = wv * lw;
            const g = ctx.createLinearGradient(0, base, 0, base + L); g.addColorStop(0, c0); g.addColorStop(1, c1);
            ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(540 + fxp - w, base);
            ctx.bezierCurveTo(540 + fxp - w, base + L * .4, 540 + fxp + Math.sin(t * 40 + i) * 10, base + L * .8, 540 + fxp + Math.sin(t * 33 + i) * 14, base + L);
            ctx.bezierCurveTo(540 + fxp + w * .3, base + L * .7, 540 + fxp + w, base + L * .4, 540 + fxp + w, base); ctx.fill();
          }
        }
        ctx.restore();
      }
      // heat shimmer + smoke wisps
      if (heat > .4 && lift === 0) {
        ctx.strokeStyle = `rgba(255,140,80,${(heat - .4) * .5})`; ctx.lineWidth = 6;
        for (let i = 0; i < 5; i++) { ctx.beginPath(); for (let s = 0; s < 10; s++) ctx.lineTo(300 + i * 120 + Math.sin(t * 9 + s + i) * 12, ly - 560 - s * 24); ctx.stroke(); }
      }
      const temp = Math.round(lerp(71, 99, heat));
      laptop(ctx, t, 540, ly, {
        screen: (c) => {
          c.font = '500 22px "JetBrains Mono"'; c.fillStyle = '#9cf59c'; c.textBaseline = 'top';
          const l1 = '$ python inference_mocha.py', n1 = Math.floor(clamp((lt - .1) / .5) * l1.length);
          c.fillText(l1.slice(0, n1), -232, -326);
          if (lt > .7) { c.fillStyle = '#e8e8e8'; c.fillText('loading Wan2.1-T2V-14B...', -232, -292); }
          if (lt > .9) {
            const pr = clamp((lt - .9) / 1.2) * .03;
            c.strokeStyle = '#e8e8e8'; c.lineWidth = 2; c.strokeRect(-232, -252, 420, 26);
            c.fillStyle = '#9cf59c'; c.fillRect(-229, -249, 414 * pr + 2, 20);
            c.fillStyle = '#e8e8e8'; c.fillText(`${(pr * 100).toFixed(1)}%`, 198, -250);
          }
          c.fillStyle = temp > 92 ? '#ff4d3d' : '#ffb84d'; c.font = '800 34px "JetBrains Mono"';
          c.fillText(`CPU ${temp}°C`, -232, -190);
          if (lt > 1.15 && Math.floor(t * 6) % 2) { c.fillStyle = '#ff3b30'; c.fillRect(-250, -120, 500, 70); c.fillStyle = '#fff'; c.font = '800 30px "JetBrains Mono"'; c.fillText('THERMAL STATUS: YES', -200, -100); }
        }
      });
      ctx.restore();
    }
    cap(ctx, t, 'It runs on a | *14-billion-parameter* | base model.', 34.2, 35.5, { y: 360, size: 74 });
    cap(ctx, t, 'Your laptop just | achieved *liftoff.*', 35.6, 36.9, { y: 360, size: 80 });
    // tiny clip with dimension lines
    if (t >= 37.0) {
      const k = E.outBack(clamp((t - 37.0) / .35), 1.5), dark = E.inOutCubic(inv(39.55, 39.8, t));
      const cw = 312, ch = 180, cx = 540 - cw / 2, cy = 860;
      ctx.save(); ctx.translate(540, cy + ch / 2); ctx.scale(k, k); ctx.translate(-540, -(cy + ch / 2));
      ctx.save(); ctx.beginPath(); ctx.rect(cx, cy, cw, ch); ctx.clip(); miniSet(ctx, cx, cy, cw, ch);
      miniDave(ctx, t, 540, cy + ch - 6, .27, 'robot', { rim: '#9df3ff' });
      if (dark > 0) { ctx.fillStyle = `rgba(0,0,0,${.85 * dark})`; ctx.fillRect(cx, cy, cw, ch); }
      ctx.restore();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.strokeRect(cx, cy, cw, ch);
      ctx.strokeStyle = C.cyan; ctx.fillStyle = C.cyan; ctx.lineWidth = 2; ctx.font = '800 28px "JetBrains Mono"'; ctx.textAlign = 'center';
      ctx.beginPath(); ctx.moveTo(cx, cy - 40); ctx.lineTo(cx + cw, cy - 40); ctx.moveTo(cx, cy - 52); ctx.lineTo(cx, cy - 28); ctx.moveTo(cx + cw, cy - 52); ctx.lineTo(cx + cw, cy - 28); ctx.stroke();
      ctx.fillText('832 px', 540, cy - 56);
      ctx.beginPath(); ctx.moveTo(cx + cw + 40, cy); ctx.lineTo(cx + cw + 40, cy + ch); ctx.moveTo(cx + cw + 28, cy); ctx.lineTo(cx + cw + 52, cy); ctx.moveTo(cx + cw + 28, cy + ch); ctx.lineTo(cx + cw + 52, cy + ch); ctx.stroke();
      ctx.save(); ctx.translate(cx + cw + 70, cy + ch / 2); ctx.rotate(Math.PI / 2); ctx.fillText('480 px', 0, 0); ctx.restore();
      // timeline
      const tp = ((t - 37.0) % 2.7) / 2.7;
      ctx.fillStyle = 'rgba(255,255,255,.2)'; ctx.fillRect(cx, cy + ch + 30, cw, 8); ctx.fillStyle = C.orange; ctx.fillRect(cx, cy + ch + 30, cw * tp, 8);
      ctx.fillStyle = '#fff'; ctx.textAlign = 'right'; ctx.fillText('2.7 s', cx + cw, cy + ch + 76);
      if (dark > 0) { // the robot's eye in the dark
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; const ex = 540, ey = cy + 62;
        const g = ctx.createRadialGradient(ex, ey, 0, ex, ey, 90 * dark); g.addColorStop(0, 'rgba(255,60,40,.95)'); g.addColorStop(1, 'rgba(255,60,40,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(ex, ey, 90 * dark, 0, TAU); ctx.fill(); ctx.restore();
      }
      ctx.restore();
    }
    cap(ctx, t, "Demo clips in the repo: | *2.7s* at *480p.*", 37.05, 38.5, { y: 420, size: 78 });
    serif(ctx, t, 'Relax, Hollywood.', 38.6, 39.5, { y: 1320, size: 130 });
    serif(ctx, t, '...for now.', 39.65, 41.0, { y: 1320, size: 150, color: C.red, shadow: 'rgba(255,40,30,.6)' });
    fx.glitch = decay(t, 39.65, .3) * .8 + E.inQuad(inv(40.7, 41.0, t)) * .8;
    fx.flash = decay(t, 35.6, .25) * .35;
    fx.bloom = .7; fx.vig = .65; fx.warm = .3;
    if (t > 39.6) { fx.ca = .002 + .003 * Math.abs(Math.sin(t * 9)); }
  }

  // 41-46: Dave is fine
  function cafe(ctx, t) {
    let g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#2a170d'); g.addColorStop(1, '#130a06');
    ctx.fillStyle = g; ctx.fillRect(-400, -400, W + 800, H + 800);
    for (let i = 0; i < 22; i++) {
      const x = hash(i * 2.2) * W, y = 120 + hash(i * 4.4) * 800, r = 30 + hash(i * 6.6) * 80, a = .08 + .14 * hash(i);
      const rg = ctx.createRadialGradient(x, y, 0, x, y, r); rg.addColorStop(0, `rgba(255,${150 + Math.floor(60 * hash(i * 9))},80,${a})`); rg.addColorStop(1, 'rgba(255,170,80,0)');
      ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(x + Math.sin(t * .5 + i) * 8, y, r, 0, TAU); ctx.fill();
    }
    // chalkboard
    ctx.save(); ctx.translate(60, 760); ctx.scale(.82, .82);
    ctx.fillStyle = '#6b4428'; S.roundRect(ctx, -16, -16, 352, 432, 14); ctx.fill();
    ctx.fillStyle = '#1d2420'; ctx.fillRect(0, 0, 320, 400);
    ctx.fillStyle = 'rgba(240,240,230,.85)'; ctx.font = 'italic 400 60px "Instrument Serif"'; ctx.fillText('Menu', 24, 70);
    ctx.font = '700 26px Inter';
    [['Mocha', '4.50'], ['Latte', '4.00'], ['Espresso', '3.00'], ["Dave's", 'dance'], ['special', 'free']].forEach(([a, b], i) => { ctx.fillText(a, 24, 136 + i * 52); ctx.textAlign = 'right'; ctx.fillText(b, 296, 136 + i * 52); ctx.textAlign = 'left'; });
    ctx.restore();
    // espresso machine
    ctx.save(); ctx.translate(900, 1080);
    g = ctx.createLinearGradient(-120, 0, 120, 0); g.addColorStop(0, '#5d636b'); g.addColorStop(.35, '#e8ecf0'); g.addColorStop(1, '#4b5058');
    ctx.fillStyle = g; S.roundRect(ctx, -130, -220, 260, 250, 18); ctx.fill();
    ctx.fillStyle = '#1b1d21'; ctx.fillRect(-90, -60, 180, 50); ctx.fillStyle = C.orange; ctx.beginPath(); ctx.arc(80, -170, 10, 0, TAU); ctx.fill();
    steam(ctx, t, 0, -230, .6, 3);
    ctx.restore();
  }
  function sOutro(ctx, t, fx) {
    const whip = E.inOutCubic(inv(44.95, 45.3, t));
    ctx.save(); ctx.translate(-whip * W * 1.1, 0);
    cafe(ctx, t);
    // Dave behind the counter
    const P = RIG.base();
    P.ra = .35; P.ra2 = -2.25; P.la = 2.45 + .28 * Math.sin(t * 9); P.la2 = .45 + .35 * Math.sin(t * 9 + 1); P.n = .08 * Math.sin(t * 2); P.face = 'happy';
    if (t > 42.6) { P.la = lerp(P.la, .3, clamp((t - 42.6) / .3)); P.la2 = lerp(P.la2, .3, clamp((t - 42.6) / .3)); P.face = 'smug'; }
    const d = { x: 560, fy: 1340 + RIG.FLOOR * 1.5, sc: 1.5 };
    const J = RIG.solve(P);
    ctx.save(); place(ctx, d.x, d.fy + 0, d.sc);
    SK.dave(ctx, J, { t, rim: '#ffb27a', afterTorso: (c, JJ) => RIG.inTorso(c, JJ, () => {
      c.fillStyle = '#3d2a20'; S.roundRect(c, -52, -132, 104, 150, 14); c.fill();
      c.strokeStyle = '#3d2a20'; c.lineWidth = 8; c.beginPath(); c.moveTo(-40, -130); c.lineTo(-30, -158); c.moveTo(40, -130); c.lineTo(30, -158); c.stroke();
      c.fillStyle = C.orange; c.font = '900 40px Inter'; c.textAlign = 'center'; c.fillText('M', 0, -64);
    }) });
    // the cup in his hand
    const h = J.rha;
    ctx.save(); ctx.translate(h[0] + 6, h[1] - 30);
    ctx.fillStyle = '#f7f2ea'; ctx.beginPath(); ctx.moveTo(-34, -50); ctx.lineTo(34, -50); ctx.lineTo(26, 46); ctx.lineTo(-26, 46); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#c58b55'; ctx.fillRect(-32, -18, 63, 34);
    ctx.fillStyle = '#3a2416'; ctx.font = '800 15px "JetBrains Mono"'; ctx.textAlign = 'center'; ctx.fillText('MOCHA', 0, 5);
    ctx.fillStyle = '#e9e1d4'; S.roundRect(ctx, -40, -62, 80, 16, 6); ctx.fill();
    ctx.restore();
    ctx.restore();
    steam(ctx, t, J.rha[0] * d.sc + d.x + 6, (J.rha[1] - RIG.FLOOR) * d.sc + d.fy - 140, .7, 3);
    // counter
    let g = ctx.createLinearGradient(0, 1300, 0, 1920); g.addColorStop(0, '#8a5a36'); g.addColorStop(.06, '#5c3a22'); g.addColorStop(1, '#2a180d');
    ctx.fillStyle = g; ctx.fillRect(-400, 1300, W + 800, 700);
    ctx.fillStyle = 'rgba(255,220,180,.35)'; ctx.fillRect(-400, 1300, W + 800, 6);
    ctx.fillStyle = 'rgba(0,0,0,.18)'; for (let x = -400; x < W + 400; x += 140) ctx.fillRect(x, 1340, 4, 600);
    ctx.restore();
    // CTA card
    if (t >= 43.3 && t < 45.3) {
      const k = E.outExpo(clamp((t - 43.3) / .4)), q = 1 - E.inCubic(inv(44.95, 45.2, t));
      ctx.save(); ctx.globalAlpha = q; ctx.translate(0, (1 - k) * -700 + 1080 - 1080 - 560);
      ctx.fillStyle = 'rgba(16,10,7,.92)'; S.roundRect(ctx, 70, 1080, 940, 300, 30); ctx.fill();
      ctx.strokeStyle = S.rgba(C.orange, .8); ctx.lineWidth = 4; ctx.stroke();
      // repo glyph
      ctx.strokeStyle = C.cream; ctx.lineWidth = 6; S.roundRect(ctx, 112, 1130, 64, 80, 8); ctx.stroke(); ctx.beginPath(); ctx.moveTo(126, 1150); ctx.lineTo(162, 1150); ctx.moveTo(126, 1170); ctx.lineTo(162, 1170); ctx.stroke();
      ctx.fillStyle = C.cream; ctx.font = '800 50px Inter'; ctx.fillText('Orange-3DV-Team/MoCha', 200, 1188);
      ctx.fillStyle = 'rgba(244,230,207,.7)'; ctx.font = '500 25px "JetBrains Mono"'; ctx.fillText('github · arXiv 2601.08587 · CVPR 2026', 112, 1270);
      ctx.fillStyle = C.orange; ctx.font = '800 25px "JetBrains Mono"'; ctx.fillText('INFERENCE CODE + COMFYUI WORKFLOW', 112, 1320);
      ctx.restore();
    }
    // loop bridge: back to the opening shot
    if (whip > 0) { ctx.save(); ctx.translate(W * 1.1 * (1 - whip), 0); sIntro(ctx, t, fx); ctx.restore(); }
    if (whip < 1) {
      cap(ctx, t, "Dave's fine, | by the way.", 41.3, 42.5, { y: 400 });
      cap(ctx, t, 'He makes *mochas* now.', 42.6, 43.25, { y: 400 });
      cap(ctx, t, 'Follow before you | get *replaced* too.', 44.0, 44.95, { y: 330, size: 74 });
    }
    fx.dirBlur = [Math.sin(whip * Math.PI) * .08, 0];
    fx.bloom = .6; fx.vig = .55; fx.warm = .7;
    fx.flash = decay(t, 41.0, .25) * .3;
  }

  const SCENES = [
    [0, 3, sIntro], [3, 5, sDrop], [5, 9, sTitle], [9, 15, sOld], [15, 19.35, sNeeds], [19.35, 21, sTokens],
    [21, 29, sReveal], [29, 33, sFreeze], [33, 41, sCatch], [41, 46, sOutro],
  ];

  window.EP = {
    duration: CU.duration,
    init() { initTitle(); },
    draw(ctx, t, fx) {
      const sc = SCENES.find(s => t >= s[0] && t < s[1]) || SCENES[SCENES.length - 1];
      sc[2](ctx, t, fx);
      // global grade defaults
      fx.grain = fx.grain ?? .055;
    },
  };
  SHORT.boot(window.EP);
})();
