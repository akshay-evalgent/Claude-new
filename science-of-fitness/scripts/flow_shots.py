"""Build the Google Flow shot list for Episode 1 from the recorded voiceover timings.

    python3 scripts/flow_shots.py

Writes episodes/ep01-skinny-to-bulky/flow/SHOTS.md (copy-paste prompts) and shots.json
(the same shots with exact time windows, used later to assemble the clips onto the voiceover).
Every prompt repeats the same character descriptions and style lock word for word, because
identical wording plus reference images is what keeps characters consistent in Flow.
"""
import json, os

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
EP = os.path.join(ROOT, "episodes", "ep01-skinny-to-bulky")
T = json.load(open(os.path.join(EP, "audio", "timings.json")))

ROHAN = ("Rohan, a very skinny 18-year-old South Asian guy: narrow shoulders, flat chest, visible collarbones, thin arms and "
         "very thin wrists, bony elbows and knees, long thin neck, slight forward slouch; short messy black hair with a fringe "
         "over his forehead; big expressive dark eyes; light warm-grey skin tone; oversized plain white t-shirt hanging loose "
         "on his frame, teal shorts, white sneakers")
ROHAN12 = ("Rohan twelve weeks later: the same face, hair and outfit, but broader shoulders, a fuller chest and thicker arms, "
           "the white t-shirt now fits snugly, standing upright and confident; still lean and natural, not a bodybuilder")
TIGER = ("Tiger, a huge bald bodybuilder in his mid-20s: thick neck, short stubble beard, big cocky grin, massive shoulders "
         "and arms, grey tank top, grey joggers, grey sneakers, small towel over one shoulder; drawn only in flat grey tones")
CREW = ("the Muscle Crew: tiny chibi construction workers living inside the muscle; builders in teal hard hats carrying glowing "
        "amber protein bricks; a demolition team in coral hard hats with tiny hammers")
STYLE = ("Style: 2D anime, black-and-white seinen manga look, crisp black ink lines, grey screentone shading and hatching; only "
         "teal, coral and amber elements are in color, everything else monochrome; solid near-black background with minimal "
         "props; smooth animation; 16:9.")
TAIL = "No text, captions, numbers, logos or watermarks. No speech, music or sound effects."
SPEAK = "Mouth moving as if talking, but no audible speech."

