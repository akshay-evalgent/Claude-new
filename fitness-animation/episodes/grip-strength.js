/*
 * Demo episode: "Your grip is a lifespan test" (~52 s, 1920x1080).
 *
 * One scene per voice-over beat. Inside a scene every `at` is in seconds from
 * the start of that scene, and every x/y is a pixel on the 1920x1080 stage.
 * `vo` is the line you record for that beat: render.mjs exports it as an .srt
 * and as a plain script, and the player shows it with the VO button.
 *
 * Source for the numbers: Leong DP et al., "Prognostic value of grip strength:
 * findings from the Prospective Urban Rural Epidemiology (PURE) study",
 * The Lancet 386 (2015): 139,691 adults, 17 countries; HR per 5 kg lower grip
 * strength for all-cause mortality 1.16; grip strength was a stronger predictor
 * of all-cause and cardiovascular death than systolic blood pressure.
 *
 * Timing follows the reference measurements (ANALYSIS.md): scenes crossfade in
 * 0.55 s, dips to black only at section breaks, text pops in 80 ms, story shots
 * push in ~1.5 %/s, instruction shots stay locked.
 */
Motion.episode({
  title: 'Your grip is a lifespan test',
  fps: 30,
  scenes: [
    // ------------------------------------------------------------ 1. hook
    Motion.scene({
      name: 'hook', chapter: 'Why grip?', dur: 7.0, fadeIn: 0.15,
      cam: { push: 1.2, cx: 900, cy: 520 },   // story shot: slow push toward the subject
      vo: "Doctors have a strength test that predicts how long you'll live. It's not your bench. It's your grip.",
      build(s) {
        s.plate({
          plate: 'torso-front', x: 560, y: 640, h: 1180, at: 0.1, inDur: 1.3, style: 'ink',
          highlight: [{ region: 'pecs', at: 1.4, dur: 0.8, sweep: [555, 640, 555, 1080], out: 3.7 }],
          to: [{ at: 3.7, dur: 0.9, x: 400, dim: 0.26 }],
        });
        s.hand({ text: 'your bench press?', x: 1210, y: 330, size: 82, at: 1.9, out: 3.7 });
        s.arrow({ from: [1090, 392], to: [745, 520], bend: -0.22, at: 2.3, out: 3.7, seed: 3 });
        s.stroke({ from: [935, 334], to: [1490, 318], at: 3.0, dur: 0.35, out: 3.7, width: 10 });
        s.plate({
          plate: 'arm-front', x: 1330, y: 560, h: 1010, at: 3.9,
          highlight: [{ region: 'grip', at: 4.5, dur: 1.4, sweep: [650, 990, 250, 2180] }],
        });
        s.hand({ text: 'your grip.', x: 880, y: 820, size: 96, at: 5.0, color: 'ink' });
        s.arrow({ from: [985, 760], to: [1300, 655], bend: 0.3, at: 5.45, seed: 9 });
        s.tag({ text: 'Grip strength · at home · 10 min', at: 4.2 });
      },
    }),

    // ------------------------------------------------------------ 2. the study
    Motion.scene({
      name: 'stat', dur: 11.5,
      vo: 'In a study of nearly 140,000 adults in 17 countries, every 5 kilos of grip lost meant 16 percent higher risk of death. A stronger signal than blood pressure.',
      build(s) {
        s.text({ text: 'THE PURE STUDY · THE LANCET, 2015', x: 960, y: 250, size: 26, color: 'muted', align: 'center', at: 0.2, out: 4.0, style: { letterSpacing: '0.18em' } });
        s.counter({ to: 139691, x: 960, y: 420, size: 168, align: 'center', at: 0.45, dur: 2.2, out: 4.0 });
        s.text({ text: 'adults  ·  17 countries', x: 960, y: 548, size: 40, color: 'muted', align: 'center', at: 1.4, out: 4.0 });

        s.text({ text: '−5 kg', x: 620, y: 470, size: 132, weight: 800, align: 'center', at: 4.4 });
        s.text({ text: 'of grip strength', x: 620, y: 580, size: 36, color: 'muted', align: 'center', at: 4.6 });
        s.arrow({ from: [820, 470], to: [1080, 470], bend: -0.18, at: 5.7, seed: 21, head: 34 });
        s.text({ text: '+16%', x: 1300, y: 470, size: 132, weight: 800, color: 'hl', align: 'center', at: 6.5, pop: true, sound: 'pop' });
        s.text({ text: 'risk of death, any cause', x: 1300, y: 580, size: 36, color: 'muted', align: 'center', at: 6.7 });
        s.text({ html: 'a stronger predictor than <span style="color:var(--accent)">blood pressure</span>', x: 960, y: 820, size: 44, align: 'center', at: 9.0 });
      },
    }),

    // ------------------------------------------------------------ 3. anatomy
    Motion.scene({
      name: 'anatomy', dur: 9.5,
      vo: "Grip isn't a hand muscle. It's flexors that start at your elbow, run down the forearm, and become tendons that pull your fingers shut.",
      build(s) {
        s.tag({ text: 'Grip strength · at home · 10 min', at: 0 });
        s.plate({
          plate: 'arm-front', x: 560, y: 560, h: 1040,
          highlight: [
            { region: 'flexors', at: 1.0, dur: 1.2, sweep: [700, 990, 330, 1700] },
            { region: 'tendons', at: 3.1, dur: 0.8, sweep: [380, 1620, 300, 1900] },
            { region: 'fingers', at: 5.1, dur: 0.8, sweep: [300, 1880, 260, 2180] },
          ],
        });
        // target = point on the figure (stage px), elbow = where the leader turns, labelX = where the label starts
        s.pin({ target: [665, 528], elbow: [800, 420], labelX: 1010, label: 'starts at the elbow', sub: 'medial epicondyle', at: 1.2 });
        s.pin({ target: [602, 660], elbow: [800, 600], labelX: 1010, label: 'finger flexors', sub: 'the muscles you squeeze with', at: 3.0 });
        s.pin({ target: [508, 880], elbow: [800, 780], labelX: 1010, label: 'tendons to the fingertips', sub: 'they pull the fingers shut', at: 5.0 });
        s.hand({ text: 'so train it like a forearm.', x: 1010, y: 950, size: 60, color: 'accent', align: 'left', rotate: -2, at: 6.9 });
      },
    }),

    // ------------------------------------------------------------ 4. chapter
    Motion.scene({
      name: 'chapter', chapter: 'The fix', dur: 3.0, transition: 'dip',   // section break
      vo: 'Here is the fix.',
      build(s) {
        s.chapter({ num: '01', title: 'The fix', sub: 'three moves · ten minutes', y: 560, at: 0.1 });
      },
    }),

    // ------------------------------------------------------------ 5. three moves
    Motion.scene({
      name: 'moves', dur: 10.5,
      vo: 'Three moves. Dead hangs, three sets of thirty seconds. Heavy farmer carries, three trips of forty metres. Plate pinches, twenty seconds at eight out of ten.',
      build(s) {
        s.headline({ text: 'Three moves', x: 960, y: 170, size: 52, align: 'center', at: 0.1 });
        s.card({ x: 420, y: 600, w: 480, h: 500, color: 'good', kicker: 'move 1', title: 'Dead hang', titleSize: 46, at: 0.5,
          visual: { type: 'ring', to: 30, dur: 3.0, size: 200 }, caption: '3 × 30 s, shoulders active' });
        s.card({ x: 960, y: 600, w: 480, h: 500, color: 'accent', kicker: 'move 2', title: 'Farmer carry', titleSize: 46, at: 1.9,
          visual: { type: 'meter', to: 40, unit: 'm', dur: 2.4, w: 340, color: 'accent' }, caption: 'heavy, 3 × 40 m' });
        s.card({ x: 1500, y: 600, w: 480, h: 500, color: 'hl', kicker: 'move 3', title: 'Plate pinch', titleSize: 46, at: 3.3,
          visual: { type: 'bars', n: 10, on: 8, barW: 28, gapW: 9, hMax: 150 }, caption: '3 × 20 s at 8 / 10 effort' });
      },
    }),

    // ------------------------------------------------------------ 6. scale it
    Motion.scene({
      name: 'scale', dur: 8.0,
      vo: "Can't hang thirty seconds yet? Keep your toes on a box, and build up to three sets of thirty.",
      build(s) {
        s.tag({ text: 'Dead hang', at: 0 });
        s.plate({ plate: 'torso-side', x: 560, y: 610, h: 1160 });
        s.lines({
          x: 1300, y: 420, gap: 74, align: 'center', size: 46, at: 0.9, stagger: 1.0,
          items: [
            { text: "can't hang for 30 s yet?", color: 'ink' },
            { text: 'keep your toes on a box', color: 'accent' },
            { text: 'build up to 3 × 30 s', color: 'good', dy: 190, at: 3.2 },
          ],
        });
        s.badge({ title: 'BE SAFE', text: 'go slowly · stop if anything hurts', at: 2.4 });
        // the "do it with me" device: a real-time timer that moves to the corner and keeps counting
        s.timer({ x: 1300, y: 830, size: 190, to: 30, at: 1.6, label: 'start a timer',
          move: [{ at: 4.4, dur: 0.5, x: 1790, y: 140, size: 110, label: 'keep holding' }] });
      },
    }),

    // ------------------------------------------------------------ 7. test + CTA
    Motion.scene({
      name: 'test', chapter: 'Test yourself', dur: 6.0, transition: 'dip',
      vo: 'So test yourself: hang as long as you can, and comment your time.',
      build(s) {
        s.headline({ text: 'Test yourself', x: 960, y: 270, size: 58, align: 'center', at: 0.15 });
        s.counter({ to: 47, suffix: ' s', sep: false, x: 960, y: 500, size: 190, color: 'accent', align: 'center', at: 0.5, dur: 3.2 });
        s.stroke({ circle: [960, 505], r: [250, 135], at: 3.7, dur: 0.6, width: 8 });
        s.lines({ x: 960, y: 740, gap: 70, align: 'center', size: 46, at: 1.2, stagger: 0.7,
          items: [{ text: 'hang as long as you can', color: 'ink' }, { text: 'comment your time', color: 'accent' }] });
      },
    }),
  ],
});
