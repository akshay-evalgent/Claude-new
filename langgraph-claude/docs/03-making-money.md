# 3. Making money building LangGraph + Claude agents

The honest version: companies don't pay for "LangGraph" or "agents". They pay to make a costly, annoying process cheaper, faster or more reliable. The technology is how you deliver it. Lead every conversation with their number (hours, headcount, response time), never with the framework.

## Five ways to earn, from fastest to most scalable

| Offer | What you deliver | Typical shape | Starting price range* |
|---|---|---|---|
| **1. AI opportunity audit** | 1-2 weeks: interview the team, map 3-5 processes, score them (see `02-use-cases.md`), recommend one with an ROI estimate and a build plan | Fixed fee, paid up front | $1,500 - $5,000 |
| **2. Pilot / proof of concept** | One workflow, working on their real data, in shadow mode, with a measured result | Fixed fee, 3-4 weeks | $5,000 - $15,000 |
| **3. Production build** | Pilot hardened: integrations, approvals, persistence, monitoring, evals, handover docs | Fixed fee per milestone | $15,000 - $60,000+ |
| **4. Care plan / retainer** | Monitoring, monthly eval runs, prompt and model updates, new categories, small features | Monthly | $1,500 - $6,000 / month |
| **5. Productised agent** | The same agent sold to many companies in one niche (for example "AI front desk for dental clinics") | Subscription per location or seat, plus setup | $300 - $2,000 / month each |

*These are starting points for a solo builder or small studio selling to small and mid-sized companies. Adjust for your market, region and track record. Raise prices after every 2-3 successful projects.

**The usual ladder:** audit, then pilot, then build, then retainer. The audit fee filters out tyre-kickers, and most audits turn into a pilot because you've already shown them the money. Productising (5) comes after you've built the same thing 2-3 times for one industry.

## Pricing on value, not hours

Work out what the problem costs them, then price at a fraction of the first year's savings.

```
gross savings = hours saved per month x loaded hourly cost
net savings   = gross savings - running costs (Claude API + your care plan)
your price    ~ 10% - 30% of first-year gross savings  (lower for unproven, higher with case studies)
payback       = build price / net monthly savings   (aim for under 6 months)
```

**Worked example (the furniture store from `02-use-cases.md`):**

- 6,000 tickets/month, 40% are "where is my order" = 2,400 tickets
- 6 minutes each = 240 hours/month
- Loaded cost $30/hour = $7,200/month
- Agent fully resolves 70% of those = **$5,040/month gross savings (~$60k/year)**, plus instant replies
- Running costs: Claude API ~$600/month (all 6,000 tickets triaged at ~$0.10, see below) + care plan $1,500/month = $2,100/month
- **Net savings ~$2,940/month (~$35k/year)**
- Price: $12,000 pilot-to-production build
- Payback: about 4 months. That's an easy yes.

Always include running costs in the payback. A big retainer on a small saving makes the deal look bad the moment the client's finance team does the maths. Put this calculation in the proposal. It changes the conversation from "is $12k expensive?" to "is $35k a year, every year, worth $12k once?"

## What Claude costs to run (put this in every proposal)

Clients will ask. Estimate per run from tokens, then confirm by logging `response.usage` in the pilot.

Prices per million tokens (input / output). These are first-party Claude API rates as of late 2026, so always check the current pricing page before quoting:

| Model | Input | Output | Good for |
|---|---|---|---|
| Claude Opus 5.5 (`claude-opus-5-5`) | $4.00 | $20.00 | Default: hard reasoning, agent loops, writing |
| Claude Sonnet 5.5 (`claude-sonnet-5-5`) | $2.00 | $10.00 | High-volume production steps |
| Claude Haiku 5.5 (`claude-haiku-5-5`) | $0.10 | $0.50 | Simple classification and routing at scale |

**Example: one support ticket through the triage graph** = 3 calls, about 4,000 input and 800 output tokens each (12,000 in / 2,400 out). Thinking tokens bill as output, so measure; don't guess.

| Model | Cost per ticket | 10,000 tickets/month |
|---|---|---|
| Opus 5.5 | ~$0.096 | ~$960 |
| Sonnet 5.5 | ~$0.048 | ~$480 |
| Haiku 5.5 | ~$0.0024 | ~$24 |

Compare that with the $7,200/month of staff time in the example above. Levers to cut it further once quality is proven:
- **Effort per node:** `effort="low"` for classification and `"medium"` or `"high"` only where reasoning matters. `common.py` makes this one argument.
- **Model per node:** keep Opus where quality matters and test a cheaper model on simple steps. Only switch after your eval set shows quality holds.
- **Prompt caching:** long, stable system prompts get cached and re-read at a fraction of the price.
- **Batch API:** for overnight bulk work (for example re-scoring 5,000 leads), about half price.

