// Picture-book character rig for flip stories. Everything is drawn with canvas 2D paths (no external art).
// A character is described by age proportions, colours, hair, face and a pose; hands can be placed with 2-bone IK.
// Coordinates: the character stands with feet at (x, y) and faces the viewer.

export const OUT = '#4a3a30';                      // outline colour (warm dark brown, like a pencil line)
const OL = 4.5;                                    // outline width

export function mix(a, b, t) {
  const p = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
  const A = p(a), B = p(b);
  return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('');
}
const shade = (c, t = 0.18) => mix(c, '#2a1d18', t);
const tint = (c, t = 0.25) => mix(c, '#ffffff', t);

// proportions from total standing height H (px) and head-to-height ratio
function body(H, headRatio, build = 1) {
  const R = H * headRatio / 2;                     // head radius
  const neck = R * 0.32;
  const torso = H * (headRatio > 0.15 ? 0.27 : 0.305);
  const leg = H - torso - neck - R * 1.95;
  return { H, R, neck, torso, leg, sh: H * 0.105 * build, hip: H * 0.088 * build, up: H * 0.165, fore: H * 0.15, hand: R * 0.2,
           limb: H * 0.042 * build, legW: H * 0.05 * build };
}

export const AGES = {
  child6: () => body(520, 0.235, 1.05),
  child11: () => body(700, 0.18, 1.0),
  teen: () => body(860, 0.15, 1.0),
  adult: () => body(930, 0.138, 1.0),
  senior: () => body(905, 0.14, 1.04),
};

function ik(sx, sy, tx, ty, a, b, bendSign) {
  let dx = tx - sx, dy = ty - sy, d = Math.hypot(dx, dy);
  const dd = Math.min(d, a + b - 0.5);
  const base = Math.atan2(dy, dx);
  const cos = (a * a + dd * dd - b * b) / (2 * a * dd);
  const ang = base + bendSign * Math.acos(Math.max(-1, Math.min(1, cos)));
  const ex = sx + a * Math.cos(ang), ey = sy + a * Math.sin(ang);
  const hx = sx + (dx / d) * dd, hy = sy + (dy / d) * dd;
  return [ex, ey, hx, hy];
}

function limb(ctx, pts, w, color, cap = 'round') {
  ctx.lineCap = cap; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
  ctx.strokeStyle = OUT; ctx.lineWidth = w + OL * 2; ctx.stroke();
  ctx.strokeStyle = color; ctx.lineWidth = w; ctx.stroke();
}

function blob(ctx, fill, path, stroke = true) {
  ctx.beginPath(); path(ctx); ctx.closePath();
  ctx.fillStyle = fill; ctx.fill();
  if (stroke) { ctx.lineWidth = OL; ctx.strokeStyle = OUT; ctx.lineJoin = 'round'; ctx.stroke(); }
}

function circle(ctx, x, y, r, fill, stroke = true) { blob(ctx, fill, c => c.arc(x, y, r, 0, Math.PI * 2), stroke); }

// ---- hair ---------------------------------------------------------------------------------------------
function hairBack(ctx, ch, hx, hy, R, col) {
  const st = ch.hair;
  if (st === 'long' || st === 'veil-long') {
    blob(ctx, col, c => {
      c.moveTo(hx - R * 1.02, hy - R * 0.1);
      c.bezierCurveTo(hx - R * 1.25, hy + R * 1.2, hx - R * 1.1, hy + R * 1.9, hx - R * 0.55, hy + R * 2.05);
      c.lineTo(hx + R * 0.55, hy + R * 2.05);
      c.bezierCurveTo(hx + R * 1.1, hy + R * 1.9, hx + R * 1.25, hy + R * 1.2, hx + R * 1.02, hy - R * 0.1);
    });
  } else if (st === 'bob') {
    blob(ctx, col, c => {
      c.moveTo(hx - R * 1.08, hy - R * 0.2);
      c.bezierCurveTo(hx - R * 1.2, hy + R * 0.7, hx - R * 1.05, hy + R * 1.05, hx - R * 0.7, hy + R * 1.08);
      c.lineTo(hx + R * 0.7, hy + R * 1.08);
      c.bezierCurveTo(hx + R * 1.05, hy + R * 1.05, hx + R * 1.2, hy + R * 0.7, hx + R * 1.08, hy - R * 0.2);
    });
  } else if (st === 'pigtails') {
    for (const s of [-1, 1]) {
      blob(ctx, col, c => c.ellipse(hx + s * R * 1.12, hy + R * 0.35, R * 0.34, R * 0.55, s * 0.4, 0, Math.PI * 2));
      circle(ctx, hx + s * R * 0.98, hy - R * 0.12, R * 0.12, ch.accent || '#e8566a');
    }
  } else if (st === 'ponytail') {
    blob(ctx, col, c => {
      c.moveTo(hx + R * 0.7, hy - R * 0.75);
      c.bezierCurveTo(hx + R * 1.6, hy - R * 0.6, hx + R * 1.5, hy + R * 0.9, hx + R * 1.15, hy + R * 1.5);
      c.bezierCurveTo(hx + R * 1.0, hy + R * 0.8, hx + R * 1.05, hy - R * 0.1, hx + R * 0.6, hy - R * 0.4);
    });
  } else if (st === 'bun') {
    circle(ctx, hx + R * 0.15, hy - R * 1.05, R * 0.45, col);
  }
}

