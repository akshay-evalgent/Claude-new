# Chimney Rush

A one-tap holiday arcade game for web game portals. Players fly a sleigh over a snowy town and drop a gift down every chimney. Wind, double chimneys, golden bonus chimneys, combos, a Fever mode and six unlockable sleighs keep it interesting.

It's built to test which marketplaces pay. The same game is packaged for CrazyGames, GameDistribution, GameMonetize, Y8, Poki and itch.io. The source code is also packaged as a $12 template for itch.io and Gumroad.

**To launch it:** follow [`docs/LAUNCH-CHECKLIST.md`](docs/LAUNCH-CHECKLIST.md).

## Play it locally

Open `src/index.html` in a browser. It works straight from the files, with no server.

## Commands

You need [Node.js](https://nodejs.org) 18+. The tests and assets also need Playwright with Chromium, and ffmpeg for the videos.

```bash
node tools/build.mjs
```

This writes one zip per platform to `release/`, plus `dist/artifact/chimney-rush.html`, the single-file demo.

```bash
node tools/test.mjs
```

This plays every build in a headless browser, including ad flows against simulated portal SDKs. It currently passes 84 checks.

```bash
node tools/assets.mjs
```

This renders covers, thumbnails, screenshots and gameplay videos into `listings/`.

```bash
node tools/check-listings.mjs
```

This checks the store text against the platforms' length limits and confirms every referenced file exists.

## What's where

| Path | What |
|---|---|
| `src/js/config.js` | Name, colours, difficulty, scoring, shop, every on-screen word |
| `src/js/game.js` | Rules, screens, input, ad flow |
| `src/js/art.js` | All drawing (no image files) |
| `src/js/audio.js` | Sound effects and music generated in code (no audio files) |
| `src/js/platform.js` | One adapter per portal SDK |
| `platform-ids.json` | Game IDs from GameDistribution, GameMonetize and Y8 |
| `release/` | Upload-ready zips |
| `listings/` | Store text, images and videos |
| `docs/` | Launch checklist, tracker, template README and license |

## Platform builds

| Zip | Use it for | Ads |
|---|---|---|
| `chimney-rush-itch.zip` | itch.io | none |
| `chimney-rush-crazygames-basic.zip` | CrazyGames Basic Launch | none (SDK gameplay events only) |
| `chimney-rush-crazygames.zip` | CrazyGames Full Launch | midgame + rewarded |
| `chimney-rush-gamedistribution.zip` | GameDistribution | preroll, interstitial, rewarded |
| `chimney-rush-gamemonetize.zip` | GameMonetize | interstitial |
| `chimney-rush-y8.zip` | Y8 | interstitial + rewarded |
| `chimney-rush-poki.zip` | Poki (only if they accept it) | commercial + rewarded breaks |
| `chimney-rush-web.zip` | your own site | none |
| `chimney-rush-template-v1.0.0.zip` | template for sale | n/a |

The GameDistribution, GameMonetize and Y8 zips need the IDs those portals give you. Add them to `platform-ids.json` and rebuild.

## AI disclosure

The code, procedural art and sound were written with Claude, then tested in a real browser, with automated play on desktop and phones. No AI runs inside the game.
