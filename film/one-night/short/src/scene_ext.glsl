// THE NORTH POLE. Metres. A log house faces the camera (its front wall at z = 9.5).
// uYears ages it: snow drifts up the walls and icicles lengthen. uDawn moves night to dawn.
const vec3 HOUSE = vec3(0.0, 0.0, 12.0);
const vec3 WIN = vec3(-1.3, 1.55, 9.5);     // the window, centre of its outer face

float age(){ return clamp(uYears/23.0, 0.0, 1.0); }

float groundH(vec2 xz){
  float h = 0.35*fbm(xz*0.07) + 0.05*vnoise(xz*0.8) - 0.2;
  vec2 d2 = abs(xz - HOUSE.xz) - vec2(3.0, 2.5);
  float d = length(max(d2, 0.0));
  h += (0.15 + 0.85*age())*exp(-d*1.1)*(0.8 + 0.4*vnoise(xz*1.5));     // drifts against the walls
  return h;
}

float sdRig(vec3 p, out float mat){
  // the sleigh and its team, in the rig's own frame: the team runs along +x
  mat = 20.0;
  vec3 q = (p - uSleigh)/uSleighScale;
  q.xy = rot(uPitch)*q.xy;
  float bound = length(q - vec3(1.6, 1.0, 0.0)) - 4.2;
  if(bound > 0.5) return bound*uSleighScale;
  // sleigh: body, seat back, curled runners
  vec3 sq = q;
  float body = sdRBox(sq - vec3(-0.15, 0.62, 0.0), vec3(0.85, 0.3, 0.5), 0.08);
  body = smin(body, sdRBox(sq - vec3(-0.85, 0.95, 0.0), vec3(0.18, 0.55, 0.52), 0.1), 0.15);
  body = smin(body, sdCap(sq, vec3(0.65, 0.5, 0.0), vec3(0.95, 0.95, 0.0), 0.25), 0.2);     // curved prow
  float run = 1e9;
  vec3 rq = vec3(sq.x, sq.y, abs(sq.z) - 0.45);
  run = min(run, sdCap(rq, vec3(-1.0, 0.05, 0.0), vec3(0.9, 0.05, 0.0), 0.04));
  run = min(run, sdTorus(vec3(rq.x - 0.9, rq.z, rq.y - 0.35), vec2(0.3, 0.04)));
  run = min(run, sdCap(rq, vec3(-0.6, 0.05, 0.0), vec3(-0.6, 0.4, 0.0), 0.035));
  run = min(run, sdCap(rq, vec3(0.4, 0.05, 0.0), vec3(0.4, 0.4, 0.0), 0.035));
  // Santa and the sack
  float santa = sdEll(sq - vec3(-0.35, 1.25, 0.0), vec3(0.38, 0.5, 0.42));
  santa = smin(santa, length(sq - vec3(-0.3, 1.88, 0.0)) - 0.2, 0.08);
  float hat = sdCapT(sq, vec3(-0.32, 2.0, 0.0), vec3(-0.55, 2.35, 0.1), 0.17, 0.03);
  float sack = sdEll(sq - vec3(-0.95, 1.45, 0.05), vec3(0.32, 0.42, 0.38));
  float d = min(body, run);
  mat = body < run ? 21.0 : 22.0;
  if(santa < d){ d = santa; mat = 23.0; }
  if(hat < d){ d = hat; mat = 23.0; }
  if(sack < d){ d = sack; mat = 24.0; }
  // reindeer, two pairs
  for(int i=0;i<4;i++){
    float fi = float(i);
    vec3 o = vec3(2.1 + 1.3*floor(fi*0.5), 0.0, mod(fi, 2.0) < 0.5 ? -0.42 : 0.42);
    vec3 r = sq - o;
    float ph = uGallop + fi*1.3;
    float rb = sdEll(r - vec3(0.0, 1.0, 0.0), vec3(0.5, 0.25, 0.19));
    rb = smin(rb, sdCap(r, vec3(0.35, 1.1, 0.0), vec3(0.6, 1.5, 0.0), 0.11), 0.1);       // neck
    rb = smin(rb, sdEll(r - vec3(0.75, 1.55, 0.0), vec3(0.2, 0.1, 0.09)), 0.06);         // head
    vec3 rz = vec3(r.x, r.y, abs(r.z));
    float ant = sdCap(rz, vec3(0.62, 1.65, 0.04), vec3(0.5, 2.0, 0.18), 0.022);
    ant = min(ant, sdCap(rz, vec3(0.55, 1.85, 0.12), vec3(0.72, 2.0, 0.2), 0.016));
    ant = min(ant, sdCap(rz, vec3(0.5, 2.0, 0.18), vec3(0.35, 2.12, 0.16), 0.014));
    float legs = 1e9;
    for(int k=0;k<4;k++){
      float fk = float(k);
      float lx = fk < 1.5 ? 0.32 : -0.32;
      float lz = mod(fk, 2.0) < 0.5 ? 0.1 : -0.1;
      float sw = sin(ph + fk*1.7)*0.55;
      vec3 a = vec3(lx, 0.95, lz);
      vec3 b = a + vec3(sin(sw)*0.4, -cos(sw)*0.4, 0.0);
      vec3 c = b + vec3(sin(sw*1.6 + 0.4)*0.38, -cos(sw*1.6 + 0.4)*0.38, 0.0);
      legs = min(legs, min(sdCap(r, a, b, 0.055), sdCap(r, b, c, 0.04)));
    }
    float deer = smin(rb, legs, 0.06);
    if(deer < d){ d = deer; mat = 25.0; }
    if(ant < d){ d = ant; mat = 26.0; }
    // reins
    float rein = sdCap(sq, vec3(0.9, 0.95, 0.0), r.xyz*0.0 + o + vec3(0.7, 1.45, 0.0), 0.012);
    if(rein < d){ d = rein; mat = 22.0; }
  }
  return d*uSleighScale;
}

