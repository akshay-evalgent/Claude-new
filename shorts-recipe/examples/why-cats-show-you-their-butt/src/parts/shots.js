// =====================================================================
// SHOTS: "When your cat sticks its butt in your face, it's being polite ... don't take it personally, because" (loops)
// =====================================================================
const END = C.end;
const use = (s, ...cats) => cats.forEach(c => s.scene.add(c.root));
// on the sofa beside you: the cat stands on the seat with its back to you, tail up, looking back over its shoulder
const SEATP = V(-12, 0, -36);
const POVCAM = (s, u, opts = {}) => { const pos = V(84 - 1.2 * u, s.seat + 54 + 0.3 * u, -14 + 0.3 * u), tg = V(-10, s.seat + 21, -36); shoot(s.cam, pos, tg, { fov: 38, t: u + 200, hand: 0.4, ...opts }); return pos; };
function presentPose(s, t, camPos, k = 1) {
  return { pos: SEATP.clone(), yaw: Math.PI, ground: () => s.seat, look: camPos, lookK: 0.85 * k, tail: { up: 1.35 * k - 0.2 * (1 - k), tip: 0.55, sway: 0.06, phase: t * 5 }, pupil: 0.3 };
}
// 1) When your cat sticks its butt in your face, it's being polite. — the opening frame (and the loop frame)
shot(0, C.a, (s) => { loungeSet(s); s.ap = 7; s.maxR = 16; s.exposure = 1.0; s.bloom = 0.32;
  s.update = (t) => { use(s, GINGER); const cp = POVCAM(s, t); poseCat(GINGER, presentPose(s, t, cp)); }; });
// 2) A tail straight up means hello. — across the rug, tail high, tip curled like a question mark
shot(C.a, C.when2, (s) => { loungeSet(s); s.ap = 6; s.maxR = 14; s.exposure = 1.0; s.bloom = 0.32;
  const lab = liveLabel(0.9, 0.2); OV(s, lab); lab.userData.set([['TAIL UP = HELLO', 104, 0.5, '#ffffff', 900, 3]]);
  const path = (sd) => ({ pos: V(70 - sd, 0, 70), yaw: Math.PI });
  s.update = (t) => { use(s, GINGER); const sd = 34 * (t - C.a + 0.6);
    poseCat(GINGER, { walk: { s: sd, at: path, stride: 36 }, ground: () => s.rugY, tail: { up: 1.3, tip: 0.6, sway: 0.08, phase: t * 3 }, look: V(-60, 25, 200), lookK: 0.4 });
    const x = 70 - sd; const pos = V(x - 30, 22, 205), tg = V(x - 4, 24, 70); shoot(s.cam, pos, tg, { fov: 34, t, hand: 0.4, focus: pos.distanceTo(V(x, 24, 70)) });
    pinF(s.cam, lab, 0, 0.36, 3, spring(t, C.up - 0.1, 2, 6) * 0.85); }; });
// 3) When two friendly cats meet, they touch noses, — they walk up to each other and stop nose to nose
shot(C.when2, C.then, (s) => { loungeSet(s); s.ap = 6; s.maxR = 14; s.exposure = 1.0; s.bloom = 0.32;
  const stop = C.touch - 0.1, v = 30;
  s.update = (t) => { use(s, GINGER, SILVER); const sd = Math.min(v * (t - C.when2) + 0, v * (stop - C.when2)), st = smooth(stop - 0.15, stop + 0.25, t), dRem = v * (stop - C.when2) - sd;
    poseCat(GINGER, { walk: { s: sd, at: (q) => ({ pos: V(-29 - (v * (stop - C.when2) - q), 0, 70), yaw: 0 }), stride: 36, settle: st }, ground: () => s.rugY, tail: { up: 1.2, tip: 0.5, sway: 0.1, phase: t * 3 }, look: catNose(SILVER), lookK: 0.8 });
    poseCat(SILVER, { walk: { s: sd, at: (q) => ({ pos: V(29 + (v * (stop - C.when2) - q), 0, 70), yaw: Math.PI }), stride: 36, settle: st }, ground: () => s.rugY, tail: { up: 1.1, tip: 0.7, sway: 0.1, phase: t * 3 + 1 }, look: catNose(GINGER), lookK: 0.8 });
    const k = E.io(seg(t, C.when2, C.then)); const pos = lv(V(10, 22, 220), V(4, 26, 125), k), tg = V(0, 22, 70); shoot(s.cam, pos, tg, { fov: 32, t, hand: 0.4 }); }; });
