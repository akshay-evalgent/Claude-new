// A CHILD'S LIVING ROOM, somewhere on the route. Metres. Floor-level camera.
// A gloved hand sets one present down in front of the tree. For him this takes three seconds.
const vec3 TREE = vec3(0.25, 0.0, 2.5);
const vec3 GIFT = vec3(0.0, 0.0, 1.35);
const vec3 WIN2 = vec3(-0.95, 1.35, 3.5);

float bulbDist(vec3 p, out float id){
  vec3 q = p - TREE;
  float k = clamp(floor((q.y - 0.32)/0.16 + 0.5), 0.0, 9.0);
  float y = 0.32 + k*0.16;
  float R = 0.80*(1.0 - (y - 0.2)/1.8) + 0.02;
  float n = 11.0 - k*0.6;
  float a = atan(q.z, q.x)/6.28318*n + k*0.37;
  float c = floor(a + 0.5);
  float ang = (c - k*0.37)/n*6.28318;
  vec3 pos = vec3(cos(ang)*R, y + 0.03*sin(c*2.1), sin(ang)*R);
  id = c*13.0 + k;
  return length(q - pos) - 0.016;
}

vec3 giftPos(){ return GIFT + vec3(0.0, uPresentY, 0.0); }

vec2 mapL(vec3 p){
  vec2 res = vec2(p.y, 1.0);                                        // floor
  res = un(res, vec2(3.5 - p.z, 2.0));                              // back wall
  res = un(res, vec2(p.x + 2.6, 2.0));                              // left wall
  res.x = max(res.x, -sdBox(p - WIN2, vec3(0.5, 0.6, 0.4)));        // window opening
  float sill = sdBox(p - WIN2 - vec3(0.0, -0.63, -0.05), vec3(0.6, 0.03, 0.1));
  sill = min(sill, sdBox(p - WIN2 - vec3(0.0, 0.0, -0.02), vec3(0.02, 0.6, 0.02)));
  sill = min(sill, sdBox(p - WIN2 - vec3(0.0, 0.0, -0.02), vec3(0.5, 0.02, 0.02)));
  res = un(res, vec2(sill, 3.0));
  // the tree: four tiers of needles over a trunk, topped with a star
  vec3 q = p - TREE;
  float tree = 1e9;
  if(length(q.xz) < 1.1 && q.y < 2.3){
    for(int i=0;i<4;i++){
      float fi = float(i);
      float by = 0.22 + fi*0.38, hgt = 0.78, rr = 0.8 - fi*0.16;
      vec3 c = q - vec3(0.0, by, 0.0);
      float cone = max(length(c.xz) - rr*(1.0 - c.y/hgt), max(-c.y, c.y - hgt))*0.75;
      tree = min(tree, cone);
    }
    tree += 0.05*fbm3(p*vec3(14.0, 22.0, 14.0)) - 0.02;
    res = un(res, vec2(tree, 4.0));
    res = un(res, vec2(sdCyl(q - vec3(0.0, 0.12, 0.0), 0.12, 0.05), 5.0));
    res = un(res, vec2(length(q - vec3(0.0, 1.9, 0.0)) - 0.05, 6.0));
    float bid;
    res = un(res, vec2(bulbDist(p, bid), 7.0));
  }
  // the present, turned a little
  vec3 g = p - giftPos() - vec3(0.0, 0.12, 0.0);
  g.xz = rot(0.4)*g.xz;
  float box = sdRBox(g, vec3(0.17, 0.12, 0.14), 0.008);
  res = un(res, vec2(box, 8.0));
  vec3 bw = g - vec3(0.0, 0.14, 0.0);
  float bow = sdTorus(vec3(bw.x - 0.05, bw.z, bw.y)*vec3(1.0, 1.0, 1.0), vec2(0.04, 0.012));
  bow = min(bow, sdTorus(vec3(bw.x + 0.05, bw.z, bw.y), vec2(0.04, 0.012)));
  res = un(res, vec2(bow, 9.0));
  // the hand: gripping the top of the box, lifting away after it lets go
  vec3 hp = g - vec3(0.0, uHandUp, 0.0);
  float palm = sdRBox(hp - vec3(0.0, 0.155, 0.0), vec3(0.085, 0.03, 0.075), 0.025);
  float fing = 1e9;
  for(int i=0;i<4;i++){
    float x = -0.06 + float(i)*0.04;
    fing = min(fing, sdCap(hp, vec3(x, 0.16, -0.08), vec3(x, 0.07 + 0.01*float(i), -0.152), 0.017));
  }
  float thumb = sdCap(hp, vec3(0.07, 0.15, 0.05), vec3(0.09, 0.08, 0.15), 0.02);
  float glove = smin(palm, min(fing, thumb), 0.025);
  glove = smin(glove, sdCap(hp, vec3(0.0, 0.18, 0.0), vec3(0.04, 0.33, -0.06), 0.05), 0.04);
  res = un(res, vec2(glove, 10.0));
  vec3 cq = hp - vec3(0.045, 0.34, -0.065);
  float cuff = sdTorus(cq, vec2(0.06, 0.035)) - 0.008*vnoise3(hp*90.0);
  res = un(res, vec2(cuff, 11.0));
  float sleeve = sdCapT(hp, vec3(0.05, 0.36, -0.07), vec3(0.3, 1.7, -0.7), 0.075, 0.12);
  res = un(res, vec2(sleeve, 12.0));
  return res;
}

