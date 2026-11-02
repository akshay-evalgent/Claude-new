# LinkedIn page launch kit: free and low-cost AI and software for business

Everything needed to launch a LinkedIn **page** (no personal-profile posting) about getting business work done with AI, automation and software that is free when possible and far cheaper than the market leader when not. Repos, free tiers, self-hosting and under-priced tools are all in scope.

**Decision made: Lean Stack, with "The Teardown" as a weekly editorial series (serif, red strike) inside it.**

Start here, in order:
0. `content/VOICE-GUIDE.md`: how the page sounds like people. Five required ingredients, the banned-pattern list, the "could a competitor have posted this" test. Everything else in the kit was rewritten to it.
1. `content/SETUP-CHECKLIST.md`: create the page without your profile being visible, upload assets, newsletter setup.
2. `content/page-copy.md`: name, tagline, About, specialties, newsletter name (The Swap List), button, Featured.
3. `content/ENGAGEMENT-PLAYBOOK.md`: how to post so people comment, argue, and tell us what to cover next. Weekly rhythm, timing, comment engine, input loops.
4. `content/post-copy-first-10.md`: paste-ready text and first comments for the first ten posts.
5. `assets/leanstack/`: the final pack (logos, both banner sizes in two variants, newsletter and edition covers, swap/question/debate post cards).
6. `assets/carousels/v3-lean/` and `v3-lean_teardown/`: the human-voice launch and Teardown No. 1 carousels (from `content/carousel-v3-sample.json`). v2 folders are the earlier, more templated copy, kept for comparison.

`content/BRAND-OPTIONS.md` keeps the other five directions in case you ever want to relaunch or spin out a sister page.

```
linkedin-page-kit/
├── README.md                  this playbook: positioning, roadmap, growth and monetization
├── assets/
│   ├── leanstack/             FINAL PACK: logo-400/300, banner-A/B at 1128x191 and 4200x700, newsletter-logo-300, newsletter-cover-1920x1080, edition-01-cover, teardown-01-cover, card-swap/question/debate samples
│   ├── options/               6 directions: <key>-logo-400.png, <key>-banner-1128x191.png, name-options-sheet.png, carousel-themes-sheet.png
│   ├── carousels/v2-<key>/    11-slide comparison carousel rendered in every theme (PDF, PNGs, contact-sheet.png)
│   ├── logo-400.png           original Zero Cost AI draft (superseded by options/)           page logo (upload as-is; LinkedIn min 268x268)
│   ├── logo-300.png
│   ├── banner-1128x191.png    page cover image (LinkedIn recommended size)
│   ├── newsletter-header-1200x630.png
│   └── carousels/sample/      7-slide sample carousel: PNG slides + carousel.pdf (upload the PDF as a document post)
├── scripts/
│   ├── brand.py               colors, fonts, logo mark, drawing helpers
│   ├── make_brand_assets.py   regenerates logo, banner, header
│   ├── themes.py              the six brand themes (colours, fonts, names, taglines)
│   ├── make_brand_options.py  renders all six logos, banners and the comparison sheet
│   ├── make_leanstack_pack.py renders the final Lean Stack pack and the post cards (swap_card, question_card)
│   ├── carousel2.py           themeable carousel engine (themes: lean, lean_teardown, ...): cover, shot (real screenshot), versus, bars, checklist, stat, steps, list, quote, cta
│   ├── make_carousel.py       v1 generator (simple list carousel), kept for quick posts
│   └── fetch_repos.py         pulls candidate open-source repos from the GitHub API by topic and stars
├── content/
│   ├── page-copy.md           name, tagline, about, specialties, featured, newsletter name, voice rules
│   ├── first-30-posts.md      day-by-day calendar for the 15-day sprint, hooks, slide outlines
│   ├── newsletter-issue-01.md ready-to-paste first edition
│   └── carousel-sample.json   the spec behind the sample carousel; copy it for every new post
└── data/candidates.json       74 real repos (5k+ stars, active) to mine for "repo of the day"
```

Regenerate everything:
```
python3 scripts/make_brand_options.py
for t in lean underpriced swapped zero frugal tenx; do python3 scripts/carousel2.py content/carousel-v2-sample.json --theme $t; done
```

---

## 1. Positioning, and why it is built to spread

**Promise:** Get the job done for a fraction of the price. One swap a day: the expensive tool, the free or cheap alternative, the exact saving, and what you give up.

**Scope:** open-source repos, free tiers, self-hosted stacks, and paid tools that cost 5 to 10x less than the incumbent (Tally vs Typeform, Hetzner vs AWS, Zoho vs HubSpot). "Cheaper and good enough" is a bigger market than "free", and it keeps the page honest when free is not good enough.