vec2 mapE(vec3 p){
  vec2 res = vec2(p.y - groundH(p.xz), 1.0);
  // the house
  vec3 h = p - HOUSE;
  float logs = 0.045*(1.0 - pow(abs(cos(p.y*3.14159/0.32)), 4.0));
  float walls = sdBox(h - vec3(0.0, 1.6, 0.0), vec3(3.0, 1.6, 2.5)) - logs;
  // corner log ends
  vec3 ce = vec3(abs(h.x) - 3.05, h.y, abs(h.z) - 2.55);
  walls = min(walls, sdBox(ce - vec3(0.0, 1.6, 0.0), vec3(0.12, 1.6, 0.12)) - logs);
  // window recess and door recess
  walls = max(walls, -sdBox(p - WIN, vec3(0.62, 0.62, 0.25)));
  walls = max(walls, -sdBox(p - vec3(1.4, 1.05, 9.5), vec3(0.52, 1.05, 0.12)));
  res = un(res, vec2(walls, 2.0));
  // window frame, mullions and sill
  vec3 w = p - WIN;
  float frame = max(sdBox(w, vec3(0.66, 0.66, 0.08)), -sdBox(w, vec3(0.56, 0.56, 0.3)));
  frame = min(frame, sdBox(w - vec3(0.0, 0.0, 0.08), vec3(0.025, 0.56, 0.03)));
  frame = min(frame, sdBox(w - vec3(0.0, 0.0, 0.08), vec3(0.56, 0.025, 0.03)));
  frame = min(frame, sdBox(w - vec3(0.0, -0.66, -0.08), vec3(0.75, 0.05, 0.16)));
  res = un(res, vec2(frame, 3.0));
  float pane = sdBox(w - vec3(0.0, 0.0, 0.1), vec3(0.56, 0.56, 0.01));
  res = un(res, vec2(pane, 4.0));
  // door
  float door = sdBox(p - vec3(1.4, 1.05, 9.56), vec3(0.5, 1.03, 0.04));
  res = un(res, vec2(door, 3.0));
  // roof: a gable along x, with a thick snow cap
  float dz = abs(h.z);
  vec2 nr = normalize(vec2(0.68, 1.0));
  float pl = dot(vec2(dz, h.y - 4.95), nr);
  float bx = max(abs(h.x) - 3.45, dz - 3.15);
  float roof = max(max(pl, -(pl + 0.22)), bx);
  res = un(res, vec2(roof, 3.0));
  float snowcap = max(max(pl - 0.22 - 0.08*vnoise(p.xz*2.0), -pl), max(abs(h.x) - 3.55, dz - 3.25));
  res = un(res, vec2(snowcap, 1.0));
  float chim = sdBox(h - vec3(1.8, 4.6, 0.8), vec3(0.33, 1.0, 0.33));
  res = un(res, vec2(chim, 5.0));
  // icicles hang from the front eave and grow with the years
  if(p.z < 9.3 && p.z > 8.6 && p.y > 1.2 && p.y < 3.0 && abs(p.x) < 3.4){
    float cw = 0.16;
    float id = floor(p.x/cw);
    float lx = (fract(p.x/cw) - 0.5)*cw;
    float len = (0.08 + 0.45*hash1(id*1.7))*(0.3 + 1.7*age());
    float top = 2.80;
    float tt = clamp((top - p.y)/len, 0.0, 1.0);
    float r = 0.035*(1.0 - tt) + 0.003;
    float ic = max(length(vec2(lx, p.z - 8.95)) - r, max(p.y - top, top - len - p.y));
    res = un(res, vec2(ic*0.8, 6.0));
  }
  // the lantern by the door
  res = un(res, vec2(length(p - vec3(2.15, 2.0, 9.35)) - 0.09, 7.0));
  // pines for scale, far back
  for(int i=0;i<3;i++){
    float fi = float(i);
    vec3 tp = p - vec3(-9.0 + fi*8.5, 0.0, 24.0 + 4.0*hash1(fi));
    float hgt = 6.0 + 2.0*hash1(fi + 3.0);
    float tr = max(length(tp.xz) - (1.0 - tp.y/hgt)*1.9 - 0.15*sin(tp.y*5.0), max(-tp.y, tp.y - hgt));
    res = un(res, vec2(tr*0.7, 8.0));
  }
  // the rig
  if(uSleighOn > 0.5){
    float rm;
    float rd = sdRig(p, rm);
    res = un(res, vec2(rd, rm));
  }
  return res;
}

