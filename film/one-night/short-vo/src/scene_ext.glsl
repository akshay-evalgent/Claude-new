// THE NORTH POLE. Metres. A log house faces the camera (front wall at z = 9.5).
const vec3 HOUSE = vec3(0.0, 0.0, 12.0);
const vec3 WIN = vec3(-1.3, 1.55, 9.5);
const vec3 REST = vec3(-2.6, 0.0, 6.2);          // where the sleigh is parked at midnight
float age(){ return clamp(uYears/23.0, 0.0, 1.0); }
vec3 gLocal;                                       // local coordinate of the last rig hit, for shading

float groundH(vec2 xz){
  float h = 0.35*fbm3s(xz*0.07) + 0.04*vnoise(xz*0.9) - 0.2;
  vec2 d2 = abs(xz - HOUSE.xz) - vec2(3.0, 2.5);
  float d = length(max(d2, 0.0));
  h += (0.18 + 0.5*age())*exp(-d*1.0)*(0.8 + 0.4*vnoise(xz*1.5));
  // runner tracks and hoof prints leading to the parked sleigh
  if(xz.x < REST.x + 1.0 && xz.x > REST.x - 14.0 && age() < 0.5){
    for(int s=0;s<2;s++){
      float z = REST.z + (s == 0 ? -0.5 : 0.5);
      h -= 0.05*smoothstep(0.07, 0.0, abs(xz.y - z));
    }
    vec2 hp = vec2(mod(xz.x, 0.45) - 0.22, abs(xz.y - REST.z) - 0.42);
    h -= 0.03*smoothstep(0.09, 0.0, length(hp))*step(REST.x + 1.6, xz.x + 0.0)*0.0;
  }
  return h;
}

// ---------------------------------------------------------------- the team
float leg(vec3 r, vec3 hip, float a1, float l1, float a2, float l2, float a3, float l3, float r1, float r2, float r3, out float hoof){
  vec3 d1 = vec3(sin(a1), -cos(a1), 0.0);
  vec3 p1 = hip + d1*l1;
  vec3 d2 = vec3(sin(a1 + a2), -cos(a1 + a2), 0.0);
  vec3 p2 = p1 + d2*l2;
  vec3 d3 = vec3(sin(a1 + a2 + a3), -cos(a1 + a2 + a3), 0.0);
  vec3 p3 = p2 + d3*l3;
  float d = sdCapT(r, hip, p1, r1, r1*0.7);
  d = smin(d, sdCapT(r, p1, p2, r1*0.62, r2), 0.04);
  d = smin(d, sdCapT(r, p2, p3, r2*0.85, r3), 0.02);
  hoof = sdCapT(r, p3, p3 + d3*0.07, r3*1.25, r3*1.1);
  return d;
}
float deer(vec3 r, float ph, out float m){
  m = 25.0;
  float body = sdEll(r - vec3(0.0, 1.05, 0.0), vec3(0.6, 0.28, 0.22));
  body = smin(body, sdEll(r - vec3(0.36, 1.1, 0.0), vec3(0.3, 0.32, 0.23)), 0.14);
  body = smin(body, sdEll(r - vec3(-0.42, 1.1, 0.0), vec3(0.3, 0.27, 0.22)), 0.14);
  body = smin(body, sdCapT(r, vec3(0.42, 1.2, 0.0), vec3(0.74, 1.58, 0.0), 0.15, 0.085), 0.08);
  float head = sdEll(r - vec3(0.8, 1.64, 0.0), vec3(0.13, 0.1, 0.09));
  head = smin(head, sdCapT(r, vec3(0.83, 1.62, 0.0), vec3(1.02, 1.54, 0.0), 0.075, 0.05), 0.05);
  body = smin(body, head, 0.05);
  vec3 rz = vec3(r.x, r.y, abs(r.z));
  float ear = sdEll(rz - vec3(0.74, 1.72, 0.1), vec3(0.03, 0.075, 0.025));
  body = smin(body, ear, 0.02);
  float tail = sdEll(r - vec3(-0.7, 1.2, 0.0), vec3(0.08, 0.05, 0.045));
  float d = body;
  // legs: a flying gallop
  float hf, legs = 1e9, hooves = 1e9;
  for(int k=0;k<2;k++){
    float sz = k == 0 ? 0.12 : -0.12;
    float pk = ph + (k == 0 ? 0.0 : 0.6);
    float s = sin(pk), c2 = cos(pk);
    float fl = leg(r, vec3(0.36, 0.98, sz), 0.35 + 0.55*s, 0.3, -0.9 - 0.8*max(c2, 0.0), 0.27, 0.5 + 0.4*s, 0.2, 0.085, 0.045, 0.032, hf);
    legs = min(legs, fl); hooves = min(hooves, hf);
    float hl = leg(r, vec3(-0.46, 1.0, sz), -0.2 - 0.6*s, 0.34, 0.9 + 0.4*c2, 0.3, -0.7 - 0.3*s, 0.2, 0.1, 0.05, 0.032, hf);
    legs = min(legs, hl); hooves = min(hooves, hf);
  }
  d = smin(d, legs, 0.07);
  // the cream ruff under the neck and the belly
  float ruff = sdEll(r - vec3(0.55, 1.22, 0.0), vec3(0.17, 0.2, 0.15));
  if(ruff < d + 0.01 && ruff < 0.0 + 0.02) m = 28.0;
  float ant = 1e9;
  ant = min(ant, sdCapT(rz, vec3(0.74, 1.72, 0.05), vec3(0.67, 1.9, 0.13), 0.028, 0.024));
  ant = min(ant, sdCapT(rz, vec3(0.67, 1.9, 0.13), vec3(0.56, 2.05, 0.21), 0.024, 0.02));
  ant = min(ant, sdCapT(rz, vec3(0.56, 2.05, 0.21), vec3(0.44, 2.13, 0.24), 0.02, 0.012));
  ant = min(ant, sdCapT(rz, vec3(0.67, 1.9, 0.13), vec3(0.8, 2.02, 0.15), 0.018, 0.01));
  ant = min(ant, sdCapT(rz, vec3(0.56, 2.05, 0.21), vec3(0.63, 2.21, 0.25), 0.017, 0.009));
  ant = min(ant, sdCapT(rz, vec3(0.44, 2.13, 0.24), vec3(0.35, 2.26, 0.21), 0.015, 0.008));
  ant = min(ant, sdCapT(rz, vec3(0.72, 1.79, 0.08), vec3(0.86, 1.86, 0.09), 0.016, 0.008));
  if(ant < d){ d = ant; m = 26.0; }
  if(hooves < d){ d = hooves; m = 27.0; }
  if(tail < d){ d = tail; m = 28.0; }
  // harness collar with bells
  vec3 q = r - vec3(0.55, 1.33, 0.0); q.xy = rot(-0.85)*q.xy;
  float collar = length(vec2(length(q.yz) - 0.16, q.x)) - 0.032;
  if(collar < d){ d = collar; m = 29.0; }
  float bells = 1e9;
  for(int i=0;i<3;i++){ float a = -0.6 + 0.6*float(i); bells = min(bells, length(q - vec3(0.0, -0.17*cos(a), 0.17*sin(a))) - 0.035); }
  if(bells < d){ d = bells; m = 30.0; }
  float eye = length(rz - vec3(0.88, 1.67, 0.075)) - 0.017;
  if(eye < d){ d = eye; m = 27.0; }
  float nose = length(r - vec3(1.04, 1.55, 0.0)) - 0.035;
  if(nose < d){ d = nose; m = 27.0; }
  return d;
}

