"""Generate concept images for the asset board with FLUX.1-schnell on a free
Hugging Face Space. Concept art only: the production host comes from a trained
LoRA (see STYLE-AND-PIPELINE.md). Re-run a single item with:
  python3 scripts/gen_board_images.py host_a_front
"""
import json, os, shutil, sys, time
from gradio_client import Client
from PIL import Image

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "board", "gen")
INK = ("black and white seinen manga illustration, detailed pencil hatching and ink shading, "
       "realistic muscle anatomy, clean confident linework, solid near-black background")
GRAY = "everything else is grayscale"

HOST = {
    "a": "lean athletic young man about 20, short black messy hair falling over his forehead, calm focused eyes, bare chest, teal training shorts with a thin white side stripe, barefoot",
    "b": "lean athletic young man about 20, black undercut hair tied in a small top knot, sharp eyes, bare chest, teal cloth wrist wraps on both wrists, plain black training shorts, barefoot",
    "c": "lean athletic young man about 20, short cropped dark hair, friendly eyes, bare chest, teal sweatband on his forehead, plain grey training shorts, barefoot",
}
ACC = {"a": "only the shorts are teal colored", "b": "only the wrist wraps are teal colored", "c": "only the sweatband is teal colored"}
H = HOST["a"]; A = ACC["a"]
RIVAL = ("huge bulky bald bodybuilder man with stubble, loud cocky expression, grey tank top and grey sweatpants, "
         "comedic but friendly, drawn in flat grey tones")

ITEMS = {
    # host options
    "host_a_front": (f"full body character design, front view, standing relaxed, {HOST['a']}, {INK}, {ACC['a']}, {GRAY}", 768, 1152, 11),
    "host_b_front": (f"full body character design, front view, standing relaxed, {HOST['b']}, {INK}, {ACC['b']}, {GRAY}", 768, 1152, 11),
    "host_c_front": (f"full body character design, front view, standing relaxed, {HOST['c']}, {INK}, {ACC['c']}, {GRAY}", 768, 1152, 11),
    # character sheet for option A
    "host_a_turnaround": (f"character model sheet on a solid near-black background, the same young man drawn three times standing in a row, full body: left figure faces the viewer (front view), middle figure in side profile, right figure seen from behind (back view), {H}, {INK}, {A}, {GRAY}", 1536, 1024, 23),
    "host_a_expressions": (f"character expression sheet on a solid near-black background, six head and shoulders portraits of the same young man in a 3 by 2 grid: calm, smiling, surprised, determined, thinking with hand on chin, laughing, short black messy hair, {INK}, grayscale", 1536, 1024, 31),
    "pose_pushup": (f"exact side view of {H} in a high plank push-up position on the floor, arms straight, hands directly under shoulders, body in one straight line from head to heels, toes on the floor, {INK}, {A}, {GRAY}", 1344, 768, 141),
    "pose_plank": (f"exact side view of {H} holding a forearm plank on the floor, both forearms flat on the ground, elbows under shoulders, body in one straight line from head to heels, toes on the floor, {INK}, {A}, {GRAY}", 1344, 768, 142),
    "pose_squat": (f"side view of {H} at the bottom of a bodyweight squat, heels down, chest up, {INK}, {A}, {GRAY}", 896, 1152, 43),
    "pose_door_row": (f"{H} doing an inverted row holding the handles of an open door, leaning back, side view, {INK}, {A}, {GRAY}", 1152, 896, 44),
    "pose_flex_glow": (f"{H} flexing his biceps, front view waist up, the biceps muscles glow bright coral red like an anatomy highlight, {INK}, {A}, coral glow on biceps, {GRAY}", 896, 1152, 45),
    "pose_explain": (f"{H} pointing to the side and explaining something, friendly teacher pose, waist up, {INK}, {A}, {GRAY}", 896, 1152, 46),
    "pose_seeds": (f"{H} holding out a handful of pumpkin seeds toward the viewer, waist up, the seeds glow warm amber, {INK}, {A}, amber seeds, {GRAY}", 896, 1152, 47),
    # rival
    "rival_front": (f"full body character design, front view, arms crossed, {RIVAL}, black and white manga illustration, ink shading, solid near-black background, grayscale", 768, 1152, 51),
    "versus_tugofwar": (f"manga panel, {H} winning a tug of war with a rope against a huge bulky bald bodybuilder in grey tank top who is shocked, side view, dramatic, {INK}, {A}, {GRAY}", 1536, 896, 52),
    # science and nutrition asset types
    "sci_anatomy": ("educational manga ink anatomical illustration of the human muscular system, front view full body, the chest muscles glow bright coral red, all other muscles grayscale, solid near-black background, clean labels-free", 768, 1152, 61),
    "sci_fibre": ("scientific manga ink illustration of a skeletal muscle fiber cut open showing myofibrils and mitochondria, the mitochondria glow teal, everything else grayscale, solid near-black background", 1344, 768, 62),
    "sci_tendon": ("manga ink close-up of a human forearm and hand gripping, skin partly transparent showing tendons that glow coral red, everything else grayscale, solid near-black background", 1344, 768, 63),
    "sci_bone": ("manga ink illustration of a human thigh bone cut in half showing the inner spongy bone structure, outlines glow warm amber, grayscale, solid near-black background", 1344, 768, 64),
    "food_plate": ("manga ink still life seen from above: a plate with grilled chicken, rice, broccoli, a fried egg, beside a glass of milk, grayscale with thin warm amber outlines, solid near-black background", 1344, 768, 65),
    "food_minerals": ("manga ink still life of magnesium rich foods: pumpkin seeds, spinach leaves, almonds, black beans, a square of dark chocolate, arranged in a row, grayscale with warm amber glow, solid near-black background", 1344, 768, 66),
    # mood
    "mood_lab": ("cinematic dark scene, a lean young man in teal shorts standing in front of a giant floating manga ink anatomy diagram of a human muscle, faint teal glow, moody, black and white manga with teal accent, near-black background", 1536, 896, 71),
    "mood_skinny_fit": (f"manga ink before and after: on the left the same young man skinny and hunched, on the right lean and confident, short black messy hair, teal shorts on both, {INK}, only the shorts are teal, {GRAY}", 1536, 896, 72),
}

def run(names):
    os.makedirs(OUT, exist_ok=True)
    client = None
    log = {}
    for n in names:
        prompt, w, h, seed = ITEMS[n]
        dst = os.path.join(OUT, n + ".jpg")
        if os.path.exists(dst) and len(sys.argv) == 1:
            continue
        for attempt in range(3):
            try:
                client = client or Client("black-forest-labs/FLUX.1-schnell", verbose=False, token=os.environ.get("HF_TOKEN"))
                res, _ = client.predict(prompt=prompt, seed=seed, randomize_seed=False, width=w, height=h,
                                        num_inference_steps=4, api_name="/infer")
                Image.open(res).convert("RGB").save(dst, quality=88)
                print("ok", n, flush=True); log[n] = {"prompt": prompt, "seed": seed, "size": [w, h]}
                break
            except Exception as e:
                print("fail", n, attempt, str(e)[:200], flush=True); client = None; time.sleep(20)
    meta = os.path.join(OUT, "prompts.json")
    old = json.load(open(meta)) if os.path.exists(meta) else {}
    old.update(log); json.dump(old, open(meta, "w"), indent=1)

if __name__ == "__main__":
    run(sys.argv[1:] or list(ITEMS))
