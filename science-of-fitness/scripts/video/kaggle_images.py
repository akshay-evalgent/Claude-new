"""Image jobs for Kaggle (WanGP + FLUX.2 Klein 4B, Apache-2.0): character sheets, board images and shot keyframes.

    python3 scripts/video/kaggle_images.py stage1 OUT.json   # character sheets + board images (2-3 options each)
    python3 scripts/video/kaggle_images.py stage2 OUT.json   # week-12 sheet + one keyframe per shot, from chosen sheets

Each job: name, prompt, resolution, seed and optional reference images (file names looked up in the Kaggle input
datasets). With references, Klein draws the new image from them, which keeps characters consistent.
Stage 2 reads the chosen sheets from episodes/ep01-skinny-to-bulky/flow/refs/ (rohan.png, tiger.png, crew.png,
and rohan12.png once made).
"""
import json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, "..", "..")
sys.path.insert(0, os.path.join(HERE, ".."))
import flow_shots as fs

MODEL = "flux2_klein_4b"
PLAIN = "Plain light-grey background, even lighting, the whole body visible, no text, no labels, no logos."
SHEET_STYLE = getattr(fs, "SHEET_STYLE", "2D anime, black-and-white seinen manga look, crisp black ink lines, grey "
                      "screentone shading and hatching; only teal, coral and amber elements are in color, everything else monochrome.")

# The board's host and rival, as on the asset board (scripts/gen_board_images.py, host option A).
INK = ("black and white seinen manga illustration, detailed pencil hatching and ink shading, realistic muscle anatomy, "
       "clean confident linework, solid near-black background")
HOST = ("lean athletic young man about 20, short black messy hair falling over his forehead, calm focused eyes, bare chest, "
        "teal training shorts with a thin white side stripe, barefoot")
SAME_HOST = "the same young man as in image 1 (same face, hair, build and teal shorts)"
TEAL = "only the shorts are teal colored, everything else is grayscale"
RIVAL = ("huge muscular bald bodybuilder man with stubble, massive shoulders and arms, loud cocky expression, grey tank top "
         "and grey sweatpants, comedic but friendly, drawn in flat grey tones")
HOST_REF = "host_a_front.jpg"  # board/gen/host_a_front.jpg, the approved host concept

# name: (prompt, width, height, uses host reference)
BOARD = {
    "host_a_turnaround": (f"character model sheet on a solid near-black background, {SAME_HOST} drawn three times standing in a row, "
                          f"full body: left figure faces the viewer (front view), middle figure in side profile, right figure seen "
                          f"from behind (back view), {HOST}, {INK}, {TEAL}", 1536, 1024, True),
    "host_a_expressions": (f"character expression sheet on a solid near-black background, six head and shoulders portraits of {SAME_HOST} "
                           f"in a 3 by 2 grid: calm, smiling, surprised, determined, thinking with hand on chin, laughing, {INK}, grayscale",
                           1536, 1024, True),
    "pose_pushup": (f"exact side view of {SAME_HOST} in a high plank push-up position on the floor: arms straight and vertical, hands "
                    f"directly under the shoulders, body in one straight line from head to heels, hips level with the shoulders, not "
                    f"raised, toes on the floor, {INK}, {TEAL}", 1344, 768, True),
    "pose_plank": (f"exact side view of {SAME_HOST} holding a forearm plank: both forearms flat on the floor, elbows directly under the "
                   f"shoulders, body in one straight line from head to heels, hips level, toes on the floor, {INK}, {TEAL}", 1344, 768, True),
    "pose_squat": (f"exact side view of {SAME_HOST} at the bottom of a bodyweight squat: thighs parallel to the floor, heels flat, knees "
                   f"over the toes, chest up, back straight, arms reaching forward for balance, {INK}, {TEAL}", 896, 1152, True),
    "pose_door_row": (f"side view of {SAME_HOST} doing an inverted row on an open door: both hands grip the two door handles, feet "
                      f"together on the floor either side of the door edge, body leaning back in a straight line, arms pulling his "
                      f"chest toward the door, {INK}, {TEAL}", 1152, 896, True),
    "pose_flex_glow": (f"{SAME_HOST} flexing both biceps, front view, waist up, the biceps muscles glow bright coral red like an anatomy "
                       f"highlight, {INK}, only the shorts are teal and the biceps glow coral, everything else grayscale", 896, 1152, True),
    "pose_explain": (f"{SAME_HOST} pointing to the side and explaining something, friendly teacher pose, waist up, {INK}, {TEAL}",
                     896, 1152, True),
    "pose_seeds": (f"{SAME_HOST} holding out a handful of pumpkin seeds toward the viewer, waist up, the seeds glow warm amber, {INK}, "
                   f"only the shorts are teal and the seeds amber, everything else grayscale", 896, 1152, True),
    "versus_tugofwar": (f"manga panel, side view: {SAME_HOST} on the left winning a tug of war, leaning back and pulling a thick rope, "
                        f"against a {RIVAL} on the right who stumbles forward, shocked, dramatic, {INK}, {TEAL}", 1536, 896, True),
    "mood_skinny_fit": (f"manga ink before and after split in two halves: on the left {SAME_HOST} but skinny and hunched, thin arms, "
                        f"narrow shoulders; on the right the same young man lean, upright and confident, {INK}, {TEAL}", 1536, 896, True),
    "mood_lab": (f"cinematic dark scene, {SAME_HOST} seen from behind, standing in front of a giant floating manga ink anatomy diagram "
                 f"of a human arm muscle, faint teal glow, moody, black and white manga with teal accent, near-black background",
                 1536, 896, True),
    "rival_front": (f"full body character design, front view, arms crossed, {RIVAL}, black and white manga illustration, ink shading, "
                    f"solid near-black background, grayscale", 768, 1152, False),
    "food_plate": ("manga ink still life seen from above: a plate with grilled chicken, rice, broccoli and a fried egg, beside a glass "
                   "of milk, grayscale with thin warm amber outlines, solid near-black background", 1344, 768, False),
    "food_minerals": ("manga ink still life of magnesium-rich foods in a row: pumpkin seeds, spinach leaves, almonds, black beans and a "
                      "square of dark chocolate, grayscale with a warm amber glow, solid near-black background", 1344, 768, False),
}