// 4) then circle around and sniff each other's rear. — from above: two cats chasing each other's tails
shot(C.then, C.glands, (s) => { loungeSet(s); s.ap = 4; s.maxR = 10; s.exposure = 1.0; s.bloom = 0.3;
  const R = 21, cen = V(0, 0, 70);
  const circ = (ph) => (q) => { const a = ph + q / R; return { pos: V(cen.x + Math.cos(a) * R, 0, cen.z - Math.sin(a) * R), yaw: a + Math.PI / 2 }; };
  s.update = (t) => { use(s, GINGER, SILVER); const sd = 22 * (t - C.then);
    poseCat(GINGER, { walk: { s: sd, at: circ(0), stride: 30 }, ground: () => s.rugY, tail: { up: 1.2, tip: 0.5, sway: 0.1, phase: t * 3 }, look: tailBase(SILVER), lookK: 0.7 });
    poseCat(SILVER, { walk: { s: sd, at: circ(Math.PI), stride: 30 }, ground: () => s.rugY, tail: { up: 1.1, tip: 0.7, sway: 0.1, phase: t * 3 + 1 }, look: tailBase(GINGER), lookK: 0.7 });
    const a = 0.3 * (t - C.then); const pos = V(cen.x + Math.sin(a) * 40, 205, cen.z + 70 + Math.cos(a) * 30), tg = V(cen.x, 6, cen.z); shoot(s.cam, pos, tg, { fov: 34, t, hand: 0.3 }); }; });
// 5) Glands back there give off a scent that works like an ID card, unique to each cat. — scent rises and becomes a card
shot(C.glands, C.lifting, (s) => { loungeSet(s); s.ap = 7; s.maxR = 15; s.exposure = 1.0; s.bloom = 0.45;
  const card1 = idCard('GINGER', 3), card2 = idCard('SILVER', 11, '#9fd2ff'); s.scene.add(card1, card2);
  const motes = glowMotes(220, 0x9fffd0, 1.1); s.scene.add(motes);
  const lab = liveLabel(0.9, 0.2); OV(s, lab); lab.userData.set([['UNIQUE TO EACH CAT', 92, 0.5, '#ffffff', 900, 3]]);
  s.update = (t) => { use(s, GINGER); poseCat(GINGER, { pos: V(0, 0, 70), yaw: 0.35, ground: () => s.rugY, tail: { up: 1.35, tip: 0.5, sway: 0.08, phase: t * 3 }, look: V(120, 20, 120), lookK: 0.5 });
    s.cam.updateMatrixWorld(true); const tb = tailBase(GINGER).add(V(0, -2.5, 0)), cardP = s.cam.localToWorld(V(0, 9.5, -80)), cardQ = s.cam.localToWorld(V(0, -5, -80)), kc = smooth(C.works - 0.2, C.id + 0.3, t);
    card1.position.copy(lv(tb, cardP, E.out(kc))); card1.scale.setScalar(0.2 + 0.75 * E.out(kc)); card1.material.opacity = 0.95 * kc; card1.quaternion.copy(s.cam.quaternion);
    const k2 = smooth(C.unique - 0.1, C.unique + 0.4, t); card2.position.copy(lv(cardQ.clone().add(V(0, -12, 0)), cardQ, E.out(k2))); card2.scale.setScalar(0.3 + 0.65 * E.out(k2)); card2.material.opacity = 0.95 * k2; card2.quaternion.copy(s.cam.quaternion);
    const pa = motes.userData.pa; motes.userData.seeds.forEach(([a, b, c], i) => { const u = (t * 0.45 + a) % 1; const p = lv(tb, cardP, u * kc * 0.9).add(V((b - 0.5) * 6 * (1 - u) + Math.sin(t * 2 + i) * 1.5, u * 10 * (1 - kc), (c - 0.5) * 6)); pa[i * 3] = p.x; pa[i * 3 + 1] = p.y; pa[i * 3 + 2] = p.z; });
    motes.geometry.attributes.position.needsUpdate = true; motes.material.opacity = 0.85 * smooth(C.glands + 0.3, C.scent, t) * (1 - 0.5 * k2);
    const k = E.io(seg(t, C.glands, C.lifting)); const pos = lv(V(-72, 30, 178), V(-56, 33, 164), k), tg = V(-14, 28, 72);
    shoot(s.cam, pos, tg, { fov: 36, t, hand: 0.35, focus: lerp(pos.distanceTo(tb), 80, kc) }); pinF(s.cam, lab, 0, -0.42, 3, spring(t, C.unique, 2, 6) * 0.8); }; });
// 6) Lifting the tail is holding out the ID. — the tail goes up and the card comes forward
shot(C.lifting, C.kittens, (s) => { loungeSet(s); s.ap = 7; s.maxR = 15; s.exposure = 1.0; s.bloom = 0.45;
  const card = idCard('GINGER', 3); s.scene.add(card);
  s.update = (t) => { use(s, GINGER); const ku = smooth(C.lifting, C.tail2 + 0.3, t);
    poseCat(GINGER, { pos: V(0, 0, 70), yaw: 0, ground: () => s.rugY, tail: { up: lerp(-0.3, 1.35, E.out(ku)), tip: 0.5 * ku, sway: 0.06, phase: t * 3 }, look: s.cam.position, lookK: 0.6 * smooth(C.holding, C.out, t) });
    const k = E.io(seg(t, C.lifting, C.kittens)); const pos = lv(V(-95, 24, 150), V(-80, 26, 130), k), tg = V(-12, 26, 72);
    const kc = smooth(C.holding - 0.1, C.out + 0.2, t), tb = tailBase(GINGER); shoot(s.cam, pos, tg, { fov: 34, t, hand: 0.35, focus: lerp(pos.distanceTo(tg), 70, kc) }); s.cam.updateMatrixWorld(true);
    card.position.copy(lv(tb.clone().add(V(0, 3, 0)), s.cam.localToWorld(V(0, 6, -70)), E.back(kc))); card.scale.setScalar(0.15 + 0.7 * kc); card.material.opacity = 0.95 * kc; card.quaternion.copy(s.cam.quaternion); }; });
