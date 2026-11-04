# Profile setup: from empty account to launch-ready

About an hour of work. Do it before posting anything.

## 1. Pick the brand

You're building a publication, not a personal account. The name should sound like something people would cite: "saw it on Margin".

| Name | Why | Handles to try, in order |
|---|---|---|
| **Margin** (recommended) | Short, sounds like a business publication, and it's a double meaning: profit margins, and the details in the margins that other pages skip. The yellow margin line makes an easy logo. | @margin.news, @marginbrief, @themarginpage, @margin.daily |
| Bottom Line | Everyone knows the phrase, so it's easy to remember. Many similar names exist, though. | @bottomline.daily, @thebottomline.biz |
| Money Decoded | Says what you do. Long, but good for search. | @moneydecoded, @money.decoded |
| Biz Explained | Very literal. Works well in search, but it's weaker as a brand. | @bizexplained, @biz.explained |

Check every handle on Instagram, TikTok and YouTube before you choose. Use the same handle on all three if you can. Avoid numbers and double underscores. They read as spam.

The assets in `assets/` are made for **Margin**. If you pick another name, change `BRAND_NAME` and `HANDLE` in `scripts/brand.py` and run `python3 scripts/make_pack.py` to rebuild everything.

## 2. Create the account

1. Make a new email just for the brand (for example margin.brand@...). Use it for Instagram, TikTok, YouTube and sponsor emails.
2. Sign up with that email, not your phone number, if you want the page kept separate from your personal life.
3. When the app asks to sync contacts, say no. Syncing would suggest the page to everyone in your phone, and your first viewers should be strangers who like business content, not your aunt.
4. Turn on two-factor authentication now (Settings > Accounts Center > Password and security). Business pages get targeted by hackers once they grow.

## 3. Switch to a professional account, and pick Creator

Settings > Account type and tools > Switch to professional account > **Creator**.

Why Creator and not Business: Creator accounts get the full music library, including trending songs. Business accounts only get commercially licensed tracks. You want trending audio on normal posts. (Sponsored posts are different: use only licensed audio on those. See `06-ORIGINALITY-AND-SOURCING.md`.)

Category: choose **News & Media Website** or **Media/News Company**, whichever appears. If neither does, choose **Digital Creator**. Turn on "Display category" so the profile reads like a publication.

## 4. Fill in the profile

**Profile photo:** `assets/profile/profile-1080.png`. It's a white M on near-black with the yellow margin line, and it still reads at the tiny size it shows in comments.

**Name field (searchable):**
```
Margin | Business & Money News
```
Instagram search matches the Name field as well as the handle. That's why @wealth once called itself "Business | Motivation | Quotes". Put the words people search for here. Keep it under 30 characters.

**Bio (150 characters max):**
```
Business news that makes sense in 30 seconds.
How companies really make money, daily.
Free Sunday brief ↓
```
Use the third line only once the newsletter exists. Until then, try:
```
Business news that makes sense in 30 seconds.
How companies really make money, daily.
New breakdown every morning.
```

**Link:** at the start, none, or a link to your best reel on YouTube Shorts. From week 3, your free newsletter (beehiiv and Substack both have free plans). Instagram lets you add up to five links. Put the newsletter first.

**Contact button:** add the brand email so sponsors can reach you.

## 5. Settings worth changing

| Setting | Where | Set to | Why |
|---|---|---|---|
| Two-factor auth | Accounts Center > Password and security | On | Big pages get stolen |
| Allow downloads of your reels | Settings > Sharing and reuse | On | Downloads carry your handle as a watermark, so every download that gets sent on advertises the page |
| Allow remixes | Settings > Sharing and reuse | On | Free reach when someone reacts to you |
| Recommend reels on Facebook | Reel share screen > Share to Facebook | On (needs a Facebook Page linked) | Same video, second audience, no extra work |
| Trial reels | Toggle on the share screen when it appears for your account | Use it daily once available | Shows a reel to non-followers first, so you can test hooks without cluttering followers' feeds |
| Hidden words / comment filter | Settings > Hidden words | On | Finance pages attract crypto-scam bots in the comments. Filter "DM me", "WhatsApp", "investment manager" |

## 6. Before you tell anyone: post the launch grid

People who land on a profile with one post don't follow. Post these 9 over the first 3 days so the profile looks like a working publication when your first reel breaks out (titles refer to `04-FIRST-30-REELS.md`):

| Order | Post | Why |
|---|---|---|
| 1 | #01 The $1.50 hot dog (breakdown reel) | Strongest evergreen hook |
| 2 | #21 Same $300 a month (data reel) | Gets saved, shows the data format |
| 3 | #02 McDonald's is a real estate company | Classic business story people send |
| 4 | A news reel from today (see the news slot template) | Shows you're current |
| 5 | #10 Start-here carousel (`assets/carousel-start-here/`) | Tells visitors what the page is |
| 6 | #03 Rolex has no shareholders | Surprise fact, big brand |
| 7 | #06 Instagram sold for $1B with 13 employees | Tech story, sends well |
| 8 | A second news reel | Current again |
| 9 | #22 The rule of 72 (money rule) | Quick, gets saved |

Then **pin three posts** (tap the ... on a post > Pin to your profile): the start-here carousel, your best-performing reel, and your newest strong news reel. Swap the pins as better reels come in.

## 7. Highlights (add in week 2, once you have stories)

Five highlights, covers in `assets/highlights/`:

- **Start**: what the page is, plus your 3 best reels
- **Breakdowns**: how companies make money
- **Money**: data reels and rules
- **Tools**: AI and tech demos
- **Work with us**: rates, audience screenshot, email (add at 5K followers)

## 8. Same handle on TikTok and YouTube Shorts

Upload the same clean files (no watermarks) to both. It's the cheapest way to triple your chances of a breakout, and it's what @wealth does with its 6M+ TikTok. Post to Instagram first, the others an hour or more later.

## Things to never do

- Buy followers or likes. They don't watch, so your reach per follower collapses and Instagram shows you to fewer people.
- Join engagement pods or use follow/unfollow apps. Instagram can see it and limits the account.
- Use bots that comment on other pages.
- Post screen recordings of other people's reels, or videos with a TikTok/CapCut watermark.
