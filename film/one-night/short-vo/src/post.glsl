// ---- shared by the three post passes; PASS is defined by the page before compiling
precision highp float;
in vec2 vUV;
out vec4 fragColor;
uniform sampler2D uAcc, uDof, uBloom;
uniform vec2 uRes, uSrcRes;
uniform float uFocus, uAperture, uMaxCoc, uExpo, uWarmth, uT, uGrain, uBloomAmt, uHalation, uContrast, uSat, uFade;
uniform float uSnow, uSnowSpeed, uSnowStreak; uniform vec3 uSnowTint;
float hash(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
float coc(float d){ return clamp(uAperture*abs(1.0 - uFocus/max(d, 1e-3)), 0.0, uMaxCoc); }   // in full-res pixels

#if PASS == 1
// depth of field at half resolution: scatter-as-gather over a golden-angle spiral
void main(){
  vec2 px = 1.0/uSrcRes;
  vec4 c = texture(uAcc, vUV);
  float cs = coc(c.a);
  vec3 col = c.rgb; float tot = 1.0;
  float radius = 1.0;
  const float GA = 2.39996323;
  float ang = 0.0;
  for(int i=0;i<220;i++){
    if(radius >= uMaxCoc) break;
    vec2 tc = vUV + vec2(cos(ang), sin(ang))*px*radius;
    // read a pre-softened level so tiny highlights spread into round bokeh instead of rosettes
    vec4 s = textureLod(uAcc, tc, clamp(log2(max(cs, 1.0)) - 1.0, 0.0, 3.5));
    float ss = coc(s.a);
    if(s.a > c.a) ss = clamp(ss, 0.0, cs*2.0);
    float m = smoothstep(radius - 1.0, radius + 1.0, ss);
    col += mix(col/tot, s.rgb, m);
    tot += 1.0; radius += 1.5/radius; ang += GA;
  }
  fragColor = vec4(col/tot, cs);
}
#elif PASS == 2
// bright pass for bloom, mipmapped by the page
void main(){
  vec3 c = texture(uDof, vUV).rgb;
  float l = max(c.r, max(c.g, c.b));
  fragColor = vec4(c*smoothstep(0.7, 2.5, l), 1.0);
}
#else
// composite: focus blend, bloom, halation, tone, grade, lens, grain
// falling snow, drawn after the lens so flakes stay soft round discs; each streaks over the shutter
float snowPost(vec2 uv){
  float acc = 0.0;
  for(int L=0; L<3; L++){
    float fl = float(L);
    float sc = 5.0 + fl*6.0;
    vec2 g = uv*vec2(sc*uRes.x/uRes.y, sc);
    float sp = uSnowSpeed*(0.6 + 0.25*fl)*sc*0.12;
    g.y += uT*sp;
    g.x += sin(uT*0.4 + fl + g.y*0.2)*0.35;
    vec2 cell = floor(g), f = fract(g);
    float h = hash(cell + fl*17.0);
    if(h < uSnow){
      vec2 d = f - vec2(0.2 + 0.6*hash(cell + 3.1), 0.5);
      float r = (0.035 + 0.03*hash(cell + 9.7))*(1.6 - 0.4*fl);
      float dg = sp/48.0 + uSnowStreak*r*3.0;
      float dy = max(abs(d.y) - dg*0.5, 0.0);
      float soft = fl < 0.5 ? 0.15 : 0.55;
      acc += smoothstep(r, r*soft, length(vec2(d.x, dy)))*(0.3 + 0.3*fl)*r/(r + dg*0.5);
    }
  }
  return acc;
}
vec3 aces(vec3 x){ return clamp((x*(2.51*x + 0.03))/(x*(2.43*x + 0.59) + 0.14), 0.0, 1.0); }
void main(){
  vec2 uv = vUV;
  // a whisper of gate weave
  uv += vec2(sin(uT*7.3)*0.00025, cos(uT*5.1)*0.0002);
  vec2 cuv = uv - 0.5;
  // chromatic aberration grows toward the edges
  float ca = dot(cuv, cuv)*0.004;
  vec4 sharpG = textureLod(uAcc, uv, 0.0);
  vec3 sharp = vec3(textureLod(uAcc, uv + cuv*ca, 0.0).r, sharpG.g, textureLod(uAcc, uv - cuv*ca, 0.0).b);
  vec4 dof = texture(uDof, uv);
  float cs = coc(sharpG.a);
  vec3 col = mix(sharp, dof.rgb, smoothstep(0.6, 2.2, max(cs, dof.a)));
  vec3 bl = vec3(0.0); float w = 0.0;
  for(int i=1;i<=6;i++){ float fi = float(i); bl += textureLod(uBloom, uv, fi).rgb*fi; w += fi; }
  bl /= w;
  col += bl*uBloomAmt;
  col += bl*vec3(1.0, 0.35, 0.15)*uHalation;                 // halation: red glow around highlights
  if(uSnow > 0.0) col += snowPost(uv)*uSnowTint;
  col *= uExpo;
  col = aces(col);
  col = pow(col, vec3(1.0/2.2));
  float luma = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(vec3(luma), col, uSat);
  col = (col - 0.5)*uContrast + 0.5;
  vec3 shadowTint = mix(vec3(-0.012, 0.004, 0.03), vec3(0.02, 0.008, -0.015), uWarmth);
  vec3 highTint = mix(vec3(-0.01, 0.0, 0.02), vec3(0.03, 0.012, -0.025), uWarmth);
  col += shadowTint*(1.0 - luma)*(1.0 - luma) + highTint*luma*luma;
  col = mix(col, vec3(0.02, 0.02, 0.025), 0.0);
  float v = length(cuv*vec2(0.9, 1.0))*1.25;
  col *= 1.0 - 0.5*pow(v, 2.6);
  float f = floor(uT*24.0);
  float g = hash(gl_FragCoord.xy + vec2(f*17.13, f*3.71)) + hash(gl_FragCoord.xy*1.7 + f) - 1.0;
  col += g*uGrain*(0.6 - 0.45*luma);
  col *= 1.0 - uFade;
  fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
#endif
