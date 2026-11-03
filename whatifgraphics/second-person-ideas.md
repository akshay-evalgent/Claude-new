# Five more second-person channel themes, built from how viewers actually watch

Follow-up to `channel-theme-research.md`. Brief: second-person formats only, scoring above the previous best (22),
with the video format and animation style specified, and the viewer psychology made explicit.

Data read on 3 Nov 2026 from YouTube search (past month, sorted by views) across 27 new queries and 12 new
channel profiles. The thumbnail reference sheet for this round is `second-person-thumbnails.jpg`.

---

## 0. How a second-person video is experienced, moment by moment

The five themes below are engineered against this sequence, not against a topic list.

| Moment | What is happening in the viewer's head | What the video must do |
|---|---|---|
| Feed, 0.5 s | **Self-reference check.** The brain tags anything that is "about me" for priority (the self-reference effect). "YOU" in the title and a mechanic the eye understands instantly ("1 Day.", "DON'T MOVE", "6 DAYS LEFT"). | Title in second person. Thumbnail shows one number, one command or one countdown, never a scene. |
| 0 to 8 s | **Curiosity gap opens.** Loewenstein's information-gap: the viewer now knows there is a specific fact about themselves they do not have ("how long would I last?"). | State the question and the stake in one sentence. Do not introduce the channel. |
| 8 to 40 s | **Simulation starts.** Second person plus present tense triggers mental simulation; the viewer runs the scenario on their own body (embodied cognition). This is why "you feel the cold on your shins" works and "the survivor felt cold" does not. | Put the viewer somewhere physical immediately, with one sensory detail and one small decision. |
| 1 to 6 min | **Completion drive.** A numbered list, a countdown or a ranking creates an open loop the viewer wants closed (Zeigarnik effect). Each segment is a variable reward: a new number, a new place, a new verdict. | Make the structure visible on screen: a clock, a counter, a ranked list that fills in. Retention is a side effect of an unfinished list. |
| Any point | **Safe fear.** Dread, death and loss are the most arousing emotions, and the second person makes them personal, but animation and a calm narrator keep it "benign masochism" (Rozin): the thrill without the cost. | Keep the tone dry. The scarier the content, the calmer the voice. |
| 6 to 9 min | **Social comparison.** The viewer silently ranks themselves against the "you" on screen and against everyone else watching. | Give them a number or a label they can compare ("most people pick A", "you'd last 4 minutes, the average is 9"). |
| Last 30 s | **Peak-end rule.** The memory of the video is its peak plus its ending. The ending must give an identity payoff, not a summary. | End with a verdict about the viewer ("you are the kind of person who…") and one question to answer in the comments. |
| After | **Memory hook.** The video wins if it gets recalled in a real situation (plugging in a phone, hearing a dog at night). That is what makes a share. | Attach the premise to an everyday trigger the viewer will meet this week. |

Comments are the fastest 48-hour signal YouTube reads. Every theme below forces a comment by asking for a
number, a choice or a verdict the viewer already formed while watching.

---

## 1. "How Long Would YOU Last in Every ___?" (the survival gauntlet)

**Channel direction:** every episode drops you, one by one, into every version of a dangerous place and
stamps a survival time on each. Every prehistoric era. Every planet. Every WW2 job. Every horror movie.
Every country's prison. Every decade of the last 1,000 years. Every job on a medieval ship. Every level of the
Backrooms. The list is effectively infinite and every entry is a Short.

**Evidence.** "How Fast You'd Die In Every Prehistoric Era" 4.45M (Joe Bartolozzi). "How Long You Would Survive
in Every Prehistoric Era" 1.86M on a channel whose median is 9.5K (Sebastián Schiller, 35K subs). "How Long
Would Your Dog Survive in Every Prehistoric Era" 459K from a 2-video, 1.2K-sub channel (Outlast History). "How
Long You'd Last on Every Planet" 488K from an 821-sub channel with a 1.9K median (FAR SIGNAL). "Every WW2 Job"
120K, "Backrooms levels" 239K, "Every Horror Villain" 90K, "Danganronpa executions" 251K. ¿Y si? (1.3M subs,
median 1.85M): "Deserted Island" 2.8M, "Locked in a Supermarket" 1.9M. Four separate near-zero channels got
400K to 1.9M in the last 30 days with this exact format. That is the strongest small-channel signal in the
whole study.

