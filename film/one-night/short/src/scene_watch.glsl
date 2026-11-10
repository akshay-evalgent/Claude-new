// THE WATCH. Units are centimetres. The watch lies open on a gloved palm, dial up (+y),
// 12 o'clock toward +z (the top of the vertical frame), its chain running up and away.
const float WR = 2.2;           // case radius
const float DIAL_Y = 0.80;

float handShape(vec3 p, float ang, float len, float w, float tail, float y, float h){
  vec2 dir = vec2(sin(ang), cos(ang));
  float along = dot(p.xz, dir);
  float perp = dot(p.xz, vec2(dir.y, -dir.x));
  float t = clamp(along/len, 0.0, 1.0);
  float width = mix(w, w*0.22, t*t);
  float d = max(abs(perp) - width, max(-along - tail, along - len));
  d = min(d, length(p.xz) - w*1.7);
  return max(d, abs(p.y - y) - h);
}

vec2 mapW(vec3 p){
  // glove: palm slab, four fingers curled over the left edge of the case, thumb on the right
  float palm = sdEll(p - vec3(-0.4, -1.05, -0.8), vec3(4.6, 1.05, 5.4));
  float fing = 1e9;
  for(int i=0;i<4;i++){
    float fi = float(i);
    float z = 1.7 - fi*1.2;
    float r = 0.66 - fi*0.05;
    vec3 a = vec3(-5.0, -0.7, z + 0.25);
    vec3 b = vec3(-3.35, 0.75, z);
    vec3 c = vec3(-2.45, 0.98, z - 0.12);
    fing = min(fing, sdCap(p, a, b, r));
    fing = min(fing, sdCap(p, b, c, r*0.9));
  }
  float thumb = sdCapT(p, vec3(4.2, -0.6, -3.6), vec3(2.75, 0.62, -1.75), 0.8, 0.62);
  float glove = smin(palm, smin(fing, thumb, 0.35), 0.7);
  glove += 0.012*vnoise3(p*9.0);                                        // leather grain
  vec2 res = vec2(glove, 1.0);

  // case, bezel, pendant, crown, bow
  float cs = sdCyl(p - vec3(0.0, 0.40, 0.0), 0.38, WR - 0.08) - 0.08;
  float bez = sdTorus(p - vec3(0.0, DIAL_Y + 0.02, 0.0), vec2(WR - 0.1, 0.13));
  cs = min(cs, bez);
  vec3 pc = p - vec3(0.0, 0.42, WR + 0.12);
  float pend = sdCyl(pc.xzy, 0.22, 0.17);
  vec3 pk = p - vec3(0.0, 0.42, WR + 0.5);
  float knurl = 0.025*sin(atan(pk.x, pk.y)*18.0);
  float crown = sdCyl(pk.xzy, 0.2, 0.30 + knurl) - 0.02;
  float bow = sdTorus(p - vec3(0.0, 0.42, WR + 1.25), vec2(0.62, 0.085));
  res = un(res, vec2(min(cs, min(pend, min(crown, bow))), 2.0));

  // chain: links alternate flat and upright, running up the frame and over the fingers
  float ch = 1e9;
  for(int i=0;i<7;i++){
    float fi = float(i);
    vec3 c = vec3(0.12*sin(fi*0.9), 0.35 - 0.02*fi, WR + 2.1 + fi*0.62);
    vec3 q = p - c;
    float l = (mod(fi, 2.0) < 0.5) ? sdLink(vec3(q.y, q.z, q.x), 0.12, 0.2, 0.055)
                                   : sdLink(vec3(q.x, q.z, q.y), 0.12, 0.2, 0.055);
    ch = min(ch, l);
  }
  res = un(res, vec2(ch, 5.0));

  // hands
  float hh = handShape(p, uWatchH, 1.05, 0.10, 0.2, DIAL_Y + 0.03, 0.018);
  float mh = handShape(p, uWatchM, 1.62, 0.07, 0.25, DIAL_Y + 0.07, 0.016);
  float sh = handShape(p, uWatchS, 1.78, 0.025, 0.5, DIAL_Y + 0.11, 0.014);
  res = un(res, vec2(min(hh, mh), 4.0));
  res = un(res, vec2(sh, 6.0));
  return res;
}

