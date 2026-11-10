// THE WORKSHOP ROOM. Metres. Inside a 6 x 6 m room. Window in the back wall (z = 3),
// door in the left wall (x = -3) with growth marks on its casing, pendulum clock on the right wall,
// a desk with a screen in the back-left corner, an oil lamp on the sill, and her at the window.
const vec3 WINC = vec3(0.9, 1.55, 3.0);
const vec2 WINH = vec2(0.62, 0.6);
const vec3 HER = vec3(0.9, 0.0, 2.45);
const vec3 LAMP = vec3(0.42, 1.08, 2.9);
const vec3 CLOCK = vec3(2.79, 1.92, 0.2);
const float CLOCK_R = 0.18;

float ageR(){ return clamp(uYears/23.0, 0.0, 1.0); }

float sdHer(vec3 p, out float mat){
  vec3 q = p - HER;
  float a = ageR();
  float stoop = a*0.07;
  mat = 31.0;
  float skirt = sdCapT(q, vec3(0.0, 0.05, 0.0), vec3(0.0, 0.95, 0.0), 0.37, 0.2);
  float torso = sdEll(q - vec3(0.0, 1.18, stoop*0.5), vec3(0.2, 0.3, 0.14));
  float body = smin(skirt, torso, 0.12);
  vec3 qa = vec3(abs(q.x), q.y, q.z);
  float arms = sdCap(qa, vec3(0.2, 1.37, stoop*0.6), vec3(0.25, 1.06, 0.06), 0.055);
  arms = min(arms, sdCap(qa, vec3(0.25, 1.06, 0.06), vec3(0.09, 0.9, 0.17), 0.048));
  body = smin(body, arms, 0.05);
  float shawl = sdEll(q - vec3(0.0, 1.32, stoop*0.6), vec3(0.27, 0.19, 0.18));
  shawl = max(shawl, -(q.y - 1.12));
  vec3 hc = vec3(0.0, 1.64 - stoop*0.6, stoop*1.5);
  float neck = sdCap(q, vec3(0.0, 1.42, stoop*0.6), hc - vec3(0.0, 0.08, 0.0), 0.05);
  float head = length(q - hc) - 0.102;
  float hair = length(q - hc - vec3(0.0, 0.016, -0.014)) - 0.112;
  hair = min(hair, length(q - hc - vec3(0.0, 0.075, -0.085)) - 0.062);   // the bun
  hair = max(hair, q.z - hc.z - 0.03);                                   // leave the face open
  float d = body;
  if(shawl < d){ d = shawl; mat = 32.0; }
  float skin = min(neck, head);
  if(skin < d){ d = skin; mat = 33.0; }
  if(hair < d){ d = hair; mat = 34.0; }
  return d;
}

