/*
 * Procedural sound effects and music (Web Audio API). No audio files.
 * Audio only starts after the first tap/click/keypress, as browsers require.
 */
(function () {
  "use strict";
  var CR = (window.CR = window.CR || {});

  function midi(n) { return 440 * Math.pow(2, (n - 69) / 12); }

  // Original 8-bar loop in G major pentatonic (eighth notes, 0 = rest).
  var MELODY = [
    74, 0, 71, 0, 74, 76, 74, 0,
    71, 0, 69, 0, 67, 0, 0, 0,
    69, 0, 71, 0, 74, 0, 76, 0,
    74, 0, 71, 0, 69, 0, 0, 0,
    67, 0, 69, 0, 71, 74, 76, 0,
    79, 0, 76, 0, 74, 0, 0, 0,
    71, 0, 74, 0, 69, 0, 71, 0,
    67, 0, 0, 0, 0, 0, 0, 0
  ];
  // Bass root per bar (G, G, C, D, G, C, D, G).
  var BASS = [43, 43, 48, 50, 43, 48, 50, 43];

  var AU = (CR.Audio = {
    ctx: null,
    master: null,
    sfxBus: null,
    musicBus: null,
    noiseBuf: null,
    soundOn: true,
    musicOn: true,
    adMuted: false,
    paused: false,
    hidden: false,
    musicWanted: false,
    timer: null,
    nextNoteTime: 0,
    step: 0,
    tempo: 116,

    unlock: function () {
      if (this.ctx) {
        if (this.ctx.state === "suspended" && !this.hidden) this.ctx.resume().catch(function () {});
        return;
      }
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      try { this.ctx = new AC(); } catch (e) { this.ctx = null; return; }
      var c = this.ctx;
      this.master = c.createGain();
      this.master.gain.value = 0.9;
      this.master.connect(c.destination);
      this.sfxBus = c.createGain();
      this.musicBus = c.createGain();
      this.sfxBus.connect(this.master);
      this.musicBus.connect(this.master);
      var len = Math.floor(c.sampleRate * 1.0);
      this.noiseBuf = c.createBuffer(1, len, c.sampleRate);
      var ch = this.noiseBuf.getChannelData(0);
      for (var i = 0; i < len; i++) ch[i] = Math.random() * 2 - 1;
      this.applyVolumes(true);
      if (this.musicWanted) this._startScheduler();
    },

    applyVolumes: function (instant) {
      if (!this.ctx) return;
      var t = this.ctx.currentTime;
      var allow = !this.adMuted && !this.paused && !this.hidden && !this.forceMuted;
      var sv = allow && this.soundOn ? 0.85 : 0;
      var mv = allow && this.musicOn ? 0.42 : 0;
      if (instant) {
        this.sfxBus.gain.setValueAtTime(sv, t);
        this.musicBus.gain.setValueAtTime(mv, t);
      } else {
        this.sfxBus.gain.setTargetAtTime(sv, t, 0.03);
        this.musicBus.gain.setTargetAtTime(mv, t, 0.08);
      }
    },

    setSound: function (on) { this.soundOn = !!on; this.applyVolumes(); },
    setMusic: function (on) { this.musicOn = !!on; this.applyVolumes(); },
    setPaused: function (p) { this.paused = !!p; this.applyVolumes(); },

    // A portal-level mute (e.g. CrazyGames' site-wide setting) overrides our toggles.
    forceMuted: false,
    setForceMute: function (m) { this.forceMuted = !!m; this.applyVolumes(); },

    // Ads must always be silent: mute everything instantly and suspend the context.
    setAdMute: function (m) {
      this.adMuted = !!m;
      this.applyVolumes(true);
      if (!this.ctx) return;
      if (m) this.ctx.suspend().catch(function () {});
      else if (!this.hidden) this.ctx.resume().catch(function () {});
    },

    setHidden: function (h) {
      this.hidden = !!h;
      this.applyVolumes(true);
      if (!this.ctx) return;
      if (h) this.ctx.suspend().catch(function () {});
      else if (!this.adMuted) this.ctx.resume().catch(function () {});
    },

    // ---------- synth primitives ----------
    tone: function (freq, dur, o) {
      var c = this.ctx;
      if (!c) return;
      o = o || {};
      var t = c.currentTime + (o.when || 0);
      var osc = c.createOscillator();
      var g = c.createGain();
      var vol = o.vol || 0.2;
      osc.type = o.type || "sine";
      osc.frequency.setValueAtTime(freq, t);
      if (o.slideTo) osc.frequency.exponentialRampToValueAtTime(o.slideTo, t + dur);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + (o.attack || 0.005));
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(g);
      g.connect(o.bus || this.sfxBus);
      osc.start(t);
      osc.stop(t + dur + 0.03);
    },

    noise: function (dur, o) {
      var c = this.ctx;
      if (!c || !this.noiseBuf) return;
      o = o || {};
      var t = c.currentTime + (o.when || 0);
      var src = c.createBufferSource();
      src.buffer = this.noiseBuf;
      var f = c.createBiquadFilter();
      f.type = o.type || "bandpass";
      f.frequency.setValueAtTime(o.freq || 1000, t);
      if (o.slideTo) f.frequency.exponentialRampToValueAtTime(o.slideTo, t + dur);
      f.Q.value = o.q || 1;
      var g = c.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(o.vol || 0.15, t + (o.attack || 0.01));
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(f);
      f.connect(g);
      g.connect(o.bus || this.sfxBus);
      src.start(t, Math.random() * 0.5);
      src.stop(t + dur + 0.03);
    },

    bell: function (freq, dur, vol, when, bus) {
      this.tone(freq, dur, { type: "sine", vol: vol, when: when, bus: bus });
      this.tone(freq * 2.0, dur * 0.55, { type: "sine", vol: vol * 0.3, when: when, bus: bus });
      this.tone(freq * 3.01, dur * 0.3, { type: "triangle", vol: vol * 0.1, when: when, bus: bus });
    },

    play: function (name, p) {
      if (!this.ctx || !this.soundOn || this.adMuted || this.forceMuted) return;
      var i, base;
      switch (name) {
        case "drop":
          this.noise(0.13, { vol: 0.09, type: "bandpass", freq: 1400, slideTo: 450, q: 0.9 });
          this.tone(560, 0.09, { type: "triangle", vol: 0.05, slideTo: 330 });
          break;
        case "deliver":
          base = 620 * Math.pow(2, Math.min(p || 0, 14) / 24);
          this.bell(base, 0.5, 0.18);
          this.bell(base * 1.5, 0.4, 0.09, 0.06);
          break;
        case "perfect":
          base = 880;
          var arp = [1, 1.25, 1.5, 2];
          for (i = 0; i < arp.length; i++) this.bell(base * arp[i], 0.35, 0.09, i * 0.045);
          break;
        case "miss":
          this.tone(200, 0.28, { type: "square", vol: 0.06, slideTo: 85 });
          this.noise(0.18, { vol: 0.12, type: "lowpass", freq: 600 });
          break;
        case "bonk":
          this.tone(330, 0.12, { type: "square", vol: 0.05, slideTo: 160 });
          this.noise(0.08, { vol: 0.1, type: "bandpass", freq: 1800 });
          break;
        case "coin":
          this.tone(1320, 0.07, { type: "square", vol: 0.035 });
          this.tone(1760, 0.1, { type: "square", vol: 0.035, when: 0.06 });
          break;
        case "click":
          this.tone(880, 0.05, { type: "triangle", vol: 0.07 });
          break;
        case "buy":
          var up = [523, 659, 784, 1046];
          for (i = 0; i < up.length; i++) this.bell(up[i], 0.3, 0.1, i * 0.07);
          break;
        case "deny":
          this.tone(220, 0.12, { type: "square", vol: 0.05 });
          this.tone(180, 0.16, { type: "square", vol: 0.05, when: 0.1 });
          break;
        case "heal":
          this.bell(784, 0.4, 0.12);
          this.bell(1046, 0.5, 0.12, 0.12);
          break;
        case "fever":
          var f = [523, 659, 784, 1046, 1318];
          for (i = 0; i < f.length; i++) this.tone(f[i], 0.18, { type: "triangle", vol: 0.07, when: i * 0.05 });
          break;
        case "wind":
          this.noise(1.1, { vol: 0.05, type: "bandpass", freq: 380, slideTo: 1300, q: 0.6, attack: 0.3 });
          break;
        case "gameover":
          var d = [523, 440, 349, 262];
          for (i = 0; i < d.length; i++) this.bell(d[i], 0.6, 0.12, i * 0.17);
          break;
        case "kidHop":
          this.tone(280, 0.16, { type: "triangle", vol: 0.05, slideTo: 620 });
          break;
        case "steal":
          // cheeky "hehe"
          this.tone(900, 0.08, { type: "square", vol: 0.045, slideTo: 700 });
          this.tone(1000, 0.1, { type: "square", vol: 0.045, slideTo: 760, when: 0.11 });
          break;
        case "kidBonk":
          this.tone(420, 0.35, { type: "sine", vol: 0.16, slideTo: 110 });
          this.tone(660, 0.12, { type: "square", vol: 0.04, slideTo: 330, when: 0.02 });
          this.noise(0.12, { vol: 0.12, type: "bandpass", freq: 1500 });
          break;
        case "kidAlert":
          this.tone(740, 0.09, { type: "triangle", vol: 0.05 });
          this.tone(988, 0.12, { type: "triangle", vol: 0.05, when: 0.1 });
          break;
        case "start":
          this.bell(659, 0.3, 0.1);
          this.bell(988, 0.4, 0.1, 0.08);
          break;
      }
    },

    // ---------- music ----------
    startMusic: function () {
      this.musicWanted = true;
      if (this.ctx) this._startScheduler();
    },

    stopMusic: function () {
      this.musicWanted = false;
      if (this.timer) { clearInterval(this.timer); this.timer = null; }
    },

    _startScheduler: function () {
      if (this.timer || !this.ctx) return;
      var self = this;
      this.step = 0;
      this.nextNoteTime = this.ctx.currentTime + 0.12;
      this.timer = setInterval(function () { self._schedule(); }, 60);
    },

    _schedule: function () {
      var c = this.ctx;
      if (!c || c.state !== "running") return;
      var spb = 60 / this.tempo / 2; // eighth note
      if (this.nextNoteTime < c.currentTime - 0.5) this.nextNoteTime = c.currentTime + 0.05; // resync after a pause
      while (this.nextNoteTime < c.currentTime + 0.3) {
        var when = this.nextNoteTime - c.currentTime;
        var s = this.step;
        var n = MELODY[s % MELODY.length];
        if (n) this.bell(midi(n), 0.5, 0.06, when, this.musicBus);
        var bar = Math.floor(s / 8) % BASS.length;
        if (s % 8 === 0) this.tone(midi(BASS[bar]), 0.5, { type: "triangle", vol: 0.09, when: when, bus: this.musicBus });
        if (s % 8 === 4) this.tone(midi(BASS[bar] + 7), 0.45, { type: "triangle", vol: 0.07, when: when, bus: this.musicBus });
        if (s % 2 === 1) this.noise(0.05, { vol: 0.018, type: "highpass", freq: 7000, when: when, bus: this.musicBus });
        this.nextNoteTime += spb;
        this.step = (this.step + 1) % MELODY.length;
      }
    }
  });
})();
