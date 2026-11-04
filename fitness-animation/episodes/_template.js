/*
 * Episode template. Copy to episodes/<your-slug>.js, then open
 *   engine/player.html?ep=<your-slug>
 * Coordinates are 1920x1080 stage pixels (press P in the player to pick them).
 * Every `at` is seconds from the start of its scene.
 * Scenes crossfade (0.55 s) by default; use transition: 'dip' only at section breaks.
 * Story shots get cam: { push: 1.5 }; instruction shots stay locked (the default).
 */
Motion.episode({
  title: 'Episode title',
  fps: 30,
  // theme: { accent: '#2F8CFF' },   // your signature colour (match your mascot's gear)
  scenes: [
    Motion.scene({
      name: 'hook', chapter: 'Intro', dur: 7.0, fadeIn: 0.15, cam: { push: 1.5 },
      vo: 'The first line of your script.',
      build(s) {
        s.plate({ plate: 'arm-front', x: 560, y: 560, h: 1000, at: 0.1,
          highlight: [{ region: 'flexors', at: 1.2, dur: 1.0, sweep: [700, 990, 330, 1700] }] });
        s.hand({ text: 'the surprising bit', x: 1250, y: 380, at: 1.8 });
        s.arrow({ from: [1150, 440], to: [700, 600], at: 2.3 });
        s.tag({ text: 'Series name · at home', at: 3.5 });
      },
    }),

    Motion.scene({
      name: 'point', dur: 8.0,
      vo: 'Your explanation.',
      build(s) {
        s.plate({ plate: 'torso-side', x: 560, y: 610, h: 1160, at: 0.05 });
        s.lines({ x: 1300, y: 430, at: 0.8, stagger: 1.0, items: [
          { text: 'the question?', color: 'ink' },
          { text: 'the answer', color: 'accent' },
          { text: 'the dose: 3 × 30 s', color: 'good', dy: 190 },
        ] });
        s.badge({ text: 'go slowly · stop if anything hurts', at: 2.0 });
        s.timer({ x: 1300, y: 830, size: 180, to: 45, at: 3.0, label: 'start a timer',
          move: [{ at: 5.5, x: 1790, y: 140, size: 110, label: 'keep holding' }] });
      },
    }),

    Motion.scene({
      name: 'rules', chapter: 'The rules', dur: 8.0, transition: 'dip',
      vo: 'Two rules.',
      build(s) {
        s.headline({ text: 'Two rules', x: 960, y: 190, align: 'center', at: 0.1 });
        s.card({ x: 690, y: 600, w: 480, h: 500, color: 'good', kicker: 'rule 1', title: 'Rule one', at: 0.5,
          visual: { type: 'ring', to: 45, dur: 2.5 }, caption: 'one short caption line' });
        s.card({ x: 1230, y: 600, w: 480, h: 500, color: 'accent', kicker: 'rule 2', title: 'Rule two', at: 1.6,
          visual: { type: 'bars', n: 10, on: 6 }, caption: 'one short caption line' });
      },
    }),
  ],
});