vec2 mapR(vec3 p){
  // shell: walls, floor, ceiling, with the window and door cut out
  float shell = max(sdBox(p - vec3(0.0, 1.35, 0.0), vec3(3.3, 1.65, 3.3)), -sdBox(p - vec3(0.0, 1.35, 0.0), vec3(3.0, 1.35, 3.0)));
  shell = max(shell, -sdBox(p - WINC, vec3(WINH, 0.5)));
  shell = max(shell, -sdBox(p - vec3(-3.1, 1.05, 0.6), vec3(0.5, 1.05, 0.5)));
  vec2 res = vec2(shell, 1.0);
  // ceiling beams
  float bz = mod(p.z + 0.4, 1.2) - 0.6;
  res = un(res, vec2(max(sdBox(vec3(p.x, p.y - 2.62, bz), vec3(3.0, 0.09, 0.08)), abs(p.z) - 3.0), 2.0));
  // window: mullions, sill
  vec3 w = p - WINC;
  float mull = min(sdBox(w - vec3(0.0, 0.0, 0.05), vec3(0.025, WINH.y, 0.025)), sdBox(w - vec3(0.0, 0.0, 0.05), vec3(WINH.x, 0.025, 0.025)));
  mull = min(mull, sdBox(w - vec3(0.0, -WINH.y - 0.03, -0.06), vec3(WINH.x + 0.1, 0.03, 0.12)));
  res = un(res, vec2(mull, 2.0));
  // door casing; the marks are on the board at z in [1.10, 1.22]
  float cas = sdBox(p - vec3(-2.985, 1.1, 1.16), vec3(0.025, 1.12, 0.06));
  cas = min(cas, sdBox(p - vec3(-2.985, 1.1, 0.04), vec3(0.025, 1.12, 0.06)));
  cas = min(cas, sdBox(p - vec3(-2.985, 2.16, 0.6), vec3(0.025, 0.06, 0.62)));
  res = un(res, vec2(cas, 3.0));
  // pendulum clock
  float ck = sdRBox(p - vec3(2.9, 1.5, 0.2), vec3(0.11, 0.66, 0.25), 0.02);
  ck = min(ck, sdRBox(p - vec3(2.88, 2.2, 0.2), vec3(0.13, 0.06, 0.29), 0.02));
  res = un(res, vec2(ck, 4.0));
  // desk, monitor
  float desk = sdBox(p - vec3(-1.9, 0.76, 2.35), vec3(0.75, 0.025, 0.42));
  vec3 lq = vec3(abs(p.x + 1.9) - 0.68, p.y - 0.37, abs(p.z - 2.35) - 0.36);
  desk = min(desk, sdBox(lq, vec3(0.03, 0.37, 0.03)));
  res = un(res, vec2(desk, 2.0));
  float mon = sdRBox(p - vec3(-1.9, 1.17, 2.52), vec3(0.36, 0.23, 0.025), 0.01);
  mon = min(mon, sdBox(p - vec3(-1.9, 0.86, 2.55), vec3(0.04, 0.1, 0.03)));
  res = un(res, vec2(mon, 5.0));
  // oil lamp on the sill
  float lamp = sdCapT(p, LAMP - vec3(0.0, 0.08, 0.0), LAMP + vec3(0.0, 0.02, 0.0), 0.06, 0.035);
  lamp = min(lamp, sdCapT(p, LAMP + vec3(0.0, 0.04, 0.0), LAMP + vec3(0.0, 0.2, 0.0), 0.045, 0.03));
  res = un(res, vec2(lamp, 6.0));
  res = un(res, vec2(length((p - LAMP - vec3(0.0, 0.1, 0.0))*vec3(1.0, 0.6, 1.0)) - 0.012, 7.0));
  // a chair by the desk
  float ch = sdBox(p - vec3(-1.6, 0.45, 1.75), vec3(0.22, 0.025, 0.22));
  ch = min(ch, sdBox(p - vec3(-1.6, 0.75, 1.55), vec3(0.22, 0.3, 0.02)));
  vec3 cq = vec3(abs(p.x + 1.6) - 0.19, p.y - 0.22, abs(p.z - 1.75) - 0.19);
  ch = min(ch, sdBox(cq, vec3(0.02, 0.22, 0.02)));
  res = un(res, vec2(ch, 2.0));
  float hm;
  float hd = sdHer(p, hm);
  res = un(res, vec2(hd, hm));
  return res;
}

vec3 calcN(vec3 p){
  vec2 e = vec2(0.0015, 0.0);
  return normalize(vec3(mapR(p+e.xyy).x - mapR(p-e.xyy).x, mapR(p+e.yxy).x - mapR(p-e.yxy).x, mapR(p+e.yyx).x - mapR(p-e.yyx).x));
}
float shadowR(vec3 ro, vec3 rd, float maxt){
  float res = 1.0, t = 0.02;
  for(int i=0;i<24;i++){
    float h = mapR(ro + rd*t).x;
    res = min(res, 10.0*h/t);
    t += clamp(h, 0.02, 0.4);
    if(res < 0.02 || t > maxt) break;
  }
  return clamp(res, 0.0, 1.0);
}
float aoR(vec3 p, vec3 n){
  float occ = 0.0, sca = 1.0;
  for(int i=0;i<4;i++){ float h = 0.03 + 0.12*float(i); occ += (h - mapR(p + n*h).x)*sca; sca *= 0.7; }
  return clamp(1.0 - 1.5*occ, 0.0, 1.0);
}