vec3 calcN(vec3 p){
  vec2 e = vec2(0.003, 0.0);
  return normalize(vec3(mapW(p+e.xyy).x - mapW(p-e.xyy).x, mapW(p+e.yxy).x - mapW(p-e.yxy).x, mapW(p+e.yyx).x - mapW(p-e.yyx).x));
}
float shadowW(vec3 ro, vec3 rd){
  float res = 1.0, t = 0.02;
  for(int i=0;i<24;i++){
    float h = mapW(ro + rd*t).x;
    res = min(res, 10.0*h/t);
    t += clamp(h, 0.02, 0.5);
    if(res < 0.02 || t > 8.0) break;
  }
  return clamp(res, 0.0, 1.0);
}

// out-of-focus night behind the hand: dark blue with soft warm and green discs
vec3 bokehBG(vec2 uv){
  vec3 col = mix(vec3(0.004, 0.007, 0.016), vec3(0.012, 0.02, 0.04), uv.y);
  vec2 g = uv*vec2(uRes.x/uRes.y, 1.0)*4.0;
  for(int j=-1;j<=1;j++) for(int i=-1;i<=1;i++){
    vec2 c = floor(g) + vec2(float(i), float(j));
    float h = hash(c + 4.0);
    if(h > 0.55){
      vec2 pos = c + vec2(hash(c+1.3), hash(c+7.1));
      float r = 0.35 + 0.25*hash(c+2.2);
      float d = length(g - pos);
      float disc = smoothstep(r, r*0.86, d)*(0.7 + 0.3*smoothstep(r*0.6, r*0.95, d));
      vec3 tint = h > 0.8 ? vec3(1.0, 0.62, 0.3) : vec3(0.35, 0.9, 0.6);
      col += disc*tint*0.06;
    }
  }
  return col;
}

vec3 envW(vec3 rd){
  vec3 c = mix(vec3(0.01, 0.015, 0.03), vec3(0.06, 0.08, 0.12), clamp(rd.y*0.5+0.5, 0.0, 1.0));
  c += vec3(1.0, 0.65, 0.35)*pow(max(dot(rd, normalize(vec3(0.5, 0.6, 0.6))), 0.0), 18.0)*2.5;     // the lantern
  c += vec3(0.6, 0.75, 1.0)*pow(max(dot(rd, normalize(vec3(-0.6, 0.7, -0.2))), 0.0), 12.0)*0.8;   // the moon
  c += vec3(0.3, 0.9, 0.6)*pow(max(dot(rd, normalize(vec3(-0.2, 0.9, 0.5))), 0.0), 6.0)*0.25;     // aurora
  return c;
}

vec3 dialColor(vec3 p){
  vec2 tuv = vec2(0.5 + p.x/(2.0*(WR-0.12)), 0.5 - p.z/(2.0*(WR-0.12)));
  return texture2D(uTex0, tuv).rgb;
}

