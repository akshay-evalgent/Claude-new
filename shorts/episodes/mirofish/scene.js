/* MiroFish: "He wanted 1,000 stars."
 * 48 s vertical short about 666ghj/MiroFish, a multi-agent "predict anything" engine.
 * Real footage (Coverr, public-domain scans, the live MiroFish demo, the GitHub page)
 * is cut with coded animation. Timings live in cues.js and drive the score too.
 */
(function () {
  const S = SHORT, K = KIT, { W, H, TAU, clamp, lerp, inv, E, ease, hash, noise1 } = S;
  const { decay, win, shake, camera, fmt, cap, serif, pill, browser, lightLeak, ring } = K;
  const C = { bg: '#05070c', blue: '#3d8bff', cyan: '#4cd5ff', gold: '#ffc94d', red: '#ff4d5e', orange: '#ff8a3d', paper: '#f6f1e7', ink: '#0b0d12', gh: '#161b22', ghb: '#30363d' };
  K.THEME.hl = C.gold;
  const ST = k => S.img(window.STILLS[k]);
  const CL = (n, t, o) => S.clip(n, t, o);
  const CJK = '"WenQuanYi Zen Hei"';

  function full(ctx, img, z = 1, fx = .5, fy = .5, a = 1) { if (!img) return; ctx.save(); ctx.globalAlpha = a; S.cover(ctx, img, 0, 0, W, H, { zoom: z, fx, fy }); ctx.restore(); }
  function dim(ctx, a, col = '3,5,10') { ctx.fillStyle = `rgba(${col},${a})`; ctx.fillRect(-200, -200, W + 400, H + 400); }
  function bgTech(ctx, t, tint = '#12284d', a = 1) {
    const g = ctx.createRadialGradient(540, 820, 50, 540, 960, 1300);
    g.addColorStop(0, tint); g.addColorStop(1, C.bg);
    ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = g; ctx.fillRect(-200, -200, W + 400, H + 400);
    ctx.fillStyle = 'rgba(140,180,255,.07)';
    const off = (t * 18) % 60;
    for (let y = -60 + off; y < H + 60; y += 60) for (let x = 30; x < W; x += 60) ctx.fillRect(x, y, 3, 3);
    ctx.restore();
  }
  function label(ctx, text, x, y, o = {}) { pill(ctx, x, y, text, Object.assign({ font: '800 24px "JetBrains Mono"', bg: 'rgba(8,12,20,.78)', border: 'rgba(255,255,255,.18)', h: 46 }, o)); }

  // ---------------------------------------------------------------- the swarm (closed-form, so any frame renders alone)
  const NA = 820; let AG = null, TREE = null, CHOSEN = null;
  function initSwarm() {
    const r = S.rng(42); AG = [];
    for (let i = 0; i < NA; i++) {
      const c = Math.floor(r() * 5);
      AG.push({ c, ph: r() * TAU, sp: .25 + r() * .6, rad: 40 + Math.pow(r(), .7) * 230, op: r() < .72 ? 0 : 1, flip: 17.6 + r() * 3.2, sz: 4 + r() * 5, link: 0, post: r() * 10 });
    }
    for (let i = 0; i < NA; i++) { let j = Math.floor(r() * NA); for (let k = 0; k < 12 && AG[j].c !== AG[i].c; k++) j = Math.floor(r() * NA); AG[i].link = j; }
  }
  function center(c, t) { const a = c / 5 * TAU + t * .12; const R = c === 0 ? 0 : 300; return [Math.cos(a) * R, Math.sin(a) * R * 1.55]; }
  function agentPos(i, t) {
    const a = AG[i], cc = center(a.c, t);
    return [540 + cc[0] + Math.cos(a.ph + a.sp * t) * a.rad + noise1(i * 1.7 + t * .6) * 26, 980 + cc[1] + Math.sin(a.ph * 1.3 + a.sp * t * .8) * a.rad * 1.2 + noise1(i * 3.1 + t * .5) * 26];
  }
  function opinion(i, t, shock) {
    const a = AG[i]; let o = a.op;
    if (t > a.flip && hash(i * 9.3) < .3) o = 1 - o;
    return o;
  }
  /* opts: shock {t0, x, y} */
  function drawSwarm(ctx, t, o = {}) {
    const pos = new Array(NA), col = new Array(NA);
    for (let i = 0; i < NA; i++) {
      let p = agentPos(i, t), op = opinion(i, t);
      if (o.shock) {
        const dx = p[0] - o.shock.x, dy = p[1] - o.shock.y, d = Math.hypot(dx, dy) || 1, ta = o.shock.t0 + d / 1700;
        if (t > ta) { const k = Math.exp(-(t - ta) * 3.2) * 150; p = [p[0] + dx / d * k, p[1] + dy / d * k]; op = lerp(op, 1, clamp((t - ta) / .25) * (hash(i * 4.7) < .85 ? 1 : 0)); }
      }
      pos[i] = p; col[i] = op;
    }
    const alpha = o.alpha ?? 1;
    ctx.save(); ctx.globalAlpha = alpha;
    ctx.lineWidth = 1.4;
    for (let i = 0; i < NA; i += 1) {
      const j = AG[i].link, a = pos[i], b = pos[j];
      if (Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) > 520) continue;
      ctx.strokeStyle = col[i] > .5 ? 'rgba(255,138,61,.13)' : 'rgba(76,141,255,.14)';
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    }
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < NA; i += 3) { // messages travelling along links
      const j = AG[i].link, a = pos[i], b = pos[j], s = (t * .9 + hash(i * 2.2)) % 1;
      if (Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) > 520) continue;
      ctx.fillStyle = col[i] > .5 ? 'rgba(255,190,120,.9)' : 'rgba(150,200,255,.9)';
      ctx.fillRect(lerp(a[0], b[0], s) - 2, lerp(a[1], b[1], s) - 2, 4, 4);
    }
    ctx.globalCompositeOperation = 'source-over';
    for (let i = 0; i < NA; i++) {
      const p = pos[i], c = col[i], A = AG[i];
      const r = Math.round(lerp(76, 255, c)), g = Math.round(lerp(141, 138, c)), bl = Math.round(lerp(255, 61, c));
      ctx.fillStyle = `rgb(${r},${g},${bl})`; ctx.beginPath(); ctx.arc(p[0], p[1], A.sz, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1.5; ctx.stroke();
      const pt = (t * .7 + A.post) % 4; // occasional "posting" bubble
      if (i % 23 === 0 && pt < .45) {
        const k = Math.sin(pt / .45 * Math.PI);
        ctx.globalAlpha = alpha * k; ctx.fillStyle = '#fff'; S.roundRect(ctx, p[0] + 8, p[1] - 34, 46, 24, 10); ctx.fill();
        ctx.fillStyle = C.ink; for (let d = 0; d < 3; d++) { ctx.beginPath(); ctx.arc(p[0] + 20 + d * 11, p[1] - 22, 3, 0, TAU); ctx.fill(); }
        ctx.globalAlpha = alpha;
      }
    }
    ctx.restore();
  }

  // ---------------------------------------------------------------- futures tree
  function initTree() {
    const r = S.rng(7); TREE = [];
    const grow = (x, y, a, len, d, parent) => {
      const x2 = x + Math.sin(a) * len, y2 = y - Math.cos(a) * len;
      const id = TREE.length; TREE.push({ x, y, x2, y2, d, parent });
      if (d >= 10) return;
      const n = d < 2 ? 3 : 2;
      for (let k = 0; k < n; k++) {
        const spread = (k - (n - 1) / 2) * (.42 + r() * .3) + (r() - .5) * .3;
        grow(x2, y2, a * .75 + spread, len * (.84 + r() * .08), d + 1, id);
      }
    };
    grow(540, 1640, 0, 200, 0, -1);
    // chosen path: walk from a deterministic leaf back to the root
    let leaf = TREE.length - 1; for (let i = TREE.length - 1; i >= 0; i--) if (TREE[i].d === 10 && Math.abs(TREE[i].x2 - 600) < 90 && TREE[i].y2 < 420) { leaf = i; break; }
    CHOSEN = new Set(); for (let i = leaf; i >= 0; i = TREE[i].parent) CHOSEN.add(i);
  }

  // ---------------------------------------------------------------- scenes
  function starButton(ctx, x, y, v, o = {}) {
    const w = 640, h = 118;
    ctx.save(); ctx.translate(x, y); ctx.scale(o.s || 1, o.s || 1);
    ctx.fillStyle = C.gh; ctx.strokeStyle = C.ghb; ctx.lineWidth = 4; S.roundRect(ctx, -w / 2, -h / 2, w, h, 22); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-w / 2 + 300, -h / 2); ctx.lineTo(-w / 2 + 300, h / 2); ctx.stroke();
    const gold = o.gold || 0;
    ctx.save(); ctx.translate(-w / 2 + 70, 0); ctx.scale(1 + gold * .25, 1 + gold * .25);
    ctx.beginPath(); for (let k = 0; k < 10; k++) { const a = k / 10 * TAU - Math.PI / 2, rr = k % 2 ? 15 : 34; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } ctx.closePath();
    if (gold > .01) { ctx.fillStyle = S.rgba(C.gold, gold); ctx.fill(); }
    ctx.strokeStyle = gold > .5 ? C.gold : '#c9d1d9'; ctx.lineWidth = 4; ctx.stroke(); ctx.restore();
    ctx.fillStyle = '#e6edf3'; ctx.font = '700 54px Inter'; ctx.textBaseline = 'middle'; ctx.fillText('Star', -w / 2 + 125, 3);
    ctx.font = '400 74px Anton'; ctx.textAlign = 'center'; ctx.fillStyle = gold > .5 ? C.gold : '#e6edf3';
    ctx.fillText(fmt(v), -w / 2 + 300 + 170, 6);
    ctx.restore();
  }
  function sIntro(ctx, t, fx) {
    const lt = Math.max(0, t);
    const z = 1 + .06 * E.inOutQuad(clamp(lt / 3));
    if (lt < 1.6) full(ctx, CL('code', lt), z, .5, .45);
    else { full(ctx, CL('typing', lt - 1.6), 1.04 + .05 * (lt - 1.6), .5, .55); if (lt < 1.8) full(ctx, CL('code', lt), z, .5, .45, 1 - (lt - 1.6) / .2); }
    dim(ctx, .2);
    // counter: 0 -> 1,000 (the goal), then it keeps going
    let v;
    if (lt < .3) v = 0; else if (lt < 1.9) v = 1000 * E.inOutCubic((lt - .3) / 1.6);
    else if (lt < 2.1) v = 1000; else v = Math.min(83686, 1000 * Math.pow(83.686, E.inQuad(clamp((lt - 2.1) / .9))));
    const gold = clamp((lt - 1.9) / .12);
    const [sx, sy] = lt > 2.1 ? [noise1(lt * 50) * 6 * (lt - 2.1), noise1(lt * 50 + 7) * 6 * (lt - 2.1)] : [0, 0];
    starButton(ctx, 540 + sx, 330 + sy, v, { gold, s: 1 + .06 * decay(lt, 1.9, .3) });
    // goal bar, which overflows its box once the count passes 1,000
    const bx = 220, by = 430, bw = 640;
    ctx.save(); ctx.fillStyle = 'rgba(255,255,255,.12)'; S.roundRect(ctx, bx, by, bw, 18, 9); ctx.fill();
    const prog = v / 1000; const pw = bw * Math.min(prog, 1) + (prog > 1 ? Math.min(2400, (prog - 1) * 12) : 0);
    const g = ctx.createLinearGradient(bx, 0, bx + bw, 0); g.addColorStop(0, '#2ea043'); g.addColorStop(1, prog > 1 ? C.gold : '#3fb950');
    ctx.fillStyle = g; ctx.shadowColor = prog > 1 ? C.gold : 'transparent'; ctx.shadowBlur = prog > 1 ? 25 : 0;
    S.roundRect(ctx, bx, by, Math.max(18, pw), 18, 9); ctx.fill(); ctx.restore();
    ctx.save(); ctx.font = '800 26px "JetBrains Mono"'; ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.textAlign = 'left';
    ctx.fillText('GOAL: 1,000 ★', bx, by + 56);
    if (lt > 1.92) { ctx.fillStyle = '#3fb950'; ctx.textAlign = 'right'; ctx.globalAlpha = clamp((lt - 1.92) / .1); ctx.fillText('REACHED ✓', bx + bw, by + 56); }
    ctx.restore();
    if (t >= 0 && t < 3) {
      cap(ctx, t, 'A college senior', .12, 2.55, { y: 880 });
      cap(ctx, t, 'hoped for *1,000* | GitHub stars.', .5, 2.55, { y: 1040 });
    }
    fx.bloom = .7; fx.vig = .65; fx.grain = .07;
    fx.zoomBlur = E.inQuad(inv(2.7, 3.0, t)) * .25; fx.glitch = decay(t, 2.92, .08) * .6;
  }

  function starBurst(ctx, t, x, y, t0) {
    const u = t - t0; if (u < 0 || u > 1.4) return;
    const r = S.rng(77);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 70; i++) {
      const a = r() * TAU, sp = 300 + r() * 900, d = sp * E.outCubic(clamp(u / 1.2)), g = 380 * u * u;
      const px = x + Math.cos(a) * d, py = y + Math.sin(a) * d * .8 + g, s = (6 + r() * 14) * (1 - u / 1.4);
      ctx.fillStyle = r() > .3 ? C.gold : '#fff';
      ctx.save(); ctx.translate(px, py); ctx.rotate(u * 6 + i);
      ctx.beginPath(); for (let k = 0; k < 10; k++) { const aa = k / 10 * TAU, rr = k % 2 ? s * .45 : s; ctx.lineTo(Math.cos(aa) * rr, Math.sin(aa) * rr); } ctx.closePath(); ctx.fill(); ctx.restore();
    }
    ctx.restore();
  }
  function sStars(ctx, t, fx) {
    const lt = t - 3, [sx, sy] = shake(t, 3.0, 24, .45);
    const out = E.inExpo(inv(4.75, 5.0, t));
    ctx.save(); camera(ctx, { x: sx, y: sy - out * 300, z: 1 + out * .3 });
    bgTech(ctx, t, '#1d2c4f');
    const k = E.outBack(clamp(lt / .5), 1.2);
    const map = browser(ctx, ST('gh_repo'), { key: 'gh', cx: 540, cy: 580, w: 880, crop: [1940, 350, 920, 900], ry: lerp(-.55, -.1, k), rx: lerp(.25, .04, k), url: 'github.com/666ghj/MiroFish', alpha: clamp(lt / .15) });
    if (map && lt > .25) { const p = map(2544, 403); ring(ctx, p[0], p[1], 150, 58, (lt - .25) / .3, C.gold); }
    const v = lerp(79000, 83686, E.outCubic(clamp(lt / .4)));
    ctx.save(); ctx.translate(540, 1290); const ps = 1 + .25 * decay(lt, 0, .35); ctx.scale(ps, ps);
    ctx.font = '400 250px Anton'; ctx.textAlign = 'center'; ctx.fillStyle = C.gold; ctx.shadowColor = 'rgba(255,201,77,.7)'; ctx.shadowBlur = 60;
    ctx.fillText(fmt(v), 0, 0); ctx.restore();
    starBurst(ctx, t, 540, 1220, 3.0);
    ctx.restore();
    cap(ctx, t, 'His next project | got *83,686.*', 3.25, 4.7, { y: 1500, size: 84 });
    fx.flash = decay(t, 3.0, .3) * .75; fx.bloom = .75; fx.vig = .6;
    fx.zoomBlur = out * .5; fx.ca = .0008 + decay(t, 3.0, .3) * .006;
  }

  function sMoney(ctx, t, fx) {
    const lt = t - 5;
    full(ctx, CL('coins', lt), 1.1 + .04 * lt, .5, .5);
    dim(ctx, .42); lightLeak(ctx, t, C.gold, .9, 3);
    const v = 30000000 * E.outExpo(clamp((lt - .05) / .75));
    ctx.save(); ctx.translate(540, 870); const s = 1 + .15 * decay(lt, .05, .3); ctx.scale(s, s);
    ctx.font = '400 168px Anton'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.shadowColor = 'rgba(255,201,77,.8)'; ctx.shadowBlur = 50;
    ctx.fillText('¥' + fmt(v), 0, 0); ctx.restore();
    ctx.save(); ctx.globalAlpha = clamp((lt - .7) / .3); ctx.font = '800 34px "JetBrains Mono"'; ctx.fillStyle = C.gold; ctx.textAlign = 'center';
    ctx.fillText('≈ US$4.2 MILLION', 540, 950); ctx.restore();
    cap(ctx, t, 'in backing from | a *billionaire.*', 5.25, 6.35, { y: 1160, size: 82 });
    ctx.save(); ctx.globalAlpha = clamp((lt - .6) / .3) * (1 - clamp((lt - 1.35) / .2)) * .8; ctx.font = '500 25px "JetBrains Mono"'; ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
    ctx.fillText('Shanda founder Chen Tianqiao · reported by 36Kr, TMTPost', 540, 1330); ctx.restore();
    cap(ctx, t, 'For *this.*', 6.45, 6.95, { y: 1160, size: 110 });
    fx.flash = decay(t, 5.0, .2) * .4; fx.bloom = .9; fx.warm = .8; fx.vig = .7;
  }

  // logo mirror geometry in logo.jpg (7616 x 2240)
  const MIR = { x: 2190, y: 1111, rx: 800, ry: 975 };
  function miniFish(ctx, x, y, a, s, col) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.scale(s, s); ctx.fillStyle = col;
    ctx.beginPath(); ctx.ellipse(0, 0, 16, 6, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-12, 0); ctx.lineTo(-24, -7); ctx.lineTo(-24, 7); ctx.closePath(); ctx.fill(); ctx.restore();
  }
  function sReveal(ctx, t, fx) {
    const lt = t - 7;
    const g = ctx.createRadialGradient(540, 860, 40, 540, 900, 1200); g.addColorStop(0, '#16305c'); g.addColorStop(1, C.bg);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const k = E.outBack(clamp(lt / .55), 1.3);
    const zoom = E.inExpo(inv(8.2, 9.0, t));
    // where will the mirror be on screen? (card is drawn untilted after it lands)
    const cw = 1000, sc = cw / 7616, cx = 540, cy = 860, ch = 2240 * sc;
    const mx = cx - cw / 2 + MIR.x * sc, my = cy - ch / 2 + MIR.y * sc;
    ctx.save();
    if (zoom > 0) { const z = 1 + zoom * 14; ctx.translate(mx, my); ctx.scale(z, z); ctx.translate(-mx, -my); }
    browser(ctx, ST('logo'), { key: 'logo', cx, cy, w: cw, bar: false, radius: 36, ry: lerp(.6, 0, k), rx: lerp(-.3, 0, k), alpha: clamp(lt / .12), shadow: zoom < .2 });
    // the school inside the mirror comes alive
    if (lt > .45) {
      ctx.save(); ctx.beginPath(); ctx.ellipse(mx, my, MIR.rx * sc * .93, MIR.ry * sc * .93, 0, 0, TAU); ctx.clip();
      if (zoom > .15) { const fimg = CL('fish', 0); if (fimg) { ctx.globalAlpha = clamp((zoom - .15) / .35); ctx.drawImage(fimg, mx - MIR.rx * sc, my - MIR.ry * sc, MIR.rx * sc * 2, MIR.ry * sc * 2); ctx.globalAlpha = 1; } }
      for (let i = 0; i < 46; i++) {
        const a = t * 1.3 + i * .37, rr = 18 + (i % 7) * 11;
        const x = mx + Math.cos(a) * rr * 1.1 + noise1(i + t) * 6, y = my + Math.sin(a * 1.2) * rr * 1.45;
        miniFish(ctx, x, y, a + Math.PI / 2, .55 + (i % 3) * .12, i % 4 ? 'rgba(52,110,190,.85)' : 'rgba(120,180,240,.9)');
      }
      ctx.restore();
    }
    ctx.restore();
    cap(ctx, t, 'He built *MiroFish.*', 7.2, 8.15, { y: 1180, size: 96 });
    fx.zoomBlur = zoom * .45; fx.flash = decay(t, 7.0, .2) * .35 + zoom * zoom * .3; fx.bloom = .7;
  }

  function sFish(ctx, t, fx) {
    const lt = t - 9;
    full(ctx, CL('fish', lt + .4), 1.14 - .05 * lt, .5, .5);
    dim(ctx, .18);
    ctx.save(); ctx.strokeStyle = C.cyan; ctx.lineWidth = 4;
    for (let i = 0; i < 7; i++) {
      const on = clamp((lt - .2 - i * .12) / .15); if (!on) continue;
      const x = 540 + 360 * noise1(i * 13.1 + t * .35), y = 1050 + 560 * noise1(i * 7.3 + t * .3 + 4), s = 70 + (i % 3) * 22;
      ctx.globalAlpha = on * .9;
      for (const [dx, dy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { ctx.beginPath(); ctx.moveTo(x + dx * s, y + dy * s * .6); ctx.lineTo(x + dx * s, y + dy * (s * .6 - 18)); ctx.moveTo(x + dx * s, y + dy * s * .6); ctx.lineTo(x + dx * (s - 18), y + dy * s * .6); ctx.stroke(); }
      label(ctx, `agent_${String(Math.floor(hash(i * 3.7) * 9000) + 1000)}`, x - s, y - s * .6 - 28, { font: '800 20px "JetBrains Mono"', h: 36, bg: S.rgba(C.cyan, .9), color: C.ink, border: null, alpha: on });
    }
    ctx.restore();
    cap(ctx, t, 'An AI that simulates | *thousands* of people', 9.15, 10.85, { y: 560, size: 80 });
    cap(ctx, t, 'to predict the *future.*', 9.95, 10.85, { y: 760, size: 80 });
    fx.flash = decay(t, 9.0, .25) * .5; fx.bloom = .6; fx.vig = .6;
  }

  const SEEDS = [['📰', 'BREAKING NEWS'], ['📜', 'POLICY DRAFT'], ['📈', 'EARNINGS REPORT'], ['📖', 'A NOVEL']];
  function sSeeds(ctx, t, fx) {
    const lt = t - 11;
    bgTech(ctx, t, '#173062');
    const k = E.outCubic(clamp(lt / .5));
    const map = browser(ctx, ST('console'), { key: 'console', cx: 540, cy: 1000, w: 1000, crop: [1270, 560, 1110, 650], ry: lerp(.3, .06, k), rx: .05, url: 'mirofish · console', shade: .04, glow: 'rgba(76,213,255,.25)' });
    const target = map ? map(1800, 630) : [540, 900];
    SEEDS.forEach(([ic, name], i) => {
      const t0 = 11.12 + i * .2, u = clamp((t - t0) / .55); if (t < t0) return;
      const e = E.inCubic(u), sx = 170 + i * 250, sy = 560 + (i % 2) * 60;
      const x = lerp(sx, target[0], e), y = lerp(sy - (1 - clamp(u * 4)) * 700, target[1], e), rot = (1 - e) * (i % 2 ? .4 : -.4), s = lerp(.95, .2, e);
      if (u >= 1) { const f = decay(t, t0 + .55, .25); if (f) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = S.rgba(C.cyan, f * .6); ctx.beginPath(); ctx.arc(target[0], target[1], 120 * (1 - f) + 30, 0, TAU); ctx.fill(); ctx.restore(); } return; }
      ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
      ctx.fillStyle = C.paper; ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 30; S.roundRect(ctx, -150, -100, 300, 200, 16); ctx.fill(); ctx.shadowBlur = 0;
      ctx.font = `64px "Noto Color Emoji"`; ctx.textAlign = 'center'; ctx.fillText(ic, 0, -14);
      ctx.fillStyle = C.ink; ctx.font = '800 26px "JetBrains Mono"'; ctx.fillText(name, 0, 62);
      ctx.restore();
    });
    cap(ctx, t, 'Step 1: feed it *anything.*', 11.1, 12.9, { y: 330, size: 80 });
    if (lt > .9) {
      const str = '"What would public opinion look like if…"';
      ctx.save(); ctx.fillStyle = 'rgba(8,12,20,.82)'; S.roundRect(ctx, 70, 1400, 940, 92, 20); ctx.fill(); ctx.strokeStyle = 'rgba(76,213,255,.4)'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
      S.typewriter(ctx, '> ' + str, { x: 100, y: 1447, t: lt - .9, dur: .9, font: '500 30px "JetBrains Mono"', color: '#bfe9ff' });
    }
    fx.bloom = .3; fx.vig = .55;
  }

  function sGraph(ctx, t, fx) {
    const lt = t - 13;
    bgTech(ctx, t, '#10203f');
    const img = CL('graph', lt, { from: 2.4, speed: 10.6 });
    const z = 1 + .06 * lt;
    browser(ctx, img, { key: 'graph', cx: 540, cy: 1000 - lt * 10, w: 1000 * z, crop: [0, 170, 1440, 1630], bar: false, radius: 30, rx: lerp(.12, 0, E.outCubic(clamp(lt / .6))), glow: 'rgba(76,213,255,.3)' });
    const p = clamp(lt / 1.8);
    const ent = Math.round(lerp(20, 132, E.inOutQuad(p))), rel = Math.round(lerp(25, 222, E.inOutQuad(p)));
    pill(ctx, 90, 1530, `ENTITIES ${ent}`, { font: '800 34px "JetBrains Mono"', bg: S.rgba(C.blue, .95), h: 66 });
    pill(ctx, 990, 1530, `RELATIONSHIPS ${rel}`, { font: '800 34px "JetBrains Mono"', bg: 'rgba(255,255,255,.95)', color: C.ink, h: 66, align: 'right' });
    cap(ctx, t, 'Step 2: it maps every | person and *connection.*', 13.15, 14.9, { y: 300, size: 76 });
    fx.glitch = decay(t, 13.0, .15) * .7; fx.bloom = .3; fx.vig = .55;
  }

  function sAgents(ctx, t, fx) {
    const lt = t - 15;
    bgTech(ctx, t, '#1a1f45');
    const img = CL('env', lt, { from: 2.0, speed: 4.2 });
    const k = E.outCubic(clamp(lt / .5));
    const map = browser(ctx, img, { key: 'env', cx: 540, cy: 980, w: 1000, crop: [1500, 340, 1260, 1040], ry: lerp(-.4, -.08, k), rx: .05, url: 'step 2/5 · env setup', shade: .03 });
    if (map && lt > .35) { const a = map(1540, 920), b = map(2360, 1340); ctx.save(); ctx.strokeStyle = C.gold; ctx.lineWidth = 5; ctx.shadowColor = C.gold; ctx.shadowBlur = 18; ctx.globalAlpha = clamp((lt - .35) / .2); S.roundRect(ctx, a[0] - 8, a[1] - 8, b[0] - a[0] + 16, b[1] - a[1] + 16, 16); ctx.stroke(); ctx.restore(); }
    cap(ctx, t, 'Step 3: each one becomes | an *AI agent.*', 15.1, 16.9, { y: 300, size: 76 });
    [['PERSONALITY', 15.5], ['MEMORY', 15.9], ['OPINIONS', 16.3]].forEach(([s, at], i) => {
      if (t < at) return; const e = E.outBack(clamp((t - at) / .3), 2);
      ctx.save(); ctx.translate(200 + i * 340, 1560); ctx.scale(e, e);
      pill(ctx, 0, 0, s + ' ✓', { font: '800 30px "JetBrains Mono"', bg: i === 1 ? C.gold : 'rgba(255,255,255,.95)', color: C.ink, align: 'center', h: 64 });
      ctx.restore();
    });
    fx.bloom = .25; fx.vig = .55;
  }

  const BUBBLES = [['this is a disaster 😤', 20.15, 200, 1150], ['honestly? fair.', 20.35, 640, 1040], ['source??', 20.55, 300, 900], ['ratio.', 20.72, 720, 820]];
  function sSwarm(ctx, t, fx) {
    const lt = t - 17;
    if (t < 19.3) {
      ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
      ctx.save(); const z = lerp(1.9, 1.0, E.inOutCubic(clamp(lt / 1.9))); camera(ctx, { z, cy: 20 });
      drawSwarm(ctx, t); ctx.restore();
    }
    if (t >= 18.9 && t < 20.05) {
      const a = clamp((t - 18.9) / .35);
      full(ctx, CL('crowd', t - 18.9), 1.06 + .05 * (t - 18.9), .5, .5, a); dim(ctx, .3 * a);
      if (t < 19.6) { ctx.save(); ctx.globalAlpha = 1 - clamp((t - 19.0) / .6); drawSwarm(ctx, t, { alpha: 1 - clamp((t - 19.0) / .6) }); ctx.restore(); }
    }
    if (t >= 20.05) {
      full(ctx, CL('phone2', t - 20.05), 1.08, .5, .55); dim(ctx, .25);
      for (const [txt, at, x, y] of BUBBLES) {
        if (t < at) continue; const u = t - at, e = E.outBack(clamp(u / .25), 2);
        ctx.save(); ctx.translate(x, y - u * 60); ctx.scale(e, e);
        ctx.font = '700 36px Inter, "Noto Color Emoji"'; const w = ctx.measureText(txt).width + 100;
        ctx.fillStyle = '#fff'; ctx.shadowColor = 'rgba(0,0,0,.4)'; ctx.shadowBlur = 20; S.roundRect(ctx, -10, -36, w, 72, 36); ctx.fill(); ctx.shadowBlur = 0;
        ctx.fillStyle = [C.blue, C.orange, '#9b6bff', '#2ea043'][BUBBLES.findIndex(b => b[0] === txt)]; ctx.beginPath(); ctx.arc(22, 0, 18, 0, TAU); ctx.fill();
        ctx.fillStyle = C.ink; ctx.textBaseline = 'middle'; ctx.fillText(txt, 54, 2); ctx.restore();
      }
    }
    cap(ctx, t, 'Thousands of them.', 17.1, 18.85, { y: 380 });
    cap(ctx, t, 'Posting. Arguing. | *Changing their minds.*', 17.75, 18.85, { y: 540 });
    cap(ctx, t, 'Basically the internet…', 19.15, 20.95, { y: 380 });
    serif(ctx, t, 'in a box.', 19.75, 20.95, { y: 530, size: 130 });
    fx.bloom = t < 19 ? .9 : .5; fx.vig = .6;
    fx.flash = decay(t, 20.05, .12) * .3;
  }

  // sim capture regions (2880x1800)
  function sSim(ctx, t, fx) {
    const lt = t - 21, [sx, sy] = shake(t, 21.0, 20, .4);
    ctx.save(); camera(ctx, { x: sx, y: sy });
    bgTech(ctx, t, '#1b2a55');
    const img = CL('sim', lt, { from: 4.0, speed: 4.0 });
    const k = E.outBack(clamp(lt / .5), 1.1);
    const map = browser(ctx, img, { key: 'sim', cx: 540, cy: 1000, w: 1010, crop: SIMCROP, ry: lerp(.5, .08, k), rx: .06, url: 'step 3/5 · simulation', glow: 'rgba(255,201,77,.25)' });
    if (map && lt > .45) {
      const a = map(SIMLAB[0][0], SIMLAB[0][1]), b = map(SIMLAB[1][0], SIMLAB[1][1]);
      label(ctx, '≈ TWITTER', a[0], a[1] + 78, { bg: C.blue, border: null, align: 'center', alpha: clamp((lt - .45) / .15) });
      label(ctx, '≈ REDDIT', b[0], b[1] + 78, { bg: C.orange, border: null, align: 'center', color: C.ink, alpha: clamp((lt - .6) / .15) });
    }
    ctx.restore();
    cap(ctx, t, 'Two simulated social | networks, *running at once.*', 21.15, 22.9, { y: 300, size: 76 });
    fx.flash = decay(t, 21.0, .25) * .7; fx.bloom = .3; fx.vig = .55; fx.ca = .0008 + decay(t, 21, .25) * .005;
  }
  let SIMCROP = [1450, 200, 1420, 1300], SIMLAB = [[1830, 290], [2500, 290]];

  function sGod(ctx, t, fx) {
    const lt = t - 23, T0 = 23.6, [sx, sy] = shake(t, T0, 34, .6);
    ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
    ctx.save(); camera(ctx, { x: sx, y: sy, z: 1.05 });
    drawSwarm(ctx, t, { shock: { t0: T0, x: 540, y: 1060 } });
    if (t > T0) { // shockwave rings
      const u = t - T0;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let k = 0; k < 3; k++) { const r = u * 1700 - k * 90; if (r < 0) continue; ctx.strokeStyle = S.rgba(k ? C.orange : '#fff', Math.max(0, .8 - u * .7) / (k + 1)); ctx.lineWidth = 14 - k * 4; ctx.beginPath(); ctx.arc(540, 1060, r, 0, TAU); ctx.stroke(); }
      ctx.restore();
    }
    if (t < T0 + .15) { // the what-if card falls in
      const u = clamp((t - 23.05) / (T0 - 23.05)), y = lerp(-300, 1060, E.inQuad(u)), s = lerp(1.25, .9, u);
      ctx.save(); ctx.translate(540, y); ctx.rotate(lerp(-.25, 0, u)); ctx.scale(s, s);
      ctx.shadowColor = S.rgba(C.gold, .8); ctx.shadowBlur = 60; ctx.fillStyle = '#fff'; S.roundRect(ctx, -360, -130, 720, 260, 26); ctx.fill(); ctx.shadowBlur = 0;
      ctx.fillStyle = C.red; S.roundRect(ctx, -330, -100, 210, 50, 12); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = '800 28px "JetBrains Mono"'; ctx.fillText('WHAT IF', -306, -66);
      ctx.fillStyle = C.ink; ctx.font = '900 46px Inter'; ctx.fillText('the university reverses', -330, 10); ctx.fillText('its decision?', -330, 66);
      ctx.restore();
    }
    ctx.restore();
    cap(ctx, t, 'Then you play god:', 23.1, 24.85, { y: 300 });
    cap(ctx, t, 'drop in a *what if.*', 23.4, 24.85, { y: 410 });
    fx.flash = decay(t, T0, .25) * .55; fx.bloom = .9; fx.vig = .6; fx.zoomBlur = decay(t, T0, .2) * .12; fx.ca = .0008 + decay(t, T0, .4) * .006;
  }

  const REPCROP = lt => [60, 160 + 260 * E.inOutQuad(clamp((lt - .5) / 1.5)), 1220, 1180];
  function sReport(ctx, t, fx) {
    const lt = t - 25;
    bgTech(ctx, t, '#13254a');
    const img = CL('report', lt, { from: 1.0, speed: 3.0 });
    const k = E.outCubic(clamp(lt / .5));
    browser(ctx, img, { key: 'report', cx: 540, cy: 1010, w: 1000, crop: REPCROP(lt), ry: lerp(-.45, -.08, k), rx: .05, url: 'step 4/5 · report' });
    cap(ctx, t, 'It writes the | *prediction report…*', 25.15, 26.9, { y: 300, size: 80 });
    fx.bloom = .25; fx.vig = .55;
  }

  function sChat(ctx, t, fx) {
    const lt = t - 27;
    bgTech(ctx, t, '#1b2248');
    const k = E.outCubic(clamp(lt / .45));
    const z = 1 + .05 * lt;
    const map = browser(ctx, ST('shot_chat'), { key: 'chat', cx: 540, cy: 860, w: 1000 * z, crop: [673, 300, 857, 540], ry: lerp(.4, .06, k), url: 'step 5/5 · interaction' });
    if (map && lt > .5) { // highlight the quoted agent line
      const a = map(790, 588), b = map(1305, 628);
      K.highlighter(ctx, a[0], a[1], b[0] - a[0], b[1] - a[1], (lt - .5) / .3, 'rgba(255,214,0,.5)');
    }
    if (lt > .75) { // English translation card
      const e = E.outBack(clamp((lt - .75) / .35), 1.4);
      ctx.save(); ctx.translate(540, 1390); ctx.scale(e, e);
      ctx.fillStyle = 'rgba(255,255,255,.97)'; S.roundRect(ctx, -470, -130, 940, 260, 24); ctx.fill();
      ctx.fillStyle = C.gold; ctx.fillRect(-440, -100, 10, 200);
      ctx.fillStyle = '#555'; ctx.font = '800 22px "JetBrains Mono"'; ctx.fillText('A SIMULATED STUDENT, QUOTED IN THE REPORT', -410, -78);
      ctx.fillStyle = C.ink; ctx.font = 'italic 400 50px "Instrument Serif"';
      ctx.fillText('“If justice only happens when it trends,', -410, -10); ctx.fillText('what did four years of law school', -410, 46); ctx.fillText('teach us?”', -410, 102);
      ctx.restore();
    }
    cap(ctx, t, 'And you can *interview* | the agents.', 27.12, 28.9, { y: 300, size: 80 });
    fx.bloom = .25; fx.vig = .55;
  }

  const PORTRAITS = [['hlm_jiamu', '史太君', 'Grandmother Jia'], ['hlm_yuanchun', '元春', 'Jia Yuanchun'], ['hlm_baochai', '薛寶釵', 'Xue Baochai']];
  function sNovel(ctx, t, fx) {
    const lt = t - 29;
    ctx.fillStyle = '#120d08'; ctx.fillRect(0, 0, W, H);
    if (t < 30.4) {
      const img = ST('hlm_preface');
      full(ctx, img, 1.25 + lt * .08, .62, .45, clamp(lt / .2));
      ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = '#e8d3ad'; ctx.fillRect(0, 0, W, H); ctx.restore();
      dim(ctx, .28, '20,12,4');
    } else {
      const g = ctx.createRadialGradient(540, 900, 50, 540, 960, 1200); g.addColorStop(0, '#3a2a18'); g.addColorStop(1, '#0c0805');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }
    if (t >= 30.15) {
      PORTRAITS.forEach(([key, zh, en], i) => {
        const t0 = 30.15 + i * .12, u = E.outBack(clamp((t - t0) / .45), 1.2);
        const x = 540 + (i - 1) * 320, y = 1040 + Math.abs(i - 1) * 40, rot = (i - 1) * .1;
        const flip = clamp((t - (31.3 + i * .2)) / .3), ang = flip * Math.PI, sx = Math.cos(ang);
        ctx.save(); ctx.translate(x, y + (1 - u) * 900); ctx.rotate(rot); ctx.scale(Math.abs(sx) * .98 + .02, 1);
        const cw = 300, chh = 470;
        ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 40;
        if (sx > 0) {
          ctx.fillStyle = '#f2e6cc'; S.roundRect(ctx, -cw / 2, -chh / 2, cw, chh, 18); ctx.fill(); ctx.shadowBlur = 0;
          const img = ST(key); if (img) { ctx.save(); S.roundRect(ctx, -cw / 2 + 12, -chh / 2 + 12, cw - 24, chh - 24, 10); ctx.clip(); S.cover(ctx, img, -cw / 2 + 12, -chh / 2 + 12, cw - 24, chh - 24, { zoom: 1.05, fx: .55, fy: .5 }); ctx.restore(); }
        } else {
          ctx.fillStyle = '#0d1426'; S.roundRect(ctx, -cw / 2, -chh / 2, cw, chh, 18); ctx.fill(); ctx.shadowBlur = 0;
          ctx.strokeStyle = C.cyan; ctx.lineWidth = 3; ctx.stroke();
          ctx.fillStyle = C.cyan; ctx.font = '800 22px "JetBrains Mono"'; ctx.textAlign = 'center'; ctx.fillText(`AGENT ${String(i + 1).padStart(3, '0')}`, 0, -170);
          ctx.fillStyle = '#fff'; ctx.font = `700 70px ${CJK}`; ctx.fillText(zh, 0, -60);
          ctx.font = '800 26px Inter'; ctx.fillText(en, 0, -6);
          ['memory: 80 chapters', 'persona: from the text', 'status: simulating'].forEach((s, j) => { pill(ctx, 0, 60 + j * 56, s, { font: '700 19px "JetBrains Mono"', bg: 'rgba(76,213,255,.15)', border: 'rgba(76,213,255,.5)', align: 'center', h: 40, borderW: 2 }); });
        }
        ctx.restore();
      });
    }
    if (t > 32.25) { // the real demo
      const e = E.outCubic(clamp((t - 32.25) / .4));
      browser(ctx, ST('hlm_cover'), { key: 'hlmcover', cx: 540, cy: lerp(2300, 1080, e), w: 960, crop: [0, 0, 2560, 1440], url: 'mirofish · red chamber demo', ry: .05 });
    }
    cap(ctx, t, 'Someone fed it a | *260-year-old* novel.', 29.1, 30.15, { y: 400, size: 80 });
    if (t < 30.3) { ctx.save(); ctx.globalAlpha = clamp((t - 29.3) / .3) * .85; label(ctx, 'DREAM OF THE RED CHAMBER · 1791 EDITION', 540, 1500, { align: 'center' }); ctx.restore(); }
    cap(ctx, t, 'Its author died | before the ending.', 30.3, 31.3, { y: 400, size: 80 });
    cap(ctx, t, 'MiroFish turned the | characters into agents…', 31.4, 32.3, { y: 400, size: 76 });
    cap(ctx, t, '…to predict *how it ends.*', 32.35, 32.95, { y: 400, size: 76 });
    fx.flash = decay(t, 29.0, .3) * .5; fx.bloom = .5; fx.warm = .9; fx.vig = .7;
  }

  function sCatch(ctx, t, fx) {
    const lt = t - 33;
    const g = ctx.createRadialGradient(540, 800, 40, 540, 960, 1300); g.addColorStop(0, '#3a1018'); g.addColorStop(1, '#070305');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const up = E.inOutCubic(clamp((lt - .5) / .35));
    ctx.save(); ctx.translate(540, lerp(960, 250, up)); const s = lerp(1.6, 1, up) * (1 + .2 * decay(lt, 0, .25)); ctx.scale(s, s);
    ctx.font = '900 110px Inter'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.fillText('The catch?', 0, 30); ctx.restore();
    if (lt > .6) { // receipt A: the homepage
      const e = E.outBack(clamp((lt - .6) / .4), 1.3);
      ctx.save(); ctx.translate((1 - e) * -900, 0);
      label(ctx, 'THE HOMEPAGE', 70, 380, { bg: '#fff', color: C.ink, border: null });
      const map = browser(ctx, ST('shot_home'), { key: 'home', cx: 540, cy: 580, w: 940, crop: [300, 690, 520, 210], bar: false, radius: 20 });
      if (map && lt > 1.0) { const p = map(400, 855); ring(ctx, p[0], p[1], 190, 80, (lt - 1.0) / .3, C.gold); }
      ctx.restore();
      if (lt > 1.3) { ctx.save(); ctx.globalAlpha = clamp((lt - 1.3) / .2); ctx.font = '900 46px Inter'; ctx.fillStyle = C.gold; ctx.fillText('"Low cost: ~$5 per simulation"', 80, 820); ctx.restore(); }
    }
    if (lt > 1.9) { // receipt B: the README
      const e = E.outBack(clamp((lt - 1.9) / .4), 1.3);
      ctx.save(); ctx.translate((1 - e) * 900, 0);
      label(ctx, 'THE README', 70, 925, { bg: '#fff', color: C.ink, border: null });
      ctx.fillStyle = '#0d1117'; S.roundRect(ctx, 70, 965, 940, 300, 20); ctx.fill(); ctx.strokeStyle = '#30363d'; ctx.lineWidth = 3; ctx.stroke();
      ctx.font = '500 31px "JetBrains Mono"';
      const lines = [['# Recommended: Alibaba Qwen-plus model', '#8b949e'], ['# High consumption, try simulations', '#8b949e'], ['# with fewer than 40 rounds first', '#8b949e'], ['LLM_API_KEY=your_api_key', '#79c0ff']];
      lines.forEach(([s2, c2], i) => { if (i === 1 || i === 2) K.highlighter(ctx, 92, 1003 + i * 62, ctx.measureText(s2).width + 10, 46, (lt - 2.2 - (i - 1) * .2) / .3, 'rgba(255,214,0,.85)'); ctx.fillStyle = (i === 1 || i === 2) && lt > 2.4 ? '#fff' : c2; ctx.fillText(s2, 100, 1038 + i * 62); });
      ctx.restore();
    }
    serif(ctx, t, 'Futures from $5.', 36.15, 36.95, { y: 1420, size: 120, color: C.gold });
    if (t > 36.4) { ctx.save(); ctx.globalAlpha = clamp((t - 36.4) / .2); ctx.font = '500 26px "JetBrains Mono"'; ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.textAlign = 'center'; ctx.fillText('*rounds and API bills may vary', 540, 1490); ctx.restore(); }
    fx.flash = decay(t, 33.0, .15) * .5; fx.glitch = decay(t, 33.0, .2) * .6; fx.bloom = .5; fx.vig = .65;
  }

  function sFutures(ctx, t, fx) {
    const lt = t - 37;
    ctx.fillStyle = '#03050b'; ctx.fillRect(0, 0, W, H);
    ctx.save(); camera(ctx, { y: lerp(-80, 120, E.inOutQuad(clamp(lt / 4))), z: lerp(1.15, 1, E.outCubic(clamp(lt / 2.5))) });
    const chosenOn = clamp((t - 39.9) / .4);
    ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    for (let i = 0; i < TREE.length; i++) {
      const s = TREE[i], st = 37.05 + s.d * .21, u = clamp((t - st) / .26); if (u <= 0) continue;
      const x2 = lerp(s.x, s.x2, u), y2 = lerp(s.y, s.y2, u), ch = CHOSEN.has(i);
      const fade = ch ? 1 : 1 - .65 * chosenOn;
      ctx.strokeStyle = ch && chosenOn > 0 ? S.rgba(C.gold, .9) : `rgba(${80 + s.d * 10},${150 + s.d * 8},255,${(.55 - s.d * .03) * fade})`;
      ctx.lineWidth = ch && chosenOn > 0 ? 6 : Math.max(1.2, 6 - s.d * .5);
      ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(x2, y2); ctx.stroke();
      if (s.d === 10 && u >= 1) { ctx.fillStyle = ch && chosenOn ? C.gold : `rgba(160,210,255,${.8 * fade})`; ctx.beginPath(); ctx.arc(s.x2, s.y2, ch && chosenOn ? 9 : 3, 0, TAU); ctx.fill(); }
    }
    const rg = ctx.createRadialGradient(540, 1640, 0, 540, 1640, 140); rg.addColorStop(0, 'rgba(255,255,255,.9)'); rg.addColorStop(1, 'rgba(76,141,255,0)');
    ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(540, 1640, 140, 0, TAU); ctx.fill();
    ctx.restore();
    cap(ctx, t, "It can't see *the* future.", 37.2, 38.45, { y: 360 });
    cap(ctx, t, 'It rehearses | *a thousand* of them.', 38.6, 40.85, { y: 360 });
    fx.bloom = 1.0; fx.vig = .6; fx.flash = decay(t, 39.9, .3) * .25;
  }

  const POSTS = [
    ['@agent_0412', 'Student', 'built in 10 days?? my to-do list is from 2024', C.blue],
    ['@agent_2203', 'Investor', 'he wanted 1,000 stars. I want 1,000 followers. we are not the same', C.orange],
    ['@agent_1337', 'Developer', 'starred it before this video ended. prediction: so will you', '#2ea043'],
  ];
  function wrap(ctx, str, maxW) { const out = []; let line = ''; for (const w of str.split(' ')) { const tst = line ? line + ' ' + w : w; if (ctx.measureText(tst).width > maxW && line) { out.push(line); line = w; } else line = tst; } if (line) out.push(line); return out; }
  function sMeta(ctx, t, fx) {
    const lt = t - 41;
    full(ctx, CL('cheer', lt * .6), 1.1, .5, .5);
    dim(ctx, .62, '4,6,14');
    cap(ctx, t, 'So we asked a swarm | about this video.', 41.1, 44.3, { y: 250, size: 76 });
    // feed panel styled after the demo's "Plaza / Feed" platform
    const pe = E.outCubic(clamp((lt - .4) / .4)), py = lerp(1900, 470, pe);
    if (lt > .4 && t < 44.6) {
      const q = 1 - E.inCubic(clamp((t - 44.3) / .25));
      ctx.save(); ctx.globalAlpha = q;
      ctx.fillStyle = 'rgba(250,250,250,.97)'; S.roundRect(ctx, 60, py, 960, 980, 30); ctx.fill();
      ctx.fillStyle = C.ink; ctx.font = '800 26px "JetBrains Mono"'; ctx.fillText('PLATFORM 1 · PLAZA / FEED', 100, py + 62);
      pill(ctx, 980, py + 52, 'SIMULATED · JOKE', { font: '800 20px "JetBrains Mono"', bg: C.red, align: 'right', h: 40 });
      ctx.fillStyle = '#e5e7eb'; ctx.fillRect(100, py + 92, 880, 3);
      POSTS.forEach(([hd, role, txt, col], i) => {
        const at = 41.8 + i * .85; if (t < at) return;
        const e = E.outBack(clamp((t - at) / .3), 1.3), y = py + 130 + i * 270;
        ctx.save(); ctx.translate(0, (1 - e) * 60); ctx.globalAlpha = q * clamp((t - at) / .15);
        ctx.fillStyle = col; ctx.beginPath(); ctx.arc(140, y + 40, 38, 0, TAU); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = '900 34px Inter'; ctx.textAlign = 'center'; ctx.fillText(hd[7].toUpperCase(), 140, y + 52); ctx.textAlign = 'left';
        ctx.fillStyle = C.ink; ctx.font = '800 32px Inter'; ctx.fillText(hd, 200, y + 30);
        ctx.fillStyle = '#6b7280'; ctx.font = '600 24px "JetBrains Mono"'; ctx.fillText(role.toUpperCase(), 200 + ctx.measureText(hd).width * 1.2 + 10, y + 30);
        ctx.fillStyle = '#111827'; ctx.font = '600 38px Inter';
        wrap(ctx, txt, 760).forEach((l, j) => ctx.fillText(l, 200, y + 84 + j * 50));
        ctx.restore();
      });
      ctx.restore();
    }
    if (t > 44.55) { // prediction meter
      const e = E.outCubic(clamp((t - 44.55) / .7));
      ctx.save(); ctx.globalAlpha = clamp((t - 44.55) / .2);
      ctx.font = '900 64px Inter'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.fillText('WILL YOU FOLLOW?', 540, 700);
      ctx.fillStyle = 'rgba(255,255,255,.15)'; S.roundRect(ctx, 100, 760, 880, 90, 45); ctx.fill();
      ctx.fillStyle = C.gold; S.roundRect(ctx, 100, 760, Math.max(90, 880 * .73 * e), 90, 45); ctx.fill();
      ctx.fillStyle = C.ink; ctx.font = '900 44px Inter'; ctx.textAlign = 'left'; ctx.fillText(`YES ${Math.round(73 * e)}%`, 140, 822);
      ctx.fillStyle = '#fff'; ctx.textAlign = 'right'; ctx.fillText(`NO ${Math.round(27 * e)}%`, 950, 822);
      ctx.restore();
    }
    if (t > 45.35) {
      const e = E.outBack(clamp((t - 45.35) / .35), 1.5);
      ctx.save(); ctx.translate(540, 1060); ctx.scale(e, e);
      pill(ctx, 0, 0, '★ github.com/666ghj/MiroFish', { font: '800 40px "JetBrains Mono"', bg: C.gold, color: C.ink, align: 'center', h: 92 });
      ctx.restore();
      cap(ctx, t, 'Prove the swarm *wrong.*', 45.6, 46.95, { y: 1260, size: 88 });
    }
    fx.bloom = .6; fx.vig = .6;
  }

  function sLoop(ctx, t, fx) {
    // particles rush into the opening shot so 48.0 == 0.0
    if (t < 47.55) { sMeta(ctx, t, fx); }
    else sIntro(ctx, 0, fx);
    const u = clamp((t - 47.3) / .3) * (1 - clamp((t - 47.55) / .3));
    fx.zoomBlur = u * .6; fx.flash = u * .5;
  }

  const SCENES = [
    [0, 3, sIntro], [3, 5, sStars], [5, 7, sMoney], [7, 9, sReveal], [9, 11, sFish], [11, 13, sSeeds], [13, 15, sGraph],
    [15, 17, sAgents], [17, 21, sSwarm], [21, 23, sSim], [23, 25, sGod], [25, 27, sReport], [27, 29, sChat], [29, 33, sNovel],
    [33, 37, sCatch], [37, 41, sFutures], [41, 47, sMeta], [47, 48, sLoop],
  ];
  window.EP = {
    duration: window.CUES.duration,
    init() { initSwarm(); initTree(); },
    draw(ctx, t, fx) {
      const sc = SCENES.find(s => t >= s[0] && t < s[1]) || SCENES[SCENES.length - 1];
      sc[2](ctx, t, fx);
      fx.grain = fx.grain ?? .055;
    },
  };
  SHORT.boot(window.EP);
})();
