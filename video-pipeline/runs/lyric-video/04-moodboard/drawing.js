/* The film's one drawing: the road, the steps that land ahead of it, the window, and
   the night that gathers round the window and lights it.

   Load this file; do not copy it:
     <script src=".../styles/stipple-lyric/stipple.js"></script>
     <script src="../04-moodboard/drawing.js"></script>          (from 05-video/)
     draw(document.querySelector('#drawing'));                   once

   draw(root) fills four groups under root:
     <g class="stipple road">    the road, in order from its start to the sill
     <g class="stipple steps">   the larger single dots along it
     <g class="stipple dark">    the night round the window. Its order is a count: a share of 0.45
                                 is 45% of its dots, nearest the pane first (see DARK_SHARES)
     <g class="stipple frame">   the unlit window: on the sheet from frame 0, never grown

   The window is stippled, not ruled. Nothing in it is a line of dots at a pitch: every part
   is a tone (how close the dots stand) with an edge that wanders, set down by Stipple.shade.
   The light is taken to come from the upper left, so the frame's bottom and right members,
   the right shutter and the wall under the sill are the dark places, and the drawing thins
   to scattered points toward its upper left corner.

   Seeded: the same call gives the same dots every time, on every render worker. Changing a
   number here moves dots, and the key frames are then no longer the film. */

const ROAD = 'M160 944 C250 920 345 908 440 884 C520 864 590 864 628 902 C656 930 700 948 760 944 C850 938 925 929 985 888 L1472 552';

/* The window's parts, in px on the 1920x1080 sheet. PANE is the bare paper; WIN is the frame round it. */
const PANE   = { x: 1492, y: 286, w: 186, h: 228 };
const WIN    = { x: 1480, y: 274, w: 210, h: 252 };
const SILL   = { x: 1466, y: 530, w: 238, h: 13 };
const SHUT_L = { x: 1426, y: 280, w: 47, h: 236 };
const SHUT_R = { x: 1697, y: 280, w: 47, h: 236 };
const HOUSE  = { x: 1426, y: 274, w: 318, h: 270 };      // all of the above
const NIGHT  = [1392, 204, 398, 486];                    // the dark never leaves this box: x 1392 to 1790, y 204 to 690
const MULLION = PANE.x + PANE.w / 2, TRANSOM = PANE.y + 97, SLAT = 15.5;

/* Where the dark stands when: its share is the share of its dots that are down. */
const DARK_SHARES = { light: 0.45, pause: 0.50, roadMoves: 0.66, love: 0.80, voiceEnds: 0.93 };

