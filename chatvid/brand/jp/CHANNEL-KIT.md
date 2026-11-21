# Channel kit: "jordan's phone"

This replaces the earlier "sorry dad" kit (`brand/prank/`), which only fit Dad pranks. The channel is now a whole cast, so the brand is the one thing every video shares: **Jordan's phone**. Every Short is a screen recording of Jordan texting someone an AI video of a situation getting out of hand.

Like Halo Chad's channel, it reads as a person rather than a studio. Unlike theirs, it tells a new visitor in one glance what the channel is and who is in it.

## Name and handle
- **Name:** `jordan's phone` (lowercase, the way Jordan texts)
- **Handles to try, in order:** `@jordansphone` · `@jordans.phone` · `@jordansphone.mp4` · `@itsjordansphone`. Only YouTube can tell you which are free.
- **Other names if none of those are free:** `left on delivered` · `read receipts` · `jordan texts`
- **Jordan** is the sender in every Short. The name is gender-neutral, so viewers fill in who Jordan is. Maya already says it ("JORDAN. ANSWER. ME."), and it never appears on screen otherwise.

## Files (`chatvid/brand/jp/export/`)
| File | Size | Where it goes |
|---|---|---|
| `profile-picture-800.png` | 800x800 | Customization → Branding → Picture. The "someone is typing…" bubble with a REC pill: it reads clearly at 40 px and says "screen recording of a chat". |
| `banner-2560x1440.png` | 2560x1440 | Customization → Branding → Banner. Lock-screen notifications from six of the cast around the name. |
| `banner-safe-area-check.png` | 2560x1440 | **Do not upload.** It shows the 1546x423 area that every device displays. |
| `watermark-150.png` | 150x150, transparent | Customization → Branding → Video watermark, "Entire video". It shows only on long videos, not Shorts, and works as a Subscribe button. |

To re-render with another name:

```bash
node chatvid/brand/jp/render.mjs "left on delivered"
```

## Description (paste into About)
```
screen recordings from my phone.

i send people AI videos of things getting slightly out of hand and screen record what happens. my dad. my mom. my girlfriend maya. my best friend jaden. my boss gary. my landlord. grandma. the fbi agent who watches my webcam.

nobody in my contacts is having a good day.

every video is made with AI and every conversation is a skit. all characters are fictional.

new screen recording every day.
```

## Channel keywords (Settings → Channel → Basic info)
```
prank, ai prank, prank texts, texting prank, funny texts, text messages, screen recording, prank my dad, prank my girlfriend, ai video prank, comedy shorts, funny video, jordan's phone
```

## Upload defaults (Settings → Upload defaults)
- **Title template:** `<a reaction teaser with ONE CAPS word><emoji> #prank #<character> #<topic> #funnyvideo #comedyshorts`
  - Dad: `He did NOT take this well😭 #prank #dad #snow #funnyvideo #comedyshorts`
  - Maya: `She did NOT see that coming😭 #prank #girlfriend #pets #funnyvideo #comedyshorts`
  - Gary: `I'm so getting FIRED😭 #prank #boss #work #funnyvideo #comedyshorts`
- **Description:** leave it empty (Halo's are all empty), or one line: `every video is made with AI and every conversation is a skit.`
- **Category:** Comedy
- **Altered or synthetic content:** **Yes** on every upload.
- **Comments:** on, with "Hold potentially inappropriate comments" selected.

## Playlists (one per contact; they become the channel's "shows")
1. **Dad (Driveway Police)**: snow, dog walker, hot tub…
2. **Maya**: small pet…
3. **Gary (Boss)**
4. **Agent Miller**
5. **Mom**
6. **Grandma Rosa** (she loves it)
7. **Crossovers**: Steve and the permit office reacting to Dad's projects

## Channel layout (Customization → Layout)
- **Featured section, first:** the "Shorts" shelf.
- **Then the playlists** in the order above, so new visitors meet the cast.
- **No channel trailer** for now. Add one once there is a long compilation (see below).

## Pinned comment, one per video
Ask a question that starts an argument:
- `should i tell him it's AI or let him find out 😭`
- `who's worse, dad or maya`
- `which contact should i text next`

The answers to the last one give you free ideas for the next Shorts.

## The cast
All 12 contacts, with photos and texting voices, are in `chatvid/cast/` (`CAST.md`, `cast-sheet.jpg`). Every character is fictional, with an AI-generated photo.

## Monetization checklist
See `brand/prank/CHANNEL-KIT.md`; it applies to this channel unchanged. In short:
- a new premise, script and footage every video
- 1-2 uploads a day
- keep the working files
- "altered content: Yes" on every upload
- no swearing in titles or the opening seconds
- nothing from other channels
- Flow terms checked for commercial use
- tick "paid promotion" from video 21, when the app slot starts promoting our repos

## Later: long videos
Shorts views don't count toward watch hours. A "every Dad prank so far" compilation (10+ min) every few weeks adds watch hours and gives the channel a trailer to feature.
