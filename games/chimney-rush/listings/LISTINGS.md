# Chimney Rush: store listing text

Copy and paste from here. Every field fits the platform's published limits; character counts are checked by `node tools/check-listings.mjs`.

## Shared text

**Title**

```
Chimney Rush
```

**Tagline / short description** (62 characters)

```
Drop every gift down a chimney! A one-tap holiday arcade game.
```

**Description** (used everywhere a description is asked for; 200–500 characters)

```
Fly a sleigh over a snowy town at night and drop a gift down every chimney! Watch out for the Rooftop Rascal, a parkour kid who leaps across the roofs to snatch your gifts in mid-air. Drop a gift on his head while he runs to knock him off. The town speeds up, wind pushes your gifts sideways and some houses have two chimneys. Build combos, trigger Fever for double points and unlock six festive sleighs.
```

**Instructions / controls** (200–500 characters)

```
Tap the screen, click, or press Space to drop a gift. Gifts fall straight down from the sleigh, so drop just before a chimney passes underneath. Every chimney needs a gift, and a gift that misses costs a heart. The Rooftop Rascal steals gifts when he jumps: drop one on his head while he runs to knock him off. Wind pushes falling gifts sideways. Press P or Esc to pause.
```

**Short controls line** (for fields that want one line)

```
Tap / click / Space: drop a gift. P or Esc: pause.
```

**Categories and tags**

- Genre: Casual (second choice: Arcade)
- Tags: christmas, santa, one button, timing, winter
- Age: all ages (no violence, no chat, no personal data)
- Orientation: landscape and portrait both supported
- Devices: desktop (mouse, keyboard) and mobile (touch)

---

## CrazyGames

| Field | Value |
|---|---|
| Upload | `release/chimney-rush-crazygames-basic.zip` for Basic Launch. After CrazyGames promotes the game to Full Launch, upload `release/chimney-rush-crazygames.zip` (ads switched on). |
| Covers | `listings/images/crazygames-cover-landscape-1920x1080.png`, `crazygames-cover-portrait-800x1200.png`, `crazygames-cover-square-800x800.png` |
| Videos | `listings/video/gameplay-1920x1080-16x9-20s.mp4`, `listings/video/gameplay-1080x1620-2x3-20s.mp4` (20 s, no sound) |
| Description | shared description |
| Controls | shared instructions |
| Category / tags | Casual; christmas, one button, santa, timing, 2d |
| Orientation | Landscape on desktop; mobile works in both orientations |

## GameDistribution

| Field | Value |
|---|---|
| Upload | `release/chimney-rush-gamedistribution.zip`, rebuilt after the game ID is added (see the launch checklist) |
| Thumbnails | `gamedistribution-512x512.png`, `gamedistribution-512x384.png`, `gamedistribution-200x120.png`; optional `gamedistribution-1280x550.png`, `gamedistribution-1280x720.png` |
| Description | shared description (404 characters) |
| Instructions | shared instructions (371 characters) |
| Genres (1–2) | Casual, Arcade |
| Tags (1–5) | christmas, santa, one button, timing, winter |
| Mobile Ready | Yes (touch, both orientations) |

## GameMonetize

| Field | Value |
|---|---|
| Upload | `release/chimney-rush-gamemonetize.zip`, rebuilt after the game ID is added |
| Image | `gamemonetize-512x384.png` |
| Category | Casual |
| Tags | christmas, santa, one button, timing, winter |
| Description / instructions | shared text |

## Y8

| Field | Value |
|---|---|
| Upload | `release/chimney-rush-y8.zip`, rebuilt after the App ID and Game ID are added |
| 760×570 thumbnail screenshot | `y8-thumbnail-screenshot-760x570.png` |
| 1280×720 widescreen screenshot | `screenshot-1-gameplay.png` |
| 1920×1080 promo | `y8-promo-1920x1080.png` |
| 1080×1920 promo | `y8-promo-1080x1920.png` |
| 760×570 card | `y8-card-760x570.png` |
| Gameplay video (16:9, ≥15 s) | `listings/video/gameplay-1920x1080-16x9-20s.mp4` |
| AI declaration | Code, graphics and sound effects were made with AI assistance (Claude) and tested and tuned by the developer. No AI is used at runtime. |

## itch.io: the game

