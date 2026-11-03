"""Build one folder per post, in posting order, each with the image(s), the exact caption, the first comment
and a how-to-post.txt. Output: upload-kit/POSTS/POST-NN-slug/.  Run: python3 scripts/build_posts.py
"""
import os, shutil, json
ROOT = os.path.join(os.path.dirname(__file__), "..")
OUT = os.path.join(ROOT, "upload-kit", "POSTS")
P3 = "assets/posts/2026-11-03/"

HOW = {
 "image": """HOW TO POST (image post)
1. Open linkedin.com/company/thefoundersignal/admin (you must be logged in as the admin).
2. Click "Start a post" in the admin view. Check the small avatar at the top of the box shows the page, not your name.
3. Click the photo icon, upload image.png (portrait). If you prefer the square, use image-square.png.
4. Paste caption.txt into the text box. Keep the line breaks. Where it says @Tag, type @ and pick the company page from the dropdown.
5. Click Post.
6. Immediately open the post, click "Comment", paste first-comment.txt, post it. Then click the three dots on your comment and choose "Pin".
7. For the next 90 minutes: reply to every comment within 15 minutes, 15+ words, end with a question back.""",
 "document": """HOW TO POST (carousel / document post)
1. Open linkedin.com/company/thefoundersignal/admin and click "Start a post" as the page.
2. Click the "+" (more) icon, then "Add a document". Upload carousel.pdf. Give it the title shown in caption.txt's first line.
3. Paste caption.txt into the text box.
4. Click Post. Then comment with first-comment.txt and pin it.
5. Reply to every comment for 90 minutes.""",
 "poll": """HOW TO POST (poll)
1. Open linkedin.com/company/thefoundersignal/admin, click "Start a post" as the page.
2. Click the "+" icon, then "Create a poll".
3. Question and options are in caption.txt. Set duration to 3 days.
4. Paste the context text (above the poll) into the main text box. Click Post.
5. Comment with first-comment.txt and pin it.""",
}

