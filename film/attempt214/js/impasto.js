// Impasto: a palette-knife paint renderer (WebGL2).
// Strokes are real objects: a slanted plane of paint with a ridge where the blade pressed, a lip where it lifted,
// broken streaks where the paint ran out, a second colour dragged into the first. Every stroke writes colour and
// height; a compose pass rakes light across the height field. Static plates are baked once; moving things are
// rebuilt every frame from fixed seeds, so their paint never boils.
export const KNIFE = 0, DAB = 1, BRUSH = 2, LINE = 3;
export const hex = (h) => { const n = parseInt(h.replace('#', ''), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; };
export const mixc = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
export const hash = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

const F = 20;   // floats per stroke
export class Strokes {
  constructor(cap = 1024) { this.buf = new Float32Array(cap * F); this.n = 0; }
  push(s) {
    if ((this.n + 1) * F > this.buf.length) { const b = new Float32Array(this.buf.length * 2); b.set(this.buf); this.buf = b; }
    const c = s.c || [1, 1, 1], c2 = s.c2 || c, o = this.n * F, seed = s.seed ?? this.n;
    const B = this.buf;
    B[o] = s.x; B[o + 1] = s.y; B[o + 2] = s.ang || 0; B[o + 3] = s.len || 10;
    B[o + 4] = s.wid || 6; B[o + 5] = seed; B[o + 6] = s.group ?? -1; B[o + 7] = s.key ?? hash(seed * 1.37 + 0.11);
    B[o + 8] = c[0]; B[o + 9] = c[1]; B[o + 10] = c[2]; B[o + 11] = s.type || 0;
    B[o + 12] = c2[0]; B[o + 13] = c2[1]; B[o + 14] = c2[2]; B[o + 15] = s.taper ?? 0.25;
    B[o + 16] = s.run ?? 0.5; B[o + 17] = s.alpha ?? 1; B[o + 18] = s.h ?? 1; B[o + 19] = (s.exempt ? 128 : 0) + Math.round(Math.min(1, s.gloss ?? 0.15) * 127);
    this.n++;
    return this;
  }
  data() { return this.buf.subarray(0, this.n * F); }
  clear() { this.n = 0; return this; }
}

const NOISE = `
float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y); }
`;

const STROKE_VS = `#version 300 es
precision highp float;
layout(location=0) in vec2 corner;
layout(location=1) in vec4 a0; // x y ang len
layout(location=2) in vec4 a1; // wid seed group key
layout(location=3) in vec4 a2; // r g b type
layout(location=4) in vec4 a3; // r2 g2 b2 taper
layout(location=5) in vec4 a4; // run alpha h flags
uniform vec2 uCam; uniform float uZoom; uniform vec2 uView; // camera centre (plate px), zoom, view size (design px)
uniform float uAppear; uniform vec2 uAppDir; uniform float uAppSpan;
out vec2 vUV; out vec4 vA1; out vec4 vA2; out vec4 vA3; out vec4 vA4; out vec2 vPlate; out float vSlant; out float vHide;
void main(){
  float s = sin(a0.z), c = cos(a0.z);
  vec2 half_ = vec2(a0.w * 0.5, a1.x * 0.5) * 1.18;
  vec2 l = corner * half_;
  vec2 p = a0.xy + vec2(c * l.x - s * l.y, s * l.x + c * l.y);
  vPlate = p;
  vec2 scr = (p - uCam) * uZoom + uView * 0.5;
  gl_Position = vec4(scr.x / uView.x * 2.0 - 1.0, 1.0 - scr.y / uView.y * 2.0, 0.0, 1.0);
  vUV = corner * 1.18; vA1 = a1; vA2 = a2; vA3 = a3; vA4 = a4;
  vSlant = (fract(sin(a1.y * 91.7) * 4375.5) - 0.5) * 1.1;
  float sweep = dot(a0.xy, uAppDir) / uAppSpan;      // paint-over / title sweep: whole strokes appear in order
  vHide = (uAppear < 9.0 && sweep * 0.8 + a1.w * 0.2 > uAppear) ? 1.0 : 0.0;
}`;

const STROKE_FS = `#version 300 es
precision highp float;
in vec2 vUV; in vec4 vA1; in vec4 vA2; in vec4 vA3; in vec4 vA4; in vec2 vPlate; in float vSlant; in float vHide;
uniform sampler2D uGroup; uniform vec2 uPlateSize; uniform float uUseGroup;
layout(location=0) out vec4 oCol; layout(location=1) out vec4 oAttr;
${NOISE}
void main(){
  if (vHide > 0.5) discard;
  float seed = vA1.y, type = vA2.w, taper = vA3.w, run = vA4.x, alpha = vA4.y, hs = vA4.z;
  if (uUseGroup > 0.5 && vA1.z >= 0.0) {
    float g = texture(uGroup, vPlate / uPlateSize).r * 255.0;
    if (abs(g - vA1.z) > 0.5) discard;
  }
  vec2 uv = vUV;
  float u = uv.x + uv.y * vSlant;            // slanted ends
  float v = uv.y;
  float t = (u + 1.0) * 0.5;                 // 0 at the pressed end, 1 where the knife lifts
  float cov = 1.0, h = 0.55;
  vec3 col;
  float sn = vnoise(vec2(v * 9.0 + seed, u * 1.5)), fine = vnoise(vec2(v * 26.0 - seed * 3.1, u * 3.0));
  if (type < 0.5 || type > 2.5) {            // KNIFE (and LINE: a thin knife)
    float hw = 1.0 - taper * 0.7 * t * t;
    float edge = hw + (vnoise(vec2(u * 3.5 + seed * 1.7, seed)) - 0.5) * 0.2 + (vnoise(vec2(u * 11.0, seed * 3.3)) - 0.5) * 0.06;
    if (abs(v) > edge) discard;
    if (abs(u) > 1.0 + (vnoise(vec2(v * 3.0, seed * 2.3)) - 0.5) * 0.22) discard;
    float ro = smoothstep(0.55, 1.0, t) * run;                         // paint running out: broken streaks
    if (sn * 0.8 + fine * 0.35 < ro * 1.05) discard;
    // the knife leaves a tilted plane: thicker where it pressed, and canted to one side (per stroke)
    float side = (fract(sin(seed * 4.37) * 4375.85) - 0.5) * 2.0;
    float plane = 0.46 + 0.2 * (1.0 - t) + 0.16 * side * v;
    h = plane + 0.36 * exp(-pow((t - 0.07) / 0.09, 2.0))                // ridge where the blade pressed
          + 0.22 * exp(-pow((t - 0.95) / 0.04, 2.0))                   // lip where it lifted
          + 0.12 * smoothstep(0.78, 1.0, abs(v) / edge)                 // a little paint squeezed to the edges
          + (fine - 0.5) * 0.22 + (sn - 0.5) * 0.16 - ro * 0.3;
    float drag = smoothstep(0.05, 1.0, t) * (0.45 + 0.55 * sn);
    col = mix(vA2.rgb, vA3.rgb, drag);
  } else if (type < 1.5) {                   // DAB: a short blob with a raised rim
    float r = length(vec2(uv.x * 1.0, uv.y * 1.15)) + (vnoise(uv * 3.0 + seed) - 0.5) * 0.22;
    if (r > 1.0) discard;
    h = 0.5 + 0.3 * smoothstep(0.55, 0.95, r) + (fine - 0.5) * 0.18 + 0.2 * (1.0 - r);
    col = mix(vA2.rgb, vA3.rgb, smoothstep(0.2, 1.0, r) * 0.6 * sn);
  } else {                                   // BRUSH: softer, bristle streaks
    float edge = 1.0 - 0.3 * t + (vnoise(vec2(u * 5.0, seed)) - 0.5) * 0.2;
    if (abs(v) > edge || abs(u) > 1.0) discard;
    float br = vnoise(vec2(v * 30.0 + seed, u * 0.6));
    if (br < smoothstep(0.4, 1.0, t) * run) discard;
    h = 0.42 + br * 0.3 + (fine - 0.5) * 0.1;
    col = mix(vA2.rgb, vA3.rgb, t * br * 0.7);
  }
  float jit = (fract(sin(seed * 12.9898) * 43758.5) - 0.5) * 0.16;     // value jitter per stroke
  vec3 hj = vec3(fract(sin(seed * 3.1) * 999.0), fract(sin(seed * 5.7) * 999.0), fract(sin(seed * 7.9) * 999.0)) - 0.5;
  col = col * (1.0 + jit + (fine - 0.5) * 0.07) + hj * 0.035;
  h = clamp(h * hs * 0.85 + 0.08, 0.0, 1.0);
  if (alpha < 0.999 && h21(gl_FragCoord.xy + seed) > alpha) discard;   // transparency by dithering (keeps the attribute target exact)
  float hi = floor(h * 255.0) / 255.0, lo = fract(h * 255.0);
  oCol = vec4(col, 1.0);
  oAttr = vec4(hi, lo, vA1.w, vA4.w / 255.0);
}`;

const FILL_VS = `#version 300 es
precision highp float;
layout(location=0) in vec2 pos; layout(location=1) in vec4 col; // rgb + flags/255
uniform vec2 uCam; uniform float uZoom; uniform vec2 uView;
out vec4 vCol;
void main(){ vec2 scr = (pos - uCam) * uZoom + uView * 0.5; gl_Position = vec4(scr.x / uView.x * 2.0 - 1.0, 1.0 - scr.y / uView.y * 2.0, 0.0, 1.0); vCol = col; }`;
const FILL_FS = `#version 300 es
precision highp float;
in vec4 vCol; uniform float uH; uniform float uKey;
layout(location=0) out vec4 oCol; layout(location=1) out vec4 oAttr;
void main(){ oCol = vec4(vCol.rgb, 1.0); oAttr = vec4(uH, 0.0, uKey, vCol.a); }`;

const QUAD_VS = `#version 300 es
layout(location=0) in vec2 corner; out vec2 vUV;
void main(){ vUV = corner * 0.5 + 0.5; gl_Position = vec4(corner, 0.0, 1.0); }`;
const BLIT_FS = `#version 300 es
precision highp float;
in vec2 vUV; uniform sampler2D uTex; uniform float uH; uniform float uFlags;
layout(location=0) out vec4 oCol; layout(location=1) out vec4 oAttr;
void main(){ oCol = vec4(texture(uTex, vec2(vUV.x, 1.0 - vUV.y)).rgb, 1.0); oAttr = vec4(uH, 0.0, 0.0, uFlags); }`;

const COMPOSE_FS = `#version 300 es
precision highp float;
in vec2 vUV;
uniform sampler2D uAC, uAA, uBC, uBA, uLC, uLA;     // plate A, plate B, moving layer
uniform vec2 uView, uPlateA, uPlateB; uniform vec2 uCam; uniform float uZoom;
uniform vec2 uCamB; uniform float uZoomB;
uniform float uMix; uniform vec2 uMixDir; uniform float uMixSpan; uniform float uMixOff; // B laid over A, stroke by stroke
uniform vec3 uLight; uniform float uRake, uAmb, uSpec, uRelief; uniform vec3 uLightCol, uShadeCol;
uniform float uGrey; uniform vec2 uRevC; uniform float uRevR;                                // grey world, colour re-laid
uniform float uLayerOn; uniform vec2 uTexel;
uniform float uExpo, uSat, uVig; uniform vec3 uLift; uniform float uDebug; uniform float uContrast, uSplit;
out vec4 frag;
vec2 plateUV(vec2 s, vec2 cam, float z, vec2 size){ return ((s - uView * 0.5) / z + cam) / size; }
struct Px { vec3 c; float h; float key; float flags; vec2 pp; };
Px sampleAt(vec2 uv){
  vec2 s = uv * uView;
  Px r;
  vec2 ua = plateUV(s, uCam, uZoom, uPlateA);
  vec2 ta = vec2(ua.x, 1.0 - ua.y);
  vec4 ac = texture(uAC, ta), aa = texture(uAA, ta);
  r.c = ac.rgb; r.h = aa.r + aa.g / 255.0; r.key = aa.b; r.flags = aa.a; r.pp = ua * uPlateA;
  if (uMix > -0.5) {
    vec2 ub = plateUV(s, uCamB, uZoomB, uPlateB);
    vec2 tb = vec2(ub.x, 1.0 - ub.y);
    vec4 bc = texture(uBC, tb), ba = texture(uBA, tb);
    float sw = (dot(s, uMixDir) - uMixOff) / uMixSpan;
    if (sw * 0.75 + ba.b * 0.25 < uMix) { r.c = bc.rgb; r.h = ba.r + ba.g / 255.0; r.key = ba.b; r.flags = ba.a; r.pp = ub * uPlateB; }
  }
  if (uLayerOn > 0.5) {
    vec4 lc = texture(uLC, vec2(uv.x, 1.0 - uv.y)), la = texture(uLA, vec2(uv.x, 1.0 - uv.y));
    if (lc.a > 0.01) { r.c = mix(r.c, lc.rgb, lc.a); r.h = mix(r.h, la.r + la.g / 255.0, lc.a); if (lc.a > 0.5) { r.key = la.b; r.flags = la.a; } }
  }
  return r;
}
float heightAt(vec2 uv){   // height only: the same selection as sampleAt, without the colour fetches
  vec2 s = uv * uView;
  vec2 ua = plateUV(s, uCam, uZoom, uPlateA);
  vec4 aa = texture(uAA, vec2(ua.x, 1.0 - ua.y));
  float h = aa.r + aa.g / 255.0;
  if (uMix > -0.5) {
    vec2 ub = plateUV(s, uCamB, uZoomB, uPlateB);
    vec4 ba = texture(uBA, vec2(ub.x, 1.0 - ub.y));
    float sw = (dot(s, uMixDir) - uMixOff) / uMixSpan;
    if (sw * 0.75 + ba.b * 0.25 < uMix) h = ba.r + ba.g / 255.0;
  }
  if (uLayerOn > 0.5) {
    vec2 lt = vec2(uv.x, 1.0 - uv.y);
    float la_ = texture(uLC, lt).a;
    if (la_ > 0.01) { vec4 la = texture(uLA, lt); h = mix(h, la.r + la.g / 255.0, la_); }
  }
  return h;
}
void main(){
  vec2 uv = vec2(vUV.x, 1.0 - vUV.y);
  Px p = sampleAt(uv);
  vec2 o = uTexel * 1.5;
  float hx = heightAt(uv + vec2(o.x, 0.0)) - heightAt(uv - vec2(o.x, 0.0));
  float hy = heightAt(uv + vec2(0.0, o.y)) - heightAt(uv - vec2(0.0, o.y));
  vec3 N = normalize(vec3(-hx * uRelief, hy * uRelief, 1.0));
  vec3 L = normalize(uLight);
  float ndl = max(dot(N, L), 0.0);
  float flat_ = max(dot(vec3(0, 0, 1), L), 0.15);
  float lit = clamp(mix(1.0, ndl / flat_, uRake), 0.0, 2.2);   // flat paint = 1; planes facing the light brighten, others fall into shade
  float gloss = mod(floor(p.flags * 255.0 + 0.5), 128.0) / 127.0;
  float exempt = floor(p.flags * 255.0 + 0.5) >= 128.0 ? 1.0 : 0.0;
  vec3 H = normalize(L + vec3(0, 0, 1));
  float spec = pow(max(dot(N, H), 0.0), 36.0) * uSpec * (0.25 + gloss * 1.6);
  vec3 c = p.c;
  // grey world: the luminance of the same strokes, slightly cool, with a small colour residue; re-laid stroke by stroke
  float lum = dot(c, vec3(0.299, 0.587, 0.114));
  vec3 grey = mix(vec3(lum) * vec3(0.95, 0.98, 1.05), c, 0.12);
  float revealed = (uRevR > 0.0 && length(p.pp - uRevC) / uRevR + p.key * 0.22 < 1.0) ? 1.0 : 0.0;
  float g = uGrey * (1.0 - exempt) * (1.0 - revealed);
  c = mix(c, grey, g);
  vec3 light = mix(uShadeCol, uLightCol, clamp(lit * 0.55, 0.0, 1.0));
  vec3 outc = c * (uAmb + lit * (1.0 - uAmb)) * light + spec * uLightCol;
  outc = outc * uExpo + uLift;
  vec3 sc_ = smoothstep(0.0, 1.0, outc); outc = mix(outc, sc_, uContrast);
  float lv = dot(outc, vec3(0.299, 0.587, 0.114));
  outc += (vec3(0.012, 0.004, -0.014) * smoothstep(0.45, 0.9, lv) + vec3(-0.01, 0.0, 0.016) * (1.0 - smoothstep(0.1, 0.45, lv))) * uSplit;
  float l2 = dot(outc, vec3(0.299, 0.587, 0.114));
  outc = mix(vec3(l2), outc, uSat);
  vec2 q = vUV - 0.5; outc *= 1.0 - uVig * dot(q, q) * 1.6;
  frag = vec4(clamp(outc, 0.0, 1.0), 1.0);
  if (uDebug > 0.5 && uDebug < 1.5) frag = vec4(vec3(p.h), 1.0);
  if (uDebug > 1.5 && uDebug < 2.5) frag = vec4(N * 0.5 + 0.5, 1.0);
  if (uDebug > 2.5) frag = vec4(vec3(lit * 0.5), 1.0);
}`;

const DOWN_FS = `#version 300 es
precision highp float;
in vec2 vUV; uniform sampler2D uTex; uniform vec2 uTexel; out vec4 frag;
void main(){ vec2 o = uTexel * 0.5;
  frag = 0.25 * (texture(uTex, vUV + vec2(-o.x, -o.y)) + texture(uTex, vUV + vec2(o.x, -o.y)) + texture(uTex, vUV + vec2(-o.x, o.y)) + texture(uTex, vUV + vec2(o.x, o.y))); }`;

function compile(gl, vs, fs) {
  const mk = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) + '\n' + src.split('\n').map((l, i) => i + 1 + ': ' + l).join('\n')); return s; };
  const p = gl.createProgram(); gl.attachShader(p, mk(gl.VERTEX_SHADER, vs)); gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  const U = {}; const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < n; i++) { const info = gl.getActiveUniform(p, i); U[info.name] = gl.getUniformLocation(p, info.name); }
  return { p, U };
}

