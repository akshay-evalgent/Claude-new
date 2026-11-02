# Week 1 (warm-up): Sunday 2 November to Saturday 8 November 2026

Theme for the week: startups, automations, and the tools that do the jobs they pay for. Nothing here claims a swap we ran. Everything is curated from public facts (GitHub star counts checked today), recipes, and opinions stated as opinions. That means no brackets to fill except the Saturday recap numbers.

Times are IST. Each post: text below, first comment pinned within a minute, 90-minute routine from `content/ENGAGEMENT-PLAYBOOK.md`. Assets are in `assets/week1/`. Page assets: `assets/leanstack/logo-400.png`, `assets/leanstack/banner-A-1128x191.png`.

## Sunday 2 Nov, before posting (2 hours)
1. Run `content/SETUP-CHECKLIST.md` steps 1 to 7. Do not add the page to your Experience. Do not send follow invites yourself.
2. Make the Tally form "Tell us what you pay for and barely use" (tool, plan, seats, what you'd miss, optional email). Put it in the page website field until the newsletter exists.
3. Follow 150 to 200 accounts as the page: open-source founders and maintainers (n8n, Twenty, Chatwoot, Cal.com, PostHog, Supabase, Penpot, Formbricks, Documenso pages), bootstrapped founders, startup ops people, SaaS pricing commentators.
4. Re-run `python3 scripts/week1_cards.py` if you want today's date on the stat card.

---

## Sunday 2 Nov · 8:30 pm · Launch carousel
**Asset:** `assets/week1/carousel-launch-startup-stack/carousel.pdf` (document post). Pin it.
**Tag:** n8n, Twenty, Chatwoot, PostHog, Supabase pages.

16 open-source tools for the 16 jobs a startup usually pays 16 vendors for.

We checked the star counts this morning. 942,000 between them.

We did not put prices on the slides. Yours depend on seats and hosting, and a page that quotes a price it didn't screenshot today is guessing.

What's in there: a CRM that looks like Notion and imports a HubSpot CSV. A support inbox that does WhatsApp. Analytics your privacy lawyer will like. E-signatures, invoicing, email campaigns. Automation, database, docs, a team AI chat, design, chatbots.

What's also in there: a slide on where open source bites. Someone on your team owns the updates and the 2am problem. Per-seat bills don't grow when you hire, but neither does anyone else's responsibility.

Our rule, for what it's worth: self-host the boring, stable stuff. Pay for the thing that pages you at night.

And the advice we'd give anyone starting from zero: pick one job, not sixteen. Run the open-source one next to the paid one for two weeks. If nobody notices, cancel.

Which of the 16 jobs would you never trust to open source? Genuinely asking. The most common answer becomes next week's comparison.

**First comment (pin):** The repos, with the star counts we checked on 2 Nov 2026: Twenty 60k · Chatwoot 38k · Cal.com 49k · PostHog 40k · Plausible 29k · Formbricks 13k · Documenso 15k · Invoice Ninja 10k · listmonk 24k · n8n 209k · Supabase 114k · NocoDB 65k · Outline 41k · Open WebUI 157k · Penpot 61k · Typebot 10k. Links: [paste github.com/<repo> for each]. Which job did we miss?

---

## Monday 3 Nov · 8:30 am · Tool worth knowing: n8n
**Asset:** `assets/week1/mon-am-pick-n8n.png`. **Tag:** n8n page.

n8n. 209,000 stars, which makes it one of the most-starred pieces of software on GitHub, and most founders we talk to have never opened it.

It does the job of Zapier or Make. Boxes and arrows, 400-odd integrations, and AI agent nodes built in so a workflow can read an email and decide what to do with it.

Good for: a team where one person has run Docker once. The free self-hosted version covers a startup's first five automations with room to spare.

Not for: a team where nobody wants to own an update. That's not a criticism. Use Make, pay the bill, and come back when the bill makes you wince.

The honest catch: self-hosting means it's your server that goes quiet on a Saturday. For automations that move money, keep a human in the loop for the first month.

If you've used it, what's the first workflow you built? If you haven't, what's stopping you?

**First comment:** github.com/n8n-io/n8n. Their cloud version exists if you'd rather not host. Tomorrow morning: the five automations we'd have running by month three, node by node.

## Monday 3 Nov · 8:30 pm · Poll
**Question:** If you could only automate one thing this quarter, which?
**Options:** Lead intake and follow-up · Support triage · Invoice chasing · Weekly numbers report
**Text above the poll:** Tomorrow's carousel has all four built out. The winner gets a full node-by-node build next week, with the gotchas. If yours isn't on the list, name it below.
**First comment:** The fifth one we'd build, which didn't fit the poll: content repurposing with a human approve step. It's in tomorrow's post.

---

## Tuesday 4 Nov · 8:30 am · Carousel: five automations by month three
**Asset:** `assets/week1/carousel-automations/carousel.pdf`. **Tag:** n8n, Make pages if they exist.

Five automations we'd have running by month three at any startup. Not the clever ones. The ones that stop small things falling through the cracks.

1. Lead intake. Form in, company looked up, contact created, one line in Slack. Six nodes.
2. Support triage. Tickets sorted into bug, billing, how-to, sales before a human reads them. Draft reply from your docs. Human clicks approve.
3. Invoice chasing. Day 3 friendly reminder, day 10 founder cc'd, day 20 Slack the founder to call. Most late payments are forgotten, not refused.
4. Weekly numbers. Monday 8am, signups, revenue, churn, tickets, compared to last week, three lines in #general.
5. Content repurposing. One long thing becomes five drafts in a Notion board. A person schedules them. The posts that skip the person are the ones readers flag as slop.

Each is six nodes or fewer. An afternoon each if you've built one before, a weekend if you haven't.

The last slide compares n8n, Make and Zapier for this, honestly. Short version: if nobody has run Docker, start on Make.

Which one would you build first? Most-requested gets the full build next week.

**First comment:** Templates for all five exist in the n8n and Make libraries; search the names. We'll link the exact ones for the winner next week. Yesterday's poll is still open.

## Tuesday 4 Nov · 8:30 pm · Debate card
**Asset:** `assets/week1/tue-pm-debate-hire-or-automate.png`

First ops hire, or first ten automations?

The case for the hire: a person notices the thing you didn't think to automate. The customer who sounds annoyed. The invoice that's wrong, not just late.

The case for automating first: ten automations cost a weekend and about nothing a month. A hire costs a salary and three months to get going, and the first thing they'll do is ask for the automations anyway.

Our bias: automate the boring twenty-times-a-week stuff first, then hire the person who makes the automations better. But we've watched teams get stuck in the "we'll automate it" phase for a year.

A. Hire. A person notices what a workflow can't.
B. Automate. Hire when the automations break.
C. Both. The hire builds the automations.

**First comment:** If you were the first ops hire somewhere, what did you find already automated, and what did you wish was?

---

## Wednesday 5 Nov · 8:30 am · Question card
**Asset:** `assets/week1/wed-am-question-barely-open.png`

What tool are you paying for and barely open?

A. A CRM nobody updates
B. An analytics dashboard nobody reads
C. A seat for someone who left
D. Something else. Name it below.

We're collecting these, anonymously, for a series later this month where we take real bills apart line by line. If you'd rather not comment, the form in the first comment is private.

**First comment:** Private form: [Tally link]. Monday's poll result so far: [leader].

## Wednesday 5 Nov · 8:30 pm · Tool worth knowing: Twenty
**Asset:** `assets/week1/wed-pm-pick-twenty.png`. **Tag:** Twenty page.

Twenty. 60,000 stars. An open-source CRM that looks like Notion and imports a HubSpot CSV.

Good for: a sales team under 20 that wants pipelines, notes, tasks and email sync, and would rather not sign a per-seat contract in year one.

Not for: anyone who needs marketing automation, sequences or a big app marketplace. That's still HubSpot's game and they're good at it.

The thing worth knowing before you try it: it's a young project. Fast-moving, which means features arrive monthly and so do breaking changes. Pin a version.

We haven't run it past 20 seats and won't claim to. If you have, we want to hear what broke.

What's the one CRM feature you'd refuse to live without?

**First comment:** github.com/twentyhq/twenty. They also host it if you don't want to. HubSpot's own free CRM is the honest alternative for a lot of teams, and we'll say that every time it's true.

---

## Thursday 6 Nov · 8:30 am · Flow card: lead intake
**Asset:** `assets/week1/thu-am-flow-lead-intake.png`

Build this one first. Lead intake, six nodes, one afternoon.

Form submission comes in. The company domain gets looked up. A contact and a deal are created in the CRM. One line lands in #leads with who they are and what they asked. Someone replies within the hour, every time.

The point isn't speed. It's that nobody has to remember to check the form inbox, and the founder stops being the only person who knows a lead came in.

Gotchas, since the card can't hold them: the enrichment step fails on personal email domains, so route gmail addresses straight to Slack without lookup. And put the Slack message before the CRM step, so a CRM outage doesn't hide the lead.

What's the first automation you built at your company, and did it survive?

**First comment:** Tools in the diagram are examples. It works with whatever form, CRM and chat you already have. Tuesday's carousel has the other four.

## Thursday 6 Nov · 8:30 pm · Stat card
**Asset:** `assets/week1/thu-pm-stat-stars.png`

942,000 GitHub stars across sixteen open-source tools that cover the jobs a startup usually pays sixteen vendors for.

Stars aren't quality. They're attention, and attention is a decent proxy for "someone will have hit your bug before you".

What stars don't tell you: how long setup takes, whether your accountant will accept the invoicing tool, who fixes it at 2am. That gap is what this page is for.

The list is in Sunday's carousel. Which of the sixteen have you actually run?

**First comment:** Counts from the GitHub API on 2 Nov 2026. We'll re-check monthly and post the movers.

---

## Friday 7 Nov · 8:30 am · List card: what we'd never automate
**Asset:** `assets/week1/fri-am-list-never-automate.png`

Three things we'd never automate at a startup. Pay for them or do them by hand.

Payroll and tax filings. The fine is bigger than the saving, every time.

The first reply to an angry customer. At ten people, a human noticing the tone is the whole product.

Anything you've done fewer than twenty times. You don't know the edge cases yet, so the bot won't either.

This cuts against most of what we post, and that's the point. The page is about spending less. It's not about automating things that shouldn't be.

What's on your never-automate list?

**First comment:** The flip side, the five we'd build by month three, is Tuesday's carousel.

## Friday 7 Nov · 8:30 pm · Tool worth knowing: Documenso, and the paperwork trio
**Asset:** `assets/week1/fri-pm-pick-documenso.png`. **Tag:** Documenso, Cal.com, Formbricks pages.

The paperwork trio for a small team: Documenso for signatures, Cal.com for bookings, Formbricks for intake and surveys. All open source. All with hosted versions if you'd rather not run them.

Documenso: 15,000 stars, does the job of DocuSign for contracts, NDAs and offer letters. Templates and an API.

Not for regulated industries with strict e-sign compliance needs. Read their compliance page before anything legal moves.

Why the three together: intake form creates the record, booking page gets the call, signature closes it. Three tools, one flow, and none of them charge per seat.

Which part of your paperwork still runs on email attachments?

**First comment:** github.com/documenso/documenso · github.com/calcom/cal.com · github.com/formbricks/formbricks. Private form for bills you'd like torn down later: [Tally link].

---

## Saturday 8 Nov · 9:00 am · Newsletter, issue 1
**If 150+ followers:** create "Lean Stack Weekly" (logo `assets/leanstack/newsletter-logo-300.png`, cover `assets/leanstack/newsletter-cover-1920x1080.png`), publish `content/newsletter-issue-01.md`. Creating it sends a one-time subscribe invite to every follower.
**If under 150:** publish the same text as a page article and create the newsletter the day you cross 150.

## Saturday 8 Nov · 8:30 pm · Week one, honestly
**Asset:** `assets/week1/sat-pm-stat-week1.png` (re-render with the real numbers).

Week one. [N] people followed. [M] subscribed.

The post that did best was [X]. We expected [Y]. [One honest sentence on why.]

The post that did worst was [Z]. [One sentence.]

What you told us: [top poll answer] won the automation poll, so that gets the node-by-node build on Tuesday. The most-named barely-opened tool was [tool].

Things we got wrong: [a correction a reader made, with their first name].

Next week: the build you voted for, the second GitHub list we check before buying anything, and the first honest comparison, [tool A] vs [tool B].

What should we do more of, and what should we drop?

**First comment:** Private form for bills: [Tally link]. Newsletter: [link].

---

## Comment-as-page targets this week
Fresh posts (under 30 minutes old) from founders talking about tool costs, hiring ops, "we switched from", automation wins and fails, open-source releases. One specific tool and one number per comment. Never a link. Never a pitch.

## Log
`content/week1/log.csv`: date, slot, format, impressions_24h, saves, comments, reshares, follows, note. Fill every morning. Sunday 9 Nov, 15 minutes: which format won saves, which won comments. Week two leans into both.
