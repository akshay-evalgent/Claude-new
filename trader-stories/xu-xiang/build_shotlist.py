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

STYLE = (
    "Graphic novel illustration with bold ink linework and flat muted colour "
    "washes. Palette of ink black, slate grey and warm off-white paper with "
    "touches of dull ochre. Low-key cinematic lighting, visible paper grain, "
    "wide 16:9 film composition. No text, no lettering, no readable signs, "
    "no logos, no watermark."
)

# Generic descriptions, never a likeness of the real person.
CHARACTERS = {
    "XU_YOUNG": "a slim Chinese teenage boy of about fifteen with short untidy "
                "black hair, wearing plain early-1990s school clothes",
    "XU_20S": "a slim young Chinese man in his early twenties with short untidy "
              "black hair and a plain dark 1990s jacket",
    "XU_ADULT": "a Chinese man in his late thirties with a round face, rimless "
                "glasses and receding untidy black hair, wearing a plain dark "
                "tracksuit",
    "XU_COAT": "a Chinese man in his late thirties with a round face, rimless "
               "glasses and receding untidy black hair, wearing a long white "
               "coat over a grey button-down shirt",
}

# --- illustrations to generate ------------------------------------------------
# (image_id, character or "", scene prompt)

IMAGES = [
    # cold open, bridge, epilogue
    ("bridge_aerial", "", "aerial view from high above a very long sea bridge crossing grey open water, the bridge a thin line running to the horizon, overcast sky, sea haze"),
    ("bridge_fog", "", "a very long sea bridge disappearing into thick fog at dusk, seen from road level, empty lanes, streetlights fading into the mist"),
    ("car_expressway", "", "a single dark saloon car on an empty six-lane expressway seen from behind, grey morning, flat coastal land, power lines"),
    ("car_interior_coat", "XU_COAT", "close view inside a car, a man's hands on the steering wheel and the sleeve of a long white coat, his face out of frame, grey light through the windscreen"),
    ("xu_coat_silhouette", "XU_COAT", "seen from behind, standing alone in a dark room before a wall of glowing market screens, his silhouette sharp against the light"),
    # the legend
    ("zexi_floor_front", "XU_ADULT", "a modern open-plan trading floor in a Shanghai office, rows of desks with several monitors each, traders working; at the very back of the room one man sits apart, small in the frame"),
    ("xu_tracksuit_desk", "XU_ADULT", "sitting at a desk with four monitors at the back of a trading floor, seen from the side, intent, his glasses lit by screen light"),
    ("two_phones", "", "two smartphones lying side by side on a dark meeting table, both screens glowing as blank panels, a cup of tea beside them, shallow depth of field"),
    ("meeting_table", "XU_ADULT", "a meeting room, several men in suits talking and gesturing across a table; at the far end he looks down at two phones, ignoring them"),
    ("traders_whisper", "", "a group of Chinese stockbrokers in suits huddled by an office window at night, whispering, glancing across the room"),
    ("regulator_building_night", "", "a large stern government office building in Beijing at night, grey stone facade, rows of lit windows, a wide empty plaza"),
    # origin
    ("shanghai_1990_exchange", "", "Shanghai in 1990, a long crowd of people in winter coats queuing on a pavement outside a modest old building to buy their first shares, bicycles, period street"),
    ("ningbo_home_1990", "XU_YOUNG", "a small 1990s Chinese apartment, a father in a factory work jacket and a mother at the kitchen counter, the boy at the table, warm lamp light, modest furniture"),
    ("boy_newspaper", "XU_YOUNG", "at a school desk at night studying a newspaper folded open to dense tables of share prices, pencil in hand, desk lamp"),
    ("boy_books", "XU_YOUNG", "surrounded by stacks of second-hand books, reading by lamplight in a cramped bedroom"),
    ("lecture_backrow", "XU_YOUNG", "a lecture hall seen from the back row, adults listening to a speaker at a blackboard, the boy sitting alone at the back taking notes"),
    ("exam_hall_empty_desk", "", "a large exam hall filled with rows of students bent over papers, one desk in the middle row empty with its chair pushed in, morning light"),
    ("hands_cash", "", "close view of an older person's hands passing a thick bundle of banknotes tied with string to a young person's hands across a kitchen table, banknotes with no readable markings"),
    ("galaxy_street_exterior", "XU_20S", "a grey eight-storey 1990s office building beside a small pharmacy on a busy Ningbo street, the young man walking towards the entrance, bicycles, overcast"),
    # the hall
    ("hall_staircase", "", "a wide worn concrete staircase leading up to a second floor, cigarette butts and sunflower seed shells on the steps, people climbing, 1990s"),
    ("hall_blackboard_crowd", "", "a crowded 1990s stock trading hall, dozens of people in jackets standing facing a huge blackboard covered in chalk columns of prices, a clerk on a ladder with chalk, cigarette smoke"),
    ("hall_thinning", "", "a 1990s stock trading hall almost empty, a few people slumped on benches, torn order slips scattered on the floor, a half-wiped blackboard"),
    ("chives_board", "", "a bunch of muted green chives on a wooden chopping board, a cleaver beside them, some chives cut, dramatic side light, dark background"),
    ("xu_20s_hall", "XU_20S", "standing perfectly still in a crowded 1990s trading hall, looking up at a chalk blackboard, the crowd around him blurred in motion"),
    ("gangsters_table", "", "two men in dark suits seated facing each other across a table in a smoky private room, faces hidden in shadow, a third figure standing between them, 1990s Shanghai"),
    ("xu_20s_window", "XU_20S", "standing at an apartment window at night looking out over the lights of a 1990s Chinese port city, seen from behind"),
    # the method
    ("squad_desk", "XU_20S", "five young men crowded around a single desk in a 1990s trading hall, he sits in the centre writing an order slip, the others leaning in, chalk board behind"),
    ("hall_crowd_turns", "", "a crowded 1990s trading hall where everyone has turned to look towards one desk at the side, heads turning, a moment of attention"),
    ("sports_cars", "", "a row of shiny new sports cars parked outside a shabby grey 1990s office building, one empty parking space, passers-by staring"),
    ("xu_20s_ticket", "XU_20S", "at a brokerage counter in the 1990s handing a paper order slip to a clerk through a window, close view"),
    ("seminar_books", "", "a crowded hotel conference room, an audience of hopeful investors listening to a speaker on a stage, stacks of books on a table at the side, early 2000s"),
    ("investigator_arrives", "", "a man in a dark suit carrying a briefcase climbing a worn concrete staircase towards a trading hall, seen from below, serious"),
    ("meeting_room_tea", "", "a plain meeting room with a long table and teacups set out, several men in jackets seated stiffly, a man in a suit at the head of the table, early 2000s"),
    ("hall_empty", "", "a 1990s stock trading hall completely empty, chairs stacked, a blank blackboard, dust in shafts of window light"),
    # Zexi
    ("shanghai_skyline_2005", "", "the Shanghai skyline in 2005 seen from across the river, towers under construction, cranes, hazy evening"),
    ("sunshine_office", "", "a modern glass office, bright sunlight falling through blinds across empty desks, long shadows"),
    ("zexi_office_morning", "XU_ADULT", "a sleek modern office early in the morning, he arrives alone at his desk at the back of an empty trading floor, a large wall clock"),
    ("zexi_office_night", "XU_ADULT", "a trading floor at two in the morning, every desk dark and empty, he is still working at the back, lit only by his monitors"),
    ("researchers_waiting", "", "young analysts in an office holding thick printed reports, waiting outside a glass-walled room, uncertain"),
    ("xu_alone_screens", "XU_ADULT", "alone in a dark room surrounded by monitors showing charts, seen over his shoulder, his reflection faint in the screens"),
    ("xu_screens_cold", "XU_ADULT", "seen from behind in a dark room, monitors casting a cold blue glow, the rest of the room black, unsettling"),
    ("boardroom_chair", "", "a corporate boardroom table, a hand pulling out an empty leather chair, other board members seated, overhead light"),
    ("empty_chair_power", "", "an empty high-backed chair at the head of a long dark table, a single teacup steaming in front of it, heavy curtains, a sense of power"),
    ("beijing_office_window", "XU_ADULT", "standing at a tall office window in Beijing at dusk, seen from behind, looking at a large stern government building across the street"),
    # the crash
    ("retail_crowd_phones", "", "a sea of ordinary people in a public square, all looking down at glowing smartphones, faces lit from below, anxious, 2015"),
    ("national_team", "", "a vast state trading room with long rows of identical desks and terminals, traders in white shirts, fluorescent light, rigid order"),
    ("ny_floor", "", "a New York stock exchange trading floor at the opening bell, traders in jackets looking up at screens in shock"),
    ("beijing_corridor", "", "a long government corridor at night, rows of closed wooden office doors, one door ajar with light spilling out, polished floor"),
    ("arrested_exec", "", "two plain-clothes officers escorting a man in a business suit across a marble office lobby, all faces turned away, onlookers watching"),
    ("passport_desk", "", "a dark red passport book with no readable markings lying closed on a desk under a lamp, a rubber stamp beside it"),
    # the bridge
    ("grandma_apartment_ext", "", "an old 1980s apartment block in a quiet working-class Chinese neighbourhood on a Sunday morning, laundry on balconies, bicycles, a small shop"),
    ("grandma_party_table", "", "a small family birthday party in a modest apartment, a round table of dishes and a tray of peach-shaped longevity buns, a very old woman at the head of the table smiling, relatives around her"),
    ("white_coat_chair", "", "a long white coat hanging on the back of a wooden chair at a family dinner table, warm light"),
    ("phone_lights_up", "", "a smartphone lying face down on a dinner table between dishes, light spilling from under its edges as it buzzes"),
    ("stairwell_rush", "XU_COAT", "a blurred figure hurrying down a narrow concrete stairwell, motion blur, seen from above"),
    ("car_ningbo_blocks", "", "a dark saloon car seen from above driving between grey apartment blocks with smog-stained walls and barred windows, overcast"),
    ("car_river_bridge", "", "a dark saloon car crossing a city river bridge, a wide river below, a grey industrial city"),
    ("car_bay", "", "a dark saloon car on a coastal expressway, a wide grey bay opening out on the left, flat light"),
    ("blue_lights", "", "close view of brake lights glowing on a wet road, blue police lights reflected in the rear window of a car, blurred figures approaching"),
    ("arrest_photo_redraw", "XU_COAT", "portrait, looking straight at the viewer, someone's hand pulling back his sleeve to reveal a handcuff, harsh camera flash, plain wall behind"),
    # the answer, reckoning, epilogue
    ("sealed_doors", "", "glass office doors sealed with crossed paper strips bearing official stamps, an empty dark office beyond"),
    ("zexi_floor_empty", "", "a modern trading floor abandoned, monitors off, chairs pushed back, papers left on desks, grey daylight"),
    ("courthouse_ext", "", "a large modern Chinese courthouse with wide steps and columns on a grey winter day, flag poles"),
    ("courtroom_back", "", "a courtroom seen from the back of the public gallery, a defendant standing alone in the dock seen from behind, the judges' bench far away"),
    ("crowd_one_face", "", "a large crowd of traders in a trading hall, all in shadow, one man in the middle lit by a single spotlight"),
    ("photo_frame_down", "", "a framed family photograph lying face down on a wooden sideboard, dust, a legal document beside it"),
    ("two_phones_dark", "", "two smartphones on a dark table, both screens black, a cold cup of tea"),
    ("prison_gate", "", "a high grey prison wall with a steel gate, a lone man in plain clothes walking out, small in the frame, early morning summer light, long shadow"),
]

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
    S(8, "SCENE", "arrest_photo_redraw", "That evening, a photograph", "", "slow push", "Illustration only; never trace or show the press photo"),
    S(8, "SCENE", "arrest_photo_redraw", "Someone's hand is pulling back", "", "push to the cuff"),
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
    S(9, "DIAGRAM", "", "The only thing that changed", "×1,000", "the 1990s diagram scales up to fill the frame"),
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
        rows.append(dict(shot_id=sid, section=sec, start=fmt(t), seconds=round(dur, 1),
                         family=shot["family"], image_id=shot["image_id"], cue=shot["cue"],
                         on_screen=shot["on_screen"], motion=shot["motion"], notes=shot["notes"]))
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
        for image_id, char, scene in IMAGES:
            subject = CHARACTERS[char] + ", " if char else ""
            w.writerow([image_id, char, uses[image_id], f"{subject}{scene}. {STYLE}"])

    families = {}
    for r in rows:
        families[r["family"]] = families.get(r["family"], 0) + 1

    md = ["# Xu Xiang: shot list", "",
          "Generated by `build_shotlist.py` from `SCRIPT.md`. Do not edit by hand.", "",
          f"- {len(rows)} shots, about {fmt(t)} at {round(WORDS_PER_SECOND * 60)} words a minute "
          f"with a {PAUSE_PER_SENTENCE}s breath per sentence.",
          f"- {len(IMAGES)} illustrations to generate (`images.csv`), used in "
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
                   "| Shot | Start | Sec | Type | Picture | Starts on | On screen | Notes |",
                   "|---|---|---|---|---|---|---|---|"]
        pic = f"`{r['image_id']}`, {r['motion']}" if r["image_id"] else r["motion"]
        cells = [r["shot_id"], r["start"], str(r["seconds"]), r["family"], pic,
                 r["cue"] or "(no narration)", r["on_screen"], r["notes"]]
        md.append("| " + " | ".join(c.replace("|", "/") for c in cells) + " |")
    (HERE / "SHOTLIST.md").write_text("\n".join(md) + "\n")
    print(f"{len(rows)} shots, {fmt(t)}, {len(IMAGES)} images, families {families}")


if __name__ == "__main__":
    build()
