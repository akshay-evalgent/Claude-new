# Halo Chad (@Chad.halo12): what made the channel work

Data pulled on 2026-11-20 with `yt-dlp --flat-playlist` from the Shorts tab. The raw list is in `research/data/halo-chad-shorts-2026-11-20.tsv`.
- **Channel:** 897 Shorts, **68.2M total views**, 37.9K subscribers. It has no long videos.
- **About:** "You just got Cantina'd". Many titles tag **@TheCantinaApp**: the AI app shown generating the footage at the start of each Short is a paid sponsor.

## 1. The breakout came from narrowing the format
The Shorts tab lists newest first, so a position in the list is an age (0 = newest).

| Position | Median views | Best | Shorts over 100k |
|---|---|---|---|
| 0-99 (newest) | **68,500** | 6.3M | 31 |
| 100-199 | **31,000** | 8.0M | 22 |
| 200-299 | 1,900 | 29K | 0 |
| 300-899 (oldest) | 1,000-2,150 | 915K | 4 |

For about 700 Shorts the channel tried everything: girlfriend, boss, Lamborghini, Trump, soccer, K-pop and "brainrot" pranks, at a median of 1-2k views. **All 15 of its million-view Shorts are among the newest 200.** Those are almost all one format: **AI footage of something absurd happening to Dad's house, sent to Dad by text.**

## 2. Topics, ranked
Median views by topic hashtag; hashtags with at least 8 Shorts only.

| Topic | Shorts | Median | Total | Over 500k |
|---|---|---|---|---|
| #pool | 17 | **68,000** | 16.3M | 3 |
| #gardening | 11 | 63,000 | 1.6M | 1 |
| #painting | 12 | 39,000 | 3.3M | 1 |
| #koifish | 8 | 34,500 | 2.7M | 1 |
| #construction | 149 | 27,000 | **31.8M** | 10 |
| #dad | 178 | 4,850 | 15.6M | 8 |
| #boss | 46 | 3,750 | 1.8M | 1 |
| #mom | 64 | 1,500 | 0.2M | 0 |
| #gf | 83 | 1,300 | 0.3M | 0 |
| #brainrot | 36 | 938 | 0.1M | 0 |

**They re-make their winners.** The snow Short we studied (AgV7DewK5do, 46K so far, one of their newest) is a new version of their 1.7M snow Short (Yf83JZKU73k), and pool and construction premises come back again and again. A winner is a template, not a one-off.

**Rule:** Dad plus his house or yard. Pools, lawns, paint, roofs and driveways all work. Mom, girlfriend and boss mostly flop.

## 3. Their top Shorts
| Views | Title (as posted) | What happens |
|---|---|---|
| 8.0M | I've never seen him THIS angry😭 | pool / construction |
| 6.3M | Is this not a good addition to the backyard?😭 | pool |
| 4.9M | "Do they think I'm Mr. Beast😂 | Halloween |
| 3.8M | He thought we were contacting aliens😂 | wifi |
| 3.6M | Is this not the best idea ever?? | construction |
| 3.2M | There is NO WAY he said that😨😳 | vacation |
| 2.6M | He expected REAL man power😭 | painting |
| 2.0M | The way he reacted has me CRYING😂 | construction |
| 1.7M | No way my dad said that😭 | snow (the first version of the Short we studied) |

## 4. Titles
- **Never describe the prank; tease Dad's reaction.** "No way he said that", "He was asking ALL the right questions", "Did he overreact??", "The ending had me CRYING".
- **One word in CAPS:** median **15,500** views with one, against **1,800** without.
- **A rhetorical question that invites an argument:** "Is this not the best driveway ever?", "Who would LOVE this at their house?", "Was his reaction valid?"
- **Quoting Dad's caps line** works sometimes: "WE LIVE IN A HOUSE NOT A HOTEL", "ARE WE CONTACTING ALIENS". The median for quote titles is 2,600, so it is not a sure thing.
- **Always 4-5 hashtags:** `#prank` (or `#pranks`), the topic (`#pool`), `#dad`, `#funnyvideo`, `#comedyshorts` (or `#viralvideo`).

