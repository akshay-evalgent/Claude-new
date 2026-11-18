"""Build the Juan Pablo Dávila shot list and image list from one source.

Run:  python3 build_shotlist.py

Reads SCRIPT.md for the narration, checks that every shot's cue appears in it
(in order), times each shot from the words it covers, and writes:

  shots.csv     one row per shot, for the edit
  images.csv    one row per generated illustration, for the Kaggle notebook
  SHOTLIST.md   the same shot list as a readable table

Edit the SHOTS and IMAGES lists below, never the generated files.
"""

import csv
import re
from pathlib import Path

HERE = Path(__file__).parent
WORDS_PER_SECOND = 170 / 60      # narration pace
PAUSE_PER_SENTENCE = 0.35        # breath at each full stop, seconds
PAUSE_PER_SECTION = 1.5          # beat between sections, seconds

# --- house style, characters ------------------------------------------------

STYLE = (
    "Photorealistic cinematic film still from a prestige financial thriller series. "
    "Shot on an ARRI Alexa with anamorphic lenses, natural skin texture, motivated "
    "practical lighting, deep shadows, shallow depth of field, gentle film grain, "
    "warm restrained colour grade with true whites, plain unmarked surfaces, screens showing only soft abstract light."
)
STYLE_WIDE = (STYLE.replace("natural skin texture, ", "")
              .replace("shallow depth of field", "deep focus, small figures in a big space"))

CHARACTERS = {
    "JP": "Juan Pablo, a Chilean man in his early thirties with short dark wavy hair, a neat dark moustache and clean-shaven cheeks, wearing a white shirt with a loosened dark tie",
    "BOSS": "a grey-haired Chilean executive in his fifties in a navy suit",
}
FAR = {
    "JP": "a Chilean man in a white shirt and dark tie",
    "BOSS": "a grey-haired executive in a navy suit",
}

CHILE = "Set in Santiago, Chile, every person in frame is Chilean"
COAST = "Set on the central Chilean coast"
LONDON = "Set in London, traders of mixed backgrounds in suits"
NEWYORK = "Set in New York, traders of mixed backgrounds"
HAMBURG = "Set in Hamburg, Germany"
SETTING = {"coast_road": COAST, "beach_house": COAST, "chuqui_pit": "Set in the Atacama desert of northern Chile",
           "london_screens": LONDON, "ny_pit": NEWYORK, "hamburg_broker": HAMBURG}
SETTING_DEFAULT = CHILE

E1993 = "1993, period-accurate suits and ties, beige CRT computers, desk telephones with cords"

# --- images to generate ------------------------------------------------------
# (image_id, character or "", framing, scene) — "{who}" places the short description in wide shots

