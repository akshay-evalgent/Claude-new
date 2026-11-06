// Format 3 — Levels 1 -> 5. Style test: multiply by 11, level 1 (23 x 11) and level 5 (87 x 11, with a carry).
(function () {
  const { C, F } = MG;
  const B = 60 / 123;              // one beat of the music
  const cx = 540, EQ_Y = 960;
  const D = { size: 236, weight: 600, family: F.disp };     // equation digits
  const small = { size: 64, weight: 500, family: F.disp, color: C.mute };

  // one equation "ab × 11": digits split apart, the sum drops in the middle
  function equation(c, t, a, b, t0, tSplit, tDrop, sum, opts = {}) {
    const wa = MG.measure(c, a, D), wb = MG.measure(c, b, D), wx = MG.measure(c, '×', { ...D, weight: 400 }), w11 = MG.measure(c, '11', D);
    const gap = 54, total = wa + wb + gap + wx + gap + w11;
    const x0 = cx - total / 2;
    const s = MG.spring(t - tSplit, 2.0, 0.62);                       // the split
    const exit = opts.tOut != null ? MG.tw(t, opts.tOut, opts.tOut + 0.5, 'inOutExpo') : 0;
    const lift = -exit * 1300;
    // digit a and b: from their places in "ab" to either side of the centre
    const ax = MG.lerp(x0, cx - 150 - wa, s), bx = MG.lerp(x0 + wa, cx + 150, s);
    const drop = (i) => MG.spring(t - (t0 + i * 0.07), 2.6, 0.55);
    const glyph = (str, x, i, o = D, y = EQ_Y + lift) => {
      const k = drop(i); if (k <= 0) return;
      MG.text(c, str, x, y - (1 - k) * 90, { ...o, alpha: MG.clamp(k * 1.6) });
    };
    if (!(opts.carry && t > opts.carry.t0)) glyph(a, ax, 0);
    glyph(b, bx, 1);
    // "× 11" slides down and shrinks to a caption under the equation
    const tailX = MG.lerp(x0 + wa + wb + gap, cx - 90, s), tailY = MG.lerp(EQ_Y, EQ_Y + 190, s), tailS = MG.lerp(1, 0.32, s);
    c.save(); c.translate(tailX, tailY + lift); c.scale(tailS, tailS);
    glyph('×', 0, 2, { ...D, weight: 400, color: C.mute }, 0); glyph('11', wx + gap, 3, { ...D, color: s > 0.5 ? C.mute : C.ink }, 0);
    c.restore();
    // the hint above: "a + b"
    MG.line(c, [{ s: `${a} + ${b}`, o: small }], cx, EQ_Y - 300 + lift, 'center', t, tSplit + 0.25, null, 0, 0.6);
    // the sum drops into the gap
    const k = MG.spring(t - tDrop, 2.2, 0.48);
    if (k > 0) {
      const sumW = MG.measure(c, sum, D);
      let shown = sum, sx = cx - sumW / 2;
      if (opts.carry && t > opts.carry.t0) {  // the 1 has left: the 5 slides to the centre
        const w1 = MG.measure(c, sum[0], D), w5 = MG.measure(c, sum.slice(1), D);
        shown = sum.slice(1);
        sx = MG.lerp(cx - sumW / 2 + w1, cx - w5 / 2, MG.tw(t, opts.carry.t0 + 0.3, opts.carry.t0 + 0.9, 'inOutCubic'));
      }
      MG.text(c, shown, sx, MG.lerp(EQ_Y - 300, EQ_Y, k) + lift, { ...D, color: C.accent, alpha: MG.clamp(k * 2), glow: 28 });
      MG.pulse(c, cx, EQ_Y - 80 + lift, 60, 260, MG.p(t, tDrop + 0.22, tDrop + 0.9), C.accent, 4);
    }
    // level 5: the "1" of "15" lifts off and lands on the left digit, which rolls up by one
    if (opts.carry) {
      const q = MG.tw(t, opts.carry.t0, opts.carry.t0 + 0.55, 'inOutCubic');
      const w15 = MG.measure(c, sum, D), w1 = MG.measure(c, '1', D);
      if (t > opts.carry.t0) {
        const fx = MG.lerp(cx - w15 / 2, ax + wa / 2 - w1 / 2, q), fy = EQ_Y - Math.sin(q * Math.PI) * 260;
        if (q < 1) MG.text(c, '1', fx, fy + lift, { ...D, color: C.accent, glow: 20 });
        const roll = MG.tw(t, opts.carry.t0 + 0.5, opts.carry.t0 + 0.95, 'outExpo');
        MG.counter(c, Number(a) + roll, ax, EQ_Y + lift, { ...D, cols: 1, commas: false, color: roll > 0.5 ? C.accent : C.ink });
        MG.pulse(c, ax + wa / 2, EQ_Y - 80 + lift, 60, 240, MG.p(t, opts.carry.t0 + 0.55, opts.carry.t0 + 1.2), C.accent, 4);
      }
    }
  }

  function badge(c, t, level, tIn, tRoll) {
    const p = MG.tw(t, tIn, tIn + 0.6);
    if (p <= 0) return;
    c.save(); c.globalAlpha = MG.clamp(p * 1.5); c.translate(0, (1 - p) * 30);
    MG.text(c, 'LEVEL', 96, 452, { size: 30, weight: 700, track: 6, color: C.mute });
    const lv = tRoll != null ? 1 + 4 * MG.tw(t, tRoll, tRoll + 0.6, 'inOutExpo') : level;
    MG.counter(c, lv, 96, 560, { size: 104, weight: 600, family: F.disp, cols: 1, color: C.ink });
    MG.text(c, '/5', 170, 560, { size: 48, weight: 500, family: F.disp, color: C.mute });
    // five pills
    for (let i = 0; i < 5; i++) {
      const on = i === 0 ? 1 : tRoll != null ? MG.tw(t, tRoll + 0.08 * i, tRoll + 0.08 * i + 0.4) : 0;
      const x = 984 - (4 - i) * 74 - 56, y = 520;
      MG.rrect(c, x, y, 56, 14, 7); c.fillStyle = C.dim; c.fill();
      if (on > 0) { MG.rrect(c, x, y, 56 * on, 14, 7); c.fillStyle = C.accent; c.fill(); }
    }
    c.restore();
  }

  function timer(c, t, a, b) {
    const p = MG.p(t, a, b); if (p <= 0 || t > b + 0.4) return;
    const fade = 1 - MG.p(t, b, b + 0.3), w = 520;
    c.save(); c.globalAlpha = fade * MG.clamp((t - a) * 4);
    MG.rrect(c, cx - w / 2, EQ_Y + 330, w, 8, 4); c.fillStyle = C.dim; c.fill();
    MG.rrect(c, cx - w / 2, EQ_Y + 330, w * (1 - p), 8, 4); c.fillStyle = p > 0.66 ? C.accent : C.ink; c.fill();
    MG.text(c, `${Math.max(1, Math.ceil(3 * (1 - p)))}s`, cx + w / 2 + 24, EQ_Y + 344, { size: 36, weight: 600, family: F.disp, color: C.mute });
    c.restore();
  }

  window.SCENE = {
    duration: 9.4,
    cues: [
      { t: 0.05, s: 'whoosh', g: 0.7 }, { t: 0.95, s: 'swish', g: 0.6 }, { t: 1.2, s: 'click' }, { t: 1.27, s: 'click' }, { t: 1.34, s: 'click' }, { t: 1.41, s: 'click' },
      { t: 1.95, s: 'tick' }, { t: 2.44, s: 'tick' }, { t: 2.93, s: 'tick' }, { t: 3.3, s: 'riser', g: 0.5 }, { t: 3.41, s: 'swish' },
      { t: 4.12, s: 'impact' }, { t: 4.14, s: 'ding', g: 0.6 }, { t: 5.37, s: 'whoosh', g: 0.8 },
      { t: 5.6, s: 'click' }, { t: 5.67, s: 'click' }, { t: 5.74, s: 'click' }, { t: 5.81, s: 'click' }, { t: 6.34, s: 'swish' },
      { t: 6.83, s: 'impact', g: 0.7 }, { t: 7.32, s: 'swish', g: 0.5 }, { t: 7.85, s: 'impact' }, { t: 7.87, s: 'ding', g: 0.8 },
      { t: 8.3, s: 'pop', g: 0.6 },
    ],
    draw(c, t) {
      MG.ground(c, t);
      MG.tag(c, 'MENTAL MATH · LEVELS', 96, 300, MG.tw(t, 0.0, 0.6), { dot: true });
      // title
      MG.line(c, [{ s: 'MULTIPLY', o: { size: 132, weight: 800, track: -4 } }], cx, 900, 'center', t, 0.05, 0.95);
      MG.line(c, [{ s: 'by', o: { size: 150, weight: 400, family: F.serif, italic: true, color: C.mute } },
                  { s: '11', o: { size: 210, weight: 600, family: F.disp, color: C.accent } }], cx, 1110, 'center', t, 0.15, 1.0, 0.08);
      // level 1 then level 5
      badge(c, t, 1, 1.05, 5.37);
      if (t < 6.0) equation(c, t, '2', '3', 1.2, 3.41, 3.9, '5', { tOut: 5.37 });
      timer(c, t, 1.6, 3.35);
      if (t > 5.5) equation(c, t, '8', '7', 5.6, 6.34, 6.6, '15', { carry: { t0: 7.32 } });
      MG.line(c, [{ s: 'split', o: { size: 44, weight: 500, color: C.mute } }, { s: '·', o: { size: 44, color: C.dim } },
                  { s: 'add', o: { size: 44, weight: 500, color: C.mute } }, { s: '·', o: { size: 44, color: C.dim } },
                  { s: 'drop it in', o: { size: 44, weight: 500, color: C.ink } }], cx, 1400, 'center', t, 4.4, 5.37, 0.05);
      MG.line(c, [{ s: 'carry the', o: { size: 44, weight: 500, color: C.mute } }, { s: '1', o: { size: 44, weight: 700, color: C.accent } }],
              cx, 1400, 'center', t, 7.5, null, 0.06);
      // your turn
      const yt = MG.tw(t, 8.3, 8.9);
      if (yt > 0) {
        MG.line(c, [{ s: 'Your turn:', o: { size: 64, weight: 400, family: F.serif, italic: true, color: C.mute } },
                    { s: '64 × 11', o: { size: 64, weight: 600, family: F.disp } }], cx, 1500, 'center', t, 8.3, null, 0.08);
      }
    },
  };
})();
