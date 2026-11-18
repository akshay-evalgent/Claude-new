"""Build the Ginzō Korekawa shot list and image list from one source.

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
# Photographic period-drama look. Prompts: "<framing>. <character>, <scene>. <setting>. <STYLE>"

STYLE = (
    "Photorealistic cinematic film still from a prestige historical drama series. "
    "Shot on an ARRI Alexa with anamorphic lenses, natural skin texture, motivated "
    "practical lighting, deep shadows, shallow depth of field, gentle film grain, "
    "restrained colour grade with true whites, plain unmarked surfaces."
)
STYLE_WIDE = (STYLE.replace("natural skin texture, ", "")
              .replace("shallow depth of field", "deep focus, small figures in a big space"))

# Locked descriptions of Ginzō at each age. Generic faces, never a likeness.
CHARACTERS = {
    "GK_TEEN": "Ginzō, a wiry Japanese boy of about sixteen with close-cropped black hair and bright bare eyes, wearing a worn dark cotton jacket and trousers",
    "GK_YOUNG": "Ginzō, a lean Japanese man in his early thirties with short neat black hair and bright bare eyes, wearing a dark three-piece suit",
    "GK_MID": "Ginzō, a lean Japanese man in his late forties with short greying hair and a weathered face, wearing a plain dark suit",
    "GK_OLD": "Ginzō, a slight Japanese man in his mid-eighties with thin white hair combed back, a lined face and large black-framed glasses, wearing a plain grey suit",
}
FAR = {
    "GK_TEEN": "a wiry Japanese teenage boy in a worn dark cotton jacket",
    "GK_YOUNG": "a lean young Japanese man in a dark suit",
    "GK_MID": "a lean Japanese man in his forties in a plain dark suit",
    "GK_OLD": "a slight elderly Japanese man with white hair in a plain grey suit",
}

# Default setting, and the scenes set elsewhere.
JAPAN = "Set in Japan, every person in frame is Japanese"
QINGDAO = "Set in a Chinese port city in 1915, Chinese townspeople and Japanese soldiers"
KOREA = "Set in Korea in the 1940s, Korean workers"
SETTING = {"qingdao_army": QINGDAO, "army_supply": QINGDAO, "coins_scale": QINGDAO, "market_panic_1916": QINGDAO,
           "korea_mine": KOREA, "ironworks_korea": KOREA, "workers_petition": KOREA, "prison_cell": KOREA,
           "factory_gate_rain": KOREA, "ship_rail": "Set at sea in 1914"}

E1910 = "1910s, period-accurate kimono and early Western clothes, wooden buildings, everything analogue"
E1920 = "1920s Japan, period-accurate suits, kimono and caps, wood and brick buildings, everything analogue"
E1930 = "1930s Japan, period-accurate suits and hats, everything analogue"
E1940 = "1940s, wartime period clothes, everything analogue"
E1965 = "1960s to 1970s Japan, period-accurate clothes, cars and buildings"
E1981 = "early-1980s Japan, period-accurate suits, cars and offices, paper, telephones and printed tickers"

# --- images to generate ------------------------------------------------------
# (image_id, character or "", framing, scene)  — "{who}" places the short description in wide shots

IMAGES = [
    # 1981 and the legend
    ("newspaper_breakfast", "", "Close-up on a low table", "a folded Japanese newspaper with dense columns of plain unreadable print, one small article circled in pencil, a cup of green tea steaming beside it, morning light, " + E1981),
    ("old_hands_paper", "GK_OLD", "Medium close-up", "reading a newspaper at a low table, holding it close, steam rising from a cup of tea, soft morning window light, " + E1981),
    ("train_window", "", "Shot through a train window", "green Japanese countryside and rice fields rushing past the window of an express train, rain streaks on the glass, " + E1981),
    ("kagoshima_hills_rain", "", "Extreme wide shot", "steep green forested hills in southern Kyushu under low rain clouds, mist in the valleys, a narrow road winding up"),
    ("osaka_street_bag", "GK_OLD", "Medium-wide shot, slightly low angle", "walking alone along a busy Osaka street carrying an old worn brown leather bag, office workers flowing past, " + E1981),
    ("old_bag", "", "Close-up", "an old, worn brown leather bag with scuffed corners and a cracked handle resting on a wooden bench, " + E1981),
    ("small_flat", "", "Wide shot", "a small, plain Osaka apartment with one wooden chair by a window, a low table, thin curtains, late-afternoon light, early 1990s"),
    # the boy who left
    ("ako_village", "", "Extreme wide shot at dawn", "a small fishing village on the Seto Inland Sea, wooden boats pulled up on a pebble beach, thatched and tiled roofs, nets drying, 1900s Japan"),
    ("kobe_apprentice", "GK_TEEN", "Wide shot down a crowded street", "a busy Kobe merchant street, rickshaws, shop curtains and porters, and {who} carrying a stack of wrapped parcels through the crowd, " + E1910),
    ("bankrupt_firm", "", "Medium-wide shot", "an emptied trading office with ledgers and papers scattered on the floor, clerks in kimono carrying boxes out of the door, grey light, " + E1910),
    ("ship_rail", "GK_TEEN", "Medium shot from behind", "standing at the rail of an old steamship, looking out at a wide grey sea, smoke from the funnel, 1914"),
    ("qingdao_army", "GK_TEEN", "Wide shot", "a column of soldiers in 1914 Japanese army uniforms marching through a dusty street of a Chinese port town, and far behind them {who} pulling a small handcart"),
    ("army_supply", "GK_TEEN", "Medium-wide shot", "standing beside stacks of wooden crates, sacks of rice and timber at an army supply yard, soldiers loading carts"),
    ("coins_scale", "", "Extreme close-up on a shop counter", "a pile of small worn copper and zinc coins beside an old brass balance scale, lamplight"),
    ("market_panic_1916", "", "Wide shot", "a market street emptying in panic, merchants pulling down wooden shutters, papers blowing in the wind, 1916"),
    ("pier_return", "GK_TEEN", "Extreme wide shot", "a long grey wooden pier in Kobe harbour under an overcast sky, and {who} walking alone towards the city with a single bag, " + E1910),
    # Osaka and the library
    ("osaka_workshop", "", "Wide shot", "a 1920s Osaka factory floor full of sparks and steam, workers at machines drawing wire, coils of steel wire stacked high, " + E1920),
    ("factory_owner", "GK_YOUNG", "Medium shot", "standing among his workers on a factory floor, inspecting a coil of zinc-coated wire, sparks behind him, " + E1920),
    ("tin_roofs_1923", "", "Wide shot", "rows of new tin-roofed wooden shacks being raised over the ruins of a burnt city after the 1923 earthquake, workers carrying corrugated metal sheets, " + E1920),
    ("donation_office", "GK_YOUNG", "Medium shot", "handing a thick envelope across a desk to a government official in a 1920s office, formal and quiet, " + E1920),
    ("bank_run_1927", "", "Wide shot", "a crowd of anxious people in coats and hats pressing against the closed shutters of a stone bank, a plain paper notice pasted on the door, " + E1920),
    ("closed_factory", "", "Wide shot", "an empty factory floor with silent machines under dust sheets, a shaft of grey light, " + E1920),
    ("library_reading", "GK_YOUNG", "Extreme wide shot", "a grand public library reading room in Osaka with tall arched windows and long wooden tables, and {who} sitting alone at a table surrounded by stacks of books, " + E1930),
    ("library_closeup", "GK_YOUNG", "Close-up", "his hands turning the pages of a thick book of economics by lamplight, pencil notes in the margins, " + E1930),
    ("pencil_wave", "", "Extreme close-up", "a pencil drawing a long rising and falling wave line across a sheet of paper in a notebook, lamplight"),
    ("library_empty", "", "Wide shot", "a grand library reading room with a long empty wooden table, dust floating in shafts of light from tall windows"),
    # seventy yen
    ("coins_70yen", "", "Extreme close-up", "a few coins and small plain paper banknotes on a worn wooden table, " + E1930),
    ("osaka_exchange_1930s", "", "Wide shot", "a busy stock exchange trading floor in 1930s Osaka, men in suits and hats shouting and waving, clerks writing chalk prices on tall blackboards, " + E1930),
    ("research_office", "", "Medium-wide shot", "a small 1930s office with a desk covered in reports, charts pinned to the wall, a frosted glass door, a desk lamp, " + E1930),
    ("military_questioning", "GK_YOUNG", "Medium-wide shot", "sitting at a bare table in a plain room, a typed report in front of him, facing two officers in 1930s Japanese army uniforms, tense, " + E1930),
    ("cotton_warehouse", "", "Wide shot", "bales of raw cotton stacked to the ceiling in a dim brick warehouse, light through high windows, " + E1930),
    ("futures_battle", "", "Wide shot", "two groups of men in dark suits facing each other across a crowded commodity exchange floor, clerks with chalk, tension, " + E1930),
    # the empire
    ("korea_mine", "", "Extreme wide shot", "a mine on a snowy mountainside, ore carts on narrow rails, workers in padded clothes, wooden headframes, 1940"),
    ("ironworks_korea", "", "Wide shot", "a vast 1940s ironworks with glowing furnaces and hundreds of workers, steam and sparks, " + E1940),
    ("factory_gate_rain", "", "Wide shot", "rain falling on an empty factory yard, a tall iron gate chained shut, 1945"),
    ("prison_cell", "GK_MID", "Medium shot", "sitting on the floor of a bare prison cell, light from a small high barred window across his face, 1945"),
    ("workers_petition", "", "Wide shot", "a crowd of Korean workers in work clothes gathered in a courtyard, holding sheets of paper, earnest faces, 1945"),
    ("repatriation_ship", "", "Wide shot", "a crowded repatriation ship arriving in a grey Japanese harbour, people with bundles lining the deck, ruined warehouses on shore, 1946"),
    # the comeback
    ("rice_field", "GK_MID", "Medium-wide shot", "crouching at the edge of a flooded rice paddy, testing the soil with his hand, farmers working behind, 1946 Japan"),
    ("osaka_land", "", "Wide aerial shot", "farmland on the edge of Osaka with new concrete housing estates spreading across it, construction cranes, " + E1965),
    ("cement_works", "", "Wide shot at dusk", "a large cement works with huge rotary kilns and silos, dust in the evening light, trucks queuing, " + E1965),
    ("construction_1977", "", "Wide shot", "a Japanese city skyline full of cranes and new concrete towers rising, " + E1965),
    ("classroom", "", "Wide shot", "children in school uniforms at wooden desks in a bright Japanese classroom, a teacher at the front, 1980"),
    ("old_desk", "GK_OLD", "Medium shot", "sitting at a cluttered desk covered in newspapers, company reports and a magnifying glass, studying a page intently, " + E1981),
    # the gold
    ("hillside_drill", "GK_OLD", "Medium-wide shot", "standing on a muddy hillside in light rain beside a drilling rig, looking at the forested hills, mine workers in helmets nearby, " + E1981),
    ("quartz_vein", "", "Extreme close-up", "a drill core of white quartz with fine dark veins and specks of gold lying in a wooden core tray, " + E1981),
    ("mine_office", "GK_OLD", "Medium shot", "sitting across a table in a small rural mine office, listening as a man in a work jacket shakes his head over a geological map, " + E1981),
    ("claim_map", "", "Close-up on a desk", "a large hand-drawn survey map of mining claims with one neighbouring plot shaded, a pencil and a ruler on top, plain unmarked paper, " + E1981),
    ("trading_floor_1981", "", "Wide shot", "a crowded 1981 Tokyo stock exchange floor, brokers in white shirts on telephones, paper tickets everywhere, a big board of plain glowing numbers out of focus, " + E1981),
    ("buy_ticket", "", "Extreme close-up", "a broker's hand writing quickly on a plain paper order ticket, a black telephone beside it, " + E1981),
    ("old_man_window_phone", "GK_OLD", "Medium shot", "standing at an office window holding a telephone receiver, the Osaka skyline outside, calm, " + E1981),
    ("newsstand_1983", "", "Wide shot", "a busy Tokyo station newsstand with stacks of newspapers and magazines, commuters buying papers, " + E1981),
    ("train_bag", "GK_OLD", "Medium shot", "sitting on a crowded commuter train with an old worn brown leather bag on his knees, looking out of the window, " + E1981),
    # the last trades and epilogue
    ("hospital_corridor", "", "Wide shot down a corridor", "a dim hospital corridor at night, one door half open, a bench by the wall, 1985 Japan"),
    ("tax_envelope", "", "Close-up", "a plain brown official envelope on a wooden table, a red round seal stamped on it, a pair of reading glasses beside it, 1991"),
    ("osaka_flats_dusk", "", "Wide shot", "a plain concrete apartment block in Osaka at dusk, one window lit, power lines, a quiet street, 1992"),
    ("school_gate", "", "Wide shot", "students in uniforms walking through a school gate in morning sunlight, cherry trees, modern Japan"),
    ("hishikari_dawn", "", "Extreme wide shot at dawn", "forested hills in Kagoshima with mist in the valleys and a modern mine entrance cut into the slope, first light"),
]

# Scenes that reconstruct a real moment with real people; these, and every shot
# showing Ginzō, carry a DRAMATISED tag unless a stronger tag applies.
RECONSTRUCTED = {"workers_petition", "donation_office", "military_questioning", "mine_office"}
TAG_WORDS = {"RUMOUR", "UNPROVEN", "ALLEGATION", "BIOGRAPHY"}

# --- shots --------------------------------------------------------------------

def S(section, family, image, cue, on_screen="", motion="", notes="", hold=0):
    return dict(section=section, family=family, image_id=image, cue=cue,
                on_screen=on_screen, motion=motion, notes=notes, hold=hold)

SHOTS = [
    # 1. Cold open
    S(1, "NUMBER", "", "Osaka.", "OSAKA · 18 SEPTEMBER 1981", "date types on"),
    S(1, "SCENE", "newspaper_breakfast", "An old man opens the morning paper.", "", "slow push to the circled item"),
    S(1, "SCENE", "old_hands_paper", "Gold has been found", "", "drift"),
    S(1, "SCENE", "newspaper_breakfast", "Millions of people read that paper.", "", "pull"),
    S(1, "SCENE", "old_hands_paper", "He is eighty-four years old.", "", "slow push"),
    S(1, "SCENE", "train_window", "Within days,", "", "pan"),
    S(1, "SCENE", "kagoshima_hills_rain", "Within months,", "", "slow push"),
    S(1, "BLACK", "", "And within ten years,", "", "cut to black"),
    S(1, "CARD", "", "", "THE LAST SPECULATOR", "title", hold=4),
    # 2. The legend
    S(2, "SCENE", "osaka_street_bag", "His name was", "是川銀蔵 GINZŌ KOREKAWA", "slow push"),
    S(2, "NUMBER", "", "In Japan they called him", "最後の相場師 THE LAST SPECULATOR", "type card"),
    S(2, "SCENE", "osaka_street_bag", "His schooling ended", "", "push, tighter"),
    S(2, "SCENE", "old_bag", "He carried the same worn bag", "", "slow push"),
    S(2, "CHART", "", "And in 1983, at eighty-five,", "No. 1 TAXPAYER", "rank climbs to first"),
    S(2, "SCENE", "small_flat", "But when he died,", "", "slow push"),
    S(2, "NUMBER", "", "So how does a man", "A FORTUNE AT 84. GONE BY 94.", "two lines land"),
    S(2, "NUMBER", "", "To understand that trade,", "1897", "rewind to 1897"),
    # 3. The boy who left
    S(3, "SCENE", "ako_village", "He was born in 1897,", "AKŌ, HYŌGO", "pan"),
    S(3, "SCENE", "kobe_apprentice", "At fourteen he went to work", "KOBE, 1911", "slow push"),
    S(3, "SCENE", "bankrupt_firm", "He watched the men", "", "drift"),
    S(3, "SCENE", "ship_rail", "At seventeen, according to his biographer,", "BIOGRAPHY", "slow push"),
    S(3, "MAP", "", "He got as far as Dalian,", "Kobe → Dalian", "route draws across the sea"),
    S(3, "SCENE", "qingdao_army", "So he followed the Japanese army", "BIOGRAPHY", "pan"),
    S(3, "SCENE", "army_supply", "Then he talked his way", "BIOGRAPHY", "slow push"),
    S(3, "SCENE", "coins_scale", "His biographer tells one story", "BIOGRAPHY", "slow push"),
    S(3, "CHART", "", "He worked out that the metal", "METAL > 2× FACE VALUE", "two bars"),
    S(3, "SCENE", "coins_scale", "Everyone else saw small change.", "", "push in"),
    S(3, "SCENE", "market_panic_1916", "By nineteen, he was rich.", "BIOGRAPHY", "drift"),
    S(3, "SCENE", "pier_return", "He went home with nothing.", "", "slow pull"),
    # 4. The library
    S(4, "SCENE", "osaka_workshop", "In Osaka he started again.", "OSAKA, 1919", "pan"),
    S(4, "SCENE", "factory_owner", "He ran a factory", "", "slow push"),
    S(4, "SCENE", "tin_roofs_1923", "In 1923, an earthquake", "1923", "pan"),
    S(4, "SCENE", "donation_office", "According to his biographer, he then gave", "BIOGRAPHY", "slow push"),
    S(4, "SCENE", "bank_run_1927", "Then, in 1927, panic", "1927", "drift"),
    S(4, "SCENE", "bank_run_1927", "One of them was his.", "", "push to the notice"),
    S(4, "SCENE", "closed_factory", "He was thirty.", "", "static"),
    S(4, "SCENE", "library_reading", "Most men would have looked", "", "very slow push"),
    S(4, "SCENE", "library_closeup", "For about three years, he read.", "", "drift"),
    S(4, "DIAGRAM", "", "He came out with one idea", "BOOM · BUST · BOOM", "wave draws"),
    S(4, "SCENE", "pencil_wave", "If you understood the cycle,", "", "slow push"),
    # 5. Seventy yen
    S(5, "SCENE", "coins_70yen", "In 1931, at the bottom", "", "slow push"),
    S(5, "SCENE", "osaka_exchange_1930s", "he walked into the Osaka stock exchange", "", "pan"),
    S(5, "NUMBER", "", "By the end of the year,", "¥70 → ¥7,000", "counter"),
    S(5, "SCENE", "research_office", "Two years later,", "1933", "slow push"),
    S(5, "SCENE", "military_questioning", "In the 1930s, his biographer says,", "BIOGRAPHY", "slow push"),
    S(5, "NUMBER", "", "Later writers summed up", "THREE RULES", "rules land one at a time"),
    S(5, "NUMBER", "", "In Japan they are known", "亀の三原則 THE TURTLE'S THREE RULES", "type card"),
    S(5, "SCENE", "cotton_warehouse", "He did not always follow", "BIOGRAPHY", "slow push"),
    S(5, "DIAGRAM", "", "In a fight like that,", "SETTLE OR FIGHT ON", "steps"),
    S(5, "SCENE", "futures_battle", "He was three million yen ahead.", "BIOGRAPHY", "slow push"),
    S(5, "NUMBER", "", "The market turned.", "+¥3,000,000 → LOSS", "lines land"),
    S(5, "SCENE", "futures_battle", "He never forgot it.", "", "pull"),
    # 6. The empire
    S(6, "MAP", "", "In 1938, he went into mining", "Osaka → Korea", "route draws"),
    S(6, "SCENE", "korea_mine", "The mines fed ironworks.", "BIOGRAPHY", "pan"),
    S(6, "SCENE", "ironworks_korea", "By the war years,", "BIOGRAPHY", "slow push"),
    S(6, "SCENE", "factory_gate_rain", "Then, in August 1945,", "AUGUST 1945", "static"),
    S(6, "SCENE", "prison_cell", "He expected to be executed.", "", "very slow push"),
    S(6, "SCENE", "workers_petition", "Instead, his Korean colleagues", "", "drift"),
    S(6, "SCENE", "repatriation_ship", "He sailed back", "", "pan"),
    # 7. The comeback
    S(7, "SCENE", "rice_field", "He did not go back to the market", "1946", "slow push"),
    S(7, "SCENE", "osaka_land", "Then he bought land", "", "pan"),
    S(7, "NUMBER", "", "When he sold,", "¥300,000,000", "counter"),
    S(7, "SCENE", "cement_works", "In 1976, aged seventy-nine,", "NIHON CEMENT · 1976", "slow push"),
    S(7, "SCENE", "construction_1977", "Japan had just come through", "", "tilt up"),
    S(7, "CHART", "", "He was right.", "¥300M IN · ¥3BN GAIN", "two bars"),
    S(7, "SCENE", "classroom", "Two years later,", "1979", "drift"),
    S(7, "SCENE", "old_desk", "He was not finished.", "", "slow push"),
    # 8. The gold
    S(8, "SCENE", "newspaper_breakfast", "Which brings us back", "", "push"),
    S(8, "MAP", "", "The gold was at Hishikari,", "Osaka → Hishikari", "route south, pin"),
    S(8, "SCENE", "quartz_vein", "Earlier that year,", "", "slow push"),
    S(8, "NUMBER", "", "A typical gold mine", "A FEW GRAMS vs ~40", "two lines"),
    S(8, "NUMBER", "", "And the mining rights belonged", "SUMITOMO METAL MINING", "type card"),
    S(8, "DIAGRAM", "", "Here is why that mattered.", "", "steps"),
    S(8, "NUMBER", "", "Sumitomo's shares were trading", "¥226", "price card"),
    S(8, "SCENE", "hillside_drill", "Korekawa went to see the site himself.", "BIOGRAPHY", "slow push"),
    S(8, "SCENE", "quartz_vein", "Only one question mattered.", "", "push in"),
    S(8, "SCENE", "mine_office", "The local mine office", "", "drift"),
    S(8, "SCENE", "claim_map", "He ignored them.", "", "slow push"),
    S(8, "SCENE", "trading_floor_1981", "And he bought Sumitomo shares.", "", "pan"),
    S(8, "SCENE", "buy_ticket", "Then more with borrowed money.", "", "push"),
    S(8, "NUMBER", "", "At eighty-four, he was betting on margin.", "MARGIN", "two lines"),
    S(8, "NUMBER", "", "By the spring,", "ONE OF THE LARGEST SHAREHOLDERS", "line lands"),
    S(8, "CHART", "", "Other traders noticed", "LIMIT UP · ¥705", "price line climbs"),
    S(8, "DOC", "", "In March 1982,", "", "register card"),
    S(8, "CHART", "", "In April, the shares reached", "¥1,230", "line reaches the peak"),
    S(8, "SCENE", "old_man_window_phone", "And unlike in 1935,", "", "slow push"),
    S(8, "NUMBER", "", "The gain was reported", "¥20,000,000,000", "counter"),
    S(8, "SCENE", "old_man_window_phone", "Made in a little over six months,", "", "pull"),
    # 9. The top of the list
    S(9, "CHART", "", "Every year, Japan published", "No. 1", "rank climbs"),
    S(9, "SCENE", "newsstand_1983", "The press loved him.", "", "pan"),
    S(9, "SCENE", "train_bag", "He changed nothing.", "", "slow push"),
    S(9, "SCENE", "old_bag", "The money was not the point.", "", "push in"),
    S(9, "NUMBER", "", "A director of a Japanese investors' association", "", "two lines"),
    S(9, "SCENE", "library_empty", "Think about that.", "", "very slow push"),
    # 10. The last trades
    S(10, "BLACK", "", "But a turtle does not stop.", "", "black"),
    S(10, "SCENE", "hospital_corridor", "In 1985, his son,", "1985", "slow push"),
    S(10, "SCENE", "old_desk", "Korekawa kept trading.", "", "drift"),
    S(10, "NUMBER", "", "According to his biographer, he took a large position", "HEAVY LOSSES", "line lands"),
    S(10, "SCENE", "tax_envelope", "And the tax office", "", "slow push"),
    S(10, "NUMBER", "", "In 1991, at ninety-three,", "−¥680,000,000", "counter"),
    S(10, "DOC", "", "The tax office seized", "", "register card"),
    S(10, "CARD", "", "In that book,", "", "quote types on"),
    # 11. The lesson
    S(11, "SCENE", "library_empty", "His great trade did not come from luck", "", "slow push"),
    S(11, "SCENE", "newspaper_breakfast", "Everyone could read that article.", "", "push to the circle"),
    S(11, "SCENE", "old_desk", "But the same patience", "", "very slow push"),
    # 12. Epilogue
    S(12, "SCENE", "osaka_flats_dusk", "Ginzō Korekawa died", "12 SEPTEMBER 1992", "slow push"),
    S(12, "SCENE", "school_gate", "His foundation still pays", "", "drift"),
    S(12, "SCENE", "hishikari_dawn", "And the hill he went to see", "", "slow push"),
    S(12, "SCENE", "hishikari_dawn", "Hishikari became", "", "long pull back, fade"),
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
            scene = f"{scene}. {SETTING.get(image_id, JAPAN)}"
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

    md = ["# Ginzō Korekawa: shot list", "",
          "Generated by `build_shotlist.py` from `SCRIPT.md`. Do not edit by hand.", "",
          f"- {len(rows)} shots, about {fmt(t)} at {round(WORDS_PER_SECOND * 60)} words a minute "
          f"with a {PAUSE_PER_SENTENCE}s breath per sentence.",
          f"- {len(IMAGES)} images to generate (`images.csv`), used in "
          f"{families.get('SCENE', 0)} SCENE shots.",
          "- Built in motion graphics: " + ", ".join(f"{k} {v}" for k, v in sorted(families.items()) if k != "SCENE") + ".",
          "- Times are estimates from word counts. The recorded voice sets the real timing.", ""]
    names = {1: "Cold open", 2: "The legend", 3: "The boy who left", 4: "The library", 5: "Seventy yen",
             6: "The empire", 7: "The comeback", 8: "The gold", 9: "The top of the list", 10: "The last trades",
             11: "The lesson", 12: "Epilogue"}
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
