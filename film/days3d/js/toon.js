// Toon (cel) shading with an anime rim light, and ink outlines as inverted hulls.
import * as THREE from 'three';

function gradientMap(steps) {
  const data = new Uint8Array(steps.length * 4);
  steps.forEach((v, i) => { const c = Math.round(v * 255); data.set([c, c, c, 255], i * 4); });
  const t = new THREE.DataTexture(data, steps.length, 1, THREE.RGBAFormat);
  t.minFilter = THREE.NearestFilter; t.magFilter = THREE.NearestFilter; t.needsUpdate = true;
  return t;
}
export const GM3 = gradientMap([0.42, 0.72, 1.0]);
export const GM2 = gradientMap([0.55, 1.0]);
const gmCache = new Map();
export function gm(steps) { const k = steps.join(','); if (!gmCache.has(k)) gmCache.set(k, gradientMap(steps)); return gmCache.get(k); }

export const INK = 0x1a1220;

export function toon(color, opts = {}) {
  const steps = Array.isArray(opts.steps) ? gm(opts.steps) : opts.steps === 2 ? GM2 : GM3;
  const m = new THREE.MeshToonMaterial({ color, gradientMap: steps, map: opts.map || null, side: opts.side ?? THREE.FrontSide,
    emissive: opts.emissive ?? 0x000000, emissiveIntensity: opts.emissiveIntensity ?? 1.0, transparent: !!opts.transparent, opacity: opts.opacity ?? 1 });
  if (m.map) m.map.colorSpace = THREE.SRGBColorSpace;
  const rim = { value: new THREE.Color(opts.rim ?? 0xbfd4ff) };
  const rimK = { value: opts.rimStrength ?? 0.28 };
  m.userData.rim = rim; m.userData.rimK = rimK;
  const band = opts.band;   // anime hair sheen: a jagged band in view space
  const bandC = { value: new THREE.Color(band ? band.color : 0xffffff) };
  m.onBeforeCompile = (sh) => {
    sh.uniforms.rimColor = rim; sh.uniforms.rimStrength = rimK; sh.uniforms.bandColor = bandC;
    const bandCode = band ? `
      { vec3 n = normalize(normal); float zig = sin(n.x * 38.0) * 0.035;
        float b = smoothstep(${band.y0.toFixed(3)} + zig, ${(band.y0 + 0.02).toFixed(3)} + zig, n.y) * (1.0 - smoothstep(${(band.y1 - 0.02).toFixed(3)} - zig, ${band.y1.toFixed(3)} - zig, n.y));
        b *= 1.0 - smoothstep(0.55, 0.75, abs(n.x));
        gl_FragColor.rgb = mix(gl_FragColor.rgb, bandColor, b * ${(band.k ?? 0.8).toFixed(2)}); }` : '';
    sh.fragmentShader = 'uniform vec3 rimColor;\nuniform float rimStrength;\nuniform vec3 bandColor;\n' + sh.fragmentShader.replace('#include <dithering_fragment>', `
      { float r = 1.0 - clamp(dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0);
        r = smoothstep(0.62, 0.86, r);
        gl_FragColor.rgb += rimColor * r * rimStrength; }${bandCode}
      #include <dithering_fragment>`);
  };
  m.customProgramCacheKey = () => 'toon' + (band ? JSON.stringify(band) : '');
  return m;
}

export function glow(color, intensity = 1.0) {
  const c = new THREE.Color(color).multiplyScalar(intensity);
  return new THREE.MeshBasicMaterial({ color: c, toneMapped: false });
}

const outlineCache = new Map();
function outlineMat(th, color) {
  const key = th.toFixed(4) + ':' + color;
  if (outlineCache.has(key)) return outlineCache.get(key);
  const m = new THREE.MeshBasicMaterial({ color, side: THREE.BackSide });
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', `vec3 transformed = position + normalize(normal) * ${th.toFixed(4)};`);
  };
  outlineCache.set(key, m);
  return m;
}

// Adds an ink outline to a mesh (thickness in the mesh's local units).
export function ink(mesh, th = 0.02, color = INK) {
  const o = new THREE.Mesh(mesh.geometry, outlineMat(th, color));
  o.castShadow = false; o.receiveShadow = false;
  mesh.add(o);
  return mesh;
}

export function mesh(geo, mat, th = null, parent = null) {
  const m = new THREE.Mesh(geo, mat);
  if (th) ink(m, th);
  if (parent) parent.add(m);
  return m;
}

// Text or drawings on a canvas, as a texture.
export function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}
