// Anime faces painted on a canvas and wrapped on a 3D head (planar UV from the front).
// Head space: x and y in [-1, 1]; the canvas maps x -> u, y -> 1 - v.
import { canvasTex } from './toon.js';

export const EXPR = {
  neutral:    { open: 1.0, tilt: 0.0, low: 0.0, pupil: 1.0, brow: [0.0, 0.0], mouth: ['line', 0.0], blush: 0.15 },
  tired:      { open: 0.55, tilt: -0.04, low: 0.04, pupil: 1.0, brow: [-0.03, -0.05], mouth: ['line', -0.02], bags: true, blush: 0.0 },
  sad:        { open: 0.85, tilt: 0.16, low: 0.04, pupil: 1.0, brow: [0.12, -0.06], mouth: ['line', -0.05], tear: true, blush: 0.25 },
  wide:       { open: 1.3, tilt: 0.0, low: 0.0, pupil: 0.5, brow: [0.14, 0.14], mouth: ['o', 0.05], sweat: true, blush: 0.0 },
  determined: { open: 0.85, tilt: -0.14, low: 0.16, pupil: 1.0, brow: [-0.13, 0.05], mouth: ['line', 0.0], blush: 0.1 },
  happy:      { open: 0.0, brow: [0.06, 0.06], mouth: ['smile', 0.06], blush: 0.6 },
  laugh:      { open: 0.0, brow: [0.1, 0.1], mouth: ['open', 0.12], blush: 0.7 },
  asleep:     { open: -1.0, brow: [0.0, 0.0], mouth: ['line', 0.01], blush: 0.25 },
};

