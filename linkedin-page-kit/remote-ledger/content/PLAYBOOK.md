# Remote Ledger · the posting playbook

Read once. Then each day takes 20 to 40 minutes plus the 90-minute reply window.

## What the page is
Remote work for clients abroad, checked. Every post makes one of three checks: open to India (from the posting's own words), what it really pays (the headline number next to the listing number, both screenshotted), how the money lands (rails, fees, FIRA, LUT, tax). From week two, two more formats: requests from clients abroad and vetted pitches from India.

The reader is told the source every time. The page never says "earn ₹X from home". It says "this posting says $1,000 per task; here is the link".

## The week

| Day | Post | Time (IST) | Media |
|---|---|---|---|
| Mon | Tracker: 10 roles open to India this week; all of them in the comment | 8:30 am | list card |
| Tue | Pay card: one platform, headline number vs listing number | 8:30 pm | two-number card |
| Wed | Requests: 5 anonymised asks from clients abroad, apply by Friday (week 2 on); until then, a getting-paid card | 8:30 am | list card |
| Thu | Pitches: 5 providers that passed the five checks (week 2 on); week 1 announces the form and the rules | 8:30 pm | pitch cards or carousel |
| Fri | Not a desk job: tutoring, voice, support, bookkeeping, tasks; the number from the page | 1:30 pm | list card |
| Sat | Paperwork: one topic (contract, invoice, purpose code, FIRA, LUT, 44ADA, rails) | 10:30 am | carousel |
| Sun | Poll, with a line that asks for a real number in the comments | 11:00 am | poll + card in comment |

8:30 am IST reaches India and Europe; 8:30 pm IST reaches the US morning. Never two posts within three hours of each other.

## Voice
Short sentences. The number first, then where it came from, then what it means, then a question to the reader about their own experience. Never "excited to share", never "game-changer", never a bracket. If a figure is from a competitor's calculator, say so. If a page was unreachable, say so. If the page is wrong, say so the same day in the comments.

Every post ends with a question a person can answer from their own life ("what did your real hourly come to"), not a question about the topic ("thoughts?").

## Labels on every number
- **as posted**: the posting or platform page states it; screenshot in `assets/sources/`.
- **listed**: a listing on the platform, not the headline.
- **calculated**: our arithmetic from a stated rate; the arithmetic is shown.
- **reported**: a reader or a public post said it; linked and credited.
Nothing goes on a card without one of these.

## Monday routine: the tracker (45 minutes)
1. Run `python3 scripts/rl_fetch_jobs.py` from `remote-ledger/`. It pulls the public job APIs that are open from here: Greenhouse and Ashby boards of the AI companies in the list, Remotive, RemoteOK, We Work Remotely's RSS, Himalayas, and the current month's Hacker News "Who is hiring" thread. It writes `data/candidates-<date>.json` with every posting whose location text says India, worldwide, anywhere, global, APAC or remote without a US/EU restriction.
2. Open each candidate's link and read the eligibility sentence yourself. Keep it only if the posting's own words allow India. "Remote" with a US salary range and no country is not enough. Note the pay only if the posting states it.
3. Pick 10 for the card: 3 to 4 from big names people know (OpenAI, Anthropic, Together, ElevenLabs, Turing), 3 with a stated pay figure, 2 to 3 non-engineering roles. Put all of them in `data/tracker-<date>.csv` and update the Notion page.
4. Render: edit `content/cards/01-tracker.json`, run `python3 scripts/rl_cards.py content/cards/01-tracker.json assets/posts/<week>/01-tracker.png`.
5. First comment: the Notion link, the sources used this week, and "if you know one we missed, drop the link and we'll check it".
Add a company's board by its slug: Greenhouse is `boards-api.greenhouse.io/v1/boards/<slug>/jobs`, Ashby is `api.ashbyhq.com/posting-api/job-board/<slug>`. Find the slug in the company's careers URL.

## Tuesday routine: the pay card (30 minutes)
1. One platform per week: Alignerr, Mercor, Outlier, Turing, Toloka, Appen, Prolific, DataAnnotation, Upwork's own rate pages, Preply, Cambly, italki, Contra. Open the homepage and the listings page the same day.
2. Screenshot the headline number and the lowest and highest listing you can find. Save to `assets/sources/<platform>-<date>.png`.
3. Card: `content/cards/02-pay-<platform>.json` → `rl_cards.py`. Left panel: the headline. Right panel: the listing. Note: what the gap means. Source line: where and when.
4. Caption: both numbers in the first two lines, then "both are true", then the question to ask before applying, then "what did your real hourly come to".
5. If a reader posts a payout screenshot, that is next Tuesday's card, credited, with their permission.

## The LinkedIn search, every day (10 minutes)
The repost layer lives in `LINKEDIN-CURATION-RECIPE.md`: the exact search strings per lane, the five validation checks, the two repost formats (repost with thoughts, or a quote card via `rl_cards.py` type `repost`), credit and permission rules, and the quota (two a week to start). Only a person in the LinkedIn app can do this part; nothing is automated.

## Wednesday routine: requests (30 minutes, from week 2)
Sources, in order: the Tally request form; the month's Hacker News "Freelancer? Seeking freelancer?" thread (posts that start SEEKING FREELANCER); founders abroad posting on LinkedIn "looking for an n8n developer / fractional CFO / voice agent builder" (search those phrases, filter by past week, note the post URL); X posts of the same shape; Contra and Upwork postings with a stated budget.
Anonymise: country, industry, company size, the need in three sentences, budget band, timeline, overlap hours. No company name, no person. Link the public post in the comment only if it is already public and the poster is a company, not a person.
Each request gets an apply-by of Friday and the pitch form link. On Friday you forward the five best pitches by email to the requester. Keep a sheet of request → pitches sent → outcome. That sheet is the business.
Until there are five real requests a week, Wednesday is a getting-paid card (rails, fees, a reader's story with credit).

## Thursday routine: pitches (45 minutes, from week 2)
1. Open the Tally pitch submissions. For each: the five checks (a real profile with a face, a name and dated work history; one service for one client type; proof link opens and shows the work; price in USD; replied to the test message within 24 hours). Send the test message on Tuesday ("Thanks for pitching. One question: what's the smallest version of this you'd sell for $500?"). The reply quality is half the check.
2. Five that pass go on the Thursday card or a five-slide carousel: name or company, service, who it's for, proof, price from, overlap. Their LinkedIn or site link in the comment, with their yes.
3. The rejection count is said out loud in the caption: "31 pitched, 5 passed, the usual reasons were X and Y".
4. Rejected pitchers get one line each by email with the reason. They are next month's good pitches.

## Friday routine: not a desk job (30 minutes)
Rotate: tutoring (Preply, Cambly, italki), voice and recording work, support contractor roles (Lovable-type), VA agencies that hire India (check each agency's page says so), bookkeeping for US/UK small businesses (QuickBooks ProAdvisor listings), AI task work (Askable, Toptal task designs). The number from the page, same labels. Ask readers for the rates we couldn't verify; print them next Friday with credit.

## Saturday routine: paperwork (carousel, 60 minutes)
One topic per week, eight slides, from `content/cards/06-*.json` through `../scripts/carousel2.py --theme ledger`. Rotation: the contract · the invoice · purpose codes · FIRA · GST and LUT · 44ADA · choosing a rail · what to do when a client pays late · Deel/Remote/EOR contracts explained · the Skydo vs Wise vs Payoneer deep dive with a real month's statements (a reader's, credited). End every paperwork post with "confirm with a CA".

## Sunday routine: the poll (15 minutes)
A question about the reader's own experience with four options, plus the context text that names the platforms and asks for a number in the comments. Pin a comment asking people to name the platform. The following Sunday's card prints the split.

## Replies (the 90 minutes after every post)
Within 15 minutes. 15 words or more. End with a question back. Never "thanks for sharing". If someone posts a number, thank them specifically and ask one follow-up (hours, currency, which rail). If someone says a figure on the card is wrong, check, and if they're right, say so in a reply and in an edit to the comment, with their name.

## Numbers to watch, every Sunday
Followers · impressions per post · comments per post · saves if visible · Tally submissions this week (pitches, requests, waitlist) · requests that came in directly rather than curated. The last one decides whether the two-sided layer is alive: ten a week means it is.

## When to start charging
- Waitlist at 100 and 10 people paid ₹199 → open the full tracker at ₹299–499/month (the Notion page goes private; paid readers get the link).
- A client asks for a shortlist → $149 "shortlist in 48 hours" (three vetted providers, intros by email).
- Five featured-slot requests from providers → ₹1,999/week, marked "Featured".
- Never: a fee to pitch, a fee to apply, a success fee without a signed agreement.

## Rules that do not bend
Manual curation only; never scrape LinkedIn. Credit and link every public post used; take it down the same day if asked. Never list anything that charges the candidate. Label every number. Disclose referral links where they appear. Opt-in only for any list; anyone can leave the same day. Post as the page, never as a person.

## What to send me each week (the no-repost plan)
Five of the seven formats run entirely from sources I can open: Monday's tracker (the fetch script plus the company boards), Tuesday's pay card (the platforms' own pages, screenshotted), Friday's not-a-desk-job card, Saturday's paperwork carousel, Sunday's poll. You do not need to find anything for those.

What only you can give me:
- **Sunday evening:** followers, impressions per post, comments per post, and the three Tally counts (pitches, requests, waitlist). Four numbers; they decide week two.
- **Thursday (from week 2):** the Tally export of pitches, as a CSV from Tally's Submissions tab. I run the five checks on paper; you send the test messages; I build the card from the ones that pass.
- **Wednesday (from week 2):** the Tally export of requests. Until there are five real ones in a week, Wednesday is a getting-paid card and needs nothing from you.
- **Any day:** a comment thread you want a reply drafted for, pasted as text or a screenshot; a reader's number or payout screenshot you want printed (with their yes in the thread).
- **Once, five minutes:** screenshots of two pages blocked from here if you want them on cards: paypal.com/in business fees and cambly.com's tutor page.

LinkedIn searching for posts to repost is optional and lives in `LINKEDIN-CURATION-RECIPE.md`; the plan runs without it.
