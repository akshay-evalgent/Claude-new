/* hud.js: the words of the low-poly first-person kit.
 *
 * Two counter blocks at the top (the quantity that runs away on the left, your
 * own clock on the right) and one line near the bottom. Everything is set from
 * values; nothing here knows the time.
 *
 *   const hud = LowPoly.Hud.mount(document.getElementById('hud'));
 *   hud.set({
 *     label: 'YOUR TEMPERATURE',
 *     figure: LowPoly.Hud.figure(5510),                  // '5,510 °C'; see figure() below
 *     compare: "HOTTER THAN THE SUN'S SURFACE",          // split after THAN (or AS ... AS) into two rows
 *     next: { event: "THE SUN'S CORE", countdown: 'in 15 million °C' },
 *     clockLabel: 'YOU HAVE BEEN HEATING UP FOR',        // split into two rows
 *     clock: LowPoly.Hud.clock(25.0),                    // '25.0 s'
 *     clockRow: 'REAL NUMBERS. PRETEND BODY.',           // one sentence a row
 *     tag: '',                                           // 'SOURCES IN THE DESCRIPTION' in the close
 *     look: state.words,                                 // from world.set(): ink and scrims for this frame
 *   });
 *   hud.line({ kind: 'story', rows: ['Red is the coolest', 'glow there is.'], opacity: 1 });
 *   hud.line(null);                                       // no line
 *   hud.title(['What If You Got Hotter', 'and Couldn’t Stop?'], 1);
 *
 * kind: 'story' (italic), 'statement' (upright, heavier: the cold open).
 * A row wider than --lp-line-max is scaled down to fit, so a reworded line
 * cannot run under the Shorts buttons.
 *
 *   LowPoly.Hud.figure(tempC)        the large figure in the form the script sets for that range
 *   LowPoly.Hud.amount(deltaC)       the same forms without the unit change, for countdowns
 *   LowPoly.Hud.clock(seconds)       '25.0 s'
 *   LowPoly.logTemp(keys, filmS)     temperature at a film time from [[s, °C], ...], straight in the logarithm
 */