| Field | Value |
|---|---|
| Kind of project | HTML |
| Upload | `release/chimney-rush-itch.zip`, tick "This file will be played in the browser" |
| Embed | Viewport 960 × 540, tick "Mobile friendly", "Fullscreen button"; leave "Automatically start on page load" off |
| Pricing | "No payments", or "$0 or donate" with a suggested $2 if you want to test tips |
| Short description | shared tagline |
| Genre | Action |
| Tags (up to 10) | christmas, santa, arcade, casual, one-button, 2d, winter, cute, high-score, html5 |
| AI disclosure | AI Generated: Code, Graphics, Sound |
| Cover | `itch-cover-630x500.png` |
| Screenshots | `screenshot-0-title.png` … `screenshot-4-shop.png` |
| Comments | Turn off if you don't want to reply to players |

**itch.io page body**

```
Fly a sleigh over a snowy town at night and drop a gift down every chimney!

HOW TO PLAY
Tap, click or press Space to drop a gift. Gifts fall straight down from the sleigh, so drop just before a chimney passes underneath. Every chimney needs a gift; a gift that misses costs a heart.

WATCH OUT FOR THE ROOFTOP RASCAL
A parkour kid leaps from roof to roof trying to snatch your gifts. At the top of a jump, arms up, he grabs any gift that comes near him. On a roof he's an easy target: drop a gift on his head to knock him off and get his stolen gifts back as coins.

WHAT ELSE MAKES IT TRICKY
- The town speeds up the longer you last
- Wind pushes falling gifts sideways (watch the arrow at the top)
- Some houses have two chimneys
- Golden chimneys pay bonus coins

REWARDS
- Perfect drops build combos and multipliers
- Every 12 in a row triggers Fever: double points
- Spend coins on six sleighs, from Frost to Golden

Works on desktop and phones, in landscape or portrait. No sign-up, no ads on this page.
```

## itch.io: the source-code template (asset page)

| Field | Value |
|---|---|
| Classification | Game assets |
| Upload | `release/chimney-rush-template-v1.0.0.zip` |
| Price | $12, "allow buyers to pay more" ticked |
| Short description | `Complete one-tap HTML5 game, reskinnable, with CrazyGames, Poki, GameDistribution and GameMonetize ads already wired.` |
| Tags | html5, javascript, source-code, template, game-template, reskin, christmas, one-button, crazygames, mobile |
| AI disclosure (required on asset pages) | AI Generated: Code, Graphics, Sound |
| Cover | `template-itch-cover-630x500.png` |
| Screenshots | the five gameplay screenshots |

**Template page body** (also used on Gumroad)

```
A complete, polished one-tap arcade game you can reskin and publish under your own name. Plain JavaScript and Canvas: no engine, no dependencies, no image or audio files. About 30 KB.

PLAY THE DEMO
(link to the free Chimney Rush page)

WHAT'S INCLUDED
- Full game source, 7 commented JavaScript files
- A parkour enemy (the Rooftop Rascal) who runs the rooftops, jumps gaps, vaults chimneys and steals gifts mid-air
- Ads already wired for CrazyGames (SDK v3), Poki (SDK v2), GameDistribution and GameMonetize: interstitials between runs, rewarded "continue" and "double coins", gameplay events, muting during ads
- Build script that writes one upload-ready zip per portal
- Cover, thumbnail and screenshot generator for any size
- Automated browser tests that play every build
- Mobile and desktop: touch, mouse, keyboard, portrait and landscape
- Saves best score, coins and unlocked skins
- Sound effects and music generated in code: nothing to license

RESKIN IN MINUTES
Name, colours, difficulty, scoring, shop items and every on-screen word live in one config file. Each drawing function (sleigh, gift, house, sky) can be swapped for your own sprites.

LICENSE
Use it in unlimited games, free or commercial, on any platform. You may not resell the template or its source code. Provided as-is, without support.

AI DISCLOSURE
The code, procedural art and generated sound were made with AI assistance (Claude), then tested and tuned by the author.
```

## Gumroad: the source-code template

| Field | Value |
|---|---|
| Product type | Digital product |
| Price | $12 |
| File | `release/chimney-rush-template-v1.0.0.zip` |
| Cover | `template-cover-1280x720.png` |
| Thumbnail | `template-thumbnail-600x600.png` |
| Description | template page body above |
| Discover | On (Gumroad takes 30% on Discover sales, but that's the traffic you don't have to bring yourself) |

## Poki (not now)

Poki pays a revenue share only for games that are exclusive to Poki on the web for 5 years. Chimney Rush is going to several portals, so Poki would offer a one-time flat fee at most. The build (`release/chimney-rush-poki.zip`), the 1024×1024 no-text thumbnail and the 5-second 50 fps animated thumbnail are ready if you want to try anyway.
