// Character designs (rig specs) and pose libraries.
// Each design follows the style bible's four markers: silhouette, colour signature, one prop, name tag.
import { paint } from './rig.js';
import { noisy } from './textures.js';

const P = (g, x, y, c) => { g.fillStyle = c; g.fillRect(x, y, 1, 1); };

// ---------------- builders ----------------
function human(o) {
  const C = o.colors;
  const head = {
    front: (g, w, h, R) => { noisy(g, 0, 0, w, h, C.skin, 0.04, R); },
    top: paint.fur(C.hair, 0.08), back: paint.fur(C.hair, 0.08),
    xp: (g, w, h, R) => { noisy(g, 0, 0, w, h, C.skin, 0.04, R); noisy(g, 0, 0, w, 3, C.hair, 0.08, R); noisy(g, w - 4, 0, 4, 7, C.hair, 0.08, R); },
    xn: (g, w, h, R) => { noisy(g, 0, 0, w, h, C.skin, 0.04, R); noisy(g, 0, 0, w, 3, C.hair, 0.08, R); noisy(g, 0, 0, 4, 7, C.hair, 0.08, R); },
    bottom: C.skin,
  };
  const sleeve = (g, w, h, R) => { noisy(g, 0, 0, w, h, C.top, 0.06, R); noisy(g, 0, h - 3, w, 3, C.skin, 0.04, R); noisy(g, 0, h - 4, w, 1, C.cuff ?? C.top, 0.04, R); };
  const torso = {
    front: (g, w, h, R) => {
      noisy(g, 0, 0, w, h, C.top, 0.06, R);
      noisy(g, 2, 8, 4, 3, C.pocket, 0.04, R);
      [[2, 3], [3, 3], [5, 3], [6, 3], [2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [3, 5], [4, 5], [5, 5], [4, 6]].forEach(([x, y]) => P(g, x, y, C.accent));
    },
    all: paint.fur(C.top, 0.06),
  };
  const leg = paint.feet(C.legs, C.shoes, 2);
  return {
    id: o.id, type: 'human', scale: o.scale ?? 1, color: o.tagColor,
    tagY: 35,
    face: {
      w: 8, h: 8, eyeY: 4, L: 1, R: 5, white: '#ffffff', pupil: C.eye, brow: C.hair, lid: C.skinDark,
      mouth: { y: 6, x: 3, w: 2, c: '#7a3b2e' }, blush: '#f2948a',
      base: (g, R) => { noisy(g, 0, 0, 8, 8, C.skin, 0.03, R); noisy(g, 0, 0, 8, 2, C.hair, 0.08, R); P(g, 0, 2, C.hair); P(g, 7, 2, C.hair); P(g, 0, 3, C.hair); P(g, 7, 3, C.hair); },
    },
    parts: [
      { name: 'legA', pivot: [2, 12, 0], size: [4, 12, 4], off: [0, -6, 0], paint: leg },
      { name: 'legB', pivot: [-2, 12, 0], size: [4, 12, 4], off: [0, -6, 0], paint: leg },
      { name: 'body', pivot: [0, 12, 0], size: [8, 12, 4], off: [0, 6, 0], paint: torso },
      { name: 'armA', parent: 'body', pivot: [5.5, 10, 0], size: [3, 12, 4], off: [0, -4, 0], paint: sleeve },
      { name: 'armB', parent: 'body', pivot: [-5.5, 10, 0], size: [3, 12, 4], off: [0, -4, 0], paint: sleeve },
      { name: 'handA', parent: 'armA', pivot: [0, -10, 0] },
      { name: 'handB', parent: 'armB', pivot: [0, -10, 0] },
      { name: 'neck', parent: 'body', pivot: [0, 12, 0] },
      { name: 'head', parent: 'neck', size: [8, 8, 8], off: [0, 4, 0], paint: head, face: true },
      { name: 'pony', parent: 'neck', pivot: [0, 6, -4], size: [3, 7, 2], off: [0, -3, -1], paint: paint.fur(C.hair, 0.1), rest: [0.25, 0, 0] },
      { name: 'tag', parent: 'neck', pivot: [0, 11, 0] },
    ],
  };
}

// Quadruped: wolf / cat / goat
function quad(o) {
  const { legH, legW } = o;
  const [bw, bh, bl] = o.body;
  const [hw, hh, hd] = o.head;
  const C = o.colors;
  const parts = [
    { name: 'hips', pivot: [0, legH, -bl / 2 + 1] },
    { name: 'body', parent: 'hips', size: o.body, off: [0, bh / 2, bl / 2 - 1], paint: o.bodyPaint ?? paint.fur(C.fur, 0.08) },
    { name: 'neck', parent: 'hips', pivot: [0, bh * 0.72, bl - 1.5] },
    { name: 'head', parent: 'neck', size: o.head, off: [0, hh / 2 - 1, hd / 2 - 1], paint: o.headPaint ?? { all: paint.fur(C.fur, 0.07), front: paint.fur(C.fur, 0.03) }, face: true },
    { name: 'tag', parent: 'neck', pivot: [0, hh + 4, 0] },
    { name: 'fl', parent: 'hips', pivot: [bw / 2 - legW / 2, 0.5, bl - 1 - legW / 2 - 0.5], size: [legW, legH, legW], off: [0, -legH / 2, 0], paint: paint.feet(C.leg ?? C.fur, C.foot ?? C.leg ?? C.fur, 1) },
    { name: 'fr', parent: 'hips', pivot: [-(bw / 2 - legW / 2), 0.5, bl - 1 - legW / 2 - 0.5], size: [legW, legH, legW], off: [0, -legH / 2, 0], paint: paint.feet(C.leg ?? C.fur, C.foot ?? C.leg ?? C.fur, 1) },
    { name: 'bl', pivot: [bw / 2 - legW / 2, legH, -bl / 2 + 1 + legW / 2 + 0.5], size: [legW, legH, legW], off: [0, -legH / 2, 0], paint: paint.feet(C.leg ?? C.fur, C.foot ?? C.leg ?? C.fur, 1) },
    { name: 'br', pivot: [-(bw / 2 - legW / 2), legH, -bl / 2 + 1 + legW / 2 + 0.5], size: [legW, legH, legW], off: [0, -legH / 2, 0], paint: paint.feet(C.leg ?? C.fur, C.foot ?? C.leg ?? C.fur, 1) },
  ];
  if (o.snout) {
    const [sw, sh, sd] = o.snout;
    parts.push({ name: 'snout', parent: 'neck', size: o.snout, off: [0, 0.5 + sh / 2, hd - 1 + sd / 2], paint: o.snoutPaint ?? paint.fur(C.snout ?? C.fur, 0.05) });
    parts.push({ name: 'jawP', parent: 'neck', pivot: [0, 0.5, hd - 1] });
    parts.push({ name: 'jaw', parent: 'jawP', size: [sw - 0.5, 1.5, sd], off: [0, -0.75, sd / 2], paint: paint.fur(C.jaw ?? C.snout ?? C.fur, 0.05) });
  }
  if (o.tail) {
    const [tw, tl, ta] = o.tail;
    parts.push({ name: 'tail', parent: 'hips', pivot: [0, bh - 1.5, -1], size: [tw, tw, tl], off: [0, 0, -tl / 2], rest: [ta, 0, 0], paint: o.tailPaint ?? paint.fur(C.tail ?? C.fur, 0.08) });
  }
  for (const e of o.extras ?? []) parts.push(e);
  return {
    id: o.id, type: 'quad', scale: o.scale ?? 1, color: o.tagColor, dims: { legH, legW, bw, bh, bl, hw, hh, hd },
    face: o.face, parts, tagY: 0,
  };
}

// ---------------- the cast (episode 1) ----------------
export const CAST = {
  ava: human({
    id: 'ava', scale: 0.85, tagColor: '#f2c230',
    colors: { skin: '#e8b48a', skinDark: '#c98f66', hair: '#6b3e1f', top: '#f2c230', cuff: '#d9a91e', pocket: '#d9a91e', accent: '#ff5a7a', legs: '#3b5ba9', shoes: '#4a4a4a', eye: '#3a6ea5' },
  }),

  rex: quad({
    id: 'rex', scale: 1.15, tagColor: '#e74c3c', legH: 7, legW: 3, body: [7, 7, 11], head: [8, 8, 6], snout: [4, 3, 4], tail: [2, 8, 0.9],
    colors: { fur: '#d6d6d6', snout: '#cfcfcf', jaw: '#bdbdbd', leg: '#cfcfcf', foot: '#a8a8a8', tail: '#c4c4c4' },
    bodyPaint: (g, w, h, R) => { noisy(g, 0, 0, w, h, '#d6d6d6', 0.08, R); noisy(g, 0, 0, w, 2, '#a8a8a8', 0.08, R); },
    snoutPaint: { front: (g, w, h, R) => { noisy(g, 0, 0, w, h, '#cfcfcf', 0.04, R); g.fillStyle = '#2b2b2b'; g.fillRect(1, 0, 2, 1); }, all: paint.fur('#cfcfcf', 0.05) },
    face: {
      w: 8, h: 8, eyeY: 3, L: 1, R: 5, white: '#ffffff', pupil: '#2b2b2b', brow: '#8f8f8f', lid: '#9a9a9a', mouth: null,
      base: (g, R) => { noisy(g, 0, 0, 8, 8, '#d6d6d6', 0.05, R); },
    },
    extras: [
      { name: 'earL', parent: 'neck', pivot: [2.5, 7, 1.5], size: [2, 3, 1], off: [0, 1.5, 0], paint: paint.fur('#a8a8a8', 0.05) },
      { name: 'earR', parent: 'neck', pivot: [-2.5, 7, 1.5], size: [2, 3, 1], off: [0, 1.5, 0], paint: paint.fur('#a8a8a8', 0.05) },
      { name: 'collar', parent: 'neck', pivot: [0, -0.5, 0.5], size: [8.5, 2, 4], off: [0, 0, 0], paint: { front: (g, w, h, R) => { noisy(g, 0, 0, w, h, '#c0392b', 0.05, R); g.fillStyle = '#f4c430'; g.fillRect(4, 1, 1, 1); }, all: paint.fur('#c0392b', 0.05) } },
    ],
  }),

  duchess: quad({
    id: 'duchess', scale: 1.3, tagColor: '#f4c430', legH: 5, legW: 2, body: [6, 6, 11], head: [8, 7, 6], snout: [4, 2, 2], tail: [1.5, 10, 1.05],
    colors: { fur: '#e8892b', snout: '#f5e6cc', jaw: '#f5e6cc', leg: '#e8892b', foot: '#f5e6cc', tail: '#e8892b' },
    bodyPaint: paint.stripes('#e8892b', '#c26a1c'),
    tailPaint: paint.stripes('#e8892b', '#c26a1c'),
    headPaint: { all: paint.stripes('#e8892b', '#c26a1c'), front: paint.fur('#e8892b', 0.03) },
    snoutPaint: { top: (g, w, h, R) => { noisy(g, 0, 0, w, h, '#f5e6cc', 0.04, R); g.fillStyle = '#f08aa0'; g.fillRect(1, h - 1, 2, 1); }, front: (g, w, h, R) => { noisy(g, 0, 0, w, h, '#f5e6cc', 0.04, R); g.fillStyle = '#f08aa0'; g.fillRect(1, 0, 2, 1); }, all: paint.fur('#f5e6cc', 0.04) },
    face: {
      w: 8, h: 7, eyeY: 3, L: 1, R: 5, white: '#e9ef7a', pupil: '#1d1d1d', brow: '#9c5414', lid: '#c26a1c', mouth: null,
      base: (g, R) => { noisy(g, 0, 0, 8, 7, '#e8892b', 0.04, R); g.fillStyle = '#c26a1c'; g.fillRect(3, 0, 2, 1); g.fillRect(2, 1, 1, 1); g.fillRect(5, 1, 1, 1); },
    },
    extras: [
      { name: 'earL', parent: 'neck', pivot: [2.5, 6, 1.5], size: [2, 2, 1], off: [0, 1, 0], paint: paint.fur('#c26a1c', 0.05) },
      { name: 'earR', parent: 'neck', pivot: [-2.5, 6, 1.5], size: [2, 2, 1], off: [0, 1, 0], paint: paint.fur('#c26a1c', 0.05) },
      { name: 'crown', parent: 'neck', pivot: [0, 6, 2], size: [4, 1.5, 4], off: [0, 0.75, 0], paint: (g, w, h, R) => { noisy(g, 0, 0, w, h, '#f4c430', 0.08, R); g.fillStyle = '#e74c3c'; g.fillRect(1, 0, 1, 1); } },
      { name: 'crownA', parent: 'crown', pivot: [-1.5, 1.5, 1.5], size: [1, 1.2, 1], off: [0, 0.6, 0], paint: '#f4c430' },
      { name: 'crownB', parent: 'crown', pivot: [1.5, 1.5, 1.5], size: [1, 1.2, 1], off: [0, 0.6, 0], paint: '#f4c430' },
      { name: 'crownC', parent: 'crown', pivot: [0, 1.5, 1.5], size: [1, 1.6, 1], off: [0, 0.8, 0], paint: '#f4c430' },
    ],
  }),

  greg: quad({
    id: 'greg', scale: 1.1, tagColor: '#bfbfbf', legH: 10, legW: 3, body: [8, 9, 13], head: [8, 8, 7], snout: [5, 3, 3], tail: [2, 3, 1.3],
    colors: { fur: '#ecebe4', snout: '#e2e0d6', jaw: '#d8d5c8', leg: '#ecebe4', foot: '#5a4a3a' },
    bodyPaint: (g, w, h, R) => { noisy(g, 0, 0, w, h, '#ecebe4', 0.07, R); noisy(g, (w * 0.6) | 0, 2, 3, 3, '#cfcac0', 0.05, R); },
    face: {
      w: 8, h: 8, eyeY: 3, L: 1, R: 5, white: '#e8cf3a', pupil: '#202020', brow: '#a39f94', lid: '#cfcac0', mouth: null,
      base: (g, R) => { noisy(g, 0, 0, 8, 8, '#ecebe4', 0.04, R); },
    },
    extras: [
      { name: 'hornL', parent: 'neck', pivot: [2, 6.5, 1.5], size: [1.5, 1.5, 6], off: [0, 0, -3], rest: [0.95, 0.15, 0], paint: paint.fur('#b5a88f', 0.08) },
      { name: 'hornR', parent: 'neck', pivot: [-2, 6.5, 1.5], size: [1.5, 1.5, 6], off: [0, 0, -3], rest: [0.95, -0.15, 0], paint: paint.fur('#b5a88f', 0.08) },
      { name: 'earL', parent: 'neck', pivot: [4, 4.5, 2], size: [3, 1, 2], off: [1.5, 0, 0], rest: [0, 0, -0.4], paint: paint.fur('#dedbd0', 0.05) },
      { name: 'earR', parent: 'neck', pivot: [-4, 4.5, 2], size: [3, 1, 2], off: [-1.5, 0, 0], rest: [0, 0, 0.4], paint: paint.fur('#dedbd0', 0.05) },
      { name: 'beard', parent: 'neck', pivot: [0, -1, 7.5], size: [2, 3, 1], off: [0, -1.5, 0], paint: paint.fur('#d8d5c8', 0.06) },
      { name: 'bell', parent: 'neck', pivot: [0, -1.5, 2.5], size: [2.2, 2.2, 2.2], off: [0, -1.1, 0], paint: (g, w, h, R) => { noisy(g, 0, 0, w, h, '#f4c430', 0.1, R); g.fillStyle = '#7a5a10'; g.fillRect(0, h - 1, w, 1); } },
      // stray-dog disguise (hidden until the button)
      { name: 'coat', parent: 'hips', size: [10, 10.5, 15], off: [0, 4.5, 5.5], paint: (g, w, h, R) => { noisy(g, 0, 0, w, h, '#7a5532', 0.22, R); for (let i = 0; i < w * h / 4; i++) { g.fillStyle = '#5a3c20'; g.fillRect((R() * w) | 0, (R() * h) | 0, 1, 1); } } },
      { name: 'mask', parent: 'neck', size: [9.5, 9.5, 1], off: [0, 3, 9.6], paint: { front: (g, w, h, R) => {
        noisy(g, 0, 0, w, h, '#7a5532', 0.15, R);
        noisy(g, 2, 6, 6, 4, '#a07850', 0.08, R);
        // big sad puppy eyes
        [[1, 3], [6, 3]].forEach(([x, y]) => { g.fillStyle = '#1a1a1a'; g.fillRect(x, y, 2, 2); g.fillStyle = '#ffffff'; g.fillRect(x + 1, y, 1, 1); g.fillStyle = '#7fd3ff'; g.fillRect(x, y + 2, 1, 1); });
        g.fillStyle = '#5a3c20'; g.fillRect(1, 2, 1, 1); g.fillRect(2, 1, 1, 1); g.fillRect(7, 1, 1, 1); g.fillRect(8, 2, 1, 1);
        g.fillStyle = '#111'; g.fillRect(4, 6, 2, 1);
        g.fillStyle = '#5a3c20'; g.fillRect(3, 8, 4, 1);
      }, all: paint.fur('#7a5532', 0.15) } },
      { name: 'flopL', parent: 'neck', pivot: [5, 7, 3], size: [1.5, 5, 3], off: [0.5, -2.5, 0], rest: [0, 0, 0.2], paint: paint.fur('#5a3c20', 0.12) },
      { name: 'flopR', parent: 'neck', pivot: [-5, 7, 3], size: [1.5, 5, 3], off: [-0.5, -2.5, 0], rest: [0, 0, -0.2], paint: paint.fur('#5a3c20', 0.12) },
    ],
  }),

  pico: {
    id: 'pico', type: 'bird', scale: 2.0, color: '#2f6fe0', tagY: 0,
    face: {
      w: 6, h: 6, eyeY: 2, L: 0, R: 4, white: '#ffffff', pupil: '#1a1a1a', brow: '#9a2a20', lid: '#b02f24', mouth: null,
      base: (g, R) => { noisy(g, 0, 0, 6, 6, '#d33a2c', 0.06, R); noisy(g, 0, 1, 6, 3, '#f3f3f3', 0.03, R); },
    },
    parts: [
      { name: 'legL', pivot: [1, 2, 0], size: [1, 2, 1], off: [0, -1, 0], paint: '#555555' },
      { name: 'legR', pivot: [-1, 2, 0], size: [1, 2, 1], off: [0, -1, 0], paint: '#555555' },
      { name: 'body', pivot: [0, 2, 0], size: [4, 6, 4], off: [0, 3, 0], rest: [-0.15, 0, 0], paint: paint.fur('#d33a2c', 0.07) },
      { name: 'neck', parent: 'body', pivot: [0, 6, 0] },
      { name: 'head', parent: 'neck', size: [6, 6, 6], off: [0, 3, 0.5], paint: { all: paint.fur('#d33a2c', 0.06) }, face: true },
      { name: 'beak', parent: 'neck', size: [2, 2, 2], off: [0, 2.5, 4.5], paint: '#e8e2d0' },
      { name: 'jawP', parent: 'neck', pivot: [0, 1.5, 3.5] },
      { name: 'jaw', parent: 'jawP', size: [2, 1, 1.6], off: [0, -0.5, 0.8], paint: '#3a3a3a' },
      { name: 'hat', parent: 'neck', pivot: [0, 6, 0.5], size: [7, 2, 5], off: [0, 1, 0], paint: { front: (g, w, h, R) => { noisy(g, 0, 0, w, h, '#1e1e1e', 0.05, R); g.fillStyle = '#ffffff'; g.fillRect(3, 0, 1, 1); g.fillStyle = '#f4c430'; g.fillRect(0, h - 1, w, 1); }, all: paint.fur('#1e1e1e', 0.05) } },
      { name: 'wingL', parent: 'body', pivot: [2.5, 5.5, 0], size: [1, 5, 4], off: [0, -2.5, 0], paint: paint.band('#2f5fd0', '#f2c230', 1, 1) },
      { name: 'wingR', parent: 'body', pivot: [-2.5, 5.5, 0], size: [1, 5, 4], off: [0, -2.5, 0], paint: paint.band('#2f5fd0', '#f2c230', 1, 1) },
      { name: 'tail', parent: 'body', pivot: [0, 1, -2], size: [2, 1, 5], off: [0, 0, -2.5], rest: [-0.9, 0, 0], paint: paint.band('#2f5fd0', '#d33a2c', 0, 1) },
      { name: 'tag', parent: 'neck', pivot: [0, 10, 0] },
      { name: 'grip', parent: 'body', pivot: [0, -1, 0] },
    ],
  },

  lou: {
    id: 'lou', type: 'axo', scale: 1.2, color: '#f48fb8', tagY: 0,
    face: {
      w: 8, h: 5, eyeY: 2, L: 1, R: 5, white: '#ffffff', pupil: '#1a1a1a', brow: '#d0709a', lid: '#c76690',
      mouth: { y: 4, x: 2, w: 4, c: '#a8416c' },
      base: (g, R) => { noisy(g, 0, 0, 8, 5, '#f4a6c6', 0.04, R); },
    },
    parts: [
      { name: 'bucket', size: [10, 10, 10], off: [0, 5, 0], paint: {
        top: (g, w, h, R) => { noisy(g, 0, 0, w, h, '#3a6fd8', 0.08, R); g.fillStyle = '#8f8f8f'; g.fillRect(0, 0, w, 1); g.fillRect(0, h - 1, w, 1); g.fillRect(0, 0, 1, h); g.fillRect(w - 1, 0, 1, h); },
        all: (g, w, h, R) => { noisy(g, 0, 0, w, h, '#c4c4c4', 0.05, R); g.fillStyle = '#8f8f8f'; g.fillRect(0, 0, w, 1); g.fillRect(0, h - 1, w, 1); g.fillStyle = '#d9d9d9'; g.fillRect(1, 1, 1, h - 2); },
      } },
      { name: 'handleL', pivot: [4.6, 10, 0], size: [0.6, 3, 0.6], off: [0, 1.5, 0], paint: '#8f8f8f' },
      { name: 'handleR', pivot: [-4.6, 10, 0], size: [0.6, 3, 0.6], off: [0, 1.5, 0], paint: '#8f8f8f' },
      { name: 'handleT', pivot: [0, 13, 0], size: [9.8, 0.6, 0.6], paint: '#8f8f8f' },
      { name: 'neck', pivot: [0, 8.5, 0] },
      { name: 'head', parent: 'neck', size: [8, 5, 6], off: [0, 2.5, 0.5], paint: { all: (g, w, h, R) => { noisy(g, 0, 0, w, h, '#f4a6c6', 0.05, R); g.fillStyle = '#e48ab0'; g.fillRect(1, 1, 1, 1); g.fillRect(w - 2, 2, 1, 1); } }, face: true },
      { name: 'gill1', parent: 'neck', pivot: [4, 4.5, 0], size: [3, 1, 1], off: [1.5, 0, 0], rest: [0, 0, 0.5], paint: '#e0507f' },
      { name: 'gill2', parent: 'neck', pivot: [4, 3, 0], size: [3, 1, 1], off: [1.5, 0, 0], rest: [0, 0, 0.05], paint: '#e0507f' },
      { name: 'gill3', parent: 'neck', pivot: [4, 1.5, 0], size: [3, 1, 1], off: [1.5, 0, 0], rest: [0, 0, -0.4], paint: '#e0507f' },
      { name: 'gill4', parent: 'neck', pivot: [-4, 4.5, 0], size: [3, 1, 1], off: [-1.5, 0, 0], rest: [0, 0, -0.5], paint: '#e0507f' },
      { name: 'gill5', parent: 'neck', pivot: [-4, 3, 0], size: [3, 1, 1], off: [-1.5, 0, 0], rest: [0, 0, -0.05], paint: '#e0507f' },
      { name: 'gill6', parent: 'neck', pivot: [-4, 1.5, 0], size: [3, 1, 1], off: [-1.5, 0, 0], rest: [0, 0, 0.4], paint: '#e0507f' },
      { name: 'tag', parent: 'root', pivot: [0, 18, 0] },
    ],
  },
};

// ---------------- poses ----------------
// A pose returns {rot:{part:[x,y,z]}, pos:{part:[dx,dy,dz] px}, scl:{part:[x,y,z]}, rootY:px, rootTilt:[x,z]}
function quadSit(d, a = 0.55) {
  const drop = d.legH - 1.2;
  const zf = d.bl - 1 - d.legW / 2 - 0.5;
  const L = (d.legH - drop) + zf * Math.sin(a) + 0.3;
  return { rot: { hips: [-a, 0, 0], neck: [a, 0, 0], fl: [a, 0, 0], fr: [a, 0, 0], bl: [-1.45, 0, 0], br: [-1.45, 0, 0] }, scl: { fl: [1, L / d.legH, 1], fr: [1, L / d.legH, 1] }, rootY: -drop };
}

export const POSES = {
  human: {
    stand: () => ({}),
    holdCard: () => ({ rot: { armA: [-1.1, 0, -0.1] } }),
    holdSign: () => ({ rot: { armA: [-2.7, 0, -0.15], armB: [-2.7, 0, 0.15] } }),
    point: () => ({ rot: { armA: [-1.55, 0.1, 0] } }),
    wave: () => ({ rot: { armA: [-2.6, 0, -0.5] } }),
    cheer: () => ({ rot: { armA: [-2.8, 0, -0.4], armB: [-2.8, 0, 0.4] } }),
    shrug: () => ({ rot: { armA: [-0.4, 0, -0.6], armB: [-0.4, 0, 0.6], neck: [0, 0, 0.15] } }),
    facepalm: () => ({ rot: { armA: [-2.3, 0.6, 0.3], neck: [0.35, 0, 0] } }),
    wipe: () => ({ rot: { armA: [-2.0, 0.5, 0.4], neck: [0.2, 0, 0] } }),
    reach: () => ({ rot: { armA: [-1.3, 0, 0], armB: [-1.3, 0, 0], neck: [0.25, 0, 0] } }),
    carry: () => ({ rot: { armA: [-0.9, 0, 0.25], armB: [-0.9, 0, -0.25] } }),
    windup: () => ({ rot: { armA: [-3.0, 0, -0.2], body: [-0.12, 0, 0] } }),
    throw: () => ({ rot: { armA: [-1.0, 0, 0], body: [0.15, 0, 0] } }),
    kneel: () => ({ rot: { legA: [-1.5, 0, 0], legB: [0.2, 0, 0] }, pos: { legB: [0, 0, 0] }, rootY: -5 }),
    fallen: () => ({ rot: { armA: [-3.0, 0, -0.6], armB: [-3.0, 0, 0.6], legA: [0.2, 0, 0], legB: [-0.2, 0, 0] }, rootTilt: [-1.5, 0], rootY: 2 }),
    whisper: () => ({ rot: { armA: [-2.4, 0.4, 0.25], neck: [0.1, 0, 0] } }),
  },
  quad: {
    stand: () => ({}),
    sit: (d) => quadSit(d),
    beg: (d) => { const p = quadSit(d, 0.75); p.rot.fl = [-0.6, 0, 0.1]; p.rot.fr = [-0.6, 0, -0.1]; p.scl = {}; return p; },
    howl: (d) => { const p = quadSit(d); p.rot.neck = [0.55 - 0.95, 0, 0]; return p; },
    lookUp: (d) => { const p = quadSit(d); p.rot.neck = [0.55 - 0.35, 0, 0]; return p; },
    lie: (d) => ({ rot: { fl: [-1.45, 0, 0], fr: [-1.45, 0, 0], bl: [-1.45, 0, 0], br: [-1.45, 0, 0], neck: [0.15, 0, 0] }, rootY: -(d.legH - 1) }),
    flat: (d) => ({ rot: { fl: [-1.45, 0, 0.3], fr: [-1.45, 0, -0.3], bl: [1.45, 0, 0], br: [1.45, 0, 0], neck: [0.5, 0, 0] }, rootY: -(d.legH - 0.5) }),
    ram: () => ({ rot: { neck: [0.75, 0, 0], fl: [-0.5, 0, 0], fr: [-0.5, 0, 0], bl: [0.5, 0, 0], br: [0.5, 0, 0] } }),
    swipe: (d) => { const p = quadSit(d); p.rot.fl = [-1.4, 0, 0.2]; p.scl = { fr: p.scl.fr }; return p; },
    ride: (d) => quadSit(d, 0.2),
  },
  bird: {
    stand: () => ({}),
    fly: () => ({ rot: { body: [1.05, 0, 0], neck: [-0.95, 0, 0], legL: [0.9, 0, 0], legR: [0.9, 0, 0], tail: [0.5, 0, 0] } }),
    squawk: () => ({ rot: { neck: [-0.35, 0, 0], wingL: [0, 0, -1.2], wingR: [0, 0, 1.2] } }),
    point: () => ({ rot: { wingL: [-1.2, 0, -0.4] } }),
    shy: () => ({ rot: { neck: [0.35, 0, 0.2], wingL: [0, 0, -0.2], wingR: [0, 0, 0.2] } }),
  },
  axo: {
    stand: () => ({}),
    asleep: () => ({ rot: { neck: [0.3, 0, 0] }, pos: { neck: [0, 0.2, 0] } }),
    peek: () => ({ pos: { neck: [0, 1.0, 0] } }),
    up: () => ({ pos: { neck: [0, 2.6, 0] }, rot: { neck: [-0.12, 0, 0] } }),
  },
};
