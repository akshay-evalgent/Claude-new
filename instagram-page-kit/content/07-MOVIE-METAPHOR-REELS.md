# The Movie Metaphor: @wealth's 17.6M-view format, rebuilt for a new account

This format is confirmed from a real @wealth reel (`reference/01-DfLHlFtptGu.md`): 17.6M views, 962K likes, 41.6 seconds. A short scene shows a money or business idea, a one-line hook frames it, and a long caption turns it into a lesson.

## The layout (measured from the real reel)

| Part | Spec |
|---|---|
| Canvas | 1080 x 1920, black |
| Hook | 3 lines, centred, Title Case, bold rounded sans, white. The two contrasting phrases in pale yellow (#F5FA5A). Ends with a colon. Bottom edge at y ≈ 560. |
| Clip | Full width, 3:2 (1080 x 720), from y = 600 to y = 1320 |
| Bottom | Black from y = 1320 down, where Instagram's caption overlay sits |
| Handle, watermark, subtitles | None on @wealth's version. A small handle under the clip is fine on yours. |
| Length | 30 to 45 s. Long enough for the scene to pay off. |
| Audio | The scene's own sound |

Make the frame in one command:
```
python3 scripts/headline.py "The Perfect Example Of What Saving Vs Investing Looks Like:" \
    --highlight "Saving" --highlight "Investing" --style metaphor --handle --out saving.png
```
In Edits or CapCut: put the clip on the bottom layer, scale it to full width, centre it on y = 960, and put the PNG on top. The PNG is black with a transparent window, so it crops the clip for you.

## The one big difference: footage

@wealth uses scenes from Hollywood films. Don't do that on a new account:

- **Copyright.** Studios can mute the audio, block the reel in some countries, or issue strikes that disable the account. A 19M-follower page can take that risk. A page with 0 followers loses everything.
- **Instagram's originality rules.** A film clip with a text overlay is the textbook example of "not enough added". Accounts that post mostly that kind of thing stop being shown to non-followers, which is where all of a new account's views come from.

Keep everything else: the hook, the layout, the length, the caption. Just take the footage from here:

| Source | Example | Notes |
|---|---|---|
| **Stock video** (Pexels, Pixabay free; Storyblocks, Envato paid) | Escalator vs stairs, snowball rolling, dominoes, conveyor belt | Easiest. Search the metaphor, not the lesson. |
| **Public-domain films** (archive.org, Prelinger Archives) | Harold Lloyd hanging off a clock in *Safety Last!* (1923), silent-era chases | Old-film charm without the copyright. Public-domain status depends on your country, so check it for each film. |
| **AI-generated video** | "A man digging with a spoon next to an excavator" | Label it with Instagram's AI info tag. Don't make it look like real people. |
| **Film it yourself** | Eggs in one basket, coins in two jars, a paper maze | Phone on a stack of books, good light. It looks homemade, and homemade often gets shared. |
| **Simple animation** (Canva, CapCut) | Two bars racing, a dot taking a shortcut | Quick, fully yours |

## The hook formulas

From the real reel, plus variants that keep its shape:

1. The Perfect Example Of What **[A]** Vs **[B]** Looks Like:
2. What **[Idea]** Looks Like In Real Life:
3. This Is What **[Idea]** Actually Looks Like:
4. **[Most People]** Vs **[Rich People]** In One Scene:
5. If **[Idea]** Was A Video:

Rules: Title Case, two highlighted phrases when there's a contrast (one when there isn't), end with a colon, 8 to 14 words.

## The caption formula

From the real reel's structure (write your own words every time):

```
1  A blunt claim.            One sentence that goes against the usual advice.
2  The pattern.               Two or three sentences about what most people do.
3  Two real examples.         Named people or companies, with one number each. Source in your notes.
4  Two-line closer.           Short, rhythmic, screenshot-able.
                              (blank line)
5  Footage credit + tags.     "Footage: Pexels / creator name" and 5 hashtags, one about the clip type.
```

## 12 ready reels

Each has a hook, footage you're allowed to use, and a caption outline. Check any fact you add.

### M1. Saving vs investing
- **Hook:** The Perfect Example Of What [Saving] Vs [Investing] Looks Like:
- **Footage:** split action. A jar of coins on a shelf, then a plant growth timelapse (stock: "coins jar", "plant timelapse").
- **Caption:** claim: a savings account protects money, it doesn't grow it much. Pattern: people wait for the "right time" for years. Examples: the rule of 72 (8% a year doubles money in about 9 years; at 1% it takes about 72). Closer: about saving keeping what you have and investing growing it. Add "not financial advice".

