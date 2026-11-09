# Chimney Rush: launch checklist

**The test:** put the same game on five marketplaces and the source code on two, then compare plays and money after 14 and 30 days. Record results in [`TRACKER.md`](TRACKER.md).

Everything you upload is already made:

- **Upload zips:** in `release/`.
- **Images:** in `listings/images/`.
- **Videos:** in `listings/video/`.
- **Text to paste:** in [`listings/LISTINGS.md`](../listings/LISTINGS.md).

Your part is creating the accounts and clicking upload. Those steps need your identity, tax and payout details.

## Before you start (once, about 30 minutes)

- **A PayPal account.** Most portals pay through PayPal; some also offer bank transfer.
- **Your tax status.** Platforms that pay you ask for a W-8BEN (individuals outside the US) or a W-9 (US). Have your tax ID ready.
- **One email address** for all the accounts.

## Order

| Day | Platform | Your time | Goes live |
|---|---|---|---|
| 1 | itch.io: the free game | 15 min | Immediately |
| 1 | CrazyGames: Basic Launch | 30 min, including billing setup | After QA; a test lasting 7–21 days |
| 1 | GameMonetize | 15 min, plus sending me the game ID | About 1–3 days after activation |
| 1 | GameDistribution | 20 min, plus sending me the game ID | Review takes up to 3 weeks |
| 1 | Y8 | 20 min, plus sending me the App ID and Game ID | After review |
| 2 | itch.io and Gumroad: the template | 20 min | Immediately |

The game is Christmas-themed, so get it live before December, when portals feature holiday games.

---

## 1. itch.io: the free game

1. Sign up at https://itch.io/register. Choose the option for distributing content.
2. Go to **Dashboard → Create new project**.
3. Fill in the basics:
   - Title: **Chimney Rush**
   - URL: `chimney-rush`
   - Short description: the tagline
   - Classification: **Game**
   - Kind of project: **HTML**
   - Release status: **Released**
4. Set **Pricing** to "No payments", or to "$0 or donate" if you want to see whether anyone tips.
5. Under **Uploads**, add `release/chimney-rush-itch.zip` and tick "This file will be played in the browser".
6. Under **Embed options**:
   - Viewport **960 × 540**
   - Tick **Mobile friendly**
   - Tick **Fullscreen button**
   - Leave auto-start off
7. Fill in the details:
   - Page body, genre (Action) and tags: from `LISTINGS.md`
   - **AI disclosure: AI Generated → Code, Graphics, Sound**
8. Add the cover (`itch-cover-630x500.png`) and the five `screenshot-*.png` files.
9. Set visibility to **Public**, then **Save**.

**AI rules:** itch.io's quality guidelines treat projects "predominantly created by AI with minimal human intervention" as spam. Chimney Rush is a finished, tested game, not a dump of generated content.

- Play it yourself before publishing, and change at least one thing you'd want different: difficulty, colours, a sleigh name.
- Answer the AI disclosure honestly.

You can turn comments off in the page settings if you don't want to reply to players.

## 2. CrazyGames: Basic Launch

1. Sign up at https://developer.crazygames.com.
2. **Finish the billing setup (Tipalti)**. CrazyGames requires it before you can submit. You can choose to hold payments.
3. **Submit game**: upload `release/chimney-rush-crazygames-basic.zip`. This build has no ad buttons, because CrazyGames switches ads off during the test and rejects buttons that do nothing.
4. Add the three covers (`crazygames-cover-*`) and both videos (`gameplay-1920x1080-16x9-20s.mp4`, `gameplay-1080x1620-2x3-20s.mp4`).
5. Paste in the description, controls and tags. Set orientation to **Landscape**, and mark it as mobile-friendly.
6. Submit.

**What happens next:**

- **Basic Launch:** CrazyGames shows the game to a small audience for 7–21 days (at least 500 plays). It earns nothing during this test.
- **If it's promoted to Full Launch:** upload `release/chimney-rush-crazygames.zip` instead. Ads are on in that build.
- **Payouts:** monthly from €100, by wire or PayPal.
- **Skip the optional exclusivity bonus** (+50% for 2 months). It would block the other portals in this test.

## 3. GameMonetize