function draw(root) {
  const S = Stipple;
  const sm = (p) => (p <= 0 ? 0 : p >= 1 ? 1 : p * p * (3 - 2 * p));
  const inside = (x, y, R) => Math.min(x - R.x, R.x + R.w - x, y - R.y, R.y + R.h - y);                      // depth inside a part; negative outside
  const outside = (x, y, R) => Math.hypot(Math.max(R.x - x, 0, x - R.x - R.w), Math.max(R.y - y, 0, y - R.y - R.h));
  const n1 = S.noise(41), n2 = S.noise(42), n3 = S.noise(43), n4 = S.noise(44), n5 = S.noise(45);
  // an edge never runs straight: every part is read through a sheet that wanders about 2 px
  const wx = (x, y) => x + 2.1 * n1(x / 23, y / 23) + 0.8 * n3(x / 7, y / 7);
  const wy = (x, y) => y + 2.1 * n2(x / 23, y / 23) + 0.8 * n3(x / 7 + 40, y / 7);
  // the drawing breaks off toward the light: 0 at the upper left corner, 1 from about 200 px away
  const open = (x, y, R, from, over) => sm((Math.hypot(x - R.x, y - R.y) - from) / over);
  const slat = (y) => (((y - SHUT_L.y - 5) % SLAT) + SLAT) % SLAT / SLAT;                                    // 0 at a slat's top, 1 at its foot

  // the road, and the larger steps that land ahead of it (unchanged since the first board)
  S.trail(root.querySelector('.road'), { d: ROAD, seed: 5 });
  S.beads(root.querySelector('.steps'), { d: ROAD, every: 62, r: [4.2, 5.4], seed: 9 });

  /* ---- the unlit window ------------------------------------------------------------ */
  const frame = root.querySelector('.frame');

  // 1. The woodwork: frame, bars, sill, the shutters' edges.
  const wood = (x0, y0) => {
    const x = wx(x0, y0), y = wy(x0, y0);
    const lump = 0.8 + 0.34 * n4(x0 / 9, y0 / 9);
    let t = 0;
    const inWin = inside(x, y, WIN), inPane = inside(x, y, PANE);
    if (inWin >= 0 && inPane < 0) {
      // the frame: heaviest along the bottom and down the right, thinning to points at the upper left
      const side = y > PANE.y + PANE.h ? 1.9 : x > PANE.x + PANE.w ? 1.6 : y < PANE.y ? 0.95 : 1.05;
      t = side * (0.16 + 0.84 * open(x0, y0, WIN, 6, 105));
    }
    // the sill: two rows of dots, the lower one heavy, closed at the ends; its top is paper
    if (x > SILL.x - 1 && x < SILL.x + SILL.w + 1) {
      const top = Math.abs(y - SILL.y), foot = Math.abs(y - (SILL.y + SILL.h));
      if (top < 2.2) t = Math.max(t, 0.9);
      if (foot < 3.2) t = Math.max(t, 1.9);
      if (y > SILL.y && y < SILL.y + SILL.h) {
        if (x < SILL.x + 3.4) t = Math.max(t, 1.0);
        if (x > SILL.x + SILL.w - 4.4) t = Math.max(t, 1.7);
      }
    }
    // the shutters' stiles and rails
    for (const [R, weight] of [[SHUT_L, 0.8], [SHUT_R, 1.15]]) {
      const d = inside(x, y, R);
      if (d < 0 || d > 4.4) continue;
      const fade = R === SHUT_L ? 0.1 + 0.9 * open(x0, y0, R, 4, 120) : 1;
      const shaded = x > R.x + R.w - 4.4 || y > R.y + R.h - 4.4;         // the edges turned from the light
      t = Math.max(t, (shaded ? 1.5 : 0.85) * weight * fade);
    }
    return t * lump;
  };
  S.shade(frame, { tone: wood, box: [1420, 268, 330, 284], tight: 3.3, loose: 15, r: [1.3, 2.7], seed: 61 });

  // 2. The shading, in fine dots: the slats of the shutters and the wall in shadow under the sill.
  const tint = (x0, y0) => {
    const x = wx(x0, y0), y = wy(x0, y0);
    const lump = 0.78 + 0.4 * n4(x0 / 13 + 9, y0 / 13);
    let t = 0;
    if (inside(x, y, PANE) >= 0) {
      // the bars: a thin band of fine dots, swelling and pinching along its length, lighter toward the light
      const wide = 2.5 + 1.5 * n5(x0 / 19, y0 / 19);
      const bars = Math.min(Math.abs(x - MULLION), Math.abs(y - TRANSOM));
      if (bars < wide) t = 1.9 * (1 - 0.5 * bars / wide) * (0.5 + 0.5 * open(x0, y0, WIN, 20, 190));
    }
    for (const [R, weight] of [[SHUT_L, 0.7], [SHUT_R, 1]]) {
      const d = inside(x, y, R);
      if (d < 4.2) continue;
      const fade = R === SHUT_L ? 0.06 + 0.94 * open(x0, y0, R, 10, 130) : 0.82 + 0.18 * (y0 - R.y) / R.h;
      const f = slat(y);
      // each slat: light at its top, turning away, with a line of shadow where it tucks under the next
      t = (f > 0.66 ? 1.7 : 0.06 + 0.5 * f * f) * weight * fade;
    }
    // under the sill: the shadow it casts on the wall, deepest at the right, ragged where it gives out
    const below = y - (SILL.y + SILL.h + 2.5), sx = (x0 - SILL.x) / SILL.w;
    if (below > 0 && sx > -0.01 && sx < 1.05) {
      const depth = 8 + 24 * sm(sx) + 9 * n5(x0 / 24, 7.3);
      if (below < depth) t = Math.max(t, (0.35 + 1.25 * sm(sx)) * Math.pow(1 - below / depth, 1.1));
    }
    // a few stray points off the upper left, where the drawing gives out
    const off = outside(x0, y0, HOUSE);
    if (off > 0 && off < 26 && x0 < MULLION - 30 && y0 < TRANSOM) t = Math.max(t, 0.03 * (1 - off / 26));
    return t * lump;
  };
  S.shade(frame, { tone: tint, box: [1398, 246, 356, 336], tight: 2.7, loose: 17, r: [1.1, 2.0], seed: 62 });

  /* ---- the night: what lights the window, from the word "light" ---------------------- */
  // How far the dark runs from the house in each direction: open toward the upper left,
  // deepest under the sill and to the lower right.
  const REACH = [16, 12, 44, 52, 36, 90, 96, 44];       // left, up-left, up, up-right, right, down-right, down, down-left
  const reach = (x, y) => {
    const a = (Math.atan2(y - (HOUSE.y + HOUSE.h / 2), x - (HOUSE.x + HOUSE.w / 2)) + Math.PI) / (Math.PI / 4);
    const i = Math.floor(a) % 8, f = sm(a - Math.floor(a));
    return REACH[i] + (REACH[(i + 1) % 8] - REACH[i]) * f;
  };
  const night = (x0, y0) => {
    const x = wx(x0, y0), y = wy(x0, y0);
    const lump = 0.84 + 0.3 * n4(x0 / 11 + 3, y0 / 11 + 8);
    // the pane is paper. The dark straggles 3 to 6 px over its edge, never to the same depth twice
    const inPane = inside(x, y, PANE);
    if (inPane > 0) {
      const deep = 2.6 + 3.6 * (0.5 + 0.5 * n5(x0 / 10, y0 / 10));
      return inPane < deep ? 1.6 * Math.pow(1 - inPane / deep, 1.3) : 0;
    }
    // the sill's top is paper too: it catches the light from the pane. Its edges wander
    const lip = 1.3 * n5(x0 / 12, 2.2);
    if (x > SILL.x + 2.5 && x < SILL.x + SILL.w - 3 && y > SILL.y + 2.6 + lip && y < SILL.y + SILL.h - 2.6 + 0.8 * lip) return 0;
    if (inside(x, y, WIN) >= 0) return 1.8 * lump;                       // the frame closes all the way round
    let t;
    const dL = inside(x, y, SHUT_L), dR = inside(x, y, SHUT_R);
    if (dL >= 0 || dR >= 0) {
      // the shutters go dark but keep their slats: the top of each still takes a little light
      const f = slat(y), edge = Math.max(dL, dR) < 4.2;
      t = edge ? 1.5 : f < 0.36 ? 0.3 : 1.5;
      if (dL >= 0) t *= 0.42 + 0.58 * open(x0, y0, SHUT_L, 20, 170);
    } else {
      // the wall: close to solid against the house, giving out raggedly
      const d = outside(x0, y0, HOUSE);
      const far = d / (reach(x0, y0) * (1 + 0.36 * n1(x0 / 61 + 5, y0 / 61) + 0.14 * n2(x0 / 17, y0 / 17 + 5)));
      if (far >= 1) return 0;
      t = 1.8 * Math.pow(1 - far, 1.5);
    }
    // kept clear of the last word on its left and of the sheet's edge on its right
    t *= sm((x0 + 7 * n2(3.3, y0 / 37) - NIGHT[0] - 7) / 24) * sm((NIGHT[0] + NIGHT[2] - 5 - x0 + 5 * n2(8.1, y0 / 29)) / 12);
    return t * lump;
  };
  // The order a hand works in: the darkest places first and nearest the pane, then the rest of the
  // wall thickening. So the window is lit by the first third and the night has its shape early.
  const first = (x, y, t, rand) => 0.36 * (1 - Math.min(1, t / 1.9)) + 0.3 * Math.min(1, outside(x, y, PANE) / 140) + 0.34 * rand();
  S.shade(root.querySelector('.dark'), { tone: night, box: NIGHT, tight: 2.6, loose: 17, r: [1.1, 2.1], seed: 63, k: first, even: true });
}
