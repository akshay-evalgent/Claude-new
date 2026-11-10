/*
 * Save data (best score, coins, owned sleighs, sound settings).
 * Uses localStorage by default. A platform adapter can swap the backend
 * (for example to a portal's cloud-save API) by setting CR.Storage.backend.
 */
(function () {
  "use strict";
  var CR = (window.CR = window.CR || {});

  var DEFAULTS = {
    best: 0,
    coins: 0,
    owned: ["classic"],
    skin: "classic",
    sound: true,
    music: true,
    runs: 0,
    tutorialDone: false,
    kidTipDone: false
  };

  var localBackend = {
    getItem: function (k) {
      try { return window.localStorage.getItem(k); } catch (e) { return null; }
    },
    setItem: function (k, v) {
      try { window.localStorage.setItem(k, v); } catch (e) { /* storage blocked: play on without saving */ }
    }
  };

  CR.Storage = {
    backend: localBackend,
    data: null,

    load: function () {
      var parsed = null;
      try {
        var raw = this.backend.getItem(CR.CONFIG.storageKey);
        if (raw) parsed = JSON.parse(raw);
      } catch (e) { parsed = null; }
      var d = {};
      for (var k in DEFAULTS) d[k] = DEFAULTS[k];
      if (parsed && typeof parsed === "object") {
        for (var p in parsed) if (Object.prototype.hasOwnProperty.call(DEFAULTS, p)) d[p] = parsed[p];
      }
      if (!Array.isArray(d.owned)) d.owned = ["classic"];
      if (d.owned.indexOf("classic") < 0) d.owned.push("classic");
      if (typeof d.coins !== "number" || !isFinite(d.coins) || d.coins < 0) d.coins = 0;
      if (typeof d.best !== "number" || !isFinite(d.best) || d.best < 0) d.best = 0;
      if (d.owned.indexOf(d.skin) < 0) d.skin = "classic";
      this.data = d;
      return d;
    },

    save: function () {
      if (!this.data) return;
      try { this.backend.setItem(CR.CONFIG.storageKey, JSON.stringify(this.data)); } catch (e) { /* ignore */ }
    }
  };
})();