### Rewrite our two titles like this
- Snow: `He did NOT take this well😭 #prank #snow #dad #funnyvideo #comedyshorts`
- Dogs: `He just wanted his dog BACK😭 #prank #dog #dad #funnyvideo #comedyshorts`

Keep the hook caption on screen ("texted my dad the snow guy brought…"). The title teases the reaction; the caption explains the prank.

## 5. The video itself
Studied frame by frame on the snow Short (75 s); see `research/prank-text-recipe.md`.
1. **Hook (0-3 s):** the most absurd AI shot full screen, with a one-line caption.
2. **Tool (3-6 s):** the AI app generating the footage. For them this is the paid slot; for us it is the "how it's made" moment, and a sponsor slot later.
3. **The texts (6-75 s):**
   - Three clip drops, each bigger than the last.
   - Dad goes from calm to ALL CAPS after the second drop.
   - The sender stays deadpan and lowercase.
   - It ends on Dad's loudest line, with no reveal.

The engine does all of this: `chatvid/imsg/` with `episodes/prank-*.json`.

## 6. Our idea bank
These are our own premises in their winning topics. We don't remake their videos.

| # | Premise | Clip A → B → C | Dad's peak line (draft) |
|---|---|---|---|
| 1 | "the pool guy said it's a small dig" | a hole → a crater with an excavator → an Olympic pool with a diving tower where the lawn was | "WE HAVE A HIGH DIVE NOW??" |
| 2 | "the landscaper is doing a hedge" | one hedge → a hedge maze → a topiary of Dad's face | "WHY IS MY FACE IN THE BUSHES" |
| 3 | "painter said just the front door" | yellow door → yellow house → the whole street yellow | "THE NEIGHBORS DIDNT ASK FOR THIS" |
| 4 | "internet guy said we need a bigger router" | a dish on the roof → a cell tower in the yard → planes circling | "WHY IS AIR TRAFFIC CONTROL CALLING ME" |
| 5 | "roofer is fixing one shingle" | a ladder → scaffolding → a second-floor addition, then a third | "WE HAVE AN ATTIC NOT A SKYSCRAPER" |
| 6 | "i put up a few christmas lights" | the porch lit → the house lit → seen from a plane | "THE POWER COMPANY IS AT THE DOOR" |
| 7 | "max wanted a dog house" | a dog house → a two-story dog house → a dog mansion bigger than ours | "WHY DOES THE DOG HAVE A GARAGE" |
| 8 | "the snow guy is back" (sequel) | the same crew → a snow castle → a ski lift | "I SAID NO SALT NOT NO LIMITS" |

**Order:** start with pool (#1), landscaper (#2) and painter (#3); those topics have the highest medians.

## 7. For a deeper study
Their 8 biggest Shorts are worth studying frame by frame (pacing, caption style, Dad's lines, how much each clip escalates). YouTube blocks downloads from our server, so download them on your computer.

```bash
yt-dlp -f "bv*[height<=1920]+ba/b" --merge-output-format mp4 --write-info-json -o "%(view_count)s_%(id)s.%(ext)s" https://www.youtube.com/shorts/4AO5CkaDRLg https://www.youtube.com/shorts/KZVxwT4rJBk https://www.youtube.com/shorts/y9n_4uhqCXI https://www.youtube.com/shorts/y3fMhO7Ybv8 https://www.youtube.com/shorts/JWy0N7c6jDc https://www.youtube.com/shorts/oTgAg6igTK8 https://www.youtube.com/shorts/YrpBEQ8oN9w https://www.youtube.com/shorts/Y3cBAF3OhQ8
```

Then upload the `.mp4` files, plus the `.info.json` files, which hold the upload date, length, likes and description.
