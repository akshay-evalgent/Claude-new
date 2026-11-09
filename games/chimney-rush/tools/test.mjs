#!/usr/bin/env node
// Automated checks for every build in dist/ (run `node tools/build.mjs` first).
// Uses the Playwright + Chromium that ship with this environment.
//   node tools/test.mjs
import { createRequire } from "node:module";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { serve } from "./serve.mjs";

const require = createRequire(import.meta.url);
const { chromium, devices } = require("playwright");
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST = path.join(ROOT, "dist");

const results = [];
function check(name, ok, detail) {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  (" + detail + ")" : ""}`);
}

// SDK network failures are expected offline/outside the portal; real script errors are not.
function isNoise(text) {
  return /net::ERR|Failed to load resource|ERR_NAME_NOT_RESOLVED|ERR_CONNECTION|ERR_TUNNEL|status of 4\d\d|status of 5\d\d|crazygames|poki|gamedistribution|gamemonetize|googlesyndication|doubleclick|imasdk|Content Security Policy|third-party cookie|Cross-Origin-Opener-Policy|browsingTopics/i.test(text);
}

// An uncaught error counts only if it was thrown by our own page code
// (portal SDKs sometimes throw inside their own scripts outside the portal).
function isOurs(err) {
  const stack = String(err.stack || "");
  if (!stack.includes("://")) return true;
  return /127\.0\.0\.1:\d+\/[^\s)]*index\.html/.test(stack);
}

