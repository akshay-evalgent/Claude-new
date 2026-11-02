# Week 1: Sunday 2 November to Saturday 8 November 2026

Everything you need for the first seven days: what to post, when, with which file, the exact text, the first comment, who to tag, and what to do in the 90 minutes after each post. Times are IST. Square brackets are slots for what actually happened; fill them or cut the line. Never post a bracket or an unchecked price.

All assets referenced are in this repo:
- Carousels: `assets/carousels/v3-lean/carousel.pdf`, `assets/carousels/v3-lean_teardown/carousel.pdf`
- Cards: `assets/week1/*.png` and `assets/leanstack/card-*.png`
- Page assets: `assets/leanstack/logo-400.png`, `assets/leanstack/banner-A-1128x191.png`

## Before the first post (Sunday, 2 to 3 hours)
1. Run `content/SETUP-CHECKLIST.md` steps 1 to 7. Do not add the page to your Experience. Do not use "invite connections" yourself.
2. Create the Tally form "Send us your software bill" (fields: tools and plans, seats, monthly total, the one feature you can't lose, optional email). Put the link in the page's website field for now.
3. Open the five pricing pages (Twenty, Chatwoot, Tally, Open WebUI or your API provider, Hetzner) and HubSpot, Intercom, Typeform, ChatGPT Team, AWS. Screenshot each with today's date visible. Save to a folder called `week1-pricing/`. If a number differs from the copy below, change the copy, not the screenshot.
4. Fill the brackets in the launch carousel spec with your real details, then re-render:
   `python3 scripts/carousel2.py content/carousel-v3-sample.json --theme lean --out assets/carousels/v3-lean`
   If you have not run a swap yet, cut that line from the spec rather than inventing it.
5. Follow 150 to 200 accounts as the page: open-source founders, SaaS pricing commentators, bootstrapped founders, small agency owners, the tool pages (n8n, Chatwoot, Twenty, Cal.com, Tally, Hetzner, Supabase, Appwrite, Penpot).

## The 90-minute routine (every post)
- Minute 0: post. Minute 1: paste the first comment, then pin it.
- Minutes 1 to 90: reply to every comment within 15 minutes, 15 or more words, quote what they said, end with one question back. Use the voice guide; never "great point".
- Spend the gaps commenting as the page under 5 to 8 fresh posts about software costs, SaaS pricing, bootstrapping or AI tools, each with a specific cheaper alternative and a number.
- At 24 hours, log impressions, saves, comments, reshares, follows in `content/week1/log.csv`.

---

## Sunday 2 Nov · 8:30 pm · Launch carousel
**Asset:** `assets/carousels/v3-lean/carousel.pdf` (document post). Pin it to the page after posting.
**Tag in the post text:** the Twenty, Chatwoot and Tally company pages (type @ and pick the page). Tag people only if you have a real reason.

We added up what a 5-person agency pays for software. $2,310 a month.

Then we spent [a weekend] rebuilding the same stack with cheaper or free tools, to see what would actually break.

It came to $47 a month. Two of the five swaps were annoying. One we almost gave up on.

The short version:

HubSpot Starter went to Twenty, which is open source. CSV import worked. Email sync took [40 minutes] because [Gmail's permission screen is a maze].

Intercom went to Chatwoot. The WhatsApp connection was the hard part, [two evenings]. Once it was on, nobody on the team noticed a difference.

Typeform went to Tally at $29. Honestly the easiest one. The forms look slightly less fancy. Nobody filling them in cares.

ChatGPT Team for 5 went to Open WebUI plus API credits. We spent about $12 last month. That number will move if you upload a lot of PDFs.

AWS on-demand went to a $6 box at Hetzner. This one is the whole story. Hosting was $1,621 of the $2,310 and nobody had looked at it in a year.

Things we gave up: hosted uptime (if the $6 box dies on a Saturday, that's on us), Intercom's product tours, Typeform's video questions.

Things we are not sure about yet: how Twenty behaves past 20 seats. If you've run it bigger, tell us what broke.

We'll post one of these swaps every weekday. Free when it's good enough. Cheap when free isn't.

Would you run a 5-person business on a $6 server, or is someone else's uptime worth $2,000 a month to you?

**First comment (pin it):**
The repos and the pricing pages we used, checked [2 Nov 2026]: Twenty [link] · Chatwoot [link] · Tally [link] · Open WebUI [link] · Hetzner [link]. Which of the five would you refuse to swap? Tell us why and we'll test the reason.

---

## Monday 3 Nov · 8:30 am · Swap card
**Asset:** `assets/week1/mon-am-swap-typeform-tally.png`
**Tag:** Tally's page.

Typeform Plus is $59 a month. Tally Pro is $29. We ran both for [three weeks] on the same intake form.

Completion rate was [within a point] of each other. Tally's free tier would have covered us. We paid for Pro because [we wanted the custom domain].

What we lost: video questions, and the little Typeform logo our clients apparently never noticed.

What we kept: logic jumps, Stripe payments, file uploads, and $360 a year.

We keep hearing "but Typeform looks nicer." Fair. It does, a bit.

So: is $360 a year a reasonable price for a prettier form, or is that an ad budget?

**First comment:** Pricing pages, checked [date]: Typeform [link] · Tally [link]. If you've moved off Typeform, what broke?

## Monday 3 Nov · 8:30 pm · Poll
**No image.** Poll runs 3 days.
**Question:** Roughly what does your business pay for software each month?
**Options:** Under $100 · $100 to $500 · $500 to $2,000 · More than $2,000
**Text above the poll:**
We're picking which bills to take apart first and we'd rather use real numbers than guess. The bracket that wins gets a full teardown next Tuesday. If one line item on your bill bothers you, name it below. Anonymous is fine.

**First comment:** The first teardown is tomorrow morning: a 5-person agency, every line. The form for sending yours, blurred, is here: [Tally link].

---

## Tuesday 4 Nov · 8:30 am · The Teardown, No. 1
**Asset:** `assets/carousels/v3-lean_teardown/carousel.pdf` (document post). Replace slide 2's placeholder with the real hosting-bill screenshot before rendering: put the image path in the `shot` slide's `"image"` field in `content/carousel-v3-sample.json`.
**Tag:** Hetzner's page, Chatwoot's page.

First teardown. A 5-person agency, $2,310 a month, every line.

The biggest surprise wasn't the SaaS. It was $1,621 of on-demand cloud for workloads that fit on a $6 box. Nobody had opened the billing page since [2024].

The smallest line was forms at $59. We swapped it anyway, because once you start it's hard to stop.

Slide by slide: what each tool cost, what replaced it, what we kept, what annoyed us.

Next week's teardown is yours if you want it. Send a bill through the form in the first comment. Blur the company name, we don't need it.

Which line on your own bill do you suspect is 10x too high and haven't checked?

**First comment:** Send a bill (anonymised): [Tally link]. Pricing pages checked [date]: [links].

## Tuesday 4 Nov · 8:30 pm · Stat card
**Asset:** `assets/week1/tue-pm-stat-hosting.png`

70% of that bill was one line.

$1,621 a month of on-demand cloud, for a CRM, a support inbox and a chat tool that now share a $6 server.

Nobody did anything wrong. Someone set it up in [2024] when it was the sensible default, and then it just kept billing. That's how most software bills work. The sign-up takes ten minutes and the cancellation takes a year of not noticing.

We'd bet most companies under 20 people have one line like this.

What's yours? The one you'd be slightly embarrassed to open right now.

**First comment:** If you want the honest version of self-hosting (including the Saturday it went down), that's Thursday's post. The hosting page we moved to: [Hetzner link], checked [date].

---

## Wednesday 5 Nov · 8:30 am · Question card
**Asset:** `assets/leanstack/card-question-sample.png`

Which bill should we take apart next?

A. HubSpot for a 10-person sales team
B. Intercom plus Zendesk for one support team (we see this combo a lot)
C. Adobe Creative Cloud for a 3-person agency
D. Yours. Name it below.

Most mentions wins and gets the full treatment next Tuesday. Whoever suggests it gets credited by first name and role, if they want.

**First comment:** Monday's poll so far: [bracket leading]. Form for sending a bill: [Tally link].

## Wednesday 5 Nov · 8:30 pm · Swap card
**Asset:** `assets/week1/wed-pm-swap-chatgpt-openwebui.png`
**Tag:** Open WebUI's page if it exists, otherwise none.

ChatGPT Team, 5 seats, is about $150 a month. We moved the team to Open WebUI with API credits and spent $[11.80] last month.

Same chat window for everyone. Document upload works. We pointed it at [model] and nobody complained, which is more than we expected.

What we lost: OpenAI's admin console and SSO. For five people, we did not miss either.

What surprised us: the bill moves with usage. [One] week someone uploaded [a 400-page PDF] and that week cost more than the whole previous month.

Per-seat pricing is the quietest tax in software. You hire one person and five vendors send a bigger invoice.

Would you take your team off per-seat AI, or is the admin console worth $138 a month to you?

**First comment:** Open WebUI [link] · Ollama [link] · API pricing [link], checked [date]. How many of your paid seats were used last week?

---

## Thursday 6 Nov · 8:30 am · Debate card
**Asset:** `assets/leanstack/card-debate-sample.png`

Someone will say a $6 server isn't free. Correct. Here is the actual bill.

The box runs a CRM, a support inbox and a team AI chat for five people. Hosted versions of those three: about $630 a month.

Our cost: $6 for the server. About [two hours] a month of updates, mostly waiting for Docker to pull. [One] evening in [month] when a volume filled up and the inbox went quiet for [three hours].

Price those two hours at $100 each and it's $206 a month. Still $424 cheaper. Still about $5,000 a year.

The honest objection isn't money. It's who gets the call when it goes down at 9pm.

Where do you land?
A. $6 is a rounding error next to $630.
B. My time is the real bill. Hosted wins.
C. Depends entirely on who maintains it.

**First comment:** The three tools in the maths: Twenty, Chatwoot, Open WebUI [links]. If you self-host anything, what was your worst outage? Ours is in the post.

## Thursday 6 Nov · 8:30 pm · The honest post
**Asset:** `assets/week1/thu-pm-quote-cant-replace.png`

Three things we haven't managed to replace with anything cheaper. Yet.

1. Payments. We tried [tool]. Stripe's fees are annoying and Stripe is still the right answer for us. Compliance is not where we save money.

2. Accounting. [Open-source tool] is good software and our accountant will not touch it. The $[X] a month for [tool] is really a fee for not arguing with our accountant.

3. [Your third one]. [One sentence on what you tried and why it didn't stick.]

We'll keep looking, but we'd rather tell you where the cheap option lost than pretend it always wins.

What's the tool you've tried to replace three times and keep paying for?

**First comment:** If you've cracked any of the three, say so. We'll test it and credit you.

---

## Friday 7 Nov · 8:30 am · The swap we reversed
**Asset:** `assets/week1/fri-am-swap-canva-penpot.png`
**Tag:** Penpot's page. They tend to engage with honest reviews.

We moved off Canva Pro to Penpot for [a week]. We're back on Canva. Still calling it a win.

Penpot is proper design software and it's free. Real vector tools, components, no watermark. For product UI it's better than what we had.

For the thing we actually use design software for, which is [social posts and one-page PDFs], it was slower. [Name] spent [two hours] rebuilding a template that takes four minutes in Canva. We paid the $15 again.

The win: we now know exactly what the $15 buys. Templates. Not "design software". That's a different purchase decision and we'll make it on purpose from now on.

Swaps that don't stick still tell you what you're paying for.

What's a swap you reversed, and what did it teach you about the original bill?

**First comment:** Penpot [link], Canva pricing [link], checked [date]. Reader swaps start next Friday. Send yours through the form: [Tally link].

## Friday 7 Nov · 8:30 pm · Where we look first
**Asset:** `assets/week1/fri-pm-list-awesome-selfhosted.png`

Before we buy any software now, we open one GitHub page.

awesome-selfhosted. About 333,000 stars, one giant list of free software you can run yourself, sorted by category.

How we use it: search the category, sort by last commit, skip anything quiet for six months. Takes five minutes and has killed [three] purchases this year.

What it won't tell you: how long setup takes, what breaks, whether your accountant will accept it. That part is what this page is for.

Bookmark it. Then tell us the category where you looked and found nothing good, because that's where the paid tool has earned its price.

**First comment:** The list: github.com/awesome-selfhosted/awesome-selfhosted. The second list we check is in next week's posts.

---

## Saturday 8 Nov · 9:00 am · Newsletter, issue 1
**If the page has 150 or more followers:** create the newsletter "The Swap List" (logo `assets/leanstack/newsletter-logo-300.png`, cover `assets/leanstack/newsletter-cover-1920x1080.png`) and publish `content/newsletter-issue-01.md` with `assets/leanstack/edition-01-cover-1920x1080.png`. Creating it sends a one-time subscribe invite to every follower.
**If under 150:** post the issue text as a LinkedIn article from the page with the same cover, and launch the newsletter the day you cross 150. Do not wait for 1,000 in week one; the invite burst matters less than having the habit.

## Saturday 8 Nov · 8:30 pm · Week one, honestly
**Asset:** `assets/week1/sat-pm-stat-week1.png` (re-render with real numbers: edit the stat slide in `scripts/` call or the spec, or ask us to).

Week one. [N] people followed. [M] subscribed to the newsletter.

The post that did best was [X]. We thought it would be [Y]. [One sentence on why we think that happened.]

The post that did worst was [Z]. [One honest sentence.]

Things we got wrong this week: [one real correction, e.g. a price a reader fixed in the comments]. Thank you, [first name].

Next week: the teardown you voted for ([winner]), the first reader swap, and the second list we check before buying anything.

If you've been reading and not commenting, this is the easy one. What should we do more of, and what should we drop?

**First comment:** Send a bill for a future teardown: [Tally link]. Subscribe to The Swap List: [newsletter link].

---

## Comment-as-page targets this week
Twice a day, find fresh posts (under 30 minutes old) from: bootstrapped founders posting about costs, SaaS pricing threads, "we switched from X" posts, open-source maintainers announcing releases, agency owners complaining about tools. Reply with one specific alternative and one number. Never link. Never pitch the page. The page name does the work.

## Log
Create `content/week1/log.csv` with columns: date, slot, format, impressions_24h, saves, comments, reshares, follows, note. Fill it every morning for the previous day's posts. Sunday 9 November, 15 minutes: read it, pick the format that won saves, do more of that in week two.