**Why it works (psychology):** it is a test the viewer takes without effort. Self-assessment is a core
motive; the ranking format adds Zeigarnik completion ("I have to see the Cretaceous"); mortality salience is
delivered in safe, comic doses; and the number at the end of each segment is a social-comparison token the
viewer carries into the comments ("no way I'd last 4 minutes, I'd climb a tree").

**Video format:**
- **Title:** `How Long Would YOU Last in Every [Set]?` or `How Fast You'd Die in Every [Set]`. Add `(Real
  Science)` or `(No AI)` when true; both leaders use it as a trust badge.
- **Cold open (0:00–0:20):** "You wake up on the ground. The air is 35% oxygen and something the size of a
  bus is breathing behind you. The clock in the corner is how long you've got. Let's find out."
- **Structure:** 8 to 12 segments, chronological or escalating, 60 to 100 seconds each. Each segment has the
  same four beats: the arrival (one sensory detail), the first threat, the viewer's best move, the verdict
  with a stamped time ("YOU LAST: 4 MINUTES") and one line of why. One segment is the twist where you survive
  longer than expected (the Permian is safer than the Jurassic), one is the joke (you die before the segment
  starts).
- **The HUD:** a survival clock top-left that counts up during the segment and freezes red at death. A running
  leaderboard on the right that fills in as segments complete (this is the open loop).
- **Ending (last 45 s):** the full leaderboard, your average, the one era you'd thrive in, and the comment
  prompt: "Which era are you betting on? Name it before you scroll."
- **Length:** 15 to 22 minutes (Bartolozzi 35 min, Schiller 19 min, ¿Y si? 15 min). Longer is rewarded here.
- **Cadence:** 3 a week, each cut into 8 Shorts ("You'd last 4 minutes in the Cretaceous").

**Animation style and type:** our mascot, unchanged, dropped into high-contrast environment plates with a
heavy painted-sky look (the Schiller and Bartolozzi thumbnails use dramatic dusk palettes and silhouetted
creatures). Creatures and threats are big simple silhouettes with lit eyes, never detailed. Motion is
parallax plates, the mascot's reactions, and the clock. Thumbnail formula: one giant threat, the mascot
small, and a time stamp in huge white and red ("1 Day.", "SOLO 7 MINUTOS").

**Build with our pipeline:** add a `clock` HUD component, a `leaderboard` component, 10 environment plates per
episode (reusable across episodes: a jungle plate serves three eras), and a silhouette-creature library. Zero
new character rigs. One day per episode after the first.

**Scores:** Evidence 5 · 48-hour 5 · Build 5 · Money 4 · Durability 5 → **24/25**

---

## 2. "If Your ___ Ever Does This… DO THIS" (everyday-object protocols, the calm version)

**Channel direction:** survival protocols for situations nobody trained you for: your phone charges to 101%,
your cat watches you sleep, your Uber drives past your house, your screen time says 25 hours, your dog
throws the ball for you, MrBeast offers you money. Everyday objects, deadpan rules, and a punchline that is
half dread, half comedy. This is not the school-horror lane rejected last round; it is the Bradikinin lane,
which is lighter and brand-compatible.

**Evidence.** Bradikinin: 29 uploads, 55K subs, median 218K, peaks 2.98M, 2.1M, 1.8M, 971K, 732K, 515K.
Clones on the same dog premise: Pictofear 605K, Luvhilal 391K, YXL Plug 186K, Wackawackamunv2 174K, Final
Sight 496K. A single premise spawning five 150K+ clones in two weeks is the definition of a format with
demand to spare. Videos are short: 4:33 to 6:37.

