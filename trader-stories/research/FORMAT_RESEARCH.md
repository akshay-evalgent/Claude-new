# Format research: new animated finance channels (22 November 2026)

## How this was done

- Searched YouTube for this year's most-viewed videos (filter: this year, sorted by views) across 46 finance, money and story queries.
- Took every long-form channel with a 500k+ video and profiled 22 of them: join date, subscribers, number of videos, total views, median views of the latest 10 uploads, and how many videos passed 1M.
- Raw numbers: `channels_2026-11-22.csv`.
- Limits:
  - YouTube blocked single-video pages, so upload dates per video are not known.
  - View counts are lifetime totals.
  - "New" means the channel joined in 2024–2026, or has only a handful of uploads.
- Web "top faceless channel" lists were mostly SEO posts with unverified numbers, so they were not used for figures.

## The channels that matter

| Channel | Joined | Subs | Videos | Total views | 1M+ videos | Median of last 10 | Format |
|---|---|---|---|---|---|---|---|
| Crayon Capital | Mar 2025 | 323k | 36 | 27.1M | 10 | 360k | Cartoon "Explained Like You're 5" of big money events |
| Lume | Jun 2024 | 363k | 105 | 62.0M | 19 | 194k | 3D-illustrated true stories of clever money heists and loopholes |
| EverythingProfessor | Jan 2025 | 716k | 101 | 61.3M | 15 | 35k | "Every X Explained" lists (now fading) |
| Lock Stock Finance | Feb 2025 | 224k | 50 | 12.0M | 2 | 85k | "If You Don't Understand X, You Don't Understand Money" |
| The Life Outline | Jan 2026 | 92k | 16 | 12.3M | 2 | 17k | "Your Life as Every Rank in…" (cartel ranks) |
| Hypothetically | Oct 2023 | 344k | 41 | 32.3M | 8 | 180k | Stick-figure POV and "every level" hypotheticals |
| Billionaire Bears | 2022, 7 uploads | 206k | 7 | 9.8M | 4 | 1.1M | Trader documentaries (closest to us) |
| Primate Economics | 2022, 17 uploads | 578k | 17 | 12.1M | 6 | 219k | "X Explained with Bananas" |
| Dark Ledger | Mar 2026 | 32k | 35 | 3.2M | 1 | 13k | "Every level of wealth", cartoon |
| Finance Expl. | Mar 2026 | 14k | 16 | 0.9M | 0 | 6k | "Your Life at Every Level of a Day Trader" (738k), then nothing |
| POV Finance | Apr 2026 | 31k | 186 | 5.8M | 0 | 24k | "POV: you adopted the old-money mindset" |
| Hamish Hodder | 2016 | 394k | 541 | 55.5M | 14 | 956k | Trading-loss stories with real footage (not animated) |

**Biggest single videos per format:**

- **Cartoon ELI5** (Crayon Capital):
  - The Wolf of Wall Street Scam Explained Like You're 5: 4.3M
  - The Great Depression…: 3.0M
  - The 2008 Financial Crisis…: 2.3M
  - NVIDIA…: 2.0M
- **Every level / every rank:**
  - Your Life as Every Mexican Cartel Rank: 7.4M (channel 10 months old)
  - What Every Level of Wealth ACTUALLY Feels Like: 1.7M
  - How Banks Treat You at Every Level of Wealth: 1.3M
  - Your Life at Every Level of a Day Trader: 738k
- **"If you don't understand X"** (Lock Stock Finance, LITTLE BIT BETTER):
  - If You Don't Understand Bonds…: 3.1M
  - …the Petrodollar…: 2.9M
  - Once You Understand Economics, You Can't Be Manipulated Anymore: 4.4M
- **Clever-hustle true stories:**
  - He Outsmarted Europe's Best Bank Engineers and Stole $10 Million Using a $5 Tool: 4.5M (Lume)
  - The Man Who Legally Cheated Three Casinos Out of $15 Million: 2.8M (Lume)
  - How Binance Lost $6,300,000,000 in One Night: 2.5M (Gloam, 6-video channel)
- **Trader documentaries** (Billionaire Bears):
  - BNF, the God of Japanese Day Trading: 4.6M
  - NAV, the Bedroom Trader Who Outsmarted Wall Street: 1.9M
- **Analogy device** (Primate Economics):
  - Inflation Explained with Bananas: 1.7M
  - Tax…: 1.6M
  - Tariffs…: 1.5M

## What the numbers say

1. **Format decay is fast.** Late copies of a hot format get one hit and then fade:
   - Finance Expl. had one 738k video, then 1–8k.
   - Dark Ledger had one 1.3M video, then 13–25k.
   - The Life Outline had 7.4M, then about 10k.
   - EverythingProfessor's median has fallen to 35k.

   The winners own a recognisable look and a repeatable title pattern, and keep picking topics people already know (Wolf of Wall Street, 2008, NVIDIA, Binance).
2. **The topic beats the format.** Every format's top videos are about famous names or events, or a clear "secret/loophole" promise.
3. **Trader stories already work.** Billionaire Bears gets 1M+ on most uploads with 7 videos. Their thumbnail pattern is a huge dollar figure plus a face; their titles use a nickname and a superlative.
4. **Length:** 8–10 min for concept explainers; 14–28 min for stories and ELI5.

## The five formats for us

Each format is copied as a structure (pacing, title pattern, thumbnail logic). We do not copy anyone's characters, art style, scripts or thumbnails, and each format gets its own look.

