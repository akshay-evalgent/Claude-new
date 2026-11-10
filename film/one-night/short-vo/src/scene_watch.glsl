// THE WATCH. Centimetres. Open pocket watch lying in a gloved palm, dial up (+y), 12 o'clock toward +z.
const float WR = 2.2;
const float DIAL_Y = 0.80;
const vec3 LM = vec3(-0.55, 0.75, -0.35);    // moon, from front left
const vec3 LL = vec3(0.55, 0.5, 0.65);       // lantern, warm, behind right

float handShape(vec3 p, float ang, float len, float w, float tail, float y, float h, float spade){
  vec2 dir = vec2(sin(ang), cos(ang));
  float along = dot(p.xz, dir), perp = dot(p.xz, vec2(dir.y, -dir.x));
  float t = clamp(along/len, 0.0, 1.0);
  float width = mix(w, w*0.2, t*t);
  float d = max(abs(perp) - width, max(-along - tail, along - len));
  // a Breguet-style open moon near the tip
  if(spade > 0.0){
    vec2 c = dir*len*0.72;
    float ring = abs(length(p.xz - c) - w*2.2) - w*0.55;
    d = min(d, ring);
  }
  d = min(d, length(p.xz) - w*1.8);
  return max(d, abs(p.y - y) - h);
}

float finger(vec3 p, float z, float s){
  vec3 a = vec3(-4.6, -0.75, z + 0.3), b = vec3(-4.05, 0.55, z + 0.1), c = vec3(-3.2, 1.25, z), d = vec3(-2.45, 1.1, z - 0.1);
  float f = sdCapT(p, a, b, 0.66*s, 0.62*s);
  f = smin(f, sdCapT(p, b, c, 0.6*s, 0.56*s), 0.12);
  f = smin(f, sdCapT(p, c, d, 0.55*s, 0.47*s), 0.1);
  f = smin(f, length(p - b) - 0.66*s, 0.15);      // knuckles
  f = smin(f, length(p - c) - 0.6*s, 0.12);
  return f;
}