### M2. Compound interest
- **Hook:** What [Compound Interest] Looks Like In Real Life:
- **Footage:** snowball rolling downhill and growing (stock: "snowball rolling"), or a row of dominoes getting bigger.
- **Caption:** $300 a month from 25 to 65 at 8% a year ends near $1.05M, starting at 35 ends near $447K (assumptions stated). Closer about time doing the heavy lifting.

### M3. Leverage
- **Hook:** The Perfect Example Of What [Effort] Vs [Leverage] Looks Like:
- **Footage:** a person straining to push a heavy crate, then a forklift lifting it easily (stock: "forklift warehouse", "man pushing heavy box").
- **Caption:** leverage means code, media, capital and people working while you sleep. Examples: one YouTube video watched for years, one app sold millions of times.

### M4. Systems vs effort
- **Hook:** What [Working In] Vs [Working On] Your Business Looks Like:
- **Footage:** hands making one item slowly, then a factory line making hundreds (stock: "handmade craft", "conveyor belt factory").
- **Caption:** McDonald's built a system any teenager could run. Ray Kroc sold the system, not the burger.

### M5. Patience
- **Hook:** This Is What [Patience] In Business Actually Looks Like:
- **Footage:** a seed sprouting timelapse, roots first (stock: "seed germination timelapse").
- **Caption:** Amazon didn't post a full-year profit until 2003, nine years after it was founded. Closer about roots before fruit.

### M6. Diversification (film it yourself)
- **Hook:** The Perfect Example Of [All Eggs In One Basket] Looks Like:
- **Footage:** you carrying a basket of eggs and tripping (plastic eggs, soft landing). Funny and obviously yours.
- **Caption:** concentration builds wealth, diversification keeps it. Name one company that fell hard (check facts). Not financial advice.

### M7. Risk (public domain)
- **Hook:** What [Taking A Risk] Feels Like Vs What [It Looks Like] From Outside:
- **Footage:** the clock-hanging scene from Harold Lloyd's *Safety Last!* (1923). It's public domain in the US. Check for your country.
- **Caption:** every founder story has this scene. Example: Airbnb's founders funding the company by selling cereal in 2008.

### M8. Lifestyle creep
- **Hook:** What [Most People] Vs [Rich People] Do With A Raise:
- **Footage:** someone carrying shopping bags, then someone putting coins in a jar (stock).
- **Caption:** the gap between income and spending is the only thing that builds wealth. The 50/30/20 rule as a starting point.

### M9. Opportunity cost
- **Hook:** This Is What [Opportunity Cost] Looks Like:
- **Footage:** a person at a fork in a forest path, picking one (stock: "crossroads path").
- **Caption:** every yes is a no to something else. Example: Netflix's founders offering to sell to Blockbuster for $50M in 2000.

### M10. Delegation
- **Hook:** The Perfect Example Of [Doing Everything] Vs [Delegating] Looks Like:
- **Footage:** a one-man band struggling, then an orchestra with a conductor (stock: "one man band", "orchestra conductor").
- **Caption:** the founder's job moves from doing to deciding. Example: Southwest's one-plane strategy made every pilot interchangeable.

### M11. Consistency vs intensity
- **Hook:** What [Consistency] Vs [Intensity] Looks Like:
- **Footage:** water dripping on stone, then a single big splash (stock: "water drop slow motion").
- **Caption:** one viral month vs posting every day for a year. Example: James Dyson's 5,127 prototypes.

### M12. Shortcuts that work
- **Hook:** The Perfect Example Of What [Thinking] Before [Working] Looks Like:
- **Footage:** animation of two dots in a maze. One runs every corridor, the other traces the path on paper first and finishes sooner.
- **Caption:** an hour of planning saves a week of rework. Example: IKEA's flat-pack idea came from taking the legs off a table to fit it in a car.

## How many of these to post

One real reel isn't enough to know @wealth's full mix. Until there are more examples in `reference/`, try the Movie Metaphor as **2 to 3 of your 7 weekly posts** next to the news and breakdown formats, and let your own numbers decide (`05-GROWTH-PLAYBOOK.md`).
