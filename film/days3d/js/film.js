// 30,000 DAYS, the film: 21 shots, 165 s at 24 fps. Each shot is { dur, build(ctx) -> { update(t), overlay(g, W, H, t, h), bloom } }.
// Characters move on twos (A.twos); cameras and light move every frame.
import * as THREE from 'three';
import { makeChar, HERO, NEIGHBOUR, WIFE, SIT } from './char.js';
import { toon, mesh, canvasTex, INK } from './toon.js';
import * as P from './props.js';
import * as U from './ui.js';
import * as A from './anim.js';
import * as S from './sets.js';
import { SHOTS } from './shots.js';
const { V, box, cam } = S;
const OLD = { ...HERO, hair: '#b9b3ac', hairHi: '#f4f0ea', browColor: '#a8a29a', wrinkles: true, skin: '#f2d0b6' };

// ---------- overlay helpers ----------
const K = (W, H) => (H > W ? W / 1080 : W / 1600);
function card(g, W, H, t, t0, label, num, jp, o = {}) {
  if (t < t0) return;
  const k = K(W, H), u = A.seg(t, t0, t0 + 0.4), sc = 0.6 + 0.4 * A.back(u), al = Math.min(1, u * 2) * (o.t1 ? 1 - A.seg(t, o.t1, o.t1 + 0.4) : 1);
  if (al <= 0) return;
  const x = o.x ?? W / 2, y = o.y ?? H * 0.2, size = (o.size || 120) * k;
  g.save(); g.globalAlpha = al; g.translate(x, y); g.scale(sc, sc);
  U.text(g, label, 0, -size * 0.72, { font: `800 ${size * 0.26}px Archivo`, color: o.labelColor || 'rgba(255,240,215,0.92)', align: 'center', letter: 10 * k });
  U.text(g, num, 0, size * 0.3, { font: `800 ${size}px Archivo`, color: o.color || '#ffd27a', align: 'center', glow: o.glow || 'rgba(255,170,60,0.9)', blur: 40 * k });
  if (jp) U.text(g, jp, 0, size * 0.72, { font: `${size * 0.24}px IPAGothic`, color: o.labelColor || 'rgba(255,240,215,0.88)', align: 'center' });
  g.restore();
}
const fmt = (n) => Math.round(n).toLocaleString('en-US');
function sfxAt(g, W, H, t, t0, text, x, y, size, o = {}) {
  const d = o.d ?? 0.9; if (t < t0 || t > t0 + d) return;
  const u = A.seg(t, t0, t0 + 0.12), fade = 1 - A.seg(t, t0 + d - 0.2, t0 + d), k = K(W, H);
  g.save(); g.globalAlpha = fade; const sc = 0.7 + 0.3 * A.back(u); const jit = o.shake ? Math.sin(t * 90) * 4 * k : 0;
  U.sfx(g, text, x + jit, y, size * k * sc, o); g.restore();
}
function blackout(g, W, H, a) { if (a <= 0) return; g.fillStyle = `rgba(0,0,0,${Math.min(1, a)})`; g.fillRect(0, 0, W, H); }
function whiteout(g, W, H, a) { if (a <= 0) return; g.fillStyle = `rgba(255,250,240,${Math.min(1, a)})`; g.fillRect(0, 0, W, H); }
function notes(g, W, H, t, t0, x, y, o = {}) {   // floating music notes
  const k = K(W, H);
  for (let i = 0; i < (o.n || 5); i++) {
    const tt = t - t0 - i * 0.45; if (tt < 0 || tt > 2.2) continue;
    const a = Math.sin(Math.PI * tt / 2.2);
    U.text(g, i % 2 ? '♪' : '♫', x + Math.sin(tt * 2 + i) * 30 * k + i * 26 * k, y - tt * 70 * k, { font: `${48 * k}px IPAGothic`, color: `rgba(255,236,200,${a})`, align: 'center' });
  }
}
// the bedroom hero with his phone, face lit from below
function heroWithPhone(scene, o = {}) {
  const c = makeChar(HERO, { expr: o.expr || 'tired', face: { lookY: -1 } }); scene.add(c.root);
  const ph = P.phone(scene, o.draw || null, { w: 0.9, h: 1.8, lightI: o.lightI ?? 0.18, lightD: 6, lightZ: 0.8, lightColor: 0x6fa0ff, res: 1 });
  return { c, ph };
}
function placePhone(c, ph) {
  c.root.updateMatrixWorld(true);
  const hp = c.armL.hand.getWorldPosition(V(0, 0, 0)).add(c.armR.hand.getWorldPosition(V(0, 0, 0))).multiplyScalar(0.5);
  ph.position.copy(hp).add(V(0, -0.1, 0)); ph.lookAt(c.head.getWorldPosition(V(0, 0, 0)));
}
const PHONE_POSE = { lean: 0.32, headX: 0.42, armR: [-1.05, -0.32, -1.55, 0.35], armL: [-1.05, 0.32, -1.55, -0.35] };
const sitBed = (o = {}) => ({ ...SIT({ h: S.BED_EDGE.h }), turn: S.BED_EDGE.turn, ...o });
function setRoot(c, x, z) { c.root.position.set(x, 0, z); }