vec3 calcN(vec3 p){
  vec2 e = vec2(0.0012, 0.0);
  return normalize(vec3(mapL(p+e.xyy).x - mapL(p-e.xyy).x, mapL(p+e.yxy).x - mapL(p-e.yxy).x, mapL(p+e.yyx).x - mapL(p-e.yyx).x));
}
float shadowL(vec3 ro, vec3 rd, float maxt){
  float res = 1.0, t = 0.02;
  for(int i=0;i<20;i++){
    float h = mapL(ro + rd*t).x;
    res = min(res, 8.0*h/t);
    t += clamp(h, 0.02, 0.3);
    if(res < 0.02 || t > maxt) break;
  }
  return clamp(res, 0.0, 1.0);
}

vec3 bulbColor(float id){
  float h = hash1(id);
  vec3 c = h < 0.6 ? vec3(1.0, 0.72, 0.38) : (h < 0.8 ? vec3(1.0, 0.35, 0.25) : vec3(0.5, 0.85, 0.55));
  float tw = 0.75 + 0.25*sin(uT*mix(1.6, 0.15, uSlow) + id*3.7);
  return c*tw;
}

vec3 shadeL(vec3 p, vec3 n, vec3 rd, float m){
  vec3 treeL = TREE + vec3(0.0, 0.9, 0.0) - p; float dt = length(treeL);
  float flick = 0.85 + 0.15*sin(uT*mix(7.0, 0.6, uSlow)) * sin(uT*mix(3.1, 0.3, uSlow) + 1.0);
  vec3 fireP = vec3(-2.2, 0.45, 1.0) - p; float df = length(fireP);
  float sf = shadowL(p + n*0.01, fireP/df, df);
  vec3 lt = vec3(1.0, 0.68, 0.38)*0.5*max(dot(n, treeL/dt), 0.0)/(0.2 + dt*dt);
  vec3 lf = vec3(1.0, 0.45, 0.18)*1.6*flick*max(dot(n, fireP/df), 0.0)*sf/(0.5 + df*df*0.5);
  vec3 lm = vec3(0.35, 0.45, 0.8)*0.25*max(dot(n, normalize(WIN2 - p)), 0.0);
  vec3 amb = vec3(0.02, 0.015, 0.012);
  vec3 alb; float spec = 0.0; float sheen = 0.0;
  if(m < 1.5){
    float pl = floor(p.x/0.16);
    alb = vec3(0.22, 0.12, 0.06)*(0.7 + 0.4*hash1(pl))*(0.85 + 0.25*vnoise(vec2(p.x*50.0, p.z*3.0)));
    alb *= 0.6 + 0.4*smoothstep(0.0, 0.005, abs(fract(p.x/0.16) - 0.5)*0.16 - 0.075);
    float rug = length((p.xz - vec2(0.1, 1.3))*vec2(1.0, 1.4));
    if(rug < 1.1){ alb = mix(vec3(0.20, 0.04, 0.035), vec3(0.28, 0.2, 0.12), smoothstep(0.4, 0.6, fract(rug*3.0))*smoothstep(1.1, 0.9, rug))*0.6; }
    spec = 0.2;
  }
  else if(m < 2.5){ alb = vec3(0.16, 0.13, 0.11)*(0.85 + 0.2*fbm3(p*3.0)); }
  else if(m < 3.5){ alb = vec3(0.35, 0.3, 0.25); }
  else if(m < 4.5){ alb = vec3(0.02, 0.07, 0.035)*(0.6 + 0.8*fbm3(p*30.0)); }
  else if(m < 5.5){ alb = vec3(0.12, 0.07, 0.04); }
  else if(m < 6.5){ return vec3(1.0, 0.8, 0.4)*2.5; }
  else if(m < 7.5){ float id; bulbDist(p, id); return bulbColor(id)*6.0; }
  else if(m < 8.5){
    vec3 g = p - giftPos() - vec3(0.0, 0.12, 0.0); g.xz = rot(0.4)*g.xz;
    alb = vec3(0.45, 0.03, 0.04);
    float stripes = smoothstep(0.35, 0.45, abs(fract((g.x + g.y + g.z)*14.0) - 0.5));
    alb = mix(alb, vec3(0.32, 0.02, 0.03), stripes*0.5);
    float rib = min(abs(g.x), abs(g.z));
    if(rib < 0.018){ alb = vec3(0.7, 0.52, 0.18); spec = 0.9; }
    spec = max(spec, 0.25);
  }
  else if(m < 9.5){ alb = vec3(0.7, 0.52, 0.18); spec = 0.9; }
  else if(m < 10.5){ alb = vec3(0.015); spec = 0.5; }
  else if(m < 11.5){ alb = vec3(0.75, 0.73, 0.7)*(0.7 + 0.4*vnoise3(p*120.0)); }
  else { alb = vec3(0.32, 0.02, 0.03); sheen = 1.0; }
  vec3 col = alb*(lt + lf + lm + amb);
  vec3 r = reflect(rd, n);
  col += spec*(vec3(1.0, 0.68, 0.38)*pow(max(dot(r, treeL/dt), 0.0), 30.0)*0.6 + vec3(1.0, 0.5, 0.2)*pow(max(dot(r, fireP/df), 0.0), 30.0)*sf);
  col += sheen*vec3(0.8, 0.2, 0.2)*pow(1.0 - max(dot(-rd, n), 0.0), 3.0)*0.25;
  return col;
}

vec3 render(vec3 ro, vec3 rd, vec2 uv){
  float t = 0.0, m = -1.0;
  gGlow = 0.0;
  for(int i=0;i<130;i++){
    vec3 p = ro + rd*t;
    vec2 h = mapL(p);
    float id; float bd = bulbDist(p, id);
    gGlow += 0.0006/(bd*bd + 0.0015);
    if(h.x < 0.0004*t + 0.0002){ m = h.y; break; }
    t += h.x*0.85;
    if(t > 12.0) break;
  }
  vec3 col;
  if(m > 0.0){ vec3 p = ro + rd*t; col = shadeL(p, calcN(p), rd, m); }
  else {
    col = vec3(0.03, 0.05, 0.11);
    col += snowfall(uv, uT*mix(1.0, 0.04, uSlow), 0.6, 0.0, 0.5)*vec3(0.3, 0.35, 0.45);
  }
  col += gGlow*vec3(1.0, 0.7, 0.4)*0.05;
  return col;
}
