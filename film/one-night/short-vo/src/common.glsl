precision highp float;
in vec2 vUV;
out vec4 fragColor;
#define texture2D texture
uniform vec2 uRes, uJitter;
uniform float uT, uK;
uniform vec3 uCamPos, uCamTgt;
uniform float uFov, uRoll;
uniform float uYears, uDawn, uWarp, uTimelapse, uSlow, uNight;
uniform float uWatchH, uWatchM, uWatchS, uFrost;
uniform float uPresentY, uHandUp;
uniform vec3 uSleigh; uniform float uPitch, uYaw, uGallop, uSleighOn, uSpray, uLand, uSkySpin, uSkyBlur;
uniform float uDayAz, uDayAmt, uClockRate, uHeadTurn, uStoop;
uniform sampler2D uTex0, uTex1, uTex2, uTex3;

vec3 gRight, gUp, gFwd; float gFocal;
float gGlow;

float hash(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
float hash1(float x){ return fract(sin(x*127.1)*43758.5453); }
float hash3(vec3 p){ p = fract(p*0.3183099 + 0.1); p *= 17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
float vnoise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y); }
float vnoise3(vec3 p){ vec3 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(mix(hash3(i),hash3(i+vec3(1,0,0)),f.x), mix(hash3(i+vec3(0,1,0)),hash3(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(hash3(i+vec3(0,0,1)),hash3(i+vec3(1,0,1)),f.x), mix(hash3(i+vec3(0,1,1)),hash3(i+vec3(1,1,1)),f.x),f.y), f.z); }
float fbm(vec2 p){ float a=0.5, s=0.0; for(int i=0;i<5;i++){ s+=a*vnoise(p); p=p*2.03+vec2(1.7,9.2); a*=0.5; } return s; }
float fbm3s(vec2 p){ float a=0.5, s=0.0; for(int i=0;i<3;i++){ s+=a*vnoise(p); p=p*2.03+vec2(1.7,9.2); a*=0.5; } return s; }
float fbm3(vec3 p){ float a=0.5, s=0.0; for(int i=0;i<4;i++){ s+=a*vnoise3(p); p=p*2.05+1.3; a*=0.5; } return s; }

mat2 rot(float a){ float c=cos(a), s=sin(a); return mat2(c,-s,s,c); }
float sdBox(vec3 p, vec3 b){ vec3 q=abs(p)-b; return length(max(q,0.0))+min(max(q.x,max(q.y,q.z)),0.0); }
float sdRBox(vec3 p, vec3 b, float r){ return sdBox(p, b-r) - r; }
float sdEll(vec3 p, vec3 r){ float k0=length(p/r); float k1=length(p/(r*r)); return k0*(k0-1.0)/max(k1,1e-5); }
float sdCap(vec3 p, vec3 a, vec3 b, float r){ vec3 pa=p-a, ba=b-a; float h=clamp(dot(pa,ba)/dot(ba,ba),0.0,1.0); return length(pa-ba*h)-r; }
float sdCapT(vec3 p, vec3 a, vec3 b, float ra, float rb){ vec3 pa=p-a, ba=b-a; float h=clamp(dot(pa,ba)/dot(ba,ba),0.0,1.0); return length(pa-ba*h)-mix(ra,rb,h); }
float sdTorus(vec3 p, vec2 t){ vec2 q=vec2(length(p.xz)-t.x,p.y); return length(q)-t.y; }
float sdCyl(vec3 p, float h, float r){ vec2 d=abs(vec2(length(p.xz),p.y))-vec2(r,h); return min(max(d.x,d.y),0.0)+length(max(d,0.0)); }
float sdLink(vec3 p, float le, float r1, float r2){ vec3 q = vec3(p.x, max(abs(p.y)-le,0.0), p.z); return length(vec2(length(q.xy)-r1,q.z)) - r2; }
float smin(float a, float b, float k){ float h=clamp(0.5+0.5*(b-a)/k,0.0,1.0); return mix(b,a,h)-k*h*(1.0-h); }
float smax(float a, float b, float k){ return -smin(-a, -b, k); }
vec2 un(vec2 a, vec2 b){ return a.x<b.x ? a : b; }
// a five-point star in the xy plane, extruded along z (after Inigo Quilez's sdStar5)
float sdStar(vec3 p3, float r, float rf, float th){
  const vec2 k1 = vec2(0.809016994375, -0.587785252292);
  const vec2 k2 = vec2(-0.809016994375, -0.587785252292);
  vec2 p = p3.xy;
  p.x = abs(p.x);
  p -= 2.0*max(dot(k1, p), 0.0)*k1;
  p -= 2.0*max(dot(k2, p), 0.0)*k2;
  p.x = abs(p.x);
  p.y -= r;
  vec2 ba = rf*vec2(-k1.y, k1.x) - vec2(0.0, 1.0);
  float h = clamp(dot(p, ba)/dot(ba, ba), 0.0, r);
  float d = length(p - ba*h)*sign(p.y*ba.x - p.x*ba.y);
  vec2 w = vec2(d, abs(p3.z) - th);
  return min(max(w.x, w.y), 0.0) + length(max(w, 0.0)) - 0.006;
}

float snowfall(vec2 uv, float t, float speed, float streak, float density){
  float acc = 0.0;
  for(int L=0; L<3; L++){
    float fl = float(L);
    float sc = 6.0 + fl*7.0;
    vec2 g = uv*vec2(sc*uRes.x/uRes.y, sc);
    g.y += t*speed*(0.6 + 0.25*fl)*sc*0.12;
    g.x += sin(t*0.4 + fl + g.y*0.2)*0.4;
    vec2 cell = floor(g); vec2 f = fract(g);
    float h = hash(cell + fl*17.0);
    if(h < density){
      vec2 c = vec2(0.2 + 0.6*hash(cell+3.1), 0.5);
      vec2 d = f - c; d.y /= (1.0 + streak*(3.0 - fl));
      // motion blur inside the sub-frame: stretch the flake along the distance it falls
      float dg = speed*(0.6 + 0.25*fl)*sc*0.12/(48.0*max(uK, 1.0));
      float dy = max(abs(d.y) - dg*0.5, 0.0);
      float r = (0.04 + 0.03*hash(cell+9.7))*(1.5 - 0.35*fl);
      float soft = fl < 0.5 ? 0.25 : 0.5;
      acc += smoothstep(r, r*soft, length(vec2(d.x, dy)))*(0.35 + 0.3*fl)*r/(r + dg*0.5);
    }
  }
  return acc;
}
