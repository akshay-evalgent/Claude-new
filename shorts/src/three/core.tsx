/* Shared 3D building blocks: units, cached geometry/materials, segment + ball helpers, canvas textures. */
import React from 'react';
import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

export const U = 0.01; // 1 world unit = 100 px of the 2D layout
export const X = (px: number) => (px - 540) * U;
export type V3 = [number, number, number];

// ---------- geometry ----------
export const GEO = {
  sphere: new THREE.SphereGeometry(1, 40, 28),
  sphereLo: new THREE.SphereGeometry(1, 18, 12),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 24, 1, true),
  cylC: new THREE.CylinderGeometry(1, 1, 1, 32),
  box: new THREE.BoxGeometry(1, 1, 1),
  plane: new THREE.PlaneGeometry(1, 1),
  cone: new THREE.ConeGeometry(1, 1, 24, 1),
  circle: new THREE.CircleGeometry(1, 40),
};
const rbCache = new Map<string, THREE.BufferGeometry>();
export const rbox = (w: number, h: number, d: number, r = 0.06) => {
  const k = `${w.toFixed(3)}|${h.toFixed(3)}|${d.toFixed(3)}|${r}`;
  let g = rbCache.get(k);
  if (!g) {
    g = new RoundedBoxGeometry(w, h, d, 4, Math.min(r, w / 2 - 1e-3, h / 2 - 1e-3, d / 2 - 1e-3));
    rbCache.set(k, g);
  }
  return g;
};
const arcCache = new Map<string, THREE.TorusGeometry>();
export const arc = (R: number, tube: number, a: number) => {
  const k = `${R}|${tube}|${a}`;
  let g = arcCache.get(k);
  if (!g) {
    g = new THREE.TorusGeometry(R, tube, 10, 28, a);
    arcCache.set(k, g);
  }
  return g;
};

// ---------- materials ----------
type MatOpts = {rough?: number; metal?: number; emissive?: string; ei?: number; transparent?: boolean; opacity?: number; side?: THREE.Side; map?: THREE.Texture | null; vertexColors?: boolean; depthWrite?: boolean; blending?: THREE.Blending; toneMapped?: boolean};
const matCache = new Map<string, THREE.Material>();
export const mat = (color: string, o: MatOpts = {}) => {
  const k = `${color}|${JSON.stringify({...o, map: o.map ? o.map.uuid : null})}`;
  let m = matCache.get(k);
  if (!m) {
    m = new THREE.MeshStandardMaterial({
      color,
      roughness: o.rough ?? 0.78,
      metalness: o.metal ?? 0,
      emissive: o.emissive ?? '#000000',
      emissiveIntensity: o.ei ?? 1,
      transparent: o.transparent ?? false,
      opacity: o.opacity ?? 1,
      side: o.side ?? THREE.FrontSide,
      map: o.map ?? null,
      vertexColors: o.vertexColors ?? false,
      depthWrite: o.depthWrite ?? true,
      blending: o.blending ?? THREE.NormalBlending,
    });
    if (o.toneMapped === false) m.toneMapped = false;
    matCache.set(k, m);
  }
  return m;
};
const basicCache = new Map<string, THREE.Material>();
export const basic = (color: string, o: {map?: THREE.Texture; transparent?: boolean; opacity?: number; additive?: boolean; side?: THREE.Side} = {}) => {
  const k = `${color}|${o.map?.uuid}|${o.transparent}|${o.opacity}|${o.additive}|${o.side}`;
  let m = basicCache.get(k);
  if (!m) {
    m = new THREE.MeshBasicMaterial({
      color,
      map: o.map ?? null,
      transparent: o.transparent ?? false,
      opacity: o.opacity ?? 1,
      blending: o.additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      depthWrite: !(o.transparent || o.additive),
      side: o.side ?? THREE.FrontSide,
      toneMapped: false,
    });
    basicCache.set(k, m);
  }
  return m;
};

// ---------- primitives ----------
const Y_UP = new THREE.Vector3(0, 1, 0);
type Shadow = {cast?: boolean; receive?: boolean};

