/* world.js: the scene of the low-poly first-person kit, drawn with three.js.
 *
 * One place, seen from where you stand: a snow field at night, a line of fence
 * posts running to a notched ridge, one boulder, stars, falling snow. You are
 * the thing that changes. One function sets the whole world from two numbers,
 * your temperature and the time, so the same input always draws the same frame:
 *
 *   const world = LowPoly.World.create({ canvas, width: 1080, height: 1920 });
 *   const state = world.set(tempC, t, pose);      // draws the frame, returns the state it drew
 *   hud.set({ ..., look: state.words });          // ink and scrims for the words over this frame
 *
 *   tempC   your temperature in °C. It decides everything that has happened to
 *           the field: see LowPoly.World.state(tempC) and the CURVES table below.
 *   t       seconds. It only moves things that move by themselves: falling snow,
 *           steam, flames, sparks, the travelling rings, the grain. Give it the
 *           film time (the cold open gives the time it is replaying).
 *   pose    what temperature cannot know:
 *             yaw, pitch   where you look, in degrees (yaw + is right, pitch + is down)
 *             hand         0 to 1, your palm coming up into the bottom of the frame
 *             flakes       snowflakes on the palm: [{ slot: 0, p: 0.4 }]; p from -1 (half a
 *                          metre above the palm) to 0 (landed) to 1 (a bead of water)
 *             release      0 to 1, the white coming apart into snowfall (the close). Give the
 *                          world 37 °C while it runs; the counter spins down by itself
 *             fov          vertical field of view in degrees (default 80)
 *
 * Nothing here reads a clock or Math.random. Every placement is seeded.
 * Colours are computed for each flat face on the processor and drawn unlit, so
 * a face is one colour and the picture is the same on any machine.
 *
 * Needs three.js loaded first (vendor/node_modules/three/build/three.min.js).
 */