# id, scene, start line (fraction allowed), tier, ingredients, action prompt, overlay I will add
SHOTS = [
    ("01A", 1, 0, 1, "", "Wide static shot: sixteen different young adults of varied builds stand in a neat row in the dark, each holding a tray with a burger, fries and a drink. A soft spotlight above each person. They look at their trays, then at each other.", "+1,000 calories a day"),
    ("01B", 1, 2, 2, "R", "{R} sits alone at a small table in the dark. A burger, fries and a drink slide in front of him from off-screen. He stares at the food, wide-eyed, then looks up at the camera. Slow push-in, medium shot.", ""),
    ("01C", 1, 3, 2, "", "The same sixteen people sit at one long table eating burgers in fast motion while overhead lights cycle from day to night again and again, showing weeks passing. Nobody exercises. Camera slowly tracks along the table.", "8 weeks"),
    ("02A", 2, 0, 1, "", "Slow pan along the row of sixteen young adults standing in the dark. Their bellies grow at very different rates: some swell round with amber-tinted fat, others barely change at all. Comedic contrast, people glance at each other's bellies.", "up to 10x more fat"),
    ("03A", 3, 0, 1, "R", "Close-up: {R} sits on a chair scrolling his phone while his knee bounces fast and his fingers tap without him noticing. Small teal sparks fly off the bouncing leg like energy being burned. Camera slowly orbits.", ""),
    ("03B", 3, 2, 2, "R", "{R} stands up and paces back and forth while talking on the phone, then walks around restlessly. Faint teal energy trails follow his moving legs. Medium-wide shot.", ""),
    ("03C", 3, 3, 1, "R", "{R} stands next to a burger floating in the air. The burger dissolves into glowing teal sparks that stream into his legs as he keeps fidgeting and moving; the sparks burn away into the dark. He looks down, surprised.", "692 calories a day"),
    ("04A", 4, 0, 2, "R", "{R} stands in front of a tall mirror on a dark stage. He pinches his thin upper arm, lifts his loose t-shirt sleeve, sighs and drops his shoulders. Over-the-shoulder shot into the mirror.", ""),
    ("04B", 4, 1, 2, "R", "{R} turns from the mirror to face the camera, holds up three fingers with a small determined smile, then nods. Slow push-in to a medium close-up.", ""),
    ("05A", 5, 0, 1, "R", "{R} proudly shows a huge plate piled high with food and pats his flat stomach, grinning. {S}", ""),
    ("06A", 6, 0, 2, "R", "Warm golden memory glow: {R} at a wedding buffet with fairy lights in the dark, happily eating his second plate of biryani, cheeks full. Soft vignette like a fond memory.", ""),
    ("06B", 6, 2, 2, "R", "{R} wakes up late, panics at his alarm clock, grabs his bag and runs out the door; an empty breakfast plate is left behind on the table. Quick comedic action.", ""),
    ("06C", 6, 2.55, 2, "R", "{R} at a desk eating only a small packet of chips for lunch. Then evening: he pushes a full plate away and shakes his head, not hungry.", ""),
    ("06D", 6, 3, 1, "R", "{R} walks along one very long table holding seven plates for seven days: one plate is huge and overflowing, the other six are nearly empty. He looks back at the huge plate, then at the empty ones. Camera tracks beside him.", ""),
    ("07A", 7, 0, 2, "R", "X-ray view through {R}'s body: a cartoon stomach glows coral as it fills with food, and sends a glowing teal message bubble racing up through his neck to his brain, which lights up. Stylized, clean.", ""),
    ("07B", 7, 3, 2, "R", "{R} lies on a sofa after a huge lunch, holding his stuffed stomach. The light changes to evening; a dinner plate arrives and he takes only two small bites, then pushes it away.", ""),
    ("08A", 8, 0, 3, "R", "{R} stands in the dark while a giant glowing phone-battery outline floats beside him. Inside his body, his heart and brain glow softly as the battery's bar drains toward them. Medium shot.", ""),
    ("08B", 8, 3, 2, "R", "Quick montage in one continuous shot: {R} walks to class with his backpack, stands in line, fidgets with his pen, paces while on the phone. Faint teal energy trails follow his movements.", ""),
    ("09A", 9, 0, 2, "R", "{R} eats an extra sandwich. Right after, his foot starts tapping on its own and he gets up and wanders around. He steps on a bathroom scale and frowns because the needle does not move.", ""),
    ("09B", 9, 2, 2, "R", "{R} adds one more snack, a glass of milk and a banana, to his day. He steps on the scale again; the needle ticks up a little and he smiles with relief.", ""),
    ("10A", 10, 0, 2, "R", "Camera zooms from {R}'s thin upper arm straight into the skin, revealing the muscle inside as a huge dark construction site of long fibres lit by work lights.", ""),
    ("11A", 11, 0, 1, "C", "Inside the muscle: {C}. The teal builders stack amber protein bricks onto a long muscle fibre while the coral demolition team chips bricks off at the same pace, so the fibre stays the same size. Wide shot.", ""),
    ("11B", 11, 3, 1, "C", "Inside the muscle: an alarm light flashes as a training signal; {C}. The teal builders cheer and speed up, a small truck delivers a load of glowing amber bricks, and the muscle fibre visibly grows thicker.", ""),
    ("12A", 12, 0, 1, "R", "Side view: {R} doing push-ups on the floor. On the last rep his arms shake, he lowers slowly, face straining, and just barely pushes up. A soft teal pulse flashes through his chest muscles at the top.", ""),
    ("12B", 12, 3, 2, "R", "{R} sits on the sofa eating huge amounts of snacks without training; comedic: his belly gets soft and round while his arms stay just as thin. He looks down at his belly, confused.", ""),
    ("13A", 13, 0, 1, "RT", "{T} looms over {R}, pokes his skinny chest with one finger and laughs. {R} shrinks back, embarrassed. {S}", ""),
    ("14A", 14, 0, 2, "R", "An old sepia-toned 1940s poster showing three body-type silhouettes hangs in the dark. {R} walks up, looks at it skeptically, then rips it in half. No readable words on the poster.", ""),
    ("14B", 14, 1, 1, "", "A huge dark hall with hundreds of young people in rows all doing the same dumbbell curl in sync. Their arms grow at different rates: a few barely change, a few grow a lot, most grow a medium amount. Slow aerial pan.", "585 people, -2% to +59%"),
    ("14C", 14, 4, 2, "R", "{R} sets a dumbbell down after a short workout and starts walking away, bored. The scene rewinds: he walks backwards, picks the dumbbell up again and keeps curling, determined.", ""),
    ("15A", 15, 0, 1, "RT", "{T} holds a giant bucket of fried chicken and a huge cola and shoves them toward {R}, grinning. {S}", ""),
    ("16A", 16, 0, 1, "C", "Inside the body: {C}. The builders can only lay amber bricks at a steady pace; extra bricks keep arriving, pile up off to the side and turn into soft amber blobs of fat drifting toward the waist.", ""),
    ("16B", 16, 2, 2, "R", "{R} steps onto a bathroom scale each week as calendar pages flip past behind him; the scale needle creeps up very slowly. He gives a calm thumbs up.", "0.25-0.5% a week"),
    ("17A", 17, 0, 2, "R", "Morning: {R} with messy bed hair, yawning, steps onto a bathroom scale before breakfast. The shot repeats across several mornings with slightly different light, as if days are passing.", ""),
    ("17B", 17, 3, 2, "R", "{R} drinks a tall glass of milk and eats a banana in two bites, grinning at the camera.", "+300 calories"),
    ("18A", 18, 0, 1, "C", "Inside the muscle: {C}. A small food truck backs up and the teal builders unload stacks of glowing amber protein bricks, carry them along the fibre and slot them in. Cheerful, busy.", ""),
    ("18B", 18, 1, 2, "R", "{R} steps on a bathroom scale, then turns to a kitchen counter and lines up eggs, a bowl of dal, a glass of milk and a piece of chicken; each food glows warm amber as he places it.", "1.6 g per kg a day · 60 kg → 96 g"),
    ("19A", 19, 0, 2, "R", "{R} in a small kitchen in the morning cooks three eggs in a pan and makes toast, then eats at the counter.", ""),
    ("19B", 19, 2, 2, "R", "{R} eats rice, dal and a bowl of curd at lunch; cut to evening, he eats chicken with rotis. Then he grabs a handful of roasted chana.", "about 96 g protein"),
    ("20A", 20, 0, 1, "R", "{R} makes a shake: pours milk into a blender, adds a banana, two spoons of peanut butter and oats, and blends it. Close-up of the blender spinning.", ""),
    ("20B", 20, 2, 1, "R", "{R} drinks the whole glass of shake easily in a few gulps, wipes his mouth and gives a big thumbs up, not looking full at all.", "about 640 calories · 23 g protein"),
    ("21A", 21, 0, 2, "R", "Close-up: {R} drizzles a spoon of golden ghee over his rice and dal, mixes it in and takes a bite, smiling.", "+120"),
    ("21B", 21, 2, 2, "R", "{R} walks past a jar of peanuts on his desk and grabs a small handful without stopping, munching as he walks.", "+170"),
    ("21C", 21, 3, 2, "R", "{R} finishes a workout, wipes his face with a towel and immediately eats a sandwich, glancing at a clock on the wall that shows the same time every day.", ""),
    ("22A", 22, 0, 1, "RT", "{R} does push-ups on a mat while {T} crouches beside him, coaching, holding up one, two, then three fingers to count the last reps.", ""),
    ("22B", 22, 3, 2, "R", "{R} marks a wall calendar with a teal marker on three days of the week; quick cuts show him working out, resting, working out, resting.", ""),
    ("23A", 23, 0, 2, "RT", "Split screen: on the left {T} does a heavy dumbbell bench press in a gym; on the right {R} does push-ups in his bedroom. A glowing coral outline of the chest muscle pulses identically on both of them.", ""),
    ("24A", 24, 0, 3, "R", "{R} pushes his bed aside and rolls out a mat in his small bedroom, ready to train. Wide shot.", ""),
    ("24B", 24, 1, 1, "R", "Exact side view: {R} does slow push-ups with perfect form on a mat: body in one straight line from head to heels, hands under the shoulders, elbows about 45 degrees from his body, chest lowers near the floor.", ""),
    ("24C", 24, 2, 1, "R", "Side view: {R} does inverted rows on an open door: holding both door handles, feet near the bottom of the door, body straight and leaning back, he pulls his chest toward the door edge and lowers slowly.", ""),
    ("24D", 24, 3, 1, "R", "Side view: {R} does a split squat: one foot forward, one back, torso upright, he lowers his back knee slowly toward the floor while the front knee stays over his toes, then stands back up.", ""),
    ("24E", 24, 4, 1, "R", "Side view: {R} does a pike push-up: hips high in an upside-down V, hands on the floor, he bends his elbows so his head moves down between his hands, then presses back up.", ""),
    ("24F", 24, 5, 1, "R", "Side view: {R} lies on his back on a mat and does a single-leg glute bridge: one foot planted, other leg straight up, he lifts his hips high, pauses at the top, and lowers slowly.", ""),
    ("24G", 24, 6, 2, "R", "{R} sits on a chair doing a towel curl: a towel looped under one foot, he pulls the ends up with both hands, elbows pinned to his sides, against his own leg's resistance.", ""),
    ("24H", 24, 7, 2, "R", "{R} does an easy push-up with his hands on a table, then cut to a hard push-up with his feet up on a chair. He grins after each.", ""),
    ("25A", 25, 0, 2, "R", "{R} finishes a set of push-ups easily, looks bored, then stuffs heavy books into a backpack and straps it on.", ""),
    ("25B", 25, 3, 1, "R", "{R} does push-ups wearing a backpack full of books; on the last rep a game-style level-up ring of teal light bursts around him and he pumps his fist.", ""),
    ("26A", 26, 0, 3, "R", "{R} sits on the floor between sets, breathing, sipping water and watching a timer on his phone, then gets back up for the next set.", ""),
    ("27A", 27, 0, 1, "RC", "3 AM: {R} in bed scrolling his phone, face lit blue-white by the screen. Inset x-ray of his arm: {C}, yawning and working slowly.", "-18% muscle building"),
    ("27B", 27, 2, 2, "RC", "{R} sleeps peacefully, moonlight through a window. Inside his arm, {C} work happily and fast, stacking amber bricks.", ""),
    ("28A", 28, 0, 2, "R", "{R} crosses off days on a wall calendar with a teal marker; between marks, quick cuts of him training, walking, resting.", "plan card"),
    ("28B", 28, 3, 2, "R", "{R} eats a full plate of food, then blends and drinks his shake.", ""),
    ("28C", 28, 4, 2, "R", "Morning: {R} steps on the bathroom scale, checks it, and nods calmly.", ""),
    ("29A", 29, 0, 2, "R", "{R} takes a mirror selfie on day one with his phone, standing in the dark in front of a tall mirror, looking unsure.", ""),
    ("29B", 29, 2, 1, "R2", "Time-lapse in front of the same mirror, same pose: {R} gradually fills out over twelve weeks, shoulders broadening, chest and arms growing, until he becomes {R2}. He lowers the phone and smiles.", "12 weeks"),
    ("30A", 30, 0, 1, "R", "{R} in front of the mirror pinches a little skin at his belly, worried. {S}", ""),
    ("30B", 30, 1, 2, "RT", "{T} pats {R} on the back reassuringly and points to the mirror, where {R} looks lean and slightly bigger; {R} relaxes and smiles.", ""),
    ("31A", 31, 0, 2, "RT", "{R} stands in a supplement shop, overwhelmed by tall shelves of colorful tubs. {T} walks in, pushes the shelves of tubs aside and hands him a single small plain tub.", ""),
    ("31B", 31, 2, 2, "R", "{R} reads the label of a small plain tub of creatine, shrugs, and puts it next to his eggs and milk on the kitchen counter.", "creatine: most researched"),
    ("31C", 31, 3, 3, "R", "{R} holds a tub of protein powder in one hand and a plate of eggs and chicken in the other, looks at both, and shrugs as if they are the same thing.", ""),
    ("32A", 32, 0, 2, "R", "{R} plays football with friends on a night pitch under floodlights, then sits down after the game with a big plate of food.", ""),
    ("33A", 33, 0, 1, "RT", "{R} and {T} face each other; {R} asks a question with open hands, {T} grins and they bump fists. {S}", ""),
    ("34A", 34, 0, 2, "R2", "{R2} faces the camera, smiles and points down toward the comments.", ""),
    ("34B", 34, 2, 1, "R", "Teaser: {R} sprints at full speed down a dark running track, then at about ten seconds suddenly slows, bends over and pants, exhausted. Freeze on his face.", "Next episode"),
]


