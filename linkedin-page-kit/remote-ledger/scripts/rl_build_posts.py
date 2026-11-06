"""Remote Ledger: write upload-kit/POSTS/POST-NN-slug/ folders (media, caption, first comment, how-to)."""
import os, shutil, sys
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.join(HERE, "..")
ADMIN = "linkedin.com/company/remoteledger/admin"
HOW = {
 "image": f"""HOW TO POST (image post)
1. Open {ADMIN} (logged in as the admin). Click "Start a post". The small avatar at the top of the box must show the page, not your name.
2. Click the photo icon, upload image.png (portrait). image-square.png is the square alternative.
3. Paste caption.txt into the text box. Keep the line breaks. Where it says @Tag, type @ and pick the company page.
4. Click Post.
5. Open the post, click Comment, paste first-comment.txt, post it. Click the three dots on your comment → Pin.
6. 90 minutes: reply to every comment within 15 minutes, 15+ words, end with a question back.""",
 "document": f"""HOW TO POST (carousel / document post)
1. Open {ADMIN}, "Start a post" as the page.
2. Click the "+" icon → "Add a document". Upload carousel.pdf. Title: the line given at the bottom of this file.
3. Paste caption.txt. Click Post.
4. Comment with first-comment.txt and pin it. Reply for 90 minutes.""",
 "poll": f"""HOW TO POST (poll)
1. Open {ADMIN}, "Start a post" as the page.
2. Click the "+" icon → "Create a poll". Question and four options are at the top of caption.txt. Duration: 3 days.
3. Paste the context text (below the options in caption.txt) into the main text box. Click Post.
4. Comment with first-comment.txt, attach image.png to that comment (the card), and pin it.""",
}
W = "assets/posts/week1"
POSTS = [
 dict(slug="tracker-week-of-9-nov", when="Mon 9 Nov · 8:30 am IST", pillar="Tracker", kind="image",
  images=[f"{W}/01-tracker.png", f"{W}/01-tracker-square.png"], tags="@Turing  @ElevenLabs  @Together AI",
  caption="""10 remote roles open to India this week. We read the posting, not the label.

Most "remote" jobs on the big boards are remote for Americans. So every Monday we go through the company's own careers page, or the founder's own post, and keep only the ones that say India, worldwide or anywhere in their own words.

This week: Together AI and Turing hiring remote in India. OpenAI's Bangalore roles that are marked remote. ElevenLabs building an India team. Askable paying $1,000 per task to engineers who can write coding tasks from a codebase they know. A Dutch analytics company paying €5,000 a month for a 32-hour week, any time zone. A $23 to $34 an hour technical PM role at a 160-person AI SEO company, EST hours.

Pay is on the card only where the posting states it. If the company didn't say, we didn't guess.

All 34 we found, with links, are in the first comment. Postings close without notice, so open the link before you spend an evening on the application.

Which of these would you actually apply to, and what's stopping you?

#RemoteJobs
#RemoteWork
#India
#AIJobs
#WorkFromHome
#Hiring
#RemoteLedger""",
  first_comment="""Full list, 34 roles, checked 6 Nov: [paste your Notion tracker link]

Where this week's came from: company careers pages on Greenhouse and Ashby (Together AI, Turing, OpenAI, ElevenLabs, Cognition, Labelbox, Lovable), Remotive (Askable, Fluence International) and the November "Who is hiring" thread on Hacker News (Evaboot, Simple Analytics, Search Atlas, Oscilar, Proofline, MixRank, Railway, Tether, Matcha.fm, DigitalTolk, SerpApi, StudyTurtle).

Know one we missed that is open to India? Drop the link here and we'll check it for next Monday."""),
 dict(slug="pay-card-alignerr", when="Tue 10 Nov · 8:30 pm IST", pillar="Pay card", kind="image",
  images=[f"{W}/02-pay-alignerr.png", f"{W}/02-pay-alignerr-square.png"], tags="",
  caption="""Alignerr's homepage says $80 an hour, average pay.

Scroll down the same page and there's a listing at $15 to $20 an hour. Healthcare call transcripts in Spanish, 2,500 of them, twenty minutes each, fully remote.

Both numbers are true. One is the average across every expert on the platform, oncologists and PhDs included. The other is what one project pays one person.

We're not saying Alignerr is lying. We're saying the number that gets you to apply is not the number you'll be paid. Same thing on Mercor: the homepage says $90 an hour average contracted rate, and the latest roles on that same homepage list a $400 one-off and a $60 to $70 sales expert gig.

So the question to ask before you give an evening to their assessment isn't "what does the platform pay". It's "what does this project pay, and how many hours a week does it actually have".

If one of these platforms has paid you, what did your real hourly come to, after the unpaid onboarding and the waiting?

#AITraining
#Alignerr
#Mercor
#Outlier
#RemoteWork
#Freelance
#India
#RemoteLedger""",
  first_comment="""Both numbers are on alignerr.com today; screenshots taken 6 Nov 2026 are attached here. Mercor's are from mercor.com and work.mercor.com/explore, same day.

We don't have Alignerr's or Mercor's India-specific rates. If you do, post the number and the project type and we'll print it next week with credit."""),
 dict(slug="fee-card-2000-invoice", when="Wed 11 Nov · 8:30 am IST", pillar="Getting paid", kind="image",
  images=[f"{W}/03-fee-2000.png", f"{W}/03-fee-2000-square.png"], tags="",
  caption="""A client in Austin pays your $2,000 invoice. How much reaches you depends on which link you sent them.

We put the same $2,000 through four rails using each company's own fee page, on 6 November.

Skydo: flat $19 plus GST on the fee, no markup on the exchange rate, FIRA in your inbox. You keep about $1,978.
Wise: mid-market rate, fee from 0.33% on their India page. About $1,993 on the quoted fee.
Payoneer: 1% to receive into a USD receiving account. About $1,980, before conversion when you withdraw.
PayPal: we couldn't open PayPal India's fee page, so we used Skydo's own calculator, which puts PayPal at 7.6% on this payment. About $1,848.

That's a $130 gap between the top and the bottom of the card. Twelve invoices a year and it's about ₹1.3 lakh. A laptop.

Which rail do you use, and has a client ever refused it?

#GettingPaid
#Freelance
#Skydo
#Wise
#Payoneer
#ExportOfServices
#India
#RemoteLedger""",
  first_comment="""Fee pages used, screenshots dated 6 Nov in our folder: skydo.com (fee table: $19 up to $2,000; $29 for $2,001 to $10,000; 0.3% above $10,000), wise.com/in/pricing, payoneer.com/pricing (their page says last updated 1 Jan 2026).

The PayPal figure comes from a competitor's calculator, so treat it as their claim. If you have a recent PayPal India receipt, post the percentage and we'll replace it with yours.

Nobody paid us to write this and there are no referral links in it."""),
 dict(slug="pitch-form-opens", when="Thu 12 Nov · 8:30 pm IST", pillar="Pitches", kind="image",
  images=[f"{W}/04-rules.png", f"{W}/04-rules-square.png"], tags="",
  caption="""From next Thursday, this page publishes pitches from people in India who want clients abroad. Free.

How it works. You fill a form: what you do in twelve words, who it's for, one proof link that opens, your price in dollars, how many hours you can overlap and with which time zone. We check five things. If it passes, you're on the Thursday card under your name or your company, and clients who've asked us for exactly that get it in their inbox.

The five checks. Your LinkedIn account is older than a year and has real history on it. One service for one kind of client, not everything for everyone. The proof link opens and shows the work. There's a price. You answer our test message within 24 hours.

We expect to reject seven in ten. That's the point. A client abroad reads this card because it's short and because somebody looked.

Nobody pays to pitch. Nobody pays to apply to a request. If anyone ever asks you for money to be listed here, it isn't us.

What do you sell, and who abroad should be buying it? One line, below. We'll tell you if it would pass.

#Freelance
#Consulting
#InternationalClients
#India
#RemoteWork
#RemoteLedger""",
  first_comment="""Pitch form (free): [paste your Tally pitch form link]
Clients abroad with something to get done: [paste your Tally request form link]

First pitches go up Thursday 19 November. Test messages go out the Tuesday before."""),
 dict(slug="not-a-desk-job", when="Fri 13 Nov · 1:30 pm IST", pillar="Not a desk job", kind="image",
  images=[f"{W}/05-not-a-desk-job.png", f"{W}/05-not-a-desk-job-square.png"], tags="",
  caption="""Not everyone wants a desk job. Four ways to be paid from home by people abroad, with the number taken from the page itself.

Preply. You set your own hourly rate. Preply's own tutor page says English tutors charge $15 to $25 an hour on average. Students in 180 countries, and Indian evenings line up with the Gulf and early Europe.

Askable. $1,000 per coding task that passes review, about ten hours a week, worldwide. You need to actually be an engineer; the task is built from a codebase you know.

Alignerr. "Content reviewer", listed at $40 to $120 an hour. Read Tuesday's post before you get excited; the same page has a $15 listing.

Lovable. Product experience specialist, which is a support role, full-time contractor, APAC hours. No rate on the posting, which tells you to ask before the interview, not after.

What we couldn't verify this week: Cambly's current rate, and anything solid on VA or bookkeeping work for foreign clients. If you do that work from India, what does it pay you? That's next Friday's card, with your numbers and your name if you want it.

#WorkFromHome
#OnlineTutoring
#Preply
#Freelance
#India
#SideIncome
#RemoteLedger""",
  first_comment="""Pages used: preply.com/en/teach (rate line), the Askable listing on Remotive, alignerr.com, Lovable's posting on Ashby. All checked 6 Nov.

Preply takes a commission that starts high and falls as you teach more hours; check the current percentages on their help pages before you set a rate. We'll print them once we've seen them ourselves."""),
 dict(slug="paperwork-first-invoice", when="Sat 14 Nov · 10:30 am IST", pillar="Paperwork", kind="document",
  images=[f"{W}/06-paperwork-carousel/carousel.pdf"], tags="", doc_title="Your first international invoice, in six pieces of paper",
  caption="""The client said yes. Now the part nobody teaches.

Six pieces of paper stand between you and being paid properly by a client abroad: the one-page contract, the invoice with the lines an Indian invoice usually misses, the purpose code your bank will ask for, the FIRA that proves where the money came from, the LUT that keeps your exports GST-free, and the presumptive tax scheme that lets you declare half and skip the books.

All six are on the eight slides. Save it for the week your first client abroad says yes. Then show it to a CA, because rules move and we're a page, not your accountant.

Which of the six did you learn the hard way?

#Freelance
#Invoice
#GST
#LUT
#FIRA
#IncomeTax
#ExportOfServices
#India
#RemoteLedger""",
  first_comment="""The one-page contract template, free: [paste the link to the Google Doc or Notion page you make from 04-templates/contract-one-page.md]

Purpose codes are from the RBI list. The GST and income-tax points are as we understand them in November 2026 under the renumbered Income-tax Act 2025; confirm with a CA before you rely on them."""),
 dict(slug="poll-ai-training-platforms", when="Sun 15 Nov · 11:00 am IST", pillar="Poll", kind="poll",
  images=[f"{W}/07-poll.png", f"{W}/07-poll-square.png"], tags="",
  caption="""POLL QUESTION: You applied to an AI training platform this year. Then what?
OPTION 1: Got work. Paid what the page said.
OPTION 2: Got work. Paid less than the page said.
OPTION 3: Waitlisted or onboarded, then silence.
OPTION 4: Never applied.
DURATION: 3 days

CONTEXT TEXT (paste into the main box):
Outlier says 900,000 experts. Alignerr says 100,000. Mercor says 720,000 roles created. Someone we know applied to all three in one weekend and heard back from none of them.

Tell us what actually happened to you. We'll print the split next Sunday, platform by platform, from the comments.

If you did get paid, what was the real hourly after the unpaid onboarding and the waiting?

#AITraining
#Outlier
#Alignerr
#Mercor
#RemoteWork
#India
#RemoteLedger""",
  first_comment="""Name the platform in your comment so we can split the results by platform next Sunday. Payout screenshots are welcome; blur the personal bits."""),
]