**Why it works (psychology):** pattern interrupt on the mundane. The brain stores a threat tag on an object
it touches ten times a day; the next time the viewer plugs in a phone, the video replays itself (the memory
hook in the table above). The imperative in the title is a micro-contract (commitment and consistency: "I
now know the rule"). The dread is capped by comedy, which keeps it shareable rather than disturbing. And the
format exploits hypervigilance: the viewer scans their own room while watching.

**Video format:**
- **Title:** `If Your [object/pet/app] Ever [does one impossible thing]… [COMMAND IN CAPS]`. The first half
  must be something that could plausibly happen tonight. The command must be counterintuitive (DO NOT
  UNPLUG IT, GO GET IT, DON'T WAVE).
- **Cold open:** the rule, flat: "If your phone ever charges to 101 percent, do not unplug it. Leave it. Put it
  face down. I'll explain. There are five things you need to know, and the fourth is the one people get
  wrong."
- **Structure:** 5 rules, 45 to 70 seconds each, each a tiny case study ("Case 3, Dayton, Ohio, March. A man
  unplugged at 103%."), building to the withheld rule. Final 30 seconds: what happens if you follow all five,
  and the sign-off line that becomes the channel catchphrase.
- **Length:** 4 to 7 minutes, the shortest format in the study, which suits daily output.
- **Cadence:** daily. Every episode also becomes one 60-second Short with just the rule and the twist.

**Animation style and type:** the Bradikinin look is a black background, a white silhouette object (a bed, a
cat, a phone) with one point of colour, and almost no motion: a slow push-in, a blink, a shadow that moves
once. The emptiness is the aesthetic; it is what makes the thumbnails pop in a feed full of colour. For our
brand, keep the mascot as the person in the bed and keep the black-and-white world, so the orange hoodie is
the only colour on screen.

**Build with our pipeline:** the cheapest of all. A dark theme flag, 15 to 20 silhouette props, a "case file"
text card, grain and flicker filters. Half a day per episode.

**Scores:** Evidence 5 · 48-hour 5 · Build 5 · Money 3 · Durability 4 → **22/25** on its own, **23/25** if
run as a short daily feeder beside Theme 1 (Shorts from it drive subscriptions, the long videos monetise).

---

## 3. "Hour by Hour: what happens to YOU when…" (the body and event timeline)

**Channel direction:** one thing happens to you, and the video walks your body or your city through it on a
clock. What lethal radiation does to you, hour by hour. Your first 72 hours after a nuclear strike. What
quitting sugar does to you, day by day for a year. Your first 24 hours in prison. What happens to you in the
30 minutes after you stop breathing. What 10,000 steps a day does to you after 30, 90, 365 days.

**Evidence.** The Infographics Show: "What Lethal Radiation Does to Your Body (Hour by Hour)" 2.66M, "An
Ozempic Overdose Hour by Hour" 1.35M, "World War 3 Hour by Hour at 35,000 Feet" 1.05M. "What Dying In Your
Sleep Actually Feels Like, Hour by Hour" 656K. "What 20 Push-Ups a Day Does to Your Body" 3.8M on an 8-video,
14K-sub channel (Mr. Well). "What Happens If You Never Shower Again" 471K. "A Soldier's First Day Inside
Leavenworth" 569K. "Your First 24 Hours as a Roman Soldier" 149K. Jeremy Bearimy's own "Heart Beat 10x
Faster" 627K and If Then Tales' "Body Healed 100x Faster" 425K (from a 14K-median channel).

**Why it works (psychology):** timestamps create processing fluency and credibility (the brain treats "hour
6: your gums bleed" as reported fact, not speculation). The clock is a countdown, and countdowns are the
strongest retention device YouTube has (goal-gradient: effort rises as the end nears). Interoception, which
is attention to one's own body, is involuntary once triggered: the viewer checks their own gums. And it is
the only format on the list that is also useful, which is what the educational RPM tier rewards.

**Video format:**
- **Title:** `What [X] Does to Your Body, Hour by Hour` / `Your First 24 Hours [in a place]` / `[Habit] Every
  Day: Day 1 vs Day 365`.
- **Cold open:** "Hour zero. You feel fine. That is the problem."
- **Structure:** 10 to 14 time-stamped segments on a ticking clock ("HOUR 6", "DAY 30"), each a change the
  viewer can locate on their own body or street. Three escalations: the invisible stage, the stage you
  notice, the stage other people notice. A "what you should actually do" beat at the midpoint (this is
  what makes it ad-safe and useful). Ending: the final state, then the reversal ("hour 72, if you did the
  one thing at hour 2, you're fine"), then the question: "Which hour would have stopped you?"
- **Length:** 12 to 20 minutes. **Cadence:** 3 a week.

**Animation style and type:** a clinical, dark-blue palette with one accent (amber for warnings, red for
damage). The mascot shown as a cutaway when needed (a see-through torso with simple organ shapes that
change colour over time), city segments as a top-down map with a spreading ring. The clock is a permanent
HUD element with the hour in a monospace font; the Infographics thumbnail formula is a doctor-and-patient
scene plus a four-word verdict ("WORSE THAN DEATH"); ours would be the mascot plus the clock plus the
verdict.

**Build with our pipeline:** a cutaway variant of the mascot (one new rig layer), a clock HUD, a map-ring
component, and 8 to 10 clinical backgrounds. One day per episode plus a research pass; cite two sources in
the description for every medical claim.

**Scores:** Evidence 5 · 48-hour 4 · Build 4 · Money 5 · Durability 5 → **23/25**

---

## 4. "Survive This: YOU Choose" (the interactive survival test with a score)

**Channel direction:** a survival scenario where the viewer makes 8 to 10 real choices with a five-second
timer, and the story branches to show the consequence of the choice they made. At the end they get a score:
days survived. It fuses the two formats that produce the biggest numbers for small channels, the survival
diary (Beanie 2.8M, Nobody Gets In 3.2M, "Can You Survive Locked Inside a Gas Station" 2.66M) and the
timed-choice quiz (Quiz Lamby "Would You Rather" 3.35M, Quiz Stumble 1.14M, Quiz Blitz 243K).

**Evidence.** Both halves are proven at the 1M to 3M level; the hybrid is not yet on YouTube in animated
form, which is the opportunity. Supporting signal: "Oddly Elsewhere: Could You Survive a Zombie Apocalypse?"
225K from a 13-video channel; "Would You Rather" Roblox towers 60K to 134K across a dozen channels show the
mechanic travels to any wrapper.

**Why it works (psychology):** agency. Choosing changes a viewer from spectator to participant, and people
value outcomes they had a hand in (the IKEA effect) and defend choices they made publicly (commitment and
consistency: "I picked the roof and I'd pick it again"). The timer adds arousal. Seeing the other branch
die gives relief, seeing your branch die gives the comment ("I'd have survived if…"). The score at the end
is a social-comparison token with built-in replay value: watch again, choose differently. No other format
on the list produces rewatches.

**Video format:**
- **Title:** `Could YOU Survive [Scenario]? (Make the Choices)` or `Survive [Scenario]: Your 10 Choices`.
- **Cold open:** "You'll make ten choices. Each one has a timer. Pick out loud. At the end I'll tell you how
  many days you lasted, and most people don't make it past choice six."
- **Structure:** 10 choice points, each: a 20 to 40 second setup, a split screen A/B with a 5-second timer
  and a tick sound, then a 30 to 60 second consequence for both branches (the branch "most people" pick is
  shown first and usually goes wrong). A running tally on screen: "DAYS SURVIVED: 11". Choice 6 is the
  trap. Choice 10 is the moral one with no good answer.
- **Ending:** the score table ("0–3 days: you were the bait. 4–9: you'd have made it to the roof. 10+: you're
  the person others follow"). Prompt: "Comment your days. Then watch again and pick the other side."
- **Length:** 12 to 16 minutes. **Cadence:** 2 a week, with the Beanie-style daily diaries as the backbone.

**Animation style and type:** the dark survival-diary look (stickman or mascot, navy and amber), plus a
game-show overlay: split screen with a thick divider, the A/B cards with a sweeping timer arc, and a
tally counter. The timer sound and the split screen are the brand devices. Thumbnail: the split-screen
itself ("ROOF or BASEMENT?") with a red "5 SEC" badge, which is the Quiz Stumble formula applied to survival.

**Build with our pipeline:** a `choice` component (split screen, timer arc, tick), a `tally` HUD, and a
branch-aware shot list (each choice has two consequence sequences). Backgrounds reuse the survival-diary set.
One and a half days per episode because of the double consequences.

**Scores:** Evidence 4 · 48-hour 5 · Build 5 · Money 4 · Durability 5 → **23/25**

---

## 5. "What If YOU Were Born in ___?" (the other-life simulation)

**Channel direction:** the lottery of birth, lived from the inside. You are born in North Korea; in
Victorian London; in 1200s Mongolia; in Lagos in 2040; as the fourth child of a Roman senator; in the
richest zip code in America; underwater, if humans had evolved there. Each episode walks one full life
(birth, school, first job, love, the one event, old age) with a stats card at every stage, and a parallel
"other you" for contrast.

**Evidence.** ¿Y si?: "What If You Were Born in North Korea?" 1.13M in 3 days, "If You Make It to 2050,
Here's What You'll See" 5.8M, "How Long Could You Survive Alone on a Deserted Island" 2.8M, on a channel with
a 1.85M median. Oddly Elsewhere (13 videos, 19.5K subs, median 153K): "What If Humans Lived Underwater" 731K,
peak 921K. "Your Life as the Adeptus Custodes" 1.67M, "Your Life at Every Rank in the Third Reich Army" 800K,
"…Every KGB Rank" 689K. OTHERWISE "Reborn With All Your Memories" 562K. Ifverse "Kindergarten With All Your
Memories" 416K.

**Why it works (psychology):** counterfactual identity. People are compulsively interested in the other
lives they could have had (norm theory: the mind generates "if only" alternatives automatically). Second
person makes the alternative life yours, not a documentary subject. Downward comparison produces relief and
gratitude (the two most shared emotions after awe), upward comparison produces envy and aspiration, and the
episode can do both by running the "parallel you" side by side, which is exactly what the North Korea video
does ("another version of you, with your same genes, is born in South Korea"). It is also the format with
the widest audience: the geography and history crowd is older and higher-RPM than the superpower crowd.

**Video format:**
- **Title:** `What If YOU Were Born in [place / time / condition]?` One contrast word when possible ("…the
  Poorest Country on Earth", "…1,000 Years Ago").
- **Cold open:** "You're born at 4 a.m. in Chongjin. Before you can see, the state has already decided which
  of three classes you belong to. Here's the next 80 years."
- **Structure:** six life stages, each 90 to 150 seconds: Birth (the stats card: life expectancy, income,
  siblings, chance of X), Childhood (school, the first rule you learn), Work (the job you most likely get),
  Love (who you marry and how), The Event (the war, famine, boom or migration your generation hits), Old Age
  (what you own, who's left, what you tell your grandchildren). A "YOUR STATS" card updates at every stage.
  A "MEANWHILE, THE OTHER YOU" cut-in at three points. Ending: the two lives side by side, and the question
  "Which of the two would you trade for yours?"
- **Length:** 14 to 20 minutes. **Cadence:** 2 to 3 a week (research-heavy, so pair with Theme 1 or 2 as the
  daily engine).

**Animation style and type:** the richest art of the five: full illustrated backgrounds that establish a
place in one frame (the ¿Y si? thumbnail is a photoreal baby in a filing cabinet; ours is the mascot as a
newborn in a stylised place). Period costume layers on the mascot (hat, uniform, tools) rather than new
characters. A stats card with icon rows. Map inserts with the route of your life. Thumbnail: the mascot
as a baby plus one iconic object of the place plus the place name in huge type.

**Build with our pipeline:** 12 to 18 new backgrounds per episode (the real cost), a costume-layer system
for the mascot, a stats-card component, a map component. Two days per episode including research, with
sources in the description.

**Scores:** Evidence 5 · 48-hour 4 · Build 4 · Money 5 · Durability 5 → **23/25**

---

## 6. Scorecard, with last round for comparison

| Theme | Evidence | 48-hour | Build | Money | Durable | Total |
|---|---|---|---|---|---|---|
| **1. How Long Would YOU Last in Every ___?** | 5 | 5 | 5 | 4 | 5 | **24** |
| **3. Hour by Hour: what happens to YOU** | 5 | 4 | 4 | 5 | 5 | **23** |
| **4. Survive This: YOU Choose** | 4 | 5 | 5 | 4 | 5 | **23** |
| **5. What If YOU Were Born in ___?** | 5 | 4 | 4 | 5 | 5 | **23** |
| **2. If Your ___ Ever Does This… DO THIS** | 5 | 5 | 5 | 3 | 4 | **22 (23 as a feeder)** |
| Previous: Survival diaries | 5 | 5 | 5 | 4 | 3 | 22 |
| Previous: What IF scenarios | 5 | 5 | 5 | 4 | 3 | 22 |
| Previous: Your Life As… history | 4 | 3 | 4 | 5 | 5 | 21 |

Two runners-up that did not clear 22: **"Only YOU Know" foreknowledge thrillers** ("Zombie Outbreak Starts In
6 Days And Only YOU Know" 400K from a 5K-sub channel, "The First 3 Years of an AI Takeover" 568K): strong
psychology (dramatic irony plus a countdown plus a moral load) but thin evidence; best as a sub-series inside
the What IF lane. And **branching "Would You Rather" quizzes** on their own: huge peaks (3.35M) but a 4K median
on the leading channel, which means the format is feast-or-famine without a story wrapper; Theme 4 is the
story wrapper.

---

## 7. What I would actually do with this

1. **Make Theme 1 the channel's spine.** It has the best small-channel evidence of anything studied in either
   round, it never runs out of sets, every segment is a Short, and it uses the existing mascot and pipeline
   as they are. First five episodes: Every Prehistoric Era, Every Planet, Every Decade Since 1000 AD, Every
   Horror Movie, Every Country's Prison.
2. **Run Theme 2 daily as the feeder,** 5-minute videos and a Short each, because its titles are the
   stickiest on the platform right now and it costs half a day.
3. **Add Theme 3 twice a week** for RPM and watch time; its timelines also reuse the clock HUD from Theme 1.
4. **Hold Theme 4 until the audience exists** (it needs comments to work) and launch it at 50K subs as the
   channel's signature event.
5. **Theme 5 is the month-three expansion,** when there is budget for research and backgrounds.

Every one of these uses "you" in the title, puts a number or a countdown on the thumbnail, keeps the
orange-hoodie mascot, and ends by asking the viewer for a number they already decided while watching.

---

## Sources

Primary (YouTube, read 3 Nov 2026): search results sorted by views, past month, for "you have 24 hours
animated", "would you rather animated", "how long would you survive", "what happens to your body when",
"only 1% can animated test", "you wake up as", "if you were born in", "which would you choose animated",
"could you survive", "your choice reveals", "what would you do animated dilemma", "you get a text from",
"you vs 100", "the day you die animated", "what your brain does when", "your life if you", "escape room
animated", "in every prehistoric era", "hour by hour what happens", "and only you know", "if your dog ever",
"what if you were born in", "your first 24 hours as", "the first 3 years of", "how long would you last in".
Channel pages: @sebaschiller, @OutlastHistoryOfficial, @far-signal, @MelvinWontDie, @BradikininVideos,
@versors, @YsiOficial, @QuizStumble, @IfThenTales, @oddlyelswhere, @Askmrwell, @JoeBartolozzi. Video pages
for cA2reqjJwfY and inqryYWrVzc (descriptions and chapters).

Psychology references (standard literature, for the mechanisms named above): Rogers, Kuiper & Kirker (1977)
on the self-reference effect; Loewenstein (1994) on the information-gap theory of curiosity; Zeigarnik
(1927) on unfinished-task memory; Festinger (1954) on social comparison; Rozin et al. (2013) on benign
masochism; Kahneman & Miller (1986) norm theory on counterfactuals; Kahneman, Fredrickson, Schreiber &
Redelmeier (1993) on the peak-end rule; Kivetz, Urminsky & Zheng (2006) on the goal-gradient effect; Norton,
Mochon & Ariely (2012) on the IKEA effect; Cialdini (1984) on commitment and consistency.
