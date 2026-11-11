# AI agents and AI products: zero-cost distribution playbook

Researched 11 November 2026. Covers agents, MCP servers, automations, AI micro-SaaS, bots, extensions and templates, for a solo maker with no budget and no audience. Companion to `PLAN.md`.

## How far to trust this

- First-person income reports with dates and numbers are rare. Most "2026 playbooks" online are vendor or marketing content.
- Platform income figures are mostly the platforms' own claims.
- Indie Hackers, Reddit and Devpost pages could not be opened, so cases from them rest on search summaries.
- Case studies are survivorship-biased. Treat them as the upside, not the typical result.
- Items marked "unconfirmed" need a direct check before anyone relies on them.
- Time estimates and the day-by-day plans are synthesis from the cases, not measured benchmarks.

## 1. The short answer

Run two tracks at once.

| Track | What | Time to first dollar | Why |
|---|---|---|---|
| A. Direct | Sell the agent's outcome as a fixed-price pilot to people already describing the problem | 1–4 weeks | Fastest evidenced route for a maker with no audience |
| B. Passive | List the agent's core where buyers already search and the platform bills them | 1 day to 6 weeks | Removes the audience problem and the checkout problem |

Every first dollar found in under a week came from one of two things: a marketplace with existing search demand, or an existing audience or viral moment. Only the first is reproducible from zero.

Weak or negative for a first dollar:

- Product Hunt.
- Templates and prompt packs.
- Lifetime deals.
- Paid Chrome extensions.
- Telegram bots.
- New app stores.
- Answer-engine optimisation.

## 2. Which route fits which AI product

| Product | Free traffic source | How it gets paid | First-dollar route |
|---|---|---|---|
| Scraper, data tool, API-like agent | Apify Store (pages rank in Google) | Apify bills users, keeps 20% | List on Apify with pay-per-event pricing |
| MCP server | Official MCP registry, Glama, awesome-mcp-servers | Own checkout, licence key or hosted tier | Free listing plus a paid hosted tier from day one |
| Skill or plugin for coding agents | skills.sh, own Claude plugin marketplace, Open VSX | No platform payment | Use as lead source for a paid service or hosted product |
| Business automation agent | People posting about the problem | Direct invoice | Paid pilot, then retainer |
| AI micro-SaaS | Replies in problem threads, GitHub if open source | Merchant-of-record checkout | Public demo to people with the problem; charge at once |
| n8n or Make workflow | n8n template library | Own checkout; n8n affiliate pays 30% for 12 months | Lead generation for services, not template sales |
| Chat bot | Poe | Poe pays per message, $10 minimum, India eligible | Low ceiling; side income only |
| Shopify or Atlassian app | App store search | Store bills merchants; 0% share on first $1M | Best ceiling, slowest start ($19 fee and review for Shopify) |
| Self-hostable open-source agent | GitHub, Hacker News, Railway templates | Hosted version; Railway pays up to 25% of deploy revenue | Open core plus hosted tier at launch |

## 3. The funnel, stage by stage

| Stage | Benchmark | Free tactics with evidence |
|---|---|---|
| Awareness | AI search is about 0.28% of web traffic; one maker got 79% of Apify users from Google | Reply where the problem is discussed; list where buyers search; one useful public post with real results |
| Visit to signup | Freemium 9%, free trial 4.5%, card-required trial 3.5% (ChartMogul, 200 products) | Show real output, a short demo and a price on one page |
| Activation | AI products about 55% (sample unclear) | Get the user to one useful result in the first session; allow use before signup |
| Free to paid | Median 8% in 6 months; card-required trial 30%; bottom quarter under 2.5% | Card-required trial yields about 10.5 payers per 1,000 visitors versus 3.6 without |
| Launch-day paying | Often about zero; one Product Hunt launch got 400 signups and 1 customer | Do not treat a launch as the revenue event |
| Retention | AI apps churn about 30% faster; 21% of annual subscribers remain at one year versus 31% for non-AI (RevenueCat, mobile only) | 7-day trial, accumulated work the user would lose, reminders |
| Referral | No source gave the share of signups from any badge | "Made with" link on free output; shareable results; outputs that open as a live page |