**Who pays the API bill?** Recommended: the client creates their own Anthropic account and API key, and you build on it. They own their data and their bill, and you carry no usage risk. The alternative is that you pay and re-bill usage with a margin. Only do that with a usage cap in the contract.

## Finding your first clients

1. **Pick a niche: one industry and one workflow.** "AI agents for businesses" is invisible. "I cut 'where's my order' tickets by 70% for Shopify stores" gets replies. Niching also means you reuse 80% of your code on the next client.
2. **Build the demo before the pitch.** Adapt one example in this repo to the niche, using fake but realistic data. Record a 2-minute screen video: the ticket comes in, Claude classifies it, looks up the order, the refund waits for approval, the reply goes out.
3. **Publish the build.** Post a teardown: before (manual process, hours) versus after (graph diagram, video, cost per run). Your LinkedIn page is a ready channel; "what this would cost with a big vendor versus what we built it for" fits a lean-stack audience. `python examples/01_reflection_loop.py --diagram` gives you a diagram to show.
4. **Use your own agent to prospect.** `04_lead_research_parallel.py` with `--web` researches companies in your niche and writes the openers. Telling prospects "an agent like the one I'd build for you found you" is itself a demo.
5. **Partner with people who already have the clients:** web and software agencies, fractional CTOs, bookkeeping and IT firms. They have customers asking about AI and no one to build it. Offer a referral fee or white-label delivery.
6. **Marketplaces for first case studies:** freelance platforms have steady "AI automation" and "AI agent" briefs. Take 1-2 smaller jobs for testimonials, then move up to direct clients.

## The discovery call: questions that find the money

- Walk me through what happens from the moment X arrives until it's done. Who touches it?
- How many of these a week? How long does each take?
- What happens when it's done wrong or late? Has that cost you a customer or a fine?
- What systems hold the data? Do they have an API? Who can give access?
- If this were fully solved, what would you do with those hours?
- Who else has to say yes to this? Is there a budget for it this quarter?
- Can you send me 30 real examples, with what the right outcome was?

If they can't answer the volume and time questions, offer the audit, not a build.

## Proposal / statement of work skeleton

1. **The problem in their numbers:** volume, time, cost, current pain
2. **What we'll build:** one paragraph and the graph diagram
3. **Scope:** in scope, and explicitly *out of scope*
4. **Success criteria:** for example "on 100 held-out past tickets, correct category ≥ 95% and correct order status ≥ 98%; every refund goes through approval"
5. **Timeline:** discovery, build, shadow mode, go-live (see below)
6. **Price and payment terms:** 50% up front for pilots is normal
7. **Running costs:** API estimate per month from the table above, paid on their account
8. **Assumptions:** access to systems and examples by day X; a named person to approve outputs
9. **Data and security:** where data is processed and stored, what gets logged, retention, who has access
10. **Ownership:** who owns the code and prompts (usually the client after final payment; you keep the right to reuse general, non-confidential components)
11. **Support:** what the care plan covers, response times

## Delivery plan for a 4-week pilot

| Week | What happens | Deliverable |
|---|---|---|
| 1 | Process mapping, access to systems, collect 50-100 real examples with correct outcomes | Graph diagram, eval set |
| 2 | Build v1 graph: nodes, tools, routing, approval step | Working demo on their data |
| 3 | Run the eval set, fix failures, add integrations and logging | Eval report (pass rates per category) |
| 4 | Shadow mode: the agent drafts, humans act; measure agreement; go/no-go | Results report, recommendation for the production build |

The eval report is what gets you the production build. "It matched your team on 96 of 100 past tickets, here are the 4 misses and the fix" is how trust is earned.

## Risks to manage (and write into the contract)

- **Accuracy:** never promise 100%. Promise a measured pass rate on an agreed test set, plus human approval on risky actions.
- **Prompt injection:** emails, tickets and web pages can contain instructions. Treat them as data, give agents only the tools they need, and put approvals before anything irreversible.
- **Privacy:** personal or health data needs a data processing agreement and a check of where data flows. Health data in the US needs a BAA. Don't log more than you need.
- **Regulated decisions** (hiring, credit, insurance, medical): Claude assists, a human decides, everything is logged. Bring in the client's legal team early.
- **Scope creep:** "can it also..." becomes a change request with a price, or a care-plan item.

## Your 30 / 60 / 90 days

- **Days 1-30, learn:** run all five examples offline (tests), then live with an API key. Do the exercises in the main README. Rebuild example 03 from memory.
- **Days 31-60, specialise:** pick a niche. Build one convincing demo on realistic fake data. Publish 3-4 build posts. Have 10 discovery conversations.
- **Days 61-90, sell:** close 1-2 audits or pilots at an introductory price in exchange for a case study and testimonial. Deliver using the 4-week plan. Turn each into a care plan.

After 2-3 projects in the same niche, you have reusable code, case studies and the numbers to raise prices or productise.
