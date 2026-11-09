/*
 * Chimney Rush - platform adapter.
 *
 * One small interface the game talks to, with one implementation per portal.
 * The build script sets window.CR_PLATFORM and adds the portal's SDK <script>
 * to the page head. Every call is guarded: if an SDK fails to load (ad blocker,
 * offline, local testing) the game keeps working without ads.
 *
 *   init()              -> Promise, resolves when the SDK is ready (or gave up)
 *   loadingStart() / loadingDone()
 *   gameplayStart() / gameplayStop()
 *   happyTime()         -> "something great happened" (CrazyGames)
 *   prerollAd()         -> Promise, ad before the first run (portals that require one)
 *   midgameAd()         -> Promise, interstitial between runs
 *   rewardedAd()        -> Promise<boolean>, true only if the reward was earned
 *   hasMidgame / hasRewarded / prerollOnFirstPlay
 *   midgameInterval     -> our own minimum seconds between interstitials
 *                          (0 when the portal controls ad frequency itself)
 */
(function () {
  "use strict";
  var CR = (window.CR = window.CR || {});

  // Ads enabled? The CrazyGames "Basic Launch" build turns them off.
  var ADS_ON = window.CR_ADS !== false;

  function mute(on) {
    if (CR.Audio) CR.Audio.setAdMute(on);
    if (on && CR.Game && CR.Game.onAdStart) CR.Game.onAdStart();
  }

  function waitFor(test, timeoutMs) {
    return new Promise(function (resolve) {
      var start = Date.now();
      (function poll() {
        var v = null;
        try { v = test(); } catch (e) { v = null; }
        if (v) return resolve(v);
        if (Date.now() - start > timeoutMs) return resolve(null);
        setTimeout(poll, 50);
      })();
    });
  }

  // Wrap an ad call so the game is always unmuted afterwards and the promise
  // always settles, even if the SDK never calls back.
  function guardedAd(run, timeoutMs, fallbackValue) {
    return new Promise(function (resolve) {
      var done = false;
      var timer = setTimeout(function () { finish(fallbackValue); }, timeoutMs);
      function finish(v) {
        if (done) return;
        done = true;
        clearTimeout(timer);
        if (CR.Audio) CR.Audio.setAdMute(false);
        resolve(v);
      }
      try { run(finish); } catch (e) { finish(fallbackValue); }
    });
  }

  var base = {
    name: "none",
    hasMidgame: false,
    hasRewarded: false,
    prerollOnFirstPlay: false,
    midgameInterval: null, // null = use CONFIG.ads.midgameMinInterval
    init: function () { return Promise.resolve(); },
    loadingStart: function () {},
    loadingDone: function () {},
    gameplayStart: function () {},
    gameplayStop: function () {},
    happyTime: function () {},
    prerollAd: function () { return this.midgameAd(); },
    midgameAd: function () { return Promise.resolve(); },
    rewardedAd: function () { return Promise.resolve(false); }
  };

  function extend(o) {
    var out = {}, k;
    for (k in base) out[k] = base[k];
    for (k in o) out[k] = o[k];
    return out;
  }

  // SDK events that arrive before this file loads are buffered by the page head.
  function drainEvents(adapter) {
    var q = window.__crSdkEvents || [];
    window.__crSdkEvents = [];
    for (var i = 0; i < q.length; i++) adapter._onEvent(q[i]);
  }

  var adapters = {};
  adapters.none = extend({});

  // ------------------------------------------------------------ CrazyGames SDK v3
  // docs.crazygames.com/sdk : midgame ads are capped by CrazyGames (1 per 3 min)
  // and the player's site-wide mute setting overrides our own sound toggle.
  adapters.crazygames = extend({
    name: "crazygames",
    sdk: null,
    midgameInterval: 0,
    init: function () {
      var self = this;
      return waitFor(function () { return window.CrazyGames && window.CrazyGames.SDK; }, 6000).then(function (sdk) {
        if (!sdk) return;
        return Promise.resolve(sdk.init()).then(function () {
          if (sdk.environment === "disabled") return;
          self.sdk = sdk;
          self.hasMidgame = ADS_ON;
          self.hasRewarded = ADS_ON;
          if (sdk.data && typeof sdk.data.getItem === "function") {
            CR.Storage.backend = {
              getItem: function (k) { try { return sdk.data.getItem(k); } catch (e) { return null; } },
              setItem: function (k, v) { try { sdk.data.setItem(k, v); } catch (e) { /* ignore */ } }
            };
          }
          try {
            var settings = sdk.game.settings || {};
            if (CR.Audio) CR.Audio.setForceMute(!!settings.muteAudio);
            if (typeof sdk.game.addSettingsChangeListener === "function") {
              sdk.game.addSettingsChangeListener(function (s) {
                if (s && CR.Audio) CR.Audio.setForceMute(!!s.muteAudio);
              });
            }
          } catch (e) { /* ignore */ }
          try { sdk.game.loadingStart(); } catch (e) { /* ignore */ }
        });
      }).catch(function () { self.sdk = null; });
    },
    loadingDone: function () { if (this.sdk) try { this.sdk.game.loadingStop(); } catch (e) { /* ignore */ } },
    gameplayStart: function () { if (this.sdk) try { this.sdk.game.gameplayStart(); } catch (e) { /* ignore */ } },
    gameplayStop: function () { if (this.sdk) try { this.sdk.game.gameplayStop(); } catch (e) { /* ignore */ } },
    happyTime: function () { if (this.sdk) try { this.sdk.game.happytime(); } catch (e) { /* ignore */ } },
    midgameAd: function () {
      var sdk = this.sdk;
      if (!sdk || !this.hasMidgame) return Promise.resolve();
      return guardedAd(function (finish) {
        sdk.ad.requestAd("midgame", {
          adStarted: function () { mute(true); },
          adFinished: function () { finish(); },
          adError: function () { finish(); }
        });
      }, 60000);
    },
    rewardedAd: function () {
      var sdk = this.sdk;
      if (!sdk || !this.hasRewarded) return Promise.resolve(false);
      return guardedAd(function (finish) {
        sdk.ad.requestAd("rewarded", {
          adStarted: function () { mute(true); },
          adFinished: function () { finish(true); }, // reward only on adFinished
          adError: function () { finish(false); }
        });
      }, 90000, false);
    }
  });

  // ------------------------------------------------------------ Poki SDK v2
  // developers.poki.com : Poki controls ad frequency, so we never add our own timer,
  // and we call commercialBreak at every natural break (gameplayStop -> ad -> gameplayStart).
  adapters.poki = extend({
    name: "poki",
    sdk: null,
    midgameInterval: 0,
    init: function () {
      var self = this;
      return waitFor(function () { return window.PokiSDK; }, 6000).then(function (sdk) {
        if (!sdk) return;
        function ready() {
          self.sdk = sdk;
          self.hasMidgame = ADS_ON;
          self.hasRewarded = ADS_ON;
        }
        // init() rejects when an ad blocker is active; the game must still run.
        return sdk.init().then(ready, ready);
      });
    },
    loadingDone: function () { if (this.sdk) try { this.sdk.gameLoadingFinished(); } catch (e) { /* ignore */ } },
    gameplayStart: function () { if (this.sdk) try { this.sdk.gameplayStart(); } catch (e) { /* ignore */ } },
    gameplayStop: function () { if (this.sdk) try { this.sdk.gameplayStop(); } catch (e) { /* ignore */ } },
    midgameAd: function () {
      var sdk = this.sdk;
      if (!sdk || !this.hasMidgame) return Promise.resolve();
      return guardedAd(function (finish) {
        // The pause callback is not always called, so mute here and resume in then().
        sdk.commercialBreak(function () { mute(true); }).then(function () { finish(); }, function () { finish(); });
      }, 60000);
    },
    rewardedAd: function () {
      var sdk = this.sdk;
      if (!sdk || !this.hasRewarded) return Promise.resolve(false);
      return guardedAd(function (finish) {
        sdk.rewardedBreak(function () { mute(true); }).then(function (ok) { finish(!!ok); }, function () { finish(false); });
      }, 90000, false);
    }
  });

  // ------------------------------------------------------------ GameDistribution HTML5 SDK
  // gamedistribution.com/developers/faq : a preroll (showAd before gameplay) is mandatory,
  // ads only after user input, reward only on SDK_REWARDED_WATCH_COMPLETE,
  // audio restored on SDK_GAME_START and SDK_ERROR. The SDK throttles ad frequency.
  adapters.gamedistribution = extend({
    name: "gamedistribution",
    ready: false,
    rewardEarned: false,
    pending: null,
    prerollOnFirstPlay: true,
    midgameInterval: 0,
    gd: function () {
      var g = window.gdsdk;
      return g && typeof g.showAd === "function" ? g : null;
    },
    init: function () {
      var self = this;
      drainEvents(this);
      return waitFor(function () { return self.ready || self.gd(); }, 6000).then(function (ok) {
        if (ok && ADS_ON) { self.hasMidgame = true; self.hasRewarded = true; }
        self.preloadRewarded();
      });
    },
    preloadRewarded: function () {
      var g = this.gd();
      try { if (g && typeof g.preloadAd === "function") { var p = g.preloadAd("rewarded"); if (p && p.catch) p.catch(function () {}); } } catch (e) { /* ignore */ }
    },
    _onEvent: function (ev) {
      var n = ev && ev.name;
      if (n === "SDK_READY") this.ready = true;
      else if (n === "SDK_GAME_PAUSE") mute(true);
      else if (n === "SDK_GAME_START" || n === "SDK_ERROR" || n === "AD_ERROR") {
        if (CR.Audio) CR.Audio.setAdMute(false);
        if (this.pending) this.pending();
      } else if (n === "SDK_REWARDED_WATCH_COMPLETE") this.rewardEarned = true;
    },
    _show: function (type, isRewarded) {
      var self = this, g = this.gd();
      if (!g || !ADS_ON) return Promise.resolve(isRewarded ? false : undefined);
      this.rewardEarned = false;
      var fallback = isRewarded ? false : undefined;
      return guardedAd(function (finish) {
        self.pending = function () {
          self.pending = null;
          // give the WATCH_COMPLETE event a moment to arrive before deciding
          setTimeout(function () { finish(isRewarded ? self.rewardEarned : undefined); }, isRewarded ? 300 : 0);
        };
        var p = type ? g.showAd(type) : g.showAd();
        if (p && typeof p.then === "function") {
          p.then(function () { if (self.pending) self.pending(); }, function () { self.pending = null; finish(fallback); });
        }
      }, isRewarded ? 90000 : 60000, fallback).then(function (v) {
        if (isRewarded) self.preloadRewarded();
        return v;
      });
    },
    prerollAd: function () { return this._show(null, false); },
    midgameAd: function () { return this._show("interstitial", false); },
    rewardedAd: function () { return this._show("rewarded", true); }
  });

  // ------------------------------------------------------------ GameMonetize SDK
  // github.com/MonetizeGame/GameMonetize.com-SDK : interstitial via sdk.showBanner(),
  // no rewarded ads. The SDK itself handles preroll and frequency.
  adapters.gamemonetize = extend({
    name: "gamemonetize",
    ready: false,
    pending: null,
    midgameInterval: 0,
    gm: function () {
      var s = window.sdk;
      return s && typeof s.showBanner === "function" ? s : null;
    },
    init: function () {
      var self = this;
      drainEvents(this);
      return waitFor(function () { return self.ready || self.gm(); }, 6000).then(function (ok) {
        if (ok && ADS_ON) self.hasMidgame = true;
      });
    },
    _onEvent: function (ev) {
      var n = ev && ev.name;
      if (n === "SDK_READY") this.ready = true;
      else if (n === "SDK_GAME_PAUSE") mute(true);
      else if (n === "SDK_GAME_START") {
        if (CR.Audio) CR.Audio.setAdMute(false);
        if (this.pending) this.pending();
      }
    },
    midgameAd: function () {
      var self = this, s = this.gm();
      if (!s || !this.hasMidgame) return Promise.resolve();
      return guardedAd(function (finish) {
        self.pending = function () { self.pending = null; finish(); };
        s.showBanner();
        // No pause event within 2.5 s means no ad will show: carry on.
        setTimeout(function () { if (self.pending && !(CR.Audio && CR.Audio.adMuted)) self.pending(); }, 2500);
      }, 60000);
    }
  });

  // ------------------------------------------------------------ Y8 minimal SDK 2.0
  // docs.y8.com/sdk : Y8 runs its own preroll, interstitials ("next") only after a
  // button press, pause inside beforeAd. A capped or unfilled break fires no
  // callbacks, so we stop waiting if beforeAd doesn't arrive quickly.
  adapters.y8 = extend({
    name: "y8",
    sdk: null,
    midgameInterval: 0,
    init: function () {
      var self = this;
      var ids = window.CR_Y8 || {};
      return new Promise(function (resolve) {
        var settled = false;
        function done() { if (!settled) { settled = true; resolve(); } }
        function onReady() {
          try {
            var y = window.y8.sdk();
            var r = y.init({ appId: ids.appId, autoLogin: false }, { gameId: ids.gameId });
            self.sdk = y;
            self.hasMidgame = ADS_ON && !!ids.gameId && typeof y.showAd === "function";
            self.hasRewarded = self.hasMidgame;
            if (r && typeof r.then === "function") r.then(done, done); else done();
          } catch (e) { self.sdk = null; done(); }
        }
        window.addEventListener("y8sdk.ready", onReady, { once: true });
        if (window.y8 && window.y8.emitReadyEvent) { try { window.y8.emitReadyEvent(); } catch (e) { /* ignore */ } }
        setTimeout(done, 6000);
      });
    },
    _break: function (type, name, isRewarded) {
      var y = this.sdk;
      if (!y || !this.hasMidgame) return Promise.resolve(isRewarded ? false : undefined);
      var fallback = isRewarded ? false : undefined;
      return guardedAd(function (finish) {
        var started = false, viewed = false;
        y.showAd({
          type: type,
          name: name,
          beforeAd: function () { started = true; mute(true); },
          afterAd: function () { setTimeout(function () { finish(isRewarded ? viewed : undefined); }, 60); },
          beforeReward: function (showAdFn) { started = true; showAdFn(); },
          adViewed: function () { viewed = true; },
          adDismissed: function () { viewed = false; },
          adBreakDone: function () { finish(isRewarded ? viewed : undefined); }
        });
        setTimeout(function () { if (!started) finish(fallback); }, isRewarded ? 3000 : 2000);
      }, isRewarded ? 90000 : 60000, fallback);
    },
    midgameAd: function () { return this._break("next", "restart", false); },
    rewardedAd: function () { return this._break("reward", "continue", true); }
  });

  var name = window.CR_PLATFORM || "none";
  CR.Platform = adapters[name] || adapters.none;
  CR.Platform.adapters = adapters;
})();