The spread between the best and worst fifth of products is about tenfold, so these medians are loose guides.

## 4. Routes to first dollar, ranked

| Rank | Route | Time | Effort | Evidence |
|---|---|---|---|---|
| 1 | Done-for-you outcome or paid pilot; turn it into a product later | 1–4 weeks | High | Medium: first clients at $2,000 each in one account |
| 2 | Marketplace with demand and billing (Apify) | 1 day to 6 weeks | Medium | Medium to strong: revenue within a day in one case, 41 days in another |
| 3 | Public demo to people discussing the problem, charge immediately | Hours to days if it lands | Low to medium | Strong for 2023, weak for 2026 |
| 4 | Founding-member or annual prepay to a small list | 1–3 weeks | Medium | Weak: one unverified case |
| 5 | Hackathon prizes and bounties | 1–8 weeks, irregular | Medium | Medium: prizes of $1,000–30,000 documented |
| 6 | Affiliate (n8n pays 30% for 12 months) | Months | Low | Weak: one attempt got 27 clicks, no sales |
| 7 | Templates, workflows, prompt packs | 2–8 weeks | Low to medium | Weak: no verified first-person revenue; 2,000-workflow bundles sell for $29 |
| 8 | Paid community | Months | High | Weak without an audience |
| 9 | Paid Chrome extension, Telegram bot, paid MCP server | 1–6 months | Medium | Weak to negative: 57% of 112 tracked extensions earn nothing |
| 10 | Lifetime deal marketplace | 4–8 weeks | Medium | Negative trend |

Free-to-enter money and credits:

- **Hackathons:** lablab.build lists online AI hackathons; recent sponsor pools were $6,000–12,000. United Hacks V8 (8–10 January 2027, online, $25,000+) and Hack-Nation (30–31 January 2027) are upcoming. Dates are from aggregators; check each page.
- **Bounties:** Algora pays on merged GitHub issues.
- **Credits:** AWS Activate gives about $1,000 self-serve, usable on Bedrock.
- **Railway templates:** creators earn up to 25% of revenue from deployments of their template; thirty have earned over $1,000.

## 5. Free traffic: marketplaces and platforms

### Pays the maker

| Platform | Listing | Share kept by platform | India payout | Evidence of results |
|---|---|---|---|---|
| Apify Store | Free | 20%, plus usage cost deducted | PayPal or Wise from $20; India not named, unconfirmed | One maker: 98 Actors, 2,500 users in 6 months; first run took a week |
| Poe | Free | Per-message pricing set by maker | India listed as eligible | No first-person earnings found |
| Shopify App Store | $19 once | 0% to $1M, then 15% | Unconfirmed | Terms only |
| Atlassian Marketplace | Free | 0% to $1M for Forge apps | Unconfirmed | Terms only |
| Railway templates | Free | Maker gets up to 25% | Stripe Connect, $100 minimum | Two creators above $100,000 |
| GitHub Sponsors | Free | 0% from individuals, up to 6% from organisations | Supported since 2022 | Median maintainer income is near zero |
| Gumroad | Free | 10% + $0.50; 30% on Discover sales | Rupee bank payout listed | Modest built-in traffic |

### Free installs, no payment

| Platform | What fits | How ranking works |
|---|---|---|
| Official MCP registry | MCP servers | One publish spreads to Glama and other directories |
| GitHub MCP Registry | MCP servers | Publish to the open registry, then email GitHub to request inclusion |
| Glama | MCP servers | Imports the registry; health-checks each server |
| MCP Market | MCP servers | Free queue of 4–6 weeks |
| skills.sh | Agent skills | Ranked by install count; no review |
| Own Claude plugin marketplace | Plugins and skills | A file in a git repo; no submission |
| Open VSX | Editor extensions | Registry behind Cursor and Windsurf; 300M+ downloads a month |
| n8n template library | Workflows | Reviewed; most templates since mid-2025 show no views |
| Hugging Face Spaces | Demos and models | No creator payout |

