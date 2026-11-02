"""Week-one warm-up cards: tool picks, question, debate, flow, list, stat."""
import os, sys, json
sys.path.insert(0, os.path.dirname(__file__))
from PIL import Image, ImageDraw
from themes import THEMES, ACTIVE
from make_leanstack_pack import card_frame, block, tl, question_card
from carousel2 import render_single
T = THEMES[ACTIVE]; O = os.path.join(os.path.dirname(__file__), "..", "assets", "week1"); os.makedirs(O, exist_ok=True)
stack = {t["name"]: t for t in json.load(open(os.path.join(os.path.dirname(__file__), "..", "data", "startup-stack.json")))["tools"]}

def pick_card(name, job, good_for, not_for, start, out):
    t = stack[name]; im, d = card_frame(T)
    d.text((96,150), "TOOL WORTH KNOWING  ·  " + job.upper(), font=T["body"](20,"SemiBold"), fill=T["accent"])
    d.text((96,220), name, font=T["display"](92), fill=T["ink"])
    stars = f"{t['stars']//1000}k stars" if t["stars"] else "stars: check"
    d.text((96,340), f"{stars}  ·  does the job of {t['usual']}", font=T["body"](28), fill=T["muted"])
    d.line((96,410,984,410), fill=T["rule"], width=1)
    d.text((96,440), "GOOD FOR", font=T["body"](20,"SemiBold"), fill=T["muted"]); y = block(d,(96,476),good_for,T["body"](30),T["ink"],888,1.25)
    d.text((96,y+40), "NOT FOR", font=T["body"](20,"SemiBold"), fill=T["muted"]); y = block(d,(96,y+76),not_for,T["body"](30),T["ink"],888,1.25)
    d.text((96,y+50), "START", font=T["body"](20,"SemiBold"), fill=T["muted"])
    d.rounded_rectangle((96,y+86,984,y+150), radius=12, fill=T["bg2"], outline=T["rule"])
    d.text((120,y+104), start[:52], font=T["mono"](24), fill=T["ink"])
    d.text((96,1160), f"github.com/{t['repo']}", font=T["body"](24), fill=T["muted"])
    im.save(out)

pick_card("n8n", "automation",
          "Teams with one person who has run Docker once. Free tier covers a startup's first five automations. AI agent nodes are built in.",
          "Teams where nobody wants to own an update. Use Make and come back when the bill hurts.",
          "docker run -p 5678:5678 n8nio/n8n", f"{O}/mon-am-pick-n8n.png")
pick_card("Twenty", "crm",
          "A sales team under 20 that wants pipelines, notes and email sync without a per-seat contract. Looks like Notion, imports a HubSpot CSV.",
          "Anyone who needs marketing automation, sequences or a big app marketplace. That's still HubSpot's game.",
          "git clone github.com/twentyhq/twenty && make up", f"{O}/wed-pm-pick-twenty.png")
pick_card("Documenso", "paperwork",
          "Contracts, NDAs and offer letters for a small team. Open-source e-signing with templates and an API. Pair it with Cal.com for bookings and Formbricks for intake.",
          "Regulated industries with strict e-sign compliance needs. Read their compliance page before you move anything legal.",
          "docker compose up -d   # from documenso/documenso", f"{O}/fri-pm-pick-documenso.png")

question_card("WE WANT YOUR INPUT", "What tool are you paying for and barely open?",
              ["A CRM nobody updates", "An analytics dashboard nobody reads", "A seat for someone who left", "Something else. Name it below."],
              f"{O}/wed-am-question-barely-open.png")
question_card("DEBATE", "First ops hire, or first ten automations?",
              ["Hire. A person notices what a workflow can't.", "Automate. Hire when the automations break.", "Both, and the hire builds the automations."],
              f"{O}/tue-pm-debate-hire-or-automate.png", serif=True)

render_single({"type":"flow","kicker":"Build this first","title":"Lead intake, six nodes, one afternoon",
  "nodes":[{"label":"New form submission","tool":"Tally / Formbricks","kind":"trigger"},{"label":"Look up the company domain","tool":"Clearbit free / Apollo"},
           {"label":"Create contact and deal","tool":"Twenty / HubSpot"},{"label":"Post a one-line summary to #leads","tool":"Slack"},
           {"label":"Reply within the hour, every time","tool":"","kind":"result"}],
  "note":"The point isn't speed. It's that nobody has to remember to check the form inbox."}, ACTIVE, f"{O}/thu-am-flow-lead-intake.png")

render_single({"type":"list","kicker":"Our opinion","title":"Three things we'd never automate at a startup. Just pay or do it by hand.",
  "items":[{"name":"Payroll and tax filings","price":"pay","raw":1,"replaces":"The fine is bigger than the saving. Every time."},
           {"name":"The first reply to an angry customer","price":"by hand","raw":1,"replaces":"A human noticing the tone is the whole product at 10 people."},
           {"name":"Anything you've done fewer than 20 times","price":"wait","raw":1,"replaces":"You don't know the edge cases yet, so the bot won't either."}]},
  ACTIVE, f"{O}/fri-am-list-never-automate.png")

render_single({"type":"stat","kicker":"Checked today on GitHub","value":"%dk" % (sum(t["stars"] or 0 for t in stack.values())//1000),"label":"stars across 16 open-source tools that cover the jobs a startup usually pays sixteen vendors for.",
  "source":"GitHub API, 2 Nov 2026. List in the launch carousel."}, ACTIVE, f"{O}/thu-pm-stat-stars.png")
print("cards ok")