vec3 sunR(){ float el = 0.2; return normalize(vec3(sin(uDayAz)*cos(el), sin(el), cos(uDayAz)*cos(el))); }
vec3 skyOut(){ return mix(vec3(0.03, 0.05, 0.11), vec3(0.85, 0.9, 1.05)*1.3, uDayAmt) + vec3(1.0, 0.55, 0.4)*uDawn*0.6; }

// does the ray from p toward the sun pass through the window glass (and miss the mullions)?
float throughWindow(vec3 p, vec3 L){
  if(L.z <= 0.01) return 0.0;
  float t = (WINC.z + 0.05 - p.z)/L.z;
  if(t < 0.0) return 0.0;
  vec2 w = (p + L*t).xy - WINC.xy;
  float inside = step(abs(w.x), WINH.x)*step(abs(w.y), WINH.y);
  float bars = step(0.025, abs(w.x))*step(0.025, abs(w.y));
  return inside*bars;
}

float marksTex(vec3 p){
  vec2 tuv = vec2((p.z - 1.10)/0.12, 1.0 - p.y/2.2);
  return texture2D(uTex1, tuv).r;
}

vec3 clockFace(vec3 p, vec3 base){
  vec2 d = vec2(-(p.z - CLOCK.z), p.y - CLOCK.y);
  float r = length(d);
  vec3 col = base;
  if(r < CLOCK_R){
    vec2 tuv = vec2(0.5 + d.x/(2.0*CLOCK_R), 0.5 - d.y/(2.0*CLOCK_R));
    col = texture2D(uTex0, tuv).rgb*0.9;
    float phi = atan(d.x, d.y);
    // hands with motion blur: each smears over the angle it sweeps in a 1/48 s shutter
    float spinM = 6.28318*(0.25 + 5.0*uTimelapse);
    float spinH = spinM/12.0;
    float aM = uT*spinM, aH = uT*spinH + 1.3;
    for(int k=0;k<2;k++){
      float a = k == 0 ? aM : aH;
      float sm = (k == 0 ? spinM : spinH)/48.0;
      float len = k == 0 ? 0.15 : 0.1;
      float wa = (k == 0 ? 0.006 : 0.01)/max(r, 0.01);
      float dd = mod(a - phi + 3.14159, 6.28318) - 3.14159;     // how far behind the hand this point is
      float cov = smoothstep(-wa - 0.01, -wa, dd)*smoothstep(sm + wa + 0.01, sm + wa, dd);
      cov *= (wa*2.0)/(wa*2.0 + sm)*step(r, len);
      col = mix(col, vec3(0.02), clamp(cov*1.2, 0.0, 1.0));
    }
    col = mix(col, vec3(0.02), smoothstep(0.012, 0.008, r));
  }
  // the pendulum, seen through the lower glass, blurred by its own speed
  vec2 pv = vec2(-(p.z - 0.2), p.y - 1.72);
  if(pv.y < 0.0 && pv.y > -0.62 && abs(pv.x) < 0.2){
    float acc = 0.0;
    float w = 6.28318*(0.5 + 6.0*uTimelapse);
    for(int s=0;s<6;s++){
      float ts = uT + float(s)/6.0/48.0;
      float th = 0.22*sin(ts*w);
      vec2 dir = vec2(sin(th), -cos(th));
      float rod = abs(dot(pv, vec2(dir.y, -dir.x)));
      float along = dot(pv, dir);
      float c = smoothstep(0.006, 0.003, rod)*step(0.0, along)*step(along, 0.48);
      c = max(c, smoothstep(0.06, 0.055, length(pv - dir*0.5)));
      acc += c;
    }
    col = mix(col*0.6, vec3(0.7, 0.55, 0.25), acc/6.0);
  }
  return col;
}