### Ruled out for an India-based maker with $0

| Platform | Reason |
|---|---|
| Discord premium apps | Payouts only for US, UK and EU |
| Notion Marketplace direct sales | India is not an eligible seller country |
| AWS Marketplace | Indian sellers can sell only to buyers in India |
| There's An AI For That, Futurepedia, Toolify | $49, $497 and about $99 to list |
| "Hire an agent" marketplaces | About $127 in verified lifetime payouts across six platforms |
| ChatGPT apps directory for revenue | Selling inside the app is not allowed; adoption reported as sluggish |
| Telegram Stars | No built-in discovery; one maker had 28 users and $0.04 after 11 days |

Apify listing tactics, from Apify's own guidance:

- Pick niches with search demand and few competing Actors.
- Open the README with the use case and the search terms buyers type.
- Use pay-per-event pricing set above run cost; it beat compute pricing in 10 of 11 comparisons.
- Keep the success rate high, update often, answer issues fast. A daily automated test must pass.

## 6. GitHub as a distribution engine

What to expect:

- A clean launch by an unknown maker ends day 30 at 50–300 stars. Over 1,000 needs a Hacker News or Reddit hit.
- Stars rarely become money without a paid path at launch. Postiz had 15,000 stars and $2,000 monthly revenue after four months, roughly 0.5% of stars paying.
- Aider (46,000+ stars) and OpenClaw (145,000+) had no revenue model found.
- Tailwind's revenue fell about 80% while usage hit a record, because AI tools answer without sending people to the site. Being used by AI does not bring visitors.

What the evidence supports:

| Factor | Evidence |
|---|---|
| Hacker News score, existing stars, posting at 12–17 UTC | Strongest predictors in a study of 138 AI repo launches |
| Tagged releases and outside contributors | Associated with more real stars the next month |
| Install and usage sections, code snippet, image, contribution guide | Correlated with more stars |
| "Show HN" label | No significant advantage |
| Demo GIFs, one-line installs, comparison tables | No study found |
| Topic tags | Minimal effect |
| A Trending threshold | None reliable |

Lists and curators that accept free submissions:

| Outlet | Size | Route | Rule |
|---|---|---|---|
| awesome-mcp-servers | About 86,000 stars | Pull request, one line, alphabetical | Agent-written requests go through a labelled lane |
| awesome-claude-code | About 54,000 stars | Web form, by a human | Repo must be 14 days old or have 100 stars; may now be closed to the public |
| Console.dev | Newsletter | Email | Developer tool, self-serve, pre-1.0 or beta |
| Changelog News | Newsletter | Signed-in form | Needs a newsworthiness pitch; no commercial products |
| LangChain integrations | Docs listing | Publish own package, then file a listing issue | Full guides need 50,000 monthly downloads |

Thirty-day launch sequence:

| Days | Action | Realistic result |
|---|---|---|
| 1–5 | README with install, usage, snippet and image; licence; tagged release; publish to npm or PyPI; add a Railway template | 0–10 stars |
| 4–7 | Publish to the MCP registry; package as a plugin with own marketplace repo | A few installs |
| 6–7 | Put the paid path in place: hosted tier or licence key, GitHub Sponsors profile | No revenue yet |
| 8 | Hacker News post on a weekday at 12–17 UTC; no signup wall; stay in the thread | Usually under 10 points and 5–30 stars; about one in ten gets 100–300 |
| 9–12 | One post in each of one to three fitting subreddits, following each one's rules | 10–100 stars per post that lands; removal if it reads as an advert |
| 10–14 | Email Console.dev; submit to Changelog News; write up the build on dev.to | Low acceptance odds |
| 15 | Submit to awesome-mcp-servers and awesome-claude-code | 1–5 stars a day afterwards |
| 16–22 | Second release answering feedback; reply to every issue | 10–50 stars |
| 23–30 | Monthly update post in the same communities; review stars, installs, signups, payers | 0–5 paying customers |

## 7. Tactics: what works, what is hype, what gets you banned