function hairFront(ctx, ch, hx, hy, R, col) {
  const st = ch.hair;
  // cap over the top of the head with a soft side part
  blob(ctx, col, c => {
    c.moveTo(hx - R * 1.03, hy + (st === 'short' ? -R * 0.05 : R * 0.25));
    c.bezierCurveTo(hx - R * 1.15, hy - R * 1.05, hx - R * 0.35, hy - R * 1.28, hx + R * 0.15, hy - R * 1.12);
    c.bezierCurveTo(hx + R * 0.85, hy - R * 1.05, hx + R * 1.2, hy - R * 0.6, hx + R * 1.03, hy + (st === 'short' ? -R * 0.05 : R * 0.25));
    // fringe line sweeping from the parting
    c.bezierCurveTo(hx + R * 0.85, hy - R * 0.35, hx + R * 0.45, hy - R * 0.62, hx + R * 0.1, hy - R * 0.55);
    c.bezierCurveTo(hx - R * 0.35, hy - R * 0.5, hx - R * 0.75, hy - R * 0.3, hx - R * 1.03, hy + (st === 'short' ? -R * 0.05 : R * 0.25));
  });
  // a few strand lines
  ctx.strokeStyle = shade(col, 0.3); ctx.lineWidth = 2.2; ctx.lineCap = 'round';
  for (const k of [-0.5, -0.1, 0.35]) {
    ctx.beginPath(); ctx.moveTo(hx + R * (k + 0.2), hy - R * 1.05); ctx.quadraticCurveTo(hx + R * (k + 0.05), hy - R * 0.85, hx + R * k, hy - R * 0.6); ctx.stroke();
  }
  if (ch.grey > 0.15) {                             // silver streaks
    ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 3;
    for (const k of [-0.7, -0.25, 0.25, 0.65]) {
      ctx.beginPath(); ctx.moveTo(hx + R * k, hy - R * 1.0); ctx.quadraticCurveTo(hx + R * (k - 0.1), hy - R * 0.7, hx + R * (k - 0.25), hy - R * 0.35); ctx.stroke();
    }
  }
}