POSTS = [
 # ---------- Day 1: Tuesday 3 Nov (Signal burst) ----------
 dict(slug="goldman-pulls-ai-coding", when="Tue 3 Nov · 1:30 pm IST", pillar="Signal (news)", kind="image",
      images=[P3+"signal-goldman-pulls-ai-coding.png", P3+"signal-goldman-pulls-ai-coding-square.png"],
      tags="@Goldman Sachs  @Anthropic",
      caption="""Goldman Sachs has restricted advanced AI coding tools, including Anthropic's Claude Code and GitHub's AI tooling, to its roughly 12,000 engineers, withdrawing them from most bankers and traders, according to internal guidance reported by Bloomberg on 2 November.

A spokesperson cited "a variety of factors including productivity and risk management" and said the experimentation phase was over. Traders had used the tools for tasks such as monitoring trading flows and modelling positions, and the rollback is reported to have caused frustration inside the firm.

The move follows public enthusiasm from the bank's leadership earlier in the year, when chief information officer Marco Argenti praised "vibe coding" by non-technical staff, and an August warning from a Goldman partner that heavy reliance on the tools could erode bankers' reasoning skills. Goldman continues to roll out its own GS AI Assistant to about 46,000 employees.

#GoldmanSachs
#ClaudeCode
#ArtificialIntelligence
#VibeCoding
#Banking
#Startups
#FounderSignal""",
      first_comment="""Sources: Bloomberg, 2 Nov 2026, "Goldman Restricts Traders and Bankers From Using Some AI Tools"; The Decoder; Finextra. The line worth noticing for anyone selling AI tools into enterprises: the pilot ended because of risk, not because it didn't work."""),
 dict(slug="musk-grok-losing-money", when="Tue 3 Nov · 4:30 pm IST", pillar="Signal (news)", kind="image",
      images=[P3+"signal-musk-grok-losing-money.png", P3+"signal-musk-grok-losing-money-square.png"],
      tags="@xAI  @OpenAI",
      caption="""Elon Musk has said that xAI's Grok Bot costs more to serve than it earns, after users complained that their usage allowances were running out as much as four days early and described the cuts as an "indirect rug pull".

Replying to a user on X on 1 November, Musk attributed the caps to the cost of serving the bot relative to its revenue, without giving figures. Earlier this year he floated inserting sponsored links into Grok's answers to fund what he called the expensive GPUs.

A day later, Musk mocked OpenAI chief executive Sam Altman's comment, made on a podcast, that home PCs having RAM is "terrible" when that memory could be used in AI data centres during the current shortage, writing that "the people deserve to have their RAM too".

#ElonMusk
#Grok
#xAI
#SamAltman
#ArtificialIntelligence
#Startups
#FounderSignal""",
      first_comment="""Sources: TechSpot and Yahoo Finance on the Grok caps (1 Nov), Tom's Hardware on the RAM exchange (2 Nov). Photo of Elon Musk: Wikimedia Commons, CC BY-SA (credit the author named on the file page). The quiet lesson: even xAI can't make flat chatbot pricing cover inference. Watch who moves to usage pricing next."""),
 dict(slug="openai-hires-driscoll", when="Tue 3 Nov · 8:30 pm IST", pillar="Signal (news)", kind="image",
      images=[P3+"signal-openai-hires-driscoll.png", P3+"signal-openai-hires-driscoll-square.png"],
      tags="@OpenAI",
      caption="""OpenAI has hired Dan Driscoll, the former Secretary of the US Army, for a newly created role as senior counselor for national security modernization, the company said on 2 November.

Driscoll resigned from the Army in August after repeated clashes with Defense Secretary Pete Hegseth, according to Bloomberg, and had earlier been part of US talks with Moscow and Kyiv on the war in Ukraine. He is a longtime friend of Vice President J.D. Vance from their time at Yale Law School.

At OpenAI he will work with government, industry and academic partners on what the company calls "democratic AI" and help internal teams understand the operational needs of national security institutions. Coverage has framed the hire as OpenAI's most aggressive move yet into defence, competing with Palantir and Microsoft for Pentagon contracts.

#OpenAI
#DanDriscoll
#NationalSecurity
#ArtificialIntelligence
#Defence
#Startups
#FounderSignal""",
      first_comment="""Sources: CNBC, Reuters, Bloomberg Law, 2 to 3 Nov 2026. Photo: official US Army portrait, public domain. No public reaction yet from lawmakers or OpenAI employees as of this morning; we'll update if that changes."""),
 # ---------- Day 2: Wednesday 4 Nov ----------
 dict(slug="deepseek-proactive-agent", when="Wed 4 Nov · 8:30 am IST", pillar="Signal (news)", kind="image",
      images=[P3+"signal-deepseek-proactive-agent.png", P3+"signal-deepseek-proactive-agent-square.png"],
      tags="@DeepSeek (if the page exists)",
      caption="""DeepSeek's Harness team has open-sourced dsh-superagent, a research prototype of a coding agent that monitors a repository and opens pull requests without waiting for a developer's instruction.

The agent receives development requests through GitHub, and optionally Feishu, runs them in parallel isolated sessions and returns results as pull requests. Its default "observe" mode records the requests it would have accepted without executing them, and DeepSeek describes the design as event-driven repository work rather than an unrestricted autonomous loop.

The company calls the release reference code rather than a product and warns that it is not production-ready. Coverage notes it runs with full operating-system user access and should be isolated before use. The code is published under an MIT licence.

#DeepSeek
#OpenSource
#AIAgents
#Developers
#Coding
#Startups
#FounderSignal""",
      first_comment="""Sources: TechNode, Dataconomy, 2 Nov 2026. Repo: github.com/deepseek-ai (search dsh-superagent). If you try it, run it in a container. Tell us what it opened a PR for without being asked."""),
 dict(slug="swap-intercom-chatwoot", when="Wed 4 Nov · 11:00 am IST", pillar="The Swap (paid vs free)", kind="image",
      images=["assets/week1-v3/mon-swap-intercom-chatwoot.png"],
      tags="@Chatwoot",
      caption="""Intercom Essential starts at $390 a month for a small team. Chatwoot does the same job and costs nothing to run.

Both give you one inbox for website chat, email, Instagram and WhatsApp. Both let you point an AI at your help docs and have it answer the easy tickets.

Where they differ, honestly. Intercom has product tours and a support line that picks up. Chatwoot has neither, and the WhatsApp connection is the one step people complain about; budget an evening and a forum thread for it.

The thing nobody mentions: Intercom's AI agent bills $0.99 per resolution on top. The better it works, the bigger the invoice. Chatwoot's AI layer costs whatever your model provider charges, which for a small inbox is pocket change.

We haven't run Chatwoot past a two-person support team. If you have, tell us where it creaked.

Is someone else's uptime worth $4,680 a year to you, or is that a salary line you'd rather spend elsewhere?

#OpenSource #CustomerSupport #FounderSignal""",
      first_comment="""Pricing pages, checked [today's date]: Intercom intercom.com/pricing, Chatwoot chatwoot.com/pricing. Repo: github.com/chatwoot/chatwoot (38k stars). Their hosted plan exists if you'd rather not run a server."""),
 dict(slug="sarvam-digital-colony", when="Wed 4 Nov · 1:30 pm IST", pillar="Signal (news)", kind="image",
      images=[P3+"signal-sarvam-digital-colony.png", P3+"signal-sarvam-digital-colony-square.png"],
      tags="@Sarvam AI  @Vivek Raghavan",
      caption="""Sarvam AI co-founder Vivek Raghavan has warned that India risks becoming a "digital colony" if it does not build its own artificial intelligence foundations, in remarks to students at the Scindia School in Gwalior reported by Business Today and other outlets in late October.

He argued that dependence on foreign AI would hand control of critical digital infrastructure, data governance and innovation to companies outside the country, and criticised global firms for giving away advanced models for free in a way that undercuts local development.

Sarvam, which describes its platform as a full-stack sovereign AI system built without external dependencies, was selected in 2025 to contribute to India's sovereign model initiative under the IndiaAI Mission and has since signed a five-year defence AI agreement covering the Army, Navy and Air Force.

#SarvamAI
#VivekRaghavan
#SovereignAI
#IndiaAI
#ArtificialIntelligence
#Startups
#FounderSignal""",
      first_comment="""Sources: Business Today (26 Oct 2026), Storyboard18, Startuppedia. Photo: via Sarvam AI. The counter-argument founders keep making: free foreign models are exactly what let a two-person Indian startup ship this year. Both can be true. Where do you land?"""),
 dict(slug="thought-12-to-60", when="Wed 4 Nov · 8:30 pm IST", pillar="Thought experiment", kind="image",
      images=["assets/week1-v3/tue-te-12-to-60.png"], tags="",
      caption="""Two numbers this week: the best AI model scored 12% on real expert work, and Anthropic disclosed $895 billion of compute commitments. Hold both in your head.

The 12% is from SemiAnalysis's new GDPx benchmark. Finance and legal tasks: zero, for all thirteen models tested.

Here's the thought experiment. Not "will it improve", it will. The question is what your company looks like on the day it scores 60%.

Option one: same headcount, each person quietly doing five jobs. That is what happened with spreadsheets and with email. Nobody got fired; everyone's job got wider.

Option two: half the headcount, twice the output. That is what the pitch decks promise and what the 12% says is not close yet.

Option three, the one we find most likely and least discussed: bigger teams, because when expert work gets cheap you do far more of it. The accountants didn't disappear when the calculator arrived. There are more of them.

We're not sure. We'd like to be argued with. Which of the three are you building for?

#ArtificialIntelligence #Founders #FounderSignal""",
      first_comment="""The benchmark: SemiAnalysis GDPx, released 2 Nov 2026 (coverage: Unite.ai, Crypto Briefing). Anthropic's $895B: its amended S-1, 2 Nov, via CNBC and Fortune."""),
 # ---------- Day 3: Thursday 5 Nov ----------
 dict(slug="gdpx-benchmark", when="Thu 5 Nov · 8:30 am IST", pillar="Signal (news)", kind="image",
      images=["assets/test-post/gdpx-benchmark.png", "assets/test-post/gdpx-benchmark-square.png"],
      tags="@SemiAnalysis  @Anthropic",
      caption="""SemiAnalysis has released GDPx, a new benchmark that tests frontier AI models on 206 real professional tasks across 11 industries, including chip design, cybersecurity, quant trading, biology, finance and law.

The best-performing model, Anthropic's Claude Opus 5.5, scored 12.0% overall, ahead of Google's Gemini 4 Carbon at 10.9% and OpenAI's GPT-6 Astra at 9.6%. All 13 models tested scored zero on the finance and legal tasks.

The firm, whose authors include Dylan Patel, said the tasks were built with 14 specialist data partners and that safety classifiers lowered the scores of Opus 5.5 and GPT-6 Astra in cybersecurity, biology and alignment work, where the models sometimes declined to proceed.

#ArtificialIntelligence
#GDPx
#SemiAnalysis
#Claude
#AIAgents
#Benchmarks
#Startups
#FounderSignal""",
      first_comment="""Sources: SemiAnalysis GDPx announcement (2 Nov 2026) and coverage by Unite.ai, Crypto Briefing and Digg. Scores are an average of three attempts per task with domains equally weighted. Worth knowing for anyone selling "AI replaces your analysts": the benchmark says not this quarter."""),
 dict(slug="swap-calendly-calcom", when="Thu 5 Nov · 11:00 am IST", pillar="The Swap (paid vs free)", kind="image",
      images=["assets/week1-v3/tue-swap-calendly-calcom.png"], tags="@Cal.com",
      caption="""Calendly Teams is about $96 a month for four seats. Cal.com is the open-source version and it's free if you host it.

Booking pages, round-robin, reminders, payments, your brand on the page instead of theirs. The core job is identical.

What you give up: Calendly's polish, which is real, and a support line. What you take on: a small server, or Cal.com's own hosted tier if you'd rather pay a bit and skip the server.

One thing we noticed reading the docs rather than from running it: the repo now shows up on GitHub as calcom/cal.diy, about 49,000 stars. If you've migrated recently, tell us whether that changed anything.

Would you put your booking page on your own domain for the saving, or is the Calendly link itself a trust signal to your customers?

#OpenSource #Scheduling #FounderSignal""",
      first_comment="""Pricing pages, checked [today's date]: calendly.com/pricing, cal.com/pricing. Repo: github.com/calcom/cal.diy."""),
 dict(slug="anthropic-895b", when="Thu 5 Nov · 1:30 pm IST", pillar="Signal (news)", kind="image",
      images=[P3+"signal-anthropic-895b.png", P3+"signal-anthropic-895b-square.png"], tags="@Anthropic",
      caption="""Anthropic has filed an amended registration statement with the US Securities and Exchange Commission, updating the prospectus for its proposed listing on the Nasdaq under the ticker ANT.

The filing, dated 2 November, reports revenue of about $17 billion for the three months to 30 September, up from $11.6 billion in the previous quarter, and discloses purchase commitments and lease agreements totalling about $895.4 billion, substantially all of it tied to compute and infrastructure. The largest counterparties named in coverage of the filing are Broadcom, Google, SpaceX's AI unit and Amazon.

The company also returned to an operating loss in the quarter, which Fortune attributed to a sharp rise in infrastructure spending, including about $5 billion of short-term compute bought at higher prices than its long-term agreements. Goldman Sachs and Morgan Stanley are leading the offering; no price range or listing date has been disclosed.

#Anthropic
#IPO
#ArtificialIntelligence
#Nasdaq
#Startups
#VentureCapital
#FounderSignal""",
      first_comment="""Sources: the S-1/A on SEC EDGAR (filed 2 Nov 2026), CNBC "Anthropic reports $17 billion in Q3 revenue, purchase commitments of $895.4 billion", Fortune "Anthropic's growth slowed and costs jumped in the third quarter". For scale: $895 billion is roughly 53 quarters of current revenue."""),
 dict(slug="poll-what-do-you-pay", when="Thu 5 Nov · 8:30 pm IST", pillar="Input (poll)", kind="poll", images=[], tags="",
      caption="""POLL QUESTION: Roughly what does your business pay for software each month?
OPTION 1: Under $100
OPTION 2: $100 to $500
OPTION 3: $500 to $2,000
OPTION 4: More than $2,000
DURATION: 3 days

TEXT ABOVE THE POLL (paste in the main box):
We're picking which bills to take apart first and we'd rather use real numbers than guess. The bracket that wins gets a full teardown next week. If one line item on your bill bothers you, name it below. Anonymous is fine.

#SaaS #Startups #FounderSignal""",
      first_comment="""Every weekday we post one swap: a paid tool and the free way to do the same job. Monday to Friday, 11 am. The winner of this poll decides next week's carousel."""),
 # ---------- Day 4: Friday 6 Nov ----------
 dict(slug="carousel-open-source-startup-stack", when="Fri 6 Nov · 8:30 am IST", pillar="Tools (carousel)", kind="document",
      images=["assets/week1/carousel-launch-startup-stack/carousel.pdf"], tags="@n8n  @Twenty  @Chatwoot  @PostHog  @Supabase",
      caption="""16 open-source tools for the 16 jobs a startup usually pays 16 vendors for.

We checked the star counts on GitHub this week. 942,000 between them.

We did not put prices on the slides. Yours depend on seats and hosting, and a page that quotes a price it didn't screenshot today is guessing.

What's in there: a CRM that looks like Notion and imports a HubSpot CSV. A support inbox that does WhatsApp. Analytics your privacy lawyer will like. E-signatures, invoicing, email campaigns. Automation, database, docs, a team AI chat, design, chatbots.

What's also in there: a slide on where open source bites. Someone on your team owns the updates and the 2am problem.

Our rule, for what it's worth: self-host the boring, stable stuff. Pay for the thing that pages you at night.

Which of the 16 jobs would you never trust to open source? Genuinely asking. The most common answer becomes next week's comparison.

#OpenSource #Startups #FounderSignal""",
      first_comment="""The repos, with star counts checked 2 Nov 2026: Twenty 60k · Chatwoot 38k · Cal.com 49k · PostHog 40k · Plausible 29k · Formbricks 13k · Documenso 15k · Invoice Ninja 10k · listmonk 24k · n8n 209k · Supabase 114k · NocoDB 65k · Outline 41k · Open WebUI 157k · Penpot 61k · Typebot 10k. All at github.com/<owner>/<repo>. Which job did we miss?"""),
 dict(slug="swap-mixpanel-posthog", when="Fri 6 Nov · 11:00 am IST", pillar="The Swap (paid vs free)", kind="image",
      images=["assets/week1-v3/wed-swap-mixpanel-posthog.png"], tags="@PostHog",
      caption="""Mixpanel's Growth plan runs about $140 a month at modest event volumes. PostHog does product analytics, session replay and feature flags in one tool, and its cloud free tier covers most early-stage products.

This is the swap where we'd tell you not to self-host. PostHog on your own server wants real hardware. Their cloud is where most teams should start, and it stays free until you have a lot of users, which is a good problem.

What you give up: Mixpanel's report polish and some of the templated dashboards marketers like.

What you get that Mixpanel doesn't bundle: replays and flags without a second vendor.

40,000 stars on GitHub, checked this week. We haven't run it at scale; if you have, what broke?

If analytics, replays and flags came from one tool for free, what would you do with the two vendor contracts you just cancelled?

#OpenSource #ProductAnalytics #FounderSignal""",
      first_comment="""Pricing, checked [today's date]: mixpanel.com/pricing, posthog.com/pricing. Repo: github.com/PostHog/posthog."""),
 dict(slug="thought-per-outcome-pricing", when="Fri 6 Nov · 8:30 pm IST", pillar="Thought experiment", kind="image",
      images=["assets/week1-v3/thu-te-per-outcome.png"], tags="",
      caption="""Benioff says per-seat pricing is dead. Intercom already charges per resolution. So run the experiment: tomorrow morning every tool you pay for moves to per-outcome billing.

Your CRM bills per closed deal. Your support tool bills per ticket resolved. Your email tool bills per reply. Your analytics bills per insight, however they define that.

Which three do you keep?

Our guess at the honest answer: the ones that touch revenue stay, because the outcome is easy to price and you'd pay it gladly. The ones that save time go first, because "time saved" is exactly the outcome nobody can invoice.

And the sting: per-outcome pricing means the vendor earns more when the tool works better, which sounds fair until you notice it also means the tool has every reason to count generously.

Which three would survive on your stack, and which one would you rebuild on open source the same weekend?

#SaaS #Pricing #FounderSignal""",
      first_comment="""Benioff's remark on per-seat SaaS and Salesforce's per-user revenue: Aakash Gupta on X, 2026. Intercom's $0.99 per resolution: intercom.com/pricing, checked [today's date]."""),
 # ---------- Day 5: Saturday 7 Nov ----------
 dict(slug="carousel-five-automations", when="Sat 7 Nov · 10:00 am IST", pillar="Automations (carousel)", kind="document",
      images=["assets/week1/carousel-automations/carousel.pdf"], tags="@n8n  @Make",
      caption="""Five automations we'd have running by month three at any startup. Not the clever ones. The ones that stop small things falling through the cracks.

1. Lead intake. Form in, company looked up, contact created, one line in Slack. Six nodes.
2. Support triage. Tickets sorted into bug, billing, how-to, sales before a human reads them. Draft reply from your docs. Human clicks approve.
3. Invoice chasing. Day 3 friendly reminder, day 10 founder cc'd, day 20 Slack the founder to call. Most late payments are forgotten, not refused.
4. Weekly numbers. Monday 8am, signups, revenue, churn, tickets, compared to last week, three lines in #general.
5. Content repurposing. One long thing becomes five drafts in a Notion board. A person schedules them.

Each is six nodes or fewer. An afternoon each if you've built one before, a weekend if you haven't.

The last slide compares n8n, Make and Zapier for this, honestly. Short version: if nobody has run Docker, start on Make.

Which one would you build first? Most-requested gets the full build next week.

#Automation #n8n #FounderSignal""",
      first_comment="""Templates for all five exist in the n8n and Make libraries; search the names. We'll link the exact ones for the winner next week."""),
 dict(slug="swap-docusign-documenso", when="Sat 7 Nov · 1:30 pm IST", pillar="The Swap (paid vs free)", kind="image",
      images=["assets/week1-v3/thu-swap-docusign-documenso.png"], tags="@Documenso",
      caption="""DocuSign Standard is about $45 a seat a month. Documenso is the open-source e-signature tool, free to host, with a paid hosted tier if you want someone else to run it.

Templates, audit trail, API, the signing flow your customers already know. 15,000 stars on GitHub this week.

The catch we'd put in bold: compliance. If you sign in a regulated industry, or across borders, read Documenso's compliance page and your lawyer's face before moving anything that matters. DocuSign has spent twenty years on certifications and that is a real part of what you pay for.

For NDAs, offer letters and vendor contracts at a small company, the swap is straightforward.

What's the last document you signed where the tool actually mattered?

#OpenSource #Esignature #FounderSignal""",
      first_comment="""Pricing, checked [today's date]: docusign.com/pricing, documenso.com/pricing. Repo: github.com/documenso/documenso."""),
 dict(slug="thought-2028-startup", when="Sat 7 Nov · 8:30 pm IST", pillar="Thought experiment + week recap", kind="image",
      images=["assets/week1-v3/sat-te-2028-startup.png"], tags="",
      caption="""A 2028 startup: three people, forty agents, no support team. Who is the fourth hire?

This week's news says the agents aren't ready. The best model scored 12% on expert work. Fine. Give it two years and assume the boring half of every job is handled.

Three founders. Agents answering tickets, chasing invoices, drafting outreach, summarising calls. The company works. Then revenue justifies a fourth salary.

Option one: someone who talks to customers all day, because that's the thing the agents are worst at and the thing that decides whether anyone pays.

Option two: someone who fixes the agents at 2am, because forty of anything breaks.

Option three: a salesperson, on the theory that everything else is automated and growth is the only job left.

Week one, honestly: [N] followers, [M] people who commented, the post that did best was [X]. Next week's swap carousel is the one you voted for: [winner].

Who's your fourth hire, and why not the other two?

#Founders #ArtificialIntelligence #FounderSignal""",
      first_comment="""The poll result: [winner]. Send us the tool you resent paying for: [your Tally form link]. Replace the bracketed numbers before posting."""),
 # ---------- Week 2 openers (Monday 9 Nov) ----------
 dict(slug="swap-mailchimp-listmonk", when="Mon 9 Nov · 11:00 am IST", pillar="The Swap (paid vs free)", kind="image",
      images=["assets/week1-v3/fri-swap-mailchimp-listmonk.png"], tags="",
      caption="""Mailchimp's Standard plan starts around $20 a month and climbs with your list. listmonk is the open-source newsletter and campaign tool; your only cost is the per-send fee of whatever email provider you plug in.

Campaigns, lists, templates, analytics. 24,000 stars. One binary, one database.

What you give up: the drag-and-drop editor and Mailchimp's hand-holding on deliverability, which matters more than people admit. You bring your own SMTP (Amazon SES, Postmark, whoever) and you own your sender reputation.

Where this swap wins outright: lists above about 10,000, where Mailchimp's price curve gets steep and listmonk's doesn't move.

We've read the docs and the issues; we haven't run a 50,000-person send on it. If you have, how did deliverability hold?

Is a nicer editor worth the per-subscriber tax to you, or is that the first thing you'd cut?

#OpenSource #EmailMarketing #FounderSignal""",
      first_comment="""Pricing, checked [today's date]: mailchimp.com/pricing. Repo: github.com/knadh/listmonk."""),
 dict(slug="tool-n8n", when="Mon 9 Nov · 8:30 pm IST", pillar="Tools", kind="image",
      images=["assets/week1/mon-am-pick-n8n.png"], tags="@n8n",
      caption="""n8n. 209,000 stars, which makes it one of the most-starred pieces of software on GitHub, and most founders we talk to have never opened it.

It does the job of Zapier or Make. Boxes and arrows, 400-odd integrations, and AI agent nodes built in so a workflow can read an email and decide what to do with it.

Good for: a team where one person has run Docker once. The free self-hosted version covers a startup's first five automations with room to spare.

Not for: a team where nobody wants to own an update. That's not a criticism. Use Make, pay the bill, and come back when the bill makes you wince.

The honest catch: self-hosting means it's your server that goes quiet on a Saturday. For automations that move money, keep a human in the loop for the first month.

If you've used it, what's the first workflow you built? If you haven't, what's stopping you?

#n8n #Automation #FounderSignal""",
      first_comment="""github.com/n8n-io/n8n. Their cloud version exists if you'd rather not host."""),
]

