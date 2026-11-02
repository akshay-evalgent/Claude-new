# Founder Signal: the page concept

One page, three kinds of post, one audience: people building companies who want to know what AI changed today, which paid tool they can stop paying for, and what the next two years might feel like.

## The three pillars and their formats

### 1. Signal: news cards (Startupro format)
What happened in AI and startups today, told the way Startupro tells it: a collage image with the person or the data up top, a long quote headline with the key phrases in yellow, and a neutral three-paragraph caption with a hashtag column. Two a day on weekdays. Topics: AI model and product news, founder and investor statements about AI, hiring and work culture where tools are the story, software pricing fights, platform rule changes, open-source milestones. Generator: `scripts/quote_card.py` and `scripts/news_card.py`. Routine: `content/NEWSDESK-PLAYBOOK.md`.

### 2. The Swap: paid tool vs the free way
One paid tool, one free or open-source way to do the same job, as an image plus human text. The image is the swap card (paid price struck through, the free option, what you keep, what you give up) or an 11-slide editorial carousel for the big ones. The text is written by a person: a non-round number, a named plan, one honest catch, one opinion, one thing we are not sure about, a two-sided question. We never claim a test we did not run; when we have only read the docs, we say so. One a day on weekdays. Generator: `scripts/make_leanstack_pack.py` swap_card, `scripts/carousel2.py --theme signal_teardown`.

### 3. Thought experiments: the future of AI for founders
A question a founder can sit with, framed in two or three paragraphs and closed with the two sides. Rooted in a real number from this week's news (the 12% benchmark, the per-seat pricing fight), then pushed forward: what would you do if this were true in 2028. The image is a minimal question card. Three a week (Tuesday, Thursday, Saturday). This pillar is where the comments come from. Generator: `question_card` in `scripts/make_leanstack_pack.py`.

## Weekly rhythm
| Day | 8:30 am | 1:30 pm | 8:30 pm |
|---|---|---|---|
| Mon | Swap | Signal | Signal |
| Tue | Thought experiment | Signal | Swap |
| Wed | Swap | Signal | Signal + poll |
| Thu | Thought experiment | Signal | Swap |
| Fri | Swap | Signal | Signal |
| Sat | Newsletter (9 am) | | Thought experiment + week recap |
| Sun | | | One Signal if something broke |

Fourteen posts a week. Signal cards take 15 minutes each once the images arrive, swaps 25, thought experiments 20.

## Voice
`content/VOICE-GUIDE.md` applies to Swaps and Thought experiments in full. Signal captions follow the Startupro brief voice: neutral, third person, no first person, no question, sources in the first comment.

## Images
You supply the photos; I supply the exact request (subject, source link or search, size, credit) in `assets/photos/IMAGE-REQUESTS.md` for every post. Stock images are allowed for scene slots (offices, servers, cities); people and logos come from press kits, newsrooms or the person's own public posts, credited. Where no image can be cleared, the card uses a data panel built from the story.

## Name
Founder Signal. Handle `foundersignal` (fallbacks `founder-signal`, `thefoundersignal`). Newsletter: Founder Signal Weekly. The visual system from Lean Stack stays (light, one accent, hairlines); the mark is now three ascending bars. All of it is a one-line change in `scripts/themes.py` if the name has to move again.