SHEETS = {  # stage 1 character sheets (same prompts as flow/CHARACTER-SHEET.md)
    "sheet_rohan": f"Character model sheet of one character drawn four times side by side at the same size: front view, three-quarter "
                   f"view, side profile and back view, full body, standing relaxed with arms at his sides. {fs.ROHAN}. {SHEET_STYLE} "
                   f"Only the shorts are teal. {PLAIN}",
    "sheet_tiger": f"Character model sheet of one character drawn four times side by side at the same size: front view, three-quarter "
                   f"view, side profile and back view, full body, arms crossed in the front view. {fs.TIGER}. {SHEET_STYLE} He is "
                   f"muscular, not fat: a bodybuilder's V-shaped torso and a narrow waist. He has no color at all. {PLAIN}",
    "sheet_crew": f"Character sheet of tiny chibi construction workers: three builders in teal hard hats, one carrying a glowing amber "
                  f"brick, one pushing a wheelbarrow of amber bricks, one waving; and two demolition workers in coral hard hats holding "
                  f"tiny hammers. {SHEET_STYLE} {PLAIN}",
}


def task(name, prompt, w, h, seed, refs=()):
    t = {"settings_version": 2.83, "model_type": MODEL, "image_mode": 1, "prompt": " ".join(prompt.split()),
         "resolution": f"{w}x{h}", "seed": seed, "batch_size": 1, "prompt_enhancer": "", "output_filename": name}
    if refs:
        t["video_prompt_type"] = "I"
        t["image_refs"] = list(refs)  # file names; the notebook swaps in their paths under /kaggle/input
    return t


def stage1():
    jobs = []
    for i, (n, p) in enumerate(SHEETS.items()):
        for k in range(3):
            jobs.append(task(f"{n}_{k + 1}", p, 1536, 1024, 300 + 10 * i + k))
    for i, (n, (p, w, h, ref)) in enumerate(BOARD.items()):
        for k in range(2):
            jobs.append(task(f"{n}_{k + 1}", p, w, h, 500 + 10 * i + k, [HOST_REF] if ref else []))
    return jobs, [os.path.join(ROOT, "board", "gen", HOST_REF)]


REFS = os.path.join(ROOT, "episodes", "ep01-skinny-to-bulky", "flow", "refs")
SHEET_FILE = {"Rohan sheet": "rohan.png", "Rohan week-12 sheet": "rohan12.png", "Tiger sheet": "tiger.png",
              "Muscle Crew sheet": "crew.png"}
ROLE = {"Rohan sheet": "Rohan is the skinny young man from image {n}",
        "Rohan week-12 sheet": "Rohan after twelve weeks is the fuller young man from image {n}",
        "Tiger sheet": "Tiger is the bald grey bodybuilder from image {n}",
        "Muscle Crew sheet": "the Muscle Crew are the tiny workers from image {n}"}


def stage2(week12_only=False):
    """Week-12 sheet from the chosen Rohan sheet, then one 1280x704 keyframe per shot."""
    jobs = [task(f"sheet_rohan12_{k + 1}",
                 f"Character model sheet of the same young man as in image 1, twelve weeks later, drawn four times side by side "
                 f"at the same size: front, three-quarter, side and back views, full body. {fs.ROHAN12}. Keep the same face, hair, "
                 f"t-shirt, teal shorts and sneakers as image 1. {SHEET_STYLE} {PLAIN}", 1536, 1024, 700 + k, ["rohan.png"])
            for k in range(3)]
    if week12_only:
        return jobs, [os.path.join(REFS, "rohan.png")]
    shots = json.load(open(os.path.join(ROOT, "episodes", "ep01-skinny-to-bulky", "flow", "shots.json")))
    for i, s in enumerate(shots):
        ings = [x for x in s["ingredients"] if x in SHEET_FILE]
        refs = [SHEET_FILE[x] for x in ings]
        roles = "; ".join(ROLE[x].format(n=j + 1) for j, x in enumerate(ings))
        action = s["prompt"].split(" Characters:")[0].split(" Style:")[0]
        style = s["prompt"][s["prompt"].index("Style:"):].replace(" No speech, music or sound effects.", "")
        lead = f"A single anime film frame, the opening frame of this shot, 16:9. {roles + '. ' if roles else ''}"
        jobs.append(task(s["id"], f"{lead}Shot: {action} {style}", 1280, 704, 900 + i, refs))
    return jobs, [os.path.join(REFS, f) for f in sorted(set(SHEET_FILE.values()))]


if __name__ == "__main__":
    which, out = sys.argv[1], sys.argv[2]
    jobs, refs = {"stage1": stage1, "stage2": stage2}[which]()
    json.dump({"jobs": jobs, "refs": refs}, open(out, "w"), indent=1, ensure_ascii=False)
    print(f"{len(jobs)} image jobs, refs: {[os.path.basename(r) for r in refs]} -> {out}")
