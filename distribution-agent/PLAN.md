# Distribution agent: plan and research

Researched 11 November 2026. A free agent that gets first users and first revenue for makers who have a digital product or AI agent but no go-to-market knowledge and no budget.

## How far to trust this

- Three research passes ran in parallel: free channels, competitors, and the zero-cost stack.
- Reddit, Indie Hackers, and X help pages could not be opened directly, so claims about them come from secondary sources.
- Competitor pricing mostly comes from vendor and affiliate blogs. Check live pricing pages before quoting any figure.
- Free tiers change often. Every limit below was read or reported in November 2026.
- Items marked "unconfirmed" need a direct check before we depend on them.

## 1. The decision in one page

| Question | Decision | Why |
|---|---|---|
| What is it? | A coach that diagnoses first, then gives one channel and one small daily task | Existing tools generate content before establishing who the customer is |
| Does it post for the user? | Never in communities. Only to the user's own surfaces through official APIs | Reddit, X, Hacker News and Product Hunt all restrict or ban automated or AI-written posts |
| Who pays for the model? | The user's own Claude or ChatGPT plan | Free hosted inference is too small for more than a demo |
| What do we host? | One small MCP server on Cloudflare's free plan | Supplies search, tracking and rule data to the user's model |
| First niche | Makers of AI agents and MCP servers | No competitor found aimed at them; we are one ourselves |
| How it makes money | Free open core; one flat paid tier later, no credits | Credit metering is the most repeated complaint about competitors |

## 2. Who it is for and what hurts

Target user: a solo maker who has shipped something and has zero users, zero audience and zero budget.

What they say, from Indie Hackers and X:

- "I built it and nobody came." One founder six weeks in had 9 installs and $0.
- Building gives feedback; distribution gives rejection, so they avoid it and keep building.
- They launch once (one Product Hunt post, one Reddit thread) and go silent.
- They cannot name a narrow customer.
- Their self-promotion posts get removed, and they do not know why.
- Signups do not turn into payment.

The agent therefore has to solve vagueness and avoidance, not only produce copy.

## 3. Competitors and the gap

| Product | What it does | Price | Weakness |
|---|---|---|---|
| HeyCatch | Daily organic moves for zero-user founders | About $80 per 4 weeks, no free tier | New, beta only; closest to this idea |
| Okara AI CMO | Enter a URL; agents run SEO and social | $20–99 a month | Free tier reportedly ends before any value; opaque credits |
| Polsia | "AI runs your company" | $49 a month plus 20% of revenue | Reviews report fabricated progress |
| Sintra, Marblism, Blaze | AI "employees" for content | $24–150 a month | Assume knowledge; credit burn |
| Redreach, RedShip, F5Bot | Reddit monitoring and reply drafts | Free to $79 a month | Hand over a thread, not the judgement |
| ReplyGuy, Bazzly | Auto-post product plugs | Up to $199 a month | Accounts banned; brand damage |
| Outrank, SEObot | Autopilot SEO articles | $49–99 a month | Months to pay off; exposed to Google spam updates |
| marketingskills (open source) | About 50 marketing skills for coding agents | Free | A toolkit; the user must know which skill to run |
| Postiz (open source) | Scheduler with an MCP server | Free self-hosted | Execution only |

Gaps nobody fills:

1. A free path that delivers value before any paywall.
2. Diagnosis before execution: who the customer is, and whether anyone wants this.
3. Community judgement: rules, account readiness, when not to mention the product.
4. Tracking which actions produce signups.
5. Help with avoidance: small tasks, streaks, tolerance for rejection.
6. Anything aimed at makers distributing an AI agent. This is absence of evidence from our searches, not proof.

## 4. Platform rules that shape the design

| Platform | Rule | Consequence for the agent |
|---|---|---|
| X | API replies allowed only when the author mentioned or quoted you (since Feb 2026). No free API; $0.015 per post, $0.20 with a link | No automated replies; no API use at $0 |
| Reddit | Commercial data use needs written approval. Free API reported to close in stages to March 2027; RSS ends 13 Nov 2026 | Find Reddit threads through web search. Human posts |
| Hacker News | Guidelines ban generated or AI-edited comments. Read API is free | Agent finds and briefs; maker writes |
| Product Hunt | "No LLMs" in comments. API is non-commercial | Manual only |
| LinkedIn | Bots that like, comment, message or connect are banned. Posting your own content through the official API is allowed, 150 requests a day | The one major network where scheduled own-profile posts are permitted |
| Google | Scaled-content spam policy; 2026 updates hit thin programmatic sites | No bulk page generation |
| Discord | Self-bots banned; DM advertising counts as manipulation | Manual only |

Where free programmatic publishing is allowed: LinkedIn own profile, dev.to, GitHub, YouTube uploads, and the MCP registry. Everything else is draft-and-coach.

## 5. Free channels, ranked for a beginner

