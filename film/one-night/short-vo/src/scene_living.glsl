// A CHILD'S LIVING ROOM. Metres. Floor-level camera; a gloved hand sets one present down in front of the tree.
const vec3 TREE = vec3(0.25, 0.0, 2.5);
const vec3 GIFT = vec3(0.0, 0.0, 1.35);
const vec3 WIN2 = vec3(-0.95, 1.35, 3.5);
const vec3 PLATE = vec3(-0.75, 0.0, 1.05);

float coneR(float y){ return 0.82*(1.0 - (y - 0.2)/1.8) + 0.03; }
float bulbDist(vec3 p, out float id){
  vec3 q = p - TREE;
  float k = clamp(floor((q.y - 0.32)/0.15 + 0.5), 0.0, 10.0);
  float y = 0.32 + k*0.15;
  float R = coneR(y);
  float n = 12.0 - k*0.7;
  float a = atan(q.z, q.x)/6.28318*n + k*0.37;
  float c = floor(a + 0.5);
  float ang = (c - k*0.37)/n*6.28318;
  vec3 pos = vec3(cos(ang)*R, y + 0.03*sin(c*2.1), sin(ang)*R);
  id = c*13.0 + k;
  return length(q - pos) - 0.014;
}
float baubleDist(vec3 p, out float id){
  vec3 q = p - TREE;
  float k = clamp(floor((q.y - 0.4)/0.27 + 0.5), 0.0, 5.0);
  float y = 0.4 + k*0.27;
  float R = coneR(y) - 0.04;
  float n = 7.0 - k*0.6;
  float a = atan(q.z, q.x)/6.28318*n + k*0.61 + 0.25;
  float c = floor(a + 0.5);
  float ang = (c - k*0.61 - 0.25)/n*6.28318;
  vec3 pos = vec3(cos(ang)*R, y - 0.05, sin(ang)*R);
  id = c*7.0 + k*3.0;
  return length(q - pos) - (0.035 + 0.012*hash1(id));
}
vec3 giftPos(){ return GIFT + vec3(0.0, uPresentY, 0.0); }

