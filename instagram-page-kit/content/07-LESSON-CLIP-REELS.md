# The Lesson Clip: @wealth's format, rebuilt for a new account

Confirmed on three real @wealth reels with 6.3M, 17.6M and 29.1M views (`reference/PATTERNS.md`). A short clip shows a moment, a hook above it names the lesson, music sets the mood, and a caption essay spells the lesson out. All three are about mindset and life lessons, not business news.

## The layout (measured from all three reels)

| Part | Spec |
|---|---|
| Canvas | 1080 x 1920, black |
| Hook | 1 to 3 lines, centred, Title Case, bold rounded sans, white. Key words in pale yellow (#F5FA5A). Emojis allowed (add them in your editor, the script doesn't draw emoji). Bottom edge about 40 px above the clip. |
| Clip | Full width, **always starting at y = 600**. Height follows the source: 720 for 3:2, about 920 for a squarer clip. |
| Bottom | Black below the clip, where Instagram's caption overlay sits |
| Handle, watermark, subtitles | None on @wealth's version. A small handle under the clip is fine on yours. |
| Length | 15 to 60 s. The 60 s emotional story did best (29.1M). |
| Audio | A trending song, slowed versions for emotional clips (2 of 3 reels). The scene's own sound only when the scene needs it. |

Make the frame in one command:
```
python3 scripts/headline.py "The Perfect Example Of What Saving Vs Investing Looks Like:" \
    --highlight "Saving" --highlight "Investing" --style metaphor --handle --out saving.png
```
For a squarer clip, add `--clip-height 920`. In Edits or CapCut: put the clip on the bottom layer, scale it to full width, line its top up with y = 600, and put the PNG on top. The PNG is black with a transparent window, so it crops the clip for you.

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

Three types, one from each real reel:

| Type | Formula | Real example | Best for |
|---|---|---|---|
| **Story title** | [2 to 4 Word Lesson] + 1 or 2 emojis | "Words Have Power" (29.1M) | Emotional clips with a beginning, middle and end |
| **Metaphor** | The Perfect Example Of What [A] Vs [B] Looks Like: | Working Hard Vs Working Smart (17.6M) | A scene that shows a contrast |
| **POV** | POV: You Learned How To [Skill] | Focus On The Solution, Not The Problem (6.3M) | Short loops of someone doing something cleverly |

More in the same shapes: "Patience Pays 🌱", "Kindness Is Free ❤️", "What [Idea] Looks Like In Real Life:", "POV: You Stopped Caring What People Think".

Rules: Title Case, yellow on the words that carry the lesson, a colon at the end of metaphor hooks, 3 to 14 words.

## The caption formula

The same structure appears on all three reels. Write your own words every time.

```
1  Thesis + 2 emojis.        One sentence. "Problems are guaranteed. Staying stuck is optional." 🧠🔧
2  The universal pain.        A list of 3 or 4 everyday examples people recognise.
3  The reframe.               What's really going on.
4  The advice.                What to do instead. Famous examples optional (with a source).
5  Closing aphorism.          One or two lines people screenshot.
6  Your fixed follow line.    The same every time, e.g. "Follow @yourhandle for one lesson every day. ⭐"
7  Credit.                    "Footage: Pexels / creator name" (or the public-domain film title).
8  Exactly 5 hashtags.        Your brand tag first, then #Mindset or #LifeLessons, then 2 topic tags.
```
Put a blank Braille character (⠀) on the empty lines between paragraphs so Instagram keeps the spacing.

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

## Story and POV reels

### S1. Patience Pays 🌱
- **Hook (story title):** Patience Pays + 🌱
- **Footage:** a 40 to 60 s timelapse of a garden or building going up (stock: "construction timelapse", "garden timelapse"), sad or hopeful slowed song.
- **Caption:** results show up late. List of things that take years: skills, savings, trust, a body you're proud of. Closer about planting now.

### S2. Kindness Is Free ❤️
- **Hook (story title):** Kindness Is Free + ❤️
- **Footage:** film it yourself or use stock: someone paying for a stranger's coffee, helping carry bags. A small story with an ending.
- **Caption:** generosity compounds like interest. Closer about who people remember.

### P1. POV: You Learned How To Say No
- **Hook (POV):** POV: You Learned How To **Say No Without Explaining**
- **Footage:** a 10 to 15 s loop of someone calmly closing a laptop and walking outside (stock), trending song.
- **Caption:** time is the only thing you can't earn back. List of things people say yes to out of guilt.

### P2. POV: You Started Investing At 25
- **Hook (POV):** POV: You Started **Investing At 25**
- **Footage:** someone relaxed on a balcony or travelling (stock), trending song.
- **Caption:** $300 a month from 25 to 65 at 8% a year ends near $1.05M, starting at 35 near $447K. State the assumptions. Not financial advice.

## How many of these to post

All three measured @wealth reels are lesson clips, so if you want @wealth's results, this is the core format: **4 to 5 of your 7 weekly posts**, mixing story, metaphor and POV hooks. Fill the other slots with breakdowns or data reels, which are fully original and give sponsors something to pay for. Then let your own numbers decide (`05-GROWTH-PLAYBOOK.md`).