// ---- face ---------------------------------------------------------------------------------------------
function face(ctx, ch, hx, hy, R) {
  const f = ch.face || {};
  const ex = R * 0.36, ey = hy + R * 0.05;
  ctx.fillStyle = '#3a2a24';
  for (const s of [-1, 1]) {
    const x = hx + s * ex;
    if (f.eyes === 'happy' || f.eyes === 'closed') {
      ctx.beginPath(); ctx.lineWidth = 3.6; ctx.strokeStyle = '#3a2a24'; ctx.lineCap = 'round';
      if (f.eyes === 'happy') ctx.arc(x, ey + R * 0.06, R * 0.12, Math.PI * 1.1, Math.PI * 1.9);
      else ctx.arc(x, ey - R * 0.02, R * 0.12, Math.PI * 0.15, Math.PI * 0.85);
      ctx.stroke();
    } else {
      ctx.beginPath(); ctx.ellipse(x, ey, R * 0.085, R * 0.115, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x + R * 0.03, ey - R * 0.04, R * 0.03, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#3a2a24';
    }
    // eyebrows
    ctx.beginPath(); ctx.lineWidth = 3; ctx.strokeStyle = shade(ch.hairCol, 0.35);
    const lift = f.brows === 'sad' ? s * 0.06 : 0;
    ctx.moveTo(x - R * 0.13, ey - R * 0.25 - lift * R); ctx.quadraticCurveTo(x, ey - R * 0.33, x + R * 0.13, ey - R * 0.25 + lift * R); ctx.stroke();
  }
  // cheeks
  ctx.fillStyle = 'rgba(240,120,120,0.28)';
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(hx + s * R * 0.55, hy + R * 0.32, R * 0.16, R * 0.1, 0, 0, Math.PI * 2); ctx.fill(); }
  // nose
  ctx.strokeStyle = shade(ch.skin, 0.35); ctx.lineWidth = 2.6;
  ctx.beginPath(); ctx.arc(hx + R * 0.02, hy + R * 0.2, R * 0.07, Math.PI * 0.1, Math.PI * 0.9); ctx.stroke();
  // mouth
  ctx.strokeStyle = '#7a3b34'; ctx.lineWidth = 3.4;
  if (f.mouth === 'open') {
    blob(ctx, '#9b3d3a', c => { c.moveTo(hx - R * 0.2, hy + R * 0.42); c.quadraticCurveTo(hx, hy + R * 0.75, hx + R * 0.2, hy + R * 0.42); }, false);
    ctx.beginPath(); ctx.moveTo(hx - R * 0.2, hy + R * 0.42); ctx.quadraticCurveTo(hx, hy + R * 0.75, hx + R * 0.2, hy + R * 0.42); ctx.closePath(); ctx.stroke();
  } else if (f.mouth === 'soft') {
    ctx.beginPath(); ctx.arc(hx, hy + R * 0.33, R * 0.14, Math.PI * 0.25, Math.PI * 0.75); ctx.stroke();
  } else if (f.mouth === 'blow') {
    circle(ctx, hx, hy + R * 0.48, R * 0.08, '#9b3d3a', false);
  } else {
    ctx.beginPath(); ctx.arc(hx, hy + R * 0.3, R * 0.22, Math.PI * 0.2, Math.PI * 0.8); ctx.stroke();
  }
  if (f.tear) {
    for (const s of f.tear === 'both' ? [-1, 1] : [1]) {
      blob(ctx, '#8fd3f4', c => { const x = hx + s * ex + R * 0.06, y = ey + R * 0.2; c.moveTo(x, y); c.quadraticCurveTo(x + R * 0.08, y + R * 0.16, x, y + R * 0.2); c.quadraticCurveTo(x - R * 0.08, y + R * 0.16, x, y); }, false);
    }
  }
  if (ch.glasses) {
    ctx.strokeStyle = '#5a4030'; ctx.lineWidth = 3.4;
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(hx + s * ex, ey, R * 0.2, R * 0.17, 0, 0, Math.PI * 2); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(hx - ex + R * 0.2, ey); ctx.quadraticCurveTo(hx, ey - R * 0.06, hx + ex - R * 0.2, ey); ctx.stroke();
  }
  if (ch.wrinkles) {
    ctx.strokeStyle = shade(ch.skin, 0.25); ctx.lineWidth = 2;
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(hx + s * (ex + R * 0.22), ey + R * 0.02, R * 0.07, s > 0 ? -0.6 : Math.PI - 0.6 + 1.2, s > 0 ? 0.6 : Math.PI + 0.6); ctx.stroke(); }
  }
}