IMAGES = [
    # cold open
    ("coast_road", "", "Extreme wide shot", "a single dark 1990s sedan driving along a winding coastal road above the Pacific Ocean, morning haze over the sea, summer"),
    ("corridor_walk", "JP", "Medium-wide shot from behind", "walking fast down a long corridor of a 1990s corporate office building, fluorescent light, closed office doors, " + E1993),
    ("office_two_men", "JP", "Medium-wide shot", "sitting across a desk from {who2} in a corner office, blinds half closed, late afternoon light in stripes, both men grave and silent, " + E1993),
    # the copper company
    ("chuqui_pit", "", "Extreme wide aerial shot", "a vast open-pit copper mine with terraced walls spiralling down into the earth, huge haul trucks small on the benches, dust in golden light"),
    ("copper_bar", "", "Extreme close-up", "a heavy bar of pure copper resting on a dark wooden table, its surface glowing warm orange under a single lamp"),
    ("santiago_andes", "", "Extreme wide shot", "the city of Santiago in 1994 with mid-rise office blocks and the snow-capped Andes mountains rising behind, clear morning light"),
    ("jp_desk", "JP", "Medium shot", "at a cluttered desk with a corded telephone pressed to his ear, a beige CRT computer beside him, confident half-smile, " + E1993),
    ("coffee_colleagues", "JP", "Medium-wide shot", "standing by an office coffee machine while two colleagues in shirts and ties laugh and point at him in friendly teasing, " + E1993),
    # the rules
    ("typed_minute", "", "Extreme close-up", "a typewritten board minute with unreadable lines of type on a desk, a round ink stamp and a fountain pen beside it, " + E1993),
    ("empty_meeting_room", "", "Wide symmetrical shot", "an empty corporate meeting room with a long wooden table and chairs pushed in, dust floating in a shaft of light from tall windows, 1993"),
    # one man, one spreadsheet
    ("beige_pc", "", "Close-up", "a beige 1993 desktop computer with a CRT monitor glowing with a soft green grid of cells in a dark office, a keyboard in front"),
    ("fax_dark", "", "Close-up", "a 1990s fax machine slowly curling out a sheet of thermal paper in a dark room, its small green light on"),
    ("boxed_computer", "", "Wide shot", "a dim storeroom with large unopened cardboard boxes of computer equipment stacked on pallets, dust sheets, a single bulb"),
    # the mistake
    ("jp_hand_close", "JP", "Extreme close-up", "his hand frozen above a beige computer keyboard, a pen and a spreadsheet printout beside it, " + E1993),
    ("jp_still", "JP", "Medium shot", "sitting very still at his desk staring at nothing, colleagues in the background putting on jackets and leaving for the evening, " + E1993),
    # digging
    ("london_screens", "", "Wide shot", "a London metal-trading room in 1993, rows of brokers in shirts and ties at banks of CRT screens and telephones, cigarette haze"),
    ("ny_pit", "", "Wide high-angle shot", "a crowded New York metals futures trading pit in 1993, traders in coloured trading jackets shouting and signalling with hands, paper slips on the floor"),
    ("beach_house", "", "Wide shot at dusk", "a modest white beach house on a hillside above the Pacific, one window lit, a fax machine and papers visible on a table through the glass"),
    # the warnings
    ("corridor_execs", "", "Medium shot", "two Chilean executives in suits talking quietly in an office corridor, one tapping a sheet of paper, " + E1993),
    ("boss_instructs", "JP", "Medium-wide shot", "standing at his desk while {who2} rests a hand on his shoulder and talks to him casually, he nods, " + E1993),
    ("hamburg_broker", "", "Medium shot", "a German metals broker in shirtsleeves frowning at a CRT trading screen in a Hamburg office at night, telephone in hand, 1993"),
    # the confession
    ("weekend_crisis", "", "Wide shot", "a corporate boardroom at night, executives in shirtsleeves around a table covered in printouts and coffee cups, tense, ties loosened, " + E1993),
    # coppergate
    ("press_conf", "", "Wide shot", "a crowded press conference in a Santiago corporate hall in 1994, photographers with flashes, microphones on a long table, officials seated behind it"),
    ("kiosk", "", "Medium-wide shot", "a Santiago street newspaper kiosk in 1994 with stacks of newspapers and magazines, passers-by in summer clothes stopping to look"),
    ("jp_window", "JP", "Medium shot", "standing at a window looking out over the city, calm and composed, hands in pockets, soft daylight on his face, " + E1993),
    # the other story
    ("bank_statements", "", "Extreme close-up", "a spread of bank statements on a desk under a lamp, columns of figures with some circled in red pen, a magnifying glass, 1994"),
    ("lawyer_steps", "", "Medium shot", "a Chilean defence lawyer in a dark suit speaking to reporters with microphones on the steps of a courthouse, 1994"),
    # verdicts
    ("santiago_court", "", "Wide low-angle shot", "a grand neoclassical courthouse in Santiago with tall columns and wide stone steps, overcast sky"),
    ("prison_gate", "", "Wide shot", "the plain concrete wall and steel gate of a small-town prison in southern Chile, bright summer afternoon light, a single guard tower"),
    ("jp_court_back", "JP", "Medium-wide shot from behind", "standing alone before a court bench in a wood-panelled Chilean courtroom, seen only from behind, a judge at a raised bench, " + E1993),
]

RECONSTRUCTED = {"office_two_men", "boss_instructs", "beach_house", "corridor_execs", "weekend_crisis", "typed_minute"}
TAG_WORDS = {"RUMOUR", "UNPROVEN", "ALLEGATION", "BIOGRAPHY", "REPORTED"}

# --- shots --------------------------------------------------------------------

def S(section, family, image, cue, on_screen="", motion="", notes="", hold=0):
    return dict(section=section, family=family, image_id=image, cue=cue,
                on_screen=on_screen, motion=motion, notes=notes, hold=hold)

