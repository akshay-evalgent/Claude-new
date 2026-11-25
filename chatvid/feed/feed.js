/* Feed engine: a phone's social feed scrolling post by post (likes counting up, bot comments),
   the clock jumping and the battery draining, until the phone dies; then a real clip, a
   notification that tries to pull you back, and a few lines of text.
   boot(episode) returns {duration, cues, music}; renderAt(T) draws time T. */
(() => {
  const W = 1080, H = 1920, FPS = 30;
  const $ = (id) => document.getElementById(id);
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const EASE = { out: (p) => 1 - Math.pow(1 - p, 3), inOut: (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2), outBack: (p) => { const c1 = 1.7, c3 = c1 + 1; return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2); } };
  const seg = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
  const isEmoji = (g) => /\p{Extended_Pictographic}/u.test(g);
  const ekey = (g) => Array.from(g).map((c) => c.codePointAt(0)).filter((c) => c !== 0xfe0f).map((c) => c.toString(16)).join('-');
  const esc = (s) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const rich = (s) => Array.from(seg.segment(String(s)), (x) => x.segment).map((g) => (isEmoji(g) ? `<img src="../assets/emoji/${ekey(g)}.png">` : esc(g))).join('');
  const fmt = (n) => (n >= 1e6 ? (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M' : n >= 1e3 ? (n / 1e3).toFixed(n >= 1e5 ? 0 : 1).replace(/\.0$/, '') + 'K' : String(Math.round(n)));

  let EP, P = [], OFF = [], duration = 0, deathT = 0, realT = 0, lastPost = -1;
  const meta = (k) => (EP.__mediaMeta && EP.__mediaMeta[k]) || null;
  const frameSrc = (k, i) => { const m = meta(k); return `../assets/media/${k}/f${String(Math.min(m.count - 1, Math.max(0, i)) + 1).padStart(4, '0')}.${m.ext}`; };

  window.boot = async (ep) => {
    EP = ep;
    const cues = [], music = [];
    $('list').innerHTML = ep.posts.map((p, i) => `<div class="post" id="post${i}">
      <div class="pHead"><div class="pAv" style="background:${p.color || '#555'}">${esc((p.user || '?')[0].toUpperCase())}</div>
        <div class="pWho"><b>${esc(p.user)}</b><span>${esc(p.sub || 'Suggested for you')}</span></div><div class="pDots">···</div></div>
      <div class="pImg"><img src="../assets/media/${p.img}.jpg"></div>
      <div class="pAct"><span class="h">♥ <span id="likes${i}"></span></span><span>💬 ${fmt(p.comments_n || p.likes / 40)}</span><span>↗ ${fmt(p.likes / 9)}</span></div>
      <div class="pCap"><b>${esc(p.user)}</b>${rich(p.caption)}</div>
      ${(p.comments || []).map((c, k) => `<div class="pCom" id="com${i}_${k}"><b>${esc(c[0])}</b>${rich(c[1])}</div>`).join('')}
    </div>`).join('');
    await document.fonts.ready;
    await Promise.all(Array.from(document.images).map((im) => im.decode().catch(() => {})));
    ep.posts.forEach((p, i) => { OFF[i] = $('post' + i).offsetTop; });

    // timeline: the hook sits over the first post, then each post holds, then a flick to the next
    let t = 0;
    const flick = ep.flick ?? 0.38;
    ep.posts.forEach((p, i) => {
      const hold = p.hold ?? 4.2;
      P.push({ t0: t, t1: t + hold, hold, ...p });
      cues.push({ t: t + 0.25, s: 'blip', g: -24, rate: 1.4 });
      (p.comments || []).forEach((c, k) => cues.push({ t: t + 0.9 + k * 0.45, s: 'blip', g: -30, rate: 1.7 }));
      t += hold;
      if (i < ep.posts.length - 1) { cues.push({ t: t - 0.05, s: 'soft-swoosh', g: -15, rate: 1.25 }); t += flick; }
    });
    const feedEnd = t;
    // low battery, then the phone dies
    const D = ep.death || {};
    const alertT = feedEnd - (D.alertLead ?? 1.6);
    cues.push({ t: alertT, s: 'notify', g: -14 });
    deathT = feedEnd + (D.after ?? 0.2);
    cues.push({ t: deathT, s: 'boom', g: -20 });
    const R = ep.real || {};
    realT = deathT + (D.black ?? 1.6);
    const realDur = R.dur ?? 9;
    if (R.media && meta(R.media) && meta(R.media).audio) cues.push({ t: realT, s: '@media:' + R.media, g: R.audioGain ?? -6, dur: realDur });
    if (R.notif) cues.push({ t: realT + (R.notif.at ?? 2), s: 'notify', g: -16 });
    duration = realT + realDur;
    // the feed's music gets louder as you scroll; everything stops when the phone dies
    if (ep.music) {
      const half = (deathT) / 2;
      music.push({ track: ep.music.track, t0: 0, t1: half, gain: ep.music.gain ?? -22, offset: ep.music.offset ?? 0, fadeIn: 0.2, fadeOut: 0.01, duck: false });
      music.push({ track: ep.music.track, t0: half, t1: deathT, gain: (ep.music.gain ?? -22) + 4, offset: (ep.music.offset ?? 0) + half, fadeIn: 0.01, fadeOut: 0.04, duck: false });
    }
    if (R.music) music.push({ track: R.music.track, t0: realT + (R.music.at ?? 1.5), t1: duration, gain: R.music.gain ?? -24, offset: R.music.offset ?? 0, fadeIn: 2.5, fadeOut: 1.5, duck: false });
    EP.__alertT = alertT; EP.__feedEnd = feedEnd;
    return { duration, cues: cues.sort((a, b) => a.t - b.t), music: music.length ? { segments: music } : null, mainStart: 0, exchanges: P.map((p) => +p.t0.toFixed(2)) };
  };

  const show = (id, on, mode) => { $(id).style.display = on ? mode || 'block' : 'none'; };

  window.renderAt = async (T) => {
    // which post: the current one, or a flick between two
    let i = P.findIndex((p) => T < p.t1);
    if (i < 0) i = P.length - 1;
    const p = P[i];
    let y = OFF[i] - 230;
    if (i > 0 && T < p.t0) {      // flicking from the previous post
      const q = EASE.inOut(clamp((T - P[i - 1].t1) / (EP.flick ?? 0.38), 0, 1));
      y = OFF[i - 1] - 230 + (OFF[i] - OFF[i - 1]) * q;
    }
    $('list').style.transform = `translateY(${(-y).toFixed(1)}px)`;
    if (i !== lastPost) lastPost = i;
    // likes count up while you look; comments land one by one
    P.forEach((q, k) => {
      const age = T - q.t0, el = $('likes' + k);
      el.textContent = fmt(q.likes * (0.82 + 0.18 * EASE.out(clamp(age / q.hold, 0, 1))));
      (q.comments || []).forEach((_, c) => { $(`com${k}_${c}`).style.opacity = age >= 0.9 + c * 0.45 || k < i ? 1 : 0; });
    });
    // status bar: the clock jumps, the battery drains
    const pp = P[Math.min(i, P.length - 1)];
    $('clock').textContent = pp.clock || EP.clock || '7:02';
    const pct = pp.battery ?? 20;
    $('batFill').style.width = `${Math.max(3, pct * 0.5)}px`;
    $('batFill').style.background = pct <= 10 ? '#ff3b30' : '#fff';
    $('batPct').textContent = pct + '%';
    // the hook
    const hk = EP.hook;
    show('hookCap', !!hk && T < (hk.dur ?? 2.4));
    if (hk) $('hookCap').innerHTML = rich(hk.caption || '');
    // low battery alert
    const aOn = T >= EP.__alertT && T < deathT;
    show('alert', aOn);
    if (aOn) { const a = EASE.outBack(clamp((T - EP.__alertT) / 0.25, 0, 1)); $('alert').style.transform = `translate(-50%, -50%) scale(${(0.85 + 0.15 * a).toFixed(3)})`; }
    // death: the screen snaps off
    let blk = 0;
    if (T >= deathT && T < realT) blk = 1;
    if (T >= realT) blk = 1 - clamp((T - realT) / 1.2, 0, 1);     // eyes adjusting to the real world
    const R = EP.real || {};
    const end = duration - (R.fadeOut ?? 1.0);
    if (T > end) blk = Math.max(blk, clamp((T - end) / (R.fadeOut ?? 1.0), 0, 1));
    $('black').style.opacity = blk.toFixed(3);
    // the real thing
    const rOn = T >= realT;
    show('real', rOn);
    if (rOn && R.media) {
      const src = meta(R.media) ? frameSrc(R.media, Math.floor((T - realT) * FPS)) : `../assets/media/${R.media}.jpg`;
      if ($('realImg').dataset.src !== src) { $('realImg').src = src; $('realImg').dataset.src = src; }
    }
    // the feed tries once more
    const N = R.notif, nT = realT + ((N && N.at) ?? 2), nOut = nT + ((N && N.stay) ?? 2.2);
    const nOn = !!N && T >= nT && T < nOut + 0.4;
    show('notif', nOn, 'flex');
    if (nOn) {
      $('nApp').textContent = N.app || 'feed'; $('nTitle').innerHTML = rich(N.title || ''); $('nText').innerHTML = rich(N.text || '');
      const a = EASE.outBack(clamp((T - nT) / 0.35, 0, 1)), out = EASE.inOut(clamp((T - nOut) / 0.4, 0, 1));
      $('notif').style.transform = `translateY(${((1 - a) * -260 - out * 300).toFixed(1)}px)`;
    }
    // the last lines
    if ($('lines').dataset.n !== String((R.lines || []).length)) { $('lines').innerHTML = (R.lines || []).map((l) => `<div>${rich(l.text)}</div>`).join(''); $('lines').dataset.n = String((R.lines || []).length); }
    (R.lines || []).forEach((l, k) => { $('lines').children[k].style.opacity = clamp((T - realT - l.at) / 0.8, 0, 1).toFixed(3); });
    const imgs = Array.from(document.images).filter((im) => !im.complete).map((im) => im.decode().catch(() => {}));
    if (imgs.length) await Promise.all(imgs);
  };
})();