async function openGame(browser, url, ctxOpts) {
  const ctx = await browser.newContext(ctxOpts || { viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => { if (isOurs(e) && !isNoise(e.message)) errors.push("pageerror: " + e.message); });
  page.on("console", (m) => { if (m.type() === "error" && !isNoise(m.text())) errors.push("console: " + m.text()); });
  await page.goto(url);
  await page.waitForFunction(() => window.__CR_READY === true, null, { timeout: 15000 });
  return { ctx, page, errors };
}

async function clickButton(page, id, touch) {
  const p = await page.evaluate((bid) => {
    const G = window.__CR.Game;
    const b = G.buttons.find((x) => x.id === bid);
    if (!b) return null;
    const r = G.canvas.getBoundingClientRect();
    return { x: r.left + ((b.x + b.w / 2) / G.L.W) * r.width, y: r.top + ((b.y + b.h / 2) / G.L.H) * r.height };
  }, id);
  if (!p) throw new Error(`button "${id}" not on screen`);
  if (touch) await page.touchscreen.tap(p.x, p.y);
  else await page.mouse.click(p.x, p.y);
  await page.waitForTimeout(150);
}

const state = (page) => page.evaluate(() => window.__CR.Game.state);

// Fake SDKs that behave like the documented ones: each ad takes 400 ms and
// records the calls, so we can check order, muting and reward handling.
const MOCKS = {
  crazygames: `window.__calls = [];
    window.CrazyGames = { SDK: {
      environment: "local",
      init: function () { return Promise.resolve(); },
      game: { settings: { muteAudio: false }, addSettingsChangeListener: function () {},
        loadingStart: function () { __calls.push("loadingStart"); }, loadingStop: function () { __calls.push("loadingStop"); },
        gameplayStart: function () { __calls.push("gameplayStart"); }, gameplayStop: function () { __calls.push("gameplayStop"); },
        happytime: function () { __calls.push("happytime"); } },
      ad: { requestAd: function (type, cb) { __calls.push("ad:" + type); cb.adStarted(); setTimeout(function () { window.__mutedDuringAd = window.CR.Audio.adMuted; cb.adFinished(); }, 400); } },
      data: { _d: {}, getItem: function (k) { return this._d[k] || null; }, setItem: function (k, v) { this._d[k] = String(v); } }
    } };`,
  poki: `window.__calls = [];
    window.PokiSDK = {
      init: function () { return Promise.resolve(); },
      gameLoadingFinished: function () { __calls.push("loadingFinished"); },
      gameplayStart: function () { __calls.push("gameplayStart"); }, gameplayStop: function () { __calls.push("gameplayStop"); },
      commercialBreak: function (cb) { __calls.push("commercialBreak"); cb(); return new Promise(function (r) { setTimeout(function () { window.__mutedDuringAd = window.CR.Audio.adMuted; r(); }, 400); }); },
      rewardedBreak: function (cb) { __calls.push("rewardedBreak"); cb(); return new Promise(function (r) { setTimeout(function () { window.__mutedDuringAd = window.CR.Audio.adMuted; r(true); }, 400); }); }
    };`,
  gamedistribution: `window.__calls = [];
    window.gdsdk = {
      preloadAd: function () { return Promise.resolve(); },
      showAd: function (type) {
        var ev = window.GD_OPTIONS.onEvent;
        __calls.push("showAd:" + (type || "preroll"));
        ev({ name: "SDK_GAME_PAUSE" });
        return new Promise(function (r) { setTimeout(function () {
          window.__mutedDuringAd = window.CR.Audio.adMuted;
          if (type === "rewarded") ev({ name: "SDK_REWARDED_WATCH_COMPLETE" });
          ev({ name: "SDK_GAME_START" }); r();
        }, 400); });
      }
    };`,
  gamemonetize: `window.__calls = [];
    window.sdk = { showBanner: function () {
      var ev = window.SDK_OPTIONS.onEvent;
      __calls.push("showBanner"); ev({ name: "SDK_GAME_PAUSE" });
      setTimeout(function () { window.__mutedDuringAd = window.CR.Audio.adMuted; ev({ name: "SDK_GAME_START" }); }, 400);
    } };`,
  y8: `window.__calls = [];
    Object.defineProperty(window, "CR_Y8", { get: function () { return { appId: "test-app", gameId: "test-game" }; }, set: function () {} });
    window.y8 = {
      emitReadyEvent: function () { window.dispatchEvent(new Event("y8sdk.ready")); },
      sdk: function () { return {
        init: function () { __calls.push("init"); },
        showAd: function (o) {
          __calls.push("showAd:" + o.type);
          if (o.type === "reward") o.beforeReward(function () {});
          o.beforeAd();
          setTimeout(function () {
            window.__mutedDuringAd = window.CR.Audio.adMuted;
            if (o.type === "reward") o.adViewed();
            o.afterAd(); o.adBreakDone();
          }, 400);
        } }; }
    };`
};

async function killRun(page) {
  // earn a few coins first so the "double coins" offer has something to double
  await page.evaluate(() => { const G = window.__CR.Game; G.runCoins += 5; G.grace = 0; G.lives = 1; G.fail("missed", 200, 200); });
  await page.waitForFunction(() => window.__CR.Game.state === "gameover", null, { timeout: 5000 });
  await page.waitForTimeout(900);
}

async function adFlowTests(browser, base) {
  const SDK_HOSTS = /^https:\/\/[^/]*(crazygames|poki|gamedistribution|gamemonetize|y8)\.[a-z]+\//i;
  const cases = [
    { build: "crazygames", mock: "crazygames", rewarded: true },
    { build: "crazygames-basic", mock: "crazygames", rewarded: false, noAds: true },
    { build: "poki", mock: "poki", rewarded: true },
    { build: "gamedistribution", mock: "gamedistribution", rewarded: true, preroll: true },
    { build: "gamemonetize", mock: "gamemonetize", rewarded: false },
    { build: "y8", mock: "y8", rewarded: true }
  ];
  for (const c of cases) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    await ctx.route(SDK_HOSTS, (r) => r.abort());
    await ctx.addInitScript(MOCKS[c.mock]);
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(`${base}/${c.build}/index.html?test=1&seed=2`);
    await page.waitForFunction(() => window.__CR_READY === true, null, { timeout: 15000 });
    const tag = `${c.build} (simulated SDK)`;
    await page.evaluate(() => { window.__CR.Storage.data.tutorialDone = true; });
    await clickButton(page, "play");
    if (c.preroll) {
      await page.waitForFunction(() => window.__CR.Game.state === "playing", null, { timeout: 5000 });
      const calls = await page.evaluate(() => window.__calls.slice());
      check(`${tag}: preroll ad before the first run`, calls.includes("showAd:preroll"), calls.join(","));
    } else {
      check(`${tag}: first PLAY starts without an ad`, (await state(page)) === "playing");
    }
    await killRun(page);
    const btns = await page.evaluate(() => window.__CR.Game.buttons.map((b) => b.id));
    check(`${tag}: rewarded buttons ${c.rewarded ? "shown" : "hidden"}`, btns.includes("continue") === c.rewarded && btns.includes("double") === c.rewarded, btns.join(","));
    if (c.rewarded) {
      await page.evaluate(() => { window.__mutedDuringAd = null; });
      await clickButton(page, "continue");
      await page.waitForFunction(() => window.__CR.Game.state === "playing", null, { timeout: 5000 });
      const g = await page.evaluate(() => ({ lives: window.__CR.Game.lives, muted: window.__mutedDuringAd, nowMuted: window.CR.Audio.adMuted }));
      check(`${tag}: rewarded ad continues the run with 1 heart`, g.lives === 1);
      check(`${tag}: audio muted during the ad and restored after`, g.muted === true && g.nowMuted === false);
      await killRun(page);
      const after = await page.evaluate(() => window.__CR.Game.buttons.map((b) => b.id));
      check(`${tag}: continue offered only once per run`, !after.includes("continue"));
    }
    await page.evaluate(() => { window.__calls.length = 0; window.__mutedDuringAd = null; });
    await clickButton(page, "again");
    await page.waitForFunction(() => window.__CR.Game.state === "playing", null, { timeout: 5000 });
    const calls = await page.evaluate(() => window.__calls.slice());
    const muted = await page.evaluate(() => window.__mutedDuringAd);
    const adCall = calls.find((x) => /ad:|commercialBreak|showAd:interstitial|showBanner|showAd:next/.test(x));
    if (c.noAds) check(`${tag}: no ads at all (Basic Launch)`, !adCall, calls.join(","));
    else check(`${tag}: interstitial between runs, game muted`, !!adCall && muted === true, calls.join(","));
    if (c.build === "poki") {
      const all = await page.evaluate(() => window.__calls.slice());
      check(`${tag}: commercialBreak then gameplayStart`, all.indexOf("commercialBreak") >= 0 && all.indexOf("commercialBreak") < all.lastIndexOf("gameplayStart"), all.join(","));
    }
    check(`${tag}: no script errors`, errors.length === 0, errors.slice(0, 2).join(" | "));
    await ctx.close();
  }
}