// 7) Kittens do it for their mother, too. — two kittens trot up to their mother, tails high
shot(C.kittens, C.when3, (s) => { loungeSet(s); s.ap = 6; s.maxR = 14; s.exposure = 1.0; s.bloom = 0.32;
  s.update = (t) => { use(s, GINGER, KIT1, KIT2); const sd = 26 * Math.min(t - C.kittens + 0.4, 1.6), st = smooth(C.kittens + 1.0, C.kittens + 1.4, t);
    poseCat(GINGER, { pos: V(-30, 0, 70), yaw: 0, ground: () => s.rugY, look: wpos(KIT1.head), lookK: 0.7, tail: { up: 0.5, tip: 0.4, sway: 0.15, phase: t * 2 } });
    poseCat(KIT1, { walk: { s: sd, at: (q) => ({ pos: V(52 - q, 0, 84), yaw: Math.PI }), stride: 18, settle: st }, ground: () => s.rugY, tail: { up: 1.35, tip: 0.3, sway: 0.1, phase: t * 4 }, look: wpos(GINGER.head), lookK: 0.8 });
    poseCat(KIT2, { walk: { s: sd * 0.95, at: (q) => ({ pos: V(60 - q, 0, 58), yaw: Math.PI + 0.1 }), stride: 17, settle: st }, ground: () => s.rugY, tail: { up: 1.35, tip: 0.4, sway: 0.1, phase: t * 4 + 1 }, look: wpos(GINGER.head), lookK: 0.8 });
    const k = E.io(seg(t, C.kittens, C.when3)); const pos = lv(V(34, 20, 270), V(26, 21, 230), k), tg = V(10, 14, 72); shoot(s.cam, pos, tg, { fov: 32, t, hand: 0.4 }); }; });
// 8) When your cat turns around and shows you its butt, it's greeting you like family. — on the sofa, it turns its back to you
shot(C.when3, C.youre, (s) => { loungeSet(s); s.ap = 7; s.maxR = 16; s.exposure = 1.0; s.bloom = 0.32;
  const lab = liveLabel(0.9, 0.2); OV(s, lab); lab.userData.set([['LIKE FAMILY', 110, 0.5, '#ffd27a', 900, 3]]);
  // turning on the spot: a tight arc that ends facing away from you
  const turn = (q) => { const a = Math.min(q / 26, 1) * Math.PI; return { pos: V(SEATP.x + 4 * Math.sin(a), 0, SEATP.z + 4 * (1 - Math.cos(a)) - 4), yaw: a }; };
  s.update = (t) => { use(s, GINGER); const cp = POVCAM(s, t - C.when3 - 6); const sd = 26 * smooth(C.turns - 0.1, C.shows, t), st = smooth(C.shows - 0.1, C.shows + 0.3, t);
    const kp = smooth(C.shows - 0.2, C.butt2, t);
    poseCat(GINGER, { walk: { s: sd, at: turn, stride: 30, settle: st }, ground: () => s.seat, look: cp, lookK: 0.85, tail: { up: lerp(0.4, 1.35, kp), tip: 0.55, sway: 0.08, phase: t * 5 } });
    pinF(s.cam, lab, 0, 0.36, 3, spring(t, C.family, 2, 6) * 0.85); }; });
// 9) You're just not expected to sniff back. — you lean away
shot(C.youre, C.so, (s) => { loungeSet(s); s.ap = 7; s.maxR = 16; s.exposure = 1.0; s.bloom = 0.32;
  s.update = (t) => { use(s, GINGER); const kb = E.out(smooth(C.expected - 0.1, C.expected + 0.35, t)), u = t - C.youre - 6;
    const cp = POVCAM(s, u); s.cam.position.add(V(24 * kb, 12 * kb, 4 * kb)); s.cam.lookAt(V(-10, s.seat + 19, -36)); s.cam.rotateZ(-0.08 * kb); s.cam.userData.focus = s.cam.position.distanceTo(V(-10, s.seat + 19, -36));
    poseCat(GINGER, presentPose(s, t, s.cam.position)); }; });
// 10) So next time it happens, don't take it personally, because — back to the opening frame (the loop)
shot(C.so, END + 1, (s) => { loungeSet(s); s.ap = 7; s.maxR = 16; s.exposure = 1.0; s.bloom = 0.32;
  s.update = (t) => { use(s, GINGER); const cp = POVCAM(s, t - END); poseCat(GINGER, presentPose(s, t, cp)); }; });

const TR = { 2: [C.when2 - 0.14, C.when2 + 0.14, 4], 4: [C.glands - 0.15, C.glands + 0.15, 2], 6: [C.kittens - 0.12, C.kittens + 0.12, 4] };