def window(scene, line_f):
    sc = next(s for s in T["scenes"] if s["scene"] == scene)
    k0 = sum(s["lines"] for s in T["scenes"] if s["scene"] < scene)
    lines = T["lines"][k0:k0 + sc["lines"]]
    li = int(line_f); frac = line_f - li
    if li == 0 and frac == 0:
        return sc["start"]
    c = lines[min(li, len(lines) - 1)]
    return c["start"] + frac * (c["end"] - c["start"])


def build():
    rows = []
    for i, (sid, sc, lf, tier, ing, action, overlay) in enumerate(SHOTS):
        start = window(sc, lf)
        end = (window(SHOTS[i + 1][1], SHOTS[i + 1][2]) if i + 1 < len(SHOTS) else T["duration"])
        k0 = sum(s["lines"] for s in T["scenes"] if s["scene"] < sc)
        scn = next(s for s in T["scenes"] if s["scene"] == sc)
        vo = [c for c in T["lines"][k0:k0 + scn["lines"]] if c["end"] > start + 0.05 and c["start"] < end - 0.05]
        prompt = action.format(R="Rohan", R2="Rohan (twelve weeks later)", T="Tiger", C="the Muscle Crew", S=SPEAK)
        chars = []
        if "{R}" in action or "R" in ing.replace("R2", ""):
            chars.append(ROHAN)
        if "{R2}" in action:
            chars.append(ROHAN12)
        if "{T}" in action:
            chars.append(TIGER)
        if "{C}" in action:
            chars.append(CREW)
        if chars:
            prompt += " Characters: " + " | ".join(chars) + "."
        ingredients = {"R": "Rohan sheet", "T": "Tiger sheet", "C": "Muscle Crew sheet", "2": "Rohan week-12 sheet"}
        ings = []
        if "R2" in ing:
            ings += ["Rohan week-12 sheet"] + ([] if action.count("{R}") == 0 else ["Rohan sheet"])
        elif "R" in ing:
            ings.append("Rohan sheet")
        if "T" in ing: ings.append("Tiger sheet")
        if "C" in ing: ings.append("Muscle Crew sheet")
        rows.append({"id": sid, "scene": sc, "tier": tier, "start": round(start, 2), "end": round(end, 2),
                     "length": round(end - start, 1), "ingredients": ings, "overlay": overlay,
                     "voiceover": " ".join(("[" + {"skinny": "ROHAN", "rival": "TIGER"}.get(c["speaker"], "") + "] " if c["speaker"] != "narrator" else "") + c["text"] for c in vo),
                     "prompt": f"{prompt} {STYLE} {TAIL}"})
    os.makedirs(os.path.join(EP, "flow", "shots"), exist_ok=True)
    json.dump(rows, open(os.path.join(EP, "flow", "shots.json"), "w"), indent=1)
    fmt = lambda x: f"{int(x // 60)}:{int(x % 60):02d}"
    out = ["# Episode 1 · Google Flow shot list", "",
           f"{len(rows)} shots covering the whole {fmt(T['duration'])} voiceover. Each prompt is ready to paste. The time window is when the shot plays against the voiceover.", "",
           "Read `CHARACTER-SHEET.md` first and make the reference images. Then, for every shot:", "",
           "1. In Flow, choose **Video → Ingredients** and add the reference sheets listed for the shot. Flow takes up to three.",
           "2. Paste the prompt, 16:9, 8 seconds.",
           "3. Check the character matches the sheet and, for exercises, that the form matches the description. Re-roll if not.",
           "4. Download in 1080p and name the file by its shot ID, for example `03A.mp4`. Put it in `flow/shots/`.", "",
           "Shots with no ingredients are crowd or inside-body scenes. Use text-to-video for those.", "",
           "**Tiers:**",
           "- **Tier 1:** the minimum for an engaging episode. Start with these.",
           "- **Tier 2:** fills the story.",
           "- **Tier 3:** nice to have.", "",
           "Shots longer than 8 seconds can be extended in Flow, or I'll slow or hold them when assembling. Missing shots fall back to the anatomy kit and motion graphics.", "",
           "**Overlay** is the only text I'll add on top: a key number. Everything else is told by the characters.", ""]
    tiers = {1: 0, 2: 0, 3: 0}
    for r in rows: tiers[r["tier"]] += 1
    out += [f"| Tier | Shots |", "|---|---|"] + [f"| {k} | {v} |" for k, v in tiers.items()] + [""]
    cur = None
    for r in rows:
        if r["scene"] != cur:
            cur = r["scene"]; out += ["---", "", f"## Scene {cur}", ""]
        out += [f"### {r['id']} · {fmt(r['start'])}–{fmt(r['end'])} ({r['length']} s) · tier {r['tier']}", "",
                f"**Voiceover:** {r['voiceover']}", "",
                f"**Ingredients:** {', '.join(r['ingredients']) if r['ingredients'] else 'none (text-to-video)'}", ""]
        if r["overlay"]:
            out += [f"**Overlay:** {r['overlay']}", ""]
        out += ["```text", r["prompt"], "```", ""]
    open(os.path.join(EP, "flow", "SHOTS.md"), "w").write("\n".join(out))
    print(len(rows), "shots;", tiers, "; longest window", max(r["length"] for r in rows))


