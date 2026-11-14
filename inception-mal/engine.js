// Film engine: timeline, set + shot registries, overlays, frame renderer.
//
//   SET(name, () => { const { s, cam } = mkScene(...); ...build...; return { s, cam, pre(T) {}, ...refs }; });
//   SHOT('a3', 'hall', c => { ... });        // whole narration line a3
//   SHOT('a3:1', 'hall', c => { ... });      // only sentence index 1 of line a3 (overrides the line-level shot)
//
// Shot context c:  S (the set object)  cam  T (abs seconds)
//   l / k   seconds since / 0..1 progress through this shot's span (whole line, or the sentence for 'id:n' shots)
//   si      sentence index inside the line;  sl / sk  seconds since / progress through the current sentence
//   talk    0..1 mouth-open amount for dialogue lines (use with ch.look(expr, T, c.talk))
//   lower(name, role)  title(k)  dom(html)  fade(a)  flash(a)   -> per-frame overlays
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { clamp, ease, lerp } from './lib.js';
export * from './lib.js';

export const W = 1920, H = 1080;
export const TL = await (await fetch('build/timeline.json')).json();
await document.fonts.load('900 100px Inter'); await document.fonts.load('700 40px Inter');
export const LINE = {}; for (const ch of TL.chapters) for (const L of ch.lines) { L.ch = ch; LINE[L.id] = L; }
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('c'), antialias: true, preserveDrawingBuffer: true });
renderer.setSize(W, H, false); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const composer = new EffectComposer(renderer); const rpass = new RenderPass(new THREE.Scene(), new THREE.PerspectiveCamera());
const bloom = new UnrealBloomPass(new THREE.Vector2(W / 2, H / 2), 0.3, 0.6, 0.82); composer.addPass(rpass); composer.addPass(bloom); composer.addPass(new OutputPass());

export function shot(cam, p, l, fov = 35, roll = 0) { cam.position.set(...p); cam.fov = fov; cam.up.set(Math.sin(roll), Math.cos(roll), 0); cam.lookAt(...l); cam.updateProjectionMatrix(); }
const mix3 = (a, b, k) => a.map((v, i) => lerp(v, b[i], k));
export function move(cam, p0, l0, p1, l1, k, fov = 35, roll = 0) { k = ease(k); shot(cam, mix3(p0, p1, k), mix3(l0, l1, k), fov, roll); }
export function shake(cam, T, a = 0.05) { cam.position.x += Math.sin(T * 37) * a; cam.position.y += Math.sin(T * 43 + 1) * a; cam.rotation.z += Math.sin(T * 29) * a * 0.02; }
// split progress k into n equal sub-shots (or at explicit cut points): returns [index, subProgress]
export function cuts(k, pts) { if (typeof pts === 'number') pts = Array.from({ length: pts - 1 }, (_, i) => (i + 1) / pts); let i = 0; while (i < pts.length && k >= pts[i]) i++; const a = i ? pts[i - 1] : 0, b = i < pts.length ? pts[i] : 1; return [i, clamp((k - a) / (b - a))]; }
export function mkScene(bg, fog, sunCol = 0xffffff, sunI = 2.2, hemi = [0xffffff, 0x8a8f9a, 1.5], sunPos = [14, 26, 18], shadowR = 40) {
  const s = new THREE.Scene(); s.background = new THREE.Color(bg); if (fog) s.fog = new THREE.Fog(bg, fog[0], fog[1]);
  s.add(new THREE.HemisphereLight(...hemi));
  const d = new THREE.DirectionalLight(sunCol, sunI); d.position.set(...sunPos); d.castShadow = true; d.shadow.mapSize.set(2048, 2048);
  const c = d.shadow.camera; c.left = c.bottom = -shadowR; c.right = c.top = shadowR; c.far = 160; d.shadow.bias = -0.0015; s.add(d); s.add(d.target); s.userData.sun = d;
  return { s, cam: new THREE.PerspectiveCamera(35, W / H, 0.1, 900) };
}
export const put = (ch, x, y, z, ry = 0) => { ch.g.position.set(x, y, z); ch.g.rotation.set(0, ry, 0); return ch; };

const SETS = {}, SHOTS = {};
export const SET = (name, build) => { SETS[name] = { build }; };
export const SHOT = (key, set, fn) => { SHOTS[key] = { set, fn }; };
export const getSet = name => { const e = SETS[name]; if (!e) throw new Error('no set ' + name); return e.inst || (e.inst = e.build()); };

// ---------- overlays ----------
const $ = id => document.getElementById(id);
const cap = $('cap'), dlg = $('dlg'), card = $('card'), fadeEl = $('fade'), flashEl = $('flash'), lowerEl = $('lower'), titleEl = $('title'), freeEl = $('free'), dimEl = $('dim');
const SPEAKER = { mal: ['MAL', '#ff6b7d'], cobb: ['COBB', '#ffd24a'], saito: ['SAITO', '#8fd0ff'] };
const chunks = [];
for (const ch of TL.chapters) for (const L of ch.lines) for (const st of L.sents) {
  if (L.v !== 'N') { chunks.push({ a: st.start - 0.05, b: st.end + 0.25, text: st.text, v: L.v }); continue; }
  const groups = []; let cur = [];
  for (const w of st.text.split(' ')) { if (cur.length && (cur.join(' ') + ' ' + w).length > 24) { groups.push(cur.join(' ')); cur = []; } cur.push(w); if (cur.length >= 5 || /[.,?:!]$/.test(w)) { groups.push(cur.join(' ')); cur = []; } }
  if (cur.length) groups.push(cur.join(' '));
  const tot = groups.reduce((a, g) => a + g.length + 2, 0); let t = st.start;
  for (const g of groups) { const d = (st.end - st.start) * (g.length + 2) / tot; chunks.push({ text: g.replace(/[.,:]$/, ''), a: t, b: t + d }); t += d; }
}
let freeHtml = '';
const NUM = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5, SIX: 6, SEVEN: 7, EIGHT: 8 };

