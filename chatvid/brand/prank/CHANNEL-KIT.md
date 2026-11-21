# Channel kit: "sorry dad" (AI prank texts)

> **Replaced by `brand/jp/CHANNEL-KIT.md` ("jordan's phone").** This kit was for a Dad-only channel. Its monetization checklist below still applies.

Modelled on **Halo Chad (@Chad.halo12)**, the channel behind the snow-prank Short we studied: 897 Shorts, 68.2M views, 37.9K subscribers. We copy how the channel works, not its name, photos or wording. Those belong to them, and copying them would get our channel flagged for impersonation.

## What Halo Chad's branding does
| Item | Theirs | The idea behind it |
|---|---|---|
| Name | "Halo Chad" | Reads like a real person, not a brand |
| Profile picture | Moody photo of a rainy window | Anonymous: no face, no logo |
| Banner | A personal phone photo of Times Square at night | No channel art at all; it looks like an ordinary account |
| Description | "You just got Cantina'd" | The sponsor's tagline (the app shown at the start of each Short is a paid plug) |
| Titles | "No way he said that😅 #prank #snow #funnyvideo #comedyshorts" | Reaction bait plus 4-5 hashtags |

The lesson: a prank channel should look like **a kid texting their dad**, not a studio. Our kit keeps that personal feel but says what the channel is in one glance, which theirs does not.

## Name and handle
- **Name:** `sorry dad` (lowercase on purpose: it is the sender's deadpan voice)
- **Handle, in order of preference:** `@sorrydad.texts`, `@sorrydadtexts`, `@sorry.dad.ai`. Check availability on YouTube, which is the only place it can be checked.
- **Other names if you prefer:** `dad said no` · `texting dad` · `dad has questions`

## Files (in `chatvid/brand/prank/export/`)
- `profile-picture-800.png`: **Max**, the golden retriever from the dog prank. He is the recurring face of the channel.
  - It is cut from the video, so it is a little soft. For a sharper version, make a Flow image: *"close-up portrait of a happy golden retriever with a red collar, autumn street, phone photo"*. Put it at `brand/prank/max-src.png` and run the renderer again.
- `banner-2560x1440.png`: blurred frames from our two pranks, with the best exchanges as chat bubbles.
- `banner-safe-area-check.png`: shows the 1546x423 area that every device displays. Do not upload this one.

To re-render with another name:

```bash
node chatvid/brand/prank/render.mjs "dad said no"
```

## Description (paste into About)
```
texting my dad things that aren't happening.

the snow guy brought friends. the dog walker took max. dad has questions.

every video is made with AI and every chat is a skit. no real dads were harmed (emotionally, a little).

new prank every day.
```

## Channel keywords (Settings → Channel → Basic info)
```
prank, ai prank, texting my dad, prank texts, funny texts, dad reacts, dad texts, text prank, prank my dad, ai video prank, comedy shorts, funny video
```

## Upload defaults (Settings → Upload defaults)
- **Title template:** `<reaction line with ONE CAPS word><emoji> #prank #<topic> #dad #funnyvideo #comedyshorts`
- **Description:**
  ```
  he had questions.

  Made with AI (Google Flow). The conversation is a skit.

  #prank #dad #funnyvideo #comedyshorts #ai
  ```
- **Category:** Comedy
- **Altered or synthetic content:** **Yes** on every upload. The footage is AI-generated and looks real.
- **Comments:** on, with "Hold potentially inappropriate comments" selected.

## Monetization checklist (every upload)
YouTube's "inauthentic content" rule demonetizes channels that look templated or mass-produced, and it is judged across the whole channel. Using AI is allowed; low-effort repetition is not.
- [ ] **A new premise, a new script and new footage.** No clips reused from another video, and no old script with the nouns swapped.
- [ ] **Steady pace:** 1-2 a day, never a dump of near-identical Shorts.
- [ ] **Working files kept** (the episode JSON, Flow project, prompts). If a reviewer flags the channel, they show the human work.
- [ ] **Altered or synthetic content: Yes.**
- [ ] **No swearing in the title or the first seconds.** Dad's caps lines mid-video are fine.
- [ ] **Nothing from Halo Chad or any other channel uploaded:** footage, scripts or art. We keep only notes.
- [ ] **Flow footage made on a plan whose terms allow commercial use.** Check the Flow terms before the channel applies for monetization.
- [ ] **Music and sound effects only from our library** (Mixkit licence). If a claim ever appears, dispute it with the licence.
- [ ] **From video 21:** tick "includes paid promotion" on every video that promotes our repos.

**To join the Partner Program:** 1,000 subscribers, plus either 10M Shorts views in 90 days or 4,000 watch hours. News reports say these rise for new applicants in 2027; check YouTube's Help page before planning around them.

## Playlists
1. **Dad vs the House**: snow, pool, roof, lawn, paint
2. **Dad vs Max**: dog walker, the next dog pranks
3. **Dad vs the Bills**: anything ending in "WHO IS PAYING FOR THIS"

## Pinned comment template
```
should i tell him it's AI or let him find out 😭
```
A question that invites the "is this real??" argument gives people a reason to comment, and comments help a Short spread.

## Posting
- **1 Short a day, same time.** Start with late afternoon in the US (21:00-23:00 UTC), then move it to the peak hour YouTube Analytics shows after two weeks.
- Halo Chad's numbers show that **volume plus one locked format** is what broke through. See `research/halo-chad-recipe.md`.

## Dad (the recurring contact)
- **Contact name:** "Dad (Driveway Police)🚨".
- **Photo:** a made-up man generated in Flow. The full image is `brand/prank/dad-full.jpg` and the square crop is `brand/prank/dad-avatar.jpg`.
- **Using him in an episode:** copy the crop to `chatvid/assets/media/dad.jpg` and set `"contact": {"name": "Dad (Driveway Police)🚨", "avatar": {"media": "dad"}}`.
- **Keep him the same in every video.** Viewers recognise the character, and that consistency is part of what makes the series feel real.
