# Startupro.in: what the page does, and how Lean Stack borrows it

## What I could verify (this session cannot open linkedin.com or startupro.in)
- Followers: about 153,000 on a post roughly 14 months old, about 291,000 on one roughly 9 months old. That is about 140,000 followers in five months, which is very fast for a company page.
- Posts indexed by search: Seekho's $28M Series B (funding news); Saurabh Dwivedi leaving The Lallantop for The Indian Express (people move); a Supreme Court story on cancer-drug prices (business and public-interest news); Naval Ravikant career advice (quote and wisdom content); a feature on Highring AI, an early-stage hiring startup, which the founder publicly thanked them for.
- Business model: startupro.in describes itself as a "startup growth partner" offering PR, hiring, growth and investor connections. The page is the top of a paid-PR funnel: founders pay to be featured, and the news content is what earns the audience that makes a feature worth paying for.
- Comparable pages: Indian Startup News (about 116k followers) posts founder quotes with a short backstory and a hashtag block. Startup News India sells "premium publication", press releases and video features openly.

## The format, inferred from the snippets and the genre
Treat this as a strong hypothesis until you send 3 to 5 screenshots.
1. **One image per post, almost always.** A branded template: a photo of the person or logo on top, a bold headline in the lower band, the page mark. Faces of recognisable people (founders, CEOs, editors, investors) do most of the stopping.
2. **Caption is a news brief, not a thought piece.** First line restates the headline with the number. Then 4 to 8 very short paragraphs: who, what, the number, one line of backstory, one line of "why this matters". Then either a soft question ("What do you think?") or nothing. Then a block of 5 to 10 hashtags.
3. **Topics rotate across four buckets:** funding and IPO news, people moves and layoffs, founder stories and quotes (inspiration), and policy or big-business news with a startup angle.
4. **Volume and speed.** Pages like this post 3 to 6 times a day and newsjack within hours. Consistency is the growth engine, not any single post.
5. **Why the likes are high.** Indian LinkedIn is 160M+ members and heavily early-career; news about names they know, in a two-second image, is low effort to like and reshare. Pride, outrage and inspiration are the three emotions in rotation. Likes run far ahead of comments on this genre, which is fine for reach and for selling PR, less good for building a community.

## What Lean Stack takes from it
- **The news card.** `scripts/news_card.py` renders the same shape in our palette: photo on top, bold headline, one-line sub, source and date, page mark. Portrait 1080x1350 and square variants. Samples in `assets/newscards/`.
- **The brief-style caption.** Headline line with the number, then short paragraphs: what happened, the number, the context, why a startup should care, one question. Hashtag block of 3 to 5 (not 10; the 2026 feed treats hashtag walls as a spam signal).
- **Newsjacking inside our lane.** Not Zomato layoffs. Tool pricing changes, open-source milestones, AI platform launches, funding rounds for automation and dev-tool companies, LinkedIn and platform policy changes that affect founders, and quotes from founders about tools and leverage. Same reflexes, our topic.
- **People in the frame.** Where a story has a founder or a maintainer, their photo (with permission or from an official press kit) goes in the card. A logo is the fallback.
- **Volume.** Three news cards a day on weekdays, plus the planned carousel or poll. News cards are 15 minutes each once the template exists.

## What Lean Stack does not copy
- Paid features disguised as news. If a startup pays, the post says "Sponsored" in the first line. Anything else is the thing LinkedIn's report button and SEBI-style scrutiny are built for.
- Ten-hashtag blocks and "What do you think?" as the only question. We ask a specific one.
- Covering everything. The topic fingerprint still matters; a Zomato post would cost us more reach on tool posts than it gains.

## Caption template (brief style)
```
[Headline sentence with the number.]

[What happened, one sentence.]
[Who is behind it, one sentence.]
[The number in context: compared to a competitor, last year, or the paid alternative.]
[Why a founder or ops lead should care, one sentence with an opinion.]
[One specific question.]

#OpenSource #Startups #Automation
```

## Five sample posts (cards in assets/newscards/)
**1. n8n crosses 209k stars** (card: n8n-209k.png)
n8n has crossed 209,000 GitHub stars. That is more than any other business-automation project, and more than most programming languages.

It does the job of Zapier or Make: boxes and arrows, 400-odd integrations, AI agent nodes built in.

It is free to self-host. The company sells a cloud version for teams who would rather not.

For scale: Supabase, which most developers have heard of, is at about 114,000.

Our read: the most-starred automation tool on the internet is still invisible to most founders because it needs one person who has run Docker. That gap is where a lot of money is still being spent on per-task pricing.

If you've tried it, what did you build first? If you haven't, what stopped you?

#OpenSource #Automation #Startups

**2. LinkedIn's slop button** (card: linkedin-slop-button.png)
LinkedIn now lets anyone report a post as "AI slop", and flagged posts lose reach.

The option landed on 30 July. LinkedIn's product chief called slop "a top priority".

Fortune reports accounts writing with generic LLM output are seeing about 40% fewer views than before.

For founders posting from a company page, this cuts two ways. Templates die faster. Real numbers and real screenshots travel further.

What's the last post you scrolled past because it read like a template?

#LinkedIn #Founders #Content

**3. Intercom's per-resolution pricing** (card: intercom-fin-pricing.png)
Intercom's AI agent charges $0.99 every time it marks a ticket resolved.

Five seats plus 2,000 AI resolutions a month comes to roughly $2,475, by a competitor's estimate. Verify on the pricing page; it changed twice this year.

The open-source inbox that does the same job, Chatwoot, is free to host and has an AI answer layer you point at your own docs.

The catch: someone on your team owns the server, and WhatsApp setup takes an evening or two.

Our read: per-outcome pricing is clever for the vendor. It bills you more the better it works.

Would you pay per resolution if it meant never touching a server?

#StartupCosts #CustomerSupport #OpenSource

**4. Workweek raises $17M** (card: workweek-17m.png)
Workweek raised $17 million and opened its ad network to outside newsletter writers.

The company runs franchise newsletters like The Marketing Millennials, pays creators a salary plus revenue share, and sells advertisers account-level data on who reads.

Reported revenue is north of $20 million.

Why it matters to anyone building an audience: a faceless media brand with a newsletter is now a fundable business, not a side project.

Which B2B newsletter would you pay to sponsor, and why that one?

#Media #Newsletters #Startups

**5. The 333k-star list** (card: awesome-selfhosted.png)
One GitHub list has 333,000 stars and names a free alternative to almost every piece of software a startup pays for.

awesome-selfhosted. Sorted by category, maintained for years.

How we read it: search the category, sort by last commit, skip anything quiet for six months.

What it won't tell you: setup time, what breaks, whether your accountant will accept it. That's our job.

Which category have you searched and found nothing good enough? That's where the paid tool has earned its price.

#OpenSource #Tools #Startups

## To calibrate exactly
Send 3 to 5 screenshots of Startupro posts that got 500+ likes, including the image and the full caption. I will match the image composition (where the face sits, headline size, colour band) and the caption rhythm line by line, and regenerate the cards and copy.