vec2 mapW(vec3 p){
  float palm = sdRBox(p - vec3(-0.7, -1.15, -1.3), vec3(3.9, 0.95, 4.6), 0.95);
  float fing = 1e9;
  for(int i=0;i<4;i++){ float fi = float(i); fing = min(fing, finger(p, 1.75 - fi*1.22, 1.0 - fi*0.07)); }
  float thumb = sdCapT(p, vec3(4.0, -0.8, -3.9), vec3(3.0, 0.35, -2.2), 0.85, 0.7);
  thumb = smin(thumb, sdCapT(p, vec3(3.0, 0.35, -2.2), vec3(2.55, 0.75, -1.45), 0.7, 0.6), 0.15);
  float glove = smin(palm, smin(fing, thumb, 0.4), 0.8);
  // wrist running toward the camera, into a fur cuff and red sleeve
  glove = smin(glove, sdCapT(p, vec3(-0.6, -1.3, -4.5), vec3(-0.8, -1.6, -8.0), 2.9, 3.0), 1.0);
  glove += 0.02*vnoise3(p*7.0) + 0.012*vnoise3(p*19.0);
  vec2 res = vec2(glove, 1.0);
  vec3 cq = p - vec3(-0.85, -1.65, -8.4);
  float cuff = length(vec2(length(cq.xy) - 3.0, cq.z)) - 1.0;
  cuff += 0.18*fbm3(p*2.5) - 0.06;
  res = un(res, vec2(cuff*0.8, 7.0));
  float sleeve = sdCapT(p, vec3(-0.9, -1.7, -9.0), vec3(-1.2, -2.6, -20.0), 3.4, 3.8);
  res = un(res, vec2(sleeve, 8.0));
  // case with engraved band, bezel, pendant, crown, bow
  float cs = sdCyl(p - vec3(0.0, 0.40, 0.0), 0.38, WR - 0.08) - 0.08;
  float ang = atan(p.z, p.x);
  if(abs(p.y - 0.4) < 0.36) cs -= 0.012*smoothstep(0.2, 0.8, abs(sin(ang*48.0 + sin(ang*6.0)*2.0)));
  float bez = sdTorus(p - vec3(0.0, DIAL_Y + 0.02, 0.0), vec2(WR - 0.1, 0.13));
  cs = min(cs, bez);
  float pend = sdCyl((p - vec3(0.0, 0.42, WR + 0.12)).xzy, 0.22, 0.17);
  vec3 pk = p - vec3(0.0, 0.42, WR + 0.5);
  float crown = sdCyl(pk.xzy, 0.2, 0.30 + 0.025*sin(atan(pk.x, pk.y)*18.0)) - 0.02;
  float bow = sdTorus(p - vec3(0.0, 0.42, WR + 1.25), vec2(0.62, 0.085));
  res = un(res, vec2(min(cs, min(pend, min(crown, bow))), 2.0));
  float ch = 1e9;
  for(int i=0;i<8;i++){
    float fi = float(i);
    vec3 c = vec3(0.15*sin(fi*0.9), 0.35 - 0.03*fi - 0.02*fi*fi*0.1, WR + 2.1 + fi*0.62);
    vec3 q = p - c;
    float l = (mod(fi, 2.0) < 0.5) ? sdLink(vec3(q.y, q.z, q.x), 0.12, 0.2, 0.055) : sdLink(vec3(q.x, q.z, q.y), 0.12, 0.2, 0.055);
    ch = min(ch, l);
  }
  res = un(res, vec2(ch, 5.0));
  float hh = handShape(p, uWatchH, 1.05, 0.10, 0.2, DIAL_Y + 0.03, 0.018, 1.0);
  float mh = handShape(p, uWatchM, 1.62, 0.07, 0.25, DIAL_Y + 0.07, 0.016, 1.0);
  float sh = handShape(p, uWatchS, 1.8, 0.022, 0.5, DIAL_Y + 0.11, 0.014, 0.0);
  res = un(res, vec2(min(hh, mh), 4.0));
  res = un(res, vec2(sh, 6.0));
  return res;
}
vec3 calcN(vec3 p){
  vec2 e = vec2(0.002, 0.0);
  return normalize(vec3(mapW(p+e.xyy).x - mapW(p-e.xyy).x, mapW(p+e.yxy).x - mapW(p-e.yxy).x, mapW(p+e.yyx).x - mapW(p-e.yyx).x));
}
float shadowW(vec3 ro, vec3 rd){
  float res = 1.0, t = 0.02;
  for(int i=0;i<32;i++){
    float h = mapW(ro + rd*t).x;
    res = min(res, 9.0*h/t);
    t += clamp(h, 0.02, 0.6);
    if(res < 0.01 || t > 12.0) break;
  }
  return clamp(res, 0.0, 1.0);
}
float aoW(vec3 p, vec3 n){
  float occ = 0.0, s = 1.0;
  for(int i=0;i<5;i++){ float h = 0.05 + 0.25*float(i); occ += (h - mapW(p + n*h).x)*s; s *= 0.7; }
  return clamp(1.0 - 0.9*occ, 0.0, 1.0);
}
vec3 envW(vec3 rd){
  vec3 c = mix(vec3(0.004, 0.006, 0.012), vec3(0.03, 0.045, 0.08), clamp(rd.y*0.5 + 0.5, 0.0, 1.0));
  c += vec3(1.0, 0.62, 0.32)*pow(max(dot(rd, normalize(LL)), 0.0), 40.0)*14.0;
  c += vec3(0.6, 0.72, 1.0)*pow(max(dot(rd, normalize(LM)), 0.0), 60.0)*6.0;
  c += vec3(0.3, 0.9, 0.6)*pow(max(dot(rd, normalize(vec3(-0.2, 0.9, 0.5))), 0.0), 4.0)*0.25;
  return c;
}
// the snow far below the hand: moonlit, a warm lantern pool, sparkling glints that become bokeh
vec4 ground(vec3 ro, vec3 rd){
  if(rd.y > -0.02) return vec4(envW(rd)*0.3, 3000.0);
  float t = (-90.0 - ro.y)/rd.y;
  vec3 p = ro + rd*t;
  vec3 c = vec3(0.025, 0.035, 0.06);
  c += vec3(1.0, 0.55, 0.25)*0.18*exp(-length(p.xz - vec2(60.0, 80.0))/70.0);
  vec2 g = p.xz*0.35; vec2 ci = floor(g);
  float h = hash(ci);
  if(h > 0.93){
    vec2 pos = ci + vec2(hash(ci + 1.3), hash(ci + 7.1));
    float d = length(g - pos);
    float tw = 0.5 + 0.5*sin(uT*2.0 + h*40.0);
    c += mix(vec3(1.0, 0.7, 0.4), vec3(0.7, 0.85, 1.0), hash(ci + 3.3))*smoothstep(0.12, 0.0, d)*30.0*tw;
  }
  return vec4(c, t);
}
vec3 dialColor(vec3 p){ return texture(uTex0, vec2(0.5 + p.x/(2.0*(WR-0.12)), 0.5 - p.z/(2.0*(WR-0.12)))).rgb; }