vec3 shadeW(vec3 p, vec3 n, vec3 rd, float m){
  vec3 Lm = normalize(vec3(-0.6, 0.75, -0.25));   // moon, cool, from front left
  vec3 Ll = normalize(vec3(0.5, 0.55, 0.65));     // lantern, warm, from behind right
  vec3 cm = vec3(0.55, 0.65, 0.95)*1.1, cl = vec3(1.0, 0.62, 0.32)*1.6;
  float sm = shadowW(p + n*0.01, Lm), sl = shadowW(p + n*0.01, Ll);
  float dm = max(dot(n, Lm), 0.0)*sm, dl = max(dot(n, Ll), 0.0)*sl;
  vec3 refl = reflect(rd, n);
  float fres = pow(1.0 - max(dot(-rd, n), 0.0), 5.0);
  vec3 col;
  if(m < 1.5){                                    // black leather glove
    vec3 alb = vec3(0.018, 0.016, 0.015);
    col = alb*(cm*dm + cl*dl + 0.15);
    float sp = pow(max(dot(refl, Lm), 0.0), 30.0)*sm*0.35 + pow(max(dot(refl, Ll), 0.0), 40.0)*sl*0.6;
    col += sp*mix(cm, cl, 0.5)*(0.3 + 0.7*vnoise3(p*6.0));
    col += envW(refl)*0.05*(0.3 + fres);
  } else if(m < 2.5 || m > 4.5 && m < 5.5){       // gold case and chain
    vec3 gold = vec3(1.0, 0.72, 0.36);
    vec3 e = envW(refl);
    col = gold*(e*0.9 + cm*pow(max(dot(refl, Lm),0.0), 50.0)*sm*1.5 + cl*pow(max(dot(refl, Ll),0.0), 40.0)*sl*2.5);
    col += gold*(cm*dm + cl*dl)*0.12;
    // the dial sits inside the bezel on the case top
    float r = length(p.xz);
    if(m < 2.5 && r < WR - 0.2 && p.y > DIAL_Y - 0.03){
      vec3 dc = dialColor(p);
      float sd = shadowW(p + vec3(0.0, 0.01, 0.0), Lm)*0.85 + 0.15;
      col = dc*(cm*0.42*sd + cl*dl*0.3 + 0.07);
    }
  } else if(m < 4.5){                             // blued steel hands
    col = vec3(0.02, 0.03, 0.06)*(cm*dm + cl*dl + 0.1) + vec3(0.2,0.3,0.7)*pow(max(dot(refl, Lm),0.0), 20.0)*0.5;
  } else {                                        // the seconds hand, red
    col = vec3(0.55, 0.05, 0.04)*(cm*dm + cl*dl + 0.15) + cl*pow(max(dot(refl, Ll),0.0), 30.0)*0.3;
  }
  return col;
}

// the crystal: a shallow sphere cap over the dial, frosted at the rim
vec4 crystal(vec3 ro, vec3 rd){
  const float RS = 5.2;
  vec3 c = vec3(0.0, DIAL_Y + 0.45 - RS, 0.0);
  vec3 oc = ro - c;
  float b = dot(oc, rd), cc = dot(oc, oc) - RS*RS, h = b*b - cc;
  if(h < 0.0) return vec4(-1.0);
  float t = -b - sqrt(h);
  vec3 p = ro + rd*t;
  if(p.y < DIAL_Y + 0.02 || length(p.xz) > WR - 0.12) return vec4(-1.0);
  return vec4(p, t);
}

vec3 render(vec3 ro, vec3 rd, vec2 uv){
  float t = 0.0; float m = -1.0;
  for(int i=0;i<110;i++){
    vec2 h = mapW(ro + rd*t);
    if(h.x < 0.0008*t){ m = h.y; break; }
    t += h.x*0.9;
    if(t > 40.0) break;
  }
  vec3 col;
  if(m > 0.0){
    vec3 p = ro + rd*t;
    vec3 n = calcN(p);
    col = shadeW(p, n, rd, m);
  } else {
    col = bokehBG(uv);
  }
  vec4 cr = crystal(ro, rd);
  if(cr.w > 0.0 && (m < 0.0 || cr.w < t)){
    vec3 p = cr.xyz;
    vec3 n = normalize(p - vec3(0.0, DIAL_Y + 0.45 - 5.2, 0.0));
    float fres = 0.04 + 0.96*pow(1.0 - max(dot(-rd, n), 0.0), 5.0);
    col = mix(col, envW(reflect(rd, n)), clamp(fres*1.5, 0.0, 1.0));
    // frost: feathered crystals growing in from the rim
    float r = length(p.xz)/(WR - 0.12);
    float ang = atan(p.z, p.x);
    float feather = abs(sin(ang*23.0 + 6.0*fbm(p.xz*1.3))) ;
    float fr = fbm(p.xz*3.0 + 2.0) + 0.35*fbm(p.xz*11.0);
    float frost = smoothstep(0.55 - 0.5*uFrost, 1.05, r + 0.35*fr - 0.25*feather*r) * uFrost;
    frost = clamp(frost*1.4, 0.0, 0.85);
    vec3 frostCol = vec3(0.55, 0.62, 0.72)*0.22 + vec3(1.0, 0.7, 0.45)*0.06;
    col = mix(col, frostCol, frost);
  }
  // a few out-of-focus flakes drifting between the lens and the watch
  col += snowfall(uv, uT, 0.25, 0.0, 0.18)*vec3(0.18, 0.2, 0.24);
  return col;
}
