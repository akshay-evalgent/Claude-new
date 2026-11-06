// Format 4 — Feel the number. Style test: a million seconds vs a billion seconds.
(function () {
  const { C, F } = MG;
  const cx = 540;
  const NUM = { weight: 600, family: F.disp };
  const TL = { x0: 150, x1: 930, y: 1250, years: 31.7 };
  const yx = (yr) => TL.x0 + (TL.x1 - TL.x0) * yr / TL.years;

  function days(c, t) {
    // twelve day-squares fill one by one; the twelfth only 60%
    const n = 12, s = 56, g = 14, w = n * s + (n - 1) * g, x0 = cx - w / 2, y = 1180;
    const collapse = MG.tw(t, 3.9, 4.5, 'inOutExpo');
    if (collapse >= 1) return;
    for (let i = 0; i < n; i++) {
      const p = MG.spring(t - (1.62 + i * 0.065), 3, 0.6);
      if (p <= 0) continue;
      let x = x0 + i * (s + g), yy = y;
      // collapse into a speck at the start of the timeline
      x = MG.lerp(x, TL.x0 - 4, collapse); yy = MG.lerp(yy, TL.y - 4, collapse);
      const ss = MG.lerp(s, 8, collapse) * MG.clamp(p);
      c.save(); c.globalAlpha = 1 - collapse * 0.3;
      MG.rrect(c, x, yy, ss, ss, Math.min(10, ss / 3)); c.fillStyle = C.dim; c.fill();
      const fill = i === n - 1 ? 0.6 : 1;
      MG.rrect(c, x, yy + ss * (1 - fill), ss, ss * fill, Math.min(10, ss / 3)); c.fillStyle = C.accent; c.globalAlpha *= 0.9; c.fill();
      c.restore();
    }
    const lp = MG.tw(t, 2.3, 2.9) * (1 - collapse);
    if (lp > 0) {
      MG.text(c, 'day 1', x0, y + s + 50, { size: 30, weight: 500, color: C.mute, alpha: lp });
      MG.text(c, 'day 12', x0 + w, y + s + 50, { size: 30, weight: 500, color: C.mute, alpha: lp, align: 'right' });
    }
  }

  function timeline(c, t) {
    const p = MG.tw(t, 4.3, 5.4, 'outExpo');
    if (p <= 0) return;
    c.save();
    c.strokeStyle = C.line; c.lineWidth = 3; c.lineCap = 'round';
    c.beginPath(); c.moveTo(TL.x0, TL.y); c.lineTo(MG.lerp(TL.x0, TL.x1, p), TL.y); c.stroke();
    [0, 10, 20, 30].forEach((yr, i) => {
      const q = MG.tw(t, 4.5 + i * 0.12, 5.0 + i * 0.12);
      if (q <= 0) return;
      c.globalAlpha = q; c.strokeStyle = C.line; c.lineWidth = 2;
      c.beginPath(); c.moveTo(yx(yr), TL.y - 14); c.lineTo(yx(yr), TL.y + 14); c.stroke();
      MG.text(c, yr === 30 ? '30 yrs' : String(yr), yx(yr), TL.y + 66, { size: 32, weight: 500, family: F.disp, color: C.mute, align: 'center' });
    });
    c.globalAlpha = 1;
    // the bar of a billion seconds
    const b = MG.tw(t, 4.9, 6.3, 'inOutExpo');
    if (b > 0) {
      c.strokeStyle = C.accent; c.lineWidth = 10; c.shadowColor = C.accent; c.shadowBlur = 22;
      c.beginPath(); c.moveTo(TL.x0, TL.y); c.lineTo(MG.lerp(TL.x0, yx(31.7), b), TL.y); c.stroke();
      c.shadowBlur = 0;
      c.fillStyle = C.accent; c.beginPath(); c.arc(MG.lerp(TL.x0, yx(31.7), b), TL.y, 12, 0, Math.PI * 2); c.fill();
    }
    // the million, now a speck: a leader line and a label
    const lp = MG.tw(t, 5.2, 5.8);
    if (lp > 0) {
      c.globalAlpha = lp; c.strokeStyle = C.mute; c.lineWidth = 2;
      c.beginPath(); c.moveTo(TL.x0, TL.y - 18); c.lineTo(TL.x0, TL.y - 110); c.lineTo(TL.x0 + 40, TL.y - 110); c.stroke();
      MG.text(c, 'a million = this speck', TL.x0 + 56, TL.y - 100, { size: 34, weight: 500, color: C.mute });
    }
    c.restore();
  }

  window.SCENE = {
    duration: 9.0,
    cues: [
      { t: 0.05, s: 'whoosh', g: 0.6 }, { t: 0.2, s: 'roll', g: 0.7 }, { t: 1.25, s: 'impact', g: 0.6 },
      { t: 1.46, s: 'swish', g: 0.5 }, ...Array.from({ length: 12 }, (_, i) => ({ t: 1.62 + i * 0.065, s: 'tick', g: 0.45 })),
      { t: 3.41, s: 'whoosh', g: 0.6 }, { t: 3.9, s: 'roll', g: 0.9 }, { t: 3.9, s: 'riser', g: 0.6 }, { t: 5.6, s: 'impact' },
      { t: 4.3, s: 'swish', g: 0.5 }, { t: 6.3, s: 'ding', g: 0.6 }, { t: 7.0, s: 'whoosh', g: 0.6 }, { t: 7.0, s: 'impact', g: 0.5 },
    ],
    draw(c, t) {
      MG.ground(c, t);
      MG.tag(c, 'FEEL THE NUMBER', 96, 300, MG.tw(t, 0.0, 0.6), { dot: true });
      // the counter: 0 -> 1,000,000, later -> 1,000,000,000 (it shrinks as it grows)
      const v1 = 1e6 * MG.tw(t, 0.2, 1.25, 'outExpo');
      const grow = MG.tw(t, 3.9, 5.6, 'inOutExpo');
      const value = grow > 0 ? 1e6 * Math.pow(1000, grow) : v1;
      const size = MG.lerp(176, 122, MG.tw(t, 3.6, 4.1, 'inOutCubic'));  // shrinks before it grows, so a billion fits
      const cin = MG.tw(t, 0.12, 0.6);
      if (cin > 0) {
        c.save(); c.globalAlpha = cin; c.translate(0, (1 - cin) * 40);
        MG.counter(c, value, cx, 720, { ...NUM, size, cols: t > 3.6 ? 10 : 7, align: 'center', color: C.ink });
        c.restore();
      }
      MG.line(c, [{ s: 'seconds', o: { size: 100, weight: 400, family: F.serif, italic: true, color: C.mute } }], cx, 850, 'center', t, 0.55, null);
      // = 11.6 days
      const dIn = MG.tw(t, 1.46, 2.2), dOut = MG.tw(t, 3.9, 4.4, 'inOutExpo');
      if (dIn > 0 && dOut < 1) {
        c.save(); c.globalAlpha = (1 - dOut) * MG.clamp(dIn * 1.5); c.translate(0, -dOut * 60);
        MG.text(c, '=', 150, 1070, { size: 80, weight: 400, family: F.disp, color: C.mute });
        const w = MG.counter(c, 11.6 * dIn, 610, 1080, { ...NUM, size: 150, decimals: 1, cols: 2, align: 'right', color: C.accent, glow: 24 });
        MG.text(c, 'days', 636, 1080, { size: 104, weight: 400, family: F.serif, italic: true, color: C.ink });
        c.restore();
      }
      days(c, t);
      // now a billion
      MG.line(c, [{ s: 'Now,', o: { size: 96, weight: 400, family: F.serif, italic: true, color: C.mute } },
                  { s: 'a billion.', o: { size: 96, weight: 400, family: F.serif, italic: true, color: C.ink } }], cx, 1500, 'center', t, 3.41, 5.9, 0.1);
      // = 31.7 years
      const yIn = MG.tw(t, 5.6, 6.4);
      if (yIn > 0) {
        MG.counter(c, 31.7 * yIn, 640, 1060, { ...NUM, size: 160, decimals: 1, cols: 2, align: 'right', color: C.accent, glow: 26 });
        MG.line(c, [{ s: 'years', o: { size: 110, weight: 400, family: F.serif, italic: true } }], 664, 1060, 'left', t, 5.75, null);
      }
      timeline(c, t);
      // the takeaway
      MG.line(c, [{ s: '1,000×', o: { size: 84, weight: 800, track: -2, color: C.accent } },
                  { s: 'more.', o: { size: 84, weight: 800, track: -2 } }], cx, 1470, 'center', t, 7.0, null, 0.08);
      MG.line(c, [{ s: 'Not "a bit more".', o: { size: 64, weight: 400, family: F.serif, italic: true, color: C.mute } }], cx, 1555, 'center', t, 7.35, null);
    },
  };
})();