vec3 shadeW(vec3 p, vec3 n, vec3 rd, float m){
  vec3 Lm = normalize(LM), Ll = normalize(LL);
  vec3 cm = vec3(0.55, 0.65, 0.95)*1.3, cl = vec3(1.0, 0.6, 0.3)*2.0;
  float sm = shadowW(p + n*0.01, Lm), sl = shadowW(p + n*0.01, Ll);
  float ao = aoW(p, n);
  float dm = max(dot(n, Lm), 0.0)*sm, dl = max(dot(n, Ll), 0.0)*sl;
  vec3 refl = reflect(rd, n);
  float fres = pow(1.0 - max(dot(-rd, n), 0.0), 5.0);
  vec3 amb = vec3(0.02, 0.03, 0.05)*ao;
  vec3 col;
  if(m < 1.5){                                   // black leather: creases, seams, sheen
    float crease = fbm3(p*vec3(2.0, 6.0, 2.0));
    vec3 alb = vec3(0.016, 0.014, 0.013)*(0.8 + 0.5*crease);
    float seam = smoothstep(0.03, 0.0, abs(fract(p.z/1.22 + 0.42) - 0.5) - 0.47)*step(p.x, -2.4);
    alb *= 1.0 - 0.6*seam;
    col = alb*(cm*dm + cl*dl + amb*4.0);
    float rough = mix(18.0, 50.0, crease);
    col += (cm*pow(max(dot(refl, Lm), 0.0), rough)*sm*0.3 + cl*pow(max(dot(refl, Ll), 0.0), rough)*sl*0.5)*(0.6 + 0.6*crease);
    col += envW(refl)*0.03*(0.2 + fres)*ao;
  } else if(m < 2.5 || (m > 4.5 && m < 5.5)){     // gold
    vec3 gold = vec3(1.0, 0.74, 0.38);
    col = gold*(envW(refl)*0.7*ao + cm*pow(max(dot(refl, Lm), 0.0), 60.0)*sm*2.0 + cl*pow(max(dot(refl, Ll), 0.0), 50.0)*sl*3.0);
    col += gold*(cm*dm + cl*dl)*0.08;
    if(m < 2.5 && length(p.xz) < WR - 0.2 && p.y > DIAL_Y - 0.03){
      vec3 dc = dialColor(p);
      float sd = shadowW(p + vec3(0.0, 0.01, 0.0), Lm)*0.85 + 0.15;
      col = dc*(cm*0.38*sd + cl*dl*0.25 + 0.05*ao);
      col += vec3(0.6, 0.65, 0.8)*pow(max(dot(refl, Lm), 0.0), 8.0)*0.03;
    }
  } else if(m < 4.5){                           // blued steel
    col = vec3(0.02, 0.03, 0.07)*(cm*dm + cl*dl + 0.1) + vec3(0.25, 0.4, 0.9)*pow(max(dot(refl, Lm), 0.0), 25.0)*sm*0.6 + envW(refl)*0.05;
  } else if(m < 6.5){                           // seconds hand, red lacquer
    col = vec3(0.6, 0.05, 0.035)*(cm*dm + cl*dl + 0.15) + cl*pow(max(dot(refl, Ll), 0.0), 40.0)*0.4;
  } else if(m < 7.5){                           // fur cuff
    vec3 alb = vec3(0.8, 0.78, 0.74)*(0.6 + 0.5*vnoise3(p*14.0));
    col = alb*(cm*(0.5 + 0.5*dot(n, Lm))*sm*0.6 + cl*(0.5 + 0.5*dot(n, Ll))*sl*0.4 + amb*3.0);
  } else {                                      // red velvet sleeve
    vec3 alb = vec3(0.3, 0.02, 0.025);
    col = alb*(cm*dm + cl*dl + amb*3.0) + vec3(0.6, 0.12, 0.1)*pow(1.0 - max(dot(-rd, n), 0.0), 2.5)*0.15;
  }
  return col;
}
vec4 crystal(vec3 ro, vec3 rd){
  const float RS = 5.2;
  vec3 c = vec3(0.0, DIAL_Y + 0.45 - RS, 0.0);
  vec3 oc = ro - c; float b = dot(oc, rd), cc = dot(oc, oc) - RS*RS, h = b*b - cc;
  if(h < 0.0) return vec4(-1.0);
  float t = -b - sqrt(h); vec3 p = ro + rd*t;
  if(p.y < DIAL_Y + 0.02 || length(p.xz) > WR - 0.12) return vec4(-1.0);
  return vec4(p, t);
}
vec4 render(vec3 ro, vec3 rd, vec2 uv){
  float t = 0.0, m = -1.0;
  for(int i=0;i<140;i++){
    vec2 h = mapW(ro + rd*t);
    if(h.x < 0.0005*t){ m = h.y; break; }
    t += h.x*0.9;
    if(t > 60.0) break;
  }
  vec3 col; float depth;
  if(m > 0.0){ vec3 p = ro + rd*t; col = shadeW(p, calcN(p), rd, m); depth = t; }
  else { vec4 g = ground(ro, rd); col = g.rgb; depth = g.w; }
  vec4 cr = crystal(ro, rd);
  if(cr.w > 0.0 && (m < 0.0 || cr.w < t)){
    vec3 p = cr.xyz;
    vec3 n = normalize(p - vec3(0.0, DIAL_Y + 0.45 - 5.2, 0.0));
    float fres = 0.04 + 0.96*pow(1.0 - max(dot(-rd, n), 0.0), 5.0);
    col = mix(col, envW(reflect(rd, n)), clamp(fres*1.3, 0.0, 1.0));
    // frost: dendrites feathering in from the rim
    float r = length(p.xz)/(WR - 0.12);
    float a = atan(p.z, p.x);
    float br = abs(sin(a*17.0 + 4.0*fbm(p.xz*1.1)));
    float fern = abs(sin((r*28.0) + a*3.0 + 3.0*fbm(p.xz*2.0)));
    float grow = r + 0.3*fbm(p.xz*3.0) - 0.2*br*r - 0.06*fern;
    float frost = smoothstep(1.0 - 0.75*uFrost, 1.1 - 0.6*uFrost, grow)*uFrost;
    frost = clamp(frost, 0.0, 0.9);
    vec3 fc = vec3(0.5, 0.58, 0.7)*0.16 + vec3(1.0, 0.65, 0.35)*0.05*(1.0 + br);
    col = mix(col, fc, frost);
  }
  return vec4(col, depth);
}
