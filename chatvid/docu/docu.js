/* Documentary engine. boot(episode) lays the beats end to end using the timings from
   tools/docu_prepare.py and returns {duration, cues, music}; renderAt(T) draws time T.
   Everything is a pure function of time, so frames can be rendered in any order. */
(() => {
  const W = 1920, H = 1080, FPS = 30;
  const $ = (id) => document.getElementById(id);
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const lerp = (a, b, p) => a + (b - a) * p;
  const EASE = {
    inOut: (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2),
    out: (p) => 1 - Math.pow(1 - p, 3),
    outBack: (p) => { const c1 = 1.7, c3 = c1 + 1; return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2); },
  };
  const seg = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
  const isEmoji = (g) => /\p{Extended_Pictographic}/u.test(g);
  const ekey = (g) => Array.from(g).map((c) => c.codePointAt(0)).filter((c) => c !== 0xfe0f).map((c) => c.toString(16)).join('-');
  const esc = (s) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const rich = (s) => Array.from(seg.segment(s), (x) => x.segment)
    .map((g) => (isEmoji(g) ? `<img src="../assets/emoji/${ekey(g)}.png" style="height:1.05em;vertical-align:-0.15em">` : esc(g))).join('');

  let EP, LEAD, B = [], endStart = Infinity, duration = 0, pending = [], grainOk = false;
  const meta = (k) => (EP.__mediaMeta && EP.__mediaMeta[k]) || null;
  const credit = (k) => (EP.__credits && EP.__credits[k]) || null;
  const setSrc = (el, src) => {
    if (el.dataset.src !== src) { el.src = src; el.dataset.src = src; pending.push(el.decode().catch(() => {})); }
  };
  const frameSrc = (k, i) => `../assets/media/${k}/f${String(i + 1).padStart(4, '0')}.${meta(k).ext}`;

  // subtitle chunks: at most ~44 characters, timed in proportion to their length
  function subtitleChunks(line, t0, dur) {
    const words = line.split(/\s+/), out = []; let cur = '';
    for (const w of words) {
      if (cur && (cur + ' ' + w).length > 44) { out.push(cur); cur = w; } else cur = cur ? cur + ' ' + w : w;
    }
    if (cur) out.push(cur);
    const total = out.reduce((a, c) => a + c.length, 0);
    let t = t0;
    return out.map((c) => { const d = (dur * c.length) / total; const r = { text: c, t0: t, t1: t + d }; t += d; return r; });
  }

  function grain() {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const g = c.getContext('2d'), img = g.createImageData(256, 256);
    let s = 7;
    for (let i = 0; i < img.data.length; i += 4) {
      s = (s * 1103515245 + 12345) & 0x7fffffff; const v = s % 256;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    $('grain').style.backgroundImage = `url(${c.toDataURL()})`;
    $('grain').style.backgroundSize = '512px 512px';
    grainOk = true;
  }

  window.boot = async (ep) => {
    EP = ep; LEAD = (ep.__plan && ep.__plan.lead) || 0.3;
    const plan = ep.__plan.beats, slug = ep.__slug, cues = [];
    let t = 0;
    ep.beats.forEach((b, i) => {
      const p = plan[i], d = p.dur;
      const beat = { ...b, i, t0: t, t1: t + d, media: p.media, voiceDur: p.voiceDur || 0, subs: [] };
      if (b.freeze) beat.freeze = { ...b.freeze, at: b.freeze.at === 'end' ? LEAD + (p.voiceDur || 0) + 0.05 : b.freeze.at };
      if (p.voice) {
        cues.push({ t: t + LEAD, s: `@voice:${slug}/${p.voice}`, g: 0, duck: true });
        if (!b.noSubs) beat.subs = subtitleChunks(b.line, t + LEAD, p.voiceDur);
      }
      if (b.title) {
        cues.push({ t: Math.max(0, t - 1.4), s: '@riser', dur: 1.4, g: -14 });
        cues.push({ t: t + 0.02, s: 'boom', g: -9, duck: true });
      }
      if (b.chapter) cues.push({ t: t + 0.02, s: 'soft-swoosh', g: -12 });
      if (beat.freeze) cues.push({ t: t + beat.freeze.at, s: beat.freeze.sfx || 'glitch', g: -7, duck: true });
      if (b.sfx) cues.push({ t: t + (b.sfxAt ?? LEAD + p.voiceDur), s: b.sfx, g: b.sfxGain ?? -6, duck: true });
      if (b.media && b.audio && meta(b.media) && meta(b.media).audio) {
        cues.push({ t, s: '@media:' + b.media, g: b.audioGain ?? -10, dur: d });
      }
      B.push(beat);
      t += d;
    });
    if (ep.endCard) {
      endStart = t;
      t += ep.endCard.dur ?? 4;
      cues.push({ t: endStart, s: 'soft-swoosh', g: -10 });
      $('ecKicker').textContent = ep.endCard.kicker || 'NEXT EPISODE';
      $('ecText').innerHTML = rich(ep.endCard.text || '');
      $('ecSub').innerHTML = rich(ep.endCard.sub || '');
    }
    duration = t;
    grain();
    await document.fonts.ready;
    const music = ep.music ? { tracks: [].concat(ep.music.tracks || ep.music.track), gain: ep.music.gain ?? -20, start: 0, end: duration } : null;
    return { duration, cues: cues.sort((a, b) => a.t - b.t), music, mainStart: 0, exchanges: B.map((b) => +b.t0.toFixed(2)) };
  };

  const show = (id, on) => { $(id).style.display = on ? (['card', 'endcard'].includes(id) ? 'flex' : 'block') : 'none'; };
  const tc = (T) => {
    const f = Math.floor(T * FPS), s = Math.floor(f / FPS);
    const p = (n) => String(n).padStart(2, '0');
    return `${p(Math.floor(s / 3600))}:${p(Math.floor(s / 60) % 60)}:${p(s % 60)}:${p(f % FPS)}`;
  };

  window.renderAt = async (T) => {
    pending = [];
    const b = B.find((x) => T >= x.t0 && T < x.t1) || B[B.length - 1];
    const u = T - b.t0, dur = b.t1 - b.t0, f = Math.floor(T * FPS);
    const m = b.media && meta(b.media);
    const F = b.freeze, frozen = F && u >= F.at;

    // ---- footage
    show('clip', !!m); show('bg', !!m);
    if (m) {
      let i = Math.floor((frozen ? F.at : u) * FPS * (b.speed || 1));
      i = clamp(i, 0, m.count - 1);
      const src = frameSrc(b.media, i);
      setSrc($('clip'), src); setSrc($('bg'), src);
      let z = b.zoom ? lerp(b.zoom[0], b.zoom[1], u / dur) : 1 + 0.045 * (u / dur);
      let origin = b.pos || '50% 50%';
      if (F) {
        const e = EASE.out(clamp((u - F.at) / 0.28, 0, 1));
        z *= lerp(1, F.zoom || 1.35, frozen ? e : 0);
        origin = `${F.x * 100}% ${F.y * 100}%`;
      }
      $('clip').style.transformOrigin = origin;
      $('clip').style.transform = `scale(${z})`;
      $('clip').style.filter = frozen ? 'saturate(.55) contrast(1.12) brightness(.95)' : 'none';
    }

    // ---- freeze-frame call-out: a ring and a label on the subject
    const ringOn = frozen && u >= F.at + 0.12 && m;
    show('ring', ringOn); show('ringLabel', ringOn);
    if (ringOn) {
      const img = $('clip'), nw = img.naturalWidth || 1440, nh = img.naturalHeight || 1080;
      const s = Math.min(W / nw, H / nh), bw = nw * s, bh = nh * s, bx = (W - bw) / 2, by = (H - bh) / 2;
      const px = bx + F.x * bw, py = by + F.y * bh;
      const p = EASE.outBack(clamp((u - F.at - 0.12) / 0.3, 0, 1));
      const r = (F.r || 0.14) * bh * (F.zoom || 1.35) * p;
      $('ringC').setAttribute('cx', px); $('ringC').setAttribute('cy', py); $('ringC').setAttribute('r', Math.max(r, 0));
      const L = $('ringLabel');
      L.textContent = F.text || '';
      const lx = F.side === 'left' ? px - r - 30 - L.offsetWidth : px + r + 30;
      L.style.left = `${clamp(lx, 40, W - L.offsetWidth - 40)}px`;
      L.style.top = `${clamp(py - r - 10, 110, H - 300)}px`;
      L.style.opacity = p > 0.5 ? 1 : p * 2;
    }

    // ---- cards
    const cardOn = !!(b.title || b.chapter);
    show('card', cardOn);
    if (cardOn) {
      const a = Math.min(clamp(u / 0.35, 0, 1), clamp((dur - u) / 0.35, 0, 1));
      $('card').style.opacity = a;
      $('card').style.background = m ? 'rgba(0,0,0,.55)' : '#000';
      $('cardKicker').textContent = b.title ? (b.kicker || '') : `CHAPTER ${b.num ?? ''}`;
      $('cardTitle').innerHTML = rich(b.title || b.chapter);
      $('cardTitle').style.fontSize = b.title ? '170px' : '140px';
      $('cardTitle').style.transform = `scale(${1 + 0.04 * (u / dur)})`;
      $('cardSub').innerHTML = rich(b.sub || '');
      $('cardSub').style.display = b.sub ? 'block' : 'none';
    }

    // ---- species lower-third
    const labOn = !!b.label && u > 0.25 && u < dur - 0.15 && !cardOn;
    show('label', labOn);
    if (labOn) {
      const pIn = EASE.out(clamp((u - 0.25) / 0.35, 0, 1)), pOut = clamp((dur - 0.15 - u) / 0.25, 0, 1);
      $('label').style.opacity = Math.min(pIn, pOut);
      $('label').style.transform = `translateX(${(1 - pIn) * -40}px)`;
      $('latin').textContent = b.label.latin || '';
      $('common').textContent = b.label.common || '';
      $('status').textContent = b.label.status ? `STATUS: ${b.label.status}` : '';
    }

    // ---- subtitles
    const sub = b.subs.find((c) => T >= c.t0 - 0.05 && T < c.t1 + 0.25);
    show('subs', !!sub && !cardOn);
    if (sub) $('subText').innerHTML = rich(sub.text);

    // ---- AI observation log, timecode, credit
    const hud = !cardOn && T < endStart;
    show('log', hud); show('tc', hud); show('credit', !!m && T < endStart);
    if (hud) {
      const cr = credit(b.media), yr = cr && (cr.short || '').match(/\((\d{4})\)/);
      const L = EP.log || {};
      $('logText').textContent = `${L.text || 'AI OBSERVATION LOG'}  ·  SUBJECT: ${b.subject || L.subject || 'HUMAN'}${yr ? '  ·  ' + yr[1] : ''}`;
      $('rec').style.opacity = Math.floor(T * 1.6) % 2 ? 0.25 : 1;
      $('tc').textContent = tc(T);
    }
    if (m) $('credit').textContent = (credit(b.media) && credit(b.media).short) || '';
    if (grainOk) $('grain').style.backgroundPosition = `${(f * 97) % 512}px ${(f * 61) % 512}px`;

    // ---- end card, title flash
    show('endcard', T >= endStart);
    if (T >= endStart) {
      const p = EASE.out(clamp((T - endStart) / 0.4, 0, 1));
      $('endcard').style.opacity = p;
      $('ecText').style.transform = `scale(${0.9 + 0.1 * p})`;
    }
    const tb = b.title ? u : -1;
    $('flash').style.opacity = tb >= 0 && tb < 0.18 ? (0.6 * (1 - tb / 0.18)).toFixed(3) : 0;

    if (pending.length) await Promise.all(pending);
  };
})();