**Audience:** founders, ops and marketing leads, agency owners, solo consultants, and the finance person who approves software spend. Not developers. Developers already know these repos; business people do not, and they are the ones paying $500 to $3,000 a month.

**Why this goes viral on LinkedIn specifically**

| Mechanism | Evidence from the research | How the kit uses it |
|---|---|---|
| Carousels get about 1.7x average impressions and 3x video engagement; 13 to 20 slides beat short ones | MagicPost 1.2M posts, van der Blom 2026 | `make_carousel.py` makes a 10 to 17 slide document in seconds, so two a day is sustainable |
| Numbers in the first line lift engagement about 35%; questions cut it 34% | MagicPost, AuthoredUp | Every hook is a dollar figure or a count; the cover slide is the number |
| LinkedIn now distributes on topic relevance, not follower count | 2026 interest-graph shift | The page never leaves "free AI and open source for business", so a new page can outrank big generic AI pages |
| Saves and reshares weigh more than likes | Multiple 2026 algorithm summaries | Each post is a reference asset: "save this, send to whoever approves the budget" |
| Featured tools and builders reshare content that flatters them | GenAI.Works, The AI Report, Hassid patterns | Tag the repo maintainers and tool pages in every post; they have audiences the page does not |
| "Comment X" bait lost about 47% reach after 27 July 2026 | MagicPost comment-bait study | Lead magnets are delivered via newsletter subscription or first-comment link, never comment-gating |
| Money-saved framing is the most shared business content format | Observed across top business pages | Every item is THEY PAY / SWAP TO / SAVE, with YOU KEEP and YOU GIVE UP for credibility |

**The emotional engine:** every post makes the reader feel they have been overpaying, then hands them the fix. That is anger plus relief, which is the most reshared combination in business content.

---

## 2. Visual identity

Six directions are defined in `scripts/themes.py` and described in `content/BRAND-OPTIONS.md`. The table below is the original dark draft; each theme swaps these tokens.

| Token | Value | Use |
|---|---|---|
| Background | `#0B1220` deep navy | all surfaces |
| Card | `#111B2E` | boxes, pills |
| Accent | `#22E07A` money green | $0, CTA, swipe hint, logo outline |
| Strike | `#FFB020` amber | crossed-out prices |
| Text | `#F5F7FA` / muted `#96A3B8` | copy |
| Type | Inter and Inter Display (free, open source) | everything |
| Mark | "$0" in a rounded tag with a green spark | logo, every slide header |

Dark background reads as "tech" and makes the green $0 pop in a bright feed. The crossed-out amber price is the recurring visual joke; people learn to recognise it while scrolling.

---

## 3. Launch roadmap

### Day 0 (one weekend)
- Create the page with `content/page-copy.md`. Upload `assets/logo-400.png` and `assets/banner-1128x191.png`.
- Add 2 co-admins (friends or collaborators). Each admin gets a monthly pool of follow invites; spend them all on day 1.
- Generate the first 10 carousels from `content/first-30-posts.md` using `make_carousel.py`. Verify every price on the vendor pricing page that day; write the date you checked into the spec.
- Prepare the newsletter (needs 150 followers to create) using `content/newsletter-issue-01.md`.
- Set up a free Gumroad or Notion page for the "Zero Cost Starter Stack" PDF and the n8n template JSONs.

### Days 1 to 15: the follower sprint
- **Cadence:** two posts a day, 8:30 to 9:00 IST and 8:30 to 9:30 pm IST (US East Coast late morning, the window most 2026 studies rank first for company pages). Weekly rhythm by weekday is in the engagement playbook. Mostly carousels, one poll every third day, one text post a day with an image.
- **Outbound as the page:** 15 to 20 comments a day under big AI and business creators, within 15 minutes of their posts, each adding a specific free alternative. This is the only outbound reach a page has.
- **Tagging:** tag the repo's maintainer and the tool's page on every slide deck. Message maintainers via GitHub issues or their public email that they were featured.
- **Newsletter:** launch on day 7 at 300 to 500 followers. Launch fires a one-time subscribe invite to all followers; every later follower is invited automatically and subscribers auto-follow the page.
- **Paid:** from day 3, a small follower-ad test (about 15 to 25 dollars a day) targeting titles Founder, Operations Manager, Marketing Manager, Agency Owner and skills Zapier, Automation, Small Business. Boost the day-15 flagship carousel to a lookalike of followers.
- **Off-platform seeding:** post each carousel's cover plus link in r/selfhosted, r/smallbusiness, r/n8n, Indie Hackers and X with the page credited.
- **Reply** to every comment as the page within the hour, with a follow-up fact, not thanks.

