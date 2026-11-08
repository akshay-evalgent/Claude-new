// ATTEMPT 214: 15 shots, 150 s, 24 fps, every cut on a bar of a 96 BPM grid (one bar = 2.5 s).
// The world is grey; her paper planes are the one coloured thing. When plane 214 lands, the knife re-lays the colour.
import { Strokes, hex, hash } from './impasto.js';
import { Ref, bake } from './plate.js';
import * as SET from './sets.js';
import * as FG from './fig.js';

export const BEAT = 0.625, BAR = 2.5;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const smooth = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
const inOut = (x) => { x = clamp(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const out = (x) => { x = clamp(x); return 1 - Math.pow(1 - x, 3); };
const inn = (x) => { x = clamp(x); return x * x; };
const seg = (t, a, b) => clamp((t - a) / (b - a));
const lerp = (a, b, u) => a + (b - a) * u;
const L2 = (a, b, u) => [lerp(a[0], b[0], u), lerp(a[1], b[1], u)];
const bez = (P, u) => { const v = 1 - u; return [v * v * v * P[0][0] + 3 * v * v * u * P[1][0] + 3 * v * u * u * P[2][0] + u * u * u * P[3][0], v * v * v * P[0][1] + 3 * v * v * u * P[1][1] + 3 * v * u * u * P[2][1] + u * u * u * P[3][1]]; };
const camIn = (cam, pw, ph, W, H) => { const z = Math.max(cam.z, W / pw, H / ph); const hw = W / 2 / z, hh = H / 2 / z; return { x: clamp(cam.x, hw, pw - hw), y: clamp(cam.y, hh, ph - hh), z }; };

// front view (wall plate 2400 x 1500)
const GIRL = [1350, 1300], PILE = [1040, 1186], LAMP = [1950, 640], KIDS = [1820, 1300];
const WALL_TOP = 520;
// section (plate 3600 x 2000)
const SG = SET.SECTION.ground, HER_PILE = [1440, SG + 4], HIS_PILE = [1900, SG + 4];

const plates = {};
function wallPlate(E, season) {
  if (plates['w' + season]) return plates['w' + season];
  const R = new Ref(2400, 1500); SET.wallFront(R, season);
  return (plates['w' + season] = bake(E, R, { extra: SET.reflections(new Strokes(), season), seed: 3 }));
}
function sectionPlate(E) { if (plates.sec) return plates.sec; const R = new Ref(3600, 2000); SET.section(R); return (plates.sec = bake(E, R, { seed: 5 })); }

// the counter: small text stays crisp, laid over the painting
function counter(g, W, H, n, a = 1) {
  if (a <= 0) return;
  const k = H > W ? W / 1080 : W / 1920;
  g.save(); g.globalAlpha = a; g.textBaseline = 'alphabetic';
  g.shadowColor = 'rgba(0,0,0,0.45)'; g.shadowBlur = 10 * k;
  g.fillStyle = 'rgba(248,244,236,0.92)'; g.font = `600 ${22 * k}px Archivo`; g.letterSpacing = `${6 * k}px`; g.fillText('ATTEMPT', 64 * k, 78 * k);
  g.font = `600 ${64 * k}px Cormorant`; g.letterSpacing = '0px'; g.fillText(String(n), 62 * k, 140 * k);
  g.restore();
}

// one throw seen from behind (front view): anticipation → release → follow-through. u in seconds from the start of the throw
function throwPose(u, base, k) {
  const sh = [base[0] + 4 * k, base[1] - 128 * k * 1.0];
  const ant = smooth(seg(u, 0, 0.35)), rel = out(seg(u, 0.35, 0.5)), fol = smooth(seg(u, 0.5, 0.9));
  const hRest = [sh[0] + 14 * k, sh[1] + 48 * k], hBack = [sh[0] + 30 * k, sh[1] - 8 * k], hUp = [sh[0] + 6 * k, sh[1] - 60 * k], hFol = [sh[0] - 8 * k, sh[1] + 30 * k];
  let h = L2(hRest, hBack, ant); h = L2(h, hUp, rel); h = L2(h, hFol, fol * 0.8);
  return { hand: h, lean: -0.06 * ant + 0.1 * rel - 0.04 * fol, bob: 3 * ant - 2 * rel, release: u >= 0.45 };
}
// a failed flight in the front view: up toward the wall, hits it at height yw, slides down to the pile
function failPath(kind, h0, xw, yw, land) {
  return (u) => {   // u in seconds since release; returns {p, ang, scale, done}
    if (kind === 'back') {   // the wind throws it back
      const a = seg(u, 0, 1.6), p = bez([h0, [h0[0] - 80, h0[1] - 300], [h0[0] + 260, h0[1] - 360], [h0[0] + 420, h0[1] + 40]], a);
      return { p, ang: -0.9 + a * 2.6, scale: 1.0 - 0.25 * Math.sin(a * Math.PI), done: a >= 1 };
    }
    if (kind === 'lamp') {
      const a = seg(u, 0, 0.9), p = bez([h0, [h0[0] + 100, h0[1] - 420], [LAMP[0] - 120, LAMP[1] - 160], [LAMP[0] - 4, LAMP[1] - 12]], a);
      return { p, ang: -0.7 + a * 0.6, scale: 1.0 - 0.3 * a, done: a >= 1, stuck: a >= 1 };
    }
    if (kind === 'dive') {
      const a = seg(u, 0, 1.0), p = bez([h0, [h0[0] - 60, h0[1] - 260], [land[0] + 60, land[1] - 300], land], a);
      return { p, ang: -1.2 + a * 3.0, scale: 1.0 - 0.4 * a, done: a >= 1 };
    }
    if (kind === 'soggy') {   // rain: it droops and drops into the puddle
      const a = seg(u, 0, 1.1), p = bez([h0, [h0[0] - 120, h0[1] - 220], [700, 1180], [760, 1330]], a);
      return { p, ang: -0.8 + a * 2.2, scale: 1.0 - 0.15 * a, done: a >= 1 };
    }
    const up = seg(u, 0, 0.62), dn = seg(u, 0.62, 1.25);
    if (up < 1) { const p = bez([h0, [h0[0] - 40, h0[1] - 260], [xw + 40, yw + 120], [xw, yw]], out(up)); return { p, ang: -1.4 + up * 0.5, scale: 1.0 - 0.45 * up, hit: false }; }
    const p = [xw + Math.sin(dn * 6) * 18, lerp(yw, land[1], inn(dn))];
    return { p, ang: 0.6 + dn * 4 + Math.sin(dn * 9), scale: 0.55, hit: true, done: dn >= 1 };
  };
}

export const FILM = {
  // 0:00 · the bare canvas: the desk is laid in, then the first plane is painted into being and lifted away
  s01_canvas: { dur: 7.5, async build({ E, W, H }) {
    const R0 = new Ref(2400, 1500); SET.desk(R0); const A = bake(E, R0, { bare: true });
    const R1 = new Ref(2400, 1500); SET.desk(R1); const B = bake(E, R1, { seed: 7 });
    return {
      update(t) {
        const P = new FG.Painter(), cam0 = { x: 1200, y: 760, z: 1.25 + t * 0.03 };
        // the plane, laid stroke by stroke from 2.6 s, then lifted by her hands at 5.6 s
        const lay = seg(t, 2.6, 4.6), lift = inOut(seg(t, 5.6, 7.4));
        const c = [1180, 820 - lift * 900], k = 4.2 * (1 + lift * 0.3);
        if (lay > 0) {
          const Q = new FG.Painter(); FG.plane(Q, c, -0.5 - lift * 0.4, { scale: k, bank: 0.85, seed: 7100 });
          // reveal its strokes one by one: polygons first as the underpaint, then each knife plane
          let n = 0; for (const op of Q.ops) { if (op.k === 'f') { if (lay > 0.15) P.poly([[op.d[0], op.d[1]], [op.d[6], op.d[7]], [op.d[12], op.d[13]]], [op.d[2], op.d[3], op.d[4]], true); for (let i = 18; i < op.d.length; i += 18) if (lay > 0.15 + i / op.d.length * 0.4) P.poly([[op.d[i], op.d[i + 1]], [op.d[i + 6], op.d[i + 7]], [op.d[i + 12], op.d[i + 13]]], [op.d[i + 2], op.d[i + 3], op.d[i + 4]], true); }
            else { const d = op.d.data(); for (let j = 0; j < d.length / 20; j++) { n++; if (lay > 0.55 + n * 0.12) P.knife({ x: d[j * 20], y: d[j * 20 + 1], ang: d[j * 20 + 2], len: d[j * 20 + 3], wid: d[j * 20 + 4], c: [d[j * 20 + 8], d[j * 20 + 9], d[j * 20 + 10]], c2: [d[j * 20 + 12], d[j * 20 + 13], d[j * 20 + 14]], seed: d[j * 20 + 5], exempt: true, h: 0.8, gloss: 0.3, run: 0.02, taper: 0.1 }); } } }
        }
        if (t > 5.0) {   // her hands come in from below
          const hk = 3.2, hy = 1500 - smooth(seg(t, 5.0, 5.7)) * 560 - lift * 900;
          for (const sx of [-1, 1]) {
            const w = [1180 + sx * 125, hy + 40];
            P.capsule([1180 + sx * 300, hy + 520], w, 44, 36, FG.COL.coat, FG.COL.coat2, 300 + sx * 10);
            P.capsule(w, [1180 + sx * 92, hy - 46], 40, 34, FG.COL.skin, hex('#f4d0b0'), 320 + sx * 3, { n: 2 });
            P.capsule([w[0] - sx * 6, w[1] - 10], [1180 + sx * 64, hy - 30], 13, 11, FG.COL.skin, hex('#f4d0b0'), 330 + sx * 3, { n: 1 });
          }
        }
        const cam = camIn(cam0, 2400, 1500, W, H);
        P.flush(E, E.layer, cam);
        return { A, B, cam, camB: cam, mix: seg(t, 0.2, 2.4) * 1.05, mixDir: [0.7, 0.7], mixSpan: W * 1.4, grey: 1, light: [-0.6, 0.6, 0.5], lightCol: [1.08, 1.0, 0.9] };
      },
    };
  } },

  // 0:07.5 · tilt up from the puddle to the top of the wall; she is small at its foot with plane 1
  s02_tilt: { dur: 5, async build({ E, W, H }) {
    const A = wallPlate(E, 'grey');
    return {
      update(t) {
        const u = inOut(t / 5);
        const P = new FG.Painter();
        FG.girl(P, GIRL, { scale: 1.5, face: 2, t, wind: 0.3, hand: [GIRL[0] + 30, GIRL[1] - 150] });
        FG.plane(P, [GIRL[0] + 34, GIRL[1] - 160], -1.2, { scale: 1.4, bank: 0.7 });
        const cam = camIn({ x: lerp(900, 1250, u), y: lerp(1260, 760, u), z: lerp(2.0, 1.0, u) }, 2400, 1500, W, H);
        P.flush(E, E.layer, cam);
        return { A, cam, grey: 1 };
      },
      overlay(g, W, H, t) { counter(g, W, H, 1, seg(t, 3.8, 4.6)); },
    };
  } },

  // 0:12.5 · attempt 1: anticipation, throw, it hits the wall and drops
  s03_first: { dur: 7.5, async build({ E, W, H }) {
    const A = wallPlate(E, 'grey');
    const path = failPath('wall', null, 1210, 930, [PILE[0] + 30, PILE[1] - 6]);
    return {
      update(t) {
        const P = new FG.Painter(), T0 = 1.25, u = t - T0;
        const tp = throwPose(u, GIRL, 1.5);
        let landed = false;
        if (u > 0.45) {
          const h0 = [GIRL[0] + 10, GIRL[1] - 210], q = failPath('wall', h0, 1210, 930, [PILE[0] + 30, PILE[1] - 6])(u - 0.45);
          if (!q.done) FG.plane(P, q.p, q.ang, { scale: 1.4 * (0.5 + 0.5 * q.scale) }); else landed = true;
        }
        if (landed) FG.crumple(P, [PILE[0] + 30, PILE[1] - 6], 1.2, 9000);
        FG.girl(P, GIRL, { scale: 1.5, face: 2, t, wind: 0.3, hand: tp.hand, lean: tp.lean, bob: tp.bob });
        if (!tp.release) FG.plane(P, [tp.hand[0] + 4, tp.hand[1] - 10], -1.2, { scale: 1.4, bank: 0.7 });
        const cam = camIn({ x: 1250, y: 860, z: 1.12 - t * 0.008 }, 2400, 1500, W, H);
        P.flush(E, E.layer, cam);
        return { A, cam, grey: 1 };
      },
      overlay(g, W, H) { counter(g, W, H, 1); },
    };
  } },

  // 0:20 · the montage: the same wide, ten attempts, one per bar; the seasons turn, the pile grows
  s04_montage: { dur: 25, async build({ E, W, H }) {
    const CUTS = [[2, 'grey', 'wall', 1000], [7, 'grey', 'back', 0], [15, 'grey', 'wall', 840, true], [23, 'grey', 'lamp', 0], [40, 'autumn', 'wall', 780],
      [61, 'autumn', 'dive', 0], [88, 'snow', 'wall', 700, true], [120, 'snow', 'wall', 660], [150, 'spring', 'wall', 600], [190, 'spring', 'wall', 630, true]];
    for (const c of CUTS) wallPlate(E, c[1]);
    return {
      update(t) {
        const i = Math.min(9, Math.floor(t / BAR)), [n, season, kind, yw, kids] = CUTS[i], lt = t - i * BAR;
        const A = wallPlate(E, season);
        const P = new FG.Painter();
        const tp = throwPose(lt - 0.4, GIRL, 1.5);
        const h0 = [GIRL[0] + 10, GIRL[1] - 210];
        const land = [PILE[0] + (hash(n) - 0.5) * 140, PILE[1] - Math.sqrt(n) * 7.5 * 1.2 * 0.6];
        let pileN = n - 1;
        const q = lt - 0.85 > 0 ? failPath(kind, h0, 1060 + hash(n * 3) * 300, yw, land)(lt - 0.85) : null;
        if (q && q.done && kind !== 'back' && kind !== 'lamp') pileN = n;
        FG.pile(P, PILE, pileN, { scale: 1.2 });
        if (n > 23) FG.plane(P, [LAMP[0] - 4, LAMP[1] - 14], -0.1, { scale: 0.8, bank: 0.5, seed: 7300 });   // the one stuck on the lamp stays there
        if (kids) FG.kids(P, KIDS, t);
        if (q && !(q.done && !q.stuck)) FG.plane(P, q.p, q.ang, { scale: 1.4 * (0.5 + 0.5 * q.scale) });
        if (q && q.done && kind === 'back') FG.crumple(P, [h0[0] + 420, GIRL[1] + 40], 1.2, 9900 + n);
        FG.girl(P, GIRL, { scale: 1.5, face: 2, t: lt, wind: season === 'autumn' ? 0.8 : 0.4, hand: tp.hand, lean: tp.lean, bob: tp.bob });
        if (!tp.release) FG.plane(P, [tp.hand[0] + 4, tp.hand[1] - 10], -1.2, { scale: 1.4, bank: 0.7 });
        if (season === 'snow') FG.rain(P, t, [0, 0, 2400, 1500], 160, { speed: 160, ang: 1.6, c: [0.95, 0.96, 0.98] });
        const cam = camIn({ x: 1250, y: 860, z: 1.08 }, 2400, 1500, W, H);
        P.flush(E, E.layer, cam);
        return { A, cam, grey: 1 };
      },
      overlay(g, W, H, t) { const i = Math.min(9, Math.floor(t / BAR)); counter(g, W, H, [2, 7, 15, 23, 40, 61, 88, 120, 150, 190][i]); },
    };
  } },

  // 0:45 · night, her room: she folds and studies; push-in through a silence
  s05_room: { dur: 10, async build({ E, W, H }) {
    const R = new Ref(2400, 1500); SET.room(R); const A = bake(E, R, { seed: 9 });
    return {
      update(t) {
        const P = new FG.Painter();
        for (let i = 0; i < 9; i++) FG.plane(P, [1180 + (i % 3) * 46 + hash(i) * 10, 1018 - Math.floor(i / 3) * 14], -0.2 + hash(i + 2) * 0.4, { scale: 0.9, bank: 0.3, seed: 7400 + i * 3 });
        const fold = Math.sin(t * 2.4) * 0.5 + 0.5;
        FG.girl(P, [1560, 1140], { scale: 1.9, face: -1, sit: true, mood: t < 6 ? 'determined' : 'sad', t, wind: 0.0, lean: 0.12,
          hand: [1360 + fold * 30, 980 - fold * 16], backHand: [1400 - fold * 20, 990], eyesShut: t > 8.2 && t < 8.4 });
        FG.plane(P, [1370 + fold * 30, 966 - fold * 16], -0.3 + fold * 0.3, { scale: 1.1, bank: 0.2 + fold * 0.6, seed: 7500 });
        const cam = camIn({ x: lerp(1250, 1450, inOut(t / 10)), y: lerp(780, 900, inOut(t / 10)), z: lerp(1.0, 1.55, inOut(t / 10)) }, 2400, 1500, W, H);
        P.flush(E, E.layer, cam);
        return { A, cam, grey: 1, light: [0.7, 0.4, 0.5], lightCol: [1.12, 1.0, 0.86], shadeCol: [0.8, 0.84, 1.0], amb: 0.42 };
      },
      overlay(g, W, H, t) { counter(g, W, H, 191 + Math.floor(t * 1.8), 0.85); },
    };
  } },

  // 0:55 · rain, attempt 213: it droops into the puddle; the kids laugh under umbrellas; she sits down
  s06_213: { dur: 10, async build({ E, W, H }) {
    const A = wallPlate(E, 'rain');
    return {
      update(t) {
        const P = new FG.Painter(), lt = t - 1.0;
        FG.pile(P, PILE, 212, { scale: 1.2 });
        FG.plane(P, [LAMP[0] - 4, LAMP[1] - 14], -0.1, { scale: 0.8, bank: 0.5, seed: 7300 });
        FG.kids(P, KIDS, t, { umbrella: true, point: t > 3 });
        const h0 = [GIRL[0] + 10, GIRL[1] - 210];
        const q = lt - 0.45 > 0 ? failPath('soggy', h0)(lt - 0.45) : null;
        if (q && !q.done) FG.plane(P, q.p, q.ang, { scale: 1.4 * (0.5 + 0.5 * q.scale) });
        if (q && q.done) FG.crumple(P, [760, 1330], 1.0, 9213);
        const sit = smooth(seg(t, 4.5, 6.0));
        if (sit < 0.5) { const tp = throwPose(lt, GIRL, 1.5); FG.girl(P, GIRL, { scale: 1.5, face: 2, t, wind: 0.6, hand: tp.hand, lean: tp.lean, bob: tp.bob }); if (!tp.release) FG.plane(P, [tp.hand[0] + 4, tp.hand[1] - 10], -1.2, { scale: 1.4, bank: 0.7 }); }
        else FG.girl(P, [PILE[0] + 40, PILE[1] - 120], { scale: 1.5, face: 0, sit: true, mood: 'sad', t, wind: 0.5, lean: 0.25, hand: [PILE[0] + 70, PILE[1] - 150], backHand: [PILE[0] + 20, PILE[1] - 150] });
        FG.rain(P, t, [0, 0, 2400, 1500], 300);
        const cam = camIn({ x: lerp(1250, 1150, inOut(t / 10)), y: 860, z: lerp(1.08, 1.3, inOut(seg(t, 5, 10))) }, 2400, 1500, W, H);
        P.flush(E, E.layer, cam);
        return { A, cam, grey: 1, spec: 0.3 };
      },
      overlay(g, W, H) { counter(g, W, H, 213); },
    };
  } },

  // 1:05 · hard silence: she sits on 212 failures in the rain, holding the next plane
  s07_silence: { dur: 5, async build({ E, W, H }) {
    const A = wallPlate(E, 'rain');
    return {
      update(t) {
        const P = new FG.Painter();
        FG.pile(P, PILE, 212, { scale: 1.2 });
        const base = [PILE[0] + 40, PILE[1] - 120];
        FG.girl(P, base, { scale: 1.5, face: 0, sit: true, mood: 'sad', t, wind: 0.3, lean: 0.25, hand: [base[0] + 30, base[1] - 34], backHand: [base[0] - 20, base[1] - 34], eyesShut: t > 2.2 && t < 2.4 });
        FG.plane(P, [base[0] + 6, base[1] - 44], 0.1, { scale: 1.0, bank: 0.4, seed: 7214 });
        FG.rain(P, t, [0, 0, 2400, 1500], Math.round(300 * (1 - seg(t, 1.5, 4.5))));
        const cam = camIn({ x: base[0] + 10, y: base[1] - 150, z: lerp(2.0, 2.6, inOut(t / 5)) }, 2400, 1500, W, H);
        P.flush(E, E.layer, cam);
        return { A, cam, grey: 1, spec: 0.3 };
      },
    };
  } },

  // 1:10 · the sun breaks through, raking light; she looks up; on the top of the wall, a blue plane is stuck: someone on the other side
  s08_sign: { dur: 10, async build({ E, W, H }) {
    const A = wallPlate(E, 'grey');
    return {
      update(t) {
        const P = new FG.Painter();
        FG.pile(P, PILE, 213, { scale: 1.2 });
        const base = [PILE[0] + 40, PILE[1] - 120];
        const look = smooth(seg(t, 1.8, 2.6));
        FG.girl(P, base, { scale: 1.5, face: 0, sit: true, mood: t < 2.4 ? 'sad' : t < 7.5 ? 'surprised' : 'determined', lookUp: look, t, wind: 0.4, lean: 0.25 - look * 0.3, hand: [base[0] + 30, base[1] - 34], backHand: [base[0] - 20, base[1] - 34] });
        FG.plane(P, [base[0] + 6, base[1] - 44], 0.1, { scale: 1.0, bank: 0.4, seed: 7214 });
        FG.plane(P, [1180, WALL_TOP - 8], 0.15, { scale: 1.35, bank: 0.5, blue: true, seed: 7600 });   // his, almost made it
        const up = inOut(seg(t, 3.0, 6.5)), back = inOut(seg(t, 7.0, 9.5));
        let cam = { x: lerp(base[0] + 10, 1180, up), y: lerp(base[1] - 150, WALL_TOP + 40, up), z: lerp(2.6, 2.4, up) };
        cam = { x: lerp(cam.x, 1150, back), y: lerp(cam.y, 900, back), z: lerp(cam.z, 1.2, back) };
        cam = camIn(cam, 2400, 1500, W, H);
        P.flush(E, E.layer, cam);
        const sun = smooth(seg(t, 0.6, 3.2)), rake = 0.7 + 0.6 * Math.sin(Math.PI * seg(t, 3.2, 6.8));
        return { A, cam, grey: 1, light: [-0.85 + sun * 0.1, 0.35, lerp(0.45, 0.28, Math.sin(Math.PI * seg(t, 3.2, 6.8)))], rake, lightCol: [1.0 + sun * 0.12, 1.0 + sun * 0.04, 0.96 - sun * 0.06], spec: 0.25 };
      },
      overlay(g, W, H) { counter(g, W, H, 213, 0.6); },
    };
  } },

  // 1:20 · she climbs her 213 failures: they are the stairs
  s09_climb: { dur: 12.5, async build({ E, W, H }) {
    const A = wallPlate(E, 'grey');
    const top = [PILE[0], PILE[1] - Math.sqrt(213) * 7.5 * 1.2];
    return {
      update(t) {
        const P = new FG.Painter();
        FG.pile(P, PILE, 213, { scale: 1.2 });
        FG.plane(P, [1180, WALL_TOP - 8], 0.15, { scale: 1.35, bank: 0.5, blue: true, seed: 7600 });
        const c = inOut(seg(t, 0.5, 7.5)), step = Math.sin(t * 7) * (c > 0 && c < 1 ? 1 : 0);
        const start = [PILE[0] + 280, PILE[1] + 50], mid = [PILE[0] + 140, PILE[1] - 70];
        const pos = c < 0.5 ? L2(start, mid, c * 2) : L2(mid, top, (c - 0.5) * 2);
        const hold = t > 8.5 ? smooth(seg(t, 8.5, 10)) : 0;
        FG.girl(P, pos, { scale: 1.5, face: c >= 1 ? 2 : -1, t, wind: 0.6, step: step * 0.6, bob: Math.abs(step) * 3, lean: c < 1 ? 0.15 : 0,
          hand: c >= 1 ? [pos[0] + 16 + hold * 6, pos[1] - 190 - hold * 30] : [pos[0] - 40, pos[1] - 110 - Math.max(0, step) * 20] });
        const hp = c >= 1 ? [pos[0] + 22 + hold * 6, pos[1] - 200 - hold * 30] : [pos[0] - 44, pos[1] - 120];
        FG.plane(P, hp, -1.2, { scale: 0.9 + hold * 0.1, bank: 0.7, seed: 7214 });
        const cam = camIn({ x: lerp(1300, 1080, c), y: lerp(1000, 760, c), z: lerp(1.25, 1.45, inOut(seg(t, 7.5, 12.5))) }, 2400, 1500, W, H);
        P.flush(E, E.layer, cam);
        return { A, cam, grey: 1, light: [-0.8, 0.4, 0.42], rake: 0.85 };
      },
      overlay(g, W, H, t) { counter(g, W, H, 214, seg(t, 9.0, 9.6)); },
    };
  } },

  // 1:32.5 · the throw, seen in profile on her pile beside the wall: hold, then release on the beat
  s10_throw: { dur: 7.5, async build({ E, W, H }) {
    const A = sectionPlate(E);
    return {
      update(t) {
        const P = new FG.Painter();
        FG.pile(P, HER_PILE, 213, { scale: 1.2 });
        FG.pile(P, HIS_PILE, 301, { scale: 1.25, blue: true, seed: 9500 });
        const top = [HER_PILE[0], HER_PILE[1] - Math.sqrt(213) * 7.5 * 1.2 + 6];
        const ant = smooth(seg(t, 1.0, 3.6)), rel = out(seg(t, 3.75, 3.95)), fol = smooth(seg(t, 3.95, 4.8));
        const sh = [top[0] + 4, top[1] - 192];
        let hand = L2([sh[0] + 20, sh[1] + 60], [sh[0] - 50, sh[1] - 20], ant); hand = L2(hand, [sh[0] + 60, sh[1] - 50], rel); hand = L2(hand, [sh[0] + 50, sh[1] + 40], fol);
        FG.girl(P, top, { scale: 1.5, face: 1, mood: 'determined', t, wind: 0.5, lean: -0.14 * ant + 0.18 * rel - 0.04 * fol, hand, step: 0.2 * ant });
        if (t < 3.9) FG.plane(P, [hand[0] + 8, hand[1] - 8], -0.5, { scale: 0.95, bank: 0.7, seed: 7214 });
        else { const u = seg(t, 3.9, 7.5); const path = [[hand[0] + 8, hand[1] - 8], [1500, 300], [1800, 260], [1905, 1290]]; const p = bez(path, u * 0.42); const p2 = bez(path, u * 0.42 + 0.01); FG.trail(P, (x) => bez(path, x), 0, u * 0.42, { n: 26 }); FG.plane(P, p, Math.atan2(p2[1] - p[1], p2[0] - p[0]), { scale: 0.95, bank: 0.7, seed: 7214 }); }
        const cam = camIn({ x: lerp(1420, 1460, t / 7.5), y: lerp(1320, 1150, smooth(seg(t, 4, 7.5))), z: lerp(1.6, 1.3, smooth(seg(t, 4, 7.5))) }, 3600, 2000, W, H);
        P.flush(E, E.layer, cam);
        return { A, cam, grey: 1, light: [-0.8, 0.4, 0.42], rake: 0.8 };
      },
      overlay(g, W, H) { counter(g, W, H, 214); },
    };
  } },

  // 1:40 · the flight: over the wall, its path painting itself; the other side, a boy on a mountain of blue planes
  s11_flight: { dur: 12.5, async build({ E, W, H }) {
    const A = sectionPlate(E);
    const start = [1474, 1250];
    const path = [start, [1500, 300], [1800, 260], [1905, 1290]];
    return {
      update(t) {
        const P = new FG.Painter();
        FG.pile(P, HER_PILE, 213, { scale: 1.2 });
        FG.pile(P, HIS_PILE, 301, { scale: 1.25, blue: true, seed: 9500 });
        const topH = [HER_PILE[0], HER_PILE[1] - Math.sqrt(213) * 7.5 * 1.2 + 6], topB = [HIS_PILE[0] + 10, HIS_PILE[1] - Math.sqrt(301) * 7.5 * 1.25 + 6];
        FG.girl(P, topH, { scale: 1.5, face: 1, mood: t < 6 ? 'surprised' : 'happy', lookUp: 0.8, t, wind: 0.5 });
        const u = 0.42 + 0.58 * inOut(seg(t, 0, 9.5));
        const p = bez(path, u), p2 = bez(path, Math.min(1, u + 0.01));
        FG.trail(P, (x) => bez(path, x), 0, u, { n: 70 });
        const caught = t > 9.5;
        const stand = smooth(seg(t, 6.5, 8.0)), reach = smooth(seg(t, 8.2, 9.5));
        FG.boy(P, topB, { scale: 1.5, face: -1, sit: stand < 0.5, mood: t < 7 ? 'sad' : 'surprised', lookUp: t > 6.2 ? 0.9 : 0, t, wind: 0.4, hand: [topB[0] - 30 - reach * 20, topB[1] - 150 - reach * 90] });
        if (!caught) FG.plane(P, p, Math.atan2(p2[1] - p[1], p2[0] - p[0]), { scale: 0.95, bank: 0.7, seed: 7214 });
        else FG.plane(P, [topB[0] - 50, topB[1] - 250], -0.3, { scale: 0.95, bank: 0.6, seed: 7214 });
        const cx = lerp(1460, 2000, inOut(seg(t, 0.5, 9.5))), cy = lerp(1100, 760, Math.sin(Math.PI * seg(t, 0, 7))) * 1 + (t > 7 ? lerp(0, 380, inOut(seg(t, 7, 10))) : 0);
        const cam = camIn({ x: cx, y: cy, z: lerp(1.15, 0.95, Math.sin(Math.PI * seg(t, 0, 9))) + (t > 9 ? 0.4 * inOut(seg(t, 9, 12.5)) : 0) }, 3600, 2000, W, H);
        P.flush(E, E.layer, cam);
        return { A, cam, grey: 1, light: [-0.8, 0.4, 0.42], rake: 0.8 };
      },
      overlay(g, W, H) { counter(g, W, H, 214); },
    };
  } },

  // 1:52.5 · he catches it, reads the number, grins, and throws one of his back
  s12_catch: { dur: 7.5, async build({ E, W, H }) {
    const A = sectionPlate(E);
    return {
      update(t) {
        const P = new FG.Painter();
        FG.pile(P, HIS_PILE, 301, { scale: 1.25, blue: true, seed: 9500 });
        const topB = [HIS_PILE[0] + 10, HIS_PILE[1] - Math.sqrt(301) * 7.5 * 1.25 + 6];
        const look = smooth(seg(t, 0.2, 1.2)), ant = smooth(seg(t, 3.2, 5.0)), rel = out(seg(t, 5.0, 5.2)), fol = smooth(seg(t, 5.2, 6.2));
        const sh = [topB[0] - 4, topB[1] - 192];
        let hand = L2([sh[0] - 40, sh[1] + 30], [sh[0] - 20, sh[1] + 40], look);
        hand = L2(hand, [sh[0] + 50, sh[1] - 20], ant); hand = L2(hand, [sh[0] - 60, sh[1] - 50], rel); hand = L2(hand, [sh[0] - 50, sh[1] + 40], fol);
        FG.boy(P, topB, { scale: 1.5, face: -1, mood: t < 2.2 ? 'surprised' : 'happy', t, wind: 0.4, hand, backHand: t < 3 ? [sh[0] - 36, sh[1] + 34] : undefined, lean: 0.14 * ant - 0.18 * rel });
        if (t < 3.0) FG.plane(P, [sh[0] - 40, sh[1] + 20], -0.2, { scale: 1.0, bank: 0.2 + look * 0.4, seed: 7214 });
        else FG.plane(P, [sh[0] - 30, sh[1] + 52], 1.3, { scale: 0.9, bank: 0.3, seed: 7214 });   // he keeps hers, held at his side
        if (t > 2.6 && t < 5.15) FG.plane(P, [hand[0] - 8, hand[1] - 8], Math.PI + 0.5, { scale: 0.95, bank: 0.7, blue: true, seed: 7700 });
        if (t > 5.1) { const u = seg(t, 5.1, 7.5) * 0.35; const path = [[hand[0] - 8, hand[1] - 8], [1840, 280], [1560, 300], [1478, 1290]]; const p = bez(path, u), p2 = bez(path, u + 0.01); FG.trail(P, (x) => bez(path, x), 0, u, { n: 20, blue: true }); FG.plane(P, p, Math.atan2(p2[1] - p[1], p2[0] - p[0]), { scale: 0.95, bank: 0.7, blue: true, seed: 7700 }); }
        const cam = camIn({ x: lerp(1960, 1900, t / 7.5), y: lerp(1300, 1200, t / 7.5), z: 1.9 - 0.3 * smooth(seg(t, 4.5, 7.5)) }, 3600, 2000, W, H);
        P.flush(E, E.layer, cam);
        return { A, cam, grey: 1, light: [-0.8, 0.4, 0.42], rake: 0.8 };
      },
      overlay(g, W, H, t) {
        if (t > 1.0 && t < 3.0) {   // the number she wrote, in his hands
          const k = H > W ? W / 1080 : W / 1920, a = seg(t, 1.0, 1.3) * (1 - seg(t, 2.7, 3.0));
          g.save(); g.globalAlpha = a; g.font = `600 ${44 * k}px Cormorant`; g.fillStyle = 'rgba(248,244,236,0.95)'; g.textAlign = 'center'; g.shadowColor = 'rgba(0,0,0,0.5)'; g.shadowBlur = 8 * k; g.fillText('214', W * 0.42, H * 0.36); g.restore();
        }
      },
    };
  } },

  // 2:00 · the blue plane comes back over; she catches it; from the top of the wall the knife re-lays the world in colour
  s13_colour: { dur: 10, async build({ E, W, H }) {
    const A = sectionPlate(E);
    return {
      update(t) {
        const P = new FG.Painter();
        FG.pile(P, HER_PILE, 213, { scale: 1.2 });
        FG.pile(P, HIS_PILE, 301, { scale: 1.25, blue: true, seed: 9500 });
        const topH = [HER_PILE[0], HER_PILE[1] - Math.sqrt(213) * 7.5 * 1.2 + 6], topB = [HIS_PILE[0] + 10, HIS_PILE[1] - Math.sqrt(301) * 7.5 * 1.25 + 6];
        const path = [[topB[0] - 60, topB[1] - 250], [1840, 280], [1560, 300], [topH[0] + 40, topH[1] - 230]];
        const u = 0.35 + 0.65 * inOut(seg(t, 0, 3.2));
        const caught = t > 3.2, reach = smooth(seg(t, 2.2, 3.2));
        FG.trail(P, (x) => bez(path, x), 0, u, { n: 60, blue: true });
        FG.trail(P, (x) => bez([[1474, 1250], [1500, 300], [1800, 260], [1905, 1290]], x), 0, 1, { n: 70, fade: 1.1, fadeK: 0.3 });
        FG.girl(P, topH, { scale: 1.5, face: t < 4.5 ? 1 : 0, mood: t < 3.2 ? 'surprised' : 'happy', lookUp: t < 3.2 ? 0.7 : 0.2, t, wind: 0.5, hand: [topH[0] + 30 + reach * 10, topH[1] - 150 - reach * 70] });
        FG.boy(P, topB, { scale: 1.5, face: t < 4.5 ? -1 : 0, mood: 'happy', t, wind: 0.4, hand: [topB[0] - 40, topB[1] - 210 + Math.sin(t * 8) * 20 * (t > 4 ? 1 : 0)] });
        if (!caught) { const p = bez(path, u), p2 = bez(path, Math.min(1, u + 0.01)); FG.plane(P, p, Math.atan2(p2[1] - p[1], p2[0] - p[0]), { scale: 0.95, bank: 0.7, blue: true, seed: 7700 }); }
        else FG.plane(P, [topH[0] + 44, topH[1] - 236], -0.4, { scale: 0.95, bank: 0.6, blue: true, seed: 7700 });
        const cam = camIn({ x: 1680, y: lerp(1180, 1040, inOut(t / 10)), z: lerp(1.1, 0.95, inOut(t / 10)) }, 3600, 2000, W, H);
        P.flush(E, E.layer, cam);
        const rev = t < 3.4 ? 0 : 4200 * inOut(seg(t, 3.4, 7.6));
        const warm = smooth(seg(t, 3.4, 7.6));
        return { A, cam, grey: 1, revC: [1665, 610], revR: rev, light: [-0.8 + warm * 0.2, 0.4, lerp(0.42, 0.3, Math.sin(Math.PI * seg(t, 4, 8)))], rake: 0.8 + 0.4 * Math.sin(Math.PI * seg(t, 4, 8)), lightCol: [1.0 + warm * 0.12, 1.0 + warm * 0.03, 0.95 - warm * 0.08], sat: 1.0 + warm * 0.1 };
      },
      overlay(g, W, H, t) { counter(g, W, H, 214, 1 - seg(t, 3.5, 4.5)); },
    };
  } },

  // 2:10 · back and forth: their paths paint a woven pattern over the wall; pull back
  s14_pattern: { dur: 7.5, async build({ E, W, H }) {
    const A = sectionPlate(E);
    return {
      update(t) {
        const P = new FG.Painter();
        FG.pile(P, HER_PILE, 213, { scale: 1.2 });
        FG.pile(P, HIS_PILE, 301, { scale: 1.25, blue: true, seed: 9500 });
        const topH = [HER_PILE[0], HER_PILE[1] - Math.sqrt(213) * 7.5 * 1.2 + 6], topB = [HIS_PILE[0] + 10, HIS_PILE[1] - Math.sqrt(301) * 7.5 * 1.25 + 6];
        const hh = [topH[0] + 40, topH[1] - 230], bh = [topB[0] - 60, topB[1] - 250];
        // eight crossings, alternating, each a different arc; every path stays painted
        for (let i = 0; i < 8; i++) {
          const t0 = -2.0 + i * 1.1, blue = i % 2 === 0, hgt = 180 + hash(i) * 260;
          const a = blue ? bh : hh, b = blue ? hh : bh;
          const path = [a, [lerp(a[0], 1665, 0.6), hgt], [lerp(b[0], 1665, 0.6), hgt - 30], b];
          const u = seg(t, t0, t0 + 1.6);
          if (u <= 0) continue;
          FG.trail(P, (x) => bez(path, x), 0, u, { n: 50, blue, fade: 2, fadeK: 0.15, wid: 6 });
          if (u < 1) { const p = bez(path, u), p2 = bez(path, Math.min(1, u + 0.01)); FG.plane(P, p, Math.atan2(p2[1] - p[1], p2[0] - p[0]), { scale: 0.9, bank: 0.7, blue, seed: 7800 + i }); }
        }
        const sw = Math.sin(t * 5);
        FG.girl(P, topH, { scale: 1.5, face: 1, mood: 'happy', t, wind: 0.5, hand: [topH[0] + 40 + sw * 10, topH[1] - 200] });
        FG.boy(P, topB, { scale: 1.5, face: -1, mood: 'happy', t, wind: 0.4, hand: [topB[0] - 40 - sw * 10, topB[1] - 200] });
        const cam = camIn({ x: 1700, y: lerp(1050, 1000, t / 7.5), z: lerp(0.95, 0.6, inOut(t / 7.5)) }, 3600, 2000, W, H);
        P.flush(E, E.layer, cam);
        return { A, cam, grey: 1, revC: [1665, 610], revR: 99999, light: [-0.6, 0.4, 0.34], rake: 1.0, lightCol: [1.12, 1.03, 0.87], sat: 1.1 };
      },
    };
  } },

  // 2:17.5 · the line and the title, laid in by the knife over the sunset sky; bottom corners kept clear
  s15_end: { dur: 12.5, async build({ E, W, H, vertical }) {
    const mk = (withText) => { const R = new Ref(2400, 1500); R.shape({ path: (p) => p.rect(0, 0, 2400, 1500), fill: (g) => { const gr = g.createLinearGradient(0, 0, 0, 1500); [[0, '#2c4f9e'], [0.4, '#7d7fb8'], [0.7, '#e8a07c'], [0.9, '#f4c870'], [1, '#f8dc9a']].forEach(([a, c]) => gr.addColorStop(a, c)); return gr; }, maxR: 80, detail: 26, dir: 0.05, jit: 8, varThr: 0.004, h: 0.55 });
      if (withText === 1 && !vertical) SET.titleShapes(R, [{ str: 'Most people stop at 213.', font: 'italic 500 120px Cormorant', x: 1200, y: 690, fill: '#fff4e2', maxR: 9, detail: 3 }]);
      if (withText === 2 && !vertical) SET.titleShapes(R, [{ str: 'ATTEMPT 214', font: '600 230px Cormorant', x: 1200, y: 720, fill: '#fff4e2', maxR: 12, detail: 3, letter: 18 }]);
      if (withText === 1 && vertical) SET.titleShapes(R, [{ str: 'Most people', font: 'italic 500 120px Cormorant', x: 1200, y: 640, fill: '#fff4e2', maxR: 9, detail: 3 }, { str: 'stop at 213.', font: 'italic 500 120px Cormorant', x: 1200, y: 790, fill: '#fff4e2', maxR: 9, detail: 3 }]);
      if (withText === 2 && vertical) SET.titleShapes(R, [{ str: 'ATTEMPT', font: '600 150px Cormorant', x: 1200, y: 640, fill: '#fff4e2', maxR: 10, detail: 3, letter: 12 }, { str: '214', font: '600 260px Cormorant', x: 1200, y: 900, fill: '#fff4e2', maxR: 12, detail: 3, letter: 10 }]);
      return bake(E, R, { seed: 11 }); };
    const A = mk(0), B1 = mk(1), B2 = mk(2);
    return {
      update(t) {
        const P = new FG.Painter();
        // two planes keep crossing, small, far away
        for (let i = 0; i < 4; i++) { const blue = i % 2 === 1, u = ((t * 0.18 + i * 0.25) % 1); const p = [lerp(blue ? 2300 : 100, blue ? 100 : 2300, u), 1250 - Math.sin(u * Math.PI) * 300 - i * 30]; FG.plane(P, p, blue ? Math.PI + 0.2 - u * 0.4 : -0.2 + u * 0.4, { scale: 0.6, bank: 0.6, blue, seed: 7900 + i }); }
        const cam = camIn(vertical ? { x: 1170 + t * 16, y: 760, z: 1.3 + t * 0.03 } : { x: 1200, y: 750, z: 1.0 + t * 0.006 }, 2400, 1500, W, H);   // vertical: a slow drift so the hold is never still
        P.flush(E, E.layer, cam);
        if (t < 5.6) return { A, B: B1, cam, mix: seg(t, 0.4, 1.6) * 1.05 - seg(t, 4.6, 5.4) * 1.05, mixDir: [1, 0], mixSpan: W * 0.8, mixOff: W * 0.12, grey: 0, light: [-0.6, 0.45, 0.4], lightCol: [1.08, 1.02, 0.92] };
        return { A, B: B2, cam, mix: seg(t, 5.8, 7.0) * 1.05, mixDir: [1, 0], mixSpan: W * 0.8, mixOff: W * 0.12, grey: 0, light: [-0.6, 0.45, 0.4], lightCol: [1.08, 1.02, 0.92] };
      },
      overlay(g, W, H, t) {
        const a = seg(t, 7.2, 8.0), k = H > W ? W / 1080 : W / 1920;
        g.save(); g.globalAlpha = a; g.textAlign = 'center'; g.fillStyle = 'rgba(255,248,236,0.9)'; g.font = `600 ${22 * k}px Archivo`; g.letterSpacing = `${6 * k}px`; g.shadowColor = 'rgba(40,20,10,0.5)'; g.shadowBlur = 8 * k;
        g.fillText(H > W ? 'WHATIFGRAPHICS' : 'AN ANIMATED SHORT FILM · WHATIFGRAPHICS', W / 2, H > W ? H * 0.62 : H * 0.6); g.restore();
      },
    };
  } },
};
export const ORDER = Object.keys(FILM);

// ---------------- thumbnails (the studied channel's format: one face, one prop, one or two words, heavy rounded caps) ----------------
function thumbText(g, s, x, y, size) {
  g.save(); g.font = `700 ${size}px Fredoka`; g.textAlign = 'center'; g.lineJoin = 'round';
  g.shadowColor = 'rgba(0,0,0,0.85)'; g.shadowBlur = size * 0.22; g.shadowOffsetY = size * 0.04;
  g.lineWidth = size * 0.16; g.strokeStyle = '#0b0a10'; g.strokeText(s, x, y);
  g.shadowColor = 'transparent'; g.fillStyle = '#ffffff'; g.fillText(s, x, y); g.restore();
}
Object.assign(FILM, {
  thumb_a: { dur: 1, async build({ E, W, H }) {
    const A = wallPlate(E, 'grey');
    return {
      update() {
        const P = new FG.Painter();
        FG.pile(P, [1180, 1186], 213, { scale: 1.6 });
        const base = [1330, 1330];
        FG.girl(P, base, { scale: 2.5, face: 0, mood: 'determined', wind: 0.6, t: 0.3, hand: [base[0] + 70, base[1] - 330], backHand: [base[0] - 40, base[1] - 120] });
        FG.plane(P, [base[0] + 86, base[1] - 352], -0.5, { scale: 2.6, bank: 0.8, seed: 7214 });
        const cam = camIn({ x: 1290, y: 1010, z: 1.85 }, 2400, 1500, W, H);
        P.flush(E, E.layer, cam);
        return { A, cam, grey: 1, expo: 0.82, vig: 0.85, light: [-0.8, 0.4, 0.42], rake: 0.9 };
      },
      overlay(g, W, H) { thumbText(g, 'ATTEMPT 214.', W / 2, H * 0.19, H * 0.15); },
    };
  } },
  thumb_b: { dur: 1, async build({ E, W, H }) {
    const A = wallPlate(E, 'rain');
    return {
      update() {
        const P = new FG.Painter();
        FG.pile(P, PILE, 212, { scale: 1.2 });
        const base = [PILE[0] + 40, PILE[1] - 120];
        FG.girl(P, base, { scale: 1.5, face: 0, sit: true, mood: 'sad', wind: 0.3, lean: 0.25, t: 0.4, hand: [base[0] + 30, base[1] - 34], backHand: [base[0] - 20, base[1] - 34] });
        FG.plane(P, [base[0] + 6, base[1] - 44], 0.1, { scale: 1.0, bank: 0.4, seed: 7214 });
        FG.rain(P, 0.37, [0, 0, 2400, 1500], 300);
        const cam = camIn({ x: base[0] + 10, y: base[1] - 170, z: 2.5 }, 2400, 1500, W, H);
        P.flush(E, E.layer, cam);
        return { A, cam, grey: 1, expo: 0.78, vig: 0.9, spec: 0.3 };
      },
      overlay(g, W, H) { thumbText(g, 'ONE MORE.', W / 2, H * 0.19, H * 0.16); },
    };
  } },
  thumb_c: { dur: 1, async build({ E, W, H }) {
    const A = sectionPlate(E);
    return {
      update() {
        const P = new FG.Painter();
        FG.pile(P, HER_PILE, 213, { scale: 1.2 }); FG.pile(P, HIS_PILE, 301, { scale: 1.25, blue: true, seed: 9500 });
        const topH = [HER_PILE[0], HER_PILE[1] - Math.sqrt(213) * 7.5 * 1.2 + 6], topB = [HIS_PILE[0] + 10, HIS_PILE[1] - Math.sqrt(301) * 7.5 * 1.25 + 6];
        const p1 = [[topH[0] + 40, topH[1] - 230], [1500, 420], [1800, 380], [topB[0] - 60, topB[1] - 250]], p2 = [[topB[0] - 60, topB[1] - 250], [1840, 480], [1560, 500], [topH[0] + 40, topH[1] - 230]];
        FG.trail(P, (x) => bez(p1, x), 0, 0.62, { n: 40, wid: 9 }); FG.trail(P, (x) => bez(p2, x), 0, 0.38, { n: 30, blue: true, wid: 9 });
        let q = bez(p1, 0.62), q2 = bez(p1, 0.63); FG.plane(P, q, Math.atan2(q2[1] - q[1], q2[0] - q[0]), { scale: 1.3, bank: 0.7, seed: 7214 });
        q = bez(p2, 0.38); q2 = bez(p2, 0.39); FG.plane(P, q, Math.atan2(q2[1] - q[1], q2[0] - q[0]), { scale: 1.3, bank: 0.7, blue: true, seed: 7700 });
        FG.girl(P, topH, { scale: 1.5, face: 1, mood: 'happy', wind: 0.5, t: 0.2, hand: [topH[0] + 50, topH[1] - 210] });
        FG.boy(P, topB, { scale: 1.5, face: -1, mood: 'happy', wind: 0.4, t: 0.2, hand: [topB[0] - 50, topB[1] - 210] });
        const cam = camIn({ x: 1670, y: 1060, z: 1.2 }, 3600, 2000, W, H);
        P.flush(E, E.layer, cam);
        return { A, cam, grey: 1, revC: [1665, 610], revR: 99999, light: [-0.6, 0.4, 0.34], rake: 1.0, lightCol: [1.12, 1.03, 0.87], sat: 1.12, vig: 0.6 };
      },
      overlay(g, W, H) { thumbText(g, "DON'T STOP.", W / 2, H * 0.19, H * 0.16); },
    };
  } },
});