1. Sign up at https://gamemonetize.com/joinus.
2. Click **Add game** and copy the **Game ID** it gives you.
3. **Send me the Game ID** and I'll rebuild the zip and push it. Or paste it into `platform-ids.json` and run `node tools/build.mjs`.
4. Upload `release/chimney-rush-gamemonetize.zip`, the image `gamemonetize-512x384.png`, and the text from `LISTINGS.md`.
5. Click **Verify Game**, then **REQUEST ACTIVATION**.

**Money:** 45% revenue share. Paid 30 days after month end by PayPal or USDT, $30 minimum. GameMonetize has no rewarded ads, so the game hides "Continue" and "Double coins" there.

## 4. GameDistribution

1. Register at https://developer.gamedistribution.com/register/developer.
2. Click **Add** to create the game, and copy its **gameId**.
3. **Send me the gameId**, or put it in `platform-ids.json` and rebuild.
4. Upload `release/chimney-rush-gamedistribution.zip`.
5. Add the thumbnails: 512×512, 512×384 and 200×120 are required; 1280×550 and 1280×720 are optional.
6. Paste in the description and instructions (both already fit the 200–500 character limits). Then set:
   - Genres: Casual, Arcade
   - Five tags
   - Age group
   - Tick **Mobile Ready**
7. Work through the checklist, then click **Request Activation**. Review takes up to 3 weeks.

**Money:** 33% of net ad revenue.

- Set up payouts at reporting.headerlift.com: PayPal from €50, bank from €100.
- Revenue for a given month arrives about two months later.

**Possible QA question:** GameDistribution's guidelines prohibit "collection or storing of data". The game stores only best score, coins and sound settings in the browser, with no personal data. If QA objects, tell me and I'll switch saving off for that build.

## 5. Y8

1. Go to https://developer.y8.com. Create a **Studio**, then create the game.
2. Copy the **App ID** and **Game ID**. **Send them to me**, or paste them into `platform-ids.json` (`y8AppId`, `y8GameId`) and rebuild.
3. Upload `release/chimney-rush-y8.zip` and these images:
   - `y8-thumbnail-screenshot-760x570.png`
   - `screenshot-1-gameplay.png`
   - `y8-promo-1920x1080.png`
   - `y8-promo-1080x1920.png`
   - `y8-card-760x570.png`
   - the 16:9 gameplay video
4. Fill in the **AI Declaration** using the text in `LISTINGS.md`.
5. Request a review.

Y8 doesn't publish its revenue share; check the terms in your dashboard.

## 6. The template: itch.io and Gumroad

**itch.io:**

1. **Create new project**, with Classification **Game assets**.
2. Upload `release/chimney-rush-template-v1.0.0.zip` and set the price to **$12**.
3. The AI disclosure is required for assets: tick Code, Graphics, Sound.
4. Add the cover `template-itch-cover-630x500.png` and the screenshots.
5. Paste the page body, and add the link to your free game page.

**Gumroad:**

1. On https://gumroad.com, create a **New product → Digital product** at **$12**.
2. Upload the same zip.
3. Add the cover `template-cover-1280x720.png` and the thumbnail `template-thumbnail-600x600.png`.
4. Paste the description, and turn **Discover** on.

**Payouts:** weekly, after a 7-day hold, once you reach $100. Bank payouts go through Stripe; PayPal is used where banks aren't supported.

**Trade-off:** buyers can reskin the template and publish it on the same portals. At the volume of this test the risk is small. If Chimney Rush takes off on CrazyGames, unpublish the template.

## Poki: not in this test

Poki pays a revenue share only for games that stay on Poki alone on the web for 5 years. Its review takes 2–3 months. A game already on other portals gets a one-time flat fee at most. The Poki build, the no-text square thumbnail and the 50 fps animated thumbnail are ready if you change your mind.

---

## When a portal gives you an ID

Paste it into the chat. I'll put it in `platform-ids.json`, rebuild that zip, rerun the tests and push. If you'd rather do it yourself (needs Node.js 18+):

```bash
node tools/build.mjs
```

## What to expect

- **Weeks 1–3:** approvals and test launches. Little or no money.
- **First payouts:**
  - GameMonetize: from late December, if it reaches $30.
  - Template sales: itch.io pays per sale; Gumroad weekly once you pass $100.
  - CrazyGames: only after Full Launch.
  - GameDistribution: about two months after the month you earned it.
- **Decision after 30 days:** keep the one or two platforms with the most plays and money, and drop the rest for game #2. After the holidays, game #2 can be a non-seasonal reskin of this one, for example a drone dropping pizzas on rooftops.
