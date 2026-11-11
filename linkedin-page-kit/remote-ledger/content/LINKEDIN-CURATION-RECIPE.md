# Finding posts on LinkedIn worth reposting · the recipe

This is the part of Remote Ledger that only a person inside the LinkedIn app can do. Ten minutes a day. Nothing automated, ever: scraping LinkedIn breaks their terms and gets the page removed.

## Why repost at all
A found post does two things a card cannot. It brings a real person with a face and a name, which is what carried reach on Founder Signal. And when the page reposts with its own thoughts, the original author is notified and usually replies, which puts the post in front of their network as well as ours. Reposts of a stranger's post generally get less reach than an original post, so the format below wraps the found post in our own card and our own take, and links the original in the comment.

## The daily search (10 minutes)
In the LinkedIn search bar, type the string, press Enter, click **Posts**, then **Date posted → Past week** (Past 24 hours on Mondays), **Sort by → Latest**. Boolean works: quotes for exact phrases, AND, OR, NOT, brackets.

**Requests from clients abroad (for Wednesdays)**
- `"looking for" AND ("n8n" OR "Make.com" OR "automation") AND ("freelancer" OR "contractor" OR "agency")`
- `"looking for a fractional" OR "hiring a fractional"`
- `"recommend a" AND ("developer" OR "designer" OR "virtual assistant") AND ("India" OR "offshore" OR "remote")`
- `"anyone know a good" AND ("agency" OR "freelancer")`
- `"need help with" AND ("voice agent" OR "RAG" OR "chatbot") AND "budget"`
Filter: author is a founder, operator or hiring manager outside India; the ask has a budget or a scope; posted within 7 days; no reply yet saying "filled".

**Payout and first-client stories (for Sundays and the Tuesday pay card)**
- `("Mercor" OR "Outlier" OR "Alignerr" OR "Turing") AND ("payout" OR "paid me" OR "per hour" OR "hourly")`
- `"first international client" OR "first client from the US" OR "first dollar"`
- `("Skydo" OR "Payoneer" OR "Wise") AND ("FIRA" OR "freelancer" OR "invoice")`
- `"LUT" AND ("freelancer" OR "export of services")`
- `"Upwork" AND "India" AND ("earned" OR "month")`
Filter: a number or a screenshot in the post; the author's profile has a face and real, dated history; they are not selling a course, a cohort or "DM for the method".

**Roles open to India (Monday backup)**
- `"we're hiring" AND "remote" AND ("worldwide" OR "anywhere" OR "India")`
- `"open to candidates in India" OR "remote (India)" OR "remote - India"`
- `#remotejobs AND India`
Filter: the post or the link it points to says India or worldwide in its own words.

**Fractional and consulting (Thursday context, client council)**
- `"fractional CMO" AND ("India" OR "Bangalore" OR "Mumbai")`, same for CFO, CTO, COO
- `"what I buy from India" OR "our team in India" AND ("agency" OR "contractor")`
- `"outsourced to India" AND ("worked" OR "lesson")` (founders abroad telling the story; these are the client-council invitations)

**Not a desk job (Friday)**
- `("Preply" OR "Cambly" OR "italki") AND ("India" OR "₹" OR "per hour")`
- `"virtual assistant" AND ("US client" OR "UK client") AND India`
- `"bookkeeper" AND ("QuickBooks" OR "Xero") AND "India" AND ("client" OR "US")`

## Validate before anything is reposted (five checks, two minutes)
1. **Real person.** A face, a name, real roles with dates, a face, activity beyond this one post. No profile → no repost.
2. **A fact in it.** A number, a screenshot, a link, a named company. A feeling is not a fact.
3. **Fresh.** Posted in the last 7 days. For a request, no comment saying it is filled.
4. **Not selling.** No course, no cohort, no "DM me for the system", no fee to apply. These are the scams the page exists to filter, and we never give them reach.
5. **Open to India** when it is a role or a request: the post's own words, or the link's.

If all five pass, screenshot the post (the whole post, author name visible) and copy the URL (three dots → Copy link to post). Send both to me, or build the card yourself (below).

## Two ways to run it
**A · Repost with thoughts (fastest, 2 minutes).** On the post: Repost → Repost with your thoughts. Check the avatar at the top shows the page. Write three to six lines: what the number is, what it means for someone in India, one question back. Post. The author is notified; reply to them within the hour.

**B · Quote card (more reach, 10 minutes).** Send me the screenshot and link. I return a folder: a card quoting the post with the author's name, title and the fact, our caption with the take and the question, and a first comment with the link to the original and the credit line. You post the card, tag the author in the post text (type @ and pick them; tagging is allowed, links are not), link in the comment. Spec template: `content/cards/repost-template.json`, renderer: `scripts/rl_cards.py` type `repost`.

## Credit, permission, takedown
- Always: author's name, their headline as written, "via LinkedIn, [date]", link to the original in the first comment.
- Payout stories and anything personal: comment on their post first ("We'd like to quote this on Remote Ledger with your name and a link. OK?"). Wait for the yes. It takes a day; the yes is also their first comment on our post.
- Requests from clients: anonymise unless the poster is a company page. Country, industry, size, need, budget band, timeline. Link only if it is a company posting publicly.
- If anyone asks for their post to come down, it comes down the same day, with a reply saying so.

## Quota
Weeks 1 to 2: two reposts a week (Wednesday request, Sunday story) on top of the cards. From week 3: as many as pass the checks, never more than one a day, never within three hours of another post.

## What to send me
The post link and a screenshot, plus one line: which lane it is for. I return the card, caption, first comment and clicks the same day.