window.TOTAL = TL.total; window.FPS = TL.fps;
window.renderAt = (T) => {
  const ch = TL.chapters.find(c => T < c.end) || TL.chapters[TL.chapters.length - 1];
  const L = ch.lines.find(l => T < l.slot[1]) || ch.lines[ch.lines.length - 1];
  const st0 = i => i === 0 ? L.slot[0] : L.sents[i].start - 0.15;
  let si = L.sents.length - 1; while (si > 0 && T < st0(si)) si--;
  const s1 = si + 1 < L.sents.length ? st0(si + 1) : L.slot[1];
  let key = `${L.id}:${si}`, a = st0(si), b = s1;
  if (!SHOTS[key]) { key = L.id; a = L.slot[0]; b = L.slot[1]; let j = si; while (j > 0 && !SHOTS[`${L.id}:${j}`]) j--; if (j > 0) { key = `${L.id}:${j}`; a = st0(j); let e = j + 1; while (e < L.sents.length && !SHOTS[`${L.id}:${e}`]) e++; b = e < L.sents.length ? st0(e) : L.slot[1]; } else { let e = 1; while (e < L.sents.length && !SHOTS[`${L.id}:${e}`]) e++; if (e < L.sents.length) b = st0(e); } }
  const sh = SHOTS[key]; const ui = { fade: 0, flash: 0, lower: null, title: -1, dom: '' };
  const talk = L.env ? (L.env[Math.round(T * TL.fps) - L.env0] || 0) : 0;
  if (sh) {
    const S = getSet(sh.set); S.pre && S.pre(T);
    sh.fn({ S, cam: S.cam, T, l: T - a, k: clamp((T - a) / (b - a)), si, sl: T - st0(si), sk: clamp((T - st0(si)) / (s1 - st0(si))), talk, dur: b - a,
      lower: (n, r, k = 1) => ui.lower = [n, r, k], title: k => ui.title = k, dom: h => ui.dom = h, fade: v => ui.fade = Math.max(ui.fade, v), flash: v => ui.flash = Math.max(ui.flash, v) });
    rpass.scene = S.s; rpass.camera = S.cam; bloom.strength = S.s.userData.bloom ?? 0.28; composer.render();
  } else { renderer.setClearColor(0x200000); renderer.clear(); ui.dom = `<div style="position:absolute;left:60px;top:140px;font-size:60px;color:#f66">MISSING SHOT ${key}</div>`; }
  // captions
  const c = chunks.find(c => T >= c.a - 0.02 && T < c.b - 0.02);
  cap.style.display = c && !c.v ? 'block' : 'none'; dlg.style.display = c && c.v ? 'block' : 'none';
  if (c && !c.v) { cap.textContent = c.text; cap.style.transform = `translateX(-50%) scale(${0.92 + 0.08 * ease((T - c.a + 0.02) / 0.1)})`; }
  if (c && c.v) { const [n, col] = SPEAKER[c.v]; dlg.innerHTML = `<i style="color:${col}">${n}</i>“${c.text}”`; dlg.style.opacity = clamp((T - c.a) / 0.15); }
  // chapter card + fades
  const ct = T - ch.start;
  if (ch.card && ct < TL.card) { const [a1, b1] = ch.card.split('|'), kin = ease(ct / 0.5), kout = clamp((TL.card - ct) / 0.35); card.style.display = 'block'; card.style.opacity = Math.min(kin, kout); card.innerHTML = `<small>${a1}</small><b style="letter-spacing:${lerp(26, 8, kin)}px">${b1}</b><hr style="width:${lerp(0, 420, kin)}px">`; dimEl.style.opacity = 0.62 * Math.min(clamp(ct / 0.3), kout); }
  else { card.style.display = 'none'; dimEl.style.opacity = 0; }
  let f = ui.fade; if (ch.id !== 'p' || T > 1) f = Math.max(f, 1 - ct / 0.4); else f = Math.max(f, 1 - T / 1.0); if (ch.id !== 'h' && ch.id !== 'o') f = Math.max(f, 1 - (ch.end - T) / 0.25);
  fadeEl.style.opacity = clamp(f); flashEl.style.opacity = clamp(ui.flash);
  if (ui.lower) { const [n, r, k] = ui.lower; lowerEl.style.display = 'block'; lowerEl.innerHTML = `<b>${n}</b><span>${r}</span>`; lowerEl.style.opacity = clamp(k / 0.25); lowerEl.style.transform = `translateX(${(1 - ease(k / 0.35)) * -60}px)`; } else lowerEl.style.display = 'none';
  if (ui.title >= 0) { titleEl.style.display = 'block'; titleEl.style.opacity = clamp(ui.title / 0.5); titleEl.style.transform = `translate(-50%,-50%) scale(${1.12 - 0.12 * ease(ui.title / 2.5)})`; } else titleEl.style.display = 'none';
  if (ui.dom !== freeHtml) { freeEl.innerHTML = ui.dom; freeHtml = ui.dom; }
};
