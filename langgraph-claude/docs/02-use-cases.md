# 2. Use cases companies will pay for

How to read this list: every use case is a **business process** with a cost the client can already measure (hours, headcount, response time, missed revenue). If you can't name the number, it isn't a project yet.

The "graph shape" column points to the example in this repo that already has the skeleton.

## The shortlist (start with one of these)

| # | Use case | Who buys | Graph shape | The number that sells it |
|---|---|---|---|---|
| 1 | **Support triage and resolution**: classify, answer routine tickets, escalate the rest, approval for refunds | E-commerce, SaaS, subscription businesses | `03` routing + approval | % of tickets handled without a human; first-response time |
| 2 | **Document extraction with validation**: invoices, bills of lading, claims, onboarding forms into a system of record | Logistics, accounting firms, insurance brokers, lenders | `01` loop (extract, validate, retry) + `03` human review for low confidence | Data-entry hours per month; error rate |
| 3 | **Lead research and qualification**: enrich, score against the ideal customer, write a personalised opener | B2B SaaS, agencies, recruiting firms | `04` parallel fan-out | Hours of SDR research saved; reply rate |
| 4 | **Inbox triage and reply drafting**: sort inbound email, draft replies, a human clicks send | Real estate, law firms, agencies, property managers | `03` classify + draft + approval | Hours per week in the inbox; response time |
| 5 | **Internal knowledge assistant**: answers from SOPs, policies and docs, with citations | Any company with 50+ staff, franchises, clinics | Retrieve, answer, check it's grounded, retry (`01` loop) | Questions to managers or HR per week; onboarding time |
| 6 | **Content production pipeline**: brief, research, draft, brand-voice check, approval | Marketing agencies, e-commerce catalogues | `01` reflection + `03` approval | Cost per article or product page; turnaround time |

## More use cases by department

**Finance and back office**
- Accounts-payable invoice to purchase order matching, flagging mismatches for review
- Expense report audit against policy
- Month-end variance commentary drafted from the numbers
- Collections emails that adapt to each customer's history (approval before sending)

**Sales and revenue**
- CRM hygiene: dedupe, enrich, fill missing fields from emails and calls
- Call-note summaries pushed to CRM with next steps
- RFP and security-questionnaire answering from past responses (human signs off)
- Quote generation from an emailed request (logistics, manufacturing, print)

**Operations**
- Order exception handling: delayed, damaged, wrong address
- Supplier email monitoring: extract delivery dates, update the ERP, alert on slips
- Scheduling and booking assistants (clinics, salons, field services)

**People and HR**
- Policy Q&A for employees
- Interview scheduling and candidate communication
- Resume screening *assistance*. Be careful: hiring decisions are regulated in many places (for example, the EU AI Act treats employment uses as high-risk). Keep a human making the decision, log everything, and get the client's legal team involved.

**Legal and compliance**
- Contract clause extraction and comparison against the company's standard positions
- First-pass redlines with a lawyer approving every change
- Regulatory change monitoring: summarise new rules and flag affected policies

**Data and analytics**
- "Ask the database" agent: question to SQL to result to chart to explanation, on a **read-only** user, with query review
- Weekly KPI narrative reports

**Industry-specific (good niches to specialise in)**
- **Dental and medical clinics:** intake, appointment requests, insurance paperwork. Health data needs a BAA or the local equivalent and a privacy review.
- **Logistics and freight:** quote requests, bills of lading, shipment exceptions
- **Real estate:** lead response, listing descriptions, tenant requests
- **Accounting firms:** client document collection, categorisation, query emails
- **Recruiting agencies:** candidate sourcing notes, outreach, interview coordination

## How to spot a good first project

Score each candidate 1 to 5 on each question and pick the highest total:

1. **Volume:** does it happen 100+ times a month?
2. **Pain:** does someone senior complain about it?
3. **Measurable:** can you count hours, errors or response time today?
4. **Data access:** can you get 50 real past examples and API access to the systems involved?
5. **Safe failure:** if Claude gets one wrong, does a human catch it before it costs money? (Use `interrupt()` to make this true.)
6. **Text-shaped:** is the work mostly reading, writing, sorting and deciding over text or documents?

Avoid as first projects: anything that sends money or messages with no human checkpoint, anything with no historical examples to test against, and "transform the whole company" scopes.

## Turning a use case into a graph: a worked example

**Client:** an online furniture store. 6 support agents, about 6,000 tickets a month. About 40% are "where is my order".

1. **Map the current process** with the person who does it today. Draw it as boxes and arrows. That drawing *is* your graph.
2. **Mark the decision points**: refund or not, escalate or not, which department. Each one becomes a structured-output call to Claude (`ask_structured`) plus a conditional edge.
3. **Mark the risky actions**: refunds, sending emails, changing records. Each one gets an `interrupt()` approval step, at least at first.
4. **Mark the systems**: Shopify, the carrier API, the helpdesk. Each one becomes a tool (`02`) or a plain node.
5. **Collect 50 to 100 real past tickets** with what the right outcome was. That's your eval set (see `04-production.md`).
6. **Ship in shadow mode first**: the agent drafts, humans send. Measure agreement. Then automate the categories where it is reliably right.

That is exactly `examples/02_tool_agent.py` + `examples/03_support_triage_hitl.py` + `examples/05_serve_api.py`, pointed at real systems.
