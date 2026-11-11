# Bot Bothered: channel kit

Everything needed to set up the channel, plus per-video upload text.
Images are in `export/`; regenerate them with:

```bash
node chatvid/brand/render_brand.mjs chatvid/episodes/ai-is-a-toaster.json
```

Upload text (title, description with chapters, tags) for any episode:

```bash
node chatvid/render.mjs chatvid/episodes/ai-is-a-toaster.json --upload
```

## Identity

| | |
|---|---|
| Name | **Bot Bothered** |
| Handle | **@BotBothered** (fallbacks if taken: @BotBotheredTV, @BotBotheredAI, @BotBothered_) |
| Tagline | I bother AI chatbots until they crack 🍞 |
| Mascot | The 3D robot with an anger mark 🤖💢 (Microsoft Fluent Emoji, MIT licence) |
| Colours | Black `#050507`, neon cyan `#19E3FF` (the AI), neon red `#FF2E4D` (you / the keyword), white text |
| Font | Inter Display Black |

Other names considered: Prompt Goblin, Promptly Broken, Toasted Bot. A web
search found no existing channel using "Bot Bothered" or "Prompt Goblin", but
check the handle in YouTube Studio before committing to it.

## Images

| File | Use | YouTube spec |
|---|---|---|
| `export/profile-picture-800.png` | Profile picture | 800×800, shown as a circle (min 98×98, max 4 MB) |
| `export/banner-2560x1440.png` | Banner | 2560×1440 (max 6 MB). Text sits in the 1546×423 centre that every device shows; the side bubbles appear on desktop and TV only. `banner-safe-area-check.png` shows the safe area. |
| `export/watermark-150.png` | Video watermark (subscribe button) | 150×150 transparent PNG; display: entire video |
| `export/<episode>-thumb-a/b/c.png` | Thumbnails | 1280×720, under 2 MB. Upload all three with **Test & compare**. |

## Channel description (About)

```
Bot Bothered: I bother AI chatbots until they crack. 🤖💢

ChatGPT, Gemini, Grok and friends get impossible tasks, ridiculous rules and full-blown identity crises, and every meltdown ends up here. Ever seen an AI become a toaster? Try to count to a billion? Forget what comes after 3? Welcome.

🍞 New videos every Tuesday & Friday
🔔 Subscribe and tell us in the comments which AI to bother next.

Every video is a comedy skit: the chats are written and animated for entertainment, not real AI conversations. Not affiliated with OpenAI, Google or xAI.

📩 Business: [your business email]
```

## Channel keywords

Studio → Settings → Channel → Basic info → Keywords:

```
funny ai, chatgpt funny, ai comedy, trolling chatgpt, ai chat, chatgpt, gemini, grok, funny chatbot, ai memes, ai skits, chatgpt prank, bot bothered
```

## Setup checklist

1. **Create the channel** under a brand account (lets you add managers later). Name: Bot Bothered; handle: @BotBothered.
2. **Verify your phone number** (Studio → Settings → Channel → Feature eligibility). Without it you can't upload custom thumbnails or videos over 15 minutes.
3. **Customisation → Branding:** profile picture, banner, watermark from `export/`.
4. **Customisation → Basic info:** description and keywords above; add your business email; links can wait until you have Shorts/TikTok accounts.
5. **Settings → Channel → Advanced:** audience = **No, this channel is not made for kids**. Country: yours.
6. **Settings → Upload defaults:**
   - Category: **Comedy**; language: English; licence: Standard YouTube; allow embedding.
   - Description footer (paste into the default description):
     ```
     🔔 Subscribe for more AI chaos: https://www.youtube.com/@BotBothered?sub_confirmation=1

     This is a comedy skit: the chat is written and animated for entertainment, not a real AI conversation. Bot Bothered is not affiliated with OpenAI, Google or xAI.
     Music & sound effects: Mixkit (mixkit.co). Emoji: Microsoft Fluent Emoji (MIT licence).
     ```
   - Default tags: `chatgpt, funny ai, ai comedy, bot bothered`
   - Comments: on, with "hold potentially inappropriate comments for review".
7. **Playlists** (create now, fill as you go): *AI Identity Crises* (toaster, Siri), *Impossible Tasks for AI* (count to a billion, pi), *Rules AI Can't Follow* (emoji-only), *AI vs AI* (rivalry videos).
8. **Customisation → Layout:** once you have 3+ videos, add a channel trailer for non-subscribers (a 45-60 s cut of the best punch-ins) and a "Popular videos" section.

## Every upload

- Title, description and tags from `render.mjs --upload`. Chapters are generated from the episode's `chapter` markers.
- Thumbnail: upload variants a, b and c with **Test & compare**; YouTube picks the winner by watch time.
- **Altered or synthetic content:** answer **Yes**. The chat looks like a real ChatGPT session but the AI never said these lines, and a viewer could take it as real. The label is small and YouTube says it doesn't limit reach; the description disclaimer covers the rest.
- End screen: last 5-20 s, link the next video and the subscribe button. (Our end card is 3 s; raise `endCard.dur` to 8-10 s if you want room for end-screen elements.)
- Pin a comment asking which AI to bother next. It drives comments and gives you topics.

## Monetisation notes

- The YouTube Partner Programme thresholds change; check Studio → Earn for the current ones.
- YouTube reviews for **reused or repetitious content**. A fixed visual template is fine as long as every video has its own original script, which is what chatvid is built around. Vary the topics, interfaces and AI names, and never upload near-duplicate scripts.

## What we took from the reference channel (Kravexa)

| | Kravexa | Bot Bothered |
|---|---|---|
| Profile picture | Stock-style laughing cat in pixel sunglasses: memorable but unrelated to AI | Robot mascot with an anger mark: says "annoyed AI" even at 24 px |
| Banner | Generic "SUBSCRIBE" button with the cat on a light pattern: no topic, no schedule, clashes with the black thumbnails | Black neon banner matching the thumbnails, with what the channel does and when videos come out |
| Description | Two lines: "I make funny AI chats and random ChatGPT videos." | Keyword-rich first line, what to expect, schedule, disclaimer, contact |
| Keywords | chatgpt, ai, funny, ai chat, funny ai, chatgpt funny, ai memes, trolling chatgpt, ai conversations, chatbot, comedy, memes, funny videos, ai comedy, kravexa | Similar core set, aimed at the same searches |
| Thumbnails | Black, two neon chat bubbles, one red keyword, a 3D emoji, the AI's logo by the reply | Same proven structure, with our robot mascot instead of company logos, our colours, and the meter as a recurring element |
