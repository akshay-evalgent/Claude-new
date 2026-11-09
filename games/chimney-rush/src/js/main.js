/*
 * Chimney Rush - boot, cover-art renderer and test hooks.
 *
 * URL options (for development and store assets, harmless in production):
 *   ?cover=1&title=0   show the cover art (used to export thumbnails)
 *   ?test=1            expose window.__CR for automated tests
 *   ?autoplay=1        let the autopilot play (tests, screenshots)
 *   ?seed=123          deterministic level generation
 */
(function () {
  "use strict";
  var CR = (window.CR = window.CR || {});

  function qs(name) {
    var m = new RegExp("[?&]" + name + "=([^&]*)").exec(window.location.search);
    return m ? decodeURIComponent(m[1]) : null;
  }

  // ---------------------------------------------------------------- cover art
  CR.renderCover = function (cw, ch, withTitle, ss, subtitle) {
    var G = CR.Game, A = CR.Art;
    ss = ss || 2;
    var cv = document.createElement("canvas");
    cv.width = Math.round(cw * ss);
    cv.height = Math.round(ch * ss);
    var ctx = cv.getContext("2d");
    var scale = Math.min(cw / 640, ch / 600);
    var L = { W: cw / scale, H: ch / scale };
    G.layout(L);
    var px = cv.width / L.W;

    var saved = { L: G.L, rnd: G.rnd, state: G.state, houses: G.houses, scroll: G.scroll, count: G.houseCount, next: G.nextHouseX, cap: G.heightCap };
    G.L = L;
    G.rnd = A.rng(2024);
    G.state = "title";
    G.houses = [];
    G.scroll = 0;
    G.houseCount = 0;
    G.nextHouseX = -30;
    var aspect = L.W / L.H;
    var landscape = aspect >= 1.25;
    var square = !landscape && aspect >= 0.85;
    G.heightCap = square ? 0.08 : 0.3;
    G.spawnHouses();
    var houses = G.houses;

    var k, sx, sy, titleSize, titleY, lines;
    if (withTitle) {
      if (landscape) {
        lines = 1; titleSize = Math.min(L.W * 0.092, 104); titleY = L.H * 0.17;
        k = 1.7; sx = L.W * 0.3; sy = L.groundY - 330;
      } else {
        lines = 2; titleSize = square ? Math.min(L.W * 0.13, 86) : Math.min(L.W * 0.17, 112); titleY = L.H * (square ? 0.12 : 0.16);
        k = square ? 1.25 : 1.6; sx = L.W * 0.36; sy = L.groundY - (square ? 312 : 400);
      }
    } else {
      k = landscape ? 1.9 : 1.6; sx = L.W * (landscape ? 0.36 : 0.32); sy = L.groundY - (landscape ? 360 : 380);
    }

    // pick the chimney under the drop line and mark it as just served
    var dropX = sx, target = null, best = 1e9, golden = null;
    for (var i = 0; i < houses.length; i++) {
      var h = houses[i];
      for (var j = 0; j < h.chimneys.length; j++) {
        var c = h.chimneys[j], cx = h.x + c.ox;
        var dd = Math.abs(cx - dropX - 6);
        if (dd < best) { best = dd; target = { h: h, c: c }; }
      }
    }
    if (target) {
      var shift = target.h.x + target.c.ox - (dropX + 6);
      for (i = 0; i < houses.length; i++) houses[i].x -= shift;
      target.c.served = true;
      target.c.glow = 1;
    }
    for (i = 0; i < houses.length; i++) {
      var hh = houses[i];
      if (hh.x > dropX + 140 && hh.chimneys.length && !golden) { golden = hh.chimneys[0]; golden.golden = true; }
    }

    ctx.setTransform(px, 0, 0, px, 0, 0);
    var t = 1.35;
    A.drawSky(ctx, L, t, CR.Art.makeStars(110, 5));
    A.drawHills(ctx, L, 0);
    A.drawTown(ctx, L, 0);
    for (i = 0; i < houses.length; i++) A.drawHouse(ctx, houses[i], houses[i].x, L, t);
    A.drawGround(ctx, L, 0);

    var gs = 24 * Math.min(1.5, k * 0.85);
    if (target) {
      var tc = target.c, tcx = target.h.x + tc.ox;
      A.drawGift(ctx, tcx, tc.topY - 18, gs, 0.15, "#e63946", "#ffd166");
      for (i = 0; i < 9; i++) {
        var a = (i / 9) * Math.PI * 2;
        A.drawStar(ctx, tcx + Math.cos(a) * 34, tc.topY - 16 + Math.sin(a) * 22, 6, 2.4, 4, i % 2 ? "#fff3b0" : "#ffd76a", a);
      }
      // (no score text here: portals allow only the game title as text on covers)
    }
    // a second gift on its way down, halfway between the sleigh and the chimney
    var midY = target ? (sy + 26 * k + target.c.topY - 30) / 2 : sy + 60 * k;
    A.drawGift(ctx, sx, midY, gs, -0.25, "#2a9d8f", "#ffffff");
    A.drawSleigh(ctx, sx, sy, CR.CONFIG.skins[0], t, k, -0.04);

    var fr = A.rng(77);
    ctx.fillStyle = "#ffffff";
    for (i = 0; i < 70; i++) {
      ctx.globalAlpha = 0.35 + fr() * 0.5;
      ctx.beginPath();
      ctx.arc(fr() * L.W, fr() * L.H, 0.8 + fr() * 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    if (withTitle) {
      var vg = ctx.createLinearGradient(0, 0, 0, titleY + titleSize * (lines === 2 ? 1.4 : 0.9));
      vg.addColorStop(0, "rgba(5,8,30,0.55)");
      vg.addColorStop(1, "rgba(5,8,30,0)");
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, L.W, L.H);
      A.drawLogo(ctx, L.W / 2, titleY + (lines === 2 ? titleSize * 0.42 : 0), titleSize, 0.6, lines);
      if (subtitle) {
        // badge along the bottom edge, clear of the sleigh
        var fs = Math.max(16, titleSize * 0.3);
        var sy2 = L.H - fs * 1.45;
        ctx.font = A.font(fs, "900");
        var pw = ctx.measureText(subtitle).width + fs * 1.6;
        ctx.fillStyle = "rgba(10, 14, 44, 0.85)";
        A.roundRect(ctx, L.W / 2 - pw / 2, sy2 - fs * 0.85, pw, fs * 1.7, fs * 0.85);
        ctx.fill();
        A.text(ctx, subtitle, L.W / 2, sy2 + 1, fs, "#ffe9a8", { weight: "900" });
      }
    }

    G.L = saved.L; G.rnd = saved.rnd; G.state = saved.state; G.houses = saved.houses;
    G.scroll = saved.scroll; G.houseCount = saved.count; G.nextHouseX = saved.next; G.heightCap = saved.cap;
    return cv;
  };

  // Returns a PNG data URL at exactly w x h pixels (rendered at 2x, then downscaled).
  CR.coverPNG = function (w, h, withTitle, subtitle) {
    var big = CR.renderCover(w, h, withTitle, 2, subtitle);
    var out = document.createElement("canvas");
    out.width = w;
    out.height = h;
    var c2 = out.getContext("2d");
    c2.imageSmoothingEnabled = true;
    c2.imageSmoothingQuality = "high";
    c2.drawImage(big, 0, 0, w, h);
    return out.toDataURL("image/png");
  };

  // ---------------------------------------------------------------- boot
  function boot() {
    var canvas = document.getElementById("game");
    var bootEl = document.getElementById("boot");
    var G = CR.Game;
    if (qs("seed")) G.rnd = CR.Art.rng(parseInt(qs("seed"), 10) || 1);
    if (qs("test") || qs("cover")) window.__CR = CR;

    CR.Storage.load();

    if (qs("cover")) {
      if (bootEl) bootEl.style.display = "none";
      var A = CR.Art;
      G.ctx = canvas.getContext("2d");
      G.canvas = canvas;
      var rect = canvas.getBoundingClientRect();
      var cv = CR.renderCover(rect.width, rect.height, qs("title") !== "0", Math.min(window.devicePixelRatio || 1, 2));
      canvas.width = cv.width;
      canvas.height = cv.height;
      canvas.getContext("2d").drawImage(cv, 0, 0);
      window.__COVER_READY = true;
      void A;
      return;
    }

    CR.Platform.loadingStart();
    G.init(canvas);
    if (bootEl) bootEl.style.display = "none";
    CR.Platform.init().then(function () {
      CR.Storage.load();
      var d = CR.Storage.data;
      CR.Audio.setSound(d.sound);
      CR.Audio.setMusic(d.music);
      G.state = "title";
      CR.Platform.loadingDone();
      if (qs("autoplay")) G.autoplay = true;
      window.__CR_READY = true;
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
