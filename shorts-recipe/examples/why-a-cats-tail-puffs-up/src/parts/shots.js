// =====================================================================
// SHOTS: "When a cat's tail puffs up like a bottle brush ... give it some space, because" (loops)
// =====================================================================
const END = C.end;
const THREAT = V(170, 16, 70);
const scaredPose = (k = 1, t = 0) => ({ pos: V(0, 0, 0), yaw: 0, arch: k, height: 1.2 * k, puff: { tail: k, back: 0.85 * k }, tail: { up: lerp(0.1, 1.05, k), curl: -0.25 * k, tip: 0.3 * k, sway: 0.04 * k, phase: t * 7 }, look: THREAT, lookK: 0.8, pupil: lerp(0.25, 0.95, k) });
// the hero framing: the frame the video opens on and the last shot lands on (u = 0 at the loop point)
function heroCam(s, u) { const a = 0.62 + 0.012 * u, R = 196 + 3 * u; const pos = V(Math.sin(a) * R, 27 + 0.15 * u, Math.cos(a) * R), tg = V(-3, 21, 0); shoot(s.cam, pos, tg, { fov: 32, t: u + 300, hand: 0.35, focus: pos.distanceTo(V(0, 21, 0)) }); }
const label = (s, txt, col = '#ffffff', size = 100) => { const l = liveLabel(0.9, 0.2); OV(s, l); l.userData.set([[txt, size, 0.5, col, 900, 3]]); return l; };

// 1) When a cat's tail puffs up like a bottle brush, — side-on, arched, the tail a bottle brush
shot(0, C.its, (s) => { homeSet(s); s.ap = 6; s.maxR = 14; s.exposure = 1.0; s.bloom = 0.32;
  s.update = (t) => { use(s, CAT); poseCat(CAT, scaredPose(1, t)); heroCam(s, t); }; });
// 2) it's the same thing that gives you goosebumps. — the skin of your arm rises into bumps and every hair lifts
shot(C.its, C.every, (s) => { armSet(s); s.ap = 9; s.maxR = 16; s.exposure = 1.05; s.bloom = 0.3;
  s.update = (t) => { const k = smooth(C.goosebumps - 0.7, C.goosebumps + 0.5, t); s.arm.userData.setGoose(k); s.arm.userData.setLift(k);
    const m = E.io(seg(t, C.its, C.every)); const pos = lv(V(-11, 6.2, 11), V(-8, 5.2, 9), m), tg = V(2, 2.9, 0); shoot(s.cam, pos, tg, { fov: 30, t, hand: 0.25 }); }; });
// 3) Every hair grows from a tiny pit with its own tiny muscle. — inside the skin: the follicle, then the muscle
shot(C.every, C.when2, (s) => { const M = microSet(s); s.ap = 8; s.maxR = 14; s.exposure = 1.0; s.bloom = 0.35;
  const l1 = label(s, 'FOLLICLE', '#ffd8e0', 96), l2 = label(s, 'TINY MUSCLE', '#ff8c9a', 96);
  s.update = (t) => { M.update(t, 0, smooth(C.muscle - 0.2, C.muscle + 0.3, t) * 0.8, 0);
    const k = E.io(seg(t, C.every, C.when2)); const f = M.fols[7].piv.position; const pos = lv(V(f.x - 6, 9, 22), V(f.x + 2, -1, 15), k), tg = lv(V(f.x, 1, 0), V(f.x + 1.5, -2.6, 0), k);
    shoot(s.cam, pos, tg, { fov: 32, t, hand: 0.25 }); pinF(s.cam, l1, 0, 0.36, 3, spring(t, C.pit - 0.1, 2, 6) * (1 - smooth(C.muscle - 0.4, C.muscle - 0.2, t)) * 0.8); pinF(s.cam, l2, 0, 0.36, 3, spring(t, C.muscle - 0.1, 2, 6) * 0.8); }; });
// 4) When the cat gets scared, — calm, then the pupils go wide and it flinches
shot(C.when2, C.adrenaline, (s) => { homeSet(s); s.ap = 9; s.maxR = 16; s.exposure = 1.0; s.bloom = 0.3;
  s.update = (t) => { use(s, CAT); const k = smooth(C.scared - 0.05, C.scared + 0.25, t), j = wob(t, C.scared, 5, 7);
    poseCat(CAT, { pos: V(0, 0, 0), yaw: 0, look: lv(V(60, 26, 70), THREAT, k).add(V(0, 0, 0)), lookK: 0.9, pupil: lerp(0.22, 0.97, k), pitch: -0.05 * j, height: -1.2 * k, tail: { up: 0.2 - 0.3 * k, sway: 0.2 * (1 - k), phase: t * 2 }, puff: { tail: 0.25 * k, back: 0.15 * k } });
    const pos = V(68 - 3 * k, 28, 40 + 2 * k), tg = V(28, 25.5, 2); shoot(s.cam, pos, tg, { fov: 24, t, hand: 0.3 + 1.2 * Math.abs(j) }); }; });
// 5) adrenaline hits, and thousands of those muscles squeeze at once. — adrenaline floods in; every muscle pulls; the hairs stand
shot(C.adrenaline, C.the3, (s) => { const M = microSet(s); s.ap = 5; s.maxR = 12; s.exposure = 1.0; s.bloom = 0.5;
  const l1 = label(s, 'ADRENALINE', '#e4ff7a', 100);
  s.update = (t) => { const flow = smooth(C.adrenaline - 0.1, C.thousands + 0.6, t), sq = smooth(C.squeeze - 0.2, C.once + 0.2, t);
    M.update(t, sq, 0.4 * flow + 0.8 * sq, flow);
    const k = E.io(seg(t, C.adrenaline, C.the3)); const pos = lv(V(-4, 2, 30), V(-2, 9, 62), k), tg = lv(V(-2, -5, 0), V(0, -1, -2), k); shoot(s.cam, pos, tg, { fov: 34, t, hand: 0.25 });
    pinF(s.cam, l1, 0, 0.36, 3, spring(t, C.adrenaline, 2, 6) * 0.85); }; });