float santa(vec3 q, out float m){
  m = 23.0;
  vec3 s = q - vec3(-0.45, 0.0, 0.0);
  float coat = sdEll(s - vec3(0.0, 1.3, 0.0), vec3(0.36, 0.5, 0.4));
  coat = smin(coat, sdEll(s - vec3(0.14, 1.16, 0.0), vec3(0.3, 0.32, 0.36)), 0.12);
  vec3 sz = vec3(s.x, s.y, abs(s.z));
  float arms = sdCapT(sz, vec3(0.0, 1.62, 0.3), vec3(0.3, 1.36, 0.36), 0.12, 0.1);
  arms = min(arms, sdCapT(sz, vec3(0.3, 1.36, 0.36), vec3(0.58, 1.3, 0.2), 0.1, 0.09));
  coat = smin(coat, arms, 0.06);
  float thigh = sdCapT(sz, vec3(0.0, 0.98, 0.16), vec3(0.5, 0.92, 0.17), 0.15, 0.12);
  coat = smin(coat, thigh, 0.08);
  float d = coat;
  float boots = sdCapT(sz, vec3(0.5, 0.92, 0.17), vec3(0.62, 0.62, 0.17), 0.1, 0.09);
  boots = min(boots, sdEll(sz - vec3(0.7, 0.58, 0.17), vec3(0.14, 0.07, 0.08)));
  float gloves = length(sz - vec3(0.62, 1.3, 0.18)) - 0.07;
  float belt = max(length(vec2(length((s - vec3(0.04, 1.17, 0.0)).xz*vec2(0.95, 0.82)) - 0.36, s.y - 1.17)) - 0.035, -0.0);
  float trim = length(vec2(length((s - vec3(0.02, 0.86, 0.0)).xz) - 0.36, s.y - 0.86)) - 0.06;
  trim = min(trim, length(sz - vec3(0.58, 1.3, 0.2)) - 0.08);
  trim = min(trim, sdCap(s, vec3(0.33, 0.9, 0.0), vec3(0.37, 1.6, 0.0), 0.04));
  float face = length(s - vec3(0.08, 1.98, 0.0)) - 0.16;
  float beard = sdEll(s - vec3(0.17, 1.84, 0.0), vec3(0.14, 0.22, 0.17)) + 0.03*fbm3(s*25.0);
  beard = smin(beard, sdEll(s - vec3(0.23, 1.93, 0.0), vec3(0.06, 0.03, 0.12)), 0.03);
  float hat = sdCapT(s, vec3(0.05, 2.1, 0.0), vec3(-0.12, 2.36, 0.04), 0.17, 0.09);
  hat = smin(hat, sdCapT(s, vec3(-0.12, 2.36, 0.04), vec3(-0.34, 2.32, 0.1), 0.09, 0.035), 0.05);
  float brim = length(vec2(length((s - vec3(0.05, 2.08, 0.0)).xz) - 0.17, s.y - 2.08)) - 0.05;
  float pom = length(s - vec3(-0.38, 2.3, 0.11)) - 0.07;
  if(boots < d){ d = boots; m = 27.0; }
  if(gloves < d){ d = gloves; m = 27.0; }
  if(belt < d){ d = belt; m = 27.0; }
  if(trim < d){ d = trim; m = 32.0; }
  if(face < d){ d = face; m = 33.0; }
  if(beard < d){ d = beard; m = 32.0; }
  if(hat < d){ d = hat; m = 23.0; }
  float wh = min(brim, pom);
  if(wh < d){ d = wh; m = 32.0; }
  float buckle = sdBox(s - vec3(0.36, 1.17, 0.0), vec3(0.02, 0.05, 0.06));
  if(buckle < d){ d = buckle; m = 22.0; }
  return d;
}

