/* Texting-app engine: a phone screen recording of a text conversation. The sender types each
   message live on the keyboard (key pop-ups, caret), the other person shows a typing
   indicator, videos are picked from a photo sheet and play inline. A hook can open the video:
   the "footage" full screen with a caption, and a "tool" segment can follow it: the AI video
   app where the prompt is typed and the clip is generated.
   boot(episode) returns {duration, cues}; renderAt(T) draws time T. */
(() => {
  const W = 1080, H = 1920, FPS = 30;
  const $ = (id) => document.getElementById(id);
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const lerp = (a, b, p) => a + (b - a) * p;
  const EASE = { out: (p) => 1 - Math.pow(1 - p, 3), outBack: (p) => { const c1 = 1.7, c3 = c1 + 1; return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2); } };
  const seg = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
  const isEmoji = (g) => /\p{Extended_Pictographic}/u.test(g);
  const ekey = (g) => Array.from(g).map((c) => c.codePointAt(0)).filter((c) => c !== 0xfe0f).map((c) => c.toString(16)).join('-');
  const esc = (s) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const rich = (s) => Array.from(seg.segment(String(s)), (x) => x.segment).map((g) => (isEmoji(g) ? `<img class="e" src="../assets/emoji/${ekey(g)}.png">` : esc(g))).join('');
  const hash = (s, i) => { let h = 2166136261; for (const c of s + i) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return ((h >>> 0) % 1000) / 1000; };

  let EP, MSGS = [], EV = [], duration = 0, HEIGHTS = [], KEYS = {}, hookEnd = 0, chatStart = 0, lastCount = -1, lastPicker = '';
  let TOOL = null, HOOKCUTS = null, STILL = {};
  const isCaps = (x) => { const l = String(x).replace(/[^\p{L}]/gu, ''); return l.length >= 4 && l === l.toUpperCase(); };   // {t0, keys: [{t, n}], go, gen0, gen1, end}
  const meta = (k) => (EP.__mediaMeta && EP.__mediaMeta[k]) || null;
  const frameSrc = (k, i) => { const m = meta(k); return `../assets/media/${k}/f${String((i % m.count) + 1).padStart(4, '0')}.${m.ext}`; };

  const ROWS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];
  function keyboardHTML() {
    return `<div class="row">${[...ROWS[0]].map((c) => `<div class="k" data-k="${c}">${c}</div>`).join('')}</div>` +
      `<div class="row">${[...ROWS[1]].map((c) => `<div class="k" data-k="${c}">${c}</div>`).join('')}</div>` +
      `<div class="row"><div class="k sp" style="width:130px">⇧</div>${[...ROWS[2]].map((c) => `<div class="k" data-k="${c}">${c}</div>`).join('')}<div class="k sp" style="width:130px">⌫</div></div>` +
      `<div class="row"><div class="k sp" style="width:110px">123</div><div class="k sp" style="width:110px">☺︎</div><div class="k" data-k=" " style="width:520px;font-size:38px">space</div><div class="k sp" style="width:210px">return</div></div>`;
  }

  function msgHTML(m, i, list) {
    const next = list[i + 1], prev = list[i - 1];
    const tail = !next || next.from !== m.from || next.sep;
    const gap = prev && prev.from !== m.from ? ' gap' : '';
    let h = m.sep ? `<div class="sep">${esc(m.sep)}</div>` : '';
    if (m.media) h += `<div class="m ${m.from}${gap}" data-i="${i}"><div class="media"><img data-media="${m.media}"${m.at != null ? ' data-still="1"' : ''} src="${frameSrc(m.media, m.at != null ? Math.round(m.at * FPS) : 0)}"></div></div>`;
    else h += `<div class="m ${m.from}${tail ? ' tail' : ''}${gap}" data-i="${i}"><div class="b">${rich(m.text)}</div></div>`;
    return h;
  }

  window.boot = async (ep) => {
    EP = ep;
    const cues = [];
    // contact header
    const c = ep.contact || {}, a = c.avatar || {};
    $('cAv').className = a.media ? '' : 'emo';
    $('cAv').style.background = a.bg || '#c7c7cc';
    $('cAv').innerHTML = a.media ? `<img src="../assets/media/${a.media}.jpg">` : `<img src="../assets/emoji/${ekey(a.emoji || '🙂')}.png">`;
    $('cName').innerHTML = rich(c.name || 'Dad');
    $('unread').textContent = ep.unread || '';
    $('tKb').innerHTML = keyboardHTML();
    $('kb').innerHTML = keyboardHTML() + `<div id="kbBottom"><span class="g"><svg viewBox="0 0 62 62"><circle cx="31" cy="31" r="26" fill="none" stroke="#3a3a3c" stroke-width="4"/><ellipse cx="31" cy="31" rx="11" ry="26" fill="none" stroke="#3a3a3c" stroke-width="4"/><path d="M6 31h50M10 18h42M10 44h42" stroke="#3a3a3c" stroke-width="4"/></svg></span><span class="mc"><svg viewBox="0 0 30 48"><rect x="8" y="2" width="14" height="26" rx="7" fill="none" stroke="#3a3a3c" stroke-width="4"/><path d="M3 22a12 12 0 0 0 24 0M15 34v10" fill="none" stroke="#3a3a3c" stroke-width="4" stroke-linecap="round"/></svg></span></div>`;
    $('mic').innerHTML = '<svg viewBox="0 0 30 48"><rect x="8" y="2" width="14" height="26" rx="7" fill="none" stroke="#8e8e93" stroke-width="4"/><path d="M3 22a12 12 0 0 0 24 0M15 34v10" fill="none" stroke="#8e8e93" stroke-width="4" stroke-linecap="round"/></svg>';
    // where each key sits, for the pop-up balloon
    await document.fonts.ready;
    $('bar').style.top = `${H - 780 - 120}px`;
    document.querySelectorAll('#kb .k[data-k]').forEach((k) => { const r = k.getBoundingClientRect(); KEYS[k.dataset.k] = { x: r.left, y: r.top, w: r.width, h: r.height, el: k }; });

    // the conversation before "Today"
    for (const hm of ep.history || []) MSGS.push({ from: hm.me != null ? 'me' : 'them', text: hm.me ?? hm.them, hist: true });
    const firstTodayIdx = MSGS.length;

    let t = 0;
    const ev = (e) => EV.push({ ...e, t: e.t ?? t });
    if (ep.hook) {
      hookEnd = ep.hook.dur ?? 3.5;
      ev({ type: 'hook', on: true, t: 0 });
      const hm = ep.hook.media ? meta(ep.hook.media) : null;
      if (ep.hook.stages) {
        // the AI stages cut from normal to absurd, with a hit on every cut
        const st = ep.hook.stages, each = hookEnd / st.length;
        let u = 0;
        HOOKCUTS = st.map((x) => { const c = { ...x, t0: u }; u += x.dur ?? each; if (x.at != null) STILL[x.media] = x.at; return c; });
        HOOKCUTS.forEach((c, i) => cues.push({ t: c.t0, s: 'boom', g: i === HOOKCUTS.length - 1 ? -8 : -12 }));
      } else if (hm && hm.audio) cues.push({ t: 0, s: '@media:' + ep.hook.media, g: ep.hook.audioGain ?? -3, dur: hookEnd });
      else cues.push({ t: 0, s: 'wind', g: -16, dur: hookEnd });
      t = hookEnd;
      ev({ type: 'hook', on: false });
      cues.push({ t, s: 'soft-swoosh', g: -14 });
      t += ep.tool ? 0 : 0.35;
    }
    if (ep.tool && ep.tool.recording) {
      // a real screen recording of the AI app (your own file, already trimmed/sped up), full screen
      const rm = meta(ep.tool.recording);
      TOOL = { t0: t, recording: ep.tool.recording };
      TOOL.end = t + (ep.tool.dur ?? (rm ? rm.count / FPS : 3));
      ev({ type: 'tool', on: true });
      if (rm && rm.audio) cues.push({ t, s: '@media:' + ep.tool.recording, g: ep.tool.audioGain ?? -8, dur: TOOL.end - t });
      t = TOOL.end;
      ev({ type: 'tool', on: false });
      cues.push({ t, s: 'soft-swoosh', g: -14 });
      t += 0.35;
    } else if (ep.tool) {
      // the AI app: the prompt is typed fast, "generate" is tapped, the clip appears
      const tl = ep.tool, chars = [...tl.prompt], tcps = tl.typeSpeed || (tl.style === 'edit' ? 22 : 34);
      TOOL = { t0: t, keys: [] };
      ev({ type: 'tool', on: true });
      let u = t + (tl.lead ?? (tl.style === 'edit' ? 0.2 : 0.3));
      chars.forEach((ch, k) => {
        TOOL.keys.push({ t: u, n: k + 1, ch: ch.toLowerCase() });
        if (ch !== ' ') cues.push({ t: u, s: ['key1', 'key2', 'key3'][k % 3], g: -30 + 3 * hash(tl.prompt, k), rate: 1.0 + 0.1 * hash(tl.prompt, k + 3) });
        u += (1 / tcps) * (0.6 + 0.9 * hash(tl.prompt, k)) * (ch === ' ' ? 0.7 : 1);
      });
      TOOL.go = u + (tl.style === 'edit' ? 0.15 : 0.25);
      cues.push({ t: TOOL.go, s: 'soft-pop', g: -14, rate: 1.2 });
      TOOL.gen0 = TOOL.go + 0.15;
      TOOL.gen1 = TOOL.gen0 + (tl.generate ?? (tl.style === 'edit' ? 1.3 : 1.4));
      cues.push({ t: TOOL.gen0, s: '@riser', g: -26, dur: TOOL.gen1 - TOOL.gen0 });
      cues.push({ t: TOOL.gen1, s: 'ding', g: -18 });
      const tm = meta(tl.media);
      if (tl.style !== 'edit' && tm && tm.audio) cues.push({ t: TOOL.gen1, s: '@media:' + tl.media, g: tl.audioGain ?? -5, dur: tl.show ?? 1.4 });
      TOOL.end = TOOL.gen1 + (tl.show ?? (tl.style === 'edit' ? 0.5 : 1.4));
      t = TOOL.end;
      ev({ type: 'tool', on: false });
      cues.push({ t, s: 'soft-swoosh', g: -14 });
      t += tl.style === 'edit' ? 0.15 : 0.35;
    }
    chatStart = t;
    const P = ep.pace ?? 1;                                   // < 1 = snappier: every default wait and hold shrinks
    for (const b of ep.beats) if (b.media && b.at != null) STILL[b.media] = STILL[b.media] ?? b.at;
    const cps = ep.typeSpeed || 13;
    let lastFrom = null;
    for (const b of ep.beats) {
      if (b.pause) { t += b.pause; continue; }
      const from = b.me != null || b.media ? 'me' : 'them';
      const text = b.me ?? b.them;
      if (from === 'me' && !b.media) {
        // think, then type it out character by character
        t += b.wait ?? (lastFrom === 'me' ? 0.25 : 0.55) * P;
        const chars = [...text];
        ev({ type: 'input', text: '' });
        chars.forEach((ch, k) => {
          ev({ type: 'input', text: chars.slice(0, k + 1).join('') });
          ev({ type: 'key', ch: ch.toLowerCase() });
          if (ch !== ' ') cues.push({ t, s: ['key1', 'key2', 'key3'][k % 3], g: -27 + 3 * hash(text, k), rate: 0.96 + 0.08 * hash(text, k + 7) });
          t += (1 / cps) * (0.6 + 0.9 * hash(text, k)) * (ch === ' ' ? 0.7 : 1);
        });
        t += 0.12;
        if (b.unsent) { t += b.hold ?? 0.6; lastFrom = from; continue; }   // typed, never sent: the video cuts on it
        MSGS.push({ from, text });
        ev({ type: 'add', n: MSGS.length }); ev({ type: 'input', text: '' });
        cues.push({ t, s: 'send', g: -13 });
        t += b.hold ?? (0.35 + 0.012 * text.length) * P;
      } else if (b.media) {
        // open the photo sheet, pick the clip, send it, let it play
        t += b.wait ?? 0.4 * P;
        ev({ type: 'picker', open: true, media: b.media, sel: false });
        cues.push({ t, s: 'soft-pop', g: -20 });
        t += 0.75 * Math.max(P, 0.75);
        ev({ type: 'picker', open: true, media: b.media, sel: true });
        cues.push({ t, s: 'soft-pop', g: -16, rate: 1.3 });
        t += 0.4;
        ev({ type: 'picker', open: false });
        MSGS.push({ from: 'me', media: b.media, at: b.at });
        ev({ type: 'add', n: MSGS.length });
        cues.push({ t, s: 'send', g: -12 });
        if (ep.booms) cues.push({ t: t + 0.05, s: 'boom', g: ep.boomGain ?? -10 });
        const mm = meta(b.media);
        if (b.at != null) { /* a still picture: no clip sound */ }
        else if (b.sound !== false && mm && mm.audio) cues.push({ t, s: '@media:' + b.media, g: b.audioGain ?? -6, dur: b.hold ?? 3.4 });
        else if (b.sound !== false) cues.push({ t: t + 0.2, s: 'wind', g: -22, dur: b.hold ?? 3.4 });
        t += b.hold ?? (b.at != null ? 1.4 : 3.4);
      } else {
        // the other person types (dots), then the message lands
        t += b.wait ?? 0.35 * P;
        const typing = b.typing ?? clamp(0.6 + 0.018 * text.length, 0.7, 1.7) * P;
        ev({ type: 'dots', on: true });
        t += typing;
        ev({ type: 'dots', on: false });
        MSGS.push({ from, text });
        ev({ type: 'add', n: MSGS.length });
        cues.push({ t, s: 'reply', g: -11 });
        if (ep.booms && isCaps(text) && b.boom !== false) cues.push({ t, s: 'boom', g: ep.boomGain ?? -12 });
        t += b.hold ?? clamp(0.7 + 0.04 * text.length, 0.9, 3.2) * (ep.readMul || 1) * P;
      }
      lastFrom = from;
    }
    t += ep.tail ?? 1.2;
    duration = t;
    EV.sort((x, y) => x.t - y.t);
    // a separator before the first message of today, and "Delivered" under the last one I sent
    if (firstTodayIdx > 0 && MSGS[firstTodayIdx]) MSGS[firstTodayIdx].sep = ep.todayLabel || 'Today';

    // measure the thread at every length so the scroll can glide between them
    const box = $('msgs');
    const counts = [...new Set([firstTodayIdx, ...EV.filter((e) => e.type === 'add').map((e) => e.n)])];   // every length the thread has
    for (const n of counts) for (const dots of [false, true]) {
      box.innerHTML = threadHTML(n, dots);
      HEIGHTS[n * 2 + (dots ? 1 : 0)] = box.offsetHeight;
    }
    const mu = ep.music;
    const music = mu ? { segments: [{ track: mu.track, t0: mu.from ?? 0, t1: duration, gain: mu.gain ?? -24, offset: mu.offset ?? 0, fadeIn: 0.2, fadeOut: 0.8, duck: false }] } : null;
    return { duration, cues: cues.sort((x, y) => x.t - y.t), music, mainStart: 0, exchanges: [0] };
  };

  function threadHTML(n, dots) {
    const list = MSGS.slice(0, n);
    let h = list.map((m, i) => msgHTML(m, i, list)).join('');
    const lastMe = [...list].reverse().find((m) => m.from === 'me');
    if (lastMe && list[list.length - 1] === lastMe && !dots) h += '<div class="deliv">Delivered</div>';
    if (dots) h += `<div class="m them gap"><div class="b dots"><i></i><i></i><i></i></div></div>`;
    return h + '<div style="height:28px"></div>';
  }

  // the state at time T: replay the events up to it
  function stateAt(T) {
    const s = { n: MSGS.filter((m) => m.hist).length, nT: 0, dots: false, dotsT: 0, input: '', key: null, keyT: -9, picker: null, pickerT: 0, hook: false, addT: -9 };
    for (const e of EV) {
      if (e.t > T) break;
      if (e.type === 'add') { s.prevN = s.n; s.n = e.n; s.addT = e.t; }
      else if (e.type === 'dots') { s.dots = e.on; s.dotsT = e.t; }
      else if (e.type === 'input') s.input = e.text;
      else if (e.type === 'key') { s.key = e.ch; s.keyT = e.t; }
      else if (e.type === 'picker') { s.picker = e.open ? e : null; if (e.open && !e.sel) s.pickerOpenT = e.t; }
      else if (e.type === 'hook') s.hook = e.on;
      else if (e.type === 'tool') s.tool = e.on;
    }
    return s;
  }

  // the AI video app at time T
  function renderTool(T, f) {
    const tl = EP.tool, tk = TOOL;
    document.getElementById('tool').classList.toggle('edit', tl.style === 'edit');
    if (tl.style === 'edit') return renderToolEdit(T);
    const [hh, mm] = (tl.clock || EP.toolClock || EP.clock || '11:24').split(':').map(Number);
    $('tClock').textContent = `${hh}:${String(mm).padStart(2, '0')}`;
    let n = 0, key = null, keyT = -9;
    for (const k of tk.keys) { if (k.t > T) break; n = k.n; key = k.ch; keyT = k.t; }
    const typed = [...tl.prompt].slice(0, n).join('');
    show('tPh', !typed, 'inline'); $('tTyped').textContent = typed;
    const gone = clamp((T - tk.go) / 0.3, 0, 1), ge = EASE.out(gone);
    $('tCaret').style.display = T < tk.go ? 'inline-block' : 'none';
    $('tCaret').style.opacity = Math.floor(T * 2.2) % 2 === 0 || T - keyT < 0.5 ? 1 : 0;
    // keyboard drops away once "generate" is tapped
    $('tKb').style.transform = `translateY(${(ge * 800).toFixed(1)}px)`;
    document.querySelectorAll('#tKb .k.down').forEach((k) => k.classList.remove('down'));
    const kd = KEYS[key], pressed = kd && T - keyT < 0.07 && T < tk.go;
    show('tPop', pressed && key !== ' ');
    if (pressed) {
      const el = document.querySelector(`#tKb .k[data-k="${CSS.escape(key)}"]`); if (el) el.classList.add('down');
      if (key !== ' ') { $('tPop').textContent = key; $('tPop').style.left = `${kd.x + kd.w / 2 - 75}px`; $('tPop').style.top = `${kd.y + kd.h - 240}px`; }
    }
    const tap = T >= tk.go && T < tk.go + 0.14;
    $('tGo').style.transform = `scale(${tap ? 0.86 : 1})`;
    // the prompt box sits on the keyboard, then slides to the bottom; the card grows into the space
    const boxTop = lerp(H - 780 - 30 - 170, H - 60 - 170, ge);
    $('tBox').style.top = `${boxTop.toFixed(1)}px`;
    const top = 270, bottom = boxTop - 30, ch = bottom - top, cw = ch * 9 / 16;
    Object.assign($('tCard').style, { top: `${top}px`, height: `${ch.toFixed(1)}px`, width: `${cw.toFixed(1)}px`, left: `${((W - cw) / 2).toFixed(1)}px` });
    // generating: shimmer and a percentage, then the clip plays
    const generating = T >= tk.gen0 && T < tk.gen1, done = T >= tk.gen1;
    show('tShim', !done); show('tGen', generating); show('tBadge', done); show('tImg', done);
    $('tShim').style.backgroundPosition = `${((T * 90) % 300).toFixed(1)}% 0`;
    $('tShim').style.opacity = T < tk.go ? 0.35 : 1;
    if (generating) {
      const p = clamp((T - tk.gen0) / (tk.gen1 - tk.gen0), 0, 1), pct = Math.min(99, Math.floor(100 * (1 - Math.pow(1 - p, 1.6))));
      $('tPct').textContent = `Generating… ${pct}%`;
      $('tBar').firstElementChild.style.width = `${pct}%`;
    }
    if (done) {
      const src = frameSrc(tl.media, Math.floor((T - tk.gen1) * FPS)), img = $('tImg');
      if (img.dataset.src !== src) { img.src = src; img.dataset.src = src; }
    }
    $('tFlash').style.opacity = done ? (0.8 * clamp(1 - (T - tk.gen1) / 0.25, 0, 1)).toFixed(3) : 0;
  }

  // the "edit" style: your start photo full screen, a short edit prompt, "Writing script… Rendering scene…", the result
  const stillSrc = (x) => frameSrc(x.media, Math.round((x.at ?? 0) * FPS));
  function renderToolEdit(T) {
    const tl = EP.tool, tk = TOOL;
    const [ch, cm] = (tl.clock || EP.toolClock || EP.clock || '11:24').split(':').map(Number);
    $('tClock').textContent = `${ch}:${String(cm).padStart(2, '0')}`;
    let n = 0, key = null, keyT = -9;
    for (const k of tk.keys) { if (k.t > T) break; n = k.n; key = k.ch; keyT = k.t; }
    const typed = [...tl.prompt].slice(0, n).join('');
    show('tPh', !typed, 'inline'); $('tPh').textContent = tl.placeholder || 'Describe a video...'; $('tTyped').textContent = typed;
    $('tCaret').style.display = T < tk.go ? 'inline-block' : 'none';
    $('tCaret').style.opacity = Math.floor(T * 2.2) % 2 === 0 || T - keyT < 0.5 ? 1 : 0;
    const ge = EASE.out(clamp((T - tk.go) / 0.25, 0, 1));
    $('tKb').style.transform = `translateY(${(ge * 800).toFixed(1)}px)`;
    document.querySelectorAll('#tKb .k.down').forEach((k) => k.classList.remove('down'));
    const kd = KEYS[key], pressed = kd && T - keyT < 0.07 && T < tk.go;
    show('tPop', pressed && key !== ' ');
    if (pressed) {
      const el = document.querySelector(`#tKb .k[data-k="${CSS.escape(key)}"]`); if (el) el.classList.add('down');
      if (key !== ' ') { $('tPop').textContent = key; $('tPop').style.left = `${kd.x + kd.w / 2 - 75}px`; $('tPop').style.top = `${kd.y + kd.h - 240}px`; }
    }
    $('tGo').style.transform = `scale(${T >= tk.go && T < tk.go + 0.14 ? 0.86 : 1})`;
    $('tBox').style.top = `${lerp(H - 780 - 30 - 150, H - 60 - 150, ge).toFixed(1)}px`;
    $('tBox').style.opacity = (1 - clamp((T - tk.gen0) / 0.2, 0, 1)).toFixed(2);
    // the picture fills the screen: the start photo, then the result
    Object.assign($('tCard').style, { top: '0px', left: '0px', width: `${W}px`, height: `${H}px`, borderRadius: '0px' });
    const done = T >= tk.gen1, img = $('tImg'), src = stillSrc(done ? tl.result : tl.photo);
    show('tImg', true); show('tShim', false); show('tGen', false); show('tBadge', false);
    if (img.dataset.src !== src) { img.src = src; img.dataset.src = src; }
    $('tPillTxt').textContent = tl.project || 'Untitled 1 of 1';
    const generating = T >= tk.gen0 && T < tk.gen1;
    show('tGenCard', generating);
    $('tDim').style.opacity = generating ? 0.45 : 0;
    if (generating) {
      const p = clamp((T - tk.gen0) / (tk.gen1 - tk.gen0), 0, 1);
      $('tStep').textContent = p < 0.5 ? 'Writing script...' : 'Rendering scene...';
      $('tGenBar').firstElementChild.style.width = `${(100 * (1 - Math.pow(1 - p, 1.5))).toFixed(1)}%`;
      $('tLogo').textContent = tl.logo || 'reimagine';
      $('tLogo').style.transform = `rotate(-6deg) scale(${(1 + 0.04 * Math.sin(T * 9)).toFixed(3)})`;
    }
    $('tFlash').style.opacity = done ? (0.8 * clamp(1 - (T - tk.gen1) / 0.25, 0, 1)).toFixed(3) : 0;
  }

  const show = (id, on, mode) => { $(id).style.display = on ? mode || 'block' : 'none'; };

  window.renderAt = async (T) => {
    const s = stateAt(T), f = Math.floor(T * FPS);
    // hook
    const rec = s.tool && TOOL.recording;
    show('hook', s.hook || rec);
    if (rec) {
      const img = $('hookImg'), src = frameSrc(TOOL.recording, Math.min(meta(TOOL.recording).count - 1, Math.floor((T - TOOL.t0) * FPS)));
      if (img.dataset.src !== src) { img.src = src; img.dataset.src = src; }
      $('hookCap').innerHTML = '';
    } else if (s.hook && HOOKCUTS) {
      let c = HOOKCUTS[0];
      for (const x of HOOKCUTS) if (T >= x.t0) c = x;
      const img = $('hookImg'), src = c.at != null ? frameSrc(c.media, Math.round(c.at * FPS)) : frameSrc(c.media, Math.floor((T - c.t0) * FPS));
      if (img.dataset.src !== src) { img.src = src; img.dataset.src = src; }
      img.style.transform = `scale(${(1 + 0.06 * clamp(1 - (T - c.t0) / 0.25, 0, 1)).toFixed(3)})`;
      $('hookCap').innerHTML = rich(EP.hook.caption || '');
    } else if (s.hook) {
      const k = EP.hook.media, img = $('hookImg'), src = frameSrc(k, f);
      if (img.dataset.src !== src) { img.src = src; img.dataset.src = src; }
      $('hookCap').innerHTML = rich(EP.hook.caption || '');
    }
    // clock: a minute passes every ~40 seconds of video
    const [hh, mm] = (EP.clock || '11:24').split(':').map(Number), add = Math.floor(Math.max(0, T - chatStart) / (EP.minuteEvery || 40));
    $('clock').textContent = `${hh}:${String(mm + add).padStart(2, '0')}`;
    show('tool', !!s.tool && !rec);
    if (s.tool && !rec) renderTool(T, f);

    // thread
    const key = `${s.n}|${s.dots}`;
    if (key !== lastCount) { $('msgs').innerHTML = threadHTML(s.n, s.dots); lastCount = key; }
    // "floor" is the top of the text field, which sits right on the keyboard (or the photo sheet)
    const pickerOpen = !!s.picker;
    const floor = (pickerOpen ? H - 1080 : H - 780) - 120;
    const hNow = HEIGHTS[s.n * 2 + (s.dots ? 1 : 0)] ?? $('msgs').offsetHeight;
    const hPrev = HEIGHTS[(s.prevN ?? s.n) * 2] ?? hNow;
    const since = Math.min(T - s.addT, s.dots ? T - s.dotsT : 9);
    const pg = EASE.out(clamp(since / 0.22, 0, 1));
    const h = lerp(Math.min(hPrev, hNow), hNow, pg);
    const visible = floor - 370 - 12;
    $('msgs').style.transform = `translateY(${(Math.min(0, visible - h)).toFixed(1)}px)`;
    // the newest bubble pops in
    const last = T - s.addT < 0.4 ? $('msgs').querySelector(`.m[data-i="${s.n - 1}"]`) : null;
    if (last) { const p = EASE.outBack(clamp((T - s.addT) / 0.22, 0, 1)); last.style.transform = `scale(${(0.88 + 0.12 * p).toFixed(3)})`; last.style.transformOrigin = last.classList.contains('me') ? '100% 100%' : '0 100%'; }
    // dots pulse
    $('msgs').querySelectorAll('.dots i').forEach((d, k) => { d.style.opacity = (0.35 + 0.65 * Math.max(0, Math.sin(T * 7 - k * 0.9))).toFixed(2); });
    // videos play from the moment they were sent
    $('msgs').querySelectorAll('img[data-media]:not([data-still])').forEach((im) => {
      const k = im.dataset.media, i = MSGS.findIndex((m) => m.media === k), addEv = EV.find((e) => e.type === 'add' && e.n === i + 1);
      const src = frameSrc(k, Math.max(0, Math.floor((T - (addEv ? addEv.t : 0)) * FPS)));
      if (im.dataset.src !== src) { im.src = src; im.dataset.src = src; }
    });

    // input field + keyboard
    $('bar').style.top = `${floor}px`;
    show('ph', !s.input, 'inline'); $('typed').textContent = s.input; show('sendBtn', !!s.input);
    $('caret').style.opacity = Math.floor(T * 2.2) % 2 === 0 || T - s.keyT < 0.5 ? 1 : 0;
    show('kb', !pickerOpen);
    document.querySelectorAll('#kb .k.down').forEach((k) => k.classList.remove('down'));
    const kd = KEYS[s.key], pressed = kd && T - s.keyT < 0.09 && !pickerOpen;
    show('pop', pressed && s.key !== ' ');
    if (pressed) {
      kd.el.classList.add('down');
      if (s.key !== ' ') { $('pop').textContent = s.key; $('pop').style.left = `${kd.x + kd.w / 2 - 75}px`; $('pop').style.top = `${kd.y + kd.h - 240}px`; }
    }
    // photo picker
    show('picker', pickerOpen);
    if (pickerOpen) {
      const pk = s.picker, pkKey = pk.media + pk.sel;
      if (pkKey !== lastPicker) {
        const sent = MSGS.slice(0, s.n).filter((m) => m.media).map((m) => m.media);   // only clips already sent
        const tiles = [pk.media, ...sent.filter((x) => x !== pk.media).reverse()].slice(0, 3);
        const fill = EP.cameraRoll || ['🍕', '🐶', '🎂', '🌅', '🏀', '🍩', '🎄', '🚗', '🐱'];
        $('pkGrid').innerHTML = tiles.map((k, i) => `<div class="${i === 0 && pk.sel ? 'sel' : ''}"><img src="${frameSrc(k, STILL[k] != null ? Math.round(STILL[k] * FPS) : 30)}"></div>`).join('') +
          fill.slice(0, 9 - tiles.length).map((e, i) => `<div style="background:hsl(${(i * 47 + 20) % 360} 45% 78%)"><img class="e" style="width:52%;height:52%;object-fit:contain" src="../assets/emoji/${ekey(e)}.png"></div>`).join('');
        lastPicker = pkKey;
      }
      const p = EASE.out(clamp((T - (s.pickerOpenT ?? T)) / 0.3, 0, 1));
      $('picker').style.transform = `translateY(${((1 - p) * 1080).toFixed(1)}px)`;
    } else lastPicker = '';

    const fl = s.hook ? 0 : Math.max(clamp(1 - (T - hookEnd) / 0.15, 0, 1) * (EP.hook ? 1 : 0),
      TOOL ? clamp(1 - Math.abs(T - TOOL.end) / 0.12, 0, 1) * (T >= TOOL.end ? 1 : 0) : 0);
    $('flash').style.opacity = (0.5 * fl).toFixed(3);
    const imgs = Array.from(document.images).filter((im) => !im.complete).map((im) => im.decode().catch(() => {}));
    if (imgs.length) await Promise.all(imgs);
  };
})();
