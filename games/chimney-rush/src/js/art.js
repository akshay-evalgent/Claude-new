/*
 * Chimney Rush - all drawing code. Every visual is drawn with canvas paths,
 * so there are no image files to license or replace. To reskin with your own
 * images instead, replace the functions in this file (drawSleigh, drawGift,
 * drawHouse...) with ctx.drawImage calls.
 */
(function () {
  "use strict";
  var CR = (window.CR = window.CR || {});
  var TAU = Math.PI * 2;
  var A = (CR.Art = {});
  var FONT = "'Trebuchet MS', 'Arial Rounded MT Bold', 'Segoe UI', Verdana, sans-serif";
  A.FONT = FONT;

  // ---------- helpers ----------
  A.rng = function (seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  A.hash = function (n, seed) {
    var x = Math.sin(n * 127.1 + (seed || 0) * 311.7) * 43758.5453;
    return x - Math.floor(x);
  };

  A.roundRect = function (ctx, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  };

  var shadeCache = {};
  A.shade = function (hex, amt) {
    var key = hex + amt;
    if (shadeCache[key]) return shadeCache[key];
    var h = hex.replace("#", "");
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    var r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    function f(c) {
      var v = amt < 0 ? c * (1 + amt) : c + (255 - c) * amt;
      return Math.max(0, Math.min(255, Math.round(v)));
    }
    var out = "rgb(" + f(r) + "," + f(g) + "," + f(b) + ")";
    shadeCache[key] = out;
    return out;
  };

  A.font = function (size, weight) {
    return (weight || "700") + " " + Math.round(size) + "px " + FONT;
  };

  A.text = function (ctx, str, x, y, size, color, opts) {
    opts = opts || {};
    ctx.font = A.font(size, opts.weight || "800");
    ctx.textAlign = opts.align || "center";
    ctx.textBaseline = opts.baseline || "middle";
    if (opts.stroke) {
      ctx.lineJoin = "round";
      ctx.lineWidth = opts.strokeWidth || Math.max(2, size * 0.16);
      ctx.strokeStyle = opts.stroke;
      ctx.strokeText(str, x, y);
    }
    ctx.fillStyle = color;
    ctx.fillText(str, x, y);
  };

  // ---------- sky ----------
  A.makeStars = function (n, seed) {
    var r = A.rng(seed || 7);
    var out = [];
    for (var i = 0; i < n; i++) {
      out.push({ x: r(), y: Math.pow(r(), 1.4) * 0.75, s: 0.6 + r() * 1.5, ph: r() * TAU, sp: 0.6 + r() * 1.8 });
    }
    return out;
  };

  A.drawSky = function (ctx, L, t, stars) {
    var C = CR.CONFIG.colors;
    var g = ctx.createLinearGradient(0, 0, 0, L.groundY);
    g.addColorStop(0, C.skyTop);
    g.addColorStop(0.62, C.skyMid);
    g.addColorStop(1, C.skyBottom);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, L.W, L.H);

    ctx.fillStyle = "#ffffff";
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      var a = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * s.sp + s.ph));
      ctx.globalAlpha = a;
      var sy = s.y * (L.groundY - 120);
      ctx.fillRect(s.x * L.W - s.s / 2, sy - s.s / 2, s.s, s.s);
    }
    ctx.globalAlpha = 1;

    // moon
    var mx = L.W * 0.72, my = Math.max(70, L.groundY - 455), mr = 30;
    var gl = ctx.createRadialGradient(mx, my, mr * 0.6, mx, my, mr * 3.4);
    gl.addColorStop(0, C.moonGlow);
    gl.addColorStop(1, "rgba(255,236,190,0)");
    ctx.fillStyle = gl;
    ctx.beginPath();
    ctx.arc(mx, my, mr * 3.4, 0, TAU);
    ctx.fill();
    ctx.fillStyle = C.moon;
    ctx.beginPath();
    ctx.arc(mx, my, mr, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "rgba(200, 190, 160, 0.28)";
    ctx.beginPath(); ctx.arc(mx - 9, my - 6, 6, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(mx + 8, my + 7, 4.5, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(mx + 10, my - 10, 3, 0, TAU); ctx.fill();
  };

  // ---------- parallax hills with pine trees ----------
  function hillY(wx, base, amp, seed) {
    return base - amp * (0.55 * Math.sin(wx * 0.0031 + seed) + 0.3 * Math.sin(wx * 0.0077 + seed * 2.1) + 0.15 * Math.sin(wx * 0.0171 + seed * 3.3));
  }

  A.drawPine = function (ctx, x, y, h, color, snow) {
    var w = h * 0.55;
    ctx.fillStyle = color;
    for (var i = 0; i < 3; i++) {
      var ty = y - h + i * h * 0.26;
      var tw = w * (0.55 + i * 0.25);
      ctx.beginPath();
      ctx.moveTo(x, ty);
      ctx.lineTo(x + tw / 2, ty + h * 0.42);
      ctx.lineTo(x - tw / 2, ty + h * 0.42);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillRect(x - h * 0.05, y - h * 0.08, h * 0.1, h * 0.1);
    if (snow) {
      ctx.fillStyle = snow;
      ctx.beginPath();
      ctx.moveTo(x, y - h);
      ctx.lineTo(x + w * 0.16, y - h + h * 0.13);
      ctx.lineTo(x - w * 0.16, y - h + h * 0.13);
      ctx.closePath();
      ctx.fill();
    }
  };

  A.drawHills = function (ctx, L, scroll) {
    var C = CR.CONFIG.colors;
    var layers = [
      { par: 0.1, base: L.groundY - 190, amp: 46, color: C.hillsFar, seed: 1.3, trees: false },
      { par: 0.25, base: L.groundY - 112, amp: 34, color: C.hillsNear, seed: 4.7, trees: true }
    ];
    for (var li = 0; li < layers.length; li++) {
      var Ly = layers[li];
      var off = scroll * Ly.par;
      ctx.fillStyle = Ly.color;
      ctx.beginPath();
      ctx.moveTo(-10, L.groundY + 10);
      for (var x = -10; x <= L.W + 20; x += 20) ctx.lineTo(x, hillY(x + off, Ly.base, Ly.amp, Ly.seed));
      ctx.lineTo(L.W + 20, L.groundY + 10);
      ctx.closePath();
      ctx.fill();
      // snow rim
      ctx.strokeStyle = "rgba(220, 232, 255, 0.13)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (var x2 = -10; x2 <= L.W + 20; x2 += 20) {
        var yy = hillY(x2 + off, Ly.base, Ly.amp, Ly.seed);
        if (x2 === -10) ctx.moveTo(x2, yy); else ctx.lineTo(x2, yy);
      }
      ctx.stroke();
      if (Ly.trees) {
        var spacing = 46;
        var first = Math.floor(off / spacing) - 1;
        for (var i = first; i < first + L.W / spacing + 3; i++) {
          if (A.hash(i, 3) < 0.45) continue;
          var tx = i * spacing - off + A.hash(i, 9) * 20;
          var th = 26 + A.hash(i, 5) * 30;
          A.drawPine(ctx, tx, hillY(tx + off, Ly.base, Ly.amp, Ly.seed) + 6, th, C.trees, "rgba(225,235,255,0.5)");
        }
      }
    }
  };

  // distant town silhouettes
  A.drawTown = function (ctx, L, scroll) {
    var C = CR.CONFIG.colors;
    var par = 0.45, spacing = 64, off = scroll * par;
    var first = Math.floor(off / spacing) - 1;
    var base = L.groundY - 34;
    for (var i = first; i < first + L.W / spacing + 3; i++) {
      var hsh = A.hash(i, 21);
      if (hsh < 0.25) continue;
      var x = i * spacing - off;
      var w = 34 + A.hash(i, 22) * 30;
      var h = 34 + A.hash(i, 23) * 50;
      ctx.fillStyle = C.town;
      ctx.fillRect(x, base - h, w, h + 40);
      ctx.beginPath();
      ctx.moveTo(x - 4, base - h);
      ctx.lineTo(x + w / 2, base - h - 16 - A.hash(i, 24) * 10);
      ctx.lineTo(x + w + 4, base - h);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = C.townWindow;
      for (var r = 0; r < 3; r++) {
        for (var c = 0; c < 2; c++) {
          if (A.hash(i * 7 + r * 3 + c, 25) < 0.55) continue;
          var wx = x + 7 + c * (w - 18);
          var wy = base - h + 10 + r * 14;
          if (wy > base - 6) continue;
          ctx.fillRect(wx, wy, 4, 5);
        }
      }
    }
  };

  // ---------- ground ----------
  A.drawGround = function (ctx, L, scroll) {
    var C = CR.CONFIG.colors;
    var g = ctx.createLinearGradient(0, L.groundY - 8, 0, L.H);
    g.addColorStop(0, C.snow);
    g.addColorStop(0.35, C.snowShade);
    g.addColorStop(1, A.shade(C.snowShade, -0.25));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-10, L.H + 10);
    for (var x = -10; x <= L.W + 20; x += 16) {
      var wx = x + scroll;
      ctx.lineTo(x, L.groundY - 4 - 3 * Math.sin(wx * 0.045) - 2 * Math.sin(wx * 0.13));
    }
    ctx.lineTo(L.W + 20, L.H + 10);
    ctx.closePath();
    ctx.fill();

    // extra foreground in tall (portrait) screens
    var extra = L.H - L.groundY;
    if (extra > 120) {
      var par = 1.25, spacing = 120, off = scroll * par;
      var first = Math.floor(off / spacing) - 1;
      for (var i = first; i < first + L.W / spacing + 3; i++) {
        if (A.hash(i, 41) < 0.4) continue;
        var tx = i * spacing - off + A.hash(i, 42) * 50;
        var ty = L.groundY + extra * (0.45 + A.hash(i, 43) * 0.35);
        A.drawPine(ctx, tx, ty, 60 + A.hash(i, 44) * 50, "#22325f", "rgba(240,246,255,0.85)");
      }
    }
  };

  // ---------- houses ----------
  A.roofYAt = function (h, lx) {
    if (h.roofType === "flat") return h.wallTop - h.roofH;
    var half = h.w / 2 + h.oh;
    var k = 1 - Math.abs(lx - h.w / 2) / half;
    return h.wallTop - h.roofH * Math.max(0, k);
  };

  var LIGHTS = ["#ff4d6d", "#ffd166", "#06d6a0", "#4cc9f0", "#c77dff"];

  A.drawHouse = function (ctx, h, sx, L, t) {
    var C = CR.CONFIG.colors;
    var gy = L.groundY;
    var i, c;

    // wall
    ctx.fillStyle = h.wall;
    ctx.fillRect(sx, h.wallTop, h.w, gy - h.wallTop + 6);
    ctx.fillStyle = "rgba(0,0,0,0.07)";
    for (var ly = h.wallTop + 14; ly < gy; ly += 13) ctx.fillRect(sx, ly, h.w, 1.5);
    ctx.fillStyle = "rgba(0,0,0,0.16)";
    ctx.fillRect(sx + h.w * 0.84, h.wallTop, h.w * 0.16, gy - h.wallTop + 6);
    ctx.fillStyle = "rgba(0,0,0,0.22)";
    ctx.fillRect(sx, h.wallTop, h.w, 7);

    // windows
    for (i = 0; i < h.windows.length; i++) {
      var wd = h.windows[i];
      var wx = sx + wd.x, wy = wd.y;
      if (wd.lit) {
        var glow = ctx.createRadialGradient(wx + wd.w / 2, wy + wd.h / 2, 2, wx + wd.w / 2, wy + wd.h / 2, wd.w * 1.3);
        glow.addColorStop(0, "rgba(255, 210, 110, 0.32)");
        glow.addColorStop(1, "rgba(255, 210, 110, 0)");
        ctx.fillStyle = glow;
        ctx.fillRect(wx - wd.w * 0.8, wy - wd.h * 0.8, wd.w * 2.6, wd.h * 2.6);
      }
      ctx.fillStyle = h.trim;
      ctx.fillRect(wx - 3, wy - 3, wd.w + 6, wd.h + 6);
      ctx.fillStyle = wd.lit ? C.windowLit : C.windowDark;
      ctx.fillRect(wx, wy, wd.w, wd.h);
      if (wd.lit) {
        ctx.fillStyle = "rgba(255,255,255,0.25)";
        ctx.fillRect(wx + 2, wy + 2, wd.w * 0.35, wd.h * 0.3);
      }
      ctx.fillStyle = h.trim;
      ctx.fillRect(wx + wd.w / 2 - 1.5, wy, 3, wd.h);
      ctx.fillRect(wx, wy + wd.h / 2 - 1.5, wd.w, 3);
      ctx.fillStyle = C.snow;
      A.roundRect(ctx, wx - 5, wy + wd.h + 1, wd.w + 10, 5, 2.5);
      ctx.fill();
    }

    // door + wreath
    if (h.door) {
      var dx = sx + h.door.x, dh = h.door.h, dw = h.door.w;
      ctx.fillStyle = h.trim;
      ctx.fillRect(dx - 3, gy - dh - 3, dw + 6, dh + 3);
      ctx.fillStyle = h.door.color;
      ctx.fillRect(dx, gy - dh, dw, dh);
      ctx.fillStyle = "rgba(0,0,0,0.18)";
      ctx.fillRect(dx + 4, gy - dh + 5, dw - 8, dh * 0.4);
      ctx.fillStyle = "#ffd166";
      ctx.beginPath(); ctx.arc(dx + dw - 6, gy - dh * 0.45, 1.8, 0, TAU); ctx.fill();
      ctx.strokeStyle = "#2d6a4f";
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(dx + dw / 2, gy - dh * 0.72, 6, 0, TAU); ctx.stroke();
      ctx.fillStyle = "#e63946";
      ctx.beginPath(); ctx.arc(dx + dw / 2, gy - dh * 0.72 + 6, 2.2, 0, TAU); ctx.fill();
    }

    // chimney bodies (behind roof)
    for (i = 0; i < h.chimneys.length; i++) {
      c = h.chimneys[i];
      var bx = sx + c.ox - c.w / 2;
      var bottom = A.roofYAt(h, c.ox) + 10;
      ctx.fillStyle = c.golden ? "#c8901c" : C.brick;
      ctx.fillRect(bx, c.topY, c.w, bottom - c.topY);
      ctx.fillStyle = "rgba(0,0,0,0.18)";
      for (var by = c.topY + 9, row = 0; by < bottom; by += 9, row++) {
        ctx.fillRect(bx, by, c.w, 1.5);
        var shift = row % 2 ? c.w / 4 : 0;
        for (var bxx = bx + shift; bxx < bx + c.w; bxx += c.w / 2) ctx.fillRect(bxx, by - 9, 1.5, 9);
      }
      ctx.fillStyle = "rgba(0,0,0,0.2)";
      ctx.fillRect(bx + c.w * 0.72, c.topY, c.w * 0.28, bottom - c.topY);
    }

    // roof
    var left = sx - h.oh, right = sx + h.w + h.oh;
    if (h.roofType === "flat") {
      var ry = h.wallTop - h.roofH;
      ctx.fillStyle = h.roof;
      ctx.fillRect(left, ry, right - left, h.roofH);
      ctx.fillStyle = "rgba(0,0,0,0.2)";
      ctx.fillRect(left, ry + h.roofH - 4, right - left, 4);
      ctx.fillStyle = C.snowShade;
      A.roundRect(ctx, left - 2, ry - 6, right - left + 4, 10, 5);
      ctx.fill();
      ctx.fillStyle = C.snow;
      A.roundRect(ctx, left - 2, ry - 8, right - left + 4, 9, 4.5);
      ctx.fill();
    } else {
      var peakX = sx + h.w / 2, peakY = h.wallTop - h.roofH;
      ctx.fillStyle = h.roof;
      ctx.beginPath();
      ctx.moveTo(left, h.wallTop);
      ctx.lineTo(peakX, peakY);
      ctx.lineTo(right, h.wallTop);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "rgba(0,0,0,0.18)";
      ctx.beginPath();
      ctx.moveTo(peakX, peakY);
      ctx.lineTo(right, h.wallTop);
      ctx.lineTo(peakX, h.wallTop);
      ctx.closePath();
      ctx.fill();
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = C.snowShade;
      ctx.lineWidth = 9;
      ctx.beginPath();
      ctx.moveTo(left + 2, h.wallTop - 1);
      ctx.lineTo(peakX, peakY + 1);
      ctx.lineTo(right - 2, h.wallTop - 1);
      ctx.stroke();
      ctx.strokeStyle = C.snow;
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(left + 2, h.wallTop - 3);
      ctx.lineTo(peakX, peakY - 1);
      ctx.lineTo(right - 2, h.wallTop - 3);
      ctx.stroke();
      ctx.lineCap = "butt";
    }
    // icicles under the eaves
    ctx.fillStyle = "rgba(215, 232, 255, 0.85)";
    for (var ix = left + 6, k = 0; ix < right - 4; ix += 11, k++) {
      var il = 3 + ((k * 37 + h.seed) % 7);
      ctx.beginPath();
      ctx.moveTo(ix - 2, h.wallTop);
      ctx.lineTo(ix + 2, h.wallTop);
      ctx.lineTo(ix, h.wallTop + il);
      ctx.closePath();
      ctx.fill();
    }

    // garland lights
    if (h.lights) {
      var n = Math.floor((right - left) / 16);
      for (i = 0; i <= n; i++) {
        var f = i / n;
        var lx = left + (right - left) * f;
        var lyy;
        if (h.roofType === "flat") lyy = h.wallTop - h.roofH + 6 + 3 * Math.sin(f * Math.PI * 6);
        else lyy = h.wallTop + 4 + 3 * Math.sin(f * Math.PI * 8);
        var tw = 0.55 + 0.45 * Math.sin(t * 4 + i * 1.7 + h.seed);
        ctx.globalAlpha = tw;
        ctx.fillStyle = LIGHTS[(i + h.seed) % LIGHTS.length];
        ctx.beginPath();
        ctx.arc(lx, lyy, 2.6, 0, TAU);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // chimney caps (in front of the roof snow)
    for (i = 0; i < h.chimneys.length; i++) {
      c = h.chimneys[i];
      var cx = sx + c.ox;
      var capX = cx - c.w / 2 - 4;
      ctx.fillStyle = c.golden ? C.gold : C.brickDark;
      ctx.fillRect(capX, c.topY - 8, c.w + 8, 10);
      ctx.fillStyle = "rgba(255,255,255,0.12)";
      ctx.fillRect(capX, c.topY - 8, c.w + 8, 2);
      // opening
      var ow = c.w - 10;
      if (c.served) {
        var gg = ctx.createRadialGradient(cx, c.topY - 6, 1, cx, c.topY - 6, ow * 0.9);
        gg.addColorStop(0, "rgba(255, 214, 120, 0.95)");
        gg.addColorStop(1, "rgba(255, 140, 60, 0.15)");
        ctx.fillStyle = gg;
      } else {
        ctx.fillStyle = "#0b0a14";
      }
      ctx.beginPath();
      ctx.ellipse(cx, c.topY - 7, ow / 2, 3.2, 0, 0, TAU);
      ctx.fill();
      // snow tufts on the rim corners
      ctx.fillStyle = C.snow;
      A.roundRect(ctx, capX - 1, c.topY - 11, 9, 5, 2.5); ctx.fill();
      A.roundRect(ctx, capX + c.w, c.topY - 11, 9, 5, 2.5); ctx.fill();
      if (c.served && c.glow > 0) {
        ctx.globalAlpha = Math.min(1, c.glow);
        var rg = ctx.createRadialGradient(cx, c.topY - 10, 2, cx, c.topY - 10, 40);
        rg.addColorStop(0, "rgba(255, 230, 150, 0.6)");
        rg.addColorStop(1, "rgba(255, 230, 150, 0)");
        ctx.fillStyle = rg;
        ctx.fillRect(cx - 40, c.topY - 50, 80, 80);
        ctx.globalAlpha = 1;
      }
      if (c.golden && !c.served && !c.missed) {
        var sy = c.topY - 30 + Math.sin(t * 3 + c.ox) * 4;
        A.drawStar(ctx, cx, sy, 10, 4.5, 5, C.gold, t * 0.8);
        ctx.globalAlpha = 0.35 + 0.25 * Math.sin(t * 6);
        A.drawStar(ctx, cx, sy, 16, 6, 5, "#fff3b0", t * 0.8);
        ctx.globalAlpha = 1;
      }
    }
  };

  // ---------- sleigh + reindeer ----------
  function sleighBodyPath(ctx) {
    ctx.beginPath();
    ctx.moveTo(-46, -27);
    ctx.quadraticCurveTo(-60, -25, -55, -12);
    ctx.quadraticCurveTo(-52, 5, -40, 12);
    ctx.lineTo(26, 12);
    ctx.quadraticCurveTo(45, 10, 45, -6);
    ctx.quadraticCurveTo(45, -19, 34, -19);
    ctx.quadraticCurveTo(27, -19, 28, -11);
    ctx.quadraticCurveTo(25, -6, 16, -6);
    ctx.lineTo(-30, -6);
    ctx.quadraticCurveTo(-37, -6, -38, -15);
    ctx.quadraticCurveTo(-40, -25, -46, -27);
    ctx.closePath();
  }

  A.drawSleigh = function (ctx, x, y, skin, t, scale, tilt, noDeer) {
    ctx.save();
    ctx.translate(x, y);
    if (tilt) ctx.rotate(tilt);
    if (scale && scale !== 1) ctx.scale(scale, scale);
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    if (!noDeer) drawReindeer(ctx, t, skin);

    // sack with gifts
    ctx.fillStyle = "#e63946";
    ctx.fillRect(-49, -40, 11, 11);
    ctx.fillStyle = "#2a9d8f";
    ctx.fillRect(-38, -43, 10, 12);
    ctx.fillStyle = "#ffd166";
    ctx.fillRect(-44.5, -40, 2, 11);
    ctx.fillRect(-34, -43, 2, 12);
    ctx.fillStyle = "#8a5a2b";
    ctx.beginPath();
    ctx.ellipse(-38, -18, 15, 15, -0.2, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "rgba(0,0,0,0.15)";
    ctx.beginPath();
    ctx.ellipse(-34, -14, 9, 10, -0.2, 0, TAU);
    ctx.fill();

    // driver
    ctx.fillStyle = "#c1121f";
    A.roundRect(ctx, -14, -27, 22, 23, 7);
    ctx.fill();
    ctx.fillStyle = "#1d1d1d";
    ctx.fillRect(-14, -15, 22, 3);
    ctx.fillStyle = "#f3c6a5";
    ctx.beginPath(); ctx.arc(-2, -33, 8, 0, TAU); ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath(); ctx.arc(-2, -29, 7.5, 0.05 * Math.PI, 0.95 * Math.PI); ctx.fill();
    ctx.beginPath(); ctx.ellipse(-2, -27, 6, 5, 0, 0, Math.PI); ctx.fill();
    ctx.fillStyle = "rgba(255, 120, 120, 0.7)";
    ctx.beginPath(); ctx.arc(3, -32, 2, 0, TAU); ctx.fill();
    ctx.fillStyle = "#2b1d14";
    ctx.beginPath(); ctx.arc(2, -35, 1.3, 0, TAU); ctx.fill();
    ctx.fillStyle = "#c1121f";
    ctx.beginPath();
    ctx.moveTo(-10, -37);
    ctx.quadraticCurveTo(-5, -51, 10, -48);
    ctx.quadraticCurveTo(4, -44, 6, -38);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    A.roundRect(ctx, -11, -40, 20, 5, 2.5); ctx.fill();
    ctx.beginPath(); ctx.arc(11, -47, 3.3, 0, TAU); ctx.fill();
    ctx.strokeStyle = "#c1121f";
    ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(-1, -19); ctx.lineTo(12, -15); ctx.stroke();
    ctx.fillStyle = "#2d6a4f";
    ctx.beginPath(); ctx.arc(13, -15, 3, 0, TAU); ctx.fill();

    // runners
    ctx.strokeStyle = skin.runner;
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.moveTo(-44, 21);
    ctx.lineTo(30, 21);
    ctx.quadraticCurveTo(49, 21, 51, 8);
    ctx.quadraticCurveTo(52, 1, 46, 2);
    ctx.stroke();
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(-32, 12); ctx.lineTo(-32, 21);
    ctx.moveTo(-2, 12); ctx.lineTo(-2, 21);
    ctx.moveTo(22, 12); ctx.lineTo(22, 21);
    ctx.stroke();

    // body
    sleighBodyPath(ctx);
    ctx.fillStyle = skin.body;
    ctx.fill();
    if (skin.pattern === "stripes" || skin.pattern === "stars") {
      ctx.save();
      sleighBodyPath(ctx);
      ctx.clip();
      if (skin.pattern === "stripes") {
        ctx.strokeStyle = skin.stripe || skin.trim;
        ctx.lineWidth = 6;
        for (var sx2 = -80; sx2 < 70; sx2 += 15) {
          ctx.beginPath(); ctx.moveTo(sx2, 16); ctx.lineTo(sx2 + 26, -30); ctx.stroke();
        }
      } else {
        ctx.fillStyle = "rgba(255,255,255,0.55)";
        var pts = [[-44, -14], [-30, 4], [-12, 2], [6, 6], [22, -2], [36, -10], [-48, 0], [14, -4]];
        for (var p = 0; p < pts.length; p++) A.drawStar(ctx, pts[p][0], pts[p][1], 2.6, 1.1, 4, "rgba(255,255,255,0.6)", 0);
      }
      ctx.restore();
    }
    ctx.fillStyle = "rgba(0,0,0,0.14)";
    ctx.save();
    sleighBodyPath(ctx);
    ctx.clip();
    ctx.fillRect(-60, 5, 120, 10);
    ctx.restore();
    ctx.strokeStyle = skin.trim;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-50, 1);
    ctx.quadraticCurveTo(-10, 4, 40, 1);
    ctx.stroke();
    sleighBodyPath(ctx);
    ctx.strokeStyle = skin.dark;
    ctx.lineWidth = 2;
    ctx.stroke();
    if (skin.sparkle) {
      for (var s = 0; s < 3; s++) {
        var ph = t * 2.2 + s * 2.1;
        var a = Math.max(0, Math.sin(ph));
        if (a <= 0.05) continue;
        ctx.globalAlpha = a;
        A.drawStar(ctx, -40 + s * 34 + Math.sin(ph * 0.7) * 6, -6 + Math.cos(ph) * 10, 5, 1.6, 4, "#fffbe0", 0);
      }
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  };

  function drawReindeer(ctx, t, skin) {
    var bob = Math.sin(t * 9) * 1.5;
    ctx.save();
    ctx.translate(0, bob);
    // harness and reins
    ctx.strokeStyle = skin.trim;
    ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.moveTo(44, -2); ctx.quadraticCurveTo(60, 4, 76, 1); ctx.stroke();
    ctx.strokeStyle = "#3b2a1a";
    ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.moveTo(14, -15); ctx.quadraticCurveTo(55, -16, 99, -7); ctx.stroke();
    // legs
    ctx.strokeStyle = "#5c3a24";
    ctx.lineWidth = 3.2;
    var legs = [[70, 8, 0], [76, 9, 1.4], [93, 8, 2.6], [99, 9, 4.0]];
    for (var i = 0; i < legs.length; i++) {
      var a = Math.sin(t * 11 + legs[i][2]) * 0.65 + 0.35;
      var lx = legs[i][0], ly = legs[i][1];
      var ex = lx - Math.sin(a) * 13, ey = ly + Math.cos(a) * 13;
      ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(ex, ey); ctx.stroke();
      ctx.fillStyle = "#2b1d14";
      ctx.beginPath(); ctx.arc(ex, ey, 1.8, 0, TAU); ctx.fill();
    }
    // tail
    ctx.fillStyle = "#e8d3b5";
    ctx.beginPath(); ctx.ellipse(64, -3, 4, 3, -0.5, 0, TAU); ctx.fill();
    // body
    ctx.fillStyle = "#8b5a3c";
    ctx.beginPath(); ctx.ellipse(84, 2, 20, 10, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = "#c69c6d";
    ctx.beginPath(); ctx.ellipse(86, 6, 13, 4.5, 0, 0, TAU); ctx.fill();
    // neck + head
    ctx.fillStyle = "#8b5a3c";
    ctx.beginPath();
    ctx.moveTo(95, -4); ctx.lineTo(103, -16); ctx.lineTo(111, -12); ctx.lineTo(102, 4);
    ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.ellipse(108, -14, 9, 7, -0.15, 0, TAU); ctx.fill();
    ctx.fillStyle = "#a8754f";
    ctx.beginPath(); ctx.ellipse(115, -11, 6, 4.4, 0, 0, TAU); ctx.fill();
    // collar with bell
    ctx.strokeStyle = "#c1121f";
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(98, -9); ctx.lineTo(104, -2); ctx.stroke();
    ctx.fillStyle = "#ffd166";
    ctx.beginPath(); ctx.arc(102, 1, 2.4, 0, TAU); ctx.fill();
    // nose glow
    ctx.fillStyle = "rgba(255, 70, 70, 0.3)";
    ctx.beginPath(); ctx.arc(120, -12, 6, 0, TAU); ctx.fill();
    ctx.fillStyle = "#ff3b3b";
    ctx.beginPath(); ctx.arc(120, -12, 3, 0, TAU); ctx.fill();
    ctx.fillStyle = "#2b1d14";
    ctx.beginPath(); ctx.arc(107, -16, 1.6, 0, TAU); ctx.fill();
    ctx.fillStyle = "#6e452d";
    ctx.beginPath(); ctx.ellipse(101, -19, 4.5, 2, -0.6, 0, TAU); ctx.fill();
    // antlers
    ctx.strokeStyle = "#e3c08f";
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(104, -20); ctx.lineTo(100, -33);
    ctx.moveTo(101, -28); ctx.lineTo(95, -31);
    ctx.moveTo(100, -33); ctx.lineTo(96, -38);
    ctx.moveTo(108, -21); ctx.lineTo(110, -34);
    ctx.moveTo(109, -28); ctx.lineTo(115, -31);
    ctx.moveTo(110, -34); ctx.lineTo(114, -39);
    ctx.stroke();
    ctx.restore();
  }

  // ---------- gifts ----------
  A.drawGift = function (ctx, x, y, s, rot, color, ribbon) {
    var h = s / 2;
    ctx.save();
    ctx.translate(x, y);
    if (rot) ctx.rotate(rot);
    ctx.fillStyle = color;
    A.roundRect(ctx, -h, -h, s, s, 3);
    ctx.fill();
    ctx.fillStyle = "rgba(0,0,0,0.16)";
    ctx.fillRect(h * 0.35, -h, h * 0.65, s);
    ctx.fillStyle = ribbon;
    ctx.fillRect(-s * 0.1, -h, s * 0.2, s);
    ctx.fillRect(-h, -s * 0.1, s, s * 0.2);
    ctx.beginPath();
    ctx.ellipse(-s * 0.17, -h - s * 0.08, s * 0.17, s * 0.1, -0.5, 0, TAU);
    ctx.ellipse(s * 0.17, -h - s * 0.08, s * 0.17, s * 0.1, 0.5, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, -h, s * 0.08, 0, TAU);
    ctx.fill();
    ctx.restore();
  };

  // ---------- small shapes and icons ----------
  A.drawStar = function (ctx, x, y, r1, r2, n, color, rot) {
    ctx.fillStyle = color;
    ctx.beginPath();
    for (var i = 0; i < n * 2; i++) {
      var r = i % 2 === 0 ? r1 : r2;
      var a = (i / (n * 2)) * TAU - Math.PI / 2 + (rot || 0);
      var px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  };

  A.drawHeart = function (ctx, x, y, s, fill, empty) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s / 24, s / 24);
    ctx.beginPath();
    ctx.moveTo(0, 8);
    ctx.bezierCurveTo(-14, -1, -12, -13, -5, -12);
    ctx.bezierCurveTo(-2, -12, 0, -9, 0, -7);
    ctx.bezierCurveTo(0, -9, 2, -12, 5, -12);
    ctx.bezierCurveTo(12, -13, 14, -1, 0, 8);
    ctx.closePath();
    if (empty) {
      ctx.fillStyle = "rgba(255,255,255,0.12)";
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.45)";
      ctx.lineWidth = 2;
      ctx.stroke();
    } else {
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.beginPath(); ctx.ellipse(-5, -7, 3, 2, -0.5, 0, TAU); ctx.fill();
    }
    ctx.restore();
  };

  A.drawCoin = function (ctx, x, y, r) {
    ctx.fillStyle = "#c98a12";
    ctx.beginPath(); ctx.arc(x, y + r * 0.12, r, 0, TAU); ctx.fill();
    ctx.fillStyle = "#ffcf3f";
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    ctx.strokeStyle = "#e0a516";
    ctx.lineWidth = Math.max(1, r * 0.18);
    ctx.beginPath(); ctx.arc(x, y, r * 0.66, 0, TAU); ctx.stroke();
    A.drawStar(ctx, x, y, r * 0.42, r * 0.18, 5, "#fff0b3", 0);
  };

  A.drawSpeaker = function (ctx, x, y, s, on) {
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.moveTo(x - s * 0.45, y - s * 0.15);
    ctx.lineTo(x - s * 0.2, y - s * 0.15);
    ctx.lineTo(x + s * 0.08, y - s * 0.4);
    ctx.lineTo(x + s * 0.08, y + s * 0.4);
    ctx.lineTo(x - s * 0.2, y + s * 0.15);
    ctx.lineTo(x - s * 0.45, y + s * 0.15);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = s * 0.09;
    ctx.lineCap = "round";
    if (on) {
      ctx.beginPath(); ctx.arc(x + s * 0.1, y, s * 0.22, -0.9, 0.9); ctx.stroke();
      ctx.beginPath(); ctx.arc(x + s * 0.1, y, s * 0.4, -0.9, 0.9); ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(x + s * 0.2, y - s * 0.18); ctx.lineTo(x + s * 0.48, y + s * 0.18);
      ctx.moveTo(x + s * 0.48, y - s * 0.18); ctx.lineTo(x + s * 0.2, y + s * 0.18);
      ctx.stroke();
    }
  };

  A.drawNote = function (ctx, x, y, s, on) {
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = s * 0.1;
    ctx.beginPath(); ctx.ellipse(x - s * 0.22, y + s * 0.26, s * 0.16, s * 0.12, -0.4, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x + s * 0.22, y + s * 0.16, s * 0.16, s * 0.12, -0.4, 0, TAU); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x - s * 0.08, y + s * 0.24); ctx.lineTo(x - s * 0.08, y - s * 0.34);
    ctx.lineTo(x + s * 0.36, y - s * 0.44); ctx.lineTo(x + s * 0.36, y + s * 0.14);
    ctx.stroke();
    if (!on) {
      ctx.strokeStyle = "#ff5a5f";
      ctx.lineWidth = s * 0.11;
      ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(x - s * 0.45, y - s * 0.45); ctx.lineTo(x + s * 0.45, y + s * 0.45); ctx.stroke();
    }
  };

  A.drawPauseIcon = function (ctx, x, y, s) {
    ctx.fillStyle = "#ffffff";
    A.roundRect(ctx, x - s * 0.3, y - s * 0.35, s * 0.2, s * 0.7, s * 0.05); ctx.fill();
    A.roundRect(ctx, x + s * 0.1, y - s * 0.35, s * 0.2, s * 0.7, s * 0.05); ctx.fill();
  };

  A.drawPlayIcon = function (ctx, x, y, s, color) {
    ctx.fillStyle = color || "#ffffff";
    ctx.beginPath();
    ctx.moveTo(x - s * 0.3, y - s * 0.38);
    ctx.lineTo(x + s * 0.4, y);
    ctx.lineTo(x - s * 0.3, y + s * 0.38);
    ctx.closePath();
    ctx.fill();
  };

  // Clapperboard icon: the usual "watch an ad" marker on rewarded buttons.
  A.drawAdBadge = function (ctx, x, y, s, ink) {
    var w = s * 1.8, h = s * 1.3;
    var x0 = x - w / 2, y0 = y - h / 2 + s * 0.18;
    ink = ink || "#ffffff";
    var cut = ink === "#ffffff" ? "rgba(0,0,0,0.7)" : "rgba(255,240,200,0.95)";
    ctx.fillStyle = ink;
    A.roundRect(ctx, x0, y0 + h * 0.3, w, h * 0.7, s * 0.14);
    ctx.fill();
    ctx.save();
    ctx.translate(x0, y0 + h * 0.24);
    ctx.rotate(-0.24);
    ctx.fillStyle = ink;
    ctx.fillRect(0, -h * 0.26, w, h * 0.26);
    ctx.fillStyle = cut;
    for (var i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(w * (0.08 + i * 0.25), 0);
      ctx.lineTo(w * (0.2 + i * 0.25), -h * 0.26);
      ctx.lineTo(w * (0.3 + i * 0.25), -h * 0.26);
      ctx.lineTo(w * (0.18 + i * 0.25), 0);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    ctx.fillStyle = cut;
    ctx.beginPath();
    ctx.moveTo(x - s * 0.2, y0 + h * 0.45);
    ctx.lineTo(x + s * 0.3, y0 + h * 0.65);
    ctx.lineTo(x - s * 0.2, y0 + h * 0.85);
    ctx.closePath();
    ctx.fill();
  };

  A.drawWind = function (ctx, x, y, wind, maxWind, t) {
    var dir = wind >= 0 ? 1 : -1;
    var k = Math.min(1, Math.abs(wind) / Math.max(1, maxWind));
    var len = 26 + 60 * k;
    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = "rgba(10, 16, 44, 0.55)";
    A.roundRect(ctx, x - 64, y - 15, 128, 30, 15); ctx.fill();
    ctx.strokeStyle = "#bfe6ff";
    ctx.fillStyle = "#bfe6ff";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    var x0 = x - (len / 2) * dir + 8 * dir, x1 = x + (len / 2) * dir + 8 * dir;
    var wob = Math.sin(t * 8) * 1.5;
    ctx.beginPath(); ctx.moveTo(x0, y + wob); ctx.lineTo(x1, y + wob); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x1 + 7 * dir, y + wob);
    ctx.lineTo(x1 - 3 * dir, y - 6 + wob);
    ctx.lineTo(x1 - 3 * dir, y + 6 + wob);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    A.text(ctx, CR.CONFIG.text.wind, x - 44 * dir, y, 11, "rgba(191,230,255,0.9)", { weight: "800" });
  };

  // ---------- buttons ----------
  A.drawButton = function (ctx, b, hover, down) {
    var C = CR.CONFIG.colors;
    var cols = b.disabled ? C.buttonDisabled : b.style === "secondary" ? C.buttonSecondary : b.style === "gold" ? C.buttonGold : C.buttonPrimary;
    var sc = down ? 0.95 : hover ? 1.04 : 1;
    var cx = b.x + b.w / 2, cy = b.y + b.h / 2;
    var w = b.w * sc, h = b.h * sc, x = cx - w / 2, y = cy - h / 2;
    var r = b.round ? h / 2 : Math.min(18, h * 0.32);
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    A.roundRect(ctx, x, y + 4, w, h, r); ctx.fill();
    var g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, cols[0]);
    g.addColorStop(1, cols[1]);
    ctx.fillStyle = g;
    A.roundRect(ctx, x, y, w, h, r); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    A.roundRect(ctx, x + 3, y + 3, w - 6, h * 0.42, r * 0.8); ctx.fill();
    var textColor = b.style === "gold" ? "#4a2a00" : "#ffffff";
    if (b.icon && !b.label) {
      if (b.icon === "pause") A.drawPauseIcon(ctx, cx, cy, h * 0.55);
      else if (b.icon === "sound") A.drawSpeaker(ctx, cx, cy, h * 0.55, b.on);
      else if (b.icon === "music") A.drawNote(ctx, cx, cy, h * 0.55, b.on);
      return;
    }
    var size = b.fontSize || Math.min(30, h * 0.42);
    var ly = b.sub ? cy - h * 0.12 : cy + 1;
    var lx = cx;
    if (b.ad) lx += size * 0.6;
    A.text(ctx, b.label, lx, ly, size, b.disabled ? "rgba(255,255,255,0.6)" : textColor, { weight: "900" });
    if (b.ad) {
      ctx.font = A.font(size, "900");
      var tw = ctx.measureText(b.label).width;
      A.drawAdBadge(ctx, lx - tw / 2 - size * 0.9, ly, size * 0.55, textColor);
    }
    if (b.sub) A.text(ctx, b.sub, cx, cy + h * 0.24, Math.max(11, size * 0.45), b.style === "gold" ? "rgba(74,42,0,0.75)" : "rgba(255,255,255,0.8)", { weight: "700" });
  };

  A.drawPanel = function (ctx, x, y, w, h) {
    var C = CR.CONFIG.colors;
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    A.roundRect(ctx, x, y + 6, w, h, 22); ctx.fill();
    ctx.fillStyle = C.panel;
    A.roundRect(ctx, x, y, w, h, 22); ctx.fill();
    ctx.strokeStyle = C.panelEdge;
    ctx.lineWidth = 2;
    A.roundRect(ctx, x + 1, y + 1, w - 2, h - 2, 21); ctx.stroke();
  };

  // ---------- title logo ----------
  A.drawLogo = function (ctx, x, y, size, t, lines) {
    var title = CR.CONFIG.title;
    var rows = lines === 2 ? title.split(" ") : [title];
    var lh = size * 1.02;
    var y0 = y - ((rows.length - 1) * lh) / 2;
    for (var r = 0; r < rows.length; r++) {
      var str = rows[r].toUpperCase();
      var ry = y0 + r * lh;
      ctx.font = A.font(size, "900");
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      var total = ctx.measureText(str).width + (str.length - 1) * size * 0.02;
      var cx = x - total / 2;
      for (var i = 0; i < str.length; i++) {
        var ch = str[i];
        var cw = ctx.measureText(ch).width;
        var wob = Math.sin(t * 2 + i * 0.6 + r) * size * 0.025;
        var ly = ry + wob;
        ctx.lineJoin = "round";
        ctx.lineWidth = size * 0.2;
        ctx.strokeStyle = "#1a0d2e";
        ctx.strokeText(ch, cx, ly + size * 0.06);
        ctx.strokeText(ch, cx, ly);
        var g = ctx.createLinearGradient(0, ly - size * 0.45, 0, ly + size * 0.45);
        g.addColorStop(0, "#fff3b0");
        g.addColorStop(0.45, "#ffcf3f");
        g.addColorStop(1, "#f0782e");
        ctx.fillStyle = g;
        ctx.fillText(ch, cx, ly);
        if (ch !== " ") {
          ctx.fillStyle = "#ffffff";
          var sw = cw * (0.55 + A.hash(i + r * 10, 77) * 0.3);
          A.roundRect(ctx, cx + (cw - sw) / 2, ly - size * 0.47, sw, size * 0.13, size * 0.065);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(cx + cw * (0.3 + A.hash(i, 78) * 0.4), ly - size * 0.35, size * 0.04, 0, TAU);
          ctx.fill();
        }
        cx += cw + size * 0.02;
      }
    }
  };

  // ---------- the Rooftop Rascal (parkour kid) ----------
  // Feet at (x, y), facing right. pose: "run" | "jump" | "bonked".
  // o: { carrying: stolen gifts in the sack, celebrate: >0 while holding up a
  //      stolen gift, rot: spin while tumbling, scale }
  A.drawKid = function (ctx, x, y, pose, t, o) {
    var C = CR.CONFIG.colors;
    o = o || {};
    var carrying = Math.min(o.carrying || 0, 6);
    var hoodie = C.kidHoodie, dark = A.shade(C.kidHoodie, -0.28), skin = C.kidSkin;
    var p = t * 15; // stride phase
    var hipY = -20;
    ctx.save();
    ctx.translate(x, y);
    if (o.scale) ctx.scale(o.scale, o.scale);
    if (pose === "bonked") {
      ctx.translate(0, -22);
      ctx.rotate(o.rot || 0);
      ctx.translate(0, 22);
    }
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (pose === "run") {
      ctx.fillStyle = "rgba(0,0,0,0.2)";
      ctx.beginPath(); ctx.ellipse(1, 1, 12, 2.6, 0, 0, TAU); ctx.fill();
    }

    // legs: thigh then shin, with the knee bending more on the back swing
    function leg(a, bend) {
      var kx = Math.sin(a) * 10, ky = hipY + Math.cos(a) * 10;
      var fx = kx + Math.sin(a - bend) * 10, fy = ky + Math.cos(a - bend) * 10;
      ctx.strokeStyle = C.kidPants;
      ctx.lineWidth = 5.5;
      ctx.beginPath(); ctx.moveTo(0, hipY); ctx.lineTo(kx, ky); ctx.lineTo(fx, fy); ctx.stroke();
      ctx.fillStyle = "#ffffff";
      ctx.beginPath(); ctx.ellipse(fx + 2, fy, 4.3, 2.6, 0, 0, TAU); ctx.fill();
    }
    if (pose === "run") {
      var s1 = Math.sin(p), s2 = Math.sin(p + Math.PI);
      leg(s1 * 0.85, 0.35 + Math.max(0, -s1) * 1.1);
      leg(s2 * 0.85, 0.35 + Math.max(0, -s2) * 1.1);
    } else if (pose === "jump") {
      leg(1.25, 1.95);
      leg(0.7, 1.55);
    } else {
      leg(0.6, 0.3);
      leg(-0.5, 0.2);
    }

    // upper body, leaning into the run
    ctx.save();
    ctx.translate(0, hipY);
    if (pose === "run") ctx.rotate(0.2);

    // sack on the back, bigger with every stolen gift
    var sr = 7 + carrying * 1.4;
    ctx.fillStyle = C.kidSack;
    ctx.beginPath(); ctx.ellipse(-9 - carrying * 0.7, -10, sr * 0.85, sr, -0.3, 0, TAU); ctx.fill();
    if (carrying > 0) {
      var gc = CR.CONFIG.giftColors;
      for (var gi = 0; gi < Math.min(carrying, 3); gi++) {
        ctx.fillStyle = gc[gi % gc.length];
        ctx.fillRect(-15 - carrying * 0.7 + gi * 5, -12 - sr, 6, 6);
      }
    }

    // hoodie
    ctx.fillStyle = dark;
    ctx.beginPath(); ctx.arc(-2, -18, 5.5, 0, TAU); ctx.fill();
    ctx.fillStyle = hoodie;
    A.roundRect(ctx, -7, -18, 14, 20, 5); ctx.fill();
    ctx.fillStyle = dark;
    ctx.fillRect(-7, -1, 14, 3);
    ctx.fillRect(-1, -12, 7, 2);

    // grab glow while airborne: the warning that this is when he steals
    if (pose === "jump") {
      var gl = ctx.createRadialGradient(2, -38, 2, 2, -38, 20);
      gl.addColorStop(0, "rgba(255, 120, 60, 0.55)");
      gl.addColorStop(1, "rgba(255, 120, 60, 0)");
      ctx.fillStyle = gl;
      ctx.beginPath(); ctx.arc(2, -38, 20, 0, TAU); ctx.fill();
    }

    // arms
    function arm(ax, ay) {
      ctx.strokeStyle = hoodie;
      ctx.lineWidth = 4.5;
      ctx.beginPath(); ctx.moveTo(1, -15); ctx.lineTo(ax, ay); ctx.stroke();
      ctx.fillStyle = skin;
      ctx.beginPath(); ctx.arc(ax, ay, 2.7, 0, TAU); ctx.fill();
    }
    if (pose === "run") {
      if (o.celebrate > 0) {
        arm(5, -36);
        arm(-8, -6);
        A.drawGift(ctx, 5, -43, 12, Math.sin(t * 10) * 0.2, "#e63946", "#ffd166");
      } else {
        var sa = Math.sin(p) * 0.95;
        arm(1 + Math.sin(-sa) * 11, -15 + Math.cos(-sa) * 11);
        arm(1 + Math.sin(sa) * 11, -15 + Math.cos(sa) * 11);
      }
    } else if (pose === "jump") {
      arm(-4, -37);
      arm(8, -38);
    } else {
      arm(-11, -21);
      arm(12, -24);
    }

    // head
    ctx.fillStyle = skin;
    ctx.beginPath(); ctx.arc(3, -25, 7.5, 0, TAU); ctx.fill();
    ctx.fillStyle = "rgba(255,120,110,0.55)";
    ctx.beginPath(); ctx.arc(7, -23, 1.8, 0, TAU); ctx.fill();
    if (pose === "bonked") {
      ctx.strokeStyle = "#2b1d14";
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(4.5, -27.5); ctx.lineTo(7.5, -24.5);
      ctx.moveTo(7.5, -27.5); ctx.lineTo(4.5, -24.5);
      ctx.stroke();
    } else {
      ctx.fillStyle = "#2b1d14";
      ctx.beginPath(); ctx.arc(6.5, -26, 1.4, 0, TAU); ctx.fill();
    }
    ctx.strokeStyle = "#7a2e1a";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    if (pose === "jump") ctx.arc(7.2, -21.6, 1.7, 0, TAU);
    else ctx.arc(6, -22.4, 2.6, 0.1 * Math.PI, 0.8 * Math.PI);
    ctx.stroke();
    // beanie with pom-pom
    ctx.fillStyle = C.kidHat;
    ctx.beginPath(); ctx.ellipse(2.5, -29, 8.4, 6.5, -0.1, Math.PI, TAU); ctx.fill();
    ctx.fillStyle = A.shade(C.kidHat, -0.22);
    A.roundRect(ctx, -6, -31, 17, 3.6, 1.8); ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath(); ctx.arc(1, -36.5, 2.9, 0, TAU); ctx.fill();

    if (pose === "bonked") {
      for (var si = 0; si < 3; si++) {
        var ang = t * 7 + (si * TAU) / 3;
        A.drawStar(ctx, 3 + Math.cos(ang) * 12, -36 + Math.sin(ang) * 4, 3.4, 1.4, 5, "#ffd76a", ang);
      }
    }
    ctx.restore();
    ctx.restore();
  };

  // "He's coming" marker shown at the right edge just before the Rascal arrives.
  A.drawKidAlert = function (ctx, x, y, t) {
    var C = CR.CONFIG.colors;
    var s = 1 + Math.sin(t * 12) * 0.1;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.beginPath(); ctx.arc(0, 2, 17, 0, TAU); ctx.fill();
    ctx.fillStyle = C.kidHoodie;
    ctx.beginPath(); ctx.arc(0, 0, 16, 0, TAU); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(14, -7); ctx.lineTo(24, 0); ctx.lineTo(14, 7);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    A.text(ctx, "!", x, y + 1, 22, "#ffffff", { weight: "900" });
  };

  // ---------- snowflakes ----------
  A.drawFlakes = function (ctx, flakes) {
    ctx.fillStyle = "#ffffff";
    for (var i = 0; i < flakes.length; i++) {
      var f = flakes[i];
      ctx.globalAlpha = f.a;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  };
})();