float sdRig(vec3 p, out float mat){
  mat = 20.0;
  vec3 q = p - uSleigh;
  q.xz = rot(uYaw)*q.xz;
  q.xy = rot(uPitch)*q.xy;
  float bound = length(q - vec3(1.5, 1.1, 0.0)) - 4.4;
  if(bound > 0.6) return bound;
  gLocal = q;
  // sleigh body: a tub with a high scrolled back and a swan-neck prow
  float body = sdRBox(q - vec3(-0.25, 0.62, 0.0), vec3(0.85, 0.26, 0.55), 0.12);
  body = smin(body, sdRBox(q - vec3(-0.98, 1.0, 0.0), vec3(0.17, 0.56, 0.58), 0.1), 0.18);
  body = min(body, length(vec2(length((q - vec3(-1.05, 1.52, 0.0)).xy) - 0.12, max(abs(q.z) - 0.58, 0.0))) - 0.07);
  body = smin(body, sdCapT(q, vec3(0.5, 0.55, 0.0), vec3(0.95, 0.98, 0.0), 0.3, 0.15), 0.2);
  float scroll = length(vec2(length((q - vec3(1.05, 1.12, 0.0)).xy) - 0.13, max(abs(q.z) - 0.12, 0.0))) - 0.05;
  body = min(body, scroll);
  body = max(body, -sdRBox(q - vec3(-0.15, 0.95, 0.0), vec3(0.65, 0.25, 0.47), 0.1));   // the seat well
  float d = body; mat = 21.0;
  float trim = sdCap(vec3(q.x, q.y, abs(q.z)), vec3(-0.9, 0.9, 0.57), vec3(0.45, 0.88, 0.57), 0.025);
  trim = min(trim, sdCap(vec3(q.x, q.y, abs(q.z)), vec3(-0.98, 0.5, 0.6), vec3(-0.98, 1.45, 0.6), 0.022));
  vec3 rq = vec3(q.x, q.y, abs(q.z) - 0.5);
  float run = sdCap(rq, vec3(-1.15, 0.04, 0.0), vec3(0.9, 0.04, 0.0), 0.04);
  run = min(run, max(length(vec2(length((rq - vec3(0.9, 0.4, 0.0)).xy) - 0.36, rq.z)) - 0.04, -(rq.x - 0.9)));
  run = min(run, length(vec2(length((rq - vec3(0.98, 0.84, 0.0)).xy) - 0.09, rq.z)) - 0.03);
  for(int i=0;i<3;i++){ float x = -0.8 + 0.6*float(i); run = min(run, sdCap(rq, vec3(x, 0.04, 0.0), vec3(x, 0.42, 0.0), 0.03)); }
  run = min(run, trim);
  if(run < d){ d = run; mat = 22.0; }
  float cushion = sdRBox(q - vec3(-0.6, 0.78, 0.0), vec3(0.3, 0.08, 0.45), 0.06);
  if(cushion < d){ d = cushion; mat = 34.0; }
  float sm;
  float sa = santa(q, sm);
  if(sa < d){ d = sa; mat = sm; }
  float sack = sdEll(q - vec3(-1.25, 1.35, 0.05), vec3(0.35, 0.45, 0.4)) + 0.02*fbm3(q*12.0);
  if(sack < d){ d = sack; mat = 24.0; }
  for(int i=0;i<3;i++){
    float fi = float(i);
    float bx = sdRBox(q - vec3(-1.3 + 0.12*fi, 1.82 + 0.03*fi, -0.15 + 0.15*fi), vec3(0.09, 0.08, 0.08), 0.01);
    if(bx < d){ d = bx; mat = 35.0 + fi; }
  }
  // the team, two pairs
  for(int i=0;i<4;i++){
    float fi = float(i);
    vec3 o = vec3(2.15 + 1.45*floor(fi*0.5), 0.0, mod(fi, 2.0) < 0.5 ? -0.42 : 0.42);
    vec3 r = q - o;
    if(length(r - vec3(0.2, 1.3, 0.0)) > 1.4) continue;
    float dm;
    float dd = deer(r, uGallop + fi*1.1 + (mod(fi, 2.0) < 0.5 ? 0.0 : 0.4), dm);
    if(dd < d){ d = dd; mat = dm; }
  }
  for(int i=0;i<2;i++){
    float z = i == 0 ? -0.42 : 0.42;
    float rein = sdCap(q, vec3(0.2, 1.3, z*0.4), vec3(2.6, 1.4, z), 0.008);
    rein = min(rein, sdCap(q, vec3(0.95, 0.55, z*1.2), vec3(3.5, 1.1, z), 0.012));
    if(rein < d){ d = rein; mat = 29.0; }
  }
  return d;
}