vec3 calcN(vec3 p){
  vec2 e = vec2(0.004, 0.0);
  return normalize(vec3(mapE(p+e.xyy).x - mapE(p-e.xyy).x, mapE(p+e.yxy).x - mapE(p-e.yxy).x, mapE(p+e.yyx).x - mapE(p-e.yyx).x));
}
float shadowE(vec3 ro, vec3 rd){
  float res = 1.0, t = 0.05;
  for(int i=0;i<28;i++){
    float h = mapE(ro + rd*t).x;
    res = min(res, 12.0*h/t);
    t += clamp(h, 0.05, 1.2);
    if(res < 0.02 || t > 30.0) break;
  }
  return clamp(res, 0.0, 1.0);
}

vec3 sunDir(){ return normalize(mix(vec3(-0.5, 0.42, -0.75), vec3(0.85, 0.10, 0.55), uDawn)); }
vec3 sunCol(){ return mix(vec3(0.42, 0.52, 0.85)*0.75, vec3(1.0, 0.55, 0.38)*2.2, uDawn); }

vec3 skyE(vec3 rd){
  float y = max(rd.y, 0.0);
  vec3 night = mix(vec3(0.02, 0.035, 0.07), vec3(0.003, 0.006, 0.018), pow(y, 0.5));
  vec3 dawn = mix(vec3(1.0, 0.5, 0.38)*0.75, vec3(0.10, 0.16, 0.36), pow(y, 0.45));
  dawn += vec3(1.0, 0.6, 0.35)*pow(max(dot(rd, sunDir()), 0.0), 6.0)*0.8;
  vec3 col = mix(night, dawn, uDawn);
  // stars
  vec3 sp = rd*180.0;
  vec3 ci = floor(sp);
  float h = hash3(ci);
  if(h > 0.985){
    vec3 cpos = ci + 0.5 + 0.3*(vec3(hash3(ci+1.0), hash3(ci+2.0), hash3(ci+3.0)) - 0.5);
    float d = length(sp - cpos);
    col += vec3(0.8, 0.85, 1.0)*smoothstep(0.35, 0.0, d)*(h - 0.985)*60.0*(1.0 - uDawn)*smoothstep(0.0, 0.1, rd.y);
  }
  // aurora: curtains on a sheet high above, sampled at a few heights
  if(rd.y > 0.03 && uDawn < 0.99){
    vec3 au = vec3(0.0);
    for(int i=0;i<7;i++){
      float fi = float(i);
      float t = (2.0 + fi*0.22)/rd.y;
      vec2 q = rd.xz*t;
      float curtain = fbm(vec2(q.x*0.35 + 0.05*uT, q.y*0.12 + 2.0));
      float band = exp(-abs(curtain - 0.52)*14.0);
      float k = fi/6.0;
      au += mix(vec3(0.1, 1.0, 0.5), vec3(0.5, 0.25, 0.9), k*k)*band*(1.0 - k*0.7);
    }
    col += au*0.16*smoothstep(0.03, 0.35, rd.y)*(1.0 - uDawn);
  }
  return col;
}