vec2 mapL(vec3 p){
  vec2 res = vec2(p.y, 1.0);
  res = un(res, vec2(3.5 - p.z, 2.0));
  res = un(res, vec2(p.x + 2.6, 2.0));
  res.x = max(res.x, -sdBox(p - WIN2, vec3(0.5, 0.6, 0.4)));
  float sill = sdBox(p - WIN2 - vec3(0.0, -0.63, -0.05), vec3(0.6, 0.03, 0.1));
  sill = min(sill, sdBox(p - WIN2 - vec3(0.0, 0.0, -0.02), vec3(0.02, 0.6, 0.02)));
  sill = min(sill, sdBox(p - WIN2 - vec3(0.0, 0.0, -0.02), vec3(0.5, 0.02, 0.02)));
  res = un(res, vec2(sill, 3.0));
  // fireplace on the left wall: a mantel and a glowing opening, stockings hung
  float fp = sdBox(p - vec3(-2.5, 0.55, 1.0), vec3(0.12, 0.55, 0.6));
  fp = max(fp, -sdBox(p - vec3(-2.4, 0.35, 1.0), vec3(0.12, 0.35, 0.38)));
  fp = min(fp, sdBox(p - vec3(-2.45, 1.12, 1.0), vec3(0.18, 0.04, 0.72)));
  res = un(res, vec2(fp, 13.0));
  res = un(res, vec2(sdBox(p - vec3(-2.55, 0.32, 1.0), vec3(0.05, 0.3, 0.36)), 14.0));
  for(int i=0;i<2;i++){
    float z = 0.75 + 0.5*float(i);
    float s = sdCapT(p, vec3(-2.3, 1.07, z), vec3(-2.3, 0.82, z), 0.065, 0.06);
    s = smin(s, sdEll(p - vec3(-2.3, 0.78, z + 0.06), vec3(0.06, 0.06, 0.1)), 0.04);
    res = un(res, vec2(s, 15.0 + float(i)));
  }
  // the tree
  vec3 q = p - TREE;
  if(length(q.xz) < 1.1 && q.y < 2.3){
    float tree = 1e9;
    for(int i=0;i<4;i++){
      float fi = float(i);
      float by = 0.22 + fi*0.38, hgt = 0.78, rr = 0.82 - fi*0.16;
      vec3 c = q - vec3(0.0, by, 0.0);
      float a = atan(c.x, c.z);
      float cone = max(length(c.xz) - rr*(1.0 - c.y/hgt)*(1.0 + 0.06*sin(a*11.0 + fi*2.0)), max(-c.y, c.y - hgt))*0.72;
      tree = min(tree, cone);
    }
    tree += 0.055*fbm3(p*vec3(16.0, 24.0, 16.0)) - 0.02;
    res = un(res, vec2(tree, 4.0));
    res = un(res, vec2(sdCyl(q - vec3(0.0, 0.12, 0.0), 0.12, 0.05), 5.0));
    vec3 sq = q - vec3(0.0, 1.98, 0.0); sq.xz = rot(0.4)*sq.xz;
    res = un(res, vec2(sdStar(vec3(sq.x, sq.y, sq.z), 0.11, 0.42, 0.015), 6.0));
    float bid; res = un(res, vec2(bulbDist(p, bid), 7.0));
    float oid; res = un(res, vec2(baubleDist(p, oid), 17.0));
  }
  // milk and cookies, left for him
  vec3 pq = p - PLATE;
  float plate = sdCyl(pq - vec3(0.0, 0.01, 0.0), 0.008, 0.13);
  res = un(res, vec2(plate, 18.0));
  float cookies = min(sdCyl(pq - vec3(-0.04, 0.025, 0.03), 0.007, 0.045), sdCyl(pq - vec3(0.05, 0.03, -0.02), 0.007, 0.045));
  cookies = max(cookies, -length(pq - vec3(0.09, 0.03, -0.05)) + 0.035);     // one has a bite out of it
  res = un(res, vec2(cookies, 19.0));
  float glass = sdCyl(pq - vec3(0.17, 0.07, 0.12), 0.07, 0.035);
  res = un(res, vec2(glass, 20.0));
  // the present
  vec3 g = p - giftPos() - vec3(0.0, 0.12, 0.0);
  g.xz = rot(0.4)*g.xz;
  res = un(res, vec2(sdRBox(g, vec3(0.17, 0.12, 0.14), 0.008), 8.0));
  vec3 bw = g - vec3(0.0, 0.145, 0.0);
  float bow = length(vec2(length((bw - vec3(0.045, 0.02, 0.0)).xy) - 0.035, bw.z)) - 0.011;
  bow = min(bow, length(vec2(length((bw + vec3(0.045, -0.02, 0.0)).xy) - 0.035, bw.z)) - 0.011);
  bow = min(bow, length(bw) - 0.016);
  bow = min(bow, sdBox(bw - vec3(0.03, -0.005, 0.06), vec3(0.012, 0.004, 0.05)));
  res = un(res, vec2(bow, 9.0));
  res = un(res, vec2(sdBox(g - vec3(0.12, 0.11, -0.142), vec3(0.04, 0.025, 0.002)), 21.0));
  // the hand: knuckled glove gripping the box, fur cuff, red sleeve
  vec3 hp = g - vec3(0.0, uHandUp, 0.0);
  if(length(hp - vec3(0.0, 0.5, 0.0)) < 1.3){
    float palm = sdRBox(hp - vec3(0.0, 0.16, 0.0), vec3(0.085, 0.032, 0.075), 0.028);
    float fing = 1e9;
    for(int i=0;i<4;i++){
      float x = -0.06 + float(i)*0.04;
      vec3 a = vec3(x, 0.17, -0.07), b = vec3(x, 0.155, -0.15), c = vec3(x, 0.07 + 0.01*float(i), -0.157);
      fing = min(fing, smin(sdCapT(hp, a, b, 0.019, 0.017), sdCapT(hp, b, c, 0.017, 0.015), 0.01));
      fing = smin(fing, length(hp - b) - 0.019, 0.008);
    }
    float thumb = smin(sdCapT(hp, vec3(0.07, 0.16, 0.04), vec3(0.1, 0.12, 0.12), 0.022, 0.02), sdCapT(hp, vec3(0.1, 0.12, 0.12), vec3(0.09, 0.07, 0.152), 0.02, 0.017), 0.01);
    float glove = smin(palm, min(fing, thumb), 0.025);
    glove = smin(glove, sdCapT(hp, vec3(0.0, 0.19, 0.0), vec3(0.04, 0.33, -0.06), 0.055, 0.052), 0.04);
    res = un(res, vec2(glove, 10.0));
    vec3 cq = hp - vec3(0.045, 0.35, -0.065);
    res = un(res, vec2(sdTorus(cq, vec2(0.062, 0.038)) - 0.012*fbm3(hp*80.0), 11.0));
    res = un(res, vec2(sdCapT(hp, vec3(0.05, 0.37, -0.07), vec3(0.3, 1.7, -0.7), 0.078, 0.12), 12.0));
  }
  return res;
}
vec3 calcN(vec3 p){
  vec2 e = vec2(0.001, 0.0);
  return normalize(vec3(mapL(p+e.xyy).x - mapL(p-e.xyy).x, mapL(p+e.yxy).x - mapL(p-e.yxy).x, mapL(p+e.yyx).x - mapL(p-e.yyx).x));
}
float shadowL(vec3 ro, vec3 rd, float maxt){
  float res = 1.0, t = 0.015;
  for(int i=0;i<28;i++){
    float h = mapL(ro + rd*t).x;
    res = min(res, 8.0*h/t);
    t += clamp(h, 0.015, 0.25);
    if(res < 0.01 || t > maxt) break;
  }
  return clamp(res, 0.0, 1.0);
}
float aoL(vec3 p, vec3 n){
  float occ = 0.0, s = 1.0;
  for(int i=0;i<5;i++){ float h = 0.015 + 0.06*float(i); occ += (h - mapL(p + n*h).x)*s; s *= 0.7; }
  return clamp(1.0 - 2.0*occ, 0.0, 1.0);
}
vec3 bulbColor(float id){
  float h = hash1(id);
  vec3 c = h < 0.65 ? vec3(1.0, 0.7, 0.36) : (h < 0.82 ? vec3(1.0, 0.32, 0.22) : vec3(0.45, 0.85, 0.5));
  return c*(0.75 + 0.25*sin(uT*mix(1.6, 0.12, uSlow) + id*3.7));
}
vec3 envL(vec3 r){
  vec3 c = vec3(0.03, 0.02, 0.015);
  c += vec3(1.0, 0.68, 0.36)*0.8*smoothstep(0.6, 0.95, dot(r, normalize(TREE + vec3(0.0, 1.0, 0.0) - GIFT)));
  c += vec3(1.0, 0.45, 0.15)*1.2*smoothstep(0.7, 0.95, dot(r, normalize(vec3(-2.4, 0.35, 1.0) - GIFT)));
  c += vec3(0.2, 0.28, 0.5)*0.4*smoothstep(0.7, 0.95, dot(r, normalize(WIN2 - GIFT)));
  return c;
}
vec3 shadeL(vec3 p, vec3 n, vec3 rd, float m){
  vec3 treeL = TREE + vec3(0.0, 0.9, -0.3) - p; float dt = length(treeL);
  float st = shadowL(p + n*0.008, treeL/dt, dt - 0.4)*0.75 + 0.25;
  float flick = 0.85 + 0.15*sin(uT*mix(7.0, 0.5, uSlow))*sin(uT*mix(3.1, 0.25, uSlow) + 1.0);
  vec3 fireP = vec3(-2.35, 0.35, 1.0) - p; float df = length(fireP);
  float sf = shadowL(p + n*0.008, fireP/df, df - 0.1);
  vec3 lt = vec3(1.0, 0.66, 0.34)*0.65*max(dot(n, treeL/dt), 0.0)/(0.15 + dt*dt)*st;
  vec3 lf = vec3(1.0, 0.42, 0.14)*2.2*flick*max(dot(n, fireP/df), 0.0)*sf/(0.4 + df*df*0.6);
  vec3 lm = vec3(0.3, 0.42, 0.8)*0.18*max(dot(n, normalize(WIN2 - p)), 0.0);
  float ao = aoL(p, n);
  vec3 amb = vec3(0.025, 0.017, 0.012)*ao;
  vec3 alb; float spec = 0.0, sheen = 0.0, rough = 30.0;
  vec3 r = reflect(rd, n);
  if(m < 1.5){
    float pl = floor(p.x/0.16);
    alb = vec3(0.2, 0.11, 0.055)*(0.7 + 0.4*hash1(pl))*(0.85 + 0.25*vnoise(vec2(p.x*50.0, p.z*3.0)));
    alb *= 0.6 + 0.4*smoothstep(0.0, 0.005, abs(fract(p.x/0.16) - 0.5)*0.16 - 0.075);
    float rug = length((p.xz - vec2(0.1, 1.3))*vec2(1.0, 1.4));
    if(rug < 1.1){ alb = mix(vec3(0.2, 0.04, 0.035), vec3(0.28, 0.2, 0.12), smoothstep(0.4, 0.6, fract(rug*3.0))*smoothstep(1.1, 0.9, rug))*0.6; }
    else spec = 0.25;
  }
  else if(m < 2.5){ alb = vec3(0.16, 0.12, 0.1)*(0.85 + 0.2*fbm3(p*3.0)); }
  else if(m < 3.5){ alb = vec3(0.33, 0.28, 0.23); }
  else if(m < 4.5){ alb = vec3(0.015, 0.06, 0.03)*(0.5 + 0.9*fbm3(p*35.0)); sheen = 0.3; }
  else if(m < 5.5){ alb = vec3(0.1, 0.06, 0.035); }
  else if(m < 6.5){ return vec3(1.0, 0.78, 0.35)*4.0; }
  else if(m < 7.5){ float id; bulbDist(p, id); return bulbColor(id)*9.0; }
  else if(m < 8.5){
    vec3 g = p - giftPos() - vec3(0.0, 0.12, 0.0); g.xz = rot(0.4)*g.xz;
    alb = vec3(0.42, 0.025, 0.035);
    float stripes = smoothstep(0.35, 0.45, abs(fract((g.x + g.y + g.z)*14.0) - 0.5));
    alb = mix(alb, vec3(0.3, 0.015, 0.025), stripes*0.5);
    float rib = min(abs(g.x), abs(g.z));
    spec = 0.3; rough = 20.0;
    if(rib < 0.018){ alb = vec3(0.75, 0.55, 0.2); spec = 1.0; rough = 50.0; }
  }
  else if(m < 9.5){ alb = vec3(0.75, 0.55, 0.2); spec = 1.0; rough = 50.0; }
  else if(m < 10.5){ alb = vec3(0.012); spec = 0.6; rough = 25.0; }
  else if(m < 11.5){ alb = vec3(0.78, 0.76, 0.72)*(0.6 + 0.5*vnoise3(p*150.0)); sheen = 0.6; }
  else if(m < 12.5){ alb = vec3(0.32, 0.02, 0.03); sheen = 1.0; }
  else if(m < 13.5){ alb = vec3(0.35, 0.3, 0.27)*(0.7 + 0.4*vnoise3(p*8.0)); }
  else if(m < 14.5){ float fl = fbm3(vec3(p.z*8.0, p.y*6.0 - uT*mix(3.0, 0.3, uSlow), 1.0)); return vec3(1.0, 0.4, 0.08)*(2.0 + 6.0*smoothstep(0.4, 0.8, fl))*smoothstep(0.62, 0.0, p.y); }
  else if(m < 15.5){ alb = vec3(0.45, 0.03, 0.04); sheen = 0.5; }
  else if(m < 16.5){ alb = vec3(0.05, 0.25, 0.08); sheen = 0.5; }
  else if(m < 17.5){
    float id; baubleDist(p, id);
    float h = hash1(id + 3.0);
    alb = h < 0.5 ? vec3(0.5, 0.02, 0.03) : (h < 0.8 ? vec3(0.7, 0.5, 0.15) : vec3(0.6, 0.62, 0.65));
    vec3 c = alb*(lt + lf + lm + amb) + alb*envL(r)*1.5 + vec3(1.0)*pow(max(dot(r, normalize(fireP)), 0.0), 80.0)*2.0;
    return c;
  }
  else if(m < 18.5){ alb = vec3(0.75, 0.73, 0.68); spec = 0.5; }
  else if(m < 19.5){ alb = vec3(0.45, 0.26, 0.1)*(0.7 + 0.5*step(0.8, vnoise(p.xz*90.0))); }
  else if(m < 20.5){ alb = vec3(0.85, 0.85, 0.82); spec = 1.0; rough = 80.0; sheen = 0.3; }
  else { alb = vec3(0.8, 0.75, 0.6); vec3 g = p - giftPos() - vec3(0.0, 0.12, 0.0); g.xz = rot(0.4)*g.xz;
    if(abs(n.z) > 0.8) alb = texture(uTex3, vec2((g.x - 0.08)/0.08, 1.0 - (g.y - 0.085)/0.05)).rgb; }
  vec3 col = alb*(lt + lf + lm + amb);
  col += spec*(vec3(1.0, 0.66, 0.34)*pow(max(dot(r, treeL/dt), 0.0), rough)*0.8*st + vec3(1.0, 0.45, 0.15)*pow(max(dot(r, fireP/df), 0.0), rough)*sf*1.5 + envL(r)*0.2);
  col += sheen*alb*pow(1.0 - max(dot(-rd, n), 0.0), 3.0)*vec3(1.2, 0.7, 0.4)*0.6;
  return col;
}
vec4 render(vec3 ro, vec3 rd, vec2 uv){
  float t = 0.0, m = -1.0;
  gGlow = 0.0;
  for(int i=0;i<170;i++){
    vec3 p = ro + rd*t;
    vec2 h = mapL(p);
    float id; float bd = bulbDist(p, id);
    gGlow += 0.0004/(bd*bd + 0.0012);
    if(h.x < 0.0003*t + 0.0002){ m = h.y; break; }
    t += h.x*0.85;
    if(t > 12.0) break;
  }
  vec3 col;
  if(m > 0.0){ vec3 p = ro + rd*t; col = shadeL(p, calcN(p), rd, m); }
  else { col = vec3(0.03, 0.05, 0.11) + snowfall(uv, uT*mix(1.0, 0.03, uSlow), 0.6, 0.0, 0.5)*vec3(0.3, 0.35, 0.45); t = 12.0; }
  col += gGlow*vec3(1.0, 0.68, 0.38)*0.025;
  return vec4(col, t);
}