vec3 shadeR(vec3 p, vec3 n, vec3 rd, float m){
  vec3 L = sunR();
  float sunVis = throughWindow(p, L);
  float sh = sunVis > 0.0 ? shadowR(p + n*0.01, L, 3.5) : 0.0;
  vec3 sunC = mix(vec3(1.0, 0.9, 0.75), vec3(1.0, 0.62, 0.42), uDawn)*3.0*uDayAmt;
  vec3 direct = sunC*max(dot(n, L), 0.0)*sunVis*sh;
  // the window as an area light
  vec3 lw = WINC - vec3(0.0, 0.0, 0.05) - p; float dw = length(lw); vec3 lwn = lw/dw;
  vec3 skyL = skyOut()*0.9*max(dot(n, lwn), 0.0)*max(dot(-lwn, vec3(0.0, 0.0, -1.0)), 0.0)/(0.6 + dw*dw*0.35);
  // the lamp
  vec3 ll = LAMP + vec3(0.0, 0.1, 0.0) - p; float dl = length(ll);
  vec3 lampL = vec3(1.0, 0.6, 0.28)*0.55*max(dot(n, ll/dl), 0.0)/(0.15 + dl*dl);
  float ao = aoR(p, n);
  vec3 amb = vec3(0.025, 0.022, 0.02) + skyOut()*0.03;
  vec3 alb; float spec = 0.0;
  if(m < 1.5){
    if(p.y < 0.02){ // floor planks
      float pl = floor(p.x/0.18);
      alb = vec3(0.24, 0.14, 0.08)*(0.7 + 0.4*hash1(pl))*(0.8 + 0.3*vnoise(vec2(p.x*40.0, p.z*2.0)));
      alb *= 0.6 + 0.4*smoothstep(0.0, 0.006, abs(fract(p.x/0.18) - 0.5)*0.18 - 0.085);
      spec = 0.15;
    } else if(p.y > 2.68){ alb = vec3(0.28, 0.22, 0.16); }
    else if(p.y < 0.9){ alb = vec3(0.22, 0.13, 0.07)*(0.8 + 0.3*vnoise(vec2(p.x + p.z, p.y*30.0))); }
    else { alb = vec3(0.52, 0.47, 0.39)*(0.88 + 0.15*fbm3(p*4.0)); }
  }
  else if(m < 2.5){ alb = vec3(0.17, 0.10, 0.055)*(0.8 + 0.4*vnoise3(p*vec3(2.0, 30.0, 2.0))); spec = 0.1; }
  else if(m < 3.5){
    alb = vec3(0.62, 0.58, 0.5);
    if(n.x > 0.8 && p.z > 1.10) alb *= 1.0 - 0.85*marksTex(p);     // pencil marks
  }
  else if(m < 4.5){
    alb = vec3(0.16, 0.08, 0.04); spec = 0.4;
    if(n.x < -0.8) alb = clockFace(p, alb);
  }
  else if(m < 5.5){
    alb = vec3(0.02);
    if(n.z < -0.8 && abs(p.x + 1.9) < 0.34 && abs(p.y - 1.17) < 0.21){
      vec2 tuv = vec2(0.5 + (p.x + 1.9)/0.68, 0.5 - (p.y - 1.17)/0.42);
      return texture2D(uTex2, tuv).rgb*1.2;
    }
  }
  else if(m < 6.5){ alb = vec3(0.5, 0.38, 0.15); spec = 0.8; }
  else if(m < 7.5){ return vec3(1.0, 0.7, 0.3)*12.0; }
  else if(m < 31.5){ alb = vec3(0.14, 0.035, 0.04); }                         // dress
  else if(m < 32.5){ alb = vec3(0.6, 0.55, 0.45)*(0.75 + 0.35*vnoise3(p*60.0)); } // knitted shawl
  else if(m < 33.5){ alb = vec3(0.55, 0.36, 0.28); }                          // skin
  else {                                                                       // hair, brown to silver
    alb = mix(vec3(0.12, 0.07, 0.04), vec3(0.50, 0.50, 0.53), smoothstep(0.25, 0.9, ageR()));
    vec3 hq = p - HER;
    float strands = vnoise(vec2(atan(hq.x, hq.z)*40.0, hq.y*6.0));
    alb *= 0.55 + 0.6*strands;
    spec = 0.6;
  }
  vec3 col = alb*(direct + skyL + lampL + amb)*mix(0.4, 1.0, ao);
  vec3 h = normalize(L - rd);
  col += spec*sunC*pow(max(dot(n, h), 0.0), 40.0)*sunVis*sh*0.3;
  // rim light from the window for her hair and shoulders
  if(m > 30.5) col += alb*skyOut()*0.5*pow(1.0 - max(dot(-rd, n), 0.0), 3.0)*max(dot(n, vec3(0.0, 0.3, 1.0)), 0.0);
  return col;
}