/** Cylinder from a to b (radius r). Pair with Ball at the joints for capsule limbs. */
export const Seg: React.FC<{a: V3; b: V3; r: number; m: THREE.Material} & Shadow> = ({a, b, r, m, cast = true, receive = false}) => {
  const va = new THREE.Vector3(...a);
  const d = new THREE.Vector3(...b).sub(va);
  const len = Math.max(1e-4, d.length());
  const q = new THREE.Quaternion().setFromUnitVectors(Y_UP, d.clone().divideScalar(len));
  const mid = va.addScaledVector(d, 0.5);
  return <mesh geometry={GEO.cyl} material={m} position={mid} quaternion={q} scale={[r, len, r]} castShadow={cast} receiveShadow={receive} />;
};

export const Ball: React.FC<{p: V3; r: number | V3; m: THREE.Material; rot?: V3} & Shadow> = ({p, r, m, rot, cast = true, receive = false}) => (
  <mesh geometry={GEO.sphere} material={m} position={p} scale={typeof r === 'number' ? [r, r, r] : r} rotation={rot} castShadow={cast} receiveShadow={receive} />
);

export const RBox: React.FC<{p: V3; s: V3; m: THREE.Material; r?: number; rot?: V3} & Shadow> = ({p, s, m, r = 0.05, rot, cast = true, receive = true}) => (
  <mesh geometry={rbox(s[0], s[1], s[2], r)} material={m} position={p} rotation={rot} castShadow={cast} receiveShadow={receive} />
);

export const Box: React.FC<{p: V3; s: V3; m: THREE.Material; rot?: V3} & Shadow> = ({p, s, m, rot, cast = true, receive = true}) => (
  <mesh geometry={GEO.box} material={m} position={p} scale={s} rotation={rot} castShadow={cast} receiveShadow={receive} />
);

export const Cyl: React.FC<{p: V3; r: number; h: number; m: THREE.Material; rot?: V3; rTop?: number} & Shadow> = ({p, r, h, m, rot, cast = true, receive = true}) => (
  <mesh geometry={GEO.cylC} material={m} position={p} scale={[r, h, r]} rotation={rot} castShadow={cast} receiveShadow={receive} />
);

/** Flat textured card (paper, poster). Faces +z. */
export const Card: React.FC<{p: V3; w: number; h: number; tex: THREE.Texture; rot?: V3; back?: string; thick?: number; shadow?: boolean}> = ({p, w, h, tex, rot, back = '#f4efe4', thick = 0.012, shadow = true}) => (
  <group position={p} rotation={rot}>
    <mesh geometry={GEO.box} material={mat(back, {rough: 0.9})} scale={[w, h, thick]} castShadow={shadow} receiveShadow />
    <mesh geometry={GEO.plane} material={mat('#ffffff', {map: tex, rough: 0.85})} position={[0, 0, thick / 2 + 0.002]} scale={[w * 0.995, h * 0.995, 1]} receiveShadow />
  </group>
);

/** Soft contact shadow under feet / furniture. */
export const Blob: React.FC<{p: V3; sx: number; sz: number; o?: number}> = ({p, sx, sz, o = 0.38}) => (
  <mesh geometry={GEO.plane} material={basic('#000000', {map: tex.blob(), transparent: true, opacity: o})} position={p} rotation={[-Math.PI / 2, 0, 0]} scale={[sx, sz, 1]} renderOrder={1} />
);

// ---------- canvas textures ----------
const texCache = new Map<string, THREE.Texture>();
const canvasTex = (key: string, w: number, h: number, draw: (c: CanvasRenderingContext2D) => void, repeat?: [number, number]) => {
  let t = texCache.get(key);
  if (t) return t;
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext('2d')!;
  draw(ctx);
  t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat[0], repeat[1]);
  }
  texCache.set(key, t);
  return t;
};