// 6) The hairs stand straight up, and the tail can look twice as thick. — the tail fluffs out into a bottle brush
shot(C.the3, C.then, (s) => { homeSet(s); s.ap = 8; s.maxR = 15; s.exposure = 1.0; s.bloom = 0.32;
  const l1 = label(s, '2× THICKER', '#ffffff', 110);
  s.update = (t) => { use(s, CAT); const k = smooth(C.stand - 0.1, C.up2 + 0.3, t); const P = scaredPose(0.6, t); P.puff = { tail: k, back: 0.4 * k }; P.tail = { up: 0.95, curl: -0.2, tip: 0.25, sway: 0.03, phase: t * 7 }; poseCat(CAT, P);
    const a = -0.75 + 0.3 * seg(t, C.the3, C.then); const c = wpos(CAT.tail[2]).add(V(0, 4, 0)); const pos = c.clone().add(V(Math.sin(a) * 70, 2, Math.cos(a) * 70)); shoot(s.cam, pos, c, { fov: 30, t, hand: 0.3 });
    pinF(s.cam, l1, 0, 0.38, 3, spring(t, C.twice - 0.1, 2, 6) * 0.85); }; });
// 7) Then the cat arches its back and turns sideways, — it turns side-on and arches up
shot(C.then, C.so, (s) => { homeSet(s); s.ap = 6; s.maxR = 14; s.exposure = 1.0; s.bloom = 0.32;
  const turn = (q) => { const a = Math.min(q / 22, 1); return { pos: V(10 * Math.sin(a * Math.PI / 2) - 10, 0, 6 * (1 - a)), yaw: lerp(-Math.PI / 2, 0, a) }; };
  s.update = (t) => { use(s, CAT); const ka = smooth(C.arches - 0.1, C.back + 0.3, t), sd = 22 * smooth(C.turns - 0.15, C.sideways + 0.35, t), st = smooth(C.sideways + 0.2, C.sideways + 0.5, t);
    poseCat(CAT, { walk: { s: sd, at: turn, stride: 28, settle: st }, arch: ka, height: 1.2 * ka, puff: { tail: 1, back: 0.85 * ka }, tail: { up: 1.05, curl: -0.25, tip: 0.3, sway: 0.04, phase: t * 7 }, look: THREAT, lookK: 0.8, pupil: 0.95 });
    const pos = V(40, 26, 175), tg = V(0, 21, 0); shoot(s.cam, pos, tg, { fov: 32, t, hand: 0.35 }); }; });
// 8) so whatever scared it sees the biggest cat possible. — from where the threat stands: a cat as big as it can make itself
shot(C.so, C.your, (s) => { homeSet(s); s.ap = 7; s.maxR = 14; s.exposure = 1.0; s.bloom = 0.32;
  const l1 = label(s, 'AS BIG AS POSSIBLE', '#ffffff', 92);
  s.update = (t) => { use(s, CAT); const P = scaredPose(1, t); P.look = s.cam.position.clone(); P.lookK = 0.9; P.height = 1.2 + 0.4 * Math.sin(t * 3); poseCat(CAT, P);
    const k = E.io(seg(t, C.so, C.your)); const pos = lv(V(150, 7, 130), V(128, 7, 112), k), tg = V(4, 25, 0); shoot(s.cam, pos, tg, { fov: 34, t, hand: 0.4 });
    pinF(s.cam, l1, 0, 0.38, 3, spring(t, C.biggest - 0.1, 2, 6) * 0.85); }; });
// 9) Your goosebumps are left over from when our ancestors had fur. — your arm again: the same reflex, with almost no fur left
shot(C.your, C.so2, (s) => { armSet(s); s.ap = 7; s.maxR = 15; s.exposure = 1.05; s.bloom = 0.3;
  const l1 = label(s, 'A LEFTOVER REFLEX', '#ffffff', 96);
  s.update = (t) => { const k = smooth(C.your - 0.1, C.goosebumps2 + 0.5, t); s.arm.userData.setGoose(k); s.arm.userData.setLift(k);
    const m = E.io(seg(t, C.your, C.so2)); const pos = lv(V(-9, 5.6, 9.5), V(-16, 12, 21), m), tg = lv(V(2, 2.9, 0), V(0, 2.2, 0), m); shoot(s.cam, pos, tg, { fov: 30, t, hand: 0.25 });
    pinF(s.cam, l1, 0, 0.38, 3, spring(t, C.left - 0.1, 2, 6) * 0.85); }; });
// 10) So if your cat's tail ever puffs up, give it some space, because — it puffs up again, and we back off (the loop)
shot(C.so2, END + 1, (s) => { homeSet(s); s.ap = 6; s.maxR = 14; s.exposure = 1.0; s.bloom = 0.32;
  s.update = (t) => { use(s, CAT); const k = smooth(C.puffs2 - 0.25, C.up3 + 0.55, t); const P = scaredPose(k, t);
    if (k < 0.5) { P.look = lv(V(120, 22, 160), THREAT, smooth(C.puffs2 - 0.6, C.puffs2, t)); }
    poseCat(CAT, P); heroCam(s, t - END); }; });

const TR = { 1: [C.its - 0.12, C.its + 0.12, 4], 2: [C.every - 0.15, C.every + 0.15, 3], 4: [C.adrenaline - 0.15, C.adrenaline + 0.15, 2], 8: [C.your - 0.12, C.your + 0.12, 4] };