(function () {
  'use strict';
  const LP = (window.LowPoly = window.LowPoly || {});
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const comma = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  /* 16 million, 4.0 trillion, 290 billion: one decimal under ten, else whole. */
  function words(v) {
    const names = [[1e12, 'trillion'], [1e9, 'billion'], [1e6, 'million']];
    for (const [k, name] of names) {
      if (v >= k * 0.9995) {
        const m = v / k;
        return (m < 9.95 ? m.toFixed(1) : m < 99.5 ? String(Math.round(m)) : String(Math.round(m / 10) * 10)) + ' ' + name;
      }
    }
    return comma(v);
  }

  /* The large temperature figure. Forms, by range (script clock.figure_forms):
     one decimal to 100; whole degrees to 1,000; a comma to a million; words to
     10 trillion; then powers of ten in kelvin. `edge` writes the last figure,
     1.4 x 10^32 K with its question mark. */
  function figure(tempC, opt) {
    opt = opt || {};
    if (opt.edge) return '1.4 × 10<sup>32</sup> K<span class="lp-q"' + (opt.q != null ? ' style="opacity:' + opt.q + '"' : '') + '>?</span>';
    const powersFrom = opt.powersFrom || 1e13;
    if (tempC >= powersFrom) return '10<sup>' + Math.floor(Math.log10(tempC + 273.15) + 1e-9) + '</sup> K';
    return amount(tempC) + ' °C';
  }
  function amount(v) {
    if (v < 99.95) return v.toFixed(1);
    if (v < 999.5) return String(Math.round(v));
    if (v < 999500) return comma(v);
    return words(v);
  }
  const clock = (s) => Math.max(0, s).toFixed(1) + ' s';

  function logTemp(keys, t) {
    if (t <= keys[0][0]) return keys[0][1];
    for (let i = 1; i < keys.length; i++) {
      if (t <= keys[i][0]) {
        const [t0, a] = keys[i - 1], [t1, b] = keys[i];
        const p = (t - t0) / (t1 - t0);
        return Math.pow(10, Math.log10(a) + (Math.log10(b) - Math.log10(a)) * p);
      }
    }
    return keys[keys.length - 1][1];
  }

  function splitCompare(s) {
    const m = /^((?:HOTTER|COLDER|WARMER|BRIGHTER) THAN|AS \w+ AS)\s+(.+)$/i.exec(s || '');
    return m ? [m[1], m[2]] : ['', s || ''];
  }
  function splitHalf(s) {
    if (Array.isArray(s)) return s;
    const w = String(s || '').split(' ');
    if (w.length < 3) return [s];
    let best = 1, bestD = 1e9;
    for (let i = 1; i < w.length; i++) {
      const d = Math.abs(w.slice(0, i).join(' ').length - w.slice(i).join(' ').length);
      if (d < bestD) { bestD = d; best = i; }
    }
    return [w.slice(0, best).join(' '), w.slice(best).join(' ')];
  }
  const sentences = (s) => (Array.isArray(s) ? s : String(s || '').match(/[^.!?]+[.!?]*/g) || []).map((x) => x.trim()).filter(Boolean);

  function mount(el) {
    el.classList.add('lp-hud');
    el.innerHTML =
      '<div class="lp-top-scrim"></div>' +
      '<div class="lp-block lp-temp">' +
        '<div class="lp-label" data-k="label"></div><div class="lp-figure" data-k="figure"></div>' +
        '<div class="lp-row lp-compare" data-k="compare"></div><div class="lp-rule"></div>' +
        '<div class="lp-row lp-next" data-k="next"></div><div class="lp-countdown" data-k="countdown"></div>' +
      '</div>' +
      '<div class="lp-block lp-clock">' +
        '<div class="lp-label" data-k="clockLabel"></div><div class="lp-figure" data-k="clock"></div>' +
        '<div class="lp-row" data-k="clockRow"></div><div class="lp-row lp-tag" data-k="tag"></div>' +
      '</div>' +
      '<div class="lp-title" data-k="title"></div>' +
      '<div class="lp-line" data-k="line"></div>' +
      // every face is asked for at once, so a frame is never drawn in a fallback font
      '<div style="position:absolute;left:0;top:0;opacity:0;white-space:nowrap">' +
        '<span style="font:500 20px var(--lp-serif)">0</span><span style="font:italic 500 20px var(--lp-serif)">a</span>' +
        '<span style="font:600 20px var(--lp-sans)">A</span><span style="font:500 20px var(--lp-sans)">A</span></div>';
    const part = {};
    el.querySelectorAll('[data-k]').forEach((n) => { part[n.dataset.k] = n; });
    const last = {};
    const put = (k, html) => { if (last[k] !== html) { last[k] = html; part[k].innerHTML = html; } };
    const rows = (list) => list.map((r) => '<span>' + esc(r) + '</span>').join('');
    const br = (list) => list.map(esc).join('<br>');

    const hud = {
      el,
      set(o) {
        if (o.label != null) put('label', esc(o.label));
        if (o.figure != null) put('figure', o.figure);
        if (o.compare != null) {
          const [lead, thing] = splitCompare(o.compare);
          put('compare', (lead ? '<span class="lp-lead">' + esc(lead) + '</span>' : '') + '<span class="lp-thing">' + esc(thing) + '</span>');
        }
        if (o.next != null) {
          put('next', '<span class="lp-lead">NEXT</span><span class="lp-thing">' + esc(o.next.event || '') + '</span>');
          put('countdown', o.next.countdown || '');
        }
        if (o.clockLabel != null) put('clockLabel', br(splitHalf(o.clockLabel)));
        if (o.clock != null) put('clock', esc(o.clock));
        if (o.clockRow != null) put('clockRow', br(sentences(o.clockRow)));
        if (o.tag != null) put('tag', o.tag ? br(splitHalf(o.tag)) : '');
        if (o.look) {
          el.dataset.counters = o.look.counters; el.dataset.line = o.look.line;
          el.style.setProperty('--lp-top-scrim', o.look.topScrim.toFixed(3));
          el.style.setProperty('--lp-line-scrim', o.look.lineScrim.toFixed(3));
        }
        return hud;
      },
      line(o) {
        if (!o || !o.rows || !o.rows.length) { put('line', ''); return hud; }
        const n = part.line;
        put('line', rows(o.rows));
        if (n.dataset.kind !== (o.kind || 'story')) { n.dataset.kind = o.kind || 'story'; last.fit = null; }
        const key = o.rows.join('|') + n.dataset.kind + (document.fonts && document.fonts.status);
        if (last.fit !== key) {            // scale a row that is too wide; measured once per line
          last.fit = key; n.style.fontSize = '';
          const max = parseFloat(getComputedStyle(el).getPropertyValue('--lp-line-max')) || 820;
          let widest = 0;
          n.querySelectorAll('span').forEach((s) => {
            const r = document.createRange(); r.selectNodeContents(s);
            widest = Math.max(widest, r.getBoundingClientRect().width);
          });
          if (widest > max) n.style.fontSize = (parseFloat(getComputedStyle(n).fontSize) * max / widest).toFixed(2) + 'px';
        }
        n.style.opacity = o.opacity == null ? 1 : o.opacity;
        return hud;
      },
      title(list, opacity) {
        put('title', list && list.length ? rows(list) : '');
        part.title.style.opacity = opacity == null ? 1 : opacity;
        return hud;
      },
      /* Key frames and contrast checks: hide the words, keep the scrims. */
      bare(on) { if (on) el.dataset.bare = '1'; else delete el.dataset.bare; return hud; },
      part,
    };
    return hud;
  }

  LP.Hud = { mount, figure, amount, clock, words };
  LP.logTemp = logTemp;
})();
