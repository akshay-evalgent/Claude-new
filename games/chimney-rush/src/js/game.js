/*
 * Chimney Rush - game logic, screens and input.
 */
(function () {
  "use strict";
  var CR = (window.CR = window.CR || {});
  var A = CR.Art, AU = CR.Audio, S = CR.Storage, CFG = CR.CONFIG;
  var TAU = Math.PI * 2;

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function pick(arr, r) { return arr[Math.floor(r() * arr.length) % arr.length]; }
  function P() { return CR.Platform; }

  var G = (CR.Game = {
    canvas: null,
    ctx: null,
    dpr: 1,
    px: 1,
    L: { W: 640, H: 600, groundY: 576, sleighX: 128, sleighY: 91, speedScale: 1 },
    state: "loading",
    t: 0,
    lastFrame: 0,
    rnd: Math.random,
    stars: null,
    flakes: [],
    scroll: 0,
    speed: 0,
    houses: [],
    gifts: [],
    landed: [],
    parts: [],
    texts: [],
    nextHouseX: 0,
    houseCount: 0,
    score: 0,
    lives: 3,
    combo: 0,
    deliveries: 0,
    runCoins: 0,
    coinsBanked: 0,
    elapsed: 0,
    cooldown: 0,
    grace: 0,
    wind: 0,
    windTarget: 0,
    windTimer: 0,
    windOn: false,
    fever: 0,
    shake: 0,
    flash: 0,
    banner: null,
    toastMsg: null,
    bob: 0,
    continued: false,
    doubled: false,
    newBest: false,
    bestAtStart: 0,
    happyDone: false,
    doublesAnnounced: false,
    dyingTimer: 0,
    busy: false,
    lastAdAt: -1e9,
    goT: 0,
    buttons: [],
    hoverId: null,
    downId: null,
    pointerDown: false,
    tutorialT: 0,
    autoplay: false,
    stats: { delivered: 0, perfect: 0, fails: 0 },

    // ------------------------------------------------------------------ setup
    init: function (canvas) {
      A = CR.Art; AU = CR.Audio; S = CR.Storage; CFG = CR.CONFIG;
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d");
      this.stars = A.makeStars(90, 11);
      this.bindInput();
      this.resize();
      var self = this;
      window.addEventListener("resize", function () { self.resize(); });
      window.addEventListener("orientationchange", function () { setTimeout(function () { self.resize(); }, 250); });
      this.resetWorld(true);
      this.lastFrame = performance.now();
      function loop(now) {
        self.frame(now);
        requestAnimationFrame(loop);
      }
      requestAnimationFrame(loop);
    },

    resize: function () {
      var rect = this.canvas.getBoundingClientRect();
      var cw = rect.width || window.innerWidth || 640;
      var ch = rect.height || window.innerHeight || 600;
      var scale = Math.min(cw / 640, ch / 600);
      var L = this.L;
      L.W = cw / scale;
      L.H = ch / scale;
      this.dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.canvas.width = Math.max(1, Math.round(cw * this.dpr));
      this.canvas.height = Math.max(1, Math.round(ch * this.dpr));
      this.px = this.canvas.width / L.W;
      this.layout(L);
      this.makeFlakes();
    },

    layout: function (L) {
      L.groundY = Math.min(L.H - 24, L.H / 2 + 300);
      L.sleighX = clamp(L.W * 0.2, 128, 260);
      L.sleighY = L.groundY - 485;
      L.speedScale = clamp(L.W / 1000, 0.75, 1);
    },

    makeFlakes: function () {
      var L = this.L;
      var n = Math.min(140, Math.round((L.W * L.H) / 9000));
      var r = A.rng(99);
      this.flakes = [];
      for (var i = 0; i < n; i++) {
        this.flakes.push({ x: r() * L.W, y: r() * L.H, r: 0.8 + r() * 1.8, vy: 18 + r() * 40, a: 0.35 + r() * 0.5, sw: r() * TAU });
      }
    },

    // ------------------------------------------------------------------ world
    resetWorld: function (demo) {
      this.houses = [];
      this.gifts = [];
      this.landed = [];
      this.parts = [];
      this.texts = [];
      this.scroll = 0;
      this.houseCount = 0;
      this.nextHouseX = demo ? 20 : this.L.sleighX + 330 * this.L.speedScale;
      this.speed = demo ? 60 : CFG.difficulty.startSpeed * this.L.speedScale;
      this.wind = 0;
      this.windTarget = 0;
      this.windOn = false;
      this.spawnHouses();
    },

    diff: function () {
      var D = CFG.difficulty;
      return clamp(Math.max(this.elapsed / D.rampSeconds, this.deliveries / D.rampDeliveries), 0, 1);
    },

    spawnHouses: function () {
      var L = this.L, D = CFG.difficulty;
      while (this.nextHouseX < this.scroll + L.W + 260) {
        var h = this.makeHouse(this.nextHouseX);
        this.houses.push(h);
        var d = this.state === "playing" ? this.diff() : 0.2;
        var gmin = lerp(D.gap[0][0], D.gap[1][0], d), gmax = lerp(D.gap[0][1], D.gap[1][1], d);
        var gap = (gmin + this.rnd() * (gmax - gmin)) * L.speedScale;
        this.nextHouseX = h.x + h.w + h.oh + gap;
      }
    },

    cullHouses: function () {
      while (this.houses.length && this.houses[0].x + this.houses[0].w + 40 < this.scroll - 60) this.houses.shift();
      for (var i = this.landed.length - 1; i >= 0; i--) if (this.landed[i].wx - this.scroll < -60) this.landed.splice(i, 1);
    },

    makeHouse: function (startX) {
      var r = this.rnd, L = this.L, D = CFG.difficulty;
      var playing = this.state === "playing" || this.state === "dying";
      var d = playing ? this.diff() : 0.25;
      var idx = this.houseCount++;
      var early = playing && idx < 2;
      var oh = 10;
      var count = 1;
      if (!playing) count = r() < 0.85 ? 1 : 0;
      else if (!early && idx > 3 && !this.lastNoChimney && r() < D.noChimneyChance) count = 0;
      else if (!early && this.deliveries >= D.doubleChimneyAfter && r() < lerp(D.doubleChance[0], D.doubleChance[1], d)) count = 2;
      this.lastNoChimney = count === 0;

      var w = count === 2 ? 212 + r() * 40 : 140 + r() * 80;
      if (early) w = 176;
      var wallTop = L.groundY - lerp(118, 228, early ? 0.25 : r() * (this.heightCap || 1));
      var flat = !early && r() < 0.28;
      var h = {
        x: startX + oh,
        w: w,
        oh: oh,
        wallTop: wallTop,
        roofType: flat ? "flat" : "gable",
        roofH: flat ? 14 : 38 + r() * 40,
        wall: pick(CFG.houseWalls, r),
        roof: pick(CFG.houseRoofs, r),
        trim: "#f3ead8",
        windows: [],
        door: null,
        chimneys: [],
        lights: r() < 0.6,
        seed: Math.floor(r() * 1000)
      };

      // windows and door
      var wallH = L.groundY - wallTop;
      var cols = Math.max(2, Math.floor((w - 20) / 50));
      var colW = (w - 20) / cols;
      var doorCol = Math.floor(r() * cols);
      var rows = Math.max(1, Math.floor((wallH - 62) / 54));
      for (var ro = 0; ro < rows; ro++) {
        for (var co = 0; co < cols; co++) {
          var wy = wallTop + 22 + ro * 54;
          if (wy + 26 > L.groundY - 56 && co === doorCol) continue;
          if (wy + 26 > L.groundY - 8) continue;
          h.windows.push({ x: 10 + co * colW + (colW - 22) / 2, y: wy, w: 22, h: 26, lit: r() < 0.72 });
        }
      }
      h.door = { x: 10 + doorCol * colW + (colW - 26) / 2, w: 26, h: 44, color: pick(["#5b3a29", "#2f4858", "#6d2e46", "#33415c", "#4a5a2a"], r) };

      // chimneys
      var cw = lerp(D.chimneyWidth[0], D.chimneyWidth[1], d) + r() * 6;
      if (early) cw = D.chimneyWidth[0] + 4;
      var spots;
      if (count === 1) spots = [early ? w * 0.5 : w * (0.25 + r() * 0.5)];
      else if (count === 2) spots = [w * (0.18 + r() * 0.1), w * (0.72 + r() * 0.1)];
      else spots = [];
      for (var i = 0; i < spots.length; i++) {
        var ox = clamp(spots[i], cw / 2 + 6, w - cw / 2 - 6);
        var roofY = A.roofYAt(h, ox);
        var topY = roofY - (26 + r() * 22);
        topY = Math.max(topY, L.sleighY + 105);
        if (roofY - topY < 16) topY = roofY - 16;
        h.chimneys.push({
          ox: ox,
          w: cw,
          topY: topY,
          served: false,
          missed: false,
          golden: playing && idx > 3 && r() < D.goldenChance,
          glow: 0
        });
      }
      if (count === 2 && playing && !this.doublesAnnounced) {
        this.doublesAnnounced = true;
        this.showBanner(CFG.text.doubles, 2.2, "#ffd76a");
      }
      return h;
    },

    // ------------------------------------------------------------------ run flow
    startRun: function () {
      this.state = "playing";
      this.score = 0;
      this.lives = CFG.lives;
      this.combo = 0;
      this.deliveries = 0;
      this.runCoins = 0;
      this.coinsBanked = 0;
      this.elapsed = 0;
      this.cooldown = 0.25;
      this.grace = 0;
      this.fever = 0;
      this.shake = 0;
      this.flash = 0;
      this.banner = null;
      this.continued = false;
      this.doubled = false;
      this.newBest = false;
      this.happyDone = false;
      this.doublesAnnounced = false;
      this.lastNoChimney = false;
      this.bestAtStart = S.data.best;
      this.windTimer = 0;
      this.stats = { delivered: 0, perfect: 0, fails: 0 };
      this.tutorialT = S.data.tutorialDone ? 0 : 7;
      this.resetWorld(false);
      AU.play("start");
      P().gameplayStart();
    },

    // Ads only ever run here, right after a button press and outside gameplay.
    requestStart: function (afterRun) {
      if (this.busy) return;
      var self = this, plat = P();
      var interval = plat.midgameInterval != null ? plat.midgameInterval : CFG.ads.midgameMinInterval;
      var preroll = !afterRun && plat.prerollOnFirstPlay && !this.prerollDone && plat.hasMidgame;
      var midgame = afterRun && plat.hasMidgame && this.t - this.lastAdAt >= interval;
      if (!preroll && !midgame) { this.startRun(); return; }
      if (preroll) this.prerollDone = true;
      this.busy = true;
      (preroll ? plat.prerollAd() : plat.midgameAd()).then(function () {
        self.busy = false;
        self.lastAdAt = self.t;
        self.startRun();
      });
    },

    // A portal started an ad on its own while the player was mid-run: pause.
    onAdStart: function () {
      if (this.state === "playing") this.pause();
    },

    gameOver: function () {
      this.state = "gameover";
      this.goT = 0;
      var d = S.data;
      if (!this.continued) d.runs++;
      if (this.score > d.best) { d.best = this.score; this.newBest = true; }
      d.coins += this.runCoins - this.coinsBanked;
      this.coinsBanked = this.runCoins;
      S.save();
      AU.play("gameover");
    },

    canContinue: function () {
      return CFG.ads.rewardedContinue && P().hasRewarded && !this.continued;
    },

    canDouble: function () {
      return CFG.ads.rewardedDoubleCoins && P().hasRewarded && !this.doubled && this.runCoins > 0;
    },

    watchRewarded: function (kind) {
      if (this.busy) return;
      var self = this;
      this.busy = true;
      P().rewardedAd().then(function (ok) {
        self.busy = false;
        self.lastAdAt = self.t;
        if (!ok) { self.toast("No reward this time"); return; }
        if (kind === "continue") self.continueRun();
        else self.doubleCoins();
      });
    },

    continueRun: function () {
      var L = this.L;
      this.continued = true;
      this.lives = 1;
      this.gifts = [];
      this.grace = 1.6;
      this.combo = 0;
      for (var i = 0; i < this.houses.length; i++) {
        var h = this.houses[i], sx = h.x - this.scroll;
        for (var j = 0; j < h.chimneys.length; j++) {
          var c = h.chimneys[j], cx = sx + c.ox;
          if (!c.served && cx < L.sleighX + 260) c.missed = true;
        }
      }
      this.state = "playing";
      this.cooldown = 0.3;
      this.showBanner("GO!", 1.2, "#7dffb0");
      P().gameplayStart();
    },

    doubleCoins: function () {
      if (this.doubled) return;
      this.doubled = true;
      S.data.coins += this.runCoins;
      S.save();
      AU.play("buy");
      this.toast("+" + this.runCoins + " coins");
    },

    pause: function () {
      if (this.state !== "playing") return;
      this.state = "paused";
      AU.setPaused(true);
      P().gameplayStop();
    },

    resume: function () {
      if (this.state !== "paused") return;
      this.state = "playing";
      this.cooldown = 0.2;
      AU.setPaused(false);
      P().gameplayStart();
    },

    toMenu: function () {
      if (this.state === "paused") AU.setPaused(false);
      this.state = "title";
      this.resetWorld(true);
    },

    // ------------------------------------------------------------------ actions
    dropGift: function () {
      if (this.state !== "playing" || this.cooldown > 0) return;
      this.cooldown = CFG.physics.dropCooldown;
      var L = this.L, r = this.rnd;
      var ci = Math.floor(r() * CFG.giftColors.length);
      this.gifts.push({
        x: L.sleighX,
        y: L.sleighY + 22 + this.bob,
        vx: 0,
        vy: 40,
        rot: (r() - 0.5) * 0.4,
        vr: (r() - 0.5) * 3,
        color: CFG.giftColors[ci],
        ribbon: CFG.ribbonColors[ci]
      });
      AU.play("drop");
    },

    deliver: function (c, dx, cx, top) {
      var Sc = CFG.scoring, T = CFG.text;
      c.served = true;
      c.glow = 1.3;
      this.deliveries++;
      this.combo++;
      this.stats.delivered++;
      var perfect = Math.abs(dx) <= Sc.perfectWindow;
      if (perfect) this.stats.perfect++;
      var mult = Math.min(Sc.maxMultiplier, 1 + Math.floor(this.combo / Sc.comboStep));
      var pts = (Sc.deliver + (perfect ? Sc.perfectBonus : 0)) * mult * (this.fever > 0 ? 2 : 1);
      this.score += pts;
      this.runCoins += Sc.coinsPerDelivery + (perfect ? Sc.coinsPerfect : 0) + (c.golden ? Sc.coinsGolden : 0);
      AU.play("deliver", this.combo);
      if (perfect) AU.play("perfect");
      if (c.golden) AU.play("coin");
      this.burst(cx, top, perfect ? 18 : 10, c.golden ? "#ffd76a" : "#fff3b0");
      this.addText("+" + pts, cx, top - 20, perfect ? "#ffe066" : "#ffffff", 24, true);
      if (perfect) this.addText(T.perfect, cx, top - 48, "#7dffb0", 18, true);
      if (c.golden) this.addText("+" + Sc.coinsGolden + " coins", cx, top - 72, "#ffd76a", 16, true);
      if (this.combo % Sc.feverEvery === 0) {
        this.fever = Sc.feverSeconds;
        this.showBanner(T.fever, 1.6, "#ff7ad9");
        AU.play("fever");
      }
      if (this.deliveries % CFG.healEvery === 0 && this.lives < CFG.lives) {
        this.lives++;
        this.showBanner(T.heart, 1.5, "#ff6b81");
        AU.play("heal");
      }
      if (!S.data.tutorialDone && this.deliveries >= 3) {
        S.data.tutorialDone = true;
        S.save();
        this.tutorialT = Math.min(this.tutorialT, 0.6);
      }
      if (!this.happyDone && this.bestAtStart > 0 && this.score > this.bestAtStart) {
        this.happyDone = true;
        this.showBanner(T.newBest, 1.6, "#ffd76a");
        P().happyTime();
      }
    },

    fail: function (kind, x, y, worldText) {
      if (this.state !== "playing") return;
      var T = CFG.text;
      var label = kind === "missed" ? T.missed : kind === "bonk" ? T.bonk : T.oops;
      this.addText(label, x, y - 18, "#ff9a9a", 22, worldText !== false);
      if (this.grace > 0) return; // one mistake never costs two hearts
      this.grace = 0.7;
      this.stats.fails++;
      this.lives--;
      this.combo = 0;
      this.fever = 0;
      this.shake = 9;
      this.flash = 0.35;
      AU.play(kind === "bonk" ? "bonk" : "miss");
      if (this.lives <= 0) {
        this.lives = 0;
        this.state = "dying";
        this.dyingTimer = 1.1;
        P().gameplayStop();
      }
    },

    landGift: function (g, h, surfaceY) {
      var half = CFG.physics.giftSize / 2, rot = 0;
      if (h && h.roofType === "gable") {
        var slope = Math.atan2(h.roofH, h.w / 2 + h.oh);
        var lx = g.x - (h.x - this.scroll);
        rot = lx < h.w / 2 ? -slope : slope;
      }
      this.landed.push({ wx: g.x + this.scroll, y: surfaceY - half + 2, rot: rot, color: g.color, ribbon: g.ribbon });
      if (this.landed.length > 24) this.landed.shift();
    },

    // returns true when the gift stops falling
    resolveGift: function (g, prevY) {
      var L = this.L, half = CFG.physics.giftSize / 2;
      for (var i = 0; i < this.houses.length; i++) {
        var h = this.houses[i];
        var sx = h.x - this.scroll;
        if (g.x < sx - h.oh - half - 6 || g.x > sx + h.w + h.oh + half + 6) continue;
        for (var j = 0; j < h.chimneys.length; j++) {
          var c = h.chimneys[j];
          var cx = sx + c.ox, top = c.topY - 7;
          if (prevY < top && g.y >= top) {
            var dx = g.x - cx;
            var open = (c.w - 10) / 2;
            if (Math.abs(dx) <= open) {
              if (!c.served && !c.missed) this.deliver(c, dx, cx, top);
              else this.burst(cx, top, 5, "#ffffff");
              return true;
            }
            if (Math.abs(dx) <= c.w / 2 + half * 0.55) {
              this.burst(g.x, top, 6, "#ffffff");
              this.fail("bonk", cx, top);
              this.parts.push({ x: g.x + this.scroll, y: g.y, vx: (dx > 0 ? 1 : -1) * 120, vy: -260, life: 0.8, max: 0.8, gift: g, r: 0 });
              return true;
            }
          }
        }
        var lx = g.x - sx;
        if (lx >= -h.oh && lx <= h.w + h.oh) {
          var ry = A.roofYAt(h, lx);
          if (g.y + half >= ry) {
            this.landGift(g, h, ry);
            this.burst(g.x, ry, 6, "#ffffff");
            this.fail("oops", g.x, ry);
            return true;
          }
        }
      }
      if (g.y + half >= L.groundY) {
        this.landGift(g, null, L.groundY);
        this.burst(g.x, L.groundY, 6, "#ffffff");
        this.fail("oops", g.x, L.groundY - 10);
        return true;
      }
      if (g.x < -80 || g.x > L.W + 80) {
        this.fail("missed", clamp(g.x, 40, L.W - 40), L.groundY - 80, false);
        return true;
      }
      return false;
    },

    checkMissed: function () {
      var L = this.L;
      for (var i = 0; i < this.houses.length; i++) {
        var h = this.houses[i], sx = h.x - this.scroll;
        for (var j = 0; j < h.chimneys.length; j++) {
          var c = h.chimneys[j];
          if (c.served || c.missed) continue;
          var cx = sx + c.ox;
          if (cx + c.w / 2 >= L.sleighX - 70) continue;
          var pending = false;
          for (var k = 0; k < this.gifts.length; k++) {
            var g = this.gifts[k];
            if (g.y < c.topY && Math.abs(g.x - cx) < 80) { pending = true; break; }
          }
          if (pending) continue;
          c.missed = true;
          this.fail("missed", cx, c.topY);
          if (this.state !== "playing") return;
        }
      }
    },

    // ------------------------------------------------------------------ fx
    burst: function (x, y, n, color) {
      for (var i = 0; i < n; i++) {
        var a = Math.random() * TAU, sp = 60 + Math.random() * 180;
        this.parts.push({ x: x + this.scroll, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 80, life: 0.5 + Math.random() * 0.4, max: 0.9, color: color, r: 1.5 + Math.random() * 2.5 });
      }
    },

    addText: function (str, x, y, color, size, world) {
      this.texts.push({ str: str, x: world ? x + this.scroll : x, y: y, world: !!world, color: color, size: size, life: 1.1, max: 1.1 });
    },

    showBanner: function (text, dur, color) {
      this.banner = { text: text, t: dur, max: dur, color: color || "#ffffff" };
    },

    toast: function (text) {
      this.toastMsg = { text: text, t: 1.8 };
    },

    // ------------------------------------------------------------------ update
    frame: function (now) {
      var dt = (now - this.lastFrame) / 1000;
      this.lastFrame = now;
      if (this.manualClock) return; // video capture drives the game with step()
      if (!(dt > 0)) dt = 0;
      if (dt > 0.05) dt = 0.05;
      this.step(dt);
    },

    step: function (dt) {
      if (this.autoplay) this.botStep();
      this.update(dt);
      this.draw();
    },

    update: function (dt) {
      this.t += dt;
      this.bob = Math.sin(this.t * 2.2) * 4;
      if (this.toastMsg) { this.toastMsg.t -= dt; if (this.toastMsg.t <= 0) this.toastMsg = null; }
      if (this.state === "paused") return;
      if (this.state === "playing" || this.state === "dying") this.updatePlay(dt);
      else {
        this.scroll += (this.state === "gameover" ? 25 : 60) * dt;
        this.spawnHouses();
        this.cullHouses();
        if (this.state === "gameover") this.goT += dt;
      }
      if (this.banner) { this.banner.t -= dt; if (this.banner.t <= 0) this.banner = null; }
      this.updateFx(dt);
    },

    updatePlay: function (dt) {
      var L = this.L, D = CFG.difficulty, PH = CFG.physics;
      var playing = this.state === "playing";
      if (playing) this.elapsed += dt;
      var d = this.diff();
      var target = lerp(D.startSpeed, D.maxSpeed, Math.pow(d, 0.85)) * L.speedScale;
      if (!playing) target *= 0.3;
      this.speed += (target - this.speed) * Math.min(1, dt * 2.5);
      this.scroll += this.speed * dt;
      this.spawnHouses();
      this.cullHouses();
      this.cooldown -= dt;
      if (this.grace > 0) this.grace -= dt;
      if (this.fever > 0) this.fever -= dt;
      if (this.tutorialT > 0) this.tutorialT -= dt;

      if (playing && this.deliveries >= D.windAfter) {
        if (!this.windOn) {
          this.windOn = true;
          this.windTimer = 0;
          this.showBanner(CFG.text.windIntro, 2.4, "#bfe6ff");
        }
        this.windTimer -= dt;
        if (this.windTimer <= 0) {
          var wm = lerp(D.windMax[0], D.windMax[1], d);
          this.windTarget = this.rnd() < 0.22 ? 0 : (this.rnd() < 0.5 ? -1 : 1) * wm * (0.45 + this.rnd() * 0.55);
          this.windTimer = 6 + this.rnd() * 5;
          if (Math.abs(this.windTarget) > 25) AU.play("wind");
        }
      }
      this.wind += (this.windTarget - this.wind) * Math.min(1, dt * 1.1);

      for (var i = this.gifts.length - 1; i >= 0; i--) {
        var g = this.gifts[i];
        var py = g.y;
        g.vy += PH.gravity * dt;
        g.vx += this.wind * dt;
        g.x += g.vx * dt;
        g.y += g.vy * dt;
        g.rot += g.vr * dt;
        if (this.resolveGift(g, py)) this.gifts.splice(i, 1);
      }
      if (this.state === "playing") this.checkMissed();
      if (this.state === "dying") {
        this.dyingTimer -= dt;
        if (this.dyingTimer <= 0) this.gameOver();
      }
    },

    updateFx: function (dt) {
      var L = this.L, i;
      for (i = 0; i < this.houses.length; i++) {
        var cs = this.houses[i].chimneys;
        for (var j = 0; j < cs.length; j++) if (cs[j].glow > 0) cs[j].glow -= dt;
      }
      for (i = this.parts.length - 1; i >= 0; i--) {
        var p = this.parts[i];
        p.life -= dt;
        if (p.life <= 0) { this.parts.splice(i, 1); continue; }
        p.vy += (p.gift ? 900 : 260) * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.gift) p.r += dt * 8;
      }
      for (i = this.texts.length - 1; i >= 0; i--) {
        var tx = this.texts[i];
        tx.life -= dt;
        tx.y -= 40 * dt;
        if (tx.life <= 0) this.texts.splice(i, 1);
      }
      if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 30);
      if (this.flash > 0) this.flash = Math.max(0, this.flash - dt);
      var drift = (this.state === "playing" || this.state === "dying" ? -this.speed * 0.25 : -18) + this.wind * 0.35;
      for (i = 0; i < this.flakes.length; i++) {
        var f = this.flakes[i];
        f.y += f.vy * dt;
        f.x += (Math.sin(this.t * 0.9 + f.sw) * 10 + drift) * dt;
        if (f.y > L.H + 4) { f.y = -4; f.x = Math.random() * L.W; }
        if (f.x < -6) f.x += L.W + 12;
        if (f.x > L.W + 6) f.x -= L.W + 12;
      }
    },

    // simple autopilot used by the automated tests and screenshots
    botStep: function () {
      if (this.state === "title" && !this.busy) { this.requestStart(false); return; }
      if (this.state !== "playing") return;
      var L = this.L, gv = CFG.physics.gravity, y0 = L.sleighY + 22 + this.bob;
      for (var i = 0; i < this.houses.length; i++) {
        var h = this.houses[i], sx = h.x - this.scroll;
        for (var j = 0; j < h.chimneys.length; j++) {
          var c = h.chimneys[j];
          if (c.served || c.missed || c.bot) continue;
          var dy = c.topY - 7 - y0;
          var tf = (-40 + Math.sqrt(1600 + 2 * gv * dy)) / gv;
          var drift = 0.5 * this.wind * tf * tf;
          var err = sx + c.ox - this.speed * tf - (L.sleighX + drift);
          if (err <= this.speed * 0.017 && err > -4) {
            c.bot = true;
            this.cooldown = 0;
            this.dropGift();
          }
        }
      }
    },

    // ------------------------------------------------------------------ input
    bindInput: function () {
      var self = this, c = this.canvas;
      c.addEventListener("pointerdown", function (e) {
        e.preventDefault();
        try { c.focus({ preventScroll: true }); } catch (er) { /* old browsers */ }
        AU.unlock();
        self.ensureMusic();
        var p = self.toLogical(e);
        self.pointerDown = true;
        var b = self.hitButton(p);
        if (b) { self.downId = b.id; return; }
        self.downId = null;
        if (self.state === "playing") self.dropGift();
      });
      c.addEventListener("pointermove", function (e) {
        var b = self.hitButton(self.toLogical(e));
        self.hoverId = b ? b.id : null;
        c.style.cursor = b ? "pointer" : "default";
      });
      window.addEventListener("pointerup", function (e) {
        if (!self.pointerDown) return;
        self.pointerDown = false;
        var b = self.hitButton(self.toLogical(e));
        if (b && b.id === self.downId) self.onButton(b);
        self.downId = null;
      });
      window.addEventListener("pointercancel", function () { self.pointerDown = false; self.downId = null; });
      c.addEventListener("contextmenu", function (e) { e.preventDefault(); });
      window.addEventListener("keydown", function (e) {
        var k = e.code || e.key;
        if (["Space", " ", "ArrowDown", "ArrowUp", "ArrowLeft", "ArrowRight", "Enter"].indexOf(k) >= 0) e.preventDefault();
        if (e.repeat) return;
        AU.unlock();
        self.ensureMusic();
        self.onKey(k);
      });
      document.addEventListener("visibilitychange", function () {
        AU.setHidden(document.hidden);
        if (document.hidden) self.pause();
      });
      window.addEventListener("blur", function () { self.pause(); });
    },

    ensureMusic: function () {
      if (S.data && S.data.music && !AU.musicWanted) AU.startMusic();
    },

    toLogical: function (e) {
      var rect = this.canvas.getBoundingClientRect();
      return {
        x: ((e.clientX - rect.left) / Math.max(1, rect.width)) * this.L.W,
        y: ((e.clientY - rect.top) / Math.max(1, rect.height)) * this.L.H
      };
    },

    hitButton: function (p) {
      if (this.busy) return null;
      for (var i = this.buttons.length - 1; i >= 0; i--) {
        var b = this.buttons[i];
        if (p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h) return b;
      }
      return null;
    },

    onKey: function (k) {
      var drop = k === "Space" || k === " " || k === "ArrowDown" || k === "Enter" || k === "KeyS";
      var esc = k === "Escape" || k === "KeyP";
      if (this.busy) return;
      switch (this.state) {
        case "playing":
          if (drop) this.dropGift();
          else if (esc) this.pause();
          break;
        case "paused":
          if (drop || esc) { AU.play("click"); this.resume(); }
          break;
        case "title":
          if (drop) { AU.play("click"); this.requestStart(false); }
          break;
        case "gameover":
          if (drop && this.goT > 0.8) { AU.play("click"); this.requestStart(true); }
          break;
        case "shop":
          if (esc) { AU.play("click"); this.state = "title"; }
          break;
      }
    },

    onButton: function (b) {
      AU.play("click");
      var d = S.data;
      if (b.id.indexOf("skin:") === 0) { this.shopSelect(b.id.slice(5)); return; }
      switch (b.id) {
        case "play": this.requestStart(false); break;
        case "again": this.requestStart(true); break;
        case "shop": this.state = "shop"; break;
        case "back": this.state = "title"; break;
        case "pause": this.pause(); break;
        case "resume": this.resume(); break;
        case "menu": this.toMenu(); break;
        case "continue": if (this.canContinue()) this.watchRewarded("continue"); break;
        case "double": if (this.canDouble()) this.watchRewarded("double"); break;
        case "sound":
          d.sound = !d.sound;
          AU.setSound(d.sound);
          S.save();
          break;
        case "music":
          d.music = !d.music;
          AU.setMusic(d.music);
          if (d.music) AU.startMusic(); else AU.stopMusic();
          S.save();
          break;
      }
    },

    shopSelect: function (id) {
      var d = S.data, skin = null;
      for (var i = 0; i < CFG.skins.length; i++) if (CFG.skins[i].id === id) skin = CFG.skins[i];
      if (!skin) return;
      if (d.owned.indexOf(id) >= 0) { d.skin = id; S.save(); return; }
      if (d.coins >= skin.price) {
        d.coins -= skin.price;
        d.owned.push(id);
        d.skin = id;
        S.save();
        AU.play("buy");
        this.toast(skin.name + "!");
      } else {
        AU.play("deny");
        this.toast(CFG.text.notEnough);
      }
    },

    currentSkin: function () {
      var id = S.data ? S.data.skin : "classic";
      for (var i = 0; i < CFG.skins.length; i++) if (CFG.skins[i].id === id) return CFG.skins[i];
      return CFG.skins[0];
    },

    // ------------------------------------------------------------------ drawing
    draw: function () {
      var ctx = this.ctx, L = this.L;
      ctx.setTransform(this.px, 0, 0, this.px, 0, 0);
      this.drawWorld(ctx, true);
      this.buttons = [];
      switch (this.state) {
        case "loading": this.drawLoading(ctx); break;
        case "title": this.drawTitle(ctx); break;
        case "shop": this.drawShop(ctx); break;
        case "playing":
        case "dying": this.drawHUD(ctx); break;
        case "paused": this.drawHUD(ctx); this.drawPaused(ctx); break;
        case "gameover": this.drawGameOver(ctx); break;
      }
      if (this.toastMsg) {
        var a = Math.min(1, this.toastMsg.t * 3);
        ctx.globalAlpha = a;
        ctx.font = A.font(18, "800");
        var tw = ctx.measureText(this.toastMsg.text).width + 40;
        ctx.fillStyle = "rgba(10,14,40,0.9)";
        A.roundRect(ctx, L.W / 2 - tw / 2, L.H - 84, tw, 40, 20);
        ctx.fill();
        A.text(ctx, this.toastMsg.text, L.W / 2, L.H - 64, 18, "#ffffff");
        ctx.globalAlpha = 1;
      }
      if (this.busy) {
        ctx.fillStyle = "rgba(5,8,25,0.6)";
        ctx.fillRect(0, 0, L.W, L.H);
        for (var di = 0; di < 3; di++) {
          var dy = Math.sin(this.t * 6 - di * 0.7) * 6;
          A.drawGift(ctx, L.W / 2 + (di - 1) * 34, L.H / 2 + dy, 22, 0, CFG.giftColors[di], CFG.ribbonColors[di]);
        }
      }
    },

    drawWorld: function (ctx, withSleigh) {
      var L = this.L, i, t = this.t;
      ctx.save();
      if (this.shake > 0) ctx.translate((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake);
      A.drawSky(ctx, L, t, this.stars);
      A.drawHills(ctx, L, this.scroll);
      A.drawTown(ctx, L, this.scroll);
      for (i = 0; i < this.houses.length; i++) {
        var h = this.houses[i], sx = h.x - this.scroll;
        if (sx > L.W + 40 || sx + h.w + 40 < 0) continue;
        A.drawHouse(ctx, h, sx, L, t);
      }
      A.drawGround(ctx, L, this.scroll);
      var gs = CFG.physics.giftSize;
      for (i = 0; i < this.landed.length; i++) {
        var lg = this.landed[i];
        A.drawGift(ctx, lg.wx - this.scroll, lg.y, gs, lg.rot, lg.color, lg.ribbon);
      }
      var playing = this.state === "playing" || this.state === "dying" || this.state === "paused";
      if (playing) {
        ctx.save();
        ctx.setLineDash([4, 10]);
        ctx.lineDashOffset = -t * 30;
        ctx.strokeStyle = this.tutorialT > 0 ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.16)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(L.sleighX, L.sleighY + 30);
        ctx.lineTo(L.sleighX, L.groundY);
        ctx.stroke();
        ctx.restore();
      }
      for (i = 0; i < this.gifts.length; i++) {
        var g = this.gifts[i];
        A.drawGift(ctx, g.x, g.y, gs, g.rot, g.color, g.ribbon);
      }
      if (withSleigh) {
        var tilt = Math.sin(t * 1.7) * 0.03;
        A.drawSleigh(ctx, L.sleighX, L.sleighY + this.bob, this.currentSkin(), t, 1, tilt);
        if (this.fever > 0 && playing) {
          ctx.globalAlpha = 0.5 + 0.3 * Math.sin(t * 12);
          A.drawStar(ctx, L.sleighX - 60, L.sleighY + this.bob - 10, 6, 2.5, 4, "#ff9be6", t * 3);
          A.drawStar(ctx, L.sleighX + 30, L.sleighY + this.bob + 22, 5, 2, 4, "#fff3b0", -t * 3);
          ctx.globalAlpha = 1;
        }
      }
      for (i = 0; i < this.parts.length; i++) {
        var p = this.parts[i];
        var px = p.x - this.scroll;
        ctx.globalAlpha = Math.max(0, p.life / p.max);
        if (p.gift) A.drawGift(ctx, px, p.y, gs, p.r, p.gift.color, p.gift.ribbon);
        else {
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(px, p.y, p.r, 0, TAU);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
      for (i = 0; i < this.texts.length; i++) {
        var tx = this.texts[i];
        ctx.globalAlpha = Math.min(1, tx.life / tx.max * 1.6);
        A.text(ctx, tx.str, tx.world ? tx.x - this.scroll : tx.x, tx.y, tx.size, tx.color, { stroke: "rgba(10,10,30,0.85)", weight: "900" });
      }
      ctx.globalAlpha = 1;
      ctx.restore();
      A.drawFlakes(ctx, this.flakes);
      if (this.flash > 0) {
        ctx.fillStyle = "rgba(255, 60, 80," + (this.flash * 0.5).toFixed(3) + ")";
        ctx.fillRect(0, 0, L.W, L.H);
      }
    },

    iconButtons: function (ctx, x, y) {
      var d = S.data;
      var bs = [
        { id: "sound", x: x - 44, y: y, w: 44, h: 44, icon: "sound", on: d.sound, style: "secondary", round: true },
        { id: "music", x: x - 98, y: y, w: 44, h: 44, icon: "music", on: d.music, style: "secondary", round: true }
      ];
      for (var i = 0; i < bs.length; i++) this.addButton(ctx, bs[i]);
    },

    addButton: function (ctx, b) {
      this.buttons.push(b);
      A.drawButton(ctx, b, this.hoverId === b.id, this.downId === b.id && this.pointerDown);
    },

    drawLoading: function (ctx) {
      var L = this.L;
      ctx.fillStyle = CFG.colors.overlay;
      ctx.fillRect(0, 0, L.W, L.H);
      A.text(ctx, CFG.text.loading, L.W / 2, L.H / 2, 24, "#ffffff");
    },

    menuAnchor: function () {
      var L = this.L;
      return L.sleighY > 360 ? L.sleighY - 290 : L.sleighY + 95;
    },

    drawTitle: function (ctx) {
      var L = this.L, d = S.data, T = CFG.text;
      ctx.fillStyle = "rgba(5,8,25,0.22)";
      ctx.fillRect(0, 0, L.W, L.H);
      var twoLines = L.W < 760;
      var size = twoLines ? Math.min(78, L.W * 0.14) : Math.min(88, L.W * 0.085);
      var logoY = this.menuAnchor();
      if (twoLines) logoY += size * 0.35;
      A.drawLogo(ctx, L.W / 2, logoY, size, this.t, twoLines ? 2 : 1);
      var afterLogo = logoY + (twoLines ? size * 1.15 : size * 0.62);
      A.text(ctx, CFG.tagline, L.W / 2, afterLogo + 6, 17, "#e8eeff", { stroke: "rgba(10,10,30,0.7)", weight: "700" });
      var pulse = 1 + Math.sin(this.t * 4) * 0.025;
      var bw = 230 * pulse, bh = 68 * pulse;
      this.addButton(ctx, { id: "play", x: L.W / 2 - bw / 2, y: afterLogo + 34 + (68 - bh) / 2, w: bw, h: bh, label: T.play, style: "primary", fontSize: 32 });
      this.addButton(ctx, { id: "shop", x: L.W / 2 - 115, y: afterLogo + 118, w: 230, h: 52, label: T.shop, style: "secondary", fontSize: 20 });
      this.iconButtons(ctx, L.W - 14, 12);
      // wallet + best
      A.drawCoin(ctx, 30, 34, 12);
      A.text(ctx, String(d.coins), 50, 35, 20, "#ffffff", { align: "left", stroke: "rgba(10,10,30,0.7)" });
      if (d.best > 0) A.text(ctx, T.best + " " + d.best, 18, 70, 16, "#ffe9a8", { align: "left", stroke: "rgba(10,10,30,0.7)" });
    },

    drawShop: function (ctx) {
      var L = this.L, d = S.data, T = CFG.text, skins = CFG.skins;
      ctx.fillStyle = CFG.colors.overlay;
      ctx.fillRect(0, 0, L.W, L.H);
      var cols = L.W >= 760 ? 3 : 2;
      var rows = Math.ceil(skins.length / cols);
      var pw = Math.min(L.W - 28, cols === 3 ? 700 : 560);
      var cardW = (pw - 36 - (cols - 1) * 14) / cols;
      var cardH = Math.min(170, cardW * 0.85);
      var ph = 86 + rows * cardH + (rows - 1) * 14 + 84;
      if (ph > L.H - 24) { cardH = (L.H - 24 - 170 - (rows - 1) * 14) / rows; ph = L.H - 24; }
      var px = L.W / 2 - pw / 2, py = Math.max(12, L.H / 2 - ph / 2);
      A.drawPanel(ctx, px, py, pw, ph);
      A.text(ctx, T.shop, L.W / 2, py + 40, 30, "#ffffff", { weight: "900" });
      A.drawCoin(ctx, px + pw - 92, py + 40, 12);
      A.text(ctx, String(d.coins), px + pw - 72, py + 41, 20, "#ffe9a8", { align: "left" });
      for (var i = 0; i < skins.length; i++) {
        var s = skins[i];
        var cx = px + 18 + (i % cols) * (cardW + 14), cy = py + 78 + Math.floor(i / cols) * (cardH + 14);
        var owned = d.owned.indexOf(s.id) >= 0, using = d.skin === s.id;
        var b = { id: "skin:" + s.id, x: cx, y: cy, w: cardW, h: cardH };
        this.buttons.push(b);
        var hov = this.hoverId === b.id;
        ctx.fillStyle = using ? "rgba(255, 207, 63, 0.18)" : hov ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.06)";
        A.roundRect(ctx, cx, cy, cardW, cardH, 16);
        ctx.fill();
        ctx.strokeStyle = using ? "#ffcf3f" : "rgba(255,255,255,0.12)";
        ctx.lineWidth = using ? 3 : 1.5;
        A.roundRect(ctx, cx, cy, cardW, cardH, 16);
        ctx.stroke();
        var sc = Math.min(cardW / 125, cardH / 95);
        A.drawSleigh(ctx, cx + cardW / 2 + 4 * sc, cy + cardH * 0.44, s, this.t + i, sc, 0, true);
        A.text(ctx, s.name, cx + cardW / 2, cy + cardH - 40, Math.min(17, cardW * 0.11), "#ffffff", { weight: "800" });
        if (using) A.text(ctx, T.using, cx + cardW / 2, cy + cardH - 17, 14, "#ffcf3f", { weight: "900" });
        else if (owned) A.text(ctx, T.owned, cx + cardW / 2, cy + cardH - 17, 14, "#9fe8b8", { weight: "900" });
        else {
          var can = d.coins >= s.price;
          ctx.font = A.font(15, "900");
          var tw = ctx.measureText(String(s.price)).width;
          A.drawCoin(ctx, cx + cardW / 2 - tw / 2 - 8, cy + cardH - 17, 8);
          A.text(ctx, String(s.price), cx + cardW / 2 + 6, cy + cardH - 16, 15, can ? "#ffe9a8" : "rgba(255,255,255,0.45)", { weight: "900" });
        }
      }
      this.addButton(ctx, { id: "back", x: L.W / 2 - 100, y: py + ph - 66, w: 200, h: 50, label: T.back, style: "secondary", fontSize: 20 });
    },

    drawHUD: function (ctx) {
      var L = this.L, Sc = CFG.scoring, i;
      for (i = 0; i < CFG.lives; i++) A.drawHeart(ctx, 26 + i * 32, 30, 26, "#ff5a6e", i >= this.lives);
      A.text(ctx, String(this.score), L.W / 2, 32, 38, "#ffffff", { stroke: "rgba(10,10,30,0.85)", weight: "900" });
      var mult = Math.min(Sc.maxMultiplier, 1 + Math.floor(this.combo / Sc.comboStep));
      if (mult > 1 || this.fever > 0) {
        ctx.font = A.font(38, "900");
        var sw = ctx.measureText(String(this.score)).width;
        var label = "x" + mult * (this.fever > 0 ? 2 : 1);
        A.text(ctx, label, L.W / 2 + sw / 2 + 10, 30, 20, this.fever > 0 ? "#ff9be6" : "#ffd76a", { align: "left", stroke: "rgba(10,10,30,0.85)", weight: "900" });
      }
      if (this.fever > 0) {
        var fw = 150;
        ctx.fillStyle = "rgba(0,0,0,0.35)";
        A.roundRect(ctx, L.W / 2 - fw / 2, 56, fw, 7, 3.5); ctx.fill();
        ctx.fillStyle = "#ff7ad9";
        A.roundRect(ctx, L.W / 2 - fw / 2, 56, fw * (this.fever / Sc.feverSeconds), 7, 3.5); ctx.fill();
      }
      if (this.windOn && Math.abs(this.wind) > 6) A.drawWind(ctx, L.W / 2, 86, this.wind, CFG.difficulty.windMax[1], this.t);
      A.drawCoin(ctx, L.W - 128, 30, 11);
      A.text(ctx, String(this.runCoins), L.W - 111, 31, 19, "#ffe9a8", { align: "left", stroke: "rgba(10,10,30,0.8)" });
      if (this.state === "playing") this.addButton(ctx, { id: "pause", x: L.W - 58, y: 8, w: 44, h: 44, icon: "pause", style: "secondary", round: true });
      if (this.banner) {
        var b = this.banner;
        var a = Math.min(1, b.t * 2.5, (b.max - b.t) * 6);
        var s = 1 + Math.max(0, 0.25 - (b.max - b.t)) * 1.4;
        ctx.globalAlpha = Math.max(0, a);
        A.text(ctx, b.text, L.W / 2, L.sleighY + 112, 30 * s, b.color, { stroke: "rgba(10,10,30,0.9)", weight: "900" });
        ctx.globalAlpha = 1;
      }
      if (this.tutorialT > 0 && this.state === "playing") {
        var ta = Math.min(1, this.tutorialT);
        ctx.globalAlpha = ta;
        // keep the hint clear of the column the gifts fall through
        var ty = L.sleighY + 160;
        var tw2 = Math.min(L.W - L.sleighX - 60, 560);
        var tx0 = Math.max(L.sleighX + 40, L.W / 2 - tw2 / 2);
        var tcx = tx0 + tw2 / 2;
        ctx.fillStyle = "rgba(8,12,36,0.72)";
        A.roundRect(ctx, tx0, ty - 34, tw2, 70, 16);
        ctx.fill();
        A.text(ctx, CFG.text.tutorial1, tcx, ty - 12, Math.min(19, tw2 * 0.042), "#ffffff", { weight: "800" });
        A.text(ctx, CFG.text.tutorial2, tcx, ty + 14, Math.min(15, tw2 * 0.032), "#ffd76a", { weight: "700" });
        ctx.globalAlpha = 1;
      }
    },

    drawPaused: function (ctx) {
      var L = this.L, T = CFG.text;
      ctx.fillStyle = CFG.colors.overlay;
      ctx.fillRect(0, 0, L.W, L.H);
      var pw = Math.min(L.W - 40, 360), ph = 250;
      var px = L.W / 2 - pw / 2, py = L.H / 2 - ph / 2;
      A.drawPanel(ctx, px, py, pw, ph);
      A.text(ctx, T.paused, L.W / 2, py + 44, 32, "#ffffff", { weight: "900" });
      this.addButton(ctx, { id: "resume", x: L.W / 2 - 110, y: py + 82, w: 220, h: 60, label: T.resume, style: "primary", fontSize: 26 });
      this.addButton(ctx, { id: "menu", x: L.W / 2 - 110, y: py + 158, w: 220, h: 50, label: T.menu, style: "secondary", fontSize: 20 });
      this.iconButtons(ctx, L.W - 14, 12);
    },

    drawGameOver: function (ctx) {
      var L = this.L, T = CFG.text, d = S.data;
      var appear = clamp(this.goT * 3, 0, 1);
      ctx.fillStyle = "rgba(5,8,25," + (0.55 * appear).toFixed(3) + ")";
      ctx.fillRect(0, 0, L.W, L.H);
      var showCont = this.canContinue(), showDouble = this.canDouble();
      var pw = Math.min(L.W - 32, 420);
      var ph = 236 + (showCont ? 70 : 0) + (showDouble ? 62 : 0) + 120;
      var px = L.W / 2 - pw / 2;
      var py = Math.max(10, L.H / 2 - ph / 2) + (1 - appear) * 40;
      ctx.globalAlpha = appear;
      A.drawPanel(ctx, px, py, pw, ph);
      A.text(ctx, T.gameOver, L.W / 2, py + 40, 28, "#ffffff", { weight: "900" });
      A.text(ctx, T.score.toUpperCase(), L.W / 2, py + 82, 15, "rgba(255,255,255,0.7)", { weight: "800" });
      A.text(ctx, String(this.score), L.W / 2, py + 124, 56, "#ffffff", { stroke: "rgba(10,10,30,0.6)", weight: "900" });
      if (this.newBest) {
        var nb = 1 + Math.sin(this.t * 6) * 0.05;
        A.text(ctx, T.newBest, L.W / 2, py + 170, 20 * nb, "#ffd76a", { weight: "900", stroke: "rgba(10,10,30,0.6)" });
      } else {
        A.text(ctx, T.best + " " + d.best, L.W / 2, py + 170, 18, "#ffe9a8", { weight: "800" });
      }
      var coinsShown = this.runCoins * (this.doubled ? 2 : 1);
      ctx.font = A.font(20, "900");
      var label = "+" + coinsShown + " " + T.coinsEarned;
      var tw = ctx.measureText(label).width;
      A.drawCoin(ctx, L.W / 2 - tw / 2 - 12, py + 206, 11);
      A.text(ctx, label, L.W / 2 + 6, py + 207, 20, "#ffffff", { weight: "900" });
      var by = py + 236;
      var bw = Math.min(pw - 48, 300);
      if (showCont) {
        this.addButton(ctx, { id: "continue", x: L.W / 2 - bw / 2, y: by, w: bw, h: 58, label: T.continueAd, sub: T.watchAd, style: "gold", fontSize: 22, ad: true });
        by += 70;
      }
      if (showDouble) {
        this.addButton(ctx, { id: "double", x: L.W / 2 - bw / 2, y: by, w: bw, h: 50, label: T.doubleAd, style: "secondary", fontSize: 18, ad: true });
        by += 62;
      }
      this.addButton(ctx, { id: "again", x: L.W / 2 - bw / 2, y: by + 4, w: bw, h: 58, label: T.again, style: "primary", fontSize: 24 });
      this.addButton(ctx, { id: "menu", x: L.W / 2 - 80, y: by + 72, w: 160, h: 40, label: T.menu, style: "secondary", fontSize: 16 });
      ctx.globalAlpha = 1;
      this.iconButtons(ctx, L.W - 14, 12);
    }
  });
})();