(function () {
  'use strict';
  const LP = (window.LowPoly = window.LowPoly || {});
  const T3 = window.THREE;

  // ---------- small maths, all deterministic ---------------------------
  const clamp = (v, a, b) => Math.min(b === undefined ? 1 : b, Math.max(a === undefined ? 0 : a, v));
  const lerp = (a, b, p) => a + (b - a) * p;
  const smooth = (a, b, v) => { const p = clamp((v - a) / (b - a)); return p * p * (3 - 2 * p); };
  function hash(i, s) {                       // 0..1 from two integers
    let h = (Math.imul(i | 0, 374761393) + Math.imul((s | 0) + 1, 668265263)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }
  function vnoise(x, s) {                     // smooth 0..1 noise along a line
    const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
    return lerp(hash(i, s), hash(i + 1, s), u);
  }
  /* A value that follows temperature: straight lines between [°C, value] points,
     in the logarithm of the temperature. */
  function curve(pts, T) {
    if (T <= pts[0][0]) return pts[0][1];
    for (let i = 1; i < pts.length; i++) {
      if (T <= pts[i][0]) {
        const p = (Math.log10(T) - Math.log10(pts[i - 1][0])) / (Math.log10(pts[i][0]) - Math.log10(pts[i - 1][0]));
        return lerp(pts[i - 1][1], pts[i][1], p);
      }
    }
    return pts[pts.length - 1][1];
  }
  function colourCurve(pts, T) {
    const out = [0, 0, 0];
    for (let k = 0; k < 3; k++) out[k] = curve(pts.map((p) => [p[0], p[1][k]]), T);
    return out;
  }
  const hex = (h) => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];

  // ---------- what temperature does to the field ------------------------
  /* Distances are metres from where you stand. Each row is [°C, value]. The
     script's stages sit at 41, 100, 525, 800, 1,000, 1,538, 5,500, 28,000,
     15 million, 4 trillion and 1.4e32; retune a row here and every frame follows. */
  const CURVES = {
    // the air round you that falling snow no longer reaches
    bubble:  [[39.6, 0], [41, 0.8], [100, 1.5], [525, 5], [1000, 14], [1538, 40], [1900, 200]],
    // how far the snow has melted off the ground
    melt:    [[60, 0], [100, 0.95], [104, 1.45], [108, 1.9], [420, 2.5], [525, 3.0], [800, 5.6], [1000, 10.6],
              [1210, 15.6], [1538, 25], [1900, 42], [3200, 500], [5000, 6000]],
    // steam: 0 none, 1 thick
    steam:   [[96, 0], [100, 0.75], [112, 1], [525, 0.85], [1000, 0.4], [1900, 0]],
    // the light you give off: how bright it is where you stand, and how far it carries
    level:   [[500, 0], [525, 0.42], [540, 0.6], [650, 0.9], [1000, 1.05], [5500, 1.3], [9500, 1.5]],
    reach:   [[525, 1.3], [540, 1.7], [650, 5.4], [800, 8.5], [1000, 12], [1210, 16], [1538, 26], [1900, 44],
              [3200, 400], [5500, 9000]],
    // how far your eyes have closed down to the dark: 1 = the night is black beside your light
    adapt:   [[525, 0], [650, 0.32], [800, 0.5], [1210, 0.7], [1900, 0.9], [5500, 1]],
    // posts: charred inside this distance, burning inside this, burnt to stumps, burnt out
    char:    [[700, 0], [1000, 1.2], [1210, 5.6], [1538, 11], [1900, 17], [5500, 3000]],
    fire:    [[1150, 0], [1210, 2.4], [1538, 6.5], [1900, 11.5], [5500, 47], [5660, 58], [9500, 400]],
    stump:   [[1900, 0], [5500, 13], [5660, 17], [9500, 90], [20000, 600]],
    burnout: [[5660, 0], [5760, 1.2], [9500, 62], [20000, 3000]],
    // the ground glowing by itself round your feet
    glow:    [[1900, 0], [3200, 1.3], [5500, 3.6], [5660, 5.2], [9500, 34], [20000, 400]],
    // everything inside this distance has bleached to white
    bleach:  [[9500, 0], [14000, 6], [20000, 45], [28500, 170], [100000, 1200], [300000, 2100], [1000000, 7000]],
    skyWhite: [[20000, 0], [28500, 0.1], [100000, 0.72], [250000, 1]],
    stars:   [[525, 1], [1000, 0.55], [1900, 0.1], [3200, 0]],
    // the frame itself, once nothing is left to see: white, rings, grain
    veil:    [[400000, 0], [1000000, 1]],
    rings:   [[700000, 0], [1500000, 1], [3e10, 1], [1e11, 0]],
    grain:   [[5e10, 0], [1e11, 0.5], [4e12, 1], [1e32, 1.25]],
    grainCell: [[1e11, 7], [4e12, 5], [1e20, 3], [1e32, 2]],
    grainRate: [[1e11, 10], [4e12, 12], [1e32, 30]],
  };
  /* The colour of your light. Red is the coolest glow there is. */
  const LIGHT = [
    [525, hex('#a3180a')], [650, hex('#cf260c')], [800, hex('#ee4d10')], [1000, hex('#fb7d1c')],
    [1210, hex('#ffab30')], [1538, hex('#ffc955')], [1900, hex('#ffd97a')], [5500, hex('#fff1c9')],
    [9500, hex('#ffffff')], [28500, hex('#dfe9ff')], [1e6, hex('#e3ecff')], [4e12, hex('#f4f6fb')], [1e32, hex('#fbfaf6')],
  ];
  const GLOW = [[1900, hex('#7a2408')], [3200, hex('#c2470f')], [5500, hex('#e0701c')], [9500, hex('#ffc45a')], [20000, hex('#fff3d6')]];
  const EDGE_C = 1.3e32;       // at and above this the grain stops: flat white

  const NIGHT = {
    ambient: [0.2, 0.285, 0.47],              // starlight on a white surface
    zenith: hex('#03050b'), horizon: hex('#121d36'),
    snow: [0.92, 0.95, 1.0], wet: [0.3, 0.27, 0.26], earth: [0.66, 0.53, 0.39], scorched: [0.17, 0.12, 0.09],
    wood: [0.34, 0.27, 0.21], charred: [0.035, 0.03, 0.03], rock: [0.3, 0.3, 0.33], ridgeRock: [0.5, 0.41, 0.32],
  };

  /* Everything the field is at a temperature. Pure: no time, no pose. */
  function state(tempC) {
    const T = Math.max(1, tempC), s = { tempC: T };
    for (const k in CURVES) s[k] = curve(CURVES[k], T);
    s.light = colourCurve(LIGHT, T);
    s.glowColour = colourCurve(GLOW, T);
    s.flat = T >= EDGE_C;                     // the last stage: the plainest picture in the film
    if (s.flat) s.grain = 0;
    s.white = colourCurve(LIGHT, Math.max(T, 9500));
    /* The words over this frame. The ground whitens before the sky does, so the
       line goes to dark ink first (at 20,000 °C, between two lines) and the
       counters follow (at 120,000 °C). Until then a scrim holds the contrast. */
    const lit = clamp(s.level / 1.05);
    s.words = {
      line: T >= 20000 ? 'dark' : 'light',
      counters: T >= 120000 ? 'dark' : 'light',
      lineScrim: T >= 20000 ? 0 : lerp(0.34, 0.8, Math.max(lit, s.steam * 0.5)),
      topScrim: T >= 120000 ? 0 : lerp(0.3, 0.62, Math.max(s.steam * 0.75, smooth(20000, 110000, T))),
    };
    return s;
  }

  // ---------- drawing helpers -------------------------------------------
  /* A batch of flat triangles painted on the processor. */
  function Batch(maxTris, alpha, material) {
    this.max = maxTris; this.n = 0; this.cs = alpha ? 4 : 3;
    this.pos = new Float32Array(maxTris * 9);
    this.col = new Float32Array(maxTris * 3 * this.cs);
    const g = (this.geo = new T3.BufferGeometry());
    g.setAttribute('position', new T3.BufferAttribute(this.pos, 3).setUsage(T3.DynamicDrawUsage));
    g.setAttribute('color', new T3.BufferAttribute(this.col, this.cs).setUsage(T3.DynamicDrawUsage));
    const m = new T3.MeshBasicMaterial(Object.assign({ vertexColors: true, side: T3.DoubleSide }, material || {}));
    if (alpha) { m.transparent = true; m.depthWrite = false; }
    this.mesh = new T3.Mesh(g, m); this.mesh.frustumCulled = false;
  }
  Batch.prototype.reset = function () { this.n = 0; };
  Batch.prototype.tri = function (ax, ay, az, bx, by, bz, cx, cy, cz, r, g, b, a) {
    if (this.n >= this.max) return;
    const p = this.pos, c = this.col, i = this.n * 9, cs = this.cs;
    p[i] = ax; p[i + 1] = ay; p[i + 2] = az; p[i + 3] = bx; p[i + 4] = by; p[i + 5] = bz; p[i + 6] = cx; p[i + 7] = cy; p[i + 8] = cz;
    let j = this.n * 3 * cs;
    for (let k = 0; k < 3; k++) { c[j] = r; c[j + 1] = g; c[j + 2] = b; if (cs === 4) c[j + 3] = a; j += cs; }
    this.n++;
  };
  Batch.prototype.paint = function (face, r, g, b) {   // recolour a face that keeps its place
    const c = this.col; let j = face * 9;
    for (let k = 0; k < 3; k++) { c[j] = r; c[j + 1] = g; c[j + 2] = b; j += 3; }
  };
  Batch.prototype.done = function (keepPositions) {
    this.geo.setDrawRange(0, this.n * 3);
    if (!keepPositions) this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.color.needsUpdate = true;
  };

  /* Soft things (snowflakes, steam, smoke, sparks, stars): squares that face you. */
  function Sprites(max, texture, additive) {
    this.max = max; this.n = 0;
    this.pos = new Float32Array(max * 18); this.uv = new Float32Array(max * 12); this.col = new Float32Array(max * 24);
    const g = (this.geo = new T3.BufferGeometry());
    g.setAttribute('position', new T3.BufferAttribute(this.pos, 3).setUsage(T3.DynamicDrawUsage));
    g.setAttribute('uv', new T3.BufferAttribute(this.uv, 2));
    g.setAttribute('color', new T3.BufferAttribute(this.col, 4).setUsage(T3.DynamicDrawUsage));
    const q = [0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1];
    for (let i = 0; i < max; i++) this.uv.set(q, i * 12);
    const m = new T3.MeshBasicMaterial({ map: texture, vertexColors: true, transparent: true, depthWrite: false, side: T3.DoubleSide });
    if (additive) m.blending = T3.AdditiveBlending;
    this.mesh = new T3.Mesh(g, m); this.mesh.frustumCulled = false;
    this.rx = 1; this.ry = 0; this.rz = 0; this.ux = 0; this.uy = 1; this.uz = 0;
  }
  Sprites.prototype.reset = function (camera) {
    this.n = 0;
    if (camera) {
      const e = camera.matrixWorld.elements;
      this.rx = e[0]; this.ry = e[1]; this.rz = e[2]; this.ux = e[4]; this.uy = e[5]; this.uz = e[6];
    }
  };
  Sprites.prototype.add = function (x, y, z, size, r, g, b, a) {
    if (this.n >= this.max || a <= 0.003) return;
    const h = size / 2, p = this.pos, c = this.col, i = this.n * 18;
    const rx = this.rx * h, ry = this.ry * h, rz = this.rz * h, ux = this.ux * h, uy = this.uy * h, uz = this.uz * h;
    const corner = (k, sx, sy) => { p[i + k * 3] = x + rx * sx + ux * sy; p[i + k * 3 + 1] = y + ry * sx + uy * sy; p[i + k * 3 + 2] = z + rz * sx + uz * sy; };
    corner(0, -1, -1); corner(1, 1, -1); corner(2, 1, 1); corner(3, -1, -1); corner(4, 1, 1); corner(5, -1, 1);
    let j = this.n * 24;
    for (let k = 0; k < 6; k++) { c[j] = r; c[j + 1] = g; c[j + 2] = b; c[j + 3] = a; j += 4; }
    this.n++;
  };
  Sprites.prototype.done = function () {
    this.geo.setDrawRange(0, this.n * 6);
    this.geo.attributes.position.needsUpdate = true; this.geo.attributes.color.needsUpdate = true;
  };

  function dotTexture(soft) {                // a round dot: crisp for flakes and stars, soft for steam
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    if (soft) { g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,0.62)'); g.addColorStop(0.7, 'rgba(255,255,255,0.2)'); g.addColorStop(1, 'rgba(255,255,255,0)'); }
    else { g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.55, 'rgba(255,255,255,1)'); g.addColorStop(0.8, 'rgba(255,255,255,0.35)'); g.addColorStop(1, 'rgba(255,255,255,0)'); }
    x.fillStyle = g; x.fillRect(0, 0, 64, 64);
    const t = new T3.CanvasTexture(c); t.generateMipmaps = true; return t;
  }

  // ---------- the place ---------------------------------------------------
  const EYE = 1.62, BODY = 1.0;                // eye height; the height your light comes from
  const FENCE_X = -0.55, POSTS = 90;           // the fence passes half a metre to your left
  const BOULDER = { x: 3.3, z: -12.6, r: 0.95 };

  function buildGround() {
    const NA = 96, NR = 83, R0 = 0.35, K = 1.115;
    const vx = [], vy = [], vz = [], vv = [];
    const id = (i, j) => (((i % NA) + NA) % NA) + j * NA;
    for (let j = 0; j < NR; j++) {
      const r = R0 * Math.pow(K, j);
      for (let i = 0; i < NA; i++) {
        const a = (i + (hash(i, j * 7 + 1) - 0.5) * 0.62) * Math.PI * 2 / NA;
        const rr = r * (1 + (hash(i, j * 7 + 2) - 0.5) * 0.075);
        const relief = (hash(i, j * 7 + 3) - 0.5) * r * 0.115;
        vx.push(Math.sin(a) * rr); vz.push(-Math.cos(a) * rr);
        vy.push(relief * 0.42 * smooth(320, 1100, r));          // real rise and fall, far off only
        vv.push(relief * 0.9);                                  // the facets near you: shading only
      }
    }
    const faces = [];
    const add = (a, b, c) => faces.push([a, b, c]);
    for (let i = 0; i < NA; i++) add(-1, id(i, 0), id(i + 1, 0));
    for (let j = 0; j < NR - 1; j++) for (let i = 0; i < NA; i++) {
      const a = id(i, j), b = id(i + 1, j), c = id(i + 1, j + 1), d = id(i, j + 1);
      if (hash(i, j * 7 + 4) < 0.5) { add(a, b, c); add(a, c, d); } else { add(a, b, d); add(b, c, d); }
    }
    const n = faces.length, batch = new Batch(n, false);
    const f = { n, d: new Float32Array(n), facet: new Float32Array(n), toYou: new Float32Array(n), r1: new Float32Array(n), r2: new Float32Array(n), batch };
    const P = (k) => (k < 0 ? [0, 0, 0, 0] : [vx[k], vy[k], vz[k], vv[k]]);
    const key = [-0.5, 0.75, -0.43];
    for (let q = 0; q < n; q++) {
      const A = P(faces[q][0]), B = P(faces[q][1]), C = P(faces[q][2]);
      batch.tri(A[0], A[1], A[2], B[0], B[1], B[2], C[0], C[1], C[2], 0, 0, 0);
      const cx = (A[0] + B[0] + C[0]) / 3, cz = (A[2] + B[2] + C[2]) / 3, d = Math.hypot(cx, cz);
      const e1 = [B[0] - A[0], B[1] + B[3] - A[1] - A[3], B[2] - A[2]], e2 = [C[0] - A[0], C[1] + C[3] - A[1] - A[3], C[2] - A[2]];
      let nx = e1[1] * e2[2] - e1[2] * e2[1], ny = e1[2] * e2[0] - e1[0] * e2[2], nz = e1[0] * e2[1] - e1[1] * e2[0];
      const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
      if (ny < 0) { nx = -nx; ny = -ny; nz = -nz; }
      f.d[q] = d;
      f.facet[q] = clamp((nx * key[0] + ny * key[1] + nz * key[2] - 0.75) / 0.2, -1, 1);
      f.toYou[q] = d > 0.01 ? clamp(-(nx * cx + nz * cz) / d / 0.22, -1, 1) : 0;
      f.r1[q] = hash(q, 11); f.r2[q] = hash(q, 12);
    }
    batch.geo.attributes.position.needsUpdate = true;
    return f;
  }

  function ridgeHeight(a) {                    // metres, by bearing in radians (0 = along the fence)
    const u = a * 3.1 + 40;
    let h = 215 + 120 * (vnoise(u, 5) - 0.5) + 70 * (vnoise(u * 3.3, 6) - 0.5);
    h -= 120 * Math.exp(-Math.pow((a - 0.035) / 0.085, 2));      // the notch the fence points at
    h += 90 * Math.exp(-Math.pow((a + 0.21) / 0.1, 2));          // the shoulder left of it
    return h;
  }
  function buildRidge() {
    const SEG = 150, SPAN = 1.9, rows = [[2140, 0], [2270, 0.42], [2400, 0.82], [2540, 1], [2760, 0.7]];
    const V = [];
    for (let j = 0; j < rows.length; j++) for (let i = 0; i <= SEG; i++) {
      const a = (i + (j ? (hash(i, 50 + j) - 0.5) * 0.7 : 0)) / SEG * SPAN * 2 - SPAN;
      const r = rows[j][0] * (1 + (hash(i, 60 + j) - 0.5) * 0.03);
      V.push([Math.sin(a) * r, ridgeHeight(a) * rows[j][1] * (1 + (hash(i, 70 + j) - 0.5) * 0.22), -Math.cos(a) * r]);
    }
    const faces = [], id = (i, j) => i + j * (SEG + 1);
    for (let j = 0; j < rows.length - 1; j++) for (let i = 0; i < SEG; i++) {
      const a = id(i, j), b = id(i + 1, j), c = id(i + 1, j + 1), d = id(i, j + 1);
      if (hash(i, 80 + j) < 0.5) faces.push([a, b, c], [a, c, d]); else faces.push([a, b, d], [b, c, d]);
    }
    const n = faces.length, batch = new Batch(n, false);
    const f = { n, d: new Float32Array(n), facet: new Float32Array(n), toYou: new Float32Array(n), steep: new Float32Array(n), r1: new Float32Array(n), batch };
    for (let q = 0; q < n; q++) {
      const A = V[faces[q][0]], B = V[faces[q][1]], C = V[faces[q][2]];
      batch.tri(A[0], A[1], A[2], B[0], B[1], B[2], C[0], C[1], C[2], 0, 0, 0);
      const cx = (A[0] + B[0] + C[0]) / 3, cz = (A[2] + B[2] + C[2]) / 3, d = Math.hypot(cx, cz);
      let nx = (B[1] - A[1]) * (C[2] - A[2]) - (B[2] - A[2]) * (C[1] - A[1]);
      let ny = (B[2] - A[2]) * (C[0] - A[0]) - (B[0] - A[0]) * (C[2] - A[2]);
      let nz = (B[0] - A[0]) * (C[1] - A[1]) - (B[1] - A[1]) * (C[0] - A[0]);
      const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
      if (ny < 0) { nx = -nx; ny = -ny; nz = -nz; }
      f.d[q] = d; f.steep[q] = 1 - ny;
      f.facet[q] = clamp((nx * -0.5 + ny * 0.75 + nz * -0.43 - 0.45) / 0.45, -1, 1);
      f.toYou[q] = clamp(-(nx * cx + nz * cz) / d, 0, 1);
      f.r1[q] = hash(q, 21);
    }
    batch.geo.attributes.position.needsUpdate = true;
    return f;
  }

  function buildPosts() {
    const list = [];
    for (let k = 0; k < POSTS; k++) {
      const d = k === 0 ? 1.6 : 5 * k;
      const x = FENCE_X + (k ? (hash(k, 31) - 0.5) * 0.14 : 0);
      const z = -Math.sqrt(d * d - x * x);
      list.push({
        k, x, z, d, h: 1.25 * (1 + (hash(k, 32) - 0.5) * 0.14), r: 0.062 * (1 + (hash(k, 33) - 0.5) * 0.2),
        leanX: (hash(k, 34) - 0.5) * 0.11, leanZ: (hash(k, 35) - 0.5) * 0.09, turn: hash(k, 36) * 1.05,
      });
    }
    return list;
  }

  function buildBoulder() {                    // an icosahedron pushed out of shape
    const t = (1 + Math.sqrt(5)) / 2;
    const v = [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]];
    const idx = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
      [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]];
    const P = v.map((p, i) => {
      const l = Math.hypot(p[0], p[1], p[2]), s = BOULDER.r * (0.82 + hash(i, 41) * 0.4);
      return [BOULDER.x + p[0] / l * s * 1.15, Math.max(-0.05, 0.42 + p[1] / l * s * 0.72), BOULDER.z + p[2] / l * s];
    });
    return idx.map((f) => {
      const A = P[f[0]], B = P[f[1]], C = P[f[2]];
      let nx = (B[1] - A[1]) * (C[2] - A[2]) - (B[2] - A[2]) * (C[1] - A[1]);
      let ny = (B[2] - A[2]) * (C[0] - A[0]) - (B[0] - A[0]) * (C[2] - A[2]);
      let nz = (B[0] - A[0]) * (C[1] - A[1]) - (B[1] - A[1]) * (C[0] - A[0]);
      const l = Math.hypot(nx, ny, nz) || 1;
      return { A, B, C, n: [nx / l, ny / l, nz / l], c: [(A[0] + B[0] + C[0]) / 3, (A[1] + B[1] + C[1]) / 3, (A[2] + B[2] + C[2]) / 3] };
    });
  }

  function buildSky() {
    const g = new T3.SphereGeometry(9000, 28, 20);
    g.setAttribute('color', new T3.BufferAttribute(new Float32Array(g.attributes.position.count * 3), 3));
    const m = new T3.MeshBasicMaterial({ vertexColors: true, side: T3.BackSide, depthTest: false, depthWrite: false });
    const mesh = new T3.Mesh(g, m); mesh.frustumCulled = false; mesh.renderOrder = -10;
    return mesh;
  }
  function buildStars(texture) {               // three groups, so each can flicker by itself
    const groups = [];
    for (let gI = 0; gI < 3; gI++) {
      const N = 330, s = new Sprites(N, texture, false);
      for (let i = 0; i < N; i++) {
        const band = hash(i, 90 + gI) < 0.42;                    // a denser band of stars across the sky
        let az = hash(i, 93 + gI) * Math.PI * 2, el = Math.asin(hash(i, 96 + gI) * 0.96 + 0.015);
        if (band) { const u = hash(i, 99 + gI) * 2 - 1, w = (hash(i, 102 + gI) + hash(i, 105 + gI) - 1) * 0.16;
          az = -0.5 + u * 1.5 + w; el = clamp(0.5 + u * 0.55 + w * 0.6 + 0.25 * Math.cos(u * 1.4), 0.02, 1.5); }
        const R = 6500, x = Math.sin(az) * Math.cos(el) * R, y = Math.sin(el) * R, z = -Math.cos(az) * Math.cos(el) * R;
        const m = Math.pow(hash(i, 108 + gI), band ? 5 : 3.2), px = 2.3 + m * 5.2, size = px * 2 * R * Math.tan(40 * Math.PI / 180) / 1920;
        // a square facing the middle of the world
        const dx = -x / R, dy = -y / R, dz = -z / R, hl = Math.hypot(dz, dx) || 1;
        s.rx = dz / hl; s.ry = 0; s.rz = -dx / hl;
        s.ux = dy * s.rz - dz * s.ry; s.uy = dz * s.rx - dx * s.rz; s.uz = dx * s.ry - dy * s.rx;
        const warm = hash(i, 111 + gI), b = 0.5 + 0.5 * m + (band ? 0 : 0.12);
        s.add(x, y, z, size, lerp(0.8, 1, warm) * b, 0.9 * b, lerp(1, 0.82, warm) * b, 1);
      }
      s.done(); s.mesh.material.depthTest = true; s.mesh.renderOrder = -5;
      groups.push(s);
    }
    return groups;
  }

  // ---------- your hand ---------------------------------------------------
  /* A right palm, held up and open. Faces are kept in the hand's own space
     (x to the thumb side, y out of the palm, -z to the fingertips). */
  function buildHand() {
    const faces = [], M = new T3.Matrix4(), stack = [];
    const push = () => stack.push(M.clone()), pop = () => M.copy(stack.pop());
    const mul = (m) => M.multiply(m), tmp = new T3.Matrix4();
    const move = (x, y, z) => mul(tmp.makeTranslation(x, y, z));
    const rx = (a) => mul(tmp.makeRotationX(a)), ry = (a) => mul(tmp.makeRotationY(a)), rz = (a) => mul(tmp.makeRotationZ(a));
    const v3 = new T3.Vector3();
    const at = (x, y, z) => { v3.set(x, y, z).applyMatrix4(M); return [v3.x, v3.y, v3.z]; };
    const face = (a, b, c, kind) => faces.push({ a, b, c, kind });
    const ring = (w, t, z, top) => {           // an eight-sided section; `top` keeps its top face on y = 0
      const hw = w / 2, ht = t / 2, c = Math.min(hw, ht) * 0.55, y0 = top ? -ht : 0;
      return [[-hw + c, ht], [hw - c, ht], [hw, ht - c], [hw, -ht + c], [hw - c, -ht], [-hw + c, -ht], [-hw, -ht + c], [-hw, ht - c]].map((p) => at(p[0], p[1] + y0, z));
    };
    /* A tapered eight-sided bar from z = 0 to z = -len. */
    const bar = (len, w0, t0, w1, t1, kind, top) => {
      const A = ring(w0, t0, 0, top), B = ring(w1, t1, -len, top);
      for (let i = 0; i < 8; i++) { const j = (i + 1) % 8; face(A[i], A[j], B[j], kind); face(A[i], B[j], B[i], kind); }
      for (let i = 1; i < 7; i++) { face(B[0], B[i], B[i + 1], kind); face(A[0], A[i + 1], A[i], kind); }
    };
    const pad = (x, z, rxs, rzs, h, turn) => {  // a low mound on the palm
      const bot = [], top = [];
      for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 + turn;
        bot.push(at(x + Math.cos(a) * rxs, -0.0005, z + Math.sin(a) * rzs)); top.push(at(x + Math.cos(a) * rxs * 0.5, h, z + Math.sin(a) * rzs * 0.5)); }
      for (let i = 0; i < 6; i++) { const j = (i + 1) % 6; face(bot[i], top[i], top[j], 'skin'); face(bot[i], top[j], bot[j], 'skin'); }
      for (let i = 1; i < 5; i++) face(top[0], top[i + 1], top[i], 'skin');
    };

    // palm, from the wrist end to the knuckles
    push(); move(0, 0, 0.05); bar(0.102, 0.076, 0.03, 0.09, 0.024, 'skin', true); pop();
    pad(0.021, 0.02, 0.021, 0.03, 0.0075, 0.3);      // the ball of the thumb
    pad(-0.026, 0.016, 0.014, 0.032, 0.005, 0.1);    // the heel of the hand
    // fingers: index to little
    const F = [[0.0335, 0.0195, 0.074, -0.07, 0.2], [0.0115, 0.02, 0.083, -0.015, 0.26], [-0.0105, 0.019, 0.077, 0.04, 0.3], [-0.0315, 0.0165, 0.06, 0.1, 0.36]];
    for (const [x, w, len, splay, curl] of F) {
      push(); move(x, 0, -0.05); ry(splay); rx(curl * 0.7);
      const L = [len * 0.45, len * 0.3, len * 0.25], W = [w, w * 0.93, w * 0.86, w * 0.7];
      for (let s = 0; s < 3; s++) { bar(L[s], W[s], W[s] * 0.86, W[s + 1], W[s + 1] * 0.82, 'skin', true); move(0, 0, -L[s]); rx(curl); }
      pop();
    }
    // thumb
    push(); move(0.035, -0.01, 0.026); ry(-0.82); rx(0.12); rz(-0.35);
    bar(0.043, 0.026, 0.024, 0.022, 0.02, 'skin', true); move(0, 0, -0.043); rx(0.22); ry(0.18);
    bar(0.033, 0.022, 0.02, 0.016, 0.014, 'skin', true); pop();
    // wrist, cuff and sleeve run back towards you
    push(); move(0, 0, 0.05); ry(Math.PI); bar(0.05, 0.076, 0.03, 0.066, 0.04, 'skin', true); pop();
    push(); move(0, -0.02, 0.088); ry(Math.PI); bar(0.05, 0.098, 0.074, 0.104, 0.08, 'cuff'); pop();
    push(); move(0, -0.022, 0.134); ry(Math.PI); bar(0.6, 0.122, 0.096, 0.2, 0.17, 'sleeve'); pop();
    return faces;
  }
  const SLOTS = [[-0.003, -0.012], [0.02, -0.034], [-0.021, 0.006], [0.006, 0.014]];   // where flakes land on the palm

  // ---------- the veil: white, rings, grain -------------------------------
  const VEIL_VERT = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
  const VEIL_FRAG = [
    'precision highp float;',
    'varying vec2 vUv;',
    'uniform vec3 uTint; uniform float uWhite, uRings, uPhase, uGrain, uCell, uSeed, uRelease, uFall, uBreath; uniform vec2 uSize;',
    'float h21(vec2 p){ p = fract(p * vec2(0.1031, 0.1030)); p += dot(p, p.yx + 33.33); return fract((p.x + p.y) * p.x); }',
    'void main(){',
    '  vec2 px = vUv * uSize;',
    '  vec3 col = uTint; float a = uWhite;',
    '  if (uRings > 0.0) {',                       // slow rings of slightly brighter light, travelling out from you
    '    vec2 c = (vUv - vec2(0.5, -0.22)) * vec2(1.0, 1.55);',
    '    float w = fract(length(c) * 3.1 - uPhase);',
    '    float band = smoothstep(0.0, 0.5, w) * (1.0 - smoothstep(0.5, 1.0, w));',
    '    col *= 1.0 - 0.075 * uRings * (1.0 - band);',
    '  }',
    '  if (uGrain > 0.0) {',                       // a fine boiling grain, faintly tinted
    '    vec2 cell = floor(px / uCell) + uSeed * vec2(17.0, 31.0);',
    '    float g = h21(cell) - 0.5;',
    '    vec3 tint = vec3(h21(cell + 91.7), h21(cell + 47.3), h21(cell + 13.9)) - 0.5;',
    '    col += uGrain * (g * 0.2 + tint * 0.1) - uGrain * 0.045;',
    '  }',
    '  if (uBreath > 0.0) {',                      // the flat white breathes a little at its edges
    '    vec2 e = (vUv - 0.5) * vec2(1.0, 1.15);',
    '    col *= 1.0 - 0.03 * uBreath * smoothstep(0.32, 0.72, length(e));',
    '  }',
    '  if (uRelease > 0.0) {',                     // the white comes apart into snow, from the top down
    '    float cs = 15.0;',
    '    vec2 q = vec2(px.x, px.y + uFall);',
    '    vec2 cell = floor(q / cs); vec2 f = fract(q / cs) - 0.5;',
    '    float k = clamp(uRelease * 1.9 - (1.0 - vUv.y) * 0.9, 0.0, 1.0);',
    '    float keep = step(k, h21(cell + 7.0));',
    '    vec2 off = (vec2(h21(cell + 3.1), h21(cell + 5.7)) - 0.5) * 0.5;',
    '    float r = mix(0.82, 0.2, smoothstep(0.0, 0.5, k));',
    '    float dotA = 1.0 - smoothstep(r - 0.1, r, length(f - off * smoothstep(0.0, 0.4, k)));',
    '    a *= keep * dotA;',
    '  }',
    '  gl_FragColor = vec4(clamp(col, 0.0, 1.0), a);',
    '}'].join('\n');

  // ---------- the world -----------------------------------------------------
  function create(opt) {
    const W = opt.width || 1080, H = opt.height || 1920;
    T3.ColorManagement.enabled = false;        // colours go to the screen as written
    const renderer = new T3.WebGLRenderer({ canvas: opt.canvas, antialias: true, preserveDrawingBuffer: true, alpha: false });
    renderer.outputColorSpace = T3.LinearSRGBColorSpace;
    renderer.setPixelRatio(1); renderer.setSize(W, H, false); renderer.autoClear = false;
    opt.canvas.classList.add('lp-world');

    const camera = new T3.PerspectiveCamera(80, W / H, 0.3, 14000);
    camera.rotation.order = 'YXZ'; camera.position.set(0, EYE, 0);
    const handCam = new T3.PerspectiveCamera(80, W / H, 0.02, 4);
    const flat = new T3.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const far = new T3.Scene(), shade = new T3.Scene(), near = new T3.Scene(), handScene = new T3.Scene(), veilScene = new T3.Scene();
    const crisp = dotTexture(false), soft = dotTexture(true);

    const sky = buildSky(); far.add(sky);
    const stars = buildStars(crisp); stars.forEach((s) => far.add(s.mesh));
    const ground = buildGround(); far.add(ground.batch.mesh);
    const ridge = buildRidge(); far.add(ridge.batch.mesh);
    const shadows = new Batch(2600, true, { depthTest: false }); shade.add(shadows.mesh);
    const posts = buildPosts(), boulder = buildBoulder();
    const solids = new Batch(POSTS * 34 + 400, false); near.add(solids.mesh);
    const fx = new Sprites(2600, soft, false), snow = new Sprites(3000, crisp, false), sparks = new Sprites(400, crisp, true);
    fx.mesh.renderOrder = 5; snow.mesh.renderOrder = 6; sparks.mesh.renderOrder = 7;
    near.add(fx.mesh); near.add(snow.mesh); near.add(sparks.mesh);
    const hand = buildHand(), handBatch = new Batch(hand.length + 400, false); handScene.add(handBatch.mesh);
    const veil = new T3.Mesh(new T3.PlaneGeometry(2, 2), new T3.ShaderMaterial({
      vertexShader: VEIL_VERT, fragmentShader: VEIL_FRAG, transparent: true, depthTest: false, depthWrite: false,
      uniforms: { uTint: { value: new T3.Vector3(1, 1, 1) }, uWhite: { value: 0 }, uRings: { value: 0 }, uPhase: { value: 0 }, uGrain: { value: 0 },
        uCell: { value: 4 }, uSeed: { value: 0 }, uRelease: { value: 0 }, uFall: { value: 0 }, uBreath: { value: 0 }, uSize: { value: new T3.Vector2(W, H) } },
    }));
    veil.frustumCulled = false; veilScene.add(veil);

    // falling snow: fixed columns of air, each flake falling through its own
    const FLAKES = 2800, FIELD = 24, CEIL = 15;
    const flake = [];
    for (let i = 0; i < FLAKES; i++) {
      const a = hash(i, 120) * Math.PI * 2, r = 0.5 + Math.pow(hash(i, 121), 0.62) * FIELD;
      flake.push({ x: Math.sin(a) * r, z: -Math.cos(a) * r, y0: hash(i, 122) * CEIL, v: 0.75 + hash(i, 123) * 0.6, ph: hash(i, 124) * 6.28, size: 0.022 + hash(i, 125) * 0.03 });
    }

    let S = null, amb = [0, 0, 0], hazeC = [0, 0, 0];
    const out = [0, 0, 0];
    /* The colour of one flat face: what it is made of, how far from you, how
       much it faces your light, and how the night shades it. */
    function lit(ar, ag, ab, d, facing, shadeK) {
      const q = d / S.reach, E = S.level / (1 + q * q) * facing;
      let r = ar * (amb[0] * shadeK + S.light[0] * E), g = ag * (amb[1] * shadeK + S.light[1] * E), b = ab * (amb[2] * shadeK + S.light[2] * E);
      if (S.bleach > 0) { const k = 1 - smooth(S.bleach * 0.5, S.bleach, d); r = lerp(r, S.white[0], k); g = lerp(g, S.white[1], k); b = lerp(b, S.white[2], k); }
      out[0] = Math.min(1, r); out[1] = Math.min(1, g); out[2] = Math.min(1, b);
      return out;
    }

    function paintSky() {
      const c = sky.geometry.attributes.color, p = sky.geometry.attributes.position, dim = 1 - 0.97 * S.adapt;
      const steamLift = S.steam * 0.05 * (1 - S.adapt);
      for (let i = 0; i < p.count; i++) {
        const e = Math.pow(clamp(p.getY(i) / 9000), 0.5);
        for (let k = 0; k < 3; k++) {
          let v = lerp(NIGHT.horizon[k], NIGHT.zenith[k], e) * dim + steamLift * (1 - e);
          v = lerp(v, S.white[k], S.skyWhite);
          c.array[i * 3 + k] = v;
        }
      }
      c.needsUpdate = true;
      for (let k = 0; k < 3; k++) hazeC[k] = lerp(NIGHT.horizon[k] * dim, S.white[k], S.skyWhite);
    }

    function paintGround() {
      const f = ground, b = f.batch, N = NIGHT, dry = smooth(600, 1700, S.tempC);
      const earth = [lerp(N.wet[0], N.earth[0], dry), lerp(N.wet[1], N.earth[1], dry), lerp(N.wet[2], N.earth[2], dry)];
      const scorchR = Math.min(S.char * 0.55, 3) + S.glow * 1.9;
      for (let q = 0; q < f.n; q++) {
        const d = f.d[q], r1 = f.r1[q], r2 = f.r2[q];
        const edge = S.melt * (0.86 + 0.3 * r1);
        let ar, ag, ab;
        if (d > edge) { ar = N.snow[0]; ag = N.snow[1]; ab = N.snow[2];
          if (d < edge * 1.14 && S.melt > 0.3) { ar *= 0.72; ag *= 0.76; ab *= 0.82; }           // slush at the edge
        } else {
          const sc = scorchR > 0 ? 1 - smooth(scorchR * 0.6, scorchR * 1.2, d) : 0, tone = 0.8 + 0.4 * r2;
          ar = lerp(earth[0], N.scorched[0], sc) * tone; ag = lerp(earth[1], N.scorched[1], sc) * tone; ab = lerp(earth[2], N.scorched[2], sc) * tone;
        }
        const c = lit(ar, ag, ab, d, 0.9 + 0.13 * f.toYou[q], 0.91 + 0.1 * f.facet[q]);
        let r = c[0], g = c[1], bl = c[2];
        const hz = smooth(250, 2300, d) * 0.5 * (1 - S.adapt);                                   // the far field fades into the night
        if (hz > 0) { r = lerp(r, hazeC[0], hz); g = lerp(g, hazeC[1], hz); bl = lerp(bl, hazeC[2], hz); }
        if (S.glow > 0 && d < S.glow * 1.25 && d <= edge) {                                      // the ground glowing by itself
          let k = clamp(1.25 - d / S.glow) * (0.55 + 0.9 * r2); k = Math.min(1, k * 1.25);
          if (r1 < 0.16) k *= 0.25;                                                            // crust that has not caught yet
          const hot = 0.78 + 0.5 * r1;
          r = lerp(r, Math.min(1, S.glowColour[0] * hot), k); g = lerp(g, Math.min(1, S.glowColour[1] * hot), k); bl = lerp(bl, Math.min(1, S.glowColour[2] * hot), k);
          if (S.bleach > 0) { const w = 1 - smooth(S.bleach * 0.5, S.bleach, d); r = lerp(r, S.white[0], w); g = lerp(g, S.white[1], w); bl = lerp(bl, S.white[2], w); }
        }
        b.paint(q, r, g, bl);
      }
      b.n = f.n; b.done(true);
    }

    function paintRidge() {
      const f = ridge, b = f.batch, N = NIGHT, bare = smooth(2000, 2800, S.melt);
      for (let q = 0; q < f.n; q++) {
        const snowy = 1 - bare, rockTone = 0.75 + 0.5 * f.r1[q];
        const ar = lerp(N.ridgeRock[0] * rockTone, N.snow[0], snowy), ag = lerp(N.ridgeRock[1] * rockTone, N.snow[1], snowy), ab = lerp(N.ridgeRock[2] * rockTone, N.snow[2], snowy);
        const c = lit(ar, ag, ab, f.d[q], 0.5 + 0.6 * f.toYou[q], 0.72 + 0.3 * f.facet[q]);
        const hz = 0.42 * (1 - S.adapt);
        b.paint(q, lerp(c[0], hazeC[0], hz), lerp(c[1], hazeC[1], hz), lerp(c[2], hazeC[2], hz));
      }
      b.n = f.n; b.done(true);
    }

    /* One fence post, as it is at this temperature. */
    function postState(p) {
      const d = p.d, band = (R, a, b) => (R > 0 ? 1 - smooth(R * a, R * b, d) : 0);
      const slide = clamp((S.melt - d + 0.12) / 0.38);
      const st = band(S.stump, 0.5, 1.05), bo = band(S.burnout, 0.8, 1.05);
      return { slide, char: band(S.char, 0.8, 1.05), flame: band(S.fire, 0.85, 1.05) * (1 - bo), out: bo, h: p.h * (1 - 0.64 * st * (0.85 + 0.3 * hash(p.k, 37))) };
    }

    function drawSolids(t) {
      const N = NIGHT; solids.reset(); shadows.reset();
      const quiver = S.fire > 0 ? (vnoise(t * 9, 3) - 0.5) * 0.02 * clamp(S.fire / 20) : 0;
      const shadowOn = clamp(S.level * 2.2);
      const wedge = (x, z, d, half, len) => {              // a shadow thrown straight away from you
        if (shadowOn <= 0.02 || len <= 0.05) return;
        const ux = x / d, uz = z / d, c = Math.cos(quiver), s = Math.sin(quiver);
        const dx = ux * c - uz * s, dz = ux * s + uz * c, px = -dz, pz = dx, SEG = 16;
        let s0 = 0, a0 = 1;
        for (let i = 1; i <= SEG; i++) {
          const s1 = len * Math.pow(i / SEG, 2.2);
          const alphaAt = (sv) => { const q = (d + sv) / S.reach; return 0.9 * shadowOn * clamp(3.2 / (1 + q * q)) * Math.pow(1 - sv / len, 1.4); };
          const w0 = half * (d + s0) / d, w1 = half * (d + s1) / d;
          const x0 = x + dx * s0, z0 = z + dz * s0, x1 = x + dx * s1, z1 = z + dz * s1;
          a0 = alphaAt((s0 + s1) / 2);
          let k = 1; if (S.bleach > 0) k = smooth(S.bleach * 0.5, S.bleach, d + (s0 + s1) / 2);
          const a = a0 * k;
          shadows.tri(x0 - px * w0, 0.012, z0 - pz * w0, x0 + px * w0, 0.012, z0 + pz * w0, x1 + px * w1, 0.012, z1 + pz * w1, 0.012, 0.01, 0.014, a);
          shadows.tri(x0 - px * w0, 0.012, z0 - pz * w0, x1 + px * w1, 0.012, z1 + pz * w1, x1 - px * w1, 0.012, z1 - pz * w1, 0.012, 0.01, 0.014, a);
          s0 = s1;
        }
      };
      const tri = (A, B, C, ar, ag, ab, d, glow) => {       // a lit face of a solid thing
        let nx = (B[1] - A[1]) * (C[2] - A[2]) - (B[2] - A[2]) * (C[1] - A[1]);
        let ny = (B[2] - A[2]) * (C[0] - A[0]) - (B[0] - A[0]) * (C[2] - A[2]);
        let nz = (B[0] - A[0]) * (C[1] - A[1]) - (B[1] - A[1]) * (C[0] - A[0]);
        const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
        const cx = (A[0] + B[0] + C[0]) / 3, cy = (A[1] + B[1] + C[1]) / 3, cz = (A[2] + B[2] + C[2]) / 3;
        const lx = -cx, ly = BODY - cy, lz = -cz, ll = Math.hypot(lx, ly, lz) || 1;
        const facing = Math.abs(nx * lx + ny * ly + nz * lz) / ll;
        const skyK = 0.62 + 0.38 * Math.abs(nx * -0.5 + ny * 0.75 + nz * -0.43);
        const c = lit(ar, ag, ab, d, 0.3 + 0.8 * facing, skyK);
        if (glow) solids.tri(A[0], A[1], A[2], B[0], B[1], B[2], C[0], C[1], C[2], Math.max(c[0], glow[0]), Math.max(c[1], glow[1]), Math.max(c[2], glow[2]));
        else solids.tri(A[0], A[1], A[2], B[0], B[1], B[2], C[0], C[1], C[2], c[0], c[1], c[2]);
      };

      for (const p of posts) {
        if (p.d > 460) continue;
        const st = postState(p), h = st.h, r0 = p.r, r1 = p.r * 0.84;
        const wood = [lerp(N.wood[0], N.charred[0], st.char), lerp(N.wood[1], N.charred[1], st.char), lerp(N.wood[2], N.charred[2], st.char)];
        const bot = [], top = [];
        for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 + p.turn;
          bot.push([p.x + Math.cos(a) * r0, 0, p.z + Math.sin(a) * r0]);
          top.push([p.x + p.leanX * h + Math.cos(a) * r1, h, p.z + p.leanZ * h + Math.sin(a) * r1]); }
        for (let i = 0; i < 6; i++) { const j = (i + 1) % 6, tone = 0.86 + 0.28 * hash(p.k * 6 + i, 38);
          tri(bot[i], top[i], top[j], wood[0] * tone, wood[1] * tone, wood[2] * tone, p.d);
          tri(bot[i], top[j], bot[j], wood[0] * tone, wood[1] * tone, wood[2] * tone, p.d); }
        const ember = st.out > 0.05 || st.flame > 0.3 ? [S.glowColour[0] * 0.8, S.glowColour[1] * 0.55, S.glowColour[2] * 0.4] : null;
        for (let i = 1; i < 5; i++) tri(top[0], top[i], top[i + 1], wood[0], wood[1], wood[2], p.d, ember);
        if (st.slide < 1) {                                  // the cap of snow, sliding off as the melt reaches the post
          const s = st.slide, ox = (p.x < 0 ? -1 : 1) * 0.6, oz = -0.8, drop = s * s * h, tilt = s * 1.1;
          const cxp = p.x + p.leanX * h + ox * 0.16 * s, czp = p.z + p.leanZ * h + oz * 0.16 * s, y0 = h - drop;
          const cb = [], ct = [];
          for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 + p.turn + 0.3, sq = 1 - 0.5 * s;
            const bx = Math.cos(a) * r1 * 1.9, bz = Math.sin(a) * r1 * 1.9, tx = Math.cos(a) * r1 * 1.1, tz = Math.sin(a) * r1 * 1.1;
            const yb = (bx * ox + bz * oz) * -tilt, yt = 0.15 * sq + (tx * ox + tz * oz) * -tilt;
            cb.push([cxp + bx, y0 - 0.012 + yb, czp + bz]); ct.push([cxp + tx + p.leanX * 0.2, y0 + yt, czp + tz]); }
          for (let i = 0; i < 6; i++) { const j = (i + 1) % 6;
            tri(cb[i], ct[i], ct[j], N.snow[0], N.snow[1], N.snow[2], p.d); tri(cb[i], ct[j], cb[j], N.snow[0], N.snow[1], N.snow[2], p.d); }
          for (let i = 1; i < 5; i++) tri(ct[0], ct[i], ct[i + 1], N.snow[0] * 1.06, N.snow[1] * 1.06, N.snow[2] * 1.06, p.d);
        }
        // the shadow: endless while the post stands taller than your light, short once it is a stump
        const len = h >= BODY - 0.02 ? Math.min(320, S.reach * 3 + 4) : Math.min(320, p.d * h / (BODY - h));
        if (p.d < 300) wedge(p.x, p.z, p.d, p.r * 1.2, len);

        if (st.flame > 0.04) {                               // flames: three flat-sided tongues
          const fxp = p.x + p.leanX * h, fzp = p.z + p.leanZ * h, pale = smooth(7000, 20000, S.tempC);
          for (let j = 0; j < 3; j++) {
            const n1 = vnoise(t * (6.5 + j) + p.k * 3.7 + j * 11.3, 7), n2 = vnoise(t * 5.1 + p.k * 1.9 + j * 5.7, 8) - 0.5;
            const nearK = Math.min(1, 0.4 + p.d / 14);
            const fh = (0.2 + 0.36 * n1) * st.flame * nearK * (j === 0 ? 1.25 : 0.8), w = (j === 0 ? 0.07 : 0.05) * nearK * (0.7 + 0.3 * st.flame);
            const a = j * 2.1 + p.turn, bx = fxp + (j ? Math.cos(a) * 0.045 : 0), bz = fzp + (j ? Math.sin(a) * 0.045 : 0), by = h - 0.05;
            const ap = [bx + n2 * 0.12, by + fh, bz + (n1 - 0.5) * 0.08];
            const col = j === 0 ? [1, lerp(0.82, 0.96, pale), lerp(0.36, 0.8, pale)] : j === 1 ? [1, lerp(0.56, 0.9, pale), lerp(0.12, 0.6, pale)] : [1, lerp(0.38, 0.85, pale), lerp(0.07, 0.5, pale)];
            const q = [[bx - w, by, bz - w], [bx + w, by, bz - w], [bx + w, by, bz + w], [bx - w, by, bz + w]];
            for (let i = 0; i < 4; i++) { const k = 0.86 + 0.14 * (i % 2); solids.tri(q[i][0], q[i][1], q[i][2], q[(i + 1) % 4][0], q[(i + 1) % 4][1], q[(i + 1) % 4][2], ap[0], ap[1], ap[2], col[0] * k, col[1] * k, col[2] * k); }
          }
          fx.add(fxp, h + 0.18, fzp, 1.1 * st.flame, 1, 0.5, 0.12, 0.2 * (1 - pale));
          if (p.d < 45) for (let j = 0; j < 4; j++) {          // sparks lifting off
            const per = 1.1 + hash(p.k * 4 + j, 39) * 0.9, age = (t / per + hash(p.k * 4 + j, 40)) % 1;
            sparks.add(fxp + (vnoise(t * 2 + j * 9 + p.k, 9) - 0.5) * 0.5 * age, h + 0.2 + age * 2.4, fzp + (vnoise(t * 2.3 + j * 5 + p.k, 10) - 0.5) * 0.5 * age,
              0.03 + p.d * 0.0022, 1, 0.72, 0.28, st.flame * (1 - age) * 0.95);
          }
        }
        if (st.char > 0.15 && st.out < 0.9 && p.d < 70) for (let j = 0; j < 2; j++) {   // smoke
          const per = 2.6 + hash(p.k * 2 + j, 42), age = (t / per + hash(p.k * 2 + j, 43)) % 1;
          const k = st.char * (1 - st.flame * 0.5) * Math.sin(Math.PI * age) * 0.42 * (1 - smooth(4000, 9000, S.tempC));
          const c = lit(0.2, 0.19, 0.2, p.d, 0.5, 1);
          fx.add(p.x + 0.25 * age + (vnoise(t * 0.7 + j + p.k, 11) - 0.5) * 0.4, h + 0.15 + age * 3.4, p.z + (vnoise(t * 0.6 + j * 3 + p.k, 12) - 0.5) * 0.4, 0.35 + age * 1.5, c[0], c[1], c[2], k);
        }
      }

      // the boulder
      const bd = Math.hypot(BOULDER.x, BOULDER.z), snowOn = S.melt < bd;
      const bGlow = S.glow > bd ? S.glowColour : null;
      for (const f of boulder) {
        const top = f.n[1] > 0.42 && snowOn, tone = 0.8 + 0.4 * hash(Math.round(f.c[0] * 977 + f.c[2] * 131), 44);
        const a = top ? N.snow : [N.rock[0] * tone, N.rock[1] * tone, N.rock[2] * tone];
        tri(f.A, f.B, f.C, a[0], a[1], a[2], bd, bGlow && f.n[1] < 0.5 ? [bGlow[0] * 0.7 * tone, bGlow[1] * 0.6 * tone, bGlow[2] * 0.5 * tone] : null);
      }
      wedge(BOULDER.x, BOULDER.z, bd, BOULDER.r * 0.95, Math.min(320, S.reach * 3 + 4));
      solids.done(); shadows.done();
    }

    function drawAir(t) {
      // falling snow, and the bubble of air it no longer reaches
      if (S.bubble < FIELD + 6) for (let i = 0; i < FLAKES; i++) {
        const f = flake[i];
        const y = CEIL - ((f.y0 + f.v * t) % CEIL);
        const x = f.x + Math.sin(t * 0.5 + f.ph) * 0.16, z = f.z + Math.cos(t * 0.37 + f.ph) * 0.12;
        const d3 = Math.hypot(x, y - BODY, z);
        if (d3 < S.bubble) {
          if (S.steam > 0 && d3 > S.bubble - 0.45) { const c = lit(0.55, 0.62, 0.78, d3, 1, 1.6); fx.add(x, y, z, 0.2 + (S.bubble - d3) * 0.7, c[0], c[1], c[2], S.steam * 0.5 * (1 - (S.bubble - d3) / 0.45)); }
          continue;
        }
        const c = lit(0.95, 0.97, 1, Math.hypot(x, z), 1, 3.6);
        snow.add(x, y, z, f.size, c[0], c[1], c[2], 0.92 * clamp((d3 - S.bubble) / 0.25 + (S.bubble > 0 ? 0 : 1)));
      }
      // steam rolling up from where the snow is going
      if (S.steam > 0.01) for (let i = 0; i < 70; i++) {
        const a = hash(i, 130) * Math.PI * 2, rr = Math.max(S.melt, 0.9) * (0.7 + 0.6 * hash(i, 131)) + 0.2;
        const per = 3 + hash(i, 132) * 2.4, age = (t / per + hash(i, 133)) % 1;
        const x = Math.sin(a) * rr * (1 + age * 0.5) + (vnoise(t * 0.4 + i, 13) - 0.5) * 0.8, z = -Math.cos(a) * rr * (1 + age * 0.5), y = 0.1 + age * (5 + 5 * hash(i, 134));
        const c = lit(0.62, 0.68, 0.8, Math.hypot(x, z), 0.9, 2.6);
        fx.add(x, y, z, 0.7 + age * 3.6, c[0], c[1], c[2], S.steam * Math.pow(Math.sin(Math.PI * age), 0.8) * 1.0);
      }
    }

    const hm = new T3.Matrix4(), hq = new T3.Quaternion(), he = new T3.Euler(), hv = new T3.Vector3(), hs = new T3.Vector3(1, 1, 1);
    function drawHand(pose, t) {
      handBatch.reset();
      const up = clamp(pose.hand || 0), e = up * up * (3 - 2 * up);
      if (e <= 0.001) { handBatch.done(); return false; }
      const bob = Math.sin(t * 1.3) * 0.0025;
      he.set(0.86 - (1 - e) * 0.3, 0.2, -0.05, 'YXZ'); hq.setFromEuler(he);
      hv.set(0.035, -0.075 - (1 - e) * 0.5 + bob, -0.5);
      hm.compose(hv, hq, hs);
      const el = hm.elements;
      const X = (p) => [el[0] * p[0] + el[4] * p[1] + el[8] * p[2] + el[12], el[1] * p[0] + el[5] * p[1] + el[9] * p[2] + el[13], el[2] * p[0] + el[6] * p[1] + el[10] * p[2] + el[14]];
      const key = [-0.34, 0.74, 0.58];
      /* Your hand is lit by the sky, a little warmer than the snow so it reads as skin. */
      const A = { skin: [0.93, 0.7, 0.58], cuff: [0.3, 0.33, 0.42], sleeve: [0.085, 0.095, 0.13] };
      const ha = [amb[0] * 2.3 + 0.07, amb[1] * 1.75 + 0.05, amb[2] * 1.35 + 0.04];
      const put = (a, b, c, alb, boost) => {
        let nx = (b[1] - a[1]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[1] - a[1]);
        let ny = (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]);
        let nz = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
        const l = Math.hypot(nx, ny, nz) || 1;
        const k = (0.5 + 0.5 * Math.max(0, (nx * key[0] + ny * key[1] + nz * key[2]) / l)) * (boost || 1);
        handBatch.tri(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2],
          Math.min(1, alb[0] * (ha[0] * k + S.light[0] * S.level * 0.5)), Math.min(1, alb[1] * (ha[1] * k + S.light[1] * S.level * 0.5)), Math.min(1, alb[2] * (ha[2] * k + S.light[2] * S.level * 0.5)));
      };
      for (const f of hand) put(X(f.a), X(f.b), X(f.c), A[f.kind]);
      // snowflakes on the palm: a six-armed flake that gives way to a bead of water
      for (const fl of pose.flakes || []) {
        const slot = SLOTS[(fl.slot || 0) % SLOTS.length], p = clamp(fl.p, -1, 1);
        const lift = p < 0 ? -p * 0.5 : 0, sway = p < 0 ? Math.sin(-p * 5 + (fl.slot || 0)) * 0.03 * -p : 0;
        const cx = slot[0] + sway, cz = slot[1], y = 0.0022 + lift;
        const melt = clamp(p), armK = 1 - smooth(0.0, 0.6, melt), spin = (fl.slot || 0) * 0.7 + (p < 0 ? p * 2.5 : 0);
        const at = (r, a, yy) => X([cx + Math.cos(a) * r, yy == null ? y : yy, cz + Math.sin(a) * r]);
        const R = 0.021 * (0.35 + 0.65 * armK), white = [1.9, 1.95, 2.1];
        if (armK > 0.02) {
          for (let i = 0; i < 6; i++) {
            const a = spin + i * Math.PI / 3, w = 0.2;
            put(at(0, 0), at(R * 0.5, a - w), at(R, a), white, 1.5); put(at(0, 0), at(R, a), at(R * 0.5, a + w), white, 1.5);
            if (armK > 0.45) { put(at(R * 0.52, a), at(R * 0.86, a - 0.34), at(R * 0.7, a), white, 1.5); put(at(R * 0.52, a), at(R * 0.7, a), at(R * 0.86, a + 0.34), white, 1.5); }
          }
        }
        if (melt > 0.12) {                                    // the bead: a low dome with one bright face
          const k = smooth(0.12, 0.9, melt), br = 0.006 + 0.005 * k, bh = 0.006 * k + 0.001;
          for (let i = 0; i < 6; i++) {
            const a0 = i * Math.PI / 3 + 0.4, a1 = a0 + Math.PI / 3;
            const tone = i === 4 ? [2.2, 2.2, 2.3] : i === 5 || i === 3 ? [1.2, 1.35, 1.7] : [0.7, 0.85, 1.2];
            put(at(br, a0, 0.0012), at(br * 0.55, a0, 0.0012 + bh), at(br * 0.55, a1, 0.0012 + bh), tone, 1.4);
            put(at(br, a0, 0.0012), at(br * 0.55, a1, 0.0012 + bh), at(br, a1, 0.0012), tone, 1.4);
            put(at(0, 0, 0.0012 + bh * 1.12), at(br * 0.55, a0, 0.0012 + bh), at(br * 0.55, a1, 0.0012 + bh), i % 2 ? [1.0, 1.15, 1.5] : [0.8, 0.95, 1.3], 1.4);
          }
        }
      }
      handBatch.done();
      return true;
    }

    const world = {
      renderer, camera, CURVES,
      /* Draw the frame for a temperature, a time and a pose. Returns the state drawn. */
      set(tempC, t, pose) {
        pose = pose || {};
        S = state(tempC);
        const dim = 1 - 0.9 * S.adapt;
        amb = [NIGHT.ambient[0] * dim, NIGHT.ambient[1] * dim, NIGHT.ambient[2] * dim];
        const fov = pose.fov || 80;
        if (camera.fov !== fov) { camera.fov = handCam.fov = fov; camera.updateProjectionMatrix(); handCam.updateProjectionMatrix(); }
        camera.rotation.set(-(pose.pitch || 0) * Math.PI / 180, -(pose.yaw || 0) * Math.PI / 180, 0);
        camera.updateMatrixWorld(true);

        paintSky();
        const tw = S.stars * (1 - S.steam * 0.35);
        stars.forEach((s, i) => { s.mesh.material.opacity = tw * (0.82 + 0.18 * Math.sin(t * (1.7 + i * 0.9) + i * 2.1)); s.mesh.visible = tw > 0.01; });
        const whole = S.veil >= 1 && !(pose.release > 0);     // nothing of the field is left to draw
        if (!whole) {
          paintGround(); paintRidge();
          fx.reset(camera); snow.reset(camera); sparks.reset(camera);
          drawSolids(t); drawAir(t);
          fx.done(); snow.done(); sparks.done();
        }
        const handOn = !whole && drawHand(pose, t);

        const u = veil.material.uniforms, rel = clamp(pose.release || 0);
        u.uWhite.value = pose.release != null && pose.release > 0 ? 1 : S.veil;
        const tint = pose.release > 0 ? state(1.4e32).white : S.white;
        u.uTint.value.set(tint[0], tint[1], tint[2]);
        u.uRings.value = pose.release > 0 ? 0 : S.rings;
        u.uPhase.value = t * 0.32 + Math.log10(S.tempC) * 0.85;
        u.uGrain.value = pose.release > 0 ? 0 : S.grain;
        u.uCell.value = Math.round(S.grainCell);
        u.uSeed.value = Math.floor(t * S.grainRate);
        u.uRelease.value = rel; u.uFall.value = rel * 150;
        u.uBreath.value = S.flat && !(pose.release > 0) ? 0.6 + 0.4 * Math.sin(t * Math.PI * 2 / 3) : 0;

        renderer.setRenderTarget(null); renderer.clear();
        if (!whole) {
          renderer.render(far, camera); renderer.render(shade, camera); renderer.render(near, camera);
          if (handOn) { renderer.clearDepth(); renderer.render(handScene, handCam); }
        }
        if (u.uWhite.value > 0) renderer.render(veilScene, flat);
        return S;
      },
    };
    return world;
  }

  LP.World = { create, state, CURVES, LIGHT, ridgeHeight };
})();