### Days 16 to 45: lock the fingerprint and the funnel
- Keep two a day. Add one weekly series: "Cost teardown" (a real business type rebuilt at $0) and "Repo of the day" from `data/candidates.json`.
- First lead magnet post (day 20): the Starter Stack PDF, delivered via newsletter link.
- Publish a one-page media kit at 3,000 followers with open rate, follower roles and engagement rate.
- Start affiliate links (n8n Cloud pays 30% for 12 months; also Make, Apify, hosting providers) in the newsletter, disclosed.

### Days 46 to 90: monetize
- First sponsor: a self-hosting VPS provider, an open-source company's cloud tier, or an automation platform. Sell a bundle: newsletter slot plus one carousel plus one tagged post.
- Launch the first paid product: a 29 to 49 dollar pack of 25 n8n workflows for small business, or a 99 dollar "Zero Cost Stack setup" video course.
- Open a LinkedIn Live monthly: "Rebuild your stack at $0", with a guest maintainer.
- Decide at day 90 between a paid community (49 to 99 dollars a month) and a done-for-you setup service (highest ticket, uses your automation skills).

---

## 4. KPIs and realistic numbers

| Milestone | Target | Why |
|---|---|---|
| Day 7 | 300 to 500 followers, newsletter live | enough base for the launch invite burst |
| Day 15 | 1,000 to 3,000 followers, 300+ subscribers | organic plus a small paid budget; 10k in 15 days needs 5k to 10k dollars of ads or a reshare from a 500k account |
| Day 45 | 5,000 followers, 1,500 subscribers, media kit out | sponsor conversations start at about 3k engaged subscribers |
| Day 90 | 10,000 followers, 4,000 subscribers, first 1,000 dollars in sponsors or products | niche B2B pages in this range charge 200 to 2,000 dollars per sponsored post |

Watch: saves per post (target 2% of impressions), follower conversion of newsletter launch (Zoom saw about 10% in 24 hours), reshares per carousel, comment reply time.

---

## 5. Monetization ladder, fastest first

1. **Affiliates** from day 1, disclosed, inside the newsletter and first comments. n8n Cloud 30% for 12 months; Make, Apify, Hostinger or Hetzner style VPS referrals.
2. **Templates and packs** at 15 to 49 dollars on Gumroad: n8n workflow bundles, the Starter Stack, prompt packs per business function.
3. **Sponsorships** at 3,000+ subscribers. AI niche CPMs run 20 to 38 dollars consumer and 40 to 70 dollars B2B. Bundle page carousel plus newsletter slot.
4. **Course or cohort** at 99 to 299 dollars once the audience keeps asking the same setup questions.
5. **Paid community** at 49 to 99 dollars a month (the Herk and Ottley pattern) or **done-for-you stack setup** for small businesses, which is where your automation skills turn into the highest ticket.
6. **Apply for LinkedIn's native rails** as they open: Creator Marketplace, BrandLink video revenue share, and the FY2027 paid subscriptions. Treat as upside only.

---

## 6. Daily production workflow (about 25 minutes per post)

1. `python3 scripts/fetch_repos.py --topics <topic> --min-stars 5000` once a week to refresh candidates.
2. Pick the item. Open the repo and the paid tool's pricing page. Write the spec JSON (copy `content/carousel-sample.json`).
3. `python3 scripts/carousel2.py content/<post>.json --theme <key> --out assets/carousels/<post>`. Mix slide types: open with `cover`, one `versus` per swap, then `bars` or `checklist`, a `stat`, `steps`, `list` recap, `cta`.
4. Upload `carousel.pdf` as a document post. First line is the number. Repo link in the first comment. Tag the maintainer and tool page.
5. Log impressions, saves and follows at 24 hours in a sheet. Double down on the format that wins saves.

---

## 7. Rules that protect the page

- No external links in the post body. Links in the first comment or in Featured.
- No comment-gated lead magnets. One lead-magnet post every 3 to 4 weeks.
- No engagement pods, no bought followers, no AI-written generic text. All three are filtered or penalised in 2026.
- Never post a tool nobody on the team has run. Never post a price not checked that week. Note the licence (AGPL and fair-code have commercial limits that matter to businesses).
- One topic only. The page's topic fingerprint is the growth engine.

Figures in this kit come from vendor studies cited in the research conversation; treat them as directional and validate against your own first 30 posts.
