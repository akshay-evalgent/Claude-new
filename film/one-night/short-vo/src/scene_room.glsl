// THE WORKSHOP ROOM. Metres. Window in the back wall (z = 3), door in the left wall with the height
// marks on its casing, pendulum clock on the right wall, desk and screen back-left, Mrs Claus at the window.
const vec3 WINC = vec3(0.9, 1.55, 3.0);
const vec2 WINH = vec2(0.62, 0.6);
const vec3 HER = vec3(0.9, 0.0, 2.45);
const vec3 LAMP = vec3(0.42, 1.08, 2.9);
const vec3 CLOCK = vec3(2.79, 1.92, 0.2);
const float CLOCK_R = 0.18;
float ageR(){ return clamp(uYears/23.0, 0.0, 1.0); }

float sdHer(vec3 p, out float mat){
  vec3 q = p - HER;
  if(length(q - vec3(0.0, 0.9, 0.0)) > 1.3) { mat = 31.0; return length(q - vec3(0.0, 0.9, 0.0)) - 1.1; }
  float st = uStoop;
  mat = 31.0;
  // skirt with soft pleats that deepen toward the hem
  float ang = atan(q.x, q.z);
  float hem = clamp(1.0 - q.y/0.95, 0.0, 1.0);
  float skirt = sdCapT(q, vec3(0.0, 0.03, 0.0), vec3(0.0, 0.95, 0.0), 0.38, 0.2) - 0.025*hem*sin(ang*13.0 + 0.6*sin(ang*3.0));
  float torso = sdEll(q - vec3(0.0, 1.18, st*0.4), vec3(0.19, 0.3, 0.13));
  torso = smin(torso, sdEll(q - vec3(0.0, 1.38, st*0.6), vec3(0.22, 0.12, 0.14)), 0.08);
  float body = smin(skirt, torso, 0.1);
  // arms: her right hand rests on the sill, the left holds the shawl
  float armR = sdCapT(q, vec3(0.2, 1.38, st*0.6), vec3(0.3, 1.1, 0.2), 0.058, 0.05);
  armR = smin(armR, sdCapT(q, vec3(0.3, 1.1, 0.2), vec3(0.25, 0.97, 0.42), 0.05, 0.043), 0.03);
  float armL = sdCapT(q, vec3(-0.2, 1.38, st*0.6), vec3(-0.25, 1.08, 0.1), 0.058, 0.05);
  armL = smin(armL, sdCapT(q, vec3(-0.25, 1.08, 0.1), vec3(-0.06, 1.2, 0.17), 0.05, 0.043), 0.03);
  body = smin(body, min(armR, armL), 0.04);
  // knitted shawl over the shoulders, hanging to a point at the back, with a fringe
  vec3 sq = q - vec3(0.0, 1.3, st*0.6);
  float shawl = sdEll(sq, vec3(0.245, 0.17, 0.175));
  shawl = max(shawl, -sdEll(sq - vec3(0.0, 0.05, 0.0), vec3(0.2, 0.17, 0.14)));
  // the back of the shawl: a triangle laid over the torso, point down
  float torsoB = sdEll(q - vec3(0.0, 1.18, st*0.4), vec3(0.19, 0.3, 0.13));
  float triD = (abs(q.x)*0.46 - (q.y - 0.9)*0.25)/0.523;
  triD = max(triD, q.y - 1.42);
  float back = max(max(abs(torsoB - 0.022) - 0.009, triD), q.z - 0.02 - st*0.5);
  shawl = smin(shawl, back, 0.03);
  float fringe = 1e9;
  if(q.z < 0.0 && q.y < 0.9 && q.y > 0.6){
    float fx = abs(q.x) < 0.07 ? mod(q.x + 0.5, 0.022) - 0.011 : 1.0;
    float tipY = 0.82 - 0.2*(1.0 - smoothstep(0.0, 0.24, abs(q.x)));
    fringe = max(length(vec2(fx, q.z + 0.15 - st*0.3)) - 0.004, max(q.y - 0.93, 0.8 - q.y));
  }
  // apron bow at the small of the back
  vec3 bq = q - vec3(0.0, 0.98, -0.13);
  float bow = min(sdEll(bq - vec3(0.07, 0.0, 0.0), vec3(0.07, 0.04, 0.02)), sdEll(bq + vec3(0.07, 0.0, 0.0), vec3(0.07, 0.04, 0.02)));
  bow = min(bow, sdCap(bq, vec3(0.02, -0.02, 0.0), vec3(0.05, -0.2, -0.01), 0.012));
  bow = min(bow, sdCap(bq, vec3(-0.02, -0.02, 0.0), vec3(-0.06, -0.19, -0.01), 0.012));
  // head turns a little toward us as she speaks
  vec3 hc = vec3(0.0, 1.64 - st*0.6, st*1.2);
  vec3 hq = q - hc; hq.xz = rot(uHeadTurn)*hq.xz;
  float neck = sdCap(q, vec3(0.0, 1.42, st*0.6), hc - vec3(0.0, 0.08, 0.0), 0.048);
  float head = sdEll(hq, vec3(0.095, 0.115, 0.105));
  head = smin(head, sdEll(hq - vec3(0.0, -0.04, 0.085), vec3(0.03, 0.05, 0.03)), 0.02);   // nose and chin
  float ear = sdEll(vec3(abs(hq.x), hq.y, hq.z) - vec3(0.095, 0.0, 0.0), vec3(0.015, 0.03, 0.02));
  head = smin(head, ear, 0.01);
  float hair = sdEll(hq - vec3(0.0, 0.025, -0.015), vec3(0.106, 0.118, 0.112));
  hair = max(hair, hq.z - 0.02 - 0.06*(hq.y - 0.03));
  hair = min(hair, length(hq - vec3(0.0, 0.08, -0.09)) - 0.058);
  float pins = min(length(hq - vec3(0.04, 0.12, -0.08)) - 0.007, length(hq - vec3(-0.035, 0.1, -0.13)) - 0.007);
  float hands = min(length(q - vec3(0.25, 0.95, 0.46)) - 0.045, length(q - vec3(-0.04, 1.2, 0.19)) - 0.04);
  float d = body;
  if(shawl < d){ d = shawl; mat = 32.0; }
  if(fringe < d){ d = fringe; mat = 32.0; }
  if(bow < d){ d = bow; mat = 35.0; }
  float skin = min(min(neck, head), hands);
  if(skin < d){ d = skin; mat = 33.0; }
  if(hair < d){ d = hair; mat = 34.0; }
  if(pins < d){ d = pins; mat = 36.0; }
  return d;
}