// ---------------------------------------------------------------- the house and the clearing
float pines(vec3 p, out float isSnow){
  isSnow = 0.0;
  vec2 c = p.xz - HOUSE.xz;
  float rr = length(c);
  if(p.y > 13.5) return p.y - 13.2;                         // no tree is taller than 13 m
  if(rr < 12.0) return 12.05 - rr;                          // the nearest tree is never closer than 12 m to the house
  float a = atan(c.x, c.y);
  float N = 44.0;
  float sec = floor(a/6.28318*N + 0.5);
  float d = 1e9;
  for(int k=0;k<=0;k++){
    float s = sec + float(k);
    float aa = s/N*6.28318;
    if(cos(aa) < -0.35) continue;                          // keep the camera side open
    float rad = 16.0 + 14.0*hash1(s*1.3) + (hash1(s*7.7) > 0.5 ? 7.0 : 0.0);
    vec2 tp = HOUSE.xz + vec2(sin(aa), cos(aa))*rad;
    vec3 q = p - vec3(tp.x, 0.0, tp.y);
    float hgt = 7.0 + 6.0*hash1(s*3.1);
    float rad0 = hgt*0.3;
    float tiers = 1e9;
    for(int j=0;j<4;j++){
      float fj = float(j);
      float by = 0.8 + fj*hgt*0.21, th = hgt*0.36;
      vec3 cq = q - vec3(0.0, by, 0.0);
      float rr2 = rad0*(1.0 - fj*0.22);
      float cone = max(length(cq.xz) - rr2*(1.0 - cq.y/th) - 0.12*sin(atan(cq.x, cq.z)*9.0 + fj), max(-cq.y, cq.y - th))*0.7;
      tiers = min(tiers, cone);
    }
    tiers = max(tiers, q.y - hgt);
    tiers = min(tiers, sdCyl(q - vec3(0.0, 0.6, 0.0), 0.6, 0.18));
    d = min(d, tiers);
  }
  return d;
}

vec2 mapE(vec3 p){
  vec2 res = vec2(p.y - groundH(p.xz), 1.0);
  vec3 h = p - HOUSE;
  // log walls; round log ends at the corners
  float logs = 0.05*(1.0 - pow(abs(cos(p.y*3.14159/0.32)), 4.0));
  float walls = sdBox(h - vec3(0.0, 1.75, 0.0), vec3(3.0, 1.45, 2.5)) - logs;
  vec3 ce = vec3(abs(h.x) - 3.0, mod(h.y - 0.3, 0.32) - 0.16, abs(h.z) - 2.5);
  if(h.y > 0.3 && h.y < 3.2){
    float lx = max(length(ce.yz) - 0.15, abs(ce.x) - 0.28);
    float lz = max(length(ce.xy) - 0.15, abs(ce.z) - 0.28);
    walls = min(walls, min(lx, lz));
  }
  walls = max(walls, -sdBox(p - WIN, vec3(0.62, 0.62, 0.25)));
  walls = max(walls, -sdBox(p - vec3(1.4, 1.2, 9.5), vec3(0.52, 1.0, 0.12)));
  res = un(res, vec2(walls, 2.0));
  float found = sdRBox(h - vec3(0.0, 0.15, 0.0), vec3(3.15, 0.3, 2.65), 0.05) + 0.03*vnoise(p.xy*6.0 + p.z);
  res = un(res, vec2(found, 5.0));
  vec3 w = p - WIN;
  float frame = max(sdBox(w, vec3(0.66, 0.66, 0.08)), -sdBox(w, vec3(0.56, 0.56, 0.3)));
  frame = min(frame, sdBox(w - vec3(0.0, 0.0, 0.08), vec3(0.025, 0.56, 0.03)));
  frame = min(frame, sdBox(w - vec3(0.0, 0.0, 0.08), vec3(0.56, 0.025, 0.03)));
  frame = min(frame, sdBox(w - vec3(0.0, -0.66, -0.08), vec3(0.75, 0.05, 0.16)));
  vec3 sw = vec3(abs(w.x) - 0.9, w.y, w.z + 0.04);
  frame = min(frame, sdBox(sw, vec3(0.24, 0.64, 0.035)) - 0.005*step(0.5, fract(w.y*6.0)));
  res = un(res, vec2(frame, 3.0));
  res = un(res, vec2(sdBox(w - vec3(0.0, 0.0, 0.1), vec3(0.56, 0.56, 0.01)), 4.0));
  float door = sdBox(p - vec3(1.4, 1.2, 9.56), vec3(0.5, 1.0, 0.04)) - 0.006*step(0.8, fract(p.x*7.0));
  res = un(res, vec2(door, 3.0));
  vec3 wq = p - vec3(1.4, 1.62, 9.44);
  float wreath = length(vec2(length(wq.xy) - 0.22, wq.z)) - 0.07 + 0.035*fbm3(p*30.0);
  res = un(res, vec2(wreath*0.8, 9.0));
  float berries = 1e9;
  for(int i=0;i<7;i++){ float a = float(i)*0.9 + 0.3; berries = min(berries, length(wq - vec3(cos(a)*0.22, sin(a)*0.22, -0.07)) - 0.022); }
  berries = min(berries, sdEll(wq - vec3(0.0, -0.24, -0.06), vec3(0.09, 0.05, 0.03)));
  res = un(res, vec2(berries, 10.0));
  // roof with a heavy snow cap
  float dz = abs(h.z);
  vec2 nr = normalize(vec2(0.68, 1.0));
  float pl = dot(vec2(dz, h.y - 5.1), nr);
  float bx = max(abs(h.x) - 3.45, dz - 3.15);
  res = un(res, vec2(max(max(pl, -(pl + 0.22)), bx), 3.0));
  float cap = max(max(pl - 0.24 - 0.1*fbm(p.xz*1.5) - 0.12*age(), -pl), max(abs(h.x) - 3.58, dz - 3.28));
  res = un(res, vec2(cap, 1.0));
  res = un(res, vec2(sdBox(h - vec3(1.8, 4.8, 0.8), vec3(0.33, 1.1, 0.33)), 5.0));
  // icicles
  if(p.z < 9.3 && p.z > 8.5 && p.y > 0.8 && p.y < 3.1 && abs(p.x) < 3.4){
    float cw = 0.15;
    float id = floor(p.x/cw);
    float lx = (fract(p.x/cw) - 0.5)*cw;
    float len = (0.06 + 0.5*hash1(id*1.7))*(0.3 + 2.2*age());
    float top = 2.94;
    float tt = clamp((top - p.y)/len, 0.0, 1.0);
    float r = 0.04*(1.0 - tt) + 0.003;
    float ic = max(length(vec2(lx, p.z - 8.88)) - r, max(p.y - top, top - len - p.y));
    res = un(res, vec2(ic*0.8, 6.0));
  }
  float lantern = sdBox(p - vec3(2.15, 2.0, 9.35), vec3(0.08, 0.12, 0.08));
  res = un(res, vec2(lantern, 7.0));
  res = un(res, vec2(sdCap(p, vec3(2.15, 2.12, 9.35), vec3(2.15, 2.3, 9.45), 0.012), 27.0));
  float sn;
  res = un(res, vec2(pines(p, sn), 8.0));
  if(uSleighOn > 0.5){ float rm; float rd = sdRig(p, rm); res = un(res, vec2(rd, rm)); }
  return res;
}
vec3 calcN(vec3 p, float t){
  vec2 e = vec2(0.0012 + 0.0004*t, 0.0);
  return normalize(vec3(mapE(p+e.xyy).x - mapE(p-e.xyy).x, mapE(p+e.yxy).x - mapE(p-e.yxy).x, mapE(p+e.yyx).x - mapE(p-e.yyx).x));
}
float shadowE(vec3 ro, vec3 rd){
  float res = 1.0, t = 0.04;
  for(int i=0;i<26;i++){
    float h = mapE(ro + rd*t).x;
    res = min(res, 10.0*h/t);
    t += clamp(h, 0.06, 2.0);
    if(res < 0.01 || t > 40.0) break;
  }
  return clamp(res, 0.0, 1.0);
}
float aoE(vec3 p, vec3 n){
  float occ = 0.0, s = 1.0;
  for(int i=0;i<3;i++){ float h = 0.06 + 0.25*float(i); occ += (h - mapE(p + n*h).x)*s; s *= 0.65; }
  return clamp(1.0 - 1.2*occ, 0.0, 1.0);
}
vec3 sunDir(){ return normalize(mix(vec3(-0.5, 0.45, -0.75), vec3(0.88, 0.09, 0.47), uDawn)); }
vec3 sunCol(){ return mix(vec3(0.42, 0.52, 0.85)*0.9, vec3(1.0, 0.55, 0.36)*3.2, uDawn); }

