/* A 2D dancer: one skeleton, one dance, many bodies.
 * That is the whole claim of MoCha (same motion, new character), so every
 * character in the film is a different skin drawn on these same joints.
 *
 * Rig space: pelvis at the origin, y down, standing height about 565 px.
 * Limb angles: 0 = hanging straight down, positive = swing outward.
 */
(function () {
  const { clamp, lerp, E, TAU } = SHORT;
  const L = { spine: 150, neck: 28, head: 68, shX: 64, shY: 14, upper: 104, fore: 98, hipX: 34, thigh: 124, shin: 118 };
  const FLOOR = L.thigh + L.shin + 2; // foot height when standing straight
  const BPM = 120, BEAT = 60 / BPM, T0 = 1.0; // bar 0 starts at 1.0 s (2-beat pickup)
  const beatAt = t => (t - T0) / BEAT;

  const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
  const scl = (a, k) => [a[0] * k, a[1] * k];
  const dir = a => [Math.sin(a), Math.cos(a)]; // 0 = down, +pi/2 = screen right

  // ---------------- dance ----------------
  const base = () => ({ x: 0, s: 0, n: 0, la: .25, la2: .35, ra: .25, ra2: .35, ll: .07, ll2: 0, rl: .07, rl2: 0, lk: 0, rk: 0, squat: .05, face: 'happy' });
  const hitOf = b => Math.exp(-((b % 1 + 1) % 1) * 5.5);
  const snap = (b, steps) => { // stepwise values with a quick ease between beats
    const i = Math.floor(b), f = b - i;
    const a = steps[((i % steps.length) + steps.length) % steps.length], c = steps[(((i + 1) % steps.length) + steps.length) % steps.length];
    const k = E.outBack(clamp((f - 0.82) / 0.18), 2.4);
    return a.map((v, j) => lerp(v, c[j], k));
  };

  const MOVES = {
    groove(b) {
      const p = base(), sw = Math.sin(Math.PI * b), h = hitOf(b);
      p.x = 16 * sw; p.s = -0.07 * sw; p.n = 0.1 * Math.sin(Math.PI * b + .6);
      p.la = .38 + .22 * Math.sin(Math.PI * b); p.la2 = .7 + .3 * Math.sin(Math.PI * b + 1.2);
      p.ra = .38 - .22 * Math.sin(Math.PI * b); p.ra2 = .7 - .3 * Math.sin(Math.PI * b + 1.2);
      p.ll = .1 + .06 * sw; p.rl = .1 - .06 * sw;
      p.squat = .06 + .16 * h; return p;
    },
    point(b) {
      const p = base(), h = hitOf(b);
      const [ra, ra2, la, la2, s, n] = snap(b, [[2.55, .05, .75, -1.75, .1, -.12], [-.35, .1, .75, -1.75, -.08, .2]]);
      Object.assign(p, { ra, ra2, la, la2, s, n });
      p.x = 14 * Math.sin(Math.PI * b); p.ll = .14; p.rl = .14; p.squat = .1 + .18 * h; p.face = 'smug'; return p;
    },
    sprinkler(b) {
      const p = base(), h = hitOf(b), k = ((b % 4) + 4) % 4;
      const step = Math.floor(k * 2) / 2;
      p.la = 2.35; p.la2 = 1.95; // hand behind head
      p.ra = 1.75 - step * .32 + .05 * Math.sin(k * TAU * 2); p.ra2 = -.1;
      p.s = .06; p.n = -.12 + .05 * Math.sin(b * Math.PI);
      p.ll = .12; p.rl = .16; p.rl2 = -.15; p.squat = .1 + .15 * h; p.face = 'happy'; return p;
    },
    noodle(b) {
      const p = base(), h = hitOf(b), w = Math.PI * b;
      p.la = 2.5 + .45 * Math.sin(w); p.la2 = .7 * Math.sin(w + 1.3);
      p.ra = 2.5 + .45 * Math.sin(w + Math.PI); p.ra2 = .7 * Math.sin(w + Math.PI + 1.3);
      p.s = .12 * Math.sin(w); p.n = -.15 * Math.sin(w); p.x = 22 * Math.sin(w);
      p.ll = .16; p.rl = .16; p.lk = .25 * Math.max(0, Math.sin(w)); p.rk = .25 * Math.max(0, -Math.sin(w));
      p.squat = .14 + .18 * h; p.face = 'o'; return p;
    },
    robot(b) {
      const p = base();
      const [la, la2, ra, ra2, s, n, x] = snap(b, [
        [1.57, 1.57, .2, .2, 0, 0, 0], [1.57, -1.57, 1.57, 1.57, .05, .15, 10],
        [.2, .2, 1.57, -1.57, -.05, -.15, -10], [1.57, 1.57, 1.57, 1.57, 0, 0, 0]]);
      Object.assign(p, { la, la2, ra, ra2, s, n, x }); p.ll = .12; p.rl = .12; p.squat = .08 + .1 * hitOf(b); p.face = 'smug'; return p;
    },
    flamingo(b) { // knee up, T-rex arms, head cocked: Dave's signature move
      const p = base(), w = Math.sin(Math.PI * b);
      p.la = .5; p.la2 = -2.25 + .12 * w; p.ra = .5; p.ra2 = -2.25 - .12 * w;
      p.s = -.12 + .04 * w; p.n = .34; p.lk = 1; p.ll = .5; p.ll2 = -.85; p.rl = .05;
      p.x = -6; p.squat = .08; p.face = 'o'; return p;
    },
  };

  // bar -> move. Bar k spans beats [4k, 4k+4). Edit to re-choreograph.
  const SEQ = {
    '-1': 'groove', 0: 'groove', 1: 'point', 2: 'point', 3: 'noodle', 4: 'groove', 5: 'groove',
    6: 'groove', 7: 'groove', 8: 'groove', 9: 'groove', 10: 'sprinkler', 11: 'noodle',
    12: 'point', 13: 'robot', 14: 'flamingo', 15: 'flamingo', 16: 'groove',
  };
  const moveForBar = k => SEQ[k] || 'groove';

  function blend(a, b, k) {
    const o = {};
    for (const key in a) o[key] = typeof a[key] === 'number' ? lerp(a[key], b[key], k) : (k < .5 ? a[key] : b[key]);
    return o;
  }

  function danceAt(t, override) {
    const b = beatAt(t);
    if (override) return MOVES[override](b);
    const bar = Math.floor(b / 4), f = b / 4 - bar;
    const cur = MOVES[moveForBar(bar)](b);
    if (f > 0.93) { // blend into next bar's move during the last ~quarter beat
      const nxt = MOVES[moveForBar(bar + 1)](b);
      return blend(cur, nxt, E.inOutCubic((f - .93) / .07));
    }
    return cur;
  }

  // ---------------- forward kinematics ----------------
  function solve(p) {
    const J = { p };
    const sq = clamp(p.squat || 0, 0, .6);
    const legLen = (lift) => [L.thigh * (1 - .55 * lift) * (1 - .22 * sq), L.shin * (1 - .18 * sq)];
    const s = p.s, hipS = s * .3;
    const pel = [p.x || 0, 0];
    const right = [Math.cos(hipS), Math.sin(hipS)];
    J.lhip = add(pel, scl(right, -L.hipX)); J.rhip = add(pel, scl(right, L.hipX));
    const [lt, ls] = legLen(p.lk || 0), [rt, rs] = legLen(p.rk || 0);
    J.lkn = add(J.lhip, scl(dir(hipS - p.ll), lt)); J.lft = add(J.lkn, scl(dir(hipS - p.ll - (p.ll2 || 0)), ls));
    J.rkn = add(J.rhip, scl(dir(hipS + p.rl), rt)); J.rft = add(J.rkn, scl(dir(hipS + p.rl + (p.rl2 || 0)), rs));
    // a lifted knee lifts its foot: drop the knee point toward camera feel
    if (p.lk) { J.lft[1] -= 70 * p.lk; }
    if (p.rk) { J.rft[1] -= 70 * p.rk; }
    // ground contact: lowest planted foot sits on the floor
    const planted = [p.lk > .5 ? -1e9 : J.lft[1], p.rk > .5 ? -1e9 : J.rft[1]];
    const shift = FLOOR - Math.max(...planted);
    J.pel = pel;
    J.chest = add(pel, scl([Math.sin(s), -Math.cos(s)], L.spine));
    const hs = s + p.n * .5;
    J.neck = add(J.chest, scl([Math.sin(hs), -Math.cos(hs)], L.neck));
    J.head = add(J.neck, scl([Math.sin(s + p.n), -Math.cos(s + p.n)], L.head));
    J.headA = s + p.n;
    const R = [Math.cos(s), Math.sin(s)], U = [Math.sin(s), -Math.cos(s)];
    const shBase = add(J.chest, scl(U, -L.shY));
    J.lsh = add(shBase, scl(R, -L.shX)); J.rsh = add(shBase, scl(R, L.shX));
    J.lel = add(J.lsh, scl(dir(s - p.la), L.upper)); J.lha = add(J.lel, scl(dir(s - p.la - p.la2), L.fore));
    J.rel = add(J.rsh, scl(dir(s + p.ra), L.upper)); J.rha = add(J.rel, scl(dir(s + p.ra + p.ra2), L.fore));
    J.s = s;
    for (const k of ['lhip', 'rhip', 'lkn', 'rkn', 'lft', 'rft', 'pel', 'chest', 'neck', 'head', 'lsh', 'rsh', 'lel', 'rel', 'lha', 'rha']) J[k] = [J[k][0], J[k][1] + shift];
    return J;
  }

  // ---------------- drawing helpers ----------------
  function seg(ctx, pts, w, col) {
    ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.stroke();
  }
  // shaded limb: base, soft highlight, coloured rim on the right-hand side
  function limb(ctx, a, b, w, col, o = {}) {
    seg(ctx, [a, b], w, col);
    const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1;
    let nx = -dy / len, ny = dx / len; if (nx < 0) { nx = -nx; ny = -ny; }
    if (o.hi) { const k = -w * .2; seg(ctx, [[a[0] + nx * k, a[1] + ny * k], [b[0] + nx * k, b[1] + ny * k]], w * .28, o.hi); }
    if (o.rim) { const k = w * .36; ctx.globalAlpha *= .9; seg(ctx, [[a[0] + nx * k, a[1] + ny * k], [b[0] + nx * k, b[1] + ny * k]], w * .14, o.rim); ctx.globalAlpha /= .9; }
  }
  function dot(ctx, p, r, col) { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(p[0], p[1], r, 0, TAU); ctx.fill(); }
  function inTorso(ctx, J, fn) { ctx.save(); ctx.translate(J.pel[0], J.pel[1]); ctx.rotate(J.s); fn(); ctx.restore(); }
  function inHead(ctx, J, fn) { ctx.save(); ctx.translate(J.head[0], J.head[1]); ctx.rotate(J.headA); fn(); ctx.restore(); }
  function torsoPath(ctx, top = -150, shW = 70, waistW = 56, belly = 66, bot = 4) {
    ctx.beginPath();
    ctx.moveTo(-shW, top + 14);
    ctx.quadraticCurveTo(-shW, top, -shW + 20, top);
    ctx.lineTo(shW - 20, top);
    ctx.quadraticCurveTo(shW, top, shW, top + 14);
    ctx.bezierCurveTo(shW + 2, top + 60, belly, -60, waistW, bot);
    ctx.lineTo(-waistW, bot);
    ctx.bezierCurveTo(-belly, -60, -shW - 2, top + 60, -shW, top + 14);
    ctx.closePath();
  }
  function shoe(ctx, p, side, col, w = 30) {
    ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(p[0] + side * 10, p[1] + 6, w, 15, 0, 0, TAU); ctx.fill();
  }

  // ---------------- skins ----------------
  const SK = {};

  SK.dave = function (ctx, J, o = {}) {
    const P = Object.assign({
      skin: '#f2c29d', skinS: '#d99c78', hair: '#5b3b26', shirt: '#a8cdef', shirtS: '#7ea7d0', tie: '#d8463b',
      pants: '#b8976a', pantsS: '#94754f', shoes: '#3a2418', ink: '#1c1410', rim: o.rim || '#ffb27a', hi: 'rgba(255,255,255,.22)',
    }, o.palette || {});
    const flat = !!o.palette && o.flat;
    const rim = flat ? null : P.rim, hi = flat ? null : P.hi;
    // legs
    limb(ctx, J.lhip, J.lkn, 46, P.pants, { rim, hi }); limb(ctx, J.lkn, J.lft, 42, P.pants, { rim });
    limb(ctx, J.rhip, J.rkn, 46, P.pants, { rim, hi }); limb(ctx, J.rkn, J.rft, 42, P.pants, { rim });
    shoe(ctx, J.lft, -1, P.shoes); shoe(ctx, J.rft, 1, P.shoes);
    // torso
    inTorso(ctx, J, () => {
      ctx.fillStyle = P.pants; ctx.beginPath(); ctx.ellipse(0, 4, 58, 22, 0, 0, TAU); ctx.fill();
      torsoPath(ctx); ctx.fillStyle = P.shirt; ctx.fill();
      if (!flat) {
        ctx.save(); torsoPath(ctx); ctx.clip();
        ctx.fillStyle = P.shirtS; ctx.fillRect(28, -160, 60, 170); // side shade
        ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(-64, -150, 22, 150);
        ctx.strokeStyle = P.rim; ctx.globalAlpha = .8; ctx.lineWidth = 8; torsoPath(ctx); ctx.stroke(); ctx.globalAlpha = 1;
        ctx.restore();
        ctx.fillStyle = '#3a2a1f'; ctx.fillRect(-56, -14, 112, 12); // belt
        ctx.fillStyle = '#d9b24a'; ctx.fillRect(-9, -14, 18, 12);
        // collar + tie
        ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(-26, -150); ctx.lineTo(0, -128); ctx.lineTo(26, -150); ctx.lineTo(16, -158); ctx.lineTo(0, -146); ctx.lineTo(-16, -158); ctx.closePath(); ctx.fill();
        ctx.fillStyle = P.tie; ctx.beginPath(); ctx.moveTo(-8, -140); ctx.lineTo(8, -140); ctx.lineTo(13, -60); ctx.lineTo(0, -44); ctx.lineTo(-13, -60); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(0,0,0,.12)'; ctx.beginPath(); ctx.arc(-30, -92, 4, 0, TAU); ctx.arc(-30, -62, 4, 0, TAU); ctx.fill(); // shirt pocket-ish buttons
      }
    });
    if (o.afterTorso) o.afterTorso(ctx, J);
    // neck + head
    limb(ctx, J.chest, J.neck, 34, P.skin);
    inHead(ctx, J, () => {
      const f = o.face || J.p.face;
      ctx.fillStyle = P.skin;
      ctx.beginPath(); ctx.ellipse(-60, 6, 12, 17, 0, 0, TAU); ctx.ellipse(60, 6, 12, 17, 0, 0, TAU); ctx.fill(); // ears
      ctx.beginPath(); ctx.ellipse(0, 0, 60, 66, 0, 0, TAU); ctx.fill();
      if (flat) return;
      ctx.save(); ctx.beginPath(); ctx.ellipse(0, 0, 60, 66, 0, 0, TAU); ctx.clip();
      ctx.fillStyle = P.skinS; ctx.beginPath(); ctx.ellipse(34, 10, 34, 70, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = P.rim; ctx.lineWidth = 8; ctx.globalAlpha = .85; ctx.beginPath(); ctx.ellipse(0, 0, 60, 66, 0, -1.2, 1.2); ctx.stroke(); ctx.globalAlpha = 1;
      ctx.restore();
      // hair: side tufts + three heroic strands
      ctx.fillStyle = P.hair;
      ctx.beginPath(); ctx.ellipse(-52, -18, 14, 30, .3, 0, TAU); ctx.ellipse(52, -18, 14, 30, -.3, 0, TAU); ctx.fill();
      ctx.strokeStyle = P.hair; ctx.lineWidth = 5; ctx.lineCap = 'round';
      for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(i * 12, -64); ctx.quadraticCurveTo(i * 12 + 18, -84 - (i === 0 ? 8 : 0), i * 12 + 30, -70); ctx.stroke(); }
      // eyebrows
      const brow = f === 'alarm' ? -12 : f === 'smug' ? -4 : 0;
      ctx.lineWidth = 6; ctx.strokeStyle = P.hair;
      ctx.beginPath(); ctx.moveTo(-36, -24 + brow); ctx.lineTo(-12, -28 + brow * 1.3); ctx.moveTo(12, -28 + brow * (f === 'smug' ? -0.2 : 1.3)); ctx.lineTo(36, -24 + brow); ctx.stroke();
      // glasses
      ctx.lineWidth = 5; ctx.strokeStyle = P.ink;
      ctx.beginPath(); ctx.arc(-23, -4, 17, 0, TAU); ctx.moveTo(40, -4); ctx.arc(23, -4, 17, 0, TAU); ctx.moveTo(-6, -6); ctx.lineTo(6, -6); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.ellipse(-28, -10, 5, 3, -.6, 0, TAU); ctx.ellipse(18, -10, 5, 3, -.6, 0, TAU); ctx.fill();
      // eyes (blink)
      const blink = ((o.t ?? 0) % 3.7) < 0.12;
      ctx.fillStyle = P.ink;
      if (blink) { ctx.fillRect(-29, -5, 12, 3); ctx.fillRect(17, -5, 12, 3); }
      else { const r = f === 'alarm' ? 6.5 : 5; ctx.beginPath(); ctx.arc(-23, -3, r, 0, TAU); ctx.arc(23, -3, r, 0, TAU); ctx.fill(); }
      // mustache + mouth
      ctx.fillStyle = P.hair; ctx.beginPath(); ctx.ellipse(-11, 24, 14, 6, .15, 0, TAU); ctx.ellipse(11, 24, 14, 6, -.15, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#7a2e22'; ctx.lineWidth = 5;
      if (f === 'o' || f === 'alarm') { ctx.fillStyle = '#5a1f18'; ctx.beginPath(); ctx.ellipse(0, 40, 9, f === 'alarm' ? 12 : 9, 0, 0, TAU); ctx.fill(); }
      else if (f === 'smug') { ctx.beginPath(); ctx.moveTo(-14, 38); ctx.quadraticCurveTo(4, 46, 18, 34); ctx.stroke(); }
      else { ctx.beginPath(); ctx.arc(0, 30, 16, .25, Math.PI - .25); ctx.stroke(); }
      ctx.fillStyle = 'rgba(232,110,90,.25)'; ctx.beginPath(); ctx.arc(-36, 18, 9, 0, TAU); ctx.arc(36, 18, 9, 0, TAU); ctx.fill();
    });
    // arms last (in front of torso)
    for (const [sh, el, ha] of [[J.lsh, J.lel, J.lha], [J.rsh, J.rel, J.rha]]) {
      limb(ctx, sh, el, 38, P.shirt, { rim, hi });
      limb(ctx, el, ha, 31, P.skin, { rim });
      dot(ctx, ha, 18, P.skin);
    }
  };

  // single-colour silhouette with Dave's proportions (used for masks)
  SK.flat = (col) => (ctx, J, o = {}) => SK.dave(ctx, J, Object.assign({}, o, { flat: true, palette: { skin: col, skinS: col, hair: col, shirt: col, shirtS: col, tie: col, pants: col, pantsS: col, shoes: col, ink: col } }));

  function metalGrad(ctx, a, b, w, c0, c1, c2) {
    const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len * w / 2, ny = dx / len * w / 2, m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const g = ctx.createLinearGradient(m[0] - nx, m[1] - ny, m[0] + nx, m[1] + ny);
    g.addColorStop(0, c2); g.addColorStop(.35, c0); g.addColorStop(.6, c1); g.addColorStop(1, c2);
    return g;
  }

  SK.robot = function (ctx, J, o = {}) {
    const t = o.t || 0, cy = '#3de3ff', or = '#ff6b1a';
    const metal = (a, b, w) => { ctx.lineCap = 'round'; seg(ctx, [a, b], w, metalGrad(ctx, a, b, w, '#eef2f6', '#9aa6b2', '#3d4650')); };
    const joint = p => { dot(ctx, p, 15, '#20262d'); ctx.strokeStyle = cy; ctx.lineWidth = 3; ctx.globalAlpha = .8; ctx.beginPath(); ctx.arc(p[0], p[1], 11, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; };
    metal(J.lhip, J.lkn, 40); metal(J.lkn, J.lft, 36); metal(J.rhip, J.rkn, 40); metal(J.rkn, J.rft, 36);
    joint(J.lkn); joint(J.rkn);
    for (const [f, s] of [[J.lft, -1], [J.rft, 1]]) { ctx.fillStyle = '#2b323a'; SHORT.roundRect(ctx, f[0] - 30 + s * 8, f[1] - 6, 60, 24, 8); ctx.fill(); ctx.fillStyle = or; ctx.fillRect(f[0] - 22 + s * 8, f[1] + 12, 44, 4); }
    inTorso(ctx, J, () => {
      ctx.fillStyle = '#2b323a'; SHORT.roundRect(ctx, -46, -30, 92, 40, 12); ctx.fill();
      const g = ctx.createLinearGradient(-70, 0, 70, 0); g.addColorStop(0, '#59636e'); g.addColorStop(.3, '#e9eef3'); g.addColorStop(.62, '#a3aeb9'); g.addColorStop(1, '#3f4851');
      ctx.fillStyle = g; SHORT.roundRect(ctx, -70, -158, 140, 132, 26); ctx.fill();
      ctx.fillStyle = '#1b2026'; SHORT.roundRect(ctx, -40, -24, 80, 22, 6); ctx.fill();
      // chest core
      const pulse = .7 + .3 * Math.sin(t * 6);
      const rg = ctx.createRadialGradient(0, -100, 2, 0, -100, 34); rg.addColorStop(0, '#ffffff'); rg.addColorStop(.3, cy); rg.addColorStop(1, 'rgba(61,227,255,0)');
      ctx.globalAlpha = pulse; ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(0, -100, 34, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
      ctx.strokeStyle = '#1b2026'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, -100, 22, 0, TAU); ctx.stroke();
      ctx.fillStyle = or; ctx.fillRect(-56, -146, 22, 8); ctx.fillRect(34, -146, 22, 8);
      ctx.strokeStyle = o.rim || '#ffb27a'; ctx.lineWidth = 5; ctx.globalAlpha = .7; SHORT.roundRect(ctx, -70, -158, 140, 132, 26); ctx.stroke(); ctx.globalAlpha = 1;
    });
    metal(J.chest, J.neck, 26);
    inHead(ctx, J, () => {
      ctx.strokeStyle = '#59636e'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(18, -56); ctx.lineTo(30, -96); ctx.stroke();
      const blink = (Math.floor(t * 2) % 2 === 0);
      dot(ctx, [30, -98], 9, blink ? or : '#7a3a14');
      const g = ctx.createLinearGradient(-64, 0, 64, 0); g.addColorStop(0, '#59636e'); g.addColorStop(.3, '#f1f4f7'); g.addColorStop(.65, '#a7b1bb'); g.addColorStop(1, '#3f4851');
      ctx.fillStyle = g; SHORT.roundRect(ctx, -62, -60, 124, 112, 30); ctx.fill();
      ctx.fillStyle = '#0a0f14'; SHORT.roundRect(ctx, -50, -26, 100, 40, 18); ctx.fill();
      const sx = Math.sin(t * 3) * 26;
      ctx.save(); ctx.shadowColor = cy; ctx.shadowBlur = 18; ctx.fillStyle = cy;
      SHORT.roundRect(ctx, -30 + sx, -12, 60, 12, 6); ctx.fill(); ctx.restore();
      ctx.fillStyle = '#20262d'; for (let i = -2; i <= 2; i++) ctx.fillRect(i * 12 - 3, 28, 6, 12);
      ctx.fillStyle = '#20262d'; ctx.beginPath(); ctx.arc(-64, 0, 12, 0, TAU); ctx.arc(64, 0, 12, 0, TAU); ctx.fill();
    });
    for (const [sh, el, ha] of [[J.lsh, J.lel, J.lha], [J.rsh, J.rel, J.rha]]) {
      dot(ctx, sh, 24, '#2b323a'); metal(sh, el, 34); metal(el, ha, 30); joint(el);
      dot(ctx, ha, 19, '#2b323a'); ctx.strokeStyle = or; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(ha[0], ha[1], 19, 0, TAU); ctx.stroke();
    }
  };

  SK.astronaut = function (ctx, J, o = {}) {
    const suit = '#f1f2f4', shade = '#c0c6ce', ring = '#8e98a3', rim = o.rim || '#ffb27a';
    const part = (a, b, w) => limb(ctx, a, b, w, suit, { rim, hi: 'rgba(255,255,255,.5)' });
    // backpack peeking out
    inTorso(ctx, J, () => { ctx.fillStyle = '#b9c0c8'; SHORT.roundRect(ctx, -86, -150, 172, 120, 18); ctx.fill(); });
    part(J.lhip, J.lkn, 56); part(J.lkn, J.lft, 52); part(J.rhip, J.rkn, 56); part(J.rkn, J.rft, 52);
    for (const k of [J.lkn, J.rkn]) dot(ctx, k, 22, shade);
    for (const [f, s] of [[J.lft, -1], [J.rft, 1]]) { ctx.fillStyle = '#7f8995'; SHORT.roundRect(ctx, f[0] - 34 + s * 8, f[1] - 10, 68, 30, 12); ctx.fill(); }
    inTorso(ctx, J, () => {
      torsoPath(ctx, -156, 80, 62, 74, 10); ctx.fillStyle = suit; ctx.fill();
      ctx.save(); torsoPath(ctx, -156, 80, 62, 74, 10); ctx.clip();
      ctx.fillStyle = shade; ctx.fillRect(34, -170, 70, 190);
      ctx.strokeStyle = rim; ctx.lineWidth = 8; ctx.globalAlpha = .8; torsoPath(ctx, -156, 80, 62, 74, 10); ctx.stroke(); ctx.globalAlpha = 1;
      ctx.restore();
      ctx.fillStyle = '#d7dbe0'; SHORT.roundRect(ctx, -36, -112, 72, 50, 8); ctx.fill();
      ctx.fillStyle = '#ff6b1a'; ctx.fillRect(-28, -104, 18, 10); ctx.fillStyle = '#3de3ff'; ctx.fillRect(-4, -104, 18, 10); ctx.fillStyle = '#e34b4b'; ctx.fillRect(18, -104, 10, 10);
      ctx.fillStyle = '#ff6b1a'; ctx.beginPath(); ctx.arc(-48, -128, 13, 0, TAU); ctx.fill();
      ctx.fillStyle = ring; ctx.fillRect(-60, -14, 120, 14);
    });
    inHead(ctx, J, () => {
      ctx.fillStyle = suit; ctx.beginPath(); ctx.arc(0, 4, 82, 0, TAU); ctx.fill();
      ctx.strokeStyle = rim; ctx.lineWidth = 7; ctx.globalAlpha = .8; ctx.beginPath(); ctx.arc(0, 4, 79, -1.3, 1.3); ctx.stroke(); ctx.globalAlpha = 1;
      const g = ctx.createLinearGradient(-50, -40, 50, 50); g.addColorStop(0, '#ffe39a'); g.addColorStop(.45, '#e9a23b'); g.addColorStop(1, '#6b3a10');
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 6, 60, 52, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.ellipse(-24, -14, 20, 9, -.5, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.beginPath(); ctx.ellipse(26, 28, 10, 5, -.5, 0, TAU); ctx.fill();
    });
    for (const [sh, el, ha] of [[J.lsh, J.lel, J.lha], [J.rsh, J.rel, J.rha]]) {
      part(sh, el, 48); part(el, ha, 44); dot(ctx, el, 20, shade);
      dot(ctx, ha, 22, '#d6dbe1'); ctx.strokeStyle = ring; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(ha[0], ha[1], 22, 0, TAU); ctx.stroke();
    }
  };

  SK.knight = function (ctx, J, o = {}) {
    const t = o.t || 0, rim = o.rim || '#ffb27a';
    const steel = (a, b, w) => { seg(ctx, [a, b], w, metalGrad(ctx, a, b, w, '#e7ebef', '#8f99a4', '#3a414a')); };
    steel(J.lhip, J.lkn, 44); steel(J.lkn, J.lft, 40); steel(J.rhip, J.rkn, 44); steel(J.rkn, J.rft, 40);
    for (const k of [J.lkn, J.rkn]) { dot(ctx, k, 20, '#6b747e'); dot(ctx, k, 9, '#c9cfd6'); }
    for (const [f, s] of [[J.lft, -1], [J.rft, 1]]) { ctx.fillStyle = '#4a525c'; ctx.beginPath(); ctx.ellipse(f[0] + s * 12, f[1] + 6, 32, 15, 0, 0, TAU); ctx.fill(); }
    inTorso(ctx, J, () => {
      // tabard
      ctx.fillStyle = '#1e3a73'; ctx.beginPath(); ctx.moveTo(-56, -60); ctx.lineTo(56, -60); ctx.lineTo(50, 60); ctx.lineTo(0, 72); ctx.lineTo(-50, 60); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ff6b1a'; ctx.fillRect(-8, -60, 16, 126);
      const g = ctx.createLinearGradient(-74, 0, 74, 0); g.addColorStop(0, '#4b535c'); g.addColorStop(.32, '#f0f3f6'); g.addColorStop(.6, '#9aa4ae'); g.addColorStop(1, '#3a414a');
      torsoPath(ctx, -156, 76, 58, 68, -30); ctx.fillStyle = g; ctx.fill();
      ctx.strokeStyle = 'rgba(30,34,40,.5)'; ctx.lineWidth = 3; for (let y = -120; y < -30; y += 28) { ctx.beginPath(); ctx.moveTo(-60, y); ctx.quadraticCurveTo(0, y + 12, 60, y); ctx.stroke(); }
      ctx.fillStyle = '#ff6b1a'; ctx.beginPath(); ctx.moveTo(0, -132); ctx.lineTo(14, -110); ctx.lineTo(0, -88); ctx.lineTo(-14, -110); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = rim; ctx.globalAlpha = .7; ctx.lineWidth = 5; torsoPath(ctx, -156, 76, 58, 68, -30); ctx.stroke(); ctx.globalAlpha = 1;
    });
    inHead(ctx, J, () => {
      // plume sways with time and lean
      ctx.fillStyle = '#e0372f';
      for (let i = 0; i < 5; i++) {
        const sw = Math.sin(t * 5 + i * .7) * 10 - i * 12;
        ctx.beginPath(); ctx.moveTo(-6, -66); ctx.quadraticCurveTo(-30 + sw, -120 - i * 6, -70 + sw - i * 10, -96 + i * 14); ctx.quadraticCurveTo(-30 + sw, -96, 6, -62); ctx.fill();
      }
      const g = ctx.createLinearGradient(-64, 0, 64, 0); g.addColorStop(0, '#4b535c'); g.addColorStop(.3, '#f3f5f8'); g.addColorStop(.62, '#9aa4ae'); g.addColorStop(1, '#3a414a');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-58, 50); ctx.lineTo(-62, -20); ctx.quadraticCurveTo(-60, -72, 0, -74); ctx.quadraticCurveTo(60, -72, 62, -20); ctx.lineTo(58, 50); ctx.quadraticCurveTo(0, 66, -58, 50); ctx.fill();
      ctx.fillStyle = '#0d0f12'; SHORT.roundRect(ctx, -46, -14, 92, 14, 6); ctx.fill();
      ctx.fillStyle = 'rgba(255,107,26,.9)'; ctx.fillRect(-30, -10, 10, 6); ctx.fillRect(20, -10, 10, 6);
      ctx.strokeStyle = 'rgba(20,24,28,.6)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, -70); ctx.lineTo(0, 56); ctx.stroke();
      for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(-20 + i * 13, 26, 3, 0, TAU); ctx.fillStyle = '#20252b'; ctx.fill(); }
    });
    for (const [sh, el, ha] of [[J.lsh, J.lel, J.lha], [J.rsh, J.rel, J.rha]]) {
      ctx.fillStyle = '#c9d0d7'; ctx.beginPath(); ctx.ellipse(sh[0], sh[1], 34, 26, 0, 0, TAU); ctx.fill();
      steel(sh, el, 36); steel(el, ha, 32); dot(ctx, el, 16, '#6b747e');
      dot(ctx, ha, 19, '#59616b');
    }
  };

  SK.cat = function (ctx, J, o = {}) {
    const t = o.t || 0, fur = '#f29a3e', furS = '#c96d1f', suit = '#2a2f3a', suitS = '#1b1f27', rim = o.rim || '#ffb27a';
    // tail behind
    const sw = Math.sin(t * 4) * 40;
    ctx.strokeStyle = fur; ctx.lineWidth = 22; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(J.pel[0] + 20, J.pel[1] + 10); ctx.bezierCurveTo(J.pel[0] + 110, J.pel[1] + 30, J.pel[0] + 120 + sw, J.pel[1] - 90, J.pel[0] + 80 + sw * 1.4, J.pel[1] - 150); ctx.stroke();
    ctx.strokeStyle = furS; ctx.lineWidth = 22; ctx.setLineDash([10, 18]); ctx.stroke(); ctx.setLineDash([]);
    limb(ctx, J.lhip, J.lkn, 46, suit, { rim }); limb(ctx, J.lkn, J.lft, 42, suit, { rim });
    limb(ctx, J.rhip, J.rkn, 46, suit, { rim }); limb(ctx, J.rkn, J.rft, 42, suit, { rim });
    shoe(ctx, J.lft, -1, '#0f0f12'); shoe(ctx, J.rft, 1, '#0f0f12');
    inTorso(ctx, J, () => {
      torsoPath(ctx, -150, 72, 56, 62, 6); ctx.fillStyle = suit; ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(-30, -150); ctx.lineTo(0, -70); ctx.lineTo(30, -150); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ff6b1a'; ctx.beginPath(); ctx.moveTo(-7, -142); ctx.lineTo(7, -142); ctx.lineTo(10, -88); ctx.lineTo(0, -76); ctx.lineTo(-10, -88); ctx.closePath(); ctx.fill();
      ctx.fillStyle = suitS; ctx.beginPath(); ctx.moveTo(-30, -150); ctx.lineTo(-6, -84); ctx.lineTo(-40, -110); ctx.closePath(); ctx.moveTo(30, -150); ctx.lineTo(6, -84); ctx.lineTo(40, -110); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = rim; ctx.globalAlpha = .7; ctx.lineWidth = 6; torsoPath(ctx, -150, 72, 56, 62, 6); ctx.stroke(); ctx.globalAlpha = 1;
      ctx.fillStyle = '#e6e6e6'; ctx.beginPath(); ctx.moveTo(-50, -118); ctx.lineTo(-34, -118); ctx.lineTo(-38, -104); ctx.closePath(); ctx.fill(); // pocket square
    });
    limb(ctx, J.chest, J.neck, 30, fur);
    inHead(ctx, J, () => {
      ctx.fillStyle = fur;
      ctx.beginPath(); ctx.moveTo(-58, -20); ctx.lineTo(-48, -86); ctx.lineTo(-10, -52); ctx.closePath(); ctx.moveTo(58, -20); ctx.lineTo(48, -86); ctx.lineTo(10, -52); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ffb3c1'; ctx.beginPath(); ctx.moveTo(-48, -32); ctx.lineTo(-44, -70); ctx.lineTo(-22, -50); ctx.closePath(); ctx.moveTo(48, -32); ctx.lineTo(44, -70); ctx.lineTo(22, -50); ctx.closePath(); ctx.fill();
      ctx.fillStyle = fur; ctx.beginPath(); ctx.ellipse(0, 0, 66, 60, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = furS; for (const x of [-16, 0, 16]) { ctx.beginPath(); ctx.moveTo(x - 5, -60); ctx.lineTo(x + 5, -60); ctx.lineTo(x, -34); ctx.closePath(); ctx.fill(); }
      ctx.beginPath(); ctx.moveTo(-66, -4); ctx.lineTo(-40, 0); ctx.lineTo(-66, 8); ctx.moveTo(66, -4); ctx.lineTo(40, 0); ctx.lineTo(66, 8); ctx.fill();
      ctx.fillStyle = '#fde3c4'; ctx.beginPath(); ctx.ellipse(0, 26, 34, 24, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = rim; ctx.lineWidth = 7; ctx.globalAlpha = .8; ctx.beginPath(); ctx.ellipse(0, 0, 66, 60, 0, -1.2, 1.2); ctx.stroke(); ctx.globalAlpha = 1;
      const f = o.face || J.p.face;
      for (const s of [-1, 1]) {
        ctx.fillStyle = '#b6f07a'; ctx.beginPath(); ctx.ellipse(s * 24, -6, 14, f === 'o' ? 15 : 12, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#111'; ctx.beginPath(); ctx.ellipse(s * 24, -6, f === 'o' ? 7 : 4, 11, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(s * 24 - 4, -11, 3, 0, TAU); ctx.fill();
      }
      ctx.fillStyle = '#ff8fa3'; ctx.beginPath(); ctx.moveTo(-8, 12); ctx.lineTo(8, 12); ctx.lineTo(0, 21); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#3a2416'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, 21); ctx.lineTo(0, 28); ctx.quadraticCurveTo(-8, 36, -14, 30); ctx.moveTo(0, 28); ctx.quadraticCurveTo(8, 36, 14, 30); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 2;
      for (const s of [-1, 1]) for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(s * 26, 24 + i * 6); ctx.lineTo(s * 76, 18 + i * 12); ctx.stroke(); }
    });
    for (const [sh, el, ha] of [[J.lsh, J.lel, J.lha], [J.rsh, J.rel, J.rha]]) {
      limb(ctx, sh, el, 38, suit, { rim }); limb(ctx, el, ha, 34, suit, { rim });
      dot(ctx, ha, 20, fur); ctx.fillStyle = '#fde3c4'; ctx.beginPath(); ctx.arc(ha[0], ha[1] + 4, 9, 0, TAU); ctx.fill();
    }
  };

  SK.hologram = function (ctx, J, o = {}) {
    const t = o.t || 0, cy = '#3de3ff';
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const fl = .75 + .25 * Math.sin(t * 40) * Math.sin(t * 13);
    ctx.globalAlpha = (o.alpha ?? 1) * fl;
    const off = Math.sin(t * 7) * 2;
    ctx.translate(off, 0);
    SK.flat('rgba(61,227,255,0.16)')(ctx, J, o);
    ctx.globalAlpha = (o.alpha ?? 1) * fl * .9;
    const bones = [['lhip', 'lkn'], ['lkn', 'lft'], ['rhip', 'rkn'], ['rkn', 'rft'], ['pel', 'chest'], ['chest', 'neck'], ['lsh', 'lel'], ['lel', 'lha'], ['rsh', 'rel'], ['rel', 'rha'], ['lsh', 'rsh'], ['lhip', 'rhip']];
    ctx.shadowColor = cy; ctx.shadowBlur = 12;
    for (const [a, b] of bones) seg(ctx, [J[a], J[b]], 4, cy);
    for (const k of ['lkn', 'rkn', 'lel', 'rel', 'lha', 'rha', 'lft', 'rft', 'lsh', 'rsh', 'chest', 'pel']) { ctx.strokeStyle = cy; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(J[k][0], J[k][1], 10, 0, TAU); ctx.stroke(); }
    inHead(ctx, J, () => {
      ctx.strokeStyle = cy; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(0, 0, 60, 66, 0, 0, TAU); ctx.stroke();
      ctx.lineWidth = 2; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.ellipse(0, 0, Math.abs(i) * 14 + 4, 66, 0, 0, TAU); ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(-60, 0); ctx.lineTo(60, 0); ctx.moveTo(-50, -34); ctx.lineTo(50, -34); ctx.moveTo(-50, 34); ctx.lineTo(50, 34); ctx.stroke();
    });
    ctx.shadowBlur = 0;
    // scanlines across the figure
    ctx.globalAlpha = .25 * fl; ctx.fillStyle = cy;
    const y0 = J.head[1] - 80, y1 = Math.max(J.lft[1], J.rft[1]) + 20;
    for (let y = y0 + ((t * 120) % 14); y < y1; y += 14) ctx.fillRect(-160 + J.pel[0], y, 320, 2);
    ctx.restore();
  };

  SK.depth = function (ctx, J, o = {}) {
    SK.dave(ctx, J, Object.assign({}, o, { flat: true, palette: { skin: '#e9e9e9', skinS: '#e9e9e9', hair: '#d0d0d0', shirt: '#b5b5b5', shirtS: '#b5b5b5', tie: '#c8c8c8', pants: '#7a7a7a', pantsS: '#7a7a7a', shoes: '#5d5d5d', ink: '#e9e9e9' } }));
    inTorso(ctx, J, () => { const g = ctx.createRadialGradient(0, -80, 10, 0, -80, 110); g.addColorStop(0, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; torsoPath(ctx); ctx.fill(); });
  };

  // OpenPose-style coloured skeleton
  const POSE_BONES = [['neck', 'rsh'], ['rsh', 'rel'], ['rel', 'rha'], ['neck', 'lsh'], ['lsh', 'lel'], ['lel', 'lha'], ['neck', 'pel'], ['pel', 'rhip'], ['rhip', 'rkn'], ['rkn', 'rft'], ['pel', 'lhip'], ['lhip', 'lkn'], ['lkn', 'lft'], ['neck', 'head']];
  SK.pose = function (ctx, J, o = {}) {
    const n = POSE_BONES.length;
    POSE_BONES.forEach(([a, b], i) => {
      const col = `hsl(${(i / n) * 300},100%,55%)`;
      ctx.globalAlpha = .9 * (o.alpha ?? 1);
      seg(ctx, [J[a], J[b]], o.w || 14, col);
      dot(ctx, J[a], (o.w || 14) * .75, col); dot(ctx, J[b], (o.w || 14) * .75, col);
    });
    ctx.globalAlpha = 1;
  };

  // Barista Dave props are drawn in the scene; expose helpers
  window.RIG = { L, FLOOR, BEAT, T0, beatAt, danceAt, solve, SK, MOVES, base, seg, limb, dot, inTorso, inHead, torsoPath };
})();