| Tactic | Verdict | Basis |
|---|---|---|
| List where buyers already search | Works | Three first-person Apify cases |
| Send a prospect a result produced on their own public data | Works, anecdotal | Pilot and outreach accounts |
| Useful public replies before any pitch | Works, anecdotal | One maker: 69 cold messages got no reply; first user came from one Reddit comment |
| Monthly update posts in the same community | Works | Postiz |
| Ship an MCP server, CLI and skill so agents can use the product | Plausible | Attributed to Postiz's 2026 growth, unconfirmed |
| "Made with" link on free output | Widely used | Gamma, Lovable; no conversion data |
| One-click deploy template that pays | Works for some | Railway figures |
| Card-required trial | Works | ChartMogul |
| Public build log | Works with an audience | Base44, Kleo |
| Launch within days of a new model or API | Worked in 2023 | No 2025–26 case found; one 2026 same-day launch got almost no traffic |
| Early listing on a new app store | Mostly hype so far | ChatGPT apps: 4,000+ listings, no rankings |
| Free tools as lead magnets | Weak | 22 tools got no signups until email-gated |
| Answer-engine citation | Small, high intent | 0.5% of Ahrefs' visitors, 12% of signups, on its own site |
| Product Hunt | Signups, rarely revenue | Solo makers reach the top 10 on 36% of days versus 74% for teams of five |

Gets accounts banned or backfires:

- Bought stars or star-exchange groups. They help for under two months, then reduce real star growth; flagged repos are deleted at up to 16 times the normal rate.
- Mass or agent-written pull requests to lists. GitHub's 2026 settings let maintainers block them.
- Asking for Hacker News upvotes.
- The same link across several subreddits from a new account.
- Scraping LinkedIn through an extension. Kleo received a cease-and-desist and lost its extension.
- Automated replies on X, or agents that email third parties uninvited.

## 8. Pricing

What buyers call fair (G2, 1,019 business buyers, July 2026):

| Model | Share |
|---|---|
| Pay-as-you-go | 57% |
| Fixed fee | 21% |
| Per outcome | 19% |
| Per seat | 9% |

- Buyers want a usage dashboard, a monthly spend cap and a cost-per-outcome report before accepting variable pricing.
- Outcome-based pricing is discussed far more than used: 3.8% of 80 agent companies.
- Flat fees are common under $5M revenue, and simplest for a solo maker.

Observed solo-maker prices:

| Product | Price |
|---|---|
| One-time licence, bring-your-own-key (TypingMind) | $39 |
| Paid MCP servers | $19–149 a month |
| Productised automation pilot | $2,000 one-off; later $1,500–2,500 a month |
| n8n templates | $29–299 |

Not losing money on a free tier:

- Set a global daily free budget and a per-account cap, enforced before the model call.
- Use a cheap model, bring-your-own-key, or prepaid credits for free users.
- On Apify, price above run cost; usage is deducted from the payout and can go negative.
- The top 10% of users drive over 70% of token use.

Taking payment from India: apply to a merchant of record on day 1, because approval takes time. A marketplace that bills for you avoids the problem.

## 9. Buyer objections

| Objection | Cheap answer |
|---|---|
| "Will it do something wrong?" | Approval before any irreversible action; start read-only; visible action log |
| "What will it cost me?" | Hard spend cap and a usage view |
| "What does it do with my data?" | One-page data-flow diagram; minimum permissions; bring-your-own-key |
| "It is just a wrapper" | Sell the outcome; show depth in one workflow |

Only 7% of buyers want fully autonomous agents; 48% want guardrails.

## 10. Fourteen days to a first dollar

For a maker with a working agent and no audience.

