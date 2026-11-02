# First 10 posts, written to sound like people

Rules from VOICE-GUIDE.md apply. Square brackets are slots for what actually happened. Fill them honestly or delete the line. Do not post a bracket. Prices get a screenshot in the working folder with the date before anything goes live.

---
## Post 1 · Launch carousel (assets/carousels/v3-lean/carousel.pdf)

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

**First comment:** The repos and the pricing pages we used, checked [date]: Twenty [link], Chatwoot [link], Tally [link], Open WebUI [link], Hetzner [link]. Which of the five would you refuse to swap? We'll test the reason.

---
## Post 2 · Poll

**Question:** Roughly what does your business pay for software each month?
**Options:** Under $100 · $100 to $500 · $500 to $2,000 · More than $2,000
**Text above the poll:** We're picking which bills to take apart first and we'd rather use real numbers than guess. The bracket that wins gets a full teardown next Tuesday. If one line item on your bill bothers you, name it below. Anonymous is fine.

---
## Post 3 · Swap card (card-swap-sample.png)

Typeform Plus is $59 a month. Tally Pro is $29. We ran both for [three weeks] on the same intake form.

Completion rate was [within a point] of each other. Tally's free tier would have covered us. We paid for Pro because [we wanted the custom domain].

What we lost: video questions, and the little Typeform logo our clients apparently never noticed.

What we kept: logic jumps, Stripe payments, file uploads, and $360 a year.

We keep hearing "but Typeform looks nicer." Fair. It does, a bit.

So: is $360 a year a reasonable price for a prettier form, or is that an ad budget?

**First comment:** Pricing pages, checked [date]: Typeform [link], Tally [link]. If you've moved off Typeform, what broke?

---
## Post 4 · Debate card (card-debate-sample.png)

Someone will say a $6 server isn't free. Correct. Here is the actual bill.

The box runs a CRM, a support inbox and a team AI chat for five people. Hosted versions of those three: about $630 a month.

Our cost: $6 for the server. About [two hours] a month of updates, mostly waiting for Docker to pull. [One] evening in [month] when a volume filled up and the inbox went quiet for [three hours].

Price those two hours at $100 each and it's $206 a month. Still $424 cheaper. Still about $5,000 a year.

The honest objection isn't money. It's who gets the call when it goes down at 9pm.

Where do you land?
A. $6 is a rounding error next to $630.
B. My time is the real bill. Hosted wins.
C. Depends entirely on who maintains it.

**First comment:** The three tools in the maths: Twenty, Chatwoot, Open WebUI [links]. If you self-host anything, what was your worst outage? We'll share ours.

---
## Post 5 · The Teardown, No. 1 (assets/carousels/v3-lean_teardown/carousel.pdf)

First teardown. A 5-person agency, $2,310 a month, every line.

The biggest surprise wasn't the SaaS. It was $1,621 of on-demand cloud for workloads that fit on a $6 box. Nobody had opened the billing page since [2024].

The smallest line was forms at $59. We swapped it anyway, because once you start it's hard to stop.

Slide by slide: what each tool cost, what replaced it, what we kept, what annoyed us.

Next week's teardown is yours if you want it. Send a bill through the form in the first comment. Blur the company name, we don't need it.

Which line on your own bill do you suspect is 10x too high and haven't checked?

**First comment:** Send a bill (anonymised): [Tally link]. Pricing pages checked [date]: [links].

---
## Post 6 · Question card (card-question-sample.png)

Which bill should we take apart next?

A. HubSpot for a 10-person sales team
B. Intercom plus Zendesk for one support team (we see this combo a lot)
C. Adobe Creative Cloud for a 3-person agency
D. Yours. Name it below.

Most mentions wins and gets the full treatment on Tuesday. Whoever suggests it gets credited by first name and role, if they want.

**First comment:** Last week's poll: [result]. Form for sending a bill: [Tally link].

---
## Post 7 · Swap card: ChatGPT Team to Open WebUI

ChatGPT Team, 5 seats, is about $150 a month. We moved the team to Open WebUI with API credits and spent $[11.80] last month.

Same chat window for everyone. Document upload works. We pointed it at [model] and nobody complained, which is more than we expected.

What we lost: OpenAI's admin console and SSO. For five people, we did not miss either.

What surprised us: the bill moves with usage. [One] week someone uploaded [a 400-page PDF] and that week cost more than the whole previous month.

Per-seat pricing is the quietest tax in software. You hire one person and five vendors send a bigger invoice.

Would you take your team off per-seat AI, or is the admin console worth $138 a month to you?

**First comment:** Open WebUI [link], Ollama [link], API pricing [link], checked [date]. How many of your paid seats were used last week?

---
## Post 8 · Reader swap (Friday)

[First name], who runs [role] at a [size] [type of business], sent this one.

They were paying $[X] a month for [tool] across [N] seats. They moved to [cheaper tool] at $[Y].

What they gave up, in their words: "[quote]."
What they kept: [two things], and $[saving] a year.

The bit that stuck with us: "[one honest line from them]."

Every Friday is a reader swap. If you've made one this year you'd recommend to a stranger, say it below or send it through the form.

**First comment:** Form: [Tally link]. [Both tools' links].

---
## Post 9 · Poll

**Question:** Would you self-host a tool to save $500 a month?
**Options:** Already do · Yes, with a guide · No, too risky · What's self-hosting?
**Text above the poll:** The split decides next week. If "with a guide" wins, we publish the setup we actually used, including the part that went wrong. If "too risky" wins, we publish the outages instead.

---
## Post 10 · Debate (text, with the debate card)

Per-seat pricing punishes hiring. That's the whole post, but here's the maths.

A 10-person team on five per-seat tools at $25 a seat pays $1,250 a month. Hire ten more and it's $2,500. The tools didn't improve. The headcount did.

The case for per-seat, and it's not nothing: it's simple, it scales down when you shrink, and vendors need predictable revenue to keep the lights on.

We still think flat-rate or open-source pricing is fairer for anyone under 50 people. We'd like to be argued out of it.

A. Per-seat is fair. You pay for who uses it.
B. Per-seat taxes growth. Price the job, not the people.

**First comment:** Five flat-rate or open alternatives to common per-seat tools [links], checked [date]. Which per-seat bill grew fastest for you this year?