if __name__ == "__main__":
    build()


SHEET_STYLE = ("2D anime, black-and-white seinen manga look, crisp black ink lines, grey screentone shading and hatching; "
               "only teal, coral and amber elements are in color, everything else monochrome.")


def build_sheet():
    plain = "Plain light-grey background, even lighting, the whole body visible, no text, no labels, no logos."
    sheets = [
        ("A", "Rohan · model sheet", "Rohan sheet",
         f"Character model sheet of one character drawn four times side by side at the same size: front view, three-quarter view, side profile and back view, full body, standing relaxed with arms at his sides. {ROHAN}. {SHEET_STYLE} Only the shorts are teal. {plain}"),
        ("B", "Rohan · expressions", "(optional) Rohan expressions",
         f"Expression sheet of the same character as the reference image: six head-and-shoulders portraits in a 3 by 2 grid showing neutral, big grin, surprised, sleepy, determined and embarrassed. {ROHAN}. {SHEET_STYLE} {plain}"),
        ("C", "Rohan · twelve weeks later", "Rohan week-12 sheet",
         f"Character model sheet of the same character as the reference image, twelve weeks later, drawn four times side by side at the same size: front, three-quarter, side and back views, full body. {ROHAN12}. Keep the same face, hair, t-shirt, teal shorts and sneakers as the reference. {SHEET_STYLE} {plain}"),
        ("D", "Tiger · model sheet", "Tiger sheet",
         f"Character model sheet of one character drawn four times side by side at the same size: front view, three-quarter view, side profile and back view, full body, arms crossed in the front view. {TIGER}. {SHEET_STYLE} He has no color at all. {plain}"),
        ("E", "The Muscle Crew", "Muscle Crew sheet",
         f"Character sheet of tiny chibi construction workers: three builders in teal hard hats, one carrying a glowing amber brick, one pushing a wheelbarrow of amber bricks, one waving; and two demolition workers in coral hard hats holding tiny hammers. {SHEET_STYLE} {plain}"),
        ("F", "Rohan and Tiger together (scale check)", "(optional) scale reference",
         f"Rohan and Tiger standing side by side, front view, full body, to show their size difference: Tiger is a head taller and about three times as wide. {ROHAN}. {TIGER}. {SHEET_STYLE} {plain}"),
    ]
    L = ["# Episode 1 · Character sheet for Google Flow", "",
         "Three recurring characters carry the episode. Make their reference images once, then attach them to every shot as **Ingredients**. That, plus the identical descriptions inside every prompt in `SHOTS.md`, keeps them looking the same from shot to shot.", "",
         "## The characters", "",
         "| Character | Role | Look in one line |", "|---|---|---|",
         "| **Rohan** | The skinny 18-year-old the episode follows. He voices the viewer's questions. | Very thin, slouching, oversized white t-shirt, **teal shorts** |",
         "| **Rohan, week 12** | The same guy after the plan: the payoff | Same face and clothes, fuller chest and shoulders, upright |",
         "| **Tiger** | Big gym bro who believes the myths, then becomes Rohan's friend | Huge, bald, all grey |",
         "| **The Muscle Crew** | Tiny workers inside the muscle who explain the science | Teal hard hats build, coral hard hats tear down, amber bricks are protein |", "",
         "The narrator stays off-screen. Names are placeholders. Change them in `SCRIPT.md` and the prompts if you rename them.", "",
         "## Exact descriptions (do not reword)", "",
         "These sentences appear word for word in every shot prompt.", "",
         f"**Rohan:** {ROHAN}", "", f"**Rohan, week 12:** {ROHAN12}", "", f"**Tiger:** {TIGER}", "", f"**The Muscle Crew:** {CREW}", "",
         f"**Style:** {STYLE[len('Style: '):]}", "",
         "### What makes Rohan read as skinny", "",
         "- Shoulders no wider than his hips, and a flat chest. His collarbones and wrist bones show.",
         "- His t-shirt is a size too big and hangs off him. The sleeves flap around thin arms.",
         "- A slight slouch, and a long neck.",
         "- If a generation gives him abs or muscle definition, re-roll it. He should look like a beginner who has never trained.", "",
         "## Make the reference images in Flow", "",
         "Use Flow's image generation, or Gemini or Whisk. Generate each sheet, pick the best of the options, and download it. Order matters:", "",
         "1. Make **A** first. Generate four options and keep the one that most looks like a skinny, likeable 18-year-old.",
         "2. Make **B** and **C** with A attached as the reference image, so the face stays the same.",
         "3. Make **D** (Tiger) and **E** (the crew). **F** is optional, to check their sizes against each other.", "",
         "Flow's guidance is that references work best on a plain background. That's why the sheets use light grey, even though the shots use the dark stage.", ""]
    for key, title, ingr, prompt in sheets:
        L += [f"### {key}. {title}", "", f"Save as: **{ingr}**", "", "```text", prompt, "```", ""]
    L += ["## Using them in shots", "",
          "1. **Ingredients to Video:** choose Video, then Ingredients, and add up to three references listed in the shot, for example the Rohan sheet plus the Tiger sheet. Paste the shot prompt.",
          "2. **The transformation (shot 29B):** if Ingredients can't morph Rohan convincingly, use **Frames to Video**. First, generate two stills in the same mirror pose: one with sheet A attached, one with sheet C. Use them as the first and last frame.",
          "3. **Iterate cheaply:** use Veo 3.1 Fast to test a prompt. Switch to the Quality model for the take you keep.",
          "4. **Check:** the face and outfit match the sheet, Rohan still looks skinny (except week 12), Tiger stays grey, and exercise form matches the prompt. AI video often bends joints wrongly, so re-roll anything that would teach bad form.",
          "5. **Audio:** Flow adds sound. It's ignored. Only the voiceover is used.", "",
          "## Send the shots back", "",
          "Name each file by its shot ID (`01A.mp4`, `24B.mp4`, …) and put it in `episodes/ep01-skinny-to-bulky/flow/shots/`, or share them with me. I'll fit each clip to its window on the voiceover, add the few number overlays, and fill any missing shots from the anatomy kit. Even a partial set works. Start with the tier 1 shots.", ""]
    open(os.path.join(EP, "flow", "CHARACTER-SHEET.md"), "w").write("\n".join(L))
    print("character sheet written")


if __name__ == "__main__":
    build_sheet()