vec3 stars(vec3 rd){
  vec3 col = vec3(0.0);
  float el = asin(clamp(rd.y, -1.0, 1.0));
  if(el < 0.0) return col;
  float az = atan(rd.z, rd.x) + uSkySpin;
  float cs = 0.018;
  float ey = floor(el/cs);
  float circ = max(cos(el), 0.05);
  for(int j=-1;j<=1;j++){
    float row = ey + float(j);
    float elc = (row + 0.5)*cs;
    float acs = cs/max(cos(elc), 0.05);
    float ax = floor(az/acs);
    for(int i=-3;i<=1;i++){
      float cell = ax + float(i);
      float h = hash(vec2(cell, row));
      if(h < 0.82) continue;
      float sAz = (cell + hash(vec2(cell, row + 7.0)))*acs;
      float sEl = (row + hash(vec2(cell + 3.0, row)))*cs;
      float dEl = (el - sEl);
      float dAz = (az - sAz)*cos(sEl);
      float trail = uSkyBlur*cos(sEl);
      float along = clamp(dAz, 0.0, trail);
      float dist = length(vec2(dAz - along, dEl));
      float b = (h - 0.82)*90.0/(1.0 + trail*600.0);
      col += vec3(0.8, 0.86, 1.0)*b*smoothstep(0.0022, 0.0, dist)*mix(1.0, 0.8 + 0.4*sin(uT*3.0 + h*50.0), 1.0 - uSkyBlur*10.0);
    }
  }
  return col*(1.0 - uDawn);
}
vec3 skyE(vec3 rd){
  float y = max(rd.y, 0.0);
  vec3 night = mix(vec3(0.016, 0.03, 0.06), vec3(0.002, 0.004, 0.014), pow(y, 0.5));
  vec3 sd = sunDir();
  vec3 dawn = mix(vec3(1.0, 0.48, 0.32)*0.9, vec3(0.08, 0.13, 0.32), pow(y, 0.4));
  dawn += vec3(1.0, 0.55, 0.3)*pow(max(dot(rd, sd), 0.0), 5.0)*0.9 + vec3(1.0, 0.8, 0.5)*pow(max(dot(rd, sd), 0.0), 600.0)*30.0;
  // a band of cloud at dawn
  float cl = smoothstep(0.45, 0.75, fbm(vec2(atan(rd.z, rd.x)*3.0, y*14.0)))*exp(-y*14.0);
  dawn = mix(dawn, vec3(0.9, 0.42, 0.38)*1.1, cl*0.7);
  vec3 col = mix(night, dawn, uDawn);
  col += stars(rd);
  if(rd.y > 0.03 && uDawn < 0.99){
    vec3 au = vec3(0.0);
    for(int i=0;i<9;i++){
      float fi = float(i);
      float t = (2.0 + fi*0.2)/rd.y;
      vec2 q = rd.xz*t;
      float curtain = fbm(vec2(q.x*0.32 + 0.04*uT + 0.3*uTimelapse*uT, q.y*0.11 + 2.0));
      float band = exp(-abs(curtain - 0.52)*16.0);
      float rays = 0.6 + 0.4*vnoise(vec2(q.x*9.0 + q.y*2.0, fi*0.1));
      float k = fi/8.0;
      au += mix(vec3(0.1, 1.0, 0.45), vec3(0.6, 0.2, 0.9), k*k)*band*rays*(1.0 - k*0.75);
    }
    col += au*0.14*smoothstep(0.03, 0.35, rd.y)*(1.0 - uDawn);
  }
  // mountains on the horizon
  float az = atan(rd.z, rd.x);
  float ridge = 0.035 + 0.05*fbm(vec2(az*4.0, 1.0)) + 0.02*fbm(vec2(az*16.0, 3.0));
  if(rd.y < ridge) col = mix(mix(vec3(0.012, 0.02, 0.035), vec3(0.35, 0.28, 0.4), uDawn), col, smoothstep(0.0, 0.03, ridge - rd.y)*0.0 + 0.25);
  return col;
}
vec3 windowGlow(vec3 p){
  vec2 w = (p.xy - WIN.xy)/0.56;
  vec3 interior = vec3(1.0, 0.42, 0.14)*(0.95 - 0.45*length(w))*mix(1.0, 0.55, uDawn);
  vec2 s = w - vec2(0.12, 0.0);
  float st = uStoop;
  float head = length((s - vec2(-st*0.4, 0.36 - st))*vec2(1.0, 0.88)) - 0.24;
  float bun = length(s - vec2(0.13 - st*0.4, 0.6 - st)) - 0.1;
  float neck = length((s - vec2(-st*0.2, 0.06 - st*0.6))*vec2(1.0, 0.7)) - 0.11;
  float shoulders = length((s - vec2(0.0, -0.62))*vec2(0.62, 1.05)) - 0.5;
  float sil = min(min(head, bun), min(neck, shoulders));
  float shade = smoothstep(0.06, -0.05, sil);
  vec3 col = mix(interior, interior*0.05, shade*0.96);
  vec2 cell = abs(fract((w*0.5 + 0.5)*2.0) - 0.5)*2.0;
  float frost = smoothstep(0.5, 1.1, max(cell.x, cell.y) + 0.4*fbm(p.xy*9.0) + 0.2*age());
  col = mix(col, vec3(0.75, 0.82, 0.95)*(0.2 + 0.35*uDawn), frost*0.75);
  return col*0.9;
}
vec3 shadeE(vec3 p, vec3 n, vec3 rd, float m, float t){
  vec3 L = sunDir(); vec3 Lc = sunCol();
  float sh = shadowE(p + n*0.02, L);
  float ao = aoE(p, n);
  float dif = max(dot(n, L), 0.0)*sh;
  vec3 skyAmb = mix(vec3(0.04, 0.09, 0.11), vec3(0.14, 0.16, 0.28), uDawn);
  vec3 amb = skyAmb*(0.55 + 0.45*n.y)*ao;
  vec3 lw = WIN + vec3(0.0, 0.0, -0.5) - p; float dw = length(lw);
  vec3 warmL = vec3(1.0, 0.5, 0.2)*1.6*max(dot(n, lw/dw), 0.0)/(1.0 + dw*dw*0.5)*(1.0 - 0.6*uDawn);
  vec3 ll = vec3(2.15, 2.0, 9.1) - p; float dl = length(ll);
  warmL += vec3(1.0, 0.58, 0.28)*1.2*max(dot(n, ll/dl), 0.0)/(1.0 + dl*dl*1.0);
  vec3 alb; float spec = 0.0, sss = 0.0;
  if(m < 1.5){
    alb = vec3(0.86, 0.9, 0.97); spec = 0.2; sss = 1.0;
    float gl = step(0.993, hash(floor(p.xz*120.0)))*pow(max(dot(reflect(rd, n), L), 0.0), 3.0);
    float gl2 = step(0.996, hash(floor(p.xz*120.0) + 5.0))*pow(max(dot(reflect(rd, n), normalize(lw)), 0.0), 3.0);
    alb += (gl*Lc*(1.0 - 0.75*uDawn) + gl2*vec3(1.0, 0.6, 0.3))*25.0*(1.0 - 0.5*smoothstep(10.0, 30.0, t));
  }
  else if(m < 2.5){ alb = vec3(0.17, 0.095, 0.05)*(0.65 + 0.7*fbm3(p*vec3(2.0, 0.4, 2.0)))*(0.85 + 0.3*vnoise3(p*vec3(1.0, 25.0, 1.0))); }
  else if(m < 3.5){ alb = vec3(0.11, 0.06, 0.035)*(0.8 + 0.3*vnoise3(p*vec3(4.0, 40.0, 4.0))); spec = 0.05; }
  else if(m < 4.5){ return windowGlow(p); }
  else if(m < 5.5){ alb = vec3(0.2, 0.19, 0.18)*(0.55 + 0.8*vnoise3(p*5.0)); }
  else if(m < 6.5){ alb = vec3(0.6, 0.75, 0.9); spec = 1.0; sss = 0.6; }
  else if(m < 7.5){ return vec3(1.0, 0.68, 0.32)*8.0; }
  else if(m < 8.5){
    float snowy = smoothstep(0.2, 0.6, n.y + 0.35*vnoise3(p*2.5));
    alb = mix(vec3(0.02, 0.05, 0.03), vec3(0.75, 0.8, 0.88), snowy);
  }
  else if(m < 9.5){ alb = vec3(0.03, 0.08, 0.035)*(0.6 + 0.8*fbm3(p*25.0)); }
  else if(m < 10.5){ alb = vec3(0.5, 0.02, 0.02); spec = 0.7; }
  else if(m < 21.5){                                  // sleigh lacquer with gold scrolls on the sides
    alb = vec3(0.33, 0.02, 0.025); spec = 0.9;
    vec3 q = gLocal;
    if(abs(abs(q.z) - 0.57) < 0.05){
      float sc = abs(sin(q.x*9.0 + 2.0*sin(q.y*8.0)) - (q.y - 0.6)*3.0);
      if(sc < 0.12 && q.y > 0.4 && q.y < 0.86) alb = vec3(0.65, 0.48, 0.2);
    }
  }
  else if(m < 22.5){ alb = vec3(0.7, 0.52, 0.22); spec = 1.0; }
  else if(m < 23.5){ alb = vec3(0.4, 0.025, 0.03); sss = 0.3; }
  else if(m < 24.5){ alb = vec3(0.24, 0.17, 0.1)*(0.7 + 0.5*vnoise3(p*30.0)); }
  else if(m < 25.5){
    alb = vec3(0.16, 0.095, 0.055)*(0.75 + 0.4*vnoise3(gLocal*40.0));
    alb = mix(alb, vec3(0.42, 0.35, 0.26), smoothstep(-0.2, -0.7, n.y)*0.8);
  }
  else if(m < 26.5){ alb = vec3(0.42, 0.36, 0.28); }
  else if(m < 27.5){ alb = vec3(0.02); spec = 0.4; }
  else if(m < 28.5){ alb = vec3(0.55, 0.5, 0.42); }
  else if(m < 29.5){ alb = vec3(0.25, 0.03, 0.025); spec = 0.3; }
  else if(m < 30.5){ alb = vec3(0.8, 0.6, 0.25); spec = 1.0; }
  else if(m < 32.5){ alb = vec3(0.85, 0.83, 0.8)*(0.75 + 0.35*vnoise3(gLocal*50.0)); sss = 0.5; }
  else if(m < 33.5){ alb = vec3(0.7, 0.42, 0.33); sss = 0.6; }
  else if(m < 34.5){ alb = vec3(0.25, 0.02, 0.03); }
  else if(m < 35.5){ alb = vec3(0.1, 0.35, 0.15); spec = 0.4; }
  else if(m < 36.5){ alb = vec3(0.7, 0.55, 0.2); spec = 0.6; }
  else { alb = vec3(0.15, 0.2, 0.5); spec = 0.4; }
  vec3 col = alb*(Lc*dif + amb + warmL);
  col += alb*Lc*sss*0.25*max(0.0, dot(-n, L) + 0.4)*sh;     // light passing through snow, fur and skin
  vec3 hv = normalize(L - rd);
  col += spec*Lc*pow(max(dot(n, hv), 0.0), 60.0)*sh*0.6;
  col += spec*0.15*skyE(reflect(rd, n))*ao;
  return col;
}
vec3 warpStars(vec2 uv){
  vec3 d = normalize(uSleigh + vec3(1.0, 1.5, 0.0) - uCamPos);
  float z = dot(d, gFwd);
  vec2 vp = vec2(dot(d, gRight), dot(d, gUp))/max(z, 0.05)*gFocal;
  vec2 ndc = (uv - 0.5)*vec2(uRes.x/uRes.y, 1.0);
  vec2 rel = ndc - vp; float r = length(rel); float a = atan(rel.y, rel.x);
  vec3 acc = vec3(0.0);
  for(int L=0; L<3; L++){
    float fl = float(L);
    float n = 60.0 + 45.0*fl;
    float ac = a/6.28318*n; float ci = floor(ac);
    float h = hash(vec2(ci, fl*13.0));
    float ang = abs(fract(ac) - 0.5)/n*6.28318*r;
    float r0 = 0.02 + 0.9*hash(vec2(ci, 7.0 + fl));
    float r1 = r0*(1.0 + uWarp*(2.0 + 2.5*h));
    float along = smoothstep(r0, r0 + 0.01, r)*smoothstep(r1 + 0.03, r1, r);
    float line = smoothstep(0.002 + 0.001*fl, 0.0, ang);
    vec3 tint = mix(vec3(0.6, 0.75, 1.0), vec3(0.6, 1.0, 0.8), hash(vec2(ci, 3.0)));
    acc += tint*line*along*step(0.3, h)*(0.6 + 0.8*h)*(1.0 + 2.0*smoothstep(r1, r0, r));
  }
  return acc*uWarp*3.0;
}
// a puff of powder snow kicked up by the runners
vec3 spray(vec3 ro, vec3 rd, float tmax, vec3 c, float age2, inout float trans){
  if(age2 <= 0.0 || age2 > 4.0) return vec3(0.0);
  float R = 0.8 + 2.2*sqrt(age2);
  vec3 oc = ro - c; float b = dot(oc, rd), cc = dot(oc, oc) - R*R, h = b*b - cc;
  if(h < 0.0) return vec3(0.0);
  float t0 = max(-b - sqrt(h), 0.0), t1 = min(-b + sqrt(h), tmax);
  if(t1 <= t0) return vec3(0.0);
  vec3 acc = vec3(0.0);
  float dt = (t1 - t0)/10.0;
  for(int i=0;i<10;i++){
    vec3 p = ro + rd*(t0 + (float(i) + 0.5)*dt);
    vec3 q = (p - c)/R;
    float den = max(0.0, fbm3(p*1.6 + vec3(0.0, -age2*0.8, 0.0)) - 0.35 - length(q*vec3(1.0, 1.6, 1.0))*0.4)*2.5*exp(-age2*1.1);
    float a = 1.0 - exp(-den*dt*2.0);
    acc += trans*a*(sunCol()*0.6 + vec3(0.15, 0.18, 0.22));
    trans *= 1.0 - a;
  }
  return acc;
}
vec3 smoke(vec3 ro, vec3 rd, float tmax, inout float trans){
  vec3 c = HOUSE + vec3(1.8, 7.5, 0.8);
  vec3 oc = ro - c; vec2 o2 = oc.xz; vec2 d2 = rd.xz;
  float a = dot(d2, d2), b = dot(o2, d2), cc = dot(o2, o2) - 1.6*1.6, h = b*b - a*cc;
  if(h < 0.0) return vec3(0.0);
  float t0 = max((-b - sqrt(h))/a, 0.0), t1 = min((-b + sqrt(h))/a, tmax);
  if(t1 <= t0) return vec3(0.0);
  vec3 acc = vec3(0.0); float dt = (t1 - t0)/10.0;
  for(int i=0;i<10;i++){
    vec3 p = ro + rd*(t0 + (float(i) + 0.5)*dt);
    float y = p.y - (HOUSE.y + 5.9);
    if(y < 0.0 || y > 7.0) continue;
    vec2 axis = HOUSE.xz + vec2(1.8 + y*0.25 + 0.3*sin(y*0.6 + uT*0.3), 0.8);
    float rr = length(p.xz - axis) - (0.2 + y*0.14);
    float den = max(0.0, fbm3(p*1.3 - vec3(0.0, uT*0.6, 0.0)) - 0.45 - max(rr, 0.0)*1.2)*0.35*smoothstep(7.0, 1.0, y)*smoothstep(0.0, 0.6, y)*uDawn;
    float al = 1.0 - exp(-den*dt*2.0);
    acc += trans*al*(sunCol()*0.4 + vec3(0.1, 0.12, 0.15));
    trans *= 1.0 - al;
  }
  return acc;
}
vec4 render(vec3 ro, vec3 rd, vec2 uv){
  float t = 0.0, m = -1.0;
  for(int i=0;i<180;i++){
    vec2 h = mapE(ro + rd*t);
    if(h.x < 0.0006*t){ m = h.y; break; }
    t += h.x*0.85;
    if(t > 150.0) break;
  }
  vec3 col; float depth;
  if(m > 0.0){
    vec3 p = ro + rd*t;
    col = shadeE(p, calcN(p, t), rd, m, t);
    float fog = 1.0 - exp(-t*0.02);
    col = mix(col, mix(vec3(0.02, 0.04, 0.06), vec3(0.3, 0.22, 0.27), uDawn), fog*mix(1.0, 0.6, uDawn));
    depth = t;
  } else { col = skyE(rd); depth = 3000.0; t = 3000.0; }
  float trans = 1.0;
  vec3 add = smoke(ro, rd, t, trans);
  add += spray(ro, rd, t, REST + vec3(0.5, 0.3, 0.0), uSpray, trans);
  add += spray(ro, rd, t, REST + vec3(0.6, 0.3, 0.0), uLand, trans);
  col = col*trans + add;
  if(uSleighOn > 0.5){
    vec3 lp = uSleigh + vec3(0.0, 1.2, 0.0);
    vec3 d = lp - ro; float tl = dot(d, rd);
    if(tl > 0.0 && (m < 0.0 || tl < t + 0.5)){
      float dist = length(d - rd*tl)/tl;
      col += vec3(1.0, 0.75, 0.42)*(0.00003/(dist*dist + 0.00003))*smoothstep(15.0, 60.0, tl)*3.0*(1.0 - uDawn);
    }
  }
  col = mix(col, vec3(0.0), uWarp*0.9);
  if(uWarp > 0.0) col += warpStars(uv);
  return vec4(col, depth);
}