SHOTS = [
    # 1. Cold open
    S(1, "NUMBER", "", "Friday, the twenty-first", "SANTIAGO · FRIDAY 21 JANUARY 1994", "date types on"),
    S(1, "SCENE", "coast_road", "A man cuts his beach holiday", "", "slow pan"),
    S(1, "SCENE", "corridor_walk", "He asks to see his boss.", "", "follow push"),
    S(1, "DIAGRAM", "", "That afternoon, he explains.", "SELL → BUY", "ticket flips"),
    S(1, "NUMBER", "", "The mistake cost thirty million dollars.", "−$30,000,000", "counter"),
    S(1, "SCENE", "office_two_men", "And instead of reporting it,", "", "very slow push"),
    S(1, "CARD", "", "", "THE WRONG KEY", "title", hold=4),
    # 2. The copper company
    S(2, "SCENE", "chuqui_pit", "The money belonged to Codelco,", "CHUQUICAMATA", "slow push"),
    S(2, "NUMBER", "", "Codelco mined about a tenth", "10% OF THE WORLD'S COPPER", "counter"),
    S(2, "SCENE", "copper_bar", "Chile had nationalised", "", "slow pull"),
    S(2, "SCENE", "santiago_andes", "Codelco was not just a company.", "SANTIAGO", "drift"),
    S(2, "SCENE", "jp_desk", "The man who lost the money", "JUAN PABLO DÁVILA", "slow push"),
    S(2, "SCENE", "jp_desk", "He was an accountant.", "", "push tighter"),
    S(2, "SCENE", "coffee_colleagues", "Colleagues sometimes called him", "", "pan"),
    # 3. The rules
    S(3, "DIAGRAM", "", "Codelco had used the futures market", "", "steps"),
    S(3, "SCENE", "typed_minute", "In 1990, the company allowed", "", "slow push"),
    S(3, "DIAGRAM", "", "In August 1992,", "", "rules list"),
    S(3, "SCENE", "empty_meeting_room", "According to the state auditors,", "", "very slow push"),
    # 4. One man, one spreadsheet
    S(4, "SCENE", "beige_pc", "Here is how it worked in practice.", "", "slow push"),
    S(4, "DIAGRAM", "", "That spreadsheet was the company's record.", "", "nodes"),
    S(4, "SCENE", "fax_dark", "He kept it on his office computer,", "", "slow push"),
    S(4, "SCENE", "boxed_computer", "In 1991, Codelco had bought", "", "pan"),
    S(4, "SCENE", "beige_pc", "So the only person who knew", "", "push tighter"),
    # 5. The mistake
    S(5, "CHART", "", "By September 1993,", "", "line falls"),
    S(5, "SCENE", "jp_hand_close", "That month, by Dávila's own account,", "", "very slow push"),
    S(5, "SCENE", "jp_still", "Thirty times the most", "", "very slow push"),
    S(5, "NUMBER", "", "He didn't make the call.", "HE DIDN'T MAKE THE CALL.", "type card"),
    S(5, "SCENE", "jp_still", "Instead, he decided", "", "slow pull"),
    # 6. Digging
    S(6, "DIAGRAM", "", "His bets were short positions.", "", "steps"),
    S(6, "SCENE", "london_screens", "Over the next four months", "LONDON", "pan"),
    S(6, "SCENE", "ny_pit", "Copper, and then gold", "NEW YORK", "slow push"),
    S(6, "SCENE", "beach_house", "Some of it, investigators later said,", "REPORTED", "slow push"),
    S(6, "CHART", "", "In November, copper hit", "", "line turns up"),
    # 7. The warnings
    S(7, "SCENE", "corridor_execs", "That same November,", "", "slow push"),
    S(7, "SCENE", "boss_instructs", "According to the auditors,", "", "slow push"),
    S(7, "NUMBER", "", "He didn't. And nobody checked.", "NOBODY CHECKED.", "stamp"),
    S(7, "SCENE", "hamburg_broker", "On the other side of the trades,", "HAMBURG", "slow push"),
    S(7, "QUOTE", "", "Becker later told", "", "quote"),
    # 8. The confession
    S(8, "SCENE", "coast_road", "Which brings us back", "", "slow pan"),
    S(8, "SCENE", "office_two_men", "Dávila told the sales manager,", "", "slow push"),
    S(8, "SCENE", "office_two_men", "He thought the loss", "", "push tighter"),
    S(8, "SCENE", "weekend_crisis", "Guerrini went straight up", "", "pan"),
    S(8, "DIAGRAM", "", "On Monday, the company filed", "", "steps"),
    S(8, "NUMBER", "", "It was worse than a hundred million.", "−$206,000,000", "counter"),
    S(8, "NUMBER", "", "Forty-four percent", "44% OF CODELCO'S 1993 PROFIT", "counter"),
    # 9. Coppergate
    S(9, "SCENE", "press_conf", "On the twenty-sixth of January,", "26 JANUARY 1994", "slow push"),
    S(9, "SCENE", "kiosk", "The press called it Coppergate.", "", "pan"),
    S(9, "QUOTE", "", "One Codelco director", "", "quote"),
    S(9, "SCENE", "jp_window", "Dávila said, I don't believe", "", "slow push"),
    S(9, "DIAGRAM", "", "And Chile got a new word.", "", "dictionary card"),
    # 10. The other story
    S(10, "SCENE", "bank_statements", "But investigators did not believe", "", "slow push"),
    S(10, "DIAGRAM", "", "Codelco went through his bank accounts.", "", "money flow", notes="ALLEGATION"),
    S(10, "CHART", "", "Some of the money, Codelco said,", "", "bars"),
    S(10, "DIAGRAM", "", "Codelco also said that in 1990,", "", "map line", notes="ALLEGATION"),
    S(10, "SCENE", "bank_statements", "In lawsuits, Codelco alleged", "ALLEGATION", "push tighter"),
    S(10, "SCENE", "lawyer_steps", "Dávila denied it.", "", "slow push"),
    S(10, "QUOTE", "", "The judge who investigated", "", "quote"),
    # 11. The verdicts
    S(11, "SCENE", "santiago_court", "In March 1994 he was charged.", "SANTIAGO", "tilt up"),
    S(11, "DIAGRAM", "", "First he served a separate sentence", "", "timeline"),
    S(11, "SCENE", "jp_court_back", "Guilty of fraud against the state.", "", "slow push"),
    S(11, "SCENE", "prison_gate", "In January 2007,", "SAN CARLOS · JANUARY 2007", "slow push"),
    S(11, "NUMBER", "", "By then, Codelco had sued", "", "two numbers"),
    # 12. The wrong key
    S(12, "CHART", "", "And here is the last twist.", "", "line 1992-1994"),
    S(12, "SCENE", "beige_pc", "Was it a slip of the little finger,", "", "very slow push"),
    S(12, "SCENE", "empty_meeting_room", "But the auditors found something", "", "very slow push"),
    S(12, "DIAGRAM", "", "The wrong key cost thirty million dollars.", "BUY", "ticket"),
    S(12, "CARD", "", "", "Sources", "sources card", hold=8),
]