def main():
    if os.path.exists(OUT): shutil.rmtree(OUT)
    os.makedirs(OUT)
    index = ["# Posting order\n", "| # | When (IST) | Pillar | Folder |", "|---|---|---|---|"]
    for i, p in enumerate(POSTS, 1):
        d = os.path.join(OUT, f"POST-{i:02d}-{p['slug']}"); os.makedirs(d)
        for src in p["images"]:
            s = os.path.join(ROOT, src)
            if not os.path.exists(s): print("MISSING", src); continue
            ext = os.path.splitext(src)[1]
            name = "carousel.pdf" if ext == ".pdf" else ("image-square.png" if "square" in src else "image.png")
            shutil.copy(s, os.path.join(d, name))
        with open(os.path.join(d, "caption.txt"), "w") as f:
            if p["tags"]: f.write(f"TAG IN THE POST (type @ and pick): {p['tags']}\n\n")
            f.write(p["caption"] + "\n")
        with open(os.path.join(d, "first-comment.txt"), "w") as f: f.write(p["first_comment"] + "\n")
        with open(os.path.join(d, "how-to-post.txt"), "w") as f:
            f.write(f"POST {i:02d} · {p['when']} · {p['pillar']}\n\n{HOW[p['kind']]}\n")
        index.append(f"| {i:02d} | {p['when']} | {p['pillar']} | POST-{i:02d}-{p['slug']} |")
    with open(os.path.join(OUT, "00-POSTING-ORDER.md"), "w") as f: f.write("\n".join(index) + "\n")
    print(f"{len(POSTS)} post folders -> {OUT}")

if __name__ == "__main__":
    main()
