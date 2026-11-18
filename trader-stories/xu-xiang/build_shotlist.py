"""Build the Xu Xiang shot list and image list from one source.

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
# Photographic drama look. Every prompt is built as:
#   "<framing>. <character>, <scene>. <STYLE>"
# Framing goes first because the model weighs the start of a prompt most.

STYLE = (
    "Photorealistic cinematic film still from a prestige crime drama series. "
    "Shot on an ARRI Alexa with anamorphic lenses, natural skin texture, motivated "
    "practical lighting, deep shadows, shallow depth of field, gentle film grain, "
    "restrained colour grade with true whites, plain unmarked surfaces."
)

# Wide shots drop the close-up cues (skin texture, shallow focus).
STYLE_WIDE = (STYLE.replace("natural skin texture, ", "")
              .replace("shallow depth of field", "deep focus, small figures in a big space"))

# Locked descriptions, repeated word for word in every shot of that era so the
# face and clothes stay as close as the model allows. Generic faces, never a
# likeness of the real person. This model tends to add anything a prompt
# names, even after "no", so descriptions say only what should be there.
_FACE = ("a round soft face with faint lines at the eyes, a slightly heavy build, short black hair "
         "receding at the temples and untidy on top, thin black-framed glasses, "
         "clean-shaven")
CHARACTERS = {
    "XU_YOUNG": "Xu, a slim Chinese teenage boy of about sixteen with a round face, "
                "short untidy black hair and bright bare eyes, wearing a faded blue "
                "early-1990s school tracksuit jacket",
    "XU_20S": "Xu, a slim Chinese man of about twenty with a round face, short "
              "untidy black hair and bright bare eyes, wearing a plain dark-grey 1990s "
              "zip jacket over a white shirt",
    "XU_ADULT": f"Xu, a Chinese man in his late thirties with {_FACE}, wearing a plain black "
                "zip-up tracksuit top",
    "XU_COAT": f"Xu, a Chinese man in his late thirties with {_FACE}, wearing a long bright "
               "white tailored overcoat over a grey button-down shirt",
}

# Wide shots: the full description pulls the model into a close-up, so a scene
# marks where Xu goes with {who} and gets this short version instead.
FAR = {
    "XU_YOUNG": "a Chinese teenage boy in a faded blue school jacket",
    "XU_20S": "a slim young Chinese man in a dark-grey jacket",
    "XU_ADULT": "a lone heavy-set man with black-framed glasses in a black tracksuit",
    "XU_COAT": "a lone man in a long bright white overcoat",
}

# Without this the model fills scenes with Western faces and rooms. Added to
# every scene except those listed in ABROAD.
CHINA = "Set in mainland China, every person in frame is Chinese"
ABROAD = {"ny_floor"}
# One car for every driving shot.
CAR = "a single modern black executive saloon car from the 2010s, the only vehicle on the road"

ERA_90S = ("early-1990s China, everyone in padded cotton jackets, cardigans and flat caps, "
           "wooden fittings, chalk and paper, everything analogue")

# --- images to generate ------------------------------------------------------
# (image_id, character or "", framing, scene)

IMAGES = [
    # cold open, bridge, epilogue
    ("bridge_aerial", "", "Extreme wide aerial shot from high above",
     "a very long low cable-stayed sea bridge on hundreds of concrete piers crossing grey open water, running to the horizon, overcast sky, sea haze"),
    ("bridge_fog", "", "Wide shot at road level",
     "a very long low sea bridge disappearing into thick fog at dusk, empty lanes, streetlights fading into the mist"),
    ("car_expressway", "", "Wide shot from behind and above",
     CAR + ", alone on an empty six-lane coastal expressway, grey Sunday morning, flat land, power lines"),
    ("car_interior_coat", "XU_COAT", "Close-up through the windscreen, from the passenger side",
     "gripping the steering wheel, jaw tight, eyes fixed on the road ahead, the white coat bright against the dark car interior, rain on the glass, grey morning light"),
    ("xu_coat_silhouette", "XU_COAT", "Extreme wide shot from behind",
     "a dark room with a whole wall of glowing market screens, and in front of it {who} stands alone, the bright white coat catching the light, a small figure against the screens"),
    # the legend
    ("zexi_floor_front", "XU_ADULT", "Extreme wide shot down the length of a long room, eye level, deep focus",
     "seen over the heads of rows of traders at multi-monitor desks filling the foreground, a long open-plan Shanghai trading floor, and far away against the back wall {who} sits alone at a desk facing the room, tiny in the frame"),
    ("xu_tracksuit_desk", "XU_ADULT", "Medium shot in profile",
     "sitting at a desk with four monitors at the back of a trading floor, intent, screen light reflected in his glasses, colleagues out of focus behind him"),
    ("two_phones", "", "Macro close-up, low angle on a table top",
     "two smartphones side by side on a dark meeting table, both screens glowing as plain bright blank panels, a cup of green tea beside them"),
    ("meeting_table", "XU_ADULT", "Medium-wide shot from the end of a conference table",
     "several men in suits talk and gesture across the table while Xu, at the far end, looks down at two phones and ignores them"),
    ("traders_whisper", "", "Medium shot through a glass partition",
     "a group of Chinese stockbrokers in suits huddled by an office window at night, whispering and glancing across the room"),
    ("regulator_building_night", "", "Wide shot, low angle",
     "a large stern grey government office building in Beijing at night, rows of lit windows, a blank stone facade, a wide empty plaza"),
    # origin
    ("shanghai_1990_exchange", "", "Wide shot along a pavement",
     "a long queue of ordinary people in winter coats outside a modest old building waiting to buy their first shares, bicycles, Shanghai street, " + ERA_90S),
    ("ningbo_home_1990", "XU_YOUNG", "Medium-wide shot from a doorway",
     "a small apartment, his father in a blue factory work jacket and his mother at the kitchen counter, Xu at the table, warm lamp light, " + ERA_90S),
    ("boy_newspaper", "XU_YOUNG", "Close-up over his shoulder",
     "at a desk at night studying a newspaper folded open to dense tables of share prices, pencil in hand, desk lamp, " + ERA_90S),
    ("boy_books", "XU_YOUNG", "Medium shot",
     "sitting on a bed surrounded by stacks of worn second-hand books, reading by lamplight in a cramped bedroom, " + ERA_90S),
    ("lecture_backrow", "XU_YOUNG", "Wide shot from the side of a lecture hall",
     "rows of adults listening to a speaker at a blackboard, and alone in the last row {who} takes notes, " + ERA_90S),
    ("exam_hall_empty_desk", "", "Wide symmetrical shot",
     "a large exam hall with rows of students bent over papers, one desk in the middle row empty with its chair pushed in, morning light, " + ERA_90S),
    ("hands_cash", "", "Extreme close-up on a kitchen table",
     "an older person's work-worn hands passing a thick bundle of banknotes tied with string to a young person's hands, plain unmarked notes, " + ERA_90S),
    ("galaxy_street_exterior", "XU_20S", "Extreme wide shot from across the street",
     "a grey eight-storey office building beside a small pharmacy on a busy Ningbo street, bicycles, overcast, and {who} walking towards the entrance, small in the frame, " + ERA_90S),
    # the hall
    ("hall_staircase", "", "Low-angle shot looking up a staircase",
     "a wide worn concrete staircase to a second floor, cigarette butts and sunflower seed shells on the steps, people climbing, " + ERA_90S),
    ("hall_blackboard_crowd", "", "Wide shot from behind the crowd",
     "a packed stock trading hall, dozens of people in jackets facing a huge black chalkboard filled with handwritten white chalk numbers only, a clerk on a wooden ladder writing with chalk, cigarette smoke in window light, " + ERA_90S),
    ("hall_thinning", "", "Wide shot",
     "the same trading hall almost empty, a few people slumped on wooden benches, torn paper order slips on the floor, a half-wiped chalkboard, " + ERA_90S),
    ("chives_board", "", "Overhead close-up",
     "a bunch of green chives on a wooden chopping board, a cleaver beside them, some chives cut, hard side light, dark background"),
    ("xu_20s_hall", "XU_20S", "Medium close-up, slightly low angle",
     "standing perfectly still in a packed trading hall, looking up at a huge black chalkboard of handwritten white chalk numbers, the crowd around him blurred in motion, smoke in shafts of window light, " + ERA_90S),
    ("gangsters_table", "", "Medium-wide shot",
     "two men in dark suits facing each other across a table in a smoky private room, faces lost in shadow, a third man standing between them, 1990s Shanghai"),
    ("xu_20s_window", "XU_20S", "Medium shot from behind",
     "standing at an apartment window at night, looking out over the lights of a port city, his reflection faint in the glass, " + ERA_90S),
    # the method
    ("squad_desk", "XU_20S", "Medium shot, eye level",
     "five young men crowded around one desk in a smoky trading hall, Xu in the centre writing on a paper order slip while the others lean in, chalkboard of numbers behind, " + ERA_90S),
    ("hall_crowd_turns", "", "Wide shot",
     "a packed trading hall where everyone has turned to look towards one desk at the side, heads turning, a sudden hush, " + ERA_90S),
    ("sports_cars", "", "Wide shot at kerb level",
     "a row of shiny new sports cars parked outside a shabby grey office building, one empty parking space, passers-by staring, late 1990s China"),
    ("xu_20s_ticket", "XU_20S", "Close-up at a counter",
     "handing a paper order slip to a clerk through a brokerage counter window, only his hand and half his face in frame, " + ERA_90S),
    ("seminar_books", "", "Wide shot from the back of the room",
     "a crowded hotel conference room, an audience of hopeful investors facing a speaker on a stage, stacks of books on a table at the side, early-2000s China"),
    ("investigator_arrives", "", "Low-angle shot from the bottom of a staircase",
     "a serious man in a dark suit carrying a briefcase climbs a worn concrete staircase towards a trading hall, early-2000s China"),
    ("meeting_room_tea", "", "Medium-wide shot",
     "a plain meeting room with a long table and glass teacups, several men in jackets seated stiffly, a man in a suit at the head of the table, early-2000s China"),
    ("hall_empty", "", "Wide shot",
     "a trading hall completely empty, chairs stacked, a blank black chalkboard, dust in shafts of window light, " + ERA_90S),
    # Zexi
    ("shanghai_skyline_2005", "", "Wide shot across the river",
     "the Shanghai skyline in 2005, towers under construction, cranes, hazy evening light"),
    ("sunshine_office", "", "Wide shot",
     "an empty modern glass office, bright morning sunlight falling through blinds across desks, long shadows"),
    ("zexi_office_morning", "XU_ADULT", "Extreme wide shot down an empty trading floor, deep focus",
     "a sleek empty trading floor early in the morning, rows of empty desks receding into the distance, a large wall clock, cool daylight, and at the far end {who} arriving at his desk, tiny in the frame"),
    ("zexi_office_night", "XU_ADULT", "Extreme wide shot down a dark trading floor, deep focus",
     "rows of dark empty desks receding into the distance at two in the morning, and at the far end one desk still lit, where {who} sits working, tiny in the frame, lit only by his monitors"),
    ("researchers_waiting", "", "Medium shot",
     "young Chinese analysts in white shirts holding thick printed reports wait outside a glass-walled office, uncertain"),
    ("xu_alone_screens", "XU_ADULT", "Over-the-shoulder shot from behind him",
     "alone in a dark room facing a curved bank of monitors showing price charts, his face reflected faintly in the screens"),
    ("xu_screens_cold", "XU_ADULT", "Wide shot from behind",
     "a pitch-dark room, a bank of monitors casting a cold blue glow, and in front of them {who}, a small silhouette seen from behind"),
    ("boardroom_chair", "", "Close-up on a boardroom table",
     "a hand pulling out an empty leather chair at a corporate board table, Chinese board members in dark suits seated and out of focus, Chinese ink landscape paintings on the walls, overhead light"),
    ("empty_chair_power", "", "Wide symmetrical shot",
     "an empty high-backed chair at the head of a long dark table, a single cup of tea steaming in front of it, heavy curtains"),
    ("beijing_office_window", "XU_ADULT", "Medium-wide shot from behind",
     "a tall office window in Beijing at dusk looking out at a stern grey government building across the street, and {who} standing at it, seen from behind"),
    # the crash
    ("retail_crowd_phones", "", "Wide shot",
     "a crowd of ordinary Chinese people in a public square, all looking down at glowing smartphones, faces lit from below, anxious, 2015"),
    ("national_team", "", "Wide symmetrical shot",
     "a vast trading room with long rows of identical desks and terminals, traders in white shirts, fluorescent light, rigid order"),
    ("ny_floor", "", "Medium-wide shot",
     "traders in jackets on a New York trading floor at the opening bell, looking up in shock, the screens above them reduced to a soft blur of coloured light"),
    ("beijing_corridor", "", "Wide shot down a corridor",
     "a long government corridor at night, closed wooden office doors, one door ajar with light spilling out, polished floor"),
    ("arrested_exec", "", "Wide shot",
     "two plain-clothes officers escorting a man in a business suit across a marble office lobby, all faces turned away from camera, onlookers watching"),
    ("passport_desk", "", "Close-up on a desk",
     "a plain dark red passport book lying closed under a desk lamp, a rubber stamp beside it"),
    # the bridge
    ("grandma_apartment_ext", "", "Wide shot",
     "an old 1980s apartment block in a quiet working-class Chinese neighbourhood on a Sunday morning, laundry on balconies, bicycles, a small shop"),
    ("grandma_party_table", "", "Medium-wide shot",
     "a small family birthday party in a modest apartment, a round table of dishes and a plate of peach-shaped longevity buns, a very old woman smiling at the head of the table, relatives around her"),
    ("white_coat_chair", "", "Close-up",
     "a long bright white overcoat hanging on the back of a wooden chair at a family dinner table, warm light"),
    ("phone_lights_up", "", "Macro close-up",
     "a smartphone lying face down on a dinner table between dishes, light spilling from under its edges as it buzzes"),
    ("stairwell_rush", "XU_COAT", "High-angle shot down a stairwell, motion blur",
     "{who} hurrying down a narrow concrete stairwell, the white coat a blur"),
    ("car_ningbo_blocks", "", "Top-down aerial shot",
     CAR + ", driving between grey apartment blocks with smog-stained walls and barred windows, overcast"),
    ("car_river_bridge", "", "Wide aerial shot",
     CAR + ", crossing a city river bridge, a wide river below, a grey industrial city"),
    ("car_bay", "", "Wide tracking shot",
     CAR + ", on a coastal expressway, a wide grey bay opening out on the left, flat light"),
    ("blue_lights", "", "Close-up on the back of a car",
     "brake lights glowing on a wet road, blue police lights reflected in the rear window, blurred figures approaching"),
    ("arrest_phone", "", "Medium close-up",
     "an ordinary Chinese couple in their fifties on a sofa in a small apartment at night, staring at a smartphone held towards them, its back to camera, their faces lit by its glow, shocked"),
    ("cuff_closeup", "", "Extreme close-up, harsh camera flash",
     "a hand pulling back the sleeve of a bright white overcoat to reveal a pair of steel police handcuffs locked around the wrist, the chain visible, only the wrist and sleeve in frame, plain wall behind"),
    # the answer, reckoning, epilogue
    ("sealed_doors", "", "Medium shot",
     "glass office doors sealed with crossed paper strips bearing red official stamps, an empty dark office beyond"),
    ("zexi_floor_empty", "", "Wide shot",
     "a modern trading floor abandoned, monitors off, chairs pushed back, papers left on desks, grey daylight"),
    ("courthouse_ext", "", "Wide low-angle shot",
     "a large modern Chinese courthouse with wide steps and columns on a grey winter day, flag poles"),
    ("courtroom_back", "", "Wide shot from the back of the public gallery",
     "a Chinese courtroom with a raised judges' bench against a deep red wall, three judges in black robes far away, a defendant standing alone in a wooden dock seen only from behind"),
    ("crowd_one_face", "", "Wide shot",
     "a crowd of traders in a trading hall, all in shadow, one man in the middle lit by a single shaft of light, face turned away"),
    ("photo_frame_down", "", "Close-up",
     "a picture frame lying face down on a wooden sideboard so only its brown cardboard back and fold-out stand show, dust, a folded sheet of paper beside it"),
    ("two_phones_dark", "", "Macro close-up",
     "two smartphones on a dark table, both screens black, a cold cup of tea"),
    ("prison_gate", "", "Extreme wide shot",
     "a high grey prison wall with a steel gate, a lone man in plain clothes walking out, small in the frame, early summer morning light, long shadow"),
]

# Scenes that reconstruct a real moment with real people, even without Xu in
# frame. These, and every shot showing Xu, carry a DRAMATISED tag on screen.
RECONSTRUCTED = {"grandma_party_table", "arrested_exec", "investigator_arrives", "meeting_room_tea",
                 "courtroom_back", "prison_gate", "cuff_closeup", "arrest_phone", "sports_cars"}
TAG_WORDS = {"RUMOUR", "UNPROVEN", "ALLEGATION"}

# --- shots --------------------------------------------------------------------
# Families: SCENE (generated image + camera move), CHART, NUMBER, DOC, MAP,
# DIAGRAM, CARD, BLACK. Everything except SCENE is built in motion graphics.
# cue  = first words of the narration the shot starts on ("" = no narration).
# hold = seconds for shots with no narration of their own.

def S(section, family, image, cue, on_screen="", motion="", notes="", hold=0):
    return dict(section=section, family=family, image_id=image, cue=cue,
                on_screen=on_screen, motion=motion, notes=notes, hold=hold)

SHOTS = [
    # 1. Cold open
    S(1, "NUMBER", "", "Sunday.", "SUNDAY 1 NOV 2015 · 10:33", "clock types on over black"),
    S(1, "DOC", "", "In the city of Ningbo", "\"Sudden traffic control\" / Hangzhou Bay Bridge", "notice builds line by line", "Reported wording only, reset in house type; do not imitate the Weibo interface"),
    S(1, "SCENE", "bridge_aerial", "The entrances to the Hangzhou", "", "slow push in"),
    S(1, "SCENE", "bridge_aerial", "The bridge is thirty-five", "35.4 km", "pull back; distance counter runs along the bridge"),
    S(1, "SCENE", "car_expressway", "And on the road towards it", "", "slow push, slight parallax"),
    S(1, "SCENE", "car_interior_coat", "The man inside", "", "drift left across the sleeve"),
    S(1, "CHART", "", "He controls more money", "Shanghai Composite 2015", "red line falls", "Data: Shanghai Composite daily closes"),
    S(1, "CHART", "", "His best fund", "+357%", "one green line climbs through the red", "Reported figure (NYT); shape is illustrative, label it so"),
    S(1, "SCENE", "xu_coat_silhouette", "For twenty-two years", "", "very slow push"),
    S(1, "BLACK", "", "Not today.", "", "cut to black on the line"),
    S(1, "CARD", "", "", "THE MAN WHO ALWAYS KNEW FIRST", "title", hold=4),
    # 2. The legend
    S(2, "SCENE", "zexi_floor_front", "His name is Xu Xiang.", "徐翔 XU XIANG", "push towards the back of the room; scoreboard appears", "Scoreboard: 2015 / ¥28,000,000,000"),
    S(2, "NUMBER", "", "In China, they called him", "私募一哥 HEDGE FUND BROTHER No. 1", "type card"),
    S(2, "SCENE", "zexi_floor_front", "He gave almost no interviews.", "", "continue push, tighter crop"),
    S(2, "SCENE", "xu_tracksuit_desk", "He came to work in a tracksuit.", "", "slow lateral drift"),
    S(2, "SCENE", "two_phones", "In meetings he watched", "PRICES / NEWS", "rack focus between phones; labels on screens"),
    S(2, "SCENE", "meeting_table", "He let everyone else talk.", "", "slow push past the talkers"),
    S(2, "CARD", "", "A friend put it like this.", "\"Xu Xiang is always trading...\" — a longtime friend, to the New York Times Magazine", "quote types on"),
    S(2, "CHART", "", "His first fund went up", "Zexi No. 1 +3,270% · Shanghai index +11.6% (Mar 2010–Oct 2015)", "two bars grow; one leaves the frame", "Source: NYT"),
    S(2, "SCENE", "traders_whisper", "Nobody could explain it.", "", "slow push"),
    S(2, "SCENE", "regulator_building_night", "And in the summer of 2015", "", "slow tilt up"),
    # 3. Origin
    S(3, "NUMBER", "", "Go back to 1990.", "1990", "rewind effect; scoreboard spins back to 1990 / ¥0"),
    S(3, "SCENE", "shanghai_1990_exchange", "Shanghai opens a stock exchange.", "", "pan along the queue"),
    S(3, "MAP", "", "Xu Xiang is in his first year", "Shanghai → Ningbo", "map draws the coast, pin on Ningbo"),
    S(3, "SCENE", "ningbo_home_1990", "His father works in a factory.", "", "slow push"),
    S(3, "SCENE", "boy_newspaper", "He starts trading anyway", "", "push onto the price tables"),
    S(3, "SCENE", "boy_books", "There is no teacher.", "", "slow pull back"),
    S(3, "SCENE", "lecture_backrow", "He sits in on lectures.", "", "slow push"),
    S(3, "SCENE", "exam_hall_empty_desk", "Then comes the university entrance exam.", "", "wide, static"),
    S(3, "SCENE", "exam_hall_empty_desk", "He doesn't take it.", "", "push in on the empty desk"),
    S(3, "SCENE", "hands_cash", "Instead, he asks his parents", "¥30,000 ≈ $5,000", "counter ticks up"),
    S(3, "SCENE", "galaxy_street_exterior", "And he carries it", "South Liberation Road, Ningbo", "slow push towards the door"),
    S(3, "NUMBER", "", "Years later, he would say", "1993", "big type; scoreboard 1993 / ¥30,000", "Exact wording of the 'born in 1993' line still to check"),
    # 4. The hall
    S(4, "SCENE", "hall_staircase", "The hall belongs to Galaxy Securities.", "", "tilt up the staircase", "No broker logo anywhere"),
    S(4, "SCENE", "hall_blackboard_crowd", "The prices are written on blackboards", "", "wide, slow push"),
    S(4, "SCENE", "hall_blackboard_crowd", "The rules change so often", "", "tight crop on the chalk"),
    S(4, "CHART", "", "And he has picked a terrible moment.", "+167% (1992) · −75% (Apr 1993–Jul 1994)", "chalk-style line climbs then drops off the board", "Data: Shanghai Composite daily closes"),
    S(4, "SCENE", "hall_thinning", "Most of the people in that hall", "", "slow pull back"),
    S(4, "SCENE", "chives_board", "Chives.", "韭菜 CHIVES", "cleaver drop on 'cut them again'"),
    S(4, "SCENE", "xu_20s_hall", "Xu Xiang does not get cut.", "", "slow push, crowd parallax"),
    S(4, "NUMBER", "", "He builds a style", "BUY FAST. SELL FAST. ALWAYS GO BIG.", "three words land one at a time"),
    S(4, "SCENE", "gangsters_table", "By 1995 he is nineteen", "RUMOUR", "slow push; tag top left", "Legend: must keep the RUMOUR tag"),
    S(4, "SCENE", "gangsters_table", "A triad boss had to settle it.", "RUMOUR", "push to the standing figure"),
    S(4, "SCENE", "gangsters_table", "Nobody has ever proved that story.", "RUMOUR", "image fades to grey"),
    S(4, "SCENE", "xu_20s_window", "At nineteen, he was already", "", "slow push"),
    # 5. The method
    S(5, "DIAGRAM", "", "made his whole career possible", "", "price line rises into a ceiling and stops"),
    S(5, "DIAGRAM", "", "In December 1996", "+10% DAILY LIMIT", "ceiling labelled", "1996 date still to check"),
    S(5, "DIAGRAM", "", "The rule is there to calm", "", "hold on the ceiling"),
    S(5, "DIAGRAM", "", "A stock that hits the ceiling", "", "order book: tall buy stack, empty sell side"),
    S(5, "DIAGRAM", "", "The limit does not stop a rush.", "", "queue of small figures forms behind the stack"),
    S(5, "SCENE", "squad_desk", "Xu and a handful of traders", "", "slow push"),
    S(5, "DIAGRAM", "", "Pick a cheap stock", "1", "step 1 draws"),
    S(5, "DIAGRAM", "", "Hit it with one enormous buy order", "2", "giant order block slams in"),
    S(5, "DIAGRAM", "", "Other traders see the size", "3 · LIMIT UP", "figures pile in; line hits ceiling"),
    S(5, "DIAGRAM", "", "Next morning, the buyers", "4", "day 2, ceiling again"),
    S(5, "DIAGRAM", "", "A few days later, sell", "5", "squad blocks leave"),
    S(5, "DIAGRAM", "", "Then the price falls.", "", "line drops; the squad is already off frame"),
    S(5, "DOC", "", "The press gives them a name.", "涨停板敢死队 LIMIT-UP DEATH SQUAD", "headline stamps in", "Generic newspaper design, no real masthead"),
    S(5, "SCENE", "squad_desk", "Xu Xiang, in his early twenties", "", "push in on the centre figure"),
    S(5, "MAP", "", "Soon they barely need the trick.", "", "dots light up city by city, lines to Ningbo"),
    S(5, "SCENE", "hall_crowd_turns", "Their order has become the news.", "", "slow push"),
    S(5, "SCENE", "sports_cars", "The others buy sports cars", "", "pan along the cars to the empty space"),
    S(5, "SCENE", "xu_20s_ticket", "Xu doesn't.", "", "slow push"),
    S(5, "SCENE", "seminar_books", "There are books about them.", "", "slow pull back"),
    S(5, "DOC", "", "And in 2003, a newspaper", "China Securities Journal, 2003", "page slides in", "Name the paper; generic layout"),
    S(5, "SCENE", "investigator_arrives", "The regulator sends an investigator", "", "tilt up with him"),
    S(5, "SCENE", "meeting_room_tea", "He calls in the big local traders", "", "slow push"),
    S(5, "SCENE", "hall_empty", "The Death Squad vanishes.", "", "static wide"),
    S(5, "NUMBER", "", "For one week.", "7 DAYS", "calendar flips seven pages"),
    S(5, "SCENE", "hall_blackboard_crowd", "Then the investigator announces", "", "hard cut back to the full hall"),
    S(5, "SCENE", "hall_empty", "Remember that week.", "", "slow push"),
    S(5, "NUMBER", "", "By 2005, the boy", "", "scoreboard 2005 / hundreds of millions of yuan"),
    # 6. Zexi
    S(6, "SCENE", "shanghai_skyline_2005", "Ningbo is now too small.", "", "slow pan"),
    S(6, "SCENE", "sunshine_office", "That same year, a change in the law", "SUNSHINE FUNDS", "light sweeps across the desks"),
    S(6, "DOC", "", "In December 2009, he registers", "Zexi Investment · 7 Dec 2009 · ¥30,000,000", "registration card builds"),
    S(6, "CARD", "", "He calls it Zexi.", "泽 Mao ZEdong · 熙 KangXI", "two characters, labels slide in", "Characters and names only; no portraits"),
    S(6, "CARD", "", "Modest, he was not.", "", "hold, then cut"),
    S(6, "DOC", "", "In March 2010 he opens", "¥1,000,000,000 · fewer than 200 investors", "counter, then a list of names blacked out line by line"),
    S(6, "DOC", "", "Under the rules, that means", "", "redaction bars finish"),
    S(6, "SCENE", "zexi_office_morning", "He is at his desk", "8:45", "slow push; clock time overlaid"),
    S(6, "SCENE", "zexi_office_night", "He is often still there", "2:00", "same framing as the morning shot"),
    S(6, "SCENE", "researchers_waiting", "His own researchers", "", "slow push"),
    S(6, "SCENE", "xu_alone_screens", "Friends say he has no hobbies.", "", "very slow push"),
    S(6, "DIAGRAM", "", "The method has grown up with him.", "", "company icon, stake bar fills"),
    S(6, "SCENE", "boardroom_chair", "He gets allies onto the board.", "", "slow push"),
    S(6, "DIAGRAM", "", "The company pays out cash.", "", "coins loop back into more shares"),
    S(6, "DIAGRAM", "", "Between 2010 and 2014", "45 COMPANIES", "web of 45 nodes draws"),
    S(6, "DIAGRAM", "", "His own parents sit", "", "two nodes highlight inside the web"),
    S(6, "CHART", "", "And the results are absurd.", "+536% (2011–2014)", "bar grows", "Source: Caixin"),
    S(6, "NUMBER", "", "By 2015 he is the hundred", "#188 · $2.2 BILLION", "list scrolls to 188", "Source: Hurun 2015 via NYT"),
    S(6, "DOC", "", "So who were the two hundred?", "UNPROVEN", "the redacted list returns, tag top left", "Legend: keep the UNPROVEN tag"),
    S(6, "SCENE", "empty_chair_power", "A man who had worked in the industry", "", "slow push"),
    S(6, "MAP", "", "In November 2014, Xu opens", "< 0.5 miles", "two pins in central Beijing, distance line"),
    S(6, "SCENE", "beijing_office_window", "His colleagues later said", "", "slow push"),
    S(6, "SCENE", "beijing_office_window", "He was right.", "", "cut tighter"),
    # 7. The crash
    S(7, "DIAGRAM", "", "made his whole career impossible", "", "the section 5 ceiling, flipped; line falls into a floor at −10%"),
    S(7, "CHART", "", "Friday, the twelfth of June", "12 JUNE 2015", "index draws day by day over the edge", "Data: Shanghai Composite daily closes"),
    S(7, "CHART", "", "In three weeks, a third", "−⅓", "bracket over the fall"),
    S(7, "SCENE", "retail_crowd_phones", "Remember who is in this market.", "200,000,000", "slow pull back; counter"),
    S(7, "SCENE", "chives_board", "Chives, as far as you can see.", "", "callback, quick"),
    S(7, "NUMBER", "", "The government throws everything", "SELLING BANNED · LISTINGS HALTED · BUY", "three stamps hit the page"),
    S(7, "SCENE", "national_team", "They call it the national team", "¥3,000,000,000,000", "slow push; counter"),
    S(7, "CHART", "", "It does not hold.", "", "index resumes falling"),
    S(7, "CHART", "", "The twenty-seventh of July.", "27 JULY", "second cliff"),
    S(7, "CHART", "", "The twenty-fourth of August.", "24 AUGUST · −8.5%", "third cliff"),
    S(7, "SCENE", "ny_floor", "In New York, the Dow", "DOW −1,000", "slow push"),
    S(7, "NUMBER", "", "Five trillion dollars", "−$5,000,000,000,000", "scoreboard swaps to the market total"),
    S(7, "BLACK", "", "And Zexi?", "", "beat of black"),
    S(7, "CHART", "", "In the worst three weeks", "5 FUNDS · ALL ≥ +20%", "five green lines rise through the red", "Shapes illustrative; label so"),
    S(7, "CHART", "", "His best fund is up", "+357% · 1st of 1,649", "league table, one row climbs to the top"),
    S(7, "CHART", "", "His money seemed to step out", "", "exit markers before each cliff", "Illustrative only; NYT says 'seemed'"),
    S(7, "SCENE", "xu_alone_screens", "In a normal year,", "", "slow push"),
    S(7, "SCENE", "xu_screens_cold", "In a year when the state itself lost", "", "slow push"),
    S(7, "SCENE", "beijing_corridor", "Meanwhile, in Beijing,", "", "track down the corridor"),
    S(7, "SCENE", "arrested_exec", "Brokerage executives are being arrested.", "", "slow pan"),
    S(7, "SCENE", "beijing_corridor", "Who is next?", "", "push towards the open door"),
    S(7, "DOC", "", "In September, an anonymous post", "ALLEGATION", "post multiplies across phones", "Legend: keep the ALLEGATION tag; no real usernames"),
    S(7, "CARD", "", "Zexi denied it.", "Zexi denied the claim. No court ruled on it.", "type card"),
    S(7, "SCENE", "passport_desk", "But the regulator is now looking.", "TRAVEL BAN", "stamp lands"),
    S(7, "NUMBER", "", "Nine days later,", "+9 DAYS", "counter"),
    # 8. The bridge
    S(8, "SCENE", "grandma_apartment_ext", "", "", "music only; slow push", hold=6),
    S(8, "SCENE", "grandma_party_table", "", "", "music only; slow drift", hold=8),
    S(8, "SCENE", "white_coat_chair", "", "", "music only; slow push", hold=6),
    S(8, "SCENE", "grandma_party_table", "The party is small.", "", "slow drift"),
    S(8, "SCENE", "phone_lights_up", "Shortly before ten thirty", "10:28", "light pulses under the phone"),
    S(8, "SCENE", "stairwell_rush", "He leaves at once.", "", "fast tilt down"),
    S(8, "SCENE", "car_ningbo_blocks", "He drives north", "", "top-down track with the car"),
    S(8, "SCENE", "car_river_bridge", "Over the river", "", "track"),
    S(8, "SCENE", "car_bay", "Out along the bay.", "", "track"),
    S(8, "MAP", "", "The fast road to Shanghai", "G15 · Hangzhou Bay Bridge", "road reduces to one line, one bridge"),
    S(8, "DOC", "", "For twenty-two years, his whole edge", "10:33", "the cold-open notice returns"),
    S(8, "SCENE", "bridge_aerial", "A few minutes late.", "", "slow push"),
    S(8, "SCENE", "blue_lights", "They stop him there.", "", "blue light flicker"),
    S(8, "BLACK", "", "", "", "silence", hold=4),
    S(8, "SCENE", "arrest_phone", "That evening, a photograph", "", "slow push", "Never recreate or show the press photo; we show people reacting to it"),
    S(8, "SCENE", "cuff_closeup", "Someone's hand is pulling back", "", "push to the cuff", "No face"),
    S(8, "DOC", "", "The internet does what it does.", "", "comment bubbles stack over the image", "Paraphrased jokes; no real usernames"),
    S(8, "SCENE", "retail_crowd_phones", "Two hundred million people", "", "slow push"),
    # 9. The answer
    S(9, "SCENE", "sealed_doors", "Then, nothing.", "", "slow push"),
    S(9, "NUMBER", "", "There is a word for what", "失联 SHILIAN · LOST CONTACT", "type card"),
    S(9, "SCENE", "zexi_floor_empty", "The firm does not survive it.", "", "slow pull back"),
    S(9, "SCENE", "courthouse_ext", "Thirteen months later,", "QINGDAO · 5 DEC 2016", "slow tilt"),
    S(9, "SCENE", "courtroom_back", "And he pleads guilty.", "", "slow push"),
    S(9, "CARD", "", "Now we get the answer.", "HOW DID HE ALWAYS KNOW?", "type card"),
    S(9, "DIAGRAM", "", "From 2010 to 2015, the court found", "13 LISTED COMPANIES", "boardroom joins the start of the section 5 diagram", "Court finding"),
    S(9, "DIAGRAM", "", "The company would put out good news.", "1 · GOOD NEWS", "step"),
    S(9, "DIAGRAM", "", "Xu would buy heavily", "2 · HEAVY BUYING", "step"),
    S(9, "DIAGRAM", "", "Ordinary investors would see it", "3 · RETAIL RUSHES IN", "step"),
    S(9, "DIAGRAM", "", "Then Xu and the executives", "4 · SELL", "step"),
    S(9, "NUMBER", "", "He knew first because", "", "line sets in type"),
    S(9, "DIAGRAM", "", "Look at it again.", "1990s · 2010s", "the two diagrams side by side"),
    S(9, "NUMBER", "", "The only thing that changed", "SAME TRICK. BIGGER SIZE.", "two lines land"),
    S(9, "NUMBER", "", "On the twenty-third of January 2017", "5½ YEARS", "date card, then the sentence"),
    S(9, "NUMBER", "", "And a fine reported at", "¥11,000,000,000 ≈ $1.6 BILLION", "figures land one at a time; scoreboard updates", "Reported, not published by the court"),
    S(9, "SCENE", "courtroom_back", "He does not appeal.", "", "slow pull back"),
    # 10. The reckoning
    S(10, "BLACK", "", "So here is the question", "", "black, then fade up"),
    S(10, "SCENE", "hall_empty", "In 2003, an investigator", "2003", "slow push"),
    S(10, "SCENE", "sealed_doors", "In 2017, a court looked", "2017", "slow push"),
    S(10, "SCENE", "crowd_one_face", "Was he a criminal", "", "very slow push"),
    S(10, "CARD", "", "One fund manager said", "— a fund manager, to the New York Times Magazine", "attribution line"),
    S(10, "SCENE", "courtroom_back", "The court's answer is simpler.", "", "static"),
    S(10, "CARD", "", "Both of those can be true.", "", "hold"),
    S(10, "SCENE", "photo_frame_down", "It cost him more than money.", "MARCH 2019", "slow push"),
    S(10, "SCENE", "xu_20s_window", "They had met in 1998", "1998", "callback"),
    S(10, "NUMBER", "", "Around twenty billion yuan", "¥20,000,000,000 FROZEN", "counter with a lock"),
    S(10, "DOC", "", "And the industry he had ruled", "Industry blacklist · June 2017", "card", "Source: Caixin"),
    # 11. The theme
    S(11, "SCENE", "two_phones_dark", "His gift was never picking stocks.", "", "slow push"),
    S(11, "SCENE", "xu_coat_silhouette", "It was knowing first.", "", "callback to the cold open"),
    S(11, "SCENE", "bridge_fog", "But a man who lives by knowing first", "", "slow push into the fog"),
    # 12. Epilogue
    S(12, "SCENE", "prison_gate", "On the ninth of July 2021,", "9 JULY 2021", "slow pull back; scoreboard: fine reported unpaid"),
    S(12, "NUMBER", "", "The fine, by the last reports", "FINE: REPORTED UNPAID", "type card"),
    S(12, "CARD", "", "A fund manager in Beijing", "\"In China, the losing side doesn't get to sleep at night.\"", "quote types on"),
    S(12, "SCENE", "bridge_aerial", "As for the bridge.", "", "car lights begin to move along the bridge"),
    S(12, "SCENE", "bridge_aerial", "The traffic moved on.", "", "long pull back, fade"),
    S(12, "CARD", "", "", "Sources: New York Times Magazine, Caixin, Bloomberg, SCMP, AP", "sources card", hold=8),
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
                         on_screen=shot["on_screen"], tag=tag, motion=shot["motion"], notes=shot["notes"]))
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
            if image_id not in ABROAD:
                scene = f"{scene}. {CHINA}"
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

    md = ["# Xu Xiang: shot list", "",
          "Generated by `build_shotlist.py` from `SCRIPT.md`. Do not edit by hand.", "",
          f"- {len(rows)} shots, about {fmt(t)} at {round(WORDS_PER_SECOND * 60)} words a minute "
          f"with a {PAUSE_PER_SENTENCE}s breath per sentence.",
          f"- {len(IMAGES)} images to generate (`images.csv`), used in "
          f"{families.get('SCENE', 0)} SCENE shots.",
          "- Built in motion graphics: " + ", ".join(f"{k} {v}" for k, v in sorted(families.items()) if k != "SCENE") + ".",
          "- Times are estimates from word counts. The recorded voice sets the real timing.", ""]
    names = {1: "Cold open", 2: "The legend", 3: "Origin", 4: "The hall", 5: "The method",
             6: "Zexi", 7: "The crash", 8: "The bridge", 9: "The answer", 10: "The reckoning",
             11: "The theme", 12: "Epilogue"}
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
