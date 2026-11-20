# Channel kit: "sorry dad" (AI prank texts)

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
