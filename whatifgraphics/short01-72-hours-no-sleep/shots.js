// Short 1 (vertical, ~65 s): "72 Hours Without Sleep: What Happens to YOU, Hour by Hour"
// Layout (1080x1920): clock top (540,300) · mascot bottom (feet 540,1420) · callouts beside the body · captions at 85%.
const S = [];
function shot(o) { S.push(o); return o; }

const YOU = (expr, xray, extra) => ['you', 540, 1420, Object.assign({ pose: 'stand', expr, scale: 1.4, xray }, extra || {})];
const CLOCK = (from, to, extra) => ['clock', 540, 300, Object.assign({ from, to, max: 72, r: 140, at: 0.2, dur: 1.2 }, extra || {})];

shot({ n: "Hour zero. You feel fine. That's the problem.",
  bg: 'clinic_v', chars: [YOU('happy', { scan: true, bpm: 64 })],
  props: [CLOCK(0, 0)],
  card: ['72 HOURS\nWITHOUT SLEEP', { at: 0.1, size: 92, y: 530 }],
  cam: [[540, 960, 1], [540, 960, 1.03]], pad: 0.3 });

shot({ n: "Hour 18. Your reaction time is now the same as someone who's legally drunk. You just don't feel it.",
  bg: 'clinic_v', chars: [YOU('neutral', { scan: true, bpm: 72, flicker: true })],
  props: [CLOCK(0, 18), ['callout', 250, 760, { text: 'REACTION TIME = 0.05% ALCOHOL', w: 14, at: 2.2, tx: 470, ty: 800, size: 36 }]],
  cam: [[540, 960, 1], [540, 940, 1.04]] });

shot({ n: "Hour 24. Your brain starts taking microsleeps. Two-second blackouts you don't even notice. Your eyes stay open.",
  bg: 'clinic_v', chars: [YOU('tired', { scan: true, bpm: 76, flicker: true, brain: '#ff8fa3' }, { redEyes: true })],
  props: [CLOCK(18, 24), ['callout', 830, 700, { text: 'MICROSLEEP: 2 SEC', w: 10, at: 1.8, tx: 600, ty: 790, size: 36 }]],
  flash: [{ at: 2.6, dur: 0.14 }, { at: 3.5, dur: 0.18 }, { at: 4.4, dur: 0.22 }, { at: 5.6, dur: 0.2 }],
  cam: [[540, 960, 1.02], [540, 940, 1.06]] });

shot({ n: "Hour 36. Stress hormones spike. Your immune system starts cutting corners. Everything is funny. Then everything is annoying.",
  bg: 'clinic_v', chars: [YOU('nervous', { scan: true, bpm: 88, flicker: true, heart: '#ff3b4f', gut: '#ff9f43' }, { redEyes: true })],
  props: [CLOCK(24, 36), ['gauge', 230, 1120, { at: 1.4, from: 0.2, to: 0.85, dur: 2.2, r: 110, label: 'CORTISOL', value: 'SPIKING' }], ['callout', 850, 1060, { text: 'IMMUNE SYSTEM −30%', w: 12, at: 3.6, tx: 600, ty: 1160, size: 34 }]],
  heartbeats: [1.0, 1.9, 2.7, 3.4, 4.0, 4.6, 5.1],
  cam: [[540, 960, 1.02], [540, 960, 1.06]] });

shot({ n: "Hour 48. Your body temperature drops. The blackouts get longer. Your brain starts deleting memories instead of filing them.",
  bg: 'clinic_v', fx: 'cold', jitter: 2, chars: [YOU('sad', { scan: true, bpm: 60, flicker: true, brain: '#b39ddb', lungs: '#90caf9' }, { redEyes: true })],
  props: [CLOCK(36, 48), ['callout', 250, 700, { text: 'MEMORY: NOT SAVED', w: 10, at: 4.4, tx: 480, ty: 790, size: 36, color: '#b39ddb' }], ['callout', 850, 1200, { text: 'TEMP −0.5°C', w: 8, at: 1.6, tx: 620, ty: 1150, size: 36, color: '#90caf9' }]],
  flash: [{ at: 2.9, dur: 0.3 }, { at: 4.0, dur: 0.4 }],
  cam: [[540, 960, 1.03], [540, 940, 1.07]] });

shot({ n: "Hour 72. You see things that aren't there. Shadows move. And you'd fail a test a ten-year-old passes.",
  bg: 'clinic_v', fx: 'dark', jitter: 4, chars: [YOU('shocked', { scan: true, bpm: 96, flicker: true, brain: '#ff5c6c' }, { redEyes: true })],
  props: [['ghosts', 540, 1420, { n: 2, gap: 640, spread: 50, scale: 1.1 }], CLOCK(48, 72), ['callout', 840, 980, { text: 'HALLUCINATIONS', w: 10, at: 1.9, tx: 650, ty: 1020, size: 36, color: '#ff5c6c' }]],
  heartbeats: [0.6, 1.2, 1.8, 2.4, 3.0, 3.6, 4.2, 4.8, 5.4],
  cam: [[540, 960, 1.04], [540, 930, 1.1]] });

shot({ n: "The fix? One full night. Ten hours of sleep repairs almost all of it.",
  bg: 'clinic_v', chars: [YOU('joy', { scan: true, bpm: 60 })],
  props: [CLOCK(72, 0, { dur: 1.6 }), ['callout', 540, 700, { text: '10 HOURS OF SLEEP = RESET', w: 14, at: 1.4, tx: 540, ty: 790, size: 36, color: '#4ecdc4' }]],
  cam: [[540, 960, 1.04], [540, 960, 1]] });

shot({ n: "Which hour would have stopped you? Comment it.",
  bg: 'clinic_v', noCaptions: true, chars: [['you', 540, 1780, { pose: 'wave', expr: 'grin', scale: 0.95, talk: true }]],
  card: ['WHICH HOUR\nWOULD HAVE\nSTOPPED YOU?', { at: 0.1, size: 96, y: 520 }],
  props: [['subscribe', 540, 1020, { at: 1.2 }]],
  cam: [[540, 960, 1], [540, 960, 1.02]], pad: 1.4 });

module.exports = { shots: S, meta: {
  title: '72 Hours Without Sleep: What Happens to YOU, Hour by Hour', slug: 'whatifgraphics-short01-72-hours-no-sleep',
  channel: 'whatifgraphics', format: 'vertical Short, second person, hour-by-hour timeline',
  voice: 'en-US-AndrewMultilingualNeural', rate: '+2%', lead: 0.3, pad: 0.35,
  fps: 24, width: 1080, height: 1920, captionY: 0.85, music: 'tense', musicLevel: 0.45 } };