| Rank | Channel | What to expect | Agent's job |
|---|---|---|---|
| 1 | One niche subreddit plus manual DMs | Fastest documented path to first users. Buildpad reached 100 users in about two weeks | Find threads, explain the subreddit's rules, critique the maker's reply |
| 2 | One-to-one outreach to people who showed interest in similar tools | Slow, reliable for the first 10–50. Tally's first 10 users came this way | Build the list, coach the message, log replies |
| 3 | Marketplaces with built-in demand | Buyers arrive with intent. Chrome Web Store costs $5 once; MCP registry is free | Match product to marketplace, prepare the listing |
| 4 | LinkedIn posts (business buyers) or X replies (developers) | Small accounts can still reach non-followers on LinkedIn | Plan posts, schedule to own profile |
| 5 | Show HN, once | Median post gets 2 points; 62% get no comments. Occasional large win | Check eligibility, prepare the maker to answer comments |
| 6 | 10–20 active free directories plus tutorial posts on dev.to | Backlinks and AI-citation surface, few signups | Pick live directories, draft submissions |

Leave for later: TikTok and Shorts, programmatic SEO, GPT Store, Quora, bulk cold email, and Product Hunt as a first move.

The repeatable pattern across the case studies:

1. Pick one community where the users already are and show up daily for weeks.
2. Lead with something useful, then move to direct messages with people who engaged.
3. Run a launch event only after about 100 users.
4. Build a loop into the product (badge, share-for-credit, marketplace listing).

These stories are survivorship-biased and mostly founder-facing products. Treat them as the upside.

## 6. What the agent does

One loop, in this order. Each step is a skill the user's model runs.

| Step | Output | Stop condition |
|---|---|---|
| 1. Diagnose | One narrow customer, the problem in their words, product type | Cannot proceed until the customer is specific enough to find 10 of them |
| 2. Demand check | 10 real conversations where people describe the problem | Fewer than 10 found means narrow or change the customer |
| 3. Pick one channel | One channel for 30 days, from the product-type table below | No second channel until the first has 30 days of data |
| 4. Daily task | A 20-minute task: 3 threads to reply to, or 5 people to message | One task a day, never a list of ten |
| 5. Coach the draft | Maker writes; agent checks it against the community's rules and flags promotion | Agent does not write community posts |
| 6. Track | Each action logged with the signups it produced | Weekly review drops what produced nothing |
| 7. Launch and loop | Launch event after about 100 users; add a product-embedded loop | — |

Channel by product type:

| Product | First channel | Marketplace to list on |
|---|---|---|
| AI agent or MCP server | Niche subreddit or developer Discord, manual | MCP registry, Claude directory, ChatGPT apps directory |
| Browser extension | Chrome Web Store search | Chrome Web Store |
| Template or Notion product | Notion Marketplace | Notion Marketplace, Gumroad |
| SaaS for businesses | LinkedIn posts plus direct messages | AppSumo once there are users |
| Developer tool | X replies, Show HN once | GitHub, dev.to |
| Course or ebook | One community plus direct messages | Gumroad |

## 7. The $0 stack

| Layer | Choice | Free limit | What breaks first |
|---|---|---|---|
| Reasoning | User's own Claude or ChatGPT plan | None on our side | Whether free-plan users can add connectors is unconfirmed |
| Fallback reasoning | User's own key for Groq, Gemini or OpenRouter; Ollama locally | Groq 1,000 requests a day; Gemini Flash about 20 a day | Single-user quotas only |
| Server | Cloudflare Workers | 100,000 requests a day, 10 ms CPU each | Heavy parsing |
| Database | Cloudflare D1 | 5 GB, 100,000 writes a day | Not a near-term limit |
| Scheduled jobs | Cloudflare cron triggers | 5 per account | — |
| Web search | Tavily and Exa | About 3,500 searches a month combined | First wall: 100–300 research runs a month across all users |
| Other data | Hacker News Algolia API, YouTube Data API | YouTube search 100 calls a day | — |
| Email | Resend | 100 a day, 3,000 a month | — |
| Payments from India | Polar or Dodo Payments | No monthly fee; about $1.50–1.80 on a $20 sale | Eligibility for Indian individuals on Dodo is unconfirmed |

Avoid:

- Vercel's free plan: it is non-commercial.
- Direct Stripe: invite-only for new Indian accounts.
- The Reddit API: closing.
- Google Custom Search: shuts down 1 January 2027.
- GitHub Models: retired July 2026.

The search limit is handled by using the host model's own web search first, and asking heavy users for their own search key.

## 8. Distributing the agent itself

We use the agent on itself. That is both the test and the proof.

| Surface | Cost | Note |
|---|---|---|
| Public GitHub repo, installable as a plugin source | Free | No review needed |
| Official MCP registry | Free | Other directories pull from it; publish here first |
| ChatGPT apps directory | Free, reviewed | Selling or upgrade prompts inside the app are not allowed |
| Claude directory | Needs a paid Claude plan to submit | Optional |
| Existing "Zero Cost AI" LinkedIn page in this repo | Free | First content channel |
| One niche community, manual | Free | Share real results from our own use |
| Show HN, once | Free | After real users exist |

