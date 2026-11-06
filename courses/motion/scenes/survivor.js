// Format 5 — Thinking tools. Style test: survivorship bias (the planes that came back).
(function () {
  const { C, F } = MG;
  const cx = 540, cy = 990, S = 1.12;

  // a clean top-view plane, nose up, in plane units (scaled by S around cx, cy)
  const P = new Path2D();
  P.addPath(new Path2D('M 0 -340 C 30 -330 34 -290 34 -240 L 34 240 C 34 290 22 330 0 348 C -22 330 -34 290 -34 240 L -34 -240 C -34 -290 -30 -330 0 -340 Z'));
  P.addPath(new Path2D('M -30 -70 L -340 55 L -340 92 L -30 52 Z'));
  P.addPath(new Path2D('M 30 -70 L 340 55 L 340 92 L 30 52 Z'));
  P.addPath(new Path2D('M -30 245 L -140 300 L -140 324 L -30 300 Z'));
  P.addPath(new Path2D('M 30 245 L 140 300 L 140 324 L 30 300 Z'));
  const ENG = [[-160, -5], [160, -5]];
  const COCKPIT = [0, -270];
  // bullet holes on the planes that returned: wings, fuselage middle, tail — never engines or cockpit
  const r = MG.rng(9);
  const HOLES = [];
  const wingPt = (side) => { const u = 0.12 + r() * 0.85; const x = side * (40 + u * 290); const y = MG.lerp(-55, 62, u) + (r() - 0.3) * 22; return [x, y]; };
  for (let i = 0; i < 9; i++) { const p = wingPt(-1); if (Math.abs(p[0] + 160) > 46) HOLES.push(p); }
  for (let i = 0; i < 9; i++) { const p = wingPt(1); if (Math.abs(p[0] - 160) > 46) HOLES.push(p); }
  for (let i = 0; i < 7; i++) HOLES.push([(r() - 0.5) * 36, -110 + r() * 300]);
  for (let i = 0; i < 4; i++) { const s = i % 2 ? 1 : -1; HOLES.push([s * (50 + r() * 75), 288 + r() * 18]); }
  HOLES.sort((a, b) => a[1] - b[1]);

  const pt = (x, y) => [cx + x * S, cy + y * S];

  function plane(c, t) {
    const draw = MG.tw(t, 1.3, 2.4, 'inOutCubic'), fill = MG.tw(t, 2.0, 2.7);
    if (draw <= 0) return;
    c.save(); c.translate(cx, cy); c.scale(S, S);
    if (fill > 0) { c.globalAlpha = fill; c.fillStyle = '#171A22'; c.fill(P); c.globalAlpha = 1; }
    MG.drawOn(c, P, 4200, draw, { color: C.ink, width: 3 / S });
    // engines
    ENG.forEach(([x, y], i) => {
      const e = MG.tw(t, 2.1 + i * 0.1, 2.6 + i * 0.1); if (e <= 0) return;
      c.globalAlpha = e; c.beginPath(); c.ellipse(x, y, 22, 50, 0, 0, Math.PI * 2);
      c.fillStyle = '#171A22'; c.fill(); c.strokeStyle = C.ink; c.lineWidth = 3 / S; c.stroke(); c.globalAlpha = 1;
    });
    c.restore();
  }

  function holes(c, t) {
    const dim = MG.tw(t, 5.4, 5.9);
    HOLES.forEach(([x, y], i) => {
      const t0 = 2.5 + i * 0.04, k = MG.spring(t - t0, 3.2, 0.45);
      if (k <= 0) return;
      const [X, Y] = pt(x, y);
      c.save(); c.globalAlpha = 1 - dim * 0.75;
      c.fillStyle = C.accent; c.shadowColor = C.accent; c.shadowBlur = 14 * (1 - dim);
      c.beginPath(); c.arc(X, Y, 9 * MG.clamp(k, 0, 1.4), 0, Math.PI * 2); c.fill();
      c.restore();
      MG.pulse(c, X, Y, 8, 40, MG.p(t, t0, t0 + 0.6), C.accent, 2);
    });
  }

  function twist(c, t) {
    const g = MG.tw(t, 5.5, 6.1);
    if (g <= 0) return;
    const spots = [ENG[0], ENG[1], COCKPIT];
    spots.forEach(([x, y], i) => {
      const [X, Y] = pt(x, y);
      const grad = c.createRadialGradient(X, Y, 0, X, Y, 120);
      grad.addColorStop(0, `rgba(91,228,155,${0.45 * g})`); grad.addColorStop(1, 'rgba(91,228,155,0)');
      c.fillStyle = grad; c.beginPath(); c.arc(X, Y, 120, 0, Math.PI * 2); c.fill();
      for (let k = 0; k < 3; k++) MG.pulse(c, X, Y, 30, 130, MG.p(t, 5.6 + k * 0.6 + i * 0.08, 6.4 + k * 0.6 + i * 0.08), C.good, 3);
    });
    // leader labels
    const lp = MG.tw(t, 5.95, 6.5);
    if (lp > 0) {
      c.save(); c.globalAlpha = lp; c.strokeStyle = C.good; c.lineWidth = 2;
      const [ex, ey] = pt(160, -5);
      c.beginPath(); c.moveTo(ex + 34, ey - 50); c.lineTo(ex + 80, ey - 150); c.lineTo(ex + 150, ey - 150); c.stroke();
      MG.text(c, 'no holes', ex + 160, ey - 140, { size: 34, weight: 600, color: C.good });
      const [kx, ky] = pt(0, -270);
      c.beginPath(); c.moveTo(kx + 26, ky - 10); c.lineTo(kx + 110, ky - 60); c.lineTo(kx + 170, ky - 60); c.stroke();
      MG.text(c, 'no holes', kx + 180, ky - 50, { size: 34, weight: 600, color: C.good });
      c.restore();
    }
  }

  function highlightWings(c, t) {
    const h = MG.tw(t, 4.2, 4.8) * (1 - MG.tw(t, 5.3, 5.6));
    if (h <= 0) return;
    [[-190, 15], [190, 15]].forEach(([x, y]) => {
      const [X, Y] = pt(x, y);
      const grad = c.createRadialGradient(X, Y, 0, X, Y, 200);
      grad.addColorStop(0, `rgba(255,90,54,${0.25 * h})`); grad.addColorStop(1, 'rgba(255,90,54,0)');
      c.fillStyle = grad; c.beginPath(); c.arc(X, Y, 200, 0, Math.PI * 2); c.fill();
    });
    MG.text(c, 'here?', pt(-250, -80)[0], pt(-250, -80)[1], { size: 54, weight: 400, family: F.serif, italic: true, color: C.accent, alpha: h, align: 'center' });
  }

  window.SCENE = {
    duration: 9.2,
    cues: [
      { t: 0.05, s: 'whoosh', g: 0.7 }, { t: 1.2, s: 'swish', g: 0.6 }, { t: 1.3, s: 'draw', g: 0.6 },
      ...HOLES.map((_, i) => ({ t: 2.5 + i * 0.04, s: 'tick', g: i % 3 ? 0.25 : 0.5 })),
      { t: 3.9, s: 'whoosh', g: 0.5 }, { t: 4.2, s: 'riser', g: 0.5 }, { t: 5.37, s: 'impact' }, { t: 5.5, s: 'ding', g: 0.5 },
      { t: 6.3, s: 'swish', g: 0.5 }, { t: 7.4, s: 'whoosh', g: 0.6 }, { t: 7.9, s: 'pop', g: 0.5 },
    ],
    draw(c, t) {
      MG.ground(c, t);
      MG.tag(c, 'THINKING TOOLS · 1/7', 96, 300, MG.tw(t, 0.0, 0.6), { dot: true });
      MG.line(c, [{ s: 'SURVIVORSHIP', o: { size: 104, weight: 800, track: -3 } }], cx, 900, 'center', t, 0.05, 1.2);
      MG.line(c, [{ s: 'bias', o: { size: 220, weight: 400, family: F.serif, italic: true, color: C.accent } }], cx, 1100, 'center', t, 0.18, 1.25);
      highlightWings(c, t);
      plane(c, t);
      holes(c, t);
      twist(c, t);
      // the words underneath, one line at a time
      MG.line(c, [{ s: 'Where would you add armor?', o: { size: 74, weight: 400, family: F.serif, italic: true } }], cx, 1520, 'center', t, 3.75, 4.85);
      const w = MG.spring(t - 5.37, 3, 0.5);
      if (w > 0 && t < 6.25) {
        c.save(); c.translate(cx, 1500); const s = MG.lerp(1.6, 1, MG.clamp(w, 0, 1.2)); c.scale(s, s);
        MG.text(c, 'Wrong.', 0, 0, { size: 110, weight: 800, track: -3, color: C.accent, align: 'center', alpha: MG.clamp(w * 2) * (1 - MG.tw(t, 6.05, 6.25)) });
        c.restore();
      }
      MG.line(c, [{ s: 'Planes hit there', o: { size: 60, weight: 600 } }, { s: 'never came back.', o: { size: 60, weight: 600, color: C.good } }],
              cx, 1510, 'center', t, 6.3, 7.3, 0.08);
      MG.line(c, [{ s: 'You only see the', o: { size: 62, weight: 600 } }], cx, 1460, 'center', t, 7.45, null);
      MG.line(c, [{ s: 'survivors.', o: { size: 120, weight: 400, family: F.serif, italic: true, color: C.accent } }], cx, 1580, 'center', t, 7.6, null);
      const u = MG.tw(t, 8.1, 8.7, 'inOutCubic');
      if (u > 0) { c.save(); c.strokeStyle = C.accent; c.lineWidth = 5; c.lineCap = 'round'; c.beginPath(); c.moveTo(cx - 230, 1612); c.lineTo(cx - 230 + 460 * u, 1612); c.stroke(); c.restore(); }
    },
  };
})();