vec2 mapR(vec3 p){
  float shell = max(sdBox(p - vec3(0.0, 1.35, 0.0), vec3(3.3, 1.65, 3.3)), -sdBox(p - vec3(0.0, 1.35, 0.0), vec3(3.0, 1.35, 3.0)));
  shell = max(shell, -sdBox(p - WINC, vec3(WINH, 0.5)));
  shell = max(shell, -sdBox(p - vec3(-3.1, 1.05, 0.6), vec3(0.5, 1.05, 0.5)));
  vec2 res = vec2(shell, 1.0);
  float bz = mod(p.z + 0.4, 1.2) - 0.6;
  res = un(res, vec2(max(sdBox(vec3(p.x, p.y - 2.62, bz), vec3(3.0, 0.09, 0.08)), abs(p.z) - 3.0), 2.0));
  // window mullions and sill
  vec3 w = p - WINC;
  float mull = min(sdBox(w - vec3(0.0, 0.0, 0.05), vec3(0.025, WINH.y, 0.025)), sdBox(w - vec3(0.0, 0.0, 0.05), vec3(WINH.x, 0.025, 0.025)));
  mull = min(mull, sdBox(w - vec3(0.0, -WINH.y - 0.03, -0.06), vec3(WINH.x + 0.12, 0.03, 0.13)));
  res = un(res, vec2(mull, 2.0));
  // curtains, gathered at each side of the window
  vec3 cq = vec3(abs(p.x - WINC.x) - 0.82, p.y - 1.55, p.z - 2.9);
  float curtain = sdBox(cq, vec3(0.2, 0.85, 0.03)) - 0.03*sin(cq.x*45.0) ;
  curtain = max(curtain, -0.0);
  res = un(res, vec2(curtain*0.8, 37.0));
  res = un(res, vec2(sdCap(p, vec3(WINC.x - 1.15, 2.45, 2.92), vec3(WINC.x + 1.15, 2.45, 2.92), 0.015), 6.0));
  // door casing (marks are on the board at z in [1.10, 1.22])
  float cas = sdBox(p - vec3(-2.985, 1.1, 1.16), vec3(0.025, 1.12, 0.06));
  cas = min(cas, sdBox(p - vec3(-2.985, 1.1, 0.04), vec3(0.025, 1.12, 0.06)));
  cas = min(cas, sdBox(p - vec3(-2.985, 2.16, 0.6), vec3(0.025, 0.06, 0.62)));
  res = un(res, vec2(cas, 3.0));
  // pendulum clock with a carved crown
  float ck = sdRBox(p - vec3(2.9, 1.5, 0.2), vec3(0.11, 0.66, 0.25), 0.02);
  ck = min(ck, sdRBox(p - vec3(2.88, 2.2, 0.2), vec3(0.13, 0.06, 0.29), 0.02));
  ck = min(ck, sdCyl((p - vec3(2.9, 2.3, 0.2)).yxz, 0.0, 0.0) + 1e9);
  ck = min(ck, max(length((p - vec3(2.88, 2.22, 0.2)).yz) - 0.24, max(abs(p.x - 2.88) - 0.1, 2.22 - p.y)));
  ck = min(ck, sdRBox(p - vec3(2.88, 0.82, 0.2), vec3(0.13, 0.04, 0.28), 0.015));
  res = un(res, vec2(ck, 4.0));
  // desk, monitor, chair
  float desk = sdBox(p - vec3(-1.9, 0.76, 2.35), vec3(0.75, 0.025, 0.42));
  vec3 lq = vec3(abs(p.x + 1.9) - 0.68, p.y - 0.37, abs(p.z - 2.35) - 0.36);
  desk = min(desk, sdBox(lq, vec3(0.03, 0.37, 0.03)));
  res = un(res, vec2(desk, 2.0));
  float mon = sdRBox(p - vec3(-1.9, 1.17, 2.52), vec3(0.36, 0.23, 0.025), 0.01);
  mon = min(mon, sdBox(p - vec3(-1.9, 0.86, 2.55), vec3(0.04, 0.1, 0.03)));
  res = un(res, vec2(mon, 5.0));
  float ch = sdBox(p - vec3(-1.6, 0.45, 1.75), vec3(0.22, 0.025, 0.22));
  ch = min(ch, sdBox(p - vec3(-1.6, 0.75, 1.55), vec3(0.22, 0.3, 0.02)));
  vec3 cqq = vec3(abs(p.x + 1.6) - 0.19, p.y - 0.22, abs(p.z - 1.75) - 0.19);
  ch = min(ch, sdBox(cqq, vec3(0.02, 0.22, 0.02)));
  res = un(res, vec2(ch, 2.0));
  // oil lamp on the sill
  float lamp = sdCapT(p, LAMP - vec3(0.0, 0.08, 0.0), LAMP + vec3(0.0, 0.02, 0.0), 0.06, 0.035);
  lamp = min(lamp, sdCapT(p, LAMP + vec3(0.0, 0.04, 0.0), LAMP + vec3(0.0, 0.2, 0.0), 0.045, 0.03));
  res = un(res, vec2(lamp, 6.0));
  res = un(res, vec2(length((p - LAMP - vec3(0.0, 0.1, 0.0))*vec3(1.0, 0.6, 1.0)) - 0.012, 7.0));
  // a framed picture and a stocking on the left wall, a wreath on the back wall
  res = un(res, vec2(sdBox(p - vec3(-2.97, 1.65, 2.0), vec3(0.03, 0.22, 0.3)), 38.0));
  float sto = sdCapT(p, vec3(-1.0, 1.45, 2.93), vec3(-1.0, 1.15, 2.93), 0.08, 0.075);
  sto = smin(sto, sdEll(p - vec3(-0.92, 1.1, 2.93), vec3(0.12, 0.07, 0.07)), 0.05);
  res = un(res, vec2(sto, 39.0));
  vec3 wq = p - vec3(-0.4, 1.95, 2.96);
  res = un(res, vec2(length(vec2(length(wq.xy) - 0.2, wq.z)) - 0.06 + 0.03*fbm3(p*30.0), 40.0));
  float hm; float hd = sdHer(p, hm);
  res = un(res, vec2(hd, hm));
  return res;
}
vec3 calcN(vec3 p){
  vec2 e = vec2(0.0012, 0.0);
  return normalize(vec3(mapR(p+e.xyy).x - mapR(p-e.xyy).x, mapR(p+e.yxy).x - mapR(p-e.yxy).x, mapR(p+e.yyx).x - mapR(p-e.yyx).x));
}
float shadowR(vec3 ro, vec3 rd, float maxt){
  float res = 1.0, t = 0.02;
  for(int i=0;i<32;i++){
    float h = mapR(ro + rd*t).x;
    res = min(res, 10.0*h/t);
    t += clamp(h, 0.015, 0.35);
    if(res < 0.01 || t > maxt) break;
  }
  return clamp(res, 0.0, 1.0);
}
float aoR(vec3 p, vec3 n){
  float occ = 0.0, s = 1.0;
  for(int i=0;i<5;i++){ float h = 0.02 + 0.1*float(i); occ += (h - mapR(p + n*h).x)*s; s *= 0.7; }
  return clamp(1.0 - 1.6*occ, 0.0, 1.0);
}
vec3 sunR(){ float el = 0.18; return normalize(vec3(sin(uDayAz)*cos(el), sin(el), cos(uDayAz)*cos(el))); }
vec3 skyOut(){ return mix(vec3(0.03, 0.05, 0.1), vec3(0.85, 0.9, 1.05)*1.3, uDayAmt) + vec3(1.0, 0.5, 0.38)*uDawn*0.7; }
float throughWindow(vec3 p, vec3 L){
  if(L.z <= 0.01) return 0.0;
  float t = (WINC.z + 0.05 - p.z)/L.z;
  if(t < 0.0) return 0.0;
  vec2 w = (p + L*t).xy - WINC.xy;
  return step(abs(w.x), WINH.x)*step(abs(w.y), WINH.y)*step(0.025, abs(w.x))*step(0.025, abs(w.y));
}
float marksTex(vec3 p){ return texture(uTex1, vec2((p.z - 1.10)/0.12, 1.0 - p.y/2.2)).r; }
vec3 clockFace(vec3 p, vec3 base){
  vec2 d = vec2(-(p.z - CLOCK.z), p.y - CLOCK.y);
  float r = length(d);
  vec3 col = base;
  if(r < CLOCK_R){
    col = texture(uTex0, vec2(0.5 + d.x/(2.0*CLOCK_R), 0.5 - d.y/(2.0*CLOCK_R))).rgb*0.85;
    float phi = atan(d.x, d.y);
    float spinM = 6.28318*uClockRate, spinH = spinM/12.0;
    for(int k=0;k<2;k++){
      float a = k == 0 ? uT*spinM : uT*spinH + 1.3;
      float len = k == 0 ? 0.15 : 0.1;
      float wa = (k == 0 ? 0.007 : 0.012)/max(r, 0.01);
      float sm = (k == 0 ? spinM : spinH)/48.0/uK;                 // the sweep inside this sub-frame
      float dd = mod(a - phi + 3.14159, 6.28318) - 3.14159;
      float cov = smoothstep(-wa - 0.01, -wa, dd)*smoothstep(sm + wa + 0.01, sm + wa, dd)*step(r, len);
      cov *= (wa*2.0)/(wa*2.0 + sm);
      col = mix(col, vec3(0.015), clamp(cov*1.3, 0.0, 1.0));
    }
    col = mix(col, vec3(0.6, 0.45, 0.2), smoothstep(0.012, 0.008, r));
  }
  vec2 pv = vec2(-(p.z - 0.2), p.y - 1.72);
  if(pv.y < 0.0 && pv.y > -0.62 && abs(pv.x) < 0.2){
    float w = 6.28318*(0.5 + 0.08*uClockRate);
    float th = 0.22*sin(uT*w);
    vec2 dir = vec2(sin(th), -cos(th));
    float rod = abs(dot(pv, vec2(dir.y, -dir.x)));
    float along = dot(pv, dir);
    float c = smoothstep(0.006, 0.003, rod)*step(0.0, along)*step(along, 0.48);
    c = max(c, smoothstep(0.06, 0.055, length(pv - dir*0.5)));
    col = mix(col*0.5, vec3(0.75, 0.58, 0.25), c);
  }
  return col;
}
vec3 shadeR(vec3 p, vec3 n, vec3 rd, float m){
  vec3 L = sunR();
  float sunVis = throughWindow(p, L);
  float sh = sunVis > 0.0 ? shadowR(p + n*0.01, L, 3.5) : 0.0;
  vec3 sunC = mix(vec3(1.0, 0.9, 0.75), vec3(1.0, 0.6, 0.38), uDawn)*4.0*uDayAmt;
  vec3 direct = sunC*max(dot(n, L), 0.0)*sunVis*sh;
  vec3 lw = WINC - vec3(0.0, 0.0, 0.05) - p; float dw = length(lw); vec3 lwn = lw/dw;
  float wsh = shadowR(p + n*0.01, lwn, dw - 0.1)*0.7 + 0.3;
  vec3 skyL = skyOut()*1.1*max(dot(n, lwn), 0.0)*max(dot(-lwn, vec3(0.0, 0.0, -1.0)), 0.0)/(0.5 + dw*dw*0.3)*wsh;
  vec3 ll = LAMP + vec3(0.0, 0.1, 0.0) - p; float dl = length(ll);
  float lsh = shadowR(p + n*0.01, ll/dl, dl - 0.05)*0.8 + 0.2;
  vec3 lampL = vec3(1.0, 0.58, 0.25)*0.7*max(dot(n, ll/dl), 0.0)/(0.1 + dl*dl)*lsh;
  vec3 sp = vec3(-1.9, 1.17, 2.48) - p; float ds = length(sp);
  vec3 scrL = vec3(0.35, 0.55, 0.9)*0.12*max(dot(n, sp/ds), 0.0)/(0.05 + ds*ds);
  float ao = aoR(p, n);
  vec3 amb = (vec3(0.03, 0.024, 0.02) + skyOut()*0.04)*ao;
  vec3 alb; float spec = 0.0, sheen = 0.0;
  if(m < 1.5){
    if(p.y < 0.02){
      float pl = floor(p.x/0.18);
      alb = vec3(0.24, 0.13, 0.07)*(0.7 + 0.4*hash1(pl))*(0.8 + 0.3*vnoise(vec2(p.x*40.0, p.z*2.0)));
      alb *= 0.6 + 0.4*smoothstep(0.0, 0.006, abs(fract(p.x/0.18) - 0.5)*0.18 - 0.085);
      spec = 0.25;
    } else if(p.y > 2.68){ alb = vec3(0.28, 0.22, 0.16); }
    else if(p.y < 0.9){ alb = vec3(0.2, 0.11, 0.06)*(0.8 + 0.3*vnoise(vec2(p.x + p.z, p.y*30.0))); spec = 0.1; }
    else {
      float u = abs(p.x) > 2.99 ? p.z : p.x;
      float stripe = smoothstep(0.45, 0.5, abs(fract(u*5.0) - 0.5));
      alb = mix(vec3(0.5, 0.42, 0.33), vec3(0.42, 0.13, 0.12), stripe*0.35)*(0.9 + 0.12*fbm3(p*4.0));
    }
  }
  else if(m < 2.5){ alb = vec3(0.16, 0.09, 0.05)*(0.8 + 0.4*vnoise3(p*vec3(2.0, 30.0, 2.0))); spec = 0.15; }
  else if(m < 3.5){ alb = vec3(0.6, 0.56, 0.48); if(n.x > 0.8 && p.z > 1.10) alb *= 1.0 - 0.88*marksTex(p); }
  else if(m < 4.5){ alb = vec3(0.15, 0.075, 0.035); spec = 0.5; if(n.x < -0.8) alb = clockFace(p, alb); }
  else if(m < 5.5){
    alb = vec3(0.015); spec = 0.3;
    if(n.z < -0.8 && abs(p.x + 1.9) < 0.34 && abs(p.y - 1.17) < 0.21)
      return texture(uTex2, vec2(0.5 + (p.x + 1.9)/0.68, 0.5 - (p.y - 1.17)/0.42)).rgb*1.6;
  }
  else if(m < 6.5){ alb = vec3(0.55, 0.42, 0.18); spec = 0.9; }
  else if(m < 7.5){ return vec3(1.0, 0.7, 0.3)*25.0; }
  else if(m < 31.5){ alb = vec3(0.16, 0.035, 0.04)*(0.85 + 0.25*vnoise3(p*vec3(60.0, 8.0, 60.0))); sheen = 0.6; }
  else if(m < 32.5){
    vec3 kq = (p - HER)*vec3(90.0, 90.0, 90.0);
    float knit = 0.5 + 0.5*sin(kq.x + 2.0*sin(kq.y*0.5))*sin(kq.y);
    float rows = 0.8 + 0.25*smoothstep(0.3, 0.7, abs(fract((p.y + abs(p.x - HER.x)*0.9)*60.0) - 0.5)*2.0);
    alb = vec3(0.6, 0.53, 0.42)*(0.85 + 0.15*knit)*rows*(0.9 + 0.2*vnoise3(p*30.0));
  }
  else if(m < 33.5){ alb = vec3(0.6, 0.4, 0.31); sheen = 0.3; }
  else if(m < 34.5){
    alb = mix(vec3(0.13, 0.08, 0.05), vec3(0.62, 0.62, 0.65), smoothstep(0.25, 0.9, ageR()));
    vec3 hq = p - HER;
    float strands = vnoise(vec2(atan(hq.x, hq.z)*55.0, hq.y*8.0));
    alb *= 0.5 + 0.7*strands; spec = 0.8;
  }
  else if(m < 35.5){ alb = vec3(0.7, 0.68, 0.62); }
  else if(m < 36.5){ alb = vec3(0.8, 0.6, 0.25); spec = 1.0; }
  else if(m < 37.5){ alb = vec3(0.35, 0.05, 0.05)*(0.8 + 0.3*vnoise3(p*vec3(5.0, 60.0, 5.0))); sheen = 0.4; }
  else if(m < 38.5){
    alb = vec3(0.3, 0.2, 0.08); spec = 0.6;
    if(n.x > 0.8 && abs(p.y - 1.65) < 0.18 && abs(p.z - 2.0) < 0.26)
      alb = texture(uTex3, vec2((p.z - 1.74)/0.52, 1.0 - (p.y - 1.47)/0.36)).rgb*0.8;
  }
  else if(m < 39.5){ alb = mix(vec3(0.5, 0.03, 0.04), vec3(0.85, 0.85, 0.8), step(1.38, p.y)); }
  else { alb = vec3(0.03, 0.09, 0.04)*(0.6 + 0.8*fbm3(p*25.0)); }
  vec3 col = alb*(direct + skyL + lampL + scrL + amb);
  vec3 h = normalize(L - rd);
  col += spec*sunC*pow(max(dot(n, h), 0.0), 40.0)*sunVis*sh*0.3;
  col += spec*vec3(1.0, 0.6, 0.3)*pow(max(dot(reflect(rd, n), ll/dl), 0.0), 30.0)*0.3*lsh/(0.2 + dl*dl);
  float rim = pow(1.0 - max(dot(-rd, n), 0.0), 3.0);
  if(m > 30.5) col += alb*skyOut()*0.9*rim*max(dot(n, vec3(0.0, 0.25, 1.0)), 0.0);
  col += sheen*alb*rim*(skyOut()*0.3 + vec3(0.3, 0.15, 0.08));
  return col;
}
vec3 outside(vec3 ro, vec3 rd, vec2 uv){
  if(rd.z > 0.0){
    float t = (3.3 - ro.z)/rd.z;
    vec2 w = (ro + rd*t).xy - WINC.xy;
    if(abs(w.x) < WINH.x + 0.3 && abs(w.y) < WINH.y + 0.3){
      vec3 c = skyOut()*(0.85 + 0.3*smoothstep(-0.2, 0.3, rd.y));
      c += vec3(0.6, 1.0, 0.7)*0.05*(1.0 - uDayAmt)*smoothstep(0.0, 0.4, rd.y);
      c += snowfall(uv, uT, 0.8, 0.0, 0.4)*(0.15 + 0.6*uDayAmt);
      return c;
    }
  }
  return vec3(0.004, 0.003, 0.002);
}
vec4 render(vec3 ro, vec3 rd, vec2 uv){
  float t = 0.0, m = -1.0;
  for(int i=0;i<160;i++){
    vec2 h = mapR(ro + rd*t);
    if(h.x < 0.0004*t + 0.0002){ m = h.y; break; }
    t += h.x*0.9;
    if(t > 14.0) break;
  }
  vec3 col;
  if(m > 0.0){ vec3 p = ro + rd*t; col = shadeR(p, calcN(p), rd, m); }
  else { col = outside(ro, rd, uv); t = 14.0; }
  vec3 L = sunR(); float acc = 0.0, tmax = min(t, 8.0);
  float j = hash(gl_FragCoord.xy + uT*7.0);
  for(int i=0;i<14;i++){ acc += throughWindow(ro + rd*((float(i) + j)/14.0*tmax), L); }
  vec3 sunC = mix(vec3(1.0, 0.9, 0.75), vec3(1.0, 0.6, 0.38), uDawn)*uDayAmt;
  col += sunC*acc/14.0*tmax*0.05*(0.3 + 0.7*pow(max(dot(rd, L), 0.0), 4.0));
  float motes = 0.0;
  vec2 g = uv*vec2(uRes.x/uRes.y, 1.0)*24.0;
  for(int jy=-1;jy<=1;jy++) for(int jx=-1;jx<=1;jx++){
    vec2 c = floor(g) + vec2(float(jx), float(jy));
    float h1 = hash(c), h2 = hash(c+5.3), h3 = hash(c+9.1);
    vec2 pos = c + fract(vec2(h1, h2) + vec2(sin(uT*0.3 + h1*6.0)*0.1, -uT*0.02*(1.0 + h2)));
    motes += smoothstep(0.07, 0.0, length(g - pos))*step(0.72, h3);
  }
  col += motes*sunC*min(acc, 4.0)*0.08;
  return vec4(col, t);
}