# --- build --------------------------------------------------------------------

NON_NARRATION = re.compile(r"^(PICTURE|SCORE|##|---|No narration|Hold on black)")


def narration_by_section():
    text = (HERE / "SCRIPT.md").read_text()
    parts = re.split(r"(?m)^## (\d+)\. .*$", text)
    out = {}
    for i in range(1, len(parts), 2):
        lines = [l.strip() for l in parts[i + 1].split("\n")]
        out[int(parts[i])] = " ".join(l for l in lines if l and not NON_NARRATION.match(l))
    return out


def fmt(seconds):
    s = int(round(seconds))
    return f"{s // 60}:{s % 60:02d}"


def build():
    narr = narration_by_section()
    full, offsets = "", {}
    for sec in sorted(narr):
        offsets[sec] = len(full)
        full += narr[sec] + " "

    # locate cues in order
    pos, located = 0, []
    for i, shot in enumerate(SHOTS):
        if not shot["cue"]:
            located.append(None)
            continue
        start = max(pos, offsets[shot["section"]])
        at = full.find(shot["cue"], start)
        if at < 0:
            raise SystemExit(f"Shot {i}: cue not found after position {start}: {shot['cue']!r}")
        located.append(at)
        pos = at + 1

    narrated = [p for p in located if p is not None]
    ids, rows, t = {}, [], 0.0
    image_ids = {img[0] for img in IMAGES}
    used = set()
    prev_section = None
    for i, shot in enumerate(SHOTS):
        sec = shot["section"]
        if prev_section is not None and sec != prev_section:
            t += PAUSE_PER_SECTION
        prev_section = sec
        ids[sec] = ids.get(sec, 0) + 1
        sid = f"{sec:02d}.{ids[sec]:02d}"
        if shot["family"] == "SCENE":
            if shot["image_id"] not in image_ids:
                raise SystemExit(f"{sid}: unknown image {shot['image_id']}")
            used.add(shot["image_id"])
        span = ""
        if located[i] is None:
            dur = shot["hold"]
        else:
            nxt = next((p for p in narrated if p > located[i]), len(full))
            span = full[located[i]:nxt]
            dur = len(span.split()) / WORDS_PER_SECOND + PAUSE_PER_SENTENCE * len(re.findall(r"[.?!]", span))
            dur += shot["hold"]
        tag = ""
        if shot["family"] == "SCENE":
            char = next(img[1] for img in IMAGES if img[0] == shot["image_id"])
            if shot["on_screen"] in TAG_WORDS:
                tag = shot["on_screen"]
            elif char or shot["image_id"] in RECONSTRUCTED:
                tag = "DRAMATISED"
        rows.append(dict(shot_id=sid, section=sec, start=fmt(t), seconds=round(dur, 1),
                         family=shot["family"], image_id=shot["image_id"], cue=shot["cue"],
                         on_screen=shot["on_screen"], tag=tag, motion=shot["motion"], notes=shot["notes"],
                         hold=shot["hold"], narration=span.strip()))
        t += dur

    unused = image_ids - used
    if unused:
        raise SystemExit(f"Images never used in a shot: {sorted(unused)}")

    with open(HERE / "shots.csv", "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0]))
        w.writeheader()
        w.writerows(rows)

    with open(HERE / "images.csv", "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["image_id", "character", "uses", "prompt"])
        uses = {}
        for r in rows:
            if r["image_id"]:
                uses[r["image_id"]] = uses.get(r["image_id"], 0) + 1
        for image_id, char, framing, scene in IMAGES:
            scene = f"{scene}. {SETTING.get(image_id, SETTING_DEFAULT)}".replace("{who2}", FAR["BOSS"])
            if "{who}" in scene:
                prompt = f"{framing}. {scene.replace('{who}', FAR[char])}. {STYLE_WIDE}"
            else:
                subject = CHARACTERS[char] + ", " if char else ""
                prompt = f"{framing}. {subject}{scene}. {STYLE}"
            if len(prompt.split()) > 175:
                raise SystemExit(f"{image_id}: prompt is {len(prompt.split())} words; keep it under 175 (token limit)")
            w.writerow([image_id, char, uses[image_id], prompt])

    families = {}
    for r in rows:
        families[r["family"]] = families.get(r["family"], 0) + 1

    md = ["# Juan Pablo Dávila: shot list", "",
          "Generated by `build_shotlist.py` from `SCRIPT.md`. Do not edit by hand.", "",
          f"- {len(rows)} shots, about {fmt(t)} at {round(WORDS_PER_SECOND * 60)} words a minute "
          f"with a {PAUSE_PER_SENTENCE}s breath per sentence.",
          f"- {len(IMAGES)} images to generate (`images.csv`), used in "
          f"{families.get('SCENE', 0)} SCENE shots.",
          "- Built in motion graphics: " + ", ".join(f"{k} {v}" for k, v in sorted(families.items()) if k != "SCENE") + ".",
          "- Times are estimates from word counts. The recorded voice sets the real timing.", ""]
    names = dict((int(n), t) for n, t in re.findall(r"(?m)^## (\d+)\. (.+)$", (HERE / "SCRIPT.md").read_text()))
    cur = None
    for r in rows:
        if r["section"] != cur:
            cur = r["section"]
            md += ["", f"## {cur}. {names[cur]}", "",
                   "| Shot | Start | Sec | Type | Picture | Starts on | On screen | Tag | Notes |",
                   "|---|---|---|---|---|---|---|---|---|"]
        pic = f"`{r['image_id']}`, {r['motion']}" if r["image_id"] else r["motion"]
        cells = [r["shot_id"], r["start"], str(r["seconds"]), r["family"], pic,
                 r["cue"] or "(no narration)", r["on_screen"] if r["on_screen"] not in TAG_WORDS else "", r["tag"], r["notes"]]
        md.append("| " + " | ".join(c.replace("|", "/") for c in cells) + " |")
    (HERE / "SHOTLIST.md").write_text("\n".join(md) + "\n")
    print(f"{len(rows)} shots, {fmt(t)}, {len(IMAGES)} images, families {families}")


if __name__ == "__main__":
    build()