// ---- props --------------------------------------------------------------------------------------------
export function camera(ctx, x, y, s = 1, flash = 0) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  blob(ctx, '#3b3f46', c => c.roundRect(-58, -36, 116, 74, 12));
  blob(ctx, '#575c66', c => c.roundRect(-34, -50, 40, 18, 5));
  circle(ctx, 4, 2, 27, '#22252b'); circle(ctx, 4, 2, 17, '#4d6b8a'); circle(ctx, 9, -4, 5, 'rgba(255,255,255,0.8)', false);
  circle(ctx, 40, -22, 6, '#f2c94c');
  if (flash > 0) {
    const g = ctx.createRadialGradient(40, -22, 2, 40, -22, 120 * flash);
    g.addColorStop(0, `rgba(255,255,230,${0.9 * flash})`); g.addColorStop(1, 'rgba(255,255,230,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(40, -22, 120 * flash, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

function backpack(ctx, cx, top, w, h, col) {
  blob(ctx, col, c => c.roundRect(cx - w / 2, top, w, h, w * 0.25));
  blob(ctx, shade(col, 0.12), c => c.roundRect(cx - w * 0.32, top + h * 0.45, w * 0.64, h * 0.38, w * 0.12));
}

// ---- the character ------------------------------------------------------------------------------------
// ch = { age, x, y, scale, skin, hairCol, grey, hair, top, bottom, shoes, dress, sleeve, glasses, wrinkles, face,
//        pose: { l: [tx,ty] | angle(deg), r: ..., legs: 'stand'|'wide'|'walk' }, extras: {...} }
export function drawPerson(ctx, ch) {
  const P = AGES[ch.age](); const k = ch.scale || 1;
  ctx.save(); ctx.translate(ch.x, ch.y); ctx.scale(k, k);
  const hairCol = ch.grey ? mix(ch.hairCol, '#d9d6d2', ch.grey) : ch.hairCol;
  const ch2 = { ...ch, hairCol };
  const hipY = -P.leg, shY = hipY - P.torso, neckTop = shY - P.neck, hy = neckTop - P.R * 0.92, hx = (ch.lean || 0) * P.R;
  const topCol = ch.top || ch.dress || '#cccccc';
  const sleeveCol = ch.sleeve === 'short' ? ch.skin : (ch.sleeveCol || topCol);
  const pose = ch.pose || {};
  const E = ch.extras || {};

  // legs
  const legs = pose.legs || 'stand';
  const foot = (s) => legs === 'wide' ? s * P.hip * 1.35 : legs === 'walk' ? s * P.hip * (s > 0 ? 1.4 : 0.5) : s * P.hip * 0.85;
  const legCol = ch.dress ? ch.skin : ch.bottom;
  for (const s of [-1, 1]) {
    const hx0 = s * P.hip * 0.52, fx = foot(s), ank = -P.H * 0.05;
    const bare = ch.dress && ch.dressLen !== 'long';
    const wTop = bare ? P.legW * 0.82 : P.legW * 1.3, wBot = bare ? P.legW * 0.62 : P.legW * 0.92;
    blob(ctx, bare ? ch.skin : legCol, c => {                  // one tapered leg (thigh to ankle)
      c.moveTo(hx0 - wTop / 2 - s * 2, hipY + 6); c.lineTo(hx0 + wTop / 2 - s * 2, hipY + 6);
      c.lineTo(fx + wBot / 2, ank); c.lineTo(fx - wBot / 2, ank);
    });
    if (!bare) { ctx.strokeStyle = shade(legCol, 0.18); ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(hx0 + s * wTop * 0.15, hipY + 40); ctx.lineTo(fx + s * wBot * 0.1, ank - 30); ctx.stroke(); }
    if (ch.socks) blob(ctx, ch.socks, c => c.roundRect(fx - wBot * 0.55, ank - P.H * 0.06, wBot * 1.1, P.H * 0.06, 4));
    blob(ctx, ch.shoes || '#5b4636', c => c.ellipse(fx + s * P.legW * 0.22, -P.H * 0.022, P.legW * 0.92, P.H * 0.03, 0, 0, Math.PI * 2));
  }

  // back items (backpack sits behind the torso)
  if (E.backpack) backpack(ctx, 0, shY + P.torso * 0.05, P.sh * 2.25, P.torso * 0.85, E.backpack);

  // hair behind the head
  hairBack(ctx, ch2, hx, hy, P.R, hairCol);
  if (E.veil) blob(ctx, 'rgba(255,255,255,0.75)', c => {
    c.moveTo(hx - P.R * 0.9, hy - P.R * 0.6); c.bezierCurveTo(hx - P.R * 2.0, hy + P.R * 2, hx - P.R * 1.9, hy + P.R * 4.2, hx - P.R * 1.3, hy + P.R * 5.2);
    c.lineTo(hx + P.R * 1.3, hy + P.R * 5.2); c.bezierCurveTo(hx + P.R * 1.9, hy + P.R * 4.2, hx + P.R * 2.0, hy + P.R * 2, hx + P.R * 0.9, hy - P.R * 0.6);
  });

  // arms: compute shoulder points and hand targets
  const arms = {};
  for (const [side, s] of [['l', -1], ['r', 1]]) {
    const sx = s * P.sh * 0.98, sy = shY + P.limb * 0.85;
    const t = pose[side];
    let hxT, hyT;
    if (Array.isArray(t)) { hxT = t[0] / k - ch.x / k; hyT = t[1] / k - ch.y / k; }          // world target -> local
    else { const a = (t === undefined ? 8 : t) * Math.PI / 180; hxT = sx + s * Math.sin(a) * (P.up + P.fore); hyT = sy + Math.cos(a) * (P.up + P.fore); }
    const bend = (pose[side + 'Bend'] !== undefined ? pose[side + 'Bend'] : s);   // +1 on the right, -1 on the left = elbows outward
    const el = pose[side + 'Elbow'];
    if (el) arms[side] = [sx, sy, el[0] / k - ch.x / k, el[1] / k - ch.y / k, hxT, hyT];            // explicit elbow (foreshortened arm)
    else arms[side] = [sx, sy, ...ik(sx, sy, hxT, hyT, P.up, P.fore, bend)];
  }
  const drawArm = side => {
    const [sx, sy, ex, ey, hx2, hy2] = arms[side];
    if (ch.sleeve === 'short') { limb(ctx, [sx, sy, ex, ey, hx2, hy2], P.limb, ch.skin); limb(ctx, [sx, sy, sx + (ex - sx) * 0.42, sy + (ey - sy) * 0.42], P.limb * 1.3, topCol); }
    else if (ch.sleeve === 'three') { limb(ctx, [sx, sy, ex, ey, hx2, hy2], P.limb, ch.skin); limb(ctx, [sx, sy, ex, ey, ex + (hx2 - ex) * 0.4, ey + (hy2 - ey) * 0.4], P.limb * 1.15, sleeveCol); }
    else limb(ctx, [sx, sy, ex, ey, hx2, hy2], P.limb * 1.08, sleeveCol);
    circle(ctx, hx2, hy2, P.hand * 1.25, ch.skin);
  };
  if (pose.behind !== 'r') drawArm('l'); else drawArm('r');

  // torso / clothes
  const W = P.sh, Hp = P.hip;
  if (ch.dress) {
    const len = ch.dressLen === 'long' ? P.leg * 0.97 : P.leg * 0.5;
    blob(ctx, ch.dress, c => {
      c.moveTo(-W * 0.95, shY + 4); c.quadraticCurveTo(0, shY - 10, W * 0.95, shY + 4);
      c.lineTo(W * 0.8, hipY - P.torso * 0.25);
      c.quadraticCurveTo(W * 1.9, hipY + len * 0.7, W * 1.75 * (ch.dressLen === 'long' ? 1.25 : 1), hipY + len);
      c.quadraticCurveTo(0, hipY + len + 18, -W * 1.75 * (ch.dressLen === 'long' ? 1.25 : 1), hipY + len);
      c.quadraticCurveTo(-W * 1.9, hipY + len * 0.7, -W * 0.8, hipY - P.torso * 0.25);
    });
    if (ch.dressLen === 'long') {                    // soft folds
      ctx.strokeStyle = shade(ch.dress, 0.12); ctx.lineWidth = 2.5;
      for (const xk of [-0.9, 0, 0.9]) { ctx.beginPath(); ctx.moveTo(W * xk * 0.5, hipY); ctx.quadraticCurveTo(W * xk * 0.9, hipY + len * 0.5, W * xk * 1.3, hipY + len * 0.95); ctx.stroke(); }
    }
  } else {
    blob(ctx, ch.top, c => {
      c.moveTo(-W * 0.9, shY + 2); c.quadraticCurveTo(0, shY - 12, W * 0.9, shY + 2);
      c.quadraticCurveTo(W * 1.1, shY + 4, W * 1.06, shY + P.torso * 0.18);
      c.quadraticCurveTo(W * 0.86, hipY - P.torso * 0.42, Hp * 1.15, hipY + 14);
      c.lineTo(-Hp * 1.15, hipY + 14); c.quadraticCurveTo(-W * 0.86, hipY - P.torso * 0.42, -W * 1.06, shY + P.torso * 0.18);
      c.quadraticCurveTo(-W * 1.1, shY + 4, -W * 0.9, shY + 2);
    });
    if (ch.cardigan) {
      for (const s of [-1, 1]) blob(ctx, ch.cardigan, c => {
        c.moveTo(s * W, shY + 6); c.quadraticCurveTo(s * W * 1.05, hipY - P.torso * 0.4, s * Hp * 1.2, hipY + 22);
        c.lineTo(s * Hp * 0.35, hipY + 22); c.lineTo(s * W * 0.25, shY + 2); c.quadraticCurveTo(s * W * 0.6, shY - 4, s * W, shY + 6);
      });
    }
    if (ch.skirt) blob(ctx, ch.skirt, c => { c.moveTo(-Hp * 1.1, hipY + 4); c.lineTo(Hp * 1.1, hipY + 4); c.lineTo(Hp * 1.75, hipY + P.leg * 0.42); c.quadraticCurveTo(0, hipY + P.leg * 0.47, -Hp * 1.75, hipY + P.leg * 0.42); });
    else blob(ctx, ch.bottom, c => c.roundRect(-Hp * 1.12, hipY + 2, Hp * 2.24, 26, 6));
  }
  if (E.gown) {                                      // graduation gown over clothes
    blob(ctx, E.gown, c => {
      c.moveTo(-W * 1.05, shY + 2); c.quadraticCurveTo(0, shY - 14, W * 1.05, shY + 2);
      c.lineTo(W * 1.45, hipY + P.leg * 0.62); c.quadraticCurveTo(0, hipY + P.leg * 0.68, -W * 1.45, hipY + P.leg * 0.62);
    });
    blob(ctx, '#f2c94c', c => { c.moveTo(-W * 0.45, shY - 2); c.lineTo(0, shY + P.torso * 0.35); c.lineTo(W * 0.45, shY - 2); c.lineTo(W * 0.25, shY - 6); c.lineTo(0, shY + P.torso * 0.22); c.lineTo(-W * 0.25, shY - 6); });
  }
  if (E.backpack) for (const s of [-1, 1]) limb(ctx, [s * W * 0.55, shY + 2, s * W * 0.62, shY + P.torso * 0.6], P.limb * 0.42, shade(E.backpack, 0.2), 'butt');
  if (E.necklace) { ctx.strokeStyle = '#d9b44a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, shY - 4, W * 0.4, Math.PI * 0.2, Math.PI * 0.8); ctx.stroke(); }

  // neck and head
  limb(ctx, [0, shY + 6, hx * 0.5, neckTop], P.R * 0.42, ch.skin, 'butt');
  circle(ctx, hx, hy, P.R, ch.skin);
  for (const s of [-1, 1]) circle(ctx, hx + s * P.R * 0.98, hy + P.R * 0.12, P.R * 0.16, ch.skin);   // ears
  hairFront(ctx, ch2, hx, hy, P.R, hairCol);
  face(ctx, ch2, hx, hy, P.R);
  if (E.cap) {                                       // graduation cap
    blob(ctx, '#2b2f3a', c => c.roundRect(hx - P.R * 0.75, hy - P.R * 1.18, P.R * 1.5, P.R * 0.38, 4));
    blob(ctx, '#2b2f3a', c => { c.moveTo(hx - P.R * 1.5, hy - P.R * 1.2); c.lineTo(hx, hy - P.R * 1.62); c.lineTo(hx + P.R * 1.5, hy - P.R * 1.2); c.lineTo(hx, hy - P.R * 0.85); });
    limb(ctx, [hx + P.R * 0.2, hy - P.R * 1.25, hx + P.R * 1.1, hy - P.R * 1.0, hx + P.R * 1.15, hy - P.R * 0.55], 3, '#f2c94c');
  }
  if (E.flowerCrown) for (let i = -3; i <= 3; i++) circle(ctx, hx + i * P.R * 0.28, hy - P.R * 0.98 + Math.abs(i) * P.R * 0.07, P.R * 0.13, i % 2 ? '#f6b6c8' : '#fff1f4');

  // front arm last, and anything held
  if (pose.behind !== 'r') drawArm('r'); else drawArm('l');
  const H = arms;
  if (E.camera) { const [, , , , ax, ay] = H.l, [, , , , bx, by] = H.r; camera(ctx, (ax + bx) / 2, (ay + by) / 2 - 6, E.cameraScale || 0.95, E.flash || 0); drawHandsOnTop(ctx, P, ch, H); }
  if (E.diploma) { const [, , , , ax, ay] = H[E.diploma]; ctx.save(); ctx.translate(ax, ay); ctx.rotate(-0.5); blob(ctx, '#fbf7ec', c => c.roundRect(-14, -70, 28, 120, 10)); limb(ctx, [-16, -10, 16, -10], 6, '#c0392b', 'butt'); ctx.restore(); circle(ctx, ax, ay, P.hand * 1.25, ch.skin); }
  if (E.bouquet) { const [, , , , ax, ay] = H.l, [, , , , bx, by] = H.r; const cx = (ax + bx) / 2, cy = (ay + by) / 2;
    limb(ctx, [cx, cy, cx, cy + 70], 14, '#6a9a55', 'butt');
    for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2; circle(ctx, cx + Math.cos(a) * 30, cy - 18 + Math.sin(a) * 22, 17, ['#f7c6d0', '#fff4f6', '#f5a8b8'][i % 3]); }
    circle(ctx, cx, cy - 18, 16, '#fff4f6'); circle(ctx, ax, ay, P.hand * 1.25, ch.skin); circle(ctx, bx, by, P.hand * 1.25, ch.skin); }
  ctx.restore();
}

function drawHandsOnTop(ctx, P, ch, H) {
  for (const s of ['l', 'r']) { const [, , , , x, y] = H[s]; circle(ctx, x, y, P.hand * 1.3, ch.skin); }
}

// baby sitting on a blanket (front view)
export function drawBaby(ctx, x, y, o = {}) {
  const R = 64;
  ctx.save(); ctx.translate(x, y);
  blob(ctx, o.onesie || '#bfe3f2', c => c.ellipse(0, -70, 82, 78, 0, 0, Math.PI * 2));                       // body
  for (const s of [-1, 1]) blob(ctx, o.onesie || '#bfe3f2', c => c.ellipse(s * 62, -18, 46, 26, s * 0.25, 0, Math.PI * 2));   // legs
  for (const s of [-1, 1]) circle(ctx, s * 102, -14, 18, o.skin || '#f6d3bd');                                 // feet
  limb(ctx, [-60, -110, -88, -60], 30, o.onesie || '#bfe3f2'); circle(ctx, -90, -55, 16, o.skin || '#f6d3bd');
  limb(ctx, [60, -110, 96, -150], 30, o.onesie || '#bfe3f2'); circle(ctx, 99, -156, 16, o.skin || '#f6d3bd');  // waving arm
  circle(ctx, 0, -190, R, o.skin || '#f6d3bd');
  for (const s of [-1, 1]) circle(ctx, s * R * 0.98, -182, R * 0.17, o.skin || '#f6d3bd');
  ctx.strokeStyle = OUT; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-6, -252); ctx.quadraticCurveTo(10, -270, 4, -282); ctx.stroke();   // one curl
  face(ctx, { face: { eyes: 'happy', mouth: 'open' }, skin: o.skin || '#f6d3bd', hairCol: '#8a6a50' }, 0, -190, R);
  ctx.restore();
}

// pencil-crayon texture: hatching + grain multiplied over whatever has been drawn
export function pencilTexture(ctx, w, h, seed = 1) {
  let s = seed * 9301 + 49297;
  const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  ctx.save(); ctx.globalCompositeOperation = 'multiply';
  ctx.strokeStyle = 'rgba(90,70,60,0.05)'; ctx.lineWidth = 1.2;
  for (let i = 0; i < 2600; i++) {
    const x = rnd() * w, y = rnd() * h, l = 6 + rnd() * 16;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + l * 0.7, y - l * 0.7); ctx.stroke();
  }
  ctx.globalCompositeOperation = 'source-atop';
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  for (let i = 0; i < 9000; i++) { const x = rnd() * w, y = rnd() * h; ctx.fillRect(x, y, 1.6, 1.6); }
  ctx.restore();
}

// world positions of the head and shoulders for a character standing at (x, y) with a scale
export function joints(age, x, y, scale = 1) {
  const P = AGES[age]();
  const hipY = -P.leg, shY = hipY - P.torso, hy = shY - P.neck - P.R * 0.92;
  return { head: [x, y + hy * scale], R: P.R * scale, shL: [x - P.sh * 0.98 * scale, y + (shY + P.limb * 0.85) * scale],
           shR: [x + P.sh * 0.98 * scale, y + (shY + P.limb * 0.85) * scale], up: P.up * scale, W: P.sh * scale, hip: y + hipY * scale };
}
