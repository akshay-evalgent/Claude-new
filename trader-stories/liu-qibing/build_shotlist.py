"""Build the Liu Qibing shot list and image list from one source.

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
    "restrained colour grade with true whites, plain unmarked surfaces, screens showing only soft abstract light."
)
STYLE_WIDE = (STYLE.replace("natural skin texture, ", "")
              .replace("shallow depth of field", "deep focus, small figures in a big space"))

CHARACTERS = {
    "LQ_YOUNG": "Liu, a slim Chinese man in his mid-twenties with short neat black hair and thin wire-rimmed glasses, wearing a plain dark suit",
    "LQ": "Liu, a slim Chinese man in his mid-thirties with short neat black hair and thin wire-rimmed glasses, wearing a white shirt and dark trousers",
}
FAR = {
    "LQ_YOUNG": "a slim young Chinese man in a dark suit",
    "LQ": "a slim Chinese man in a white shirt",
}

CHINA = "Set in China, every person in frame is Chinese"
LONDON = "Set in London, traders of mixed backgrounds in suits"
KOREA = "Set at a South Korean port"
SETTING = {"london_screens": LONDON, "london_traders": LONDON, "london_office_1995": LONDON, "lme_ring": LONDON,
           "lme_warehouse": LONDON, "traders_huddle": LONDON, "newsstand_london": LONDON, "london_dusk": LONDON,
           "korea_port": KOREA}
SETTING_DEFAULT = CHINA

E2005 = "2005, period-accurate suits, early flat-screen monitors and mobile phones of the era"
E1995 = "1995, period-accurate clothes and bulky CRT computers"

# --- images to generate ------------------------------------------------------
# (image_id, character or "", framing, scene) — "{who}" places the short description in wide shots

IMAGES = [
    # London, November 2005
    ("london_screens", "", "Wide shot", "a wall of glowing trading screens in a dim London trading room, rows of soft amber and green light, one screen brighter than the rest, " + E2005),
    ("london_traders", "", "Medium-wide shot", "metal traders in shirts and ties on telephones in a busy London trading room, tense faces lit by screens, " + E2005),
    ("london_dusk", "", "Extreme wide shot at dusk", "the City of London skyline with office towers lit up and the river in the foreground, 2005"),
    ("empty_desk_note", "", "Medium shot", "an empty office desk in a plain Beijing government office, the chair pushed back, a single folded sheet of paper on the desk, grey morning light, " + E2005),
    ("beijing_gov_night", "", "Wide low-angle shot", "a large stern government office building in Beijing at night, rows of lit windows, a wide empty forecourt"),
    ("liu_desk_back", "LQ", "Medium-wide shot from behind", "sitting at a desk with four monitors in a quiet trading office at night, the glow of the screens around him, " + E2005),
    ("ledger_red", "", "Extreme close-up", "a printed trading ledger page with long columns of figures, the last column in red ink, a pen lying across it, " + E2005),
    # the wire to London
    ("wuhan_campus", "", "Wide shot", "a leafy Chinese university campus in the early 1990s, students with bicycles under tall plane trees, old brick buildings"),
    ("copper_warehouse", "", "Extreme wide shot", "a vast grey warehouse filled with neat stacks of flat copper cathode sheets strapped with steel bands, a forklift in the distance, cold light"),
    ("london_office_1995", "LQ_YOUNG", "Medium shot", "working at a bulky computer terminal in a cramped London office, network cables and a modem on the desk, a window onto grey London rooftops, " + E1995),
    ("lme_ring", "", "Wide high-angle shot", "a circular open-outcry trading ring with traders seated on red leather benches around it, others standing behind, shouting and signalling with hands, under a domed ceiling"),
    # the boom
    ("beijing_cranes", "", "Extreme wide shot", "the Beijing skyline crowded with dozens of construction cranes and half-built towers in hazy afternoon light, 2004"),
    ("liu_confident", "LQ", "Medium shot", "on the phone at a trading desk, leaning back with quiet confidence, screens glowing beside him, a cup of tea, " + E2005),
    ("shanghai_floor", "", "Wide shot", "a busy Chinese commodity futures exchange floor in Shanghai, traders in red waistcoats at rows of terminals, " + E2005),
    ("office_night_one_desk", "LQ", "Extreme wide shot through a glass door", "a dark open-plan office at night where every desk is empty except one far at the back, where {who} sits working alone, lit by his screens"),
    # the turn
    ("liu_reflection", "LQ", "Close-up", "his face reflected faintly in a computer screen showing a soft abstract rising line, thoughtful, eyes narrowed, " + E2005),
    ("meeting_disagree", "LQ", "Medium-wide shot", "sitting at a meeting table across from two colleagues, one of them shaking his head and gesturing at a printout, he listens unmoved, " + E2005),
    # the promise and the hunt
    ("lme_warehouse", "", "Wide shot", "a half-empty metal warehouse with only a few stacks of copper bundles on a concrete floor, a forklift moving a single stack, harsh overhead light"),
    ("traders_huddle", "", "Medium shot", "three metal traders huddled around a single screen, one pointing at it, conspiratorial, " + E2005),
    ("liu_alone_night", "LQ", "Medium shot", "alone at his desk late at night, head in his hands, a mobile phone lying face down beside the keyboard, screens glowing red-orange, " + E2005),
    ("farewell_note", "", "Extreme close-up", "a folded handwritten letter with unreadable lines of ink lying on an empty desk, a fountain pen beside it, a desk lamp, " + E2005),
    # the disappearance
    ("yunnan_mountains", "", "Extreme wide shot", "misty green mountains in Yunnan with a narrow road winding through terraced hillsides, low clouds, quiet and remote"),
    ("newsstand_london", "", "Wide shot", "a London news stand outside a station with stacks of financial newspapers and commuters in coats, grey November light, 2005"),
    # the denial
    ("podium_empty", "", "Wide symmetrical shot", "an empty press-briefing podium with microphones in a formal Beijing government hall, red curtains and rows of empty chairs"),
    ("auction_room", "", "Wide shot", "a formal auction hall in Beijing, bidders in suits raising numbered paddles, an auctioneer at a lectern, " + E2005),
    # the clean-up
    ("korea_port", "", "Extreme wide shot", "a busy container port with cargo ships and cranes unloading bundles of copper onto the quay, grey sea, 2005"),
    # the verdict and the end
    ("beijing_court", "", "Wide low-angle shot", "a large modern Chinese courthouse with wide steps and columns on a grey winter day, red flag on a pole, bare trees"),
    ("courtroom_gallery", "", "Wide shot from the back of the public gallery", "a Chinese courtroom with three judges in black robes at a raised bench against a deep red wall, a defendant standing alone in a wooden dock seen only from behind"),
    ("empty_desk_off", "", "Medium-wide shot", "an empty trading desk in a dark office, four monitors switched off, a chair pushed in, dust in a shaft of light"),
    ("copper_cathode_close", "", "Extreme close-up", "the edge of a stack of copper cathode sheets, the metal surface textured and glowing warm orange under a lamp"),
]

RECONSTRUCTED = {"empty_desk_note", "farewell_note", "courtroom_gallery", "meeting_disagree"}
TAG_WORDS = {"RUMOUR", "UNPROVEN", "ALLEGATION", "BIOGRAPHY", "REPORTED"}

# --- shots --------------------------------------------------------------------

def S(section, family, image, cue, on_screen="", motion="", notes="", hold=0):
    return dict(section=section, family=family, image_id=image, cue=cue,
                on_screen=on_screen, motion=motion, notes=notes, hold=hold)

SHOTS = [
    # 1. Cold open
    S(1, "NUMBER", "", "London.", "LONDON · NOVEMBER 2005", "date types on"),
    S(1, "SCENE", "london_screens", "The price of copper is at a record high,", "", "slow push"),
    S(1, "SCENE", "london_traders", "On the trading floors", "", "pan"),
    S(1, "SCENE", "lme_warehouse", "Well over a hundred thousand tonnes", "", "slow push"),
    S(1, "SCENE", "empty_desk_note", "And the trader has vanished.", "", "very slow push"),
    S(1, "SCENE", "beijing_gov_night", "When reporters ask", "", "tilt up"),
    S(1, "CARD", "", "", "THE TRADER WHO DIDN'T EXIST", "title", hold=4),
    # 2. The man nobody knew
    S(2, "SCENE", "liu_desk_back", "His name was Liu Qibing.", "刘其兵 LIU QIBING", "slow push"),
    S(2, "SCENE", "copper_warehouse", "He was the star trader", "", "pan"),
    S(2, "NUMBER", "", "Chinese newspapers would later call him", "中国的李森 CHINA'S LEESON", "type card"),
    S(2, "NUMBER", "", "His losses on paper", "−$606,000,000", "counter"),
    S(2, "SCENE", "ledger_red", "So how does a state employee", "", "slow push"),
    # 3. The wire to London
    S(3, "SCENE", "wuhan_campus", "Liu studied economics", "WUHAN UNIVERSITY", "pan"),
    S(3, "SCENE", "copper_warehouse", "The bureau's job was simple.", "", "slow pull"),
    S(3, "DIAGRAM", "", "Buy when prices are low.", "", "steps"),
    S(3, "SCENE", "london_office_1995", "In 1995, the bureau sent Liu", "LONDON, 1995", "slow push"),
    S(3, "SCENE", "london_office_1995", "He was, in a very literal sense,", "", "push tighter"),
    S(3, "SCENE", "lme_ring", "The LME is where the world", "THE LONDON METAL EXCHANGE", "slow push"),
    S(3, "SCENE", "liu_desk_back", "And in 1998,", "1998", "drift"),
    # 4. The boom
    S(4, "SCENE", "beijing_cranes", "Then China began to build.", "", "pan"),
    S(4, "CHART", "", "In 2003, copper was trading", "", "line climbs"),
    S(4, "SCENE", "liu_confident", "Liu had bet on the rise.", "", "slow push"),
    S(4, "NUMBER", "", "According to a later academic study,", "+$300,000,000", "counter"),
    S(4, "SCENE", "shanghai_floor", "He also ran a quieter trade.", "SHANGHAI", "pan"),
    S(4, "DIAGRAM", "", "So from around 2003,", "", "steps"),
    S(4, "SCENE", "office_night_one_desk", "And here is the detail that matters.", "", "very slow push"),
    # 5. The turn
    S(5, "SCENE", "liu_reflection", "As copper neared three thousand dollars,", "", "slow push"),
    S(5, "DIAGRAM", "", "So he turned around.", "", "limit diagram: line falls"),
    S(5, "SCENE", "meeting_disagree", "According to the Economic Observer,", "", "drift"),
    S(5, "NUMBER", "", "In October 2004,", "OCTOBER 2004 · −10% IN A DAY", "type card"),
    S(5, "DIAGRAM", "", "Here is what that means.", "", "steps"),
    S(5, "NUMBER", "", "There is no ceiling", "NO CEILING ON THE LOSS", "line lands"),
    # 6. The promise
    S(6, "DIAGRAM", "", "On the LME, a bet that copper will fall", "", "steps"),
    S(6, "NUMBER", "", "Through 2005, Liu's promise grew.", "21 DECEMBER 2005", "date card"),
    S(6, "CHART", "", "By the summer,", "", "bars"),
    S(6, "SCENE", "lme_warehouse", "To put that in perspective,", "", "slow pull"),
    S(6, "NUMBER", "", "He had promised to deliver", "MORE THAN THE WHOLE MARKET HAD", "line lands"),
    # 7. The hunt
    S(7, "SCENE", "traders_huddle", "In a market like the LME,", "", "slow push"),
    S(7, "NUMBER", "", "Does the bureau actually have the copper", "DOES CHINA HAVE THE COPPER?", "type card"),
    S(7, "SCENE", "london_traders", "If it didn't,", "", "pan"),
    S(7, "CHART", "", "So, reportedly, they bought.", "", "line climbs through 2005"),
    S(7, "SCENE", "liu_alone_night", "Each step up cost Liu", "", "very slow push"),
    S(7, "NUMBER", "", "By October, his loss on paper", "−$606,000,000", "counter"),
    S(7, "SCENE", "farewell_note", "And in October 2005,", "", "slow push"),
    # 8. The disappearance
    S(8, "SCENE", "yunnan_mountains", "He did not stay gone for long.", "YUNNAN · OCTOBER 2005", "slow push"),
    S(8, "MAP", "", "In October, he was detained", "", "pin on Yunnan"),
    S(8, "SCENE", "london_screens", "But the market did not know that.", "", "drift"),
    S(8, "SCENE", "newsstand_london", "In the middle of November,", "", "pan"),
    # 9. The denial
    S(9, "SCENE", "podium_empty", "Then came the strangest part", "", "slow push"),
    S(9, "DIAGRAM", "", "At first, the State Reserve Bureau", "", "steps: three answers"),
    S(9, "NUMBER", "", "The bureau said it held", "1,300,000 t vs ~250,000 t", "two lines"),
    S(9, "SCENE", "auction_room", "It began auctioning copper", "", "pan"),
    S(9, "NUMBER", "", "When one report said", "−$90 IN FIVE MINUTES", "line lands"),
    S(9, "CHART", "", "It did not hold.", "", "line to record"),
    S(9, "NUMBER", "", "Some in London had a darker theory.", "THE GREATEST BLUFF OF ALL TIME?", "type card"),
    S(9, "SCENE", "london_dusk", "Perhaps the short position", "", "slow push"),
    S(9, "DOC", "", "There was a bigger worry too.", "", "register card"),
    S(9, "SCENE", "london_traders", "In other words,", "", "drift"),
    S(9, "CARD", "", "As one London broker", "", "quote"),
    # 10. The clean-up
    S(10, "SCENE", "korea_port", "In the end, the bureau", "SOUTH KOREA · DECEMBER 2005", "pan"),
    S(10, "SCENE", "copper_cathode_close", "The rest of the position", "", "slow push"),
    S(10, "CHART", "", "And copper kept going up.", "", "line to 2006 peak"),
    S(10, "NUMBER", "", "Even so, with physical delivery,", "$606M → $144M", "counter"),
    S(10, "NUMBER", "", "Counting an earlier profit at home,", "¥920,000,000", "counter"),
    # 11. The verdict
    S(11, "SCENE", "beijing_court", "In 2008, Liu Qibing went on trial", "BEIJING · 2008", "tilt up"),
    S(11, "SCENE", "courtroom_gallery", "He was sentenced to seven years", "", "slow push"),
    S(11, "DOC", "", "His direct boss got six years.", "", "register card"),
    S(11, "NUMBER", "", "There was a precedent.", "1997 · ZINC · 16 YEARS", "lines land"),
    S(11, "NUMBER", "", "Some Chinese commentators said", "SCAPEGOAT? ROGUE?", "stamps"),
    S(11, "SCENE", "office_night_one_desk", "The bureau's trading arm", "", "slow pull"),
    # 12. Too early
    S(12, "CHART", "", "And here is the final twist.", "", "full line 2003-2008"),
    S(12, "NUMBER", "", "He was right about copper.", "RIGHT. THREE YEARS EARLY.", "two lines"),
    S(12, "SCENE", "empty_desk_off", "In markets, being early", "", "very slow push"),
    S(12, "SCENE", "copper_cathode_close", "Liu Qibing ran out of time", "", "pull, fade"),
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
            scene = f"{scene}. {SETTING.get(image_id, SETTING_DEFAULT)}"
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

    md = ["# Liu Qibing: shot list", "",
          "Generated by `build_shotlist.py` from `SCRIPT.md`. Do not edit by hand.", "",
          f"- {len(rows)} shots, about {fmt(t)} at {round(WORDS_PER_SECOND * 60)} words a minute "
          f"with a {PAUSE_PER_SENTENCE}s breath per sentence.",
          f"- {len(IMAGES)} images to generate (`images.csv`), used in "
          f"{families.get('SCENE', 0)} SCENE shots.",
          "- Built in motion graphics: " + ", ".join(f"{k} {v}" for k, v in sorted(families.items()) if k != "SCENE") + ".",
          "- Times are estimates from word counts. The recorded voice sets the real timing.", ""]
    names = {1: "Cold open", 2: "The man nobody knew", 3: "The wire to London", 4: "The boom", 5: "The turn",
             6: "The promise", 7: "The hunt", 8: "The disappearance", 9: "The denial", 10: "The clean-up",
             11: "The verdict", 12: "Too early"}
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