const rnd = (s: number) => {
  const x = Math.sin(s * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

export type DrawingKind = 'family' | 'rocket' | 'dog' | 'house' | 'sun' | 'portrait' | 'dino';

const crayon = (c: CanvasRenderingContext2D, color: string, w = 9) => {
  c.strokeStyle = color;
  c.lineWidth = w;
  c.lineCap = 'round';
  c.lineJoin = 'round';
};

const drawDoodle = (c: CanvasRenderingContext2D, kind: DrawingKind, W: number, H: number) => {
  const cx = W / 2;
  const cy = H / 2;
  const s = W / 110;
  const P = (fn: () => void) => {
    c.beginPath();
    fn();
    c.stroke();
  };
  const fillCircle = (x: number, y: number, r: number, fill: string, stroke: string) => {
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    c.fillStyle = fill;
    c.fill();
    crayon(c, stroke, 3.5 * s);
    c.stroke();
  };
  const stick = (x: number, y: number, k: number, col: string) => {
    crayon(c, col, 3.2 * s);
    P(() => c.arc(x, y - 14 * k, 7 * k, 0, Math.PI * 2));
    P(() => {
      c.moveTo(x, y - 7 * k);
      c.lineTo(x, y + 12 * k);
      c.moveTo(x - 10 * k, y);
      c.lineTo(x + 10 * k, y);
      c.moveTo(x, y + 12 * k);
      c.lineTo(x - 7 * k, y + 24 * k);
      c.moveTo(x, y + 12 * k);
      c.lineTo(x + 7 * k, y + 24 * k);
    });
  };
  switch (kind) {
    case 'family':
      fillCircle(W - 20 * s, 18 * s, 10 * s, '#ffd34d', '#f5a623');
      stick(cx - 18 * s, cy - 2 * s, s * 1.15, '#2f9c8f');
      stick(cx + 12 * s, cy + 6 * s, s * 0.8, '#e8a21a');
      crayon(c, '#e2445c', 3 * s);
      c.fillStyle = '#ff6b81';
      P(() => {
        const hx = cx - 2 * s;
        const hy = cy - 26 * s;
        c.moveTo(hx, hy + 6 * s);
        c.bezierCurveTo(hx - 10 * s, hy - 2 * s, hx - 4 * s, hy - 10 * s, hx, hy - 4 * s);
        c.bezierCurveTo(hx + 4 * s, hy - 10 * s, hx + 10 * s, hy - 2 * s, hx, hy + 6 * s);
        c.fill();
      });
      crayon(c, '#5cb85c', 3.5 * s);
      P(() => {
        c.moveTo(6 * s, H - 12 * s);
        c.quadraticCurveTo(W / 4, H - 20 * s, W / 2, H - 12 * s);
        c.quadraticCurveTo((W * 3) / 4, H - 4 * s, W - 6 * s, H - 12 * s);
      });
      break;
    case 'rocket':
      c.fillStyle = '#ffdede';
      crayon(c, '#e2445c', 3.5 * s);
      P(() => {
        c.moveTo(cx, cy - 30 * s);
        c.quadraticCurveTo(cx + 16 * s, cy - 14 * s, cx + 11 * s, cy + 12 * s);
        c.lineTo(cx - 11 * s, cy + 12 * s);
        c.quadraticCurveTo(cx - 16 * s, cy - 14 * s, cx, cy - 30 * s);
        c.fill();
      });
      fillCircle(cx, cy - 7 * s, 5 * s, '#bfe0ff', '#3b82f6');
      c.fillStyle = '#ffd34d';
      crayon(c, '#f5a623', 3.5 * s);
      P(() => {
        c.moveTo(cx - 7 * s, cy + 13 * s);
        c.lineTo(cx, cy + 28 * s);
        c.lineTo(cx + 7 * s, cy + 13 * s);
        c.fill();
      });
      crayon(c, '#f5c518', 3 * s);
      [[-38, -22], [34, -18], [-30, 16], [40, 20]].forEach(([dx, dy]) =>
        P(() => {
          c.moveTo(cx + dx * s - 5 * s, cy + dy * s);
          c.lineTo(cx + dx * s + 5 * s, cy + dy * s);
          c.moveTo(cx + dx * s, cy + dy * s - 5 * s);
          c.lineTo(cx + dx * s, cy + dy * s + 5 * s);
        }),
      );
      break;
    case 'portrait':
      fillCircle(cx, cy - 2 * s, 19 * s, '#ffe0bd', '#d2691e');
      c.fillStyle = '#333';
      [-6, 6].forEach((dx) => {
        c.beginPath();
        c.arc(cx + dx * s, cy - 7 * s, 2.4 * s, 0, Math.PI * 2);
        c.fill();
      });
      crayon(c, '#e2445c', 3 * s);
      P(() => c.arc(cx, cy + 1 * s, 8 * s, 0.15 * Math.PI, 0.85 * Math.PI));
      crayon(c, '#4a2d1f', 6 * s);
      P(() => c.arc(cx, cy - 2 * s, 20 * s, 1.1 * Math.PI, 1.9 * Math.PI));
      fillCircle(cx - 22 * s, cy + 6 * s, 5 * s, '#4a2d1f', '#4a2d1f');
      fillCircle(cx + 22 * s, cy + 6 * s, 5 * s, '#4a2d1f', '#4a2d1f');
      crayon(c, '#ff6b81', 3 * s);
      P(() => {
        c.moveTo(W - 16 * s, 12 * s);
        c.lineTo(W - 10 * s, 20 * s);
      });
      break;
    case 'sun':
      fillCircle(cx, cy, 14 * s, '#ffd34d', '#f5a623');
      crayon(c, '#f5a623', 3.5 * s);
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4;
        P(() => {
          c.moveTo(cx + Math.cos(a) * 20 * s, cy + Math.sin(a) * 20 * s);
          c.lineTo(cx + Math.cos(a) * 29 * s, cy + Math.sin(a) * 29 * s);
        });
      }
      break;
    case 'dog':
      c.fillStyle = '#f3d2a2';
      crayon(c, '#8b5a2b', 3.5 * s);
      P(() => {
        c.ellipse(cx, cy + 4 * s, 22 * s, 12 * s, 0, 0, Math.PI * 2);
        c.fill();
      });
      fillCircle(cx + 22 * s, cy - 8 * s, 10 * s, '#f3d2a2', '#8b5a2b');
      P(() => {
        c.moveTo(cx - 14 * s, cy + 14 * s);
        c.lineTo(cx - 14 * s, cy + 24 * s);
        c.moveTo(cx + 12 * s, cy + 14 * s);
        c.lineTo(cx + 12 * s, cy + 24 * s);
      });
      break;
    case 'house':
      c.fillStyle = '#ffe3c4';
      crayon(c, '#e2445c', 3.5 * s);
      P(() => {
        c.moveTo(cx - 24 * s, cy + 22 * s);
        c.lineTo(cx - 24 * s, cy - 2 * s);
        c.lineTo(cx, cy - 22 * s);
        c.lineTo(cx + 24 * s, cy - 2 * s);
        c.lineTo(cx + 24 * s, cy + 22 * s);
        c.closePath();
        c.fill();
      });
      fillCircle(16 * s, 16 * s, 8 * s, '#ffd34d', '#f5a623');
      break;
    case 'dino':
    default:
      c.fillStyle = '#b9efc0';
      crayon(c, '#3c9a4a', 3.5 * s);
      P(() => {
        c.moveTo(cx - 30 * s, cy + 14 * s);
        c.quadraticCurveTo(cx - 20 * s, cy - 16 * s, cx + 4 * s, cy - 4 * s);
        c.quadraticCurveTo(cx + 14 * s, cy - 20 * s, cx + 26 * s, cy - 12 * s);
        c.quadraticCurveTo(cx + 20 * s, cy - 4 * s, cx + 14 * s, cy - 2 * s);
        c.quadraticCurveTo(cx + 18 * s, cy + 16 * s, cx + 8 * s, cy + 24 * s);
        c.closePath();
        c.fill();
      });
  }
};

export const tex = {
  drawing: (kind: DrawingKind, tint = '#fffdf6') =>
    canvasTex(`draw-${kind}-${tint}`, 330, 252, (c) => {
      c.fillStyle = tint;
      c.fillRect(0, 0, 330, 252);
      // paper grain
      for (let i = 0; i < 400; i++) {
        c.fillStyle = `rgba(0,0,0,${0.015 + rnd(i) * 0.02})`;
        c.fillRect(rnd(i * 3) * 330, rnd(i * 7) * 252, 2, 2);
      }
      c.save();
      c.scale(3, 3);
      drawDoodle(c, kind, 110, 84);
      c.restore();
    }),
  wood: (base = '#c4935f') =>
    canvasTex(
      `wood-${base}`,
      1024,
      1024,
      (c) => {
        const col = new THREE.Color(base);
        for (let row = 0; row < 8; row++) {
          for (let k = 0; k < 3; k++) {
            const off = (row % 2) * 170 + k * 340;
            const v = (rnd(row * 13 + k) - 0.5) * 0.12;
            const cc = col.clone().offsetHSL(0, 0, v);
            c.fillStyle = `#${cc.getHexString()}`;
            c.fillRect(off - 340, row * 128, 340, 128);
            c.fillRect(off, row * 128, 340, 128);
            c.fillRect(off + 340, row * 128, 340, 128);
          }
          for (let g = 0; g < 14; g++) {
            c.strokeStyle = `rgba(60,30,10,${0.05 + rnd(row * 31 + g) * 0.06})`;
            c.lineWidth = 2;
            c.beginPath();
            const y = row * 128 + rnd(row * 7 + g) * 128;
            c.moveTo(0, y);
            c.bezierCurveTo(300, y + 6, 700, y - 6, 1024, y + 2);
            c.stroke();
          }
          c.fillStyle = 'rgba(40,20,8,0.35)';
          c.fillRect(0, row * 128, 1024, 3);
          for (let k = 0; k < 4; k++) c.fillRect(((row % 2) * 170 + k * 340) % 1024, row * 128, 3, 128);
        }
      },
      [5, 3],
    ),
  tiles: (base = '#e3ecdc') =>
    canvasTex(
      `tiles-${base}`,
      512,
      512,
      (c) => {
        c.fillStyle = '#b9c4b4';
        c.fillRect(0, 0, 512, 512);
        for (let i = 0; i < 8; i++)
          for (let j = 0; j < 8; j++) {
            const v = (rnd(i * 9 + j) - 0.5) * 0.05;
            c.fillStyle = `#${new THREE.Color(base).offsetHSL(0, 0, v).getHexString()}`;
            c.fillRect(i * 64 + 3, j * 64 + 3, 58, 58);
            c.fillStyle = 'rgba(255,255,255,0.25)';
            c.fillRect(i * 64 + 6, j * 64 + 6, 20, 6);
          }
      },
      [4, 2],
    ),
  sky: (kind: 'day' | 'evening' | 'night' | 'dusk') =>
    canvasTex(`sky-${kind}`, 512, 512, (c) => {
      const g = c.createLinearGradient(0, 0, 0, 512);
      const stops: Record<string, [string, string]> = {day: ['#7cc8f2', '#e8f7fd'], evening: ['#f39a5f', '#ffd9a0'], night: ['#0d1630', '#22305a'], dusk: ['#f57d5b', '#ffc58a']};
      g.addColorStop(0, stops[kind][0]);
      g.addColorStop(1, stops[kind][1]);
      c.fillStyle = g;
      c.fillRect(0, 0, 512, 512);
      if (kind === 'night') {
        for (let i = 0; i < 60; i++) {
          c.fillStyle = `rgba(255,255,255,${0.4 + rnd(i) * 0.6})`;
          c.beginPath();
          c.arc(rnd(i * 3) * 512, rnd(i * 5) * 400, 1 + rnd(i * 7) * 2.2, 0, Math.PI * 2);
          c.fill();
        }
        c.fillStyle = '#fff6d0';
        c.beginPath();
        c.arc(360, 140, 52, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = '#16203f';
        c.beginPath();
        c.arc(385, 125, 48, 0, Math.PI * 2);
        c.fill();
      } else {
        c.fillStyle = kind === 'day' ? 'rgba(255,255,240,0.9)' : 'rgba(255,220,120,0.95)';
        c.beginPath();
        c.arc(kind === 'day' ? 380 : 256, kind === 'day' ? 130 : 330, 46, 0, Math.PI * 2);
        c.fill();
        // soft clouds
        c.fillStyle = 'rgba(255,255,255,0.7)';
        [[120, 150, 50], [170, 140, 40], [80, 160, 34]].forEach(([x, y, r]) => {
          c.beginPath();
          c.arc(x, y, r, 0, Math.PI * 2);
          c.fill();
        });
      }
      // hills / rooftops
      c.fillStyle = kind === 'night' ? '#0a1024' : kind === 'day' ? '#6fb36f' : '#9a6a6a';
      c.beginPath();
      c.moveTo(0, 430);
      c.quadraticCurveTo(120, 360, 250, 420);
      c.quadraticCurveTo(380, 350, 512, 410);
      c.lineTo(512, 512);
      c.lineTo(0, 512);
      c.fill();
    }),
  blob: () =>
    canvasTex('blob', 128, 128, (c) => {
      const g = c.createRadialGradient(64, 64, 0, 64, 64, 64);
      g.addColorStop(0, 'rgba(0,0,0,1)');
      g.addColorStop(0.45, 'rgba(0,0,0,0.55)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = g;
      c.fillRect(0, 0, 128, 128);
    }),
  glow: () =>
    canvasTex('glow', 128, 128, (c) => {
      const g = c.createRadialGradient(64, 64, 0, 64, 64, 64);
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(0.3, 'rgba(255,255,255,0.45)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g;
      c.fillRect(0, 0, 128, 128);
    }),
  shaft: () =>
    canvasTex('shaft', 64, 256, (c) => {
      const g = c.createLinearGradient(0, 0, 0, 256);
      g.addColorStop(0, 'rgba(255,255,255,0.9)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g;
      c.fillRect(0, 0, 64, 256);
      const h = c.createLinearGradient(0, 0, 64, 0);
      h.addColorStop(0, 'rgba(0,0,0,1)');
      h.addColorStop(0.2, 'rgba(0,0,0,0)');
      h.addColorStop(0.8, 'rgba(0,0,0,0)');
      h.addColorStop(1, 'rgba(0,0,0,1)');
      c.globalCompositeOperation = 'destination-out';
      c.fillStyle = h;
      c.fillRect(0, 0, 64, 256);
    }),
  label: (text: string, bg: string, fg: string, w = 256, h = 96, size = 52) =>
    canvasTex(`label-${text}-${bg}-${fg}-${w}x${h}`, w, h, (c) => {
      c.fillStyle = bg;
      c.fillRect(0, 0, w, h);
      c.fillStyle = fg;
      c.font = `700 ${size}px Fredoka, sans-serif`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(text, w / 2, h / 2 + 2);
    }),
  sheet: (title: string, lines = 6, accent = '#2c3550') =>
    canvasTex(`sheet-${title}-${lines}`, 256, 320, (c) => {
      c.fillStyle = '#ffffff';
      c.fillRect(0, 0, 256, 320);
      c.fillStyle = accent;
      c.font = '700 30px Fredoka, sans-serif';
      c.textAlign = 'center';
      c.fillText(title, 128, 50);
      for (let i = 0; i < lines; i++) {
        c.strokeStyle = accent;
        c.lineWidth = 3;
        c.strokeRect(30, 80 + i * 36, 18, 18);
        c.fillStyle = '#9aa3b5';
        c.fillRect(62, 86 + i * 36, 150 - (i % 3) * 30, 7);
      }
    }),
  phoneScreen: () =>
    canvasTex('phone', 96, 192, (c) => {
      const g = c.createLinearGradient(0, 0, 0, 192);
      g.addColorStop(0, '#6ec3ff');
      g.addColorStop(1, '#9b7bff');
      c.fillStyle = g;
      c.fillRect(0, 0, 96, 192);
      for (let i = 0; i < 4; i++) {
        c.fillStyle = 'rgba(255,255,255,0.85)';
        c.fillRect(10, 14 + i * 44, 76, 34);
        c.fillStyle = ['#ff6b81', '#ffd34d', '#5be3a3', '#ff9f43'][i];
        c.fillRect(14, 18 + i * 44, 26, 26);
      }
    }),
};
