# Newsdesk playbook: the Startupro format, run for startups, automation and tools

Confirmed from your screenshots (a post with 1,494 reactions, 66 comments, 45 reposts):

**Image.** A collage: large photo of the main subject on the left, a second scene photo on the right, a circular inset of the person being quoted overlapping the join between photos and the text band. Round logo badge top-left. Bottom third is a dark band carrying a long quote-style headline in heavy white type, with the key phrases in yellow. Social icons and the handle bottom-right. `scripts/quote_card.py` reproduces this exactly in our palette; mark highlight phrases with [square brackets].

**Caption.** Three short paragraphs in neutral news-wire voice, third person. Paragraph 1: who (tagged), where, what they said and to whom. Paragraph 2: the argument, in reported speech. Paragraph 3: the wider point they raised. No first-person, no question, no call to action. Then a column of 6 to 8 hashtags, one per line, ending with the page's own tag.

**Why it works.** A public figure plus an ordinary person pushing back. A quote with a sting. A relatable grievance (work hours, pay, hiring, cost) that an early-career Indian LinkedIn audience feels personally. The image does the emotion, the caption does the credibility, and the neutral tone makes it reshareable by people who don't want to look like they're taking sides.

## Our lane for this format
Same reflexes, different beat. We run the quote-card desk on five topics only:
1. Founders and investors on AI, automation and jobs (Nithin Kamath on "we use AI" decks, Nikhil Kamath on the AI bubble).
2. Hiring and work culture where tools are the story (the Bengaluru round where 34 of 35 candidates sent AI slop).
3. Software pricing fights (Benioff's "per-seat is dead" versus Salesforce's per-user revenue; Intercom's per-resolution pricing; Indian SaaS usage bills jumping).
4. Platform rules that hit founders (LinkedIn's AI-slop report button).
5. Open-source milestones with a person attached (a maintainer's quote when a repo crosses a round number).

Not in the lane: ministers, layoffs at food-delivery apps, IPO gossip. Those earn likes and cost us topic authority.

## Daily routine (about 45 minutes for three cards)
**Sources, checked at 8 am and 6 pm IST:** Inc42, Entrackr, YourStory, Moneycontrol Startup, Storyboard18, Business Today Tech, TechCrunch, The Register, and the X feeds of about 25 named people: Nithin and Nikhil Kamath, Kunal Shah, Sridhar Vembu, Girish Mathrubootham, Aravind Srinivas, Deepinder Goyal, Bhavish Aggarwal, Vijay Shekhar Sharma, Kris Gopalakrishnan, Aakash Gupta, Marc Benioff, Sam Altman, Jan Oberhauser (n8n), Paul Copplestone (Supabase), plus the Bengaluru founders who go viral once a month. Add anyone who trends.

**Pick test, all four must pass:** a named person said it; it is about AI, automation, tools, hiring-with-tools or software cost; there is a quotable sting; you can link the primary source in the first comment.

**Build, 15 minutes per card:**
1. Copy the quote. Mark the three to five phrases a reader should see first in [brackets].
2. Photos: official press kit, company newsroom, Wikimedia Commons, or the person's own public post with credit. Never a news agency photo without a licence. Second photo is a scene (office, product, city) from a free stock source.
3. `python3 scripts/quote_card.py content/quotecards/<slug>.json assets/quotecards/<slug>.png`
4. Caption from the template below. Tag the person and company. Hashtag column. First comment carries the source link and, where we have one, the cheaper or open-source angle.
5. Post. Reply to the first ten comments as the page. If the person responds, pin it.

## Caption template
```
[City]-based [role] [Name] has [sparked a debate / drawn attention] with [his/her/their] remarks on [topic], after [where it was said].

[He/She/They] [argued / questioned / said] that [the core claim, in reported speech, one or two sentences with the number].

[He/She/They] also [raised / pointed to] [the wider point], saying [the second quote or implication].

#Hashtag1
#Hashtag2
#Hashtag3
#Hashtag4
#Hashtag5
#Startups
#LeanStack
```
Option for our page: a single specific question as a fourth paragraph on one in three posts. Startupro omits it. We test both and keep what the log says.

## Cadence
Three quote cards a day on weekdays (8:30 am, 1:30 pm, 8:30 pm IST), plus the planned carousel, poll or tool card. One of the three can be a day-old story if nothing fresh passes the pick test. Weekends: one card.

## Risks and rules
- Quote accurately. Trim with ellipses, never rephrase inside quotation marks. Headlines paraphrase outside the quotes.
- Name the source in the first comment every time.
- If the person asks for a correction, correct the caption and reply publicly.
- Photo rights are the real exposure. Press kits and Commons only. Keep a credits line in the working folder for every card.
- No paid features disguised as news. "Sponsored" in the first line, or not at all.