// the lit window, from outside: warm frosted glass with a woman's silhouette waiting behind it
vec3 windowGlow(vec3 p){
  vec2 w = (p.xy - WIN.xy)/0.56;                  // -1..1 across the pane
  float warm = mix(1.0, 0.45, uDawn*0.5);
  vec3 interior = vec3(1.0, 0.5, 0.2)*(1.1 - 0.45*length(w))*warm;
  // silhouette: head, bun, shoulders and body, slightly to the right of centre
  vec2 s = w - vec2(0.18, 0.0);
  float stoop = age()*0.06;
  float head = length(s - vec2(-stoop, 0.42 - stoop)) - 0.20;
  float bun = length(s - vec2(0.12 - stoop, 0.55 - stoop)) - 0.08;
  float body = length((s - vec2(0.0, -0.62))*vec2(0.85, 0.7)) - 0.55;
  body = smin(body, length((s - vec2(0.0, 0.18))*vec2(1.0, 1.4)) - 0.09, 0.08);
  float sil = min(min(head, bun), body);
  float shade = smoothstep(0.08, -0.06, sil);                       // soft, the glass is frosted
  vec3 col = mix(interior, interior*0.06, shade*0.96);
  // frost at the corners of each pane
  vec2 cell = abs(fract((w*0.5 + 0.5)*2.0) - 0.5)*2.0;             // 0 at centre of a pane, 1 at its edges
  float frost = smoothstep(0.55, 1.1, max(cell.x, cell.y) + 0.35*fbm(p.xy*9.0));
  col = mix(col, vec3(0.75, 0.82, 0.95)*(0.25 + 0.4*uDawn), frost*0.7);
  return col*0.5;
}

vec3 shadeE(vec3 p, vec3 n, vec3 rd, float m){
  vec3 L = sunDir(); vec3 Lc = sunCol();
  float sh = shadowE(p + n*0.02, L);
  float dif = max(dot(n, L), 0.0)*sh;
  vec3 amb = mix(vec3(0.05, 0.10, 0.12), vec3(0.16, 0.18, 0.30), uDawn)*(0.6 + 0.4*n.y);
  // the window and the lantern throw warm light on the snow
  vec3 lw = WIN + vec3(0.0, 0.0, -0.4) - p;
  float dw = length(lw);
  vec3 warmL = vec3(1.0, 0.55, 0.25)*1.4*max(dot(n, lw/dw), 0.0)/(1.0 + dw*dw*0.6)*(1.0 - 0.6*uDawn);
  vec3 ll = vec3(2.15, 2.0, 9.15) - p; float dl = length(ll);
  warmL += vec3(1.0, 0.6, 0.3)*1.0*max(dot(n, ll/dl), 0.0)/(1.0 + dl*dl*1.2);
  vec3 alb; float spec = 0.0;
  if(m < 1.5){ alb = vec3(0.86, 0.9, 0.96); spec = 0.25;
    float glint = step(0.996, hash(floor(p.xz*90.0)))*pow(max(dot(reflect(rd, n), L), 0.0), 4.0);
    alb += glint*3.0; }
  else if(m < 2.5){ alb = vec3(0.16, 0.09, 0.05)*(0.7 + 0.6*fbm3(p*vec3(3.0, 0.5, 3.0))); }
  else if(m < 3.5){ alb = vec3(0.10, 0.06, 0.035); }
  else if(m < 4.5){ return windowGlow(p); }
  else if(m < 5.5){ alb = vec3(0.18, 0.16, 0.15)*(0.6 + 0.8*vnoise3(p*6.0)); }
  else if(m < 6.5){ alb = vec3(0.65, 0.78, 0.9); spec = 1.0; }
  else if(m < 7.5){ return vec3(1.0, 0.7, 0.35)*5.0; }
  else if(m < 8.5){ alb = mix(vec3(0.03, 0.06, 0.04), vec3(0.8, 0.85, 0.9), smoothstep(0.4, 0.7, n.y + 0.3*vnoise3(p*3.0))); }
  else if(m < 21.5){ alb = vec3(0.35, 0.03, 0.03); spec = 0.6; }
  else if(m < 22.5){ alb = vec3(0.6, 0.45, 0.2); spec = 0.8; }
  else if(m < 23.5){ alb = vec3(0.32, 0.03, 0.03); }
  else if(m < 24.5){ alb = vec3(0.22, 0.16, 0.10); }
  else if(m < 25.5){ alb = vec3(0.13, 0.08, 0.05); }
  else { alb = vec3(0.4, 0.35, 0.28); }
  vec3 col = alb*(Lc*dif + amb + warmL);
  col += spec*Lc*pow(max(dot(reflect(rd, n), L), 0.0), 24.0)*sh*0.5;
  return col;
}