async function main() {
  if (!fs.existsSync(path.join(DIST, "web", "index.html"))) {
    console.error("dist/ is empty: run `node tools/build.mjs` first");
    process.exit(1);
  }
  const { server, port } = await serve(DIST);
  const base = `http://127.0.0.1:${port}`;
  const browser = await chromium.launch();

  // ---------- full flow on the plain web build ----------
  {
    const { ctx, page, errors } = await openGame(browser, `${base}/web/index.html?test=1&seed=5`);
    check("web: boots to title screen", (await state(page)) === "title");
    await page.evaluate(() => { window.__CR.Storage.data.tutorialDone = true; });
    await clickButton(page, "play");
    check("web: PLAY button starts a run", (await state(page)) === "playing");
    await page.evaluate(() => { window.__CR.Game.autoplay = true; });
    await page.waitForTimeout(22000);
    const s1 = await page.evaluate(() => ({ st: window.__CR.Game.state, stats: window.__CR.Game.stats, wind: window.__CR.Game.windOn }));
    check("web: gifts land in chimneys (autopilot, 22 s)", s1.stats.delivered >= 10 && s1.stats.fails === 0, `delivered ${s1.stats.delivered}, fails ${s1.stats.fails}`);
    check("web: wind kicks in after 10 deliveries", s1.wind === true);
    await page.keyboard.press("Escape");
    check("web: Escape pauses", (await state(page)) === "paused");
    await page.keyboard.press("Space");
    check("web: Space resumes", (await state(page)) === "playing");
    await page.evaluate(() => { window.__CR.Game.autoplay = false; });
    await page.waitForFunction(() => window.__CR.Game.state === "gameover", null, { timeout: 40000 });
    await page.waitForTimeout(900);
    const go = await page.evaluate(() => ({ coins: window.__CR.Storage.data.coins, best: window.__CR.Storage.data.best, buttons: window.__CR.Game.buttons.map((b) => b.id) }));
    check("web: missing chimneys ends the run", true);
    check("web: coins and best score saved", go.coins > 0 && go.best > 0, `coins ${go.coins}, best ${go.best}`);
    check("web: no ad buttons without an ad SDK", !go.buttons.includes("continue") && !go.buttons.includes("double"));
    const saved = await page.evaluate(() => window.localStorage.getItem("chimneyrush.v1"));
    check("web: progress written to localStorage", !!saved && JSON.parse(saved).coins === go.coins);
    await clickButton(page, "again");
    check("web: PLAY AGAIN starts a new run", (await state(page)) === "playing");
    await page.evaluate(() => { window.__CR.Game.toMenu(); window.__CR.Storage.data.coins = 100; });
    await page.waitForTimeout(100);
    await clickButton(page, "shop");
    check("web: shop opens", (await state(page)) === "shop");
    await clickButton(page, "skin:frost");
    const shop = await page.evaluate(() => ({ coins: window.__CR.Storage.data.coins, skin: window.__CR.Storage.data.skin }));
    check("web: buying a sleigh spends coins and equips it", shop.coins === 40 && shop.skin === "frost", JSON.stringify(shop));
    await clickButton(page, "skin:golden");
    check("web: can't buy without enough coins", (await page.evaluate(() => window.__CR.Storage.data.skin)) === "frost");
    await clickButton(page, "back");
    await clickButton(page, "sound");
    check("web: sound toggle persists", (await page.evaluate(() => window.__CR.Storage.data.sound)) === false);
    check("web: no script errors", errors.length === 0, errors.slice(0, 3).join(" | "));
    await ctx.close();
  }

  // ---------- touch: portrait and landscape phones ----------
  for (const [label, opts] of [
    ["phone portrait", { ...devices["iPhone 13"] }],
    ["phone landscape", { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }]
  ]) {
    const { ctx, page, errors } = await openGame(browser, `${base}/web/index.html?test=1&seed=9`, opts);
    await clickButton(page, "play", true);
    check(`${label}: tap PLAY starts`, (await state(page)) === "playing");
    await page.waitForTimeout(400);
    const before = await page.evaluate(() => window.__CR.Game.gifts.length);
    await page.touchscreen.tap(300, 300);
    const after = await page.evaluate(() => window.__CR.Game.gifts.length);
    check(`${label}: tap drops a gift`, after === before + 1);
    await page.evaluate(() => { window.__CR.Game.autoplay = true; });
    await page.waitForTimeout(8000);
    const st = await page.evaluate(() => window.__CR.Game.stats);
    check(`${label}: autopilot delivers`, st.delivered >= 3, `delivered ${st.delivered}`);
    const scroll = await page.evaluate(() => ({ sx: window.scrollX, sy: window.scrollY, w: document.documentElement.scrollWidth, vw: window.innerWidth }));
    check(`${label}: no page scrolling`, scroll.sx === 0 && scroll.sy === 0 && scroll.w <= scroll.vw);
    check(`${label}: no script errors`, errors.length === 0, errors.slice(0, 3).join(" | "));
    await ctx.close();
  }

  // ---------- ad flows against simulated SDKs ----------
  await adFlowTests(browser, base);

  // ---------- each portal build boots and plays with the real SDK ----------
  for (const name of ["itch", "crazygames-basic", "crazygames", "poki", "gamedistribution", "gamemonetize", "y8"]) {
    if (!fs.existsSync(path.join(DIST, name, "index.html"))) { check(`${name}: build exists`, false); continue; }
    let opened;
    try {
      opened = await openGame(browser, `${base}/${name}/index.html?test=1&seed=4`);
    } catch (e) {
      check(`${name}: boots`, false, e.message.split("\n")[0]);
      continue;
    }
    const { ctx, page, errors } = opened;
    const info = await page.evaluate(() => ({ platform: window.__CR.Platform.name, st: window.__CR.Game.state, mid: window.__CR.Platform.hasMidgame, rew: window.__CR.Platform.hasRewarded }));
    check(`${name}: boots to title with the ${info.platform} adapter`, info.st === "title", `ads: midgame ${info.mid}, rewarded ${info.rew}`);
    // the autopilot presses PLAY; portals that need a preroll may spend a few seconds looking for an ad
    await page.evaluate(() => { window.__CR.Game.autoplay = true; });
    await page.waitForFunction(() => window.__CR.Game.state === "playing", null, { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(4500);
    const st = await page.evaluate(() => ({ s: window.__CR.Game.state, d: window.__CR.Game.stats.delivered }));
    check(`${name}: plays`, st.s === "playing" && st.d >= 1, `delivered ${st.d}`);
    check(`${name}: no script errors`, errors.length === 0, errors.slice(0, 3).join(" | "));
    await ctx.close();
  }

  await browser.close();
  server.close();
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