def write_post(p, i, outdir):
    d = os.path.join(outdir, f"POST-{i:02d}-{p['slug']}"); os.makedirs(d)
    for src in p["images"]:
        s = os.path.join(ROOT, src)
        if not os.path.exists(s): print("MISSING", src); continue
        ext = os.path.splitext(src)[1]
        name = {".pdf": "carousel.pdf", ".mp4": "video.mp4"}.get(ext, "image-square.png" if "square" in src else "image.png")
        shutil.copy(s, os.path.join(d, name))
    with open(os.path.join(d, "caption.txt"), "w") as f:
        if p["tags"]: f.write(f"TAG IN THE POST (type @ and pick): {p['tags']}\n\n")
        f.write(p["caption"] + "\n")
    with open(os.path.join(d, "first-comment.txt"), "w") as f: f.write(p["first_comment"] + "\n")
    with open(os.path.join(d, "how-to-post.txt"), "w") as f:
        f.write(f"POST {i:02d} · {p['when']} · {p['pillar']}\n\n{HOW[p['kind']]}\n")
        if p.get("doc_title"): f.write(f"\nDocument title to type when uploading the PDF: {p['doc_title']}\n")
        f.write("\nBefore posting: replace every [bracket] in caption.txt and first-comment.txt. Never post a bracket.\n")
    return f"| {i:02d} | {p['when']} | {p['pillar']} | POST-{i:02d}-{p['slug']} |"

def main():
    out = os.path.join(ROOT, "upload-kit", "POSTS")
    if os.path.exists(out): shutil.rmtree(out)
    os.makedirs(out)
    rows = ["# Remote Ledger · posts in order\n", "| # | When (IST) | Format | Folder |", "|---|---|---|---|"]
    for i, p in enumerate(POSTS, 1): rows.append(write_post(p, i, out))
    rows += ["", "Each folder: image.png (and image-square.png) or carousel.pdf, caption.txt, first-comment.txt, how-to-post.txt.", "Replace every [bracket] before posting. Links go in the first comment only, never in the post text."]
    open(os.path.join(out, "00-POSTING-ORDER.md"), "w").write("\n".join(rows) + "\n")
    print("wrote", len(POSTS), "posts to", out)

if __name__ == "__main__": main()
