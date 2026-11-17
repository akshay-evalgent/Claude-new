/* Chat-story engine. A story is a list of message groups (one sender, lines added one at a
   time) and cutaways (a phone notification, an inbox filling up, the member list, a giant
   profile picture, an incoming call). Only the current group is on screen, on black, and the
   camera zooms so it fills the frame. No voices: a music bed that cuts hard to silence before
   punchlines, and a soft blip for every new line.
   boot(episode) returns {duration, cues, music}; renderAt(T) draws time T. */
(() => {
  let W = 1920, H = 1080, VERT = false;
  const $ = (id) => document.getElementById(id);
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const lerp = (a, b, p) => a + (b - a) * p;
  const EASE = { out: (p) => 1 - Math.pow(1 - p, 3), outBack: (p) => { const c1 = 1.7, c3 = c1 + 1; return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2); } };
  const seg = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
  const isEmoji = (g) => /\p{Extended_Pictographic}/u.test(g);
  const ekey = (g) => Array.from(g).map((c) => c.codePointAt(0)).filter((c) => c !== 0xfe0f).map((c) => c.toString(16)).join('-');
  const esc = (s) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const emo = (g, cls = 'e') => `<img class="${cls}" src="../assets/emoji/${ekey(g)}.png">`;
  const rich = (s) => Array.from(seg.segment(String(s)), (x) => x.segment).map((g) => (isEmoji(g) ? emo(g) : esc(g))).join('');
  const emojiOnly = (s) => { const gs = Array.from(seg.segment(s.trim()), (x) => x.segment).filter((g) => g.trim()); return gs.length > 0 && gs.length <= 3 && gs.every(isEmoji); };
  const FPS = 30;

  let EP, CAST, STEPS = [], duration = 0;

  const avatar = (who, cls = 'av') => {
    const c = CAST[who] || {}, a = c.avatar || {};
    if (a.media) return `<div class="${cls}"><img src="../assets/media/${a.media}.jpg" style="object-position:${a.pos || '50% 30%'}"></div>`;
    return `<div class="${cls} emo" style="background:${a.bg || '#5865f2'}">${emo(a.emoji || '🙂', '')}</div>`;
  };
  const nameHTML = (who) => { const c = CAST[who] || {}; return `<span class="name" style="color:${c.color || '#f2f3f5'}">${esc(c.name || who)}</span>`; };

  // a line's text: @mentions become chips, ||spoilers|| become bars, (edited) marks
  function lineHTML(raw) {
    const L = typeof raw === 'string' ? { t: raw } : raw;
    if (L.img) return { html: `<div class="ln img"><img class="pic" src="../assets/media/${L.img}.jpg"></div>`, ment: false };
    const t = L.t;
    if (emojiOnly(t)) return { html: `<div class="ln emoji">${Array.from(seg.segment(t.trim()), (x) => x.segment).filter((g) => g.trim()).map((g) => emo(g, '')).join('')}</div>`, ment: false };
    let h = rich(t).replace(/(^|\s)@([\p{L}\p{N}_.]+)/gu, '$1<span class="at">@$2</span>').replace(/\|\|(.+?)\|\|/g, '<span class="sp">$1</span>');
    if (L.edited) h += '<span class="ed">(edited)</span>';
    const ment = /(^|\s)@[\p{L}\p{N}_]/u.test(t.replace(/\|\|.+?\|\|/g, ''));   // an @ inside an e-mail address is not a mention
    return { html: `<div class="ln${ment ? ' ment' : ''}${L.caps ? ' caps' : ''}"><span class="tx">${h}</span></div>`, ment };
  }

  function clockAt(start, addMin) {
    const m = /(\d+):(\d+)\s*(AM|PM)/i.exec(start || '1:27 PM');
    let mins = ((+m[1] % 12) + (m[3].toUpperCase() === 'PM' ? 12 : 0)) * 60 + +m[2] + addMin;
    mins = ((mins % 1440) + 1440) % 1440;
    const h = Math.floor(mins / 60), mm = mins % 60;
    return `${((h + 11) % 12) + 1}:${String(mm).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
  }

  // how long a line stays before the next one: about a second, longer for long lines
  const lineDur = (L) => L.hold ?? clamp(0.5 + 0.034 * (L.t || '').length, 0.75, 2.6);

  window.boot = async (ep) => {
    EP = ep; CAST = ep.cast;
    VERT = ep.format === 'vertical';
    if (VERT) { W = 1080; H = 1920; }
    document.documentElement.classList.toggle('vertical', VERT);
    const cues = [], music = [];
    let t = 0, gi = 0, clockBase = ep.clock || '1:27 PM', clockOff = 0, cur = null;
    const startMusic = (m, at) => {
      if (cur) { cur.t1 = at; music.push(cur); }
      cur = m ? { track: m.track || m, offset: m.offset ?? 0, gain: m.gain ?? ep.musicGain ?? -15, fadeIn: m.fadeIn ?? 0.03, fadeOut: 0.03, t0: at, duck: false } : null;
    };
    const beatT = [];
    for (const b of ep.beats) {
      beatT.push(t);
      if (b.stop) startMusic(null, t + (b.stopAt || 0));
      if (b.music) startMusic(b.music, t + (b.musicAt || 0));
      if (b.pause) { STEPS.push({ kind: 'black', t0: t, t1: t + b.pause }); t += b.pause; continue; }
      if (b.cut) {
        const d = b.dur ?? 2.2, st = { kind: 'cut', c: b, t0: t, t1: t + d };
        STEPS.push(st);
        const sfx = { notif: ['notify', -9], inbox: null, members: ['soft-swoosh', -12], avatar: ['boom', -10], call: ['ringtone', -10], image: null, card: null }[b.cut];
        if (b.sfx !== false && (b.sfx || sfx)) { const [s0, g] = b.sfx ? [b.sfx, b.sfxGain ?? -9] : sfx; cues.push({ t: t + 0.02, s: s0, g, dur: b.cut === 'call' ? d : undefined }); }
        if (b.cut === 'inbox') {
          const n = b.rows || 14;
          for (let k = 0; k < n; k++) cues.push({ t: t + 0.15 + k * (b.rate || 0.11), s: 'notify', g: -16 - (k % 3) * 2, rate: 1 + (k % 4) * 0.03 });
        }
        (b.cues || []).forEach((c) => cues.push({ ...c, t: t + (c.at || 0) }));
        t += d; continue;
      }
      // a message group
      if (b.time) { clockBase = b.time; clockOff = 0; gi = 0; }
      const time = clockAt(clockBase, clockOff + Math.floor(gi / (ep.clockEvery || 3)));
      gi++;
      const lines = b.lines.map((x) => (typeof x === 'string' ? { t: x } : x));
      lines.forEach((L, k) => {
        const d = lineDur(L);
        STEPS.push({ kind: 'grp', g: b, lines, k: k + 1, time, t0: t, t1: t + d, L });
        if (L.sfx !== false && !L.silent) cues.push({ t: t + 0.01, s: 'blip', g: L.ment || /@/.test(L.t || '') ? -12 : -15, rate: 0.97 + (k % 3) * 0.03 });
        if (L.sfx) cues.push({ t: t + (L.sfxAt ?? 0.05), s: L.sfx, g: L.sfxGain ?? -8, dur: L.sfxDur });
        if (L.stop) startMusic(null, t);
        if (L.music) startMusic(L.music, t + (L.musicAt || 0));
        t += d;
        if (L.big) {
          const bd = L.bigDur ?? 1.8;
          STEPS.push({ kind: 'big', text: typeof L.big === 'string' ? L.big : L.t, t0: t, t1: t + bd });
          t += bd;
        }
      });
      if (b.after) { STEPS[STEPS.length - 1].t1 += b.after; t += b.after; }
    }
    if (ep.tail) { STEPS[STEPS.length - 1].t1 += ep.tail; t += ep.tail; }
    startMusic(null, t);
    duration = t;

    // measure every group state once, so the camera can fit it
    await document.fonts.ready;
    const grp = $('grp');
    for (const s of STEPS) {
      if (s.kind !== 'grp') continue;
      grp.innerHTML = groupHTML(s);
      await Promise.all(Array.from(grp.querySelectorAll('img')).map((im) => (im.complete ? 0 : new Promise((r) => { im.onload = im.onerror = r; }))));
      s.h = grp.offsetHeight;
      // the widest thing in the group: the name row or a line of text (images and big emoji count too)
      const hd = grp.querySelector('.hd'), hw = Array.from(hd.children).reduce((a, el) => a + el.offsetWidth + 16, 150);
      s.w = Math.max(hw, ...Array.from(grp.querySelectorAll('.ln')).map((el) => 150 + (el.querySelector('.tx, img') || el).offsetWidth));
    }
    return { duration, cues: cues.sort((a, b) => a.t - b.t), music: music.length ? { segments: music } : null, mainStart: 0, exchanges: beatT.map((x) => +x.toFixed(2)) };
  };

  function groupHTML(s) {
    const c = CAST[s.g.who] || {};
    return avatar(s.g.who) + `<div class="hd">${nameHTML(s.g.who)}${c.badge ? `<span class="role" style="background:${c.badgeColor || '#5865f2'}">${esc(c.badge)}</span>` : ''}<span class="time">${s.time}</span></div>` +
      s.lines.slice(0, s.k).map((L) => lineHTML(L).html).join('');
  }

  // the zoom that makes a group fill the frame (big for one line, smaller as it grows)
  function fitZoom(s) {
    const zmax = (EP.zoomMax || (VERT ? 1.15 : 2.8)) * (s.g.zoom || 1);
    return Math.min(zmax, (H * (VERT ? 0.42 : 0.74)) / s.h, (W - 30) / (s.w + 40));
  }

  const show = (id, on, mode) => { $(id).style.display = on ? mode || 'block' : 'none'; };
  let lastHTML = '', lastCut = null;

  window.renderAt = async (T) => {
    const i = Math.max(0, STEPS.findIndex((x) => T >= x.t0 && T < x.t1));
    const s = STEPS[i] ?? STEPS[STEPS.length - 1], u = T - s.t0, f = Math.floor(T * FPS);
    show('world', s.kind === 'grp'); show('big', s.kind === 'big', 'flex'); show('cut', s.kind === 'cut');
    let real = false;

    if (s.kind === 'grp') {
      const html = groupHTML(s);
      if (html !== lastHTML) { $('grp').innerHTML = html; lastHTML = html; }
      const prev = STEPS[i - 1], z1 = fitZoom(s);
      const z0 = prev && prev.kind === 'grp' && prev.g === s.g ? fitZoom(prev) : z1;
      let z = lerp(z0, z1, EASE.out(clamp(u / 0.2, 0, 1)));
      let sx = 0, sy = 0;
      if (s.L.punch) {
        const q = (u - 0.04) / 0.14;
        if (q > 0) z *= 1 + (typeof s.L.punch === 'number' ? s.L.punch : 0.22) * EASE.out(clamp(q, 0, 1));
        if (s.L.shake && q > 0 && q < 4) { const a = 14 * Math.pow(1 - q / 4, 2); sx = a * Math.sin(f * 2.7); sy = a * Math.cos(f * 3.3); }
      }
      $('grp').style.width = `${Math.max(1920, W / z + 20)}px`;
      const top = H * (VERT ? 0.47 : 0.45) - (s.h * z) / 2;
      $('world').style.transform = `translate(${sx.toFixed(1)}px, ${(top + sy).toFixed(1)}px) scale(${z.toFixed(4)})`;
      real = !!(CAST[s.g.who] || {}).real;
    }

    if (s.kind === 'big') {
      if ($('bigText').dataset.t !== s.text) { $('bigText').innerHTML = rich(s.text); $('bigText').dataset.t = s.text; }
      const tw = $('bigText').scrollWidth, sc = Math.min(1.4, (W - 100) / tw);
      $('bigText').style.transform = `scale(${(sc * (1 + 0.03 * u)).toFixed(4)})`;
      $('bigBand').style.height = `${Math.round(150 * 1.15 * sc + 96)}px`;
    }

    if (s.kind === 'cut') {
      const c = s.c, key = s.t0;
      if (lastCut !== key) { $('cut').innerHTML = cutHTML(c); lastCut = key; }
      animateCut(c, u, s.t1 - s.t0);
      const who = c.who || c.focus;
      real = !!(who && (CAST[who] || {}).real) || (c.cut === 'members' && (c.groups || []).some((g) => g.members.some((m) => (CAST[m.who] || {}).real)));
    }

    // real people get a PARODY label whenever they are on screen
    show('tag', real && EP.parodyTag !== false);
    $('tag').textContent = EP.parodyLabel || 'PARODY';
    const fl = s.kind === 'cut' && s.c.flash ? 1 - clamp(u / 0.2, 0, 1) : 0;
    $('flash').style.opacity = (0.6 * fl).toFixed(3);
    const imgs = Array.from(document.images).filter((im) => !im.complete).map((im) => im.decode().catch(() => {}));
    if (imgs.length) await Promise.all(imgs);
  };

  function cutHTML(c) {
    switch (c.cut) {
      case 'notif': {
        const ic = c.iconMedia ? `<img src="../assets/media/${c.iconMedia}.jpg">` : emo(c.icon || '📩', '');
        return `<div class="notif"><div class="ic">${ic}</div><div class="tx"><div class="app">${esc(c.app || '')}<span>${esc(c.when || 'now')}</span></div>` +
          `<b>${rich(c.title || '')}</b><div class="body">${rich(c.text || '')}</div></div></div>`;
      }
      case 'inbox': {
        const n = c.rows || 14;
        return `<div class="inbox"><div class="bar">🔍&nbsp;&nbsp;Search mail</div>` + Array.from({ length: n }, (_, k) =>
          `<div class="row" data-k="${k}"><b>${esc(c.from || '')}</b>${c.chip ? `<span class="chip">${esc(c.chip)}</span>` : ''}<span class="sub">${rich((c.subjects || [c.subject || ''])[k % (c.subjects || [c.subject]).length])}</span><span class="when">now</span></div>`).join('') + '</div>';
      }
      case 'members':
        return `<div class="members">` + c.groups.map((g) => `<h4>${esc(g.title)}</h4>` + g.members.map((m) =>
          `<div class="m" data-who="${m.who}"><div class="mav">${avatar(m.who)}<span class="dot ${m.status || ''}"></span></div><span class="mn" style="color:${(CAST[m.who] || {}).color || '#dbdee1'}">${esc((CAST[m.who] || {}).name || m.who)}</span></div>`).join('')).join('') + '</div>';
      case 'avatar': return avatar(c.who, 'avbig');
      case 'call': {
        const a = (CAST[c.who] || {}).avatar || {};
        return `<div class="call">${a.media ? `<div class="bg" style="background-image:url(../assets/media/${a.media}.jpg)"></div>` : ''}<div class="ring"><div class="pulse"></div>${avatar(c.who)}</div>` +
          `<div class="cn">${esc((CAST[c.who] || {}).name || c.who)}</div><div class="cs">${esc(c.text || 'Incoming call…')}</div><div class="btns"><i class="no">📵</i><i class="yes">📞</i></div></div>`;
      }
      case 'image': return `<div class="pic"><img src="../assets/media/${c.media}.jpg">${c.caption ? `<div class="cap">${rich(c.caption)}</div>` : ''}</div>`;
      default: return `<div class="card"><b>${rich(c.title || '')}</b>${c.sub ? `<span>${rich(c.sub)}</span>` : ''}</div>`;
    }
  }

  function animateCut(c, u, d) {
    const root = $('cut').firstElementChild;
    if (!root) return;
    if (c.cut === 'notif') {
      const p = EASE.outBack(clamp(u / 0.32, 0, 1));
      root.style.transform = `translateX(-50%) translateY(${((1 - p) * -260).toFixed(1)}px) scale(${((VERT ? 0.82 : 1.25) * (1 + 0.05 * (u / d))).toFixed(4)})`;
      root.style.top = (VERT ? 520 : 300) + 'px';
    } else if (c.cut === 'inbox') {
      const rows = root.querySelectorAll('.row'), n = rows.length, shown = Math.min(n, Math.floor((u - 0.15) / (c.rate || 0.11)) + 1);
      rows.forEach((r, k) => { r.style.display = k < shown ? 'flex' : 'none'; r.style.order = -k; });
      root.style.display = 'flex'; root.style.flexDirection = 'column';
      root.querySelector('.bar').style.order = -1000;
    } else if (c.cut === 'members') {
      const fe = c.focus && root.querySelector(`.m[data-who="${c.focus}"]`);
      const zEnd = c.zoom || 2.1, p = EASE.out(clamp((u - (c.hold ?? 0.6)) / (c.zoomTime || 0.9), 0, 1)), z = lerp(1, zEnd, p);
      let fx = 600, fy = 400;
      if (fe) { fx = 260 + 60; fy = fe.offsetTop + 67; }
      root.style.transform = `translate(${(fx - fx * z + lerp(0, W * 0.18, p)).toFixed(1)}px, ${(fy - fy * z + lerp(0, H * 0.5 - fy, p)).toFixed(1)}px) scale(${z.toFixed(4)})`;
    } else if (c.cut === 'avatar') {
      const p = EASE.out(clamp(u / 0.3, 0, 1)), z = lerp(0.45, 1.0, p) * (1 + 0.06 * (u / d)) * (VERT ? 0.95 : 1);
      root.style.transform = `translate(-50%, -50%) scale(${z.toFixed(4)})`;
    } else if (c.cut === 'call') {
      const pulse = root.querySelector('.pulse'), q = (u * 1.3) % 1;
      pulse.style.transform = `scale(${(1 + 0.22 * q).toFixed(3)})`; pulse.style.opacity = (1 - q).toFixed(3);
    } else if (c.cut === 'image') {
      const im = root.querySelector('img'); im.style.transform = `scale(${(1 + (c.push ?? 0.06) * (u / d)).toFixed(4)})`;
    }
  }
})();