export function faceTexture(look, expr = 'neutral', opts = {}) {
  const E = EXPR[expr];
  const S = opts.size || 1024;
  return canvasTex(S, S, (g) => {
    const X = (u) => (u + 1) / 2 * S, Y = (v) => (1 - (v + 1) / 2) * S, L = (d) => d / 2 * S;
    g.fillStyle = look.skin; g.fillRect(0, 0, S, S);
    // the fringe's shadow on the forehead (painted, as anime does), with a jagged lower edge
    if (!look.old) {
      g.fillStyle = look.skinShade; g.globalAlpha = 0.75; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, Y(0.4));
      for (let k = 0; k <= 14; k++) { const u = -1 + k / 7; g.lineTo(X(u), Y(0.3 + (k % 2 ? 0.0 : 0.12) + 0.05 * Math.sin(k * 1.7))); }
      g.lineTo(S, 0); g.closePath(); g.fill(); g.globalAlpha = 1;
    }
    // soft cheek shading and blush
    if (E.blush > 0) {
      for (const sx of [-1, 1]) {
        const gr = g.createRadialGradient(X(sx * 0.42), Y(-0.36), 0, X(sx * 0.42), Y(-0.36), L(0.2));
        gr.addColorStop(0, `rgba(240,120,110,${0.55 * E.blush})`); gr.addColorStop(1, 'rgba(240,120,110,0)');
        g.fillStyle = gr; g.fillRect(0, 0, S, S);
      }
    }
    if (look.freckles) {
      g.fillStyle = 'rgba(170,100,80,0.75)';
      for (const [u, v] of [[-0.48, -0.28], [-0.4, -0.32], [-0.55, -0.33], [0.48, -0.28], [0.4, -0.32], [0.55, -0.33]]) {
        g.beginPath(); g.arc(X(u), Y(v), L(0.012), 0, 7); g.fill();
      }
    }
    const ink = '#1a1220';
    g.lineCap = 'round'; g.lineJoin = 'round';
    for (const side of [-1, 1]) {
      const ex = side * 0.36, ey = -0.2;
      const w = 0.25, h = 0.36 * Math.max(0, E.open);
      if (E.open > 0.05) {
        const top = ey + h * 0.95;
        const tilt = (E.tilt || 0) * (side < 0 ? 1 : -1);
        g.save();
        g.beginPath();
        g.moveTo(X(ex - w), Y(ey));
        g.bezierCurveTo(X(ex - w * 0.7), Y(top + tilt * 0.7), X(ex + w * 0.4), Y(top - tilt * 0.5), X(ex + w), Y(ey + 0.02));
        g.bezierCurveTo(X(ex + w * 0.6), Y(ey - h * 0.55 + (E.low || 0)), X(ex - w * 0.5), Y(ey - h * 0.6 + (E.low || 0)), X(ex - w), Y(ey));
        g.closePath();
        g.fillStyle = '#ffffff'; g.fill();
        g.clip();
        const ir = 0.17, ix = ex + (opts.lookX || 0) * 0.06, iy = ey - 0.02 + (opts.lookY || 0) * 0.05;
        const gr = g.createLinearGradient(0, Y(iy + ir), 0, Y(iy - ir));
        gr.addColorStop(0.0, look.irisDark); gr.addColorStop(0.55, look.iris); gr.addColorStop(1.0, look.irisLight);
        g.fillStyle = gr; g.beginPath(); g.ellipse(X(ix), Y(iy), L(ir * 0.86), L(ir * 1.12), 0, 0, 7); g.fill();
        g.strokeStyle = look.irisDark; g.lineWidth = L(0.016); g.beginPath(); g.ellipse(X(ix), Y(iy), L(ir * 0.82), L(ir * 1.08), 0, 0, 7); g.stroke();
        g.fillStyle = '#120a08'; g.beginPath(); g.ellipse(X(ix), Y(iy + 0.01), L(ir * 0.36 * (E.pupil || 1)), L(ir * 0.46 * (E.pupil || 1)), 0, 0, 7); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.18)'; g.beginPath(); g.ellipse(X(ix), Y(iy - ir * 0.55), L(ir * 0.6), L(ir * 0.32), 0, 0, 7); g.fill();
        if (opts.reflectJar) {   // the jar, tiny, in the iris: shoulders, lid and glowing beads
          const jx = ix - 0.005, jb = iy - 0.075, jw = 0.06, jh = 0.11;
          g.fillStyle = 'rgba(255,190,80,0.35)'; g.beginPath(); g.ellipse(X(jx), Y(jb + jh * 0.45), L(jw * 1.1), L(jh * 0.75), 0, 0, 7); g.fill();
          g.fillStyle = '#ffcf6a'; g.beginPath();
          g.moveTo(X(jx - jw / 2), Y(jb)); g.lineTo(X(jx - jw / 2), Y(jb + jh * 0.72)); g.quadraticCurveTo(X(jx - jw / 2), Y(jb + jh * 0.86), X(jx - jw * 0.32), Y(jb + jh * 0.88));
          g.lineTo(X(jx + jw * 0.32), Y(jb + jh * 0.88)); g.quadraticCurveTo(X(jx + jw / 2), Y(jb + jh * 0.86), X(jx + jw / 2), Y(jb + jh * 0.72)); g.lineTo(X(jx + jw / 2), Y(jb)); g.closePath(); g.fill();
          g.fillStyle = '#7a3a12'; g.fillRect(X(jx - jw * 0.36), Y(jb + jh), L(jw * 0.72), L(jh * 0.12));
          for (let k = 0; k < 14; k++) { g.fillStyle = k % 3 ? '#fff2c0' : '#ff9a30'; g.beginPath(); g.arc(X(jx - jw * 0.38 + (k % 5) * jw * 0.19), Y(jb + 0.01 + Math.floor(k / 5) * 0.022), L(0.007), 0, 7); g.fill(); }
        }
        g.fillStyle = 'rgba(30,15,40,0.3)'; g.fillRect(0, Y(top + 0.2), S, L(0.15));   // lid shadow
        g.fillStyle = '#ffffff';
        g.beginPath(); g.ellipse(X(ix + ir * 0.38), Y(iy + ir * 0.42), L(ir * 0.3), L(ir * 0.23), 0, 0, 7); g.fill();
        g.beginPath(); g.arc(X(ix - ir * 0.42), Y(iy - ir * 0.38), L(ir * 0.11), 0, 7); g.fill();
        g.restore();
        // upper lash line with a wing
        g.strokeStyle = ink; g.lineWidth = L(0.055);
        g.beginPath(); g.moveTo(X(ex - w * 1.05), Y(ey - 0.01));
        g.bezierCurveTo(X(ex - w * 0.7), Y(top + tilt * 0.7 + 0.02), X(ex + w * 0.45), Y(top - tilt * 0.5 + 0.02), X(ex + w * 1.15), Y(ey + 0.07));
        g.stroke();
        g.lineWidth = L(0.016);
        g.beginPath(); g.moveTo(X(ex - w * 0.55), Y(ey - h * 0.58 + (E.low || 0))); g.quadraticCurveTo(X(ex), Y(ey - h * 0.66 + (E.low || 0)), X(ex + w * 0.7), Y(ey - h * 0.5 + (E.low || 0))); g.stroke();
        if (E.bags) { g.lineWidth = L(0.012); g.beginPath(); g.moveTo(X(ex - w * 0.5), Y(ey - 0.2)); g.quadraticCurveTo(X(ex), Y(ey - 0.25), X(ex + w * 0.5), Y(ey - 0.2)); g.stroke(); }
      } else if (E.open < -0.5) {
        g.strokeStyle = ink; g.lineWidth = L(0.04);
        g.beginPath(); g.moveTo(X(ex - w), Y(ey)); g.quadraticCurveTo(X(ex), Y(ey - 0.07), X(ex + w), Y(ey)); g.stroke();
      } else {
        g.strokeStyle = ink; g.lineWidth = L(0.045);
        g.beginPath(); g.moveTo(X(ex - w), Y(ey - 0.04)); g.quadraticCurveTo(X(ex), Y(ey + 0.1), X(ex + w), Y(ey - 0.04)); g.stroke();
      }
      // brow
      const [bi, bo] = E.brow;
      g.strokeStyle = look.browColor || '#3b2a22'; g.lineWidth = L(0.04);
      g.beginPath(); g.moveTo(X(ex - side * w * 0.9), Y(ey + 0.42 + bi)); g.quadraticCurveTo(X(ex), Y(ey + 0.48 + (bi + bo) / 2), X(ex + side * w), Y(ey + 0.42 + bo)); g.stroke();
    }
    // nose and mouth
    g.strokeStyle = 'rgba(150,80,70,0.85)'; g.lineWidth = L(0.016);
    g.beginPath(); g.moveTo(X(0.02), Y(-0.3)); g.lineTo(X(0.05), Y(-0.37)); g.lineTo(X(0.0), Y(-0.385)); g.stroke();
    const [mk, cv] = E.mouth;
    g.strokeStyle = ink; g.lineWidth = L(0.022);
    if (mk === 'line' || mk === 'smile') {
      g.beginPath(); g.moveTo(X(-0.11), Y(-0.55 + cv * 0.5)); g.quadraticCurveTo(X(0), Y(-0.55 - cv), X(0.11), Y(-0.55 + cv * 0.5)); g.stroke();
    } else {
      g.fillStyle = '#7a2a2a';
      g.beginPath();
      if (mk === 'o') g.ellipse(X(0), Y(-0.57), L(0.05), L(0.065), 0, 0, 7);
      else { g.moveTo(X(-0.14), Y(-0.52)); g.quadraticCurveTo(X(0), Y(-0.5), X(0.14), Y(-0.52)); g.quadraticCurveTo(X(0.08), Y(-0.66), X(0), Y(-0.67)); g.quadraticCurveTo(X(-0.08), Y(-0.66), X(-0.14), Y(-0.52)); }
      g.fill(); g.stroke();
      g.fillStyle = '#e07a7a'; g.beginPath(); g.ellipse(X(0), Y(mk === 'o' ? -0.6 : -0.63), L(mk === 'o' ? 0.03 : 0.06), L(0.025), 0, 0, 7); g.fill();
    }
    if (E.tear) { g.fillStyle = 'rgba(190,225,255,0.95)'; g.beginPath(); g.ellipse(X(-0.42), Y(-0.24), L(0.025), L(0.045), 0, 0, 7); g.fill(); }
    if (E.sweat) { g.fillStyle = 'rgba(200,230,255,0.95)'; g.beginPath(); g.ellipse(X(0.62), Y(0.32), L(0.03), L(0.055), 0, 0, 7); g.fill(); }
    if (look.wrinkles) {
      g.strokeStyle = 'rgba(150,90,80,0.7)'; g.lineWidth = L(0.012);
      for (const sd of [-1, 1]) {
        for (const k of [0, 1]) { g.beginPath(); g.moveTo(X(sd * 0.64), Y(-0.16 - k * 0.07)); g.lineTo(X(sd * 0.72), Y(-0.13 - k * 0.1)); g.stroke(); }
        g.beginPath(); g.moveTo(X(sd * 0.14), Y(-0.36)); g.quadraticCurveTo(X(sd * 0.22), Y(-0.48), X(sd * 0.2), Y(-0.58)); g.stroke();
      }
    }
    if (look.mustache) {
      g.fillStyle = look.hair; g.beginPath(); g.ellipse(X(-0.1), Y(-0.47), L(0.13), L(0.045), 0.2, 0, 7); g.ellipse(X(0.1), Y(-0.47), L(0.13), L(0.045), -0.2, 0, 7); g.fill();
    }
  });
}