export class Impasto {
  constructor(canvas, o = {}) {
    this.W = o.W || canvas.width; this.H = o.H || canvas.height; this.ss = o.ss || 2;
    this.DW = o.DW || this.W; this.DH = o.DH || this.H;   // design space: cameras and plates are in these units, whatever the pixel size
    canvas.width = this.W; canvas.height = this.H;
    const gl = this.gl = canvas.getContext('webgl2', { antialias: false, preserveDrawingBuffer: true, premultipliedAlpha: false });
    if (!gl) throw new Error('WebGL2 unavailable');
    this.max = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    this.pStroke = compile(gl, STROKE_VS, STROKE_FS);
    this.pFill = compile(gl, FILL_VS, FILL_FS);
    this.pBlit = compile(gl, QUAD_VS, BLIT_FS);
    this.pCompose = compile(gl, QUAD_VS, COMPOSE_FS);
    this.pDown = compile(gl, QUAD_VS, DOWN_FS);
    // geometry
    this.quad = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, this.quad); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    this.vaoQuad = gl.createVertexArray(); gl.bindVertexArray(this.vaoQuad); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0); gl.bindVertexArray(null);
    this.inst = gl.createBuffer();
    this.vaoStroke = gl.createVertexArray(); gl.bindVertexArray(this.vaoStroke);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quad); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.inst);
    for (let k = 0; k < 5; k++) { gl.enableVertexAttribArray(1 + k); gl.vertexAttribPointer(1 + k, 4, gl.FLOAT, false, F * 4, k * 16); gl.vertexAttribDivisor(1 + k, 1); }
    gl.bindVertexArray(null);
    this.fillBuf = gl.createBuffer();
    this.vaoFill = gl.createVertexArray(); gl.bindVertexArray(this.vaoFill); gl.bindBuffer(gl.ARRAY_BUFFER, this.fillBuf);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 24, 0); gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 24, 8);
    gl.bindVertexArray(null);
    // targets
    this.layer = this.target(this.W * this.ss, this.H * this.ss);
    this.comp = this.target(this.W * this.ss, this.H * this.ss, true);
    this.blank = this.target(4, 4);
    this.nullGroup = this.tex(1, 1, new Uint8Array([0, 0, 0, 255]), true);
  }
  tex(w, h, data, nearest = false) {
    const gl = this.gl, t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, data || null);
    const f = nearest ? gl.NEAREST : gl.LINEAR;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, f); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, f);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  }
  texFromCanvas(cv, nearest = false) {
    const gl = this.gl, t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, cv);
    const f = nearest ? gl.NEAREST : gl.LINEAR;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, f); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, f);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  }
  target(w, h, single = false) {
    const gl = this.gl, fb = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    const c = this.tex(w, h), a = single ? null : this.tex(w, h);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, c, 0);
    if (a) { gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, a, 0); gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]); }
    const st = gl.checkFramebufferStatus(gl.FRAMEBUFFER); if (st !== gl.FRAMEBUFFER_COMPLETE) throw new Error('fbo ' + st);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return { fb, c, a, w, h };
  }
  // a plate: a painted world in plate pixels (pw x ph), baked at ss
  plate(pw, ph) {
    const ss = Math.min(this.ss, this.max / Math.max(pw, ph));
    const t = this.target(Math.round(pw * ss), Math.round(ph * ss));
    t.pw = pw; t.ph = ph; return t;
  }
  clear(t, rgba = [0, 0, 0, 0]) { const gl = this.gl; gl.bindFramebuffer(gl.FRAMEBUFFER, t.fb); gl.viewport(0, 0, t.w, t.h); gl.clearBufferfv(gl.COLOR, 0, rgba); if (t.a) gl.clearBufferfv(gl.COLOR, 1, [0, 0, 0, 0]); }
  // underpainting: an image (canvas) laid flat into a plate
  under(t, canvas, flags = 19) {
    const gl = this.gl; const tx = this.texFromCanvas(canvas);
    gl.bindFramebuffer(gl.FRAMEBUFFER, t.fb); gl.viewport(0, 0, t.w, t.h); gl.disable(gl.BLEND);
    gl.useProgram(this.pBlit.p); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tx); gl.uniform1i(this.pBlit.U.uTex, 0);
    gl.uniform1f(this.pBlit.U.uH, 0.12); gl.uniform1f(this.pBlit.U.uFlags, flags / 255);
    gl.bindVertexArray(this.vaoQuad); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); gl.bindVertexArray(null);
    gl.deleteTexture(tx);
  }
  setCam(prog, t, cam) {
    const gl = this.gl;
    if (t === this.layer) { gl.uniform2f(prog.U.uCam, cam.x, cam.y); gl.uniform1f(prog.U.uZoom, cam.z); gl.uniform2f(prog.U.uView, this.DW, this.DH); }
    else { gl.uniform2f(prog.U.uCam, t.pw / 2, t.ph / 2); gl.uniform1f(prog.U.uZoom, 1); gl.uniform2f(prog.U.uView, t.pw, t.ph); }
  }
  // draw strokes into a plate (baked) or into the moving layer (cam)
  draw(t, data, o = {}) {
    const gl = this.gl, P = this.pStroke, n = data.length / F; if (!n) return;
    gl.bindFramebuffer(gl.FRAMEBUFFER, t.fb); gl.viewport(0, 0, t.w, t.h);
    gl.disable(gl.BLEND);
    gl.useProgram(P.p); this.setCam(P, t, o.cam || { x: 0, y: 0, z: 1 });
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, o.group || this.nullGroup); gl.uniform1i(P.U.uGroup, 0);
    gl.uniform1f(P.U.uUseGroup, o.group ? 1 : 0); gl.uniform2f(P.U.uPlateSize, t.pw || this.DW, t.ph || this.DH);
    const ap = o.appear ?? 99; gl.uniform1f(P.U.uAppear, ap);
    const d = o.appDir || [1, 0]; gl.uniform2f(P.U.uAppDir, d[0], d[1]); gl.uniform1f(P.U.uAppSpan, o.appSpan || (t.pw || this.DW));
    gl.bindBuffer(gl.ARRAY_BUFFER, this.inst); gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);
    gl.bindVertexArray(this.vaoStroke); gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, n); gl.bindVertexArray(null);
    gl.disable(gl.BLEND);
  }
  // flat polygons (triangles: [x,y, r,g,b,flags, ...]) as underpaint for moving figures
  fill(t, tris, o = {}) {
    const gl = this.gl, P = this.pFill; if (!tris.length) return;
    gl.bindFramebuffer(gl.FRAMEBUFFER, t.fb); gl.viewport(0, 0, t.w, t.h); gl.disable(gl.BLEND);
    gl.useProgram(P.p); this.setCam(P, t, o.cam || { x: 0, y: 0, z: 1 }); gl.uniform1f(P.U.uH, o.h ?? 0.35); gl.uniform1f(P.U.uKey, o.key ?? 0.5);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.fillBuf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(tris), gl.DYNAMIC_DRAW);
    gl.bindVertexArray(this.vaoFill); gl.drawArrays(gl.TRIANGLES, 0, tris.length / 6); gl.bindVertexArray(null);
  }
  // compose: plate A (+ plate B laid over it) + moving layer, raked light, grade
  compose(o) {
    const gl = this.gl, P = this.pCompose, U = P.U;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.comp.fb); gl.viewport(0, 0, this.comp.w, this.comp.h); gl.disable(gl.BLEND);
    gl.useProgram(P.p);
    const bind = (unit, name, tex) => { gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, tex); gl.uniform1i(U[name], unit); };
    const A = o.A, B = o.B || o.A;
    bind(0, 'uAC', A.c); bind(1, 'uAA', A.a); bind(2, 'uBC', B.c); bind(3, 'uBA', B.a); bind(4, 'uLC', this.layer.c); bind(5, 'uLA', this.layer.a);
    gl.uniform2f(U.uView, this.DW, this.DH); gl.uniform2f(U.uPlateA, A.pw, A.ph); gl.uniform2f(U.uPlateB, B.pw, B.ph);
    const cam = o.cam, camB = o.camB || o.cam;
    gl.uniform2f(U.uCam, cam.x, cam.y); gl.uniform1f(U.uZoom, cam.z); gl.uniform2f(U.uCamB, camB.x, camB.y); gl.uniform1f(U.uZoomB, camB.z);
    gl.uniform1f(U.uMix, o.B ? (o.mix ?? 0) : -1); const md = o.mixDir || [1, 0]; gl.uniform2f(U.uMixDir, md[0], md[1]); gl.uniform1f(U.uMixSpan, o.mixSpan || this.DW); gl.uniform1f(U.uMixOff, o.mixOff || 0);
    const L = o.light || [-0.72, 0.5, 0.48]; gl.uniform3f(U.uLight, L[0], L[1], L[2]);   // y up: raking light from the upper left
    gl.uniform1f(U.uRake, o.rake ?? 0.7); gl.uniform1f(U.uAmb, o.amb ?? 0.5); gl.uniform1f(U.uSpec, o.spec ?? 0.16); gl.uniform1f(U.uRelief, o.relief ?? 3.0);
    const lc = o.lightCol || [1.04, 1.0, 0.94], sc = o.shadeCol || [0.86, 0.9, 1.02];
    gl.uniform3f(U.uLightCol, lc[0], lc[1], lc[2]); gl.uniform3f(U.uShadeCol, sc[0], sc[1], sc[2]);
    gl.uniform1f(U.uGrey, o.grey ?? 0); const rc = o.revC || [0, 0]; gl.uniform2f(U.uRevC, rc[0], rc[1]); gl.uniform1f(U.uRevR, o.revR ?? 0);
    gl.uniform1f(U.uLayerOn, o.layer === false ? 0 : 1); gl.uniform2f(U.uTexel, 1 / this.comp.w, 1 / this.comp.h);
    gl.uniform1f(U.uDebug, o.debug || 0); gl.uniform1f(U.uContrast, o.contrast ?? 0.35); gl.uniform1f(U.uSplit, o.split ?? 1.0); gl.uniform1f(U.uExpo, o.expo ?? 1.0); gl.uniform1f(U.uSat, o.sat ?? 1.0); gl.uniform1f(U.uVig, o.vig ?? 0.18); const lf = o.lift || [0, 0, 0]; gl.uniform3f(U.uLift, lf[0], lf[1], lf[2]);
    gl.bindVertexArray(this.vaoQuad); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    // downsample to the canvas
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, this.W, this.H);
    gl.useProgram(this.pDown.p); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.comp.c); gl.uniform1i(this.pDown.U.uTex, 0);
    gl.uniform2f(this.pDown.U.uTexel, 1 / this.comp.w, 1 / this.comp.h);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); gl.bindVertexArray(null);
  }
  beginLayer() { this.clear(this.layer); }
}