// light-speed: stars stretch into lines radiating from the point the sleigh is flying into
vec3 warpStars(vec2 uv){
  vec3 d = normalize(uSleigh + vec3(1.0, 1.5, 0.0) - uCamPos);
  float z = dot(d, gFwd);
  vec2 vp = vec2(dot(d, gRight), dot(d, gUp))/max(z, 0.05)*gFocal;
  vec2 ndc = (uv - 0.5)*vec2(uRes.x/uRes.y, 1.0);
  vec2 rel = ndc - vp;
  float r = length(rel);
  float a = atan(rel.y, rel.x);
  float acc = 0.0;
  for(int L=0; L<2; L++){
    float fl = float(L);
    float n = 70.0 + 50.0*fl;
    float ac = a/6.28318*n;
    float ci = floor(ac);
    float h = hash(vec2(ci, fl*13.0));
    float ang = abs(fract(ac) - 0.5)/n*6.28318*r;               // perpendicular distance in screen units
    float r0 = 0.03 + 0.9*hash(vec2(ci, 7.0 + fl));
    float r1 = r0*(1.0 + uWarp*(2.5 + 2.0*h));
    float along = smoothstep(r0, r0 + 0.01, r)*smoothstep(r1 + 0.02, r1, r);
    float line = smoothstep(0.0025, 0.0, ang);
    acc += line*along*step(0.35, h)*(0.6 + 0.6*h);
  }
  return vec3(0.75, 0.85, 1.0)*acc*uWarp*1.6;
}

vec3 render(vec3 ro, vec3 rd, vec2 uv){
  float t = 0.0, m = -1.0;
  for(int i=0;i<140;i++){
    vec2 h = mapE(ro + rd*t);
    if(h.x < 0.0008*t){ m = h.y; break; }
    t += h.x*0.85;
    if(t > 120.0) break;
  }
  vec3 col;
  if(m > 0.0){
    vec3 p = ro + rd*t;
    col = shadeE(p, calcN(p), rd, m);
    float fog = 1.0 - exp(-t*0.012);
    col = mix(col, mix(vec3(0.03, 0.05, 0.08), vec3(0.42, 0.34, 0.40), uDawn), fog);
  } else {
    col = skyE(rd);
  }
  // the sleigh's lantern, a point of light that stays visible as the sleigh shrinks
  if(uSleighOn > 0.5){
    vec3 lp = uSleigh + vec3(0.0, 1.2*uSleighScale, 0.0);
    vec3 d = lp - ro; float tl = dot(d, rd);
    if(tl > 0.0 && (m < 0.0 || tl < t + 0.5)){
      float dist = length(d - rd*tl);
      col += vec3(1.0, 0.75, 0.4)*0.02/(dist*dist/(tl*tl)*4000.0 + 0.02)*0.08*(1.0 - uDawn*0.7);
    }
  }
  col = mix(col, vec3(0.0), uWarp*0.85);
  if(uWarp > 0.0) col += warpStars(uv);
  float fall = 0.9 + 6.0*uTimelapse;
  col += snowfall(uv, uT, fall, 2.5*uTimelapse, 0.35)*mix(vec3(0.25, 0.3, 0.38), vec3(0.35, 0.3, 0.32), uDawn)*(1.0 - uWarp);
  return col;
}