Built-in loop: each user gets a shareable results card ("30 days, 1 channel, N signups") that links back.

## 9. Money

- Core stays free and open source.
- One flat paid tier later (suggested $9–19 a month) for a hosted tracker, multiple products and a weekly review. No credits.
- Payment happens on our own site, since the ChatGPT directory forbids selling inside the app.
- The target user has no budget, so paid conversion will be low until they earn. Do not build payments before 100 active users.

## 10. Build order

| Phase | Time | What ships | Infrastructure |
|---|---|---|---|
| 0 | Week 1 | Skills for steps 1–6 in a public repo; tracker is a local file | None |
| 1 | Weeks 2–4 | MCP server: conversation search, Hacker News and YouTube tools, hosted tracker, community-rules data, live-directory list | Cloudflare free plan |
| 2 | Weeks 4–8 | Run 10 real makers through it by hand; fix what fails | — |
| 3 | After 100 users | Directory listings, results card, paid tier | Polar or Dodo |

Measures:

- Share of users who finish the diagnosis.
- Share who complete 7 daily tasks in the first 14 days.
- Users reaching a first signup within 30 days.
- Users reaching a first dollar within 60 days.

## 11. Risks

| Risk | Response |
|---|---|
| Users on free Claude or ChatGPT plans may not be able to add the server | Check first; keep the bring-your-own-key CLI as fallback |
| Reddit access tightens further | Depend only on web search and human posting |
| Makers still avoid the daily task | Keep it to 20 minutes; streaks; one task only |
| Coaching feels slower than tools that post for you | Lead with "your account does not get banned" and tracked results |
| HeyCatch or Okara add a free tier | Stay open source and niche on AI-agent makers |

## 12. Open decisions

1. First niche: AI-agent makers only (recommended), or all digital products.
2. Name.
3. Whether to submit to the Claude directory, which needs a paid plan.

## Key sources

Channels and rules:

- https://news.ycombinator.com/showhn.html
- https://news.ycombinator.com/newsguidelines.html
- https://help.producthunt.com/en/articles/10030102-commenting-guidelines
- https://docs.x.com/x-api/getting-started/pricing
- https://x.com/XDevelopers/status/2026084506822730185
- https://learn.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/share-on-linkedin
- https://www.postpone.app/blog/reddit-automation-crackdown
- https://ppc.land/reddit-to-halt-public-data-api-access-in-march-2027-as-14-000-apps-register/
- https://danfking.github.io/blog/2026/04/23/show-hn-by-the-numbers/
- https://getlaunchlist.com/blog/startup-directories-audit-2026
- https://searchengineland.com/ai-search-engines-cite-reddit-youtube-and-linkedin-most-study-473138

Case studies:

- https://news.ycombinator.com/item?id=44170619 (Buildpad)
- https://blog.tally.so/getting-an-audience-by-cold-outreach (Tally)
- https://plausible.io/blog/open-source-saas (Plausible)
- https://dev.to/openpilot/one-month-of-launching-a-solo-open-source-desktop-agent-the-real-numbers-1g9a (counter-example)

Competitors:

- https://heycatch.ai/blog/heytech-ai-review-zero-user-founders
- https://tribechat.com/blog/okara-ai-cmo-review-2026-hype-or-paywall-real-test
- https://www.trustpilot.com/review/polsia.com
- https://github.com/coreyhaines31/marketingskills
- https://github.com/gitroomhq/postiz-app
- https://gummysearch.com/docs/gummysearch-is-now-closed-6533h

Stack:

- https://developers.cloudflare.com/workers/platform/limits/
- https://vercel.com/docs/plans/hobby
- https://console.groq.com/docs/rate-limits
- https://openrouter.ai/docs/api/reference/limits
- https://docs.tavily.com/documentation/api-credits
- https://exa.ai/pricing
- https://claude.com/docs/connectors/building/submission
- https://developers.openai.com/apps-sdk/app-submission-guidelines
- https://www.stackone.com/blog/mcp-registry-how-to-get-listed/
- https://polar.sh/docs/merchant-of-record/fees
- https://dodopayments.com/pricing
- https://support.stripe.com/questions/stripe-accounts-are-invite-only-in-india

## Playbooks by product type

| Product | File |
|---|---|
| AI agents and AI products | `AI-AGENTS-PLAYBOOK.md` |
| SaaS and micro-SaaS | `SAAS-PLAYBOOK.md` |
| Templates, courses and ebooks | `TEMPLATES-COURSES-EBOOKS-PLAYBOOK.md` |
| Newsletters and paid communities | `NEWSLETTERS-COMMUNITIES-PLAYBOOK.md` |
