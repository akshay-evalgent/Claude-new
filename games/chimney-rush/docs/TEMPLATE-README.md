# Chimney Rush: HTML5 one-tap game template

A complete, polished one-tap arcade game you can reskin and publish under your own name. Plain JavaScript and Canvas: no engine, no dependencies, no image or audio files. The whole game is about 30 KB.

**What players do:** fly a sleigh over a snowy town and drop a gift down every chimney. Wind pushes falling gifts sideways, double chimneys need two quick drops, golden chimneys pay bonus coins, and streaks trigger a double-points Fever mode. Coins buy six sleigh skins.

## What's included

- The full game source in `src/` (7 small, commented JavaScript files).
- Ad integrations, already wired and tested, for **CrazyGames (SDK v3)**, **Poki (SDK v2)**, **GameDistribution** and **GameMonetize**. They cover interstitial ads between runs, rewarded ads ("continue" and "double coins"), gameplay start/stop events, and muting during ads.
- A build script that writes one upload-ready zip per portal.
- A script that renders cover images and thumbnails at any size, straight from the game's own drawing code.
- An automated test script (Playwright) that plays every build in a real browser.
- Mobile and desktop support: touch, mouse and keyboard; portrait and landscape; sharp on high-DPI screens.
- Save data (best score, coins, unlocked skins, sound settings) in localStorage, or in CrazyGames' cloud save when it's available.
- Sound effects and music generated in code (Web Audio API): nothing to license.

## Quick start

1. Open `src/index.html` in a browser. The game runs directly from the files.
2. Change anything in `src/js/config.js` and reload.
3. When you're ready to publish, build the zips. You need [Node.js](https://nodejs.org) 18 or newer:

```bash
node tools/build.mjs
```

The zips appear in `release/`: one per portal, plus `web` and `itch` builds without ads.

## Reskinning

Almost everything lives in `src/js/config.js`:

| What | Where in `config.js` |
|---|---|
| Game name and tagline | `title`, `tagline` |
| Sky, snow, UI and button colours | `colors` |
| House, roof, gift and ribbon colours | `houseWalls`, `houseRoofs`, `giftColors`, `ribbonColors` |
| Speed, gaps, chimney sizes, wind | `difficulty` |
| Lives and healing | `lives`, `healEvery` |
| Points, combos, Fever, coin rewards | `scoring` |
| Ad frequency and which rewarded ads exist | `ads` |
| Shop items (colours, pattern, price) | `skins` |
| Every on-screen word | `text` (translate the game here) |

To change the artwork itself, edit `src/js/art.js`. Each object has its own function (`drawSleigh`, `drawGift`, `drawHouse`, `drawSky`...). Replace a function body with `ctx.drawImage(...)` to use your own sprites. For example, a drone dropping pizzas onto rooftops needs new `drawSleigh` and `drawGift` functions and nothing else.

## Publishing on web game portals

1. Create the game in the portal's developer dashboard.
2. For **GameDistribution** and **GameMonetize**, copy the game ID the dashboard gives you into `platform-ids.json`. Then run `node tools/build.mjs` again.
3. Upload the matching zip from `release/`: `chimney-rush-crazygames.zip`, `chimney-rush-gamedistribution.zip`, and so on.

| Zip | SDK | Ads used |
|---|---|---|
| `crazygames` | CrazyGames SDK v3 | midgame + rewarded, `gameplayStart/Stop`, `happytime`, cloud save |
| `poki` | Poki SDK v2 | `commercialBreak` + `rewardedBreak`, `gameplayStart/Stop` |
| `gamedistribution` | GD HTML5 SDK | `showAd()` + rewarded |
| `gamemonetize` | GameMonetize SDK | `showBanner()` interstitial |
| `itch`, `web`, `y8` | none | no ads |

Every SDK call is guarded. If an SDK is blocked or offline, the game simply runs without ads.

## Store images

```bash
npm i -D playwright && npx playwright install chromium
node tools/assets.mjs
```

This renders covers, thumbnails and gameplay screenshots into `listings/images/`. To add sizes, edit the list at the top of `tools/assets.mjs`.

## Tests

```bash
node tools/build.mjs && node tools/test.mjs
```

The tests play the game with an autopilot on desktop and phone screens and check every portal build. They exit with an error if anything breaks.

## Files

```
src/index.html        page shell
src/js/config.js      everything you'd want to reskin
src/js/art.js         all drawing code
src/js/game.js        game rules, screens, input
src/js/audio.js       generated sound effects and music
src/js/platform.js    portal SDK adapters
src/js/storage.js     save data
src/js/main.js        startup, cover renderer, test hooks
tools/build.mjs       builds release/*.zip
tools/test.mjs        automated browser tests
tools/assets.mjs      covers, thumbnails and screenshots
```

## Notes

- **AI disclosure:** this template's code, procedural art and sound were made with AI assistance (Claude) and were tested and tuned by the author. Some stores, itch.io for example, ask you to disclose AI use. Check the rules of the stores where you publish.
- **No support:** the template is provided as-is, without support. The code is commented and the README covers the common changes.
- **License:** see `LICENSE.txt`.
