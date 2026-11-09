/*
 * Chimney Rush - game configuration.
 *
 * Everything a reskin needs lives here: name, colours, difficulty, scoring,
 * shop items and every on-screen string. Change values, reload, done.
 */
(function () {
  "use strict";
  var CR = (window.CR = window.CR || {});

  CR.CONFIG = {
    title: "Chimney Rush",
    tagline: "Drop every gift down a chimney!",
    storageKey: "chimneyrush.v1",
    version: "1.0.0",

    colors: {
      skyTop: "#070b24",
      skyMid: "#1b2a63",
      skyBottom: "#3d4f94",
      moon: "#fff4d6",
      moonGlow: "rgba(255, 236, 190, 0.22)",
      hillsFar: "#1a2756",
      hillsNear: "#141f47",
      trees: "#0d1636",
      town: "#18224d",
      townWindow: "rgba(255, 211, 107, 0.75)",
      snow: "#f4f8ff",
      snowShade: "#c7d4f0",
      windowLit: "#ffd36b",
      windowDark: "#26305a",
      brick: "#a3473a",
      brickDark: "#7a3329",
      gold: "#f6c445",
      text: "#ffffff",
      textDim: "rgba(255,255,255,0.72)",
      accent: "#ffcf3f",
      danger: "#ff5a5f",
      good: "#7dffb0",
      panel: "rgba(12, 18, 48, 0.9)",
      panelEdge: "rgba(255, 255, 255, 0.14)",
      overlay: "rgba(5, 8, 25, 0.55)",
      buttonPrimary: ["#ff6b6b", "#e03e52"],
      buttonSecondary: ["#4f6bd8", "#3a4fae"],
      buttonGold: ["#ffd76a", "#f0a92e"],
      buttonDisabled: ["#5b6280", "#454b66"]
    },

    houseWalls: ["#c8553d", "#3f72af", "#7aa95c", "#8e6bbf", "#e0913a", "#3fa7b8", "#c9a27e", "#d96c8a"],
    houseRoofs: ["#4a2323", "#22314f", "#2e4a26", "#3d2650", "#4f3a22", "#2a2a3d"],
    giftColors: ["#e63946", "#2a9d8f", "#f4a261", "#4ea8de", "#b5179e", "#ffb703", "#7bd389"],
    ribbonColors: ["#ffd166", "#ffffff", "#ffd166", "#ffe8a3", "#ffffff", "#e63946", "#ffffff"],

    // World physics, in logical units (the screen is always at least 640 x 600 units).
    physics: {
      gravity: 1200,
      giftSize: 24,
      dropCooldown: 0.26
    },

    difficulty: {
      startSpeed: 190,
      maxSpeed: 380,
      rampSeconds: 150, // seconds of play to reach full difficulty
      rampDeliveries: 70, // ...or this many deliveries, whichever comes first
      gap: [[90, 190], [45, 115]], // [min,max] gap between houses at start -> at full difficulty
      chimneyWidth: [54, 38],
      noChimneyChance: 0.14,
      doubleChimneyAfter: 14, // deliveries before double-chimney houses appear
      doubleChance: [0.18, 0.4],
      goldenChance: 0.09,
      windAfter: 10, // deliveries before wind starts
      windMax: [55, 150] // max sideways push (units/s^2)
    },

    lives: 3,
    healEvery: 25, // deliveries per extra heart (up to the max)

    scoring: {
      deliver: 10,
      perfectBonus: 5,
      perfectWindow: 6, // units from the chimney centre that count as "perfect"
      comboStep: 5, // deliveries per +1 multiplier
      maxMultiplier: 5,
      feverEvery: 12, // combo needed to trigger Fever (double points)
      feverSeconds: 8,
      coinsPerDelivery: 1,
      coinsPerfect: 1,
      coinsGolden: 5
    },

    ads: {
      midgameMinInterval: 60, // seconds between interstitials (portals also rate-limit)
      rewardedContinue: true,
      rewardedDoubleCoins: true
    },

    // Shop items. pattern: "solid" | "stripes" | "stars"
    skins: [
      { id: "classic", name: "Classic", price: 0, body: "#d62839", dark: "#8f1424", trim: "#ffd166", runner: "#e3e9f5", pattern: "solid" },
      { id: "frost", name: "Frost", price: 60, body: "#58c4ee", dark: "#2a7fa8", trim: "#ffffff", runner: "#d6f1ff", pattern: "stars" },
      { id: "evergreen", name: "Evergreen", price: 150, body: "#2a9d8f", dark: "#176358", trim: "#f2cc6b", runner: "#e3e9f5", pattern: "solid" },
      { id: "candy", name: "Candy Cane", price: 260, body: "#fbfbff", dark: "#b8c0d8", trim: "#e63946", runner: "#ffd6da", pattern: "stripes", stripe: "#e63946" },
      { id: "midnight", name: "Midnight", price: 420, body: "#3a1f9e", dark: "#1f0f5c", trim: "#ff4fa0", runner: "#c3c8ff", pattern: "stars" },
      { id: "golden", name: "Golden", price: 750, body: "#f2b81d", dark: "#a8780a", trim: "#fff3b0", runner: "#fff8dc", pattern: "stars", sparkle: true }
    ],

    text: {
      play: "PLAY",
      shop: "SLEIGHS",
      back: "BACK",
      resume: "RESUME",
      menu: "MENU",
      again: "PLAY AGAIN",
      paused: "Paused",
      gameOver: "Out of hearts!",
      score: "Score",
      best: "Best",
      newBest: "NEW BEST!",
      coinsEarned: "coins",
      continueAd: "CONTINUE",
      doubleAd: "DOUBLE COINS",
      watchAd: "watch an ad",
      owned: "OWNED",
      using: "USING",
      tutorial1: "Tap, click or press SPACE to drop a gift",
      tutorial2: "Every chimney needs a gift. Misses cost a heart!",
      perfect: "PERFECT!",
      missed: "Missed!",
      oops: "Oops!",
      bonk: "Bonk!",
      fever: "FEVER! x2",
      heart: "+1 HEART",
      wind: "WIND",
      windIntro: "Wind! Gifts drift sideways",
      doubles: "Double chimneys!",
      faster: "Faster!",
      loading: "Loading...",
      rotateHint: "",
      notEnough: "Not enough coins"
    }
  };
})();
