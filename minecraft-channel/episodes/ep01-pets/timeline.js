// EP01 — "5 Pets Compete to Get Adopted" (Would You Rather: Pets Edition)
// Source of truth for the animatic. Shot-relative seconds inside each shot.
// See script.md for the beat sheet and shotlist.md (generated) for the shot list.

export const meta = {
  title: '5 Pets Compete to Get Adopted',
  fps: 30, width: 1920, height: 1080,
  accent: '#ff5a7a',
  watermark: 'YOUR LOGO',
  board: [['rex', 'REX', '#ff6b5a'], ['duchess', 'DUCHESS', '#f4c430'], ['pico', 'PICO', '#5b8cff'], ['lou', 'LOU', '#f48fb8'], ['greg', 'GREG', '#d0d0d0']],
};

const PI = Math.PI;
const POD = { rex: -6, duchess: -3, pico: 0, lou: 3, greg: 6 };
const PETS = ['rex', 'duchess', 'pico', 'lou', 'greg'];
const AVA_MARK = [0, 0, 4.5];

export default function build(E, { CAM }) {
  // ---------- camera presets ----------
  // approximate head heights of each pet when on its podium
  const HEAD = { rex: 2.1, duchess: 2.05, pico: 2.45, lou: 1.85, greg: 2.55 };
  const podClose = (who) => CAM.still([POD[who] + 0.2, HEAD[who] + (who === 'lou' ? 0.4 : 0.12), 3.2], [POD[who], HEAD[who] - 0.18, 0], 32);
  const podMed = (who) => CAM.still([POD[who] + 0.55, HEAD[who] + (who === 'lou' ? 0.5 : 0.25), 4.4], [POD[who], HEAD[who] - 0.4, 0], 34);
  const avaClose = (o = {}) => CAM.still([o.x ?? 0.35, o.y ?? 1.55, o.z ?? 2.55], [0, o.ly ?? 1.45, 4.5], o.fov ?? 32);
  const wideStage = CAM.dolly([0, 3.4, 13.5], [0, 2.1, -1], [0, 3.1, 12.2], [0, 2.0, -1], 42, 42);
  const rowFront = (fov = 52) => CAM.still([0, 2.0, 7.8], [0, 1.85, 0], fov);

  const resetStage = (s, at = 0) => {
    for (const p of PETS) {
      s.place(p, [POD[p], 1, 0], 0, at);
      s.pose(p, p === 'lou' ? 'asleep' : p === 'pico' || p === 'greg' ? 'stand' : 'sit', at, 0.01);
    }
  };
  const chew = (who, t, dur) => { for (let k = 0; k < dur / 0.22; k++) E.later(t + k * 0.22, () => E.actor(who).talk.push({ t0: t + k * 0.22, t1: t + k * 0.22 + 0.16 })); };

  // ---------- t = 0 setup ----------
  for (const p of PETS) { E.place(p, [POD[p], 1, 0], 0, 0); E.pose(p, p === 'lou' ? 'asleep' : p === 'pico' || p === 'greg' ? 'stand' : 'sit', 0, 0.01); }
  E.expr('lou', 'sleep', 0, true);
  E.state('lou', 'zzz', true, 0);
  E.state('greg', 'hide', ['coat', 'mask', 'flopL', 'flopR'], 0);
  E.place('ava', AVA_MARK, PI, 0);
  E.pose('ava', 'holdSign', 0, 0.01);
  E.place('sign', [0, 1.95, 4.42], PI, 0);
  E.state('sign', 'text', 'one', 0);
  E.place('scoreboard', [0, 0, -6.5], 0, 0);
  for (const p of PETS) E.place('bowl_' + p, [POD[p] + 0.52, 1, 0.55], 0, 0);
  E.place('pot', [-2.5, 1, -0.55], 0, 0);
  E.place('cookie', [15.4, 1.4, -1.6], 0, 0);
  E.vis('stick', false, 0); E.place('stick', [0, -5, 0], 0, 0);
  E.vis('card', false, 0); E.place('card', [0, -5, 0], 0, 0);
  E.place('pillarAva', [20, 0, 0], 0, 0);
  E.place('fenceMid', [0, 0, 0], 0, 0);
  E.g.scores.push({ t: 0, v: { rex: 0, duchess: 0, pico: 0, lou: 0, greg: 0 } });

  // ======================= COLD OPEN =======================
  E.shot('S01', 2.6, CAM.dolly([1.2, 0.8, 7.6], [0, 1.95, 0], [1.0, 0.85, 7.0], [0, 1.95, 0], 44, 44), 'Cold open. Low angle over Ava\'s shoulder: she holds up an ADOPT 1 sign to five pets on podiums.', (s) => {
    s.say('ava', 'I can only adopt *ONE* of you.', 0.25);
    for (const p of PETS) if (p !== 'lou') s.expr(p, 'hopeful', 0, true);
  });
  E.shot('S02', 2.6, rowFront(50), 'Punch-in on the row: four pets shocked, Lou still asleep.', (s) => {
    s.place('ava', [0, 0, 9.2], PI, 0); s.place('sign', [0, 1.95, 9.12], PI, 0);
    s.sfx('sting', 0.12, 0.9);
    s.punch(0.12, 1.2);
    ['rex', 'duchess', 'pico', 'greg'].forEach((p, i) => s.expr(p, i === 3 ? 'blank' : 'shocked', 0.12 + i * 0.04, i > 0));
    s.state('rex', 'shiver', true, 0.2); s.state('rex', 'shiver', false, 0.6);
    s.say('rex', '...*ONE?!*', 0.75);
  });

  // ======================= SETUP =======================
  E.shot('S03', 3.6, wideStage, 'Wide of the game-show stage. Ava lowers the sign and opens the show.', (s) => {
    s.place('ava', AVA_MARK, PI, 0); s.place('sign', [0, 1.95, 4.42], PI, 0);
    s.music('day', 0);
    s.pose('ava', 'cheer', 0.35);
    s.move('sign', [1.4, 0.36, 5.1], 0.2, 0.35, { face: false });
    s.say('ava', 'Welcome to *Would* *You* *Rather:* Pets Edition!', 0.4, { chunk: 3 });
    s.sfx('fanfare', 0.35, 0.6);
    for (const p of PETS) if (p !== 'lou') s.expr(p, 'neutral', 0.2, true);
  });
  E.shot('S04', 2.6, podMed('rex'), 'Rex intro: tail going, name tag.', (s) => {
    s.pose('ava', 'stand', 0);
    s.tag('rex', true, 0.1); s.expr('rex', 'happy', 0.1); s.state('rex', 'wag', true, 0.1);
    s.hop('rex', 0.2, 0.35); s.sfx('bark', 0.12, 0.8);
    s.say('rex', 'Rex! I love you *already!*', 0.55);
    s.tag('rex', false, 2.6);
  });
  E.shot('S05', 3.2, podMed('duchess'), 'Duchess intro: crown, smug.', (s) => {
    s.tag('duchess', true, 0.1); s.expr('duchess', 'smug', 0.15);
    s.sfx('meow', 0.05, 0.5);
    s.say('duchess', 'Duchess. I *accept* your application.', 0.5);
    s.tag('duchess', false, 3.2);
  });
  E.shot('S06', 2.3, podMed('pico', { ly: 1.6 }), 'Pico intro: squawks his own name.', (s) => {
    s.tag('pico', true, 0.1); s.pose('pico', 'squawk', 0.12); s.expr('pico', 'happy', 0.12); s.sfx('squawk', 0.05, 0.6);
    s.say('pico', 'Pico! Pico! *PICO!*', 0.45);
    s.pose('pico', 'stand', 2.0);
    s.tag('pico', false, 2.3);
  });
  E.shot('S07', 2.6, podClose('lou', { ly: 1.45, y: 1.7 }), 'Lou intro: asleep in a bucket of water.', (s) => {
    s.tag('lou', true, 0.1);
    s.sfx('snore', 0.2, 0.7);
    s.say('ava', 'And... *Lou?*', 1.0, { offscreen: true });
    s.sfx('snore', 1.9, 0.7);
    s.tag('lou', false, 2.6);
  });
  E.shot('S08', 2.8, podMed('greg', { ly: 1.75 }), 'Greg intro: chewing the podium, looks up blankly.', (s) => {
    s.tag('greg', true, 0.1);
    s.pose('greg', 'ram', 0);
    chew('greg', s.t0 + 0.1, 1.2);
    s.sfx('munch', 0.1, 0.7);
    s.pose('greg', 'stand', 1.3);
    s.expr('greg', 'blank', 1.35, true);
    s.say('greg', 'Baaa.', 1.6);
    s.tag('greg', false, 2.8);
  });

  // ======================= ROUND 1 =======================
  E.shot('S09', 3.2, avaClose(), 'Round 1 card. Ava reads the first question.', (s) => {
    s.label('ROUND 1', 0); s.hud(true, 0); s.sfx('ding', 0, 0.7);
    s.vis('card', true, 0); s.attach('card', 'ava', 'handA', [0, -0.08, 0.14], 0, [1.15, 0, 0]);
    s.pose('ava', 'holdCard', 0, 0.01);
    s.say('ava', 'Round one! Would you *share* your food?', 0.25);
  });
  E.shot('S10', 3.6, podMed('rex', { ly: 1.45 }), 'Rex shoves his bowl forward, then stares at it, heartbroken.', (s) => {
    s.expr('rex', 'happy', 0, true);
    s.sfx('bark', 0.0, 0.7);
    s.say('rex', 'YES! Take *ALL* of it!', 0.35);
    s.pose('rex', 'swipe', 0.5); s.move('bowl_rex', [POD.rex + 0.52, 1, 0.8], 0.55, 0.2, { face: false }); s.sfx('pop', 0.6, 0.5);
    s.pose('rex', 'sit', 1.0);
    s.look('rex', [0.35, 0.45], 2.0, 0.3); s.expr('rex', 'teary', 2.1); s.sfx('whimper', 2.3, 0.8);
  });
  E.shot('S11', 3.4, CAM.still([-1.9, 1.95, 3.7], [-2.6, 1.4, 0.5], 38), 'Duchess "shares" by swiping her bowl off the podium.', (s) => {
    s.look('rex', [0, 0], 0, 0.01); s.expr('rex', 'neutral', 0, true);
    s.say('duchess', 'Define... *share.*', 0.15);
    s.pose('duchess', 'swipe', 1.85, 0.12);
    s.move('bowl_duchess', [POD.duchess + 0.95, 1.05, 0.95], 1.95, 0.2, { face: false, ease: 'out' });
    s.move('bowl_duchess', [POD.duchess + 1.4, 0, 1.6], 2.15, 0.35, { face: false, ease: 'in' });
    s.sfx('crash', 2.5, 0.8); s.burst('crumbs', [POD.duchess + 1.4, 0.1, 1.6], 2.5, { n: 16 });
    s.pose('duchess', 'sit', 2.4); s.expr('duchess', 'smug', 2.6, true);
  });
  E.shot('S12', 2.6, podMed('pico', { ly: 1.6 }), 'Pico repeats Rex word for word.', (s) => {
    s.pose('pico', 'squawk', 0.1); s.sfx('squawk', 0.0, 0.5);
    s.say('pico', 'YES! Take *ALL* of it!', 0.3);
    s.pose('pico', 'stand', 1.9);
  });
  E.shot('S13', 1.4, podClose('rex'), 'Rex side-eyes Pico.', (s) => {
    s.look('rex', [0.5, 0], 0.1, 0.15); s.expr('rex', 'side', 0.15);
  });
  E.shot('S14', 2.0, podClose('lou', { ly: 1.45, y: 1.7 }), 'Lou: still asleep.', (s) => {
    s.sfx('snore', 0.3, 0.8);
  });
  E.shot('S15', 3.8, CAM.still([7.9, 1.75, 3.4], [5.6, 1.6, 1.0], 40), 'Ava asks Greg; Greg eats the question card out of her hand.', (s) => {
    s.place('ava', [5.0, 0, 2.15], Math.atan2(6 - 5.0, 0 - 2.15), 0);
    s.look('rex', [0, 0], 0, 0.01); s.expr('rex', 'neutral', 0, true);
    s.say('ava', 'Greg, would you share your—', 0.2);
    s.pose('greg', 'ram', 1.25, 0.15);
    s.attach('card', null, null, null, 1.55);
    s.place('card', [5.55, 1.6, 1.05], 0, 1.55);
    s.vis('card', false, 1.6); s.burst('paper', [5.6, 1.55, 1.0], 1.6, { n: 14 }); s.sfx('munch', 1.55, 1.0);
    chew('greg', s.t0 + 1.6, 1.4);
    s.pose('greg', 'stand', 1.9);
    s.pose('ava', 'stand', 1.7); s.expr('ava', 'blank', 1.8);
    s.expr('greg', 'blank', 1.6, true);
  });
  E.shot('S16', 2.2, CAM.still([3.55, 1.5, 3.55], [5.0, 1.42, 2.15], 34), 'Ava turns to camera, deadpan.', (s) => {
    s.turn('ava', Math.atan2(3.55 - 5.0, 3.55 - 2.15), 0.0, 0.25);
    s.say('ava', '...that was my *card.*', 0.35);
  });
  E.shot('S17', 4.4, wideStage, 'Wide. Ava walks back to her mark and hands out points.', (s) => {
    s.place('ava', [2.4, 0, 3.4], -2.2, 0);
    s.move('ava', AVA_MARK, 0, 0.8);
    s.turn('ava', PI, 0.8, 0.2);
    s.expr('ava', 'neutral', 0.3, true);
    s.say('ava', 'Rex, one point. Pico... also one, I guess.', 1.0);
    s.scores({ rex: 1, duchess: 0, pico: 0, lou: 0, greg: 0 }, 1.55); s.sfx('ding', 1.55, 0.6);
    s.scores({ rex: 1, duchess: 0, pico: 1, lou: 0, greg: 0 }, 3.3); s.sfx('ding', 3.3, 0.6);
    s.scores({ rex: 1, duchess: 0, pico: 1, lou: 0, greg: -1 }, 4.1); s.sfx('buzzer', 4.1, 0.5);
    s.hop('rex', 1.6, 0.3); s.expr('rex', 'happy', 1.6, true); s.sfx('bark', 1.6, 0.5);
    s.hop('pico', 3.35, 0.3);
  });
  E.shot('S18', 4.4, CAM.still([4.8, 3.0, 9.8], [-1.4, 2.6, -4.0], 44), 'Ava turns to the audience. Behind her, Duchess sneaks to the scoreboard and changes her score to 9. Pico sees.', (s) => {
    s.turn('ava', 0, 0, 0.25);
    s.say('ava', 'Okay! Round two, coming up!', 0.3);
    s.move('duchess', [-2.4, 0, -1.4], 0.2, 0.5, { arc: 0.6 });
    s.move('duchess', [-1.3, 0, -5.7], 0.7, 0.75);
    s.hop('duchess', 1.5, 1.9, 0.6);
    s.sfx('scratch', 1.75, 0.8);
    s.scores({ rex: 1, duchess: 9, pico: 1, lou: 0, greg: -1 }, 1.8);
    s.move('duchess', [-2.4, 0, -1.4], 2.15, 0.75);
    s.move('duchess', [POD.duchess, 1, 0], 2.95, 0.45, { arc: 0.7 });
    s.turn('duchess', 0, 3.45, 0.2);
    s.expr('pico', 'shocked', 1.7); s.look('pico', [-0.6, 0], 1.6, 0.2);
  });
  E.shot('S19', 1.6, podClose('duchess'), 'Duchess, back on her podium, innocent.', (s) => {
    s.expr('duchess', 'smug', 0, true);
    s.say('duchess', 'Hm.', 0.4);
    s.look('pico', [0, 0], 1.5, 0.01); s.expr('pico', 'neutral', 1.5, true);
  });

  // ======================= ROUND 2 — the "lava" =======================
  const LINE = { duchess: [14.6, 0, 5.6], rex: [15.8, 0, 5.6], lou: [17.2, 0, 4.4], pico: [18.6, 0, 5.6], greg: [21.6, 0, 5.6] };
  E.shot('S20', 3.6, CAM.dolly([20.5, 4.4, 15], [19.2, 2.1, 0], [20.2, 4.0, 13.5], [19.2, 2.0, 0], 46, 46), 'Whip to the pit. Ava stands on a pillar over "lava"; a cookie sits on a pillar nearby; pets line up.', (s) => {
    s.sfx('whoosh', 0, 0.8);
    s.label('ROUND 2', 0.1); s.sfx('ding', 0.15, 0.6);
    for (const p of PETS) { s.place(p, LINE[p], PI, 0); s.pose(p, p === 'lou' ? 'asleep' : p === 'pico' || p === 'greg' ? 'stand' : 'sit', 0, 0.01); }
    for (const p of PETS) s.vis('bowl_' + p, false, 0);
    s.vis('sign', false, 0);
    s.place('ava', [20, 2.5, 0], 0, 0);
    s.pose('ava', 'wave', 0.2);
    s.state('ava', 'shiver', true, 0.2);
    s.expr('ava', 'shocked', 0.2, true);
    s.say('ava', 'Round two! I\'m in *danger!*', 0.4);
  });
  E.shot('S21', 3.0, CAM.still([20.6, 1.9, 4.9], [20, 3.7, 0], 40), 'Ava, low angle, points out the cookie.', (s) => {
    s.state('ava', 'shiver', false, 0);
    s.pose('ava', 'point', 0.1); s.turn('ava', -0.7, 0.1, 0.25);
    s.expr('ava', 'neutral', 0.1, true);
    s.say('ava', 'There\'s a *cookie.* Who do you save?', 0.25);
  });
  E.shot('S22', 1.3, CAM.dolly([16.3, 1.95, 0.2], [15.4, 1.45, -1.6], [16.1, 1.85, -0.2], [15.4, 1.45, -1.6], 30, 30), 'The cookie. It sparkles.', (s) => {
    s.sfx('sparkle', 0.1, 0.8);
    s.burst('hearts', [15.4, 1.6, -1.6], 0.1, { n: 8, life: 1.2, spread: 0.5 });
  });
  E.shot('S23', 2.4, CAM.still([18.4, 0.75, 1.9], [17.8, 1.0, 5.4], 54), 'Low front of the pet line. Rex, heroic, takes off.', (s) => {
    s.pose('ava', 'wave', 0); s.turn('ava', 0, 0, 0.01);
    s.expr('rex', 'angry', 0.1);
    s.say('rex', 'I\'M COMING, *AVA!*', 0.15);
    s.sfx('bark_double', 1.25, 0.8);
    s.pose('rex', 'stand', 1.3);
    s.move('rex', [17.0, 0, 4.75], 1.55, 0.55, { ease: 'in' });
  });
  E.shot('S24', 3.0, CAM.still([15.6, 1.3, 7.6], [17.8, 0.5, 3.9], 42), 'Rex trips over Lou\'s bucket and faceplants. Lou sleeps on.', (s) => {
    s.move('rex', [18.3, 0, 3.55], 0.05, 0.4, { arc: 0.5, ease: 'out' });
    s.pose('rex', 'flat', 0.3, 0.08);
    s.sfx('bonk', 0.08, 0.8); s.sfx('thud', 0.42, 1.0);
    s.burst('dirt', [18.4, 0.1, 3.4], 0.42, { n: 14 });
    s.state('lou', 'shiver', true, 0.05); s.state('lou', 'shiver', false, 0.35);
    s.expr('rex', 'sad', 0.45, true);
    s.say('rex', '...I\'m *okay!*', 1.4);
    s.state('rex', 'wag', true, 1.4);
  });
  E.shot('S25', 3.8, CAM.still([13.0, 2.2, 1.4], [15.3, 1.55, -1.1], 38), 'Duchess strolls to the cookie pillar, hops up and eats the cookie.', (s) => {
    s.place('duchess', [14.9, 0, 1.6], PI + 0.3, 0);
    s.pose('duchess', 'stand', 0, 0.01);
    s.move('duchess', [15.4, 0, -0.55], 0, 0.9);
    s.move('duchess', [15.4, 1.4, -1.6], 1.0, 0.4, { arc: 0.7 });
    s.turn('duchess', -0.9, 1.45, 0.2);
    s.pose('duchess', 'sit', 1.5);
    s.vis('cookie', false, 1.85); s.sfx('munch', 1.85, 1.0); s.sfx('purr', 2.3, 0.5); s.burst('crumbs', [15.4, 1.5, -1.4], 1.85, { n: 14 });
    chew('duchess', s.t0 + 1.85, 0.6);
    s.expr('duchess', 'happy', 1.9, true);
    s.say('duchess', 'Delicious *choice.*', 2.6);
  });
  E.shot('S26', 2.6, CAM.still([13.9, 2.3, 2.6], [15.4, 2.1, -1.3], 40), 'Pico flies in to "save the cookie". Finds crumbs.', (s) => {
    s.place('pico', [17.8, 2.0, 1.5], PI, 0);
    s.pose('pico', 'fly', 0, 0.01);
    s.move('pico', [15.6, 2.55, -1.2], 0, 0.8); s.sfx('squawk_macaw', 0.0, 0.5);
    s.turn('pico', -2.6, 0.85, 0.2);
    s.say('pico', 'SAVE THE *COOKIE!*', 0.2);
    s.expr('pico', 'shocked', 1.4); s.look('pico', [0, 0.6], 1.4, 0.2);
    s.expr('pico', 'sad', 1.9, true);
  });
  E.shot('S27', 2.6, CAM.still([24.0, 1.7, 7.0], [20.4, 2.2, 1.0], 44), 'Greg charges straight across the "lava" and rams Ava\'s pillar.', (s) => {
    s.place('pico', [15.6, 2.55, -1.2], -2.6, 0);
    s.pose('greg', 'ram', 0.1, 0.12); s.expr('greg', 'angry', 0.1);
    s.say('greg', 'BAAA!', 0.2);
    s.move('greg', [20.0, 0, 0.95], 0.35, 0.9, { ease: 'in' });
    s.sfx('thud', 1.25, 1.0); s.sfx('bonk', 1.25, 0.6);
    s.shake(1.25, 0.45, 0.22);
    s.burst('puff', [20, 0.6, 0.6], 1.25, { n: 10 });
    s.pose('greg', 'stand', 1.5); s.expr('greg', 'blank', 1.5, true);
    s.state('ava', 'shiver', true, 1.3); s.expr('ava', 'shocked', 1.3, true);
  });
  E.shot('S28', 2.4, CAM.still([24.6, 2.6, 4.6], [20.6, 1.7, 0.6], 46), 'Ava wobbles and falls into the pit.', (s) => {
    s.say('ava', 'Wait— *WAIT!*', 0.05);
    s.state('ava', 'shiver', false, 0.85);
    s.move('ava', [21.0, 0.1, 1.45], 0.9, 0.5, { ease: 'in', face: false });
    s.pose('ava', 'fallen', 0.9, 0.25);
    s.sfx('whoosh', 0.9, 0.5);
    s.sfx('wool', 1.4, 1.0); s.shake(1.4, 0.3, 0.12);
    s.burst('splash', [21.0, 0.15, 1.0], 1.4, { n: 26 });
    s.expr('ava', 'blank', 1.6, true);
  });
  E.shot('S29', 3.4, CAM.still([21.05, 2.3, 1.05], [21.0, 0.2, -0.05], 38), 'Top-down on Ava lying in it: it was wool all along.', (s) => {
    s.say('ava', 'It\'s... *wool.*', 0.3);
    s.say('ava', 'It was always wool.', 1.6);
  });
  E.shot('S30', 3.6, CAM.still([18.0, 2.4, 8.6], [18.0, 1.2, 1.0], 52), 'Wide. Ava stands up in the pit. Scores update. She notices Duchess has 9.', (s) => {
    s.place('ava', [21.0, 0.08, 1.45], -0.5, 0); s.pose('ava', 'stand', 0, 0.01);
    s.scores({ rex: 1, duchess: 9, pico: 1, lou: 0, greg: -5 }, 0.2); s.sfx('buzzer', 0.2, 0.5);
    s.expr('ava', 'angry', 0.6);
    s.say('ava', 'Duchess, why do you have *nine?*', 0.6);
    s.say('duchess', 'Pure *talent.*', 2.6);
  });
  E.shot('S31', 3.0, CAM.still([19.9, 0.85, 2.1], [18.75, 0.3, 3.15], 36), 'Rex, face in the dirt, tail wagging. He gets a point for trying.', (s) => {
    s.say('ava', 'Rex at least *tried.*', 0.1, { offscreen: true });
    s.scores({ rex: 2, duchess: 9, pico: 1, lou: 0, greg: -5 }, 1.3); s.sfx('ding', 1.3, 0.6);
    s.expr('rex', 'happy', 1.4);
    s.say('rex', 'I *tried!*', 1.6);
  });

  // ======================= MIDPOINT — 3 AM =======================
  E.shot('S32', 4.4, CAM.dolly([0, 3.0, 12.4], [0, 2.1, -1], [0, 2.8, 11.2], [0, 2.0, -1], 42, 42), 'Time-lapse to night on the stage. Round 3: stay quiet at 3 AM.', (s) => {
    resetStage(s, 0);
    s.expr('rex', 'neutral', 0, true); s.expr('duchess', 'neutral', 0, true); s.expr('pico', 'neutral', 0, true); s.expr('greg', 'neutral', 0, true);
    s.state('rex', 'wag', false, 0);
    s.place('ava', AVA_MARK, PI, 0); s.pose('ava', 'whisper', 1.0); s.expr('ava', 'neutral', 0, true);
    s.sfx('whoosh', 0, 0.8);
    s.tod(1, 0, 1.0);
    s.music('night', 0.4);
    s.label('ROUND 3: 3 AM', 0.6); s.sfx('ding', 0.6, 0.4);
    s.say('ava', 'Round three. It\'s *3 AM.* Can you stay quiet?', 1.1, { soft: true });
  });
  E.shot('S33', 2.2, rowFront(50), 'Silence. Crickets. Everyone holds very still.', (s) => {
    s.place('ava', [0, 0, 9.2], PI, 0);
    s.music('stop', 0);
    s.sfx('crickets', 0, 0.8);
    s.pose('ava', 'stand', 0);
    ['rex', 'duchess', 'pico', 'greg'].forEach((p, i) => s.expr(p, 'side', 1.0 + i * 0.12, i > 0));
  });
  E.shot('S34', 2.0, CAM.still([-4.6, 2.2, 3.4], [-6, 2.35, 0], 38), 'Rex howls at the moon.', (s) => {
    s.pose('rex', 'howl', 0.1, 0.15);
    s.say('rex', 'AWOOOOO!', 0.2, { novoice: true, rate: 0.3 });
    s.sfx('howl', 0.2, 1.0);
    s.pose('rex', 'sit', 1.8);
  });
  E.shot('S35', 2.2, CAM.still([-1.9, 2.1, 3.8], [-2.6, 1.6, 0.3], 40), 'Duchess knocks the flower pot off her podium. Looks at camera.', (s) => {
    s.place('pot', [-2.45, 1, 0.55], 0, 0);
    s.pose('duchess', 'swipe', 0.35, 0.12);
    s.move('pot', [-2.1, 1.05, 1.0], 0.45, 0.2, { face: false, ease: 'out' });
    s.move('pot', [-1.7, 0, 1.5], 0.65, 0.3, { face: false, ease: 'in' });
    s.vis('pot', false, 0.95); s.burst('pot', [-1.7, 0.15, 1.5], 0.95, { n: 18 }); s.sfx('crash', 0.95, 1.0);
    s.pose('duchess', 'sit', 1.1); s.expr('duchess', 'smug', 1.2);
  });
  E.shot('S36', 1.9, podClose('pico', { ly: 1.65 }), 'Pico screams the time.', (s) => {
    s.pose('pico', 'squawk', 0.05); s.expr('pico', 'shocked', 0.05, true); s.sfx('squawk', 0.0, 0.6);
    s.say('pico', 'THREE A.M.! *THREE* *A.M.!*', 0.1);
  });
  E.shot('S37', 3.0, CAM.still([-3.4, 3.2, 9.6], [1.0, 3.8, -5.0], 48), 'Greg charges the scoreboard. It explodes into blocks.', (s) => {
    s.place('ava', AVA_MARK, PI, 0);
    s.pose('pico', 'stand', 0);
    s.pose('greg', 'ram', 0, 0.1); s.expr('greg', 'angry', 0, true);
    s.move('greg', [5.0, 0, -1.4], 0.05, 0.35, { arc: 0.6 });
    s.move('greg', [1.8, 0, -5.9], 0.45, 0.5, { ease: 'in' });
    s.vis('scoreboard', false, 0.95);
    s.burst('shatter', [0, 6.0, -6.5], 0.95, { n: 50, w: 10, h: 4.5, spread: 1.2 });
    s.sfx('shatter', 0.95, 1.0); s.sfx('thud', 0.95, 0.8); s.shake(0.95, 0.6, 0.3);
    s.scores({ rex: '?', duchess: '?', pico: '?', lou: '?', greg: '?' }, 1.0);
    s.pose('greg', 'stand', 1.2); s.expr('greg', 'blank', 1.3, true);
    for (const p of ['rex', 'duchess', 'pico']) s.expr(p, 'shocked', 1.0, true);
  });
  E.shot('S38', 3.9, avaClose(), 'Ava, in the dust. New plan: one honest question.', (s) => {
    s.place('greg', [POD.greg, 1, 0], 0, 0);
    s.expr('ava', 'blank', 0, true);
    s.say('ava', '...okay. New plan.', 0.3);
    s.expr('ava', 'neutral', 1.9);
    s.say('ava', 'One question. Be *honest.*', 2.0);
  });
  E.shot('S39', 3.0, CAM.still([0.3, 1.15, 2.2], [0, 1.55, 4.5], 38), 'Sunrise. Ava asks the real question.', (s) => {
    s.tod(0, 0, 1.0); s.sfx('whoosh', 0, 0.5);
    s.label(null, 0); s.hud(false, 0);
    s.music('quirky', 0.4);
    for (const p of ['rex', 'duchess', 'pico', 'greg']) s.expr(p, 'neutral', 0, true);
    s.say('ava', 'Why do you want a *home?*', 1.0);
  });
  E.shot('S40', 1.6, podClose('rex'), 'Rex.', (s) => { s.expr('rex', 'happy', 0, true); s.say('rex', '*SNACKS!*', 0.15); s.hop('rex', 0.15, 0.3); s.sfx('bark', 0.95, 0.7); });
  E.shot('S41', 1.5, podClose('duchess'), 'Duchess.', (s) => { s.expr('duchess', 'smug', 0, true); s.say('duchess', '*Servants.*', 0.15); });
  E.shot('S42', 1.7, podClose('pico', { ly: 1.65 }), 'Pico, both.', (s) => { s.pose('pico', 'squawk', 0.05); s.say('pico', 'SNACKS! *SERVANTS!*', 0.1); s.pose('pico', 'stand', 1.5); });
  E.shot('S43', 1.5, podClose('greg', { ly: 1.85 }), 'Greg.', (s) => { s.expr('greg', 'blank', 0, true); s.say('greg', 'Baaa.', 0.2); });
  E.shot('S44', 6.6, CAM.dolly([3.1, 2.2, 3.3], [3, 1.85, 0], [3.05, 2.1, 2.5], [3, 1.95, 0], 32, 32), 'Music drops out. Lou wakes, slowly rises out of the bucket and answers.', (s) => {
    s.music('stop', 0);
    s.state('lou', 'zzz', false, 0.4);
    s.expr('lou', 'neutral', 0.6);
    s.pose('lou', 'up', 0.7, 1.0);
    s.expr('lou', 'hopeful', 1.5, true);
    s.say('lou', '...so I\'m not... *alone.*', 1.7, { hold: 0.8 });
    s.music('tender', 5.8);
  });
  E.shot('S45', 3.8, CAM.dolly([0, 2.0, 8.0], [0, 1.85, 0], [0, 1.95, 7.1], [0, 1.85, 0], 52, 52), 'Everyone turns to Lou. Rex tears up. Pico repeats it — softly, and means it.', (s) => {
    s.place('ava', [0, 0, 9.2], PI, 0);
    s.look('rex', [0.75, 0], 0.1, 0.4); s.look('duchess', [0.7, 0], 0.2, 0.4); s.look('pico', [0.6, 0], 0.15, 0.4); s.look('greg', [-0.7, 0], 0.25, 0.4);
    s.expr('rex', 'teary', 0.6); s.expr('duchess', 'sad', 0.8, true);
    s.pose('pico', 'shy', 1.6);
    s.say('pico', '...not *alone.*', 2.0, { soft: true });
  });

  // ======================= FINAL ROUND — FETCH =======================
  E.shot('S46', 3.0, CAM.still([-1.7, 1.6, 2.3], [0, 1.6, 4.5], 36), 'Ava wipes her eye, then: FETCH! Throws a stick.', (s) => {
    s.place('ava', AVA_MARK, PI, 0);
    for (const p of PETS) s.look(p, [0, 0], 0, 0.01);
    s.expr('rex', 'neutral', 0, true); s.expr('duchess', 'neutral', 0, true);
    s.pose('ava', 'wipe', 0.05);
    s.say('ava', 'Okay. Final round...', 0.2);
    s.label('FINAL ROUND', 1.5); s.sfx('ding', 1.5, 0.5);
    s.vis('stick', true, 1.3); s.attach('stick', 'ava', 'handA', [0, -0.1, 0], 1.3, [0, 0, 0]);
    s.pose('ava', 'windup', 1.35, 0.2);
    s.say('ava', 'Go *FETCH!*', 1.7);
    s.pose('ava', 'throw', 2.0, 0.08);
    s.attach('stick', null, null, null, 2.08);
    s.place('stick', [0.3, 2.1, 4.0], 0, 2.08);
    s.move('stick', [-28, 0.05, 0.6], 2.08, 3.6, { arc: 7, ease: 'lin', face: false });
    s.spin('stick', 2.08, 3.6, 5);
    s.sfx('whoosh', 2.05, 1.0);
    s.music('chase', 2.1);
  });

  // chase choreography (absolute times)
  const T = E.t; // start of S47
  E.shot('S47', 2.6, CAM.dolly([0, 3.6, 12.8], [-2, 1.8, 0], [-3, 3.4, 12.0], [-5, 1.7, 0], 46, 46), 'Wide: the pets launch. Duchess jumps on Greg; Pico grabs Lou\'s bucket.', (s) => {
    s.pose('ava', 'stand', 0); s.expr('ava', 'happy', 0, true);
    s.label(null, 2.2);
    s.pose('rex', 'stand', 0, 0.1); s.expr('rex', 'angry', 0, true);
    s.move('rex', [-9, 0, 0.4], 0.05, 0.45, { arc: 0.5 }); s.sfx('bark_double', 0.1, 0.7);
    s.move('rex', [-17.5, 0, 0.4], 0.5, 2.1, { ease: 'lin' });
    s.pose('greg', 'ram', 0.2); s.expr('greg', 'angry', 0.2, true);
    s.move('greg', [5, 0, 1.7], 0.2, 0.35, { arc: 0.5 });
    s.move('greg', [-6, 0, 1.7], 0.55, 1.4, { ease: 'lin' });
    s.move('greg', [-12, 0, 1.2], 1.95, 0.65, { ease: 'lin' });
    // Greg passes x=-3 at t = 0.55 + 1.4*(8/11) ≈ 1.57
    s.pose('duchess', 'stand', 1.1);
    s.move('duchess', [-3, 1.15, 1.7], 1.2, 0.37, { arc: 0.8, ease: 'lin' });
    s.attach('duchess', 'greg', 'root', [0, 1.2, -0.05], 1.57, [0, 0, 0]);
    s.pose('duchess', 'ride', 1.57);
    s.expr('duchess', 'happy', 1.6, true);
    s.pose('pico', 'fly', 0.1);
    s.move('pico', [3, 2.05, 0.05], 0.15, 0.55);
    s.attach('lou', 'pico', 'root', [0, -1.0, 0], 0.72, [0, 0, 0]); s.sfx('squawk', 0.7, 0.5);
    s.move('pico', [-9, 2.3, 0.8], 0.8, 1.8, { ease: 'lin' });
    s.expr('lou', 'shocked', 0.8);
  });
  E.shot('S48', 1.8, CAM.track('rex', [4.5, 1.8, 8.5], [3.5, 0.8, 0], 46), 'Tracking the race: Rex leads; Duchess rides Greg; Lou dangles from Pico.', (s) => {
    s.move('rex', [-21.0, 0, 0.4], 0, 1.0, { ease: 'lin' });
    s.move('greg', [-21.3, 0, 1.2], 0, 1.8, { ease: 'lin' });
    s.move('pico', [-17, 2.3, 0.9], 0, 1.8, { ease: 'lin' });
    s.say('duchess', 'Faster, *goat!*', 0.15);
  });
  E.shot('S49', 2.8, CAM.still([-18.6, 1.5, 6.2], [-22, 1.0, 1.0], 42), 'Rex clears the fence. Greg smashes straight through it. Duchess goes flying.', (s) => {
    s.move('rex', [-24.6, 0, 0.4], 0, 0.6, { arc: 1.4, ease: 'lin' });
    s.move('rex', [-27.4, 0, 0.5], 0.6, 0.7, { ease: 'out' });
    s.move('greg', [-22.1, 0, 1.2], 0, 0.15, { ease: 'lin' });
    s.vis('fenceMid', false, 0.15);
    s.burst('fence', [-22, 0.9, 0], 0.15, { n: 24, w: 0.5, h: 1.2 });
    s.sfx('crash', 0.15, 1.0); s.shake(0.15, 0.4, 0.2);
    s.attach('duchess', null, null, null, 0.2);
    s.place('duchess', [-22.0, 1.2, 1.2], -PI / 2, 0.2);
    s.move('duchess', [-23.4, 0, 3.8], 0.2, 0.55, { arc: 1.3, face: false });
    s.pose('duchess', 'flat', 0.7, 0.1); s.sfx('thud', 0.75, 0.7); s.sfx('meow', 0.3, 0.6); s.burst('puff', [-23.4, 0.2, 3.8], 0.75, { n: 8 });
    s.expr('duchess', 'blank', 0.8, true);
    s.move('greg', [-23.0, 0, 1.4], 0.15, 0.5, { ease: 'out' });
    s.pose('greg', 'stand', 0.6);
    s.say('ava', 'GREG! You\'re *DISQUALIFIED!*', 1.0, { offscreen: true });
    s.expr('greg', 'sad', 1.9);
    s.move('pico', [-21.5, 2.0, 0.9], 0, 2.8, { ease: 'lin' });
  });
  E.shot('S50', 2.6, CAM.still([-30.6, 0.85, 2.7], [-27.6, 0.55, 0.5], 40), 'Rex reaches the stick first. Victory hop.', (s) => {
    s.place('stick', [-28, 0.05, 0.6], 0, 0);
    s.move('greg', [-25, 0, -7], 0, 2.6, { ease: 'lin' });
    s.pose('rex', 'stand', 0);
    s.attach('stick', 'rex', 'jawP', [0, -0.06, 0.22], 0.45, [0, PI / 2, 0]);
    s.sfx('pop', 0.45, 0.8);
    s.hop('rex', 0.9, 0.5); s.expr('rex', 'happy', 0.9); s.state('rex', 'wag', true, 0.9); s.sfx('bark', 1.0, 0.6);
    s.sfx('sparkle', 1.0, 0.6);
  });
  E.shot('S51', 4.0, CAM.still([-25.0, 1.45, 5.2], [-26.0, 0.7, 0.9], 42), 'Pico arrives exhausted and drops Lou. Rex walks over and puts the stick in Lou\'s bucket.', (s) => {
    s.place('pico', [-24.0, 1.8, 0.9], -PI / 2, 0);
    s.move('pico', [-25.0, 1.3, 0.95], 0, 0.6);
    s.expr('pico', 'sad', 0, true);
    s.attach('lou', null, null, null, 0.6);
    s.place('lou', [-25.1, 0.3, 1.0], -PI / 2, 0.6);
    s.move('lou', [-25.1, 0, 1.0], 0.6, 0.15, { face: false, ease: 'in' }); s.sfx('thud', 0.75, 0.5);
    s.move('pico', [-24.3, 0, 0.0], 0.7, 0.4); s.pose('pico', 'stand', 1.0); s.turn('pico', -1.2, 1.1, 0.2);
    s.expr('lou', 'neutral', 0.8, true);
    s.turn('rex', PI / 2, 0.2, 0.3);
    s.move('rex', [-26.1, 0, 0.95], 0.9, 0.8);
    s.attach('stick', 'lou', 'root', [0, 0.95, 0.05], 1.95, [0.2, 0.6, 0]);
    s.sfx('pop', 1.95, 0.6);
    s.pose('rex', 'sit', 1.9);
    s.say('rex', 'You should have it.', 2.2);
  });
  E.shot('S52', 3.6, CAM.still([-24.6, 0.95, 3.4], [-25.0, 0.7, 1.0], 40), 'Lou thanks Rex. Pico says it too — and this time it is not an echo.', (s) => {
    s.expr('lou', 'happy', 0.1);
    s.say('lou', '...thanks, *Rex.*', 0.2);
    s.pose('pico', 'shy', 1.9); s.expr('pico', 'happy', 1.9, true);
    s.say('pico', 'Thanks, *Rex!*', 2.1);
  });
  E.shot('S53', 2.8, CAM.still([-23.2, 0.95, 4.6], [-24.0, 0.65, 2.4], 38), 'Duchess, dusting herself off, admits it.', (s) => {
    s.place('duchess', [-24.0, 0, 2.4], 0.9, 0); s.pose('duchess', 'sit', 0, 0.01);
    s.expr('duchess', 'smug', 0, true);
    s.say('duchess', 'Ugh. Fine. That was *sweet.*', 0.2);
    s.expr('duchess', 'happy', 2.2); s.sfx('meow', 2.3, 0.4);
  });

  // ======================= PAYOFF =======================
  E.shot('S54', 3.4, CAM.still([0.8, 2.15, 8.8], [0, 1.85, 0], 44), 'Back on stage. Greg\'s podium is empty. Ava has decided. Drumroll.', (s) => {
    s.music('stop', 0);
    s.label(null, 0);
    for (const p of ['rex', 'duchess', 'pico', 'lou']) { s.place(p, [POD[p], 1, 0], 0, 0); s.pose(p, p === 'pico' ? 'stand' : p === 'lou' ? 'up' : 'sit', 0, 0.01); s.expr(p, 'neutral', 0, true); s.look(p, [0, 0], 0, 0.01); }
    s.vis('greg', false, 0);
    s.state('rex', 'wag', false, 0);
    s.place('ava', AVA_MARK, PI, 0); s.pose('ava', 'stand', 0, 0.01); s.expr('ava', 'neutral', 0, true);
    s.say('ava', 'I\'ve *decided.*', 0.3);
    s.sfx('drumroll', 1.1, 0.9);
  });
  ['rex', 'duchess', 'pico', 'lou'].forEach((p, i) => {
    E.shot('S55' + 'abcd'[i], 0.8, podClose(p, { ly: p === 'lou' ? 1.6 : p === 'pico' ? 1.65 : 1.72 }), `Hopeful close-up: ${p}.`, (s) => {
      if (i === 0) s.say('ava', 'I choose...', 0, { offscreen: true });
      s.expr(p, p === 'duchess' ? 'side' : 'hopeful', 0.05, true);
      if (p === 'duchess') s.expr(p, 'hopeful', 0.45, true);
      s.punch(0.05, 1.12);
    });
  });
  E.shot('S56', 3.4, CAM.still([1.6, 1.75, 6.2], [2.8, 1.45, 1.4], 40), 'Ava walks to Lou\'s podium, lifts the bucket: "Lou."', (s) => {
    s.move('ava', [3.0, 0, 1.75], 0, 0.8);
    s.turn('ava', PI, 0.8, 0.15);
    s.pose('ava', 'carry', 0.85);
    s.attach('lou', 'ava', 'body', [0, -0.6, 0.48], 1.05, [0, PI, 0]); s.pose('lou', 'peek', 1.05);
    s.sfx('pop', 1.05, 0.5);
    s.say('ava', '*Lou.*', 1.25);
    s.expr('lou', 'happy', 1.6); s.burst('hearts', [3.0, 1.8, 2.3], 1.6, { n: 10, life: 1.6, spread: 0.6 });
    s.sfx('sparkle', 1.6, 0.6);
    s.vis('stick', false, 0);
  });
  E.shot('S57', 1.8, podClose('rex'), 'Rex, crushed. Tiny whimper.', (s) => {
    s.expr('rex', 'sad', 0.1); s.sfx('whimper', 0.3, 0.9);
  });
  E.shot('S58', 4.6, CAM.still([0, 2.5, 10.6], [0, 1.55, 1.0], 44), 'Ava turns back to the row: and Rex. And Pico. And... fine, Duchess. Everyone cheers.', (s) => {
    s.place('ava', [0, 0, 2.6], 0, 0); s.pose('ava', 'carry', 0, 0.01);
    s.look('ava', [-0.7, 0], 0.1, 0.25);
    s.say('ava', '...and *Rex.*', 0.2);
    s.expr('rex', 'shocked', 0.85); s.expr('rex', 'happy', 1.05, true); s.hop('rex', 1.05, 0.5); s.state('rex', 'wag', true, 1.05); s.sfx('bark_double', 1.05, 0.7);
    s.look('ava', [-0.15, 0], 1.3, 0.2);
    s.say('ava', 'And *Pico.*', 1.4);
    s.expr('pico', 'happy', 1.9, true); s.hop('pico', 1.9, 0.5); s.state('pico', 'flap', true, 1.9); s.sfx('squawk_macaw', 1.95, 0.5);
    s.look('ava', [-0.4, 0], 2.4, 0.2);
    s.say('ava', 'And... fine, *Duchess.*', 2.5);
    s.expr('duchess', 'happy', 3.8, true); s.hop('duchess', 3.8, 0.45); s.sfx('purr', 3.85, 0.5);
    s.music('payoff', 3.8); s.sfx('cheer', 3.8, 0.4);
    s.burst('hearts', [0, 2.6, 0.5], 3.8, { n: 16, life: 1.6, spread: 1.6 });
  });

  // ======================= BUTTON =======================
  E.shot('S59', 3.4, CAM.still([8.4, 1.3, -3.0], [11.2, 0.95, -7.6], 36), 'A whimper. A scruffy stray steps out from behind a tree. Name tag: ???', (s) => {
    s.state('pico', 'flap', false, 0);
    s.vis('greg', true, 0);
    s.state('greg', 'hide', [], 0);
    s.state('greg', 'label', '???', 0);
    s.place('greg', [12.2, 0, -8.6], -0.83, 0); s.pose('greg', 'stand', 0, 0.01);
    s.move('greg', [11.2, 0, -7.6], 0.2, 1.0);
    s.tag('greg', true, 0.6);
    s.state('greg', 'shiver', true, 1.2);
    s.sfx('whimper', 0.3, 1.0);
    s.music('tender', 0.6);
    s.say('ava', 'Aww... you too, *buddy?*', 1.5, { offscreen: true, soft: true });
  });
  E.shot('S60', 3.0, CAM.still([7.4, 1.6, -2.4], [10.4, 0.95, -6.2], 40), 'Ava kneels to the stray. It headbutts her. The disguise falls off: it\'s Greg.', (s) => {
    s.state('greg', 'shiver', false, 0);
    s.place('ava', [10.05, 0, -5.9], Math.atan2(11.2 - 10.05, -7.6 + 5.9), 0);
    s.pose('ava', 'reach', 0.1); s.expr('ava', 'happy', 0.1, true);
    s.attach('lou', null, null, null, 0);
    s.place('lou', [11.9, 0, -5.0], -0.4, 0); s.pose('lou', 'up', 0, 0.01);
    s.pose('greg', 'ram', 0.75, 0.1);
    s.move('greg', [10.8, 0, -7.0], 0.75, 0.2, { face: false });
    s.music('stop', 0.8);
    s.sfx('bonk', 0.92, 1.0); s.shake(0.92, 0.3, 0.15);
    s.move('ava', [9.4, 0.05, -4.6], 0.92, 0.45, { arc: 0.5, face: false });
    s.pose('ava', 'fallen', 0.95, 0.2); s.expr('ava', 'shocked', 0.95, true);
    s.state('greg', 'hide', ['coat', 'mask', 'flopL', 'flopR'], 1.35);
    s.burst('puff', [10.8, 1.0, -7.0], 1.35, { n: 16, w: 1, h: 1 });
    s.sfx('poof', 1.35, 0.8);
    s.state('greg', 'label', null, 1.35);
    s.pose('greg', 'stand', 1.5); s.expr('greg', 'blank', 1.5, true);
    s.say('greg', 'Baaa.', 1.9);
    s.tag('greg', false, 3.0);
  });
  E.shot('S61', 2.6, rowFront(50), 'Blank stares from the row.', (s) => {
    for (const p of ['rex', 'duchess', 'pico']) { s.expr(p, 'blank', 0, true); s.look(p, [0.5, 0], 0, 0.01); }
    s.state('rex', 'wag', false, 0);
    s.say('duchess', '...*obviously.*', 0.9);
  });
  E.shot('S62', 4.4, CAM.still([2.2, 1.2, 1.2], [0.2, 1.1, 12], 44), 'Ava walks home carrying Lou, the pets in a line behind her. The sign now reads ADOPT 1→5. Mom, off-screen: "I SAID ONE!" Everyone freezes.', (s) => {
    s.vis('sign', true, 0); s.place('sign', [1.5, 0.36, 3.6], PI, 0); s.state('sign', 'text', 'five', 0);
    s.place('ava', [0, 0, 8.0], 0, 0); s.pose('ava', 'carry', 0, 0.01); s.expr('ava', 'happy', 0, true);
    s.attach('lou', 'ava', 'body', [0, -0.6, 0.48], 0, [0, PI, 0]); s.pose('lou', 'peek', 0, 0.01);
    s.move('ava', [0, 0, 11.6], 0, 1.6, { ease: 'lin' });
    s.place('rex', [-0.7, 0, 6.6], 0, 0); s.pose('rex', 'stand', 0, 0.01); s.move('rex', [-0.7, 0, 10.2], 0, 1.6, { ease: 'lin' });
    s.place('duchess', [0.7, 0, 6.0], 0, 0); s.pose('duchess', 'stand', 0, 0.01); s.move('duchess', [0.7, 0, 9.6], 0, 1.6, { ease: 'lin' });
    s.place('pico', [-0.2, 1.8, 6.8], 0, 0); s.pose('pico', 'fly', 0, 0.01); s.move('pico', [-0.2, 1.9, 10.4], 0, 1.6, { ease: 'lin' });
    s.place('greg', [0.2, 0, 5.0], 0, 0); s.pose('greg', 'stand', 0, 0.01); s.move('greg', [0.2, 0, 8.6], 0, 1.6, { ease: 'lin' });
    for (const p of ['rex', 'duchess', 'pico', 'greg']) { s.look(p, [0, 0], 0, 0.01); s.expr(p, 'happy', 0, true); }
    s.music('payoff', 0);
    s.music('stop', 1.55);
    s.say('mom', 'AVA! I SAID *ONE!*', 1.6, { offscreen: true, loud: true });
    s.sfx('sting', 1.6, 0.8);
    ['ava', 'rex', 'duchess', 'pico', 'greg'].forEach((p, i) => { s.turn(p, PI, 2.45 + i * 0.05, 0.2); s.expr(p, 'blank', 2.6, true); });
    s.expr('lou', 'blank', 2.6, true);
  });
  E.shot('S63', 4.6, CAM.dolly([2.2, 1.2, 1.2], [0.2, 1.1, 12], [2.5, 1.5, 0.2], [0.4, 1.1, 12], 44, 46), 'End card: NEXT EPISODE: THE PETS MEET MOM. Greg wanders back and eats the sign. Fade out.', (s) => {
    s.music('end', 0);
    s.card('NEXT EPISODE:\nTHE PETS MEET MOM', 0.3);
    s.sfx('fanfare', 0.3, 0.5);
    s.turn('greg', PI + 0.4, 0.6, 0.2);
    s.move('greg', [1.4, 0, 4.25], 0.7, 1.4);
    s.pose('greg', 'ram', 2.1);
    s.vis('sign', false, 2.4); s.burst('paper', [1.5, 0.8, 3.6], 2.4, { n: 18 }); s.sfx('munch', 2.4, 1.0);
    chew('greg', s.t0 + 2.4, 1.2);
    s.card(null, 3.6);
    s.fade(1, 3.9, 0.6);
  });
}