### 1. "Explained Like You're 5": cartoon versions of famous money events
- **Model:** Crayon Capital, the strongest new channel in the set (28% of its videos pass 1M, 360k median).
- **First titles:**
  - The Enron Scandal Explained Like You're 5
  - The GameStop Squeeze Explained Like You're 5
  - The Dot-Com Bubble Explained Like You're 5
  - How Bitcoin Works Explained Like You're 5
- **How we make it:**
  - Build our own small cartoon character kit as SVG in Remotion (a narrator character, a "banker", a "regular guy", props). This makes characters perfectly consistent and lets them blink, talk and gesture, which FLUX images cannot do.
  - Use FLUX in a flat-cartoon style for backgrounds only.
  - Keep the Kokoro voice, but faster and friendlier.
- **Viral potential:** high. The format is proven, the topics are evergreen, and the ELI5 angle widens the audience beyond finance fans.
- **Risk:** the phrase "Explained Like You're 5" is generic, but Crayon Capital is closely tied to it. We need our own drawing style and characters, and could use a different series label.

### 2. "Your Life at Every Level of…": a money ladder in second person
- **Model:** The Life Outline, Hypothetically, Dark Ledger and Finance Expl.
- **First titles:**
  - Your Life at Every Level of a Hedge Fund
  - Your Life at Every Rank at Goldman Sachs
  - Every Level of Trader: $1,000 to $1 Billion
  - Your Life at Every Level of Crypto Wealth
- **How we make it:**
  - 8–12 levels, about a minute each, written in the second person ("you").
  - A level counter and salary/net-worth meter as Remotion graphics.
  - A stick or simple cartoon "you" character from the same SVG kit.
- **Viral potential:** high for one or two hits, low for a series. It's the fastest-decaying format in the data.
- **Best use:** occasional tentpole uploads, not a whole channel.

### 3. "If You Don't Understand X, You Don't Understand Money": short concept explainers
- **Model:** Lock Stock Finance (3.1M, 2.9M) and LITTLE BIT BETTER (4.4M).
- **First titles:**
  - If You Don't Understand Interest Rates, You Don't Understand Money
  - …the Dollar…
  - …Short Selling…
  - Once You Understand Inflation, You'll Never Save the Same Way
- **How we make it:**
  - 8–10 minutes, mostly animated diagrams and charts.
  - We already have chart, flow and number-card components and real data pipelines (World Bank etc.).
  - Few or no AI images needed, so this is the cheapest and fastest format: about half a day per video.
- **Viral potential:** medium. Hits are rarer (4% of Lock Stock's videos pass 1M) but the format is steady, has the highest finance ad rates, and feeds viewers into the story videos.

### 4. "He Outsmarted…": clever-hustle true stories (an evolution of our current films)
- **Model:** Lume (19 videos over 1M), Billionaire Bears (BNF 4.6M) and Gloam's Binance video (2.5M).
- **First titles:**
  - The Man Who Found a Glitch in the Lottery and Won $26 Million (Jerry Selbee, Michigan/Massachusetts)
  - The Brothers Who Tried to Corner the World's Silver
  - The Trader Who Made $1 Billion Betting Against the Pound
- **How we make it:**
  - Our current pipeline: research, script, FLUX scenes, Remotion graphics, Kokoro voice.
  - Change the packaging: topics with a clever method or loophole rather than "rogue trader lost money", and titles of the form "He… + number + method".
  - Thumbnails with one huge number and one face, as Billionaire Bears does.
- **Viral potential:** high. This is our existing skill set, and the data shows the angle ("outsmarted", "legally cheated", "using a $5 tool") outperforms plain loss stories.

### 5. "X Explained with…": one running analogy object
- **Model:** Primate Economics ("…Explained with Bananas": 6 of 17 videos over 1M).
- **Our version:** our own running device, never bananas. For example, a village of 100 people, or a single lemonade stand that grows into a bank, a stock exchange and a central bank across episodes.
- **First titles:**
  - Inflation Explained With One Lemonade Stand
  - The 2008 Crash Explained With One Lemonade Stand
- **How we make it:** SVG cartoon kit plus simple props in Remotion, short (5–11 min), with heavy reuse of assets between episodes.
- **Viral potential:** medium–high if the device is funny and visual. Cheap once the kit exists.

## Ranking

| | Format | Proof | Fit with our pipeline | Cost per video | Pick |
|---|---|---|---|---|---|
| 1 | Clever-hustle true stories | Strong | Already built | Medium | **Start here** |
| 2 | Cartoon ELI5 of famous events | Strongest new channel | Needs SVG kit (one-off build) | Medium | **Second** |
| 3 | "If you don't understand X" | Solid | Already built | Low | Weekly filler |
| 4 | Running-analogy explainers | Good | Needs SVG kit | Low after kit | Later |
| 5 | Every level / every rank | Big but decays | Easy | Low | Occasional tentpole |

## The virality research still to do before we commit

1. **Pilot test:**
   - Make one video each of formats 1, 2 and 3.
   - Publish a week apart, with A/B thumbnails (YouTube Test & Compare).
   - Compare click-through rate, average view duration and returning viewers after 7 days. Success: CTR above 6% and average viewed above 40%.
2. **Topic demand:**
   - For each candidate topic, check search volume and existing competition (top 5 videos on that topic, their age and views).
   - Prefer topics where the best video is old or poor.
3. **Policy:**
   - YouTube's inauthentic-content rule (formerly "reused content") targets mass-produced, templated videos.
   - Each video needs original research and a distinct script.
   - Keep the "altered or synthetic" disclosure, as now.