// lock-screen drawing with state
function lockDraw(st) {
  return (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, st.bg0 || '#16224a'); gr.addColorStop(0.6, st.bg1 || '#2a2a5a'); gr.addColorStop(1, st.bg2 || '#4a2f5a'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    P.reseed(5); for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(255,240,210,${P.rnd() * 0.6})`; g.beginPath(); g.arc(P.rnd() * w, P.rnd() * h * 0.5, P.rnd() * 2, 0, 7); g.fill(); }
    g.fillStyle = '#ffffff'; g.textAlign = 'center';
    g.font = '500 17px Archivo'; g.fillText(st.date || 'Tuesday 12 March', w / 2, h * 0.08);
    g.font = '300 88px Archivo'; g.fillText(st.time || '2:14', w / 2, h * 0.2);
    if (st.notif !== undefined && st.notif > -1) {
      const x = 28, y = h * 0.36 - (1 - st.notif) * 340, cw = w - 56, ch = 300;
      g.globalAlpha = Math.max(0, Math.min(1, st.notif * 1.4));
      U.rrect(g, x, y, cw, ch, 34); g.fillStyle = 'rgba(245,240,255,0.94)'; g.fill();
      U.rrect(g, x + 26, y + 26, 64, 64, 16); g.fillStyle = '#2a170c'; g.fill();
      g.fillStyle = '#ffc566'; U.rrect(g, x + 44, y + 40, 28, 40, 8); g.fill(); g.fillStyle = '#7a4a2a'; g.fillRect(x + 42, y + 34, 32, 8);
      g.textAlign = 'left'; g.fillStyle = '#5a5470'; g.font = '700 22px Archivo'; g.fillText('30,000 DAYS', x + 108, y + 52); g.textAlign = 'right'; g.font = '500 20px Archivo'; g.fillText('now', x + cw - 26, y + 52);
      g.textAlign = 'left'; g.fillStyle = '#16122a'; g.font = '800 30px Archivo'; g.fillText(st.title || 'DAYS LEFT', x + 108, y + 92);
      g.font = '800 64px Archivo'; g.fillText(st.days || '21,236', x + 26, y + 170);
      g.font = '600 18px Archivo'; g.fillStyle = '#5a5470'; g.fillText(st.sub || 'days left in your jar', x + 28, y + 210);
      U.rrect(g, x + 26, y + 232, cw - 52, 50, 25); g.fillStyle = st.pressed ? '#d89a3a' : '#ffc566'; g.fill();
      g.fillStyle = '#2a170c'; g.textAlign = 'center'; g.font = '700 24px Archivo'; g.fillText(st.button || 'Remind me later', w / 2, y + 266);
      g.globalAlpha = 1;
    }
    if (st.toast) { g.globalAlpha = st.toast; U.rrect(g, 60, h * 0.8, w - 120, 64, 32); g.fillStyle = 'rgba(20,16,40,0.85)'; g.fill(); g.fillStyle = '#fff'; g.textAlign = 'center'; g.font = '600 24px Archivo'; g.fillText(st.toastText || 'Reminder set: later', w / 2, h * 0.8 + 41); g.globalAlpha = 1; }
    if (st.dim) { g.fillStyle = `rgba(0,0,0,${st.dim})`; g.fillRect(0, 0, w, h); }
  };
}
// the POV rig: room behind, phone in hand
function povRig(scene, o = {}) {
  scene.background = new THREE.Color('#05081c');
  const R = S.bedroom(scene, { label: o.label || '21,236', jarI: 30 });
  R.setBoxes(o.boxes || 0);
  const rig = new THREE.Group(); scene.add(rig);
  const st = { notif: -1 };
  const ph = P.phone(rig, null, { w: 3.0, h: 6.0, lightI: 5, lightD: 10, lightZ: 2.5, bright: 0.92 });
  const scr = ph.children.find((m) => m.material && m.material.map); const tex = scr.material.map;
  const redraw = (s) => { const c = tex.image; const g = c.getContext('2d'); g.setTransform(2, 0, 0, 2, 0, 0); lockDraw(s)(g, 360, 720); tex.needsUpdate = true; };
  const hand = S.povHand(rig); hand.group.position.set(0.9, -1.9, -0.1); hand.group.scale.setScalar(1.7);
  return { R, rig, ph, st, redraw, hand };
}
// phone screens: feed / game / next / call
function screenDraw(kind, s) {
  return (g, w, h) => {
    const hue = s.hue ?? 210;
    if (kind === 'feed') {
      g.fillStyle = `hsl(${hue},40%,16%)`; g.fillRect(0, 0, w, h);
      const off = (s.scroll || 0) % 340;
      for (let i = -1; i < 5; i++) { const y = 40 + i * 340 - off; const k = Math.floor(((s.scroll || 0) / 340)) + i; g.fillStyle = `hsl(${(hue + k * 57) % 360},70%,${55 + (k % 2) * 10}%)`; U.rrect(g, 30, y, w - 60, 250, 24); g.fill(); g.fillStyle = 'rgba(255,255,255,0.85)'; g.fillRect(30, y + 268, w * 0.6, 18); g.fillRect(30, y + 296, w * 0.4, 14); }
      g.fillStyle = '#ff4a6a'; g.beginPath(); g.arc(w - 70, h * 0.62, 26, 0, 7); g.fill();
    } else if (kind === 'game') {
      g.fillStyle = '#1a1040'; g.fillRect(0, 0, w, h);
      for (let y = 0; y < 8; y++) for (let x = 0; x < 6; x++) { g.fillStyle = ['#ff5a7a', '#ffc54a', '#5ad0ff', '#8aff7a'][(x * 3 + y * 5 + (s.level || 0)) % 4]; U.rrect(g, 40 + x * 108, 360 + y * 108, 92, 92, 18); g.fill(); }
      g.fillStyle = '#fff'; g.textAlign = 'center'; g.font = '800 64px Archivo'; g.fillText(`LEVEL ${s.level || 248}`, w / 2, 200); g.font = '500 32px Archivo'; g.fillText('one more?', w / 2, 260);
    } else if (kind === 'next') {
      g.fillStyle = '#0a0a12'; g.fillRect(0, 0, w, h); g.fillStyle = '#2a3a6a'; g.fillRect(0, h * 0.18, w, h * 0.32);
      g.fillStyle = '#fff'; g.textAlign = 'center'; g.font = '700 46px Archivo'; g.fillText('Next episode in', w / 2, h * 0.66); g.font = '800 180px Archivo'; g.fillText(String(s.count ?? 5), w / 2, h * 0.84);
      g.strokeStyle = '#e8424a'; g.lineWidth = 14; g.beginPath(); g.arc(w / 2, h * 0.8, 130, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (s.ring ?? 0.8)); g.stroke();
    } else if (kind === 'call') {
      const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#3a2a4a'); gr.addColorStop(1, '#1a1428'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.fillStyle = '#fff'; g.textAlign = 'center'; g.font = '500 30px Archivo'; g.fillText(s.declined ? 'Call ended' : 'incoming call', w / 2, h * 0.14);
      g.fillStyle = '#c8402e'; g.beginPath(); g.arc(w / 2, h * 0.3, 110, 0, 7); g.fill(); g.fillStyle = '#fff'; g.font = '800 120px Archivo'; g.fillText('M', w / 2, h * 0.3 + 44);
      g.font = '700 76px Archivo'; g.fillText('Mom ♥', w / 2, h * 0.47);
      if (!s.declined) {
        for (const [x, c, lab] of [[w * 0.27, '#e8424a', 'Decline'], [w * 0.73, '#3ac86a', 'Accept']]) { g.fillStyle = c; g.beginPath(); g.arc(x, h * 0.8, 72, 0, 7); g.fill(); g.fillStyle = '#fff'; g.font = '500 26px Archivo'; g.fillText(lab, x, h * 0.8 + 116); }
        U.rrect(g, w * 0.18, h * 0.6, w * 0.64, 70, 35); g.fillStyle = s.pressed ? 'rgba(255,197,102,0.9)' : 'rgba(255,255,255,0.18)'; g.fill(); g.fillStyle = s.pressed ? '#2a170c' : '#fff'; g.font = '700 30px Archivo'; g.fillText('Remind me later', w / 2, h * 0.6 + 46);
      } else { g.font = '500 32px Archivo'; g.fillStyle = 'rgba(255,255,255,0.75)'; g.fillText('Remind me in 1 hour', w / 2, h * 0.62); }
    }
  };
}
function liveScreen(ph) { const scr = ph.children.find((m) => m.material && m.material.map); const tex = scr.material.map; const c = tex.image; return (kind, s) => { const g = c.getContext('2d'); const r = c.width / 360; g.setTransform(r, 0, 0, r, 0, 0); screenDraw(kind, s)(g, 360, 720); tex.needsUpdate = true; }; }

export const FILM = {
  // 0:00 · THE HOOK
  s01_lock: { dur: 6, build(ctx) {
    const { scene, camera } = ctx; const r = povRig(scene, {});
    r.rig.position.set(-3.0 + (ctx.vertical ? 3.0 : 0), 6.6, -1); r.rig.rotation.set(0.08, 0.2, -0.06);
    const camBase = ctx.vertical ? [0, 7.2, 8.6] : [0, 7.2, 8.5];
    const bz = (t) => A.pulse(t, 0.45, 0.45) + A.pulse(t, 1.55, 0.45);
    return {
      bloom: { strength: 0.7, radius: 0.55, threshold: 0.88 },
      update(t) {
        const tw = A.twos(t);
        r.st.notif = t < 0.45 ? -1 : A.back(A.seg(t, 0.45, 0.85)) * (1 - A.seg(t, 4.15, 4.45));
        if (t > 4.45) r.st.notif = -1;
        r.st.pressed = t > 3.85 && t < 4.3; r.st.toast = A.seg(t, 4.4, 4.7) * (1 - A.seg(t, 5.6, 5.95)); r.st.dim = A.seg(t, 5.0, 6.0) * 0.35;
        r.redraw(r.st);
        const sh = bz(t) * 0.05; r.rig.position.x = (-3.0 + (ctx.vertical ? 3.0 : 0)) + Math.sin(t * 80) * sh + A.wob(t, 0.3) * 0.04; r.rig.position.y = 6.6 + A.wob(t, 0.25, 2) * 0.05;
        // the thumb travels to the button and presses
        const reach = A.inOut(A.seg(tw, 2.8, 3.7)) * (1 - A.seg(tw, 4.4, 5.0));
        r.hand.thumb.rotation.z = 0.2 * reach; r.hand.thumb.position.set(0.05 - 0.35 * reach, -0.32 + 0.42 * reach, 0.02 + (t > 3.85 && t < 4.25 ? -0.06 : 0.04) * reach);
        cam(camera, [camBase[0], camBase[1] - t * 0.05, camBase[2] - t * 0.25], [ctx.vertical ? 0.2 : 0.5, 6.0, -10], ctx.vertical ? 62 : 42);
      },
      overlay(g, W, H, t) {
        const k = K(W, H); U.vignette(g, W, H, 0.6);
        sfxAt(g, W, H, t, 0.45, 'BZZT', W * (ctx.vertical ? 0.72 : 0.44), H * (ctx.vertical ? 0.12 : 0.1), 84, { rot: 0.18, fill: '#bfe0ff', stroke: '#16122a', outer: 'rgba(0,0,0,0)', d: 0.8, shake: true });
        sfxAt(g, W, H, t, 1.55, 'BZZT', W * (ctx.vertical ? 0.3 : 0.5), H * (ctx.vertical ? 0.16 : 0.16), 70, { rot: -0.12, fill: '#bfe0ff', stroke: '#16122a', outer: 'rgba(0,0,0,0)', d: 0.7, shake: true });
        U.text(g, '2:14 A.M.', 48 * k, H - 52 * k, { font: `700 ${30 * k}px Archivo`, color: 'rgba(255,255,255,0.85)', letter: 6 * k });
      },
    };
  } },

  // 0:06 · CARD ONE
  s02_card1: { dur: 6, build(ctx) {
    const { scene, camera } = ctx; scene.background = new THREE.Color('#05081c');
    const R = S.bedroom(scene, { label: '21,236' });
    const { c, ph } = heroWithPhone(scene); setRoot(c, S.BED_EDGE.x, S.BED_EDGE.z);
    return {
      bloom: { strength: 0.65, radius: 0.5, threshold: 0.85 },
      update(t) {
        const tw = A.twos(t), sc = Math.sin(tw * 5) * 0.06;
        c.pose(sitBed({ ...PHONE_POSE, armR: [-1.05, -0.32, -1.55 + sc, 0.35], headX: 0.42 + A.wob(tw, 0.2) * 0.03 }));
        c.setFace('tired', { blink: tw > 3.0 && tw < 3.17, lookY: -1 }); placePhone(c, ph);
        const u = A.inOut(t / 6);
        if (ctx.vertical) cam(camera, [8 - u * 1.5, 9 - u * 0.5, 4 - u * 2], [-2.5, 7.5, -12], 60);
        else cam(camera, [13 - u * 2.5, 9.5 - u * 0.6, 9 - u * 3], [-1.0, 7.4, -13], 44);
      },
      overlay(g, W, H, t) { U.vignette(g, W, H, 0.55); card(g, W, H, t, 0.5, 'DAYS LEFT', '21,236', null, { x: ctx.vertical ? W / 2 : W * 0.3, y: ctx.vertical ? H * 0.16 : H * 0.2 }); },
    };
  } },

  // 0:12 · THE MONTAGE: every swipe costs a marble
  s03_swipes: { dur: 9, build(ctx) {
    const { scene, camera } = ctx; scene.background = new THREE.Color('#090a1e');
    scene.add(new THREE.AmbientLight(0x6a6aa0, 1.5)); const key = new THREE.DirectionalLight(0xffe0c8, 1.6); key.position.set(4, 6, 10); scene.add(key);
    P.sky(scene, { stops: [[0, '#05061a'], [0.5, '#0e1238'], [1, '#1a1a40']], stars: 300, r: 400 });
    const kinds = ['feed', 'game', 'next']; const phones = [];
    kinds.forEach((kind, i) => {
      const grp = new THREE.Group(); scene.add(grp); grp.position.set((i - 1) * 9.5, 1.2 - Math.abs(i - 1) * 0.6, 0); grp.rotation.set(0.05, (1 - i) * 0.22, (i - 1) * -0.06);
      const ph = P.phone(grp, null, { w: 4.2, h: 8.4, lightI: 10, lightD: 12, lightZ: 3, bright: 0.95, res: 1 });
      const hand = S.povHand(grp); hand.group.position.set(1.25, -2.9, -0.1); hand.group.scale.setScalar(2.4);
      phones.push({ grp, draw: liveScreen(ph), hand, kind, base: grp.position.clone() });
    });
    const swipeT = (i) => [0.5, 1.4, 2.3, 3.1, 3.9, 4.6, 5.3, 6.0, 6.6, 7.2, 7.8, 8.3].filter((x, j) => j % 3 === i || true).map((x, j) => x + i * 0.27);
    const SW = [0, 1, 2].map((i) => [0.55, 1.55, 2.55, 3.45, 4.3, 5.1, 5.85, 6.55, 7.2, 7.8, 8.35].map((x) => x + i * 0.31));
    const marbles = S.glowPoints(scene, 60, 1.6);
    const mcol = new THREE.Color('#ffbf4a');
    return {
      bloom: { strength: 0.7, radius: 0.5, threshold: 0.85 },
      update(t) {
        const tw = A.twos(t);
        phones.forEach((p, i) => {
          const n = SW[i].filter((x) => x <= t).length, last = SW[i].filter((x) => x <= t).pop() ?? -9;
          const sw = A.seg(t, last, last + 0.35);
          if (p.kind === 'feed') p.draw('feed', { scroll: (n - 1 + A.out(sw)) * 340, hue: 210 });
          else if (p.kind === 'game') p.draw('game', { level: 248 + n });
          else p.draw('next', { count: 5 - (n % 6), ring: 1 - ((t * 0.9) % 1) });
          const th = Math.sin(Math.PI * A.seg(tw, last, last + 0.33));
          p.hand.thumb.position.set(-0.3 - 0.1 * th, -0.1 + 0.5 * th, 0.06); p.hand.thumb.rotation.z = 0.2 + 0.3 * th;
          p.grp.position.y = p.base.y + A.wob(t, 0.3, i) * 0.12;
          SW[i].forEach((s0, j) => {
            const id = i * 20 + j, u = t - s0;
            if (u < 0 || u > 2.2) { marbles.hide(id); return; }
            marbles.set(id, V(p.base.x + 3.4 + j * 0.03, p.base.y + 2.2 - 4.9 * u * u - u * 0.6, 0.6), mcol, 1.5 * (1 - A.seg(u, 1.6, 2.2)));
          });
        });
        marbles.done();
        const u = t / 9; cam(camera, ctx.vertical ? [-2 + u * 4, 0, 52] : [-2 + u * 4, 0.3, 30 - u * 2], [u * 2 - 1, 0.2, 0], ctx.vertical ? 50 : 36);
      },
      overlay(g, W, H, t) {
        const k = K(W, H); U.vignette(g, W, H, 0.5);
        SW.forEach((arr, i) => arr.forEach((s0) => sfxAt(g, W, H, t, s0 + 0.15, 'TINK', W * (0.27 + i * 0.26) + 60 * k, H * (0.62 + (i % 2) * 0.05), 44, { rot: -0.15, fill: '#ffd27a', stroke: '#2a170c', d: 0.5 })));
        const n = SW.flat().filter((x) => x + 0.15 <= t).length;
        U.text(g, 'DAYS LEFT', W / 2, H - 112 * k, { font: `700 ${20 * k}px Archivo`, color: 'rgba(255,244,220,0.75)', align: 'center', letter: 8 * k });
        U.text(g, fmt(21236 - n), W / 2, H - 52 * k, { font: `800 ${54 * k}px Archivo`, color: '#ffd27a', align: 'center', glow: 'rgba(255,170,60,0.8)', blur: 20 * k });
        U.text(g, 'EVERY SWIPE COSTS A MARBLE', W / 2, 70 * k, { font: `800 ${30 * k}px Archivo`, color: 'rgba(255,244,220,0.85)', align: 'center', letter: 6 * k });
      },
    };
  } },

  // 0:21 · MOM CALLS
  s04_mom: { dur: 5, build(ctx) {
    const { scene, camera } = ctx; const r = povRig(scene, { boxes: 1 });
    r.R.setSky(S.SKY.dusk); r.rig.position.set(-3.0 + (ctx.vertical ? 3.0 : 0), 6.6, -1); r.rig.rotation.set(0.06, 0.18, -0.05);
    const scr = r.ph.children.find((m) => m.material && m.material.map); const tex = scr.material.map;
    const draw = (s) => { const g = tex.image.getContext('2d'); g.setTransform(2, 0, 0, 2, 0, 0); screenDraw('call', s)(g, 360, 720); tex.needsUpdate = true; };
    return {
      bloom: { strength: 0.6, radius: 0.5, threshold: 0.88 },
      update(t) {
        const tw = A.twos(t), ring = t < 3.0;
        draw({ pressed: t > 2.75 && t < 3.1, declined: t >= 3.1 });
        r.rig.position.x = (-3.0 + (ctx.vertical ? 3.0 : 0)) + (ring ? Math.sin(t * 70) * 0.03 * (Math.sin(t * 6) > 0 ? 1 : 0) : 0);
        const reach = A.inOut(A.seg(tw, 1.6, 2.6)) * (1 - A.seg(tw, 3.4, 4.0));
        r.hand.thumb.rotation.z = 0.2 * reach; r.hand.thumb.position.set(0.05 - 0.4 * reach, -0.32 + 0.78 * reach, 0.02 + (t > 2.75 && t < 3.05 ? -0.06 : 0.04) * reach);
        cam(camera, [0, 7.2, 8.5 - t * 0.15], [ctx.vertical ? 0.2 : 0.5, 6.0, -10], ctx.vertical ? 62 : 42);
        const left = Math.round(r.R.jarMax * 0.78) - (t > 3.2 ? 1 : 0); r.R.jarMarbles.count = left;
      },
      overlay(g, W, H, t) {
        const k = K(W, H); U.vignette(g, W, H, 0.55);
        if (t < 3.0) sfxAt(g, W, H, t, 0.15, 'RING RING', W * (ctx.vertical ? 0.7 : 0.47), H * 0.12, 64, { rot: 0.1, fill: '#ffe0f0', stroke: '#2a1428', d: 2.6, shake: true });
        sfxAt(g, W, H, t, 3.25, 'TINK', W * (ctx.vertical ? 0.75 : 0.66), H * (ctx.vertical ? 0.5 : 0.42), 52, { rot: -0.15, fill: '#ffd27a', stroke: '#2a170c', d: 0.7 });
      },
    };
  } },

  // 0:26 · THE YEARS: day and night race, boxes pile up, cold marbles leave
  s05_timelapse: { dur: 14, build(ctx) {
    const { scene, camera } = ctx; scene.background = new THREE.Color('#05081c');
    const R = S.bedroom(scene, { label: '' });
    const { c, ph } = heroWithPhone(scene); setRoot(c, S.BED_EDGE.x, S.BED_EDGE.z);
    const lab = R.jar.children.find((m) => m.material && m.material.map && m.geometry.type === 'CylinderGeometry');
    const labTex = lab.material.map; const relabel = (n) => { const g = labTex.image.getContext('2d'); const w = labTex.image.width, h = labTex.image.height; g.fillStyle = '#f2e6cc'; g.fillRect(0, 0, w, h); g.strokeStyle = '#3a2410'; g.lineWidth = 8; g.strokeRect(10, 10, w - 20, h - 20); g.fillStyle = '#3a2410'; g.textAlign = 'center'; g.font = '700 96px Archivo'; g.fillText(fmt(n), w / 2, h * 0.62); g.font = '500 34px Archivo'; g.fillText('DAYS LEFT', w / 2, h * 0.88); labTex.needsUpdate = true; };
    const cold = S.glowPoints(scene, 40, 0.9); const sky2 = S.glowPoints(scene, 400, 2.6);
    const poses = [sitBed(PHONE_POSE), sitBed({ ...PHONE_POSE, lean: -0.35, headX: 0.1, armR: [-1.6, -0.2, -1.2, 0.3], armL: [-1.5, 0.2, -1.3, -0.3] }), sitBed({ ...PHONE_POSE, lean: 0.5, headX: 0.6 }), sitBed({ ...PHONE_POSE, side: 0.15, headZ: 0.2 })];
    const D0 = 21226, D1 = 18262;
    return {
      bloom: { strength: 0.7, radius: 0.5, threshold: 0.85 },
      update(t) {
        const tw = A.twos(t), u = t / 14;
        const phase = u * 18;    // 4.5 days pass on screen, standing in for eight years
        const s = S.skyAt(phase); R.setSky(s);
        const days = D0 - (D0 - D1) * A.smooth(u); relabel(days);
        R.setFill(0.8 - 0.1 * u);
        const nb = 1 + u * 11.5; R.setBoxes(nb, (nb % 1) * 4);
        const pi = Math.floor(tw * 1.5) % poses.length; c.pose(poses[pi]); c.setFace(pi === 1 ? 'neutral' : 'tired', { lookY: -1 }); placePhone(c, ph);
        // a cold marble leaves through the window each night
        for (let i = 0; i < 40; i++) {
          const t0 = i * 0.34 + 0.2, a = t - t0;
          if (a < 0 || a > 1.4) { cold.hide(i); continue; }
          const p = V(9.5, 9.2 + a * 6, -19.2 - a * 40); cold.set(i, p, '#cfe0ff', 1.1 * (1 - a / 1.4));
        }
        cold.done();
        for (let i = 0; i < 400; i++) { if (i / 400 > u) { sky2.hide(i); continue; } P.reseed(1000 + i); sky2.set(i, V(-200 + P.rnd() * 400, 30 + P.rnd() * 160, -300), '#aac4ff', 0.55 * s.stars + 0.08); }
        sky2.done();
        if (ctx.vertical) cam(camera, [5, 10, 11 - u * 2], [-1, 8.5, -14], 68);
        else cam(camera, [17 - u * 2, 10 + u * 0.5, 13 - u * 2], [1.5, 8.2, -15], 50);
      },
      overlay(g, W, H, t) {
        const k = K(W, H), u = t / 14; U.vignette(g, W, H, 0.45);
        const days = D0 - (D0 - D1) * A.smooth(u), age = 24 + 8 * A.smooth(u);
        const x = ctx.vertical ? W / 2 : W - 60 * k, al = ctx.vertical ? 'center' : 'right', y = ctx.vertical ? 150 * k : 92 * k;
        U.text(g, 'DAYS LEFT', x, y - 54 * k, { font: `700 ${20 * k}px Archivo`, color: 'rgba(255,244,220,0.75)', align: al, letter: 8 * k });
        U.text(g, fmt(days), x, y, { font: `800 ${64 * k}px Archivo`, color: '#ffd27a', align: al, glow: 'rgba(255,170,60,0.8)', blur: 20 * k });
        U.text(g, `AGE ${Math.floor(age)}`, x, y + 44 * k, { font: `700 ${22 * k}px Archivo`, color: 'rgba(255,244,220,0.7)', align: al });
        sfxAt(g, W, H, t, 6.0, 'LATER…', W * 0.7, H * 0.7, 56, { rot: -0.1, fill: '#e8dcc8', stroke: '#2a2030', d: 1.6 });
      },
    };
  } },

  // 0:40 · SURREAL ONE: the endless feed
  s06_feed: { dur: 6, build(ctx) {
    const cfg = SHOTS.k4_feed({ ...ctx }); const { scene, camera } = ctx;
    const hero = scene.children.find((o) => o.type === 'Group' && o.children.some((c) => c.type === 'Group')) ;
    const screens = scene.children.filter((m) => m.isMesh && m.geometry.type === 'PlaneGeometry');
    const base = screens.map((m) => ({ m, p: m.position.clone(), q: m.quaternion.clone() }));
    return {
      bloom: { strength: 0.9, radius: 0.6, threshold: 0.7 },
      update(t) {
        const u = A.inOut(t / 6);
        base.forEach(({ m, p }, i) => { m.position.z = p.z + Math.sin(t * 0.8 + i) * 0.25; });
        if (ctx.vertical) cam(camera, [1.5 - u, -3 + u * 4, 26 - u * 22], [0, 0.5 + u * 3, -40], 70);
        else cam(camera, [3 - u * 2.5, -4 + u * 5.5, 22 - u * 20], [0, 0.5 + u * 3, -40], 52 + u * 10);
      },
      overlay(g, W, H, t) { U.vignette(g, W, H, 0.7); U.letterbox(g, W, H, 0.07); whiteout(g, W, H, A.seg(t, 5.5, 6.0) * 0.0); },
    };
  } },

  // 0:46 · CARD TWO: boxes cover the window
  s07_card2: { dur: 7, build(ctx) {
    const { scene, camera } = ctx; scene.background = new THREE.Color('#05081c');
    const R = S.bedroom(scene, { label: '18,250', fill: 0.62 }); R.setBoxes(16); R.setSky(S.SKY.night);
    R.amb.intensity = 1.1;
    const { c, ph } = heroWithPhone(scene); setRoot(c, 4, -6); c.root.rotation.y = 0;
    return {
      bloom: { strength: 0.65, radius: 0.5, threshold: 0.85 },
      update(t) {
        const tw = A.twos(t);
        c.pose({ ...SIT({ h: 1.3 }), turn: -0.5, ...PHONE_POSE, legL: [-1.3, 1.6, 0.15], legR: [-1.4, 1.4, -0.1], headX: 0.45 + A.wob(tw, 0.2) * 0.04 });
        c.setFace('tired', { lookY: -1, blink: tw > 4.2 && tw < 4.37 }); placePhone(c, ph);
        const u = A.inOut(t / 7);
        if (ctx.vertical) cam(camera, [10 - u * 2, 7 + u, 10 - u * 2], [4, 5, -12], 64);
        else cam(camera, [16 - u * 4, 6 + u * 1.2, 12 - u * 3], [5, 6, -12], 46);
      },
      overlay(g, W, H, t) { U.vignette(g, W, H, 0.6); card(g, W, H, t, 0.6, 'DAYS LEFT', '18,250', null, { x: ctx.vertical ? W / 2 : W * 0.3, y: ctx.vertical ? H * 0.15 : H * 0.2, color: '#ffe2a8' }); },
    };
  } },

  // 0:53 · he reaches for the guitar box and plays one chord
  s08_reach: { dur: 7, build(ctx) {
    const { scene, camera } = ctx; scene.background = new THREE.Color('#05081c');
    const R = S.bedroom(scene, { label: '18,250', fill: 0.62 }); R.setBoxes(16); R.amb.intensity = 1.1;
    const c = makeChar(HERO, { expr: 'neutral' }); scene.add(c.root); setRoot(c, 4, -6);
    const ph = P.phone(scene, null, { w: 0.9, h: 1.8, lightI: 0.6, lightD: 5, lightZ: 0.5, res: 1 }); ph.position.set(6.4, 0.08, -3.6); ph.rotation.set(-Math.PI / 2, 0, 0.4);
    const gbox = R.boxes[1]; gbox.position.set(-0.5, 1.12, -7.5); gbox.rotation.y = 0.5;
    const free = P.guitar(scene); free.scale.setScalar(0.95);
    const held = S.holdGuitar(c); held.visible = false;
    const g0 = { p: V(-0.3, 2.6, -7.6), q: new THREE.Quaternion().setFromEuler(new THREE.Euler(0.35, 0.4, 0.5)) };
    return {
      bloom: { strength: 0.65, radius: 0.5, threshold: 0.85 },
      update(t) {
        const tw = A.twos(t);
        const look = A.seg(tw, 0.5, 1.2), reach = A.inOut(A.seg(tw, 2.0, 3.2)), pull = A.inOut(A.seg(tw, 3.2, 4.6)), play = tw >= 4.6;
        const base = { ...SIT({ h: 1.3 }), turn: -0.5 - 0.9 * look, legL: [-1.3, 1.6, 0.15], legR: [-1.4, 1.4, -0.1] };
        c.pose(A.full({ ...base, lean: 0.25 + 0.3 * reach * (1 - pull) - 0.15 * pull, headX: 0.35 - 0.3 * look + 0.1 * reach, headY: -0.3 * look * (1 - pull), armR: [-0.4, -0.3, -0.8, 0.3], armL: [-0.4, 0.3, -0.8, -0.3] }));
        c.root.updateMatrixWorld(true);
        held.updateMatrixWorld(true);
        const tp = held.getWorldPosition(V(0, 0, 0)), tq = held.getWorldQuaternion(new THREE.Quaternion());
        free.position.copy(g0.p).lerp(tp, pull); free.quaternion.copy(g0.q).slerp(tq, pull); free.updateMatrixWorld(true);
        if (reach > 0 && !play) {
          const nk = free.localToWorld(V(0, 2.2, 0.2)), bd = free.localToWorld(V(0.3, -0.2, 0.5));
          const rest = (side) => c.chest.localToWorld(V(side * 1.0, -1.6, 1.0));
          c.ik('L', rest(1).lerp(nk, Math.min(1, reach * 1.2)), V(0.6, -1, -0.8)); c.ik('R', rest(-1).lerp(bd, Math.min(1, reach * 1.2)), V(-1, -0.6, -0.4));
        }
        if (play) { free.visible = false; held.visible = true; S.strum(c, A.seg(tw, 5.6, 5.85)); }
        c.setFace(play ? (tw > 5.8 ? 'smile' : 'determined') : (look > 0.5 ? 'sad' : 'tired'), { lookX: look > 0.5 ? -0.6 : 0, lookY: -0.5 });
        const u = A.inOut(t / 7);
        if (ctx.vertical) cam(camera, [-3 + u, 7.5 - u, 4 - u], [2.0, 5.0, -7], 60);
        else cam(camera, [-4.5 + u * 1.5, 7.2 - u * 0.8, 3.5 - u * 1.5], [2.2, 5.0, -7.5], 46);
      },
      overlay(g, W, H, t) { U.vignette(g, W, H, 0.55); sfxAt(g, W, H, t, 5.65, 'STRUM!', W * (ctx.vertical ? 0.5 : 0.72), H * 0.3, 72, { rot: -0.1, fill: '#fff4d0', stroke: '#3a2a5c', d: 1.2 }); whiteout(g, W, H, A.seg(t, 6.4, 7.0)); },
    };
  } },

  // 1:00 · THE DAYDREAM: the life he could have
  s09_dream: { dur: 10, build(ctx) {
    const { scene, camera } = ctx; scene.background = new THREE.Color('#3a1440');
    const sky = S.dynSky(scene, { sky: S.SKY.fire, n: 400 }); sky.sun(V(0.3, 0.06, -1), 1.4, '#ffd080');
    scene.add(new THREE.AmbientLight(0xd08a8a, 1.5)); const key = new THREE.DirectionalLight(0xffc080, 1.8); key.position.set(4, 8, -10); scene.add(key);
    const front = new THREE.DirectionalLight(0xff9ad0, 0.8); front.position.set(-6, 6, 14); scene.add(front);
    box(scene, [40, 2.0, 22], [0, 1.0, -6], '#2a1a30'); box(scene, [42, 0.4, 0.6], [0, 2.1, 5], '#ffb070', null);
    for (const x of [-16, 16]) box(scene, [1.2, 22, 1.2], [x, 11, -16], '#1a1020');
    box(scene, [34, 1.2, 1.2], [0, 22, -16], '#1a1020');
    // light beams
    const beams = [];
    for (let i = 0; i < 6; i++) { const m = new THREE.Mesh(new THREE.ConeGeometry(4, 34, 24, 1, true), new THREE.MeshBasicMaterial({ color: new THREE.Color(['#ffd8a0', '#ff9ad0', '#a0c8ff'][i % 3]).multiplyScalar(0.22), transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false })); m.geometry.translate(0, -17, 0); m.position.set(-14 + i * 5.6, 22, -16); scene.add(m); beams.push(m); }
    // the crowd: silhouettes with phone lights
    const crowdG = new THREE.CapsuleGeometry(0.9, 2.2, 4, 8), headG = new THREE.SphereGeometry(0.8, 10, 8);
    const cm = new THREE.MeshBasicMaterial({ color: 0x1a0c22 });
    const N = 260; const bodies = new THREE.InstancedMesh(crowdG, cm, N), heads = new THREE.InstancedMesh(headG, cm, N);
    const lights = S.glowPoints(scene, N, 1.2); const crowd = [];
    P.reseed(44);
    for (let i = 0; i < N; i++) { const x = -40 + P.rnd() * 80, z = 9 + P.rnd() * 30; crowd.push({ x, z, ph: P.rnd() * 6, lit: P.rnd() < 0.55 }); }
    scene.add(bodies, heads);
    const c = makeChar(HERO, { expr: 'laugh', scarfFly: true }); scene.add(c.root); c.root.position.set(0, 2.0, -6);
    S.holdGuitar(c); c.setRim(0xffd0a0, 0.7);
    const sparks = S.glowPoints(scene, 120, 0.7);
    const m4 = new THREE.Matrix4();
    return {
      bloom: { strength: 0.6, radius: 0.55, threshold: 0.86 },
      update(t) {
        const tw = A.twos(t);
        const strum = (Math.sin(tw * Math.PI * 4) + 1) / 2;
        c.pose({ ...S.playPose(strum), lean: -0.08 + Math.sin(tw * 3) * 0.05, headX: -0.18, headZ: Math.sin(tw * 2) * 0.12, legL: [-0.15, 0.25, 0.12], legR: [0.15, 0.15, -0.12], hipY: 5.5 + Math.abs(Math.sin(tw * Math.PI * 2)) * 0.12 });
        S.strum(c, strum); c.setFace(tw % 3 < 1.5 ? 'laugh' : 'happy');
        crowd.forEach((p, i) => {
          const bob = Math.abs(Math.sin(t * 4 + p.ph)) * 0.5;
          m4.makeTranslation(p.x, 2.0 + bob, p.z); bodies.setMatrixAt(i, m4); m4.makeTranslation(p.x, 4.6 + bob, p.z); heads.setMatrixAt(i, m4);
          if (p.lit) lights.set(i, V(p.x + 0.8 + Math.sin(t * 2 + p.ph) * 0.8, 6.8 + bob + Math.cos(t * 2 + p.ph) * 0.3, p.z - 0.4), '#fff4d8', 1.5); else lights.hide(i);
        });
        bodies.instanceMatrix.needsUpdate = true; heads.instanceMatrix.needsUpdate = true; lights.done();
        beams.forEach((b, i) => { b.rotation.z = Math.sin(t * 0.8 + i) * 0.45; b.rotation.x = 0.35 + Math.cos(t * 0.6 + i) * 0.15; });
        for (let i = 0; i < 120; i++) { P.reseed(300 + i); const x = (P.rnd() - 0.5) * 30, sp = 1.5 + P.rnd() * 3, life = (t * 0.5 + P.rnd()) % 1; sparks.set(i, V(x + Math.sin(t + i) * 0.5, 2 + life * 26 * (sp / 3), -4 + (P.rnd() - 0.5) * 8), ['#ffd27a', '#ff9ad0', '#fff'][i % 3], 1.6 * (1 - life)); }
        sparks.done();
        const u = A.inOut(t / 10), a = -0.6 + u * 1.1;
        const r = ctx.vertical ? 30 : 26;
        cam(camera, [Math.sin(a) * r, 5 + u * 6, -6 + Math.cos(a) * r], [0, 9.5 + u * 0.5, -6], ctx.vertical ? 62 : 44);
      },
      overlay(g, W, H, t) { U.vignette(g, W, H, 0.35, '60,10,30'); whiteout(g, W, H, 1 - A.seg(t, 0, 0.5)); whiteout(g, W, H, A.seg(t, 9.3, 9.75) * 1.0); blackout(g, W, H, A.seg(t, 9.75, 9.9)); },
    };
  } },

  // 1:10 · THE EYE
  s10_eye: { dur: 3, build(ctx) {
    const { scene, camera } = ctx; scene.background = new THREE.Color('#0a0a1a');
    scene.add(new THREE.AmbientLight(0x8a80c0, 1.7)); const key = new THREE.DirectionalLight(0xffd9a0, 1.6); key.position.set(-4, 2, 6); scene.add(key);
    const c = makeChar(HERO, { expr: 'wide', face: { reflectJar: true, size: 4096, lookX: -0.1 } }); scene.add(c.root); c.pose({}); c.root.updateMatrixWorld(true);
    const eye = c.head.localToWorld(V(-0.36, -0.215, 0.86)), c0 = c.head.localToWorld(V(-0.3, -0.18, 2.3)), c1 = c.head.localToWorld(V(-0.33, -0.2, 1.75));
    return {
      bloom: { strength: 0.5, radius: 0.4, threshold: 0.9 },
      update(t) {
        c.setFace(t < 1.2 ? 'wide' : 'shock', { reflectJar: true, size: 4096, lookX: -0.1 });
        const u = A.inOut(t / 3), beat = A.pulse(t, 0.4, 0.25) + A.pulse(t, 1.4, 0.25) * 1.2;
        camera.fov = (ctx.vertical ? 30 : 22) - beat * 1.2; camera.position.copy(c0).lerp(c1, u); camera.lookAt(eye.x + 0.12, eye.y + 0.02, eye.z); camera.updateProjectionMatrix();
      },
      overlay(g, W, H, t) { U.vignette(g, W, H, 0.45 + (A.pulse(t, 0.4, 0.25) + A.pulse(t, 1.4, 0.25)) * 0.2); sfxAt(g, W, H, t, 0.4, 'BA-DUM', W * 0.8, H * 0.2, 96, { rot: 0.1, d: 0.8 }); sfxAt(g, W, H, t, 1.4, 'BA-DUM', W * 0.25, H * 0.78, 110, { rot: -0.1, d: 0.9 }); if (!ctx.vertical) U.letterbox(g, W, H, 0.1); },
    };
  } },

  // 1:13 · the guitar goes back in the box
  s11_box: { dur: 2, build(ctx) {
    const { scene, camera } = ctx; scene.background = new THREE.Color('#05081c');
    scene.add(new THREE.AmbientLight(0x4a5096, 1.5)); const key = new THREE.DirectionalLight(0xffc89a, 1.0); key.position.set(4, 8, 6); scene.add(key);
    box(scene, [60, 1, 60], [0, -0.5, 0], '#1c2042');
    const B = new THREE.Group(); scene.add(B);
    const side = '#b8874f'; box(B, [6, 4, 0.2], [0, 2, 2.9], side); box(B, [6, 4, 0.2], [0, 2, -2.9], side); box(B, [0.2, 4, 6], [2.9, 2, 0], side); box(B, [0.2, 4, 6], [-2.9, 2, 0], side);
    const lt = canvasTex(512, 256, (g, w, h) => { g.fillStyle = '#c99a62'; g.fillRect(0, 0, w, h); g.fillStyle = '#3a2410'; g.textAlign = 'center'; g.font = '800 130px Archivo'; g.fillText('LATER', w / 2, h * 0.68); });
    const front = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 3.6), toon('#ffffff', { map: lt, steps: [0.6, 1.0] })); front.position.set(0, 2, 3.01); B.add(front);
    const flapL = new THREE.Group(); flapL.position.set(-2.9, 4, 0); B.add(flapL); box(flapL, [2.9, 0.15, 5.8], [1.45, 0, 0], side);
    const flapR = new THREE.Group(); flapR.position.set(2.9, 4, 0); B.add(flapR); box(flapR, [2.9, 0.15, 5.8], [-1.45, 0, 0], side);
    const gtr = P.guitar(scene); gtr.rotation.set(0.2, 0, 0.1);
    return {
      bloom: { strength: 0.5, radius: 0.4, threshold: 0.9 },
      update(t) {
        const tw = A.twos(t), drop = A.inn(A.seg(tw, 0, 0.6)), shut = A.out(A.seg(tw, 0.6, 1.0));
        gtr.position.set(0, 7 - drop * 6.5, 0); gtr.visible = drop < 0.98 || shut < 0.5;
        flapL.rotation.z = -2.2 * (1 - shut); flapR.rotation.z = 2.2 * (1 - shut);
        const sh = A.pulse(t, 1.0, 0.2) * 0.15;
        cam(camera, [0 + sh, 7.5 + sh, ctx.vertical ? 15 : 12], [0, 2.8, 0], ctx.vertical ? 56 : 40);
      },
      overlay(g, W, H, t) { U.vignette(g, W, H, 0.55); sfxAt(g, W, H, t, 1.0, 'SLAM!', W * 0.5, H * 0.18, 96, { rot: -0.08, fill: '#ffffff', stroke: '#1a1220', d: 0.9, shake: true }); },
    };
  } },

  // 1:15 · SURREAL TWO: the panic room
  s12_panic: { dur: 12, build(ctx) {
    const { scene, camera } = ctx; scene.background = new THREE.Color('#2a0606'); scene.fog = new THREE.Fog(0x3a0808, 40, 160);
    scene.add(new THREE.AmbientLight(0xff6a5a, 1.3)); const key = new THREE.DirectionalLight(0xffb070, 2.2); key.position.set(-6, 10, 10); scene.add(key);
    box(scene, [400, 1, 600], [0, -0.5, -100], '#5a120a'); box(scene, [400, 140, 1], [0, 70, -110], '#4a0e08');
    const J = P.jar(scene, { r: 9, h: 24, n: 500, mr: 1.0, label: '14,600', sub: 'DAYS LEFT', labelSize: 100, lightI: 400, lightD: 120, glow: 1.2 }); J.position.set(6, 3, -60);
    const N = 320; const mm = new THREE.InstancedMesh(new THREE.SphereGeometry(0.55, 10, 8), new THREE.MeshBasicMaterial({ toneMapped: false }), N);
    const col = new THREE.Color(); for (let i = 0; i < N; i++) { mm.setColorAt(i, col.set(['#ffe9a8', '#ffbf4a', '#ffa030', '#ff7a24'][i % 4]).multiplyScalar(1.3)); } scene.add(mm);
    const boxes = []; P.reseed(12);
    for (let i = 0; i < 18; i++) { const b = P.laterBox(scene, 2.2 + P.rnd() * 2.6, { text: S.LATER_LABELS[i % 16] }); boxes.push({ b, x: -30 + P.rnd() * 30, z: -10 - P.rnd() * 50, ph: P.rnd(), sp: 0.5 + P.rnd() * 0.6, r: [P.rnd() * 3, P.rnd() * 3, P.rnd() * 3] }); }
    const big = P.laterBox(scene, 16, { text: 'LATER' });
    const c = makeChar(HERO, { expr: 'dread', scarfFly: true }); scene.add(c.root); c.setRim(0xffd0a0, 0.5);
    const m4 = new THREE.Matrix4();
    return {
      bloom: { strength: 0.75, radius: 0.55, threshold: 0.8 },
      update(t) {
        const tw = A.twos(t), run = tw * Math.PI * 2 * 1.6, s = Math.sin(run);
        const z = t * 9; c.root.position.set(-1, 0, z + 2);
        c.pose({ lean: 0.32, headX: -0.08, turn: 0.15, hipY: 5.3 + Math.abs(Math.cos(run)) * 0.25, legL: [-0.95 * s - 0.1, 0.5 + 0.9 * Math.max(0, s)], legR: [0.95 * s - 0.1, 0.5 + 0.9 * Math.max(0, -s)], armL: [0.9 * s, 0.35, -1.3], armR: [-0.9 * s, -0.35, -1.3] });
        c.setFace(t < 6 ? 'dread' : 'wide');
        J.rotation.z = -0.15 - 0.45 * A.out(A.seg(t, 0, 1.5)); J.position.z = -60 + z * 0.0;
        const mouth = J.localToWorld(V(0, 24, 0));
        for (let i = 0; i < N; i++) {
          const u = (i / N + t * 0.45) % 1, ph = i * 2.39;
          const p = V(mouth.x + 4 + u * 10 + Math.sin(ph) * 2.5 * u, mouth.y - 30 * u * u + Math.cos(ph) * 1.2 * u, mouth.z + u * 60 * 0.9 + Math.sin(ph * 1.3) * 3 * u);
          if (p.y < 0.6) p.y = 0.6 + Math.abs(Math.sin(ph + t * 3)) * 0.5;
          m4.makeTranslation(p.x, p.y, p.z); mm.setMatrixAt(i, m4);
        }
        mm.instanceMatrix.needsUpdate = true;
        boxes.forEach((o, i) => { const u = (t * o.sp * 0.25 + o.ph) % 1; o.b.position.set(o.x + u * 6, 40 - u * 44 + 2, o.z + z); o.b.rotation.set(o.r[0] + t * o.sp, o.r[1] + t * 0.7 * o.sp, o.r[2]); if (o.b.position.y < 1.5) o.b.position.y = 1.5; });
        const fall = A.inn(A.seg(t, 10.3, 11.75)); big.position.set(0, 60 - fall * 54, z - 8 + fall * 10); big.rotation.set(0.3 + fall * 0.5, 0.4, 0.2);
        const shake = 0.25 + A.seg(t, 9, 11.5) * 0.4; const sx = Math.sin(t * 47) * shake, sy = Math.cos(t * 39) * shake;
        if (ctx.vertical) cam(camera, [3 + sx, 7 + sy, z + 30], [-1, 9.5, z - 10], 66);
        else cam(camera, [6 + sx, 7 + sy, z + 24], [-1, 8.5, z - 8], 46);
      },
      overlay(g, W, H, t) {
        const k = K(W, H); P.reseed(Math.floor(t * 12) + 1);
        U.speedLines(g, W, H, W * (ctx.vertical ? 0.5 : 0.42), H * 0.42, { n: 220, r0: Math.min(W, H) * 0.42, color: 'rgba(255,230,210,0.5)', seed: Math.floor(t * 12) + 3 });
        U.vignette(g, W, H, 0.6, '40,0,0');
        card(g, W, H, t, 0.3, 'DAYS LEFT', '14,600', null, { x: ctx.vertical ? W / 2 : W * 0.55, y: H * (ctx.vertical ? 0.12 : 0.15), size: 92, color: '#ffe0c0', glow: 'rgba(255,80,40,0.9)' });
        for (const s0 of [1.0, 4.5, 8.0]) sfxAt(g, W, H, t, s0, 'RUMBLE', W * 0.22, H * 0.83, 110, { rot: -0.12, fill: '#ffffff', stroke: '#2a0606', grow: 0.06, d: 2.6, shake: true });
        sfxAt(g, W, H, t, 2.4, 'CRASH', W * (ctx.vertical ? 0.7 : 0.16), H * 0.26, 64, { rot: 0.1, fill: '#ffd27a', stroke: '#2a0606', d: 2.0 });
        sfxAt(g, W, H, t, 10.5, 'BOOM!', W * 0.5, H * 0.45, 150, { rot: -0.05, fill: '#ffffff', stroke: '#2a0606', d: 1.1, shake: true });
        blackout(g, W, H, A.seg(t, 11.7, 11.85));
      },
    };
  } },

  // 1:27 · he wakes; a waltz comes through the ceiling
  s13_wake: { dur: 3, build(ctx) {
    const { scene, camera } = ctx; scene.background = new THREE.Color('#05081c');
    const R = S.bedroom(scene, { label: '18,250', fill: 0.62 }); R.setBoxes(16); R.amb.intensity = 1.0;
    const c = makeChar(HERO, { expr: 'asleep' }); scene.add(c.root); setRoot(c, S.BED_EDGE.x, S.BED_EDGE.z);
    return {
      bloom: { strength: 0.6, radius: 0.5, threshold: 0.85 },
      update(t) {
        const tw = A.twos(t), jolt = A.back(A.seg(tw, 0.25, 0.5)), look = A.inOut(A.seg(tw, 1.6, 2.3));
        c.pose(sitBed({ lean: 0.55 - 0.75 * jolt, headX: 0.6 - 0.75 * jolt - 0.35 * look, headY: 0.2 * look, armL: [-0.3 - 0.4 * jolt, 0.3, -0.9], armR: [-0.3 - 0.4 * jolt, -0.3, -0.9] }));
        c.setFace(tw < 0.25 ? 'asleep' : tw < 1.6 ? 'dread' : 'wide', { lookY: look > 0.5 ? 1 : 0 });
        const sh = A.pulse(t, 0.25, 0.2) * 0.3;
        if (ctx.vertical) cam(camera, [3 + sh, 10, 6], [-3.5, 9, -9.5], 50);
        else cam(camera, [4 + sh, 9.6, 4.5], [-3.5, 9.4, -9.5], 40);
      },
      overlay(g, W, H, t) { U.vignette(g, W, H, 0.6); blackout(g, W, H, 1 - A.seg(t, 0.0, 0.12)); sfxAt(g, W, H, t, 0.3, 'GASP!', W * 0.62, H * 0.3, 90, { rot: 0.1, d: 0.9, shake: true }); notes(g, W, H, t, 1.4, W * 0.55, H * 0.25, { n: 4 }); },
    };
  } },

  // 1:30 · THE TURN: up the stairs, the door opens
  s14_door: { dur: 5, build(ctx) {
    const { scene, camera } = ctx; scene.background = new THREE.Color('#0b0820');
    const R = S.rooftop(scene);
    const c = makeChar(HERO, { expr: 'neutral' }); scene.add(c.root); c.setRim(0xffd7a0, 0.6);
    return {
      bloom: { strength: 0.75, radius: 0.55, threshold: 0.8 },
      update(t) {
        const tw = A.twos(t), open = A.inOut(A.seg(tw, 0.6, 1.6)), step = A.inOut(A.seg(tw, 1.4, 3.6));
        R.door.rotation.y = -1.9 * open;
        S.waltz(R, t + 3, V(6, 0, -14));
        const z = -15.5 + step * 9.0, s = Math.sin(tw * Math.PI * 2 * 0.9) * step * (1 - A.seg(tw, 3.4, 3.6));
        c.root.position.set(-20.2, 0, z);
        c.pose({ turn: 0.15 + 0.7 * A.seg(tw, 3.4, 4.2), legL: [-0.5 * s, 0.3 * Math.max(0, s)], legR: [0.5 * s, 0.3 * Math.max(0, -s)], headX: -0.08, headY: 0.35 * A.seg(tw, 2.6, 3.4) });
        c.setFace(tw > 2.8 ? 'awe' : 'neutral', { lookX: tw > 2.8 ? 0.7 : 0 });
        R.inner.intensity = 4 + 10 * open;
        const u = A.inOut(t / 5);
        if (ctx.vertical) cam(camera, [-12 - u, 10.5, 6 - u * 2], [-20.5, 9, -9], 62);
        else cam(camera, [-11 - u * 2, 10, 7 - u * 3], [-20.5, 8.8, -9.5], 46);
      },
      overlay(g, W, H, t) { U.vignette(g, W, H, 0.5); notes(g, W, H, t, 0.2, W * 0.7, H * 0.35, { n: 6 }); },
    };
  } },

  // 1:35 · the score that matters
  s15_roof: { dur: 15, build(ctx) {
    const { scene, camera } = ctx; scene.background = new THREE.Color('#0b0820');
    const R = S.rooftop(scene);
    const him = makeChar(HERO, { expr: 'awe' }); scene.add(him.root); him.root.position.set(-19, 0, -6.5); him.setRim(0xffc880, 0.9);
    const ctr = V(6, 0, -14);
    return {
      bloom: { strength: 0.75, radius: 0.55, threshold: 0.8 },
      update(t) {
        const tw = A.twos(t);
        if (t < 10.3) S.waltz(R, tw, ctr);
        else {   // the neighbour stops, laughs and waves him over
          S.waltz(R, 10.3, ctr); const wv = Math.sin(tw * 9);
          R.n.pose({ turn: R.n.root.rotation.y + (-1.2 - R.n.root.rotation.y) * A.inOut(A.seg(tw, 10.3, 10.9)), headX: -0.2, armL: [-2.6, 0.5 + wv * 0.25, -0.4], armR: [0.1, -0.2, -0.3], lean: -0.08 });
          R.n.setFace('laugh');
        }
        R.bulbs.forEach((b, i) => { b.material.color.setScalar(1).multiply(new THREE.Color('#ffd8a0')).multiplyScalar(1.6 + 0.8 * Math.sin(t * 2 + i)); });
        him.pose({ turn: 0.6 + 0.2 * A.seg(tw, 10.5, 11.2), headY: 0.3, headX: A.seg(tw, 7.5, 8.2) * 0.35 * (1 - A.seg(tw, 10.4, 10.8)), armR: [0.08, -0.14, -0.12], armL: [0.08, 0.14, -0.12] });
        him.setFace(tw < 7.6 ? 'awe' : tw < 10.4 ? 'sad' : tw < 13.0 ? 'wide' : 'smile', { lookX: 0.6, lookY: tw > 7.6 && tw < 10.4 ? -1 : 0 });
        const u = A.inOut(A.seg(t, 0, 10)), v = A.inOut(A.seg(t, 11, 15));
        if (ctx.vertical) { const w = A.inOut(A.seg(t, 5.6, 8.0)); cam(camera, A.lerp([5, 11, 14], [-14, 10.5, 12], w), A.lerp([6, 12, -14], [-19, 11.5, -7], w), 66); }
        else { const p0 = [-4 + u * 2, 8 + u, 24 - u * 2], p1 = [-13, 10.5, 6]; cam(camera, A.lerp(p0, p1, v), A.lerp([-5, 10, -12], [-19, 10.5, -7], v), 48 - 10 * v); }
      },
      overlay(g, W, H, t, h) {
        const k = K(W, H); U.vignette(g, W, H, 0.45);
        const cl = (x) => Math.max(16, Math.min(W - 336, x)); let [nx, ny] = h.project(V(R.n.root.position.x, 15.5, R.n.root.position.z)), [hx, hy] = h.project(V(-19, 15, -6.5));
        if (ctx.vertical) { ny = Math.max(ny, 470); hy = Math.max(hy, 470); }
        const rows = (stars, left, c1) => [['STARS', stars, c1], ['DAYS LEFT', left, '#ff9a8a']];
        if (t > 3.6 && t < (ctx.vertical ? 6.6 : 11.2)) { const a = A.seg(t, 3.6, 4.0) * (1 - (ctx.vertical ? A.seg(t, 6.0, 6.6) : A.seg(t, 10.8, 11.2))); g.save(); g.globalAlpha = a; U.tag(g, cl(nx - 20 * k), ny - 200 * k, rows(fmt(24880 * A.out(A.seg(t, 3.7, 5.2))), '3', '#ffd27a'), { px: nx + 20 * k, py: ny + 20 * k, w: 320 }); g.restore(); }
        if (t > 7.2 && (ctx.vertical || t < 11.3)) { const a = A.seg(t, 7.2, 7.6) * (ctx.vertical ? 1 : 1 - A.seg(t, 10.9, 11.3)); g.save(); g.globalAlpha = a; U.tag(g, cl(hx - 60 * k), hy - 200 * k, [['STARS', fmt(1204 * A.out(A.seg(t, 7.3, 8.3))), '#9fc0ff'], ['DAYS LEFT', '18,250', '#ffffff']], { px: hx + 10 * k, py: hy + 10 * k, edge: '#9fc0ff', w: 320 }); g.restore(); }
        sfxAt(g, W, H, t, 1.2, 'TWINKLE', W * 0.5, H * 0.1, 56, { rot: 0.08, fill: '#fff4d0', stroke: '#2c1f4a', d: 2.0 });
        sfxAt(g, W, H, t, 10.8, 'HA HA HA!', W * (ctx.vertical ? 0.55 : 0.7), H * 0.22, 64, { rot: 0.06, fill: '#ffffff', stroke: '#2c1f4a', d: 2.0 });
      },
    };
  } },

  // 1:50 · THE COMEBACK: the guitar comes out of the box
  s16_choice: { dur: 5, build(ctx) {
    const { scene, camera } = ctx; scene.background = new THREE.Color('#05081c');
    const R = S.bedroom(scene, { label: '18,250', fill: 0.62 }); R.setBoxes(16); R.amb.intensity = 1.1;
    const c = makeChar(HERO, { expr: 'determined' }); scene.add(c.root); setRoot(c, 1.0, -12.2);
    const gbox = R.boxes[1]; gbox.position.set(1.0, 1.12, -8.6); gbox.rotation.y = 0.15;
    const gtr = P.guitar(scene); gtr.scale.setScalar(0.95);
    return {
      bloom: { strength: 0.7, radius: 0.5, threshold: 0.82 },
      update(t) {
        const tw = A.twos(t), bend = A.inOut(A.seg(tw, 0.3, 1.3)) * (1 - A.inOut(A.seg(tw, 2.0, 3.0))), lift = A.inOut(A.seg(tw, 1.6, 3.2));
        c.pose({ turn: 0, lean: 0.9 * bend, headX: 0.3 * bend - 0.1 * lift, hipY: 5.62 - 1.2 * bend, legL: [-0.8 * bend, 1.4 * bend], legR: [-0.8 * bend, 1.4 * bend] });
        c.setFace(tw > 3.4 ? 'smile' : 'determined');
        c.root.updateMatrixWorld(true);
        const inBox = V(1.0, 2.2, -8.6), up = c.chest.localToWorld(V(0, -0.6, 2.2));
        gtr.position.copy(inBox.clone().lerp(up, lift)); gtr.rotation.set(0.3 - 0.2 * lift, 0, 0.4 - 1.2 * lift); gtr.updateMatrixWorld(true);
        const grab = A.seg(tw, 0.6, 1.4);
        if (grab > 0) {
          const rest = (side) => c.chest.localToWorld(V(side * 1.1, -1.8, 0.8));
          c.ik('L', rest(1).lerp(gtr.localToWorld(V(0, 2.0, 0.2)), grab), V(0.8, -1, -0.6)); c.ik('R', rest(-1).lerp(gtr.localToWorld(V(0.2, -0.4, 0.5)), grab), V(-0.8, -1, -0.6));
        }
        R.jar.children.forEach((m) => { if (m.isPointLight) m.intensity = 26 + 30 * lift; });
        if (ctx.vertical) cam(camera, [3, 7.5, 3], [1.0, 6.5, -10], 64);
        else cam(camera, [7 - t * 0.3, 7.6, 3 - t * 0.3], [1.0, 6.8, -10.5], 46);
      },
      overlay(g, W, H, t) { U.vignette(g, W, H, 0.55); sfxAt(g, W, H, t, 1.5, 'RIIIP', W * 0.62, H * 0.6, 70, { rot: 0.1, fill: '#ffffff', d: 0.7 }); },
    };
  } },

  // 1:55 · playing, uploading; each spent day rises bright
  s17_comeback: { dur: 20, build(ctx) {
    const { scene, camera } = ctx; scene.background = new THREE.Color('#1a1030');
    const sky = S.dynSky(scene, { sky: S.SKY.dawn });
    const amb = new THREE.AmbientLight(0x8a7ab0, 1.5); scene.add(amb);
    const key = new THREE.DirectionalLight(0xffc89a, 1.5); key.position.set(-8, 6, -10); scene.add(key);
    const fill = new THREE.DirectionalLight(0xc8b0ff, 0.6); fill.position.set(10, 8, 12); scene.add(fill);
    P.wallWithWindow(scene, 120, 40, [-2, 17, 22, 16], '#4a3a5c', -18); P.windowFrame(scene, 22, 16, [-2, 17, -17.6], '#6a5a7a');
    box(scene, [24, 0.5, 2.4], [-2, 8.75, -17.2], '#6a5a7a');
    box(scene, [200, 1, 200], [0, -0.5, 0], '#2a2038');
    P.city(scene, { n: 60, near: 90, depth: 150, spread: 300, y: -30, maxH: 50, lit: 0.15, bright: 0.7, wall: '#2a2040' });
    const J = P.jar(scene, { r: 1.3, h: 3.4, n: 180, mr: 0.18, fill: 0.62, label: false, lightI: 14, lightD: 18 }); J.position.set(5.5, 9.0, -17.2);
    box(scene, [14, 0.6, 6], [0, 6.0, -6.5], '#7a5a42'); for (const x of [-6.6, 6.6]) box(scene, [0.7, 5.7, 5.5], [x, 2.85, -6.5], '#6a4a36');
    const lap = new THREE.Group(); scene.add(lap); lap.position.set(-3.2, 6.45, -6.0); lap.rotation.y = Math.PI + 0.6;
    box(lap, [3.6, 0.18, 2.5], [0, 0, 0], '#c8c8d4', 0.02); box(lap, [3.6, 2.35, 0.1], [0, 1.15, -1.26], '#d0d0dc', 0.02, { rot: [-0.2, 0, 0] });
    const c = makeChar(HERO, { expr: 'determined' }); scene.add(c.root); c.root.position.set(0.5, 0, -1.8);
    S.holdGuitar(c);
    box(scene, [3.6, 0.6, 3.6], [0.5, 3.8, -2.0], '#3a2a3a'); box(scene, [0.6, 3.6, 0.6], [0.5, 1.8, -2.0], '#2a2030');
    const rising = S.glowPoints(scene, 8, 2.2); const born = S.glowPoints(scene, 8, 7);
    const NIGHTS = [3.4, 8.4, 13.4, 18.0];   // when a bright marble rises
    return {
      bloom: { strength: 0.8, radius: 0.55, threshold: 0.78 },
      update(t) {
        const tw = A.twos(t), phase = 1 + t * 0.2;    // dawn → day → dusk → night → dawn ...
        const s = S.skyAt(phase); sky.set(s); amb.color.copy(s.amb); amb.intensity = s.ambI; key.color.copy(s.key); key.intensity = s.keyI;
        const strum = (Math.sin(tw * Math.PI * 3) + 1) / 2;
        c.pose({ ...SIT({ h: 4.7 }), turn: 0.08, lean: 0.06, headX: 0.12 + Math.sin(tw * 1.5) * 0.08, headZ: Math.sin(tw * 1.2) * 0.1, ...S.playPose(strum) });
        S.strum(c, strum); c.setFace(t < 6 ? 'determined' : t < 13 ? 'smile' : 'happy', { lookY: -0.3 });
        NIGHTS.forEach((n0, i) => {
          const a = t - n0;
          if (a < 0 || a > 3) { rising.hide(i); } else rising.set(i, V(5.5 + a * 1.5, 12.5 + a * a * 4, -17.2 - a * 30), '#ffd27a', 2.0);
          if (a > 1.6) born.set(i, V(-40 + i * 22, 70 + i * 9, -260), '#fff2c0', 1.4 + Math.sin(t * 3 + i) * 0.3); else born.hide(i);
        });
        rising.done(); born.done();
        const u = A.inOut(A.seg(t, 0, 7)), v = A.inOut(A.seg(t, 12, 20));
        const p = ctx.vertical ? A.lerp(A.lerp([2, 8.5, 6], [5, 11, 15], u), [2, 12, 18], v) : A.lerp(A.lerp([2, 8.2, 5.5], [6, 11, 14], u), [-7, 12.5, 15], v);
        const at = A.lerp(A.lerp([0.5, 7.6, -1.8], [0.3, 10, -6], u), [0, 12, -10], v);
        cam(camera, p, at, ctx.vertical ? 62 : 46);
      },
      overlay(g, W, H, t) {
        const k = K(W, H); U.vignette(g, W, H, 0.45);
        const stars = 1204 + (1973 - 1204) * A.smooth(t / 20);
        const x = 60 * k, y = H - 120 * k, w = (ctx.vertical ? W - 120 * k : W * 0.42);
        U.text(g, 'STARS', x, y - 18 * k, { font: `800 ${24 * k}px Archivo`, color: '#ffd27a', letter: 6 * k }); U.text(g, 'days well spent', x + 120 * k, y - 18 * k, { font: `600 ${20 * k}px Archivo`, color: 'rgba(255,240,220,0.7)' });
        U.rrect(g, x, y, w, 26 * k, 13 * k); g.fillStyle = 'rgba(255,255,255,0.15)'; g.fill();
        U.rrect(g, x, y, Math.max(26 * k, w * (stars / 2700)), 26 * k, 13 * k); g.fillStyle = '#ffc566'; g.fill();
        U.text(g, fmt(stars), x + w, y - 18 * k, { font: `800 ${34 * k}px Archivo`, color: '#ffd27a', align: 'right' });
        const up = A.seg(t, 11, 19) * 0.92;
        if (t > 10.5) {
          const bx = ctx.vertical ? 60 * k : W - 430 * k, by = ctx.vertical ? 120 * k : 40 * k, a = A.seg(t, 10.5, 11);
          g.save(); g.globalAlpha = a; U.rrect(g, bx, by, 370 * k, 118 * k, 18 * k); g.fillStyle = 'rgba(14,12,30,0.82)'; g.fill(); g.strokeStyle = '#ffc566'; g.lineWidth = 2; g.stroke();
          U.text(g, 'first_song.mp3', bx + 24 * k, by + 42 * k, { font: `700 ${26 * k}px Archivo`, color: '#fff' }); U.text(g, `${Math.round(up * 100)}%`, bx + 346 * k, by + 42 * k, { font: `800 ${26 * k}px Archivo`, color: '#ffc566', align: 'right' });
          U.rrect(g, bx + 24 * k, by + 68 * k, 322 * k, 16 * k, 8 * k); g.fillStyle = 'rgba(255,255,255,0.15)'; g.fill(); U.rrect(g, bx + 24 * k, by + 68 * k, Math.max(16 * k, 322 * k * up), 16 * k, 8 * k); g.fillStyle = '#ffc566'; g.fill(); g.restore();
        }
        [3.4, 8.4, 13.4, 18.0].forEach((n0) => sfxAt(g, W, H, t, n0 + 1.6, 'TWINKLE', W * (ctx.vertical ? 0.7 : 0.6), H * 0.16, 54, { rot: 0.1, fill: '#fff4d0', stroke: '#3a2a5c', d: 0.9 }));
        notes(g, W, H, t, 0.6, W * 0.42, H * 0.45, { n: 5 }); notes(g, W, H, t, 7.0, W * 0.56, H * 0.42, { n: 5 }); notes(g, W, H, t, 14.5, W * 0.45, H * 0.4, { n: 5 });
      },
    };
  } },

  // 2:15 · 23:59: today's marble rises, bright
  s18_midnight: { dur: 10, build(ctx) {
    const { scene, camera } = ctx; scene.background = new THREE.Color('#03061a');
    const sky = S.dynSky(scene, { sky: S.SKY.night }); S.starRiver(scene, 2200, { y: 70, slope: 0.25, width: 22, len: 520, z: 240, size: 2.4, haze: 0.3 });
    scene.add(new THREE.AmbientLight(0x4a5096, 1.4)); const moon = new THREE.DirectionalLight(0xbfd4ff, 0.8); moon.position.set(-4, 8, -10); scene.add(moon);
    P.wallWithWindow(scene, 90, 40, [0, 14, 22, 16], '#232850', -20); P.windowFrame(scene, 22, 16, [0, 14, -19.6], '#33386a');
    box(scene, [26, 0.6, 3.0], [0, 5.7, -19.0], '#33386a');
    const J = P.jar(scene, { r: 1.5, h: 3.9, n: 160, mr: 0.2, fill: 0.6, label: '17,329', sub: 'DAYS LEFT', labelSize: 96, lightI: 24, lightD: 20 }); J.position.set(3, 6.0, -19.0);
    const lid = J.children.find((m) => m.isMesh && m.geometry.type === 'CylinderGeometry' && m.position.y > 3.9);
    const ph = P.phone(scene, null, { w: 1.3, h: 2.6, lightI: 1.2, lightD: 6, lightZ: 1.0, res: 2 }); ph.position.set(-2.4, 6.12, -18.6); ph.rotation.set(-Math.PI / 2 + 0.25, 0, 0.25);
    const scr = ph.children.find((m) => m.material && m.material.map); const tex = scr.material.map;
    const draw = (s) => { const g = tex.image.getContext('2d'); g.setTransform(2, 0, 0, 2, 0, 0); lockDraw(s)(g, 360, 720); tex.needsUpdate = true; };
    const one = S.glowPoints(scene, 1, 1.6), star = S.glowPoints(scene, 1, 9);
    return {
      bloom: { strength: 0.85, radius: 0.6, threshold: 0.75 },
      update(t) {
        const midnight = t > 8.0;
        draw({ time: midnight ? '0:00' : '23:59', date: midnight ? 'Wednesday' : 'Tuesday', notif: midnight ? A.out(A.seg(t, 8.0, 8.4)) : -1, title: 'TODAY: SPENT', days: '17,329', sub: 'Today: lived ✓', button: 'See your sky', bg0: '#101a40' });
        if (lid) { const off = A.inOut(A.seg(t, 1.2, 2.2)); lid.position.x = off * 1.4; lid.position.y = 3.9 * 1.04 + off * 0.2; lid.rotation.z = off * 0.5; }
        const rise = A.seg(t, 2.6, 7.2), u = A.inOut(rise);
        const p = V(3 + Math.sin(u * 5) * 0.4 * u, 7.8 + u * 9 + (rise > 0.6 ? (rise - 0.6) * 30 : 0), -19.0 - (rise > 0.6 ? (rise - 0.6) * 300 : 0));
        if (t > 2.4 && rise < 1) one.set(0, p, '#ffd27a', 1.6 + 1.5 * u); else one.hide(0); one.done();
        if (t > 6.6) star.set(0, V(30, 120, -400), '#fff2c0', 1.8 * A.seg(t, 6.6, 7.2) + 0.4 * Math.sin(t * 4)); else star.hide(0); star.done();
        const v = A.inOut(A.seg(t, 2.6, 7.4));
        const p0 = ctx.vertical ? [0.5, 8.8, -9.0] : [0.5, 8.4, -10.5], p1 = ctx.vertical ? [0.5, 8.0, -8.0] : [0, 8.0, -9.0];
        cam(camera, A.lerp(p0, p1, v), A.lerp([0.5, 6.8, -19], [3, 16, -40], v), ctx.vertical ? 64 : 50);
      },
      overlay(g, W, H, t) {
        const k = K(W, H); U.vignette(g, W, H, 0.45);
        U.text(g, t > 8 ? '0:00' : '23:59', W / 2, H * 0.12, { font: `700 ${46 * k}px Archivo`, color: 'rgba(255,244,220,0.9)', align: 'center', letter: 6 * k });
        sfxAt(g, W, H, t, 6.8, 'TWINKLE', W * 0.7, H * 0.2, 70, { rot: 0.1, fill: '#fff4d0', stroke: '#1e2448', d: 1.2 });
        if (t > 7.0) { const a = A.seg(t, 7.0, 7.4); g.save(); g.globalAlpha = a; U.text(g, `STARS ${fmt(1974)}`, W / 2, H * 0.22, { font: `800 ${34 * k}px Archivo`, color: '#ffd27a', align: 'center', letter: 4 * k }); g.restore(); }
      },
    };
  } },

  // 2:25 · THE ENDING: asleep under his own sky
  s19_sleep: { dur: 8, build(ctx) {
    const cfg = SHOTS.k9_end({ ...ctx }); const { scene, camera } = ctx;
    const shoot = S.glowPoints(scene, 1, 3);
    const c0 = ctx.vertical ? [5, 7, 18] : [7, 6.5, 16], at = [-1, 10.5, -14];
    return {
      bloom: cfg.bloom,
      update(t) {
        const u = A.inOut(t / 8);
        cam(camera, A.lerp(c0, [c0[0] - 3, c0[1] + 0.5, c0[2] - 5], u), A.lerp(at, [-1.5, 9.8, -14], u), ctx.vertical ? 64 : 50);
        const a = A.seg(t, 2.5, 4.0); if (a > 0 && a < 1) shoot.set(0, V(-60 + a * 120, 120 - a * 30, -260), '#ffe9b0', 2.2 * Math.sin(Math.PI * a)); else shoot.hide(0); shoot.done();
      },
      overlay(g, W, H, t) { U.vignette(g, W, H, 0.4); },
    };
  } },

  // 2:33 · FLASH-FORWARD
  s20_flash: { dur: 3, build(ctx) {
    const cfg = SHOTS.k10_flash({ ...ctx }); const { camera } = ctx;
    const p0 = camera.position.clone();
    return {
      bloom: cfg.bloom,
      update(t) { const u = A.inOut(t / 3); camera.position.copy(p0).add(V(-u * 1.2, u * 0.6, -u * 2)); camera.lookAt(0, 14.5, -11); camera.fov = ctx.vertical ? 66 : 50; camera.updateProjectionMatrix(); },
      overlay(g, W, H, t) { const k = K(W, H); U.vignette(g, W, H, 0.45); if (!ctx.vertical) U.letterbox(g, W, H, 0.08); U.text(g, '50 YEARS LATER', 56 * k, (ctx.vertical ? 140 : H * 0.08 + 52) * k / (ctx.vertical ? k : 1), { font: `700 ${24 * k}px Archivo`, color: 'rgba(255,244,220,0.8)', letter: 4 * k }); whiteout(g, W, H, (1 - A.seg(t, 0, 0.3)) * 0.8); },
    };
  } },

  // 2:36 · the line and the title (bottom corners kept clear for the end screen)
  s21_end: { dur: 9, build(ctx) {
    const { scene, camera } = ctx; scene.background = new THREE.Color('#03061a');
    const sky = S.dynSky(scene, { sky: S.SKY.night, n: 2400 }); S.starRiver(scene, 5200, { y: 40, slope: 0.22, width: 30, len: 640, z: 220, size: 2.8, haze: 0.5 });
    const glowJar = P.jar(scene, { r: 2.2, h: 5.6, n: 220, mr: 0.3, fill: 0.6, label: false, lightI: 0, glow: 1.3 }); glowJar.position.set(0, -3, -40);
    scene.add(new THREE.AmbientLight(0x6a70b8, 1.4));
    return {
      bloom: { strength: 0.9, radius: 0.6, threshold: 0.72 },
      update(t) { const u = A.inOut(t / 9); cam(camera, [0, 2 + u * 2, 4 - u * 3], [0, 14 + u * 4, -60], ctx.vertical ? 70 : 52); glowJar.rotation.y = t * 0.2; },
      overlay(g, W, H, t) {
        const k = K(W, H); U.vignette(g, W, H, 0.4);
        const a1 = A.seg(t, 0.3, 1.1) * (1 - A.seg(t, 4.6, 5.2)), a2 = A.seg(t, 2.2, 3.0) * (1 - A.seg(t, 4.6, 5.2));
        const fs = (ctx.vertical ? 62 : 56) * k;
        const band = Math.max(a1, A.seg(t, 5.4, 6.2));
        if (band > 0) { const cy = H * 0.4 + fs * 0.9, gr = g.createRadialGradient(W / 2, cy, 0, W / 2, cy, W * 0.62); gr.addColorStop(0, `rgba(3,5,22,${0.72 * band})`); gr.addColorStop(0.55, `rgba(3,5,22,${0.45 * band})`); gr.addColorStop(1, 'rgba(3,5,22,0)'); g.save(); g.translate(W / 2, cy); g.scale(1, (fs * 3.2) / (W * 0.62)); g.translate(-W / 2, -cy); g.fillStyle = gr; g.fillRect(0, cy - W * 0.62, W, W * 1.24); g.restore(); }
        g.save(); g.globalAlpha = a1; U.text(g, 'You get about 30,000 days.', W / 2, H * 0.4, { font: `italic 600 ${fs}px Playfair`, color: '#fff4dc', align: 'center', glow: 'rgba(0,0,0,0.9)', blur: 22 }); g.restore();
        g.save(); g.globalAlpha = a2; U.text(g, 'Today is one of them.', W / 2, H * 0.4 + fs * 1.3, { font: `italic 600 ${fs}px Playfair`, color: '#ffd27a', align: 'center', glow: 'rgba(0,0,0,0.9)', blur: 22 });
        g.restore();
        const a3 = A.seg(t, 5.4, 6.2);
        g.save(); g.globalAlpha = a3;
        U.text(g, '30,000 DAYS', W / 2, H * 0.36, { font: `800 ${(ctx.vertical ? 120 : 132) * k}px Archivo`, color: '#ffd27a', align: 'center', glow: 'rgba(255,170,60,0.85)', blur: 40 * k });
        U.text(g, 'an animated short film · whatifgraphics', W / 2, H * 0.36 + 72 * k, { font: `600 ${24 * k}px Archivo`, color: 'rgba(255,244,220,0.7)', align: 'center', letter: 4 * k });
        g.restore();
        blackout(g, W, H, A.seg(t, 8.6, 9.0) * 0.0);
      },
    };
  } },
};
export const ORDER = Object.keys(FILM);