| Day | Action |
|---|---|
| 1 | Pick one buyer type and one measurable outcome. Apply to a merchant of record and set up PayPal. Check whether the core fits an Apify Actor. |
| 2 | Run the agent on five real public examples from target buyers. Save the outputs. Record a 60–90 second demo. |
| 3 | Publish one page: sample output, demo, fixed pilot price ($49–299, 7-day delivery, refund if the outcome is missed), data access and spend cap. |
| 4 | Find 30 people who posted about the problem in the last 30 days. Write 10 useful public replies with no link. |
| 5 | Package the core as a marketplace listing with pay-per-event pricing. Write the README around search terms. |
| 6 | Message those who engaged, attaching a result made on their own data. Aim for 10 real conversations. |
| 7 | Enter one open online hackathon with the same agent. Publish one build-log post with real results. |
| 8 | Deliver the first pilots by hand, fast. Log every failure. |
| 9 | Ask each pilot user for payment or an annual prepay. |
| 10 | Fix the top failure. Add an approval step and action log if the agent writes or sends anything. |
| 11 | Second outreach round of 20, using the first result as proof with permission. Add a "made with" link to shareable outputs. |
| 12 | Set a free allowance with a daily budget and per-account cap. |
| 13 | Publish the case result with real numbers where buyers read. Submit the hackathon entry. |
| 14 | Review conversations, pilots, payments and marketplace runs. Keep the one channel that produced money. Offer pilot customers a retainer or subscription. |

## 11. What this changes in our agent

New skills to add to the loop in `PLAN.md`:

| Skill | What it does |
|---|---|
| Route picker | Maps the product type to a marketplace and a first-dollar route using the tables in sections 2 and 5 |
| Proof builder | Runs the maker's agent on five public examples and assembles the sample-output page |
| Pilot offer writer | Drafts the fixed-price pilot with outcome, delivery time, refund and spend cap |
| Listing builder | Prepares the Apify, MCP registry, skills.sh and plugin listings |
| Repo launch checker | Checks the README, release, paid path and list rules before launch day |
| Payout checker | Flags platforms that cannot pay the maker's country |
| Free-tier guard | Calculates run cost and sets the daily budget and per-account cap |

## Key sources

Marketplaces:

- https://docs.apify.com/platform/actors/publishing/monetize
- https://blog.apify.com/building-98-actors-on-apify-store/
- https://dev.to/agenthustler/my-ai-agent-finally-made-money-it-took-200-runs-and-41-days-36jk
- https://poe.com/pages/earnings-tos
- https://docs.n8n.io/contribute/create-templates
- https://code.claude.com/docs/en/plugins/publish
- https://skills.sh/about
- https://www.apideck.com/blog/mcp-server-directories
- https://docs.discord.com/developers/monetization/enabling-monetization
- https://www.notion.com/help/selling-on-marketplace
- https://docs.aws.amazon.com/marketplace/latest/userguide/india-seller-faq.html
- https://blog.railway.com/p/1M-paid-to-developers-who-built-railway-templates

GitHub:

- https://arxiv.org/html/2511.04453v1 (Hacker News launches of AI repos)
- https://arxiv.org/abs/2412.13459 (fake stars)
- https://docs.github.com/en/site-policy/acceptable-use-policies/github-acceptable-use-policies
- https://github.blog/ai-and-ml/generative-ai/how-to-find-install-and-manage-mcp-servers-with-the-github-mcp-registry/
- https://raw.githubusercontent.com/punkpeye/awesome-mcp-servers/main/CONTRIBUTING.md
- https://dev.to/nevodavid/you-can-get-your-financial-freedom-with-open-source-in-2025-41i8 (Postiz)
- https://docs.github.com/en/sponsors/getting-started-with-github-sponsors/about-github-sponsors

Funnel and pricing:

- https://chartmogul.com/reports/saas-conversion-report/
- https://www.revenuecat.com/blog/growth/ai-app-retention-study
- https://saastr.com/g2s-2026-ai-agents-report-only-9-of-buyers-think-seat-pricing-is-fair-57-want-usage-based-and-74-will-shop-you-at-renewal
- https://www.withorb.com/blog/2026-state-of-ai-agent-pricing-models-trends-and-whats-working
- https://ahrefs.com/blog/ai-chatbot-traffic/
- https://stripe.com/customers/chatbase
- https://verygoodproductizedguides.substack.com/p/should-you-start-a-productized-ai
- https://lablab.build/ai-hackathons
