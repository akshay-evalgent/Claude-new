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

  let EP, LEAD, TRAILER = false, B = [], endStart = Infinity, duration = 0, pending = [], grainOk = false, cardFor = -1, chatFor = -1;
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

  // 3D poster lettering: an extruded shadow copy under a gradient-filled copy
  const big = (t, cls) => { const h = rich(t).replace(/\n/g, '<br>'); return `<div class="stack ${cls || ''}"><div class="ext">${h}</div><div class="fill">${h}</div></div>`; };
  const lines = (t) => String(t).split('\n').map((l) => `<div>${rich(l)}</div>`).join('');
  const LAUREL = (flip) => `<svg viewBox="0 0 60 120" class="laurel" style="${flip ? 'transform:scaleX(-1)' : ''}">` +
    Array.from({ length: 7 }, (_, i) => { const a = -60 + i * 20, y = 104 - i * 14; return `<ellipse cx="${30 - Math.cos(a * Math.PI / 180) * 12}" cy="${y}" rx="11" ry="4.5" transform="rotate(${-50 + i * 8} ${30 - Math.cos(a * Math.PI / 180) * 12} ${y})"/>`; }).join('') +
    `<path d="M44 112 Q16 70 40 8" fill="none" stroke-width="3"/></svg>`;

  function cardHTML(C) {
    switch (C.type) {
      case 'approved':
        return `<div class="appr"><div class="apprTop">${rich(C.top || 'THE FOLLOWING PREVIEW HAS BEEN APPROVED FOR')}</div>` +
          `<div class="apprMid">${lines(C.text)}</div><div class="apprBot">${rich(C.bottom || '')}</div></div>`;
      case 'logo':
        return `<div class="beams"></div><div class="logo"><div class="logoA">${rich(C.kicker || 'A')}</div>${big(C.text, 'logoT')}<div class="logoB">${rich(C.sub || 'PICTURE')}</div></div>`;
      case 'bally':
        return `<div class="ballyIn">${C.kicker ? big(C.kicker, 'ballyK') : ''}<div class="ballyT">${lines(C.text)}</div></div>`;
      case 'title':
        return `<div class="titleIn">${C.kicker ? `<div class="titleK">${rich(C.kicker)}</div>` : ''}${big(C.text, 'titleT')}${C.sub ? `<div class="titleS">${rich(C.sub)}</div>` : ''}</div>`;
      case 'quotes':
        return `<div class="quotes">${C.quotes.map((q) => `<div class="q">${LAUREL(false)}<div class="qIn"><div class="stars">${'★'.repeat(q.stars ?? 5)}</div>` +
          `<div class="qT">“${rich(q.text)}”</div><div class="qBy">${rich(q.by)}</div></div>${LAUREL(true)}</div>`).join('')}</div>`;
      case 'rating':
        return `<div class="rate">${C.head ? `<div class="rateHead">${lines(C.head)}</div>` : ''}<div class="rateBox"><div class="rateL"><div class="rateR">${rich(C.letter || 'R')}</div>` +
          `<div class="rateW">${rich(C.word || 'RESTRICTED')}</div></div><div class="rateTx">${lines(C.text)}</div></div>${C.foot ? `<div class="rateFoot">${rich(C.foot)}</div>` : ''}</div>`;
      default:                                         // 'trailer': white type on black
        return `<div class="trT ${C.font || ''}">${lines(C.text)}</div>`;
    }
  }

  function renderTrailerCard(b, u, dur, m) {
    const C = b.card;
    show('tcard', !!C);
    if (!C) { cardFor = -1; return; }
    const el = $('tcard');
    if (cardFor !== b.i) {
      el.className = 'tc-' + C.type + (C.bg ? ' bg-' + C.bg : '');
      el.innerHTML = cardHTML(C);
      cardFor = b.i;
    }
    // over footage the card darkens it; with no clip it sits on its own background
    el.style.background = m && C.type !== 'approved' ? `rgba(0,0,0,${C.dim ?? 0.5})` : '';
    const out = clamp((dur - u) / 0.22, 0, 1);
    if (C.type === 'trailer') {
      const p = EASE.out(clamp(u / 0.5, 0, 1));
      el.firstChild.style.transform = `scale(${1.12 - 0.12 * p + 0.03 * (u / dur)})`;
      el.firstChild.style.opacity = Math.min(clamp(u / 0.12, 0, 1), out);
      el.firstChild.style.letterSpacing = `${18 - 8 * p}px`;
    } else if (C.type === 'bally') {
      const k = el.querySelector('.ballyK'), tx = el.querySelector('.ballyT');
      const p = EASE.outBack(clamp(u / 0.42, 0, 1)), p2 = EASE.outBack(clamp((u - 0.25) / 0.4, 0, 1));
      if (k) k.style.transform = `scale(${0.15 + 0.85 * p + 0.05 * (u / dur)}) rotate(${(1 - p) * -25 + (C.tilt ?? -6)}deg)`;
      tx.style.transform = `scale(${0.4 + 0.6 * p2}) rotate(${C.tilt2 ?? 2}deg)`;
      tx.style.opacity = clamp(p2 * 1.5, 0, 1);
      el.style.setProperty('--spin', `${(u * 14) % 360}deg`);
      el.style.opacity = out;
    } else if (C.type === 'title') {
      const p = EASE.out(clamp(u / 0.7, 0, 1));
      const t = el.querySelector('.titleT');
      t.style.transform = `scale(${2.4 - 1.4 * p + 0.04 * (u / dur)})`;
      t.style.filter = `blur(${(1 - p) * 14}px)`;
      t.style.opacity = clamp(u / 0.2, 0, 1);
      const sb = el.querySelector('.titleS'), kk = el.querySelector('.titleK');
      const p3 = clamp((u - 0.9) / 0.5, 0, 1);
      if (sb) { sb.style.opacity = p3; sb.style.transform = `translateY(${(1 - p3) * 20}px)`; }
      if (kk) kk.style.opacity = clamp((u - 0.4) / 0.5, 0, 1);
      el.style.setProperty('--spin', `${(u * 8) % 360}deg`);
      el.style.opacity = out;
    } else if (C.type === 'logo') {
      const p = EASE.out(clamp(u / 0.9, 0, 1));
      el.querySelector('.logo').style.transform = `scale(${0.92 + 0.08 * p})`;
      el.querySelector('.logo').style.opacity = p;
      el.style.setProperty('--spin', `${Math.sin(u * 1.4) * 22}deg`);
      el.style.opacity = Math.min(clamp(u / 0.3, 0, 1), out);
    } else if (C.type === 'quotes') {
      el.querySelectorAll('.q').forEach((q, i) => {
        const p = EASE.out(clamp((u - 0.15 - i * 0.45) / 0.45, 0, 1));
        q.style.opacity = p; q.style.transform = `translateY(${(1 - p) * 30}px)`;
      });
      el.style.opacity = out;
    } else {
      el.style.opacity = Math.min(clamp(u / 0.25, 0, 1), out);
      el.firstChild.style.transform = `scale(${1 + 0.025 * (u / dur)})`;
    }
  }

  // phone-style text messages over the footage: [{at, text, from: 'me'|'them', status}]
  function renderChat(b, u) {
    const T = b.texts || [];
    const typing = b.typing && u >= b.typing.at && u < b.typing.at + b.typing.dur;
    const vis = T.filter((x) => u >= x.at);
    show('chat', vis.length > 0 || typing);
    if (!vis.length && !typing) return;
    const el = $('chat');
    el.className = 'chat-' + (b.chatPos || 'right');
    let html = '';
    vis.forEach((x, i) => {
      const p = EASE.outBack(clamp((u - x.at) / 0.28, 0, 1));
      const last = i === vis.length - 1 || vis[i + 1].from !== x.from;
      html += `<div class="bub ${x.from === 'them' ? 'them' : 'me'}${last ? ' tail' : ''}" style="transform:scale(${(0.5 + 0.5 * p).toFixed(3)});opacity:${clamp(p * 2, 0, 1).toFixed(2)}">${rich(x.text)}</div>`;
      if (x.status && i === vis.length - 1 && !typing) html += `<div class="status ${x.statusClass || ''}">${rich(x.status)}</div>`;
    });
    if (typing) {
      const d = (k) => (0.35 + 0.65 * Math.max(0, Math.sin((u * 7) - k * 0.9))).toFixed(2);
      html += `<div class="bub them tail typing"><i style="opacity:${d(0)}"></i><i style="opacity:${d(1)}"></i><i style="opacity:${d(2)}"></i></div>`;
    }
    if (b.i !== chatFor || el.innerHTML !== html) el.innerHTML = html;
    chatFor = b.i;
  }

  window.boot = async (ep) => {
    EP = ep; LEAD = (ep.__plan && ep.__plan.lead) || 0.3; TRAILER = ep.style === 'trailer';
    document.body.classList.toggle('trailer', TRAILER);
    $('trLabel').textContent = ep.trLabel || 'TRANSLATED FROM UNC';
    const plan = ep.__plan.beats, slug = ep.__slug, cues = [];
    let t = 0;
    ep.beats.forEach((b, i) => {
      const p = plan[i], d = p.dur;
      const lead = p.lead ?? LEAD;
      const beat = { ...b, i, t0: t, t1: t + d, media: p.media, voiceDur: p.voiceDur || 0, lead, span: p.span, subs: [] };
      if (b.freeze) beat.freeze = { ...b.freeze, at: b.freeze.at === 'end' ? lead + (p.voiceDur || 0) + 0.05 : b.freeze.at };
      if (p.voice) {
        cues.push({ t: t + lead, s: `@voice:${slug}/${p.voice}`, g: b.voiceGain ?? 0, duck: true });
        if (!b.noSubs) beat.subs = subtitleChunks(b.line, t + lead, p.voiceDur);
      }
      // trailer cards make their own noise unless told otherwise
      const C = b.card;
      if (C && C.sfx !== false) {
        const CS = { trailer: [['impact', -9, 3]], bally: [['whoosh-hit', -10, 1.6], ['impact2', -12, 2.5]],
          title: [['braam', -5, 4.5], ['impact', -8, 3]], logo: [['@riser', -18, 1.2]] }[C.type] || [];
        CS.forEach(([s0, g, du]) => cues.push(s0 === '@riser' ? { t, s: '@riser', dur: du, g } : { t: t + 0.01, s: s0, g, dur: du, duck: true }));
      }
      (b.texts || []).forEach((m) => cues.push({ t: t + m.at, s: 'soft-pop', g: m.from === 'them' ? -11 : -13, rate: m.from === 'them' ? 1.25 : 1 }));
      (b.cues || []).forEach((c) => cues.push({ ...c, t: t + (c.at === 'end' ? d : c.at ?? 0), duck: c.duck ?? true }));
      if (b.title) {
        cues.push({ t: Math.max(0, t - 1.4), s: '@riser', dur: 1.4, g: -14 });
        cues.push({ t: t + 0.02, s: 'boom', g: -9, duck: true });
      }
      if (b.chapter) cues.push({ t: t + 0.02, s: 'soft-swoosh', g: -12 });
      if (beat.freeze) cues.push({ t: t + beat.freeze.at, s: beat.freeze.sfx || 'glitch', g: -7, duck: true });
      if (b.sfx) cues.push({ t: t + (b.sfxAt ?? lead + p.voiceDur), s: b.sfx, g: b.sfxGain ?? -6, duck: true });
      if (b.media && b.audio && meta(b.media) && meta(b.media).audio) {
        // in a trailer the film's own dialogue is the joke: it ducks the music like narration does
        cues.push({ t, s: '@media:' + b.media, g: b.audioGain ?? (TRAILER ? -2 : -10), dur: p.span ? p.span + 0.04 : d, duck: TRAILER });
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
    let music = null;
    if (ep.music && ep.music.segments) {
      // {track, from, to, gain, offset, fadeIn, fadeOut}: from/to are beat ids (start of that beat),
      // beat numbers, or "end"; fromShift/toShift nudge them in seconds
      const at = (x) => (x === 'end' ? duration : x === 'endcard' ? endStart : typeof x === 'number' ? B[x].t0 : B.find((bb) => bb.id === x).t0);
      music = { segments: ep.music.segments.map((sg) => ({ ...sg, t0: at(sg.from) + (sg.fromShift || 0), t1: at(sg.to) + (sg.toShift || 0) })) };
    } else if (ep.music) {
      music = { tracks: [].concat(ep.music.tracks || ep.music.track), gain: ep.music.gain ?? -20, start: 0, end: duration };
    }
    return { duration, cues: cues.sort((a, b) => a.t - b.t), music, mainStart: 0, exchanges: B.map((b) => +b.t0.toFixed(2)) };
  };

  const show = (id, on) => { $(id).style.display = on ? (['card', 'endcard', 'tcard', 'say'].includes(id) ? 'flex' : 'block') : 'none'; };
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
      // a dialogue beat held longer than its line stops on the line's last frame
      const tu = b.span && !F ? Math.min(u, b.span) : u;
      let i = Math.floor((frozen ? F.at : tu) * FPS * (b.speed || 1));
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
      // screen shake: [{at, dur, amp}] - a decaying jitter, deterministic per frame
      let sx = 0, sy = 0;
      for (const k of [].concat(b.shake || [])) {
        const q = (u - k.at) / (k.dur || 0.35);
        if (q >= 0 && q < 1) {
          const a = (k.amp || 18) * (1 - q) * (1 - q);
          sx += a * Math.sin(f * 2.7 + k.at * 13); sy += a * Math.cos(f * 3.3 + k.at * 7);
        }
      }
      $('shot').style.transform = sx || sy ? `translate(${sx.toFixed(1)}px, ${sy.toFixed(1)}px)` : '';
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
      L.style.color = F.color || '';
      const lx = F.side === 'left' ? px - r - 30 - L.offsetWidth : px + r + 30;
      L.style.left = `${clamp(lx, 40, W - L.offsetWidth - 40)}px`;
      L.style.top = `${clamp(py - r - 10, 110, H - 300)}px`;
      L.style.opacity = p > 0.5 ? 1 : p * 2;
    }

    // ---- trailer cards, text messages, dialogue captions
    renderTrailerCard(b, u, dur, m);
    renderChat(b, u);
    const sayOn = !!b.say && u >= (b.sayAt ?? 0.08) && u < dur - 0.05;
    show('say', sayOn);
    if (sayOn) {
      $('sayText').innerHTML = rich(b.say);
      const trOn = !!b.tr && u >= (b.trAt ?? 0.35);
      $('tr').style.display = trOn ? 'inline-flex' : 'none';
      if (trOn) {
        const p = EASE.outBack(clamp((u - (b.trAt ?? 0.35)) / 0.25, 0, 1));
        $('trText').innerHTML = rich(b.tr);
        $('tr').style.transform = `scale(${0.6 + 0.4 * p}) rotate(${(1 - p) * -4 - 1.5}deg)`;
        $('tr').style.opacity = clamp(p * 1.5, 0, 1);
      }
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
    show('subs', !!sub && !cardOn && !(b.card && b.card.type !== 'trailer' && !b.card.subs) && !sayOn);
    if (sub) $('subText').innerHTML = rich(sub.text);

    // ---- AI observation log, timecode, credit
    const hud = !cardOn && T < endStart && !TRAILER;
    show('log', hud); show('tc', hud); show('credit', !!m && T < endStart);
    if (hud) {
      const cr = credit(b.media), yr = cr && (cr.short || '').match(/\((\d{4})\)/);
      const L = EP.log || {};
      $('logText').textContent = `${L.text || 'AI OBSERVATION LOG'}  ·  SUBJECT: ${b.subject || L.subject || 'HUMAN'}${yr ? '  ·  ' + yr[1] : ''}`;
      $('rec').style.opacity = Math.floor(T * 1.6) % 2 ? 0.25 : 1;
      $('tc').textContent = tc(T);
    }
    if (m) $('credit').textContent = (credit(b.media) && credit(b.media).short) || '';
    if (b.card && b.card.type !== 'bally') show('credit', false);
    if (grainOk) $('grain').style.backgroundPosition = `${(f * 97) % 512}px ${(f * 61) % 512}px`;

    // ---- end card, title flash
    show('endcard', T >= endStart);
    if (T >= endStart) {
      const p = EASE.out(clamp((T - endStart) / 0.4, 0, 1));
      $('endcard').style.opacity = p;
      $('ecText').style.transform = `scale(${0.9 + 0.1 * p})`;
    }
    // white flashes: on titles and trailer cards, and wherever a beat asks ("flash": [t, ...])
    const fl = [].concat(b.title || (b.card && ['trailer', 'bally', 'title'].includes(b.card.type) && b.card.flash !== false) ? [0] : [], b.flash || []);
    let fo = 0;
    for (const x of fl) { const q = (u - x) / 0.18; if (q >= 0 && q < 1) fo = Math.max(fo, 0.65 * (1 - q)); }
    $('flash').style.opacity = fo.toFixed(3);

    if (pending.length) await Promise.all(pending);
  };
})();
