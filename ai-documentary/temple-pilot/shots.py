"""The Big Temple: how a thousand-year-old granite giant was built. A 3-minute AI-footage documentary pilot.

Each beat is one narration line plus its shots. A shot is (id, still prompt, motion prompt or None).
Shots with a motion prompt become Wan 2.2 clips; the rest are stills with a slow camera move.
    python3 ai-documentary/temple-pilot/shots.py      # writes shots.json and SCRIPT.md
"""
import json, os

HERE = os.path.dirname(os.path.abspath(__file__))
TITLE = "The Big Temple"
REAL = ("Ultra-realistic cinematic documentary film still, shot on a full-frame cinema camera with a 35mm lens, natural "
        "light, real textures and fine surface detail, subtle film grain, natural colour grade, no text, no watermark.")
ERA = "in 11th-century South India"
CROWD = "people seen only from a distance or from behind, no close-up faces"
MOTION_TAIL = "Photorealistic, natural real-world motion, smooth steady camera, no cuts."

BEATS = [
    ("A thousand years ago, on the flat plains of southern India, a king decided to build something the world had never seen.", [
        ("01A", "Aerial view at dawn over flat green plains of southern India with coconut palms and a winding river, thin mist, golden sunrise light.",
         "Slow aerial glide forward over the plains, mist drifting over the river, a few birds flying."),
        ("01B", "A tall ancient granite temple tower silhouetted against a huge orange sunrise, seen from far across flooded rice fields that mirror the sky.", None),
    ]),
    ("This is the Brihadeeswarar Temple in Thanjavur. Its tower rises about sixty-six metres, taller than any temple of its time. And it is made almost entirely of granite.", [
        ("02A", "The towering pyramidal granite tower of a South Indian Chola temple, the Brihadeeswarar Temple in Thanjavur, low angle from the stone courtyard, warm golden-hour light, blue sky.",
         "Very slow upward tilt along the tower, clouds drifting behind it."),
        ("02B", "Close-up of weathered honey-coloured granite blocks in an ancient temple wall with carved pilasters and niches, raking sunlight.", None),
        ("02C", "Wide shot of an ancient South Indian temple courtyard with a tall granite tower and long stone colonnades, pigeons on the paving, golden light.",
         "Pigeons take off and fly across the courtyard, slow sideways camera move."),
    ]),
    ("There is just one problem. There is no granite in Thanjavur. The nearest quarries were dozens of kilometres away.", [
        ("03A", "Flat fertile rice fields and coconut palms in a river delta, no hills or rocks anywhere in sight, hazy midday light.", None),
        ("03B", "A distant rocky hillside of bare grey granite boulders and cliffs under a hot pale sky, dry scrub in front.",
         "Heat haze shimmers over the rocks, dust blows gently, slow push-in."),
    ]),
    ("Around the year 1003, the Chola emperor Raja Raja the First set thousands of people to work. Stonecutters split the hard rock with iron wedges, driving them into rows of holes until the stone cracked along a line.", [
        ("04A", f"An ancient granite quarry {ERA}: dozens of workers in white dhotis cutting stone on a huge rock face, dust in the air, morning light, {CROWD}.",
         "Workers swing hammers and move about the rock face, dust drifting in the light, slow pan."),
        ("04B", "Close-up of a granite surface with a straight row of chiselled wedge holes holding iron wedges, stone dust, a wooden mallet lying beside them.", None),
        ("04C", f"A stonecutter in a white dhoti seen from behind, kneeling on top of a large granite block and striking short iron wedges set into a row of holes along the top surface of the block with a heavy wooden mallet {ERA}, chips flying, warm low sun.",
         "He swings the mallet down onto the wedges, stone chips and dust fly, camera holds steady."),
        ("04D", "A huge granite block split cleanly in two along a line of wedge holes, dust settling, ancient quarry, soft light.", None),
    ]),
    ("The blocks, some weighing many tonnes, were dragged on wooden sledges and rollers, pulled by teams of people and, very likely, elephants, toward the city.", [
        ("05A", f"A huge rectangular granite block on a heavy wooden sledge with flat runners resting on round log rollers, no wheels and no rails, pulled with thick ropes by a long line of workers on a dusty track {ERA}, {CROWD}.",
         "The line of workers leans into the ropes and pulls forward, the sledge slides slowly, dust rises."),
        ("05B", "Two Asian elephants pulling thick ropes tied to a large granite block along a riverbank lined with palm trees, golden dust in the light, wide shot.",
         "The elephants walk slowly forward, the ropes tighten, dust drifts up."),
        ("05C", "Wide shot of a long caravan of granite blocks on wooden sledges stretching along a dirt road beside a river toward a distant South Indian town of thatched roofs and palm trees, no modern buildings, evening light.", None),
    ]),
    ("At the site, the foundations went down first. Then the walls rose, course by course, each stone cut to lock into the next. Much of the temple stands without mortar, held by its own weight and careful joints.", [
        ("06A", f"High view of an ancient construction site {ERA}: the massive square granite base of a temple being built, workers placing stones, wooden scaffolding and ramps, dust, {CROWD}.",
         "Slow aerial orbit around the site, tiny workers moving, dust drifting."),
        ("06B", "Close-up of two granite blocks fitted perfectly with a tight interlocking joint and no mortar, fine chisel marks, side light.", None),
        ("06C", f"Workers seen from a distance levering a large granite block into place on a rising temple wall with long wooden poles {ERA}, dust drifting.",
         "The workers push on the poles and the block slides slowly into place."),
    ]),
    ("As the tower climbed higher, the builders faced their hardest question. How do you lift a giant stone sixty metres into the sky?", [
        ("07A", f"A half-finished pyramidal granite temple tower rising high above an ancient town, wrapped in wooden scaffolding, workers as tiny figures, dramatic clouds {ERA}.",
         "Slow push-in toward the top of the tower, clouds moving across the sky."),
        ("07B", "Looking straight up the side of a half-built granite temple tower against a bright sky, ropes and wooden scaffolding hanging down.", None),
    ]),
    ("Local tradition gives an answer: an earthen ramp, several kilometres long, sloping gently up to the top of the tower. Blocks were hauled up it, inch by inch, for months.", [
        ("08A", f"Wide aerial view of a long, gently sloping earthen ramp stretching across the countryside for kilometres up to the top of an unfinished granite temple tower, tiny figures hauling stones up it {ERA}.",
         "Slow aerial drift along the length of the ramp toward the tower."),
        ("08B", f"On a wide earthen ramp, a team of workers and an elephant haul a huge granite block uphill on log rollers, seen from behind, dust and sunlight {ERA}.",
         "The team pulls forward slowly, the block creeps uphill, dust hangs in the air."),
        ("08C", "Sunset over a long earthen ramp and an unfinished temple tower, long shadows, smoke rising from cooking fires in a workers' camp below.", None),
    ]),
    ("The crown of the tower, its capstone, is said to weigh around eighty tonnes. Whether it was one stone or several, raising it was an extraordinary feat.", [
        ("09A", f"A giant dome-shaped granite capstone being hauled up the last stretch of an earthen ramp to the summit of a tall temple tower, crowds watching far below, dramatic sky {ERA}.",
         "The capstone inches forward on its rollers, dust drifts, slow push-in."),
        ("09B", "The dome-shaped granite capstone crowning the top of an ancient South Indian temple tower against a clear blue sky, a golden finial on top.", None),
    ]),
    ("Meanwhile, sculptors carved gods, dancers and guardians into the stone. Painters covered the inner walls with murals. And inscriptions on the walls recorded the names of the people who served the temple.", [
        ("10A", "A sculptor in a white dhoti seen fully from behind, face not visible, carving the figure of a dancer into a granite wall with an iron chisel, stone chips falling, warm light from small clay oil lamps on the floor.",
         "The chisel taps, small chips fall, dust drifts in the lamp light."),
        ("10B", "Detailed ancient carved granite sculptures of Hindu deities and door guardians on a temple wall, weathered stone, side light.", None),
        ("10C", "A faded ancient mural on the inner wall of a temple showing dancers and royal figures, cracked plaster, dim warm light.", None),
        ("10D", "Close-up of rows of ancient Tamil inscriptions carved into a granite temple wall, raking light, weathered stone.", None),
    ]),
    ("In about 1010, roughly seven years after it began, the temple was complete. Lamps were lit, and the first rituals began.", [
        ("11A", "Hundreds of small oil lamps glowing along the dark stone corridors of an ancient temple, smoke curling upward.",
         "The flames flicker, smoke drifts upward, slow forward dolly along the corridor."),
        ("11B", "Two bare-chested temple priests in white dhotis seen from behind carrying a brass oil lamp toward the dark doorway of an ancient temple sanctum, incense smoke in the air.",
         "The priests walk slowly toward the doorway, smoke swirls, the flame flickers."),
        ("11C", "An ancient granite temple at night lit by fires and oil lamps, its tall tower glowing warm against a starry sky.", None),
    ]),
    ("A thousand years later, it still stands. It has survived earthquakes, wars and the centuries, and it is still a living temple, where prayers are said every day.", [
        ("12A", "The Brihadeeswarar temple tower in Thanjavur today at sunset, warm light on the granite, visitors small in the vast stone courtyard.",
         "Slow push-in toward the tower, visitors walking slowly across the courtyard."),
        ("12B", "Worn granite temple steps polished smooth by centuries of bare feet, scattered marigold petals.", None),
        ("12C", "Inside an ancient temple in the morning: brass lamps, marigold garlands and hanging bells, incense smoke and beams of light through a doorway.",
         "Smoke drifts through the light beams, a bell sways gently."),
    ]),
    ("It was built without machines, without steel cranes and without computers. Just stone, muscle, patience, and an extraordinary amount of human skill.", [
        ("13A", "An old iron chisel and a wooden mallet resting on a rough granite block, golden evening light, shallow depth of field.", None),
        ("13B", "An ancient granite temple tower silhouetted against a dramatic sunset sky with streaming clouds.",
         "Clouds stream quickly past behind the tower like a time-lapse, the tower stays still."),
    ]),
]


def build():
    shots, md = [], [f"# {TITLE} · 3-minute pilot", "",
                     "AI-generated reconstruction. Stills: Krea 2 Turbo. Motion: Wan 2.2 5B. Narration: Kokoro (AI voice).", ""]
    for b, (line, items) in enumerate(BEATS, 1):
        md += [f"## Beat {b}", "", f"> {line}", ""]
        for sid, still, motion in items:
            shots.append({"id": sid, "beat": b, "still": f"{still} {REAL}",
                          "motion": f"{motion} {MOTION_TAIL}" if motion else None})
            md.append(f"- **{sid}** {'(motion)' if motion else '(still)'} {still}" + (f" *Motion:* {motion}" if motion else ""))
        md.append("")
    json.dump({"title": TITLE, "lines": [l for l, _ in BEATS], "shots": shots}, open(os.path.join(HERE, "shots.json"), "w"), indent=1)
    open(os.path.join(HERE, "SCRIPT.md"), "w").write("\n".join(md))
    words = sum(len(l.split()) for l, _ in BEATS)
    print(f"{len(shots)} shots ({sum(1 for s in shots if s['motion'])} motion), {words} words (~{words / 145:.1f} min)")


if __name__ == "__main__":
    build()