vec3 outside(vec3 ro, vec3 rd, vec2 uv){
  if(rd.z > 0.0){
    float t = (3.3 - ro.z)/rd.z;
    vec2 w = (ro + rd*t).xy - WINC.xy;
    if(abs(w.x) < WINH.x + 0.3 && abs(w.y) < WINH.y + 0.3){
      vec3 c = skyOut();
      c = mix(c*0.85, c*1.15, smoothstep(-0.2, 0.3, rd.y));
      c += snowfall(uv, uT, 0.8 + 6.0*uTimelapse, 5.0*uTimelapse, 0.4)*(0.2 + 0.8*uDayAmt);
      return c;
    }
  }
  return vec3(0.006, 0.004, 0.003);      // the dark hall beyond the door
}

vec3 render(vec3 ro, vec3 rd, vec2 uv){
  float t = 0.0, m = -1.0;
  for(int i=0;i<120;i++){
    vec2 h = mapR(ro + rd*t);
    if(h.x < 0.0006*t + 0.0002){ m = h.y; break; }
    t += h.x*0.9;
    if(t > 14.0) break;
  }
  vec3 col;
  if(m > 0.0){ vec3 p = ro + rd*t; col = shadeR(p, calcN(p), rd, m); }
  else { col = outside(ro, rd, uv); t = 14.0; }
  // shafts of sun through the window
  vec3 L = sunR();
  float acc = 0.0;
  float tmax = min(t, 8.0);
  float j = hash(gl_FragCoord.xy + uT);
  for(int i=0;i<10;i++){
    float ts = (float(i) + j)/10.0*tmax;
    acc += throughWindow(ro + rd*ts, L);
  }
  vec3 sunC = mix(vec3(1.0, 0.9, 0.75), vec3(1.0, 0.62, 0.42), uDawn)*uDayAmt;
  col += sunC*acc/10.0*tmax*0.035*(0.4 + 0.6*pow(max(dot(rd, L), 0.0), 4.0));
  // dust in the light
  float motes = 0.0;
  vec2 g = uv*vec2(uRes.x/uRes.y, 1.0)*22.0;
  for(int jy=-1;jy<=1;jy++) for(int jx=-1;jx<=1;jx++){
    vec2 c = floor(g) + vec2(float(jx), float(jy));
    float h1 = hash(c), h2 = hash(c+5.3), h3 = hash(c+9.1);
    vec2 pos = c + fract(vec2(h1, h2) + vec2(sin(uT*0.3 + h1*6.0)*0.1, -uT*0.03*(1.0 + h2)));
    motes += smoothstep(0.08, 0.0, length(g - pos))*step(0.7, h3);
  }
  col += motes*sunC*min(acc, 3.0)*0.06;
  return col;
}
